// Postmortems and release reports. Every line is derived from run state / the event log:
// the humor is in the phrasing, the facts are real.
(function () {
  const DH = (window.DH = window.DH || {});
  const R = {};
  const { TUNE, PACKAGES } = DH.content;

  const list = (arr) => (arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]);
  const T = (e) => 'T-' + String(e.left).padStart(2, '0');

  function debtLabel(d) {
    return d <= 0 ? 'Suspiciously clean' : d < 25 ? 'Manageable' : d < 50 ? 'Compounding' : d < 80 ? 'Glowing' : 'Haunted';
  }
  R.debtLabel = debtLabel;

  function facts(game) {
    const run = game.run, g = run.graph, nodes = g.nodes, G = DH.Graph;
    const ids = Object.keys(nodes).filter((id) => id !== 'app');
    const pk = G.packages(g);
    return {
      run, g, nodes, ids, pk,
      names: pk.map((p) => nodes[p].name),
      unvetted: ids.filter((id) => nodes[id].state === 'unvetted'),
      down: ids.filter((id) => nodes[id].state === 'down'),
      vetted: ids.filter((id) => nodes[id].state === 'vetted'),
      hardened: pk.filter((p) => G.isHardened(g, p)),
      pins: ids.filter((id) => nodes[id].pinned),
      contained: ids.filter((id) => nodes[id].contained),
      cve: ids.filter((id) => nodes[id].flag === 'cve' && nodes[id].state !== 'vetted'),
      conflicts: G.conflicts(g, run.shims),
      log: run.log,
      of: (kind) => run.log.filter((e) => e.kind === kind),
      features: pk.filter((p) => G.isIntegrated(g, p)).length,
    };
  }

  function timeline(f, max) {
    const keep = ['install', 'incident', 'conflict', 'hotfix', 'shim', 'pin', 'hardened', 'averted', 'freeze', 'deploy', 'strike', 'held', 'rollback', 'uninstall', 'resolved', 'death', 'win'];
    let ev = f.log.filter((e) => keep.includes(e.kind));
    const bad = ['incident', 'conflict', 'strike', 'death', 'hotfix'];
    if (ev.length > max) {
      // keep the first install, every bad thing, and the ending
      const must = ev.filter((e, i) => bad.includes(e.kind) || i === 0 || i >= ev.length - 2 || e.kind === 'deploy');
      const rest = ev.filter((e) => !must.includes(e));
      while (must.length < max && rest.length) must.push(rest.shift());
      ev = must.sort((a, b) => f.log.indexOf(a) - f.log.indexOf(b)).slice(-max);
    }
    return ev.map((e) => ({ t: e.kind === 'strike' || e.kind === 'held' || e.kind === 'win' || (e.kind === 'death' && f.run.death && f.run.death.inBoss) ? 'PROD' : T(e), text: e.text, bad: bad.includes(e.kind), good: ['hardened', 'averted', 'held', 'win', 'resolved'].includes(e.kind) }));
  }

  function architecture(f) {
    const bits = [];
    if (f.contained.length) bits.push('containers');
    if (Object.keys(f.run.shims).length) bits.push('compat shims');
    if (f.pins.length) bits.push('pinned ' + f.nodes[f.pins[0]].name);
    if (f.run.stats.flags) bits.push('feature flags nobody will remove');
    for (const p of f.pk.slice(0, 3)) bits.push(f.nodes[p].name.split('@')[0]);
    const script = f.pk.includes('do-not-delete') ? ' and one shell script named do-not-delete.sh' : '';
    const adj = f.unvetted.length + f.down.length === 0 ? 'A suspiciously well-understood' : f.unvetted.length > 5 ? 'A terrifying but functional' : 'A mostly load-bearing';
    return `${adj} braid of ${list(bits.slice(0, 5)) || 'nothing at all'}${script}.`;
  }

  function identity(f) {
    const s = f.run.stats;
    if (!f.pk.length) return 'The Minimalist';
    if (f.unvetted.length + f.down.length === 0) return 'The Paranoid Maintainer';
    if (f.run.debt >= 60) return 'The Debt Collector';
    if (s.hotfixes >= 2) return 'The Hotfix Artist';
    if (f.pins.length >= 2) return 'The Version Hoarder';
    if (f.unvetted.length >= 8) return 'The YOLO Deployer';
    if (f.hardened.length >= 2) return 'The Hardener';
    if (f.ids.length >= 16) return 'The Dependency Maximalist';
    return 'The Pragmatist';
  }

  function actionItems(f, lost) {
    const out = [];
    const s = f.run.stats;
    if (f.unvetted.length > 3) out.push(`Vet dependencies before the dependencies vet you (${f.unvetted.length} never looked at).`);
    if (f.run.debt >= 40) out.push('Schedule a tech-debt sprint. (Carried over from the previous six postmortems.)');
    if (f.pk.includes('left-pad')) out.push('Stop depending on eleven lines of code maintained by a stranger.');
    if (s.hotfixes) out.push(`Stop fixing prod from the map screen (${s.hotfixes} hotfix${s.hotfixes > 1 ? 'es' : ''}).`);
    if (f.conflicts.some((c) => !c.resolved)) out.push('Pick one version of ' + f.conflicts.find((c) => !c.resolved).lib + '. Any version. Please.');
    if (f.pins.length) out.push(`Unpin ${f.nodes[f.pins[0]].name} "next quarter".`);
    if (game_obs(f) <= 1) out.push('Add observability. You cannot fix what you cannot see, but you can be surprised by it.');
    if (f.pk.includes('do-not-delete')) out.push('Find out what do-not-delete.sh does. Do not delete it.');
    if (f.pk.includes('vibe-coder')) out.push('Review the code the autocomplete wrote. All of it.');
    if (s.incidents >= 3) out.push('Rename the pager channel from #incidents to #tuesday.');
    if (lost && !out.length) out.push('Dodge.');
    if (!out.length) out.push('None. This has never happened before and will not be believed.');
    return out.slice(0, 5);
  }
  const game_obs = (f) => f.run._obs;

  function wentWell(f) {
    const out = [];
    const s = f.run.stats;
    if (s.averted) out.push(`${s.averted} incident${s.averted > 1 ? 's' : ''} averted by vetting the target first.`);
    for (const p of f.hardened.slice(0, 2)) out.push(`${f.nodes[p].name} was fully vetted and hardened.`);
    if (s.strikesHeld) out.push(`${s.strikesHeld} of prod's dependency strikes bounced off vetted nodes.`);
    if (f.contained.length) out.push(`A container kept ${f.nodes[f.contained[0]].name} from taking anyone down with it.`);
    if (f.of('rollback').length) out.push('The rollback plan existed, and was used, which is rarer than it sounds.');
    if (f.of('deduped').length) out.push('A version conflict was actually resolved instead of shimmed.');
    if (s.kills >= 60) out.push(`${s.kills} bugs fixed. Roughly ${s.kills * 3} remain.`);
    if (!out.length) out.push('The build log was very detailed.');
    return out.slice(0, 4);
  }

  function rootCause(f) {
    const run = f.run, d = run.death, nodes = f.nodes;
    const where = d.inBoss ? `production, mid-deploy, fighting ${run.boss.name}` : `${nodes[d.node].name}` + (run.log.some((e) => e.kind === 'incident' && e.node === d.node) ? ' (during its incident)' : '');
    let s = `Stability reached 0 in ${where}. The killing blow: ${d.source}.`;
    const deg = Object.keys(d.degraded);
    if (deg.length) {
      const byCause = {};
      for (const p of deg) (byCause[d.degraded[p]] = byCause[d.degraded[p]] || []).push(nodes[p] ? nodes[p].name : p);
      let incidentNode = null;
      const parts = Object.keys(byCause).map((c) => {
        const n = nodes[c];
        const who = list(byCause[c]), were = byCause[c].length > 1 ? 'were' : 'was';
        const inc = run.log.filter((e) => (e.kind === 'incident' || e.kind === 'strike') && e.node === c).pop();
        if (inc && inc.kind === 'strike') return `${who} went dark when prod struck ${n.name}, which nobody had ever vetted`;
        if (inc && !incidentNode) incidentNode = n;
        return `${who} ${were} offline because ${n ? n.name : c} had been down${inc ? ' since ' + T(inc) : ''} (${n && n.downWhy ? n.downWhy : 'cause unknown'})`;
      });
      s += ' At the time, ' + parts.join('; ') + '.';
      if (incidentNode) s += ` ${incidentNode.name} arrived at T-${String(TUNE.ticksTotal - incidentNode.bornTick).padStart(2, '0')} and was never vetted.`;
    } else if (Object.keys(d.suppressed).length) {
      const lib = Object.values(d.suppressed)[0];
      s += ` ${list(Object.keys(d.suppressed).map((p) => nodes[p].name))} had failed to load because of the unresolved ${lib} version conflict.`;
    } else {
      s += ' Every package was online. This one is on the engineer.';
    }
    return s;
  }

  function factors(f) {
    const out = [];
    const run = f.run, s = run.stats;
    if (f.unvetted.length) out.push(`${f.unvetted.length} dependenc${f.unvetted.length > 1 ? 'ies' : 'y'} never vetted` + (f.unvetted.length <= 4 ? ` (${list(f.unvetted.map((id) => f.nodes[id].name))})` : '') + '.');
    if (f.down.length) out.push(`${list(f.down.map((id) => f.nodes[id].name))} still down at time of death.`);
    if (run.debt >= 25) {
      const top = Object.entries(s.debtBy).sort((a, b) => b[1] - a[1])[0];
      out.push(`Technical debt: ${Math.round(run.debt)} (${debtLabel(run.debt)})` + (top ? `, mostly from ${top[0]}.` : '.'));
    }
    if (run._obs <= 1) out.push('Observability below recommended threshold. The pager forecast was unreadable.');
    for (const c of f.conflicts) if (!c.resolved) out.push(`${c.a} and ${c.b} were both loaded` + (c.shimmed ? ', held together by a shim.' : '. Nothing was holding them together.'));
    if (s.hotfixes) out.push(`${s.hotfixes} hotfix${s.hotfixes > 1 ? 'es' : ''} applied from the map screen.`);
    if (run.freeze && f.features < TUNE.featuresNeeded) out.push(`Deployed with ${f.features}/${TUNE.featuresNeeded} features. Stakeholders were "disappointed".`);
    const top = Object.entries(s.dmgBy).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k} (${Math.round(v)})`);
    if (top.length) out.push('Most stability lost to: ' + top.join(', ') + '.');
    if (!out.length) out.push('None identified. The investigation continues, i.e. it has been closed.');
    return out.slice(0, 6);
  }

  R.build = function (game) {
    const run = game.run;
    run._obs = game.stats.obs;
    const f = facts(game);
    const s = run.stats;
    const mins = Math.floor(run.time / 60), secs = String(Math.floor(run.time % 60)).padStart(2, '0');
    const common = {
      seed: DH.seedToCode(run.seed), identity: identity(f), architecture: architecture(f),
      timeline: timeline(f, 12),
      stats: [
        ['Bugs patched', s.kills], ['Rooms cleared', s.rooms], ['Nodes in graph', f.ids.length + 1],
        ['Vetted / unvetted', `${f.vetted.length} / ${f.unvetted.length + f.down.length}`],
        ['Incidents / averted', `${s.incidents} / ${s.averted}`], ['Technical debt', `${Math.round(run.debt)} (${debtLabel(run.debt)})`],
        ['Time', `${mins}:${secs}`],
      ],
    };
    if (run.phase === 'won') {
      const hot = s.hotfixes + Object.keys(run.shims).length;
      const version = '1.0.0' + (hot ? `-hotfix.${hot}` : '') + (run.freeze && f.features < TUNE.featuresNeeded ? '-mvp' : '');
      const impact = run.stability >= 70 ? 'Minimal' : run.stability >= 40 ? 'Noticeable, but nobody has tweeted yet' : run.stability >= 15 ? 'Significant. Support has been "looped in"' : 'The status page is also down';
      const known = f.unvetted.length + f.down.length;
      const grade = (run.stability >= 60 ? 2 : run.stability >= 30 ? 1 : 0) + (known === 0 ? 2 : known <= 3 ? 1 : 0) + (run.debt < 25 ? 2 : run.debt < 50 ? 1 : 0) + (s.strikesLanded === 0 ? 1 : 0);
      return Object.assign(common, {
        won: true, title: 'RELEASE COMPLETE', sub: `v${version} is live. The pager is quiet.`,
        grade: ['D', 'D', 'C', 'C', 'B', 'B', 'A', 'S'][grade],
        fields: [
          ['Version', version],
          ['Defeated', run.boss.name + ' — ' + run.boss.why],
          ['Customer impact', impact],
          ['Features shipped', `${f.features}/${TUNE.featuresNeeded}` + (f.features > TUNE.featuresNeeded ? ' (scope creep, but the good kind)' : '')],
          ['Known issues', known === 0 ? 'None. Legal is suspicious.' : `${known}, but legally acceptable` + (known <= 4 ? ` (${list(f.unvetted.concat(f.down).map((id) => f.nodes[id].name))})` : '')],
          ['Security risk', f.cve.length ? `High: shipped with ${list(f.cve.map((id) => f.nodes[id].name))}` : f.unvetted.length > 4 ? 'Medium' : 'Low'],
          ['Technical debt', debtLabel(run.debt)],
          ['Morale', run.stability >= 70 ? 'Unusually high' : run.stability >= 30 ? 'Present' : 'Left on read'],
          ['Final architecture', architecture(f)],
        ],
        sections: [['WHAT WENT WELL', wentWell(f)], ['CLEANUP TICKETS (WILL NOT BE DONE)', actionItems(f, false)]],
      });
    }
    const d = run.death;
    return Object.assign(common, {
      won: false, title: 'POSTMORTEM', sub: d.inBoss ? 'Production outage during release deployment.' : `Total outage at ${T(d)}, ${f.features}/${TUNE.featuresNeeded} features shipped.`,
      grade: 'F',
      fields: [['Root cause', rootCause(f)], ['Build identity', identity(f)], ['Final architecture', architecture(f)]],
      sections: [['CONTRIBUTING FACTORS', factors(f)], ['WHAT WENT WELL', wentWell(f)], ['ACTION ITEMS', actionItems(f, true)]],
    });
  };

  R.text = function (game) {
    const r = R.build(game);
    const out = [`${r.title} // seed ${r.seed} // grade ${r.grade}`, r.sub, ''];
    for (const [k, v] of r.fields) out.push(`${k}: ${v}`);
    for (const [h, items] of r.sections) { out.push('', h); for (const i of items) out.push('  - ' + i); }
    out.push('', 'TIMELINE');
    for (const t of r.timeline) out.push(`  ${t.t}  ${t.text}`);
    out.push('');
    for (const [k, v] of r.stats) out.push(`${k}: ${v}`);
    return out.join('\n');
  };

  DH.Reports = R;
})();
