'use strict';
/** public/api.js: the single place the browser talks to the server. Runs in a sandbox with a fake fetch. */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(fetchImpl) {
  const ctx = { fetch: fetchImpl, AbortController, setTimeout, clearTimeout, btoa: s => Buffer.from(s, 'binary').toString('base64'), JSON, unescape, encodeURIComponent };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/api.js'), 'utf8'), ctx);
  return ctx;
}
const reply = (status, body) => async () => ({ ok: status < 400, status, json: async () => { if (body === undefined) throw new Error('not json'); return body; } });

describe('api.js', () => {
  test('apiPost returns parsed JSON on success', async () => {
    const { apiPost } = load(reply(200, { hello: 'world' }));
    assert.deepEqual(await apiPost('/x', { a: 1 }), { hello: 'world' });
  });

  test('server error message is surfaced, with status and offline flag', async () => {
    const { apiPost } = load(reply(503, { error: 'Needs live AI', offline: true }));
    await assert.rejects(() => apiPost('/x', {}), e => e.message === 'Needs live AI' && e.status === 503 && e.offline === true);
  });

  test('non-JSON error body gives a readable fallback message', async () => {
    const { apiPost } = load(reply(502, undefined));
    await assert.rejects(() => apiPost('/x', {}), e => /Server error 502/.test(e.message) && e.offline === false);
  });

  test('a 200 with an unreadable body is an error, not an empty success', async () => {
    const { apiPost } = load(reply(200, undefined));
    await assert.rejects(() => apiPost('/x', {}), /could not read/);
  });

  test('timeout aborts the request with AbortError', async () => {
    const slow = (url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    const { apiPost } = load(slow);
    await assert.rejects(() => apiPost('/x', {}, { timeoutMs: 20 }), e => e.name === 'AbortError');
  });

  test('sends JSON body with the right headers', async () => {
    let seen;
    const { apiPost } = load(async (url, opts) => { seen = { url, opts }; return { ok: true, status: 200, json: async () => ({}) }; });
    await apiPost('/api/ask', { q: 1 });
    assert.equal(seen.url, '/api/ask');
    assert.equal(seen.opts.method, 'POST');
    assert.equal(seen.opts.headers['Content-Type'], 'application/json');
    assert.equal(seen.opts.body, '{"q":1}');
  });

  test('buildInteractionId round-trips and matches what the server decodes', () => {
    const { buildInteractionId } = load(reply(200, {}));
    const id = buildInteractionId('Café physics', { title: 'T' });
    const msgs = JSON.parse(Buffer.from(id, 'base64').toString('utf8'));
    assert.equal(msgs[1].content, 'Topic: Café physics');
    assert.equal(msgs[2].role, 'assistant');
    assert.equal(buildInteractionId('X').length > 10, true);
  });
});
