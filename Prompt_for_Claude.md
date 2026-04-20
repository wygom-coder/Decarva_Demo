# 해마 마켓 Phase 2 개발 가이드 (For Claude)

당신은 해마 마켓(Haema Market)의 메인 코더입니다. 이번 미션은 **Phase 2: 어드민 백오피스 구축 및 회원탈퇴 UI/UX 적용**입니다. 
제공된 가이드라인과 요구사항을 바탕으로 `admin.html`, `admin.js`, 그리고 하단 탭과 세팅 화면이 있는 `index.html`, 탈퇴 동작을 처리할 `mypage.js` 관련 코드를 작성해 주세요. 

---

## 🎯 미션 1: 어드민 대시보드 신규 뷰 구축 (`admin.html`, `admin.js`, `admin.css`)
플랫폼 운영자가 전체 등록된 매물과 커뮤니티 게시글을 모니터링하고 강제 삭제할 수 있는 백오피스를 만듭니다. (사용자 목록(Auth)은 Supabase 클라이언트 보안 상 직접 호출이 불가능하므로 매물 및 게시글 관리에 집중합니다.)

*   **요구사항 1 (`admin.html`):** 일반 유저 화면(`index.html`)과 완전히 분리된 별도의 HTML 파일을 생성하세요. CDN 형태로 Supabase JS v2, Tailwind CSS(혹은 바닐라)를 로드하고 좌측 사이드바(메뉴: 대시보드 요약, 매물 관리, 커뮤니티 관리) 형식의 데스크톱 최적화 뷰를 만드세요.
*   **요구사항 2 (`admin.js`):** 
    *   페이지 진입 시 `supabaseClient.auth.getUser()`로 유저를 검사하되, `user.app_metadata.role === 'admin'`이 아닌 일반 유저는 접근을 튕겨내고(window.location.href = 'index.html') 경고창을 띄우는 보안 로직을 필수 포함하세요.
    *   **매물 관리 탭:** `haema_products` 테이블의 모든 데이터를 불러와 엑셀 표(테이블) 형태로 렌더링하고, 우측에 [삭제] 버튼을 배치하여 누르면 `supabase.from('haema_products').delete()`가 실행되도록 하세요.
    *   **데이터 통계 요약:** 최상단에 오늘 등록된 매물 수, 총 매물 수의 카드 위젯을 표시하세요.

## 🎯 미션 2: 회원탈퇴 버튼 및 로직 (`index.html`, `mypage.js`)
*   **요구사항 1 (`index.html`):** 마이페이지의 "설정 > 계정 파트" 쪽에 빨간색으로 "회원탈퇴" 텍스트 버튼(혹은 링크)을 추가해 주세요. (위치는 `index.html`의 420번 줄 주변 `<div class="setting-item">` 구조를 활용하세요)
*   **요구사항 2 (`mypage.js`):** 
    *   `window.deleteAccount = async function()` 함수를 만드세요. 
    *   탈퇴 버튼 클릭 시 `confirm("정말 탈퇴하시겠습니까? (삭제된 데이터는 복구할 수 없습니다)")` 경고를 띄웁니다.
    *   Supabase의 클라이언트 SDK 단방향 구조상 유저 본인이 스스로를 지우려면 Edge Function이 필요하므로, 여기서는 MVP 임시 방편으로 `alert("회원탈퇴 요청이 접수되었습니다. 보안을 위해 관리자 승인 후 24시간 내 완전 삭제됩니다."); supabaseClient.auth.signOut(); window.location.href='index.html';` 수준의 프론트엔드 모의(Mock) 처리를 작성해 주세요. 

---

## 💻 응답 포맷 (출력 가이드정)
*   **파일 1 `admin.html`:** HTML 전체 코드 블록
*   **파일 2 `admin.js`:** 자바스크립트 전체 코드 (Supabase 연결 `config.js`를 import 하거나 스크립트로 로드하는 형식 채택 요망)
*   **파일 3 `index.html`:** 회원탈퇴 UI가 추가된 마이페이지 부분만을 `str_replace` 방식으로 (찾기: ... -> 바꾸기: ...) 출력할 것.
*   **파일 4 `mypage.js`:** `deleteAccount` 콜백 함수 전체 코드 블록 출력.

자, 복사 시 호환성 문제가 없도록 깔끔하고 주석이 잘 가미된 코드를 작성해 주십시오.
