'use strict';
const { generateAnswer } = require('../lib/groq');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const { question, interactionId, topic } = body || {};
  if (typeof question !== 'string' || !question.trim()) return res.status(400).json({ error: 'question is required' });
  if (question.length > 300) return res.status(400).json({ error: 'Question is too long' });

  let history = null;
  if (typeof interactionId === 'string' && interactionId.trim() && interactionId.length <= 60000) {
    try {
      history = JSON.parse(Buffer.from(interactionId, 'base64').toString('utf8'));
    } catch {
      history = null;
    }
  }

  // If no interaction history was stored (e.g. offline sample, history recall, or new follow-up),
  // reconstruct context from topic so live AI API can answer seamlessly
  if (!Array.isArray(history) || history.length === 0) {
    const topicContext = (typeof topic === 'string' && topic.trim()) ? topic.trim() : 'General Science & Mathematics';
    history = [
      { role: 'system', content: 'You are Professor Byte, master blackboard teacher. Answer student follow-up questions clearly and concisely on the chalkboard.' },
      { role: 'user', content: `Topic: ${topicContext}` },
      { role: 'assistant', content: `I have introduced the topic of ${topicContext}. Let us dive into your follow-up questions.` }
    ];
  }

  try {
    const { parsed, history: newHistory } = await generateAnswer(question.trim(), history);
    const newInteractionId = Buffer.from(JSON.stringify(newHistory)).toString('base64');
    res.json({ ...parsed, interactionId: newInteractionId });
  } catch (err) {
    console.error('[/api/ask]', err);
    const status = err.status || (err.name === 'AbortError' ? 504 : 500);
    const message = err.name === 'AbortError'
      ? 'Request timed out. Please try again.'
      : (err.message || 'Unknown server error');
    res.status(status).json({ error: message });
  }
};
