// Copy for manual.html: what each enemy, boss and project is, in the manual's voice, plus a field
// note (a tactic, sometimes deliberately vague). Keyed by the ids in content.js; content-lint checks
// that every enemy, boss and project has an entry. DOM-free so the node tools can load it.
(function () {
  const DH = (window.DH = window.DH || {});

  const enemies = {
    bug: {
      what: 'Small, red and numerous. Walks straight at you, a little unsteadily. Most rooms open with a few.',
      note: 'There are always more. Keep moving and keep firing; that is the whole job.',
    },
    nullptr: {
      what: 'Keeps its distance. If you close in it backs off; if you back off it follows; in between it strafes. Every couple of seconds it fires one aimed shot.',
      note: 'It cannot hit what it cannot see. Server racks stop bullets.',
    },
    regression: {
      what: 'Looks like a Bug in purple. When you kill it, it lies still for a moment, then comes back once: weaker, but faster.',
      note: 'It is not fixed until you have fixed it twice. Do not turn your back on the body.',
    },
    race: {
      what: 'Phased most of the time: translucent, untouchable, circling you, passing through walls. Then it flashes white, becomes solid, and lunges in a straight line.',
      note: 'Cover will not save you from this one. Watch for the white flash. Reproducibility not guaranteed.',
    },
    leak: {
      what: 'A slow blue blob that follows you. Every few seconds it grows, up to a point, and leaves a puddle that hurts to stand in.',
      note: 'The longer it lives, the bigger the problem. Fix it early.',
    },
    forkbomb: {
      what: 'Kill it and it splits into two smaller, faster copies. Kill those and they split again.',
      note: 'Anything that hits more than one thing at once is your friend here.',
    },
    deprecated: {
      what: 'Old, grey and slow. Every few seconds it fires a slow ring of eight bullets, each ring offset from the last.',
      note: 'There is always a gap in the ring. Stand in it. Some legacy packages make these slower still.',
    },
    breaking: {
      what: 'Stalks you, stops, takes aim, then charges in a straight line, fast and hard: it hits harder than anything else in a normal room. After a charge it is stunned for a moment.',
      note: 'Step aside when it stops to aim. Let it meet a wall. A stunned Breaking Change takes extra damage.',
    },
    cycle: {
      what: 'Always a pair, flanking you, joined by a beam that hurts. Kill one and it comes back a few seconds later, unless its partner dies too.',
      note: 'Kill them close together. A dash carries you safely through the beam.',
    },
    imposter: {
      what: 'Disguised as a commit: same shape, almost the same green, bobbing gently. When you get close it reveals itself and comes at you quickly.',
      note: 'If a commit is floating where nothing died, it is not a commit.',
    },
    vconflict: {
      what: 'Appears in a room when two of your packages need different majors of its library. It alternates: shielded, charging in a straight line with your bullets bouncing off; then exposed, firing three-shot spreads.',
      note: 'Shoot it when the shield drops. Better still, vet both versions, and it stops existing.',
    },
    boss: {
      what: 'Production. See chapter 7.',
      note: 'It is always the same boss. It is never the same boss.',
    },
  };

  const bosses = {
    friday: {
      when: 'The default: nothing about your architecture stood out. Production is just production.',
      sig: 'Throws confetti: thirty slow bullets in every direction at once.',
      note: 'The confetti is slow. Walk, do not dash, through it.',
    },
    rewrite: {
      when: 'Technical debt.',
      sig: 'REWRITING...: drops puddles of fresh code around where you stand.',
      note: 'Keep moving. The ground you were standing on is being rewritten.',
    },
    breach: {
      when: 'Known CVEs you shipped without vetting.',
      sig: 'Takes aim (a line shows where), then fires a rapid burst of seven shots down it.',
      note: 'When the line appears, leave it.',
    },
    major: {
      when: 'Pinned versions and legacy contracts.',
      sig: 'Charges, three times in a row.',
      note: 'It cannot turn quickly. Neither could you, after the upgrade.',
    },
    monolith: {
      when: 'Sprawl: a big graph. Some packages are more distributed than others.',
      sig: 'Summons a linked Circular Dependency pair, one pair at a time; it is spread thin, so it has less health of its own.',
      note: 'Deal with the pair when it lands, then get back to the boss before the next one.',
    },
    unknown: {
      when: 'Low observability: you never bought the dashboards.',
      sig: 'Vanishes, reappears close by and releases a ring of bullets. You cannot see its health.',
      note: 'Its health bar is somewhere. Keep shooting. Next time, buy a Test Suite.',
    },
  };

  const projects = {
    greenfield: 'The standard sprint, and where to learn. Two rooms to vet at the start, fourteen on the clock: a careful engineer can vet every room and still ship.',
    monolith: 'You start strong: two features already shipped, and their powers on day one. You also start with twelve rooms nobody ever checked, somebody else’s half-finished migration, and their debt.',
    template: 'Twenty rooms to vet before you have written a line, on a clock just long enough to vet them all if you waste nothing. Everything you install leans on the template’s tree, so new packages are cheap and fragile.',
    weekend: 'Nine rooms. Commits to spend. A registry that restocks every two rooms. You will not vet everything. Decide what you can live without.',
  };

  DH.manualCopy = { enemies, bosses, projects };
})();
