#!/usr/bin/env node
// Headless playtests: runs the real simulation with the autoplayer and reports outcomes.
//   node tools/bot-run.js [runs=40] [--report] [--seed=N] [--novet]
const path = require('path');
globalThis.window = globalThis;
for (const f of ['rng', 'content', 'graph', 'sim', 'reports', 'bot']) {
  try { require(path.join(__dirname, '..', 'js', f + '.js')); } catch (e) { if (f !== 'reports') throw e; }
}
const DH = globalThis.DH;
const args = process.argv.slice(2);
const runs = parseInt(args.find((a) => /^\d+$/.test(a)) || '40', 10);
const seedArg = args.find((a) => a.startsWith('--seed='));
const policy = { vet: !args.includes('--novet') };

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
console.log(`runs ${runs}  won ${out.won}  lost ${out.lost}  stuck ${out.stuck}  (policy: ${policy.vet ? 'vet everything' : 'ship fast'})`);
console.log(`avg: ${avg(time / 60)} min, ${avg(rooms)} rooms, ${avg(incidents)} incidents, ${avg(pkgs)} packages; avg stability on win ${(stab / Math.max(1, out.won)).toFixed(0)}`);
console.log(`boss reached ${bossN}/${runs}; pre-boss ${(preBoss / Math.max(1, bossN) / 60).toFixed(1)} min; boss fight ${(bossTime / Math.max(1, bossN)).toFixed(0)}s; damage taken/run ${avg(dmg)}`);
console.log('deaths by point:', Object.keys(deaths).sort().map((k) => `${k}:${deaths[k]}`).join('  '));
console.log('killers:', Object.entries(killers).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));
console.log('bosses:', JSON.stringify(bosses));
if (args.includes('--report') && DH.Reports) {
  console.log('\n' + DH.Reports.text(last));
}
if (args.includes('--log')) for (const e of last.run.log) console.log(`T-${String(e.left).padStart(2, '0')} ${e.kind.padEnd(10)} ${e.text}`);
