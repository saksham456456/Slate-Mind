'use strict';
const { generateLesson } = require('../lib/groq');
const { LIMITS } = require('../lib/config');
const { requirePost, readBody, cleanText, encodeHistory, sendError } = require('../lib/http');

module.exports = async (req, res) => {
  try {
    requirePost(req);
    const body = readBody(req);
    const topic = cleanText(body.topic, LIMITS.topic, 'Topic');
    const { parsed, history } = await generateLesson(topic, {
      teachStyle: body.teachStyle, level: body.level, language: body.language,
    });
    res.json({ ...parsed, interactionId: encodeHistory(history) });
  } catch (err) {
    sendError(res, '[/api/lesson]', err);
  }
};
