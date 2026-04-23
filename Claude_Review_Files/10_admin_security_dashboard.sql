-- ============================================================================
-- 10_admin_security_dashboard.sql
-- 어드민 대시보드 강화를 위한 보안 스키마, 감사 로그 테이블 및 RLS 우회용 RPC 함수
-- ============================================================================

-- 1. 어드민 감사 로그 테이블 신설
CREATE TABLE IF NOT EXISTS public.haema_admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,       -- 예: 'DELETE_PRODUCT', 'DELETE_POST', 'COMPLETE_DELETION'
    target_id TEXT NOT NULL,         -- 대상 ID
    details JSONB,                   -- 추가 정보 (제목 등)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.haema_admin_actions ENABLE ROW LEVEL SECURITY;

-- 감사 로그는 어드민만 INSERT 하고 SELECT 할 수 있음
CREATE POLICY "Admins can insert audit logs" ON public.haema_admin_actions
    FOR INSERT WITH CHECK (
        auth.uid() = admin_id AND 
        (auth.jwt()->'app_metadata'->>'role') = 'admin'
    );

CREATE POLICY "Admins can select audit logs" ON public.haema_admin_actions
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') = 'admin'
    );


-- 2. 어드민 대시보드 6대 지표 통계용 RPC 함수 (SECURITY DEFINER)
-- 이 함수는 개별 테이블의 RLS를 우회(보안 정의자 권한)하여 전체 통계를 뽑습니다.
-- 대신 함수 진입 시점에 JWT 롤을 체크하여 어드민만 실행 가능하게 철저히 방어합니다.
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin BOOLEAN;
    _today_new_users INT;
    _today_new_products INT;
    _active_chats INT;
    _unread_24h_chats INT;
    _completed_deals INT;
    _anomaly_count INT;
BEGIN
    -- [보안 1] 호출자가 정말 어드민인지 JWT 체크
    is_admin := (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') = 'admin';
    IF is_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Admin privileges required';
    END IF;

    -- [지표 1] 오늘 신규 가입자 (최근 24시간)
    SELECT COUNT(*) INTO _today_new_users 
    FROM auth.users 
    WHERE created_at >= NOW() - INTERVAL '24 hours';

    -- [지표 2] 오늘 신규 매물 (최근 24시간)
    SELECT COUNT(*) INTO _today_new_products 
    FROM public.haema_products 
    WHERE created_at >= NOW() - INTERVAL '24 hours';

    -- [지표 3] 활성 채팅방 (마지막 메시지가 있는 방을 대략적으로 카운트)
    SELECT COUNT(*) INTO _active_chats 
    FROM public.haema_chat_rooms; 

    -- [지표 4] 응답 대기 채팅 (24시간 이상 안 읽음 - is_read가 false인 메시지를 보유한 방 개수)
    SELECT COUNT(DISTINCT room_id) INTO _unread_24h_chats 
    FROM public.haema_messages 
    WHERE is_read = false 
      AND created_at < NOW() - INTERVAL '24 hours';

    -- [지표 5] 거래 협의 완료 (is_closed = true 인 매물)
    SELECT COUNT(*) INTO _completed_deals 
    FROM public.haema_products 
    WHERE is_closed = true;

    -- [지표 6] 이상 징후 (최근 24시간 내 가격 변동 이력 수 + 탈퇴 요청 대기 건수)
    -- 두 개를 합쳐서 1개 지표로 표시 (관심 집중용)
    SELECT 
        (SELECT COUNT(*) FROM public.haema_price_history WHERE changed_at >= NOW() - INTERVAL '24 hours') +
        (SELECT COUNT(*) FROM public.haema_account_deletion_requests WHERE status = 'pending')
    INTO _anomaly_count;

    -- JSON 형태로 반환 (단 한 번의 API 호출로 6개 지표 처리)
    RETURN jsonb_build_object(
        'today_new_users', _today_new_users,
        'today_new_products', _today_new_products,
        'active_chats', _active_chats,
        'unread_24h_chats', _unread_24h_chats,
        'completed_deals', _completed_deals,
        'anomaly_count', _anomaly_count
    );
END;
$$;
