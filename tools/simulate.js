#!/usr/bin/env node
"use strict";
// Seeded balance simulator — the "simulation gate" from the content pipeline
// (docs/content-authoring.md). It plays many runs through the REAL effect engine
// (applyPackageEffects / applyEffectList from scripts/effects.js) against the real
// content, then reports package pick rates, boss-selection spread, debt/observability
// distributions, and pathologies (dominant packages, one-boss runs, rollback locks).
//
// Usage: node tools/simulate.js [runs]   (default 4000)
//
// The boss-selection and incident-weight formulas here mirror scripts/game.js
// (selectBoss / incidentWeights). Keeping them in sync is the point: the sim is the
// balance oracle for those formulas.
const { loadDepHell } = require("./lib/load-dephell.js");

const D = loadDepHell();
const { packages, rooms } = D.content;
const { applyPackageEffects, applyEffectList } = D.effects;
const { makeInitialRunState } = D.runState;

const RUNS = Number.parseInt(process.argv[2], 10) || 4000;

// Deterministic PRNG so runs are reproducible.
let seed = 1234567;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }

const roomById = new Map(rooms.map((r) => [r.id, r]));
const noop = () => {};

// Mirror of game.js selectBoss scoring.
function selectBoss(run) {
  const upgradeRisks = run.risks.filter((r) => r.kind === "upgrade").length;
  const cascadeRisks = run.risks.filter((r) => r.kind === "cascade").length;
  const addedEdges = run.graph.edges.filter((e) => e.createdBy).length;
  const major = 1 + run.bossScores.major_version_upgrade + run.pins.length + upgradeRisks;
  const monolith = run.bossScores.distributed_monolith + addedEdges + cascadeRisks;
  let boss = "major_version_upgrade";
  if (monolith > major && monolith >= 5) boss = "distributed_monolith";
  return { boss, major, monolith };
}

// Mirror of game.js incidentWeights (approximate — no live conflict edge here).
function likelyIncident(run) {
  const cvePatched = run.mitigations.includes("cve_patched");
  const riskRegistered = run.mitigations.includes("risk_registered") || run.mitigations.includes("audit_clean");
  const securityRisks = run.risks.filter((r) => r.kind === "security").length;
  const unpublishRisks = run.risks.filter((r) => r.kind === "unpublish").length;
  const legacy = run.installedPackages.includes("legacy_auth") ? 1 : 0;
  const conflict = run.graph.edges.some((e) => e.relation === "conflicts");
  const w = {
    build_failure: conflict ? 20 : 0,
    critical_cve: securityRisks * 4 + legacy * 3 - (cvePatched ? 8 : 0),
    dependency_unpublish: unpublishRisks * 5,
    audit_pressure: (run.techDebt >= 16 ? 6 + Math.floor((run.techDebt - 16) / 8) : 0) - (riskRegistered ? 4 : 0),
    minor_regression: 3,
  };
  return Object.entries(w).reduce((best, [id, wgt]) => (wgt > best[1] ? [id, wgt] : best), ["minor_regression", w.minor_regression])[0];
}

function applyRoomEffects(run, roomId) {
  const room = roomById.get(roomId);
  if (room?.clearReward) {
    const r = room.clearReward;
    if (r.observability) run.observability = Math.max(0, Math.min(5, run.observability + r.observability));
    if (r.techDebt) run.techDebt = Math.max(0, run.techDebt + r.techDebt);
    if (r.effects) applyEffectList(run, r.effects, { id: roomId, name: room.name }, noop);
  }
}

const stats = {
  boss: {},
  incident: {},
  pickCount: {},
  offerCount: {},
  debt: [],
  observability: [],
  rollbackLocked: 0,
  installedRollback: 0,
};

const POOL = roomById.get("package_gate").packagePool;

for (let i = 0; i < RUNS; i += 1) {
  const run = makeInitialRunState();

  // local_dev branch: safe validation vs risky audit.
  if (rand() < 0.5) {
    run.stability += 5;
  } else {
    applyRoomEffects(run, "dependency_audit");
  }

  // package_gate: offer a shuffled 4 from the pool, install one.
  const offered = [...POOL].sort(() => rand() - 0.5).slice(0, 4);
  offered.forEach((id) => { stats.offerCount[id] = (stats.offerCount[id] || 0) + 1; });
  const chosenId = pick(offered);
  const pkg = packages.find((p) => p.id === chosenId);
  run.installedPackages.push(chosenId);
  applyPackageEffects(run, pkg, noop);
  stats.pickCount[chosenId] = (stats.pickCount[chosenId] || 0) + 1;

  // test_gate always cleared.
  applyRoomEffects(run, "test_gate");

  // integration branch: refactor (safe) vs DI (risky power).
  if (rand() < 0.5) applyRoomEffects(run, "refactor_bay");
  else applyRoomEffects(run, "dependency_injection");

  // outcomes
  const { boss } = selectBoss(run);
  stats.boss[boss] = (stats.boss[boss] || 0) + 1;
  const incident = likelyIncident(run);
  stats.incident[incident] = (stats.incident[incident] || 0) + 1;
  stats.debt.push(run.techDebt);
  stats.observability.push(run.observability);
  if (run.tools.includes("rollback")) stats.installedRollback += 1;
  if (run.risks.some((r) => r.kind === "upgrade")) stats.rollbackLocked += 1;
}

function pct(n) { return `${((n / RUNS) * 100).toFixed(1)}%`; }
function avg(a) { return (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1); }
function maxOf(a) { return Math.max(...a); }

console.log(`\nDependency Hell — balance simulation over ${RUNS} runs (seed ${1234567})\n`);

console.log("Package pick rate (when offered):");
const picks = Object.keys(stats.offerCount).sort((a, b) => (stats.pickCount[b] || 0) / stats.offerCount[b] - (stats.pickCount[a] || 0) / stats.offerCount[a]);
let dominant = null;
for (const id of picks) {
  const rate = (stats.pickCount[id] || 0) / stats.offerCount[id];
  if (rate > 0.8) dominant = id;
  console.log(`  ${id.padEnd(20)} chosen ${String(stats.pickCount[id] || 0).padStart(4)} / offered ${String(stats.offerCount[id]).padStart(4)}  (${(rate * 100).toFixed(0)}%)`);
}

console.log("\nBoss selection:");
for (const [id, n] of Object.entries(stats.boss)) console.log(`  ${id.padEnd(24)} ${pct(n)}`);

console.log("\nLikely incident at staging:");
for (const [id, n] of Object.entries(stats.incident).sort((a, b) => b[1] - a[1])) console.log(`  ${id.padEnd(24)} ${pct(n)}`);

console.log("\nResources:");
console.log(`  Technical Debt: avg ${avg(stats.debt)}, max ${maxOf(stats.debt)}`);
console.log(`  Observability : avg ${avg(stats.observability)} of 5`);
console.log(`  Rollback installed: ${pct(stats.installedRollback)}; would be upgrade-locked: ${pct(stats.rollbackLocked)}`);

// Pathology gate.
const bossSpread = Object.keys(stats.boss).length;
const problems = [];
if (dominant) problems.push(`Package '${dominant}' is picked >80% when offered (dominant).`);
if (bossSpread < 2) problems.push("Only one boss is ever selected — boss adaptivity is not exercised.");
if (Number(avg(stats.debt)) > 60) problems.push("Average Technical Debt is very high (>60).");

console.log("");
if (problems.length) {
  console.log("BALANCE WARNINGS:");
  problems.forEach((p) => console.log(`  - ${p}`));
  process.exit(0); // advisory, not a hard failure
} else {
  console.log("No balance pathologies detected.");
}
