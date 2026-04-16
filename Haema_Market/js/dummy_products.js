/**
 * dummy_products.js
 * 해마 마켓 — 더미 상품 데이터 전용 모듈
 *
 * [분리 이유]
 *  - market_supabase_v3.js 내부에 p1~p4 더미 객체가 하드코딩되어 있어
 *    실 DB 데이터와 혼재 → startsWith('p') 문자열 패턴으로 구분하는 취약한 구조
 *  - 이 파일로 분리하면:
 *    1) 더미 추가/수정/삭제가 이 파일 한 곳에서만 이루어짐
 *    2) 실 DB 로직에서 isDummyProduct() 함수로 명확하게 판단
 *    3) 추후 더미 완전 제거 시 이 파일 삭제 + 호출부 3곳만 정리하면 됨
 */

(function(global) {
  'use strict';

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
      title: 'X-Band 레이더 시스템 세트',
      price: '18,500,000',
      location: '인천 연수구',
      seller_name: '통신전문기업',
      seller_id: 'dummy_user',
      user_id: 'dummy_user',
      type: 'auction',
      tradeType: 'auction',
      condition: '양호',
      category: '선용품',
      topCategory: '선용품',
      images: [],
      content: '모니터 포함된 레이더 시스템입니다.',
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

  function isDummyProduct(productId) {
    if (productId == null) return false;
    return Object.prototype.hasOwnProperty.call(DUMMY_PRODUCTS, String(productId));
  }

  function getDummyProduct(productId) {
    return DUMMY_PRODUCTS[String(productId)] || null;
  }

  function getAllDummyProducts() {
    return Object.values(DUMMY_PRODUCTS);
  }

  global.isDummyProduct     = isDummyProduct;
  global.getDummyProduct    = getDummyProduct;
  global.getAllDummyProducts = getAllDummyProducts;

})(window);
