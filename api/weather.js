export default async function handler(req, res) {
  const { WEATHER_API_KEY } = process.env;

  if (!WEATHER_API_KEY) {
    return res.status(500).json({ error: "WEATHER_API_KEY 환경변수가 설정되지 않았습니다." });
  }

  try {
    // 1. 부산(Busan) 기준 OpenWeatherMap API 호출 가정
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Busan&appid=${WEATHER_API_KEY}&units=metric&lang=kr`
    );

    if (!response.ok) {
        // 기상청 등 다른 API 키를 OpenWeatherMap에 사용했거나 키가 유효하지 않은 경우
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
