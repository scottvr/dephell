(function bootstrapAudio(namespace) {
  // Zero-build procedural audio for Dependency Hell.
  //
  // No asset files: every sound is synthesized with the Web Audio API. The target
  // is "retro arcade energy + office panic + machine-room dread" — an SRE's haunted
  // build server. Exposes DepHell.audio.play(cue) for one-shot SFX and
  // DepHell.audio.setState({...}) for adaptive ambience that reacts to run state.
  //
  // The AudioContext is created lazily and only resumed after a user gesture, so we
  // never fight the browser autoplay policy. Everything degrades to a silent no-op
  // when Web Audio is unavailable.

  const AudioCtor = window.AudioContext || window.webkitAudioContext;

  let ctx = null;
  let master = null;
  let sfxBus = null;
  let comp = null;
  let muted = readStoredMute();
  let started = false;

  // Persistent adaptive-music graph (built once, driven by setState).
  let music = null;
  const state = { stability: 100, debt: 0, incident: null, boss: null, combat: false };

  function readStoredMute() {
    try {
      return window.localStorage.getItem("dephell.muted") === "1";
    } catch (_error) {
      return false;
    }
  }

  function storeMute(value) {
    try {
      window.localStorage.setItem("dephell.muted", value ? "1" : "0");
    } catch (_error) {
      /* ignore private-mode storage failures */
    }
  }

  function ensureContext() {
    if (!AudioCtor) return null;
    if (!ctx) {
      ctx = new AudioCtor();
      // Master limiter keeps the worst-case simultaneous cue sum (boss + incident
      // + combat + hit) from clipping.
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 20;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(comp);
      comp.connect(ctx.destination);
      // Dedicated SFX bus so one-shots share headroom and can be ducked/limited
      // independently of the ambient music bus.
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.9;
      sfxBus.connect(master);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  // Wake the audio graph on the first real user gesture and start ambience.
  function start() {
    if (started) return;
    const context = ensureContext();
    if (!context) return;
    started = true;
    buildMusic();
    applyMusicState();
  }

  function now() {
    return ctx ? ctx.currentTime : 0;
  }

  // --- Synth primitives -----------------------------------------------------

  function envGain(peak, attack, hold, release, destination) {
    const g = ctx.createGain();
    const t = now();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.setValueAtTime(Math.max(0.0002, peak), t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    g.connect(destination || sfxBus || master);
    return { node: g, stop: t + attack + hold + release + 0.02 };
  }

  // Briefly dip the music bus so a hit reads clearly, then restore.
  function duck(depth, ms) {
    if (!music || !ctx) return;
    const t = now();
    const target = musicTarget();
    music.bus.gain.cancelScheduledValues(t);
    music.bus.gain.setTargetAtTime(target * depth, t, 0.02);
    music.bus.gain.setTargetAtTime(target, t + ms / 1000, 0.15);
  }

  // A pitched blip, optionally sweeping between two frequencies.
  function tone(opts) {
    if (!ensureContext() || muted) return;
    const { type = "square", from = 440, to = from, attack = 0.005, hold = 0.03, release = 0.08, peak = 0.2, detune = 0, dest } = opts;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.detune.value = detune;
    const t = now();
    osc.frequency.setValueAtTime(from, t);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + attack + hold + release);
    const env = envGain(peak, attack, hold, release, dest);
    osc.connect(env.node);
    osc.start(t);
    osc.stop(env.stop);
  }

  // Filtered noise burst for percussive / mechanical textures.
  function noise(opts) {
    if (!ensureContext() || muted) return;
    const { duration = 0.12, peak = 0.2, type = "highpass", freq = 1200, q = 0.7, dest } = opts;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const env = envGain(peak, 0.004, duration * 0.4, duration * 0.6, dest);
    src.connect(filter);
    filter.connect(env.node);
    src.start(now());
    src.stop(now() + duration + 0.02);
  }

  function chord(freqs, opts = {}) {
    freqs.forEach((f, i) => tone({ from: f, to: opts.to ? opts.to * (f / freqs[0]) : f, type: opts.type || "sawtooth", attack: opts.attack ?? 0.01, hold: opts.hold ?? 0.16, release: opts.release ?? 0.4, peak: (opts.peak ?? 0.14) / freqs.length, detune: (i - 1) * (opts.spread || 0) }));
  }

  function later(seconds, fn) {
    window.setTimeout(fn, Math.max(0, seconds * 1000));
  }

  // --- Cue library ----------------------------------------------------------

  const cues = {
    // Combat
    swing: () => noise({ duration: 0.09, peak: 0.12, type: "bandpass", freq: 2600, q: 0.8 }),
    hit: () => { tone({ type: "square", from: 320, to: 150, attack: 0.002, hold: 0.02, release: 0.06, peak: 0.16 }); noise({ duration: 0.06, peak: 0.1, freq: 3200 }); },
    enemyDeath: () => { tone({ type: "sawtooth", from: 260, to: 60, attack: 0.004, hold: 0.05, release: 0.18, peak: 0.16 }); noise({ duration: 0.16, peak: 0.09, type: "lowpass", freq: 900 }); },
    playerHit: () => { tone({ type: "square", from: 180, to: 90, attack: 0.002, hold: 0.03, release: 0.14, peak: 0.24 }); noise({ duration: 0.14, peak: 0.14, type: "lowpass", freq: 600 }); duck(0.5, 140); },
    dash: () => noise({ duration: 0.14, peak: 0.08, type: "bandpass", freq: 1800, q: 1.4 }),

    // Systems / graph
    install: () => { tone({ type: "triangle", from: 440, to: 660, attack: 0.01, hold: 0.05, release: 0.12, peak: 0.16 }); later(0.09, () => tone({ type: "triangle", from: 660, to: 880, attack: 0.01, hold: 0.05, release: 0.14, peak: 0.13 })); },
    conflict: () => { tone({ type: "sawtooth", from: 220, to: 233, attack: 0.005, hold: 0.18, release: 0.3, peak: 0.16, detune: 30 }); noise({ duration: 0.3, peak: 0.08, type: "highpass", freq: 2400, q: 2 }); },
    reveal: () => { tone({ type: "sine", from: 900, to: 1500, attack: 0.01, hold: 0.02, release: 0.18, peak: 0.12 }); later(0.06, () => tone({ type: "sine", from: 1400, to: 2000, attack: 0.01, hold: 0.02, release: 0.14, peak: 0.08 })); },
    debtThreshold: () => { tone({ type: "sawtooth", from: 140, to: 132, attack: 0.02, hold: 0.22, release: 0.4, peak: 0.16, detune: 18 }); },
    flag: () => { tone({ type: "square", from: 520, to: 780, attack: 0.006, hold: 0.04, release: 0.1, peak: 0.14 }); },
    flagExpire: () => { tone({ type: "square", from: 620, to: 300, attack: 0.006, hold: 0.03, release: 0.12, peak: 0.1 }); },
    pin: () => { tone({ type: "square", from: 300, to: 300, attack: 0.002, hold: 0.02, release: 0.05, peak: 0.14 }); later(0.05, () => tone({ type: "square", from: 300, to: 300, attack: 0.002, hold: 0.02, release: 0.05, peak: 0.1 })); },

    // UI navigation (five-cue console vocabulary — dry terminal timbres)
    uiMove: () => { tone({ type: "square", from: 660, to: 660, attack: 0.001, hold: 0.012, release: 0.03, peak: 0.06 }); },
    uiConfirm: () => { tone({ type: "triangle", from: 520, to: 780, attack: 0.004, hold: 0.04, release: 0.1, peak: 0.13 }); duck(0.6, 130); },
    uiBack: () => { tone({ type: "triangle", from: 420, to: 240, attack: 0.004, hold: 0.03, release: 0.09, peak: 0.1 }); },
    uiInvalid: () => { tone({ type: "sawtooth", from: 300, to: 90, attack: 0.004, hold: 0.04, release: 0.12, peak: 0.11, detune: 20 }); },

    // Flow
    routeSelect: () => { tone({ type: "triangle", from: 500, to: 750, attack: 0.008, hold: 0.05, release: 0.12, peak: 0.14 }); },
    roomEnter: () => { tone({ type: "sine", from: 300, to: 400, attack: 0.02, hold: 0.06, release: 0.18, peak: 0.1 }); },
    incidentStart: () => { for (let i = 0; i < 3; i += 1) later(i * 0.18, () => tone({ type: "square", from: 720, to: 720, attack: 0.005, hold: 0.06, release: 0.08, peak: 0.16 })); },

    // Boss & end states
    bossIntro: () => { chord([98, 123, 147], { type: "sawtooth", hold: 0.5, release: 1.1, peak: 0.2, spread: 6 }); later(0.5, () => noise({ duration: 0.9, peak: 0.1, type: "lowpass", freq: 500 })); },
    bossEdgeAttack: () => { tone({ type: "sawtooth", from: 1200, to: 200, attack: 0.006, hold: 0.05, release: 0.22, peak: 0.18 }); noise({ duration: 0.2, peak: 0.09, type: "bandpass", freq: 900, q: 3 }); },
    bossHit: () => { tone({ type: "square", from: 200, to: 120, attack: 0.002, hold: 0.03, release: 0.09, peak: 0.14 }); },
    victory: () => { const seq = [523, 659, 784, 1047]; seq.forEach((f, i) => later(i * 0.12, () => tone({ type: "triangle", from: f, to: f, attack: 0.01, hold: 0.08, release: 0.24, peak: 0.16 }))); },
    failure: () => { const seq = [330, 262, 196, 131]; seq.forEach((f, i) => later(i * 0.16, () => tone({ type: "sawtooth", from: f, to: f * 0.98, attack: 0.01, hold: 0.12, release: 0.3, peak: 0.17, detune: 12 }))); later(0.2, () => noise({ duration: 0.8, peak: 0.08, type: "lowpass", freq: 400 })); },
  };

  function play(cue) {
    if (muted || !started) return;
    const fn = cues[cue];
    if (!fn || !ensureContext()) return;
    try {
      fn();
    } catch (_error) {
      /* never let audio break gameplay */
    }
  }

  // --- Adaptive ambience ----------------------------------------------------

  function buildMusic() {
    if (music || !ctx) return;
    const bus = ctx.createGain();
    bus.gain.value = 0.0;
    bus.connect(master);

    // Low detuned drone pad (two saws) for machine-room dread.
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 500;
    padFilter.connect(bus);
    const padA = ctx.createOscillator();
    const padB = ctx.createOscillator();
    padA.type = "sawtooth";
    padB.type = "sawtooth";
    padA.frequency.value = 55;
    padB.frequency.value = 55;
    padB.detune.value = 8;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.5;
    padA.connect(padGain);
    padB.connect(padGain);
    padGain.connect(padFilter);
    padA.start();
    padB.start();

    // Pulse (a soft repeating tick) via an LFO gating a gain node.
    const pulseOsc = ctx.createOscillator();
    pulseOsc.type = "triangle";
    pulseOsc.frequency.value = 220;
    const pulseGain = ctx.createGain();
    pulseGain.gain.value = 0.0;
    const lfo = ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 2.0; // beats per second
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(pulseGain.gain);
    pulseOsc.connect(pulseGain);
    pulseGain.connect(bus);
    pulseOsc.start();
    lfo.start();

    music = { bus, padFilter, padA, padB, padB2: padB, lfo, lfoGain, detune: padB.detune, cutoff: padFilter.frequency, tempo: lfo.frequency };
  }

  function musicTarget() {
    if (muted) return 0;
    if (state.boss) return 0.5;
    if (state.incident) return 0.42;
    return 0.3;
  }

  function applyMusicState() {
    if (!music || !ctx) return;
    const t = now();
    music.bus.gain.setTargetAtTime(musicTarget(), t, 0.6);

    // Rising debt detunes the pad; low stability opens the filter (tension);
    // incidents and boss push the pulse tempo up.
    const detune = 8 + Math.min(40, state.debt * 0.5);
    music.detune.setTargetAtTime(detune, t, 0.8);

    const stabilityTension = 1 - Math.max(0, Math.min(100, state.stability)) / 100;
    const cutoff = 380 + stabilityTension * 900 + (state.incident ? 300 : 0) + (state.boss ? 500 : 0);
    music.cutoff.setTargetAtTime(cutoff, t, 0.8);

    const tempo = state.boss ? 3.4 : state.incident ? 2.9 : state.combat ? 2.2 : 1.6;
    music.tempo.setTargetAtTime(tempo, t, 0.8);
  }

  function setState(patch) {
    Object.assign(state, patch);
    applyMusicState();
  }

  // --- Mute control ---------------------------------------------------------

  function setMuted(value) {
    muted = Boolean(value);
    storeMute(muted);
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.9, now(), 0.05);
    if (!muted) start();
    applyMusicState();
    return muted;
  }

  function toggleMute() {
    return setMuted(!muted);
  }

  function isMuted() {
    return muted;
  }

  namespace.audio = { start, play, setState, setMuted, toggleMute, isMuted };
})(window.DepHell = window.DepHell || {});
