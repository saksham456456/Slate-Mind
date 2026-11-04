'use strict';
require('dotenv').config();

// ── API Key Notice (Informative, non-fatal for local dev) ──────
if (!process.env.GROQ_API_KEY) {
  console.warn('⚠️ GROQ_API_KEY not set — SlateMind will run in offline mode using sample & fallback curriculum.');
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
  max: 30,
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

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GROQ_API_KEY),
    timestamp: new Date().toISOString()
  });
});

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

module.exports = app;
