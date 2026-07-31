(function bootstrapConstants(namespace) {
  namespace.constants = {
    // --- Top-down arena bounds (walls) ---------------------------------------
    // The playable rect for the overhead combat view. Player and enemies clamp
    // to this on BOTH axes. Widened to fill most of the 960x540 canvas (the CRT
    // error rail was removed); the HUD/log/graph panels are translucent corner
    // overlays that frame rather than carve out the floor.
    ARENA: { x0: 44, y0: 46, x1: 916, y1: 502 },
    // FLOOR_Y / GROUND_TOP are legacy side-view constants. Gameplay no longer
    // pins to a floor line; the render layer still references them until the
    // top-down floor lands (see roadmap: top-down overhaul, Phase 3).
    FLOOR_Y: 326,
    GROUND_TOP: 334,
    ROOM_INTRO_SECONDS: 1.2,
    // Node positions in the 280x190 graph viewBox, laid out as a HIERARCHICAL GRID
    // (top-down overhaul: the map is the dungeon). Rows are dependency layers with
    // the release goal at the top and leaf deps at the bottom; columns keep edges
    // short and mostly vertical. Edges are routed orthogonally (see graph.js), so
    // the minimap reads as a circuit/subway map that shares the arena's orientation.
    // Rows: R0 y=26 (goal) · R1 y=62 · R2 y=98 · R3 y=134 · R4 y=168 (installed pkgs).
    GRAPH_POSITIONS: {
      // R0 — the goal
      release: [140, 26],
      // R1 — top-level consumers
      app: [86, 62],
      staging: [196, 62],
      rollback: [250, 62],
      // R2 — mid layer
      runtime: [44, 98],
      libglitch: [110, 98],
      ci: [176, 98],
      di_container: [238, 98],
      circuit_breaker: [250, 98],
      // R3 — deeper deps
      stdlib: [44, 134],
      telemetry: [90, 134],
      modern_crypto: [140, 134],
      legacy_auth: [196, 134],
      feature_flag: [238, 134],
      // R4 — installed package/tool nodes
      test_suite: [40, 168],
      logging: [76, 168],
      rubber_duck: [108, 168],
      inline_util: [140, 168],
      shim: [172, 168],
      container: [204, 168],
      security_scanner: [236, 168],
    },
  };
})(window.DepHell = window.DepHell || {});
