// DOM layer: HUD, sidebar, registry, map, deploy confirm, help, title and reports.
// The arena is a pixel canvas; everything text-heavy is crisp DOM over it.
(function () {
  const DH = (window.DH = window.DH || {});
  const S = DH.Sim, G = DH.Graph, Rn = DH.Render;
  const { TUNE, PACKAGES, TOOLS } = DH.content;
  const UI = { mode: null, reportAt: 0 };
  const TOOL_KEYS = ['Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus']; // never letters: WASD/E are in the player's hands
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let game = null, hooks = null;
  let regSel = 0, mapSel = 'app', mapPos = null, confirmX = null, lastMini = 0, cache = {}, bannerQ = [], bannerT = 0, seenCombat = false;

  const setText = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } };
  const setHTML = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).innerHTML = v; } };
  const setClass = (id, v) => { if (cache['c:' + id] !== v) { cache['c:' + id] = v; $(id).className = v; } };

  UI.init = function (h) {
    hooks = h;
    $('minimap').addEventListener('click', () => { if (!UI.mode && game) UI.open('map'); });
    $('overlay').addEventListener('click', onOverlayClick);
    $('full').addEventListener('click', () => { if (UI.mode === 'title' || (UI.mode === 'report' && performance.now() - UI.reportAt > 700)) hooks.newRun(); });
  };
  UI.setGame = function (g) { game = g; cache = {}; seenCombat = false; mapSel = 'app'; $('log').innerHTML = ''; bannerQ = []; $('banner').className = ''; };

  // ------------------------------------------------------------------ HUD sync
  const riskGlyph = (n) => (n.risk >= 3 ? ' ☠' : n.risk === 2 ? ' ▲' : '');
  const flagText = { cve: 'known CVE', abandoned: 'abandoned', unpublish: 'unpublishable', license: 'license trouble' };

  function hintText() {
    const run = game.run, room = game.room, g = run.graph;
    if (run.phase === 'boss') return 'Prod strikes every <b>unvetted</b> node as its health drops. Vetted nodes hold.';
    if (run.phase !== 'run') return '';
    const pk = G.packages(g);
    const downs = Object.keys(g.nodes).filter((id) => g.nodes[id].state === 'down');
    if (room.combat && !room.cleared) {
      if (!seenCombat) return '<kbd>WASD</kbd> move · <kbd>Mouse</kbd> aim + hold to fire (or <kbd>Arrows</kbd>) · <kbd>Space</kbd> dash through danger';
      if (room.incident) return 'INCIDENT ROOM: clear it to bring the node back up.';
      return '';
    }
    if (run.freeze) return run.cur === 'app' ? 'CHANGE FREEZE: walk into the <b>DEPLOY</b> door on the west wall.' : 'CHANGE FREEZE: press <kbd>Tab</kbd> and travel back to <b>app</b> to deploy.';
    if (downs.length) return `<b style="color:#ff4d5e">${esc(g.nodes[downs[0]].name)} is DOWN</b> — everything that depends on it is offline. <kbd>Tab</kbd> map → travel there and clear it (or hotfix it).`;
    if (run.cur === 'app') {
      if (!pk.length) return 'Walk up to the <b>REGISTRY</b> terminal and press <kbd>E</kbd>. Every package is a power — and a dungeon.';
      if (!run.offerTaken && run.offers.length) return 'The registry has new packages (<kbd>E</kbd> at the terminal). East doors lead into your dependencies.';
      if (S.canDeploy(game)) return `${S.features(game)} features shipped: the <b>DEPLOY</b> door (west) is open — or keep vetting to harden your build first.`;
      return 'East doors lead into your packages. Clear a package\'s room to <b>integrate</b> it (ship the feature).';
    }
    if (room.cleared) return 'Vetted. East doors go deeper into the tree · west goes back · <kbd>Tab</kbd> map + fast travel';
    return '';
  }

  UI.sync = function (t, dt) {
    if (!game) return;
    const run = game.run, g = run.graph, room = game.room, st = game.stats;
    if (room.combat && !room.cleared && game.enemies.length && run.time > 6) seenCombat = seenCombat || run.stats.kills > 2;

    // banner queue
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').className = ''; }
    else if (bannerQ.length) {
      const b = bannerQ.shift();
      $('banner').firstElementChild.textContent = b.text;
      $('banner').lastElementChild.textContent = b.sub;
      const busy = game.room.combat && !game.room.cleared && game.intro <= 0; // keep the arena clear mid-fight
      $('banner').className = 'on ' + b.kind + (busy ? ' low' : '');
      bannerT = b.dur || 2.3;
    }
    if (t - lastMini > 0.2) {
      lastMini = t;
      const c = $('minimap').getContext('2d');
      c.setTransform(2, 0, 0, 2, 0, 0);
      Rn.drawGraph(c, game, 296, 170, { t });
      if (UI.mode === 'map') drawBigMap(t);
    }
    if (!game.dirty && t - (cache.t || 0) < 0.25) return;
    game.dirty = false;
    cache.t = t;

    // top bar
    const node = g.nodes[run.cur];
    setClass('room-name', (run.cur === 'prod' ? run.boss.name : node.name).length > 19 ? 'long' : '');
    if (run.cur === 'prod') { setText('room-name', run.boss.name); setText('room-sub', 'PRODUCTION · ' + run.boss.why); }
    else {
      setText('room-name', node.name);
      const state = run.cur === 'app' ? 'HOME' : node.state === 'down' ? 'DOWN — ' + node.downWhy : node.state.toUpperCase();
      setText('room-sub', state + (st.obs >= 1 && node.risk >= 2 ? ' · risk' + riskGlyph(node) : '') + ' · ' + node.blurb);
    }
    const pct = Math.max(0, Math.round((run.stability / run.maxStability) * 100));
    $('stb-fill').style.width = pct + '%';
    setText('stb-val', String(Math.max(0, Math.ceil(run.stability))));
    setClass('m-stb', 'meter' + (pct < 30 ? ' low' : pct < 60 ? ' mid' : ''));
    setText('commits', String(run.commits));
    setText('debt', String(Math.round(run.debt)));
    setText('debt-label', DH.Reports.debtLabel(run.debt));
    setClass('debt-box', 'stat l' + Math.min(3, S.debtLevel(run)));
    setText('obs', '●'.repeat(st.obs) + '○'.repeat(Math.max(0, 4 - st.obs)));

    // sidebar: release train
    const used = TUNE.ticksTotal - run.ticksLeft;
    const feats = S.features(game);
    setHTML('train', `<h2>RELEASE TRAIN <b>${run.freeze ? 'CHANGE FREEZE' : 'T-' + run.ticksLeft + ' rooms'}</b></h2>` +
      `<div class="pips"><i>${'■'.repeat(used)}</i>${'■'.repeat(run.ticksLeft)}</div>` +
      `<div>features shipped <b style="color:${feats >= TUNE.featuresNeeded ? '#5bff8a' : '#ffc24a'}">${feats}/${TUNE.featuresNeeded}</b>` +
      (run.offerTaken || run.freeze ? ` <span style="color:#5d8a86">· registry restocks in ${run.restockIn}</span>` : ' <span style="color:#5bff8a">· registry: NEW</span>') + '</div>');
    setClass('train', run.freeze ? 'freeze' : '');
    // pager
    const pg = run.pager;
    let ptxt;
    if (run.phase === 'boss') ptxt = `<div class="tgt">prod is auditing your architecture</div>`;
    else if (run.freeze) ptxt = `<div class="q">silenced for the deploy</div>`;
    else if (pg.target && st.obs >= 2) ptxt = `<div class="tgt">▶ ${esc(g.nodes[pg.target].name)}${riskGlyph(g.nodes[pg.target])} goes down next room</div><div class="q">vet it now, or pin it</div>`;
    else if (pg.in === 1 && pg.target) ptxt = `<div class="tgt">something goes down next room</div><div class="q">target unknown (observability 2 shows it)</div>`;
    else ptxt = `<div class="q">next incident in ${pg.in} rooms</div>`;
    setHTML('pager', `<h2>PAGER</h2>${ptxt}`);
    setClass('pager', pg.in === 1 && pg.target && run.phase === 'run' ? 'hot' : '');
    // packages
    const rows = G.packages(g).map((p) => {
      const s = S.pkgStatus(game, p), n = g.nodes[p];
      const icon = { ok: '●', hard: '★', down: '✖', conflict: '⚡' }[s];
      let txt = PACKAGES[p].power.split('  ')[0];
      if (s === 'hard') txt += ' +';
      if (s === 'down') txt = '← ' + g.nodes[run.degraded[p]].name + ' down';
      if (s === 'conflict') txt = run.suppressed[p] + ' conflict';
      if (s !== 'down' && !G.isIntegrated(g, p)) txt += ' (not integrated)';
      return `<div class="row ${s}"><span>${icon}</span><span class="nm">${esc(n.name.split('@')[0])}</span><span>${esc(txt)}</span></div>`;
    });
    const tl = run.tools;
    const flag = st.flag ? `<div class="tl">FLAG <b>[Q]</b> ${game.player.flagCd > 0 ? Math.ceil(game.player.flagCd) + 's' : 'ready'}</div>` : '';
    setHTML('pkgs', `<h2>PACKAGES</h2>${rows.join('') || '<div class="none">none installed. patch gun only.</div>'}` + flag +
      (tl.pin + tl.container + tl.rollback ? `<div class="tl">pin <b>${tl.pin}</b> · container <b>${tl.container}</b> · rollback <b>${tl.rollback}</b>${tl.rollback ? ' [R]' : ''}</div>` : ''));
    setHTML('hint', UI.mode ? '' : hintText());
  };

  UI.log = function (entry) {
    const el = $('log');
    const d = document.createElement('div');
    d.className = 'lg-' + entry.kind;
    d.innerHTML = `<i>T-${String(entry.left).padStart(2, '0')}</i> ${esc(entry.text)}`;
    el.appendChild(d);
    while (el.children.length > 12) el.removeChild(el.firstChild);
  };
  UI.banner = function (b) { if (bannerQ.length < 4) bannerQ.push(b); };
  UI.bossIntro = function (boss) {
    const real = boss.strikes.filter((s) => s.why !== 'probe');
    const sub = boss.why + '\n' + (real.length
      ? `ARCHITECTURE AUDIT: ${real.length} weak point${real.length > 1 ? 's' : ''} will be struck` + (game.stats.obs >= 2 ? ': ' + real.map((s) => s.shim ? s.shim + ' shim' : game.run.graph.nodes[s.node].name).join(', ') : '')
      : 'ARCHITECTURE AUDIT: no weak points found. It is merely a boss.') +
      (boss.missing ? `\n${boss.missing} feature${boss.missing > 1 ? 's' : ''} unshipped: stakeholders are enraged` : '');
    bannerQ = [{ text: boss.name, sub, kind: 'bad', dur: 3.3 }];
    bannerT = 0;
  };

  // ------------------------------------------------------------------ overlays
  UI.open = function (mode) {
    UI.mode = mode;
    confirmX = null;
    if (mode === 'report') UI.reportAt = performance.now();
    const ov = $('overlay'), full = $('full');
    ov.classList.add('hidden'); full.classList.add('hidden');
    if (mode === 'title' || mode === 'report') { full.classList.remove('hidden'); full.innerHTML = mode === 'title' ? titleHTML() : reportHTML(); if (mode === 'report') drawReportGraph(); }
    else {
      ov.classList.remove('hidden');
      if (mode === 'registry') { regSel = Math.min(regSel, Math.max(0, game.run.offers.length - 1)); renderRegistry(); }
      if (mode === 'map') { if (!game.run.graph.nodes[mapSel]) mapSel = 'app'; if (game.run.cur !== 'prod') mapSel = game.run.cur; renderMap(); }
      if (mode === 'deploy') renderDeploy();
      if (mode === 'help') renderHelp();
    }
    $('hint').innerHTML = '';
    DH.Audio.sfx('ui');
  };
  UI.close = function () {
    if (UI.mode === 'deploy' && game) { game.player.doorGrace = 1.2; game.player.vx = 0; }
    UI.mode = null;
    $('overlay').classList.add('hidden');
    $('full').classList.add('hidden');
    if (game) game.dirty = true;
  };

  // ---- registry
  function treeHTML(pv, obs) {
    const tree = pv.tree, lines = [], lastAt = [];
    let hidden = 0;
    tree.forEach((n, i) => {
      if (n.depth === 0) { lines.push(`<b style="color:#eaffff">${esc(n.name)}</b>`); return; }
      if (obs < 1 && n.depth > 1) { hidden++; return; }
      let last = true;
      for (let j = i + 1; j < tree.length; j++) {
        if (tree[j].depth < n.depth) break;
        if (tree[j].depth === n.depth && !(obs < 1 && tree[j].depth > 1)) { last = false; break; }
      }
      lastAt[n.depth] = last;
      let pre = '';
      for (let d = 1; d < n.depth; d++) pre += lastAt[d] ? '   ' : '│  ';
      pre += last ? '└─ ' : '├─ ';
      const see = obs >= 2 || (obs >= 1 && n.depth <= 1);
      let cls = '', note = '';
      if (n.exists) { cls = 'sh'; note = ' ← shared'; }
      else if (n.repeat) { cls = 'unk'; note = ' (deduped)'; }
      else if (see) { if (n.risk >= 3) { cls = 'r3'; note = ' ☠' + (n.flag ? ' ' + flagText[n.flag] : ''); } else if (n.risk === 2) { cls = 'r2'; note = ' ▲' + (n.flag ? ' ' + flagText[n.flag] : ''); } }
      else if (!n.exists) note = ' ?';
      lines.push(`${pre}<span class="${cls}">${esc(n.name)}${note}</span>`);
    });
    if (hidden) lines.push(`<span class="unk">   … +${hidden} transitive (unknown)</span>`);
    if (tree.length === 1) lines.push('<span class="unk">└─ (no dependencies)</span>');
    return lines.join('\n');
  }

  function renderRegistry() {
    const run = game.run, g = run.graph, obs = game.stats.obs;
    let body;
    if (run.freeze) body = `<div class="empty"><b>CHANGE FREEZE</b>The registry is read-only. Tools are still for sale. Deploy when ready.</div>`;
    else if (run.offerTaken || !run.offers.length) body = `<div class="empty"><b>Registry is rebuilding its index.</b>New packages in ${run.restockIn} room${run.restockIn === 1 ? '' : 's'}. Go vet something.</div>`;
    else {
      body = '<div class="cards">' + run.offers.map((id, i) => {
        const def = PACKAGES[id], pv = G.preview(g, id);
        const [pname, pdesc] = def.power.split('  ');
        let warn = '';
        if (pv.conflicts.length) {
          warn = obs >= 2
            ? pv.conflicts.map((c) => `<div class="warn">⚠ VERSION CONFLICT: ${esc(c.mine)} ↔ ${esc(c.theirs)} (${esc(c.pkgs.map((p) => g.nodes[p].name.split('@')[0]).join(', '))}). One side fails to load each fight until both are vetted, or shimmed.</div>`).join('')
            : obs >= 1 ? '<div class="warn">⚠ Something in this tree may conflict with what you have. (Observability 2 would say what.)</div>' : '';
        }
        const couple = obs >= 1 ? pv.coupled.filter((c) => c.pkgs.length).map((c) => `<div class="couple">⛓ shares ${esc(g.nodes[c.id].name)} with ${esc(c.pkgs.map((p) => g.nodes[p].name.split('@')[0]).join(', '))}: one outage, both offline.</div>`).join('') : '';
        return `<div class="card${i === regSel ? ' sel' : ''}" data-card="${i}"><span class="num">[${i + 1}]</span>
          <h3>${esc(def.name)}</h3><div class="tag">${esc(def.tag)}</div>
          <div class="pw"><b>${esc(pname)}</b> ${esc(pdesc || '')}</div><div class="hd">★ hardened: ${esc(def.hard)}</div>
          <pre>${treeHTML(pv, obs)}</pre>
          <div class="cost">+${pv.rooms} room${pv.rooms > 1 ? 's' : ''} to the dungeon${def.debt ? ` · <span style="color:#ffc24a">+${def.debt} debt</span>` : ''}${def.risk >= 2 && obs >= 1 ? ` · <span style="color:#ffc24a">risky itself${def.flag ? ' (' + flagText[def.flag] + ')' : ''}</span>` : ''}</div>
          ${warn}${couple}<div class="go">ENTER — npm install</div></div>`;
      }).join('') + '</div>';
    }
    const conflict = G.activeConflicts(g, run.shims).length;
    const tools = TOOLS.map((tl, i) => {
      let no = run.commits < tl.cost;
      if (tl.id === 'shim' && !conflict) no = true;
      if (tl.id === 'tests' && run.obsBase >= 3) no = true;
      if (tl.id === 'drink' && run.stability >= run.maxStability) no = true;
      if (tl.id === 'refactor' && run.debt <= 0) no = true;
      if (tl.id === 'reroll' && (run.offerTaken || run.freeze)) no = true;
      return `<div class="tool${no ? ' no' : ''}" data-tool="${tl.id}"><b>[${'4567890-'[i]}] ${esc(tl.name)}</b><i>${tl.cost}c</i><span>${esc(tl.desc)}</span></div>`;
    }).join('');
    $('overlay').innerHTML = `<div class="ov"><span class="close"><kbd>Esc</kbd> close</span><h2>REGISTRY</h2>
      <div class="lede">Take one package per restock. You get its power now. Its dependency tree becomes rooms: vet them all and the package hardens; ignore them and the pager finds them. <b style="color:#eaffff">${run.commits} commits</b> to spend on tools.</div>
      ${body}<div class="tools">${tools}</div></div>`;
  }

  // ---- map
  function drawBigMap(t) {
    const cv = $('bigmap');
    if (!cv) return;
    const c = cv.getContext('2d');
    c.setTransform(2, 0, 0, 2, 0, 0);
    mapPos = Rn.drawGraph(c, game, 640, 570, { labels: true, sel: mapSel, t });
  }

  function mapActions() {
    const run = game.run, g = run.graph, n = g.nodes[mapSel];
    const idle = game.room.cleared && run.phase === 'run';
    const acts = [];
    if (!n) return acts;
    const travelWhy = !idle ? 'finish the fight first' : mapSel === run.cur ? 'you are here' : run.freeze && n.state !== 'vetted' ? 'change freeze' : !G.enterable(g, mapSel) ? 'vet a node that requires it first' : '';
    acts.push({ key: 'Enter', id: 'travel', label: n.state === 'vetted' || mapSel === 'app' ? 'Travel here' : n.state === 'down' ? 'Travel here and fix it (fight)' : n.kind === 'pkg' ? 'Travel here and integrate it (fight)' : 'Travel here and vet it (fight)', no: travelWhy });
    if (n.state === 'down') acts.push({ key: 'H', id: 'hotfix', label: `Hotfix from here (${TUNE.hotfixCommits}c, +${TUNE.hotfixDebt} debt)`, no: !idle ? 'finish the fight first' : run.commits < TUNE.hotfixCommits ? 'not enough commits' : '' });
    if (n.state === 'unvetted' && mapSel !== 'app') acts.push({ key: 'P', id: 'pin', label: `Pin version (${run.tools.pin} charge${run.tools.pin === 1 ? '' : 's'})`, no: n.pinned ? 'already pinned' : run.tools.pin < 1 ? 'buy Pin Version at the registry' : '' });
    if (n.kind !== 'pkg' && mapSel !== 'app') acts.push({ key: 'C', id: 'contain', label: `Containerize (${run.tools.container} charge${run.tools.container === 1 ? '' : 's'})`, no: n.contained ? 'already contained' : run.tools.container < 1 ? 'buy Container at the registry' : '' });
    if (n.kind === 'pkg') acts.push({ key: 'X', id: 'uninstall', label: confirmX === mapSel ? 'REALLY uninstall? press X again' : 'Uninstall package', no: run.cur !== 'app' ? 'only from app' : !idle ? 'finish the fight first' : '' });
    return acts;
  }

  function renderMapInfo() {
    const run = game.run, g = run.graph, n = g.nodes[mapSel], obs = game.stats.obs;
    if (!n) return;
    const known = obs >= 1 || n.visited || n.kind !== 'dep';
    const deps = [...G.dependents(g, mapSel)].filter((id) => g.nodes[id].kind === 'pkg').map((id) => g.nodes[id].name);
    let html = `<h3>${esc(n.name)}</h3><div class="st ${mapSel === 'app' ? 'vetted' : n.state}">${mapSel === 'app' ? 'HOME' : n.state.toUpperCase()}${n.pinned ? ' · PINNED' : ''}${n.contained ? ' · CONTAINED' : ''}${n.hotfixed ? ' · HOTFIXED' : ''}</div>`;
    html += `<p><i>${esc(n.blurb)}</i></p>`;
    if (n.state === 'down') html += `<p style="color:#ff4d5e">${esc(n.downWhy)}. Everything that requires it is offline until it is fixed.</p>`;
    if (mapSel !== 'app') html += `<p>Risk: ${known ? ['none', 'low', '▲ medium', '☠ high'][n.risk] + (n.flag ? ' — ' + flagText[n.flag] : '') : '? (observability 1 shows it)'}</p>`;
    if (n.kind === 'pkg') {
      const s = S.pkgStatus(game, mapSel);
      html += `<div class="k">POWER</div><p>${esc(PACKAGES[mapSel].power)}<br><span style="color:#5bff8a">★ hardened: ${esc(PACKAGES[mapSel].hard)}</span></p>`;
      html += `<p>Status: <b style="color:${{ ok: '#3ef0e0', hard: '#5bff8a', down: '#ff4d5e', conflict: '#ff5ad0' }[s]}">${{ ok: 'online', hard: 'HARDENED', down: 'OFFLINE — ' + (run.degraded[mapSel] ? g.nodes[run.degraded[mapSel]].name + ' is down' : ''), conflict: 'failed to load (version conflict)' }[s]}</b>${G.isIntegrated(g, mapSel) ? '' : ' · not integrated yet'}</p>`;
    } else if (deps.length) html += `<div class="k">REQUIRED BY</div><p>${esc(deps.join(', '))}${deps.length > 1 ? ' <span style="color:#7fb2ff">(shared: single point of failure)</span>' : ''}</p>`;
    if (n.lib) {
      const c = G.conflicts(g, run.shims).find((x) => x.lib === n.lib);
      if (c) html += `<p style="color:#ff5ad0">⚡ ${esc(c.a)} vs ${esc(c.b)}: ${c.resolved ? 'resolved (both vetted)' : c.shimmed ? 'shimmed (breaks under load)' : 'UNRESOLVED — vet both rooms, or buy a shim'}</p>`;
    }
    html += '<div class="acts">' + mapActions().map((a) => `<div class="act${a.no ? ' no' : ''}" data-act="${a.id}"><kbd>${a.key}</kbd> ${esc(a.label)}${a.no ? ` <small>— ${esc(a.no)}</small>` : ''}</div>`).join('') + '</div>';
    html += `<div class="legend"><b class="v">■</b> vetted <b class="u">□</b> unvetted <b class="d">■</b> down <b class="c">┄</b> conflict <b class="w">▢</b> hardened<br>Arrows / click: select · left → right is deeper into the tree</div>`;
    $('mapinfo').innerHTML = html;
  }

  function renderMap() {
    $('overlay').innerHTML = `<div class="ov"><span class="close"><kbd>Tab</kbd>/<kbd>Esc</kbd> close</span><h2>DEPENDENCY GRAPH</h2>
      <div class="lede">The graph is the dungeon. Every node is a room; every edge is a door. What you install grows it.</div>
      <div id="mapwrap"><canvas id="bigmap" width="1280" height="1140"></canvas><div id="mapinfo"></div></div></div>`;
    drawBigMap(performance.now() / 1000);
    renderMapInfo();
  }

  function mapAct(id) {
    let ok = false;
    if (id === 'travel') { if (S.travel(game, mapSel)) { UI.close(); return; } }
    else if (id === 'hotfix') ok = S.hotfix(game, mapSel);
    else if (id === 'pin') ok = S.pin(game, mapSel);
    else if (id === 'contain') ok = S.contain(game, mapSel);
    else if (id === 'uninstall') {
      if (confirmX !== mapSel) { confirmX = mapSel; ok = true; }
      else { ok = S.uninstall(game, mapSel); confirmX = null; if (ok) mapSel = 'app'; }
    }
    if (!ok) DH.Audio.sfx('denied');
    drawBigMap(performance.now() / 1000);
    renderMapInfo();
  }

  function mapMove(dx, dy) {
    if (!mapPos) return;
    const cur = mapPos[mapSel];
    if (!cur) return;
    let best = null, bs = 1e9;
    for (const id of Object.keys(mapPos)) {
      if (id === mapSel || id === 'prod') continue;
      const p = mapPos[id];
      const ax = (p.x - cur.x) * dx + (p.y - cur.y) * dy; // distance along the pressed direction
      if (ax <= 4) continue;
      const off = Math.abs((p.x - cur.x) * dy) + Math.abs((p.y - cur.y) * dx);
      const score = ax + off * 2.2;
      if (score < bs) { bs = score; best = id; }
    }
    if (best) { mapSel = best; confirmX = null; DH.Audio.sfx('ui'); renderMapInfo(); drawBigMap(performance.now() / 1000); }
  }

  // ---- deploy
  function renderDeploy() {
    const run = game.run, plan = S.bossPlan(game), obs = game.stats.obs, feats = S.features(game);
    const can = S.canDeploy(game);
    const real = plan.strikes.filter((s) => s.why !== 'probe');
    let html = `<div class="ov"><div class="center"><h2>${can ? 'DEPLOY v1.0 TO PRODUCTION?' : 'NOT READY TO DEPLOY'}</h2>`;
    if (!can) html += `<p>The release needs <b style="color:#eaffff">${TUNE.featuresNeeded} shipped features</b>; you have ${feats}. Install a package at the registry, then clear its room (east doors) to integrate it.</p><p>Or wait: at T-0 the train leaves regardless.</p><div class="btns"><span class="btn dim" data-act="close">ESC — back to work</span></div>`;
    else {
      html += `<p>Production will audit your architecture. Every node you never vetted gets struck mid-fight, and whatever depends on it goes dark.</p><ul>`;
      html += `<li class="${feats >= TUNE.featuresNeeded ? 'ok' : 'bad'}">features shipped: ${feats}/${TUNE.featuresNeeded}${plan.missing ? ' — stakeholders will be enraged (boss is faster)' : ''}</li>`;
      html += `<li class="${real.length ? 'bad' : 'ok'}">weak points: ${real.length}${real.length && obs >= 2 ? ' (' + esc(real.map((s) => s.shim ? s.shim + ' shim' : run.graph.nodes[s.node].name).join(', ')) + ')' : real.length ? ' (observability 2 would name them)' : ' — nothing to strike'}</li>`;
      if (plan.down) html += `<li class="bad">${plan.down} node${plan.down > 1 ? 's' : ''} still DOWN: those packages stay offline</li>`;
      html += `<li>${obs >= 2 ? 'waiting for you: <b style="color:#eaffff">' + plan.name + '</b> — ' + esc(plan.why) : 'waiting for you: ??? (observability 2 would say)'}</li>`;
      if (!run.freeze && run.ticksLeft > 0) html += `<li class="ok">${run.ticksLeft} room${run.ticksLeft > 1 ? 's' : ''} left on the clock if you would rather keep vetting</li>`;
      html += `</ul><div class="btns"><span class="btn" data-act="ship">ENTER — SHIP IT</span><span class="btn dim" data-act="close">ESC — not yet</span></div>`;
    }
    $('overlay').innerHTML = html + '</div></div>';
  }

  // ---- help
  function renderHelp() {
    $('overlay').innerHTML = `<div class="ov"><span class="close"><kbd>Esc</kbd> close</span><h2>HOW TO SHIP</h2>
      <div class="lede">You are the last engineer awake. Ship v1.0 before the release train leaves.</div><div class="help">
      <div><h4>THE LOOP</h4>
      <p>1. At the <b>REGISTRY</b> (in <b>app</b>) install a package. You get its power immediately.</p>
      <p>2. Its dependency tree becomes new rooms. Clear the package's room to <b>integrate</b> it: that ships a feature.</p>
      <p>3. Ship ${TUNE.featuresNeeded} features, then walk into the <b>DEPLOY</b> door and beat production.</p>
      <h4>THE CLOCK</h4>
      <p>Every room you clear moves the train one step. At T-0: change freeze, deploy with what you have.</p>
      <h4>THE GRAPH</h4>
      <p><span class="a">□ Unvetted</span> nodes are liabilities. Every few rooms the <b>pager</b> takes one <span class="r">■ down</span>, and every package that depends on it — directly or transitively — goes <span class="r">offline</span> until you clear its room (or hotfix it for debt).</p>
      <p><span class="g">■ Vetted</span> nodes are safe. Vet a package's <i>whole</i> tree and it becomes <span class="g">★ hardened</span>: a stronger power.</p>
      <p><span class="m">Version conflicts</span>: two packages needing different majors of one library. Each fight, one side fails to load — until you vet both versions or buy a shim.</p></div>
      <div><h4>PRODUCTION</h4>
      <p>The boss strikes every unvetted node, breaks every shim, and force-upgrades every pin, mid-fight. Vetted nodes hold. What it <i>is</i> depends on what you built.</p>
      <h4>NUMBERS</h4>
      <p><b>Stability</b> is health. <b>Commits</b> buy tools at the registry. <b>Tech debt</b> makes rooms nastier and the pager faster. <b>Observability</b> shows risks, enemy health, and pager forecasts.</p>
      <h4>CONTROLS</h4>
      <p><kbd>WASD</kbd> move · <kbd>Mouse</kbd> aim, hold to fire · <kbd>Arrows</kbd> fire without a mouse</p>
      <p><kbd>Space</kbd> dash (brief invulnerability) · <kbd>E</kbd> use terminal</p>
      <p><kbd>Tab</kbd> map + fast travel · <kbd>Q</kbd> feature flag · <kbd>R</kbd> rollback</p>
      <p><kbd>H</kbd> this screen · <kbd>N</kbd> sound · <kbd>Esc</kbd> pause</p></div></div></div>`;
  }

  // ---- title + report
  function titleHTML() {
    const m = hooks.meta();
    return `<h1 id="title-logo">DEPENDENCY<br><span>HELL</span></h1>
      <div class="tagline">An action roguelite about surviving the software you installed.</div>
      <div class="pitch">Every package is a power. Every package is also a dungeon: its dependency tree becomes rooms you must clear before the pager finds them. Ship three features before the release train leaves. Production will audit whatever you built.</div>
      <div class="start">▶ PRESS ENTER TO START THE SPRINT</div>
      <div class="controls"><span><b>WASD</b> move</span><span><b>Mouse / Arrows</b> aim + fire</span><span><b>Space</b> dash</span><span><b>E</b> use</span>
      <span><b>Tab</b> map</span><span><b>Q</b> feature flag</span><span><b>H</b> help, in game</span><span><b>N</b> sound</span></div>
      <div class="meta">${m.runs ? `runs ${m.runs} · shipped ${m.wins} · best grade ${m.best || '—'}<br>` : ''}it is funny because it is true</div>`;
  }

  function reportHTML() {
    const r = DH.Reports.build(game);
    const m = hooks.meta();
    const left = `<div><h2>${r.title}</h2><div class="sub">${esc(r.sub)}</div>` +
      r.fields.map(([k, v]) => `<div class="f"><b>${esc(k)}</b>${esc(v)}</div>`).join('') +
      r.sections.map(([h, items]) => `<h4>${esc(h)}</h4><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`).join('') + '</div>';
    const right = `<div><h4>FINAL ARCHITECTURE</h4><canvas id="report-graph" width="920" height="420"></canvas>
      <div class="stats">${r.stats.map(([k, v]) => `<span>${esc(k)} <b>${esc(v)}</b></span>`).join('')}</div>
      <h4>TIMELINE</h4><div class="tl">${r.timeline.map((e) => `<div class="${e.bad ? 'bad' : e.good ? 'good' : ''}"><i>${e.t}</i> ${esc(e.text)}</div>`).join('')}</div></div>`;
    return `<div class="report${r.won ? ' won' : ''}">${left}${right}<div class="grade" style="color:${r.won ? '#5bff8a' : '#ff4d5e'}">${r.grade}</div>
      <div class="again">▶ ENTER — NEXT SPRINT</div><div class="seed">run #${m.runs} · seed ${r.seed} · ${esc(r.identity)}</div></div>`;
  }
  function drawReportGraph() {
    const cv = $('report-graph');
    const c = cv.getContext('2d');
    c.setTransform(2, 0, 0, 2, 0, 0);
    Rn.drawGraph(c, game, 460, 210, { pkgLabels: true, t: 0 });
  }

  // ------------------------------------------------------------------ input
  function onOverlayClick(e) {
    const el = e.target.closest('[data-card],[data-tool],[data-act]');
    if (UI.mode === 'map' && e.target.id === 'bigmap' && mapPos) {
      const r = e.target.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 640, y = ((e.clientY - r.top) / r.height) * 570;
      let best = null, bd = 30;
      for (const id of Object.keys(mapPos)) {
        if (id === 'prod') continue;
        const d = Math.hypot(mapPos[id].x - x, mapPos[id].y - y);
        if (d < bd) { bd = d; best = id; }
      }
      if (best) { if (best === mapSel) mapAct('travel'); else { mapSel = best; confirmX = null; DH.Audio.sfx('ui'); renderMapInfo(); drawBigMap(performance.now() / 1000); } }
      return;
    }
    if (!el) return;
    if (el.dataset.card != null) {
      const i = +el.dataset.card;
      if (i === regSel) doInstall(); else { regSel = i; DH.Audio.sfx('ui'); renderRegistry(); }
    } else if (el.dataset.tool) { buy(el.dataset.tool); }
    else if (el.dataset.act) {
      if (UI.mode === 'map') mapAct(el.dataset.act);
      else if (el.dataset.act === 'close') UI.close();
      else if (el.dataset.act === 'ship') ship();
    }
  }
  function doInstall() { if (S.install(game, regSel)) UI.close(); else DH.Audio.sfx('denied'); }
  function buy(id) { if (!S.buyTool(game, id)) DH.Audio.sfx('denied'); renderRegistry(); }
  function ship() { UI.close(); S.deploy(game); }

  // Returns true if the key was consumed by an overlay.
  UI.key = function (code, e) {
    if (!UI.mode) return false;
    if (UI.mode === 'title' || UI.mode === 'report') {
      // the report only takes Enter, and not instantly: a dash-masher should still get to read it
      if (UI.mode === 'title' ? code === 'Enter' || code === 'Space' : code === 'Enter' && performance.now() - UI.reportAt > 700) hooks.newRun();
      return true;
    }
    if (code === 'Escape') { UI.close(); return true; }
    if (UI.mode === 'registry') {
      const n = game.run.offers.length;
      const open = !game.run.offerTaken && !game.run.freeze && n;
      if (code === 'ArrowLeft' && open) { regSel = (regSel + n - 1) % n; DH.Audio.sfx('ui'); renderRegistry(); }
      else if (code === 'ArrowRight' && open) { regSel = (regSel + 1) % n; DH.Audio.sfx('ui'); renderRegistry(); }
      else if (/^Digit[1-3]$/.test(code) && open && +code[5] <= n) { regSel = +code[5] - 1; DH.Audio.sfx('ui'); renderRegistry(); }
      else if (code === 'Enter' && open) doInstall();
      else if (TOOL_KEYS.indexOf(code) >= 0 && !e.repeat) buy(TOOLS[TOOL_KEYS.indexOf(code)].id);
      return true;
    }
    if (UI.mode === 'map') {
      if (code === 'Tab' || code === 'KeyM') UI.close();
      else if (code === 'ArrowLeft') mapMove(-1, 0);
      else if (code === 'ArrowRight') mapMove(1, 0);
      else if (code === 'ArrowUp') mapMove(0, -1);
      else if (code === 'ArrowDown') mapMove(0, 1);
      else if (code === 'Enter') mapAct('travel');
      else if (code === 'KeyH') mapAct('hotfix');
      else if (code === 'KeyP') mapAct('pin');
      else if (code === 'KeyC') mapAct('contain');
      else if (code === 'KeyX') mapAct('uninstall');
      return true;
    }
    if (UI.mode === 'deploy') { if (code === 'Enter' && S.canDeploy(game)) ship(); return true; }
    if (UI.mode === 'help') { if (code === 'KeyH' || code === 'Enter') UI.close(); return true; }
    return true;
  };

  DH.UI = UI;
})();
