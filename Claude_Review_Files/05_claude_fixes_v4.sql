-- ============================================================================
-- 🛡 해마 마켓 보안 및 구조 고도화 마이그레이션 V6 (H1 수정본)
-- 이 SQL을 Supabase 대시보드 -> SQL Editor 에서 실행하세요.
-- ============================================================================

-- =========================================================
-- [H1] 운영자 사칭 방지 트리거 최적화 (가입자 Lockout 방지)
-- =========================================================
CREATE OR REPLACE FUNCTION tg_block_admin_impersonation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  new_nick TEXT := NEW.raw_user_meta_data->>'nickname';
  old_nick TEXT := CASE WHEN TG_OP = 'UPDATE' 
                        THEN OLD.raw_user_meta_data->>'nickname' 
                        ELSE NULL END;
BEGIN
  -- 닉네임이 바뀌지 않은 UPDATE(예: last_sign_in_at 갱신)는 무조건 통과!
  IF TG_OP = 'UPDATE' AND COALESCE(new_nick, '') = COALESCE(old_nick, '') THEN
    RETURN NEW;
  END IF;

  -- 닉네임이 NULL이거나 비어있으면 검사 안 함
  IF new_nick IS NULL OR new_nick = '' THEN
    RETURN NEW;
  END IF;

  -- 🔒 부분매칭 대신 "대괄호 + 운영팀 등 사칭 문구" 명시적으로 차단
  -- 실제 업무 직책(품질관리자, 선박운영팀 등)은 통과
  IF new_nick ~* '(\[\s*해마|해마\s*공식|해마\s*운영|해마\s*관리|^(admin|administrator|어드민|운영자)$|\[운영팀|공식\s*계정)' THEN
    RAISE EXCEPTION '해당 닉네임은 운영자 사칭으로 오해될 가능성이 있어 사용할 수 없습니다.';
  END IF;

  RETURN NEW;
END $$;

-- 기존 잘못된 트리거는 드랍 후 재생성
DROP TRIGGER IF EXISTS trg_block_admin_impersonation ON auth.users;
CREATE TRIGGER trg_block_admin_impersonation
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION tg_block_admin_impersonation();
