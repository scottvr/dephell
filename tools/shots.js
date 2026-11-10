#!/usr/bin/env node
// Screenshot harness: renders ?shot= states with headless Chrome into shots/.
//   node tools/shots.js [name ...]      (default: all)      CHROME_PATH overrides the browser
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const all = ['title', 'hub', 'registry', 'registry2', 'combat', 'combat2', 'incident', 'hub2', 'map', 'deploy', 'boss', 'postmortem', 'release', 'help'];
const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const seedArg = process.argv.find((a) => a.startsWith('--seed='));
const outDir = path.join(root, 'shots');
fs.mkdirSync(outDir, { recursive: true });

for (const name of names.length ? names : all) {
  const out = path.join(outDir, name + '.png');
  const url = 'file://' + path.join(root, 'index.html') + '?shot=' + name + (seedArg ? '&seed=' + seedArg.split('=')[1] : '');
  const r = spawnSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run',
    '--window-size=1280,720', '--virtual-time-budget=2500', '--enable-logging=stderr', '--v=0',
    '--screenshot=' + out, url,
  ], { encoding: 'utf8', timeout: 120000 });
  const errs = (r.stderr || '').split('\n').filter((l) => /CONSOLE|Uncaught|TypeError|ReferenceError/.test(l));
  console.log((fs.existsSync(out) ? 'ok   ' : 'FAIL ') + name + (errs.length ? '\n  ' + errs.slice(0, 6).join('\n  ') : ''));
}
