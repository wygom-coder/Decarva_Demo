// ✅ XSS 방지 — 한 줄로 유지해야 // 주석 오파싱 버그 없음
function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '\x26amp;').replace(//g, '\x26gt;').replace(/"/g, '\x26quot;').replace(/'/g, '\x26#039;');
}

function showPage(id, pushHistory = true) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + id);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (pushHistory) window.history.pushState({ pageId: id }, '', '#' + id);
}

window.addEventListener('popstate', (e) => {
    showPage(e.state?.pageId || 'home', false);
});

function triggerBottomNav(tab) {
    document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
    const active = Array.from(document.querySelectorAll('.tab-item')).find(b => b.getAttribute('onclick')?.includes(tab));
    if (active) active.classList.add('active');

    if ((tab === 'chat' || tab === 'mypage') && !currentUser) {
        alert('로그인이 필요한 기능입니다.');
        showPage('login');
        return;
    }

    if (tab === 'home')           { showPage('home'); resetFilters(); }
    else if (tab === 'search')    { showPage('home'); document.getElementById('search-input')?.focus(); }
    else if (tab === 'auction')   { showPage('home'); resetFilters(); applySubFilter('tradeType', '경매'); }
    else if (tab === 'community') { showPage('community'); if (typeof renderCommunityPosts === 'function') renderCommunityPosts(); }
    else if (tab === 'chat')      { showPage('chat'); document.getElementById('chat-list').style.display = 'block'; document.getElementById('chatroom').style.display = 'none'; const fab = document.querySelector('.fab-container'); if (fab) fab.style.display = 'flex'; }
    else if (tab === 'mypage')    { showPage('mypage'); }

    const fabReg = document.querySelector('.fab-register');
    const fabCont = document.querySelector('.fab-container');
    if (tab === 'community') {
        if (fabReg) fabReg.style.display = 'none';
        if (fabCont) fabCont.style.bottom = '138px';
    } else {
        if (fabReg) fabReg.style.display = 'flex';
        if (fabCont) fabCont.style.bottom = '';
    }
}

function showChatRoom() {
    document.getElementById('chat-list').style.display = 'none';
    document.getElementById('chatroom').style.display = 'flex';
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
}

function hideChatRoom() {
    document.getElementById('chat-list').style.display = 'block';
    document.getElementById('chatroom').style.display = 'none';
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'flex';
}

function renderSubCategories(topCat) {
    const catBar = document.getElementById('sub-cat-bar');
    const catGrid = document.getElementById('main-cat-grid');
    if (!catBar || !catGrid) return;
    const subCats = KATEGORY_MAP[topCat] || [];
    catBar.style.display = 'none';
    const fb = document.querySelector('.filter-bar');
    if (fb) fb.style.display = 'flex';
    catBar.innerHTML = '';

    catGrid.innerHTML = subCats.map(c => {
        const isActive = filterState.category === c.name;
        return `${c.svg}${c.name}`;
    }).join('');

    catGrid.querySelectorAll('.cat-icon-item').forEach(el => {
        el.addEventListener('click', () => {
            const catName = el.getAttribute('data-cat');
            filterState.category = filterState.category === catName ? '전체' : catName;
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
            if (filterState.topCategory !== topVal) {
                filterState.topCategory = topVal;
                filterState.category = '전체';
                filterState.keyword = '';
                const si = document.getElementById('search-input');
                if (si) si.value = '';
                renderSubCategories(topVal);
                renderProducts();
            }
        });
    });
    renderSubCategories(filterState.topCategory);
}

function renderFoodBar() {
    const foodBar = document.getElementById('food-cat-bar');
    if (!foodBar) return;
    const Foods = ['전체', '쌀·곡물', '육류', '수산물', '청과류', '가공·음료'];
    foodBar.innerHTML = Foods.map(f => {
        const on = filterState.foodCategory === f;
        return `${f}`;
    }).join('');
    foodBar.querySelectorAll('.food-pill').forEach(el => {
        el.addEventListener('click', () => {
            filterState.foodCategory = el.getAttribute('data-food');
            renderFoodBar();
            renderProducts();
        });
    });
}

function updateFilterStyles() {
    document.querySelectorAll('.filter-dropdown').forEach(btn => {
        const target = btn.getAttribute('data-target');
        if (target === 'price') {
            btn.classList.toggle('applied', filterState.minPrice !== null || filterState.maxPrice !== null);
            return;
        }
        btn.classList.toggle('applied', !!(filterState[target] && filterState[target] !== '전체'));
    });
    document.querySelectorAll('.f-sub-chip').forEach(chip => {
        chip.classList.toggle('on', filterState[chip.getAttribute('data-key')] === chip.getAttribute('data-val'));
    });
}

function applySubFilter(key, val) {
    filterState[key] = val;
    updateFilterStyles();
    renderProducts();
}

function resetFilters() {
    Object.assign(filterState, { keyword: '', region: '전체', condition: '전체', cert: '전체', tradeType: '전체', supplier: '전체', minPrice: null, maxPrice: null });
    ['min-price', 'max-price', 'search-input'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.querySelector('.filter-panels')?.classList.remove('show');
    document.querySelectorAll('.filter-dropdown').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('.filter-panel').forEach(p => p.classList.remove('show'));
    updateFilterStyles();
    renderProducts();
}

function openProductModal(id) {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;
    document.getElementById('product-modal').style.display = 'flex';
    const body = document.getElementById('product-modal-body');
    let actionArea = '';
    const catTrimmed = (p.category || '').trim();
    let topCat = CAT_TO_TOP_MAP[catTrimmed] || catTrimmed;
    if (!KATEGORY_MAP[topCat]) topCat = '기부속';
    if (['쌀·곡물', '육류', '수산물', '청과류', '가공·음료', '주/부식'].includes(catTrimmed)) topCat = '주/부식';

    if (topCat === '주/부식') {
        const storeMatch = p.title.match(/^\[(.*?)\]/);
        const storeName = storeMatch ? storeMatch[1] : '인증 협력업체';
        actionArea = `추천 벤더${escapeHtml(storeName)}동일 업체의 식품을 묶어 견적 요청 시 물류비가 절감됩니다.[${escapeHtml(storeName)}] 전용 견적 장바구니에 담기`;
    } else if (topCat === '선용품' || topCat === '안전장비') {
        actionArea = `견적 장바구니 담기판매자와 네고하기`;
    } else if (p.auction) {
        const displayPrice = p.current_bid ? p.current_bid.toLocaleString() : p.price.replace(/[^0-9]/g, '');
        const remainText = p.is_closed ? '경매 종료됨' : (p.auction_end ? '마감: ' + new Date(p.auction_end).toLocaleString() : '진행중');
        const numPrice = parseInt(displayPrice.replace(/,/g, ''));
        actionArea = `최고 입찰자만이 낙찰자가 됩니다!현재 최고가 (입찰 ${p.bid_count || 0}회)₩ ${displayPrice}${remainText}${p.is_closed ? '마감된 경매입니다' : `+ 1만원+ 5만원입찰`}`;
    } else {
        actionArea = `판매자와 채팅하기`;
    }

    const safeContent = (p.content && p.content !== 'undefined') ? p.content : '상세 설명이 없습니다.';
    body.innerHTML = `${p.svg}${escapeHtml(p.tradeType)}${escapeHtml(p.condition)}${escapeHtml(p.title)}${escapeHtml(p.sub)}${p.price}판판매자 정보 (보호됨)안전거래 사용 우수 판매자${escapeHtml(safeContent)}${actionArea}`;
    checkLikeStatus(p.id);
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

window.scrollToTop = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const activePage = document.querySelector('.page.active');
    if (activePage) {
        activePage.querySelectorAll('[id*="-content-area"]').forEach(a => a.scrollTo({ top: 0, behavior: 'smooth' }));
    }
};
