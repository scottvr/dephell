#!/usr/bin/env node
// How much CPU does one simulation step cost? (Rendering is separate: ~300 fillRect/drawImage at 320x192.)
const path = require('path');
globalThis.window = globalThis;
for (const f of ['rng', 'content', 'graph', 'sim', 'reports', 'bot']) require(path.join(__dirname, '..', 'js', f + '.js'));
const DH = globalThis.DH, S = DH.Sim;
let steps = 0, worst = 0, total = 0;
for (let seed = 1; seed <= 6; seed++) {
  const game = S.newGame(seed * 977);
  let guard = 0;
  while (game.run.phase !== 'won' && game.run.phase !== 'lost' && guard++ < 60 * 60 * 12) {
    game.events.length = 0;
    if (game.room.cleared && game.run.phase === 'run') { if (!DH.Bot.meta(game)) S.step(game, 1 / 60, { mx: 0, my: 0 }); continue; }
    const inp = DH.Bot.input(game);
    const t0 = process.hrtime.bigint();
    S.step(game, 1 / 60, inp);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    total += ms; steps++; if (ms > worst) worst = ms;
  }
}
console.log(`sim step: avg ${(total / steps).toFixed(3)} ms, worst ${worst.toFixed(2)} ms over ${steps} combat steps (budget at 60 fps: 16.7 ms)`);
