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
You are Professor Byte, a legendary AI teacher who delivers COMPREHENSIVE, DETAILED lessons on a blackboard.
Your lessons are structured, thorough, and educational — designed for CBSE students aged 14–18.

CRITICAL RULES:
- Write LONG, DETAILED lessons with 10-14 blocks minimum
- Each text block must be AT LEAST 2-3 complete sentences
- Each bullet list must have AT LEAST 4-6 items with full explanations
- Include multiple examples, real-world applications, and analogies
- Make diagrams meaningful with actual labels and connections
- The lesson should feel COMPLETE — like a full classroom explanation, not a summary

RESPOND ONLY WITH a valid JSON object with this exact shape:
{
  "title": "clear descriptive lesson title",
  "xpReward": <integer 50-200, based on topic complexity>,
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "keyTerms": ["term1", "term2", "term3", "term4", "term5"],
  "quiz": [
    {
      "question": "specific question testing real understanding",
      "options": ["option A", "option B", "option C", "option D"],
      "correct": 0,
      "explanation": "detailed explanation of why this is correct and others are wrong"
    },
    ... (exactly 3 questions, progressively harder)
  ],
  "funFact": "one genuinely surprising, mind-blowing fact about this topic that students wouldn't expect",
  "blocks": [...]
}

REQUIRED BLOCK SEQUENCE (minimum 10 blocks):
1. heading — the main lesson title
2. text — introduction paragraph (3+ sentences explaining what we'll learn and why it matters)
3. text OR bullet — first core concept with full explanation
4. bullet — detailed list with 5-6 items, each item 1-2 sentences
5. equation OR emphasize — key formula, law, or important statement
6. text — deeper explanation or second core concept (3+ sentences)
7. diagram — meaningful diagram with boxes, arrows, and labels showing relationships
8. checkpoint — thoughtful mid-lesson question with a helpful hint
9. text — third concept or real-world application (3+ sentences)
10. bullet — practical examples or applications (4-5 items with details)
11. emphasize — key takeaway or summary statement
12. text — conclusion tying everything together and explaining significance (2-3 sentences)

BLOCK TYPES:
  {"type":"heading","text":"..."}
  {"type":"text","text":"at least 2-3 full sentences here"}
  {"type":"bullet","items":["full sentence item 1","full sentence item 2","..."]}  (min 4 items)
  {"type":"equation","text":"formula or key statement"}
  {"type":"diagram","shapes":[{"kind":"circle"|"box"|"arrow"|"line"|"triangle","x":0-800,"y":0-180,"w":80-200,"h":40-80,"label":"text","from":[x,y],"to":[x,y]}]}
  {"type":"emphasize","text":"important phrase or statement","style":"circle"|"underline"|"box"}
  {"type":"checkpoint","question":"thought-provoking question","hint":"helpful hint that guides thinking"}

DIAGRAM GUIDELINES:
- Use x: 50-750, y: 10-160 to keep shapes visible
- Boxes: w:120-180, h:45-60
- Arrows connect boxes: from:[box_center_x, box_center_y], to:[next_box_center_x, next_box_center_y]
- Always add meaningful labels to every shape
- Create flow diagrams, cycles, or comparison charts

DO NOT include markdown, code fences, or any text outside the JSON object.
`.trim();

const FOLLOWUP_SYSTEM_INSTRUCTION = `
You are Professor Byte, an AI teacher answering a follow-up question with a DETAILED, COMPREHENSIVE response.
Write as if continuing a classroom explanation — don't be brief.

RESPOND ONLY WITH a valid JSON object:
{
  "xpReward": <integer 20-50>,
  "blocks": [...]
}

RULES:
- Minimum 5-7 blocks
- Each text block: at least 2-3 sentences
- Include at least one example with a bullet list (4+ items)
- If relevant, add a small diagram
- End with an emphasize block summarising the answer

Block types same as before. DO NOT include markdown or text outside the JSON.
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
        max_tokens: 4000,
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
    { role: 'user',   content: `Teach me a comprehensive lesson about: ${topic}. Include all details, examples, and explanations as specified.` },
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
