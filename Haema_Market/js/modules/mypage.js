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
            html += `<div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid #eaedf2; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                    <div>
                        <div style="font-size:12px; color:#7A93B0; margin-bottom:4px;">${dateStr} 발주</div>
                        <div style="font-size:15px; font-weight:800; color:#1A2B4A;">[${q.vendor_name}]</div>
                    </div>
                    <div style="font-size:11px; font-weight:800; background:${statusBg}; color:${statusColor}; padding:4px 8px; border-radius:6px;">${statusText}</div>
                </div>
                <div style="background:#f8f9fc; border-radius:8px; padding:12px; display:flex; align-items:center; justify-content:space-between;">
                    <div style="font-size:13px; font-weight:600; color:#4A5568;">${itemSummary}</div>
                    <button style="background:#fff; border:1px solid #eaedf2; border-radius:6px; padding:6px 10px; font-size:12px; font-weight:700; color:#1A5FA0; cursor:pointer;" onclick="alert('품목 상세 내역 확인 기능은 추후 연동됩니다.')">상세보기</button>
                </div>
            </div>`;
        });
        area.innerHTML = html;
    } catch(err) {
        area.innerHTML = `<div style="padding: 60px 20px; font-size:14px; color:#D32F2F; text-align:center;">오류가 발생했습니다:<br>${err.message}</div>`;
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
        container.innerHTML = `
        <div style="grid-column: span auto; padding: 100px 20px; display:flex; flex-direction:column; align-items:center; text-align:center;">
            <div style="font-size:48px; margin-bottom:16px; color:#CBD5E1;"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
            <div style="font-size:18px; font-weight:800; color:#1A2B4A; margin-bottom:8px;">등록하신 판매 매물이 없습니다</div>
            <div style="font-size:14px; color:#7A93B0; line-height:1.5; margin-bottom:24px;">보유하신 잉여 자재나 중고 부품을 올려<br>전국의 수많은 바이어와 바로 거래하세요.</div>
            <button onclick="requireAuthAndShow('register')" style="background:var(--blue-50); color:var(--blue-800); border:1px solid var(--blue-200); font-size:15px; font-weight:700; border-radius:12px; padding:16px 32px; cursor:pointer; width:100%; max-width:240px; margin-bottom:12px;">첫 판매글 작성하기</button>
        </div>`;
        return;
    }
    myProducts.forEach((p, idx) => {
        let tagsHtml = '';
        if(p.auction) tagsHtml += `<span class="ptag ptag-y" style="background:#1A2B4A; color:#fff;">경매 ${p.bid_count}회</span> `;
        if(p.offer)   tagsHtml += `<span class="ptag ptag-b">가격제안</span> `;
        if(!p.auction && !p.offer) tagsHtml += `<span class="ptag" style="background:#EAEDF2; color:#7A93B0;">직거래</span> `;
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.cursor = 'pointer';
        card.onclick = () => openProductModal(p.id);
        card.innerHTML = `<div class="product-img">${p.svg}</div><div class="product-body"><div class="product-sub">${p.region} · ${p.condition}</div><div class="product-title">${p.title}</div><div class="product-price">${p.price}</div><div class="product-tags">${tagsHtml}</div></div>`;
        container.appendChild(card);
    });
}

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
    const email = currentUser.email;
    const metaName = currentUser.user_metadata?.display_name;
    const metaBio  = currentUser.user_metadata?.bio;
    const metaRegion = currentUser.user_metadata?.region;
    const isVerified = currentUser.user_metadata?.is_region_verified;
    const nameStr = metaName ? metaName : email.split('@')[0];
    const firstChar = nameStr.charAt(0).toUpperCase();
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
    const isBiz = currentUser.user_metadata?.is_business;
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
    const nameStr = metaName ? metaName : currentUser.email.split('@')[0];
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
    btn.textContent = '메타데이터 굽는 중...'; btn.disabled = true;
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
    const isBiz = currentUser.user_metadata?.is_business;
    const bizNum = currentUser.user_metadata?.biz_number;
    const bizName = currentUser.user_metadata?.biz_name;
    const formBox = document.getElementById('biz-auth-form');
    const authDesc = document.getElementById('biz-auth-desc');
    const verifiedBox = document.getElementById('biz-auth-verified');
    const numDisplay = document.getElementById('biz-verified-number');
    const nameDisplay = document.getElementById('biz-verified-name');
    if(isBiz && bizNum) {
        if(formBox) formBox.style.display = 'none';
        if(authDesc) authDesc.style.display = 'none';
        if(verifiedBox) verifiedBox.style.display = 'block';
        if(nameDisplay) nameDisplay.textContent = bizName ? bizName : "인증된 해마마켓 기업";
        if(numDisplay) {
            const raw = bizNum.replace(/[^0-9]/g, '');
            numDisplay.textContent = raw.length === 10 ? raw.substring(0,3) + "-" + raw.substring(3,5) + "-*****" : bizNum;
        }
    } else {
        if(formBox) formBox.style.display = 'block';
        if(authDesc) authDesc.style.display = 'block';
        if(verifiedBox) verifiedBox.style.display = 'none';
    }
}

async function submitBusinessAuth() {
    if(!currentUser) return;
    const nameEl  = document.getElementById('biz-name-input');
    const inputEl = document.getElementById('biz-number-input');
    const nameVal = nameEl  ? nameEl.value.trim()  : "";
    const val     = inputEl ? inputEl.value.trim() : "";
    if(!nameVal) { alert("국세청 검증을 위해 상호명(기업명)을 먼저 입력해주세요."); return; }
    if(val.length !== 10) { alert("하이픈(-)을 제외한 10자리 사업자등록번호를 입력해주세요."); return; }
    const btn = document.querySelector('#page-business-auth .submit-btn');
    if(btn) { btn.textContent = "국세청 Live DB 조회 중..."; btn.disabled = true; }
    try {
        const res = await fetch('/api/verify-business', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ b_no: val, biz_name: nameVal })
        });
        const result = await res.json();
        if(result.error) { alert("조회 실패: " + result.error); return; }
        if(result.status === "01") {
            if(!result.nameMatch) { alert(`입력하신 업체명("${nameVal}")이 국세청에 등록된 업체명("${result.companyName}")과 일치하지 않습니다.\n업체명을 정확히 입력해주세요.`); return; }
            const { data, error } = await supabaseClient.auth.updateUser({ data: { is_business: true, biz_number: val, biz_name: result.companyName } });
            if(error) throw new Error("서버 프로필 업데이트 에러");
            currentUser = data.user;
            const formEl = document.getElementById('biz-auth-form');
            const verifiedEl = document.getElementById('biz-auth-verified');
            if(formEl) formEl.style.display = 'none';
            if(verifiedEl) verifiedEl.style.display = 'block';
            const verifiedName = document.getElementById('biz-verified-name');
            const verifiedNum  = document.getElementById('biz-verified-number');
            if(verifiedName) verifiedName.textContent = result.companyName;
            if(verifiedNum)  verifiedNum.textContent  = val.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
            updateProfileUI();
            if(nameEl)  nameEl.value  = "";
            if(inputEl) inputEl.value = "";
        } else if(result.status === "02" || result.status === "03") {
            alert(`해당 사업자번호는 현재 ${result.status === "02" ? "휴업" : "폐업"} 상태입니다. 계속사업자만 인증이 가능합니다.`);
        } else {
            alert("국세청 DB에서 해당 사업자번호를 찾을 수 없습니다. 번호를 다시 확인해주세요.");
        }
    } catch(err) {
        console.error(err); alert("인증 중 오류가 발생했습니다: " + err.message);
    } finally {
        if(btn) { btn.textContent = "국세청 실시간 진위 확인 (Live)"; btn.disabled = false; }
    }
}

// ✅ [수정] toggleLike — innerHTML로 SVG 정상 렌더링
async function toggleLike(productId) {
    if(!currentUser) { alert('로그인 후 이용 가능합니다.'); return; }
    const btn = document.getElementById('modal-heart-btn');
    if(!btn) return;
    btn.style.transform = 'scale(0.8)';
    setTimeout(() => btn.style.transform = 'scale(1)', 100);
    const { data: existing } = await supabaseClient
        .from('haema_likes').select('*')
        .eq('product_id', productId).eq('user_id', currentUser.id).single();
    if(existing) {
        await supabaseClient.from('haema_likes').delete().eq('id', existing.id);
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
    } else {
        await supabaseClient.from('haema_likes').insert({ product_id: productId, user_id: currentUser.id });
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#E53E3E" stroke="#E53E3E" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
    }
}

// ✅ [수정] checkLikeStatus — innerHTML로 SVG 정상 렌더링
async function checkLikeStatus(productId) {
    if(!currentUser || String(productId).startsWith('p')) return;
    const { data } = await supabaseClient
        .from('haema_likes').select('id')
        .eq('product_id', productId).eq('user_id', currentUser.id).single();
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
        const card = document.createElement('div');
        card.className = 'product-card'; card.style.cursor = 'pointer';
        card.onclick = () => openProductModal(p.id);
        card.innerHTML = `<div class="product-img" style="position:relative;">${p.svg}<div style="position:absolute; bottom:8px; right:8px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="#E53E3E" stroke="#E53E3E" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div></div><div class="product-body"><div class="product-title">${p.title}</div><div class="product-price">${p.price}</div></div>`;
        container.appendChild(card);
    });
}

function openMyListCommon(titleText) {
    showPage('mylist');
    const subTitle = document.querySelector('#page-mylist .sub-title');
    if(subTitle) subTitle.textContent = titleText;
    document.getElementById('mylist-grid').innerHTML = '<div style="grid-column: span 3; padding:40px; text-align:center; color:#999; font-size:13px; display:flex; justify-content:center;">로딩 중...</div>';
}

// ✅ [버그 수정] 전역 스코프로 이동 — 거래완료/후기 기능 복구
let activeReviewProductId = null;
let activeReviewTargetId  = null;

window.completeTransaction = async function(productId, roomId) {
    if(!confirm("정말 이 방의 유저와 거래를 완료하시겠습니까? 거래가 마감 처리됩니다.")) return;
    const p = products.find(x => x.id === productId);
    if(!p) return;
    const { data: roomData } = await supabaseClient
        .from('haema_chat_rooms').select('buyer_id').eq('id', roomId).single();
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
