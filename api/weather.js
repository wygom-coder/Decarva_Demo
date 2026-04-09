export default async function handler(req, res) {
  const { WEATHER_API_KEY } = process.env;
  const { lat, lon } = req.query; // 위치 정보 쿼리 파라미터

  if (!WEATHER_API_KEY) {
    return res.status(500).json({ error: "WEATHER_API_KEY 환경변수가 설정되지 않았습니다." });
  }

  try {
    // 위도/경도가 전달되면 해당 위치, 없으면 부산(Busan) 기본값
    let apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=Busan&appid=${WEATHER_API_KEY}&units=metric&lang=kr`;
    
    if (lat && lon) {
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=kr`;
    }

    const response = await fetch(apiUrl);

    if (!response.ok) {
        return res.status(response.status).json({ 
            error: "API 요청 실패 (인증키가 유효한 OpenWeatherMap 키인지 확인해주세요.)",
            details: await response.text()
        });
    }

    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
