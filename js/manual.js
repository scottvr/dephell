// Fills manual.html's reference sections (data-gen="...") from the game's own data, so the manual
// cannot drift from the game: packages, dependencies, enemies, bosses, tools and projects all come
// from js/content.js, prose about them from js/manual-copy.js, art from js/sprites.js.
(function () {
  const DH = window.DH;
  const { PACKAGES, DEPS, ENEMIES, BOSSES, TOOLS, PROJECTS, ECO, TUNE } = DH.content;
  const SP = DH.Sprites, G = DH.Graph, COPY = DH.manualCopy;

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const riskMark = (r) => (r >= 3 ? ' <span class="risk3" title="very risky">&#9760;</span>' : r === 2 ? ' <span class="risk2" title="risky">&#9650;</span>' : '');
  const FLAG = { cve: 'known CVE', abandoned: 'abandoned', license: 'license trouble', unpublish: 'unpublishable' };
  const fill = (name, html) => document.querySelectorAll(`[data-gen="${name}"]`).forEach((el) => { el.innerHTML = html; });

  // ---------------------------------------------------------------- art
  // a small canvas, drawn at 1x and scaled up by CSS (image-rendering: pixelated)
  function canvas(w, h, draw, cls) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h; cv.className = 'px ' + (cls || '');
    const ctx = cv.getContext('2d');
    draw(ctx);
    return cv;
  }
  const blit = (ctx, img, x, y) => ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
  function disc(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); ctx.fillRect(x - w, y + dy, w * 2 + 1, 1); }
  }
  const bossSwap = (variant) => ({ s: BOSSES[variant].color, h: '#eaffff', d: '#0a1114', e: '#10181c' });
  function drawEnemy(ctx, type, x, y) {
    switch (type) {
      case 'regression': blit(ctx, SP.get('bug0', { r: '#b06bff', R: '#6a35b8' }), x, y); break;
      case 'leak': disc(ctx, x, y, 7, '#1e5fa8'); disc(ctx, x - 1, y - 1, 5, '#4ab8ff'); ctx.fillStyle = '#eaffff'; ctx.fillRect(x - 3, y - 3, 2, 2); ctx.fillStyle = '#062226'; ctx.fillRect(x - 3, y, 2, 2); ctx.fillRect(x + 2, y, 2, 2); break;
      case 'vconflict':
        for (let dy = -9; dy <= 9; dy++) { const w = 9 - Math.abs(dy); ctx.fillStyle = '#3ef0e0'; ctx.fillRect(x - w, y + dy, w, 1); ctx.fillStyle = '#1fa89e'; ctx.fillRect(x, y + dy, w, 1); }
        SP.text(ctx, 'V1', x, y - 2, '#05090b', 1, 0.5);
        break;
      case 'cycle':
        ctx.fillStyle = '#3ef0e0'; ctx.fillRect(x - 8, y, 16, 1);
        blit(ctx, SP.get('cycle0'), x - 9, y); blit(ctx, SP.get('cycle0'), x + 9, y);
        break;
      case 'boss': blit(ctx, SP.get('boss', bossSwap('friday')), x, y); break;
      default: blit(ctx, SP.get(type === 'bug' ? 'bug0' : type + '0'), x, y);
    }
  }

  // ---------------------------------------------------------------- cover
  function cover() {
    const t = document.getElementById('cover-title');
    if (t) {
      const ctx = t.getContext('2d');
      SP.text(ctx, 'DEPENDENCY', 2, 2, '#3ef0e0', 2);
      SP.text(ctx, 'HELL', 2, 16, '#ff4d5e', 4);
    }
    const art = document.getElementById('cover-art');
    if (art) art.appendChild(canvas(150, 56, (ctx) => {
      ctx.fillStyle = '#05090b'; ctx.fillRect(0, 0, 150, 56);
      ctx.fillStyle = '#12282b'; for (let x = 4; x < 150; x += 8) for (let y = 4; y < 56; y += 8) ctx.fillRect(x, y, 1, 1); // floor grid
      for (let i = 0; i < 3; i++) blit(ctx, SP.get('rack'), 52 + i * 12, 46);
      blit(ctx, SP.get('player0'), 26, 30);
      ctx.fillStyle = '#eaffff'; ctx.fillRect(36, 29, 3, 1); ctx.fillRect(48, 29, 3, 1); ctx.fillRect(60, 30, 3, 1);
      blit(ctx, SP.get('boss', bossSwap('friday')), 116, 26);
      blit(ctx, SP.get('bug0'), 86, 14); blit(ctx, SP.get('race0'), 92, 42); blit(ctx, SP.get('breaking0'), 78, 32);
    }, 'cover-px'));
  }

  // ---------------------------------------------------------------- sections
  function enemies() {
    const plain = Object.keys(ENEMIES).filter((k) => k !== 'boss');
    // rated against ordinary room bugs; the Version Conflict (a miniboss) simply maxes out
    const max = (f) => Math.max(...plain.filter((k) => k !== 'vconflict').map((k) => ENEMIES[k][f]));
    const dots = (v, m) => { const n = Math.min(5, Math.max(1, Math.round((v / m) * 5))); return '&#9679;'.repeat(n) + '<span class="off">' + '&#9679;'.repeat(5 - n) + '</span>'; };
    const ecoOf = (type) => Object.keys(ECO).filter((e) => ECO[e][type]);
    return plain.map((type) => {
      const e = ENEMIES[type], c = COPY.enemies[type] || {};
      const where = ecoOf(type);
      return `<div class="entry enemy" id="enemy-${type}"><div class="art" data-enemy="${type}"></div><div class="txt">
        <h3>${esc(e.name)}</h3>
        <div class="stats">toughness ${dots(e.hp, max('hp'))} &nbsp; bite ${dots(e.dmg, max('dmg'))} &nbsp; speed ${dots(e.spd, max('spd'))}</div>
        <p>${esc(c.what || '')}</p>
        ${where.length ? `<p class="where">Found in ${where.map((w) => esc(w)).join(', ')} rooms.</p>` : type === 'vconflict' ? '<p class="where">Found where two versions of one library meet.</p>' : ''}
        ${c.note ? `<aside class="fieldnote"><b>Field Note</b> ${esc(c.note)}</aside>` : ''}
      </div></div>`;
    }).join('');
  }

  function bosses() {
    return Object.keys(BOSSES).map((v) => {
      const b = BOSSES[v], c = COPY.bosses[v] || {};
      return `<div class="entry boss"><div class="art" data-boss="${v}"></div><div class="txt">
        <h3 style="color:${b.color === '#3ef0e0' || b.color === '#ffc24a' ? '#1d1a16' : b.color}">${esc(b.name)}</h3>
        <p class="why">&ldquo;${esc(b.why)}&rdquo;</p>
        <p><b>Summoned by:</b> ${esc(c.when || '')}</p>
        <p><b>Signature:</b> ${esc(c.sig || '')}</p>
        ${c.note ? `<aside class="fieldnote"><b>Field Note</b> ${esc(c.note)}</aside>` : ''}
      </div></div>`;
    }).join('');
  }

  function tools() {
    return '<dl class="tools">' + TOOLS.map((t, i) => `<dt><span class="key">${'4567890-='[i]}</span> ${esc(t.name)} <span class="cost">${t.cost} commits</span></dt>
      <dd><b>${esc(t.desc)}</b> ${esc(t.how)}</dd>`).join('') + '</dl>';
  }

  function projects() {
    return Object.keys(PROJECTS).map((id) => {
      const p = PROJECTS[id];
      const facts = [`${p.ticks || TUNE.ticksTotal} rooms on the clock`, `${p.commits != null ? p.commits : 3} commits to start`];
      if (p.restock) facts.push(`registry restocks every ${p.restock} rooms`);
      if (p.obs) facts.push(`observability ${p.obs}`);
      if (p.debt) facts.push('starts in debt');
      if (p.tools) facts.push('comes with ' + Object.keys(p.tools).map((k) => (k === 'rollback' ? 'a Rollback Plan' : 'a ' + k)).join(' and '));
      if ((p.start || []).length) facts.push('inherits ' + p.start.map((s) => PACKAGES[s.pkg].name + (s.shipped ? ' (shipped)' : ' (unshipped)')).join(', '));
      return `<div class="entry project"><div class="txt">
        <p class="level">${esc(p.level)}</p><h3>${esc(p.name)}</h3><p class="why">${esc(p.tag)}</p>
        <p>${esc(COPY.projects[id] || p.brief)}</p>
        <p class="facts">${facts.map(esc).join(' &middot; ')}</p></div></div>`;
    }).join('');
  }

  function treeText(id) {
    const pv = G.preview(G.make(), id);
    const lines = pv.tree.slice(1).filter((n) => !n.repeat).map((n) => `${'&nbsp;&nbsp;'.repeat(n.depth - 1)}&#9492;&nbsp;${esc(n.name)}${riskMark(n.risk)}${n.flag ? ` <span class="flag">${esc(FLAG[n.flag] || n.flag)}</span>` : ''}`);
    return { html: lines.length ? lines.join('<br>') : '<i>(no dependencies)</i>', rooms: pv.rooms };
  }

  function packages() {
    return Object.keys(PACKAGES).map((id) => {
      const p = PACKAGES[id], [title, rest] = p.power.split('  '), t = treeText(id);
      const notes = [];
      if (p.starter) notes.push('Comes with the Starter Template; never offered by the registry.');
      if (p.flag === 'unpublish') notes.push('Unpublishable: the pager can take it down even after you vet it. A pin protects it.');
      if (p.grows) notes.push('Grows: at every registry restock it starts calling another legacy dependency, unvetted.');
      const cost = [`${t.rooms} room${t.rooms > 1 ? 's' : ''}`];
      if (p.debt) cost.push(`+${p.debt} debt`);
      if (p.risk >= 2) cost.push(`risky itself${p.flag ? ' (' + (FLAG[p.flag] || p.flag) + ')' : ''}`);
      return `<div class="entry pkg"><div class="txt">
        <h3>${esc(p.name)}</h3><p class="why">${esc(p.tag)}</p>
        <p class="power"><b>${esc(title)}</b> ${esc(rest || '')}<br><span class="hard">&#9733; hardened: ${esc(p.hard)}</span></p>
        <div class="tree">${t.html}</div>
        <p class="facts">${cost.map(esc).join(' &middot; ')}</p>
        ${notes.map((n) => `<p class="note">${esc(n)}</p>`).join('')}
      </div></div>`;
    }).join('');
  }

  function deps() {
    const usedBy = {};
    for (const id in PACKAGES) {
      const short = PACKAGES[id].name.split('@')[0];
      for (const d of closureOf(PACKAGES[id].deps)) (usedBy[d] = usedBy[d] || []).push(short);
      for (const d of closureOf(PACKAGES[id].grows || [])) if (!(usedBy[d] || []).includes(short)) (usedBy[d] = usedBy[d] || []).push(short + ' (grows into it)');
    }
    const rows = Object.keys(DEPS).sort((a, b) => DEPS[a].name.localeCompare(DEPS[b].name)).map((id) => {
      const d = DEPS[id], ecoMix = ECO[d.eco] || {};
      const bugs = Object.keys(ecoMix).sort((a, b) => ecoMix[b] - ecoMix[a]).map((k) => ENEMIES[k].name);
      return `<tr><td class="nm">${esc(d.name)}${riskMark(d.risk)}${d.flag ? `<br><span class="flag">${esc(FLAG[d.flag] || d.flag)}</span>` : ''}</td>
        <td>${esc(d.blurb)}<div class="mix">${esc(bugs.join(', '))}</div></td>
        <td class="used">${esc((usedBy[id] || []).join(', ') || (id === 'runtime' || id === 'stdlib' ? 'every project' : ''))}</td></tr>`;
    }).join('');
    return `<table class="deps"><tr><th>Dependency</th><th>What it is like, and what lives there</th><th>Pulled in by</th></tr>${rows}</table>`;
  }
  // every dependency reachable from a list of dependency ids
  function closureOf(list) {
    const out = new Set(), stack = [...list];
    while (stack.length) { const d = stack.pop(); if (out.has(d) || !DEPS[d]) continue; out.add(d); stack.push(...DEPS[d].deps); }
    return out;
  }

  // ---------------------------------------------------------------- go
  cover();
  fill('enemies', enemies());
  fill('bosses', bosses());
  fill('tools', tools());
  fill('projects', projects());
  fill('packages', packages());
  fill('deps', deps());
  document.querySelectorAll('[data-enemy]').forEach((el) => el.appendChild(canvas(40, 28, (ctx) => drawEnemy(ctx, el.dataset.enemy, 20, 14))));
  document.querySelectorAll('[data-boss]').forEach((el) => el.appendChild(canvas(48, 48, (ctx) => blit(ctx, SP.get('boss', bossSwap(el.dataset.boss)), 24, 24))));
  document.documentElement.classList.add('ready');
})();
