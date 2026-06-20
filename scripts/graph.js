(function bootstrapGraph(namespace) {
  const { GRAPH_POSITIONS } = namespace.constants;
  const { escapeHtml, shortName } = namespace.utils;
  const { packageName } = namespace.reports;

  function getVisibleGraph(run) {
    const visibleNodes = run.graph.nodes.filter((node) => !node.hidden || run.observability >= 4 || run.graph.edges.some((edge) => (edge.source === node.id || edge.target === node.id) && edge.visibility !== "hidden"));
    const nodeIds = new Set(visibleNodes.map((node) => node.id));
    const edges = run.graph.edges.filter((edge) => edge.visibility !== "hidden" && nodeIds.has(edge.source) && nodeIds.has(edge.target));
    return { visibleNodes, edges };
  }

  function getPreviewGraph(run, pkg) {
    const { visibleNodes, edges } = getVisibleGraph(run);
    if (!pkg) return { visibleNodes, edges, preview: { nodeIds: new Set(), edgeIds: new Set() } };

    const nodesById = new Map(visibleNodes.map((node) => [node.id, node]));
    const edgeList = [...edges];
    const previewNodeIds = new Set();
    const previewEdgeIds = new Set();

    for (const effect of pkg.effects) {
      if (effect.op === "addNode" && !nodesById.has(effect.id)) {
        const node = { id: effect.id, name: effect.name, tags: effect.tags, preview: true };
        nodesById.set(effect.id, node);
        previewNodeIds.add(effect.id);
      }
      if (effect.op === "addEdge") {
        ensurePreviewNode(run, nodesById, previewNodeIds, effect.source);
        ensurePreviewNode(run, nodesById, previewNodeIds, effect.target);
        const id = `preview_${effect.source}_${effect.target}_${effect.relation}`;
        edgeList.push({ id, source: effect.source, target: effect.target, relation: effect.relation, strength: effect.strength, visibility: effect.visibility, active: true, preview: true });
        previewEdgeIds.add(id);
      }
    }

    return {
      visibleNodes: [...nodesById.values()],
      edges: edgeList,
      preview: { nodeIds: previewNodeIds, edgeIds: previewEdgeIds },
    };
  }

  function ensurePreviewNode(run, nodesById, previewNodeIds, nodeId) {
    if (nodesById.has(nodeId)) return;
    const sourceNode = run.graph.nodes.find((node) => node.id === nodeId);
    if (!sourceNode) return;
    const hidden = sourceNode.hidden && run.observability < 4;
    nodesById.set(nodeId, {
      ...sourceNode,
      name: hidden ? "hidden risk" : sourceNode.name,
      preview: true,
    });
    previewNodeIds.add(nodeId);
  }

  function graphCaption(run, edges) {
    const conflict = edges.find((edge) => edge.relation === "conflicts");
    if (run.incident?.id === "build_failure") return "conflict edge activated; staging attacks are stronger.";
    if (conflict) return `${conflict.visibility} conflict: ${conflict.source} versus ${conflict.target}.`;
    if (run.installedPackages.includes("test_suite")) return "test suite promoted suspected graph edges to known.";
    if (run.techDebt >= 16) return "debt is now a graph-level pressure source.";
    return "known requires edges are stable; suspected relations need observability.";
  }

  function graphMarkup(run, visibleNodes, edges, selectedGraphEntity, options = {}) {
    const selectedType = selectedGraphEntity?.type;
    const selectedId = selectedGraphEntity?.id;
    const preview = options.preview || { nodeIds: new Set(), edgeIds: new Set() };
    const currentLocation = options.currentLocation || null;
    const svgEdges = edges.map((edge) => {
      const a = GRAPH_POSITIONS[edge.source];
      const b = GRAPH_POSITIONS[edge.target];
      const selected = selectedType === "edge" && selectedId === edge.id;
      const isPreview = preview.edgeIds.has(edge.id);
      const current = currentLocation?.type === "edge" && currentLocation.id === edge.id;
      const flagged = run.activeFlag?.type === "edge" && run.activeFlag.target === edge.id;
      const classes = ["edge", edge.relation, edge.visibility, selected ? "selected" : "", isPreview ? "preview" : "", flagged ? "flagged" : ""].join(" ");
      const currentMarker = current ? `<line class="edge-current" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"><title>Current graph locus</title></line>` : "";
      const visual = `${currentMarker}<line class="${classes}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"><title>${edge.source} ${edge.relation} ${edge.target}</title></line>`;
      if (!options.interactive || isPreview) return visual;
      return `${visual}<line class="edge-hit" data-entity-type="edge" data-entity-id="${edge.id}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"></line>`;
    });
    const svgNodes = visibleNodes.map((node) => {
      const p = GRAPH_POSITIONS[node.id] || [140, 96];
      const hazard = run.incident?.cause && (run.incident.cause.source === node.id || run.incident.cause.target === node.id);
      const risk = node.tags?.some((tag) => ["legacy", "debt", "security_risk", "unstable"].includes(tag));
      const selected = selectedType === "node" && selectedId === node.id;
      const isPreview = preview.nodeIds.has(node.id);
      const current = currentLocation?.type === "node" && currentLocation.id === node.id;
      const flagged = run.activeFlag?.type === "node" && run.activeFlag.target === node.id;
      const dataAttrs = isPreview ? "" : `data-entity-type="node" data-entity-id="${node.id}"`;
      const currentMarker = current ? `<circle class="node-current-ring" cx="${p[0]}" cy="${p[1]}" r="16"><title>Current graph locus</title></circle>` : "";
      return `
        ${currentMarker}
        <rect class="node ${risk ? "risk" : ""} ${hazard ? "hazard" : ""} ${selected ? "selected" : ""} ${isPreview ? "preview" : ""} ${flagged ? "flagged" : ""}" ${dataAttrs} x="${p[0] - 9}" y="${p[1] - 9}" width="18" height="18"></rect>
        <text class="node-label" x="${p[0]}" y="${p[1] + 24}">${shortName(node.name)}</text>
      `;
    });
    return [...svgEdges, ...svgNodes].join("");
  }

  function graphDetails(run, selectedGraphEntity, caption) {
    if (!selectedGraphEntity) {
      return `
        <h2>Select a node or edge.</h2>
        <p>Click graph entities to inspect relation, visibility, tags, and matching run-log facts.</p>
        <h3>Current Read</h3>
        <p>${escapeHtml(caption)}</p>
      `;
    }
    return selectedGraphEntity.type === "node"
      ? nodeDetails(run, selectedGraphEntity.id)
      : edgeDetails(run, selectedGraphEntity.id);
  }

  function nodeDetails(run, nodeId) {
    const node = run.graph.nodes.find((item) => item.id === nodeId);
    if (!node) return "<h2>Unknown node.</h2>";
    const events = traceEventsForNode(run, nodeId);
    const incidentLine = run.incident?.cause && (run.incident.cause.source === nodeId || run.incident.cause.target === nodeId)
      ? `<p><b>Incident:</b> ${run.incident.name} is currently touching this node.</p>`
      : "";
    return `
      <h2>${escapeHtml(node.name)}</h2>
      <p><b>ID:</b> ${escapeHtml(node.id)}</p>
      <p><b>Tags:</b> ${escapeHtml((node.tags || ["none"]).join(", "))}</p>
      <p><b>Created By:</b> ${escapeHtml(packageName(node.createdBy) || "initial graph")}</p>
      ${incidentLine}
      <h3>Connected Edges</h3>
      <ul>${connectedEdges(run, nodeId).map((edge) => `<li>${escapeHtml(edge.source)} ${escapeHtml(edge.relation)} ${escapeHtml(edge.target)} (${escapeHtml(edge.visibility)})</li>`).join("") || "<li>No visible connected edges.</li>"}</ul>
      <h3>Trace</h3>
      <ul>${eventListMarkup(events)}</ul>
    `;
  }

  function edgeDetails(run, edgeId) {
    const edge = run.graph.edges.find((item) => item.id === edgeId);
    if (!edge) return "<h2>Unknown edge.</h2>";
    const events = traceEventsForEdge(run, edge);
    const incidentLine = run.incident?.cause?.id === edge.id
      ? `<p><b>Incident:</b> ${run.incident.name} activated this relation.</p>`
      : "";
    return `
      <h2>${escapeHtml(edge.source)} ${escapeHtml(edge.relation)} ${escapeHtml(edge.target)}</h2>
      <p><b>Visibility:</b> ${escapeHtml(edge.visibility)}</p>
      <p><b>Strength:</b> ${edge.strength}</p>
      <p><b>State:</b> ${edge.active ? "active" : "inactive"}</p>
      <p><b>Created By:</b> ${escapeHtml(packageName(edge.createdBy) || "initial graph")}</p>
      ${incidentLine}
      <h3>Trace</h3>
      <ul>${eventListMarkup(events)}</ul>
    `;
  }

  function traceEventsForNode(run, nodeId) {
    return run.eventLog.filter((event) => {
      if (event.node === nodeId || event.target === nodeId) return true;
      const edge = event.edge ? run.graph.edges.find((item) => item.id === event.edge) : null;
      return edge && (edge.source === nodeId || edge.target === nodeId);
    });
  }

  function traceEventsForEdge(run, edge) {
    return run.eventLog.filter((event) => {
      if (event.edge === edge.id) return true;
      if (event.type === "graph_revealed" && edge.visibility === "known") return true;
      if (event.type === "incident_started" && run.incident?.cause?.id === edge.id) return true;
      return event.node === edge.source || event.node === edge.target;
    });
  }

  function connectedEdges(run, nodeId) {
    return getVisibleGraph(run).edges.filter((edge) => edge.source === nodeId || edge.target === nodeId);
  }

  function eventListMarkup(events) {
    if (!events.length) return "<li>No run-log facts yet. This entity began in the initial graph.</li>";
    return events.slice(-8).map((event) => `<li>${escapeHtml(event.text)}</li>`).join("");
  }

  namespace.graph = { getVisibleGraph, getPreviewGraph, graphCaption, graphMarkup, graphDetails };
})(window.DepHell = window.DepHell || {});
