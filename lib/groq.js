'use strict';
const { lessonSchema, answerSchema } = require('./schema');
const { getSampleLesson, getFallbackLesson } = require('./samples');
const { LIMITS, TOKENS, MAX_AI_ATTEMPTS } = require('./config');
const { httpError } = require('./http');
const { aiChat, hasLiveAI } = require('./providers');


const BLOCKED = ['porn','sex','kill','hack','bomb','drug','weapon','nude','nsfw','gore'];
// Whole-word match (plus common endings) so "skill", "Essex", "hackathon" etc. are NOT blocked.
const BLOCKED_RE = new RegExp('\\b(?:' + BLOCKED.join('|') + ')(?:s|ed|ing|er|ers)?\\b', 'i');
function isBlocked(t) { return BLOCKED_RE.test(t); }

/* ── History sanitiser: never trust history that came back from the client ── */
const MAX_HISTORY_MSGS = LIMITS.historyMessages;
const MAX_MSG_CHARS    = LIMITS.historyChars;
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
    {"question":"Core concept check question","options":["A","B","C","D"],"correct":0,"explanation":"One clear sentence why this is right","reteach":"Same idea via a different everyday analogy (max 25 words)"},
    {"question":"Application or mechanism question","options":["A","B","C","D"],"correct":1,"explanation":"One clear sentence why this is right","reteach":"Same idea via a different everyday analogy (max 25 words)"},
    {"question":"Edge case or deeper implication question","options":["A","B","C","D"],"correct":2,"explanation":"One clear sentence why this is right","reteach":"Same idea via a different everyday analogy (max 25 words)"}
  ],
  "funFact": "One mind-blowing fact (max 20 words)",
  "careers": ["Role: how it uses this topic (max 12 words)", "Role: ...", "Role: ..."],
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
  const s = raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'');
  const a=s.indexOf('{'), b=s.lastIndexOf('}');
  if (a===-1||b===-1) throw new Error('No JSON in response');
  return JSON.parse(s.slice(a,b+1));
}


/* ── Persona Styles ─────────────────────────────────────────── */
const PERSONA_STYLES = {
  mentor: "Persona: Warm, encouraging mentor. Celebrate curiosity and make complex ideas intuitive, engaging, and approachable.",
  coach: "Persona: Rigorous, high-standard coach. Demand conceptual precision, challenge assumptions, and cut straight to the core mechanics with no fluff.",
  eli10: "Persona: ELI10 master simplifier. Use everyday physical analogies, vivid metaphors, zero academic jargon, and crystal clarity.",
  storyteller: "Persona: Gripping storyteller. Frame concepts through historic discovery, human drama, narrative suspense, and the journey of revelation."
};


/* ── Learner personalisation (whitelisted: the browser can never inject prompt text) ── */
const LEARNER_LEVELS = ['Beginner', 'Class 6-8', 'Class 9-10', 'Class 11-12', 'College'];
const LEARNER_LANGS  = ['English', 'Hindi', 'Hinglish'];

function personalise(options = {}) {
  const lines = [];
  if (LEARNER_LEVELS.includes(options.level)) {
    lines.push(`Student level: ${options.level}. Match vocabulary, depth and examples to it.`);
  }
  const language = LEARNER_LANGS.includes(options.language) ? options.language : 'English';
  if (language === 'Hindi') {
    lines.push('Write ALL human-readable text in Hindi (Devanagari script). Keep JSON keys and "type" values in English.');
  } else if (language === 'Hinglish') {
    lines.push('Write ALL human-readable text in Hinglish (Hindi in Roman script mixed with simple English). Keep JSON keys and "type" values in English.');
  }
  return lines.length ? `\n\nSTUDENT PERSONALISATION:\n${lines.join('\n')}` : '';
}

/** Human-readable reason a reply was rejected (sent back to the model on the repair retry). */
function describeProblem(err) {
  const issues = err && err.issues;
  const text = Array.isArray(issues)
    ? issues.map(i => `${i.path.join('.') || 'reply'}: ${i.message}`).join('; ')
    : (err && err.message) || 'invalid JSON';
  return text.slice(0, 300);
}

/**
 * Calls the AI and validates the JSON. If the reply is unusable it asks once more,
 * telling the model what was wrong. Provider outages are not retried here:
 * aiChat already walks the provider list.
 */
async function generateValidated(baseMessages, maxTokens, schema) {
  let messages = baseMessages, lastProblem = '';
  for (let attempt = 0; attempt < MAX_AI_ATTEMPTS; attempt++) {
    const raw = await aiChat(messages, maxTokens);
    try {
      return schema.parse(parseJSON(raw));
    } catch (err) {
      lastProblem = describeProblem(err);
      messages = [
        ...baseMessages,
        { role: 'assistant', content: raw.slice(0, 3000) },
        { role: 'user', content: `Your reply was invalid (${lastProblem}). Return ONLY the corrected JSON object.` },
      ];
    }
  }
  throw httpError(502, 'The AI sent back an unusable reply. Please try again.', { detail: lastProblem });
}

/** A generic outline for an unknown topic when no live AI answered. Always flagged offline. */
function offlineLesson(topic) {
  return { ...lessonSchema.parse(getFallbackLesson(topic)), offline: true };
}

async function generateLesson(topic, options = {}) {
  if (isBlocked(topic)) throw httpError(400, 'Please enter an educational topic');

  const personaTone = PERSONA_STYLES[options?.teachStyle] || PERSONA_STYLES.mentor;
  const systemPrompt = `${LESSON_PROMPT}\n\nTEACHER PERSONA & TONE:\n${personaTone}${personalise(options)}`;
  const userMsg = { role: 'user', content: `Topic: ${topic}` };

  // 1. Hand-written master lessons: instant, guaranteed quality
  const sample = getSampleLesson(topic);
  if (sample) {
    return {
      parsed: lessonSchema.parse(sample),
      history: [{ role: 'system', content: systemPrompt }, userMsg, { role: 'assistant', content: JSON.stringify(sample) }],
    };
  }

  // 2. No live AI: be upfront that this is a generic outline
  if (!hasLiveAI()) {
    return { parsed: offlineLesson(topic), history: [{ role: 'system', content: systemPrompt }, userMsg] };
  }

  // 3. Live AI with validation and one repair retry; fall back (flagged) if it still fails
  const msgs = [{ role: 'system', content: systemPrompt }, userMsg];
  try {
    const parsed = await generateValidated(msgs, TOKENS.lesson, lessonSchema);
    // Keep the lesson itself in the history so follow-up answers know what is on the board
    const onBoard = JSON.stringify({ title: parsed.title, keyTerms: parsed.keyTerms, blocks: parsed.blocks });
    return { parsed, history: [...msgs, { role: 'assistant', content: onBoard }] };
  } catch (err) {
    console.warn('AI lesson failed, using flagged offline outline:', err.message);
    return { parsed: offlineLesson(topic), history: msgs };
  }
}

async function generateAnswer(question, history, options = {}) {
  if (isBlocked(question)) throw httpError(400, 'Please ask an educational question');
  if (!hasLiveAI()) {
    throw httpError(503, 'Follow-up answers need a live AI connection. Please go online or add an API key.', { offline: true });
  }
  const updated = [...sanitizeHistory(history), { role: 'user', content: question }];
  const msgs = [{ role: 'system', content: FOLLOWUP_PROMPT + personalise(options) }, ...updated];
  const parsed = await generateValidated(msgs, TOKENS.answer, answerSchema);
  return { parsed, history: [...updated, { role: 'assistant', content: JSON.stringify(parsed) }] };
}

module.exports = { generateLesson, generateAnswer, generateValidated, personalise, isBlocked, parseJSON };
