'use strict';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL   = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/* ── Topic blocklist (server-side) ──────────────────────────── */
const BLOCKED_WORDS = ['porn','sex','kill','hack','bomb','drug','weapon','nude','nsfw','gore'];
function isBlockedTopic(topic) {
  const lower = topic.toLowerCase();
  return BLOCKED_WORDS.some(w => lower.includes(w));
}

/* ── System prompts ─────────────────────────────────────────── */
const TEACHER_SYSTEM_INSTRUCTION = `
You are Professor Byte, a legendary AI teacher who delivers EXTREMELY CONCISE, direct lessons on a blackboard.
Your lessons are structured for CBSE students aged 14–18.

CRITICAL RULES:
- Write SHORT, CONCISE lessons. MAXIMUM 1-2 blocks or 4-5 points.
- Strictly stick to the topic. Do not include filler text.
- Include exactly ONE example per concept. No fluff.
- Be token-efficient. Answer exactly what is asked.

RESPOND ONLY WITH a valid JSON object with this exact shape:
{
  "title": "clear descriptive lesson title",
  "xpReward": <integer 10-50, based on topic complexity>,
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "keyTerms": ["term1", "term2"],
  "quiz": [
    {
      "question": "specific question testing real understanding",
      "options": ["option A", "option B", "option C", "option D"],
      "correct": 0,
      "explanation": "brief explanation"
    }
  ],
  "funFact": "one brief surprising fact",
  "blocks": [...]
}

REQUIRED BLOCK SEQUENCE (Maximum 2-3 blocks):
1. heading — the main lesson title
2. text OR bullet — core concept with extremely brief explanation (max 4-5 points)
3. (optional) bullet — one practical example

BLOCK TYPES:
  {"type":"heading","text":"..."}
  {"type":"text","text":"concise explanation"}
  {"type":"bullet","items":["point 1","point 2"]}
  {"type":"equation","text":"formula"}
  {"type":"emphasize","text":"important phrase","style":"circle"|"underline"|"box"}
  {"type":"checkpoint","question":"thought-provoking question","hint":"helpful hint"}

DO NOT include markdown, code fences, or any text outside the JSON object.
`.trim();

const FOLLOWUP_SYSTEM_INSTRUCTION = `
You are Professor Byte, an AI teacher answering a follow-up question.
Provide an EXTREMELY CONCISE, DIRECT response. No filler.

RESPOND ONLY WITH a valid JSON object:
{
  "xpReward": <integer 10-20>,
  "blocks": [...]
}

RULES:
- Maximum 1-2 blocks.
- Stick strictly to the topic. Answer EXACTLY what is asked.
- No markdown or text outside the JSON.
`.trim();

/* ── JSON Parser ─────────────────────────────────────────────── */
function parseBlockJSON(raw) {
  let cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

/* ── Groq API Call with timeout ─────────────────────────────── */
async function groqChat(messages, timeoutMs = 25000) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 800,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timer);
  }
}

/* ── Public API ──────────────────────────────────────────────── */
async function generateLesson(topic) {
  if (isBlockedTopic(topic)) {
    throw Object.assign(new Error('Please enter an educational topic'), { status: 400 });
  }

  const messages = [
    { role: 'system', content: TEACHER_SYSTEM_INSTRUCTION },
    { role: 'user',   content: `Teach me about: ${topic}. Keep it EXTREMELY brief and direct as per instructions.` },
  ];
  const raw    = await groqChat(messages);
  const parsed = parseBlockJSON(raw);
  return { parsed, history: messages };
}

async function generateAnswer(question, history) {
  const updatedHistory = [...history, { role: 'user', content: question }];
  const messages = [
    { role: 'system', content: FOLLOWUP_SYSTEM_INSTRUCTION },
    ...updatedHistory.slice(1),
  ];
  const raw    = await groqChat(messages);
  const parsed = parseBlockJSON(raw);
  return {
    parsed,
    history: [...updatedHistory, { role: 'assistant', content: raw }],
  };
}

module.exports = { generateLesson, generateAnswer, isBlockedTopic };
