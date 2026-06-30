
const STOCKS = [
  {code:"000660",name:"SK하이닉스",market:"KOSPI",dividendYield:0.012},
  {code:"005930",name:"삼성전자",market:"KOSPI",dividendYield:0.018},
  {code:"005380",name:"현대차",market:"KOSPI",dividendYield:0.045},
  {code:"011790",name:"SKC",market:"KOSPI",dividendYield:0},
  {code:"102110",name:"TIGER 200",market:"ETF",dividendYield:0.022},
  {code:"035420",name:"NAVER",market:"KOSPI",dividendYield:0.005},
  {code:"035720",name:"카카오",market:"KOSPI",dividendYield:0.001},
  {code:"373220",name:"LG에너지솔루션",market:"KOSPI",dividendYield:0},
  {code:"207940",name:"삼성바이오로직스",market:"KOSPI",dividendYield:0},
  {code:"005935",name:"삼성전자우",market:"KOSPI",dividendYield:0.02},
  {code:"000270",name:"기아",market:"KOSPI",dividendYield:0.045},
  {code:"068270",name:"셀트리온",market:"KOSPI",dividendYield:0.005},
  {code:"005490",name:"POSCO홀딩스",market:"KOSPI",dividendYield:0.025},
  {code:"051910",name:"LG화학",market:"KOSPI",dividendYield:0.015},
  {code:"006400",name:"삼성SDI",market:"KOSPI",dividendYield:0.004},
  {code:"105560",name:"KB금융",market:"KOSPI",dividendYield:0.05},
  {code:"055550",name:"신한지주",market:"KOSPI",dividendYield:0.05},
  {code:"012330",name:"현대모비스",market:"KOSPI",dividendYield:0.018},
  {code:"028260",name:"삼성물산",market:"KOSPI",dividendYield:0.018},
  {code:"096770",name:"SK이노베이션",market:"KOSPI",dividendYield:0.01}
];

export default async function handler(req, res) {
  const q = String(req.query.q || "").trim().toLowerCase();
  if (!q) return res.status(200).json({ results: [] });

  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "");
  const nq = norm(q);

  const results = STOCKS
    .filter(s => norm(s.name).includes(nq) || s.code.includes(q))
    .slice(0, 20);

  res.status(200).json({ results });
}
