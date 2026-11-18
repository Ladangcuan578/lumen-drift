// Every sound is synthesised with WebAudio: no audio files, no network.
// The context is created on the first player gesture (a click or key press),
// and a quiet bass pulse starts with it. M toggles the master gain.
export function createAudio() {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let bassTimer = null;
  let bassStep = 0;
  let muted = false;

  // A minor-key pulse: root, fifth, octave, flat seventh, one note per beat.
  const BASS_LINE = [55, 55, 82.41, 65.41, 55, 55, 98, 82.41];
  const BASS_BEAT = 0.21;

  function ensure() {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.32;
      master.connect(ctx.destination);
      const length = Math.floor(ctx.sampleRate * 0.5);
      noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return true;
  }

  function tone(freq, seconds, type, volume, slideTo) {
    if (!ensure()) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  function noise(seconds, volume, filterFreq) {
    if (!ensure()) return;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
    source.stop(now + seconds + 0.02);
  }

  function startBass() {
    if (bassTimer !== null || !ensure()) return;
    bassTimer = window.setInterval(() => {
      if (muted || !ctx) return;
      const freq = BASS_LINE[bassStep % BASS_LINE.length];
      bassStep += 1;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + BASS_BEAT * 0.95);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + BASS_BEAT);
    }, BASS_BEAT * 1000);
  }

  return {
    get muted() {
      return muted;
    },
    /** Call from a click or key press: builds the context and starts music. */
    unlock() {
      if (ensure()) startBass();
    },
    shoot() {
      tone(920, 0.09, 'square', 0.05, 240);
    },
    explode(big) {
      noise(big ? 0.55 : 0.3, big ? 0.5 : 0.3, big ? 2400 : 1600);
      tone(big ? 120 : 170, big ? 0.4 : 0.25, 'sine', 0.3, 40);
    },
    shard(combo) {
      const base = 660 * Math.pow(1.059, Math.min(combo, 12));
      tone(base, 0.12, 'sine', 0.12);
      tone(base * 1.5, 0.14, 'sine', 0.08);
    },
    power() {
      tone(523, 0.12, 'triangle', 0.14);
      window.setTimeout(() => tone(659, 0.12, 'triangle', 0.14), 70);
      window.setTimeout(() => tone(784, 0.2, 'triangle', 0.16), 140);
    },
    hurt() {
      tone(220, 0.25, 'sawtooth', 0.2, 55);
      noise(0.2, 0.25, 900);
    },
    waveClear() {
      tone(392, 0.15, 'triangle', 0.12);
      window.setTimeout(() => tone(523, 0.22, 'triangle', 0.12), 110);
    },
    over() {
      tone(392, 0.3, 'sawtooth', 0.14, 370);
      window.setTimeout(() => tone(311, 0.3, 'sawtooth', 0.14, 290), 220);
      window.setTimeout(() => tone(233, 0.6, 'sawtooth', 0.16, 110), 440);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.32;
      return muted;
    },
  };
}
