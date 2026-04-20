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
    const { data: roomInfo } = await supabaseClient.from('haema_chat_rooms').select('buyer_id').eq('id', roomId).single();
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
