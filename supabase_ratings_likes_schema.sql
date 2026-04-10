-- 1. 관심 목록(찜하기) 테이블 생성
CREATE TABLE public.haema_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES public.haema_products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- 한 유저가 같은 상품을 중복해서 찜할 수 없도록 강제
    UNIQUE(user_id, product_id)
);

-- 2. 매너온도(구매 후기) 테이블 생성
CREATE TABLE public.haema_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id BIGINT REFERENCES public.haema_products(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score IN (1, 0, -1)), -- 1: 최고, 0: 보통, -1: 별로
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- এক 거래(상품)당 동일인이 상대방에게 한 번만 후기를 남길 수 있음
    UNIQUE(product_id, reviewer_id)
);

-- 3. 보안 정책 (RLS) 활성화
ALTER TABLE public.haema_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haema_reviews ENABLE ROW LEVEL SECURITY;

-- 누구나 '자신의' 관심 목록만 조회/수정/삭제 가능
CREATE POLICY "본인 찜 조회 가능" 
ON public.haema_likes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "하트 찜하기 가능" 
ON public.haema_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "찜 취소 가능" 
ON public.haema_likes FOR DELETE USING (auth.uid() = user_id);

-- 후기는 누구나 조회 가능 (온도 계산용)
CREATE POLICY "리뷰 전체 조회 가능" 
ON public.haema_reviews FOR SELECT USING (true);

CREATE POLICY "본인이 작성자로만 리뷰 작성 가능" 
ON public.haema_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
