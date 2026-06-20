(function bootstrapReports(namespace) {
  const { packages } = namespace.content;

  function packageName(packageId) {
    return packages.find((pkg) => pkg.id === packageId)?.name;
  }

  function installedPackageNames(run) {
    return run.installedPackages.map(packageName).filter(Boolean);
  }

  function buildIdentity(run) {
    if (run.installedPackages.includes("test_suite")) return "observability build with slower, clearer decisions";
    if (run.installedPackages.includes("legacy_auth")) return "legacy compatibility build with audit pressure";
    if (run.installedPackages.includes("compatibility_shim")) return "high-velocity shortcut build with patch debt";
    return "minimal core build";
  }

  function consequenceLine(run, conflict) {
    if (conflict) return `${conflict.source} ${conflict.relation} ${conflict.target}, revealed when Staging Incident loaded.`;
    if (run.techDebt >= 16) return "Shortcut debt raised incident pressure and empowered the staging wave.";
    return "Low graph risk produced a smaller incident; combat was the main failure surface.";
  }

  function renderReleaseReport(run, installed, identity, conflict) {
    return `
      <div><b>Ship Rationale:</b> Staging survived long enough for release.</div>
      <div><b>Architecture:</b> ${identity}</div>
      <div><b>Installed Package:</b> ${installed[0] || "No external package. Terrifying restraint."}</div>
      <div><b>Known Caveat:</b> ${consequenceLine(run, conflict)}</div>
      <div><b>Release Notes:</b>
        <ul>
          <li>Technical Debt closed at ${run.techDebt}.</li>
          <li>Observability closed at ${run.observability} of 5.</li>
          <li>${run.approvals.length ? `${run.approvals[0].id} remains documented for follow-up.` : "No approval hook was granted; compliance has nothing useful to chase."}</li>
        </ul>
      </div>
      <div><b>Timeline:</b>
        <ul>${run.eventLog.slice(-5).map((event) => `<li>${event.text}</li>`).join("")}</ul>
      </div>
    `;
  }

  function renderFailureReport(run, installed, identity, conflict, cause) {
    return `
      <div><b>Primary Cause:</b> ${cause}</div>
      <div><b>Architecture:</b> ${identity}</div>
      <div><b>Installed Package:</b> ${installed[0] || "No external package. Terrifying restraint."}</div>
      <div><b>Traceable Consequence:</b> ${consequenceLine(run, conflict)}</div>
      <div><b>Contributing Factors:</b>
        <ul>
          <li>Technical Debt peaked at ${run.techDebt}.</li>
          <li>Observability ended at ${run.observability} of 5.</li>
          <li>${run.approvals.length ? `${run.approvals[0].id} remained queryable in the incident log.` : "No approval hook was granted; the process found this suspicious."}</li>
        </ul>
      </div>
      <div><b>Timeline:</b>
        <ul>${run.eventLog.slice(-5).map((event) => `<li>${event.text}</li>`).join("")}</ul>
      </div>
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
