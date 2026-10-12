import { OWL, OWL_EYES, OWL_X } from './artCast'
import { holdWeed, pullWeed, tapFlower, type House } from './house'
import { FLOOR_Y, GLASS, STAIRS_X, type Oval } from './layout'
import type { Pen, Picture } from './pen'
import { box, fill, scatter } from './print'
import { b, type Answer, type Cast, type Live, type Part, type Plan, type RoomDef, type Target } from './room'
import { dogKit } from './roomDog'

// The garden. A flower bed with a weed in it, the owl asleep in the tree, and
// a pumpkin patch. Its thing is the weed, and it is pulled, not tapped: a
// finger that takes hold stretches it like rubber, and a pull upward brings
// it out with a root three times its length. The jolt drops the owl off its
// branch to hang by its feet.

const D = Math.PI / 180

/** Where the weed stands in the bed. */
const WEED = { x: 480, y: 600 }
/** The flower that can be picked, and the two that cannot. */
const BLOOM = { x: 650, y: 600 }
const OTHERS = [{ x: 340, y: 604, tall: 120 }, { x: 760, y: 604, tall: 100 }] as const
/** How far up the owl sits in the tree, from where it sits in the bedroom window. */
const OWL_DY = 56
/** Its feet on the branch, which it hangs from. */
const PERCH = { x: OWL_X, y: 330 + OWL_DY }
/** How far the finger has to go up for the weed to be taut, and for it to come out. */
export const TAUT = 50
export const OUT = 120

// --- The print ---------------------------------------------------------------

function print(p: Pen): void {
  const top = GLASS.y, bottom = GLASS.y + GLASS.h
  fill(p, '#bfe4f7', () => box(p, GLASS.x, top, STAIRS_X - GLASS.x, FLOOR_Y - top))
  fill(p, '#ffe27a', () => p.ell(840, 130, 50, 50))
  fill(p, '#fff3ae', () => { for (let i = 0; i < 9; i++) p.at(840, 130, () => p.ell(74 + (i % 3) * 5, 0, 12, 5), { turn: (i * 40 + 8) * D }) })
  fill(p, '#ffffff', () => { p.ell(520, 120, 60, 20); p.ell(560, 104, 38, 22); p.ell(480, 106, 30, 16); p.ell(700, 230, 44, 14); p.ell(726, 218, 26, 14) })
  // Hills, a hedge with uneven humps, and the lawn.
  fill(p, '#a5d98b', () => p.blob([GLASS.x, FLOOR_Y, GLASS.x, 430, 260, 370, 520, 440, 760, 380, STAIRS_X, 430, STAIRS_X, FLOOR_Y]))
  fill(p, '#6fb86a', () => p.blob([GLASS.x, FLOOR_Y, GLASS.x, 500, 150, 470, 300, 506, 430, 480, 560, 512, 700, 474, 840, 508, STAIRS_X, 484, STAIRS_X, FLOOR_Y]))
  fill(p, '#8fce7c', () => box(p, GLASS.x, FLOOR_Y - 6, STAIRS_X - GLASS.x, bottom - FLOOR_Y + 6))
  fill(p, '#7cc06c', () => { const next = scatter(71); for (let i = 0; i < 40; i++) { const x = 44 + next() * 940, y = 620 + next() * 110; p.line([x, y, x + 4 - next() * 8, y - 12 - next() * 8], 3) } })
  // The tree: a trunk, a crown of lumps, and the branch the owl sleeps on.
  fill(p, '#9a6a44', () => { p.blob([58, 716, 70, 420, 60, 250, 120, 250, 130, 420, 150, 716]); p.line([110, 392, 220, 386, 330, 398], 20) })
  fill(p, '#7a5234', () => { p.line([84, 470, 96, 560, 88, 650], 5); p.ell(110, 330, 9, 14) })
  fill(p, '#4f9f58', () => { p.ell(110, 170, 110, 100); p.ell(220, 130, 90, 70); p.ell(300, 196, 70, 54); p.ell(60, 100, 60, 60) })
  fill(p, '#3f8a4c', () => { p.ell(140, 150, 30, 20); p.ell(250, 120, 22, 14); p.ell(80, 210, 24, 16) })
  // The flower bed: turned earth with a stone edge of uneven stones.
  fill(p, '#8a5a3c', () => p.blob([270, 640, 290, 596, 480, 588, 700, 592, 820, 600, 836, 640, 700, 652, 420, 654]))
  fill(p, '#6f452c', () => { const next = scatter(77); for (let i = 0; i < 18; i++) p.ell(296 + next() * 520, 606 + next() * 36, 7 + next() * 6, 4) })
  fill(p, '#d9d2c0', () => { for (const [x, w] of [[282, 30], [338, 22], [392, 34], [462, 26], [524, 36], [596, 24], [650, 32], [716, 26], [776, 30]]) p.ell(x + w / 2, 654, w / 2, 9) })
  // A watering can, and the pumpkin patch the dog sits by.
  fill(p, '#6fcdbb', () => { p.blob([196, 716, 190, 650, 262, 650, 256, 716]); p.line([256, 670, 300, 640], 9); p.line([196, 664, 170, 680, 196, 700], 7) })
  fill(p, '#4fb3a0', () => p.ell(304, 636, 10, 7, -0.6))
  fill(p, '#f7923a', () => { p.ell(700, 700, 40, 28); p.ell(770, 708, 30, 22) })
  // The ribs of the pumpkins: three on the large one, each with its own bend and length, and two on the small one. Never a facing pair.
  fill(p, '#d9742a', () => { p.line([682, 680, 672, 702, 680, 720], 4); p.line([699, 673, 696, 700, 700, 727], 4); p.line([716, 676, 730, 696, 722, 722], 4); p.line([762, 689, 758, 708, 762, 727], 4); p.line([778, 690, 786, 706, 780, 724], 4) })
  fill(p, '#4f9f58', () => { p.line([700, 672, 706, 660, 720, 658], 5); p.line([770, 686, 764, 676], 5); p.ell(736, 668, 16, 8, 0.4) })
}

// --- The segments ------------------------------------------------------------

/** The weed: a hairy stalk of a given height with three ragged leaves and a spiky head. */
function weed(p: Pen, tall: number, lean = 0, bud = false): void {
  p.about(WEED.x, WEED.y, () => {
    const top = WEED.y - tall
    p.line([WEED.x, WEED.y, WEED.x - 6, WEED.y - tall * 0.5, WEED.x, top], tall > 150 ? 7 : 11)
    for (const [t, side] of [[0.3, -1], [0.55, 1], [0.8, -1]] as const) {
      const y = WEED.y - tall * t
      p.blob([WEED.x, y, WEED.x + side * 26, y - 22, WEED.x + side * 58, y - 14, WEED.x + side * 40, y + 2, WEED.x + side * 52, y + 14, WEED.x + side * 22, y + 8])
    }
    for (let i = 0; i < 7; i++) p.at(WEED.x, top - 8, () => p.poly([0, -8, 30, 0, 0, 8]), { turn: (i * 51 - 180) * D })
    p.ell(WEED.x, top - 8, 15, 15)
    if (bud) {
      // An ugly bud, open, with a leaf stuck out of it like a tongue.
      p.cut(() => p.ell(WEED.x + 2, top - 6, 9, 7))
      p.blob([WEED.x + 2, top - 4, WEED.x + 30, top + 6, WEED.x + 54, top + 30, WEED.x + 26, top + 26, WEED.x + 4, top + 6])
    } else p.cut(() => { p.ell(WEED.x - 5, top - 10, 3, 3); p.ell(WEED.x + 6, top - 10, 3, 3) })
  }, { turn: lean * D })
}

/** Out of the ground and in the air, with its root, three times its length, still unwinding from the hole. */
function weedOut(p: Pen): void {
  p.at(0, -230, () => weed(p, 70, -14))
  p.line([WEED.x, WEED.y - 230, WEED.x + 26, WEED.y - 170, WEED.x - 22, WEED.y - 110, WEED.x + 18, WEED.y - 50, WEED.x - 4, WEED.y - 4], 8)
  for (const [y, side] of [[-190, -1], [-140, 1], [-84, -1], [-30, 1]]) p.line([WEED.x + side * 8, WEED.y + y, WEED.x + side * 36, WEED.y + y + 14], 4)
  for (const [x, y, turn] of [[-70, -20, -0.5], [70, -24, 0.5], [-44, -50, -1.1], [48, -54, 1.1]]) p.ell(WEED.x + x, WEED.y + y, 9, 5, turn)
}

/** The hole it left, with crumbs of earth round it. */
function hole(p: Pen, worm: boolean): void {
  p.ell(WEED.x, WEED.y + 2, 34, 11)
  for (const [x, y] of [[-52, -6], [50, -4], [-36, 16], [44, 16]]) p.ell(WEED.x + x, WEED.y + y, 8, 5)
  if (worm) {
    p.line([WEED.x + 4, WEED.y, WEED.x - 8, WEED.y - 26, WEED.x + 10, WEED.y - 46], 11)
    p.cut(() => p.ell(WEED.x + 12, WEED.y - 46, 2.5, 2.5))
  }
}

/** A flower: a stem that leans, two leaves, and a head of petals, thrown up when it starts. */
function flower(p: Pen, x: number, y: number, tall: number, lean: number, petals: number, gasp = false): void {
  p.about(x, y, () => {
    const top = y - tall
    p.line([x, y, x + 5, y - tall * 0.5, x, top], 9)
    p.ell(x - 22, y - tall * 0.34, 22, 8, 0.5)
    p.ell(x + 24, y - tall * 0.5, 22, 8, -0.5)
    for (let i = 0; i < petals; i++) {
      const a = (i * 360) / petals + 12
      // Thrown up, the petals stand off the head and point upward.
      if (gasp) p.at(x, top, () => p.ell(0, -44 - (i % 2) * 14, 8, 15), { turn: (-60 + (i * 120) / (petals - 1)) * D })
      else p.at(x, top, () => p.ell(30, 0, 19, 11), { turn: a * D })
    }
    p.ell(x, top, 19, 19)
    p.cut(() => {
      if (gasp) { p.ell(x - 7, top - 3, 4, 5); p.ell(x + 7, top - 3, 4, 5); p.ell(x, top + 9, 4, 4) }
      else p.ell(x, top, 8, 8)
    })
  }, { turn: lean * D })
}

function others(p: Pen, lean: number, gasp = false): void {
  OTHERS.forEach((one, i) => flower(p, one.x, one.y, one.tall, lean, i === 0 ? 5 : 7, gasp))
}

/** The owl in the tree, as it is drawn in the bedroom window, lower down. */
const perched = (pose: string): Picture => (p) => p.at(0, OWL_DY, () => OWL[pose](p))
/** Hanging from the branch by its feet. Its head has turned over, so its face is the right way up. */
const hanging = (pose: string, swing: number): Picture => (p) => p.about(PERCH.x, PERCH.y, () => p.at(0, OWL_DY, () => OWL[pose](p)), { turn: (180 + swing) * D })

const DOG = dogKit('gd', 880, 716, 0.5, true)

const segments: Record<string, Picture> = {
  ...DOG.segments,
  weed0: (p) => weed(p, 110),
  weed0Bud: (p) => weed(p, 110, 0, true),
  /** Stretched like rubber: thinner and twice as tall. */
  weed1: (p) => weed(p, 200, 5),
  weed1Bud: (p) => weed(p, 200, 5, true),
  /** Taut: as far as it will go, with marks where it strains. */
  weed1Tall: (p) => { weed(p, 290, 0); p.ell(WEED.x - 44, WEED.y - 12, 9, 4, -0.5); p.ell(WEED.x + 44, WEED.y - 12, 9, 4, 0.5) },
  weedOut,
  hole: (p) => hole(p, false),
  holeWorm: (p) => hole(p, true),
  flowersUp: (p) => others(p, 0),
  flowersLean: (p) => others(p, 12),
  flowersGasp: (p) => others(p, 0, true),
  /** The gasp of flowers that lean with the stretched weed: they stay leaning, clear of the one beside them. */
  flowersGaspLean: (p) => others(p, 12, true),
  bloomUp: (p) => flower(p, BLOOM.x, BLOOM.y, 150, 0, 9),
  bloomLean: (p) => flower(p, BLOOM.x, BLOOM.y, 150, 12, 9),
  /** Picked: in the air over its stub, roots and all. */
  bloomOut: (p) => {
    p.at(0, -90, () => flower(p, BLOOM.x, BLOOM.y, 150, -8, 9))
    p.line([BLOOM.x + 10, BLOOM.y - 90, BLOOM.x + 2, BLOOM.y - 66, BLOOM.x + 16, BLOOM.y - 50], 5)
    p.line([BLOOM.x + 10, BLOOM.y - 88, BLOOM.x + 28, BLOOM.y - 70], 4)
    p.ell(BLOOM.x - 30, BLOOM.y - 8, 8, 4, -0.5)
    p.ell(BLOOM.x + 32, BLOOM.y - 10, 8, 4, 0.5)
  },
  /** What is left where it grew. */
  bloomStub: (p) => { p.line([BLOOM.x, BLOOM.y, BLOOM.x + 2, BLOOM.y - 16], 9); p.ell(BLOOM.x - 16, BLOOM.y - 6, 14, 6, 0.4) },
  gOwlSleep: perched('owlBlink'),
  gOwlPeek: (p) => { perched('owlOpen')(p); p.ell(OWL_EYES.x - OWL_EYES.apart, OWL_EYES.y + OWL_DY, 9, 9); p.ell(OWL_EYES.x + OWL_EYES.apart, OWL_EYES.y + OWL_DY, 9, 9) },
  gOwlHang: hanging('owlFlip', 0),
  gOwlHangB: hanging('owlFlip', 9),
  /** As it drops: swung out, with the start it gives. */
  gOwlDrop: (p) => { hanging('owlFlip', -10)(p); p.ell(PERCH.x - 96, PERCH.y + 36, 12, 5, -0.5); p.ell(PERCH.x + 84, PERCH.y + 30, 12, 5, 0.5) },
}

// --- The rules ---------------------------------------------------------------

function weedRest(h: House, live: Live): string[] {
  return h.weed === 0 ? ['weed0'] : h.weed === 1 ? [live.taut ? 'weed1Tall' : 'weed1'] : ['hole']
}

const leaning = (h: House): boolean => h.weed === 1

function rest(h: House, live: Live): Cast {
  return {
    owl: [live.hang ? 'gOwlHang' : 'gOwlSleep'],
    weed: weedRest(h, live),
    flowers: [leaning(h) ? 'flowersLean' : 'flowersUp'],
    bloom: h.flower ? ['bloomStub'] : [leaning(h) ? 'bloomLean' : 'bloomUp'],
    dog: DOG.rest(h),
  }
}

function weedArea(h: House): Oval {
  return h.weed === 0 ? { x: WEED.x, y: WEED.y - 62, rx: 76, ry: 86 } : h.weed === 1 ? { x: WEED.x + 8, y: WEED.y - 110, rx: 76, ry: 134 } : { x: WEED.x, y: WEED.y - 10, rx: 66, ry: 44 }
}

const owlArea = (live: Live): Oval => (live.hang ? { x: OWL_X, y: PERCH.y + 96, rx: 84, ry: 100 } : { x: OWL_X, y: PERCH.y - 96, rx: 84, ry: 104 })

function targets(h: House, live: Live): Target[] {
  const out: Target[] = [{ id: 'weed', shape: weedArea(h), grip: h.weed === 2 ? undefined : 'pull' }]
  if (!h.flower) out.push({ id: 'flower', shape: { x: BLOOM.x, y: BLOOM.y - 100, rx: 62, ry: 112 } })
  for (const one of OTHERS) out.push({ id: 'others', shape: { x: one.x, y: one.y - one.tall * 0.6, rx: 56, ry: one.tall * 0.62 } })
  out.push({ id: 'owl', shape: owlArea(live) })
  if (DOG.rest(h).length > 0) out.push({ id: 'dog', shape: DOG.area })
  return out
}

/** The flowers throw their petals up. */
const gasp = (h: House, after = 0): Part => ({ who: 'flowers', after, beats: [b(leaning(h) ? 'flowersGaspLean' : 'flowersGasp', 0.5, 'petalGasp'), b(leaning(h) ? 'flowersLean' : 'flowersUp', 0.2)] })

function touch(id: string, h: House, live: Live): Answer | null {
  switch (id) {
    case 'weed': {
      if (h.weed === 2) return { plan: [{ who: 'weed', beats: [b('holeWorm', 0.5, 'wormPop'), b('hole', 0.2)] }] }
      const out = holdWeed(h)
      // It is stretched already: the finger only takes hold of it, and it creaks.
      if (out.came === 'again') return { plan: [{ who: 'weed', beats: [b('weed1Tall', 0.12, 'weedCreak'), b(weedRest(h, live), 0.1)] }] }
      // It stretches like rubber, and the flowers beside it lean the same way.
      return {
        house: out.house,
        save: 'now',
        plan: [
          { who: 'weed', beats: [b('weed1', 0.4, 'weedCreak')] },
          { who: 'flowers', after: 0.1, beats: [b('flowersLean', 0.3)] },
          ...(h.flower ? [] : [{ who: 'bloom', after: 0.16, beats: [b('bloomLean', 0.3)] }]),
        ],
      }
    }
    case 'flower': {
      const out = tapFlower(h)
      // It comes up, and the other flowers throw their petals up.
      return {
        house: out.house,
        save: 'now',
        plan: [{ who: 'bloom', beats: [b('bloomOut', 0.5, 'flowerPluck'), b('bloomStub', 0.2)] }, gasp(out.house, 0.14)],
      }
    }
    case 'others':
      return { plan: [gasp(h)] }
    case 'owl':
      if (live.hang) return { plan: [{ who: 'owl', beats: [b('gOwlHangB', 0.25, 'owlHootDown'), b('gOwlHang', 0.2)] }] }
      return { plan: [{ who: 'owl', beats: [b('gOwlPeek', 0.6, 'owlHoo'), b('gOwlSleep', 0.2)] }] }
    case 'dog':
      return { plan: [DOG.tap(h)] }
    default:
      return null
  }
}

/** The finger that holds the weed has gone `up`. Taut at `TAUT`; out, root and all, at `OUT`. */
function pull(h: House, live: Live, up: number): Answer | null {
  if (h.weed !== 1) return null
  if (up >= OUT) {
    const out = pullWeed(h)
    if (!out) return null
    live.taut = 0
    live.hang = 1
    return {
      house: out.house,
      save: 'now',
      scene: true,
      plan: [
        { who: 'weed', beats: [b('weedOut', 0.6, 'weedPop'), b('hole', 0.3)] },
        { who: 'owl', after: 0.2, beats: [b('gOwlDrop', 0.3, 'owlWings'), b('gOwlHangB', 0.3, 'owlHootDown'), b('gOwlHang', 0.4)] },
        { who: 'flowers', after: 0.1, beats: [b('flowersUp', 0.3)] },
        ...(h.flower ? [] : [{ who: 'bloom', after: 0.1, beats: [b('bloomUp', 0.3)] }]),
        ...DOG.startle(h, 0.3),
      ],
    }
  }
  if (up >= TAUT && !live.taut) {
    live.taut = 1
    return { plan: [{ who: 'weed', beats: [b('weed1Tall', 0.1, 'weedCreakHi')] }] }
  }
  if (up < TAUT - 16 && live.taut) {
    live.taut = 0
    return { plan: [{ who: 'weed', beats: [b('weed1', 0.1, 'weedCreak')] }] }
  }
  return null
}

/** Let go before it came out, it twangs back. */
function letGo(h: House, live: Live): Plan {
  if (h.weed !== 1 || !live.taut) return []
  live.taut = 0
  return [{ who: 'weed', beats: [b('weed0', 0.08, 'weedTwang'), b('weed1', 0.2)] }]
}

export const garden: RoomDef = {
  id: 'garden',
  print,
  segments,
  ghosts: ['gOwlSleep', 'weed0', 'weed1Tall', 'flowersUp', 'bloomUp', ...DOG.ghosts],
  enter: () => ({ taut: 0, hang: 0 }),
  rest,
  idle(who, h, live, rng) {
    if (who === 'owl') return live.hang ? [b('gOwlHang', 1.6 + rng.next() * 2), b('gOwlHangB', 0.5)] : null
    if (who === 'weed' && h.weed === 2) return [b('hole', 4 + rng.next() * 4), b('holeWorm', 0.7)]
    if (who === 'dog') return DOG.idle(h, rng)
    return null
  },
  targets,
  touch: (id, h, live) => touch(id, h, live),
  pull,
  letGo,
  // It opens an ugly bud and sticks a leaf out like a tongue.
  leave: (h) => (h.weed === 2 ? [{ who: 'weed', beats: [b('holeWorm', 0.3, 'wormPop')] }] : [{ who: 'weed', beats: [b(h.weed === 0 ? 'weed0Bud' : 'weed1Bud', 0.4, 'weedToot')] }]),
  arrive: (h) => [...DOG.arrive(h)],
  squint: (h, live) => [{ who: 'owl', after: 0.1, beats: [b(live.hang ? 'gOwlHangB' : 'gOwlPeek', 0.8, 'owlHoo')] }, ...DOG.squint(h)],
  hint(h) {
    if (h.weed === 2) return null
    const at = { x: WEED.x, y: WEED.y - (h.weed === 0 ? 70 : 150) }
    return h.weed === 0 ? { at, glow: weedArea(h) } : { at, to: { x: at.x, y: at.y - OUT - 20 }, glow: weedArea(h) }
  },
}
