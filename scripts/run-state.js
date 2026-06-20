(function bootstrapRunState(namespace) {
  function makeInitialRunState() {
    return {
      roomIndex: 0,
      stability: 100,
      observability: 2,
      techDebt: 0,
      stats: { fireRate: 0.24, damage: 10, speed: 235, dashCooldown: 0.8 },
      installedPackages: [],
      approvals: [],
      debtTags: [],
      mitigations: [],
      incident: null,
      ended: false,
      eventLog: [],
      graph: {
        nodes: [
          { id: "app", name: "app", tags: ["core"] },
          { id: "runtime", name: "runtime", tags: ["runtime"] },
          { id: "stdlib", name: "stdlib", tags: ["core"] },
          { id: "libglitch", name: "libglitch-v3", tags: ["unstable"] },
          { id: "ci", name: "CI", tags: ["process"] },
          { id: "modern_crypto", name: "Modern Crypto", tags: ["security"], hidden: true },
        ],
        edges: [
          { id: "edge_app_runtime", source: "app", target: "runtime", relation: "requires", strength: 2, visibility: "known", active: true },
          { id: "edge_runtime_stdlib", source: "runtime", target: "stdlib", relation: "requires", strength: 2, visibility: "known", active: true },
          { id: "edge_app_libglitch", source: "app", target: "libglitch", relation: "requires", strength: 1, visibility: "known", active: true },
          { id: "edge_libglitch_ci", source: "libglitch", target: "ci", relation: "observes", strength: 1, visibility: "suspected", active: true },
          { id: "edge_crypto_legacy_seed", source: "modern_crypto", target: "libglitch", relation: "patches", strength: 1, visibility: "hidden", active: true },
        ],
      },
    };
  }

  namespace.runState = { makeInitialRunState };
})(window.DepHell = window.DepHell || {});
