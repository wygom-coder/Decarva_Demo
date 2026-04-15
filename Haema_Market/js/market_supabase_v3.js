function showPage(id, pushHistory = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById('page-' + id);
  if(targetPage) targetPage.classList.add('active');
  window.scrollTo({top:0, behavior:'smooth'});
  if(pushHistory) {
    window.history.pushState({ pageId: id }, '', '#' + id);
  }
}

// 브라우저 뒤로가기 버튼 활성화 (popstate 이벤트
window.addEventListener('popstate', (e) => {
    if(e.state && e.state.pageId) {
        showPage(e.state.pageId, false);
    } else {
        showPage('home', false);
    }
});

function triggerBottomNav(tab) {
  // Update Tab UI
  document.querySelectorAll('.tab-item').forEach(btn => btn.classList.remove('active'));
  const clickedTab = Array.from(document.querySelectorAll('.tab-item')).find(btn => btn.getAttribute('onclick').includes(tab));
  if(clickedTab) clickedTab.classList.add('active');

  // Guard Logic
  if(tab === 'chat' || tab === 'mypage') {
      if(!currentUser) {
          alert('로그인이 필요한 기능입니다.');
          showPage('login');
          return;
      }
  }

  // Trigger Logic
  if(tab === 'home') {

    showPage('home');
    resetFilters();
  } else if(tab === 'search') {
    showPage('home');
    const input = document.getElementById('search-input');
    if(input) {
      input.focus();
    }
  } else if(tab === 'auction') {
    showPage('home');
    resetFilters();
    applySubFilter('tradeType', '경매');
  } else if(tab === 'community') {
    showPage('community');
    if (typeof renderCommunityPosts === 'function') renderCommunityPosts();
  } else if(tab === 'chat') {
    showPage('chat');
    document.getElementById('chat-list').style.display = 'block';
    document.getElementById('chatroom').style.display = 'none';
    const fab = document.querySelector('.fab-container');
    if(fab) fab.style.display = 'flex';
  } else if(tab === 'mypage') {
    showPage('mypage');
  }

  // Update fab display correctly
  const fabReg = document.querySelector('.fab-register');
  const fabTop = document.querySelector('.fab-top');
  
  if(tab === 'community') {
      if(fabReg) fabReg.style.display = 'none';
      if(fabTop) fabTop.style.marginBottom = '76px';
  } else {
      if(fabReg) fabReg.style.display = 'flex';
      if(fabTop) fabTop.style.marginBottom = '0px';
  }
}

function showChatRoom() {
  document.getElementById('chat-list').style.display = 'none';
  document.getElementById('chatroom').style.display = 'flex';
  
  // Custom KakaoTalk style full screen
  const fab = document.querySelector('.fab-container');
  if(fab) fab.style.display = 'none';
}

function hideChatRoom() {
  document.getElementById('chat-list').style.display = 'block';
  document.getElementById('chatroom').style.display = 'none';
  
  const fab = document.querySelector('.fab-container');
  if(fab) fab.style.display = 'flex';
}

// ==== Supabase 연동 & 상태 관리 데이터 ====
const SUPABASE_URL = 'https://conlrhslgepktvajvgvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n2kbcfymcwb4Nna5hN7wsA_TRKixOG5';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let auctionInterval = null;
let uploadedBase64 = null;
let uploadedBlob = null;
const KATEGORY_MAP = {
  '전체': [
    { name: '엔진·동력', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="10" width="16" height="9" rx="2" stroke="#1A5FA0" stroke-width="1.4"/><path d="M7 10V7a4 4 0 018 0v3" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '펌프·배관', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 8h12M5 14h12" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><rect x="3" y="5" width="16" height="12" rx="2" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: '로프·와이어', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1A5FA0" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#DAEEFF' },
    { name: '작업복·안전화', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 6h10v12H6z" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 6l3-4 3 4" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '구명설비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1E8E3E" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#E6F4EA' },
    { name: '소방설비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4C7 4 7 11 7 11c0 3.3 2.7 6 4 6s4-2.7 4-6c0 0 0-7-4-7z" stroke="#D32F2F" stroke-width="1.4"/></svg>', bg: '#FFEBEE' },
    { name: '쌀·곡물', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="4" width="10" height="14" rx="2" stroke="#1E8E3E" stroke-width="1.4"/><line x1="8" y1="10" x2="14" y2="10" stroke="#1E8E3E" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#E6F4EA' },
    { name: '수산물', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 11s4-4 8 0 6 4 6 4-2 3-5 1-9-3-9-5z" stroke="#1A5FA0" stroke-width="1.4"/></svg>', bg: '#DAEEFF' }
  ],
  '기부속': [
    { name: '엔진·동력', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="10" width="16" height="9" rx="2" stroke="#1A5FA0" stroke-width="1.4"/><path d="M7 10V7a4 4 0 018 0v3" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '항법장비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="6" stroke="#D4960A" stroke-width="1.4"/><line x1="11" y1="5" x2="11" y2="3" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><line x1="17" y1="11" x2="19" y2="11" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><circle cx="11" cy="11" r="2" fill="#D4960A"/></svg>', bg: '#FFF3C0' },
    { name: '갑판장비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 14L11 4l7 10H4z" stroke="#1A5FA0" stroke-width="1.4" stroke-linejoin="round"/><line x1="11" y1="14" x2="11" y2="19" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/><line x1="7" y1="19" x2="15" y2="19" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '통신장비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="5" y="6" width="12" height="10" rx="2" stroke="#D4960A" stroke-width="1.4"/><path d="M9 6V4h4v2" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><line x1="8" y1="11" x2="14" y2="11" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#FFF3C0' },
    { name: '펌프·배관', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 8h12M5 14h12" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><rect x="3" y="5" width="16" height="12" rx="2" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: '전기·계측', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="4" width="10" height="14" rx="2" stroke="#1A5FA0" stroke-width="1.4"/><line x1="11" y1="14" x2="15" y2="10" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '기타부품', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#D4960A" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#FFF3C0' }
  ],
  '선용품': [
    { name: '로프·와이어', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1A5FA0" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#DAEEFF' },
    { name: '페인트·화공품', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="8" width="10" height="10" rx="2" stroke="#D4960A" stroke-width="1.4"/><path d="M8 8V6a2 2 0 116 0v2" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: '작업복·안전화', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 6h10v12H6z" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 6l3-4 3 4" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '청소·소모품', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 20l-4-8h8l-4 8z" stroke="#D4960A" stroke-width="1.4"/><path d="M11 12V4" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: '공구·기기', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M14 6l-8 8" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/><circle cx="16" cy="6" r="2" stroke="#1A5FA0" stroke-width="1.4"/></svg>', bg: '#DAEEFF' },
    { name: '기타', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#D4960A" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#FFF3C0' }
  ],
  '안전장비': [
    { name: '구명설비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1E8E3E" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#E6F4EA' },
    { name: '소방설비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4C7 4 7 11 7 11c0 3.3 2.7 6 4 6s4-2.7 4-6c0 0 0-7-4-7z" stroke="#D32F2F" stroke-width="1.4"/></svg>', bg: '#FFEBEE' },
    { name: '개인보호구', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 6h10v12H6z" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 6l3-4 3 4" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '항해안전', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="10" r="5" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 16l3 3 3-3" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><line x1="11" y1="19" x2="11" y2="15" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '기타', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#D4960A" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#FFF3C0' }
  ],
  '주/부식': [
    { name: '쌀·곡물', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="4" width="10" height="14" rx="2" stroke="#1E8E3E" stroke-width="1.4"/><line x1="8" y1="10" x2="14" y2="10" stroke="#1E8E3E" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#E6F4EA' },
    { name: '육류', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 12c0-4 6-6 12 0-6 6-12 4-12 0z" stroke="#D32F2F" stroke-width="1.4"/></svg>', bg: '#FFEBEE' },
    { name: '수산물', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 11s4-4 8 0 6 4 6 4-2 3-5 1-9-3-9-5z" stroke="#1A5FA0" stroke-width="1.4"/></svg>', bg: '#DAEEFF' },
    { name: '청과류', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="12" r="6" stroke="#D4960A" stroke-width="1.4"/><path d="M11 6v2" stroke="#1E8E3E" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#FFF3C0' },
    { name: '가공·음료', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="7" y="6" width="8" height="12" rx="2" stroke="#7A5200" stroke-width="1.4"/><line x1="7" y1="10" x2="15" y2="10" stroke="#7A5200" stroke-width="1.4"/></svg>', bg: '#FFF3C0' }
  ]
};

const CAT_TO_TOP_MAP = {};
Object.entries(KATEGORY_MAP).forEach(([top, cats]) => {
    if (top !== '전체') cats.forEach(c => CAT_TO_TOP_MAP[c.name] = top);
});



let currentUser = null;
let authMode = 'signin';

supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    if (event === 'SIGNED_OUT') _mannerTempLoaded = false;
    updateProfileUI();
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
        
        // Header Nav buttons
        const topLoginBtn = document.getElementById('header-btn-login');
        
        if(topLoginBtn) topLoginBtn.style.display = 'none';
        
    } else {
        // Logged out
        const myNameEl = document.querySelector('.my-name');
        const myEmailEl = document.querySelector('.my-sub');
        if (myNameEl) myNameEl.textContent = '로그인이 필요합니다';
        if (myEmailEl) myEmailEl.innerHTML = '비회원';
        
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


let userCart = JSON.parse(localStorage.getItem('haema_cart')) || [];

let filterState = {
  topCategory: '전체',
  keyword: '',
  category: '전체',
  region: '전체',
  condition: '전체',
  cert: '전체',
  tradeType: '전체',
  supplier: '전체',
  minPrice: null,
  maxPrice: null
};

function renderSubCategories(topCat) {
    const catBar = document.getElementById('sub-cat-bar');
    const catGrid = document.getElementById('main-cat-grid');
    if(!catBar || !catGrid) return;
    
    const subCats = KATEGORY_MAP[topCat] || [];
    
    // Hide horizontal text sub-bar for all tabs to unify UI (We rely strictly on the icon grid and dropdown filters)
    catBar.style.display = 'none';
    const fb = document.querySelector('.filter-bar');
    if(fb) fb.style.display = 'flex';
    catBar.innerHTML = '';
    
    // Update grid icons
    let gridHTML = '';
    subCats.forEach(c => {
        const isActive = filterState.category === c.name;
        const lblStyle = isActive ? 'color:#1E8E3E; font-weight:800;' : '';
        const ringStyle = isActive ? 'box-shadow:0 0 0 2px #1E8E3E;' : '';
        gridHTML += `<div class="cat-icon-item" data-cat="${c.name}"><div class="cat-icon-box" style="background:${c.bg}; ${ringStyle}">${c.svg}</div><span class="cat-icon-label" style="${lblStyle}">${c.name}</span></div>`;
    });
    catGrid.innerHTML = gridHTML;
    
    // Attach click events to grid icons locally (Unifying toggle logic for ALL tabs)
    catGrid.querySelectorAll('.cat-icon-item').forEach(el => {
        el.addEventListener('click', () => {
            const catName = el.getAttribute('data-cat');
            
            if (filterState.category === catName) filterState.category = '전체';
            else filterState.category = catName;
            
            renderSubCategories(topCat);
            renderProducts();
        });
    });
}

function initTopCategory() {
  const topTabs = document.querySelectorAll('.top-tab');
  
  topTabs.forEach(tab => {
      tab.addEventListener('click', () => {
          topTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const topVal = tab.getAttribute('data-top');
          
          if(filterState.topCategory !== topVal) {
             filterState.topCategory = topVal;
             filterState.category = '전체'; // Reset sub-category on top category change
             filterState.keyword = '';
             const _si = document.getElementById('search-input');
             if (_si) _si.value = '';
             renderSubCategories(topVal);
             renderProducts();
          }
      });
  });
  
  // Initial render
  renderSubCategories(filterState.topCategory);
}


function renderFoodBar() {
    const foodBar = document.getElementById('food-cat-bar');
    if (!foodBar) return;
    const Foods = ['전체', '쌀·곡물', '육류', '수산물', '청과류', '가공·음료'];
    let html = '';
    Foods.forEach(f => {
        const isActive = filterState.foodCategory === f ? 'background:#1E8E3E;color:#fff;border-color:#1E8E3E;' : 'background:#fff;color:#7A93B0;border-color:#eaedf2;';
        html += `<div class="food-pill" data-food="${f}" style="padding:6px 14px; border-radius:20px; font-size:13px; font-weight:700; border:1px solid; cursor:pointer; flex-shrink:0; ${isActive}">${f}</div>`;
    });
    foodBar.innerHTML = html;
    
    foodBar.querySelectorAll('.food-pill').forEach(el => {
        el.addEventListener('click', () => {
            filterState.foodCategory = el.getAttribute('data-food');
            renderFoodBar();
            renderProducts();
        });
    });
}

// 카테고리를 그리는 HTML 생성 유틸 함수
function createProductCardHTML(p) {
    let tagsHTML = '';
    if (p.auth) tagsHTML += '<span class="ptag ptag-b">인증</span>';
    if (p.tradeType === '직거래' || p.tradeType === '모두') tagsHTML += '<span class="ptag ptag-y">직거래</span>';
    if (p.offer) tagsHTML += '<span class="ptag ptag-r">가격제안</span>';
    if (p.auction) {
        if(p.is_closed) {
            tagsHTML += `<span class="ptag ptag-b" style="background:#eee;color:#999;border:none;">낙찰 완료</span>`;
        } else if(p.auction_end) {
            tagsHTML += `<span class="ptag ptag-b auction-timer-tag" data-end="${p.auction_end}">계산중...</span>`;
        } else if (p.remain) {
            tagsHTML += `<span class="ptag ptag-b">${p.remain}</span>`;
        }
    }

    let priceHTML = `<div class="product-price">${p.price}</div>`;
    if (p.auction) {
      if(p.is_closed) {
          const finalPrice = p.current_bid ? `₩ ${p.current_bid.toLocaleString()}` : '유찰됨';
          priceHTML = `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><span class="auction-badge" style="background:#7A93B0;">종료</span><span style="font-size:14px;font-weight:700;color:#7A93B0;text-decoration:line-through;">${finalPrice}</span></div>`;
      } else {
          const showPrice = p.current_bid ? `₩ ${p.current_bid.toLocaleString()}` : p.price;
          priceHTML = `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><span class="auction-badge">경매중</span><span style="font-size:14px;font-weight:700;color:#1A2B4A;">${showPrice}</span></div>`;
      }
    }

    return `
      <div class="product-card" onclick="openProductModal('${p.id}')" style="cursor:pointer;">
        <div class="product-img">${p.svg}</div>
        <div class="product-body">
          <div class="product-title">${p.title}</div>
          <div class="product-sub">${p.sub}</div>
          ${priceHTML}
          <div class="product-tags" style="gap:4px;">${tagsHTML}</div>
        </div>
      </div>
    `;
}

// 화면 렌더링 로직
function renderProducts() {
  const grid = document.getElementById('main-product-grid');
  const catArea = document.getElementById('home-category-area');
  const recArea = document.getElementById('home-recommendation-area');
  const listTitle = document.getElementById('main-product-title-header');
  
  if(!grid) return;
  grid.innerHTML = '';
  
  let filtered = products.filter(p => {
    let topOfP = CAT_TO_TOP_MAP[p.category] || p.category; // fallback to p.category instead of contaminating 기부속
    if (['쌀·곡물', '육류', '수산물', '청과류', '가공·음료', '주/부식'].includes(p.category)) {
        topOfP = '주/부식';
    }
    if (filterState.topCategory !== '전체' && topOfP !== filterState.topCategory) return false;
    
    // 0. 키워드 매칭
    if (filterState.keyword) {
        const kw = filterState.keyword.toLowerCase();
        const bodyTxt = (p.title + ' ' + (p.category || '')).toLowerCase();
        if(!bodyTxt.includes(kw)) return false;
    }
    // 1. 대분류 카테고리 체크
    if (filterState.category !== '전체') {
        if (p.category !== filterState.category) return false;
    }
    
    // 2. 다중 필터 체크
    if (filterState.region !== '전체' && p.region !== filterState.region) return false;
    if (filterState.condition !== '전체' && p.condition !== filterState.condition) return false;
    if (filterState.cert !== '전체' && p.cert !== filterState.cert) return false;
    if (filterState.tradeType !== '전체') {
        if (filterState.tradeType === '직거래' && p.tradeType !== '직거래') return false;
        if (filterState.tradeType === '경매' && !p.auction) return false;
        if (filterState.tradeType === '가격제안' && !p.offer) return false;
    }
    // 업체별 필터링
    if (filterState.supplier !== '전체') {
        const titleStr = p.title || '';
        const match = titleStr.match(/^\[(.*?)\]/);
        const extractedSupplier = match ? match[1] : '';
        if (!extractedSupplier.includes(filterState.supplier) && !titleStr.includes(filterState.supplier)) {
            return false;
        }
    }
    // 3. 커스텀 가격
    const valObj = p.price.replace(/[^0-9]/g, '');
    if (valObj) {
        const val = parseInt(valObj);
        if (filterState.minPrice !== null && val < filterState.minPrice) return false;
        if (filterState.maxPrice !== null && val > filterState.maxPrice) return false;
    }
    return true;
  });

  grid.innerHTML = '';

  // View Toggle based on '전체' selection
  if (filterState.topCategory === '전체' && filterState.keyword === '') {
      // Main Page Mode
      if(catArea) catArea.style.display = 'block'; // Show curated sub-categories on main page
      if(recArea) recArea.style.display = 'block';
      if(listTitle) listTitle.innerHTML = '<span class="section-title">최신 전체 매물</span><span class="section-more">더보기 →</span>';
      
      const recList = document.getElementById('recommendation-list');
      const curList = document.getElementById('curation-list');
      
      if(recList && curList) {
          recList.innerHTML = ''; curList.innerHTML = '';
          const shuffled = [...filtered].sort(() => 0.5 - Math.random());
          const recItems = shuffled.slice(0, 4);
          const curItems = shuffled.slice(4, 8);
          
          if(recItems.length > 0) recItems.forEach(p => recList.innerHTML += createProductCardHTML(p));
          else recList.innerHTML = '<div style="padding: 60px 20px; font-size:13px; color:#999; text-align:center; width:100%;">등록된 매물이 없습니다.</div>';
          
          if(curItems.length > 0) curItems.forEach(p => curList.innerHTML += createProductCardHTML(p));
          else curList.innerHTML = '<div style="padding: 60px 20px; font-size:13px; color:#999; text-align:center; width:100%;">등록된 매물이 없습니다.</div>';
      }
      
  } else if (filterState.category === '전체' && filterState.keyword === '') {
      // Specific Top-Category Curation
      if(catArea) catArea.style.display = 'block';
      if(recArea) recArea.style.display = 'block';
      if(listTitle) listTitle.innerHTML = '<span class="section-title"><span style="color:#1A5FA0; margin-right:6px; font-size:16px;">▪</span>최신 매물</span><span class="section-more">더보기 →</span>';
      
      const recList = document.getElementById('recommendation-list');
      const curList = document.getElementById('curation-list');
      
      if(recList && curList) {
          recList.innerHTML = ''; curList.innerHTML = '';
          const shuffled = [...filtered].sort(() => 0.5 - Math.random());
          const recItems = shuffled.slice(0, 4);
          const curItems = shuffled.slice(4, 8);
          
          if(recItems.length > 0) recItems.forEach(p => recList.innerHTML += createProductCardHTML(p));
          else recList.innerHTML = '<div style="padding: 60px 20px; font-size:13px; color:#999; text-align:center; width:100%;">조건에 맞는 매물이 없습니다.</div>';
          
          if(curItems.length > 0) curItems.forEach(p => curList.innerHTML += createProductCardHTML(p));
          else curList.innerHTML = '<div style="padding: 60px 20px; font-size:13px; color:#999; text-align:center; width:100%;">조건에 맞는 매물이 없습니다.</div>';
      }
      
  } else {
      // Hide recommendations, show only filtered list
      if(catArea) catArea.style.display = 'block'; // ALWAYS SHOW CATEGORIES
      if(recArea) recArea.style.display = 'none';
      if(listTitle) listTitle.innerHTML = `<span class="section-title"><span style="color:#1A5FA0; margin-right:6px; font-size:16px;">▪</span>${filterState.category} 결과</span>`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 100px 20px; display:flex; align-items:center; justify-content:center; color: var(--text-muted); font-size: 14px;">선택한 조건에 맞는 매물이 없습니다.</div>';
    return;
  }

  filtered.forEach(p => {
    grid.innerHTML += createProductCardHTML(p);
  });

  if(auctionInterval) clearInterval(auctionInterval);


  auctionInterval = setInterval(() => {
    const timeNow = new Date().getTime();
    document.querySelectorAll('.auction-timer-tag').forEach(tag => {
       const end = new Date(tag.getAttribute('data-end')).getTime();
       const diff = end - timeNow;
       if(diff <= 0) {
          tag.textContent = '경매 종료';
          tag.style.background = '#eee';
          tag.style.color = '#999';
       } else {
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          tag.textContent = `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')} 남음`;
       }
    });
  }, 1000);


}

// setCategory function was completely removed as it caused reference errors and is now handled exclusively inside renderSubCategories

function updateFilterStyles() {
    // 필터 부모 노드들 강조색 업데이트
    document.querySelectorAll('.filter-dropdown').forEach(btn => {
        const target = btn.getAttribute('data-target');
        // 가격 필터 특수처리
        if (target === 'price') {
            if (filterState.minPrice !== null || filterState.maxPrice !== null) btn.classList.add('applied');
            else btn.classList.remove('applied');
            return;
        }
        // 일반 패널 처리
        if (filterState[target] && filterState[target] !== '전체') {
            btn.classList.add('applied');
        } else {
            btn.classList.remove('applied');
        }
    });

    // 칩 UI 업데이트
    document.querySelectorAll('.f-sub-chip').forEach(chip => {
        const key = chip.getAttribute('data-key');
        const val = chip.getAttribute('data-val');
        if (filterState[key] === val) chip.classList.add('on');
        else chip.classList.remove('on');
    });
}

function applySubFilter(key, val) {
    filterState[key] = val;
    updateFilterStyles();
    renderProducts();
}

function resetFilters() {
    filterState.keyword = '';
    filterState.region = '전체';
    filterState.condition = '전체';
    filterState.cert = '전체';
    filterState.tradeType = '전체';
    filterState.supplier = '전체';
    filterState.minPrice = null;
    filterState.maxPrice = null;

    const minInput = document.getElementById('min-price');
    const maxInput = document.getElementById('max-price');
    const searchInput = document.getElementById('search-input');
    if(minInput) minInput.value = '';
    if(maxInput) maxInput.value = '';
    if(searchInput) searchInput.value = '';

    // 닫기
    document.querySelector('.filter-panels').classList.remove('show');
    document.querySelectorAll('.filter-dropdown').forEach(btn => btn.classList.remove('open'));
    document.querySelectorAll('.filter-panel').forEach(p => p.classList.remove('show'));

    updateFilterStyles();
    renderProducts();
}


function openProductModal(id) {
    const p = products.find(x => String(x.id) === String(id));
    if(!p) return;
    
    document.getElementById('product-modal').style.display = 'flex';
    const body = document.getElementById('product-modal-body');
    
    let actionArea = '';
    const catTrimmed = (p.category||'').trim();
    let topCat = CAT_TO_TOP_MAP[catTrimmed] || catTrimmed;
    if (!KATEGORY_MAP[topCat]) topCat = '기부속';
    if (['쌀·곡물', '육류', '수산물', '청과류', '가공·음료', '주/부식'].includes(catTrimmed)) {
        topCat = '주/부식';
    }

    if (topCat === '주/부식') {
        const storeMatch = p.title.match(/^\[(.*?)\]/);
        const storeName = storeMatch ? storeMatch[1] : '인증 협력업체';
        
        actionArea = `
            <div style="background:#e6f4ea; border:1px solid #1E8E3E; padding:16px; border-radius:12px; margin-top:20px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="background:#1E8E3E; color:#fff; font-size:11px; padding:2px 6px; border-radius:4px; font-weight:700;">추천 벤더</div>
                    <span style="font-size:14px; font-weight:700; color:#1A2B4A;">${storeName}</span>
                </div>
                <div style="margin-top:6px; font-size:13px; color:#333; line-height:1.4;">이 물품은 해당 지역의 우수 벤더가 납품합니다. 동일 업체의 식품을 여러 개 담아 견적을 요청하시면 물류비가 대폭 절감됩니다.</div>
            </div>
            <div style="margin-top:16px; margin-bottom:24px; display:flex; flex-direction:column; gap:12px;">
                <button style="width:100%; padding:14px; border-radius:12px; background:#1E8E3E; color:#fff; font-size:15px; font-weight:700; border:none; cursor:pointer;" onclick="addToCart('${p.id}'); closeProductModal();">[${storeName}] 전용 견적 장바구니에 담기</button>
            </div>
        `;
    } else if (topCat === '선용품' || topCat === '안전장비') {
        actionArea = `
            <div style="margin-top:20px; margin-bottom:24px; display:flex; gap:12px;">
                <button style="flex:1; padding:14px; border-radius:12px; background:#fff; color:#1A5FA0; border:1px solid #1A5FA0; font-size:15px; font-weight:700; cursor:pointer;" onclick="addToCart('${p.id}'); closeProductModal();">견적 장바구니 담기</button>
                <button style="flex:1; padding:14px; border-radius:12px; background:#1A5FA0; color:#fff; font-size:15px; font-weight:700; border:none; cursor:pointer;" onclick="startChat('${p.id}')">판매자와 네고하기</button>
            </div>
        `;
    } else {
        if (p.auction) {
            const displayPrice = p.current_bid ? p.current_bid.toLocaleString() : p.price.replace(/[^0-9]/g, '');
            const remainText = p.is_closed ? '경매 종료됨' : (p.auction_end ? '마감: ' + new Date(p.auction_end).toLocaleString() : '진행중');
            
            actionArea = `
                <div style="background:#F4F9FF; border:1px solid #1A5FA0; padding:16px; border-radius:12px; margin-top:20px; margin-bottom:24px;">
                    <div style="color:#1A5FA0; font-size:12px; font-weight:700; margin-bottom:8px;">🔥 최고 입찰자만이 낙찰자가 됩니다!</div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-size:13px; color:#7A93B0;">현재 최고가 (입찰 ${p.bid_count || 0}회)</span>
                        <span style="font-size:20px; font-weight:800; color:#1A2B4A;">₩ ${displayPrice}</span>
                    </div>
                    <div style="font-size:12px; color:#E53E3E; font-weight:600; margin-bottom:16px;">${remainText}</div>
                    
                    ${p.is_closed ? `<button style="width:100%; padding:14px; border-radius:12px; background:#EAEDF2; color:#7A93B0; font-size:15px; font-weight:700; border:none;" disabled>마감된 경매입니다</button>` : `
                    <div style="display:flex; gap:8px; margin-bottom:12px;">
                        <button type="button" onclick="document.getElementById('bid-amount').value = ${parseInt(displayPrice.replace(/,/g,'')) + 10000}" style="flex:1; padding:10px; background:#fff; border:1px solid #1A5FA0; color:#1A5FA0; border-radius:8px; font-weight:600; cursor:pointer;">+ 1만원</button>
                        <button type="button" onclick="document.getElementById('bid-amount').value = ${parseInt(displayPrice.replace(/,/g,'')) + 50000}" style="flex:1; padding:10px; background:#fff; border:1px solid #1A5FA0; color:#1A5FA0; border-radius:8px; font-weight:600; cursor:pointer;">+ 5만원</button>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <input type="number" id="bid-amount" placeholder="희망가 입력" style="flex:1; padding:12px 14px; border:1px solid #ccc; border-radius:8px; outline:none; font-size:15px; font-weight:600;">
                        <button onclick="submitBid('${p.id}')" class="auction-bid-btn" style="background:#D4960A; color:#fff; border:none; border-radius:8px; padding:0 24px; font-weight:700; font-size:15px; cursor:pointer;">입찰</button>
                    </div>
                    `}
                </div>
            `;
        } else {
            actionArea = `
                <div style="margin-top:20px; margin-bottom:24px; display:flex; gap:12px;">
                    <button style="flex:1; padding:14px; border-radius:12px; background:#1A5FA0; color:#fff; font-size:15px; font-weight:700; border:none; cursor:pointer;" onclick="startChat('${p.id}')">판매자와 채팅하기</button>
                </div>
            `;
        }
    }
    
    const safeContent = p.content && p.content !== 'undefined' ? p.content : '상세 설명이 없습니다.';
    
    body.innerHTML = `
        <div style="width:100%; aspect-ratio:4/3; background:#f4f4f4; border-radius:0 0 12px 12px; overflow:hidden; margin-bottom:16px; position:relative;">
            ${p.svg}
            <div id="modal-heart-btn" onclick="toggleLike('${p.id}')" style="position:absolute; bottom:12px; right:12px; width:40px; height:40px; background:rgba(255,255,255,0.9); border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; box-shadow:0 2px 8px rgba(0,0,0,0.1); transition:transform 0.1s;">🤍</div>
        </div>
        
        <div style="padding: 0 20px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="background:#EAEDF2; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; color:#7A93B0;">${p.tradeType}</div>
                <div style="background:#E6F4EA; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; color:#1E8E3E;">${p.condition}</div>
            </div>
            <h2 style="margin:0 0 4px 0; font-size:20px; color:#1A2B4A;">${p.title}</h2>
            <div style="color:#7A93B0; font-size:13px; margin-bottom:16px;">${p.sub}</div>
            <div style="font-size:24px; font-weight:800; color:#1A2B4A; margin-bottom:8px;">${p.price}</div>
            
            <div style="padding:16px; background:#fff; border:1px solid rgba(0,0,0,0.05); border-radius:12px; display:flex; align-items:center; gap:12px; margin-top:20px;">
                <div style="width:40px; height:40px; border-radius:50%; background:#1A5FA0; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700;">판</div>
                <div>
                    <div style="font-size:13px; font-weight:700; color:#1A2B4A;">판매자 정보 (보호됨)</div>
                    <div style="font-size:11px; color:#7A93B0;">안전거래 사용 우수 판매자</div>
                </div>
            </div>
            
            <div style="margin-top:20px; white-space:pre-wrap; font-size:14px; color:#1A2B4A; line-height:1.6;">${safeContent}</div>
            ${actionArea}
        </div>
    `;
    
    // 모달이 열리면 현재 사용자가 찜했는지 검사
    checkLikeStatus(p.id);
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

let currentQuoteProductId = null;
function requestQuote(id) {
    if(!currentUser) {
        alert('견적서 요청은 로그인이 필요합니다.');
        showPage('login');
        return;
    }
    currentQuoteProductId = id;
    document.getElementById('quote-modal').style.display = 'flex';
}

function submitQuoteRequest() {
    alert('해마 벤더 시스템으로 견적 요청이 성공적으로 접수되었습니다.\\n빠른 시일 내에 선박의 메일/시스템으로 견적서가 도착합니다!');
    document.getElementById('quote-modal').style.display = 'none';
}

async function submitBid(id) {
    if(!currentUser) {
        alert("경매 입찰은 로그인이 필요합니다.");
        showPage('login');
        return;
    }

    const p = products.find(x => String(x.id) === String(id));
    if(!p) return;
    
    if(p.is_closed) {
        alert("이미 마감된 경매입니다.");
        return;
    }
    
    if(p.seller_id === currentUser.id) {
        alert("당사자의 매물에는 입찰할 수 없습니다.");
        return;
    }
    
    const bidInput = document.getElementById('bid-amount');
    const newBidStr = bidInput ? bidInput.value : null;
    if(!newBidStr) {
        alert("입찰 희망가를 입력해주세요.");
        return;
    }
    
    const newBid = parseInt(newBidStr, 10);
    const curr = p.current_bid || parseInt(p.price.replace(/[^0-9]/g, '')) || 0;
    
    if(newBid <= curr) {
        alert(`현재 최고가(₩${curr.toLocaleString()})보다 높은 금액을 입력하셔야 합니다.`);
        return;
    }

    const count = p.bid_count || 0;
    
    const bidderName = currentUser.user_metadata?.biz_name || currentUser.user_metadata?.display_name || currentUser.email.split('@')[0];
    
    const btn = document.querySelector('.auction-bid-btn');
    if(btn) btn.textContent = '입찰 처리중...';
    
    const { error } = await supabaseClient.from('haema_products')
        .update({ 
            current_bid: newBid, 
            bid_count: count + 1,
            highest_bidder_id: currentUser.id,
            highest_bidder_name: bidderName
        })
        .eq('id', id);
        
    if(error) {
        console.error(error);
        alert('입찰 중 오류가 발생했습니다: ' + error.message);
        if(btn) btn.textContent = '입찰';
        return;
    }
    
    alert('성공적으로 입찰되었습니다!');
    closeProductModal();
    initTopCategory();
    fetchProducts();
}


// 서버에서 매물 불러오기
async function fetchProducts() {
    const { data, error } = await supabaseClient.from('haema_products').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('Supabase load error:', error);
        return;
    }
    
    products = data || [];
    renderProducts();
}

async function closeAuction(p) {
    if(p.is_closed) return;
    
    // DB 업데이트 시도 (Atomic)
    const { error } = await supabaseClient.from('haema_products')
        .update({ is_closed: true })
        .eq('id', p.id)
        .eq('is_closed', false);
        
    if(!error) {
        p.is_closed = true; // 로컬 반영
        if (currentUser && currentUser.id === p.highest_bidder_id) {
            alert(`🎉 축하합니다! [${p.title}] 경매에 최종 낙찰되셨습니다!\\n(낙찰가: ₩ ${p.current_bid ? p.current_bid.toLocaleString() : '확인 불가'})`);
        }
        else if (currentUser && currentUser.id === p.seller_id) {
            alert(`🔔 등록하신 [${p.title}] 경매가 마감되었습니다.\\n(최종 입찰자: ${p.highest_bidder_name})`);
        }
        initTopCategory();
    fetchProducts(); // 리스트 갱신
        closeProductModal(); // 열려있다면 닫기
    }
}

// 5초 주기로 모든 매물의 마감 시간을 체크하여 셔터를 닫는 감시자
setInterval(() => {
    const now = new Date().getTime();
    products.forEach(p => {
        if(p.auction && !p.is_closed && p.auction_end) {
            const end = new Date(p.auction_end).getTime();
            if(now >= end) {
                closeAuction(p);
            }
        }
    });
}, 5000);


// 판매자 실 DB 매물 등록
async function registerProduct() {
  const cat = document.querySelector('#page-register .form-select').value;
  const title = document.getElementById('title-input').value;
  let tradeType = '직거래';
  document.querySelectorAll('#page-register .trade-chip').forEach(c => {
      if(c.classList.contains('on')) tradeType = c.textContent.trim();
  });
  
  let conditionStr = '최상';
  document.querySelectorAll('#page-register .cond-chip').forEach(c => {
      if(c.classList.contains('on')) conditionStr = c.textContent.trim();
  });

  const priceInput = document.getElementById('price-input').value || '';
  const priceParsed = parseInt(priceInput.replace(/[^0-9]/g, '')) || 0;
  
  const regionInput = document.getElementById('region-input');
  const regionVal = regionInput ? regionInput.value : '부산';
  
  if (!title || cat === '카테고리 선택') { alert('상품명과 카테고리는 필수입니다.'); return; }
  
  const isAuction = tradeType === '경매';
  const endInput = document.getElementById('auction-end-input').value;
  if(isAuction && !endInput) { alert('경매 마감일시를 설정해주세요.'); return; }

  const submitBtn = document.querySelector('#page-register .submit-btn');
  submitBtn.textContent = '저장소 연결 중...';
  submitBtn.disabled = true;

  let finalImageUrl = null;
  
  if (uploadedBlob) {
      submitBtn.textContent = '사진 클라우드 업로드 중...';
      const fileName = `public/product_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('market_images')
          .upload(fileName, uploadedBlob, {
              contentType: 'image/jpeg'
          });
          
      if (uploadError) {
          alert('사진 업로드 실패 (버킷이 Public 상태인지 확인해주세요): ' + uploadError.message);
          submitBtn.textContent = '등록하기';
          submitBtn.disabled = false;
          return;
      }
      
      const { data: publicData } = supabaseClient.storage.from('market_images').getPublicUrl(fileName);
      finalImageUrl = publicData.publicUrl;
  }
  
  let finalSvg = finalImageUrl ? `<img src="${finalImageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">` : '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="20" width="32" height="18" rx="3" stroke="#D4960A" stroke-width="1.5"/><path d="M14 20v-4a10 10 0 0120 0v4" stroke="#D4960A" stroke-width="1.5"/></svg>';

  let newProd = {
    title: title,
    sub: '방금 전 등록',
    price: priceInput ? ('₩ ' + priceInput.replace('₩','').trim()) : '₩ 협의 가능',
    category: cat,
    "tradeType": tradeType,
    region: regionVal, // 사용자 선택
    seller_id: currentUser ? currentUser.id : null,
    condition: conditionStr,
    cert: '없음',
    auth: true, 
    auction: isAuction,
    offer: false,
    svg: finalSvg
  };

  if(isAuction) {
      newProd.auction_end = new Date(endInput).toISOString();
      newProd.current_bid = priceParsed;
      newProd.bid_count = 0;
  }

  const { error } = await supabaseClient.from('haema_products').insert([newProd]);
  
  submitBtn.textContent = '등록하기';
  submitBtn.disabled = false;

  if (error) {
     alert('등록 중 에러가 발생했습니다: ' + error.message);
     return;
  }

  // 폼 초기화
  document.getElementById('title-input').value = '';
  document.getElementById('price-input').value = '';
  document.getElementById('photo-upload-input').value = '';
  uploadedBase64 = null;
  uploadedBlob = null;
  const mainBox = document.getElementById('photo-box-main');
  if(mainBox) {
      mainBox.style.backgroundImage = 'none';
      mainBox.innerHTML = '<span class="photo-plus">+</span><span class="photo-main-label">대표사진</span>';
  }
  
  alert('매물이 성공적으로 등록되었습니다! 🚀\n(하단 경매 탭에서도 바로 확인하실 수 있습니다.)');
  
  filterState.category = '전체';
  renderSubCategories(filterState.topCategory);
  resetFilters();
  showPage('home');
  window.scrollTo(0, 0);

  // 등록 직후 최신 데이터베이스 리스트 가져오기
  await fetchProducts();
}
// --- 장바구니 기능 시작 ---
function addToCart(productId) {
    const existingIndex = userCart.findIndex(item => String(item.id) === String(productId));
    if (existingIndex > -1) {
        userCart[existingIndex].qty += 1;
    } else {
        userCart.push({ id: productId, qty: 1 });
    }
    saveCart();
    alert('🛒 장바구니에 담겼습니다.');
}

function saveCart() {
    localStorage.setItem('haema_cart', JSON.stringify(userCart));
    renderCartBadge();
}

function renderCartBadge() {
    const badge = document.getElementById('header-cart-badge');
    if(!badge) return;
    const totalQty = userCart.reduce((sum, item) => sum + item.qty, 0);
    if(totalQty > 0) {
        badge.style.display = 'flex';
        badge.textContent = totalQty;
    } else {
        badge.style.display = 'none';
    }
}

window.renderCartPage = function() {
    const area = document.getElementById('cart-content-area');
    const totalCountEl = document.getElementById('cart-total-count');
    if(!area) return;
    
    if(userCart.length === 0) {
        area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">장바구니가 비어있습니다.</div>';
        if(totalCountEl) totalCountEl.textContent = '0개';
        return;
    }
    
    // Group by supplier
    const groups = {};
    let totalItems = 0;
    
    userCart.forEach(cartItem => {
        const product = products.find(p => String(p.id) === String(cartItem.id));
        if(!product) return;
        
        const storeMatch = (product.title||'').match(/^\\[(.*?)\\]/);
        const storeName = storeMatch ? storeMatch[1] : '일반 업체';
        
        if(!groups[storeName]) groups[storeName] = [];
        groups[storeName].push({ cartItem, product });
        totalItems += cartItem.qty;
    });
    
    if(totalCountEl) totalCountEl.textContent = totalItems + '개';
    
    let html = '';
    for(const [storeName, items] of Object.entries(groups)) {
        html += `
            <div style="background:#fff; border-radius:16px; padding:16px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.03); border:1px solid #eaedf2;">
                <div style="font-size:14px; font-weight:800; color:#1A2B4A; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#1A2B4A" stroke-width="2"/><path d="M12 12v6m-4-6v6m8-6v6" stroke="#1A2B4A" stroke-width="2"/></svg>
                    [${storeName}] 배송
                </div>
        `;
        
        items.forEach(obj => {
            const p = obj.product;
            const c = obj.cartItem;
            const displayPrice = p.price.replace(/[^0-9]/g, '');
            html += `
                <div style="display:flex; gap:12px; padding:12px 0; border-top:1px solid #f4f9ff;">
                    <div style="width:60px; height:60px; border-radius:8px; background:#f4f9ff url('${p.image_url}') center/cover;"></div>
                    <div style="flex:1;">
                        <div style="font-size:13px; color:#1A2B4A; font-weight:600; line-height:1.4; margin-bottom:4px;">${p.title}</div>
                        <div style="font-size:14px; font-weight:800; color:#1A5FA0;">₩ ${parseInt(displayPrice||0).toLocaleString()}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; justify-content:space-between;">
                        <button onclick="removeCartItem('${p.id}')" style="background:none; border:none; color:#999; font-size:16px; cursor:pointer; padding:0;">✕</button>
                        <div style="display:flex; align-items:center; border:1px solid #eaedf2; border-radius:4px; overflow:hidden;">
                            <button onclick="updateCartQty('${p.id}', -1)" style="width:24px; height:24px; background:#fff; border:none; color:#1A2B4A; cursor:pointer;">-</button>
                            <div style="width:30px; text-align:center; font-size:12px; font-weight:700; line-height:24px;">${c.qty}</div>
                            <button onclick="updateCartQty('${p.id}', 1)" style="width:24px; height:24px; background:#fff; border:none; color:#1A2B4A; cursor:pointer;">+</button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    area.innerHTML = html;
}

window.updateCartQty = function(id, delta) {
    const idx = userCart.findIndex(item => String(item.id) === String(id));
    if(idx > -1) {
        userCart[idx].qty += delta;
        if(userCart[idx].qty <= 0) userCart.splice(idx, 1);
        saveCart();
        renderCartPage();
    }
}

window.removeCartItem = function(id) {
    const idx = userCart.findIndex(item => String(item.id) === String(id));
    if(idx > -1) {
        userCart.splice(idx, 1);
        saveCart();
        renderCartPage();
    }
}

window.requestQuoteCheckout = async function() {
    if(userCart.length === 0) {
        alert('장바구니가 비어있습니다.');
        return;
    }
    if (!currentUser) {
        alert('견적서를 발주하시려면 로그인이 필요합니다.');
        showPage('login');
        return;
    }

    // 업체(Vendor)별로 물건을 묶기
    const groups = {};
    userCart.forEach(cartItem => {
        const product = products.find(p => String(p.id) === String(cartItem.id));
        if(!product) return;
        
        const storeMatch = (product.title||'').match(/^\[(.*?)\]/);
        const storeName = storeMatch ? storeMatch[1] : '일반 업체';
        
        if(!groups[storeName]) groups[storeName] = [];
        groups[storeName].push({
            product_id: product.id,
            title: product.title,
            qty: cartItem.qty,
            price: product.price
        });
    });

    const quotesToInsert = [];
    for(const [storeName, itemsData] of Object.entries(groups)) {
        quotesToInsert.push({
            buyer_id: currentUser.id,
            vendor_name: storeName,
            items: itemsData,
            status: 'pending'
        });
    }

    try {
        const { error } = await supabaseClient.from('haema_quotes').insert(quotesToInsert);
        if (error) throw error;

        alert('✅ 성공적으로 견적 요청이 접수되었습니다.');
        userCart = [];
        saveCart();
        renderCartPage();
        showPage('home');
    } catch (err) {
        if (err.message.includes('relation "public.haema_quotes" does not exist')) {
            alert('⚠️ 에러: DB에 [haema_quotes] 테이블이 아직 생성되지 않았습니다. 관리자에게 문의하세요.');
        } else {
            alert('견적 요청 중 오류가 발생했습니다: ' + err.message);
        }
    }
}
// --- 장바구니 기능 끝 ---

document.addEventListener('DOMContentLoaded', () => {
    renderCartBadge();
    initTopCategory();
    fetchProducts();
    updateFilterStyles();

    // 키워드 라이브 검색 (디바운스 최적화 도입 - 메모리 절약)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                filterState.keyword = e.target.value.trim();
                const activePage = document.querySelector('.page.active');
                if (activePage && activePage.id === 'page-community') {
                    renderCommunityPosts();
                } else {
                    renderProducts();
                }
            }, 250); // 250ms 대기 후 렌더링 호출
        });
    }

    // 삭제된 글로벌 이벤트 바인딩 (이제 renderSubCategories안에서 각각 바인딩됨)

    // 드롭다운 토글 매니저
    document.querySelectorAll('.filter-dropdown').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = 'panel-' + btn.getAttribute('data-target');
            const isActive = btn.classList.contains('open');

            // 모두 초기화 (접기)
            document.querySelectorAll('.filter-dropdown').forEach(b => b.classList.remove('open'));
            document.querySelectorAll('.filter-panel').forEach(p => p.classList.remove('show'));
            
            // 토글 로직
            if (!isActive) {
                btn.classList.add('open');
                document.getElementById(targetId).classList.add('show');
                document.querySelector('.filter-panels').classList.add('show');
            } else {
                document.querySelector('.filter-panels').classList.remove('show');
            }
        });
    });

    // 초기화 버튼
    const resetBtn = document.querySelector('.filter-reset');
    if(resetBtn) resetBtn.addEventListener('click', resetFilters);

    // 이벤트 리스너 등록 시 사용할 tradeChips (Registration Form 용)
    const formTradeChips = document.querySelectorAll('#page-register .trade-chip');
    
    // 거래 방식 칩 로직
    formTradeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            formTradeChips.forEach(c => c.classList.remove('on'));
            chip.classList.add('on');
            
            const isAuction = chip.textContent.trim() === '경매';
            document.getElementById('auction-date-row').style.display = isAuction ? 'block' : 'none';
            document.getElementById('price-label').innerHTML = isAuction ? '경매 시작가<span>*</span>' : '판매 희망가<span>*</span>';
        });
    });

    // 매물 상태 칩
    const condChips = document.querySelectorAll('#page-register .cond-chip');
    condChips.forEach(chip => {
        chip.addEventListener('click', () => {
            condChips.forEach(c => c.classList.remove('on'));
            chip.classList.add('on');
        });
    });
    
    // 서브 칩 상호작용 (필터)
    document.querySelectorAll('.f-sub-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const key = chip.getAttribute('data-key');
            const val = chip.getAttribute('data-val');
            applySubFilter(key, val);
        });
    });
    
    // 가격 범위 지정(Price Filter) 적용
    const priceApplyBtn = document.getElementById('price-apply');
    if(priceApplyBtn) {
        priceApplyBtn.addEventListener('click', () => {
            const minVal = document.getElementById('min-price').value;
            const maxVal = document.getElementById('max-price').value;
            filterState.minPrice = minVal ? parseInt(minVal, 10) : null;
            filterState.maxPrice = maxVal ? parseInt(maxVal, 10) : null;
            updateFilterStyles();
            renderProducts();
            
            // 시각적 피드백
            priceApplyBtn.textContent = '적용됨✓';
            priceApplyBtn.style.background = '#1E8E3E';
            setTimeout(() => {
                priceApplyBtn.textContent = '범위 적용';
                priceApplyBtn.style.background = 'var(--blue-800)';
            }, 1000);
        });
    }
    
        // 매물 사진 업로드 (Base64 변환)
    const photoInput = document.getElementById('photo-upload-input');
    if(photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(!file) return;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 400;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    uploadedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                    canvas.toBlob((blob) => {
                        uploadedBlob = blob;
                    }, 'image/jpeg', 0.8);
                    
                    const mainBox = document.getElementById('photo-box-main');
                    mainBox.style.backgroundImage = `url(${uploadedBase64})`;
                    mainBox.innerHTML = '';
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // 매물 등록 버튼 리스너
    const submitBtn = document.querySelector('#page-register .submit-btn');
    if(submitBtn) {
        submitBtn.addEventListener('click', registerProduct);
    }
});

// ==== 실시간 채팅 로직 ====
let currentChatProduct = null;
let currentChatSubscription = null;




// ==== 내가 올린 매물 (판매 목록) 로직 ====
// ==== 커뮤니티 탭 렌더링 로직 ====
window.renderCommunityPosts = async function() {
    const area = document.getElementById('community-content-area');
    if(!area) return;
    
    area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">게시글을 불러오는 중입니다...</div>';

    const { data: posts, error } = await supabaseClient
        .from('haema_posts')
        .select('*')
        .order('created_at', { ascending: false });
        
    if(error) {
        area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:red; text-align:center;">게시글을 불러오지 못했습니다.</div>';
        return;
    }
    
    if(!posts || posts.length === 0) {
        area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">등록된 커뮤니티 글이 없습니다.</div>';
        return;
    }

    let filteredPosts = posts;
    if (filterState.keyword) {
        const kw = filterState.keyword.toLowerCase();
        filteredPosts = posts.filter(p => p.title.toLowerCase().includes(kw) || p.content.toLowerCase().includes(kw));
    }
    
    if (window.currentCommTag && window.currentCommTag !== '전체') {
        filteredPosts = filteredPosts.filter(p => p.tag === window.currentCommTag);
    }

    if (filteredPosts.length === 0) {
        area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">검색된 게시글이 없습니다.</div>';
        return;
    }

    let html = '';
    filteredPosts.forEach(post => {
        html += `
            <div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid #eaedf2; box-shadow:0 2px 4px rgba(0,0,0,0.02); cursor:pointer;" onclick="openPostDetail('${post.id}')">
                <div style="display:inline-block; font-size:11px; font-weight:800; background:${post.tag_bg}; color:${post.tag_color}; padding:4px 8px; border-radius:6px; margin-bottom:8px;">
                    ${post.tag}
                </div>
                <div style="font-size:15px; font-weight:700; color:#1A2B4A; margin-bottom:6px; line-height:1.4;">
                    ${post.title}
                </div>
                <div style="font-size:13px; color:#4A5568; line-height:1.5; margin-bottom:12px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                    ${post.content}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#7A93B0;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-weight:700; color:#1A2B4A;">${post.author_name}</span>
                        <span style="font-size:10px; background:#EAEDF2; padding:2px 6px; border-radius:4px;">${post.author_role}</span>
                        <span>· 방금 전</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="display:flex; align-items:center; gap:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" stroke-width="2"/></svg>${post.views || 0}</span>
                        <span style="display:flex; align-items:center; gap:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="2"/></svg>${post.comments_count || 0}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    area.innerHTML = html;
}

window.showMyQuotes = async function() {
    if(!currentUser) {
        alert('로그인이 필요한 기능입니다.');
        return showPage('login');
    }
    
    showPage('myquotes');
    const area = document.getElementById('myquotes-content-area');
    area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">목록을 불러오는 중입니다...</div>';

    try {
        const { data, error } = await supabaseClient
            .from('haema_quotes')
            .select('*')
            .eq('buyer_id', currentUser.id)
            .order('created_at', { ascending: false });
            
        if(error) throw error;

        if(!data || data.length === 0) {
            area.innerHTML = `
                <div style="padding: 80px 20px; text-align:center;">
                    <div style="font-size:48px; margin-bottom:16px;">📂</div>
                    <div style="font-size:16px; font-weight:700; color:#1A2B4A; margin-bottom:8px;">요청한 견적 내역이 없습니다</div>
                    <div style="font-size:14px; color:#7A93B0;">장바구니를 통해 업체를 묶어서<br>편리하게 견적을 요청해 보세요.</div>
                </div>
            `;
            return;
        }

        let html = '';
        data.forEach(q => {
            const dateObj = new Date(q.created_at);
            const dateStr = dateObj.toLocaleDateString('ko-KR') + ' ' + dateObj.toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'});
            
            let statusText = '결제/견적 대기중';
            let statusColor = '#F57C00';
            let statusBg = '#FFF3E0';
            if(q.status === 'replied') {
                statusText = '답변 완료 (승인)';
                statusColor = '#1E8E3E';
                statusBg = '#E8F5E9';
            } else if(q.status === 'completed') {
                statusText = '계약/결제 완료';
                statusColor = '#1A5FA0';
                statusBg = '#F4F9FF';
            }

            // items summary
            let itemSummary = '상품 내용 없음';
            if(q.items && q.items.length > 0) {
                const firstTitle = q.items[0].title;
                const totalQty = q.items.reduce((acc, curr) => acc + (curr.qty || 1), 0);
                if(q.items.length === 1) {
                    itemSummary = `${firstTitle} (${totalQty}개)`;
                } else {
                    itemSummary = `${firstTitle} 외 ${q.items.length - 1}건 (총 ${totalQty}개)`;
                }
            }

            html += `
                <div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid #eaedf2; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div>
                            <div style="font-size:12px; color:#7A93B0; margin-bottom:4px;">${dateStr} 발주</div>
                            <div style="font-size:15px; font-weight:800; color:#1A2B4A; display:flex; align-items:center; gap:4px;">
                                🏢 [${q.vendor_name}]
                            </div>
                        </div>
                        <div style="font-size:11px; font-weight:800; background:${statusBg}; color:${statusColor}; padding:4px 8px; border-radius:6px;">
                            ${statusText}
                        </div>
                    </div>
                    
                    <div style="background:#f8f9fc; border-radius:8px; padding:12px; display:flex; align-items:center; justify-content:space-between;">
                        <div>
                            <div style="font-size:13px; font-weight:600; color:#4A5568; line-height:1.4;">
                                ${itemSummary}
                            </div>
                        </div>
                        <button style="background:#fff; border:1px solid #eaedf2; border-radius:6px; padding:6px 10px; font-size:12px; font-weight:700; color:#1A5FA0; cursor:pointer;" onclick="alert('품목 상세 내역 확인 기능은 추후 연동됩니다.')">상세보기</button>
                    </div>
                </div>
            `;
        });
        
        area.innerHTML = html;

    } catch(err) {
        area.innerHTML = `<div style="padding: 60px 20px; font-size:14px; color:#D32F2F; text-align:center;">오류가 발생했습니다:<br>${err.message}</div>`;
    }
}

function showMyList() {
    if(!currentUser) {
        alert("로그인이 필요한 기능입니다.");
        showPage('login');
        return;
    }
    
    showPage('mylist');
    
    const myProducts = products.filter(p => p.seller_id === currentUser.id);
    const container = document.getElementById('mylist-grid');
    
    if(!container) return;
    container.innerHTML = '';
    
    if(myProducts.length === 0) {
        container.innerHTML = `
            <div style="grid-column: span 3; text-align:center; padding: 60px 20px; color:#aaa; font-size:14px; display:flex; flex-direction:column; align-items:center;">
                <div style="font-size:32px; margin-bottom:12px;">🛳️</div>
                <div>아직 등록하신 판매 매물이 없습니다.</div>
                <div style="margin-top:16px;">
                    <button onclick="requireAuthAndShow('register')" style="padding: 10px 20px; background:var(--blue-50); color:var(--blue-800); border:1px solid var(--blue-200); border-radius:8px; cursor:pointer; font-weight:700;">첫 판매글 작성하기</button>
                </div>
            </div>`;
        return;
    }
    
    myProducts.forEach((p, idx) => {
        const adNum = idx + 1;
        
        let tagsHtml = '';
        if(p.auction) {
            tagsHtml += `<span class="ptag ptag-y" style="background:#1A2B4A; color:#fff;">경매 ${p.bid_count}회</span> `;
        }
        if(p.offer) tagsHtml += `<span class="ptag ptag-b">가격제안</span> `;
        if(!p.auction && !p.offer) tagsHtml += `<span class="ptag" style="background:#EAEDF2; color:#7A93B0;">직거래</span> `;

        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.cursor = 'pointer';
        card.onclick = () => openProductModal(p.id);
        
        card.innerHTML = `
          <div class="product-img">${p.svg}</div>
          <div class="product-body">
            <div class="product-sub">${p.region} · ${p.condition}</div>
            <div class="product-title">${p.title}</div>
            <div class="product-price">${p.price}</div>
            <div class="product-tags">${tagsHtml}</div>
          </div>
        `;
        container.appendChild(card);
    });
}


// ==== 프로필 UI 자동 렌더링 ====
function updateProfileUI() {
    if(!currentUser) {
        const pName = document.getElementById('profile-name');
        if(pName) pName.textContent = "로그인 해주세요";
        const pEmail = document.getElementById('profile-email');
        if(pEmail) pEmail.textContent = "";
        const pAv = document.getElementById('profile-avatar');
        if(pAv) pAv.textContent = "👤";
        const rBadge = document.getElementById('profile-region-badge');
        if(rBadge) rBadge.style.display = 'none';
        return;
    }
    
    const email = currentUser.email;
    const metaName = currentUser.user_metadata?.display_name;
    const metaBio = currentUser.user_metadata?.bio;
    const metaRegion = currentUser.user_metadata?.region;
    const isVerified = currentUser.user_metadata?.is_region_verified;
    
    const nameStr = metaName ? metaName : email.split('@')[0];
    const firstChar = nameStr.charAt(0).toUpperCase();
    
    const pName = document.getElementById('profile-name');
    if(pName) pName.textContent = nameStr; 
    
    const pEmail = document.getElementById('profile-email');
    if(pEmail) pEmail.textContent = metaBio ? metaBio : email;
    
    const sEmail = document.getElementById('settings-email');
    if(sEmail) sEmail.textContent = email;
    
    const pAv = document.getElementById('profile-avatar');
    if(pAv) pAv.textContent = firstChar;
    
    const rBadge = document.getElementById('profile-region-badge');
    if(rBadge) {
        rBadge.style.display = 'inline-flex';
        if(metaRegion && isVerified) {
            rBadge.textContent = metaRegion + " (인증됨)";
            rBadge.style.background = "#E6F4EA";
            rBadge.style.color = "#1E8E3E";
        } else if(metaRegion) {
            rBadge.textContent = metaRegion + " (미인증)";
            rBadge.style.background = "#FFFBEA";
            rBadge.style.color = "#D4960A";
        } else {
            rBadge.textContent = "지역 미설정";
            rBadge.style.background = "#EAEDF2";
            rBadge.style.color = "#7A93B0";
        }
    }
    
    // 사업자 뱃지 연동
    const isBiz = currentUser.user_metadata?.is_business;
    const bBadge = document.getElementById('profile-biz-badge');
    const bStatus = document.getElementById('biz-auth-status');
    if(bBadge) {
        if(isBiz) {
            bBadge.textContent = "🏢 신뢰 기업";
            bBadge.style.background = "var(--blue-600)";
            bBadge.style.color = "white";
            bBadge.style.border = "none";
            if(bStatus) bStatus.style.display = "inline-block";
        } else {
            bBadge.textContent = "일반 회원";
            bBadge.style.background = "#EAEDF2";
            bBadge.style.color = "#7A93B0";
            if(bStatus) bStatus.style.display = "none";
        }
    }

    // 매너온도 비동기 로드
    fetchAndRenderMannerTemp();
}

let _mannerTempLoaded = false;

async function fetchAndRenderMannerTemp() {
    if(!currentUser) return;
    if(_mannerTempLoaded) return;
    _mannerTempLoaded = true;
    
    const { data, error } = await supabaseClient
        .from('haema_reviews')
        .select('score')
        .eq('reviewee_id', currentUser.id);
        
    let baseScore = 5.0; // Starts at 5.0
    if(data && !error) {
        let sum = 0;
        data.forEach(r => sum += (r.score * 0.5)); // +1 is +0.5, -1 is -0.5
        baseScore += sum;
    }
    
    if(baseScore < 0) baseScore = 0;
    if(baseScore > 5.0) baseScore = 5.0;
    
    const txt = document.getElementById('user-rating-text');
    const starsContainer = document.getElementById('user-rating-stars');
    if(txt) txt.textContent = baseScore.toFixed(1);
    
    if(starsContainer) {
        const starCount = Math.round(baseScore);
        const svgPath = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
        let starsHtml = '';
        for(let i=1; i<=5; i++) {
            let color = i <= starCount ? '#F5C518' : '#EAEDF2';
            starsHtml += `<svg width="20" height="20" viewBox="0 0 24 24" fill="${color}"><path d="${svgPath}"/></svg>`;
        }
        starsContainer.innerHTML = starsHtml;
    }
}


// ==== 프로필 관련 동작 ====
function openProfileEdit() {
    if(!currentUser) return;
    showPage('profile-edit');
    
    // 리셋
    tempVerifiedRegion = null;
    const btn = document.getElementById('btn-gps-verify');
    btn.textContent = "내 위치 검증";
    btn.style.background = "#F4F9FF";
    btn.style.color = "#1A5FA0";
    btn.style.borderColor = "#1A5FA0";
    btn.disabled = false;
    
    const metaName = currentUser.user_metadata?.display_name;
    const metaBio = currentUser.user_metadata?.bio || '';
    const metaRegion = currentUser.user_metadata?.region || '';
    const isVerified = currentUser.user_metadata?.is_region_verified || false;
    
    const nameStr = metaName ? metaName : currentUser.email.split('@')[0];
    
    const nameInput = document.getElementById('edit-nickname-input');
    const bioInput = document.getElementById('edit-bio-input');
    const regionSelector = document.getElementById('edit-region-select');
    
    nameInput.value = nameStr;
    if(bioInput) bioInput.value = metaBio;
    if(regionSelector) {
        regionSelector.value = metaRegion;
        regionSelector.disabled = false;
        if(metaRegion && isVerified) {
            // 이미 이전에 인증한 기록이 있다면
            tempVerifiedRegion = metaRegion;
            regionSelector.disabled = true;
            btn.textContent = "✓ 기인증 지역";
            btn.style.background = "#E6F4EA";
            btn.style.color = "#1E8E3E";
            btn.style.borderColor = "#1E8E3E";
        }
    }
    
    if(metaName) {
        nameInput.disabled = true;
        nameInput.style.backgroundColor = '#EAEDF2';
        nameInput.style.color = '#7A93B0';
    } else {
        nameInput.disabled = false;
        nameInput.style.backgroundColor = '#fff';
        nameInput.style.color = '#1A2B4A';
    }
    
    document.getElementById('edit-avatar-preview').textContent = nameStr.charAt(0).toUpperCase();
}

async function saveProfile() {
    const btn = document.querySelector('#page-profile-edit .submit-btn');
    const nameInput = document.getElementById('edit-nickname-input');
    const bioInput = document.getElementById('edit-bio-input');
    const regionSelector = document.getElementById('edit-region-select');
    
    const inputName = nameInput.value.trim();
    const inputBio = bioInput ? bioInput.value.trim() : '';
    const selectedRegion = regionSelector ? regionSelector.value : '';
    
    if(!nameInput.disabled && !inputName) {
        alert('닉네임을 먼저 입력해주세요.');
        return;
    }
    
    btn.textContent = '메타데이터 굽는 중...';
    btn.disabled = true;
    
    let isVeri = (tempVerifiedRegion !== null && tempVerifiedRegion === selectedRegion);
    if(selectedRegion && !isVeri) {
        // 지역을 골랐는데 인증버튼을 안눌렀거나 실패한 경우, 일단 저장은 하되 미인증 상태로 기록
        isVeri = false;
    }
    
    let updatePayload = { 
        bio: inputBio,
        region: selectedRegion,
        is_region_verified: isVeri
    };
    
    if(!nameInput.disabled) {
        updatePayload.display_name = inputName;
    }
    
    const { data, error } = await supabaseClient.auth.updateUser({
        data: updatePayload
    });
    
    btn.disabled = false;
    btn.textContent = '저장하고 돌아가기';
    
    if(error) {
        console.error("Profile save error:", error);
        alert('프로필 변경 중 오류가 발생했습니다.');
    } else {
        // 성공 시 세션 즉각 동기화 및 뒤로가기
        currentUser = data.user;
        updateProfileUI();
        showPage('mypage');
    }
}


// ==== 위치 인증 로직 ====
let tempVerifiedRegion = null;

async function verifyGPSLocation() {
    const selector = document.getElementById('edit-region-select');
    const selectedRegion = selector.value;
    const btn = document.getElementById('btn-gps-verify');
    
    if(!selectedRegion) {
        alert("원하시는 활동 지역(시/도)을 우선 선택해주세요.");
        return;
    }
    
    if (!navigator.geolocation) {
        alert("접속하신 기기 또는 브라우저가 위치 스캔 기능을 지원하지 않습니다.");
        return;
    }
    
    btn.textContent = "위치 스캔 중...";
    btn.disabled = true;
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        try {
            // 무료 Reverse Geocoding API 체인 호출
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`);
            const data = await response.json();
            
            // principalSubdivision : "서울특별시", "경기도", "부산광역시" 등 추출
            const geoRegion = data.principalSubdivision || data.city || "";
            
            let isMatch = false;
            if(geoRegion.includes(selectedRegion)) {
                isMatch = true;
            } else {
                // 단축어 안전장치
                const shortcuts = {
                    "경기": "경기도", "강원": "강원", "충북": "충청북도", "충남": "충청남도",
                    "전북": "전라북도", "전남": "전라남도", "경북": "경상북도", "경남": "경상남도", "제주": "제주"
                };
                if(shortcuts[selectedRegion] && geoRegion.includes(shortcuts[selectedRegion])) {
                    isMatch = true;
                }
            }
            
            if(isMatch) {
                alert(`현재 접속 위치가 [${geoRegion}]로 확인되었습니다.`);
                tempVerifiedRegion = selectedRegion;
                btn.textContent = "위치 확인 완료";
                btn.style.background = "#E6F4EA";
                btn.style.color = "#1E8E3E";
                btn.style.borderColor = "#1E8E3E";
                selector.disabled = true; // 락킹
            } else {
                alert(`선택 지역(${selectedRegion})과 현재 위치(${geoRegion})가 다릅니다.`);
                btn.textContent = "다시 인증하기";
                btn.disabled = false;
            }
        } catch(e) {
            alert("서버와 통신 중 오류가 발생했습니다. 잠시 후 시도해주세요.");
            btn.textContent = "📍 위치 재검증";
            btn.disabled = false;
        }
    }, (error) => {
        alert("위치 정보를 가져올 수 없습니다. 기기의 위치 권한을 허용해주세요.");
        btn.textContent = "📍 위치 권한 재요청";
        btn.disabled = false;
    });
}


// ==== 사업자 인증 로직 ====
function openBusinessAuth() {
    showPage('business-auth');
    if(!currentUser) return;
    
    const isBiz = currentUser.user_metadata?.is_business;
    const bizNum = currentUser.user_metadata?.biz_number;
    const bizName = currentUser.user_metadata?.biz_name;
    
    const formBox = document.getElementById('biz-auth-form');
    const authDesc = document.getElementById('biz-auth-desc');
    const verifiedBox = document.getElementById('biz-auth-verified');
    const numDisplay = document.getElementById('biz-verified-number');
    const nameDisplay = document.getElementById('biz-verified-name');
    
    if(isBiz && bizNum) {
        if(formBox) formBox.style.display = 'none';
        if(authDesc) authDesc.style.display = 'none';
        if(verifiedBox) verifiedBox.style.display = 'block';
        if(nameDisplay) nameDisplay.textContent = bizName ? bizName : "인증된 해마마켓 기업";
        if(numDisplay) {
            // 안심 마스킹 처리 (예: 123-45-67890 -> 123-45-***** )
            const raw = bizNum.replace(/[^0-9]/g, '');
            if(raw.length === 10) numDisplay.textContent = raw.substring(0,3) + "-" + raw.substring(3,5) + "-*****";
            else numDisplay.textContent = bizNum;
        }
    } else {
        if(formBox) formBox.style.display = 'block';
        if(authDesc) authDesc.style.display = 'block';
        if(verifiedBox) verifiedBox.style.display = 'none';
    }
}

async function submitBusinessAuth() {
    if(!currentUser) return;
    
    const nameEl = document.getElementById('biz-name-input');
    const inputEl = document.getElementById('biz-number-input');
    const nameVal = nameEl ? nameEl.value.trim() : "";
    const val = inputEl.value.trim();
    
    if(!nameVal) {
        alert("국세청 검증을 위해 상호명(기업명)을 먼저 입력해주세요.");
        return;
    }
    
    if(val.length !== 10) {
        alert("하이픈(-)을 분리한 온전한 10자리 사업자등록번호를 입력해주세요.");
        return;
    }
    
    const btn = document.querySelector('#page-business-auth .submit-btn');
    btn.textContent = "국세청 Live DB 조회 중...";
    btn.disabled = true;
    
    try {
        const apiKey = "1fab7ffc37b6751c35449bc0179057e847708d7b1517791217a048566c385380";
        const response = await fetch(`https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ "b_no": [ val ] })
        });
        
        const result = await response.json();
        
        if(result && result.data && result.data.length > 0) {
            const bizData = result.data[0];
            
            // 01: 계속사업자, 02: 휴업자, 03: 폐업자
            if(bizData.b_stt_cd === "01") { 
                // DB 업데이트 성공
                const { data, error } = await supabaseClient.auth.updateUser({
                    data: { is_business: true, biz_number: val, biz_name: nameVal }
                });
                
                if(error) throw new Error("서버 프로필 업데이트 에러");
                
                alert('사업자 인증 성공!');
                currentUser = data.user;
                updateProfileUI(); // Reload UI
                showPage('mypage');
                if(inputEl) inputEl.value = "";
                if(nameEl) nameEl.value = "";
            } else if (bizData.b_stt_cd === "02" || bizData.b_stt_cd === "03") {
                alert(`❌ 인증 거부: 현재 국세청에 [${bizData.b_stt}] 상태로 조회되어 거래 인증이 불가합니다.`);
            } else {
                alert(`❌ 인증 실패: 국세청에 등록되지 않은 허위 사업자등록번호이거나 조회할 수 없습니다. (응답: ${bizData.tax_type})`);
            }
        } else {
            throw new Error("Invalid API Response");
        }
    } catch(err) {
        console.error("NTS API 연동 에러:", err);
        alert("국세청 서버 장애 또는 통신 에러가 발생했습니다. 잠시 후 시도해주세요.");
    } finally {
        btn.disabled = false;
        btn.textContent = "국세청 실시간 진위 확인 (Live)";
    }
}

// ----------------------------------------
// [URL Parameter 처리: 더미 상품 페이지 연동]
// ----------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('product_id');
    if (pid && pid.startsWith('p')) {
        const dummies = {
            p1: { title: "대형 선박용 고출력 디젤 엔진 (상태 A급)", price: "협의 요망", location: "부산 감천항", seller_name: "엔진마스터", type: "standard", content: "22년 정비 완료된 완벽한 상태의 엔진입니다." },
            p2: { title: "특수 합금 청동 프로펠러 세트", price: "52,000,000", location: "울산 앞바다", seller_name: "선체부속", type: "standard", content: "미사용 신품급 특수 합금 프로펠러입니다." },
            p3: { title: "X-Band 레이더 시스템 풀세트", price: "18,500,000", location: "인천 연안부두", seller_name: "통신전문기업", type: "auction", current_bid: 18500000, auction_end: new Date(Date.now() + 86400000).toISOString(), content: "모니터 포함된 레이더 시스템입니다." },
            p4: { title: "선박용 평형수 처리 장치(BWTS)", price: "28,000,000", location: "목포 신항", seller_name: "에코환경", type: "standard", content: "설치 및 시운전 지원 가능한 폐수 처리 장치입니다." },
        };
        if(dummies[pid]) {
            setTimeout(() => {
                openProductModal({ 
                    id: pid, 
                    ...dummies[pid], 
                    svg: '<div style="background:#EAEAEA; width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#555; border-radius:12px; font-weight:700;">추천 기자재 상세 이미지</div>', 
                    user_id: 'dummy_user' 
                });
            }, 600); // UI 로딩 후 모달 오픈
        }
    }
});

// ----------------------------------------
// [실시간 1:1 채팅 시스템 (Supabase Real-time)]
// ----------------------------------------
let currentChatRoomId = null;
let chatSubscription = null;
let myChats = [];

async function startChat(productId) {
    if(!currentUser) {
        alert("채팅을 위해 로그인이 필요합니다.");
        showPage('mypage');
        closeProductModal();
        return;
    }
    
    // 상품 객체 찾기 (더미도 포함된 캐시나 products 배열 이용)
    let p = products.find(x => String(x.id) === String(productId));
    if (!p) {
        if(String(productId).startsWith('p')) {
            alert("데모 화면의 더미 데이터는 프론트엔드 목업으로 서버 통신을 생략합니다.");
        } else {
            alert("상품을 찾을 수 없습니다.");
        }
        return;
    }
    
    if(p.user_id === currentUser.id) {
        alert("본인이 등록한 상품에는 채팅을 걸 수 없습니다.");
        return;
    }
    
    const btn = document.querySelector('.modal-box button');
    if(btn) btn.textContent = "채팅방 연결 중...";
    
    // 채팅방 존재 여부 확인
    const { data: existingRoom, error: fetchErr } = await supabaseClient
        .from('haema_chat_rooms')
        .select('*')
        .eq('product_id', p.id)
        .eq('buyer_id', currentUser.id)
        .limit(1)
        .single();
        
    let roomId = null;
    
    if (existingRoom && existingRoom.id) {
        roomId = existingRoom.id;
    } else {
        // 없다면 생성
        const { data: newRoom, error: insertErr } = await supabaseClient
            .from('haema_chat_rooms')
            .insert({
                product_id: p.id,
                buyer_id: currentUser.id,
                seller_id: p.user_id
            })
            .select()
            .single();
            
        if (insertErr) {
            console.error("채팅방 생성 에러:", insertErr);
            alert("채팅방 생성에 실패했습니다. (DB 테이블이 필요합니다)");
            closeProductModal();
            return;
        }
        roomId = newRoom.id;
    }
    
    closeProductModal();
    openChatRoom(roomId, p);
}

// 하단 탭 '채팅' 눌렀을 때 목록 로드
async function loadChats() {
    triggerBottomNav('chat');
    const container = document.getElementById('chat-list');
    
    if(!currentUser) {
        container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#999; font-size:14px;">로그인 후 이용 가능합니다.</div>';
        return;
    }
    
    container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#999; font-size:14px;">채팅 목록 불러오는 중...</div>';
    
    // 구매자 혹은 판매자로 참여 중인 모든 방 로드
    const { data: rooms, error } = await supabaseClient
        .from('haema_chat_rooms')
        .select('*')
        .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
        .order('last_updated_at', { ascending: false });
        
    if(error) {
        console.error(error);
        container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#999; font-size:14px;">채팅 서버에 연결할 수 없거나 테이블이 없습니다.</div>';
        return;
    }
    
    if(!rooms || rooms.length === 0) {
         container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#999; font-size:14px;">참여 중인 대화가 없습니다.</div>';
         return;
    }
    
    // JS 릴레이션 (haema_products) 수동 연결 (Foreign Key 제약 없이 작동하게 함)
    const pIds = rooms.map(r => r.product_id);
    const { data: pData } = await supabaseClient.from('haema_products').select('*').in('id', pIds);
    
    myChats = rooms.map(r => ({
        ...r,
        haema_products: pData ? pData.find(x => String(x.id) === String(r.product_id)) : null
    }));
    
    let html = '';
    myChats.forEach(room => {
        const pInfo = room.haema_products || {};
        const pTitle = pInfo.title || "알 수 없는 상품";
        const opName = room.buyer_id === currentUser.id ? "판매자" : "구매자";
        const lastMsg = room.last_message || "대화를 시작해보세요.";
        let timeStr = "";
        if(room.last_updated_at) {
            const d = new Date(room.last_updated_at);
            timeStr = d.getHours() + ":" + String(d.getMinutes()).padStart(2, '0');
        }
        
        html += `
        <div class="chat-item" onclick="openChatRoomByList('${room.id}')">
            <div class="chat-avatar">${opName.charAt(0)}</div>
            <div class="chat-info">
                <div class="chat-name-row">
                    <span class="chat-name">${opName} <span style="font-size:11px; font-weight:400; color:#999; margin-left:4px;">${pTitle.substring(0,10)}...</span></span>
                    <span class="chat-time">${timeStr}</span>
                </div>
                <div class="chat-preview">${lastMsg}</div>
            </div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

// 탭에서 클릭해서 들어올 경우 룸 데이터 찾기
function openChatRoomByList(roomId) {
    const room = myChats.find(r => r.id === roomId);
    if(room) {
        openChatRoom(roomId, room.haema_products);
    }
}

// 실제 채팅방 접속 UI 띄우기 및 소켓 연결
async function openChatRoom(roomId, pData) {
    currentChatRoomId = roomId;
    
    const chatroomEl = document.getElementById('chatroom');
    chatroomEl.style.display = 'flex';
    
    // 상품 배너 세팅
    document.getElementById('chat-product-title').textContent = pData ? pData.title : '상품 정보';
    document.getElementById('chat-product-price').textContent = (pData && pData.price) ? pData.price : '-';
    // 배너 렌더링을 위해 pData.svg나 pData.image가 있다면 주입
    const imgEl = document.getElementById('chat-product-img');
    if(pData && pData.svg) {
        imgEl.innerHTML = pData.svg;
    } else {
        imgEl.innerHTML = '<div style="width:100%;height:100%;background:#D4E8F8;"></div>'; // 뼈대
    }
    
    const msgContainer = document.getElementById('chat-messages-container');
    msgContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:12px;">메시지 로딩중...</div>';
    
    // 1. 거래완료 버튼 분기 로직 (매너온도 후기용)
    const tradeBtn = document.getElementById('chat-trade-btn');
    if (pData) {
        if (pData.is_closed) {
            tradeBtn.textContent = '후기 남기기';
            tradeBtn.style.background = '#EAEDF2';
            tradeBtn.style.color = '#7A93B0';
            tradeBtn.onclick = () => openReviewModal(pData.id, pData.user_id === currentUser.id ? pData.highest_bidder_id || roomId /* fallback */ : pData.user_id);
        } else {
            if (pData.user_id === currentUser.id) {
                tradeBtn.textContent = '거래완료';
                tradeBtn.style.background = '#f4f9ff';
                tradeBtn.style.color = '#1a5fa0';
                tradeBtn.onclick = () => completeTransaction(pData.id, roomId);
            } else {
                tradeBtn.style.display = 'none'; // 구매자는 완료 전엔 버튼 숨김
            }
        }
    }
    
    // 1. 기존 메시지 로드
    const { data: messages, error } = await supabaseClient
        .from('haema_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
        
    msgContainer.innerHTML = '';
    
    if(messages && messages.length > 0) {
        messages.forEach(msg => {
            renderMessage(msg);
        });
    } else {
        msgContainer.innerHTML = '<div id="empty-chat-state" style="text-align:center; padding:20px; color:#999; font-size:12px;">첫 메시지를 보내 대화를 시작해보세요. (엔터 발송 가능)</div>';
    }
    
    scrollChatToBottom();
    
    // 2. 소켓 구독 시작
    subscribeToMessages(roomId);
}

function renderMessage(msg) {
    const msgContainer = document.getElementById('chat-messages-container');
    const emptyState = document.getElementById('empty-chat-state');
    if(emptyState) emptyState.style.display = 'none';
    
    const isMine = (msg.sender_id === currentUser.id);
    const d = new Date(msg.created_at || Date.now());
    const timeStr = d.getHours() + ":" + String(d.getMinutes()).padStart(2, '0');
    
    let html = '';
    if(isMine) {
        // 내 메시지 (우측) 노란색
        html = `
        <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
            <div style="display:flex; align-items:flex-end; gap:6px;">
                <span style="font-size:10px; color:#999;">${timeStr}</span>
                <div style="background:var(--yellow-400); color:#333; padding:10px 14px; border-radius:16px; border-bottom-right-radius:4px; font-size:14px; font-weight:500; max-width:240px; word-break:break-word; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                    ${escapeHtml(msg.content)}
                </div>
            </div>
        </div>
        `;
    } else {
        // 상대방 메시지 (좌측) 백색
        html = `
        <div style="display:flex; justify-content:flex-start; margin-bottom:12px;">
            <div style="display:flex; align-items:flex-end; gap:6px;">
                <div style="background:#fff; border:1px solid #D4E8F8; color:#1A2B4A; padding:10px 14px; border-radius:16px; border-bottom-left-radius:4px; font-size:14px; font-weight:500; max-width:240px; word-break:break-word; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                    ${escapeHtml(msg.content)}
                </div>
                <span style="font-size:10px; color:#999;">${timeStr}</span>
            </div>
        </div>
        `;
    }
    
    msgContainer.insertAdjacentHTML('beforeend', html);
}

function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function scrollChatToBottom() {
    const msgContainer = document.getElementById('chat-messages-container');
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

async function sendChatMessage() {
    const inputEl = document.getElementById('chat-input-text');
    const content = inputEl.value.trim();
    if(!content || !currentChatRoomId || !currentUser) return;
    
    inputEl.value = ''; // 프리 로드 효과를 위해 input 즉각 비움
    
    const newMessage = {
        room_id: currentChatRoomId,
        sender_id: currentUser.id,
        content: content
    };
    
    // DB 인서트 (실시간 리스너가 이를 감지하여 renderMessage를 호출함, 혹시 지연 시 수동 렌더 추가 가능)
    const { error: msgErr } = await supabaseClient.from('haema_messages').insert(newMessage);
    
    if(msgErr) {
         console.error("메시지 전송 실패", msgErr);
         return;
    }
    
    // 채팅방 최신 상태 업데이트 (목록에서 갱신 위함)
    await supabaseClient.from('haema_chat_rooms').update({
        last_message: content,
        last_updated_at: new Date().toISOString()
    }).eq('id', currentChatRoomId);
}

// 실시간 변화 구독 함수
function subscribeToMessages(roomId) {
    if(chatSubscription) {
        supabaseClient.removeChannel(chatSubscription);
    }
    
    chatSubscription = supabaseClient.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'haema_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          renderMessage(payload.new);
          scrollChatToBottom();
        }
      )
      .subscribe();
}

// 채팅방 닫기 (뒤로가기)
window.hideChatRoom = function() {
    if(chatSubscription) {
        supabaseClient.removeChannel(chatSubscription);
        chatSubscription = null;
    }
    currentChatRoomId = null;
    document.getElementById('chatroom').style.display = 'none';
    
    // 리스트 다시 로드시켜 최신 메시지 반영
    loadChats();
};

// ----------------------------------------
// [관심 목록 (찜하기) 로직]
// ----------------------------------------
async function toggleLike(productId) {
    if(!currentUser) {
        alert('로그인 후 이용 가능합니다.');
        return;
    }
    
    const btn = document.getElementById('modal-heart-btn');
    if(!btn) return;
    
    btn.style.transform = 'scale(0.8)';
    setTimeout(() => btn.style.transform = 'scale(1)', 100);
    
    // 현재 상태 확인
    const { data: existing, error: err } = await supabaseClient
        .from('haema_likes')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', currentUser.id)
        .single();
        
    if(existing) {
        // 취소
        await supabaseClient.from('haema_likes').delete().eq('id', existing.id);
        btn.textContent = '🤍';
    } else {
        // 찜
        await supabaseClient.from('haema_likes').insert({ product_id: productId, user_id: currentUser.id });
        btn.textContent = '❤️';
    }
}

async function checkLikeStatus(productId) {
    if(!currentUser || String(productId).startsWith('p')) return;
    const { data } = await supabaseClient.from('haema_likes').select('id').eq('product_id', productId).eq('user_id', currentUser.id).single();
    const btn = document.getElementById('modal-heart-btn');
    if(btn) {
        btn.textContent = data ? '❤️' : '🤍';
    }
}

async function loadLikedProducts() {
    triggerBottomNav('mypage'); // 탭 이동
    openMyListCommon("내 관심 목록 (찜)");
    
    // haema_likes와 haema_products 조인 (Supabase View나 RPC 없이 클라이언트 사이드로 처리)
    const { data: likes, error } = await supabaseClient
        .from('haema_likes')
        .select('product_id')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
        
    if(error || !likes || likes.length === 0) {
        document.getElementById('mylist-grid').innerHTML = `<div style="grid-column: span 3; padding:60px 20px; text-align:center; color:#999; font-size:14px; display:flex; flex-direction:column; align-items:center; gap:12px;"><div style="font-size:32px;">❤️</div><div>아직 찜을 누른 관심 매물이 없습니다.</div><button onclick="triggerBottomNav('home')" style="margin-top:16px; padding: 10px 20px; border-radius: 8px; background: #f4f9ff; color: #1a5fa0; border: 1px solid #cce5ff; font-weight: bold; cursor: pointer;">매물 둘러보기</button></div>`;
        return;
    }
    
    const pIds = likes.map(l => l.product_id);
    const { data: pData } = await supabaseClient.from('haema_products').select('*').in('id', pIds);
    
    // 최신순 유지 및 자료형 충돌 방지 (String 전환 후 비교)
    const sortedProducts = pIds.map(id => pData ? pData.find(x => String(x.id) === String(id)) : null).filter(Boolean);
    
    const container = document.getElementById('mylist-grid');
    container.innerHTML = '';
    
    sortedProducts.forEach((p, idx) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.cursor = 'pointer';
        card.onclick = () => openProductModal(p.id);
        
        card.innerHTML = `
          <div class="product-img" style="position:relative;">
             ${p.svg}
             <div style="position:absolute; bottom:8px; right:8px; font-size:12px;">❤️</div>
          </div>
          <div class="product-body">
            <div class="product-title">${p.title}</div>
             <div class="product-price">${p.price}</div>
          </div>
        `;
        container.appendChild(card);
    });
}

function openMyListCommon(titleText) {
    showPage('mylist');
    const subTitle = document.querySelector('#page-mylist .sub-title');
    if(subTitle) subTitle.textContent = titleText;
    document.getElementById('mylist-grid').innerHTML = '<div style="grid-column: span 3; padding:40px; text-align:center; color:#999; font-size:13px; display:flex; justify-content:center;">로딩 중...</div>';
}

// ----------------------------------------
// [매너온도 (거래 후기) 로직]
// ----------------------------------------
let activeReviewProductId = null;
let activeReviewTargetId = null;

async function completeTransaction(productId, roomId) {
    if(!confirm("정말 이 방의 유저와 거래를 완료하시겠습니까? 거래가 마감 처리됩니다.")) return;
    
    const p = products.find(x => x.id === productId);
    if(!p) return;
    
    // 판매자가 누른 경우만
    const { data: roomData } = await supabaseClient.from('haema_chat_rooms').select('buyer_id').eq('id', roomId).single();
    if(!roomData) return;
    const buyerId = roomData.buyer_id;
    
    // 상품 마감 처리
    await supabaseClient.from('haema_products').update({ is_closed: true, highest_bidder_id: buyerId }).eq('id', productId);
    
    p.is_closed = true;
    document.getElementById('chat-trade-btn').textContent = '후기 남기기';
    document.getElementById('chat-trade-btn').onclick = () => openReviewModal(productId, buyerId);
    
    // 바로 리뷰 띄우기
    openReviewModal(productId, buyerId);
}

function openReviewModal(productId, targetUserId) {
    activeReviewProductId = productId;
    activeReviewTargetId = targetUserId;
    if(document.getElementById('review-content')) document.getElementById('review-content').value = '';
    document.getElementById('review-modal').style.display = 'flex';
}

async function submitReview(score) {
    if(!activeReviewProductId || !activeReviewTargetId) return;
    
    const content = document.getElementById('review-content') ? document.getElementById('review-content').value.trim() : '';
    
    const obj = {
        product_id: activeReviewProductId,
        reviewer_id: currentUser.id,
        reviewee_id: activeReviewTargetId,
        score: score,
        content: content
    };
    
    const { error } = await supabaseClient.from('haema_reviews').insert(obj);
    if(error) {
        if(error.code === '23505') {
            alert('이미 이 거래에 대해 후기를 남기셨습니다!');
        } else {
            console.error(error);
            alert('후기 등록 중 오류가 발생했습니다.');
        }
    } else {
        alert('소중한 후기가 등록되었습니다. 거래 신뢰도(별점)에 반영됩니다!');
    }
    
    document.getElementById('review-modal').style.display = 'none';
}



// ==========================================
// [커뮤니티 글쓰기 & 상세 & 댓글 로직]
// ==========================================

window.openPostWriteModal = function() {
    if(!currentUser) {
        alert("글을 작성하려면 먼저 로그인을 하셔야 합니다.");
        return;
    }
    document.getElementById('post-write-title').value = '';
    document.getElementById('post-write-content').value = '';
    document.getElementById('post-write-modal').style.display = 'flex';
}

window.closePostWriteModal = function() {
    document.getElementById('post-write-modal').style.display = 'none';
}

window.submitPost = async function() {
    if(!currentUser) return;
    const title = document.getElementById('post-write-title').value.trim();
    const content = document.getElementById('post-write-content').value.trim();
    const tag = document.getElementById('post-write-tag').value;
    
    if(!title || !content) {
        alert("제목과 내용을 모두 입력해주세요.");
        return;
    }
    
    let tagBg = '#F4F9FF';
    let tagColor = '#1A5FA0';
    if(tag.includes('수리지식')) { tagBg = '#E8F5E9'; tagColor = '#1E8E3E'; }
    if(tag.includes('구인구직')) { tagBg = '#FFF3E0'; tagColor = '#F57C00'; }

    const btn = document.getElementById('btn-submit-post');
    btn.disabled = true;
    btn.textContent = '등록 중...';

    const newPost = {
        author_id: currentUser.id,
        author_name: currentUser.user_metadata?.full_name || '익명선장',
        author_role: currentUser.user_metadata?.role || '일반 회원',
        tag: tag,
        tag_bg: tagBg,
        tag_color: tagColor,
        title: title,
        content: content,
        views: 0,
        comments_count: 0
    };

    const { error } = await supabaseClient.from('haema_posts').insert([newPost]);
    
    btn.disabled = false;
    btn.textContent = '등록';

    if(error) {
        alert("글 등록 중 오류가 발생했습니다: " + error.message);
        return;
    }

    closePostWriteModal();
    renderCommunityPosts(); // 리스트 갱신
}

let currentPostId = null;

window.openPostDetail = async function(postId) {
    currentPostId = postId;
    document.getElementById('post-detail-modal').style.display = 'flex';
    const body = document.getElementById('post-detail-body');
    body.innerHTML = '<div style="text-align:center; padding: 40px; color:#999;">불러오는 중...</div>';
    
    const { data: postData } = await supabaseClient.from('haema_posts').select('*').eq('id', postId).single();
    if(postData) {
        await supabaseClient.from('haema_posts').update({ views: postData.views + 1 }).eq('id', postId);
        postData.views += 1;
    } else {
        body.innerHTML = '<div style="text-align:center; padding: 40px; color:red;">삭제되었거나 없는 게시글입니다.</div>';
        return;
    }

    const { data: comments } = await supabaseClient.from('haema_post_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    
    let html = `
        <div style="margin-bottom:20px;">
            <div style="display:inline-block; font-size:12px; font-weight:800; background:${postData.tag_bg}; color:${postData.tag_color}; padding:4px 8px; border-radius:6px; margin-bottom:12px;">
                ${postData.tag}
            </div>
            <h2 style="margin:0 0 12px 0; font-size:20px; color:#1A2B4A; line-height:1.4;">${postData.title}</h2>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:20px; border-bottom:1px solid #eaedf2; padding-bottom:16px;">
                <div style="width:36px; height:36px; border-radius:50%; background:#f4f9ff; display:flex; align-items:center; justify-content:center; font-size:18px;">👤</div>
                <div>
                    <div style="font-size:14px; font-weight:700; color:#1A2B4A;">${postData.author_name}</div>
                    <div style="font-size:12px; color:#7A93B0;">${postData.author_role} · 방금 전 · 조회 ${postData.views}</div>
                </div>
            </div>
            <div style="font-size:15px; color:#1A2B4A; line-height:1.6; white-space:pre-wrap;">${postData.content}</div>
        </div>
        
        <div style="margin-top:32px;">
            <h4 style="margin:0 0 16px 0; font-size:15px; color:#1A2B4A;">댓글 <span style="color:#1A5FA0;">${comments ? comments.length : 0}</span></h4>
            <div id="comments-list" style="display:flex; flex-direction:column; gap:16px;">
    `;
    
    if(comments && comments.length > 0) {
        comments.forEach(c => {
            html += `
                <div style="display:flex; gap:12px;">
                    <div style="width:28px; height:28px; border-radius:50%; background:#eaedf2; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:14px;">👤</div>
                    <div>
                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                            <span style="font-size:13px; font-weight:700; color:#1A2B4A;">${c.author_name}</span>
                            <span style="font-size:11px; background:#f4f9ff; color:#7A93B0; padding:2px 6px; border-radius:4px;">${c.author_role}</span>
                        </div>
                        <div style="font-size:14px; color:#4A5568; line-height:1.4;">${c.content}</div>
                    </div>
                </div>
            `;
        });
    } else {
        html += `<div style="text-align:center; color:#999; font-size:13px; padding:20px 0;">가장 먼저 댓글을 남겨보세요!</div>`;
    }

    html += `</div></div>`;
    body.innerHTML = html;
}

window.closePostDetail = function() {
    document.getElementById('post-detail-modal').style.display = 'none';
    currentPostId = null;
}

window.submitComment = async function() {
    if(!currentUser) {
        alert("댓글을 작성하려면 먼저 로그인을 하셔야 합니다.");
        return;
    }
    if(!currentPostId) return;

    const input = document.getElementById('post-comment-input');
    const content = input.value.trim();
    if(!content) return;

    input.value = '등록 중...';
    input.disabled = true;

    const newComment = {
        post_id: currentPostId,
        author_id: currentUser.id,
        author_name: currentUser.user_metadata?.full_name || '익명선장',
        author_role: currentUser.user_metadata?.role || '일반 회원',
        content: content
    };

    const { error } = await supabaseClient.from('haema_post_comments').insert([newComment]);
    
    if(error) {
        alert("댓글 등록 실패: " + error.message);
        input.value = content;
        input.disabled = false;
        return;
    }

    const { data: pData } = await supabaseClient.from('haema_posts').select('comments_count').eq('id', currentPostId).single();
    if(pData) {
        await supabaseClient.from('haema_posts').update({ comments_count: (pData.comments_count || 0) + 1 }).eq('id', currentPostId);
    }

    input.value = '';
    input.disabled = false;
    
    openPostDetail(currentPostId);
    renderCommunityPosts();
}

// Community Sub-tag filter logic
window.currentCommTag = '전체';
window.setCommTag = function(tagName, el) {
    window.currentCommTag = tagName;
    
    // Update styling
    const tags = document.querySelectorAll('.comm-tag');
    tags.forEach(t => {
        t.style.background = '#f4f9ff';
        t.style.color = '#7A93B0';
        t.style.border = '1px solid #eaedf2';
    });
    if (el) {
        el.style.background = '#1A2B4A';
        el.style.color = '#fff';
        el.style.border = 'none';
    }
    
    // Re-render
    if (typeof renderCommunityPosts === 'function') {
        renderCommunityPosts();
    }
}

// Scroll to Top specific logic
window.scrollToTop = function() {
    window.scrollTo({top:0, behavior:'smooth'});
    const activePage = document.querySelector('.page.active');
    if (activePage) {
        const scrollAreas = activePage.querySelectorAll('[style*="overflow-y"], [style*="overflow-y:auto"], [id*="-content-area"]');
        scrollAreas.forEach(area => {
            area.scrollTo({top:0, behavior:'smooth'});
        });
    }
}
