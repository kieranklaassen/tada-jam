import { BIRD_BEAK, beakTip, FROG_HEAD, FROG_MOUTH, GNOME_HAT_TIP, GNOME_MOUTH, hold, lerp, type Act } from './acts'
import { featherBird, featherFrog, featherGnome, featherWater, leafBird, leafFrog, leafGnome, leafWater, mastBird, mastFrog, mastGnome, mastWater } from './bankActs'
import type { Family } from './build'
import { TAU, bump, ease, span } from './rig'

// The bank grid, second half: the berry, the acorn cap and the pebble, and
// the table that finds the act of a cell.

// --- The berry ----------------------------------------------------------------

/** The gnome licks it, smacks his lips, his beard is red until he wipes it on his sleeve, and he sets it back. A smack. */
export const berryGnome: Act = {
  id: 'berry:gnome', length: 2.6, who: ['gnome'], leaves: 'arc',
  cues: [[0.4, 'lick'], [0.9, 'smack'], [1.75, 'wipe']],
  pose(k, _t, s, p, a) {
    const at = ease(k, 0, 0.12), wipe = bump(k, 0.62, 0.78)
    s.gnome.armL = 0.55 * at * (1 - span(k, 0.5, 0.6)) + 0.7 * wipe
    s.gnome.mouth = 0.3 + 0.7 * bump(k, 0.14, 0.24) + 0.7 * bump(k, 0.32, 0.42)
    s.gnome.beard = span(k, 0.16, 0.2) * (1 - span(k, 0.68, 0.74))
    s.gnome.lids = 1 - 0.7 * bump(k, 0.3, 0.5)
    s.gnome.lean = 0.1 * bump(k, 0.14, 0.42) - 0.12 * wipe
    hold(p, lerp(a.drop.x, a.gnome.x + GNOME_MOUTH.x - 22, at), lerp(a.drop.y, a.gnome.y + GNOME_MOUTH.y + 4, at) + 30 * span(k, 0.55, 0.7))
  },
}

/** The frog's tongue snaps it, his cheek bulges, and he spits it back onto the sand. A thwip and a spit. */
export const berryFrog: Act = {
  id: 'berry:frog', length: 1.25, who: ['frog'], leaves: 'arc',
  cues: [[0, 'thwip'], [0.95, 'ptoo']],
  pose(k, t, s, p, a) {
    const out = span(k, 0, 0.08), inn = span(k, 0.08, 0.15), spit = span(k, 0.76, 0.8)
    s.frog.tongue = out * (1 - inn)
    s.frog.tongueX = a.drop.x; s.frog.tongueY = a.drop.y
    s.frog.mouth = k < 0.15 ? 1 : bump(k, 0.74, 1)
    s.frog.cheek = inn * (1 - spit) * (0.8 + 0.2 * Math.sin(t * 14))
    s.frog.lidL = s.frog.lidR = spit ? 1 : 0.5
    s.frog.squash = -0.25 * bump(k, 0.74, 1)
    hold(p, lerp(a.drop.x, a.frog.x + FROG_MOUTH.x, inn), lerp(a.drop.y, a.frog.y + FROG_MOUTH.y, inn))
    p.alpha = inn >= 1 && !spit ? 0 : 1
  },
}

/** The kingfisher swoops, holds it up like a jewel and gives it back only when the gnome stamps. A swoop, a stamp, a plip. */
export const berryBird: Act = {
  id: 'berry:bird', length: 3, who: ['bird', 'gnome'], leaves: 'arc',
  cues: [[0, 'swoop'], [1.62, 'stamp'], [2.3, 'plip']],
  pose(k, t, s, p, a) {
    const dive = bump(k, 0, 0.22), proud = ease(k, 0.24, 0.34) * (1 - span(k, 0.74, 0.78)), stamp = bump(k, 0.5, 0.58), drops = span(k, 0.765, 0.78)
    s.bird.dx = (a.drop.x - a.bird.x - BIRD_BEAK.x) * dive
    s.bird.dy = (a.drop.y - a.bird.y - BIRD_BEAK.y) * dive
    s.bird.wing = dive
    s.bird.head = -0.6 * proud + 0.06 * Math.sin(t * 9) * proud
    s.bird.ruffle = 0.3 * proud + 0.6 * bump(k, 0.54, 0.7)
    s.bird.beak = 0.25 * (1 - drops) + 0.8 * bump(k, 0.76, 0.84)
    s.gnome.squash = 0.35 * stamp
    s.gnome.armL = s.gnome.armR = span(k, 0.36, 0.44) * (1 - span(k, 0.8, 0.9)) * 0.8
    s.gnome.mouth = -span(k, 0.36, 0.44) * (1 - span(k, 0.8, 0.9))
    s.gnome.leg = 1.2 * bump(k, 0.44, 0.54)
    const bx = a.bird.x + s.bird.dx + beakTip(s.bird.head).x + 10, by = a.bird.y + s.bird.dy + beakTip(s.bird.head).y
    hold(p, bx, by + 60 * drops * span(k, 0.78, 1))
  },
}

/** In the water it bobs red in its own rings. A plip and a bob. */
export const berryWater: Act = {
  id: 'berry:water', length: 1.4, who: [], leaves: 'float',
  cues: [[0, 'plop-berry'], [0.6, 'bob']],
  pose(k, t, _s, p, a) {
    hold(p, a.drop.x, a.drop.y + 12 * Math.cos(t * 9) * (1 - k), 0.3 * Math.sin(t * 5))
  },
}

// --- The acorn cap ------------------------------------------------------------

/** The gnome puts it on over his hat, where it is far too small. A tok and a giggle. */
export const capGnome: Act = {
  id: 'cap:gnome', length: 2.1, who: ['gnome'], leaves: 'arc',
  cues: [[0.5, 'tok', 1.3], [1, 'giggle']],
  pose(k, t, s, p, a) {
    const on = ease(k, 0.05, 0.24), off = span(k, 0.86, 1)
    s.gnome.armL = s.gnome.armR = 0.9 * bump(k, 0, 0.3)
    s.gnome.lookY = -on
    s.gnome.hatTilt = 0.12 * Math.sin(t * 9) * on * (1 - off)
    s.gnome.mouth = on
    s.gnome.squash = 0.1 * Math.abs(Math.sin(t * 8)) * span(k, 0.45, 0.5) * (1 - off)
    hold(p, a.gnome.x + GNOME_HAT_TIP.x + 40 * off, lerp(a.drop.y, a.gnome.y + GNOME_HAT_TIP.y - 4, on) - 40 * bump(k, 0.86, 1), Math.PI + 0.3 * Math.sin(t * 9) * on)
  },
}

/** The frog wears it as a helmet and knocks it on a reed to test it. A tok and a bonk. */
export const capFrog: Act = {
  id: 'cap:frog', length: 2.4, who: ['frog'], leaves: 'arc',
  cues: [[0.25, 'tok'], [1.3, 'bonk']],
  pose(k, _t, s, p, a) {
    const on = ease(k, 0, 0.1), wind = ease(k, 0.34, 0.5), hit = span(k, 0.5, 0.54), back = ease(k, 0.58, 0.8)
    const butt = -0.3 * wind * (1 - hit) + 0.5 * hit * (1 - back)
    s.frog.tilt = butt
    s.frog.dx = 60 * butt
    s.frog.lidL = s.frog.lidR = 1 - hit * (1 - back)
    s.frog.lookY = -0.6 * on
    s.frog.squash = 0.2 * bump(k, 0.52, 0.66)
    hold(p, a.frog.x + FROG_HEAD.x + 150 * butt, lerp(a.drop.y, a.frog.y + FROG_HEAD.y + 6, on) + 40 * Math.abs(butt), Math.PI + butt)
  },
}

/** The kingfisher fills it at the brook and tips it over the gnome. A glug and a splash. */
export const capBird: Act = {
  id: 'cap:bird', length: 2.9, who: ['bird', 'gnome'], leaves: 'arc',
  cues: [[0.85, 'glug'], [2, 'splash', 1.4]],
  pose(k, _t, s, p, a) {
    const down = ease(k, 0.1, 0.28), over = ease(k, 0.36, 0.62), tip = ease(k, 0.64, 0.72), home = ease(k, 0.78, 1)
    const wx = a.bird.x + 150, wy = 380, gx = a.gnome.x - BIRD_BEAK.x, gy = a.gnome.y - 330
    const x = lerp(lerp(a.bird.x, wx, down), gx, over), y = lerp(lerp(a.bird.y, wy, down), gy, over)
    s.bird.dx = (x - a.bird.x) * (1 - home)
    s.bird.dy = (y - a.bird.y) * (1 - home)
    s.bird.wing = bump(k, 0.1, 0.98)
    s.bird.tilt = 0.5 * bump(k, 0.26, 0.34) + 0.7 * tip * (1 - home)
    s.gnome.squash = 0.3 * bump(k, 0.69, 0.8)
    s.gnome.lids = 1 - bump(k, 0.69, 0.9)
    s.gnome.mouth = -span(k, 0.69, 0.72) * (1 - span(k, 0.92, 1))
    s.gnome.hatTilt = 0.6 * bump(k, 0.69, 0.9)
    if (k > 0.69 && k < 0.86) s.fx.push({ kind: 'drops', x: a.gnome.x, y: a.gnome.y - 150, k: span(k, 0.69, 0.86), size: 1 })
    hold(p, a.bird.x + s.bird.dx + beakTip(s.bird.head).x + 8, a.bird.y + s.bird.dy + beakTip(s.bird.head).y + 14, 2.4 * tip * (1 - home))
  },
}

/** In the water it floats as a tiny round boat and twirls, and a beetle climbs in. A tick and a whirr. */
export const capWater: Act = {
  id: 'cap:water', length: 1.6, who: [], leaves: 'float',
  cues: [[0, 'tick', 0.8], [0.5, 'whirr']],
  pose(k, _t, _s, p, a) {
    // Seen from the side a cup that twirls sways from rim to rim.
    hold(p, a.drop.x + 9 * Math.sin(k * TAU * 3) * (1 - k), a.drop.y + 3 * bump(k, 0, 0.3), 0.22 * Math.sin(k * TAU * 3) * (1 - k))
  },
}

// --- The pebble ---------------------------------------------------------------

/** The gnome cannot lift it, so he sits on it. A grunt and a huff. */
export const pebbleGnome: Act = {
  id: 'pebble:gnome', length: 2.3, who: ['gnome'], leaves: 'arc',
  cues: [[0.4, 'grunt'], [1.4, 'huff']],
  pose(k, t, s, p, a) {
    const strain = bump(k, 0.1, 0.5), sat = ease(k, 0.56, 0.66) * (1 - span(k, 0.92, 1))
    s.gnome.lean = 0.45 * strain
    s.gnome.squash = 0.25 * strain + 0.15 * bump(k, 0.6, 0.72)
    s.gnome.armL = s.gnome.armR = -0.2 * strain - sat
    s.gnome.mouth = -strain - 0.6 * sat
    s.gnome.dx = 2 * Math.sin(t * 40) * strain
    s.gnome.sit = Math.max(s.gnome.sit, sat)
    s.gnome.dy = -30 * sat
    s.gnome.hatTilt = 0.7 * sat
    hold(p, a.gnome.x - 6, a.gnome.y + 28, 0, false)
  },
}

/** The frog's tongue catches it and he is pulled off his stone; he climbs back. A thwip, a thud and a splash. */
export const pebbleFrog: Act = {
  id: 'pebble:frog', length: 2.8, who: ['frog'], leaves: 'arc',
  cues: [[0, 'thwip', 0.85], [0.5, 'thud'], [0.9, 'splash', 1.2]],
  pose(k, _t, s, p, a) {
    const stuck = span(k, 0, 0.03) * (1 - span(k, 0.56, 0.6)), drag = ease(k, 0.12, 0.32), climb = ease(k, 0.62, 0.95)
    const off = drag * (1 - climb)
    s.frog.tongue = stuck
    s.frog.tongueX = a.drop.x; s.frog.tongueY = a.drop.y + 70 * drag
    s.frog.mouth = stuck
    s.frog.dx = (a.drop.x - a.frog.x) * 0.55 * off
    s.frog.dy = 60 * off
    s.frog.tilt = 0.6 * off * Math.sign(a.drop.x - a.frog.x || 1)
    s.frog.under = 0.7 * ease(k, 0.26, 0.36) * (1 - climb)
    s.frog.lidL = s.frog.lidR = k < 0.6 ? 1 : 0.6
    s.frog.squash = 0.2 * bump(k, 0.9, 1)
    if (k > 0.3 && k < 0.5) s.fx.push({ kind: 'splash', x: a.frog.x + s.frog.dx, y: a.frog.y + 40, k: span(k, 0.3, 0.5), size: 1.2 })
    hold(p, a.drop.x, a.drop.y + 70 * drag, 0)
  },
}

/** Too heavy for the kingfisher: he tips forward off the branch beak first, flaps back up without it and looks the other way. A clonk and a peep. */
export const pebbleBird: Act = {
  id: 'pebble:bird', length: 2.8, who: ['bird'], leaves: 'arc',
  cues: [[0.62, 'clonk'], [1.8, 'peep']],
  pose(k, _t, s, p, a) {
    const tip = ease(k, 0.04, 0.2), fall = ease(k, 0.14, 0.24), up = ease(k, 0.34, 0.6), away = span(k, 0.62, 0.7)
    s.bird.tilt = 1.4 * tip * (1 - up)
    s.bird.dy = 86 * fall * (1 - up)
    s.bird.dx = 30 * fall * (1 - up)
    s.bird.wing = bump(k, 0.26, 0.62)
    s.bird.beak = 0.3 * (1 - span(k, 0.2, 0.24))
    s.bird.head = 0.9 * away
    s.bird.lookX = -away
    s.bird.ruffle = 0.5 * bump(k, 0.6, 0.9)
    hold(p, a.bird.x + beakTip(s.bird.head).x + 30 * tip, a.bird.y + beakTip(s.bird.head).y + 10 + 150 * ease(k, 0.06, 0.22), 0)
  },
}

/** In the water it sinks with a gloop and bubbles; the frog dives and brings it back, disgusted. A gloop, bubbles, a wet slap. */
export const pebbleWater: Act = {
  id: 'pebble:water', length: 3.2, who: ['frog'], leaves: 'arc', lands: 'slap',
  cues: [[0, 'gloop'], [0.7, 'bubbles']],
  pose(k, _t, s, p, a) {
    const sink = ease(k, 0, 0.2), dive = ease(k, 0.3, 0.46), back = ease(k, 0.6, 0.86)
    s.frog.under = dive * (1 - span(k, 0.84, 0.9))
    s.frog.dx = (a.drop.x - a.frog.x) * 0.5 * dive * (1 - back)
    s.frog.dy = 30 * dive * (1 - back)
    s.frog.mouth = 0.5 * span(k, 0.9, 1)
    s.frog.lidL = s.frog.lidR = 1 - 0.6 * span(k, 0.86, 1)
    s.frog.tilt = -0.2 * span(k, 0.88, 1)
    if (k > 0.12 && k < 0.6) s.fx.push({ kind: 'bubbles', x: a.drop.x, y: a.drop.y, k: span(k, 0.12, 0.6), size: 1 })
    hold(p, lerp(a.drop.x, a.frog.x + FROG_MOUTH.x + 40, back), lerp(a.drop.y + 26 * sink, a.frog.y + FROG_MOUTH.y + 20, back), 0)
    p.alpha = 1 - 0.8 * sink * (1 - back)
  },
}

export type Target = 'gnome' | 'frog' | 'bird' | 'water'

const TABLE: Record<Exclude<Family, 'hull'>, Record<Target, Act>> = {
  mast: { gnome: mastGnome, frog: mastFrog, bird: mastBird, water: mastWater },
  leaf: { gnome: leafGnome, frog: leafFrog, bird: leafBird, water: leafWater },
  feather: { gnome: featherGnome, frog: featherFrog, bird: featherBird, water: featherWater },
  berry: { gnome: berryGnome, frog: berryFrog, bird: berryBird, water: berryWater },
  cap: { gnome: capGnome, frog: capFrog, bird: capBird, water: capWater },
  pebble: { gnome: pebbleGnome, frog: pebbleFrog, bird: pebbleBird, water: pebbleWater },
}

/** The act of a cell of the bank grid. A hull has no row: nobody answers it. */
export function bankAct(family: Family, target: Target): Act | null {
  return family === 'hull' ? null : TABLE[family][target]
}

export const BANK_ACTS: readonly Act[] = Object.values(TABLE).flatMap((row) => Object.values(row))
