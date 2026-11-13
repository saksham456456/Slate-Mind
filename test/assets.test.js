'use strict';
/** Guards against the classic PWA/deploy mistakes: a file listed but missing, or a script that is not cached. */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pub = p => path.join(__dirname, '../public', p);
const sw = fs.readFileSync(pub('sw.js'), 'utf8');
const html = fs.readFileSync(pub('index.html'), 'utf8');
const assets = [...sw.matchAll(/'(\/[^']*)'/g)].map(m => m[1]).filter(p => p !== '/' && !p.startsWith('/api/'));

describe('app shell', () => {
  test('every file the service worker precaches exists', () => {
    for (const a of assets) assert.ok(fs.existsSync(pub(a)), `missing precached file ${a}`);
  });

  test('every local <script> and stylesheet in index.html is precached', () => {
    const used = [...html.matchAll(/(?:src|href)="\/?([\w./-]+\.(?:js|css))"/g)].map(m => '/' + m[1]);
    assert.ok(used.length >= 10);
    for (const u of used) assert.ok(assets.includes(u), `${u} is used by index.html but not precached`);
  });

  test('manifest icons are real PNG files (not inline data URLs)', () => {
    const manifest = JSON.parse(fs.readFileSync(pub('manifest.json'), 'utf8'));
    for (const icon of manifest.icons) {
      assert.match(icon.src, /^\/icons\/.+\.png$/);
      const bytes = fs.readFileSync(pub(icon.src));
      assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    }
    assert.ok(manifest.icons.some(i => i.sizes === '192x192') && manifest.icons.some(i => i.sizes === '512x512'));
  });

  test('api.js loads before the scripts that use it', () => {
    const order = [...html.matchAll(/<script src="([\w.]+)"/g)].map(m => m[1]);
    assert.ok(order.indexOf('api.js') !== -1 && order.indexOf('api.js') < order.indexOf('app.js'));
    assert.ok(order.indexOf('api.js') < order.indexOf('quiz.js'));
  });
});
