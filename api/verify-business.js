export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { b_no, biz_name } = req.body;
  if (!b_no || b_no.length !== 10) {
    return res.status(400).json({ error: '사업자등록번호 10자리를 입력해주세요.' });
  }

  const apiKey = process.env.NTS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });

  try {
    const response = await fetch(
      'https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ b_no: [b_no] })
      }
    );

    const result = await response.json();

    if (!result || !result.data || result.data.length === 0) {
      return res.status(200).json({ status: null, error: '국세청 DB에서 해당 사업자번호를 찾을 수 없습니다.' });
    }

    const bizData = result.data[0];
    const apiName = (bizData.b_nm || '').replace(/\s/g, '').toLowerCase();
    const inputName = (biz_name || '').replace(/\s/g, '').toLowerCase();
    const nameMatch = !!(apiName && inputName &&
      (apiName.includes(inputName) || inputName.includes(apiName)));

    return res.status(200).json({
      status: bizData.b_stt_cd,
      statusText: bizData.b_stt,
      companyName: bizData.b_nm,
      taxType: bizData.tax_type,
      nameMatch
    });

  } catch (err) {
    return res.status(500).json({ error: '국세청 API 호출 오류: ' + err.message });
  }
}
