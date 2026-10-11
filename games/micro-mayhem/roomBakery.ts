import { TIDY_L, bakerIdle, bakerSet } from './artBaker'
import type { Beat } from './figure'
import type { Point } from './input'
import { bakerWears, dogAbout, pieOnFace, tapTray, type House } from './house'
import { FLOOR_Y, GLASS, STAIRS_X } from './layout'
import type { Pen, Picture } from './pen'
import { box, fill, frame, rr, shelf, spots, wavyBoards } from './print'
import { b, type Answer, type Cast, type Live, type Part, type RoomDef, type Target } from './room'
import { dogKit } from './roomDog'

// The bakery. The baker carries a tray, and pies land on it. Its thing is the
// pies: the third tips the tower past him and it comes down on his head. With
// an egg laid in the henhouse the pies stand tall and domed where they were
// flat as plates. An awake dog eats the fallen pies and is round ever after.

const D = Math.PI / 180

/** The top of the tray, where the first pie sits. */
const TRAY = { x: 702, y: 473 }

// --- The print ---------------------------------------------------------------

function print(p: Pen): void {
  const top = GLASS.y, bottom = GLASS.y + GLASS.h
  fill(p, '#f7e3c4', () => box(p, GLASS.x, top, STAIRS_X - GLASS.x, FLOOR_Y - top))
  spots(p, '#f1d6ae', GLASS.x, top + 10, STAIRS_X, FLOOR_Y - 20, 40, 14, 31)
  fill(p, '#d9b384', () => box(p, GLASS.x, FLOOR_Y, STAIRS_X - GLASS.x, bottom - FLOOR_Y))
  wavyBoards(p, '#c79f6c', GLASS.x, STAIRS_X, FLOOR_Y + 6, bottom, 50, 41)
  fill(p, '#b5855a', () => box(p, GLASS.x, FLOOR_Y - 10, STAIRS_X - GLASS.x, 14))
  // The brick oven, with its fire and its chimney.
  fill(p, '#d9806a', () => { box(p, 96, top, 96, 180); rr(p, 50, 200, 300, 420, 30) })
  fill(p, '#c56a55', () => { const rows: readonly (readonly [number, number, number])[] = [[62, 246, 110], [190, 250, 140], [70, 300, 70], [156, 304, 96], [270, 300, 66], [60, 566, 130], [210, 570, 124]]; for (const [x, y, w] of rows) p.line([x, y, x + w / 2, y + 2, x + w, y], 5) })
  fill(p, '#3b2a22', () => p.blob([110, 520, 112, 400, 150, 350, 250, 350, 288, 400, 290, 520]))
  fill(p, '#f7923a', () => p.blob([134, 520, 150, 456, 176, 486, 200, 420, 226, 480, 248, 450, 266, 520]))
  fill(p, '#ffd75e', () => p.blob([166, 520, 184, 480, 200, 462, 218, 484, 236, 520]))
  fill(p, '#b98f52', () => rr(p, 40, 610, 320, 22, 10))
  fill(p, '#c9803a', () => { p.line([70, 640, 66, 716], 14); p.line([330, 640, 334, 716], 14) })
  // A long peel leaning on the oven, and a sack of flour with a scoop.
  fill(p, '#c9803a', () => p.line([386, 250, 392, 500, 388, 716], 9))
  fill(p, '#e9c48a', () => p.blob([362, 250, 364, 190, 390, 172, 414, 190, 412, 250]))
  fill(p, '#fffaf0', () => p.blob([420, 716, 412, 624, 440, 596, 500, 596, 530, 624, 522, 716]))
  fill(p, '#e6dcc4', () => { p.line([430, 628, 470, 640, 512, 628], 5); p.ell(470, 596, 34, 9) })
  // Shelves of bread: a round loaf, a long one, a plait and two buns.
  shelf(p, 450, 250, 250)
  fill(p, '#e9a25c', () => { p.ell(500, 226, 36, 26); p.blob([556, 250, 562, 214, 660, 208, 676, 250]) })
  fill(p, '#c97a34', () => { p.line([484, 218, 500, 210, 516, 218], 4); p.line([584, 226, 592, 240], 4); p.line([616, 222, 624, 238], 4); p.line([648, 222, 652, 238], 4) })
  shelf(p, 790, 300, 180)
  fill(p, '#e9a25c', () => { p.ell(830, 280, 24, 20); p.ell(884, 276, 26, 24); p.ell(934, 282, 20, 18) })
  fill(p, '#fff3ae', () => { p.ell(884, 262, 8, 5); p.ell(830, 268, 7, 4) })
  // A picture of a wheatsheaf, and the counter with a cake under a dome.
  frame(p, 770, 96, 110, 120, '#c9803a')
  fill(p, '#e2b34a', () => { p.line([825, 196, 822, 150, 806, 122], 6); p.line([825, 196, 826, 140, 826, 114], 6); p.line([825, 196, 830, 150, 846, 122], 6) })
  // The tie is a knot on the bunched stalks, not a band laid across them: a stroke across a stalk reads as a cross.
  fill(p, '#c9803a', () => p.ell(826, 172, 11, 7))
  fill(p, '#b5855a', () => rr(p, 810, 560, 176, 160, 16))
  fill(p, '#c9803a', () => rr(p, 800, 546, 194, 26, 12))
  fill(p, '#f58fb0', () => p.blob([852, 546, 856, 500, 944, 500, 948, 546]))
  fill(p, '#fffaf0', () => p.line([858, 506, 878, 514, 900, 504, 922, 514, 942, 506], 8))
  fill(p, '#e8705f', () => p.ell(900, 492, 9, 9))
  fill(p, '#dff1f6', () => p.line([840, 546, 846, 470, 900, 440, 954, 470, 960, 546], 5))
}

// --- The segments ------------------------------------------------------------

/** The tray, from the hand that carries it outward. */
function tray(p: Pen, y: number, tilt = 0): void {
  p.at(150, y, () => { p.line([0, 0, 96, 2, 196, 0], 11); p.line([0, 0, -2, -12], 8); p.line([196, 0, 198, -12], 8) }, { turn: tilt * D })
}

/** Where the baker stands, and how large. */
const STAND = { x: 470, y: 700, scale: 0.9 }
/** The empty tray hanging from his hand once the tower is down: moved and tilted from where he carries it. */
const HANG = { dx: 60, dy: 76, tilt: 62 }

/** Where the tray is drawn on the stage: level in front of him, or hanging from his hand once the tower is down. */
export function trayDrawn(down: boolean): { from: Point; to: Point } {
  const on = (x: number, y: number): Point => ({ x: STAND.x + x * STAND.scale, y: STAND.y + y * STAND.scale })
  if (!down) return { from: on(150, -232), to: on(346, -232) }
  const a = HANG.tilt * D
  return { from: on(150 + HANG.dx, -232 + HANG.dy), to: on(150 + HANG.dx + 196 * Math.cos(a), -232 + HANG.dy + 196 * Math.sin(a)) }
}

const B = bakerSet(
  'b',
  STAND.x,
  STAND.y,
  STAND.scale,
  {
    carry: { armL: [-84, -262, 10, -238, 150, -224], armR: [84, -262, 140, -246, 196, -224], legs: 'stand', breathes: true, held: (p) => tray(p, -232) },
    bent: { armL: [-84, -262, 10, -252, 150, -248], armR: [84, -262, 140, -262, 196, -248], legs: 'bent', held: (p) => tray(p, -232) },
    toes: { armL: [-84, -262, 10, -220, 150, -202], armR: [84, -262, 140, -226, 196, -202], legs: 'toes', held: (p) => tray(p, -232) },
    giggle: { armL: [-84, -262, 10, -252, 150, -248], armR: [84, -262, 140, -262, 196, -248], legs: 'bent', shake: true, held: (p) => tray(p, -232) },
    under: { armL: [-84, -262, -150, -310, -120, -380], armR: [84, -262, 150, -310, 120, -380], legs: 'bent' },
    empty: { armL: [-84, -262, -110, -200, -100, -130], armR: [84, -262, 150, -240, 180, -170], legs: 'stand', breathes: true, held: (p) => p.at(HANG.dx, HANG.dy, () => tray(p, -232, HANG.tilt)) },
    flip: { armL: [-84, -262, 10, -238, 150, -224], armR: [84, -262, 140, -246, 196, -224], legs: 'stand', held: (p) => { tray(p, -232); p.ell(250, -200, 5, 9); p.ell(290, -192, 5, 9) } },
    // His free hand straightens the tip of his moustache while the empty tray hangs from the other.
    tidy: { armL: TIDY_L, armR: [84, -262, 150, -240, 180, -170], legs: 'stand', held: (p) => p.at(HANG.dx, HANG.dy, () => tray(p, -232, HANG.tilt)) },
    feel: { armL: [-84, -262, -160, -290, -220, -272], armR: [84, -262, 150, -240, 180, -170], legs: 'stand', breathes: true, held: (p) => p.at(HANG.dx, HANG.dy, () => tray(p, -232, HANG.tilt)) },
  },
  {
    calm: { eyes: 'calm', whiskers: 'down' },
    blink: { eyes: 'shut', whiskers: 'down' },
    strain: { eyes: 'squint', whiskers: 'level', cheeks: true },
    glad: { eyes: 'glad', whiskers: 'up', mouth: 'grin' },
    shock: { eyes: 'wide', whiskers: 'wild', mouth: 'o' },
  },
)

/** A pie on the tray or on the pie below it. `kind` is its top: a cherry, or a leaf and a slit. Flat as a plate, or tall and domed. */
function pie(p: Pen, y: number, tall: boolean, kind: 'A' | 'B', x = TRAY.x): void {
  const high = tall ? 54 : 20
  p.blob([x - 66, y, x - 62, y - high * 0.7, x - 30, y - high, x + 30, y - high, x + 62, y - high * 0.7, x + 66, y])
  for (const dx of [-52, -26, 0, 26, 52]) p.ell(x + dx, y - 3, 15, 7)
  if (kind === 'A') p.ell(x, y - high - 6, 9, 9)
  else { p.ell(x - 8, y - high - 4, 14, 6, -0.5); p.cut(() => p.line([x + 10, y - high * 0.75, x + 30, y - high * 0.6], 4)) }
  p.cut(() => p.line([x - 44, y - high * 0.42, x, y - high * 0.52, x + 44, y - high * 0.42], 4))
}

/** The first `count` of the three splats round his head. */
function splat(p: Pen, count: number): void {
  for (const [x, y, turn] of [[336, 296, -0.6], [604, 296, 0.6], [470, 214, 1.57]].slice(0, count)) p.at(x, y, () => { p.ell(0, 0, 20, 8); p.ell(26, -6, 6, 5); p.ell(-24, 8, 6, 5) }, { turn })
}

/** Seconds from the first flap of the rubber hat to the puff of the tall pies, so that the two are heard apart. */
const PUFF_AFTER_FLAPS = 0.45

/** How far the tower hops off the tray when his belly shakes it. */
const HOP = 40

/** The tower as it stands, a hop above the tray. */
export const inAir = (tower: readonly string[]): string[] => [...tower.map((name) => name.replace('pie', 'pieAir')), 'piesAir']

/** How high a pie stands with what is on its top. */
const rise = (tall: boolean): number => (tall ? 74 : 40)

const DOG = dogKit('bd', 268, 716, 0.46)

const segments: Record<string, Picture> = {
  ...B.segments,
  ...DOG.segments,
  /** The marks under the tower while it is in the air over the tray, as his belly shakes it. */
  piesAir: (p) => { for (const [x, turn] of [[-92, -0.5], [92, 0.5]]) p.ell(TRAY.x + x * 1.16, TRAY.y - 14, 9, 4, turn) },
  /** The tower sways: marks at both sides of it. */
  sway: (p) => { for (const [x, y, turn] of [[-96, -40, -0.3], [-104, -84, 0.2], [96, -50, 0.3], [102, -96, -0.2]]) p.ell(TRAY.x + x, TRAY.y + y, 5, 15, turn) },
  swayB: (p) => { for (const [x, y, turn] of [[-108, -50, 0.3], [-98, -98, -0.2], [106, -36, -0.3], [112, -84, 0.2]]) p.ell(TRAY.x + x, TRAY.y + y, 5, 15, turn) },
  /** A pie in the air on its way down to the tray. */
  pieDrop: (p) => { pie(p, 250, false, 'A'); p.ell(TRAY.x - 40, 190, 4, 12); p.ell(TRAY.x + 40, 190, 4, 12) },
  /** The tower of three tipping over him. */
  towerTip: (p) => p.about(TRAY.x - 60, TRAY.y, () => { pie(p, TRAY.y, false, 'A'); pie(p, TRAY.y - 40, false, 'B'); pie(p, TRAY.y - 80, false, 'A') }, { turn: -38 * D }),
  /** The pies where they fell: two flat on the floor, upside down, with what ran out of them. */
  fallen: (p) => {
    p.about(100, 700, () => pie(p, 700, false, 'B', 100), { turn: 180 * D, scale: 0.8 })
    p.about(144, 718, () => pie(p, 718, false, 'A', 144), { turn: 172 * D, scale: 0.66 })
    p.ell(60, 730, 12, 5)
    p.ell(128, 676, 6, 9)
  },
  /** What the dog left of them. */
  crumbs: (p) => { for (const [x, y] of [[70, 716], [96, 728], [128, 712], [150, 730], [110, 702]]) p.ell(x, y, 6, 4, x) },
  /** Three splats round his head as the tower lands, one after another: each is lit with the ones before it. */
  splatA: (p) => splat(p, 1),
  splatB: (p) => splat(p, 2),
  splats: (p) => splat(p, 3),
}
for (const tall of [false, true]) {
  for (const kind of ['A', 'B'] as const) {
    const t = tall ? 'T' : 'F'
    segments[`pie1${t}${kind}`] = (p) => pie(p, TRAY.y, tall, kind)
    segments[`pie2${t}${kind}`] = (p) => pie(p, TRAY.y - rise(tall), tall, kind)
    // The same pies a hop above the tray: the whole tower as it stands, in the air.
    segments[`pieAir1${t}${kind}`] = (p) => pie(p, TRAY.y - HOP, tall, kind)
    segments[`pieAir2${t}${kind}`] = (p) => pie(p, TRAY.y - HOP - rise(tall), tall, kind)
  }
}

// --- The rules ---------------------------------------------------------------

const toppled = (h: House): boolean => h.pies === 3

/** The pies on the tray: tall once an egg has been laid, and in the order his belly last shook them into. */
function pies(h: House, live: Live, count: number = h.pies): string[] {
  const t = h.eggs > 0 ? 'T' : 'F', first = live.order ? 'B' : 'A', second = live.order ? 'A' : 'B'
  return count === 1 ? [`pie1${t}${first}`] : count === 2 ? [`pie1${t}${first}`, `pie2${t}${second}`] : []
}

function baker(h: House, body?: string, face = 'calm', hat?: 'other'): string[] {
  return B.cast(body ?? (toppled(h) ? (pieOnFace(h) ? 'feel' : 'empty') : 'carry'), face, h, hat)
}

function rest(h: House, live: Live): Cast {
  return {
    baker: baker(h),
    pies: pies(h, live),
    extra: [],
    fallen: toppled(h) ? [h.full ? 'crumbs' : 'fallen'] : [],
    dog: DOG.rest(h),
  }
}

function targets(h: House): Target[] {
  // The tray is touched where it is drawn: over the tray and its tower while he carries it, and on the tray
  // hanging from his hand once the tower is down.
  const hung = trayDrawn(true)
  const tray: Target = toppled(h)
    ? { id: 'tray', shape: { x: (hung.from.x + hung.to.x) / 2, y: (hung.from.y + hung.to.y) / 2, rx: Math.abs(hung.to.x - hung.from.x) / 2 + 34, ry: Math.abs(hung.to.y - hung.from.y) / 2 + 20 } }
    : { id: 'tray', shape: { x: TRAY.x, y: TRAY.y - 50, rx: 120, ry: 120 } }
  const out: Target[] = [tray, { id: 'nose', shape: B.head }, { id: 'belly', shape: B.belly }]
  if (DOG.rest(h).length > 0) out.push({ id: 'dog', shape: DOG.area })
  return out
}

/** The dog eats the pies where they fell, and is round. */
function eats(after: number): Part[] {
  return [
    { who: 'dog', after, beats: [b('bdBark', 0.16, 'dogGobble'), b('bdSitB', 0.12), b('bdBark', 0.16, 'dogGobble'), b('bdSitB', 0.12), b('bdRoundB', 0.4, 'dogBurp'), b('bdRound', 0.3)] },
    { who: 'fallen', after: after + 0.3, beats: [b('crumbs', Infinity)] },
  ]
}

function touch(id: string, h: House, live: Live): Answer | null {
  switch (id) {
    case 'tray': {
      const out = tapTray(h)
      if (out.came === 'again') return { plan: [{ who: 'baker', beats: [b(baker(h, pieOnFace(h) ? 'feel' : 'flip', 'shock', 'other'), 0.4, 'trayWobble'), b(baker(h), 0.2)] }] }
      const drop: Part = { who: 'extra', beats: [b('pieDrop', 0.14, 'pieFall'), b([], 0.01)] }
      if (out.came === 'punch') {
        // The third pie tips the tower past him and it comes down on his head.
        const was = { ...out.house, pies: 2 as const, full: h.full }
        return {
          house: out.house,
          save: 'now',
          scene: true,
          plan: [
            drop,
            { who: 'baker', after: 0.14, beats: [b(baker(was, 'bent', 'strain'), 0.2, 'pieThump'), b(baker(was, 'under', 'shock'), 0.35, 'towerWhistle'), b(baker(out.house, pieOnFace(out.house) ? 'feel' : 'empty', 'shock'), 0.6), b(baker(out.house), 0.3)] },
            { who: 'pies', after: 0.14, beats: [b(pies(h, live, 2), 0.2), b('towerTip', 0.35), b('splatA', 0.1, 'pieSplat'), b('splatB', 0.1, 'pieSplatB'), b('splats', 0.14, 'pieSplatC'), b([], 0.3)] },
            { who: 'fallen', after: 0.69, beats: [b('fallen', Infinity)] },
            ...(dogAbout(h) ? eats(1.0) : []),
          ],
        }
      }
      return {
        house: out.house,
        save: 'now',
        plan: [
          drop,
          { who: 'baker', after: 0.14, beats: [b(baker(out.house, 'bent', 'strain'), 0.3, 'pieThump'), b(baker(out.house), 0.3)] },
          { who: 'pies', after: 0.14, beats: [b([...pies(out.house, live), 'sway'], 0.3), b([...pies(out.house, live), 'swayB'], 0.3, 'pieWobble'), b(pies(out.house, live), 0.2)] },
        ],
      }
    }
    case 'belly': {
      // He giggles, and the whole tower hops and lands in another order.
      const before = pies(h, live)
      live.order = live.order ? 0 : 1
      return {
        plan: [
          { who: 'baker', beats: [b(baker(h, toppled(h) ? undefined : 'giggle', 'glad', 'other'), 0.5, 'bakerTrill'), b(baker(h), 0.3)] },
          ...(before.length > 0 ? [{ who: 'pies', beats: [b(inAir(before), 0.25), b(pies(h, live), 0.4, 'pieThump')] }] : []),
        ],
      }
    }
    case 'nose':
      return { plan: [{ who: 'baker', beats: [b(baker(h, undefined, 'strain', 'other'), 0.4, 'bakerHum'), b(baker(h), 0.3)] }] }
    case 'dog':
      return { plan: [DOG.tap(h)] }
    default:
      return null
  }
}

/** What he has on his head is seen as he turns. */
function carried(h: House): Beat[] {
  if (bakerWears(h) !== 'cap') return [b(baker(h, undefined, 'calm', 'other'), 0.13, 'rubberFlap'), b(baker(h), 0.1), b(baker(h, undefined, 'calm', 'other'), 0.13, 'rubberFlapB'), b(baker(h), 0.3)]
  if (pieOnFace(h)) return [b(baker(h), 0.4, 'pieHum')]
  return []
}

export const bakery: RoomDef = {
  id: 'bakery',
  print,
  segments,
  ghosts: ['bBody_carry', 'bHead_calm_stand', 'bHat_cap_stand', 'pie1TA', 'pie2TB', 'towerTip', 'fallen', ...DOG.ghosts],
  enter: () => ({ order: 0 }),
  rest,
  idle(who, h, _live, rng) {
    if (who === 'baker') {
      const pose = toppled(h) ? (pieOnFace(h) ? 'feel' : 'empty') : 'carry'
      // Carrying, he straightens his tower: up on his toes for a moment to level it. With the tray empty he straightens his moustache.
      const tidy = pose === 'carry' ? [b(baker(h, 'toes', 'strain'), 0.3), b(baker(h), 0.2)] : pose === 'empty' ? [b(baker(h, 'tidy', 'glad'), 0.5), b(baker(h), 0.2)] : null
      return bakerIdle(rng.next(), rng.next(), baker(h), baker(h, `${pose}In`), baker(h, undefined, 'blink'), tidy)
    }
    if (who === 'dog') return DOG.idle(h, rng)
    return null
  },
  targets,
  touch: (id, h, live) => touch(id, h, live),
  leave(h, live) {
    if (toppled(h)) return carried(h).length > 0 ? [{ who: 'baker', beats: carried(h).slice(0, 1) }] : []
    // He tiptoes on the spot with the tower swaying over him.
    const steps = [b(baker(h, 'toes', 'strain'), 0.12, 'tiptoeA'), b(baker(h, 'carry', 'strain'), 0.12, 'tiptoeB'), b(baker(h, 'toes', 'strain'), 0.12, 'tiptoeA'), b(baker(h, 'carry', 'strain'), 0.12, 'tiptoeB')]
    const plan: Part[] = [{ who: 'baker', beats: steps }]
    if (h.pies > 0) plan.push({ who: 'pies', beats: [b([...pies(h, live), 'sway'], 0.24), b([...pies(h, live), 'swayB'], 0.24)] })
    return plan
  },
  arrive(h, live, eating) {
    const plan: Part[] = eating ? eats(0.5) : [...DOG.arrive(h)]
    // He comes in on his feet first, and then finds them.
    if (eating) plan.unshift({ who: 'dog', after: 0.12, beats: [b('bdIn', 0.38, 'dogPant')] }, { who: 'fallen', beats: [b('fallen', Infinity)] })
    const beats = carried(h)
    if (beats.length > 0) plan.push({ who: 'baker', after: 0.3, beats })
    // With an egg laid the pies stand tall, whatever he has on his head: under the rubber hat the puff comes after its two flaps.
    if (h.eggs > 0 && pies(h, live).length > 0) plan.push({ who: 'pies', after: beats.length > 0 ? 0.3 + PUFF_AFTER_FLAPS : 0.3, beats: [b(pies(h, live), 0.3, 'piePuff')] })
    return plan
  },
  squint: (h) => [{ who: 'baker', after: 0.1, beats: [b(baker(h, undefined, 'strain'), 0.8, 'bakerHide')] }, ...DOG.squint(h)],
  hint(h) {
    if (toppled(h)) return null
    return { at: { x: TRAY.x, y: TRAY.y - 30 }, glow: { x: TRAY.x, y: TRAY.y - 50, rx: 120, ry: 120 } }
  },
}
