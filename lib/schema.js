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
  z.object({
    type: z.literal('heading'),
    text: z.string().default('')
  }),
  z.object({
    type: z.literal('text'),
    text: z.string().default('')
  }),
  z.object({
    type: z.literal('bullet'),
    items: z.array(z.string()).default([])
  }),
  z.object({
    type: z.literal('equation'),
    text: z.string().default('')
  }),
  z.object({
    type: z.literal('emphasize'),
    text: z.string().default(''),
    style: z.enum(['underline', 'circle', 'box']).default('underline')
  }),
  z.object({
    type: z.literal('diagram'),
    shapes: z.array(shapeSchema).default([])
  }),
  z.object({
    type: z.literal('checkpoint'),
    question: z.string().default(''),
    hint: z.string().default('')
  }),
  z.object({
    type: z.literal('erase'),
    height: z.coerce.number().optional(),
    y: z.coerce.number().optional()
  })
]);

// Quiz question schema
const quizItemSchema = z.object({
  question: z.string().default(''),
  options: z.array(z.string()).default([]),
  correct: z.coerce.number().default(0),
  explanation: z.string().default('')
});

// Full Lesson payload schema
const lessonSchema = z.object({
  title: z.string().default('Lesson'),
  xpReward: z.coerce.number().default(80),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
  keyTerms: z.array(z.string()).default([]),
  rabbitHoles: z.array(z.string()).default([]),
  quiz: z.array(quizItemSchema).default([]),
  funFact: z.string().default(''),
  blocks: z.array(blockSchema).default([])
});

// Follow-up answer schema
const answerSchema = z.object({
  xpReward: z.coerce.number().default(20),
  blocks: z.array(blockSchema).default([])
});

module.exports = {
  lessonSchema,
  answerSchema,
  blockSchema
};
