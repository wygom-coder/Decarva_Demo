-- ============================================================================
-- 🛡 해마 마켓 보안 및 구조 고도화 마이그레이션 V4 (클로드 2차 피드백 핫픽스)
-- 이 SQL을 Supabase 대시보드 -> SQL Editor 에서 실행하세요.
-- ============================================================================

-- 1. [매물] 가격 데이터 제약 조건 하향 조정 (sanity check)
ALTER TABLE haema_products DROP CONSTRAINT IF EXISTS chk_price_sanity;
ALTER TABLE haema_products 
  ADD CONSTRAINT chk_price_sanity 
  CHECK (price_krw IS NULL OR (price_krw >= 0 AND price_krw <= 1000000000));

-- 2. [커뮤니티] 조회수 방어 로그 테이블 생성 (1일 1조회 유지)
CREATE TABLE IF NOT EXISTS haema_post_view_log (
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  viewed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (post_id, user_id, viewed_date)
);
ALTER TABLE haema_post_view_log ENABLE ROW LEVEL SECURITY;
-- 뷰 로그에 대한 RLS 정책 (서버 롤만 접근, 클라이언트는 RPC로만 우회 접근)
DROP POLICY IF EXISTS "누구나 자신의 로그 조회" ON haema_post_view_log;
CREATE POLICY "누구나 자신의 로그 조회" ON haema_post_view_log FOR SELECT USING (auth.uid() = user_id);


-- 3. [RPC 핫픽스] 조회수 원자적 증가 + 익명/스푸핑 차단 
CREATE OR REPLACE FUNCTION increment_post_views(p_post_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 익명 유저 조용히 무시
  IF auth.uid() IS NULL THEN RETURN; END IF;

  -- 중복 뷰 억제: 같은 유저, 같은 글, 오늘 날짜로 이미 있으면 무시됨
  INSERT INTO haema_post_view_log(post_id, user_id) 
    VALUES (p_post_id, auth.uid())
    ON CONFLICT DO NOTHING;
  
  -- 삽입이 진행되었을 때만(즉 첫 조회일 때만) 조회수 오름
  IF FOUND THEN
    UPDATE haema_posts SET views = COALESCE(views,0) + 1 WHERE id = p_post_id;
  END IF;
END $$;
-- 익명 실행 권한 회수
REVOKE EXECUTE ON FUNCTION increment_post_views(UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION increment_post_views(UUID) TO authenticated;


-- 4. [RPC 핫픽스] 댓글수 원자적 증가 + 임의 조작 방어
CREATE OR REPLACE FUNCTION update_post_comments_count(p_post_id UUID, p_increment INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN 
    RAISE EXCEPTION 'auth required' USING ERRCODE = 'P0001'; 
  END IF;
  -- 증분 값 통제
  IF p_increment NOT IN (-1, 1) THEN 
    RAISE EXCEPTION 'invalid increment' USING ERRCODE = 'P0001'; 
  END IF;
  UPDATE haema_posts 
    SET comments_count = GREATEST(COALESCE(comments_count,0) + p_increment, 0) 
    WHERE id = p_post_id;
END $$;
REVOKE EXECUTE ON FUNCTION update_post_comments_count(UUID, INT) FROM anon;
GRANT  EXECUTE ON FUNCTION update_post_comments_count(UUID, INT) TO authenticated;


-- 5. [RPC 핫픽스] 입찰(Atomid Bid) + 익명/스푸핑 방어
CREATE OR REPLACE FUNCTION place_bid(p_product_id UUID, p_amount BIGINT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v RECORD;
BEGIN
  IF auth.uid() IS NULL THEN 
    RETURN json_build_object('ok', false, 'error', '로그인이 필요합니다.'); 
  END IF;

  SELECT * INTO v FROM haema_products WHERE id = p_product_id FOR UPDATE;
  
  IF NOT FOUND THEN 
    RETURN json_build_object('ok', false, 'error', '매물을 찾을 수 없습니다.'); 
  END IF;

  IF v.seller_id = auth.uid() THEN 
    RETURN json_build_object('ok', false, 'error', '본인 매물에는 입찰할 수 없습니다.'); 
  END IF;
  
  IF v.is_closed OR v.auction_end < NOW() THEN 
    RETURN json_build_object('ok', false, 'error', '이미 종료된 경매입니다.'); 
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
REVOKE EXECUTE ON FUNCTION place_bid(UUID, BIGINT) FROM anon;
GRANT  EXECUTE ON FUNCTION place_bid(UUID, BIGINT) TO authenticated;


-- 6. [DB 테이블] 알림 테이블(Notifications) 신설
CREATE TABLE IF NOT EXISTS haema_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE haema_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own notif read" ON haema_notifications;
CREATE POLICY "own notif read" ON haema_notifications 
  FOR SELECT USING (auth.uid() = user_id);


-- 7. [타이머 서버화] 경매 만료 시 알림 전송 (pg_cron 수정)
-- (옵션) Supabase Free Plan에서는 pg_cron 익스텐션 활성화 필요
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
   PERFORM cron.unschedule('close-expired-auctions');
EXCEPTION WHEN OTHERS THEN
END $$;

SELECT cron.schedule('close-expired-auctions', '* * * * *', $$
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
  UNION ALL
  SELECT seller_id, 'auction_sold', 
    jsonb_build_object('product_id', id, 'title', title, 'final_price', current_bid, 'buyer_id', highest_bidder_id)
  FROM closed WHERE highest_bidder_id IS NOT NULL;
$$);
