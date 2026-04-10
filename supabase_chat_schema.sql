-- 1. 채팅방 테이블 생성 (haema_chat_rooms)
CREATE TABLE public.haema_chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.haema_products(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message TEXT DEFAULT '',
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- 유니크 제약조건을 두어 동일한 상품에 대해 구매자-판매자 간에 1개의 방만 존재하게 함
    UNIQUE(product_id, buyer_id)
);

-- 2. 메시지 내역 테이블 생성 (haema_messages)
CREATE TABLE public.haema_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.haema_chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS (Row Level Security) 설정
ALTER TABLE public.haema_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haema_messages ENABLE ROW LEVEL SECURITY;

-- 채팅방은 '구매자' 혹은 '판매자' 본인만 읽고 쓸 수 있습니다.
CREATE POLICY "채팅방 참여자만 조회 가능" 
ON public.haema_chat_rooms FOR SELECT 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "채팅방 생성은 누구나 가능" 
ON public.haema_chat_rooms FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "채팅방 참여자만 업데이트 가능" 
ON public.haema_chat_rooms FOR UPDATE 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 메시지는 '해당 채팅방에 속한' 참가자만 읽고 쓸 수 있습니다.
CREATE POLICY "채팅방 참여자만 메시지 조회 가능" 
ON public.haema_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.haema_chat_rooms 
    WHERE public.haema_chat_rooms.id = haema_messages.room_id 
    AND (public.haema_chat_rooms.buyer_id = auth.uid() OR public.haema_chat_rooms.seller_id = auth.uid())
  )
);

CREATE POLICY "채팅방 참여자만 메시지 전송 가능" 
ON public.haema_messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.haema_chat_rooms 
    WHERE public.haema_chat_rooms.id = room_id 
    AND (public.haema_chat_rooms.buyer_id = auth.uid() OR public.haema_chat_rooms.seller_id = auth.uid())
  ) AND auth.uid() = sender_id
);

-- 4. 실시간 소켓 통신(Realtime) 활성화
-- 이 테이블들의 변경사항을 웹소켓으로 쏘도록 설정합니다.
alter publication supabase_realtime add table haema_messages;
alter publication supabase_realtime add table haema_chat_rooms;
