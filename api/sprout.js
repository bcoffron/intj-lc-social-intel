// rebuilt-1779309788621
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sprout-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const path = req.query.path || '/v1/metadata/client';
  if (path === '/claude') {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'No ANTHROPIC_API_KEY' });
    try {
      const cr = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': apiKey },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
      });
      const cd = await cr.json();
      if (cd.error) return res.status(500).json({ error: cd.error.message });
      const text = (cd.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
      return res.status(200).json({ text });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }
  const rawToken = req.headers['x-sprout-token'];
  if (!rawToken) return res.status(401).json({ error: 'Missing token' });
  let token = rawToken;
  try {
    const decoded = Buffer.from(rawToken, 'base64').toString('utf8');
    if (decoded.indexOf('|') !== -1) token = decoded;
  } catch(e) {}
  const url = 'https://api.sproutsocial.com' + path;
  try {
    const opts = { method: req.method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } };
    if (req.method === 'POST' && req.body) opts.body = JSON.stringify(req.body);
    const r = await fetch(url, opts);
    const responseHeaders = {};
    r.headers.forEach((v, k) => { responseHeaders[k] = v; });
    const bodyText = await r.text();
    if (path === '/debug') {
      return res.status(200).json({
        sproutStatus: r.status,
        sproutStatusText: r.statusText,
        sproutHeaders: responseHeaders,
        sproutBody: bodyText,
        tokenSentDecoded: token,
        urlCalled: url.replace('/debug', '/v1/528985/metadata/customer')
      });
    }
    let data;
    try { data = JSON.parse(bodyText); } catch(e) { data = { raw: bodyText }; }
    res.status(r.status).json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
};
