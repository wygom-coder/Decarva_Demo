-- 기존에 꼬여버린 테이블 초기화 (안전하게 삭제)
DROP TABLE IF EXISTS public.haema_messages CASCADE;
DROP TABLE IF EXISTS public.haema_chat_rooms CASCADE;
DROP TABLE IF EXISTS public.haema_likes CASCADE;
DROP TABLE IF EXISTS public.haema_reviews CASCADE;

-- 1. 채팅방 테이블 (product_id를 TEXT로 변경하여 모든 타입의 상품 번호/더미 번호 완벽 호환)
CREATE TABLE public.haema_chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL, 
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message TEXT DEFAULT '',
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, buyer_id)
);

-- 2. 메시지 테이블
CREATE TABLE public.haema_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.haema_chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 관심 목록 (찜하기) 테이블
CREATE TABLE public.haema_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- 4. 매너 온도 (구매 후기) 테이블
CREATE TABLE public.haema_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score IN (1, 0, -1)),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, reviewer_id)
);

-- 5. 보안 규칙 (RLS)
ALTER TABLE public.haema_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haema_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haema_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haema_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "채팅방 참여자만 조회 가능" ON public.haema_chat_rooms FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "채팅방 생성은 누구나 가능" ON public.haema_chat_rooms FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "채팅방 업데이트 가능" ON public.haema_chat_rooms FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "메시지 조회/전송" ON public.haema_messages FOR ALL USING (EXISTS (SELECT 1 FROM public.haema_chat_rooms WHERE public.haema_chat_rooms.id = room_id AND (buyer_id = auth.uid() OR seller_id = auth.uid())));
CREATE POLICY "찜 누구나 조회/생성" ON public.haema_likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "리뷰 누구나 조회" ON public.haema_reviews FOR SELECT USING (true);
CREATE POLICY "리뷰 본인 작성" ON public.haema_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- 6. 소켓 통신을 위한 Realtime 테이블 활성화
alter publication supabase_realtime add table haema_messages;
alter publication supabase_realtime add table haema_chat_rooms;
