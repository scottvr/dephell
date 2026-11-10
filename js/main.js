// Boot, input, fixed-step loop, and the glue between the sim, the renderer, the UI and audio.
//   ?seed=HEX   replay a seed        ?bot=1   watch the autoplayer
//   ?shot=NAME  jump to a state for screenshots (title|hub|registry|combat|map|deploy|boss|postmortem|release|help)
(function () {
  const DH = window.DH;
  const S = DH.Sim, UI = DH.UI, Audio = DH.Audio, Render = DH.Render, Bot = DH.Bot;
  const params = new URLSearchParams(location.search);
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('arena');
  let game = null, acc = 0, last = 0, botWait = 0, frozen = false, seedUsed = false;
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 160, y: 96, down: false, used: false, right: false };
  const botMode = params.get('bot') === '1';

  // ------------------------------------------------------------------ persistence
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('dephell.meta') || '{}'); } catch (e) { return {}; } },
    set(m) { try { localStorage.setItem('dephell.meta', JSON.stringify(m)); } catch (e) { /* private mode */ } },
  };
  const meta = () => Object.assign({ runs: 0, wins: 0, best: '' }, store.get());
  function recordEnd(won) {
    const m = meta();
    m.runs++;
    if (won) {
      m.wins++;
      const order = 'DCBAS', g = DH.Reports.build(game).grade;
      if (!m.best || order.indexOf(g) > order.indexOf(m.best)) m.best = g;
    }
    store.set(m);
  }

  // ------------------------------------------------------------------ run lifecycle
  function newRun(seed) {
    Audio.init();
    if (seed == null) {
      seed = params.get('seed') && !seedUsed ? parseInt(params.get('seed'), 16) : (Math.random() * 0xffffffff) >>> 0;
      seedUsed = true;
    }
    game = S.newGame(seed);
    window.DH.game = game;
    UI.setGame(game);
    UI.close();
    drain();
    game.dirty = true;
  }

  function drain() {
    for (const ev of game.events) {
      switch (ev.type) {
        case 'sfx': Audio.sfx(ev.name); break;
        case 'log': UI.log(ev.entry); break;
        case 'banner': UI.banner(ev); break;
        case 'bossintro': UI.bossIntro(ev.boss); break;
        case 'enter': canvas.classList.remove('enter'); void canvas.offsetWidth; canvas.classList.add('enter'); break;
        case 'openRegistry': UI.open('registry'); break;
        case 'deployPrompt': UI.open('deploy'); break;
        case 'death': recordEnd(false); setTimeout(() => { if (game.run.phase === 'lost') UI.open('report'); }, 1500); break;
        case 'win': recordEnd(true); setTimeout(() => { if (game.run.phase === 'won') UI.open('report'); }, 2400); break;
      }
    }
    game.events.length = 0;
  }

  // ------------------------------------------------------------------ input
  function readInput(consume) {
    const inp = { mx: 0, my: 0, fire: false, dash: false, ability: false, interact: false, rollback: false };
    if (keys.has('KeyA')) inp.mx -= 1;
    if (keys.has('KeyD')) inp.mx += 1;
    if (keys.has('KeyW')) inp.my -= 1;
    if (keys.has('KeyS')) inp.my += 1;
    let ax = 0, ay = 0;
    if (keys.has('ArrowLeft')) ax -= 1;
    if (keys.has('ArrowRight')) ax += 1;
    if (keys.has('ArrowUp')) ay -= 1;
    if (keys.has('ArrowDown')) ay += 1;
    if (ax || ay) { inp.aimDir = Math.atan2(ay, ax); inp.fire = true; }
    else if (mouse.used) { inp.aimX = mouse.x; inp.aimY = mouse.y; inp.fire = mouse.down; }
    inp.dash = pressed.has('Space') || pressed.has('ShiftLeft') || pressed.has('ShiftRight');
    inp.ability = pressed.has('KeyQ') || pressed.has('KeyF') || mouse.right;
    inp.interact = pressed.has('KeyE') || pressed.has('Enter');
    inp.rollback = pressed.has('KeyR');
    if (consume) { mouse.right = false; pressed.clear(); } // presses made during hitstop are kept for the next real step
    return inp;
  }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey) return;
    const code = e.code;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) e.preventDefault();
    Audio.init();
    if (code === 'KeyN' && !e.repeat) { Audio.toggleMute(); return; }
    if (UI.mode) { if (!e.repeat || code.startsWith('Arrow')) UI.key(code, e); return; }
    if (e.repeat) { keys.add(code); return; } // a key held through an overlay still counts as held
    if (!game) return;
    if (code === 'Tab' || code === 'KeyM') { UI.open('map'); return; }
    if (code === 'KeyH' || code === 'Escape') { UI.open('help'); return; }
    keys.add(code);
    pressed.add(code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => {
    keys.clear(); mouse.down = false;
    // losing focus pauses: the help screen doubles as the pause screen
    if (game && !UI.mode && !botMode && (game.run.phase === 'run' || game.run.phase === 'boss')) UI.open('help');
  });
  function mousePos(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * S.W;
    mouse.y = ((e.clientY - r.top) / r.height) * S.H;
    mouse.used = true;
  }
  window.addEventListener('mousemove', mousePos);
  canvas.addEventListener('mousedown', (e) => { Audio.init(); mousePos(e); if (e.button === 2) mouse.right = true; else mouse.down = true; });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function fit() {
    const k = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stage.style.transform = `scale(${k})`;
    stage.style.left = Math.round((window.innerWidth - 1280 * k) / 2) + 'px';
    stage.style.top = Math.round((window.innerHeight - 720 * k) / 2) + 'px';
  }
  window.addEventListener('resize', fit);

  // ------------------------------------------------------------------ loop
  const STEP = 1 / 60;
  function musicState() {
    const run = game.run, room = game.room;
    let m = 'explore';
    if (UI.mode === 'title' || UI.mode === 'report' || run.phase === 'lost') m = 'quiet';
    else if (run.phase === 'boss') m = 'boss';
    else if (room.combat && !room.cleared) m = room.incident ? 'incident' : 'combat';
    else if (run.cur === 'app') m = 'hub';
    Audio.setState(m, run.debt, run.stability < 30 && run.phase !== 'won' ? 1 : 0);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const t = now / 1000;
    let dt = Math.min(0.1, t - last);
    last = t;
    if (!game) return;
    if (!UI.mode && !frozen) {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 4) {
        let inp;
        if (botMode && (game.run.phase === 'run' || game.run.phase === 'boss')) {
          if (game.room.cleared && game.run.phase === 'run' && !game.pickups.length) {
            botWait += STEP;
            inp = { mx: 0, my: 0 };
            if (botWait > 0.9) { botWait = 0; Bot.meta(game); }
          } else inp = Bot.input(game);
          pressed.clear();
        } else inp = readInput(!(game.hitstop > 0 || game.intro > 0));
        S.step(game, STEP, inp);
        drain();
        acc -= STEP;
        n++;
        if (UI.mode) break;
      }
      if (n === 4) acc = 0; // slow machine: drop time rather than spiral
    }
    Render.draw(game, t);
    UI.sync(t, dt);
    musicState();
  }

  // ------------------------------------------------------------------ screenshot states
  function fastForward(until, policy, maxSteps) {
    let n = 0;
    const idle = { mx: 0, my: 0 };
    while (n++ < (maxSteps || 200000) && !until(game)) {
      game.events.length = 0;
      if (game.run.phase !== 'run' && game.run.phase !== 'boss') break;
      if (game.room.cleared && game.run.phase === 'run') {
        if (game.pickups.length && n % 2) { S.step(game, STEP, idle); continue; }
        if (!Bot.meta(game, policy)) S.step(game, STEP, idle);
        continue;
      }
      S.step(game, STEP, Bot.input(game));
    }
    for (const e of game.run.log.slice(-12)) UI.log(e);
    game.events.length = 0;
    game.dirty = true;
  }

  function shot(name) {
    const seed = parseInt(params.get('seed') || '2F', 16);
    game = S.newGame(seed);
    window.DH.game = game;
    UI.setGame(game);
    const fighting = (g) => g.room.combat && !g.room.cleared && g.enemies.length >= 3 && g.bullets.length > 2 && g.room.t > 2.5;
    switch (name) {
      case 'title': UI.open('title'); break;
      case 'hub': S.install(game, 0); game.player.x = 190; game.player.y = 80; break;
      case 'registry': UI.open('registry'); break;
      case 'registry2': fastForward((g) => g.run.tick >= 3 && g.run.cur === 'app' && !g.run.offerTaken); UI.open('registry'); break;
      case 'combat': fastForward((g) => g.run.tick >= 4 && fighting(g)); break;
      case 'combat2': fastForward((g) => g.run.tick >= 9 && fighting(g)); break;
      case 'incident': fastForward((g) => g.room.incident && fighting(g), { vet: false }); break;
      case 'map': fastForward((g) => g.run.tick >= 7 && g.room.cleared, { vet: false }); UI.open('map'); break;
      case 'hub2': fastForward((g) => g.run.tick >= 8 && g.room.cleared && g.run.cur === 'app', { vet: false }); break;
      case 'deploy': fastForward((g) => g.run.tick >= 8 && g.room.cleared && g.run.cur === 'app', { vet: false }); UI.open('deploy'); break;
      case 'boss': fastForward((g) => g.run.phase === 'boss' && g.ebullets.length > 12 && g.room.t > 6, { vet: false }); break;
      case 'postmortem': {
        let s = seed;
        while (game.run.phase !== 'lost' && s < seed + 40) { game = S.newGame(s++); window.DH.game = game; UI.setGame(game); game.run.stability = 45; fastForward(() => false, { vet: false }); }
        UI.open('report');
        break;
      }
      case 'release': {
        let s = seed;
        while (game.run.phase !== 'won' && s < seed + 40) { game = S.newGame(s++); window.DH.game = game; UI.setGame(game); fastForward(() => false); }
        UI.open('report');
        break;
      }
      case 'help': UI.open('help'); break;
      case 'zoo': {
        // one of everything, for checking sprites
        S.install(game, 0);
        S.travel(game, 'runtime');
        game.enemies = []; game.room.queue = []; game.room.waves = []; game.marks = [];
        const types = ['bug', 'regression', 'nullptr', 'race', 'deprecated', 'breaking', 'forkbomb', 'leak', 'cycle', 'cycle', 'imposter', 'vconflict'];
        types.forEach((t, i) => { const e = S.spawn(game, t, 44 + (i % 6) * 46, 50 + Math.floor(i / 6) * 50, i === 0); e.hp *= 0.6; if (t === 'race') { e.phased = false; e.st = 'wind'; } });
        game.stats.orbitals = 2; game.stats.duck = 3; game.stats.drones = 1; game.player.drones = [{ x: 150, y: 150 }]; game.player.shield = 1;
        game.player.x = 160; game.player.y = 150; game.player.still = 1;
        for (let i = 0; i < 5; i++) game.pickups.push({ x: 60 + i * 12, y: 160, vx: 0, vy: 0, type: i === 4 ? 'heal' : 'commit', t: 0 });
        game.ebullets.push({ x: 230, y: 150, vx: 0, vy: 0, dmg: 1, r: 2.5, life: 9 }, { x: 245, y: 156, vx: 0, vy: 0, dmg: 1, r: 2.5, life: 9 });
        game.puddles.push({ x: 270, y: 150, r: 12, life: 5, warn: 0, tick: 9, src: 'Memory Leak' });
        break;
      }
    }
    game.events.length = 0;
    frozen = true; // screenshots show the exact state the bot reached
  }

  // ------------------------------------------------------------------ self-test (?selftest=1)
  // Drives the real input -> sim -> event -> UI path without a human. tools/selftest.js reads the result.
  function selftest() {
    const out = [];
    const check = (name, ok, info) => out.push((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  [' + info + ']' : ''));
    const stepWith = (inp, n, until) => { for (let i = 0; i < n; i++) { S.step(game, STEP, inp(i)); drain(); if (until && until()) return i; } return -1; };
    const walkTo = (x, y, until, extra) => stepWith(() => {
      const p = game.player, dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy) || 1;
      return Object.assign({ mx: dx / d, my: dy / d }, extra || {});
    }, 900, until);
    try {
      newRun(0xC0FFEE);
      check('boot: hub, no overlay', game.run.cur === 'app' && !UI.mode);
      walkTo(S.W / 2, 60, () => game.prompt === 'registry');
      check('walk to registry shows prompt', game.prompt === 'registry');
      stepWith(() => ({ mx: 0, my: 0, interact: true }), 2);
      check('E opens registry', UI.mode === 'registry');
      UI.key('ArrowRight', {}); UI.key('Enter', {});
      const pk = DH.Graph.packages(game.run.graph)[0];
      check('enter installs selected package', !!pk && !UI.mode, pk);
      const door = game.room.doors.find((d) => d.to === pk);
      check('hub has a door to the package', !!door);
      walkTo(S.W - 30, door.y, () => Math.abs(game.player.y - door.y) < 3 && game.player.x > S.W - 60);
      stepWith(() => ({ mx: 1, my: 0 }), 300, () => game.run.cur === pk);
      check('walking through the door enters the package room', game.run.cur === pk && game.room.combat);
      stepWith(() => Bot.input(game), 60 * 90, () => game.room.cleared || game.run.phase !== 'run');
      check('room clears, package integrated', game.room.cleared && S.features(game) === 1, 'stability ' + Math.round(game.run.stability));
      stepWith(() => ({ mx: 0, my: 0 }), 90);
      check('tick advanced', game.run.tick === 1 && game.run.ticksLeft === 13);
      UI.open('map');
      check('map opens', UI.mode === 'map' && !!document.getElementById('bigmap'));
      UI.key('ArrowLeft', {}); UI.key('Enter', {});
      check('map: select app + travel', game.run.cur === 'app' && !UI.mode);
      const back = game.room.doors.find((d) => d.to === 'prod');
      walkTo(30, back.y, () => Math.abs(game.player.y - back.y) < 3 && game.player.x < 60);
      stepWith(() => ({ mx: -1, my: 0 }), 300, () => UI.mode === 'deploy');
      check('west door opens deploy prompt (not ready)', UI.mode === 'deploy' && !S.canDeploy(game));
      UI.key('Escape', {});
      UI.open('help'); check('help opens', UI.mode === 'help'); UI.key('Escape', {});
      UI.open('registry'); UI.key('Digit5', {}); UI.key('Escape', {});
      check('registry tool purchase path ran', !UI.mode);
      // force the end states
      game.run.freeze = true; UI.open('deploy'); UI.key('Enter', {});
      check('deploy enters the boss room', game.run.phase === 'boss' && game.room.kind === 'boss');
      stepWith(() => Bot.input(game), 60 * 6);
      check('boss fight runs', game.enemies.some((e) => e.type === 'boss'));
      game.run.stability = 1; game.player.inv = 0;
      stepWith(() => ({ mx: 0, my: 0 }), 60 * 30, () => game.run.phase === 'lost');
      check('death ends the run', game.run.phase === 'lost');
      UI.open('report');
      check('postmortem renders', !!document.querySelector('.report') && document.querySelector('.report h2').textContent === 'POSTMORTEM');
      UI.key('Enter', {});
      check('report ignores an instant Enter', UI.mode === 'report');
      UI.reportAt -= 1000; UI.key('Enter', {});
      check('enter starts a new run', game.run.phase === 'run' && game.run.tick === 0 && !UI.mode);
    } catch (e) { out.push('FAIL exception: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e)); }
    const pre = document.createElement('pre');
    pre.id = 'selftest';
    pre.textContent = out.join('\n');
    document.body.appendChild(pre);
  }

  // ------------------------------------------------------------------ boot
  Render.init(canvas);
  UI.init({ newRun: () => newRun(), meta });
  fit();
  if (params.get('selftest')) selftest();
  else if (params.get('shot')) shot(params.get('shot'));
  else if (botMode) newRun();
  else { game = S.newGame(1); UI.setGame(game); game.events.length = 0; UI.open('title'); }
  requestAnimationFrame(frame);
})();
