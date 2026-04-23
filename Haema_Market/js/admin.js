// ============================================================================
// admin.js — 어드민 백오피스 메인 스크립트
// ============================================================================
// 의존성:
//   - config.js (supabaseClient 인스턴스 공유)
//   - admin.html (DOM 구조)
//
// ⚠️ 보안 주의:
//   - 이 파일의 admin role 검증은 UI 차단용일 뿐, 진짜 보안은 RLS 정책으로 막아야 함
//   - DELETE 권한 통제는 Phase 3 보안 고도화 때 별도 RLS로 처리 예정
//   - admin role은 Supabase 대시보드에서 app_metadata.role = 'admin'으로 수동 부여
// ============================================================================

(function() {

    // ── 0. escapeHtml (admin.html은 utils.js를 로드하지 않으므로 자체 정의) ────
    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function fmtDate(iso) {
        if (!iso) return '-';
        try {
            const d = new Date(iso);
            return d.toLocaleString('ko-KR', { hour12: false });
        } catch (e) {
            return iso;
        }
    }

    // ── 1. 진입 시 admin 검증 (UI 차단용) ─────────────────────────────────────
    async function bootstrap() {
        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();

            if (error || !user) {
                alert('로그인이 필요한 페이지입니다.');
                window.location.href = 'index.html';
                return;
            }

            const role = user.app_metadata && user.app_metadata.role;
            if (role !== 'admin') {
                alert('어드민 권한이 없습니다. 메인 페이지로 이동합니다.');
                window.location.href = 'index.html';
                return;
            }

            // 사용자 정보 표시
            const userInfoEl = document.getElementById('admin-user-info');
            if (userInfoEl) {
                userInfoEl.innerHTML =
                    '<div class="admin-user-name">' + escapeHtml(user.email || 'admin') + '</div>' +
                    '<div class="admin-user-role">관리자</div>';
            }

            // 검증 통과 → 초기 데이터 로드
            initEvents();
            await loadDashboard();
        } catch (err) {
            console.error('admin bootstrap error:', err);
            alert('어드민 초기화 중 오류가 발생했습니다: ' + (err.message || err));
            window.location.href = 'index.html';
        }
    }

    // ── 2. 사이드바 메뉴 + 버튼 이벤트 ────────────────────────────────────────
    function initEvents() {
        // 메뉴 클릭 → 뷰 전환
        document.querySelectorAll('.admin-nav-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                const view = btn.getAttribute('data-view');
                switchView(view);
                if (view === 'dashboard') await loadDashboard();
                if (view === 'products') await loadProducts();
                if (view === 'community') await loadPosts();
                if (view === 'deletions') await loadDeletions();
            });
        });

        // 새로고침 버튼들
        const refreshProducts = document.getElementById('btn-refresh-products');
        if (refreshProducts) refreshProducts.addEventListener('click', loadProducts);

        const refreshPosts = document.getElementById('btn-refresh-posts');
        if (refreshPosts) refreshPosts.addEventListener('click', loadPosts);

        const refreshDeletions = document.getElementById('btn-refresh-deletions');
        if (refreshDeletions) refreshDeletions.addEventListener('click', loadDeletions);

        // 로그아웃
        const logoutBtn = document.getElementById('admin-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (!confirm('로그아웃 하시겠습니까?')) return;
                await supabaseClient.auth.signOut();
                window.location.href = 'index.html';
            });
        }
    }

    function switchView(view) {
        document.querySelectorAll('.admin-nav-item').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-view') === view);
        });
        document.querySelectorAll('.admin-view').forEach(s => {
            s.classList.toggle('active', s.id === 'view-' + view);
        });
    }

    // ── 3. 대시보드 통계 로드 ──────────────────────────────────────────────────
    async function loadDashboard() {
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        try {
            // [보안/최적화] 어드민 통계 조회를 단 한 번의 RPC 호출로 처리
            // 이 함수는 서버 측에서 JWT 롤(admin)을 검증하므로, 안전하고 빠릅니다.
            const { data: stats, error } = await supabaseClient.rpc('get_admin_dashboard_stats');
            
            if (error) throw error;
            
            if (stats) {
                setText('stat-today-users', (stats.today_new_users || 0).toLocaleString() + '명');
                setText('stat-today-products', (stats.today_new_products || 0).toLocaleString() + '건');
                setText('stat-active-chats', (stats.active_chats || 0).toLocaleString() + '개');
                setText('stat-unread-chats', (stats.unread_24h_chats || 0).toLocaleString() + '개');
                setText('stat-completed-deals', (stats.completed_deals || 0).toLocaleString() + '건');
                setText('stat-anomaly-count', (stats.anomaly_count || 0).toLocaleString() + '건');
                
                // 사이드바 뱃지 업데이트 (이상 징후에 탈퇴 대기 건수가 포함되므로 뱃지에도 활용)
                const badge = document.getElementById('deletion-badge');
                if (badge) {
                    if (stats.anomaly_count > 0) {
                        badge.style.display = 'inline-flex';
                        badge.textContent = stats.anomaly_count > 99 ? '99+' : String(stats.anomaly_count);
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }
        } catch (e) {
            console.error('admin dashboard stats error:', e);
            setText('stat-today-users', '?');
            setText('stat-today-products', '?');
            setText('stat-active-chats', '?');
            setText('stat-unread-chats', '?');
            setText('stat-completed-deals', '?');
            setText('stat-anomaly-count', '?');
        }
    }

    // ── 4. 매물 관리 ───────────────────────────────────────────────────────────
    async function loadProducts() {
        const tbody = document.getElementById('products-tbody');
        const meta = document.getElementById('products-meta');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="8" class="admin-empty">불러오는 중...</td></tr>';

        try {
            const { data, error } = await supabaseClient
                .from('haema_products')
                .select('id, title, category, price, tradeType, region, created_at, auction')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="admin-empty">등록된 매물이 없습니다.</td></tr>';
                if (meta) meta.textContent = '0건';
                return;
            }

            tbody.innerHTML = data.map(p => {
                const tradeLabel = p.auction ? '경매' : (p.tradeType || '-');
                return '<tr>' +
                    '<td>' + escapeHtml(String(p.id).slice(0, 8)) + '</td>' +
                    '<td class="admin-cell-strong">' + escapeHtml(p.title) + '</td>' +
                    '<td>' + escapeHtml(p.category) + '</td>' +
                    '<td>' + escapeHtml(p.price) + '</td>' +
                    '<td>' + escapeHtml(tradeLabel) + '</td>' +
                    '<td>' + escapeHtml(p.region) + '</td>' +
                    '<td class="admin-cell-muted">' + fmtDate(p.created_at) + '</td>' +
                    '<td><button class="admin-btn admin-btn-danger admin-btn-sm" data-product-id="' + escapeHtml(p.id) + '">삭제</button></td>' +
                '</tr>';
            }).join('');

            if (meta) meta.textContent = data.length + '건 표시 중 (최신순)';

            // 삭제 버튼 바인딩
            tbody.querySelectorAll('button[data-product-id]').forEach(btn => {
                btn.addEventListener('click', () => deleteProduct(btn.getAttribute('data-product-id'), btn));
            });
        } catch (err) {
            console.error('loadProducts error:', err);
            tbody.innerHTML = '<tr><td colspan="8" class="admin-empty admin-empty-error">불러오기 실패: ' + escapeHtml(err.message || '') + '</td></tr>';
        }
    }

    async function deleteProduct(id, btn) {
        if (!id) return;
        if (!confirm('이 매물을 정말 삭제하시겠습니까?\n(되돌릴 수 없습니다)')) return;

        if (btn) { btn.disabled = true; btn.textContent = '삭제 중...'; }

        try {
            const { error } = await supabaseClient
                .from('haema_products')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('삭제 완료');
            await loadProducts();
            await loadDashboard();
        } catch (err) {
            console.error('deleteProduct error:', err);
            alert('삭제 실패: ' + (err.message || err));
            if (btn) { btn.disabled = false; btn.textContent = '삭제'; }
        }
    }

    // ── 5. 커뮤니티 관리 ───────────────────────────────────────────────────────
    async function loadPosts() {
        const tbody = document.getElementById('posts-tbody');
        const meta = document.getElementById('posts-meta');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="8" class="admin-empty">불러오는 중...</td></tr>';

        try {
            const { data, error } = await supabaseClient
                .from('haema_posts')
                .select('id, tag, title, author_name, author_role, views, comments_count, created_at')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="admin-empty">등록된 게시글이 없습니다.</td></tr>';
                if (meta) meta.textContent = '0건';
                return;
            }

            tbody.innerHTML = data.map(p => {
                const author = (p.author_name || '-') + ' (' + (p.author_role || '-') + ')';
                return '<tr>' +
                    '<td>' + escapeHtml(String(p.id).slice(0, 8)) + '</td>' +
                    '<td>' + escapeHtml(p.tag) + '</td>' +
                    '<td class="admin-cell-strong">' + escapeHtml(p.title) + '</td>' +
                    '<td>' + escapeHtml(author) + '</td>' +
                    '<td>' + escapeHtml(p.views || 0) + '</td>' +
                    '<td>' + escapeHtml(p.comments_count || 0) + '</td>' +
                    '<td class="admin-cell-muted">' + fmtDate(p.created_at) + '</td>' +
                    '<td><button class="admin-btn admin-btn-danger admin-btn-sm" data-post-id="' + escapeHtml(p.id) + '">삭제</button></td>' +
                '</tr>';
            }).join('');

            if (meta) meta.textContent = data.length + '건 표시 중 (최신순)';

            tbody.querySelectorAll('button[data-post-id]').forEach(btn => {
                btn.addEventListener('click', () => deletePost(btn.getAttribute('data-post-id'), btn));
            });
        } catch (err) {
            console.error('loadPosts error:', err);
            tbody.innerHTML = '<tr><td colspan="8" class="admin-empty admin-empty-error">불러오기 실패: ' + escapeHtml(err.message || '') + '</td></tr>';
        }
    }

    async function deletePost(id, btn) {
        if (!id) return;
        if (!confirm('이 게시글을 정말 삭제하시겠습니까?\n(연결된 댓글까지 함께 삭제됩니다)')) return;

        if (btn) { btn.disabled = true; btn.textContent = '삭제 중...'; }

        try {
            // 댓글 먼저 정리 (FK CASCADE 설정 안 됐을 수 있음)
            await supabaseClient.from('haema_post_comments').delete().eq('post_id', id);

            const { error } = await supabaseClient
                .from('haema_posts')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('삭제 완료');
            await loadPosts();
            await loadDashboard();
        } catch (err) {
            console.error('deletePost error:', err);
            alert('삭제 실패: ' + (err.message || err));
            if (btn) { btn.disabled = false; btn.textContent = '삭제'; }
        }
    }

    // ── 6. 탈퇴 요청 관리 ──────────────────────────────────────────────────────
    async function loadDeletions() {
        const tbody = document.getElementById('deletions-tbody');
        const meta = document.getElementById('deletions-meta');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" class="admin-empty">불러오는 중...</td></tr>';

        try {
            const { data, error } = await supabaseClient
                .from('haema_account_deletion_requests')
                .select('*')
                .order('requested_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="admin-empty">탈퇴 요청이 없습니다.</td></tr>';
                if (meta) meta.textContent = '0건';
                return;
            }

            tbody.innerHTML = data.map(d => {
                const statusBadge = d.status === 'pending'
                    ? '<span class="admin-badge admin-badge-warn">대기</span>'
                    : '<span class="admin-badge admin-badge-ok">완료</span>';

                const actionBtn = d.status === 'pending'
                    ? '<button class="admin-btn admin-btn-primary admin-btn-sm" data-deletion-id="' + escapeHtml(d.id) + '">완료 처리</button>'
                    : '<span class="admin-cell-muted">-</span>';

                return '<tr>' +
                    '<td>' + escapeHtml(d.id) + '</td>' +
                    '<td class="admin-cell-strong">' + escapeHtml(d.user_email) + '</td>' +
                    '<td>' + escapeHtml(d.user_full_name) + '</td>' +
                    '<td>' + escapeHtml(d.reason || '(미입력)') + '</td>' +
                    '<td>' + statusBadge + '</td>' +
                    '<td class="admin-cell-muted">' + fmtDate(d.requested_at) + '</td>' +
                    '<td>' + actionBtn + '</td>' +
                '</tr>';
            }).join('');

            if (meta) meta.textContent = data.length + '건 표시 중 (최신순)';

            tbody.querySelectorAll('button[data-deletion-id]').forEach(btn => {
                btn.addEventListener('click', () => markDeletionDone(btn.getAttribute('data-deletion-id'), btn));
            });
        } catch (err) {
            console.error('loadDeletions error:', err);
            tbody.innerHTML = '<tr><td colspan="7" class="admin-empty admin-empty-error">불러오기 실패: ' + escapeHtml(err.message || '') + '</td></tr>';
        }
    }

    async function markDeletionDone(id, btn) {
        if (!id) return;
        if (!confirm('이 탈퇴 요청을 [완료]로 표시하시겠습니까?\n\n⚠️ 실제 계정 삭제는 Supabase 대시보드에서 별도로 진행되어야 합니다.\n이 버튼은 단지 "처리 완료" 상태로만 변경합니다.')) return;

        if (btn) { btn.disabled = true; btn.textContent = '처리 중...'; }

        try {
            const { data: { user } } = await supabaseClient.auth.getUser();

            const { error } = await supabaseClient
                .from('haema_account_deletion_requests')
                .update({
                    status: 'done',
                    processed_at: new Date().toISOString(),
                    processed_by: user ? user.id : null
                })
                .eq('id', id);

            if (error) throw error;

            alert('완료 처리되었습니다.');
            await loadDeletions();
            await loadDashboard();
        } catch (err) {
            console.error('markDeletionDone error:', err);
            alert('처리 실패: ' + (err.message || err));
            if (btn) { btn.disabled = false; btn.textContent = '완료 처리'; }
        }
    }

    // ── 7. 부팅 ───────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})();
