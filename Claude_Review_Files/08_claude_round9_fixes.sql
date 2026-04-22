/* 9라운드 긴급 패치: 트리거와 RPC 충돌 해소를 위한 Bypass 플래그 도입 */

-- 1. [M1] tg_protect_bid_fields 트리거 수정 (플래그 우회 통과)
CREATE OR REPLACE FUNCTION tg_protect_bid_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- ✅ 서버의 공식 RPC (place_bid, complete_transaction) 호출 시 세팅되는 플래그 감지
    IF current_setting('haema.bypass_bid_protect', true) = 'true' THEN
        RETURN NEW;
    END IF;

    -- 플래그가 없는 경우 (클라이언트 직접 업데이트 등) 
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


-- 2. [M1] place_bid RPC 수정 (Bypass 플래그 세팅)
CREATE OR REPLACE FUNCTION place_bid(p_product_id BIGINT, p_amount BIGINT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v RECORD;
BEGIN
  IF auth.uid() IS NULL THEN 
    RETURN json_build_object('ok', false, 'error', '로그인이 필요합니다.'); 
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN 
    RETURN json_build_object('ok', false, 'error', '입찰 금액이 유효하지 않습니다.'); 
  END IF;

  IF p_amount > 1000000000 THEN 
    RETURN json_build_object('ok', false, 'error', '입찰 금액이 허용 범위를 초과했습니다.'); 
  END IF;

  SELECT * INTO v FROM haema_products WHERE id = p_product_id FOR UPDATE;
  
  IF NOT FOUND THEN 
    RETURN json_build_object('ok', false, 'error', '매물을 찾을 수 없습니다.'); 
  END IF;

  IF NOT COALESCE(v.auction, false) THEN 
    RETURN json_build_object('ok', false, 'error', '경매 상품이 아닙니다.'); 
  END IF;

  IF v.seller_id = auth.uid() THEN 
    RETURN json_build_object('ok', false, 'error', '본인 매물에는 입찰할 수 없습니다.'); 
  END IF;
  
  IF v.is_closed OR v.auction_end IS NULL OR v.auction_end < NOW() THEN 
    RETURN json_build_object('ok', false, 'error', '이미 종료되었거나 마감일이 설정되지 않은 경매입니다.'); 
  END IF;
  
  IF COALESCE(v.current_bid, 0) >= p_amount THEN 
    RETURN json_build_object('ok', false, 'error', '현재 입찰가보다 큰 금액을 입력해야 합니다.'); 
  END IF;

  -- ✅ 트리거 우회 플래그 세팅 (트랜잭션 스코프)
  PERFORM set_config('haema.bypass_bid_protect', 'true', true);

  UPDATE haema_products
    SET current_bid = p_amount, 
        bid_count = COALESCE(bid_count, 0) + 1,
        highest_bidder_id = auth.uid()
  WHERE id = p_product_id;
  
  RETURN json_build_object('ok', true, 'new_bid', p_amount);
END $$;


-- 3. [M2, M5] complete_transaction RPC 수정 (Bypass 플래그 및 이중 알림 세팅)
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

    IF v_product.seller_id != auth.uid() THEN 
        RETURN json_build_object('ok', false, 'error', '본인 매물만 거래 완료 처리할 수 있습니다.'); 
    END IF;

    IF COALESCE(v_product.is_closed, false) THEN 
        RETURN json_build_object('ok', false, 'error', '이미 거래가 완료된 매물입니다.'); 
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.haema_chat_rooms 
        WHERE product_id = p_product_id 
          AND buyer_id = p_buyer_id 
          AND seller_id = auth.uid()
    ) THEN 
        RETURN json_build_object('ok', false, 'error', '해당 구매자와의 채팅방 내역을 찾을 수 없습니다.'); 
    END IF;

    IF COALESCE(v_product.auction, false) THEN
        UPDATE public.haema_products 
          SET is_closed = true 
          WHERE id = p_product_id;
    ELSE
        -- ✅ 트리거 우회 플래그 세팅 (직거래의 경우 highest_bidder_id 를 덮어쓰므로)
        PERFORM set_config('haema.bypass_bid_protect', 'true', true);

        UPDATE public.haema_products 
          SET is_closed = true, 
              highest_bidder_id = p_buyer_id
          WHERE id = p_product_id;
    END IF;

    -- ✅ [M5] 알림 대상 분리 (구매자 및 판매자 양방향 발송)
    INSERT INTO public.haema_notifications(user_id, kind, payload)
    VALUES 
    -- 구매자용 알림
    (p_buyer_id, 'transaction_completed_buyer', 
     jsonb_build_object('product_id', p_product_id, 'title', v_product.title)),
    -- 판매자용 알림 (본인)
    (auth.uid(), 'transaction_completed_seller', 
     jsonb_build_object('product_id', p_product_id, 'title', v_product.title, 'buyer_id', p_buyer_id));

    RETURN json_build_object('ok', true, 'message', '거래가 성공적으로 확정되었습니다.');
END $$;
