// All tunable content: packages, the transitive dependencies they drag in, enemies, tools, copy.
(function () {
  const DH = (window.DH = window.DH || {});

  // ---------------------------------------------------------------- tuning
  const TUNE = {
    ticksTotal: 14, // rooms until the release train leaves
    featuresNeeded: 3, // integrated packages required to deploy early
    restockEvery: 3, // registry gets new offers every N rooms
    pagerEvery: 3, // an incident strikes every N rooms
    pagerEveryInDebt: 2, // ...faster once debt is "compounding"
    debtPerLevel: 25,
    stability: 100,
    healOnClear: 3,
    hotfixCommits: 2,
    hotfixDebt: 10,
    shimDebt: 12,
    pinDebtPerTick: 2,
    flagDebt: 3,
  };

  // ---------------------------------------------------------------- base player stats
  const BASE_STATS = {
    damage: 10, fireDelay: 0.26, shotSpeed: 250, shots: 1, pierce: 0, bounce: 0, homing: 0,
    chain: 0, split: 0, explode: 0, crit: 0, critMult: 2.5, speed: 92, dashCd: 0.85,
    dashDamage: 0, drones: 0, orbitals: 0, shield: 0, regen: 0, cron: 0, duck: 0, cache: 0,
    hallucinate: 0, flag: 0, flagCd: 14, dmgMult: 1, legacySlow: 0, obs: 0,
  };

  // ---------------------------------------------------------------- transitive dependencies
  // risk 0..3 (how badly the pager wants it). flag colours the incident text.
  // eco picks the room's enemy ecology. lib marks two versions of the same library (=> conflict).
  const D = (name, risk, eco, blurb, extra) => Object.assign({ name, risk, eco, blurb, deps: [] }, extra || {});
  const DEPS = {
    runtime: D('runtime@18', 1, 'core', 'It runs. Do not ask how.', { deps: ['stdlib'] }),
    stdlib: D('stdlib', 0, 'core', 'Standard. Allegedly.'),

    'is-even': D('is-even', 1, 'tiny', 'Returns !isOdd(n). 40M weekly downloads.', { deps: ['is-odd'] }),
    'is-odd': D('is-odd', 2, 'tiny', 'Maintainer last seen in 2017.', { deps: ['is-number'], flag: 'abandoned' }),
    'is-number': D('is-number', 1, 'tiny', "typeof n === 'number', but as a service."),
    'string-format': D('string-format', 1, 'tiny', 'printf, reinvented for the ninth time.'),
    'json-parse': D('json-parse', 1, 'tiny', 'Disagrees with the other JSON parser.'),
    'source-map': D('source-map', 1, 'tiny', 'Maps the error to the wrong line, precisely.'),

    'crypto-core@1': D('crypto-core@1', 3, 'crypto', "Uses MD5 'for performance'.", { lib: 'crypto-core', flag: 'cve' }),
    'crypto-core@4': D('crypto-core@4', 1, 'crypto', 'Rewritten in Rust. Twice.', { lib: 'crypto-core' }),
    'bigint-polyfill': D('bigint-polyfill', 2, 'crypto', 'For browsers that no longer exist.', { flag: 'abandoned' }),
    'jwt-lib': D('jwt-lib', 1, 'crypto', 'alg: none. Just kidding. Probably.', { deps: ['crypto-core@4'] }),

    'ldap-bridge': D('ldap-bridge', 1, 'legacy', 'Speaks a protocol older than you.'),
    'jndi-lookup': D('jndi-lookup', 3, 'legacy', 'Helpfully loads code from strangers.', { flag: 'cve' }),

    'etc-d': D('etc-d', 2, 'memory', 'A distributed consensus about where your config went.'),
    'lru-cache': D('lru-cache', 1, 'memory', 'Forgets things on purpose.'),
    'hash-ring': D('hash-ring', 2, 'memory', 'Consistent hashing. Inconsistent everything else.'),
    'db-driver': D('db-driver', 1, 'memory', 'Leaks one connection per full moon.'),
    'query-builder': D('query-builder', 2, 'memory', 'SELECT * FROM regrets.', { deps: ['string-format'] }),

    'yaml-parser@2': D('yaml-parser@2', 2, 'yaml', 'Norway is false.', { lib: 'yaml-parser' }),
    'yaml-parser@3': D('yaml-parser@3', 1, 'yaml', 'Norway is a string again.', { lib: 'yaml-parser' }),
    'helm-chart': D('helm-chart', 1, 'yaml', 'Templates for your templates.', { deps: ['yaml-parser@2'] }),
    'config-loader': D('config-loader', 1, 'yaml', 'Reads nine files in four formats to find one port number.', { deps: ['yaml-parser@3'] }),

    'ingress-ctl': D('ingress-ctl', 2, 'net', 'All traffic flows through here. All of it.'),
    'service-mesh': D('service-mesh', 2, 'net', 'A sidecar for your sidecar.'),
    'grpc-lib': D('grpc-lib', 1, 'net', 'Fast, binary, undebuggable.', { deps: ['protobuf@2'] }),
    'protobuf@2': D('protobuf@2', 1, 'net', 'Field 7 is reserved forever.', { lib: 'protobuf' }),
    'protobuf@3': D('protobuf@3', 1, 'net', "Now with optional 'optional'.", { lib: 'protobuf' }),
    'tracing-sdk': D('tracing-sdk', 1, 'net', 'Adds observability. Also reveals how bad things are.'),
    'http-client': D('http-client', 1, 'net', 'The seventh http client in this codebase.', { deps: ['retry-lib'] }),

    'amqp-lib': D('amqp-lib', 1, 'async', 'At-least-once. Sometimes thrice.', { deps: ['protobuf@3'] }),
    'retry-lib': D('retry-lib', 1, 'async', "If at first you don't succeed, DDoS yourself."),
    'backtrack-engine': D('backtrack-engine', 2, 'async', 'O(2^n), but only on user input.'),

    'xml-parser': D('xml-parser', 2, 'enterprise', 'Entity expansion is a feature.'),
    'soap-client': D('soap-client', 1, 'enterprise', '<Envelope><Body><Help/></Body></Envelope>', { deps: ['crypto-core@1'] }),
    'license-server': D('license-server', 2, 'enterprise', 'Phones home. Home has moved.', { flag: 'license' }),

    'build-step': D('build-step', 1, 'script', 'Adds forty seconds to everything.'),
    tokenizer: D('tokenizer', 1, 'ai', 'Counts things. You are charged per thing.'),
    'gpu-driver': D('gpu-driver', 3, 'ai', "Works on the maintainer's machine.", { flag: 'abandoned' }),
    'telemetry-sdk': D('telemetry-sdk', 2, 'ai', "Collects 'anonymous' usage data.", { flag: 'license' }),
  };

  // ---------------------------------------------------------------- packages
  // apply(s, h): mutate the stat block. h = hardened (package + entire tree vetted).
  const PACKAGES = {
    'left-pad': {
      name: 'left-pad@1.3', eco: 'tiny', risk: 3, flag: 'unpublish', debt: 0, deps: [],
      tag: 'A small package with no dependencies. Surely harmless.',
      power: 'RAPID FIRE  +35% fire rate', hard: '+55% fire rate',
      apply: (s, h) => { s.fireDelay *= h ? 0.64 : 0.74; },
    },
    lowdash: {
      name: 'lowdash@4.17', eco: 'tiny', risk: 1, debt: 0, deps: ['is-even', 'is-number'],
      tag: 'You needed one function. You got four hundred.',
      power: 'TRIPLE SHOT', hard: 'five-shot fan',
      apply: (s, h) => { s.shots += h ? 4 : 2; s.damage *= 0.8; },
    },
    'legacy-auth': {
      name: 'legacy-auth@0.9', eco: 'legacy', risk: 2, debt: 10, deps: ['crypto-core@1', 'ldap-bridge'],
      tag: 'It has always worked. Nobody knows why.',
      power: 'MASTER TOKEN  shots pierce 2', hard: 'pierce 5, old enemies hesitate',
      apply: (s, h) => { s.pierce += h ? 5 : 2; if (h) s.legacySlow = 0.35; },
    },
    'modern-crypto': {
      name: 'modern-crypto@4.2', eco: 'crypto', risk: 1, debt: 0, deps: ['crypto-core@4', 'bigint-polyfill'],
      tag: 'Marked stable by someone with confidence.',
      power: 'SIGNED PAYLOADS  +40% damage, 15% crits', hard: '+60% damage, 30% crits',
      apply: (s, h) => { s.damage *= h ? 1.6 : 1.4; s.crit += h ? 0.3 : 0.15; },
    },
    logjam: {
      name: 'logjam@2.14', eco: 'legacy', risk: 1, debt: 4, deps: ['string-format', 'jndi-lookup'],
      tag: 'Adds observability. Also reveals how bad things are.',
      power: 'OBSERVABILITY +2  see forecasts; +15% damage', hard: 'observability +3; +30% damage',
      apply: (s, h) => { s.obs += h ? 3 : 2; s.dmgMult *= h ? 1.3 : 1.15; },
    },
    kubernot: {
      name: 'kubernot@1.28', eco: 'yaml', risk: 2, debt: 8, deps: ['etc-d', 'helm-chart', 'ingress-ctl'],
      tag: 'Solves problems you did not have until you installed it.',
      power: 'REPLICA  a drone fires alongside you', hard: 'two replicas, self-healing',
      apply: (s, h) => { s.drones += h ? 2 : 1; if (h) s.regen += 1; },
    },
    memcashed: {
      name: 'memcashed@1.6', eco: 'memory', risk: 1, debt: 0, deps: ['lru-cache', 'hash-ring'],
      tag: 'There are two hard problems. This is one of them.',
      power: 'CACHE HIT  every 4th volley fires twice', hard: 'every 2nd volley fires twice',
      apply: (s, h) => { s.cache = h ? 2 : 4; },
    },
    'rabbit-hole': {
      name: 'rabbit-hole-mq@3', eco: 'async', risk: 1, debt: 0, deps: ['amqp-lib', 'retry-lib'],
      tag: 'Your message will be delivered. Possibly to you.',
      power: 'FAN-OUT  hits arc to 2 more enemies', hard: 'arcs to 4 more enemies',
      apply: (s, h) => { s.chain += h ? 4 : 2; },
    },
    sequelizer: {
      name: 'sequelizer@6', eco: 'memory', risk: 1, debt: 0, deps: ['db-driver', 'query-builder'],
      tag: 'One query becomes many. This is called N+1.',
      power: 'N+1  hits spray 2 shard bolts', hard: 'hits spray 4 shard bolts',
      apply: (s, h) => { s.split += h ? 4 : 2; },
    },
    'launch-dorkly': {
      name: 'launch-dorkly@5', eco: 'yaml', risk: 1, debt: 0, deps: ['config-loader'],
      tag: 'Ship it dark. Forget the flag exists. Repeat.',
      power: 'FEATURE FLAG [Q]  freeze the room, erase bullets', hard: 'recharges almost twice as fast',
      apply: (s, h) => { s.flag = 1; s.flagCd = h ? 8 : 14; },
    },
    're-doom': {
      name: 're-doom@2', eco: 'async', risk: 1, debt: 0, deps: ['backtrack-engine'],
      tag: 'Now you have two problems.',
      power: 'BACKTRACK  shots bounce twice', hard: 'bounce 4 times',
      apply: (s, h) => { s.bounce += h ? 4 : 2; },
    },
    'enterprise-bus': {
      name: 'enterprise-bus@11', eco: 'enterprise', risk: 2, debt: 15, deps: ['xml-parser', 'soap-client', 'license-server'],
      tag: 'Connects everything to everything. On purpose.',
      power: 'BLAST RADIUS  shots explode', hard: 'much bigger blast',
      apply: (s, h) => { s.explode = Math.max(s.explode, h ? 26 : 17); },
    },
    'micro-everything': {
      name: 'micro-everything@0.1', eco: 'net', risk: 2, debt: 5, deps: ['service-mesh', 'grpc-lib', 'tracing-sdk'],
      tag: 'One problem, tastefully distributed across twelve services.',
      power: 'SIDECARS  2 orbitals block bullets and bite', hard: '4 orbitals',
      apply: (s, h) => { s.orbitals += h ? 4 : 2; },
    },
    'typo-script': {
      name: 'typo-script@5', eco: 'script', risk: 1, debt: 0, deps: ['source-map', 'build-step'],
      tag: 'Catches the bug at compile time. A different bug.',
      power: 'TYPE CHECK  shield absorbs 1 hit per room', hard: 'absorbs 2 hits per room',
      apply: (s, h) => { s.shield += h ? 2 : 1; },
    },
    'vibe-coder': {
      name: 'vibe-coder@0.0.1', eco: 'ai', risk: 2, debt: 6, deps: ['tokenizer', 'gpu-driver', 'telemetry-sdk'],
      tag: 'Confidently autocompletes your aim.',
      power: 'AUTOCOMPLETE  shots home; 1 in 8 hallucinates', hard: 'stronger homing, no hallucinations',
      apply: (s, h) => { s.homing = Math.max(s.homing, h ? 5.5 : 3.6); s.hallucinate = h ? 0 : 0.125; },
    },
    'rubber-duck': {
      name: 'rubber-duck@1.0', eco: 'script', risk: 0, debt: 0, deps: [],
      tag: 'Explain the problem to the duck. The duck knows.',
      power: 'EXPLAIN IT  stand still: next volley x3', hard: 'next volley x4.5',
      apply: (s, h) => { s.duck = h ? 4.5 : 3; },
    },
    'do-not-delete': {
      name: 'do-not-delete.sh', eco: 'script', risk: 2, flag: 'abandoned', debt: 20, deps: [],
      tag: 'A cron job from 2011. Author unknown. Purpose unknown.',
      power: 'CRON  a ring of bolts every 5 seconds', hard: 'every 3 seconds',
      apply: (s, h) => { s.cron = h ? 3 : 5; },
    },
    'oauth-everything': {
      name: 'oauth-everything@2', eco: 'net', risk: 1, debt: 0, deps: ['http-client', 'jwt-lib', 'json-parse'],
      tag: 'Redirects you somewhere else to prove who you are.',
      power: 'REDIRECT  fast dash that damages on contact', hard: 'faster, harder-hitting dash',
      apply: (s, h) => { s.dashCd *= h ? 0.45 : 0.6; s.dashDamage += h ? 60 : 30; },
    },
  };

  // ---------------------------------------------------------------- enemies
  const ENEMIES = {
    bug: { name: 'Bug', hp: 18, spd: 54, r: 6, dmg: 8, cost: 1 },
    nullptr: { name: 'Null Pointer', hp: 20, spd: 36, r: 6, dmg: 7, cost: 2 },
    regression: { name: 'Regression', hp: 26, spd: 50, r: 6, dmg: 9, cost: 2 },
    race: { name: 'Race Condition', hp: 24, spd: 72, r: 6, dmg: 10, cost: 2 },
    leak: { name: 'Memory Leak', hp: 42, spd: 17, r: 7, dmg: 8, cost: 3 },
    forkbomb: { name: 'Fork Bomb', hp: 30, spd: 42, r: 7, dmg: 7, cost: 3 },
    deprecated: { name: 'Deprecated API', hp: 60, spd: 10, r: 7, dmg: 8, cost: 3 },
    breaking: { name: 'Breaking Change', hp: 48, spd: 24, r: 7, dmg: 15, cost: 3 },
    cycle: { name: 'Circular Dependency', hp: 38, spd: 40, r: 6, dmg: 9, cost: 5 },
    imposter: { name: 'Supply Chain Imposter', hp: 28, spd: 80, r: 6, dmg: 10, cost: 2 },
    vconflict: { name: 'Version Conflict', hp: 150, spd: 27, r: 9, dmg: 12, cost: 8 },
    boss: { name: 'Production', hp: 1200, spd: 13, r: 19, dmg: 14, cost: 0 },
  };

  // enemy weights per room ecology
  const ECO = {
    core: { bug: 5, nullptr: 1 },
    tiny: { bug: 5, forkbomb: 2, nullptr: 1 },
    legacy: { deprecated: 3, regression: 3, bug: 2 },
    crypto: { race: 4, nullptr: 3, bug: 1 },
    memory: { leak: 3, bug: 3, nullptr: 2 },
    async: { race: 3, cycle: 2, forkbomb: 2, bug: 1 },
    yaml: { bug: 4, breaking: 3, nullptr: 1 },
    net: { nullptr: 4, breaking: 2, race: 2 },
    enterprise: { deprecated: 3, cycle: 2, leak: 2, bug: 1 },
    ai: { race: 2, forkbomb: 3, imposter: 2, bug: 1 },
    script: { regression: 4, deprecated: 2, bug: 2 },
  };

  // ---------------------------------------------------------------- registry tools
  const TOOLS = [
    { id: 'drink', name: 'Energy Drink', cost: 4, desc: '+25 Stability. +2 debt. The can says "morale".' },
    { id: 'tests', name: 'Test Suite', cost: 6, desc: 'Observability +1, permanently. See more, be surprised less.' },
    { id: 'shim', name: 'Compat Shim', cost: 5, desc: 'Papers over one version conflict. +12 debt. Shims break under load.' },
    { id: 'pin', name: 'Pin Version', cost: 3, desc: 'Charge: pin a node from the MAP. The pager skips it; debt accrues; prod will force the upgrade.' },
    { id: 'container', name: 'Container', cost: 5, desc: 'Charge: wrap a node from the MAP. Its outages stop cascading to dependents.' },
    { id: 'refactor', name: 'Refactor', cost: 5, desc: 'Pay down 20 Technical Debt. Nobody will thank you.' },
    { id: 'rollback', name: 'Rollback Plan', cost: 8, desc: 'Charge: press [R] in a fight to restore every downed node and 25 Stability.' },
    { id: 'reroll', name: 'Refresh Registry', cost: 2, desc: 'New package offers. The old ones were fine. Probably.' },
  ];

  // ---------------------------------------------------------------- incident copy
  const INCIDENT_TEXT = {
    cve: (n) => `CVE disclosed in ${n}`,
    abandoned: (n) => `${n}: maintainer rage-quit`,
    unpublish: (n) => `${n} was unpublished`,
    license: (n) => `${n} changed its license`,
    yaml: (n) => `${n}: indentation error`,
    none: (n) => `${n} shipped a "patch" release`,
  };

  const BOSSES = {
    rewrite: { name: 'THE REWRITE', color: '#b06bff', why: 'Technical debt came due.' },
    major: { name: 'THE MAJOR VERSION UPGRADE', color: '#ff9a3d', why: 'Pinned and legacy contracts all break at once.' },
    monolith: { name: 'THE DISTRIBUTED MONOLITH', color: '#3ef0e0', why: 'Everything is coupled to everything.' },
    breach: { name: 'THE BREACH', color: '#ff4d5e', why: 'You shipped a known CVE.' },
    unknown: { name: 'THE UNKNOWN UNKNOWN', color: '#8a8f98', why: 'You could not see it coming. You could not see anything.' },
    friday: { name: 'THE FRIDAY DEPLOY', color: '#ffc24a', why: 'It is 4:58 PM.' },
  };

  DH.content = { TUNE, BASE_STATS, DEPS, PACKAGES, ENEMIES, ECO, TOOLS, INCIDENT_TEXT, BOSSES };
})();
