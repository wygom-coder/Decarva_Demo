# 클로드 8라운드(최종 승인) 요청용 프롬프트 및 코드

아래 텍스트를 전체 복사해서 클로드에게 전달해 주세요!

---

**[프롬프트 시작]**
네가 7라운드에서 지적한 프론트엔드 에러 핸들링 증발 문제와 직거래 리뷰 RLS 이슈를 완벽하게 해결했어!

1. `auth.js`의 카카오 로그인에는 네가 짜준 대로 `try-catch-finally` 패턴과 `showToast`를 적용해서 더블클릭 방지 및 에러 안내가 잘 나오도록 복원했어.
2. 직거래 리뷰 기능은 네 추천(Option A)을 100% 수용해서, 알파 오픈 기간 동안에는 아예 UI에서 버튼과 페이지를 모두 숨김(`display: none`) 처리했어.
3. 그리고 K2에서 네가 걱정했던 `cart.js`의 직접 `insert` 문제는, 내가 예전에 이미 `supabaseClient.rpc('submit_secure_quote')`를 쓰도록 고쳐놓았어! (네가 프론트 코드를 못 봐서 오해한 거야. 아래에 `cart.js` 코드도 첨부할게)

이제 아래 프론트엔드 코드들을 쓱 확인해 보고, 진짜로 알파 오픈 출항을 알리는 최종 승인 뱃지를 달아줘!

---

### 1. `auth.js` (카카오 로그인 복원 부분)
```javascript
window.loginWithKakao = async function() {
    const btn = document.querySelector('[onclick*="loginWithKakao"]');
    if (btn) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.textContent = '카카오로 이동 중...';
    }
    
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'kakao',
            options: {
                redirectTo: window.location.origin + '/'
            }
        });
        
        if (error) {
            console.error('카카오 OAuth 시작 실패:', error);
            if (typeof showToast === 'function') {
                showToast('카카오 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            } else {
                alert('카카오 로그인 중 오류가 발생했습니다: ' + error.message);
            }
        }
    } catch (e) {
        console.error('카카오 로그인 네트워크 오류:', e);
        if (typeof showToast === 'function') {
            showToast('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
        } else {
            alert('네트워크 오류: ' + (e.message || '알 수 없는 오류'));
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = btn.dataset.originalText || '카카오로 시작하기';
        }
    }
};
```

### 2. `cart.js` (클로드가 우려했던 RPC 적용 증빙)
```javascript
window.requestQuoteCheckout = async function() {
    if (userCart.length === 0) { alert('장바구니가 비어있습니다.'); return; }
    if (!currentUser) { alert('견적서 발주에는 로그인이 필요합니다.'); showPage('login'); return; }

    const itemsPayload = userCart.map(c => ({
        product_id: c.id,
        qty: c.qty
    }));

    try {
        // ✅ [핵심 방어벽] 클라이언트가 직접 insert 하지 않고 안전한 보안 RPC 호출
        const { data, error } = await supabaseClient.rpc('submit_secure_quote', {
            p_items: itemsPayload
        });

        if (error) throw error;
        if (data && data.ok === false) throw new Error(data.error);
        
        alert(data.message || '견적 발주가 성공적으로 완료되었습니다!');
        userCart = [];
        saveCart();
        renderCartPage();
        showPage('home');
    } catch (err) {
        if (err.message && err.message.includes('submit_secure_quote')) {
            alert('⚠️ 에러: 최신 보안 패치(submit_secure_quote 함수)가 DB에 반영되지 않았습니다. 관리자에게 문의하세요.');
        } else {
            alert('견적 요청 중 오류가 발생했습니다: ' + err.message);
        }
        console.error('Quote Checkout Error:', err);
    }
};
```

### 3. `index.html` (리뷰 관련 숨김 처리)
```html
<!-- 마이페이지 메뉴 내 리뷰 탭 숨김 처리 -->
<!-- 🚨 알파 릴리즈 안정성을 위해 거래 후기 기능 임시 숨김 (Option A) -->
<div class="my-menu-item" onclick="showPage('reviews')" style="display:none;">
    ... <span class="menu-text">거래 후기</span> ...
</div>

<!-- 받은 거래 후기 뷰 페이지 컨테이너 자체를 숨김 처리 -->
<!-- 🚨 알파 릴리즈 안정성을 위해 거래 후기 뷰 페이지 접근 차단 -->
<div class="page" id="page-reviews" style="display:none !important;">
```

### 4. `mypage.js` & `chat.js` (거래 완료 버튼 수정)
```javascript
// chat.js
if (pData.is_closed) {
    tradeBtn.textContent = '거래 완료됨';
    tradeBtn.style.background = '#EAEDF2';
    tradeBtn.style.color = '#7A93B0';
    tradeBtn.style.display = 'block';
    tradeBtn.disabled = true;  // 비활성화
    tradeBtn.onclick = null;   // 이벤트 제거 (리뷰 모달 안 띄움)
}

// mypage.js (거래 확정 로직)
await supabaseClient.from('haema_products')
    .update({ is_closed: true, highest_bidder_id: buyerId }).eq('id', productId);
p.is_closed = true;
document.getElementById('chat-trade-btn').textContent = '거래 완료됨';
document.getElementById('chat-trade-btn').disabled = true;
document.getElementById('chat-trade-btn').onclick = null;
alert('거래가 성공적으로 완료되었습니다.');
```
**[프롬프트 끝]**
