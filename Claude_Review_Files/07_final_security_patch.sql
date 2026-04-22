/* 8라운드 알파 출항 전 최종 보안 완결 패치 (V7) */

-- 1. [L1] 안전한 거래 완료 RPC 신설 (클라이언트의 직접 UPDATE 차단)
CREATE OR REPLACE FUNCTION complete_transaction(
    p_product_id BIGINT, 
    p_buyer_id UUID
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
    v_product RECORD;
BEGIN
    IF auth.uid() IS NULL THEN 
        RETURN json_build_object('ok', false, 'error', '로그인이 필요합니다.'); 
    END IF;

    SELECT * INTO v_product FROM public.haema_products WHERE id = p_product_id FOR UPDATE;
    IF NOT FOUND THEN 
        RETURN json_build_object('ok', false, 'error', '매물을 찾을 수 없습니다.'); 
    END IF;

    -- 본인 매물만 거래 완료 처리 가능
    IF v_product.seller_id != auth.uid() THEN 
        RETURN json_build_object('ok', false, 'error', '본인 매물만 거래 완료 처리할 수 있습니다.'); 
    END IF;

    -- 이미 닫힌 매물이면 무시 (프론트에서 재시도할 수 있으므로 실패 처리)
    IF COALESCE(v_product.is_closed, false) THEN 
        RETURN json_build_object('ok', false, 'error', '이미 거래가 완료된 매물입니다.'); 
    END IF;

    -- p_buyer_id 가 실제 채팅방 참여자인지 검증 (아무 UUID나 지정 불가)
    IF NOT EXISTS (
        SELECT 1 FROM public.haema_chat_rooms 
        WHERE product_id = p_product_id 
          AND buyer_id = p_buyer_id 
          AND seller_id = auth.uid()
    ) THEN 
        RETURN json_build_object('ok', false, 'error', '해당 구매자와의 채팅방 내역을 찾을 수 없습니다.'); 
    END IF;

    -- 경매 매물이면 highest_bidder_id 는 건드리지 않음 (place_bid 가 관리)
    IF COALESCE(v_product.auction, false) THEN
        UPDATE public.haema_products 
          SET is_closed = true 
          WHERE id = p_product_id;
    ELSE
        -- 직거래: 거래완료 플래그 + 거래완료 바이어 기록
        UPDATE public.haema_products 
          SET is_closed = true, 
              highest_bidder_id = p_buyer_id
          WHERE id = p_product_id;
    END IF;

    -- 알림 생성 (구매자에게 거래 확정 알림)
    INSERT INTO public.haema_notifications(user_id, kind, payload)
    VALUES (p_buyer_id, 'transaction_completed', 
            jsonb_build_object('product_id', p_product_id, 'title', v_product.title));

    RETURN json_build_object('ok', true, 'message', '거래가 성공적으로 확정되었습니다.');
END $$;

REVOKE EXECUTE ON FUNCTION complete_transaction(BIGINT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION complete_transaction(BIGINT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION complete_transaction(BIGINT, UUID) TO authenticated;


-- 2. [L2] 클라이언트의 입찰/낙찰 필드 조작 원천 차단 트리거
CREATE OR REPLACE FUNCTION tg_protect_bid_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- 현재 세션이 인증된 사용자이면서, 어드민이 아닐 경우에만 보호 적용
    -- service_role이나 PostgreSQL 직접 쿼리는 우회 통과
    IF auth.uid() IS NOT NULL 
       AND COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') != 'admin' THEN
       
        IF OLD.current_bid IS DISTINCT FROM NEW.current_bid THEN
            RAISE EXCEPTION 'current_bid 필드는 place_bid RPC를 통해서만 변경할 수 있습니다.';
        END IF;
        
        IF OLD.bid_count IS DISTINCT FROM NEW.bid_count THEN
            RAISE EXCEPTION 'bid_count 필드는 place_bid RPC를 통해서만 변경할 수 있습니다.';
        END IF;
        
        IF OLD.highest_bidder_id IS DISTINCT FROM NEW.highest_bidder_id THEN
            RAISE EXCEPTION 'highest_bidder_id 필드는 시스템 로직에 의해서만 변경할 수 있습니다.';
        END IF;
    END IF;
    
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_bid_fields ON public.haema_products;
CREATE TRIGGER trg_protect_bid_fields
    BEFORE UPDATE ON public.haema_products
    FOR EACH ROW EXECUTE FUNCTION tg_protect_bid_fields();
