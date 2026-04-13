import re

with open('js/market_supabase.js', 'r') as f:
    content = f.read()

# 1. Update mockProducts
old_mock = """const mockProducts = [
  { id: 1, title: 'MAN B&W 엔진 부품', sub: '부산 · 2024.03', price: '₩ 4,500,000', category: '엔진·동력', tradeType: '직거래', region: '부산', condition: '양호', cert: '전체', auth: true, auction: false, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="20" width="32" height="18" rx="3" stroke="#3A90D9" stroke-width="1.5"/><path d="M16 20v-6a8 8 0 0116 0v6" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/><circle cx="24" cy="29" r="3" fill="#3A90D9"/></svg>' },
  { id: 2, title: 'JRC 레이더 시스템', sub: '인천 · 2022.11', price: '₩ 8,200,000', category: '항법장비', tradeType: '경매', region: '인천', condition: '최상', cert: 'KR', auth: false, auction: true, remain: '14:32 남음', svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="12" stroke="#D4960A" stroke-width="1.5"/><circle cx="24" cy="24" r="4" fill="#D4960A"/><line x1="24" y1="12" x2="24" y2="8" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/><line x1="36" y1="24" x2="40" y2="24" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 3, title: '앵커 체인 50m', sub: '울산 · 2021.06', price: '₩ 1,200,000', category: '갑판장비', tradeType: '가격제안', region: '울산', condition: '부품용', cert: '없음', auth: false, auction: false, offer: true, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M12 36L24 12l12 24H12z" stroke="#3A90D9" stroke-width="1.5" stroke-linejoin="round"/><line x1="24" y1="36" x2="24" y2="42" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/><line x1="18" y1="42" x2="30" y2="42" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 4, title: 'ICOM 위성통신 장비', sub: '여수 · 2023.08', price: '₩ 2,800,000', category: '통신장비', tradeType: '직거래', region: '여수', condition: '최상', cert: '기타선급', auth: true, auction: false, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="10" y="16" width="28" height="20" rx="3" stroke="#D4960A" stroke-width="1.5"/><path d="M18 16v-4h12v4" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/><line x1="16" y1="26" x2="32" y2="26" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/><line x1="24" y1="22" x2="24" y2="30" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 5, title: '구명정 진수장치', sub: '광양 · 2020.04', price: '₩ 5,600,000', category: '안전장비', tradeType: '경매', region: '여수', condition: '양호', cert: '기타선급', auth: false, auction: true, remain: '8:14 남음', svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="22" r="8" stroke="#3A90D9" stroke-width="1.5"/><path d="M18 30l-4 8M30 30l4 8" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="38" x2="34" y2="38" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 6, title: '선박용 압력계 세트', sub: '목포 · 2023.12', price: '₩ 680,000', category: '전기·계측', tradeType: '직거래', region: '목포', condition: '보통', cert: 'KR', auth: true, auction: false, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="10" y="12" width="28" height="24" rx="3" stroke="#D4960A" stroke-width="1.5"/><line x1="10" y1="20" x2="38" y2="20" stroke="#D4960A" stroke-width="1.5"/><line x1="24" y1="12" x2="24" y2="36" stroke="#D4960A" stroke-width="1.5"/></svg>' }
];"""

new_mock = """const KATEGORY_MAP = {
  '기부속': [
    { name: '엔진·동력', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="10" width="16" height="9" rx="2" stroke="#1A5FA0" stroke-width="1.4"/><path d="M7 10V7a4 4 0 018 0v3" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '항법장비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="6" stroke="#D4960A" stroke-width="1.4"/><line x1="11" y1="5" x2="11" y2="3" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><line x1="17" y1="11" x2="19" y2="11" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><circle cx="11" cy="11" r="2" fill="#D4960A"/></svg>', bg: '#FFF3C0' },
    { name: '갑판장비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 14L11 4l7 10H4z" stroke="#1A5FA0" stroke-width="1.4" stroke-linejoin="round"/><line x1="11" y1="14" x2="11" y2="19" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/><line x1="7" y1="19" x2="15" y2="19" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '통신장비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="5" y="6" width="12" height="10" rx="2" stroke="#D4960A" stroke-width="1.4"/><path d="M9 6V4h4v2" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><line x1="8" y1="11" x2="14" y2="11" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#FFF3C0' },
    { name: '안전장비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="10" r="5" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 16l3 3 3-3" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><line x1="11" y1="19" x2="11" y2="15" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '펌프·배관', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 8h12M5 14h12" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><rect x="3" y="5" width="16" height="12" rx="2" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: '전기·계측', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="4" width="10" height="14" rx="2" stroke="#1A5FA0" stroke-width="1.4"/><line x1="11" y1="14" x2="15" y2="10" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '기타부품', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#D4960A" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#FFF3C0' }
  ],
  '선용품': [
    { name: '로프·와이어', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1A5FA0" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#DAEEFF' },
    { name: '페인트·화공품', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="8" width="10" height="10" rx="2" stroke="#D4960A" stroke-width="1.4"/><path d="M8 8V6a2 2 0 116 0v2" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: '작업복·안전화', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 6h10v12H6z" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 6l3-4 3 4" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '청소·소모품', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 20l-4-8h8l-4 8z" stroke="#D4960A" stroke-width="1.4"/><path d="M11 12V4" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: '공구·기기', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M14 6l-8 8" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/><circle cx="16" cy="6" r="2" stroke="#1A5FA0" stroke-width="1.4"/></svg>', bg: '#DAEEFF' }
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
Object.entries(KATEGORY_MAP).forEach(([top, cats]) => cats.forEach(c => CAT_TO_TOP_MAP[c.name] = top));

const mockProducts = [
  { id: 1, title: 'MAN B&W 엔진 부품', sub: '부산 · 2024.03', price: '₩ 4,500,000', category: '엔진·동력', tradeType: '직거래', region: '부산', condition: '양호', cert: '전체', auth: true, auction: false, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="20" width="32" height="18" rx="3" stroke="#3A90D9" stroke-width="1.5"/><path d="M16 20v-6a8 8 0 0116 0v6" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/><circle cx="24" cy="29" r="3" fill="#3A90D9"/></svg>' },
  { id: 2, title: 'JRC 레이더 시스템', sub: '인천 · 2022.11', price: '₩ 8,200,000', category: '항법장비', tradeType: '경매', region: '인천', condition: '최상', cert: 'KR', auth: false, auction: true, remain: '14:32 남음', svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="12" stroke="#D4960A" stroke-width="1.5"/><circle cx="24" cy="24" r="4" fill="#D4960A"/><line x1="24" y1="12" x2="24" y2="8" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/><line x1="36" y1="24" x2="40" y2="24" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 3, title: '앵커 체인 50m', sub: '울산 · 2021.06', price: '₩ 1,200,000', category: '갑판장비', tradeType: '가격제안', region: '울산', condition: '부품용', cert: '없음', auth: false, auction: false, offer: true, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M12 36L24 12l12 24H12z" stroke="#3A90D9" stroke-width="1.5" stroke-linejoin="round"/><line x1="24" y1="36" x2="24" y2="42" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/><line x1="18" y1="42" x2="30" y2="42" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 4, title: 'ICOM 위성통신 장비', sub: '여수 · 2023.08', price: '₩ 2,800,000', category: '통신장비', tradeType: '직거래', region: '여수', condition: '최상', cert: '기타선급', auth: true, auction: false, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="10" y="16" width="28" height="20" rx="3" stroke="#D4960A" stroke-width="1.5"/><path d="M18 16v-4h12v4" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/><line x1="16" y1="26" x2="32" y2="26" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/><line x1="24" y1="22" x2="24" y2="30" stroke="#D4960A" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 5, title: '구명정 진수장치', sub: '광양 · 2020.04', price: '₩ 5,600,000', category: '안전장비', tradeType: '경매', region: '여수', condition: '양호', cert: '기타선급', auth: false, auction: true, remain: '8:14 남음', svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="22" r="8" stroke="#3A90D9" stroke-width="1.5"/><path d="M18 30l-4 8M30 30l4 8" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="38" x2="34" y2="38" stroke="#3A90D9" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 6, title: '선박용 압력계 세트', sub: '목포 · 2023.12', price: '₩ 680,000', category: '전기·계측', tradeType: '직거래', region: '목포', condition: '보통', cert: 'KR', auth: true, auction: false, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="10" y="12" width="28" height="24" rx="3" stroke="#D4960A" stroke-width="1.5"/><line x1="10" y1="20" x2="38" y2="20" stroke="#D4960A" stroke-width="1.5"/><line x1="24" y1="12" x2="24" y2="36" stroke="#D4960A" stroke-width="1.5"/></svg>' },
  { id: 7, title: '고강도 나일론 계류로프 100m', sub: '부산 · 방금 전', price: '₩ 850,000', category: '로프·와이어', tradeType: '직거래', region: '부산', condition: '최상', cert: 'KR', auth: true, auction: false, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="12" y="12" width="24" height="24" rx="4" stroke="#D4960A" stroke-width="1.5"/><circle cx="24" cy="24" r="6" stroke="#D4960A" stroke-width="1.5"/></svg>' },
  { id: 8, title: '선박용 외판 페인트(청색) 20L x 10통', sub: '울산 · 1시간 전', price: '₩ 1,200,000', category: '페인트·화공품', tradeType: '직거래', region: '울산', condition: '최상', cert: '없음', auth: true, auction: false, offer: true, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M16 16v16a4 4 0 008 0V16" stroke="#3A90D9" stroke-width="1.5"/><rect x="12" y="32" width="24" height="8" rx="2" stroke="#3A90D9" stroke-width="1.5"/></svg>' },
  { id: 9, title: '[도매] 국내산 백미 20kg x 50포', sub: '인천 · 2시간 전', price: '₩ 2,400,000', category: '쌀·곡물', tradeType: '직거래', region: '인천', condition: '최상', cert: '없음', auth: true, auction: false, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="14" y="10" width="20" height="28" rx="4" stroke="#1E8E3E" stroke-width="1.5"/><line x1="14" y1="20" x2="34" y2="20" stroke="#1E8E3E" stroke-width="1.5" stroke-dasharray="2 2"/></svg>' },
  { id: 10, title: '냉동 삼겹살 (수입) 100kg', sub: '부산 · 5시간 전', price: '₩ 1,300,000', category: '육류', tradeType: '가격제안', region: '부산', condition: '최상', cert: '없음', auth: false, auction: false, offer: true, svg: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M12 24c0-6 12-10 24 0-12 10-24 6-24 0z" stroke="#D32F2F" stroke-width="1.5"/></svg>' }
];"""

content = content.replace(old_mock, new_mock)

# 2. Update filterState
old_filter = """let filterState = {
  keyword: '',
  category: '전체',
  region: '전체',
  condition: '전체',
  cert: '전체',
  tradeType: '전체',
  minPrice: null,
  maxPrice: null
};"""

new_filter = """let filterState = {
  topCategory: '기부속',
  keyword: '',
  category: '전체',
  region: '전체',
  condition: '전체',
  cert: '전체',
  tradeType: '전체',
  minPrice: null,
  maxPrice: null
};

function initTopCategory() {
  const topTabs = document.querySelectorAll('.top-tab');
  const catBar = document.getElementById('sub-cat-bar');
  const catGrid = document.getElementById('main-cat-grid');
  
  // Render sub categories based on top category
  function renderSubCategories(topCat) {
      if(!catBar || !catGrid) return;
      
      const subCats = KATEGORY_MAP[topCat] || [];
      
      // Update horizontal sub-bar
      let subHTML = `<div class="cat-item ${filterState.category === '전체' ? 'active' : ''}">전체</div>`;
      subCats.forEach(c => {
          subHTML += `<div class="cat-item ${filterState.category === c.name ? 'active' : ''}">${c.name}</div>`;
      });
      catBar.innerHTML = subHTML;
      
      // Update grid icons
      let gridHTML = '';
      subCats.forEach(c => {
          gridHTML += `<div class="cat-icon-item"><div class="cat-icon-box" style="background:${c.bg};">${c.svg}</div><span class="cat-icon-label">${c.name}</span></div>`;
      });
      catGrid.innerHTML = gridHTML;
      
      // Attach events for new elements
      catBar.querySelectorAll('.cat-item').forEach(el => {
          el.addEventListener('click', () => setCategory(el.textContent.trim(), el));
      });
      catGrid.querySelectorAll('.cat-icon-item').forEach(el => {
          el.addEventListener('click', () => setCategory(el.querySelector('.cat-icon-label').textContent.trim()));
      });
  }

  topTabs.forEach(tab => {
      tab.addEventListener('click', () => {
          topTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const topVal = tab.getAttribute('data-top');
          
          if(filterState.topCategory !== topVal) {
             filterState.topCategory = topVal;
             filterState.category = '전체'; // Reset sub-category on top category change
             renderSubCategories(topVal);
             renderProducts();
          }
      });
  });
  
  // Initial render
  renderSubCategories(filterState.topCategory);
}
"""

content = content.replace(old_filter, new_filter)

# 3. Update renderProducts
old_render = """// 화면 렌더링 로직
function renderProducts() {
  const grid = document.querySelector('.product-grid');
  if(!grid) return;
  grid.innerHTML = '';
  
  let filtered = products.filter(p => {
    // 0. 키워드 매칭
    if (filterState.keyword) {
        const kw = filterState.keyword.toLowerCase();
        const bodyTxt = (p.title + ' ' + (p.category || '')).toLowerCase();
        if(!bodyTxt.includes(kw)) return false;
    }
    // 1. 대분류 카테고리 체크
    if (filterState.category !== '전체' && p.category !== filterState.category) return false;"""

new_render = """// 카테고리를 그리는 HTML 생성 유틸 함수
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
    const topOfP = CAT_TO_TOP_MAP[p.category] || '기부속';
    if (topOfP !== filterState.topCategory) return false;
    
    // 0. 키워드 매칭
    if (filterState.keyword) {
        const kw = filterState.keyword.toLowerCase();
        const bodyTxt = (p.title + ' ' + (p.category || '')).toLowerCase();
        if(!bodyTxt.includes(kw)) return false;
    }
    // 1. 대분류 카테고리 체크
    if (filterState.category !== '전체' && p.category !== filterState.category) return false;"""

content = content.replace(old_render, new_render)

old_card_gen = """  filtered.forEach(p => {
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

    let card = `
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
    grid.innerHTML += card;
  });"""

new_card_gen = """  filtered.forEach(p => {
    grid.innerHTML += createProductCardHTML(p);
  });
  
  // View Toggle based on '전체' selection
  if (filterState.category === '전체' && filterState.keyword === '') {
      // Show Bunjang style Recommendations
      if(catArea) catArea.style.display = 'block';
      if(recArea) recArea.style.display = 'block';
      if(listTitle) listTitle.innerHTML = '<span class="section-title">최신 매물</span><span class="section-more">더보기 →</span>';
      
      // Populate recommendation carousels with shuffled items from current top cat
      const recList = document.getElementById('recommendation-list');
      const curList = document.getElementById('curation-list');
      
      if(recList && curList) {
          recList.innerHTML = ''; curList.innerHTML = '';
          const shuffled = [...filtered].sort(() => 0.5 - Math.random());
          shuffled.slice(0, 4).forEach(p => recList.innerHTML += createProductCardHTML(p));
          shuffled.slice(4, 8).forEach(p => curList.innerHTML += createProductCardHTML(p));
          
          if(shuffled.length < 4) {
              recList.innerHTML += '<div style="padding: 20px; font-size:13px; color:#999;">추천 상품이 아직 없습니다.</div>';
          }
      }
      
  } else {
      // Hide recommendations and category grid, show only filtered list
      if(catArea) catArea.style.display = 'none';
      if(recArea) recArea.style.display = 'none';
      if(listTitle) listTitle.innerHTML = `<span class="section-title">${filterState.category} 결과</span>`;
  }
"""

content = content.replace(old_card_gen, new_card_gen)

# 4. Add initTopCategory call in DOMContentLoaded
old_dom = "    fetchProducts();"
new_dom = "    initTopCategory();\n    fetchProducts();"
content = content.replace(old_dom, new_dom)


with open('js/market_supabase.js', 'w') as f:
    f.write(content)

