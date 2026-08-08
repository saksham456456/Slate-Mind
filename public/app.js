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

    await wb.renderLesson(data.blocks||[], {
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

  // Show ask bar now that lesson is done
  el('askBar').style.display='block';
  populateAskChips();
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
      <span class="term-word">${t}</span>
      <span class="term-idx">#${i+1}</span>
    </div>`).join('');
  el('glossaryList').style.display='flex';
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
    b.innerHTML=`<span class="opt-letter">${L}</span>${q.options[i]}`;
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

/* ══ 14. HISTORY ═══════════════════════════════════════════════ */
function addToHistory(topic,data) {
  STATE.lessonHistory.unshift({id:Date.now(),topic,diff:data.difficulty||'Intermediate',xp:data.xpReward||80,ts:Date.now()});
  if (STATE.lessonHistory.length>50) STATE.lessonHistory.pop();
  save(); renderHistory();
}

function renderHistory() {
  const c=el('lessonHistory');
  if (!STATE.lessonHistory.length) { c.innerHTML='<div class="history-empty">No lessons yet! 👆</div>'; return; }
  const ico={Beginner:'🟢',Intermediate:'🟡',Advanced:'🔴'};
  c.innerHTML=STATE.lessonHistory.slice(0,20).map((h,i)=>`
    <div class="history-item${i===0?' active':''}" data-topic="${encodeURIComponent(h.topic)}">
      <span class="hi-icon">${ico[h.diff]||'📖'}</span>
      <div class="hi-info">
        <div class="hi-topic">${h.topic}</div>
        <div class="hi-meta">+${h.xp} XP · <span class="hi-diff diff-${h.diff}">${h.diff}</span></div>
      </div>
    </div>`).join('');
  c.querySelectorAll('.history-item').forEach(item=>{
    item.addEventListener('click',()=>{
      const topic=decodeURIComponent(item.dataset.topic);
      el('topicInput').value=topic;
      c.querySelectorAll('.history-item').forEach(i=>i.classList.remove('active'));
      item.classList.add('active');
      el('topicInput').focus();
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

/* ══ 16. ASK CHIPS ════════════════════════════════════════════ */
function populateAskChips() {
  el('askChips').innerHTML=FOLLOW_UP_CHIPS.map(c=>`<button class="ask-chip">${c}</button>`).join('');
  el('askChips').querySelectorAll('.ask-chip').forEach(b=>{
    b.addEventListener('click',()=>{ el('askInput').value=b.textContent; el('askInput').focus(); });
  });
}

/* ══ 17. RIGHT SIDEBAR TABS ════════════════════════════════════ */
function switchRSTab(tab) {
  document.querySelectorAll('.rs-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  document.querySelectorAll('.rs-panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${tab}`));
}

/* ══ 18. BADGES MODAL ══════════════════════════════════════════ */
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
      <span class="lb-name">${s.name}${s.isYou?' (You)':''}</span>
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
      <div class="toast-desc">${msg}</div>
    </div>`;
  area.prepend(t);
  setTimeout(()=>t.remove(),5000);
}

function applyTheme(theme) {
  const r=document.documentElement;
  if (theme==='neon')   { r.style.setProperty('--bg-board','#050f1a'); r.style.setProperty('--chalk-white','#00ff88'); }
  else if(theme==='sunset'){ r.style.setProperty('--bg-board','#1a0f00'); r.style.setProperty('--chalk-white','#ffb347'); }
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
  el('screenshotBtn').addEventListener('click',()=>wb.saveAsImage());
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

  /* HUD buttons */
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
    if(confirm('Reset ALL progress? This cannot be undone!')) { localStorage.clear(); location.reload(); }
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

  updateHUD(); renderHistory(); setupDailyChallenge();
  wire(); setupOnboarding();
  setTimeout(updateHUD,400);

  // Daily welcome notification (once per day)
  const today=new Date().toDateString();
  if (STATE.hasOnboarded && STATE.lastStudyDate!==today && STATE.currentStreak>0) {
    setTimeout(()=>showGameNotif('🔥',`${STATE.currentStreak} Day Streak!`,'Keep it alive today!','orange',3000),1500);
  }

  console.log('🎓 SlateMind v2.2 — All systems go!');
});
