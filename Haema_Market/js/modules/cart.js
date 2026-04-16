// --- 장바구니 기능 시작 ---
function addToCart(productId) {
    const existingIndex = userCart.findIndex(item => String(item.id) === String(productId));
    if (existingIndex > -1) {
        userCart[existingIndex].qty += 1;
    } else {
        userCart.push({ id: productId, qty: 1 });
    }
    saveCart();
    alert('장바구니에 담겼습니다.');
}

function saveCart() {
    localStorage.setItem('haema_cart', JSON.stringify(userCart));
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

window.renderCartPage = function() {
    const area = document.getElementById('cart-content-area');
    const totalCountEl = document.getElementById('cart-total-count');
    if(!area) return;
    
    if(userCart.length === 0) {
        area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">장바구니가 비어있습니다.</div>';
        if(totalCountEl) totalCountEl.textContent = '0개';
        return;
    }
    
    // Group by supplier
    const groups = {};
    let totalItems = 0;
    
    userCart.forEach(cartItem => {
        const product = products.find(p => String(p.id) === String(cartItem.id));
        if(!product) return;
        
        const storeMatch = (product.title||'').match(/^\\[(.*?)\\]/);
        const storeName = storeMatch ? storeMatch[1] : '일반 업체';
        
        if(!groups[storeName]) groups[storeName] = [];
        groups[storeName].push({ cartItem, product });
        totalItems += cartItem.qty;
    });
    
    if(totalCountEl) totalCountEl.textContent = totalItems + '개';
    
    let html = '';
    for(const [storeName, items] of Object.entries(groups)) {
        html += `
            <div style="background:#fff; border-radius:16px; padding:16px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.03); border:1px solid #eaedf2;">
                <div style="font-size:14px; font-weight:800; color:#1A2B4A; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#1A2B4A" stroke-width="2"/><path d="M12 12v6m-4-6v6m8-6v6" stroke="#1A2B4A" stroke-width="2"/></svg>
                    [${storeName}] 배송
                </div>
        `;
        
        items.forEach(obj => {
            const p = obj.product;
            const c = obj.cartItem;
            const displayPrice = p.price.replace(/[^0-9]/g, '');
            html += `
                <div style="display:flex; gap:12px; padding:12px 0; border-top:1px solid #f4f9ff;">
                    <div style="width:60px; height:60px; border-radius:8px; background:#f4f9ff url('${p.image_url}') center/cover;"></div>
                    <div style="flex:1;">
                        <div style="font-size:13px; color:#1A2B4A; font-weight:600; line-height:1.4; margin-bottom:4px;">${p.title}</div>
                        <div style="font-size:14px; font-weight:800; color:#1A5FA0;">₩ ${parseInt(displayPrice||0).toLocaleString()}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; justify-content:space-between;">
                        <button onclick="removeCartItem('${p.id}')" style="background:none; border:none; color:#999; font-size:16px; cursor:pointer; padding:0;">✕</button>
                        <div style="display:flex; align-items:center; border:1px solid #eaedf2; border-radius:4px; overflow:hidden;">
                            <button onclick="updateCartQty('${p.id}', -1)" style="width:24px; height:24px; background:#fff; border:none; color:#1A2B4A; cursor:pointer;">-</button>
                            <div style="width:30px; text-align:center; font-size:12px; font-weight:700; line-height:24px;">${c.qty}</div>
                            <button onclick="updateCartQty('${p.id}', 1)" style="width:24px; height:24px; background:#fff; border:none; color:#1A2B4A; cursor:pointer;">+</button>
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
        userCart[idx].qty += delta;
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
        alert('견적서를 발주하시려면 로그인이 필요합니다.');
        showPage('login');
        return;
    }

    // 업체(Vendor)별로 물건을 묶기
    const groups = {};
    userCart.forEach(cartItem => {
        const product = products.find(p => String(p.id) === String(cartItem.id));
        if(!product) return;
        
        const storeMatch = (product.title||'').match(/^\[(.*?)\]/);
        const storeName = storeMatch ? storeMatch[1] : '일반 업체';
        
        if(!groups[storeName]) groups[storeName] = [];
        groups[storeName].push({
            product_id: product.id,
            title: product.title,
            qty: cartItem.qty,
            price: product.price
        });
    });

    const quotesToInsert = [];
    for(const [storeName, itemsData] of Object.entries(groups)) {
        quotesToInsert.push({
            buyer_id: currentUser.id,
            vendor_name: storeName,
            items: itemsData,
            status: 'pending'
        });
    }

    try {
        const { error } = await supabaseClient.from('haema_quotes').insert(quotesToInsert);
        if (error) throw error;

        alert('✅ 성공적으로 견적 요청이 접수되었습니다.');
        userCart = [];
        saveCart();
        renderCartPage();
        showPage('home');
    } catch (err) {
        if (err.message.includes('relation "public.haema_quotes" does not exist')) {
            alert('⚠️ 에러: DB에 [haema_quotes] 테이블이 아직 생성되지 않았습니다. 관리자에게 문의하세요.');
        } else {
            alert('견적 요청 중 오류가 발생했습니다: ' + err.message);
        }
    }
}
// --- 장바구니 기능 끝 ---

