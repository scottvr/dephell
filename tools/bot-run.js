#!/usr/bin/env node
// Headless playtests: runs the real simulation with the autoplayer and reports outcomes.
//   node tools/bot-run.js [runs=40] [--report] [--seed=N] [--novet] [--with=<package id>] [--each] [--project=<id>]
//   --with forces a package to be the first install; --each runs that for every package and tabulates.
const path = require('path');
globalThis.window = globalThis;
for (const f of ['rng', 'content', 'graph', 'sim', 'reports', 'bot']) {
  try { require(path.join(__dirname, '..', 'js', f + '.js')); } catch (e) { if (f !== 'reports') throw e; }
}
const DH = globalThis.DH;
const args = process.argv.slice(2);
const runs = parseInt(args.find((a) => /^\d+$/.test(a)) || '40', 10);
const seedArg = args.find((a) => a.startsWith('--seed='));
const withArg = args.find((a) => a.startsWith('--with='));
const projArg = args.find((a) => a.startsWith('--project='));
const policy = { vet: !args.includes('--novet'), force: withArg ? withArg.split('=')[1] : null, project: projArg ? projArg.split('=')[1] : null };
if (policy.project && !DH.content.PROJECTS[policy.project]) { console.error('unknown project: ' + policy.project + ' (' + Object.keys(DH.content.PROJECTS).join(', ') + ')'); process.exit(1); }
if (policy.force && !DH.content.PACKAGES[policy.force]) { console.error('unknown package: ' + policy.force); process.exit(1); }

if (args.includes('--each')) {
  // Gate 4 overview: the same seeds with each package forced first. Flags anything far from baseline.
  const play = (force) => {
    let won = 0, stuck = 0, dmg = 0, t = 0;
    for (let i = 0; i < runs; i++) {
      const r = DH.Bot.play(1000 + i * 7919, { vet: policy.vet, force, project: policy.project }).run;
      if (r.phase === 'won') won++; else if (r.phase !== 'lost') stuck++;
      dmg += r.stats.dmgTaken; t += r.time;
    }
    return { won, stuck, dmg: dmg / runs, min: t / runs / 60 };
  };
  const base = play(null);
  const row = (name, r) => console.log(`${name.padEnd(18)} won ${String(r.won).padStart(3)}/${runs}  ${((r.won - base.won) / runs * 100 >= 0 ? '+' : '') + ((r.won - base.won) / runs * 100).toFixed(0).padStart(3)} pts  dmg ${r.dmg.toFixed(0).padStart(4)}  ${r.min.toFixed(1)} min${r.stuck ? '  STUCK ' + r.stuck : ''}${Math.abs(r.won - base.won) / runs > 0.1 ? '  <-- outside band' : ''}`);
  row('(baseline)', base);
  for (const id of Object.keys(DH.content.PACKAGES)) if (!DH.content.PACKAGES[id].starter) row(id, play(id));
  process.exit(0);
}

const out = { won: 0, lost: 0, stuck: 0 };
const deaths = {}, bosses = {}, killers = {};
let time = 0, rooms = 0, incidents = 0, bossDeaths = 0, stab = 0, pkgs = 0, bossTime = 0, bossN = 0, preBoss = 0, dmg = 0;
let last = null;
for (let i = 0; i < runs; i++) {
  const seed = seedArg ? parseInt(seedArg.split('=')[1], 10) + i : 1000 + i * 7919;
  const game = DH.Bot.play(seed, policy);
  const run = game.run;
  last = game;
  if (run.phase === 'won') { out.won++; stab += run.stability; }
  else if (run.phase === 'lost') {
    out.lost++;
    const where = run.death.inBoss ? 'BOSS' : 'tick ' + String(run.death.tick).padStart(2, '0');
    deaths[where] = (deaths[where] || 0) + 1;
    killers[run.death.source] = (killers[run.death.source] || 0) + 1;
    if (run.death.inBoss) bossDeaths++;
  } else { out.stuck++; console.log('STUCK seed', seed, 'cur', run.cur, 'phase', run.phase, 'tick', run.tick); }
  if (run.boss) { bosses[run.boss.variant] = (bosses[run.boss.variant] || 0) + 1; bossTime += run.time - run.boss.startTime; preBoss += run.boss.startTime; bossN++; }
  dmg += run.stats.dmgTaken;
  time += run.time; rooms += run.stats.rooms; incidents += run.stats.incidents;
  pkgs += DH.Graph.packages(run.graph).length;
}
const avg = (v) => (v / runs).toFixed(1);
console.log(`runs ${runs}  won ${out.won}  lost ${out.lost}  stuck ${out.stuck}  (policy: ${policy.vet ? 'vet everything' : 'ship fast'}${policy.force ? ', forced ' + policy.force : ''}${policy.project ? ', project ' + policy.project : ''})`);
console.log(`avg: ${avg(time / 60)} min, ${avg(rooms)} rooms, ${avg(incidents)} incidents, ${avg(pkgs)} packages; avg stability on win ${(stab / Math.max(1, out.won)).toFixed(0)}`);
console.log(`boss reached ${bossN}/${runs}; pre-boss ${(preBoss / Math.max(1, bossN) / 60).toFixed(1)} min; boss fight ${(bossTime / Math.max(1, bossN)).toFixed(0)}s; damage taken/run ${avg(dmg)}`);
console.log('deaths by point:', Object.keys(deaths).sort().map((k) => `${k}:${deaths[k]}`).join('  '));
console.log('killers:', Object.entries(killers).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));
console.log('bosses:', JSON.stringify(bosses));
if (args.includes('--report') && DH.Reports) {
  console.log('\n' + DH.Reports.text(last));
}
if (args.includes('--log')) for (const e of last.run.log) console.log(`T-${String(e.left).padStart(2, '0')} ${e.kind.padEnd(10)} ${e.text}`);
