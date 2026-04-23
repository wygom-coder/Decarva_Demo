// ⚠️ escapeHtml은 utils.js에서 정의 (중복 정의 금지)
// 모든 HTML 문자열 보간(`${...}`)에는 escapeHtml() 적용 필수
// ============================================================================
// 변경 이력:
//  - P1 (2026-04-19): openProductModal 끝부분에 OG 메타 태그 동적 갱신 로직 추가
//                     (디카바 포털 등 외부 링크 미리보기 대응)
//  - P1 (2026-04-19): window.showLoading / window.hideLoading 전역 함수 추가
// ============================================================================

function showPage(id, pushHistory = true) {
    if (typeof window.hideChatRoom === 'function' && id !== 'chat') {
        window.hideChatRoom(true); // 페이지 변환 시 리스트 재로드 스킵하여 무한루프 방지
    }
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + id);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (pushHistory) window.history.pushState({ pageId: id }, '', '#' + id);
}

window.addEventListener('popstate', (e) => {
    // 매물 상세 URL에서 이탈 시 모달 닫기
    if (!window.location.hash.startsWith('#product/')) {
        const modal = document.getElementById('product-modal');
        if (modal && modal.style.display !== 'none') {
            modal.style.display = 'none';
        }
    }
    
    const targetPage = e.state?.pageId || 'home';
    if ((targetPage === 'chat' || targetPage === 'mypage') && !currentUser) {
        showPage('home', false);
        return;
    }
    showPage(targetPage, false);
});

function triggerBottomNav(tab) {
    document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
    const active = Array.from(document.querySelectorAll('.tab-item')).find(b => b.getAttribute('onclick')?.includes(tab));
    if (active) active.classList.add('active');

    if ((tab === 'chat' || tab === 'mypage') && !currentUser) {
        showToast('로그인이 필요합니다. 로그인 화면으로 이동합니다.', 800);
        setTimeout(() => showPage('login'), 800);
        return;
    }

    if (tab === 'home') { 
        showPage('home'); 
        if (typeof filterState !== 'undefined') {
            filterState.topCategory = '전체';
            filterState.category = '전체';
        }
        resetFilters();
        document.querySelectorAll('.top-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-top') === '전체'));
        if (typeof renderSubCategories === 'function') renderSubCategories('전체');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    else if (tab === 'search')    { showPage('home'); document.getElementById('search-input')?.focus(); }
    else if (tab === 'auction')   { showPage('home'); resetFilters(); applySubFilter('tradeType', '경매'); }
    else if (tab === 'community') { showPage('community'); if (typeof renderCommunityPosts === 'function') renderCommunityPosts(); }
    else if (tab === 'chat') { 
        if(typeof window.hideChatRoom === 'function') window.hideChatRoom(true);
        showPage('chat'); 
        document.getElementById('chat-list').style.display = 'block'; 
        document.getElementById('chatroom').style.display = 'none'; 
        const fab = document.querySelector('.fab-container'); if (fab) fab.style.display = 'flex'; 
    }
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
        const safeName = escapeHtml(c.name);
        const safeBg = escapeHtml(c.bg);
        return `<div class="cat-icon-item" data-cat="${safeName}"><div class="cat-icon-box" style="background:${safeBg}; color:${c.color ? c.color : '#1A5FA0'};${isActive ? 'box-shadow:0 0 0 2px #1E8E3E;' : ''}"><i data-lucide="${c.icon}" style="width:22px; height:22px; stroke-width:1.8px;"></i></div><span class="cat-icon-label"${isActive ? ' style="color:#1E8E3E;font-weight:800;"' : ''}>${safeName}</span></div>`;
    }).join('');

    catGrid.querySelectorAll('.cat-icon-item').forEach(el => {
        el.addEventListener('click', () => {
            const catName = el.getAttribute('data-cat');
            filterState.category = filterState.category === catName ? '전체' : catName;
            renderSubCategories(topCat);
            fetchProducts(true);
        });
    });
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
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
                fetchProducts(true);
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
        const safeF = escapeHtml(f);
        return `<div class="food-pill" data-food="${safeF}" style="padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;border:1px solid;cursor:pointer;flex-shrink:0;${on ? 'background:#1E8E3E;color:#fff;border-color:#1E8E3E;' : 'background:#fff;color:#7A93B0;border-color:#eaedf2;'}">${safeF}</div>`;
    }).join('');
    foodBar.querySelectorAll('.food-pill').forEach(el => {
        el.addEventListener('click', () => {
            filterState.foodCategory = el.getAttribute('data-food');
            renderFoodBar();
            fetchProducts(true);
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
    fetchProducts(true);
}

function resetFilters() {
    Object.assign(filterState, { keyword: '', region: '전체', condition: '전체', cert: '전체', tradeType: '전체', supplier: '전체', minPrice: null, maxPrice: null });
    ['min-price', 'max-price', 'search-input'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.querySelector('.filter-panels')?.classList.remove('show');
    document.querySelectorAll('.filter-dropdown').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('.filter-panel').forEach(p => p.classList.remove('show'));
    updateFilterStyles();
    fetchProducts(true);
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

    const safeId = escapeHtml(p.id);

    if (topCat === '주/부식') {
        const storeMatch = p.title ? p.title.match(/^\[(.*?)\]/) : null;
        const storeName = storeMatch ? storeMatch[1] : '인증 협력업체';
        const safeStoreName = escapeHtml(storeName);
        actionArea = `<div style="background:var(--blue-50);border:1px solid var(--blue-200);padding:16px;border-radius:12px;margin-top:20px;"><div style="display:flex;align-items:center;gap:8px;"><div style="background:var(--blue-600);color:#fff;font-size:11px;padding:3px 8px;border-radius:4px;font-weight:700;">추천 벤더</div><span style="font-size:14px;font-weight:700;color:#1A2B4A;">${safeStoreName}</span></div><div style="margin-top:6px;font-size:13px;color:#333;line-height:1.4;">동일 업체의 식품을 묶어 견적 요청 시 물류비가 절감됩니다.</div></div><div style="margin-top:16px;margin-bottom:24px;"><button style="width:100%;padding:14px;border-radius:12px;background:#1E8E3E;color:#fff;font-size:15px;font-weight:700;border:none;cursor:pointer;" onclick="addToCart('${safeId}');closeProductModal();">[${safeStoreName}] 전용 견적 장바구니에 담기</button></div>`;
    } else if (topCat === '선용품' || topCat === '안전장비') {
        actionArea = `<div style="margin-top:20px;margin-bottom:24px;display:flex;gap:12px;"><button style="flex:1;padding:14px;border-radius:12px;background:#fff;color:#1A5FA0;border:1px solid #1A5FA0;font-size:15px;font-weight:700;cursor:pointer;" onclick="addToCart('${safeId}');closeProductModal();">견적 장바구니 담기</button><button style="flex:1;padding:14px;border-radius:12px;background:#1A5FA0;color:#fff;font-size:15px;font-weight:700;border:none;cursor:pointer;" onclick="startChat('${safeId}')">판매자와 네고하기</button></div>`;
    } else if (p.auction) {
        const displayPriceRaw = p.current_bid ? p.current_bid.toLocaleString() : (p.price || '').replace(/[^0-9]/g, '');
        const safeDisplayPrice = escapeHtml(displayPriceRaw);
        const remainText = p.is_closed ? '경매 종료됨' : (p.auction_end ? '마감: ' + new Date(p.auction_end).toLocaleString() : '진행중');
        const safeRemainText = escapeHtml(remainText);
        const numPrice = parseInt(displayPriceRaw.replace(/,/g, '')) || 0;
        const bidCount = parseInt(p.bid_count) || 0;
        actionArea = `<div style="background:#F4F9FF;border:1px solid #1A5FA0;padding:16px;border-radius:12px;margin-top:20px;margin-bottom:24px;"><div style="color:#1A5FA0;font-size:12px;font-weight:700;margin-bottom:8px;">최고 입찰자만이 낙찰자가 됩니다!</div><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:13px;color:#7A93B0;">현재 최고가 (입찰 ${bidCount}회)</span><span style="font-size:20px;font-weight:800;color:#1A2B4A;">₩ ${safeDisplayPrice}</span></div><div style="font-size:12px;color:#E53E3E;font-weight:600;margin-bottom:16px;">${safeRemainText}</div>${p.is_closed ? '<button style="width:100%;padding:14px;border-radius:12px;background:#EAEDF2;color:#7A93B0;font-size:15px;font-weight:700;border:none;" disabled>마감된 경매입니다</button>' : `<div style="display:flex;gap:8px;margin-bottom:12px;"><button type="button" onclick="document.getElementById('bid-amount').value=${numPrice + 10000}" style="flex:1;padding:10px;background:#fff;border:1px solid #1A5FA0;color:#1A5FA0;border-radius:8px;font-weight:600;cursor:pointer;">+ 1만원</button><button type="button" onclick="document.getElementById('bid-amount').value=${numPrice + 50000}" style="flex:1;padding:10px;background:#fff;border:1px solid #1A5FA0;color:#1A5FA0;border-radius:8px;font-weight:600;cursor:pointer;">+ 5만원</button></div><div style="display:flex;gap:8px;"><input type="number" id="bid-amount" placeholder="희망가 입력" style="flex:1;padding:12px 14px;border:1px solid #ccc;border-radius:8px;outline:none;font-size:15px;font-weight:600;"><button onclick="submitBid('${safeId}')" class="auction-bid-btn" style="background:#D4960A;color:#fff;border:none;border-radius:8px;padding:0 24px;font-weight:700;font-size:15px;cursor:pointer;">입찰</button></div>`}</div>`;
    } else {
        actionArea = `<div style="margin-top:20px;margin-bottom:24px;display:flex;gap:12px;"><button style="flex:1;padding:14px;border-radius:12px;background:#1A5FA0;color:#fff;font-size:15px;font-weight:700;border:none;cursor:pointer;" onclick="startChat('${safeId}')">판매자와 채팅하기</button></div>`;
    }

    const safeContent = (p.content && p.content !== 'undefined') ? p.content : '상세 설명이 없습니다.';
    const productImageHtml = (typeof getProductImageHtml === 'function')
        ? getProductImageHtml(p)
        : (p.svg || '');

    // 모달 오픈 시 URL도 같이 변경 (공유 가능하게)
    const newHash = '#product/' + id;
    if (window.location.hash !== newHash) {
        window.history.pushState({ productId: id }, '', newHash);
    }

    body.innerHTML = `<div style="width:100%;aspect-ratio:4/3;background:#f4f4f4;border-radius:0 0 12px 12px;overflow:hidden;margin-bottom:16px;position:relative;">${productImageHtml}<div onclick="shareProduct('${safeId}')" style="position:absolute;bottom:12px;right:60px;width:40px;height:40px;background:rgba(255,255,255,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.1);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A5FA0" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></div><div id="modal-heart-btn" class="heart-btn" onclick="toggleLike('${safeId}')" style="position:absolute;bottom:12px;right:12px;width:40px;height:40px;background:rgba(255,255,255,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.1);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div></div><div style="padding:0 20px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><div style="background:#EAEDF2;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#7A93B0;">${escapeHtml(p.tradeType)}</div><div style="background:#E6F4EA;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#1E8E3E;">${escapeHtml(p.condition)}</div></div><h2 style="margin:0 0 4px 0;font-size:20px;color:#1A2B4A;">${escapeHtml(p.title)}</h2><div style="color:#7A93B0;font-size:13px;margin-bottom:16px;">${escapeHtml(p.sub)}</div><div style="font-size:24px;font-weight:800;color:#1A2B4A;margin-bottom:8px;">${escapeHtml(p.price)}</div><div style="padding:16px;background:#fff;border:1px solid rgba(0,0,0,0.05);border-radius:12px;display:flex;align-items:center;gap:12px;margin-top:20px;"><div style="width:40px;height:40px;border-radius:50%;background:#1A5FA0;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">판</div><div><div style="font-size:13px;font-weight:700;color:#1A2B4A;">판매자 정보 (보호됨)</div><div style="font-size:11px;color:#7A93B0;">안전거래 사용 우수 판매자</div></div></div><div style="margin-top:20px;white-space:pre-wrap;font-size:14px;color:#1A2B4A;line-height:1.6;">${escapeHtml(safeContent)}</div>${actionArea}</div>`;

    // ✅ OG 메타 태그 동적 갱신 (디카바 포털 등 외부 미리보기용)
    //    ⚠️ 일반적인 HTTP 페치 기반 크롤러(카톡/페북 등)는 JS 실행을 안 하므로
    //       이 갱신을 못 봅니다. JS 렌더링하는 크롤러(헤드리스 브라우저)에서만 효과 있음.
    //       디카바가 JS 렌더링 크롤러를 쓴다는 전제로 구현.
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogTitle) {
        ogTitle.setAttribute('content', (p.title || '해마 마켓') + ' | 해마 마켓');
    }
    if (ogDesc) {
        const descRaw = (p.content && p.content !== 'undefined') ? String(p.content) : '조선·해양 B2B 조선기자재 거래';
        ogDesc.setAttribute('content', descRaw.length > 160 ? descRaw.slice(0, 157) + '...' : descRaw);
    }
    if (ogImage) {
        const fallbackImg = window.location.origin + '/images/seahorse_logo.png';
        ogImage.setAttribute('content', p.image_url || fallbackImg);
    }
    if (ogUrl) {
        ogUrl.setAttribute('content', window.location.href);
    }

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

// ============================================================================
// 전역 로딩 스피너 (네트워크 지연 시 호출)
//   사용 예:
//     showLoading();              → "처리 중입니다..." 메시지로 노출
//     showLoading('로그인 중...'); → 커스텀 메시지로 노출
//     hideLoading();              → 닫기
//   ⚠️ try/catch의 finally에서 hideLoading() 호출 권장 (에러 시에도 닫힘 보장)
// ============================================================================
window.showLoading = function(message) {
    const el = document.getElementById('global-spinner');
    if (!el) return;
    const msgEl = el.querySelector('.spinner-msg');
    if (msgEl) msgEl.textContent = message || '처리 중입니다...';
    el.classList.add('is-active');
    el.setAttribute('aria-hidden', 'false');
};

window.hideLoading = function() {
    const el = document.getElementById('global-spinner');
    if (!el) return;
    el.classList.remove('is-active');
    el.setAttribute('aria-hidden', 'true');
};

// ============================================================================
// 전역 모달 닫기 이벤트 (바깥 영역 클릭 및 Esc 키 지원)
// ============================================================================
const GLOBAL_MODALS = [
    { id: 'product-modal', closeFn: () => { if(typeof closeProductModal === 'function') closeProductModal(); else document.getElementById('product-modal').style.display='none'; } },
    { id: 'post-detail-modal', closeFn: () => { if(typeof closePostDetail === 'function') closePostDetail(); else document.getElementById('post-detail-modal').style.display='none'; } },
    { id: 'post-write-modal', closeFn: () => { if(typeof closePostWrite === 'function') closePostWrite(); else document.getElementById('post-write-modal').style.display='none'; } },
    { id: 'review-modal', closeFn: () => { if(typeof closeReviewModal === 'function') closeReviewModal(); else document.getElementById('review-modal').style.display='none'; } },
    { id: 'quote-modal', closeFn: () => { document.getElementById('quote-modal').style.display='none'; } },
    { id: 'modal-terms', closeFn: () => { document.getElementById('modal-terms').style.display='none'; } },
    { id: 'modal-privacy', closeFn: () => { document.getElementById('modal-privacy').style.display='none'; } }
];

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        for (const m of GLOBAL_MODALS) {
            const el = document.getElementById(m.id);
            if (el && el.style.display !== 'none') {
                m.closeFn();
                return; // 최상단 모달 하나만 닫기
            }
        }
    }
});

document.addEventListener('click', function(e) {
    for (const m of GLOBAL_MODALS) {
        const el = document.getElementById(m.id);
        // 클릭된 대상이 모달 컨테이너의 어두운 배경(overlay) 자체일 때 닫기
        if (el && el.style.display !== 'none' && e.target === el) {
            m.closeFn();
            return;
        }
    }
});
