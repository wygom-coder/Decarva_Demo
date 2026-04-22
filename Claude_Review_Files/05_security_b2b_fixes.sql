-- ============================================================================
-- 🛡 해마 마켓 B2B 비즈니스 로직 방어 패치 (V4 → V5)
-- 이 SQL을 Supabase 대시보드 -> SQL Editor 에서 실행하세요.
-- ============================================================================

-- 1. [A-1] 가격 조작 방지 및 이력 로깅 (P0)
CREATE TABLE IF NOT EXISTS public.haema_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id BIGINT NOT NULL REFERENCES public.haema_products(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES auth.users(id),
    old_price BIGINT,
    new_price BIGINT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.haema_price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "누구나 가격 변동 내역 조회 가능" ON public.haema_price_history;
CREATE POLICY "누구나 가격 변동 내역 조회 가능" ON public.haema_price_history FOR SELECT USING (true);

-- 트리거 함수: 가격 변경 로깅
CREATE OR REPLACE FUNCTION tg_log_price_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF OLD.price_krw IS DISTINCT FROM NEW.price_krw THEN
        INSERT INTO public.haema_price_history(product_id, changed_by, old_price, new_price)
        VALUES (NEW.id, auth.uid(), OLD.price_krw, NEW.price_krw);
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_price_change ON public.haema_products;
CREATE TRIGGER trg_log_price_change
    BEFORE UPDATE ON public.haema_products
    FOR EACH ROW EXECUTE FUNCTION tg_log_price_change();

-- 트리거 함수: 입찰 진행 중인 경매 매물 가격 변경 차단
CREATE OR REPLACE FUNCTION tg_protect_bid_price()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF COALESCE(OLD.auction, false) AND COALESCE(OLD.bid_count, 0) > 0 
       AND OLD.price_krw IS DISTINCT FROM NEW.price_krw THEN
        RAISE EXCEPTION '입찰이 진행 중인 경매 상품은 가격을 변경할 수 없습니다.';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_bid_price ON public.haema_products;
CREATE TRIGGER trg_protect_bid_price
    BEFORE UPDATE ON public.haema_products
    FOR EACH ROW EXECUTE FUNCTION tg_protect_bid_price();


-- 2. [A-2] 견적서 위조 방지 - 안전한 견적 생성 RPC (P0)
-- 클라이언트는 p_buyer_id와 [{product_id, qty}] 배열만 보냅니다.
CREATE OR REPLACE FUNCTION submit_secure_quote(p_buyer_id UUID, p_items JSONB)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_item JSONB;
    v_prod RECORD;
    v_vendor_quotes JSONB := '{}'::JSONB; 
    v_vendor_id UUID;
    v_secure_items JSONB;
    v_quote_id UUID;
    v_loop_key TEXT;
    v_loop_val JSONB;
BEGIN
    -- 1. 입력된 품목들을 순회하며 DB의 실제 데이터로 벤더별 분류
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT id, title, price_krw, seller_id INTO v_prod 
        FROM haema_products 
        WHERE id = (v_item->>'product_id')::BIGINT;
        
        IF NOT FOUND THEN
            CONTINUE; -- 없는 상품은 무시
        END IF;

        v_vendor_id := v_prod.seller_id;

        -- 해당 벤더의 배열이 없으면 초기화
        IF NOT v_vendor_quotes ? v_vendor_id::TEXT THEN
            v_vendor_quotes := jsonb_set(v_vendor_quotes, ARRAY[v_vendor_id::TEXT], '[]'::JSONB);
        END IF;

        -- 안전한 데이터로 재구성 (가격, 이름 등은 서버 기준)
        v_secure_items := v_vendor_quotes->(v_vendor_id::TEXT);
        v_secure_items := v_secure_items || jsonb_build_object(
            'product_id', v_prod.id,
            'title', v_prod.title,
            'price', v_prod.price_krw,
            'qty', (v_item->>'qty')::INT
        );
        
        v_vendor_quotes := jsonb_set(v_vendor_quotes, ARRAY[v_vendor_id::TEXT], v_secure_items);
    END LOOP;

    -- 2. 벤더별로 견적서(haema_quotes) 생성
    FOR v_loop_key, v_loop_val IN SELECT * FROM jsonb_each(v_vendor_quotes) LOOP
        INSERT INTO haema_quotes (buyer_id, vendor_name, items, status)
        VALUES (p_buyer_id, '해마 파트너 스토어', v_loop_val, 'pending')
        RETURNING id INTO v_quote_id;
    END LOOP;

    RETURN json_build_object('ok', true, 'message', '안전하게 견적서가 생성되었습니다.');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('ok', false, 'error', SQLERRM);
END;
$$;


-- 3. [A-6] 어드민 사칭 방지 정규식 초강력 방어 (P2)
-- 알파벳, 한글, 숫자만 남기고 금지어 포함 여부(substring)를 검사하여 우회를 철저히 차단합니다.
CREATE OR REPLACE FUNCTION tg_block_admin_impersonation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_nickname TEXT := NEW.raw_user_meta_data->>'nickname';
    v_clean TEXT;
BEGIN
    IF v_nickname IS NOT NULL THEN
        -- 공백 및 특수문자 제거 후 소문자 변환
        v_clean := regexp_replace(lower(v_nickname), '[^a-z0-9가-힣]', '', 'g');
        
        -- 금지어 포함 여부 검사
        IF v_clean ~ '(해마|운영|관리자|어드민|admin|system|staff|official|공식)' THEN
            RAISE EXCEPTION '해당 닉네임은 관리자 사칭 우려가 있어 사용할 수 없습니다.';
        END IF;
    END IF;
    RETURN NEW;
END $$;


-- 4. [A-4] 기존 커뮤니티 데이터의 개인정보 마스킹 (P1)
-- 3글자 한글 이름의 경우 가운데 글자를 '*'로 마스킹 처리하여 PII 유출을 막습니다.
UPDATE public.haema_posts 
SET author_name = substring(author_name from 1 for 1) || '*' || substring(author_name from 3)
WHERE char_length(author_name) = 3 AND author_name ~ '^[가-힣]{3}$';

UPDATE public.haema_post_comments 
SET author_name = substring(author_name from 1 for 1) || '*' || substring(author_name from 3)
WHERE char_length(author_name) = 3 AND author_name ~ '^[가-힣]{3}$';
