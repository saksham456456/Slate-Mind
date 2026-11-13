'use strict';
/** Single home for limits and defaults, so they are easy to find and change. */
const LIMITS = {
  topic: 200,
  question: 300,
  explanation: 2000,
  minExplanation: 20,
  interactionId: 60000,
  historyMessages: 10,
  historyChars: 4000,
};

const TIMEOUTS_MS = { groq: 20000, openai: 25000 };

const TOKENS = { lesson: 1500, answer: 500, grade: 500 };

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const MAX_AI_ATTEMPTS = 2; // first try + one repair retry when the JSON is invalid

const DEFAULT_ORIGINS = [
  'https://slate-mind.vercel.app',
  'https://slatmind.vercel.app',
  'http://localhost:3000',
];

/** Exact-match CORS allow-list. Add more with ALLOWED_ORIGINS=https://a.com,https://b.com */
function allowedOrigins(env = process.env) {
  const extra = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}

module.exports = {
  LIMITS, TIMEOUTS_MS, TOKENS, MAX_AI_ATTEMPTS,
  DEFAULT_GROQ_MODEL, DEFAULT_OPENAI_MODEL, allowedOrigins,
};
