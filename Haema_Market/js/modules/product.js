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
function renderProductsHeader() {
  const catArea = document.getElementById('home-category-area');
  const recArea = document.getElementById('home-recommendation-area');
  const listTitle = document.getElementById('main-product-title-header');
  const mainGrid = document.getElementById('main-product-grid');
  
  if (filterState.topCategory === '전체') {
      // 1. 전체(홈) 탭: 카테고리 숨김, 기획전은 검색어가 없을 때만 표시
      if(catArea) catArea.style.display = 'none';
      if(recArea) recArea.style.display = (filterState.keyword === '') ? 'block' : 'none';
      if(listTitle) listTitle.innerHTML = '<span class="section-title"><span style="color:#0284C7; margin-right:6px; font-size:16px;">▪</span>최신 전체 매물</span><span class="section-more">더보기 →</span>';
      if(mainGrid) {
          mainGrid.classList.remove('product-grid');
          mainGrid.classList.add('horizontal-scroll-list');
      }
  } else {
      // 2. 상세 카테고리 탭(기부속, 선용품 등): 카테고리 표시, 기획전 숨김
      if(catArea) catArea.style.display = 'block';
      if(recArea) recArea.style.display = 'none';
      
      if (filterState.category === '전체') {
          if(listTitle) listTitle.innerHTML = `<span class="section-title"><span style="color:#1A5FA0; margin-right:6px; font-size:16px;">▪</span>새로 올라온 매물</span><span class="section-more">더보기 →</span>`;
      } else {
          if(listTitle) listTitle.innerHTML = `<span class="section-title"><span style="color:#1A5FA0; margin-right:6px; font-size:16px;">▪</span>${escapeHtml(filterState.category)} 매물</span><span class="section-more">더보기 →</span>`;
      }
      
      if(mainGrid) {
          mainGrid.classList.remove('horizontal-scroll-list');
          mainGrid.classList.add('product-grid');
      }
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
        
        let recFrag = document.createDocumentFragment();
        if(recItems.length > 0) {
            recItems.forEach(p => { const div = document.createElement('div'); div.innerHTML = createProductCardHTML(p); recFrag.appendChild(div.firstElementChild); });
            recList.appendChild(recFrag);
        } else recList.innerHTML = '<div style="padding: 60px 20px; font-size:13px; color:#999; text-align:center; width:100%;">매물이 없습니다.</div>';
        
        let curFrag = document.createDocumentFragment();
        if(curItems.length > 0) {
            curItems.forEach(p => { const div = document.createElement('div'); div.innerHTML = createProductCardHTML(p); curFrag.appendChild(div.firstElementChild); });
            curList.appendChild(curFrag);
        } else curList.innerHTML = '<div style="padding: 60px 20px; font-size:13px; color:#999; text-align:center; width:100%;">매물이 없습니다.</div>';
    }
    
    const frag = document.createDocumentFragment();
    const isCompact = filterState.category !== '전체' && filterState.category !== '';
    
    newItems.forEach(p => {
        let card;
        if (isCompact) {
            card = buildCompactCard(p);
        } else {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = createProductCardHTML(p);
            card = wrapper.firstElementChild;
        }
        frag.appendChild(card);
    });
    grid.appendChild(frag);
    
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
    if (!Number.isInteger(newBid) || newBid <= 0 || !/^\d+$/.test(newBidStr.trim())) {
        alert('숫자만 입력해주세요 (예: 500000).');
        return;
    }
    const curr = p.current_bid || parseInt((p.price || '').replace(/[^0-9]/g, '')) || 0;
    
    if(newBid <= curr) {
        alert(`현재 최고가(₩${curr.toLocaleString()})보다 높은 금액을 입력하셔야 합니다.`);
        return;
    }

    const count = p.bid_count || 0;
    
    const bidderName = currentUser.user_metadata?.biz_name || currentUser.user_metadata?.display_name || (currentUser.email ? currentUser.email.split('@')[0] : '익명');
    
    const btn = document.querySelector('.auction-bid-btn');
    if(btn) btn.textContent = '입찰 처리중...';
    
    // [RPC] 원자적 입찰 로직 연동 (RLS 차단 방지)
    const { data: result, error } = await supabaseClient.rpc('place_bid', {
        p_product_id: id,
        p_amount: newBid
    });

    if (error) {
        alert('입찰 중 오류가 발생했습니다: ' + error.message);
        if(btn) btn.textContent = '입찰';
        return;
    }

    if (result && !result.ok) {
        alert('입찰 실패: ' + result.error);
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
        const keyword = sanitizeSearchKeyword(filterState.keyword);
        if (keyword) {
            query = query.ilike('title', `%${keyword}%`);
        }
    }
    if (filterState.supplier !== '전체') {
        const supplier = sanitizeSearchKeyword(filterState.supplier);
        if (supplier) {
            query = query.ilike('title', `%${supplier}%`);
        }
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
// 경매 마감(is_closed 처리) 타이머는 클라이언트에서 제거되었습니다.
// pg_cron을 통해 서버에서 매 1분마다 주기적으로 마감 기한이 지난 경매를 자동으로 닫습니다.


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

    const majorSelect = document.getElementById('cat-major-select');
    if (majorSelect) majorSelect.value = '';

    const minorSelect = document.getElementById('cat-minor-select');
    if (minorSelect) {
        minorSelect.innerHTML = '<option value="">대분류를 먼저 선택해주세요</option>';
        minorSelect.value = '';
    }

    const manufacturerInput = document.getElementById('manufacturer-input');
    if (manufacturerInput) manufacturerInput.value = '';

    const yearInput = document.getElementById('year-input');
    if (yearInput) yearInput.value = '';

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

    // ✅ 카테고리 로직 변경으로 인한 구 카테고리 초기화 코드 제거

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
        showToast('회원가입 및 로그인이 필요한 기능입니다.');
        showPage('login');
        return;
    }
    resetRegisterFormToCreateMode();
    showPage('register');
};

// ============================================================================
// 대분류/소분류 카테고리 연동
// ============================================================================
window.onChangeMajorCategory = function() {
    const majorSelect = document.getElementById('cat-major-select');
    const minorSelect = document.getElementById('cat-minor-select');
    if (!majorSelect || !minorSelect) return;

    const majorVal = majorSelect.value;
    minorSelect.innerHTML = '<option value="">소분류 선택</option>';

    if (majorVal && KATEGORY_MAP[majorVal]) {
        KATEGORY_MAP[majorVal].forEach(ci => {
            const opt = document.createElement('option');
            opt.value = ci.name;
            opt.textContent = ci.name;
            minorSelect.appendChild(opt);
        });
    } else {
        minorSelect.innerHTML = '<option value="">대분류를 먼저 선택해주세요</option>';
    }
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

    // 대분류/소분류 select 초기화
    const majorSelect = document.getElementById('cat-major-select');
    const minorSelect = document.getElementById('cat-minor-select');
    if (majorSelect && minorSelect) {
        if (p.category) {
            const topCat = CAT_TO_TOP_MAP[p.category];
            if (topCat) {
                majorSelect.value = topCat;
                window.onChangeMajorCategory(); // 소분류 목록 렌더링
                minorSelect.value = p.category;
            } else {
                majorSelect.value = '';
                window.onChangeMajorCategory();
            }
        } else {
            majorSelect.value = '';
            window.onChangeMajorCategory();
        }
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

  // 대분류/소분류 값 추출
  const minorSelect = document.getElementById('cat-minor-select');
  const cat = minorSelect ? minorSelect.value : '';

  // 제목 및 기타 텍스트
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

  if (!title || !cat) { alert('상품명과 소분류 카테고리는 필수입니다.'); return; }

  // ✅ 추가 입력 검증
  if (title.length > 200) { alert('상품명은 200자 이하로 입력해주세요.'); return; }
  if (priceParsed < 0 || priceParsed > 1000000000) { alert('가격을 올바르게 입력해주세요. (최대 10억)'); return; }

  // 🚨 [Phase 7 완화] 100만원 한도 시뮬레이션 경고 (작업 계속됨)
  if (priceParsed > 1_000_000 && !isEditingOldPrice) {
      alert('⚠️ 에스크로 결제 전용 시스템이 오픈되기 전까지, 고액 결제(100만 원 초과) 거래는 해마 운영팀이 직접 안전 결제를 보조해 드립니다.');
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
      const fileName = `public/product_${Date.now()}_${crypto.randomUUID()}.webp`;

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('market_images')
          .upload(fileName, uploadedBlob, {
              contentType: uploadedBlob.type || 'image/webp'
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
        price: '₩ ' + priceParsed.toLocaleString(),
        price_krw: priceParsed || null,
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
  
  // ✅ 필터 초기화: 방금 수정한 매물이 홈 필터에 걸려 전역 products 배열에서 누락되는 현상 방지
  if (typeof filterState !== 'undefined') {
      filterState.category = '전체';
      filterState.topCategory = '전체';
      filterState.keyword = '';
  }
  if (typeof resetFilters === 'function') {
      resetFilters();
  }

  await fetchProducts(true);
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

// 타이머 최적화 로직 추가: 다른 탭으로 이동 시 불필요한 배터리 소모 무한루프 방지
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (window.auctionInterval) {
            clearInterval(window.auctionInterval);
            window.auctionInterval = null;
        }
    } else {
        const homePage = document.getElementById('page-home');
        if (homePage && homePage.style.display !== 'none' && typeof setupAuctionTimers === 'function') {
            setupAuctionTimers();
        }
    }
});

// ============================================================================
// 컴팩트 매물 카드 뷰 (트랙 1-2)
// ============================================================================
function buildCompactCard(p) {
    const div = document.createElement('div');
    div.className = 'product-compact-card';
    div.onclick = () => openProductModal(p.id);
    
    const safeTitle = escapeHtml(p.title || '');
    const safePrice = escapeHtml(p.price || '');
    const safeCondition = escapeHtml(p.condition || '');
    const safeTradeType = escapeHtml(p.tradeType || '');
    const safeVendor = escapeHtml(p.vendor_name || p.seller_company || '판매자');
    const safeRegion = escapeHtml(p.region || '');
    const likeCount = parseInt(p.like_count) || 0;
    
    // 경매 마감 임박 배지
    let auctionBadge = '';
    if (p.auction && p.auction_end && !p.is_closed) {
        const msLeft = new Date(p.auction_end) - Date.now();
        const hoursLeft = msLeft / (1000 * 60 * 60);
        if (hoursLeft > 0 && hoursLeft < 2) {
            auctionBadge = `<span class="compact-badge-urgent">🔴 마감 ${Math.floor(hoursLeft * 60)}분</span>`;
        } else if (hoursLeft > 0 && hoursLeft < 24) {
            auctionBadge = `<span class="compact-badge-urgent-soft">마감 ${Math.floor(hoursLeft)}시간</span>`;
        }
    }
    
    const imgHtml = (typeof getProductImageHtml === 'function') 
        ? getProductImageHtml(p) 
        : (p.svg || '');
    
    div.innerHTML = `
        <div class="compact-thumb">${imgHtml}</div>
        <div class="compact-body">
            <div class="compact-badges">
                <span class="compact-badge-condition">${safeCondition}</span>
                <span class="compact-badge-trade">${safeTradeType}</span>
                ${auctionBadge}
            </div>
            <div class="compact-title">${safeTitle}</div>
            <div class="compact-price">${safePrice}</div>
            <div class="compact-meta">
                <span class="compact-vendor">🏢 ${safeVendor}</span>
                ${safeRegion ? `<span class="compact-region">· ${safeRegion}</span>` : ''}
                ${likeCount > 0 ? `<span class="compact-like">· ♥ ${likeCount}</span>` : ''}
            </div>
        </div>
    `;
    return div;
}

// ============================================================================
// 매물 공유 및 라우팅 도구 (트랙 2)
// ============================================================================
window.shareProduct = async function(productId) {
    const p = products.find(x => String(x.id) === String(productId));
    const title = p?.title || '해마 마켓 매물';
    const priceText = p?.price || '';
    const url = `${window.location.origin}/#product/${productId}`;
    
    const shareText = priceText 
        ? `${title}\n${priceText}\n해마 마켓에서 확인하세요`
        : `${title} - 해마 마켓에서 확인하세요`;
    
    const shareData = {
        title: '해마 마켓',
        text: shareText,
        url: url
    };
    
    // 1순위: 모바일 네이티브 공유
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
            await navigator.share(shareData);
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }
    
    // 2순위: 클립보드 복사
    try {
        await navigator.clipboard.writeText(url);
        if (typeof showToast === 'function') {
            showToast('링크가 복사되었습니다');
        } else {
            alert('링크가 복사되었습니다:\n' + url);
        }
        return;
    } catch (err) {
        // 3순위: prompt로 수동 복사 (구형 브라우저)
        prompt('이 링크를 복사하세요:', url);
    }
};
