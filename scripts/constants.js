(function bootstrapConstants(namespace) {
  namespace.constants = {
    FLOOR_Y: 326,
    GROUND_TOP: 334,
    ROOM_INTRO_SECONDS: 1.2,
    // Stable node positions in the 280x190 graph viewBox. New loci are spaced
    // >=24px from their neighbours so the minimap stays legible even when a run
    // installs several package nodes at once.
    GRAPH_POSITIONS: {
      // Core / initial graph
      app: [48, 88],
      runtime: [110, 58],
      stdlib: [174, 72],
      libglitch: [142, 126],
      ci: [225, 128],
      legacy_auth: [96, 142],
      modern_crypto: [214, 42],
      test_suite: [52, 42],
      shim: [190, 154],
      feature_flag: [238, 84],
      // Floor loci (release pipeline spine)
      telemetry: [34, 120],
      staging: [166, 104],
      di_container: [222, 158],
      release: [128, 100],
      // Package-created nodes
      logging: [88, 30],
      container: [120, 162],
      rollback: [40, 152],
      security_scanner: [140, 38],
      circuit_breaker: [250, 148],
      rubber_duck: [72, 108],
      inline_util: [64, 68],
    },
  };
})(window.DepHell = window.DepHell || {});
