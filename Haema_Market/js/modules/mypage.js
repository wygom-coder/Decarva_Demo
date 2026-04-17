// ⚠️ escapeHtml은 utils.js에서 정의 (중복 정의 금지)

window.showMyQuotes = async function() {
    if(!currentUser) { alert('로그인이 필요한 기능입니다.'); return showPage('login'); }
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

function showMyList() {
    if(!currentUser) { alert("로그인이 필요한 기능입니다."); showPage('login'); return; }
    showPage('mylist');
    const myProducts = products.filter(p => p.seller_id === currentUser.id);
    const container = document.getElementById('mylist-grid');
    if(!container) return;
    container.innerHTML = '';
    if(myProducts.length === 0) {
        // ✅ P0-A 안전망: onclick을 goToRegisterCreateMode로 (혹시 이전 변경이 캐시였을 경우 재적용)
        container.innerHTML = `
        <div style="grid-column: span auto; padding: 100px 20px; display:flex; flex-direction:column; align-items:center; text-align:center;">
            <div style="font-size:48px; margin-bottom:16px; color:#CBD5E1;"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
            <div style="font-size:18px; font-weight:800; color:#1A2B4A; margin-bottom:8px;">등록하신 판매 매물이 없습니다</div>
            <div style="font-size:14px; color:#7A93B0; line-height:1.5; margin-bottom:24px;">보유하신 잉여 자재나 중고 부품을 올려<br>전국의 수많은 바이어와 바로 거래하세요.</div>
            <button onclick="goToRegisterCreateMode()" style="background:var(--blue-50); color:var(--blue-800); border:1px solid var(--blue-200); font-size:15px; font-weight:700; border-radius:12px; padding:16px 32px; cursor:pointer; width:100%; max-width:240px; margin-bottom:12px;">첫 판매글 작성하기</button>
        </div>`;
        return;
    }
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
        const safePrice = escapeHtml(p.price);

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

        container.appendChild(card);
    });
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
    if(!currentUser) { alert('로그인이 필요한 기능입니다.'); showPage('login'); return; }
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
async function verifyGPSLocation() {
    const selector = document.getElementById('edit-region-select');
    const selectedRegion = selector.value;
    const btn = document.getElementById('btn-gps-verify');
    if(!selectedRegion) { alert("원하시는 활동 지역(시/도)을 우선 선택해주세요."); return; }
    if(!navigator.geolocation) { alert("접속하신 기기 또는 브라우저가 위치 스캔 기능을 지원하지 않습니다."); return; }
    btn.textContent = "위치 스캔 중..."; btn.disabled = true;
    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`);
            const data = await response.json();
            const geoRegion = data.principalSubdivision || data.city || "";
            let isMatch = geoRegion.includes(selectedRegion);
            if(!isMatch) {
                const shortcuts = { "경기":"경기도","강원":"강원","충북":"충청북도","충남":"충청남도","전북":"전라북도","전남":"전라남도","경북":"경상북도","경남":"경상남도","제주":"제주" };
                if(shortcuts[selectedRegion] && geoRegion.includes(shortcuts[selectedRegion])) isMatch = true;
            }
            if(isMatch) {
                alert(`현재 접속 위치가 [${geoRegion}]로 확인되었습니다.`);
                tempVerifiedRegion = selectedRegion;
                btn.textContent = "위치 확인 완료"; btn.style.background = "#E6F4EA"; btn.style.color = "#1E8E3E"; btn.style.borderColor = "#1E8E3E";
                selector.disabled = true;
            } else {
                alert(`선택 지역(${selectedRegion})과 현재 위치(${geoRegion})가 다릅니다.`);
                btn.textContent = "다시 인증하기"; btn.disabled = false;
            }
        } catch(e) {
            alert("서버와 통신 중 오류가 발생했습니다. 잠시 후 시도해주세요.");
            btn.textContent = "위치 재검증"; btn.disabled = false;
        }
    }, () => {
        alert("위치 정보를 가져올 수 없습니다. 기기의 위치 권한을 허용해주세요.");
        btn.textContent = "위치 권한 재요청"; btn.disabled = false;
    });
}

// ==== 사업자 인증 ====
function openBusinessAuth() {
    if(!currentUser) { alert('로그인이 필요한 기능입니다.'); showPage('login'); return; }
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
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.access_token) {
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
    if(!currentUser) { alert('로그인이 필요한 기능입니다.'); showPage('login'); return; }
    triggerBottomNav('mypage');
    openMyListCommon("내 관심 목록 (찜)");
    const { data: likes, error } = await supabaseClient
        .from('haema_likes').select('product_id')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    if(error || !likes || likes.length === 0) {
        document.getElementById('mylist-grid').innerHTML = `
        <div style="grid-column: span auto; padding: 100px 20px; display:flex; flex-direction:column; align-items:center; text-align:center;">
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
    sortedProducts.forEach(p => {
        const safeTitle = escapeHtml(p.title);
        const safePrice = escapeHtml(p.price);
        const productImageHtml = (typeof getProductImageHtml === 'function')
            ? getProductImageHtml(p)
            : (p.svg || '');

        const card = document.createElement('div');
        card.className = 'product-card'; card.style.cursor = 'pointer';
        card.onclick = () => openProductModal(p.id);
        card.innerHTML = `<div class="product-img" style="position:relative;">${productImageHtml}<div style="position:absolute; bottom:8px; right:8px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="#E53E3E" stroke="#E53E3E" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div></div><div class="product-body"><div class="product-title">${safeTitle}</div><div class="product-price">${safePrice}</div></div>`;
        container.appendChild(card);
    });
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
    await supabaseClient.from('haema_products')
        .update({ is_closed: true, highest_bidder_id: buyerId }).eq('id', productId);
    p.is_closed = true;
    document.getElementById('chat-trade-btn').textContent = '후기 남기기';
    document.getElementById('chat-trade-btn').onclick = () => window.openReviewModal(productId, buyerId);
    window.openReviewModal(productId, buyerId);
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
