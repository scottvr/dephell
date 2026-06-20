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
  const {
    getVisibleGraph,
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
  let game;

  function resetGame() {
    keys.clear();
    mouse.down = false;
    game = {
      run: makeInitialRunState(),
      player: { x: 170, y: FLOOR_Y, w: 24, h: 42, vx: 0, vy: 0, facing: 1, shootTimer: 0, dashTimer: 0 },
      projectiles: [],
      enemyShots: [],
      enemies: [],
      roomIntroTimer: ROOM_INTRO_SECONDS,
    };
    ui.choiceOverlay.classList.add("hidden");
    ui.reportOverlay.classList.add("hidden");
    ui.graphOverlay.classList.add("hidden");
    selectedGraphEntity = null;
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
    const room = rooms[index];
    game.run.roomIndex = index;
    game.player.x = 150;
    game.player.y = FLOOR_Y;
    game.projectiles.length = 0;
    game.enemyShots.length = 0;
    game.enemies = room.enemies.map((spawn, idx) => makeEnemy(spawn, idx));
    game.roomIntroTimer = ROOM_INTRO_SECONDS;
    roomClearTimer = 0;
    if (room.incident) startIncident();
    logEvent("room_entered", `Entered ${room.name}.`, { room: room.id });
    renderAllUi();
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
    if (conflict) {
      conflict.visibility = "known";
      run.incident = {
        id: "build_failure",
        name: "Build Failure",
        cause: conflict,
        stabilityDrain: 9,
      };
      logEvent("incident_started", "Build Failure started: conflict edge activated.", { incident: "build_failure" });
    } else if (run.techDebt >= 16) {
      run.incident = {
        id: "audit_pressure",
        name: "Audit Pressure",
        stabilityDrain: 7,
      };
      logEvent("incident_started", "Audit Pressure started: previous shortcut selected for review.", { incident: "audit_pressure" });
    } else {
      run.incident = {
        id: "minor_regression",
        name: "Minor Regression",
        stabilityDrain: 4,
      };
      logEvent("incident_started", "Minor Regression started: CI noticed something unsettling.", { incident: "minor_regression" });
    }
  }

  function findActiveConflict() {
    return game.run.graph.edges.find((edge) => edge.relation === "conflicts" && edge.active);
  }

  function applyPackage(pkg) {
    const run = game.run;
    run.installedPackages.push(pkg.id);
    logEvent("package_installed", `Installed ${pkg.name}.`, { package: pkg.id });
    for (const effect of pkg.effects) applyEffect(effect, pkg);
    renderAllUi();
    ui.choiceOverlay.classList.add("hidden");
    choiceShown = true;
  }

  function applyEffect(effect, pkg) {
    const run = game.run;
    if (effect.op === "addNode") {
      if (!run.graph.nodes.some((node) => node.id === effect.id)) {
        run.graph.nodes.push({ id: effect.id, name: effect.name, tags: effect.tags, createdBy: pkg.id });
        logEvent("graph_node_added", `${pkg.name} added node ${effect.name}.`, { node: effect.id });
      }
    }
    if (effect.op === "addEdge") {
      const id = `edge_${effect.source}_${effect.target}_${effect.relation}`;
      run.graph.edges.push({ id, source: effect.source, target: effect.target, relation: effect.relation, strength: effect.strength, visibility: effect.visibility, active: true, createdBy: pkg.id });
      logEvent("graph_edge_added", `${effect.source} ${effect.relation} ${effect.target}.`, { edge: id, relation: effect.relation });
    }
    if (effect.op === "modifyStat") {
      run.stats[effect.stat] = Math.max(0.08, run.stats[effect.stat] + effect.amount);
    }
    if (effect.op === "modifyResource") {
      run[effect.resource] = Math.max(0, Math.min(5, run[effect.resource] + effect.amount));
      logEvent("resource_changed", `${effect.resource} changed by ${effect.amount}.`, { resource: effect.resource });
    }
    if (effect.op === "increaseDebt") {
      run.techDebt += effect.amount;
      run.debtTags.push(effect.tag);
      logEvent("debt_added", `Technical Debt +${effect.amount}: ${effect.tag}.`, { debtTag: effect.tag });
    }
    if (effect.op === "addApproval") {
      run.approvals.push({ id: effect.id, target: effect.target, reason: effect.reason });
      logEvent("approval_granted", `Security Exception approved for ${effect.target}.`, { approval: effect.id });
    }
    if (effect.op === "revealEdges") {
      let revealedCount = 0;
      for (const edge of run.graph.edges) {
        const relationMatches = !effect.relation || edge.relation === effect.relation;
        const visibilityMatches = !effect.visibility || edge.visibility === effect.visibility;
        if (relationMatches && visibilityMatches) {
          edge.visibility = "known";
          revealedCount += 1;
        }
      }
      logEvent("graph_revealed", `${pkg.name} revealed ${revealedCount} suspected graph ${revealedCount === 1 ? "edge" : "edges"}.`);
    }
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
        <div class="tag-row">${pkg.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      `;
      button.addEventListener("click", () => applyPackage(pkg));
      ui.packageChoices.appendChild(button);
    }
    ui.choiceOverlay.classList.remove("hidden");
  }

  function visibleRiskText(pkg) {
    if (game.run.observability >= 4) return pkg.risk;
    if (pkg.id === "test_suite") return pkg.risk;
    return pkg.risk.replace("Suspected conflict with Modern Crypto. ", "Suspected hidden conflict. ");
  }

  function update(dt) {
    if (game.run.ended || isOverlayOpen()) return;
    if (game.roomIntroTimer > 0) {
      game.roomIntroTimer -= dt;
      return;
    }
    updatePlayer(dt);
    updateProjectiles(dt);
    updateEnemies(dt);
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
      p.x += p.facing * 96;
      p.dashTimer = game.run.stats.dashCooldown;
    }
    p.vy += 920 * dt;
    p.x = clamp(p.x + p.vx * dt, 92, 900);
    p.y = Math.min(FLOOR_Y, p.y + p.vy * dt);
    if (p.y >= FLOOR_Y) p.vy = 0;
    p.shootTimer -= dt;
    p.dashTimer -= dt;
    if ((mouse.down || keys.has(" ")) && p.shootTimer <= 0) shoot();
  }

  function shoot() {
    const p = game.player;
    const aim = worldMouse();
    const angle = Math.atan2(aim.y - (p.y - 18), aim.x - (p.x + p.w / 2));
    game.projectiles.push({
      x: p.x + p.w / 2,
      y: p.y - 18,
      vx: Math.cos(angle) * 560,
      vy: Math.sin(angle) * 560,
      life: 0.8,
      damage: game.run.stats.damage,
    });
    p.shootTimer = game.run.stats.fireRate;
  }

  function updateProjectiles(dt) {
    for (const shot of game.projectiles) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
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
      for (const shot of game.projectiles) {
        if (shot.life <= 0) continue;
        if (rectsOverlap(shot.x - 5, shot.y - 5, 10, 10, enemy.x, enemy.y - enemy.h, enemy.w, enemy.h)) {
          enemy.hp -= shot.damage;
          shot.life = 0;
          if (enemy.hp <= 0) {
            enemy.alive = false;
            logEvent("enemy_defeated", `${enemy.name} patched out.`);
          }
        }
      }
    }
    game.projectiles = game.projectiles.filter((shot) => shot.life > 0 && shot.x > -20 && shot.x < 1000);
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
    const drain = game.run.incident?.stabilityDrain ?? 0;
    const adjusted = amount + (drain > 0 ? Math.ceil(drain / 4) : 0);
    game.run.stability = Math.max(0, game.run.stability - adjusted);
    logEvent("stability_damage", `${reason} Stability -${adjusted}.`);
    renderAllUi();
    if (game.run.stability <= 0) endRun(false, reason);
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
    const { visibleNodes, edges } = getVisibleGraph(game.run);
    ui.graphSvg.innerHTML = graphMarkup(game.run, visibleNodes, edges, selectedGraphEntity, { interactive: false });
    ui.graphCaption.textContent = graphCaption(game.run, edges);
  }

  function renderPauseGraph() {
    const { visibleNodes, edges } = getVisibleGraph(game.run);
    ui.pauseGraphSvg.innerHTML = graphMarkup(game.run, visibleNodes, edges, selectedGraphEntity, { interactive: true });
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
    const room = rooms[game.run.roomIndex];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackdrop(room);
    drawPlatforms();
    drawProjectiles();
    drawEnemies();
    drawPlayer();
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
    ctx.fillStyle = "#20f7ee";
    ctx.shadowColor = "#20f7ee";
    ctx.shadowBlur = 16;
    ctx.fillRect(-10, -42, 20, 18);
    ctx.fillRect(-8, -24, 16, 26);
    ctx.fillRect(-16, -18, 9, 24);
    ctx.fillRect(7, -18, 9, 24);
    ctx.fillStyle = "#dfffee";
    ctx.fillRect(p.facing > 0 ? 8 : -42, -25, 34, 7);
    ctx.restore();
  }

  function drawEnemies() {
    for (const enemy of game.enemies) {
      if (!enemy.alive) continue;
      const def = enemyDefs[enemy.type];
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
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

  function drawProjectiles() {
    ctx.fillStyle = "#dfffee";
    for (const shot of game.projectiles) {
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffcf66";
    for (const shot of game.enemyShots) {
      ctx.beginPath();
      ctx.rect(shot.x - 5, shot.y - 5, 10, 10);
      ctx.fill();
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
