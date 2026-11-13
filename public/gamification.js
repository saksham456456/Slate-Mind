/* ═══════════════════════════════════════════════════════════════
   SlateMind — gamification.js
   XP, leveling, streak tracking, badges, notifications & leaderboard
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── XP & Levels ─────────────────────────────────────────────── */
function getLvl(xp) {
  let cur = LEVELS[0], nxt = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpNeeded) {
      cur = LEVELS[i];
      nxt = LEVELS[i + 1] || null;
      break;
    }
  }
  return { cur, nxt };
}

function awardXP(amount) {
  if (!amount || amount <= 0) return;
  const prevLv = STATE.level;
  STATE.totalXP += amount;
  const { cur } = getLvl(STATE.totalXP);
  STATE.level = cur.level;
  updateHUD();
  showXPPopup(amount);
  save();

  checkMilestones(STATE.totalXP - amount, STATE.totalXP);
  if (STATE.level > prevLv) {
    setTimeout(() => showLevelUp(cur, amount), 900);
  }
  checkBadges();
}

function getProgress() {
  const { cur, nxt } = getLvl(STATE.totalXP);
  if (!nxt) return { pct: 100, cur: STATE.totalXP, needed: STATE.totalXP };
  const base = cur.xpNeeded, range = nxt.xpNeeded - base, done = STATE.totalXP - base;
  return { pct: Math.min(100, (done / range) * 100), cur: done, needed: range };
}

function checkMilestones(before, after) {
  const milestones = [100, 250, 500, 1000, 2000, 5000];
  for (const m of milestones) {
    if (before < m && after >= m) {
      showGameNotif('✨', 'XP MILESTONE', `${m} XP reached!`, 'gold', 2000);
      break;
    }
  }
}

/* ── Streak Tracker ──────────────────────────────────────────── */
function updateStreak() {
  const today = new Date().toDateString();
  if (STATE.lastStudyDate === today) return;
  const yest = new Date(Date.now() - 86400000).toDateString();
  const prev = STATE.currentStreak;
  STATE.currentStreak = (STATE.lastStudyDate === yest) ? STATE.currentStreak + 1 : 1;
  if (STATE.currentStreak > STATE.maxStreak) STATE.maxStreak = STATE.currentStreak;
  STATE.lastStudyDate = today;
  if (new Date().getHours() >= 22) STATE.nightStudy++;
  save();

  if (STATE.currentStreak > prev && STATE.currentStreak > 1) {
    setTimeout(() => showGameNotif('🔥', 'STREAK!', `${STATE.currentStreak} days in a row!`, 'orange', 2200), 800);
  }
}

/* ── Badges ──────────────────────────────────────────────────── */
function checkBadges() {
  BADGES.forEach(b => {
    if (STATE.earnedBadges.includes(b.id)) return;
    if (b.check(STATE)) {
      STATE.earnedBadges.push(b.id);
      save();
      showBadgeToast(b);
    }
  });
}

function showBadgeToast(b) {
  const area = el('achievementArea');
  if (!area) return;
  const t = document.createElement('div');
  t.className = 'achievement-toast';
  t.innerHTML = `<div class="toast-icon">${b.icon}</div>
    <div class="toast-info">
      <div class="toast-title">🏅 Badge Unlocked!</div>
      <div class="toast-desc">${b.name} — ${b.desc}</div>
    </div>`;
  area.prepend(t);
  if (window.sound) sound('badge');
  setTimeout(() => t.remove(), 6000);

  if (window.switchRSTab) window.switchRSTab('fact');
}

/* ── HUD Updates ─────────────────────────────────────────────── */
function updateHUD() {
  const { cur, nxt } = getLvl(STATE.totalXP);
  const p = getProgress();
  if (el('playerNameDisplay')) el('playerNameDisplay').textContent = STATE.playerName;
  if (el('playerLevel'))       el('playerLevel').textContent       = `Lv ${cur.level}`;
  if (el('levelTitle'))        el('levelTitle').textContent        = cur.title;
  if (el('xpBarFill'))         el('xpBarFill').style.width         = p.pct + '%';
  if (el('xpBarLabel'))        el('xpBarLabel').textContent        = nxt ? `${p.cur} / ${p.needed} XP` : 'MAX ⭐';
  if (el('totalXP'))           el('totalXP').textContent           = STATE.totalXP;
  if (el('streakCount'))       el('streakCount').textContent       = STATE.currentStreak;
  if (el('lessonsCount'))      el('lessonsCount').textContent      = STATE.lessonsCompleted;
  if (el('topicsCount'))       el('topicsCount').textContent       = STATE.topicsExplored || 0;
  if (el('streakChip'))        el('streakChip').classList.toggle('active', STATE.currentStreak >= 3);
}

/* ── Notifications & Visual Feedback ─────────────────────────── */
let _notifTimer = null;
function showGameNotif(icon, title, sub, color = 'gold', duration = 2500) {
  const n = el('gameNotif');
  if (!n) return;
  el('gnIcon').textContent  = icon;
  el('gnTitle').textContent = title;
  el('gnSub').textContent   = sub;

  const colors = {
    gold:   ['rgba(244,197,66,.35)', 'var(--xp-gold)'],
    orange: ['rgba(255,100,0,.35)',  '#ff6600'],
    green:  ['rgba(0,229,160,.3)',   'var(--accent)'],
    purple: ['rgba(124,58,237,.35)', '#a78bfa'],
    red:    ['rgba(239,68,68,.35)',  '#ef4444'],
  };
  const [bc, tc] = colors[color] || colors.gold;
  n.style.borderColor = bc;
  el('gnTitle').style.color = tc;

  n.style.display   = 'flex';
  n.style.animation = 'none';
  void n.offsetWidth;
  n.style.animation = 'notifIn .4s cubic-bezier(.34,1.56,.64,1)';

  clearTimeout(_notifTimer);
  _notifTimer = setTimeout(() => {
    n.style.animation = 'notifOut .3s ease forwards';
    setTimeout(() => { n.style.display = 'none'; }, 320);
  }, duration);
}

function showXPPopup(amount) {
  const p = el('xpPopup');
  if (!p) return;
  el('xpPopupVal').textContent = amount;
  p.style.display   = 'block';
  p.style.left      = (window.innerWidth / 2 - 50) + 'px';
  p.style.top       = (window.innerHeight / 2 - 40) + 'px';
  p.style.animation = 'none';
  void p.offsetWidth;
  p.style.animation = 'xpFloat 1.3s ease-out forwards';
  setTimeout(() => { p.style.display = 'none'; }, 1400);
}

function comboFlash() {
  const f = document.createElement('div');
  f.className = 'combo-flash';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 350);
}

function showProfMsg(msg) {
  const area = el('achievementArea');
  if (!area) return;
  const t = document.createElement('div');
  t.className = 'achievement-toast';
  t.style.cssText = 'background:rgba(0,229,160,.08);border-color:rgba(0,229,160,.3)';
  t.innerHTML = `<div class="toast-icon">🎓</div>
    <div class="toast-info">
      <div class="toast-title">Professor Byte</div>
      <div class="toast-desc">${esc(msg)}</div>
    </div>`;
  area.prepend(t);
  setTimeout(() => t.remove(), 5000);
}

function showLevelUp(lvl, xp) {
  el('luLevel').textContent     = `Level ${lvl.level}`;
  el('luTitleName').textContent = lvl.title;
  el('luXpEarned').textContent  = xp ? `+${xp} XP earned!` : '';
  openModal('levelUpOverlay');
  if (window.sound) sound('levelup');
  if (el('boardFrame')) {
    el('boardFrame').style.animation = 'screenShake .4s ease';
    setTimeout(() => { el('boardFrame').style.animation = ''; }, 400);
  }
}

/* ── Shareable Mastery Progress Card ─────────────────────────── */
function generateProgressCard() {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 360;
  const ctx = c.getContext('2d');

  // Background Slate gradient
  const bg = ctx.createLinearGradient(0, 0, 640, 360);
  bg.addColorStop(0, '#1a3a2a');
  bg.addColorStop(1, '#0e2319');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 640, 360);

  // Border frame
  ctx.strokeStyle = '#3d2b1f';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 628, 348);

  // Header Title
  ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#f4c542';
  ctx.textAlign = 'center';
  ctx.fillText('SLATEMIND MASTERY CARD', 320, 60);

  // Student & Level Info
  ctx.font = '22px "Caveat", cursive';
  ctx.fillStyle = '#f0ece0';
  ctx.fillText(`Student: ${STATE.playerName}  •  Level ${STATE.level}`, 320, 105);

  // Topic mastered
  ctx.font = 'bold 26px "Caveat", cursive';
  ctx.fillStyle = '#58d68d';
  ctx.fillText(`Topic: "${window.lastTopic || 'Curiosity Explorer'}"`, 320, 155);

  // Score & XP box
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(140, 185, 360, 80);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(140, 185, 360, 80);

  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#f4c542';
  ctx.fillText(`Score: ${window.quizScore} / ${window.currentQuiz?.length || 3}`, 320, 222);

  ctx.font = '16px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#85c1e9';
  ctx.fillText(`Total XP: ${STATE.totalXP}  |  🔥 Streak: ${STATE.currentStreak} Days`, 320, 252);

  // Footer Branding
  ctx.font = '14px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = 'rgba(240,236,224,0.6)';
  ctx.fillText('Powered by SlateMind — AI Blackboard Teacher', 320, 320);

  // Download image
  const dl = document.createElement('a');
  dl.download = `slatemind-mastery-${Date.now()}.png`;
  dl.href = c.toDataURL('image/png');
  dl.click();
  showGameNotif('🎴', 'PROGRESS CARD', 'Mastery card downloaded!', 'gold', 2000);
}

/* ── Badges Modal & Leaderboard ──────────────────────────────── */
function renderBadges() {
  const g = el('badgesGrid');
  if (!g) return;
  const earnedCount = (STATE.earnedBadges || []).length;
  const totalCount = BADGES.length;
  
  // Header summary in modal
  const headerSummary = `<div class="badge-summary-bar">
    <div class="bs-stat"><b>${earnedCount} / ${totalCount}</b><span>Badges Earned</span></div>
    <div class="bs-stat"><b>${Math.round((earnedCount / totalCount) * 100)}%</b><span>Mastery Complete</span></div>
  </div>`;

  const cardsHtml = BADGES.map(b => {
    const earned = STATE.earnedBadges.includes(b.id);
    const tier = b.id.includes('max') || b.id.includes('2000') || b.id.includes('25') ? 'diamond'
               : b.id.includes('10') || b.id.includes('7') || b.id.includes('king') ? 'gold'
               : b.id.includes('5') || b.id.includes('3') ? 'silver' : 'bronze';
    return `<div class="badge-card ${earned ? 'earned' : 'locked'} tier-${tier}" title="${b.desc}">
      <div class="badge-card-glow"></div>
      <div class="badge-icon-wrap">
        <span class="badge-icon">${b.icon}</span>
        ${earned ? '<span class="badge-sparkle">✦</span>' : ''}
      </div>
      <div class="badge-card-info">
        <div class="badge-card-name">${esc(b.name)}</div>
        <div class="badge-card-desc">${esc(b.desc)}</div>
      </div>
      <div class="badge-card-status ${earned ? 'status-unlocked' : 'status-locked'}">
        ${earned ? '✓ UNLOCKED' : '🔒 LOCKED'}
      </div>
    </div>`;
  }).join('');

  g.innerHTML = headerSummary + cardsHtml;
}

function renderLeaderboard() {
  const list = el('lbList');
  if (!list) return;

  // Dynamic peer cohort: combines renowned Indian & world pioneers with active classmate peers
  // Peer XP dynamically scales with the student so learning remains motivating and close-ranked
  const userXp = STATE.totalXP || 0;
  const baseOffset = Math.max(100, Math.round(userXp * 0.15));
  
  const cohort = [
    { name: 'Srinivasa Ramanujan', title: 'Master of Infinite Series', xp: Math.max(5400, userXp + baseOffset * 4), lvl: 10, avatar: '📐', streak: 42 },
    { name: 'Dr. APJ Abdul Kalam',  title: 'Rocketry & Visionary',     xp: Math.max(4800, userXp + baseOffset * 3), lvl: 10, avatar: '🚀', streak: 35 },
    { name: 'C.V. Raman',          title: 'Nobel Optics Pioneer',     xp: Math.max(4100, userXp + baseOffset * 2), lvl: 9,  avatar: '🔬', streak: 28 },
    { name: 'Ananya Sharma (Peer)',title: 'Class 12 CBSE Aspirant',   xp: Math.max(250, userXp + 60),               lvl: Math.max(1, STATE.level), avatar: '👩‍🎓', streak: 5 },
    { name: 'Rohan Mehta (Peer)',  title: 'JEE / Olympiad Track',     xp: Math.max(180, Math.max(0, userXp - 40)),  lvl: Math.max(1, STATE.level), avatar: '👨‍🎓', streak: 4 },
    { name: 'Priya Patel (Peer)',  title: 'Curious Explorer',         xp: Math.max(90, Math.max(0, userXp - 110)), lvl: Math.max(1, STATE.level - 1), avatar: '✨', streak: 3 },
  ];

  const all = [...cohort, {
    name: (STATE.playerName || 'Student') + ' (You)',
    title: 'Your Learning Journey',
    xp: userXp,
    lvl: STATE.level || 1,
    avatar: '⭐',
    streak: STATE.currentStreak || 1,
    isYou: true
  }].sort((a, b) => b.xp - a.xp);

  const yourRank = all.findIndex(p => p.isYou) + 1;
  const rankBox = el('lbYourRank');
  if (rankBox) {
    rankBox.innerHTML = `<div class="lb-rank-badge">
      <span>Your National Cohort Standing</span>
      <b>Rank #${yourRank} of ${all.length} • ${userXp} XP • Streak 🔥${STATE.currentStreak || 1}d</b>
    </div>`;
  }

  list.innerHTML = all.map((p, i) => `
    <div class="lb-row ${p.isYou ? 'lb-you' : ''}">
      <span class="lb-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">#${i + 1}</span>
      <span class="lb-avatar">${p.avatar}</span>
      <div class="lb-user-details">
        <span class="lb-name">${esc(p.name)}</span>
        <span class="lb-sub">${esc(p.title || '')} · 🔥 ${p.streak || 1}d</span>
      </div>
      <span class="lb-lvl">Lv ${p.lvl}</span>
      <span class="lb-xp">${p.xp} XP</span>
    </div>
  `).join('');
}

// Window bindings
window.getLvl = getLvl;
window.awardXP = awardXP;
window.getProgress = getProgress;
window.updateStreak = updateStreak;
window.checkBadges = checkBadges;
window.showBadgeToast = showBadgeToast;
window.updateHUD = updateHUD;
window.showGameNotif = showGameNotif;
window.showXPPopup = showXPPopup;
window.comboFlash = comboFlash;
window.showProfMsg = showProfMsg;
window.showLevelUp = showLevelUp;
window.generateProgressCard = generateProgressCard;
window.renderBadges = renderBadges;
window.renderLeaderboard = renderLeaderboard;
