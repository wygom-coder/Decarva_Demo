/* 
해마 마켓 B2B 위협 모델링 방어 패치 (최종 무결점 버전 V6)
이 SQL을 Supabase 대시보드 -> SQL Editor 에서 한 번에 실행하세요.
*/

-- ============================================================================
-- 1. [A-1] 가격 조작 방지 및 이력 로깅 (P0)
-- ============================================================================
-- 🚨 uuid_generate_v4() 대신 기본 활성화된 gen_random_uuid() 사용 (에러 방지)
CREATE TABLE IF NOT EXISTS public.haema_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 트리거 함수: 입찰 진행 중인 경매 매물 가격 변경 차단 (어드민 예외 추가)
CREATE OR REPLACE FUNCTION tg_protect_bid_price()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF COALESCE(OLD.auction, false) AND COALESCE(OLD.bid_count, 0) > 0 
       AND OLD.price_krw IS DISTINCT FROM NEW.price_krw 
       AND COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') != 'admin' THEN
        RAISE EXCEPTION '입찰이 진행 중인 경매 상품은 가격을 변경할 수 없습니다.';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_bid_price ON public.haema_products;
CREATE TRIGGER trg_protect_bid_price
    BEFORE UPDATE ON public.haema_products
    FOR EACH ROW EXECUTE FUNCTION tg_protect_bid_price();


-- ============================================================================
-- 2. [A-2] 견적서 위조 방지 - 안전한 견적 생성 RPC (P0)
-- ============================================================================
-- 🚨 클라이언트로부터 p_buyer_id 파라미터 수신을 제거하여 신분 위장(Spoofing) 원천 차단
CREATE OR REPLACE FUNCTION submit_secure_quote(p_items JSONB)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_buyer_id UUID := auth.uid(); -- 서버가 직접 행위자 신원 보증
    v_item JSONB;
    v_prod RECORD;
    v_vendor_quotes JSONB := '{}'::JSONB; 
    v_vendor_id UUID;
    v_secure_items JSONB;
    v_loop_key TEXT;
    v_loop_val JSONB;
    v_vendor_name TEXT;
BEGIN
    IF v_buyer_id IS NULL THEN 
        RETURN json_build_object('ok', false, 'error', '로그인이 필요합니다.'); 
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        -- 클라이언트의 가격 정보 무시, 서버(DB) 권위의 가격만 조회
        SELECT id, title, price_krw, seller_id INTO v_prod 
        FROM haema_products 
        WHERE id = (v_item->>'product_id')::BIGINT;
        
        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        v_vendor_id := v_prod.seller_id;

        IF NOT v_vendor_quotes ? v_vendor_id::TEXT THEN
            v_vendor_quotes := jsonb_set(v_vendor_quotes, ARRAY[v_vendor_id::TEXT], '[]'::JSONB);
        END IF;

        v_secure_items := v_vendor_quotes->(v_vendor_id::TEXT);
        -- 수량(qty) 한계값 설정, product_id는 원본 그대로 삽입(Javascript 정밀도 손실 방어)
        v_secure_items := v_secure_items || jsonb_build_object(
            'product_id', v_prod.id,
            'title', v_prod.title,
            'price', v_prod.price_krw,
            'qty', LEAST((v_item->>'qty')::INT, 9999)
        );
        
        v_vendor_quotes := jsonb_set(v_vendor_quotes, ARRAY[v_vendor_id::TEXT], v_secure_items);
    END LOOP;

    FOR v_loop_key, v_loop_val IN SELECT * FROM jsonb_each(v_vendor_quotes) LOOP
        -- 벤더의 닉네임을 동적으로 가져옴 (SECURITY DEFINER 이므로 auth.users 접근 가능)
        SELECT raw_user_meta_data->>'nickname' INTO v_vendor_name 
        FROM auth.users WHERE id = v_loop_key::UUID;
        
        v_vendor_name := COALESCE(v_vendor_name, '해마 파트너 스토어');

        -- 🚨 불필요한 RETURNING 제거하여 스키마 타입 에러(500) 방지
        INSERT INTO haema_quotes (buyer_id, vendor_name, items, status)
        VALUES (v_buyer_id, v_vendor_name, v_loop_val, 'pending');
    END LOOP;

    RETURN json_build_object('ok', true, 'message', '안전하게 견적서가 발주되었습니다.');
    
    -- 🚨 EXCEPTION WHEN OTHERS 제거하여 스키마 에러 등 치명적 버그가 숨겨지지 않고 로깅되도록 개선
END;
$$;

-- 보안 강화: 일반 유저가 RPC를 호출할 수 있도록 권한 부여
REVOKE EXECUTE ON FUNCTION submit_secure_quote(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION submit_secure_quote(JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION submit_secure_quote(JSONB) TO authenticated;


-- ============================================================================
-- 3. [A-6] 어드민 사칭 방어 트리거 (P2)
-- ============================================================================
CREATE OR REPLACE FUNCTION tg_block_admin_impersonation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    new_nick TEXT := NEW.raw_user_meta_data->>'nickname';
    old_nick TEXT := CASE WHEN TG_OP = 'UPDATE' 
                          THEN OLD.raw_user_meta_data->>'nickname' 
                          ELSE NULL END;
    v_clean TEXT;
BEGIN
    -- 🚨 v5 가드 복원: 닉네임이 안 바뀌는 로그인 메타데이터 업데이트(last_sign_in_at) 시에는 통과 (Lockout 방지)
    IF TG_OP = 'UPDATE' AND COALESCE(new_nick, '') = COALESCE(old_nick, '') THEN
        RETURN NEW;
    END IF;
    
    IF new_nick IS NULL OR new_nick = '' THEN
        RETURN NEW;
    END IF;
    
    v_clean := regexp_replace(lower(new_nick), '[^a-z0-9가-힣]', '', 'g');
    
    -- "관리자" 부분 매칭 대신, 해마+사칭 결합만 정확하게 타겟팅
    IF v_clean ~ '(해마(공식|운영|관리|어드민|admin)|^admin$|^administrator$|^system$|^staff$|^official$|해마공식|해마운영|해마관리)' THEN
        RAISE EXCEPTION '해당 닉네임은 관리자 사칭 우려가 있어 사용할 수 없습니다.';
    END IF;
    
    RETURN NEW;
END $$;


-- ============================================================================
-- 4. [NEW P0] 허위 거래 리뷰 방어 RLS 논리 교정
-- ============================================================================
DROP POLICY IF EXISTS "본인 작성 리뷰만 등록" ON public.haema_reviews;
DROP POLICY IF EXISTS "거래 완료자만 리뷰 작성" ON public.haema_reviews;

CREATE POLICY "거래 완료자만 리뷰 작성" ON public.haema_reviews FOR INSERT 
WITH CHECK (
  auth.uid() = reviewer_id 
  AND EXISTS (
    SELECT 1 FROM public.haema_products p
    WHERE p.id = haema_reviews.product_id
      -- 직거래/경매 공통으로 거래완료(is_closed=true) 상태이고
      AND p.is_closed = true
      -- 본인이 해당 거래의 최종 구매자(highest_bidder_id) 이거나 판매자(seller_id) 인지 검증
      AND (p.highest_bidder_id = auth.uid() OR p.seller_id = auth.uid())
      -- 자기 자신에게 리뷰를 쓰는 것은 방지
      AND auth.uid() != haema_reviews.reviewee_id
  )
);
