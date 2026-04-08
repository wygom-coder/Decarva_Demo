export const config = { runtime: 'edge' };

export default async function handler(req) {
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const date = today.getFullYear() + pad(today.getMonth()+1) + pad(today.getDate());

  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${process.env.BOK_API_KEY}/json/kr/1/10/731Y001/DD/${date}/${date}`;

  const res = await fetch(url);
  const data = await res.json();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
