/* ═══════════════════════════════════════════════════════════════
   SlateMind — quiz.js
   Interactive quiz assessment, checkpoint challenges & Feynman sparring
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── Interactive Quiz Engine ──────────────────────────────────── */
/** Back to the "no quiz yet" state, so a previous lesson's questions never linger. */
function clearQuizPanel() {
  window.currentQuiz = null;
  if (el('quizEmpty'))   el('quizEmpty').style.display   = 'block';
  if (el('quizInner'))   el('quizInner').style.display   = 'none';
  if (el('resultInner')) el('resultInner').style.display = 'none';
}

function setupQuizPanel(quiz) {
  if (!quiz?.length) { clearQuizPanel(); return; }
  window.currentQuiz = quiz;
  window.quizIndex   = 0;
  window.quizScore   = 0;
  window.quizCombo   = 0;

  if (el('quizEmpty'))   el('quizEmpty').style.display   = 'none';
  if (el('quizInner'))   el('quizInner').style.display   = 'block';
  if (el('resultInner')) el('resultInner').style.display = 'none';
  renderQ();
}

function renderQ() {
  const q = window.currentQuiz[window.quizIndex];
  const total = window.currentQuiz.length;
  if (!q) return;

  if (el('quizQCount'))      el('quizQCount').textContent = `Question ${window.quizIndex + 1} / ${total}`;
  if (el('quizProgFill'))    el('quizProgFill').style.width = ((window.quizIndex / total) * 100) + '%';
  if (el('quizQuestion'))    el('quizQuestion').textContent = q.question;
  if (el('quizExplanation')) el('quizExplanation').style.display = 'none';
  if (el('quizNextBtn'))     el('quizNextBtn').style.display = 'none';

  const opts = el('quizOptions');
  if (!opts) return;
  opts.innerHTML = '';

  (q.options || []).forEach((optText, i) => {
    const letter = String.fromCharCode(65 + i);
    const b = document.createElement('button');
    b.className = 'quiz-opt';
    b.innerHTML = `<span class="opt-letter">${letter}</span>${esc(optText)}`;
    b.addEventListener('click', () => answerQ(i, q));
    opts.appendChild(b);
  });
}

function answerQ(chosen, q) {
  const correct = q.correct;
  document.querySelectorAll('.quiz-opt').forEach((b, i) => {
    b.disabled = true;
    if (i === correct) b.classList.add('correct');
    else if (i === chosen) b.classList.add('wrong');
  });

  STATE.quizTotal++;
  if (chosen === correct) {
    window.quizScore++;
    window.quizCombo++;
    STATE.quizCorrect++;
    if (window.quizCombo > (STATE.maxCombo || 0)) STATE.maxCombo = window.quizCombo;
    if (window.sound) sound('correct');

    if (window.quizCombo === 2) showGameNotif('⚡', 'NICE!', '2 correct in a row', 'green', 1600);
    if (window.quizCombo === 3) { showGameNotif('🔥', 'COMBO x3!', "You're on fire!", 'orange', 2000); comboFlash(); }
    if (window.quizCombo >= 4)  { showGameNotif('💥', `COMBO x${window.quizCombo}!`, 'Unstoppable!', 'red', 2000); comboFlash(); }
  } else {
    window.quizCombo = 0;
    if (window.sound) sound('wrong');
  }
  recordAnswer(STATE, q._topic || window.lastTopic, q, chosen === correct);
  save();
  updateReviseCard();

  if (el('quizExplanation')) {
    const box = el('quizExplanation');
    box.textContent = q.explanation;
    if (chosen !== correct) showReteach(box, q);
    box.style.display = 'block';
  }
  if (el('quizNextBtn')) {
    el('quizNextBtn').style.display = 'inline-block';
    el('quizNextBtn').textContent = window.quizIndex < window.currentQuiz.length - 1 ? 'Next ➤' : 'Results ➤';
  }
}

/** After a wrong answer: the same idea through a different analogy, in the panel and (during a lesson) on the board. */
function showReteach(box, q) {
  if (!q.reteach || q.reteach === q.explanation) return;
  const note = document.createElement('div');
  note.className = 'quiz-reteach';
  note.textContent = `💡 Another way to see it: ${q.reteach}`;
  box.appendChild(note);
  const board = window.wb;
  const boardFree = board && typeof board.isWriting === 'function' && !board.isWriting();
  if (!q._cardKey && boardFree) {   // not during revision: the board shows a different lesson then
    board.appendBlocks([
      { type: 'emphasize', text: 'Another way to see it', style: 'underline' },
      { type: 'text', text: q.reteach },
    ]).catch(() => { /* the board was cleared meanwhile */ });
  }
}

function nextQ() {
  window.quizIndex++;
  if (window.quizIndex < window.currentQuiz.length) {
    renderQ();
  } else {
    showQuizResult();
  }
}

function showQuizResult() {
  const total = window.currentQuiz.length;
  const pct = Math.round((window.quizScore / total) * 100);
  const stars = window.quizScore === total ? '⭐⭐⭐' : window.quizScore >= Math.ceil(total / 2) ? '⭐⭐' : '⭐';
  const msgs = {
    3: ['🔥 Flawless!', '💯 Perfect!'],
    2: ['👍 Great job!', '⚡ Sharp!'],
    1: ['🙂 Keep going!', '📖 Review & retry!'],
    0: ['😅 Review the lesson!', '🔄 Try again!']
  };
  const m = msgs[Math.min(window.quizScore, 3)];

  if (el('quizInner'))   el('quizInner').style.display = 'none';
  if (el('resultInner')) el('resultInner').style.display = 'block';
  if (el('resultStars')) el('resultStars').textContent = stars;
  if (el('resultScore')) el('resultScore').textContent = `${window.quizScore} / ${total} (${pct}%)`;
  if (el('resultMsg'))   el('resultMsg').textContent = m[Math.floor(Math.random() * m.length)];

  const qxp = window.quizScore * 20;
  if (el('resultXP')) el('resultXP').textContent = `+${qxp} XP earned!`;
  awardXP(qxp, 'quiz');

  if (window.quizScore === total) {
    STATE.perfectQuizzes++;
    if (window.sound) sound('perfect');
    showGameNotif('💯', 'PERFECT QUIZ!', 'All 3 correct!', 'gold', 3000);
  } else if (window.quizScore >= Math.ceil(total / 2)) {
    STATE.quizzesPassed++;
    if (window.sound) sound('complete');
  } else {
    if (window.sound) sound('wrong');
  }
  save();
  checkBadges();
}

function retryQuiz() {
  setupQuizPanel(window.currentQuiz);
}

/* ── Interactive Checkpoint ───────────────────────────────────── */
function showCheckpoint(question, hint) {
  if (el('cpQuestion')) el('cpQuestion').textContent = question;
  if (el('cpHint')) {
    el('cpHint').textContent = hint;
    el('cpHint').style.display = 'none';
  }
  if (el('cpHintBtn')) el('cpHintBtn').style.display = 'block';
  openModal('checkpointOverlay');
  if (window.wb) window.wb.setPaused(true);
  if (window.sound) sound('checkpoint');
  showGameNotif('⚑', 'CHECKPOINT', 'Think about it…', 'purple', 2000);
}

/* ── Feynman Sparring Engine ──────────────────────────────────── */
function setupFeynmanPanel() {
  const fEmpty = el('feynmanEmpty');
  const fInner = el('feynmanInner');
  if (fEmpty && fInner) {
    fEmpty.style.display = 'none';
    fInner.style.display = 'block';
  }
}

function setText(id, text) {
  const node = el(id);
  if (node) node.textContent = text;
}

/** Fills the result card from a grade the server produced. */
function renderFeynmanResult(data, input) {
  const score = Math.round(data.score);
  const isMaster = data.masteryLevel === 'Feynman Master';

  if (el('feynmanResult')) el('feynmanResult').style.display = 'block';
  setText('feynmanScore', `${score}%`);
  setText('feynmanFeedback', data.feedback);

  const badge = el('feynmanBadge');
  if (badge) {
    badge.style.display = 'inline-block';
    badge.className = `feynman-badge-pill ${isMaster ? 'master' : 'sparring'}`;
    badge.textContent = isMaster ? '🏆 Feynman Master Certified' : `🥋 Sparring: ${data.masteryLevel}`;
  }

  if (data.xpReward) {
    awardXP(data.xpReward, 'feynman');
    setText('feynmanXpEarned', `+${data.xpReward} XP earned!`);
  } else {
    setText('feynmanXpEarned', '');
  }

  const retryBtn = el('feynmanRetryBtn');
  if (retryBtn) {
    retryBtn.style.display = isMaster ? 'none' : 'block';
    retryBtn.onclick = () => { input.focus(); input.select(); };
  }
  return { score, isMaster };
}

/** Writes the verdict on the blackboard and shows the matching notification. */
async function annotateBoardWithGrade(data, score, isMaster) {
  const topic = window.lastTopic || 'Concept';
  if (isMaster) {
    if (window.sound) sound('perfect');
    if (window.wb) {
      await window.wb.appendBlocks([{ type: 'emphasize', text: `✦ Verified Mastery: ${topic} (${score}%)`, style: 'box' }]);
    }
    showGameNotif('🎖️', 'FEYNMAN MASTER', `Concept Mastered (${score}%)!`, 'gold', 3000);
    return;
  }
  if (window.sound) sound('complete');
  if (data.chalkCorrection && window.wb) {
    await window.wb.appendBlocks([{ type: 'emphasize', text: `Professor Note: ${data.chalkCorrection}`, style: 'underline' }]);
  }
  showGameNotif('🥋', 'SPARRING ROUND', `${score}% — Teacher note added to board!`, 'purple', 2500);
}

/** No grade is shown when grading failed: no score, no badge, no XP. */
function showFeynmanError(err) {
  if (el('feynmanResult')) el('feynmanResult').style.display = 'block';
  setText('feynmanScore', '—');
  setText('feynmanXpEarned', '');
  if (el('feynmanBadge')) el('feynmanBadge').style.display = 'none';
  setText('feynmanFeedback', err.name === 'AbortError'
    ? 'Grading took too long. Please try again.'
    : (err.message || 'Could not grade your explanation right now.'));
  if (el('feynmanRetryBtn')) el('feynmanRetryBtn').style.display = 'block';
  if (window.sound) sound('error');
}

async function handleFeynmanSubmit() {
  const input = el('feynmanInput');
  const btn = el('feynmanSubmitBtn');
  if (!input || !btn) return;
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  if (text.length < 20) {
    showFeynmanError({ message: 'Please write a little more (at least 20 characters) so the professor can evaluate your understanding.' });
    input.focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sparring with Professor…';
  try {
    const data = await apiPost('/api/explain', { topic: window.lastTopic || 'Current Topic', explanation: text }, { timeoutMs: 30000 });
    const { score, isMaster } = renderFeynmanResult(data, input);
    await annotateBoardWithGrade(data, score, isMaster);
  } catch (err) {
    showFeynmanError(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Spar Again ➤';
  }
}

// Window bindings
window.setupQuizPanel = setupQuizPanel;
window.clearQuizPanel = clearQuizPanel;
window.renderQ = renderQ;
window.answerQ = answerQ;
window.nextQ = nextQ;
window.showQuizResult = showQuizResult;
window.retryQuiz = retryQuiz;
window.showCheckpoint = showCheckpoint;
window.setupFeynmanPanel = setupFeynmanPanel;
window.handleFeynmanSubmit = handleFeynmanSubmit;
