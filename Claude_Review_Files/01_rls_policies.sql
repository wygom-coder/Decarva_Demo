# 해마 마켓 통합 보안 스크립트 (Supabase RLS) - V2 엔진

이 문서의 SQL 코드는 **Supabase 대시보드 → SQL Editor** 에 복사해서 `Run` 하시면 적용됩니다.  
(이전과 달리 방어막에 구멍이 난 부분을 전부 메꾸고, 반복 실행 시 발생하던 에러를 제거(DROP POLICY 추가)한 V2 버전입니다.)

---

```sql
-- ============================================================================
-- 🛡 해마 마켓 RLS 보안 스크립트 (V2 강력 방어막)
-- ============================================================================

-- 0. RLS 적용 (모든 테이블)
ALTER TABLE haema_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE haema_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE haema_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE haema_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE haema_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE haema_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE haema_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE haema_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE haema_account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- 1. 매물 테이블 (haema_products) 계층
DROP POLICY IF EXISTS "누구나 매물 조회 가능" ON haema_products;
CREATE POLICY "누구나 매물 조회 가능" ON haema_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "회원만 매물 등록 가능" ON haema_products;
CREATE POLICY "본인 ID로만 매물 등록" ON haema_products FOR INSERT WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "작성자 본인 수정" ON haema_products;
CREATE POLICY "작성자 본인 수정" ON haema_products FOR UPDATE USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "작성자 또는 어드민 삭제" ON haema_products;
CREATE POLICY "작성자 또는 어드민 삭제" ON haema_products FOR DELETE USING (
  auth.uid() = seller_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

-- 2. 커뮤니티 게시글 (haema_posts) 계층
DROP POLICY IF EXISTS "누구나 게시글 조회 가능" ON haema_posts;
CREATE POLICY "누구나 게시글 조회 가능" ON haema_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "회원만 게시글 작성 가능" ON haema_posts;
CREATE POLICY "본인 ID로만 게시글 작성" ON haema_posts FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "작성자 본인 수정" ON haema_posts;
CREATE POLICY "작성자 본인 수정" ON haema_posts FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "작성자 또는 어드민 삭제" ON haema_posts;
CREATE POLICY "작성자 또는 어드민 삭제" ON haema_posts FOR DELETE USING (
  auth.uid() = author_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

-- 3. 커뮤니티 댓글 (haema_post_comments) 계층
DROP POLICY IF EXISTS "누구나 댓글 조회 가능" ON haema_post_comments;
CREATE POLICY "누구나 댓글 조회 가능" ON haema_post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "회원만 댓글 작성" ON haema_post_comments;
CREATE POLICY "본인 ID로만 댓글 작성" ON haema_post_comments FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "작성자 본인 수정" ON haema_post_comments;
CREATE POLICY "작성자 본인 수정" ON haema_post_comments FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "작성자 또는 어드민 삭제" ON haema_post_comments;
CREATE POLICY "작성자 또는 어드민 삭제" ON haema_post_comments FOR DELETE USING (
  auth.uid() = author_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

-- 4. 채팅방 (haema_chat_rooms) 프라이버시 계층
DROP POLICY IF EXISTS "참여자 또는 어드민만 채팅방 조회" ON haema_chat_rooms;
CREATE POLICY "참여자 또는 어드민만 채팅방 조회" ON haema_chat_rooms FOR SELECT USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

DROP POLICY IF EXISTS "회원만 채팅방 생성" ON haema_chat_rooms;
CREATE POLICY "본인 참여 채팅방만 생성" ON haema_chat_rooms FOR INSERT WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "참여자만 채팅방 수정" ON haema_chat_rooms;
CREATE POLICY "참여자만 채팅방 수정" ON haema_chat_rooms FOR UPDATE USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
) WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 5. 채팅 메시지 (haema_messages) 프라이버시 계층 - [중대 결함 수정됨]
DROP POLICY IF EXISTS "방화벽 오픈(채팅방 입장자가 조회)" ON haema_messages;
DROP POLICY IF EXISTS "참여자만 메시지 조회" ON haema_messages;
CREATE POLICY "참여자만 메시지 조회" ON haema_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM haema_chat_rooms r
        WHERE r.id = haema_messages.room_id
          AND (r.buyer_id = auth.uid() OR r.seller_id = auth.uid())
    )
    OR (auth.jwt()->'app_metadata'->>'role') = 'admin'
);

DROP POLICY IF EXISTS "회원만 메시지 생성" ON haema_messages;
CREATE POLICY "참여자만 메시지 생성" ON haema_messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1 FROM haema_chat_rooms r
        WHERE r.id = room_id
          AND (r.buyer_id = auth.uid() OR r.seller_id = auth.uid())
    )
);

-- 6. 견적/발주서 (haema_quotes) 프라이버시 계층
DROP POLICY IF EXISTS "본인 제출 견적 또는 어드민 조회" ON haema_quotes;
CREATE POLICY "본인 제출 견적 또는 어드민 조회" ON haema_quotes FOR SELECT USING (
  auth.uid() = buyer_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

DROP POLICY IF EXISTS "본인만 견적서 발행" ON haema_quotes;
CREATE POLICY "본인만 견적서 발행" ON haema_quotes FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- 7. 찜/관심목록 (haema_likes) 계층
DROP POLICY IF EXISTS "본인의 찜 목록만 조회" ON haema_likes;
CREATE POLICY "본인의 찜 목록만 조회" ON haema_likes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 이름으로만 찜 등록" ON haema_likes;
CREATE POLICY "본인 이름으로만 찜 등록" ON haema_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인의 찜만 삭제" ON haema_likes;
CREATE POLICY "본인의 찜만 삭제" ON haema_likes FOR DELETE USING (auth.uid() = user_id);

-- 8. 거래 후기 (haema_reviews) 계층
DROP POLICY IF EXISTS "누구나 리뷰 조회" ON haema_reviews;
CREATE POLICY "누구나 리뷰 조회" ON haema_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "본인 작성 리뷰만 등록" ON haema_reviews;
CREATE POLICY "본인 작성 리뷰만 등록" ON haema_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "작성자 또는 어드민만 리뷰 삭제" ON haema_reviews;
CREATE POLICY "작성자 또는 어드민만 리뷰 삭제" ON haema_reviews FOR DELETE USING (
  auth.uid() = reviewer_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

-- 9. 회원탈퇴 요청 (haema_account_deletion_requests) - [누락 정책 추가됨]
DROP POLICY IF EXISTS "본인 조회 또는 어드민 조회" ON haema_account_deletion_requests;
CREATE POLICY "본인 조회 또는 어드민 조회" ON haema_account_deletion_requests FOR SELECT USING (
  auth.uid() = user_id OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

DROP POLICY IF EXISTS "본인만 생성" ON haema_account_deletion_requests;
CREATE POLICY "본인만 생성" ON haema_account_deletion_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "어드민만 업데이트" ON haema_account_deletion_requests;
CREATE POLICY "어드민만 업데이트" ON haema_account_deletion_requests FOR UPDATE USING (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

-- 10. 중복 탈퇴 신청 방지를 위한 인덱스 추가 (선택사항)
DROP INDEX IF EXISTS uniq_pending_deletion_per_user;
CREATE UNIQUE INDEX uniq_pending_deletion_per_user
    ON haema_account_deletion_requests(user_id)
    WHERE status = 'pending';

-- 11. 채팅방 더블클릭/네트워크 지연으로 인한 중복 생성 방어
DROP INDEX IF EXISTS uniq_chat_room_per_buyer_product;
CREATE UNIQUE INDEX uniq_chat_room_per_buyer_product 
    ON haema_chat_rooms(buyer_id, product_id);
-- ============================================================================
```
