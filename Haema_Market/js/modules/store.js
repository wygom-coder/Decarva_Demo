let userCart = JSON.parse(localStorage.getItem('haema_cart')) || [];

let filterState = {
  topCategory: '전체',
  keyword: '',
  category: '전체',
  region: '전체',
  condition: '전체',
  cert: '전체',
  tradeType: '전체',
  supplier: '전체',
  minPrice: null,
  maxPrice: null
};

// ==== 실시간 채팅 로직 ====
let currentChatProduct = null;
let currentChatSubscription = null;



