/* ═══════════════════════════════════════════════════════════════
   SlateMind — api.js
   One place for talking to the server: timeout, error mapping,
   and the "interaction id" that carries lesson context to follow-ups.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/**
 * POST JSON and return the parsed reply.
 * Throws an Error whose message is safe to show; err.offline is true when the
 * server said it has no live AI, err.name === 'AbortError' on timeout.
 */
async function apiPost(url, body, { timeoutMs = 30000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    let data = null;
    try { data = await res.json(); } catch { /* body was not JSON */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Server error ${res.status}`);
      err.status = res.status;
      err.offline = Boolean(data && data.offline);
      throw err;
    }
    if (data === null) throw new Error('The server sent a reply we could not read.');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Builds the base64 conversation the server expects for follow-ups when it did not
 * issue one (offline samples, history recall). Returns null if encoding fails.
 */
function buildInteractionId(topic, lesson) {
  const messages = [
    { role: 'system', content: 'You are Professor Byte, master blackboard teacher.' },
    { role: 'user', content: `Topic: ${topic}` },
  ];
  if (lesson) messages.push({ role: 'assistant', content: JSON.stringify(lesson) });
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(messages))));
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.apiPost = apiPost;
  window.buildInteractionId = buildInteractionId;
}
