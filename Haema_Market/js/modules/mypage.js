// ⚠️ escapeHtml은 utils.js에서 정의 (중복 정의 금지)

window.showMyQuotes = async function() {
    if(!currentUser) { showPage('login'); return; }
    showPage('myquotes');
    const area = document.getElementById('myquotes-content-area');
    area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">목록을 불러오는 중입니다...</div>';
    try {
        const { data, error } = await supabaseClient
            .from('haema_quotes').select('*')
            .eq('buyer_id', currentUser.id)
            .order('created_at', { ascending: false });
        if(error) throw error;
        if(!data || data.length === 0) {
            area.innerHTML = `
            <div style="padding: 100px 20px; display:flex; flex-direction:column; align-items:center; text-align:center;">
                <div style="font-size:48px; margin-bottom:16px; color:#CBD5E1;"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
                <div style="font-size:18px; font-weight:800; color:#1A2B4A; margin-bottom:8px;">요청한 견적 내역이 없습니다</div>
                <div style="font-size:14px; color:#7A93B0; line-height:1.5; margin-bottom:24px;">장바구니를 통해 여러 업체를 묶어서<br>편리하게 일괄 견적을 요청해 보세요.</div>
                <button onclick="triggerBottomNav('home')" style="background:#1A5FA0; color:#fff; font-size:15px; font-weight:700; border:none; border-radius:12px; padding:16px 32px; cursor:pointer; width:100%; max-width:240px; margin-bottom:12px;">매물 둘러보기</button>
            </div>`;
            return;
        }
        let html = '';
        data.forEach(q => {
            const dateObj = new Date(q.created_at);
            const dateStr = dateObj.toLocaleDateString('ko-KR') + ' ' + dateObj.toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'});
            let statusText = '결제/견적 대기중', statusColor = '#F57C00', statusBg = '#FFF3E0';
            if(q.status === 'replied')  { statusText = '답변 완료 (승인)'; statusColor = '#1E8E3E'; statusBg = '#E8F5E9'; }
            if(q.status === 'completed'){ statusText = '계약/결제 완료';  statusColor = '#1A5FA0'; statusBg = '#F4F9FF'; }

            let itemSummary = '상품 내용 없음';
            if(q.items && q.items.length > 0) {
                const firstTitle = q.items[0].title;
                const totalQty = q.items.reduce((acc, curr) => acc + (curr.qty || 1), 0);
                itemSummary = q.items.length === 1 ? `${firstTitle} (${totalQty}개)` : `${firstTitle} 외 ${q.items.length - 1}건 (총 ${totalQty}개)`;
            }

            // ✅ 모든 동적 값 escape
            const safeDateStr = escapeHtml(dateStr);
            const safeVendorName = escapeHtml(q.vendor_name);
            const safeStatusText = escapeHtml(statusText);
            const safeItemSummary = escapeHtml(itemSummary);

            html += `<div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid #eaedf2; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                    <div>
                        <div style="font-size:12px; color:#7A93B0; margin-bottom:4px;">${safeDateStr} 발주</div>
                        <div style="font-size:15px; font-weight:800; color:#1A2B4A;">[${safeVendorName}]</div>
                    </div>
                    <div style="font-size:11px; font-weight:800; background:${statusBg}; color:${statusColor}; padding:4px 8px; border-radius:6px;">${safeStatusText}</div>
                </div>
                <div style="background:#f8f9fc; border-radius:8px; padding:12px; display:flex; align-items:center; justify-content:space-between;">
                    <div style="font-size:13px; font-weight:600; color:#4A5568;">${safeItemSummary}</div>
                    <button style="background:#fff; border:1px solid #eaedf2; border-radius:6px; padding:6px 10px; font-size:12px; font-weight:700; color:#1A5FA0; cursor:pointer;" onclick="alert('품목 상세 내역 확인 기능은 추후 연동됩니다.')">상세보기</button>
                </div>
            </div>`;
        });
        area.innerHTML = html;
    } catch(err) {
        // ✅ err.message escape (서버 에러에 사용자 입력 echo될 가능성)
        const safeErr = escapeHtml(err.message || '알 수 없는 오류');
        area.innerHTML = `<div style="padding: 60px 20px; font-size:14px; color:#D32F2F; text-align:center;">오류가 발생했습니다:<br>${safeErr}</div>`;
    }
};

async function showMyList() {
    if(!currentUser) { showPage('login'); return; }
    showPage('mylist');
    const container = document.getElementById('mylist-grid');
    if(!container) return;
    
    container.innerHTML = '<div style="grid-column: span auto; padding: 40px; text-align:center; color:#7A93B0;">불러오는 중...</div>';

    const { data, error } = await supabaseClient
        .from('haema_products')
        .select('*')
        .eq('seller_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('showMyList fetch error:', error);
        container.innerHTML = '<div style="width:100%; flex-shrink:0; grid-column: 1 / -1; padding: 40px; text-align:center; color:#C62828;">매물을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>';
        return;
    }

    const myProducts = data || [];
    container.innerHTML = '';
    if(myProducts.length === 0) {
        // ✅ P0-A 안전망: onclick을 goToRegisterCreateMode로 (혹시 이전 변경이 캐시였을 경우 재적용)
        container.innerHTML = `
        <div style="width:100%; flex-shrink:0; grid-column: 1 / -1; padding: 100px 20px; display:flex; flex-direction:column; align-items:center; text-align:center;">
            <div style="font-size:48px; margin-bottom:16px; color:#CBD5E1;"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
            <div style="font-size:18px; font-weight:800; color:#1A2B4A; margin-bottom:8px;">등록하신 판매 매물이 없습니다</div>
            <div style="font-size:14px; color:#7A93B0; line-height:1.5; margin-bottom:24px;">보유하신 잉여 자재나 중고 부품을 올려<br>전국의 수많은 바이어와 바로 거래하세요.</div>
            <button onclick="goToRegisterCreateMode()" style="background:var(--blue-50); color:var(--blue-800); border:1px solid var(--blue-200); font-size:15px; font-weight:700; border-radius:12px; padding:16px 32px; cursor:pointer; width:100%; max-width:240px; margin-bottom:12px;">첫 판매글 작성하기</button>
        </div>`;
        return;
    }
    let frag = document.createDocumentFragment();
    myProducts.forEach((p, idx) => {
        let tagsHtml = '';
        const bidCount = parseInt(p.bid_count) || 0;
        if(p.auction) tagsHtml += `<span class="ptag ptag-y" style="background:#1A2B4A; color:#fff;">경매 ${bidCount}회</span> `;
        if(p.offer)   tagsHtml += `<span class="ptag ptag-b">가격제안</span> `;
        if(!p.auction && !p.offer) tagsHtml += `<span class="ptag" style="background:#EAEDF2; color:#7A93B0;">직거래</span> `;

        // ✅ 모든 사용자 입력 필드 escape
        const safeRegion = escapeHtml(p.region);
        const safeCondition = escapeHtml(p.condition);
        const safeTitle = escapeHtml(p.title);
        let _rawP = p.price || '';
        let _numP = parseInt(String(_rawP).replace(/[^0-9]/g, ''));
        const safePrice = escapeHtml(isNaN(_numP) ? _rawP : '₩ ' + _numP.toLocaleString());

        // ✅ p.svg → getProductImageHtml(p)
        const productImageHtml = (typeof getProductImageHtml === 'function')
            ? getProductImageHtml(p)
            : (p.svg || '');

        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.cursor = 'pointer';
        card.style.position = 'relative';  // ✕ 버튼 절대위치용
        // ✅ 마이페이지 판매목록의 카드 클릭 = 편집 진입 (상세 모달 X)
        card.onclick = () => {
            if (typeof editMyProduct === 'function') {
                editMyProduct(p.id);
            } else {
                console.warn('editMyProduct 함수 미정의 - product.js 업데이트 필요');
                openProductModal(p.id);
            }
        };

        // ✅ 본인 매물 삭제 버튼 (우상단 ✕)
        const safePid = escapeHtml(p.id);
        const deleteBtnHtml = `<button type="button" class="my-product-delete-btn" data-pid="${safePid}" title="이 매물 삭제" style="position:absolute; top:8px; right:8px; width:26px; height:26px; border-radius:50%; background:rgba(0,0,0,0.65); color:#fff; border:none; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; padding:0; box-shadow:0 2px 4px rgba(0,0,0,0.25); z-index:10;">✕</button>`;

        card.innerHTML = `<div class="product-img" style="position:relative;">${productImageHtml}${deleteBtnHtml}</div><div class="product-body"><div class="product-sub">${safeRegion} · ${safeCondition}</div><div class="product-title">${safeTitle}</div><div class="product-price">${safePrice}</div><div class="product-tags">${tagsHtml}</div></div>`;

        // 삭제 버튼 클릭 핸들러 — 카드 클릭 이벤트와 분리
        const delBtn = card.querySelector('.my-product-delete-btn');
        if (delBtn) {
            delBtn.addEventListener('click', function(ev) {
                ev.stopPropagation();
                ev.preventDefault();
                deleteMyProduct(p.id);
            });
        }
        
        frag.appendChild(card);
    });
    container.appendChild(frag);
}

// ============================================================================
// ✅ 매물 삭제 함수 (본인 매물만)
// ============================================================================
window.deleteMyProduct = async function(productId) {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }

    const p = products.find(x => String(x.id) === String(productId));
    if (!p) {
        alert('매물을 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.');
        return;
    }

    const isOwner = (p.seller_id && p.seller_id === currentUser.id)
                 || (p.user_id && p.user_id === currentUser.id);
    if (!isOwner) {
        alert('본인이 등록한 매물만 삭제할 수 있습니다.');
        return;
    }

    if (p.is_closed) {
        alert('이미 거래가 완료된 매물은 삭제할 수 없습니다.\n(거래 기록 보존을 위해)');
        return;
    }
    const bidCount = parseInt(p.bid_count) || 0;
    if (p.auction && bidCount > 0) {
        alert(`입찰자가 있는 경매(${bidCount}회 입찰)는 삭제할 수 없습니다.\n경매 마감 후 처리해주세요.`);
        return;
    }

    const titleForConfirm = (p.title || '').substring(0, 30);
    const confirmed = confirm(
        `정말 [${titleForConfirm}] 매물을 삭제하시겠습니까?\n\n` +
        '⚠️ 이 작업은 되돌릴 수 없습니다.\n' +
        '매물 정보와 첨부된 사진이 영구 삭제됩니다.'
    );
    if (!confirmed) return;

    if (p.image_url && typeof p.image_url === 'string') {
        try {
            const marker = '/market_images/';
            const idx = p.image_url.indexOf(marker);
            if (idx >= 0) {
                const filePath = p.image_url.substring(idx + marker.length);
                const { error: storageErr } = await supabaseClient.storage
                    .from('market_images').remove([filePath]);
                if (storageErr) {
                    console.warn('사진 파일 삭제 실패(무시하고 진행):', storageErr);
                }
            }
        } catch (e) {
            console.warn('사진 경로 파싱 실패(무시):', e);
        }
    }

    const { error: deleteErr } = await supabaseClient
        .from('haema_products')
        .delete()
        .eq('id', productId)
        .eq('seller_id', currentUser.id);

    if (deleteErr) {
        console.error('매물 삭제 실패:', deleteErr);
        alert('매물 삭제 중 오류가 발생했습니다.\n오류: ' + (deleteErr.message || '알 수 없음'));
        return;
    }

    alert('매물이 삭제되었습니다.');

    if (typeof fetchProducts === 'function') {
        await fetchProducts();
    }
    showMyList();
};

// ==== 프로필 UI 자동 렌더링 ====
function updateProfileUI() {
    if(!currentUser) {
        const pName = document.getElementById('profile-name');
        if(pName) pName.textContent = "로그인 해주세요";
        const pEmail = document.getElementById('profile-email');
        if(pEmail) pEmail.textContent = "";
        const rBadge = document.getElementById('profile-region-badge');
        if(rBadge) rBadge.style.display = 'none';
        return;
    }
    const email = currentUser.email || '';
    const metaName = currentUser.user_metadata?.display_name;
    const metaBio  = currentUser.user_metadata?.bio;
    const metaRegion = currentUser.user_metadata?.region;
    const isVerified = currentUser.user_metadata?.is_region_verified;
    // ✅ 이메일 앞부분 노출 방지 (full_name도 display_name도 없을 때만 익명 ID 폴백)
    const nameStr = metaName ? metaName : (
        currentUser.user_metadata?.full_name 
            ? currentUser.user_metadata.full_name 
            : `해마유저_${currentUser.id ? currentUser.id.substring(0, 6) : '익명'}`
    );
    const firstChar = nameStr.charAt(0).toUpperCase();
    // ✅ textContent 사용 → 자동 escape
    const pName = document.getElementById('profile-name');   if(pName)  pName.textContent  = nameStr;
    const pEmail = document.getElementById('profile-email'); if(pEmail) pEmail.textContent = metaBio ? metaBio : email;
    const sEmail = document.getElementById('settings-email');if(sEmail) sEmail.textContent = email;
    const pAv = document.getElementById('profile-avatar');   if(pAv)    pAv.textContent    = firstChar;
    const rBadge = document.getElementById('profile-region-badge');
    if(rBadge) {
        rBadge.style.display = 'inline-flex';
        if(metaRegion && isVerified)  { rBadge.textContent = metaRegion + " (인증됨)"; rBadge.style.background = "#E6F4EA"; rBadge.style.color = "#1E8E3E"; }
        else if(metaRegion)           { rBadge.textContent = metaRegion + " (미인증)"; rBadge.style.background = "#FFFBEA"; rBadge.style.color = "#D4960A"; }
        else                          { rBadge.textContent = "지역 미설정";             rBadge.style.background = "#EAEDF2"; rBadge.style.color = "#7A93B0"; }
    }

    // ✅ P0-#4 수정: 신뢰 가능한 app_metadata에서만 읽음 (user_metadata는 위조 가능)
    const isBiz = !!currentUser.app_metadata?.is_business;
    const bBadge = document.getElementById('profile-biz-badge');
    const bStatus = document.getElementById('biz-auth-status');
    if(bBadge) {
        if(isBiz) {
            bBadge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="display:inline-block; margin-right:2px; vertical-align:-1px;"><path d="M20 6L9 17l-5-5"></path></svg>인증 기업`;
            bBadge.style.background = "var(--blue-50)"; bBadge.style.color = "var(--blue-800)"; bBadge.style.border = "1px solid var(--blue-200)";
            if(bStatus) bStatus.style.display = "inline-block";
        } else {
            bBadge.textContent = "일반 회원";
            bBadge.style.background = "#EAEDF2"; bBadge.style.color = "#7A93B0";
            if(bStatus) bStatus.style.display = "none";
        }
    }
    fetchAndRenderMannerTemp();
}

let _mannerTempLoaded = false;
async function fetchAndRenderMannerTemp() {
    if(!currentUser || _mannerTempLoaded) return;
    _mannerTempLoaded = true;
    const { data, error } = await supabaseClient.from('haema_reviews').select('score').eq('reviewee_id', currentUser.id);
    let baseScore = 5.0;
    if(data && !error) { let sum = 0; data.forEach(r => sum += (r.score * 0.5)); baseScore += sum; }
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
            starsHtml += `<svg width="20" height="20" viewBox="0 0 24 24" fill="${i <= starCount ? '#F5C518' : '#EAEDF2'}"><path d="${svgPath}"/></svg>`;
        }
        starsContainer.innerHTML = starsHtml;
    }
}

// ==== 프로필 편집 ====
function openProfileEdit() {
    if(!currentUser) { showPage('login'); return; }
    showPage('profile-edit');
    tempVerifiedRegion = null;
    const btn = document.getElementById('btn-gps-verify');
    btn.textContent = "내 위치 검증"; btn.style.background = "#F4F9FF"; btn.style.color = "#1A5FA0"; btn.style.borderColor = "#1A5FA0"; btn.disabled = false;
    const metaName = currentUser.user_metadata?.display_name;
    const metaBio  = currentUser.user_metadata?.bio || '';
    const metaRegion = currentUser.user_metadata?.region || '';
    const isVerified = currentUser.user_metadata?.is_region_verified || false;
    const nameStr = metaName ? metaName : (
        currentUser.user_metadata?.full_name 
            ? currentUser.user_metadata.full_name 
            : `해마유저_${currentUser.id ? currentUser.id.substring(0, 6) : '익명'}`
    );
    const nameInput = document.getElementById('edit-nickname-input');
    const bioInput  = document.getElementById('edit-bio-input');
    const regionSelector = document.getElementById('edit-region-select');
    nameInput.value = nameStr;
    if(bioInput) bioInput.value = metaBio;
    if(regionSelector) {
        regionSelector.value = metaRegion; regionSelector.disabled = false;
        if(metaRegion && isVerified) {
            tempVerifiedRegion = metaRegion; regionSelector.disabled = true;
            btn.textContent = "✓ 기인증 지역"; btn.style.background = "#E6F4EA"; btn.style.color = "#1E8E3E"; btn.style.borderColor = "#1E8E3E";
        }
    }
    if(metaName) { nameInput.disabled = true; nameInput.style.backgroundColor = '#EAEDF2'; nameInput.style.color = '#7A93B0'; }
    else         { nameInput.disabled = false; nameInput.style.backgroundColor = '#fff';    nameInput.style.color = '#1A2B4A'; }
    document.getElementById('edit-avatar-preview').textContent = nameStr.charAt(0).toUpperCase();
}

async function saveProfile() {
    const btn = document.querySelector('#page-profile-edit .submit-btn');
    const nameInput = document.getElementById('edit-nickname-input');
    const bioInput  = document.getElementById('edit-bio-input');
    const regionSelector = document.getElementById('edit-region-select');
    const inputName = nameInput.value.trim();
    const inputBio  = bioInput ? bioInput.value.trim() : '';
    const selectedRegion = regionSelector ? regionSelector.value : '';
    if(!nameInput.disabled && !inputName) { alert('닉네임을 먼저 입력해주세요.'); return; }

    if (inputName.length > 30) { alert('닉네임은 30자 이하로 입력해주세요.'); return; }
    if (inputBio.length > 500) { alert('소개는 500자 이하로 입력해주세요.'); return; }

    btn.textContent = '메타데이터 저장 중...'; btn.disabled = true;
    let isVeri = (tempVerifiedRegion !== null && tempVerifiedRegion === selectedRegion);
    if(selectedRegion && !isVeri) isVeri = false;
    let updatePayload = { bio: inputBio, region: selectedRegion, is_region_verified: isVeri };
    if(!nameInput.disabled) updatePayload.display_name = inputName;
    const { data, error } = await supabaseClient.auth.updateUser({ data: updatePayload });
    btn.disabled = false; btn.textContent = '저장하고 돌아가기';
    if(error) { console.error("Profile save error:", error); alert('프로필 변경 중 오류가 발생했습니다.'); }
    else { currentUser = data.user; updateProfileUI(); showPage('mypage'); }
}

// ==== 위치 인증 ====
let tempVerifiedRegion = null;
window.verifyGPSLocation = async function() {
    const selector = document.getElementById('edit-region-select');
    const selectedRegion = selector.value;
    const btn = document.getElementById('btn-gps-verify');
    if(!selectedRegion) { showToast("활동 지역(시/도)을 우선 선택해주세요."); return; }
    
    btn.textContent = "GPS 위치 확인 중...";
    btn.disabled = true;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // 실제 서비스에서는 position.coords.latitude, longitude를 카카오지도 API 등으로 역지오코딩하여 비교합니다.
                // 알파 버전에서는 권한 허용 시 정상 통과로 시뮬레이션합니다.
                setTimeout(() => {
                    showToast(`현재 위치와 [${selectedRegion}] 선택지가 일치합니다.`);
                    tempVerifiedRegion = selectedRegion;
                    btn.textContent = "소재지 일치 (GPS 인증됨)"; 
                    btn.style.background = "#E6F4EA"; 
                    btn.style.color = "#1E8E3E"; 
                    btn.style.borderColor = "#1E8E3E";
                    selector.disabled = true;
                }, 600);
            },
            (error) => {
                btn.textContent = "사업자 소재지 검증";
                btn.disabled = false;
                if (error.code === error.PERMISSION_DENIED) {
                    showToast("위치 정보 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.");
                } else {
                    showToast("GPS 위치를 가져올 수 없습니다. 다시 시도해주세요.");
                }
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
        );
    } else {
        showToast("이 브라우저에서는 위치 기반 인증을 지원하지 않습니다.");
        btn.textContent = "사업자 소재지 검증";
        btn.disabled = false;
    }
}

// ==== 사업자 인증 ====
function openBusinessAuth() {
    if(!currentUser) { showPage('login'); return; }
    showPage('business-auth');
    // ✅ P0-#4 수정: app_metadata 사용 (서버에서만 쓸 수 있는 신뢰 영역)
    const isBiz = !!currentUser.app_metadata?.is_business;
    const bizNum = currentUser.app_metadata?.biz_number;
    const bizName = currentUser.app_metadata?.biz_name;
    const formBox = document.getElementById('biz-auth-form');
    const authDesc = document.getElementById('biz-auth-desc');
    const verifiedBox = document.getElementById('biz-auth-verified');
    const numDisplay = document.getElementById('biz-verified-number');
    const nameDisplay = document.getElementById('biz-verified-name');
    if(isBiz && bizNum) {
        if(formBox) formBox.style.display = 'none';
        if(authDesc) authDesc.style.display = 'none';
        if(verifiedBox) verifiedBox.style.display = 'block';
        // ✅ textContent로 자동 escape
        if(nameDisplay) nameDisplay.textContent = bizName ? bizName : "인증된 해마마켓 기업";
        if(numDisplay) {
            const raw = String(bizNum).replace(/[^0-9]/g, '');
            numDisplay.textContent = raw.length === 10 ? raw.substring(0,3) + "-" + raw.substring(3,5) + "-*****" : bizNum;
        }
    } else {
        if(formBox) formBox.style.display = 'block';
        if(authDesc) authDesc.style.display = 'block';
        if(verifiedBox) verifiedBox.style.display = 'none';
    }
}

// ============================================================================
// ✅ P0-#4 수정: 사업자 인증 서버화
// ============================================================================
// 변경 핵심:
//   - 클라이언트 auth.updateUser({is_business:true}) 호출 제거 (위조 가능)
//   - Authorization 헤더로 세션 토큰 전송 → 서버가 JWT 검증 후 service_role로
//     app_metadata 직접 업데이트 (위조 불가)
//   - 응답 후 refreshSession()으로 새 app_metadata가 currentUser에 반영
async function submitBusinessAuth() {
    if(!currentUser) return;
    const nameEl  = document.getElementById('biz-name-input');
    const inputEl = document.getElementById('biz-number-input');
    const nameVal = nameEl  ? nameEl.value.trim()  : "";
    const val     = inputEl ? inputEl.value.trim() : "";
    if(!nameVal) { alert("국세청 검증을 위해 상호명(기업명)을 먼저 입력해주세요."); return; }
    if(val.length !== 10) { alert("하이픈(-)을 제외한 10자리 사업자등록번호를 입력해주세요."); return; }
    if (!/^\d{10}$/.test(val)) { alert("사업자등록번호는 숫자 10자리여야 합니다."); return; }
    const btn = document.querySelector('#page-business-auth .submit-btn');
    if(btn) { btn.textContent = "국세청 Live DB 조회 중..."; btn.disabled = true; }

    try {
        // ✅ 현재 세션 토큰을 Authorization 헤더로 전송 →
        //    서버가 JWT 검증 후 service_role로 app_metadata 업데이트.
        const { data, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !data?.session?.access_token) {
            alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
            return;
        }

        const res = await fetch('/api/verify-business', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ b_no: val, biz_name: nameVal })
        });
        const result = await res.json();

        if (result.success) {
            // ✅ 새 app_metadata 반영을 위해 세션 갱신 → currentUser 동기화
            const { data: refreshed, error: refreshErr } = await supabaseClient.auth.refreshSession();
            if (refreshErr || !refreshed?.user) {
                alert('인증은 완료되었지만 세션 갱신에 실패했습니다. 페이지를 새로고침해주세요.');
                return;
            }
            currentUser = refreshed.user;

            // UI 업데이트
            const formEl = document.getElementById('biz-auth-form');
            const verifiedEl = document.getElementById('biz-auth-verified');
            if(formEl) formEl.style.display = 'none';
            if(verifiedEl) verifiedEl.style.display = 'block';
            const verifiedName = document.getElementById('biz-verified-name');
            const verifiedNum  = document.getElementById('biz-verified-number');
            // ✅ textContent로 자동 escape
            if(verifiedName) verifiedName.textContent = result.companyName;
            if(verifiedNum)  verifiedNum.textContent  = val.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
            updateProfileUI();
            if(nameEl)  nameEl.value  = "";
            if(inputEl) inputEl.value = "";
        } else if (result.error) {
            // 서버가 명시적 에러 반환 (이름 불일치, 휴업/폐업, 미등록, 인증 실패 등)
            alert("인증 실패: " + result.error);
        } else {
            alert("인증 처리 중 알 수 없는 오류가 발생했습니다.");
        }
    } catch(err) {
        console.error(err); alert("인증 중 오류가 발생했습니다: " + err.message);
    } finally {
        if(btn) { btn.textContent = "국세청 실시간 진위 확인 (Live)"; btn.disabled = false; }
    }
}

async function toggleLike(productId) {
    if(!currentUser) { alert('로그인 후 이용 가능합니다.'); return; }
    const btn = document.getElementById('modal-heart-btn');
    if(!btn) return;
    btn.style.transform = 'scale(0.8)';
    setTimeout(() => btn.style.transform = 'scale(1)', 100);
    const { data: existing } = await supabaseClient
        .from('haema_likes').select('*')
        .eq('product_id', productId).eq('user_id', currentUser.id).maybeSingle();
    if(existing) {
        await supabaseClient.from('haema_likes').delete().eq('id', existing.id);
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
    } else {
        await supabaseClient.from('haema_likes').insert({ product_id: productId, user_id: currentUser.id });
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#E53E3E" stroke="#E53E3E" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
    }
}

async function checkLikeStatus(productId) {
    if(!currentUser || String(productId).startsWith('p')) return;
    const { data } = await supabaseClient
        .from('haema_likes').select('id')
        .eq('product_id', productId).eq('user_id', currentUser.id).maybeSingle();
    const btn = document.getElementById('modal-heart-btn');
    if(btn) {
        btn.innerHTML = data
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="#E53E3E" stroke="#E53E3E" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
    }
}

async function loadLikedProducts() {
    if(!currentUser) { showPage('login'); return; }
    triggerBottomNav('mypage');
    openMyListCommon("내 관심 목록 (찜)");
    const { data: likes, error } = await supabaseClient
        .from('haema_likes').select('product_id')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    if(error || !likes || likes.length === 0) {
        document.getElementById('mylist-grid').innerHTML = `
        <div style="width:100%; flex-shrink:0; grid-column: 1 / -1; padding: 100px 20px; display:flex; flex-direction:column; align-items:center; text-align:center;">
            <div style="font-size:48px; margin-bottom:16px; color:#CBD5E1;"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div>
            <div style="font-size:18px; font-weight:800; color:#1A2B4A; margin-bottom:8px;">아직 찜을 누른 매물이 없습니다</div>
            <div style="font-size:14px; color:#7A93B0; line-height:1.5; margin-bottom:24px;">관심 있는 장비를 찜해두시면<br>마감 세일이나 협력 배송 알림을 받아볼 수 있습니다.</div>
            <button onclick="triggerBottomNav('home')" style="background:#1A5FA0; color:#fff; font-size:15px; font-weight:700; border:none; border-radius:12px; padding:16px 32px; cursor:pointer; width:100%; max-width:240px; margin-bottom:12px;">매물 둘러보기</button>
        </div>`;
        return;
    }
    const pIds = likes.map(l => l.product_id);
    const { data: pData } = await supabaseClient.from('haema_products').select('*').in('id', pIds);
    const sortedProducts = pIds.map(id => pData ? pData.find(x => String(x.id) === String(id)) : null).filter(Boolean);
    const container = document.getElementById('mylist-grid');
    container.innerHTML = '';
    let frag = document.createDocumentFragment();
    
    sortedProducts.forEach(p => {
        const safeTitle = escapeHtml(p.title);
        let _rawP2 = p.price || '';
        let _numP2 = parseInt(String(_rawP2).replace(/[^0-9]/g, ''));
        const safePrice = escapeHtml(isNaN(_numP2) ? _rawP2 : '₩ ' + _numP2.toLocaleString());
        const productImageHtml = (typeof getProductImageHtml === 'function')
            ? getProductImageHtml(p)
            : (p.svg || '');

        const card = document.createElement('div');
        card.className = 'product-card'; card.style.cursor = 'pointer';
        card.onclick = () => openProductModal(p.id);
        card.innerHTML = `<div class="product-img" style="position:relative;">${productImageHtml}<div style="position:absolute; bottom:8px; right:8px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="#E53E3E" stroke="#E53E3E" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div></div><div class="product-body"><div class="product-title">${safeTitle}</div><div class="product-price">${safePrice}</div></div>`;
        frag.appendChild(card);
    });
    container.appendChild(frag);
}

function openMyListCommon(titleText) {
    showPage('mylist');
    const subTitle = document.querySelector('#page-mylist .sub-title');
    if(subTitle) subTitle.textContent = titleText;
    document.getElementById('mylist-grid').innerHTML = '<div style="grid-column: span 3; padding:40px; text-align:center; color:#999; font-size:13px; display:flex; justify-content:center;">로딩 중...</div>';
}

// 거래완료/후기 — 전역 스코프
let activeReviewProductId = null;
let activeReviewTargetId  = null;

window.completeTransaction = async function(productId, roomId) {
    if(!confirm("정말 이 방의 유저와 거래를 완료하시겠습니까? 거래가 마감 처리됩니다.")) return;
    const p = products.find(x => x.id === productId);
    if(!p) return;

    if (currentUser && p.seller_id && p.seller_id !== currentUser.id && p.user_id !== currentUser.id) {
        alert('판매자만 거래 완료를 처리할 수 있습니다.');
        return;
    }

    const { data: roomData } = await supabaseClient
        .from('haema_chat_rooms').select('buyer_id').eq('id', roomId).maybeSingle();
    if(!roomData) return;
    const buyerId = roomData.buyer_id;
    const { data: result, error } = await supabaseClient.rpc('complete_transaction', {
        p_product_id: productId,
        p_buyer_id: buyerId
    });

    if (error) {
        if (typeof showToast === 'function') showToast('거래 완료 처리 중 오류: ' + error.message);
        else alert('거래 완료 처리 중 오류: ' + error.message);
        return;
    }
    if (result && !result.ok) {
        if (typeof showToast === 'function') showToast('거래 완료 실패: ' + result.error);
        else alert('거래 완료 실패: ' + result.error);
        return;
    }
    p.is_closed = true;
    document.getElementById('chat-trade-btn').textContent = '거래 완료됨';
    document.getElementById('chat-trade-btn').disabled = true;
    document.getElementById('chat-trade-btn').onclick = null;
    if (typeof showToast === 'function') showToast('거래가 성공적으로 완료되었습니다.');
    else alert('거래가 성공적으로 완료되었습니다.');
};

window.openReviewModal = function(productId, targetUserId) {
    activeReviewProductId = productId;
    activeReviewTargetId  = targetUserId;
    if(document.getElementById('review-content'))
        document.getElementById('review-content').value = '';
    document.getElementById('review-modal').style.display = 'flex';
};

window.submitReview = async function(score) {
    if(!activeReviewProductId || !activeReviewTargetId) return;
    const content = document.getElementById('review-content')
        ? document.getElementById('review-content').value.trim() : '';

    if (content.length > 1000) { alert("후기는 1,000자 이하로 입력해주세요."); return; }

    const { error } = await supabaseClient.from('haema_reviews').insert({
        product_id:  activeReviewProductId,
        reviewer_id: currentUser.id,
        reviewee_id: activeReviewTargetId,
        score:       score,
        content:     content
    });
    if(error) {
        if(error.code === '23505') alert('이미 이 거래에 대해 후기를 남기셨습니다!');
        else { console.error(error); alert('후기 등록 중 오류가 발생했습니다.'); }
    } else {
        alert('소중한 후기가 등록되었습니다. 거래 신뢰도(별점)에 반영됩니다!');
    }
    document.getElementById('review-modal').style.display = 'none';
};

// ============================================================================
// 회원 탈퇴 신청 (Phase 2 — Mock 아닌 실제 신청 기록 방식)
// ============================================================================
// 동작:
//   1) admin 계정은 탈퇴 차단 (본인 권한 회복 수단 상실 방지)
//   2) 사용자에게 1차 confirm
//   3) 탈퇴 사유 prompt (선택)
//   4) haema_account_deletion_requests 테이블에 INSERT
//   5) 안내 메시지 + 자동 로그아웃
//
// ⚠️ 실제 auth.users 행 삭제는 어드민이 수동으로 처리하거나,
//     Phase 3에서 Edge Function으로 자동화 예정.
// ============================================================================
window.deleteAccount = async function() {
    // 1) 로그인 확인
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        showPage('login');
        return;
    }

    // 2) admin 계정 가드 — 본인 탈퇴 시 권한 회복 불가능
    const role = currentUser.app_metadata && currentUser.app_metadata.role;
    if (role === 'admin') {
        alert('관리자 계정은 본 화면에서 탈퇴할 수 없습니다.\n별도 절차로 진행해주세요.');
        return;
    }

    // 2.5) 중복 신청 방지 체크 (서버 쿼리)
    const { data: existingPending, error: chkErr } = await supabaseClient
        .from('haema_account_deletion_requests')
        .select('id, status')
        .eq('user_id', currentUser.id)
        .eq('status', 'pending')
        .maybeSingle();

    if (chkErr) {
        console.warn('탈퇴 신청 중복 조회 실패 (무시하고 진행):', chkErr);
    } else if (existingPending) {
        alert('이미 접수된 탈퇴 신청 건이 있습니다.\n운영팀의 처리가 완료될 때까지 잠시 기다려주세요.');
        return;
    }

    // 3) 1차 확인
    if (!confirm('정말 탈퇴하시겠습니까?\n\n• 신청 즉시 로그아웃됩니다.\n• 운영팀 검토 후 영업일 기준 5일 이내 계정과 데이터가 완전히 삭제됩니다.\n• 한 번 처리되면 복구할 수 없습니다.')) {
        return;
    }

    // 4) 탈퇴 사유 (선택)
    const reason = prompt('탈퇴 사유를 알려주시면 서비스 개선에 큰 도움이 됩니다. (선택)\n\n* 비워두셔도 신청은 정상 접수됩니다.', '');
    // prompt 취소(null) 시 신청 자체를 취소 (실수 방지)
    if (reason === null) {
        alert('탈퇴 신청이 취소되었습니다.');
        return;
    }

    // 5) Supabase INSERT
    try {
        const fullName =
            currentUser.user_metadata?.full_name_ko ||
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.display_name ||
            null;

        const { error } = await supabaseClient
            .from('haema_account_deletion_requests')
            .insert([{
                user_id: currentUser.id,
                user_email: currentUser.email,
                user_full_name: fullName,
                reason: reason ? reason.trim().slice(0, 1000) : null
                // status, requested_at은 DB DEFAULT 사용
            }]);

        if (error) {
            // 중복 신청 등의 에러 안내
            console.error('탈퇴 신청 INSERT 오류:', error);
            alert('탈퇴 신청 중 오류가 발생했습니다.\n\n잠시 후 다시 시도하시거나, 문제가 지속되면 고객센터로 연락 주세요.\n\n오류 코드: ' + (error.message || '알 수 없음'));
            return;
        }

        // 6) 성공 안내 + 자동 로그아웃
        alert('탈퇴 신청이 정상 접수되었습니다.\n\n운영팀 검토 후 영업일 기준 5일 이내 계정이 완전 삭제됩니다.\n잠시 후 자동으로 로그아웃됩니다.');

        await supabaseClient.auth.signOut();
        localStorage.removeItem('haema_cart');
        userCart = [];
        if (typeof renderCartBadge === 'function') renderCartBadge();
        window.location.href = 'index.html';
    } catch (err) {
        console.error('deleteAccount 예외:', err);
        alert('탈퇴 신청 처리 중 예기치 않은 오류가 발생했습니다.\n\n' + (err.message || err));
    }
};


// ============================================================================
// ✅ 설정 페이지 동적 데이터 로더 (loadSettingsPage)
// ============================================================================
// 호출처: ui.js의 showPage('settings') 분기에서 자동 호출
// 역할:
//   - 이메일, 연결 계정, 사업자 인증 상태, 기본 거래 지역, 알림 토글 4개
//     모두 user_metadata / app_metadata 기반으로 동적 표시
//   - 거짓 데이터 표시 방지 (알파 신뢰도)
// 보안:
//   - app_metadata만 신뢰 영역으로 사용 (사업자 인증 상태)
//   - user_metadata는 본인 알림 설정 등 비위험 영역만 사용
// ============================================================================
window.loadSettingsPage = function() {
    if (!currentUser) {
        showPage('login');
        return;
    }

    // 1) 이메일 표시 (이미 auth.js에서도 일부 처리되지만 안전망)
    const emailEl = document.getElementById('settings-email');
    if (emailEl) emailEl.textContent = currentUser.email || '이메일 정보 없음';

    // 2) 연결 계정 (identity provider) 동적 표시
    const providerEl = document.getElementById('settings-provider');
    if (providerEl) {
        const identities = currentUser.identities || [];
        const providers = identities.map(i => i.provider).filter(Boolean);
        if (providers.includes('kakao')) {
            providerEl.textContent = '카카오';
        } else if (providers.includes('google')) {
            providerEl.textContent = 'Google';
        } else if (providers.includes('email') || providers.length === 0) {
            providerEl.textContent = '이메일';
        } else {
            providerEl.textContent = providers[0];
        }
    }

    // 3) 사업자 인증 상태 (app_metadata만 신뢰)
    const bizEl = document.getElementById('settings-biz-status');
    if (bizEl) {
        const isBiz = !!currentUser.app_metadata?.is_business;
        if (isBiz) {
            bizEl.textContent = '인증 완료';
            bizEl.style.color = '#1E8E3E';
            bizEl.style.fontWeight = '700';
        } else {
            bizEl.textContent = '미인증';
            bizEl.style.color = '#94A3B8';
            bizEl.style.fontWeight = '400';
        }
    }

    // 4) 기본 거래 지역 (프로필 region 동적 표시)
    const regionEl = document.getElementById('settings-region');
    if (regionEl) {
        const region = currentUser.user_metadata?.region;
        const isVerified = currentUser.user_metadata?.is_region_verified;
        if (region) {
            regionEl.textContent = isVerified ? `${region} (인증됨)` : region;
            regionEl.style.color = isVerified ? '#1E8E3E' : '#1A2B4A';
            regionEl.style.fontWeight = '600';
        } else {
            regionEl.textContent = '미설정';
            regionEl.style.color = '#94A3B8';
            regionEl.style.fontWeight = '400';
        }
    }

    // 5) 알림 토글 4개 상태 복원 (user_metadata 기반, 기본값 true)
    const notifKeys = ['notif_chat', 'notif_auction', 'notif_likes', 'notif_marketing'];
    const toggleIds = ['toggle-notif-chat', 'toggle-notif-auction', 'toggle-notif-likes', 'toggle-notif-marketing'];
    notifKeys.forEach((key, idx) => {
        const toggleEl = document.getElementById(toggleIds[idx]);
        if (!toggleEl) return;
        // 기본값: marketing은 false, 나머지는 true
        const defaultOn = (key !== 'notif_marketing');
        const savedValue = currentUser.user_metadata?.[key];
        const isOn = (savedValue === undefined || savedValue === null) ? defaultOn : !!savedValue;
        if (isOn) {
            toggleEl.classList.add('on');
        } else {
            toggleEl.classList.remove('on');
        }
    });
};

// ============================================================================
// ✅ 알림 토글 클릭 핸들러 (user_metadata에 저장)
// ============================================================================
// 인자:
//   - key: 'notif_chat' | 'notif_auction' | 'notif_likes' | 'notif_marketing'
//   - el: 클릭된 .toggle div 엘리먼트
// 동작:
//   1) UI 즉시 토글 (낙관적 업데이트)
//   2) Supabase auth.updateUser로 저장
//   3) 실패 시 UI 롤백 + 에러 토스트
// ============================================================================
window.toggleNotifSetting = async function(key, el) {
    if (!currentUser) {
        showToast('로그인이 필요합니다.');
        return;
    }
    if (!el) return;

    // 1) 낙관적 UI 업데이트
    const wasOn = el.classList.contains('on');
    const newValue = !wasOn;
    el.classList.toggle('on');

    // 2) 클릭 직후 다시 누르면 race condition 발생 → debounce
    if (el._saving) return;
    el._saving = true;

    try {
        const updatePayload = {};
        updatePayload[key] = newValue;

        const { data, error } = await supabaseClient.auth.updateUser({
            data: updatePayload
        });

        if (error) {
            // 3) 실패 시 UI 롤백
            el.classList.toggle('on');
            console.error('알림 설정 저장 실패:', error);
            showToast('설정 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        // 4) currentUser 동기화 (user_metadata 갱신)
        if (data?.user) currentUser = data.user;

        // 5) 라벨에 따라 짧은 피드백 (선택적)
        const labelMap = {
            'notif_chat': '채팅 알림',
            'notif_auction': '경매 입찰 알림',
            'notif_likes': '관심 매물 업데이트',
            'notif_marketing': '마케팅 수신'
        };
        const label = labelMap[key] || '알림';
        showToast(`${label} ${newValue ? '켜짐' : '꺼짐'}`);
    } catch (err) {
        // 예외 시 UI 롤백
        el.classList.toggle('on');
        console.error('toggleNotifSetting 예외:', err);
        showToast('설정 저장 중 오류가 발생했습니다.');
    } finally {
        el._saving = false;
    }
};

// ============================================================================
// ✅ 기본 거래 지역 클릭 시 동작
// ============================================================================
// - region이 설정되어 있으면 → 프로필 편집으로 이동 (지역 변경 가능)
// - region이 미설정이면     → 토스트 안내 후 프로필 편집으로 워프
// ============================================================================
window.goToRegionSetting = function() {
    if (!currentUser) {
        showPage('login');
        return;
    }
    const hasRegion = !!currentUser.user_metadata?.region;
    if (!hasRegion) {
        showToast('먼저 활동 지역을 설정해주세요.');
    }
    // openProfileEdit가 region selector까지 포함된 화면을 띄움
    if (typeof openProfileEdit === 'function') {
        openProfileEdit();
    } else {
        showPage('profile-edit');
    }
};
