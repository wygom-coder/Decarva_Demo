-- ============================================================================
-- 🛡 해마 마켓 보안 및 구조 고도화 마이그레이션 V3 (클로드 지적사항 패치)
-- 이 SQL을 Supabase 대시보드 -> SQL Editor 에서 실행하세요.
-- ============================================================================

-- 1. [커뮤니티] CSS 인젝션 취약점 방어를 위한 컬럼 삭제
ALTER TABLE haema_posts DROP COLUMN IF EXISTS tag_bg;
ALTER TABLE haema_posts DROP COLUMN IF EXISTS tag_color;

-- 2. [매물] 가격 데이터 정규화 (price_krw 추가 및 마이그레이션)
-- 이미 있다면 생략됨
ALTER TABLE haema_products ADD COLUMN IF NOT EXISTS price_krw BIGINT;

-- 기존 문자열('₩ 1,000,000') 값을 숫자형 BIGINT로 변환하여 밀어넣음
UPDATE haema_products 
  SET price_krw = NULLIF(regexp_replace(price, '\D', '', 'g'), '')::BIGINT
  WHERE price_krw IS NULL;

-- 3. [RPC 함수] 원자적 입찰(Atomid Bid) 처리
-- RLS를 우회하여 서버 내부에서 체크 후 안전하게 증가
CREATE OR REPLACE FUNCTION place_bid(p_product_id UUID, p_amount BIGINT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v RECORD;
BEGIN
  -- 행에 배타적 락을 걸어서 동시성 이슈(Racing condition) 방어
  SELECT * INTO v FROM haema_products WHERE id = p_product_id FOR UPDATE;
  
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

-- 4. [RPC 함수] 커뮤니티 조회수(Views) 원자적 증가 처리
CREATE OR REPLACE FUNCTION increment_post_views(p_post_id UUID)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE haema_posts SET views = COALESCE(views, 0) + 1 WHERE id = p_post_id;
$$;

-- 5. [RPC 함수] 커뮤니티 댓글수(comments_count) 증감 처리
CREATE OR REPLACE FUNCTION update_post_comments_count(p_post_id UUID, p_increment INT)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE haema_posts SET comments_count = GREATEST(COALESCE(comments_count, 0) + p_increment, 0) WHERE id = p_post_id;
$$;

-- 6. [타이머 서버화] 경매 만료 자동 처리 (pg_cron)
-- (옵션) Supabase Free Plan에서는 pg_cron 익스텐션 활성화 필요
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
   -- 기존에 돌고 있는 크론 잡이 있다면 삭제
   PERFORM cron.unschedule('close-expired-auctions');
EXCEPTION WHEN OTHERS THEN
END $$;

-- 매 1분마다 주기적으로 마감 기한이 지난 경매를 자동으로 닫음
SELECT cron.schedule('close-expired-auctions', '* * * * *', $$
  UPDATE haema_products 
    SET is_closed = true 
    WHERE auction = true AND is_closed = false AND auction_end < NOW();
$$);
