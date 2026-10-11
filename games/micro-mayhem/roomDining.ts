import { TIDY_R, bakerIdle, bakerSet, swellRim } from './artBaker'
import { flyOver, flyRub } from './artCast'
import { dogAt, round as roundDog, sit, type Head } from './artDog'
import { hen as henShape, type HenPose } from './artHen'
import type { Beat } from './figure'
import { bakerWears, diner, dogAbout, flyInSoup, flyOnFlower, pieOnFace, tapLadle, type House } from './house'
import { FLOOR_Y, GLASS, STAIRS_X, type Oval } from './layout'
import type { Pen, Picture } from './pen'
import { box, fill, frame, rr, wavyBoards, wavyStripes } from './print'
import { b, type Answer, type Cast, type Live, type Part, type RoomDef, type Target } from './room'

// The dining room. The diner sits at the left end of the table with the bowl
// in front of it, and the baker stands at the other end with the ladle. Its
// thing is the soup: each tap on the ladle pours one into the bowl, and the
// third sends it over the rim and off the table. The diner is the dog when he
// is awake and the hen when he is not.

const D = Math.PI / 180

/** The middle of the bowl's rim. */
const BOWL = { x: 356, y: 478 }
/** The top of the vase. */
const VASE = { x: 560, y: 470 }
/** Where the dog's feet are on the chair, and how large he is drawn. */
const SEAT = { x: 190, y: 604, scale: 0.62 }
/** The hen on the chair: the middle of her body. */
const HEN = { x: 190, y: 534, scale: 1.4 }

// --- The print ---------------------------------------------------------------

function print(p: Pen): void {
  const top = GLASS.y, bottom = GLASS.y + GLASS.h
  fill(p, '#f6d7c3', () => box(p, GLASS.x, top, STAIRS_X - GLASS.x, FLOOR_Y - top))
  wavyStripes(p, '#efc2ab', GLASS.x, STAIRS_X, top, FLOOR_Y, 70, 9, 51)
  fill(p, '#c98f6b', () => box(p, GLASS.x, FLOOR_Y, STAIRS_X - GLASS.x, bottom - FLOOR_Y))
  wavyBoards(p, '#b57a58', GLASS.x, STAIRS_X, FLOOR_Y + 6, bottom, 46, 57)
  fill(p, '#a9684a', () => box(p, GLASS.x, FLOOR_Y - 10, STAIRS_X - GLASS.x, 14))
  // A window with a curtain drawn to one side, and a hanging lamp over the table.
  fill(p, '#a9684a', () => rr(p, 60, 80, 220, 230, 20))
  fill(p, '#bfe4f7', () => rr(p, 74, 94, 192, 202, 12))
  fill(p, '#ffffff', () => { p.ell(140, 170, 40, 16); p.ell(170, 156, 26, 16) })
  fill(p, '#8fce7c', () => p.blob([74, 296, 74, 250, 150, 226, 210, 262, 266, 240, 266, 296]))
  fill(p, '#e8705f', () => p.blob([52, 70, 150, 70, 132, 150, 96, 250, 60, 320, 52, 320]))
  fill(p, '#c9503f', () => { p.line([70, 90, 76, 190, 62, 300], 4); p.line([112, 84, 100, 170, 84, 240], 4) })
  fill(p, '#7b828d', () => p.line([420, top, 422, 96], 4))
  fill(p, '#ffd75e', () => p.blob([360, 160, 384, 96, 460, 96, 484, 160]))
  fill(p, '#fff3ae', () => p.ell(422, 164, 26, 12))
  // Two plates on a rail and a picture of a pear.
  fill(p, '#a9684a', () => rr(p, 600, 226, 250, 12, 6))
  fill(p, '#fffaf0', () => { p.ell(660, 180, 44, 44); p.ell(782, 186, 38, 38) })
  fill(p, '#6fcdbb', () => p.ell(660, 180, 26, 26))
  fill(p, '#f58fb0', () => p.ell(782, 186, 20, 20))
  frame(p, 880, 96, 96, 120, '#a9684a')
  fill(p, '#c8d84a', () => { p.ell(928, 172, 20, 22); p.ell(928, 146, 12, 16) })
  fill(p, '#7a5a34', () => p.line([928, 132, 934, 120], 4))
  // The chair: a tall back, a seat and four legs.
  fill(p, '#c9803a', () => { rr(p, 86, 330, 30, 290, 12); p.line([102, 620, 96, 716], 14); p.line([268, 620, 276, 716], 14) })
  fill(p, '#e2a35c', () => rr(p, 86, 600, 200, 24, 10))
  // The table: a cloth with a wavy hem over a top on two turned legs.
  fill(p, '#a9684a', () => { p.line([330, 560, 326, 716], 20); p.line([664, 560, 668, 716], 20) })
  fill(p, '#fffaf0', () => p.blob([264, 520, 740, 520, 744, 590, 700, 606, 650, 588, 596, 608, 540, 590, 484, 608, 430, 588, 372, 606, 316, 588, 268, 600]))
  fill(p, '#f58fb0', () => { for (const [x, y] of [[300, 560], [392, 574], [470, 556], [560, 576], [640, 558], [712, 572]]) p.ell(x, y, 9, 8) })
  fill(p, '#e6dcc4', () => p.line([264, 522, 500, 526, 740, 522], 6))
  // The bowl, with a spoon beside it, and the vase.
  fill(p, '#6fcdbb', () => p.blob([BOWL.x - 60, BOWL.y, BOWL.x + 60, BOWL.y, BOWL.x + 40, BOWL.y + 44, BOWL.x - 40, BOWL.y + 44]))
  fill(p, '#4fb3a0', () => { p.line([BOWL.x - 60, BOWL.y, BOWL.x + 60, BOWL.y], 8); p.line([BOWL.x - 30, BOWL.y + 22, BOWL.x, BOWL.y + 28, BOWL.x + 30, BOWL.y + 22], 4) })
  fill(p, '#c9c2b0', () => { p.line([444, 514, 486, 510], 5); p.ell(438, 514, 12, 7) })
  fill(p, '#8fb7e8', () => p.blob([VASE.x - 14, VASE.y, VASE.x + 14, VASE.y, VASE.x + 12, VASE.y + 14, VASE.x + 28, VASE.y + 36, VASE.x + 18, VASE.y + 52, VASE.x - 18, VASE.y + 52, VASE.x - 28, VASE.y + 36, VASE.x - 12, VASE.y + 14]))
  fill(p, '#bcd6f4', () => p.ell(VASE.x - 10, VASE.y + 34, 5, 10))
  // A sideboard behind the baker with a tureen on it.
  fill(p, '#c9803a', () => rr(p, 850, 470, 136, 250, 14))
  fill(p, '#a9684a', () => { p.line([918, 486, 920, 590, 918, 706], 5); p.ell(900, 590, 6, 8); p.ell(938, 596, 6, 8) })
  fill(p, '#fffaf0', () => { p.blob([872, 470, 866, 430, 884, 416, 952, 416, 970, 430, 964, 470]); p.ell(918, 410, 14, 8) })
  fill(p, '#f58fb0', () => p.line([876, 440, 918, 448, 960, 440], 5))
}

// --- The diner ---------------------------------------------------------------

type Kind = 'g' | 'r' | 'n'
type Pose = 'Rest' | 'RestB' | 'Tuck' | 'Nod' | 'Feet' | 'Spray' | 'Helmet'

const POSES: readonly Pose[] = ['Rest', 'RestB', 'Tuck', 'Nod', 'Feet', 'Spray', 'Helmet']
/** The poses that are only ever seen once soup has been served, which is when the bib is tucked in. */
const BIBBED: readonly Pose[] = ['Tuck', 'Feet', 'Spray']

const DOG_HEAD: Record<Pose, Head> = {
  Rest: { eyes: 'open', mouth: 'tongue', earL: 0, earR: 0 },
  RestB: { eyes: 'open', mouth: 'tongue', earL: 0, earR: 34 },
  Tuck: { eyes: 'glad', mouth: 'tongue', earL: 20, earR: 20 },
  Nod: { eyes: 'shut', mouth: 'shut', earL: 10, earR: 50 },
  Feet: { eyes: 'wide', mouth: 'open', earL: 60, earR: 60 },
  Spray: { eyes: 'dizzy', mouth: 'bark', earL: 40, earR: 70 },
  Helmet: { eyes: 'dizzy', mouth: 'shut', earL: -10, earR: -10 },
}

const HEN_POSE: Record<Pose, HenPose> = {
  Rest: { head: [-34, -56], eye: 'half', beak: 'shut' },
  RestB: { head: [-34, -56], eye: 'shut', beak: 'shut' },
  Tuck: { head: [-34, -60], eye: 'wide', beak: 'shut', wing: 'up' },
  Nod: { head: [-62, -30], eye: 'shut', beak: 'shut' },
  Feet: { head: [-36, -70], eye: 'wide', beak: 'open', feathers: true, legs: true, big: true },
  Spray: { head: [-44, -52], eye: 'cross', beak: 'open', feathers: true },
  Helmet: { head: [-34, -56], eye: 'cross', beak: 'shut' },
}

/** A bib with a rim of light round it, about the knot at its top. */
function bib(p: Pen, w: number, h: number): void {
  p.cut(() => p.blob([-w - 6, -6, w + 6, -6, w + 8, h * 0.6, 0, h + 8, -w - 8, h * 0.6]))
  p.blob([-w, 0, w, 0, w, h * 0.56, 0, h, -w, h * 0.56])
  p.cut(() => p.ell(0, h * 0.42, w * 0.3, w * 0.24))
}

/** The ladle upside down on a head whose top is at `x`, `y`, with soup running off below it. */
function helmet(p: Pen, x: number, y: number, drip: readonly [number, number]): void {
  p.blob([x - 46, y + 20, x - 40, y - 20, x, y - 34, x + 40, y - 20, x + 46, y + 20])
  p.line([x - 38, y - 12, x - 92, y - 58], 9)
  p.cut(() => p.line([x - 26, y + 2, x, y - 8, x + 26, y + 2], 4))
  p.ell(drip[0], drip[1], 6, 11)
  p.ell(drip[0] + 4, drip[1] + 30, 5, 8)
}

/** What the diner sprays out, over the bowl. */
function spray(p: Pen): void {
  for (const [x, y, r, turn] of [[304, 404, 9, -0.4], [330, 372, 8, -0.9], [368, 362, 10, 1.4], [406, 380, 8, 0.8], [424, 412, 7, 0.4], [350, 400, 6, 1.2]]) p.ell(x, y, r, r * 0.6, turn)
}

function dogDiner(p: Pen, pose: Pose, bibbed: boolean, full: boolean): void {
  const lean = pose === 'Nod' ? (full ? 20 : 27) : 0
  dogAt(p, SEAT.x, SEAT.y, SEAT.scale, () => {
    p.about(650, 692, () => {
      if (full) roundDog(p, { head: DOG_HEAD[pose], roll: pose === 'Feet' ? 180 : pose === 'RestB' ? 10 : 0, tilt: pose === 'Rest' ? 6 : pose === 'RestB' ? 12 : 0 })
      else sit(p, { head: DOG_HEAD[pose], tilt: pose === 'Rest' ? 8 : pose === 'RestB' ? 14 : pose === 'Nod' ? -24 : 0, paws: pose === 'Tuck' || pose === 'Feet' ? 'up' : 'down', hind: pose === 'Feet' ? [736, 662, 800, 600, 830, 540] : undefined })
      if (bibbed) p.at(650, full ? 500 : 506, () => bib(p, 40, 86))
      if (pose === 'Helmet') {
        // Soup runs down his face from under the ladle.
        p.cut(() => { p.line([622, 400, 618, 440], 5); p.line([676, 398, 682, 446], 5) })
      }
    }, { turn: lean * D })
  })
  if (pose === 'Helmet') helmet(p, SEAT.x, 402, [SEAT.x + 4, 502])
  if (pose === 'Spray') spray(p)
  if (pose === 'Feet' && !full) { p.ell(96, 500, 5, 13, -0.3); p.ell(284, 500, 5, 13, 0.3) }
}

function henDiner(p: Pen, pose: Pose, bibbed: boolean): void {
  const o = HEN_POSE[pose], dy = pose === 'Feet' ? -34 : 0
  p.at(HEN.x, HEN.y + dy, () => {
    henShape(p, o)
    if (bibbed) p.at(o.head[0] - 6, o.head[1] + 30, () => bib(p, 17, 40))
    if (pose === 'Helmet') p.cut(() => { p.line([o.head[0] - 16, o.head[1] - 20, o.head[0] - 20, o.head[1] + 4], 3) })
  }, { scale: HEN.scale, mirror: true })
  const head = { x: HEN.x - o.head[0] * HEN.scale, y: HEN.y + dy + o.head[1] * HEN.scale }
  if (pose === 'Helmet') helmet(p, head.x, head.y - 30, [head.x + 62, head.y + 30])
  if (pose === 'Spray') spray(p)
}

const kindOf = (h: House): Kind => (diner(h) === 'hen' ? 'n' : h.full ? 'r' : 'g')

/** The diner in a pose: with the bib once soup has been served. */
function sits(h: House, pose: Pose): string[] {
  return [`d${kindOf(h)}${pose}${h.soup > 0 || BIBBED.includes(pose) ? 'Bib' : ''}`]
}

// --- The baker ---------------------------------------------------------------

/** The ladle, from the hand that holds it to its bowl. */
function ladle(p: Pen, from: readonly [number, number], to: readonly [number, number], tipped = false): void {
  p.line([from[0], from[1], to[0], to[1]], 9)
  p.ell(to[0], to[1], 27, 19, tipped ? 2.4 : 0.3)
}

const DOWN = [84, -262, 132, -200, 122, -130]
const HOLD = [-84, -262, -150, -226, -150, -250]

const B = bakerSet(
  'd',
  800,
  700,
  0.9,
  {
    rest: { armL: HOLD, armR: DOWN, legs: 'stand', held: (p) => ladle(p, [-150, -258], [-170, -360]) },
    // His free hand straightens the tip of his moustache.
    tidy: { armL: HOLD, armR: TIDY_R, legs: 'stand', held: (p) => ladle(p, [-150, -258], [-170, -360]) },
    empty: { armL: HOLD, armR: DOWN, legs: 'stand' },
    pour: { armL: [-84, -262, -180, -330, -220, -400], armR: DOWN, legs: 'stand', held: (p) => ladle(p, [-226, -406], [-300, -452], true) },
    oops: { armL: [-84, -262, -160, -330, -150, -400], armR: [84, -262, 150, -320, 140, -390], legs: 'stand', held: (p) => ladle(p, [-150, -408], [-110, -486]) },
    serve: { armL: HOLD, armR: [84, -262, 150, -330, 96, -420], legs: 'bent', held: (p) => ladle(p, [-150, -234], [-170, -336]) },
    feel: { armL: HOLD, armR: [84, -262, 160, -290, 222, -270], legs: 'stand', held: (p) => ladle(p, [-150, -258], [-170, -360]) },
    giggle: { armL: HOLD, armR: DOWN, legs: 'bent', shake: true, held: (p) => ladle(p, [-150, -234], [-170, -336]) },
  },
  {
    calm: { eyes: 'calm', whiskers: 'down' },
    blink: { eyes: 'shut', whiskers: 'down' },
    glad: { eyes: 'glad', whiskers: 'up', mouth: 'grin' },
    shock: { eyes: 'wide', whiskers: 'wild', mouth: 'o' },
    strain: { eyes: 'squint', whiskers: 'level' },
  },
)

/** Where the ladle is while he holds it at rest. */
const LADLE: Oval = { x: 652, y: 420, rx: 56, ry: 86 }

function baker(h: House, live: Live, body?: string, face = 'calm', hat?: 'other'): string[] {
  return B.cast(body ?? (live.helmet ? 'empty' : pieOnFace(h) ? 'feel' : 'rest'), face, h, hat)
}

// --- The segments ------------------------------------------------------------

/** The soup standing over the rim: a dome that is higher with each ladle, and steam that curls. */
function soup(p: Pen, high: number): void {
  p.blob([BOWL.x - 46, BOWL.y - 4, BOWL.x - 30, BOWL.y - 4 - high, BOWL.x + 30, BOWL.y - 4 - high, BOWL.x + 46, BOWL.y - 4])
  // Steam as three puffs that rise and shrink: a curl of steam is a curved stroke, and two of them face to face read as a sign.
  p.ell(BOWL.x + 32, BOWL.y - 32 - high, 8, 6, -0.3)
  p.ell(BOWL.x + 40, BOWL.y - 48 - high, 6, 4.5, 0.3)
  p.ell(BOWL.x + 34, BOWL.y - 62 - high, 4, 3)
}

const segments: Record<string, Picture> = {
  ...B.segments,
  soup1: (p) => soup(p, 8),
  soup2: (p) => { soup(p, 18); p.ell(BOWL.x - 28, BOWL.y - 46, 7, 5, 0.3); p.ell(BOWL.x - 36, BOWL.y - 60, 5, 4, -0.3) },
  /** Over the rim, across the table and off its edge: a sheet down the front of the cloth, drops, and a pool on the floor. */
  soupSpill: (p) => {
    soup(p, 22)
    p.line([BOWL.x + 58, BOWL.y - 2, BOWL.x + 74, BOWL.y + 20, BOWL.x + 72, BOWL.y + 40], 10)
    p.blob([382, 522, 478, 522, 482, 560, 472, 602, 454, 618, 438, 596, 422, 614, 402, 598, 388, 610, 378, 580])
    p.ell(412, 644, 6, 11)
    p.ell(450, 668, 5, 9)
    p.ell(426, 692, 5, 9)
    p.blob([336, 724, 376, 708, 470, 712, 540, 708, 570, 722, 524, 734, 384, 734])
  },
  /** One ladle on its way from his hand to the bowl. */
  soupArc: (p) => { for (const [x, y, r] of [[500, 318, 7], [462, 322, 9], [424, 344, 10], [394, 382, 11], [372, 424, 12]]) p.ell(x, y, r * 0.8, r, 0.5) },
  /** The fly in the soup, on its back. */
  flyBowl: (p) => flyOver(p, BOWL.x - 6, BOWL.y - 34),
  /** The picked flower in the vase. */
  vaseFlower: (p) => {
    p.line([VASE.x, VASE.y - 4, VASE.x - 3, VASE.y - 24], 7)
    p.ell(VASE.x + 18, VASE.y - 14, 15, 6, -0.5)
    for (let i = 0; i < 6; i++) p.at(VASE.x - 2, VASE.y - 46, () => p.ell(19, 0, 13, 9), { turn: (i * 60 + 10) * D })
    p.ell(VASE.x - 2, VASE.y - 46, 12, 12)
    p.cut(() => p.ell(VASE.x - 2, VASE.y - 46, 5, 5))
  },
  flyFlower: (p) => flyRub(p, VASE.x, VASE.y - 92),
  flyFlowerB: (p) => flyRub(p, VASE.x, VASE.y - 92, true),
  /** A slice of the pie from his hat, on the cloth. */
  /** The baker's belly out, over his standing body. */
  dSwell: (p) => p.at(800, 700, () => swellRim(p), { scale: 0.9 }),
  pieSlice: (p) => {
    p.blob([470, 520, 478, 494, 502, 488, 526, 498, 532, 520])
    p.cut(() => p.line([484, 508, 502, 502, 520, 508], 4))
    p.line([500, 478, 506, 466, 500, 454], 4)
  },
  /** Two rings of the spoon, beside the bowl. */
  spoonRing: (p) => { p.ell(428, 470, 5, 10, -0.5); p.ell(446, 450, 5, 10, 0.4); p.ell(452, 486, 5, 9, 1) },
}
for (const pose of POSES) {
  for (const bibbed of [false, true]) {
    if (!bibbed && BIBBED.includes(pose)) continue
    const tail = bibbed ? 'Bib' : ''
    segments[`dg${pose}${tail}`] = (p) => dogDiner(p, pose, bibbed, false)
    segments[`dr${pose}${tail}`] = (p) => dogDiner(p, pose, bibbed, true)
    segments[`dn${pose}${tail}`] = (p) => henDiner(p, pose, bibbed)
  }
}

// --- The rules ---------------------------------------------------------------

const bowlful = (h: House, n: number = h.soup): string[] => [...(n === 0 ? [] : n === 3 ? ['soupSpill'] : [`soup${n}`]), ...(flyInSoup({ ...h, soup: n as House['soup'] }) ? ['flyBowl'] : [])]

/** How the diner sits when nothing is happening. */
function dinerRest(h: House, live: Live): string[] {
  return sits(h, live.helmet ? 'Helmet' : h.soup === 3 ? 'Feet' : 'Rest')
}

function rest(h: House, live: Live): Cast {
  return {
    diner: dinerRest(h, live),
    soup: bowlful(h),
    vase: h.flower ? ['vaseFlower', ...(flyOnFlower(h) ? ['flyFlower'] : [])] : [],
    baker: baker(h, live),
    extra: h.served ? ['pieSlice'] : [],
  }
}

/** Where the diner's head is, which is where the ladle sits as a helmet. */
function headOf(h: House): Oval {
  return kindOf(h) === 'n' ? { x: 238, y: 440, rx: 62, ry: 62 } : { x: SEAT.x, y: 426, rx: 70, ry: 60 }
}
const DINER: Oval = { x: 186, y: 500, rx: 122, ry: 150 }

function targets(h: House, live: Live): Target[] {
  const out: Target[] = [{ id: 'ladle', shape: live.helmet ? headOf(h) : LADLE }, { id: 'diner', shape: DINER }, { id: 'bowl', shape: { x: BOWL.x, y: BOWL.y + 4, rx: 76, ry: 60 } }]
  if (h.flower) out.push({ id: 'vase', shape: { x: VASE.x, y: VASE.y - 30, rx: 50, ry: 86 } })
  out.push({ id: 'nose', shape: B.head }, { id: 'belly', shape: B.belly })
  return out
}

/** The diner sprays the soup out, with the fly in it. */
const sprays = (h: House, live: Live, after: number): Part => ({ who: 'diner', after, beats: [b(sits(h, 'Spray'), 0.5, 'soupSpray'), b(dinerRest(h, live), 0.2)] })

function touch(id: string, h: House, live: Live): Answer | null {
  switch (id) {
    case 'ladle': {
      // The ladle is taken off the diner's head, if it was there, and used.
      live.helmet = 0
      const out = tapLadle(h)
      if (out.came === 'again') {
        return { plan: [{ who: 'baker', beats: [b(baker(h, live, 'pour', 'strain'), 0.4, 'ladleDrip'), b(baker(h, live), 0.2)] }, { who: 'diner', beats: [b(sits(h, 'Feet'), 0.4)] }] }
      }
      if (out.came === 'punch') {
        // The third ladle sends it over the rim, across the table and off the edge; the diner lifts both feet.
        return {
          house: out.house,
          save: 'now',
          scene: true,
          plan: [
            { who: 'baker', beats: [b(baker(h, live, 'pour', 'calm'), 0.45, 'soupPour'), b(baker(out.house, live, 'oops', 'shock', 'other'), 0.8), b(baker(out.house, live), 0.3)] },
            { who: 'soup', beats: [b([...bowlful(h), 'soupArc'], 0.45), b(bowlful(out.house), 0.8, 'soupPatter')] },
            { who: 'diner', after: 0.45, beats: [b(sits(out.house, 'Tuck'), 0.25), b(sits(out.house, 'Feet'), 0.8, 'dinerYelp')] },
          ],
        }
      }
      const plan: Part[] = [
        { who: 'baker', beats: [b(baker(h, live, 'pour', 'glad'), 0.4, 'soupGlug'), b(baker(out.house, live), 0.3)] },
        { who: 'soup', beats: [b([...bowlful(h), 'soupArc'], 0.3), b([...bowlful(out.house, out.house.soup), 'spoonRing'], 0.16, 'spoonTinkA'), b(bowlful(out.house), 0.16), b([...bowlful(out.house), 'spoonRing'], 0.16, 'spoonTinkB'), b(bowlful(out.house), 0.2)] },
        { who: 'diner', after: 0.3, beats: [b(sits(out.house, 'Tuck'), 0.5), b(dinerRest(out.house, live), 0.2)] },
      ]
      // With the fly in it, the soup gargles in the bowl and the diner sprays it out again: a gargle and then a spray, from the first ladle on.
      if (flyInSoup(out.house)) {
        plan[1] = { ...plan[1], beats: [...plan[1].beats.slice(0, -1), b(bowlful(out.house), 0.24, 'soupGargle')] }
        plan[2] = { who: 'diner', after: 0.3, beats: [b(sits(out.house, 'Tuck'), 0.72), b(sits(out.house, 'Spray'), 0.5, 'soupSpray'), b(dinerRest(out.house, live), 0.2)] }
      }
      return { house: out.house, save: 'now', plan }
    }
    case 'diner': {
      // The ladle goes onto its head like a helmet, and soup runs off its nose.
      if (live.helmet) return { plan: [{ who: 'diner', beats: [b(sits(h, 'RestB'), 0.12, 'ladleBong'), b(sits(h, 'Helmet'), 0.3)] }] }
      live.helmet = 1
      return {
        plan: [
          { who: 'baker', beats: [b(baker(h, { helmet: 0 }, 'pour', 'strain'), 0.2, 'soupSplosh'), b(baker(h, live, undefined, 'shock'), 0.5), b(baker(h, live), 0.2)] },
          { who: 'diner', after: 0.2, beats: [b(sits(h, 'Helmet'), 0.6, 'ladleBong')] },
        ],
      }
    }
    case 'bowl':
      if (h.soup === 0) return { plan: [{ who: 'soup', beats: [b('spoonRing', 0.2, 'bowlTing'), b([], 0.1)] }, { who: 'diner', beats: [b(sits(h, 'RestB'), 0.3), b(dinerRest(h, live), 0.1)] }] }
      return flyInSoup(h)
        ? { plan: [{ who: 'soup', beats: [b([...bowlful(h), 'spoonRing'], 0.2, 'soupGargle'), b(bowlful(h), 0.1)] }, sprays(h, live, 0.2)] }
        : { plan: [{ who: 'soup', beats: [b([...bowlful(h), 'spoonRing'], 0.2, 'spoonTinkA'), b(bowlful(h), 0.1)] }] }
    case 'vase':
      return flyOnFlower(h)
        ? { plan: [{ who: 'vase', beats: [b(['vaseFlower', 'flyFlowerB'], 0.16, 'flyDodge'), b(['vaseFlower', 'flyFlower'], 0.16), b(['vaseFlower', 'flyFlowerB'], 0.16), b(['vaseFlower', 'flyFlower'], 0.2)] }] }
        : { plan: [{ who: 'vase', beats: [b([], 0.08, 'weedPluck'), b('vaseFlower', 0.2)] }] }
    case 'nose':
      return { plan: [{ who: 'baker', beats: [b(baker(h, live, undefined, 'strain', 'other'), 0.4, 'bakerHum'), b(baker(h, live), 0.3)] }] }
    case 'belly':
      return { plan: [{ who: 'baker', beats: [b(baker(h, live, live.helmet ? undefined : 'giggle', 'glad', 'other'), 0.5, 'bakerGiggle'), b(baker(h, live), 0.3)] }] }
    default:
      return null
  }
}

/** What he has on his head is seen as he turns; a pie that landed in his hat is served from it. */
function carried(h: House, live: Live, serving: boolean): Part[] {
  // The slice is served once, as the meeting happens, and lies on the cloth from then on (`served`).
  if (serving) {
    return [{ who: 'baker', after: 0.3, beats: [b(baker(h, live, 'serve', 'glad'), 0.5, 'pieServe'), b(baker(h, live), 0.3)] }, { who: 'extra', after: 0.5, beats: [b('pieSlice', Infinity)] }]
  }
  if (bakerWears(h) !== 'cap') return [{ who: 'baker', after: 0.3, beats: [b(baker(h, live, undefined, 'calm', 'other'), 0.13, 'rubberFlap'), b(baker(h, live), 0.1), b(baker(h, live, undefined, 'calm', 'other'), 0.13, 'rubberFlapB'), b(baker(h, live), 0.3)] }]
  if (pieOnFace(h)) return [{ who: 'baker', after: 0.3, beats: [b(baker(h, live), 0.4, 'pieHum')] }]
  return []
}

export const dining: RoomDef = {
  id: 'dining',
  print,
  segments,
  ghosts: ['dgRest', 'dnRest', 'soup2', 'soupArc', 'vaseFlower', 'dBody_rest', 'dHead_calm_stand', 'dHat_cap_stand'],
  enter: () => ({ helmet: 0 }),
  rest,
  idle(who, h, live, rng): readonly Beat[] | null {
    if (who === 'baker') {
      const pose = live.helmet ? 'empty' : pieOnFace(h) ? 'feel' : 'rest'
      // He breathes in every state, and straightens his moustache while he waits with the ladle. In this room his
      // belly goes out as a rim lit over the body he has: the room's sprites have no room for each body drawn again.
      return bakerIdle(rng.next(), rng.next(), baker(h, live), [...baker(h, live), 'dSwell'], baker(h, live, undefined, 'blink'), pose === 'rest' ? [b(baker(h, live, 'tidy', 'glad'), 0.5), b(baker(h, live), 0.2)] : null)
    }
    if (who === 'diner' && !live.helmet && h.soup < 3) return [b(sits(h, 'Rest'), 1.6 + rng.next() * 1.8), b(sits(h, 'RestB'), 0.4)]
    if (who === 'vase' && flyOnFlower(h)) return [b(['vaseFlower', 'flyFlower'], 1.2 + rng.next() * 1.6), b(['vaseFlower', 'flyFlowerB'], 0.2), b(['vaseFlower', 'flyFlower'], 0.2), b(['vaseFlower', 'flyFlowerB'], 0.2)]
    return null
  },
  targets,
  touch: (id, h, live) => touch(id, h, live),
  // The dog, awake, is the diner: it is from the chair that he goes ahead through a door.
  dog: 'diner',
  // The diner nods off with its chin on the rim of the bowl. With the ladle on its head, the baker has the ladle
  // back first, and it nods off the same.
  leave(h, live) {
    const plan: Part[] = [{ who: 'diner', beats: [b(sits(h, 'Nod'), 0.2, 'clonk')] }, { who: 'soup', beats: [b([...bowlful(h), 'spoonRing'], 0.2, 'spoonRingOut')] }]
    if (live.helmet) plan.unshift({ who: 'baker', beats: [b(baker(h, { ...live, helmet: 0 }), 0.2)] })
    return plan
  },
  arrive(h, live, serving) {
    const plan: Part[] = carried(h, live, serving)
    // The dog who went ahead is on the chair first: he is seen there as his panting, or his roll, is heard.
    if (dogAbout(h)) plan.unshift({ who: 'diner', after: 0.12, beats: [b(sits(h, 'RestB'), 0.3, h.full ? 'dogRoll' : 'dogPant')] })
    if (flyInSoup(h)) plan.push({ who: 'soup', after: 0.2, beats: [b(bowlful(h), 0.25, 'soupGargle')] }, sprays(h, live, 0.45))
    return plan
  },
  squint: (h, live) => [{ who: 'baker', after: 0.1, beats: [b(baker(h, live, undefined, 'strain'), 0.8, 'bakerHide')] }, { who: 'diner', after: 0.25, beats: [b(live.helmet ? sits(h, 'Helmet') : sits(h, 'RestB'), 0.6, 'henRustle')] }],
  hint(h, live) {
    if (h.soup === 3) return null
    const at = live.helmet ? headOf(h) : LADLE
    return { at: { x: at.x, y: at.y }, glow: at }
  },
}
