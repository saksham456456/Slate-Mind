'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

describe('SlateMind Server & API Automated Test Suite', () => {
  let server;
  let baseUrl;
  let interactionId;

  before((_, done) => {
    // Listen on dynamic ephemeral port 0
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  after((_, done) => {
    server.close(done);
  });

  describe('1. Static Asset Delivery', () => {
    test('GET / serves index.html with HTML5 doctype', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /text\/html/);
      const text = await res.text();
      assert.match(text, /<!DOCTYPE html>/i);
      assert.match(text, /SlateMind/);
      assert.match(text, /audio\.js/);
      assert.match(text, /state\.js/);
      assert.match(text, /samples\.js/);
      assert.match(text, /gamification\.js/);
      assert.match(text, /quiz\.js/);
      assert.match(text, /constellation\.js/);
      assert.match(text, /tour\.js/);
      assert.match(text, /whiteboard\.js/);
      assert.match(text, /app\.js/);
    });

    test('GET /style.css returns stylesheet', async () => {
      const res = await fetch(`${baseUrl}/style.css`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /text\/css/);
      const text = await res.text();
      assert.match(text, /--bg-board/);
    });

    const clientScripts = [
      { path: '/audio.js', expected: 'initAudio' },
      { path: '/state.js', expected: 'LEVELS' },
      { path: '/samples.js', expected: 'SAMPLE_LESSONS' },
      { path: '/gamification.js', expected: 'awardXP' },
      { path: '/quiz.js', expected: 'setupQuizPanel' },
      { path: '/constellation.js', expected: 'renderConstellation' },
      { path: '/tour.js', expected: 'startAppTour' },
      { path: '/whiteboard.js', expected: 'Whiteboard' },
      { path: '/app.js', expected: 'startLesson' },
    ];

    for (const script of clientScripts) {
      test(`GET ${script.path} returns 200 and valid JS containing "${script.expected}"`, async () => {
        const res = await fetch(`${baseUrl}${script.path}`);
        assert.equal(res.status, 200);
        assert.match(res.headers.get('content-type'), /(application|text)\/javascript/);
        const text = await res.text();
        assert.ok(text.includes(script.expected), `${script.path} should contain "${script.expected}"`);
      });
    }

    test('GET /sw.js caches version slatemind-v2', async () => {
      const res = await fetch(`${baseUrl}/sw.js`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.match(text, /slatemind-v2/);
    });

    test('GET /manifest.json returns valid web manifest', async () => {
      const res = await fetch(`${baseUrl}/manifest.json`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.name, 'SlateMind');
      assert.equal(json.description, 'AI-Powered Gamified Blackboard Teacher');
    });

    test('GET /unknown-path returns 404 status and 404 page', async () => {
      const res = await fetch(`${baseUrl}/this-page-does-not-exist-${Date.now()}`);
      assert.equal(res.status, 404);
      const text = await res.text();
      assert.match(text, /404/);
    });
  });

  describe('2. Health Check API', () => {
    test('GET /api/health returns status ok', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, 'ok');
      assert.equal(typeof body.hasKey, 'boolean');
      assert.equal(typeof body.providers, 'object');
      assert.equal(typeof body.providers.groq, 'boolean');
      assert.equal(typeof body.providers.openai, 'boolean');
      assert.ok(body.timestamp);
    });
  });

  describe('3. Lesson Generation API (/api/lesson)', () => {
    test('POST /api/lesson with empty body fails with 400', async () => {
      const res = await fetch(`${baseUrl}/api/lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, /Topic is required/i);
    });

    test('POST /api/lesson with excessive length fails with 400', async () => {
      const res = await fetch(`${baseUrl}/api/lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'a'.repeat(250) })
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, /Topic is too long/i);
    });

    test('POST /api/lesson generates valid curriculum with blocks, quiz, rabbit holes, and interactionId', async () => {
      const res = await fetch(`${baseUrl}/api/lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Photosynthesis' })
      });
      assert.equal(res.status, 200);
      const lesson = await res.json();

      // Structure assertions
      assert.ok(lesson.title, 'Should have a title');
      assert.ok(typeof lesson.xpReward === 'number', 'xpReward must be number');
      assert.ok(['Beginner', 'Intermediate', 'Advanced'].includes(lesson.difficulty), 'Valid difficulty');
      assert.ok(Array.isArray(lesson.keyTerms) && lesson.keyTerms.length > 0, 'Must have key terms');
      assert.ok(Array.isArray(lesson.rabbitHoles) && lesson.rabbitHoles.length > 0, 'Must have curiosity rabbit holes');

      // Quiz assertions
      assert.ok(Array.isArray(lesson.quiz), 'Must have quiz array');
      assert.equal(lesson.quiz.length, 3, 'Quiz must have exactly 3 questions');
      for (const q of lesson.quiz) {
        assert.ok(q.question, 'Quiz item must have question');
        assert.ok(Array.isArray(q.options) && q.options.length >= 2, 'Quiz item must have options');
        assert.ok(typeof q.correct === 'number', 'Quiz item must specify correct index');
        assert.ok(q.explanation, 'Quiz item must have explanation');
      }

      // Blocks assertions
      assert.ok(Array.isArray(lesson.blocks) && lesson.blocks.length >= 3, 'Must have at least 3 blackboard blocks');
      assert.equal(lesson.blocks[0].type, 'heading', 'First block must be a heading');

      // interactionId for conversation context
      assert.ok(lesson.interactionId, 'Must return base64 interactionId');
      interactionId = lesson.interactionId;
    });

    test('POST /api/lesson accepts and processes custom teachStyle persona', async () => {
      const res = await fetch(`${baseUrl}/api/lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Newton\'s Laws', teachStyle: 'coach' })
      });
      assert.equal(res.status, 200);
      const lesson = await res.json();
      assert.ok(lesson.title);
      assert.ok(lesson.blocks.length >= 3);
    });

    test('POST /api/lesson returns pre-created master lessons for all 10 try topics seamlessly', async () => {
      const tryTopics = [
        'Photosynthesis',
        "Newton's Laws of Motion",
        'The French Revolution',
        'DNA and Genetics',
        'Python Programming Basics',
        'Algebra Quadratic Equations',
        'How the Internet Works',
        'Climate Change',
        "Ohm's Law",
        'The Water Cycle'
      ];

      for (const topic of tryTopics) {
        const res = await fetch(`${baseUrl}/api/lesson`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic })
        });
        assert.equal(res.status, 200, `Topic "${topic}" should return 200`);
        const lesson = await res.json();
        assert.ok(lesson.title, `"${topic}" should have title`);
        assert.ok(lesson.interactionId, `"${topic}" should have interactionId`);
        assert.equal(lesson.quiz.length, 3, `"${topic}" should have 3 quiz questions`);
        assert.ok(lesson.blocks.length >= 4, `"${topic}" should have rich blackboard blocks`);
      }
    });
  });

  describe('4. Follow-Up Question API (/api/ask)', () => {
    test('POST /api/ask with missing question fails with 400', async () => {
      const res = await fetch(`${baseUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: '' })
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, /question is required/i);
    });

    test('POST /api/ask with missing interactionId still answers via API and topic context', async () => {
      const res = await fetch(`${baseUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'How do stomata regulate water loss?',
          topic: 'Photosynthesis'
        })
      });
      assert.equal(res.status, 200);
      const ans = await res.json();
      assert.ok(Array.isArray(ans.blocks) && ans.blocks.length >= 1, 'Must return answer blocks');
      assert.ok(ans.interactionId, 'Must return newly synthesized interactionId');
    });

    test('POST /api/ask with valid interactionId answers follow-up with blackboard blocks', async () => {
      assert.ok(interactionId, 'Need valid interactionId from previous lesson');
      const res = await fetch(`${baseUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'What role does chlorophyll play in this process?',
          interactionId
        })
      });
      assert.equal(res.status, 200);
      const ans = await res.json();
      assert.ok(Array.isArray(ans.blocks) && ans.blocks.length >= 1, 'Must return answer blocks');
      assert.ok(typeof ans.xpReward === 'number', 'Must return xpReward');
      assert.ok(ans.interactionId, 'Must return updated interactionId');
    });
  });

  describe('5. Feynman Sparring & Explanation API (/api/explain)', () => {
    test('POST /api/explain with missing explanation fails with 400', async () => {
      const res = await fetch(`${baseUrl}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Photosynthesis' })
      });
      assert.equal(res.status, 400);
    });

    test('POST /api/explain grades explanation using Feynman technique and returns mastery level', async () => {
      const res = await fetch(`${baseUrl}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Photosynthesis',
          explanation: 'Plants use chloroplasts containing chlorophyll to trap light energy, turning water and carbon dioxide into glucose and oxygen.'
        })
      });
      assert.equal(res.status, 200);
      const evalResult = await res.json();

      assert.ok(typeof evalResult.score === 'number', 'Score must be a number');
      assert.ok(evalResult.score >= 0 && evalResult.score <= 100, 'Score must be between 0 and 100');
      assert.ok(['Developing', 'Solid Grasp', 'Feynman Master'].includes(evalResult.masteryLevel), 'Must be valid mastery level');
      assert.ok(Array.isArray(evalResult.strengths), 'Must have strengths array');
      assert.ok(Array.isArray(evalResult.gaps), 'Must have gaps array');
      assert.ok(evalResult.feedback, 'Must have feedback string');
      assert.ok(typeof evalResult.xpReward === 'number', 'Must reward XP');
    });
  });
});
