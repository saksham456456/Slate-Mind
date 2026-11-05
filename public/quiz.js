/* ═══════════════════════════════════════════════════════════════
   SlateMind — quiz.js
   Interactive quiz assessment, checkpoint challenges & Feynman sparring
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── Interactive Quiz Engine ──────────────────────────────────── */
function setupQuizPanel(quiz) {
  if (!quiz?.length) return;
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

  ['A', 'B', 'C', 'D'].forEach((L, i) => {
    if (!q.options[i]) return;
    const b = document.createElement('button');
    b.className = 'quiz-opt';
    b.innerHTML = `<span class="opt-letter">${L}</span>${esc(q.options[i])}`;
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
  save();

  if (el('quizExplanation')) {
    el('quizExplanation').textContent = q.explanation;
    el('quizExplanation').style.display = 'block';
  }
  if (el('quizNextBtn')) {
    el('quizNextBtn').style.display = 'inline-block';
    el('quizNextBtn').textContent = window.quizIndex < window.currentQuiz.length - 1 ? 'Next ➤' : 'Results ➤';
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

async function handleFeynmanSubmit() {
  const input = el('feynmanInput');
  const btn = el('feynmanSubmitBtn');
  if (!input || !btn) return;
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sparring with Professor…';

  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: window.lastTopic || 'Current Topic',
        explanation: text
      })
    });
    const data = await res.json();
    const score = data.score ?? 75;
    const isMaster = score >= 85 || data.masteryLevel === 'Feynman Master';

    if (el('feynmanResult')) el('feynmanResult').style.display = 'block';
    if (el('feynmanScore')) el('feynmanScore').textContent = `${score}%`;
    if (el('feynmanFeedback')) el('feynmanFeedback').textContent = data.feedback || 'Great effort explaining!';

    const badge = el('feynmanBadge');
    if (badge) {
      badge.style.display = 'inline-block';
      badge.className = `feynman-badge-pill ${isMaster ? 'master' : 'sparring'}`;
      badge.textContent = isMaster ? '🏆 Feynman Master Certified' : `🥋 Sparring: ${data.masteryLevel || 'Refining'}`;
    }

    if (data.xpReward) {
      awardXP(data.xpReward, 'feynman');
      if (el('feynmanXpEarned')) el('feynmanXpEarned').textContent = `+${data.xpReward} XP earned!`;
    }

    const retryBtn = el('feynmanRetryBtn');
    if (retryBtn) {
      retryBtn.style.display = isMaster ? 'none' : 'block';
      retryBtn.onclick = () => {
        if (input) {
          input.focus();
          input.select();
        }
      };
    }

    if (isMaster && window.wb) {
      if (window.sound) sound('perfect');
      await window.wb.appendBlocks([
        { type: 'emphasize', text: `✦ Verified Mastery: ${window.lastTopic || 'Concept'} (${score}%)`, style: 'box' }
      ]);
      showGameNotif('🎖️', 'FEYNMAN MASTER', `Concept Mastered (${score}%)!`, 'gold', 3000);
    } else {
      if (window.sound) sound('complete');
      if (data.chalkCorrection && window.wb) {
        await window.wb.appendBlocks([
          { type: 'emphasize', text: `Professor Note: ${data.chalkCorrection}`, style: 'underline' }
        ]);
      }
      showGameNotif('🥋', 'SPARRING ROUND', `${score}% — Teacher note added to board!`, 'purple', 2500);
    }
  } catch (err) {
    if (el('feynmanResult')) el('feynmanResult').style.display = 'block';
    if (el('feynmanScore')) el('feynmanScore').textContent = 'Reviewed!';
    if (el('feynmanFeedback')) el('feynmanFeedback').textContent = 'Your explanation was reviewed. Keep practicing expressing concepts concisely.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Spar Again ➤';
  }
}

// Window bindings
window.setupQuizPanel = setupQuizPanel;
window.renderQ = renderQ;
window.answerQ = answerQ;
window.nextQ = nextQ;
window.showQuizResult = showQuizResult;
window.retryQuiz = retryQuiz;
window.showCheckpoint = showCheckpoint;
window.setupFeynmanPanel = setupFeynmanPanel;
window.handleFeynmanSubmit = handleFeynmanSubmit;
