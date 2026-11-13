/* ═══════════════════════════════════════════════════════════════
   SlateMind — app.js
   Master Controller: Lesson flow, history, follow-up & DOM wiring
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── Lesson Generation & Flow ─────────────────────────────────── */
const OFFLINE_OUTLINE_NOTICE =
  '📴 No live AI right now. This is a generic outline, not a full lesson. Connect to the internet for a complete one.';

function flashTopicError() {
  el('topicInput').focus();
  el('topicInput').classList.add('error');
  el('topicError').style.display = 'block';
  setTimeout(() => {
    el('topicInput').classList.remove('error');
    el('topicError').style.display = 'none';
  }, 2500);
}

function showLessonLoading() {
  hideError();
  setUIState('loading');
  el('boardIdle').style.display    = 'none';
  el('boardLoading').style.display = 'flex';
  el('boardError').style.display   = 'none';
  el('loadingText').textContent    = LOADING_MSGS[Math.floor(Math.random() * LOADING_MSGS.length)];
}

/** Sets up the board and writes a lesson on it. Used for AI lessons and local samples alike. */
async function playLesson(data, topic, isDaily) {
  el('boardLoading').style.display = 'none';
  showLessonMeta(topic, data);
  window.lastLessonData = data;
  window.currentLessonBlocks = data.blocks || [];   // for Listen (read aloud)
  if (window.stopReadAloud) stopReadAloud();
  wb = wb || window.wb;
  if (!wb && typeof Whiteboard !== 'undefined') {
    wb = new Whiteboard('boardCanvas');
    window.wb = wb;
  }
  if (wb) {
    wb.clear();
    wb.setSpeed(STATE.writeSpeed);
  }
  if (STATE.writeSpeed === 'fast' || STATE.writeSpeed === 'instant') STATE.fastLessons++;

  setUIState('writing');
  if (window.sound) sound('start');
  showGameNotif('📖', 'LESSON STARTED', `Topic: ${topic.slice(0, 30)}`, 'green', 1800);

  await wb.renderLesson(data.blocks || [], {
    onAllDone: () => onLessonComplete(data, topic, isDaily),
  });
}

function showLessonFailure(err) {
  el('boardLoading').style.display = 'none';
  showError(err.name === 'AbortError'
    ? 'Request timed out — please try again.'
    : (err.message || 'Could not reach Professor Byte.'));
  setUIState('idle');
  if (window.sound) sound('error');
}

async function startLesson(topic, isDaily = false) {
  topic = (topic || '').trim();
  if (!topic) { flashTopicError(); return; }
  window.lastTopic = topic;
  window.interactionId = null;
  showLessonLoading();

  try {
    const data = await apiPost('/api/lesson', {
      topic,
      teachStyle: STATE.teachStyle || 'mentor',
      level: STATE.profile?.level,
      language: STATE.profile?.language,
    }, { timeoutMs: 30000 });
    window.interactionId = data.interactionId || null;
    if (data.offline) showProfMsg(OFFLINE_OUTLINE_NOTICE);   // be upfront: not a real AI lesson
    await playLesson(data, topic, isDaily);
  } catch (err) {
    // Server unreachable: a hand-written master lesson shipped with the app is still a real lesson.
    const sample = (typeof getSampleLesson === 'function') ? getSampleLesson(topic) : null;
    if (!sample) { showLessonFailure(err); return; }
    window.interactionId = buildInteractionId(topic, sample);
    await playLesson(sample, topic, isDaily);
  }
}

function onLessonComplete(data, topic, isDaily) {
  STATE.lessonsCompleted++;
  STATE.topicsExplored = (STATE.topicsExplored || 0) + 1;
  updateStreak();
  if (isDaily) {
    STATE.dailyChallenges++;
    STATE.dailyChallengeDone = true;
    STATE.dailyChallengeDate = new Date().toDateString();
    setupDailyChallenge();
  }
  save();

  // A generic offline outline is not a real lesson, so it earns no XP
  const xp = data.offline ? 0 : (data.xpReward || 80);
  if (xp) awardXP(xp);

  addToHistory(topic, data);
  // The generic offline outline has placeholder terms and quiz: show none rather than junk
  showFactPanel(data.offline ? '' : data.funFact);
  showTermsPanel(data.offline ? [] : data.keyTerms);
  setupQuizPanel(data.offline ? [] : data.quiz);
  showCareersPanel(data.offline ? [] : data.careers);
  updateReviseCard();
  setupFeynmanPanel();

  el('askBar').style.display = 'block';
  populateAskChips(data.rabbitHoles);
  setUIState('done');
  checkBadges();
  if (window.sound) sound('complete');
  showGameNotif('🎉', 'LESSON COMPLETE', xp ? `+${xp} XP earned!` : 'Outline complete (no XP offline)', 'gold', 2500);

  if (document.getElementById('rightSidebar').classList.contains('collapsed')) {
    el('rightOpenHudBtn').style.display = 'flex';
    setTimeout(() => {
      showGameNotif('📋', 'NOTES READY', 'Fun fact + quiz unlocked!', 'purple', 2000);
    }, 1000);
  } else {
    setTimeout(() => switchRSTab('quiz'), 600);
  }
}

function showLessonMeta(topic, data) {
  el('metaTopic').textContent = topic;
  const diff = data.difficulty || 'Intermediate';
  el('metaDiff').textContent  = diff;
  el('metaDiff').className    = `meta-diff diff-${diff}`;
  el('metaXP').textContent    = data.offline ? 'Offline outline' : `+${data.xpReward || 80} XP`;
  el('metaTerms').textContent = data.keyTerms?.length ? '📌 ' + data.keyTerms.slice(0, 3).join(', ') : '';
  el('lessonMeta').style.display = 'flex';
}

/* ── Follow-Up Question Flow ──────────────────────────────────── */
function setAskBusy(busy) {
  el('askBtn').disabled   = busy;
  el('askInput').disabled = busy;
  if (busy) {
    el('askInput').value = '';
    showAskStatus(true, 'Professor Byte is answering…');
  } else {
    el('askInput').focus();
  }
}

function askErrorMessage(err) {
  if (err.name === 'AbortError') return '⏱ Request timed out. Try a shorter question.';
  if (err.offline) return `📴 ${err.message}`;
  return `⚠️ ${err.message || 'Could not get answer.'}`;
}

async function askFollowUp(question) {
  question = (question || '').trim();
  if (!question) return;

  if (!window.interactionId) {
    if (!window.lastTopic) {
      showProfMsg('⚠️ Start a lesson first before asking follow-up questions.');
      return;
    }
    window.interactionId = buildInteractionId(window.lastTopic);
  }

  setAskBusy(true);
  try {
    const data = await apiPost('/api/ask', {
      question,
      interactionId: window.interactionId || '',
      topic: window.lastTopic || '',
      language: STATE.profile?.language,
    }, { timeoutMs: 25000 });
    window.interactionId = data.interactionId || window.interactionId;

    // Only a real answer counts toward the follow-up badge
    STATE.followUps++;
    save();
    checkBadges();

    if (window.sound) sound('start');
    showAskStatus(true, 'Writing on the board…');

    await wb.appendBlocks(data.blocks || [], {
      onAllDone: () => {
        showAskStatus(false);
        if (data.xpReward) awardXP(data.xpReward, 'followup');
        if (window.sound) sound('complete');
        showGameNotif('🙋', '+XP', `Follow-up answered! +${data.xpReward || 20} XP`, 'green', 1800);
      },
    });
  } catch (err) {
    showAskStatus(false);
    showProfMsg(askErrorMessage(err));
    if (window.sound) sound('error');
  } finally {
    setAskBusy(false);
  }
}

function showAskStatus(visible, text = '') {
  const s = el('askStatus');
  s.style.display = visible ? 'flex' : 'none';
  if (text) el('askStatusText').textContent = text;
}

/* ── Right Sidebar Panels ─────────────────────────────────────── */
function showFactPanel(fact) {
  if (!fact) {                       // nothing to show: clear the previous lesson's fact
    el('factEmpty').style.display = 'block';
    el('factText').style.display  = 'none';
    return;
  }
  el('factEmpty').style.display = 'none';
  el('factText').textContent    = fact;
  el('factText').style.display  = 'block';
}

function showTermsPanel(terms) {
  if (!terms?.length) {              // nothing to show: clear the previous lesson's terms
    el('termsEmpty').style.display = 'block';
    el('glossaryList').innerHTML   = '';
    return;
  }
  el('termsEmpty').style.display = 'none';
  el('glossaryList').innerHTML   = terms.map((t, i) => `
    <div class="glossary-term">
      <span class="term-word">${esc(t)}</span>
      <span class="term-idx">#${i + 1}</span>
    </div>`).join('');
}

/* ── Lesson History & Offline Recall ──────────────────────────── */
function addToHistory(topic, data) {
  const entry = {
    id: Date.now(),
    topic,
    diff: data.difficulty || 'Intermediate',
    xp: data.offline ? 0 : (data.xpReward || 80),
    ts: Date.now(),
    data: {
      title: data.title || topic,
      difficulty: data.difficulty || 'Intermediate',
      xpReward: data.offline ? 0 : (data.xpReward || 80),
      offline: Boolean(data.offline),
      funFact: data.funFact || '',
      keyTerms: data.keyTerms || [],
      rabbitHoles: data.rabbitHoles || [],
      careers: data.careers || [],
      quiz: data.quiz || [],
      blocks: data.blocks || [],
      interactionId: data.interactionId || null
    }
  };
  STATE.lessonHistory.unshift(entry);
  if (STATE.lessonHistory.length > 50) STATE.lessonHistory.pop();
  save();
  renderHistory();
}

async function loadHistoryLesson(h) {
  if (!h || !h.topic) return;
  const topic = h.topic;
  window.lastTopic = topic;
  el('topicInput').value = topic;

  if (h.data && Array.isArray(h.data.blocks) && h.data.blocks.length > 0) {
    const data = h.data;
    window.interactionId = data.interactionId || null;
    if (!window.interactionId) {
      try {
        const synthetic = [
          { role: 'system', content: 'You are Professor Byte, master blackboard teacher.' },
          { role: 'user', content: `Topic: ${topic}` },
          { role: 'assistant', content: JSON.stringify(data) }
        ];
        window.interactionId = btoa(unescape(encodeURIComponent(JSON.stringify(synthetic))));
      } catch {
        window.interactionId = null;
      }
    }
    window.currentQuiz = data.quiz || [];
    showLessonMeta(topic, data);
    wb = wb || window.wb;
    if (!wb && typeof Whiteboard !== 'undefined') {
      wb = new Whiteboard('boardCanvas');
      window.wb = wb;
    }
    if (wb) {
      wb.clear();
      wb.setSpeed(STATE.writeSpeed);
    }
    setUIState('writing');
    if (window.sound) sound('start');
    showGameNotif('📖', 'LESSON RESTORED', `Loaded: ${topic.slice(0, 30)}`, 'green', 1500);

    await wb.renderLesson(data.blocks, {
      onAllDone: () => {
        showFactPanel(data.funFact);
        showTermsPanel(data.keyTerms);
        setupQuizPanel(data.quiz);
        showCareersPanel(data.careers);
        updateReviseCard();
        setupFeynmanPanel();
        el('askBar').style.display = 'block';
        populateAskChips(data.rabbitHoles);
        setUIState('done');
        if (window.sound) sound('complete');
      }
    });
  } else {
    startLesson(topic);
  }
}

function renderHistory() {
  const c = el('lessonHistory');
  if (!STATE.lessonHistory.length) {
    c.innerHTML = '<div class="history-empty">No lessons yet! 👆</div>';
    return;
  }
  const ico = { Beginner: '🟢', Intermediate: '🟡', Advanced: '🔴' };
  c.innerHTML = STATE.lessonHistory.slice(0, 20).map((h, i) => `
    <div class="history-item${i === 0 ? ' active' : ''}" data-idx="${i}">
      <span class="hi-icon">${ico[h.diff] || '📖'}</span>
      <div class="hi-info">
        <div class="hi-topic">${esc(h.topic)}</div>
        <div class="hi-meta">+${h.xp} XP · <span class="hi-diff diff-${esc(h.diff)}">${esc(h.diff)}</span></div>
      </div>
    </div>`).join('');

  c.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.idx, 10);
      c.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const histItem = STATE.lessonHistory[idx];
      loadHistoryLesson(histItem);
    });
  });
}

/* ── Daily Challenge ──────────────────────────────────────────── */
function setupDailyChallenge() {
  const today  = new Date().toDateString();
  const dayIdx = Math.floor(Date.now() / 86400000) % DAILY_CHALLENGES.length;
  const topic  = DAILY_CHALLENGES[dayIdx] || 'The Water Cycle';
  el('dcTopic').textContent = topic;
  const done = STATE.dailyChallengeDate === today && STATE.dailyChallengeDone;
  const btn  = el('dcBtn');
  btn.disabled    = done;
  btn.textContent = done ? '✅ Done Today!' : 'Accept Challenge';
  btn.onclick = () => {
    if (STATE.dailyChallengeDate !== today) {
      STATE.dailyChallengeDone = false;
      save();
    }
    el('topicInput').value = topic;
    startLesson(topic, true);
  };
}

/* ── Curiosity Rabbit Holes ───────────────────────────────────── */
function populateAskChips(rabbitHoles) {
  if (Array.isArray(rabbitHoles) && rabbitHoles.length > 0) {
    window.currentRabbitHoles = rabbitHoles;
  }
  const chips = (window.currentRabbitHoles && window.currentRabbitHoles.length > 0)
    ? window.currentRabbitHoles
    : FOLLOW_UP_CHIPS.slice(0, 3);

  const label = el('askBarLabel');
  if (label) {
    label.innerHTML = '🕳️ <strong>Curiosity Rabbit Holes</strong> <span style="font-size:10px;color:#a89b90;font-weight:normal">(Click to explore on blackboard)</span>:';
  }

  el('askChips').innerHTML = chips.map(c => `
    <button class="ask-chip rabbit-hole-chip" title="Explore on blackboard">
      <span class="rh-dot">✦</span> ${esc(c)}
    </button>
  `).join('');

  el('askChips').querySelectorAll('.ask-chip').forEach(b => {
    b.addEventListener('click', () => {
      const q = b.textContent.replace(/^[✦\s]+/, '').trim();
      if (!q) return;
      el('askInput').value = q;
      if (window.sound) sound('btn');
      showGameNotif('🕳️', 'RABBIT HOLE OPENED', `Investigating: "${q.slice(0, 30)}..."`, 'purple', 1800);
      askFollowUp(q);
    });
  });
}

/* ── UI Navigation & State Controls ───────────────────────────── */
function switchRSTab(tab) {
  document.querySelectorAll('.rs-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.rs-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
}

function showError(msg) {
  el('errText').textContent     = msg || "Professor Byte couldn't connect.";
  el('boardError').style.display = 'flex';
  el('boardIdle').style.display  = 'none';
}

function hideError() {
  el('boardError').style.display = 'none';
}

function setUIState(s) {
  const tb = el('teachBtn'), ab = el('askBtn');
  switch (s) {
    case 'idle':
      el('boardControls').style.display = 'none';
      if (tb) tb.disabled = false;
      break;
    case 'loading':
      el('boardControls').style.display = 'none';
      el('askBar').style.display        = 'none';
      if (tb) tb.disabled = true;
      if (ab) ab.disabled = true;
      break;
    case 'writing':
      el('boardControls').style.display = 'flex';
      if (tb) tb.disabled = true;
      el('pauseBtn').textContent = '⏸ Pause';
      break;
    case 'done':
      el('boardControls').style.display = 'flex';
      if (tb) tb.disabled = false;
      if (ab) ab.disabled = false;
      break;
  }
}

let _fs = false;
function toggleFullscreen() {
  _fs = !_fs;
  el('gameLayout').classList.toggle('fullscreen', _fs);
  el('boardFsBtn').textContent     = _fs ? '⛶ Exit' : '⛶ Fullscreen';
  el('fullscreenBtn').textContent   = _fs ? '⛶ Exit' : '⛶';
  if (_fs) {
    el('leftOpenBtn').style.display     = 'flex';
    el('rightOpenHudBtn').style.display = 'flex';
  } else {
    el('leftOpenBtn').style.display     = 'none';
    el('rightOpenHudBtn').style.display = 'none';
    el('leftSidebar').classList.remove('collapsed');
    el('rightSidebar').classList.remove('collapsed');
  }
  setTimeout(() => (wb || window.wb)?._resize(), 300);
}

/* ── Onboarding Experience & Studio Splash ───────────────────────── */
function setupOnboarding() {
  const ni = el('studentNameInput'), sb = el('startAdventureBtn'), db = el('startDemoBtn');
  if (!ni || !sb) return;

  const launchWith = (runLiveDemo = false) => {
    if (window.initAudio) initAudio();
    const name = (ni.value.trim() || 'Student');
    STATE.playerName   = name;
    STATE.hasOnboarded = true;
    localStorage.setItem('pb_studentName', name);
    save();
    updateHUD();
    closeModal('splashOverlay');
    if (window.sound) sound('levelup');

    if (runLiveDemo) {
      if (typeof window.startAppTour === 'function') {
        setTimeout(() => window.startAppTour({ loadDemoLesson: true }), 350);
      }
    } else {
      setTimeout(() => showGameNotif('🎓', 'WELCOME!', 'Ready to learn, ' + name + '?', 'green', 2500), 500);
    }
  };

  ni.addEventListener('keydown', e => { if (e.key === 'Enter') sb.click(); });
  sb.addEventListener('click', () => launchWith(false));
  if (db) db.addEventListener('click', () => launchWith(true));

  const saved = localStorage.getItem('pb_studentName');
  if (STATE.hasOnboarded && saved) {
    STATE.playerName = saved;
    closeModal('splashOverlay');
  } else {
    openModal('splashOverlay');
    ni.focus();
  }
}

/* ── Event Wiring ─────────────────────────────────────────────── */
function wire() {
  /* Topic input */
  const ti = el('topicInput'), tb = el('teachBtn');
  ti.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tb.click(); } });
  ti.addEventListener('input', () => { ti.classList.remove('error'); el('topicError').style.display = 'none'; });
  tb.addEventListener('click', () => { const t = ti.value.trim(); startLesson(t); if (t) ti.value = ''; });

  /* Suggestion chips */
  document.querySelectorAll('.sug-chip').forEach(c => {
    c.addEventListener('click', () => {
      const topic = c.dataset.topic || c.textContent;
      el('topicInput').value = topic;
      startLesson(topic);
    });
  });

  /* Ask bar */
  const ai = el('askInput'), ab = el('askBtn');
  ai.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ab.click(); } });
  ab.addEventListener('click', () => { const q = ai.value.trim(); if (q) askFollowUp(q); });

  /* Board controls */
  el('pauseBtn').addEventListener('click', () => {
    const board = wb || window.wb;
    if (!board) return;
    const p = !board._paused;
    board.setPaused(p);
    el('pauseBtn').textContent = p ? '▶ Resume' : '⏸ Pause';
  });
  el('speedBtn').addEventListener('click', () => {
    const sp = ['slow', 'normal', 'fast', 'instant'];
    const ic = ['🐢', '🚶', '🐇', '⚡'];
    const lb = ['Slow', 'Normal', 'Fast', 'Instant'];
    const n = (sp.indexOf(STATE.writeSpeed) + 1) % sp.length;
    STATE.writeSpeed = sp[n];
    (wb || window.wb)?.setSpeed(STATE.writeSpeed);
    el('speedBtn').textContent = `${ic[n]} ${lb[n]}`;
    save();
    if (sp[n] === 'fast' || sp[n] === 'instant') {
      showGameNotif('🚀', 'TURBO MODE!', 'Writing at max speed', 'orange', 1500);
    }
  });
  el('clearBtn').addEventListener('click', () => {
    wb = wb || window.wb;
    if (wb) wb.clear();
    window.interactionId = null;
    el('boardIdle').style.display = 'flex';
    el('boardIdle').querySelector('.idle-text').textContent = 'Professor Byte is ready to teach!';
    el('boardIdle').querySelector('.idle-sub').textContent = 'Type a topic and press ▶ to start';
    el('boardError').style.display    = 'none';
    el('lessonMeta').style.display    = 'none';
    el('askBar').style.display        = 'none';
    el('boardControls').style.display = 'none';
    setUIState('idle');
    el('topicInput').focus();
  });
  el('screenshotBtn').addEventListener('click', () => (wb || window.wb)?.saveAsImage(el('metaTopic')?.textContent));
  el('exportHtmlBtn')?.addEventListener('click', () => {
    const topic = window.lastTopic || 'Lesson';
    const data = window.lastLessonData || {};
    const blocks = window.currentLessonBlocks || data.blocks || [];
    const quiz = window.currentQuiz || data.quiz || [];
    const terms = data.keyTerms || [];
    const rabbitHoles = data.rabbitHoles || [];
    const careers = data.careers || [];
    const fact = el('factText')?.textContent || data.funFact || '';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const studentName = esc(STATE.playerName || 'Student');
    const gradeLevel = esc(STATE.profile?.level || 'Class 11-12');
    const lang = esc(STATE.profile?.language || 'English');

    // Build blackboard blocks HTML
    let blocksHtml = '';
    blocks.forEach(b => {
      if (!b) return;
      if (b.type === 'heading') {
        blocksHtml += `<h2 class="chalk-heading">${esc(b.text)}</h2>`;
      } else if (b.type === 'text') {
        blocksHtml += `<p class="chalk-text">${esc(b.text)}</p>`;
      } else if (b.type === 'bullet') {
        blocksHtml += `<ul class="chalk-bullets">${(b.items || []).map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
      } else if (b.type === 'equation') {
        blocksHtml += `<div class="chalk-equation">${esc(b.text)}</div>`;
      } else if (b.type === 'emphasize') {
        blocksHtml += `<div class="chalk-emphasize style-${esc(b.style || 'underline')}">✦ ${esc(b.text)}</div>`;
      } else if (b.type === 'diagram') {
        const shapeLabels = (b.shapes || []).map(s => s.label).filter(Boolean);
        blocksHtml += `<div class="chalk-diagram">
          <div class="cd-title">📐 Conceptual Diagram Flow:</div>
          <div class="cd-nodes">${shapeLabels.map(l => `<span class="cd-node">${esc(l)}</span>`).join(' ➔ ')}</div>
        </div>`;
      } else if (b.type === 'checkpoint') {
        blocksHtml += `<div class="chalk-checkpoint">
          <b>🤔 Checkpoint:</b> ${esc(b.question)}
          ${b.hint ? `<div class="cp-hint">💡 Hint: ${esc(b.hint)}</div>` : ''}
        </div>`;
      }
    });

    // Build practice quiz HTML
    let quizHtml = '';
    if (quiz.length) {
      quizHtml = `<div class="lesson-section">
        <h3 class="section-title">📝 Practice Assessment & Diagnostics</h3>
        <div class="quiz-items">${quiz.map((q, idx) => `
          <div class="quiz-item">
            <div class="qi-q"><b>Q${idx + 1}.</b> ${esc(q.question)}</div>
            <div class="qi-options">${(q.options || []).map((opt, i) => `
              <div class="qi-opt ${i === q.correct ? 'opt-correct' : ''}">
                <span class="opt-letter">${String.fromCharCode(65 + i)}</span> ${esc(opt)} ${i === q.correct ? '<b>(Correct Answer)</b>' : ''}
              </div>`).join('')}
            </div>
            <div class="qi-exp"><b>Explanation:</b> ${esc(q.explanation)}</div>
            ${q.reteach ? `<div class="qi-reteach">💡 <b>Pedagogical Analogy:</b> ${esc(q.reteach)}</div>` : ''}
          </div>`).join('')}
        </div>
      </div>`;
    }

    // Build key terms HTML
    let termsHtml = '';
    if (terms.length) {
      termsHtml = `<div class="lesson-section">
        <h3 class="section-title">🔑 Core Conceptual Vocabulary</h3>
        <div class="terms-grid">${terms.map(t => `<div class="term-pill">${esc(t)}</div>`).join('')}</div>
      </div>`;
    }

    // Build rabbit holes HTML
    let rhHtml = '';
    if (rabbitHoles.length) {
      rhHtml = `<div class="lesson-section">
        <h3 class="section-title">🕳️ Curiosity Rabbit Holes & Deep Questions</h3>
        <ul class="rh-list">${rabbitHoles.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      </div>`;
    }

    // Build careers HTML
    let careersHtml = '';
    if (careers.length) {
      careersHtml = `<div class="lesson-section">
        <h3 class="section-title">🚀 Skill Development & NEP 2020 Career Pathways</h3>
        <div class="careers-grid">${careers.map(c => `<div class="career-pill">💼 ${esc(c)}</div>`).join('')}</div>
      </div>`;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SlateMind Master Lesson — ${esc(topic)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Share+Tech+Mono&display=swap');
    :root { --slate-bg: #111a14; --chalk-white: #f0ece0; --chalk-yellow: #f4d03f; --chalk-green: #58d68d; --chalk-blue: #85c1e9; --chalk-pink: #f1948a; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #0c120e; color: #f0ece0; padding: 24px; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; background: var(--slate-bg); border: 4px solid #3d2b1f; border-radius: 16px; padding: 36px; box-shadow: 0 16px 48px rgba(0,0,0,0.6); }
    .header-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px dashed rgba(244,208,63,0.25); padding-bottom: 20px; margin-bottom: 24px; flex-wrap: wrap; gap: 14px; }
    .brand-tag { font-family: 'Caveat', cursive; font-size: 26px; color: var(--chalk-yellow); }
    .meta-tag { font-size: 13px; color: rgba(240,236,224,0.7); line-height: 1.5; }
    .print-btn { background: #22c55e; color: #000; font-weight: 700; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 14px; }
    .print-btn:hover { background: #16a34a; color: #fff; }
    .lesson-title { font-family: 'Caveat', cursive; font-size: 42px; color: var(--chalk-yellow); margin-bottom: 18px; line-height: 1.2; }
    .board-frame { background: #16241b; border: 2px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 28px; margin-bottom: 28px; box-shadow: inset 0 0 40px rgba(0,0,0,0.5); }
    .chalk-heading { font-family: 'Caveat', cursive; font-size: 32px; color: var(--chalk-yellow); border-bottom: 1.5px solid rgba(244,208,63,0.3); padding-bottom: 6px; margin: 16px 0 12px; }
    .chalk-text { font-family: 'Caveat', cursive; font-size: 24px; color: var(--chalk-white); margin-bottom: 14px; }
    .chalk-bullets { margin: 12px 0 16px 24px; font-family: 'Caveat', cursive; font-size: 23px; color: var(--chalk-white); }
    .chalk-bullets li { margin-bottom: 8px; }
    .chalk-equation { font-family: 'Share Tech Mono', monospace; font-size: 22px; color: var(--chalk-green); background: rgba(88,214,141,0.08); border: 1.5px dashed var(--chalk-green); border-radius: 8px; padding: 12px 18px; margin: 16px 0; }
    .chalk-emphasize { font-family: 'Caveat', cursive; font-size: 24px; color: var(--chalk-pink); font-weight: 700; margin: 14px 0; padding: 6px 12px; background: rgba(241,148,138,0.08); border-radius: 6px; display: inline-block; }
    .chalk-diagram { background: rgba(133,193,233,0.07); border: 1px solid rgba(133,193,233,0.25); border-radius: 8px; padding: 14px; margin: 16px 0; }
    .cd-title { font-size: 13px; font-weight: 700; color: var(--chalk-blue); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .cd-nodes { font-family: 'Share Tech Mono', monospace; font-size: 15px; color: var(--chalk-white); }
    .cd-node { background: rgba(255,255,255,0.09); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.18); }
    .chalk-checkpoint { background: rgba(240,165,0,0.1); border-left: 4px solid #f0a500; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 15px; }
    .cp-hint { font-size: 13px; color: #f0a500; margin-top: 6px; font-style: italic; }
    .lesson-section { margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
    .section-title { font-size: 18px; font-weight: 700; color: #58d68d; margin-bottom: 14px; }
    .terms-grid, .careers-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .term-pill, .career-pill { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); padding: 6px 14px; border-radius: 14px; font-size: 13px; font-weight: 600; }
    .rh-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    .rh-list li { background: rgba(147,51,234,0.12); border-left: 3px solid #a855f7; padding: 8px 14px; border-radius: 6px; font-size: 14px; }
    .quiz-items { display: flex; flex-direction: column; gap: 16px; margin-top: 10px; }
    .quiz-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; padding: 16px; }
    .qi-q { font-size: 15px; margin-bottom: 10px; }
    .qi-options { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .qi-opt { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 6px 12px; border-radius: 6px; font-size: 13px; }
    .qi-opt.opt-correct { background: rgba(34,197,94,0.15); border-color: #22c55e; color: #4ade80; }
    .opt-letter { font-weight: 800; display: inline-block; width: 20px; }
    .qi-exp { font-size: 13px; color: rgba(240,236,224,0.8); }
    .qi-reteach { font-size: 13px; color: #f4d03f; background: rgba(244,208,63,0.1); border-radius: 4px; padding: 6px 10px; margin-top: 6px; }
    footer { margin-top: 36px; text-align: center; font-size: 12px; color: rgba(240,236,224,0.4); border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 18px; }
    @media print {
      body { background: #fff!important; color: #111!important; padding: 0; }
      .container { border: none!important; box-shadow: none!important; max-width: 100%!important; padding: 10px!important; }
      .board-frame { background: #f8fafc!important; border: 1px solid #cbd5e1!important; }
      .chalk-heading, .chalk-text, .chalk-bullets { color: #0f172a!important; }
      .chalk-equation { background: #f1f5f9!important; color: #047857!important; border-color: #047857!important; }
      .print-btn { display: none!important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <div>
        <div class="brand-tag">SlateMind • AI Blackboard Studio</div>
        <div class="meta-tag">Learner: <b>${studentName}</b> • Level: <b>${gradeLevel}</b> • Language: <b>${lang}</b> • Date: ${dateStr}</div>
      </div>
      <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    <h1 class="lesson-title">🎓 ${esc(topic)}</h1>

    <div class="board-frame">
      ${blocksHtml || '<p class="chalk-text">Lesson content available on blackboard.</p>'}
    </div>

    ${termsHtml}
    ${quizHtml}
    ${careersHtml}
    ${rhHtml}

    ${fact ? `<div class="lesson-section"><h3 class="section-title">💡 Fun Fact</h3><p style="font-size:14px;color:var(--chalk-blue)">${esc(fact)}</p></div>` : ''}

    <footer>
      Exported offline via SlateMind • Local-First Adaptive AI Studio for Students & Teachers (NEP 2020 Aligned)
    </footer>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const dl = document.createElement('a');
    dl.href = URL.createObjectURL(blob);
    dl.download = `slatemind-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-lesson.html`;
    dl.click();
    setTimeout(() => URL.revokeObjectURL(dl.href), 3000);
    showGameNotif('💾', 'OFFLINE LESSON READY', 'Complete interactive lesson with quiz & notes exported!', 'green', 2500);
  });
  el('boardFsBtn').addEventListener('click', toggleFullscreen);
  el('fullscreenBtn').addEventListener('click', toggleFullscreen);

  /* Sidebar toggles — LEFT */
  el('leftCloseBtn').addEventListener('click', () => {
    el('leftSidebar').classList.add('collapsed');
    el('leftOpenBtn').style.display = 'flex';
  });
  el('leftOpenBtn').addEventListener('click', () => {
    el('leftSidebar').classList.remove('collapsed');
    el('leftOpenBtn').style.display = 'none';
    setTimeout(() => (wb || window.wb)?._resize(), 280);
  });

  /* Sidebar toggles — RIGHT */
  el('rightCloseBtn').addEventListener('click', () => {
    el('rightSidebar').classList.add('collapsed');
    el('rightOpenHudBtn').style.display = 'flex';
    setTimeout(() => (wb || window.wb)?._resize(), 280);
  });
  el('rightOpenHudBtn').addEventListener('click', () => {
    el('rightSidebar').classList.remove('collapsed');
    el('rightOpenHudBtn').style.display = 'none';
    setTimeout(() => (wb || window.wb)?._resize(), 280);
  });

  /* Right sidebar tabs */
  document.querySelectorAll('.rs-tab').forEach(t => {
    t.addEventListener('click', () => switchRSTab(t.dataset.tab));
  });

  /* Error retry */
  el('errRetryBtn').addEventListener('click', () => {
    hideError();
    if (window.lastTopic) startLesson(window.lastTopic);
  });

  /* Quiz and Progress Card */
  el('quizNextBtn').addEventListener('click', nextQ);
  el('retryQuizBtn').addEventListener('click', retryQuiz);
  el('shareProgressCardBtn')?.addEventListener('click', generateProgressCard);

  /* Feynman Explain-It-Back */
  const fInput = el('feynmanInput');
  fInput?.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      el('feynmanSubmitBtn')?.click();
    }
  });
  el('feynmanSubmitBtn')?.addEventListener('click', handleFeynmanSubmit);

  /* Global Keyboard Shortcuts */
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const activeModals = document.querySelectorAll('.modal-overlay.active');
      activeModals.forEach(o => {
        if (o.id !== 'splashOverlay' || STATE.hasOnboarded) {
          closeModal(o.id);
          if (o.id === 'checkpointOverlay' && wb) wb.setPaused(false);
        }
      });
      return;
    }

    const activeEl = document.activeElement;
    const tag = activeEl ? activeEl.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || activeEl?.isContentEditable) return;

    if (e.code === 'Space' && wb && wb.isWriting()) {
      e.preventDefault();
      const p = !wb._paused;
      wb.setPaused(p);
      const pauseBtn = el('pauseBtn');
      if (pauseBtn) pauseBtn.textContent = p ? '▶ Resume' : '⏸ Pause';
      showGameNotif(p ? '⏸' : '▶', p ? 'PAUSED' : 'RESUMED', p ? 'Board writing paused' : 'Continuing blackboard', 'purple', 1000);
    }
  });

  /* HUD buttons */
  el('constellationBtn')?.addEventListener('click', () => {
    openModal('constellationOverlay');
    renderConstellation();
  });
  el('badgesBtn').addEventListener('click', () => { renderBadges(); openModal('badgesOverlay'); });
  el('leaderboardBtn').addEventListener('click', () => { renderLeaderboard(); openModal('leaderboardOverlay'); });
  el('settingsBtn').addEventListener('click', () => {
    if (el('settingNameInput')) el('settingNameInput').value = STATE.playerName || 'Student';
    openModal('settingsOverlay');
  });

  /* Modals */
  document.querySelectorAll('.modal-close[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o && o.id !== 'splashOverlay') closeModal(o.id); });
  });
  el('luCloseBtn').addEventListener('click', () => closeModal('levelUpOverlay'));

  /* Checkpoint */
  el('cpHintBtn').addEventListener('click', () => {
    el('cpHint').style.display = 'block';
    el('cpHintBtn').style.display = 'none';
  });
  el('cpContinueBtn').addEventListener('click', () => {
    closeModal('checkpointOverlay');
    (wb || window.wb)?.setPaused(false);
  });
  window.addEventListener('wb:checkpoint', e => showCheckpoint(e.detail.question, e.detail.hint));

  /* Settings: Inline Name Save */
  const saveName = () => {
    const newName = (el('settingNameInput')?.value || '').trim();
    if (newName) {
      STATE.playerName = newName;
      localStorage.setItem('pb_studentName', newName);
      save();
      updateHUD();
      showGameNotif('🎓', 'NAME SAVED', `Welcome, ${newName}!`, 'green', 1800);
    }
  };
  el('saveNameBtn')?.addEventListener('click', saveName);
  el('settingNameInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') saveName(); });

  /* Settings: Teacher Persona */
  document.querySelectorAll('.style-card').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.style-card').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      STATE.teachStyle = b.dataset.style || 'mentor';
      save();
      const title = b.querySelector('.sc-title')?.textContent || 'Mentor';
      showGameNotif('🎓', 'TEACHING PERSONA', `Professor Byte: ${title}`, 'purple', 1800);
    });
  });

  /* Settings: Chalk Theme */
  document.querySelectorAll('.theme-card').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      applyTheme(b.dataset.theme);
      const name = b.querySelector('.tc-label')?.textContent || 'Theme';
      showGameNotif('🎨', 'SURFACE THEME', `${name} applied`, 'gold', 1500);
    });
  });

  /* Settings: Writing Speed */
  document.querySelectorAll('.speed-opt').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.speed-opt').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      STATE.writeSpeed = b.dataset.speed;
      (wb || window.wb)?.setSpeed(b.dataset.speed);
      save();
    });
  });

  /* Settings: Audio & Auto-Scroll Toggles */
  el('soundToggle')?.addEventListener('click', () => {
    STATE.soundOn = !STATE.soundOn;
    el('soundToggle').textContent = STATE.soundOn ? '🔊 ON' : '🔇 OFF';
    el('soundToggle').classList.toggle('off', !STATE.soundOn);
    save();
  });

  el('autoScrollToggle')?.addEventListener('click', () => {
    STATE.autoScroll = !(STATE.autoScroll !== false);
    el('autoScrollToggle').textContent = STATE.autoScroll ? '📜 ON' : '📜 OFF';
    el('autoScrollToggle').classList.toggle('off', !STATE.autoScroll);
    save();
    showGameNotif('📜', 'AUTO-SCROLL', STATE.autoScroll ? 'Following chalk writing' : 'Auto-scroll paused', 'purple', 1500);
  });

  /* Settings: Start Interactive Demo Tour */
  el('startTourBtn')?.addEventListener('click', () => {
    closeModal('settingsOverlay');
    if (window.startAppTour) {
      window.startAppTour();
    }
  });

  /* Settings: Reset Progress */
  el('resetProgressBtn')?.addEventListener('click', () => {
    if (confirm('Clear ALL local data and restart journey? This cannot be undone!')) {
      localStorage.clear();
      location.reload();
    }
  });

  /* Export / Import Local Profile Data */
  el('exportDataBtn')?.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(STATE, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `slatemind-profile-${Date.now()}.json`);
    dl.click();
    showGameNotif('📥', 'DATA EXPORTED', 'Profile backup downloaded successfully', 'green', 2000);
  });

  const importFile = el('importFileInput');
  el('importDataBtn')?.addEventListener('click', () => importFile?.click());
  importFile?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (typeof imported === 'object' && imported !== null) {
          STATE = { ...DEF, ...imported };
          save();
          updateHUD();
          renderHistory();
          showGameNotif('📤', 'DATA IMPORTED', 'Learning profile restored!', 'gold', 2500);
          closeModal('settingsOverlay');
        }
      } catch (err) {
        showProfMsg('Invalid profile JSON file.');
      }
    };
    reader.readAsText(file);
  });

  /* Chalk tray & eraser */
  document.querySelector('.eraser')?.addEventListener('click', () => el('clearBtn').click());

  /* Professor Byte avatar */
  el('profAvatar').addEventListener('click', () => {
    const msgs = [
      'Keep learning — every lesson makes you smarter! 🧠',
      "You're doing great! ⚡",
      'Curiosity is the best superpower! 🔍',
      'Every expert was once a beginner. Keep going! 🚀',
      'The more topics you finish, the stronger you get! 🎮'
    ];
    showProfMsg(msgs[Math.floor(Math.random() * msgs.length)]);
    if (window.sound) sound('badge');
  });
}

/* ── Bootstrap Initialization ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  load();
  wb = new Whiteboard('boardCanvas');
  window.wb = wb;
  wb.setSpeed(STATE.writeSpeed || 'normal');

  // Sync settings UI
  if (el('settingNameInput')) el('settingNameInput').value = STATE.playerName || 'Student';
  document.querySelectorAll('.speed-opt').forEach(b => b.classList.toggle('active', b.dataset.speed === STATE.writeSpeed));
  
  if (el('soundToggle')) {
    el('soundToggle').textContent = STATE.soundOn ? '🔊 ON' : '🔇 OFF';
    el('soundToggle').classList.toggle('off', !STATE.soundOn);
  }

  if (el('autoScrollToggle')) {
    const autoScroll = STATE.autoScroll !== false;
    el('autoScrollToggle').textContent = autoScroll ? '📜 ON' : '📜 OFF';
    el('autoScrollToggle').classList.toggle('off', !autoScroll);
  }

  if (STATE.boardTheme) {
    applyTheme(STATE.boardTheme);
    document.querySelectorAll('.theme-card').forEach(b => b.classList.toggle('active', b.dataset.theme === STATE.boardTheme));
  }

  if (STATE.teachStyle) {
    document.querySelectorAll('.style-card').forEach(b => b.classList.toggle('active', b.dataset.style === STATE.teachStyle));
  }

  updateHUD();
  renderHistory();
  setupDailyChallenge();
  wire();
  setupLearningUI();
  setupOnboarding();
  setTimeout(updateHUD, 400);

  // Daily welcome notification
  const today = new Date().toDateString();
  if (STATE.hasOnboarded && STATE.lastStudyDate !== today && STATE.currentStreak > 0) {
    setTimeout(() => showGameNotif('🔥', `${STATE.currentStreak} Day Streak!`, 'Keep it alive today!', 'orange', 3000), 1500);
  }

  // Register service worker for offline PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  console.log('🎓 SlateMind — Modular core running cleanly.');
});

// Window bindings
window.startLesson = startLesson;
window.onLessonComplete = onLessonComplete;
window.loadHistoryLesson = loadHistoryLesson;
window.switchRSTab = switchRSTab;
