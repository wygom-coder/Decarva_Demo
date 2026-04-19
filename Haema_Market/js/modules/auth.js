// ============================================================================
// auth.js — 로그인/회원가입/세션 관리
// ============================================================================
// ⚠️ P1 수정 (2026-04-19):
//   onAuthStateChange 내부에 subscribeToGlobalMessages 호출 블록이
//   완전 중복(복붙)으로 2회 반복되어 있었음. 매 상태 변경 시 Supabase
//   Realtime 채널이 불필요하게 2배로 재생성되어 비용·지연 발생.
//   → 단일 블록으로 정리.
// ============================================================================

let currentUser = null;
let authMode = 'signin';

supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;

    // 이메일 인증 완료 후 리다이렉트 감지 → 환영 메시지
    if (event === 'SIGNED_IN' && window.location.hash.includes('type=signup')) {
        alert('🎉 이메일 인증이 완료되었습니다! 해마 마켓에 오신 것을 환영합니다.');
        window.history.replaceState(null, '', window.location.pathname);
    }

    if (event === 'SIGNED_OUT') _mannerTempLoaded = false;

    // 글로벌 채팅 알림 구독 관리 (단일 블록 — 중복 금지)
    //   - 로그인 시: 전역 메시지 구독 시작
    //   - 로그아웃 시: 구독 해제 + 뱃지/캐시 초기화
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
            // 카카오 닉네임 우선 표기 (full_name > display_name > 이메일)
            const displayName =
                currentUser.user_metadata?.full_name ||
                currentUser.user_metadata?.display_name ||
                (currentUser.email ? currentUser.email.split('@')[0] : '유저');

            const myNameEl = document.querySelector('.my-name');
            const myEmailEl = document.querySelector('.my-sub');
            if (myNameEl) myNameEl.textContent = displayName + '님';
            if (myEmailEl) myEmailEl.innerHTML = (currentUser.email || '') + ' · 부산';

            const loginPage = document.getElementById('page-login');
            if (loginPage && loginPage.classList.contains('active')) {
                showPage('home');
            }
        } else {
            const myNameEl = document.querySelector('.my-name');
            const myEmailEl = document.querySelector('.my-sub');
            if (myNameEl) myNameEl.textContent = '로그인이 필요합니다';
            if (myEmailEl) myEmailEl.innerHTML = '비회원';
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

    // 클라이언트 단 비밀번호 길이 검사
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

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: pw,
            options: {
                // 로컬/배포 환경 모두 대응 (동적 처리)
                emailRedirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) {
            errObj.textContent = error.message;
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
            // 중복 이메일 오탐 방지
            errObj.textContent = '이미 가입된 이메일입니다. 로그인을 시도해주세요.';
        } else {
            alert('📧 인증 이메일을 발송했습니다!\n받은 메일함을 확인하고 링크를 클릭하면 로그인됩니다.');
            showPage('home');
            document.getElementById('auth-email').value = '';
            document.getElementById('auth-pw').value = '';
            document.getElementById('auth-pw-confirm').value = '';
        }
    } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: pw
        });

        if (error) {
            // 이메일 미인증 상태 구분 안내
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
