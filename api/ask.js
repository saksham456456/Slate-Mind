'use strict';
const { generateAnswer } = require('../lib/groq');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const { question, interactionId } = body || {};
  if (!question?.trim()) return res.status(400).json({ error: 'question is required' });
  if (!interactionId)    return res.status(400).json({ error: 'interactionId is required' });

  let history;
  try {
    history = JSON.parse(Buffer.from(interactionId, 'base64').toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid interactionId' });
  }

  try {
    const { parsed, history: newHistory } = await generateAnswer(question.trim(), history);
    const newInteractionId = Buffer.from(JSON.stringify(newHistory)).toString('base64');
    res.json({ ...parsed, interactionId: newInteractionId });
  } catch (err) {
    console.error('[/api/ask]', err);
    res.status(500).json({ error: err.message });
  }
};
