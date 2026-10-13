import { Leads, PAPER, Pencil, stroke, type MakeCanvas } from './pencil'
import { BALLOON, BASKET, BERG, CATAPULT, CHICK, CLOUD, CRATE, DRIFT, FIRST_BANK, ICE_Y, IGLOO, KIT, PARTS, SEALS, SEA_Y, SHELF_EDGE, SLOT, SLOTS, WALRUS, WHALE, WHALE_BODY, WHALE_EYE, type Box, type Part } from './world'

// What is drawn once: every figure of the page as a pencil drawing of its
// own, and the page behind them. A figure is drawn round its anchor, in
// stage units, and stamped by the view (view.ts) wherever the toy puts it.
// Whatever stands still for good is on the page; whatever moves, or has
// something pass behind it, is a figure.
// Nothing here knows the time: a drawing is the same on every visit.
// No mark here is a letter, a numeral or a sign, and none is meant to look
// like one: stars are not joined up, nothing is crossed, and no hook, arrow
// or zigzag stands alone.

/** A figure: its drawing, and where the drawing lies round the figure's anchor, in stage units. */
export type Sprite = { image: HTMLCanvasElement; x: number; y: number; w: number; h: number }

export type Kit = { make: MakeCanvas; leads: Leads; /** Pixels to a stage unit. */ k: number }

/**
 * A figure drawn inside the box (`x0`, `y0`) to (`x1`, `y1`) of its own units, `zoom` stage units to one of them.
 * A larger figure keeps a pencil's line, and `fade` draws one paler that stands further back.
 */
function figure(kit: Kit, x0: number, y0: number, x1: number, y1: number, seed: number, paint: (p: Pencil) => void, zoom = 1, fade = 1): Sprite {
  const k = kit.k * zoom
  const image = kit.make(Math.max(1, Math.ceil((x1 - x0) * k)), Math.max(1, Math.ceil((y1 - y0) * k)))
  const ctx = image.getContext('2d')
  if (ctx) {
    ctx.setTransform(k, 0, 0, k, -x0 * k, -y0 * k)
    paint(new Pencil(ctx, kit.leads, k, seed, zoom ** -0.55, fade))
  }
  return { image, x: x0 * zoom, y: y0 * zoom, w: (x1 - x0) * zoom, h: (y1 - y0) * zoom }
}

/** The part of a round that stands above a flat floor: a dome, as points. The round's middle is `sink` below the floor. */
function dome(r: number, sink: number, count = 16): number[] {
  const half = Math.acos(Math.max(-1, Math.min(1, sink / r)))
  const points: number[] = []
  for (let i = 0; i <= count; i++) {
    const a = -Math.PI / 2 - half + (2 * half * i) / count
    points.push(Math.cos(a) * r, sink + Math.sin(a) * r)
  }
  return points
}

/** A dome closed a little under the floor, so the floor's own line is the foot of it. */
function mound(r: number, sink: number, count = 16): number[] {
  const points = dome(r, sink, count)
  const foot = Math.abs(points[0])
  points.push(foot * 0.8, 3, -foot * 0.8, 3)
  return points
}

/** How many stage units to one unit of each figure's own drawing. */
export const ZOOM = {
  pilot: 1.65,
  fork: 1.14,
  nearSeal: SEALS[0].r / 50,
  farSeal: SEALS[1].r / 44,
  chick: 1.4,
  walrus: 1.3,
  puffin: 1.8,
  hand: 1.3,
} as const

const scaled = <T extends readonly (readonly number[])[]>(points: T, zoom: number): number[][] => points.map((point) => point.map((v) => v * zoom))
const scaledOne = (point: readonly number[], zoom: number): number[] => point.map((v) => v * zoom)

/** Where on each figure the view finds what it moves: joints, eyes and mouths, in stage units from the figure's anchor. */
export const JOINTS = {
  pilot: {
    lenses: scaled([[4, -22], [21, -21]], ZOOM.pilot),
    lens: 8 * ZOOM.pilot,
    beak: scaledOne([28, -8], ZOOM.pilot),
    flipper: scaledOne([-5, -5], ZOOM.pilot),
    farFlipper: scaledOne([-13, -6], ZOOM.pilot),
    feet: scaled([[-10, 35], [9, 36]], ZOOM.pilot),
    scarf: scaledOne([-25, -5], ZOOM.pilot),
    chin: scaledOne([20, -2], ZOOM.pilot),
    /** Where each part is bolted on. */
    rocket: [-70, 0],
    flame: [-70, 54],
    wings: [-34, -22],
    umbrella: [34, -4],
    /** How long the umbrella's stick is, from the flipper to the middle of the cloth. */
    stick: 104,
    balloon: [-38, -16],
    /** How far above its knot the balloon's middle floats. */
    string: 150,
    rod: [-30, -34],
    /** Where the line ends and the fish hangs. */
    rodTip: [110, -74],
    /** With the spring feet on, the feet are tucked up this far and the coils stand under them. */
    tuck: 16,
    crown: [0, -70],
  },
  pouch: { ties: scaled([[-30, 6], [30, 6]], ZOOM.pilot) },
  fork: { tips: scaled([[-84, -222], [84, -222]], ZOOM.fork) },
  /** The sledge turns about the heel of its runner, and carries the foot of the fork. */
  sledge: { heel: [CATAPULT.foot.x - 52 * ZOOM.fork, CATAPULT.foot.y + 10 * ZOOM.fork], foot: scaledOne([52, -10], ZOOM.fork) },
  nearSeal: {
    eyes: scaled([[-28, -21], [-11, -27]], ZOOM.nearSeal), eye: 8 * ZOOM.nearSeal,
    mouth: scaledOne([-33, -9], ZOOM.nearSeal), nose: scaledOne([-39, -17], ZOOM.nearSeal),
    flippers: scaled([[4, -12], [28, -12]], ZOOM.nearSeal),
    whiskers: scaledOne([-30, -12], ZOOM.nearSeal),
  },
  farSeal: { nose: scaledOne([38, -10], ZOOM.farSeal), flipper: scaledOne([-12, -12], ZOOM.farSeal), eyes: scaled([[13, -19], [26.5, -13]], ZOOM.farSeal), mouth: scaledOne([33, -1], ZOOM.farSeal) },
  chick: { eyes: scaled([[-4, -41], [5, -41]], ZOOM.chick), eye: 3 * ZOOM.chick, beak: scaledOne([1, -35], ZOOM.chick), plate: scaledOne([0, -12], ZOOM.chick), head: scaledOne([0, -52], ZOOM.chick) },
  walrus: { shoulder: scaledOne([-30, -14], ZOOM.walrus), eyes: scaled([[-11, -62], [11, -62]], ZOOM.walrus), eye: 5 * ZOOM.walrus, moustache: scaledOne([0, -40], ZOOM.walrus), brows: scaled([[-18, -71], [-5, -69], [5, -69], [18, -72]], ZOOM.walrus), mouth: scaledOne([0, -30], ZOOM.walrus), tin: scaledOne([0, -8], ZOOM.walrus) },
  puffin: { eye: scaledOne([3, -14], ZOOM.puffin), eyeSize: 4.2 * ZOOM.puffin, glass: scaledOne([7, -14], ZOOM.puffin), bill: scaledOne([24, -11], ZOOM.puffin), net: scaledOne([-8, 4], ZOOM.puffin) },
} as const

export type Art = ReturnType<typeof drawFigures>

/**
 * The outline of each part as it is bolted on, in the part's own units, as x and y in turn, closed: what the
 * drawing below draws, and what the view keeps clear of the ice and the seals (view.ts). A stick or a line is
 * gone along and back, so that nothing is counted that is not drawn. A part is nowhere outside these.
 */
export const PART_SHAPES = {
  rocket: [-14, -44, -13, -58, 0, -76, 13, -58, 14, -44, 14, 12, 30, 44, 14, 40, 12, 52, -12, 52, -14, 40, -30, 44, -14, 12],
  wings: [0, -6, -40, -30, -84, -40, -124, -36, -118, -20, -96, -6, -60, 6, -24, 12, 0, 10],
  umbrellaShut: [0, 13, 0, -22, -6, -22, -10, -40, -8, -76, 0, -112, 8, -76, 10, -40, 6, -22, 0, -22],
  umbrellaOpen: [0, 13, 0, -84, 20, -92, 39, -84, 58, -92, 78, -84, 70, -112, 44, -134, 0, -149, -44, -134, -70, -112, -78, -84, -58, -92, -39, -84, -20, -92, 0, -84],
  umbrellaFlipped: [0, 13, 0, -104, -40, -116, -66, -138, -76, -166, -56, -156, -38, -164, -19, -155, 0, -163, 19, -155, 38, -164, 56, -156, 76, -166, 66, -138, 40, -116, 0, -104],
  balloon: [0, 0, 0, -102, -30, -116, -42, -150, -30, -184, 0, -198, 30, -184, 42, -150, 30, -116, 0, -102],
  springs: [-12, 3, 12, 3, 12, 20, 14, 25, -14, 25, -12, 20],
  rod: [0, 0, 18, -52, 70, -80, 140, -70, 140, -40, 140, -70, 70, -80, 18, -52],
  fish: [0, 0, 10, 10, 12, 26, 6, 40, 12, 60, 0, 55, -12, 60, -6, 40, -12, 26, -10, 10],
  frozen: [-20, -6, 18, -8, 22, 62, -18, 64],
} as const
export type PartShape = keyof typeof PART_SHAPES

/** The pilot's body as it is drawn, in the figure's own units (`ZOOM.pilot` stage units to one), and the sole of one foot, drawn from its ankle. */
const PILOT_BODY = [0, -40, 14, -37, 24, -28, 29, -14, 32, 2, 33, 16, 29, 29, 18, 37, 0, 39, -18, 37, -29, 29, -33, 16, -32, 2, -28, -14, -22, -28, -12, -37] as const
const FOOT_SOLE = [0, -1, 7, -3, 16, 1, 19, 6, 11, 8, 2, 8, -3, 4] as const
/** The same two outlines in stage units from the figure's anchor, closed: what stands under whoever stands on the penguin (view.ts). */
export const PILOT_OUTLINE: readonly number[] = PILOT_BODY.map((v) => v * ZOOM.pilot)
export const FOOT_OUTLINE: readonly number[] = FOOT_SOLE.map((v) => v * ZOOM.pilot)

// --- The kit's parts, each drawn once for the penguin and once, smaller, in its place in the kit ----------------

/** Each part as it is bolted on, in the pilot's own frame (upright, facing right), in the orange pencil: it is the finger's to work. */
const PART_ART = {
  /** A tin rocket strapped along the back, nose up. Drawn round the middle of its tube. */
  rocket(p: Pencil): void {
    p.take('orange')
    const tube = [-14, -44, -13, -58, 0, -76, 13, -58, 14, -44, 14, 40, -14, 40]
    p.shape(tube, 2.4, 0.95, 0.5, true).hatch([-14, -44, 14, -44, 14, 40, -14, 40], 0.1, 7, 1.2, 0.5, false, true)
    p.line(stroke(-14, -44, 14, -44), 1.8, 0.9)
    const left = [-14, 12, -30, 44, -14, 38], right = [14, 12, 30, 44, 14, 38]
    p.shape(left, 2, 0.95, 0.4, true).shape(right, 2, 0.95, 0.4, true)
    p.shape([-9, 40, -12, 52, 12, 52, 9, 40], 2, 0.95, 0.3, true)
    p.take('graphite')
    // A round window, and the one strap that holds it on, which goes round at a slant and has its buckle to one side.
    p.shape(p.round(0, -22, 7, 7, 0, 0.02, 12), 1.6, 0.9)
    p.line(stroke(-15, 5, 15, 17), 3, 0.85)
    p.shape([0, 5.5, 9.5, 9, 7, 17.5, -2.5, 14], 1.4, 0.9, 0.3, true)
  },
  /** One wing of canvas on a frame of sticks, drawn from its root backwards. */
  wings(p: Pencil): void {
    p.take('orange')
    const sail = [0, -6, -40, -30, -84, -40, -124, -36, -118, -20, -96, -6, -60, 6, -24, 12, 0, 10]
    p.shape(sail, 2.4, 0.95, 0.6).hatch(sail, 0.3, 8, 1.1, 0.4)
    p.take('graphite')
    for (const [x0, y0, x1, y1] of [[-30, -22, -22, 10], [-62, -34, -56, 4], [-92, -38, -90, -8]]) p.line(stroke(x0, y0, x1, y1, 1), 1.5, 0.75)
    p.line([0, -5, -42, -29, -86, -39, -123, -35], 2.2, 0.85)
  },
  /** The umbrella shut: its stick, and the cloth furled round it. Drawn from the hand up. */
  umbrellaShut(p: Pencil): void {
    p.take('graphite')
    p.line(stroke(0, 6, 0, -112), 2.4, 0.9)
    p.shape(p.round(0, 9, 4.5, 4.5, 0, 0.02, 10), 1.6, 0.9)
    p.take('orange')
    const furled = [0, -108, -8, -76, -10, -40, -6, -22, 6, -22, 10, -40, 8, -76]
    p.shape(furled, 2.2, 0.95, 0.5).hatch(furled, 1.3, 5, 1.1, 0.5)
    p.take('graphite').line(stroke(-10, -34, 10, -32), 2, 0.85)
  },
  /** The umbrella open: the stick, and the cloth as a dome with a scalloped edge. Drawn from the hand up. */
  umbrellaOpen(p: Pencil): void {
    p.take('graphite')
    p.line(stroke(0, 6, 0, -104), 2.4, 0.9)
    p.shape(p.round(0, 9, 4.5, 4.5, 0, 0.02, 10), 1.6, 0.9)
    p.take('orange')
    const cloth = [-78, -84, -70, -112, -44, -134, 0, -144, 44, -134, 70, -112, 78, -84, 58, -92, 39, -84, 20, -92, 0, -84, -20, -92, -39, -84, -58, -92]
    p.shape(cloth, 2.4, 0.95, 0.6).hatch(cloth, 0.9, 8, 1.1, 0.42)
    p.take('graphite')
    for (const x of [-39, 0, 39]) p.line([x, -86, x * 0.5, -124, 0, -143], 1.2, 0.6)
    p.shape(p.round(0, -146, 3.4, 3.4, 0, 0.02, 8), 1.4, 0.9)
  },
  /** The umbrella blown inside out: the cloth stands up from the top of the stick like a cup. Drawn from the hand up. */
  umbrellaFlipped(p: Pencil): void {
    p.take('graphite')
    p.line(stroke(0, 6, 0, -104), 2.4, 0.9)
    p.shape(p.round(0, 9, 4.5, 4.5, 0, 0.02, 10), 1.6, 0.9)
    p.take('orange')
    const cloth = [0, -104, -40, -116, -66, -138, -76, -166, -56, -156, -38, -164, -19, -155, 0, -163, 19, -155, 38, -164, 56, -156, 76, -166, 66, -138, 40, -116]
    p.shape(cloth, 2.4, 0.95, 0.6).hatch(cloth, 0.9, 8, 1.1, 0.42)
    p.take('graphite')
    for (const x of [-38, 0, 38]) p.line([x, -160, x * 0.5, -126, 0, -105], 1.2, 0.6)
  },
  /** A toy balloon on a string, drawn from its knot on the scarf up. */
  balloon(p: Pencil): void {
    p.take('graphite').line([0, 0, 3, -40, -2, -80, 0, -104], 1.4, 0.8)
    p.take('orange')
    const skin = p.round(0, -150, 42, 48, 0, 0.012, 24)
    p.shape(skin, 2.4, 0.95, 0.5)
    p.shape([-5, -102, 0, -96, 5, -102, 0, -106], 1.6, 0.9, 0.2, true)
    p.hatch(p.round(14, -142, 20, 34, -0.2), 1.0, 6, 1.1, 0.4)
    p.take('graphite').line([-22, -170, -14, -180, -4, -184], 1.6, 0.6)
  },
  /** One spring foot: a coil of four turns on a small plate. Drawn from the foot down. */
  springs(p: Pencil): void {
    p.take('orange')
    for (let turn = 0; turn < 4; turn++) p.line(p.round(0, 3 + turn * 5.6, 12, 4.2, 0.12, 0.02, 12), 2, 0.95, true, 0.3)
    p.take('graphite').line(stroke(-14, 25, 14, 25), 3, 0.9)
  },
  /** The rod: a cane from the back over the head, and its line. Drawn from where it is tied on. */
  rod(p: Pencil): void {
    p.take('graphite')
    p.line([0, 0, 18, -52, 70, -80, 140, -70], 2.4, 0.9)
    p.line(stroke(140, -70, 140, -40), 1, 0.8)
    p.line(stroke(-4, 2, 5, -6), 3.4, 0.85)
  },
  /** The fish, hanging by its mouth from the line. Drawn from the line's end down. */
  fish(p: Pencil): void {
    p.take('orange')
    const body = [0, 0, 10, 10, 12, 26, 6, 40, 0, 46, -6, 40, -12, 26, -10, 10]
    p.shape(body, 2.2, 0.95, 0.5).hatch([0, 14, 11, 20, 8, 38, 0, 44, -8, 38, -11, 20], 0.5, 5, 1, 0.45)
    const tail = [0, 44, 12, 60, 0, 55, -12, 60]
    p.shape(tail, 2, 0.95, 0.4, true)
    p.take('graphite').dot(4, 10, 2.2).line([-9, 16, 0, 20, 9, 16], 1.1, 0.6)
  },
  /** The fish frozen into a block of ice. */
  frozen(p: Pencil): void {
    PART_ART.fish(p)
    p.take('graphite')
    const block = [-20, -6, 18, -8, 22, 62, -18, 64]
    p.line(block, 2.4, 0.9, true, 0.6, true)
    p.hatch(block, 0.8, 9, 1, 0.3, false, true)
    p.line(stroke(-12, 2, -4, -2), 1.4, 0.7).line(stroke(-14, 12, -10, 9), 1.2, 0.6)
  },
} as const

/** Paints `paint` at (`x`, `y`) of the pencil's canvas, `size` times as large, with its own hand. */
function inset(kit: Kit, p: Pencil, x: number, y: number, size: number, seed: number, paint: (p: Pencil) => void): void {
  const ctx = p.ctx
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size, size)
  paint(new Pencil(ctx, kit.leads, kit.k * size, seed, size ** -0.7))
  ctx.restore()
}

/** Each part lying in its place in the kit: where its drawing is put in the compartment, and how large. */
const IN_KIT: Record<Part, { paint: (p: Pencil) => void; dx: number; dy: number; size: number }> = {
  rocket: { paint: PART_ART.rocket, dx: 0, dy: 8, size: 0.48 },
  wings: { paint: PART_ART.wings, dx: 29, dy: 9, size: 0.47 },
  umbrella: { paint: PART_ART.umbrellaOpen, dx: 0, dy: 28, size: 0.38 },
  balloon: { paint: PART_ART.balloon, dx: 0, dy: 31, size: 0.31 },
  springs: { paint: (p) => { PART_ART.springs(p); p.ctx.translate(34, 0); PART_ART.springs(p) }, dx: -15, dy: -14, size: 0.9 },
  fish: { paint: PART_ART.fish, dx: 0, dy: -27, size: 0.9 },
}

/** Every figure, drawn at `kit.k` pixels to a unit. */
export function drawFigures(kit: Kit) {
  const Z = ZOOM
  const pilot = figure(kit, -40, -46, 50, 44, 101, (p) => {
    const body = PILOT_BODY
    p.shape(body, 2.4, 0.95)
    // The coat: the darkest tone on the page.
    p.hatch(body, 0.9, 3, 1.3, 0.8, true)
    const belly = p.round(8, 13, 20, 23, 0.1, 0.03)
    p.paper(belly).line(belly, 1.3, 0.55, true)
    p.hatch(p.round(14, 26, 10, 8), 0.2, 4, 0.9, 0.3)
    const face = p.round(12, -21, 17, 13, 0, 0.03)
    p.paper(face).line(face, 1.3, 0.55, true)
    // Flying goggles, a size too big.
    p.line([-27, -17, -14, -26, -2, -27], 3.2, 0.95)
    p.shape(p.round(4, -22, 8.5, 8.5, 0, 0.02, 14), 2.2, 0.95)
    p.shape(p.round(21, -21, 8, 8, 0, 0.02, 14), 2.2, 0.95)
    p.line(stroke(12, -23, 13.5, -22.5), 2.2)
    p.take('orange')
    const beak = [27, -15, 45, -10.5, 28, -8]
    p.shape(beak, 2, 0.95, 0.3, true).hatch(beak, 0.25, 2.4, 1.2, 0.85, false, true)
    const band = [-28, -9, -10, -3, 10, -2, 27, -6, 28, 0, 10, 5, -10, 4, -29, -2]
    p.shape(band, 1.8, 0.95, 0.4).hatch(band, 1.2, 3, 1.2, 0.8)
  }, Z.pilot)
  const beak = figure(kit, -3, -4, 20, 8, 102, (p) => {
    p.take('orange')
    const lower = [0, -1, 15, 0.5, 0, 4.5]
    p.shape(lower, 1.8, 0.95, 0.3, true).hatch(lower, -0.2, 2.4, 1.1, 0.8, false, true)
  }, Z.pilot)
  const flipper = figure(kit, -10, -8, 14, 40, 103, (p) => {
    const leaf = [0, -4, 7, 3, 9, 18, 5, 31, 0, 35, -4, 29, -6, 14, -5, 2]
    p.shape(leaf, 2.2, 0.95).hatch(leaf, 0.9, 3, 1.3, 0.8, true)
  }, Z.pilot)
  const foot = figure(kit, -6, -5, 22, 12, 104, (p) => {
    p.take('orange')
    const sole = FOOT_SOLE
    p.shape(sole, 1.9, 0.95, 0.4).hatch(sole, 0.5, 3, 1.1, 0.7)
    p.line(stroke(8, 1, 15, 5), 1.1, 0.8).line(stroke(5, 3, 10, 7), 1.1, 0.8)
  }, Z.pilot)
  const scarf = figure(kit, -4, -9, 42, 10, 105, (p) => {
    p.take('orange')
    const tail = [0, -4, 16, -6, 30, -5, 37, -7, 34, -1, 39, 4, 30, 5, 16, 5, 0, 4]
    p.shape(tail, 1.8, 0.95, 0.4).hatch(tail, 1.3, 3.4, 1.2, 0.8)
  }, Z.pilot)
  const pouch = figure(kit, -37, -3, 37, 46, 106, (p) => {
    p.take('orange')
    const cup = [-32, 3, -28, 22, -15, 37, 0, 41, 15, 37, 28, 22, 32, 3, 23, 15, 0, 21, -23, 15]
    p.shape(cup, 2.2, 0.95, 0.5).hatch(cup, 0.6, 3.2, 1.2, 0.75, true)
    p.take('graphite')
    // The eyelets the bands are tied through.
    p.shape(p.round(-29, 8, 3.2, 3.2, 0, 0.02, 8), 1.4).shape(p.round(29, 8, 3.2, 3.2, 0, 0.02, 8), 1.4)
  }, Z.pilot)

  // The catapult stands a step further back than the flight: it is the plainest thing on the ice, in a paler pencil.
  // Its two arms stand wide, either side of the penguin in the pouch between them.
  const fork = figure(kit, -102, -240, 102, 6, 107, (p) => {
    const wood = [-8, 0, -8, -52, -9, -96, -44, -150, -92, -224, -80, -232, -70, -218, -30, -160, 0, -116, 30, -160, 70, -218, 80, -232, 92, -224, 44, -150, 9, -96, 8, -52, 8, 0]
    p.shape(wood, 2.4, 0.95, 0.5, true)
    p.hatch(wood, 1.52, 6, 1, 0.4, false, true)
    // One binding of cord round the post, wound at a slant.
    const binding = [-11, -106, 11, -97, 11, -87, -11, -96]
    p.shape(binding, 1.8, 0.9, 0.4, true).hatch(binding, 1.1, 2.6, 1, 0.6, false, true)
    // The bands are tied round the tip of each arm.
    for (const side of [-1, 1]) for (const d of [0, 6]) p.line(stroke(side * (88 - d * 0.6), -226 + d * 1.2 - 6, side * (76 - d * 0.6), -218 + d * 1.2 - 6), 1.8, 0.9)
  }, Z.fork, 0.52)
  const sledge = figure(kit, -22, -60, 140, 8, 108, (p) => {
    // Two struts from the deck up to the post, the deck, and the runner curling up in front.
    p.line(stroke(18, -12, 45, -52), 3, 0.9).line(stroke(88, -12, 59, -52), 3, 0.9)
    const deck = [0, -13, 106, -13, 106, -6, 0, -6]
    p.shape(deck, 2.2, 0.95, 0.5, true)
    p.line(stroke(12, -6, 12, -1), 2.4).line(stroke(94, -6, 94, -1), 2.4)
    p.line([-12, -18, -8, -5, 4, -0.5, 60, -0.5, 104, -0.5, 120, -6, 128, -20], 3, 0.95)
  }, Z.fork, 0.52)

  // The kit's lid, level with the ice: two planks and their battens.
  const lid = figure(kit, -4, -12, CRATE.x1 - CRATE.x0 + 4, 10, 109, (p) => {
    const w = CRATE.x1 - CRATE.x0
    const plank = [0, -7, w, -7, w, 5, 0, 5]
    p.shape(plank, 2.4, 0.95, 0.5, true).hatch(plank, 0.04, 4, 0.9, 0.4, false, true)
    for (const x of [w * 0.2, w * 0.5, w * 0.8]) p.shape([x - 7, -10, x + 7, -10, x + 7, 6, x - 7, 6], 1.6, 0.9, 0.4, true)
  })
  /** An empty place in the kit: bare wood, with the shadow of what lay there. */
  const empty = figure(kit, -2, -2, SLOT.w + 2, SLOT.h + 2, 110, (p) => {
    const hole = [1, 1, SLOT.w - 1, 1, SLOT.w - 1, SLOT.h - 1, 1, SLOT.h - 1]
    p.paper(hole, true).hatch(hole, 0.75, 9, 0.9, 0.16, false, true)
  })

  const nearSeal = figure(kit, -62, -46, 62, 6, 111, (p) => {
    const sink = (SEALS[0].y - ICE_Y) / Z.nearSeal
    const body = mound(50, sink)
    p.shape(body, 2.6, 0.95, 0.5)
    p.hatch(p.round(22, -6, 30, 18, -0.4), 0.5, 5, 1, 0.32)
    // Speckles on its back, the whites of two eyes, a snout, and the belly's crease.
    for (const [x, y] of [[20, -30], [30, -24], [12, -33], [36, -14], [26, -17]]) p.dot(x, y, 1.6, 0.6)
    p.shape(p.round(-28, -21, 8.5, 8.5, 0, 0.02, 12), 1.6).shape(p.round(-11, -27, 8.5, 8.5, 0, 0.02, 12), 1.6)
    p.dot(-39, -17, 3.2)
    p.line([-43, -10, -36, -5, -26, -6], 1.6, 0.9)
    p.line([-8, -4, 10, -8, 34, -3], 1.1, 0.5)
    // Its tail, which lies on the ice behind it.
    const tail = [44, -6, 56, -12, 60, -4, 52, 1, 44, 1]
    p.shape(tail, 1.8, 0.9).hatch(tail, 0.4, 3, 0.9, 0.4)
  }, Z.nearSeal)
  const ball = figure(kit, -14, -14, 14, 14, 112, (p) => {
    const round = p.round(0, 0, 11, 11, 0, 0.02, 14)
    p.shape(round, 2, 0.95)
    // Two patches of another stuff, sewn on where the seal has worn it: neither is a stripe, a band or a cross.
    p.hatch([-9, -3, -4, -8, 2, -7, 1, -1, -5, 2], 0.7, 2.2, 0.9, 0.6)
    p.hatch([3, 3, 8, 1, 9, 6, 4, 9], 2.2, 2.2, 0.9, 0.5)
  }, Z.nearSeal)
  const sealFlipper = figure(kit, -6, -22, 8, 4, 113, (p) => {
    const leaf = [0, 1, -4, -8, -2, -17, 2, -20, 5, -12, 4, -2]
    p.shape(leaf, 1.9, 0.95).hatch(leaf, 0.6, 3, 1, 0.5)
  }, Z.nearSeal)
  const farSeal = figure(kit, -56, -40, 56, 6, 114, (p) => {
    const sink = (SEALS[1].y - ICE_Y) / Z.farSeal
    const body = mound(44, sink)
    p.shape(body, 2.6, 0.95, 0.5)
    p.hatch(p.round(-18, -6, 28, 16, 0.4), 2.4, 5, 1, 0.32)
    for (const [x, y] of [[-22, -24], [-10, -29], [-30, -14], [-16, -18]]) p.dot(x, y, 1.6, 0.6)
    // Asleep: a nose, and a tail on the ice. Its eyes and its mouth are the view's.
    p.dot(38, -10, 3)
    const tail = [-40, -6, -51, -11, -54, -3, -47, 1, -40, 1]
    p.shape(tail, 1.8, 0.9).hatch(tail, 2.6, 3, 0.9, 0.4)
  }, Z.farSeal)

  // The igloo: a ball of snow blocks three parts out of the ice, with a doorway the chick fills.
  const igloo = figure(kit, -70, -106, 70, 6, 115, (p) => {
    const r = IGLOO.r, up = ICE_Y - IGLOO.y
    const half = Math.sqrt(r * r - up * up)
    const body: number[] = []
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI - Math.asin(up / r) + ((Math.PI + 2 * Math.asin(up / r)) * i) / 24
      body.push(Math.cos(a) * r, -up + Math.sin(a) * r)
    }
    body.push(half * 0.8, 3, -half * 0.8, 3)
    p.shape(body, 2.6, 0.95, 0.5)
    // Courses of snow blocks, with the joints staggered.
    const courses = [-22, -44, -64, -82]
    const widthAt = (y: number): number => Math.sqrt(Math.max(0, r * r - (y + up) * (y + up))) - 3
    for (const y of courses) p.line([-widthAt(y), y, -widthAt(y) * 0.5, y - 3, 0, y - 4, widthAt(y) * 0.5, y - 3, widthAt(y), y], 1.2, 0.6)
    const rows = [0, ...courses]
    for (let row = 0; row < rows.length - 1; row++) {
      const y0 = rows[row], y1 = rows[row + 1]
      const w = Math.min(widthAt(y0), widthAt(y1)) - 4
      for (let x = -w + (row % 2 ? 14 : 0); x < w; x += 28) p.line(stroke(x, y0 - 3, x + 1, y1 - 2), 1, 0.5)
    }
    p.hatch(p.round(34, -34, 22, 34, -0.3), 0.7, 5, 1, 0.3)
    // The doorway, dark inside.
    const dx = CHICK.x - IGLOO.x
    const door = [dx - 34, 2, dx - 34, -50, dx - 24, -72, dx, -82, dx + 24, -72, dx + 34, -50, dx + 34, 2]
    p.paper(door).hatch(door, 0.8, 3.4, 1.3, 0.85, true).line(door, 2.4, 0.95, false, 0.5)
  })
  const chick = figure(kit, -24, -56, 24, 4, 116, (p) => {
    // A ball of down on two feet, with a tin plate held out in front.
    p.line(stroke(-6, -2, -9, 1), 2, 0.9).line(stroke(6, -2, 9, 1), 2, 0.9)
    const down = p.round(0, -18, 17, 17, 0, 0.07, 22)
    p.shape(down, 1.8, 0.9, 1.1).hatch(down, 1.1, 3.6, 1, 0.4)
    const head = p.round(0, -40, 12.5, 11.5, 0, 0.04, 16)
    p.shape(head, 2, 0.95).hatch(head, 0.9, 2.8, 1.2, 0.8, true)
    const mask = p.round(0.5, -38.5, 9.5, 7.5, 0, 0.03, 14)
    p.paper(mask).line(mask, 1, 0.5, true)
    p.shape([-2.5, -36.5, 1, -33, 4.5, -36.5], 1.3, 0.95, 0.2, true)
    // Its two flippers, which hold the plate: the plate is a figure of its own, since the chick can turn it over.
    p.line(stroke(-15, -18, -12, -12, -1), 1.8, 0.9).line(stroke(15, -18, 12, -12, 1), 1.8, 0.9)
  }, Z.chick)
  /** The chick's tin plate, seen from a little above: its rim, and the well in the middle. Drawn round its middle. */
  const plate = figure(kit, -16, -6, 16, 6, 155, (p) => {
    p.shape(p.round(0, 0, 14, 4.2, 0, 0.02, 14), 1.7, 0.95)
    p.line(p.round(0, 0, 9, 2.2, 0, 0.02, 12), 0.9, 0.5, true)
  }, Z.chick)
  /** The same plate turned over: its underside, hatched dull, with the small foot it stands on. */
  const plateUnder = figure(kit, -16, -6, 16, 6, 156, (p) => {
    const under = p.round(0, 0, 14, 4.2, 0, 0.02, 14)
    p.shape(under, 1.7, 0.95).hatch(under, 0.5, 2.4, 0.9, 0.5)
    p.shape(p.round(0, -0.6, 5, 1.6, 0, 0.02, 10), 1.1, 0.9)
  }, Z.chick)
  // The drift: soft, with no hard edge. It is taller than the igloo it has blown up against.
  const drift = figure(kit, -58, -100, 58, 6, 117, (p) => {
    const heap: number[] = []
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI + (Math.PI * i) / 16
      heap.push(Math.cos(a) * DRIFT.rx, Math.sin(a) * DRIFT.ry)
    }
    heap.push(DRIFT.rx * 0.8, 3, -DRIFT.rx * 0.8, 3)
    p.paper(heap)
    const edge = heap.slice(0, -4)
    for (let pass = 0; pass < 3; pass++) p.line(edge, 1.3, 0.5, false, 2.4)
    // Soft snow: curls where the wind has shaped it, a few specks, and shade on the side away from the moon.
    for (const [x, y, w] of [[-18, -62, 16], [6, -76, 14], [-30, -34, 18], [4, -42, 20], [-10, -16, 22], [22, -20, 14]]) p.line([x - w, y + 3, x - w * 0.4, y - 3, x + w * 0.3, y - 2, x + w, y + 4], 1.1, 0.4, false, 0.8)
    for (const [x, y] of [[-26, -50], [-4, -58], [12, -30], [-20, -8], [30, -36], [-2, -84]]) p.dot(x, y, 1.1, 0.5)
    p.hatch([8, -90, 36, -56, 50, 0, 22, 0, 26, -40], 0.9, 6, 1, 0.24)
  })
  const walrus = figure(kit, -46, -100, 46, 2, 118, (p) => {
    // A great slumped body with a small head sunk into it.
    const body = [0, -96, 16, -93, 28, -82, 34, -64, 40, -40, 43, -16, 40, 0, 0, 1, -40, 0, -43, -16, -40, -40, -34, -64, -28, -82, -16, -93]
    p.shape(body, 2.8, 0.95, 0.6)
    p.hatch([24, -84, 34, -64, 40, -40, 43, -16, 40, 0, 20, 0, 26, -30, 22, -60], 1.0, 4.6, 1, 0.4)
    for (const y of [-24, -15, -7]) p.line([-30, y, -12, y + 4, 12, y + 4, 30, y], 1.1, 0.5)
    // Small eyes close together, and the nose.
    p.shape(p.round(-11, -62, 5.5, 5.5, 0, 0.02, 10), 1.5).shape(p.round(11, -62, 5.5, 5.5, 0, 0.02, 10), 1.5)
    p.dot(0, -48, 3.4)
    // A napkin tied round its neck: it is waiting for its dinner.
    const napkin = [-17, -36, 0, -40, 17, -36, 13, -22, 0, -10, -13, -22]
    p.shape(napkin, 1.5, 0.9, 0.4, true).hatch(napkin, 0.78, 5, 0.8, 0.3, false, true)
    // Two flippers folded on the belly, round an open tin.
    const left = [-34, -12, -14, -22, -2, -16, -12, -6, -30, -2]
    const right = [34, -12, 14, -22, 2, -16, 12, -6, 30, -2]
    p.shape(left, 1.9, 0.95).hatch(left, 0.4, 3.4, 1, 0.5)
    p.shape(right, 1.9, 0.95).hatch(right, 2.7, 3.4, 1, 0.5)
    const tin = [-11, -12, 11, -12, 10, -1, -10, -1]
    p.shape(tin, 1.6, 0.9, 0.3, true).line(p.round(0, -12, 11, 3, 0, 0.02, 12), 1.3, 0.9, true)
    p.line([9, -13, 15, -19, 19, -16], 1.3, 0.8)
  }, Z.walrus)
  const moustache = figure(kit, -30, -12, 30, 44, 119, (p) => {
    // The tusks hang from under two pads of bristle.
    for (const side of [-1, 1]) {
      const tusk = [side * 6, 2, side * 13, 4, side * 14, 22, side * 11, 38, side * 8, 22]
      p.shape(tusk, 1.8, 0.95, 0.4)
    }
    for (const side of [-1, 1]) {
      const pad = p.round(side * 11, 0, 13, 9, side * 0.2, 0.04, 14)
      p.shape(pad, 2, 0.95)
      for (let i = 0; i < 7; i++) p.dot(side * (5 + (i % 4) * 4), -3 + Math.floor(i / 4) * 5, 1, 0.8)
      for (const dy of [-4, 0, 4]) p.line(stroke(side * 20, dy, side * 28, dy * 1.8 + 3, 1), 0.9, 0.7)
    }
  }, Z.walrus)

  // The weather balloon, drawn round its middle, with its ropes down to the basket.
  const balloon = figure(kit, -BALLOON.r - 6, -BALLOON.r - 6, BALLOON.r + 6, BASKET.y0 - BALLOON.y + 6, 120, (p) => {
    const r = BALLOON.r, down = BASKET.y0 - BALLOON.y, w = (BASKET.x1 - BASKET.x0) / 2
    for (const side of [-1, 1]) p.line(stroke(side * r * 0.62, r * 0.76, side * (w - 3), down, side * 3), 1.8, 0.9)
    for (const side of [-1, 1]) p.line(stroke(side * r * 0.2, r * 0.96, side * (w * 0.4), down, 0), 1.2, 0.7)
    const skin = p.round(0, 0, r, r, 0, 0.006, 36)
    p.shape(skin, 2.8, 0.95, 0.5)
    // The seams, a patch, and the shade on one side.
    for (const rx of [0.34, 0.68]) {
      const left: number[] = [], right: number[] = []
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 10
        left.push(-Math.cos(a) * r * rx, Math.sin(a) * (r - 2))
        right.push(Math.cos(a) * r * rx, Math.sin(a) * (r - 2))
      }
      p.line(left, 1.1, 0.5).line(right, 1.1, 0.5)
    }
    const shade: number[] = []
    for (let i = 0; i <= 12; i++) {
      const a = -1.1 + (2.4 * i) / 12
      shade.push(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3))
    }
    for (let i = 12; i >= 0; i--) {
      const a = -1.1 + (2.4 * i) / 12
      shade.push(Math.cos(a) * (r - 3) - 30 * Math.sin((i / 12) * Math.PI), Math.sin(a) * (r - 3))
    }
    p.hatch(shade, 0.9, 5, 1.1, 0.4)
    // A patch of another cloth, with no outline of its own: it is held on by a row of stitches round its edge, no two the same length.
    const patch = p.round(-42, -20, 16, 13, 0.3, 0.09, 9)
    p.paper(patch).hatch(patch, 0.3, 4.5, 0.9, 0.45)
    for (let i = 0; i < patch.length; i += 2) {
      const j = (i + 2) % patch.length
      const from = 0.12 + 0.05 * ((i * 7) % 5), to = 0.62 + 0.07 * ((i * 3) % 5)
      p.line(stroke(patch[i] + (patch[j] - patch[i]) * from, patch[i + 1] + (patch[j + 1] - patch[i + 1]) * from, patch[i] + (patch[j] - patch[i]) * to, patch[i + 1] + (patch[j + 1] - patch[i + 1]) * to), 1.5, 0.8)
    }
    // A band round its neck, where the ropes are made fast.
    p.line([-r * 0.6, r * 0.78, 0, r * 0.99, r * 0.6, r * 0.78], 2.2, 0.8)
  })
  const basket = figure(kit, -56, -5, 56, BASKET.y1 - BASKET.y0 + 6, 121, (p) => {
    const w = (BASKET.x1 - BASKET.x0) / 2, h = BASKET.y1 - BASKET.y0
    const box = [-w, 0, w, 0, w - 3, h, -w + 3, h]
    p.shape(box, 2.6, 0.95, 0.5, true).hatch(box, 0.6, 6, 1.1, 0.5, true, true)
    p.line(stroke(-w - 2, 1, w + 2, 1), 4, 0.95)
    p.line(stroke(-w, h * 0.5, w, h * 0.5), 1.8, 0.8)
    // A sandbag on its side, and a dial.
    const bag = [w - 4, h * 0.3, w + 6, h * 0.34, w + 5, h * 0.72, w - 6, h * 0.7]
    p.shape(bag, 1.6, 0.9, 0.5).hatch(bag, 1.2, 4, 0.9, 0.4)
    p.shape(p.round(-w * 0.45, h * 0.26, 9, 9, 0, 0.02, 12), 1.5, 0.9).line(stroke(-w * 0.45, h * 0.26, -w * 0.45 + 5, h * 0.26 - 5), 1.2, 0.8)
  })
  const puffin = figure(kit, -18, -32, 32, 16, 122, (p) => {
    // The chest, which stays behind the rim, and a head that is mostly beak.
    const chest = [-11, 14, -11, 0, -7, -6, 7, -6, 11, 0, 11, 14]
    p.shape(chest, 2, 0.95).hatch([-11, 14, -11, 0, -7, -6, 0, -6, -2, 14], 0.9, 2.8, 1.2, 0.8, true)
    const head = p.round(0, -13, 12, 11.5, 0, 0.03, 16)
    p.shape(head, 2, 0.95)
    p.hatch([-12, -12, -10, -21, 0, -25, 9, -22, 0, -20, -5, -13, -6, -3, -11, -5], 0.9, 2.6, 1.2, 0.8, true)
    const bill = [8, -20, 17, -21, 29, -11, 17, -4, 8, -5]
    p.shape(bill, 1.9, 0.95, 0.4)
    p.line(stroke(13, -20, 13, -5), 1.2, 0.8).line(stroke(18, -20, 18, -5), 1.2, 0.8)
    p.hatch([13, -20, 18, -20, 18, -5, 13, -5], 0.3, 2, 0.9, 0.7, false, true)
    p.shape(p.round(3, -14, 4.6, 4.6, 0, 0.02, 10), 1.3)
  }, Z.puffin)
  const glass = figure(kit, -2, -7, 36, 7, 123, (p) => {
    const tube = [0, -3, 12, -3.4, 12, -4.6, 23, -5, 23, -5.8, 32, -6, 32, 6, 23, 5.8, 23, 5, 12, 4.6, 12, 3.4, 0, 3]
    p.shape(tube, 1.7, 0.95, 0.3, true).hatch([23, -5.8, 32, -6, 32, 6, 23, 5.8], 1.57, 2.2, 0.9, 0.6, false, true)
    p.line(stroke(12, -4, 12, 4), 1.2, 0.8)
  }, Z.puffin)
  /** The puffin's landing net: a hoop of mesh on a cane, held ready. Drawn from the hand. */
  const net = figure(kit, -10, -74, 34, 8, 124, (p) => {
    p.line(stroke(0, 4, 8, -40), 2.2, 0.9)
    const hoop = p.round(13, -54, 15, 17, 0.2, 0.03, 16)
    p.shape(hoop, 2, 0.95).hatch(hoop, 0.5, 6, 0.8, 0.5, true)
  })

  /** One bank of the thin cloud: the puffs' outer edge, paper inside, and shade under each puff. */
  const bank = (from: number, to: number, seed: number): Sprite => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (let i = from; i < to; i++) {
      const puff = CLOUD[i]
      x0 = Math.min(x0, puff.x - puff.r); x1 = Math.max(x1, puff.x + puff.r)
      y0 = Math.min(y0, puff.y - puff.r); y1 = Math.max(y1, puff.y + puff.r)
    }
    return figure(kit, x0 - 8, y0 - 8, x1 + 8, y1 + 8, seed, (p) => {
      for (let i = from; i < to; i++) p.line(p.round(CLOUD[i].x, CLOUD[i].y, CLOUD[i].r, CLOUD[i].r, 0, 0.012, 26), 2.2, 0.8, true, 0.6)
      for (let i = from; i < to; i++) p.paper(p.round(CLOUD[i].x, CLOUD[i].y, CLOUD[i].r - 1.8, CLOUD[i].r - 1.8, 0, 0, 26))
      // Shade under each puff, and a few strokes of damp along the bank.
      for (let i = from; i < to; i++) {
        const puff = CLOUD[i]
        p.hatch(p.round(puff.x + puff.r * 0.12, puff.y + puff.r * 0.42, puff.r * 0.78, puff.r * 0.5), 0.12, 6, 1, 0.34)
        p.line([puff.x - puff.r * 0.5, puff.y - puff.r * 0.3, puff.x - puff.r * 0.1, puff.y - puff.r * 0.62, puff.x + puff.r * 0.36, puff.y - puff.r * 0.5], 1.2, 0.4)
      }
    })
  }
  const cloud = bank(0, FIRST_BANK, 125)
  const cloudLeft = bank(FIRST_BANK, CLOUD.length, 126)
  /** The hole a rocket leaves in the cloud: clear sky, torn open, with a singed rim. Its edge is ragged like the cloud's own, so that it is a tear and never a ring. */
  const hole = figure(kit, -40, -40, 40, 40, 127, (p) => {
    const rim: number[] = []
    for (let i = 0; i < 42; i++) {
      const a = (i / 42) * Math.PI * 2
      const r = 35 - 10 * Math.abs(Math.sin(a * 3.5 + 0.4))
      rim.push(Math.cos(a) * r * 1.05, Math.sin(a) * r * 0.92)
    }
    p.paper(rim).hatch(rim, 0.5, 10, 1, 0.2)
    for (let pass = 0; pass < 2; pass++) p.line(rim, 1.6, 0.7, true, 2)
  })

  /** A curtain of the lights in the sky: short strokes hung from a wavy line. Drawn from its left end. */
  const curtain = (far: number, wave: number, seed: number): Sprite => figure(kit, -10, -wave - 8, far + 10, wave + 96, seed, (p) => {
    const top: number[] = []
    for (let x = 0; x <= far; x += 6) {
      const y = Math.sin(x / 46 + seed) * wave
      if (x % 12 === 0) top.push(x, y)
      // Each curtain is fullest in its middle and thins out to both ends.
      const full = Math.sin((Math.PI * x) / far)
      const drop = (18 + 60 * full) * (0.7 + 0.3 * Math.sin(x / 17 + seed))
      p.line(stroke(x, y + 2, x - 4, y + drop), 1.1, 0.2 + 0.3 * full, false, 0.3)
    }
    p.line(top, 1.3, 0.5)
  })
  const lights = [curtain(330, 16, 128), curtain(280, 12, 129), curtain(240, 14, 130)]

  const puff = figure(kit, -26, -34, 26, 4, 131, (p) => {
    const steam = [-6, 0, -16, -6, -20, -18, -10, -26, 0, -30, 12, -26, 20, -17, 15, -6, 6, 0]
    p.shape(steam, 1.6, 0.7, 1).line([-8, -14, -2, -18, 4, -13], 1, 0.5)
  }, 1.5)
  /**
   * Where the pouch was last let go: the pouch itself, traced there in pale pencil, cup and eyelets, at the lean
   * it had. It is a tracing of a thing on the page and never a bare ring.
   */
  const ring = figure(kit, -37, -3, 37, 46, 132, (p) => {
    const cup = [-32, 3, -28, 22, -15, 37, 0, 41, 15, 37, 28, 22, 32, 3, 23, 15, 0, 21, -23, 15]
    p.line(cup, 1.3, 0.55, true, 1.2)
    p.hatch(cup, 0.6, 6, 0.9, 0.25)
    p.dot(-29, 8, 1.6, 0.5).dot(29, 8, 1.6, 0.5)
  }, Z.pilot)
  const glow = figure(kit, -66, -70, 66, 70, 133, (p) => {
    p.take('orange')
    for (let i = 0; i < 3; i++) p.line(p.round(0, 0, 50 + i * 4, 55 + i * 4, i * 0.4, 0.05, 20), 2.4, 0.7, true, 1.2)
  }, Z.pilot)
  const hand = figure(kit, -30, -4, 32, 76, 134, (p) => {
    // A hand with one finger out, drawn as a mitten is drawn.
    const outline = [0, 0, 5, 2, 7, 12, 7, 27, 14, 25, 22, 29, 27, 40, 25, 56, 15, 68, -6, 68, -15, 58, -18, 44, -25, 34, -21, 27, -13, 31, -8, 36, -7, 12, -5, 2]
    p.shape(outline, 2.4, 0.95, 0.5)
    p.line(stroke(-8, 36, -6, 46), 1.2, 0.7).line([8, 30, 9, 38], 1.2, 0.7).line([15, 31, 16, 39], 1.2, 0.7)
    p.line(stroke(-5, 62, 15, 62, 1.5), 1.6, 0.8)
  }, Z.hand)

  // The parts, as they are bolted on.
  const parts = {
    rocket: figure(kit, -34, -80, 34, 56, 141, PART_ART.rocket),
    wings: figure(kit, -130, -46, 6, 18, 142, PART_ART.wings),
    umbrellaShut: figure(kit, -14, -116, 14, 16, 143, PART_ART.umbrellaShut),
    umbrellaOpen: figure(kit, -84, -152, 84, 16, 144, PART_ART.umbrellaOpen),
    umbrellaFlipped: figure(kit, -84, -172, 84, 16, 153, PART_ART.umbrellaFlipped),
    balloon: figure(kit, -48, -204, 48, 4, 145, PART_ART.balloon),
    springs: figure(kit, -18, -4, 18, 30, 146, PART_ART.springs),
    rod: figure(kit, -8, -88, 146, 8, 147, PART_ART.rod),
    fish: figure(kit, -16, -4, 16, 64, 148, PART_ART.fish),
    frozen: figure(kit, -26, -12, 28, 70, 149, PART_ART.frozen),
  }
  /** The flame: a plume in the orange pencil, drawn from the nozzle down. */
  const flame = figure(kit, -22, -4, 22, 70, 150, (p) => {
    p.take('orange')
    const plume = [-10, 0, -16, 18, -9, 34, -12, 46, 0, 64, 12, 46, 9, 34, 16, 18, 10, 0]
    p.line(plume, 2.2, 0.95, false, 0.8).hatch(plume, 1.45, 5, 1.2, 0.6)
    p.line([-4, 6, -5, 22, 0, 36, 5, 22, 4, 6], 1.6, 0.8)
  })
  /** The whale's tail: two flukes on a short stem, drawn from where it joins the body. It lies to the left of its root. */
  const fluke = figure(kit, -70, -40, 12, 44, 154, (p) => {
    const tail = [6, -12, 0, -11, -32, -27, -60, -31, -46, -1, -62, 35, -32, 29, 0, 11, 6, 12]
    p.shape(tail, 3, 0.95, 0.8)
    p.hatch([-30, -24, -56, -28, -44, -2, -58, 32, -32, 26, -14, 12, -14, -12], 0.2, 6, 1.1, 0.35)
    p.line([-4, 0, -30, -2], 1.2, 0.5)
  })
  /** The gull that lives in the cloud: all beak, and the beak is open. It faces right. */
  const gull = figure(kit, -40, -30, 46, 26, 151, (p) => {
    const body = [-34, 4, -16, -10, 6, -14, 22, -6, 20, 8, 2, 16, -18, 12]
    p.shape(body, 2.2, 0.95, 0.6).hatch([-30, 4, -12, 0, 8, 6, 2, 15, -18, 11], 0.3, 4, 1, 0.4)
    const wing = [-12, -6, -24, -26, -2, -18, 8, -8]
    p.shape(wing, 2, 0.95, 0.5).hatch(wing, 1.1, 4, 1, 0.5)
    p.shape([20, -6, 42, -14, 26, -1], 1.8, 0.95, 0.3, true).shape([20, 4, 40, 12, 24, -1], 1.8, 0.95, 0.3, true)
    p.shape(p.round(12, -6, 4.2, 4.2, 0, 0.02, 10), 1.3).dot(13, -6, 1.8)
  })
  /** A pencil shaving: a ruffled fan, as it comes off the sharpener. Drawn from where it sits on the head. */
  const shaving = figure(kit, -26, -34, 26, 6, 152, (p) => {
    const fan = [-20, 0, -24, -12, -16, -22, -8, -18, -2, -30, 6, -20, 14, -26, 20, -14, 24, -4, 12, 2, 0, -2, -10, 3]
    p.shape(fan, 1.6, 0.9, 0.6)
    for (const [x0, y0, x1, y1] of [[-10, 1, -16, -20], [0, -2, -2, -28], [10, 1, 14, -24]]) p.line(stroke(x0, y0, x1, y1, 1.5), 1, 0.6)
    p.take('orange').line([-24, -12, -16, -22, -8, -18, -2, -30, 6, -20, 14, -26, 20, -14, 24, -4], 2, 0.9)
  })

  const crumbs = {
    snow: figure(kit, -7, -7, 7, 7, 161, (p) => { p.shape(p.round(0, 0, 4.6, 4.6, 0, 0.18, 9), 1.3, 0.8) }),
    drop: figure(kit, -6, -8, 6, 7, 162, (p) => { p.shape([0, -6, 3.6, 1, 0, 5, -3.6, 1], 1.4, 0.85, 0.3) }),
    dot: figure(kit, -5, -5, 5, 5, 163, (p) => { p.dot(0, 0, 2.6, 0.9).line(stroke(-1.5, 1, 2, -1.5), 1.4, 0.8) }),
    smudge: figure(kit, -16, -12, 16, 12, 164, (p) => {
      p.paper(p.round(0, 0, 12, 8, 0.2, 0.1, 12))
      p.hatch(p.round(0, 0, 13, 8.5, 0.2, 0.1, 12), 0.25, 3.2, 1.6, 0.13)
    }),
    bubble: figure(kit, -6, -6, 6, 6, 165, (p) => { p.line(p.round(0, 0, 4, 4, 0, 0.05, 10), 1.2, 0.8, true, 0.3) }),
    /** Mist: a scatter of fine dots, no two the same size. */
    mist: figure(kit, -10, -8, 10, 8, 166, (p) => { for (const [x, y, r] of [[-7, 1, 1.5], [-3, -4, 1.1], [1, 2, 1.7], [5, -3, 1.2], [7, 3, 0.9], [-2, 5, 1], [3, -6, 0.8]]) p.dot(x, y, r, 0.55) }),
    /** A puff of steam: a loose round, gone over twice. */
    steam: figure(kit, -12, -12, 12, 12, 167, (p) => { for (let pass = 0; pass < 2; pass++) p.line(p.round(0, 0, 8, 7, pass, 0.12, 10), 1.2, 0.55, true, 1) }),
    /** Soot: a dark scribble. */
    soot: figure(kit, -10, -10, 10, 10, 168, (p) => { p.hatch(p.round(0, 0, 8, 7, 0, 0.2, 10), 0.7, 2.2, 1.6, 0.7, true) }),
  }
  return { pilot, beak, flipper, foot, scarf, pouch, fork, sledge, lid, empty, nearSeal, ball, sealFlipper, farSeal, igloo, chick, plate, plateUnder, drift, walrus, moustache, balloon, basket, puffin, glass, net, cloud, cloudLeft, hole, lights, puff, ring, glow, hand, parts, flame, gull, fluke, shaving, crumbs }
}

/** A five-pointed star as an outline: the only kind of star on the page, and no star is joined to another. */
function starPoints(x: number, y: number, r: number, turn: number): number[] {
  const points: number[] = []
  for (let i = 0; i < 10; i++) {
    const a = turn + (i * Math.PI) / 5, far = i % 2 ? r * 0.45 : r
    points.push(x + Math.sin(a) * far, y - Math.cos(a) * far)
  }
  return points
}

/** The underside of the shelf at `x`: deep where the kit is sunk into it, thin towards its edge. */
function underside(x: number): number {
  const deep = KIT.y1 + 26
  if (x <= KIT.x1 + 20) return deep
  if (x >= 540) return 716 - (12 * (x - 540)) / (SHELF_EDGE - 540)
  const along = (x - KIT.x1 - 20) / (540 - KIT.x1 - 20)
  return deep + (716 - deep) * (1 - (1 - along) * (1 - along))
}

/**
 * The page: the paper and everything on it that never moves, drawn across the whole surface, which reaches from
 * (`x0`, `y0`) to (`x1`, `y1`) in stage units. A surface of another shape than the stage shows more ice, more
 * sea and more sky, never a bare edge.
 */
export function drawPage(kit: Kit, x0: number, y0: number, x1: number, y1: number): Sprite {
  return figure(kit, x0, y0, x1, y1, 201, (p) => {
    const ctx = p.ctx
    ctx.fillStyle = PAPER
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
    const left = x0 - 20, right = x1 + 20, top = y0 - 20, bottom = y1 + 20

    // The sky: shaded all over, as a child shades a night sky with the side of the lead, and darker towards the top.
    p.hatch([left, top, right, top, right, ICE_Y, left, ICE_Y], 0.62, 8, 1.4, 0.3, false, true)
    p.hatch([left, top, right, top, right, 400, left, 320], -0.5, 11, 1.4, 0.22, false, true)
    p.hatch([left, top, right, top, right, 170, left, 110], 1.3, 13, 1.3, 0.2, false, true)

    // The moon, full, with its seas, and stars: each a small outline by itself.
    const moon = { x: 1026, y: 132, r: 50 }
    const disc = p.round(moon.x, moon.y, moon.r, moon.r, 0, 0.01, 30)
    p.shape(disc, 2.2, 0.75, 0.5)
    for (const [dx, dy, r] of [[-18, -14, 12], [14, 8, 16], [-10, 22, 8], [22, -24, 7], [-30, 8, 6]]) {
      const sea = p.round(moon.x + dx, moon.y + dy, r, r * 0.8, dx, 0.08, 12)
      p.line(sea, 1.1, 0.5, true).hatch(sea, 0.6, 3.6, 0.9, 0.3)
    }
    p.hatch(p.round(moon.x + 22, moon.y + 10, 30, 44, -0.3), 0.9, 6, 1, 0.22)
    const stars: [number, number, number][] = [[306, 60, 11], [352, 318, 8], [708, 300, 7], [404, 96, 7], [36, 300, 9], [960, 300, 8], [1150, 330, 9], [652, 70, 9], [940, 40, 7], [1136, 236, 6], [30, 470, 7], [330, 196, 6], [700, 420, 7], [1166, 440, 6], [926, 208, 6], [500, 350, 6], [1090, 420, 7]]
    for (let y = y0 + 40; y < -20; y += 150) for (let x = x0 + 60; x < x1; x += 190) stars.push([x + 40 * Math.sin(y + x), y + 30 * Math.cos(x), 7 + ((x + y) % 3)])
    stars.forEach(([sx, sy, sr], i) => {
      const star = starPoints(sx, sy, sr, i * 0.4)
      p.paper(star, true).line(star, 1.2, 0.7, true, 0.3, true)
    })

    // The far mountains: a range across the whole horizon, snow on the peaks and the side away from the moon in shade.
    const peaks: [number, number, number][] = []
    for (let x = left - 80; x < right + 80;) {
      const wide = 190 + 140 * p.rng.next(), up = 110 + 110 * p.rng.next()
      peaks.push([x + wide * 0.5, up, wide])
      x += wide * 0.62
    }
    for (const [px, up, wide] of peaks) {
      const foot = ICE_Y, peak = foot - up
      const hill = [px - wide * 0.5, foot, px - wide * 0.24, peak + up * 0.5, px - wide * 0.07, peak + up * 0.14, px, peak, px + wide * 0.09, peak + up * 0.2, px + wide * 0.26, peak + up * 0.52, px + wide * 0.5, foot]
      p.paper(hill, true).line(hill, 1.6, 0.55, false, 0.9, true)
      p.hatch([px, peak, px - wide * 0.07, peak + up * 0.14, px - wide * 0.24, peak + up * 0.5, px - wide * 0.5, foot, px - wide * 0.1, foot, px - wide * 0.02, peak + up * 0.5], 2.1, 6, 1, 0.3, false, true)
      // Two ridges run down from the peak on the moonlit side. No line crosses the mountain from flank to flank.
      p.line([px + wide * 0.02, peak + up * 0.1, px + wide * 0.07, peak + up * 0.36, px + wide * 0.06, peak + up * 0.62], 1, 0.4, false, 0.6)
      p.line([px + wide * 0.12, peak + up * 0.34, px + wide * 0.2, peak + up * 0.6, px + wide * 0.22, peak + up * 0.82], 1, 0.35, false, 0.6)
    }
    // The sea, in section: the water hatched level, darker with depth, and its surface.
    const water = [SHELF_EDGE - 6, SEA_Y, right, SEA_Y, right, bottom, left, bottom, left, 700]
    p.hatch(water, 0.02, 7, 1.1, 0.3, false, true)
    p.hatch([left, 760, right, 760, right, bottom, left, bottom], -0.04, 11, 1.1, 0.2, false, true)
    const surface: number[] = []
    for (let x = SHELF_EDGE - 2; x <= right; x += 14) surface.push(x, SEA_Y + (Math.round((x - SHELF_EDGE) / 14) % 2 ? 1.8 : -1.8))
    p.line(surface, 1.8, 0.75)

    // The whale, which lies under the shelf from end to end and puts only the top of its head out.
    // Its tail is a figure of its own, which the view lays on the root of it: it sways, and flicks under a finger.
    const whale = [...WHALE_BODY]
    p.shape(whale, 3, 0.95, 0.8)
    p.hatch([560, 770, 640, 796, 740, 806, 860, 806, 960, 796, 1020, 772, 1000, 762, 900, 780, 760, 784, 640, 776], 0.2, 6, 1.1, 0.4)
    for (const dy of [0, 10, 20]) p.line([880, 772 + dy * 0.6, 930, 778 + dy * 0.4, 990, 768 + dy * 0.3, 1024 - dy * 0.4, 752 + dy * 0.2], 1.2, 0.5)
    // Its smile, its eye, its blowhole and a flipper.
    p.line([1036, 738, 1010, 758, 960, 770, 916, 768], 2.2, 0.95)
    p.shape(p.round(WHALE_EYE.x, WHALE_EYE.y, 15, 15, 0, 0.02, 16), 2)
    p.shape([WHALE.x - 9, WHALE.y - WHALE.r + 3, WHALE.x - 6, WHALE.y - WHALE.r - 3, WHALE.x + 6, WHALE.y - WHALE.r - 3, WHALE.x + 9, WHALE.y - WHALE.r + 3], 1.8, 0.95, 0.3)
    const fin = [800, 786, 846, 800, 836, 826, 796, 810]
    p.shape(fin, 2, 0.95).hatch(fin, 0.4, 4, 1, 0.5)
    // Barnacles on its back, in two small clumps.
    for (const [bx, by] of [[700, 746], [706, 741], [711, 748], [816, 744], [823, 748]]) p.dot(bx, by, 2, 0.5)
    // Small fish keep out of its way.
    for (const [fx, fy, way] of [[320, 808, 1], [420, 790, -1], [1090, 800, -1]]) {
      p.shape([fx - 11 * way, fy, fx, fy - 6, fx + 11 * way, fy, fx, fy + 6], 1.4, 0.8, 0.3)
      p.shape([fx - 11 * way, fy, fx - 19 * way, fy - 6, fx - 19 * way, fy + 6], 1.2, 0.8, 0.3, true)
      p.dot(fx + 6 * way, fy - 1, 1.2)
    }

    // The ice shelf, in section, with what froze into it long ago.
    const shelf: number[] = [left, ICE_Y, SHELF_EDGE, ICE_Y, SHELF_EDGE + 3, ICE_Y + 30, SHELF_EDGE - 4, underside(SHELF_EDGE)]
    for (let x = SHELF_EDGE - 40; x > KIT.x1 + 20; x -= 40) shelf.push(x, underside(x) + 4 * Math.sin(x / 31))
    shelf.push(KIT.x1 + 20, underside(KIT.x1 + 20), left, underside(left))
    p.paper(shelf, true).hatch(shelf, -0.9, 11, 1.1, 0.26, false, true)
    p.line(shelf.slice(2, -2), 2.6, 0.95, false, 0.8)
    const ground: number[] = []
    for (let x = left; x < SHELF_EDGE; x += 60) ground.push(x, ICE_Y)
    ground.push(SHELF_EDGE, ICE_Y)
    p.line(ground, 2.8, 0.95, false, 0.4)
    const seam: number[] = []
    for (let x = KIT.x1 + 30; x <= SHELF_EDGE - 6; x += 44) seam.push(x, ICE_Y + 30 + 5 * Math.sin(x / 70) + (underside(x) - 716) * 0.3)
    p.line(seam, 1.1, 0.4)
    // A fish, whole, as it froze: a body with scales, a tail, a fin and an eye.
    const frozen = { x: 322, y: 700 }
    const body = [frozen.x - 46, frozen.y, frozen.x - 26, frozen.y - 15, frozen.x + 6, frozen.y - 17, frozen.x + 30, frozen.y - 6, frozen.x + 38, frozen.y + 1, frozen.x + 30, frozen.y + 8, frozen.x + 6, frozen.y + 17, frozen.x - 26, frozen.y + 14]
    p.shape(body, 1.7, 0.75, 0.5).hatch([frozen.x - 20, frozen.y - 12, frozen.x + 22, frozen.y - 8, frozen.x + 22, frozen.y + 8, frozen.x - 20, frozen.y + 12], 1.1, 5, 0.9, 0.4)
    p.shape([frozen.x + 36, frozen.y + 1, frozen.x + 56, frozen.y - 13, frozen.x + 50, frozen.y + 1, frozen.x + 56, frozen.y + 15], 1.4, 0.75, 0.4, true)
    p.line([frozen.x - 8, frozen.y - 16, frozen.x + 2, frozen.y - 26, frozen.x + 12, frozen.y - 15], 1.3, 0.7)
    p.dot(frozen.x - 33, frozen.y - 3, 2.2, 0.8)
    // A kettle: a round belly, a spout, a handle over the top and a knob on its lid.
    const kettle = { x: 430, y: 700 }
    const belly = p.round(kettle.x, kettle.y, 28, 22, 0, 0.03, 18)
    p.shape(belly, 1.8, 0.75, 0.5).hatch(p.round(kettle.x + 8, kettle.y + 4, 16, 14, 0), 0.7, 4.5, 0.9, 0.35)
    p.shape([kettle.x + 24, kettle.y - 6, kettle.x + 46, kettle.y - 20, kettle.x + 50, kettle.y - 15, kettle.x + 28, kettle.y + 6], 1.5, 0.75, 0.4, true)
    p.line([kettle.x - 20, kettle.y - 16, kettle.x - 16, kettle.y - 36, kettle.x, kettle.y - 42, kettle.x + 16, kettle.y - 36, kettle.x + 20, kettle.y - 16], 2, 0.75)
    p.shape(p.round(kettle.x, kettle.y - 25, 5, 4, 0, 0.03, 10), 1.3, 0.75)
    // And a bottle on its side, with something rolled up in it.
    const bottle = [250, 752, 296, 750, 306, 756, 322, 757, 322, 767, 306, 768, 296, 774, 250, 772]
    p.shape(bottle, 1.5, 0.7, 0.4).hatch([262, 756, 288, 755, 288, 769, 262, 768], 0.3, 4, 0.9, 0.3)
    p.line(stroke(322, 756, 322, 768), 2.2, 0.7)
    // Old tracks along the top of the shelf, and tufts of snow.
    for (const x of [300, 318, 336, 520, 538, 900 - 60]) p.dot(x, ICE_Y + 7, 1.6, 0.5)
    for (const x of [236, 330, 548, 880]) p.line([x - 10, ICE_Y, x - 3, ICE_Y - 6, x + 4, ICE_Y - 4, x + 10, ICE_Y], 1.3, 0.6)

    // The kit, sunk into the shelf and cut through like it: six compartments, and a part lying in each.
    const kitBox = [KIT.x0, ICE_Y + 4, KIT.x1, ICE_Y + 4, KIT.x1, KIT.y1, KIT.x0, KIT.y1]
    p.paper(kitBox, true).line(kitBox, 2.8, 0.95, true, 0.5, true)
    for (const part of PARTS) {
      const slot: Box = SLOTS[part]
      p.line([slot.x0, slot.y0, slot.x1, slot.y0, slot.x1, slot.y1, slot.x0, slot.y1], 1.3, 0.6, true, 0.4, true)
      const place = IN_KIT[part]
      inset(kit, p, (slot.x0 + slot.x1) / 2 + place.dx, (slot.y0 + slot.y1) / 2 + place.dy, place.size, 300 + slot.x0 + slot.y0, place.paint)
    }

    // The iceberg, cut off by the edge of the paper, with the walrus's hollow in its face.
    const berg = [BERG.x0, BERG.y0, right, BERG.y0, right, bottom, BERG.x0 + 30, bottom, BERG.x0 - 14, 760, BERG.x0, SEA_Y + 10]
    p.paper(berg, true).hatch(berg, 1.15, 11, 1.1, 0.28, false, true)
    p.hatch([BERG.x0 - 14, SEA_Y, right, SEA_Y, right, bottom, BERG.x0 - 14, bottom], 0.02, 7, 1, 0.26, false, true)
    p.line([right, BERG.y0, BERG.x0, BERG.y0, BERG.x0, SEA_Y + 10, BERG.x0 - 14, 760, BERG.x0 + 30, bottom], 2.8, 0.95, false, 0.4, true)
    const reach = WALRUS.r - 2, floor = SEA_Y - 14
    const hollow: number[] = [WALRUS.x - reach, floor, WALRUS.x - reach, WALRUS.y - 6]
    for (let i = 1; i < 10; i++) {
      const a = Math.PI + (Math.PI * i) / 10
      hollow.push(WALRUS.x + Math.cos(a) * reach, WALRUS.y - 6 + Math.sin(a) * (WALRUS.y - 6 - BERG.y0 - 8))
    }
    hollow.push(WALRUS.x + reach, WALRUS.y - 6, WALRUS.x + reach, floor)
    p.paper(hollow, true).hatch(hollow, 0.8, 3.6, 1.3, 0.8, true, true).line(hollow, 2.4, 0.95, true, 0.5, true)
    // The paper itself. It was punched once and the hole has torn out to the edge, a ragged bite as wide as the hole was; lower down, a strip of tape was stuck over the edge and has been peeled off, and its mark is left.
    const hx = x0 + 24
    const torn = [x0, 232, hx - 15, 238, hx - 6, 236, hx + 4, 239, hx + 10, 246, hx + 9, 256, hx + 2, 262, hx - 7, 261, hx - 13, 266, x0, 270]
    p.paper(torn).line(torn, 1.3, 0.5, false, 0.5)
    const tape = [x0, 561, hx + 14, 552, hx + 11, 558, hx + 17, 563, x0, 573]
    p.hatch(tape, 1.2, 3.4, 0.8, 0.22).line(tape, 1, 0.4, false, 0.4)
  })
}
