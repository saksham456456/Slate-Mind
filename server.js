'use strict';
require('dotenv').config();

if (!process.env.GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY — set it in Vercel env vars');

const express = require('express');
const path    = require('path');
const lesson  = require('./api/lesson');
const ask     = require('./api/ask');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app  = express();

app.use(cors({ origin: ['https://slate-mind.vercel.app', 'http://localhost:3000'] }));

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'Too many requests, slow down!' }
}));

app.post('/api/lesson', lesson);
app.post('/api/ask',    ask);
app.get('/api/daily_challenge', require('./api/daily_challenge'));

// SPA fallback
app.get('*', (_req, res) => res.status(404).sendFile(path.join(__dirname, 'public', 'static', '404.html')));

module.exports = app;
