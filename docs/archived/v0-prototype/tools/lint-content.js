#!/usr/bin/env node
"use strict";
// Dependency Hell content linter — the "content compiler" gate.
//
// Validates scripts/content.js against the real engine: effect-verb shapes,
// the tag ontology, graph-node references, and the design-gate coherence-trace
// requirement (no package may be a pure stat bump; anything that can affect a
// major outcome must leave an inspectable trace). See docs/content-authoring.md.
//
// Usage: node tools/lint-content.js [--strict]
//   default: tag-hygiene issues are warnings; structural issues are errors.
//   --strict: tag-hygiene issues become errors too.
// Exit code 1 if any error (or, with --strict, any warning) is found.

const { loadDepHell } = require("./lib/load-dephell.js");

const STRICT = process.argv.includes("--strict");

// --- The engine's real effect-verb contract (mirrors scripts/effects.js) -----
// The 7 MVP relations + flags, plus tool-attachment flavor relations that render
// as plain edges (reverts/scans/breaks/explains).
const RELATIONS = ["requires", "conflicts", "patches", "isolates", "observes", "pins", "infects", "flags", "reverts", "scans", "breaks", "explains"];
const VISIBILITIES = ["known", "suspected", "hidden"];
const STATS = ["fireRate", "damage", "speed", "dashCooldown"];
const RESOURCES = ["observability"];
const BOSSES = ["major_version_upgrade", "distributed_monolith"];
const ENEMY_STATS = ["hp", "speed", "damage"];

const VERBS = {
  addNode: { required: ["id", "name"], optional: ["tags"] },
  addEdge: { required: ["source", "target", "relation", "strength", "visibility"] },
  modifyStat: { required: ["stat", "amount"] },
  modifyResource: { required: ["resource", "amount"] },
  increaseDebt: { required: ["amount", "tag"] },
  addApproval: { required: ["id", "target", "reason"] },
  addTag: { required: ["list", "tag"] },
  addTool: { required: ["tool"] },
  revealEdges: { required: [], optional: ["relation", "visibility"] },
  revealNode: { required: ["id"] },
  addBossScore: { required: ["boss", "amount", "reason"] },
  registerRisk: { required: ["id", "kind", "target", "reason"] },
  pinNode: { required: ["id"] },
  addEnemyModifier: { required: ["scope", "stat", "amount"] },
  addProcessDecision: { required: ["id"], optional: ["reason", "tag", "kind", "target"] },
};

// Effects that leave an inspectable causal trace (satisfy the design gate).
const TRACE_VERBS = new Set([
  "addNode", "addEdge", "increaseDebt", "addApproval", "addTool", "revealEdges",
  "revealNode", "addBossScore", "registerRisk", "pinNode", "addEnemyModifier",
  "addProcessDecision", "addTag",
]);

// --- Tag ontology (docs/content-authoring.md families + curated game tags) ---
const ONTOLOGY = new Set([
  // domain
  "auth", "crypto", "storage", "network", "logging", "runtime", "build", "deploy", "test", "observability", "orchestration", "cache",
  // era
  "legacy", "modern", "experimental", "abandoned", "enterprise", "handmade",
  // risk
  "insecure", "unstable", "opaque", "slow", "brittle", "unmaintained", "overpowered", "noisy",
  // graph role
  "gateway", "leaf", "hub", "adapter", "isolator", "amplifier", "bridge", "sink", "source",
  // failure family
  "conflict", "leak", "race", "drift", "outage", "audit", "regression", "breach", "cascade",
  // curated functional tags in active engine use
  "core", "process", "tool", "control", "active", "defense", "fix", "patch", "safer", "debt",
  "short-term", "security", "security_risk", "security_exception", "damage", "high_reward",
  "danger", "support", "weird", "utility", "unpublish", "stable", "scale", "complexity", "coupling",
  "routing", "latency", "mirror", "legendary", "pin",
]);

const findings = [];
function err(where, msg) { findings.push({ sev: "error", where, msg }); }
function warn(where, msg) { findings.push({ sev: "warn", where, msg }); }

function isNum(v) { return typeof v === "number" && Number.isFinite(v); }
function isStr(v) { return typeof v === "string" && v.length > 0; }

function lint() {
  const D = loadDepHell();
  const { packages, rooms, enemyDefs } = D.content;
  const run = D.runState.makeInitialRunState();

  // Node universe: initial graph + every node any package can add.
  const nodeIds = new Set(run.graph.nodes.map((n) => n.id));
  for (const pkg of packages) for (const e of pkg.effects || []) if (e.op === "addNode" && e.id) nodeIds.add(e.id);
  const edgeIds = new Set(run.graph.edges.map((e) => e.id));

  // Position collisions among initial + package-declared nodes handled in the
  // game via GRAPH_POSITIONS; here we only sanity-check duplicate node ids.
  const declaredNodes = new Map();
  for (const n of run.graph.nodes) declaredNodes.set(n.id, "initial");

  // ---- Packages ----
  const seenPkgIds = new Set();
  for (const pkg of packages) {
    const w = `package:${pkg.id || "?"}`;
    if (!isStr(pkg.id)) err(w, "missing id");
    if (seenPkgIds.has(pkg.id)) err(w, "duplicate package id");
    seenPkgIds.add(pkg.id);
    if (!isStr(pkg.name)) err(w, "missing name");
    if (!isStr(pkg.benefit)) warn(w, "missing benefit copy");
    if (!isStr(pkg.risk)) warn(w, "missing risk copy (design pillar: every power has a shadow)");
    if (!Array.isArray(pkg.tags) || pkg.tags.length === 0) warn(w, "no tags");
    else for (const t of pkg.tags) if (!ONTOLOGY.has(t)) warn(w, `tag '${t}' not in ontology`);

    if (!Array.isArray(pkg.effects) || pkg.effects.length === 0) { err(w, "no effects"); continue; }

    let hasTrace = false;
    for (const e of pkg.effects) {
      lintEffect(w, e, nodeIds);
      if (TRACE_VERBS.has(e.op)) hasTrace = true;
    }
    // Design gate: reject pure stat bumps with no graph/traceable consequence.
    if (!hasTrace) err(w, "no graph/traceable consequence — reads as a pure stat bump (design gate #2/#3)");

    for (const n of pkg.newNodesDeclared || []) void n; // reserved
  }

  // ---- Enemies ----
  for (const [id, def] of Object.entries(enemyDefs)) {
    const w = `enemy:${id}`;
    for (const f of ["name", "color"]) if (!isStr(def[f])) err(w, `missing ${f}`);
    for (const f of ["hp", "speed", "damage", "w", "h"]) if (!isNum(def[f])) err(w, `missing/invalid numeric ${f}`);
  }

  // ---- Rooms ----
  const roomIds = new Set(rooms.map((r) => r.id));
  const enemyTypes = new Set(Object.keys(enemyDefs));
  for (const room of rooms) {
    const w = `room:${room.id || "?"}`;
    if (!isStr(room.id)) err(w, "missing id");
    if (!isStr(room.name)) err(w, "missing name");
    if (!isStr(room.subtitle)) warn(w, "missing subtitle");
    if (!room.mapNode && !room.mapEdge && !room.bossRoom) warn(w, "no graph anchor (mapNode/mapEdge)");
    if (room.mapNode && !nodeIds.has(room.mapNode)) warn(w, `mapNode '${room.mapNode}' is not a known node`);
    if (room.mapEdge && !edgeIds.has(room.mapEdge)) warn(w, `mapEdge '${room.mapEdge}' is not a known initial edge`);
    for (const spawn of room.enemies || []) {
      if (!enemyTypes.has(spawn.type)) err(w, `spawns unknown enemy type '${spawn.type}'`);
      if (!isNum(spawn.x) || !isNum(spawn.y)) err(w, "enemy spawn missing x/y");
    }
    for (const route of room.routes || []) {
      const rw = `${w} route:${route.id || "?"}`;
      if (!isStr(route.to)) err(rw, "route missing 'to'");
      else if (!roomIds.has(route.to)) err(rw, `route target room '${route.to}' does not exist`);
      if (!isStr(route.label)) warn(rw, "route missing label");
      if (!isStr(route.tradeoff)) warn(rw, "route missing tradeoff (routes should present visible tradeoffs)");
      if (route.requiresPackage && !seenPkgIds.has(route.requiresPackage)) warn(rw, `requiresPackage '${route.requiresPackage}' is not a known package`);
    }
  }

  return { packages: packages.length, rooms: rooms.length, enemies: Object.keys(enemyDefs).length };
}

function lintEffect(where, e, nodeIds) {
  const w = `${where} effect:${e.op || "?"}`;
  const spec = VERBS[e.op];
  if (!spec) { err(w, `unknown effect verb '${e.op}'`); return; }
  for (const f of spec.required) if (e[f] === undefined) err(w, `missing required field '${f}'`);

  if (e.op === "addEdge") {
    if (!RELATIONS.includes(e.relation)) err(w, `unknown relation '${e.relation}'`);
    if (!VISIBILITIES.includes(e.visibility)) err(w, `unknown visibility '${e.visibility}'`);
    if (isNum(e.strength) && (e.strength < 1 || e.strength > 3)) warn(w, `strength ${e.strength} outside 1-3`);
    if (e.source && !nodeIds.has(e.source)) warn(w, `edge source '${e.source}' not a known/declared node`);
    if (e.target && !nodeIds.has(e.target)) warn(w, `edge target '${e.target}' not a known/declared node`);
  }
  if (e.op === "modifyStat" && !STATS.includes(e.stat)) err(w, `unknown stat '${e.stat}'`);
  if (e.op === "modifyResource" && !RESOURCES.includes(e.resource)) err(w, `resource '${e.resource}' not adjustable via modifyResource (only ${RESOURCES.join(", ")})`);
  if (e.op === "addBossScore" && !BOSSES.includes(e.boss)) err(w, `unknown boss '${e.boss}'`);
  if (e.op === "addEnemyModifier" && !ENEMY_STATS.includes(e.stat)) err(w, `enemy modifier stat '${e.stat}' not in ${ENEMY_STATS.join(", ")}`);
}

// --- Run ---------------------------------------------------------------------
let summary;
try {
  summary = lint();
} catch (error) {
  console.error("LINTER CRASH:", error.stack || error.message);
  process.exit(2);
}

const errors = findings.filter((f) => f.sev === "error");
const warns = findings.filter((f) => f.sev === "warn");

for (const f of findings) {
  const tag = f.sev === "error" ? "ERROR" : "WARN ";
  console.log(`  [${tag}] ${f.where}: ${f.msg}`);
}
console.log("");
console.log(`Linted ${summary.packages} packages, ${summary.rooms} rooms, ${summary.enemies} enemies.`);
console.log(`${errors.length} error(s), ${warns.length} warning(s).`);

const failed = errors.length > 0 || (STRICT && warns.length > 0);
if (!failed) console.log("Content OK.");
process.exit(failed ? 1 : 0);
