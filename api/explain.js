'use strict';
const { z } = require('zod');

const feynmanSchema = z.object({
  score: z.coerce.number().default(75),
  masteryLevel: z.enum(['Developing', 'Solid Grasp', 'Feynman Master']).default('Solid Grasp'),
  strengths: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  feedback: z.string().default('Good job explaining the fundamentals!'),
  xpReward: z.coerce.number().default(30),
  chalkCorrection: z.string().default('')
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const { topic, explanation } = body || {};
  if (!topic || !explanation) {
    return res.status(400).json({ error: 'topic and explanation are required' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const GROQ_MODEL   = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

  // Fallback if no API key or offline
  if (!GROQ_API_KEY) {
    const wordCount = explanation.trim().split(/\s+/).length;
    const score = Math.min(95, Math.max(60, Math.round(50 + wordCount * 2.5)));
    const masteryLevel = score >= 85 ? 'Feynman Master' : score >= 70 ? 'Solid Grasp' : 'Developing';
    return res.json({
      score,
      masteryLevel,
      strengths: ['Clear terminology', 'Logical intuition'],
      gaps: ['Can connect deeper to edge cases'],
      feedback: `Solid breakdown of ${topic.slice(0, 30)}! You articulated the primary concept well.`,
      xpReward: Math.round(score * 0.4),
      chalkCorrection: score < 85 ? 'Review: Core mechanisms connect all principles together.' : ''
    });
  }

  const prompt = `
You are Professor Byte grading a student who explained the topic "${topic}" in their own words.
Student's explanation: "${explanation}"

Evaluate their understanding using the Feynman technique.
Return ONLY valid JSON (no markdown):
{
  "score": 0-100,
  "masteryLevel": "Developing" | "Solid Grasp" | "Feynman Master",
  "strengths": ["point 1", "point 2"],
  "gaps": ["missed point or error"],
  "feedback": "2-3 encouraging sentences with constructive guidance",
  "xpReward": 20-50,
  "chalkCorrection": "One concise line summarizing what to remember (empty string if score >= 88)"
}
`.trim();

  try {
    const r = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 500,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!r.ok) throw new Error(`Groq ${r.status}`);
    const data = await r.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    const validated = feynmanSchema.parse(parsed);
    res.json(validated);
  } catch (err) {
    const wordCount = explanation.trim().split(/\s+/).length;
    const score = Math.min(92, Math.max(65, Math.round(55 + wordCount * 2)));
    res.json({
      score,
      strengths: ['Identified main concept'],
      gaps: ['Could elaborate on specific applications'],
      feedback: `Good effort explaining ${topic.slice(0, 30)}! Keep strengthening your technical vocabulary.`,
      xpReward: Math.round(score * 0.35),
      chalkCorrection: 'Key insight: Fundamental principles drive every practical application.'
    });
  }
};
