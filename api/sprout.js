// security-hardened
var claudeRateLimit = {};

function checkClaudeRate(ip) {
  var now = Date.now();
  var windowMs = 60 * 60 * 1000;
  var limit = 50;
  if (!claudeRateLimit[ip]) claudeRateLimit[ip] = [];
  claudeRateLimit[ip] = claudeRateLimit[ip].filter(function(t) { return now - t < windowMs; });
  if (claudeRateLimit[ip].length >= limit) return false;
  claudeRateLimit[ip].push(now);
  return true;
}

module.exports = async (req, res) => {
  var allowed = 'https://intj-lc-social-intel.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sprout-Token');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var dashKey = process.env.DASH_KEY;
  var reqKey = req.headers['x-sprout-token'];
  if (!dashKey || !reqKey || reqKey !== dashKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var path = req.query.path || '/v1/metadata/client';

  if (path === '/claude') {
    var ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (!checkClaudeRate(ip)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Max 50 AI requests per hour.' });
    }
    var prompt = (req.body || {}).prompt;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    if (prompt.length > 10000) return res.status(400).json({ error: 'Prompt exceeds 10,000 character limit.' });
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
