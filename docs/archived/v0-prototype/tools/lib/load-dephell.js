"use strict";
// Load the zero-build browser data-scripts (the ones that only build up the
// window.DepHell namespace, with no DOM access at load time) into a headless
// Node context, and return the assembled namespace. This lets tooling — the
// content linter and the balance simulator — read exactly the same content the
// game runs, with no duplication and no build step.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..", "..");

// Only the data/logic scripts. game.js touches the DOM at load and is excluded.
const DATA_SCRIPTS = [
  "scripts/constants.js",
  "scripts/content.js",
  "scripts/run-state.js",
  "scripts/utils.js",
  "scripts/reports.js",
  "scripts/effects.js",
  "scripts/graph.js",
];

function loadDepHell() {
  // Minimal browser-ish sandbox. The data scripts only need `window`.
  const sandbox = { window: {}, console };
  sandbox.window.DepHell = {};
  vm.createContext(sandbox);

  for (const rel of DATA_SCRIPTS) {
    const file = path.join(ROOT, rel);
    const code = fs.readFileSync(file, "utf8");
    vm.runInContext(code, sandbox, { filename: rel });
  }
  return sandbox.window.DepHell;
}

module.exports = { loadDepHell, ROOT, DATA_SCRIPTS };
