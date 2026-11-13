'use strict';
const { LIMITS } = require('./config');

/** Error whose message is safe to show to the user. */
function httpError(status, message, extra = {}) {
  return Object.assign(new Error(message), { status, expose: true }, extra);
}

function requirePost(req) {
  if (req.method !== 'POST') throw httpError(405, 'Method not allowed');
}

function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { throw httpError(400, 'Invalid JSON'); }
  }
  return body && typeof body === 'object' ? body : {};
}

/** Required trimmed string with a max length. */
function cleanText(value, max, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw httpError(400, `${label} is required`);
  if (text.length > max) throw httpError(400, `${label} is too long`);
  return text;
}

const encodeHistory = history => Buffer.from(JSON.stringify(history)).toString('base64');

/** Returns an array, or null when the id is missing, too large or unreadable. */
function decodeHistory(id) {
  if (typeof id !== 'string' || !id.trim() || id.length > LIMITS.interactionId) return null;
  try {
    const history = JSON.parse(Buffer.from(id, 'base64').toString('utf8'));
    return Array.isArray(history) && history.length ? history : null;
  } catch { return null; }
}

/**
 * One place that turns any error into a JSON response.
 * Only messages we wrote ourselves (expose: true) reach the user: raw provider
 * errors can contain upstream response bodies and must stay in the server log.
 */
function sendError(res, label, err) {
  const status = err.status || (err.name === 'AbortError' ? 504 : 500);
  if (status >= 500) console.error(label, err.message, err.detail || '');
  const message = err.expose ? err.message
    : status === 504 ? 'The AI took too long to answer. Please try again.'
    : 'Something went wrong on our side. Please try again.';
  res.status(status).json({ error: message, ...(err.offline ? { offline: true } : {}) });
}

module.exports = { httpError, requirePost, readBody, cleanText, encodeHistory, decodeHistory, sendError };
