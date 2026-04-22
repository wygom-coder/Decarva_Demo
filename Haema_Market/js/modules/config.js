// ==== Supabase 연동 & 상태 관리 데이터 ====
const SUPABASE_URL = 'https://conlrhslgepktvajvgvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n2kbcfymcwb4Nna5hN7wsA_TRKixOG5';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let auctionInterval = null;
let uploadedBase64 = null;
let uploadedBlob = null;
const KATEGORY_MAP = {
  '전체': [
    { name: '엔진·동력', icon: 'settings', bg: '#DAEEFF', color: '#1A5FA0' },
    { name: '펌프·배관', icon: 'droplets', bg: '#FFF3C0', color: '#D4960A' },
    { name: '로프·와이어', icon: 'link', bg: '#DAEEFF', color: '#1A5FA0' },
    { name: '작업복·안전화', icon: 'shirt', bg: '#DAEEFF', color: '#1A5FA0' },
    { name: '구명설비', icon: 'life-buoy', bg: '#E6F4EA', color: '#1E8E3E' },
    { name: '소방설비', icon: 'flame', bg: '#FFEBEE', color: '#D32F2F' },
    { name: '쌀·곡물', icon: 'leaf', bg: '#E6F4EA', color: '#1E8E3E' },
    { name: '수산물', icon: 'fish', bg: '#DAEEFF', color: '#1A5FA0' }
  ],
  '기부속': [
    { name: '엔진·동력', icon: 'settings', bg: '#DAEEFF', color: '#1A5FA0' },
    { name: '항법장비', icon: 'compass', bg: '#FFF3C0', color: '#D4960A' },
    { name: '갑판장비', icon: 'anchor', bg: '#DAEEFF', color: '#1A5FA0' },
    { name: '통신장비', icon: 'radio', bg: '#FFF3C0', color: '#D4960A' },
    { name: '펌프·배관', icon: 'droplets', bg: '#FFF3C0', color: '#D4960A' },
    { name: '전기·계측', icon: 'zap', bg: '#DAEEFF', color: '#1A5FA0' },
    { name: '기타부품', icon: 'package-open', bg: '#FFF3C0', color: '#D4960A' }
  ],
  '선용품': [
    { name: '로프·와이어', icon: 'link', bg: '#DAEEFF', color: '#1A5FA0' },
    { name: '페인트·화공품', icon: 'paint-bucket', bg: '#FFF3C0', color: '#D4960A' },
    { name: '작업복·안전화', icon: 'shirt', bg: '#DAEEFF', color: '#1A5FA0' },
    { name: '청소·소모품', icon: 'spray-can', bg: '#FFF3C0', color: '#D4960A' },
    { name: '공구·기기', icon: 'wrench', bg: '#DAEEFF', color: '#1A5FA0' },
    { name: '기타', icon: 'package', bg: '#FFF3C0', color: '#D4960A' }
  ],
  '안전장비': [
    { name: '구명설비', icon: 'life-buoy', bg: '#E6F4EA', color: '#1E8E3E' },
    { name: '소방설비', icon: 'flame', bg: '#FFEBEE', color: '#D32F2F' },
    { name: '개인보호구', icon: 'shield', bg: '#DAEEFF', color: '#1A5FA0' },
    { name: '항해안전', icon: 'navigation', bg: '#DAEEFF', color: '#1A5FA0' },
    { name: '기타', icon: 'package', bg: '#FFF3C0', color: '#D4960A' }
  ],
  '주/부식': [
    { name: '쌀·곡물', icon: 'leaf', bg: '#E6F4EA', color: '#1E8E3E' },
    { name: '육류', icon: 'beef', bg: '#FFEBEE', color: '#D32F2F' },
    { name: '수산물', icon: 'fish', bg: '#DAEEFF', color: '#1A5FA0' },
    { name: '청과류', icon: 'apple', bg: '#FFF3C0', color: '#D4960A' },
    { name: '가공·음료', icon: 'coffee', bg: '#FFF3C0', color: '#7A5200' }
  ]
};

const CAT_TO_TOP_MAP = {};
Object.entries(KATEGORY_MAP).forEach(([top, cats]) => {
    if (top !== '전체') cats.forEach(c => CAT_TO_TOP_MAP[c.name] = top);
});


