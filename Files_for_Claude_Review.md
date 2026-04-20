# Haema Market Code Files for Review

## 1. product.js (최신 수정본)
```javascript
// ⚠️ escapeHtml은 utils.js에서 정의 (중복 정의 금지)
// ⚠️ getProductImageHtml(p)도 utils.js에서 정의 — image_url 또는 카테고리 SVG 반환

// 카테고리를 그리는 HTML 생성 유틸 함수
// ✅ 모든 사용자 입력은 escapeHtml() 처리
function createProductCardHTML(p) {
    let tagsHTML = '';
    if (p.auth) tagsHTML += '<span class="ptag ptag-b">인증</span>';
    if (p.tradeType === '직거래' || p.tradeType === '모두') tagsHTML += '<span class="ptag ptag-y">직거래</span>';
    if (p.offer) tagsHTML += '<span class="ptag ptag-r">가격제안</span>';
    if (p.auction) {
        if(p.is_closed) {
            tagsHTML += `<span class="ptag ptag-b" style="background:#eee;color:#999;border:none;">낙찰 완료</span>`;
        } else if(p.auction_end) {
            // ✅ data-end 속성에 들어가는 값도 escape (date 문자열이라 보통 안전하지만 방어)
            tagsHTML += `<span class="ptag ptag-b auction-timer-tag" data-end="${escapeHtml(p.auction_end)}">계산중...</span>`;
        } else if (p.remain) {
            tagsHTML += `<span class="ptag ptag-b">${escapeHtml(p.remain)}</span>`;
        }
    }

    const safePrice = escapeHtml(p.price);
    let priceHTML = `<div class="product-price">${safePrice}</div>`;
    if (p.auction) {
      if(p.is_closed) {
          const finalPrice = p.current_bid ? `₩ ${p.current_bid.toLocaleString()}` : '유찰됨';
          priceHTML = `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><span class="auction-badge" style="background:#7A93B0;">종료</span><span style="font-size:14px;font-weight:700;color:#7A93B0;text-decoration:line-through;">${escapeHtml(finalPrice)}</span></div>`;
      } else {
          const showPrice = p.current_bid ? `₩ ${p.current_bid.toLocaleString()}` : (p.price || '');
          priceHTML = `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><span class="auction-badge">경매중</span><span style="font-size:14px;font-weight:700;color:#1A2B4A;">${escapeHtml(showPrice)}</span></div>`;
      }
    }

    // ✅ p.id, p.title, p.sub 모두 escape
    const safeId = escapeHtml(p.id);
    const safeTitle = escapeHtml(p.title);
    const safeSub = escapeHtml(p.sub);

    // ✅ p.svg 직접 사용 → getProductImageHtml로 안전하게 조립
    const productImageHtml = (typeof getProductImageHtml === 'function')
        ? getProductImageHtml(p)
        : (p.svg || '');

    return `
      <div class="product-card" onclick="openProductModal('${safeId}')" style="cursor:pointer;">
        <div class="product-img">${productImageHtml}</div>
        <div class="product-body">
          <div class="product-title">${safeTitle}</div>
          <div class="product-sub">${safeSub}</div>
          ${priceHTML}
          <div class="product-tags" style="gap:4px;">${tagsHTML}</div>
        </div>
      </div>
    `;
}

// 화면 렌더링 로직
// 화면 렌더링 로직 (무한 스크롤 및 서버 필터링 호환)
function renderProductsHeader() {
  const catArea = document.getElementById('home-category-area');
  const recArea = document.getElementById('home-recommendation-area');
  const listTitle = document.getElementById('main-product-title-header');
  
  if (filterState.topCategory === '전체' && filterState.keyword === '') {
      if(catArea) catArea.style.display = 'block';
      if(recArea) recArea.style.display = 'block';
      if(listTitle) listTitle.innerHTML = '<span class="section-title">최신 전체 매물</span><span class="section-more">더보기 →</span>';
  } else if (filterState.category === '전체' && filterState.keyword === '') {
      if(catArea) catArea.style.display = 'block';
      if(recArea) recArea.style.display = 'block';
      if(listTitle) listTitle.innerHTML = '<span class="section-title"><span style="color:#1A5FA0; margin-right:6px; font-size:16px;">▪</span>최신 매물</span><span class="section-more">더보기 →</span>';
  } else {
      if(catArea) catArea.style.display = 'block';
      if(recArea) recArea.style.display = 'none';
      if(listTitle) listTitle.innerHTML = `<span class="section-title"><span style="color:#1A5FA0; margin-right:6px; font-size:16px;">▪</span>${escapeHtml(filterState.category)} 결과</span>`;
  }
}

function renderProductsEmpty() {
    const grid = document.getElementById('main-product-grid');
    if(grid) grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 100px 20px; display:flex; align-items:center; justify-content:center; color: var(--text-muted); font-size: 14px;">선택한 조건에 맞는 매물이 없습니다.</div>';
}

function renderProductsAppend(newItems) {
    const grid = document.getElementById('main-product-grid');
    if (!grid) return;
    
    // 큐레이션 영역 채우기 (처음 로딩 시에만)
    const recList = document.getElementById('recommendation-list');
    const curList = document.getElementById('curation-list');
    if (products.length <= Math.max(20, newItems.length) && recList && curList && filterState.keyword === '') {
        recList.innerHTML = ''; curList.innerHTML = '';
        const shuffled = [...products].sort(() => 0.5 - Math.random());
        const recItems = shuffled.slice(0, 4);
        const curItems = shuffled.slice(4, 8);
        
        if(recItems.length > 0) recItems.forEach(p => recList.innerHTML += createProductCardHTML(p));
        else recList.innerHTML = '<div style="padding: 60px 20px; font-size:13px; color:#999; text-align:center; width:100%;">매물이 없습니다.</div>';
        
        if(curItems.length > 0) curItems.forEach(p => curList.innerHTML += createProductCardHTML(p));
        else curList.innerHTML = '<div style="padding: 60px 20px; font-size:13px; color:#999; text-align:center; width:100%;">매물이 없습니다.</div>';
    }
    
    newItems.forEach(p => {
        grid.innerHTML += createProductCardHTML(p);
    });
    
    if (hasMoreProducts) setupInfiniteScroll();
    setupAuctionTimers();
}

let scrollObserver = null;
function setupInfiniteScroll() {
    const grid = document.getElementById('main-product-grid');
    if (!grid) return;
    
    if (scrollObserver) scrollObserver.disconnect();
    
    const target = document.createElement('div');
    target.id = 'product-infinite-scroll-target';
    target.style.height = '20px';
    target.style.gridColumn = '1 / -1';
    grid.appendChild(target);
    
    scrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            scrollObserver.disconnect();
            if (target.parentNode) target.remove();
            fetchProducts(false); // Load next page
        }
    }, { rootMargin: '200px' });
    
    scrollObserver.observe(target);
}

function setupAuctionTimers() {
  if(typeof auctionInterval !== 'undefined' && auctionInterval) clearInterval(auctionInterval);
  window.auctionInterval = setInterval(() => {
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

// 기존 renderProducts 호환용
window.renderProducts = function() {
    fetchProducts(true);
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
    alert('해마 벤더 시스템으로 견적 요청이 성공적으로 접수되었습니다.\n빠른 시일 내에 선박의 메일/시스템으로 견적서가 도착합니다!');
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
    const curr = p.current_bid || parseInt((p.price || '').replace(/[^0-9]/g, '')) || 0;
    
    if(newBid <= curr) {
        alert(`현재 최고가(₩${curr.toLocaleString()})보다 높은 금액을 입력하셔야 합니다.`);
        return;
    }

    const count = p.bid_count || 0;
    
    const bidderName = currentUser.user_metadata?.biz_name || currentUser.user_metadata?.display_name || (currentUser.email ? currentUser.email.split('@')[0] : '익명');
    
    const btn = document.querySelector('.auction-bid-btn');
    if(btn) btn.textContent = '입찰 처리중...';
    
    // ✅ .lt('current_bid', newBid) 조건이 DB 단 원자적 optimistic lock 역할.
    //    동시 입찰 시 더 낮은 bid는 0행 반환으로 거부됨.
    const { data: updateRows, error } = await supabaseClient.from('haema_products')
        .update({ 
            current_bid: newBid, 
            bid_count: count + 1,
            highest_bidder_id: currentUser.id,
            highest_bidder_name: bidderName
        })
        .eq('id', id)
        .lt('current_bid', newBid)
        .select();
        
    if(error) {
        console.error(error);
        alert('입찰 중 오류가 발생했습니다: ' + error.message);
        if(btn) btn.textContent = '입찰';
        return;
    }

    // ✅ 0행 update = 다른 사람이 더 높은 가격으로 먼저 입찰함
    if (!updateRows || updateRows.length === 0) {
        alert('입찰 실패: 그 사이 다른 사용자가 더 높은 가격으로 입찰했습니다. 새로고침 후 다시 시도해주세요.');
        if(btn) btn.textContent = '입찰';
        await fetchProducts();
        return;
    }
    
    alert('성공적으로 입찰되었습니다!');
    closeProductModal();
    await fetchProducts();
}


let lastProductCreatedAt = null;
let isFetchingProducts = false;
let hasMoreProducts = true;

// 서버에서 매물 불러오기 (무한 스크롤 cursor 지원)
async function fetchProducts(reset = true) {
    if (isFetchingProducts) return;
    
    const grid = document.getElementById('main-product-grid');
    if (reset) {
        lastProductCreatedAt = null;
        hasMoreProducts = true;
        products = [];
        if (grid) grid.innerHTML = '';
        renderProductsHeader();
    }
    
    if (!hasMoreProducts) return;
    isFetchingProducts = true;
    
    if (grid) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'product-loading-indicator';
        loadingDiv.style = 'grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-muted); font-size:14px;';
        loadingDiv.innerHTML = '매물 데이터를 불러오는 중입니다...';
        grid.appendChild(loadingDiv);
    }
    
    let query = supabaseClient.from('haema_products').select('*');
    
    // --- DB Pushdown 필터링 ---
    if (filterState.category !== '전체') {
        query = query.eq('category', filterState.category);
    } else if (filterState.topCategory !== '전체') {
        const subCats = Object.keys(CAT_TO_TOP_MAP || {}).filter(k => CAT_TO_TOP_MAP[k] === filterState.topCategory);
        if (filterState.topCategory === '주/부식') subCats.push('쌀·곡물', '육류', '수산물', '청과류', '가공·음료', '주/부식');
        if (subCats.length > 0) query = query.in('category', subCats);
    }

    if (filterState.region !== '전체') query = query.eq('region', filterState.region);
    if (filterState.condition !== '전체') query = query.eq('condition', filterState.condition);
    if (filterState.cert !== '전체') query = query.eq('cert', filterState.cert);

    if (filterState.tradeType === '직거래') query = query.eq('tradeType', '직거래');
    if (filterState.tradeType === '경매') query = query.eq('auction', true);
    if (filterState.tradeType === '가격제안') query = query.eq('offer', true);

    if (filterState.keyword) {
        query = query.or(`title.ilike.%${filterState.keyword}%,category.ilike.%${filterState.keyword}%`);
    }
    if (filterState.supplier !== '전체') {
        query = query.ilike('title', `%${filterState.supplier}%`);
    }

    // Cursor (무한스크롤 락 포인트)
    if (lastProductCreatedAt) {
        query = query.lt('created_at', lastProductCreatedAt);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(20);
    
    const indicator = document.getElementById('product-loading-indicator');
    if (indicator) indicator.remove();
    isFetchingProducts = false;

    if (error) {
        console.error('Supabase load error:', error);
        return;
    }

    if (!data || data.length === 0) {
        hasMoreProducts = false;
        if (reset) renderProductsEmpty();
        return;
    }

    // Price는 문자열이라 DB 푸시다운이 완벽하지 않으므로 Client에서 후처리
    let finalData = data;
    if (filterState.minPrice !== null || filterState.maxPrice !== null) {
        finalData = finalData.filter(p => {
            const valObj = (p.price || '').replace(/[^0-9]/g, '');
            if (!valObj) return true;
            const val = parseInt(valObj, 10);
            if (filterState.minPrice !== null && val < filterState.minPrice) return false;
            if (filterState.maxPrice !== null && val > filterState.maxPrice) return false;
            return true;
        });
    }

    products = [...products, ...finalData];
    lastProductCreatedAt = data[data.length - 1].created_at;
    if (data.length < 20) {
        hasMoreProducts = false;
    }

    if(finalData.length > 0) {
        renderProductsAppend(finalData);
    } else {
        // 필터링되어 0개가 되었고 아직 더 가져올게 남았다면 재귀 호출
        if(hasMoreProducts) fetchProducts(false);
        else if (reset) renderProductsEmpty();
    }
}

async function closeAuction(p) {
    if(p.is_closed) return;
    
    const { error } = await supabaseClient.from('haema_products')
        .update({ is_closed: true })
        .eq('id', p.id)
        .eq('is_closed', false);
        
    if(!error) {
        p.is_closed = true;
        const safeTitle = String(p.title || '');
        if (currentUser && currentUser.id === p.highest_bidder_id) {
            alert(`축하합니다! [${safeTitle}] 경매에 최종 낙찰되셨습니다!\n(낙찰가: ₩ ${p.current_bid ? p.current_bid.toLocaleString() : '확인 불가'})`);
        }
        else if (currentUser && currentUser.id === p.seller_id) {
            alert(`등록하신 [${safeTitle}] 경매가 마감되었습니다.\n(최종 입찰자: ${String(p.highest_bidder_name || '없음')})`);
        }
        await fetchProducts();
        closeProductModal();
    }
}

// 5초 주기 경매 마감 감시자
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


// ============================================================================
// ✅ 매물 등록 / 수정 분기 처리
// ============================================================================
// editingProductId가 null이면 등록 모드(INSERT), 값이 있으면 수정 모드(UPDATE)
// 진입 경로:
//   - 등록 모드: window.goToRegisterCreateMode() 호출 (FAB, +등록 버튼, 빈 판매목록)
//   - 수정 모드: window.editMyProduct(id) 호출 (마이페이지 판매목록 카드 클릭)
//
// ⚠️ P0-A 수정 (2026-04-17):
//   기존 hashchange 리스너 기반 자동 reset 방식은 동작하지 않았음.
//   showPage()는 history.pushState()를 사용하는데 pushState는 hashchange 이벤트를
//   발생시키지 않음. 이로 인해 편집 모드에서 +등록 클릭 시 editingProductId가
//   리셋되지 않아 의도치 않은 UPDATE가 발생, 본인 매물이 덮어써질 위험이 있었음.
//
//   해결: 진입 경로를 두 개의 명시적 함수(goToRegisterCreateMode / editMyProduct)로
//   분리. hashchange 리스너 + _enteredViaEdit 플래그는 모두 제거.
// ============================================================================
let editingProductId = null;

// 등록 페이지 진입 시 모드 초기화
function resetRegisterFormToCreateMode() {
    editingProductId = null;

    // 헤더 텍스트 / 버튼 텍스트 복원
    const headerTitle = document.querySelector('#page-register .sub-header .sub-title');
    if (headerTitle) headerTitle.textContent = '매물 등록';

    const submitBtn = document.querySelector('#page-register .submit-btn');
    if (submitBtn) {
        submitBtn.textContent = '등록하기';
        submitBtn.disabled = false;
    }

    // 폼 필드 초기화
    const titleInput = document.getElementById('title-input');
    if (titleInput) { titleInput.value = ''; titleInput.disabled = false; }

    const priceInput = document.getElementById('price-input');
    if (priceInput) { priceInput.value = ''; priceInput.disabled = false; }

    const auctionEndInput = document.getElementById('auction-end-input');
    if (auctionEndInput) { auctionEndInput.value = ''; auctionEndInput.disabled = false; }

    const photoInput = document.getElementById('photo-upload-input');
    if (photoInput) photoInput.value = '';

    // P0-#2: desc reset
    const descInput = document.getElementById('desc-input');
    if (descInput) descInput.value = '';

    if (typeof uploadedBase64 !== 'undefined') uploadedBase64 = null;
    if (typeof uploadedBlob !== 'undefined') uploadedBlob = null;

    const mainBox = document.getElementById('photo-box-main');
    if (mainBox) {
        mainBox.style.backgroundImage = 'none';
        mainBox.innerHTML = '<span class="photo-plus">+</span><span class="photo-main-label">대표사진</span>';
    }

    // 카테고리 선택 초기화
    const catSelect = document.querySelector('#page-register .form-select');
    if (catSelect) catSelect.value = '카테고리 선택';

    // 거래방식 칩 (직거래로)
    document.querySelectorAll('#page-register .trade-chip').forEach(c => {
        c.classList.toggle('on', c.textContent.trim() === '직거래');
    });

    // 상태 칩 (최상으로)
    document.querySelectorAll('#page-register .cond-chip').forEach(c => {
        c.classList.toggle('on', c.textContent.trim() === '최상');
    });

    // 경매 마감일 행 숨김
    const auctionDateRow = document.getElementById('auction-date-row');
    if (auctionDateRow) auctionDateRow.style.display = 'none';

    // 안내문구 제거
    const editLockNotice = document.getElementById('edit-lock-notice');
    if (editLockNotice) editLockNotice.remove();
}

// ============================================================================
// ✅ NEW (P0-A 수정): 등록 모드 진입 — 명시적 함수
// ============================================================================
// HTML의 +등록 버튼, FAB, 빈 판매목록의 "첫 판매글 작성하기" 버튼 모두
// 이 함수를 호출함. requireAuthAndShow('register')의 대체 함수.
//
// 등록 모드 보장:
//   1) 로그인 체크
//   2) resetRegisterFormToCreateMode() 호출 → editingProductId = null
//   3) showPage('register')
window.goToRegisterCreateMode = function() {
    if (!currentUser) {
        alert('회원가입 및 로그인이 필요한 기능입니다.');
        showPage('login');
        return;
    }
    resetRegisterFormToCreateMode();
    showPage('register');
};

// ============================================================================
// ✅ 본인 매물 편집 진입
// ============================================================================
window.editMyProduct = function(productId) {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }

    const p = products.find(x => String(x.id) === String(productId));
    if (!p) {
        alert('매물을 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.');
        return;
    }

    // 본인 매물 권한 체크 (1차 방어 — RLS가 진짜 방어선)
    const isOwner = (p.seller_id && p.seller_id === currentUser.id)
                 || (p.user_id && p.user_id === currentUser.id);
    if (!isOwner) {
        alert('본인이 등록한 매물만 수정할 수 있습니다.');
        return;
    }

    // 거래완료 매물은 수정 불가
    if (p.is_closed) {
        alert('이미 거래가 완료된 매물은 수정할 수 없습니다.');
        return;
    }

    // 등록 페이지로 이동
    // ⚠️ P0-A 수정: _enteredViaEdit 플래그 제거 (hashchange 리스너 사라짐)
    showPage('register');

    // 모드 전환
    editingProductId = productId;

    // 헤더 / 버튼 텍스트 변경
    const headerTitle = document.querySelector('#page-register .sub-header .sub-title');
    if (headerTitle) headerTitle.textContent = '매물 수정';

    const submitBtn = document.querySelector('#page-register .submit-btn');
    if (submitBtn) {
        submitBtn.textContent = '수정하기';
        submitBtn.disabled = false;
    }

    // 폼 필드 prefill
    const titleInput = document.getElementById('title-input');
    if (titleInput) titleInput.value = p.title || '';

    // P0-#2: desc prefill
    const descInput = document.getElementById('desc-input');
    if (descInput) descInput.value = p.content || '';

    // 가격: "₩ 1,000,000" 형식에서 숫자만 추출
    const priceInput = document.getElementById('price-input');
    if (priceInput) {
        const numericPrice = (p.price || '').replace(/[^0-9]/g, '');
        priceInput.value = numericPrice;
    }

    // 카테고리 select
    const catSelect = document.querySelector('#page-register .form-select');
    if (catSelect && p.category) {
        catSelect.value = p.category;
        // option에 없는 카테고리면 "카테고리 선택"으로
        if (catSelect.value !== p.category) catSelect.value = '카테고리 선택';
    }

    // 거래방식 칩
    const tradeType = p.tradeType || (p.auction ? '경매' : '직거래');
    document.querySelectorAll('#page-register .trade-chip').forEach(c => {
        c.classList.toggle('on', c.textContent.trim() === tradeType);
    });

    // 상태 칩
    const condition = p.condition || '최상';
    document.querySelectorAll('#page-register .cond-chip').forEach(c => {
        c.classList.toggle('on', c.textContent.trim() === condition);
    });

    // 경매 마감일 행 (경매면 보이고 + 값 채움)
    const auctionDateRow = document.getElementById('auction-date-row');
    const auctionEndInput = document.getElementById('auction-end-input');
    if (p.auction && p.auction_end) {
        if (auctionDateRow) auctionDateRow.style.display = 'block';
        if (auctionEndInput) {
            // ISO → datetime-local 형식 변환 (YYYY-MM-DDTHH:MM)
            const d = new Date(p.auction_end);
            if (!isNaN(d.getTime())) {
                const pad = n => String(n).padStart(2, '0');
                auctionEndInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            }
        }
    } else {
        if (auctionDateRow) auctionDateRow.style.display = 'none';
        if (auctionEndInput) auctionEndInput.value = '';
    }

    // 지역
    const regionInput = document.getElementById('region-input');
    if (regionInput && p.region) regionInput.value = p.region;

    // 사진 prefill (image_url 있으면 사진 박스에 미리보기)
    const mainBox = document.getElementById('photo-box-main');
    if (mainBox) {
        if (p.image_url) {
            // 기존 사진을 미리보기로 표시 + ✕ 삭제 버튼
            const safeUrl = escapeHtml(p.image_url);
            mainBox.style.backgroundImage = `url(${safeUrl})`;
            mainBox.style.backgroundSize = 'cover';
            mainBox.style.backgroundPosition = 'center';
            mainBox.style.position = 'relative';
            mainBox.innerHTML = '<button type="button" id="photo-delete-btn" title="사진 삭제" style="position:absolute; top:6px; right:6px; width:24px; height:24px; border-radius:50%; background:rgba(0,0,0,0.6); color:#fff; border:none; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; padding:0; box-shadow:0 2px 4px rgba(0,0,0,0.2); z-index:10;">✕</button>';
            // 사진 삭제 버튼 핸들러 (수정 시 사진 비우기)
            const delBtn = document.getElementById('photo-delete-btn');
            if (delBtn) {
                delBtn.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    ev.preventDefault();
                    if (typeof uploadedBase64 !== 'undefined') uploadedBase64 = null;
                    if (typeof uploadedBlob !== 'undefined') uploadedBlob = null;
                    const fileInput = document.getElementById('photo-upload-input');
                    if (fileInput) fileInput.value = '';
                    mainBox.style.backgroundImage = 'none';
                    mainBox.innerHTML = '<span class="photo-plus">+</span><span class="photo-main-label">대표사진</span>';
                    // 수정 모드에서 사진 삭제 시 → 사진을 NULL로 업데이트하도록 마킹
                    window.__editPhotoCleared = true;
                });
            }
            // 새로 업로드 안 하면 기존 image_url 유지
            window.__editPhotoCleared = false;
        } else {
            mainBox.style.backgroundImage = 'none';
            mainBox.innerHTML = '<span class="photo-plus">+</span><span class="photo-main-label">대표사진</span>';
            window.__editPhotoCleared = false;
        }
    }

    // 입찰자 있는 경매면 가격/마감일 잠금
    const bidCount = parseInt(p.bid_count) || 0;
    const isLocked = p.auction && bidCount > 0;
    if (isLocked) {
        if (priceInput) {
            priceInput.disabled = true;
            priceInput.style.background = '#f4f4f4';
            priceInput.style.color = '#999';
        }
        if (auctionEndInput) {
            auctionEndInput.disabled = true;
            auctionEndInput.style.background = '#f4f4f4';
            auctionEndInput.style.color = '#999';
        }
        // 안내 문구 추가 (이미 있으면 스킵)
        if (!document.getElementById('edit-lock-notice')) {
            const notice = document.createElement('div');
            notice.id = 'edit-lock-notice';
            notice.style.cssText = 'background:#FFF3E0; border:1px solid #F57C00; border-radius:8px; padding:12px; margin:12px 16px; font-size:13px; color:#D84315; line-height:1.5;';
            notice.innerHTML = `⚠️ 이 경매는 입찰자(${bidCount}회)가 있어 <b>가격과 마감일은 수정할 수 없습니다.</b><br>제목·설명·사진·카테고리는 수정 가능합니다.`;
            const subBody = document.querySelector('#page-register .sub-body');
            if (subBody) subBody.insertBefore(notice, subBody.firstChild);
        }
    }
};

// ============================================================================
// 판매자 실 DB 매물 등록 (편집 모드 분기 포함)
// ============================================================================
async function registerProduct() {
  const isEditMode = (editingProductId !== null);

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

    // P0-#2: read desc
    const descInputEl = document.getElementById('desc-input');
    const descVal = descInputEl ? descInputEl.value.trim() : '';

  if (!title || cat === '카테고리 선택') { alert('상품명과 카테고리는 필수입니다.'); return; }

  // ✅ 추가 입력 검증
  if (title.length > 200) { alert('상품명은 200자 이하로 입력해주세요.'); return; }
  if (priceParsed < 0 || priceParsed > 99999999999) { alert('가격을 올바르게 입력해주세요.'); return; }

  // 🚨 [Phase 7 최우선 방어벽] 100만원 한도 시뮬레이션
  const MAX_PRICE_BETA = 1_000_000;
  const isEditingOldPrice = document.getElementById('price-input').disabled;
  if (priceParsed > MAX_PRICE_BETA && !isEditingOldPrice) {
      alert('⚠️ 알파 테스트 기간 중에는 100만 원 이하의 매물만 등록 가능합니다.\n\n정식 출시 후 고가 거래(에스크로 및 계약 지원) 기능을 오픈할 예정입니다.');
      return;
  }

  const isAuction = tradeType === '경매';
  const endInput = document.getElementById('auction-end-input').value;
  if(isAuction && !endInput) { alert('경매 마감일시를 설정해주세요.'); return; }
  if(isAuction) {
      const endTime = new Date(endInput).getTime();
      // 수정 모드에서 마감일 비활성화된 경우는 검증 건너뜀 (기존 값 유지)
      const auctionEndDisabled = document.getElementById('auction-end-input').disabled;
      if (!auctionEndDisabled && endTime <= Date.now()) {
          alert('경매 마감일시는 현재 시각 이후로 설정해주세요.'); return;
      }
  }

  const submitBtn = document.querySelector('#page-register .submit-btn');
  const originalBtnText = isEditMode ? '수정하기' : '등록하기';
  const inProgressText = isEditMode ? '수정 중...' : '매물 등록 중...';
  submitBtn.textContent = inProgressText;
  submitBtn.disabled = true;

  let finalImageUrl = null;

  // 사진 업로드 처리
  if (uploadedBlob) {
      // 새 사진 업로드 (등록 모드든 수정 모드든 동일)
      submitBtn.textContent = inProgressText;
      const fileName = `public/product_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('market_images')
          .upload(fileName, uploadedBlob, {
              contentType: 'image/jpeg'
          });

      if (uploadError) {
          const proceed = confirm(
              '사진 업로드에 실패했습니다.\n\n' +
              (isEditMode ? '사진 없이 다른 정보만 수정하시겠습니까?\n' : '사진 없이 매물 정보만 등록하시겠습니까?\n') +
              '(취소하시면 다시 시도하실 수 있습니다)\n\n' +
              '오류 코드: ' + (uploadError.message || '알 수 없음')
          );
          if (!proceed) {
              submitBtn.textContent = originalBtnText;
              submitBtn.disabled = false;
              return;
          }
      } else {
          const { data: publicData } = supabaseClient.storage.from('market_images').getPublicUrl(fileName);
          finalImageUrl = publicData.publicUrl;
      }
  }

  // ✅ 분기 1) 등록 모드 → INSERT
  if (!isEditMode) {
      let newProd = {
        title: title,
        sub: '방금 전 등록',
        price: priceInput ? ('₩ ' + priceInput.replace('₩','').trim()) : '₩ 협의 가능',
        category: cat,
        "tradeType": tradeType,
        region: regionVal,
        seller_id: currentUser ? currentUser.id : null,
        condition: conditionStr,
        cert: '없음',
        auth: true,
        auction: isAuction,
        offer: false,
        image_url: finalImageUrl,
        content: descVal
      };

      if(isAuction) {
          newProd.auction_end = new Date(endInput).toISOString();
          newProd.current_bid = priceParsed;
          newProd.bid_count = 0;
      }

      const { error } = await supabaseClient.from('haema_products').insert([newProd]);

      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;

      if (error) {
         alert('등록 중 에러가 발생했습니다: ' + error.message);
         return;
      }

      // 폼 초기화 + 등록 완료 알림 + 홈 이동
      resetRegisterFormToCreateMode();

      alert('매물이 성공적으로 등록되었습니다!\n(하단 경매 탭에서도 바로 확인하실 수 있습니다.)');

      filterState.category = '전체';
      renderSubCategories(filterState.topCategory);
      resetFilters();
      showPage('home');
      window.scrollTo(0, 0);

      await fetchProducts();
      return;
  }

  // ✅ 분기 2) 수정 모드 → UPDATE
  // 기존 매물 객체 가져오기 (사진 처리 분기에 필요)
  const existingProduct = products.find(x => String(x.id) === String(editingProductId));
  if (!existingProduct) {
      alert('수정 대상 매물을 찾을 수 없습니다.');
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
      return;
  }

  // 입찰자 있는 경매면 가격/마감일 변경 차단 (UI 잠금 우회 방어)
  const bidCount = parseInt(existingProduct.bid_count) || 0;
  const isLocked = existingProduct.auction && bidCount > 0;

  // 사진 결정 로직:
  //   1) 새 사진 업로드 → finalImageUrl (방금 받은 새 URL)
  //   2) 사용자가 ✕로 사진 지움 → null
  //   3) 둘 다 아님 → 기존 image_url 유지
  let imageUrlToSave;
  if (finalImageUrl) {
      imageUrlToSave = finalImageUrl;
  } else if (window.__editPhotoCleared) {
      imageUrlToSave = null;
  } else {
      imageUrlToSave = existingProduct.image_url || null;
  }

  // UPDATE 페이로드 (락 걸린 필드는 빼고)
  let updatePayload = {
      title: title,
      category: cat,
      "tradeType": tradeType,
      region: regionVal,
      condition: conditionStr,
      auction: isAuction,
      image_url: imageUrlToSave,
      content: descVal
  };

  // 가격/마감일은 락 안 걸린 경우에만 변경 허용
  if (!isLocked) {
      updatePayload.price = priceInput ? ('₩ ' + priceInput.replace('₩','').trim()) : '₩ 협의 가능';
      if (isAuction) {
          updatePayload.auction_end = new Date(endInput).toISOString();
          // current_bid는 입찰 없을 때만 시작가로 갱신 (이미 입찰 있으면 절대 건드리지 않음)
          if (bidCount === 0) {
              updatePayload.current_bid = priceParsed;
          }
      }
  }

  // ⚠️ seller_id 조건으로 본인 매물만 update (RLS가 진짜 방어)
  const { error: updateErr } = await supabaseClient
      .from('haema_products')
      .update(updatePayload)
      .eq('id', editingProductId)
      .eq('seller_id', currentUser.id);

  submitBtn.textContent = originalBtnText;
  submitBtn.disabled = false;

  if (updateErr) {
      alert('수정 중 오류가 발생했습니다: ' + updateErr.message);
      return;
  }

  // ✅ 새 사진을 업로드했으면 기존 사진 파일을 Storage에서 정리
  //    (DB는 새 URL로 갱신됐으니 기존 파일은 고아 상태)
  if (finalImageUrl && existingProduct.image_url
      && existingProduct.image_url !== finalImageUrl) {
      try {
          const marker = '/market_images/';
          const idx = existingProduct.image_url.indexOf(marker);
          if (idx >= 0) {
              const oldFilePath = existingProduct.image_url.substring(idx + marker.length);
              await supabaseClient.storage.from('market_images').remove([oldFilePath]);
          }
      } catch (e) {
          console.warn('기존 사진 정리 실패(무시):', e);
      }
  }

  // ✅ 사용자가 사진을 지웠으면(__editPhotoCleared=true) 기존 파일도 Storage에서 삭제
  if (window.__editPhotoCleared && existingProduct.image_url && !finalImageUrl) {
      try {
          const marker = '/market_images/';
          const idx = existingProduct.image_url.indexOf(marker);
          if (idx >= 0) {
              const oldFilePath = existingProduct.image_url.substring(idx + marker.length);
              await supabaseClient.storage.from('market_images').remove([oldFilePath]);
          }
      } catch (e) {
          console.warn('지운 사진 정리 실패(무시):', e);
      }
  }

  alert('매물 정보가 수정되었습니다.');

  // 폼/모드 초기화 후 마이페이지 판매목록으로 복귀
  resetRegisterFormToCreateMode();
  await fetchProducts();
  if (typeof showMyList === 'function') {
      showMyList();
  } else {
      showPage('mypage');
  }
}

// [URL Parameter 처리: 더미 상품 페이지 연동]
//
// ⚠️ P0-A 수정 (2026-04-17):
//   기존 hashchange 리스너 + _enteredViaEdit 플래그 기반 모드 자동 동기화 코드는
//   동작하지 않아서 통째로 제거함. showPage()의 pushState는 hashchange를
//   발생시키지 않기 때문.
//
//   대체: window.goToRegisterCreateMode() (등록 모드 명시적 진입)
//         window.editMyProduct(id)        (수정 모드 명시적 진입)
//   진입 경로를 두 함수로만 한정. HTML의 onclick은 모두 위 두 함수만 호출.
document.addEventListener('DOMContentLoaded', () => {
    // 더미 데이터 진입점 제거됨 (Phase 7)
});
```

## 2. auth.js (최신 수정본)
```javascript
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
```

## 3. chat.js (최신 수정본)
```javascript
// [실시간 1:1 채팅 시스템 (Supabase Real-time)]
// ----------------------------------------
// ⚠️ escapeHtml은 utils.js에서 정의 (중복 정의 금지)

let currentChatRoomId = null;
let chatSubscription = null;       // 현재 열린 채팅방 구독
let myChats = [];

// ✅ NEW: 글로벌 알림용
let globalChatSubscription = null; // 본인이 멤버인 모든 채팅방 구독
let unreadChatCount = 0;           // 안읽은 메시지 카운트
let _myChatRoomIdsCache = null;    // 본인이 멤버인 room id 캐시 (성능)

// 🚨 [Phase 7 최우선 방어벽] 구매자/판매자 롤에 맞는 시스템 가이드 렌더링 함수
window.renderSystemGuide = function(container, isBuyer) {
    if (container.querySelector('.system-guide')) return; 
    const guide = document.createElement('div');
    guide.className = 'system-guide';
    guide.style.cssText = 'background:#F0F9FF; border:1px dashed #38BDF8; padding:14px; border-radius:12px; margin-bottom:16px; font-size:12px; color:#075985; line-height:1.6;';
    
    const buyerGuide = `
        <div style="font-weight:800; margin-bottom:6px; color:#0284C7;">📋 구매자 거래 체크리스트</div>
        ① 거래상대방의 사업자등록번호 및 폐업 여부 확인 (홈택스)<br>
        ② 통장 사본과 사업자명(대표자명) 일치 확인<br>
        ③ 부품 실물 또는 동영상으로 상태 사전 검수<br>
        ④ 고가 거래 시 분할 결제 권장 (선금 30% / 수령 후 70%)<br>
        ⑤ 매입 결제 완료 시 반드시 합산 세금계산서 수령
    `;
    
    const sellerGuide = `
        <div style="font-weight:800; margin-bottom:6px; color:#0284C7;">📋 판매자 거래 체크리스트</div>
        ① 구매자 사업자등록번호 및 담당자 재직 확인<br>
        ② 대금 입금 확인 후 물품 출고 진행<br>
        ③ 출고 즉시 배송정보(운송장 등) 투명하게 공유<br>
        ④ 거래 대금 수취 후 세금계산서 즉시 발행 의무 준수
    `;
    
    guide.innerHTML = isBuyer ? buyerGuide : sellerGuide;
    container.insertBefore(guide, container.firstChild);
};

async function startChat(productId) {
    if (window._startChatBusy) return;
    window._startChatBusy = true;

    try {
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
    
    if(!p.seller_id) {
        alert("판매자 정보가 명확하지 않은 매물입니다.");
        closeProductModal();
        return;
    }
    
    if(p.user_id === currentUser.id || p.seller_id === currentUser.id) {
        alert("본인이 등록한 상품에는 채팅을 걸 수 없습니다.");
        closeProductModal();
        return;
    }
    
    // ✅ 채팅방 존재 여부 확인 — .single() → .maybeSingle() (0행일 때 에러 안 던지게)
    const { data: existingRoom, error: fetchErr } = await supabaseClient
        .from('haema_chat_rooms')
        .select('*')
        .eq('product_id', p.id)
        .eq('buyer_id', currentUser.id)
        .limit(1)
        .maybeSingle();

    if (fetchErr) {
        console.error('채팅방 조회 에러:', fetchErr);
    }
        
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
                seller_id: p.seller_id
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
        // ✅ 새 방 만들었으니 캐시 무효화
        _myChatRoomIdsCache = null;
    }
    
    closeProductModal();
    openChatRoom(roomId, p);
    } finally {
        window._startChatBusy = false;
    }
}

// 하단 탭 '채팅' 눌렀을 때 목록 로드
async function loadChats() {
    triggerBottomNav('chat');

    // ✅ NEW: 채팅 탭 진입 시 안읽은 카운트 클리어
    clearChatBadge();

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
         _myChatRoomIdsCache = [];
         return;
    }

    // ✅ NEW: room id 목록 캐싱 (글로벌 알림 필터링에 사용)
    _myChatRoomIdsCache = rooms.map(r => r.id);
    
    // JS 릴레이션 (haema_products) 수동 연결
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

        // ✅ 사용자 입력 가능한 모든 값에 escape 적용
        const safeRoomId = escapeHtml(room.id);
        const safePTitleShort = escapeHtml(pTitle.substring(0, 10)) + (pTitle.length > 10 ? '...' : '');
        const safeOpName = escapeHtml(opName);
        const safeLastMsg = escapeHtml(lastMsg);
        const safeTime = escapeHtml(timeStr);
        const safeOpInitial = escapeHtml(opName.charAt(0));

        html += `
        <div class="chat-item" onclick="openChatRoomByList('${safeRoomId}')">
            <div class="chat-avatar">${safeOpInitial}</div>
            <div class="chat-info">
                <div class="chat-name-row">
                    <span class="chat-name">${safeOpName} <span style="font-size:11px; font-weight:400; color:#999; margin-left:4px;">${safePTitleShort}</span></span>
                    <span class="chat-time">${safeTime}</span>
                </div>
                <div class="chat-preview">${safeLastMsg}</div>
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
    
    // ✅ 수정 #2: 채팅 페이지 자체를 먼저 활성화해야 chatroom이 보임
    //    기존: chatroomEl.style.display = 'flex' 만 했음 — 부모 page-chat이
    //    숨겨져 있으면 자식인 chatroom을 보이게 해도 화면에 안 나타남.
    showPage('chat');

    // chat-list 숨기고 chatroom만 보이게
    if (typeof showChatRoom === 'function') {
        showChatRoom();
    } else {
        // 폴백
        const chatListEl = document.getElementById('chat-list');
        if (chatListEl) chatListEl.style.display = 'none';
        const chatroomEl = document.getElementById('chatroom');
        if (chatroomEl) chatroomEl.style.display = 'flex';
        const fab = document.querySelector('.fab-container');
        if (fab) fab.style.display = 'none';
    }

    // ✅ 채팅방 진입 시 안읽은 카운트 클리어
    clearChatBadge();
    
    // ✅ textContent 사용 → 자동 escape (XSS 안전)
    document.getElementById('chat-product-title').textContent = pData ? (pData.title || '상품 정보') : '상품 정보';
    document.getElementById('chat-product-price').textContent = (pData && pData.price) ? pData.price : '-';

    // ✅ 배너 렌더링 — DB의 svg 컬럼이 사용자 입력 HTML일 가능성이 있으므로
    //    getProductImageHtml로 대체 (image_url 우선, 없으면 카테고리 SVG)
    const imgEl = document.getElementById('chat-product-img');
    if (pData) {
        if (typeof getProductImageHtml === 'function') {
            imgEl.innerHTML = getProductImageHtml(pData);
        } else if (pData.image_url) {
            const safeUrl = escapeHtml(pData.image_url);
            imgEl.innerHTML = `<img src="${safeUrl}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            imgEl.innerHTML = '<div style="width:100%;height:100%;background:#D4E8F8;"></div>';
        }
    } else {
        imgEl.innerHTML = '<div style="width:100%;height:100%;background:#D4E8F8;"></div>';
    }
    
    const msgContainer = document.getElementById('chat-messages-container');
    msgContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:12px;">메시지 로딩중...</div>';
    
    // 거래완료 판단
    const tradeBtn = document.getElementById('chat-trade-btn');
    
    let currentRoomBuyerId = null;
    const { data: roomInfo, error: roomErr } = await supabaseClient.from('haema_chat_rooms').select('buyer_id').eq('id', roomId).maybeSingle();
    if (roomErr) console.warn('roomInfo 조회 실패:', roomErr);
    if (roomInfo) currentRoomBuyerId = roomInfo.buyer_id;

    if (pData && tradeBtn) {
        if (pData.is_closed) {
            tradeBtn.textContent = '후기 남기기';
            tradeBtn.style.background = '#EAEDF2';
            tradeBtn.style.color = '#7A93B0';
            tradeBtn.style.display = 'block';
            tradeBtn.onclick = () => {
                const revieweeId = pData.user_id === currentUser.id ? (pData.highest_bidder_id || currentRoomBuyerId) : pData.user_id;
                openReviewModal(pData.id, revieweeId);
            };
        } else {
            const isSeller = (pData.user_id === currentUser.id || pData.seller_id === currentUser.id);
            if (isSeller) {
                tradeBtn.textContent = '거래완료';
                tradeBtn.style.background = '#f4f9ff';
                tradeBtn.style.color = '#1a5fa0';
                tradeBtn.style.display = 'block';
                tradeBtn.onclick = () => completeTransaction(pData.id, roomId);
            } else {
                tradeBtn.style.display = 'none';
            }
        }
    }
    
    // (Phase 7: renderSystemGuide 전역으로 이동됨)
    
    // 기존 메시지 로드
    const { data: messages, error } = await supabaseClient
        .from('haema_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
        
    msgContainer.innerHTML = '';
    
    // 🚨 시스템 가이드 렌더링 호출
    const isBuyer = roomInfo ? (currentUser.id === roomInfo.buyer_id) : false;
    renderSystemGuide(msgContainer, isBuyer);

    if(messages && messages.length > 0) {
        messages.forEach(msg => {
            renderMessage(msg);
        });
    } else {
        const emptyGuide = document.createElement('div');
        emptyGuide.id = 'empty-chat-state';
        emptyGuide.style.cssText = 'text-align:center; padding:20px; color:#999; font-size:12px;';
        emptyGuide.textContent = '첫 메시지를 보내 대화를 시작해보세요. (엔터 발송 가능)';
        msgContainer.appendChild(emptyGuide);
    }
    
    scrollChatToBottom();
    
    // 소켓 구독 시작 (현재 방 전용)
    subscribeToMessages(roomId);
}

function renderMessage(msg) {
    const msgContainer = document.getElementById('chat-messages-container');
    if (!msgContainer) return;
    const emptyState = document.getElementById('empty-chat-state');
    if(emptyState) emptyState.style.display = 'none';

    // ✅ currentUser null 체크 추가 (로그아웃 직후 메시지 도착 대응)
    const isMine = currentUser ? (msg.sender_id === currentUser.id) : false;
    const d = new Date(msg.created_at || Date.now());
    const timeStr = d.getHours() + ":" + String(d.getMinutes()).padStart(2, '0');

    // ✅ msg.content 항상 escape (utils.js의 escapeHtml은 단일 정의)
    const safeContent = escapeHtml(msg.content);
    const safeTime = escapeHtml(timeStr);
    
    let html = '';
    if(isMine) {
        // 내 메시지 (우측) 노란색
        html = `
        <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
            <div style="display:flex; align-items:flex-end; gap:6px;">
                <span style="font-size:10px; color:#999;">${safeTime}</span>
                <div style="background:var(--yellow-400); color:#333; padding:10px 14px; border-radius:16px; border-bottom-right-radius:4px; font-size:14px; font-weight:500; max-width:240px; word-break:break-word; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                    ${safeContent}
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
                    ${safeContent}
                </div>
                <span style="font-size:10px; color:#999;">${safeTime}</span>
            </div>
        </div>
        `;
    }
    
    msgContainer.insertAdjacentHTML('beforeend', html);
}

// ⚠️ 기존 chat.js에 있던 escapeHtml 정의는 삭제됨 (utils.js 사용)

function scrollChatToBottom() {
    const msgContainer = document.getElementById('chat-messages-container');
    if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
}

async function sendChatMessage() {
    const inputEl = document.getElementById('chat-input-text');
    const content = inputEl.value.trim();
    if(!content || !currentChatRoomId || !currentUser) return;
    
    inputEl.value = ''; // 입력창 즉각 비움
    
    const newMessage = {
        room_id: currentChatRoomId,
        sender_id: currentUser.id,
        content: content
    };
    
    const { error: msgErr } = await supabaseClient.from('haema_messages').insert(newMessage);
    
    if(msgErr) {
         console.error("메시지 전송 실패", msgErr);
         alert('메시지 전송에 실패했습니다. 다시 시도해주세요.');
         inputEl.value = content;
         return;
    }
    
    // 채팅방 최신 상태 업데이트
    await supabaseClient.from('haema_chat_rooms').update({
        last_message: content,
        last_updated_at: new Date().toISOString()
    }).eq('id', currentChatRoomId);
}

// 실시간 변화 구독 함수 (현재 열린 방 전용)
function subscribeToMessages(roomId) {
    if(chatSubscription) {
        supabaseClient.removeChannel(chatSubscription);
    }
    
    chatSubscription = supabaseClient.channel(`chat-room-${roomId}`)
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

// ============================================================================
// ✅ NEW: 글로벌 채팅 알림 시스템 (수정 #3)
// ============================================================================
// 목적: 사용자가 다른 페이지에 있을 때도 새 메시지 도착을 감지하여
//       마이페이지 "채팅" 메뉴의 빨간 N 뱃지를 업데이트.
//
// 구현:
//   - 본인이 멤버인 모든 chat_rooms의 INSERT 이벤트를 구독
//   - 본인이 보낸 메시지, 현재 보고있는 방의 메시지는 카운트 안 함
//   - loadChats() 진입 시 카운트 0으로 초기화
//
// 호출처:
//   - subscribeToGlobalMessages(): auth.js의 onAuthStateChange (SIGNED_IN 시)
//   - unsubscribeFromGlobalMessages(): auth.js의 onAuthStateChange (SIGNED_OUT 시)
// ============================================================================

window.subscribeToGlobalMessages = function() {
    if (!currentUser) return;
    
    // 기존 구독 해제 (재로그인 등 대비)
    if (globalChatSubscription) {
        supabaseClient.removeChannel(globalChatSubscription);
        globalChatSubscription = null;
    }
    
    globalChatSubscription = supabaseClient
        .channel(`global-chat-${currentUser.id}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'haema_messages' },
            async (payload) => {
                const msg = payload.new;
                if (!msg) return;

                // 1) 본인이 보낸 메시지 → 무시
                if (msg.sender_id === currentUser.id) return;

                // 2) 현재 열려있는 방의 메시지 → 이미 chatSubscription이 처리함
                if (currentChatRoomId && msg.room_id === currentChatRoomId) return;

                // 3) 내가 멤버인 방인지 확인 (캐시 우선, 없으면 DB 조회)
                let isMyRoom = false;
                if (Array.isArray(_myChatRoomIdsCache)) {
                    isMyRoom = _myChatRoomIdsCache.includes(msg.room_id);
                }
                if (!isMyRoom) {
                    // 캐시에 없거나 신규 방일 수 있음 → 한번 더 DB 조회
                    const { data: room } = await supabaseClient
                        .from('haema_chat_rooms')
                        .select('id, buyer_id, seller_id')
                        .eq('id', msg.room_id)
                        .maybeSingle();
                    if (!room) return;
                    if (room.buyer_id !== currentUser.id && room.seller_id !== currentUser.id) return;
                    
                    // 캐시 갱신
                    if (Array.isArray(_myChatRoomIdsCache) && !_myChatRoomIdsCache.includes(room.id)) {
                        _myChatRoomIdsCache.push(room.id);
                    }
                    isMyRoom = true;
                }

                if (!isMyRoom) return;

                // 4) 카운트 증가 + 뱃지 갱신
                unreadChatCount += 1;
                updateChatBadge();
            }
        )
        .subscribe();
};

window.unsubscribeFromGlobalMessages = function() {
    if (globalChatSubscription) {
        supabaseClient.removeChannel(globalChatSubscription);
        globalChatSubscription = null;
    }
    unreadChatCount = 0;
    _myChatRoomIdsCache = null;
    updateChatBadge();
};

function updateChatBadge() {
    // 마이페이지 메뉴의 채팅 뱃지
    const badge = document.getElementById('chat-badge');
    if (badge) {
        if (unreadChatCount > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = unreadChatCount > 99 ? '99+' : String(unreadChatCount);
        } else {
            badge.style.display = 'none';
        }
    }
}

function clearChatBadge() {
    unreadChatCount = 0;
    updateChatBadge();
}
```

## 4. index.html (최신 수정본)
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="description" content="해마 마켓(Haema Market) - 조선/해양 B2B 조선기자재 중고 직거래 및 경매장 플랫폼. 선박 엔진, 레이더, 갑판 장비 등 인증받은 기업 간의 신뢰도 높은 해양 부품 거래처를 확보하세요.">
  <link rel="icon" href="images/seahorse_logo.png?v=2">
  <title>해마 마켓 - 중고 선박 기자재 거래 플랫폼</title>

  <!-- Open Graph (디카바 포털 등 외부 링크 미리보기용 — openProductModal에서 동적 갱신됨) -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="해마 마켓">
  <meta property="og:title" content="해마 마켓 - 중고 선박 기자재 거래 플랫폼">
  <meta property="og:description" content="조선·해양 B2B 조선기자재 중고 직거래 및 경매 플랫폼">
  <meta property="og:image" content="">
  <meta property="og:url" content="">

  <!-- Supabase & Custom Script -->
  <!-- ⚠️ 중요: defer 속성을 쓸 때, 스크립트는 HTML에 적힌 순서대로 실행됨.
       utils.js는 escapeHtml/getProductImageHtml를 정의하므로 다른 모듈보다
       먼저 와야 함 (config.js 다음 추천) -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="./js/modules/config.js" defer></script>
  <script src="./js/modules/utils.js" defer></script>
  <script src="./js/modules/store.js" defer></script>
  <script src="./js/modules/ui.js" defer></script>
  <script src="./js/modules/auth.js" defer></script>
  <script src="./js/modules/product.js" defer></script>
  <script src="./js/modules/cart.js" defer></script>
  <script src="./js/modules/chat.js" defer></script>
  <script src="./js/modules/community.js" defer></script>
  <script src="./js/modules/mypage.js" defer></script>
  <script src="./js/modules/app.js" defer></script>
  <!-- Custom Stylesheet -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css">
  <link rel="stylesheet" href="./css/market.css">
</head>
<body>
 
<!-- 홈 -->
<div class="page active" id="page-home">
<div class="wrap">
  <div class="header">
    <div class="logo-area">
      <img class="logo-seahorse" src="images/seahorse_logo.png?v=2" alt="해마 마켓 로고">
      <div class="logo-text-wrap">
        <span class="logo-name">해마</span>
        <span class="logo-sub">해운 마켓</span>
      </div>
    </div>
    <div class="search-bar">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#7A93B0" stroke-width="1.3"/><line x1="10" y1="10" x2="14" y2="14" stroke="#7A93B0" stroke-width="1.3" stroke-linecap="round"/></svg>
      <input type="text" id="search-input" placeholder="선박 엔진, 앵커, 레이더 등 검색" autocomplete="off">
    </div>
    <div class="header-nav" style="gap: 8px;">
      <button class="btn-sell" id="header-cart-btn" onclick="showPage('cart'); renderCartPage();" style="background:#F0F9FF; color:#0284C7; border:1px solid #0284C7; position:relative;">
        장바구니
        <div id="header-cart-badge" style="position:absolute; top:-6px; right:-6px; background:#D32F2F; color:#fff; font-size:10px; font-weight:800; min-width:16px; height:16px; border-radius:8px; display:none; align-items:center; justify-content:center; padding:0 4px; box-shadow:0 2px 4px rgba(0,0,0,0.2);">0</div>
      </button>
      <button class="btn-login" id="header-btn-login" onclick="showPage('login')">로그인</button>
      
      <button class="btn-sell" onclick="goToRegisterCreateMode()">+ 등록</button>
    </div>
  </div>
 
  <div class="top-nav-tabs" id="top-nav-tabs">
    <div class="top-tab active" data-top="전체">전체</div>
    <div class="top-tab" data-top="기부속">중고기부속</div>
    <div class="top-tab" data-top="선용품">선용품</div>
    <div class="top-tab" data-top="안전장비">안전장비</div>
    <div class="top-tab" data-top="주/부식">주/부식</div>
  </div>
 
  <div class="cat-bar" id="sub-cat-bar">
    <div class="cat-item active">전체</div>
    <!-- JS will populate -->
  </div>
  
  <div id="food-cat-bar" class="food-cat-bar" style="display:none; overflow-x:auto; white-space:nowrap; padding: 12px 20px; background:#F0F9FF; border-top:1px solid #eaedf2; border-bottom:1px solid #eaedf2; gap:8px;">
      <!-- JS will populate -->
  </div>
 
  <div class="filter-bar">
    <div class="filter-chip" onclick="applySubFilter('tradeType', '경매')" style="background:#FFEDD5; color:#EA580C; border-color:#EA580C; font-weight: 600;">진행중인 경매</div>
    <div class="filter-dropdown" data-target="region">지역 ▾</div>
    <div class="filter-dropdown" data-target="condition">상태 ▾</div>
    <div class="filter-dropdown" data-target="cert">인증 ▾</div>
    <div class="filter-dropdown" data-target="tradeType">거래방식 ▾</div>
    <div class="filter-dropdown" data-target="supplier">공급업체 ▾</div>
    <div class="filter-dropdown" data-target="price">가격대 ▾</div>
    <div class="filter-reset">초기화 ↺</div>
  </div>
 
  <div class="filter-panels">
    <div class="filter-panel" id="panel-region">
      <div class="f-sub-chip on" data-key="region" data-val="전체">전체지역</div>
      <div class="f-sub-chip" data-key="region" data-val="부산">부산/경남</div>
      <div class="f-sub-chip" data-key="region" data-val="인천">인천/수도권</div>
      <div class="f-sub-chip" data-key="region" data-val="울산">울산/포항</div>
      <div class="f-sub-chip" data-key="region" data-val="여수">여수/광양</div>
      <div class="f-sub-chip" data-key="region" data-val="목포">목포/전남</div>
    </div>
    <div class="filter-panel" id="panel-condition">
      <div class="f-sub-chip on" data-key="condition" data-val="전체">전체상태</div>
      <div class="f-sub-chip" data-key="condition" data-val="최상">최상</div>
      <div class="f-sub-chip" data-key="condition" data-val="양호">양호</div>
      <div class="f-sub-chip" data-key="condition" data-val="보통">보통</div>
      <div class="f-sub-chip" data-key="condition" data-val="부품용">부품용</div>
    </div>
    <div class="filter-panel" id="panel-cert">
      <div class="f-sub-chip on" data-key="cert" data-val="전체">전체보기</div>
      <div class="f-sub-chip" data-key="cert" data-val="KR">KR 승인</div>
      <div class="f-sub-chip" data-key="cert" data-val="기타선급">DNV/ABS 등</div>
      <div class="f-sub-chip" data-key="cert" data-val="없음">인증서 없음</div>
    </div>
    <div class="filter-panel" id="panel-tradeType">
      <div class="f-sub-chip on" data-key="tradeType" data-val="전체">전체방식</div>
      <div class="f-sub-chip" data-key="tradeType" data-val="직거래">일반 직거래</div>
      <div class="f-sub-chip" data-key="tradeType" data-val="경매">경매중</div>
      <div class="f-sub-chip" data-key="tradeType" data-val="가격제안">Nego 가능</div>
    </div>
    <div class="filter-panel" id="panel-supplier">
      <div class="f-sub-chip on" data-key="supplier" data-val="전체">전체업체</div>
      <div class="f-sub-chip" data-key="supplier" data-val="늘푸른식품">늘푸른식품</div>
      <div class="f-sub-chip" data-key="supplier" data-val="여수부식센터">여수부식센터</div>
      <div class="f-sub-chip" data-key="supplier" data-val="울산상사">울산상사</div>
      <div class="f-sub-chip" data-key="supplier" data-val="인천글로벌">인천글로벌</div>
      <div class="f-sub-chip" data-key="supplier" data-val="항구종합식자재">항구종합</div>
    </div>
    <div class="filter-panel" id="panel-price">
      <div style="display:flex; align-items:center; gap:4px; width:100%;">
        <input type="number" id="min-price" placeholder="최소 금액(원)" style="flex:1; padding:6px; font-size:12px; border:1px solid var(--border); border-radius:6px; outline:none; font-family:inherit;">
        <span style="color:var(--text-muted);font-size:13px;">~</span>
        <input type="number" id="max-price" placeholder="최대 금액(원)" style="flex:1; padding:6px; font-size:12px; border:1px solid var(--border); border-radius:6px; outline:none; font-family:inherit;">
        <button id="price-apply" style="padding:6px 14px; font-size:12px; background:var(--blue-800); border:none; color:#fff; border-radius:6px; font-weight:700; cursor:pointer;">범위 적용</button>
      </div>
    </div>
  </div>
  <div style="height:1px; background:var(--border);"></div>
 
  <div class="banner">
    <div class="banner-left">
      <span class="banner-tag" id="banner-tag">NEW</span>
      <span class="banner-text" id="banner-text">경매 기능 오픈! 희귀 기자재를 경쟁 입찰로 만나보세요</span>
    </div>
    <button class="banner-btn" onclick="triggerBottomNav('auction')">자세히 보기</button>
  </div>
 
  <div class="main">
    
    <div id="home-category-area">
      <div class="section-header"><span class="section-title">카테고리</span></div>
      <div class="cat-grid" id="main-cat-grid">
        <!-- JS populated icons -->
      </div>
    </div>
 
    <!-- Recommendations Area for Bunjang-style curation -->
    <div id="home-recommendation-area" style="display: none; margin-bottom: 24px;">
      <div class="section-header"><span class="section-title"><span style="color:#0284C7; margin-right:6px; font-size:16px;">▪</span>오늘의 추천 특가</span><span class="section-more" onclick="triggerBottomNav('home')" style="cursor:pointer;">더보기 →</span></div>
      <div class="horizontal-scroll-list" id="recommendation-list">
        <!-- JS populated horizontal scroll products -->
      </div>
      
      <div class="section-header" style="margin-top: 24px;"><span class="section-title"><span style="color:#0284C7; margin-right:6px; font-size:16px;">▪</span>인기 카테고리 기획전</span><span class="section-more" onclick="triggerBottomNav('home')" style="cursor:pointer;">더보기 →</span></div>
      <div class="horizontal-scroll-list" id="curation-list">
        <!-- JS populated curation products -->
      </div>
    </div>
 
    <div class="section-header" id="main-product-title-header"><span class="section-title"><span style="color:#0284C7; margin-right:6px; font-size:16px;">▪</span>최신 매물</span><span class="section-more">더보기 →</span></div>
    <div class="product-grid" id="main-product-grid">
      <!-- JS populated grid -->
    </div>
  </div>
 
    </div>
</div>
 
<!-- 매물등록 -->
<div class="page" id="page-register">
<div class="wrap">
  <div class="sub-header"><span class="back-btn" onclick="history.back()">‹</span><span class="sub-title">매물 등록</span><span class="sub-action" onclick="alert('임시저장되었습니다. (마이페이지 연동 업데이트 대기중)')">임시저장</span></div>
  <div class="sub-body">
    <!-- 🚨 [Phase 7 최우선 방어벽] 매물 등록 페이지 면책 가이드 -->
    <div style="background:#FFF3C0; border-left:4px solid #F57C00; padding:12px 16px; margin-bottom:20px; font-size:12px; color:#5D4037; line-height: 1.6; border-radius: 4px;">
        ℹ️ <strong>매물 등록 전 안내 (필독)</strong><br>
        해마 마켓은 회원 간 매물 탐색 및 매칭용 온라인 공간입니다. 거래 대금을 중개하거나 보관(안심결제)하지 않습니다. 
        등록된 매물의 진위, 품질, 법적 권리에 대한 일체의 행정적/법적 책임은 <strong>등록자 본인</strong>에게 귀속됩니다.
    </div>
    <div class="form-section"><div class="form-section-title">사진 등록</div><div class="photo-upload"><input type="file" id="photo-upload-input" accept="image/*" style="display:none;"><div class="photo-box main" id="photo-box-main" onclick="document.getElementById('photo-upload-input').click()" style="background-size:cover; background-position:center; cursor:pointer;"><span class="photo-plus">+</span><span class="photo-main-label">대표사진</span></div><div class="photo-box"><span class="photo-plus">+</span><span class="photo-label">추가</span></div><div class="photo-box"><span class="photo-plus">+</span><span class="photo-label">추가</span></div><div class="photo-box"><span class="photo-plus">+</span><span class="photo-label">추가</span></div></div></div>
    <div class="form-section"><div class="form-section-title">기본 정보</div><div class="form-row"><label class="form-label">카테고리<span>*</span></label><select class="form-select"><option>카테고리 선택</option><option>엔진·동력</option><option>항법장비</option><option>갑판장비</option><option>통신장비</option><option>안전장비</option></select></div><div class="form-row"><label class="form-label">상품명<span>*</span></label><input class="form-input" id="title-input" type="text" placeholder="예) JRC 레이더 JMA-5212-6"></div><div class="form-row-2"><div><label class="form-label">제조사</label><input class="form-input" type="text" placeholder="예) JRC"></div><div><label class="form-label">제조연도</label><input class="form-input" type="text" placeholder="예) 2018" maxlength="4" oninput="this.value = this.value.replace(/[^0-9]/g, '')"></div></div></div>
    <div class="form-section"><div class="form-section-title">상태 및 가격</div><div class="form-row"><label class="form-label">기자재 상태<span>*</span></label><div class="condition-row"><div class="cond-chip on">최상</div><div class="cond-chip">양호</div><div class="cond-chip">보통</div><div class="cond-chip">부품용</div></div></div><div class="form-row"><label class="form-label">거래 방식<span>*</span></label><div class="trade-row"><div class="trade-chip on">직거래</div><div class="trade-chip">경매</div><div class="trade-chip">모두</div></div></div><div class="form-row"><label class="form-label" id="price-label">판매 희망가<span>*</span></label><input class="form-input" id="price-input" type="text" placeholder="₩ 가격 입력"></div><div class="form-row" id="auction-date-row" style="display:none; margin-top:16px;"><label class="form-label">경매 마감일시<span>*</span></label><input class="form-input" id="auction-end-input" type="datetime-local" onclick="this.showPicker()"></div></div>
    <div class="form-section"><div class="form-section-title">상세 설명</div><div class="form-row"><label class="form-label">설명<span>*</span></label><textarea class="form-textarea" id="desc-input" placeholder="기자재의 사용 이력, 하자 유무, 보관 상태 등을 자세히 적어주세요."></textarea></div><div class="form-row"><label class="form-label">거래 지역</label><select class="form-select" id="region-input"><option value="부산">부산/경남</option><option value="인천">인천/수도권</option><option value="울산">울산/포항</option><option value="여수">여수/광양</option><option value="목포">목포/전남</option></select></div></div>
    <button class="submit-btn">등록하기</button>
  </div>
</div>
</div>
 
<!-- 채팅 -->
<div class="page" id="page-chat">
<div class="wrap">
  <div class="sub-header"><span class="back-btn" onclick="triggerBottomNav('home')">‹</span><span class="sub-title">채팅</span></div>
  <div class="chat-list" id="chat-list" style="padding-bottom: 20px;">
    <!-- 동적 채팅 목록 렌더링 영역 -->
  </div>
  <div class="chatroom" id="chatroom" style="display:none;">
    <div class="chatroom-header"><span class="back-btn" onclick="hideChatRoom()">‹</span><span id="chat-receiver-name" style="font-size:15px;font-weight:700;color:#1A2B4A;flex:1;">판매자와 채팅</span></div>
    <div class="chatroom-product" id="chat-product-bar" style="display:flex; border-bottom:1px solid #eee; padding:12px 16px; align-items:center; gap:8px; background:#fff;"><div class="cp-img" id="chat-product-img" style="width:40px;height:40px;overflow:hidden;border-radius:4px;background:#F0F9FF;"></div><div style="flex:1;"><div class="cp-title" id="chat-product-title" style="font-size:13px;font-weight:600;color:#1a2b4a;"></div><div class="cp-price" id="chat-product-price" style="font-size:14px;font-weight:700;color:#0284C7;"></div></div><button id="chat-trade-btn" class="cp-btn" style="background:#F0F9FF; color:#0284C7; border:none; border-radius:6px; padding:6px 10px; font-size:12px; font-weight:700; cursor:pointer;">거래완료</button></div>
    
    <!-- 🚨 [Phase 7 최우선 방어벽] 채팅방 면책 고지 배너 -->
    <div id="chat-disclaimer-banner" style="background: linear-gradient(to right, #FFF3C0 0%, #FFE082 100%); border-top: 1px solid #FFB74D; border-bottom: 2px solid #FB8C00; padding: 10px 16px; font-size: 12px; color: #5D4037; line-height: 1.5; position: sticky; top: 0; z-index: 10;">
        ⚠️ <strong>[중요 고지] 본 거래는 회원 간 직거래입니다.</strong> 해마 마켓은 매칭 서비스만 제공하며 상품, 대금 등 거래 제반 과정의 어떠한 법적 책임도 지지 않습니다. 
        <a href="javascript:alert('거래 전 반드시 사업자등록증 및 대금 수취 계좌(법인/대표자명 일치 여부)를 상호 확인하시기 바랍니다.\n거래 완료 후에는 반드시 세금계산서를 수발신하여 피해를 방지하세요.');" style="color:#1A5FA0; font-weight:800; text-decoration:underline;">거래 가이드 보기</a>
    </div>
    <div class="chat-messages" id="chat-messages-container" style="flex:1; overflow-y:auto; padding:16px;">
      <!-- 동적 메시지 영역 -->
    </div>
    <div class="chat-input-bar" style="background:#fff; border-top:1px solid #eee; padding:12px 16px; display:flex; gap:8px;"><input type="text" id="chat-input-text" placeholder="메시지를 입력하세요" onkeypress="if(event.key==='Enter') sendChatMessage()" style="flex:1; background:#F0F9FF; border:none; padding:10px 14px; border-radius:20px; font-size:14px; outline:none;"><button class="chat-send" onclick="sendChatMessage()" style="width:40px; height:40px; border-radius:50%; background:var(--yellow-400); border:none; display:flex; align-items:center; justify-content:center; cursor:pointer;"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8l12-6-5 6 5 6-12-6z" fill="#7A5200"/></svg></button></div>
 
  </div>
</div>
</div>
 
<!-- 마이페이지 -->
<div class="page" id="page-mypage">
<div class="wrap">
  <div class="sub-header"><span class="sub-title">마이페이지</span><span class="sub-action" onclick="showPage('settings')">설정</span></div>
  <div>
    <div class="my-profile"><div class="my-avatar" id="profile-avatar"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div><div><div style="display:flex; align-items:center;"><div class="my-name" id="profile-name">해마 유저</div><div id="profile-region-badge" style="display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; margin-left:6px; background:#EAEDF2; color:#7A93B0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 미설정</div></div><div class="my-sub" id="profile-email">이메일 정보 없음</div><div class="my-badge" id="profile-biz-badge">일반 회원</div></div><button class="my-edit-btn" onclick="openProfileEdit()">편집</button></div>
    
    <!-- 거래 평점 섹션 -->
    <div class="user-rating-box" style="padding:16px 20px; background:#fff; border-bottom:8px solid #F0F9FF;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:14px; font-weight:700; color:#1A2B4A;">거래 신뢰도</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <div id="user-rating-stars" style="color:#F5C518; font-size:18px; letter-spacing:1px; display:flex;">
            <!-- JS will populate stars -->
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <span id="user-rating-text" style="font-size:18px; font-weight:800; color:#1A2B4A;">5.0</span><span style="font-size:12px; color:#7A93B0; margin-left:-4px;">/5</span>
        </div>
      </div>
    </div>
    
    <div class="my-stats" style="border-top:none;"><div class="stat-item"><span class="stat-num">24</span><span class="stat-label">판매완료</span></div><div class="stat-item" onclick="showPage('mylist')" style="cursor:pointer;"><span class="stat-num">3</span><span class="stat-label">판매중</span></div><div class="stat-item"><span class="stat-num">4.9</span><span class="stat-label">거래 평점</span></div></div>
    <div class="my-menu-section">
      <div class="my-menu-title">나의 거래</div>
      <div class="my-menu-item" onclick="showMyQuotes()"><div class="menu-icon" style="background:#E8F5E9;"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4h10v10H4z" stroke="#15803D" stroke-width="1.2"/><path d="M4 7h10M4 11h10M7 4v10" stroke="#15803D" stroke-width="1.2"/></svg></div><span class="menu-text">발주한 견적서 목록</span><span class="menu-arrow">›</span></div>
      <div class="my-menu-item" onclick="showMyList()"><div class="menu-icon" style="background:#BAE6FD;"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="5" width="14" height="10" rx="2" stroke="#0284C7" stroke-width="1.2"/><path d="M5 5V4a4 4 0 018 0v1" stroke="#0284C7" stroke-width="1.2" stroke-linecap="round"/></svg></div><span class="menu-text">판매 목록</span><span class="menu-arrow">›</span></div>
      <div class="my-menu-item" onclick="triggerBottomNav('auction')"><div class="menu-icon" style="background:#FFEDD5;"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2l1.8 5.4H17l-4.5 3.3 1.7 5.3L9 13l-4.2 3 1.7-5.3L2 7.4h5.2L9 2z" stroke="#EA580C" stroke-width="1.1" stroke-linejoin="round"/></svg></div><span class="menu-text">경매 참여 내역</span><span class="menu-arrow">›</span></div>
      <div class="my-menu-item" onclick="loadLikedProducts()"><div class="menu-icon" style="background:#FFF0F5;"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 15s-7-4.5-7-9a7 7 0 0114 0c0 4.5-7 9-7 9z" stroke="#D81B60" stroke-width="1.2" fill="#FFE0EB"/><circle cx="9" cy="6" r="2" stroke="#D81B60" stroke-width="1.2"/></svg></div><span class="menu-text">관심 목록 (찜)</span><span class="menu-arrow">›</span></div>
      <div class="my-menu-item" onclick="loadChats()"><div class="menu-icon" style="background:#FFEDD5;"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4h14v9a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="#EA580C" stroke-width="1.2"/><path d="M2 4l7 6 7-6" stroke="#EA580C" stroke-width="1.2"/></svg></div><span class="menu-text">채팅</span><span class="menu-badge-red" id="chat-badge" style="display:none;">N</span><span class="menu-arrow" style="margin-left:6px;">›</span></div>
    </div>
    <div class="my-menu-section">
      <div class="my-menu-title">계정 관리</div>
      <div class="my-menu-item" onclick="openProfileEdit()"><div class="menu-icon" style="background:#F0F9FF;"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="7" r="4" stroke="#7A93B0" stroke-width="1.2"/><path d="M2 16c0-3.3 3.1-5 7-5s7 1.7 7 5" stroke="#7A93B0" stroke-width="1.2" stroke-linecap="round"/></svg></div><span class="menu-text">프로필 편집</span><span class="menu-arrow">›</span></div>
      <div class="my-menu-item" onclick="openBusinessAuth()"><div class="menu-icon" style="background:#F0F9FF;"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="12" height="12" rx="2" stroke="#7A93B0" stroke-width="1.2"/><path d="M6 9l2 2 4-4" stroke="#7A93B0" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span class="menu-text">사업자 인증</span><span id="biz-auth-status" style="font-size:11px;color:#1E8E3E;margin-right:6px;font-weight:700;display:none;">✓ 승인완료</span><span class="menu-arrow">›</span></div>
      <div class="my-menu-item" onclick="showPage('reviews')"><div class="menu-icon" style="background:#F0F9FF;"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6" stroke="#7A93B0" stroke-width="1.2"/><path d="M9 6v3l2 2" stroke="#7A93B0" stroke-width="1.2" stroke-linecap="round"/></svg></div><span class="menu-text">거래 후기</span><span class="menu-arrow">›</span></div>
      <div class="my-menu-item" id="admin-route-btn" style="display:none; background:#FFF7ED; margin-bottom: 8px; border-radius:8px;" onclick="window.location.href='admin.html'"><div class="menu-icon" style="background:#FB923C;"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" stroke="#0F172A" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span class="menu-text" style="color:#0F172A; font-weight:700;">관리자 대시보드</span><span class="menu-arrow" style="color:#0F172A;">›</span></div>
      <div class="my-menu-item" onclick="doLogout()"><div class="menu-icon" style="background:#FFF0F0;"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4l4 5-4 5M4 9h11M8 2h-4v14h4" stroke="#D32F2F" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span class="menu-text" style="color:#D32F2F;">로그아웃</span></div>
    </div>
  </div>
</div>
</div>
 
<!-- 발주한 견적/결제 내역 페이지 -->
<div class="page" id="page-myquotes">
  <div class="wrap" style="background:#F0F9FF; height:100vh; display:flex; flex-direction:column;">
    <div class="sub-header" style="background:#fff;">
      <span class="back-btn" onclick="showPage('mypage')">‹</span>
      <span class="sub-title">발주한 견적 내역</span>
    </div>
    <div id="myquotes-content-area" style="flex:1; overflow-y:auto; padding:20px; padding-bottom:120px;">
      <div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">불러오는 중...</div>
    </div>
  </div>
</div>
<!-- 커뮤니티 페이지 -->
<div class="page" id="page-community">
  <div class="wrap" style="background:#F0F9FF; height:100vh; display:flex; flex-direction:column; position:relative;">
    <!-- 상단 헤더 (프리미엄 개편) -->
    <div style="background:#fff; padding: 32px 20px 20px 20px; text-align:center;">
      <h1 style="margin:0; font-size:26px; font-weight:800; color:var(--text-primary); letter-spacing:-0.5px;">해마 커뮤니티</h1>
      <p style="margin:8px 0 0 0; font-size:13px; color:var(--text-muted);">업계 전문가들과 해양 지식과 수리 경험을 공유하세요</p>
    </div>
 
    <!-- 검색 창 -->
    <div style="background:#fff; padding: 0 20px 16px 20px;">
      <div class="search-bar" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; height:44px; display:flex; align-items:center; padding:0 14px; gap:10px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="comm-search-input" placeholder="궁금한 키워드나 장비를 검색해 보세요" oninput="renderCommunityPosts()" style="border:none; background:transparent; font-size:14px; color:var(--text-primary); outline:none; flex:1; font-family:inherit;">
      </div>
    </div>
    
    <!-- 서브 카테고리 -->
    <div style="background:#fff; padding:12px 20px; border-bottom:1px solid #eaedf2; display:flex; gap:8px; overflow-x:auto; white-space:nowrap;" class="hide-scrollbar">
      <div onclick="setCommTag('전체', this)" class="comm-tag active-tag" style="padding:6px 14px; background:#1A2B4A; color:#fff; border-radius:20px; font-size:13px; font-weight:700; cursor:pointer;">전체</div>
      <div onclick="setCommTag('🛠 수리지식', this)" class="comm-tag" style="padding:6px 14px; background:#F0F9FF; color:#7A93B0; border:1px solid #eaedf2; border-radius:20px; font-size:13px; font-weight:700; cursor:pointer;">🛠 수리지식</div>
      <div onclick="setCommTag('자유게시판', this)" class="comm-tag" style="padding:6px 14px; background:#F0F9FF; color:#7A93B0; border:1px solid #eaedf2; border-radius:20px; font-size:13px; font-weight:700; cursor:pointer;">자유게시판</div>
      <div onclick="setCommTag('👨‍🔧 구인구직', this)" class="comm-tag" style="padding:6px 14px; background:#F0F9FF; color:#7A93B0; border:1px solid #eaedf2; border-radius:20px; font-size:13px; font-weight:700; cursor:pointer;">👨‍🔧 구인구직</div>
    </div>
 
    <!-- 본문 내용 -->
    <div id="community-content-area" style="flex:1; overflow-y:auto; padding:16px 20px 120px 20px;">
      <!-- JS 렌더링 -->
    </div>
    
    <!-- 플로팅 글쓰기 버튼 -->
    <button style="position:fixed; bottom:76px; right:16px; width:50px; height:50px; border-radius:50%; background:#0284C7; color:#fff; border:none; box-shadow:0 4px 12px rgba(26,95,160,0.3); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:999;" onclick="openPostWriteModal()">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
    </button>
  </div>
</div>
 
<!-- 사업자 인증 페이지 -->
<div class="page" id="page-business-auth">
<div class="wrap" style="background:#fff; height:100vh; display:flex; flex-direction:column;">
  <div class="sub-header">
    <span class="back-btn" onclick="showPage('mypage')">‹</span>
    <span class="sub-title">사업자 인증</span>
  </div>
  <div style="padding: 40px 20px; flex:1;">
    <div style="text-align:center; font-size:40px; margin-bottom:16px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg></div>
    <div style="text-align:center; font-size:20px; font-weight:700; color:#1A2B4A; margin-bottom:8px;">B2B 신뢰 기업 인증</div>
    <div id="biz-auth-desc" style="text-align:center; font-size:13px; color:#7A93B0; margin-bottom:40px; line-height:1.5;">해마 마켓은 조선/해양 도매 거래의 신뢰를 위해<br>사업자 인증을 권장하고 있습니다.</div>
    
    <div id="biz-auth-form">
      <div class="form-row">
        <label class="form-label">상호명 (기업명)</label>
        <input class="form-input" type="text" id="biz-name-input" placeholder="예: 해마조선">
      </div>
      <div class="form-row">
        <label class="form-label">사업자등록번호 (10자리 숫자)</label>
        <input class="form-input" type="number" id="biz-number-input" placeholder="'-' 제외 10자리 숫자 입력">
      </div>
      <button class="submit-btn" onclick="submitBusinessAuth()" style="margin-top: 30px;">국세청 실시간 진위 확인 (Live)</button>
    </div>
 
    <div id="biz-auth-verified" style="display:none; background:#E6F4EA; border:1px solid #1E8E3E; border-radius:12px; padding:24px; text-align:center;">
       <div style="font-size:24px; font-weight:700; color:#1E8E3E; margin-bottom:4px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg> 인증된 기업입니다</div>
       <div id="biz-verified-name" style="font-size:16px; font-weight:700; color:#1A2B4A; margin-bottom:16px;"></div>
       <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid rgba(0,0,0,0.05);">
           <span style="color:#7A93B0;">사업자등록번호</span>
           <span id="biz-verified-number" style="font-weight:700; color:#1a2b4a;">123-45-67890</span>
       </div>
       <div style="display:flex; justify-content:space-between; font-size:14px;">
           <span style="color:#7A93B0;">국세청(NTS) 연동 상태</span>
           <span style="font-weight:700; color:#1E8E3E;">정상 (계속사업자)</span>
       </div>
    </div>
  </div>
</div>
</div>
 
<!-- 거래 후기 뷰 페이지 -->
<div class="page" id="page-reviews">
<div class="wrap" style="background:#F0F9FF; height:100vh; display:flex; flex-direction:column;">
  <div class="sub-header" style="background:#fff;">
    <span class="back-btn" onclick="showPage('mypage')">‹</span>
    <span class="sub-title">받은 거래 후기</span>
  </div>
  <div style="padding: 20px; flex:1; overflow-y:auto;">
    
    <div style="background:#fff; border-radius:12px; padding:20px; margin-bottom:12px; box-shadow:0 1px 4px rgba(0,0,0,0.03);">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:32px; height:32px; border-radius:50%; background:#0284C7; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700;">인</div>
                <div><div style="font-weight:700; font-size:13px;">인천마린보이</div><div style="font-size:11px; color:#7A93B0;">3일 전 · JRC 레이더 시스템 구매</div></div>
            </div>
            <div style="color:#EA580C; font-size:12px; font-weight:700;">⭐️ 5.0</div>
        </div>
        <div style="font-size:14px; color:#1a2b4a; line-height:1.5;">"포장도 너무 깔끔하게 잘 해주시고, 장비 상태가 설명하신 그대로 S급입니다. 다음에도 꼭 여기서 발주 넣겠습니다. 번창하세요 사장님!"</div>
    </div>
    
    <div style="background:#fff; border-radius:12px; padding:20px; margin-bottom:12px; box-shadow:0 1px 4px rgba(0,0,0,0.03);">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:32px; height:32px; border-radius:50%; background:#1E8E3E; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700;">부</div>
                <div><div style="font-weight:700; font-size:13px;">부산조선기자재</div><div style="font-size:11px; color:#7A93B0;">2주일 전 · MAN B&W 엔진 부품 구매</div></div>
            </div>
            <div style="color:#EA580C; font-size:12px; font-weight:700;">⭐️ 4.5</div>
        </div>
        <div style="font-size:14px; color:#1a2b4a; line-height:1.5;">"직거래로 인천항에서 수령했습니다. 시간에 딱 맞게 나와주셔서 일정에 차질이 없었네요. 엔진 부품도 무사히 장착 완료했습니다."</div>
    </div>
    
    <div style="background:#fff; border-radius:12px; padding:20px; margin-bottom:12px; box-shadow:0 1px 4px rgba(0,0,0,0.03);">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:32px; height:32px; border-radius:50%; background:#7A93B0; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700;">목</div>
                <div><div style="font-weight:700; font-size:13px;">목포제일선박</div><div style="font-size:11px; color:#7A93B0;">1개월 전 · 선박용 압력계 세트 구매</div></div>
            </div>
            <div style="color:#EA580C; font-size:12px; font-weight:700;">⭐️ 5.0</div>
        </div>
        <div style="font-size:14px; color:#1a2b4a; line-height:1.5;">"믿고 거래하는 업체입니다. 서류 처리(세금계산서)도 깔끔해서 경리과에서 좋아하네요."</div>
    </div>
    
  </div>
</div>
</div>
 
<!-- 내가 올린 판매 목록 -->
<div class="page" id="page-mylist">
<div class="wrap">
  <div class="sub-header">
    <span class="back-btn" onclick="showPage('mypage')">‹</span>
    <span class="sub-title">판매 목록</span>
  </div>
  <div class="main" style="min-height: 400px; padding: 20px;">
    <div class="product-grid" id="mylist-grid">
      <!-- 동적 렌더링 영역 -->
    </div>
  </div>
</div>
</div>
 
<!-- 설정 -->
<div class="page" id="page-settings">
<div class="wrap">
  <div class="sub-header"><span class="back-btn" onclick="showPage('mypage')">‹</span><span class="sub-title">설정</span></div>
  <div style="background:var(--surface);padding-top:8px;">
    <div class="setting-section">
      <div class="setting-title">알림</div>
      <div class="setting-item"><span class="setting-label">채팅 알림</span><div class="toggle on" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div></div>
      <div class="setting-item"><span class="setting-label">경매 입찰 알림</span><div class="toggle on" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div></div>
      <div class="setting-item"><span class="setting-label">관심 매물 업데이트</span><div class="toggle" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div></div>
      <div class="setting-item"><span class="setting-label">마케팅 수신</span><div class="toggle" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div></div>
    </div>
    <div class="setting-section">
      <div class="setting-title">계정</div>
      <div class="setting-item"><span class="setting-label">이메일</span><span class="setting-value" id="settings-email">이메일 정보 없음</span><span class="setting-arrow">›</span></div>
      <div class="setting-item"><span class="setting-label">비밀번호 변경</span><span class="setting-arrow">›</span></div>
      <div class="setting-item"><span class="setting-label">연결 계정</span><span class="setting-value">카카오</span><span class="setting-arrow">›</span></div>
      <div class="setting-item"><span class="setting-label">본인 인증</span><span class="setting-value" style="color:#EA580C;font-weight:700;">완료</span><span class="setting-arrow">›</span></div>
    </div>
    <div class="setting-section">
      <div class="setting-title">거래</div>
      <div class="setting-item"><span class="setting-label">계좌 정보</span><span class="setting-value">국민은행 등록됨</span><span class="setting-arrow">›</span></div>
      <div class="setting-item"><span class="setting-label">기본 거래 지역</span><span class="setting-value">부산</span><span class="setting-arrow">›</span></div>
      <div class="setting-item"><span class="setting-label">안전거래 자동적용</span><div class="toggle on" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div></div>
    </div>
    <div class="setting-section">
      <div class="setting-title">앱 정보</div>
      <div class="setting-item"><span class="setting-label">언어</span><span class="setting-value">한국어</span><span class="setting-arrow">›</span></div>
      <div class="setting-item"><span class="setting-label">버전</span><span class="setting-value">1.0.0</span></div>
      <div class="setting-item" onclick="document.getElementById('modal-terms').style.display='flex'" style="cursor:pointer;"><span class="setting-label">이용약관</span><span class="setting-arrow">›</span></div>
      <div class="setting-item" onclick="document.getElementById('modal-privacy').style.display='flex'" style="cursor:pointer;"><span class="setting-label">개인정보처리방침</span><span class="setting-arrow">›</span></div>
      <div class="setting-item"><span class="setting-label">고객센터</span><span class="setting-arrow">›</span></div>
      <!-- ✅ 회원 탈퇴 (가장 마지막 setting-item 다음에 배치) -->
      <!--    admin 계정에는 mypage.js의 deleteAccount 가드가 작동하여 클릭 시 별도 안내 -->
      <div class="setting-item" id="setting-delete-account" onclick="deleteAccount()" style="cursor:pointer; border-top: 8px solid #F4F6F8; margin-top: 16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding: 16px 20px;">
              <div>
                  <div style="font-size: 15px; font-weight: 600; color: #E53E3E;">회원 탈퇴</div>
                  <div style="font-size: 12px; color: #7A93B0; margin-top: 4px;">계정 및 서비스 이용 종료</div>
              </div>
              <span style="color: #E53E3E; font-size: 18px;">›</span>
          </div>
      </div>
  </div>
</div>
</div>
</div>
 
 
<!-- 프로필 편집 -->
<div class="page" id="page-profile-edit">
<div class="wrap" style="background:#fff; height:100vh; display:flex; flex-direction:column;">
  <div class="sub-header">
    <span class="back-btn" onclick="showPage('mypage')">‹</span>
    <span class="sub-title">프로필 편집</span>
  </div>
  <div style="padding: 30px 20px;">
    <div style="display:flex; justify-content:center; margin-bottom: 24px;">
      <div id="edit-avatar-preview" style="width: 80px; height: 80px; border-radius: 50%; background: var(--blue-100); color: var(--blue-800); font-size: 32px; font-weight: bold; display: flex; align-items:center; justify-content:center; border: 3px solid var(--blue-200);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
    </div>
    <div style="text-align:center; font-size:12px; color:var(--text-muted); margin-bottom: 30px;">프로필 이미지는 닉네임 첫 글자로 자동 생성됩니다.</div>
    
    <div class="form-row">
      <label class="form-label">사용할 닉네임</label>
      <input class="form-input" type="text" id="edit-nickname-input" placeholder="새로운 닉네임을 입력하세요">
      <div style="font-size:10px; color:#E53E3E; margin-top:4px;">* 닉네임은 최초 1회만 설정 가능하며 이후 변경이 불가합니다.</div>
    </div>
    
    <div class="form-row" style="margin-top:16px;">
      <label class="form-label">내 상점 한 줄 소개</label>
      <input class="form-input" type="text" id="edit-bio-input" placeholder="(선택) 마켓 이용자들에게 보여질 소개말을 적어주세요">
    </div>
 
    <div class="form-row" style="margin-top:16px;">
      <label class="form-label">활동 지역 (시/도)</label>
      <div style="display:flex; gap:8px;">
          <select class="form-select" id="edit-region-select" style="flex:1;">
              <option value="">지역을 선택하세요</option>
              <option value="서울">서울특별시</option><option value="부산">부산광역시</option>
              <option value="대구">대구광역시</option><option value="인천">인천광역시</option>
              <option value="광주">광주광역시</option><option value="대전">대전광역시</option>
              <option value="울산">울산광역시</option><option value="세종">세종특별자치시</option>
              <option value="경기">경기도</option><option value="강원">강원특별자치도</option>
              <option value="충북">충청북도</option><option value="충남">충청남도</option>
              <option value="전북">전북특별자치도</option><option value="전남">전라남도</option>
              <option value="경북">경상북도</option><option value="경남">경상남도</option>
              <option value="제주">제주특별자치도</option>
          </select>
          <button id="btn-gps-verify" onclick="verifyGPSLocation()" style="background:#F0F9FF; border:1px solid #0284C7; color:#0284C7; border-radius:8px; padding:0 12px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 사업자 소재지 검증</button>
      </div>
      <div style="font-size:10px; color:#7A93B0; margin-top:4px;">* 전국 통합 인증 시스템: B2B 거래 안전을 위해 사업자등록증 상의 주소지와 교차 검증을 진행합니다.</div>
    </div>
 
    
    <button class="submit-btn" onclick="saveProfile()" style="margin-top: 10px;">저장하고 돌아가기</button>
  </div>
</div>
</div>
 
<!-- 로그인 / 회원가입 -->
<div class="page" id="page-login">
<div class="wrap" style="background:#fff; height:100vh; display:flex; flex-direction:column;">
  <div class="sub-header" style="border:none;"><span class="back-btn" onclick="showPage('home')">✕</span><span class="sub-title"></span></div>
  <div class="login-container">
    <div class="login-logo">
      <img src="images/seahorse_logo.png?v=2" alt="logo" width="60">
      <h2>해마 마켓 시작하기</h2>
      <p>중고 선박 기자재의 안전한 거래</p>
    </div>
    
    <div class="auth-tabs">
      <div class="auth-tab active" id="tab-signin" onclick="switchAuthMode('signin')">로그인</div>
      <div class="auth-tab" id="tab-signup" onclick="switchAuthMode('signup')">회원가입</div>
    </div>
    
    <div class="auth-form-wrap">
      <div class="form-row">
        <label class="form-label">이메일</label>
        <input class="form-input" type="email" id="auth-email" placeholder="이메일 주소를 입력해주세요">
      </div>
      <div class="form-row">
        <label class="form-label">비밀번호</label>
        <input class="form-input" type="password" id="auth-pw" placeholder="비밀번호 6자리 이상">
      </div>
      <div class="form-row" id="auth-pw-confirm-row" style="display:none;">
        <label class="form-label">비밀번호 확인</label>
        <input class="form-input" type="password" id="auth-pw-confirm" placeholder="비밀번호를 한번 더 입력해주세요">
      </div>

      <!-- ✅ 회원가입 모드 전용 추가 정보 (signin일 땐 display:none) -->
      <div id="auth-signup-extra" style="display:none;">
        <div class="form-row">
          <label class="form-label">국문 성명<span style="color:#D32F2F; margin-left:2px;">*</span></label>
          <input class="form-input" type="text" id="auth-full-name-ko" placeholder="홍길동" autocomplete="name" maxlength="50">
        </div>
        <div class="form-row">
          <label class="form-label">영문 성명<span style="color:#D32F2F; margin-left:2px;">*</span></label>
          <input class="form-input" type="text" id="auth-full-name-en" placeholder="Hong Gildong" autocomplete="off" maxlength="100">
        </div>
        <div class="form-row">
          <label class="form-label">연락처<span style="color:#D32F2F; margin-left:2px;">*</span></label>
          <input class="form-input" type="tel" id="auth-phone-number" placeholder="010-1234-5678" autocomplete="tel" maxlength="13">
        </div>
        <div class="form-row">
          <label class="form-label">소속 기업<span style="color:#D32F2F; margin-left:2px;">*</span></label>
          <input class="form-input" type="text" id="auth-company-name" placeholder="(주)해마 해운" autocomplete="organization" maxlength="100">
        </div>
        <div class="form-row">
          <label class="form-label">부서<span style="color:#D32F2F; margin-left:2px;">*</span></label>
          <input class="form-input" type="text" id="auth-department" placeholder="구매팀" autocomplete="off" maxlength="50">
        </div>
        <div class="form-row">
          <label class="form-label">직함<span style="color:#D32F2F; margin-left:2px;">*</span></label>
          <input class="form-input" type="text" id="auth-job-title" placeholder="과장" autocomplete="organization-title" maxlength="50">
        </div>
      </div>
      
      <div id="auth-error" class="auth-error"></div>

      <!-- ✅ 약관 동의 (회원가입 모드일 때만 보이도록 auth.js에서 제어 권장하지만 여기선 CSS로 제어) -->
      <div id="auth-terms-container" style="display:none; margin:16px 0; background:#FAFAFA; border:1px solid #EAEDF2; border-radius:12px; padding:16px;">
        <label style="display:flex; align-items:center; gap:8px; margin-bottom:12px; cursor:pointer;">
            <input type="checkbox" id="auth-agree-terms" style="width:18px;height:18px;cursor:pointer;">
            <span style="font-size:14px; color:#1A2B4A;">[필수] <a href="javascript:void(0)" onclick="document.getElementById('modal-terms').style.display='flex'" style="color:#0284C7;text-decoration:underline;">해마 마켓 알파 서비스 이용약관</a> 동의</span>
        </label>
        <label style="display:flex; align-items:center; gap:8px; margin-bottom:12px; cursor:pointer;">
            <input type="checkbox" id="auth-agree-privacy" style="width:18px;height:18px;cursor:pointer;">
            <span style="font-size:14px; color:#1A2B4A;">[필수] <a href="javascript:void(0)" onclick="document.getElementById('modal-privacy').style.display='flex'" style="color:#0284C7;text-decoration:underline;">개인정보처리방침</a> 동의</span>
        </label>
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="checkbox" id="auth-agree-marketing" style="width:18px;height:18px;cursor:pointer;">
            <span style="font-size:14px; color:#1A2B4A;">[선택] 마케팅 정보 수신 동의</span>
        </label>
      </div>
      
      <button class="submit-btn" id="btn-auth-submit" onclick="submitAuth()" style="margin-top:16px;">로그인</button>
      
      <div style="display:flex; align-items:center; gap:12px; margin:20px 0 4px;">
        <div style="flex:1; height:1px; background:#eaedf2;"></div>
        <span style="font-size:12px; color:#7A93B0; white-space:nowrap;">또는</span>
        <div style="flex:1; height:1px; background:#eaedf2;"></div>
      </div>
      
      <button disabled style="width:100%; padding:14px; background:#f4f4f4; color:#999; font-size:15px; font-weight:700; border:none; border-radius:12px; cursor:not-allowed; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:8px;">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5C4.86 1.5 1.5 4.17 1.5 7.47c0 2.1 1.38 3.96 3.48 5.04L4.14 15l3.27-2.16c.51.09 1.05.12 1.59.12 4.14 0 7.5-2.67 7.5-5.97S13.14 1.5 9 1.5z" fill="#999"/></svg>
        카카오로 시작하기 (현재 이메일 로그인만 활성화)
      </button>
    </div>
  </div>
</div>
</div>
 
<!-- 견적 장바구니 페이지 -->
<div class="page" id="page-cart">
<div class="wrap" style="background:#F0F9FF; height:100vh; display:flex; flex-direction:column;">
  <div class="sub-header" style="background:#fff;">
    <span class="back-btn" onclick="showPage('home')">‹</span>
    <span class="sub-title">견적 장바구니</span>
  </div>
  <div id="cart-content-area" style="flex:1; overflow-y:auto; padding:20px; padding-bottom:160px;">
    <!-- JS renderCartPage() will populate this -->
  </div>
  <div style="position:fixed; bottom:60px; left:0; width:100%; max-width:480px; background:#fff; padding:16px 20px; box-sizing:border-box; border-top:1px solid #eaedf2; box-shadow:0 -4px 12px rgba(0,0,0,0.05); z-index:100; margin-left:auto; margin-right:auto; right:0;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <span style="font-size:14px; color:#7A93B0; font-weight:600;">총 장바구니 품목</span>
      <span id="cart-total-count" style="font-size:18px; font-weight:800; color:#1A2B4A;">0개</span>
    </div>
    <button class="submit-btn" id="btn-request-quote" onclick="requestQuoteCheckout()" style="font-size:16px; font-weight:700;">견적 결제서 요청하기</button>
  </div>
</div>
</div>
 
<!-- Product Detail Modal (Bottom Sheet style) -->
<style>
@keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
<div id="product-modal" class="modal-overlay" style="display:none; align-items:center; justify-content:center; padding: 20px; box-sizing:border-box;">
  <div class="modal-box" style="width: 100%; max-width: 480px; background: #fff; border-radius: 20px; padding: 0; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; position: relative; animation: popIn 0.2s ease-out; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
    <div style="background: #fff; z-index: 10; border-bottom: 1px solid rgba(0,0,0,0.05); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
      <h3 class="modal-title" style="margin: 0; font-size: 16px;">매물 상세 정보</h3>
      <button class="modal-close" onclick="closeProductModal()" style="background: none; border: none; font-size: 20px; color: #7A93B0; cursor: pointer; line-height: 1;">✕</button>
    </div>
    <div id="product-modal-body" style="padding: 0; overflow-y: auto; flex: 1;">
      <!-- 렌더링 영역 -->
    </div>
  </div>
</div>
<!-- 하단 탭 바 -->
<nav class="bottom-tab-bar">
  <button class="tab-item active" onclick="triggerBottomNav('home')">
    <div class="tab-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></div>
    <div class="tab-label">홈</div>
  </button>
  
  <button class="tab-item" onclick="triggerBottomNav('community')">
    <div class="tab-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 14H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="tab-label">커뮤니티</div>
  </button>
  
  <button class="tab-item" onclick="loadChats()">
    <div class="tab-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></div>
    <div class="tab-label">채팅</div>
  </button>
  
  <button class="tab-item" onclick="if(!currentUser){alert('로그인이 필요한 기능입니다.');showPage('login');return;}triggerBottomNav('mypage')">
    <div class="tab-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="tab-label">마이페이지</div>
  </button>
</nav>
 
<!-- 우측 하단 플로팅 액션 버튼 (Top 이동 및 매물 등록) -->
<div class="fab-container">
  <button class="fab-btn fab-top" onclick="scrollToTop()" title="최상단으로 이동">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
  <button class="fab-btn fab-register" onclick="goToRegisterCreateMode()" title="매물 등록">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
  </button>
</div>
 
<!-- 평가 남기기 모달 -->
<div id="review-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:2000; align-items:center; justify-content:center;">
  <div class="modal-box" style="width:320px; background:#fff; border-radius:16px; padding:24px; text-align:center;">
    <h3 style="margin-top:0; color:#1A2B4A; font-size:18px;">거래 후기 남기기</h3>
    <p style="font-size:13px; color:#7A93B0; line-height:1.4;">상대방과의 거래는 어떠셨나요?<br>이후 사용자들에게 큰 도움이 됩니다!</p>
    <div style="display:flex; gap:12px; margin:24px 0;">
      <button onclick="submitReview(1)" style="flex:1; padding:16px 0; border:1px solid #1E8E3E; border-radius:12px; background:#E6F4EA; cursor:pointer;"><div style="font-size:24px;margin-bottom:8px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1E8E3E" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg></div><div style="font-size:12px;font-weight:700;color:#1E8E3E;">최고예요</div></button>
      <button onclick="submitReview(0)" style="flex:1; padding:16px 0; border:1px solid #eee; border-radius:12px; background:#f9f9f9; cursor:pointer;"><div style="font-size:24px;margin-bottom:8px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="15" x2="16" y2="15"></line><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg></div><div style="font-size:12px;font-weight:700;color:#555;">보통이에요</div></button>
      <button onclick="submitReview(-1)" style="flex:1; padding:16px 0; border:1px solid #eee; border-radius:12px; background:#f9f9f9; cursor:pointer;"><div style="font-size:24px;margin-bottom:8px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg></div><div style="font-size:12px;font-weight:700;color:#555;">별로예요</div></button>
    </div>
    <button onclick="document.getElementById('review-modal').style.display='none'" style="width:100%; padding:14px; background:#EAEDF2; color:#7A93B0; font-weight:700; border:none; border-radius:12px; cursor:pointer;">나중에 하기</button>
  </div>
</div>
 
<!-- 견적서 요청 모달 (주/부식 전용) -->
<div id="quote-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:2000; align-items:center; justify-content:center; padding:20px; box-sizing:border-box;">
  <div class="modal-box" style="width:100%; max-width:360px; background:#fff; border-radius:20px; padding:24px; text-align:center; animation: popIn 0.2s ease-out; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
    <div style="font-size:36px; margin-bottom:12px;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
    <h3 style="margin-top:0; color:#1A2B4A; font-size:20px; font-weight:800; margin-bottom:12px;">견적서 벤더 토스 시스템</h3>
    <p style="font-size:14px; color:#7A93B0; line-height:1.5; margin-bottom:24px;">
      선박에서 요청서를 수신했습니다.<br>
      해마 벤더 시스템에 등록된 <b>제휴 업체</b>로 즉시 토스하여 견적서를 수령 후,<br> 
      선박으로 다시 전송해 드립니다.
    </p>
    <div style="background:#F0F9FF; border-radius:12px; padding:16px; text-align:left; margin-bottom:24px;">
      <div style="font-size:12px; color:#0284C7; font-weight:700; margin-bottom:6px;">발주 절차 안내</div>
      <div style="font-size:13px; color:#1A2B4A; line-height:1.5;">
        1. 견적서 요청 접수<br>
        2. 최적의 제휴 벤더 매칭 및 견적서 수신<br>
        3. 선박 (본선) 컨펌 및 최종 발주 결정
      </div>
    </div>
    <div style="display:flex; gap:12px;">
      <button onclick="document.getElementById('quote-modal').style.display='none'" style="flex:1; padding:16px; background:#EAEDF2; color:#7A93B0; font-size:15px; font-weight:700; border:none; border-radius:12px; cursor:pointer;">취소</button>
      <button onclick="submitQuoteRequest()" style="flex:2; padding:16px; background:#0284C7; color:#fff; font-size:15px; font-weight:700; border:none; border-radius:12px; cursor:pointer;">견적 결제서 요청하기</button>
    </div>
  </div>
</div>
 
<!-- 커뮤니티 글쓰기 모달 -->
<div id="post-write-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:2000; align-items:flex-end; justify-content:center;">
  <div class="modal-box" style="width:100%; max-width:480px; height:85vh; background:#fff; border-radius:20px 20px 0 0; display:flex; flex-direction:column; animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
    <div style="padding:16px 20px; border-bottom:1px solid #eaedf2; display:flex; justify-content:space-between; align-items:center;">
      <button onclick="closePostWriteModal()" style="background:none; border:none; font-size:16px; color:#1A2B4A; cursor:pointer; padding:8px 0;">✕</button>
      <h3 style="margin:0; font-size:16px; font-weight:700;">글쓰기</h3>
      <button onclick="submitPost()" id="btn-submit-post" style="background:none; border:none; font-size:15px; color:#0284C7; font-weight:700; cursor:pointer; padding:8px 0;">등록</button>
    </div>
    <div style="flex:1; padding:20px; overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
      <div>
        <select id="post-write-tag" class="form-select" style="max-width:160px; font-weight:700;">
          <option value="🛠 수리지식">🛠 수리지식</option>
          <option value="자유게시판">자유게시판</option>
          <option value="👨‍🔧 구인구직">👨‍🔧 구인구직</option>
        </select>
      </div>
      <div>
        <input type="text" id="post-write-title" placeholder="제목을 입력하세요." style="width:100%; font-size:20px; padding:12px 0; border:none; border-bottom:1px solid #eaedf2; font-weight:700; outline:none; box-sizing:border-box;">
      </div>
      <div style="flex:1; display:flex; flex-direction:column;">
        <textarea id="post-write-content" placeholder="건전한 해마 커뮤니티를 위해 서로 배려하는 마음을 담아 글을 작성해 주세요." style="width:100%; flex:1; border:none; resize:none; font-size:15px; line-height:1.6; color:#1A2B4A; outline:none; padding-top:12px; box-sizing:border-box; font-family:inherit;"></textarea>
      </div>
    </div>
  </div>
</div>
 
<!-- 커뮤니티 상세 보기 모달 -->
<div id="post-detail-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:2000; align-items:flex-end; justify-content:center;">
  <div class="modal-box" style="width:100%; max-width:480px; height:90vh; background:#fff; border-radius:20px 20px 0 0; display:flex; flex-direction:column; animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
    <div style="padding:16px 20px; border-bottom:1px solid #eaedf2; display:flex; align-items:center;">
      <button onclick="closePostDetail()" style="background:none; border:none; font-size:24px; color:#1A2B4A; cursor:pointer; padding:0 16px 0 0;">‹</button>
      <h3 style="margin:0; font-size:16px; font-weight:700; flex:1; text-align:center; padding-right:24px;">게시글</h3>
    </div>
    
    <div id="post-detail-body" style="flex:1; overflow-y:auto; padding:20px;">
      <!-- JS injected details and comments -->
    </div>
    
    <div style="border-top:1px solid #eaedf2; padding:12px 20px; background:#fff; display:flex; align-items:center; gap:8px;">
      <input type="text" id="post-comment-input" placeholder="댓글을 입력해주세요..." style="flex:1; padding:12px 16px; border:1px solid #eaedf2; border-radius:24px; font-size:14px; background:#F0F9FF; outline:none;">
      <button onclick="submitComment()" style="width:40px; height:40px; border-radius:50%; background:var(--yellow-400); border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0;">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8l12-6-5 6 5 6-12-6z" fill="#7A5200"/></svg>
      </button>
    </div>
  </div>
</div>

<!-- ✅ 약관 모달 (이용약관) -->
<div id="modal-terms" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; align-items:flex-end; justify-content:center;">
    <div style="width:100%; max-width:480px; height:85vh; background:#fff; border-radius:20px 20px 0 0; display:flex; flex-direction:column; animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="padding:16px 20px; border-bottom:1px solid #eaedf2; display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0; font-size:16px; font-weight:700;">이용약관</h3>
            <button onclick="document.getElementById('modal-terms').style.display='none'" style="background:none; border:none; font-size:24px; color:#1A2B4A; cursor:pointer;">✕</button>
        </div>
        <div style="flex:1; overflow-y:auto; padding:20px; font-size:13px; color:#4A5568; line-height:1.6;">
            <p><strong>시행일자:</strong> 2026년 4월 21일 (알파 테스트 버전)</p>
            <p><strong>서비스 운영자:</strong> 해마 마켓 (이하 "회사")</p>
            <hr style="border:none; border-top:1px solid #eee; margin:16px 0;">
            <h4 style="color:#1A2B4A; font-size:15px;">제1조 (목적)</h4>
            <p>본 약관은 "해마 마켓"(이하 "서비스")이 제공하는 조선·해양 기자재 매칭 정보 서비스의 이용 조건과 절차, 회원과 회사 간 권리·의무·책임을 규정함을 목적으로 합니다.</p>
            <h4 style="color:#1A2B4A; font-size:15px; margin-top:20px;">제2조 (서비스의 성격 — 핵심 고지)</h4>
            <div style="background:#FEF2F2; color:#991B1B; padding:12px; border-radius:8px; margin-bottom:12px;">
                ⚠️ <strong>본 조항은 회원의 권리·의무에 중대한 영향을 미치므로 반드시 숙지하여야 합니다.</strong>
            </div>
            <p>1. <strong>회사는 「전자상거래법」상 통신판매중개자</strong>입니다. 회사는 회원 간의 거래에 어떠한 형태로도 개입하지 않으며, 거래 당사자가 아닙니다.</p>
            <p>2. 회사가 <strong>제공하지 않는 것</strong>: ❌ 결제 대금 보관·중개·에스크로 ❌ 배송 또는 배송 책임 ❌ 상품 품질 검수·보증 ❌ 세금계산서 발행 대행 ❌ 거래 분쟁 조정·중재</p>
            <p>3. 회원은 거래 전 <strong>상대방의 사업자등록번호, 통장 사본, 상품 실물</strong>을 직접 확인할 의무가 있습니다.</p>
            <h4 style="color:#1A2B4A; font-size:15px; margin-top:20px;">제3조 (알파 테스트 기간 한도 — 필독)</h4>
            <div style="background:#FEF2F2; color:#991B1B; padding:12px; border-radius:8px; margin-bottom:12px;">
                🚨 <strong>본 조항은 알파 테스트 기간에만 적용되는 특별 조항입니다.</strong>
            </div>
            <p>1. <strong>거래 한도:</strong> 본 알파 테스트 기간 중에는 <strong>건당 거래 금액이 100만 원(부가세 별도)을 초과하는 매물은 등록·거래할 수 없습니다.</strong></p>
            <p>2. <strong>우회 거래 시 책임:</strong> 회원이 본 한도를 우회하여 거래를 진행한 경우 일체의 책임은 <strong>전적으로 거래 당사자</strong>가 부담하며, 회사는 어떠한 책임도 지지 않습니다.</p>
            <h4 style="color:#1A2B4A; font-size:15px; margin-top:20px;">제4조 (회원의 책임 및 기타 조항)</h4>
            <p>회원 간 분쟁 발생 시 피해 회원의 정당한 요청이 있을 경우, 가해로 추정되는 회원의 신원정보를 제공할 수 있습니다.<br>그 외 거래 대금 환불, 사기 분쟁, 세금계산서의 책임 등은 전적으로 당사자 간 직접 해결을 원칙으로 합니다.</p>
        </div>
    </div>
</div>

<!-- ✅ 약관 모달 (개인정보처리방침) -->
<div id="modal-privacy" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; align-items:flex-end; justify-content:center;">
    <div style="width:100%; max-width:480px; height:85vh; background:#fff; border-radius:20px 20px 0 0; display:flex; flex-direction:column; animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="padding:16px 20px; border-bottom:1px solid #eaedf2; display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0; font-size:16px; font-weight:700;">개인정보처리방침</h3>
            <button onclick="document.getElementById('modal-privacy').style.display='none'" style="background:none; border:none; font-size:24px; color:#1A2B4A; cursor:pointer;">✕</button>
        </div>
        <div style="flex:1; overflow-y:auto; padding:20px; font-size:13px; color:#4A5568; line-height:1.6;">
            <p><strong>시행일자:</strong> 2026년 4월 21일 (알파 테스트 버전)</p>
            <h4 style="color:#1A2B4A; font-size:15px;">1. 수집하는 개인정보 항목</h4>
            <p>[필수] 이메일, 비밀번호(암호화 저장), 상호명, 사업자등록번호, 대표자명, 사업장 주소, 국문/영문 성명, 휴대폰 번호, 소속기업, 부서, 직함</p>
            <h4 style="color:#1A2B4A; font-size:15px; margin-top:20px;">2. 수집 및 이용 목적</h4>
            <p>회원 식별, 사업자 진위 검증, 회원 간 매칭 서비스 제공, 분쟁 대응 및 통계 분석</p>
            <h4 style="color:#1A2B4A; font-size:15px; margin-top:20px;">3. 보유 및 이용기간</h4>
            <p>회원 탈퇴 시까지 보유하며 탈퇴 시 지체 없이 파기합니다. (단, 전자상거래법 등 관계법령에 따른 보존 기한은 예외)</p>
            <h4 style="color:#1A2B4A; font-size:15px; margin-top:20px;">4. 알파 테스트 기간 특별 고지</h4>
            <div style="background:#FFF8E1; border-left:4px solid #F57C00; padding:12px; margin-bottom:12px;">
                ⚠️ 본 서비스는 알파 테스트 단계로 소수 사용자 대상 시범 운영 중이므로, 테스트 종료 시 일부 데이터가 초기화될 수 있습니다. 본인 데이터 즉시 삭제 요청은 고객센터를 이용해주시기 바랍니다.
            </div>
            <p>관리자 이메일: admin@haemamarket.com</p>
        </div>
    </div>
</div>

<!-- ✅ 전역 로딩 스피너 (showLoading / hideLoading으로 제어) -->
<div id="global-spinner" role="status" aria-live="polite" aria-hidden="true">
  <div class="spinner-circle"></div>
  <div class="spinner-msg">처리 중입니다...</div>
</div>

</body>
</html>
```
