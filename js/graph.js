// The dependency graph: the dungeon map and the cause/effect engine in one structure.
// Nodes are rooms. `deps` edges are corridors (east doors); `parents` are the way back (west doors).
(function () {
  const DH = (window.DH = window.DH || {});
  const G = {};

  function newNode(id, kind, def) {
    return {
      id, kind, name: def.name, risk: def.risk || 0, flag: def.flag || null, eco: def.eco || 'core',
      lib: def.lib || null, blurb: def.blurb || def.tag || '', deps: [], parents: [],
      state: 'unvetted', // unvetted | vetted | down
      pinned: false, contained: false, hotfixed: false, visited: false,
      depth: 0, lx: 0, ly: 0, bornTick: 0, downTick: -1, downWhy: '',
    };
  }

  function link(g, parentId, childId) {
    const p = g.nodes[parentId];
    const c = g.nodes[childId];
    if (!p.deps.includes(childId)) p.deps.push(childId);
    if (!c.parents.includes(parentId)) c.parents.push(parentId);
  }

  function ensureDep(g, depId, parentId, tick, added) {
    const def = DH.content.DEPS[depId];
    if (!def) throw new Error('unknown dep ' + depId);
    if (!g.nodes[depId]) {
      const n = newNode(depId, depId === 'runtime' || depId === 'stdlib' ? 'base' : 'dep', def);
      n.bornTick = tick;
      g.nodes[depId] = n;
      added.push(depId);
      link(g, parentId, depId);
      for (const d of def.deps) ensureDep(g, d, depId, tick, added);
    } else {
      link(g, parentId, depId);
    }
  }

  G.make = function () {
    const g = { nodes: {} };
    const app = newNode('app', 'app', { name: 'app', eco: 'core', blurb: 'Your application. It was simple once.' });
    app.state = 'vetted';
    app.visited = true;
    g.nodes.app = app;
    ensureDep(g, 'runtime', 'app', 0, []);
    G.layout(g);
    return g;
  };

  G.addPackage = function (g, pkgId, tick) {
    const def = DH.content.PACKAGES[pkgId];
    const added = [];
    const n = newNode(pkgId, 'pkg', def);
    n.bornTick = tick;
    g.nodes[pkgId] = n;
    added.push(pkgId);
    link(g, 'app', pkgId);
    for (const d of def.deps) ensureDep(g, d, pkgId, tick, added);
    G.layout(g);
    return added;
  };

  // Remove a package and garbage-collect every node only it was holding up.
  G.removePackage = function (g, pkgId) {
    const app = g.nodes.app;
    app.deps = app.deps.filter((d) => d !== pkgId);
    const keep = new Set();
    (function walk(id) {
      if (keep.has(id)) return;
      keep.add(id);
      for (const d of g.nodes[id].deps) walk(d);
    })('app');
    const removed = [];
    for (const id of Object.keys(g.nodes)) {
      if (!keep.has(id)) { removed.push(id); delete g.nodes[id]; }
    }
    for (const id of Object.keys(g.nodes)) {
      const n = g.nodes[id];
      n.parents = n.parents.filter((p) => g.nodes[p]);
      n.deps = n.deps.filter((d) => g.nodes[d]);
    }
    G.layout(g);
    return removed;
  };

  // The node plus everything it transitively requires.
  G.closure = function (g, id, out) {
    out = out || new Set();
    if (out.has(id) || !g.nodes[id]) return out;
    out.add(id);
    for (const d of g.nodes[id].deps) G.closure(g, d, out);
    return out;
  };

  // Everything that transitively requires this node (excluding itself).
  G.dependents = function (g, id) {
    const out = new Set();
    (function up(x) {
      for (const p of g.nodes[x].parents) {
        if (!out.has(p)) { out.add(p); up(p); }
      }
    })(id);
    return out;
  };

  G.packages = (g) => g.nodes.app.deps.filter((d) => g.nodes[d].kind === 'pkg');

  // Which downed node (if any) is taking this package offline? Containers stop the cascade.
  G.downCause = function (g, pkgId) {
    const check = (set) => {
      for (const id of set) {
        const n = g.nodes[id];
        if (n.state === 'down' && (!n.contained || id === pkgId)) return id;
      }
      return null;
    };
    return check(G.closure(g, pkgId)) || check(G.closure(g, 'runtime'));
  };

  G.isHardened = function (g, pkgId) {
    for (const id of G.closure(g, pkgId)) if (g.nodes[id].state !== 'vetted') return false;
    return true;
  };

  G.isIntegrated = (g, pkgId) => g.nodes[pkgId] && g.nodes[pkgId].state === 'vetted';

  // Two nodes sharing a `lib` are two majors of one library: a version conflict.
  G.conflicts = function (g, shims) {
    const byLib = {};
    for (const id of Object.keys(g.nodes)) {
      const n = g.nodes[id];
      if (n.lib) (byLib[n.lib] = byLib[n.lib] || []).push(id);
    }
    const out = [];
    const pkgs = G.packages(g);
    for (const lib of Object.keys(byLib)) {
      const ids = byLib[lib];
      if (ids.length < 2) continue;
      const [a, b] = ids;
      out.push({
        lib, a, b,
        pkgsA: pkgs.filter((p) => G.closure(g, p).has(a)),
        pkgsB: pkgs.filter((p) => G.closure(g, p).has(b)),
        resolved: g.nodes[a].state === 'vetted' && g.nodes[b].state === 'vetted',
        shimmed: !!(shims && shims[lib]),
      });
    }
    return out;
  };

  G.activeConflicts = (g, shims) => G.conflicts(g, shims).filter((c) => !c.resolved && !c.shimmed);

  // What would installing this package do? Used by the registry preview (before any mutation).
  G.preview = function (g, pkgId) {
    const defs = DH.content;
    const fresh = [];
    const shared = [];
    const tree = [];
    const seen = new Set();
    (function walk(id, depth) {
      const exists = !!g.nodes[id];
      const def = defs.DEPS[id] || defs.PACKAGES[id];
      tree.push({ id, depth, exists, name: def.name, risk: def.risk || 0, flag: def.flag || null, repeat: seen.has(id) });
      if (seen.has(id)) return;
      seen.add(id);
      if (depth > 0) (exists ? shared : fresh).push(id);
      if (!exists || depth === 0) for (const d of def.deps) walk(d, depth + 1);
    })(pkgId, 0);
    const conflicts = [];
    for (const id of fresh) {
      const lib = defs.DEPS[id].lib;
      if (!lib) continue;
      for (const other of Object.keys(g.nodes)) {
        if (g.nodes[other].lib === lib && other !== id) {
          conflicts.push({ lib, mine: id, theirs: other, pkgs: G.packages(g).filter((p) => G.closure(g, p).has(other)) });
        }
      }
    }
    const coupled = shared.map((id) => ({ id, pkgs: G.packages(g).filter((p) => G.closure(g, p).has(id)) }));
    return { tree, fresh, shared, conflicts, coupled, rooms: fresh.length + 1 };
  };

  // A room is enterable once something that requires it has been vetted (you resolve top-down).
  G.enterable = function (g, id) {
    const n = g.nodes[id];
    if (!n) return false;
    if (id === 'app' || n.state === 'vetted') return true;
    return n.parents.some((p) => g.nodes[p].state === 'vetted');
  };

  // Layered left-to-right layout: depth = longest path from app, y = leaf order of the primary tree.
  G.layout = function (g) {
    const nodes = g.nodes;
    for (const id of Object.keys(nodes)) nodes[id].depth = 0;
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 64) {
      changed = false;
      for (const id of Object.keys(nodes)) {
        for (const d of nodes[id].deps) {
          if (nodes[d].depth < nodes[id].depth + 1) { nodes[d].depth = nodes[id].depth + 1; changed = true; }
        }
      }
    }
    const placed = new Set();
    let slot = 0;
    (function place(id) {
      placed.add(id);
      const n = nodes[id];
      const kids = n.deps.filter((d) => !placed.has(d) && nodes[d].depth === n.depth + 1);
      if (!kids.length) { n.ly = slot++; return; }
      const ys = [];
      for (const k of kids) {
        if (placed.has(k)) continue;
        place(k);
        ys.push(nodes[k].ly);
      }
      n.ly = ys.length ? (ys[0] + ys[ys.length - 1]) / 2 : slot++;
    })('app');
    for (const id of Object.keys(nodes)) {
      if (!placed.has(id)) nodes[id].ly = slot++;
      nodes[id].lx = nodes[id].depth;
    }
    g.rows = Math.max(1, slot);
    g.cols = 1 + Math.max(...Object.keys(nodes).map((id) => nodes[id].depth));
  };

  DH.Graph = G;
})();
