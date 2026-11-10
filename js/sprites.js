// Pixel art, authored as ASCII so the game stays zero-build and asset-free.
// Each sprite: rows of palette characters ('.' = transparent). Pre-rendered to canvases at load.
(function () {
  const DH = (window.DH = window.DH || {});
  const SP = {};
  const cache = {};

  const PAL = {
    c: '#3ef0e0', C: '#1fa89e', w: '#eaffff', k: '#062226', r: '#ff4d5e', R: '#a01828', p: '#b06bff', P: '#6a35b8',
    m: '#ff5ad0', M: '#a02a80', y: '#ffe14a', Y: '#b89a1e', g: '#8a8f98', G: '#4a4f58', a: '#ffc24a', o: '#ff9a3d',
    O: '#b85a12', n: '#5bff8a', N: '#22a04a', t: '#3ef0e0', T: '#167a72', b: '#4ab8ff', B: '#1e5fa8', d: '#0e1c20',
    s: '#31454a', S: '#1c2b2f', l: '#5bff8a', e: '#ff4d5e', h: '#c8d2d6', W: '#ffffff', x: '#000000',
  };

  const ART = {
    player0: [
      '....cccc....',
      '...cccccc...',
      '..cwwwwwwc..',
      '..cwkwwkwc..',
      '..cwwwwwwc..',
      '...cccccc...',
      '..CccccccC..',
      '.CCccccccCC.',
      '.CCccccccCC.',
      '..CccccccC..',
      '...cc..cc...',
      '...cc..cc...',
      '...CC..CC...',
    ],
    player1: [
      '....cccc....',
      '...cccccc...',
      '..cwwwwwwc..',
      '..cwkwwkwc..',
      '..cwwwwwwc..',
      '...cccccc...',
      '..CccccccC..',
      '.CCccccccCC.',
      '.CCccccccCC.',
      '..CccccccC..',
      '...cc..cc...',
      '..cc....cc..',
      '..CC....CC..',
    ],
    bug0: [
      '.r........r.',
      '..r......r..',
      '...rrrrrr...',
      '..rrrrrrrr..',
      '.rrwrrrrwrr.',
      'rrrkrrrrkrrr',
      'r.rrrrrrrr.r',
      'r.r......r.r',
      '...rr..rr...',
    ],
    bug1: [
      '..r......r..',
      '...r....r...',
      '...rrrrrr...',
      '..rrrrrrrr..',
      '.rrwrrrrwrr.',
      'rrrkrrrrkrrr',
      '.rrrrrrrrrr.',
      '..r......r..',
      '.r........r.',
    ],
    nullptr0: [
      '...mmmm...',
      '..m....mm.',
      '.m....mm.m',
      '.m...mm..m',
      '.m..mm...m',
      '.m.mm....m',
      '.mmm....m.',
      '..mm...m..',
      '...mmmm...',
    ],
    race0: [
      '.....yyy..',
      '....yyy...',
      '...yyy....',
      '..yyyyyy..',
      '.....yyy..',
      '....yyy...',
      '...yyy....',
      '..yyy.....',
      '.yy.......',
      '.y........',
    ],
    deprecated0: [
      '...gggggggg...',
      '..gggggggggg..',
      '.gggggggggggg.',
      '.ggkkkkkkkkgg.',
      '.ggkaakkaakgg.',
      '.ggkakkkkakgg.',
      '.ggkkkaakkkgg.',
      '.ggkkkkkkkkgg.',
      '.gggggggggggg.',
      '.gGGggggggGGg.',
      '.gggggggggggg.',
      'GGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGG',
    ],
    breaking0: [
      'o............o',
      'oo..........oo',
      '.ooo......ooo.',
      '..oooooooooo..',
      '..oooooooooo..',
      '.oowwoooowwoo.',
      '.ookwoooowkoo.',
      '.oooooooooooo.',
      '..ooooOOoooo..',
      '..oooooooooo..',
      '...ooo..ooo...',
      '...OO....OO...',
    ],
    forkbomb0: [
      '.nn..nn..nn.',
      '.nn..nn..nn.',
      '.nn..nn..nn.',
      '..nn.nn.nn..',
      '...nnnnnn...',
      '....nnnn....',
      '...nnnnnn...',
      '..nnnnnnnn..',
      '..nnknnknn..',
      '..nnnnnnnn..',
      '...NnnnnN...',
      '....NNNN....',
    ],
    cycle0: [
      '....tttt....',
      '..tttttttt..',
      '.ttt....ttt.',
      '.tt......tt.',
      'tt...ww...tt',
      'tt..wwww..tt',
      'tt..wwww..tt',
      'tt...ww...tt',
      '.tt......tt.',
      '.ttt....ttt.',
      '..tttttttt..',
      '....tttt....',
    ],
    imposter0: [
      '....nn....',
      '...nnnn...',
      '..nnnnnn..',
      '.nnWnnWnn.',
      '.nnknnknn.',
      '.nnnnnnnn.',
      '.nWrWrWrn.',
      '..nrrrrn..',
      '...nnnn...',
      '....nn....',
    ],
    commit: [
      '...n...',
      '..nnn..',
      '.nnWnn.',
      'nnWnnnn',
      '.nnnnN.',
      '..nNN..',
      '...N...',
    ],
    heal: [
      '.hhhhhh..',
      '.hrrrrhhh',
      '.hrrrrh.h',
      '.hrrrrhhh',
      '.hrrrrh..',
      '.hhhhhh..',
      '..GGGG...',
    ],
    duck: [
      '..yy...',
      '.yyky..',
      '.yyyoo.',
      'yyyyy..',
      'yyyyyy.',
      '.yyyy..',
    ],
    rack: [
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SsddddddddddddsS',
      'SsdlddddddddedsS',
      'SsddddddddddddsS',
      'SssssssssssssssS',
      'SsddddddddddddsS',
      'SsdddlddddddddsS',
      'SsddddddddddddsS',
      'SssssssssssssssS',
      'SsddddddddddddsS',
      'SsdlddddddadddsS',
      'SsddddddddddddsS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'dddddddddddddddd',
    ],
    terminal: [
      '..ssssssssssssssss..',
      '.sSSSSSSSSSSSSSSSSs.',
      '.sSkkkkkkkkkkkkkkSs.',
      '.sSknnnkkkkkkkkkkSs.',
      '.sSkkkkkkkkkkkkkkSs.',
      '.sSknnnnnnkkkkkkkSs.',
      '.sSkkkkkkkkkkkkkkSs.',
      '.sSknnnnkkkkkkkkkSs.',
      '.sSkkkkkkkkkkkkkkSs.',
      '.sSknnkkkkkkkkkkkSs.',
      '.sSkkkkkkkkkkkkkkSs.',
      '.sSSSSSSSSSSSSSSSSs.',
      '..ssssssssssssssss..',
      '.......ssssss.......',
      '.......ssssss.......',
      '.....ssssssssss.....',
      '....SSSSSSSSSSSS....',
    ],
    boss: [
      '........................',
      '..hh................hh..',
      '..hhh..............hhh..',
      '...hhssssssssssssssshh..',
      '....ssssssssssssssss....',
      '...ssddddddddddddddss...',
      '...sdllddllddaaddllds...',
      '...ssddddddddddddddss...',
      '...ssssssssssssssssss...',
      '...sseeeesssssseeeess...',
      '...sseWWesssssseWWess...',
      '...sseeeesssssseeeess...',
      '...ssssssssssssssssss...',
      '...ssddddddddddddddss...',
      '...sdllddaaddllddllds...',
      '...ssddddddddddddddss...',
      '...ssssssssssssssssss...',
      '...sskkkkkkkkkkkkkkss...',
      '...sskWkWkWkWkWkWkkss...',
      '...sskkWkWkWkWkWkkkss...',
      '...ssssssssssssssssss...',
      '....ssssssssssssssss....',
      '....ss....ssss....ss....',
      '...sss....ssss....sss...',
    ],
  };

  function render(rows, pal, solid) {
    const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      ctx.fillStyle = solid || pal[ch] || '#f0f';
      ctx.fillRect(x, y, 1, 1);
    }
    return cv;
  }

  // name, optional palette overrides (recolors), optional solid color (hit flash)
  SP.get = function (name, swap, solid) {
    const key = name + '|' + (swap ? JSON.stringify(swap) : '') + '|' + (solid || '');
    if (!cache[key]) cache[key] = render(ART[name], swap ? Object.assign({}, PAL, swap) : PAL, solid);
    return cache[key];
  };
  SP.has = (name) => !!ART[name];

  // ---------------------------------------------------------------- 3x5 pixel font
  const F = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
    9: '111101111001110', '.': '000000000000010', ',': '000000000010100', ':': '000010000010000', '-': '000000111000000',
    '+': '000010111010000', '!': '010010010000010', '?': '110001010000010', '/': '001001010100100', '%': '101001010100101',
    '[': '110100100100110', ']': '011001001001011', '(': '010100100100010', ')': '010001001001010', '>': '100010001010100',
    '<': '001010100010001', '=': '000111000111000', '*': '000101010101000', _: '000000000000111', '#': '101111101111101',
    "'": '010010000000000', '@': '111101111100011', ' ': '000000000000000',
  };
  const ORDER = Object.keys(F);
  const atlases = {};
  function atlas(color) {
    if (atlases[color]) return atlases[color];
    const cv = document.createElement('canvas');
    cv.width = ORDER.length * 4; cv.height = 5;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = color;
    ORDER.forEach((ch, i) => {
      const bits = F[ch];
      for (let k = 0; k < 15; k++) if (bits[k] === '1') ctx.fillRect(i * 4 + (k % 3), (k / 3) | 0, 1, 1);
    });
    return (atlases[color] = cv);
  }
  const INDEX = {};
  ORDER.forEach((ch, i) => { INDEX[ch] = i; });

  SP.textWidth = (str, scale) => str.length * 4 * (scale || 1) - (scale || 1);
  // align: 0 left, 0.5 center, 1 right
  SP.text = function (ctx, str, x, y, color, scale, align) {
    scale = scale || 1;
    str = String(str).toUpperCase();
    const at = atlas(color || '#eaffff');
    x = Math.round(x - (align || 0) * SP.textWidth(str, scale));
    y = Math.round(y);
    for (let i = 0; i < str.length; i++) {
      const idx = INDEX[str[i]];
      if (idx != null && str[i] !== ' ') ctx.drawImage(at, idx * 4, 0, 3, 5, x + i * 4 * scale, y, 3 * scale, 5 * scale);
    }
  };

  DH.Sprites = SP;
})();
