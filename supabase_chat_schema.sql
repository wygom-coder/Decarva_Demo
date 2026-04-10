-- 혹시 생성된 흔적이 있다면 먼저 삭제합니다 (에러 방지)
DROP TABLE IF EXISTS public.haema_messages CASCADE;
DROP TABLE IF EXISTS public.haema_chat_rooms CASCADE;

-- 1. 채팅방 테이블 생성 (haema_chat_rooms)
CREATE TABLE public.haema_chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id BIGINT REFERENCES public.haema_products(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message TEXT DEFAULT '',
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- 한 상품에 대해 특정 구매자와 판매자 간 채팅방은 딱 하나만 존재하도록 함
    UNIQUE(product_id, buyer_id)
);

-- 2. 실제 말풍선이 저장되는 테이블 생성 (haema_messages)
CREATE TABLE public.haema_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.haema_chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 해킹 방지 보안 규칙 (RLS) 활성화
ALTER TABLE public.haema_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haema_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "채팅방 참여자만 조회 가능" 
ON public.haema_chat_rooms FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "채팅방 생성은 누구나 가능" 
ON public.haema_chat_rooms FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "채팅방 업데이트 가능" 
ON public.haema_chat_rooms FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "메시지 조회 가능" 
ON public.haema_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.haema_chat_rooms WHERE public.haema_chat_rooms.id = room_id AND (buyer_id = auth.uid() OR seller_id = auth.uid())));

CREATE POLICY "메시지 전송 가능" 
ON public.haema_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.haema_chat_rooms WHERE public.haema_chat_rooms.id = room_id AND (buyer_id = auth.uid() OR seller_id = auth.uid())) AND auth.uid() = sender_id);

-- 4. 실시간 채팅(화면 깜빡임 없이 바로 전송) 기능 켜기
alter publication supabase_realtime add table haema_messages;
alter publication supabase_realtime add table haema_chat_rooms;
