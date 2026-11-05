'use strict';

const { lessonSchema, answerSchema } = require('./schema');
const { getSampleLesson, getFallbackLesson } = require('./samples');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL   = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const BLOCKED = ['porn','sex','kill','hack','bomb','drug','weapon','nude','nsfw','gore'];
// Whole-word match (plus common endings) so "skill", "Essex", "hackathon" etc. are NOT blocked.
const BLOCKED_RE = new RegExp('\\b(?:' + BLOCKED.join('|') + ')(?:s|ed|ing|er|ers)?\\b', 'i');
function isBlocked(t) { return BLOCKED_RE.test(t); }

/* ── History sanitiser: never trust history that came back from the client ── */
const MAX_HISTORY_MSGS = 10;
const MAX_MSG_CHARS    = 4000;
function sanitizeHistory(history) {
  if (!Array.isArray(history)) throw Object.assign(new Error('Invalid interactionId'), {status:400});
  const clean = history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({role: m.role, content: m.content.slice(0, MAX_MSG_CHARS)}));
  // keep the first message (the topic) + the most recent ones
  return clean.length > MAX_HISTORY_MSGS
    ? [clean[0], ...clean.slice(-(MAX_HISTORY_MSGS - 1))]
    : clean;
}

/* ── LESSON PROMPT — Master Human Teacher Instructions ──────── */
const LESSON_PROMPT = `
You are Professor Byte, a master educator writing with chalk on a physical blackboard.
You teach with the pedagogical brilliance of Richard Feynman and 3Blue1Brown: crystal clear, vivid, visual, and zero fluff.

Dynamically choose the most effective visual strategy for the topic:
- If visual, physical, or algorithmic: draw diagrams (boxes, arrows, tables, or number lines).
- If mathematical or scientific: write clean formulas and equations.
- If conceptual, philosophical, or historic: use sharp contrast, bullets, and memorable chalk underlines.

Return ONLY valid JSON (no markdown, no extra text outside):
{
  "title": "Short Topic Title (max 5 words)",
  "xpReward": 60-120,
  "difficulty": "Beginner"|"Intermediate"|"Advanced",
  "keyTerms": ["Term 1","Term 2","Term 3"],
  "rabbitHoles": [
    "Fascinating paradox or 'what if' question about this topic?",
    "Surprising counter-intuitive mystery question?",
    "Deep real-world application or edge-case question?"
  ],
  "quiz": [
    {"question":"Core concept check question","options":["A","B","C","D"],"correct":0,"explanation":"One clear sentence why this is right"},
    {"question":"Application or mechanism question","options":["A","B","C","D"],"correct":1,"explanation":"One clear sentence why this is right"},
    {"question":"Edge case or deeper implication question","options":["A","B","C","D"],"correct":2,"explanation":"One clear sentence why this is right"}
  ],
  "funFact": "One mind-blowing fact (max 20 words)",
  "blocks": [
    {"type":"heading","text":"Topic Title"}
    ...3 to 5 additional blocks chosen dynamically to teach this topic with maximum impact...
  ]
}

AVAILABLE BOARD BLOCKS:
1. {"type":"heading","text":"Title"} -> Always the first block.
2. {"type":"text","text":"One punchy, crystal-clear conceptual sentence."}
3. {"type":"bullet","items":["Key point 1","Key point 2","Key point 3"]}
4. {"type":"equation","text":"formula"} -> Pure math/formula text.
5. {"type":"emphasize","text":"Core Rule or Law","style":"underline"|"circle"|"box"}
6. {"type":"diagram","shapes":[
     {"kind":"box"|"rect"|"circle"|"triangle","x":60-700,"y":10-120,"w":110,"h":46,"label":"Label"},
     {"kind":"arrow"|"line","from":[x1,y1],"to":[x2,y2],"label":"Flow"},
     {"kind":"table","x":60,"y":10,"w":320,"h":90,"rows":2,"cols":2,"label":"Comparison"},
     {"kind":"numberline","x":60,"y":10,"w":320,"h":40,"ticks":5,"label":"Scale"}
   ]}
7. {"type":"checkpoint","question":"Think about this: Why does X happen?","hint":"Consider Y"}

STRICT RULES:
- First block MUST be heading.
- Total blocks: 4 to 6 blocks.
- Never write walls of text. Be punchy, memorable, and teach like an expert.
- NO markdown tags, NO text outside the JSON object.
`.trim();

/* ── FOLLOW-UP PROMPT — Adaptive Blackboard Tutor ──────────── */
const FOLLOWUP_PROMPT = `
You are Professor Byte on the blackboard. The student asks a follow-up question.
Act like an expert human tutor: choose whichever blackboard tool best answers their specific question:
- If they ask for a diagram, flow, or visual -> use {"type":"diagram","shapes":[...]}.
- If they ask for a formula or calculation -> use {"type":"equation","text":"..."}.
- If they ask for a comparison -> use a "table" diagram or bullet points.
- If they ask for clarification or examples -> use concise text or emphasize blocks.

Return ONLY valid JSON:
{
  "xpReward": 15-30,
  "blocks": [ ...1 to 3 blocks that directly answer what was asked... ]
}

AVAILABLE BLOCKS:
{"type":"text","text":"Direct, clear answer in 1-2 sentences max"}
{"type":"bullet","items":["point 1","point 2","point 3"]}
{"type":"equation","text":"formula"}
{"type":"emphasize","text":"key takeaway","style":"underline"|"circle"|"box"}
{"type":"diagram","shapes":[
  {"kind":"box"|"circle"|"rect"|"table"|"numberline","x":60,"y":10,"w":120,"h":50,"label":"Text"},
  {"kind":"arrow","from":[x1,y1],"to":[x2,y2],"label":"Flow"}
]}

RULES:
- Choose 1 to 3 blocks only.
- Answer only what was asked. No generic padding.
- NO markdown, NO text outside JSON.
`.trim();

function parseJSON(raw) {
  let s = raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'');
  const a=s.indexOf('{'), b=s.lastIndexOf('}');
  if (a===-1||b===-1) throw new Error('No JSON in response');
  return JSON.parse(s.slice(a,b+1));
}

async function groqChat(messages, maxTokens) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(), 20000);
  try {
    const r = await fetch(GROQ_API_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${GROQ_API_KEY}`},
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        temperature: 0.5,
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
  if (isBlocked(topic)) {
    throw Object.assign(new Error('Please enter an educational topic'), {status:400});
  }

  // Check offline sample library first if no API key is present
  if (!GROQ_API_KEY) {
    const sample = getSampleLesson(topic) || getFallbackLesson(topic);
    return {
      parsed: lessonSchema.parse(sample),
      history: [
        { role: 'system', content: LESSON_PROMPT },
        { role: 'user', content: `Topic: ${topic}` }
      ]
    };
  }

  const msgs = [
    {role:'system', content: LESSON_PROMPT},
    {role:'user',   content: `Topic: ${topic}`},
  ];

  try {
    const raw = await groqChat(msgs, 1500);
    const parsed = parseJSON(raw);
    const validated = lessonSchema.parse(parsed);
    return { parsed: validated, history: msgs };
  } catch (err) {
    // If rate limited or quota exceeded, fall back to high-quality sample/fallback
    const sample = getSampleLesson(topic) || getFallbackLesson(topic);
    if (sample) {
      console.warn('Groq failed, utilizing high-quality fallback lesson:', err.message);
      return { parsed: lessonSchema.parse(sample), history: msgs };
    }
    throw err;
  }
}

async function generateAnswer(question, history) {
  const updated = [...sanitizeHistory(history), {role:'user', content: question}];
  const msgs = [
    {role:'system', content: FOLLOWUP_PROMPT},
    ...updated,
  ];

  if (!GROQ_API_KEY) {
    const fallbackAnswer = {
      xpReward: 15,
      blocks: [
        { type: 'text', text: `Regarding "${question.slice(0, 35)}": Focus on how this principle connects with the rest of the system.` },
        { type: 'emphasize', text: 'Core Connection Verified', style: 'underline' }
      ]
    };
    return {
      parsed: answerSchema.parse(fallbackAnswer),
      history: [...updated, { role: 'assistant', content: JSON.stringify(fallbackAnswer) }]
    };
  }

  try {
    const raw = await groqChat(msgs, 500);
    const parsed = parseJSON(raw);
    const validated = answerSchema.parse(parsed);
    return { parsed: validated, history: [...updated, {role:'assistant', content:raw}] };
  } catch (err) {
    console.warn('Groq answer failed, returning graceful fallback:', err.message);
    const fallbackAnswer = {
      xpReward: 15,
      blocks: [
        { type: 'text', text: `Regarding "${question.slice(0, 35)}": Focus on how this principle connects with the rest of the system.` },
        { type: 'emphasize', text: 'Concept Clarified', style: 'underline' }
      ]
    };
    return {
      parsed: answerSchema.parse(fallbackAnswer),
      history: [...updated, { role: 'assistant', content: JSON.stringify(fallbackAnswer) }]
    };
  }
}

module.exports = {generateLesson, generateAnswer};
