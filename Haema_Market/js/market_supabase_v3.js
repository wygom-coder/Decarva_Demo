function showPage(id, pushHistory = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById('page-' + id);
  if(targetPage) targetPage.classList.add('active');
  window.scrollTo({top:0, behavior:'smooth'});
  if(pushHistory) {
    window.history.pushState({ pageId: id }, '', '#' + id);
  }
}

// ë¸ë¼ì°ì  ë¤ë¡ê°ê¸° ë²í¼ íì±í (popstate ì´ë²¤í¸)
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
          alert('ë¡ê·¸ì¸ì´ íìí ê¸°ë¥ìëë¤.');
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
    applySubFilter('tradeType', 'ê²½ë§¤');
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

// ==== Supabase ì°ë & ìí ê´ë¦¬ ë°ì´í° ====
const SUPABASE_URL = 'https://conlrhslgepktvajvgvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n2kbcfymcwb4Nna5hN7wsA_TRKixOG5';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let auctionInterval = null;
let uploadedBase64 = null;
let uploadedBlob = null;
const KATEGORY_MAP = {
  'ì ì²´': [
    { name: 'ìì§Â·ëë ¥', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="10" width="16" height="9" rx="2" stroke="#1A5FA0" stroke-width="1.4"/><path d="M7 10V7a4 4 0 018 0v3" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: 'ííÂ·ë°°ê´', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 8h12M5 14h12" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><rect x="3" y="5" width="16" height="12" rx="2" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: 'ë¡íÂ·ìì´ì´', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1A5FA0" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#DAEEFF' },
    { name: 'ììë³µÂ·ìì í', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 6h10v12H6z" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 6l3-4 3 4" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: 'êµ¬ëªì¤ë¹', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1E8E3E" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#E6F4EA' },
    { name: 'ìë°©ì¤ë¹', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4C7 4 7 11 7 11c0 3.3 2.7 6 4 6s4-2.7 4-6c0 0 0-7-4-7z" stroke="#D32F2F" stroke-width="1.4"/></svg>', bg: '#FFEBEE' },
    { name: 'ìÂ·ê³¡ë¬¼', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="4" width="10" height="14" rx="2" stroke="#1E8E3E" stroke-width="1.4"/><line x1="8" y1="10" x2="14" y2="10" stroke="#1E8E3E" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#E6F4EA' },
    { name: 'ìì°ë¬¼', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 11s4-4 8 0 6 4 6 4-2 3-5 1-9-3-9-5z" stroke="#1A5FA0" stroke-width="1.4"/></svg>', bg: '#DAEEFF' }
  ],
  'ê¸°ë¶ì': [
    { name: 'ìì§Â·ëë ¥', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="10" width="16" height="9" rx="2" stroke="#1A5FA0" stroke-width="1.4"/><path d="M7 10V7a4 4 0 018 0v3" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: 'í­ë²ì¥ë¹', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="6" stroke="#D4960A" stroke-width="1.4"/><line x1="11" y1="5" x2="11" y2="3" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><line x1="17" y1="11" x2="19" y2="11" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><circle cx="11" cy="11" r="2" fill="#D4960A"/></svg>', bg: '#FFF3C0' },
    { name: 'ê°íì¥ë¹', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 14L11 4l7 10H4z" stroke="#1A5FA0" stroke-width="1.4" stroke-linejoin="round"/><line x1="11" y1="14" x2="11" y2="19" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/><line x1="7" y1="19" x2="15" y2="19" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: 'íµì ì¥ë¹', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="5" y="6" width="12" height="10" rx="2" stroke="#D4960A" stroke-width="1.4"/><path d="M9 6V4h4v2" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><line x1="8" y1="11" x2="14" y2="11" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#FFF3C0' },
    { name: 'ííÂ·ë°°ê´', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 8h12M5 14h12" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><rect x="3" y="5" width="16" height="12" rx="2" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: 'ì ê¸°Â·ê³ì¸¡', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="4" width="10" height="14" rx="2" stroke="#1A5FA0" stroke-width="1.4"/><line x1="11" y1="14" x2="15" y2="10" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: 'ê¸°íë¶í', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#D4960A" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#FFF3C0' }
  ],
  'ì ì©í': [
    { name: 'ë¡íÂ·ìì´ì´', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1A5FA0" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#DAEEFF' },
    { name: 'íì¸í¸Â·íê³µí', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="8" width="10" height="10" rx="2" stroke="#D4960A" stroke-width="1.4"/><path d="M8 8V6a2 2 0 116 0v2" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: 'ììë³µÂ·ìì í', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 6h10v12H6z" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 6l3-4 3 4" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: 'ì²­ìÂ·ìëª¨í', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 20l-4-8h8l-4 8z" stroke="#D4960A" stroke-width="1.4"/><path d="M11 12V4" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: 'ê³µêµ¬Â·ê¸°ê¸°', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M14 6l-8 8" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/><circle cx="16" cy="6" r="2" stroke="#1A5FA0" stroke-width="1.4"/></svg>', bg: '#DAEEFF' },
    { name: 'ê¸°í', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#D4960A" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#FFF3C0' }
  ],
  'ìì ì¥ë¹': [
    { name: 'êµ¬ëªì¤ë¹', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1E8E3E" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#E6F4EA' },
    { name: 'ìë°©ì¤ë¹', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4C7 4 7 11 7 11c0 3.3 2.7 6 4 6s4-2.7 4-6c0 0 0-7-4-7z" stroke="#D32F2F" stroke-width="1.4"/></svg>', bg: '#FFEBEE' },
    { name: 'ê°ì¸ë³´í¸êµ¬', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 6h10v12H6z" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 6l3-4 3 4" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: 'í­í´ìì ', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="10" r="5" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 16l3 3 3-3" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><line x1="11" y1="19" x2="11" y2="15" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: 'ê¸°í', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#D4960A" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#FFF3C0' }
  ],
  'ì£¼/ë¶ì': [
    { name: 'ìÂ·ê³¡ë¬¼', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="4" width="10" height="14" rx="2" stroke="#1E8E3E" stroke-width="1.4"/><line x1="8" y1="10" x2="14" y2="10" stroke="#1E8E3E" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#E6F4EA' },
    { name: 'ì¡ë¥', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 12c0-4 6-6 12 0-6 6-12 4-12 0z" stroke="#D32F2F" stroke-width="1.4"/></svg>', bg: '#FFEBEE' },
    { name: 'ìì°ë¬¼', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 11s4-4 8 0 6 4 6 4-2 3-5 1-9-3-9-5z" stroke="#1A5FA0" stroke-width="1.4"/></svg>', bg: '#DAEEFF' },
    { name: 'ì²­ê³¼ë¥', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="12" r="6" stroke="#D4960A" stroke-width="1.4"/><path d="M11 6v2" stroke="#1E8E3E" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#FFF3C0' },
    { name: 'ê°ê³µÂ·ìë£', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="7" y="6" width="8" height="12" rx="2" stroke="#7A5200" stroke-width="1.4"/><line x1="7" y1="10" x2="15" y2="10" stroke="#7A5200" stroke-width="1.4"/></svg>', bg: '#FFF3C0' }
  ]
};

const CAT_TO_TOP_MAP = {};
Object.entries(KATEGORY_MAP).forEach(([top, cats]) => {
    if (top !== 'ì ì²´') cats.forEach(c => CAT_TO_TOP_MAP[c.name] = top);
});



let currentUser = null;
let authMode = 'signin';

supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    updateProfileUI();
    if (currentUser) {
        // Logged in UI updates
        const myNameEl = document.querySelector('.my-name');
        const myEmailEl = document.querySelector('.my-sub');
        if (myNameEl) myNameEl.textContent = (currentUser.email ? currentUser.email.split('@')[0] : 'ì ì ') + 'ë';
        if (myEmailEl) myEmailEl.innerHTML = (currentUser.email || '') + ' Â· ë¶ì°';
        
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
        if (myNameEl) myNameEl.textContent = 'ë¡ê·¸ì¸ì´ íìí©ëë¤';
        if (myEmailEl) myEmailEl.innerHTML = 'ë¹íì';
        
        // Header Nav buttons
        const topLoginBtn = document.getElementById('header-btn-login');
        
        if(topLoginBtn) topLoginBtn.style.display = 'inline-block';
        
    }
});

function requireAuthAndShow(id) {
    if(!currentUser) {
        alert('íìê°ì ë° ë¡ê·¸ì¸ì´ íìí ê¸°ë¥ìëë¤.');
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
    document.getElementById('btn-auth-submit').textContent = mode === 'signup' ? 'í´ë§ ììíê¸°' : 'ë¡ê·¸ì¸';
    document.getElementById('auth-error').textContent = '';
}

async function submitAuth() {
    const email = document.getElementById('auth-email').value;
    const pw = document.getElementById('auth-pw').value;
    const errObj = document.getElementById('auth-error');
    const btn = document.getElementById('btn-auth-submit');
    errObj.textContent = '';
    
    if(!email || !pw) { errObj.textContent = 'ì´ë©ì¼ê³¼ ë¹ë°ë²í¸ë¥¼ ëª¨ë ìë ¥í´ì£¼ì¸ì.'; return; }
    
    btn.disabled = true;
    btn.textContent = 'ì²ë¦¬ ì¤...';

    if(authMode === 'signup') {
        const pwConfirm = document.getElementById('auth-pw-confirm').value;
        if(pw !== pwConfirm) { 
            errObj.textContent = 'ë¹ë°ë²í¸ê° ì¼ì¹íì§ ììµëë¤.'; 
            btn.disabled = false; switchAuthMode('signup'); return; 
        }
        
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: pw
        });
        
        if(error) {
            errObj.textContent = error.message;
        } else {
            alert('íìê°ìì´ ìë£ëììµëë¤!');
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
            errObj.textContent = 'ë¡ê·¸ì¸ ì¤í¨: ì´ë©ì¼ ëë ë¹ë°ë²í¸ë¥¼ íì¸í´ì£¼ì¸ì.';
        } else {
            showPage('home');
            document.getElementById('auth-email').value = '';
            document.getElementById('auth-pw').value = '';
        }
    }
    
    btn.disabled = false;
    switchAuthMode(authMode);
}

// ì ì­ ë¡ê·¸ìì í¨ì
window.doLogout = async function() {
    if(confirm("ì ë§ ë¡ê·¸ìì íìê² ìµëê¹?")) {
        await supabaseClient.auth.signOut();
        alert('ë¡ê·¸ìì ëììµëë¤.');
        showPage('home');
        // ë¡ê·¸ìì í UI ì´ê¸°í ë± íìí ê²½ì° ì¬ê¸°ì ì¶ê°
    }
};


let userCart = JSON.parse(localStorage.getItem('haema_cart')) || [];

let filterState = {
  topCategory: 'ì ì²´',
  keyword: '',
  category: 'ì ì²´',
  region: 'ì ì²´',
  condition: 'ì ì²´',
  cert: 'ì ì²´',
  tradeType: 'ì ì²´',
  supplier: 'ì ì²´',
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
            
            if (filterState.category === catName) filterState.category = 'ì ì²´';
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
             filterState.category = 'ì ì²´'; // Reset sub-category on top category change
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
    const Foods = ['ì ì²´', 'ìÂ·ê³¡ë¬¼', 'ì¡ë¥', 'ìì°ë¬¼', 'ì²­ê³¼ë¥', 'ê°ê³µÂ·ìë£'];
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

// ì¹´íê³ ë¦¬ë¥¼ ê·¸ë¦¬ë HTML ìì± ì í¸ í¨ì
function createProductCardHTML(p) {
    let tagsHTML = '';
    if (p.auth) tagsHTML += '<span class="ptag ptag-b">ì¸ì¦</span>';
    if (p.tradeType === 'ì§ê±°ë' || p.tradeType === 'ëª¨ë') tagsHTML += '<span class="ptag ptag-y">ì§ê±°ë</span>';
    if (p.offer) tagsHTML += '<span class="ptag ptag-r">ê°ê²©ì ì</span>';
    if (p.auction) {
        if(p.is_closed) {
            tagsHTML += `<span class="ptag ptag-b" style="background:#eee;color:#999;border:none;">ëì°° ìë£</span>`;
        } else if(p.auction_end) {
            tagsHTML += `<span class="ptag ptag-b auction-timer-tag" data-end="${p.auction_end}">ê³ì°ì¤...</span>`;
        } else if (p.remain) {
            tagsHTML += `<span class="ptag ptag-b">${p.remain}</span>`;
        }
    }

    let priceHTML = `<div class="product-price">${p.price}</div>`;
    if (p.auction) {
      if(p.is_closed) {
          const finalPrice = p.current_bid ? `â© ${p.current_bid.toLocaleString()}` : 'ì ì°°ë¨';
          priceHTML = `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><span class="auction-badge" style="background:#7A93B0;">ì¢ë£</span><span style="font-size:14px;font-weight:700;color:#7A93B0;text-decoration:line-through;">${finalPrice}</span></div>`;
      } else {
          const showPrice = p.current_bid ? `â© ${p.current_bid.toLocaleString()}` : p.price;
          priceHTML = `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><span class="auction-badge">ê²½ë§¤ì¤</span><span style="font-size:14px;font-weight:700;color:#1A2B4A;">${showPrice}</span></div>`;
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

// íë©´ ë ëë§ ë¡ì§
function renderProducts() {
  const grid = document.getElementById('main-product-grid');
  const catArea = document.getElementById('home-category-area');
  const recArea = document.getElementById('home-recommendation-area');
  const listTitle = document.getElementById('main-product-title-header');
  
  if(!grid) return;
  grid.innerHTML = '';
  
  let filtered = products.filter(p => {
    let topOfP = CAT_TO_TOP_MAP[p.category] || p.category; // fallback to p.category instead of contaminating ê¸°ë¶ì
    if (['ìÂ·ê³¡ë¬¼', 'ì¡ë¥', 'ìì°ë¬¼', 'ì²­ê³¼ë¥', 'ê°ê³µÂ·ìë£', 'ì£¼/ë¶ì'].includes(p.category)) {
        topOfP = 'ì£¼/ë¶ì';
    }
    if (filterState.topCategory !== 'ì ì²´' && topOfP !== filterState.topCategory) return false;
    
    // 0. í¤ìë ë§¤ì¹­
    if (filterState.keyword) {
        const kw = filterState.keyword.toLowerCase();
        const bodyTxt = (p.title + ' ' + (p.category || '')).toLowerCase();
        if(!bodyTxt.includes(kw)) return false;
    }
    // 1. ëë¶ë¥ ì¹´íê³ ë¦¬ ì²´í¬
    if (filterState.category !== 'ì ì²´') {
        if (p.category !== filterState.category) return false;
    }
    
    // 2. ë¤ì¤ íí° ì²´í¬
    if (filterState.region !== 'ì ì²´' && p.region !== filterState.region) return false;
    if (filterState.condition !== 'ì ì²´' && p.condition !== filterState.condition) return false;
    if (filterState.cert !== 'ì ì²´' && p.cert !== filterState.cert) return false;
    if (filterState.tradeType !== 'ì ì²´') {
        if (filterState.tradeType === 'ì§ê±°ë' && p.tradeType !== 'ì§ê±°ë') return false;
        if (filterState.tradeType === 'ê²½ë§¤' && !p.auction) return false;
        if (filterState.tradeType === 'ê°ê²©ì ì' && !p.offer) return false;
    }
    // ìì²´ë³ íí°ë§
    if (filterState.supplier !== 'ì ì²´') {
        const titleStr = p.title || '';
        const match = titleStr.match(/^\[(.*?)\]/);
        const extractedSupplier = match ? match[1] : '';
        if (!extractedSupplier.includes(filterState.supplier) && !titleStr.includes(filterState.supplier)) {
            return false;
        }
    }
    // 3. ì»¤ì¤í ê°ê²©
    const valObj = p.price.replace(/[^0-9]/g, '');
    if (valObj) {
        const val = parseInt(valObj);
        if (filterState.minPrice !== null && val < filterState.minPrice) return false;
        if (filterState.maxPrice !== null && val > filterState.maxPrice) return false;
    }
    return true;
  });

  grid.innerHTML = '';

  // View Toggle based on 'ì ì²´' selection
  if (filterState.topCategory === 'ì ì²´' && filterState.keyword === '') {
      // Main Page Mode
      if(catArea) catArea.style.display = 'block'; // Show curated sub-categories on main page
      if(recArea) recArea.style.display = 'block';
      if(listTitle) listTitle.innerHTML = '<span class="section-title">ìµì  ì ì²´ ë§¤ë¬¼</span><span class="section-more">ëë³´ê¸° â</span>';
      
      const recList = document.getElementById('recommendation-list');
      const curList = document.getElementById('curation-list');
      
      if(recList && curList) {
          recList.innerHTML = ''; curList.innerHTML = '';
          const shuffled = [...filtered].sort(() => 0.5 - Math.random());
          const recItems = shuffled.slice(0, 4);
          const curItems = shuffled.slice(4, 8);
          
          if(recItems.length > 0) recItems.forEach(p => recList.innerHTML += createProductCardHTML(p));
          else recList.innerHTML = '<div style="padding: 60px 20px; font-size:13px; color:#999; text-align:center; width:100%;">ë±ë¡ë ë§¤ë¬¼ì´ ììµëë¤.</div>';
          
          if(curItems.length > 0) curItems.forEach(p => curList.innerHTML += createProductCardHTML(p));
          else curList.innerHTML = '<div style="padding: 60px 20px; font-size:13px; color:#999; text-align:center; width:100%;">ë±ë¡ë ë§¤ë¬¼ì´ ììµëë¤.</div>';
      }
      
  } else if (filterState.category === 'ì ì²´' && filterState.keyword === '') {
      // Specific Top-Category Curation
      if(catArea) catArea.style.display = 'block';
      if(recArea) recArea.style.display = 'block';
      if(listTitle) listTitle.innerHTML = '<span class="section-title"><span style="color:#1A5FA0; margin-right:6px; font-size:16px;">âª</span>ìµì  ë§¤ë¬¼</span><span class="section-more">ëë³´ê¸° â</span>';
      
      const recList = document.getElementById('recommendation-list');
      const curList = document.getElementById('curation-list');
      
      if(recList && curList) {
          recList.innerHTML = ''; curList.innerHTML = '';
          const shuffled = [...filtered].sort(() => 0.5 - Math.random());
          const recItems = shuffled.slice(0, 4);
          const curItems = shuffled.slice(4, 8);
          
          if(recItems.length > 0) recItems.forEach(p => recList.innerHTML += createProductCardHTML(p));
          else recList.innerHTML = '<div style="padding: 60px 20px; font-size:13px; color:#999; text-align:center; width:100%;">ì¡°ê±´ì ë§ë ë§¤ë¬¼ì´ ììµëë¤.</div>';
          
          if(curItems.length > 0) curItems.forEach(p => curList.innerHTML += createProductCardHTML(p));
          else curList.innerHTML = '<div style="padding: 60px 20px; font-size:13px; color:#999; text-align:center; width:100%;">ì¡°ê±´ì ë§ë ë§¤ë¬¼ì´ ììµëë¤.</div>';
      }
      
  } else {
      // Hide recommendations, show only filtered list
      if(catArea) catArea.style.display = 'block'; // ALWAYS SHOW CATEGORIES
      if(recArea) recArea.style.display = 'none';
      if(listTitle) listTitle.innerHTML = `<span class="section-title"><span style="color:#1A5FA0; margin-right:6px; font-size:16px;">âª</span>${filterState.category} ê²°ê³¼</span>`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 100px 20px; display:flex; align-items:center; justify-content:center; color: var(--text-muted); font-size: 14px;">ì íí ì¡°ê±´ì ë§ë ë§¤ë¬¼ì´ ììµëë¤.</div>';
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
          tag.textContent = 'ê²½ë§¤ ì¢ë£';
          tag.style.background = '#eee';
          tag.style.color = '#999';
       } else {
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          tag.textContent = `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')} ë¨ì`;
       }
    });
  }, 1000);


}

// setCategory function was completely removed as it caused reference errors and is now handled exclusively inside renderSubCategories

function updateFilterStyles() {
    // íí° ë¶ëª¨ ë¸ëë¤ ê°ì¡°ì ìë°ì´í¸
    document.querySelectorAll('.filter-dropdown').forEach(btn => {
        const target = btn.getAttribute('data-target');
        // ê°ê²© íí° í¹ìì²ë¦¬
        if (target === 'price') {
            if (filterState.minPrice !== null || filterState.maxPrice !== null) btn.classList.add('applied');
            else btn.classList.remove('applied');
            return;
        }
        // ì¼ë° í¨ë ì²ë¦¬
        if (filterState[target] && filterState[target] !== 'ì ì²´') {
            btn.classList.add('applied');
        } else {
            btn.classList.remove('applied');
        }
    });

    // ì¹© UI ìë°ì´í¸
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
    filterState.region = 'ì ì²´';
    filterState.condition = 'ì ì²´';
    filterState.cert = 'ì ì²´';
    filterState.tradeType = 'ì ì²´';
    filterState.supplier = 'ì ì²´';
    filterState.minPrice = null;
    filterState.maxPrice = null;

    const minInput = document.getElementById('min-price');
    const maxInput = document.getElementById('max-price');
    const searchInput = document.getElementById('search-input');
    if(minInput) minInput.value = '';
    if(maxInput) maxInput.value = '';
    if(searchInput) searchInput.value = '';

    // ë«ê¸°
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
    if (!KATEGORY_MAP[topCat]) topCat = 'ê¸°ë¶ì';
    if (['ìÂ·ê³¡ë¬¼', 'ì¡ë¥', 'ìì°ë¬¼', 'ì²­ê³¼ë¥', 'ê°ê³µÂ·ìë£', 'ì£¼/ë¶ì'].includes(catTrimmed)) {
        topCat = 'ì£¼/ë¶ì';
    }

    if (topCat === 'ì£¼/ë¶ì') {
        const storeMatch = p.title.match(/^\[(.*?)\]/);
        const storeName = storeMatch ? storeMatch[1] : 'ì¸ì¦ íë ¥ìì²´';
        
        actionArea = `
            <div style="background:#e6f4ea; border:1px solid #1E8E3E; padding:16px; border-radius:12px; margin-top:20px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="background:#1E8E3E; color:#fff; font-size:11px; padding:2px 6px; border-radius:4px; font-weight:700;">ì¶ì² ë²¤ë</div>
                    <span style="font-size:14px; font-weight:700; color:#1A2B4A;">${storeName}</span>
                </div>
                <div style="margin-top:6px; font-size:13px; color:#333; line-height:1.4;">ì´ ë¬¼íì í´ë¹ ì§ì­ì ì°ì ë²¤ëê° ë©íí©ëë¤. ëì¼ ìì²´ì ìíì ì¬ë¬ ê° ë´ì ê²¬ì ì ìì²­íìë©´ ë¬¼ë¥ë¹ê° ëí­ ì ê°ë©ëë¤.</div>
            </div>
            <div style="margin-top:16px; margin-bottom:24px; display:flex; flex-direction:column; gap:12px;">
                <button style="width:100%; padding:14px; border-radius:12px; background:#1E8E3E; color:#fff; font-size:15px; font-weight:700; border:none; cursor:pointer;" onclick="addToCart('${p.id}'); closeProductModal();">[${storeName}] ì ì© ê²¬ì  ì¥ë°êµ¬ëì ë´ê¸°</button>
            </div>
        `;
    } else if (topCat === 'ì ì©í' || topCat === 'ìì ì¥ë¹') {
        actionArea = `
            <div style="margin-top:20px; margin-bottom:24px; display:flex; gap:12px;">
                <button style="flex:1; padding:14px; border-radius:12px; background:#fff; color:#1A5FA0; border:1px solid #1A5FA0; font-size:15px; font-weight:700; cursor:pointer;" onclick="addToCart('${p.id}'); closeProductModal();">ê²¬ì  ì¥ë°êµ¬ë ë´ê¸°</button>
                <button style="flex:1; padding:14px; border-radius:12px; background:#1A5FA0; color:#fff; font-size:15px; font-weight:700; border:none; cursor:pointer;" onclick="startChat('${p.id}')">íë§¤ìì ë¤ê³ íê¸°</button>
            </div>
        `;
    } else {
        if (p.auction) {
            const displayPrice = p.current_bid ? p.current_bid.toLocaleString() : p.price.replace(/[^0-9]/g, '');
            const remainText = p.is_closed ? 'ê²½ë§¤ ì¢ë£ë¨' : (p.auction_end ? 'ë§ê°: ' + new Date(p.auction_end).toLocaleString() : 'ì§íì¤');
            
            actionArea = `
                <div style="background:#F4F9FF; border:1px solid #1A5FA0; padding:16px; border-radius:12px; margin-top:20px; margin-bottom:24px;">
                    <div style="color:#1A5FA0; font-size:12px; font-weight:700; margin-bottom:8px;">ð¥ ìµê³  ìì°°ìë§ì´ ëì°°ìê° ë©ëë¤!</div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-size:13px; color:#7A93B0;">íì¬ ìµê³ ê° (ìì°° ${p.bid_count || 0}í)</span>
                        <span style="font-size:20px; font-weight:800; color:#1A2B4A;">â© ${displayPrice}</span>
                    </div>
                    <div style="font-size:12px; color:#E53E3E; font-weight:600; margin-bottom:16px;">${remainText}</div>
                    
                    ${p.is_closed ? `<button style="width:100%; padding:14px; border-radius:12px; background:#EAEDF2; color:#7A93B0; font-size:15px; font-weight:700; border:none;" disabled>ë§ê°ë ê²½ë§¤ìëë¤</button>` : `
                    <div style="display:flex; gap:8px; margin-bottom:12px;">
                        <button type="button" onclick="document.getElementById('bid-amount').value = ${parseInt(displayPrice.replace(/,/g,'')) + 10000}" style="flex:1; padding:10px; background:#fff; border:1px solid #1A5FA0; color:#1A5FA0; border-radius:8px; font-weight:600; cursor:pointer;">+ 1ë§ì</button>
                        <button type="button" onclick="document.getElementById('bid-amount').value = ${parseInt(displayPrice.replace(/,/g,'')) + 50000}" style="flex:1; padding:10px; background:#fff; border:1px solid #1A5FA0; color:#1A5FA0; border-radius:8px; font-weight:600; cursor:pointer;">+ 5ë§ì</button>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <input type="number" id="bid-amount" placeholder="í¬ë§ê° ìë ¥" style="flex:1; padding:12px 14px; border:1px solid #ccc; border-radius:8px; outline:none; font-size:15px; font-weight:600;">
                        <button onclick="submitBid('${p.id}')" class="auction-bid-btn" style="background:#D4960A; color:#fff; border:none; border-radius:8px; padding:0 24px; font-weight:700; font-size:15px; cursor:pointer;">ìì°°</button>
                    </div>
                    `}
                </div>
            `;
        } else {
            actionArea = `
                <div style="margin-top:20px; margin-bottom:24px; display:flex; gap:12px;">
                    <button style="flex:1; padding:14px; border-radius:12px; background:#1A5FA0; color:#fff; font-size:15px; font-weight:700; border:none; cursor:pointer;" onclick="startChat('${p.id}')">íë§¤ìì ì±ííê¸°</button>
                </div>
            `;
        }
    }
    
    const safeContent = p.content && p.content !== 'undefined' ? p.content : 'ìì¸ ì¤ëªì´ ììµëë¤.';
    
    body.innerHTML = `
        <div style="width:100%; aspect-ratio:4/3; background:#f4f4f4; border-radius:0 0 12px 12px; overflow:hidden; margin-bottom:16px; position:relative;">
            ${p.svg}
            <div id="modal-heart-btn" onclick="toggleLike('${p.id}')" style="position:absolute; bottom:12px; right:12px; width:40px; height:40px; background:rgba(255,255,255,0.9); border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; box-shadow:0 2px 8px rgba(0,0,0,0.1); transition:transform 0.1s;">ð¤</div>
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
                <div style="width:40px; height:40px; border-radius:50%; background:#1A5FA0; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700;">í</div>
                <div>
                    <div style="font-size:13px; font-weight:700; color:#1A2B4A;">íë§¤ì ì ë³´ (ë³´í¸ë¨)</div>
                    <div style="font-size:11px; color:#7A93B0;">ìì ê±°ë ì¬ì© ì°ì íë§¤ì</div>
                </div>
            </div>
            
            <div style="margin-top:20px; white-space:pre-wrap; font-size:14px; color:#1A2B4A; line-height:1.6;">${safeContent}</div>
            ${actionArea}
        </div>
    `;
    
    // ëª¨ë¬ì´ ì´ë¦¬ë©´ íì¬ ì¬ì©ìê° ì°íëì§ ê²ì¬
    checkLikeStatus(p.id);
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

let currentQuoteProductId = null;
function requestQuote(id) {
    if(!currentUser) {
        alert('ê²¬ì ì ìì²­ì ë¡ê·¸ì¸ì´ íìí©ëë¤.');
        showPage('login');
        return;
    }
    currentQuoteProductId = id;
    document.getElementById('quote-modal').style.display = 'flex';
}

function submitQuoteRequest() {
    alert('í´ë§ ë²¤ë ìì¤íì¼ë¡ ê²¬ì  ìì²­ì´ ì±ê³µì ì¼ë¡ ì ìëììµëë¤.\\në¹ ë¥¸ ìì¼ ë´ì ì ë°ì ë©ì¼/ìì¤íì¼ë¡ ê²¬ì ìê° ëì°©í©ëë¤!');
    document.getElementById('quote-modal').style.display = 'none';
}

async function submitBid(id) {
    if(!currentUser) {
        alert("ê²½ë§¤ ìì°°ì ë¡ê·¸ì¸ì´ íìí©ëë¤.");
        showPage('login');
        return;
    }

    const p = products.find(x => String(x.id) === String(id));
    if(!p) return;
    
    if(p.is_closed) {
        alert("ì´ë¯¸ ë§ê°ë ê²½ë§¤ìëë¤.");
        return;
    }
    
    if(p.seller_id === currentUser.id) {
        alert("ë¹ì¬ìì ë§¤ë¬¼ìë ìì°°í  ì ììµëë¤.");
        return;
    }
    
    const bidInput = document.getElementById('bid-amount');
    const newBidStr = bidInput ? bidInput.value : null;
    if(!newBidStr) {
        alert("ìì°° í¬ë§ê°ë¥¼ ìë ¥í´ì£¼ì¸ì.");
        return;
    }
    
    const newBid = parseInt(newBidStr, 10);
    const curr = p.current_bid || parseInt(p.price.replace(/[^0-9]/g, '')) || 0;
    
    if(newBid <= curr) {
        alert(`íì¬ ìµê³ ê°(â©${curr.toLocaleString()})ë³´ë¤ ëì ê¸ì¡ì ìë ¥íìì¼ í©ëë¤.`);
        return;
    }

    const count = p.bid_count || 0;
    
    const bidderName = currentUser.user_metadata?.biz_name || currentUser.user_metadata?.display_name || currentUser.email.split('@')[0];
    
    const btn = document.querySelector('.auction-bid-btn');
    if(btn) btn.textContent = 'ìì°° ì²ë¦¬ì¤...';
    
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
        alert('ìì°° ì¤ ì¤ë¥ê° ë°ìíìµëë¤: ' + error.message);
        if(btn) btn.textContent = 'ìì°°';
        return;
    }
    
    alert('ì±ê³µì ì¼ë¡ ìì°°ëììµëë¤!');
    closeProductModal();
    initTopCategory();
    fetchProducts();
}


// ìë²ìì ë§¤ë¬¼ ë¶ë¬ì¤ê¸°
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
    
    // DB ìë°ì´í¸ ìë (Atomic)
    const { error } = await supabaseClient.from('haema_products')
        .update({ is_closed: true })
        .eq('id', p.id)
        .eq('is_closed', false);
        
    if(!error) {
        p.is_closed = true; // ë¡ì»¬ ë°ì
        if (currentUser && currentUser.id === p.highest_bidder_id) {
            alert(`ð ì¶íí©ëë¤! [${p.title}] ê²½ë§¤ì ìµì¢ ëì°°ëì¨ìµëë¤!\\n(ëì°°ê°: â© ${p.current_bid ? p.current_bid.toLocaleString() : 'íì¸ ë¶ê°'})`);
        }
        else if (currentUser && currentUser.id === p.seller_id) {
            alert(`ð ë±ë¡íì  [${p.title}] ê²½ë§¤ê° ë§ê°ëììµëë¤.\\n(ìµì¢ ìì°°ì: ${p.highest_bidder_name})`);
        }
        initTopCategory();
    fetchProducts(); // ë¦¬ì¤í¸ ê°±ì 
        closeProductModal(); // ì´ë ¤ìë¤ë©´ ë«ê¸°
    }
}

// 5ì´ ì£¼ê¸°ë¡ ëª¨ë  ë§¤ë¬¼ì ë§ê° ìê°ì ì²´í¬íì¬ ìí°ë¥¼ ë«ë ê°ìì
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


// íë§¤ì ì¤ DB ë§¤ë¬¼ ë±ë¡
async function registerProduct() {
  const cat = document.querySelector('#page-register .form-select').value;
  const title = document.getElementById('title-input').value;
  let tradeType = 'ì§ê±°ë';
  document.querySelectorAll('#page-register .trade-chip').forEach(c => {
      if(c.classList.contains('on')) tradeType = c.textContent.trim();
  });
  
  let conditionStr = 'ìµì';
  document.querySelectorAll('#page-register .cond-chip').forEach(c => {
      if(c.classList.contains('on')) conditionStr = c.textContent.trim();
  });

  const priceInput = document.getElementById('price-input').value || '';
  const priceParsed = parseInt(priceInput.replace(/[^0-9]/g, '')) || 0;
  
  const regionInput = document.getElementById('region-input');
  const regionVal = regionInput ? regionInput.value : 'ë¶ì°';
  
  if (!title || cat === 'ì¹´íê³ ë¦¬ ì í') { alert('ìíëªê³¼ ì¹´íê³ ë¦¬ë íììëë¤.'); return; }
  
  const isAuction = tradeType === 'ê²½ë§¤';
  const endInput = document.getElementById('auction-end-input').value;
  if(isAuction && !endInput) { alert('ê²½ë§¤ ë§ê°ì¼ìë¥¼ ì¤ì í´ì£¼ì¸ì.'); return; }

  const submitBtn = document.querySelector('#page-register .submit-btn');
  submitBtn.textContent = 'ì ì¥ì ì°ê²° ì¤...';
  submitBtn.disabled = true;

  let finalImageUrl = null;
  
  if (uploadedBlob) {
      submitBtn.textContent = 'ì¬ì§ í´ë¼ì°ë ìë¡ë ì¤...';
      const fileName = `public/product_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('market_images')
          .upload(fileName, uploadedBlob, {
              contentType: 'image/jpeg'
          });
          
      if (uploadError) {
          alert('ì¬ì§ ìë¡ë ì¤í¨ (ë²í·ì´ Public ìíì¸ì§ íì¸í´ì£¼ì¸ì): ' + uploadError.message);
          submitBtn.textContent = 'ë±ë¡íê¸°';
          submitBtn.disabled = false;
          return;
      }
      
      const { data: publicData } = supabaseClient.storage.from('market_images').getPublicUrl(fileName);
      finalImageUrl = publicData.publicUrl;
  }
  
  let finalSvg = finalImageUrl ? `<img src="${finalImageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">` : '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="20" width="32" height="18" rx="3" stroke="#D4960A" stroke-width="1.5"/><path d="M14 20v-4a10 10 0 0120 0v4" stroke="#D4960A" stroke-width="1.5"/></svg>';

  let newProd = {
    title: title,
    sub: 'ë°©ê¸ ì  ë±ë¡',
    price: priceInput ? ('â© ' + priceInput.replace('â©','').trim()) : 'â© íì ê°ë¥',
    category: cat,
    "tradeType": tradeType,
    region: regionVal, // ì¬ì©ì ì í
    seller_id: currentUser ? currentUser.id : null,
    condition: conditionStr,
    cert: 'ìì',
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
  
  submitBtn.textContent = 'ë±ë¡íê¸°';
  submitBtn.disabled = false;

  if (error) {
     alert('ë±ë¡ ì¤ ìë¬ê° ë°ìíìµëë¤: ' + error.message);
     return;
  }

  // í¼ ì´ê¸°í
  document.getElementById('title-input').value = '';
  document.getElementById('price-input').value = '';
  document.getElementById('photo-upload-input').value = '';
  uploadedBase64 = null;
  uploadedBlob = null;
  const mainBox = document.getElementById('photo-box-main');
  if(mainBox) {
      mainBox.style.backgroundImage = 'none';
      mainBox.innerHTML = '<span class="photo-plus">+</span><span class="photo-main-label">ëíì¬ì§</span>';
  }
  
  alert('ë§¤ë¬¼ì´ ì±ê³µì ì¼ë¡ ë±ë¡ëììµëë¤! ð\n(íë¨ ê²½ë§¤ í­ììë ë°ë¡ íì¸íì¤ ì ììµëë¤.)');
  
  filterState.category = 'ì ì²´';
  renderSubCategories(filterState.topCategory);
  resetFilters();
  showPage('home');
  window.scrollTo(0, 0);

  // ë±ë¡ ì§í ìµì  ë°ì´í°ë² ì´ì¤ ë¦¬ì¤í¸ ê°ì ¸ì¤ê¸°
  await fetchProducts();
}
// --- ì¥ë°êµ¬ë ê¸°ë¥ ìì ---
function addToCart(productId) {
    const existingIndex = userCart.findIndex(item => String(item.id) === String(productId));
    if (existingIndex > -1) {
        userCart[existingIndex].qty += 1;
    } else {
        userCart.push({ id: productId, qty: 1 });
    }
    saveCart();
    alert('ð ì¥ë°êµ¬ëì ë´ê²¼ìµëë¤.');
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
        area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">ì¥ë°êµ¬ëê° ë¹ì´ììµëë¤.</div>';
        if(totalCountEl) totalCountEl.textContent = '0ê°';
        return;
    }
    
    // Group by supplier
    const groups = {};
    let totalItems = 0;
    
    userCart.forEach(cartItem => {
        const product = products.find(p => String(p.id) === String(cartItem.id));
        if(!product) return;
        
        const storeMatch = (product.title||'').match(/^\\[(.*?)\\]/);
        const storeName = storeMatch ? storeMatch[1] : 'ì¼ë° ìì²´';
        
        if(!groups[storeName]) groups[storeName] = [];
        groups[storeName].push({ cartItem, product });
        totalItems += cartItem.qty;
    });
    
    if(totalCountEl) totalCountEl.textContent = totalItems + 'ê°';
    
    let html = '';
    for(const [storeName, items] of Object.entries(groups)) {
        html += `
            <div style="background:#fff; border-radius:16px; padding:16px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.03); border:1px solid #eaedf2;">
                <div style="font-size:14px; font-weight:800; color:#1A2B4A; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#1A2B4A" stroke-width="2"/><path d="M12 12v6m-4-6v6m8-6v6" stroke="#1A2B4A" stroke-width="2"/></svg>
                    [${storeName}] ë°°ì¡
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
                        <div style="font-size:14px; font-weight:800; color:#1A5FA0;">â© ${parseInt(displayPrice||0).toLocaleString()}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; justify-content:space-between;">
                        <button onclick="removeCartItem('${p.id}')" style="background:none; border:none; color:#999; font-size:16px; cursor:pointer; padding:0;">â</button>
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
        alert('ì¥ë°êµ¬ëê° ë¹ì´ììµëë¤.');
        return;
    }
    if (!currentUser) {
        alert('ê²¬ì ìë¥¼ ë°ì£¼íìë ¤ë©´ ë¡ê·¸ì¸ì´ íìí©ëë¤.');
        showPage('login');
        return;
    }

    // ìì²´(Vendor)ë³ë¡ ë¬¼ê±´ì ë¬¶ê¸°
    const groups = {};
    userCart.forEach(cartItem => {
        const product = products.find(p => String(p.id) === String(cartItem.id));
        if(!product) return;
        
        const storeMatch = (product.title||'').match(/^\[(.*?)\]/);
        const storeName = storeMatch ? storeMatch[1] : 'ì¼ë° ìì²´';
        
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

        alert('â ì±ê³µì ì¼ë¡ ê²¬ì  ìì²­ì´ ì ìëììµëë¤.');
        userCart = [];
        saveCart();
        renderCartPage();
        showPage('home');
    } catch (err) {
        if (err.message.includes('relation "public.haema_quotes" does not exist')) {
            alert('â ï¸ ìë¬: DBì [haema_quotes] íì´ë¸ì´ ìì§ ìì±ëì§ ìììµëë¤. ê´ë¦¬ììê² ë¬¸ìíì¸ì.');
        } else {
            alert('ê²¬ì  ìì²­ ì¤ ì¤ë¥ê° ë°ìíìµëë¤: ' + err.message);
        }
    }
}
// --- ì¥ë°êµ¬ë ê¸°ë¥ ë ---

document.addEventListener('DOMContentLoaded', () => {
    renderCartBadge();
    initTopCategory();
    fetchProducts();
    updateFilterStyles();

    // í¤ìë ë¼ì´ë¸ ê²ì (ëë°ì´ì¤ ìµì í ëì - ë©ëª¨ë¦¬ ì ì½)
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
            }, 250); // 250ms ëê¸° í ë ëë§ í¸ì¶
        });
    }

    // ì­ì ë ê¸ë¡ë² ì´ë²¤í¸ ë°ì¸ë© (ì´ì  renderSubCategoriesììì ê°ê° ë°ì¸ë©ë¨)

    // ëë¡­ë¤ì´ í ê¸ ë§¤ëì 
    document.querySelectorAll('.filter-dropdown').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = 'panel-' + btn.getAttribute('data-target');
            const isActive = btn.classList.contains('open');

            // ëª¨ë ì´ê¸°í (ì ê¸°)
            document.querySelectorAll('.filter-dropdown').forEach(b => b.classList.remove('open'));
            document.querySelectorAll('.filter-panel').forEach(p => p.classList.remove('show'));
            
            // í ê¸ ë¡ì§
            if (!isActive) {
                btn.classList.add('open');
                document.getElementById(targetId).classList.add('show');
                document.querySelector('.filter-panels').classList.add('show');
            } else {
                document.querySelector('.filter-panels').classList.remove('show');
            }
        });
    });

    // ì´ê¸°í ë²í¼
    const resetBtn = document.querySelector('.filter-reset');
    if(resetBtn) resetBtn.addEventListener('click', resetFilters);

    // ì´ë²¤í¸ ë¦¬ì¤ë ë±ë¡ ì ì¬ì©í  tradeChips (Registration Form ì©)
    const formTradeChips = document.querySelectorAll('#page-register .trade-chip');
    
    // ê±°ë ë°©ì ì¹© ë¡ì§
    formTradeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            formTradeChips.forEach(c => c.classList.remove('on'));
            chip.classList.add('on');
            
            const isAuction = chip.textContent.trim() === 'ê²½ë§¤';
            document.getElementById('auction-date-row').style.display = isAuction ? 'block' : 'none';
            document.getElementById('price-label').innerHTML = isAuction ? 'ê²½ë§¤ ììê°<span>*</span>' : 'íë§¤ í¬ë§ê°<span>*</span>';
        });
    });

    // ë§¤ë¬¼ ìí ì¹©
    const condChips = document.querySelectorAll('#page-register .cond-chip');
    condChips.forEach(chip => {
        chip.addEventListener('click', () => {
            condChips.forEach(c => c.classList.remove('on'));
            chip.classList.add('on');
        });
    });
    
    // ìë¸ ì¹© ìí¸ìì© (íí°)
    document.querySelectorAll('.f-sub-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const key = chip.getAttribute('data-key');
            const val = chip.getAttribute('data-val');
            applySubFilter(key, val);
        });
    });
    
    // ê°ê²© ë²ì ì§ì (Price Filter) ì ì©
    const priceApplyBtn = document.getElementById('price-apply');
    if(priceApplyBtn) {
        priceApplyBtn.addEventListener('click', () => {
            const minVal = document.getElementById('min-price').value;
            const maxVal = document.getElementById('max-price').value;
            filterState.minPrice = minVal ? parseInt(minVal, 10) : null;
            filterState.maxPrice = maxVal ? parseInt(maxVal, 10) : null;
            updateFilterStyles();
            renderProducts();
            
            // ìê°ì  í¼ëë°±
            priceApplyBtn.textContent = 'ì ì©ë¨â';
            priceApplyBtn.style.background = '#1E8E3E';
            setTimeout(() => {
                priceApplyBtn.textContent = 'ë²ì ì ì©';
                priceApplyBtn.style.background = 'var(--blue-800)';
            }, 1000);
        });
    }
    
        // ë§¤ë¬¼ ì¬ì§ ìë¡ë (Base64 ë³í)
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

    // ë§¤ë¬¼ ë±ë¡ ë²í¼ ë¦¬ì¤ë
    const submitBtn = document.querySelector('#page-register .submit-btn');
    if(submitBtn) {
        submitBtn.addEventListener('click', registerProduct);
    }
});

// ==== ì¤ìê° ì±í ë¡ì§ ====
let currentChatProduct = null;
let currentChatSubscription = null;




// ==== ë´ê° ì¬ë¦° ë§¤ë¬¼ (íë§¤ ëª©ë¡) ë¡ì§ ====
// ==== ì»¤ë®¤ëí° í­ ë ëë§ ë¡ì§ ====
window.renderCommunityPosts = async function() {
    const area = document.getElementById('community-content-area');
    if(!area) return;
    
    area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">ê²ìê¸ì ë¶ë¬ì¤ë ì¤ìëë¤...</div>';

    const { data: posts, error } = await supabaseClient
        .from('haema_posts')
        .select('*')
        .order('created_at', { ascending: false });
        
    if(error) {
        area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:red; text-align:center;">ê²ìê¸ì ë¶ë¬ì¤ì§ ëª»íìµëë¤.</div>';
        return;
    }
    
    if(!posts || posts.length === 0) {
        area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">ë±ë¡ë ì»¤ë®¤ëí° ê¸ì´ ììµëë¤.</div>';
        return;
    }

    let filteredPosts = posts;
    if (filterState.keyword) {
        const kw = filterState.keyword.toLowerCase();
        filteredPosts = posts.filter(p => p.title.toLowerCase().includes(kw) || p.content.toLowerCase().includes(kw));
    }
    
    if (window.currentCommTag && window.currentCommTag !== 'ì ì²´') {
        filteredPosts = filteredPosts.filter(p => p.tag === window.currentCommTag);
    }

    if (filteredPosts.length === 0) {
        area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">ê²ìë ê²ìê¸ì´ ììµëë¤.</div>';
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
                        <span>Â· ë°©ê¸ ì </span>
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
        alert('ë¡ê·¸ì¸ì´ íìí ê¸°ë¥ìëë¤.');
        return showPage('login');
    }
    
    showPage('myquotes');
    const area = document.getElementById('myquotes-content-area');
    area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">ëª©ë¡ì ë¶ë¬ì¤ë ì¤ìëë¤...</div>';

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
                    <div style="font-size:48px; margin-bottom:16px;">ð</div>
                    <div style="font-size:16px; font-weight:700; color:#1A2B4A; margin-bottom:8px;">ìì²­í ê²¬ì  ë´ì­ì´ ììµëë¤</div>
                    <div style="font-size:14px; color:#7A93B0;">ì¥ë°êµ¬ëë¥¼ íµí´ ìì²´ë¥¼ ë¬¶ì´ì<br>í¸ë¦¬íê² ê²¬ì ì ìì²­í´ ë³´ì¸ì.</div>
                </div>
            `;
            return;
        }

        let html = '';
        data.forEach(q => {
            const dateObj = new Date(q.created_at);
            const dateStr = dateObj.toLocaleDateString('ko-KR') + ' ' + dateObj.toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'});
            
            let statusText = 'ê²°ì /ê²¬ì  ëê¸°ì¤';
            let statusColor = '#F57C00';
            let statusBg = '#FFF3E0';
            if(q.status === 'replied') {
                statusText = 'ëµë³ ìë£ (ì¹ì¸)';
                statusColor = '#1E8E3E';
                statusBg = '#E8F5E9';
            } else if(q.status === 'completed') {
                statusText = 'ê³ì½/ê²°ì  ìë£';
                statusColor = '#1A5FA0';
                statusBg = '#F4F9FF';
            }

            // items summary
            let itemSummary = 'ìí ë´ì© ìì';
            if(q.items && q.items.length > 0) {
                const firstTitle = q.items[0].title;
                const totalQty = q.items.reduce((acc, curr) => acc + (curr.qty || 1), 0);
                if(q.items.length === 1) {
                    itemSummary = `${firstTitle} (${totalQty}ê°)`;
                } else {
                    itemSummary = `${firstTitle} ì¸ ${q.items.length - 1}ê±´ (ì´ ${totalQty}ê°)`;
                }
            }

            html += `
                <div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid #eaedf2; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div>
                            <div style="font-size:12px; color:#7A93B0; margin-bottom:4px;">${dateStr} ë°ì£¼</div>
                            <div style="font-size:15px; font-weight:800; color:#1A2B4A; display:flex; align-items:center; gap:4px;">
                                ð¢ [${q.vendor_name}]
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
                        <button style="background:#fff; border:1px solid #eaedf2; border-radius:6px; padding:6px 10px; font-size:12px; font-weight:700; color:#1A5FA0; cursor:pointer;" onclick="alert('íëª© ìì¸ ë´ì­ íì¸ ê¸°ë¥ì ì¶í ì°ëë©ëë¤.')">ìì¸ë³´ê¸°</button>
                    </div>
                </div>
            `;
        });
        
        area.innerHTML = html;

    } catch(err) {
        area.innerHTML = `<div style="padding: 60px 20px; font-size:14px; color:#D32F2F; text-align:center;">ì¤ë¥ê° ë°ìíìµëë¤:<br>${err.message}</div>`;
    }
}

function showMyList() {
    if(!currentUser) {
        alert("ë¡ê·¸ì¸ì´ íìí ê¸°ë¥ìëë¤.");
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
                <div style="font-size:32px; margin-bottom:12px;">ð³ï¸</div>
                <div>ìì§ ë±ë¡íì  íë§¤ ë§¤ë¬¼ì´ ììµëë¤.</div>
                <div style="margin-top:16px;">
                    <button onclick="requireAuthAndShow('register')" style="padding: 10px 20px; background:var(--blue-50); color:var(--blue-800); border:1px solid var(--blue-200); border-radius:8px; cursor:pointer; font-weight:700;">ì²« íë§¤ê¸ ìì±íê¸°</button>
                </div>
            </div>`;
        return;
    }
    
    myProducts.forEach((p, idx) => {
        const adNum = idx + 1;
        
        let tagsHtml = '';
        if(p.auction) {
            tagsHtml += `<span class="ptag ptag-y" style="background:#1A2B4A; color:#fff;">ê²½ë§¤ ${p.bid_count}í</span> `;
        }
        if(p.offer) tagsHtml += `<span class="ptag ptag-b">ê°ê²©ì ì</span> `;
        if(!p.auction && !p.offer) tagsHtml += `<span class="ptag" style="background:#EAEDF2; color:#7A93B0;">ì§ê±°ë</span> `;

        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.cursor = 'pointer';
        card.onclick = () => openProductModal(p.id);
        
        card.innerHTML = `
          <div class="product-img">${p.svg}</div>
          <div class="product-body">
            <div class="product-sub">${p.region} Â· ${p.condition}</div>
            <div class="product-title">${p.title}</div>
            <div class="product-price">${p.price}</div>
            <div class="product-tags">${tagsHtml}</div>
          </div>
        `;
        container.appendChild(card);
    });
}


// ==== íë¡í UI ìë ë ëë§ ====
function updateProfileUI() {
    if(!currentUser) {
        const pName = document.getElementById('profile-name');
        if(pName) pName.textContent = "ë¡ê·¸ì¸ í´ì£¼ì¸ì";
        const pEmail = document.getElementById('profile-email');
        if(pEmail) pEmail.textContent = "";
        const pAv = document.getElementById('profile-avatar');
        if(pAv) pAv.textContent = "ð¤";
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
            rBadge.textContent = metaRegion + " (ì¸ì¦ë¨)";
            rBadge.style.background = "#E6F4EA";
            rBadge.style.color = "#1E8E3E";
        } else if(metaRegion) {
            rBadge.textContent = metaRegion + " (ë¯¸ì¸ì¦)";
            rBadge.style.background = "#FFFBEA";
            rBadge.style.color = "#D4960A";
        } else {
            rBadge.textContent = "ì§ì­ ë¯¸ì¤ì ";
            rBadge.style.background = "#EAEDF2";
            rBadge.style.color = "#7A93B0";
        }
    }
    
    // ì¬ìì ë±ì§ ì°ë
    const isBiz = currentUser.user_metadata?.is_business;
    const bBadge = document.getElementById('profile-biz-badge');
    const bStatus = document.getElementById('biz-auth-status');
    if(bBadge) {
        if(isBiz) {
            bBadge.textContent = "ð¢ ì ë¢° ê¸°ì";
            bBadge.style.background = "var(--blue-600)";
            bBadge.style.color = "white";
            bBadge.style.border = "none";
            if(bStatus) bStatus.style.display = "inline-block";
        } else {
            bBadge.textContent = "ì¼ë° íì";
            bBadge.style.background = "#EAEDF2";
            bBadge.style.color = "#7A93B0";
            if(bStatus) bStatus.style.display = "none";
        }
    }

    // ë§¤ëì¨ë ë¹ëê¸° ë¡ë
    fetchAndRenderMannerTemp();
}

async function fetchAndRenderMannerTemp() {
    if(!currentUser) return;
    
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


// ==== íë¡í ê´ë ¨ ëì ====
function openProfileEdit() {
    if(!currentUser) return;
    showPage('profile-edit');
    
    // ë¦¬ì
    tempVerifiedRegion = null;
    const btn = document.getElementById('btn-gps-verify');
    btn.textContent = "ë´ ìì¹ ê²ì¦";
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
            // ì´ë¯¸ ì´ì ì ì¸ì¦í ê¸°ë¡ì´ ìë¤ë©´
            tempVerifiedRegion = metaRegion;
            regionSelector.disabled = true;
            btn.textContent = "â ê¸°ì¸ì¦ ì§ì­";
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
        alert('ëë¤ìì ë¨¼ì  ìë ¥í´ì£¼ì¸ì.');
        return;
    }
    
    btn.textContent = 'ë©íë°ì´í° êµ½ë ì¤...';
    btn.disabled = true;
    
    let isVeri = (tempVerifiedRegion !== null && tempVerifiedRegion === selectedRegion);
    if(selectedRegion && !isVeri) {
        // ì§ì­ì ê³¨ëëë° ì¸ì¦ë²í¼ì ìëë ê±°ë ì¤í¨í ê²½ì°, ì¼ë¨ ì ì¥ì íë ë¯¸ì¸ì¦ ìíë¡ ê¸°ë¡
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
    btn.textContent = 'ì ì¥íê³  ëìê°ê¸°';
    
    if(error) {
        console.error("Profile save error:", error);
        alert('íë¡í ë³ê²½ ì¤ ì¤ë¥ê° ë°ìíìµëë¤.');
    } else {
        // ì±ê³µ ì ì¸ì ì¦ê° ëê¸°í ë° ë¤ë¡ê°ê¸°
        currentUser = data.user;
        updateProfileUI();
        showPage('mypage');
    }
}


// ==== ìì¹ ì¸ì¦ ë¡ì§ ====
let tempVerifiedRegion = null;

async function verifyGPSLocation() {
    const selector = document.getElementById('edit-region-select');
    const selectedRegion = selector.value;
    const btn = document.getElementById('btn-gps-verify');
    
    if(!selectedRegion) {
        alert("ìíìë íë ì§ì­(ì/ë)ì ì°ì  ì íí´ì£¼ì¸ì.");
        return;
    }
    
    if (!navigator.geolocation) {
        alert("ì ìíì  ê¸°ê¸° ëë ë¸ë¼ì°ì ê° ìì¹ ì¤ìº ê¸°ë¥ì ì§ìíì§ ììµëë¤.");
        return;
    }
    
    btn.textContent = "ìì¹ ì¤ìº ì¤...";
    btn.disabled = true;
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        try {
            // ë¬´ë£ Reverse Geocoding API ì²´ì¸ í¸ì¶
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`);
            const data = await response.json();
            
            // principalSubdivision : "ìì¸í¹ë³ì", "ê²½ê¸°ë", "ë¶ì°ê´ì­ì" ë± ì¶ì¶
            const geoRegion = data.principalSubdivision || data.city || "";
            
            let isMatch = false;
            if(geoRegion.includes(selectedRegion)) {
                isMatch = true;
            } else {
                // ë¨ì¶ì´ ìì ì¥ì¹
                const shortcuts = {
                    "ê²½ê¸°": "ê²½ê¸°ë", "ê°ì": "ê°ì", "ì¶©ë¶": "ì¶©ì²­ë¶ë", "ì¶©ë¨": "ì¶©ì²­ë¨ë",
                    "ì ë¶": "ì ë¼ë¶ë", "ì ë¨": "ì ë¼ë¨ë", "ê²½ë¶": "ê²½ìë¶ë", "ê²½ë¨": "ê²½ìë¨ë", "ì ì£¼": "ì ì£¼"
                };
                if(shortcuts[selectedRegion] && geoRegion.includes(shortcuts[selectedRegion])) {
                    isMatch = true;
                }
            }
            
            if(isMatch) {
                alert(`íì¬ ì ì ìì¹ê° [${geoRegion}]ë¡ íì¸ëììµëë¤.`);
                tempVerifiedRegion = selectedRegion;
                btn.textContent = "ìì¹ íì¸ ìë£";
                btn.style.background = "#E6F4EA";
                btn.style.color = "#1E8E3E";
                btn.style.borderColor = "#1E8E3E";
                selector.disabled = true; // ë½í¹
            } else {
                alert(`ì í ì§ì­(${selectedRegion})ê³¼ íì¬ ìì¹(${geoRegion})ê° ë¤ë¦ëë¤.`);
                btn.textContent = "ë¤ì ì¸ì¦íê¸°";
                btn.disabled = false;
            }
        } catch(e) {
            alert("ìë²ì íµì  ì¤ ì¤ë¥ê° ë°ìíìµëë¤. ì ì í ìëí´ì£¼ì¸ì.");
            btn.textContent = "ð ìì¹ ì¬ê²ì¦";
            btn.disabled = false;
        }
    }, (error) => {
        alert("ìì¹ ì ë³´ë¥¼ ê°ì ¸ì¬ ì ììµëë¤. ê¸°ê¸°ì ìì¹ ê¶íì íì©í´ì£¼ì¸ì.");
        btn.textContent = "ð ìì¹ ê¶í ì¬ìì²­";
        btn.disabled = false;
    });
}


// ==== ì¬ìì ì¸ì¦ ë¡ì§ ====
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
        if(nameDisplay) nameDisplay.textContent = bizName ? bizName : "ì¸ì¦ë í´ë§ë§ì¼ ê¸°ì";
        if(numDisplay) {
            // ìì¬ ë§ì¤í¹ ì²ë¦¬ (ì: 123-45-67890 -> 123-45-***** )
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
        alert("êµ­ì¸ì²­ ê²ì¦ì ìí´ ìí¸ëª(ê¸°ìëª)ì ë¨¼ì  ìë ¥í´ì£¼ì¸ì.");
        return;
    }
    
    if(val.length !== 10) {
        alert("íì´í(-)ì ë¶ë¦¬í ì¨ì í 10ìë¦¬ ì¬ììë±ë¡ë²í¸ë¥¼ ìë ¥í´ì£¼ì¸ì.");
        return;
    }
    
    const btn = document.querySelector('#page-business-auth .submit-btn');
    btn.textContent = "êµ­ì¸ì²­ Live DB ì¡°í ì¤...";
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
            
            // 01: ê³ìì¬ìì, 02: í´ìì, 03: íìì
            if(bizData.b_stt_cd === "01") { 
                // DB ìë°ì´í¸ ì±ê³µ
                const { data, error } = await supabaseClient.auth.updateUser({
                    data: { is_business: true, biz_number: val, biz_name: nameVal }
                });
                
                if(error) throw new Error("ìë² íë¡í ìë°ì´í¸ ìë¬");
                
                alert('ì¬ìì ì¸ì¦ ì±ê³µ!');
                currentUser = data.user;
                updateProfileUI(); // Reload UI
                showPage('mypage');
                if(inputEl) inputEl.value = "";
                if(nameEl) nameEl.value = "";
            } else if (bizData.b_stt_cd === "02" || bizData.b_stt_cd === "03") {
                alert(`â ì¸ì¦ ê±°ë¶: íì¬ êµ­ì¸ì²­ì [${bizData.b_stt}] ìíë¡ ì¡°íëì´ ê±°ë ì¸ì¦ì´ ë¶ê°í©ëë¤.`);
            } else {
                alert(`â ì¸ì¦ ì¤í¨: êµ­ì¸ì²­ì ë±ë¡ëì§ ìì íì ì¬ììë±ë¡ë²í¸ì´ê±°ë ì¡°íí  ì ììµëë¤. (ìëµ: ${bizData.tax_type})`);
            }
        } else {
            throw new Error("Invalid API Response");
        }
    } catch(err) {
        console.error("NTS API ì°ë ìë¬:", err);
        alert("êµ­ì¸ì²­ ìë² ì¥ì  ëë íµì  ìë¬ê° ë°ìíìµëë¤. ì ì í ìëí´ì£¼ì¸ì.");
    } finally {
        btn.disabled = false;
        btn.textContent = "êµ­ì¸ì²­ ì¤ìê° ì§ì íì¸ (Live)";
    }
}

// ----------------------------------------
// [URL Parameter ì²ë¦¬: ëë¯¸ ìí íì´ì§ ì°ë]
// ----------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('product_id');
    if (pid && isDummyProduct(pid)) {
        const dummyProduct = getDummyProduct(pid);
        if (dummyProduct) {
            setTimeout(() => openProductModal(dummyProduct), 600);
        }
    }
});

// ----------------------------------------
// [ì¤ìê° 1:1 ì±í ìì¤í (Supabase Real-time)]
// ----------------------------------------
let currentChatRoomId = null;
let chatSubscription = null;
let myChats = [];

async function startChat(productId) {
    if(!currentUser) {
        alert("ì±íì ìí´ ë¡ê·¸ì¸ì´ íìí©ëë¤.");
        showPage('mypage');
        closeProductModal();
        return;
    }
    
    // ìí ê°ì²´ ì°¾ê¸° (ëë¯¸ë í¬í¨ë ìºìë products ë°°ì´ ì´ì©)
    let p = products.find(x => String(x.id) === String(productId));
    if (!p) {
        if (isDummyProduct(productId)) {
            p = getDummyProduct(String(productId));
        }
        if (!p) {
            alert("상품을 찾을 수 없습니다.");
            return;
        }
    }
    
    if(p.user_id === currentUser.id) {
        alert("ë³¸ì¸ì´ ë±ë¡í ìíìë ì±íì ê±¸ ì ììµëë¤.");
        return;
    }
    
    const btn = document.querySelector('.modal-box button');
    if(btn) btn.textContent = "ì±íë°© ì°ê²° ì¤...";
    
    // ì±íë°© ì¡´ì¬ ì¬ë¶ íì¸
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
        // ìë¤ë©´ ìì±
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
            console.error("ì±íë°© ìì± ìë¬:", insertErr);
            alert("ì±íë°© ìì±ì ì¤í¨íìµëë¤. (DB íì´ë¸ì´ íìí©ëë¤)");
            closeProductModal();
            return;
        }
        roomId = newRoom.id;
    }
    
    closeProductModal();
    openChatRoom(roomId, p);
}

// íë¨ í­ 'ì±í' ëë ì ë ëª©ë¡ ë¡ë
async function loadChats() {
    triggerBottomNav('chat');
    const container = document.getElementById('chat-list');
    
    if(!currentUser) {
        container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#999; font-size:14px;">ë¡ê·¸ì¸ í ì´ì© ê°ë¥í©ëë¤.</div>';
        return;
    }
    
    container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#999; font-size:14px;">ì±í ëª©ë¡ ë¶ë¬ì¤ë ì¤...</div>';
    
    // êµ¬ë§¤ì í¹ì íë§¤ìë¡ ì°¸ì¬ ì¤ì¸ ëª¨ë  ë°© ë¡ë
    const { data: rooms, error } = await supabaseClient
        .from('haema_chat_rooms')
        .select('*')
        .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
        .order('last_updated_at', { ascending: false });
        
    if(error) {
        console.error(error);
        container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#999; font-size:14px;">ì±í ìë²ì ì°ê²°í  ì ìê±°ë íì´ë¸ì´ ììµëë¤.</div>';
        return;
    }
    
    if(!rooms || rooms.length === 0) {
         container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#999; font-size:14px;">ì°¸ì¬ ì¤ì¸ ëíê° ììµëë¤.</div>';
         return;
    }
    
    // JS ë¦´ë ì´ì (haema_products) ìë ì°ê²° (Foreign Key ì ì½ ìì´ ìëíê² í¨)
    const pIds = rooms.map(r => r.product_id);
    const { data: pData } = await supabaseClient.from('haema_products').select('*').in('id', pIds);
    
    myChats = rooms.map(r => ({
        ...r,
        haema_products: pData ? pData.find(x => String(x.id) === String(r.product_id)) : null
    }));
    
    let html = '';
    myChats.forEach(room => {
        const pInfo = room.haema_products || {};
        const pTitle = pInfo.title || "ì ì ìë ìí";
        const opName = room.buyer_id === currentUser.id ? "íë§¤ì" : "êµ¬ë§¤ì";
        const lastMsg = room.last_message || "ëíë¥¼ ììí´ë³´ì¸ì.";
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

// í­ìì í´ë¦­í´ì ë¤ì´ì¬ ê²½ì° ë£¸ ë°ì´í° ì°¾ê¸°
function openChatRoomByList(roomId) {
    const room = myChats.find(r => r.id === roomId);
    if(room) {
        openChatRoom(roomId, room.haema_products);
    }
}

// ì¤ì  ì±íë°© ì ì UI ëì°ê¸° ë° ìì¼ ì°ê²°
async function openChatRoom(roomId, pData) {
    currentChatRoomId = roomId;
    
    const chatroomEl = document.getElementById('chatroom');
    chatroomEl.style.display = 'flex';
    
    // ìí ë°°ë ì¸í
    document.getElementById('chat-product-title').textContent = pData ? pData.title : 'ìí ì ë³´';
    document.getElementById('chat-product-price').textContent = (pData && pData.price) ? pData.price : '-';
    // ë°°ë ë ëë§ì ìí´ pData.svgë pData.imageê° ìë¤ë©´ ì£¼ì
    const imgEl = document.getElementById('chat-product-img');
    if(pData && pData.svg) {
        imgEl.innerHTML = pData.svg;
    } else {
        imgEl.innerHTML = '<div style="width:100%;height:100%;background:#D4E8F8;"></div>'; // ë¼ë
    }
    
    const msgContainer = document.getElementById('chat-messages-container');
    msgContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:12px;">ë©ìì§ ë¡ë©ì¤...</div>';
    
    // 1. ê±°ëìë£ ë²í¼ ë¶ê¸° ë¡ì§ (ë§¤ëì¨ë íê¸°ì©)
    const tradeBtn = document.getElementById('chat-trade-btn');
    if (pData) {
        if (pData.is_closed) {
            tradeBtn.textContent = 'íê¸° ë¨ê¸°ê¸°';
            tradeBtn.style.background = '#EAEDF2';
            tradeBtn.style.color = '#7A93B0';
            tradeBtn.onclick = () => openReviewModal(pData.id, pData.user_id === currentUser.id ? pData.highest_bidder_id || roomId /* fallback */ : pData.user_id);
        } else {
            if (pData.user_id === currentUser.id) {
                tradeBtn.textContent = 'ê±°ëìë£';
                tradeBtn.style.background = '#f4f9ff';
                tradeBtn.style.color = '#1a5fa0';
                tradeBtn.onclick = () => completeTransaction(pData.id, roomId);
            } else {
                tradeBtn.style.display = 'none'; // êµ¬ë§¤ìë ìë£ ì ì ë²í¼ ì¨ê¹
            }
        }
    }
    
    // 1. ê¸°ì¡´ ë©ìì§ ë¡ë
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
        msgContainer.innerHTML = '<div id="empty-chat-state" style="text-align:center; padding:20px; color:#999; font-size:12px;">ì²« ë©ìì§ë¥¼ ë³´ë´ ëíë¥¼ ììí´ë³´ì¸ì. (ìí° ë°ì¡ ê°ë¥)</div>';
    }
    
    scrollChatToBottom();
    
    // 2. ìì¼ êµ¬ë ìì
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
        // ë´ ë©ìì§ (ì°ì¸¡) ë¸ëì
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
        // ìëë°© ë©ìì§ (ì¢ì¸¡) ë°±ì
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
    
    inputEl.value = ''; // íë¦¬ ë¡ë í¨ê³¼ë¥¼ ìí´ input ì¦ê° ë¹ì
    
    const newMessage = {
        room_id: currentChatRoomId,
        sender_id: currentUser.id,
        content: content
    };
    
    // DB ì¸ìí¸ (ì¤ìê° ë¦¬ì¤ëê° ì´ë¥¼ ê°ì§íì¬ renderMessageë¥¼ í¸ì¶í¨, í¹ì ì§ì° ì ìë ë ë ì¶ê° ê°ë¥)
    const { error: msgErr } = await supabaseClient.from('haema_messages').insert(newMessage);
    
    if(msgErr) {
         console.error("ë©ìì§ ì ì¡ ì¤í¨", msgErr);
         return;
    }
    
    // ì±íë°© ìµì  ìí ìë°ì´í¸ (ëª©ë¡ìì ê°±ì  ìí¨)
    await supabaseClient.from('haema_chat_rooms').update({
        last_message: content,
        last_updated_at: new Date().toISOString()
    }).eq('id', currentChatRoomId);
}

// ì¤ìê° ë³í êµ¬ë í¨ì
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

// ì±íë°© ë«ê¸° (ë¤ë¡ê°ê¸°)
window.hideChatRoom = function() {
    if(chatSubscription) {
        supabaseClient.removeChannel(chatSubscription);
        chatSubscription = null;
    }
    currentChatRoomId = null;
    document.getElementById('chatroom').style.display = 'none';
    
    // ë¦¬ì¤í¸ ë¤ì ë¡ëìì¼ ìµì  ë©ìì§ ë°ì
    loadChats();
};

// ----------------------------------------
// [ê´ì¬ ëª©ë¡ (ì°íê¸°) ë¡ì§]
// ----------------------------------------
async function toggleLike(productId) {
    if(!currentUser) {
        alert('ë¡ê·¸ì¸ í ì´ì© ê°ë¥í©ëë¤.');
        return;
    }
    
    const btn = document.getElementById('modal-heart-btn');
    if(!btn) return;
    
    btn.style.transform = 'scale(0.8)';
    setTimeout(() => btn.style.transform = 'scale(1)', 100);
    
    // íì¬ ìí íì¸
    const { data: existing, error: err } = await supabaseClient
        .from('haema_likes')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', currentUser.id)
        .single();
        
    if(existing) {
        // ì·¨ì
        await supabaseClient.from('haema_likes').delete().eq('id', existing.id);
        btn.textContent = 'ð¤';
    } else {
        // ì°
        await supabaseClient.from('haema_likes').insert({ product_id: productId, user_id: currentUser.id });
        btn.textContent = 'â¤ï¸';
    }
}

async function checkLikeStatus(productId) {
    if (!currentUser || isDummyProduct(productId)) return;
    const { data } = await supabaseClient.from('haema_likes').select('id').eq('product_id', productId).eq('user_id', currentUser.id).single();
    const btn = document.getElementById('modal-heart-btn');
    if(btn) {
        btn.textContent = data ? 'â¤ï¸' : 'ð¤';
    }
}

async function loadLikedProducts() {
    triggerBottomNav('mypage'); // í­ ì´ë
    openMyListCommon("ë´ ê´ì¬ ëª©ë¡ (ì°)");
    
    // haema_likesì haema_products ì¡°ì¸ (Supabase Viewë RPC ìì´ í´ë¼ì´ì¸í¸ ì¬ì´ëë¡ ì²ë¦¬)
    const { data: likes, error } = await supabaseClient
        .from('haema_likes')
        .select('product_id')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
        
    if(error || !likes || likes.length === 0) {
        document.getElementById('mylist-grid').innerHTML = `<div style="grid-column: span 3; padding:60px 20px; text-align:center; color:#999; font-size:14px; display:flex; flex-direction:column; align-items:center; gap:12px;"><div style="font-size:32px;">â¤ï¸</div><div>ìì§ ì°ì ëë¥¸ ê´ì¬ ë§¤ë¬¼ì´ ììµëë¤.</div><button onclick="triggerBottomNav('home')" style="margin-top:16px; padding: 10px 20px; border-radius: 8px; background: #f4f9ff; color: #1a5fa0; border: 1px solid #cce5ff; font-weight: bold; cursor: pointer;">ë§¤ë¬¼ ëë¬ë³´ê¸°</button></div>`;
        return;
    }
    
    const pIds = likes.map(l => l.product_id);
    const { data: pData } = await supabaseClient.from('haema_products').select('*').in('id', pIds);
    
    // ìµì ì ì ì§ ë° ìë£í ì¶©ë ë°©ì§ (String ì í í ë¹êµ)
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
             <div style="position:absolute; bottom:8px; right:8px; font-size:12px;">â¤ï¸</div>
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
    document.getElementById('mylist-grid').innerHTML = '<div style="grid-column: span 3; padding:40px; text-align:center; color:#999; font-size:13px; display:flex; justify-content:center;">ë¡ë© ì¤...</div>';
}

// ----------------------------------------
// [ë§¤ëì¨ë (ê±°ë íê¸°) ë¡ì§]
// ----------------------------------------
let activeReviewProductId = null;
let activeReviewTargetId = null;

async function completeTransaction(productId, roomId) {
    if(!confirm("ì ë§ ì´ ë°©ì ì ì ì ê±°ëë¥¼ ìë£íìê² ìµëê¹? ê±°ëê° ë§ê° ì²ë¦¬ë©ëë¤.")) return;
    
    const p = products.find(x => x.id === productId);
    if(!p) return;
    
    // íë§¤ìê° ëë¥¸ ê²½ì°ë§
    const { data: roomData } = await supabaseClient.from('haema_chat_rooms').select('buyer_id').eq('id', roomId).single();
    if(!roomData) return;
    const buyerId = roomData.buyer_id;
    
    // ìí ë§ê° ì²ë¦¬
    await supabaseClient.from('haema_products').update({ is_closed: true, highest_bidder_id: buyerId }).eq('id', productId);
    
    p.is_closed = true;
    document.getElementById('chat-trade-btn').textContent = 'íê¸° ë¨ê¸°ê¸°';
    document.getElementById('chat-trade-btn').onclick = () => openReviewModal(productId, buyerId);
    
    // ë°ë¡ ë¦¬ë·° ëì°ê¸°
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
            alert('ì´ë¯¸ ì´ ê±°ëì ëí´ íê¸°ë¥¼ ë¨ê¸°ì¨ìµëë¤!');
        } else {
            console.error(error);
            alert('íê¸° ë±ë¡ ì¤ ì¤ë¥ê° ë°ìíìµëë¤.');
        }
    } else {
        alert('ìì¤í íê¸°ê° ë±ë¡ëììµëë¤. ê±°ë ì ë¢°ë(ë³ì )ì ë°ìë©ëë¤!');
    }
    
    document.getElementById('review-modal').style.display = 'none';
}



// ==========================================
// [ì»¤ë®¤ëí° ê¸ì°ê¸° & ìì¸ & ëê¸ ë¡ì§]
// ==========================================

window.openPostWriteModal = function() {
    if(!currentUser) {
        alert("ê¸ì ìì±íë ¤ë©´ ë¨¼ì  ë¡ê·¸ì¸ì íìì¼ í©ëë¤.");
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
        alert("ì ëª©ê³¼ ë´ì©ì ëª¨ë ìë ¥í´ì£¼ì¸ì.");
        return;
    }
    
    let tagBg = '#F4F9FF';
    let tagColor = '#1A5FA0';
    if(tag.includes('ìë¦¬ì§ì')) { tagBg = '#E8F5E9'; tagColor = '#1E8E3E'; }
    if(tag.includes('êµ¬ì¸êµ¬ì§')) { tagBg = '#FFF3E0'; tagColor = '#F57C00'; }

    const btn = document.getElementById('btn-submit-post');
    btn.disabled = true;
    btn.textContent = 'ë±ë¡ ì¤...';

    const newPost = {
        author_id: currentUser.id,
        author_name: currentUser.user_metadata?.full_name || 'ìµëªì ì¥',
        author_role: currentUser.user_metadata?.role || 'ì¼ë° íì',
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
    btn.textContent = 'ë±ë¡';

    if(error) {
        alert("ê¸ ë±ë¡ ì¤ ì¤ë¥ê° ë°ìíìµëë¤: " + error.message);
        return;
    }

    closePostWriteModal();
    renderCommunityPosts(); // ë¦¬ì¤í¸ ê°±ì 
}

let currentPostId = null;

window.openPostDetail = async function(postId) {
    currentPostId = postId;
    document.getElementById('post-detail-modal').style.display = 'flex';
    const body = document.getElementById('post-detail-body');
    body.innerHTML = '<div style="text-align:center; padding: 40px; color:#999;">ë¶ë¬ì¤ë ì¤...</div>';
    
    const { data: postData } = await supabaseClient.from('haema_posts').select('*').eq('id', postId).single();
    if(postData) {
        await supabaseClient.from('haema_posts').update({ views: postData.views + 1 }).eq('id', postId);
        postData.views += 1;
    } else {
        body.innerHTML = '<div style="text-align:center; padding: 40px; color:red;">ì­ì ëìê±°ë ìë ê²ìê¸ìëë¤.</div>';
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
                <div style="width:36px; height:36px; border-radius:50%; background:#f4f9ff; display:flex; align-items:center; justify-content:center; font-size:18px;">ð¤</div>
                <div>
                    <div style="font-size:14px; font-weight:700; color:#1A2B4A;">${postData.author_name}</div>
                    <div style="font-size:12px; color:#7A93B0;">${postData.author_role} Â· ë°©ê¸ ì  Â· ì¡°í ${postData.views}</div>
                </div>
            </div>
            <div style="font-size:15px; color:#1A2B4A; line-height:1.6; white-space:pre-wrap;">${postData.content}</div>
        </div>
        
        <div style="margin-top:32px;">
            <h4 style="margin:0 0 16px 0; font-size:15px; color:#1A2B4A;">ëê¸ <span style="color:#1A5FA0;">${comments ? comments.length : 0}</span></h4>
            <div id="comments-list" style="display:flex; flex-direction:column; gap:16px;">
    `;
    
    if(comments && comments.length > 0) {
        comments.forEach(c => {
            html += `
                <div style="display:flex; gap:12px;">
                    <div style="width:28px; height:28px; border-radius:50%; background:#eaedf2; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:14px;">ð¤</div>
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
        html += `<div style="text-align:center; color:#999; font-size:13px; padding:20px 0;">ê°ì¥ ë¨¼ì  ëê¸ì ë¨ê²¨ë³´ì¸ì!</div>`;
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
        alert("ëê¸ì ìì±íë ¤ë©´ ë¨¼ì  ë¡ê·¸ì¸ì íìì¼ í©ëë¤.");
        return;
    }
    if(!currentPostId) return;

    const input = document.getElementById('post-comment-input');
    const content = input.value.trim();
    if(!content) return;

    input.value = 'ë±ë¡ ì¤...';
    input.disabled = true;

    const newComment = {
        post_id: currentPostId,
        author_id: currentUser.id,
        author_name: currentUser.user_metadata?.full_name || 'ìµëªì ì¥',
        author_role: currentUser.user_metadata?.role || 'ì¼ë° íì',
        content: content
    };

    const { error } = await supabaseClient.from('haema_post_comments').insert([newComment]);
    
    if(error) {
        alert("ëê¸ ë±ë¡ ì¤í¨: " + error.message);
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
window.currentCommTag = 'ì ì²´';
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

