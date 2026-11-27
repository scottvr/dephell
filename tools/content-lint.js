#!/usr/bin/env node
// Content gates 1 (lint) and 3 (similarity) from docs/content-pipeline.md.
//   node tools/content-lint.js            errors fail the run (exit 1); warnings are listed
//   node tools/content-lint.js --stats    also print the primitive x ecology coverage table
const path = require('path');
globalThis.window = globalThis;
for (const f of ['rng', 'content', 'graph', 'manual-copy']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { BASE_STATS, DEPS, PACKAGES, PROJECTS, ENEMIES, ECO, FX_OPS, INCIDENT_TEXT } = globalThis.DH.content;

// Text has to fit its UI slot: registry card, sidebar line, room subtitle.
const LIMITS = { pkgName: 24, depName: 18, tag: 64, power: 52, hard: 40, blurb: 60, powerTitle: 16 };
const TREE_MAX = 6; // nodes a package may add, itself excluded
const DEBT_MAX = 20;
const HEADLINE_CAP = 3; // packages sharing a headline primitive (see content-model.md)
// Stats that do not pass the "felt" test as a headline on their own.
const HIT_WEIGHT = new Set(['damage', 'dmgMult', 'crit', 'critMult']);

const errors = [], warns = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warns.push(`${id}: ${msg}`);
const tooLong = (id, field, s, max) => { if (typeof s !== 'string' || !s) err(id, `missing ${field}`); else if (s.length > max) err(id, `${field} is ${s.length} chars (max ${max})`); };

// ---------------------------------------------------------------- dependencies
const closure = (ids) => {
  const seen = new Set(), stack = ids.slice();
  while (stack.length) {
    const d = stack.pop();
    if (seen.has(d) || !DEPS[d]) continue;
    seen.add(d);
    for (const c of DEPS[d].deps) stack.push(c);
  }
  return seen;
};

const libs = {};
for (const [id, d] of Object.entries(DEPS)) {
  tooLong(id, 'name', d.name, LIMITS.depName);
  tooLong(id, 'blurb', d.blurb, LIMITS.blurb);
  if (!(d.risk >= 0 && d.risk <= 3)) err(id, `risk ${d.risk} outside 0..3`);
  if (!ECO[d.eco]) err(id, `unknown eco '${d.eco}'`);
  if (d.flag && !INCIDENT_TEXT[d.flag]) err(id, `unknown flag '${d.flag}'`);
  for (const c of d.deps) if (!DEPS[c]) err(id, `depends on unknown '${c}'`);
  if (d.lib) (libs[d.lib] = libs[d.lib] || []).push(id);
}
// cycles
{
  const state = {};
  const visit = (id, trail) => {
    if (state[id] === 2 || !DEPS[id]) return;
    if (state[id] === 1) { err(id, `dependency cycle: ${trail.concat(id).join(' -> ')}`); return; }
    state[id] = 1;
    for (const c of DEPS[id].deps) visit(c, trail.concat(id));
    state[id] = 2;
  };
  for (const id in DEPS) visit(id, []);
}
for (const [lib, members] of Object.entries(libs)) {
  if (members.length < 2) err(members[0], `lib '${lib}' has one member; the conflict can never occur`);
}

// ---------------------------------------------------------------- ecologies
for (const [eco, mix] of Object.entries(ECO)) {
  for (const e in mix) if (!ENEMIES[e]) err('eco ' + eco, `unknown enemy '${e}'`);
}

// ---------------------------------------------------------------- packages
const used = new Set();
const names = [];
for (const [id, p] of Object.entries(PACKAGES)) {
  tooLong(id, 'name', p.name, LIMITS.pkgName);
  tooLong(id, 'tag', p.tag, LIMITS.tag);
  tooLong(id, 'power', p.power, LIMITS.power);
  tooLong(id, 'hard', p.hard, LIMITS.hard);
  if (p.power && p.power.split('  ')[0].length > LIMITS.powerTitle) err(id, `power title '${p.power.split('  ')[0]}' over ${LIMITS.powerTitle} chars`);
  if (!ECO[p.eco]) err(id, `unknown eco '${p.eco}'`);
  if (!(p.risk >= 0 && p.risk <= 3)) err(id, `risk ${p.risk} outside 0..3`);
  if (p.flag && !INCIDENT_TEXT[p.flag]) err(id, `unknown flag '${p.flag}'`);
  if (!(p.debt >= 0 && p.debt <= DEBT_MAX)) err(id, `debt ${p.debt} outside 0..${DEBT_MAX}`);
  if (DEPS[id]) err(id, 'id is also a dependency id');
  for (const d of p.deps) if (!DEPS[d]) err(id, `depends on unknown '${d}'`);
  for (const d of p.grows || []) if (!DEPS[d]) err(id, `grows into unknown '${d}'`);
  for (const d of closure(p.grows || [])) used.add(d);
  const tree = closure(p.deps);
  p._tree = tree;
  for (const d of tree) used.add(d);
  if (tree.size > TREE_MAX && !p.starter) err(id, `tree adds ${tree.size} nodes (max ${TREE_MAX})`);

  if (!Array.isArray(p.fx) || !p.fx.length) { err(id, 'missing fx'); continue; }
  for (const e of p.fx) {
    if (!(e.stat in BASE_STATS)) err(id, `fx stat '${e.stat}' is not a primitive in BASE_STATS`);
    if (!FX_OPS[e.op]) err(id, `fx op '${e.op}' unknown`);
    if (e.v === undefined && e.hard === undefined) err(id, `fx on '${e.stat}' has neither v nor hard`);
  }
  if (p.fx[0].v === undefined) err(id, 'headline fx must apply before hardening');
  if (p.fx.every((e) => HIT_WEIGHT.has(e.stat))) warn(id, 'power is hit-weight only (damage/crit): weak on the "felt" test');
  else if (HIT_WEIGHT.has(p.fx[0].stat)) warn(id, `headline primitive '${p.fx[0].stat}' is hit-weight; lead with the visible effect`);
  if (!p.fx.some((e) => e.hard !== undefined)) err(id, 'nothing changes when hardened');
  // Cost must live in the graph. A package with no tree is vetted the moment it ships, so its own
  // risk costs nothing unless the node stays pageable (unpublish); it needs debt, or to grow a tree.
  if (!tree.size && !(p.grows || []).length && p.flag !== 'unpublish' && p.debt < 10) warn(id, 'no tree: vetted the moment it ships, so its risk costs nothing; needs debt, a tree, or to grow one');
  names.push([id, p.name.replace(/@.*/, '')]);
}
for (const id in DEPS) if (!used.has(id) && id !== 'runtime' && id !== 'stdlib') warn(id, 'dependency is not in any package tree');

// ---------------------------------------------------------------- projects
for (const [id, pj] of Object.entries(PROJECTS)) {
  tooLong('project ' + id, 'name', pj.name, 24);
  tooLong('project ' + id, 'tag', pj.tag, 44);
  tooLong('project ' + id, 'brief', pj.brief, 130);
  tooLong('project ' + id, 'level', pj.level, 28);
  for (const st of pj.start || []) if (!PACKAGES[st.pkg]) err('project ' + id, `starts with unknown package '${st.pkg}'`);
  // clocks longer than the standard 14 ramp difficulty over their whole length (progressTick in sim.js)
  if (pj.ticks != null && !(pj.ticks >= 6 && pj.ticks <= 30)) err('project ' + id, `ticks ${pj.ticks} outside 6..30`);
}
for (const [id, p] of Object.entries(PACKAGES)) {
  if (p.starter && !Object.values(PROJECTS).some((pj) => (pj.start || []).some((st) => st.pkg === id))) err(id, 'starter package is not used by any project');
}

// ---------------------------------------------------------------- manual
// manual.html generates its reference pages from content, but the prose about each enemy, boss and
// project lives in js/manual-copy.js: a new one without an entry would show up blank.
{
  const M = globalThis.DH.manualCopy, { BOSSES } = globalThis.DH.content;
  for (const id in ENEMIES) if (!M.enemies[id] || !M.enemies[id].what) err('enemy ' + id, 'no entry in js/manual-copy.js (the manual\'s field guide)');
  for (const id in BOSSES) if (!M.bosses[id] || !M.bosses[id].sig) err('boss ' + id, 'no entry in js/manual-copy.js (manual chapter 7)');
  for (const id in PROJECTS) if (!M.projects[id]) err('project ' + id, 'no entry in js/manual-copy.js (manual chapter 10)');
}

// ---------------------------------------------------------------- similarity
const ids = Object.keys(PACKAGES).filter((id) => Array.isArray(PACKAGES[id].fx) && PACKAGES[id].fx.length);
const byHead = {};
for (const id of ids) (byHead[PACKAGES[id].fx[0].stat] = byHead[PACKAGES[id].fx[0].stat] || []).push(id);
for (const [stat, list] of Object.entries(byHead)) {
  if (list.length > HEADLINE_CAP) err(list[HEADLINE_CAP], `headline '${stat}' already used by ${HEADLINE_CAP}: ${list.slice(0, HEADLINE_CAP).join(', ')}`);
}
const shape = (p) => p.fx.map((e) => e.stat + ':' + e.op).sort().join('|');
const lev = (a, b) => {
  const m = [];
  for (let i = 0; i <= a.length; i++) m[i] = [i];
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return m[a.length][b.length];
};
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
  const a = PACKAGES[ids[i]], b = PACKAGES[ids[j]], pair = `${ids[j]} vs ${ids[i]}`;
  if (a.fx[0].stat === b.fx[0].stat && a.eco === b.eco) err(pair, `same headline '${a.fx[0].stat}' and same ecology '${a.eco}'`);
  if (shape(a) === shape(b)) err(pair, `identical fx shape (${shape(a)})`);
  if (a._tree.size && b._tree.size && !a.starter && !b.starter) {
    const sub = (x, y) => [...x].every((d) => y.has(d));
    if (sub(a._tree, b._tree) || sub(b._tree, a._tree)) err(pair, 'one tree is contained in the other');
  }
  if (lev(names[i][1], names[j][1]) <= 2) err(pair, `names too close ('${names[i][1]}', '${names[j][1]}')`);
}
// A dependency that matches another on every axis, under exactly the same packages, adds a room and no decision.
{
  const parents = {};
  for (const id of ids) for (const d of PACKAGES[id]._tree) (parents[d] = parents[d] || []).push(id);
  const sig = (id) => [DEPS[id].eco, DEPS[id].risk, DEPS[id].flag || '', DEPS[id].lib || '', DEPS[id].deps.length, (parents[id] || []).join('+')].join('/');
  const seen = {};
  for (const id in DEPS) {
    if (!parents[id]) continue;
    const s = sig(id);
    if (seen[s]) warn(id, `interchangeable with '${seen[s]}' (same ecology, risk, flag and parents)`);
    else seen[s] = id;
  }
}

// ---------------------------------------------------------------- report
if (process.argv.includes('--stats')) {
  const ecos = Object.keys(ECO);
  console.log('headline primitive x ecology (package count); empty cells are free slots\n');
  console.log(' '.repeat(12) + ecos.map((e) => e.slice(0, 5).padEnd(6)).join(''));
  for (const stat of Object.keys(BASE_STATS)) {
    const row = ecos.map((e) => ids.filter((id) => PACKAGES[id].fx[0].stat === stat && PACKAGES[id].eco === e).length);
    const total = row.reduce((a, b) => a + b, 0);
    console.log(stat.padEnd(12) + row.map((n) => (n ? String(n) : '.').padEnd(6)).join('') + (total ? '' : '  (unused as headline)'));
  }
  const sizes = ids.map((id) => PACKAGES[id]._tree.size);
  console.log(`\npackages ${ids.length}, dependencies ${Object.keys(DEPS).length}, tree sizes ${Math.min(...sizes)}..${Math.max(...sizes)}`);
  const share = {};
  for (const id of ids) for (const d of PACKAGES[id]._tree) share[d] = (share[d] || 0) + 1;
  const shared = Object.entries(share).filter(([, n]) => n > 1).map(([d, n]) => `${d} x${n}`);
  console.log(`dependencies shared between packages: ${shared.length ? shared.join(', ') : 'none'}`);
  console.log('libraries with conflicting majors: ' + Object.entries(libs).map(([l, m]) => `${l} (${m.length})`).join(', ') + '\n');
}
for (const w of warns) console.log('warn  ' + w);
for (const e of errors) console.log('ERROR ' + e);
console.log(`${errors.length} errors, ${warns.length} warnings`);
process.exit(errors.length ? 1 : 0);
