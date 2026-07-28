(function bootstrapContent(namespace) {
  const { FLOOR_Y } = namespace.constants;

  // ---------------------------------------------------------------------------
  // Packages — the primary build-shaping rewards. Every package touches the
  // dependency graph and leaves a traceable later consequence (design gate);
  // none is a pure stat bump. Effects use only implemented effect verbs.
  // ---------------------------------------------------------------------------
  const packages = [
    {
      id: "legacy_auth",
      name: "LegacyAuth",
      benefit: "Old-system enemies hesitate. Unlocks a recovery cache in the Verification Fork.",
      risk: "Suspected conflict with Modern Crypto. Adds a security exception and legacy boss pressure.",
      tags: ["legacy", "auth", "security_exception"],
      effects: [
        { op: "addNode", id: "legacy_auth", name: "LegacyAuth", tags: ["legacy", "security_risk"] },
        { op: "addEdge", source: "app", target: "legacy_auth", relation: "requires", strength: 2, visibility: "known" },
        { op: "addEdge", source: "legacy_auth", target: "modern_crypto", relation: "conflicts", strength: 3, visibility: "suspected" },
        { op: "modifyStat", stat: "fireRate", amount: -0.05 },
        { op: "increaseDebt", amount: 12, tag: "security_exception" },
        { op: "addApproval", id: "security_exception", target: "LegacyAuth", reason: "temporary auth bridge" },
        { op: "addBossScore", boss: "major_version_upgrade", amount: 2, reason: "LegacyAuth adds a legacy contract the major bump must break" },
      ],
    },
    {
      id: "test_suite",
      name: "Test Suite",
      benefit: "Reveals hidden/suspected risks and weakens the next incident.",
      risk: "Slower swing cadence while tests run before every room.",
      tags: ["observability", "process", "safer", "test"],
      effects: [
        { op: "addNode", id: "test_suite", name: "Test Suite", tags: ["observability", "process"] },
        { op: "addEdge", source: "test_suite", target: "app", relation: "observes", strength: 2, visibility: "known" },
        { op: "modifyResource", resource: "observability", amount: 2 },
        { op: "modifyStat", stat: "fireRate", amount: 0.08 },
        { op: "revealEdges", visibility: "suspected" },
        { op: "addTag", list: "mitigations", tag: "test_coverage" },
      ],
    },
    {
      id: "compatibility_shim",
      name: "Compatibility Shim",
      benefit: "Patches one conflict and increases patch blade damage.",
      risk: "Adds Technical Debt. Future build failure blames the shim first.",
      tags: ["debt", "fix", "short-term", "patch"],
      effects: [
        { op: "addNode", id: "shim", name: "Compat Shim", tags: ["debt", "patch"] },
        { op: "addEdge", source: "shim", target: "libglitch", relation: "patches", strength: 2, visibility: "known" },
        { op: "modifyStat", stat: "damage", amount: 4 },
        { op: "increaseDebt", amount: 18, tag: "compatibility_shim" },
      ],
    },
    {
      id: "feature_flag",
      name: "Feature Flag",
      benefit: "Grants F: flag the current graph locus to briefly suppress incident pressure.",
      risk: "Each use adds configuration-drift debt and can haunt later reports.",
      tags: ["tool", "control", "drift"],
      effects: [
        { op: "addNode", id: "feature_flag", name: "Feature Flag", tags: ["control", "drift"] },
        { op: "addEdge", source: "feature_flag", target: "ci", relation: "flags", strength: 2, visibility: "known" },
        { op: "addTool", tool: "feature_flag" },
        { op: "increaseDebt", amount: 8, tag: "flag_infrastructure" },
      ],
    },
    {
      id: "modern_crypto",
      name: "Modern Crypto",
      benefit: "Reveals the hidden Modern Crypto node and its patch on libglitch. +3 secure blade damage; counts as a CVE patch so breach/audit hazards can't cite you.",
      risk: "If LegacyAuth is present it wakes the crypto/legacy conflict, flipping your next incident to Build Failure. Registers a crypto migration that locks Rollback.",
      tags: ["crypto", "modern", "security", "conflict"],
      effects: [
        { op: "revealNode", id: "modern_crypto" },
        { op: "revealEdges", relation: "patches", visibility: "hidden" },
        { op: "revealEdges", relation: "conflicts", visibility: "suspected" },
        { op: "modifyStat", stat: "damage", amount: 3 },
        { op: "addTag", list: "mitigations", tag: "cve_patched" },
        { op: "registerRisk", id: "crypto_migration", kind: "upgrade", target: "modern_crypto", reason: "crypto migration re-signs dependents; cannot be rolled back" },
      ],
    },
    {
      id: "logging_framework",
      name: "Logging Framework",
      benefit: "Adds a Logging node observing libglitch, reveals suspected observe edges, +1 observability, and shows enemy HP bars and telegraph rings you couldn't read before.",
      risk: "Every emitted line is noise: +6 Technical Debt. Loud logs make Audit Pressure drain faster.",
      tags: ["logging", "observability", "modern", "noisy"],
      effects: [
        { op: "addNode", id: "logging", name: "Logging", tags: ["observability", "logging"] },
        { op: "addEdge", source: "logging", target: "libglitch", relation: "observes", strength: 2, visibility: "known" },
        { op: "modifyResource", resource: "observability", amount: 1 },
        { op: "revealEdges", relation: "observes", visibility: "suspected" },
        { op: "addTag", list: "mitigations", tag: "hazard_visibility" },
        { op: "increaseDebt", amount: 6, tag: "log_noise" },
      ],
    },
    {
      id: "containerization",
      name: "Containerization",
      benefit: "Wraps libglitch in a Container that isolates its edges. Conflicts and memory-leak infection can't cascade across the boundary — the hard counter to cascade incidents and the Distributed Monolith.",
      risk: "The container hides what's inside: observability -1 while wrapped, and the heavy image adds +5 debt.",
      tags: ["orchestration", "modern", "isolator", "slow"],
      effects: [
        { op: "addNode", id: "container", name: "Container", tags: ["orchestration", "isolator"] },
        { op: "addEdge", source: "container", target: "libglitch", relation: "isolates", strength: 3, visibility: "known" },
        { op: "addTag", list: "mitigations", tag: "cascade_isolation" },
        { op: "addBossScore", boss: "distributed_monolith", amount: -2, reason: "Containerization isolates an edge and cuts blast radius" },
        { op: "modifyResource", resource: "observability", amount: -1 },
        { op: "increaseDebt", amount: 5, tag: "image_bloat" },
      ],
    },
    {
      id: "rollback_plan",
      name: "Rollback Plan",
      benefit: "Unlocks R: revert the last few seconds — restore recent Stability loss and clear one projectile/hazard wave at the current locus.",
      risk: "Blocked whenever an upgrade/migration risk is registered (you can't un-ship a re-signed crypto or a pinned major). Each use adds +4 drift debt.",
      tags: ["deploy", "control", "tool", "brittle"],
      effects: [
        { op: "addNode", id: "rollback", name: "Rollback Plan", tags: ["deploy", "control"] },
        { op: "addEdge", source: "rollback", target: "app", relation: "reverts", strength: 2, visibility: "known" },
        { op: "addTool", tool: "rollback" },
        { op: "addTag", list: "mitigations", tag: "damage_recovery" },
        { op: "increaseDebt", amount: 4, tag: "rollback_scripts" },
      ],
    },
    {
      id: "pin_version",
      name: "Pin Version",
      benefit: "Pins libglitch to its current version. No surprise upgrades: version-drift Breaking Changes lose 6 damage while the pin holds.",
      risk: "Pins accrue upgrade pressure: +3 Major Version Upgrade boss score and an upgrade risk that locks Rollback.",
      tags: ["build", "legacy", "brittle", "sink"],
      effects: [
        { op: "pinNode", id: "libglitch" },
        { op: "addEnemyModifier", scope: "breaking_change", stat: "damage", amount: -6 },
        { op: "addBossScore", boss: "major_version_upgrade", amount: 3, reason: "pinned libglitch accrues major-upgrade debt" },
        { op: "registerRisk", id: "pin_upgrade_pressure", kind: "upgrade", target: "libglitch", reason: "pinned dependency will force a major upgrade later" },
        { op: "increaseDebt", amount: 4, tag: "pinned_dependency" },
      ],
    },
    {
      id: "security_scanner",
      name: "Security Scanner",
      benefit: "Reveals hidden security edges and the Modern Crypto node, then files each insecure node as a tracked risk. Registered risks can't be cited fresh — the counter to Audit Pressure and CVE.",
      risk: "Naming the risks makes them real: +5 audit-backlog debt now, and it surfaces an unpublish/yank risk you'll have to handle.",
      tags: ["security", "observability", "audit", "bridge"],
      effects: [
        { op: "addNode", id: "security_scanner", name: "Security Scanner", tags: ["security", "observability"] },
        { op: "addEdge", source: "security_scanner", target: "libglitch", relation: "scans", strength: 2, visibility: "known" },
        { op: "revealNode", id: "modern_crypto" },
        { op: "revealEdges", visibility: "hidden" },
        { op: "registerRisk", id: "libglitch_cve", kind: "security", target: "libglitch", reason: "unstable dependency has open CVEs" },
        { op: "registerRisk", id: "libglitch_unpublish", kind: "unpublish", target: "libglitch", reason: "left-pad-style yank risk on an abandoned transitive dep" },
        { op: "addTag", list: "mitigations", tag: "risk_registered" },
        { op: "increaseDebt", amount: 5, tag: "audit_backlog" },
      ],
    },
    {
      id: "circuit_breaker",
      name: "Circuit Breaker",
      benefit: "Unlocks C: trip the breaker on the libglitch→ci edge — block incoming projectiles and halt cascade for ~4s, then cool down.",
      risk: "A tripped breaker also cuts the patch damage flowing through it; leaning on it adds +3 fallback-path debt.",
      tags: ["network", "control", "isolator", "tool"],
      effects: [
        { op: "addNode", id: "circuit_breaker", name: "Circuit Breaker", tags: ["network", "control"] },
        { op: "addEdge", source: "circuit_breaker", target: "ci", relation: "breaks", strength: 2, visibility: "known" },
        { op: "addTool", tool: "circuit_breaker" },
        { op: "addTag", list: "mitigations", tag: "projectile_shield" },
        { op: "increaseDebt", amount: 3, tag: "fallback_paths" },
      ],
    },
    {
      id: "rubber_duck",
      name: "Rubber Duck",
      benefit: "Adds the Duck node and a stand-still verb: hold position ~1.6s to reveal one hidden edge or node. Observability +1.",
      risk: "Standing still in a firefight is its own hazard, and the Duck occasionally emits a spurious suspected edge — logged as duck_hypothesis so you can trace and dismiss it.",
      tags: ["observability", "handmade", "experimental", "source"],
      effects: [
        { op: "addNode", id: "rubber_duck", name: "Rubber Duck", tags: ["observability", "handmade"] },
        { op: "addEdge", source: "rubber_duck", target: "app", relation: "explains", strength: 1, visibility: "known" },
        { op: "addTool", tool: "rubber_duck" },
        { op: "addTag", list: "mitigations", tag: "duck_debug" },
        { op: "modifyResource", resource: "observability", amount: 1 },
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // Incidents — run-level pressure created by graph state. Each has >=2 resolution
  // paths with an immediate effect and a traceable later consequence. Selection
  // weighting lives in game.js (reads run state); resolution data lives here.
  // ---------------------------------------------------------------------------
  const incidents = {
    build_failure: {
      name: "Build Failure",
      blurb: "A conflict edge activated. The pipeline is red and staging is louder for it.",
      resolutions: [
        {
          id: "debug", label: "Debug the conflict",
          immediate: "Trace the failing edge. Slower, but the blast radius shrinks.",
          consequence: "Reveals the conflict cause; drain reduced.",
          drain: 4,
          effects: [{ op: "revealEdges", relation: "conflicts" }, { op: "addTag", list: "mitigations", tag: "root_caused" }],
        },
        {
          id: "push_through", label: "Push it through",
          immediate: "Ship anyway. Full pressure, but no time lost.",
          consequence: "Higher drain; the postmortem will remember this.",
          drain: 9,
          effects: [{ op: "increaseDebt", amount: 6, tag: "shipped_red" }],
        },
      ],
    },
    audit_pressure: {
      name: "Audit Pressure",
      blurb: "A previous shortcut was selected for review. Compliance would like a word.",
      resolutions: [
        {
          id: "file_exception", label: "File a security exception",
          immediate: "Paper over it now; audit backlog later.",
          consequence: "Reduced drain now; adds an approval the report will cite.",
          drain: 4,
          effects: [{ op: "addApproval", id: "audit_exception", target: "staging", reason: "audit deferred pending review by nobody available" }],
        },
        {
          id: "remediate", label: "Remediate on the spot",
          immediate: "Do the work. Costs Stability but clears the flag.",
          consequence: "Higher immediate cost; banks a clean-audit mitigation.",
          drain: 7,
          effects: [{ op: "addTag", list: "mitigations", tag: "audit_clean" }],
        },
      ],
    },
    minor_regression: {
      name: "Minor Regression",
      blurb: "CI noticed something unsettling. Probably fine. Probably.",
      resolutions: [
        {
          id: "patch", label: "Patch it quietly",
          immediate: "A small fix. Low drain.",
          consequence: "Minimal cost; nothing returns.",
          drain: 3,
          effects: [],
        },
        {
          id: "ignore", label: "Mark won't-fix",
          immediate: "Ignore it. Free now.",
          consequence: "Adds a little debt; may resurface as a regression.",
          drain: 4,
          effects: [{ op: "increaseDebt", amount: 4, tag: "wont_fix" }],
        },
      ],
    },
    critical_cve: {
      name: "Critical CVE",
      blurb: "A security advisory landed on a dependency you are shipping. The clock is loud.",
      resolutions: [
        {
          id: "patch_cve", label: "Patch immediately",
          immediate: "Emergency patch. Adds patch debt but closes the hole.",
          consequence: "Marks the CVE patched; audit can't cite it.",
          drain: 4,
          effects: [{ op: "addTag", list: "mitigations", tag: "cve_patched" }, { op: "increaseDebt", amount: 5, tag: "emergency_patch" }],
        },
        {
          id: "accept_cve", label: "Accept the risk",
          immediate: "Sign the waiver. No time lost now.",
          consequence: "Raises boss/audit danger; the acceptance returns later.",
          drain: 6,
          effects: [
            { op: "addApproval", id: "cve_accepted", target: "libglitch", reason: "risk accepted by the person currently on fire" },
            { op: "registerRisk", id: "cve_unpatched", kind: "security", target: "libglitch", reason: "known CVE shipped unpatched" },
            { op: "addBossScore", boss: "distributed_monolith", amount: 2, reason: "accepted CVE widens the blast radius" },
          ],
        },
      ],
    },
    dependency_unpublish: {
      name: "Dependency Unpublish",
      blurb: "A tiny utility you depend on was yanked from the registry mid-release. Classic.",
      resolutions: [
        {
          id: "vendor", label: "Vendor the package",
          immediate: "Copy it in-house. Immune to further yanks.",
          consequence: "Adds debt and an unmaintained node; no auto security patches.",
          drain: 4,
          effects: [
            { op: "addNode", id: "inline_util", name: "Vendored Util", tags: ["handmade", "unmaintained"] },
            { op: "addEdge", source: "app", target: "inline_util", relation: "requires", strength: 1, visibility: "known" },
            { op: "increaseDebt", amount: 6, tag: "vendored_dependency" },
          ],
        },
        {
          id: "scramble", label: "Scramble for a mirror",
          immediate: "Pull it from a shady mirror. Fast but risky.",
          consequence: "Registers a supply-chain risk that can return.",
          drain: 6,
          effects: [{ op: "registerRisk", id: "shady_mirror", kind: "security", target: "app", reason: "restored yanked dep from an unverified mirror" }],
        },
      ],
    },
  };

  // ---------------------------------------------------------------------------
  // Enemies & bosses. Bosses are enemyDefs flagged boss:true with a phases model
  // the boss engine reads. version_conflict_half is spawned at runtime on fork.
  // ---------------------------------------------------------------------------
  const enemyDefs = {
    regression: { name: "Regression", hp: 18, speed: 64, damage: 8, color: "#ff4265", w: 26, h: 22 },
    breaking_change: { name: "Breaking Change", hp: 28, speed: 92, damage: 15, color: "#ffcf66", w: 34, h: 30, ranged: true },
    memory_leak: { name: "Memory Leak", hp: 52, speed: 38, damage: 5, color: "#7aa8ff", w: 42, h: 42 },
    transitive_bug: { name: "Transitive Bug", hp: 12, speed: 78, damage: 6, color: "#b07cff", w: 20, h: 16 },
    version_conflict: { name: "Version Conflict", hp: 30, speed: 70, damage: 12, color: "#ff2d55", w: 30, h: 26 },
    version_conflict_half: { name: "Version Conflict (fork)", hp: 14, speed: 84, damage: 9, color: "#ff8a3d", w: 18, h: 18 },
    deprecated_api: { name: "Deprecated API", hp: 44, speed: 30, damage: 6, color: "#ffa62b", w: 40, h: 34 },
    dependency_cycle: { name: "Dependency Cycle", hp: 40, speed: 70, damage: 10, color: "#ff9a3c", w: 34, h: 30, ranged: true },
    major_version_upgrade: {
      name: "The Major Version Upgrade", hp: 210, speed: 58, damage: 16, color: "#c58bff", w: 56, h: 60,
      boss: true, ranged: true,
      edges: ["edge_release_app", "edge_release_ci", "edge_app_libglitch"],
      phases: [
        { name: "Deprecation Notice", at: 1.0, windowEvery: 3.6, windowFor: 1.6, arcEvery: 2.6 },
        { name: "Forced Migration", at: 0.66, windowEvery: 3.2, windowFor: 1.4, arcEvery: 2.0, summon: "breaking_change" },
        { name: "Semver Reckoning", at: 0.33, windowEvery: 2.8, windowFor: 1.05, arcEvery: 1.6, summon: "regression" },
      ],
    },
    distributed_monolith: {
      name: "The Distributed Monolith", hp: 240, speed: 44, damage: 12, color: "#7aa8ff", w: 64, h: 64,
      boss: true,
      edges: ["edge_release_ci", "edge_release_staging", "edge_staging_libglitch"],
      phases: [
        { name: "Single Deploy", at: 1.0, windowEvery: 3.4, windowFor: 1.5, arcEvery: 2.4 },
        { name: "Backpressure", at: 0.66, windowEvery: 3.0, windowFor: 1.3, arcEvery: 2.0, summon: "memory_leak" },
        { name: "Cascading Failure", at: 0.33, windowEvery: 2.6, windowFor: 1.05, arcEvery: 1.5, summon: "transitive_bug" },
      ],
    },
  };

  // ---------------------------------------------------------------------------
  // Floor — the Release Candidate Pipeline. 11-room pool; a single run visits 9
  // rooms with two guaranteed branch points (local_dev, integration_bay) and one
  // package-gated shortcut (verification_fork). All branches reconverge on the boss.
  // ---------------------------------------------------------------------------
  const rooms = [
    {
      id: "local_dev",
      name: "Local Development",
      subtitle: "Two regressions in a quiet service chamber. Validate the stack, or point tooling at what CI is hiding.",
      mapNode: "app",
      routes: [
        {
          id: "route_localdev_runtime", label: "Runtime Detour", to: "runtime_detour", edge: "edge_app_runtime",
          description: "Clear a boring validation loop through the runtime stack before touching libglitch-v3.",
          tradeoff: "Safe: +Stability, no debt — but you meet the package offer half-blind (the seeded conflict stays hidden).",
        },
        {
          id: "route_localdev_audit", label: "Dependency Audit", to: "dependency_audit", edge: "edge_telemetry_app",
          description: "Aim Telemetry at your own dependencies and read what it draws.",
          tradeoff: "Risky: a harder three-enemy fight, but +2 Observability and the hidden Modern Crypto cluster is revealed before it can ambush you.",
        },
      ],
      enemies: [
        { type: "regression", x: 640, y: FLOOR_Y },
        { type: "regression", x: 765, y: FLOOR_Y },
      ],
    },
    {
      id: "runtime_detour",
      name: "Runtime Detour",
      subtitle: "A short validation loop through the runtime stack. Slow, boring, load-bearing.",
      mapNode: "runtime",
      clearReward: { stability: 5, text: "Runtime Detour recovered a small validation cache. Stability +5." },
      routes: [
        {
          id: "route_runtime_package", label: "Package Gate", to: "package_gate", edge: "edge_app_libglitch",
          description: "Return through app and enter the unstable package chamber with a little more confidence.",
          tradeoff: "Delayed upgrade; you still cannot see the suspected conflict without more observability.",
        },
      ],
      enemies: [
        { type: "regression", x: 660, y: FLOOR_Y },
        { type: "memory_leak", x: 790, y: FLOOR_Y },
      ],
    },
    {
      id: "dependency_audit",
      name: "Dependency Audit",
      subtitle: "Point Telemetry at your own graph. You will not like what it draws, but now you can see it coming.",
      mapNode: "telemetry",
      observabilityRoom: true,
      clearReward: {
        observability: 2,
        text: "Audit raised observability and exposed the Modern Crypto cluster and its patch seed.",
        effects: [
          { op: "revealNode", id: "modern_crypto" },
          { op: "revealEdges", relation: "patches" },
          { op: "revealEdges", relation: "observes" },
          { op: "registerRisk", id: "crypto_conflict_surfaced", kind: "security", target: "modern_crypto", reason: "audit surfaced legacy/modern crypto mismatch and the hidden patch seed" },
          { op: "addBossScore", boss: "major_version_upgrade", amount: 2, reason: "hidden crypto upgrade pressure made visible" },
        ],
      },
      routes: [
        {
          id: "route_audit_package", label: "Package Gate", to: "package_gate", edge: "edge_app_libglitch",
          description: "Carry the fresh observability into the package offer and read the real risk text.",
          tradeoff: "You spent Stability on the harder fight, but now the package risk lines read true (Observability >= 4).",
        },
      ],
      enemies: [
        { type: "dependency_cycle", x: 700, y: FLOOR_Y },
        { type: "regression", x: 640, y: FLOOR_Y },
        { type: "memory_leak", x: 830, y: FLOOR_Y },
      ],
    },
    {
      id: "package_gate",
      name: "Package Gate",
      subtitle: "Break the yellow change, then inspect the package offer. Everything you install here is read back to you at the boss.",
      mapNode: "libglitch",
      packageChoice: true,
      packagePool: ["legacy_auth", "test_suite", "compatibility_shim", "feature_flag", "modern_crypto", "logging_framework", "containerization", "security_scanner", "pin_version", "circuit_breaker", "rollback_plan", "rubber_duck"],
      routes: [
        {
          id: "route_package_test", label: "Test Gate", to: "test_gate", edge: "edge_libglitch_ci",
          description: "Follow the suspected CI relation into the test suite.",
          tradeoff: "The chosen package now shapes every downstream checkpoint.",
        },
      ],
      enemies: [
        { type: "breaking_change", x: 700, y: FLOOR_Y },
        { type: "regression", x: 820, y: FLOOR_Y },
      ],
    },
    {
      id: "test_gate",
      name: "Test Gate",
      subtitle: "CI runs the suite. Flaky tests wear regression skins; the real failure is the loud one. Clear the board to promote what you suspected.",
      mapNode: "ci",
      testRoom: true,
      clearReward: {
        observability: 1,
        text: "Suite passed: suspected edges promoted to known and test_coverage banked, softening the next incident.",
        effects: [
          { op: "revealEdges", visibility: "suspected" },
          { op: "addTag", list: "mitigations", tag: "test_coverage" },
          { op: "addBossScore", boss: "major_version_upgrade", amount: 1, reason: "tests pin down libglitch instability as a version problem" },
        ],
      },
      routes: [
        {
          id: "route_test_verify", label: "Verification Fork", to: "verification_fork", edge: "edge_libglitch_ci",
          description: "Carry the verified build into the checkpoint the package reshapes.",
          tradeoff: "Consequences of the install become visible and start feeding the boss score.",
        },
      ],
      enemies: [
        { type: "regression", x: 640, y: FLOOR_Y },
        { type: "version_conflict", x: 760, y: FLOOR_Y },
        { type: "breaking_change", x: 850, y: FLOOR_Y },
      ],
    },
    {
      id: "verification_fork",
      name: "Verification Fork",
      subtitle: "The chosen package changes this checkpoint. Coverage buys a shortcut nobody else gets.",
      mapEdge: "edge_libglitch_ci",
      branchEncounter: true,
      routes: [
        {
          id: "route_verify_integration", label: "Integration Bay", to: "integration_bay", edge: "edge_staging_ci",
          description: "Merge the verified build into staging and meet everything you installed at once.",
          tradeoff: "The default path: a real integration fight, but it unlocks both boss-prep branches.",
        },
        {
          id: "route_verify_coverage", label: "Coverage Shortcut", to: "refactor_bay", edge: "edge_libglitch_ci", requiresPackage: "test_suite",
          description: "Test Suite evidence lets you skip the integration gauntlet and go straight to cleanup.",
          tradeoff: "Only with Test Suite: skip a fight, but forfeit the Dependency Injection power branch.",
        },
      ],
      enemies: [],
    },
    {
      id: "integration_bay",
      name: "Integration Bay",
      subtitle: "Everything you installed merges at once and the cycles resolve badly. Meet production cleaned up, or loaded up.",
      mapNode: "staging",
      routes: [
        {
          id: "route_integration_refactor", label: "Refactor Bay", to: "refactor_bay", edge: "edge_staging_libglitch",
          description: "Pay down debt and untangle the graph before the release reads the receipts.",
          tradeoff: "Safe boss-prep: -10 debt and a lower Distributed Monolith score, but no new power.",
        },
        {
          id: "route_integration_di", label: "Dependency Injection", to: "dependency_injection", edge: "edge_staging_di",
          description: "Install the framework that wires everything to everything.",
          tradeoff: "Risky: more power now, but +debt, a run-wide enemy HP buff, a pinned hub, and a much angrier Distributed Monolith.",
        },
      ],
      enemies: [
        { type: "dependency_cycle", x: 700, y: FLOOR_Y },
        { type: "transitive_bug", x: 620, y: FLOOR_Y },
        { type: "breaking_change", x: 840, y: FLOOR_Y },
      ],
    },
    {
      id: "refactor_bay",
      name: "Refactor Bay",
      subtitle: "Pay down what you can before production reads the receipts. Boring work that keeps the boss small.",
      mapNode: "libglitch",
      refactorRoom: true,
      clearReward: {
        techDebt: -10,
        text: "Refactor pass removed debt and de-entangled the release graph. Distributed Monolith pressure eased.",
        effects: [
          { op: "addBossScore", boss: "distributed_monolith", amount: -3, reason: "refactor removed entangling wiring and paid down debt" },
          { op: "addTag", list: "mitigations", tag: "refactor_pass" },
          { op: "registerRisk", id: "refactor_regression_risk", kind: "regression", target: "libglitch", reason: "aggressive refactor may reintroduce old behavior under load" },
        ],
      },
      routes: [
        {
          id: "route_refactor_staging", label: "Staging Incident", to: "staging_incident", edge: "edge_libglitch_ci",
          description: "Carry the cleaned build into staging.",
          tradeoff: "Less debt means Audit Pressure is unlikely, but a conflict edge can still trip Build Failure.",
        },
      ],
      enemies: [
        { type: "regression", x: 680, y: FLOOR_Y },
        { type: "deprecated_api", x: 800, y: FLOOR_Y },
      ],
    },
    {
      id: "dependency_injection",
      name: "Dependency Injection",
      subtitle: "A framework that wires everything to everything. Powerful, and that is precisely the problem.",
      mapNode: "di_container",
      clearReward: {
        techDebt: 14,
        text: "The DI container became a runtime hub with hidden wiring: enemies hardened run-wide and Distributed Monolith is now the likely boss.",
        effects: [
          { op: "addEdge", source: "di_container", target: "app", relation: "requires", strength: 2, visibility: "known" },
          { op: "addBossScore", boss: "distributed_monolith", amount: 5, reason: "DI container added a central hub and opaque cross-wiring" },
          { op: "addEnemyModifier", scope: "all", stat: "hp", amount: 6, reason: "added indirection makes every failure harder to kill cleanly" },
          { op: "pinNode", id: "di_container", reason: "framework version pinned to keep the wiring stable" },
          { op: "registerRisk", id: "di_upgrade_lock", kind: "upgrade", target: "di_container", reason: "pinned DI framework blocks clean upgrades and concentrates blast radius" },
        ],
      },
      routes: [
        {
          id: "route_di_staging", label: "Staging Incident", to: "staging_incident", edge: "edge_di_container_ci",
          description: "Push the loaded build into staging and hope the wiring holds.",
          tradeoff: "Extra debt makes Audit Pressure likely, and hardened enemies drain more Stability under any incident.",
        },
      ],
      enemies: [
        { type: "breaking_change", x: 700, y: FLOOR_Y },
        { type: "regression", x: 820, y: FLOOR_Y },
      ],
    },
    {
      id: "staging_incident",
      name: "Staging Incident",
      subtitle: "A consequence arrives wearing a process badge. Which one depends entirely on what you shipped.",
      mapNode: "ci",
      incident: true,
      clearReward: {
        text: "Staging surfaced version skew across the release edge. The boss has been reading the diff.",
        effects: [
          { op: "addBossScore", boss: "major_version_upgrade", amount: 2, reason: "staging exposed version skew on the release-critical path" },
        ],
      },
      routes: [
        {
          id: "route_staging_boss", label: "Release", to: "release_boss", edge: "edge_release_ci",
          description: "Open the production release. It has read every commit you made.",
          tradeoff: "No turning back: the boss is whichever pressure you let accumulate.",
        },
      ],
      enemies: [
        { type: "memory_leak", x: 720, y: FLOOR_Y },
        { type: "breaking_change", x: 840, y: FLOOR_Y },
      ],
    },
    {
      id: "release_boss",
      name: "The Release",
      subtitle: "Production opens the pull request you have been dreading. It named the exact edge you ignored.",
      mapNode: "release",
      bossRoom: true,
      enemies: [
        { type: "breaking_change", x: 650, y: FLOOR_Y },
        { type: "breaking_change", x: 840, y: FLOOR_Y },
      ],
      routes: [],
    },
  ];

  namespace.content = { packages, incidents, rooms, enemyDefs };
})(window.DepHell = window.DepHell || {});
