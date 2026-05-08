api/sprout.jsexport default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Sprout-Token');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
              }

                const token = req.headers['x-sprout-token'];
                  if (!token) {
                      return res.status(401).json({ error: 'Missing X-Sprout-Token header' });
                        }

                          const sproutPath = req.query.path || '/v1/metadata/client';
                            const sproutUrl = `https://api.sproutsocial.com${sproutPath}`;

                              try {
                                  const fetchOptions = {
                                        method: req.method,
                                              headers: {
                                                      'Authorization': `Bearer ${token}`,
                                                              'Content-Type': 'application/json',
                                                                    },
                                                                        };

                                                                            if (req.method === 'POST' && req.body) {
                                                                                  fetchOptions.body = JSON.stringify(req.body);
                                                                                      }

                                                                                          const sproutRes = await fetch(sproutUrl, fetchOptions);
                                                                                              const data = await sproutRes.json();
                                                                                                  return res.status(sproutRes.status).json(data);
                                                                                                    } catch (err) {
                                                                                                        return res.status(500).json({ error: 'Proxy error: ' + err.message });
                                                                                                          }
                                                                                                          }
