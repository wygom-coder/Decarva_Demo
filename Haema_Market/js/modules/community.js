// ⚠️ escapeHtml은 utils.js에서 정의 (중복 정의 금지)

let lastCommunityPostCreatedAt = null;
let isFetchingCommunityPosts = false;
let hasMoreCommunityPosts = true;
window.communityPosts = [];

window.fetchCommunityPosts = async function(reset = true) {
    if (isFetchingCommunityPosts) return;
    const area = document.getElementById('community-content-area');
    if(!area) return;
    
    if (reset) {
        lastCommunityPostCreatedAt = null;
        hasMoreCommunityPosts = true;
        window.communityPosts = [];
        area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">게시글을 불러오는 중입니다...</div>';
    } else {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'comm-loading-indicator';
        loadingDiv.style = 'padding: 20px; font-size:14px; color:#999; text-align:center;';
        loadingDiv.textContent = '게시글을 불러오는 중입니다...';
        area.appendChild(loadingDiv);
    }
    
    if (!hasMoreCommunityPosts) return;
    isFetchingCommunityPosts = true;

    let query = supabaseClient.from('haema_posts').select('*');
    
    const searchInput = document.getElementById('comm-search-input');
    const keyword = searchInput ? searchInput.value.trim() : '';
    if (keyword) {
        query = query.or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`);
    }
    
    if (window.currentCommTag && window.currentCommTag !== '전체') {
        query = query.eq('tag', window.currentCommTag);
    }
    
    if (lastCommunityPostCreatedAt) {
        query = query.lt('created_at', lastCommunityPostCreatedAt);
    }
    
    const { data: posts, error } = await query.order('created_at', { ascending: false }).limit(20);
    
    isFetchingCommunityPosts = false;
    const indicator = document.getElementById('comm-loading-indicator');
    if(indicator) indicator.remove();

    if(error) {
        if(reset) area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:red; text-align:center;">게시글을 불러오지 못했습니다.</div>';
        return;
    }
    
    if(!posts || posts.length === 0) {
        hasMoreCommunityPosts = false;
        if(reset) {
            area.innerHTML = '<div style="padding: 60px 20px; font-size:14px; color:#999; text-align:center;">조건에 맞는 게시글이 없습니다.</div>';
        }
        return;
    }
    
    lastCommunityPostCreatedAt = posts[posts.length - 1].created_at;
    if(posts.length < 20) hasMoreCommunityPosts = false;
    
    window.communityPosts = [...window.communityPosts, ...posts];
    
    if(reset) area.innerHTML = '';
    renderCommunityPostsAppend(posts);
}

function renderCommunityPostsAppend(posts) {
    const area = document.getElementById('community-content-area');
    if(!area) return;
    
    let html = '';
    posts.forEach(post => {
        const safeId = escapeHtml(post.id);
        const safeTag = escapeHtml(post.tag);
        const safeTagBg = escapeHtml(post.tag_bg);
        const safeTagColor = escapeHtml(post.tag_color);
        const safeTitle = escapeHtml(post.title);
        const safeContent = escapeHtml(post.content);
        const safeAuthorName = escapeHtml(post.author_name);
        const safeAuthorRole = escapeHtml(post.author_role);
        const views = parseInt(post.views) || 0;
        const commentsCount = parseInt(post.comments_count) || 0;

        html += `
            <div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid #eaedf2; box-shadow:0 2px 4px rgba(0,0,0,0.02); cursor:pointer;" onclick="openPostDetail('${safeId}')">
                <div style="display:inline-block; font-size:11px; font-weight:800; background:${safeTagBg}; color:${safeTagColor}; padding:4px 8px; border-radius:6px; margin-bottom:8px;">
                    ${safeTag}
                </div>
                <div style="font-size:15px; font-weight:700; color:#1A2B4A; margin-bottom:6px; line-height:1.4;">
                    ${safeTitle}
                </div>
                <div style="font-size:13px; color:#4A5568; line-height:1.5; margin-bottom:12px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                    ${safeContent}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#7A93B0;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-weight:700; color:#1A2B4A;">${safeAuthorName}</span>
                        <span style="font-size:10px; background:#EAEDF2; padding:2px 6px; border-radius:4px;">${safeAuthorRole}</span>
                        <span>· 방금 전</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="display:flex; align-items:center; gap:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" stroke-width="2"/></svg>${views}</span>
                        <span style="display:flex; align-items:center; gap:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="2"/></svg>${commentsCount}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    area.innerHTML += html;
    
    if(hasMoreCommunityPosts) setupCommInfiniteScroll();
}

let commScrollObserver = null;
function setupCommInfiniteScroll() {
    const area = document.getElementById('community-content-area');
    if(!area) return;
    if(commScrollObserver) commScrollObserver.disconnect();
    
    const target = document.createElement('div');
    target.style.height = '20px';
    area.appendChild(target);
    
    commScrollObserver = new IntersectionObserver((entries) => {
        if(entries[0].isIntersecting) {
            commScrollObserver.disconnect();
            if(target.parentNode) target.remove();
            window.fetchCommunityPosts(false);
        }
    }, { rootMargin: '200px' });
    commScrollObserver.observe(target);
}

// 하위 호환성 유지용 (index.html에서 초기화 시 호출될 수 있음)
window.renderCommunityPosts = function() {
    window.fetchCommunityPosts(true);
}

// ==========================================
// [커뮤니티 글쓰기 & 상세 & 댓글 로직]
// ==========================================

window.openPostWriteModal = function() {
    if(!currentUser) {
        alert("글을 작성하려면 먼저 로그인을 하셔야 합니다.");
        return;
    }
    document.getElementById('post-write-title').value = '';
    document.getElementById('post-write-content').value = '';
    document.getElementById('post-write-modal').style.display = 'flex';
}

window.closePostWriteModal = function() {
    document.getElementById('post-write-modal').style.display = 'none';
}

window.submitPost = async function() {
    if(!currentUser) return;
    const title = document.getElementById('post-write-title').value.trim();
    const content = document.getElementById('post-write-content').value.trim();
    const tag = document.getElementById('post-write-tag').value;
    
    if(!title || !content) {
        alert("제목과 내용을 모두 입력해주세요.");
        return;
    }

    // ✅ 입력 길이 검증 추가
    if (title.length > 200) { alert("제목은 200자 이하로 입력해주세요."); return; }
    if (content.length > 10000) { alert("본문은 10,000자 이하로 입력해주세요."); return; }
    
    let tagBg = '#F4F9FF';
    let tagColor = '#1A5FA0';
    if(tag.includes('수리지식')) { tagBg = '#E8F5E9'; tagColor = '#1E8E3E'; }
    if(tag.includes('구인구직')) { tagBg = '#FFF3E0'; tagColor = '#F57C00'; }

    const btn = document.getElementById('btn-submit-post');
    btn.disabled = true;
    btn.textContent = '등록 중...';

    const newPost = {
        author_id: currentUser.id,
        author_name: currentUser.user_metadata?.nickname || currentUser.user_metadata?.full_name_ko || currentUser.user_metadata?.full_name || '익명선장',
        author_role: currentUser.user_metadata?.role || '일반 회원',
        tag: tag,
        tag_bg: tagBg,
        tag_color: tagColor,
        title: title,
        content: content,
        views: 0,
        comments_count: 0
    };

    const { error } = await supabaseClient.from('haema_posts').insert([newPost]);
    
    btn.disabled = false;
    btn.textContent = '등록';

    if(error) {
        alert("글 등록 중 오류가 발생했습니다: " + error.message);
        return;
    }

    closePostWriteModal();
    renderCommunityPosts();
}

let currentPostId = null;

window.openPostDetail = async function(postId) {
    currentPostId = postId;
    document.getElementById('post-detail-modal').style.display = 'flex';
    const body = document.getElementById('post-detail-body');
    body.innerHTML = '<div style="text-align:center; padding: 40px; color:#999;">불러오는 중...</div>';
    
    // ✅ .single() → .maybeSingle() (없을 때 에러 방지)
    const { data: postData, error: postErr } = await supabaseClient
        .from('haema_posts').select('*').eq('id', postId).maybeSingle();

    if(postErr) {
        console.error('게시글 조회 에러:', postErr);
    }

    if(postData) {
        // ⚠️ views 카운트 — 클라이언트 +1 방식은 race condition + 임의 조작 가능.
        //     2차 작업에서 PostgreSQL rpc()로 atomic increment로 전환 예정.
        //     임시로 그대로 두되, 실패해도 UI는 진행.
        try {
            await supabaseClient.from('haema_posts')
                .update({ views: (postData.views || 0) + 1 })
                .eq('id', postId);
            postData.views = (postData.views || 0) + 1;
        } catch (e) {
            console.warn('조회수 업데이트 실패:', e);
        }
    } else {
        body.innerHTML = '<div style="text-align:center; padding: 40px; color:red;">삭제되었거나 없는 게시글입니다.</div>';
        return;
    }

    const { data: comments } = await supabaseClient
        .from('haema_post_comments').select('*')
        .eq('post_id', postId).order('created_at', { ascending: true });

    // ✅ 모든 사용자 입력 필드 escape
    const safeTag = escapeHtml(postData.tag);
    const safeTagBg = escapeHtml(postData.tag_bg);
    const safeTagColor = escapeHtml(postData.tag_color);
    const safeTitle = escapeHtml(postData.title);
    const safeAuthorName = escapeHtml(postData.author_name);
    const safeAuthorRole = escapeHtml(postData.author_role);
    const safePostContent = escapeHtml(postData.content);
    const safeViews = escapeHtml(postData.views);
    const commentsCount = comments ? comments.length : 0;
    
    let html = `
        <div style="margin-bottom:20px;">
            <div style="display:inline-block; font-size:12px; font-weight:800; background:${safeTagBg}; color:${safeTagColor}; padding:4px 8px; border-radius:6px; margin-bottom:12px;">
                ${safeTag}
            </div>
            <h2 style="margin:0 0 12px 0; font-size:20px; color:#1A2B4A; line-height:1.4;">${safeTitle}</h2>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:20px; border-bottom:1px solid #eaedf2; padding-bottom:16px;">
                <div style="width:36px; height:36px; border-radius:50%; background:#f4f9ff; display:flex; align-items:center; justify-content:center; font-size:18px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
                <div>
                    <div style="font-size:14px; font-weight:700; color:#1A2B4A;">${safeAuthorName}</div>
                    <div style="font-size:12px; color:#7A93B0;">${safeAuthorRole} · 방금 전 · 조회 ${safeViews}</div>
                </div>
            </div>
            <div style="font-size:15px; color:#1A2B4A; line-height:1.6; white-space:pre-wrap;">${safePostContent}</div>
        </div>
        
        <div style="margin-top:32px;">
            <h4 style="margin:0 0 16px 0; font-size:15px; color:#1A2B4A;">댓글 <span style="color:#1A5FA0;">${commentsCount}</span></h4>
            <div id="comments-list" style="display:flex; flex-direction:column; gap:16px;">
    `;
    
    if(comments && comments.length > 0) {
        comments.forEach(c => {
            // ✅ 댓글 모든 필드 escape (가장 흔한 XSS 통로)
            const safeCAuthor = escapeHtml(c.author_name);
            const safeCRole = escapeHtml(c.author_role);
            const safeCContent = escapeHtml(c.content);
            html += `
                <div style="display:flex; gap:12px;">
                    <div style="width:28px; height:28px; border-radius:50%; background:#eaedf2; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:14px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
                    <div>
                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                            <span style="font-size:13px; font-weight:700; color:#1A2B4A;">${safeCAuthor}</span>
                            <span style="font-size:11px; background:#f4f9ff; color:#7A93B0; padding:2px 6px; border-radius:4px;">${safeCRole}</span>
                        </div>
                        <div style="font-size:14px; color:#4A5568; line-height:1.4;">${safeCContent}</div>
                    </div>
                </div>
            `;
        });
    } else {
        html += `<div style="text-align:center; color:#999; font-size:13px; padding:20px 0;">가장 먼저 댓글을 남겨보세요!</div>`;
    }

    html += `</div></div>`;
    body.innerHTML = html;
}

window.closePostDetail = function() {
    document.getElementById('post-detail-modal').style.display = 'none';
    currentPostId = null;
}

window.submitComment = async function() {
    if(!currentUser) {
        alert("댓글을 작성하려면 먼저 로그인을 하셔야 합니다.");
        return;
    }
    if(!currentPostId) return;

    const input = document.getElementById('post-comment-input');
    const content = input.value.trim();
    if(!content) return;

    // ✅ 댓글 길이 검증
    if (content.length > 2000) { alert("댓글은 2,000자 이하로 입력해주세요."); return; }

    // ✅ input.value를 '등록 중...'으로 덮지 않음 — 사용자 작성 내용 보존
    //    대신 disabled만 처리하고, 별도 로딩 표시
    const originalPlaceholder = input.placeholder;
    input.disabled = true;
    input.placeholder = '등록 중...';

    const newComment = {
        post_id: currentPostId,
        author_id: currentUser.id,
        author_name: currentUser.user_metadata?.nickname || currentUser.user_metadata?.full_name_ko || currentUser.user_metadata?.full_name || '익명선장',
        author_role: currentUser.user_metadata?.role || '일반 회원',
        content: content
    };

    const { error } = await supabaseClient.from('haema_post_comments').insert([newComment]);
    
    if(error) {
        alert("댓글 등록 실패: " + error.message);
        input.disabled = false;
        input.placeholder = originalPlaceholder;
        return;
    }

    // ⚠️ comments_count 카운트 — 2차에서 RPC로 전환 예정
    const { data: pData } = await supabaseClient
        .from('haema_posts').select('comments_count')
        .eq('id', currentPostId).maybeSingle();
    if(pData) {
        await supabaseClient.from('haema_posts')
            .update({ comments_count: (pData.comments_count || 0) + 1 })
            .eq('id', currentPostId);
    }

    // ✅ 성공 시에만 input.value를 비움
    input.value = '';
    input.disabled = false;
    input.placeholder = originalPlaceholder;
    
    openPostDetail(currentPostId);
    renderCommunityPosts();
}

// Community Sub-tag filter logic
window.currentCommTag = '전체';
window.setCommTag = function(tagName, el) {
    window.currentCommTag = tagName;
    
    const tags = document.querySelectorAll('.comm-tag');
    tags.forEach(t => {
        t.style.background = '#f4f9ff';
        t.style.color = '#7A93B0';
        t.style.border = '1px solid #eaedf2';
    });
    if (el) {
        el.style.background = '#1A2B4A';
        el.style.color = '#fff';
        el.style.border = 'none';
    }
    
    if (typeof renderCommunityPosts === 'function') {
        renderCommunityPosts();
    }
}
