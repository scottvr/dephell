(function bootstrapUtils(namespace) {
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function shortName(name) {
    const labels = {
      "Compatibility Shim": "Compat Shim",
      "Modern Crypto": "Mod Crypto",
      "Feature Flag": "Flag",
    };
    return (labels[name] || name).slice(0, 12);
  }

  namespace.utils = { rectsOverlap, clamp, escapeHtml, shortName };
})(window.DepHell = window.DepHell || {});
