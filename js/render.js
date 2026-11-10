// Arena renderer (512x320 pixel canvas, scaled up by CSS) and the dependency-graph drawing
// shared by the minimap, the map screen and the end-of-run report.
(function () {
  const DH = (window.DH = window.DH || {});
  const SP = DH.Sprites, S = DH.Sim, G = DH.Graph;
  const R = {};
  const W = S.W, H = S.H, TS = S.TS, COLS = S.COLS, ROWS = S.ROWS;
  const TAU = Math.PI * 2;

  const COL = {
    bg: '#05090b', cyan: '#3ef0e0', green: '#5bff8a', amber: '#ffc24a', red: '#ff4d5e', magenta: '#ff5ad0',
    dim: '#1f5a58', text: '#b8f5ee', white: '#eaffff', grey: '#5d6b70', blue: '#7fb2ff',
  };
  R.COL = COL;
  const STATE_COL = { vetted: COL.green, unvetted: COL.amber, down: COL.red };
  const ACCENT = { vetted: '#1d6f6a', unvetted: '#7a5a1e', down: '#7a1f2a', hub: '#1d7f8a', boss: '#7a1f2a' };

  let ctx, bg, bgKey = '', vignette;

  R.init = function (canvas) {
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    vignette = document.createElement('canvas');
    vignette.width = W; vignette.height = H;
    const v = vignette.getContext('2d');
    const grad = v.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
    grad.addColorStop(0, 'rgba(255,40,60,0)');
    grad.addColorStop(1, 'rgba(255,40,60,0.9)');
    v.fillStyle = grad;
    v.fillRect(0, 0, W, H);
  };

  function disc(c, x, y, r, color) {
    c.fillStyle = color;
    x = Math.round(x); y = Math.round(y);
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy));
      c.fillRect(x - w, y + dy, w * 2 + 1, 1);
    }
  }
  function ring(c, x, y, r, color) {
    c.fillStyle = color;
    const n = Math.max(10, Math.floor(r * 2.2));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      c.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1);
    }
  }
  function line(c, x1, y1, x2, y2, color, alpha, width) {
    c.globalAlpha = alpha == null ? 1 : alpha;
    c.strokeStyle = color;
    c.lineWidth = width || 1;
    c.beginPath();
    c.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
    c.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
    c.stroke();
    c.globalAlpha = 1;
  }
  function blit(c, img, x, y, scale, flip) {
    const w = img.width * (scale || 1), h = img.height * (scale || 1);
    if (flip) {
      c.save();
      c.translate(Math.round(x), Math.round(y - h / 2));
      c.scale(-1, 1);
      c.drawImage(img, -w / 2, 0, w, h);
      c.restore();
    } else c.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  }

  // ---------------------------------------------------------------- room background (cached)
  function roomState(game) {
    const room = game.room;
    if (room.kind === 'hub') return 'hub';
    if (room.kind === 'boss') return 'boss';
    return game.run.graph.nodes[room.id].state;
  }

  function buildBg(game) {
    const room = game.room;
    const c = bg.getContext('2d');
    const st = roomState(game);
    const acc = room.kind === 'boss' ? game.run.boss.color : ACCENT[st];
    const rng = DH.makeRng(DH.hashStr(room.id) + 17);
    c.fillStyle = COL.bg;
    c.fillRect(0, 0, W, H);
    // floor
    for (let ty = 1; ty < ROWS - 1; ty++) for (let tx = 1; tx < COLS - 1; tx++) {
      c.fillStyle = (tx + ty) % 2 ? '#081215' : '#070f12';
      c.fillRect(tx * TS, ty * TS, TS, TS);
      c.fillStyle = '#0d2024';
      c.fillRect(tx * TS, ty * TS, 1, 1);
    }
    // circuit traces
    c.globalAlpha = 0.22;
    c.fillStyle = acc;
    for (let i = 0; i < 6; i++) {
      let x = (2 + rng.int(COLS - 4)) * TS + 8, y = (2 + rng.int(ROWS - 4)) * TS + 8;
      for (let k = 0; k < 3; k++) {
        const len = (2 + rng.int(4)) * TS * (rng.chance(0.5) ? 1 : -1);
        if (k % 2 === 0) { const nx = Math.max(24, Math.min(W - 24, x + len)); c.fillRect(Math.min(x, nx), y, Math.abs(nx - x) + 1, 1); x = nx; }
        else { const ny = Math.max(24, Math.min(H - 24, y + len)); c.fillRect(x, Math.min(y, ny), 1, Math.abs(ny - y) + 1); y = ny; }
      }
      c.fillRect(x - 1, y - 1, 3, 3);
    }
    // the room is a node: its name is etched into the floor
    c.globalAlpha = room.kind === 'boss' ? 0.2 : 0.16;
    const name = room.kind === 'boss' ? 'PRODUCTION' : game.run.graph.nodes[room.id].name;
    const scale = name.length > 15 ? 2 : name.length > 9 ? 3 : 4;
    SP.text(c, name, W / 2, H / 2 - (5 * scale) / 2, acc, scale, 0.5);
    c.globalAlpha = 1;
    // walls
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const t = room.tiles[ty * COLS + tx];
      if (t === 1) {
        c.fillStyle = '#0a1518';
        c.fillRect(tx * TS, ty * TS, TS, TS);
        c.fillStyle = '#0f2226';
        c.fillRect(tx * TS + 1, ty * TS + 1, TS - 2, TS - 2);
        c.fillStyle = '#0a1518';
        c.fillRect(tx * TS + ((ty % 2) * 8 + 4) % 16, ty * TS + 1, 1, TS - 2);
      } else if (t === 2) {
        c.drawImage(SP.get('rack'), tx * TS, ty * TS);
      }
    }
    // glowing inner frame, as in the concept art
    c.fillStyle = acc;
    c.fillRect(TS - 1, TS - 1, W - 2 * TS + 2, 1);
    c.fillRect(TS - 1, H - TS, W - 2 * TS + 2, 1);
    c.fillRect(TS - 1, TS - 1, 1, H - 2 * TS + 2);
    c.fillRect(W - TS, TS - 1, 1, H - 2 * TS + 2);
  }

  // ---------------------------------------------------------------- doors
  function drawDoors(game, t) {
    const room = game.room, run = game.run, g = run.graph;
    const open = room.cleared && run.phase === 'run';
    for (const d of room.doors) {
      const x = d.side === 'W' ? 0 : W - TS;
      let color, label, sub = '';
      if (d.to === 'prod') {
        const ready = S.canDeploy(game);
        color = ready ? COL.cyan : COL.grey;
        label = 'DEPLOY TO PROD';
        sub = ready ? (run.freeze ? 'THE TRAIN IS LEAVING' : 'READY') : `FEATURES ${S.features(game)}/${DH.content.TUNE.featuresNeeded}`;
      } else {
        const n = g.nodes[d.to];
        const ok = G.enterable(g, d.to) && !(run.freeze && n.state !== 'vetted');
        color = ok ? STATE_COL[n.state] : COL.grey;
        label = n.name;
        sub = n.state === 'down' ? 'DOWN' : !ok ? (run.freeze ? 'FROZEN' : 'LOCKED') : n.state === 'unvetted' ? (n.kind === 'pkg' ? 'INTEGRATE' : 'UNVETTED') : '';
        if (n.state === 'down' && Math.floor(t * 4) % 2) color = '#7a1f2a';
      }
      const lit = open && color !== COL.grey;
      ctx.fillStyle = '#020405';
      ctx.fillRect(x, d.y - 11, TS, 22);
      ctx.fillStyle = lit ? color : '#22343a';
      ctx.fillRect(x, d.y - 12, TS, 1);
      ctx.fillRect(x, d.y + 11, TS, 1);
      if (lit) {
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 5 + d.y);
        ctx.fillRect(x + 2, d.y - 9, TS - 4, 18);
        ctx.globalAlpha = 1;
        // arrow
        const ax = d.side === 'W' ? x + 5 : x + 10, dir = d.side === 'W' ? -1 : 1;
        for (let i = 0; i < 4; i++) ctx.fillRect(ax - dir * i, d.y - i, 1, i * 2 + 1);
      } else {
        ctx.fillStyle = '#22343a';
        for (let i = 0; i < 3; i++) ctx.fillRect(x + 3 + i * 4, d.y - 9, 2, 18);
      }
      const tx = d.side === 'W' ? TS + 4 : W - TS - 4, al = d.side === 'W' ? 0 : 1;
      ctx.globalAlpha = open ? 1 : 0.45;
      SP.text(ctx, label, tx, d.y - (sub ? 6 : 2), color, 1, al);
      if (sub) SP.text(ctx, sub, tx, d.y + 1, color === COL.grey ? COL.grey : COL.white, 1, al);
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- entities
  const BOSS_SWAP = {};
  function bossSprite(variant, flash) {
    if (flash) return SP.get('boss', null, '#ffffff');
    if (!BOSS_SWAP[variant]) {
      const c = DH.content.BOSSES[variant].color;
      BOSS_SWAP[variant] = { s: c, h: '#eaffff', d: '#0a1114', e: '#10181c' };
    }
    return SP.get('boss', BOSS_SWAP[variant]);
  }

  function drawEnemy(game, e, t) {
    const obs = game.stats.obs;
    const flash = e.flash > 0;
    const frame = Math.floor(t * 6 + e.seed) % 2;
    ctx.globalAlpha = 1;
    if (e.disguised) {
      // looks like a commit. Almost.
      const bob = Math.sin(t * 4 + e.seed) * 1.5;
      blit(ctx, SP.get('commit', { n: '#74f08a', N: '#2f9a4a' }), e.x, e.y + bob, 1.4);
      if (obs >= 3) { ring(ctx, e.x, e.y, 9, COL.red); SP.text(ctx, '?', e.x - 1, e.y - 16, COL.red); }
      return;
    }
    // shadow
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.fillRect(Math.round(e.x - e.r), Math.round(e.y + e.r - 1), e.r * 2, 2);
    ctx.globalAlpha = 1;
    if (e.dormant) {
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 12);
      const col = e.type === 'cycle' ? COL.cyan : '#b06bff';
      ring(ctx, e.x, e.y, 3 + (e.dormT / 3) * 10, col);
      ctx.globalAlpha = 0.3;
    }
    if (e.phased) ctx.globalAlpha = 0.28 + 0.12 * Math.sin(t * 30 + e.seed);
    const white = flash ? '#ffffff' : null;
    switch (e.type) {
      case 'bug': blit(ctx, SP.get('bug' + frame, null, white), e.x, e.y); break;
      case 'regression': blit(ctx, SP.get('bug' + frame, e.revived && !e.dormant ? { r: '#ff5ad0', R: '#a02a80' } : { r: '#b06bff', R: '#6a35b8' }, white), e.x, e.y); break;
      case 'nullptr': blit(ctx, SP.get('nullptr0', null, white || (e.charging ? '#ffffff' : null)), e.x, e.y + Math.sin(t * 5 + e.seed) * 1.5); break;
      case 'race': {
        const jx = e.phased ? (Math.random() - 0.5) * 4 : 0;
        blit(ctx, SP.get('race0', null, white || (e.st === 'wind' ? '#ffffff' : null)), e.x + jx, e.y);
        if (e.phased) blit(ctx, SP.get('race0'), e.x - jx * 2, e.y + jx);
        break;
      }
      case 'deprecated': blit(ctx, SP.get('deprecated0', null, white || (e.charging ? '#ffe9b0' : null)), e.x, e.y); break;
      case 'breaking':
        if (e.st === 'aim') line(ctx, e.x, e.y, e.x + Math.cos(e.aimA) * 400, e.y + Math.sin(e.aimA) * 400, COL.red, 0.25 + 0.5 * (1 - e.stT / 0.65));
        blit(ctx, SP.get('breaking0', e.st === 'stun' ? { o: '#8a6a4a', O: '#5a4030' } : null, white), e.x + (e.st === 'aim' ? (Math.random() - 0.5) * 2 : 0), e.y);
        if (e.st === 'stun') SP.text(ctx, '***', e.x, e.y - 13, COL.amber, 1, 0.5);
        break;
      case 'forkbomb': blit(ctx, SP.get('forkbomb0', null, white), e.x, e.y, e.r / 8 + 0.15); break;
      case 'leak': {
        const r = Math.round(e.r + Math.sin(t * 3 + e.seed));
        disc(ctx, e.x, e.y, r, flash ? '#fff' : '#1e5fa8');
        disc(ctx, e.x - 1, e.y - 1, Math.max(1, r - 2), flash ? '#fff' : '#4ab8ff');
        ctx.fillStyle = '#eaffff';
        ctx.fillRect(Math.round(e.x - r / 2), Math.round(e.y - r / 2), 2, 2);
        ctx.fillStyle = '#062226';
        ctx.fillRect(Math.round(e.x - 3), Math.round(e.y), 2, 2);
        ctx.fillRect(Math.round(e.x + 2), Math.round(e.y), 2, 2);
        break;
      }
      case 'cycle': blit(ctx, SP.get('cycle0', null, white), e.x, e.y); break;
      case 'imposter': blit(ctx, SP.get('imposter0', null, white), e.x + (e.st === 'reveal' ? (Math.random() - 0.5) * 3 : 0), e.y, 1.2); break;
      case 'vconflict': {
        const a = e.shielded ? COL.magenta : COL.cyan, b = e.shielded ? '#a02a80' : '#1fa89e';
        for (let dy = -9; dy <= 9; dy++) {
          const w = 9 - Math.abs(dy);
          ctx.fillStyle = flash ? '#fff' : a; ctx.fillRect(Math.round(e.x - w), Math.round(e.y + dy), w, 1);
          ctx.fillStyle = flash ? '#fff' : b; ctx.fillRect(Math.round(e.x), Math.round(e.y + dy), w, 1);
        }
        SP.text(ctx, e.shielded ? 'V4' : 'V1', e.x, e.y - 2, '#05090b', 1, 0.5);
        if (e.shielded) ring(ctx, e.x, e.y, 12 + Math.sin(t * 10), COL.magenta);
        break;
      }
      case 'boss': {
        if (e.telegraph) line(ctx, e.x, e.y, e.x + Math.cos(e.aimA) * 500, e.y + Math.sin(e.aimA) * 500, COL.red, 0.6, 3);
        const shake = e.strike ? (Math.random() - 0.5) * 2 : 0;
        blit(ctx, bossSprite(e.variant, flash), e.x + shake, e.y + Math.sin(t * 2) * 2, 2);
        break;
      }
    }
    ctx.globalAlpha = 1;
    if (e.elite && !e.dormant) {
      ctx.fillStyle = COL.amber;
      const r = e.r + 3;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.fillRect(Math.round(e.x + sx * r), Math.round(e.y + sy * r), 1, 1);
        ctx.fillRect(Math.round(e.x + sx * r - sx), Math.round(e.y + sy * r), 1, 1);
        ctx.fillRect(Math.round(e.x + sx * r), Math.round(e.y + sy * r - sy), 1, 1);
      }
    }
    if (obs >= 1 && e.type !== 'boss' && !e.dormant && e.hp < e.maxHp) {
      const w = Math.max(8, e.r * 2);
      ctx.fillStyle = '#200a0e';
      ctx.fillRect(Math.round(e.x - w / 2), Math.round(e.y - e.r - 5), w, 1);
      ctx.fillStyle = COL.red;
      ctx.fillRect(Math.round(e.x - w / 2), Math.round(e.y - e.r - 5), Math.max(1, Math.round((w * e.hp) / e.maxHp)), 1);
    }
    if (obs >= 3 && (e.type === 'nullptr' || e.type === 'deprecated') && e.charging) ring(ctx, e.x, e.y, e.r + 4, COL.white);
  }

  function drawPlayer(game, t) {
    const p = game.player, s = game.stats, run = game.run;
    if (run.phase === 'lost') return;
    // cycle beams render under the player
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.fillRect(Math.round(p.x - 5), Math.round(p.y + 6), 10, 2);
    ctx.globalAlpha = 1;
    for (const d of p.drones) {
      ctx.fillStyle = COL.cyan;
      ctx.fillRect(Math.round(d.x - 2), Math.round(d.y - 2 + Math.sin(t * 6) * 1.5), 5, 4);
      ctx.fillStyle = COL.white;
      ctx.fillRect(Math.round(d.x), Math.round(d.y - 1 + Math.sin(t * 6) * 1.5), 1, 1);
    }
    if (s.orbitals) {
      for (let k = 0; k < s.orbitals; k++) {
        const a = p.orbA + (k * TAU) / s.orbitals;
        disc(ctx, p.x + Math.cos(a) * 19, p.y + Math.sin(a) * 19, 3, COL.cyan);
        disc(ctx, p.x + Math.cos(a) * 19, p.y + Math.sin(a) * 19, 1, COL.white);
      }
    }
    if (s.duck) {
      const ready = p.still >= 0.8;
      blit(ctx, SP.get('duck', null, ready && Math.floor(t * 10) % 2 ? '#ffffff' : null), p.x - 11, p.y + 5);
      if (!ready && p.still > 0.1) { ctx.fillStyle = COL.amber; ctx.fillRect(Math.round(p.x - 14), Math.round(p.y + 10), Math.round((p.still / 0.8) * 7), 1); }
    }
    if (p.inv > 0 && p.dashT <= 0 && Math.floor(t * 20) % 2) return;
    const frame = Math.abs(p.vx) + Math.abs(p.vy) > 20 ? Math.floor(p.walk * 9) % 2 : 0;
    const img = SP.get('player' + frame, null, p.hurtT > 0 ? '#ff4d5e' : null);
    blit(ctx, img, p.x, p.y, 1, Math.cos(p.aim) < 0);
    // the patch gun
    const gx = p.x + Math.cos(p.aim) * 6, gy = p.y + 1 + Math.sin(p.aim) * 6;
    line(ctx, gx, gy, gx + Math.cos(p.aim) * 5, gy + Math.sin(p.aim) * 5, COL.white, 1, 2);
    if (p.shield > 0) ring(ctx, p.x, p.y, 10 + Math.sin(t * 6), COL.blue);
  }

  // ---------------------------------------------------------------- frame
  R.draw = function (game, t) {
    const room = game.room, run = game.run, p = game.player;
    const key = room.id + '|' + roomState(game) + '|' + run.seed + '|' + room.template;
    if (key !== bgKey) { buildBg(game); bgKey = key; }
    ctx.save();
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, W, H);
    if (game.shake > 0.2) ctx.translate(Math.round((Math.random() - 0.5) * game.shake), Math.round((Math.random() - 0.5) * game.shake));
    ctx.drawImage(bg, 0, 0);

    // incident rooms strobe
    if (room.incident && !room.cleared) {
      ctx.globalAlpha = 0.05 + 0.05 * Math.sin(t * 6);
      ctx.fillStyle = COL.red;
      ctx.fillRect(TS, TS, W - 2 * TS, H - 2 * TS);
      ctx.globalAlpha = 1;
    }
    // spikes
    for (const idx of room.spikes) {
      const x = (idx % COLS) * TS, y = Math.floor(idx / COLS) * TS;
      ctx.fillStyle = room.spikeOn ? COL.amber : room.spikeWarn ? '#7a5a1e' : '#1c2a22';
      for (let i = 0; i < 4; i++) {
        const h = room.spikeOn ? 6 : 2;
        ctx.fillRect(x + 2 + i * 4, y + 8 - h / 2 + (i % 2) * 3 - 1, 2, h);
      }
      if (room.spikeOn) { ctx.fillStyle = COL.white; for (let i = 0; i < 4; i++) ctx.fillRect(x + 2 + i * 4, y + 4 + (i % 2) * 3, 2, 1); }
    }
    // puddles
    for (const u of game.puddles) {
      ctx.globalAlpha = u.warn > 0 ? 0.25 + 0.2 * Math.sin(t * 30) : Math.min(0.5, u.life * 0.5);
      disc(ctx, u.x, u.y, Math.round(u.r), u.src === 'Memory Leak' ? '#1e5fa8' : '#6a35b8');
      ctx.globalAlpha = Math.min(0.8, u.life);
      ring(ctx, u.x, u.y, u.r, u.src === 'Memory Leak' ? '#4ab8ff' : '#b06bff');
      ctx.globalAlpha = 1;
    }
    drawDoors(game, t);

    if (room.kind === 'hub') {
      const fresh = !run.offerTaken && run.offers.length && !run.freeze;
      blit(ctx, SP.get('terminal'), W / 2, 36);
      SP.text(ctx, 'REGISTRY', W / 2, 48, COL.cyan, 1, 0.5);
      if (fresh && Math.floor(t * 2) % 2) SP.text(ctx, 'NEW PACKAGES', W / 2, 19, COL.green, 1, 0.5);
      if (game.prompt === 'registry') {
        ctx.fillStyle = '#05090b';
        ctx.fillRect(W / 2 - 36, 56, 72, 9);
        SP.text(ctx, '[E] OPEN REGISTRY', W / 2, 58, COL.white, 1, 0.5);
      }
    }

    // spawn telegraphs
    for (const m of game.marks) {
      const k = 1 - m.life / m.max;
      ctx.globalAlpha = 0.4 + 0.5 * k;
      ring(ctx, m.x, m.y, 10 - k * 7, COL.red);
      ctx.fillStyle = COL.red;
      ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y) - 1, 2, 2);
      ctx.globalAlpha = 1;
    }
    // pickups
    for (const k of game.pickups) {
      const bob = Math.sin(t * 6 + k.x) * 1.2;
      blit(ctx, SP.get(k.type === 'commit' ? 'commit' : 'heal'), k.x, k.y + bob);
    }
    // circular dependency beams
    for (const e of game.enemies) {
      if (e.type !== 'cycle' || e.flank !== 1 || e.dormant) continue;
      const mate = game.enemies.find((o) => o.id === e.mate);
      if (mate && !mate.dormant) {
        line(ctx, e.x, e.y, mate.x, mate.y, COL.cyan, 0.5 + 0.3 * Math.sin(t * 20), 3);
        line(ctx, e.x, e.y, mate.x, mate.y, COL.white, 0.9, 1);
      }
    }
    const ents = game.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of ents) if (e.y <= p.y) drawEnemy(game, e, t);
    drawPlayer(game, t);
    for (const e of ents) if (e.y > p.y) drawEnemy(game, e, t);

    // bullets
    ctx.globalCompositeOperation = 'lighter';
    for (const b of game.bullets) {
      const c = b.crit ? '#ffe14a' : b.shard ? '#9ad8ff' : b.drone ? '#7fb2ff' : COL.cyan;
      const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(Math.round(b.x - ux * 6 - 1), Math.round(b.y - uy * 6 - 1), 2, 2);
      ctx.globalAlpha = 0.6;
      ctx.fillRect(Math.round(b.x - ux * 3 - 1), Math.round(b.y - uy * 3 - 1), 2, 2);
      ctx.globalAlpha = 1;
      if (b.shard) { ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 1), 2, 2); continue; }
      ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 1), 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const b of game.ebullets) {
      disc(ctx, b.x, b.y, 3, Math.floor(t * 12) % 2 ? '#ff4d5e' : '#ff8a5e');
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 1), 2, 2);
    }
    // fx
    for (const f of game.fx) {
      ctx.globalAlpha = Math.min(1, f.life / (f.max * 0.6));
      ctx.fillStyle = f.color;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size);
    }
    ctx.globalAlpha = 1;
    for (const r of game.rings) {
      const t0 = r.t0 || (r.t0 = r.life + 0.016);
      const k = 1 - r.life / t0;
      ctx.globalAlpha = Math.max(0, Math.min(1, r.life * 5));
      ring(ctx, r.x, r.y, r.r + (r.max - r.r) * Math.min(1, Math.max(0, k)), r.color);
    }
    ctx.globalAlpha = 1;
    for (const b of game.beams) line(ctx, b.x1, b.y1, b.x2, b.y2, b.color, b.life / b.max, 2);
    for (const f of game.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 3);
      const tw = SP.textWidth(f.text, 1);
      const x = Math.max(TS + 2 + tw / 2, Math.min(W - TS - 2 - tw / 2, f.x));
      SP.text(ctx, f.text, x + 1, f.y + 1, '#05090b', 1, 0.5);
      SP.text(ctx, f.text, x, f.y, f.color, 1, 0.5);
    }
    ctx.globalAlpha = 1;
    if (game.freezeT > 0) {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = COL.amber;
      ctx.fillRect(TS, TS, W - 2 * TS, H - 2 * TS);
      ctx.globalAlpha = 1;
      SP.text(ctx, 'FLAG OFF ' + game.freezeT.toFixed(1), W / 2, H - 26, COL.amber, 1, 0.5);
    }
    ctx.restore();

    // boss bar lives in the top wall
    const boss = game.enemies.find((e) => e.type === 'boss');
    if (boss && run.boss.variant !== 'unknown') {
      const bw = 200, bx = (W - bw) / 2;
      ctx.fillStyle = '#200a0e';
      ctx.fillRect(bx, 5, bw, 6);
      ctx.fillStyle = run.boss.color;
      ctx.fillRect(bx, 5, Math.round((bw * Math.max(0, boss.hp)) / boss.maxHp), 6);
      ctx.fillStyle = '#05090b';
      for (const s of run.boss.strikes) ctx.fillRect(Math.round(bx + bw * s.at), 5, 1, 6);
    } else if (boss) SP.text(ctx, '??? ??? ???', W / 2, 6, COL.grey, 1, 0.5);

    // low stability: the screen edge breathes red
    const stab = run.stability / run.maxStability;
    if (stab < 0.3 && run.phase !== 'won') {
      ctx.globalAlpha = (0.3 - stab) * 2.2 * (0.65 + 0.35 * Math.sin(t * (6 + (0.3 - stab) * 20)));
      ctx.drawImage(vignette, 0, 0);
      ctx.globalAlpha = 1;
    }
  };

  // ---------------------------------------------------------------- dependency graph
  // Draws into any 2D context. Returns {id: {x, y}} for hit-testing.
  R.drawGraph = function (c, game, w, h, o) {
    o = o || {};
    const run = game.run, g = run.graph, nodes = g.nodes, t = o.t || 0;
    const big = !!o.labels || !!o.pkgLabels;
    const padX = o.labels ? 70 : big ? 44 : 16, padY = o.labels ? 34 : big ? 22 : 14;
    const cols = g.cols + 1; // +1 for prod, left of app
    const dx = Math.min((w - padX * 2) / Math.max(1, cols - 1), o.labels ? 150 : big ? 90 : 60);
    const dy = Math.min((h - padY * 2) / Math.max(1, g.rows - 1 || 1), o.labels ? 46 : big ? 30 : 22);
    const ox = (w - dx * (cols - 1)) / 2, oy = (h - dy * (g.rows - 1)) / 2;
    const pos = {};
    for (const id of Object.keys(nodes)) pos[id] = { x: Math.round(ox + (nodes[id].lx + 1) * dx), y: Math.round(oy + nodes[id].ly * dy) };
    pos.prod = { x: Math.round(ox), y: pos.app.y };

    const degraded = run.degraded || {};
    const badPath = new Set(); // edges on a live failure path
    for (const pk of Object.keys(degraded)) {
      const cause = degraded[pk];
      const ups = G.dependents(g, cause);
      for (const id of ups) for (const d of nodes[id].deps) if (d === cause || ups.has(d)) badPath.add(id + '>' + d);
    }
    c.clearRect(0, 0, w, h);
    c.lineWidth = o.labels ? 2 : 1.5;
    const edge = (a, b, color, dash) => {
      const mx = Math.round((a.x + b.x) / 2);
      c.strokeStyle = color;
      c.setLineDash(dash || []);
      c.beginPath();
      c.moveTo(a.x, a.y); c.lineTo(mx, a.y); c.lineTo(mx, b.y); c.lineTo(b.x, b.y);
      c.stroke();
    };
    edge(pos.prod, pos.app, S.canDeploy(game) ? COL.cyan : '#17383a', [3, 3]);
    for (const id of Object.keys(nodes)) {
      for (const d of nodes[id].deps) {
        const bad = badPath.has(id + '>' + d);
        const col = bad ? (Math.floor(t * 4) % 2 ? COL.red : '#7a1f2a') : nodes[d].state === 'vetted' ? '#1f6a58' : '#3a4a3a';
        edge(pos[id], pos[d], col);
      }
    }
    c.setLineDash([2, 3]);
    for (const cf of G.conflicts(g, run.shims)) {
      if (cf.resolved) continue;
      c.strokeStyle = cf.shimmed ? '#a02a80' : COL.magenta;
      c.beginPath(); c.moveTo(pos[cf.a].x, pos[cf.a].y); c.lineTo(pos[cf.b].x, pos[cf.b].y); c.stroke();
    }
    c.setLineDash([]);

    const sizeOf = (n) => (n.kind === 'app' ? 6 : n.kind === 'pkg' ? 5 : 3.5) * (o.labels ? 1.7 : 1);
    // prod
    {
      const p = pos.prod, s = 5 * (o.labels ? 1.7 : 1);
      c.strokeStyle = run.cur === 'prod' ? COL.red : S.canDeploy(game) ? COL.cyan : COL.grey;
      c.beginPath(); c.moveTo(p.x, p.y - s); c.lineTo(p.x + s, p.y); c.lineTo(p.x, p.y + s); c.lineTo(p.x - s, p.y); c.closePath(); c.stroke();
      if (big) { c.fillStyle = c.strokeStyle; c.font = '11px ui-monospace, Menlo, monospace'; c.textAlign = 'center'; c.fillText('PROD', p.x, p.y + s + 14); }
    }
    for (const id of Object.keys(nodes)) {
      const n = nodes[id], p = pos[id], s = sizeOf(n);
      const col = id === 'app' ? COL.cyan : STATE_COL[n.state];
      const pkDown = n.kind === 'pkg' && degraded[id];
      c.lineWidth = o.labels ? 2 : 1.5;
      if (n.state === 'down') {
        c.fillStyle = Math.floor(t * 4) % 2 ? COL.red : '#7a1f2a';
        c.fillRect(p.x - s, p.y - s, s * 2, s * 2);
        c.strokeStyle = COL.red;
        c.globalAlpha = 0.6;
        const pr = s + 3 + ((t * 10) % 8);
        c.strokeRect(p.x - pr, p.y - pr, pr * 2, pr * 2);
        c.globalAlpha = 1;
      } else if (n.state === 'vetted') {
        c.fillStyle = pkDown ? '#7a1f2a' : col;
        c.fillRect(p.x - s, p.y - s, s * 2, s * 2);
      } else {
        c.fillStyle = '#05090b';
        c.fillRect(p.x - s, p.y - s, s * 2, s * 2);
        c.strokeStyle = pkDown ? COL.red : col;
        c.strokeRect(p.x - s, p.y - s, s * 2, s * 2);
        if (n.hotfixed) { c.fillStyle = COL.amber; c.fillRect(p.x - s, p.y, s * 2, s); }
      }
      if (pkDown && n.state !== 'down') {
        c.strokeStyle = Math.floor(t * 4) % 2 ? COL.red : COL.amber;
        c.strokeRect(p.x - s - 2, p.y - s - 2, s * 2 + 4, s * 2 + 4);
      }
      if (n.kind === 'pkg' && run.hardened[id]) { c.strokeStyle = COL.white; c.strokeRect(p.x - s - 2, p.y - s - 2, s * 2 + 4, s * 2 + 4); }
      if (n.contained) { c.setLineDash([2, 2]); c.strokeStyle = COL.blue; c.strokeRect(p.x - s - 4, p.y - s - 4, s * 2 + 8, s * 2 + 8); c.setLineDash([]); }
      if (n.pinned) { c.fillStyle = COL.blue; c.fillRect(p.x + s - 1, p.y - s - 3, 4, 4); }
      if (run.pager.target === id && game.stats.obs >= 2 && Math.floor(t * 3) % 2) {
        c.strokeStyle = COL.amber;
        c.beginPath(); c.arc(p.x, p.y, s + 6, 0, TAU); c.stroke();
      }
      if (id === run.cur) {
        c.strokeStyle = COL.white;
        const b = s + 5 + (Math.floor(t * 3) % 2);
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          c.beginPath(); c.moveTo(p.x + sx * b, p.y + sy * (b - 4)); c.lineTo(p.x + sx * b, p.y + sy * b); c.lineTo(p.x + sx * (b - 4), p.y + sy * b); c.stroke();
        }
      }
      if (run.fresh && run.fresh.until > game.t && run.fresh.ids.includes(id) && Math.floor(t * 6) % 2) {
        c.strokeStyle = COL.white; c.strokeRect(p.x - s - 3, p.y - s - 3, s * 2 + 6, s * 2 + 6);
      }
      if (o.sel === id) { c.strokeStyle = COL.cyan; c.lineWidth = 1; c.strokeRect(p.x - s - 8, p.y - s - 8, s * 2 + 16, s * 2 + 16); }
      if (o.pkgLabels && (n.kind === 'pkg' || id === 'app')) {
        c.fillStyle = COL.white; c.font = 'bold 10px ui-monospace, Menlo, monospace'; c.textAlign = 'center';
        c.fillText(n.name.split('@')[0], p.x, p.y - s - 5);
      }
      if (o.labels) {
        const hidden = game.stats.obs < 1 && !n.visited && n.kind === 'dep';
        c.fillStyle = n.state === 'down' ? COL.red : n.kind === 'pkg' || id === 'app' ? COL.white : '#8fb8b2';
        c.font = (n.kind === 'dep' || n.kind === 'base' ? '10px' : 'bold 11px') + ' ui-monospace, Menlo, monospace';
        c.textAlign = 'center';
        c.fillText(hidden ? '???' : n.name, p.x, p.y + s + 13);
        const tags = [];
        if (game.stats.obs >= 1 || n.visited) { if (n.risk >= 3) tags.push('☠'); else if (n.risk === 2) tags.push('▲'); }
        if (n.state === 'down') tags.push('DOWN');
        if (n.pinned) tags.push('pinned');
        if (tags.length) { c.fillStyle = n.state === 'down' ? COL.red : COL.amber; c.font = '9px ui-monospace, Menlo, monospace'; c.fillText(tags.join(' '), p.x, p.y - s - 6); }
      }
    }
    return pos;
  };

  DH.Render = R;
})();
