// [실시간 1:1 채팅 시스템 (Supabase Real-time)]
// ----------------------------------------
// ⚠️ escapeHtml은 utils.js에서 정의 (중복 정의 금지)

let currentChatRoomId = null;
let chatSubscription = null;
let myChats = [];

async function startChat(productId) {
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
    
    if(p.user_id === currentUser.id || p.seller_id === currentUser.id) {
        alert("본인이 등록한 상품에는 채팅을 걸 수 없습니다.");
        return;
    }
    
    const btn = document.querySelector('.modal-box button');
    if(btn) btn.textContent = "채팅방 연결 중...";
    
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
    }
    
    closeProductModal();
    openChatRoom(roomId, p);
}

// 하단 탭 '채팅' 눌렀을 때 목록 로드
async function loadChats() {
    triggerBottomNav('chat');
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
         return;
    }
    
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
    
    const chatroomEl = document.getElementById('chatroom');
    chatroomEl.style.display = 'flex';
    
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
            // utils.js가 로드 안 됐을 때 폴백
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
    
    // 거래완료 버튼 분기
    const tradeBtn = document.getElementById('chat-trade-btn');
    if (pData && tradeBtn) {
        if (pData.is_closed) {
            tradeBtn.textContent = '후기 남기기';
            tradeBtn.style.background = '#EAEDF2';
            tradeBtn.style.color = '#7A93B0';
            tradeBtn.onclick = () => openReviewModal(pData.id, pData.user_id === currentUser.id ? pData.highest_bidder_id || roomId : pData.user_id);
        } else {
            if (pData.user_id === currentUser.id || pData.seller_id === currentUser.id) {
                tradeBtn.textContent = '거래완료';
                tradeBtn.style.background = '#f4f9ff';
                tradeBtn.style.color = '#1a5fa0';
                tradeBtn.onclick = () => completeTransaction(pData.id, roomId);
            } else {
                tradeBtn.style.display = 'none';
            }
        }
    }
    
    // 기존 메시지 로드
    const { data: messages, error } = await supabaseClient
        .from('haema_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
        
    msgContainer.innerHTML = '';
    
    if(messages && messages.length > 0) {
        messages.forEach(msg => {
            renderMessage(msg);
        });
    } else {
        msgContainer.innerHTML = '<div id="empty-chat-state" style="text-align:center; padding:20px; color:#999; font-size:12px;">첫 메시지를 보내 대화를 시작해보세요. (엔터 발송 가능)</div>';
    }
    
    scrollChatToBottom();
    
    // 소켓 구독 시작
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
// function escapeHtml(unsafe) { ... }   ← 제거

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
         // ✅ 사용자에게 알림 + 입력값 복구
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

// 실시간 변화 구독 함수
function subscribeToMessages(roomId) {
    if(chatSubscription) {
        supabaseClient.removeChannel(chatSubscription);
    }
    
    // ✅ 채널명을 roomId 기반 고유 이름으로 변경 (방마다 분리)
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
