#!/usr/bin/env node
"use strict";
// Phantom-coupling audit — the Tier-1 "does strategy write back to combat?" check
// from docs/fun-tuneup-protocol.md. Root cause #1 is "the ledger never writes back
// to the fight": run-state fields the game is NAMED after (debt / risk / graph /
// observability / bossMutations) can be written all over the menus and still never
// be READ where the player is fighting, so divergent builds pilot identically.
//
// This is a STATIC scan (game.js touches the DOM at load, so it can't be vm-run like
// the other tools). It builds a rough call graph over game.js's top-level functions,
// finds everything reachable from the live combat tick, and reports which run-state
// fields have zero readers in that reachable "combat call graph."
//
// Usage: node tools/coupling-audit.js
// Advisory only (exit 0), mirroring tools/simulate.js — it documents phantoms so they
// are visible rather than silently dead; it does not fail the build.
const fs = require("fs");
const path = require("path");
const { loadDepHell, ROOT } = require("./lib/load-dephell.js");

const D = loadDepHell();
const { makeInitialRunState } = D.runState;

// The run-state fields to audit = the top-level keys of a fresh run.
const runStateKeys = Object.keys(makeInitialRunState());

// bossMutation id literals are computed in selectBoss (not seeded in run state), so
// list the known ids explicitly and scan for them as string literals.
const BOSS_MUTATIONS = ["coupled_cascade", "brittle_pins", "audit_debt", "cascade_debt"];

const gameSrc = fs.readFileSync(path.join(ROOT, "scripts", "game.js"), "utf8");

// --- Rough call graph over top-level functions ----------------------------
// game.js declares every top-level function at exactly two-space indent inside its
// IIFE, so the text from one `  function NAME(` to the next is (close enough to) one
// function's body. Nested helpers sit at deeper indent and get folded into their
// parent, which is fine for reachability.
const declRe = /^  function (\w+)\s*\(/gm;
const decls = [];
let m;
while ((m = declRe.exec(gameSrc))) decls.push({ name: m[1], index: m.index });

const chunks = new Map();
for (let i = 0; i < decls.length; i += 1) {
  const start = decls[i].index;
  const end = i + 1 < decls.length ? decls[i + 1].index : gameSrc.length;
  chunks.set(decls[i].name, gameSrc.slice(start, end));
}
const names = new Set(chunks.keys());

// Edges: within each chunk, any `identifier(` whose identifier is a known function.
function calleesOf(name) {
  const body = chunks.get(name) || "";
  const out = new Set();
  const callRe = /\b(\w+)\s*\(/g;
  let c;
  while ((c = callRe.exec(body))) {
    const callee = c[1];
    if (callee !== name && names.has(callee)) out.add(callee);
  }
  return out;
}

function reachable(seeds) {
  const seen = new Set();
  const stack = seeds.filter((s) => names.has(s));
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const callee of calleesOf(cur)) if (!seen.has(callee)) stack.push(callee);
  }
  return seen;
}

// The live combat tick. `update` pulls in room-flow + menus too, which we DON'T want
// to count as "the fight," so seed from the actual combat/movement functions.
const COMBAT_SEED = [
  "updatePlayer", "updateAttacks", "updateEnemies", "updateBoss", "updateBoss2",
  "damagePlayer", "swing", "updateHazards", "useFeatureFlag", "weakenCurrentWave",
  "onEnemyDeath", "makeEnemy", "spawnEnemy",
];
const combatSet = reachable(COMBAT_SEED);
const combatText = [...combatSet].map((n) => chunks.get(n)).join("\n");

// Everything reachable from the main tick (broader — includes room-flow/menu), minus
// the end-report render, for a secondary "read anywhere in the live tick?" signal.
const REPORT_RE = /report|postmortem|endRun|feelCode|feelCheck|renderReport/i;
const tickSet = reachable(["update"]);
const tickText = [...tickSet].filter((n) => !REPORT_RE.test(n)).map((n) => chunks.get(n)).join("\n");

// --- Field read/write counting -------------------------------------------
function refCounts(text, key) {
  // Match `run.KEY` and the optional-chaining form `run?.KEY` (used in the combat
  // path, e.g. `game?.run?.enemyModifiers`); the leading `run` is itself often reached
  // through `game.run` / `game?.run`, which the \brun boundary still catches.
  const refRe = new RegExp(`\\brun\\??\\.${key}\\b`, "g");
  const total = (text.match(refRe) || []).length;
  // A "write" is an assignment `run.KEY =` (not ==/>=/etc) OR an array mutation
  // (`run.KEY.push(...)` etc). Both push data INTO the ledger rather than reading it
  // to change combat, so they must not count as combat readers.
  const assignRe = new RegExp(`\\brun\\??\\.${key}\\s*=(?!=)`, "g");
  const mutRe = new RegExp(`\\brun\\??\\.${key}\\??\\.(push|pop|shift|unshift|splice|sort)\\b`, "g");
  const writes = (text.match(assignRe) || []).length + (text.match(mutRe) || []).length;
  return { total, writes, reads: Math.max(0, total - writes) };
}

console.log(`\nDependency Hell — phantom-coupling audit`);
console.log(`(does the ledger write back to the fight? — fun-tuneup-protocol.md root cause #1)\n`);
console.log(`Combat call graph = reachable from [${COMBAT_SEED.filter((s) => names.has(s)).join(", ")}]`);
console.log(`  ${combatSet.size} functions in combat scope, ${tickSet.size} in the full tick, ${names.size} total.\n`);

const phantom = [];
const rows = [];
for (const key of runStateKeys) {
  const combat = refCounts(combatText, key);
  const tick = refCounts(tickText, key);
  const isPhantom = combat.reads === 0;
  if (isPhantom) phantom.push({ key, tick });
  rows.push({ key, combat, tick, isPhantom });
}

console.log("Run-state field readers in the COMBAT call graph:");
for (const r of rows.sort((a, b) => a.combat.reads - b.combat.reads)) {
  const tag = r.isPhantom ? (r.tick.reads > 0 ? "PHANTOM (read only in menus/HUD, not in the fight)" : "PHANTOM (no in-tick reader at all)") : "";
  console.log(`  ${r.key.padEnd(20)} combat-reads ${String(r.combat.reads).padStart(3)}  writes ${String(r.combat.writes).padStart(2)}  tick-reads ${String(r.tick.reads).padStart(3)}   ${tag}`);
}

// bossMutations is the protocol's headline phantom: selectBoss computes which
// mutation ids apply, but if updateBoss/prepareBossRoom never READ the array to branch,
// the boss is announced as "mutated" while its behavior/stats are identical.
const bmRow = rows.find((r) => r.key === "bossMutations");
const bmReadForBranch = (combatText.match(/\bbossMutations\s*\??\.\s*(includes|some|indexOf|find|filter)\b|\bbossMutations\s*\[/g) || []).length;
console.log("\nbossMutations (are the computed mutations actually read to change the fight?):");
console.log(`  combat-scope reads: ${bmRow ? bmRow.combat.reads : "?"}; branch-reads (.includes/.some/index): ${bmReadForBranch}`);
if (bmReadForBranch === 0) {
  console.log(`  => PHANTOM: these behaviors never fire in combat — ${BOSS_MUTATIONS.join(", ")}`);
  console.log(`     (written in selectBoss, read only by the end report). A reader in prepareBossRoom/updateBoss`);
  console.log(`     like run.bossMutations.includes("audit_debt") would let the mutation change the encounter.`);
} else {
  console.log(`  => at least one mutation is read to branch combat behavior.`);
}

console.log("");
if (phantom.length) {
  console.log("PHANTOM COUPLINGS (advisory — strategy that never reaches the player's hands):");
  for (const p of phantom) console.log(`  - run.${p.key}${p.tick.reads > 0 ? " (used only in menus/HUD/report)" : ""}`);
  console.log("\n  These are the fields the game is named after that don't currently change combat.");
  console.log("  Wiring even one into the fight is the protocol's highest-leverage 'build reaches your hands' fix.");
} else {
  console.log("No phantom couplings: every audited run-state field is read somewhere in the combat call graph.");
}
process.exit(0);
