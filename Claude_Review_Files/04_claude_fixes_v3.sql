-- ============================================================================
-- 🛡 해마 마켓 보안 및 구조 고도화 마이그레이션 V5 (클로드 3차 G1~G6 최종 방어벽)
-- 이 SQL을 Supabase 대시보드 -> SQL Editor 에서 실행하세요.
-- ============================================================================

-- =========================================================
-- [G2] 댓글 카운트 트리거 시스템 구축 (프론트 조작 원천 차단)
-- =========================================================
-- 1) 트리거 함수: 댓글 INSERT/DELETE 시 자동으로 카운트 갱신
CREATE OR REPLACE FUNCTION tg_sync_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE haema_posts 
      SET comments_count = COALESCE(comments_count, 0) + 1 
      WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE haema_posts 
      SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) 
      WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;

-- 2) 트리거 부착
DROP TRIGGER IF EXISTS trg_sync_comments_count ON haema_post_comments;
CREATE TRIGGER trg_sync_comments_count
  AFTER INSERT OR DELETE ON haema_post_comments
  FOR EACH ROW EXECUTE FUNCTION tg_sync_comments_count();

-- 3) 기존 카운트 정합성 보정
UPDATE haema_posts p 
  SET comments_count = (
    SELECT COUNT(*) FROM haema_post_comments c WHERE c.post_id = p.id
  );

-- 4) 취약했던 기존 RPC 영구 삭제
DROP FUNCTION IF EXISTS update_post_comments_count(UUID, INT);


-- =========================================================
-- [G1] & [G3] place_bid (입찰 RPC) 고강도 방어벽 추가
-- =========================================================
CREATE OR REPLACE FUNCTION place_bid(p_product_id UUID, p_amount BIGINT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v RECORD;
BEGIN
  IF auth.uid() IS NULL THEN 
    RETURN json_build_object('ok', false, 'error', '로그인이 필요합니다.'); 
  END IF;

  -- ✅ G3-(a): 금액 유효성
  IF p_amount IS NULL OR p_amount <= 0 THEN 
    RETURN json_build_object('ok', false, 'error', '입찰 금액이 유효하지 않습니다.'); 
  END IF;

  -- ✅ G3-(c): 금액 상한 (sanity cap, 10억)
  IF p_amount > 1000000000 THEN 
    RETURN json_build_object('ok', false, 'error', '입찰 금액이 허용 범위를 초과했습니다.'); 
  END IF;

  SELECT * INTO v FROM haema_products WHERE id = p_product_id FOR UPDATE;
  
  IF NOT FOUND THEN 
    RETURN json_build_object('ok', false, 'error', '매물을 찾을 수 없습니다.'); 
  END IF;

  -- ✅ G3-(b): 경매 상품 여부 확인
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

  UPDATE haema_products
    SET current_bid = p_amount, 
        bid_count = COALESCE(bid_count, 0) + 1,
        highest_bidder_id = auth.uid()
  WHERE id = p_product_id;
  
  RETURN json_build_object('ok', true, 'new_bid', p_amount);
END $$;
-- ✅ [G1] PUBLIC 그룹에 암묵적으로 부여된 상속 권한 먼저 차단 후 재부여
REVOKE EXECUTE ON FUNCTION place_bid(UUID, BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION place_bid(UUID, BIGINT) FROM anon;
GRANT  EXECUTE ON FUNCTION place_bid(UUID, BIGINT) TO authenticated;

-- ✅ [G3테이블] current_bid에도 10억 한도 제약 조건 추가 (이중 방어)
ALTER TABLE haema_products DROP CONSTRAINT IF EXISTS chk_bid_sanity;
ALTER TABLE haema_products 
  ADD CONSTRAINT chk_bid_sanity 
  CHECK (current_bid IS NULL OR (current_bid >= 0 AND current_bid <= 1000000000));


-- =========================================================
-- [G1] increment_post_views (조회수 RPC) 권한 차단
-- =========================================================
CREATE OR REPLACE FUNCTION increment_post_views(p_post_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  INSERT INTO haema_post_view_log(post_id, user_id) 
    VALUES (p_post_id, auth.uid())
    ON CONFLICT DO NOTHING;
  
  IF FOUND THEN
    UPDATE haema_posts SET views = COALESCE(views,0) + 1 WHERE id = p_post_id;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION increment_post_views(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_post_views(UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION increment_post_views(UUID) TO authenticated;


-- =========================================================
-- [G4] & [G5] pg_cron 연쇄 충돌 방어 및 알림 기능 보수
-- =========================================================
DROP POLICY IF EXISTS "own notif update" ON haema_notifications;
CREATE POLICY "own notif update" ON haema_notifications 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- G4: 크론잡을 에러 격리가 가능한 하나의 함수로 래핑
CREATE OR REPLACE FUNCTION close_expired_auctions()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  WITH closed AS (
    UPDATE haema_products 
      SET is_closed = true 
      WHERE auction = true AND is_closed = false AND auction_end < NOW()
      RETURNING id, title, seller_id, highest_bidder_id, current_bid
  )
  INSERT INTO haema_notifications(user_id, kind, payload)
  SELECT 
    COALESCE(highest_bidder_id, seller_id), 
    CASE WHEN highest_bidder_id IS NOT NULL THEN 'auction_won' ELSE 'auction_closed_no_bid' END,
    jsonb_build_object('product_id', id, 'title', title, 'final_price', current_bid)
  FROM closed
  WHERE COALESCE(highest_bidder_id, seller_id) IS NOT NULL  -- ✅ NULL 삽입으로 인한 트랜잭션 롤백(연쇄 지연) 방어
  UNION ALL
  SELECT seller_id, 'auction_sold', 
    jsonb_build_object('product_id', id, 'title', title, 'final_price', current_bid, 'buyer_id', highest_bidder_id)
  FROM closed 
  WHERE highest_bidder_id IS NOT NULL AND seller_id IS NOT NULL; 
END $$;

-- 크론 스케줄 재등록 (함수 호출로 대체)
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
   PERFORM cron.unschedule('close-expired-auctions');
   PERFORM cron.unschedule('cleanup-view-log');
EXCEPTION WHEN OTHERS THEN
END $$;

SELECT cron.schedule('close-expired-auctions', '* * * * *', $$SELECT close_expired_auctions();$$);

-- 조회수 로그 무한 누적 방지(30일 경과시 삭제) 가비지 콜렉터
SELECT cron.schedule('cleanup-view-log', '0 3 * * *', $$
  DELETE FROM haema_post_view_log WHERE viewed_date < CURRENT_DATE - INTERVAL '30 days';
$$);


-- =========================================================
-- [운영자 사칭 방지] 닉네임 필터링 트리거
-- =========================================================
CREATE OR REPLACE FUNCTION tg_block_admin_impersonation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'nickname' ~* '(해마|운영|공식|admin|어드민|관리자|데카바)' THEN
    RAISE EXCEPTION '해당 단어는 닉네임으로 사용할 수 없습니다.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_block_admin_impersonation ON auth.users;
CREATE TRIGGER trg_block_admin_impersonation
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION tg_block_admin_impersonation();
