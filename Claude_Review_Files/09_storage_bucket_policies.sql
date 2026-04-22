-- Storage 버킷(market_images) RLS 정책 설정
-- 이 스크립트를 Supabase SQL Editor에서 실행하시면 4-3 단계가 완료됩니다.

-- 1. SELECT: 누구나 조회 (Public 버킷 역할)
DROP POLICY IF EXISTS "Anyone can view market images" ON storage.objects;
CREATE POLICY "Anyone can view market images"
ON storage.objects FOR SELECT
USING (bucket_id = 'market_images');

-- 2. INSERT: 로그인 유저만 업로드
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'market_images');

-- 3. DELETE: 본인 업로드 파일만 삭제
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'market_images' AND auth.uid()::text = owner);
