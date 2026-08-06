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

No `vercel.json` needed — `/api/*.js` are auto-detected as serverless functions.

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
- All game progress is stored in `localStorage` under `pb_state_v2`
- The canvas engine uses `devicePixelRatio` for crisp rendering on HiDPI screens
- Checkpoint blocks pause the writing animation and show a modal
