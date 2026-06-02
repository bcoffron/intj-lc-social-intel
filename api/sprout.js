// security-hardened
module.exports = async (req, res) => {
  var allowed = 'https://intj-lc-social-intel.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sprout-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var dashKey = process.env.DASH_KEY;
  var reqKey = req.headers['x-sprout-token'];
  if (!dashKey || !reqKey || reqKey !== dashKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var path = req.query.path || '/v1/metadata/client';

  if (path === '/claude') {
    var prompt = (req.body || {}).prompt;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    var apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'No ANTHROPIC_API_KEY' });
    try {
      var cr = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': apiKey },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
      });
      var cd = await cr.json();
      if (cd.error) return res.status(500).json({ error: cd.error.message });
      var text = (cd.content || []).filter(function(c) { return c.type === 'text'; }).map(function(c) { return c.text; }).join('');
      return res.status(200).json({ text: text });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  var sproutToken = process.env.SPROUT_TOKEN;
  if (!sproutToken) return res.status(500).json({ error: 'No SPROUT_TOKEN' });
  var url = 'https://api.sproutsocial.com' + path;
  try {
    var opts = { method: req.method, headers: { Authorization: 'Bearer ' + sproutToken, 'Content-Type': 'application/json' } };
    if (req.method === 'POST' && req.body) opts.body = JSON.stringify(req.body);
    var r = await fetch(url, opts);
    var bodyText = await r.text();
    var data;
    try { data = JSON.parse(bodyText); } catch(e) { data = { raw: bodyText }; }
    res.status(r.status).json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
};
