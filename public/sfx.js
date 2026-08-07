// Synthesized Sound Effects (Game Feel) using Web Audio API

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, vol=0.1) {
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

const SFX = {
  click: () => playTone(600, 'sine', 0.1, 0.05),
  ding: () => playTone(880, 'sine', 0.3, 0.1),
  pop: () => {
    playTone(400, 'sine', 0.05, 0.1);
    setTimeout(() => playTone(800, 'sine', 0.05, 0.1), 50);
  },
  levelUp: () => {
    playTone(440, 'square', 0.1, 0.1);
    setTimeout(() => playTone(554, 'square', 0.1, 0.1), 100);
    setTimeout(() => playTone(659, 'square', 0.1, 0.1), 200);
    setTimeout(() => playTone(880, 'square', 0.3, 0.1), 300);
  },
  success: () => {
    playTone(523.25, 'sine', 0.1, 0.1);
    setTimeout(() => playTone(659.25, 'sine', 0.1, 0.1), 100);
    setTimeout(() => playTone(783.99, 'sine', 0.2, 0.1), 200);
  },
  error: () => {
    playTone(300, 'sawtooth', 0.2, 0.1);
    setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.1), 150);
  },
  type: () => playTone(800 + Math.random()*200, 'sine', 0.02, 0.02)
};

window.SFX = SFX;
