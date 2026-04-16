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
    { name: '엔진·동력', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="10" width="16" height="9" rx="2" stroke="#1A5FA0" stroke-width="1.4"/><path d="M7 10V7a4 4 0 018 0v3" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '펌프·배관', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 8h12M5 14h12" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><rect x="3" y="5" width="16" height="12" rx="2" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: '로프·와이어', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1A5FA0" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#DAEEFF' },
    { name: '작업복·안전화', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 6h10v12H6z" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 6l3-4 3 4" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '구명설비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1E8E3E" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#E6F4EA' },
    { name: '소방설비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4C7 4 7 11 7 11c0 3.3 2.7 6 4 6s4-2.7 4-6c0 0 0-7-4-7z" stroke="#D32F2F" stroke-width="1.4"/></svg>', bg: '#FFEBEE' },
    { name: '쌀·곡물', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="4" width="10" height="14" rx="2" stroke="#1E8E3E" stroke-width="1.4"/><line x1="8" y1="10" x2="14" y2="10" stroke="#1E8E3E" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#E6F4EA' },
    { name: '수산물', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 11s4-4 8 0 6 4 6 4-2 3-5 1-9-3-9-5z" stroke="#1A5FA0" stroke-width="1.4"/></svg>', bg: '#DAEEFF' }
  ],
  '기부속': [
    { name: '엔진·동력', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="10" width="16" height="9" rx="2" stroke="#1A5FA0" stroke-width="1.4"/><path d="M7 10V7a4 4 0 018 0v3" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '항법장비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="6" stroke="#D4960A" stroke-width="1.4"/><line x1="11" y1="5" x2="11" y2="3" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><line x1="17" y1="11" x2="19" y2="11" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><circle cx="11" cy="11" r="2" fill="#D4960A"/></svg>', bg: '#FFF3C0' },
    { name: '갑판장비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 14L11 4l7 10H4z" stroke="#1A5FA0" stroke-width="1.4" stroke-linejoin="round"/><line x1="11" y1="14" x2="11" y2="19" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/><line x1="7" y1="19" x2="15" y2="19" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '통신장비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="5" y="6" width="12" height="10" rx="2" stroke="#D4960A" stroke-width="1.4"/><path d="M9 6V4h4v2" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><line x1="8" y1="11" x2="14" y2="11" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#FFF3C0' },
    { name: '펌프·배관', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 8h12M5 14h12" stroke="#D4960A" stroke-width="1.4" stroke-linecap="round"/><rect x="3" y="5" width="16" height="12" rx="2" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: '전기·계측', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="4" width="10" height="14" rx="2" stroke="#1A5FA0" stroke-width="1.4"/><line x1="11" y1="14" x2="15" y2="10" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '기타부품', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#D4960A" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#FFF3C0' }
  ],
  '선용품': [
    { name: '로프·와이어', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1A5FA0" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#DAEEFF' },
    { name: '페인트·화공품', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="8" width="10" height="10" rx="2" stroke="#D4960A" stroke-width="1.4"/><path d="M8 8V6a2 2 0 116 0v2" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: '작업복·안전화', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 6h10v12H6z" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 6l3-4 3 4" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '청소·소모품', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 20l-4-8h8l-4 8z" stroke="#D4960A" stroke-width="1.4"/><path d="M11 12V4" stroke="#D4960A" stroke-width="1.4"/></svg>', bg: '#FFF3C0' },
    { name: '공구·기기', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M14 6l-8 8" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/><circle cx="16" cy="6" r="2" stroke="#1A5FA0" stroke-width="1.4"/></svg>', bg: '#DAEEFF' },
    { name: '기타', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#D4960A" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#FFF3C0' }
  ],
  '안전장비': [
    { name: '구명설비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1E8E3E" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#E6F4EA' },
    { name: '소방설비', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4C7 4 7 11 7 11c0 3.3 2.7 6 4 6s4-2.7 4-6c0 0 0-7-4-7z" stroke="#D32F2F" stroke-width="1.4"/></svg>', bg: '#FFEBEE' },
    { name: '개인보호구', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 6h10v12H6z" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 6l3-4 3 4" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '항해안전', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="10" r="5" stroke="#1A5FA0" stroke-width="1.4"/><path d="M8 16l3 3 3-3" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><line x1="11" y1="19" x2="11" y2="15" stroke="#1A5FA0" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#DAEEFF' },
    { name: '기타', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#D4960A" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#FFF3C0' }
  ],
  '주/부식': [
    { name: '쌀·곡물', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="6" y="4" width="10" height="14" rx="2" stroke="#1E8E3E" stroke-width="1.4"/><line x1="8" y1="10" x2="14" y2="10" stroke="#1E8E3E" stroke-width="1.4" stroke-dasharray="2 2"/></svg>', bg: '#E6F4EA' },
    { name: '육류', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 12c0-4 6-6 12 0-6 6-12 4-12 0z" stroke="#D32F2F" stroke-width="1.4"/></svg>', bg: '#FFEBEE' },
    { name: '수산물', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 11s4-4 8 0 6 4 6 4-2 3-5 1-9-3-9-5z" stroke="#1A5FA0" stroke-width="1.4"/></svg>', bg: '#DAEEFF' },
    { name: '청과류', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="12" r="6" stroke="#D4960A" stroke-width="1.4"/><path d="M11 6v2" stroke="#1E8E3E" stroke-width="1.4" stroke-linecap="round"/></svg>', bg: '#FFF3C0' },
    { name: '가공·음료', svg: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="7" y="6" width="8" height="12" rx="2" stroke="#7A5200" stroke-width="1.4"/><line x1="7" y1="10" x2="15" y2="10" stroke="#7A5200" stroke-width="1.4"/></svg>', bg: '#FFF3C0' }
  ]
};

const CAT_TO_TOP_MAP = {};
Object.entries(KATEGORY_MAP).forEach(([top, cats]) => {
    if (top !== '전체') cats.forEach(c => CAT_TO_TOP_MAP[c.name] = top);
});


