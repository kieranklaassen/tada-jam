import { bakerWears, pieOnFace, type House } from './house'
import type { Oval } from './layout'
import type { Beat } from './figure'
import type { Pen, Picture } from './pen'
import { b } from './room'

// The baker on his feet, as he is by day: at the stove, at the pump, under
// his tray and at the table. He is drawn about the point between his feet,
// with up as less y, in three parts that are lit together: a body with its
// arms, legs and whatever he holds; a head; and what he has on his head. The
// parts are apart so that the rubber of a burst balloon or a pie can be found
// on him in any room, whatever he is doing there.

const D = Math.PI / 180

export type Face = {
  eyes: 'calm' | 'shut' | 'wide' | 'cross' | 'glad' | 'squint'
  /** Each half of the moustache hangs, lifts, lies level, or flies off to the sides. */
  whiskers: 'down' | 'up' | 'level' | 'wild'
  mouth?: 'o' | 'grin'
  cheeks?: boolean
}

/** How he stands, which is also how high his head is. */
export type Legs = 'stand' | 'bent' | 'toes' | 'stool'

export type Body = {
  /** Each arm from the shoulder to the hand, as points about his feet. */
  armL: readonly number[]
  armR: readonly number[]
  legs: Legs
  /** Whatever he holds, drawn with the body. */
  held?: (p: Pen) => void
  /** His belly shakes: the crease across it is doubled. */
  shake?: boolean
  /** He breathes in this pose: the set also holds it with his belly out, named with `In` after it. */
  breathes?: boolean
  /** His belly is out with a breath. Set by the set, never by a room. */
  swell?: boolean
}

export type Hat = 'cap' | 'capJump' | 'rubber' | 'rubberFlap' | 'rubberPie' | 'rubberPieFlap'

const HEAD_Y = -336
const RISE: Record<Legs, number> = { stand: 0, bent: 24, toes: -22, stool: -8 }

function eyes(p: Pen, kind: Face['eyes']): void {
  for (const side of [-1, 1]) {
    const x = side * 27, y = -14
    if (kind === 'shut') p.line([x - 13, y - 2, x, y + 7, x + 13, y - 2], 5)
    else if (kind === 'glad') p.line([x - 13, y + 5, x, y - 7, x + 13, y + 5], 5)
    else if (kind === 'squint') p.line([x - 12, y - 4 * side, x + 12, y + 4 * side], 6)
    else p.ell(x, y, kind === 'wide' ? 15 : 11, kind === 'wide' ? 16 : 12)
  }
}

function pupils(p: Pen, kind: Face['eyes']): void {
  for (const side of [-1, 1]) {
    const x = side * 27, y = -14
    if (kind === 'calm') p.ell(x, y + 2, 5, 6)
    else if (kind === 'wide') p.ell(x, y, 4, 4)
    else if (kind === 'cross') p.ell(x - side * 5, y + 3, 5, 5)
  }
}

function moustache(p: Pen, whiskers: Face['whiskers']): readonly (readonly [number, number, number])[] {
  void p
  const tilt = whiskers === 'down' ? 16 : whiskers === 'up' ? -24 : whiskers === 'wild' ? -52 : 0
  const out = whiskers === 'wild' ? 8 : 0
  return [[-46 - out, 26 - out, tilt], [46 + out, 26 - out, -tilt]]
}

/** His face about its own middle: a round head with ears, a bulb of a nose and a moustache wider than the head. */
function head(p: Pen, face: Face): void {
  const halves = moustache(p, face.whiskers)
  p.cut(() => p.ell(0, 0, 73, 65))
  p.ell(-66, 2, 12, 17)
  p.ell(66, 2, 12, 17)
  p.ell(0, 0, 67, 59)
  if (face.cheeks) { p.ell(-56, 22, 30, 27); p.ell(56, 22, 30, 27) }
  p.cut(() => { for (const [x, y, turn] of halves) p.ell(x, y, 61, 22, turn * D) })
  for (const [x, y, turn] of halves) p.ell(x, y, 56, 17, turn * D)
  p.cut(() => {
    p.ell(0, 8, 15, 12)
    eyes(p, face.eyes)
    if (face.mouth === 'o') p.ell(0, 46, 11, 9)
    else if (face.mouth === 'grin') p.line([-20, 40, 0, 52, 20, 40], 6)
  })
  p.ell(0, 8, 9, 7)
  pupils(p, face.eyes)
}

/** A pie has landed on his face: a crimped disc with cream running off it, and only the moustache showing through. */
function pieHead(p: Pen): void {
  const halves = moustache(p, 'down')
  p.cut(() => p.ell(0, -4, 84, 78))
  p.ell(-66, 2, 12, 17)
  p.ell(66, 2, 12, 17)
  p.ell(0, 0, 67, 59)
  for (let i = 0; i < 11; i++) {
    const a = (i * 360 / 11) * D
    p.ell(Math.cos(a) * 66, -8 + Math.sin(a) * 60, 15, 13)
  }
  p.ell(0, -8, 64, 58)
  p.ell(-38, 62, 9, 20)
  p.ell(30, 70, 8, 16)
  p.cut(() => {
    for (const [x, y, turn] of halves) p.ell(x, y, 61, 22, turn * D)
    p.line([-30, -34, -6, -22, 22, -36], 5)
    p.ell(8, -4, 9, 6, 0.4)
  })
  for (const [x, y, turn] of halves) p.ell(x, y, 56, 17, turn * D)
}

/** His tall hat: a band and three puffs. */
function cap(p: Pen): void {
  p.ell(-30, -86, 27, 25)
  p.ell(2, -98, 30, 28)
  p.ell(32, -84, 26, 24)
  p.poly([-42, -72, 42, -72, 38, -46, -38, -46])
  p.cut(() => p.line([-40, -68, 40, -68], 4))
}

/** The rubber of the burst balloon, draped over his head, with the neck of the balloon standing up. */
function rubber(p: Pen, flap: boolean): void {
  p.blob([-88, -24, -92, -50, -60, -78, 0, -88, 60, -78, 92, -50, 88, -24, 70, -40, 52, -22, 30, -44, 0, -40, -30, -44, -52, -22, -70, -40])
  if (flap) {
    p.line([-74, -56, -112, -92, -96, -124], 16)
    p.ell(-96, -130, 13, 9, -0.5)
  } else {
    p.line([40, -78, 58, -108, 86, -112], 16)
    p.ell(94, -112, 9, 13, 0.2)
  }
  p.cut(() => {
    p.line([-50, -62, -10, -72, 40, -62], 5)
    p.line([-66, -46, -72, -34], 4)
    p.line([66, -46, 72, -34], 4)
  })
}

/** A pie sitting in the rubber hat: a dome on a crimped rim, with a curl of steam. */
function pieInHat(p: Pen): void {
  p.blob([-50, -92, -44, -122, 0, -136, 44, -122, 50, -92])
  for (const x of [-44, -22, 0, 22, 44]) p.ell(x, -92, 13, 9)
  p.cut(() => { p.line([-16, -118, 0, -124, 16, -118], 4); p.ell(0, -108, 5, 4) })
  p.line([-8, -146, 4, -158, -6, -170], 5)
}

function hat(p: Pen, kind: Hat): void {
  if (kind === 'cap') p.at(0, 0, () => cap(p), { turn: -8 * D })
  else if (kind === 'capJump') {
    p.at(10, -46, () => cap(p), { turn: 16 * D })
    p.ell(-36, -66, 5, 11, 0.5)
    p.ell(40, -60, 5, 11, -0.5)
  } else {
    rubber(p, kind === 'rubberFlap' || kind === 'rubberPieFlap')
    if (kind === 'rubberPie') pieInHat(p)
    // The flap is seen with the pie in the hat too: the rubber is thrown up at his ear and the pie hops and tips.
    else if (kind === 'rubberPieFlap') p.at(8, -16, () => pieInHat(p), { turn: 9 * D })
  }
}

function legs(p: Pen, kind: Legs): void {
  if (kind === 'bent') {
    for (const side of [-1, 1]) {
      p.line([side * 46, -62, side * 92, -44, side * 74, -14], 44)
      p.ell(side * 84, -8, 36, 14)
    }
  } else if (kind === 'toes') {
    for (const side of [-1, 1]) {
      p.line([side * 44, -96, side * 44, -34], 44)
      p.ell(side * 46, -18, 17, 24, side * 0.25)
    }
  } else if (kind === 'stool') {
    for (const side of [-1, 1]) {
      p.line([side * 40, -84, side * 108, -112, side * 96, -62], 42)
      p.ell(side * 104, -52, 34, 14, side * -0.3)
    }
  } else {
    for (const side of [-1, 1]) {
      p.line([side * 44, -74, side * 46, -20], 46)
      p.ell(side * 54, -8, 36, 14)
    }
  }
}

/**
 * His belly out, as a rim to light over a standing body that has no pose of its own with its belly out: where a
 * room's sprites have no room for one more whole body, he still breathes.
 */
export function swellRim(p: Pen): void {
  p.ell(0, -172, 110, 126)
  p.cut(() => {
    p.ell(0, -178, 101, 119)
    // Below his shoulders only: the gap between his head and his shoulders stays open.
    p.poly([-130, -320, 130, -320, 130, -214, -130, -214])
  })
}

function body(p: Pen, o: Body): void {
  const dy = RISE[o.legs]
  legs(p, o.legs)
  p.at(0, dy, () => {
    if (o.swell) p.ell(0, -172, 110, 126)
    else p.ell(0, -176, 104, 122)
    p.line(o.armL, 34)
    p.line(o.armR, 34)
    p.ell(o.armL[o.armL.length - 2], o.armL[o.armL.length - 1], 23, 21)
    p.ell(o.armR[o.armR.length - 2], o.armR[o.armR.length - 1], 23, 21)
    p.cut(() => {
      // The apron: its top edge, its pocket, and the creases where the arms lie on the belly.
      p.line([-74, -224, 0, -204, 74, -224], 6)
      p.line(o.swell ? [-32, -122, 0, -108, 32, -122] : [-30, -130, 0, -118, 30, -130], 5)
      if (o.shake) p.line([-84, -160, 0, -138, 84, -160], 5)
      // The gap between his head and his shoulders.
      p.ell(0, HEAD_Y, 76, 68)
    })
  })
  o.held?.(p)
}

/** A baker who stands at one place of a room. `prefix` starts the names of his segments. */
export type BakerSet = {
  segments: Record<string, Picture>
  /** His segments for a body and a face, with what the house has put on his head; `hat` asks for the hat's other pose. */
  cast(body: string, face: string, house: House, hat?: 'other'): string[]
  /** Where his head and his belly answer a touch, while he stands. */
  head: Oval
  belly: Oval
}

export function bakerSet(prefix: string, x: number, footY: number, scale: number, bodies: Readonly<Record<string, Body>>, faces: Readonly<Record<string, Face>>, mirror = false): BakerSet {
  const put = (picture: (p: Pen) => void): Picture => (p) => p.at(x, footY, () => picture(p), { scale, mirror })
  const segments: Record<string, Picture> = {}
  const used = new Set<Legs>()
  const all: Record<string, Body> = {}
  for (const [name, o] of Object.entries(bodies)) {
    all[name] = o
    if (o.breathes) all[`${name}In`] = { ...o, swell: true }
  }
  for (const [name, o] of Object.entries(all)) {
    segments[`${prefix}Body_${name}`] = put((p) => body(p, o))
    used.add(o.legs)
  }
  for (const kind of used) {
    const y = HEAD_Y + RISE[kind]
    for (const [name, face] of Object.entries(faces)) segments[`${prefix}Head_${name}_${kind}`] = put((p) => p.at(0, y, () => head(p, face)))
    segments[`${prefix}Head_pie_${kind}`] = put((p) => p.at(0, y, () => pieHead(p)))
    for (const hatKind of ['cap', 'capJump', 'rubber', 'rubberFlap', 'rubberPie', 'rubberPieFlap'] as const) segments[`${prefix}Hat_${hatKind}_${kind}`] = put((p) => p.at(0, y, () => hat(p, hatKind)))
  }
  return {
    segments,
    cast(bodyName, face, house, other) {
      const kind = all[bodyName].legs
      const wears = bakerWears(house)
      const hatKind: Hat = wears === 'cap' ? (other ? 'capJump' : 'cap') : wears === 'rubber' ? (other ? 'rubberFlap' : 'rubber') : other ? 'rubberPieFlap' : 'rubberPie'
      return [`${prefix}Body_${bodyName}`, pieOnFace(house) ? `${prefix}Head_pie_${kind}` : `${prefix}Head_${face}_${kind}`, `${prefix}Hat_${hatKind}_${kind}`]
    },
    head: { x, y: footY + HEAD_Y * scale, rx: 84 * scale, ry: 74 * scale },
    belly: { x, y: footY - 168 * scale, rx: 104 * scale, ry: 104 * scale },
  }
}

/** Where a hand takes the tip of his moustache to straighten it, as the last point of an arm: the left tip, or the right. */
export const TIDY_L = [-84, -262, -156, -296, -108, -318] as const
export const TIDY_R = [84, -262, 156, -296, 108, -318] as const

/**
 * His idle run in a room where he stands: he breathes with his whole belly, and now and then he blinks or
 * straightens something. `roll` and `pause` are two numbers from 0 up to 1 from the room's stream. `breath` and
 * `tidy` are null where the pose he is in has none.
 */
export function bakerIdle(roll: number, pause: number, rest: readonly string[], breath: readonly string[] | null, blink: readonly string[], tidy: readonly Beat[] | null): Beat[] {
  const out: Beat[] = [b(rest, 1.2 + pause * 0.9)]
  if (breath) out.push(b(breath, 0.9))
  if (roll < 0.3) out.push(b(rest, 0.5), b(blink, 0.14))
  else if (roll < 0.6 && tidy) out.push(b(rest, 0.4), ...tidy)
  return out
}
