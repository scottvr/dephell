(function bootstrapContent(namespace) {
  const { FLOOR_Y } = namespace.constants;

  const packages = [
    {
      id: "legacy_auth",
      name: "LegacyAuth",
      benefit: "Old-system enemies hesitate. Unlocks a recovery cache in room three.",
      risk: "Suspected conflict with Modern Crypto. Adds a security exception.",
      tags: ["legacy", "auth", "security exception"],
      effects: [
        { op: "addNode", id: "legacy_auth", name: "LegacyAuth", tags: ["legacy", "security_risk"] },
        { op: "addEdge", source: "app", target: "legacy_auth", relation: "requires", strength: 2, visibility: "known" },
        { op: "addEdge", source: "legacy_auth", target: "modern_crypto", relation: "conflicts", strength: 3, visibility: "suspected" },
        { op: "modifyStat", stat: "fireRate", amount: -0.05 },
        { op: "increaseDebt", amount: 12, tag: "security_exception" },
        { op: "addApproval", id: "security_exception", target: "LegacyAuth", reason: "temporary auth bridge" },
      ],
    },
    {
      id: "test_suite",
      name: "Test Suite",
      benefit: "Reveals hidden/suspected risks and weakens the next incident.",
      risk: "Slower swing cadence while tests run before every room.",
      tags: ["observability", "process", "safer"],
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
      tags: ["debt", "fix", "short-term"],
      effects: [
        { op: "addNode", id: "shim", name: "Compat Shim", tags: ["debt", "patch"] },
        { op: "addEdge", source: "shim", target: "libglitch", relation: "patches", strength: 2, visibility: "known" },
        { op: "modifyStat", stat: "damage", amount: 4 },
        { op: "increaseDebt", amount: 18, tag: "compatibility_shim" },
      ],
    },
  ];

  const rooms = [
    {
      id: "local_dev",
      name: "Local Development",
      subtitle: "Two regressions in a quiet service chamber.",
      mapNode: "app",
      routes: [
        {
          id: "route_app_libglitch",
          label: "Package Gate",
          to: "package_gate",
          edge: "edge_app_libglitch",
          description: "Fast path to the unstable dependency and its package offer.",
          tradeoff: "Earlier upgrade, less validation.",
        },
        {
          id: "route_app_runtime",
          label: "Runtime Detour",
          to: "runtime_detour",
          edge: "edge_app_runtime",
          description: "Clear one extra chamber before touching libglitch-v3.",
          tradeoff: "More combat, small recovery cache.",
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
      subtitle: "A short validation loop through the runtime stack.",
      mapNode: "runtime",
      clearReward: { stability: 5, text: "Runtime Detour recovered a small validation cache. Stability +5." },
      routes: [
        {
          id: "route_runtime_libglitch",
          label: "Package Gate",
          to: "package_gate",
          edge: "edge_app_libglitch",
          description: "Return through app and enter the unstable package chamber.",
          tradeoff: "Delayed upgrade with a little more confidence.",
        },
      ],
      enemies: [
        { type: "regression", x: 660, y: FLOOR_Y },
        { type: "memory_leak", x: 790, y: FLOOR_Y },
      ],
    },
    {
      id: "package_gate",
      name: "Package Gate",
      subtitle: "Break the yellow change, then inspect the package offer.",
      mapNode: "libglitch",
      packageChoice: true,
      routes: [
        {
          id: "route_libglitch_ci",
          label: "Verification Fork",
          to: "verification_fork",
          edge: "edge_libglitch_ci",
          description: "Follow the suspected CI relation into package verification.",
          tradeoff: "The chosen package shapes this checkpoint.",
        },
      ],
      enemies: [
        { type: "breaking_change", x: 700, y: FLOOR_Y },
        { type: "regression", x: 820, y: FLOOR_Y },
      ],
    },
    {
      id: "verification_fork",
      name: "Verification Fork",
      subtitle: "The chosen package changes this checkpoint.",
      mapEdge: "edge_libglitch_ci",
      branchEncounter: true,
      routes: [
        {
          id: "route_ci_staging",
          label: "Staging Incident",
          to: "staging_incident",
          edge: "edge_libglitch_ci",
          description: "Carry the verified build into staging.",
          tradeoff: "Consequences become visible.",
        },
      ],
      enemies: [],
    },
    {
      id: "staging_incident",
      name: "Staging Incident",
      subtitle: "A consequence arrives wearing a process badge.",
      mapNode: "ci",
      incident: true,
      enemies: [
        { type: "memory_leak", x: 720, y: FLOOR_Y },
        { type: "breaking_change", x: 840, y: FLOOR_Y },
      ],
    },
  ];

  const enemyDefs = {
    regression: { name: "Regression", hp: 18, speed: 64, damage: 8, color: "#ff4265", w: 26, h: 22 },
    breaking_change: { name: "Breaking Change", hp: 28, speed: 92, damage: 15, color: "#ffcf66", w: 34, h: 30 },
    memory_leak: { name: "Memory Leak", hp: 52, speed: 38, damage: 5, color: "#7aa8ff", w: 42, h: 42 },
  };

  namespace.content = { packages, rooms, enemyDefs };
})(window.DepHell = window.DepHell || {});
