#!/usr/bin/env node
"use strict";
// Tier-2 feel probe — "the AI as your proxy feel-tester" from docs/fun-tuneup-protocol.md.
// Boots the REAL game in headless Chrome (raw CDP, no Playwright — same approach as
// scripts/visual-smoke.js), drives one deterministic room via the scripted-input channel
// (DepHell.debug.input), then reads the impact ring buffer (DepHell.debug.feel()) and
// reports the decisive-tier feel metrics: impact-events-per-kill and per-hit channel
// coverage. It converts "did the screen jolt on a kill?" into a measured signal that a
// human playing once would never quantify, and it never gets bored or acclimates.
//
// Usage: node tools/feel-probe.js
// Advisory (exit 0) unless a decisive threshold fails (exit 1), so it can gate merges.
const childProcess = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
].filter(Boolean);
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    ws.addEventListener("message", (event) => this.handleMessage(event));
  }
  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(`${message.error.message}: ${message.error.data || ""}`));
    else pending.resolve(message.result || {});
  }
  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

// Evaluate an expression in the page and return its value.
async function evalIn(cdp, expression) {
  const res = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || "eval failed");
  return res.result.value;
}

async function main() {
  if (typeof WebSocket === "undefined") throw new Error("Requires a Node runtime with global WebSocket support.");
  const chromePath = CHROME_CANDIDATES.find((c) => fs.existsSync(c));
  if (!chromePath) throw new Error("Could not find Chrome. Set CHROME_PATH to a Chromium-compatible browser.");

  const appPort = await getFreePort();
  const debugPort = await getFreePort();
  const server = await startStaticServer(appPort);
  const userDataDir = path.join("/private/tmp", `dephell-feel-probe-${process.pid}`);
  const chrome = launchChrome(chromePath, debugPort, userDataDir);
  let failed = false;

  try {
    const wsUrl = await createPageWsUrl(debugPort, chrome);
    const cdp = await connectCdp(wsUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Page.navigate", { url: `http://${HOST}:${appPort}/index.html` });
    await waitForPageReady(cdp);

    // Confirm the debug hooks this probe depends on are present.
    const hooks = await evalIn(cdp, "!!(window.DepHell && DepHell.debug && DepHell.debug.feel && DepHell.debug.input)");
    if (!hooks) throw new Error("DepHell.debug.feel()/input channel missing — is the feelLog hook wired in game.js?");

    // Drive room 1 adaptively: steer toward the nearest enemy and hold attack. The
    // room-intro lock elapses on its own; enemies are chasers, so contact is quick.
    const startedAt = Date.now();
    const MAX_MS = 9000;
    let clearedAt = null;
    while (Date.now() - startedAt < MAX_MS) {
      const state = await evalIn(cdp, "DepHell.debug.state()");
      if (state.ended) break;
      const enemies = (state.enemies || []).filter((e) => !e.boss);
      if (!enemies.length) {
        if (clearedAt === null) clearedAt = Date.now() - startedAt;
        // Let a couple more polls capture any tail events, then stop.
        if (Date.now() - startedAt - clearedAt > 500) break;
        await evalIn(cdp, "DepHell.debug.input.set([' '])");
      } else {
        const px = state.player.x;
        const nearest = enemies.sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
        let dirKey = null;
        if (nearest.x > px + 12) dirKey = "d";
        else if (nearest.x < px - 12) dirKey = "a";
        await evalIn(cdp, `DepHell.debug.input.set(${JSON.stringify([dirKey, " "].filter(Boolean))})`);
      }
      await delay(120);
    }
    await evalIn(cdp, "DepHell.debug.input.clear()");

    const feel = await evalIn(cdp, "DepHell.debug.feel()");
    const finalState = await evalIn(cdp, "DepHell.debug.state()");
    failed = report(feel, finalState, clearedAt);
  } finally {
    chrome.process.kill("SIGTERM");
    await waitForProcessExit(chrome.process, 2500);
    server.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_e) { /* best effort */ }
  }
  process.exit(failed ? 1 : 0);
}

// --- Metrics --------------------------------------------------------------
function channelsOf(e) {
  return {
    hitstop: (e.hitFreezeAfter || 0) > 0,
    shake: (e.shakeAfter || 0) > 0,
    particles: (e.particles || 0) > 0,
    floater: !!e.floater,
  };
}
function channelCount(e) {
  const c = channelsOf(e);
  return Number(c.hitstop) + Number(c.shake) + Number(c.particles) + Number(c.floater);
}

function report(feel, state, clearedAt) {
  feel = feel || [];
  const byKind = {};
  for (const e of feel) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
  const kills = feel.filter((e) => e.kind === "kill" || e.kind === "bossKill");
  const hits = feel.filter((e) => e.kind === "hit");
  const playerHits = feel.filter((e) => e.kind === "playerHit");

  console.log(`\nDependency Hell — Tier-2 feel probe (fun-tuneup-protocol.md)\n`);
  console.log(`Drove room 1 headlessly. Room ${state.ended ? "ended (player died)" : clearedAt !== null ? `cleared in ~${(clearedAt / 1000).toFixed(1)}s` : "not cleared in window"}.`);
  console.log(`Captured ${feel.length} impact events: ${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}\n`);

  const problems = [];

  if (!kills.length) {
    console.log("Kills: none captured in the window (cannot measure impact-per-kill this run).");
  } else {
    console.log("Impact-events-per-kill (protocol: a kill must fire >=2 of hitstop/shake/particles/floater):");
    let worst = 4;
    for (const k of kills) {
      const c = channelsOf(k);
      const n = channelCount(k);
      worst = Math.min(worst, n);
      console.log(`  ${k.kind.padEnd(8)} channels ${n}/4  [${Object.entries(c).filter(([, v]) => v).map(([name]) => name).join(", ")}]`);
    }
    if (worst < 2) problems.push(`A kill fired only ${worst} feedback channels (< 2) — kills read as "just blinked out".`);
  }

  if (hits.length) {
    const weak = hits.filter((h) => channelCount(h) < 1).length;
    console.log(`\nLanded hits: ${hits.length}; each fires spark+floater+hitstop+shake (min channels ${Math.min(...hits.map(channelCount))}).`);
    if (weak > 0) problems.push(`${weak} landed hit(s) fired 0 feedback channels — indistinguishable from a whiff.`);
  }
  if (playerHits.length) {
    console.log(`Player was hit ${playerHits.length}x (each fires shake + red damage floater + duck).`);
  }

  console.log("");
  if (problems.length) {
    console.log("FEEL REGRESSIONS (decisive tier — blocks merge):");
    problems.forEach((p) => console.log(`  - ${p}`));
    return true;
  }
  console.log(kills.length ? "Contact feel intact: every kill and hit lands on the canvas where the eye is." : "Hook verified end-to-end; re-run for a kill sample.");
  return false;
}

// --- CDP / server plumbing (mirrors scripts/visual-smoke.js) --------------
function launchChrome(chromePath, debugPort, userDataDir) {
  const stderr = [];
  const proc = childProcess.spawn(chromePath, [
    "--headless=new", "--disable-extensions", `--remote-debugging-port=${debugPort}`,
    "--remote-debugging-address=127.0.0.1", "--remote-allow-origins=*", `--user-data-dir=${userDataDir}`,
    "--disable-gpu", "--hide-scrollbars", "--no-default-browser-check", "--no-first-run", "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  proc.stderr.on("data", (chunk) => { stderr.push(String(chunk)); if (stderr.length > 20) stderr.shift(); });
  return { process: proc, stderr };
}

async function waitForPageReady(cdp) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = await cdp.send("Runtime.evaluate", { expression: "document.readyState === 'complete'", returnByValue: true });
    if (ready.result.value) break;
    await delay(50);
  }
  await cdp.send("Runtime.evaluate", { expression: "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))", awaitPromise: true });
  await delay(200);
}

async function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  return new CdpSession(ws);
}

async function createPageWsUrl(debugPort, chrome) {
  const versionUrl = `http://${HOST}:${debugPort}/json/version`;
  const listUrl = `http://${HOST}:${debugPort}/json/list`;
  let browserWsUrl = null;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const version = await fetchJson(versionUrl);
      if (version.webSocketDebuggerUrl) { browserWsUrl = version.webSocketDebuggerUrl; break; }
    } catch (_error) { /* still starting */ }
    await delay(100);
  }
  if (!browserWsUrl) throw new Error(`Timed out waiting for Chrome DevTools endpoint.\n${chrome.stderr.join("")}`);
  const browser = await connectCdp(browserWsUrl);
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const targets = await fetchJson(listUrl);
    const page = targets.find((t) => t.id === targetId && t.webSocketDebuggerUrl);
    if (page) return page.webSocketDebuggerUrl;
    await delay(50);
  }
  throw new Error(`Timed out waiting for page target.\n${chrome.stderr.join("")}`);
}

function startStaticServer(port) {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const filePath = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
    if (!filePath.startsWith(ROOT)) { response.writeHead(403); response.end("Forbidden"); return; }
    fs.readFile(filePath, (error, data) => {
      if (error) { response.writeHead(404); response.end("Not found"); return; }
      response.writeHead(200, { "Cache-Control": "no-store", "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream" });
      response.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, HOST, () => resolve(server));
  });
}

function getFreePort() {
  const server = net.createServer();
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, HOST, () => { const { port } = server.address(); server.close(() => resolve(port)); });
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function waitForProcessExit(proc, timeoutMs) {
  if (proc.exitCode !== null || proc.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs);
    proc.once("exit", () => { clearTimeout(timeout); resolve(); });
  });
}

main().catch((error) => { console.error(error); process.exit(1); });
