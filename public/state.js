/* ═══════════════════════════════════════════════════════════════
   SlateMind — state.js
   Application state, configuration constants, and persistence
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── Configuration Constants ─────────────────────────────────── */
const LEVELS = [
  { level: 1,  title: 'Rookie',           xpNeeded: 0    },
  { level: 2,  title: 'Curious Learner',  xpNeeded: 150  },
  { level: 3,  title: 'Knowledge Seeker', xpNeeded: 350  },
  { level: 4,  title: 'Smart Cookie',     xpNeeded: 600  },
  { level: 5,  title: 'Brain Explorer',   xpNeeded: 950  },
  { level: 6,  title: 'Concept Master',   xpNeeded: 1400 },
  { level: 7,  title: 'Tech Wizard',      xpNeeded: 2000 },
  { level: 8,  title: 'Scholar',          xpNeeded: 2800 },
  { level: 9,  title: 'Grand Scholar',    xpNeeded: 3800 },
  { level: 10, title: 'Professor Byte',   xpNeeded: 5000 },
];

const BADGES = [
  { id: 'first_lesson', icon: '🎓', name: 'First Step',    desc: 'Complete your first lesson',     check: s => s.lessonsCompleted >= 1  },
  { id: 'lesson_5',     icon: '📚', name: 'Bookworm',      desc: 'Complete 5 lessons',             check: s => s.lessonsCompleted >= 5  },
  { id: 'lesson_10',    icon: '🔬', name: 'Lab Rat',        desc: 'Complete 10 lessons',            check: s => s.lessonsCompleted >= 10 },
  { id: 'lesson_25',    icon: '🧠', name: 'Big Brain',      desc: 'Complete 25 lessons',            check: s => s.lessonsCompleted >= 25 },
  { id: 'quiz_perfect', icon: '💯', name: 'Perfect Score',  desc: 'Score 100% on a quiz',           check: s => s.perfectQuizzes >= 1    },
  { id: 'quiz_5',       icon: '🎯', name: 'Quiz Master',    desc: 'Pass 5 quizzes',                 check: s => s.quizzesPassed >= 5    },
  { id: 'streak_3',     icon: '🔥', name: 'On Fire',        desc: '3-day streak',                   check: s => s.maxStreak >= 3        },
  { id: 'streak_7',     icon: '🌟', name: 'Week Warrior',   desc: '7-day streak',                   check: s => s.maxStreak >= 7        },
  { id: 'xp_500',       icon: '⚡', name: 'Power Up',       desc: 'Earn 500 XP',                    check: s => s.totalXP >= 500        },
  { id: 'xp_2000',      icon: '💎', name: 'XP Elite',       desc: 'Earn 2000 XP',                   check: s => s.totalXP >= 2000       },
  { id: 'speed_demon',  icon: '🚀', name: 'Speed Demon',    desc: '3 lessons at fast speed',        check: s => s.fastLessons >= 3      },
  { id: 'daily_champ',  icon: '🏆', name: 'Daily Champ',    desc: 'Complete daily challenge',       check: s => s.dailyChallenges >= 1  },
  { id: 'asker',        icon: '🙋', name: 'Curious George', desc: 'Ask 10 follow-ups',              check: s => s.followUps >= 10       },
  { id: 'combo_king',   icon: '👑', name: 'Combo King',     desc: '3 quiz answers in a row',        check: s => s.maxCombo >= 3         },
  { id: 'level_5',      icon: '🔑', name: 'Rising Star',    desc: 'Reach Level 5',                  check: s => s.level >= 5            },
  { id: 'level_max',    icon: '🎖️', name: 'Prof. Byte Jr.', desc: 'Reach max level',                check: s => s.level >= 10           },
  { id: 'night_owl',    icon: '🦉', name: 'Night Owl',      desc: 'Study after 10 PM',              check: s => s.nightStudy >= 1       },
];

const DAILY_CHALLENGES = [
  'The Water Cycle', 'How Black Holes Form', 'Pythagoras Theorem',
  'The Human Immune System', 'How Computers Work', 'Climate Change',
  'Evolution by Natural Selection', 'Nuclear Fission vs Fusion',
  'Machine Learning Basics', 'The French Revolution',
  'How Vaccines Work', 'Quantum Physics Introduction',
  "Newton's Three Laws of Motion", 'Electricity and Magnetism',
  'The Solar System', 'Chemical Bonding', 'DNA Replication',
  "Ohm's Law", 'Photosynthesis', 'Respiration in Humans',
];

const FOLLOW_UP_CHIPS = [
  'Explain that more simply',
  'Give me a real-world example',
  'Why is this important?',
  'What are common mistakes?',
  'Connect this to daily life',
  'What comes next in this topic?',
];

const LOADING_MSGS = [
  'Sharpening the chalk…', 'Preparing your lesson…',
  'Summoning knowledge…', 'Writing the plan…',
  'Consulting the scrolls…', 'Organising the board…',
];

/* ── Default State ────────────────────────────────────────────── */
const DEF = {
  playerName: 'Student',
  totalXP: 0,
  level: 1,
  lessonsCompleted: 0,
  topicsExplored: 0,
  perfectQuizzes: 0,
  quizzesPassed: 0,
  maxStreak: 0,
  currentStreak: 0,
  lastStudyDate: null,
  fastLessons: 0,
  dailyChallenges: 0,
  followUps: 0,
  nightStudy: 0,
  earnedBadges: [],
  lessonHistory: [],
  quizCorrect: 0,
  quizTotal: 0,
  maxCombo: 0,
  soundOn: true,
  writeSpeed: 'normal',
  boardTheme: 'classic',
  teachStyle: 'mentor',
  autoScroll: true,
  hasOnboarded: false,
  dailyChallengeDate: null,
  dailyChallengeDone: false,
};

/* ── Mutable Application State ────────────────────────────────── */
var STATE = {};
var interactionId = null;
var currentQuiz = [];
var quizIndex = 0;
var quizScore = 0;
var quizCombo = 0;
var lastTopic = '';
var currentRabbitHoles = [];
var wb = null;

/* ── State Persistence & DOM Helpers ──────────────────────────── */
function load() {
  try {
    const r = localStorage.getItem('pb_v2');
    STATE = r ? { ...DEF, ...JSON.parse(r) } : { ...DEF };
  } catch {
    STATE = { ...DEF };
  }
  window.STATE = STATE;
}

function save() {
  try {
    localStorage.setItem('pb_v2', JSON.stringify(STATE));
  } catch { /* storage full or blocked (private mode): progress just will not persist */ }
}

function el(id) {
  return document.getElementById(id);
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

function applyTheme(theme) {
  const r = document.documentElement;
  STATE.boardTheme = theme;
  save();
  if (theme === 'neon') {
    r.style.setProperty('--bg-board', '#050f1a');
    r.style.setProperty('--chalk-white', '#00ff88');
  } else if (theme === 'sunset') {
    r.style.setProperty('--bg-board', '#1a0f00');
    r.style.setProperty('--chalk-white', '#ffb347');
  } else if (theme === 'slate') {
    r.style.setProperty('--bg-board', '#111418');
    r.style.setProperty('--chalk-white', '#f8fafc');
  } else if (theme === 'whiteboard') {
    r.style.setProperty('--bg-board', '#f8fafc');
    r.style.setProperty('--chalk-white', '#0f172a');
  } else {
    r.style.setProperty('--bg-board', '#1a3a2a');
    r.style.setProperty('--chalk-white', '#f0ece0');
  }
}

// Bind to window for global access
window.LEVELS = LEVELS;
window.BADGES = BADGES;
window.DAILY_CHALLENGES = DAILY_CHALLENGES;
window.FOLLOW_UP_CHIPS = FOLLOW_UP_CHIPS;
window.LOADING_MSGS = LOADING_MSGS;
window.DEF = DEF;
window.STATE = STATE;
window.load = load;
window.save = save;
window.el = el;
window.esc = esc;
window.openModal = openModal;
window.closeModal = closeModal;
window.applyTheme = applyTheme;
