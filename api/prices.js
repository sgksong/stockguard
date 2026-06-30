let tokenCache = { token: null, expiresAt: 0 };

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req, res) {
  try {
    const { codes = "" } = req.query;
    const list = String(codes).split(",").map(v => v.trim()).filter(Boolean);

    if (!list.length) {
      return res.status(400).json({ error: "codes required" });
    }

    const token = await getAccessToken();
    const prices = {};

    for (const code of list) {
      prices[code] = await getPrice(token, code);
      await sleep(350);
    }

    res.status(200).json({
      updatedAt: new Date().toISOString(),
      prices
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const appkey = process.env.KIS_APP_KEY;
  const appsecret = process.env.KIS_APP_SECRET;

  if (!appkey || !appsecret) {
    throw new Error("KIS_APP_KEY / KIS_APP_SECRET 환경변수가 필요합니다.");
  }

  const r = await fetch("https://openapi.koreainvestment.com:9443/oauth2/tokenP", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey,
      appsecret
    })
  });

  const j = await r.json();

  if (!j.access_token) {
    throw new Error("토큰 발급 실패: " + JSON.stringify(j));
  }

  tokenCache = {
    token: j.access_token,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000
  };

  return tokenCache.token;
}

async function getPrice(token, code) {
  const appkey = process.env.KIS_APP_KEY;
  const appsecret = process.env.KIS_APP_SECRET;

  const url = new URL("https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price");
  url.searchParams.set("FID_COND_MRKT_DIV_CODE", "J");
  url.searchParams.set("FID_INPUT_ISCD", code);

  const r = await fetch(url, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "authorization": `Bearer ${token}`,
      "appkey": appkey,
      "appsecret": appsecret,
      "tr_id": "FHKST01010100"
    }
  });

  const j = await r.json();

  if (!j.output) {
    return { code, error: j };
  }

  return {
    code,
    name: j.output.hts_kor_isnm,
    price: Number(j.output.stck_prpr),
    change: Number(j.output.prdy_vrss),
    changeRate: Number(j.output.prdy_ctrt),
    volume: Number(j.output.acml_vol)
  };
}
