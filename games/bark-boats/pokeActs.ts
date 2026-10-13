import type { Act, Cue } from './acts'
import { TAU, bump, ease, span } from './rig'
import type { Opinion } from './traits'

// What each of the folk does when it is tapped, what the frog does at a ring
// that passes under him, and what the gnome thinks of each thing that lands
// on his boat. None of them has a thing to give back.

/** The frog swells and croaks, twice: the second pulse sounds on the frame his throat swells again. */
export const croak: Act = {
  id: 'frog:croak', length: 0.62, who: ['frog'], leaves: 'arc',
  cues: [[0, 'croak-a'], [0.24, 'croak-b']],
  pose(k, _t, s) {
    const first = bump(k, 0, 0.39), second = bump(k, 0.39, 1)
    s.frog.throat = Math.max(s.frog.throat, first * 0.8, second)
    s.frog.squash = -0.12 * first - 0.2 * second
    s.frog.mouth = 0.2 * Math.max(first, second)
  },
}

/** A ring passes under him: he flinches and gulps. */
export const flinch: Act = {
  id: 'frog:flinch', length: 0.5, who: ['frog'], leaves: 'arc',
  cues: [[0, 'ulp']],
  pose(k, _t, s) {
    const jolt = bump(k, 0, 1)
    s.frog.squash += 0.3 * jolt
    s.frog.throat = Math.max(s.frog.throat, 0.7 * jolt)
    s.frog.dy = -10 * jolt
    s.frog.lidL = s.frog.lidR = 1
  },
}

/** The kingfisher ruffles up and rattles his beak: one clap of the beak a note, the beak open before each and shut on it. */
const CLAPS = [0.14, 0.24, 0.34, 0.44]
export const rattle: Act = {
  id: 'bird:rattle', length: 0.9, who: ['bird'], leaves: 'arc',
  cues: [[0, 'ruffle'], ...CLAPS.map((at, index) => [at, 'rattle', 1 + index * 0.05] as const)],
  pose(k, t, s) {
    s.bird.ruffle = bump(k, 0, 1)
    let beak = 0
    for (const at of CLAPS) beak = Math.max(beak, t < at ? span(t, at - 0.09, at - 0.01) : 0)
    s.bird.beak = beak
    s.bird.head = 0.1 + 0.16 * Math.sin(t * 46) * s.bird.ruffle
    s.bird.tail = 0.7 * s.bird.ruffle
    s.bird.dy = 7 * bump(k, 0, 0.22)
  },
}

/** How the sprite's breath is timed: she breathes in, then the breath leaves her mouth and crosses the brook. */
export const BREATH = { inhale: 0.32, length: 1.17, reach: 860 } as const

/** The sprite breathes in until her cheeks are full and blows. */
export const blow: Act = {
  id: 'sprite:blow', length: BREATH.length, who: ['sprite'], leaves: 'arc',
  cues: [[0, 'inhale'], [BREATH.inhale, 'blow']],
  pose(_k, t, s) {
    const inn = span(t, 0, BREATH.inhale), out = span(t, BREATH.inhale, BREATH.length)
    s.sprite.cheeks = t < BREATH.inhale ? 0.3 + 0.7 * inn : 1 - 0.85 * out
    s.sprite.mouth = t < BREATH.inhale ? 0.3 * inn : 1 - 0.4 * span(out, 0.7, 1)
    s.sprite.lids = t < BREATH.inhale ? 1 : 0.25
    s.sprite.sink = -16 * (t < BREATH.inhale ? inn : 1 - out) + 6 * bump(out, 0, 1)
    s.sprite.breath = t < BREATH.inhale ? 0 : out
  },
}

/** The gnome lifts his hat, and it lands back on his head with a pat. */
export const hat: Act = {
  id: 'gnome:hat', length: 0.6, who: ['gnome'], leaves: 'arc',
  cues: [[0, 'squeak'], [0.42, 'pat']],
  pose(k, _t, s) {
    s.gnome.hatY = -50 * bump(k, 0, 0.7)
    s.gnome.armL = 0.8 * bump(k, 0, 0.8)
    s.gnome.squash = 0.18 * bump(k, 0.7, 1)
    s.gnome.mouth = 0.8
  },
}

const opinion = (id: Opinion, sound: [number, 'ha' | 'whoop' | 'hm' | 'mmm' | 'giggle' | 'grumble' | 'burst' | 'squeak'][], pose: Act['pose']): Act => ({
  id: `gnome:${id}`, length: 1.1, who: ['gnome'], leaves: 'arc', cues: sound.map(([at, name]): Cue => [at, name]), pose,
})

/** One answer of the gnome for each thing put on his boat, the same every time (traits.ts says which). */
export const OPINIONS: Record<Opinion, Act> = {
  ha: opinion('ha', [[0, 'ha']], (k, _t, s) => {
    s.gnome.armL = s.gnome.armR = 0.75
    s.gnome.hatTilt = -0.3 * bump(k, 0, 1)
    s.gnome.mouth = 0.6
    s.gnome.squash = -0.1 * bump(k, 0, 0.4)
  }),
  whoop: opinion('whoop', [[0, 'whoop']], (k, _t, s) => {
    const burst = bump(k, 0, 1)
    s.gnome.armL = s.gnome.armR = 1
    s.gnome.hatY = -26 * burst
    s.gnome.lean += 0.2 * burst
    s.gnome.mouth = 1
    s.gnome.squash = -0.2 * burst
  }),
  hm: opinion('hm', [[0, 'hm']], (k, _t, s) => {
    const sway = Math.sin(k * TAU * 2) * (1 - k)
    s.gnome.lean += 0.14 * sway
    s.gnome.hatTilt += 0.3 * sway
    s.gnome.mouth = 0.4
  }),
  sneeze: opinion('sneeze', [[0, 'squeak'], [0.55, 'burst']], (k, _t, s) => {
    const build = ease(k, 0, 0.48), out = span(k, 0.5, 0.54), after = span(k, 0.54, 1)
    s.gnome.lean = -0.3 * build * (1 - out) + 0.4 * out * (1 - after)
    s.gnome.lids = 1 - build * (1 - out)
    s.gnome.mouth = -0.5 * build + 1.5 * out * (1 - after)
    s.gnome.hatY = -90 * Math.sin(after * Math.PI) * out
    s.gnome.hatTilt += 0.8 * Math.sin(after * Math.PI) * out
  }),
  mmm: opinion('mmm', [[0, 'mmm']], (k, _t, s) => {
    s.gnome.armL = 0.3
    s.gnome.squash = 0.14 * Math.abs(Math.sin(k * TAU * 2.5)) * (1 - k)
    s.gnome.mouth = 0.8
    s.gnome.lean += 0.08 * bump(k, 0, 1)
  }),
  giggle: opinion('giggle', [[0, 'giggle']], (k, _t, s) => {
    const shake = Math.abs(Math.sin(k * TAU * 4)) * (1 - k)
    s.gnome.squash = 0.1 * shake
    s.gnome.hatY = -9 * shake
    s.gnome.mouth = 1
  }),
  grumble: opinion('grumble', [[0, 'grumble']], (k, _t, s) => {
    const burst = bump(k, 0, 1)
    s.gnome.armL = s.gnome.armR = -1
    s.gnome.hatTilt = 0.9 * span(k, 0, 0.3)
    s.gnome.mouth = -1
    s.gnome.squash = 0.16 * burst
    s.gnome.lean -= 0.18 * burst
  }),
  tuck: opinion('tuck', [[0.25, 'hm']], (k, _t, s) => {
    // He comes out from under the blanket to look, and ducks back.
    s.gnome.hide = Math.min(s.gnome.hide, 1 - bump(k, 0, 1))
    s.gnome.lookY = 1
  }),
}

export const POKE_ACTS: readonly Act[] = [croak, flinch, rattle, blow, hat, ...Object.values(OPINIONS)]
