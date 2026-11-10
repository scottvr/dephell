// A crude autoplayer. Used by tools/bot-run.js for headless balance/crash runs, and in the
// browser by ?bot=1 (watch it play) and the screenshot states. It is deliberately mediocre.
(function () {
  const DH = (window.DH = window.DH || {});
  const Bot = {};
  const TAU = Math.PI * 2;

  // Decide what to do between fights. Returns true if it took an action.
  Bot.meta = function (game, policy) {
    const S = DH.Sim, G = DH.Graph;
    const run = game.run, g = run.graph, nodes = g.nodes;
    if (run.phase !== 'run' || !game.room.cleared) return false;
    policy = policy || {};
    const vetAll = policy.vet !== false;

    if (run.cur === 'app') {
      if (!run.offerTaken && run.offers.length && !run.freeze) {
        const want = G.packages(g).length < (policy.maxPkgs || 4);
        if (want) { S.install(game, policy.pick != null ? policy.pick % run.offers.length : run.rng.int(run.offers.length)); return true; }
      }
      if (run.stability < 55 && run.commits >= 4 && S.buyTool(game, 'drink')) return true;
      if (run.commits >= 9 && run.obsBase < 2 && S.buyTool(game, 'tests')) return true;
      if (run.commits >= 12 && run.tools.rollback < 1 && S.buyTool(game, 'rollback')) return true;
    }
    const ids = Object.keys(nodes).filter((id) => id !== 'app' && nodes[id].state !== 'vetted' && S.canTravel(game, id));
    const score = (id) => {
      const n = nodes[id];
      let s = 0;
      if (n.state === 'down') s += 100 + G.dependents(g, id).size * 5;
      if (id === run.pager.target && game.stats.obs >= 2) s += 60;
      if (n.kind === 'pkg') s += 40;
      s += n.risk * 3 - n.depth;
      return s;
    };
    const feats = S.features(game);
    let targets = ids;
    if (!vetAll) {
      targets = ids.filter((id) => nodes[id].kind === 'pkg' || nodes[id].state === 'down');
      if (!targets.length && !S.canDeploy(game)) targets = ids; // nothing to ship yet: pass the time usefully
    }
    if (targets.length && !run.freeze) {
      targets.sort((a, b) => score(b) - score(a));
      if (run.cur !== 'app' && !run.offerTaken && run.offers.length && G.packages(g).length < (policy.maxPkgs || 4)) { S.travel(game, 'app'); return true; }
      S.travel(game, targets[0]);
      return true;
    }
    if (run.cur !== 'app') { S.travel(game, 'app'); return true; }
    if (S.canDeploy(game) && (run.freeze || !targets.length || feats >= 3)) { S.deploy(game); return true; }
    return false;
  };

  // Combat input for one sim step.
  Bot.input = function (game) {
    const p = game.player, W = DH.Sim.W, H = DH.Sim.H;
    const inp = { mx: 0, my: 0, fire: false, dash: false, ability: false, interact: false, rollback: false };
    let target = null, td = 1e9;
    for (const e of game.enemies) {
      if (e.dead || e.dormant || e.disguised) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y) - (e.phased || e.shielded ? -80 : 0);
      if (d < td) { td = d; target = e; }
    }
    let fx = 0, fy = 0;
    if (target) {
      const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy) || 1;
      inp.aimX = target.x; inp.aimY = target.y; inp.fire = true;
      const want = target.type === 'boss' ? 84 : 66;
      const pull = (d - want) / 60;
      if (!DH.Sim.los(game.room, p.x, p.y, target.x, target.y)) {
        // no shot: walk around the obstacle instead of patching a server rack
        if (!game._bf || game._bfT !== Math.floor(game.t * 4)) { game._bf = DH.Sim.flowField(game.room, target.x, target.y); game._bfT = Math.floor(game.t * 4); }
        const fd = DH.Sim.flowDir(game.room, game._bf, p.x, p.y);
        if (fd) { fx += fd[0] * 4; fy += fd[1] * 4; }
      } else { fx += (dx / d) * pull; fy += (dy / d) * pull; }
      const dir = Math.sin(game.t * 0.4) > 0 ? 1 : -1;
      fx += (-dy / d) * 0.6 * dir; fy += (dx / d) * 0.6 * dir;
    }
    for (const e of game.enemies) {
      if (e.dead || e.dormant || e.disguised) continue;
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      const reach = e.r + 40;
      if (d < reach) { const k = (reach - d) / reach; fx += (dx / d) * k * 3; fy += (dy / d) * k * 3; }
    }
    let danger = 0;
    for (const b of game.ebullets) {
      const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
      if (d > 36) continue;
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const side = (b.vx / sp) * dy - (b.vy / sp) * dx > 0 ? 1 : -1; // step perpendicular to the bullet
      const k = (36 - d) / 36;
      fx += (-b.vy / sp) * side * k * 4 + (dx / d) * k; fy += (b.vx / sp) * side * k * 4 + (dy / d) * k;
      if (d < 13) danger++;
    }
    for (const u of game.puddles) {
      const dx = p.x - u.x, dy = p.y - u.y, d = Math.hypot(dx, dy) || 1;
      if (d < u.r + 10) { fx += (dx / d) * 3; fy += (dy / d) * 3; }
    }
    // stay off the walls
    fx += (W / 2 - p.x) / W * 1.2; fy += (H / 2 - p.y) / H * 1.2;
    const l = Math.hypot(fx, fy);
    if (l > 0.15) { inp.mx = fx / l; inp.my = fy / l; }
    if (danger && p.dashCd <= 0) inp.dash = true;
    if (game.stats.flag && game.ebullets.length > 10) inp.ability = true;
    if (game.run.tools.rollback && (game.run.stability < 30 || Object.keys(game.run.degraded).length >= 2)) inp.rollback = true;
    return inp;
  };

  // Run a whole game headlessly. Returns a summary.
  Bot.play = function (seed, policy, maxSeconds) {
    const S = DH.Sim;
    const game = S.newGame(seed);
    const dt = 1 / 60;
    const limit = (maxSeconds || 1800) / dt;
    let steps = 0, idle = 0;
    const idleInp = { mx: 0, my: 0 };
    while (game.run.phase !== 'won' && game.run.phase !== 'lost' && steps < limit) {
      game.events.length = 0;
      if (game.room.cleared && game.run.phase === 'run') {
        // let pickups fly in, then act
        if (game.pickups.length && idle < 90) { S.step(game, dt, idleInp); idle++; steps++; continue; }
        idle = 0;
        if (!Bot.meta(game, policy)) { S.step(game, dt, idleInp); steps++; game._stuck = (game._stuck || 0) + 1; if (game._stuck > 600) break; }
        continue;
      }
      S.step(game, dt, Bot.input(game));
      steps++;
    }
    return game;
  };

  DH.Bot = Bot;
})();
