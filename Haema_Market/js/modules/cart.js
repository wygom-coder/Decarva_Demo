// --- 장바구니 기능 시작 ---
// ⚠️ escapeHtml은 utils.js에서 정의 (중복 정의 금지)

// ✅ 수량 상한 (사용자가 +버튼 무한 클릭 방지)
const CART_MAX_QTY_PER_ITEM = 9999;

function addToCart(productId) {
    // ✅ B2B 보안: 로그인 사용자만 장바구니 사용 가능
    if (!currentUser) {
        if (confirm('장바구니 사용은 로그인이 필요합니다.\n로그인 페이지로 이동할까요?')) {
            showPage('login');
        }
        return;
    }
    
    const existingIndex = userCart.findIndex(item => String(item.id) === String(productId));
    if (existingIndex > -1) {
        if (userCart[existingIndex].qty >= CART_MAX_QTY_PER_ITEM) {
            alert(`품목당 최대 ${CART_MAX_QTY_PER_ITEM}개까지만 담을 수 있습니다.`);
            return;
        }
        userCart[existingIndex].qty += 1;
    } else {
        userCart.push({ id: productId, qty: 1 });
    }
    saveCart();
    alert('장바구니에 담겼습니다.');
}

function saveCart() {
    try {
        localStorage.setItem('haema_cart', JSON.stringify(userCart));
    } catch (e) {
        console.error('장바구니 저장 실패:', e);
    }
    renderCartBadge();
}

function renderCartBadge() {
    const badge = document.getElementById('header-cart-badge');
    if(!badge) return;
    const totalQty = userCart.reduce((sum, item) => sum + item.qty, 0);
    if(totalQty > 0) {
        badge.style.display = 'flex';
        badge.textContent = totalQty;
    } else {
        badge.style.display = 'none';
    }
}

window.renderCartPage = async function() {
    const area = document.getElementById('cart-content-area');
    const totalCountEl = document.getElementById('cart-total-count');
    if(!area) return;
    
    if(userCart.length === 0) {
        area.innerHTML = `
        <div style="padding: 100px 20px; display:flex; flex-direction:column; align-items:center; text-align:center;">
            <div style="font-size:48px; margin-bottom:16px; color:#CBD5E1;"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg></div>
            <div style="font-size:18px; font-weight:800; color:#1A2B4A; margin-bottom:8px;">장바구니가 비어 있어요</div>
            <div style="font-size:14px; color:#7A93B0; line-height:1.5; margin-bottom:24px;">수백 개의 인증된 해양 기자재와 선용품을<br>벤더 통합 배송으로 저렴하게 만나보세요.</div>
            <button onclick="triggerBottomNav('home')" style="background:#1A5FA0; color:#fff; font-size:15px; font-weight:700; border:none; border-radius:12px; padding:16px 32px; cursor:pointer; width:100%; max-width:240px; margin-bottom:12px;">실시간 특가 매물 보기</button>
        </div>`;
        if(totalCountEl) totalCountEl.textContent = '0개';
        return;
    }
    
    const cartIds = userCart.map(c => String(c.id));
    const { data, error } = await supabaseClient
        .from('haema_products')
        .select('*')
        .in('id', cartIds);
    
    if (error) {
        console.error('renderCartPage fetch error:', error);
        area.innerHTML = `<div style="padding: 100px 20px; text-align:center; color:#C62828;">장바구니 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>`;
        return;
    }

    const productsMap = {};
    (data || []).forEach(p => { productsMap[String(p.id)] = p; });

    // Group by supplier
    const groups = {};
    let totalItems = 0;
    
    userCart.forEach(cartItem => {
        const product = productsMap[String(cartItem.id)];
        if(!product) return;
        
        // ✅ 정규식 백슬래시 수정: 원본은 \\[ 였으나 string literal에서 \[가 정확
        const storeMatch = (product.title || '').match(/^\[(.*?)\]/);
        const storeName = storeMatch ? storeMatch[1] : '일반 업체';
        
        if(!groups[storeName]) groups[storeName] = [];
        groups[storeName].push({ cartItem, product });
        totalItems += cartItem.qty;
    });
    
    if(totalCountEl) totalCountEl.textContent = totalItems + '개';
    
    let html = '';
    for(const [storeName, items] of Object.entries(groups)) {
        // ✅ 그룹 헤더의 storeName escape
        const safeStoreName = escapeHtml(storeName);
        html += `
            <div style="background:#fff; border-radius:16px; padding:16px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.03); border:1px solid #eaedf2;">
                <div style="font-size:14px; font-weight:800; color:#1A2B4A; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#1A2B4A" stroke-width="2"/><path d="M12 12v6m-4-6v6m8-6v6" stroke="#1A2B4A" stroke-width="2"/></svg>
                    [${safeStoreName}] 배송
                </div>
        `;
        
        items.forEach(obj => {
            const p = obj.product;
            const c = obj.cartItem;

            // ✅ 모든 사용자 입력 필드 escape
            const safeId = escapeHtml(p.id);
            const safeTitle = escapeHtml(p.title);

            // ✅ image_url을 사용 (svg 컬럼은 더 이상 신뢰하지 않음)
            //    레거시 호환: image_url이 없으면 빈 배경
            const safeImageUrl = p.image_url ? escapeHtml(p.image_url) : '';
            const imgStyle = safeImageUrl 
                ? `background:#f4f9ff url('${safeImageUrl}') center/cover;`
                : `background:#f4f9ff;`;

            const displayPrice = String(p.price || '').replace(/[^0-9]/g, '');
            const priceNum = parseInt(displayPrice || 0);
            const safePriceText = priceNum.toLocaleString();
            const qty = parseInt(c.qty) || 0;

            html += `
                <div style="display:flex; gap:12px; padding:12px 0; border-top:1px solid #f4f9ff;">
                    <div style="width:60px; height:60px; border-radius:8px; ${imgStyle}"></div>
                    <div style="flex:1;">
                        <div style="font-size:13px; color:#1A2B4A; font-weight:600; line-height:1.4; margin-bottom:4px;">${safeTitle}</div>
                        <div style="font-size:14px; font-weight:800; color:#1A5FA0;">₩ ${safePriceText}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; justify-content:space-between;">
                        <button onclick="removeCartItem('${safeId}')" style="background:none; border:none; color:#999; font-size:16px; cursor:pointer; padding:0;">✕</button>
                        <div style="display:flex; align-items:center; border:1px solid #eaedf2; border-radius:4px; overflow:hidden;">
                            <button onclick="updateCartQty('${safeId}', -1)" style="width:24px; height:24px; background:#fff; border:none; color:#1A2B4A; cursor:pointer;">-</button>
                            <div style="width:30px; text-align:center; font-size:12px; font-weight:700; line-height:24px;">${qty}</div>
                            <button onclick="updateCartQty('${safeId}', 1)" style="width:24px; height:24px; background:#fff; border:none; color:#1A2B4A; cursor:pointer;">+</button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    area.innerHTML = html;
}

window.updateCartQty = function(id, delta) {
    const idx = userCart.findIndex(item => String(item.id) === String(id));
    if(idx > -1) {
        const newQty = userCart[idx].qty + delta;
        if (newQty > CART_MAX_QTY_PER_ITEM) {
            alert(`품목당 최대 ${CART_MAX_QTY_PER_ITEM}개까지만 담을 수 있습니다.`);
            return;
        }
        userCart[idx].qty = newQty;
        if(userCart[idx].qty <= 0) userCart.splice(idx, 1);
        saveCart();
        renderCartPage();
    }
}

window.removeCartItem = function(id) {
    const idx = userCart.findIndex(item => String(item.id) === String(id));
    if(idx > -1) {
        userCart.splice(idx, 1);
        saveCart();
        renderCartPage();
    }
}

window.requestQuoteCheckout = async function() {
    if(userCart.length === 0) {
        alert('장바구니가 비어있습니다.');
        return;
    }
    if (!currentUser) {
        if (typeof showToast === 'function') {
            showToast('견적서를 발주하시려면 로그인이 필요합니다.');
            setTimeout(() => showPage('login'), 600);
        } else {
            showPage('login');
        }
        return;
    }

    // ✅ 서버의 RPC 함수로 넘기기 위해 최소한의 정보(product_id, qty)만 조립
    // 해커가 가격이나 이름을 임의로 변조할 수 없게 방어
    const itemsData = userCart.map(cartItem => ({
        product_id: cartItem.id,
        qty: cartItem.qty
    }));

    try {
        const { data, error } = await supabaseClient.rpc('submit_secure_quote', {
            p_buyer_id: currentUser.id,
            p_items: itemsData
        });

        if (error) throw error;
        
        if (data && data.ok === false) {
            throw new Error(data.error || '견적서 생성 중 거부되었습니다.');
        }

        alert('✅ 성공적으로 견적 요청이 접수되었습니다.');
        userCart = [];
        saveCart();
        renderCartPage();
        showPage('home');
    } catch (err) {
        const msg = err.message || '알 수 없는 오류';
        // PostgREST 에러 코드로 분기 (메시지 substring 매칭보다 정확)
        if (err.code === 'PGRST202' || msg.includes('Could not find the function')) {
            alert('⚠️ 최신 보안 패치가 DB에 반영되지 않았습니다. 관리자에게 문의해주세요.');
        } else if (err.code === '42501' || msg.includes('permission denied')) {
            alert('⚠️ 견적 요청 권한이 없습니다. 다시 로그인해주세요.');
        } else {
            alert('견적 요청 중 오류가 발생했습니다: ' + msg);
        }
        console.error('Quote Checkout Error:', err);
    }
}
// --- 장바구니 기능 끝 ---
