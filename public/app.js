/* ═══════════════════════════════════════════════════════════════
   app.js  — Professor Byte: Gamified AI Teacher
   Full game engine: XP, Levels, Badges, Streaks, Quiz, History
   ═══════════════════════════════════════════════════════════════ */

'use strict';

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 10000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}


/* ══════════════════════════════════════════════════════════════
   1. GAME CONFIG
══════════════════════════════════════════════════════════════ */

const LEVELS = [
  { level: 1,  title: 'Rookie',          xpNeeded: 0    },
  { level: 2,  title: 'Curious Learner', xpNeeded: 150  },
  { level: 3,  title: 'Knowledge Seeker',xpNeeded: 350  },
  { level: 4,  title: 'Smart Cookie',    xpNeeded: 600  },
  { level: 5,  title: 'Brain Explorer',  xpNeeded: 950  },
  { level: 6,  title: 'Concept Master',  xpNeeded: 1400 },
  { level: 7,  title: 'Tech Wizard',     xpNeeded: 2000 },
  { level: 8,  title: 'Scholar',         xpNeeded: 2800 },
  { level: 9,  title: 'Grand Scholar',   xpNeeded: 3800 },
  { level: 10, title: 'Professor Byte',  xpNeeded: 5000 },
];

const BADGES = [
  { id: 'first_lesson',  icon: '🎓', name: 'First Step',     desc: 'Complete your first lesson',            check: s => s.lessonsCompleted >= 1 },
  { id: 'lesson_5',      icon: '📚', name: 'Bookworm',        desc: 'Complete 5 lessons',                    check: s => s.lessonsCompleted >= 5 },
  { id: 'lesson_10',     icon: '🔬', name: 'Lab Rat',         desc: 'Complete 10 lessons',                   check: s => s.lessonsCompleted >= 10 },
  { id: 'lesson_25',     icon: '🧠', name: 'Big Brain',       desc: 'Complete 25 lessons',                   check: s => s.lessonsCompleted >= 25 },
  { id: 'quiz_perfect',  icon: '💯', name: 'Perfect Score',   desc: 'Score 100% on a quiz',                  check: s => s.perfectQuizzes >= 1 },
  { id: 'quiz_5',        icon: '🎯', name: 'Quiz Master',     desc: 'Pass 5 quizzes',                        check: s => s.quizzesPassed >= 5 },
  { id: 'streak_3',      icon: '🔥', name: 'On Fire',         desc: '3-day learning streak',                 check: s => s.maxStreak >= 3 },
  { id: 'streak_7',      icon: '🌟', name: 'Week Warrior',    desc: '7-day learning streak',                 check: s => s.maxStreak >= 7 },
  { id: 'xp_500',        icon: '⚡', name: 'Power Up',        desc: 'Earn 500 XP',                           check: s => s.totalXP >= 500 },
  { id: 'xp_2000',       icon: '💎', name: 'XP Millionaire',  desc: 'Earn 2000 XP',                          check: s => s.totalXP >= 2000 },
  { id: 'speed_demon',   icon: '🚀', name: 'Speed Demon',     desc: 'Watch 3 lessons at fast speed',         check: s => s.fastLessons >= 3 },
  { id: 'daily_champ',   icon: '🏆', name: 'Daily Champion',  desc: 'Complete the daily challenge',          check: s => s.dailyChallenges >= 1 },
  { id: 'asker',         icon: '🙋', name: 'Curious George',  desc: 'Ask 10 follow-up questions',            check: s => s.followUps >= 10 },
  { id: 'level_5',       icon: '👑', name: 'Rising Star',     desc: 'Reach Level 5',                         check: s => s.level >= 5 },
  { id: 'level_max',     icon: '🎖️', name: 'Prof. Byte Jr.',  desc: 'Reach max level (10)',                  check: s => s.level >= 10 },
  { id: 'night_owl',     icon: '🦉', name: 'Night Owl',       desc: 'Study after 10 PM',                     check: s => s.nightStudy >= 1 },
];

const DAILY_CHALLENGES = [
  'The Water Cycle', 'How Black Holes Form', 'Pythagoras Theorem',
  'The Human Immune System', 'How Computers Work', 'Climate Change',
  'Evolution by Natural Selection', 'Nuclear Fission vs Fusion',
  'Machine Learning Basics', 'The French Revolution',
  'How Vaccines Work', 'Quantum Physics Introduction',
  'The Carbon Cycle', 'India\'s Freedom Movement', 'DNA Replication',
];

const FOLLOW_UP_CHIPS = [
  'Can you explain that more simply?',
  'Give me a real-world example',
  'How does this work in practice?',
  'Why is this important?',
  'What are common misconceptions?',
  'Connect this to something I already know',
];

const RESULT_MESSAGES = {
  3: ['🔥 Flawless! You aced it!', '🌟 Perfect! Nothing gets past you!', '💯 Brilliant mind at work!'],
  2: ['👍 Great job! Almost perfect!', '📚 Solid understanding!', '⚡ Sharp thinking!'],
  1: ['🙂 Good start! Review and retry!', '📖 Keep studying — you\'re getting there!', '💪 Practice makes perfect!'],
  0: ['😅 Time to review the lesson!', '🔄 Don\'t worry — retry and conquer!', '📝 Let\'s go over this again!'],
};

const LOADING_MESSAGES = [
  'Professor Byte is sharpening the chalk…',
  'Organising thoughts on the blackboard…',
  'Preparing an unforgettable lesson…',
  'Summoning knowledge from the cosmos…',
  'Calculating the perfect explanation…',
  'Brewing a brilliant lesson plan…',
];

/* ══════════════════════════════════════════════════════════════
   2. STATE
══════════════════════════════════════════════════════════════ */

const DEFAULT_STATE = {
  playerName:       'Student',
  totalXP:          0,
  level:            1,
  lessonsCompleted: 0,
  perfectQuizzes:   0,
  quizzesPassed:    0,
  maxStreak:        0,
  currentStreak:    0,
  lastStudyDate:    null,
  fastLessons:      0,
  dailyChallenges:  0,
  followUps:        0,
  nightStudy:       0,
  earnedBadges:     [],
  lessonHistory:    [],
  quizCorrect:      0,
  quizTotal:        0,
  soundOn:          true,
  writeSpeed:       'normal',
  hasOnboarded:     false,
  dailyChallengeDate: null,
  dailyChallengeDone: false,
};

let STATE = {};
let interactionId  = null;
let currentQuiz    = [];
let currentQuestionIndex = 1;
let quizScore      = 0;
let currentLesson  = null;
let wb             = null; // Whiteboard instance

/* ══════════════════════════════════════════════════════════════
   3. PERSISTENCE
══════════════════════════════════════════════════════════════ */

function loadState() {
  try {
    const raw = localStorage.getItem('pb_state_v2');
    STATE = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
    STATE.currentStreak = parseInt(localStorage.getItem('pb_streak') || '0');
  } catch {
    STATE = { ...DEFAULT_STATE };
  }
}

function saveState() {
  try { localStorage.setItem('pb_state_v2', JSON.stringify(STATE)); } catch {}
}

/* ══════════════════════════════════════════════════════════════
   4. XP & LEVEL ENGINE
══════════════════════════════════════════════════════════════ */

function getLevelInfo(totalXP) {
  let current = LEVELS[0];
  let next    = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].xpNeeded) {
      current = LEVELS[i];
      next    = LEVELS[i + 1] || null;
      break;
    }
  }
  return { current, next };
}

function awardXP(amount, label = '') {
  const prevLevel = STATE.level;
  STATE.totalXP += amount;

  const { current, next } = getLevelInfo(STATE.totalXP);
  STATE.level = current.level;

  updateHUD();
  showXPPopup(amount);
  saveState();

  if (STATE.level > prevLevel) {
    setTimeout(() => showLevelUp(current, amount), 800);
  }

  checkBadges();
}

function getXPProgress() {
  const { current, next } = getLevelInfo(STATE.totalXP);
  if (!next) return { pct: 100, current: STATE.totalXP, needed: STATE.totalXP };
  const base  = current.xpNeeded;
  const range = next.xpNeeded - base;
  const done  = STATE.totalXP - base;
  return { pct: Math.min(100, (done / range) * 100), current: done, needed: range };
}

/* ══════════════════════════════════════════════════════════════
   5. STREAK ENGINE
══════════════════════════════════════════════════════════════ */

function updateStreak() {
  const today = new Date().toDateString();
  const lastVisit = localStorage.getItem('pb_lastVisit');
  const streak = parseInt(localStorage.getItem('pb_streak') || '0');
  if (lastVisit === today) return; // already counted today
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const newStreak = lastVisit === yesterday ? streak + 1 : 1;
  localStorage.setItem('pb_streak', newStreak);
  localStorage.setItem('pb_lastVisit', today);

  STATE.currentStreak = newStreak;
  if (newStreak > STATE.maxStreak) STATE.maxStreak = newStreak;
  STATE.lastStudyDate = today;
  return newStreak;
  // Night owl check
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 4) STATE.nightStudy++;

  saveState();
  updateHUD();
}

/* ══════════════════════════════════════════════════════════════
   6. BADGE ENGINE
══════════════════════════════════════════════════════════════ */

function checkBadges() {
  BADGES.forEach(badge => {
    if (STATE.earnedBadges.includes(badge.id)) return;
    if (badge.check(STATE)) {
      STATE.earnedBadges.push(badge.id);
      saveState();
      showBadgeToast(badge);
    }
  });
}

function showBadgeToast(badge) {
  const area  = document.getElementById('achievementArea');
  if (!area) return;
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="toast-icon">${badge.icon}</div>
    <div class="toast-info">
      <div class="toast-title">🏅 Badge Unlocked!</div>
      <div class="toast-desc">${badge.name} — ${badge.desc}</div>
    </div>
  `;
  area.prepend(toast);
  playSound('badge');
  setTimeout(() => toast.remove(), 6000);
}

/* ══════════════════════════════════════════════════════════════
   7. HUD UPDATE
══════════════════════════════════════════════════════════════ */

function updateHUD() {
  const { current, next } = getLevelInfo(STATE.totalXP);
  const prog = getXPProgress();

  el('playerNameDisplay').textContent = STATE.playerName;
  el('playerLevel').textContent       = `Lv ${current.level}`;
  el('levelTitle').textContent        = current.title;
  el('xpBarFill').style.width         = prog.pct + '%';

  const xpLabel = next
    ? `${prog.current} / ${prog.needed} XP`
    : 'MAX LEVEL';
  el('xpBarLabel').textContent = xpLabel;

  el('totalXP').textContent      = STATE.totalXP;
  el('streakCount').textContent  = STATE.currentStreak;
  el('lessonsCount').textContent = STATE.lessonsCompleted;

  // Quiz accuracy
  const acc = STATE.quizTotal > 0
    ? Math.round((STATE.quizCorrect / STATE.quizTotal) * 100) + '%'
    : '—';
  // removed quiz accuracy

  // Streak chip pulse if active
  const sc = el('streakChip');
  sc.classList.toggle('active', STATE.currentStreak >= 3);
}

/* ══════════════════════════════════════════════════════════════
   8. XP POPUP
══════════════════════════════════════════════════════════════ */

function showXPPopup(amount) {
  const popup = el('xpPopup');
  el('xpPopupVal').textContent = amount;
  popup.style.display  = 'block';
  popup.style.left     = (window.innerWidth / 2 - 40) + 'px';
  popup.style.top      = (window.innerHeight / 2) + 'px';
  popup.style.opacity  = '1';
  popup.style.animation = 'none';
  void popup.offsetWidth; // reflow
  popup.style.animation = 'xpFloat 1.2s ease-out forwards';
  setTimeout(() => { popup.style.display = 'none'; }, 1300);
}

/* ══════════════════════════════════════════════════════════════
   9. LEVEL UP MODAL
══════════════════════════════════════════════════════════════ */

function showLevelUp(lvlInfo, earnedXP) {
  el('luLevel').textContent     = `Level ${lvlInfo.level}`;
  el('luTitleName').textContent = lvlInfo.title;
  if (el('xp-earned') && earnedXP) {
    el('xp-earned').textContent = `+${earnedXP} XP`;
  }
  openModal('levelUpOverlay');
  playSound('levelup');
  updateHUD();
}

/* ══════════════════════════════════════════════════════════════
   10. LESSON ENGINE
══════════════════════════════════════════════════════════════ */

async function startLesson(topic, isDaily = false) {
  if (!topic || !topic.trim()) return;
  topic = topic.trim();

  // UI: loading state
  setUIState('loading');
  el('boardIdle').style.display    = 'none';
  el('boardLoading').style.display = 'flex';
  el('loadingText').textContent    = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];

  try {
    const res  = await fetchWithTimeout('/api/lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = await res.json();
    interactionId = data.interactionId;
    currentLesson = { topic, data };

    el('boardLoading').style.display = 'none';

    // Show lesson meta
    showLessonMeta(topic, data);

    // Clear board and start writing
    wb.clear();
    wb.setSpeed(STATE.writeSpeed);

    // Track fast speed
    if (STATE.writeSpeed === 'fast' || STATE.writeSpeed === 'instant') {
      STATE.fastLessons++;
    }

    setUIState('writing');

    await wb.renderLesson(data.blocks || [], {
      onBlockDone: (i, block) => {
        // checkpoint handled by event
      },
      onAllDone: () => {
        onLessonComplete(data, topic, isDaily);
      },
    });

  } catch (err) {
    el('boardLoading').style.display = 'none';
    el('boardIdle').style.display    = 'flex';
    el('boardIdle').innerHTML = `
      <div class="idle-prof">⚠️</div>
      <div class="idle-text" style="color: #ff6b6b;">Professor Byte couldn't connect. Please try again.</div>
      <button class="btn-primary" onclick="startLesson('${topic.replace(/'/g, '&apos;')}', ${isDaily})" style="margin-top: 15px;">🔄 Retry</button>
    `;
    setUIState('idle');
    console.error('Lesson error:', err);
  }
}

function onLessonComplete(data, topic, isDaily) {
  // State updates
  STATE.lessonsCompleted++;
  updateStreak();
  if (isDaily) {
    STATE.dailyChallenges++;
    STATE.dailyChallengeDone = true;
    STATE.dailyChallengeDate = new Date().toDateString();
  }
  saveState();

  // Award base XP
  const xp = data.xpReward || 100;
  awardXP(xp, 'lesson');

  // Add to history
  addToHistory(topic, data);

  // Show right panel content
  showFactCard(data.funFact);
  showGlossary(data.keyTerms);
  showQuiz(data.quiz);

  // Show ask dock
  el('askDock').style.display = 'block';
  populateAskChips();

  setUIState('done');
  checkBadges();
}

function showLessonMeta(topic, data) {
  el('metaTopic').textContent = topic;

  const diff = data.difficulty || 'Intermediate';
  const diffEl = el('metaDiff');
  diffEl.textContent  = diff;
  diffEl.className    = `meta-diff diff-${diff}`;

  el('metaXP').textContent   = `+${data.xpReward || 100} XP`;
  el('metaTerms').textContent = data.keyTerms?.length
    ? '📌 ' + data.keyTerms.slice(0, 3).join(', ')
    : '';

  el('lessonMeta').style.display = 'flex';
}

/* ══════════════════════════════════════════════════════════════
   11. FOLLOW-UP QUESTIONS
══════════════════════════════════════════════════════════════ */

async function askFollowUp(question) {
  if (!question?.trim() || !interactionId) return;
  question = question.trim();

  el('askBtn').disabled = true;
  el('askInput').value  = '';

  STATE.followUps++;
  saveState();
  checkBadges();

  setUIState('writing');

  try {
    const res  = await fetchWithTimeout('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, interactionId }),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const data = await res.json();
    interactionId = data.interactionId;

    await wb.appendBlocks(data.blocks || [], {
      onAllDone: () => {
        setUIState('done');
        if (data.xpReward) awardXP(data.xpReward, 'follow-up');
      },
    });

  } catch (err) {
    console.error('Ask error:', err);
    setUIState('done');
  } finally {
    el('askBtn').disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════════
   12. QUIZ ENGINE
══════════════════════════════════════════════════════════════ */

function showQuiz(quiz) {
  if (!quiz || quiz.length === 0) return;
  currentQuiz = quiz;
  currentQuestionIndex = 1;
  quizScore   = 0;

  el('quizCard').style.display   = 'block';
  el('resultCard').style.display = 'none';

  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = currentQuiz[currentQuestionIndex - 1];
  if (!q) return;

  const total = currentQuiz.length;
  el('quizQCount').textContent     = `Question ${currentQuestionIndex} / ${total}`;
  el('quizQuestion').textContent   = q.question;
  el('quizProgFill').style.width   = (((currentQuestionIndex - 1) / total) * 100) + '%';
  el('quizExplanation').style.display = 'none';
  el('quizNextBtn').style.display  = 'none';

  const opts = el('quizOptions');
  opts.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.innerHTML = `<span class="opt-letter">${letters[i]}</span>${opt}`;
    btn.addEventListener('click', () => handleQuizAnswer(i, q));
    opts.appendChild(btn);
  });
}

function handleQuizAnswer(chosen, q) {
  const correct = q.correct;
  const optBtns = document.querySelectorAll('.quiz-opt');

  optBtns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct)       btn.classList.add('correct');
    else if (i === chosen)   btn.classList.add('wrong');
  });

  // Track stats
  STATE.quizTotal++;
  if (chosen === correct) {
    quizScore++;
    STATE.quizCorrect++;
    playSound('correct');
  } else {
    playSound('wrong');
  }
  saveState();

  // Show explanation
  el('quizExplanation').textContent    = q.explanation;
  el('quizExplanation').style.display  = 'block';
  el('quizNextBtn').style.display      = 'inline-block';
  el('quizNextBtn').textContent        = (currentQuestionIndex - 1) < currentQuiz.length - 1 ? 'Next ➤' : 'See Results ➤';
}

function nextQuizQuestion() {
  currentQuestionIndex++;
  if ((currentQuestionIndex - 1) < currentQuiz.length) {
    renderQuizQuestion();
  } else {
    showQuizResult();
  }
}

function showQuizResult() {
  const total   = currentQuiz.length;
  const pct     = Math.round((quizScore / total) * 100);
  const stars   = quizScore === total ? '⭐⭐⭐' : quizScore >= total / 2 ? '⭐⭐' : '⭐';
  const msgList = RESULT_MESSAGES[quizScore] || RESULT_MESSAGES[0];
  const msg     = msgList[Math.floor(Math.random() * msgList.length)];

  el('quizCard').style.display    = 'none';
  el('resultCard').style.display  = 'block';
  el('resultStars').textContent   = stars;
  el('resultScore').textContent   = `${quizScore} / ${total} (${pct}%)`;
  el('resultMsg').textContent     = msg;

  // XP for quiz
  const quizXP = quizScore * 15;
  el('resultXP').textContent = `+${quizXP} XP earned!`;
  awardXP(quizXP, 'quiz');

  // Update stats
  if (quizScore === total) STATE.perfectQuizzes++;
  if (quizScore >= Math.ceil(total / 2)) STATE.quizzesPassed++;
  saveState();
  checkBadges();
  playSound(quizScore === total ? 'perfect' : 'complete');
}

function retryQuiz() {
  showQuiz(currentQuiz);
}

/* ══════════════════════════════════════════════════════════════
   13. FACT & GLOSSARY
══════════════════════════════════════════════════════════════ */

function showFactCard(fact) {
  if (!fact) return;
  el('factText').textContent    = fact;
  el('factCard').style.display  = 'block';
}

function showGlossary(terms) {
  if (!terms || terms.length === 0) return;
  const list = el('glossaryList');
  list.innerHTML = terms.map(t => `
    <div class="glossary-term">
      <span class="term-word">${t}</span>
    </div>
  `).join('');
  el('glossaryCard').style.display = 'block';
}

/* ══════════════════════════════════════════════════════════════
   14. LESSON HISTORY
══════════════════════════════════════════════════════════════ */

function addToHistory(topic, data) {
  const entry = {
    id:         Date.now(),
    topic,
    diff:       data.difficulty || 'Intermediate',
    xp:         data.xpReward  || 100,
    timestamp:  Date.now(),
  };

  STATE.lessonHistory.unshift(entry);
  if (STATE.lessonHistory.length > 50) STATE.lessonHistory.pop();
  saveState();
  renderHistory();
}

function renderHistory() {
  const container = el('lessonHistory');
  if (!STATE.lessonHistory.length) {
    container.innerHTML = '<div class="history-empty">No lessons yet. Start one above! 👆</div>';
    return;
  }

  const icons = { Beginner: '🟢', Intermediate: '🟡', Advanced: '🔴' };
  container.innerHTML = STATE.lessonHistory.slice(0, 20).map((h, i) => `
    <div class="history-item ${i === 0 ? 'active' : ''}" data-topic="${encodeURIComponent(h.topic)}">
      <span class="hi-icon">${icons[h.diff] || '📖'}</span>
      <div class="hi-info">
        <div class="hi-topic">${h.topic}</div>
        <div class="hi-meta">+${h.xp} XP · <span class="hi-diff diff-${h.diff}">${h.diff}</span></div>
      </div>
    </div>
  `).join('');

  // Re-attach click handlers
  container.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const topic = decodeURIComponent(item.dataset.topic);
      el('topicInput').value = topic;
      // Highlight
      container.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   15. DAILY CHALLENGE
══════════════════════════════════════════════════════════════ */

async function setupDailyChallenge() {
  const today = new Date().toDateString();
  let topic;

  el('dcBtn').disabled = true;
  el('dcBtn').style.opacity = '0.5';

  try {
    const res = await fetchWithTimeout('/api/daily_challenge');
    if (!res.ok) throw new Error('Failed to fetch challenge');
    const data = await res.json();
    topic = data.topic;
  } catch (err) {
    topic = "Explain the difference between speed and velocity in 3 sentences";
  }

  el('dcTopic').textContent = topic;

  // Check if already done today
  const done = STATE.dailyChallengeDate === today && STATE.dailyChallengeDone;
  el('dcBtn').disabled = done;
  el('dcBtn').style.opacity = done ? '0.5' : '1';
  el('dcBtn').textContent = done ? '✅ Completed Today!' : 'Accept Challenge';

  el('dcBtn').onclick = () => {
    // Reset daily on new day
    if (STATE.dailyChallengeDate !== today) {
      STATE.dailyChallengeDone = false;
      saveState();
    }
    el('topicInput').value = topic;
    startLesson(topic, true);
  };
}

/* ══════════════════════════════════════════════════════════════
   16. ASK CHIPS
══════════════════════════════════════════════════════════════ */

function populateAskChips() {
  const chips = el('askChips');
  chips.innerHTML = FOLLOW_UP_CHIPS.slice(0, 4).map(chip => `
    <button class="ask-chip">${chip}</button>
  `).join('');
  chips.querySelectorAll('.ask-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      el('askInput').value = btn.textContent;
      el('askInput').focus();
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   17. BADGES MODAL
══════════════════════════════════════════════════════════════ */

function renderBadgesModal() {
  const grid = el('badgesGrid');
  grid.innerHTML = BADGES.map(b => {
    const earned = STATE.earnedBadges.includes(b.id);
    return `
      <div class="badge-cell ${earned ? 'earned' : 'locked'}" title="${b.desc}">
        <div class="badge-icon">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   18. LEADERBOARD
══════════════════════════════════════════════════════════════ */

function renderLeaderboard() {
  // Local "virtual" leaderboard using saved session scores
  const sessions = JSON.parse(localStorage.getItem('pb_sessions') || '[]');
  const you = { name: STATE.playerName, xp: STATE.totalXP, isYou: true };

  // Add current session if not already in list
  const all = [...sessions.filter(s => s.name !== STATE.playerName), you]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);

  const rankClass = ['gold', 'silver', 'bronze'];
  el('lbList').innerHTML = all.map((s, i) => `
    <div class="lb-row ${s.isYou ? 'you' : ''}">
      <span class="lb-rank ${rankClass[i] || ''}">${['🥇','🥈','🥉'][i] || (i + 1)}</span>
      <span class="lb-name">${s.name}${s.isYou ? ' (You)' : ''}</span>
      <span class="lb-xp">${s.xp} XP</span>
    </div>
  `).join('');

  const rank = all.findIndex(s => s.isYou) + 1;
  el('lbYourRank').textContent = `Your Rank: #${rank} with ${STATE.totalXP} XP`;

  // Save updated list
  const updated = all.map(s => ({ name: s.name, xp: s.xp }));
  localStorage.setItem('pb_sessions', JSON.stringify(updated));
}

/* ══════════════════════════════════════════════════════════════
   19. CHECKPOINT POPUP
══════════════════════════════════════════════════════════════ */

function showCheckpoint(question, hint) {
  el('cpQuestion').textContent = question;
  el('cpHint').textContent     = hint;
  el('cpHint').style.display   = 'none';
  openModal('checkpointOverlay');
  wb.setPaused(true);
  playSound('checkpoint');
}

/* ══════════════════════════════════════════════════════════════
   20. UI STATE MACHINE
══════════════════════════════════════════════════════════════ */

function setUIState(state) {
  const controls = el('boardControls');
  const askDock  = el('askDock');
  const teachBtn = el('teachBtn');

  switch (state) {
    case 'idle':
      controls.style.display = 'none';
      teachBtn.disabled = false;
      break;
    case 'loading':
      controls.style.display = 'none';
      askDock.style.display  = 'none';
      teachBtn.disabled = true;
      break;
    case 'writing':
      controls.style.display = 'flex';
      teachBtn.disabled = true;
      el('pauseBtn').textContent = '⏸ Pause';
      break;
    case 'done':
      controls.style.display = 'flex';
      teachBtn.disabled = false;
      el('pauseBtn').textContent = '⏸ Pause';
      break;
  }
}

/* ══════════════════════════════════════════════════════════════
   21. SOUND ENGINE
══════════════════════════════════════════════════════════════ */

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudio() {
  return audioCtx;
}

function playSound(type) {
  if (!STATE.soundOn) return;
  if (!audioCtx) return;
  const ctx = getAudio();
  if (!ctx) return;

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  switch (type) {
    case 'correct':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
      break;
    case 'wrong':
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
      break;
    case 'levelup':
      osc.type = 'sine';
      [261, 329, 392, 523].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, now + i * 0.12);
      });
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now); osc.stop(now + 0.6);
      break;
    case 'badge':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1108, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now); osc.stop(now + 0.25);
      break;
    case 'checkpoint':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
      break;
    case 'perfect':
      [523, 659, 784, 1046].forEach((f, i) => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'sine';
        o2.frequency.value = f;
        g2.gain.setValueAtTime(0.1, now + i * 0.1);
        g2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
        o2.start(now + i * 0.1); o2.stop(now + i * 0.1 + 0.3);
      });
      return;
    case 'complete':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
      break;
  }
}

/* ══════════════════════════════════════════════════════════════
   22. MODAL HELPERS
══════════════════════════════════════════════════════════════ */

function openModal(id)  {
  const el2 = document.getElementById(id);
  if (el2) el2.classList.add('active');
}
function closeModal(id) {
  const el2 = document.getElementById(id);
  if (el2) el2.classList.remove('active');
}

/* ══════════════════════════════════════════════════════════════
   23. UTILITY
══════════════════════════════════════════════════════════════ */

function el(id) { return document.getElementById(id); }

function saveScreenshot() {
  const canvas = document.getElementById('boardCanvas');
  if (!canvas) return;
  canvas.toBlob(function(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'professor-byte-lesson.png';
    a.click();
    URL.revokeObjectURL(url);
  });
}

/* ══════════════════════════════════════════════════════════════
   24. ONBOARDING
══════════════════════════════════════════════════════════════ */

function setupOnboarding() {
  const nameInput = el('studentNameInput');
  const startBtn  = el('startAdventureBtn');
  const savedName = localStorage.getItem('professorByte_studentName');
  if (savedName) {
    STATE.playerName = savedName;
    STATE.hasOnboarded = true;
    closeModal('splashOverlay');
    return;
  }

  // Allow pressing Enter in name input
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') startBtn.click();
  });

  startBtn.addEventListener('click', () => {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const name = nameInput.value.trim() || 'Student';
    localStorage.setItem('professorByte_studentName', name);
    STATE.playerName  = name;
    STATE.hasOnboarded = true;
    saveState();
    updateHUD();
    closeModal('splashOverlay');
    playSound('levelup');
  });

  // Skip if already onboarded
  if (STATE.hasOnboarded) {
    closeModal('splashOverlay');
  } else {
    nameInput.focus();
  }
}

/* ══════════════════════════════════════════════════════════════
   25. EVENT WIRING
══════════════════════════════════════════════════════════════ */

function wireEvents() {
  /* — Topic Input — */
  const topicInput = el('topicInput');
  const teachBtn   = el('teachBtn');

  // FIX: Ensure input is always interactive
  topicInput.setAttribute('tabindex', '0');
  topicInput.style.pointerEvents = 'auto';

  teachBtn.addEventListener('click', () => {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (!topicInput.value.trim()) {
      topicInput.focus();
      topicInput.classList.add('error'); // add a red border via CSS
      return;
    }
    const topic = topicInput.value.trim();
    startLesson(topic);
    topicInput.value = '';
    topicInput.focus();
  });

  topicInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      teachBtn.click();
    }
  });

  // Suggestion chips
  document.querySelectorAll('.sug-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const topic = chip.dataset.topic || chip.textContent;
      el('topicInput').value = topic;
      startLesson(topic);
    });
  });

  /* — Ask Follow-up — */
  const askInput = el('askInput');
  const askBtn   = el('askBtn');

  askInput.setAttribute('tabindex', '0');

  askBtn.addEventListener('click', () => {
    const q = askInput.value.trim();
    if (q) askFollowUp(q);
  });

  askInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      askBtn.click();
    }
  });

  /* — Board Controls — */
  el('pauseBtn').addEventListener('click', () => {
    const p = !wb._paused;
    wb.setPaused(p);
    el('pauseBtn').textContent = p ? '▶ Resume' : '⏸ Pause';
  });

  el('speedBtn').addEventListener('click', () => {
    const speeds = ['slow', 'normal', 'fast', 'instant'];
    const icons  = ['🐢', '🚶', '🐇', '⚡'];
    const labels = ['Slow', 'Normal', 'Fast', 'Instant'];
    const curr   = speeds.indexOf(STATE.writeSpeed);
    const next   = (curr + 1) % speeds.length;
    STATE.writeSpeed = speeds[next];
    wb.setSpeed(STATE.writeSpeed);
    el('speedBtn').textContent = icons[next] + ' ' + labels[next];
    saveState();
  });

  el('clearBtn').addEventListener('click', () => {
    wb.clear();
    interactionId = null;
    currentLesson = null;
    el('boardIdle').style.display    = 'flex';
    el('boardIdle').querySelector('.idle-text').textContent = 'Professor Byte is ready to teach!';
    el('boardIdle').querySelector('.idle-sub').textContent  = 'Type a topic → Press ▶ to start your lesson';
    el('lessonMeta').style.display   = 'none';
    el('askDock').style.display      = 'none';
    el('boardControls').style.display = 'none';
    el('factCard').style.display     = 'none';
    el('glossaryCard').style.display = 'none';
    el('quizCard').style.display     = 'none';
    el('resultCard').style.display   = 'none';
    el('topicInput').focus();
  });

  el('screenshotBtn').addEventListener('click', saveScreenshot);

  /* — Sidebar Collapse — */
  el('collapseBtn').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const collapsed = sidebar.classList.toggle('collapsed');
    el('collapseBtn').textContent = collapsed ? '📚 Lessons' : '✕ Close';
  });

  /* — Quiz — */
  el('quizNextBtn').addEventListener('click', nextQuizQuestion);
  el('retryQuizBtn').addEventListener('click', retryQuiz);

  /* — HUD Buttons — */
  el('badgesBtn').addEventListener('click', () => {
    renderBadgesModal();
    openModal('badgesOverlay');
  });

  el('leaderboardBtn').addEventListener('click', () => {
    renderLeaderboard();
    openModal('leaderboardOverlay');
  });

  el('settingsBtn').addEventListener('click', () => openModal('settingsOverlay'));

  /* — Modal Close Buttons — */
  document.querySelectorAll('.modal-close[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay && overlay.id !== 'splashOverlay') {
        closeModal(overlay.id);
      }
    });
  });

  /* — Level Up Close — */
  el('luCloseBtn').addEventListener('click', () => closeModal('levelUpOverlay'));

  /* — Checkpoint Modal — */
  el('cpHintBtn').addEventListener('click', () => {
    el('cpHint').style.display = 'block';
    el('cpHintBtn').style.display = 'none';
  });

  el('cpContinueBtn').addEventListener('click', () => {
    closeModal('checkpointOverlay');
    wb.setPaused(false);
  });

  /* — Whiteboard checkpoint event — */
  window.addEventListener('wb:checkpoint', e => {
    showCheckpoint(e.detail.question, e.detail.hint);
  });

  /* — Settings — */
  document.querySelectorAll('.speed-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.writeSpeed = btn.dataset.speed;
      wb.setSpeed(STATE.writeSpeed);
      saveState();
    });
  });

  el('soundToggle').addEventListener('click', () => {
    STATE.soundOn = !STATE.soundOn;
    el('soundToggle').textContent = STATE.soundOn ? '🔊 ON' : '🔇 OFF';
    el('soundToggle').classList.toggle('off', !STATE.soundOn);
    saveState();
  });

  el('resetProgressBtn').addEventListener('click', () => {
    if (confirm('Are you sure? This will wipe all XP and badges.')) {
      localStorage.removeItem('profByte_save2');
      location.reload();
    }
  });

  const changeNameBtn = el('changeNameBtn');
  if (changeNameBtn) {
    changeNameBtn.addEventListener('click', () => {
      localStorage.removeItem('professorByte_studentName');
      location.reload();
    });
  }

  document.querySelectorAll('.color-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyColorTheme(btn.dataset.theme);
    });
  });

  /* — Chalk tray colors — */
  document.querySelectorAll('.chalk').forEach(chalk => {
    chalk.addEventListener('click', () => {
      // Visual feedback only — chalk color preview
      chalk.style.transform = 'translateY(-4px)';
      setTimeout(() => chalk.style.transform = '', 300);
    });
  });

  /* — Eraser — */
  document.querySelector('.eraser')?.addEventListener('click', () => {
    el('clearBtn').click();
  });

  /* — Professor Avatar click — */
  el('profAvatar').addEventListener('click', () => {
    const msgs = [
      'Keep learning — every lesson makes you smarter! 🧠',
      'You\'re doing great! Knowledge is your superpower! ⚡',
      'Did you know curiosity is the best learning tool? 🔍',
      'Every expert was once a beginner. Keep going! 🚀',
    ];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    showProfMessage(msg);
  });
}

function showProfMessage(msg) {
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.style.background = 'linear-gradient(135deg,rgba(0,229,160,0.12),rgba(0,180,120,0.08))';
  toast.style.borderColor = 'rgba(0,229,160,0.3)';
  toast.innerHTML = `<div class="toast-icon">🎓</div><div class="toast-info"><div class="toast-title">Professor Byte says:</div><div class="toast-desc">${msg}</div></div>`;
  const area = el('achievementArea');
  if (area) { area.prepend(toast); setTimeout(() => toast.remove(), 5000); }
}

function applyColorTheme(theme) {
  const root = document.documentElement;
  if (theme === 'neon') {
    root.style.setProperty('--bg-board', '#050f1a');
    root.style.setProperty('--chalk-white', '#00ff88');
  } else if (theme === 'sunset') {
    root.style.setProperty('--bg-board', '#1a0f00');
    root.style.setProperty('--chalk-white', '#ffb347');
  } else {
    root.style.setProperty('--bg-board', '#1a3a2a');
    root.style.setProperty('--chalk-white', '#f0ece0');
  }
}

/* ══════════════════════════════════════════════════════════════
   26. INIT
══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  loadState();

  // Init whiteboard
  wb = new Whiteboard('boardCanvas');
  wb.setSpeed(STATE.writeSpeed || 'normal');

  // Set up settings UI to match state
  document.querySelectorAll('.speed-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.speed === STATE.writeSpeed);
  });
  el('soundToggle').textContent = STATE.soundOn ? '🔊 ON' : '🔇 OFF';
  el('soundToggle').classList.toggle('off', !STATE.soundOn);

  updateHUD();
  renderHistory();
  setupDailyChallenge();
  wireEvents();
  setupOnboarding();

  // Initial XP bar fill (animated on load)
  setTimeout(updateHUD, 300);

  console.log('🎓 Professor Byte — Gamified AI Teacher v2.0 ready!');
});
