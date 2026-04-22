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

// ✅ [H2] PostgREST 검색 인젝션 방어기
// 검색어에 들어간 쉼표(,)나 특수문자가 .or() 필터 구분자로 해석되는 것을 방지합니다.
function sanitizeSearchKeyword(raw) {
    if (!raw) return '';
    return String(raw).replace(/[,\*%(){}\[\]'"\\]/g, '').trim().slice(0, 100);
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

// ✅ 클라이언트 사이드 이미지 압축 모듈 (WebP 변환)
// 사용자가 10MB 원본 파일을 올려도 브라우저에서 1080px WebP로 초경량 압축 후 Blob 반환
async function resizeAndCompressImage(file, { maxWidth = 1080, quality = 0.85 } = {}) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('이미지 파일이 아닙니다.'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 비율 유지하며 가로 최대 크기 리사이징
                if (width > maxWidth) {
                    const ratio = maxWidth / width;
                    width = maxWidth;
                    height = height * ratio;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // WebP 지원 확인 후 압축, 미지원 시 JPEG 폴백
                // 1080px 기준 85% 품질일 경우 약 100~300KB 사이로 매우 쾌적해짐
                let mimeType = 'image/webp';
                // Safari 구형 지원 고려
                const testWebP = canvas.toDataURL('image/webp');
                if (!testWebP.startsWith('data:image/webp')) {
                    mimeType = 'image/jpeg';
                }

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve({ blob, mimeType, base64: canvas.toDataURL(mimeType, quality) });
                    } else {
                        reject(new Error('Canvas Blob 생성 실패'));
                    }
                }, mimeType, quality);
            };
            img.onerror = () => reject(new Error('이미지 로딩 실패'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('파일 읽기 오류'));
        reader.readAsDataURL(file);
    });
}

// ✅ UI 토스트 메시지 유틸리티
window.showToast = function(message, ms = 2000) {
    let t = document.getElementById('haema-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'haema-toast';
        t.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:#1A2B4A;color:#fff;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90vw;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
        document.body.appendChild(t);
    }
    t.textContent = message;
    t.style.opacity = '1';
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.style.opacity = '0'; }, ms);
};
