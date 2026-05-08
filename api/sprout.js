module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sprout-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const token = req.headers['x-sprout-token'];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  const url = 'https://api.sproutsocial.com' + (req.query.path || '/v1/metadata/client');
  try {
    const opts = { method: req.method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } };
    if (req.method === 'POST' && req.body) opts.body = JSON.stringify(req.body);
    const r = await fetch(url, opts);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
