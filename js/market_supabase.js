function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const ids = ['home','register','chat','mypage','settings'];
  document.querySelectorAll('.page-nav button').forEach((b,i) => b.classList.toggle('on', ids[i] === id));
}
function showChatRoom() {
  document.getElementById('chat-list').style.display = 'none';
  document.getElementById('chatroom').style.display = 'flex';
}
function hideChatRoom() {
  document.getElementById('chat-list').style.display = 'block';
  document.getElementById('chatroom').style.display = 'none';
}

// ==== Supabase 연동 & 상태 관리 데이터 ====
const SUPABASE_URL = 'https://conlrhslgepktvajvgvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n2kbcfymcwb4Nna5hN7wsA_TRKixOG5';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
const mockProducts = [
  { id: 1, title: 'MAN B&W 엔진 부품', sub: '부산 · 2024.03', price: '₩ 4,500,000', category: '엔진·동력', tradeType: '직거래', region: '부산', condition: '양호', cert: '전체', auth: true, auction: false, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="20" width="32" height="18" rx="3" stroke="#3A90D9" stroke-width="1.5"/><path d="M16 20v-6a8 8 0 0116 0v6" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/><circle cx="24" cy="29" r="3" fill="#3A90D9"/></svg>' },
  { id: 2, title: 'JRC 레이더 시스템', sub: '인천 · 2022.11', price: '₩ 8,200,000', category: '항법장비', tradeType: '경매', region: '인천', condition: '최상', cert: 'KR', auth: false, auction: true, remain: '14:32 남음', svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="12" stroke="#D4960A" stroke-width="1.5"/><circle cx="24" cy="24" r="4" fill="#D4960A"/><line x1="24" y1="12" x2="24" y2="8" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/><line x1="36" y1="24" x2="40" y2="24" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 3, title: '앵커 체인 50m', sub: '울산 · 2021.06', price: '₩ 1,200,000', category: '갑판장비', tradeType: '가격제안', region: '울산', condition: '부품용', cert: '없음', auth: false, auction: false, offer: true, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M12 36L24 12l12 24H12z" stroke="#3A90D9" stroke-width="1.5" stroke-linejoin="round"/><line x1="24" y1="36" x2="24" y2="42" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/><line x1="18" y1="42" x2="30" y2="42" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 4, title: 'ICOM 위성통신 장비', sub: '여수 · 2023.08', price: '₩ 2,800,000', category: '통신장비', tradeType: '직거래', region: '여수', condition: '최상', cert: '기타선급', auth: true, auction: false, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="10" y="16" width="28" height="20" rx="3" stroke="#D4960A" stroke-width="1.5"/><path d="M18 16v-4h12v4" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/><line x1="16" y1="26" x2="32" y2="26" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/><line x1="24" y1="22" x2="24" y2="30" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 5, title: '구명정 진수장치', sub: '광양 · 2020.04', price: '₩ 5,600,000', category: '안전장비', tradeType: '경매', region: '여수', condition: '양호', cert: '기타선급', auth: false, auction: true, remain: '8:14 남음', svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="22" r="8" stroke="#3A90D9" stroke-width="1.5"/><path d="M18 30l-4 8M30 30l4 8" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="38" x2="34" y2="38" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 6, title: '선박용 압력계 세트', sub: '목포 · 2023.12', price: '₩ 680,000', category: '전기·계측', tradeType: '직거래', region: '목포', condition: '보통', cert: 'KR', auth: true, auction: false, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="10" y="12" width="28" height="24" rx="3" stroke="#D4960A" stroke-width="1.5"/><line x1="10" y1="20" x2="38" y2="20" stroke="#D4960A" stroke-width="1.5"/><line x1="24" y1="12" x2="24" y2="36" stroke="#D4960A" stroke-width="1.5"/></svg>' }
];

let filterState = {
  category: '전체',
  region: '전체',
  condition: '전체',
  cert: '전체',
  tradeType: '전체',
  minPrice: null,
  maxPrice: null
};

// 화면 렌더링 로직
function renderProducts() {
  const grid = document.querySelector('.product-grid');
  if(!grid) return;
  grid.innerHTML = '';
  
  let filtered = products.filter(p => {
    // 1. 대분류 카테고리 체크
    if (filterState.category !== '전체' && p.category !== filterState.category) return false;
    // 2. 다중 필터 체크
    if (filterState.region !== '전체' && p.region !== filterState.region) return false;
    if (filterState.condition !== '전체' && p.condition !== filterState.condition) return false;
    if (filterState.cert !== '전체' && p.cert !== filterState.cert) return false;
    if (filterState.tradeType !== '전체') {
        if (filterState.tradeType === '직거래' && p.tradeType !== '직거래') return false;
        if (filterState.tradeType === '경매' && !p.auction) return false;
        if (filterState.tradeType === '가격제안' && !p.offer) return false;
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

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column: span 3; padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px;">선택한 조건에 맞는 매물이 없습니다.</div>';
    return;
  }

  filtered.forEach(p => {
    let tagsHTML = '';
    if (p.auth) tagsHTML += '<span class="ptag ptag-b">인증</span>';
    if (p.tradeType === '직거래' || p.tradeType === '모두') tagsHTML += '<span class="ptag ptag-y">직거래</span>';
    if (p.offer) tagsHTML += '<span class="ptag ptag-r">가격제안</span>';
    if (p.auction && p.remain) tagsHTML += `<span class="ptag ptag-b">${p.remain}</span>`;

    let priceHTML = `<div class="product-price">${p.price}</div>`;
    if (p.auction) {
      priceHTML = `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><span class="auction-badge">경매중</span><span style="font-size:14px;font-weight:700;color:#1A2B4A;">${p.price}</span></div>`;
    }

    let card = `
      <div class="product-card">
        <div class="product-img">${p.svg}</div>
        <div class="product-body">
          <div class="product-title">${p.title}</div>
          <div class="product-sub">${p.sub}</div>
          ${priceHTML}
          <div class="product-tags" style="gap:4px;">${tagsHTML}</div>
        </div>
      </div>
    `;
    grid.innerHTML += card;
  });
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
    filterState.region = '전체';
    filterState.condition = '전체';
    filterState.cert = '전체';
    filterState.tradeType = '전체';
    filterState.minPrice = null;
    filterState.maxPrice = null;

    const minInput = document.getElementById('min-price');
    const maxInput = document.getElementById('max-price');
    if(minInput) minInput.value = '';
    if(maxInput) maxInput.value = '';

    // 닫기
    document.querySelector('.filter-panels').classList.remove('show');
    document.querySelectorAll('.filter-dropdown').forEach(btn => btn.classList.remove('open'));
    document.querySelectorAll('.filter-panel').forEach(p => p.classList.remove('show'));

    updateFilterStyles();
    renderProducts();
}

// 서버에서 매물 불러오기
async function fetchProducts() {
    const { data, error } = await supabaseClient.from('haema_products').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('Supabase load error:', error);
        return;
    }
    
    if (data && data.length > 0) {
        products = data;
    } else {
        // 처음 빈 테이블일 땐 기본 하드코딩 예시를 보여줌
        products = mockProducts; 
    }
    renderProducts();
}

// 판매자 실 DB 매물 등록
async function registerProduct() {
  const cat = document.querySelector('#page-register .form-select').value;
  const title = document.querySelector('#page-register .form-input[placeholder*="상품명"]').value;
  let tradeType = '직거래';
  document.querySelectorAll('#page-register .trade-chip').forEach(c => {
      if(c.classList.contains('on')) tradeType = c.textContent.trim();
  });
  
  let conditionStr = '최상';
  document.querySelectorAll('#page-register .cond-chip').forEach(c => {
      if(c.classList.contains('on')) conditionStr = c.textContent.trim();
  });

  const price = document.querySelector('#page-register .form-input[placeholder*="가격"]').value || '₩ 협의 가능';
  
  if (!title || cat === '카테고리 선택') { alert('상품명과 카테고리는 필수입니다.'); return; }

  const submitBtn = document.querySelector('#page-register .submit-btn');
  submitBtn.textContent = '등록 중...';
  submitBtn.disabled = true;

  let newProd = {
    title: title,
    sub: '방금 전 등록',
    price: price.includes('₩') ? price : '₩ ' + price,
    category: cat,
    "tradeType": tradeType,
    region: '부산', // 추후 회원 정보 연동
    condition: conditionStr,
    cert: '없음',
    auth: true, 
    auction: tradeType === '경매',
    offer: false,
    svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="20" width="32" height="18" rx="3" stroke="#D4960A" stroke-width="1.5"/><path d="M14 20v-4a10 10 0 0120 0v4" stroke="#D4960A" stroke-width="1.5"/></svg>'
  };

  const { error } = await supabaseClient.from('haema_products').insert([newProd]);
  
  submitBtn.textContent = '등록하기';
  submitBtn.disabled = false;

  if (error) {
     alert('등록 중 에러가 발생했습니다: ' + error.message);
     return;
  }

  // 폼 초기화
  document.querySelector('#page-register .form-input[placeholder*="상품명"]').value = '';
  document.querySelector('#page-register .form-input[placeholder*="가격"]').value = '';
  
  alert('매물이 성공적으로 DB에 등록되었습니다!');
  
  setCategory('전체'); 
  resetFilters();
  showPage('home');
  window.scrollTo(0, 0);

  // 등록 직후 최신 데이터베이스 리스트 가져오기
  await fetchProducts();
}

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateFilterStyles();

    // 메뉴 클릭
    document.querySelectorAll('.cat-item').forEach(el => {
        el.addEventListener('click', () => setCategory(el.textContent.trim(), el));
    });
    document.querySelectorAll('.cat-icon-item').forEach(el => {
        el.addEventListener('click', () => setCategory(el.querySelector('.cat-icon-label').textContent.trim()));
    });

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

    // 서브 칩 상호작용
    document.querySelectorAll('.f-sub-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const key = chip.getAttribute('data-key');
            const val = chip.getAttribute('data-val');
            applySubFilter(key, val);
        });
    });

    // 커스텀 가격대 필터
    const priceApplyBtn = document.getElementById('price-apply');
    if(priceApplyBtn) {
        priceApplyBtn.addEventListener('click', () => {
             const minVal = parseInt(document.getElementById('min-price').value);
             const maxVal = parseInt(document.getElementById('max-price').value);
             filterState.minPrice = isNaN(minVal) ? null : minVal;
             filterState.maxPrice = isNaN(maxVal) ? null : maxVal;
             updateFilterStyles();
             renderProducts();
             // 패널 닫기
             document.querySelector('.filter-panels').classList.remove('show');
             document.querySelectorAll('.filter-dropdown').forEach(b => b.classList.remove('open'));
        });
    }

    // 등록
    const submitBtn = document.querySelector('#page-register .submit-btn');
    if(submitBtn) submitBtn.addEventListener('click', registerProduct);
    
    const tradeChips = document.querySelectorAll('#page-register .trade-chip');
    tradeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            tradeChips.forEach(c => c.classList.remove('on'));
            chip.classList.add('on');
        });
    });

    // 매물등록 폼 상태 칩 클릭 연동
    const condChips = document.querySelectorAll('#page-register .cond-chip');
    condChips.forEach(chip => {
        chip.addEventListener('click', () => {
            condChips.forEach(c => c.classList.remove('on'));
            chip.classList.add('on');
        });
    });
});