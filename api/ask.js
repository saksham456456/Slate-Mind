'use strict';
const { generateAnswer } = require('../lib/groq');
const { LIMITS } = require('../lib/config');
const { requirePost, readBody, cleanText, decodeHistory, encodeHistory, sendError } = require('../lib/http');

const DEFAULT_TOPIC = 'General Science & Mathematics';

/** Context for the model: the saved conversation, or just the topic if none was kept (offline samples, history recall). */
function conversationFor(body) {
  const saved = decodeHistory(body.interactionId);
  if (saved) return saved;
  const topic = typeof body.topic === 'string' && body.topic.trim()
    ? body.topic.trim().slice(0, LIMITS.topic)
    : DEFAULT_TOPIC;
  return [{ role: 'user', content: `Topic: ${topic}` }];
}

module.exports = async (req, res) => {
  try {
    requirePost(req);
    const body = readBody(req);
    const question = cleanText(body.question, LIMITS.question, 'Question');
    const { parsed, history } = await generateAnswer(question, conversationFor(body), { language: body.language });
    res.json({ ...parsed, interactionId: encodeHistory(history) });
  } catch (err) {
    sendError(res, '[/api/ask]', err);
  }
};
