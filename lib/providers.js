'use strict';
const {
  TIMEOUTS_MS, DEFAULT_GROQ_MODEL, DEFAULT_OPENAI_MODEL,
} = require('./config');
const { httpError } = require('./http');

let warnedModel = false;

/** Ignores empty keys and the placeholders shipped in .env.example (e.g. gsk_your_groq_key_here). */
const realKey = key => Boolean(key) && !/your[_-]/i.test(key);

/** Providers that have a key, in priority order. Read at call time so tests can swap env. */
function providers(env = process.env) {
  const list = [];
  if (realKey(env.GROQ_API_KEY)) {
    const wanted = env.GROQ_MODEL;
    const retired = wanted && wanted.includes('gpt-oss-120b');
    if (retired && !warnedModel) {
      warnedModel = true;
      console.warn(`GROQ_MODEL=${wanted} is not used; falling back to ${DEFAULT_GROQ_MODEL}.`);
    }
    list.push({
      name: 'groq', key: env.GROQ_API_KEY, timeoutMs: TIMEOUTS_MS.groq,
      url: env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
      model: wanted && !retired ? wanted : DEFAULT_GROQ_MODEL,
    });
  }
  if (realKey(env.OPENAI_API_KEY)) {
    list.push({
      name: 'openai', key: env.OPENAI_API_KEY, timeoutMs: TIMEOUTS_MS.openai,
      url: env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
      model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
    });
  }
  return list;
}

const hasLiveAI = () => providers().length > 0;

async function callProvider(p, messages, maxTokens) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), p.timeoutMs);
  try {
    const r = await fetch(p.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
      body: JSON.stringify({
        model: p.model, max_tokens: maxTokens, temperature: 0.5,
        response_format: { type: 'json_object' }, messages,
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`${p.name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text || !text.trim()) throw new Error(`${p.name}: empty reply`);
    return text;
  } finally { clearTimeout(timer); }
}

/** Tries each configured provider in order and returns the first reply text. */
async function aiChat(messages, maxTokens) {
  const list = providers();
  if (!list.length) {
    throw httpError(503, 'No live AI is connected (set GROQ_API_KEY or OPENAI_API_KEY).', { offline: true });
  }
  const failures = [];
  for (const p of list) {
    try { return await callProvider(p, messages, maxTokens); }
    catch (err) {
      failures.push(err.name === 'AbortError' ? `${p.name}: timed out` : err.message);
      console.warn(`AI provider failed -> ${failures[failures.length - 1]}`);
    }
  }
  throw httpError(503, 'The AI service is busy right now. Please try again in a moment.', { detail: failures });
}

module.exports = { providers, hasLiveAI, aiChat };
