/* ═══════════════════════════════════════════════════════════════
   SlateMind — learning.js
   Everything that makes SlateMind adapt to the student and report on learning,
   with no accounts: all data stays on the device.

   Part 1 (pure logic, unit-tested): answer tracking, spaced-revision deck,
          learning insights, shareable report, class-level merge.
   Part 2 (UI): insights modal, revision card, accessibility, read aloud, careers.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── Part 1: pure logic ───────────────────────────────────────── */
const DAY_MS = 864e5;
const BOX_DAYS = [1, 3, 7, 14];   // a card returns after 1, 3, 7, 14 days, then is retired
const MAX_DECK = 60;
const WEAK_BELOW = 0.6;           // accuracy under 60% counts as a weak topic
const STRONG_FROM = 0.8;
const MIN_ATTEMPTS = 2;           // fewer answers than this is too little evidence to judge a topic
const REPORT_KIND = 'slatemind-report';

/** Adds the learning fields to a saved state that pre-dates them. */
function ensureLearningState(state) {
  state.profile = { level: 'Class 11-12', language: 'English', ...(state.profile || {}) };
  state.a11y = { readable: false, bigText: false, contrast: false, ...(state.a11y || {}) };
  if (!state.topicStats || typeof state.topicStats !== 'object') state.topicStats = {};
  if (!Array.isArray(state.deck)) state.deck = [];
  return state;
}

/**
 * Records one quiz answer. A wrong answer puts the question in the revision deck;
 * a right answer during revision moves its card to the next, longer interval.
 */
function recordAnswer(state, topic, q, wasCorrect, now = Date.now()) {
  ensureLearningState(state);
  const name = String(topic || 'General').slice(0, 80);
  const stats = state.topicStats[name] || (state.topicStats[name] = { right: 0, wrong: 0, last: 0 });
  if (wasCorrect) stats.right++; else stats.wrong++;
  stats.last = now;

  const key = q._cardKey || `${name}|${q.question}`;
  let card = state.deck.find(c => c.key === key);
  if (!wasCorrect) {
    if (!card) {
      card = {
        key, topic: name, question: q.question, options: q.options, correct: q.correct,
        explanation: q.explanation || '', reteach: q.reteach || q.explanation || '', box: 0, due: 0,
      };
      state.deck.push(card);
      if (state.deck.length > MAX_DECK) state.deck.shift();
    }
    card.box = 0;
    card.due = now + BOX_DAYS[0] * DAY_MS;
  } else if (card && q._cardKey) {         // only revision answers move a card forward
    card.box++;
    if (card.box >= BOX_DAYS.length) state.deck = state.deck.filter(c => c !== card);
    else card.due = now + BOX_DAYS[card.box] * DAY_MS;
  }
  return card || null;
}

function dueCards(state, now = Date.now()) {
  return (state.deck || []).filter(c => c.due <= now);
}

/** Cards for one revision round: the ones due, or, if none are due, the soonest ones as optional practice. */
function revisionSet(state, now = Date.now(), limit = 5) {
  const deck = [...(state.deck || [])].sort((a, b) => a.due - b.due);
  const due = deck.filter(c => c.due <= now);
  return (due.length ? due : deck).slice(0, limit);
}

const accuracyOf = (right, wrong) => (right + wrong ? right / (right + wrong) : 0);

function computeInsights(state, now = Date.now()) {
  const topics = Object.entries(state.topicStats || {}).map(([topic, s]) => {
    const total = s.right + s.wrong;
    return { topic, right: s.right, wrong: s.wrong, total, accuracy: accuracyOf(s.right, s.wrong) };
  }).filter(t => t.total > 0).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);

  const right = topics.reduce((n, t) => n + t.right, 0);
  const attempts = topics.reduce((n, t) => n + t.total, 0);
  const judged = topics.filter(t => t.total >= MIN_ATTEMPTS);
  return {
    attempts,
    accuracy: attempts ? right / attempts : 0,
    topics,
    weak: judged.filter(t => t.accuracy < WEAK_BELOW).map(t => t.topic).slice(0, 3),
    strong: judged.filter(t => t.accuracy >= STRONG_FROM).map(t => t.topic).slice(-3).reverse(),
    due: dueCards(state, now).length,
    deckSize: (state.deck || []).length,
    streak: state.currentStreak || 0,
    lessons: state.lessonsCompleted || 0,
  };
}

/**
 * A small, shareable summary for a teacher. It contains scores per topic and nothing else:
 * no lesson text, no answers, and the name only if the student opts in.
 */
function buildReport(state, { includeName = false, now = Date.now() } = {}) {
  const ins = computeInsights(state, now);
  const report = {
    kind: REPORT_KIND, v: 1, created: new Date(now).toISOString(),
    attempts: ins.attempts, accuracy: Math.round(ins.accuracy * 100),
    streak: ins.streak, lessons: ins.lessons,
    topics: ins.topics.map(t => ({ topic: t.topic, right: t.right, wrong: t.wrong })),
  };
  if (includeName && state.playerName) report.name = String(state.playerName).slice(0, 24);
  return report;
}

const validReport = r => Boolean(r) && r.kind === REPORT_KIND && Array.isArray(r.topics)
  && r.topics.every(t => typeof t.topic === 'string' && Number.isFinite(t.right) && Number.isFinite(t.wrong) && t.right >= 0 && t.wrong >= 0);

/** Combines many student reports into class-level insights. Invalid files are counted, not trusted. */
function mergeReports(reports) {
  const good = reports.filter(validReport);
  const byTopic = new Map();
  for (const r of good) {
    for (const t of r.topics) {
      const total = t.right + t.wrong;
      if (!total) continue;
      const agg = byTopic.get(t.topic) || { topic: t.topic, students: 0, right: 0, wrong: 0, strugglers: 0 };
      agg.students++;
      agg.right += t.right;
      agg.wrong += t.wrong;
      if (total >= MIN_ATTEMPTS && accuracyOf(t.right, t.wrong) < WEAK_BELOW) agg.strugglers++;
      byTopic.set(t.topic, agg);
    }
  }
  const topics = [...byTopic.values()]
    .map(a => ({ ...a, attempts: a.right + a.wrong, accuracy: accuracyOf(a.right, a.wrong) }))
    .sort((a, b) => a.accuracy - b.accuracy || b.strugglers - a.strugglers);
  const right = topics.reduce((n, t) => n + t.right, 0);
  const attempts = topics.reduce((n, t) => n + t.attempts, 0);
  return {
    students: good.length,
    rejected: reports.length - good.length,
    attempts,
    accuracy: attempts ? right / attempts : 0,
    topics,
    reteach: topics.filter(t => t.strugglers > 0).slice(0, 3).map(t => t.topic),
  };
}

/* ── Part 2: UI ───────────────────────────────────────────────── */
const pct = x => `${Math.round(x * 100)}%`;

/** Tiny DOM helper: text always goes in via textContent, never innerHTML. */
function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function accuracyBar(accuracy) {
  const bar = node('div', 'ins-bar');
  const fill = node('i');
  fill.style.width = pct(accuracy);
  fill.className = accuracy < WEAK_BELOW ? 'weak' : accuracy >= STRONG_FROM ? 'strong' : '';
  bar.appendChild(fill);
  return bar;
}

function statBox(value, label) {
  const box = node('div', 'ins-stat');
  box.append(node('b', '', value), node('span', '', label));
  return box;
}

function renderMyInsights() {
  const body = el('insMeBody');
  if (!body) return;
  body.textContent = '';
  const ins = computeInsights(STATE);

  const stats = node('div', 'ins-stats');
  stats.append(
    statBox(ins.attempts ? pct(ins.accuracy) : '–', 'accuracy'),
    statBox(String(ins.attempts), 'answers'),
    statBox(String(ins.due), 'to revise now'),
    statBox(String(ins.streak), 'day streak'),
  );
  body.appendChild(stats);

  if (!ins.topics.length) {
    body.appendChild(node('p', 'ins-empty', 'Take a lesson quiz and your strengths and weak spots will appear here.'));
    return;
  }
  if (ins.weak.length) body.appendChild(node('p', 'ins-callout weak', `Focus next on: ${ins.weak.join(', ')}`));
  if (ins.strong.length) body.appendChild(node('p', 'ins-callout strong', `Going well: ${ins.strong.join(', ')}`));

  const list = node('div', 'ins-list');
  ins.topics.forEach(t => {
    const row = node('div', 'ins-row');
    row.append(node('span', 'ins-topic', t.topic), accuracyBar(t.accuracy), node('span', 'ins-num', `${t.right}/${t.total}`));
    list.appendChild(row);
  });
  body.appendChild(list);
}

function renderClassInsights(merged) {
  const body = el('insClassBody');
  if (!body) return;
  body.textContent = '';
  if (!merged.students) {
    body.appendChild(node('p', 'ins-empty', merged.rejected ? 'Those files are not SlateMind reports.' : 'Add report files to see class-level results.'));
    return;
  }
  body.appendChild(node('p', 'ins-callout', `${merged.students} student${merged.students === 1 ? '' : 's'} · class accuracy ${pct(merged.accuracy)} across ${merged.attempts} answers`));
  if (merged.rejected) body.appendChild(node('p', 'ins-empty', `${merged.rejected} file(s) skipped: not a valid report.`));
  if (merged.reteach.length) body.appendChild(node('p', 'ins-callout weak', `Re-teach first: ${merged.reteach.join(', ')}`));

  const list = node('div', 'ins-list');
  merged.topics.forEach(t => {
    const row = node('div', 'ins-row');
    row.append(node('span', 'ins-topic', t.topic), accuracyBar(t.accuracy),
      node('span', 'ins-num', t.strugglers ? `${t.strugglers}/${t.students} struggling` : `${t.students} student${t.students === 1 ? '' : 's'}`));
    list.appendChild(row);
  });
  body.appendChild(list);
}

function downloadJSON(filename, data) {
  const a = document.createElement('a');
  a.download = filename;
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function loadClassFiles(files) {
  const reports = [];
  for (const file of files) {
    if (file.size > 200000) { reports.push(null); continue; }   // a report is a few KB; refuse anything huge
    try { reports.push(JSON.parse(await file.text())); } catch { reports.push(null); }
  }
  renderClassInsights(mergeReports(reports));
}

/* Revision card (quiz tab) */
function updateReviseCard() {
  if (!el('reviseText')) return;
  const deck = STATE.deck || [];
  const due = dueCards(STATE).length;
  el('reviseText').textContent = deck.length
    ? `${due} due now · ${deck.length} saved from questions you missed`
    : 'Questions you miss come back here for spaced revision.';
  el('reviseBtn').disabled = !deck.length;
  el('reviseBtn').textContent = due ? '🔁 Revise now' : '🔁 Practise early';
}

function startRevision() {
  const cards = revisionSet(STATE);
  if (!cards.length) return;
  setupQuizPanel(cards.map(c => ({
    question: c.question, options: c.options, correct: c.correct,
    explanation: c.explanation, reteach: c.reteach, _cardKey: c.key, _topic: c.topic,
  })));
  switchRSTab('quiz');
}

/* Accessibility */
function applyA11y() {
  const a = STATE.a11y;
  document.body.classList.toggle('a11y-readable', a.readable);
  document.body.classList.toggle('a11y-bigtext', a.bigText);
  document.body.classList.toggle('a11y-contrast', a.contrast);
  [['a11yReadable', 'readable'], ['a11yBig', 'bigText'], ['a11yContrast', 'contrast']].forEach(([id, key]) => {
    const b = el(id);
    if (!b) return;
    b.classList.toggle('off', !a[key]);
    b.textContent = a[key] ? 'ON' : 'OFF';
    b.setAttribute('aria-pressed', String(a[key]));
  });
}

/* Read aloud (Web Speech API; hidden when the browser has no speech support) */
const SPEECH_LANG = { English: 'en-IN', Hindi: 'hi-IN', Hinglish: 'en-IN' };

/** Plain text of each board block, in order, for narration and captions. */
function blocksToSpeech(blocks) {
  return (blocks || []).map(b => {
    if (b.type === 'bullet') return (b.items || []).join('. ');
    if (b.type === 'diagram') return (b.shapes || []).map(s => s.label).filter(Boolean).join(', ');
    if (b.type === 'checkpoint') return b.question || '';
    return b.text || '';
  }).filter(Boolean);
}

let speaking = false;
let _activeUtterances = [];

function stopReadAloud() {
  speaking = false;
  _activeUtterances = [];
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (el('listenBtn')) el('listenBtn').textContent = '🔊 Listen';
}

function toggleReadAloud() {
  if (!('speechSynthesis' in window)) return;
  if (speaking) { stopReadAloud(); return; }
  const parts = blocksToSpeech(window.currentLessonBlocks);
  if (!parts.length) {
    if (window.showGameNotif) {
      window.showGameNotif('🔊', 'No Lesson Active', 'Load a lesson first to listen to narration', 'blue', 2200);
    }
    return;
  }
  speaking = true;
  _activeUtterances = [];
  el('listenBtn').textContent = '⏹ Stop';
  parts.forEach((text, i) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[STATE.profile?.language] || 'en-IN';
    u.onerror = () => { stopReadAloud(); };
    if (i === parts.length - 1) {
      u.onend = () => { stopReadAloud(); };
    }
    _activeUtterances.push(u);
    window.speechSynthesis.speak(u);
  });
}

/* Careers panel (Fact tab) */
function showCareersPanel(careers) {
  const box = el('careersBox');
  if (!box) return;
  box.textContent = '';
  const list = (careers || []).filter(Boolean).slice(0, 3);
  box.style.display = list.length ? 'block' : 'none';
  if (!list.length) return;
  box.appendChild(node('div', 'careers-title', '💼 Where this is used in real jobs'));
  list.forEach(c => box.appendChild(node('div', 'career-item', c)));
}

/* Wiring */
function bindSelect(id, getValue, setValue) {
  const s = el(id);
  if (!s) return;
  s.value = getValue();
  s.addEventListener('change', () => { setValue(s.value); save(); });
}

function setupLearningUI() {
  ensureLearningState(STATE);
  bindSelect('profLevel', () => STATE.profile.level, v => { STATE.profile.level = v; });
  bindSelect('profLang', () => STATE.profile.language, v => { STATE.profile.language = v; });
  [['a11yReadable', 'readable'], ['a11yBig', 'bigText'], ['a11yContrast', 'contrast']].forEach(([id, key]) => {
    const b = el(id);
    if (b) b.addEventListener('click', () => { STATE.a11y[key] = !STATE.a11y[key]; save(); applyA11y(); });
  });
  applyA11y();

  el('insightsBtn')?.addEventListener('click', () => { renderMyInsights(); openModal('insightsOverlay'); });
  document.querySelectorAll('.ins-tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.ins-tab').forEach(t => t.classList.toggle('active', t === tab));
    el('insMe').style.display = tab.dataset.ins === 'me' ? 'block' : 'none';
    el('insClass').style.display = tab.dataset.ins === 'class' ? 'block' : 'none';
  }));
  el('exportReportBtn')?.addEventListener('click', () => downloadJSON('slatemind-report.json', buildReport(STATE, { includeName: el('reportName').checked })));
  el('classFiles')?.addEventListener('change', e => loadClassFiles([...e.target.files]));
  el('reviseBtn')?.addEventListener('click', startRevision);
  updateReviseCard();

  const listen = el('listenBtn');
  if (listen) {
    if (!('speechSynthesis' in window)) listen.style.display = 'none';
    else listen.addEventListener('click', toggleReadAloud);
  }
}

if (typeof window !== 'undefined') {
  Object.assign(window, { recordAnswer, showCareersPanel, updateReviseCard, setupLearningUI, stopReadAloud });
}
