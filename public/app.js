/* ═══════════════════════════════════════════════════════════════
   SlateMind — app.js
   Master Controller: Lesson flow, history, follow-up & DOM wiring
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── Lesson Generation & Flow ─────────────────────────────────── */
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
  window.lastTopic = topic;
  window.interactionId = null;

  hideError();
  setUIState('loading');
  el('boardIdle').style.display    = 'none';
  el('boardLoading').style.display = 'flex';
  el('boardError').style.display   = 'none';
  el('loadingText').textContent    = LOADING_MSGS[Math.floor(Math.random() * LOADING_MSGS.length)];

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch('/api/lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, teachStyle: STATE.teachStyle || 'mentor' }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: `Error ${res.status}` }));
      throw new Error(e.error || `Server error ${res.status}`);
    }
    const data = await res.json();
    window.interactionId = data.interactionId || null;

    el('boardLoading').style.display = 'none';
    showLessonMeta(topic, data);
    wb.clear();
    wb.setSpeed(STATE.writeSpeed);
    if (STATE.writeSpeed === 'fast' || STATE.writeSpeed === 'instant') STATE.fastLessons++;

    setUIState('writing');
    if (window.sound) sound('start');
    showGameNotif('📖', 'LESSON STARTED', `Topic: ${topic.slice(0, 30)}`, 'green', 1800);

    await wb.renderLesson(data.blocks || [], {
      onAllDone: () => onLessonComplete(data, topic, isDaily),
    });

  } catch (err) {
    el('boardLoading').style.display = 'none';
    showError(err.name === 'AbortError'
      ? 'Request timed out — please try again.'
      : (err.message || 'Could not reach Professor Byte.'));
    setUIState('idle');
    if (window.sound) sound('error');
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

  const xp = data.xpReward || 80;
  awardXP(xp, 'lesson');

  addToHistory(topic, data);
  showFactPanel(data.funFact);
  showTermsPanel(data.keyTerms);
  setupQuizPanel(data.quiz);
  setupFeynmanPanel();

  el('askBar').style.display = 'block';
  populateAskChips(data.rabbitHoles);
  setUIState('done');
  checkBadges();
  if (window.sound) sound('complete');
  showGameNotif('🎉', 'LESSON COMPLETE', `+${xp} XP earned!`, 'gold', 2500);

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
  el('metaXP').textContent    = `+${data.xpReward || 80} XP`;
  el('metaTerms').textContent = data.keyTerms?.length ? '📌 ' + data.keyTerms.slice(0, 3).join(', ') : '';
  el('lessonMeta').style.display = 'flex';
}

/* ── Follow-Up Question Flow ──────────────────────────────────── */
async function askFollowUp(question) {
  question = (question || '').trim();
  if (!question) return;

  if (!window.interactionId) {
    showProfMsg('⚠️ Start a lesson first before asking follow-up questions.');
    return;
  }

  el('askBtn').disabled   = true;
  el('askInput').value    = '';
  el('askInput').disabled = true;
  showAskStatus(true, 'Professor Byte is answering…');

  STATE.followUps++;
  save();
  checkBadges();

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, interactionId: window.interactionId }),
      signal: ctrl.signal,
    });
    clearTimeout(t);

    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: `Error ${res.status}` }));
      throw new Error(e.error || `Error ${res.status}`);
    }

    const data = await res.json();
    window.interactionId = data.interactionId || window.interactionId;

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
    const msg = err.name === 'AbortError'
      ? '⏱ Request timed out. Try a shorter question.'
      : `⚠️ ${err.message || 'Could not get answer.'}`;
    showProfMsg(msg);
    if (window.sound) sound('error');
  } finally {
    el('askBtn').disabled   = false;
    el('askInput').disabled = false;
    el('askInput').focus();
  }
}

function showAskStatus(visible, text = '') {
  const s = el('askStatus');
  s.style.display = visible ? 'flex' : 'none';
  if (text) el('askStatusText').textContent = text;
}

/* ── Right Sidebar Panels ─────────────────────────────────────── */
function showFactPanel(fact) {
  if (!fact) return;
  el('factEmpty').style.display = 'none';
  el('factText').textContent    = fact;
  el('factText').style.display  = 'block';
}

function showTermsPanel(terms) {
  if (!terms?.length) return;
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
    xp: data.xpReward || 80,
    ts: Date.now(),
    data: {
      title: data.title || topic,
      difficulty: data.difficulty || 'Intermediate',
      xpReward: data.xpReward || 80,
      funFact: data.funFact || '',
      keyTerms: data.keyTerms || [],
      rabbitHoles: data.rabbitHoles || [],
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
    window.currentQuiz = data.quiz || [];
    showLessonMeta(topic, data);
    wb.clear();
    wb.setSpeed(STATE.writeSpeed);
    setUIState('writing');
    if (window.sound) sound('start');
    showGameNotif('📖', 'LESSON RESTORED', `Loaded: ${topic.slice(0, 30)}`, 'green', 1500);

    await wb.renderLesson(data.blocks, {
      onAllDone: () => {
        showFactPanel(data.funFact);
        showTermsPanel(data.keyTerms);
        setupQuizPanel(data.quiz);
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
  setTimeout(() => wb._resize(), 300);
}

/* ── Onboarding Experience ────────────────────────────────────── */
function setupOnboarding() {
  const ni = el('studentNameInput'), sb = el('startAdventureBtn');
  ni.addEventListener('keydown', e => { if (e.key === 'Enter') sb.click(); });
  sb.addEventListener('click', () => {
    initAudio();
    const name = (ni.value.trim() || 'Student');
    STATE.playerName   = name;
    STATE.hasOnboarded = true;
    localStorage.setItem('pb_studentName', name);
    save();
    updateHUD();
    closeModal('splashOverlay');
    if (window.sound) sound('levelup');
    setTimeout(() => showGameNotif('🎓', 'WELCOME!', `Ready to learn, ${name}?`, 'green', 2500), 500);
  });
  const saved = localStorage.getItem('pb_studentName');
  if (STATE.hasOnboarded && saved) {
    STATE.playerName = saved;
    closeModal('splashOverlay');
  } else {
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
    const p = !wb._paused;
    wb.setPaused(p);
    el('pauseBtn').textContent = p ? '▶ Resume' : '⏸ Pause';
  });
  el('speedBtn').addEventListener('click', () => {
    const sp = ['slow', 'normal', 'fast', 'instant'];
    const ic = ['🐢', '🚶', '🐇', '⚡'];
    const lb = ['Slow', 'Normal', 'Fast', 'Instant'];
    const n = (sp.indexOf(STATE.writeSpeed) + 1) % sp.length;
    STATE.writeSpeed = sp[n];
    wb.setSpeed(STATE.writeSpeed);
    el('speedBtn').textContent = `${ic[n]} ${lb[n]}`;
    save();
    if (sp[n] === 'fast' || sp[n] === 'instant') {
      showGameNotif('🚀', 'TURBO MODE!', 'Writing at max speed', 'orange', 1500);
    }
  });
  el('clearBtn').addEventListener('click', () => {
    wb.clear();
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
  el('screenshotBtn').addEventListener('click', () => wb.saveAsImage(el('metaTopic')?.textContent));
  el('exportHtmlBtn')?.addEventListener('click', () => {
    const topic = window.lastTopic || 'Lesson';
    const fact = el('factText')?.textContent || '';
    const dateStr = new Date().toLocaleDateString();
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>SlateMind Lesson — ${esc(topic)}</title>
  <style>
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #1a120b; color: #f0ece0; padding: 30px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    h1 { color: #f4d03f; border-bottom: 2px dashed rgba(244,208,63,0.3); padding-bottom: 10px; }
    .badge { display: inline-block; background: #1a3a2a; border: 1px solid #58d68d; color: #58d68d; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 18px; margin: 16px 0; }
    .fact { color: #85c1e9; font-style: italic; }
    footer { margin-top: 40px; color: #888; font-size: 12px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 15px; }
  </style>
</head>
<body>
  <div class="badge">SlateMind Standalone Lesson File</div>
  <h1>🎓 ${esc(topic)}</h1>
  <div class="card">
    <h3>Fun Fact</h3>
    <p class="fact">${esc(fact || 'Completed on ' + dateStr)}</p>
  </div>
  <footer>Exported offline via SlateMind • Local-first tool for learning and teaching</footer>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const dl = document.createElement('a');
    dl.href = URL.createObjectURL(blob);
    dl.download = `slatemind-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    dl.click();
    showGameNotif('💾', 'LESSON FILE SAVED', 'Self-contained offline lesson downloaded', 'green', 2000);
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
    setTimeout(() => wb._resize(), 280);
  });

  /* Sidebar toggles — RIGHT */
  el('rightCloseBtn').addEventListener('click', () => {
    el('rightSidebar').classList.add('collapsed');
    el('rightOpenHudBtn').style.display = 'flex';
    setTimeout(() => wb._resize(), 280);
  });
  el('rightOpenHudBtn').addEventListener('click', () => {
    el('rightSidebar').classList.remove('collapsed');
    el('rightOpenHudBtn').style.display = 'none';
    setTimeout(() => wb._resize(), 280);
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
    wb.setPaused(false);
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
      wb.setSpeed(b.dataset.speed);
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

  /* Settings: Replay Tour */
  el('replayTourBtn')?.addEventListener('click', () => {
    closeModal('settingsOverlay');
    openModal('splashOverlay');
    if (el('studentNameInput')) {
      el('studentNameInput').value = STATE.playerName || 'Student';
      el('studentNameInput').focus();
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
  window.wb = new Whiteboard('boardCanvas');
  window.wb.setSpeed(STATE.writeSpeed || 'normal');

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
