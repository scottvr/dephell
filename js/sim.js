// The simulation: run state, the pager/incident clock, rooms, combat. No DOM in here, so the
// same code runs in the browser and under node (tools/bot-run.js) for headless playtests.
(function () {
  const DH = (window.DH = window.DH || {});
  const { TUNE, BASE_STATS, PACKAGES, ENEMIES, ECO, TOOLS, INCIDENT_TEXT, BOSSES } = DH.content;
  const Graph = DH.Graph;
  const S = {};

  const W = 320, H = 192, TS = 16, COLS = 20, ROWS = 12;
  S.W = W; S.H = H; S.TS = TS; S.COLS = COLS; S.ROWS = ROWS;
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ------------------------------------------------------------------ plumbing
  const emit = (game, type, data) => { game.events.push(Object.assign({ type }, data || {})); };
  const sfx = (game, name) => emit(game, 'sfx', { name });
  const banner = (game, text, sub, kind) => emit(game, 'banner', { text, sub: sub || '', kind: kind || 'info' });

  function log(game, kind, text, data) {
    const run = game.run;
    const entry = Object.assign({ kind, text, tick: run.tick, left: run.ticksLeft, time: run.time }, data || {});
    run.log.push(entry);
    emit(game, 'log', { entry });
    game.dirty = true;
    return entry;
  }

  function floater(game, x, y, text, color) {
    game.floaters.push({ x, y, text, color: color || '#eaffff', life: 0.9, max: 0.9 });
    if (game.floaters.length > 40) game.floaters.shift();
  }

  function burst(game, x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = (speed || 80) * (0.3 + Math.random() * 0.9);
      game.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.25 + Math.random() * 0.35, max: 0.6, color, size: Math.random() < 0.3 ? 2 : 1 });
    }
    if (game.fx.length > 320) game.fx.splice(0, game.fx.length - 320);
  }

  function addDebt(game, amount, why) {
    const run = game.run;
    run.debt = Math.max(0, run.debt + amount);
    if (amount > 0) run.stats.debtBy[why] = (run.stats.debtBy[why] || 0) + amount;
    game.dirty = true;
  }

  S.debtLevel = (run) => Math.floor(run.debt / TUNE.debtPerLevel);
  S.features = (game) => Graph.packages(game.run.graph).filter((p) => Graph.isIntegrated(game.run.graph, p)).length;
  S.nodeName = (game, id) => (game.run.graph.nodes[id] ? game.run.graph.nodes[id].name : id);

  // ------------------------------------------------------------------ new run
  function makePlayer() {
    return {
      x: W / 2, y: H / 2 + 28, r: 5, vx: 0, vy: 0, aim: 0, fireCd: 0, dashCd: 0, dashT: 0, dvx: 0, dvy: 0,
      inv: 0, still: 0, shotCount: 0, echoT: 0, shield: 0, flagCd: 0, regenT: 0, cronT: 0, orbA: 0,
      drones: [], dashHit: null, doorGrace: 0, walk: 0, hurtT: 0,
    };
  }

  S.newGame = function (seed) {
    const run = {
      seed: seed >>> 0, rng: DH.makeRng(seed), tick: 0, ticksLeft: TUNE.ticksTotal, time: 0,
      stability: TUNE.stability, maxStability: TUNE.stability, commits: 3, debt: 0, obsBase: 1,
      graph: Graph.make(), cur: 'app', offers: [], offerTaken: false, restockIn: TUNE.restockEvery,
      pager: { in: TUNE.pagerEvery, target: null }, tools: { pin: 0, container: 0, rollback: 0 },
      shims: {}, log: [], suppressed: {}, degraded: {}, hardened: {}, freeze: false, phase: 'run',
      boss: null, death: null, everInstalled: [],
      stats: { kills: 0, dmgTaken: 0, rooms: 0, incidents: 0, averted: 0, hotfixes: 0, flags: 0, shots: 0,
        dmgBy: {}, debtBy: {}, strikesHeld: 0, strikesLanded: 0, uninstalls: 0, forecastSeen: 0 },
    };
    const game = {
      run, room: null, player: makePlayer(), stats: Object.assign({}, BASE_STATS), enemies: [], bullets: [],
      ebullets: [], pickups: [], puddles: [], fx: [], floaters: [], beams: [], rings: [], marks: [],
      events: [], shake: 0, hitstop: 0, freezeT: 0, intro: 0, t: 0, flowT: 0, flow: null, dirty: true, nextId: 1, prompt: null,
    };
    rollOffers(game);
    log(game, 'start', 'run started: ship v1.0');
    enterNode(game, 'app', null);
    return game;
  };

  function rollOffers(game) {
    const run = game.run;
    const have = new Set(Graph.packages(run.graph));
    const prev = new Set(run.offers);
    let pool = Object.keys(PACKAGES).filter((p) => !have.has(p) && !prev.has(p));
    if (pool.length < 3) pool = Object.keys(PACKAGES).filter((p) => !have.has(p));
    run.offers = run.rng.shuffle(pool).slice(0, 3);
    run.offerTaken = false;
  }

  // ------------------------------------------------------------------ derived state
  function refresh(game) {
    const run = game.run;
    const g = run.graph;
    const s = Object.assign({}, BASE_STATS);
    run.degraded = {};
    run.hardened = {};
    for (const p of Graph.packages(g)) {
      const cause = Graph.downCause(g, p);
      if (cause) { run.degraded[p] = cause; continue; }
      if (run.suppressed[p]) continue;
      const h = Graph.isHardened(g, p);
      run.hardened[p] = h;
      PACKAGES[p].apply(s, h);
    }
    s.obs = clamp(run.obsBase + s.obs, 0, 4);
    game.stats = s;
    const pl = game.player;
    while (pl.drones.length < s.drones) pl.drones.push({ x: pl.x, y: pl.y });
    pl.drones.length = s.drones;
    game.dirty = true;
  }
  S.refresh = refresh;

  // ok | hard | down | conflict
  S.pkgStatus = function (game, p) {
    const run = game.run;
    if (run.degraded[p]) return 'down';
    if (run.suppressed[p]) return 'conflict';
    return run.hardened[p] ? 'hard' : 'ok';
  };

  // ------------------------------------------------------------------ the pager
  function rollPagerTarget(game) {
    const run = game.run;
    const nodes = run.graph.nodes;
    const cands = Object.keys(nodes).filter((id) => {
      const n = nodes[id];
      return n.state === 'unvetted' && !n.pinned && !n.hotfixed && id !== 'app';
    });
    const pick = run.rng.weighted(cands, (id) => (nodes[id].risk + 0.5) * (nodes[id].flag ? 1.5 : 1));
    run.pager.target = pick || null;
    if (pick) banner(game, 'PAGER', game.stats.obs >= 2 ? `${nodes[pick].name} goes down after the next room. Vet it now, or pin it.` : 'Something goes down after the next room. (Observability 2 would say what.)', 'warn');
    if (pick && game.stats.obs >= 2) {
      run.stats.forecastSeen++;
      log(game, 'forecast', `pager forecast: ${nodes[pick].name} looks shaky`, { node: pick });
      sfx(game, 'pager');
    }
  }

  function takeDown(game, id, why) {
    const run = game.run;
    const n = run.graph.nodes[id];
    n.state = 'down';
    n.downTick = run.tick;
    n.downWhy = why;
    refresh(game);
    const hit = Object.keys(run.degraded).filter((p) => run.degraded[p] === id);
    return hit;
  }

  function fireIncident(game) {
    const run = game.run;
    const nodes = run.graph.nodes;
    const id = run.pager.target;
    const n = id && nodes[id];
    if (n && n.state === 'unvetted' && !n.pinned && !n.hotfixed) {
      const why = (INCIDENT_TEXT[n.flag] || INCIDENT_TEXT.none)(n.name);
      const hit = takeDown(game, id, why);
      run.stats.incidents++;
      const names = hit.map((p) => nodes[p].name);
      log(game, 'incident', `INCIDENT: ${why}` + (names.length ? ` -> ${names.join(', ')} OFFLINE` : ''), { node: id, hit });
      banner(game, 'INCIDENT', why + (names.length ? ` — ${names.join(', ')} offline` : ' — nothing depends on it. Yet.'), 'bad');
      sfx(game, 'incident');
      game.shake = Math.max(game.shake, 5);
    } else if (n && (n.state === 'vetted' || n.pinned)) {
      run.stats.averted++;
      run.commits += n.pinned ? 0 : 3;
      log(game, 'averted', `incident averted: ${n.name} held` + (n.pinned ? ' (pinned)' : ' (+3 commits)'), { node: id });
      sfx(game, 'restore');
    }
    run.pager.target = null;
    run.pager.in = run.debt >= 50 ? TUNE.pagerEveryInDebt : TUNE.pagerEvery;
  }

  function advanceTick(game) {
    const run = game.run;
    run.tick++;
    run.ticksLeft = Math.max(0, run.ticksLeft - 1);
    const nodes = run.graph.nodes;
    const pins = Object.keys(nodes).filter((id) => nodes[id].pinned).length;
    if (pins) addDebt(game, pins * TUNE.pinDebtPerTick, 'pinned versions');
    if (--run.restockIn <= 0 && run.ticksLeft > 0) {
      rollOffers(game);
      run.restockIn = TUNE.restockEvery;
      log(game, 'restock', 'registry: new packages available');
      emit(game, 'restock');
    }
    run.pager.in--;
    if (run.pager.in <= 0) fireIncident(game);
    if (run.pager.in === 1) rollPagerTarget(game);
    if (run.ticksLeft <= 0 && !run.freeze) {
      run.freeze = true;
      log(game, 'freeze', 'CHANGE FREEZE: the release train is leaving. Report to app.');
      banner(game, 'CHANGE FREEZE', 'The release train is leaving. Return to app and deploy.', 'warn');
      sfx(game, 'incident');
    }
  }

  // ------------------------------------------------------------------ meta actions (registry / map)
  const roomIdle = (game) => game.room.cleared && game.run.phase === 'run';

  S.install = function (game, idx) {
    const run = game.run;
    const id = run.offers[idx];
    if (!id || run.offerTaken || run.cur !== 'app' || run.freeze || run.phase !== 'run') return false;
    const g = run.graph;
    const pv = Graph.preview(g, id);
    const added = Graph.addPackage(g, id, run.tick);
    run.offerTaken = true;
    run.everInstalled.push(id);
    const def = PACKAGES[id];
    if (def.debt) addDebt(game, def.debt, def.name);
    log(game, 'install', `installed ${def.name}: +${added.length} node${added.length === 1 ? '' : 's'}`, { pkg: id, added });
    for (const c of pv.conflicts) {
      const other = c.pkgs.map((p) => g.nodes[p].name).join(', ');
      log(game, 'conflict', `VERSION CONFLICT: ${c.mine} vs ${c.theirs} (${def.name} vs ${other})`, { lib: c.lib, pkg: id });
      banner(game, 'VERSION CONFLICT', `${c.mine} vs ${c.theirs}: one side fails to load each fight`, 'bad');
    }
    for (const c of pv.coupled) {
      if (c.pkgs.length) log(game, 'coupled', `${def.name} now shares ${g.nodes[c.id].name} with ${c.pkgs.map((p) => g.nodes[p].name).join(', ')}`, { node: c.id, pkg: id });
    }
    if (!pv.conflicts.length) banner(game, 'INSTALLED ' + def.name.toUpperCase(), `${def.power.split('  ')[0]} online  ·  +${added.length} room${added.length === 1 ? '' : 's'} added to the dungeon`, 'info');
    game.room.doors = buildDoors(g, run.cur);
    refresh(game);
    emit(game, 'installed', { id, added });
    sfx(game, 'install');
    game.shake = Math.max(game.shake, 3);
    return true;
  };

  S.uninstall = function (game, pkgId) {
    const run = game.run;
    const g = run.graph;
    if (run.cur !== 'app' || !roomIdle(game) || !g.nodes[pkgId] || g.nodes[pkgId].kind !== 'pkg') return false;
    const name = g.nodes[pkgId].name;
    const removed = Graph.removePackage(g, pkgId);
    for (const lib of Object.keys(run.shims)) {
      if (!Graph.conflicts(g, null).some((c) => c.lib === lib)) delete run.shims[lib];
    }
    if (run.pager.target && !g.nodes[run.pager.target]) run.pager.target = null;
    run.stats.uninstalls++;
    delete run.suppressed[pkgId];
    log(game, 'uninstall', `uninstalled ${name}: -${removed.length} node${removed.length === 1 ? '' : 's'}`, { pkg: pkgId, removed });
    game.room.doors = buildDoors(g, run.cur);
    refresh(game);
    sfx(game, 'down');
    return true;
  };

  S.buyTool = function (game, toolId) {
    const run = game.run;
    const tool = TOOLS.find((t) => t.id === toolId);
    if (!tool || run.commits < tool.cost || run.cur !== 'app' || run.phase !== 'run') return false;
    const g = run.graph;
    switch (toolId) {
      case 'drink':
        if (run.stability >= run.maxStability) return false;
        run.stability = Math.min(run.maxStability, run.stability + 25);
        addDebt(game, 2, 'energy drinks');
        break;
      case 'tests':
        if (run.obsBase >= 3) return false;
        run.obsBase++;
        break;
      case 'shim': {
        const c = Graph.activeConflicts(g, run.shims)[0];
        if (!c) return false;
        run.shims[c.lib] = true;
        addDebt(game, TUNE.shimDebt, 'compat shims');
        log(game, 'shim', `shimmed ${c.lib}: ${c.a} and ${c.b} now pretend to agree`, { lib: c.lib });
        break;
      }
      case 'pin': run.tools.pin++; break;
      case 'container': run.tools.container++; break;
      case 'rollback': run.tools.rollback++; break;
      case 'refactor':
        if (run.debt <= 0) return false;
        addDebt(game, -20, '');
        log(game, 'refactor', 'refactored: -20 debt');
        break;
      case 'reroll':
        if (run.offerTaken || run.freeze) return false;
        rollOffers(game);
        break;
      default: return false;
    }
    run.commits -= tool.cost;
    if (toolId !== 'shim' && toolId !== 'refactor') log(game, 'tool', `bought ${tool.name}`, { tool: toolId });
    refresh(game);
    sfx(game, 'buy');
    return true;
  };

  S.canTravel = function (game, id) {
    const run = game.run;
    const n = run.graph.nodes[id];
    if (!n || !roomIdle(game) || id === run.cur) return false;
    if (run.freeze && n.state !== 'vetted') return false;
    return Graph.enterable(run.graph, id);
  };
  S.travel = function (game, id) {
    if (!S.canTravel(game, id)) return false;
    enterNode(game, id, null);
    return true;
  };

  S.hotfix = function (game, id) {
    const run = game.run;
    const n = run.graph.nodes[id];
    if (!n || n.state !== 'down' || run.commits < TUNE.hotfixCommits || !roomIdle(game)) return false;
    run.commits -= TUNE.hotfixCommits;
    n.state = 'unvetted';
    n.hotfixed = true;
    run.stats.hotfixes++;
    addDebt(game, TUNE.hotfixDebt, 'hotfixes');
    log(game, 'hotfix', `hotfixed ${n.name} from the map screen (+${TUNE.hotfixDebt} debt)`, { node: id });
    refresh(game);
    sfx(game, 'restore');
    return true;
  };

  S.pin = function (game, id) {
    const run = game.run;
    const n = run.graph.nodes[id];
    if (!n || run.tools.pin < 1 || n.state !== 'unvetted' || n.pinned || id === 'app') return false;
    run.tools.pin--;
    n.pinned = true;
    log(game, 'pin', `pinned ${n.name}: the pager will skip it; prod will not`, { node: id });
    sfx(game, 'buy');
    game.dirty = true;
    return true;
  };

  S.contain = function (game, id) {
    const run = game.run;
    const n = run.graph.nodes[id];
    if (!n || run.tools.container < 1 || n.contained || id === 'app' || n.kind === 'pkg') return false;
    run.tools.container--;
    n.contained = true;
    log(game, 'contain', `containerized ${n.name}: its outages no longer cascade`, { node: id });
    refresh(game);
    sfx(game, 'buy');
    return true;
  };

  S.rollback = function (game) {
    const run = game.run;
    if (run.tools.rollback < 1 || (run.phase !== 'run' && run.phase !== 'boss')) return false;
    const nodes = run.graph.nodes;
    const downs = Object.keys(nodes).filter((id) => nodes[id].state === 'down');
    if (!downs.length && run.stability >= run.maxStability) return false;
    run.tools.rollback--;
    for (const id of downs) { nodes[id].state = 'unvetted'; nodes[id].hotfixed = true; }
    run.stability = Math.min(run.maxStability, run.stability + 25);
    log(game, 'rollback', `ROLLBACK: restored ${downs.length} node${downs.length === 1 ? '' : 's'}, +25 stability`, { nodes: downs });
    banner(game, 'ROLLBACK', downs.length ? downs.map((d) => nodes[d].name).join(', ') + ' restored' : 'stability restored', 'good');
    if (game.room.id !== 'prod' && nodes[game.room.id] && game.room.incident) { /* fight continues; node is up */ }
    refresh(game);
    sfx(game, 'restore');
    return true;
  };

  S.canDeploy = (game) => game.run.phase === 'run' && game.run.cur === 'app' && (game.run.freeze || S.features(game) >= TUNE.featuresNeeded);

  // What prod will do to you. Shown on the deploy confirm (detail scales with observability).
  S.bossPlan = function (game) {
    const run = game.run;
    const g = run.graph;
    const nodes = g.nodes;
    const ids = Object.keys(nodes).filter((id) => id !== 'app');
    const weak = ids.filter((id) => nodes[id].state === 'unvetted')
      .sort((a, b) => nodes[b].risk - nodes[a].risk || Graph.dependents(g, b).size - Graph.dependents(g, a).size)
      .slice(0, 6)
      .map((id) => ({ node: id, why: nodes[id].pinned ? 'forced major upgrade' : nodes[id].hotfixed ? 'hotfix peels off' : 'never vetted' }));
    const shims = Object.keys(run.shims).map((lib) => ({ shim: lib, why: 'shim breaks under load' }));
    const probes = ids.filter((id) => nodes[id].state === 'vetted' && nodes[id].risk >= 2).slice(0, 3).map((id) => ({ node: id, why: 'probe' }));
    const strikes = [];
    const real = weak.concat(shims);
    let pi = 0;
    for (let i = 0; i < real.length; i++) {
      strikes.push(real[i]);
      if (i % 2 === 1 && pi < probes.length) strikes.push(probes[pi++]);
    }
    while (pi < probes.length) strikes.push(probes[pi++]);
    strikes.forEach((s, i) => { s.at = 0.9 - (i * 0.78) / Math.max(1, strikes.length); s.state = 'pending'; });

    const pk = Graph.packages(g);
    const cve = ids.filter((id) => nodes[id].flag === 'cve' && nodes[id].state !== 'vetted').length;
    const pinsN = ids.filter((id) => nodes[id].pinned).length;
    const score = {
      rewrite: run.debt / 25,
      breach: cve * 2,
      major: pinsN * 2 + (pk.includes('legacy-auth') ? 1 : 0),
      monolith: ids.length / 8 + (pk.includes('micro-everything') ? 1 : 0) + (pk.includes('enterprise-bus') ? 1 : 0) - 1,
      unknown: game.stats.obs === 0 ? 9 : 0,
      friday: 1.3,
    };
    const variant = Object.keys(score).sort((a, b) => score[b] - score[a])[0];
    const missing = Math.max(0, TUNE.featuresNeeded - S.features(game));
    return { variant, name: BOSSES[variant].name, why: BOSSES[variant].why, color: BOSSES[variant].color, strikes, missing, weak: weak.length, down: ids.filter((id) => nodes[id].state === 'down').length };
  };

  S.deploy = function (game) {
    if (!S.canDeploy(game)) return false;
    const run = game.run;
    run.boss = S.bossPlan(game);
    run.boss.startTime = run.time;
    run.phase = 'boss';
    if (run.boss.missing) addDebt(game, 10 * run.boss.missing, 'unshipped features');
    log(game, 'deploy', `DEPLOY: v1.0 to production. ${run.boss.name} is waiting. ${run.boss.why}`, { boss: run.boss.variant });
    enterBoss(game);
    return true;
  };

  // ------------------------------------------------------------------ rooms
  const TEMPLATES = [
    [],
    [[5, 3, 1, 1], [14, 3, 1, 1], [5, 8, 1, 1], [14, 8, 1, 1]],
    [[9, 5, 2, 2]],
    [[6, 3, 8, 1], [6, 8, 8, 1]],
    [[6, 2, 1, 3], [6, 7, 1, 3], [13, 2, 1, 3], [13, 7, 1, 3]],
    [[4, 2, 1, 1], [15, 2, 1, 1], [4, 9, 1, 1], [15, 9, 1, 1], [8, 5, 1, 2], [11, 5, 1, 2]],
    [[9, 3, 2, 1], [9, 8, 2, 1], [5, 5, 1, 2], [14, 5, 1, 2]],
    [[4, 4, 2, 1], [14, 4, 2, 1], [4, 7, 2, 1], [14, 7, 2, 1], [9, 5, 2, 2]],
  ];


  function buildDoors(g, id) {
    const n = g.nodes[id];
    const doors = [];
    const side = (ids, s) => {
      const sorted = ids.slice().sort((a, b) => (a === 'prod' ? -1 : b === 'prod' ? 1 : g.nodes[a].ly - g.nodes[b].ly));
      sorted.forEach((to, i) => {
        doors.push({ side: s, to, y: Math.round(22 + ((H - 44) * (i + 0.5)) / sorted.length) });
      });
    };
    side(id === 'app' ? ['prod'] : n.parents, 'W');
    side(n.deps, 'E');
    return doors;
  }
  S.buildDoors = buildDoors;

  const solidAt = (room, tx, ty) => tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || room.tiles[ty * COLS + tx] === 1 || room.tiles[ty * COLS + tx] === 2;
  function collides(room, x, y, r) {
    const x0 = Math.floor((x - r) / TS), x1 = Math.floor((x + r) / TS);
    const y0 = Math.floor((y - r) / TS), y1 = Math.floor((y + r) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidAt(room, tx, ty)) return true;
    return false;
  }
  function moveCircle(room, o, dx, dy) {
    let hit = 0;
    const r = o.r * 0.8;
    o.x += dx;
    if (collides(room, o.x, o.y, r)) { o.x -= dx; hit |= 1; }
    o.y += dy;
    if (collides(room, o.x, o.y, r)) { o.y -= dy; hit |= 2; }
    return hit;
  }

  // Breadth-first distance field from a point: enemies walk "downhill" to route around racks.
  function flowField(room, x, y) {
    const f = new Int16Array(COLS * ROWS).fill(-1);
    const sx = clamp(Math.floor(x / TS), 1, COLS - 2), sy = clamp(Math.floor(y / TS), 1, ROWS - 2);
    const q = [sy * COLS + sx];
    f[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], cx = c % COLS, cy = (c / COLS) | 0;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + ox, ny = cy + oy;
        if (solidAt(room, nx, ny)) continue;
        const n = ny * COLS + nx;
        if (f[n] !== -1) continue;
        f[n] = f[c] + 1;
        q.push(n);
      }
    }
    return f;
  }
  S.flowField = flowField;

  function los(room, x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.ceil(d / 7);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (solidAt(room, Math.floor((x1 + (x2 - x1) * t) / TS), Math.floor((y1 + (y2 - y1) * t) / TS))) return false;
    }
    return true;
  }
  S.los = los;

  // Direction that follows the flow field from (x,y); null if already adjacent/unknown.
  function flowDir(room, f, x, y) {
    const cx = Math.floor(x / TS), cy = Math.floor(y / TS);
    let best = f[cy * COLS + cx], bx = 0, by = 0;
    if (best < 0) best = 9999;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const nx = cx + ox, ny = cy + oy;
      if (solidAt(room, nx, ny)) continue;
      if (ox && oy && (solidAt(room, cx + ox, cy) || solidAt(room, cx, cy + oy))) continue; // no corner cutting
      const v = f[ny * COLS + nx];
      if (v >= 0 && v < best) { best = v; bx = nx; by = ny; }
    }
    if (!bx && !by) return null;
    const tx = bx * TS + TS / 2 - x, ty = by * TS + TS / 2 - y;
    const l = Math.hypot(tx, ty) || 1;
    return [tx / l, ty / l];
  }
  S.flowDir = flowDir;

  function makeRoom(id, kind) {
    const tiles = new Uint8Array(COLS * ROWS);
    for (let x = 0; x < COLS; x++) { tiles[x] = 1; tiles[(ROWS - 1) * COLS + x] = 1; }
    for (let y = 0; y < ROWS; y++) { tiles[y * COLS] = 1; tiles[y * COLS + COLS - 1] = 1; }
    return { id, kind, tiles, doors: [], combat: false, cleared: true, waves: [], wave: -1, queue: [], t: 0, spikes: [], incident: false, waveDelay: 0.6, template: 0 };
  }

  function applyTemplate(room, idx) {
    room.template = idx;
    for (const [x, y, w, h] of TEMPLATES[idx]) {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) room.tiles[yy * COLS + xx] = 2;
    }
  }

  function buildRoom(game, id) {
    const run = game.run;
    const g = run.graph;
    const node = g.nodes[id];
    const rng = DH.makeRng(DH.hashStr(id) ^ run.seed ^ (node.state === 'down' ? run.tick * 7919 : 0));
    const room = makeRoom(id, id === 'app' ? 'hub' : 'combat');
    room.doors = buildDoors(g, id);
    if (id === 'app') return room;
    applyTemplate(room, 1 + rng.int(TEMPLATES.length - 1));
    if (node.eco === 'yaml') {
      for (let i = 0; i < 5; i++) {
        const tx = 3 + rng.int(13), ty = 2 + rng.int(8);
        for (let k = 0; k < 2; k++) {
          const idx = ty * COLS + tx + k;
          if (room.tiles[idx] === 0) { room.tiles[idx] = 3; room.spikes.push(idx); }
        }
      }
    }
    if (node.state !== 'vetted') {
      room.combat = true;
      room.cleared = false;
      room.incident = node.state === 'down';
      room.waves = planWaves(game, node, rng, room.incident);
    }
    return room;
  }

  function planWaves(game, node, rng, incident) {
    const run = game.run;
    const lvl = S.debtLevel(run);
    let budget = 4 + node.depth * 1.5 + run.tick * 0.7 + lvl + (node.kind === 'pkg' ? 2 : 0) + (incident ? 3 : 0);
    const table = ECO[node.eco] || ECO.core;
    const types = Object.keys(table);
    const list = [];
    const eliteChance = Math.min(0.5, 0.1 * lvl) + (incident ? 0.25 : 0);
    let guard = 0;
    while (budget >= 1 && list.length < 14 && guard++ < 60) {
      const afford = types.filter((t) => ENEMIES[t].cost <= budget);
      const type = afford.length ? rng.weighted(afford, (t) => table[t]) : 'bug';
      budget -= ENEMIES[type].cost;
      const elite = rng.chance(eliteChance);
      list.push({ type, elite });
      if (type === 'cycle') list.push({ type: 'cycle', elite, pair: true });
    }
    const nWaves = list.length >= 10 ? 3 : list.length >= 5 ? 2 : 1;
    const waves = [];
    for (let i = 0; i < nWaves; i++) waves.push([]);
    // keep cycle pairs in the same wave
    let wi = 0;
    for (let i = 0; i < list.length; i++) {
      waves[wi].push(list[i]);
      if (list[i].type === 'cycle' && !list[i].pair) { waves[wi].push(list[++i]); }
      wi = (wi + 1) % nWaves;
    }
    const conflict = node.lib && Graph.activeConflicts(run.graph, null).some((c) => c.lib === node.lib);
    if (conflict) waves[waves.length - 1].push({ type: 'vconflict', elite: false });
    return waves.filter((w) => w.length);
  }

  function spawnPoint(game, rng, minDist) {
    const room = game.room, p = game.player;
    for (let i = 0; i < 40; i++) {
      const x = 26 + rng.next() * (W - 52), y = 26 + rng.next() * (H - 52);
      if (collides(room, x, y, 9)) continue;
      if (Math.hypot(x - p.x, y - p.y) < minDist) continue;
      return { x, y };
    }
    return { x: W - p.x, y: H - p.y };
  }

  function startWave(game) {
    const room = game.room;
    room.wave++;
    const wave = room.waves[room.wave];
    const rng = game.run.rng;
    let pairPos = null;
    wave.forEach((spec, i) => {
      let pos = spawnPoint(game, rng, 72);
      if (spec.type === 'cycle') {
        if (spec.pair && pairPos) pos = { x: clamp(pairPos.x + 22, 26, W - 26), y: pairPos.y };
        else pairPos = pos;
      }
      const delay = 0.12 * i;
      if (spec.type === 'imposter') { spawnEnemy(game, spec.type, pos.x, pos.y, spec.elite); return; }
      room.queue.push({ t: delay + 0.7, spec, x: pos.x, y: pos.y });
      game.marks.push({ x: pos.x, y: pos.y, life: delay + 0.7, max: delay + 0.7 });
    });
    if (room.wave > 0) sfx(game, 'wave');
  }

  function spawnEnemy(game, type, x, y, elite, extra) {
    const def = ENEMIES[type];
    const run = game.run;
    const scale = 1 + 0.1 * run.tick + 0.25 * Graph.packages(run.graph).length;
    const e = Object.assign({
      id: game.nextId++, type, name: def.name, x, y, r: def.r, spd: def.spd, dmg: def.dmg,
      hp: def.hp * scale, maxHp: def.hp * scale, t: 0, st: 'seek', stT: 0, flash: 0, kx: 0, ky: 0, elite: !!elite,
      seed: Math.random() * TAU, fireT: 1 + Math.random(), orbCd: 0, dormant: false, phased: false,
      disguised: false, shielded: false, gen: 0, ang: Math.random() * TAU, face: 1,
    }, extra || {});
    if (elite) { e.hp *= 1.7; e.maxHp = e.hp; e.spd *= 1.15; e.dmg += 3; }
    if (collides(game.room, e.x, e.y, e.r * 0.8)) {
      // never leave an enemy embedded in a rack where nothing can reach it
      search: for (let rad = 6; rad < 60; rad += 6) for (let k = 0; k < 8; k++) {
        const nx = x + Math.cos((k / 8) * TAU) * rad, ny = y + Math.sin((k / 8) * TAU) * rad;
        if (!collides(game.room, nx, ny, e.r)) { e.x = nx; e.y = ny; break search; }
      }
    }
    if (type === 'breaking') e.stT = 0.8 + Math.random() * 0.8;
    if (type === 'imposter') e.disguised = true;
    if (type === 'race') { e.st = 'phase'; e.phased = true; e.stT = 0.6 + Math.random(); }
    if (type === 'vconflict') { e.st = 'vuln'; e.stT = 2.6; }
    if (type === 'cycle') {
      const mate = game.enemies.find((o) => o.type === 'cycle' && o.mate == null);
      if (mate) { mate.mate = e.id; e.mate = mate.id; e.flank = -1; } else { e.mate = null; e.flank = 1; }
    }
    game.enemies.push(e);
    return e;
  }

  function enterNode(game, id, fromId) {
    const run = game.run;
    const g = run.graph;
    run.cur = id;
    g.nodes[id].visited = true;
    game.enemies = []; game.bullets = []; game.ebullets = []; game.pickups = []; game.puddles = [];
    game.beams = []; game.rings = []; game.marks = []; game.fx = []; game.floaters = []; game.freezeT = 0;
    const room = (game.room = buildRoom(game, id));
    const p = game.player;
    const back = fromId && room.doors.find((d) => d.to === fromId);
    const entry = back || room.doors.find((d) => d.side === 'W');
    if (id === 'app' && !back) { p.x = W / 2; p.y = H / 2 + 28; }
    else if (entry) { p.x = entry.side === 'W' ? TS + 12 : W - TS - 12; p.y = entry.y; }
    p.vx = p.vy = 0; p.dashT = 0; p.doorGrace = 0.45; p.echoT = 0; p.cronT = 0; p.still = 0;
    // an unresolved version conflict: the resolver loads one side per fight
    run.suppressed = {};
    if (room.combat) {
      for (const c of Graph.activeConflicts(g, run.shims)) {
        const lose = run.rng.chance(0.5) ? c.pkgsA : c.pkgsB;
        for (const pk of lose) run.suppressed[pk] = c.lib;
        if (lose.length) {
          const names = lose.map((x) => g.nodes[x].name).join(', ');
          log(game, 'suppressed', `${c.lib} conflict: ${names} failed to load here`, { lib: c.lib, pkgs: lose });
          floater(game, p.x, p.y - 16, 'CONFLICT: ' + names.toUpperCase() + ' OFFLINE', '#ff5ad0');
        }
      }
    }
    refresh(game);
    p.shield = game.stats.shield;
    for (const d of p.drones) { d.x = p.x; d.y = p.y; }
    emit(game, 'enter', { id, combat: room.combat, incident: room.incident });
    sfx(game, 'door');
  }
  S.enterNode = enterNode;

  function enterBoss(game) {
    const run = game.run;
    run.cur = 'prod';
    game.enemies = []; game.bullets = []; game.ebullets = []; game.pickups = []; game.puddles = [];
    game.beams = []; game.rings = []; game.marks = [];
    const room = (game.room = makeRoom('prod', 'boss'));
    applyTemplate(room, 1);
    room.combat = true; room.cleared = false; room.waves = []; room.wave = 0;
    const p = game.player;
    p.x = W / 2; p.y = H - 34; p.vx = p.vy = 0; p.dashT = 0; p.doorGrace = 1;
    run.suppressed = {};
    refresh(game);
    p.shield = game.stats.shield;
    const s = game.stats;
    const dps = (s.damage * s.dmgMult * s.shots * (1 + s.crit * (s.critMult - 1))) / s.fireDelay * (s.cache ? 1 + 1 / s.cache : 1) * (1 + 0.5 * s.drones);
    const hp = Math.max(1500, dps * 40) * (1 + run.debt / 250);
    const boss = spawnEnemy(game, 'boss', W / 2, 52, false, { name: run.boss.name, variant: run.boss.variant });
    boss.hp = boss.maxHp = hp;
    boss.enrage = 1 + 0.25 * run.boss.missing;
    boss.atk = null; boss.atkT = 1.2; boss.rot = 0; boss.strikeT = 0; boss.strike = null;
    game.intro = 3.4;
    emit(game, 'bossintro', { boss: run.boss });
    sfx(game, 'boss');
  }

  // ------------------------------------------------------------------ damage
  function hurt(game, dmg, source) {
    const run = game.run, p = game.player;
    if (p.inv > 0 || (run.phase !== 'run' && run.phase !== 'boss')) return;
    if (p.shield > 0) {
      p.shield--;
      p.inv = 0.6;
      floater(game, p.x, p.y - 12, 'TYPE ERROR CAUGHT', '#7fb2ff');
      game.rings.push({ x: p.x, y: p.y, r: 4, max: 22, life: 0.3, color: '#7fb2ff' });
      sfx(game, 'shield');
      return;
    }
    run.stability -= dmg;
    run.stats.dmgTaken += dmg;
    run.stats.dmgBy[source] = (run.stats.dmgBy[source] || 0) + dmg;
    p.inv = 0.8;
    p.hurtT = 0.25;
    game.shake = Math.max(game.shake, 6);
    game.hitstop = 0.07;
    floater(game, p.x, p.y - 12, '-' + Math.round(dmg), '#ff4d5e');
    burst(game, p.x, p.y, '#ff4d5e', 10, 110);
    sfx(game, 'hurt');
    game.dirty = true;
    if (run.stability <= 0) {
      run.stability = 0;
      run.phase = 'lost';
      const nodes = run.graph.nodes;
      run.death = {
        source, node: run.cur, tick: run.tick, left: run.ticksLeft,
        degraded: Object.assign({}, run.degraded), suppressed: Object.assign({}, run.suppressed),
        obs: game.stats.obs, inBoss: run.cur === 'prod',
        unvetted: Object.keys(nodes).filter((id) => nodes[id].state === 'unvetted').length,
      };
      log(game, 'death', `stability hit 0 in ${run.cur === 'prod' ? 'production' : nodes[run.cur].name}: ${source}`);
      burst(game, p.x, p.y, '#3ef0e0', 40, 160);
      emit(game, 'death');
      sfx(game, 'death');
    }
  }

  const targetable = (e) => !e.dormant && !e.phased && !e.disguised;

  function damageEnemy(game, e, dmg, dirx, diry, crit) {
    if (e.st === 'stun') dmg *= 1.5;
    e.hp -= dmg;
    e.flash = 0.09;
    if (e.type !== 'boss' && e.type !== 'deprecated') { e.kx += (dirx || 0) * 60; e.ky += (diry || 0) * 60; }
    if (crit) floater(game, e.x, e.y - e.r - 4, Math.round(dmg) + '!', '#ffe14a');
    if (e.hp <= 0) killEnemy(game, e);
  }

  function dropCommits(game, x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = 30 + Math.random() * 60;
      game.pickups.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, type: 'commit', t: 0 });
    }
  }

  function killEnemy(game, e) {
    const run = game.run;
    if (e.dead) return;
    if (e.type === 'regression' && !e.revived) {
      e.dormant = true; e.dormT = 2.2; e.revived = true; e.hp = 0;
      burst(game, e.x, e.y, '#b06bff', 8, 70);
      sfx(game, 'kill');
      return;
    }
    if (e.type === 'cycle') {
      const mate = game.enemies.find((o) => o.id === e.mate && !o.dead);
      if (mate && !mate.dormant) {
        e.dormant = true; e.dormT = 3; e.hp = 0;
        burst(game, e.x, e.y, '#3ef0e0', 8, 70);
        sfx(game, 'kill');
        return;
      }
      if (mate) { mate.dead = true; burst(game, mate.x, mate.y, '#3ef0e0', 14, 100); run.stats.kills++; dropCommits(game, mate.x, mate.y, 1); }
    }
    e.dead = true;
    run.stats.kills++;
    const colors = { bug: '#ff4d5e', regression: '#b06bff', race: '#ffe14a', leak: '#4ab8ff', forkbomb: '#5bff8a', deprecated: '#8a8f98', breaking: '#ff9a3d', nullptr: '#ff5ad0', cycle: '#3ef0e0', imposter: '#5bff8a', vconflict: '#ff5ad0', boss: '#ffffff' };
    burst(game, e.x, e.y, colors[e.type] || '#fff', e.type === 'boss' ? 90 : 12 + e.r, e.type === 'boss' ? 220 : 110);
    game.rings.push({ x: e.x, y: e.y, r: 2, max: e.r * 2.4, life: 0.22, color: colors[e.type] || '#fff' });
    game.shake = Math.max(game.shake, e.elite || e.r > 8 ? 3.5 : 1.8);
    game.hitstop = Math.max(game.hitstop, 0.025);
    sfx(game, 'kill');
    if (e.type === 'forkbomb' && e.gen < 2) {
      for (const sgn of [-1, 1]) {
        const c = spawnEnemy(game, 'forkbomb', e.x, e.y, false, { gen: e.gen + 1 });
        c.r = e.gen === 0 ? 6 : 4; c.hp = c.maxHp = e.maxHp * 0.42; c.spd = e.spd * 1.35; c.kx = sgn * 120; c.dmg = e.dmg - 1; c.grace = 0.45;
      }
    }
    if (e.type === 'boss') {
      for (const o of game.enemies) if (!o.dead && o !== e) { o.dead = true; burst(game, o.x, o.y, '#fff', 10, 90); }
      game.ebullets = [];
      run.phase = 'won';
      log(game, 'win', `${e.name} defeated. v1.0 is live. The pager is quiet.`);
      emit(game, 'win');
      sfx(game, 'win');
      game.hitstop = 0.4;
      game.shake = 12;
      return;
    }
    const n = e.elite ? 3 : e.type === 'vconflict' ? 5 : run.rng.chance(e.gen ? 0.12 : 0.3) ? 1 : 0;
    if (n) dropCommits(game, e.x, e.y, n);
    if (run.rng.chance(e.elite ? 0.25 : 0.03)) game.pickups.push({ x: e.x, y: e.y, vx: 0, vy: 0, type: 'heal', t: 0 });
  }

  // ------------------------------------------------------------------ player weapons
  function spawnBullet(game, x, y, ang, dmg, opts) {
    const s = game.stats, run = game.run;
    const crit = !opts.shard && run.rng.chance(s.crit);
    game.bullets.push({
      x, y, vx: Math.cos(ang) * s.shotSpeed, vy: Math.sin(ang) * s.shotSpeed,
      dmg: dmg * (crit ? s.critMult : 1), crit, pierce: opts.shard ? 0 : s.pierce + (opts.pierce || 0),
      bounce: opts.shard ? 0 : s.bounce, homing: opts.shard || opts.wild ? 0 : s.homing,
      life: opts.life || 1.5, hit: opts.skip ? [opts.skip] : [], shard: !!opts.shard, drone: !!opts.drone,
    });
  }

  function fireVolley(game, echo) {
    const p = game.player, s = game.stats, run = game.run;
    let mult = 1, pierce = 0;
    if (!echo && s.duck && p.still >= 0.8) {
      mult = s.duck; pierce = 2; p.still = 0;
      floater(game, p.x, p.y - 14, 'QUACK', '#ffe14a');
      sfx(game, 'crit');
    }
    const n = s.shots;
    const ox = p.x + Math.cos(p.aim) * 7, oy = p.y + Math.sin(p.aim) * 7;
    for (let i = 0; i < n; i++) {
      let ang = p.aim + (i - (n - 1) / 2) * 0.13;
      const wild = s.hallucinate > 0 && run.rng.chance(s.hallucinate);
      if (wild) ang = run.rng.next() * TAU;
      spawnBullet(game, ox, oy, ang, s.damage * mult, { pierce, wild });
    }
    for (const d of p.drones) spawnBullet(game, d.x, d.y, p.aim, s.damage * 0.5 * mult, { drone: true });
    if (!echo) {
      run.stats.shots++;
      if (s.cache) { p.shotCount++; if (p.shotCount % s.cache === 0) p.echoT = 0.07; }
    }
    sfx(game, echo ? 'shoot2' : 'shoot');
  }

  function updatePlayer(game, dt, inp) {
    const p = game.player, s = game.stats, room = game.room, run = game.run;
    if (inp.aimX != null) p.aim = Math.atan2(inp.aimY - p.y, inp.aimX - p.x);
    else if (inp.aimDir != null) p.aim = inp.aimDir;
    let mx = inp.mx || 0, my = inp.my || 0;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    p.dashCd -= dt; p.inv -= dt; p.doorGrace -= dt; p.flagCd -= dt; if (p.hurtT > 0) p.hurtT -= dt;

    if (inp.dash && p.dashCd <= 0 && p.dashT <= 0) {
      const dx = ml > 0.1 ? mx / (ml > 1 ? 1 : ml) : Math.cos(p.aim);
      const dy = ml > 0.1 ? my / (ml > 1 ? 1 : ml) : Math.sin(p.aim);
      const dl = Math.hypot(dx, dy) || 1;
      p.dashT = 0.16; p.dvx = (dx / dl) * 380; p.dvy = (dy / dl) * 380;
      p.inv = Math.max(p.inv, 0.24); p.dashCd = s.dashCd; p.dashHit = [];
      sfx(game, 'dash');
    }
    if (p.dashT > 0) {
      p.dashT -= dt;
      moveCircle(room, p, p.dvx * dt, p.dvy * dt);
      game.fx.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.2, max: 0.2, color: '#3ef0e0', size: 3 });
      if (s.dashDamage) {
        for (const e of game.enemies) {
          if (targetable(e) && !e.dead && !p.dashHit.includes(e.id) && dist(e, p) < e.r + p.r + 6) {
            p.dashHit.push(e.id);
            damageEnemy(game, e, s.dashDamage * s.dmgMult, p.dvx / 380, p.dvy / 380, false);
            game.rings.push({ x: e.x, y: e.y, r: 2, max: 14, life: 0.18, color: '#3ef0e0' });
          }
        }
      }
    } else {
      const k = Math.min(1, dt * 16);
      p.vx += (mx * s.speed - p.vx) * k;
      p.vy += (my * s.speed - p.vy) * k;
      moveCircle(room, p, p.vx * dt, p.vy * dt);
    }
    const moving = ml > 0.1 || p.dashT > 0;
    p.still = moving ? 0 : p.still + dt;
    if (moving) p.walk += dt;

    p.fireCd -= dt;
    if (inp.fire && p.fireCd <= 0) { fireVolley(game, false); p.fireCd = s.fireDelay; }
    if (p.echoT > 0) { p.echoT -= dt; if (p.echoT <= 0) fireVolley(game, true); }

    const fighting = room.combat && !room.cleared;
    if (inp.ability && s.flag && p.flagCd <= 0 && fighting) {
      p.flagCd = s.flagCd;
      game.freezeT = 2.5;
      game.ebullets = [];
      run.stats.flags++;
      addDebt(game, TUNE.flagDebt, 'feature flags');
      game.rings.push({ x: p.x, y: p.y, r: 6, max: 180, life: 0.5, color: '#ffc24a' });
      floater(game, p.x, p.y - 14, 'FLAG OFF', '#ffc24a');
      sfx(game, 'flag');
    }
    if (inp.rollback) S.rollback(game);
    if (s.regen && fighting) {
      p.regenT += dt;
      if (p.regenT >= 4) { p.regenT = 0; if (run.stability < run.maxStability) { run.stability = Math.min(run.maxStability, run.stability + s.regen); game.dirty = true; } }
    }
    if (s.cron && fighting && game.enemies.length) {
      p.cronT += dt;
      if (p.cronT >= s.cron) {
        p.cronT = 0;
        for (let i = 0; i < 12; i++) spawnBullet(game, p.x, p.y, (i / 12) * TAU, s.damage, { life: 0.9, wild: true });
        floater(game, p.x, p.y - 14, 'CRON', '#b8f5ee');
        sfx(game, 'shoot2');
      }
    }
    // drones trail behind the player
    p.drones.forEach((d, i) => {
      const a = p.aim + Math.PI + (i === 0 ? 0.7 : -0.7);
      const tx = p.x + Math.cos(a) * 13, ty = p.y + Math.sin(a) * 13;
      d.x += (tx - d.x) * Math.min(1, dt * 8);
      d.y += (ty - d.y) * Math.min(1, dt * 8);
    });
    // orbitals
    if (s.orbitals) {
      p.orbA += dt * 3.2;
      for (let k = 0; k < s.orbitals; k++) {
        const a = p.orbA + (k * TAU) / s.orbitals;
        const ox = p.x + Math.cos(a) * 19, oy = p.y + Math.sin(a) * 19;
        for (const e of game.enemies) {
          if (!targetable(e) || e.dead) continue;
          if (e.orbCd > 0) continue;
          if (Math.hypot(e.x - ox, e.y - oy) < e.r + 4) {
            e.orbCd = 0.35;
            damageEnemy(game, e, 14 * s.dmgMult, Math.cos(a), Math.sin(a), false);
          }
        }
        for (const b of game.ebullets) if (Math.hypot(b.x - ox, b.y - oy) < 6) { b.life = 0; burst(game, b.x, b.y, '#3ef0e0', 3, 40); }
      }
    }
    // hub interaction prompt
    game.prompt = null;
    if (room.kind === 'hub') {
      if (Math.hypot(p.x - W / 2, p.y - 44) < 26) {
        game.prompt = 'registry';
        if (inp.interact) emit(game, 'openRegistry');
      }
    }
  }

  function updateBullets(game, dt) {
    const room = game.room, s = game.stats;
    for (const b of game.bullets) {
      if (b.homing) {
        let best = null, bd = 110;
        for (const e of game.enemies) {
          if (!targetable(e) || e.dead || b.hit.includes(e.id)) continue;
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < bd) { bd = d; best = e; }
        }
        if (best) {
          const sp = Math.hypot(b.vx, b.vy);
          const cur = Math.atan2(b.vy, b.vx);
          let diff = Math.atan2(best.y - b.y, best.x - b.x) - cur;
          while (diff > Math.PI) diff -= TAU;
          while (diff < -Math.PI) diff += TAU;
          const na = cur + clamp(diff, -b.homing * dt, b.homing * dt);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      if (solidAt(room, Math.floor(nx / TS), Math.floor(ny / TS))) {
        if (b.bounce > 0) {
          b.bounce--;
          if (solidAt(room, Math.floor(nx / TS), Math.floor(b.y / TS))) b.vx = -b.vx; else b.vy = -b.vy;
          b.dmg *= 1.15;
          b.hit = [];
          continue;
        }
        if (s.explode && !b.shard) explode(game, b, null);
        b.life = 0;
        game.fx.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.12, max: 0.12, color: '#b8f5ee', size: 2 });
        continue;
      }
      b.x = nx; b.y = ny;
      b.life -= dt;
      for (const e of game.enemies) {
        if (e.dead || e.dormant || e.phased || e.disguised || b.hit.includes(e.id)) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) > e.r + 3) continue;
        if (e.shielded) { b.life = 0; sfx(game, 'tink'); game.fx.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.12, max: 0.12, color: '#ff5ad0', size: 2 }); break; }
        b.hit.push(e.id);
        const sp = Math.hypot(b.vx, b.vy) || 1;
        const dx = b.vx / sp, dy = b.vy / sp;
        damageEnemy(game, e, b.dmg * s.dmgMult, dx, dy, b.crit);
        sfx(game, 'hit');
        game.fx.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.1, max: 0.1, color: '#ffffff', size: 3 });
        if (!b.shard) {
          if (s.chain) chain(game, e, b);
          if (s.split) {
            const base = Math.atan2(b.vy, b.vx);
            for (let i = 0; i < s.split; i++) spawnBullet(game, b.x, b.y, base + (Math.random() - 0.5) * 2.6, b.dmg * 0.35, { shard: true, life: 0.45, skip: e.id });
          }
          if (s.explode) explode(game, b, e);
        }
        if (b.pierce > 0) b.pierce--; else { b.life = 0; break; }
      }
    }
    game.bullets = game.bullets.filter((b) => b.life > 0);
  }

  function chain(game, from, b) {
    const s = game.stats;
    const near = game.enemies.filter((e) => e !== from && !e.dead && targetable(e) && !e.shielded && dist(e, from) < 62)
      .sort((a, c) => dist(a, from) - dist(c, from)).slice(0, s.chain);
    let prev = from;
    for (const e of near) {
      game.beams.push({ x1: prev.x, y1: prev.y, x2: e.x, y2: e.y, life: 0.14, max: 0.14, color: '#9ad8ff' });
      damageEnemy(game, e, b.dmg * 0.45 * s.dmgMult, 0, 0, false);
      prev = e;
    }
  }

  function explode(game, b, skip) {
    const s = game.stats;
    game.rings.push({ x: b.x, y: b.y, r: 3, max: s.explode, life: 0.22, color: '#ff9a3d' });
    burst(game, b.x, b.y, '#ff9a3d', 6, 90);
    for (const e of game.enemies) {
      if (e === skip || e.dead || !targetable(e) || e.shielded) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < s.explode + e.r) damageEnemy(game, e, b.dmg * 0.5 * s.dmgMult, 0, 0, false);
    }
  }

  // ------------------------------------------------------------------ enemies
  function ebullet(game, x, y, ang, speed, dmg, src, life) {
    game.ebullets.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg, src, life: life || 5, r: 2.5 });
  }

  function chase(game, e, ux, uy, spd, dt, wobble, direct) {
    let dx = ux, dy = uy;
    if (!direct && game.flow && !los(game.room, e.x, e.y, game.player.x, game.player.y)) {
      const fd = flowDir(game.room, game.flow, e.x, e.y);
      if (fd) { dx = fd[0]; dy = fd[1]; ux = dx; uy = dy; }
    }
    if (wobble) { const w = Math.sin(e.t * 5 + e.seed) * wobble; dx += -uy * w; dy += ux * w; }
    const hit = moveCircle(game.room, e, dx * spd * dt, dy * spd * dt);
    // slide around obstacles instead of grinding into them
    if (hit === 1) moveCircle(game.room, e, 0, Math.sign(uy || 1) * spd * 0.7 * dt);
    else if (hit === 2) moveCircle(game.room, e, Math.sign(ux || 1) * spd * 0.7 * dt, 0);
    if (Math.abs(dx) > 0.2) e.face = dx > 0 ? 1 : -1;
    return hit;
  }

  function updateEnemy(game, e, dt) {
    const p = game.player, room = game.room, s = game.stats;
    const dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.orbCd > 0) e.orbCd -= dt;
    if (Math.abs(e.kx) + Math.abs(e.ky) > 1) {
      moveCircle(room, e, e.kx * dt, e.ky * dt);
      e.kx *= 0.82; e.ky *= 0.82;
    }
    if (e.dormant) {
      e.dormT -= dt;
      if (e.dormT <= 0) {
        e.dormant = false;
        if (e.type === 'regression') { e.hp = e.maxHp * 0.6; e.spd *= 1.5; floater(game, e.x, e.y - 10, 'REGRESSED', '#ff5ad0'); }
        else { e.hp = e.maxHp; floater(game, e.x, e.y - 10, 'CYCLE RESTORED', '#3ef0e0'); }
        game.rings.push({ x: e.x, y: e.y, r: 14, max: 2, life: 0.25, color: '#ff5ad0' });
        sfx(game, 'wave');
      }
      return;
    }
    let spd = e.spd;
    if (s.legacySlow && (e.type === 'deprecated' || e.type === 'regression')) spd *= 1 - s.legacySlow;
    let contact = true;
    if (e.grace > 0) { e.grace -= dt; contact = false; }

    switch (e.type) {
      case 'bug':
        chase(game, e, ux, uy, spd, dt, 0.5);
        break;
      case 'regression':
        chase(game, e, ux, uy, spd, dt, 0.25);
        break;
      case 'forkbomb':
        chase(game, e, ux, uy, spd, dt, 0.8);
        break;
      case 'leak':
        chase(game, e, ux, uy, spd, dt, 0);
        e.stT += dt;
        if (e.stT >= 3.4) {
          e.stT = 0;
          if (e.r < 15) { e.r += 1.5; e.hp += 10; e.maxHp += 10; }
          game.puddles.push({ x: e.x, y: e.y, r: e.r + 7, life: 7, warn: 0.5, tick: 0, src: 'Memory Leak' });
        }
        break;
      case 'nullptr': {
        e.stT -= dt;
        if (e.stT <= 0) { e.stT = 1.5 + Math.random(); e.strafe = Math.random() < 0.5 ? 1 : -1; }
        if (d < 56) chase(game, e, -ux, -uy, spd, dt, 0, true);
        else if (d > 96) chase(game, e, ux, uy, spd, dt, 0);
        else chase(game, e, -uy * (e.strafe || 1), ux * (e.strafe || 1), spd * 0.8, dt, 0, true);
        e.fireT -= dt;
        e.charging = e.fireT < 0.35;
        if (e.fireT <= 0) {
          e.fireT = 1.7 + Math.random() * 0.4;
          ebullet(game, e.x, e.y, Math.atan2(dy, dx), 82, e.dmg, e.name);
          sfx(game, 'eshoot');
        }
        break;
      }
      case 'deprecated':
        chase(game, e, ux, uy, spd, dt, 0);
        e.fireT -= dt;
        e.charging = e.fireT < 0.4;
        if (e.fireT <= 0) {
          e.fireT = 2.6;
          e.ringOff = e.ringOff ? 0 : TAU / 16;
          for (let i = 0; i < 8; i++) ebullet(game, e.x, e.y, e.ringOff + (i / 8) * TAU, 42, e.dmg, e.name, 6);
          sfx(game, 'eshoot');
        }
        break;
      case 'race':
        e.stT -= dt;
        if (e.st === 'phase') {
          contact = false;
          e.ang += dt * 2.4;
          const tx = p.x + Math.cos(e.ang) * 52, ty = p.y + Math.sin(e.ang) * 52;
          const td = Math.hypot(tx - e.x, ty - e.y) || 1;
          e.x = clamp(e.x + ((tx - e.x) / td) * spd * dt, 26, W - 26);
          e.y = clamp(e.y + ((ty - e.y) / td) * spd * dt, 26, H - 26);
          if (e.stT <= 0 && !collides(room, e.x, e.y, e.r)) { e.st = 'wind'; e.stT = 0.38; e.phased = false; }
        } else if (e.st === 'wind') {
          contact = false;
          e.aimA = Math.atan2(dy, dx);
          if (e.stT <= 0) { e.st = 'lunge'; e.stT = 0.4; }
        } else {
          const hit = moveCircle(room, e, Math.cos(e.aimA) * 165 * dt, Math.sin(e.aimA) * 165 * dt);
          if (e.stT <= 0 || hit) { e.st = 'phase'; e.stT = 1.3; e.phased = true; }
        }
        break;
      case 'breaking':
        e.stT -= dt;
        if (e.st === 'seek') {
          chase(game, e, ux, uy, spd, dt, 0);
          if (e.stT <= 0) { e.st = 'aim'; e.stT = 0.65; }
        } else if (e.st === 'aim') {
          if (e.stT > 0.2) e.aimA = Math.atan2(dy, dx);
          if (e.stT <= 0) { e.st = 'charge'; e.stT = 1.3; sfx(game, 'charge'); }
        } else if (e.st === 'charge') {
          const hit = moveCircle(room, e, Math.cos(e.aimA) * 225 * dt, Math.sin(e.aimA) * 225 * dt);
          if (hit || e.stT <= 0) {
            e.st = 'stun'; e.stT = 0.95;
            if (hit) { game.shake = Math.max(game.shake, 3); burst(game, e.x, e.y, '#ff9a3d', 8, 80); sfx(game, 'thud'); }
          }
        } else if (e.stT <= 0) { e.st = 'seek'; e.stT = 0.9 + Math.random() * 0.8; }
        break;
      case 'cycle': {
        const mate = game.enemies.find((o) => o.id === e.mate && !o.dead);
        const tx = p.x - uy * 34 * e.flank, ty = p.y + ux * 34 * e.flank;
        const td = Math.hypot(tx - e.x, ty - e.y) || 1;
        chase(game, e, (tx - e.x) / td, (ty - e.y) / td, spd, dt, 0);
        if (mate && !mate.dormant && e.flank === 1) {
          // the beam between the pair is the hazard
          const vx = mate.x - e.x, vy = mate.y - e.y;
          const len2 = vx * vx + vy * vy || 1;
          const tt = clamp(((p.x - e.x) * vx + (p.y - e.y) * vy) / len2, 0, 1);
          if (Math.hypot(p.x - (e.x + vx * tt), p.y - (e.y + vy * tt)) < p.r + 2 && p.dashT <= 0) hurt(game, e.dmg, e.name);
        }
        break;
      }
      case 'imposter':
        if (e.disguised) {
          contact = false;
          if (d < 24) { e.disguised = false; e.st = 'reveal'; e.stT = 0.3; floater(game, e.x, e.y - 10, 'IMPOSTER!', '#ff4d5e'); sfx(game, 'charge'); }
        } else if (e.st === 'reveal') {
          contact = false;
          e.stT -= dt;
          if (e.stT <= 0) e.st = 'seek';
        } else chase(game, e, ux, uy, spd, dt, 0.9);
        break;
      case 'vconflict':
        e.stT -= dt;
        if (e.st === 'vuln') {
          e.shielded = false;
          chase(game, e, ux, uy, spd, dt, 0);
          e.fireT -= dt;
          if (e.fireT <= 0) {
            e.fireT = 0.85;
            const a = Math.atan2(dy, dx);
            for (const o of [-0.22, 0, 0.22]) ebullet(game, e.x, e.y, a + o, 86, e.dmg - 3, e.name);
            sfx(game, 'eshoot');
          }
          if (e.stT <= 0) { e.st = 'shield'; e.stT = 1.6; e.aimA = Math.atan2(dy, dx); }
        } else {
          e.shielded = true;
          moveCircle(room, e, Math.cos(e.aimA) * 100 * dt, Math.sin(e.aimA) * 100 * dt);
          if (e.stT <= 0) { e.st = 'vuln'; e.stT = 2.6; }
        }
        break;
      case 'boss':
        updateBoss(game, e, dt, ux, uy, d);
        break;
    }
    if (contact && !(e.grace > 0) && d < e.r + p.r - 1 && p.dashT <= 0) hurt(game, e.dmg, e.name);
  }

  // ------------------------------------------------------------------ the boss
  function updateBoss(game, e, dt, ux, uy, d) {
    const run = game.run, room = game.room, p = game.player;
    const frac = e.hp / e.maxHp;
    const phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
    if (phase !== e.phase) {
      e.phase = phase;
      if (phase > 1) { banner(game, `${e.name}: PHASE ${phase}`, phase === 2 ? 'It has read your architecture diagram.' : 'It is now improvising.', 'bad'); sfx(game, 'boss'); game.shake = 8; }
    }
    // dependency strikes: prod calls in every unvetted node
    const plan = run.boss;
    if (e.strike) {
      e.strikeT -= dt;
      if (e.strikeT <= 0) { resolveStrike(game, e.strike); e.strike = null; }
    } else {
      const next = plan.strikes.find((s) => s.state === 'pending' && frac <= s.at);
      if (next) {
        next.state = 'warn';
        e.strike = next;
        e.strikeT = 1.7;
        const label = next.shim ? `the ${next.shim} shim` : run.graph.nodes[next.node].name;
        emit(game, 'strikeWarn', { strike: next, label });
        banner(game, 'PROD TARGETS ' + label.toUpperCase(), next.why === 'probe' ? 'probing a known-risky dependency…' : next.why, 'warn');
        sfx(game, 'pager');
      }
    }

    if (e.variant === 'unknown') {
      // flickers out of existence between attacks
      e.phased = e.fade > 0;
      if (e.fade > 0) e.fade -= dt;
    }

    const cad = e.enrage * (phase === 3 ? 1.35 : phase === 2 ? 1.15 : 1);
    if (!e.atk) {
      if (d > 50) chase(game, e, ux, uy, e.spd, dt, 0);
      e.atkT -= dt * cad;
      if (e.atkT <= 0) {
        const rots = {
          1: ['ring', 'aimed', 'adds'],
          2: ['ring', 'spiral', 'aimed', 'charge', 'sig'],
          3: ['ring2', 'charge', 'spiral', 'sig', 'aimed', 'adds'],
        };
        const rot = rots[phase];
        e.atk = { name: rot[e.rot++ % rot.length], t: 0, n: 0 };
      }
      return;
    }
    const a = e.atk;
    a.t += dt;
    const done = (rest) => { e.atk = null; e.atkT = rest; };
    const toP = Math.atan2(p.y - e.y, p.x - e.x);
    switch (a.name) {
      case 'ring':
      case 'ring2': {
        const count = 10 + phase * 2;
        if (a.n === 0 || (a.name === 'ring2' && a.n === 1 && a.t > 0.45)) {
          const off = a.n * (TAU / count / 2) + Math.random();
          for (let i = 0; i < count; i++) ebullet(game, e.x, e.y, off + (i / count) * TAU, 54, e.dmg - 5, e.name, 7);
          sfx(game, 'eshoot');
          a.n++;
        }
        if (a.t > (a.name === 'ring2' ? 0.6 : 0.2)) done(1.5);
        break;
      }
      case 'aimed':
        if (a.t > a.n * 0.28) {
          for (const o of [-0.36, -0.18, 0, 0.18, 0.36]) ebullet(game, e.x, e.y, toP + o, 88, e.dmg - 4, e.name);
          sfx(game, 'eshoot');
          if (++a.n >= 3) done(1.4);
        }
        break;
      case 'spiral':
        if (a.t > a.n * 0.085) {
          const ang = a.n * 0.42 + (e.spinOff || 0);
          ebullet(game, e.x, e.y, ang, 62, e.dmg - 5, e.name, 6);
          ebullet(game, e.x, e.y, ang + Math.PI, 62, e.dmg - 5, e.name, 6);
          if (a.n % 4 === 0) sfx(game, 'eshoot');
          if (++a.n >= 28) { e.spinOff = Math.random() * TAU; done(1.3); }
        }
        break;
      case 'adds': {
        const alive = game.enemies.filter((o) => o !== e && !o.dead).length;
        const n = Math.min(1 + phase, 6 - alive);
        for (let i = 0; i < n; i++) {
          const pos = spawnPoint(game, run.rng, 64);
          game.room.queue.push({ t: 0.7, spec: { type: run.rng.chance(0.35) ? 'nullptr' : 'bug', elite: false }, x: pos.x, y: pos.y });
          game.marks.push({ x: pos.x, y: pos.y, life: 0.7, max: 0.7 });
        }
        done(1.2);
        break;
      }
      case 'charge': {
        const reps = e.variant === 'major' ? 3 : 1;
        if (a.st == null) { a.st = 'aim'; a.st_t = 0.7; }
        a.st_t -= dt;
        if (a.st === 'aim') {
          if (a.st_t > 0.2) e.aimA = toP;
          e.telegraph = true;
          if (a.st_t <= 0) { a.st = 'go'; a.st_t = 1.1; e.telegraph = false; sfx(game, 'charge'); }
        } else if (a.st === 'go') {
          const hit = moveCircle(room, e, Math.cos(e.aimA) * 215 * dt, Math.sin(e.aimA) * 215 * dt);
          if (hit || a.st_t <= 0) {
            game.shake = Math.max(game.shake, 6);
            sfx(game, 'thud');
            for (let i = 0; i < 8; i++) ebullet(game, e.x, e.y, (i / 8) * TAU, 66, e.dmg - 5, e.name, 5);
            if (++a.n >= reps) done(1.5); else { a.st = 'aim'; a.st_t = 0.55; }
          }
        }
        break;
      }
      case 'sig':
        bossSignature(game, e, a, toP, done);
        break;
      default: done(1);
    }
  }

  function bossSignature(game, e, a, toP, done) {
    const p = game.player, run = game.run;
    switch (e.variant) {
      case 'rewrite':
        for (let i = 0; i < 5; i++) {
          const ang = Math.random() * TAU, rr = Math.random() * 50;
          game.puddles.push({ x: clamp(p.x + Math.cos(ang) * rr, 30, W - 30), y: clamp(p.y + Math.sin(ang) * rr, 30, H - 30), r: 13, life: 6, warn: 0.9, tick: 0, src: e.name });
        }
        floater(game, e.x, e.y - 30, 'REWRITING...', '#b06bff');
        done(1.6);
        break;
      case 'monolith': {
        const alive = game.enemies.filter((o) => o !== e && !o.dead).length;
        if (alive < 5) {
          const pos = spawnPoint(game, run.rng, 66);
          for (const k of [0, 1]) {
            game.room.queue.push({ t: 0.7, spec: { type: 'cycle', elite: false }, x: clamp(pos.x + k * 22, 26, W - 26), y: pos.y });
            game.marks.push({ x: clamp(pos.x + k * 22, 26, W - 26), y: pos.y, life: 0.7, max: 0.7 });
          }
        }
        done(1.4);
        break;
      }
      case 'breach':
        e.telegraph = a.t < 0.5;
        if (a.t < 0.5) e.aimA = toP;
        else if (a.t > 0.5 + a.n * 0.12) {
          ebullet(game, e.x, e.y, e.aimA + (Math.random() - 0.5) * 0.12, 150, e.dmg - 2, e.name, 3);
          sfx(game, 'eshoot');
          if (++a.n >= 7) { e.telegraph = false; done(1.3); }
        }
        break;
      case 'unknown':
        if (a.n === 0) { e.fade = 1.4; a.n = 1; }
        if (a.t > 1.3) {
          const ang = Math.random() * TAU;
          e.x = clamp(p.x + Math.cos(ang) * 64, 40, W - 40);
          e.y = clamp(p.y + Math.sin(ang) * 64, 40, H - 40);
          for (let i = 0; i < 12; i++) ebullet(game, e.x, e.y, (i / 12) * TAU, 60, e.dmg - 5, e.name, 6);
          done(1.4);
        }
        break;
      case 'major':
        e.atk = { name: 'charge', t: 0, n: 0 };
        break;
      default: // friday: confetti
        if (a.t > a.n * 0.05) {
          ebullet(game, e.x, e.y, Math.random() * TAU, 38 + Math.random() * 52, e.dmg - 6, e.name, 6);
          if (++a.n >= 30) done(1.5);
        }
    }
  }

  function resolveStrike(game, st) {
    const run = game.run, g = run.graph, p = game.player;
    st.state = 'done';
    if (st.shim) {
      delete run.shims[st.shim];
      const c = Graph.activeConflicts(g, run.shims).find((x) => x.lib === st.shim);
      if (c) {
        const lose = run.rng.chance(0.5) ? c.pkgsA : c.pkgsB;
        for (const pk of lose) run.suppressed[pk] = c.lib;
        log(game, 'strike', `the ${st.shim} shim broke under load: ${lose.map((x) => g.nodes[x].name).join(', ')} offline`, { lib: st.shim });
        banner(game, 'SHIM BROKE', lose.map((x) => g.nodes[x].name).join(', ') + ' offline', 'bad');
      }
      run.stats.strikesLanded++;
      st.held = false;
      refresh(game);
      sfx(game, 'down');
      return;
    }
    const n = g.nodes[st.node];
    if (n.state === 'vetted') {
      st.held = true;
      run.stats.strikesHeld++;
      log(game, 'held', `${n.name} HELD: vetted dependencies do not flinch`, { node: st.node });
      floater(game, p.x, p.y - 18, n.name.toUpperCase() + ' HELD', '#5bff8a');
      sfx(game, 'restore');
      return;
    }
    st.held = false;
    run.stats.strikesLanded++;
    const hit = takeDown(game, st.node, 'struck by prod (' + st.why + ')');
    const names = hit.map((x) => g.nodes[x].name);
    log(game, 'strike', `prod took down ${n.name} (${st.why})` + (names.length ? ` -> ${names.join(', ')} OFFLINE` : ''), { node: st.node, hit });
    banner(game, n.name.toUpperCase() + ' IS DOWN', names.length ? names.join(', ') + ' offline' : st.why, 'bad');
    game.shake = Math.max(game.shake, 6);
    sfx(game, 'down');
  }

  // ------------------------------------------------------------------ room flow
  function roomCleared(game) {
    const run = game.run, g = run.graph, room = game.room;
    const node = g.nodes[room.id];
    const wasDown = node.state === 'down';
    const hardBefore = Graph.packages(g).filter((pk) => Graph.isHardened(g, pk));
    const confBefore = Graph.activeConflicts(g, run.shims).map((c) => c.lib);
    room.cleared = true;
    node.state = 'vetted';
    node.hotfixed = false;
    run.stats.rooms++;
    run.stability = Math.min(run.maxStability, run.stability + TUNE.healOnClear);
    dropCommits(game, W / 2, H / 2, 2);
    if (wasDown) log(game, 'resolved', `incident resolved: ${node.name} is back up and vetted`, { node: room.id });
    else if (node.kind === 'pkg') {
      const f = S.features(game);
      log(game, 'integrated', `integrated ${node.name}: feature ${f}${f <= TUNE.featuresNeeded ? '/' + TUNE.featuresNeeded : ''} shipped`, { node: room.id });
      banner(game, 'FEATURE SHIPPED', `${node.name} integrated  ·  ${Math.min(f, TUNE.featuresNeeded)}/${TUNE.featuresNeeded}` + (f === TUNE.featuresNeeded ? '  ·  the DEPLOY door is open' : ''), 'good');
    } else log(game, 'vetted', `vetted ${node.name}`, { node: room.id });
    floater(game, game.player.x, game.player.y - 16, wasDown ? 'BACK UP' : 'VETTED', '#5bff8a');
    for (const pk of Graph.packages(g)) {
      if (!hardBefore.includes(pk) && Graph.isHardened(g, pk)) {
        log(game, 'hardened', `${g.nodes[pk].name} HARDENED: ${PACKAGES[pk].hard}`, { pkg: pk });
        banner(game, g.nodes[pk].name.toUpperCase() + ' HARDENED', PACKAGES[pk].hard, 'good');
        sfx(game, 'harden');
      }
    }
    const confAfter = Graph.activeConflicts(g, run.shims).map((c) => c.lib);
    for (const lib of confBefore) if (!confAfter.includes(lib)) log(game, 'deduped', `${lib} conflict resolved: both versions vetted side by side`, { lib });
    run.suppressed = {};
    advanceTick(game);
    refresh(game);
    // nothing left to vet and nothing on offer: the backlog refills rather than deadlocking the run
    if (run.offerTaken && !run.freeze && !Object.keys(g.nodes).some((id) => g.nodes[id].state !== 'vetted')) {
      rollOffers(game);
      run.restockIn = TUNE.restockEvery;
      log(game, 'restock', 'registry: everything is vetted, so the backlog refilled early');
      emit(game, 'restock');
    }
    room.doors = buildDoors(g, room.id);
    emit(game, 'clear', { id: room.id, wasDown });
    sfx(game, 'clear');
  }

  function updateRoom(game, dt) {
    const room = game.room, p = game.player, run = game.run;
    // spawn queue
    for (const q of room.queue) {
      q.t -= dt;
      if (q.t <= 0) {
        const e = spawnEnemy(game, q.spec.type, q.x, q.y, q.spec.elite);
        game.rings.push({ x: e.x, y: e.y, r: 12, max: 2, life: 0.2, color: '#ff4d5e' });
      }
    }
    room.queue = room.queue.filter((q) => q.t > 0);
    if (room.combat && !room.cleared && room.kind !== 'boss') {
      const alive = game.enemies.some((e) => !e.disguised);
      if (!alive && !room.queue.length) {
        if (room.wave + 1 < room.waves.length) {
          room.waveDelay -= dt;
          if (room.waveDelay <= 0) { startWave(game); room.waveDelay = 0.5; }
        } else roomCleared(game);
      }
    }
    // spikes (yaml)
    if (room.spikes.length) {
      const ph = room.t % 2.6;
      room.spikeOn = ph > 1.4;
      room.spikeWarn = ph > 0.9 && ph <= 1.4;
      if (room.spikeOn && p.dashT <= 0) {
        const idx = Math.floor(p.y / TS) * COLS + Math.floor(p.x / TS);
        if (room.tiles[idx] === 3) hurt(game, 8, 'YAML indentation');
      }
    }
    // puddles
    for (const u of game.puddles) {
      u.life -= dt;
      if (u.warn > 0) { u.warn -= dt; continue; }
      u.tick -= dt;
      if (u.tick <= 0 && Math.hypot(p.x - u.x, p.y - u.y) < u.r && p.dashT <= 0) { u.tick = 0.5; hurt(game, 6, u.src); }
    }
    game.puddles = game.puddles.filter((u) => u.life > 0);
    // pickups
    for (const k of game.pickups) {
      k.t += dt;
      const d = Math.hypot(p.x - k.x, p.y - k.y) || 1;
      if (d < 38 || (room.cleared && k.t > 0.25)) {
        const pull = room.cleared ? 420 : 260;
        k.vx += ((p.x - k.x) / d) * pull * dt * 4;
        k.vy += ((p.y - k.y) / d) * pull * dt * 4;
      }
      k.vx *= 0.9; k.vy *= 0.9;
      k.x = clamp(k.x + k.vx * dt, 22, W - 22);
      k.y = clamp(k.y + k.vy * dt, 22, H - 22);
      if (d < 9 && k.t > 0.15) {
        k.dead = true;
        if (k.type === 'commit') { run.commits++; sfx(game, 'pickup'); }
        else { run.stability = Math.min(run.maxStability, run.stability + 12); floater(game, p.x, p.y - 12, '+12', '#5bff8a'); sfx(game, 'restore'); }
        game.dirty = true;
      }
    }
    game.pickups = game.pickups.filter((k) => !k.dead);
    // doors
    if (room.cleared && p.doorGrace <= 0 && run.phase === 'run') {
      for (const door of room.doors) {
        if (Math.abs(p.y - door.y) > 11) continue;
        const at = door.side === 'W' ? p.x <= TS + p.r + 1.5 && p.vx < -10 : p.x >= W - TS - p.r - 1.5 && p.vx > 10;
        if (!at) continue;
        p.doorGrace = 0.6;
        if (door.to === 'prod') { emit(game, 'deployPrompt'); break; }
        const n = run.graph.nodes[door.to];
        if (run.freeze && n.state !== 'vetted') { floater(game, p.x, p.y - 14, 'CHANGE FREEZE', '#ffc24a'); sfx(game, 'denied'); break; }
        if (!Graph.enterable(run.graph, door.to)) { floater(game, p.x, p.y - 14, 'LOCKED', '#ffc24a'); sfx(game, 'denied'); break; }
        enterNode(game, door.to, room.id);
        break;
      }
    }
  }

  function updateFx(game, dt) {
    for (const f of game.fx) { f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.92; f.vy *= 0.92; }
    game.fx = game.fx.filter((f) => f.life > 0);
    for (const f of game.floaters) { f.life -= dt; f.y -= 18 * dt; }
    game.floaters = game.floaters.filter((f) => f.life > 0);
    for (const b of game.beams) b.life -= dt;
    game.beams = game.beams.filter((b) => b.life > 0);
    for (const r of game.rings) r.life -= dt;
    game.rings = game.rings.filter((r) => r.life > 0);
    for (const m of game.marks) m.life -= dt;
    game.marks = game.marks.filter((m) => m.life > 0);
    if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 28);
  }

  // ------------------------------------------------------------------ main step
  S.step = function (game, dt, inp) {
    const run = game.run;
    game.t += dt;
    if (run.phase === 'lost' || run.phase === 'won') { updateFx(game, dt); if (game.hitstop > 0) game.hitstop -= dt; return; }
    if (game.hitstop > 0) { game.hitstop -= dt; return; }
    if (game.intro > 0) { game.intro -= dt; updateFx(game, dt); return; }
    run.time += dt;
    game.room.t += dt;
    updatePlayer(game, dt, inp);
    game.flowT -= dt;
    if (game.flowT <= 0) { game.flowT = 0.2; game.flow = game.enemies.length ? flowField(game.room, game.player.x, game.player.y) : null; }
    updateBullets(game, dt);
    if (game.freezeT > 0) game.freezeT -= dt;
    else {
      const list = game.enemies;
      for (let i = 0; i < list.length; i++) if (!list[i].dead) updateEnemy(game, list[i], dt);
      // keep enemies from stacking into one blob
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (a.dead || a.type === 'boss' || a.phased) continue;
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          if (b.dead || b.type === 'boss' || b.phased) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.01;
          const min = a.r + b.r;
          if (d < min) {
            const push = ((min - d) / 2) * 0.5;
            moveCircle(game.room, a, (-dx / d) * push, (-dy / d) * push);
            moveCircle(game.room, b, (dx / d) * push, (dy / d) * push);
          }
        }
      }
      const p = game.player;
      for (const b of game.ebullets) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (solidAt(game.room, Math.floor(b.x / TS), Math.floor(b.y / TS))) { b.life = 0; continue; }
        if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r - 1 && p.inv <= 0) { b.life = 0; hurt(game, b.dmg, b.src); }
      }
      game.ebullets = game.ebullets.filter((b) => b.life > 0);
    }
    game.enemies = game.enemies.filter((e) => !e.dead);
    if (run.phase === 'run' || run.phase === 'boss') updateRoom(game, dt);
    updateFx(game, dt);
  };

  DH.Sim = S;
})();
