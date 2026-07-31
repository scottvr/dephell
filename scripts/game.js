(function bootstrapGame(namespace) {
  const { ARENA, GRAPH_POSITIONS, FLOOR_Y, GROUND_TOP, ROOM_INTRO_SECONDS } = namespace.constants;
  const { packages, incidents, rooms, enemyDefs } = namespace.content;
  const { makeInitialRunState } = namespace.runState;
  const { rectsOverlap, clamp } = namespace.utils;
  const {
    installedPackageNames,
    buildIdentity,
    renderReleaseReport,
    renderFailureReport,
  } = namespace.reports;
  const { applyPackageEffects, packagePreviewText } = namespace.effects;
  const {
    getPreviewGraph,
    graphCaption,
    graphMarkup,
    graphDetails,
  } = namespace.graph;

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const roomById = new Map(rooms.map((room) => [room.id, room]));

  const ui = {
    stabilityBar: document.querySelector("#stabilityBar"),
    stabilityValue: document.querySelector("#stabilityValue"),
    observabilityBar: document.querySelector("#observabilityBar"),
    observabilityValue: document.querySelector("#observabilityValue"),
    debtBar: document.querySelector("#debtBar"),
    debtValue: document.querySelector("#debtValue"),
    buildIdentity: document.querySelector("#buildIdentity"),
    eventLog: document.querySelector("#eventLog"),
    graphSvg: document.querySelector("#graphSvg"),
    graphCaption: document.querySelector("#graphCaption"),
    graphInspectButton: document.querySelector("#graphInspectButton"),
    graphOverlay: document.querySelector("#graphOverlay"),
    graphCloseButton: document.querySelector("#graphCloseButton"),
    pauseGraphSvg: document.querySelector("#pauseGraphSvg"),
    graphDetails: document.querySelector("#graphDetails"),
    choiceGraphSvg: document.querySelector("#choiceGraphSvg"),
    choiceGraphCaption: document.querySelector("#choiceGraphCaption"),
    routeOverlay: document.querySelector("#routeOverlay"),
    routeGraphSvg: document.querySelector("#routeGraphSvg"),
    routeChoices: document.querySelector("#routeChoices"),
    routePrompt: document.querySelector("#routePrompt"),
    incidentOverlay: document.querySelector("#incidentOverlay"),
    incidentTitle: document.querySelector("#incidentTitle"),
    incidentBlurb: document.querySelector("#incidentBlurb"),
    incidentChoices: document.querySelector("#incidentChoices"),
    choiceOverlay: document.querySelector("#choiceOverlay"),
    packageChoices: document.querySelector("#packageChoices"),
    choiceStage: document.querySelector("#choiceStage"),
    choicePillCur: document.querySelector("#choicePillCur"),
    choicePillTot: document.querySelector("#choicePillTot"),
    choiceDots: document.querySelector("#choiceDots"),
    choiceChevL: document.querySelector("#choiceChevL"),
    choiceChevR: document.querySelector("#choiceChevR"),
    choiceArrowL: document.querySelector("#choiceArrowL"),
    choiceArrowR: document.querySelector("#choiceArrowR"),
    choicePad: document.querySelector("#choicePad"),
    reportOverlay: document.querySelector("#reportOverlay"),
    reportKicker: document.querySelector("#reportKicker"),
    reportTitle: document.querySelector("#reportTitle"),
    reportBody: document.querySelector("#reportBody"),
    restartButton: document.querySelector("#restartButton"),
    reportRestartButton: document.querySelector("#reportRestartButton"),
    muteButton: document.querySelector("#muteButton"),
  };

  const audio = namespace.audio || { start() {}, play() {}, setState() {}, toggleMute() { return false; }, isMuted() { return false; } };

  function sfx(cue) {
    audio.play(cue);
  }

  // Systemic events map to one-shot cues here so effect-driven log entries
  // (reveals, pins, incidents, route choices) stay audible without wiring each site.
  const EVENT_CUES = {
    package_installed: "install",
    graph_revealed: "reveal",
    node_pinned: "pin",
    incident_started: "incidentStart",
    route_selected: "routeSelect",
    room_entered: "roomEnter",
    feature_flag_used: "flag",
    feature_flag_expired: "flagExpire",
    boss_started: "bossIntro",
    run_won: "victory",
    run_failed: "failure",
  };

  const keys = new Set();
  const mouse = { x: 480, y: 270, down: false };
  // Mouse control is dormant until the player deliberately moves the mouse; until then
  // the cursor position is ignored (and hidden) and the game plays keyboard-first.
  let mouseActive = false;
  let mouseMoveAccum = 0;
  // Once the player right-clicks to toggle mouse mode, auto-wake-on-movement stops —
  // the toggle is now the explicit control, so their choice sticks either way.
  let mouseManual = false;
  let lastTime = performance.now();
  let roomClearTimer = 0;
  let choiceShown = false;
  let roomClearedLogged = false;
  let pendingRoutes = [];
  let activeRouteChoice = null;
  let routeFocus = 0; // keyboard-focused route card index (parity with the package carousel)
  let incidentResolutions = [];
  let incidentFocus = 0; // keyboard-focused incident resolution index
  let selectedGraphEntity = null;
  let activePreviewPackage = null;
  let focusedIndex = 0;
  let offeredList = [];
  let packageInspecting = false;
  let committingPackage = false;
  const padPrev = { buttons: [] };
  const padStickHold = { l: 0, r: 0 };
  let hitFreezeTimer = 0;
  let shakeMag = 0;
  let bossVictoryPending = false;
  let lastDebtBand = 0;
  let wasCritical = false; // tracks the stability<CRITICAL edge so the alarm fires once
  let runEndedAt = 0; // timestamp the report screen opened, for the restart input-lock
  let game;

  // The end screen ignores restart input for this long so a reflexive strike or a swing
  // finished a beat after death can't skip past the report/questions into a new run.
  const RESTART_LOCK_MS = 800;
  // Below this Stability the run enters a "critical" state: a pulsing red vignette + an
  // alarm, so low health finally reads as a lean-forward tension moment (playtest PT1 Q10).
  const CRITICAL_STABILITY = 30;

  // --- Feel tuning (experimental knobs) -------------------------------------
  // Tune these live from the console (no rebuild) to A/B feel changes:
  //     DepHell.debug.tune({ clearHealTaper: false })   // back to a flat +8 refund per clear
  //     DepHell.debug.tune({ swingCommit: 0.55 })        // root movement during the 0.14s swing (anti hold-to-win)
  //     DepHell.debug.tune({ introSkipOnInput: true })   // eager players end the room-intro lock early by holding a key
  //     DepHell.debug.tune()                             // read the current values
  const FEEL = {
    // ON since playtest PT1 (flat tension / no lean-forward): late rooms stop fully
    // refunding combat damage, so Stability trends down and pressure mounts across a run.
    clearHealTaper: true, // true = max(3, 8 - roomIndex) heal per clear; false = flat +8
    swingCommit: 1.0, // movement-speed multiplier while mid-swing (1.0 = no change)
    introSkipOnInput: false, // let a held move/attack/dash key cut the room-intro lock short
  };

  function debtBand(debt) {
    if (debt >= 75) return 3;
    if (debt >= 50) return 2;
    if (debt >= 25) return 1;
    return 0;
  }

  function syncAudioState() {
    const run = game.run;
    const band = debtBand(run.techDebt);
    if (band > lastDebtBand) sfx("debtThreshold");
    lastDebtBand = band;
    // Fire the critical alarm once, on the downward crossing into the danger band.
    const critical = run.stability > 0 && run.stability < CRITICAL_STABILITY;
    if (critical && !wasCritical) sfx("criticalAlarm");
    wasCritical = critical;
    audio.setState({
      stability: run.stability,
      debt: run.techDebt,
      incident: run.incident ? run.incident.id : null,
      boss: run.selectedBoss || (game.boss ? game.boss.id : null),
      combat: game.enemies ? game.enemies.some((enemy) => enemy.alive) : false,
      room: run.roomIndex || 0,
      critical,
    });
  }

  function resetGame() {
    keys.clear();
    mouse.down = false;
    game = {
      run: makeInitialRunState(),
      player: { x: 170, y: 300, w: 24, h: 42, vx: 0, vy: 0, facing: 1, aim: 0, attackTimer: 0, dashTimer: 0, invulnTimer: 0, swingTimer: 0, swingDir: 1, walkPhase: 0 },
      slashes: [],
      enemyShots: [],
      hitSparks: [],
      particles: [],
      floaters: [],
      dashGhosts: [],
      feelLog: [], // Tier-2 telemetry ring buffer (see pushFeel / debug.feel)
      enemies: [],
      hazards: [],
      pendingSpawns: [],
      doors: [],
      doorsPhase: false,
      boss: null,
      bossIntroTimer: 0,
      vcReconciled: false,
      roomIntroTimer: ROOM_INTRO_SECONDS,
      toolCooldowns: { feature_flag: 0, rollback: 0, circuit_breaker: 0 },
      featureFlagTimer: 0,
      circuitBreakerTimer: 0,
      duckHoldTimer: 0,
    };
    ui.choiceOverlay.classList.add("hidden");
    ui.reportOverlay.classList.add("hidden");
    ui.graphOverlay.classList.add("hidden");
    ui.routeOverlay.classList.add("hidden");
    selectedGraphEntity = null;
    activePreviewPackage = null;
    activeRouteChoice = null;
    pendingRoutes = [];
    shakeMag = 0;
    hitFreezeTimer = 0;
    bossVictoryPending = false;
    roomClearTimer = 0;
    choiceShown = false;
    roomClearedLogged = false;
    lastDebtBand = 0;
    wasCritical = false;
    audio.setState({ interstitial: false });
    logEvent("run_started", "Run started: Release Candidate Pipeline.");
    loadRoom("local_dev");
    renderAllUi();
    applyVisualSmokeMode();
  }

  function logEvent(type, text, data = {}) {
    game.run.eventLog.push({ order: game.run.eventLog.length + 1, type, text, ...data });
    if (EVENT_CUES[type]) sfx(EVENT_CUES[type]);
  }

  function loadRoom(roomId, route = null) {
    const baseRoom = roomById.get(roomId);
    if (!baseRoom) throw new Error(`Unknown room id: ${roomId}`);
    const room = resolveRoom(baseRoom);
    game.currentRoom = room;
    game.run.currentRoomId = room.id;
    game.run.roomIndex = game.run.roomsVisited.length;
    game.run.roomsVisited.push(room.id);
    game.run.location = room.mapEdge
      ? { type: "edge", id: room.mapEdge, arrivedFrom: route?.edge ?? game.run.location?.id ?? null }
      : { type: "node", id: room.mapNode || "app", arrivedFrom: route?.edge ?? game.run.location?.id ?? null };
    game.player.x = 240;
    game.player.y = 300;
    game.slashes.length = 0;
    game.enemyShots.length = 0;
    game.hazards.length = 0;
    game.pendingSpawns.length = 0;
    game.boss = null;
    game.bossIntroTimer = 0;
    game.vcReconciled = false;
    game.doors = [];
    game.doorsPhase = false;
    game.doorReopenBlock = false;
    game.enemies = room.enemies.map((spawn, idx, arr) => makeEnemy(placeSpawn(spawn, idx, arr.length), idx));
    if (room.bossRoom) prepareBossRoom(room);
    game.roomIntroTimer = ROOM_INTRO_SECONDS;
    roomClearTimer = 0;
    roomClearedLogged = false;
    choiceShown = false;
    pendingRoutes = [];
    activeRouteChoice = null;
    game.featureFlagTimer = 0;
    game.circuitBreakerTimer = 0;
    game.duckHoldTimer = 0;
    game.run.activeFlag = null;
    ui.routeOverlay.classList.add("hidden");
    if (room.incident) startIncident();
    logEvent("room_entered", `Entered ${room.name}.`, { room: room.id, route: route?.id });
    renderAllUi();
    if (room.incident) showIncidentChoice();
  }

  function resolveRoom(room) {
    if (!room.branchEncounter) return room;
    const installed = game.run.installedPackages[0];
    if (!game.run.branchEvents.includes(room.id)) {
      applyBranchEvent(room.id, installed);
      game.run.branchEvents.push(room.id);
    }
    if (installed === "test_suite") {
      return {
        ...room,
        subtitle: "Test coverage narrows the checkpoint to one clean repro.",
        enemies: [{ type: "regression", x: 745, y: FLOOR_Y }],
      };
    }
    if (installed === "legacy_auth") {
      return {
        ...room,
        subtitle: "Legacy cache opens, but old assumptions leak out with it.",
        enemies: [{ type: "memory_leak", x: 760, y: FLOOR_Y }],
      };
    }
    if (installed === "compatibility_shim") {
      return {
        ...room,
        subtitle: "The shim fast-passes verification and leaves a jagged edge.",
        enemies: [{ type: "breaking_change", x: 750, y: FLOOR_Y }],
      };
    }
    return room;
  }

  function applyBranchEvent(roomId, installed) {
    const run = game.run;
    if (installed === "test_suite") {
      run.stability = Math.min(100, run.stability + 6);
      logEvent("branch_resolved", "Test Suite produced a clean repro. Stability +6.", { room: roomId, package: installed });
    } else if (installed === "legacy_auth") {
      run.stability = Math.min(100, run.stability + 8);
      run.techDebt += 4;
      run.debtTags.push("legacy_cache");
      logEvent("branch_resolved", "LegacyAuth unlocked a recovery cache and added old-system debt. Stability +8, TDR +4.", { room: roomId, package: installed });
    } else if (installed === "compatibility_shim") {
      run.techDebt += 6;
      run.debtTags.push("shim_smoke_test");
      logEvent("branch_resolved", "Compatibility Shim passed verification quickly, then filed a debt-shaped receipt. TDR +6.", { room: roomId, package: installed });
    }
  }

  // Resolve a content spawn into a 2-D arena position. Content may author an
  // explicit {type, x, y}; legacy entries carry only x (y === FLOOR_Y sentinel),
  // which we scatter vertically across the arena by index so a room's enemies
  // don't line up on a single band. Keeps old content loading unchanged.
  function placeSpawn(spawn, i, n) {
    if (spawn.y != null && spawn.y !== FLOOR_Y) return spawn; // explicit 2-D placement
    const x = clamp(spawn.x ?? (ARENA.x0 + ARENA.x1) / 2, ARENA.x0 + 30, ARENA.x1 - 30);
    const span = ARENA.y1 - ARENA.y0 - 90;
    const y = ARENA.y0 + 45 + (n > 1 ? (i / (n - 1)) * span : span / 2);
    return { ...spawn, x, y };
  }

  function makeEnemy(spawn, idx) {
    const def = enemyDefs[spawn.type];
    const baseHp = def.hp + incidentEnemyBonus(spawn.type) + enemyModifier(spawn.type, "hp");
    // idx is used to stagger initial attack timing; coerce so non-numeric ids
    // (e.g. the boss, or swapped adds keyed by string id) don't produce NaN timers.
    const stagger = Number(idx) || 0;
    return {
      id: `${spawn.type}_${idx}`,
      type: spawn.type,
      name: def.name,
      x: spawn.x,
      y: spawn.y,
      w: def.w,
      h: def.h,
      hp: baseHp,
      maxHp: baseHp,
      speed: Math.max(12, def.speed + enemyModifier(spawn.type, "speed")),
      damage: Math.max(1, def.damage + enemyModifier(spawn.type, "damage")),
      telegraph: 0,
      attackTimer: 0.8 + stagger * 0.4,
      contactTimer: 0,
      windupTimer: 0,
      alive: true,
      // Per-type behaviour state (unused fields are harmless on other types).
      infectTimer: 2.6,
      forked: false,
      seam: 0,
      zoneTimer: 2,
      lifeClock: 0,
      shieldClock: idx * 0.6,
      exposed: true,
      phase: 0,
      variant: null,
      dir: 1,
    };
  }

  // Sums run-wide enemy modifiers granted by packages/tools (scope "all" or a type).
  function enemyModifier(type, stat) {
    const mods = game?.run?.enemyModifiers || [];
    let total = 0;
    for (const mod of mods) {
      if (mod.stat !== stat) continue;
      if (mod.scope === "all" || mod.scope === type) total += mod.amount;
    }
    return total;
  }

  // --- Graph query + mutation helpers used by enemies, incidents, and the boss ---

  // Resolve the current combat locus to a NODE id (edge loci map to their source).
  function resolveLocationNode() {
    const loc = currentGraphLocation();
    if (loc.type === "node") return loc.id;
    const edge = game.run.graph.edges.find((e) => e.id === loc.id);
    return edge ? edge.source : "app";
  }

  // Return a real neighbour node id of the given node (prefers visible edges).
  function graphNeighbor(nodeId) {
    const edges = game.run.graph.edges.filter((e) => (e.source === nodeId || e.target === nodeId) && e.visibility !== "hidden");
    for (const e of edges) {
      const other = e.source === nodeId ? e.target : e.source;
      if (other !== nodeId) return other;
    }
    return null;
  }

  // Create (or reuse) a conflicts edge between two nodes; returns the edge.
  function ensureConflictEdge(sourceId, targetId) {
    let edge = game.run.graph.edges.find((e) => e.relation === "conflicts" && ((e.source === sourceId && e.target === targetId) || (e.source === targetId && e.target === sourceId)));
    if (!edge) {
      edge = { id: `edge_${sourceId}_${targetId}_conflicts`, source: sourceId, target: targetId, relation: "conflicts", strength: 2, visibility: "suspected", active: false, createdBy: "enemy" };
      game.run.graph.edges.push(edge);
    }
    return edge;
  }

  // Enemies are spawned into a pending queue and flushed after the update loop so
  // we never mutate game.enemies while iterating it.
  function spawnEnemy(type, overrides = {}) {
    game.pendingSpawns.push({ type, overrides });
  }

  function flushPendingSpawns() {
    if (!game.pendingSpawns.length) return;
    for (const spawn of game.pendingSpawns) {
      const idx = game.enemies.length;
      const enemy = makeEnemy({ type: spawn.type, x: spawn.overrides.x ?? game.player.x, y: spawn.overrides.y ?? (ARENA.y0 + ARENA.y1) / 2 }, idx);
      Object.assign(enemy, spawn.overrides);
      game.enemies.push(enemy);
    }
    game.pendingSpawns.length = 0;
  }

  // Route an ad-hoc effect list (enemy/graph consequences) through the shared verb
  // dispatcher, so every mutation is logged and traceable exactly like a package.
  function applyGraphEffects(effects, sourceLabel) {
    namespace.effects.applyEffectList(game.run, effects, sourceLabel, logEvent);
  }

  // --- Floor hazards (deprecation zones, boss audit zones) ---
  function addHazard(x, y, opts = {}) {
    // 2-D deprecation-zone footprint centered on (x,y). Square-ish so it reads as
    // a floor decal in the top-down view (render lands in Phase 3).
    game.hazards.push({ x, y, w: opts.w ?? 70, h: opts.h ?? 70, life: opts.life ?? 6, maxLife: opts.life ?? 6, dps: opts.dps ?? 4, source: opts.source || "hazard", tickTimer: 0 });
  }

  function updateHazards(dt) {
    const tested = game.run.mitigations.includes("test_coverage");
    for (const hz of game.hazards) {
      hz.life -= dt;
      const p = game.player;
      if (rectsOverlap(p.x, p.y - p.h, p.w, p.h, hz.x - hz.w / 2, hz.y - hz.h / 2, hz.w, hz.h)) {
        if (!featureFlagActive()) {
          game.run.techDebt += hz.dps * dt * (tested ? 0.5 : 1);
          hz.tickTimer -= dt;
          if (hz.tickTimer <= 0) {
            hz.tickTimer = 0.7;
            damagePlayer(2, `${hz.source} zone corroded active code.`);
          }
        }
      }
    }
    game.hazards = game.hazards.filter((hz) => hz.life > 0);
  }

  function incidentEnemyBonus(type) {
    if (!game?.run?.incident) return 0;
    if (game.run.incident.id === "build_failure" && type === "breaking_change") return 14;
    if (game.run.incident.id === "audit_pressure" && type === "memory_leak") return 18;
    return 0;
  }

  // Weighted incident selection reading real run state. Build Failure (an active
  // conflict edge) has top priority; otherwise the highest-weighted incident that
  // clears the threshold fires, softened by relevant mitigations.
  function startIncident() {
    const run = game.run;
    const tested = run.mitigations.includes("test_coverage");
    const conflict = findActiveConflict();
    if (conflict) {
      conflict.visibility = "known";
      setIncident("build_failure", conflict, tested ? 4 : 9);
      logEvent("incident_started", tested ? "Build Failure started, but Test Suite reduced blast radius." : "Build Failure started: conflict edge activated.", { incident: "build_failure" });
      sfx("conflict");
      return;
    }
    const weights = incidentWeights(run);
    let best = "minor_regression";
    for (const [id, weight] of Object.entries(weights)) {
      if (weight > weights[best]) best = id;
    }
    const drainBase = { critical_cve: 7, dependency_unpublish: 6, audit_pressure: 7, minor_regression: 4 }[best] || 4;
    const drain = tested ? Math.max(2, drainBase - 3) : drainBase;
    setIncident(best, null, drain);
    logEvent("incident_started", `${incidents[best].name} started: ${incidents[best].blurb}`, { incident: best });
  }

  function incidentWeights(run) {
    const cvePatched = run.mitigations.includes("cve_patched");
    const riskRegistered = run.mitigations.includes("risk_registered") || run.mitigations.includes("audit_clean");
    const securityRisks = run.risks.filter((r) => r.kind === "security").length;
    const unpublishRisks = run.risks.filter((r) => r.kind === "unpublish").length;
    const legacy = run.installedPackages.includes("legacy_auth") ? 1 : 0;
    return {
      critical_cve: securityRisks * 4 + legacy * 3 - (cvePatched ? 8 : 0),
      dependency_unpublish: unpublishRisks * 5,
      audit_pressure: (run.techDebt >= 16 ? 6 + Math.floor((run.techDebt - 16) / 8) : 0) - (riskRegistered ? 4 : 0),
      minor_regression: 3,
    };
  }

  function setIncident(id, cause, drain) {
    game.run.incident = { id, name: incidents[id]?.name || id, cause: cause || null, stabilityDrain: drain };
  }

  function showIncidentChoice() {
    const inc = incidents[game.run.incident?.id];
    if (!inc || !inc.resolutions || !ui.incidentOverlay) return;
    ui.incidentTitle.textContent = inc.name;
    ui.incidentBlurb.textContent = inc.blurb;
    ui.incidentChoices.innerHTML = "";
    incidentResolutions = inc.resolutions;
    inc.resolutions.forEach((res, i) => {
      const button = document.createElement("button");
      button.className = "incident-card";
      button.type = "button";
      const h = document.createElement("h2");
      h.textContent = res.label;
      const immediate = document.createElement("p");
      immediate.textContent = res.immediate;
      const consequence = document.createElement("p");
      consequence.className = "consequence";
      const strong = document.createElement("b");
      strong.textContent = "Consequence: ";
      consequence.append(strong, res.consequence);
      button.append(h, immediate, consequence);
      button.addEventListener("click", () => resolveIncident(res));
      button.addEventListener("mouseenter", () => setIncidentFocus(i, true));
      ui.incidentChoices.appendChild(button);
    });
    ui.incidentOverlay.classList.remove("hidden");
    setIncidentFocus(0, true);
  }

  // Highlight one incident resolution for keyboard selection; hover syncs to it too, so
  // the mouse and keyboard never disagree about which card is armed.
  function setIncidentFocus(index, silent) {
    const cards = [...ui.incidentChoices.children];
    if (!cards.length) return;
    incidentFocus = ((index % cards.length) + cards.length) % cards.length;
    cards.forEach((card, i) => card.classList.toggle("focused", i === incidentFocus));
    if (!silent) sfx("uiMove");
  }

  function resolveIncident(res) {
    const run = game.run;
    run.incident.stabilityDrain = res.drain;
    run.resolvedIncidents.push({ incident: run.incident.id, resolution: res.id });
    logEvent("incident_resolved", `${run.incident.name}: chose "${res.label}".`, { incident: run.incident.id, resolution: res.id });
    if (res.effects && res.effects.length) {
      namespace.effects.applyEffectList(run, res.effects, { id: `incident:${run.incident.id}`, name: run.incident.name }, logEvent);
    }
    ui.incidentOverlay.classList.add("hidden");
    renderAllUi();
  }

  function findActiveConflict() {
    return game.run.graph.edges.find((edge) => edge.relation === "conflicts" && edge.active);
  }

  function applyPackage(pkg) {
    const run = game.run;
    run.installedPackages.push(pkg.id);
    logEvent("package_installed", `Installed ${pkg.name}.`, { package: pkg.id });
    // Snapshot the graph so we can tell the player, in the WORLD, that installing
    // this package reshaped the dungeon — not just the minimap. The floater lands
    // when the overlay closes and play resumes.
    const beforeNodes = run.graph.nodes.length, beforeEdges = run.graph.edges.length;
    applyPackageEffects(run, pkg, logEvent);
    const dNodes = run.graph.nodes.length - beforeNodes;
    const dEdges = run.graph.edges.length - beforeEdges;
    if (dNodes > 0 || dEdges > 0) {
      const parts = [];
      if (dNodes > 0) parts.push(`+${dNodes} node${dNodes > 1 ? "s" : ""}`);
      if (dEdges > 0) parts.push(`+${dEdges} edge${dEdges > 1 ? "s" : ""}`);
      logEvent("graph_mutated", `${pkg.name} reshaped the architecture (${parts.join(", ")}). The dungeon changed with it.`);
      const p = game.player;
      spawnFloater(p.x + p.w / 2, p.y - 46, "ARCHITECTURE SHIFTED", "#9be7ff");
      sfx("reveal");
    }
    activePreviewPackage = null;
    offeredList = [];
    packageInspecting = false;
    committingPackage = false;
    ui.choiceStage.classList.remove("inspecting");
    renderAllUi();
    ui.choiceOverlay.classList.add("hidden");
    audio.setState({ interstitial: false });
    // If the graph inspector was stacked over the choice (via G), close it too —
    // otherwise a keyboard commit orphans it and isOverlayOpen() keeps update() paused.
    if (!ui.graphOverlay.classList.contains("hidden")) closeGraphOverlay();
    choiceShown = true;
  }

  // Offer a shuffled subset of the room's package pool (skipping already-installed
  // packages) so each package room is a readable 3-4 card decision, not all 12.
  function offeredPackages() {
    const room = game.currentRoom;
    const poolIds = (room && room.packagePool) || packages.map((p) => p.id);
    const available = poolIds
      .map((id) => packages.find((p) => p.id === id))
      .filter(Boolean)
      .filter((p) => !game.run.installedPackages.includes(p.id));
    for (let i = available.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    return available.slice(0, 4);
  }

  // Controller-first package carousel: one hero card in focus, siblings peek.
  // A single focusedIndex is the source of truth — pad/arrows MOVE it, clicks
  // promote a neighbor to hero, and commit always acts on offeredList[focusedIndex].
  function showPackageChoice() {
    const offered = offeredPackages();
    if (!offered.length) {
      choiceShown = true;
      logEvent("package_skipped", "No new package on offer here.");
      return;
    }
    offeredList = offered;
    focusedIndex = 0;
    packageInspecting = false;
    committingPackage = false;
    ui.choiceStage.classList.remove("inspecting");
    ui.packageChoices.innerHTML = "";
    offered.forEach((pkg, index) => {
      const button = document.createElement("button");
      button.className = "package-card";
      button.type = "button";
      button.dataset.packageId = pkg.id;
      button.dataset.index = String(index);
      button.setAttribute("role", "option");
      button.innerHTML = `
        <span class="package-icon" aria-hidden="true">${packageIcon(pkg)}</span>
        <span class="package-copy">
          <span class="package-name">${pkg.name}</span>
          <span class="package-kind">${packageKind(pkg)}</span>
        </span>
        <p><b>Benefit:</b> ${pkg.benefit}</p>
        <p><b>Risk:</b> ${visibleRiskText(pkg)}</p>
        <div class="effect-row" aria-label="Graph mutation preview">${packageEffectBadges(pkg)}</div>
        <p class="preview-copy"><b>Preview:</b> ${packagePreviewText(pkg)}</p>
        <div class="tag-row">${pkg.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      `;
      button.addEventListener("click", () => {
        if (index === focusedIndex) commitPackage();
        else setPackageFocus(index, index < focusedIndex ? -1 : 1);
      });
      ui.packageChoices.appendChild(button);
    });
    setPackageFocus(0, 0, true);
    ui.choiceOverlay.classList.remove("hidden");
    audio.setState({ interstitial: true });
  }

  function packageCards() {
    return ui.packageChoices.querySelectorAll(".package-card");
  }

  function setPackageFocus(index, dir, silent) {
    const n = offeredList.length;
    if (!n || committingPackage) return;
    if (index < 0 || index > n - 1) {
      const cur = packageCards()[focusedIndex];
      if (cur) { cur.classList.remove("nudge"); void cur.offsetWidth; cur.classList.add("nudge"); }
      if (!silent) sfx("uiInvalid");
      return;
    }
    if (index === focusedIndex && !silent) return;
    focusedIndex = index;
    activePreviewPackage = offeredList[index] || null;
    if (packageInspecting) { packageInspecting = false; ui.choiceStage.classList.remove("inspecting"); }
    layoutCarousel();
    renderChoiceGraph();
    if (!ui.graphOverlay.classList.contains("hidden")) renderPauseGraph();
    if (!silent) sfx("uiMove");
  }

  function layoutCarousel() {
    const cards = packageCards();
    const n = cards.length;
    cards.forEach((card, i) => {
      const off = i - focusedIndex;
      const a = Math.abs(off);
      let tx; let sc; let op;
      if (off === 0) { tx = "-50%"; sc = 1; op = 1; }
      else if (a === 1) { tx = `calc(-50% + ${off * 74}%)`; sc = 0.78; op = 1; }
      else { tx = `calc(-50% + ${off > 0 ? 135 : -135}%)`; sc = 0.7; op = 0; }
      card.style.transform = `translateX(${tx}) scale(${sc})`;
      card.style.opacity = String(op);
      card.style.zIndex = String(off === 0 ? 3 : 2 - a);
      card.classList.toggle("hero", off === 0);
      card.classList.toggle("previewing", off === 0);
      card.setAttribute("aria-selected", off === 0 ? "true" : "false");
    });
    if (ui.choicePillCur) ui.choicePillCur.textContent = `0${focusedIndex + 1}`.slice(-2);
    if (ui.choicePillTot) ui.choicePillTot.textContent = `0${n}`.slice(-2);
    if (ui.choiceDots) {
      ui.choiceDots.innerHTML = "";
      for (let i = 0; i < n; i += 1) {
        const dot = document.createElement("i");
        if (i === focusedIndex) dot.className = "on";
        ui.choiceDots.appendChild(dot);
      }
    }
    const atStart = focusedIndex === 0;
    const atEnd = focusedIndex === n - 1;
    if (ui.choiceChevL) ui.choiceChevL.classList.toggle("dim", atStart);
    if (ui.choiceChevR) ui.choiceChevR.classList.toggle("dim", atEnd);
    if (ui.choiceArrowL) ui.choiceArrowL.classList.toggle("dim", atStart);
    if (ui.choiceArrowR) ui.choiceArrowR.classList.toggle("dim", atEnd);
  }

  function toggleInspect() {
    if (ui.choiceOverlay.classList.contains("hidden") || committingPackage) return;
    packageInspecting = !packageInspecting;
    ui.choiceStage.classList.toggle("inspecting", packageInspecting);
    sfx(packageInspecting ? "uiMove" : "uiBack");
  }

  function commitPackage() {
    if (!offeredList.length || committingPackage) return;
    const pkg = offeredList[focusedIndex];
    if (!pkg) return;
    committingPackage = true;
    const card = packageCards()[focusedIndex];
    if (card) card.classList.add("punch", "installed");
    sfx("uiConfirm");
    window.setTimeout(() => applyPackage(pkg), 260);
  }

  function renderChoiceGraph() {
    if (!ui.choiceGraphSvg) return;
    const { visibleNodes, edges, preview } = getPreviewGraph(game.run, activePreviewPackage);
    ui.choiceGraphSvg.innerHTML = graphMarkup(game.run, visibleNodes, edges, selectedGraphEntity, {
      interactive: false,
      preview,
      currentLocation: currentGraphLocation(),
      showLabels: true,
    });
    ui.choiceGraphCaption.textContent = activePreviewPackage
      ? `${activePreviewPackage.name} would commit ${packagePreviewText(activePreviewPackage)}.`
      : "Cycle a package to preview its graph mutation.";
  }

  function packageIcon(pkg) {
    if (pkg.id === "legacy_auth") return "AUTH";
    if (pkg.id === "test_suite") return "TEST";
    if (pkg.id === "compatibility_shim") return "SHIM";
    if (pkg.id === "feature_flag") return "FLAG";
    return "PKG";
  }

  function packageKind(pkg) {
    if (pkg.tags.includes("tool")) return "active tool";
    if (pkg.tags.includes("observability")) return "observability";
    if (pkg.tags.includes("debt")) return "quick fix";
    if (pkg.tags.includes("legacy")) return "legacy bridge";
    return "package";
  }

  function packageEffectBadges(pkg) {
    const badges = [];
    for (const effect of pkg.effects) {
      if (effect.op === "addNode") badges.push(effectBadge("node", `node ${effect.name}`));
      if (effect.op === "addEdge") badges.push(effectBadge(effect.relation, effect.relation));
      if (effect.op === "modifyResource") badges.push(effectBadge(effect.resource, `${effect.resource} ${signed(effect.amount)}`));
      if (effect.op === "increaseDebt") badges.push(effectBadge("debt", `TDR +${effect.amount}`));
      if (effect.op === "revealEdges") badges.push(effectBadge("reveal", "reveal"));
      if (effect.op === "addTool") badges.push(effectBadge("tool", "tool"));
    }
    return badges.slice(0, 6).join("");
  }

  function effectBadge(kind, label) {
    return `<span class="effect-badge ${kind}">${label}</span>`;
  }

  function signed(value) {
    return value > 0 ? `+${value}` : String(value);
  }

  function showRouteChoice(routes, focusIndex = 0) {
    if (!ui.routeOverlay.classList.contains("hidden")) return;
    pendingRoutes = routes;
    const focus = Math.max(0, Math.min(focusIndex, routes.length - 1));
    activeRouteChoice = routes[focus];
    ui.routePrompt.textContent = routes.length > 1
      ? `${game.currentRoom.name} cleared. Choose the next graph exit — or walk to a glowing door.`
      : `${game.currentRoom.name} cleared. Confirm the next graph exit.`;
    ui.routeChoices.innerHTML = "";
    for (const route of routes) {
      const button = document.createElement("button");
      button.className = "route-card";
      button.type = "button";

      const title = document.createElement("h2");
      title.textContent = route.label;
      const description = document.createElement("p");
      description.textContent = route.description;
      const tradeoff = document.createElement("p");
      const strong = document.createElement("b");
      strong.textContent = "Tradeoff: ";
      tradeoff.append(strong, route.tradeoff);

      button.append(title, description, tradeoff);
      const index = routes.indexOf(route);
      button.addEventListener("click", () => selectRoute(route));
      button.addEventListener("mouseenter", () => setRouteFocus(index, true));
      ui.routeChoices.appendChild(button);
    }
    ui.routeOverlay.classList.remove("hidden");
    setRouteFocus(focus, true);
    audio.setState({ interstitial: true });
  }

  // Highlight one route card for keyboard selection and preview it on the minimap.
  // Hover routes through here too, so mouse and keyboard share one focused card.
  function setRouteFocus(index, silent) {
    const cards = [...ui.routeChoices.children];
    if (!cards.length) return;
    routeFocus = ((index % cards.length) + cards.length) % cards.length;
    cards.forEach((card, i) => card.classList.toggle("focused", i === routeFocus));
    previewRoute(pendingRoutes[routeFocus]);
    if (!silent) sfx("uiMove");
  }

  function previewRoute(route) {
    activeRouteChoice = route;
    renderRouteGraph();
  }

  function renderRouteGraph() {
    const { visibleNodes, edges, preview } = getPreviewGraph(game.run, activePreviewPackage);
    const selectedRoute = activeRouteChoice ? { type: "edge", id: activeRouteChoice.edge } : selectedGraphEntity;
    ui.routeGraphSvg.innerHTML = graphMarkup(game.run, visibleNodes, edges, selectedRoute, { interactive: false, preview, currentLocation: currentGraphLocation(), showLabels: true });
  }

  function selectRoute(route) {
    const from = game.currentRoom?.id;
    ui.routeOverlay.classList.add("hidden");
    audio.setState({ interstitial: false });
    pendingRoutes = [];
    activeRouteChoice = null;
    selectedGraphEntity = { type: "edge", id: route.edge };
    logEvent("route_selected", `Route selected: ${route.label}.`, { route: route.id, from, to: route.to, edge: route.edge });
    loadRoom(route.to, { ...route, from });
  }

  function visibleRiskText(pkg) {
    if (game.run.observability >= 4) return pkg.risk;
    if (pkg.id === "test_suite") return pkg.risk;
    return pkg.risk.replace("Suspected conflict with Modern Crypto. ", "Suspected hidden conflict. ");
  }

  function update(dt) {
    if (game.run.ended || isOverlayOpen()) return;
    updateToolTimers(dt);
    if (hitFreezeTimer > 0) {
      hitFreezeTimer -= dt;
      return;
    }
    if (game.roomIntroTimer > 0) {
      // introSkipOnInput (default off): a player already reaching for a control cuts
      // the intro lock short instead of waiting it out — trims transition dead air.
      const eager = FEEL.introSkipOnInput && (mouse.down || keys.has("a") || keys.has("d") || keys.has("w") || keys.has("s") || keys.has(" ") || keys.has("arrowleft") || keys.has("arrowright") || keys.has("shift") || keys.has("shiftleft"));
      game.roomIntroTimer = eager ? 0 : game.roomIntroTimer - dt;
      if (game.roomIntroTimer > 0) return;
    }
    updatePlayer(dt);
    updateDuck(dt);
    updateAttacks(dt);
    updateEnemies(dt);
    updateHitSparks(dt);
    updateParticles(dt);
    updateFloaters(dt);
    updateDashGhosts(dt);
    // During the boss-death pause, keep particles/shake alive but freeze room
    // progression so the pending victory report isn't pre-empted.
    if (!bossVictoryPending) updateRoomFlow(dt);
  }

  function updateToolTimers(dt) {
    game.toolCooldowns.feature_flag = Math.max(0, game.toolCooldowns.feature_flag - dt);
    game.toolCooldowns.rollback = Math.max(0, game.toolCooldowns.rollback - dt);
    game.toolCooldowns.circuit_breaker = Math.max(0, game.toolCooldowns.circuit_breaker - dt);
    if (game.circuitBreakerTimer > 0) game.circuitBreakerTimer = Math.max(0, game.circuitBreakerTimer - dt);
    if (game.bossIntroTimer > 0) game.bossIntroTimer = Math.max(0, game.bossIntroTimer - dt);
    if (game.featureFlagTimer > 0) {
      game.featureFlagTimer = Math.max(0, game.featureFlagTimer - dt);
      if (game.featureFlagTimer === 0 && game.run.activeFlag) {
        logEvent("feature_flag_expired", `Feature Flag expired on ${flagLabel(game.run.activeFlag)}.`, { flag: game.run.activeFlag.id });
        game.run.activeFlag = null;
        renderAllUi();
      }
    }
  }

  // Body center of the player in world space. The position anchor is still the
  // box's left edge (x) and its bottom (y); center is what aim/attacks point from.
  function playerCenter(p) {
    return { cx: p.x + p.w / 2, cy: p.y - p.h / 2 };
  }

  function updatePlayer(dt) {
    const p = game.player;
    const left = keys.has("a") || keys.has("arrowleft");
    const right = keys.has("d") || keys.has("arrowright");
    const up = keys.has("w") || keys.has("arrowup");
    const down = keys.has("s") || keys.has("arrowdown");
    // Top-down two-axis movement. Normalize the input vector so a diagonal moves
    // at the same speed as a cardinal (no sqrt(2) speed boost).
    const inx = (right ? 1 : 0) - (left ? 1 : 0);
    const iny = (down ? 1 : 0) - (up ? 1 : 0);
    const ilen = Math.hypot(inx, iny) || 1;
    // swingCommit (default 1.0 = no change) optionally roots movement during the
    // brief swing so the core verb rewards spacing over hold-to-win. Experimental knob.
    const speed = game.run.stats.speed * (p.swingTimer > 0 ? FEEL.swingCommit : 1);
    p.vx = (inx / ilen) * speed;
    p.vy = (iny / ilen) * speed;
    // Aim: when the mouse is live the body aims at the cursor (Quake-style);
    // otherwise aim follows the movement vector and persists while still.
    const { cx, cy } = playerCenter(p);
    if (mouseActive) {
      const aim = worldMouse();
      p.aim = Math.atan2(aim.y - cy, aim.x - cx);
    } else if (inx || iny) {
      p.aim = Math.atan2(iny, inx);
    }
    // facingX shim: 2-dir facing still drives some render/dash-ghost code until
    // the top-down sprite pass (Phase 3) rotates the whole body to p.aim.
    p.facing = Math.cos(p.aim) >= 0 ? 1 : -1;
    // Dash lunges along the aim direction (was: horizontal facing only).
    if ((keys.has("shift") || keys.has("shiftleft")) && p.dashTimer <= 0) {
      game.dashGhosts.push({ x: p.x, y: p.y, aim: p.aim, facing: p.facing, life: 0.18, maxLife: 0.18 });
      p.x += Math.cos(p.aim) * 112;
      p.y += Math.sin(p.aim) * 112;
      p.dashTimer = game.run.stats.dashCooldown;
      p.invulnTimer = Math.max(p.invulnTimer, 0.32); // dash i-frames: dodge through attacks
      sfx("dash");
    }
    // Integrate and clamp to the arena rect on both axes. x is the box left edge,
    // y is the box bottom, so the full 24x42 body stays inside the walls.
    p.x = clamp(p.x + p.vx * dt, ARENA.x0, ARENA.x1 - p.w);
    p.y = clamp(p.y + p.vy * dt, ARENA.y0 + p.h, ARENA.y1);
    // Advance the walk-cycle phase while moving (speed-scaled cadence).
    const moveSpeed = Math.hypot(p.vx, p.vy);
    if (moveSpeed > 5) p.walkPhase += dt * (9 + moveSpeed * 0.02);
    p.attackTimer -= dt;
    p.dashTimer -= dt;
    p.invulnTimer -= dt;
    p.swingTimer -= dt;
    if ((mouse.down || keys.has(" ")) && p.attackTimer <= 0) swing();
  }

  function useFeatureFlag() {
    if (!game.run.tools.includes("feature_flag")) {
      logEvent("tool_unavailable", "Feature Flag not installed.");
      renderAllUi();
      return;
    }
    if (game.toolCooldowns.feature_flag > 0 || game.run.activeFlag) return;

    const location = currentGraphLocation();
    const flag = {
      id: `${location.type}_${location.id}_${game.run.featureFlags.length + 1}`,
      type: location.type,
      target: location.id,
      room: game.currentRoom.id,
    };
    game.run.activeFlag = flag;
    game.run.featureFlags.push(flag);
    game.featureFlagTimer = 5.5;
    game.toolCooldowns.feature_flag = 9;
    game.run.techDebt += 4;
    game.run.debtTags.push("configuration_drift");
    weakenCurrentWave();
    logEvent("feature_flag_used", `Feature Flag disabled ${flagLabel(flag)} for this firefight. TDR +4.`, { flag: flag.id, room: flag.room });
    renderAllUi();
  }

  function weakenCurrentWave() {
    for (const enemy of game.enemies) {
      if (!enemy.alive) continue;
      enemy.attackTimer += 0.5;
      enemy.telegraph = Math.max(enemy.telegraph, 0.18);
    }
    game.enemyShots.length = 0;
  }

  function featureFlagActive() {
    return Boolean(game.run.activeFlag && game.featureFlagTimer > 0);
  }

  function flagLabel(flag) {
    return `${flag.type} ${flag.target}`;
  }

  function swing() {
    const p = game.player;
    // Dormant mouse (and keyboard-only players): strike issues in the facing direction,
    // which changes only on a movement key, so attacking never flips you. The 100-degree
    // arc still covers the near-diagonals. Once the mouse is live, it aims the strike.
    // Strike along the current aim (mouse or movement-driven). p.aim is kept live
    // in updatePlayer, so this covers all 360 degrees in both input modes.
    const angle = p.aim;
    game.slashes.push({
      x: p.x + p.w / 2,
      y: p.y - 18,
      angle,
      arc: 1.75,
      range: 92,
      life: 0.14,
      maxLife: 0.14,
      damage: game.run.stats.damage,
      hitIds: [],
    });
    p.attackTimer = game.run.stats.fireRate;
    p.swingTimer = 0.14;
    p.swingDur = 0.14;
    p.swingDir *= -1; // alternate up/down sweeps for a readable rhythm
    sfx("swing");
  }

  function updateAttacks(dt) {
    for (const slash of game.slashes) {
      slash.life -= dt;
    }
    for (const shot of game.enemyShots) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      // Circuit Breaker absorbs ordinary projectiles (not boss edge-arcs).
      if (circuitBreakerActive() && !shot.arc) {
        shot.life = 0;
        continue;
      }
      if (rectsOverlap(shot.x - 5, shot.y - 5, 10, 10, game.player.x, game.player.y - game.player.h, game.player.w, game.player.h)) {
        damagePlayer(shot.damage, `${shot.source} hit the Resolver.`);
        shot.life = 0;
      }
    }
    for (const enemy of game.enemies) {
      if (!enemy.alive) continue;
      for (const slash of game.slashes) {
        if (slash.life <= 0 || slash.hitIds.includes(enemy.id)) continue;
        const enemyCenterX = enemy.x;
        const enemyCenterY = enemy.y - enemy.h / 2;
        const dx = enemyCenterX - slash.x;
        const dy = enemyCenterY - slash.y;
        const distance = Math.hypot(dx, dy);
        const withinArc = Math.abs(angleDiff(Math.atan2(dy, dx), slash.angle)) <= slash.arc / 2;
        if (distance > slash.range || !withinArc) continue;
        slash.hitIds.push(enemy.id);
        // Shielded Version Conflict halves and armored bosses shrug off mistimed hits —
        // now with a legible readout so a no-sell reads as "blocked," not a whiff.
        if (enemy.type === "version_conflict_half" && !enemy.exposed) {
          addHitSpark(enemyCenterX, enemyCenterY, "#6b7280");
          spawnFloater(enemyCenterX, enemyCenterY - 8, "BLOCKED", "#9aa4ad");
          pushFeel({ kind: "blocked", hitFreezeAfter: hitFreezeTimer, shakeAfter: shakeMag, particles: 0, floater: true });
          continue;
        }
        if (enemy.boss && enemy.armored) {
          addHitSpark(enemyCenterX, enemyCenterY, "#6b7280");
          spawnFloater(enemyCenterX, enemyCenterY - 8, "ARMORED", "#9aa4ad");
          sfx("bossHit");
          addShake(1.2);
          pushFeel({ kind: "armored", hitFreezeAfter: hitFreezeTimer, shakeAfter: shakeMag, particles: 0, floater: true });
          continue;
        }
        enemy.hp -= slash.damage;
        enemy.hitFlash = 0.09;
        addHitSpark(enemyCenterX, enemyCenterY, "#ffffff");
        spawnFloater(enemyCenterX, enemyCenterY - 8, String(slash.damage));
        sfx(enemy.boss ? "bossHit" : "hit");
        if (enemy.hp <= 0) {
          if (enemy.boss) {
            setHitStop(0.1);
            pushFeel({ kind: "bossKill", hitFreezeAfter: hitFreezeTimer, shakeAfter: shakeMag, particles: 0, floater: true });
            defeatBoss(enemy);
            break;
          }
          setHitStop(0.06);
          addShake(5);
          spawnBurst(enemyCenterX, enemyCenterY, enemyDefs[enemy.type].color, 12);
          pushFeel({ kind: "kill", hitFreezeAfter: hitFreezeTimer, shakeAfter: shakeMag, particles: 12, floater: true });
          const spawnedReplacement = onEnemyDeath(enemy);
          enemy.alive = false;
          logEvent("enemy_defeated", `${enemy.name} patched out.`);
          sfx("enemyDeath");
          void spawnedReplacement;
        } else {
          setHitStop(0.03);
          addShake(2.5);
          let knockbackApplied = false;
          if (!enemy.boss) {
            // Knock the enemy directly away from the player, in 2-D.
            const t = playerTarget();
            const kang = Math.atan2(enemy.y - t.y, enemy.x - t.x);
            enemy.knockbackVx = Math.cos(kang) * 160;
            enemy.knockbackVy = Math.sin(kang) * 160;
            knockbackApplied = true;
          }
          pushFeel({ kind: "hit", hitFreezeAfter: hitFreezeTimer, shakeAfter: shakeMag, particles: 0, floater: true, knockbackApplied });
        }
      }
    }
    flushPendingSpawns();
    game.slashes = game.slashes.filter((slash) => slash.life > 0);
    game.enemyShots = game.enemyShots.filter((shot) => shot.life > 0 && shot.x > -20 && shot.x < 1000 && shot.y > -20 && shot.y < 560);
  }

  // --- Top-down targeting helpers ------------------------------------------
  // Enemy body center: x is already the sprite's horizontal center, y is the
  // feet anchor, so subtract half-height. The player anchors its box at the
  // left edge / bottom, so playerTarget() offsets differently — keep separate.
  function enemyCenter(e) { return { x: e.x, y: e.y - (e.h || 0) / 2 }; }
  function playerTarget() { const p = game.player; return { x: p.x + p.w / 2, y: p.y - p.h / 2 }; }
  function distToPlayer(e) {
    const a = enemyCenter(e); const t = playerTarget();
    return Math.hypot(t.x - a.x, t.y - a.y);
  }
  // Move an actor toward (tx,ty) at spd px/s, clamped to the arena on both axes.
  // Returns the heading angle so callers can reuse it (facing / repel / orbit).
  function chaseToward(e, tx, ty, spd, dt) {
    const ang = Math.atan2(ty - e.y, tx - e.x);
    e.x = clamp(e.x + Math.cos(ang) * spd * dt, ARENA.x0, ARENA.x1);
    e.y = clamp(e.y + Math.sin(ang) * spd * dt, ARENA.y0, ARENA.y1);
    return ang;
  }

  function updateEnemies(dt) {
    for (const enemy of game.enemies) {
      if (!enemy.alive) continue;
      if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      if (enemy.knockbackVx || enemy.knockbackVy) {
        const decay = Math.pow(0.82, dt * 60);
        enemy.x = clamp(enemy.x + (enemy.knockbackVx || 0) * dt, ARENA.x0, ARENA.x1);
        enemy.y = clamp(enemy.y + (enemy.knockbackVy || 0) * dt, ARENA.y0, ARENA.y1);
        enemy.knockbackVx = (enemy.knockbackVx || 0) * decay;
        enemy.knockbackVy = (enemy.knockbackVy || 0) * decay;
        if (Math.abs(enemy.knockbackVx) < 4) enemy.knockbackVx = 0;
        if (Math.abs(enemy.knockbackVy) < 4) enemy.knockbackVy = 0;
      }
      if (enemy.boss) { updateBoss(enemy, dt); continue; }
      const handler = ENEMY_UPDATERS[enemy.type];
      if (handler) handler(enemy, dt);
      else updateGenericEnemy(enemy, dt);
    }
    flushPendingSpawns();
    updateHazards(dt);
  }

  // Shared melee cadence: telegraph decrement + windup contact hit.
  function tickTimers(enemy, dt) {
    enemy.wasWindup = enemy.windupTimer > 0;
    enemy.attackTimer -= dt;
    enemy.contactTimer -= dt;
    enemy.windupTimer -= dt;
    enemy.telegraph = Math.max(0, enemy.telegraph - dt);
  }

  function contactWindup(enemy, reason, range = 46) {
    const d = distToPlayer(enemy);
    if (enemy.wasWindup && enemy.windupTimer <= 0 && d < range + 18) {
      damagePlayer(enemy.damage, reason);
    }
    if (d < range && enemy.attackTimer <= 0 && enemy.contactTimer <= 0) {
      enemy.telegraph = 0.28;
      enemy.windupTimer = 0.26;
      enemy.attackTimer = 1.5;
      enemy.contactTimer = 1.1;
    }
  }

  function rangedVolley(enemy, dt, count) {
    if (distToPlayer(enemy) >= 46 && enemy.attackTimer <= 0.05 && enemy.contactTimer <= 0) {
      enemy.attackTimer = featureFlagActive() ? 2.4 : 1.7;
      enemy.telegraph = 0.32;
      if (featureFlagActive() || circuitBreakerActive()) return;
      const c = enemyCenter(enemy); const t = playerTarget();
      const base = Math.atan2(t.y - c.y, t.x - c.x);
      for (let i = 0; i < count; i += 1) {
        const a = base + (i - (count - 1) / 2) * 0.18;
        game.enemyShots.push({ x: c.x, y: c.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 2.4, damage: enemy.damage, source: enemy.name });
      }
    }
  }

  function updateGenericEnemy(enemy, dt) {
    const flagSlow = featureFlagActive() ? 0.58 : 1;
    const growth = enemy.type === "memory_leak" ? (enemy.maxHp - enemy.hp) * 0.5 : 0;
    const t = playerTarget();
    chaseToward(enemy, t.x, t.y, (enemy.speed + growth) * flagSlow, dt);
    tickTimers(enemy, dt);
    contactWindup(enemy, `${enemy.name} collided with active code.`);
    if (enemy.type === "breaking_change") rangedVolley(enemy, dt, 1);
  }

  // Transitive Bug — smallest thing on screen; spreads to a linked enemy, or when
  // alone infects a graph neighbour (registered risk + pin + debt).
  function updateTransitiveBug(enemy, dt) {
    const flagSlow = featureFlagActive() ? 0.58 : 1;
    const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const kin = game.enemies.filter((e) => e.alive && e !== enemy && !e.boss && e.type !== "transitive_bug");
    const mate = kin.sort((a, b) => dist2(a, enemy) - dist2(b, enemy))[0] || null;
    enemy.infectTimer -= dt * flagSlow;
    tickTimers(enemy, dt);
    const target = mate && enemy.infectTimer < 0.8 ? { x: mate.x, y: mate.y } : playerTarget();
    chaseToward(enemy, target.x, target.y, enemy.speed * flagSlow, dt);
    if (enemy.infectTimer <= 0.3 && enemy.telegraph <= 0) enemy.telegraph = 0.3;
    if (enemy.infectTimer <= 0) {
      if (mate && dist2(mate, enemy) < 70) {
        // Spreading to kin is repeatable (an escalating swarm).
        mate.maxHp += 8; mate.hp += 8; mate.speed += 14; mate.infected = true;
        logEvent("enemy_infected", `${enemy.name} spread to ${mate.name} (+8 HP / +14 spd).`);
      } else if (!enemy.infectedNode) {
        // Infecting the graph is one-shot per bug, so debt/risk can't inflate unbounded.
        enemy.infectedNode = true;
        const node = resolveLocationNode();
        const nb = graphNeighbor(node) || node;
        applyGraphEffects([
          { op: "registerRisk", id: `transitive_${nb}`, kind: "cascade", target: nb, reason: "unpatched transitive bug propagated" },
          { op: "pinNode", id: nb },
        ], "enemy:transitive_bug");
        game.run.techDebt += 3; game.run.debtTags.push("transitive_debt");
        logEvent("graph_infected", `Transitive Bug reached ${nb}: risk registered, node pinned.`);
      }
      enemy.infectTimer = 2.6;
    }
    contactWindup(enemy, `${enemy.name} bit through a transitive path.`);
  }

  // Version Conflict — advances as one mass until half HP, then forks into two
  // incompatible halves that alternate a damage shield.
  function updateVersionConflict(enemy, dt) {
    const flagSlow = featureFlagActive() ? 0.58 : 1;
    const t = playerTarget();
    chaseToward(enemy, t.x, t.y, enemy.speed * flagSlow, dt);
    tickTimers(enemy, dt);
    enemy.seam = 1 - enemy.hp / enemy.maxHp;
    if (!enemy.forked && enemy.hp <= enemy.maxHp * 0.5) { forkVersionConflict(enemy); return; }
    contactWindup(enemy, `${enemy.name} demanded a matching version.`);
  }

  function forkVersionConflict(enemy) {
    if (enemy.forked) return;
    enemy.forked = true;
    enemy.alive = false;
    spawnEnemy("version_conflict_half", { x: clamp(enemy.x - 20, ARENA.x0, ARENA.x1), y: enemy.y, variant: "v1", color: "#ff2d55", phase: 0, coexist: 0 });
    spawnEnemy("version_conflict_half", { x: clamp(enemy.x + 20, ARENA.x0, ARENA.x1), y: enemy.y, variant: "v2", color: "#ff8a3d", phase: Math.PI, coexist: 0 });
    const node = resolveLocationNode();
    const edge = ensureConflictEdge(node, "modern_crypto");
    applyGraphEffects([
      { op: "registerRisk", id: "version_conflict", kind: "upgrade", target: edge.id, reason: "incompatible versions forked in-flight" },
    ], "enemy:version_conflict");
    logEvent("enemy_split", "Version Conflict forked into v1 (red) and v2 (orange); they refuse to coexist.");
    sfx("conflict");
  }

  function updateVersionHalf(enemy, dt) {
    const flagSlow = featureFlagActive() ? 0.58 : 1;
    enemy.shieldClock += dt;
    const shimHold = game.run.installedPackages.includes("compatibility_shim") && enemy.variant === "v1";
    enemy.exposed = Math.sin(enemy.shieldClock * 2.2 + enemy.phase) > 0 || featureFlagActive() || shimHold;
    enemy.telegraph = enemy.exposed ? 0.2 : 0;
    const sib = game.enemies.find((e) => e.alive && e.type === "version_conflict_half" && e !== enemy);
    const near = sib && Math.hypot(sib.x - enemy.x, sib.y - enemy.y) < 40;
    if (near) {
      // Repel away from the sibling — semver incompatibility pushes them apart.
      chaseToward(enemy, enemy.x + (enemy.x - sib.x), enemy.y + (enemy.y - sib.y), enemy.speed * flagSlow, dt);
    } else {
      const t = playerTarget();
      chaseToward(enemy, t.x, t.y, enemy.speed * flagSlow, dt);
    }
    tickTimers(enemy, dt);
    // If they can't be pushed apart (cornered), they reconcile into an active conflict.
    if (near) {
      enemy.coexist = (enemy.coexist || 0) + dt;
      enemy.telegraph = Math.max(enemy.telegraph, 0.2);
      if (enemy.coexist > 2.5 && !game.vcReconciled) {
        game.vcReconciled = true;
        const edge = game.run.graph.edges.find((e) => e.relation === "conflicts");
        if (edge) { edge.active = true; edge.visibility = "known"; }
        game.run.techDebt += 6; game.run.debtTags.push("unreconciled_conflict");
        logEvent("conflict_activated", "v1 and v2 reconciled into an active conflict. Build-failure pressure up.");
        sfx("conflict");
      }
    } else {
      enemy.coexist = 0;
    }
    contactWindup(enemy, `${enemy.name} forced an incompatible upgrade.`);
  }

  // Deprecated API — slow; paves the arena with deprecation zones and, if left
  // alive too long, deprecates the current node.
  function updateDeprecatedApi(enemy, dt) {
    const flagSlow = featureFlagActive() ? 0.58 : 1;
    const t = playerTarget();
    chaseToward(enemy, t.x, t.y, enemy.speed * flagSlow, dt);
    enemy.zoneTimer -= dt;
    enemy.lifeClock += dt;
    tickTimers(enemy, dt);
    if (enemy.zoneTimer <= 0.4 && !enemy.stamping) { enemy.stamping = true; enemy.stampX = enemy.x; enemy.stampY = enemy.y; enemy.telegraph = 0.4; }
    if (enemy.zoneTimer <= 0) {
      addHazard(enemy.stampX ?? enemy.x, enemy.stampY ?? enemy.y, { dps: 4, life: 6, source: enemy.name });
      enemy.zoneTimer = featureFlagActive() ? 3.4 : 2.0;
      enemy.stamping = false;
      logEvent("zone_dropped", `${enemy.name} shed a deprecation zone.`);
    }
    contactWindup(enemy, `${enemy.name} enforced a deprecation.`);
    if (enemy.lifeClock > 10 && !enemy.deprecatedNode) {
      enemy.deprecatedNode = true;
      const node = resolveLocationNode();
      applyGraphEffects([
        { op: "registerRisk", id: `deprecation_${node}`, kind: "upgrade", target: node, reason: "deprecated API left in build too long" },
        { op: "pinNode", id: node },
        { op: "increaseDebt", amount: 6, tag: "deprecation_debt" },
      ], "enemy:deprecated_api");
      logEvent("graph_deprecated", `${node} marked deprecated. TDR +6 -> audit pressure.`);
    }
  }

  // Dependency Cycle — oscillates so it can't be face-tanked; on death under debt
  // it re-resolves into a regression (the cycle never fully breaks under debt).
  function updateDependencyCycle(enemy, dt) {
    const flagSlow = featureFlagActive() ? 0.58 : 1;
    // Radial oscillation: hold a stand-off band from the player so it can't be
    // face-tanked. Too close -> back off; too far -> close in; the sign flips the
    // pursuit vector so it orbits/yo-yos instead of committing to contact.
    const t = playerTarget();
    const d = distToPlayer(enemy);
    if (d < 70) enemy.dir = -1;
    else if (d > 210) enemy.dir = 1;
    const toward = Math.atan2(t.y - enemy.y, t.x - enemy.x);
    const ang = enemy.dir >= 0 ? toward : toward + Math.PI;
    enemy.x = clamp(enemy.x + Math.cos(ang) * enemy.speed * flagSlow * dt, ARENA.x0, ARENA.x1);
    enemy.y = clamp(enemy.y + Math.sin(ang) * enemy.speed * flagSlow * dt, ARENA.y0, ARENA.y1);
    tickTimers(enemy, dt);
    contactWindup(enemy, `${enemy.name} looped back through active code.`);
    rangedVolley(enemy, dt, 1);
  }

  const ENEMY_UPDATERS = {
    transitive_bug: updateTransitiveBug,
    version_conflict: updateVersionConflict,
    version_conflict_half: updateVersionHalf,
    deprecated_api: updateDeprecatedApi,
    dependency_cycle: updateDependencyCycle,
  };

  // Special on-death behaviour for non-boss enemies (spawn replacements, etc.).
  function onEnemyDeath(enemy) {
    if (enemy.type === "version_conflict" && !enemy.forked) {
      forkVersionConflict(enemy);
      return true;
    }
    if (enemy.type === "dependency_cycle" && game.run.techDebt >= 16) {
      spawnEnemy("regression", { x: enemy.x });
      logEvent("cycle_reresolved", "Dependency Cycle re-resolved into a Regression under debt.");
      return true;
    }
    return false;
  }

  // --- Boss engine ---------------------------------------------------------

  const BOSS_INTROS = {
    major_version_upgrade: "every requires edge you left on an old node, due at once. Semver was a promise; this is the invoice.",
    distributed_monolith: "every service you wired together, now sharing one health bar and one very bad mood.",
  };

  // Compute both boss scores from run state in a single pass (no double counting),
  // select the higher above threshold (tie -> default), and record mutations.
  function selectBoss() {
    const run = game.run;
    const upgradeRisks = run.risks.filter((r) => r.kind === "upgrade").length;
    const cascadeRisks = run.risks.filter((r) => r.kind === "cascade").length;
    const addedEdges = run.graph.edges.filter((e) => e.createdBy).length;
    // Discrete addBossScore accumulation + structural signals not covered by it.
    const major = 1 + run.bossScores.major_version_upgrade + run.pins.length + upgradeRisks; // +1 baseline old-runtime edges
    const monolith = run.bossScores.distributed_monolith + addedEdges + cascadeRisks;
    let boss = "major_version_upgrade";
    if (monolith > major && monolith >= 5) boss = "distributed_monolith";
    run.selectedBoss = boss;
    const loser = boss === "major_version_upgrade" ? monolith : major;
    run.bossMutations = [];
    if (loser >= 3) run.bossMutations.push(boss === "major_version_upgrade" ? "coupled_cascade" : "brittle_pins");
    if (run.techDebt >= 75) run.bossMutations.push(boss === "major_version_upgrade" ? "audit_debt" : "cascade_debt");
    run.bossScoreSnapshot = { major, monolith, threshold: 5 };
    logEvent("boss_selected", `${enemyDefs[boss].name} selected (upgrade pressure ${major} vs coupling ${monolith}).`, { boss });
    return boss;
  }

  function prepareBossRoom() {
    const bossId = selectBoss();
    const def = enemyDefs[bossId];
    if (bossId === "distributed_monolith") {
      game.enemies = game.enemies.map((e) => (e.type === "breaking_change" ? makeEnemy({ type: "memory_leak", x: e.x, y: e.y }, e.id) : e));
    }
    const boss = makeEnemy({ type: bossId, x: (ARENA.x0 + ARENA.x1) / 2, y: (ARENA.y0 + ARENA.y1) / 2 }, `boss`);
    boss.boss = true;
    boss.armored = true;
    boss.windowTimer = def.phases[0].windowEvery;
    boss.windowOpen = 0;
    boss.arcTimer = 2.4;
    boss.summonTimer = 11;
    boss.phaseIndex = 0;
    boss.pendingArc = null;
    game.enemies.push(boss);
    game.boss = boss;
    game.bossIntroTimer = 3.4;
    logEvent("boss_started", `${def.name}: ${BOSS_INTROS[bossId] || ""}`, { boss: bossId });
  }

  function updateBoss(boss, dt) {
    const def = enemyDefs[boss.type];
    const p = game.player;
    const frac = boss.hp / boss.maxHp;
    let phaseIndex = 0;
    for (let i = 0; i < def.phases.length; i += 1) if (frac <= def.phases[i].at) phaseIndex = i;
    if (phaseIndex !== boss.phaseIndex) {
      boss.phaseIndex = phaseIndex;
      logEvent("boss_phase", `${def.name} entered ${def.phases[phaseIndex].name}.`);
    }
    const phase = def.phases[boss.phaseIndex];

    // Slow drift back toward the arena center on both axes (a lane boss, not a
    // pursuer — it dominates the middle and attacks outward).
    const homeX = (ARENA.x0 + ARENA.x1) / 2, homeY = (ARENA.y0 + ARENA.y1) / 2;
    boss.x += Math.sign(homeX - boss.x) * def.speed * 0.4 * dt;
    boss.y += Math.sign(homeY - boss.y) * def.speed * 0.4 * dt;
    boss.telegraph = Math.max(0, boss.telegraph - dt);

    // Vulnerability window cycle — armored except during the compatibility window.
    if (boss.windowOpen > 0) {
      boss.windowOpen -= dt;
      boss.armored = false;
      if (boss.windowOpen <= 0) boss.armored = true;
    } else {
      boss.windowTimer -= dt;
      if (boss.windowTimer <= 0) {
        boss.windowOpen = phase.windowFor;
        boss.windowTimer = phase.windowEvery;
        boss.armored = false;
        boss.telegraph = 0.5;
        game.run.bossStats.safeWindows += 1;
        logEvent("boss_window", `${def.name} exposed a compatibility window.`);
        // On-canvas echo so the vulnerability window reads in the arena (and by ear),
        // not only in the side log — this is the boss's one "strike now" moment.
        spawnFloater(boss.x, boss.y - boss.h - 12, "WINDOW OPEN", "#9be7a0");
        addShake(3);
        sfx("reveal");
      }
    }

    // Edge-travelling arc attack (telegraph -> launch along a real graph edge).
    if (boss.pendingArc) {
      boss.pendingArc.delay -= dt;
      if (boss.pendingArc.delay <= 0) {
        launchArc(boss, def);
        boss.pendingArc = null;
      }
    }
    boss.arcTimer -= dt;
    if (boss.arcTimer <= 0) {
      boss.arcTimer = phase.arcEvery;
      if (!featureFlagActive() && !boss.pendingArc) {
        const edgeId = def.edges.find((id) => game.run.graph.edges.some((e) => e.id === id)) || def.edges[0];
        boss.pendingArc = { delay: 0.5, edgeId };
        boss.telegraph = 0.5;
        sfx("bossEdgeAttack");
        logEvent("boss_arc", `${def.name} charged a break along ${edgeId}.`);
      }
    }

    // Phase summons.
    if (phase.summon) {
      boss.summonTimer -= dt;
      if (boss.summonTimer <= 0) {
        boss.summonTimer = 11;
        // Summon on the opposite side of the arena from the player (both axes).
        spawnEnemy(phase.summon, { x: p.x > 480 ? 210 : 760, y: (p.y - p.h / 2) > 270 ? 150 : 390 });
        logEvent("boss_summon", `${def.name} summoned ${enemyDefs[phase.summon].name}.`);
      }
    }

    tickTimers(boss, dt);
    contactWindup(boss, `${def.name} rolled over active code.`, 70);
  }

  function launchArc(boss, def) {
    // Break travels along the aim to the player, in 2-D (was a horizontal
    // floor-skimmer). Still flagged arc:true — unblockable by circuit breaker.
    const c = enemyCenter(boss); const t = playerTarget();
    const ang = Math.atan2(t.y - c.y, t.x - c.x);
    const damage = Math.round(def.damage * 0.7);
    game.enemyShots.push({ x: c.x, y: c.y, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 3, damage, source: `${def.name} break`, arc: true });
  }

  function defeatBoss(enemy) {
    enemy.alive = false;
    game.run.bossStats.defeated = enemy.type;
    logEvent("boss_defeated", `${enemy.name} defeated. Release candidate shipped.`, { boss: enemy.type });
    // Let the climax land: a big burst + shake before the report, instead of an
    // instant hard-cut to the postmortem screen on the same frame.
    bossVictoryPending = true;
    const pendingRun = game.run;
    spawnBurst(enemy.x, enemy.y - enemy.h / 2, enemyDefs[enemy.type].color, 34);
    addShake(12);
    sfx("enemyDeath");
    window.setTimeout(() => {
      // Ignore if the player already started a new run (resetGame) in the pause window.
      if (game.run !== pendingRun || game.run.ended) return;
      bossVictoryPending = false;
      endRun(true, `Defeated ${enemy.name}; the release shipped.`);
    }, 700);
  }

  // --- Active tools: Rollback (R), Circuit Breaker (C) ----------------------

  function circuitBreakerActive() {
    return game.circuitBreakerTimer > 0;
  }

  function useRollback() {
    if (!game.run.tools.includes("rollback")) {
      logEvent("tool_unavailable", "Rollback not installed.");
      renderAllUi();
      return;
    }
    if (game.run.risks.some((r) => r.kind === "upgrade")) {
      logEvent("tool_blocked", "Rollback blocked: a registered upgrade/migration risk cannot be un-shipped.");
      renderAllUi();
      return;
    }
    if (game.toolCooldowns.rollback > 0) return;
    game.toolCooldowns.rollback = 12;
    const before = Math.round(game.run.stability);
    game.run.stability = Math.min(100, game.run.stability + 15);
    game.enemyShots.length = 0;
    game.hazards.length = 0;
    game.run.techDebt += 4;
    game.run.debtTags.push("rollback_drift");
    game.run.bossStats.rolledBack += 1;
    logEvent("rollback_used", `Rollback restored Stability ${before} -> ${Math.round(game.run.stability)} and cleared the wave. TDR +4.`);
    renderAllUi();
  }

  function useCircuitBreaker() {
    if (!game.run.tools.includes("circuit_breaker")) {
      logEvent("tool_unavailable", "Circuit Breaker not installed.");
      renderAllUi();
      return;
    }
    if (game.toolCooldowns.circuit_breaker > 0 || game.circuitBreakerTimer > 0) return;
    game.circuitBreakerTimer = 4;
    game.toolCooldowns.circuit_breaker = 10;
    game.enemyShots = game.enemyShots.filter((s) => s.arc);
    logEvent("circuit_breaker_used", "Circuit Breaker tripped: projectiles blocked and cascade halted for 4s.");
    renderAllUi();
  }

  // Rubber Duck — hold still to surface one hidden edge/node.
  function updateDuck(dt) {
    if (!game.run.tools.includes("rubber_duck")) return;
    const p = game.player;
    const still = Math.abs(p.vx) < 1 && Math.abs(p.vy) < 1 && game.roomIntroTimer <= 0;
    if (!still) { game.duckHoldTimer = 0; return; }
    game.duckHoldTimer += dt;
    if (game.duckHoldTimer >= 1.6) {
      game.duckHoldTimer = 0;
      revealOneHidden();
    }
  }

  function revealOneHidden() {
    const run = game.run;
    const edge = run.graph.edges.find((e) => e.visibility === "hidden");
    if (edge) {
      edge.visibility = "suspected";
      logEvent("graph_revealed", `Rubber Duck surfaced a hidden edge: ${edge.source} ${edge.relation} ${edge.target}.`, { edge: edge.id });
      renderAllUi();
      return;
    }
    const node = run.graph.nodes.find((n) => n.hidden);
    if (node) {
      node.hidden = false;
      logEvent("graph_revealed", `Rubber Duck surfaced hidden node ${node.name}.`, { node: node.id });
      renderAllUi();
    }
  }

  function updateRoomFlow(dt) {
    const alive = game.enemies.some((enemy) => enemy.alive);
    if (alive) return;
    roomClearTimer += dt;
    if (roomClearTimer <= 0.7) return;

    const room = game.currentRoom;
    if (room.packageChoice && !choiceShown) {
      roomClearedLogged = true;
      logEvent("room_cleared", `${room.name} cleared. Package offer opened.`, { room: room.id });
      showPackageChoice();
      return;
    }

    if (!roomClearedLogged) completeRoom(room);
    if (roomClearTimer <= 1.2) return;
    // Hybrid exits: once cleared, doors light up on the walls (one per graph
    // route). The player walks into a door to open that route's detail; here we
    // just keep the doors phase alive and watch for a door touch.
    if (!game.doorsPhase) advanceFromRoom(room);
    else updateDoors();
  }

  function completeRoom(room) {
    roomClearedLogged = true;
    // Clearing a combat room patches a little Stability back — sustain for the run.
    if (room.enemies && room.enemies.length && !room.bossRoom && game.run.stability > 0) {
      const before = Math.round(game.run.stability);
      // Flat +8 by default; the clearHealTaper knob ramps it down by room so late-run
      // combat damage stops being fully refunded (rising tension). Off = current behavior.
      const clearHeal = FEEL.clearHealTaper ? Math.max(3, 8 - game.run.roomIndex) : 8;
      game.run.stability = Math.min(100, game.run.stability + clearHeal);
      const healed = Math.round(game.run.stability) - before;
      if (healed > 0) spawnFloater(game.player.x + game.player.w / 2, game.player.y - 40, `+${healed} STABILITY`, "#9be7a0");
      logEvent("room_cleared", `${room.name} cleared. Stability ${before} -> ${Math.round(game.run.stability)}.`, { room: room.id });
    } else {
      logEvent("room_cleared", `${room.name} cleared.`, { room: room.id });
    }
    if (room.clearReward) applyRoomReward(room.clearReward, room.id);
    renderAllUi();
  }

  function applyRoomReward(reward, roomId) {
    if (reward.stability) game.run.stability = Math.min(100, game.run.stability + reward.stability);
    if (reward.observability) game.run.observability = Math.max(0, Math.min(5, game.run.observability + reward.observability));
    if (reward.techDebt) game.run.techDebt = Math.max(0, game.run.techDebt + reward.techDebt);
    if (reward.text) logEvent("room_reward", reward.text, { room: roomId });
    if (reward.effects) {
      const room = roomById.get(roomId);
      namespace.effects.applyEffectList(game.run, reward.effects, { id: roomId, name: room?.name || roomId }, logEvent);
    }
  }

  function advanceFromRoom(room) {
    const routes = availableRoutes(room);
    if (!routes.length) {
      endRun(true, "Release candidate shipped with documented concerns.");
      return;
    }
    // A single onward edge is a corridor, not a decision — travel it directly so
    // linear segments don't force dead walking. Real forks become doors.
    if (routes.length === 1) {
      selectRoute(routes[0]);
      return;
    }
    enterDoorsPhase(routes);
  }

  // The graph node a route travels TO from the current locus: the far endpoint of
  // the route's edge, or the destination room's own locus node as a fallback.
  function routeTargetNode(route, curNode) {
    const edge = route.edge && game.run.graph.edges.find((e) => e.id === route.edge);
    if (edge) {
      if (edge.source === curNode) return edge.target;
      if (edge.target === curNode) return edge.source;
      return edge.target || edge.source;
    }
    const room = roomById.get(route.to);
    if (room) {
      if (room.mapNode) return room.mapNode;
      if (room.mapEdge) {
        const me = game.run.graph.edges.find((e) => e.id === room.mapEdge);
        return me ? me.source : null;
      }
    }
    return null;
  }

  // Which wall a route's door belongs on = the compass direction from the current
  // graph node to the route's target node on the orthogonal map layout. This is the
  // core of "the map is the world": exit the north door -> the map's north neighbor.
  function routeSide(route, curNode, curPos) {
    const target = routeTargetNode(route, curNode);
    const tPos = target && GRAPH_POSITIONS[target];
    if (!curPos || !tPos) return null; // caller falls back to a spare wall
    const dx = tPos[0] - curPos[0];
    const dy = tPos[1] - curPos[1]; // graph y grows downward, same as screen
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
    return dy >= 0 ? "bottom" : "top";
  }

  // --- Hybrid doors: spatial exits mapped to graph routes ------------------
  // Lay one glowing door per route onto the arena walls, each on the wall that
  // matches its neighbour's direction on the graph map (spreading if a side gets
  // more than one). Walking into a door opens that route's detail popup.
  function enterDoorsPhase(routes) {
    game.doorsPhase = true;
    const DW = 88, DTH = 20; // door gap length / wall thickness
    const curNode = resolveLocationNode();
    const curPos = GRAPH_POSITIONS[curNode];
    const sideOrder = ["top", "right", "bottom", "left"];
    // Assign each door its geographic wall; routes that can't resolve a direction
    // fall back to the first free wall in sideOrder so every route still gets a door.
    const used = new Set();
    game.doors = routes.map((route) => {
      const side = routeSide(route, curNode, curPos);
      if (side) used.add(side);
      return { route, side, node: routeTargetNode(route, curNode) };
    });
    for (const d of game.doors) {
      if (d.side) continue;
      d.side = sideOrder.find((s) => !used.has(s)) || "bottom";
      used.add(d.side);
    }
    const countBySide = {}; const placed = {};
    for (const d of game.doors) countBySide[d.side] = (countBySide[d.side] || 0) + 1;
    for (const d of game.doors) {
      const n = countBySide[d.side];
      const k = (placed[d.side] = (placed[d.side] || 0), placed[d.side]++);
      const frac = (k + 1) / (n + 1);
      if (d.side === "top" || d.side === "bottom") {
        d.x = ARENA.x0 + (ARENA.x1 - ARENA.x0) * frac;
        d.y = d.side === "top" ? ARENA.y0 : ARENA.y1;
        d.w = DW; d.h = DTH;
      } else {
        d.y = ARENA.y0 + (ARENA.y1 - ARENA.y0) * frac;
        d.x = d.side === "left" ? ARENA.x0 : ARENA.x1;
        d.w = DTH; d.h = DW;
      }
    }
    // Annotate each door with live graph state at its target node, so the exits
    // themselves carry the consequences of how the player has reshaped the graph:
    // a conflicted neighbour warns red, a risky one cautions amber, and a path only
    // opened because of an installed package is flagged NEW.
    for (const d of game.doors) {
      const node = game.run.graph.nodes.find((n) => n.id === d.node);
      d.risk = !!node?.tags?.some((t) => ["legacy", "debt", "security_risk", "unstable"].includes(t));
      d.conflict = game.run.graph.edges.some((e) => e.relation === "conflicts" && e.active && (e.source === d.node || e.target === d.node) && e.visibility !== "hidden");
      d.newpath = !!(d.route.requiresPackage && game.run.installedPackages.includes(d.route.requiresPackage));
    }
    const cx = (ARENA.x0 + ARENA.x1) / 2, cy = (ARENA.y0 + ARENA.y1) / 2;
    spawnFloater(cx, cy - 30, "EXITS OPEN", "#9be7ff");
    sfx("reveal");
    logEvent("routes_open", `${game.currentRoom.name} cleared. ${routes.length} exits opened — pick one, or walk to a door.`, { room: game.currentRoom.id });
    for (const d of game.doors.filter((x) => x.newpath)) {
      logEvent("route_unlocked", `A new corridor opened toward ${d.node} — an installed package added that path.`, { room: game.currentRoom.id });
    }
    // Auto-open the locus screen listing ALL exits on clear (the doors stay lit on
    // the walls as a spatial shortcut for players who close the screen to walk).
    showRouteChoice(routes);
  }

  function updateDoors() {
    if (isOverlayOpen()) return;
    const p = game.player;
    const touched = game.doors.find((d) => rectsOverlap(p.x, p.y - p.h, p.w, p.h, d.x - d.w / 2, d.y - d.h / 2, d.w, d.h));
    if (!touched) { game.doorReopenBlock = false; return; } // stepped off — re-arm
    if (game.doorReopenBlock) return; // just backed out of this door; wait until they leave
    // Open the full locus screen (all exits), focused on the door walked into, so the
    // spatial pick and the compare-all screen stay one and the same UI.
    showRouteChoice(game.doors.map((d) => d.route), game.doors.indexOf(touched));
  }

  // Back out of a single door's detail without travelling, staying in the doors phase.
  function closeRoutePreview() {
    ui.routeOverlay.classList.add("hidden");
    audio.setState({ interstitial: false });
    pendingRoutes = [];
    activeRouteChoice = null;
    game.doorReopenBlock = true; // don't reopen until the player steps off the door
    sfx("uiMove");
  }

  function availableRoutes(room) {
    return (room.routes || []).filter((route) => !route.requiresPackage || game.run.installedPackages.includes(route.requiresPackage));
  }

  function damagePlayer(amount, reason) {
    if (game.player.invulnTimer > 0 || bossVictoryPending) return;
    const drain = featureFlagActive() ? 0 : game.run.incident?.stabilityDrain ?? 0;
    const adjusted = amount + (drain > 0 ? Math.ceil(drain / 4) : 0);
    game.run.stability = Math.max(0, game.run.stability - adjusted);
    game.player.invulnTimer = 0.75;
    hitFreezeTimer = 0.06;
    addShake(6);
    addHitSpark(game.player.x, game.player.y - 24, "#dfffee");
    spawnFloater(game.player.x + game.player.w / 2, game.player.y - 40, `-${adjusted}`, "#ff6b6b");
    sfx("playerHit");
    pushFeel({ kind: "playerHit", hitFreezeAfter: hitFreezeTimer, shakeAfter: shakeMag, particles: 0, floater: true });
    logEvent("stability_damage", `${reason} Stability -${adjusted}.`);
    renderAllUi();
    if (game.run.stability <= 0) endRun(false, reason);
  }

  function addHitSpark(x, y, color) {
    game.hitSparks.push({ x, y, color, life: 0.24, maxLife: 0.24 });
  }

  function updateHitSparks(dt) {
    for (const spark of game.hitSparks) spark.life -= dt;
    game.hitSparks = game.hitSparks.filter((spark) => spark.life > 0);
  }

  // --- Juice: screen shake, particle bursts, floating combat text ----------
  // The camera/particle/text scaffolding the game was missing — impact and
  // consequence now land ON the arena where the eye is, not only in the log.
  function addShake(mag) {
    shakeMag = Math.min(12, Math.max(shakeMag, mag));
  }

  function setHitStop(seconds) {
    hitFreezeTimer = Math.max(hitFreezeTimer, seconds);
  }

  // Tier-2 feel telemetry (fun-tuneup-protocol.md): a capped ring buffer of impact
  // events, read out via DepHell.debug.feel(). Push AFTER the juice calls fire so the
  // recorded hitFreeze/shake reflect what the player will actually feel this frame.
  function pushFeel(event) {
    if (!game.feelLog) game.feelLog = [];
    game.feelLog.push({ t: performance.now(), ...event });
    if (game.feelLog.length > 512) game.feelLog.shift();
  }

  function spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 190;
      game.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.3 + Math.random() * 0.25,
        maxLife: 0.55,
        size: 1.5 + Math.random() * 2.5,
        color: Math.random() < 0.5 ? "#ffffff" : color,
      });
    }
  }

  function updateParticles(dt) {
    for (const p of game.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 520 * dt;
      p.vx *= Math.pow(0.92, dt * 60);
      p.life -= dt;
    }
    game.particles = game.particles.filter((p) => p.life > 0);
  }

  function drawParticles() {
    for (const p of game.particles) {
      const t = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      const s = p.size * (0.5 + t);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      ctx.restore();
    }
  }

  function spawnFloater(x, y, text, color) {
    game.floaters.push({ x: x + (Math.random() * 12 - 6), y, text, color: color || "#dfffee", life: 0.6, maxLife: 0.6, vy: -46 });
  }

  function updateFloaters(dt) {
    for (const f of game.floaters) {
      f.y += f.vy * dt;
      f.vy *= Math.pow(0.9, dt * 60);
      f.life -= dt;
    }
    game.floaters = game.floaters.filter((f) => f.life > 0);
  }

  function drawFloaters() {
    for (const f of game.floaters) {
      const t = Math.max(0, f.life / f.maxLife);
      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 1.4);
      ctx.fillStyle = f.color;
      ctx.font = "bold 15px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 3;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  function updateDashGhosts(dt) {
    for (const ghost of game.dashGhosts) ghost.life -= dt;
    game.dashGhosts = game.dashGhosts.filter((ghost) => ghost.life > 0);
  }

  function endRun(victory, cause) {
    if (game.run.ended) return;
    game.run.ended = true;
    // Drop any held controls the instant the run ends so an in-flight strike/dash/move
    // doesn't carry into the end screen (it also stops the frozen player from "buffering").
    keys.clear();
    mouse.down = false;
    runEndedAt = performance.now();
    logEvent(victory ? "run_won" : "run_failed", cause);
    renderReport(victory, cause);
    ui.reportOverlay.classList.remove("hidden");
    // The results screen is a reading beat — drop to the dimmed, low, faster interstitial thrum.
    audio.setState({ interstitial: true });
  }

  function renderReport(victory, cause) {
    const run = game.run;
    const installed = installedPackageNames(run);
    const conflict = findActiveConflict();
    const identity = buildIdentity(run);
    ui.reportKicker.textContent = victory ? "RELEASE REPORT" : "MINI POSTMORTEM";
    ui.reportTitle.textContent = victory ? "Release candidate shipped." : "Build failed.";
    ui.reportBody.innerHTML = victory ? renderReleaseReport(run, installed, identity, conflict) : renderFailureReport(run, installed, identity, conflict, cause);
    appendFeelCheck();
  }

  // Single source of truth for the playtester build id — shown in the badge, the
  // report, and baked into every feel-check share code. Bump this per test build.
  const BUILD_TAG = "PT1";

  // Tier-3 self-playtest (docs/fun-tuneup-protocol.md) surfaced in-game so the loop
  // can be exercised right after a run. Each question's `flag` is the answer that
  // signals a feel problem.
  const FEEL_QUESTIONS = [
    { q: "When you killed an enemy, did the screen react — jolt, flash, debris?", flag: "no" },
    { q: "Sound OFF for a fight: could you still tell the frame a hit connected?", flag: "no" },
    { q: "Did you win a room standing still, holding attack, never repositioning?", flag: "yes" },
    { q: "Can you name your installed package AND one way it changed the fight?", flag: "no" },
    { q: "After ~room 4, was there any new power or item to chase?", flag: "no" },
    { q: "After clearing a room, was there a stretch you couldn't move or act?", flag: "yes" },
    { q: "The last thing that hurt you — can you name it without the log?", flag: "no" },
    { q: "Did the boss feel like a different challenge (not just hold-swing + wait)?", flag: "no" },
    { q: "At the end, did you want to restart with a specific thing to try?", flag: "no" },
    { q: "At any single moment, did you lean forward or tense up?", flag: "no" },
  ];

  // A short, backend-free code the tester can copy or read aloud. Per-question:
  // Y = yes, N = no, U = unsure/skipped. The flag answers are known here, so the
  // code alone reconstructs which questions flagged and which were left unsure.
  function feelCode(answers) {
    let s = "";
    for (let i = 0; i < FEEL_QUESTIONS.length; i += 1) {
      const a = answers[i];
      s += a === "yes" ? "Y" : a === "no" ? "N" : "U";
    }
    return `DHFEEL-${BUILD_TAG}-${s}`;
  }

  function copyFeelCode(text, btn) {
    let ok = false;
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand("copy"); // works under file:// where clipboard API may not
      document.body.removeChild(ta);
    } catch (_error) { ok = false; }
    if (!ok && navigator.clipboard) {
      try { navigator.clipboard.writeText(text); ok = true; } catch (_error) { /* ignore */ }
    }
    btn.textContent = ok ? "COPIED ✓" : "SELECT THE CODE & COPY";
    window.setTimeout(() => { btn.textContent = "COPY CODE"; }, 1600);
  }

  function appendFeelCheck() {
    const wrap = document.createElement("section");
    wrap.className = "feelcheck";
    const heading = document.createElement("h3");
    heading.innerHTML = "▸ FEEL CHECK <span class=\"fc-sub\">(Tier-3 self-test — skip any you're unsure about)</span>";
    wrap.appendChild(heading);
    const answers = {};

    FEEL_QUESTIONS.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "fc-row";
      const q = document.createElement("p");
      q.className = "fc-q";
      q.textContent = `${i + 1}. ${item.q}`;
      const btns = document.createElement("div");
      btns.className = "fc-btns";
      ["yes", "no"].forEach((ans) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fc-b";
        b.textContent = ans.toUpperCase();
        b.addEventListener("click", () => {
          answers[i] = ans;
          for (const c of btns.children) c.classList.remove("sel", "flag");
          b.classList.add("sel");
          if (ans === item.flag) b.classList.add("flag");
          update();
        });
        btns.appendChild(b);
      });
      row.append(q, btns);
      wrap.appendChild(row);
    });

    // Results: live flag/unsure summary + the shareable code + a copy button.
    const results = document.createElement("div");
    results.className = "fc-results";
    const summary = document.createElement("div");
    summary.className = "fc-summary";
    const codeRow = document.createElement("div");
    codeRow.className = "fc-code-row";
    const code = document.createElement("code");
    code.className = "fc-code";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "fc-copy";
    copyBtn.textContent = "COPY CODE";
    copyBtn.addEventListener("click", () => copyFeelCode(feelCode(answers), copyBtn));
    codeRow.append(code, copyBtn);
    const send = document.createElement("p");
    send.className = "fc-send";
    send.innerHTML = `Playtester build <b>${BUILD_TAG}</b> — copy this code and send it to the dev. Play a few runs and send one each time.`;
    results.append(summary, codeRow, send);
    wrap.appendChild(results);

    function update() {
      const flagged = [];
      let unsure = 0;
      FEEL_QUESTIONS.forEach((item, i) => {
        const a = answers[i];
        if (a === undefined) unsure += 1;
        else if (a === item.flag) flagged.push(i + 1);
      });
      const answered = FEEL_QUESTIONS.length - unsure;
      summary.innerHTML =
        `<b>${flagged.length}</b> flag${flagged.length === 1 ? "" : "s"} 🚩` +
        (flagged.length ? ` <span class="fc-dim">(Q${flagged.join(", Q")})</span>` : "") +
        ` · <b>${unsure}</b> unsure · ${answered}/${FEEL_QUESTIONS.length} answered`;
      const c = feelCode(answers);
      code.textContent = c;
      try {
        window.localStorage.setItem("dephell.feelcheck.last", c);
        if (answered === FEEL_QUESTIONS.length) {
          const log = JSON.parse(window.localStorage.getItem("dephell.feelchecks") || "[]");
          log.push({ at: new Date().toISOString(), code: c, flags: flagged, unsure });
          window.localStorage.setItem("dephell.feelchecks", JSON.stringify(log));
        }
      } catch (_error) { /* private-mode storage is optional */ }
    }

    update();
    ui.reportBody.appendChild(wrap);
  }

  function renderAllUi() {
    const run = game.run;
    ui.stabilityBar.style.width = `${run.stability}%`;
    ui.stabilityValue.textContent = `${Math.round(run.stability)}%`;
    ui.observabilityBar.style.width = `${(run.observability / 5) * 100}%`;
    ui.observabilityValue.textContent = `${run.observability}/5`;
    ui.debtBar.style.width = `${Math.min(100, run.techDebt)}%`;
    ui.debtValue.textContent = String(run.techDebt);
    // Surface build identity DURING the run (it was previously only shown post-mortem),
    // so the player feels the architecture they're assembling actually taking shape.
    if (ui.buildIdentity) ui.buildIdentity.textContent = run.installedPackages.length ? `▸ becoming ${buildIdentity(run)}` : "";
    ui.eventLog.innerHTML = run.eventLog.slice(-9).map((event) => `<li>${event.text}</li>`).join("");
    syncAudioState();
    renderGraph();
    if (!ui.graphOverlay.classList.contains("hidden")) renderPauseGraph();
    if (!ui.routeOverlay.classList.contains("hidden")) renderRouteGraph();
    if (!ui.choiceOverlay.classList.contains("hidden")) renderChoiceGraph();
  }

  function renderGraph() {
    const { visibleNodes, edges, preview } = getPreviewGraph(game.run, activePreviewPackage);
    ui.graphSvg.innerHTML = graphMarkup(game.run, visibleNodes, edges, selectedGraphEntity, { interactive: false, preview, currentLocation: currentGraphLocation() });
    ui.graphCaption.textContent = activePreviewPackage ? `previewing ${activePreviewPackage.name}; install to commit graph changes.` : graphCaption(game.run, edges);
  }

  function renderPauseGraph() {
    const { visibleNodes, edges, preview } = getPreviewGraph(game.run, activePreviewPackage);
    ui.pauseGraphSvg.innerHTML = graphMarkup(game.run, visibleNodes, edges, selectedGraphEntity, { interactive: true, preview, currentLocation: currentGraphLocation(), showLabels: true });
    ui.graphDetails.innerHTML = graphDetails(game.run, selectedGraphEntity, ui.graphCaption.textContent);
  }

  function currentGraphLocation() {
    const room = game.currentRoom || roomById.get(game.run.currentRoomId);
    if (room?.incident && game.run.incident?.cause?.id) return { type: "edge", id: game.run.incident.cause.id };
    if (room?.mapEdge) return { type: "edge", id: room.mapEdge };
    if (room?.mapNode) return { type: "node", id: room.mapNode };
    return { type: "node", id: "app" };
  }

  function applyVisualSmokeMode() {
    const mode = new URLSearchParams(window.location.search).get("visualSmoke");
    if (!mode) return;
    if (mode === "main") {
      game.roomIntroTimer = 0;
      return;
    }
    window.setTimeout(() => {
      if (mode === "choice") {
        showPackageChoice();
        return;
      }
      if (mode === "graph") {
        selectedGraphEntity = { type: "node", id: "libglitch" };
        openGraphOverlay();
        return;
      }
      if (mode === "route") {
        showRouteChoice(availableRoutes(game.currentRoom));
        return;
      }
      if (mode === "boss") {
        game.run.bossScores.major_version_upgrade += 4;
        game.run.pins.push("libglitch");
        loadRoom("release_boss");
        game.roomIntroTimer = 0;
        return;
      }
      if (mode === "monolith") {
        game.run.bossScores.distributed_monolith += 8;
        loadRoom("release_boss");
        game.roomIntroTimer = 0;
        return;
      }
      if (mode === "incident") {
        game.run.techDebt = 22;
        loadRoom("staging_incident");
        game.roomIntroTimer = 0;
        return;
      }
      if (mode.startsWith("room:")) {
        loadRoom(mode.slice(5));
        game.roomIntroTimer = 0;
        return;
      }
      if (mode === "report") {
        seedVisualSmokeReport();
      }
      if (mode === "win") {
        seedVisualSmokeWin();
      }
    }, 0);
  }

  function seedVisualSmokeWin() {
    const run = game.run;
    for (const id of ["test_suite", "containerization"]) {
      const pkg = packages.find((p) => p.id === id);
      if (pkg && !run.installedPackages.includes(id)) {
        run.installedPackages.push(id);
        applyPackageEffects(run, pkg, logEvent);
      }
    }
    run.bossScores.major_version_upgrade += 4;
    selectBoss();
    run.bossStats.defeated = run.selectedBoss;
    run.bossStats.safeWindows = 6;
    run.bossStats.rolledBack = 1;
    endRun(true, `Defeated ${enemyDefs[run.selectedBoss].name}; the release shipped.`);
  }

  function seedVisualSmokeReport() {
    const legacyAuth = packages.find((pkg) => pkg.id === "legacy_auth");
    if (legacyAuth && !game.run.installedPackages.includes(legacyAuth.id)) {
      game.run.installedPackages.push(legacyAuth.id);
      applyPackageEffects(game.run, legacyAuth, logEvent);
    }
    const conflict = game.run.graph.edges.find((edge) => edge.relation === "conflicts");
    if (conflict) {
      conflict.visibility = "known";
      conflict.active = true;
      game.run.incident = {
        id: "build_failure",
        name: "Build Failure",
        cause: conflict,
        stabilityDrain: 9,
      };
    }
    game.run.techDebt = Math.max(game.run.techDebt, 16);
    game.run.stability = 0;
    logEvent("incident_started", "Build Failure started: visual smoke conflict edge activated.", { incident: "build_failure" });
    endRun(false, "Memory Leak collided with active code.");
  }

  function openGraphOverlay() {
    selectedGraphEntity ||= { type: "node", id: "app" };
    ui.graphOverlay.classList.remove("hidden");
    renderPauseGraph();
  }

  function closeGraphOverlay() {
    ui.graphOverlay.classList.add("hidden");
  }

  function isOverlayOpen() {
    return !ui.choiceOverlay.classList.contains("hidden") || !ui.routeOverlay.classList.contains("hidden") || !ui.reportOverlay.classList.contains("hidden") || !ui.graphOverlay.classList.contains("hidden") || (ui.incidentOverlay && !ui.incidentOverlay.classList.contains("hidden"));
  }

  function draw(dt = 1 / 60) {
    const room = game.currentRoom || roomById.get(game.run.currentRoomId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Camera shake: the whole arena kicks on impact. The .stage CSS vignette/border
    // masks the few edge pixels the translate exposes. HUD text is drawn after restore
    // so it stays rock-steady.
    ctx.save();
    if (shakeMag > 0.3) {
      ctx.translate((Math.random() * 2 - 1) * shakeMag, (Math.random() * 2 - 1) * shakeMag);
    }
    drawBackdrop(room);
    drawPlatforms();
    drawDoors();
    drawHazards();
    drawAttacks();
    drawEnemies();
    drawDashGhosts();
    drawPlayer();
    drawHitSparks();
    drawParticles();
    drawFloaters();
    ctx.restore();
    drawDangerVignette();
    drawRoomTitle(room);
    drawBossHud();
    drawRoomBanner(room);
    drawBossIntro();
    drawCrosshair();
    // Time-based decay so the shake rings out over the same wall-clock duration on
    // 60Hz and 144Hz displays (the exponent normalizes to a 60fps step).
    shakeMag = shakeMag > 0.3 ? shakeMag * Math.pow(0.86, dt * 60) : 0;
  }

  // Critical-Stability tension: a red screen-edge vignette that breathes faster and
  // brighter as Stability approaches zero — the "lean forward" cue PT1 said was missing.
  function drawDangerVignette() {
    if (game.run.ended || isOverlayOpen()) return;
    const s = game.run.stability;
    if (s <= 0 || s >= CRITICAL_STABILITY) return;
    const severity = 1 - s / CRITICAL_STABILITY; // 0 at the threshold -> 1 near death
    const period = 260 - 120 * severity; // heartbeat quickens as it gets worse
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / period);
    const alpha = (0.12 + 0.3 * severity) * (0.55 + 0.45 * pulse);
    ctx.save();
    const g = ctx.createRadialGradient(480, 270, 200, 480, 270, 620);
    g.addColorStop(0, "rgba(255,40,60,0)");
    g.addColorStop(1, `rgba(255,40,60,${alpha.toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function drawHazards() {
    const t = performance.now() / 300;
    for (const hz of game.hazards) {
      const life = Math.max(0, hz.life / hz.maxLife);
      // 2-D floor decal centered on the hazard footprint (top-down deprecation zone).
      ctx.save();
      ctx.globalAlpha = 0.16 + life * 0.2 + Math.sin(t) * 0.05;
      ctx.fillStyle = "#ffa62b";
      ctx.fillRect(hz.x - hz.w / 2, hz.y - hz.h / 2, hz.w, hz.h);
      ctx.globalAlpha = 0.6 * life;
      ctx.strokeStyle = "#ffcf66";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(hz.x - hz.w / 2, hz.y - hz.h / 2, hz.w, hz.h);
      ctx.setLineDash([]);
      // Hazard glyph so it reads even at low alpha.
      ctx.globalAlpha = 0.5 * life;
      ctx.strokeStyle = "#ffcf66";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hz.x - 8, hz.y - 8); ctx.lineTo(hz.x + 8, hz.y + 8);
      ctx.moveTo(hz.x + 8, hz.y - 8); ctx.lineTo(hz.x - 8, hz.y + 8);
      ctx.stroke();
      ctx.restore();
    }
  }

  // In-game reticle for live mouse aim — replaces the hidden OS cursor so aiming
  // isn't blind. Only shown once the mouse is awake and combat is on screen.
  function drawCrosshair() {
    if (!mouseActive || game.run.ended || isOverlayOpen()) return;
    const m = worldMouse();
    ctx.save();
    ctx.strokeStyle = "rgba(32, 247, 238, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(32, 247, 238, 0.6)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
    ctx.moveTo(m.x - 12, m.y); ctx.lineTo(m.x - 4, m.y);
    ctx.moveTo(m.x + 4, m.y); ctx.lineTo(m.x + 12, m.y);
    ctx.moveTo(m.x, m.y - 12); ctx.lineTo(m.x, m.y - 4);
    ctx.moveTo(m.x, m.y + 4); ctx.lineTo(m.x, m.y + 12);
    ctx.stroke();
    ctx.restore();
  }

  // Soft ground shadow under a top-down entity. Drawn in the entity's local space
  // at its ground point (0,0), so the raised body reads as hovering over the floor.
  function drawGroundShadow(rx, ry) {
    ctx.save();
    ctx.globalAlpha *= 0.32;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBackdrop(room) {
    const pulse = 0.5 + Math.sin(performance.now() / 700) * 0.5;
    // Void beyond the arena walls.
    ctx.fillStyle = "#02060a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top-down floor: a filled arena plate with a soft radial light from center.
    const cx = (ARENA.x0 + ARENA.x1) / 2, cy = (ARENA.y0 + ARENA.y1) / 2;
    ctx.fillStyle = "#061217";
    ctx.fillRect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0);
    const floorGlow = ctx.createRadialGradient(cx, cy, 40, cx, cy, (ARENA.x1 - ARENA.x0) * 0.62);
    floorGlow.addColorStop(0, "rgba(32, 247, 238, 0.10)");
    floorGlow.addColorStop(0.6, "rgba(12, 40, 46, 0.06)");
    floorGlow.addColorStop(1, "rgba(0, 0, 0, 0.28)");
    ctx.fillStyle = floorGlow;
    ctx.fillRect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0);

    // Floor tile grid (both axes) — the overhead "deck plating" read.
    ctx.save();
    ctx.beginPath();
    ctx.rect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0);
    ctx.clip();
    ctx.strokeStyle = "rgba(32, 247, 238, 0.09)";
    ctx.lineWidth = 1;
    const tile = 48;
    for (let x = ARENA.x0 + tile; x < ARENA.x1; x += tile) {
      ctx.beginPath(); ctx.moveTo(x, ARENA.y0); ctx.lineTo(x, ARENA.y1); ctx.stroke();
    }
    for (let y = ARENA.y0 + tile; y < ARENA.y1; y += tile) {
      ctx.beginPath(); ctx.moveTo(ARENA.x0, y); ctx.lineTo(ARENA.x1, y); ctx.stroke();
    }
    // Center node motif — this room is a graph node seen from above.
    ctx.strokeStyle = "rgba(32, 247, 238, 0.10)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 120, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 64, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    if (game.run.incident) {
      ctx.fillStyle = `rgba(255, 66, 101, ${0.08 + pulse * 0.05})`;
      ctx.fillRect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0);
      drawIncidentArcs(pulse);
    }
    if (featureFlagActive()) {
      ctx.fillStyle = "rgba(70, 255, 131, 0.08)";
      ctx.fillRect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0);
      ctx.strokeStyle = "rgba(70, 255, 131, 0.64)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.strokeRect(ARENA.x0 + 6, ARENA.y0 + 6, ARENA.x1 - ARENA.x0 - 12, ARENA.y1 - ARENA.y0 - 12);
      ctx.setLineDash([]);
    }
  }

  function drawIncidentArcs(pulse) {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 207, 102, ${0.52 + pulse * 0.24})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(430 + i * 45, 170 + i * 12);
      ctx.bezierCurveTo(530, 120 + i * 20, 620, 290 - i * 14, 770, 206 + i * 17);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Arena walls — the four borders of the top-down room. Doors (Phase 4) will be
  // carved into these as glowing gaps mapped to graph routes.
  function drawPlatforms() {
    ctx.save();
    // Wall band just outside the play rect.
    const t = 10;
    ctx.strokeStyle = "#20f7ee";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#20f7ee";
    ctx.shadowBlur = 12;
    ctx.strokeRect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0);
    ctx.shadowBlur = 0;
    // Inner bevel for a bit of wall thickness.
    ctx.strokeStyle = "rgba(58, 103, 121, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(ARENA.x0 - t, ARENA.y0 - t, (ARENA.x1 - ARENA.x0) + t * 2, (ARENA.y1 - ARENA.y0) + t * 2);
    // Corner brackets — arcade console framing.
    ctx.strokeStyle = "rgba(105, 230, 255, 0.7)";
    ctx.lineWidth = 3;
    const c = 22;
    for (const [ox, oy, sx, sy] of [[ARENA.x0, ARENA.y0, 1, 1], [ARENA.x1, ARENA.y0, -1, 1], [ARENA.x0, ARENA.y1, 1, -1], [ARENA.x1, ARENA.y1, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + sy * c); ctx.lineTo(ox, oy); ctx.lineTo(ox + sx * c, oy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Glowing route-doors carved into the walls during the doors phase, each labelled
  // with its graph route. Walk into one to open its detail (see updateDoors).
  function drawDoors() {
    if (!game.doorsPhase || !game.doors.length) return;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 240);
    for (const d of game.doors) {
      // Door hue reflects the live graph state of the neighbour it leads to.
      const glow = d.conflict ? "#ff2d55" : d.risk ? "#ffa62b" : "#20f7ee";
      const edge = d.conflict ? "rgba(255,120,150," : d.risk ? "rgba(255,207,102," : "rgba(155,231,255,";
      const fill = d.conflict ? "rgba(255,45,85," : d.risk ? "rgba(255,166,43," : "rgba(32,247,238,";
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 14 + pulse * 8;
      ctx.fillStyle = `${fill}${(0.14 + 0.12 * pulse).toFixed(3)})`;
      ctx.fillRect(d.x - d.w / 2, d.y - d.h / 2, d.w, d.h);
      ctx.strokeStyle = `${edge}${(0.7 + 0.3 * pulse).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(d.x - d.w / 2, d.y - d.h / 2, d.w, d.h);
      // Outward chevron cueing "exit this way".
      ctx.beginPath();
      const a = 8;
      if (d.side === "top") { ctx.moveTo(d.x - a, d.y - 2); ctx.lineTo(d.x, d.y - 12); ctx.lineTo(d.x + a, d.y - 2); }
      else if (d.side === "bottom") { ctx.moveTo(d.x - a, d.y + 2); ctx.lineTo(d.x, d.y + 12); ctx.lineTo(d.x + a, d.y + 2); }
      else if (d.side === "left") { ctx.moveTo(d.x + 2, d.y - a); ctx.lineTo(d.x - 12, d.y); ctx.lineTo(d.x + 2, d.y + a); }
      else { ctx.moveTo(d.x - 2, d.y - a); ctx.lineTo(d.x + 12, d.y); ctx.lineTo(d.x - 2, d.y + a); }
      ctx.stroke();
      // Route label + graph-state tag, placed just inside the arena from the door.
      ctx.shadowBlur = 0;
      ctx.font = "12px 'Courier New', monospace";
      let lx = d.x, ly = d.y;
      if (d.side === "top") { ly = d.y + 24; ctx.textAlign = "center"; }
      else if (d.side === "bottom") { ly = d.y - 18; ctx.textAlign = "center"; }
      else if (d.side === "left") { lx = d.x + 16; ly = d.y + 4; ctx.textAlign = "left"; }
      else { lx = d.x - 16; ly = d.y + 4; ctx.textAlign = "right"; }
      ctx.fillStyle = "#dffbff";
      ctx.fillText(d.route.label, lx, ly);
      // Live graph-state tag under the label: NEW path / conflict / risk.
      const tag = d.newpath ? "◆ NEW PATH" : d.conflict ? "⚠ CONFLICT" : d.risk ? "△ RISKY" : "";
      if (tag) {
        ctx.font = "9px 'Courier New', monospace";
        ctx.fillStyle = d.newpath ? "#9be7a0" : d.conflict ? "#ff8098" : "#ffcf66";
        const ty = d.side === "bottom" ? ly - 12 : ly + 12;
        ctx.fillText(tag, lx, ty);
      }
      ctx.restore();
    }
  }

  function drawPlayer() {
    const p = game.player;
    ctx.save();
    // Origin at the ground point (feet-center); body is drawn raised above it,
    // top-down style, with a shadow on the floor at the origin.
    ctx.translate(p.x + p.w / 2, p.y);
    drawGroundShadow(15, 6);
    const invulnFlash = p.invulnTimer > 0 && Math.floor(p.invulnTimer * 22) % 2 === 0;
    const swingT = p.swingTimer > 0 ? 1 - p.swingTimer / (p.swingDur || 0.14) : -1;
    const moving = Math.hypot(p.vx, p.vy) > 5;
    drawResolverSprite(invulnFlash ? "#dfffee" : "#20f7ee", 1, swingT, p.swingDir || 1, p.walkPhase || 0, moving, p.aim || 0);
    ctx.restore();
  }

  // The Resolver, top-down: an upright figure whose aim wedge and blade rotate a
  // full 360 degrees toward `aim` (no left/right sprite flip). Body stays readable;
  // direction is carried by the weapon and the visor wedge, Isaac-style.
  function drawResolverSprite(color, alpha, swingT = -1, swingDir = 1, phase = 0, moving = false, aim = 0) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;

    // Legs: a small walk cycle while moving, a relaxed stance at rest.
    let legA;
    let legB;
    if (moving) { legA = Math.sin(phase) * 0.5; legB = Math.sin(phase + Math.PI) * 0.5; }
    else { legA = 0.06; legB = -0.06; }
    drawResolverLeg(color, -4, legA);
    drawResolverLeg(color, 5, legB);

    // Body bobs gently over each step.
    const bob = moving ? Math.abs(Math.sin(phase)) * -1.6 : 0;
    ctx.save();
    ctx.translate(0, bob);
    ctx.fillStyle = color;
    ctx.fillRect(-7, -34, 15, 22); // torso
    ctx.fillRect(-9, -49, 18, 14); // head
    ctx.fillRect(-5, -53, 14, 4);  // crest
    ctx.restore();

    // Aim wedge + blade both pivot about the body center toward `aim`.
    ctx.save();
    ctx.translate(0, -26 + bob);
    ctx.rotate(aim);
    ctx.fillStyle = "#dfffee";
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.lineTo(3, -4); ctx.lineTo(3, 4); ctx.closePath();
    ctx.fill(); // visor wedge pointing along aim
    drawPatchBlade(swingT, swingDir);
    ctx.restore();
    ctx.restore();
  }

  function drawResolverLeg(color, px, angle) {
    ctx.save();
    ctx.translate(px, -12);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.fillRect(-3.5, 0, 7, 15); // shin
    ctx.fillRect(-4, 13, 10, 5);  // foot
    ctx.restore();
  }

  // Blade drawn from the hand outward along +x (the caller has already rotated the
  // context to the aim direction). A swing sweeps it across the aim axis; the main
  // slash arc itself is rendered separately in drawAttacks at the true swing angle.
  function drawPatchBlade(swingT, swingDir) {
    const dir = swingDir || 1;
    ctx.save();
    ctx.translate(12, 0); // hand offset along aim
    const sweep = swingT >= 0 ? dir * (-0.9 + swingT * 1.8) : dir * -0.18;

    if (swingT >= 0) {
      // Motion smear trailing the blade tip.
      const a0 = sweep - dir * 0.7;
      ctx.strokeStyle = `rgba(223,255,238,${0.5 * (1 - swingT)})`;
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.shadowColor = "#20f7ee";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, 44, Math.min(a0, sweep), Math.max(a0, sweep));
      ctx.stroke();
    }

    ctx.rotate(sweep);
    const blade = ctx.createLinearGradient(0, 0, 44, 0);
    blade.addColorStop(0, "#20f7ee");
    blade.addColorStop(0.3, "#dfffee");
    blade.addColorStop(1, "#7aa8ff");
    ctx.shadowColor = "#20f7ee";
    ctx.shadowBlur = swingT >= 0 ? 26 : 18;
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(40, -8);
    ctx.lineTo(48, -4);
    ctx.lineTo(4, 3);
    ctx.closePath();
    ctx.fill();
    // Hilt.
    ctx.fillStyle = "#dfffee";
    ctx.fillRect(-4, -3, 10, 5);
    ctx.restore();
  }

  function drawDashGhosts() {
    for (const ghost of game.dashGhosts) {
      const t = ghost.life / ghost.maxLife;
      ctx.save();
      ctx.globalAlpha = t * 0.38;
      ctx.translate(ghost.x + game.player.w / 2, ghost.y);
      drawResolverSprite("#20f7ee", 0.72, -1, 1, 0, false, ghost.aim || 0);
      ctx.restore();
    }
  }

  function drawEnemies() {
    for (const enemy of game.enemies) {
      if (!enemy.alive) continue;
      if (enemy.boss) { drawBoss(enemy); continue; }
      const def = enemyDefs[enemy.type];
      const shielded = enemy.type === "version_conflict_half" && !enemy.exposed;
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      drawGroundShadow((enemy.w || 16) * 0.7, (enemy.w || 16) * 0.28);
      if (enemy.telegraph > 0 && !shielded) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -enemy.h / 2, enemy.w + 12, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (enemy.type === "version_conflict_half") {
        ctx.strokeStyle = shielded ? "rgba(120,130,140,0.85)" : "rgba(255,255,255,0.95)";
        ctx.lineWidth = 2;
        ctx.setLineDash(shielded ? [4, 4] : []);
        ctx.beginPath();
        ctx.arc(0, -enemy.h / 2, enemy.w + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (shielded) ctx.globalAlpha = 0.5;
      const scale = enemy.type === "memory_leak" ? 1 + (enemy.maxHp - enemy.hp) / 120 : 1;
      ctx.scale(scale, scale);
      drawEnemySprite(enemy, def);
      if (enemy.hitFlash > 0) {
        // Redraw the sprite's own shapes in white (normal compositing) so only the
        // silhouette lights up. source-atop can't mask here — drawBackdrop already
        // filled the shared canvas opaque, so it would paint a white box instead.
        ctx.globalAlpha = Math.min(1, enemy.hitFlash / 0.09);
        drawEnemySprite(enemy, def, "#ffffff");
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      ctx.fillStyle = "rgba(223,255,238,0.18)";
      ctx.fillRect(enemy.x - 22, enemy.y - enemy.h - 14, 44, 4);
      ctx.fillStyle = enemy.color || def.color;
      ctx.fillRect(enemy.x - 22, enemy.y - enemy.h - 14, 44 * Math.max(0, enemy.hp / enemy.maxHp), 4);
    }
  }

  function drawEnemySprite(enemy, def, colorOverride) {
    const color = colorOverride || enemy.color || def.color;
    const angry = enemy.telegraph > 0;
    if (enemy.type === "breaking_change") return drawBreakingChangeSprite(color, angry);
    if (enemy.type === "memory_leak") return drawMemoryLeakSprite(color, angry);
    if (enemy.type === "transitive_bug") return drawTransitiveBugSprite(color, angry);
    if (enemy.type === "version_conflict") return drawVersionConflictSprite(color, angry, enemy.seam || 0);
    if (enemy.type === "version_conflict_half") return drawVersionHalfSprite(color, angry);
    if (enemy.type === "deprecated_api") return drawDeprecatedApiSprite(color, angry);
    if (enemy.type === "dependency_cycle") return drawDependencyCycleSprite(color, angry);
    return drawRegressionSprite(color, angry);
  }

  function drawTransitiveBugSprite(color, angry) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = angry ? 20 : 10;
    ctx.beginPath();
    ctx.moveTo(0, -18); ctx.lineTo(9, -9); ctx.lineTo(0, 0); ctx.lineTo(-9, -9);
    ctx.closePath();
    ctx.fill();
    drawBugLegs(color, 12, -4);
    ctx.restore();
  }

  function drawVersionConflictSprite(color, angry, seam) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = angry ? 24 : 12;
    ctx.fillRect(-15, -26, 30, 22);
    ctx.fillRect(-9, -32, 18, 8);
    // widening central crack
    ctx.fillStyle = "#ffe0e6";
    ctx.fillRect(-1 - seam * 2, -30, 2 + seam * 4, 26);
    ctx.fillStyle = "#03070a";
    ctx.fillRect(-9, -20, 4, 5);
    ctx.fillRect(5, -20, 4, 5);
    ctx.restore();
  }

  function drawVersionHalfSprite(color, angry) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = angry ? 18 : 8;
    ctx.fillRect(-8, -18, 16, 16);
    ctx.fillRect(-5, -22, 10, 6);
    ctx.restore();
  }

  function drawDeprecatedApiSprite(color, angry) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = angry ? 22 : 11;
    ctx.fillRect(-18, -34, 36, 30);
    ctx.fillRect(-12, -42, 24, 10);
    // crumbling flakes
    ctx.fillStyle = "rgba(3,7,10,0.55)";
    ctx.fillRect(-14, -28, 7, 7);
    ctx.fillRect(6, -20, 6, 8);
    ctx.fillRect(-4, -14, 8, 6);
    // deprecation underline
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(-20, -2); ctx.lineTo(20, -2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawDependencyCycleSprite(color, angry) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = angry ? 22 : 11;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -15, 13, 0.5, Math.PI * 2);
    ctx.stroke();
    // arrowhead closing the loop
    ctx.beginPath();
    ctx.moveTo(11, -20); ctx.lineTo(15, -13); ctx.lineTo(6, -13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#03070a";
    ctx.fillRect(-6, -18, 4, 5);
    ctx.fillRect(3, -18, 4, 5);
    ctx.restore();
  }

  function drawRegressionSprite(color, angry) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = angry ? 24 : 12;
    ctx.fillRect(-16, -24, 32, 18);
    ctx.fillRect(-10, -30, 20, 8);
    ctx.fillRect(-22, -20, 6, 8);
    ctx.fillRect(16, -20, 6, 8);

    drawBugLegs(color, 18, -8);
    drawAntennae(color, 14, -28);

    ctx.fillStyle = "#03070a";
    ctx.fillRect(-7, -19, 4, 5);
    ctx.fillRect(4, -19, 4, 5);
    ctx.fillStyle = "rgba(70, 255, 131, 0.75)";
    ctx.fillRect(20, -18, 7, 2);
    ctx.fillRect(23, -13, 5, 2);
    ctx.restore();
  }

  function drawBreakingChangeSprite(color, angry) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = angry ? 28 : 15;
    ctx.fillRect(-17, -30, 34, 22);
    ctx.fillRect(-11, -36, 22, 8);
    ctx.fillRect(-24, -24, 8, 10);
    ctx.fillRect(16, -24, 8, 10);
    ctx.fillStyle = "#ff4265";
    ctx.fillRect(-20, -34, 7, 7);
    ctx.fillRect(13, -34, 7, 7);
    drawBugLegs(color, 22, -8);
    drawAntennae(color, 16, -36);
    ctx.fillStyle = "#03070a";
    ctx.fillRect(-8, -24, 5, 6);
    ctx.fillRect(4, -24, 5, 6);
    ctx.restore();
  }

  function drawMemoryLeakSprite(color, angry) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = angry ? 25 : 13;
    ctx.fillRect(-22, -38, 44, 28);
    ctx.fillRect(-15, -46, 30, 10);
    ctx.fillRect(-28, -30, 8, 13);
    ctx.fillRect(20, -30, 8, 13);
    ctx.fillStyle = "rgba(32, 247, 238, 0.45)";
    ctx.fillRect(-14, -36, 10, 24);
    ctx.fillRect(3, -42, 12, 30);
    drawBugLegs(color, 28, -10);
    drawAntennae(color, 18, -45);
    ctx.fillStyle = "#03070a";
    ctx.fillRect(-9, -31, 5, 6);
    ctx.fillRect(5, -31, 5, 6);
    ctx.restore();
  }

  // Top-down legs: splay out to both sides of the body from a vertical mid-line,
  // reading as a bug seen from above rather than a biped standing in profile.
  function drawBugLegs(color, width, midY) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        const y = midY - 7 + i * 7;
        const kneeX = side * (width * 0.6);
        ctx.beginPath();
        ctx.moveTo(side * 6, y);
        ctx.lineTo(kneeX, y - 3);
        ctx.lineTo(side * (width + 4), y + 3);
        ctx.stroke();
      }
    }
  }

  // Forward feelers, kept short so the body's top-down silhouette stays dominant.
  function drawAntennae(color, width, y) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-5, y + 4);
    ctx.lineTo(-width * 0.7, y - 6);
    ctx.moveTo(5, y + 4);
    ctx.lineTo(width * 0.7, y - 6);
    ctx.stroke();
  }

  function drawAttacks() {
    for (const slash of game.slashes) {
      const t = slash.life / slash.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.min(1, t + 0.15);
      ctx.strokeStyle = "#dfffee";
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.shadowColor = "#20f7ee";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(slash.x, slash.y, slash.range, slash.angle - slash.arc / 2, slash.angle + slash.arc / 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const shot of game.enemyShots) {
      if (shot.arc) {
        const spd = Math.hypot(shot.vx, shot.vy) || 1;
        const ux = shot.vx / spd, uy = shot.vy / spd;
        ctx.save();
        ctx.strokeStyle = "#ff6a8a";
        ctx.lineWidth = 5;
        ctx.shadowColor = "#ff2d55";
        ctx.shadowBlur = 16;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(shot.x - ux * 22, shot.y - uy * 22);
        ctx.lineTo(shot.x, shot.y);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      ctx.fillStyle = "#ffcf66";
      ctx.beginPath();
      ctx.rect(shot.x - 5, shot.y - 5, 10, 10);
      ctx.fill();
    }
  }

  function drawHitSparks() {
    for (const spark of game.hitSparks) {
      const t = spark.life / spark.maxLife;
      ctx.save();
      ctx.globalAlpha = t;
      ctx.strokeStyle = spark.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = spark.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(spark.x - 14 * t, spark.y);
      ctx.lineTo(spark.x + 14 * t, spark.y);
      ctx.moveTo(spark.x, spark.y - 14 * t);
      ctx.lineTo(spark.x, spark.y + 14 * t);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBoss(boss) {
    const def = enemyDefs[boss.type];
    const pulse = 0.5 + Math.sin(performance.now() / 260) * 0.5;
    const vulnerable = !boss.armored;
    ctx.save();
    const w = def.w;
    const h = def.h;
    // Break warning: a dashed lane from the boss toward the player, tracing where
    // the 2-D break-arc will travel (was a fixed horizontal floor lane).
    if (boss.pendingArc || boss.telegraph > 0.02) {
      const bcx = boss.x, bcy = boss.y - h / 2;
      const t = playerTarget();
      const ang = Math.atan2(t.y - bcy, t.x - bcx);
      ctx.strokeStyle = "rgba(255,45,85,0.45)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(bcx, bcy);
      ctx.lineTo(bcx + Math.cos(ang) * 900, bcy + Math.sin(ang) * 900);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.translate(boss.x, boss.y);
    drawGroundShadow(w * 0.6, w * 0.26);
    ctx.shadowColor = def.color;
    ctx.shadowBlur = vulnerable ? 34 : 16;
    ctx.fillStyle = vulnerable ? "#ffe6a0" : def.color;
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 3;
    if (boss.type === "distributed_monolith") {
      ctx.strokeStyle = "rgba(122,168,255,0.5)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(Math.cos(a) * (w / 2 + 24), -h / 2 + Math.sin(a) * (h / 2 + 18));
        ctx.stroke();
      }
      ctx.fillStyle = vulnerable ? "#ffe6a0" : def.color;
      ctx.beginPath();
      ctx.ellipse(0, -h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * (w / 2);
        const y = -h / 2 + Math.sin(a) * (h / 2);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a1140";
      for (let i = 0; i < 3; i += 1) ctx.fillRect(-14, -h / 2 - 6 + i * 10, 28, 4);
    }
    const ringColor = vulnerable ? `rgba(255,230,160,${0.5 + pulse * 0.4})` : "rgba(200,220,255,0.55)";
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = vulnerable ? 3 : 2;
    ctx.beginPath();
    ctx.arc(0, -h / 2, w / 2 + (vulnerable ? 10 + pulse * 4 : 6), 0, Math.PI * 2);
    ctx.stroke();
    if (boss.telegraph > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -h / 2, w / 2 + 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBossHud() {
    const boss = game.boss;
    if (!boss || !boss.alive) return;
    const def = enemyDefs[boss.type];
    const frac = Math.max(0, boss.hp / boss.maxHp);
    const bx = 200;
    const bw = 560;
    const by = 42;
    ctx.save();
    ctx.fillStyle = "rgba(3,10,14,0.82)";
    ctx.fillRect(bx - 3, by - 3, bw + 6, 18);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(bx, by, bw, 12);
    ctx.fillStyle = def.color;
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(bx, by, bw * frac, 12);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#dfffee";
    ctx.font = "12px Courier New";
    ctx.textAlign = "center";
    const phase = def.phases[boss.phaseIndex]?.name || "";
    const state = boss.armored ? "ARMORED — wait for the window" : "VULNERABLE — strike now";
    ctx.fillText(`${def.name.toUpperCase()}  ·  ${phase}  ·  ${state}`, bx + bw / 2, by - 6);
    ctx.textAlign = "left";
    ctx.restore();
  }

  function drawBossIntro() {
    if (!game.boss || game.bossIntroTimer <= 0) return;
    const def = enemyDefs[game.boss.type];
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.bossIntroTimer / 1.0 + 0.1);
    ctx.fillStyle = "rgba(3,8,12,0.85)";
    ctx.fillRect(150, 150, 660, 122);
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(150, 150, 660, 122);
    ctx.fillStyle = def.color;
    ctx.font = "12px Courier New";
    ctx.fillText("ADAPTIVE BOSS", 176, 176);
    ctx.fillStyle = "#dfffee";
    ctx.font = "26px Courier New";
    ctx.fillText(def.name.toUpperCase(), 176, 208);
    ctx.fillStyle = "#7ccfc4";
    ctx.font = "12px Courier New";
    const snap = game.run.bossScoreSnapshot;
    if (snap) ctx.fillText(`upgrade pressure ${snap.major} vs coupling ${snap.monolith} (threshold ${snap.threshold})`, 176, 232);
    ctx.fillText((BOSS_INTROS[game.boss.type] || "").slice(0, 74), 176, 252);
    ctx.restore();
  }

  function drawRoomTitle(room) {
    // The room NAME now lives only in the fading intro banner (drawRoomBanner), so it no
    // longer sits permanently behind the top-left HUD. Only live combat status stays here,
    // centered up top and dropped below the boss bar when one is present — clear of the HUD.
    void room;
    ctx.save();
    ctx.textAlign = "center";
    let y = game.boss ? 84 : 34;
    if (game.run.incident) {
      ctx.fillStyle = "#ff4265";
      ctx.font = "16px Courier New";
      ctx.fillText(`INCIDENT: ${game.run.incident.name}`, 480, y);
      y += 22;
    }
    if (featureFlagActive()) {
      ctx.fillStyle = "#46ff83";
      ctx.font = "16px Courier New";
      ctx.fillText(`FLAGGED OFF: ${Math.ceil(game.featureFlagTimer)}s`, 480, y);
    }
    ctx.restore();
  }

  // Word-wrap `text` to fit `maxWidth` at the ctx's current font. Used for banner copy.
  function wrapText(text, maxWidth) {
    const words = String(text).split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  // Describe how the installed build changes the FIGHT, in felt terms, listing only the
  // combat stats that differ from the base loadout (base values mirror run-state.js).
  // This is what PT1 Q4 was missing: the player could see their identity but not name one
  // way the package changed combat.
  function combatLoadoutText(run) {
    const s = run.stats;
    const parts = [];
    if (s.damage !== 10) parts.push(`hits ${s.damage > 10 ? "harder" : "softer"} (${s.damage})`);
    if (s.fireRate !== 0.25) parts.push(`swings ${s.fireRate < 0.25 ? "faster" : "slower"} (${(0.25 / s.fireRate).toFixed(2)}×)`);
    if (s.speed !== 250) parts.push(s.speed > 250 ? "faster feet" : "heavier feet");
    if (s.dashCooldown !== 0.55) parts.push(s.dashCooldown < 0.55 ? "quicker dash" : "slower dash");
    return parts.join(" · ");
  }

  function drawRoomBanner(room) {
    if (game.roomIntroTimer <= 0) return;
    // Hold fully readable, then fade out over the last ~40% of the intro so the announcement
    // is legible AND has cleared the combat area by the time input unlocks (which is exactly
    // when roomIntroTimer hits 0 — see update()). No lingering box over the fight.
    const t = clamp(game.roomIntroTimer / ROOM_INTRO_SECONDS, 0, 1);
    const bx = 246, by = 136, bw = 468, tx = bx + 28;
    ctx.save();
    ctx.globalAlpha = t > 0.4 ? 1 : t / 0.4;
    ctx.font = "14px Courier New";
    const subLines = wrapText(room.subtitle, bw - 56); // keep the subtitle inside the box
    const loadout = combatLoadoutText(game.run);
    const loadLines = loadout ? wrapText(`LOADOUT — ${loadout}`, bw - 56) : [];
    const bh = 74 + subLines.length * 18 + (loadLines.length ? 10 + loadLines.length * 18 : 0);
    ctx.fillStyle = "rgba(3, 14, 17, 0.86)";
    ctx.strokeStyle = "rgba(93, 255, 235, 0.72)";
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = "#20f7ee";
    ctx.font = "14px Courier New";
    ctx.fillText(`LOCUS ${game.run.roomsVisited.length}`, tx, by + 32);
    ctx.fillStyle = "#dfffee";
    ctx.font = "28px Courier New";
    ctx.fillText(room.name.toUpperCase(), tx, by + 62);
    ctx.fillStyle = "#7ccfc4";
    ctx.font = "14px Courier New";
    subLines.forEach((line, i) => ctx.fillText(line, tx, by + 86 + i * 18));
    if (loadLines.length) {
      const ly = by + 86 + subLines.length * 18 + 10;
      ctx.fillStyle = "#9be7a0"; // green, matching the build/reward cues
      loadLines.forEach((line, i) => ctx.fillText(line, tx, ly + i * 18));
    }
    ctx.restore();
  }

  function worldMouse() {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((mouse.x - rect.left) / rect.width) * canvas.width,
      y: ((mouse.y - rect.top) / rect.height) * canvas.height,
    };
  }

  function angleDiff(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  }

  // Controller support for the package carousel. Scoped to the choice overlay for
  // now (combat stays keyboard/mouse); no-ops gracefully when no pad is present.
  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (let i = 0; i < pads.length; i += 1) { if (pads[i]) { pad = pads[i]; break; } }
    if (ui.choicePad) ui.choicePad.classList.toggle("on", !!pad);
    const choosing = !ui.choiceOverlay.classList.contains("hidden");
    const reporting = !ui.reportOverlay.classList.contains("hidden");
    if (!pad || (!choosing && !reporting)) { padPrev.buttons = pad ? pad.buttons.map((b) => b.pressed) : []; return; }
    const edge = (n) => {
      const pressed = !!(pad.buttons[n] && pad.buttons[n].pressed);
      return pressed && !(padPrev.buttons && padPrev.buttons[n]);
    };
    if (reporting) {
      // Same restart-lock as the keyboard so a held/reflexive button can't skip the report.
      if (edge(0) && performance.now() - runEndedAt > RESTART_LOCK_MS) resetGame(); // Cross = new run
      padPrev.buttons = pad.buttons.map((b) => b.pressed);
      return;
    }
    if (edge(0)) commitPackage();                                    // Cross = INSTALL
    if (edge(3)) toggleInspect();                                    // Triangle = READ
    if (edge(1) && packageInspecting) toggleInspect();               // Circle = BACK (collapse)
    if (edge(14) || edge(4)) setPackageFocus(focusedIndex - 1, -1);  // D-pad left / L1
    if (edge(15) || edge(5)) setPackageFocus(focusedIndex + 1, 1);   // D-pad right / R1
    const x = pad.axes[0] || 0;
    const t = performance.now();
    if (x < -0.5) { if (t - padStickHold.l > 220) { setPackageFocus(focusedIndex - 1, -1); padStickHold.l = t; } } else padStickHold.l = 0;
    if (x > 0.5) { if (t - padStickHold.r > 220) { setPackageFocus(focusedIndex + 1, 1); padStickHold.r = t; } } else padStickHold.r = 0;
    padPrev.buttons = pad.buttons.map((b) => b.pressed);
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    pollGamepad();
    update(dt);
    draw(dt);
    requestAnimationFrame(frame);
  }

  function dontstartSideErrorRail() {
    const rail = document.querySelector(".side-error-rail");
    if (!rail) return;
    const rows = [...rail.querySelectorAll(".side-error-lines span")];
    const prompt = rail.querySelector(".side-error-prompt");
    const feed = [
      "0xDEADBEEF 000 0100 SEGFAULT (SIGSEGV) at PTR exception *0A000000 BITBLT_23ff",
      "NULL_POINTER Exception *0A000000 UID0 H4X0R:'kill -9' stacktrace=5m45h3d1",
      "0xC4F3B4B3 0x0031337 core dump heap walk unstable module=libglitch_v3",
      "CRITICAL_ERROR![STACK_5m45h3d1] unsafe branch ",
      "0xBADC0DE compiler phase drifted UID=7f3a9c11 edge=edge_app_runtime",
      "WARN 0xFEEDFACE rollback shard refused PATCH_v2 scope=runtime/std",
      "PANIC 0000:0101 dependency ghost wrote through hidden_ptr=0xA113CE",
      "AUDIT_FLAG SIGBUS vendor portal timeout waiver_id=SEC-EXC-4419",
    ];
    const glitchChars = "01ABCDEF#*_/:!?[]{}<>-";
    let cursor = 0;

    function lineAt(index) {
      return feed[(cursor + index) % feed.length];
    }

    function corrupt(text) {
      const chars = [...text];
      const count = 2 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i += 1) {
        const idx = Math.floor(Math.random() * chars.length);
        chars[idx] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }
      return chars.join("");
    }

    function render(glitch) {
      rows.forEach((row, index) => {
        const text = lineAt(index);
        if(index !== 3) {
          row.textContent = glitch && Math.random() > 0.36 ? corrupt(text) : text;
        } else {
          row.textContent = glitch && Math.random() > 0.36 ? corrupt(text).slice(0, 30) : text;
        }
      });
      if (prompt) prompt.textContent = Math.random() > 0.88 ? "#_" : ">";
    }

    render(false);
    window.setInterval(() => {
      cursor = (cursor + 1) % feed.length;
      render(false);
    }, 980);
    window.setInterval(() => render(true), 145);
  }

function startSideErrorRail() {
  const rail = document.querySelector(".side-error-rail");
  if (!rail) return;
  const rows = [...rail.querySelectorAll(".side-error-lines span")];
  const prompt = rail.querySelector(".side-error-prompt");

  const feed = [
    "0xDEADBEEF 000 0100 SEGFAULT (SIGSEGV) at PTR exception *0A000000 BITBLT_23ff",
    "NULL_POINTER Exception *0A000000 UID0 H4X0R:'kill -9' stacktrace=5m45h3d1",
    "0xC4F3B4B3 0x0031337 core dump heap walk unstable module=libglitch_v3",
    "CRITICAL_ERROR![STACK_5m45h3d1] unsafe branch ",
    "0xBADC0DE compiler phase drifted UID=7f3a9c11 edge=edge_app_runtime",
    "WARN 0xFEEDFACE rollback shard refused PATCH_v2 scope=runtime/std",
    "PANIC 0000:0101 dependency ghost wrote through hidden_ptr=0xA113CE",
    "AUDIT_FLAG SIGBUS vendor portal timeout waiver_id=SEC-EXC-4419",
  ];

  const glitchChars = "01ABCDEF#*_/:!?[]{}<>-";
  let cursor = 0;

  // Track physical screen glitch state
  const rowGlitchStates = new Array(rows.length).fill(false);

  function lineAt(index) {
    return feed[(cursor + index) % feed.length];
  }

  function corrupt(text) {
    const chars = [...text];
    const count = 2 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i += 1) {
      const idx = Math.floor(Math.random() * chars.length);
      chars[idx] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
    }
    return chars.join("");
  }

  // Unified render loop
  function drawScreen() {
    rows.forEach((row, index) => {
      const rawText = lineAt(index);
      
      const text = index === 3 ? rawText.slice(0, 40) : rawText;

      // Hardware fault simulation
      if (rowGlitchStates[index]) {
        row.textContent = corrupt(text);
      } else {
        row.textContent = text;
      }
    });

    if (prompt) prompt.textContent = Math.random() > 0.88 ? "#_" : ">";
  }

  const logPacing = [1000, 150, 200, 1500, 2000, 120, 300];
  let paceIdx = 0;

  function feedNextLog() {
    cursor = (cursor + 1) % feed.length;
    drawScreen();

    const nextDelay = logPacing[paceIdx];
    paceIdx = (paceIdx + 1) % logPacing.length;

    window.setTimeout(feedNextLog, nextDelay);
  }

  // --- LOOP 2: Screen Hardware Glitcher (Fixed setInterval) ---
  window.setInterval(() => {
    rowGlitchStates.forEach((_, index) => {
      rowGlitchStates[index] = Math.random() > 0.64;
    });
    
    drawScreen();
  }, 145);

  // Initial Boot
  feedNextLog();
}



  function updateMuteButton() {
    if (!ui.muteButton) return;
    const muted = audio.isMuted();
    ui.muteButton.textContent = muted ? "SOUND OFF" : "SOUND ON";
    ui.muteButton.setAttribute("aria-pressed", muted ? "true" : "false");
  }

  function wakeAudio() {
    if (!audio.isMuted()) audio.start();
  }
  window.addEventListener("keydown", wakeAudio, { once: true });
  window.addEventListener("mousedown", wakeAudio, { once: true });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      event.preventDefault();
    }
    // Package carousel captures navigation before it can leak into player movement.
    if (!ui.choiceOverlay.classList.contains("hidden")) {
      if (event.repeat) return; // discrete steps only; no machine-gunned cues on held keys
      if (key === "arrowleft" || key === "a") { setPackageFocus(focusedIndex - 1, -1); return; }
      if (key === "arrowright" || key === "d") { setPackageFocus(focusedIndex + 1, 1); return; }
      if (key === "enter" || key === " ") { commitPackage(); return; }
      if (key === "i" || key === "arrowup") { toggleInspect(); return; }
      if ((key === "escape" || key === "backspace") && packageInspecting) { toggleInspect(); return; }
    }
    // Route (locus) selection — keyboard parity with the carousel so the mouse is never
    // required (which was also silently waking combat mouse-aim). Cards stack vertically.
    if (!ui.routeOverlay.classList.contains("hidden")) {
      if (event.repeat) return;
      // During the doors phase a single door's detail is showing — Escape backs out
      // to the arena so the player can walk to a different door.
      if (key === "escape" && game.doorsPhase) { closeRoutePreview(); return; }
      if (["arrowup", "arrowleft", "w", "a"].includes(key)) { setRouteFocus(routeFocus - 1); return; }
      if (["arrowdown", "arrowright", "s", "d"].includes(key)) { setRouteFocus(routeFocus + 1); return; }
      if (key === "enter" || key === " ") { const route = pendingRoutes[routeFocus]; if (route) selectRoute(route); return; }
    }
    // Incident triage — same keyboard model.
    if (ui.incidentOverlay && !ui.incidentOverlay.classList.contains("hidden")) {
      if (event.repeat) return;
      if (["arrowup", "arrowleft", "w", "a"].includes(key)) { setIncidentFocus(incidentFocus - 1); return; }
      if (["arrowdown", "arrowright", "s", "d"].includes(key)) { setIncidentFocus(incidentFocus + 1); return; }
      if (key === "enter" || key === " ") { const res = incidentResolutions[incidentFocus]; if (res) resolveIncident(res); return; }
    }
    // End screen: consume ALL gameplay keys so a reflexive strike/movement — or a swing the
    // hand finishes a beat after death — can't bleed through. Only Enter restarts, and only
    // after a short lock, so the player actually reads the report/questions first. The mouse
    // still answers the feel check and the NEW RUN button.
    if (!ui.reportOverlay.classList.contains("hidden")) {
      if (key === "enter" && performance.now() - runEndedAt > RESTART_LOCK_MS) resetGame();
      return;
    }
    if (key === "m") {
      audio.toggleMute();
      updateMuteButton();
      return;
    }
    if (key === "escape" && !ui.graphOverlay.classList.contains("hidden")) {
      closeGraphOverlay();
      return;
    }
    if (key === "g" && ui.reportOverlay.classList.contains("hidden") && ui.routeOverlay.classList.contains("hidden")) {
      event.preventDefault();
      if (ui.graphOverlay.classList.contains("hidden")) {
        openGraphOverlay();
      } else {
        closeGraphOverlay();
      }
      return;
    }
    if (key === "f" && !isOverlayOpen()) {
      event.preventDefault();
      useFeatureFlag();
      return;
    }
    if (key === "r" && !isOverlayOpen()) {
      event.preventDefault();
      useRollback();
      return;
    }
    if (key === "c" && !isOverlayOpen()) {
      event.preventDefault();
      useCircuitBreaker();
      return;
    }
    keys.add(key);
  });
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  canvas.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    // Wake mouse control on deliberate movement (threshold filters trackpad jitter),
    // unless the player has taken explicit control via the right-click toggle. Never wake
    // while an overlay is up: moving the mouse to (reluctantly) read a menu must not flip
    // combat into mouse-aim and swap the hidden cursor for a crosshair.
    if (!mouseActive && !mouseManual && !isOverlayOpen()) {
      mouseMoveAccum += Math.abs(event.movementX || 0) + Math.abs(event.movementY || 0);
      if (mouseMoveAccum > 8) mouseActive = true;
    }
  });
  canvas.addEventListener("mousedown", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    if (event.button === 0) mouse.down = true; // only left button strikes
  });
  window.addEventListener("mouseup", () => (mouse.down = false));
  // Right-click toggles mouse aim on/off — the explicit path back to keyboard-only
  // (and out of an accidental wake). preventDefault suppresses the browser menu.
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    mouseActive = !mouseActive;
    mouseManual = true;
    mouseMoveAccum = 0;
  });
  ui.restartButton.addEventListener("click", resetGame);
  ui.reportRestartButton.addEventListener("click", resetGame);
  if (ui.muteButton) {
    ui.muteButton.addEventListener("click", () => {
      audio.toggleMute();
      updateMuteButton();
    });
  }
  updateMuteButton();
  ui.choiceChevL.addEventListener("click", () => setPackageFocus(focusedIndex - 1, -1));
  ui.choiceChevR.addEventListener("click", () => setPackageFocus(focusedIndex + 1, 1));
  ui.choiceArrowL.addEventListener("click", () => setPackageFocus(focusedIndex - 1, -1));
  ui.choiceArrowR.addEventListener("click", () => setPackageFocus(focusedIndex + 1, 1));
  ui.choiceStage.addEventListener("wheel", (event) => {
    event.preventDefault();
    const step = event.deltaY > 0 ? 1 : -1;
    setPackageFocus(focusedIndex + step, step);
  }, { passive: false });
  ui.graphInspectButton.addEventListener("click", openGraphOverlay);
  ui.graphSvg.addEventListener("click", openGraphOverlay);
  ui.graphCloseButton.addEventListener("click", closeGraphOverlay);
  ui.pauseGraphSvg.addEventListener("click", (event) => {
    const target = event.target.closest("[data-entity-type]");
    if (!target) return;
    selectedGraphEntity = {
      type: target.dataset.entityType,
      id: target.dataset.entityId,
    };
    renderPauseGraph();
  });

  // Read-only debug snapshot for automated playtesting (harmless in normal play).
  namespace.debug = {
    state() {
      return {
        room: game.currentRoom?.id,
        stability: Math.round(game.run.stability),
        ended: game.run.ended,
        player: { x: game.player.x, y: game.player.y, aim: game.player.aim },
        enemies: game.enemies.filter((e) => e.alive).map((e) => ({ type: e.type, x: e.x, y: e.y, hp: e.hp, telegraph: e.telegraph, boss: !!e.boss, armored: !!e.armored })),
        canvasWidth: canvas.width,
        mouseActive,
        overlayOpen: isOverlayOpen(),
        doorsPhase: !!game.doorsPhase,
        doors: (game.doors || []).map((d) => ({ label: d.route.label, side: d.side, node: d.node, x: d.x, y: d.y, newpath: !!d.newpath, conflict: !!d.conflict, risk: !!d.risk })),
        locusNode: game.doorsPhase ? resolveLocationNode() : undefined,
        graph: { nodes: game.run.graph.nodes.length, edges: game.run.graph.edges.length },
        // ms since the run ended (report opened); null while a run is live. Lets tooling
        // reason about the restart input-lock deterministically.
        sinceEnd: game.run.ended ? Math.round(performance.now() - runEndedAt) : null,
      };
    },
    // Tier-2 feel telemetry (fun-tuneup-protocol.md): the impact-event ring buffer, for
    // headless/scripted measurement of impact-per-kill, dead-air, and player-hit cadence.
    feel() {
      return (game.feelLog || []).slice();
    },
    // Live feel-knob tuning (see FEEL near the top of this file). Merge a patch and read
    // back the result, so the audit's "needs a human run" experiments can be auditioned
    // mid-run without a rebuild, e.g. DepHell.debug.tune({ swingCommit: 0.55 }).
    tune(patch) {
      if (patch && typeof patch === "object") Object.assign(FEEL, patch);
      return { ...FEEL };
    },
    // Scripted-input channel (fun-tuneup-protocol.md) so an automated proxy tester can
    // COMMIT to movement/attack/dash — not just observe — and drive deterministic runs.
    // Drives the same `keys` set the real keyboard fills, so it exercises the true loop.
    input: {
      hold(key) { keys.add(String(key).toLowerCase()); },
      release(key) { keys.delete(String(key).toLowerCase()); },
      set(list) { keys.clear(); (list || []).forEach((k) => keys.add(String(k).toLowerCase())); },
      clear() { keys.clear(); mouse.down = false; },
      attack(on) { if (on === false) keys.delete(" "); else keys.add(" "); },
    },
  };

  const ptBadge = document.querySelector("#ptBadge");
  if (ptBadge) ptBadge.textContent = `PLAYTESTER BUILD · ${BUILD_TAG}`;

  startSideErrorRail();
  resetGame();
  requestAnimationFrame(frame);
})(window.DepHell = window.DepHell || {});
