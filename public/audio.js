/* ═══════════════════════════════════════════════════════════════
   SlateMind — audio.js
   Procedural Web Audio API sound effects & chalk acoustics
   ═══════════════════════════════════════════════════════════════ */
'use strict';

let _audioCtx = null;
let _noiseBuf = null;

function initAudio() {
  if (_audioCtx) return _audioCtx;
  try {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch { /* no Web Audio here: the app simply stays silent */ }
  return _audioCtx;
}

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

function playChalkSound() {
  if (!window.STATE?.soundOn) return;
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
  } catch { /* source already stopped */ }
}

function playEraserSound() {
  if (!window.STATE?.soundOn) return;
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
  } catch { /* source already stopped */ }
}

function sound(type) {
  if (!window.STATE?.soundOn) return;
  const ctx = initAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  const beep = (f, t, vol = 0.1, wave = 'sine', dur = 0.3) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = wave;
    o.frequency.setValueAtTime(f, now + t);
    g.gain.setValueAtTime(vol, now + t);
    g.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
    o.start(now + t);
    o.stop(now + t + dur);
  };

  switch (type) {
    case 'btn':
    case 'click':
      beep(620, 0, 0.04, 'sine', 0.06);
      break;
    case 'start':
      beep(440, 0, 0.08, 'sine', 0.15);
      beep(554, 0.1, 0.08, 'sine', 0.15);
      break;
    case 'correct':
      beep(523, 0, 0.12, 'sine', 0.12);
      beep(659, 0.1, 0.12, 'sine', 0.18);
      break;
    case 'wrong':
      beep(200, 0, 0.07, 'square', 0.22);
      break;
    case 'complete':
      beep(523, 0, 0.1);
      beep(659, 0.12, 0.1);
      beep(784, 0.24, 0.1);
      break;
    case 'perfect':
      [523, 659, 784, 1046].forEach((f, i) => beep(f, i * 0.1, 0.09, 'sine', 0.3));
      break;
    case 'levelup':
      [261, 329, 392, 523].forEach((f, i) => beep(f, i * 0.12, 0.13, 'sine', 0.25));
      break;
    case 'badge':
      beep(880, 0, 0.09, 'triangle', 0.12);
      beep(1108, 0.08, 0.09, 'triangle', 0.15);
      break;
    case 'combo':
      beep(659, 0, 0.1, 'sine', 0.1);
      beep(784, 0.08, 0.1, 'sine', 0.1);
      beep(1046, 0.16, 0.13, 'sine', 0.2);
      break;
    case 'error':
      beep(150, 0, 0.07, 'sawtooth', 0.25);
      break;
    case 'checkpoint':
      beep(440, 0, 0.1, 'sine', 0.4);
      break;
    case 'xp':
      beep(1000, 0, 0.06, 'sine', 0.12);
      break;
  }
}

window.initAudio = initAudio;
window.sound = sound;
window.playChalkSound = playChalkSound;
window.playEraserSound = playEraserSound;
