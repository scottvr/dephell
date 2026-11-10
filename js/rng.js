// Seeded RNG. Everything that affects gameplay draws from run.rng so a seed replays.
(function () {
  const DH = (window.DH = window.DH || {});

  DH.makeRng = function (seed) {
    let a = seed >>> 0 || 1;
    const next = function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const rng = {
      next,
      range: (lo, hi) => lo + next() * (hi - lo),
      int: (n) => Math.floor(next() * n),
      chance: (p) => next() < p,
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      shuffle(arr) {
        const out = arr.slice();
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          const tmp = out[i];
          out[i] = out[j];
          out[j] = tmp;
        }
        return out;
      },
      weighted(items, weightOf) {
        let total = 0;
        for (const it of items) total += weightOf(it);
        if (total <= 0) return null;
        let roll = next() * total;
        for (const it of items) {
          roll -= weightOf(it);
          if (roll <= 0) return it;
        }
        return items[items.length - 1];
      },
    };
    return rng;
  };

  DH.hashStr = function (s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  DH.seedToCode = (seed) => (seed >>> 0).toString(16).toUpperCase();
})();
