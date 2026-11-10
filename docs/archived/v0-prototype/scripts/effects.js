(function bootstrapEffects(namespace) {
  function applyPackageEffects(run, pkg, logEvent) {
    for (const effect of pkg.effects) applyEffect(run, effect, pkg, logEvent);
  }

  // Apply an ad-hoc effect list (room rewards, incident resolutions, enemy graph
  // consequences) through the same verb dispatcher, using a synthetic "package"
  // so log lines and createdBy attribution stay coherent.
  function applyEffectList(run, effects, source, logEvent) {
    const pkg = typeof source === "string" ? { id: source, name: source } : source;
    for (const effect of effects || []) applyEffect(run, effect, pkg, logEvent);
  }

  function applyEffect(run, effect, pkg, logEvent) {
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
    if (effect.op === "addTag") {
      if (!run[effect.list]) run[effect.list] = [];
      if (!run[effect.list].includes(effect.tag)) run[effect.list].push(effect.tag);
      logEvent("tag_added", `${pkg.name} added ${effect.tag}.`, { tag: effect.tag });
    }
    if (effect.op === "addTool") {
      if (!run.tools.includes(effect.tool)) run.tools.push(effect.tool);
      logEvent("tool_unlocked", `${pkg.name} unlocked ${toolName(effect.tool)}.`, { tool: effect.tool });
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
    if (effect.op === "revealNode") {
      const node = run.graph.nodes.find((item) => item.id === effect.id);
      if (node && node.hidden) {
        node.hidden = false;
        logEvent("graph_revealed", `${pkg.name} revealed hidden node ${node.name}.`, { node: node.id });
      }
    }
    if (effect.op === "addBossScore") {
      if (!run.bossScores[effect.boss]) run.bossScores[effect.boss] = 0;
      run.bossScores[effect.boss] += effect.amount;
      logEvent("boss_score", `${effect.reason} (${signed(effect.amount)} ${bossLabel(effect.boss)} pressure).`, { boss: effect.boss, amount: effect.amount });
    }
    if (effect.op === "registerRisk") {
      run.risks.push({ id: effect.id, kind: effect.kind, target: effect.target, reason: effect.reason, source: pkg.id });
      logEvent("risk_registered", `${effect.kind} risk registered: ${effect.reason}.`, { risk: effect.id, kind: effect.kind });
    }
    if (effect.op === "pinNode") {
      if (!run.pins.includes(effect.id)) run.pins.push(effect.id);
      const node = run.graph.nodes.find((item) => item.id === effect.id);
      if (node) node.pinned = true;
      logEvent("node_pinned", `${pkg.name} pinned ${node ? node.name : effect.id}; surprise upgrades are blocked here.`, { node: effect.id });
    }
    if (effect.op === "addEnemyModifier") {
      run.enemyModifiers.push({ scope: effect.scope, stat: effect.stat, amount: effect.amount, source: pkg.id });
      logEvent("enemy_modifier", `${pkg.name} altered ${effect.scope} enemy ${effect.stat} by ${effect.amount}.`, { scope: effect.scope });
    }
    if (effect.op === "addProcessDecision") {
      run.processDecisions.push({ id: effect.id, kind: effect.kind || effect.id, target: effect.target, reason: effect.reason, tag: effect.tag });
      if (effect.tag) run.debtTags.push(effect.tag);
      logEvent("process_decision", `${effect.reason || effect.id} filed. It will be queryable later.`, { decision: effect.id });
    }
  }

  // Reverse a package's effects (Slice 2 refactor-remove). Nodes/edges the package
  // created carry createdBy === pkg.id, so those come out cleanly along with any
  // edges dangling to a removed node. Scalars/lists are inverted best-effort;
  // reveals (revealEdges/revealNode) are intentionally NOT undone — once the player
  // has seen a relation, they've seen it.
  function removePackageEffects(run, pkg, logEvent) {
    const addedNodeIds = new Set(pkg.effects.filter((e) => e.op === "addNode").map((e) => e.id));
    run.graph.edges = run.graph.edges.filter((e) => !(e.createdBy === pkg.id || addedNodeIds.has(e.source) || addedNodeIds.has(e.target)));
    run.graph.nodes = run.graph.nodes.filter((n) => !addedNodeIds.has(n.id));
    const dropOne = (list, val) => { if (Array.isArray(list)) { const i = list.indexOf(val); if (i >= 0) list.splice(i, 1); } };
    for (const eff of pkg.effects) {
      if (eff.op === "modifyStat") run.stats[eff.stat] = Math.max(0.08, (run.stats[eff.stat] ?? 0) - eff.amount);
      else if (eff.op === "modifyResource") run[eff.resource] = Math.max(0, Math.min(5, (run[eff.resource] ?? 0) - eff.amount));
      else if (eff.op === "increaseDebt") { run.techDebt = Math.max(0, run.techDebt - eff.amount); dropOne(run.debtTags, eff.tag); }
      else if (eff.op === "addApproval") run.approvals = run.approvals.filter((a) => a.id !== eff.id);
      else if (eff.op === "addTag") dropOne(run[eff.list], eff.tag);
      else if (eff.op === "addTool") run.tools = run.tools.filter((t) => t !== eff.tool);
      else if (eff.op === "addBossScore") { if (run.bossScores[eff.boss] != null) run.bossScores[eff.boss] = Math.max(0, run.bossScores[eff.boss] - eff.amount); }
      else if (eff.op === "registerRisk") run.risks = run.risks.filter((r) => r.id !== eff.id);
      else if (eff.op === "pinNode") dropOne(run.pins, eff.id);
      else if (eff.op === "addEnemyModifier") run.enemyModifiers = run.enemyModifiers.filter((m) => !(m.source === pkg.id && m.stat === eff.stat && m.amount === eff.amount));
      else if (eff.op === "addProcessDecision") { run.processDecisions = run.processDecisions.filter((d) => d.id !== eff.id); if (eff.tag) dropOne(run.debtTags, eff.tag); }
    }
    if (logEvent) logEvent("package_removed", `Refactor removed ${pkg.name}; its nodes, edges, and modifiers were reversed.`, { package: pkg.id });
  }

  function packagePreviewText(pkg) {
    const parts = [];
    let debt = 0;
    for (const effect of pkg.effects) {
      if (effect.op === "addNode") parts.push(`+node ${effect.name}`);
      if (effect.op === "addEdge") parts.push(`+${effect.relation} edge`);
      if (effect.op === "modifyResource") parts.push(`${effect.resource} ${signed(effect.amount)}`);
      if (effect.op === "modifyStat") parts.push(statPreview(effect));
      if (effect.op === "increaseDebt") debt += effect.amount;
      if (effect.op === "revealEdges") parts.push("reveals suspected edges");
      if (effect.op === "revealNode") parts.push("reveals a hidden node");
      if (effect.op === "addTag") parts.push(`adds ${effect.tag}`);
      if (effect.op === "addTool") parts.push(`unlocks ${toolName(effect.tool)}`);
      if (effect.op === "pinNode") parts.push("pins a node");
      if (effect.op === "registerRisk") parts.push(`tracks ${effect.kind} risk`);
      if (effect.op === "addBossScore") parts.push(`+${effect.amount} ${bossLabel(effect.boss)} pressure`);
      if (effect.op === "addEnemyModifier") parts.push(`enemy ${effect.stat} ${signed(effect.amount)}`);
    }
    if (debt) parts.push(`TDR +${debt}`);
    return parts.slice(0, 5).join("; ");
  }

  function signed(value) {
    return value > 0 ? `+${value}` : String(value);
  }

  function statPreview(effect) {
    if (effect.stat === "fireRate") return effect.amount > 0 ? "slower swing" : "faster swing";
    if (effect.stat === "damage") return `damage ${signed(effect.amount)}`;
    if (effect.stat === "speed") return effect.amount > 0 ? "faster feet" : "heavier feet";
    if (effect.stat === "dashCooldown") return effect.amount > 0 ? "slower dash" : "quicker dash";
    return `${effect.stat} ${signed(effect.amount)}`;
  }

  function toolName(tool) {
    const names = {
      feature_flag: "Feature Flag tool",
      rollback: "Rollback tool",
      circuit_breaker: "Circuit Breaker tool",
    };
    return names[tool] || tool;
  }

  function bossLabel(boss) {
    const names = {
      major_version_upgrade: "Major Version Upgrade",
      distributed_monolith: "Distributed Monolith",
    };
    return names[boss] || boss;
  }

  namespace.effects = { applyPackageEffects, applyEffect, applyEffectList, removePackageEffects, packagePreviewText };
})(window.DepHell = window.DepHell || {});
