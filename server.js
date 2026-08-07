'use strict';
require('dotenv').config();

// ── API Key Guard ─────────────────────────────────────────────
if (!process.env.GROQ_API_KEY) {
  console.error('❌ Missing GROQ_API_KEY — add it to .env or Vercel env vars');
  if (require.main === module) process.exit(1);
}

const express    = require('express');
const path       = require('path');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const lesson     = require('./api/lesson');
const ask        = require('./api/ask');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'https://slate-mind.vercel.app',
    'https://slatmind.vercel.app',
    /\.vercel\.app$/,
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST'],
}));

// ── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — slow down! Try again in a minute.' },
});
app.use('/api/', limiter);

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ────────────────────────────────────────────────
app.post('/api/lesson', lesson);
app.post('/api/ask',    ask);

// ── 404 + SPA Fallback ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// ── Start (local dev only) ────────────────────────────────────
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () =>
    console.log(`🎓 SlateMind running → http://localhost:${PORT}`)
  );
}

module.exports = app; // Vercel serverless export
