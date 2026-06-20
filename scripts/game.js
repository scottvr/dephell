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
    };
    ui.choiceOverlay.classList.add("hidden");
    ui.reportOverlay.classList.add("hidden");
    ui.graphOverlay.classList.add("hidden");
    selectedGraphEntity = null;
    activePreviewPackage = null;
    roomClearTimer = 0;
    choiceShown = false;
    logEvent("run_started", "Run started: Release Candidate Pipeline.");
    loadRoom(0);
    renderAllUi();
  }

  function logEvent(type, text, data = {}) {
    game.run.eventLog.push({ order: game.run.eventLog.length + 1, type, text, ...data });
  }

  function loadRoom(index) {
    const room = resolveRoom(rooms[index]);
    game.currentRoom = room;
    game.run.roomIndex = index;
    game.player.x = 150;
    game.player.y = FLOOR_Y;
    game.slashes.length = 0;
    game.enemyShots.length = 0;
    game.enemies = room.enemies.map((spawn, idx) => makeEnemy(spawn, idx));
    game.roomIntroTimer = ROOM_INTRO_SECONDS;
    roomClearTimer = 0;
    if (room.incident) startIncident();
    logEvent("room_entered", `Entered ${room.name}.`, { room: room.id });
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
    for (const pkg of packages) {
      const button = document.createElement("button");
      button.className = "package-card";
      button.type = "button";
      button.innerHTML = `
        <h2>${pkg.name}</h2>
        <p><b>Benefit:</b> ${pkg.benefit}</p>
        <p><b>Risk:</b> ${visibleRiskText(pkg)}</p>
        <p><b>Preview:</b> ${packagePreviewText(pkg)}</p>
        <div class="tag-row">${pkg.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      `;
      button.addEventListener("click", () => applyPackage(pkg));
      button.addEventListener("mouseenter", () => previewPackage(pkg));
      button.addEventListener("focus", () => previewPackage(pkg));
      button.addEventListener("mouseleave", clearPackagePreview);
      button.addEventListener("blur", clearPackagePreview);
      ui.packageChoices.appendChild(button);
    }
    ui.choiceOverlay.classList.remove("hidden");
  }

  function previewPackage(pkg) {
    activePreviewPackage = pkg;
    renderGraph();
    if (!ui.graphOverlay.classList.contains("hidden")) renderPauseGraph();
  }

  function clearPackagePreview() {
    activePreviewPackage = null;
    renderGraph();
    if (!ui.graphOverlay.classList.contains("hidden")) renderPauseGraph();
  }

  function visibleRiskText(pkg) {
    if (game.run.observability >= 4) return pkg.risk;
    if (pkg.id === "test_suite") return pkg.risk;
    return pkg.risk.replace("Suspected conflict with Modern Crypto. ", "Suspected hidden conflict. ");
  }

  function update(dt) {
    if (game.run.ended || isOverlayOpen()) return;
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
      const behaviorSpeed = enemy.type === "memory_leak" ? enemy.speed + (enemy.maxHp - enemy.hp) * 0.5 : enemy.speed;
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
        enemy.attackTimer = 1.7;
        enemy.telegraph = 0.32;
        const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        game.enemyShots.push({ x: enemy.x, y: enemy.y - 22, vx: Math.cos(angle) * 220, vy: Math.sin(angle) * 220, life: 2.4, damage: enemy.damage, source: enemy.name });
      }
    }
  }

  function updateRoomFlow(dt) {
    const alive = game.enemies.some((enemy) => enemy.alive);
    if (alive) return;
    roomClearTimer += dt;
    if (roomClearTimer > 0.7) {
      const room = rooms[game.run.roomIndex];
      if (room.packageChoice && !choiceShown) {
        logEvent("room_cleared", `${room.name} cleared. Package offer opened.`, { room: room.id });
        showPackageChoice();
        return;
      }
      if (game.run.roomIndex < rooms.length - 1 && roomClearTimer > 1.2) {
        logEvent("room_cleared", `${room.name} cleared.`, { room: room.id });
        loadRoom(game.run.roomIndex + 1);
        return;
      }
      if (game.run.roomIndex === rooms.length - 1 && roomClearTimer > 1.2) endRun(true, "Release candidate shipped with documented concerns.");
    }
  }

  function damagePlayer(amount, reason) {
    if (game.player.invulnTimer > 0) return;
    const drain = game.run.incident?.stabilityDrain ?? 0;
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
  }

  function renderGraph() {
    const { visibleNodes, edges, preview } = getPreviewGraph(game.run, activePreviewPackage);
    ui.graphSvg.innerHTML = graphMarkup(game.run, visibleNodes, edges, selectedGraphEntity, { interactive: false, preview });
    ui.graphCaption.textContent = activePreviewPackage ? `previewing ${activePreviewPackage.name}; install to commit graph changes.` : graphCaption(game.run, edges);
  }

  function renderPauseGraph() {
    const { visibleNodes, edges, preview } = getPreviewGraph(game.run, activePreviewPackage);
    ui.pauseGraphSvg.innerHTML = graphMarkup(game.run, visibleNodes, edges, selectedGraphEntity, { interactive: true, preview });
    ui.graphDetails.innerHTML = graphDetails(game.run, selectedGraphEntity, ui.graphCaption.textContent);
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
    return !ui.choiceOverlay.classList.contains("hidden") || !ui.reportOverlay.classList.contains("hidden") || !ui.graphOverlay.classList.contains("hidden");
  }

  function draw() {
    const room = game.currentRoom || rooms[game.run.roomIndex];
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
    ctx.fillStyle = "#03080b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(32, 247, 238, 0.11)";
    ctx.lineWidth = 1;
    for (let x = 95; x < canvas.width; x += 62) {
      ctx.beginPath();
      ctx.moveTo(x, 130);
      ctx.lineTo(x, 430);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(32, 247, 238, 0.08)";
    for (let i = 0; i < 18; i++) {
      const x = 270 + i * 18;
      const h = 60 + ((i * 37) % 170);
      ctx.fillRect(x, 405 - h, 12, h);
    }
    if (game.run.incident) {
      ctx.fillStyle = "rgba(255, 66, 101, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = "#7ccfc4";
    ctx.font = "14px Courier New";
    ctx.fillText(room.subtitle, 236, 94);
  }

  function drawPlatforms() {
    ctx.fillStyle = "#061315";
    ctx.strokeStyle = "#20f7ee";
    ctx.lineWidth = 3;
    ctx.fillRect(86, GROUND_TOP, 830, 24);
    ctx.strokeRect(86, GROUND_TOP, 830, 24);
    ctx.strokeStyle = "rgba(32, 247, 238, 0.34)";
    ctx.strokeRect(250, 322, 140, 16);
    ctx.strokeRect(540, 270, 150, 16);
  }

  function drawPlayer() {
    const p = game.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    const invulnFlash = p.invulnTimer > 0 && Math.floor(p.invulnTimer * 18) % 2 === 0;
    ctx.fillStyle = invulnFlash ? "#dfffee" : "#20f7ee";
    ctx.shadowColor = invulnFlash ? "#dfffee" : "#20f7ee";
    ctx.shadowBlur = invulnFlash ? 24 : 16;
    ctx.fillRect(-10, -42, 20, 18);
    ctx.fillRect(-8, -24, 16, 26);
    ctx.fillRect(-16, -18, 9, 24);
    ctx.fillRect(7, -18, 9, 24);
    ctx.strokeStyle = "#dfffee";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.facing > 0 ? 8 : -8, -24);
    ctx.lineTo(p.facing > 0 ? 48 : -48, -36);
    ctx.stroke();
    ctx.restore();
  }

  function drawDashGhosts() {
    for (const ghost of game.dashGhosts) {
      const t = ghost.life / ghost.maxLife;
      ctx.save();
      ctx.globalAlpha = t * 0.38;
      ctx.translate(ghost.x, ghost.y);
      ctx.fillStyle = "#20f7ee";
      ctx.shadowColor = "#20f7ee";
      ctx.shadowBlur = 18;
      ctx.fillRect(-10, -42, 20, 18);
      ctx.fillRect(-8, -24, 16, 26);
      ctx.fillRect(-16, -18, 9, 24);
      ctx.fillRect(7, -18, 9, 24);
      ctx.strokeStyle = "#dfffee";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(ghost.facing > 0 ? 8 : -8, -24);
      ctx.lineTo(ghost.facing > 0 ? 42 : -42, -34);
      ctx.stroke();
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
      ctx.fillStyle = def.color;
      ctx.shadowColor = def.color;
      ctx.shadowBlur = enemy.telegraph > 0 ? 24 : 10;
      const scale = enemy.type === "memory_leak" ? 1 + (enemy.maxHp - enemy.hp) / 120 : 1;
      ctx.scale(scale, scale);
      ctx.fillRect(-enemy.w / 2, -enemy.h, enemy.w, enemy.h);
      ctx.fillStyle = "#03080b";
      ctx.fillRect(-8, -enemy.h + 8, 4, 4);
      ctx.fillRect(5, -enemy.h + 8, 4, 4);
      ctx.restore();
      ctx.fillStyle = "rgba(223,255,238,0.18)";
      ctx.fillRect(enemy.x - 22, enemy.y - enemy.h - 14, 44, 4);
      ctx.fillStyle = def.color;
      ctx.fillRect(enemy.x - 22, enemy.y - enemy.h - 14, 44 * Math.max(0, enemy.hp / enemy.maxHp), 4);
    }
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
    ctx.fillText(`ROOM ${game.run.roomIndex + 1} / ${rooms.length}`, 274, 168);
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

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      event.preventDefault();
    }
    if (key === "escape" && !ui.graphOverlay.classList.contains("hidden")) {
      closeGraphOverlay();
      return;
    }
    if (key === "g" && ui.reportOverlay.classList.contains("hidden")) {
      event.preventDefault();
      if (ui.graphOverlay.classList.contains("hidden")) {
        openGraphOverlay();
      } else {
        closeGraphOverlay();
      }
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

  resetGame();
  requestAnimationFrame(frame);
})(window.DepHell = window.DepHell || {});
