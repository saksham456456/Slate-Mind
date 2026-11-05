/* ═══════════════════════════════════════════════════════════════
   SlateMind v2.2 — app.js
   Fixes: follow-up continuity, right sidebar tabs, fullscreen,
          bottom ask bar, rich notifications, sounds
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ══ 1. CONFIG ═════════════════════════════════════════════════ */
const LEVELS = [
  {level:1, title:'Rookie',          xpNeeded:0   },
  {level:2, title:'Curious Learner', xpNeeded:150 },
  {level:3, title:'Knowledge Seeker',xpNeeded:350 },
  {level:4, title:'Smart Cookie',    xpNeeded:600 },
  {level:5, title:'Brain Explorer',  xpNeeded:950 },
  {level:6, title:'Concept Master',  xpNeeded:1400},
  {level:7, title:'Tech Wizard',     xpNeeded:2000},
  {level:8, title:'Scholar',         xpNeeded:2800},
  {level:9, title:'Grand Scholar',   xpNeeded:3800},
  {level:10,title:'Professor Byte',  xpNeeded:5000},
];

const BADGES = [
  {id:'first_lesson', icon:'🎓',name:'First Step',   desc:'Complete your first lesson',    check:s=>s.lessonsCompleted>=1 },
  {id:'lesson_5',     icon:'📚',name:'Bookworm',      desc:'Complete 5 lessons',            check:s=>s.lessonsCompleted>=5 },
  {id:'lesson_10',    icon:'🔬',name:'Lab Rat',       desc:'Complete 10 lessons',           check:s=>s.lessonsCompleted>=10},
  {id:'lesson_25',    icon:'🧠',name:'Big Brain',     desc:'Complete 25 lessons',           check:s=>s.lessonsCompleted>=25},
  {id:'quiz_perfect', icon:'💯',name:'Perfect Score', desc:'Score 100% on a quiz',          check:s=>s.perfectQuizzes>=1  },
  {id:'quiz_5',       icon:'🎯',name:'Quiz Master',   desc:'Pass 5 quizzes',                check:s=>s.quizzesPassed>=5   },
  {id:'streak_3',     icon:'🔥',name:'On Fire',       desc:'3-day streak',                  check:s=>s.maxStreak>=3       },
  {id:'streak_7',     icon:'🌟',name:'Week Warrior',  desc:'7-day streak',                  check:s=>s.maxStreak>=7       },
  {id:'xp_500',       icon:'⚡',name:'Power Up',      desc:'Earn 500 XP',                   check:s=>s.totalXP>=500       },
  {id:'xp_2000',      icon:'💎',name:'XP Elite',      desc:'Earn 2000 XP',                  check:s=>s.totalXP>=2000      },
  {id:'speed_demon',  icon:'🚀',name:'Speed Demon',   desc:'3 lessons at fast speed',       check:s=>s.fastLessons>=3     },
  {id:'daily_champ',  icon:'🏆',name:'Daily Champ',   desc:'Complete daily challenge',      check:s=>s.dailyChallenges>=1 },
  {id:'asker',        icon:'🙋',name:'Curious George',desc:'Ask 10 follow-ups',             check:s=>s.followUps>=10      },
  {id:'combo_king',   icon:'👑',name:'Combo King',    desc:'3 quiz answers in a row',       check:s=>s.maxCombo>=3        },
  {id:'level_5',      icon:'🔑',name:'Rising Star',   desc:'Reach Level 5',                 check:s=>s.level>=5           },
  {id:'level_max',    icon:'🎖️',name:'Prof. Byte Jr.',desc:'Reach max level',               check:s=>s.level>=10          },
  {id:'night_owl',    icon:'🦉',name:'Night Owl',     desc:'Study after 10 PM',             check:s=>s.nightStudy>=1      },
];

const DAILY_CHALLENGES = [
  'The Water Cycle','How Black Holes Form','Pythagoras Theorem',
  'The Human Immune System','How Computers Work','Climate Change',
  'Evolution by Natural Selection','Nuclear Fission vs Fusion',
  'Machine Learning Basics','The French Revolution',
  'How Vaccines Work','Quantum Physics Introduction',
  "Newton's Three Laws of Motion",'Electricity and Magnetism',
  'The Solar System','Chemical Bonding','DNA Replication',
  'Ohm\'s Law','Photosynthesis','Respiration in Humans',
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
  'Sharpening the chalk…','Preparing your lesson…',
  'Summoning knowledge…','Writing the plan…',
  'Consulting the scrolls…','Organising the board…',
];

/* ══ 2. STATE ══════════════════════════════════════════════════ */
const DEF = {
  playerName:'Student', totalXP:0, level:1,
  lessonsCompleted:0, topicsExplored:0,
  perfectQuizzes:0, quizzesPassed:0,
  maxStreak:0, currentStreak:0, lastStudyDate:null,
  fastLessons:0, dailyChallenges:0, followUps:0, nightStudy:0,
  earnedBadges:[], lessonHistory:[],
  quizCorrect:0, quizTotal:0, maxCombo:0,
  soundOn:true, writeSpeed:'normal',
  hasOnboarded:false,
  dailyChallengeDate:null, dailyChallengeDone:false,
};

let STATE         = {};
let interactionId = null;   // preserved across follow-ups
let currentQuiz   = [];
let quizIndex     = 0;
let quizScore     = 0;
let quizCombo     = 0;      // consecutive correct answers
let lastTopic     = '';
let wb            = null;
let _audioCtx     = null;

/* ══ 3. PERSISTENCE ════════════════════════════════════════════ */
function load()  { try { const r=localStorage.getItem('pb_v2'); STATE=r?{...DEF,...JSON.parse(r)}:{...DEF}; } catch { STATE={...DEF}; } }
function save()  { try { localStorage.setItem('pb_v2',JSON.stringify(STATE)); } catch {} }

/* ══ 4. XP & LEVELS ════════════════════════════════════════════ */
function getLvl(xp) {
  let cur=LEVELS[0], nxt=LEVELS[1];
  for (let i=LEVELS.length-1;i>=0;i--) {
    if (xp>=LEVELS[i].xpNeeded) { cur=LEVELS[i]; nxt=LEVELS[i+1]||null; break; }
  }
  return {cur,nxt};
}

function awardXP(amount, reason='') {
  if (!amount||amount<=0) return;
  const prevLv = STATE.level;
  STATE.totalXP += amount;
  const {cur} = getLvl(STATE.totalXP);
  STATE.level = cur.level;
  updateHUD();
  showXPPopup(amount);
  save();
  // check milestones
  checkMilestones(STATE.totalXP - amount, STATE.totalXP);
  if (STATE.level > prevLv) setTimeout(()=>showLevelUp(cur, amount), 900);
  checkBadges();
}

function getProgress() {
  const {cur,nxt} = getLvl(STATE.totalXP);
  if (!nxt) return {pct:100,cur:STATE.totalXP,needed:STATE.totalXP};
  const base=cur.xpNeeded, range=nxt.xpNeeded-base, done=STATE.totalXP-base;
  return {pct:Math.min(100,(done/range)*100), cur:done, needed:range};
}

function checkMilestones(before, after) {
  const milestones = [100,250,500,1000,2000,5000];
  for (const m of milestones) {
    if (before < m && after >= m) {
      showGameNotif('✨','XP MILESTONE',`${m} XP reached!`,'gold',2000);
      break;
    }
  }
}

/* ══ 5. STREAK ════════════════════════════════════════════════ */
function updateStreak() {
  const today = new Date().toDateString();
  if (STATE.lastStudyDate === today) return;
  const yest = new Date(Date.now()-86400000).toDateString();
  const prev = STATE.currentStreak;
  STATE.currentStreak = (STATE.lastStudyDate===yest) ? STATE.currentStreak+1 : 1;
  if (STATE.currentStreak > STATE.maxStreak) STATE.maxStreak = STATE.currentStreak;
  STATE.lastStudyDate = today;
  if (new Date().getHours()>=22) STATE.nightStudy++;
  save();
  // Notify if streak increased
  if (STATE.currentStreak > prev && STATE.currentStreak > 1) {
    setTimeout(()=>showGameNotif('🔥','STREAK!',`${STATE.currentStreak} days in a row!`,'orange',2200),800);
  }
}

/* ══ 6. BADGES ════════════════════════════════════════════════ */
function checkBadges() {
  BADGES.forEach(b=>{
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
  t.className='achievement-toast';
  t.innerHTML=`<div class="toast-icon">${b.icon}</div>
    <div class="toast-info">
      <div class="toast-title">🏅 Badge Unlocked!</div>
      <div class="toast-desc">${b.name} — ${b.desc}</div>
    </div>`;
  area.prepend(t);
  sound('badge');
  setTimeout(()=>t.remove(),6000);
  // Switch to quiz tab to show achievement area
  switchRSTab('fact');
}

/* ══ 7. HUD ════════════════════════════════════════════════════ */
function updateHUD() {
  const {cur,nxt}=getLvl(STATE.totalXP);
  const p=getProgress();
  el('playerNameDisplay').textContent = STATE.playerName;
  el('playerLevel').textContent       = `Lv ${cur.level}`;
  el('levelTitle').textContent        = cur.title;
  el('xpBarFill').style.width         = p.pct+'%';
  el('xpBarLabel').textContent        = nxt ? `${p.cur} / ${p.needed} XP` : 'MAX ⭐';
  el('totalXP').textContent      = STATE.totalXP;
  el('streakCount').textContent  = STATE.currentStreak;
  el('lessonsCount').textContent = STATE.lessonsCompleted;
  el('topicsCount').textContent  = STATE.topicsExplored||0;
  el('streakChip').classList.toggle('active', STATE.currentStreak>=3);
}

/* ══ 8. NOTIFICATIONS ══════════════════════════════════════════ */
let _notifTimer = null;
function showGameNotif(icon, title, sub, color='gold', duration=2500) {
  const n = el('gameNotif');
  el('gnIcon').textContent  = icon;
  el('gnTitle').textContent = title;
  el('gnSub').textContent   = sub;

  const colors = {
    gold:  ['rgba(244,197,66,.35)','var(--xp-gold)'],
    orange:['rgba(255,100,0,.35)', '#ff6600'],
    green: ['rgba(0,229,160,.3)',  'var(--accent)'],
    purple:['rgba(124,58,237,.35)','#a78bfa'],
    red:   ['rgba(239,68,68,.35)', '#ef4444'],
  };
  const [bc, tc] = colors[color]||colors.gold;
  n.style.borderColor = bc;
  el('gnTitle').style.color = tc;

  n.style.display   = 'flex';
  n.style.animation = 'none';
  void n.offsetWidth;
  n.style.animation = 'notifIn .4s cubic-bezier(.34,1.56,.64,1)';

  clearTimeout(_notifTimer);
  _notifTimer = setTimeout(()=>{
    n.style.animation='notifOut .3s ease forwards';
    setTimeout(()=>{ n.style.display='none'; }, 320);
  }, duration);
}

function showXPPopup(amount) {
  const p = el('xpPopup');
  el('xpPopupVal').textContent = amount;
  p.style.display   = 'block';
  p.style.left      = (window.innerWidth/2-50)+'px';
  p.style.top       = (window.innerHeight/2-40)+'px';
  p.style.animation = 'none';
  void p.offsetWidth;
  p.style.animation = 'xpFloat 1.3s ease-out forwards';
  setTimeout(()=>{ p.style.display='none'; }, 1400);
}

function comboFlash() {
  const f = document.createElement('div');
  f.className='combo-flash';
  document.body.appendChild(f);
  setTimeout(()=>f.remove(), 350);
}

/* ══ 9. LEVEL UP ═══════════════════════════════════════════════ */
function showLevelUp(lvl, xp) {
  el('luLevel').textContent     = `Level ${lvl.level}`;
  el('luTitleName').textContent = lvl.title;
  el('luXpEarned').textContent  = xp ? `+${xp} XP earned!` : '';
  openModal('levelUpOverlay');
  sound('levelup');
  // Shake the board frame for drama
  el('boardFrame').style.animation='screenShake .4s ease';
  setTimeout(()=>el('boardFrame').style.animation='',400);
}

/* ══ 10. LESSON ════════════════════════════════════════════════ */
async function startLesson(topic, isDaily=false) {
  topic=(topic||'').trim();
  if (!topic) {
    el('topicInput').focus();
    el('topicInput').classList.add('error');
    el('topicError').style.display='block';
    setTimeout(()=>{ el('topicInput').classList.remove('error'); el('topicError').style.display='none'; },2500);
    return;
  }
  lastTopic = topic;
  // Reset follow-up state for new lesson
  interactionId = null;

  hideError();
  setUIState('loading');
  el('boardIdle').style.display    = 'none';
  el('boardLoading').style.display = 'flex';
  el('boardError').style.display   = 'none';
  el('loadingText').textContent    = LOADING_MSGS[Math.floor(Math.random()*LOADING_MSGS.length)];

  try {
    const ctrl=new AbortController();
    const t=setTimeout(()=>ctrl.abort(),30000);
    const res = await fetch('/api/lesson',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({topic}),
      signal:ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      const e=await res.json().catch(()=>({error:`Error ${res.status}`}));
      throw new Error(e.error||`Server error ${res.status}`);
    }
    const data = await res.json();
    // Store interactionId — this is what enables follow-ups
    interactionId = data.interactionId || null;

    el('boardLoading').style.display='none';
    showLessonMeta(topic,data);
    wb.clear();
    wb.setSpeed(STATE.writeSpeed);
    if (STATE.writeSpeed==='fast'||STATE.writeSpeed==='instant') STATE.fastLessons++;

    setUIState('writing');
    sound('start');
    showGameNotif('📖','LESSON STARTED',`Topic: ${topic.slice(0,30)}`,'green',1800);
    speak(`Today we are learning about ${topic}`);

    await wb.renderLesson(data.blocks||[], {
      onBlockDone: (idx, blk) => {
        if (blk.text) speak(blk.text);
      },
      onAllDone: ()=>onLessonComplete(data,topic,isDaily),
    });

  } catch(err) {
    el('boardLoading').style.display='none';
    showError(err.name==='AbortError'
      ? 'Request timed out — please try again.'
      : (err.message||'Could not reach Professor Byte.'));
    setUIState('idle');
    sound('error');
  }
}

function onLessonComplete(data,topic,isDaily) {
  STATE.lessonsCompleted++;
  STATE.topicsExplored=(STATE.topicsExplored||0)+1;
  updateStreak();
  if (isDaily) {
    STATE.dailyChallenges++;
    STATE.dailyChallengeDone=true;
    STATE.dailyChallengeDate=new Date().toDateString();
    setupDailyChallenge();
  }
  save();

  const xp=data.xpReward||80;
  awardXP(xp,'lesson');

  addToHistory(topic,data);
  showFactPanel(data.funFact);
  showTermsPanel(data.keyTerms);
  setupQuizPanel(data.quiz);
  setupFeynmanPanel();

  // Show ask bar now that lesson is done
  el('askBar').style.display='block';
  populateAskChips(data.rabbitHoles);
  setUIState('done');
  checkBadges();
  sound('complete');
  showGameNotif('🎉','LESSON COMPLETE',`+${xp} XP earned!`,'gold',2500);

  // Prompt right sidebar if collapsed
  if (document.getElementById('rightSidebar').classList.contains('collapsed')) {
    el('rightOpenHudBtn').style.display='flex';
    setTimeout(()=>{
      showGameNotif('📋','NOTES READY','Fun fact + quiz unlocked!','purple',2000);
    },1000);
  } else {
    // Auto-switch to quiz tab after lesson
    setTimeout(()=>switchRSTab('quiz'),600);
  }
}

function showLessonMeta(topic,data) {
  el('metaTopic').textContent = topic;
  const diff=data.difficulty||'Intermediate';
  el('metaDiff').textContent  = diff;
  el('metaDiff').className    = `meta-diff diff-${diff}`;
  el('metaXP').textContent    = `+${data.xpReward||80} XP`;
  el('metaTerms').textContent = data.keyTerms?.length ? '📌 '+data.keyTerms.slice(0,3).join(', '):'';
  el('lessonMeta').style.display='flex';
}

/* ══ 11. FOLLOW-UP (fixed) ═════════════════════════════════════ */
async function askFollowUp(question) {
  question=(question||'').trim();
  if (!question) return;

  // Guard: must have interactionId from current lesson
  if (!interactionId) {
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
    const ctrl=new AbortController();
    const t=setTimeout(()=>ctrl.abort(),25000);
    const res = await fetch('/api/ask',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({question, interactionId}),
      signal:ctrl.signal,
    });
    clearTimeout(t);

    if (!res.ok) {
      const e=await res.json().catch(()=>({error:`Error ${res.status}`}));
      throw new Error(e.error||`Error ${res.status}`);
    }

    const data = await res.json();
    // Update interactionId to maintain conversation context
    interactionId = data.interactionId || interactionId;

    sound('start');
    showAskStatus(true,'Writing on the board…');

    // appendBlocks continues from where the lesson left off
    await wb.appendBlocks(data.blocks||[], {
      onAllDone: ()=>{
        showAskStatus(false);
        if (data.xpReward) awardXP(data.xpReward,'followup');
        sound('complete');
        showGameNotif('🙋','+XP',`Follow-up answered! +${data.xpReward||20} XP`,'green',1800);
      },
    });

  } catch(err) {
    showAskStatus(false);
    const msg = err.name==='AbortError'
      ? '⏱ Request timed out. Try a shorter question.'
      : `⚠️ ${err.message||'Could not get answer.'}`;
    showProfMsg(msg);
    sound('error');
  } finally {
    el('askBtn').disabled   = false;
    el('askInput').disabled = false;
    el('askInput').focus();
  }
}

function showAskStatus(visible, text='') {
  const s = el('askStatus');
  s.style.display = visible ? 'flex' : 'none';
  if (text) el('askStatusText').textContent = text;
}

/* ══ 12. RIGHT SIDEBAR PANELS ══════════════════════════════════ */
function showFactPanel(fact) {
  if (!fact) return;
  el('factEmpty').style.display = 'none';
  el('factText').textContent    = fact;
  el('factText').style.display  = 'block';
}

function showTermsPanel(terms) {
  if (!terms?.length) return;
  el('termsEmpty').style.display = 'none';
  el('glossaryList').innerHTML   = terms.map((t,i)=>`
    <div class="glossary-term">
      <span class="term-word">${esc(t)}</span>
      <span class="term-idx">#${i+1}</span>
    </div>`).join('');
  el('glossaryList').style.display='flex';
}

function setupFeynmanPanel() {
  const fEmpty = el('feynmanEmpty');
  const fInner = el('feynmanInner');
  if (fEmpty && fInner) {
    fEmpty.style.display = 'none';
    fInner.style.display = 'block';
  }
}

/* ══ 13. QUIZ ══════════════════════════════════════════════════ */
function setupQuizPanel(quiz) {
  if (!quiz?.length) return;
  currentQuiz = quiz;
  quizIndex   = 0;
  quizScore   = 0;
  quizCombo   = 0;
  el('quizEmpty').style.display   = 'none';
  el('quizInner').style.display   = 'block';
  el('resultInner').style.display = 'none';
  renderQ();
}

function renderQ() {
  const q=currentQuiz[quizIndex], total=currentQuiz.length;
  if (!q) return;
  el('quizQCount').textContent  = `Question ${quizIndex+1} / ${total}`;
  el('quizProgFill').style.width= ((quizIndex/total)*100)+'%';
  el('quizQuestion').textContent= q.question;
  el('quizExplanation').style.display='none';
  el('quizNextBtn').style.display='none';
  const opts=el('quizOptions');
  opts.innerHTML='';
  ['A','B','C','D'].forEach((L,i)=>{
    if (!q.options[i]) return;
    const b=document.createElement('button');
    b.className='quiz-opt';
    b.innerHTML=`<span class="opt-letter">${L}</span>${esc(q.options[i])}`;
    b.addEventListener('click',()=>answerQ(i,q));
    opts.appendChild(b);
  });
}

function answerQ(chosen, q) {
  const correct=q.correct;
  document.querySelectorAll('.quiz-opt').forEach((b,i)=>{
    b.disabled=true;
    if (i===correct) b.classList.add('correct');
    else if (i===chosen) b.classList.add('wrong');
  });

  STATE.quizTotal++;
  if (chosen===correct) {
    quizScore++;
    quizCombo++;
    STATE.quizCorrect++;
    if (quizCombo > (STATE.maxCombo||0)) STATE.maxCombo=quizCombo;
    sound('correct');
    // Combo notifications
    if (quizCombo===2) showGameNotif('⚡','NICE!','2 correct in a row','green',1600);
    if (quizCombo===3) { showGameNotif('🔥','COMBO x3!','You\'re on fire!','orange',2000); comboFlash(); }
    if (quizCombo>=4)  { showGameNotif('💥',`COMBO x${quizCombo}!`,'Unstoppable!','red',2000); comboFlash(); }
  } else {
    quizCombo=0;
    sound('wrong');
  }
  save();

  el('quizExplanation').textContent   = q.explanation;
  el('quizExplanation').style.display = 'block';
  el('quizNextBtn').style.display     = 'inline-block';
  el('quizNextBtn').textContent       = quizIndex<currentQuiz.length-1?'Next ➤':'Results ➤';
}

function nextQ() {
  quizIndex++;
  if (quizIndex<currentQuiz.length) renderQ();
  else showQuizResult();
}

function showQuizResult() {
  const total=currentQuiz.length;
  const pct=Math.round((quizScore/total)*100);
  const stars=quizScore===total?'⭐⭐⭐':quizScore>=Math.ceil(total/2)?'⭐⭐':'⭐';
  const msgs={3:['🔥 Flawless!','💯 Perfect!'],2:['👍 Great job!','⚡ Sharp!'],1:['🙂 Keep going!','📖 Review & retry!'],0:['😅 Review the lesson!','🔄 Try again!']};
  const m=msgs[Math.min(quizScore,3)];

  el('quizInner').style.display   = 'none';
  el('resultInner').style.display = 'block';
  el('resultStars').textContent   = stars;
  el('resultScore').textContent   = `${quizScore} / ${total} (${pct}%)`;
  el('resultMsg').textContent     = m[Math.floor(Math.random()*m.length)];

  const qxp=quizScore*20;
  el('resultXP').textContent=`+${qxp} XP earned!`;
  awardXP(qxp,'quiz');

  if (quizScore===total) { STATE.perfectQuizzes++; sound('perfect'); showGameNotif('💯','PERFECT QUIZ!','All 3 correct!','gold',3000); }
  else if (quizScore>=Math.ceil(total/2)) { STATE.quizzesPassed++; sound('complete'); }
  else sound('wrong');
  save(); checkBadges();
}

function retryQuiz() { setupQuizPanel(currentQuiz); }

/* Module 4: Shareable Mastery Progress Card */
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
  ctx.font = 'bold 28px "Orbitron", monospace';
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
  ctx.fillText(`Topic: "${lastTopic || 'Curiosity Explorer'}"`, 320, 155);

  // Score & XP box
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(140, 185, 360, 80);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(140, 185, 360, 80);

  ctx.font = '20px "Orbitron", monospace';
  ctx.fillStyle = '#f4c542';
  ctx.fillText(`Score: ${quizScore} / ${currentQuiz.length || 3}`, 320, 222);

  ctx.font = '16px "Nunito", sans-serif';
  ctx.fillStyle = '#85c1e9';
  ctx.fillText(`Total XP: ${STATE.totalXP}  |  🔥 Streak: ${STATE.currentStreak} Days`, 320, 252);

  // Footer Branding
  ctx.font = '14px "Orbitron", monospace';
  ctx.fillStyle = 'rgba(240,236,224,0.6)';
  ctx.fillText('Powered by SlateMind — AI Blackboard Teacher', 320, 320);

  // Download image
  const dl = document.createElement('a');
  dl.download = `slatemind-mastery-${Date.now()}.png`;
  dl.href = c.toDataURL('image/png');
  dl.click();
  showGameNotif('🎴', 'PROGRESS CARD', 'Mastery card downloaded!', 'gold', 2000);
}

/* ══ 14. HISTORY ═══════════════════════════════════════════════ */
function addToHistory(topic,data) {
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
  if (STATE.lessonHistory.length>50) STATE.lessonHistory.pop();
  save(); renderHistory();
}

async function loadHistoryLesson(h) {
  if (!h || !h.topic) return;
  const topic = h.topic;
  lastTopic = topic;
  el('topicInput').value = topic;

  if (h.data && Array.isArray(h.data.blocks) && h.data.blocks.length > 0) {
    const data = h.data;
    interactionId = data.interactionId || null;
    currentQuiz = data.quiz || [];
    showLessonMeta(topic, data);
    wb.clear();
    wb.setSpeed(STATE.writeSpeed);
    setUIState('writing');
    sound('start');
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
        sound('complete');
      }
    });
  } else {
    // Fallback for legacy history without saved data
    startLesson(topic);
  }
}

function renderHistory() {
  const c=el('lessonHistory');
  if (!STATE.lessonHistory.length) { c.innerHTML='<div class="history-empty">No lessons yet! 👆</div>'; return; }
  const ico={Beginner:'🟢',Intermediate:'🟡',Advanced:'🔴'};
  c.innerHTML=STATE.lessonHistory.slice(0,20).map((h,i)=>`
    <div class="history-item${i===0?' active':''}" data-idx="${i}">
      <span class="hi-icon">${ico[h.diff]||'📖'}</span>
      <div class="hi-info">
        <div class="hi-topic">${esc(h.topic)}</div>
        <div class="hi-meta">+${h.xp} XP · <span class="hi-diff diff-${esc(h.diff)}">${esc(h.diff)}</span></div>
      </div>
    </div>`).join('');
  c.querySelectorAll('.history-item').forEach(item=>{
    item.addEventListener('click',()=>{
      const idx = parseInt(item.dataset.idx, 10);
      c.querySelectorAll('.history-item').forEach(i=>i.classList.remove('active'));
      item.classList.add('active');
      const histItem = STATE.lessonHistory[idx];
      loadHistoryLesson(histItem);
    });
  });
}

/* ══ 15. DAILY CHALLENGE ═══════════════════════════════════════ */
function setupDailyChallenge() {
  const today  = new Date().toDateString();
  const dayIdx = Math.floor(Date.now()/86400000)%DAILY_CHALLENGES.length;
  const topic  = DAILY_CHALLENGES[dayIdx]||'The Water Cycle';
  el('dcTopic').textContent=topic;
  const done=STATE.dailyChallengeDate===today&&STATE.dailyChallengeDone;
  const btn=el('dcBtn');
  btn.disabled    = done;
  btn.textContent = done?'✅ Done Today!':'Accept Challenge';
  btn.onclick=()=>{
    if (STATE.dailyChallengeDate!==today) { STATE.dailyChallengeDone=false; save(); }
    el('topicInput').value=topic;
    startLesson(topic,true);
  };
}

/* ══ 16. CURIOSITY RABBIT HOLES ══════════════════════════════ */
let currentRabbitHoles = [];

function populateAskChips(rabbitHoles) {
  if (Array.isArray(rabbitHoles) && rabbitHoles.length > 0) {
    currentRabbitHoles = rabbitHoles;
  }
  const chips = (currentRabbitHoles && currentRabbitHoles.length > 0)
    ? currentRabbitHoles
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
      sound('btn');
      showGameNotif('🕳️', 'RABBIT HOLE OPENED', `Investigating: "${q.slice(0, 30)}..."`, 'purple', 1800);
      askFollowUp(q);
    });
  });
}

/* ══ 17. RIGHT SIDEBAR TABS ════════════════════════════════════ */
function switchRSTab(tab) {
  document.querySelectorAll('.rs-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  document.querySelectorAll('.rs-panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${tab}`));
}

/* ══ 18. KNOWLEDGE CONSTELLATION MAP ══════════════════════════ */
let _constellationNodes = [];
let _constellationHover = null;
let _constellationWired = false;

function renderConstellation() {
  const canvas = el('constellationCanvas');
  const empty = el('constellationEmpty');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const history = STATE.lessonHistory || [];
  if (!history.length) {
    if (empty) empty.style.display = 'block';
    const sC = el('constellationStarCount'), lC = el('constellationLinkCount');
    if (sC) sC.textContent = '0';
    if (lC) lC.textContent = '0';
    return;
  }
  if (empty) empty.style.display = 'none';

  // Extract unique topics
  const seen = new Set();
  const nodes = [];
  history.forEach((h, idx) => {
    const key = (h.topic || '').trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      nodes.push({
        topic: h.topic,
        diff: h.diff || 'Intermediate',
        xp: h.xp || 80,
        origIdx: idx
      });
    }
  });

  const cx = W / 2, cy = H / 2;
  nodes.forEach((node, i) => {
    if (i === 0) {
      node.x = cx;
      node.y = cy;
    } else {
      const angle = i * 2.39996;
      const r = Math.min(cx - 90, Math.min(cy - 60, 48 * Math.sqrt(i) + 45));
      node.x = cx + Math.cos(angle) * r;
      node.y = cy + Math.sin(angle) * (r * 0.78);
    }
    node.radius = 10 + Math.min(6, (node.xp || 80) / 25);
  });

  _constellationNodes = nodes;

  // Draw connections between sequential nodes
  ctx.save();
  let linkCount = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(88, 214, 141, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    linkCount++;
  }
  ctx.restore();

  const starCountEl = el('constellationStarCount');
  const linkCountEl = el('constellationLinkCount');
  if (starCountEl) starCountEl.textContent = nodes.length;
  if (linkCountEl) linkCountEl.textContent = linkCount;

  // Draw nodes
  nodes.forEach(node => {
    const isHover = _constellationHover === node;
    const colorMap = { Beginner: '#58d68d', Intermediate: '#f4c542', Advanced: '#ef4444' };
    const starColor = colorMap[node.diff] || '#58d68d';

    // Outer glow
    ctx.save();
    const g = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, node.radius * (isHover ? 2.5 : 1.8));
    g.addColorStop(0, starColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius * (isHover ? 2.5 : 1.8), 0, Math.PI * 2);
    ctx.fill();

    // Star core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(node.x, node.y, isHover ? node.radius * 0.65 : node.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.font = `600 ${isHover ? 13 : 11}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = isHover ? '#ffffff' : '#e0d7cd';
    ctx.textAlign = 'center';
    ctx.fillText(node.topic, node.x, node.y + node.radius + 14);

    if (isHover) {
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = starColor;
      ctx.fillText(`${node.diff} • +${node.xp} XP (Click to open)`, node.x, node.y + node.radius + 28);
    }
    ctx.restore();
  });

  // Wire mouse events once
  if (!_constellationWired) {
    _constellationWired = true;
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      let found = null;
      for (const node of _constellationNodes) {
        if (Math.hypot(mx - node.x, my - node.y) <= node.radius + 14) {
          found = node;
          break;
        }
      }
      if (found !== _constellationHover) {
        _constellationHover = found;
        canvas.style.cursor = found ? 'pointer' : 'crosshair';
        renderConstellation();
      }
    });

    canvas.addEventListener('click', () => {
      if (_constellationHover) {
        const histItem = STATE.lessonHistory[_constellationHover.origIdx];
        sound('click');
        closeModal('constellationOverlay');
        loadHistoryLesson(histItem);
      }
    });
  }
}

/* ══ 19. BADGES MODAL ══════════════════════════════════════════ */
function renderBadges() {
  el('badgesGrid').innerHTML=BADGES.map(b=>{
    const e=STATE.earnedBadges.includes(b.id);
    return `<div class="badge-cell ${e?'earned':'locked'}" title="${b.desc}">
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
    </div>`;
  }).join('');
}

/* ══ 19. LEADERBOARD ══════════════════════════════════════════ */
function renderLeaderboard() {
  const sess=JSON.parse(localStorage.getItem('pb_sessions')||'[]');
  const you={name:STATE.playerName,xp:STATE.totalXP,isYou:true};
  const all=[...sess.filter(s=>s.name!==STATE.playerName),you].sort((a,b)=>b.xp-a.xp).slice(0,10);
  const rc=['gold','silver','bronze'];
  el('lbList').innerHTML=all.map((s,i)=>`
    <div class="lb-row${s.isYou?' you':''}">
      <span class="lb-rank ${rc[i]||''}">${['🥇','🥈','🥉'][i]||(i+1)}</span>
      <span class="lb-name">${esc(s.name)}${s.isYou?' (You)':''}</span>
      <span class="lb-xp">${s.xp} XP</span>
    </div>`).join('');
  const rank=all.findIndex(s=>s.isYou)+1;
  el('lbYourRank').textContent=`Your rank: #${rank} · ${STATE.totalXP} XP`;
  localStorage.setItem('pb_sessions',JSON.stringify(all.map(s=>({name:s.name,xp:s.xp}))));
}

/* ══ 20. ERROR & UI STATE ══════════════════════════════════════ */
function showError(msg) {
  el('errText').textContent    = msg||'Professor Byte couldn\'t connect.';
  el('boardError').style.display='flex';
  el('boardIdle').style.display='none';
}
function hideError() { el('boardError').style.display='none'; }

function setUIState(s) {
  const tb=el('teachBtn'), ab=el('askBtn');
  switch(s) {
    case 'idle':
      el('boardControls').style.display='none'; if(tb)tb.disabled=false; break;
    case 'loading':
      el('boardControls').style.display='none'; el('askBar').style.display='none';
      if(tb)tb.disabled=true; if(ab)ab.disabled=true; break;
    case 'writing':
      el('boardControls').style.display='flex'; if(tb)tb.disabled=true;
      el('pauseBtn').textContent='⏸ Pause'; break;
    case 'done':
      el('boardControls').style.display='flex';
      if(tb)tb.disabled=false; if(ab)ab.disabled=false; break;
  }
}

/* ══ 21. SOUND ENGINE (lazy init) ═════════════════════════════ */
let _noiseBuf = null;
function getChalkNoise(ctx) {
  if (_noiseBuf) return _noiseBuf;
  const len = Math.floor(ctx.sampleRate * 0.05);
  _noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = _noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  return _noiseBuf;
}

window.playChalkSound = function() {
  if (!STATE.soundOn) return;
  const ctx = initAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  try {
    const src = ctx.createBufferSource();
    src.buffer = getChalkNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1900 + Math.random() * 1100, now);
    filter.Q.setValueAtTime(2.8, now);

    const gain = ctx.createGain();
    const vol = 0.028 * (0.75 + Math.random() * 0.5);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.045);
  } catch {}
};

window.playEraserSound = function() {
  if (!STATE.soundOn) return;
  const ctx = initAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  try {
    const src = ctx.createBufferSource();
    src.buffer = getChalkNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(550, now);
    filter.frequency.exponentialRampToValueAtTime(250, now + 0.16);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.16);
  } catch {}
};

function initAudio() {
  if (_audioCtx) return _audioCtx;
  try { _audioCtx=new(window.AudioContext||window.webkitAudioContext)(); } catch{}
  return _audioCtx;
}

function sound(type) {
  if (!STATE.soundOn||!_audioCtx) return;
  const ctx=_audioCtx, now=ctx.currentTime;
  const beep=(f,t,vol=0.1,wave='sine',dur=0.3)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type=wave; o.frequency.setValueAtTime(f,now+t);
    g.gain.setValueAtTime(vol,now+t);
    g.gain.exponentialRampToValueAtTime(0.001,now+t+dur);
    o.start(now+t); o.stop(now+t+dur);
  };
  switch(type) {
    case 'start':
      beep(440,0,.08,'sine',.15); beep(554,0.1,.08,'sine',.15); break;
    case 'correct':
      beep(523,0,.12,'sine',.12); beep(659,0.1,.12,'sine',.18); break;
    case 'wrong':
      beep(200,0,.07,'square',.22); break;
    case 'complete':
      beep(523,0,.1); beep(659,.12,.1); beep(784,.24,.1); break;
    case 'perfect':
      [523,659,784,1046].forEach((f,i)=>beep(f,i*.1,.09,'sine',.3)); break;
    case 'levelup':
      [261,329,392,523].forEach((f,i)=>beep(f,i*.12,.13,'sine',.25)); break;
    case 'badge':
      beep(880,0,.09,'triangle',.12); beep(1108,.08,.09,'triangle',.15); break;
    case 'combo':
      beep(659,0,.1,'sine',.1); beep(784,.08,.1,'sine',.1); beep(1046,.16,.13,'sine',.2); break;
    case 'error':
      beep(150,0,.07,'sawtooth',.25); break;
    case 'checkpoint':
      beep(440,0,.1,'sine',.4); break;
    case 'xp':
      beep(1000,0,.06,'sine',.12); break;
  }
}

/* Module 7: Voice Narration (Web Speech Synthesis API) */
function speak(text) {
  if (!STATE.voiceOn || !window.speechSynthesis || !text) return;
  try {
    window.speechSynthesis.cancel();
    const clean = text.replace(/[^a-zA-Z0-9\s.,?!]/g, ' ');
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.0;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  } catch {}
}

/* ══ 22. CHECKPOINT ════════════════════════════════════════════ */
function showCheckpoint(question,hint) {
  el('cpQuestion').textContent=question;
  el('cpHint').textContent=hint;
  el('cpHint').style.display='none';
  el('cpHintBtn').style.display='block';
  openModal('checkpointOverlay');
  wb.setPaused(true);
  sound('checkpoint');
  showGameNotif('⚑','CHECKPOINT','Think about it…','purple',2000);
}

/* ══ 23. FULLSCREEN ════════════════════════════════════════════ */
let _fs=false;
function toggleFullscreen() {
  _fs=!_fs;
  el('gameLayout').classList.toggle('fullscreen',_fs);
  el('boardFsBtn').textContent = _fs?'⛶ Exit':'⛶ Fullscreen';
  el('fullscreenBtn').textContent=_fs?'⛶ Exit':'⛶';
  if (_fs) {
    el('leftOpenBtn').style.display='flex';
    el('rightOpenHudBtn').style.display='flex';
  } else {
    el('leftOpenBtn').style.display='none';
    el('rightOpenHudBtn').style.display='none';
    el('leftSidebar').classList.remove('collapsed');
    el('rightSidebar').classList.remove('collapsed');
  }
  // Force canvas resize
  setTimeout(()=>wb._resize(),300);
}

/* ══ 24. MISC ══════════════════════════════════════════════════ */
function el(id){return document.getElementById(id);}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function openModal(id){document.getElementById(id)?.classList.add('active');}
function closeModal(id){document.getElementById(id)?.classList.remove('active');}

function showProfMsg(msg) {
  const area=el('achievementArea'); if(!area) return;
  const t=document.createElement('div');
  t.className='achievement-toast';
  t.style.cssText='background:rgba(0,229,160,.08);border-color:rgba(0,229,160,.3)';
  t.innerHTML=`<div class="toast-icon">🎓</div>
    <div class="toast-info">
      <div class="toast-title">Professor Byte</div>
      <div class="toast-desc">${esc(msg)}</div>
    </div>`;
  area.prepend(t);
  setTimeout(()=>t.remove(),5000);
}

function applyTheme(theme) {
  const r=document.documentElement;
  STATE.boardTheme = theme;
  save();
  if (theme==='neon')   { r.style.setProperty('--bg-board','#050f1a'); r.style.setProperty('--chalk-white','#00ff88'); }
  else if(theme==='sunset'){ r.style.setProperty('--bg-board','#1a0f00'); r.style.setProperty('--chalk-white','#ffb347'); }
  else if(theme==='slate'){ r.style.setProperty('--bg-board','#111418'); r.style.setProperty('--chalk-white','#f8fafc'); }
  else if(theme==='whiteboard'){ r.style.setProperty('--bg-board','#f8fafc'); r.style.setProperty('--chalk-white','#0f172a'); }
  else                  { r.style.setProperty('--bg-board','#1a3a2a'); r.style.setProperty('--chalk-white','#f0ece0'); }
}

/* ══ 25. ONBOARDING ════════════════════════════════════════════ */
function setupOnboarding() {
  const ni=el('studentNameInput'), sb=el('startAdventureBtn');
  ni.addEventListener('keydown',e=>{ if(e.key==='Enter') sb.click(); });
  sb.addEventListener('click',()=>{
    initAudio(); // lazy init on first real user gesture
    const name=(ni.value.trim()||'Student');
    STATE.playerName=name; STATE.hasOnboarded=true;
    localStorage.setItem('pb_studentName',name);
    save(); updateHUD();
    closeModal('splashOverlay');
    sound('levelup');
    // Welcome notification
    setTimeout(()=>showGameNotif('🎓','WELCOME!',`Ready to learn, ${name}?`,'green',2500),500);
  });
  const saved=localStorage.getItem('pb_studentName');
  if (STATE.hasOnboarded&&saved) { STATE.playerName=saved; closeModal('splashOverlay'); }
  else ni.focus();
}

/* ══ 26. WIRE EVENTS ═══════════════════════════════════════════ */
function wire() {
  /* Topic input */
  const ti=el('topicInput'), tb=el('teachBtn');
  ti.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();tb.click();} });
  ti.addEventListener('input',()=>{ ti.classList.remove('error'); el('topicError').style.display='none'; });
  tb.addEventListener('click',()=>{ const t=ti.value.trim(); startLesson(t); if(t)ti.value=''; });

  /* Suggestion chips */
  document.querySelectorAll('.sug-chip').forEach(c=>{
    c.addEventListener('click',()=>{ el('topicInput').value=c.dataset.topic||c.textContent; startLesson(c.dataset.topic||c.textContent); });
  });

  /* Ask bar */
  const ai=el('askInput'), ab=el('askBtn');
  ai.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();ab.click();} });
  ab.addEventListener('click',()=>{ const q=ai.value.trim(); if(q) askFollowUp(q); });

  /* Board controls */
  el('pauseBtn').addEventListener('click',()=>{
    const p=!wb._paused; wb.setPaused(p);
    el('pauseBtn').textContent=p?'▶ Resume':'⏸ Pause';
  });
  el('speedBtn').addEventListener('click',()=>{
    const sp=['slow','normal','fast','instant'],ic=['🐢','🚶','🐇','⚡'],lb=['Slow','Normal','Fast','Instant'];
    const n=(sp.indexOf(STATE.writeSpeed)+1)%sp.length;
    STATE.writeSpeed=sp[n]; wb.setSpeed(STATE.writeSpeed);
    el('speedBtn').textContent=`${ic[n]} ${lb[n]}`; save();
    if(sp[n]==='fast'||sp[n]==='instant') showGameNotif('🚀','TURBO MODE!','Writing at max speed','orange',1500);
  });
  el('clearBtn').addEventListener('click',()=>{
    wb.clear(); interactionId=null;
    el('boardIdle').style.display='flex';
    el('boardIdle').querySelector('.idle-text').textContent='Professor Byte is ready to teach!';
    el('boardIdle').querySelector('.idle-sub').textContent='Type a topic and press ▶ to start';
    el('boardError').style.display='none';
    el('lessonMeta').style.display='none';
    el('askBar').style.display='none';
    el('boardControls').style.display='none';
    setUIState('idle'); el('topicInput').focus();
  });
  el('screenshotBtn').addEventListener('click',()=>wb.saveAsImage(el('metaTopic')?.textContent));
  el('exportHtmlBtn')?.addEventListener('click', () => {
    const topic = lastTopic || 'Lesson';
    const fact = el('factText')?.textContent || '';
    const dateStr = new Date().toLocaleDateString();
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>SlateMind Lesson — ${esc(topic)}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #1a120b; color: #f0ece0; padding: 30px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
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
  el('boardFsBtn').addEventListener('click',toggleFullscreen);
  el('fullscreenBtn').addEventListener('click',toggleFullscreen);

  /* Sidebar toggles — LEFT */
  el('leftCloseBtn').addEventListener('click',()=>{
    el('leftSidebar').classList.add('collapsed');
    el('leftOpenBtn').style.display='flex';
  });
  el('leftOpenBtn').addEventListener('click',()=>{
    el('leftSidebar').classList.remove('collapsed');
    el('leftOpenBtn').style.display='none';
    setTimeout(()=>wb._resize(),280);
  });

  /* Sidebar toggles — RIGHT */
  el('rightCloseBtn').addEventListener('click',()=>{
    el('rightSidebar').classList.add('collapsed');
    el('rightOpenHudBtn').style.display='flex';
    setTimeout(()=>wb._resize(),280);
  });
  el('rightOpenHudBtn').addEventListener('click',()=>{
    el('rightSidebar').classList.remove('collapsed');
    el('rightOpenHudBtn').style.display='none';
    setTimeout(()=>wb._resize(),280);
  });

  /* Right sidebar tabs */
  document.querySelectorAll('.rs-tab').forEach(t=>{
    t.addEventListener('click',()=>switchRSTab(t.dataset.tab));
  });

  /* Error retry */
  el('errRetryBtn').addEventListener('click',()=>{ hideError(); if(lastTopic)startLesson(lastTopic); });

  /* Quiz */
  el('quizNextBtn').addEventListener('click',nextQ);
  el('retryQuizBtn').addEventListener('click',retryQuiz);
  el('shareProgressCardBtn')?.addEventListener('click', generateProgressCard);

  /* Feynman Explain-It-Back */
  const fInput = el('feynmanInput');
  fInput?.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      el('feynmanSubmitBtn')?.click();
    }
  });

  el('feynmanSubmitBtn')?.addEventListener('click', async () => {
    const input = el('feynmanInput');
    const text = input ? input.value.trim() : '';
    if (!text) {
      if (input) input.focus();
      return;
    }
    const btn = el('feynmanSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Sparring with Professor…';

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: lastTopic || 'Lesson', explanation: text })
      });
      const data = await res.json();
      const score = Number(data.score) || 75;
      const isMaster = score >= 85;

      el('feynmanResult').style.display = 'block';
      el('feynmanScore').textContent = `${score}%`;
      el('feynmanFeedback').textContent = data.feedback || 'Great effort explaining!';

      const badge = el('feynmanBadge');
      if (badge) {
        badge.style.display = 'inline-block';
        badge.className = `feynman-badge-pill ${isMaster ? 'master' : 'sparring'}`;
        badge.textContent = isMaster ? '🏆 Feynman Master Certified' : `🥋 Sparring: ${data.masteryLevel || 'Refining'}`;
      }

      if (data.xpReward) {
        awardXP(data.xpReward, 'feynman');
        el('feynmanXpEarned').textContent = `+${data.xpReward} XP earned!`;
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

      if (isMaster && wb) {
        sound('perfect');
        await wb.appendBlocks([
          { type: 'emphasize', text: `✦ Verified Mastery: ${lastTopic || 'Concept'} (${score}%)`, style: 'box' }
        ]);
        showGameNotif('🎖️', 'FEYNMAN MASTER', `Concept Mastered (${score}%)!`, 'gold', 3000);
      } else {
        sound('complete');
        if (data.chalkCorrection && wb) {
          await wb.appendBlocks([
            { type: 'emphasize', text: `Professor Note: ${data.chalkCorrection}`, style: 'underline' }
          ]);
        }
        showGameNotif('🥋', 'SPARRING ROUND', `${score}% — Teacher note added to board!`, 'purple', 2500);
      }
    } catch (err) {
      el('feynmanResult').style.display = 'block';
      el('feynmanScore').textContent = 'Reviewed!';
      el('feynmanFeedback').textContent = 'Your explanation was reviewed. Keep practicing expressing concepts concisely.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Spar Again ➤';
    }
  });

  /* Global Keyboard Shortcuts (Esc to close modals, Space to pause/resume board) */
  window.addEventListener('keydown', e => {
    // 1. Escape: Close any open modal overlay
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

    // 2. Spacebar: Pause / Resume blackboard writing (ignore when typing in input or textarea)
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
  el('badgesBtn').addEventListener('click',()=>{ renderBadges(); openModal('badgesOverlay'); });
  el('leaderboardBtn').addEventListener('click',()=>{ renderLeaderboard(); openModal('leaderboardOverlay'); });
  el('settingsBtn').addEventListener('click',()=>openModal('settingsOverlay'));

  /* Modals */
  document.querySelectorAll('.modal-close[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
  document.querySelectorAll('.modal-overlay').forEach(o=>{
    o.addEventListener('click',e=>{ if(e.target===o&&o.id!=='splashOverlay')closeModal(o.id); });
  });
  el('luCloseBtn').addEventListener('click',()=>closeModal('levelUpOverlay'));

  /* Checkpoint */
  el('cpHintBtn').addEventListener('click',()=>{ el('cpHint').style.display='block'; el('cpHintBtn').style.display='none'; });
  el('cpContinueBtn').addEventListener('click',()=>{ closeModal('checkpointOverlay'); wb.setPaused(false); });
  window.addEventListener('wb:checkpoint',e=>showCheckpoint(e.detail.question,e.detail.hint));

  /* Settings */
  document.querySelectorAll('.speed-opt').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('.speed-opt').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); STATE.writeSpeed=b.dataset.speed; wb.setSpeed(b.dataset.speed); save();
    });
  });
  el('voiceToggle')?.addEventListener('click', () => {
    STATE.voiceOn = !STATE.voiceOn;
    el('voiceToggle').textContent = STATE.voiceOn ? '🗣️ ON' : '🔇 OFF';
    el('voiceToggle').classList.toggle('off', !STATE.voiceOn);
    save();
    if (STATE.voiceOn) speak('Voice narration enabled.');
  });
  el('soundToggle').addEventListener('click',()=>{
    STATE.soundOn=!STATE.soundOn;
    el('soundToggle').textContent=STATE.soundOn?'🔊 ON':'🔇 OFF';
    el('soundToggle').classList.toggle('off',!STATE.soundOn); save();
  });
  el('changeNameBtn').addEventListener('click',()=>{
    localStorage.removeItem('pb_studentName'); STATE.hasOnboarded=false; save();
    closeModal('settingsOverlay'); openModal('splashOverlay');
    el('studentNameInput').value='';
    setTimeout(()=>el('studentNameInput').focus(),300);
  });
  el('resetProgressBtn').addEventListener('click',()=>{
    if(confirm('Clear ALL local data? This cannot be undone!')) { localStorage.clear(); location.reload(); }
  });

  /* Export / Import Local Data (Module 3: Portable Profile) */
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

  /* Teaching Style Selection */
  document.querySelectorAll('#styleOpts .color-opt').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#styleOpts .color-opt').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      STATE.teachStyle = b.dataset.style;
      save();
      showGameNotif('🎓', 'TEACHING STYLE', `Set to: ${b.textContent}`, 'purple', 1800);
    });
  });
  document.querySelectorAll('.color-opt').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('.color-opt').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); applyTheme(b.dataset.theme);
    });
  });

  /* Chalk tray & eraser */
  document.querySelector('.eraser')?.addEventListener('click',()=>el('clearBtn').click());

  /* Prof avatar */
  el('profAvatar').addEventListener('click',()=>{
    const msgs=['Keep learning — every lesson makes you smarter! 🧠','You\'re doing great! ⚡','Curiosity is the best superpower! 🔍','Every expert was once a beginner. Keep going! 🚀','The more topics you finish, the stronger you get! 🎮'];
    showProfMsg(msgs[Math.floor(Math.random()*msgs.length)]);
    sound('badge');
  });
}

/* ══ 27. INIT ══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  load();
  wb=new Whiteboard('boardCanvas');
  wb.setSpeed(STATE.writeSpeed||'normal');

  // Sync settings UI
  document.querySelectorAll('.speed-opt').forEach(b=>b.classList.toggle('active',b.dataset.speed===STATE.writeSpeed));
  el('soundToggle').textContent=STATE.soundOn?'🔊 ON':'🔇 OFF';
  el('soundToggle').classList.toggle('off',!STATE.soundOn);
  if (STATE.boardTheme) {
    applyTheme(STATE.boardTheme);
    document.querySelectorAll('.color-opt').forEach(b=>b.classList.toggle('active', b.dataset.theme===STATE.boardTheme));
  }

  updateHUD(); renderHistory(); setupDailyChallenge();
  wire(); setupOnboarding();
  setTimeout(updateHUD,400);

  // Daily welcome notification (once per day)
  const today=new Date().toDateString();
  if (STATE.hasOnboarded && STATE.lastStudyDate!==today && STATE.currentStreak>0) {
    setTimeout(()=>showGameNotif('🔥',`${STATE.currentStreak} Day Streak!`,'Keep it alive today!','orange',3000),1500);
  }

  // Register service worker for offline PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  console.log('🎓 SlateMind v2.2 — All systems go!');
});
