(function bootstrapRunState(namespace) {
  function makeInitialRunState() {
    return {
      roomIndex: 0,
      currentRoomId: "local_dev",
      roomsVisited: [],
      location: { type: "node", id: "app", arrivedFrom: null },
      stability: 100,
      observability: 2,
      techDebt: 0,
      stats: { fireRate: 0.24, damage: 10, speed: 235, dashCooldown: 0.8 },
      installedPackages: [],
      tools: [],
      activeFlag: null,
      featureFlags: [],
      approvals: [],
      debtTags: [],
      mitigations: [],
      branchEvents: [],
      incident: null,
      resolvedIncidents: [],
      ended: false,
      // Systemic state added for the fuller MVP arc. All of these are inspectable
      // run-state fields so every major consequence keeps a causal trace.
      bossScores: { major_version_upgrade: 0, distributed_monolith: 0 },
      bossMutations: [],
      selectedBoss: null,
      bossStats: { safeWindows: 0, rolledBack: 0, arcsDodged: 0, defeated: null },
      risks: [],
      pins: [],
      enemyModifiers: [],
      processDecisions: [],
      revealedClues: [],
      eventLog: [],
      graph: {
        nodes: [
          { id: "app", name: "app", tags: ["core"] },
          { id: "runtime", name: "runtime", tags: ["runtime"] },
          { id: "stdlib", name: "stdlib", tags: ["core"] },
          { id: "libglitch", name: "libglitch-v3", tags: ["unstable"] },
          { id: "ci", name: "CI", tags: ["process"] },
          { id: "modern_crypto", name: "Modern Crypto", tags: ["security"], hidden: true },
          // Release-pipeline loci the run traverses toward the boss.
          { id: "telemetry", name: "Telemetry", tags: ["observability", "logging", "modern"] },
          { id: "staging", name: "Staging", tags: ["deploy", "build", "gateway"] },
          { id: "di_container", name: "DI Container", tags: ["orchestration", "experimental", "hub"] },
          { id: "release", name: "Release", tags: ["deploy", "core", "hub"] },
        ],
        edges: [
          { id: "edge_app_runtime", source: "app", target: "runtime", relation: "requires", strength: 2, visibility: "known", active: true },
          { id: "edge_runtime_stdlib", source: "runtime", target: "stdlib", relation: "requires", strength: 2, visibility: "known", active: true },
          { id: "edge_app_libglitch", source: "app", target: "libglitch", relation: "requires", strength: 1, visibility: "known", active: true },
          { id: "edge_libglitch_ci", source: "libglitch", target: "ci", relation: "observes", strength: 1, visibility: "suspected", active: true },
          { id: "edge_crypto_legacy_seed", source: "modern_crypto", target: "libglitch", relation: "patches", strength: 1, visibility: "hidden", active: true },
          { id: "edge_telemetry_app", source: "telemetry", target: "app", relation: "observes", strength: 1, visibility: "suspected", active: true },
          { id: "edge_telemetry_ci", source: "telemetry", target: "ci", relation: "observes", strength: 1, visibility: "hidden", active: true },
          { id: "edge_staging_ci", source: "staging", target: "ci", relation: "requires", strength: 2, visibility: "known", active: true },
          { id: "edge_staging_libglitch", source: "staging", target: "libglitch", relation: "requires", strength: 1, visibility: "known", active: true },
          { id: "edge_staging_di", source: "staging", target: "di_container", relation: "requires", strength: 1, visibility: "suspected", active: true },
          { id: "edge_di_container_ci", source: "di_container", target: "ci", relation: "requires", strength: 1, visibility: "suspected", active: true },
          { id: "edge_release_ci", source: "release", target: "ci", relation: "requires", strength: 2, visibility: "known", active: true },
          { id: "edge_release_app", source: "release", target: "app", relation: "requires", strength: 2, visibility: "known", active: true },
          { id: "edge_release_staging", source: "release", target: "staging", relation: "requires", strength: 2, visibility: "known", active: true },
        ],
      },
    };
  }

  namespace.runState = { makeInitialRunState };
})(window.DepHell = window.DepHell || {});
