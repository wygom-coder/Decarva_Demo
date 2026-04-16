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
      if(fabTop) fabTop.style.marginBottom = '0px';
      const fabCont = document.querySelector('.fab-container');
      if(fabCont) fabCont.style.bottom = '138px';
  } else {
      if(fabReg) fabReg.style.display = 'flex';
      if(fabTop) fabTop.style.marginBottom = '0px';
      const fabCont = document.querySelector('.fab-container');
      if(fabCont) fabCont.style.bottom = '';
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
                    <div style="color:#1A5FA0; font-size:12px; font-weight:700; margin-bottom:8px;">최고 입찰자만이 낙찰자가 됩니다!</div>
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
            <div id="modal-heart-btn" onclick="toggleLike('${p.id}')" style="position:absolute; bottom:12px; right:12px; width:40px; height:40px; background:rgba(255,255,255,0.9); border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; box-shadow:0 2px 8px rgba(0,0,0,0.1); transition:transform 0.1s;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div>
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
