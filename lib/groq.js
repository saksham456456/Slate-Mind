'use strict';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL   = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const BLOCKED = ['porn','sex','kill','hack','bomb','drug','weapon','nude','nsfw','gore'];
function isBlocked(t) { return BLOCKED.some(w => t.toLowerCase().includes(w)); }

/* ── LESSON PROMPT — 800 tokens max, 4-5 points only ───────── */
const LESSON_PROMPT = `
You are Professor Byte, an AI teacher writing on a blackboard.
Be EXTREMELY CONCISE. Stick to the topic only. No padding, no filler.

Return ONLY valid JSON (no markdown, no text outside):
{
  "title": "short title (5 words max)",
  "xpReward": 50-120,
  "difficulty": "Beginner"|"Intermediate"|"Advanced",
  "keyTerms": ["term1","term2","term3"],
  "quiz": [
    {"question":"short question","options":["A","B","C","D"],"correct":0,"explanation":"one short sentence"},
    {"question":"short question","options":["A","B","C","D"],"correct":1,"explanation":"one short sentence"},
    {"question":"short question","options":["A","B","C","D"],"correct":2,"explanation":"one short sentence"}
  ],
  "funFact": "one fact, max 15 words",
  "blocks": [ ...EXACTLY 4-5 blocks... ]
}

BLOCKS — pick exactly 4 or 5, no more:
{"type":"heading","text":"topic title"}
{"type":"text","text":"ONE sentence only"}
{"type":"bullet","items":["short point","short point","short point"]}
{"type":"equation","text":"formula"}
{"type":"emphasize","text":"key phrase","style":"underline"|"circle"|"box"}
{"type":"diagram","shapes":[{"kind":"box"|"arrow"|"circle","x":50-700,"y":10-140,"w":110,"h":48,"label":"text","from":[x,y],"to":[x,y]}]}

STRICT RULES:
- heading MUST be first block
- text blocks: ONE sentence max, no exceptions
- bullet: exactly 3 items, each under 8 words
- Total blocks: 4 or 5 only — never more
- keyTerms: exactly 3
- quiz: exactly 3 questions
- funFact: 15 words max
- NO markdown, NO extra text outside the JSON object
`.trim();

/* ── FOLLOW-UP PROMPT — 250 tokens max, 1-2 blocks only ────── */
const FOLLOWUP_PROMPT = `
You are Professor Byte. Answer the question in 1-2 blocks only. Be very brief.

Return ONLY valid JSON:
{
  "xpReward": 10-20,
  "blocks": [ ...1-2 blocks only... ]
}

BLOCKS (choose 1 or 2):
{"type":"text","text":"one or two sentences max"}
{"type":"bullet","items":["point","point","point"]}
{"type":"equation","text":"formula"}
{"type":"emphasize","text":"key phrase","style":"underline"}

RULES: 1-2 blocks MAX. Answer only what was asked. No heading. No padding. NO markdown, NO text outside JSON.
`.trim();

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
  if (isBlocked(topic))
    throw Object.assign(new Error('Please enter an educational topic'), {status:400});
  const msgs = [
    {role:'system', content: LESSON_PROMPT},
    {role:'user',   content: `Topic: ${topic}`},
  ];
  const raw    = await groqChat(msgs, 800);
  const parsed = parseJSON(raw);
  return {parsed, history: msgs};
}

async function generateAnswer(question, history) {
  const updated = [...history, {role:'user', content: question}];
  const msgs = [
    {role:'system', content: FOLLOWUP_PROMPT},
    ...updated.slice(1),
  ];
  const raw    = await groqChat(msgs, 250);
  const parsed = parseJSON(raw);
  return {parsed, history:[...updated, {role:'assistant', content:raw}]};
}

module.exports = {generateLesson, generateAnswer};
