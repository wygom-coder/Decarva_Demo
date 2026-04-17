// ============================================================================
// /api/verify-business.js — 사업자 인증 서버 (P0-#4 서버화 적용)
// ============================================================================
// 변경 핵심:
//   - 기존: 국세청 조회만 하고 결과만 반환 → 클라이언트가 user_metadata 직접 작성
//           (콘솔 한 줄로 위조 가능했음)
//   - 신규: Authorization 헤더로 JWT 검증 → 서버가 service_role로 app_metadata
//           직접 업데이트 → 클라이언트는 결과만 반영 (위조 불가)
//
// 환경변수 (Vercel):
//   - NTS_API_KEY               (기존)
//   - SUPABASE_URL              (신규)
//   - SUPABASE_SERVICE_ROLE_KEY (신규, 서버 전용 마스터 키)
//
// 의존성: 없음 (raw fetch로 Supabase REST API 직접 호출)
// ============================================================================

export default async function handler(req, res) {
  // CORS — Authorization 헤더 허용 추가
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── 환경변수 확인 ────────────────────────────────────────────────────────
  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ntsApiKey      = process.env.NTS_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: '서버 설정 오류: SUPABASE 환경변수 누락' });
  }
  if (!ntsApiKey) {
    return res.status(500).json({ error: 'NTS_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  // ── 1) Authorization 헤더에서 JWT 추출 ────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  // ── 2) JWT 검증 + 사용자 정보 조회 (Supabase REST API) ────────────────────
  let userId;
  let existingAppMeta = {};
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceRoleKey
      }
    });
    if (!userRes.ok) {
      return res.status(401).json({ error: '유효하지 않은 인증 토큰입니다.' });
    }
    const userJson = await userRes.json();
    userId = userJson.id;
    existingAppMeta = userJson.app_metadata || {};
    if (!userId) {
      return res.status(401).json({ error: '사용자 정보를 확인할 수 없습니다.' });
    }
  } catch (err) {
    return res.status(500).json({ error: '사용자 인증 처리 오류: ' + err.message });
  }

  // ── 3) 입력 검증 ─────────────────────────────────────────────────────────
  const { b_no, biz_name } = req.body || {};
  if (!b_no || !/^\d{10}$/.test(b_no)) {
    return res.status(400).json({ error: '사업자등록번호 10자리(숫자만)를 입력해주세요.' });
  }
  if (!biz_name || !String(biz_name).trim()) {
    return res.status(400).json({ error: '상호명을 입력해주세요.' });
  }

  // ── 4) 국세청 API 호출 ───────────────────────────────────────────────────
  let bizData;
  try {
    const ntsRes = await fetch(
      `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${ntsApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ b_no: [b_no] })
      }
    );
    const ntsResult = await ntsRes.json();
    if (!ntsResult || !ntsResult.data || ntsResult.data.length === 0) {
      return res.status(200).json({
        success: false,
        status: null,
        error: '국세청 DB에서 해당 사업자번호를 찾을 수 없습니다.'
      });
    }
    bizData = ntsResult.data[0];
  } catch (err) {
    return res.status(502).json({ error: '국세청 API 호출 오류: ' + err.message });
  }

  // ── 5) 이름 매칭 검사 ────────────────────────────────────────────────────
  const apiName = (bizData.b_nm || '').replace(/\s/g, '').toLowerCase();
  const inputName = String(biz_name).replace(/\s/g, '').toLowerCase();
  const nameMatch = !!(
    apiName && inputName &&
    (apiName.includes(inputName) || inputName.includes(apiName))
  );

  // ── 6) 휴업/폐업 차단 ────────────────────────────────────────────────────
  if (bizData.b_stt_cd === '02' || bizData.b_stt_cd === '03') {
    return res.status(200).json({
      success: false,
      status: bizData.b_stt_cd,
      statusText: bizData.b_stt,
      error: bizData.b_stt_cd === '02'
        ? '휴업 상태인 사업자는 인증할 수 없습니다.'
        : '폐업 상태인 사업자는 인증할 수 없습니다.'
    });
  }

  // ── 7) 이름 불일치 차단 ──────────────────────────────────────────────────
  if (!nameMatch) {
    return res.status(200).json({
      success: false,
      status: bizData.b_stt_cd,
      statusText: bizData.b_stt,
      companyName: bizData.b_nm,
      nameMatch: false,
      error: `입력하신 업체명과 국세청 등록 업체명("${bizData.b_nm}")이 일치하지 않습니다.`
    });
  }

  // ── 8) 인증 성공 → service_role로 app_metadata 직접 업데이트 ─────────────
  //     이 부분이 핵심. user_metadata가 아닌 app_metadata에 기록.
  //     클라이언트는 app_metadata를 절대 못 씀 (READ만 가능).
  try {
    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        app_metadata: {
          ...existingAppMeta, // 기존 app_metadata 보존 (provider 등)
          is_business: true,
          biz_number: b_no,
          biz_name: bizData.b_nm,
          verified_at: new Date().toISOString()
        }
      })
    });
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('app_metadata 업데이트 실패:', errText);
      return res.status(500).json({
        error: '인증 결과 저장 실패. 잠시 후 다시 시도해주세요.'
      });
    }
  } catch (err) {
    return res.status(500).json({ error: '인증 결과 저장 중 오류: ' + err.message });
  }

  // ── 9) 성공 응답 ─────────────────────────────────────────────────────────
  return res.status(200).json({
    success: true,
    status: bizData.b_stt_cd,
    statusText: bizData.b_stt,
    companyName: bizData.b_nm,
    nameMatch: true
  });
}
