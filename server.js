'use strict';
require('dotenv').config();

// ── API Key Notice (Informative, non-fatal for local dev) ──────
const { hasLiveAI, providers } = require('./lib/providers');
const { allowedOrigins } = require('./lib/config');
if (!hasLiveAI()) {
  console.warn('⚠️ GEMINI_API_KEY is not set — SlateMind will run in offline mode using sample & fallback curriculum.');
}

const express    = require('express');
const path       = require('path');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const lesson     = require('./api/lesson');
const ask        = require('./api/ask');
const explain    = require('./api/explain');

const app = express();

// ── Proxy + CORS ───────────────────────────────────────────────
// Behind Vercel/any proxy the real client IP is in X-Forwarded-For; without this
// every visitor shares one rate-limit bucket.
app.set('trust proxy', 1);

// Exact origins only (no wildcard *.vercel.app). Same-origin requests need no CORS headers.
const ORIGINS = allowedOrigins();
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ORIGINS.has(origin)),
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
app.use(express.static(path.join(__dirname, 'public'), {
  // The service worker must always be re-checked so new deploys reach users
  setHeaders: (res, file) => { if (file.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache'); },
}));

// ── API Routes ────────────────────────────────────────────────
app.post('/api/lesson',  lesson);
app.post('/api/ask',     ask);
app.post('/api/explain', explain);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const active = new Set(providers().map(p => p.name));
  res.json({
    status: 'ok',
    hasKey: hasLiveAI(),
    providers: { gemini: active.has('gemini') },
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
