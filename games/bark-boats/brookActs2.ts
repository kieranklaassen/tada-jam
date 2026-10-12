import { BIRD_BEAK, beakTip, hold, lerp, type Anchors } from './acts'
import type { BrookAct } from './brookActs'
import { TAU, bump, ease, span, type Stage } from './rig'

// The brook grid, the next two places: the stepping stones and the
// kingfisher's low branch.

const act = (id: string, length: number, moves: number, who: BrookAct['who'], cues: BrookAct['cues'], pose: BrookAct['pose'], more: Partial<BrookAct> = {}): BrookAct => ({ id, length, moves, who, cues, pose, leaves: 'arc', ...more })

const carry = (s: Stage, a: Anchors, moves: number, k: number, from = 0, to = 1): void => {
  s.boat.dx = moves * a.gain * ease(k, from, to)
}

// --- The stepping stones ------------------------------------------------------

/** A broad sail: it runs at a stone, bounces, and the sail swings to the other side. A tock and a flap. */
export const stonesBroad = act('stones:broad', 1.7, -260, ['boat'], [[0.4, 'tock'], [0.7, 'flap']], (k, _t, s, _p, a) => {
  const run = ease(k, 0, 0.23), bounce = bump(k, 0.24, 0.5), swung = span(k, 0.4, 0.46)
  s.boat.dx = (-110 * run - 150 * ease(k, 0.5, 1)) * a.gain + 60 * bounce
  s.boat.tilt = 0.18 * bump(k, 0.23, 0.36)
  s.boat.billow = 1 - 2 * swung
  s.gnome.lean = 0.3 * bump(k, 0.23, 0.4)
  s.gnome.hatY = -14 * bump(k, 0.23, 0.36)
})

/** A pea pod is narrow: it slips between the stones a bark hull runs at. A zip. */
export const stonesPod = act('stones:pod', 1.2, -260, ['boat'], [[0.3, 'zip', 1.3]], (k, _t, s, _p, a) => {
  s.boat.dy = -6 * bump(k, 0.2, 0.6)
  s.boat.tilt = -0.06 * bump(k, 0.2, 0.6)
  s.gnome.armL = s.gnome.armR = bump(k, 0.2, 0.9)
  carry(s, a, -260, k)
})

/** No sail: so slow it turns through the gap like a fallen leaf. A trickle. */
export const stonesNoSail = act('stones:nosail', 3, -250, ['boat'], [[0.3, 'trickle', 0.7], [1.5, 'trickle', 0.6]], (k, _t, s, _p, a) => {
  s.boat.face = Math.cos(ease(k, 0.1, 0.9) * TAU)
  s.boat.dy = 4 * Math.sin(k * TAU)
  s.gnome.lids = 0.5
  carry(s, a, -250, k)
})

/** Two masts: it sidles through crabwise with the sails slapping each other. Two claps. */
export const stonesTwoMasts = act('stones:twomasts', 1.9, -250, ['boat'], [[0.6, 'clap'], [1.2, 'clap', 1.12]], (k, t, s, _p, a) => {
  const crab = ease(k, 0.05, 0.25) * (1 - ease(k, 0.75, 0.95))
  s.boat.face = 1 - 0.5 * crab
  s.boat.dy = -14 * crab * Math.abs(Math.sin(t * TAU * 0.83))
  s.boat.billow = Math.sin((t - 0.6) * TAU * 1.67 + Math.PI / 2) * crab
  s.gnome.lean = -0.15 * crab
  carry(s, a, -250, k)
})

/**
 * Two masts that do not both carry a sail: it sidles through crabwise all the same, and with no second sail to
 * slap, the bare mast runs along a stone like a stick along a fence. Three ticks, each higher, and a jolt at each.
 */
export const stonesBareMast = act('stones:baremast', 2.1, -250, ['boat', 'gnome'], [[0.55, 'tick', 0.7], [0.95, 'tick', 0.84], [1.35, 'tick', 1]], (k, _t, s, _p, a) => {
  const crab = ease(k, 0.05, 0.22) * (1 - ease(k, 0.78, 0.95))
  const jolt = bump(k, 0.24, 0.32) + bump(k, 0.43, 0.51) + bump(k, 0.62, 0.7)
  s.boat.face = 1 - 0.42 * crab
  s.boat.tilt = -0.07 * jolt
  s.boat.dy = -5 * jolt
  s.gnome.hatTilt = 0.35 * jolt
  s.gnome.lean = 0.12 * crab - 0.1 * jolt
  carry(s, a, -250, k)
})

/** The boat on the sill: low in the water, bow up on the scraped stone. */
function onSill(s: Stage, a: Anchors): void {
  s.boat.dx = -70 * a.gain
  s.boat.dy = 9
  s.boat.tilt = 0.07
  s.gnome.armL = s.gnome.armR = -1
  s.gnome.mouth = -0.6
}

/** A ring from behind lifts the heavy boat over the sill. A scoot. */
export const sillFree = act('stones:free', 0.9, -260, ['boat'], [[0, 'scoot']], (k, _t, s, _p, a) => {
  s.boat.dx = (-70 - 190 * ease(k, 0, 1)) * a.gain
  s.boat.dy = 9 * (1 - span(k, 0, 0.2)) - 22 * bump(k, 0, 0.6)
  s.boat.tilt = 0.07 * (1 - span(k, 0, 0.5)) - 0.1 * bump(k, 0.3, 1)
  s.gnome.armL = s.gnome.armR = bump(k, 0, 1)
})

/** A pebble aboard: it rides low and scrapes to a stop on the sill, and waits. A grating scrape. */
export const stonesPebble = act('stones:pebble', 1.1, -70, ['boat'], [[0.3, 'scrape']], (k, t, s, _p, a) => {
  const on = ease(k, 0.1, 0.8)
  s.boat.dx = -70 * on * a.gain + 2 * Math.sin(t * 50) * bump(k, 0.25, 0.9)
  s.boat.dy = 9 * on
  s.boat.tilt = 0.07 * on
  s.gnome.lean = 0.25 * bump(k, 0.6, 1)
  s.gnome.armL = s.gnome.armR = -on
  s.gnome.mouth = -0.6 * on
}, { holds: onSill, frees: sillFree })

/** A walnut hull: it bumps a stone, rolls round it and never sticks. A hollow tock and a roll. */
export const stonesWalnut = act('stones:walnut', 1.7, -250, ['boat'], [[0.3, 'tock', 0.8], [0.5, 'roll']], (k, _t, s, _p, a) => {
  const round = ease(k, 0.18, 0.8)
  s.boat.dx = (-70 * ease(k, 0, 0.18) - 180 * round) * a.gain
  s.boat.dy = -30 * Math.sin(round * Math.PI)
  s.boat.tilt = 0.5 * Math.sin(round * TAU) * (1 - span(k, 0.8, 1))
  s.gnome.squash = 0.2 * bump(k, 0.16, 0.3)
  s.gnome.armL = s.gnome.armR = 0.6 * bump(k, 0.2, 0.9)
})

/** A berry aboard: the berry rolls from bow to stern as the boat tilts on a stone, the gnome after it. A rolling patter. */
export const stonesBerry = act('stones:berry', 2.1, -220, ['boat', 'gnome'], [[0.2, 'patter'], [0.95, 'patter', 1.2]], (k, _t, s, p, a) => {
  const up = bump(k, 0.06, 0.5), down = bump(k, 0.46, 0.92)
  const roll = ease(k, 0.1, 0.42) * (1 - ease(k, 0.5, 0.86))
  s.boat.tilt = 0.26 * up - 0.22 * down
  s.boat.dy = -8 * up
  s.gnome.lean = -0.4 * roll + 0.3 * down
  s.gnome.armL = 0.7 * Math.max(up, down)
  s.gnome.lookY = 0.8
  carry(s, a, -220, k, 0.3, 1)
  hold(p, a.boat.x + s.boat.dx + lerp(a.home.x, a.gnome.x - a.boat.x - 46, roll), a.boat.y + s.boat.dy + a.home.y - 60 * s.boat.tilt * roll, roll * 9)
}, { uses: 'berry' })

// --- The kingfisher's low branch ----------------------------------------------

/** The boat hanging from the branch by its leaf. */
function hanging(s: Stage, a: Anchors): void {
  s.boat.dx = -40 * a.gain
  s.boat.dy = -34
  s.boat.tilt = 0.14
  s.boat.billow = -0.6
  s.gnome.armL = s.gnome.armR = 0.9
  s.bird.lookY = 1
  s.bird.head = 0.5
}

/** A ring from behind swings it clear: the leaf lets go and the boat drops back in. A flap and a splash. */
export const branchFree = act('branch:free', 1, -230, ['boat', 'bird'], [[0, 'flap', 1.2], [0.42, 'splash', 1.3]], (k, _t, s, _p, a) => {
  const drop = span(k, 0.2, 0.42)
  s.boat.dx = (-40 - 190 * ease(k, 0.1, 1)) * a.gain
  s.boat.dy = -34 * (1 - drop * drop) + 14 * bump(k, 0.42, 0.7)
  s.boat.tilt = 0.14 * (1 - drop)
  s.boat.billow = -0.6 * (1 - drop)
  s.bird.ruffle = bump(k, 0, 0.6)
  if (k > 0.42 && k < 0.8) s.fx.push({ kind: 'splash', x: a.boat.x + s.boat.dx, y: a.boat.y - 10, k: span(k, 0.42, 0.8), size: 1 })
})

/** A broad sail: too fast to duck; the leaf wraps the branch and the boat swings under it like a pendulum, the bird hanging on upside down. A twang and a rattle. */
export const branchBroad = act('branch:broad', 2.6, -230, ['boat', 'bird'], [[0.3, 'twang', 0.7], [0.9, 'rattle'], [1.3, 'rattle', 1.1]], (k, t, s, _p, a) => {
  const up = ease(k, 0.08, 0.2) * (1 - ease(k, 0.78, 0.9))
  const swing = Math.sin((t - 0.3) * TAU * 0.9) * Math.exp(-(t - 0.3) * 1.1) * span(k, 0.1, 0.12)
  s.boat.dx = (-40 * ease(k, 0, 0.12) - 190 * ease(k, 0.8, 1)) * a.gain + 90 * swing
  s.boat.dy = -34 * up - 30 * Math.abs(swing)
  s.boat.tilt = 0.6 * swing
  s.boat.billow = -0.6 * up
  s.bird.flip = ease(k, 0.12, 0.22) * (1 - ease(k, 0.66, 0.8))
  s.bird.wing = bump(k, 0.12, 0.8)
  s.bird.beak = 0.5 * s.bird.flip
  s.gnome.armL = s.gnome.armR = up
  s.gnome.mouth = up
})

/** A broad sail on the tall stalk: the leaf meets the branch and the boat hangs there by it. The same twang and rattle, and it stays. */
export const branchBroadTall: BrookAct = {
  ...branchBroad, id: 'branch:broad-tall', length: 2, moves: -40,
  pose(k, t, s, p, a) {
    branchBroad.pose(Math.min(0.72, k * 0.77), t, s, p, a)
    const settle = ease(k, 0.7, 1)
    s.boat.dx = lerp(s.boat.dx, -40 * a.gain, settle)
    s.boat.dy = lerp(s.boat.dy, -34, settle)
    s.boat.tilt = lerp(s.boat.tilt, 0.14, settle)
    s.bird.flip *= 1 - settle
  },
  holds: hanging, frees: branchFree,
}

/** No sail: it passes with room to spare and the bird leans down to look for the mast. A cluck. */
export const branchNoSail = act('branch:nosail', 1.9, -240, ['boat', 'bird'], [[0.8, 'cluck']], (k, _t, s, _p, a) => {
  const lean = ease(k, 0.1, 0.4) * (1 - ease(k, 0.8, 1))
  s.bird.tilt = 0.9 * lean
  s.bird.head = 0.5 * lean
  s.bird.lookY = lean
  s.bird.tail = -0.4 * lean
  s.gnome.lookY = -1
  carry(s, a, -240, k)
})

/** Two masts: the first mast ducks and the second catches; the bird steps onto the mast top and rides along. A tick and a chirp. */
export const branchTwoMasts = act('branch:twomasts', 2.7, -260, ['boat', 'bird'], [[0.3, 'tick', 0.7], [1, 'chirp']], (k, _t, s, _p, a) => {
  const duck = bump(k, 0.02, 0.2), on = ease(k, 0.16, 0.3) * (1 - ease(k, 0.8, 0.96))
  carry(s, a, -260, k, 0.1, 0.85)
  s.boat.tilt = -0.22 * duck + 0.12 * bump(k, 0.12, 0.3)
  // `at.home` is the top of the stern mast, from the keel point.
  s.bird.dx = (a.boat.x + s.boat.dx + a.home.x - a.bird.x) * on
  s.bird.dy = (a.boat.y + a.home.y - a.bird.y) * on
  s.bird.wing = bump(k, 0.16, 0.3) + bump(k, 0.8, 0.96)
  s.bird.tail = 0.6 * bump(k, 0.36, 0.5)
  s.bird.head = -0.3 * on
  s.gnome.lookY = -on
})

/** A pebble aboard: he dives for a berry, comes up with the pebble, drops it back on the deck and shakes his beak. A plunge and a clonk. */
export const branchPebble = act('branch:pebble', 2.7, -200, ['boat', 'bird'], [[0.3, 'plunge'], [1.4, 'clonk']], (k, t, s, p, a) => {
  const dive = ease(k, 0.04, 0.14), rise = ease(k, 0.2, 0.36), drop = span(k, 0.5, 0.52), home = ease(k, 0.52, 0.66)
  const tx = a.boat.x + a.home.x - BIRD_BEAK.x, ty = a.boat.y + a.home.y - BIRD_BEAK.y
  s.bird.dx = (tx - a.bird.x) * dive * (1 - home)
  s.bird.dy = (ty - a.bird.y) * dive * (1 - home) - 70 * rise * (1 - home)
  s.bird.wing = bump(k, 0.04, 0.66)
  s.bird.beak = 0.3 * dive * (1 - drop)
  s.bird.head = 0.5 * Math.sin(t * 34) * span(k, 0.68, 0.7) * (1 - span(k, 0.9, 1))
  s.bird.ruffle = 0.4 * bump(k, 0.66, 1)
  s.boat.dy = 10 * bump(k, 0.52, 0.66)
  s.gnome.armL = s.gnome.armR = -span(k, 0.52, 0.56)
  carry(s, a, -200, k, 0.8, 1)
  hold(p, a.boat.x + s.boat.dx + a.home.x, a.boat.y + a.home.y - 70 * rise * (1 - drop))
}, { uses: 'pebble' })

/** A walnut hull: he taps the shell to see who is home, and the gnome knocks back. Two taps, two knocks. */
export const branchWalnut = act('branch:walnut', 2.1, -220, ['boat', 'bird', 'gnome'], [[0.4, 'tap'], [0.6, 'tap', 1.1], [1.2, 'knock', 0.8], [1.4, 'knock', 0.85]], (k, _t, s, _p, a) => {
  const down = ease(k, 0, 0.14) * (1 - ease(k, 0.72, 0.9))
  s.bird.dx = (a.boat.x - 150 - BIRD_BEAK.x + 20 - a.bird.x) * down
  s.bird.dy = (a.boat.y - 70 - a.bird.y) * down
  s.bird.wing = bump(k, 0, 0.14) + bump(k, 0.72, 0.9)
  s.bird.tilt = 0.5 * (bump(k, 0.15, 0.23) + bump(k, 0.25, 0.33))
  s.bird.head = -0.4 * span(k, 0.36, 0.42) * down
  s.gnome.armL = bump(k, 0.53, 0.61) + bump(k, 0.63, 0.71)
  s.gnome.lean = 0.2 * span(k, 0.5, 0.56) * (1 - span(k, 0.74, 0.8))
  carry(s, a, -220, k, 0.86, 1)
})

/** A berry aboard: he steals it, shivers with bliss on the branch until the gnome shakes his fist, and drops it back on the deck. A falling whistle and a plop. */
export const branchBerry = act('branch:berry', 2.7, -200, ['boat', 'bird', 'gnome'], [[0.1, 'whistle'], [2.1, 'plop-berry', 1.2]], (k, t, s, p, a) => {
  const dive = ease(k, 0.03, 0.13), home = ease(k, 0.16, 0.3), drops = span(k, 0.7, 0.72), fall = ease(k, 0.72, 0.78)
  const tx = a.boat.x + a.home.x - BIRD_BEAK.x, ty = a.boat.y + a.home.y - BIRD_BEAK.y
  s.bird.dx = (tx - a.bird.x) * dive * (1 - home)
  s.bird.dy = (ty - a.bird.y) * dive * (1 - home)
  s.bird.wing = bump(k, 0.03, 0.3)
  s.bird.ruffle = 0.6 * span(k, 0.32, 0.36) * (1 - drops) * (0.6 + 0.4 * Math.sin(t * 40))
  s.bird.head = -0.5 * span(k, 0.32, 0.36) * (1 - drops)
  s.bird.beak = 0.25 + 0.6 * drops * (1 - span(k, 0.8, 0.9))
  s.gnome.armL = span(k, 0.44, 0.48) * (1 - span(k, 0.8, 0.86)) * (0.8 + 0.2 * Math.sin(t * 26))
  s.gnome.mouth = -span(k, 0.44, 0.48) * (1 - span(k, 0.8, 0.86))
  s.gnome.lookY = -span(k, 0.3, 0.4) * (1 - fall)
  const bx = a.bird.x + s.bird.dx + beakTip(s.bird.head).x + 8, by = a.bird.y + s.bird.dy + beakTip(s.bird.head).y
  carry(s, a, -200, k, 0.84, 1)
  hold(p, lerp(bx, a.boat.x + s.boat.dx + a.home.x, fall), lerp(by, a.boat.y + a.home.y, fall * fall))
  if (k < 0.03) hold(p, a.boat.x + a.home.x, a.boat.y + a.home.y)
}, { uses: 'berry' })

/** The tall stalk meets the branch a short twig clears: it bends back and springs. A tick and a twang. */
export const branchStalk = act('branch:stalk', 1.3, -230, ['boat', 'bird'], [[0.3, 'tick', 0.7], [0.5, 'twang', 1.3]], (k, t, s, _p, a) => {
  s.boat.tilt = 0.26 * ease(k, 0.1, 0.36) * (1 - span(k, 0.38, 0.4)) - 0.12 * Math.sin((t - 0.5) * 30) * Math.exp(-(t - 0.5) * 5) * span(k, 0.38, 0.4)
  s.bird.dy = -22 * bump(k, 0.36, 0.6)
  s.bird.wing = 0.6 * bump(k, 0.36, 0.6)
  s.gnome.lookY = -1
  carry(s, a, -230, k, 0.3, 1)
})

/** A feather sail tickles the bird as it passes under him: he ruffles and peeps. A ruffle and a peep. */
export const branchFeather = act('branch:feather', 1.3, -230, ['boat', 'bird'], [[0.4, 'ruffle', 1.3], [0.7, 'peep', 1.2]], (k, t, s, _p, a) => {
  s.bird.ruffle = bump(k, 0.25, 0.9)
  s.bird.dy = -10 * Math.abs(Math.sin(t * 16)) * bump(k, 0.25, 0.9)
  s.bird.head = -0.4 * bump(k, 0.3, 0.9)
  s.bird.beak = bump(k, 0.5, 0.7)
  carry(s, a, -230, k)
})
