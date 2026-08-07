/* ═══════════════════════════════════════════════════════════════
   app.js  —  SlateMind v2.1  |  Full game engine
   All bugs fixed, all features wired
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════════════════════════════
   1. CONFIG
══════════════════════════════════════════════════════════════ */
const LEVELS = [
  { level:1,  title:'Rookie',           xpNeeded:0    },
  { level:2,  title:'Curious Learner',  xpNeeded:150  },
  { level:3,  title:'Knowledge Seeker', xpNeeded:350  },
  { level:4,  title:'Smart Cookie',     xpNeeded:600  },
  { level:5,  title:'Brain Explorer',   xpNeeded:950  },
  { level:6,  title:'Concept Master',   xpNeeded:1400 },
  { level:7,  title:'Tech Wizard',      xpNeeded:2000 },
  { level:8,  title:'Scholar',          xpNeeded:2800 },
  { level:9,  title:'Grand Scholar',    xpNeeded:3800 },
  { level:10, title:'Professor Byte',   xpNeeded:5000 },
];

const BADGES = [
  { id:'first_lesson',  icon:'🎓', name:'First Step',     desc:'Complete your first lesson',       check:s=>s.lessonsCompleted>=1  },
  { id:'lesson_5',      icon:'📚', name:'Bookworm',        desc:'Complete 5 lessons',               check:s=>s.lessonsCompleted>=5  },
  { id:'lesson_10',     icon:'🔬', name:'Lab Rat',         desc:'Complete 10 lessons',              check:s=>s.lessonsCompleted>=10 },
  { id:'lesson_25',     icon:'🧠', name:'Big Brain',       desc:'Complete 25 lessons',              check:s=>s.lessonsCompleted>=25 },
  { id:'quiz_perfect',  icon:'💯', name:'Perfect Score',   desc:'Score 100% on a quiz',             check:s=>s.perfectQuizzes>=1    },
  { id:'quiz_5',        icon:'🎯', name:'Quiz Master',     desc:'Pass 5 quizzes',                   check:s=>s.quizzesPassed>=5     },
  { id:'streak_3',      icon:'🔥', name:'On Fire',         desc:'3-day learning streak',            check:s=>s.maxStreak>=3         },
  { id:'streak_7',      icon:'🌟', name:'Week Warrior',    desc:'7-day learning streak',            check:s=>s.maxStreak>=7         },
  { id:'xp_500',        icon:'⚡', name:'Power Up',        desc:'Earn 500 XP',                      check:s=>s.totalXP>=500         },
  { id:'xp_2000',       icon:'💎', name:'XP Elite',        desc:'Earn 2000 XP',                     check:s=>s.totalXP>=2000        },
  { id:'speed_demon',   icon:'🚀', name:'Speed Demon',     desc:'Watch 3 lessons at fast speed',    check:s=>s.fastLessons>=3       },
  { id:'daily_champ',   icon:'🏆', name:'Daily Champion',  desc:'Complete the daily challenge',     check:s=>s.dailyChallenges>=1   },
  { id:'asker',         icon:'🙋', name:'Curious George',  desc:'Ask 10 follow-up questions',       check:s=>s.followUps>=10        },
  { id:'level_5',       icon:'👑', name:'Rising Star',     desc:'Reach Level 5',                    check:s=>s.level>=5             },
  { id:'level_max',     icon:'🎖️', name:'Prof. Byte Jr.', desc:'Reach max level (10)',              check:s=>s.level>=10            },
  { id:'night_owl',     icon:'🦉', name:'Night Owl',       desc:'Study after 10 PM',                check:s=>s.nightStudy>=1        },
];

const DAILY_CHALLENGES = [
  'The Water Cycle','How Black Holes Form','Pythagoras Theorem',
  'The Human Immune System','How Computers Work','Climate Change and Global Warming',
  'Evolution by Natural Selection','Nuclear Fission vs Fusion',
  'Machine Learning Basics','The French Revolution',
  'How Vaccines Work','Quantum Physics Introduction',
  'The Carbon Cycle',"India's Freedom Struggle",'DNA Replication',
  "Newton's Three Laws of Motion",'Electricity and Magnetism',
  'The Solar System','Chemical Bonding','Respiration in Humans',
];

const FOLLOW_UP_CHIPS = [
  'Explain that more simply',
  'Give me a real-world example',
  'How does this work in practice?',
  'Why is this important?',
  'What are common mistakes to avoid?',
  'How does this connect to daily life?',
];

const RESULT_MESSAGES = {
  3:['🔥 Flawless! You aced it!','🌟 Perfect score! Brilliant!','💯 Outstanding work!'],
  2:['👍 Great job! Almost perfect!','📚 Solid understanding!','⚡ Sharp thinking!'],
  1:['🙂 Good start! Review and retry!','📖 Keep at it — you\'re getting there!','💪 Practice makes perfect!'],
  0:['😅 Time to review the lesson!','🔄 Don\'t give up — retry and conquer!','📝 Let\'s go over this again!'],
};

const LOADING_MESSAGES = [
  'Professor Byte is sharpening the chalk…',
  'Organising thoughts on the blackboard…',
  'Preparing a comprehensive lesson…',
  'Summoning knowledge from the cosmos…',
  'Calculating the perfect explanation…',
  'Brewing a brilliant lesson plan…',
  'Consulting the ancient scrolls of knowledge…',
];

/* ══════════════════════════════════════════════════════════════
   2. STATE
══════════════════════════════════════════════════════════════ */
const DEFAULT_STATE = {
  playerName:'Student', totalXP:0, level:1,
  lessonsCompleted:0, topicsExplored:0,
  perfectQuizzes:0, quizzesPassed:0,
  maxStreak:0, currentStreak:0,
  lastStudyDate:null,
  fastLessons:0, dailyChallenges:0, followUps:0, nightStudy:0,
  earnedBadges:[], lessonHistory:[],
  quizCorrect:0, quizTotal:0,
  soundOn:true, writeSpeed:'normal',
  hasOnboarded:false,
  dailyChallengeDate:null, dailyChallengeDone:false,
};

let STATE         = {};
let interactionId = null;
let currentQuiz   = [];
let quizIndex     = 0;        // 0-based internally
let quizScore     = 0;
let currentLesson = null;
let lastTopic     = '';
let wb            = null;
let _audioCtx     = null;     // lazy-init AudioContext

/* ══════════════════════════════════════════════════════════════
   3. PERSISTENCE
══════════════════════════════════════════════════════════════ */
function loadState() {
  try {
    const raw = localStorage.getItem('pb_state_v2');
    STATE = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
  } catch { STATE = { ...DEFAULT_STATE }; }
}
function saveState() {
  try { localStorage.setItem('pb_state_v2', JSON.stringify(STATE)); } catch {}
}

/* ══════════════════════════════════════════════════════════════
   4. XP & LEVEL ENGINE
══════════════════════════════════════════════════════════════ */
function getLevelInfo(xp) {
  let current = LEVELS[0], next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpNeeded) {
      current = LEVELS[i];
      next    = LEVELS[i + 1] || null;
      break;
    }
  }
  return { current, next };
}

function awardXP(amount) {
  if (!amount || amount <= 0) return;
  const prevLevel = STATE.level;
  STATE.totalXP  += amount;
  const { current } = getLevelInfo(STATE.totalXP);
  STATE.level = current.level;
  updateHUD();
  showXPPopup(amount);
  saveState();
  if (STATE.level > prevLevel) {
    setTimeout(() => showLevelUp(current, amount), 900);
  }
  checkBadges();
}

function getXPProgress() {
  const { current, next } = getLevelInfo(STATE.totalXP);
  if (!next) return { pct:100, current:STATE.totalXP, needed:STATE.totalXP };
  const base  = current.xpNeeded;
  const range = next.xpNeeded - base;
  const done  = STATE.totalXP - base;
  return { pct: Math.min(100,(done/range)*100), current:done, needed:range };
}

/* ══════════════════════════════════════════════════════════════
   5. STREAK ENGINE  (fixed implementation)
══════════════════════════════════════════════════════════════ */
function updateStreak() {
  const today     = new Date().toDateString();
  const lastVisit = STATE.lastStudyDate;
  if (lastVisit === today) return; // already counted today

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  STATE.currentStreak = (lastVisit === yesterday) ? STATE.currentStreak + 1 : 1;
  if (STATE.currentStreak > STATE.maxStreak) STATE.maxStreak = STATE.currentStreak;
  STATE.lastStudyDate = today;

  // Night owl
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 4) STATE.nightStudy++;

  saveState();
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
  const area = el('achievementArea');
  if (!area) return;
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="toast-icon">${badge.icon}</div>
    <div class="toast-info">
      <div class="toast-title">🏅 Badge Unlocked!</div>
      <div class="toast-desc">${badge.name} — ${badge.desc}</div>
    </div>`;
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
  el('xpBarLabel').textContent        = next
    ? `${prog.current} / ${prog.needed} XP`
    : 'MAX LEVEL ⭐';

  el('totalXP').textContent      = STATE.totalXP;
  el('streakCount').textContent  = STATE.currentStreak;
  el('lessonsCount').textContent = STATE.lessonsCompleted;
  el('topicsCount').textContent  = STATE.topicsExplored || 0;

  el('streakChip').classList.toggle('active', STATE.currentStreak >= 3);
}

/* ══════════════════════════════════════════════════════════════
   8. XP POPUP
══════════════════════════════════════════════════════════════ */
function showXPPopup(amount) {
  const popup = el('xpPopup');
  el('xpPopupVal').textContent = amount;
  popup.style.display  = 'block';
  popup.style.left     = (window.innerWidth / 2 - 50) + 'px';
  popup.style.top      = (window.innerHeight / 2 - 40) + 'px';
  popup.style.animation = 'none';
  void popup.offsetWidth;
  popup.style.animation = 'xpFloat 1.3s ease-out forwards';
  setTimeout(() => { popup.style.display = 'none'; }, 1400);
}

/* ══════════════════════════════════════════════════════════════
   9. LEVEL UP MODAL  (now shows XP earned)
══════════════════════════════════════════════════════════════ */
function showLevelUp(lvlInfo, xpEarned) {
  el('luLevel').textContent    = `Level ${lvlInfo.level}`;
  el('luTitleName').textContent = lvlInfo.title;
  el('luXpEarned').textContent  = xpEarned ? `+${xpEarned} XP earned this lesson!` : '';
  openModal('levelUpOverlay');
  playSound('levelup');
  updateHUD();
}

/* ══════════════════════════════════════════════════════════════
   10. LESSON ENGINE
══════════════════════════════════════════════════════════════ */
async function startLesson(topic, isDaily = false) {
  topic = (topic || '').trim();
  if (!topic) {
    el('topicInput').focus();
    el('topicInput').classList.add('error');
    el('topicError').style.display = 'block';
    setTimeout(() => {
      el('topicInput').classList.remove('error');
      el('topicError').style.display = 'none';
    }, 2500);
    return;
  }

  lastTopic = topic;
  hideError();
  setUIState('loading');

  el('boardIdle').style.display    = 'none';
  el('boardLoading').style.display = 'flex';
  el('boardError').style.display   = 'none';
  el('loadingText').textContent    = LOADING_MESSAGES[Math.floor(Math.random()*LOADING_MESSAGES.length)];

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 30000);

    const res = await fetch('/api/lesson', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ topic }),
      signal:  controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data     = await res.json();
    interactionId  = data.interactionId;
    currentLesson  = { topic, data };

    el('boardLoading').style.display = 'none';
    showLessonMeta(topic, data);
    wb.clear();
    wb.setSpeed(STATE.writeSpeed);

    if (STATE.writeSpeed === 'fast' || STATE.writeSpeed === 'instant') STATE.fastLessons++;

    setUIState('writing');

    await wb.renderLesson(data.blocks || [], {
      onAllDone: () => onLessonComplete(data, topic, isDaily),
    });

  } catch (err) {
    el('boardLoading').style.display = 'none';
    showError(err.name === 'AbortError'
      ? 'Request timed out — please try again.'
      : (err.message || 'Could not connect to Professor Byte.'));
    setUIState('idle');
    console.error('Lesson error:', err);
  }
}

function onLessonComplete(data, topic, isDaily) {
  STATE.lessonsCompleted++;
  STATE.topicsExplored = (STATE.topicsExplored || 0) + 1;
  updateStreak(); // call once, on lesson completion only

  if (isDaily) {
    STATE.dailyChallenges++;
    STATE.dailyChallengeDone = true;
    STATE.dailyChallengeDate = new Date().toDateString();
    setupDailyChallenge(); // refresh button state
  }
  saveState();

  const xp = data.xpReward || 100;
  awardXP(xp);
  addToHistory(topic, data);
  showFactCard(data.funFact);
  showGlossary(data.keyTerms);
  showQuiz(data.quiz);
  el('askDock').style.display = 'block';
  populateAskChips();
  setUIState('done');
  checkBadges();
  playSound('complete');
}

function showLessonMeta(topic, data) {
  el('metaTopic').textContent  = topic;
  const diff   = data.difficulty || 'Intermediate';
  const diffEl = el('metaDiff');
  diffEl.textContent = diff;
  diffEl.className   = `meta-diff diff-${diff}`;
  el('metaXP').textContent   = `+${data.xpReward || 100} XP`;
  el('metaTerms').textContent = data.keyTerms?.length
    ? '📌 ' + data.keyTerms.slice(0,3).join(', ') : '';
  el('lessonMeta').style.display = 'flex';
}

/* ══════════════════════════════════════════════════════════════
   11. FOLLOW-UP
══════════════════════════════════════════════════════════════ */
async function askFollowUp(question) {
  if (!question?.trim() || !interactionId) return;
  question = question.trim();
  el('askBtn').disabled  = true;
  el('askInput').value   = '';
  STATE.followUps++;
  saveState();
  checkBadges();
  setUIState('writing');

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 30000);

    const res = await fetch('/api/ask', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ question, interactionId }),
      signal:  controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const data    = await res.json();
    interactionId = data.interactionId;

    await wb.appendBlocks(data.blocks || [], {
      onAllDone: () => {
        setUIState('done');
        if (data.xpReward) awardXP(data.xpReward);
      },
    });
  } catch (err) {
    console.error('Ask error:', err);
    setUIState('done');
    showProfMessage('⚠️ Couldn\'t get an answer — please try again.');
  } finally {
    el('askBtn').disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════════
   12. QUIZ ENGINE  (counter fully wired)
══════════════════════════════════════════════════════════════ */
function showQuiz(quiz) {
  if (!quiz || !quiz.length) return;
  currentQuiz = quiz;
  quizIndex   = 0;
  quizScore   = 0;
  el('quizCard').style.display   = 'block';
  el('resultCard').style.display = 'none';
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q     = currentQuiz[quizIndex];
  const total = currentQuiz.length;
  if (!q) return;

  // Counter: 1-based display, wired to quizIndex
  el('quizQCount').textContent  = `Question ${quizIndex + 1} / ${total}`;
  el('quizProgFill').style.width = ((quizIndex / total) * 100) + '%';
  el('quizQuestion').textContent = q.question;
  el('quizExplanation').style.display = 'none';
  el('quizNextBtn').style.display     = 'none';

  const opts    = el('quizOptions');
  opts.innerHTML = '';
  ['A','B','C','D'].forEach((letter, i) => {
    if (!q.options[i]) return;
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.innerHTML = `<span class="opt-letter">${letter}</span>${q.options[i]}`;
    btn.addEventListener('click', () => handleQuizAnswer(i, q));
    opts.appendChild(btn);
  });
}

function handleQuizAnswer(chosen, q) {
  const correct = q.correct;
  document.querySelectorAll('.quiz-opt').forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct)     btn.classList.add('correct');
    else if (i === chosen) btn.classList.add('wrong');
  });

  STATE.quizTotal++;
  if (chosen === correct) {
    quizScore++;
    STATE.quizCorrect++;
    playSound('correct');
  } else {
    playSound('wrong');
  }
  saveState();

  el('quizExplanation').textContent   = q.explanation;
  el('quizExplanation').style.display = 'block';
  el('quizNextBtn').style.display     = 'inline-block';
  el('quizNextBtn').textContent       = quizIndex < currentQuiz.length - 1
    ? 'Next ➤' : 'See Results ➤';
}

function nextQuizQuestion() {
  quizIndex++; // increment counter
  if (quizIndex < currentQuiz.length) {
    renderQuizQuestion(); // counter display updates inside
  } else {
    showQuizResult();
  }
}

function showQuizResult() {
  const total = currentQuiz.length;
  const pct   = Math.round((quizScore / total) * 100);
  const stars = quizScore === total ? '⭐⭐⭐' : quizScore >= Math.ceil(total/2) ? '⭐⭐' : '⭐';
  const msgs  = RESULT_MESSAGES[Math.min(quizScore, 3)];
  const msg   = msgs[Math.floor(Math.random() * msgs.length)];

  el('quizCard').style.display   = 'none';
  el('resultCard').style.display = 'block';
  el('resultStars').textContent  = stars;
  el('resultScore').textContent  = `${quizScore} / ${total} (${pct}%)`;
  el('resultMsg').textContent    = msg;

  const quizXP = quizScore * 20;
  el('resultXP').textContent = `+${quizXP} XP earned!`;
  awardXP(quizXP);

  if (quizScore === total) STATE.perfectQuizzes++;
  if (quizScore >= Math.ceil(total/2)) STATE.quizzesPassed++;
  saveState();
  checkBadges();
  playSound(quizScore === total ? 'perfect' : 'complete');
}

function retryQuiz() {
  // Reset counter and re-render
  showQuiz(currentQuiz);
}

/* ══════════════════════════════════════════════════════════════
   13. FACT & GLOSSARY
══════════════════════════════════════════════════════════════ */
function showFactCard(fact) {
  if (!fact) return;
  el('factText').textContent   = fact;
  el('factCard').style.display = 'block';
}

function showGlossary(terms) {
  if (!terms?.length) return;
  el('glossaryList').innerHTML = terms.map(t =>
    `<div class="glossary-term"><span class="term-word">${t}</span></div>`
  ).join('');
  el('glossaryCard').style.display = 'block';
}

/* ══════════════════════════════════════════════════════════════
   14. LESSON HISTORY
══════════════════════════════════════════════════════════════ */
function addToHistory(topic, data) {
  const entry = {
    id: Date.now(), topic,
    diff: data.difficulty || 'Intermediate',
    xp:   data.xpReward  || 100,
    ts:   Date.now(),
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
  const icons = { Beginner:'🟢', Intermediate:'🟡', Advanced:'🔴' };
  container.innerHTML = STATE.lessonHistory.slice(0,20).map((h,i) => `
    <div class="history-item${i===0?' active':''}" data-topic="${encodeURIComponent(h.topic)}">
      <span class="hi-icon">${icons[h.diff]||'📖'}</span>
      <div class="hi-info">
        <div class="hi-topic">${h.topic}</div>
        <div class="hi-meta">+${h.xp} XP · <span class="hi-diff diff-${h.diff}">${h.diff}</span></div>
      </div>
    </div>`).join('');

  container.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const topic = decodeURIComponent(item.dataset.topic);
      el('topicInput').value = topic;
      container.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      el('topicInput').focus();
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   15. DAILY CHALLENGE  (fixed with fallback)
══════════════════════════════════════════════════════════════ */
const FALLBACK_CHALLENGE = 'Explain the difference between speed and velocity';

function setupDailyChallenge() {
  const today  = new Date().toDateString();
  const dayIdx = Math.floor(Date.now() / 86400000) % DAILY_CHALLENGES.length;
  const topic  = DAILY_CHALLENGES[dayIdx] || FALLBACK_CHALLENGE;

  el('dcTopic').textContent = topic;

  const done = STATE.dailyChallengeDate === today && STATE.dailyChallengeDone;
  const btn  = el('dcBtn');
  btn.disabled    = done;
  btn.textContent = done ? '✅ Completed Today!' : 'Accept Challenge';

  btn.onclick = () => {
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
  chips.innerHTML = FOLLOW_UP_CHIPS.map(chip =>
    `<button class="ask-chip">${chip}</button>`
  ).join('');
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
  el('badgesGrid').innerHTML = BADGES.map(b => {
    const earned = STATE.earnedBadges.includes(b.id);
    return `<div class="badge-cell ${earned?'earned':'locked'}" title="${b.desc}">
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   18. LEADERBOARD  (label fixed)
══════════════════════════════════════════════════════════════ */
function renderLeaderboard() {
  const sessions = JSON.parse(localStorage.getItem('pb_sessions') || '[]');
  const you      = { name: STATE.playerName, xp: STATE.totalXP, isYou: true };
  const all      = [...sessions.filter(s => s.name !== STATE.playerName), you]
    .sort((a,b) => b.xp - a.xp).slice(0,10);

  const rankClass = ['gold','silver','bronze'];
  el('lbList').innerHTML = all.map((s,i) => `
    <div class="lb-row${s.isYou?' you':''}">
      <span class="lb-rank ${rankClass[i]||''}">${['🥇','🥈','🥉'][i]||(i+1)}</span>
      <span class="lb-name">${s.name}${s.isYou?' (You)':''}</span>
      <span class="lb-xp">${s.xp} XP</span>
    </div>`).join('');

  const rank = all.findIndex(s=>s.isYou) + 1;
  el('lbYourRank').textContent = `Your rank: #${rank} · ${STATE.totalXP} XP total`;
  localStorage.setItem('pb_sessions', JSON.stringify(all.map(s=>({name:s.name,xp:s.xp}))));
}

/* ══════════════════════════════════════════════════════════════
   19. CHECKPOINT
══════════════════════════════════════════════════════════════ */
function showCheckpoint(question, hint) {
  el('cpQuestion').textContent = question;
  el('cpHint').textContent     = hint;
  el('cpHint').style.display   = 'none';
  el('cpHintBtn').style.display = 'block';
  openModal('checkpointOverlay');
  wb.setPaused(true);
  playSound('checkpoint');
}

/* ══════════════════════════════════════════════════════════════
   20. ERROR DISPLAY
══════════════════════════════════════════════════════════════ */
function showError(msg) {
  el('errText').textContent    = msg || 'Professor Byte couldn\'t connect. Please try again.';
  el('boardError').style.display = 'flex';
  el('boardIdle').style.display  = 'none';
}
function hideError() {
  el('boardError').style.display = 'none';
}

/* ══════════════════════════════════════════════════════════════
   21. UI STATE MACHINE
══════════════════════════════════════════════════════════════ */
function setUIState(state) {
  const teachBtn = el('teachBtn');
  const askBtn   = el('askBtn');
  switch (state) {
    case 'idle':
      el('boardControls').style.display = 'none';
      teachBtn.disabled = false;
      break;
    case 'loading':
      el('boardControls').style.display = 'none';
      el('askDock').style.display       = 'none';
      teachBtn.disabled = true;
      if (askBtn) askBtn.disabled = true;
      break;
    case 'writing':
      el('boardControls').style.display = 'flex';
      teachBtn.disabled = true;
      el('pauseBtn').textContent = '⏸ Pause';
      break;
    case 'done':
      el('boardControls').style.display = 'flex';
      teachBtn.disabled = false;
      if (askBtn) askBtn.disabled = false;
      break;
  }
}

/* ══════════════════════════════════════════════════════════════
   22. SOUND ENGINE  (lazy AudioContext init — no autoplay block)
══════════════════════════════════════════════════════════════ */
function initAudio() {
  if (_audioCtx) return _audioCtx;
  try {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {}
  return _audioCtx;
}

function playSound(type) {
  if (!STATE.soundOn) return;
  const ctx = _audioCtx; // only use if already initialised
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
      osc.frequency.setValueAtTime(659, now+0.1);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now+0.35);
      osc.start(now); osc.stop(now+0.35); break;
    case 'wrong':
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now+0.22);
      osc.start(now); osc.stop(now+0.22); break;
    case 'levelup':
      osc.type = 'sine';
      [261,329,392,523].forEach((f,i) => osc.frequency.setValueAtTime(f, now+i*0.12));
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now+0.6);
      osc.start(now); osc.stop(now+0.6); break;
    case 'badge':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1108, now+0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now+0.28);
      osc.start(now); osc.stop(now+0.28); break;
    case 'checkpoint':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now+0.4);
      osc.start(now); osc.stop(now+0.4); break;
    case 'perfect':
      [523,659,784,1046].forEach((f,i) => {
        const o2=ctx.createOscillator(), g2=ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type='sine'; o2.frequency.value=f;
        g2.gain.setValueAtTime(0.09, now+i*0.1);
        g2.gain.exponentialRampToValueAtTime(0.001, now+i*0.1+0.3);
        o2.start(now+i*0.1); o2.stop(now+i*0.1+0.3);
      }); return;
    case 'complete':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now+0.15);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now+0.4);
      osc.start(now); osc.stop(now+0.4); break;
  }
}

/* ══════════════════════════════════════════════════════════════
   23. MODALS
══════════════════════════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id)?.classList.add('active');    }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

/* ══════════════════════════════════════════════════════════════
   24. MISC UTILS
══════════════════════════════════════════════════════════════ */
function el(id) { return document.getElementById(id); }

function showProfMessage(msg) {
  const area  = el('achievementArea');
  if (!area) return;
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.style.cssText = 'background:rgba(0,229,160,0.1);border-color:rgba(0,229,160,0.3)';
  toast.innerHTML = `<div class="toast-icon">🎓</div>
    <div class="toast-info">
      <div class="toast-title">Professor Byte</div>
      <div class="toast-desc">${msg}</div>
    </div>`;
  area.prepend(toast);
  setTimeout(() => toast.remove(), 5000);
}

function applyColorTheme(theme) {
  const r = document.documentElement;
  if (theme === 'neon') {
    r.style.setProperty('--bg-board','#050f1a');
    r.style.setProperty('--chalk-white','#00ff88');
  } else if (theme === 'sunset') {
    r.style.setProperty('--bg-board','#1a0f00');
    r.style.setProperty('--chalk-white','#ffb347');
  } else {
    r.style.setProperty('--bg-board','#1a3a2a');
    r.style.setProperty('--chalk-white','#f0ece0');
  }
}

/* ══════════════════════════════════════════════════════════════
   25. ONBOARDING  (persists name, skips on return)
══════════════════════════════════════════════════════════════ */
function setupOnboarding() {
  const nameInput = el('studentNameInput');
  const startBtn  = el('startAdventureBtn');

  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') startBtn.click();
  });

  startBtn.addEventListener('click', () => {
    // Lazy-init AudioContext on first real user interaction
    initAudio();

    const name = nameInput.value.trim() || 'Student';
    STATE.playerName  = name;
    STATE.hasOnboarded = true;
    // Persist name separately for quick access
    localStorage.setItem('pb_studentName', name);
    saveState();
    updateHUD();
    closeModal('splashOverlay');
    playSound('levelup');
  });

  // Skip onboarding if already done
  const savedName = localStorage.getItem('pb_studentName');
  if (STATE.hasOnboarded && savedName) {
    STATE.playerName = savedName;
    closeModal('splashOverlay');
  } else {
    nameInput.focus();
  }
}

/* ══════════════════════════════════════════════════════════════
   26. EVENT WIRING
══════════════════════════════════════════════════════════════ */
function wireEvents() {

  /* — Topic Input — */
  const topicInput = el('topicInput');
  const teachBtn   = el('teachBtn');

  topicInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); teachBtn.click(); }
  });
  topicInput.addEventListener('input', () => {
    topicInput.classList.remove('error');
    el('topicError').style.display = 'none';
  });

  teachBtn.addEventListener('click', () => {
    const topic = topicInput.value.trim();
    startLesson(topic);
    if (topic) topicInput.value = '';
  });

  /* — Suggestion chips — */
  document.querySelectorAll('.sug-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const topic = chip.dataset.topic || chip.textContent;
      el('topicInput').value = topic;
      startLesson(topic);
    });
  });

  /* — Ask — */
  const askInput = el('askInput');
  const askBtn   = el('askBtn');
  askInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); askBtn.click(); }
  });
  askBtn.addEventListener('click', () => {
    const q = askInput.value.trim();
    if (q) askFollowUp(q);
  });

  /* — Board Controls — */
  el('pauseBtn').addEventListener('click', () => {
    const p = !wb._paused;
    wb.setPaused(p);
    el('pauseBtn').textContent = p ? '▶ Resume' : '⏸ Pause';
  });

  el('speedBtn').addEventListener('click', () => {
    const speeds = ['slow','normal','fast','instant'];
    const icons  = ['🐢','🚶','🐇','⚡'];
    const labels = ['Slow','Normal','Fast','Instant'];
    const next   = (speeds.indexOf(STATE.writeSpeed) + 1) % speeds.length;
    STATE.writeSpeed = speeds[next];
    wb.setSpeed(STATE.writeSpeed);
    el('speedBtn').textContent = `${icons[next]} ${labels[next]}`;
    saveState();
  });

  el('clearBtn').addEventListener('click', () => {
    wb.clear();
    interactionId = null; currentLesson = null;
    el('boardIdle').style.display       = 'flex';
    el('boardIdle').querySelector('.idle-text').textContent = 'Professor Byte is ready to teach!';
    el('boardIdle').querySelector('.idle-sub').textContent  = 'Type a topic → Press ▶ to start your lesson';
    el('boardError').style.display      = 'none';
    el('lessonMeta').style.display      = 'none';
    el('askDock').style.display         = 'none';
    el('boardControls').style.display   = 'none';
    el('factCard').style.display        = 'none';
    el('glossaryCard').style.display    = 'none';
    el('quizCard').style.display        = 'none';
    el('resultCard').style.display      = 'none';
    el('topicInput').focus();
    setUIState('idle');
  });

  el('screenshotBtn').addEventListener('click', () => wb.saveAsImage());

  /* — Sidebar toggle (open + close) — */
  el('collapseBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('collapsed');
    el('sidebarOpenBtn').style.display = 'flex';
    el('collapseBtn').style.display    = 'none';
  });

  el('sidebarOpenBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('collapsed');
    el('sidebarOpenBtn').style.display = 'none';
    el('collapseBtn').style.display    = 'flex';
  });

  /* — Error retry — */
  el('errRetryBtn').addEventListener('click', () => {
    hideError();
    if (lastTopic) startLesson(lastTopic);
  });

  /* — Quiz — */
  el('quizNextBtn').addEventListener('click', nextQuizQuestion);
  el('retryQuizBtn').addEventListener('click', retryQuiz);

  /* — HUD Buttons — */
  el('badgesBtn').addEventListener('click', () => { renderBadgesModal(); openModal('badgesOverlay'); });
  el('leaderboardBtn').addEventListener('click', () => { renderLeaderboard(); openModal('leaderboardOverlay'); });
  el('settingsBtn').addEventListener('click', () => openModal('settingsOverlay'));

  /* — Modal closes — */
  document.querySelectorAll('.modal-close[data-close]').forEach(btn =>
    btn.addEventListener('click', () => closeModal(btn.dataset.close))
  );
  document.querySelectorAll('.modal-overlay').forEach(overlay =>
    overlay.addEventListener('click', e => {
      if (e.target === overlay && overlay.id !== 'splashOverlay') closeModal(overlay.id);
    })
  );

  el('luCloseBtn').addEventListener('click', () => closeModal('levelUpOverlay'));

  /* — Checkpoint — */
  el('cpHintBtn').addEventListener('click', () => {
    el('cpHint').style.display    = 'block';
    el('cpHintBtn').style.display = 'none';
  });
  el('cpContinueBtn').addEventListener('click', () => {
    closeModal('checkpointOverlay');
    wb.setPaused(false);
  });

  window.addEventListener('wb:checkpoint', e =>
    showCheckpoint(e.detail.question, e.detail.hint)
  );

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

  el('changeNameBtn').addEventListener('click', () => {
    localStorage.removeItem('pb_studentName');
    STATE.hasOnboarded = false;
    saveState();
    closeModal('settingsOverlay');
    openModal('splashOverlay');
    el('studentNameInput').value = '';
    setTimeout(() => el('studentNameInput').focus(), 300);
  });

  el('resetProgressBtn').addEventListener('click', () => {
    if (confirm('Reset ALL progress? This cannot be undone!')) {
      localStorage.clear();
      location.reload();
    }
  });

  document.querySelectorAll('.color-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyColorTheme(btn.dataset.theme);
    });
  });

  /* — Chalk tray & eraser — */
  document.querySelector('.eraser')?.addEventListener('click', () => el('clearBtn').click());

  /* — Prof avatar — */
  el('profAvatar').addEventListener('click', () => {
    const msgs = [
      'Keep learning — every lesson makes you smarter! 🧠',
      'You\'re doing great! Knowledge is your superpower! ⚡',
      'Curiosity is the best learning tool! 🔍',
      'Every expert was once a beginner. Keep going! 🚀',
      'The more you learn, the more you earn — XP that is! 🎮',
    ];
    showProfMessage(msgs[Math.floor(Math.random() * msgs.length)]);
  });
}

/* ══════════════════════════════════════════════════════════════
   27. INIT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadState();

  wb = new Whiteboard('boardCanvas');
  wb.setSpeed(STATE.writeSpeed || 'normal');

  // Sync settings UI
  document.querySelectorAll('.speed-opt').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.speed === STATE.writeSpeed)
  );
  el('soundToggle').textContent = STATE.soundOn ? '🔊 ON' : '🔇 OFF';
  el('soundToggle').classList.toggle('off', !STATE.soundOn);

  updateHUD();
  renderHistory();
  setupDailyChallenge();
  wireEvents();
  setupOnboarding();

  setTimeout(updateHUD, 400);
  console.log('🎓 SlateMind v2.1 ready — Professor Byte at your service!');
});
