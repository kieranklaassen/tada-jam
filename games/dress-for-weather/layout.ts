import { BELONGS, FIGURES, PAIRS, SPOTS, ZIP_TEETH, type Figure, type Garment, type Part, type Spot, type SpotPart, type Wearer, type Where } from './kinds'
import { STAGE } from './stage'

// Where everything stands, in stage units (stage.ts). Pure numbers: the rules
// aim with them, the view draws with them, and layout.test.ts holds the
// distances a small hand needs.
//
// A garment is one piece of paper cut for the child, and it is never resized:
// on the grandfather the raincoat is a bib and on the baby it is a tent. Each
// garment has a pin, the point of it that is laid on a part, and its shape is
// given round that pin.

export type Box = { x0: number; y0: number; x1: number; y1: number }
export type Point = { x: number; y: number }

/** The printed hall sheet lying on the cutting mat. */
export const SHEET: Box = { x0: 18, y0: 20, x1: 1162, y1: 750 }
/** Where every stand rests on the printed floor. */
export const FLOOR_Y = 700
/**
 * The jam's round home control: 48 px across at the top centre of the surface, 10 px from its top, here as it
 * lies on the stage when one unit is one pixel. On another surface it lies elsewhere on the stage
 * (`homeControlOn`). Nothing a child touches lies under it.
 */
export const HOME_CONTROL: Box = { x0: STAGE.width / 2 - 24, y0: 10, x1: STAGE.width / 2 + 24, y1: 58 }

/** The home control on the stage, for a surface of `width` CSS pixels with the stage fitted in it by `by`. */
export function homeControlOn(width: number, by: { scale: number; x: number; y: number }): Box {
  if (!(by.scale > 0)) return HOME_CONTROL
  return { x0: (width / 2 - 24 - by.x) / by.scale, y0: (10 - by.y) / by.scale, x1: (width / 2 + 24 - by.x) / by.scale, y1: (58 - by.y) / by.scale }
}
/** The grown-up's corner at the top right. */
export const GROWN_UP_CORNER: Box = { x0: STAGE.width - 72, y0: 0, x1: STAGE.width, y1: 72 }
/** Below this line wrists rest: nothing a child must touch has its middle there. */
export const WRIST_LINE = 760

/**
 * The three places a figure can stand, and the dog's. The one in the middle stands a little nearer the viewer
 * than the two who wait, which also keeps the tallest head clear of the home control.
 */
export const MIDDLE: Point = { x: 535, y: FLOOR_Y + 26 }
export const BY_THE_DOOR: Point = { x: 236, y: FLOOR_Y }
export const UNDER_THE_WINDOW: Point = { x: 386, y: FLOOR_Y + 4 }
export const DOG_PLACE: Point = { x: 86, y: FLOOR_Y + 6 }

/** The door, the window and the rack board as they are printed. */
export const DOOR: Box = { x0: 36, y0: 132, x1: 188, y1: FLOOR_Y + 4 }
export const WINDOW: Box = { x0: 304, y0: 44, x1: 460, y1: 240 }
export const RACK: Box = { x0: 762, y0: 44, x1: 1160, y1: 742 }

/** The door's handle, and the part of the door a finger opens it by: above the dog, clear of the one who waits beside it. */
export const HANDLE: Point = { x: 62, y: DOOR.y0 + 228 }
export const DOOR_TARGET: Box = { x0: DOOR.x0, y0: DOOR.y0 + 18, x1: DOOR.x0 + 100, y1: 540 }
/** The weather cock on its pole in the top of the window, and the square a finger turns it by. */
export const VANE: Point = { x: 404, y: 96 }
export const VANE_TARGET: Box = { x0: VANE.x - 50, y0: VANE.y - 50, x1: VANE.x + 50, y1: VANE.y + 50 }

const grown = (box: Box, by: number): Box => ({ x0: box.x0 - by, y0: box.y0 - by, x1: box.x1 + by, y1: box.y1 + by })

/**
 * What no worn garment may lie over: the home control, the vane and the door's handle. A garment whose paper
 * would reach into one of them is slid down the figure until it does not (`poseOf`).
 */
export function clearOf(control: Box = HOME_CONTROL): Box[] {
  return [grown(control, 8), VANE_TARGET, grown({ x0: HANDLE.x, y0: HANDLE.y, x1: HANDLE.x, y1: HANDLE.y }, 40)]
}

/** A body, measured from the middle of its stand: x to the viewer's right, y down, so everything above the floor is negative. */
export type Body = {
  height: number
  /** The middle of the face, and its radius. */
  face: Point
  faceR: number
  /** Where a thing laid on each part is pinned. */
  pin: Record<SpotPart, Point | null>
  /** Where a finger aims to choose each part. */
  aim: Record<SpotPart, Point | null>
  /** Half the distance between the two hands, and between the two feet. */
  handSep: number
  footSep: number
  /** How far up the head the hat sits, where the brim would otherwise cover the eyes of a low face. */
  hatUp?: number
}

const NONE = null

export const BODIES: Record<Wearer, Body> = {
  child: {
    height: 470,
    face: { x: 0, y: -392 },
    faceR: 75,
    pin: { head: { x: 0, y: -468 }, neck: { x: 0, y: -318 }, body: { x: 0, y: -300 }, hands: { x: 0, y: -176 }, feet: { x: 0, y: -30 }, back: NONE },
    aim: { head: { x: 0, y: -400 }, neck: { x: 0, y: -316 }, body: { x: 0, y: -228 }, hands: { x: 0, y: -176 }, feet: { x: 0, y: -30 }, back: NONE },
    handSep: 100,
    footSep: 32,
  },
  grandfather: {
    height: 600,
    face: { x: 0, y: -552 },
    faceR: 48,
    pin: { head: { x: 0, y: -600 }, neck: { x: 0, y: -500 }, body: { x: 0, y: -486 }, hands: { x: 0, y: -276 }, feet: { x: 0, y: -30 }, back: NONE },
    aim: { head: { x: 0, y: -556 }, neck: { x: 0, y: -498 }, body: { x: 0, y: -400 }, hands: { x: 0, y: -276 }, feet: { x: 0, y: -30 }, back: NONE },
    handSep: 82,
    footSep: 24,
  },
  baby: {
    height: 250,
    face: { x: 0, y: -182 },
    faceR: 68,
    pin: { head: { x: 0, y: -250 }, neck: { x: 0, y: -116 }, body: { x: 0, y: -106 }, hands: { x: 0, y: -76 }, feet: { x: 0, y: -16 }, back: NONE },
    aim: { head: { x: 0, y: -190 }, neck: { x: 0, y: -118 }, body: { x: 0, y: -62 }, hands: { x: 0, y: -76 }, feet: { x: 0, y: -12 }, back: NONE },
    handSep: 92,
    footSep: 44,
    hatUp: 30,
  },
  dog: {
    height: 150,
    face: { x: 40, y: -104 },
    faceR: 30,
    pin: { head: NONE, neck: NONE, body: NONE, hands: NONE, feet: NONE, back: { x: -10, y: -92 } },
    aim: { head: NONE, neck: NONE, body: NONE, hands: NONE, feet: NONE, back: { x: 4, y: -78 } },
    handSep: 0,
    footSep: 0,
  },
}

/** The crease across the grandfather's middle, where his sheet was folded, from the middle of his stand: he bends here and nowhere else. */
export const CREASE_Y = -330

/** How tall the three figures stand, tallest first: the taller of the two who wait stands by the door. */
const BY_HEIGHT: readonly Figure[] = [...FIGURES].sort((a, b) => BODIES[b].height - BODIES[a].height)

/** Where each wearer stands at rest when `turn` is in the middle. */
export function standOf(who: Wearer, turn: Figure): Point {
  if (who === 'dog') return DOG_PLACE
  if (who === turn) return MIDDLE
  const waiting = BY_HEIGHT.filter((figure) => figure !== turn)
  return waiting[0] === who ? BY_THE_DOOR : UNDER_THE_WINDOW
}

/** Where everyone stands: the middle of each stand, on the stage. A figure that is walking is where it has got to. */
export type Stands = Record<Wearer, Point>

/** Everyone at rest with `turn` in the middle. */
export function placesOf(turn: Figure): Stands {
  return { child: standOf('child', turn), grandfather: standOf('grandfather', turn), baby: standOf('baby', turn), dog: DOG_PLACE }
}

/** The solid middle of each wearer, from the middle of its stand: its head and its trunk, without the arms. */
const CORES: Record<Wearer, readonly Box[]> = {
  child: [{ x0: -75, y0: -467, x1: 75, y1: -317 }, { x0: -62, y0: -306, x1: 62, y1: 0 }],
  grandfather: [{ x0: -46, y0: -602, x1: 46, y1: -502 }, { x0: -50, y0: -490, x1: 50, y1: 0 }],
  baby: [{ x0: -68, y0: -248, x1: 68, y1: -116 }, { x0: -82, y0: -142, x1: 82, y1: 0 }],
  dog: [{ x0: 12, y0: -136, x1: 88, y1: -78 }, { x0: -50, y0: -98, x1: 38, y1: 0 }],
}

export function coresAt(who: Wearer, at: Point): Box[] {
  return CORES[who].map((box) => ({ x0: at.x + box.x0, y0: at.y + box.y0, x1: at.x + box.x1, y1: at.y + box.y1 }))
}

export function boxesMeet(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

/** One garment's paper round its pin: for a pair, one piece of the pair (the one on the viewer's right). */
export const EXTENT: Record<Garment, Box> = {
  raincoat: { x0: -116, y0: -14, x1: 116, y1: 238 },
  duffel: { x0: -116, y0: -14, x1: 116, y1: 238 },
  boots: { x0: -24, y0: -6, x1: 42, y1: 74 },
  hat: { x0: -78, y0: -106, x1: 78, y1: 22 },
  scarf: { x0: -64, y0: -22, x1: 66, y1: 156 },
  mittens: { x0: -26, y0: -6, x1: 26, y1: 60 },
  umbrella: { x0: -20, y0: -180, x1: 20, y1: 34 },
}
/** The umbrella is wider when it is open. */
export const UMBRELLA_OPEN: Box = { x0: -118, y0: -192, x1: 118, y1: 34 }

export function extentOf(garment: Garment, open: boolean): Box {
  return garment === 'umbrella' && open ? UMBRELLA_OPEN : EXTENT[garment]
}

/** Where a garment's pin lies on the stage, how it is turned, and for a pair how far each piece is from the middle. */
export type Pose = { x: number; y: number; rot: number; sep: number }

/** The pins on the rack board. */
export const ON_RACK: Record<Garment, Pose> = {
  raincoat: { x: 886, y: 98, rot: 0, sep: 0 },
  duffel: { x: 886, y: 380, rot: 0, sep: 0 },
  boots: { x: 878, y: 654, rot: 0, sep: 36 },
  hat: { x: 1080, y: 192, rot: 0, sep: 0 },
  scarf: { x: 1080, y: 264, rot: 0, sep: 0 },
  mittens: { x: 1080, y: 448, rot: 0, sep: 46 },
  // The umbrella hangs by its crook, point down.
  umbrella: { x: 1104, y: 546, rot: Math.PI, sep: 0 },
}

type Lay = { dx?: number; dy?: number; rot?: number; /** Laid on one hand or foot: 1 for the viewer's right, -1 for the left. */ side?: 1 | -1; /** A pair's half distance, where the part gives none. */ sep?: number }

const HALF = Math.PI / 2

/** How each garment lies on each part, from that part's pin. */
export const LAY: Record<Garment, Record<SpotPart, Lay>> = {
  raincoat: { head: { dy: 8 }, neck: {}, body: {}, hands: { side: 1, dy: -8, rot: 0.12 }, feet: { rot: Math.PI, dy: 6 }, back: { dx: 44 } },
  duffel: { head: { dy: 8 }, neck: {}, body: {}, hands: { side: 1, dy: -8, rot: 0.12 }, feet: { rot: Math.PI, dy: 6 }, back: { dx: 44 } },
  boots: { head: { dy: -70, sep: 26 }, neck: { dy: 14, sep: 30 }, body: { dy: 76, sep: 30 }, hands: { dy: -30 }, feet: { dy: -44 }, back: { dy: -70, sep: 26 } },
  hat: { head: { dy: 32 }, neck: { rot: Math.PI, dy: 10 }, body: { rot: Math.PI, dy: 92 }, hands: { side: 1, dy: -12 }, feet: { side: 1, dy: -12 }, back: { dx: 46, dy: -58 } },
  scarf: { head: { dy: 36 }, neck: {}, body: { dy: 122 }, hands: { side: 1, dy: -6 }, feet: { rot: -HALF, dy: -6 }, back: { rot: Math.PI, dx: 4, dy: 8 } },
  mittens: { head: { dy: 62, sep: 84 }, neck: { dy: 8, sep: 44 }, body: { dy: 122, sep: 60 }, hands: { dy: -24 }, feet: { dy: -50 }, back: { dx: 4, dy: 2, sep: 30 } },
  umbrella: { head: {}, neck: { rot: Math.PI, dy: 30 }, body: { rot: HALF, dx: -40, dy: 112 }, hands: { side: 1, rot: 0.02 }, feet: { side: 1, dy: -6, rot: -0.5 }, back: { dx: 44, dy: -4 } },
}

function turned(box: Box, rot: number): Box {
  const cos = Math.cos(rot), sin = Math.sin(rot)
  const xs: number[] = [], ys: number[] = []
  for (const [x, y] of [[box.x0, box.y0], [box.x1, box.y0], [box.x1, box.y1], [box.x0, box.y1]] as const) {
    xs.push(x * cos - y * sin)
    ys.push(x * sin + y * cos)
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

/** The paper of a garment in a pose, as a box on the stage: both pieces of a pair. */
export function paperBox(garment: Garment, pose: Pose, open: boolean): Box {
  const box = turned(extentOf(garment, open), pose.rot)
  const reach = PAIRS.includes(garment) ? pose.sep + Math.max(-box.x0, box.x1) : 0
  const x0 = PAIRS.includes(garment) ? -reach : box.x0, x1 = PAIRS.includes(garment) ? reach : box.x1
  return { x0: pose.x + x0, y0: pose.y + box.y0, x1: pose.x + x1, y1: pose.y + box.y1 }
}

/**
 * Where a garment lies when it is at `where`, with everyone standing at `stands`. On a wearer it is laid on the
 * part's pin as LAY says, and then kept on the sheet: paper that would hang below the floor or stand above the
 * sheet's top is slid along the figure until it does not, and so is paper that would lie over anything in
 * `clear`.
 */
export function poseOf(garment: Garment, where: Where, stands: Stands, open: boolean, clear: readonly Box[] = CLEAR): Pose {
  if (where === 'rack') return ON_RACK[garment]
  const body = BODIES[where.who], at = stands[where.who], pin = body.pin[where.part], lay = LAY[garment][where.part]
  if (!pin) return ON_RACK[garment]
  const partSep = where.part === 'hands' ? body.handSep : where.part === 'feet' ? body.footSep : 0
  const up = garment === 'hat' && where.part === 'head' ? (body.hatUp ?? 0) : 0
  const pose: Pose = { x: at.x + pin.x + (lay.dx ?? 0) + (lay.side ?? 0) * partSep, y: at.y + pin.y + (lay.dy ?? 0) - up, rot: lay.rot ?? 0, sep: PAIRS.includes(garment) ? (partSep || (lay.sep ?? 30)) : 0 }
  const box = paperBox(garment, pose, open)
  if (box.y1 > at.y + 14) pose.y -= box.y1 - (at.y + 14)
  const top = paperBox(garment, pose, open).y0
  if (top < SHEET.y0 + 14) pose.y += SHEET.y0 + 14 - top
  for (const keep of clear) {
    const now = paperBox(garment, pose, open)
    if (boxesMeet(now, keep)) pose.y += keep.y1 - now.y0
  }
  return pose
}

const CLEAR: readonly Box[] = clearOf()

/** A point of a garment's own paper, on the stage. */
export function fromPaper(pose: Pose, x: number, y: number): Point {
  const cos = Math.cos(pose.rot), sin = Math.sin(pose.rot)
  return { x: pose.x + x * cos - y * sin, y: pose.y + x * sin + y * cos }
}

/** A point of the stage, on a garment's own paper. */
export function toPaper(pose: Pose, x: number, y: number): Point {
  const cos = Math.cos(pose.rot), sin = Math.sin(pose.rot), dx = x - pose.x, dy = y - pose.y
  return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos }
}

/** Whether a stage point is on a garment's paper in that pose, with `pad` units of forgiveness all round, or its own across and up and down. */
export function onPaper(garment: Garment, pose: Pose, open: boolean, x: number, y: number, pad: number | { x: number; y: number }): boolean {
  const p = toPaper(pose, x, y), box = extentOf(garment, open)
  const padX = typeof pad === 'number' ? pad : pad.x, padY = typeof pad === 'number' ? pad : pad.y
  const inside = (px: number, flip: boolean) => {
    const lx = flip ? -px : px
    return lx >= box.x0 - padX && lx <= box.x1 + padX && p.y >= box.y0 - padY && p.y <= box.y1 + padY
  }
  if (!PAIRS.includes(garment)) return inside(p.x, false)
  return inside(p.x - pose.sep, false) || inside(p.x + pose.sep, true)
}

/** A garment on the rack is at least this far across to a finger, however thin its paper. */
export const RACK_TARGET = 100

/** Whether a stage point takes a garment off the rack: its paper, widened to RACK_TARGET each way. */
export function onRackTarget(garment: Garment, x: number, y: number): boolean {
  const box = paperBox(garment, ON_RACK[garment], false)
  const growX = Math.max(8, (RACK_TARGET - (box.x1 - box.x0)) / 2), growY = Math.max(8, (RACK_TARGET - (box.y1 - box.y0)) / 2)
  return x >= box.x0 - growX && x <= box.x1 + growX && y >= box.y0 - growY && y <= box.y1 + growY
}

/** Where a finger aims to choose a spot. A figure's two hands are two points. */
export function aimsOf(spot: Spot, stands: Stands): Point[] {
  const body = BODIES[spot.who], at = stands[spot.who], aim = body.aim[spot.part]
  if (!aim) return []
  if (spot.part === 'hands') return [{ x: at.x - body.handSep, y: at.y + aim.y }, { x: at.x + body.handSep, y: at.y + aim.y }]
  return [{ x: at.x + aim.x, y: at.y + aim.y }]
}

/** A garment let go within this of a spot's aim goes on there. */
export const REACH = 118

/** The spot a garment let go at that stage point goes on: the nearest aim within reach, or none. */
export function spotAt(x: number, y: number, stands: Stands): Spot | null {
  let best: Spot | null = null, bestD = REACH
  for (const spot of SPOTS) {
    for (const aim of aimsOf(spot, stands)) {
      const d = Math.hypot(aim.x - x, aim.y - y)
      if (d < bestD) {
        bestD = d
        best = spot
      }
    }
  }
  return best
}

/** Half the width of the box a finger has a wearer by. */
export function wearerHalf(who: Wearer): number {
  const body = BODIES[who]
  return who === 'dog' ? 72 : Math.max(body.faceR, body.handSep + 16)
}

/** Whether a stage point is on a wearer's own paper: a tall box round a figure, a low one round the dog. */
export function onWearer(who: Wearer, x: number, y: number, stands: Stands): boolean {
  const body = BODIES[who], at = stands[who]
  const half = wearerHalf(who)
  return x >= at.x - half && x <= at.x + half && y >= at.y - body.height && y <= at.y + 10
}

// --- The fastenings, on the garment's own paper -----------------------------

/** The zip runs up the middle of the raincoat from the hem to the collar. */
export const ZIP = { x: 0, bottom: 224, top: 20 } as const

/** Where the slider sits with `teeth` teeth closed. */
export function sliderAt(teeth: number): Point {
  return { x: ZIP.x, y: ZIP.bottom - (ZIP.bottom - ZIP.top) * (teeth / ZIP_TEETH) }
}

/** How many teeth a finger at that point of the coat's paper has closed, 0 to ZIP_TEETH. */
export function teethAt(y: number): number {
  return Math.max(0, Math.min(ZIP_TEETH, Math.round(((ZIP.bottom - y) / (ZIP.bottom - ZIP.top)) * ZIP_TEETH)))
}

/** The duffel coat's three buttons, top to bottom. */
export const BUTTON_AT: readonly Point[] = [{ x: 0, y: 60 }, { x: 0, y: 122 }, { x: 0, y: 184 }]

/** A finger within this of the slider has it: a round shape 100 units across. */
export const SLIDER_REACH = 50
/** A finger in this box round a button has it: 100 units across, and as high as the buttons are apart. */
export const BUTTON_HALF = { x: 50, y: 31 } as const

/** Whether a point of the duffel coat's own paper is on that button. */
export function onButton(index: number, x: number, y: number): boolean {
  const at = BUTTON_AT[index]
  return Math.abs(x - at.x) <= BUTTON_HALF.x && Math.abs(y - at.y) < BUTTON_HALF.y
}

/** A finger this far outside a worn garment's paper still has it. */
export const PAPER_PAD = 10
/** A worn garment is at least this far across and this high to a finger, however small its paper: one mitten is as easy to take as a coat. */
export const WORN_TARGET = 100

/** How far outside its paper a worn garment still has the finger, across and up and down. */
export function wornPad(garment: Garment, open: boolean): { x: number; y: number } {
  const box = extentOf(garment, open)
  return { x: Math.max(PAPER_PAD, (WORN_TARGET - (box.x1 - box.x0)) / 2), y: Math.max(PAPER_PAD, (WORN_TARGET - (box.y1 - box.y0)) / 2) }
}

/** The dog's head, from the middle of its stand: it comes through whatever is on its back, and a finger there is on the dog. */
export const DOG_HEAD: Box = { x0: 0, y0: -136, x1: 100, y1: -78 }

/**
 * Every shape a finger can land on, with how far across and how high it is in stage units: what
 * layout.test.ts holds to 48 px on every tablet surface.
 */
export function touchShapes(): { name: string; across: number; high: number }[] {
  const shapes = [
    { name: 'the zip\'s slider', across: SLIDER_REACH * 2, high: SLIDER_REACH * 2 },
    { name: 'a button', across: BUTTON_HALF.x * 2, high: BUTTON_HALF.y * 2 },
    { name: 'the vane', across: VANE_TARGET.x1 - VANE_TARGET.x0, high: VANE_TARGET.y1 - VANE_TARGET.y0 },
    { name: 'the door', across: DOOR_TARGET.x1 - DOOR_TARGET.x0, high: DOOR_TARGET.y1 - DOOR_TARGET.y0 },
    { name: 'the dog\'s head', across: DOG_HEAD.x1 - DOG_HEAD.x0, high: DOG_HEAD.y1 - DOG_HEAD.y0 },
    { name: 'the baby\'s head', across: BODIES.baby.faceR * 2, high: BODIES.baby.faceR * 2 },
  ]
  for (const who of [...FIGURES, 'dog'] as const) shapes.push({ name: `the ${who}`, across: wearerHalf(who) * 2, high: BODIES[who].height + 10 })
  for (const garment of Object.keys(EXTENT) as Garment[]) {
    const box = EXTENT[garment]
    shapes.push({ name: `the ${garment} on its peg`, across: Math.max(RACK_TARGET, box.x1 - box.x0 + 16), high: Math.max(RACK_TARGET, box.y1 - box.y0 + 16) })
    const pad = wornPad(garment, false)
    shapes.push({ name: `the ${garment} when it is worn`, across: box.x1 - box.x0 + pad.x * 2, high: box.y1 - box.y0 + pad.y * 2 })
  }
  return shapes
}

/** How far round the cockerel has turned for each weather, in turns: the one heading that is saved (`weather`). */
export const HEADING: Record<'rain' | 'snow' | 'wind' | 'sun', number> = { rain: 0, snow: 1 / 6, wind: 1 / 3, sun: 1 / 2 }
/** How wide the cockerel is seen at a heading, as a share of its paper and with its sign: 1 faces right, -1 left. */
export function cockerelAcross(turn: number): number {
  return Math.cos(2 * Math.PI * turn)
}

/** The part a tapped garment flies to: the one it was cut for, on whoever is in the middle. */
export function ownSpot(garment: Garment, turn: Figure): Spot {
  return { who: turn, part: BELONGS[garment] }
}

// --- The garden, on the back of the hall sheet --------------------------------

/**
 * Where the figure and the dog stand in the garden, the gate (its middle, and the height of its rails) and the
 * tall post it hangs on (its near face, and its top). The figure stands well right of the middle of the sheet,
 * so that nothing of it can come under the home control at the top centre, whatever it wears and however the
 * weather moves it, on any surface (garden.test.ts).
 */
export const GARDEN = { figure: { x: 880, y: 716 }, dog: { x: 280, y: 722 }, ground: 560, gate: { x: 1124, y: 680 }, post: { x: 1080, top: 100 } } as const

const FAR: Point = { x: -4000, y: 0 }

/** Where a garment of the outfit lies on the figure or the dog as they stand in the garden: as it lay in the hall, on the same body. */
export function gardenPose(garment: Garment, who: Wearer, part: SpotPart, open: boolean): Pose {
  const stands: Stands = { child: FAR, grandfather: FAR, baby: FAR, dog: GARDEN.dog }
  if (who !== 'dog') stands[who] = GARDEN.figure
  return poseOf(garment, { who, part }, stands, open, [])
}

/** Where the tip of the scarf's tail is from its pin when the tail stands out level, as a ruler. */
export const SCARF_TIP: Point = { x: 152, y: -47 }

/** Where the scarf's tip is on the stage when the scarf is worn on that part of the figure in the garden and its tail stands out level. */
export function scarfTip(who: Figure, part: Part): Point {
  const pose = gardenPose('scarf', who, part, false)
  return { x: pose.x + SCARF_TIP.x, y: pose.y + SCARF_TIP.y }
}

// --- Arms: a figure's two arms are cut with it, and one can be lifted off the sheet -----------------

/** The arm on the viewer's right, from the middle of the stand: where it is hinged, and where its hand is at rest. The other mirrors it. */
export const ARMS: Record<Figure, { shoulder: Point; hand: Point }> = {
  child: { shoulder: { x: 57, y: -297 }, hand: { x: 100, y: -170 } },
  grandfather: { shoulder: { x: 44, y: -486 }, hand: { x: 82, y: -270 } },
  baby: { shoulder: { x: 60, y: -100 }, hand: { x: 100, y: -76 } },
}

/**
 * The shortest and the longest a lifted paper arm is seen, as a share of its length flat on the sheet. The
 * baby's arms are cut short and folded in at rest, and unfold to three times that when it reaches up.
 */
export const ARM_SEEN: { least: number; most: Record<Figure, number> } = { least: 0.35, most: { child: 1.2, grandfather: 1.2, baby: 3 } }

/**
 * A lifted arm with its hand sent to `target` (from the middle of the stand, on the viewer's right): which way
 * it lay, which way it points now, how long it is seen (an arm lifted off the sheet is seen shorter), and where
 * the hand has got to, which is the target whenever the arm can reach it.
 */
export function armTo(who: Figure, target: Point): { from: number; to: number; long: number; hand: Point } {
  const { shoulder, hand } = ARMS[who]
  const rest = Math.hypot(hand.x - shoulder.x, hand.y - shoulder.y), far = Math.hypot(target.x - shoulder.x, target.y - shoulder.y)
  const from = Math.atan2(hand.y - shoulder.y, hand.x - shoulder.x), to = far < 1e-6 ? from : Math.atan2(target.y - shoulder.y, target.x - shoulder.x)
  const long = Math.max(ARM_SEEN.least, Math.min(ARM_SEEN.most[who], far / rest))
  return { from, to, long, hand: { x: shoulder.x + Math.cos(to) * rest * long, y: shoulder.y + Math.sin(to) * rest * long } }
}

/**
 * Where the one who raps the glass puts its knuckles, on the stage, and how far it has to jump to get them
 * there: the grandfather reaches, the child jumps. The baby is never the taller of two who wait.
 */
export const RAP: Record<'grandfather' | 'child', { at: Point; hop: number }> = {
  grandfather: { at: { x: 378, y: 168 }, hop: 0 },
  child: { at: { x: 322, y: 170 }, hop: 80 },
}
/** The sash's meeting rail: the glass above it is clear, and a short curtain hangs below it. */
export const SASH_Y = 178
