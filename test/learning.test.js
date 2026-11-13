'use strict';
/** learning.js: spaced revision, insights, teacher reports. Pure logic, no browser needed. */
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const DAY = 864e5;
const NOW = Date.UTC(2026, 10, 12);
const Q = (n, extra = {}) => ({ question: `Question ${n}?`, options: ['a', 'b', 'c', 'd'], correct: 1, explanation: 'because', reteach: 'like a door', ...extra });

let L, state;
beforeEach(() => {
  const win = { localStorage: { getItem: () => null, setItem() {} }, document: {}, addEventListener() {} };
  win.window = win;
  const ctx = vm.createContext({ window: win, document: win.document, localStorage: win.localStorage, console, Date, Math, JSON, Array, Set, Map, Number, String, Object, Blob: class {} });
  for (const f of ['state.js', 'learning.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../public', f), 'utf8'), ctx);
  L = ctx;
  state = L.ensureLearningState({ playerName: 'Asha', currentStreak: 3, lessonsCompleted: 4 });
});

describe('answer tracking and the revision deck', () => {
  test('a wrong answer creates a card due in 1 day, with the alternative explanation saved', () => {
    const card = L.recordAnswer(state, 'Photosynthesis', Q(1), false, NOW);
    assert.equal(state.deck.length, 1);
    assert.equal(card.due, NOW + DAY);
    assert.equal(card.reteach, 'like a door');
    assert.deepEqual({ ...state.topicStats.Photosynthesis }, { right: 0, wrong: 1, last: NOW });
  });

  test('missing the same question twice keeps one card and resets its progress', () => {
    L.recordAnswer(state, 'T', Q(1), false, NOW);
    state.deck[0].box = 2;
    L.recordAnswer(state, 'T', Q(1), false, NOW + 1000);
    assert.equal(state.deck.length, 1);
    assert.equal(state.deck[0].box, 0);
  });

  test('a correct answer in a normal quiz does not touch the deck', () => {
    L.recordAnswer(state, 'T', Q(1), false, NOW);
    const before = JSON.stringify(state.deck);
    L.recordAnswer(state, 'T', Q(1), true, NOW + 5);
    assert.equal(JSON.stringify(state.deck), before);
    assert.equal(state.topicStats.T.right, 1);
  });

  test('correct answers during revision walk the card through 1, 3, 7, 14 days and then retire it', () => {
    const card = L.recordAnswer(state, 'T', Q(1), false, NOW);
    const asRevision = { ...Q(1), _cardKey: card.key };
    const gaps = [];
    for (let i = 0; i < 3; i++) {
      L.recordAnswer(state, 'T', asRevision, true, NOW);
      gaps.push((state.deck[0].due - NOW) / DAY);
    }
    assert.deepEqual(gaps, [3, 7, 14]);
    L.recordAnswer(state, 'T', asRevision, true, NOW);
    assert.equal(state.deck.length, 0, 'mastered card is retired');
  });

  test('a wrong answer during revision sends the card back to the start', () => {
    const card = L.recordAnswer(state, 'T', Q(1), false, NOW);
    card.box = 2;
    L.recordAnswer(state, 'T', { ...Q(1), _cardKey: card.key }, false, NOW);
    assert.equal(state.deck[0].box, 0);
    assert.equal(state.deck[0].due, NOW + DAY);
  });

  test('the deck is capped so storage cannot grow forever', () => {
    for (let i = 0; i < 75; i++) L.recordAnswer(state, 'T', Q(i), false, NOW);
    assert.equal(state.deck.length, 60);
    assert.ok(state.deck.every(c => c.question !== 'Question 0?'), 'oldest cards drop first');
  });

  test('revisionSet returns due cards first, otherwise the soonest as optional practice', () => {
    L.recordAnswer(state, 'T', Q(1), false, NOW - 3 * DAY);   // due 2 days ago
    L.recordAnswer(state, 'T', Q(2), false, NOW);             // due tomorrow
    assert.deepEqual([...L.revisionSet(state, NOW).map(c => c.question)], ['Question 1?']);
    state.deck[0].due = NOW + 9 * DAY;
    assert.equal(L.revisionSet(state, NOW).length, 2, 'nothing due: practise early');
    assert.equal(L.revisionSet(state, NOW, 1).length, 1, 'limit respected');
    assert.equal(L.dueCards(state, NOW).length, 0);
  });

  test('an old saved state without learning fields is upgraded safely', () => {
    const old = L.ensureLearningState({ totalXP: 40, a11y: { bigText: true } });
    assert.equal(old.profile.level, 'Class 11-12');
    assert.equal(old.a11y.bigText, true);
    assert.equal(old.a11y.contrast, false);
    assert.deepEqual([...old.deck], []);
  });
});

describe('insights', () => {
  test('accuracy, weak and strong topics need enough evidence', () => {
    state.topicStats = {
      Algebra: { right: 1, wrong: 4, last: 1 },      // 20%: weak
      Optics: { right: 4, wrong: 1, last: 2 },       // 80%: strong
      Fresh: { right: 0, wrong: 1, last: 3 },        // one answer only: not judged yet
    };
    const ins = L.computeInsights(state, NOW);
    assert.equal(ins.attempts, 11);
    assert.deepEqual([...ins.weak], ['Algebra']);
    assert.deepEqual([...ins.strong], ['Optics']);
    assert.equal(ins.topics[0].topic, 'Fresh', 'worst first');
    assert.equal(ins.streak, 3);
  });

  test('no answers means zeros, never NaN', () => {
    const ins = L.computeInsights(state, NOW);
    assert.equal(ins.accuracy, 0);
    assert.equal(ins.attempts, 0);
    assert.equal(ins.weak.length, 0);
  });
});

describe('teacher reports (no accounts)', () => {
  const studentState = (name, stats) => L.ensureLearningState({ playerName: name, topicStats: stats, currentStreak: 1, lessonsCompleted: 2, deck: [{ key: 'k', question: 'SECRET QUESTION', due: 0 }] });

  test('a report holds scores only: no questions, no history, no name unless opted in', () => {
    const s = studentState('Asha', { Algebra: { right: 1, wrong: 3, last: 1 } });
    const anon = L.buildReport(s, { now: NOW });
    assert.equal(anon.kind, 'slatemind-report');
    assert.equal(anon.name, undefined);
    assert.ok(!JSON.stringify(anon).includes('SECRET QUESTION'));
    assert.deepEqual(Object.keys(anon).sort(), ['accuracy', 'attempts', 'created', 'kind', 'lessons', 'streak', 'topics', 'v']);
    assert.equal(L.buildReport(s, { includeName: true, now: NOW }).name, 'Asha');
  });

  test('merging reports finds the topic the class struggles with', () => {
    const r = (stats) => L.buildReport(studentState('x', stats), { now: NOW });
    const merged = L.mergeReports([
      r({ Algebra: { right: 1, wrong: 4, last: 1 }, Optics: { right: 5, wrong: 0, last: 1 } }),
      r({ Algebra: { right: 0, wrong: 3, last: 1 }, Optics: { right: 4, wrong: 1, last: 1 } }),
      r({ Algebra: { right: 4, wrong: 1, last: 1 } }),
    ]);
    assert.equal(merged.students, 3);
    assert.equal(merged.topics[0].topic, 'Algebra');
    assert.equal(merged.topics[0].strugglers, 2);
    assert.equal(merged.topics[0].students, 3);
    assert.deepEqual([...merged.reteach], ['Algebra']);
  });

  test('files that are not valid reports are counted and ignored', () => {
    const good = L.buildReport(studentState('x', { A: { right: 2, wrong: 0, last: 1 } }), { now: NOW });
    const merged = L.mergeReports([
      good, null, { kind: 'something-else', topics: [] }, { kind: 'slatemind-report', topics: 'nope' },
      { kind: 'slatemind-report', topics: [{ topic: 'A', right: -5, wrong: 'x' }] },
    ]);
    assert.equal(merged.students, 1);
    assert.equal(merged.rejected, 4);
    assert.equal(merged.accuracy, 1);
  });

  test('empty input is safe', () => {
    const merged = L.mergeReports([]);
    assert.equal(merged.students, 0);
    assert.equal(merged.accuracy, 0);
  });
});

describe('read aloud text', () => {
  test('turns every block type into speakable text and skips empty ones', () => {
    const parts = L.blocksToSpeech([
      { type: 'heading', text: 'Light' }, { type: 'bullet', items: ['fast', 'straight'] },
      { type: 'diagram', shapes: [{ label: 'Sun' }, { label: '' }, { label: 'Eye' }] },
      { type: 'checkpoint', question: 'Why?' }, { type: 'text', text: '' },
    ]);
    assert.deepEqual([...parts], ['Light', 'fast. straight', 'Sun, Eye', 'Why?']);
  });
});
