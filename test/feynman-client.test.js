'use strict';
/** The Feynman panel must never show an invented grade: no score, badge or XP unless the server graded it. */
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = f => fs.readFileSync(path.join(__dirname, '../public', f), 'utf8');

function sandbox(fetchImpl) {
  const els = new Map();
  const element = id => {
    if (!els.has(id)) els.set(id, { id, style: {}, textContent: '', value: '', className: '', classList: { add() {}, remove() {}, toggle() {} }, focus() {}, select() {}, addEventListener() {} });
    return els.get(id);
  };
  const store = new Map();
  const document = {
    getElementById: element, querySelector: () => null, querySelectorAll: () => [], createElement: () => element('tmp'),
    documentElement: { style: { setProperty() {} } }, body: { appendChild() {} },
  };
  const win = { document, addEventListener() {}, dispatchEvent() {}, innerWidth: 1920, innerHeight: 1080,
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) } };
  win.window = win;
  const ctx = vm.createContext({ window: win, document, localStorage: win.localStorage, console, setTimeout, clearTimeout, Date, Math, JSON, Array, Set, Map, String, Number,
    fetch: fetchImpl, AbortController, btoa: s => Buffer.from(s, 'binary').toString('base64'), unescape, encodeURIComponent });
  for (const f of ['state.js', 'gamification.js', 'api.js', 'quiz.js', 'learning.js']) vm.runInContext(read(f), ctx);
  // Replace the visual side effects; keep the real logic under test
  vm.runInContext('window.__xp = 0; awardXP = a => { window.__xp += a; }; showGameNotif = () => {};', ctx);
  win.lastTopic = 'Photosynthesis';
  element('feynmanInput').value = 'Plants use light to make their own food from water and air.';
  return { ctx, win, element };
}

const serverReply = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });

describe('Feynman panel (quiz.js)', () => {
  let t;
  beforeEach(() => { t = null; });

  test('shows the real grade, badge and XP when the server graded the answer', async () => {
    t = sandbox(serverReply(200, { score: 82, masteryLevel: 'Solid Grasp', feedback: 'Nice work.', xpReward: 30, chalkCorrection: '' }));
    await t.ctx.handleFeynmanSubmit();
    assert.equal(t.element('feynmanScore').textContent, '82%');
    assert.equal(t.element('feynmanFeedback').textContent, 'Nice work.');
    assert.match(t.element('feynmanBadge').textContent, /Solid Grasp/);
    assert.equal(t.win.__xp, 30);
  });

  test('server says "needs live AI": no score, no badge, no XP', async () => {
    t = sandbox(serverReply(503, { error: 'Feynman grading needs a live AI connection. Please go online and try again.', offline: true }));
    await t.ctx.handleFeynmanSubmit();
    assert.equal(t.element('feynmanScore').textContent, '—');
    assert.match(t.element('feynmanFeedback').textContent, /live AI connection/);
    assert.equal(t.element('feynmanBadge').style.display, 'none');
    assert.equal(t.win.__xp, 0);
  });

  test('network failure: no invented 75%, no XP', async () => {
    t = sandbox(async () => { throw new TypeError('Failed to fetch'); });
    await t.ctx.handleFeynmanSubmit();
    const shown = t.element('feynmanScore').textContent;
    assert.ok(!/\d+%/.test(shown), `unexpected score shown: ${shown}`);
    assert.equal(t.win.__xp, 0);
    assert.notEqual(t.element('feynmanFeedback').textContent, '');
  });

  test('a graded Feynman Master gets no retry button; sparring does', async () => {
    t = sandbox(serverReply(200, { score: 92, masteryLevel: 'Feynman Master', feedback: 'Excellent.', xpReward: 45, chalkCorrection: '' }));
    await t.ctx.handleFeynmanSubmit();
    assert.equal(t.element('feynmanRetryBtn').style.display, 'none');
    t = sandbox(serverReply(200, { score: 55, masteryLevel: 'Developing', feedback: 'Keep going.', xpReward: 10, chalkCorrection: 'Recall X' }));
    await t.ctx.handleFeynmanSubmit();
    assert.equal(t.element('feynmanRetryBtn').style.display, 'block');
  });

  test('button is re-enabled after success and after failure', async () => {
    t = sandbox(async () => { throw new Error('boom'); });
    await t.ctx.handleFeynmanSubmit();
    assert.equal(t.element('feynmanSubmitBtn').disabled, false);
  });

  test('rejects explanation under 20 characters before making network request', async () => {
    let called = false;
    t = sandbox(async () => { called = true; return { ok: true, json: async () => ({}) }; });
    t.element('feynmanInput').value = 'Too short';
    await t.ctx.handleFeynmanSubmit();
    assert.equal(called, false);
    assert.match(t.element('feynmanFeedback').textContent, /at least 20 characters/);
  });
});
