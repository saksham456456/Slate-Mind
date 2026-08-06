'use strict';
const { generateLesson } = require('../lib/groq');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const topic = (body?.topic || '').trim();
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  try {
    const { parsed, history } = await generateLesson(topic);
    const interactionId = Buffer.from(JSON.stringify(history)).toString('base64');
    res.json({ ...parsed, interactionId });
  } catch (err) {
    console.error('[/api/lesson]', err);
    res.status(500).json({ error: err.message });
  }
};
