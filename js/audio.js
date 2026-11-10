// Procedural audio: no samples. SFX are tiny oscillator/noise patches; music is a 16-step
// sequencer whose pattern, tempo and detune follow the state of the run.
(function () {
  const DH = (window.DH = window.DH || {});
  const A = { muted: false, ready: false };
  let ac, master, sfxBus, musBus, noiseBuf;
  let mode = 'hub', debt = 0, panic = 0, step = 0, nextTime = 0, timer = null;
  const lastPlayed = {};

  A.init = function () {
    if (A.ready) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = A.muted ? 0 : 0.6; master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musBus = ac.createGain(); musBus.gain.value = 0.5; musBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    A.ready = true;
    nextTime = ac.currentTime + 0.1;
    timer = setInterval(schedule, 40);
  };

  A.toggleMute = function () {
    A.muted = !A.muted;
    if (master) master.gain.value = A.muted ? 0 : 0.6;
    return A.muted;
  };

  function tone(type, f0, f1, dur, gain, when, bus, detune) {
    const t = when || ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, gain, freq, q, when, bus, type) {
    const t = when || ac.currentTime;
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf;
    f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus || sfxBus);
    src.start(t, Math.random() * 0.3, dur + 0.02);
  }
  const arp = (notes, gap, type, gain, dur) => notes.forEach((n, i) => tone(type || 'square', n, n, dur || 0.09, gain || 0.05, ac.currentTime + i * gap));

  const SFX = {
    shoot: () => tone('square', 900, 420, 0.05, 0.028),
    shoot2: () => tone('square', 1200, 600, 0.05, 0.025),
    hit: () => noise(0.03, 0.05, 2400, 1),
    tink: () => tone('triangle', 2400, 2000, 0.04, 0.04),
    kill: () => { tone('square', 240, 60, 0.12, 0.06); noise(0.1, 0.07, 900, 0.7); },
    hurt: () => { tone('sawtooth', 180, 50, 0.25, 0.12); noise(0.15, 0.1, 400, 0.6); },
    dash: () => noise(0.12, 0.06, 1800, 2),
    pickup: () => tone('sine', 1300, 1900, 0.06, 0.05),
    eshoot: () => tone('triangle', 320, 200, 0.07, 0.035),
    charge: () => tone('sawtooth', 90, 300, 0.25, 0.06),
    thud: () => { tone('sine', 110, 40, 0.18, 0.14); noise(0.1, 0.06, 200, 0.7); },
    wave: () => arp([330, 262], 0.07, 'square', 0.035),
    door: () => tone('triangle', 160, 320, 0.12, 0.05),
    denied: () => arp([110, 104], 0.09, 'square', 0.06, 0.08),
    clear: () => arp([523, 659, 784, 1047], 0.06, 'square', 0.045, 0.1),
    harden: () => arp([523, 784, 1047, 1319, 1568], 0.05, 'triangle', 0.07, 0.14),
    install: () => { arp([262, 330, 392, 523], 0.05, 'square', 0.05); tone('sine', 90, 45, 0.3, 0.12); },
    buy: () => arp([784, 1047], 0.05, 'triangle', 0.05),
    ui: () => tone('square', 660, 660, 0.03, 0.03),
    pager: () => { for (let i = 0; i < 3; i++) tone('square', 92, 92, 0.07, 0.07, ac.currentTime + i * 0.11); },
    incident: () => { for (let i = 0; i < 4; i++) tone('sawtooth', i % 2 ? 466 : 622, i % 2 ? 466 : 622, 0.14, 0.07, ac.currentTime + i * 0.15); },
    down: () => arp([392, 311, 233, 175], 0.08, 'sawtooth', 0.06, 0.12),
    restore: () => arp([262, 392, 523], 0.06, 'triangle', 0.06, 0.1),
    shield: () => tone('triangle', 1800, 900, 0.15, 0.07),
    flag: () => { tone('sine', 880, 110, 0.4, 0.09); noise(0.3, 0.05, 3000, 0.5); },
    crit: () => tone('square', 1568, 2093, 0.06, 0.04),
    boss: () => { tone('sawtooth', 55, 41, 1.1, 0.16); tone('sawtooth', 58, 43, 1.1, 0.12); noise(0.8, 0.05, 150, 0.5); },
    death: () => { tone('sawtooth', 300, 30, 1.2, 0.14); noise(1.0, 0.1, 500, 0.4); },
    win: () => arp([392, 523, 659, 784, 659, 784, 1047], 0.11, 'square', 0.06, 0.2),
  };
  const MIN_GAP = { shoot: 0.05, shoot2: 0.05, hit: 0.035, kill: 0.04, pickup: 0.03, eshoot: 0.06, tink: 0.05 };

  A.sfx = function (name) {
    if (!A.ready || A.muted || !SFX[name]) return;
    const now = ac.currentTime;
    if (lastPlayed[name] && now - lastPlayed[name] < (MIN_GAP[name] || 0)) return;
    lastPlayed[name] = now;
    SFX[name]();
  };

  // -------------------------------------------------------------- music
  // A minor-ish. Each mode: tempo, bass steps, arp steps (semitones above root, null = rest).
  const _ = null;
  const MODES = {
    hub: { bpm: 84, root: 110, bass: [0, _, _, _, 0, _, _, _, 3, _, _, _, 5, _, _, _], arp: [12, _, 19, _, 15, _, 19, _, 12, _, 20, _, 15, _, 19, _], drums: 0 },
    explore: { bpm: 96, root: 110, bass: [0, _, 0, _, _, _, 0, _, 5, _, 5, _, _, _, 3, _], arp: [_, _, 12, _, _, 15, _, _, 19, _, _, 15, _, _, 12, _], drums: 1 },
    combat: { bpm: 128, root: 110, bass: [0, _, 0, 0, _, 0, _, 0, 3, _, 3, 3, _, 5, _, 7], arp: [12, 15, 19, 15, 12, 15, 19, 24, 15, 19, 22, 19, 17, 20, 24, 20], drums: 2 },
    incident: { bpm: 140, root: 104, bass: [0, 0, _, 0, 6, _, 0, _, 0, 0, _, 0, 6, _, 7, _], arp: [12, _, 18, _, 12, _, 18, _, 13, _, 19, _, 13, _, 18, 24], drums: 2 },
    boss: { bpm: 150, root: 98, bass: [0, 0, 12, 0, 0, 12, 0, 3, 0, 0, 12, 0, 5, 6, 7, 10], arp: [24, 19, 15, 12, 24, 20, 15, 12, 22, 19, 15, 10, 27, 24, 20, 15], drums: 3 },
    quiet: { bpm: 70, root: 110, bass: [0, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], arp: [_, _, _, _, 12, _, _, _, _, _, 15, _, _, _, _, _], drums: 0 },
  };

  A.setState = function (m, debtValue, panicValue) {
    if (MODES[m]) mode = m;
    debt = debtValue || 0;
    panic = panicValue || 0;
  };

  function schedule() {
    if (!A.ready || ac.state !== 'running') return;
    const M = MODES[mode];
    const stepDur = 60 / (M.bpm * (1 + panic * 0.12)) / 4;
    if (nextTime < ac.currentTime - 0.3) nextTime = ac.currentTime + 0.05;
    while (nextTime < ac.currentTime + 0.12) {
      const s = step % 16, t = nextTime;
      const semi = (n) => M.root * Math.pow(2, n / 12);
      // technical debt detunes the band
      const wob = debt > 20 ? (Math.random() - 0.5) * Math.min(90, debt) : 0;
      if (M.bass[s] != null) tone('sawtooth', semi(M.bass[s]) / 2, semi(M.bass[s]) / 2, stepDur * 1.7, 0.09, t, musBus, wob * 0.4);
      if (M.arp[s] != null) tone('square', semi(M.arp[s]), semi(M.arp[s]), stepDur * 0.9, 0.022, t, musBus, wob);
      if (M.drums >= 1 && s % 4 === 2) noise(0.03, 0.035, 7000, 1, t, musBus, 'highpass');
      if (M.drums >= 2) {
        if (s % 4 === 0) tone('sine', 130, 42, 0.12, 0.2, t, musBus);
        if (s % 2 === 1) noise(0.02, 0.025, 8000, 1, t, musBus, 'highpass');
        if (s === 4 || s === 12) noise(0.09, 0.07, 1700, 0.8, t, musBus);
      }
      if (M.drums >= 3 && (s === 7 || s === 10 || s === 15)) tone('sine', 120, 42, 0.1, 0.16, t, musBus);
      if (panic > 0.5 && s % 8 === 0) tone('sine', 70, 50, 0.08, 0.12, t + stepDur * 0.5, musBus);
      nextTime += stepDur;
      step++;
    }
  }

  DH.Audio = A;
})();
