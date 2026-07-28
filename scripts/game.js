(function bootstrapGame(namespace) {
  const { FLOOR_Y, GROUND_TOP, ROOM_INTRO_SECONDS } = namespace.constants;
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
  let lastTime = performance.now();
  let roomClearTimer = 0;
  let choiceShown = false;
  let roomClearedLogged = false;
  let pendingRoutes = [];
  let activeRouteChoice = null;
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
  let game;

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
    audio.setState({
      stability: run.stability,
      debt: run.techDebt,
      incident: run.incident ? run.incident.id : null,
      boss: run.selectedBoss || (game.boss ? game.boss.id : null),
      combat: game.enemies ? game.enemies.some((enemy) => enemy.alive) : false,
    });
  }

  function resetGame() {
    keys.clear();
    mouse.down = false;
    game = {
      run: makeInitialRunState(),
      player: { x: 170, y: FLOOR_Y, w: 24, h: 42, vx: 0, vy: 0, facing: 1, attackTimer: 0, dashTimer: 0, invulnTimer: 0, swingTimer: 0, swingDir: 1 },
      slashes: [],
      enemyShots: [],
      hitSparks: [],
      particles: [],
      floaters: [],
      dashGhosts: [],
      enemies: [],
      hazards: [],
      pendingSpawns: [],
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
    game.player.y = FLOOR_Y;
    game.slashes.length = 0;
    game.enemyShots.length = 0;
    game.hazards.length = 0;
    game.pendingSpawns.length = 0;
    game.boss = null;
    game.bossIntroTimer = 0;
    game.vcReconciled = false;
    game.enemies = room.enemies.map((spawn, idx) => makeEnemy(spawn, idx));
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
      const enemy = makeEnemy({ type: spawn.type, x: spawn.overrides.x ?? game.player.x, y: FLOOR_Y }, idx);
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
  function addHazard(x, opts = {}) {
    game.hazards.push({ x, y: FLOOR_Y, w: opts.w ?? 70, h: opts.h ?? 16, life: opts.life ?? 6, maxLife: opts.life ?? 6, dps: opts.dps ?? 4, source: opts.source || "hazard", tickTimer: 0 });
  }

  function updateHazards(dt) {
    const tested = game.run.mitigations.includes("test_coverage");
    for (const hz of game.hazards) {
      hz.life -= dt;
      const p = game.player;
      if (rectsOverlap(p.x - p.w / 2, p.y - p.h, p.w, p.h, hz.x - hz.w / 2, hz.y - 6, hz.w, hz.h)) {
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
    for (const res of inc.resolutions) {
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
      ui.incidentChoices.appendChild(button);
    }
    ui.incidentOverlay.classList.remove("hidden");
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
    applyPackageEffects(run, pkg, logEvent);
    activePreviewPackage = null;
    offeredList = [];
    packageInspecting = false;
    committingPackage = false;
    ui.choiceStage.classList.remove("inspecting");
    renderAllUi();
    ui.choiceOverlay.classList.add("hidden");
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

  function showRouteChoice(routes) {
    if (!ui.routeOverlay.classList.contains("hidden")) return;
    pendingRoutes = routes;
    activeRouteChoice = routes[0];
    ui.routePrompt.textContent = `${game.currentRoom.name} cleared. Choose the next graph exit.`;
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
      button.addEventListener("click", () => selectRoute(route));
      button.addEventListener("mouseenter", () => previewRoute(route));
      button.addEventListener("focus", () => previewRoute(route));
      ui.routeChoices.appendChild(button);
    }
    ui.routeOverlay.classList.remove("hidden");
    renderRouteGraph();
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
      game.roomIntroTimer -= dt;
      return;
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

  function updatePlayer(dt) {
    const p = game.player;
    const left = keys.has("a") || keys.has("arrowleft");
    const right = keys.has("d") || keys.has("arrowright");
    const jump = keys.has("w") || keys.has("arrowup");
    const down = keys.has("s") || keys.has("arrowdown");
    const axis = (right ? 1 : 0) - (left ? 1 : 0);
    p.vx = axis * game.run.stats.speed;
    if (axis) p.facing = axis;
    if (jump && p.y >= FLOOR_Y) p.vy = -410;
    if (down && p.y < FLOOR_Y) p.vy += 780 * dt;
    if ((keys.has("shift") || keys.has("shiftleft")) && p.dashTimer <= 0) {
      game.dashGhosts.push({ x: p.x, y: p.y, facing: p.facing, life: 0.18, maxLife: 0.18 });
      p.x += p.facing * 112;
      p.dashTimer = game.run.stats.dashCooldown;
      p.invulnTimer = Math.max(p.invulnTimer, 0.32); // dash i-frames: dodge through attacks
      sfx("dash");
    }
    p.vy += 920 * dt;
    p.x = clamp(p.x + p.vx * dt, 92, 900);
    p.y = Math.min(FLOOR_Y, p.y + p.vy * dt);
    if (p.y >= FLOOR_Y) p.vy = 0;
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
    const aim = worldMouse();
    const angle = Math.atan2(aim.y - (p.y - 18), aim.x - (p.x + p.w / 2));
    p.facing = Math.cos(angle) >= 0 ? 1 : -1;
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
          continue;
        }
        if (enemy.boss && enemy.armored) {
          addHitSpark(enemyCenterX, enemyCenterY, "#6b7280");
          spawnFloater(enemyCenterX, enemyCenterY - 8, "ARMORED", "#9aa4ad");
          sfx("bossHit");
          addShake(1.2);
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
            defeatBoss(enemy);
            break;
          }
          setHitStop(0.06);
          addShake(5);
          spawnBurst(enemyCenterX, enemyCenterY, enemyDefs[enemy.type].color, 12);
          const spawnedReplacement = onEnemyDeath(enemy);
          enemy.alive = false;
          logEvent("enemy_defeated", `${enemy.name} patched out.`);
          sfx("enemyDeath");
          void spawnedReplacement;
        } else {
          setHitStop(0.03);
          addShake(2.5);
          if (!enemy.boss) {
            const dir = Math.sign(enemy.x - game.player.x) || 1;
            enemy.knockbackVx = dir * 160;
          }
        }
      }
    }
    flushPendingSpawns();
    game.slashes = game.slashes.filter((slash) => slash.life > 0);
    game.enemyShots = game.enemyShots.filter((shot) => shot.life > 0 && shot.x > -20 && shot.x < 1000);
  }

  function updateEnemies(dt) {
    for (const enemy of game.enemies) {
      if (!enemy.alive) continue;
      if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      if (enemy.knockbackVx) {
        enemy.x = clamp(enemy.x + enemy.knockbackVx * dt, 40, 920);
        enemy.knockbackVx *= Math.pow(0.82, dt * 60);
        if (Math.abs(enemy.knockbackVx) < 4) enemy.knockbackVx = 0;
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
    const p = game.player;
    if (enemy.wasWindup && enemy.windupTimer <= 0 && Math.abs(p.x - enemy.x) < range + 18) {
      damagePlayer(enemy.damage, reason);
    }
    if (Math.abs(p.x - enemy.x) < range && enemy.attackTimer <= 0 && enemy.contactTimer <= 0) {
      enemy.telegraph = 0.28;
      enemy.windupTimer = 0.26;
      enemy.attackTimer = 1.5;
      enemy.contactTimer = 1.1;
    }
  }

  function rangedVolley(enemy, dt, count) {
    const p = game.player;
    if (Math.abs(p.x - enemy.x) >= 46 && enemy.attackTimer <= 0.05 && enemy.contactTimer <= 0) {
      enemy.attackTimer = featureFlagActive() ? 2.4 : 1.7;
      enemy.telegraph = 0.32;
      if (featureFlagActive() || circuitBreakerActive()) return;
      const base = Math.atan2(p.y - enemy.y, p.x - enemy.x);
      for (let i = 0; i < count; i += 1) {
        const a = base + (i - (count - 1) / 2) * 0.18;
        game.enemyShots.push({ x: enemy.x, y: enemy.y - 22, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 2.4, damage: enemy.damage, source: enemy.name });
      }
    }
  }

  function updateGenericEnemy(enemy, dt) {
    const p = game.player;
    const flagSlow = featureFlagActive() ? 0.58 : 1;
    const dir = Math.sign(p.x - enemy.x) || 1;
    const growth = enemy.type === "memory_leak" ? (enemy.maxHp - enemy.hp) * 0.5 : 0;
    enemy.x = clamp(enemy.x + dir * (enemy.speed + growth) * flagSlow * dt, 88, 900);
    tickTimers(enemy, dt);
    contactWindup(enemy, `${enemy.name} collided with active code.`);
    if (enemy.type === "breaking_change") rangedVolley(enemy, dt, 1);
  }

  // Transitive Bug — smallest thing on screen; spreads to a linked enemy, or when
  // alone infects a graph neighbour (registered risk + pin + debt).
  function updateTransitiveBug(enemy, dt) {
    const p = game.player;
    const flagSlow = featureFlagActive() ? 0.58 : 1;
    const kin = game.enemies.filter((e) => e.alive && e !== enemy && !e.boss && e.type !== "transitive_bug");
    const mate = kin.sort((a, b) => Math.abs(a.x - enemy.x) - Math.abs(b.x - enemy.x))[0] || null;
    enemy.infectTimer -= dt * flagSlow;
    tickTimers(enemy, dt);
    const chaseX = mate && enemy.infectTimer < 0.8 ? mate.x : p.x;
    const dir = Math.sign(chaseX - enemy.x) || 1;
    enemy.x = clamp(enemy.x + dir * enemy.speed * flagSlow * dt, 88, 900);
    if (enemy.infectTimer <= 0.3 && enemy.telegraph <= 0) enemy.telegraph = 0.3;
    if (enemy.infectTimer <= 0) {
      if (mate && Math.abs(mate.x - enemy.x) < 70) {
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
    const p = game.player;
    const flagSlow = featureFlagActive() ? 0.58 : 1;
    const dir = Math.sign(p.x - enemy.x) || 1;
    enemy.x = clamp(enemy.x + dir * enemy.speed * flagSlow * dt, 88, 900);
    tickTimers(enemy, dt);
    enemy.seam = 1 - enemy.hp / enemy.maxHp;
    if (!enemy.forked && enemy.hp <= enemy.maxHp * 0.5) { forkVersionConflict(enemy); return; }
    contactWindup(enemy, `${enemy.name} demanded a matching version.`);
  }

  function forkVersionConflict(enemy) {
    if (enemy.forked) return;
    enemy.forked = true;
    enemy.alive = false;
    spawnEnemy("version_conflict_half", { x: clamp(enemy.x - 20, 100, 880), variant: "v1", color: "#ff2d55", phase: 0, coexist: 0 });
    spawnEnemy("version_conflict_half", { x: clamp(enemy.x + 20, 100, 880), variant: "v2", color: "#ff8a3d", phase: Math.PI, coexist: 0 });
    const node = resolveLocationNode();
    const edge = ensureConflictEdge(node, "modern_crypto");
    applyGraphEffects([
      { op: "registerRisk", id: "version_conflict", kind: "upgrade", target: edge.id, reason: "incompatible versions forked in-flight" },
    ], "enemy:version_conflict");
    logEvent("enemy_split", "Version Conflict forked into v1 (red) and v2 (orange); they refuse to coexist.");
    sfx("conflict");
  }

  function updateVersionHalf(enemy, dt) {
    const p = game.player;
    const flagSlow = featureFlagActive() ? 0.58 : 1;
    enemy.shieldClock += dt;
    const shimHold = game.run.installedPackages.includes("compatibility_shim") && enemy.variant === "v1";
    enemy.exposed = Math.sin(enemy.shieldClock * 2.2 + enemy.phase) > 0 || featureFlagActive() || shimHold;
    enemy.telegraph = enemy.exposed ? 0.2 : 0;
    const sib = game.enemies.find((e) => e.alive && e.type === "version_conflict_half" && e !== enemy);
    let d = Math.sign(p.x - enemy.x) || 1;
    const near = sib && Math.abs(sib.x - enemy.x) < 40;
    if (near) d = Math.sign(enemy.x - sib.x) || d; // repel — semver incompatibility
    enemy.x = clamp(enemy.x + d * enemy.speed * flagSlow * dt, 88, 900);
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
    const p = game.player;
    const flagSlow = featureFlagActive() ? 0.58 : 1;
    const dir = Math.sign(p.x - enemy.x) || 1;
    enemy.x = clamp(enemy.x + dir * enemy.speed * flagSlow * dt, 88, 900);
    enemy.zoneTimer -= dt;
    enemy.lifeClock += dt;
    tickTimers(enemy, dt);
    if (enemy.zoneTimer <= 0.4 && !enemy.stamping) { enemy.stamping = true; enemy.stampX = enemy.x; enemy.telegraph = 0.4; }
    if (enemy.zoneTimer <= 0) {
      addHazard(enemy.stampX ?? enemy.x, { dps: 4, life: 6, source: enemy.name });
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
    const p = game.player;
    const flagSlow = featureFlagActive() ? 0.58 : 1;
    const gap = enemy.x - p.x;
    if (Math.abs(gap) < 70) enemy.dir = Math.sign(gap) || 1;
    else if (Math.abs(gap) > 210) enemy.dir = -(Math.sign(gap) || 1);
    enemy.x = clamp(enemy.x + enemy.dir * enemy.speed * flagSlow * dt, 88, 900);
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
      game.enemies = game.enemies.map((e) => (e.type === "breaking_change" ? makeEnemy({ type: "memory_leak", x: e.x, y: FLOOR_Y }, e.id) : e));
    }
    const boss = makeEnemy({ type: bossId, x: 680, y: FLOOR_Y }, `boss`);
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

    boss.x += Math.sign(680 - boss.x) * def.speed * 0.4 * dt;
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
        spawnEnemy(phase.summon, { x: p.x > 480 ? 210 : 760 });
        logEvent("boss_summon", `${def.name} summoned ${enemyDefs[phase.summon].name}.`);
      }
    }

    tickTimers(boss, dt);
    contactWindup(boss, `${def.name} rolled over active code.`, 70);
  }

  function launchArc(boss, def) {
    const p = game.player;
    const dirX = Math.sign(p.x - boss.x) || -1;
    const damage = Math.round(def.damage * 0.7);
    game.enemyShots.push({ x: boss.x, y: FLOOR_Y - 26, vx: dirX * 300, vy: 0, life: 3, damage, source: `${def.name} break`, arc: true });
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
    const still = Math.abs(p.vx) < 1 && p.y >= FLOOR_Y && game.roomIntroTimer <= 0;
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
    advanceFromRoom(room);
  }

  function completeRoom(room) {
    roomClearedLogged = true;
    // Clearing a combat room patches a little Stability back — sustain for the run.
    if (room.enemies && room.enemies.length && !room.bossRoom && game.run.stability > 0) {
      const before = Math.round(game.run.stability);
      game.run.stability = Math.min(100, game.run.stability + 8);
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
    if (routes.length === 1) {
      selectRoute(routes[0]);
      return;
    }
    showRouteChoice(routes);
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
    sfx("playerHit");
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
    logEvent(victory ? "run_won" : "run_failed", cause);
    renderReport(victory, cause);
    ui.reportOverlay.classList.remove("hidden");
  }

  function renderReport(victory, cause) {
    const run = game.run;
    const installed = installedPackageNames(run);
    const conflict = findActiveConflict();
    const identity = buildIdentity(run);
    ui.reportKicker.textContent = victory ? "RELEASE REPORT" : "MINI POSTMORTEM";
    ui.reportTitle.textContent = victory ? "Release candidate shipped." : "Build failed.";
    ui.reportBody.innerHTML = victory ? renderReleaseReport(run, installed, identity, conflict) : renderFailureReport(run, installed, identity, conflict, cause);
  }

  function renderAllUi() {
    const run = game.run;
    ui.stabilityBar.style.width = `${run.stability}%`;
    ui.stabilityValue.textContent = `${Math.round(run.stability)}%`;
    ui.observabilityBar.style.width = `${(run.observability / 5) * 100}%`;
    ui.observabilityValue.textContent = `${run.observability}/5`;
    ui.debtBar.style.width = `${Math.min(100, run.techDebt)}%`;
    ui.debtValue.textContent = String(run.techDebt);
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
    drawHazards();
    drawAttacks();
    drawEnemies();
    drawDashGhosts();
    drawPlayer();
    drawHitSparks();
    drawParticles();
    drawFloaters();
    ctx.restore();
    drawRoomTitle(room);
    drawBossHud();
    drawRoomBanner(room);
    drawBossIntro();
    // Time-based decay so the shake rings out over the same wall-clock duration on
    // 60Hz and 144Hz displays (the exponent normalizes to a 60fps step).
    shakeMag = shakeMag > 0.3 ? shakeMag * Math.pow(0.86, dt * 60) : 0;
  }

  function drawHazards() {
    const t = performance.now() / 300;
    for (const hz of game.hazards) {
      const life = Math.max(0, hz.life / hz.maxLife);
      ctx.save();
      ctx.globalAlpha = 0.18 + life * 0.22 + Math.sin(t) * 0.05;
      ctx.fillStyle = "#ffa62b";
      ctx.fillRect(hz.x - hz.w / 2, GROUND_TOP - hz.h, hz.w, hz.h);
      ctx.globalAlpha = 0.6 * life;
      ctx.strokeStyle = "#ffcf66";
      ctx.lineWidth = 2;
      ctx.strokeRect(hz.x - hz.w / 2, GROUND_TOP - hz.h, hz.w, hz.h);
      ctx.restore();
    }
  }

  function drawBackdrop(room) {
    const pulse = 0.5 + Math.sin(performance.now() / 700) * 0.5;
    ctx.fillStyle = "#03070a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow = ctx.createRadialGradient(520, 230, 80, 520, 230, 520);
    glow.addColorStop(0, "rgba(32, 247, 238, 0.08)");
    glow.addColorStop(0.55, "rgba(8, 28, 32, 0.08)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(32, 247, 238, 0.11)";
    ctx.lineWidth = 1;
    for (let x = 92; x < canvas.width; x += 86) {
      ctx.beginPath();
      ctx.moveTo(x, 96);
      ctx.lineTo(x, 438);
      ctx.stroke();
    }

    drawArchitectureBlocks();
    drawBinaryColumns();
    drawRightServiceFrame();

    ctx.strokeStyle = "rgba(32, 247, 238, 0.08)";
    for (let y = 132; y < 418; y += 14) {
      ctx.beginPath();
      ctx.moveTo(128, y);
      ctx.lineTo(906, y);
      ctx.stroke();
    }

    if (game.run.incident) {
      ctx.fillStyle = `rgba(255, 66, 101, ${0.08 + pulse * 0.05})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawIncidentArcs(pulse);
    }
    if (featureFlagActive()) {
      ctx.fillStyle = "rgba(70, 255, 131, 0.08)";
      ctx.fillRect(86, 130, 830, 228);
      ctx.strokeStyle = "rgba(70, 255, 131, 0.64)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.strokeRect(92, 136, 818, 216);
      ctx.setLineDash([]);
    }
    ctx.fillStyle = "#7ccfc4";
    ctx.font = "14px Courier New";
    ctx.fillText(room.subtitle, 236, 94);
  }

  function drawArchitectureBlocks() {
    const blocks = [
      [120, 224, 54, 104], [168, 186, 76, 142], [235, 164, 104, 164],
      [326, 118, 74, 210], [392, 154, 64, 174], [455, 210, 62, 118],
      [710, 154, 66, 174], [770, 108, 44, 220], [810, 236, 78, 92],
    ];
    ctx.save();
    ctx.fillStyle = "rgba(58, 103, 121, 0.18)";
    ctx.strokeStyle = "rgba(101, 181, 205, 0.2)";
    ctx.lineWidth = 2;
    for (const [x, y, w, h] of blocks) {
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x + 0.5, y + 0.5, w, h);
      ctx.fillStyle = "rgba(6, 18, 24, 0.58)";
      ctx.fillRect(x + 8, y + 20, Math.max(12, w - 22), Math.max(14, h - 44));
      ctx.fillStyle = "rgba(58, 103, 121, 0.18)";
    }
    ctx.fillStyle = "rgba(32, 247, 238, 0.07)";
    for (let i = 0; i < 18; i += 1) {
      const x = 170 + i * 34;
      const y = 340 + (i % 3) * 10;
      ctx.fillRect(x, y, 24, 18 + (i % 4) * 7);
    }
    ctx.restore();
  }

  function drawBinaryColumns() {
    const columns = [
      { x: 548, y: 18, rows: 15, text: "110100111001011" },
      { x: 604, y: 18, rows: 14, text: "00111001011100" },
      { x: 658, y: 18, rows: 16, text: "1110001011011010" },
    ];
    ctx.save();
    ctx.font = "14px Courier New";
    ctx.textAlign = "left";
    for (const column of columns) {
      for (let i = 0; i < column.rows; i += 1) {
        const digit = column.text[i % column.text.length];
        const alpha = digit === "1" ? 0.28 : 0.18;
        ctx.fillStyle = `rgba(32, 247, 238, ${alpha})`;
        ctx.fillText(column.text.slice(i % 5, i % 5 + 4), column.x, column.y + i * 18);
      }
    }
    ctx.restore();
  }

  function drawRightServiceFrame() {
    ctx.save();
    ctx.strokeStyle = "rgba(105, 230, 255, 0.54)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(788, 36);
    ctx.lineTo(788, 218);
    ctx.lineTo(910, 218);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(105, 230, 255, 0.2)";
    for (let y = 60; y < 210; y += 18) {
      ctx.strokeRect(804, y, 24, 10);
      ctx.strokeRect(838, y + 6, 52, 8);
    }
    ctx.strokeStyle = "rgba(32, 247, 238, 0.36)";
    ctx.strokeRect(878, 242, 34, 86);
    ctx.beginPath();
    ctx.moveTo(886, 296);
    ctx.quadraticCurveTo(898, 272, 904, 298);
    ctx.stroke();
    ctx.restore();
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

  function drawPlatforms() {
    ctx.save();
    ctx.fillStyle = "rgba(4, 15, 18, 0.96)";
    ctx.strokeStyle = "#20f7ee";
    ctx.lineWidth = 3;
    ctx.fillRect(86, GROUND_TOP, 830, 24);
    ctx.strokeRect(86, GROUND_TOP, 830, 24);
    ctx.shadowColor = "#20f7ee";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(86, GROUND_TOP + 1);
    ctx.lineTo(916, GROUND_TOP + 1);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(58, 103, 121, 0.18)";
    for (let x = 118; x < 900; x += 28) {
      const h = 10 + ((x / 28) % 5) * 4;
      ctx.fillRect(x, GROUND_TOP + 28, 18, h);
    }
    ctx.strokeStyle = "rgba(32, 247, 238, 0.34)";
    ctx.lineWidth = 2;
    ctx.strokeRect(250, 322, 140, 16);
    ctx.strokeRect(540, 270, 150, 16);
    ctx.restore();
  }

  function drawPlayer() {
    const p = game.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    const invulnFlash = p.invulnTimer > 0 && Math.floor(p.invulnTimer * 22) % 2 === 0;
    ctx.scale(p.facing, 1);
    const swingT = p.swingTimer > 0 ? 1 - p.swingTimer / (p.swingDur || 0.14) : -1;
    drawResolverSprite(invulnFlash ? "#dfffee" : "#20f7ee", 1, swingT, p.swingDir || 1);
    ctx.restore();
  }

  function drawResolverSprite(color, alpha, swingT = -1, swingDir = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;

    // Head and visor.
    ctx.fillRect(-9, -49, 18, 14);
    ctx.fillRect(-5, -53, 14, 4);
    ctx.fillStyle = "#dfffee";
    ctx.fillRect(2, -45, 5, 3);

    // Compact humanoid body with separated limbs.
    ctx.fillStyle = color;
    ctx.fillRect(-7, -34, 15, 22);
    ctx.fillRect(-13, -30, 6, 16);
    ctx.fillRect(8, -30, 7, 16);
    ctx.fillRect(-10, -12, 7, 16);
    ctx.fillRect(3, -12, 7, 16);
    ctx.fillRect(-12, 2, 10, 5);
    ctx.fillRect(2, 2, 11, 5);

    drawPatchBlade(swingT, swingDir);
    ctx.restore();
  }

  // The patch blade sweeps through an arc while attacking (alternating up/down
  // per swing), with a fading motion smear. At rest it sits raised and ready.
  function drawPatchBlade(swingT, swingDir) {
    const dir = swingDir || 1;
    ctx.save();
    ctx.translate(9, -28); // hand pivot
    const bladeAngle = swingT >= 0 ? dir * (-1.05 + swingT * 1.9) : -0.28;

    if (swingT >= 0) {
      // Motion smear trailing the blade.
      const a0 = bladeAngle - dir * 0.7;
      ctx.strokeStyle = `rgba(223,255,238,${0.5 * (1 - swingT)})`;
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.shadowColor = "#20f7ee";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, 54, Math.min(a0, bladeAngle), Math.max(a0, bladeAngle));
      ctx.stroke();
    }

    ctx.rotate(bladeAngle);
    const blade = ctx.createLinearGradient(0, 0, 54, 0);
    blade.addColorStop(0, "#20f7ee");
    blade.addColorStop(0.3, "#dfffee");
    blade.addColorStop(1, "#7aa8ff");
    ctx.shadowColor = "#20f7ee";
    ctx.shadowBlur = swingT >= 0 ? 26 : 18;
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(2, -4);
    ctx.lineTo(50, -9);
    ctx.lineTo(58, -5);
    ctx.lineTo(6, 3);
    ctx.closePath();
    ctx.fill();
    // Hilt.
    ctx.fillStyle = "#dfffee";
    ctx.fillRect(-2, -3, 12, 5);
    ctx.restore();
  }

  function drawDashGhosts() {
    for (const ghost of game.dashGhosts) {
      const t = ghost.life / ghost.maxLife;
      ctx.save();
      ctx.globalAlpha = t * 0.38;
      ctx.translate(ghost.x, ghost.y);
      ctx.scale(ghost.facing, 1);
      drawResolverSprite("#20f7ee", 0.72);
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

  function drawBugLegs(color, width, footY) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "square";
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        const y = -23 + i * 7;
        ctx.beginPath();
        ctx.moveTo(side * 8, y);
        ctx.lineTo(side * width, y + 5);
        ctx.lineTo(side * (width + 7), footY + i * 2);
        ctx.stroke();
      }
    }
  }

  function drawAntennae(color, width, y) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-7, y + 4);
    ctx.lineTo(-width, y - 8);
    ctx.moveTo(7, y + 4);
    ctx.lineTo(width, y - 8);
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
        ctx.save();
        ctx.strokeStyle = "#ff6a8a";
        ctx.lineWidth = 5;
        ctx.shadowColor = "#ff2d55";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(shot.x - Math.sign(shot.vx) * 22, shot.y);
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
    // Break-arc warning lane during telegraph / pending arc.
    if (boss.pendingArc || boss.telegraph > 0.02) {
      ctx.strokeStyle = "rgba(255,45,85,0.45)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(90, FLOOR_Y - 26);
      ctx.lineTo(910, FLOOR_Y - 26);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.translate(boss.x, boss.y);
    const w = def.w;
    const h = def.h;
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
    ctx.fillStyle = "#dfffee";
    ctx.font = "22px Courier New";
    ctx.fillText(room.name.toUpperCase(), 236, 66);
    if (game.run.incident) {
      ctx.fillStyle = "#ff4265";
      ctx.font = "16px Courier New";
      ctx.fillText(`INCIDENT: ${game.run.incident.name}`, 236, 122);
    }
    if (featureFlagActive()) {
      ctx.fillStyle = "#46ff83";
      ctx.font = "16px Courier New";
      ctx.fillText(`FLAGGED OFF: ${Math.ceil(game.featureFlagTimer)}s`, 236, game.run.incident ? 144 : 122);
    }
  }

  function drawRoomBanner(room) {
    if (game.roomIntroTimer <= 0) return;
    const alpha = clamp(game.roomIntroTimer / ROOM_INTRO_SECONDS, 0, 1);
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha + 0.12);
    ctx.fillStyle = "rgba(3, 14, 17, 0.86)";
    ctx.strokeStyle = "rgba(93, 255, 235, 0.72)";
    ctx.lineWidth = 2;
    ctx.fillRect(246, 136, 468, 104);
    ctx.strokeRect(246, 136, 468, 104);
    ctx.fillStyle = "#20f7ee";
    ctx.font = "14px Courier New";
    ctx.fillText(`LOCUS ${game.run.roomsVisited.length}`, 274, 168);
    ctx.fillStyle = "#dfffee";
    ctx.font = "28px Courier New";
    ctx.fillText(room.name.toUpperCase(), 274, 200);
    ctx.fillStyle = "#7ccfc4";
    ctx.font = "14px Courier New";
    ctx.fillText(room.subtitle, 274, 224);
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
    if (!pad || !choosing) { padPrev.buttons = pad ? pad.buttons.map((b) => b.pressed) : []; return; }
    const edge = (n) => {
      const pressed = !!(pad.buttons[n] && pad.buttons[n].pressed);
      return pressed && !(padPrev.buttons && padPrev.buttons[n]);
    };
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
  });
  canvas.addEventListener("mousedown", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.down = true;
  });
  window.addEventListener("mouseup", () => (mouse.down = false));
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
        player: { x: game.player.x, y: game.player.y },
        enemies: game.enemies.filter((e) => e.alive).map((e) => ({ type: e.type, x: e.x, hp: e.hp, telegraph: e.telegraph, boss: !!e.boss, armored: !!e.armored })),
        canvasWidth: canvas.width,
      };
    },
  };

  startSideErrorRail();
  resetGame();
  requestAnimationFrame(frame);
})(window.DepHell = window.DepHell || {});
