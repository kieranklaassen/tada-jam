import { beakTip, BIRD_HEAD, BIRD_TAIL, FROG_HEAD, FROG_MOUTH, GNOME_BACK, GNOME_HAND, GNOME_NOSE, hold, lerp, type Act } from './acts'
import { TAU, bump, ease, span } from './rig'

// The bank grid, first half: what the gnome, the frog, the kingfisher and the
// water do with a mast, a leaf and a feather. One act a cell, each with its
// own motion and its own sounds, and each gives the thing back.

// --- A mast: the twig, the stalk or the stem ----------------------------------

/** The gnome takes it as a fishing rod and casts at nothing. Two swishes. */
export const mastGnome: Act = {
  id: 'mast:gnome', length: 2.1, who: ['gnome'], leaves: 'arc',
  cues: [[0.45, 'swish'], [1.2, 'swish', 1.25]],
  pose(k, _t, s, p, a) {
    const cast = bump(k, 0.12, 0.42) + bump(k, 0.48, 0.8)
    const back = span(k, 0.05, 0.2) - span(k, 0.85, 1)
    s.gnome.armL = 0.4 + 0.6 * cast
    s.gnome.armR = 0.2
    s.gnome.lean = -0.18 * back + 0.3 * cast
    s.gnome.mouth = 0.6
    s.gnome.hatTilt = -0.4 * cast
    hold(p, a.gnome.x + GNOME_HAND.x - 30 - 50 * cast, a.gnome.y + GNOME_HAND.y - 60 - 30 * cast, -0.5 - 1.1 * cast)
  },
}

/** The frog bites the end and pulls; the twig bends and springs back. A twang. */
export const mastFrog: Act = {
  id: 'mast:frog', length: 2, who: ['frog'], leaves: 'arc',
  cues: [[0.12, 'chomp'], [1.25, 'twang']],
  pose(k, t, s, p, a) {
    const pull = ease(k, 0.1, 0.6) * (1 - span(k, 0.62, 0.66))
    const sprung = span(k, 0.62, 1)
    s.frog.mouth = k < 0.06 ? 1 : 0.25 + 0.75 * span(k, 0.62, 0.68) * (1 - sprung)
    s.frog.tilt = -0.3 * pull
    s.frog.dx = -26 * pull
    s.frog.squash = 0.2 * pull - 0.25 * bump(k, 0.62, 0.8)
    s.frog.lidL = s.frog.lidR = 1 - 0.6 * pull
    const quiver = Math.sin(t * 60) * 0.5 * (1 - sprung) * span(k, 0.62, 0.64)
    hold(p, a.frog.x + FROG_MOUTH.x + 78 - 26 * pull + 40 * sprung, a.frog.y + FROG_MOUTH.y - 6 - 60 * bump(k, 0.62, 1), 1.45 - 0.35 * pull + quiver)
  },
}

/** The kingfisher balances it across his beak, wobbles and drops it. A clack and a rattle. */
export const mastBird: Act = {
  id: 'mast:bird', length: 2.3, who: ['bird'], leaves: 'arc',
  cues: [[0.15, 'clack'], [1.5, 'rattle']],
  pose(k, t, s, p, a) {
    const wobble = Math.sin(t * 7) * 0.34 * span(k, 0.1, 0.6)
    const gone = span(k, 0.66, 0.72)
    s.bird.head = -0.25 - wobble * 0.7
    s.bird.beak = 0.3 + 0.7 * gone
    s.bird.tail = 0.6 * Math.abs(wobble)
    s.bird.dx = 14 * wobble
    s.bird.ruffle = 0.5 * gone * (1 - span(k, 0.9, 1))
    hold(p, a.bird.x + beakTip(s.bird.head).x + 6, a.bird.y + beakTip(s.bird.head).y + 4 + 150 * gone * gone, 1.57 + wobble + 1.2 * gone)
  },
}

/** In the water it floats like a log and turns once. A plop; the knock comes when it reaches the shore. */
export const mastWater: Act = {
  id: 'mast:water', length: 1.5, who: [], leaves: 'float',
  cues: [[0, 'plop-twig']],
  pose(k, _t, _s, p, a) {
    hold(p, a.drop.x, a.drop.y + 6 * bump(k, 0, 0.3), 1.57 + TAU * ease(k, 0.15, 1))
  },
}

// --- A leaf: birch or maple ---------------------------------------------------

/** The gnome wears it as a cape and strikes a pose. A flap and a squeak. */
export const leafGnome: Act = {
  id: 'leaf:gnome', length: 2.2, who: ['gnome'], leaves: 'arc',
  cues: [[0.2, 'flap', 1.2], [0.95, 'squeak', 0.9]],
  pose(k, t, s, p, a) {
    const on = ease(k, 0.05, 0.25), struck = ease(k, 0.35, 0.5) * (1 - span(k, 0.88, 1))
    s.gnome.armL = 0.9 * struck
    s.gnome.armR = -0.6 * struck
    s.gnome.lean = -0.22 * struck
    s.gnome.hatTilt = -0.5 * struck
    s.gnome.mouth = 0.9 * struck
    s.gnome.squash = -0.12 * struck
    hold(p, a.gnome.x + GNOME_BACK.x + 10 * Math.sin(t * 5) * struck, lerp(a.drop.y, a.gnome.y + GNOME_BACK.y, on), 0.25 + 0.12 * Math.sin(t * 5) * struck, false)
  },
}

/** The frog wears it as a hat, goes cross-eyed looking up at it and blows it off. A pat, then a puff. */
export const leafFrog: Act = {
  id: 'leaf:frog', length: 2.4, who: ['frog'], leaves: 'arc',
  cues: [[0.18, 'pat'], [1.62, 'puff']],
  pose(k, _t, s, p, a) {
    const on = ease(k, 0, 0.08), blown = span(k, 0.675, 0.8)
    s.frog.cross = ease(k, 0.15, 0.4) * (1 - blown)
    s.frog.lookY = -1
    s.frog.cheek = ease(k, 0.5, 0.67) * (1 - blown)
    s.frog.throat = s.frog.cheek
    s.frog.mouth = 0.6 * bump(k, 0.675, 0.8)
    s.frog.squash = 0.1 * on - 0.2 * bump(k, 0.675, 0.85)
    hold(p, a.frog.x + FROG_HEAD.x + 60 * blown, lerp(a.drop.y, a.frog.y + FROG_HEAD.y - 8, on) - 150 * blown, -0.2 + 2.4 * blown)
  },
}

/** The kingfisher opens it over his head as an umbrella and peers at the sky. A ruffle. */
export const leafBird: Act = {
  id: 'leaf:bird', length: 2.3, who: ['bird'], leaves: 'arc',
  cues: [[0.3, 'ruffle', 1.15]],
  pose(k, t, s, p, a) {
    const up = ease(k, 0.05, 0.3) * (1 - span(k, 0.85, 1))
    s.bird.wing = up
    s.bird.head = -0.55 * up + 0.08 * Math.sin(t * 4) * up
    s.bird.lookY = -up
    s.bird.ruffle = 0.3 * bump(k, 0.1, 0.4)
    hold(p, a.bird.x + BIRD_HEAD.x + 14, a.bird.y + BIRD_HEAD.y - 56 * up, 0.06 * Math.sin(t * 3))
  },
}

/** In the water it lies flat as a raft, and the dragonfly rides it to the shore. A pat and a buzz. */
export const leafWater: Act = {
  id: 'leaf:water', length: 1.1, who: ['fly'], leaves: 'float',
  cues: [[0, 'pat', 0.8], [0.5, 'buzz']],
  pose(k, _t, _s, p, a) {
    hold(p, a.drop.x, a.drop.y + 4 * bump(k, 0, 0.4), 1.2)
    p.scale = 1 - 0.12 * ease(k, 0, 0.3)
  },
}

// --- The feather --------------------------------------------------------------

/** It tickles the gnome's nose and he sneezes his hat off. A rising squeak and a burst. */
export const featherGnome: Act = {
  id: 'feather:gnome', length: 2.2, who: ['gnome'], leaves: 'arc',
  cues: [[0.3, 'squeak', 0.8], [0.62, 'squeak', 1.05], [0.94, 'squeak', 1.35], [1.25, 'burst']],
  pose(k, t, s, p, a) {
    const build = ease(k, 0.1, 0.56), sneeze = span(k, 0.565, 0.6), after = span(k, 0.6, 1)
    s.gnome.lean = -0.3 * build * (1 - sneeze) + 0.4 * sneeze * (1 - after)
    s.gnome.lids = 1 - build * (1 - sneeze)
    s.gnome.mouth = -0.5 * build + 1.5 * sneeze * (1 - after)
    s.gnome.armL = s.gnome.armR = 0.5 * build * (1 - after)
    s.gnome.hatY = -150 * Math.sin(after * Math.PI) * sneeze
    s.gnome.hatX = -30 * Math.sin(after * Math.PI) * sneeze
    s.gnome.hatTilt = -TAU * after * sneeze
    hold(p, a.gnome.x + GNOME_NOSE.x - 30 + 6 * Math.sin(t * 22) * (1 - sneeze) - 90 * sneeze * after, a.gnome.y + GNOME_NOSE.y + 10 + 40 * sneeze * after, 1.9 + 0.2 * Math.sin(t * 22))
  },
}

/** Tickled under the chin, the frog swells and laughs. A run of quick croaks. */
export const featherFrog: Act = {
  id: 'feather:frog', length: 2.4, who: ['frog'], leaves: 'arc',
  cues: [[0.5, 'croak-q', 0.9], [0.72, 'croak-q', 1], [0.94, 'croak-q', 1.1], [1.16, 'croak-q', 1.22], [1.38, 'croak-q', 1.35]],
  pose(k, t, s, p, a) {
    const grow = ease(k, 0.12, 0.6) * (1 - ease(k, 0.75, 1))
    const laugh = Math.abs(Math.sin((t - 0.5) * TAU * 2.27)) * span(k, 0.2, 0.22) * (1 - span(k, 0.62, 0.66))
    s.frog.swell = grow
    s.frog.mouth = 0.4 + 0.6 * laugh
    s.frog.lidL = s.frog.lidR = 1 - 0.8 * grow
    s.frog.squash = -0.1 * laugh
    s.frog.throat = grow
    hold(p, a.frog.x + 70 + 8 * Math.sin(t * 20), a.frog.y - 96 + 6 * Math.cos(t * 20), -0.5 + 0.2 * Math.sin(t * 20))
  },
}

/** The kingfisher knows it for his own, sticks it back in his tail, and it falls out again. A snatch and a whistle. */
export const featherBird: Act = {
  id: 'feather:bird', length: 2.3, who: ['bird'], leaves: 'arc',
  cues: [[0.15, 'snatch'], [1.5, 'whistle']],
  pose(k, _t, s, p, a) {
    const take = ease(k, 0, 0.1), tuck = ease(k, 0.2, 0.45), proud = bump(k, 0.45, 0.66), fall = span(k, 0.65, 1)
    s.bird.head = -1.3 * tuck * (1 - span(k, 0.45, 0.55)) - 0.3 * proud
    s.bird.tail = 0.9 * proud
    s.bird.ruffle = 0.4 * proud
    s.bird.beak = 0.5 * take * (1 - tuck)
    s.bird.lookY = fall
    const x = lerp(a.bird.x + beakTip(s.bird.head).x, a.bird.x + BIRD_TAIL.x - 30, tuck), y = lerp(a.bird.y + beakTip(s.bird.head).y, a.bird.y + BIRD_TAIL.y, tuck)
    hold(p, x + 30 * Math.sin(fall * 9) * fall, y + 120 * fall * fall, 2.2 - 0.6 * tuck + Math.sin(fall * 9) * 0.5)
  },
}

/** In the water it spins on the surface like a needle and never gets wet. A light skitter. */
export const featherWater: Act = {
  id: 'feather:water', length: 1.6, who: [], leaves: 'float',
  cues: [[0, 'skitter'], [0.5, 'skitter', 1.2]],
  pose(k, _t, _s, p, a) {
    hold(p, a.drop.x + 14 * Math.sin(k * TAU * 2), a.drop.y - 8, TAU * 3 * (1 - (1 - k) * (1 - k)))
  },
}
