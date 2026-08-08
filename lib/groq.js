'use strict';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL   = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const BLOCKED = ['porn','sex','kill','hack','bomb','drug','weapon','nude','nsfw','gore'];
function isBlocked(t) { return BLOCKED.some(w => t.toLowerCase().includes(w)); }

/* ── LESSON PROMPT — Micro-Learning ───────── */
const LESSON_PROMPT = `You are the Game Master of Slate-Mind, an interactive learning RPG.
Respond ONLY with a valid JSON object containing a "blocks" array.
Each block must have a "type" and a "content" string.

ALLOWED BLOCK TYPES:
- "heading": Level announcements or main titles.
- "text": Short, punchy narrative or lesson text. KEEP IT VERY BRIEF (Max 3 sentences).
- "bullet": Lists or multiple-choice options.
- "equation": Math/science formulas.
- "diagram": MUST BE exactly one of: "circle", "box", "triangle", "arrow", "line".
- "fact": One brief, mind-blowing "Fun Fact".
- "glossary": ONE key vocabulary term and its definition.
- "quiz": A multiple-choice Pop Quiz question.

GAMEPLAY RULES:
1. USE MICRO-LEARNING: Do NOT write a textbook. Keep it lightweight.
2. Introduce the topic, provide exactly ONE "fact", ONE "glossary" term, and END with exactly ONE "quiz" block.
3. CRITICAL: Never cut off your JSON response.`;

/* ── FOLLOW-UP PROMPT — Micro-Learning ────── */
const FOLLOWUP_PROMPT = `You are the Game Master of Slate-Mind.
Respond ONLY with a valid JSON object containing a "blocks" array.

ALLOWED BLOCK TYPES:
- "heading", "text", "bullet", "equation", "diagram", "emphasize"

GAMEPLAY RULES:
1. Evaluate the user's previous answer/question.
2. If they answered a quiz correctly, use "emphasize" to praise them and grant XP. If incorrect, give a short hint.
3. Keep the response to 2-3 short blocks maximum.
4. CRITICAL: Never cut off your JSON response.`;

function parseJSON(raw) {
  let s = raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'');
  const a=s.indexOf('{'), b=s.lastIndexOf('}');
  if (a===-1||b===-1) throw new Error('No JSON in response');
  return JSON.parse(s.slice(a,b+1));
}

async function groqChat(messages, maxTokens) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(), 20000);
  try {
    const r = await fetch(GROQ_API_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${GROQ_API_KEY}`},
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_completion_tokens: maxTokens,
        temperature: 0.6,
        response_format: {type:'json_object'},
        messages,
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`Groq ${r.status}: ${await r.text()}`);
    const d = await r.json();
    return d.choices?.[0]?.message?.content ?? '';
  } finally { clearTimeout(timer); }
}

async function generateLesson(topic) {
  if (isBlocked(topic))
    throw Object.assign(new Error('Please enter an educational topic'), {status:400});
  const msgs = [
    {role:'system', content: LESSON_PROMPT},
    {role:'user',   content: `Topic: ${topic}`},
  ];
  const raw    = await groqChat(msgs, 2500);
  const parsed = parseJSON(raw);
  return {parsed, history: msgs};
}

async function generateAnswer(question, history) {
  let updated = [...history, {role:'user', content: question}];
  const msgs = [
    {role:'system', content: FOLLOWUP_PROMPT},
    ...updated.slice(1),
  ];
  const raw    = await groqChat(msgs, 2500);
  const parsed = parseJSON(raw);

  updated.push({role:'assistant', content:raw});
  if (updated.length > 9) {
    updated = [updated[0], ...updated.slice(-8)];
  }

  return {parsed, history:updated};
}

module.exports = {generateLesson, generateAnswer};
