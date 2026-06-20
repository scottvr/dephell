(function bootstrapEffects(namespace) {
  function applyPackageEffects(run, pkg, logEvent) {
    for (const effect of pkg.effects) applyEffect(run, effect, pkg, logEvent);
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
      if (effect.op === "addTag") parts.push(`adds ${effect.tag}`);
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
    return `${effect.stat} ${signed(effect.amount)}`;
  }

  namespace.effects = { applyPackageEffects, packagePreviewText };
})(window.DepHell = window.DepHell || {});
