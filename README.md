# 🎓 Professor Byte — Gamified AI Teacher

> **Learn. Level Up. Master Anything.**
> An AI-powered blackboard classroom experience with full game mechanics — XP, levels, badges, streaks, quizzes, and more.

---

## 🎮 What's New in v2.0 (Gamified)

| Feature | Details |
|---|---|
| ⚡ XP & Levels | Earn XP from lessons, quizzes, follow-ups. 10 levels with titles |
| 🏅 16 Badges | Unlock achievements for milestones, streaks, perfect scores |
| 🔥 Streaks | Daily learning streak tracker with fire animation |
| 🧠 Pop Quiz | Auto-generated 3-question quiz after every lesson |
| 🤯 Fun Facts | Mind-blowing facts about every topic |
| 📖 Glossary | Key terms extracted from each lesson |
| ⚑ Checkpoints | Mid-lesson "think about it" moments that pause writing |
| 🌟 Daily Challenge | A new topic challenge every day (+50 bonus XP) |
| 🏆 Leaderboard | Local hall of fame tracking your sessions |
| 🎨 Themes | Classic / Neon / Sunset chalk color themes |
| 💾 Persistence | All progress saved via localStorage |
| 📷 Screenshot | Save any lesson as a PNG |
| 🔊 Sound FX | Web Audio API sounds for every game event |
| 📜 History | Sidebar shows last 20 lessons, click to reload topic |

---

## 🚀 Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your Groq API key
```bash
cp .env.example .env
# Edit .env and paste your key from https://console.groq.com/keys
```

### 3. Start
```bash
npm start
# Open http://localhost:3000
```

---

## 🌐 Deploy to Vercel

1. Push to GitHub (`.env` is gitignored — never commit it)
2. Import repo in [Vercel](https://vercel.com)
3. Add `GROQ_API_KEY` in **Settings → Environment Variables**
4. Deploy ✓

A `vercel.json` is included: it serves `public/` and routes `/api/*` to the serverless functions.

---

## 🗂️ Project Structure

```
ai-teacher-gamified/
  api/
    lesson.js          POST /api/lesson  — starts a new lesson
    ask.js             POST /api/ask     — follow-up questions
  lib/
    groq.js            Groq API client + structured lesson parser
  public/
    index.html         Full game UI (HUD, blackboard, panels, modals)
    style.css          Classroom + gaming HUD theme
    whiteboard.js      Canvas engine (handwriting, shapes, chalk effects)
    app.js             Game logic (XP, levels, badges, quiz, streaks)
  server.js            Local Express server
  .env.example
  package.json
```

---

## 🐛 Bugs Fixed vs Original

| Bug | Fix |
|---|---|
| **New Topic input not accepting text** | Fixed `pointer-events`, `user-select`, `tabindex` |
| **No input focus management** | Focus redirected after every action |
| **No error feedback on board** | Error shown directly on idle board state |
| **interactionId lost after refresh** | Expected — stateless by design; history sidebar preserves topics |
| **No Enter-key support** | All inputs support Enter key |
| **Canvas not responsive** | `_resize()` called on every window resize + DPR-aware |
| **No loading state** | Rotating loading messages while AI generates |
| **Speed setting not persisted** | Saved to localStorage |

---

## ⚙️ Customisation

- **AI personality**: edit `TEACHER_SYSTEM_INSTRUCTION` in `lib/groq.js`
- **Writing speed**: change `SPEED_MAP` in `whiteboard.js`
- **Level thresholds**: edit `LEVELS` array in `app.js`
- **Badges**: add/remove entries in `BADGES` array in `app.js`
- **Daily challenges**: extend `DAILY_CHALLENGES` array in `app.js`
- **Model**: set `GROQ_MODEL` in `.env`

---

## 📝 Notes

- Groq API key is **server-side only** — never sent to the browser
- All game progress is stored in `localStorage` under `pb_v2`
- The canvas engine uses `devicePixelRatio` for crisp rendering on HiDPI screens
- Checkpoint blocks pause the writing animation and show a modal

---

## Configuration

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Primary AI provider |
| `OPENAI_API_KEY` | Optional backup provider, used if Groq fails |
| `GROQ_MODEL`, `OPENAI_MODEL` | Optional model overrides |
| `ALLOWED_ORIGINS` | Extra comma-separated origins allowed by CORS (exact match, e.g. `https://myschool.example`) |

With no key, SlateMind runs in **offline mode**: the hand-written master lessons still work, an unknown topic gets a clearly labelled generic outline (no XP), and follow-up questions and Feynman grading say they need a live AI instead of inventing answers.

## Development

```bash
npm test        # server + browser-module tests (uses a local mock AI, no key needed)
npm run lint    # ESLint
```

CI runs both on every push (`.github/workflows/ci.yml`).

**Code map**

- `lib/providers.js`: the AI provider chain (Groq, then OpenAI) with timeouts and fallback
- `lib/groq.js`: prompts, JSON validation with one repair retry, lesson and answer generation
- `lib/schema.js`: zod schemas (lenient lists: one bad block is dropped, not the whole lesson)
- `lib/http.js`: shared request parsing and error responses (provider errors are never sent to the browser)
- `lib/config.js`: limits, timeouts and CORS defaults in one place
- `public/api.js`: the browser's single `fetch` wrapper (timeout and error mapping)

## Learning features (all local, no accounts)

- **Personal setup**: pick a level (Beginner to College) and a language (English, Hindi, Hinglish) in Settings. Lessons and follow-up answers follow them.
- **Adaptive re-teach**: a wrong quiz answer shows the same idea through a different analogy, in the quiz panel and written on the board.
- **Spaced revision**: missed questions return after 1, 3, 7 and 14 days. The Quiz tab shows what is due.
- **Learning insights** (📊 button): accuracy, strengths and weak topics, computed on the device.
- **Teacher view**: students export a small report (scores per topic only, name optional). A teacher adds several files and sees which topic to re-teach first. Files are read in the browser and never uploaded.
- **Accessibility**: Easy-Reading mode, larger text, high contrast, and a Listen button that reads the lesson aloud (uses the browser's speech voices).
- **Career links**: each lesson lists real jobs that use the topic.

Code: `public/learning.js` (logic + UI), tested in `test/learning.test.js`.

