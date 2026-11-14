'use strict';
const http = require('node:http');

const GOOD_LESSON = {
  title: 'Mock Lesson', xpReward: 90, difficulty: 'Beginner',
  keyTerms: ['alpha', 'beta', 'gamma'], rabbitHoles: ['Why?', 'What if?', 'Where used?'],
  quiz: [
    { question: 'Q1?', options: ['a', 'b', 'c', 'd'], correct: 1, explanation: 'Because b.', reteach: 'Think of b as a door.' },
    { question: 'Q2?', options: ['a', 'b', 'c', 'd'], correct: 0, explanation: 'Because a.' },
  ],
  funFact: 'A fun fact.',
  blocks: [
    { type: 'heading', text: 'Mock Lesson' },
    { type: 'text', text: 'First idea on the board.' },
    { type: 'bullet', items: ['one', 'two', 'three'] },
    { type: 'equation', text: 'a + b = c' },
  ],
};
const GOOD_ANSWER = { xpReward: 20, blocks: [{ type: 'text', text: 'Here is the answer.' }] };
const GOOD_GRADE = { score: 82, strengths: ['clear'], gaps: ['edge cases'], feedback: 'Nice work.', xpReward: 30, chalkCorrection: 'Remember X.' };

/** Which kind of request is this? Decided from the system prompt or contents. */
function kindOf(body) {
  let sys = '';
  if (body.systemInstruction?.parts?.[0]?.text) {
    sys = body.systemInstruction.parts[0].text;
  } else if (Array.isArray(body.messages)) {
    sys = (body.messages.find(m => m.role === 'system') || {}).content || '';
  }
  if (sys.includes('grading a student')) return 'grade';
  if (sys.includes('follow-up question')) return 'answer';
  return 'lesson';
}

/**
 * Tiny Gemini/OpenAI-compatible server. `script` is a queue of handlers (req body -> {status, body|content});
 * when empty, it answers with a valid reply for the request kind.
 */
async function startMockAI() {
  const mock = { calls: [], script: [] };
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
      const body = JSON.parse(raw || '{}');
      // Normalize body.messages so existing tests that inspect mock.calls[i].messages still work
      if (!body.messages && body.contents) {
        body.messages = [
          ...(body.systemInstruction?.parts?.[0]?.text ? [{ role: 'system', content: body.systemInstruction.parts[0].text }] : []),
          ...body.contents.map(c => ({ role: c.role === 'model' ? 'assistant' : c.role, content: c.parts?.[0]?.text || '' })),
        ];
      }
      mock.calls.push(body);
      const step = mock.script.shift();
      const out = step ? step(body) : { content: JSON.stringify({ lesson: GOOD_LESSON, answer: GOOD_ANSWER, grade: GOOD_GRADE }[kindOf(body)]) };
      res.statusCode = out.status || 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(out.status && out.status >= 400
        ? (out.raw || 'error')
        : JSON.stringify({
          candidates: [{
            content: {
              parts: [{ text: out.content }],
              role: 'model',
            },
            finishReason: 'STOP',
          }],
          choices: [{ message: { content: out.content } }],
        }));
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  mock.url = `http://127.0.0.1:${server.address().port}/v1beta/models/gemini-3.1-flash-lite:generateContent`;
  mock.close = () => new Promise(r => server.close(r));
  return mock;
}

module.exports = { startMockAI, GOOD_LESSON, GOOD_ANSWER, GOOD_GRADE };
