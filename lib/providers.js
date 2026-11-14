'use strict';
const {
  TIMEOUTS_MS, DEFAULT_GEMINI_MODEL, FALLBACK_GEMINI_MODEL,
} = require('./config');
const { httpError } = require('./http');

/** Ignores empty keys and the placeholders shipped in .env.example (e.g. your_gemini_key_here). */
const realKey = key => Boolean(key) && !/your[_-]/i.test(key);

/** Gemini endpoint builder: supports GEMINI_API_URL override (e.g. mock server in tests). */
function buildGeminiUrl(model, env = process.env) {
  if (env.GEMINI_API_URL) return env.GEMINI_API_URL;
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

/** Formats chat messages from OpenAI style to Gemini's native API format */
function formatGeminiPayload(messages, maxTokens) {
  let systemInstruction;
  const sysParts = [];
  const rawContents = [];

  for (const m of (messages || [])) {
    if (!m) continue;
    if (m.role === 'system') {
      if (m.content) sysParts.push(m.content);
    } else {
      rawContents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        text: m.content || '',
      });
    }
  }

  if (sysParts.length) {
    systemInstruction = {
      parts: [{ text: sysParts.join('\n\n') }],
    };
  }

  // Gemini requires alternating roles (user <-> model) and starting with user
  const contents = [];
  for (const item of rawContents) {
    if (contents.length === 0 && item.role === 'model') {
      // Contents cannot begin with model
      continue;
    }
    if (contents.length > 0 && contents[contents.length - 1].role === item.role) {
      // Merge consecutive identical roles
      contents[contents.length - 1].parts[0].text += `\n\n${item.text}`;
    } else {
      contents.push({
        role: item.role,
        parts: [{ text: item.text }],
      });
    }
  }

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = systemInstruction;
  }

  return payload;
}

/** Providers that have a key, in priority order. Read at call time so tests can swap env. */
function providers(env = process.env) {
  const list = [];
  if (realKey(env.GEMINI_API_KEY)) {
    const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    list.push({
      name: 'gemini',
      key: env.GEMINI_API_KEY,
      timeoutMs: TIMEOUTS_MS.gemini || 25000,
      url: (m) => buildGeminiUrl(m || model, env),
      model,
    });
  }
  return list;
}

const hasLiveAI = () => providers().length > 0;

async function callProvider(p, messages, maxTokens) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), p.timeoutMs);
  try {
    let activeModel = p.model;
    let url = p.url(activeModel);
    const payload = formatGeminiPayload(messages, maxTokens);

    let r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': p.key,
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });

    // Seamless resilience: if Gemini 2.0 Flash hits 429 or 503, immediately try Gemini 1.5 Flash
    if ((r.status === 429 || r.status === 503) && activeModel !== FALLBACK_GEMINI_MODEL && !process.env.GEMINI_API_URL) {
      activeModel = FALLBACK_GEMINI_MODEL;
      url = p.url(activeModel);
      r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': p.key,
        },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
    }

    if (!r.ok) {
      const errText = (await r.text()).slice(0, 200);
      throw new Error(`${p.name} ${r.status}: ${errText}`);
    }

    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      || data.choices?.[0]?.message?.content;

    if (!text || !text.trim()) {
      const reason = data.candidates?.[0]?.finishReason || 'empty';
      throw new Error(`${p.name}: empty reply (${reason})`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Tries each configured provider in order and returns the first reply text. */
async function aiChat(messages, maxTokens) {
  const list = providers();
  if (!list.length) {
    throw httpError(503, 'No live AI is connected (set GEMINI_API_KEY).', { offline: true });
  }
  const failures = [];
  for (const p of list) {
    try {
      return await callProvider(p, messages, maxTokens);
    } catch (err) {
      failures.push(err.name === 'AbortError' ? `${p.name}: timed out` : err.message);
      console.warn(`AI provider failed -> ${failures[failures.length - 1]}`);
    }
  }
  throw httpError(503, 'The AI service is busy right now. Please try again in a moment.', { detail: failures });
}

module.exports = { providers, hasLiveAI, aiChat };
