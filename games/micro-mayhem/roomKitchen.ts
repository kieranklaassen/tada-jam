import { bakerIdle, bakerSet } from './artBaker'
import { fly, flyRub } from './artCast'
import type { Beat } from './figure'
import { bakerWears, pieOnFace, tapFly, type House } from './house'
import type { Point } from './input'
import { FLOOR_Y, GLASS, STAIRS_X, type Oval } from './layout'
import type { Pen, Picture } from './pen'
import { box, fill, frame, rr, spots, wallAndFloor, wavyBoards } from './print'
import { b, type Answer, type Cast, type Live, type Part, type RoomDef, type Target } from './room'
import { dogKit } from './roomDog'

// The kitchen. The baker stands on his stool at the stove with a ladle in one
// hand and a swatter in the other, and the fly is about over the soup pot.
// Its thing is the fly. When the soup has run over in the dining room the
// floor is awash here, the pot floats, and he stirs it from the stool.

const D = Math.PI / 180

/** The spots the fly sits on, over the pot and within the swatter's reach, each on plain wall. */
export const FLY_SPOTS = [{ x: 470, y: 290 }, { x: 440, y: 170 }, { x: 320, y: 140 }, { x: 210, y: 180 }, { x: 250, y: 236 }] as const
/** What is printed on the wall as a picture or a thing: the fly never sits on one of these, where it would be lost. */
export const PICTURES: readonly { x: number; y: number; w: number; h: number }[] = [
  { x: 752, y: 60, w: 226, h: 198 },
  { x: 520, y: 150, w: 110, h: 96 },
  { x: 44, y: 90, w: 130, h: 142 },
  { x: 44, y: 244, w: 118, h: 94 },
  { x: 196, y: 30, w: 268, h: 68 },
]
const FLY_REACH = 40
/** The pot on the stove, and afloat. */
const POT = { x: 330, y: 410 }, AFLOAT = { x: 856, y: 664 }
/** Where the fly lands on the rim of the floating pot: above its far handle. */
export const RIM_AFLOAT = { x: 938, y: 598 }
/** The shoulder the swatter arm hangs from. */
const SHOULDER = { x: 580, y: 418 }
/** Where the swatter is held up with the fly on it. */
const TROPHY = { x: 498, y: 238 }

// --- The print ---------------------------------------------------------------

function print(p: Pen): void {
  wallAndFloor(p, GLASS.x, STAIRS_X, GLASS.y, FLOOR_Y, GLASS.y + GLASS.h, '#fdeaa8', '#e9a66b', '#d98b4a')
  spots(p, '#fbe091', GLASS.x, GLASS.y + 20, STAIRS_X, FLOOR_Y - 30, 46, 15, 5)
  wavyBoards(p, '#d98b4a', GLASS.x, STAIRS_X, FLOOR_Y + 6, GLASS.y + GLASS.h, 46, 3)
  // The hood over the stove, and its pipe.
  fill(p, '#9fb7c9', () => { box(p, 300, GLASS.y, 60, 30); p.blob([196, 96, 232, 52, 428, 52, 464, 96]) })
  fill(p, '#7f9bb0', () => p.line([204, 92, 330, 96, 456, 92], 7))
  // The window, with a pot of basil on its sill and the hill outside.
  fill(p, '#fffaf0', () => rr(p, 762, 66, 206, 180, 18))
  fill(p, '#bfe4f7', () => rr(p, 776, 80, 178, 152, 12))
  fill(p, '#93d27c', () => p.blob([776, 232, 776, 190, 840, 168, 900, 196, 954, 180, 954, 232]))
  fill(p, '#ffe27a', () => p.ell(916, 118, 22, 22))
  fill(p, '#e8705f', () => { p.blob([752, 60, 800, 60, 792, 150, 770, 200, 752, 206]); p.blob([978, 60, 930, 60, 938, 150, 960, 200, 978, 206]) })
  fill(p, '#fffaf0', () => rr(p, 752, 240, 226, 18, 9))
  fill(p, '#c9803a', () => p.blob([840, 240, 846, 208, 886, 208, 892, 240]))
  fill(p, '#5fae4e', () => { p.ell(852, 196, 16, 12, -0.5); p.ell(876, 190, 16, 12, 0.4); p.ell(864, 176, 12, 14) })
  // A rack with a pan and a string of onions.
  fill(p, '#b98f52', () => p.line([52, 96, 110, 100, 168, 96], 8))
  fill(p, '#5b616b', () => { p.ell(84, 168, 34, 34); p.line([84, 104, 84, 136], 9) })
  fill(p, '#7b828d', () => p.ell(78, 162, 22, 22))
  fill(p, '#e9a25c', () => { for (const [x, y] of [[148, 124], [140, 154], [152, 184], [142, 214]]) p.ell(x, y, 15, 17) })
  fill(p, '#c97a34', () => p.line([146, 100, 148, 124, 140, 154, 152, 184, 142, 214], 4))
  // A picture of a carrot, and a shelf of jars of three shapes.
  frame(p, 520, 150, 110, 96, '#7ecb6a')
  fill(p, '#f7923a', () => p.blob([552, 222, 590, 176, 604, 190]))
  fill(p, '#5fae4e', () => { p.ell(604, 174, 8, 14, 0.5); p.ell(612, 184, 8, 14, 1.1) })
  fill(p, '#c9803a', () => { rr(p, 44, 300, 118, 14, 8); p.poly([60, 312, 80, 312, 60, 338]) })
  fill(p, '#f58fb0', () => rr(p, 54, 250, 34, 50, 12))
  fill(p, '#8fa9ea', () => p.ell(116, 276, 22, 24))
  fill(p, '#fffaf0', () => { rr(p, 58, 244, 26, 10, 5); p.ell(116, 252, 12, 6) })
  // The stove: white enamel, an oven with a loaf in it, three knobs of three sizes, and the flame under the pot.
  fill(p, '#c9c2b0', () => { rr(p, 186, 700, 30, 26, 8); rr(p, 480, 700, 30, 26, 8) })
  fill(p, '#fffaf0', () => rr(p, 170, 468, 356, 240, 22))
  fill(p, '#e6dcc4', () => rr(p, 170, 468, 356, 34, 16))
  // The burner: a flat dark plate with a lighter ring on it and a foot at each end, so that it is a burner and not a bare bar once the pot has floated off.
  fill(p, '#3b3f46', () => { p.ell(POT.x, 482, 86, 10); rr(p, 252, 484, 14, 10, 3); rr(p, 396, 484, 14, 10, 3) })
  fill(p, '#6b717b', () => p.ell(POT.x - 4, 480, 54, 4))
  fill(p, '#f7923a', () => { for (const dx of [-44, -14, 16, 44]) p.ell(POT.x + dx, 470, 9, 12) })
  fill(p, '#e8705f', () => { p.ell(214, 532, 15, 15); p.ell(262, 530, 11, 11); p.ell(484, 532, 18, 18) })
  fill(p, '#33415a', () => rr(p, 222, 566, 252, 118, 18))
  fill(p, '#f7c66a', () => p.ell(348, 640, 96, 30))
  fill(p, '#e9a25c', () => p.blob([276, 650, 290, 606, 348, 592, 406, 606, 420, 650]))
  fill(p, '#c97a34', () => { p.line([312, 612, 322, 632], 5); p.line([346, 604, 350, 626], 5); p.line([382, 612, 374, 632], 5) })
  fill(p, '#c9c2b0', () => p.line([238, 578, 348, 574, 458, 578], 7))
  // His stool.
  fill(p, '#b5855a', () => { p.line([606, 660, 588, 722], 14); p.line([694, 660, 712, 722], 14); p.line([600, 694, 650, 700, 700, 694], 8) })
  fill(p, '#c9803a', () => p.ell(650, 650, 76, 16))
  // A cupboard with a bowl of fruit on it, and a mat.
  fill(p, '#6fcdbb', () => rr(p, 800, 330, 180, 280, 18))
  fill(p, '#4fb3a0', () => { p.line([890, 346, 892, 470, 890, 596], 5); p.ell(872, 470, 7, 9); p.ell(910, 480, 7, 9) })
  fill(p, '#fffaf0', () => p.blob([832, 330, 846, 300, 934, 300, 948, 330]))
  fill(p, '#e8705f', () => { p.ell(866, 296, 17, 16); p.ell(912, 294, 17, 16) })
  fill(p, '#ffd75e', () => p.ell(888, 284, 18, 14, -0.3))
}

// --- The segments ------------------------------------------------------------

/** The ladle, from the hand that holds it to its bowl. */
function ladle(p: Pen, from: readonly [number, number], to: readonly [number, number], tipped = false): void {
  p.line([from[0], from[1], to[0], to[1]], 9)
  p.ell(to[0], to[1], 27, 19, tipped ? 2.6 : 0.3)
}

const STUB = [-84, -262, -92, -236]

const K = bakerSet(
  'k',
  650,
  640,
  0.86,
  {
    stand: { armL: STUB, armR: [84, -262, 150, -292, 152, -372], legs: 'stand', breathes: true, held: (p) => ladle(p, [152, -380], [166, -462]) },
    salute: { armL: STUB, armR: [84, -262, 176, -304, 108, -366], legs: 'stand', held: (p) => ladle(p, [112, -372], [190, -452]) },
    tip: { armL: STUB, armR: [84, -262, 170, -332, 118, -438], legs: 'stand', held: (p) => { ladle(p, [118, -444], [40, -506], true); p.ell(18, -474, 6, 10); p.ell(52, -470, 5, 9) } },
    stir: { armL: STUB, armR: [84, -262, 172, -204, 190, -118], legs: 'stool', breathes: true, held: (p) => ladle(p, [192, -112], [228, -52]) },
    stirB: { armL: STUB, armR: [84, -262, 180, -210, 206, -124], legs: 'stool', held: (p) => ladle(p, [208, -118], [244, -58]) },
    feel: { armL: STUB, armR: [84, -262, 180, -292, 244, -268], legs: 'stand', breathes: true, held: (p) => ladle(p, [250, -268], [300, -300]) },
    giggle: { armL: STUB, armR: [84, -262, 150, -292, 152, -372], legs: 'bent', shake: true, held: (p) => ladle(p, [152, -356], [166, -438]) },
  },
  {
    calm: { eyes: 'calm', whiskers: 'down' },
    blink: { eyes: 'shut', whiskers: 'down' },
    proud: { eyes: 'glad', whiskers: 'up', mouth: 'grin' },
    bopped: { eyes: 'cross', whiskers: 'wild', mouth: 'o' },
    cross: { eyes: 'squint', whiskers: 'level' },
  },
)

/** The paddle of the swatter about its own middle, with three holes in it, turned to lie along its stick. */
function paddle(p: Pen, x: number, y: number, turn: number): void {
  p.ell(x, y, 34, 27, turn)
  p.cut(() => p.at(x, y, () => { p.ell(-14, -4, 6, 5); p.ell(4, 8, 6, 5); p.ell(14, -8, 5, 4) }, { turn }))
}

/** The swatter arm from the shoulder to a place: the arm to its hand, then the stick, then the paddle there. */
function swat(p: Pen, to: Point, bend: number, marks: boolean): void {
  const dx = to.x - SHOULDER.x, dy = to.y - SHOULDER.y, long = Math.hypot(dx, dy)
  const ux = dx / long, uy = dy / long, reach = Math.min(long - 74, 150)
  const elbow = { x: SHOULDER.x + ux * reach * 0.5 - uy * bend, y: SHOULDER.y + uy * reach * 0.5 + ux * bend }
  const hand = { x: SHOULDER.x + ux * reach, y: SHOULDER.y + uy * reach }
  p.line([SHOULDER.x, SHOULDER.y, elbow.x, elbow.y, hand.x, hand.y], 30)
  p.ell(hand.x, hand.y, 20, 19)
  p.line([hand.x, hand.y, to.x - ux * 30, to.y - uy * 30], 7)
  paddle(p, to.x, to.y, Math.atan2(uy, ux))
  if (marks) for (const turn of [-70, 0, 70]) p.at(to.x, to.y, () => p.ell(52, 0, 9, 4), { turn: Math.atan2(uy, ux) + turn * D })
}

/** The legs of a flat fly, sticking out all round the paddle that came down on it. */
function splat(p: Pen, at: Point): void {
  for (let i = 0; i < 6; i++) p.at(at.x, at.y, () => p.line([38, 0, 52, 3], 3.5), { turn: (i * 60 + 100) * D })
  p.ell(at.x - 46, at.y - 34, 8, 4, 0.6)
  p.ell(at.x + 44, at.y - 38, 8, 4, -0.7)
}

function pot(p: Pen, at: Point, lid: 'on' | 'tilt' | 'up' | 'none'): void {
  const { x, y } = at
  p.blob([x - 84, y - 32, x + 84, y - 32, x + 74, y + 52, x - 74, y + 52])
  p.line([x - 90, y - 32, x + 90, y - 32], 12)
  p.ell(x - 94, y - 18, 14, 10)
  p.ell(x + 94, y - 18, 14, 10)
  p.cut(() => p.line([x - 48, y + 6, x, y + 22, x + 48, y + 6], 6))
  if (lid === 'none') return
  const lift = lid === 'up' ? -42 : 0
  p.about(x + 60, y - 44, () => { p.ell(x, y - 44 + lift, 76, 13); p.ell(x, y - 62 + lift, 12, 10) }, { turn: (lid === 'tilt' ? -7 : lid === 'up' ? -16 : 0) * D })
}

/** The flood: one pool with a lapping edge, never a pair of level wavy lines (which would read as a sign). */
function waves(p: Pen, shift: number): void {
  const pool = (x0: number, x1: number, top: number): void => {
    const points: number[] = [x0 - 14, 742]
    for (let x = x0, i = 0; x <= x1; x += 30, i++) points.push(x, top + (i % 2 === 0 ? 7 : -7) + (i % 3) * 3)
    points.push(x1 + 14, 742)
    p.blob(points)
  }
  pool(276 + shift, 786 + shift, 708)
  pool(930 + shift * 0.4, 984, 724)
  p.cut(() => {
    p.line([340 + shift, 728, 372 + shift, 724, 400 + shift, 729], 4)
    p.line([600 - shift, 732, 640 - shift, 727], 4)
  })
}

const DOG = dogKit('kd', 150, 712, 0.5)

const segments: Record<string, Picture> = {
  ...K.segments,
  ...DOG.segments,
  potOn: (p) => pot(p, POT, 'on'),
  potRattle: (p) => { pot(p, POT, 'tilt'); p.ell(POT.x - 100, POT.y - 62, 8, 4, -0.6); p.ell(POT.x - 76, POT.y - 88, 8, 4, -1) },
  potLid: (p) => { pot(p, POT, 'up'); p.ell(POT.x - 26, POT.y - 124, 13, 11); p.ell(POT.x + 8, POT.y - 158, 17, 14); p.ell(POT.x - 18, POT.y - 198, 21, 17) },
  potFloat: (p) => p.about(AFLOAT.x, AFLOAT.y, () => pot(p, AFLOAT, 'none'), { turn: -5 * D, scale: 0.78 }),
  potFloatB: (p) => p.about(AFLOAT.x, AFLOAT.y, () => pot(p, AFLOAT, 'none'), { turn: 6 * D, scale: 0.78 }),
  flood: (p) => waves(p, 0),
  floodB: (p) => waves(p, 16),
  flyRim: (p) => { flyRub(p, 456, 338); p.ell(436, 356, 4, 6) },
  flyRimB: (p) => { flyRub(p, 456, 338, true); p.ell(440, 358, 4, 6) },
  /** The same on the rim of the pot where it floats on the flood. */
  flyRimFloat: (p) => { flyRub(p, RIM_AFLOAT.x, RIM_AFLOAT.y); p.ell(RIM_AFLOAT.x - 16, RIM_AFLOAT.y + 18, 4, 6) },
  flyRimFloatB: (p) => { flyRub(p, RIM_AFLOAT.x, RIM_AFLOAT.y, true); p.ell(RIM_AFLOAT.x - 12, RIM_AFLOAT.y + 20, 4, 6) },
  kArmRest: (p) => {
    p.line([SHOULDER.x, SHOULDER.y, 548, 482, 552, 540], 30)
    p.ell(552, 548, 20, 19)
    p.line([552, 548, 528, 596], 7)
    paddle(p, 514, 622, 2)
  },
  /** The swatter hand at the tip of his moustache, straightening it, with the swatter hanging from it. */
  kArmTidy: (p) => {
    p.line([SHOULDER.x, SHOULDER.y, 540, 404, 566, 374], 30)
    p.ell(566, 370, 20, 19)
    p.line([560, 384, 548, 432], 7)
    paddle(p, 542, 458, 1.8)
  },
  kArmShow: (p) => { swat(p, TROPHY, 26, false); splat(p, TROPHY) },
  kArmShowB: (p) => { swat(p, { x: TROPHY.x - 34, y: TROPHY.y + 22 }, 26, false); splat(p, { x: TROPHY.x - 34, y: TROPHY.y + 22 }) },
  /** The swatter on his own nose. */
  kArmBop: (p) => {
    p.line([SHOULDER.x, SHOULDER.y, 548, 372, 590, 340], 30)
    p.ell(594, 338, 20, 19)
    for (const [x, y, turn] of [[560, 300, -0.9], [596, 286, -0.2], [540, 336, -1.4]]) p.ell(x, y, 10, 4, turn)
  },
  /** The soup the ladle tipped over him: it runs off his head and drips from his moustache. */
  kSoup: (p) => {
    p.ell(584, 330, 7, 24)
    p.ell(716, 328, 7, 26)
    p.ell(562, 398, 6, 10)
    p.ell(740, 402, 6, 10)
    p.ell(650, 428, 5, 9)
  },
}
FLY_SPOTS.forEach((spot, i) => {
  segments[`kFly${i}Up`] = (p) => fly(p, spot.x, spot.y, 'up')
  segments[`kFly${i}Flat`] = (p) => fly(p, spot.x, spot.y, 'flat')
  segments[`kFly${i}Rub`] = (p) => flyRub(p, spot.x, spot.y)
  segments[`kFly${i}RubB`] = (p) => flyRub(p, spot.x, spot.y, true)
  segments[`kSwat${i}`] = (p) => swat(p, spot, -22, true)
  segments[`kSplat${i}`] = (p) => splat(p, spot)
})

// --- The rules ---------------------------------------------------------------

/** How near the swatter's arm, on its way to spot `to`, passes spot `i`. */
function fromArm(i: number, to: number): number {
  const a = SHOULDER, c = FLY_SPOTS[to], s = FLY_SPOTS[i]
  const dx = c.x - a.x, dy = c.y - a.y
  const t = Math.max(0, Math.min(1, ((s.x - a.x) * dx + (s.y - a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(s.x - a.x - t * dx, s.y - a.y - t * dy)
}

/** The spot the fly hops to from `from` as the swatter comes down on `where`: the next one round that the arm does not pass over. */
export function hopFrom(from: number, where: number): number {
  for (let n = 1; n < FLY_SPOTS.length; n++) {
    const to = (from + n) % FLY_SPOTS.length
    if (to !== where && fromArm(to, where) > 90) return to
  }
  return (where + 1) % FLY_SPOTS.length
}

const flooded = (h: House): boolean => h.soup === 3

/** The baker as he stands: his body by what has happened in the house, a face, and the arm with the swatter. */
function baker(h: House, live: Live, o: { body?: string; face?: string; arm?: readonly string[]; hat?: 'other' } = {}): string[] {
  const body = o.body ?? (flooded(h) ? 'stir' : pieOnFace(h) ? 'feel' : 'stand')
  const arm = o.arm ?? (h.fly === 1 ? ['kArmShow'] : ['kArmRest'])
  return [...K.cast(body, o.face ?? 'calm', h, o.hat), ...arm, ...(live.souped ? ['kSoup'] : [])]
}

function rest(h: House, live: Live): Cast {
  return {
    flood: flooded(h) ? ['flood'] : [],
    pot: [flooded(h) ? 'potFloat' : 'potOn'],
    baker: baker(h, live),
    fly: h.fly === 0 ? [`kFly${live.fly}Flat`] : [],
    dog: DOG.rest(h),
  }
}

const potArea = (h: House): Oval => (flooded(h) ? { x: AFLOAT.x, y: AFLOAT.y, rx: 84, ry: 62 } : { x: POT.x, y: POT.y, rx: 104, ry: 84 })

function targets(h: House, live: Live): Target[] {
  const out: Target[] = []
  if (h.fly === 0) out.push({ id: 'fly', shape: { ...FLY_SPOTS[live.fly], rx: FLY_REACH, ry: FLY_REACH } })
  else out.push({ id: 'swatter', shape: { ...TROPHY, rx: 48, ry: 44 } })
  out.push({ id: 'nose', shape: K.head }, { id: 'belly', shape: K.belly }, { id: 'pot', shape: potArea(h) })
  if (DOG.rest(h).length > 0) out.push({ id: 'dog', shape: DOG.area })
  out.push({ id: 'air', shape: { x: 330, y: 228, rx: 216, ry: 138 } })
  return out
}

/** What he has on his head is seen as he turns: the rubber flaps, and a pie on his face hums. */
function carried(h: House, live: Live): Beat[] {
  if (bakerWears(h) !== 'cap') return [b(baker(h, live, { hat: 'other' }), 0.13, 'rubberFlap'), b(baker(h, live), 0.1), b(baker(h, live, { hat: 'other' }), 0.13, 'rubberFlapB'), b(baker(h, live), 0.3)]
  if (pieOnFace(h)) return [b(baker(h, live), 0.4, 'pieHum')]
  return []
}

function touch(id: string, h: House, live: Live, _rng: unknown, at: Point): Answer | null {
  switch (id) {
    case 'fly': {
      // Flat on the swatter, and the baker salutes with the ladle.
      const out = tapFly(h), spot = live.fly
      return {
        house: out.house,
        save: 'now',
        scene: true,
        plan: [
          { who: 'fly', beats: [b([], Infinity)] },
          { who: 'baker', beats: [b(baker(h, live, { arm: [`kSwat${spot}`, `kSplat${spot}`], face: 'cross' }), 0.5, 'swatSplat'), b(baker(out.house, live, { body: flooded(h) ? 'stir' : 'salute', face: 'proud' }), 0.9, 'ladleSalute'), b(baker(out.house, live), 0.3)] },
          ...DOG.startle(h, 0.3),
        ],
      }
    }
    case 'air': {
      if (h.fly === 1) return { plan: [{ who: 'baker', beats: [b(baker(h, live, { arm: ['kArmShowB'], face: 'cross' }), 0.4, 'swatSlap'), b(baker(h, live), 0.2)] }] }
      // The swatter comes down beside the fly, at the spot nearest the finger that the fly is not hopping to, and the fly is at its next spot rubbing its hands.
      let where = live.fly, near = Infinity
      FLY_SPOTS.forEach((spot, i) => {
        const far = Math.hypot(spot.x - at.x, spot.y - at.y)
        if (far < near) { near = far; where = i }
      })
      const next = hopFrom(live.fly, where)
      live.fly = next
      live.lift = 0
      return {
        plan: [
          { who: 'baker', beats: [b(baker(h, live, { arm: [`kSwat${where}`], face: 'cross' }), 0.36, 'swatSlap'), b(baker(h, live), 0.2)] },
          { who: 'fly', beats: [b(`kFly${next}Up`, 0.14, 'flyBuzzUp'), b(`kFly${next}Rub`, 0.2), b(`kFly${next}RubB`, 0.2), b(`kFly${next}Rub`, 0.2), b(`kFly${next}Flat`, 1.4)] },
        ],
      }
    }
    case 'swatter':
      return { plan: [{ who: 'baker', beats: [b(baker(h, live, { arm: ['kArmShowB'], face: 'proud' }), 0.3, 'flyBzzt'), b(baker(h, live), 0.2)] }] }
    case 'nose': {
      // The swatter bops his nose, his hat jumps, and the ladle tips soup over his head, where it stays.
      const bop = b(baker(h, live, { body: 'tip', face: 'bopped', arm: ['kArmBop'], hat: 'other' }), 0.5, 'noseHonk')
      live.souped = 1
      return { plan: [{ who: 'baker', beats: [bop, b(baker(h, live, { face: 'bopped' }), 0.7, 'soupPlop'), b(baker(h, live), 0.3)] }] }
    }
    case 'belly':
      return { plan: [{ who: 'baker', beats: [b(baker(h, live, { body: flooded(h) ? 'stirB' : 'giggle', face: 'proud' }), 0.5, 'bakerHum'), b(baker(h, live), 0.3)] }] }
    case 'pot':
      if (flooded(h)) return { plan: [{ who: 'pot', beats: [b('potFloatB', 0.3, 'potBob'), b('potFloat', 0.3)] }, { who: 'flood', beats: [b('floodB', 0.3), b('flood', 0.3)] }] }
      return { plan: [{ who: 'pot', beats: [b('potLid', 0.5, 'potLid'), b('potOn', 0.3, 'potClink')] }] }
    case 'dog':
      return { plan: [DOG.tap(h)] }
    default:
      return null
  }
}

export const kitchen: RoomDef = {
  id: 'kitchen',
  print,
  segments,
  ghosts: ['potOn', 'kBody_stand', 'kHead_calm_stand', 'kHat_cap_stand', 'kArmRest', 'kSwat1', 'kSwat3', 'kFly0Flat', 'kFly1Flat', 'kFly2Flat', 'kFly3Flat', 'kFly4Flat', 'potFloat', 'flood', ...DOG.ghosts],
  enter: () => ({ fly: 0, lift: 0, souped: 0 }),
  rest,
  idle(who, h, live, rng) {
    if (who === 'baker') return flooded(h) ? [b(baker(h, live), 0.7), b(baker(h, live, { body: 'stirB' }), 0.7), b(baker(h, live, { body: 'stirIn' }), 0.9), b(baker(h, live, { body: 'stirB' }), 0.7)] : bakerIdle(rng.next(), rng.next(), baker(h, live), baker(h, live, { body: pieOnFace(h) ? 'feelIn' : 'standIn' }), baker(h, live, { face: 'blink' }), h.fly === 0 && !pieOnFace(h) ? [b(baker(h, live, { arm: ['kArmTidy'], face: 'proud' }), 0.5), b(baker(h, live), 0.2)] : null)
    if (who === 'fly' && h.fly === 0) {
      // It is touched where it is drawn: it sits and lifts its wings on the spot it is on, and its spot moves
      // only in the frame that draws it on the next one.
      if (!live.lift) {
        live.lift = 1
        return [b(`kFly${live.fly}Flat`, 2.6 + rng.next() * 3), b(`kFly${live.fly}Up`, 0.1, 'flyHop')]
      }
      live.lift = 0
      live.fly = (live.fly + 1) % FLY_SPOTS.length
      return [b(`kFly${live.fly}Up`, 0.12)]
    }
    if (who === 'pot') return flooded(h) ? [b('potFloat', 0.9), b('potFloatB', 0.9)] : [b('potOn', 2.8 + rng.next() * 2.4), b('potRattle', 0.16), b('potOn', 0.12), b('potRattle', 0.16)]
    if (who === 'flood' && flooded(h)) return [b('flood', 0.6), b('floodB', 0.6)]
    if (who === 'dog') return DOG.idle(h, rng, h.fly === 0)
    return null
  },
  targets,
  touch,
  leave(h, live) {
    // Not swatted, the fly lands on the rim of the pot and washes its feet in the soup.
    if (h.fly === 1) return []
    // On the flood the pot has floated off, and the rim it lands on is the floating pot's.
    if (flooded(h)) return [{ who: 'fly', beats: [b('flyRimFloat', 0.25, 'flyLazy'), b('flyRimFloatB', 0.2), b('flyRimFloat', 0.2)] }]
    return [{ who: 'fly', beats: [b('flyRim', 0.25, 'flyLazy'), b('flyRimB', 0.2), b('flyRim', 0.2)] }, { who: 'baker', beats: [b(baker(h, live), 0.1)] }]
  },
  arrive(h, live) {
    const plan: Part[] = [...DOG.arrive(h)]
    const beats = carried(h, live)
    if (beats.length > 0) plan.push({ who: 'baker', after: 0.3, beats })
    if (flooded(h)) plan.push({ who: 'flood', after: 0.2, beats: [b('floodB', 0.4, 'floodSlosh'), b('flood', 0.4)] })
    return plan
  },
  squint: (h, live) => [{ who: 'baker', after: 0.1, beats: [b(baker(h, live, { face: 'cross' }), 0.8, 'bakerHide')] }, ...DOG.squint(h)],
  hint(h, live) {
    if (h.fly === 1) return null
    const spot = FLY_SPOTS[live.fly]
    return { at: spot, glow: { ...spot, rx: 60, ry: 56 } }
  },
}
