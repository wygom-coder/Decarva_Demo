// ============================================================================
// utils.js — 공유 유틸리티 함수
// ============================================================================
// ⚠️ 중요: escapeHtml은 이 파일에서만 정의합니다.
// 다른 파일(chat.js, ui.js 등)에서 중복 정의하지 마세요.
// 이 파일은 다른 모든 모듈보다 먼저 로드되어야 합니다.
// HTML 로드 순서 예시:
//   <script src="js/modules/config.js"></script>
//   <script src="js/modules/utils.js"></script>     ← config 다음, 다른 것 전에
//   <script src="js/modules/auth.js"></script>
//   <script src="js/modules/ui.js"></script>
//   ... (나머지)
// ============================================================================

// ✅ XSS 방지 escapeHtml — 단일 정의
// - null / undefined 만 빈 문자열로 처리 (숫자 0, false는 정상 변환)
// - 5종 HTML 엔티티 모두 처리: & < > " '
// - 한 줄 유지로 // 주석 오파싱 방지
function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ✅ 카테고리 → SVG 매핑 — DB에 HTML을 저장하지 않기 위한 클라이언트 측 렌더링
// product.svg 컬럼이 더 이상 HTML 문자열을 담지 않도록 마이그레이션 후 사용.
// 카테고리 이름이 일치하지 않으면 기본 placeholder SVG 반환.
const CATEGORY_FALLBACK_SVG = '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="8" y="20" width="32" height="18" rx="3" stroke="#7A93B0" stroke-width="1.5"/><path d="M14 20v-4a10 10 0 0120 0v4" stroke="#7A93B0" stroke-width="1.5"/></svg>';

function getCategorySvg(categoryName) {
    if (!categoryName || typeof KATEGORY_MAP === 'undefined') return CATEGORY_FALLBACK_SVG;
    // KATEGORY_MAP의 모든 카테고리에서 이름 매칭
    for (const topCat of Object.values(KATEGORY_MAP)) {
        const found = topCat.find(c => c.name === categoryName);
        if (found) return found.svg;
    }
    return CATEGORY_FALLBACK_SVG;
}

// ✅ 상품의 시각적 표현(이미지 또는 SVG) 반환
// - image_url이 있으면 안전한 <img> 태그 (src URL escape)
// - 없으면 카테고리 기반 SVG
function getProductImageHtml(p) {
    if (p && p.image_url) {
        // src 속성에 들어가는 URL은 escapeHtml로 한번 더 막아둠
        const safeUrl = escapeHtml(p.image_url);
        return `<img src="${safeUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" loading="lazy">`;
    }
    return getCategorySvg(p ? p.category : null);
}
