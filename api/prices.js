const sleep = ms => new Promise(r => setTimeout(r, ms));
export default async function handler(req, res) {
  const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
  const codes = String(req.query.codes || "").split(",").map(v => v.trim()).filter(Boolean);
  const prices = {};
  for (const code of codes) {
    const r = await fetch(`${origin}/api/price?code=${encodeURIComponent(code)}`);
    const j = await r.json();
    prices[code] = j.price || { error: j.error || j };
    await sleep(1200);
  }
  res.status(200).json({ updatedAt: new Date().toISOString(), prices });
}
