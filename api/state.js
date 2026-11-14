// Salva status/notas de cada lead no Upstash Redis (Vercel Marketplace).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'crm:leads';
const redis = async (cmd) => {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).result;
};
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.CRM_PIN || req.headers['x-pin'] !== process.env.CRM_PIN) return res.status(401).json({ error: 'pin' });
  if (!URL_ || !TOKEN) return res.status(500).json({ error: 'banco nao configurado' });
  try {
    if (req.method === 'GET') {
      const a = (await redis(['HGETALL', KEY])) || [];
      const o = {};
      for (let i = 0; i < a.length; i += 2) o[a[i]] = JSON.parse(a[i + 1]);
      return res.status(200).json(o);
    }
    if (req.method === 'POST') {
      const { id, data } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (id === undefined || typeof data !== 'object') return res.status(400).json({ error: 'bad' });
      await redis(['HSET', KEY, String(id), JSON.stringify(data)]);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  } catch (e) { return res.status(500).json({ error: String(e.message) }); }
};
