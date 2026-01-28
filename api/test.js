export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    return res.json({
      message: 'POST endpoint accessible',
      method: req.method,
      hasBody: !!req.body,
      contentLength: req.headers['content-length'] || '0',
      contentType: req.headers['content-type'] || 'unknown'
    });
  }

  res.json({ 
    message: 'Test endpoint working',
    method: req.method,
    timestamp: new Date().toISOString()
  });
}