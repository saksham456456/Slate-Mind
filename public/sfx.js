'use strict';

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, vol = 0.1) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, vol = 0.08) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  src.buffer = buf;
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
}

const SFX = {
  // UI clicks
  click: () => playTone(600, 'sine', 0.08, 0.06),

  // Chalk writing on board — short scratch noise
  chalk: () => {
    playNoise(0.04, 0.04);
    playTone(2200 + Math.random() * 400, 'sawtooth', 0.03, 0.02);
  },

  // Lesson starts — dramatic swoosh
  start: () => {
    playTone(220, 'sine', 0.12, 0.07);
    setTimeout(() => playTone(330, 'sine', 0.12, 0.07), 80);
    setTimeout(() => playTone(440, 'sine', 0.18, 0.08), 160);
  },

  // Lesson complete — triumphant fanfare
  complete: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.25, 0.1), i * 110));
    setTimeout(() => playTone(1047, 'triangle', 0.5, 0.08), 480);
  },

  // XP earned — bright coins
  xp: () => {
    playTone(880, 'sine', 0.08, 0.09);
    setTimeout(() => playTone(1108, 'sine', 0.12, 0.09), 70);
  },

  // Level up — epic multi-chord
  levelup: () => {
    const seq = [440, 554, 659, 880, 1108];
    seq.forEach((f, i) => {
      setTimeout(() => playTone(f, 'square', 0.15, 0.12), i * 90);
      setTimeout(() => playTone(f * 1.5, 'sine', 0.1, 0.1), i * 90 + 30);
    });
  },

  // Badge unlocked — magical shimmer
  badge: () => {
    [1200, 1500, 1800, 2100].forEach((f, i) => {
      setTimeout(() => playTone(f, 'sine', 0.18, 0.07), i * 60);
      setTimeout(() => playTone(f * 0.75, 'triangle', 0.1, 0.06), i * 60 + 20);
    });
  },

  // Quiz correct — upbeat ding
  correct: () => {
    playTone(659, 'sine', 0.1, 0.1);
    setTimeout(() => playTone(880, 'sine', 0.18, 0.1), 90);
    setTimeout(() => playTone(1108, 'sine', 0.22, 0.09), 180);
  },

  // Quiz wrong — buzzer
  wrong: () => {
    playTone(220, 'sawtooth', 0.15, 0.1);
    setTimeout(() => playTone(180, 'sawtooth', 0.2, 0.12), 120);
  },

  // Combo — escalating ticks
  combo: () => {
    playTone(1047, 'square', 0.06, 0.1);
    setTimeout(() => playTone(1319, 'square', 0.06, 0.1), 60);
    setTimeout(() => playTone(1568, 'square', 0.08, 0.1), 120);
  },

  // Follow-up question answered
  answer: () => {
    playTone(440, 'triangle', 0.1, 0.08);
    setTimeout(() => playTone(554, 'triangle', 0.14, 0.08), 80);
  },

  // Error / blocked
  error: () => {
    playTone(300, 'sawtooth', 0.18, 0.1);
    setTimeout(() => playTone(240, 'sawtooth', 0.22, 0.12), 140);
  },

  // Streak fire
  streak: () => {
    [440, 523, 622, 740].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.12, 0.08), i * 70));
  },

  // Chalk tap — block separator sound
  tap: () => playTone(900, 'sine', 0.04, 0.05),

  // Milestone pop
  milestone: () => {
    playTone(523, 'sine', 0.1, 0.1);
    setTimeout(() => playTone(784, 'sine', 0.1, 0.1), 100);
    setTimeout(() => playTone(1047, 'sine', 0.2, 0.1), 200);
    setTimeout(() => playTone(1319, 'sine', 0.25, 0.09), 320);
  },

  // Typing in input — subtle tick
  type: () => playTone(800 + Math.random() * 200, 'sine', 0.02, 0.015),

  // Daily challenge unlocked
  daily: () => {
    playTone(330, 'triangle', 0.12, 0.09);
    setTimeout(() => playTone(415, 'triangle', 0.12, 0.09), 100);
    setTimeout(() => playTone(494, 'triangle', 0.18, 0.09), 200);
    setTimeout(() => playTone(659, 'sine', 0.25, 0.09), 320);
  },

  // Screenshot saved
  save: () => {
    playTone(880, 'sine', 0.08, 0.07);
    setTimeout(() => playTone(1108, 'sine', 0.12, 0.07), 80);
    setTimeout(() => playNoise(0.06, 0.03), 160);
  },

  // Perfect quiz score — extra celebratory
  perfect: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      setTimeout(() => playTone(f, 'sine', 0.22, 0.1), i * 90);
      setTimeout(() => playTone(f * 2, 'sine', 0.1, 0.06), i * 90 + 40);
    });
    setTimeout(() => playNoise(0.08, 0.04), 500);
  },

  // Checkpoint pause — thoughtful chime
  checkpoint: () => {
    playTone(440, 'triangle', 0.3, 0.08);
    setTimeout(() => playTone(554, 'triangle', 0.3, 0.07), 200);
    setTimeout(() => playTone(370, 'triangle', 0.4, 0.07), 400);
  }
};

window.SFX = SFX;
