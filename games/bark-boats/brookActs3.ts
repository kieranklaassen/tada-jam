import { GNOME_HAT_TIP, hold, lerp, type Anchors, type Cue } from './acts'
import { reedsBerry, reedsBroad, reedsNoSail, reedsPebble, reedsPod, reedsTwoMasts, reedsWalnut, spriteBareMast, spriteBerry, spriteBroad, spriteFeather, spriteNoSail, spritePebble, spriteTwoMasts, spriteWalnut, type BrookAct } from './brookActs'
import { branchBerry, branchBroad, branchBroadTall, branchFeather, branchNoSail, branchPebble, branchStalk, branchTwoMasts, branchWalnut, stonesBareMast, stonesBerry, stonesBroad, stonesNoSail, stonesPebble, stonesPod, stonesTwoMasts, stonesWalnut } from './brookActs2'
import { FALL_DROP, MEET, type PlaceName } from './layout'
import { bump, ease, span, type Stage } from './rig'
import type { Trait, Twist } from './traits'

// The brook grid, the small fall and the pond's edge, and the table that
// finds what a place answers a boat with.
//
// Every boat goes over the fall once, so the fall's answers to a boat's
// traits are one act made of their parts, in the order they happen: how it
// comes to the lip, how it drops, how it lands.

/** How far the boat travels over the lip. */
const OVER = -330
/** How far past the lip it lands. */
export const AFTER_LIP = -170

export function fallAct(traits: readonly Trait[], twists: readonly Twist[]): BrookAct {
  const has = (trait: Trait): boolean => traits.includes(trait)
  // Two masts go over stern first; a boat with no sail tips over, end first, with the gnome holding his hat.
  // Two bare masts are both: it goes over stern first and tips over that end.
  const sternFirst = has('twomasts'), tips = has('nosail')
  const chute = has('broad'), stone = has('pebble'), cork = has('walnut'), berry = has('berry'), cup = twists.includes('cap')
  const lip = sternFirst ? 1 : tips ? 0.8 : 0.4
  const drop = chute && stone ? 0.9 : chute ? 1.4 : stone ? 0.28 : 0.5
  const land = lip + drop
  const length = land + (cork ? 1.5 : 1.1)
  const cues: Cue[] = []
  if (sternFirst) cues.push([0.2, 'gurgle'])
  if (tips) cues.push([sternFirst ? 0.55 : 0.3, 'slide'])
  if (chute) cues.push([lip + 0.1, 'flutter'])
  if (stone) cues.push([land, 'boom'], [land + 0.06, 'splash', 0.8])
  else if (chute) cues.push([land, 'pat', 0.7])
  else if (tips) cues.push([land, 'splosh'])
  else if (!cork) cues.push([land, 'splash', 1.3])
  if (cork) cues.push([land, 'bloop'], [land + 0.6, 'pop', 0.8])
  if (berry) cues.push([land + 0.5, 'pip', 1.5])
  if (cup) cues.push([land + 0.25, 'glug', 1.2])
  cues.sort((a, b) => a[0] - b[0])
  const id = `fall:${traits.join('+') || 'plain'}${cup ? '+cap' : ''}`
  return {
    id, length, moves: OVER, who: ['boat', 'frog', 'gnome'], cues, leaves: 'arc', uses: berry ? 'berry' : undefined,
    pose(_k: number, t: number, s: Stage, p, a: Anchors) {
      const toLip = ease(t, 0, lip), fall = span(t, lip, land), after = span(t, land, length)
      // To the lip: stern first, nose first, or as it comes.
      if (sternFirst) { s.boat.face = 1 - 2 * ease(t, 0.1, lip - 0.1); s.gnome.turn = toLip }
      if (tips) { s.boat.tilt = -0.5 * ease(t, lip - 0.4, lip) * (1 - span(t, land - 0.05, land + 0.1)); s.gnome.armL = 0.9 * (1 - after) }
      // The drop: slow under a broad leaf, like a stone under a pebble.
      const down = chute ? fall : fall * fall
      // From wherever it is to the lip, and on from the lip to where it lands.
      s.boat.dx = (MEET.fall.at - a.boat.x) * toLip + AFTER_LIP * ease(t, lip, length - 0.3)
      s.boat.dy = FALL_DROP * down
      if (chute) { s.boat.billow = 1 - after; s.boat.tilt += 0.1 * Math.sin(t * 5) * (1 - after) * span(t, lip, lip + 0.2); s.boat.dy -= 16 * bump(fall, 0, 1) }
      // The landing.
      const size = stone ? 2.4 : cork ? 1.4 : chute ? 0.4 : 1
      if (t > land && after < 0.7) s.fx.push({ kind: 'splash', x: a.boat.x + s.boat.dx, y: a.boat.y + FALL_DROP - 8, k: span(after, 0, 0.7), size })
      if (stone) {
        // The frog is soaked.
        s.frog.squash = 0.35 * bump(after, 0.05, 0.5)
        s.frog.lidL = s.frog.lidR = 1 - span(after, 0.05, 0.1) * (1 - span(after, 0.7, 0.9))
        s.frog.mouth = 0.6 * bump(after, 0.5, 1)
        s.frog.dx = 3 * Math.sin(t * 50) * bump(after, 0.5, 0.9)
        if (after > 0.08 && after < 0.6) s.fx.push({ kind: 'drops', x: a.frog.x, y: a.frog.y - 210, k: span(after, 0.08, 0.6), size: 1.3 })
      } else s.frog.lookX = 1
      if (cork) {
        s.boat.dy += 70 * bump(after, 0, 0.42) - 26 * bump(after, 0.42, 0.7)
        s.gnome.lids = 1 - bump(after, 0, 0.5)
        if (after > 0.42 && after < 0.9) s.fx.push({ kind: 'spout', x: a.gnome.x + s.boat.dx - 30, y: a.gnome.y + FALL_DROP - 96, k: span(after, 0.42, 0.9), size: 1 })
      } else s.boat.dy += 14 * bump(after, 0, 0.3) * (chute ? 0.3 : 1)
      if (cup && after > 0.3 && after < 0.8) s.fx.push({ kind: 'drops', x: a.boat.x + s.boat.dx - 60, y: a.boat.y + FALL_DROP - 70, k: span(after, 0.3, 0.8), size: 0.7 })
      if (berry) {
        // It flies up at the lip and lands back on the gnome's hat.
        const fly = span(t, lip, land + 0.5), on = fly >= 1 ? 1 : 0, off = ease(after, 0.8, 1)
        const hx = a.gnome.x + s.boat.dx + GNOME_HAT_TIP.x, hy = a.gnome.y + s.boat.dy + GNOME_HAT_TIP.y - 14
        const sx = a.boat.x + s.boat.dx + a.home.x, sy = a.boat.y + s.boat.dy + a.home.y
        hold(p, lerp(lerp(sx, hx, fly), sx, off), lerp(lerp(sy, hy, fly), sy, off) - 150 * bump(fly, 0, 1) * (1 - on) - 40 * bump(off, 0, 1))
        s.gnome.lookY = -on * (1 - off)
        s.gnome.hatTilt += 0.2 * on * Math.sin(t * 9) * (1 - off)
      }
      s.gnome.squash += 0.2 * bump(after, 0, 0.25)
    },
  }
}

// --- The still pond's edge ----------------------------------------------------

/** A ring from behind sends the bare boat on into the lilies. A lap of water. */
export const pondFree: BrookAct = {
  id: 'pond:free', length: 0.5, moves: -40, who: ['boat'], cues: [[0, 'lap']], leaves: 'arc',
  pose(k, _t, s, _p, a) {
    s.boat.dx = -40 * a.gain * ease(k, 0, 1)
    s.boat.tilt = -0.06 * bump(k, 0, 1)
  },
}

/** No sail: it stops short of the lilies and waits for a ring from a finger. One drip. */
export const pondNoSail: BrookAct = {
  id: 'pond:nosail', length: 0.9, moves: 0, who: ['boat'], cues: [[0.5, 'drip', 0.8]], leaves: 'arc',
  pose(k, _t, s) {
    s.boat.tilt = 0.03 * bump(k, 0, 1)
    s.gnome.lookX = -1
  },
  holds(s) {
    s.gnome.lookX = -1
    s.gnome.armL = 0.3
  },
  frees: pondFree,
}

// --- What a place answers a boat with -------------------------------------------

type Row = Partial<Record<Trait, BrookAct>>

const ROWS: Record<Exclude<PlaceName, 'fall' | 'pond'>, Row> = {
  reeds: { broad: reedsBroad, nosail: reedsNoSail, twomasts: reedsTwoMasts, pebble: reedsPebble, walnut: reedsWalnut, berry: reedsBerry },
  sprite: { broad: spriteBroad, nosail: spriteNoSail, twomasts: spriteTwoMasts, pebble: spritePebble, walnut: spriteWalnut, berry: spriteBerry },
  stones: { broad: stonesBroad, nosail: stonesNoSail, twomasts: stonesTwoMasts, pebble: stonesPebble, walnut: stonesWalnut, berry: stonesBerry },
  branch: { broad: branchBroad, nosail: branchNoSail, twomasts: branchTwoMasts, pebble: branchPebble, walnut: branchWalnut, berry: branchBerry },
}

/** How the masts and sails stand, where a row's answer depends on it. */
export type Standing = {
  /** A broad sail stands on the tall stalk. */
  broadOnTall?: boolean
  /** Two masts stand, and not both carry a sail. */
  bareMast?: boolean
}

/**
 * The acts a place answers a boat with, in the order they play: one for each trait the boat has, in the order
 * of the grid's rows, then one for each of the five makings that changes a row. An act that holds the boat on a
 * sill of its own comes first, since the boat meets the sill before anything past it. A boat with none of the
 * traits is answered by nothing and drifts through.
 */
export function answersAt(place: PlaceName, traits: readonly Trait[], twists: readonly Twist[], more: Standing = {}): BrookAct[] {
  if (place === 'fall') return [fallAct(traits, twists)]
  if (place === 'pond') return traits.includes('nosail') ? [pondNoSail] : []
  const pod = twists.includes('pod'), stalk = twists.includes('stalk'), feather = twists.includes('feather')
  const acts: BrookAct[] = []
  for (const trait of traits) {
    let act = ROWS[place][trait]
    if (place === 'reeds' && trait === 'nosail' && pod) act = reedsPod
    if (place === 'stones' && trait === 'broad' && pod) act = stonesPod
    // The branch holds the boat by the leaf: the broad sail must be the one on the tall mast.
    if (place === 'branch' && trait === 'broad' && more.broadOnTall) act = branchBroadTall
    // Two masts that do not both carry a sail have no second sail to give the breath back or to slap.
    if (place === 'sprite' && trait === 'twomasts' && more.bareMast) act = spriteBareMast
    if (place === 'stones' && trait === 'twomasts' && more.bareMast) act = stonesBareMast
    if (act) acts.push(act)
  }
  if (place === 'sprite' && feather) acts.push(spriteFeather)
  // A tall stalk meets the branch by itself wherever the leaf is not on it: with no broad sail, or with the broad sail on the other mast.
  if (place === 'branch' && stalk && !(traits.includes('broad') && more.broadOnTall)) acts.push(branchStalk)
  if (place === 'branch' && feather) acts.push(branchFeather)
  // The sill is met first; the branch holds a boat last, when everything else has been answered.
  acts.sort((a, b) => Number(b === stonesPebble) - Number(a === stonesPebble) || Number(a === branchBroadTall) - Number(b === branchBroadTall))
  return acts
}

/** Every act of the brook with a fixed form, for the tests. */
export const BROOK_ACTS: readonly BrookAct[] = [
  ...Object.values(ROWS).flatMap((row) => Object.values(row)),
  reedsPod, stonesPod, branchBroadTall, branchStalk, branchFeather, spriteFeather, spriteBareMast, stonesBareMast, pondNoSail, pondFree,
]
