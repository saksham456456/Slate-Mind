'use strict';
const { z } = require('zod');

// Schema for diagram shapes
const shapeSchema = z.object({
  kind: z.enum(['box', 'rect', 'circle', 'triangle', 'arrow', 'line', 'table', 'numberline']).default('box'),
  x: z.coerce.number().default(50),
  y: z.coerce.number().default(20),
  w: z.coerce.number().default(120),
  h: z.coerce.number().default(52),
  label: z.string().default(''),
  from: z.array(z.coerce.number()).default([]),
  to: z.array(z.coerce.number()).default([]),
  rows: z.coerce.number().optional(),
  cols: z.coerce.number().optional(),
  ticks: z.coerce.number().optional()
});

// Whiteboard block schema
const blockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), text: z.string().default('') }),
  z.object({ type: z.literal('text'), text: z.string().default('') }),
  z.object({ type: z.literal('bullet'), items: z.array(z.string()).default([]) }),
  z.object({ type: z.literal('equation'), text: z.string().default('') }),
  z.object({
    type: z.literal('emphasize'),
    text: z.string().default(''),
    style: z.enum(['underline', 'circle', 'box']).default('underline')
  }),
  z.object({ type: z.literal('diagram'), shapes: z.array(shapeSchema).default([]) }),
  z.object({ type: z.literal('checkpoint'), question: z.string().default(''), hint: z.string().default('') }),
  z.object({
    type: z.literal('erase'),
    height: z.coerce.number().optional(),
    y: z.coerce.number().optional()
  })
]);

/**
 * Keeps the valid items of an array and drops the broken ones, so one bad block
 * no longer throws away a whole lesson. Fails only if too few valid items remain.
 */
function lenientList(itemSchema, min, max, label) {
  return z.array(z.unknown())
    .transform(items => items
      .map(item => itemSchema.safeParse(item))
      .filter(result => result.success)
      .map(result => result.data)
      .slice(0, max))
    .refine(items => items.length >= min, { message: `needs at least ${min} valid ${label}` });
}

// Quiz question: must have 2+ options and a "correct" index that points at one of them
const quizItemSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2).max(6),
  correct: z.coerce.number().int().min(0),
  explanation: z.string().default(''),
  reteach: z.string().optional() // same idea, different analogy (used for adaptive re-teaching)
}).refine(q => q.correct < q.options.length, { message: '"correct" must be an index into "options"' });

// Full Lesson payload schema
const lessonSchema = z.object({
  title: z.string().default('Lesson'),
  xpReward: z.coerce.number().default(80),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
  keyTerms: z.array(z.string()).default([]),
  rabbitHoles: z.array(z.string()).default([]),
  quiz: lenientList(quizItemSchema, 1, 3, 'quiz questions'),
  funFact: z.string().default(''),
  careers: z.array(z.string()).default([]).transform(list => list.slice(0, 3)), // where this topic is used in real jobs
  blocks: lenientList(blockSchema, 3, 8, 'board blocks'),
  offline: z.boolean().default(false) // true when this is a generic offline outline, not an AI lesson
});

// Follow-up answer schema
const answerSchema = z.object({
  xpReward: z.coerce.number().default(20),
  blocks: lenientList(blockSchema, 1, 3, 'answer blocks')
});

// Feynman grading. Mastery level is derived from the score on our side, never trusted from the model.
const feynmanSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  strengths: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  feedback: z.string().min(1),
  xpReward: z.coerce.number().min(0).max(50).default(20),
  chalkCorrection: z.string().default('')
});

module.exports = { lessonSchema, answerSchema, blockSchema, feynmanSchema };
