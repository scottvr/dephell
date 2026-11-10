#!/usr/bin/env node
// Runs index.html?selftest=1 in headless Chrome and prints the in-page results.
const { spawnSync } = require('child_process');
const path = require('path');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url = 'file://' + path.join(__dirname, '..', 'index.html') + '?selftest=1';
const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--mute-audio', '--no-first-run', '--virtual-time-budget=4000', '--enable-logging=stderr', '--v=0', '--dump-dom', url], { encoding: 'utf8', timeout: 180000, maxBuffer: 1 << 26 });
const m = /<pre id="selftest">([\s\S]*?)<\/pre>/.exec(r.stdout || '');
const errs = (r.stderr || '').split('\n').filter((l) => /CONSOLE|Uncaught/.test(l) && !/AudioContext/.test(l));
if (errs.length) console.log(errs.slice(0, 8).join('\n'));
if (!m) { console.log('FAIL: no self-test output (page crashed before finishing?)'); process.exit(1); }
const text = m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
console.log(text);
process.exit(/FAIL/.test(text) ? 1 : 0);
