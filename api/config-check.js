export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const hasGroqKey = !!process.env.GROQ_API_KEY;
  
  res.json({ 
    status: 'Configuration Check',
    groqApiKey: hasGroqKey ? 'Configured ✓' : 'Missing ✗',
    environment: 'Vercel Serverless',
    timestamp: new Date().toISOString(),
    ready: hasGroqKey
  });
}