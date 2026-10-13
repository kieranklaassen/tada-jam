import { bakerSet } from './artBaker'
import { BAKER, HEN, OWL, OWL_X, fly, flyTrail } from './artCast'
import { DOG, DOG_X } from './artDog'
import type { Beat } from './figure'
import { tapDog, type House } from './house'
import { FLOOR_Y, GLASS, STAIRS_X, type Oval } from './layout'
import type { Pen, Picture } from './pen'
import { fill, rr, scatter } from './print'
import { another, b, type Answer, type Cast, type Live, type Plan, type RoomDef, type Target } from './room'

// The bedroom. At night the baker, the hen and the dog sleep in it, the owl
// watches from the window and the fly is about. By day only the dog is left,
// as awake as the child has made him. Its thing is the dog on his cushion.

const D = Math.PI / 180

/** The dog's cushion. */
const CUSHION = { x: 660, y: 654, rx: 250, ry: 82 } as const

/** Where each one answers a touch. The dog has two: lying down, and upright. */
const AREAS = {
  dogLying: { x: 665, y: 622, rx: 190, ry: 80 },
  dogUpright: { x: 650, y: 520, rx: 160, ry: 200 },
  cushion: { x: CUSHION.x, y: CUSHION.y, rx: CUSHION.rx + 8, ry: CUSHION.ry + 6 },
  baker: { x: 255, y: 496, rx: 215, ry: 104 },
  hen: { x: 900, y: 372, rx: 80, ry: 80 },
  chest: { x: 911, y: 556, rx: 76, ry: 96 },
  owl: { x: 190, y: 232, rx: 100, ry: 116 },
} as const satisfies Record<string, Oval>

/** The spots the fly sits on, each on plain wall: none is on a picture, where it would be lost, and none is where the dog leaps. */
export const FLY_SPOTS = [{ x: 404, y: 152 }, { x: 470, y: 222 }, { x: 826, y: 150 }, { x: 934, y: 232 }, { x: 482, y: 148 }] as const
/** What is printed on the wall as a picture or a thing: the fly never sits on one of these, where it would be lost. */
export const PICTURES: readonly { x: number; y: number; w: number; h: number }[] = [
  { x: 566, y: 196, w: 170, h: 116 },
  { x: 880, y: 104, w: 96, h: 88 },
  { x: 26, y: 42, w: 330, h: 316 },
  { x: 352, y: 262, w: 196, h: 130 },
  { x: 330, y: 36, w: 660, h: 74 },
]
/** A hop from this spot is short enough to leave a trail of dots. */
const trails = (from: number): boolean => from === 0 || from === 4
const FLY_REACH = 38

// --- The print ---------------------------------------------------------------

const WALL = '#cdbbea', WALL_STRIPE = '#c2ade4', SKIRT = '#8f78c8', FLOOR = '#ecca90', FLOOR_LINE = '#ddb672'

function wall(p: Pen): void {
  fill(p, WALL, () => p.poly([GLASS.x, GLASS.y, STAIRS_X, GLASS.y, STAIRS_X, FLOOR_Y, GLASS.x, FLOOR_Y]))
  // Stripes that wave, so that none is a bar.
  fill(p, WALL_STRIPE, () => {
    for (let x = GLASS.x + 30; x < STAIRS_X; x += 62) p.line([x, GLASS.y, x + 9, 150, x - 9, 290, x + 9, 430, x, FLOOR_Y], 16)
  })
  fill(p, FLOOR, () => p.poly([GLASS.x, FLOOR_Y, STAIRS_X, FLOOR_Y, STAIRS_X, GLASS.y + GLASS.h, GLASS.x, GLASS.y + GLASS.h]))
  fill(p, FLOOR_LINE, () => { for (const y of [606, 652, 702]) p.line([GLASS.x, y, 360, y + 3, 700, y - 2, STAIRS_X, y + 2], 3) })
  fill(p, SKIRT, () => p.poly([GLASS.x, FLOOR_Y - 12, STAIRS_X, FLOOR_Y - 12, STAIRS_X, FLOOR_Y + 4, GLASS.x, FLOOR_Y + 4]))
}

/** A string of flags along the top of the wall: no two the same size, and none the same way apart. */
function bunting(p: Pen): void {
  const colors = ['#f58fb0', '#ffd75e', '#6fcdbb', '#f7a15a', '#8fa9ea']
  const next = scatter(11)
  fill(p, '#8f78c8', () => p.line([330, 44, 500, 66, 660, 52, 820, 68, 984, 46], 3))
  let x = 356
  for (let i = 0; x < 966; i++) {
    const w = 10 + next() * 12, long = 18 + next() * 24, y = 52 + Math.sin(x / 52) * 8 + 4
    fill(p, colors[(i * 3 + (next() < 0.5 ? 1 : 0)) % colors.length], () => p.blob([x - w, y - 2, x + w, y - 2, x + 3, y + long, x - 3, y + long]))
    x += 34 + next() * 36
  }
}

/** The arched window and its curtains. At night the moon is in it, with the owl in front; by day the sun, a cloud and a hill. */
function window(p: Pen, day: boolean): void {
  const x0 = 72, x1 = 308, top = 62, sill = 336
  const arch = [x0, sill, x0, 150, x0 + 26, 86, 190, top, x1 - 26, 86, x1, 150, x1, sill]
  fill(p, '#fffaf0', () => p.blob([x0 - 16, sill + 4, x0 - 16, 140, x0 + 16, 66, 190, top - 20, x1 - 16, 66, x1 + 16, 140, x1 + 16, sill + 4]))
  if (day) {
    fill(p, '#bfe4f7', () => p.blob(arch))
    fill(p, '#ffe27a', () => p.ell(236, 140, 44, 44))
    fill(p, '#ffffff', () => { p.ell(130, 150, 40, 20); p.ell(160, 136, 30, 20); p.ell(108, 160, 24, 14) })
    fill(p, '#93d27c', () => p.blob([x0, sill, x0, 280, 130, 240, 220, 270, x1, 250, x1, sill]))
    fill(p, '#7fc46e', () => p.blob([x0 + 60, sill, 190, 286, x1, 296, x1, sill]))
  } else {
    fill(p, '#93abe9', () => p.blob(arch))
    fill(p, '#a9bdf0', () => p.ell(120, 290, 60, 22))
    fill(p, '#fff3ae', () => p.ell(236, 140, 56, 56))
    fill(p, '#f1dd8c', () => { p.ell(216, 124, 11, 9); p.ell(254, 150, 14, 11); p.ell(232, 172, 7, 6) })
    fill(p, '#dfe8ff', () => { for (const [x, y, r] of [[104, 120, 4], [132, 176, 3], [150, 104, 3], [98, 226, 3], [286, 226, 4], [270, 264, 3]]) p.ell(x, y, r, r) })
  }
  fill(p, '#fffaf0', () => rr(p, x0 - 26, sill, x1 - x0 + 52, 20, 10))
  fill(p, '#e6dcc4', () => p.line([x0 - 20, sill + 18, 190, sill + 20, x1 + 20, sill + 18], 3))
  // Curtains drawn back to both sides.
  for (const side of [-1, 1]) {
    const edge = side < 0 ? x0 - 30 : x1 + 30
    fill(p, '#f58fb0', () => p.blob([edge, top - 16, edge + side * -52, top - 10, edge + side * -34, 190, edge + side * -8, 280, edge + side * -18, 350, edge + side * 10, 356, edge + side * 14, 200]))
    fill(p, '#e06f96', () => { p.line([edge + side * -34, top + 6, edge + side * -18, 170, edge - side * 2, 300], 4); p.ell(edge + side * -4, 286, 15, 9) })
  }
  fill(p, '#c85f86', () => { p.line([x0 - 44, top - 14, 190, top - 17, x1 + 44, top - 14], 9); p.ell(x0 - 48, top - 14, 9, 9); p.ell(x1 + 48, top - 14, 9, 9) })
}

/** The baker's bed: a blue frame, a pillow, and a quilt in waves for the baker's belly to rise under. */
function bigBed(p: Pen): void {
  const blue = '#4f9be6', dark = '#3a7fca'
  fill(p, dark, () => { rr(p, 58, 600, 26, 122, 10); rr(p, 426, 610, 26, 112, 10) })
  fill(p, '#ffe9a0', () => p.blob([78, 596, 440, 596, 444, 690, 400, 704, 356, 690, 312, 704, 268, 690, 224, 704, 180, 690, 136, 704, 92, 690, 76, 690]))
  fill(p, blue, () => { p.blob([44, 610, 44, 430, 60, 384, 96, 384, 108, 430, 108, 610]); p.blob([418, 616, 418, 500, 430, 478, 452, 478, 462, 500, 462, 616]) })
  fill(p, dark, () => { p.ell(76, 420, 12, 12); p.ell(440, 502, 9, 9) })
  fill(p, '#ffffff', () => rr(p, 84, 552, 350, 56, 26))
  fill(p, '#fffdf5', () => p.blob([86, 566, 92, 520, 150, 510, 222, 522, 226, 566]))
  fill(p, '#ece4d0', () => p.line([104, 558, 156, 550, 214, 560], 3))
  fill(p, '#ffd75e', () => p.blob([206, 600, 206, 548, 300, 536, 420, 548, 432, 600]))
  fill(p, '#f7b83a', () => { p.line([214, 570, 270, 560, 330, 572, 424, 562], 5); p.line([214, 590, 280, 582, 350, 592, 426, 584], 5) })
  // Slippers under the bed.
  fill(p, '#f58fb0', () => { p.ell(168, 722, 30, 13); p.ell(232, 726, 30, 13) })
  fill(p, '#e06f96', () => { p.ell(182, 720, 14, 9); p.ell(246, 724, 14, 9) })
}

/** The rug, and the dog's cushion on it: pale, so that a dark dog shows on it. */
function rugAndCushion(p: Pen): void {
  fill(p, '#4fb3a0', () => p.ell(676, 668, 316, 84))
  fill(p, '#6fcdbb', () => p.ell(676, 668, 300, 72))
  fill(p, '#e2664a', () => p.ell(CUSHION.x, CUSHION.y + 8, CUSHION.rx, CUSHION.ry))
  fill(p, '#f58566', () => p.ell(CUSHION.x, CUSHION.y, CUSHION.rx, CUSHION.ry - 4))
  fill(p, '#ffc9b4', () => p.ell(CUSHION.x, CUSHION.y - 6, CUSHION.rx - 26, CUSHION.ry - 22))
  fill(p, '#ffb49a', () => p.line([CUSHION.x - 180, CUSHION.y + 30, CUSHION.x, CUSHION.y + 44, CUSHION.x + 180, CUSHION.y + 30], 4))
  // His bone, and his bowl.
  fill(p, '#fff7df', () => { p.line([404, 716, 440, 726], 12); for (const [x, y] of [[398, 710], [402, 722], [442, 720], [446, 732]]) p.ell(x, y, 8, 8) })
  fill(p, '#4f9be6', () => p.blob([914, 700, 978, 700, 986, 730, 906, 730]))
  fill(p, '#3a7fca', () => p.ell(946, 701, 32, 8))
}

/** The chest of drawers the hen sleeps on, with a folded scarf for a nest. Each drawer has a pull of its own. */
function chest(p: Pen): void {
  const x = 836, y = 440, w = 150, h = 208
  fill(p, '#c9803a', () => { rr(p, x + 8, y + h - 4, 22, 22, 8); rr(p, x + w - 30, y + h - 4, 22, 22, 8) })
  fill(p, '#f0a55a', () => rr(p, x, y, w, h, 16))
  fill(p, '#d98838', () => { p.line([x + 6, y + 70, x + 70, y + 72, x + w - 6, y + 69], 4); p.line([x + 6, y + 138, x + 80, y + 136, x + w - 6, y + 139], 4) })
  fill(p, '#fff3ae', () => { p.ell(x + 44, y + 40, 10, 10); p.line([x + 52, y + 100, x + 76, y + 110, x + 100, y + 100], 8); p.ell(x + 108, y + 172, 9, 9) })
  // A sock hangs out of the top drawer.
  fill(p, '#8fa9ea', () => p.blob([x + 96, y + 62, x + 118, y + 62, x + 122, y + 96, x + 136, y + 104, x + 130, y + 116, x + 100, y + 110]))
  fill(p, '#f7b97a', () => rr(p, x - 8, y - 8, w + 16, 20, 10))
  fill(p, '#9fd98f', () => p.blob([x + 10, y - 6, x + 30, y - 26, x + 122, y - 26, x + 142, y - 6]))
  fill(p, '#7fc46e', () => p.line([x + 24, y - 14, x + 76, y - 20, x + 130, y - 14], 4))
}

/** What hangs on the wall and stands on the shelf: a bone in a frame, a loaf in a small frame, a ball, a bear and three blocks. */
function wallThings(p: Pen): void {
  fill(p, '#8f78c8', () => rr(p, 566, 196, 170, 116, 16))
  fill(p, '#fffaf0', () => rr(p, 578, 208, 146, 92, 10))
  fill(p, '#ecd9aa', () => { p.line([616, 262, 686, 246], 14); for (const [x, y] of [[608, 256], [614, 272], [690, 238], [694, 254]]) p.ell(x, y, 10, 10) })
  fill(p, '#f7a15a', () => rr(p, 880, 104, 96, 88, 14))
  fill(p, '#fffaf0', () => rr(p, 889, 113, 78, 70, 9))
  fill(p, '#e9a25c', () => p.blob([900, 170, 910, 142, 946, 142, 956, 170]))
  fill(p, '#c97a34', () => p.line([899, 170, 928, 172, 957, 170], 6))
  fill(p, '#fff3ae', () => { p.ell(916, 150, 5, 4); p.ell(928, 146, 5, 4); p.ell(940, 151, 5, 4) })
  fill(p, '#c9803a', () => { rr(p, 352, 354, 196, 14, 8); p.poly([372, 366, 392, 366, 372, 392]); p.poly([508, 366, 528, 366, 528, 392]) })
  fill(p, '#f58fb0', () => p.ell(388, 328, 26, 26))
  fill(p, '#ffd75e', () => p.blob([364, 322, 388, 310, 412, 322, 412, 334, 388, 344, 364, 334]))
  fill(p, '#c9803a', () => { p.ell(456, 322, 26, 32); p.ell(456, 284, 20, 18); p.ell(440, 270, 8, 8); p.ell(472, 270, 8, 8) })
  fill(p, '#f3d6a8', () => { p.ell(456, 290, 9, 7); p.ell(456, 330, 14, 17) })
  fill(p, '#5b3a1e', () => { p.ell(449, 281, 2.5, 2.5); p.ell(463, 281, 2.5, 2.5) })
  fill(p, '#6fcdbb', () => rr(p, 496, 326, 28, 28, 8))
  fill(p, '#8fa9ea', () => rr(p, 520, 330, 24, 24, 8))
  fill(p, '#f7a15a', () => rr(p, 506, 304, 26, 24, 8))
}

function print(p: Pen, day: boolean): void {
  wall(p)
  bunting(p)
  window(p, day)
  wallThings(p)
  chest(p)
  bigBed(p)
  rugAndCushion(p)
}

// --- The segments ------------------------------------------------------------

/** The baker on his feet on his own bed, as he gets up in the morning and as he comes back at night, with whatever the day has put on his head. */
const UP = bakerSet(
  'up',
  336,
  566,
  0.6,
  { stretch: { armL: [-84, -262, -130, -330, -112, -404], armR: [84, -262, 130, -330, 112, -404], legs: 'toes' } },
  { yawn: { eyes: 'shut', whiskers: 'up', mouth: 'o' } },
)

const FLY: Record<string, Picture> = {}
FLY_SPOTS.forEach((spot, i) => {
  const next = FLY_SPOTS[(i + 1) % FLY_SPOTS.length]
  FLY[`fly${i}Up`] = (p) => fly(p, spot.x, spot.y, 'up')
  FLY[`fly${i}Flat`] = (p) => fly(p, spot.x, spot.y, 'flat')
  if (trails(i)) FLY[`fly${i}Trail`] = (p) => flyTrail(p, spot, next)
})

const segments: Record<string, Picture> = {
  ...DOG,
  ...BAKER,
  ...HEN,
  ...OWL,
  ...FLY,
  ...UP.segments,
  /** Six drops of ink thrown out at the cushion's sides when it springs. */
  bedMarks: (p) => {
    for (const side of [-1, 1]) for (const [dy, turn] of [[-56, 62], [-18, 84], [22, 104]]) p.ell(660 + side * 282, 640 + dy, 17, 6, side * turn * D + (side < 0 ? 180 * D : 0))
  },
  /** Three feathers out of the pillow of the empty bed. */
  bedFeathers: (p) => {
    for (const [x, y, turn] of [[124, 470, -0.5], [176, 436, 0.2], [226, 474, 0.8]]) {
      p.ell(x, y, 9, 22, turn)
      p.cut(() => p.at(x, y, () => p.line([0, -16, 0, 16], 3), { turn }))
    }
  },
  /** The top drawer of the chest shot out, with a sock in the air over it. */
  drawerOut: (p) => {
    p.poly([858, 462, 968, 462, 974, 502, 852, 502])
    p.cut(() => p.ell(880, 482, 9, 9))
  },
}

// --- The rules ---------------------------------------------------------------

/** Seconds from the third tap to the dog's landing: the coil and the leap. */
const LANDS_AFTER = 0.13 + 0.34

const BAKER_IDLE: readonly Beat[] = [b('bakerIn', 2.3), b(['bakerOut', 'puffA'], 0.4, 'bakerSnore'), b(['bakerOut', 'puffB'], 0.4), b(['bakerOut', 'puffC'], 0.5, 'bakerWhistle')]

/** The round dog's own small tricks, all he can manage on a full belly: a burp and a roll, a rock right over and back, a bark that comes out a burp. */
export const ROUND_TRICKS: readonly (readonly Beat[])[] = [
  [b('dogRoundB', 0.3, 'dogBurp'), b('dogRoundC', 0.3, 'dogRoll'), b('dogRound', 0.3, 'dogPaws')],
  [b('dogRoundC', 0.22, 'dogRoll'), b('dogRound', 0.14), b('dogRoundC', 0.22, 'dogRoll'), b('dogRound', 0.3, 'dogPaws')],
  [b('dogRound', 0.14, 'dogBarkA'), b('dogRoundB', 0.36, 'dogBurp'), b('dogRound', 0.3, 'dogPant')],
]

const TRICKS: readonly (readonly Beat[])[] = [
  [b('dogBark', 0.13, 'dogBarkA'), b('dogStandB', 0.09), b('dogBark', 0.15, 'dogBarkB')],
  [b('dogSpinA', 0.09, 'dogWhirr'), b('dogSpinB', 0.24), b('dogSpinC', 0.09, 'dogWhirrDown'), b('dogStandA', 0.2, 'dogPaws')],
  [b('dogScratchA', 0.09, 'dogTick'), b('dogScratchB', 0.09), b('dogScratchA', 0.09, 'dogTick'), b('dogScratchB', 0.09), b('dogScratchA', 0.09, 'dogTick'), b('dogScratchB', 0.12)],
  [b('dogBeg', 0.9, 'dogWhine')],
]

function dogRest(h: House, live: Live): readonly string[] {
  if (h.full) return ['dogRound']
  if (h.dog === 0) return [live.upside ? 'dogUpside' : 'dogCurlLow']
  return [h.dog === 1 ? 'dogDoze' : h.dog === 2 ? 'dogSit' : 'dogStandA']
}

/** The fly is on its next spot, wings up, with the dots of a short hop behind it: its spot moves in the frame its picture does. */
function land(live: Live): Beat[] {
  const from = live.fly, to = (from + 1) % FLY_SPOTS.length
  live.fly = to
  live.lift = 0
  return [b(trails(from) ? [`fly${from}Trail`, `fly${to}Up`] : `fly${to}Up`, 0.14)]
}

/** The fly's hop from the spot it is on to `to`: wings up where it sat, a trail of dots on a short hop, wings up where it lands. */
function hop(live: Live, cue: 'flyDodge' | 'flyHop', to = (live.fly + 1) % FLY_SPOTS.length): Beat[] {
  const from = live.fly
  // Its spot moves in the frame that draws it on the new one, and not when the hop is planned: in a scene that is
  // half a second later, and a scene that a touch cuts leaves it where it was.
  const lands = { ...b(`fly${to}Up`, 0.12), does: () => { live.fly = to; live.lift = 0 } }
  return [b(`fly${from}Up`, 0.1, cue), ...(to === (from + 1) % FLY_SPOTS.length && trails(from) ? [b(`fly${from}Trail`, 0.1)] : []), lands]
}

function rest(h: House, live: Live): Cast {
  const night = !h.day
  return {
    owl: night ? ['owlOpen'] : [],
    baker: night ? ['bakerIn'] : [],
    bigbed: [],
    bed: [],
    dog: dogRest(h, live),
    hen: night ? ['henUp'] : [],
    chest: [],
    fly: night ? [`fly${live.fly}Flat`] : [],
  }
}

function targets(h: House, live: Live): Target[] {
  const out: Target[] = []
  if (!h.day) {
    const spot = FLY_SPOTS[live.fly]
    out.push({ id: 'fly', shape: { x: spot.x, y: spot.y, rx: FLY_REACH, ry: FLY_REACH } }, { id: 'hen', shape: AREAS.hen }, { id: 'owl', shape: AREAS.owl })
  }
  out.push({ id: 'dog', shape: h.full || h.dog >= 2 ? AREAS.dogUpright : AREAS.dogLying })
  out.push({ id: h.day ? 'bigbed' : 'baker', shape: AREAS.baker }, { id: 'chest', shape: AREAS.chest }, { id: 'cushion', shape: AREAS.cushion })
  return out
}

/** The third tap: the leap, the landing, and the room's answer to it, each in its own time and manner. */
function leap(h: House, live: Live): Plan {
  const plan: { who: string; after?: number; beats: Beat[] }[] = [
    {
      who: 'dog',
      beats: [
        b('dogCoil', 0.13, 'dogCoil'),
        b('dogLeap', 0.34, 'dogYip'),
        b('dogLand', 0.22, 'dogThud'),
        b('dogShakeA', 0.09, 'dogFlapA'),
        b('dogShakeB', 0.09, 'dogFlapB'),
        b('dogShakeA', 0.09),
        b('dogShakeB', 0.09),
        b('dogStandA', 0.4, 'dogPant'),
      ],
    },
  ]
  if (!h.day) {
    plan.push(
      { who: 'fly', after: LANDS_AFTER + 0.05, beats: hop(live, 'flyDodge') },
      { who: 'baker', after: LANDS_AFTER + 0.14, beats: [b('bakerSit', 0.8, 'bakerHonk'), b('bakerIn', 0.5, 'bakerFlop')] },
      { who: 'hen', after: LANDS_AFTER + 0.27, beats: [b('henPuff', 0.5, 'henSquawk'), b('henUp', 0.4, 'henCluck')] },
      { who: 'owl', after: LANDS_AFTER + 0.42, beats: [b('owlDuck', 0.7, 'owlHoo')] },
    )
  }
  return plan
}

function touch(id: string, h: House, live: Live, rng: Parameters<RoomDef['touch']>[3]): Answer | null {
  switch (id) {
    case 'dog': {
      if (h.full) return { plan: [{ who: 'dog', beats: ROUND_TRICKS[(live.trick = another(rng, ROUND_TRICKS.length, live.trick))] }] }
      const out = tapDog(h)
      live.upside = 0
      if (out.came === 'punch') return { house: out.house, save: 'now', scene: true, plan: leap(h, live) }
      if (out.came === 'again') return { plan: [{ who: 'dog', beats: TRICKS[(live.trick = another(rng, TRICKS.length, live.trick))] }] }
      const beats = h.dog === 0 ? [b(['dogDoze', 'bubPop'], 0.14, 'dogSnort'), b('dogDoze', 1.2)] : [b('dogYawn', 0.6, 'dogYawn'), b('dogSit', 1)]
      return { house: out.house, save: 'now', plan: [{ who: 'dog', beats }] }
    }
    case 'cushion': {
      const marks = { who: 'bed', beats: [b('bedMarks', 0.2), b([], 0.01)] }
      if (h.full) return { plan: [{ who: 'dog', beats: [b('dogRoundB', 0.3, 'boingDown'), b('dogRound', 0.3)] }, marks] }
      if (h.dog === 3) return { plan: [{ who: 'dog', beats: [b('dogCoil', 0.14, 'boingUp'), b('dogStandA', 0.3, 'boingDown')] }, marks] }
      if (h.dog === 0) {
        // Still asleep, he lands on his back, and stays there. Bounced again, he lands the right way up.
        live.upside = live.upside ? 0 : 1
        return { plan: [{ who: 'dog', beats: [b('dogBounce', 0.26, 'boingUp'), b(live.upside ? 'dogUpside' : 'dogCurlLow', 0.9, 'boingDown')] }, marks] }
      }
      return { plan: [{ who: 'dog', beats: [b('dogBounce', 0.26, 'boingUp'), b(dogRest(h, live), 0.6, 'boingDown')] }, marks] }
    }
    case 'baker': {
      const answer = (live.baker = another(rng, 3, live.baker))
      const beats = answer === 0 ? [b('bakerSnort', 0.8, 'bakerSnort'), b('bakerIn', 0.6)] : answer === 1 ? [b('bakerRoll', 1.5, 'bakerGrumble'), b('bakerIn', 0.6)] : [b('bakerSit', 0.8, 'bakerHonk'), b('bakerIn', 0.5, 'bakerFlop')]
      return { plan: [{ who: 'baker', beats }] }
    }
    case 'hen': {
      const answer = (live.hen = another(rng, 2, live.hen))
      return { plan: [{ who: 'hen', beats: answer === 0 ? [b('henPuff', 0.5, 'henSquawk'), b('henUp', 0.4, 'henCluck')] : [b('henFall', 1, 'henClatter'), b('henUp', 0.4, 'henCluck')] }] }
    }
    case 'owl': {
      const answer = (live.owl = another(rng, 2, live.owl))
      return { plan: [{ who: 'owl', beats: answer === 0 ? [b('owlFlip', 0.9, 'owlFlip')] : [b('owlWings', 0.6, 'owlWings')] }] }
    }
    case 'fly': {
      // Touched, it is on its next spot in the frame the finger lands, with its trail behind it.
      const beats = land(live)
      return { plan: [{ who: 'fly', beats: [{ ...beats[0], cue: 'flyDodge' }, ...beats.slice(1)] }] }
    }
    case 'bigbed':
      return { plan: [{ who: 'bigbed', beats: [b('bedFeathers', 0.4, 'bedPuff'), b([], 0.01)] }] }
    case 'chest': {
      const plan: { who: string; after?: number; beats: Beat[] }[] = [{ who: 'chest', beats: [b('drawerOut', 0.3, 'drawerKnock'), b([], 0.01)] }]
      if (!h.day) plan.push({ who: 'hen', after: 0.08, beats: [b('henNod', 0.3, 'henCluck')] })
      return { plan }
    }
    default:
      return null
  }
}

/** The morning: the owl ducks out of the window, the baker and the hen get up, each in its own manner, and go out ahead, and the fly is off to the kitchen. */
export function morning(h: House, live: Live): Plan {
  return [
    { who: 'owl', after: 0.1, beats: [b('owlBlink', 0.3), b('owlDuck', 0.35, 'owlHoo'), b([], Infinity)] },
    { who: 'baker', after: 0.2, beats: [b('bakerSit', 0.4, 'bakerHonk'), b(UP.cast('stretch', 'yawn', h), 0.5, 'bakerYawn'), b([], Infinity)] },
    { who: 'fly', after: 0.35, beats: [b(`fly${live.fly}Up`, 0.2, 'flyDodge'), b([], Infinity)] },
    { who: 'hen', after: 0.6, beats: [b('henPuff', 0.35, 'henSquawk'), b([], Infinity)] },
  ]
}

/**
 * Lights out: the baker, the hen and the dog get into bed, each in its own manner. `before` is the house the
 * lamp found: who was awake, and what the baker had on his head.
 */
export function bedtime(before: House): Plan {
  const plan: { who: string; after?: number; beats: Beat[] }[] = []
  // By night they never got up.
  if (before.day) {
    plan.push(
      { who: 'baker', after: 0.1, beats: [b(UP.cast('stretch', 'yawn', before), 0.6, 'bakerYawn'), b('bakerHide', 0.5, 'bakerHide'), b('bakerIn', Infinity, 'bakerFlop')] },
      { who: 'hen', after: 0.55, beats: [b('henPuff', 0.3, 'henSquawk'), b('henUp', 0.4, 'henCluck'), b('henTuck', Infinity)] },
      { who: 'fly', after: 1.3, beats: [b('fly3Up', 0.12, 'flyHop'), b('fly3Flat', Infinity)] },
    )
  }
  const down = [b('dogDoze', 0.4, 'dogFlop'), b('dogDozeShut', 0.3), b('dogCurlLow', Infinity)]
  // Back to bed in five poses, whoever he was: the round dog, the dog on his feet, the dog half awake.
  if (before.full) plan.push({ who: 'dog', after: 0.9, beats: [b('dogRoundB', 0.5, 'dogBurp'), b('dogYawn', 0.5, 'dogYawn'), ...down] })
  else if (before.dog === 3) plan.push({ who: 'dog', after: 0.9, beats: [b('dogStandA', 0.3, 'dogPant'), b('dogYawn', 0.5, 'dogYawn'), ...down] })
  else if (before.dog > 0) plan.push({ who: 'dog', beats: [b('dogYawn', 0.5, 'dogYawn'), b('dogSit', 0.3), ...down] })
  return plan
}

/** The owl comes back to the window as the lamp goes dark. */
export const OWL_BACK: readonly Beat[] = [b('owlDuck', 0.4), b('owlOpen', Infinity, 'owlHoo')]

export const bedroom: RoomDef = {
  id: 'bedroom',
  print,
  segments,
  ghosts: ['dogCurlLow', 'dogYawn', 'dogLeap', 'bubM', 'bubL', 'bakerIn', 'bakerSit', 'puffB', 'puffC', 'henUp', 'henPuff', 'owlOpen', 'owlWings', 'fly0Flat', 'fly1Flat', 'fly2Flat', 'fly3Flat', 'fly4Flat', 'bedMarks'],
  // The fly starts by the lamp, which is where lights out leaves it.
  enter: () => ({ fly: 3, lift: 0, trick: -1, baker: -1, hen: -1, owl: -1, upside: 0 }),
  rest,
  idle(who, h, live, rng) {
    if (who === 'dog') {
      if (h.full) return [b('dogRound', 2.4 + rng.next() * 1.6), b('dogRoundB', 0.5)]
      if (h.dog === 0) {
        if (live.upside) return null
        return [b('dogCurlHigh', 1.3), b(['dogCurlLow', 'bubS'], 0.42, 'dogSnore'), b(['dogCurlLow', 'bubM'], 0.42), b(['dogCurlLow', 'bubL'], 0.5), b('dogCurlLow', 0.25), ...(rng.next() < 0.34 ? [b('dogNose', 0.5)] : [])]
      }
      if (h.dog === 1) return [b('dogDoze', 2.2 + rng.next() * 1.4), b('dogDozeShut', 0.16)]
      if (h.dog === 2) return [b('dogSit', 2.6 + rng.next() * 1.6), b('dogYawn', 0.7)]
      // Awake at night with the fly about, he snaps at it now and then, and misses.
      if (!h.day && rng.next() < 0.3) return [b('dogStandA', 0.5), b('dogStandB', 0.5), b('dogBark', 0.16, 'dogSnap'), b('dogStandA', 0.3)]
      return [b('dogStandA', 0.5), b('dogStandB', 0.5)]
    }
    if (h.day) return null
    if (who === 'baker') return BAKER_IDLE
    if (who === 'hen') return [b('henUp', 1.8 + rng.next() * 1.4), b('henNod', 0.5), b('henTuck', 1.2 + rng.next())]
    if (who === 'owl') return [b('owlOpen', 2 + rng.next() * 3), b('owlBlink', 0.13)]
    // It is touched where it is drawn: it sits and lifts its wings on the spot it is on, and its spot moves only
    // in the frame that draws it on the next one.
    if (who === 'fly') {
      if (!live.lift) {
        live.lift = 1
        return [b(`fly${live.fly}Flat`, 2.2 + rng.next() * 2.8), b(`fly${live.fly}Up`, 0.1, 'flyHop')]
      }
      return land(live)
    }
    return null
  },
  targets,
  touch,
  leave(h) {
    // Asleep, he rolls to face the wall and pulls the blanket over his head.
    if (h.dog === 3) return []
    return [{ who: 'dog', beats: [b('dogWall', 0.3, 'dogSnoreUp'), b('dogWall', 0.3, 'dogSnoreDown')] }]
  },
  arrive(h) {
    if (h.full) return [{ who: 'dog', after: 0.12, beats: [b('dogRoundC', 0.25, 'dogRoll'), b('dogRound', 0.4, 'dogPaws')] }]
    if (h.dog === 3) return [{ who: 'dog', after: 0.12, beats: [b('dogStandB', 0.3, 'dogPant'), b('dogStandA', 0.3)] }]
    return []
  },
  squint(h, live) {
    const plan: { who: string; after?: number; beats: Beat[] }[] = []
    if (!h.day) {
      plan.push(
        { who: 'owl', after: 0.05, beats: [b('owlBlink', 0.8)] },
        { who: 'baker', after: 0.1, beats: [b('bakerHide', 0.8, 'bakerHide')] },
        { who: 'hen', after: 0.18, beats: [b('henHide', 0.7, 'henRustle')] },
      )
    }
    plan.push({ who: 'dog', after: 0.24, beats: [b(h.full ? 'dogRoundB' : h.dog >= 2 ? 'dogShakeA' : live.upside ? 'dogUpside' : 'dogDozeShut', 0.6, 'dogFlop')] })
    return plan
  },
  hint(h) {
    if (h.dog === 3) return null
    const area = h.dog >= 2 ? AREAS.dogUpright : AREAS.dogLying
    return { at: h.dog >= 2 ? { x: 668, y: 548 } : { x: 716, y: 618 }, glow: area }
  },
  eyes: [
    { who: 'owl', when: ['owlOpen'], base: 'owlPup', x: OWL_X },
    { who: 'dog', when: ['dogStandA', 'dogStandB'], base: 'dogPup', x: DOG_X },
  ],
}
