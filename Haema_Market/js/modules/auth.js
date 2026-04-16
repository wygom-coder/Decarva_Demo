
let currentUser = null;
let authMode = 'signin';

supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    if (event === 'SIGNED_OUT') _mannerTempLoaded = false;
    setTimeout(() => {
        if (typeof updateProfileUI === 'function') {
            updateProfileUI();
        }
        
        if (currentUser) {
            // Logged in UI updates
            const myNameEl = document.querySelector('.my-name');
            const myEmailEl = document.querySelector('.my-sub');
            if (myNameEl) myNameEl.textContent = (currentUser.email ? currentUser.email.split('@')[0] : '유저') + '님';
            if (myEmailEl) myEmailEl.innerHTML = (currentUser.email || '') + ' · 부산';
            
            // Hide login page if visible
            const loginPage = document.getElementById('page-login');
            if(loginPage && loginPage.classList.contains('active')) {
                showPage('home');
            }
        } else {
            // Logged out
            const myNameEl = document.querySelector('.my-name');
            const myEmailEl = document.querySelector('.my-sub');
            if (myNameEl) myNameEl.textContent = '로그인이 필요합니다';
            if (myEmailEl) myEmailEl.innerHTML = '비회원';
        }
    }, 0);
    
    if (currentUser) {
        // Header Nav buttons
        const topLoginBtn = document.getElementById('header-btn-login');
        if(topLoginBtn) topLoginBtn.style.display = 'none';
        
        
        // Header Nav buttons
        const topLoginBtn = document.getElementById('header-btn-login');
        
        if(topLoginBtn) topLoginBtn.style.display = 'none';
        
    } else {
        // Header Nav buttons
        const topLoginBtn = document.getElementById('header-btn-login');
        if(topLoginBtn) topLoginBtn.style.display = 'inline-block';
    }
});

function requireAuthAndShow(id) {
    if(!currentUser) {
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
    
    if(!email || !pw) { errObj.textContent = '이메일과 비밀번호를 모두 입력해주세요.'; return; }
    
    btn.disabled = true;
    btn.textContent = '처리 중...';

    if(authMode === 'signup') {
        const pwConfirm = document.getElementById('auth-pw-confirm').value;
        if(pw !== pwConfirm) { 
            errObj.textContent = '비밀번호가 일치하지 않습니다.'; 
            btn.disabled = false; switchAuthMode('signup'); return; 
        }
        
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: pw
        });
        
        if(error) {
            errObj.textContent = error.message;
        } else {
            alert('회원가입이 완료되었습니다!');
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
        
        if(error) {
            errObj.textContent = '로그인 실패: 이메일 또는 비밀번호를 확인해주세요.';
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
    if(confirm("정말 로그아웃 하시겠습니까?")) {
        await supabaseClient.auth.signOut();
        alert('로그아웃 되었습니다.');
        showPage('home');
        // 로그아웃 후 UI 초기화 등 필요한 경우 여기서 추가
    }
};

