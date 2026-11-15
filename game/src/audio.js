// Synthesised sound effects through WebAudio: no audio files are shipped,
// every sound is built from oscillators and filtered noise at play time.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, slideTo, volume) {
    if (muted || !ensure() || context.state === 'suspended') return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function noise(dur, volume, lowpass) {
    if (muted || !ensure() || context.state === 'suspended') return;
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * dur));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  return {
    shoot() { tone(720, 0.09, 'square', 240, 0.12); },
    explosion(big) {
      noise(big ? 0.5 : 0.28, big ? 0.5 : 0.3, big ? 900 : 1400);
      tone(big ? 140 : 190, big ? 0.4 : 0.25, 'sawtooth', 40, 0.2);
    },
    hit() { tone(160, 0.25, 'sawtooth', 60, 0.3); noise(0.2, 0.25, 800); },
    powerup() { tone(523, 0.1, 'sine', null, 0.2); setTimeout(() => tone(784, 0.14, 'sine', null, 0.2), 90); },
    bomb() { noise(0.9, 0.5, 500); tone(90, 0.8, 'sine', 30, 0.35); },
    wave() { tone(392, 0.12, 'triangle', null, 0.2); setTimeout(() => tone(587, 0.18, 'triangle', null, 0.2), 120); },
    gameOver() { tone(330, 0.3, 'triangle', 220, 0.22); setTimeout(() => tone(220, 0.5, 'triangle', 110, 0.22), 280); },
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };
}
