/* ═══════════════════════════════════════════════════════════════
   SlateMind — tour.js
   Interactive Spotlight Product Tour (Automated Demo Walkthrough)
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const TOUR_STEPS = [
  {
    target: '.new-topic-panel',
    title: '1. Topic Launcher & Suggestions',
    desc: 'Type any concept you want to learn (e.g. Quantum Physics, Binary Search, Photosynthesis) or click a suggestion spark to generate an intelligent blackboard lesson.',
    tip: '💡 Tip: Works completely offline with built-in curriculum samples!',
    preferredPlacement: 'right'
  },
  {
    target: '#boardFrame',
    title: '2. The Physical Blackboard Canvas',
    desc: 'Watch Professor Byte teach with organic handwriting chalk strokes, dynamic geometric diagrams, formulas, and real synthesized chalk acoustics.',
    tip: '⌨️ Shortcut: Press Spacebar anytime to pause or resume blackboard writing.',
    preferredPlacement: 'bottom'
  },
  {
    target: '#askBar',
    title: '3. Curiosity Rabbit Holes & Follow-ups',
    desc: 'Click purple Rabbit Hole chips to investigate counter-intuitive paradoxes, or type your own follow-up questions to have the board expand in real time.',
    tip: '🕳️ Rabbit holes dynamically adapt to each topic to keep you engaged.',
    preferredPlacement: 'top'
  },
  {
    target: '#rightSidebar',
    title: '4. Knowledge Lab & Feynman Sparring',
    desc: 'Review key terms, take rapid 3-question quizzes for XP combos, and enter Feynman Sparring rounds to test your understanding against the AI.',
    tip: '🏆 Score 85%+ in Feynman mode to earn a Verified Mastery stamp directly on the blackboard.',
    preferredPlacement: 'left'
  },
  {
    target: '.hud-bar',
    title: '5. Level Progression, Streaks & Constellation',
    desc: 'Track your XP level from Rookie to Professor Byte, maintain daily study streaks, and explore your 🌌 Knowledge Constellation to revisit past concepts.',
    tip: '✨ Click the Constellation star map anytime to see how all your mastered topics connect.',
    preferredPlacement: 'bottom'
  }
];

let _tourActive = false;
let _tourStep = 0;
let _autoPlayTimer = null;
let _isAutoPlaying = true;
const AUTO_PLAY_SECONDS = 6;

function initTourDOM() {
  if (document.getElementById('appTourOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'appTourOverlay';
  overlay.className = 'tour-overlay';
  overlay.innerHTML = `
    <div class="tour-spotlight" id="tourSpotlight"></div>
    <div class="tour-card" id="tourCard">
      <div class="tour-card-header">
        <span class="tour-step-badge" id="tourStepBadge">Step 1 of 5</span>
        <button class="tour-close-btn" id="tourCloseBtn" title="Exit Tour (Esc)">✕</button>
      </div>
      <h3 class="tour-card-title" id="tourTitle">Tour Step Title</h3>
      <p class="tour-card-desc" id="tourDesc">Tour description text goes here.</p>
      <div class="tour-card-tip" id="tourTip">Tip</div>
      
      <div class="tour-card-footer">
        <div class="tour-dots" id="tourDots"></div>
        <div class="tour-actions">
          <button class="tour-btn tour-btn-sec" id="tourAutoBtn">⏸ Pause</button>
          <button class="tour-btn tour-btn-sec" id="tourPrevBtn">◀ Back</button>
          <button class="tour-btn tour-btn-pri" id="tourNextBtn">Next ▶</button>
        </div>
      </div>
      <div class="tour-timer-bar"><div class="tour-timer-fill" id="tourTimerFill"></div></div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Wire buttons
  document.getElementById('tourCloseBtn').addEventListener('click', stopAppTour);
  document.getElementById('tourNextBtn').addEventListener('click', () => {
    pauseAutoPlay();
    nextTourStep();
  });
  document.getElementById('tourPrevBtn').addEventListener('click', () => {
    pauseAutoPlay();
    prevTourStep();
  });
  document.getElementById('tourAutoBtn').addEventListener('click', toggleAutoPlay);

  // Keyboard navigation
  window.addEventListener('keydown', handleTourKey);
  window.addEventListener('resize', handleTourResize);
}

function handleTourKey(e) {
  if (!_tourActive) return;
  if (e.key === 'Escape') {
    stopAppTour();
  } else if (e.key === 'ArrowRight') {
    pauseAutoPlay();
    nextTourStep();
  } else if (e.key === 'ArrowLeft') {
    pauseAutoPlay();
    prevTourStep();
  } else if (e.code === 'Space') {
    e.preventDefault();
    toggleAutoPlay();
  }
}

function handleTourResize() {
  if (!_tourActive) return;
  renderCurrentStep();
}

function startAppTour() {
  initTourDOM();
  // Close any open modals
  document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));

  // Ensure sidebars are expanded for the tour
  const leftSidebar = document.getElementById('leftSidebar');
  const rightSidebar = document.getElementById('rightSidebar');
  if (leftSidebar?.classList.contains('collapsed')) {
    leftSidebar.classList.remove('collapsed');
    const btn = document.getElementById('leftOpenBtn');
    if (btn) btn.style.display = 'none';
  }
  if (rightSidebar?.classList.contains('collapsed')) {
    rightSidebar.classList.remove('collapsed');
    const btn = document.getElementById('rightOpenHudBtn');
    if (btn) btn.style.display = 'none';
  }

  // Make askBar visible during tour if not already
  const askBar = document.getElementById('askBar');
  if (askBar && askBar.style.display === 'none') {
    askBar.style.display = 'block';
    askBar.dataset.tourTempVisible = 'true';
  }

  _tourActive = true;
  _tourStep = 0;
  _isAutoPlaying = true;
  document.getElementById('appTourOverlay').classList.add('active');

  if (window.sound) sound('start');
  renderCurrentStep();
}

function stopAppTour() {
  _tourActive = false;
  clearTimeout(_autoPlayTimer);
  const overlay = document.getElementById('appTourOverlay');
  if (overlay) overlay.classList.remove('active');

  // Re-hide askBar if it was temporarily shown for the tour and lesson isn't completed
  const askBar = document.getElementById('askBar');
  if (askBar && askBar.dataset.tourTempVisible === 'true' && (!window.STATE?.lessonsCompleted)) {
    askBar.style.display = 'none';
    delete askBar.dataset.tourTempVisible;
  }

  if (window.showGameNotif) {
    showGameNotif('🎓', 'TOUR COMPLETE', 'Ready to explore! Start a topic anytime.', 'green', 2500);
  }
}

function toggleAutoPlay() {
  if (_isAutoPlaying) {
    pauseAutoPlay();
  } else {
    _isAutoPlaying = true;
    const btn = document.getElementById('tourAutoBtn');
    if (btn) btn.textContent = '⏸ Pause';
    startStepTimer();
  }
}

function pauseAutoPlay() {
  _isAutoPlaying = false;
  clearTimeout(_autoPlayTimer);
  const btn = document.getElementById('tourAutoBtn');
  if (btn) btn.textContent = '▶ Auto';
  const fill = document.getElementById('tourTimerFill');
  if (fill) {
    fill.style.transition = 'none';
    fill.style.width = '0%';
  }
}

function nextTourStep() {
  if (_tourStep < TOUR_STEPS.length - 1) {
    _tourStep++;
    renderCurrentStep();
  } else {
    stopAppTour();
  }
}

function prevTourStep() {
  if (_tourStep > 0) {
    _tourStep--;
    renderCurrentStep();
  }
}

function renderCurrentStep() {
  const step = TOUR_STEPS[_tourStep];
  const target = document.querySelector(step.target);
  if (!target) {
    nextTourStep();
    return;
  }

  // Scroll into view if needed
  target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Update text
  document.getElementById('tourStepBadge').textContent = `Step ${_tourStep + 1} of ${TOUR_STEPS.length}`;
  document.getElementById('tourTitle').textContent = step.title;
  document.getElementById('tourDesc').textContent = step.desc;
  document.getElementById('tourTip').textContent = step.tip;

  // Dots
  const dotsContainer = document.getElementById('tourDots');
  dotsContainer.innerHTML = TOUR_STEPS.map((_, i) => `
    <span class="tour-dot ${i === _tourStep ? 'active' : ''}"></span>
  `).join('');

  // Buttons
  const prevBtn = document.getElementById('tourPrevBtn');
  const nextBtn = document.getElementById('tourNextBtn');
  prevBtn.disabled = _tourStep === 0;
  nextBtn.textContent = _tourStep === TOUR_STEPS.length - 1 ? 'Finish 🎉' : 'Next ▶';

  // Position Spotlight Cutout
  const rect = target.getBoundingClientRect();
  const spotlight = document.getElementById('tourSpotlight');
  const pad = 8;
  spotlight.style.top = `${Math.max(0, rect.top - pad)}px`;
  spotlight.style.left = `${Math.max(0, rect.left - pad)}px`;
  spotlight.style.width = `${rect.width + pad * 2}px`;
  spotlight.style.height = `${rect.height + pad * 2}px`;

  // Position Tooltip Card
  positionTourCard(rect, step.preferredPlacement);

  // Audio chirp
  if (window.sound) sound('btn');

  // Auto-play timer
  if (_isAutoPlaying) {
    startStepTimer();
  }
}

function positionTourCard(targetRect, placement) {
  const card = document.getElementById('tourCard');
  const cardW = 340;
  const cardH = 220;
  const gap = 16;
  const W = window.innerWidth;
  const H = window.innerHeight;

  let left = 0;
  let top = 0;

  if (placement === 'bottom') {
    top = targetRect.bottom + gap;
    left = targetRect.left + (targetRect.width / 2) - (cardW / 2);
  } else if (placement === 'top') {
    top = targetRect.top - cardH - gap;
    left = targetRect.left + (targetRect.width / 2) - (cardW / 2);
  } else if (placement === 'right') {
    left = targetRect.right + gap;
    top = targetRect.top + 20;
  } else if (placement === 'left') {
    left = targetRect.left - cardW - gap;
    top = targetRect.top + 20;
  }

  // Viewport bounds clamp
  left = Math.max(16, Math.min(W - cardW - 16, left));
  top  = Math.max(16, Math.min(H - cardH - 16, top));

  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

function startStepTimer() {
  clearTimeout(_autoPlayTimer);
  const fill = document.getElementById('tourTimerFill');
  if (fill) {
    fill.style.transition = 'none';
    fill.style.width = '0%';
    void fill.offsetWidth;
    fill.style.transition = `width ${AUTO_PLAY_SECONDS}s linear`;
    fill.style.width = '100%';
  }

  _autoPlayTimer = setTimeout(() => {
    if (_tourActive && _isAutoPlaying) {
      nextTourStep();
    }
  }, AUTO_PLAY_SECONDS * 1000);
}

// Window export
window.startAppTour = startAppTour;
window.stopAppTour = stopAppTour;
