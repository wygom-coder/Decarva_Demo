/**
 * dummy_products.js
 * 해마 마켓 — 더미 상품 데이터 전용 모듈
 *
 * [분리 이유]
 *  - market_supabase_v3.js 내부에 p1~p4 더미 객체가 하드코딩되어 있어
 *    실 DB 데이터와 혼재 → startsWith('p') 문자열 패턴으로 구분하는 취약한 구조
 *  - 이 파일로 분리하면:
 *    1) 더미 추가/수정/삭제가 이 파일 한 곳에서만 이루어짐
 *    2) 실 DB 로직에서 더미 여부를 isDummyProduct() 함수로 명확하게 판단
 *    3) 추후 더미 완전 제거 시 이 파일 삭제 + 호출부 3곳만 정리하면 됨
 *
 * [사용법]
 *  haema_market_v4.html에서 market_supabase_v3.js보다 먼저 로드:
 *    <script src="js/dummy_products.js"></script>
 *    <script src="js/market_supabase_v3.js"></script>
 */

(function(global) {
  'use strict';

  // ─────────────────────────────────────────────
  // 1. 더미 상품 원본 데이터
  //    (기존 market_supabase_v3.js L1910~1913 에서 이동)
  //    실 DB INSERT가 완료된 상품은 여기서 제거하세요.
  // ─────────────────────────────────────────────
  const DUMMY_PRODUCTS = {
    p1: {
      id: 'p1',
      title: '대형 선박용 고출력 디젤 엔진 (상태 A급)',
      price: '가격 상담',
      location: '부산 감천항',
      seller_name: '엔진마스터',
      seller_id: 'dummy_user',
      user_id: 'dummy_user',
      type: 'standard',
      tradeType: 'standard',
      condition: '최상',
      category: '기부속',
      topCategory: '기부속',
      images: [],
      content: '22년 전비 완료된 완벽한 상태의 엔진입니다.',
      created_at: '2025-01-01T00:00:00Z',
      is_closed: false,
      _isDummy: true,
    },
    p2: {
      id: 'p2',
      title: '특수 합금 청동 프로펠러 세트',
      price: '52,000,000',
      location: '인천 아라뱃길',
      seller_name: '전체부속',
      seller_id: 'dummy_user',
      user_id: 'dummy_user',
      type: 'standard',
      tradeType: 'standard',
      condition: '미사용',
      category: '기부속',
      topCategory: '기부속',
      images: [],
      content: '미사용 정품 특수 합금 프로펠러입니다.',
      created_at: '2025-01-02T00:00:00Z',
      is_closed: false,
      _isDummy: true,
    },
    p3: {
      id: 'p3',
      title: '항해용 레이더 시스템 일체',
      price: '18,500,000',
      location: '여수 돌산항',
      seller_name: '항법전문',
      seller_id: 'dummy_user',
      user_id: 'dummy_user',
      type: 'standard',
      tradeType: 'standard',
      condition: '양호',
      category: '선용품',
      topCategory: '선용품',
      images: [],
      content: '정상 작동하는 항해용 레이더 일체 판매합니다.',
      created_at: '2025-01-03T00:00:00Z',
      is_closed: false,
      _isDummy: true,
    },
    p4: {
      id: 'p4',
      title: '선박용 평형수 처리 장치(BWTS)',
      price: '28,000,000',
      location: '목포 신항',
      seller_name: '아쿠아환경',
      seller_id: 'dummy_user',
      user_id: 'dummy_user',
      type: 'standard',
      tradeType: 'standard',
      condition: '최상',
      category: '안전장비',
      topCategory: '안전장비',
      images: [],
      content: '설치 및 A/S 지원 가능한 평형수 처리 장치입니다.',
      created_at: '2025-01-04T00:00:00Z',
      is_closed: false,
      _isDummy: true,
    },
  };

  // ─────────────────────────────────────────────
  // 2. 공개 API
  // ─────────────────────────────────────────────

  /**
   * 주어진 productId가 더미 상품인지 판단합니다.
   * 기존 startsWith('p') 패턴을 대체합니다.
   *
   * @param {string|number} productId
   * @returns {boolean}
   */
  function isDummyProduct(productId) {
    if (productId == null) return false;
    return Object.prototype.hasOwnProperty.call(DUMMY_PRODUCTS, String(productId));
  }

  /**
   * 더미 상품 객체를 반환합니다.
   * 없으면 null을 반환합니다.
   *
   * @param {string} productId
   * @returns {object|null}
   */
  function getDummyProduct(productId) {
    return DUMMY_PRODUCTS[String(productId)] || null;
  }

  /**
   * 모든 더미 상품을 배열로 반환합니다.
   * fetchProducts() 이후 실 DB 배열과 병합할 때 사용합니다.
   *
   * @returns {object[]}
   */
  function getAllDummyProducts() {
    return Object.values(DUMMY_PRODUCTS);
  }

  // ─────────────────────────────────────────────
  // 3. 전역 노출 (market_supabase_v3.js에서 호출)
  // ─────────────────────────────────────────────
  global.isDummyProduct    = isDummyProduct;
  global.getDummyProduct   = getDummyProduct;
  global.getAllDummyProducts = getAllDummyProducts;

})(window);
