(function bootstrapReports(namespace) {
  const { packages } = namespace.content;

  const BOSS_NAMES = {
    major_version_upgrade: "The Major Version Upgrade",
    distributed_monolith: "The Distributed Monolith",
  };

  function packageName(packageId) {
    return packages.find((pkg) => pkg.id === packageId)?.name;
  }

  function installedPackageNames(run) {
    return run.installedPackages.map(packageName).filter(Boolean);
  }

  // Build identity emerges from installed tags, graph topology, resources, and
  // incident history together — a system description, not a bag of item names.
  function buildIdentity(run) {
    const pkgs = run.installedPackages;
    const has = (id) => pkgs.includes(id);
    const tags = pkgs.flatMap((id) => packages.find((p) => p.id === id)?.tags || []);
    const observabilityTags = tags.filter((t) => t === "observability").length;
    if (has("containerization") || run.graph.edges.some((e) => e.relation === "isolates")) return "isolated container stack that keeps its blast radius small";
    if (has("modern_crypto") || has("security_scanner")) return "security-forward build hardened against CVE and audit pressure";
    if (observabilityTags >= 2 || has("logging_framework") || has("test_suite")) return "high-observability build that trades raw damage for foresight";
    if (has("legacy_auth")) return "legacy compatibility build carrying audit pressure and old crypto";
    if (has("compatibility_shim") || run.techDebt >= 40) return "high-velocity shortcut build glued together with patch debt";
    if (has("pin_version") || run.pins.length) return "pinned build deferring a major version bump it will have to pay";
    if (has("feature_flag")) return "flag-controlled build with deliberate configuration drift";
    return "minimal core build with terrifying restraint";
  }

  function consequenceLine(run, conflict) {
    if (conflict) return `${conflict.source} ${conflict.relation} ${conflict.target}, revealed when the pipeline went red.`;
    const upgradeRisk = run.risks.find((r) => r.kind === "upgrade");
    if (run.selectedBoss === "distributed_monolith") return `Coupling accumulated faster than isolation; the Distributed Monolith read every shared edge.`;
    if (upgradeRisk) return `${upgradeRisk.reason} — deferred upgrade pressure came due at the release.`;
    if (run.featureFlags.length) return `${run.featureFlags.length} Feature Flag ${run.featureFlags.length === 1 ? "override" : "overrides"} reduced immediate pressure and left configuration drift.`;
    if (run.techDebt >= 16) return "Shortcut debt raised incident pressure and empowered the staging wave.";
    return "Low graph risk produced a smaller incident; combat was the main failure surface.";
  }

  function bossReportLines(run) {
    if (!run.selectedBoss) return ["No boss was reached."];
    const snap = run.bossScoreSnapshot || {};
    const st = run.bossStats || {};
    const lines = [`${BOSS_NAMES[run.selectedBoss] || run.selectedBoss} — ${st.defeated ? "defeated" : "not defeated"}.`];
    if (snap.major !== undefined) lines.push(`Selected on accumulated pressure: upgrade ${snap.major} vs coupling ${snap.monolith} (threshold ${snap.threshold}).`);
    if (st.safeWindows) lines.push(`Struck ${st.safeWindows} compatibility window${st.safeWindows === 1 ? "" : "s"}${st.rolledBack ? `; rolled back ${st.rolledBack} time${st.rolledBack === 1 ? "" : "s"}` : ""}.`);
    if (run.bossMutations && run.bossMutations.length) lines.push(`Mutation${run.bossMutations.length > 1 ? "s" : ""}: ${run.bossMutations.join(", ")}.`);
    return lines;
  }

  function stateLines(run) {
    const lines = [
      `Technical Debt closed at ${run.techDebt}.`,
      `Observability closed at ${run.observability} of 5.`,
    ];
    if (run.risks.length) lines.push(`Registered risks: ${run.risks.slice(0, 3).map((r) => `${r.kind} on ${r.target}`).join(", ")}.`);
    if (run.pins.length) lines.push(`Pinned nodes: ${run.pins.join(", ")}.`);
    if (run.resolvedIncidents.length) lines.push(`Incident calls: ${run.resolvedIncidents.map((r) => `${r.incident} → ${r.resolution}`).join(", ")}.`);
    if (run.featureFlags.length) lines.push(`${run.featureFlags.length} Feature Flag ${run.featureFlags.length === 1 ? "override was" : "overrides were"} documented for cleanup.`);
    const approval = run.approvals[0];
    lines.push(approval ? `Approval on file: ${approval.id} for ${approval.target}, still queryable.` : "No approval hook was granted; compliance has nothing to chase.");
    return lines;
  }

  function bullets(items) {
    return items.map((line) => `<li>${line}</li>`).join("");
  }

  function renderReleaseReport(run, installed, identity, conflict) {
    return `
      <div><b>Ship Rationale:</b> The pager went quiet long enough to tag a release.</div>
      <div><b>Final Architecture:</b> ${identity}</div>
      <div><b>Installed:</b> ${installed.join(", ") || "No external packages. Terrifying restraint."}</div>
      <div><b>Boss:</b><ul>${bullets(bossReportLines(run))}</ul></div>
      <div><b>Known Caveat:</b> ${consequenceLine(run, conflict)}</div>
      <div><b>Release Notes:</b><ul>${bullets(stateLines(run))}</ul></div>
      <div><b>Timeline:</b><ul>${bullets(run.eventLog.slice(-6).map((event) => event.text))}</ul></div>
    `;
  }

  function renderFailureReport(run, installed, identity, conflict, cause) {
    return `
      <div><b>Primary Cause:</b> ${cause}</div>
      <div><b>Final Architecture:</b> ${identity}</div>
      <div><b>Installed:</b> ${installed.join(", ") || "No external packages. Terrifying restraint."}</div>
      ${run.selectedBoss ? `<div><b>Boss:</b><ul>${bullets(bossReportLines(run))}</ul></div>` : ""}
      <div><b>Traceable Consequence:</b> ${consequenceLine(run, conflict)}</div>
      <div><b>Contributing Factors:</b><ul>${bullets(stateLines(run))}</ul></div>
      <div><b>Timeline:</b><ul>${bullets(run.eventLog.slice(-6).map((event) => event.text))}</ul></div>
    `;
  }

  namespace.reports = {
    packageName,
    installedPackageNames,
    buildIdentity,
    consequenceLine,
    renderReleaseReport,
    renderFailureReport,
  };
})(window.DepHell = window.DepHell || {});
