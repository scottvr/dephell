#!/usr/bin/env node

const childProcess = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "artifacts", "visual-smoke");
const HOST = "127.0.0.1";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
].filter(Boolean);

const SHOTS = [
  { name: "main-desktop", mode: "main", width: 1920, height: 1080 },
  { name: "choice-desktop", mode: "choice", width: 1920, height: 1080 },
  { name: "graph-desktop", mode: "graph", width: 1920, height: 1080 },
  { name: "route-desktop", mode: "route", width: 1920, height: 1080 },
  { name: "report-desktop", mode: "report", width: 1920, height: 1080 },
];

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
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
    if (message.error) {
      pending.reject(new Error(`${message.error.message}: ${message.error.data || ""}`));
    } else {
      pending.resolve(message.result || {});
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
}

async function main() {
  if (typeof WebSocket === "undefined") {
    throw new Error("This visual smoke script requires a Node runtime with global WebSocket support.");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const chromePath = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!chromePath) {
    throw new Error("Could not find Chrome. Set CHROME_PATH to a Chromium-compatible browser executable.");
  }

  const appPort = await getFreePort();
  const debugPort = await getFreePort();
  const server = await startStaticServer(appPort);
  const userDataDir = path.join("/private/tmp", `dephell-visual-smoke-${process.pid}`);
  const chrome = launchChrome(chromePath, debugPort, userDataDir);

  try {
    const wsUrl = await createPageWsUrl(debugPort, chrome);
    const cdp = await connectCdp(wsUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    for (const shot of SHOTS) {
      await captureShot(cdp, appPort, shot);
    }

    console.log(`Visual smoke screenshots written to ${path.relative(ROOT, OUT_DIR)}`);
  } finally {
    chrome.process.kill("SIGTERM");
    await waitForProcessExit(chrome.process, 2500);
    server.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Warning: could not remove temporary Chrome profile ${userDataDir}: ${error.message}`);
    }
  }
}

function launchChrome(chromePath, debugPort, userDataDir) {
  const stderr = [];
  const process = childProcess.spawn(chromePath, [
    "--headless=new",
    "--disable-extensions",
    `--remote-debugging-port=${debugPort}`,
    "--remote-debugging-address=127.0.0.1",
    "--remote-allow-origins=*",
    `--user-data-dir=${userDataDir}`,
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-default-browser-check",
    "--no-first-run",
    "about:blank",
  ], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  process.stderr.on("data", (chunk) => {
    stderr.push(String(chunk));
    if (stderr.length > 20) stderr.shift();
  });
  return { process, stderr };
}

async function captureShot(cdp, appPort, shot) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: shot.width,
    height: shot.height,
    deviceScaleFactor: 1,
    mobile: shot.width < 700,
  });

  const url = `http://${HOST}:${appPort}/index.html?visualSmoke=${encodeURIComponent(shot.mode)}`;
  await cdp.send("Page.navigate", { url });
  await waitForPageReady(cdp);
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  fs.writeFileSync(path.join(OUT_DIR, `${shot.name}.png`), Buffer.from(result.data, "base64"));
  console.log(`captured ${shot.name}.png`);
}

async function waitForPageReady(cdp) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = await cdp.send("Runtime.evaluate", {
      expression: "document.readyState === 'complete'",
      returnByValue: true,
    });
    if (ready.result.value) break;
    await delay(50);
  }

  await cdp.send("Runtime.evaluate", {
    expression: "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
    awaitPromise: true,
  });
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
      if (version.webSocketDebuggerUrl) {
        browserWsUrl = version.webSocketDebuggerUrl;
        break;
      }
    } catch (_error) {
      // Chrome is still starting.
    }
    await delay(100);
  }

  if (!browserWsUrl) {
    throw new Error(`Timed out waiting for Chrome DevTools endpoint.\n${chrome.stderr.join("")}`);
  }

  const browser = await connectCdp(browserWsUrl);
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const targets = await fetchJson(listUrl);
    const page = targets.find((target) => target.id === targetId && target.webSocketDebuggerUrl);
    if (page) return page.webSocketDebuggerUrl;
    await delay(50);
  }

  throw new Error(`Timed out waiting for visual smoke page target.\n${chrome.stderr.join("")}`);
}

function startStaticServer(port) {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const filePath = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));

    if (!filePath.startsWith(ROOT)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream",
      });
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
    server.listen(0, HOST, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForProcessExit(process, timeoutMs) {
  if (process.exitCode !== null || process.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs);
    process.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
