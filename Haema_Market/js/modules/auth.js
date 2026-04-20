// ============================================================================
// auth.js — 로그인/회원가입/세션 관리
// ============================================================================
// 변경 이력:
//  - P1 (2026-04-19): onAuthStateChange 내 글로벌 채팅 구독 블록 중복 제거
//  - P1 (2026-04-19): 회원가입 6필드 추가 (국문/영문 성명, 연락처,
//                     소속 기업, 부서, 직함) — user_metadata로 저장
//                     기존 코드 호환을 위해 full_name 키도 함께 기록
// ============================================================================

let currentUser = null;
let authMode = 'signin';

supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;

    // 이메일 인증 완료 후 리다이렉트 감지
    if (event === 'SIGNED_IN' && window.location.hash.includes('type=signup')) {
        alert('🎉 이메일 인증이 완료되었습니다! 해마 마켓에 오신 것을 환영합니다.');
        window.history.replaceState(null, '', window.location.pathname);
    }

    if (event === 'SIGNED_OUT') _mannerTempLoaded = false;

    // 글로벌 채팅 알림 구독 (단일 블록 — 중복 금지)
    if (currentUser && typeof subscribeToGlobalMessages === 'function') {
        subscribeToGlobalMessages();
    }
    if (event === 'SIGNED_OUT' && typeof unsubscribeFromGlobalMessages === 'function') {
        unsubscribeFromGlobalMessages();
    }

    setTimeout(() => {
        if (typeof updateProfileUI === 'function') {
            updateProfileUI();
        }
        if (currentUser) {
            const displayName =
                currentUser.user_metadata?.full_name ||
                currentUser.user_metadata?.display_name ||
                (currentUser.email ? currentUser.email.split('@')[0] : '유저');

            const myNameEl = document.querySelector('.my-name');
            const myEmailEl = document.querySelector('.my-sub');
            if (myNameEl) myNameEl.textContent = displayName + '님';
            if (myEmailEl) myEmailEl.textContent = (currentUser.email || '') + ' · 부산';

            const loginPage = document.getElementById('page-login');
            if (loginPage && loginPage.classList.contains('active')) {
                showPage('home');
            }

            // 어드민 대시보드 버튼 토글 (위변조 방지를 위해 서버 2차 검증)
            const adminBtn = document.getElementById('admin-route-btn');
            if (adminBtn) {
                adminBtn.style.display = 'none'; // 기본 숨김
                (async () => {
                    try {
                        const { data: { user }, error } = await supabaseClient.auth.getUser();
                        if (!error && user && user.app_metadata && user.app_metadata.role === 'admin') {
                            adminBtn.style.display = 'flex';
                        }
                    } catch (e) {
                        console.error('Admin role check failed:', e);
                    }
                })();
            }
        } else {
            const myNameEl = document.querySelector('.my-name');
            const myEmailEl = document.querySelector('.my-sub');
            if (myNameEl) myNameEl.textContent = '로그인이 필요합니다';
            if (myEmailEl) myEmailEl.textContent = '비회원';
            
            const adminBtn = document.getElementById('admin-route-btn');
            if (adminBtn) adminBtn.style.display = 'none';
        }
    }, 0);

    const topLoginBtn = document.getElementById('header-btn-login');
    if (currentUser) {
        if (topLoginBtn) topLoginBtn.style.display = 'none';
    } else {
        if (topLoginBtn) topLoginBtn.style.display = 'inline-block';
    }
});

function requireAuthAndShow(id) {
    if (!currentUser) {
        alert('회원가입 및 로그인이 필요한 기능입니다.');
        showPage('login');
    } else {
        showPage(id);
    }
}

function switchAuthMode(mode) {
    authMode = mode;
    document.getElementById('tab-signin').classList.toggle('active', mode === 'signin');
    document.getElementById('tab-signup').classList.toggle('active', mode === 'signup');
    document.getElementById('auth-pw-confirm-row').style.display = mode === 'signup' ? 'block' : 'none';

    // 6필드 추가 영역 토글
    const extraBox = document.getElementById('auth-signup-extra');
    if (extraBox) extraBox.style.display = mode === 'signup' ? 'block' : 'none';
    
    // 약관 동의 체크박스 토글
    const termsBox = document.getElementById('auth-terms-container');
    if (termsBox) termsBox.style.display = mode === 'signup' ? 'block' : 'none';

    document.getElementById('btn-auth-submit').textContent = mode === 'signup' ? '해마 시작하기' : '로그인';
    document.getElementById('auth-error').textContent = '';
}

async function submitAuth() {
    const email = document.getElementById('auth-email').value;
    const pw = document.getElementById('auth-pw').value;
    const errObj = document.getElementById('auth-error');
    const btn = document.getElementById('btn-auth-submit');
    errObj.textContent = '';

    if (!email || !pw) {
        errObj.textContent = '이메일과 비밀번호를 모두 입력해주세요.';
        return;
    }

    if (pw.length < 6) {
        errObj.textContent = '비밀번호는 6자 이상이어야 합니다.';
        return;
    }

    btn.disabled = true;
    btn.textContent = '처리 중...';

    if (authMode === 'signup') {
        const pwConfirm = document.getElementById('auth-pw-confirm').value;
        if (pw !== pwConfirm) {
            errObj.textContent = '비밀번호가 일치하지 않습니다.';
            btn.disabled = false;
            switchAuthMode('signup');
            return;
        }

        // ✅ 약관 동의 검증
        if (!document.getElementById('auth-agree-terms').checked || !document.getElementById('auth-agree-privacy').checked) {
            errObj.textContent = '이용약관 및 개인정보처리방침 열람 후 동의가 필수입니다.';
            btn.disabled = false;
            switchAuthMode('signup');
            return;
        }

        // ✅ 회원가입 6필드 읽기 + 검증
        const fullNameKo = document.getElementById('auth-full-name-ko').value.trim();
        const fullNameEn = document.getElementById('auth-full-name-en').value.trim();
        const phoneRaw = document.getElementById('auth-phone-number').value.trim();
        const companyName = document.getElementById('auth-company-name').value.trim();
        const department = document.getElementById('auth-department').value.trim();
        const jobTitle = document.getElementById('auth-job-title').value.trim();

        if (!fullNameKo || !fullNameEn || !phoneRaw || !companyName || !department || !jobTitle) {
            errObj.textContent = '회원가입에 필요한 모든 정보를 입력해주세요.';
            btn.disabled = false;
            switchAuthMode('signup');
            return;
        }

        // 휴대폰 번호 정규화 + 형식 검증 (010/011/016/017/018/019)
        const phoneDigits = phoneRaw.replace(/\D/g, '');
        if (!/^01[016789]\d{7,8}$/.test(phoneDigits)) {
            errObj.textContent = '휴대폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)';
            btn.disabled = false;
            switchAuthMode('signup');
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: pw,
            options: {
                emailRedirectTo: window.location.origin + window.location.pathname,
                data: {
                    full_name_ko: fullNameKo,
                    full_name_en: fullNameEn,
                    phone_number: phoneDigits,
                    company_name: companyName,
                    department: department,
                    job_title: jobTitle,
                    // ⚠️ 기존 코드(채팅/마이페이지/커뮤니티)가 user_metadata.full_name을
                    //     참조하므로 호환성 유지를 위해 국문 성명을 같이 기록
                    full_name: fullNameKo,
                    agreed_terms_at: new Date().toISOString(),
                    agreed_privacy_at: new Date().toISOString(),
                    agreed_marketing: document.getElementById('auth-agree-marketing').checked
                }
            }
        });

        if (error) {
            errObj.textContent = error.message;
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
            errObj.textContent = '이미 가입된 이메일입니다. 로그인을 시도해주세요.';
        } else {
            alert('📧 인증 이메일을 발송했습니다!\n받은 메일함을 확인하고 링크를 클릭하면 로그인됩니다.');
            showPage('home');
            // 모든 입력 필드 초기화
            document.getElementById('auth-email').value = '';
            document.getElementById('auth-pw').value = '';
            document.getElementById('auth-pw-confirm').value = '';
            document.getElementById('auth-full-name-ko').value = '';
            document.getElementById('auth-full-name-en').value = '';
            document.getElementById('auth-phone-number').value = '';
            document.getElementById('auth-company-name').value = '';
            document.getElementById('auth-department').value = '';
            document.getElementById('auth-job-title').value = '';
            document.getElementById('auth-agree-terms').checked = false;
            document.getElementById('auth-agree-privacy').checked = false;
            document.getElementById('auth-agree-marketing').checked = false;
        }
    } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: pw
        });

        if (error) {
            if (error.message === 'Email not confirmed') {
                errObj.textContent = '이메일 인증이 완료되지 않았습니다. 받은 메일함을 확인하고 링크를 클릭해주세요.';
            } else {
                errObj.textContent = '로그인 실패: 이메일 또는 비밀번호를 확인해주세요.';
            }
        } else {
            showPage('home');
            document.getElementById('auth-email').value = '';
            document.getElementById('auth-pw').value = '';
        }
    }

    btn.disabled = false;
    switchAuthMode(authMode);
}

// 전역 로그아웃 함수
window.doLogout = async function() {
    if (confirm("정말 로그아웃 하시겠습니까?")) {
        await supabaseClient.auth.signOut();
        alert('로그아웃 되었습니다.');
        showPage('home');
    }
};

// 카카오 소셜 로그인
window.loginWithKakao = async function() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) {
        console.error('카카오 로그인 오류:', error.message);
        alert('카카오 로그인 중 오류가 발생했습니다: ' + error.message);
    }
};
