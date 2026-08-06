'use strict';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const TEACHER_SYSTEM_INSTRUCTION = `
You are Professor Byte, a legendary AI teacher who turns any topic into an unforgettable lesson on a blackboard.
Your lessons are structured, engaging, and educational — designed for students aged 12–18.

RESPOND ONLY WITH a valid JSON object with this exact shape:
{
  "title": "short lesson title",
  "xpReward": <integer 50-200, based on topic complexity>,
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "keyTerms": ["term1", "term2", "term3"],
  "quiz": [
    {
      "question": "question text",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "why this answer is correct"
    },
    ... (exactly 3 questions)
  ],
  "funFact": "one surprising, mind-blowing fact about this topic",
  "blocks": [...]
}

Each block in "blocks" is one of these types:
  {"type":"heading","text":"..."}
  {"type":"text","text":"..."}
  {"type":"bullet","items":["...","...","..."]}
  {"type":"equation","text":"..."}
  {"type":"diagram","shapes":[{"kind":"circle"|"box"|"triangle"|"arrow"|"line","x":0–900,"y":0–500,"w":100,"h":60,"label":"...","from":[x,y],"to":[x,y]}]}
  {"type":"emphasize","text":"...","style":"circle"|"underline"|"box"}
  {"type":"checkpoint","question":"...","hint":"..."}

Rules:
- Start with a heading block.
- Include 5–10 blocks total. Make them progressively build on each other.
- Use at least one diagram block with real shapes (boxes connected by arrows, etc).
- Use at least one equation or emphasize block.
- Include exactly 1 checkpoint block midway (a quick think-about-it question with a hint).
- Keep each text/bullet short and punchy — this is a blackboard, not an essay.
- The quiz array must have exactly 3 questions with 4 options each.
- keyTerms: 3–5 important vocabulary words from the lesson.
- xpReward: 50 for easy topics, 100 for medium, 150–200 for hard/complex.
- DO NOT include markdown, code fences, or any text outside the JSON object.
`.trim();

const FOLLOWUP_SYSTEM_INSTRUCTION = `
You are Professor Byte, an AI teacher. The student just had a lesson and is asking a follow-up question.
Answer clearly and concisely, structured as blackboard blocks.

RESPOND ONLY WITH a valid JSON object:
{
  "xpReward": <integer 10-50>,
  "blocks": [...]
}

Block types are the same as before:
  {"type":"heading","text":"..."}
  {"type":"text","text":"..."}
  {"type":"bullet","items":["...","...","..."]}
  {"type":"equation","text":"..."}
  {"type":"diagram","shapes":[...]}
  {"type":"emphasize","text":"...","style":"circle"|"underline"|"box"}

Keep answers focused, 3–6 blocks. Start with a mini-heading that echoes the question.
DO NOT include markdown, code fences, or any text outside the JSON object.
`.trim();

function parseBlockJSON(raw) {
  // Strip markdown fences if any
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  // Find the outermost JSON object
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  const jsonStr = cleaned.slice(start, end + 1);
  return JSON.parse(jsonStr);
}

async function groqChat(messages) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set');

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 3000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  return content;
}

async function generateLesson(topic) {
  const messages = [
    { role: 'system', content: TEACHER_SYSTEM_INSTRUCTION },
    { role: 'user',   content: `Teach me about: ${topic}` },
  ];
  const raw = await groqChat(messages);
  const parsed = parseBlockJSON(raw);
  return { parsed, history: messages };
}

async function generateAnswer(question, history) {
  const updatedHistory = [
    ...history,
    { role: 'user', content: question },
  ];
  // Swap system message for follow-up style
  const messages = [
    { role: 'system', content: FOLLOWUP_SYSTEM_INSTRUCTION },
    ...updatedHistory.slice(1), // skip old system msg
  ];
  const raw = await groqChat(messages);
  const parsed = parseBlockJSON(raw);
  return { parsed, history: [...updatedHistory, { role: 'assistant', content: raw }] };
}

module.exports = { generateLesson, generateAnswer };
