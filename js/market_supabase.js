function showPage(id, pushHistory = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById('page-' + id);
  if(targetPage) targetPage.classList.add('active');
  window.scrollTo({top:0, behavior:'smooth'});
  if(pushHistory) {
    window.history.pushState({ pageId: id }, '', '#' + id);
  }
}

window.addEventListener('popstate', (e) => {
    if(e.state && e.state.pageId) {
        showPage(e.state.pageId, false);
    } else {
        showPage('home', false);
    }
});

function triggerBottomNav(tab) {
  document.querySelectorAll('.tab-item').forEach(btn => btn.classList.remove('active'));
  const clickedTab = Array.from(document.querySelectorAll('.tab-item')).find(btn => btn.getAttribute('onclick').includes(tab));
  if(clickedTab) clickedTab.classList.add('active');

  if(tab === 'chat' || tab === 'mypage') {
      if(!currentUser) {
          alert('로그인이 필요한 기능입니다.');
          showPage('login');
          return;
      }
  }

  if(tab === 'home') {
    showPage('home');
    resetFilters();
  } else if(tab === 'search') {
    showPage('home');
    const input = document.getElementById('search-input');
    if(input) input.focus();
  } else if(tab === 'auction') {
    showPage('home');
    resetFilters();
    applySubFilter('tradeType', '경매');
  } else if(tab === 'chat') {
    showPage('chat');
    hideChatRoom();
    loadChatRooms();
  } else if(tab === 'mypage') {
    showPage('mypage');
  }
}

function showChatRoom() {
  document.getElementById('chat-list').style.display = 'none';
  document.getElementById('chatroom').style.display = 'flex';
  const fab = document.querySelector('.fab-container');
  if(fab) fab.style.display = 'none';
}

function hideChatRoom() {
  document.getElementById('chat-list').style.display = 'block';
  document.getElementById('chatroom').style.display = 'none';
  const fab = document.querySelector('.fab-container');
  if(fab) fab.style.display = 'flex';
}

// ==== Supabase 연동 & 상태 관리 ====
const SUPABASE_URL = 'https://conlrhslgepktvajvgvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n2kbcfymcwb4Nna5hN7wsA_TRKixOG5';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let auctionInterval = null;
let uploadedBase64 = null;
let uploadedBlob = null;

const mockProducts = [
  { id: 1, title: 'MAN B&W 엔진 부품', sub: '부산 · 2024.03', price: '₩ 4,500,000', category: '엔진·동력', tradeType: '직거래', region: '부산', condition: '양호', cert: '전체', auth: true, auction: false, big_category: '중고기부속', svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="20" width="32" height="18" rx="3" stroke="#3A90D9" stroke-width="1.5"/><path d="M16 20v-6a8 8 0 0116 0v6" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/><circle cx="24" cy="29" r="3" fill="#3A90D9"/></svg>' },
  { id: 2, title: 'JRC 레이더 시스템', sub: '인천 · 2022.11', price: '₩ 8,200,000', category: '항법장비', tradeType: '경매', region: '인천', condition: '최상', cert: 'KR', auth: false, auction: true, remain: '14:32 남음', big_category: '중고기부속', svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="12" stroke="#D4960A" stroke-width="1.5"/><circle cx="24" cy="24" r="4" fill="#D4960A"/><line x1="24" y1="12" x2="24" y2="8" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/><line x1="36" y1="24" x2="40" y2="24" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 3, title: '앵커 체인 50m', sub: '울산 · 2021.06', price: '₩ 1,200,000', category: '갑판장비', tradeType: '가격제안', region: '울산', condition: '부품용', cert: '없음', auth: false, auction: false, offer: true, big_category: '선용품', svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M12 36L24 12l12 24H12z" stroke="#3A90D9" stroke-width="1.5" stroke-linejoin="round"/><line x1="24" y1="36" x2="24" y2="42" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/><line x1="18" y1="42" x2="30" y2="42" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 4, title: 'ICOM 위성통신 장비', sub: '여수 · 2023.08', price: '₩ 2,800,000', category: '통신장비', tradeType: '직거래', region: '여수', condition: '최상', cert: '기타선급', auth: true, auction: false, big_category: '선용품', svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="10" y="16" width="28" height="20" rx="3" stroke="#D4960A" stroke-width="1.5"/><path d="M18 16v-4h12v4" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/><line x1="16" y1="26" x2="32" y2="26" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/><line x1="24" y1="22" x2="24" y2="30" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 5, title: '구명정 진수장치', sub: '광양 · 2020.04', price: '₩ 5,600,000', category: '안전장비', tradeType: '경매', region: '여수', condition: '양호', cert: '기타선급', auth: false, auction: true, remain: '8:14 남음', big_category: '안전장비', svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="22" r="8" stroke="#3A90D9" stroke-width="1.5"/><path d="M18 30l-4 8M30 30l4 8" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="38" x2="34" y2="38" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 6, title: '선박용 압력계 세트', sub: '목포 · 2023.12', price: '₩ 680,000', category: '전기·계측', tradeType: '직거래', region: '목포', condition: '보통', cert: 'KR', auth: true, auction: false, big_category: '주/부식', svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="10" y="12" width="28" height="24" rx="3" stroke="#D4960A" stroke-width="1.5"/><line x1="10" y1="20" x2="38" y2="20" stroke="#D4960A" stroke-width="1.5"/><line x1="24" y1="12" x2="24" y2="36" stroke="#D4960A" stroke-width="1.5"/></svg>' }
];

let currentUser = null;
let authMode = 'signin';

supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    updateProfileUI();
    if (currentUser) {
        const myNameEl = document.querySelector('.my-name');
        const myEmailEl = document.querySelector('.my-sub');
        if (myNameEl) myNameEl.textContent = (currentUser.email ? currentUser.email.split('@')[0] : '유저') + '님';
        if (myEmailEl) myEmailEl.innerHTML = (currentUser.email || '') + ' · 부산';
        const loginPage = document.getElementById('page-login');
        if(loginPage && loginPage.classList.contains('active')) showPage('home');
        const topLoginBtn = document.getElementById('header-btn-login');
        if(topLoginBtn) topLoginBtn.style.display = 'none';
    } else {
        const myNameEl = document.querySelector('.my-name');
        const myEmailEl = document.querySelector('.my-sub');
        if (myNameEl) myNameEl.textContent = '로그인이 필요합니다';
        if (myEmailEl) myEmailEl.innerHTML = '비회원';
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
        const { data, error } = await supabaseClient.auth.signUp({ email, password: pw });
        if(error) { errObj.textContent = error.message; }
        else {
            alert('회원가입이 완료되었습니다!');
            showPage('home');
            document.getElementById('auth-email').value = '';
            document.getElementById('auth-pw').value = '';
            document.getElementById('auth-pw-confirm').value = '';
        }
    } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pw });
        if(error) { errObj.textContent = '로그인 실패: 이메일 또는 비밀번호를 확인해주세요.'; }
        else {
            showPage('home');
            document.getElementById('auth-email').value = '';
            document.getElementById('auth-pw').value = '';
        }
    }
    btn.disabled = false;
    switchAuthMode(authMode);
}

window.doLogout = async function() {
    if(confirm("정말 로그아웃 하시겠습니까?")) {
        await supabaseClient.auth.signOut();
        alert('로그아웃 되었습니다.');
        showPage('home');
    }
};

// ============================================
// [필터 상태 관리] — bigCategory 추가
// ============================================
let filterState = {
  keyword: '',
  category: '전체',
  bigCategory: '전체',   // ← 대카테고리 추가
  region: '전체',
  condition: '전체',
  cert: '전체',
  tradeType: '전체',
  minPrice: null,
  maxPrice: null
};

// 대카테고리 탭 클릭 핸들러
function setBigCategory(val, el) {
  filterState.bigCategory = val;
  document.querySelectorAll('.big-cat-btn').forEach(b => b.classList.remove('active'));
  if(el) el.classList.add('active');
  // 소카테고리 초기화
  filterState.category = '전체';
  document.querySelectorAll('.cat-item').forEach(e => e.classList.remove('active'));
  const firstCat = document.querySelector('.cat-item');
  if(firstCat) firstCat.classList.add('active');
  renderProducts();
}

// 화면 렌더링 로직
function renderProducts() {
  const grid = document.querySelector('.product-grid');
  if(!grid) return;
  grid.innerHTML = '';

  let filtered = products.filter(p => {
    // 대카테고리 필터 (가장 먼저 체크)
    if (filterState.bigCategory !== '전체' && p.big_category !== filterState.bigCategory) return false;
    // 키워드 매칭
    if (filterState.keyword) {
        const kw = filterState.keyword.toLowerCase();
        const bodyTxt = (p.title + ' ' + (p.category || '')).toLowerCase();
        if(!bodyTxt.includes(kw)) return false;
    }
    // 소카테고리
    if (filterState.category !== '전체' && p.category !== filterState.category) return false;
    // 다중 필터
    if (filterState.region !== '전체' && p.region !== filterState.region) return false;
    if (filterState.condition !== '전체' && p.condition !== filterState.condition) return false;
    if (filterState.cert !== '전체' && p.cert !== filterState.cert) return false;
    if (filterState.tradeType !== '전체') {
        if (filterState.tradeType === '직거래' && p.tradeType !== '직거래') return false;
        if (filterState.tradeType === '경매' && !p.auction) return false;
        if (filterState.tradeType === '가격제안' && !p.offer) return false;
    }
    // 가격 필터
    const valObj = p.price ? p.price.replace(/[^0-9]/g, '') : '';
    if (valObj) {
        const val = parseInt(valObj);
        if (filterState.minPrice !== null && val < filterState.minPrice) return false;
        if (filterState.maxPrice !== null && val > filterState.maxPrice) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column: span 3; padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px;">선택한 조건에 맞는 매물이 없습니다.</div>';
    return;
  }

  if(auctionInterval) clearInterval(auctionInterval);
  filtered.forEach(p => {
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

    // 대카테고리 뱃지
    const bigCatBadge = p.big_category && p.big_category !== '중고기부속'
      ? `<span class="ptag" style="background:#F0F4FF; color:#4A6FA5; border-color:#C8D8F0; font-size:10px;">${p.big_category}</span>`
      : '';

    let card = `
      <div class="product-card" onclick="openProductModal('${p.id}')" style="cursor:pointer;">
        <div class="product-img">${p.svg}</div>
        <div class="product-body">
          <div class="product-title">${p.title}</div>
          <div class="product-sub">${p.sub}</div>
          ${priceHTML}
          <div class="product-tags" style="gap:4px;">${bigCatBadge}${tagsHTML}</div>
        </div>
      </div>
    `;
    grid.innerHTML += card;
  });

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

function setCategory(cat, el) {
  filterState.category = cat;
  document.querySelectorAll('.cat-item').forEach(e => e.classList.remove('active'));
  if (el && el.classList.contains('cat-item')) el.classList.add('active');
  else {
      document.querySelectorAll('.cat-item').forEach(e => {
          if (e.textContent.trim() === cat) e.classList.add('active');
      });
  }
  renderProducts();
}

function updateFilterStyles() {
    document.querySelectorAll('.filter-dropdown').forEach(btn => {
        const target = btn.getAttribute('data-target');
        if (target === 'price') {
            if (filterState.minPrice !== null || filterState.maxPrice !== null) btn.classList.add('applied');
            else btn.classList.remove('applied');
            return;
        }
        if (filterState[target] && filterState[target] !== '전체') btn.classList.add('applied');
        else btn.classList.remove('applied');
    });
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
    filterState.bigCategory = '전체';  // 대카테고리도 초기화
    filterState.category = '전체';
    filterState.region = '전체';
    filterState.condition = '전체';
    filterState.cert = '전체';
    filterState.tradeType = '전체';
    filterState.minPrice = null;
    filterState.maxPrice = null;

    const minInput = document.getElementById('min-price');
    const maxInput = document.getElementById('max-price');
    const searchInput = document.getElementById('search-input');
    if(minInput) minInput.value = '';
    if(maxInput) maxInput.value = '';
    if(searchInput) searchInput.value = '';

    // 대카테고리 탭 초기화
    document.querySelectorAll('.big-cat-btn').forEach(b => b.classList.remove('active'));
    const firstBigBtn = document.querySelector('.big-cat-btn');
    if(firstBigBtn) firstBigBtn.classList.add('active');

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
    if (p.auction) {
        const displayPrice = p.current_bid ? p.current_bid.toLocaleString() : p.price.replace(/[^0-9]/g, '');
        const remainText = p.is_closed ? '경매 종료됨' : (p.auction_end ? '마감: ' + new Date(p.auction_end).toLocaleString() : '진행중');
        actionArea = `
            <div style="background:#F4F9FF; border:1px solid #1A5FA0; padding:16px; border-radius:12px; margin-top:20px;">
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
                </div>`}
            </div>`;
    } else {
        actionArea = `
            <div style="margin-top:20px; display:flex; gap:12px;">
                <button style="flex:1; padding:14px; border-radius:12px; background:#1A5FA0; color:#fff; font-size:15px; font-weight:700; border:none; cursor:pointer;" onclick="startChat('${p.id}')">판매자와 채팅하기</button>
            </div>`;
    }

    const safeContent = p.content && p.content !== 'undefined' ? p.content : '상세 설명이 없습니다.';
    const bigCatLabel = p.big_category ? `<span style="background:#F0F4FF; color:#4A6FA5; border:1px solid #C8D8F0; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700;">${p.big_category}</span>` : '';

    body.innerHTML = `
        <div style="width:100%; aspect-ratio:4/3; background:#f4f4f4; border-radius:0 0 12px 12px; overflow:hidden; margin-bottom:16px; position:relative;">
            ${p.svg}
            <div id="modal-heart-btn" onclick="toggleLike('${p.id}')" style="position:absolute; bottom:12px; right:12px; width:40px; height:40px; background:rgba(255,255,255,0.9); border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; box-shadow:0 2px 8px rgba(0,0,0,0.1); transition:transform 0.1s;">🤍</div>
        </div>
        <div style="padding: 0 20px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                ${bigCatLabel}
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
        </div>`;

    checkLikeStatus(p.id);
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

async function submitBid(id) {
    if(!currentUser) { alert("경매 입찰은 로그인이 필요합니다."); showPage('login'); return; }
    const p = products.find(x => String(x.id) === String(id));
    if(!p) return;
    if(p.is_closed) { alert("이미 마감된 경매입니다."); return; }
    if(p.seller_id === currentUser.id) { alert("당사자의 매물에는 입찰할 수 없습니다."); return; }
    const bidInput = document.getElementById('bid-amount');
    const newBidStr = bidInput ? bidInput.value : null;
    if(!newBidStr) { alert("입찰 희망가를 입력해주세요."); return; }
    const newBid = parseInt(newBidStr, 10);
    const curr = p.current_bid || parseInt(p.price.replace(/[^0-9]/g, '')) || 0;
    if(newBid <= curr) { alert(`현재 최고가(₩${curr.toLocaleString()})보다 높은 금액을 입력하셔야 합니다.`); return; }
    const count = p.bid_count || 0;
    const bidderName = currentUser.user_metadata?.biz_name || currentUser.user_metadata?.display_name || currentUser.email.split('@')[0];
    const btn = document.querySelector('.auction-bid-btn');
    if(btn) btn.textContent = '입찰 처리중...';
    const { error } = await supabaseClient.from('haema_products')
        .update({ current_bid: newBid, bid_count: count + 1, highest_bidder_id: currentUser.id, highest_bidder_name: bidderName })
        .eq('id', id);
    if(error) { console.error(error); alert('입찰 중 오류가 발생했습니다: ' + error.message); if(btn) btn.textContent = '입찰'; return; }
    alert('성공적으로 입찰되었습니다!');
    closeProductModal();
    fetchProducts();
}

// 서버에서 매물 불러오기
async function fetchProducts() {
    const { data, error } = await supabaseClient.from('haema_products').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Supabase load error:', error); return; }
    if (data && data.length > 0) {
        products = data;
    } else {
        products = mockProducts;
    }
    renderProducts();
}

async function closeAuction(p) {
    if(p.is_closed) return;
    const { error } = await supabaseClient.from('haema_products').update({ is_closed: true }).eq('id', p.id).eq('is_closed', false);
    if(!error) {
        p.is_closed = true;
        if (currentUser && currentUser.id === p.highest_bidder_id) alert(`🎉 축하합니다! [${p.title}] 경매에 최종 낙찰되셨습니다!\n(낙찰가: ₩ ${p.current_bid ? p.current_bid.toLocaleString() : '확인 불가'})`);
        else if (currentUser && currentUser.id === p.seller_id) alert(`🔔 등록하신 [${p.title}] 경매가 마감되었습니다.\n(최종 입찰자: ${p.highest_bidder_name})`);
        fetchProducts();
        closeProductModal();
    }
}

setInterval(() => {
    const now = new Date().getTime();
    products.forEach(p => {
        if(p.auction && !p.is_closed && p.auction_end) {
            if(now >= new Date(p.auction_end).getTime()) closeAuction(p);
        }
    });
}, 5000);

// ============================================
// [매물 등록] — big_category 반영
// ============================================
async function registerProduct() {
  const cat = document.querySelector('#page-register .form-select') ? document.querySelector('#page-register .form-select').value : '카테고리 선택';

  // 대카테고리 가져오기
  const bigCatInput = document.getElementById('big-category-input');
  const bigCatVal = bigCatInput ? bigCatInput.value : '중고기부속';

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
      const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('market_images').upload(fileName, uploadedBlob, { contentType: 'image/jpeg' });
      if (uploadError) {
          alert('사진 업로드 실패 (버킷이 Public 상태인지 확인해주세요): ' + uploadError.message);
          submitBtn.textContent = '등록하기'; submitBtn.disabled = false; return;
      }
      const { data: publicData } = supabaseClient.storage.from('market_images').getPublicUrl(fileName);
      finalImageUrl = publicData.publicUrl;
  }

  let finalSvg = finalImageUrl
    ? `<img src="${finalImageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`
    : '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="20" width="32" height="18" rx="3" stroke="#D4960A" stroke-width="1.5"/><path d="M14 20v-4a10 10 0 0120 0v4" stroke="#D4960A" stroke-width="1.5"/></svg>';

  let newProd = {
    title,
    sub: '방금 전 등록',
    price: priceInput ? ('₩ ' + priceInput.replace('₩','').trim()) : '₩ 협의 가능',
    category: cat,
    big_category: bigCatVal,   // ← 대카테고리 저장
    tradeType,
    region: regionVal,
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

  if (error) { alert('등록 중 에러가 발생했습니다: ' + error.message); return; }

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
  setCategory('전체');
  resetFilters();
  showPage('home');
  window.scrollTo(0, 0);
  await fetchProducts();
}

// ============================================
// DOMContentLoaded
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateFilterStyles();

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                filterState.keyword = e.target.value.trim();
                renderProducts();
            }, 250);
        });
    }

    document.querySelectorAll('.cat-item').forEach(el => {
        el.addEventListener('click', () => setCategory(el.textContent.trim(), el));
    });
    document.querySelectorAll('.cat-icon-item').forEach(el => {
        el.addEventListener('click', () => setCategory(el.querySelector('.cat-icon-label').textContent.trim()));
    });

    document.querySelectorAll('.filter-dropdown').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = 'panel-' + btn.getAttribute('data-target');
            const isActive = btn.classList.contains('open');
            document.querySelectorAll('.filter-dropdown').forEach(b => b.classList.remove('open'));
            document.querySelectorAll('.filter-panel').forEach(p => p.classList.remove('show'));
            if (!isActive) {
                btn.classList.add('open');
                document.getElementById(targetId).classList.add('show');
                document.querySelector('.filter-panels').classList.add('show');
            } else {
                document.querySelector('.filter-panels').classList.remove('show');
            }
        });
    });

    const resetBtn = document.querySelector('.filter-reset');
    if(resetBtn) resetBtn.addEventListener('click', resetFilters);

    const formTradeChips = document.querySelectorAll('#page-register .trade-chip');
    formTradeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            formTradeChips.forEach(c => c.classList.remove('on'));
            chip.classList.add('on');
            const isAuction = chip.textContent.trim() === '경매';
            document.getElementById('auction-date-row').style.display = isAuction ? 'block' : 'none';
            document.getElementById('price-label').innerHTML = isAuction ? '경매 시작가<span>*</span>' : '판매 희망가<span>*</span>';
        });
    });

    const condChips = document.querySelectorAll('#page-register .cond-chip');
    condChips.forEach(chip => {
        chip.addEventListener('click', () => { condChips.forEach(c => c.classList.remove('on')); chip.classList.add('on'); });
    });

    document.querySelectorAll('.f-sub-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            applySubFilter(chip.getAttribute('data-key'), chip.getAttribute('data-val'));
        });
    });

    const priceApplyBtn = document.getElementById('price-apply');
    if(priceApplyBtn) {
        priceApplyBtn.addEventListener('click', () => {
            filterState.minPrice = document.getElementById('min-price').value ? parseInt(document.getElementById('min-price').value, 10) : null;
            filterState.maxPrice = document.getElementById('max-price').value ? parseInt(document.getElementById('max-price').value, 10) : null;
            updateFilterStyles();
            renderProducts();
            priceApplyBtn.textContent = '적용됨✓';
            priceApplyBtn.style.background = '#1E8E3E';
            setTimeout(() => { priceApplyBtn.textContent = '범위 적용'; priceApplyBtn.style.background = 'var(--blue-800)'; }, 1000);
        });
    }

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
                    canvas.toBlob((blob) => { uploadedBlob = blob; }, 'image/jpeg', 0.8);
                    const mainBox = document.getElementById('photo-box-main');
                    mainBox.style.backgroundImage = `url(${uploadedBase64})`;
                    mainBox.innerHTML = '';
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    const submitBtn = document.querySelector('#page-register .submit-btn');
    if(submitBtn) submitBtn.addEventListener('click', registerProduct);
});

// ==== 실시간 채팅 로직 ====
let currentChatProduct = null;
let currentChatSubscription = null;

async function loadChatRooms() {
    if(!currentUser) return;
    const container = document.getElementById('chat-list');
    container.innerHTML = '<div style="text-align:center; padding: 40px; color:#aaa; font-size:13px;">채팅 목록을 불러오는 중...</div>';
    const { data: rawMessages, error } = await supabaseClient.from('haema_chat_messages')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });
    if(error || !rawMessages || rawMessages.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 60px 20px; color:#aaa;"><div style="font-size:30px; margin-bottom:12px;">💬</div><div style="font-size:14px; font-weight:600; color:#4a6080;">진행 중인 대화가 없습니다.</div><div style="font-size:12px; margin-top:4px;">관심 있는 매물에 연락을 남겨보세요!</div></div>`;
        return;
    }
    const grouped = {};
    rawMessages.forEach(msg => {
        const pid = msg.product_id;
        if(!grouped[pid]) grouped[pid] = { latestMsg: msg.content, time: msg.created_at, otherUserId: msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id };
    });
    let htmlBuf = '';
    Object.keys(grouped).forEach(pid => {
        const room = grouped[pid];
        const p = products.find(x => String(x.id) === String(pid));
        let title = p ? p.title : '삭제된 매물';
        let svg = p ? p.svg : '<div style="background:#eee; width:100%; height:100%;"></div>';
        const timeStr = new Date(room.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        htmlBuf += `<div class="chat-item" onclick="startChat('${pid}')" style="cursor:pointer;"><div class="chat-avatar" style="background:#EAEDF2; color:#7A93B0; font-size:14px;">👤</div><div class="chat-info"><div class="chat-name-row"><span class="chat-name">해마 회원 <span style="font-size:11px; font-weight:400; color:#7A93B0;">(${title})</span></span><span class="chat-time">${timeStr}</span></div><div class="chat-preview">${room.latestMsg}</div></div><div class="chat-meta"><div class="chat-thumb" style="overflow:hidden;">${svg}</div></div></div>`;
    });
    container.innerHTML = htmlBuf;
}

async function startChat(productId) {
    if(!currentUser) { alert('회원가입 및 로그인이 필요한 기능입니다.'); showPage('login'); return; }
    const p = products.find(x => String(x.id) === String(productId));
    if(!p) return;
    if(p.seller_id === currentUser.id) { alert('본인이 등록한 매물입니다.'); return; }
    currentChatProduct = p;
    closeProductModal();
    document.getElementById('chat-product-title').textContent = p.title;
    document.getElementById('chat-product-price').textContent = p.price;
    document.getElementById('chat-product-img').innerHTML = p.svg;
    showPage('chat');
    showChatRoom();
    const container = document.getElementById('chat-messages-container');
    container.innerHTML = '<div style="text-align:center; padding: 20px; font-size:12px; color:#aaa;">대화 내역을 불러오는 중...</div>';
    await loadChatHistory(p.id);
    subscribeToChat(p.id);
}

async function loadChatHistory(productId) {
    const { data, error } = await supabaseClient.from('haema_chat_messages').select('*').eq('product_id', productId).order('created_at', { ascending: true });
    const container = document.getElementById('chat-messages-container');
    container.innerHTML = '';
    if(!error && data && data.length > 0) data.forEach(msg => appendMessageUI(msg));
    else container.innerHTML = '<div style="text-align:center; padding: 30px 20px; font-size:13px; color:#aaa;" id="empty-chat-msg">이 매물에 대한 첫 인사를 건네보세요! 👋</div>';
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}

function appendMessageUI(msg) {
    const container = document.getElementById('chat-messages-container');
    const emptyMsg = document.getElementById('empty-chat-msg');
    if(emptyMsg) emptyMsg.remove();
    const isMine = msg.sender_id === currentUser.id;
    const timeStr = new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    let html = '';
    if(isMine) html = `<div class="msg mine"><div><div class="msg-bubble mine">${msg.content}</div></div><span class="msg-time" style="font-size:10px; color:#999;">${timeStr}</span></div>`;
    else html = `<div class="msg"><div class="msg-avatar" style="background:#EAEDF2; color:#7A93B0; width:30px; height:30px; font-size:12px; display:flex; align-items:center; justify-content:center; border-radius:50%;">👤</div><div><div class="msg-bubble theirs">${msg.content}</div></div><span class="msg-time" style="font-size:10px; color:#999;">${timeStr}</span></div>`;
    container.innerHTML += html;
    container.scrollTop = container.scrollHeight;
}

function subscribeToChat(productId) {
    if(currentChatSubscription) supabaseClient.removeChannel(currentChatSubscription);
    currentChatSubscription = supabaseClient.channel('chat_room_' + productId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'haema_chat_messages', filter: `product_id=eq.${productId}` }, payload => {
          if(payload.new.sender_id !== currentUser.id) appendMessageUI(payload.new);
      }).subscribe();
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input-text');
    const txt = input.value.trim();
    if(!txt || !currentChatProduct || !currentUser) return;
    input.value = '';
    const localMsg = { sender_id: currentUser.id, content: txt, created_at: new Date().toISOString() };
    appendMessageUI(localMsg);
    const { error } = await supabaseClient.from('haema_chat_messages').insert([{ product_id: currentChatProduct.id, sender_id: currentUser.id, receiver_id: currentChatProduct.seller_id || null, content: txt }]);
    if(error) console.error("Chat send error:", error);
}

// ==== 판매 목록 ====
function showMyList() {
    if(!currentUser) { alert("로그인이 필요한 기능입니다."); showPage('login'); return; }
    showPage('mylist');
    const myProducts = products.filter(p => p.seller_id === currentUser.id);
    const container = document.getElementById('mylist-grid');
    if(!container) return;
    container.innerHTML = '';
    if(myProducts.length === 0) {
        container.innerHTML = `<div style="grid-column: span 3; text-align:center; padding: 40px; color:#aaa; font-size:13px;"><div style="font-size:30px; margin-bottom:12px;">🛳️</div><div>아직 등록하신 판매 매물이 없습니다.</div><div style="margin-top:16px;"><button onclick="requireAuthAndShow('register')" style="padding: 8px 16px; background:var(--blue-50); color:var(--blue-800); border:1px solid var(--blue-200); border-radius:8px; cursor:pointer; font-weight:700;">첫 판매글 올리러 가기</button></div></div>`;
        return;
    }
    myProducts.forEach((p, idx) => {
        let tagsHtml = '';
        if(p.auction) tagsHtml += `<span class="ptag ptag-y" style="background:#1A2B4A; color:#fff;">경매 ${p.bid_count}회</span> `;
        if(p.offer) tagsHtml += `<span class="ptag ptag-b">가격제안</span> `;
        if(!p.auction && !p.offer) tagsHtml += `<span class="ptag" style="background:#EAEDF2; color:#7A93B0;">직거래</span> `;
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.cursor = 'pointer';
        card.onclick = () => openProductModal(p.id);
        card.innerHTML = `<div class="product-img">${p.svg}</div><div class="product-body"><div class="product-sub">${p.region} · ${p.condition}</div><div class="product-title">${p.title}</div><div class="product-price">${p.price}</div><div class="product-tags">${tagsHtml}</div></div>`;
        container.appendChild(card);
    });
}

// ==== 프로필 UI ====
function updateProfileUI() {
    if(!currentUser) {
        const pName = document.getElementById('profile-name'); if(pName) pName.textContent = "로그인 해주세요";
        const pEmail = document.getElementById('profile-email'); if(pEmail) pEmail.textContent = "";
        const pAv = document.getElementById('profile-avatar'); if(pAv) pAv.textContent = "👤";
        const rBadge = document.getElementById('profile-region-badge'); if(rBadge) rBadge.style.display = 'none';
        return;
    }
    const email = currentUser.email;
    const metaName = currentUser.user_metadata?.display_name;
    const metaBio = currentUser.user_metadata?.bio;
    const metaRegion = currentUser.user_metadata?.region;
    const isVerified = currentUser.user_metadata?.is_region_verified;
    const nameStr = metaName ? metaName : email.split('@')[0];
    const firstChar = nameStr.charAt(0).toUpperCase();
    const pName = document.getElementById('profile-name'); if(pName) pName.textContent = nameStr;
    const pEmail = document.getElementById('profile-email'); if(pEmail) pEmail.textContent = metaBio ? metaBio : email;
    const sEmail = document.getElementById('settings-email'); if(sEmail) sEmail.textContent = email;
    const pAv = document.getElementById('profile-avatar'); if(pAv) pAv.textContent = firstChar;
    const rBadge = document.getElementById('profile-region-badge');
    if(rBadge) {
        rBadge.style.display = 'inline-flex';
        if(metaRegion && isVerified) { rBadge.textContent = metaRegion + " (인증됨)"; rBadge.style.background = "#E6F4EA"; rBadge.style.color = "#1E8E3E"; }
        else if(metaRegion) { rBadge.textContent = metaRegion + " (미인증)"; rBadge.style.background = "#FFFBEA"; rBadge.style.color = "#D4960A"; }
        else { rBadge.textContent = "지역 미설정"; rBadge.style.background = "#EAEDF2"; rBadge.style.color = "#7A93B0"; }
    }
    const isBiz = currentUser.user_metadata?.is_business;
    const bBadge = document.getElementById('profile-biz-badge');
    const bStatus = document.getElementById('biz-auth-status');
    if(bBadge) {
        if(isBiz) { bBadge.textContent = "🏢 신뢰 기업"; bBadge.style.background = "var(--blue-600)"; bBadge.style.color = "white"; bBadge.style.border = "none"; if(bStatus) bStatus.style.display = "inline-block"; }
        else { bBadge.textContent = "일반 회원"; bBadge.style.background = "#EAEDF2"; bBadge.style.color = "#7A93B0"; if(bStatus) bStatus.style.display = "none"; }
    }
    fetchAndRenderMannerTemp();
}

async function fetchAndRenderMannerTemp() {
    if(!currentUser) return;
    const { data, error } = await supabaseClient.from('haema_reviews').select('score').eq('reviewee_id', currentUser.id);
    let baseTemp = 36.5;
    if(data && !error) { let sum = 0; data.forEach(r => sum += (r.score * 0.5)); baseTemp += sum; }
    if(baseTemp < 0) baseTemp = 0; if(baseTemp > 99) baseTemp = 99;
    const txt = document.getElementById('manner-temp-text'); const bar = document.getElementById('manner-temp-bar');
    if(txt) txt.textContent = baseTemp.toFixed(1) + "°C";
    if(bar) bar.style.width = baseTemp + "%";
}

// ==== 프로필 편집 ====
function openProfileEdit() {
    if(!currentUser) return;
    showPage('profile-edit');
    tempVerifiedRegion = null;
    const btn = document.getElementById('btn-gps-verify');
    btn.textContent = "내 위치 검증"; btn.style.background = "#F4F9FF"; btn.style.color = "#1A5FA0"; btn.style.borderColor = "#1A5FA0"; btn.disabled = false;
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
        regionSelector.value = metaRegion; regionSelector.disabled = false;
        if(metaRegion && isVerified) { tempVerifiedRegion = metaRegion; regionSelector.disabled = true; btn.textContent = "✓ 기인증 지역"; btn.style.background = "#E6F4EA"; btn.style.color = "#1E8E3E"; btn.style.borderColor = "#1E8E3E"; }
    }
    if(metaName) { nameInput.disabled = true; nameInput.style.backgroundColor = '#EAEDF2'; nameInput.style.color = '#7A93B0'; }
    else { nameInput.disabled = false; nameInput.style.backgroundColor = '#fff'; nameInput.style.color = '#1A2B4A'; }
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
    if(!nameInput.disabled && !inputName) { alert('닉네임을 먼저 입력해주세요.'); return; }
    btn.textContent = '메타데이터 굽는 중...'; btn.disabled = true;
    let isVeri = (tempVerifiedRegion !== null && tempVerifiedRegion === selectedRegion);
    let updatePayload = { bio: inputBio, region: selectedRegion, is_region_verified: isVeri };
    if(!nameInput.disabled) updatePayload.display_name = inputName;
    const { data, error } = await supabaseClient.auth.updateUser({ data: updatePayload });
    btn.disabled = false; btn.textContent = '저장하고 돌아가기';
    if(error) { console.error("Profile save error:", error); alert('프로필 변경 중 오류가 발생했습니다.'); }
    else { currentUser = data.user; updateProfileUI(); showPage('mypage'); }
}

// ==== 위치 인증 ====
let tempVerifiedRegion = null;

async function verifyGPSLocation() {
    const selector = document.getElementById('edit-region-select');
    const selectedRegion = selector.value;
    const btn = document.getElementById('btn-gps-verify');
    if(!selectedRegion) { alert("원하시는 활동 지역(시/도)을 우선 선택해주세요."); return; }
    if (!navigator.geolocation) { alert("접속하신 기기 또는 브라우저가 위치 스캔 기능을 지원하지 않습니다."); return; }
    btn.textContent = "위치 스캔 중..."; btn.disabled = true;
    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude; const lon = position.coords.longitude;
        try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`);
            const data = await response.json();
            const geoRegion = data.principalSubdivision || data.city || "";
            let isMatch = geoRegion.includes(selectedRegion);
            if(!isMatch) {
                const shortcuts = { "경기": "경기도", "강원": "강원", "충북": "충청북도", "충남": "충청남도", "전북": "전라북도", "전남": "전라남도", "경북": "경상북도", "경남": "경상남도", "제주": "제주" };
                if(shortcuts[selectedRegion] && geoRegion.includes(shortcuts[selectedRegion])) isMatch = true;
            }
            if(isMatch) {
                alert(`현재 접속 위치가 [${geoRegion}]로 확인되었습니다.`);
                tempVerifiedRegion = selectedRegion; btn.textContent = "위치 확인 완료"; btn.style.background = "#E6F4EA"; btn.style.color = "#1E8E3E"; btn.style.borderColor = "#1E8E3E"; selector.disabled = true;
            } else {
                alert(`선택 지역(${selectedRegion})과 현재 위치(${geoRegion})가 다릅니다.`);
                btn.textContent = "다시 인증하기"; btn.disabled = false;
            }
        } catch(e) { alert("서버와 통신 중 오류가 발생했습니다. 잠시 후 시도해주세요."); btn.textContent = "📍 위치 재검증"; btn.disabled = false; }
    }, (error) => { alert("위치 정보를 가져올 수 없습니다. 기기의 위치 권한을 허용해주세요."); btn.textContent = "📍 위치 권한 재요청"; btn.disabled = false; });
}

// ==== 사업자 인증 ====
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
        if(formBox) formBox.style.display = 'none'; if(authDesc) authDesc.style.display = 'none'; if(verifiedBox) verifiedBox.style.display = 'block';
        if(nameDisplay) nameDisplay.textContent = bizName ? bizName : "인증된 해마마켓 기업";
        if(numDisplay) { const raw = bizNum.replace(/[^0-9]/g, ''); if(raw.length === 10) numDisplay.textContent = raw.substring(0,3) + "-" + raw.substring(3,5) + "-*****"; else numDisplay.textContent = bizNum; }
    } else {
        if(formBox) formBox.style.display = 'block'; if(authDesc) authDesc.style.display = 'block'; if(verifiedBox) verifiedBox.style.display = 'none';
    }
}

async function submitBusinessAuth() {
    if(!currentUser) return;
    const nameEl = document.getElementById('biz-name-input');
    const inputEl = document.getElementById('biz-number-input');
    const nameVal = nameEl ? nameEl.value.trim() : "";
    const val = inputEl.value.trim();
    if(!nameVal) { alert("국세청 검증을 위해 상호명(기업명)을 먼저 입력해주세요."); return; }
    if(val.length !== 10) { alert("하이픈(-)을 분리한 온전한 10자리 사업자등록번호를 입력해주세요."); return; }
    const btn = document.querySelector('#page-business-auth .submit-btn');
    btn.textContent = "국세청 Live DB 조회 중..."; btn.disabled = true;
    try {
        const apiKey = "1fab7ffc37b6751c35449bc0179057e847708d7b1517791217a048566c385380";
        const response = await fetch(`https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ "b_no": [ val ] }) });
        const result = await response.json();
        if(result && result.data && result.data.length > 0) {
            const bizData = result.data[0];
            if(bizData.b_stt_cd === "01") {
                const { data, error } = await supabaseClient.auth.updateUser({ data: { is_business: true, biz_number: val, biz_name: nameVal } });
                if(error) throw new Error("서버 프로필 업데이트 에러");
                alert('사업자 인증 성공!'); currentUser = data.user; updateProfileUI(); showPage('mypage');
                if(inputEl) inputEl.value = ""; if(nameEl) nameEl.value = "";
            } else if (bizData.b_stt_cd === "02" || bizData.b_stt_cd === "03") {
                alert(`❌ 인증 거부: 현재 국세청에 [${bizData.b_stt}] 상태로 조회되어 거래 인증이 불가합니다.`);
            } else {
                alert(`❌ 인증 실패: 국세청에 등록되지 않은 허위 사업자등록번호이거나 조회할 수 없습니다. (응답: ${bizData.tax_type})`);
            }
        } else { throw new Error("Invalid API Response"); }
    } catch(err) { console.error("NTS API 연동 에러:", err); alert("국세청 서버 장애 또는 통신 에러가 발생했습니다. 잠시 후 시도해주세요."); }
    finally { btn.disabled = false; btn.textContent = "국세청 실시간 진위 확인 (Live)"; }
}

// ==== 채팅 (신규 haema_chat_rooms 기반) ====
let myChats = [];
let currentChatRoomId = null;
let chatSubscription = null;

async function loadChats() {
    if(!currentUser) { alert('로그인이 필요합니다.'); showPage('login'); return; }
    showPage('chat');
    hideChatRoom();
    const container = document.getElementById('chat-list');
    container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#aaa; font-size:13px;">채팅 목록 로딩 중...</div>';
    const { data: rooms, error } = await supabaseClient.from('haema_chat_rooms').select('*').or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`).order('last_updated_at', { ascending: false });
    if(error) { console.error(error); container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#999; font-size:14px;">채팅 서버에 연결할 수 없거나 테이블이 없습니다.</div>'; return; }
    if(!rooms || rooms.length === 0) { container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#999; font-size:14px;">참여 중인 대화가 없습니다.</div>'; return; }
    const pIds = rooms.map(r => r.product_id);
    const { data: pData } = await supabaseClient.from('haema_products').select('*').in('id', pIds);
    myChats = rooms.map(r => ({ ...r, haema_products: pData ? pData.find(x => String(x.id) === String(r.product_id)) : null }));
    let html = '';
    myChats.forEach(room => {
        const pInfo = room.haema_products || {};
        const pTitle = pInfo.title || "알 수 없는 상품";
        const opName = room.buyer_id === currentUser.id ? "판매자" : "구매자";
        const lastMsg = room.last_message || "대화를 시작해보세요.";
        let timeStr = "";
        if(room.last_updated_at) { const d = new Date(room.last_updated_at); timeStr = d.getHours() + ":" + String(d.getMinutes()).padStart(2, '0'); }
        html += `<div class="chat-item" onclick="openChatRoomByList('${room.id}')"><div class="chat-avatar">${opName.charAt(0)}</div><div class="chat-info"><div class="chat-name-row"><span class="chat-name">${opName} <span style="font-size:11px; font-weight:400; color:#999; margin-left:4px;">${pTitle.substring(0,10)}...</span></span><span class="chat-time">${timeStr}</span></div><div class="chat-preview">${lastMsg}</div></div></div>`;
    });
    container.innerHTML = html;
}

function openChatRoomByList(roomId) {
    const room = myChats.find(r => r.id === roomId);
    if(room) openChatRoom(roomId, room.haema_products);
}

async function openChatRoom(roomId, pData) {
    currentChatRoomId = roomId;
    document.getElementById('chatroom').style.display = 'flex';
    document.getElementById('chat-product-title').textContent = pData ? pData.title : '상품 정보';
    document.getElementById('chat-product-price').textContent = (pData && pData.price) ? pData.price : '-';
    const imgEl = document.getElementById('chat-product-img');
    if(pData && pData.svg) imgEl.innerHTML = pData.svg;
    else imgEl.innerHTML = '<div style="width:100%;height:100%;background:#D4E8F8;"></div>';
    const msgContainer = document.getElementById('chat-messages-container');
    msgContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:12px;">메시지 로딩중...</div>';
    const tradeBtn = document.getElementById('chat-trade-btn');
    if (pData) {
        if (pData.is_closed) { tradeBtn.textContent = '후기 남기기'; tradeBtn.style.background = '#EAEDF2'; tradeBtn.style.color = '#7A93B0'; tradeBtn.onclick = () => openReviewModal(pData.id, pData.user_id === currentUser.id ? pData.highest_bidder_id || roomId : pData.user_id); }
        else if (pData.user_id === currentUser.id) { tradeBtn.textContent = '거래완료'; tradeBtn.style.background = '#f4f9ff'; tradeBtn.style.color = '#1a5fa0'; tradeBtn.onclick = () => completeTransaction(pData.id, roomId); }
        else { tradeBtn.style.display = 'none'; }
    }
    const { data: messages, error } = await supabaseClient.from('haema_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
    msgContainer.innerHTML = '';
    if(messages && messages.length > 0) messages.forEach(msg => renderMessage(msg));
    else msgContainer.innerHTML = '<div id="empty-chat-state" style="text-align:center; padding:20px; color:#999; font-size:12px;">첫 메시지를 보내 대화를 시작해보세요. (엔터 발송 가능)</div>';
    scrollChatToBottom();
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
        html = `<div style="display:flex; justify-content:flex-end; margin-bottom:12px;"><div style="display:flex; align-items:flex-end; gap:6px;"><span style="font-size:10px; color:#999;">${timeStr}</span><div style="background:var(--yellow-400); color:#333; padding:10px 14px; border-radius:16px; border-bottom-right-radius:4px; font-size:14px; font-weight:500; max-width:240px; word-break:break-word;">${escapeHtml(msg.content)}</div></div></div>`;
    } else {
        html = `<div style="display:flex; justify-content:flex-start; margin-bottom:12px;"><div style="display:flex; align-items:flex-end; gap:6px;"><div style="background:#fff; border:1px solid #D4E8F8; color:#1A2B4A; padding:10px 14px; border-radius:16px; border-bottom-left-radius:4px; font-size:14px; font-weight:500; max-width:240px; word-break:break-word;">${escapeHtml(msg.content)}</div><span style="font-size:10px; color:#999;">${timeStr}</span></div></div>`;
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
    inputEl.value = '';
    const newMessage = { room_id: currentChatRoomId, sender_id: currentUser.id, content };
    const { error: msgErr } = await supabaseClient.from('haema_messages').insert(newMessage);
    if(msgErr) { console.error("메시지 전송 실패", msgErr); return; }
    await supabaseClient.from('haema_chat_rooms').update({ last_message: content, last_updated_at: new Date().toISOString() }).eq('id', currentChatRoomId);
}

function subscribeToMessages(roomId) {
    if(chatSubscription) supabaseClient.removeChannel(chatSubscription);
    chatSubscription = supabaseClient.channel('custom-all-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'haema_messages', filter: `room_id=eq.${roomId}` }, (payload) => { renderMessage(payload.new); scrollChatToBottom(); })
      .subscribe();
}

window.hideChatRoom = function() {
    if(chatSubscription) { supabaseClient.removeChannel(chatSubscription); chatSubscription = null; }
    currentChatRoomId = null;
    document.getElementById('chatroom').style.display = 'none';
    loadChats();
};

// ==== 찜하기 ====
async function toggleLike(productId) {
    if(!currentUser) { alert('로그인 후 이용 가능합니다.'); return; }
    const btn = document.getElementById('modal-heart-btn');
    if(!btn) return;
    btn.style.transform = 'scale(0.8)';
    setTimeout(() => btn.style.transform = 'scale(1)', 100);
    const { data: existing, error: err } = await supabaseClient.from('haema_likes').select('*').eq('product_id', productId).eq('user_id', currentUser.id).single();
    if(existing) { await supabaseClient.from('haema_likes').delete().eq('id', existing.id); btn.textContent = '🤍'; }
    else { await supabaseClient.from('haema_likes').insert({ product_id: productId, user_id: currentUser.id }); btn.textContent = '❤️'; }
}

async function checkLikeStatus(productId) {
    if(!currentUser || String(productId).startsWith('p')) return;
    const { data } = await supabaseClient.from('haema_likes').select('id').eq('product_id', productId).eq('user_id', currentUser.id).single();
    const btn = document.getElementById('modal-heart-btn');
    if(btn) btn.textContent = data ? '❤️' : '🤍';
}

async function loadLikedProducts() {
    triggerBottomNav('mypage');
    openMyListCommon("내 관심 목록 (찜)");
    const { data: likes, error } = await supabaseClient.from('haema_likes').select('product_id').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if(error || !likes || likes.length === 0) { document.getElementById('mylist-container').innerHTML = '<div style="padding:40px; text-align:center; color:#999; font-size:13px;">찜한 상품이 없습니다.</div>'; return; }
    const pIds = likes.map(l => l.product_id);
    const { data: pData } = await supabaseClient.from('haema_products').select('*').in('id', pIds);
    const sortedProducts = pIds.map(id => pData ? pData.find(x => String(x.id) === String(id)) : null).filter(Boolean);
    const container = document.getElementById('mylist-container');
    container.innerHTML = '';
    sortedProducts.forEach((p, idx) => {
        const card = document.createElement('div');
        card.className = 'product-card'; card.style.cursor = 'pointer'; card.onclick = () => openProductModal(p.id);
        card.innerHTML = `<div class="product-img" style="position:relative;">${p.svg}<div style="position:absolute; bottom:8px; right:8px; font-size:12px;">❤️</div></div><div class="product-body"><div class="product-title">${p.title}</div><div class="product-price">${p.price}</div></div>`;
        container.appendChild(card);
    });
}

function openMyListCommon(titleText) {
    document.getElementById('page-mylist').style.display = 'block';
    const subTitle = document.querySelector('#page-mylist .sub-title');
    if(subTitle) subTitle.textContent = titleText;
    document.getElementById('mylist-container').innerHTML = '<div style="padding:40px; text-align:center; color:#999; font-size:13px;">로딩 중...</div>';
}

// ==== 거래 후기 ====
let activeReviewProductId = null;
let activeReviewTargetId = null;

async function completeTransaction(productId, roomId) {
    if(!confirm("정말 이 방의 유저와 거래를 완료하시겠습니까? 거래가 마감 처리됩니다.")) return;
    const p = products.find(x => x.id === productId);
    if(!p) return;
    const { data: roomData } = await supabaseClient.from('haema_chat_rooms').select('buyer_id').eq('id', roomId).single();
    if(!roomData) return;
    const buyerId = roomData.buyer_id;
    await supabaseClient.from('haema_products').update({ is_closed: true, highest_bidder_id: buyerId }).eq('id', productId);
    p.is_closed = true;
    document.getElementById('chat-trade-btn').textContent = '후기 남기기';
    document.getElementById('chat-trade-btn').onclick = () => openReviewModal(productId, buyerId);
    openReviewModal(productId, buyerId);
}

function openReviewModal(productId, targetUserId) {
    activeReviewProductId = productId; activeReviewTargetId = targetUserId;
    if(document.getElementById('review-content')) document.getElementById('review-content').value = '';
    document.getElementById('review-modal').style.display = 'flex';
}

async function submitReview(score) {
    if(!activeReviewProductId || !activeReviewTargetId) return;
    const content = document.getElementById('review-content') ? document.getElementById('review-content').value.trim() : '';
    const obj = { product_id: activeReviewProductId, reviewer_id: currentUser.id, reviewee_id: activeReviewTargetId, score, content };
    const { error } = await supabaseClient.from('haema_reviews').insert(obj);
    if(error) {
        if(error.code === '23505') alert('이미 이 거래에 대해 후기를 남기셨습니다!');
        else { console.error(error); alert('후기 등록 중 오류가 발생했습니다.'); }
    } else { alert('소중한 후기가 등록되었습니다. 매너온도에 반영됩니다!'); }
    document.getElementById('review-modal').style.display = 'none';
}

// ==== startChat 통합 (haema_chat_rooms 기반) ====
async function startChat(productId) {
    if(!currentUser) { alert('회원가입 및 로그인이 필요한 기능입니다.'); showPage('login'); return; }
    const p = products.find(x => String(x.id) === String(productId));
    if(!p) return;
    if(p.seller_id === currentUser.id) { alert('본인이 등록한 매물입니다.'); return; }
    closeProductModal();

    // 채팅방 찾기 또는 생성
    let { data: existingRoom } = await supabaseClient.from('haema_chat_rooms').select('*').eq('product_id', String(productId)).eq('buyer_id', currentUser.id).single();
    if(!existingRoom) {
        const { data: newRoom, error: createErr } = await supabaseClient.from('haema_chat_rooms').insert({ product_id: String(productId), buyer_id: currentUser.id, seller_id: p.seller_id || null }).select().single();
        if(createErr) { console.error(createErr); alert('채팅방 생성에 실패했습니다.'); return; }
        existingRoom = newRoom;
    }
    showPage('chat');
    showChatRoom();
    await openChatRoom(existingRoom.id, p);
}
