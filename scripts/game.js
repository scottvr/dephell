(function bootstrapGame(namespace) {
  const { FLOOR_Y, GROUND_TOP, ROOM_INTRO_SECONDS } = namespace.constants;
  const { packages, rooms, enemyDefs } = namespace.content;
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
    choiceOverlay: document.querySelector("#choiceOverlay"),
    packageChoices: document.querySelector("#packageChoices"),
    reportOverlay: document.querySelector("#reportOverlay"),
    reportKicker: document.querySelector("#reportKicker"),
    reportTitle: document.querySelector("#reportTitle"),
    reportBody: document.querySelector("#reportBody"),
    restartButton: document.querySelector("#restartButton"),
    reportRestartButton: document.querySelector("#reportRestartButton"),
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
  let hitFreezeTimer = 0;
  let game;

  function resetGame() {
    keys.clear();
    mouse.down = false;
    game = {
      run: makeInitialRunState(),
      player: { x: 170, y: FLOOR_Y, w: 24, h: 42, vx: 0, vy: 0, facing: 1, attackTimer: 0, dashTimer: 0, invulnTimer: 0 },
      slashes: [],
      enemyShots: [],
      hitSparks: [],
      dashGhosts: [],
      enemies: [],
      roomIntroTimer: ROOM_INTRO_SECONDS,
      toolCooldowns: { feature_flag: 0 },
      featureFlagTimer: 0,
    };
    ui.choiceOverlay.classList.add("hidden");
    ui.reportOverlay.classList.add("hidden");
    ui.graphOverlay.classList.add("hidden");
    ui.routeOverlay.classList.add("hidden");
    selectedGraphEntity = null;
    activePreviewPackage = null;
    activeRouteChoice = null;
    pendingRoutes = [];
    roomClearTimer = 0;
    choiceShown = false;
    roomClearedLogged = false;
    logEvent("run_started", "Run started: Release Candidate Pipeline.");
    loadRoom("local_dev");
    renderAllUi();
    applyVisualSmokeMode();
  }

  function logEvent(type, text, data = {}) {
    game.run.eventLog.push({ order: game.run.eventLog.length + 1, type, text, ...data });
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
    game.enemies = room.enemies.map((spawn, idx) => makeEnemy(spawn, idx));
    game.roomIntroTimer = ROOM_INTRO_SECONDS;
    roomClearTimer = 0;
    roomClearedLogged = false;
    choiceShown = false;
    pendingRoutes = [];
    activeRouteChoice = null;
    game.featureFlagTimer = 0;
    game.run.activeFlag = null;
    ui.routeOverlay.classList.add("hidden");
    if (room.incident) startIncident();
    logEvent("room_entered", `Entered ${room.name}.`, { room: room.id, route: route?.id });
    renderAllUi();
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
    return {
      id: `${spawn.type}_${idx}`,
      type: spawn.type,
      name: def.name,
      x: spawn.x,
      y: spawn.y,
      w: def.w,
      h: def.h,
      hp: def.hp + incidentEnemyBonus(spawn.type),
      maxHp: def.hp + incidentEnemyBonus(spawn.type),
      speed: def.speed,
      damage: def.damage,
      telegraph: 0,
      attackTimer: 0.8 + idx * 0.4,
      contactTimer: 0,
      windupTimer: 0,
      alive: true,
    };
  }

  function incidentEnemyBonus(type) {
    if (!game?.run?.incident) return 0;
    if (game.run.incident.id === "build_failure" && type === "breaking_change") return 14;
    if (game.run.incident.id === "audit_pressure" && type === "memory_leak") return 18;
    return 0;
  }

  function startIncident() {
    const run = game.run;
    const conflict = findActiveConflict();
    const tested = run.mitigations.includes("test_coverage");
    if (conflict) {
      conflict.visibility = "known";
      run.incident = {
        id: "build_failure",
        name: "Build Failure",
        cause: conflict,
        stabilityDrain: tested ? 4 : 9,
      };
      logEvent("incident_started", tested ? "Build Failure started, but Test Suite reduced blast radius." : "Build Failure started: conflict edge activated.", { incident: "build_failure" });
    } else if (run.techDebt >= 16) {
      run.incident = {
        id: "audit_pressure",
        name: "Audit Pressure",
        stabilityDrain: tested ? 3 : 7,
      };
      logEvent("incident_started", tested ? "Audit Pressure started with test evidence attached." : "Audit Pressure started: previous shortcut selected for review.", { incident: "audit_pressure" });
    } else {
      run.incident = {
        id: "minor_regression",
        name: "Minor Regression",
        stabilityDrain: tested ? 2 : 4,
      };
      logEvent("incident_started", tested ? "Minor Regression started; tests isolated the noisy path." : "Minor Regression started: CI noticed something unsettling.", { incident: "minor_regression" });
    }
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
    renderAllUi();
    ui.choiceOverlay.classList.add("hidden");
    choiceShown = true;
  }

  function showPackageChoice() {
    ui.packageChoices.innerHTML = "";
    activePreviewPackage = packages[0] || null;
    for (const pkg of packages) {
      const button = document.createElement("button");
      button.className = "package-card";
      button.type = "button";
      button.dataset.packageId = pkg.id;
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
      button.addEventListener("click", () => applyPackage(pkg));
      button.addEventListener("mouseenter", () => previewPackage(pkg));
      button.addEventListener("focus", () => previewPackage(pkg));
      ui.packageChoices.appendChild(button);
    }
    syncPackagePreviewState();
    renderChoiceGraph();
    ui.choiceOverlay.classList.remove("hidden");
  }

  function previewPackage(pkg) {
    activePreviewPackage = pkg;
    syncPackagePreviewState();
    renderGraph();
    renderChoiceGraph();
    if (!ui.graphOverlay.classList.contains("hidden")) renderPauseGraph();
  }

  function syncPackagePreviewState() {
    for (const card of ui.packageChoices.querySelectorAll(".package-card")) {
      card.classList.toggle("previewing", card.dataset.packageId === activePreviewPackage?.id);
    }
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
      : "Hover or focus a package to preview its graph mutation.";
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
    updateAttacks(dt);
    updateEnemies(dt);
    updateHitSparks(dt);
    updateDashGhosts(dt);
    updateRoomFlow(dt);
  }

  function updateToolTimers(dt) {
    game.toolCooldowns.feature_flag = Math.max(0, game.toolCooldowns.feature_flag - dt);
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
      p.x += p.facing * 96;
      p.dashTimer = game.run.stats.dashCooldown;
    }
    p.vy += 920 * dt;
    p.x = clamp(p.x + p.vx * dt, 92, 900);
    p.y = Math.min(FLOOR_Y, p.y + p.vy * dt);
    if (p.y >= FLOOR_Y) p.vy = 0;
    p.attackTimer -= dt;
    p.dashTimer -= dt;
    p.invulnTimer -= dt;
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
      arc: 1.55,
      range: 78,
      life: 0.16,
      maxLife: 0.16,
      damage: game.run.stats.damage,
      hitIds: [],
    });
    p.attackTimer = game.run.stats.fireRate;
  }

  function updateAttacks(dt) {
    for (const slash of game.slashes) {
      slash.life -= dt;
    }
    for (const shot of game.enemyShots) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
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
        if (distance <= slash.range && withinArc) {
          enemy.hp -= slash.damage;
          slash.hitIds.push(enemy.id);
          addHitSpark(enemyCenterX, enemyCenterY, enemyDefs[enemy.type].color);
          if (enemy.hp <= 0) {
            enemy.alive = false;
            logEvent("enemy_defeated", `${enemy.name} patched out.`);
          }
        }
      }
    }
    game.slashes = game.slashes.filter((slash) => slash.life > 0);
    game.enemyShots = game.enemyShots.filter((shot) => shot.life > 0 && shot.x > -20 && shot.x < 1000);
  }

  function updateEnemies(dt) {
    for (const enemy of game.enemies) {
      if (!enemy.alive) continue;
      const p = game.player;
      const dir = Math.sign(p.x - enemy.x) || 1;
      const flagSlow = featureFlagActive() ? 0.58 : 1;
      const behaviorSpeed = (enemy.type === "memory_leak" ? enemy.speed + (enemy.maxHp - enemy.hp) * 0.5 : enemy.speed) * flagSlow;
      enemy.x += dir * behaviorSpeed * dt;
      enemy.x = clamp(enemy.x, 88, 900);
      enemy.attackTimer -= dt;
      enemy.contactTimer -= dt;
      enemy.windupTimer -= dt;
      enemy.telegraph = Math.max(0, enemy.telegraph - dt);
      if (enemy.windupTimer <= 0 && enemy.windupTimer > -dt) {
        if (Math.abs(game.player.x - enemy.x) < 64) {
          damagePlayer(enemy.damage, `${enemy.name} collided with active code.`);
        }
      }
      if (Math.abs(p.x - enemy.x) < 46 && enemy.attackTimer <= 0 && enemy.contactTimer <= 0) {
        enemy.telegraph = 0.28;
        enemy.windupTimer = 0.26;
        enemy.attackTimer = enemy.type === "breaking_change" ? 1.2 : 1.8;
        enemy.contactTimer = 1.1;
      } else if (enemy.type === "breaking_change" && enemy.attackTimer <= 0.05) {
        enemy.attackTimer = featureFlagActive() ? 2.4 : 1.7;
        enemy.telegraph = 0.32;
        const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        if (!featureFlagActive()) game.enemyShots.push({ x: enemy.x, y: enemy.y - 22, vx: Math.cos(angle) * 220, vy: Math.sin(angle) * 220, life: 2.4, damage: enemy.damage, source: enemy.name });
      }
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
    logEvent("room_cleared", `${room.name} cleared.`, { room: room.id });
    if (room.clearReward) applyRoomReward(room.clearReward, room.id);
    renderAllUi();
  }

  function applyRoomReward(reward, roomId) {
    if (reward.stability) game.run.stability = Math.min(100, game.run.stability + reward.stability);
    if (reward.observability) game.run.observability = Math.min(5, game.run.observability + reward.observability);
    if (reward.techDebt) game.run.techDebt = Math.max(0, game.run.techDebt + reward.techDebt);
    if (reward.text) logEvent("room_reward", reward.text, { room: roomId });
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
    if (game.player.invulnTimer > 0) return;
    const drain = featureFlagActive() ? 0 : game.run.incident?.stabilityDrain ?? 0;
    const adjusted = amount + (drain > 0 ? Math.ceil(drain / 4) : 0);
    game.run.stability = Math.max(0, game.run.stability - adjusted);
    game.player.invulnTimer = 0.75;
    hitFreezeTimer = 0.06;
    addHitSpark(game.player.x, game.player.y - 24, "#dfffee");
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
      if (mode === "report") {
        seedVisualSmokeReport();
      }
    }, 0);
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
    return !ui.choiceOverlay.classList.contains("hidden") || !ui.routeOverlay.classList.contains("hidden") || !ui.reportOverlay.classList.contains("hidden") || !ui.graphOverlay.classList.contains("hidden");
  }

  function draw() {
    const room = game.currentRoom || roomById.get(game.run.currentRoomId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackdrop(room);
    drawPlatforms();
    drawAttacks();
    drawEnemies();
    drawDashGhosts();
    drawPlayer();
    drawHitSparks();
    drawRoomTitle(room);
    drawRoomBanner(room);
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
    const invulnFlash = p.invulnTimer > 0 && Math.floor(p.invulnTimer * 18) % 2 === 0;
    ctx.scale(p.facing, 1);
    drawResolverSprite(invulnFlash ? "#dfffee" : "#20f7ee", 1);
    ctx.restore();
  }

  function drawResolverSprite(color, alpha) {
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

    // Bright patch blade, closer to the mock sword than a plain stick.
    const blade = ctx.createLinearGradient(16, -33, 66, -45);
    blade.addColorStop(0, "#20f7ee");
    blade.addColorStop(0.3, "#dfffee");
    blade.addColorStop(1, "#7aa8ff");
    ctx.shadowColor = "#20f7ee";
    ctx.shadowBlur = 22;
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(12, -32);
    ctx.lineTo(58, -47);
    ctx.lineTo(66, -43);
    ctx.lineTo(22, -25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#dfffee";
    ctx.fillRect(8, -31, 14, 5);
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
      const def = enemyDefs[enemy.type];
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      if (enemy.telegraph > 0) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -enemy.h / 2, enemy.w + 12, 0, Math.PI * 2);
        ctx.stroke();
      }
      const scale = enemy.type === "memory_leak" ? 1 + (enemy.maxHp - enemy.hp) / 120 : 1;
      ctx.scale(scale, scale);
      drawEnemySprite(enemy, def);
      ctx.restore();
      ctx.fillStyle = "rgba(223,255,238,0.18)";
      ctx.fillRect(enemy.x - 22, enemy.y - enemy.h - 14, 44, 4);
      ctx.fillStyle = def.color;
      ctx.fillRect(enemy.x - 22, enemy.y - enemy.h - 14, 44 * Math.max(0, enemy.hp / enemy.maxHp), 4);
    }
  }

  function drawEnemySprite(enemy, def) {
    if (enemy.type === "breaking_change") {
      drawBreakingChangeSprite(def.color, enemy.telegraph > 0);
      return;
    }
    if (enemy.type === "memory_leak") {
      drawMemoryLeakSprite(def.color, enemy.telegraph > 0);
      return;
    }
    drawRegressionSprite(def.color, enemy.telegraph > 0);
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
    ctx.fillStyle = "#ffcf66";
    for (const shot of game.enemyShots) {
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

  function frame(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    draw();
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



  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      event.preventDefault();
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

  startSideErrorRail();
  resetGame();
  requestAnimationFrame(frame);
})(window.DepHell = window.DepHell || {});
