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
            alert(`축하합니다! [${p.title}] 경매에 최종 낙찰되셨습니다!\\n(낙찰가: ₩ ${p.current_bid ? p.current_bid.toLocaleString() : '확인 불가'})`);
        }
        else if (currentUser && currentUser.id === p.seller_id) {
            alert(`등록하신 [${p.title}] 경매가 마감되었습니다.\\n(최종 입찰자: ${p.highest_bidder_name})`);
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
  
  alert('매물이 성공적으로 등록되었습니다!\n(하단 경매 탭에서도 바로 확인하실 수 있습니다.)');
  
  filterState.category = '전체';
  renderSubCategories(filterState.topCategory);
  resetFilters();
  showPage('home');
  window.scrollTo(0, 0);

  // 등록 직후 최신 데이터베이스 리스트 가져오기
  await fetchProducts();
}
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
