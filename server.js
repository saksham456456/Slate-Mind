'use strict';
require('dotenv').config();
const express = require('express');
const path    = require('path');
const lesson  = require('./api/lesson');
const ask     = require('./api/ask');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/lesson', lesson);
app.post('/api/ask',    ask);

// SPA fallback
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`AI Teacher running → http://localhost:${PORT}`));
