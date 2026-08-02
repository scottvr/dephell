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
    ROOM_INTRO_SECONDS: 3.6,
    // Node positions in the 280x190 graph viewBox, laid out as a LEFT-TO-RIGHT
    // DELIVERY PIPELINE (the "journey"/release-train orientation). The delivery flow
    // runs opposite the `requires` arrows: source/leaf code on the LEFT, then CI, then
    // staging, with the Release goal on the RIGHT — the destination you travel toward.
    // The room progression (app -> libglitch -> ci -> staging -> release) rides this
    // spine rightward, so its exit doors fall on the east walls. Edges route
    // orthogonally (see graph.js), horizontal-first for the pipeline spine.
    // Columns (x): C0 x=26 deep source · C1 x=74 local build · C2 x=140 CI ·
    // C3 x=200 staging · C4 x=258 release. Installed package/tool nodes sit on a
    // bottom shelf (y=162) spread by the stage they attach to.
    GRAPH_POSITIONS: {
      // --- Pipeline spine (core traversal loci), left -> right -------------------
      // C0 — deep source roots
      stdlib: [26, 132],
      telemetry: [26, 74],
      // C1 — local build layer
      runtime: [74, 132],
      app: [74, 88],
      libglitch: [74, 42],
      // C2 — CI / verification
      ci: [140, 90],
      modern_crypto: [140, 42],
      // C3 — staging / integration
      staging: [200, 96],
      di_container: [200, 44],
      // C4 — the release goal (release train destination)
      release: [258, 88],
      // --- Installed package/tool nodes — bottom shelf, spread by attach stage ---
      legacy_auth: [30, 162],
      test_suite: [52, 162],
      rubber_duck: [76, 162],
      logging: [100, 162],
      inline_util: [122, 162],
      shim: [144, 162],
      security_scanner: [168, 162],
      container: [192, 162],
      circuit_breaker: [214, 162],
      feature_flag: [236, 162],
      rollback: [258, 162],
    },
  };
})(window.DepHell = window.DepHell || {});
