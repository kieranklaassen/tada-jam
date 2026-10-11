import { CELLS, COLS, KINDS, OUTLINES, ROWS, onCloth, sudsKnots, type Kind } from './cloth'
import { CLOTH, HUNG, hungLegs, hungTail, type FriendKind } from './layout'
import { DON_S, SLEEVE, STRAPS, THWOP, type Pose } from './motion'
import { THREAD, paintSoap } from './scenery'
import { canvasOf, chain, knot, oval, ring, running, satin, shade, soft, softPoints, sprite, stitch, wobbler, type Ctx, type Pt, type Sprite } from './stitch'
import { HIDE_CELLS, HIDE_COLS, HIDE_ROWS, anchorOf, fitOf, type Wear } from './taste'

// The pieces that move: the garments, the three friends and the cat. Each is
// stitched once into sprites and put together again every frame from its
// pose, as a cut-out of stitched cloth turning at its joints. The eyes, the
// mouths and a few threads are drawn live.

export const CLOTH_THREAD: Record<Kind, string> = {
  sock: '#d9483b',
  shirt: '#f8f4ea',
  dungarees: '#5f86cf',
  jumper: '#f0a52a',
  hat: '#c64a9a',
  scarf: '#2f9c8a',
}
const CLOTH_EDGE: Record<Kind, string> = { sock: '#8e2a22', shirt: '#4b6ea8', dungarees: '#2f4a86', jumper: '#a8650f', hat: '#7c2a5f', scarf: '#1a6257' }
const SATIN_TURN: Record<Kind, number> = { sock: 1.2, shirt: 0, dungarees: Math.PI / 2, jumper: 0.5, hat: -0.6, scarf: 0.2 }

const CAT_FUR = '#e8953a', PANTS = '#fcf9f1'
/** How far a cat's ear turns for each unit of `pose.ear`, in radians. */
export const CAT_EAR = 0.9
const INK = '#3a2a22'
/** Each kind of friend comes in two colourways: its own thread, and the thread of the dots or stripes on its pants. */
const COAT: Record<FriendKind, readonly [string, string]> = { pig: ['#f3a6b6', '#e9b592'], heron: ['#7f93ad', '#a79bc4'], goat: ['#f4edda', '#cfa878'] }
const TRIM: Record<FriendKind, readonly [string, string]> = { pig: ['#d2433a', '#3f7fbf'], heron: ['#d2433a', '#2f8f7a'], goat: ['#d2433a', '#3f6fb0'] }

/** How a figure is drawn: who it is, its pose, where it looks, what its arms are doing, the mud on its hide and what it wears. */
export type Look = {
  kind: FriendKind
  colour: 0 | 1
  pose: Pose
  lx: number
  ly: number
  /** At rest, holding a garment out towards the tub, or holding one up over the gate. */
  arms: 'rest' | 'out' | 'up'
  hide: readonly number[]
  worn: { kind: Kind; on: Wear; donning: number; draw: (g: Ctx, size: number, form: Form) => void } | null
}

/** How a worn garment is shaped by its wearer: where the arms have taken the shirt's sleeves, and how many turns of the scarf are wound on. */
export type Form = { sleeves?: [number, number]; wound?: number; pieces?: 'under' | 'over'; pushed?: number; straps?: [number, number] }

/** How far each kind's arms (wings, forelegs) are turned out from hanging straight down: at rest, and holding a thing out. */
const ARMS: Record<FriendKind, readonly [number, number]> = { pig: [0.18, 0.5], heron: [0.22, 0.46], goat: [0.12, 0.3] }
/** Where each kind's arm turns, from its feet: this far to each side of the middle, and this high. */
const ARM_AT: Record<FriendKind, readonly [number, number]> = { pig: [86, -214], heron: [50, -306], goat: [78, -224] }
/** How wide the goat's neck is where it shows between its shoulders and its lifted head, outline and all: the width of its picture. */
export const GOAT_NECK = 50
/** How far down the dungarees their bib ends and their legs begin, as a share of their size, and how many seconds a strap takes to flip up. */
export const BIB = 0.3
const STRAP_SNAP = 0.08
/** How far down the arm a worn sleeve reaches, as a share of the shirt's size. */
const SLEEVE_REACH = 0.2
/** How much of its length a worn sleeve keeps: it is pushed up the arm, so the hand comes out of the cuff. */
export const SLEEVE_PUSHED = 0.62
/** The turns of a wound scarf: each one's width as a share of the scarf's size, and how far along it is slid. */
export const TURNS: readonly (readonly [number, number])[] = [[0.94, -0.02], [1.02, 0.02], [0.92, -0.01]]
/** How tall a turn lies, and how far below the last the next one lies, as shares of the scarf's size. */
const TURN_TALL = 0.21
const TURN_APART = 0.15
/** How far a wound scarf's turns lean, all the same way, like a coil seen from the front. */
export const COIL = -0.1

/** Where the mud of each cell of a friend's hide lies on its body, from its feet: the middle of the grid and half its width and height. */
const HIDE_BOX: Record<FriendKind, { x: number; y: number; w: number; h: number }> = { pig: { x: 0, y: -190, w: 80, h: 130 }, heron: { x: 0, y: -250, w: 44, h: 110 }, goat: { x: 0, y: -180, w: 70, h: 130 } }
/**
 * The mud of each cell of a hide as up to three stitches, from the friend's feet: the same stitches every time.
 * The stitches of a cell lie side by side at the cell's own angle, and none reaches out of its cell, so no two
 * stitches of a hide can cross and read as a sign, whatever mud is on it. The middle one is laid first.
 */
const hideStitches = new Map<FriendKind, MudStitch[][]>()
export function hideStitchesOf(kind: FriendKind): MudStitch[][] {
  let all = hideStitches.get(kind)
  if (all) return all
  const box = HIDE_BOX[kind], cw = (box.w * 2) / HIDE_COLS, ch = (box.h * 2) / HIDE_ROWS
  // Closer together than a thread is thick, so the three read as one ragged smear and never as separate bars.
  const reach = Math.min(cw, ch) / 2 - 0.5, gap = 3.6
  all = Array.from({ length: HIDE_CELLS }, (_, cell) => {
    const next = wobbler(4000 + cell)
    const cx = box.x + (((cell % HIDE_COLS) + 0.5) / HIDE_COLS - 0.5) * 2 * box.w, cy = box.y + ((Math.floor(cell / HIDE_COLS) + 0.5) / HIDE_ROWS - 0.5) * 2 * box.h
    // Ragged: each lies its own distance from the middle one, and each is of its own length.
    return sideBySide(cx, cy, slant(cell % HIDE_COLS, Math.floor(cell / HIDE_COLS), next()), [0, -gap * (0.7 + 0.4 * next()), gap * (0.7 + 0.4 * next())], reach, 9, next)
  })
  hideStitches.set(kind, all)
  return all
}

/**
 * The angle of a cell's mud, anywhere but near the level, so a lone stitch never lies like a dash. The cells take
 * turns through five leans, so a cell never lies like the one beside it or the one above it, and `r` (0 to 1)
 * scuffs each a little within its lean.
 */
export const LEANS = 5
export const slant = (col: number, row: number, r: number): number => (0.2 + 0.6 * ((((col + 2 * row) % LEANS) + 0.3 + 0.4 * r) / LEANS)) * Math.PI

/** Where six stitches lie to the side of a cell's middle: unevenly apart, the middle ones first. */
function scuffed(next: () => number): number[] {
  const at = [0]
  for (let n = 1; n < 6; n++) at.push(at[n - 1] + 1.6 + 1.6 * next())
  const mid = (at[2] + at[3]) / 2 + (next() - 0.5) * 1.5
  return [2, 3, 1, 4, 0, 5].map((n) => at[n] - mid)
}

/**
 * Stitches laid side by side round a point: each lies along the angle `a`, `across[n]` to the side of the middle,
 * slid a little along itself and of its own length, and none leaves the circle of radius `reach` round the point.
 * Parallel threads cannot cross.
 */
function sideBySide(cx: number, cy: number, a: number, across: readonly number[], reach: number, longest: number, next: () => number): MudStitch[] {
  const dx = Math.cos(a), dy = Math.sin(a)
  return across.map((side) => {
    const room = Math.sqrt(Math.max(0, reach * reach - side * side))
    const slide = (next() - 0.5) * Math.min(7, room * 0.7)
    const half = Math.max(1, Math.min(longest * (0.35 + next() * 0.65), room - Math.abs(slide)))
    const x = cx - dy * side + dx * slide, y = cy + dx * side + dy * slide
    return { x0: x - dx * half, y0: y - dy * half, x1: x + dx * half, y1: y + dy * half }
  })
}

/** The margin round a garment's unit box in its sprite, for the chain outline. */
const EDGE = 12
const SIZE = CLOTH.w

/** Where the shirt's picture is cut into body and sleeve, and how far down the shoulder is that a sleeve turns at, as shares of its size. */
const SLEEVE_CUT_AT = 0.235
const SHOULDER_AT = 0.265
const SLEEVE_CUT = EDGE + SLEEVE_CUT_AT * SIZE
const SHOULDER = EDGE + SHOULDER_AT * SIZE
/** Where the hat's bobble sits on the hat: this far from its middle, as a share of its size (above it). */
const BOBBLE_UP = -0.4

/** A count of what a frame put on the surface: stamps of sprites and live strokes and fills. */
export type Tally = { stamps: number; pen: number }

export type MudStitch = { x0: number; y0: number; x1: number; y1: number }
const mudStitches = new Map<Kind, MudStitch[][]>()

/**
 * Each cell's mud as scruffy seed stitches: the same stitches every time, so mud that is left lies where it lay.
 * The six stitches of a cell lie side by side at the cell's own angle and none reaches out of its cell, so no two
 * stitches of a patch can cross and read as a sign, whatever the patch and however deep its mud. The middle ones
 * are laid first. A stitch that would hang over the edge of the cloth is shortened until both its ends lie on it.
 */
export function mudStitchesOf(kind: Kind): MudStitch[][] {
  let all = mudStitches.get(kind)
  if (all) return all
  const cellSize = SIZE / COLS
  all = Array.from({ length: CELLS }, (_, cell) => {
    const next = wobbler(9000 + cell)
    const cx = ((cell % COLS) + 0.5) * cellSize, cy = (Math.floor(cell / COLS) + 0.5) * (SIZE / ROWS)
    const on = (x: number, y: number) => onCloth(kind, x / SIZE, y / SIZE)
    return sideBySide(cx, cy, slant(cell % COLS, Math.floor(cell / COLS), next()), scuffed(next), cellSize / 2 - 0.5, 8.5, next).map((lie) => {
      // Shortened about its own middle until both ends are on the cloth; a middle that is off the cloth leaves a dot there.
      const mx = (lie.x0 + lie.x1) / 2, my = (lie.y0 + lie.y1) / 2
      let hx = (lie.x1 - lie.x0) / 2, hy = (lie.y1 - lie.y0) / 2
      for (let n = 0; n < 8 && !(on(mx - hx, my - hy) && on(mx + hx, my + hy)); n++) { hx *= 0.6; hy *= 0.6 }
      if (!(on(mx - hx, my - hy) && on(mx + hx, my + hy))) { hx = 0; hy = 0 }
      return { x0: mx - hx, y0: my - hy, x1: mx + hx, y1: my + hy }
    })
  })
  mudStitches.set(kind, all)
  return all
}
/** How many of a cell's six stitches show at each step of mud. */
const SHOWN = [0, 1, 3, 5]

function paintGarment(g: Ctx, kind: Kind, popped = false): void {
  const points = OUTLINES[kind].map(([u, v]): Pt => [EDGE + u * SIZE, EDGE + v * SIZE])
  const box = { x: EDGE, y: EDGE, w: SIZE, h: SIZE }
  const shape = (c: Ctx) => soft(c, points, 0.2)
  satin(g, shape, box, CLOTH_THREAD[kind], SATIN_TURN[kind], 200 + kind.length, 3.3)
  const band = (y0: number, y1: number, x0: number, x1: number, colour: string) => {
    g.save()
    shape(g)
    g.clip()
    satin(g, (c) => { c.beginPath(); c.rect(EDGE + x0 * SIZE, EDGE + y0 * SIZE, (x1 - x0) * SIZE, (y1 - y0) * SIZE) }, box, colour, SATIN_TURN[kind] + Math.PI / 2, 300, 3.3)
    g.restore()
  }
  if (kind === 'sock') {
    band(0.1, 0.18, 0, 1, '#fbf6ea')
    band(0.26, 0.34, 0, 1, '#fbf6ea')
  } else if (kind === 'scarf') {
    band(0, 1, 0.42, 0.52, '#f3e7b0')
    band(0, 1, 0.68, 0.78, '#f3e7b0')
    for (let n = 0; n < 5; n++) stitch(g, EDGE + (0.07 + n * 0.045) * SIZE, EDGE + 0.97 * SIZE, EDGE + (0.07 + n * 0.045) * SIZE, EDGE + 1.03 * SIZE, CLOTH_EDGE.scarf, 3)
  } else if (kind === 'hat') {
    // The bobble is a piece of its own: it rolls, knocks and turns to foam.
    band(0.8, 1, 0, 1, '#fbf6ea')
  } else if (kind === 'dungarees') {
    knot(g, EDGE + 0.38 * SIZE, EDGE + 0.09 * SIZE, 6, THREAD.gold)
    knot(g, EDGE + 0.62 * SIZE, EDGE + 0.09 * SIZE, 6, THREAD.gold)
  } else if (kind === 'shirt') {
    knot(g, EDGE + 0.5 * SIZE, EDGE + 0.34 * SIZE, 4.5, CLOTH_EDGE.shirt)
    // Worn, the lower button has popped: only the thread that held it is left.
    if (popped) stitch(g, EDGE + 0.5 * SIZE, EDGE + 0.57 * SIZE, EDGE + 0.52 * SIZE, EDGE + 0.62 * SIZE, CLOTH_EDGE.shirt, 2)
    else knot(g, EDGE + 0.5 * SIZE, EDGE + 0.58 * SIZE, 4.5, CLOTH_EDGE.shirt)
  } else {
    running(g, [[EDGE + 0.24 * SIZE, EDGE + 0.86 * SIZE], [EDGE + 0.76 * SIZE, EDGE + 0.86 * SIZE]], CLOTH_EDGE.jumper, 3, [6, 5])
  }
  chain(g, softPoints(points, 0.2), CLOTH_EDGE[kind], true, 8)
}

function paintHand(g: Ctx): void {
  // A mitten with one finger out, pointing up: the fingertip is at the top middle.
  const palm: Pt[] = [[20, 46], [34, 40], [34, 12], [40, 4], [46, 12], [46, 40], [62, 44], [66, 62], [60, 86], [30, 90], [16, 70]]
  satin(g, (c) => soft(c, palm, 0.3), { x: 10, y: 0, w: 60, h: 92 }, '#fbf3e2', 0.9, 400, 3.2)
  chain(g, softPoints(palm, 0.3), '#6a4a3a', true, 6)
}


/**
 * What a garment carries besides its mud when it is not on the board: its suds, 0 to 10, and whether its button is
 * off. And the shape it is in: the shirt's sleeves (how far each hangs out from straight down), the scarf's turns
 * round a wearer, and a wrung thing cut across into `count` bands, each pushed `by` of its size to one side and the
 * next to the other, as a screw or a rope is.
 */
export type GarmentState = { suds: number; popped: boolean; sleeves?: [number, number]; wound?: number; pieces?: 'under' | 'over'; pushed?: number; straps?: [number, number]; slices?: { count: number; by: number } }

export class Figures {
  private readonly garments = new Map<Kind, Sprite>()
  /** The shirt with its lower button popped off, as it is while it is worn. */
  private readonly poppedShirt: Sprite
  private readonly baked = new WeakMap<object, { rev: number; suds: number; popped: boolean; canvas: HTMLCanvasElement }>()
  /** The scarf as it is wound round its wearer, kept for as long as its turns and its mud stay as they are. */
  private readonly wound = new WeakMap<object, { from: HTMLCanvasElement; rev: number; suds: number; turns: number; canvas: HTMLCanvasElement }>()
  private readonly s: Record<string, Sprite> = {}

  /** Stitches every piece at `k` device pixels to a stage unit. */
  constructor(private readonly k: number) {
    const make = (name: string, w: number, h: number, paint: (g: Ctx) => void) => { this.s[name] = sprite(w, h, k, paint) }
    const white = (g: Ctx, x: number, y: number, r: number, colour: string) => {
      oval(g, x, y, r, r)
      g.fillStyle = colour
      g.fill()
      g.lineWidth = 2
      g.strokeStyle = INK
      g.stroke()
    }
    for (const kind of KINDS) this.garments.set(kind, sprite(SIZE + EDGE * 2, SIZE + EDGE * 2, k, (g) => paintGarment(g, kind)))
    this.poppedShirt = sprite(SIZE + EDGE * 2, SIZE + EDGE * 2, k, (g) => paintGarment(g, 'shirt', true))

    for (const c of [0, 1] as const) {
      const PIG = COAT.pig[c], HERON = COAT.heron[c], GOAT = COAT.goat[c]
      // --- The pig: round, in white pants with dots ----------------------------
      make(`pigLegs${c}`, 150, 84, (g) => {
        for (const x of [16, 88]) {
          satin(g, (c2) => soft(c2, [[x, 0], [x + 46, 0], [x + 46, 78], [x, 78]], 0.25), { x, y: 0, w: 46, h: 78 }, PIG, Math.PI / 2, 500 + x)
          satin(g, (c2) => soft(c2, [[x, 58], [x + 46, 58], [x + 46, 80], [x, 80]], 0.3), { x, y: 58, w: 46, h: 22 }, '#8d5a66', 0, 501 + x)
        }
      })
      make(`pigBody${c}`, 232, 224, (g) => {
        const body = (c2: Ctx) => oval(c2, 116, 110, 104, 98)
        satin(g, body, { x: 12, y: 12, w: 208, h: 196 }, PIG, 0.35, 510)
        g.save()
        body(g)
        g.clip()
        satin(g, (c2) => { c2.beginPath(); c2.rect(0, 150, 232, 80) }, { x: 0, y: 150, w: 232, h: 80 }, PANTS, 0, 511)
        g.restore()
        running(g, [[24, 152], [208, 152]], TRIM.pig[c], 3.4, [9, 6])
        for (const [x, y] of [[62, 176], [100, 190], [140, 178], [176, 186], [82, 168], [158, 168], [120, 172]] as const) knot(g, x, y, 5, TRIM.pig[c])
        chain(g, ring(116, 110, 104, 98, 60), shade(PIG, -0.42), true, 8)
      })
      make(`pigBelly${c}`, 132, 116, (g) => {
        satin(g, (c2) => oval(c2, 66, 58, 58, 50), { x: 8, y: 8, w: 116, h: 100 }, shade(PIG, 0.3), -0.5, 520)
        knot(g, 66, 74, 4, shade(PIG, -0.3))
      })
      make(`pigArm${c}`, 40, 92, (g) => {
        satin(g, (c2) => soft(c2, [[5, 4], [35, 4], [35, 84], [5, 84]], 0.45), { x: 5, y: 4, w: 30, h: 80 }, PIG, Math.PI / 2 + 0.2, 530)
        satin(g, (c2) => soft(c2, [[5, 66], [35, 66], [35, 86], [5, 86]], 0.45), { x: 5, y: 66, w: 30, h: 20 }, '#8d5a66', 0, 531)
        chain(g, softPoints([[5, 4], [35, 4], [35, 86], [5, 86]], 0.45), shade(PIG, -0.42), true, 6)
      })
      make(`pigHead${c}`, 164, 150, (g) => {
        satin(g, (c2) => oval(c2, 82, 78, 68, 64), { x: 14, y: 14, w: 136, h: 128 }, PIG, -0.35, 540)
        chain(g, ring(82, 78, 68, 64, 46), shade(PIG, -0.42), true, 8)
        satin(g, (c2) => oval(c2, 82, 94, 35, 25), { x: 46, y: 68, w: 72, h: 52 }, shade(PIG, -0.16), 0, 542)
        chain(g, ring(82, 94, 35, 25, 26), shade(PIG, -0.45), true, 5)
        knot(g, 69, 94, 6.5, '#8d5a66')
        knot(g, 95, 94, 6.5, '#8d5a66')
        knot(g, 34, 100, 8, shade(PIG, -0.14))
        knot(g, 130, 100, 8, shade(PIG, -0.14))
        white(g, 55, 56, 12, '#ffffff')
        white(g, 109, 56, 12, '#ffffff')
      })
      make(`pigEar${c}`, 54, 58, (g) => {
        const ear: Pt[] = [[8, 54], [14, 8], [46, 30], [40, 54]]
        satin(g, (c2) => soft(c2, ear, 0.3), { x: 6, y: 6, w: 44, h: 50 }, shade(PIG, -0.1), 1.1, 550)
        chain(g, softPoints(ear, 0.3), shade(PIG, -0.42), true, 6)
      })
      make(`pigTail${c}`, 50, 50, (g) => {
        g.beginPath()
        for (let a = 0; a <= Math.PI * 3.4; a += 0.2) {
          const r = 4 + a * 1.9
          const x = 30 + Math.cos(a) * r * 0.9, y = 25 + Math.sin(a) * r * 0.9
          if (a === 0) g.moveTo(x, y)
          else g.lineTo(x, y)
        }
        g.lineWidth = 7
        g.strokeStyle = shade(PIG, -0.25)
        g.stroke()
        g.lineWidth = 2.4
        g.strokeStyle = shade(PIG, 0.3)
        g.stroke()
      })

      // --- The heron: tall, in baggy striped shorts, seen from the front --------
      make(`heronBody${c}`, 150, 240, (g) => {
        for (const [x, turn] of [[98, 0.5], [112, 0.8], [122, 1.15]] as const) {
          const feather: Pt[] = [[x - 8, 120], [x + 8, 120], [x + 8 + Math.sin(turn) * 44, 120 + Math.cos(turn) * 44]]
          satin(g, (c2) => soft(c2, feather, 0.2), { x: x - 10, y: 116, w: 56, h: 52 }, shade(HERON, -0.3), turn, 600 + x)
        }
        satin(g, (c2) => oval(c2, 68, 90, 58, 82), { x: 10, y: 8, w: 116, h: 164 }, HERON, -0.3, 601)
        satin(g, (c2) => oval(c2, 68, 108, 34, 54), { x: 34, y: 54, w: 68, h: 108 }, shade(HERON, 0.5), Math.PI / 2, 602)
        chain(g, ring(68, 90, 58, 82, 50), shade(HERON, -0.45), true, 8)
        // The shorts, on the same piece.
        const shorts: Pt[] = [[11, 146], [125, 146], [133, 224], [77, 228], [68, 192], [59, 228], [3, 224]]
        const shape = (c2: Ctx) => soft(c2, shorts, 0.18)
        satin(g, shape, { x: 3, y: 146, w: 130, h: 84 }, PANTS, Math.PI / 2, 610)
        g.save()
        shape(g)
        g.clip()
        for (const x of [23, 49, 87, 113]) satin(g, (c2) => { c2.beginPath(); c2.rect(x - 5, 140, 10, 96) }, { x: x - 5, y: 140, w: 10, h: 96 }, TRIM.heron[c], Math.PI / 2, 611 + x)
        g.restore()
        running(g, [[13, 154], [123, 154]], TRIM.heron[c], 3, [7, 5])
        chain(g, softPoints(shorts, 0.18), shade(TRIM.heron[c], -0.3), true, 6)
      })
      make(`heronWing${c}`, 62, 136, (g) => {
        const wing: Pt[] = [[10, 10], [50, 6], [56, 70], [34, 130], [22, 96], [8, 60]]
        satin(g, (c2) => soft(c2, wing, 0.35), { x: 6, y: 4, w: 52, h: 128 }, shade(HERON, -0.22), Math.PI / 2 - 0.2, 620)
        running(g, [[30, 30], [34, 104]], shade(HERON, 0.3), 2.4, [10, 7])
        running(g, [[42, 26], [44, 84]], shade(HERON, 0.3), 2.4, [10, 7])
        chain(g, softPoints(wing, 0.35), shade(HERON, -0.5), true, 6)
      })
      make(`heronHead${c}`, 150, 74, (g) => {
        // The head looks left; the top half of the beak is fixed to it, and so is its one stern brow.
        const beak: Pt[] = [[70, 32], [14, 48], [70, 46]]
        satin(g, (c2) => soft(c2, beak, 0.08), { x: 14, y: 30, w: 58, h: 20 }, THREAD.gold, 0.25, 630)
        satin(g, (c2) => oval(c2, 92, 38, 27, 22), { x: 64, y: 14, w: 56, h: 48 }, shade(HERON, 0.5), 0.3, 631)
        satin(g, (c2) => soft(c2, [[72, 22], [116, 14], [118, 28], [84, 30]], 0.3), { x: 72, y: 14, w: 46, h: 16 }, '#2f3b4f', 0.1, 632)
        chain(g, ring(92, 38, 27, 22, 26), shade(HERON, -0.45), true, 6)
        white(g, 86, 35, 9, '#fff7d6')
        stitch(g, 74, 26, 96, 21, '#2f3b4f', 4)
      })
      make(`heronJaw${c}`, 76, 20, (g) => {
        const jaw: Pt[] = [[70, 4], [18, 10], [70, 16]]
        satin(g, (c2) => soft(c2, jaw, 0.08), { x: 6, y: 2, w: 66, h: 16 }, shade(THREAD.gold, -0.18), 0.1, 640)
      })
      make(`heronCrest${c}`, 70, 30, (g) => {
        running(g, [[4, 16], [30, 8], [64, 12]], '#2f3b4f', 4, [12, 4])
        running(g, [[4, 20], [28, 20], [58, 26]], '#2f3b4f', 4, [12, 4])
      })

      // --- The goat: stocky, in striped pants, with horns and a beard -----------
      make(`goatLegs${c}`, 140, 90, (g) => {
        for (const x of [14, 84]) {
          satin(g, (c2) => soft(c2, [[x, 0], [x + 40, 0], [x + 36, 84], [x + 4, 84]], 0.2), { x, y: 0, w: 40, h: 84 }, GOAT, Math.PI / 2, 700 + x)
          satin(g, (c2) => soft(c2, [[x + 2, 64], [x + 38, 64], [x + 38, 86], [x + 2, 86]], 0.25), { x, y: 64, w: 40, h: 22 }, '#5a4636', 0, 701 + x)
        }
      })
      make(`goatBody${c}`, 204, 216, (g) => {
        const body: Pt[] = [[40, 12], [164, 12], [192, 80], [184, 190], [102, 206], [20, 190], [12, 80]]
        const shape = (c2: Ctx) => soft(c2, body, 0.4)
        satin(g, shape, { x: 12, y: 12, w: 180, h: 194 }, GOAT, 1.2, 710)
        g.save()
        shape(g)
        g.clip()
        satin(g, (c2) => { c2.beginPath(); c2.rect(0, 134, 204, 90) }, { x: 0, y: 134, w: 204, h: 90 }, PANTS, 0, 711)
        for (const y of [148, 170, 192]) satin(g, (c2) => { c2.beginPath(); c2.rect(0, y, 204, 9) }, { x: 0, y, w: 204, h: 9 }, TRIM.goat[c], 0, 712 + y)
        g.restore()
        chain(g, softPoints(body, 0.4), shade(GOAT, -0.5), true, 8)
      })
      make(`goatNeck${c}`, GOAT_NECK, 70, (g) => {
        satin(g, (c2) => { c2.beginPath(); c2.rect(5, 0, GOAT_NECK - 10, 70) }, { x: 5, y: 0, w: GOAT_NECK - 10, h: 70 }, GOAT, Math.PI / 2, 725)
        chain(g, [[5, 0], [5, 70]], shade(GOAT, -0.5), false, 8)
        chain(g, [[GOAT_NECK - 5, 0], [GOAT_NECK - 5, 70]], shade(GOAT, -0.5), false, 8)
      })
      make(`goatArm${c}`, 34, 100, (g) => {
        satin(g, (c2) => soft(c2, [[6, 4], [28, 4], [26, 94], [8, 94]], 0.35), { x: 6, y: 4, w: 22, h: 90 }, GOAT, Math.PI / 2, 720)
        satin(g, (c2) => soft(c2, [[7, 74], [27, 74], [26, 95], [8, 95]], 0.35), { x: 7, y: 74, w: 20, h: 21 }, '#5a4636', 0, 721)
        chain(g, softPoints([[6, 4], [28, 4], [26, 95], [8, 95]], 0.35), shade(GOAT, -0.5), true, 5)
      })
      make(`goatHead${c}`, 190, 186, (g) => {
        for (const side of [-1, 1]) {
          const horn: Pt[] = [[95 + side * 20, 76], [95 + side * 34, 40], [95 + side * 66, 14], [95 + side * 78, 24], [95 + side * 56, 44], [95 + side * 44, 78]]
          satin(g, (c2) => soft(c2, horn, 0.3), { x: 95 + (side < 0 ? -80 : 18), y: 12, w: 62, h: 68 }, '#bca47c', 0.8 * side, 730 + side)
          running(g, [[95 + side * 36, 52], [95 + side * 50, 58]], '#7d6a4c', 2.6, [5, 3])
          running(g, [[95 + side * 50, 32], [95 + side * 62, 40]], '#7d6a4c', 2.6, [5, 3])
        }
        const face: Pt[] = [[42, 66], [148, 66], [140, 136], [124, 172], [66, 172], [50, 136]]
        satin(g, (c2) => soft(c2, face, 0.35), { x: 42, y: 66, w: 106, h: 106 }, GOAT, Math.PI / 2, 734)
        chain(g, softPoints(face, 0.35), shade(GOAT, -0.5), true, 8)
        white(g, 68, 100, 12, '#f3d36b')
        white(g, 122, 100, 12, '#f3d36b')
      })
      make(`goatMuzzle${c}`, 76, 50, (g) => {
        satin(g, (c2) => oval(c2, 38, 24, 30, 19), { x: 6, y: 4, w: 64, h: 40 }, '#e6c9bd', 0, 740)
        knot(g, 28, 18, 4.5, '#6b4a3f')
        knot(g, 48, 18, 4.5, '#6b4a3f')
        running(g, [[24, 32], [38, 36], [52, 32]], '#6b4a3f', 2.8, [6, 3])
        chain(g, ring(38, 24, 30, 19, 22), shade(GOAT, -0.5), true, 4.5)
      })
      make(`goatEar${c}`, 70, 34, (g) => {
        const ear: Pt[] = [[6, 14], [36, 4], [66, 16], [36, 30]]
        satin(g, (c2) => soft(c2, ear, 0.35), { x: 4, y: 4, w: 62, h: 28 }, shade(GOAT, -0.14), 0.1, 750)
        chain(g, softPoints(ear, 0.35), shade(GOAT, -0.5), true, 5)
      })
      make(`goatBeard${c}`, 40, 62, (g) => {
        const beard: Pt[] = [[6, 4], [34, 4], [26, 40], [20, 58], [14, 40]]
        satin(g, (c2) => soft(c2, beard, 0.25), { x: 6, y: 4, w: 28, h: 54 }, shade(GOAT, -0.12), Math.PI / 2, 760)
        running(g, softPoints(beard, 0.25), shade(GOAT, -0.5), 2.4, [5, 4], true)
      })
      make(`goatTail${c}`, 34, 44, (g) => {
        const tuft: Pt[] = [[8, 40], [6, 14], [18, 4], [28, 16], [24, 40]]
        satin(g, (c2) => soft(c2, tuft, 0.35), { x: 6, y: 4, w: 24, h: 38 }, shade(GOAT, -0.1), Math.PI / 2, 770)
      })
    }

    // --- The cat on its post ---------------------------------------------------
    make('catBody', 124, 106, (g) => {
      const loaf: Pt[] = [[14, 100], [8, 56], [30, 14], [92, 14], [116, 56], [110, 100]]
      satin(g, (c) => soft(c, loaf, 0.4), { x: 8, y: 14, w: 108, h: 88 }, CAT_FUR, Math.PI / 2 + 0.2, 800)
      satin(g, (c) => oval(c, 62, 76, 22, 26), { x: 40, y: 50, w: 44, h: 52 }, '#fbf3e2', Math.PI / 2, 801)
      for (const x of [26, 96]) running(g, [[x, 40], [x + (x < 60 ? 10 : -10), 62]], shade(CAT_FUR, -0.35), 3.4, [8, 4])
      chain(g, softPoints(loaf, 0.4), shade(CAT_FUR, -0.5), true, 7)
    })
    // The ears are pieces of their own: they prick, turn and lie back.
    make('catEar', 40, 44, (g) => {
      const ear: Pt[] = [[6, 28], [28, 4], [34, 38]]
      satin(g, (c) => soft(c, ear, 0.2), { x: 4, y: 4, w: 30, h: 36 }, CAT_FUR, 1, 811)
      chain(g, softPoints(ear, 0.2), shade(CAT_FUR, -0.5), true, 5)
    })
    make('catHead', 96, 88, (g) => {
      satin(g, (c) => oval(c, 48, 52, 36, 30), { x: 12, y: 22, w: 72, h: 60 }, CAT_FUR, 0.2, 812)
      chain(g, ring(48, 52, 36, 30, 30), shade(CAT_FUR, -0.5), true, 6)
      satin(g, (c) => oval(c, 48, 64, 15, 10), { x: 32, y: 54, w: 32, h: 20 }, '#fbf3e2', 0, 813)
      knot(g, 48, 58, 3.6, '#c9647a')
      for (const side of [-1, 1]) for (const tilt of [-5, 2, 9]) running(g, [[48 + side * 18, 64], [48 + side * 44, 62 + tilt]], '#fbf3e2', 1.8, [7, 3])
      white(g, 33, 46, 8.5, '#b9d86a')
      white(g, 63, 46, 8.5, '#b9d86a')
    })
    make('catPaw', 26, 50, (g) => {
      satin(g, (c) => soft(c, [[4, 4], [22, 4], [22, 46], [4, 46]], 0.45), { x: 4, y: 4, w: 18, h: 42 }, CAT_FUR, Math.PI / 2, 820)
      satin(g, (c) => soft(c, [[4, 32], [22, 32], [22, 46], [4, 46]], 0.45), { x: 4, y: 32, w: 18, h: 14 }, '#fbf3e2', 0, 821)
      chain(g, softPoints([[4, 4], [22, 4], [22, 46], [4, 46]], 0.45), shade(CAT_FUR, -0.5), true, 4.5)
    })

    make('hand', 80, 96, paintHand)
    make('bird', 44, 40, (g) => {
      satin(g, (c) => oval(c, 22, 22, 15, 13), { x: 6, y: 8, w: 32, h: 28 }, '#c8553f', 0.5, 830)
      satin(g, (c) => soft(c, [[30, 20], [42, 12], [40, 28]], 0.2), { x: 30, y: 12, w: 12, h: 16 }, shade('#c8553f', -0.3), 0, 831)
      stitch(g, 8, 20, 2, 22, THREAD.gold, 3.4)
      knot(g, 15, 18, 2.6, INK)
    })
    make('bobble', 40, 40, (g) => knot(g, 20, 20, 15, '#fbf6ea'))
    make('soap', 64, 44, paintSoap)
  }

  /** Stamps a piece with the point (`px`, `py`) of its box at (`x`, `y`), turned and stretched about that point. */
  put(g: Ctx, tally: Tally, name: string, x: number, y: number, px: number, py: number, turn = 0, sx = 1, sy = 1): void {
    const piece = this.s[name]
    g.save()
    g.translate(x, y)
    if (turn) g.rotate(turn)
    if (sx !== 1 || sy !== 1) g.scale(sx, sy)
    g.drawImage(piece.canvas, -px, -py, piece.w, piece.h)
    g.restore()
    tally.stamps += 1
  }

  /**
   * A garment with its mud as one picture, `size` across, with its middle at the origin. A muddy garment is
   * stitched into a picture of its own the first time, and again only when its mud has changed (`rev`), so a
   * garment that is left alone costs one stamp however muddy it is. `key` is the garment the picture is kept for.
   */
  stamp(g: Ctx, tally: Tally, key: object, kind: Kind, mud: readonly number[], rev: number, size: number, core: boolean, bobble?: { dx: number; dy: number; scale: number }, state?: GarmentState): void {
    const popped = kind === 'shirt' && !!state?.popped
    const piece = popped ? this.poppedShirt : this.garments.get(kind)!
    // The suds that were not wrung out stay on the garment: the same knots it had on the board, in whole tenths.
    const suds = state ? Math.round(state.suds) : 0
    const k = size / SIZE
    let muddy = false
    for (let cell = 0; cell < CELLS; cell++) if (mud[cell] > 0) { muddy = true; break }
    let source: HTMLCanvasElement = piece.canvas
    if (muddy || suds > 0) {
      let kept = this.baked.get(key)
      if (!kept || kept.rev !== rev || kept.suds !== suds || kept.popped !== popped) {
        const canvas = kept?.canvas ?? canvasOf(piece.canvas.width, piece.canvas.height)
        const b = canvas.getContext('2d')!
        b.setTransform(1, 0, 0, 1, 0, 0)
        b.clearRect(0, 0, canvas.width, canvas.height)
        b.drawImage(piece.canvas, 0, 0)
        tally.stamps += 1
        b.setTransform(this.k, 0, 0, this.k, EDGE * this.k, EDGE * this.k)
        b.lineCap = 'round'
        b.beginPath()
        const lie = mudStitchesOf(kind)
        for (let cell = 0; cell < CELLS; cell++) {
          const level = mud[cell]
          if (level <= 0) continue
          const stitches = lie[cell], shown = SHOWN[Math.min(3, Math.ceil(level))]
          for (let n = 0; n < shown; n++) {
            b.moveTo(stitches[n].x0, stitches[n].y0)
            b.lineTo(stitches[n].x1, stitches[n].y1)
          }
        }
        if (muddy) {
          b.lineWidth = 5.4
          b.strokeStyle = THREAD.mud
          b.stroke()
          tally.pen += 1
          if (core) {
            b.lineWidth = 2
            b.strokeStyle = THREAD.mudLight
            b.stroke()
            tally.pen += 1
          }
        }
        if (suds > 0) {
          // Three passes for all the knots, as on the board: shadow, knot, light.
          const knots = sudsKnots(kind, suds), grey = kind === 'dungarees'
          const pass = (dx: number, dy: number, grow: number, colour: string) => {
            b.beginPath()
            for (const each of knots) {
              const r = each.r * SIZE, x = each.u * SIZE + dx * r, y = each.v * SIZE + dy * r
              b.moveTo(x + r * grow, y)
              b.arc(x, y, r * grow, 0, Math.PI * 2)
            }
            b.fillStyle = colour
            b.fill()
            tally.pen += 1
          }
          pass(0.16, 0.22, 1, grey ? '#7f8791' : '#9fb3c4')
          pass(0, 0, 1, grey ? '#c9ced4' : THREAD.suds)
          pass(-0.3, -0.32, 0.3, grey ? '#e3e6ea' : '#dfeaf2')
        }
        kept = { rev, suds, popped, canvas }
        this.baked.set(key, kept)
      }
      source = kept.canvas
    }
    const left = (-SIZE / 2 - EDGE) * k, top = (-SIZE / 2 - EDGE) * k
    // A part of the picture, given in the picture's own units, drawn `dx` units to the side of where it belongs.
    const part = (x0: number, y0: number, x1: number, y1: number, dx = 0) => {
      const fx = source.width / piece.w, fy = source.height / piece.h
      g.drawImage(source, x0 * fx, y0 * fy, (x1 - x0) * fx, (y1 - y0) * fy, left + (x0 + dx) * k, top + y0 * k, (x1 - x0) * k, (y1 - y0) * k)
      tally.stamps += 1
    }
    const sleeves = kind === 'shirt' ? state?.sleeves : undefined
    if (sleeves && (Math.abs(sleeves[0] - SLEEVE) > 0.01 || Math.abs(sleeves[1] - SLEEVE) > 0.01)) {
      // The shirt in three pieces of the one picture, so each sleeve carries its own mud and suds: the body, and over
      // it each sleeve turned at its shoulder. A wearer asks for it in two goes, so its near arm can lie between them.
      const pieces = state?.pieces
      if (pieces !== 'over') part(SLEEVE_CUT, 0, piece.w - SLEEVE_CUT, piece.h)
      for (const side of [0, 1]) {
        if (pieces && (pieces === 'over') !== (side === 0)) continue
        const px = left + (side ? piece.w - SLEEVE_CUT : SLEEVE_CUT) * k, py = top + SHOULDER * k
        g.save()
        g.translate(px, py)
        g.rotate(side ? SLEEVE - sleeves[1] : sleeves[0] - SLEEVE)
        if (state?.pushed) {
          // Pushed up the arm: shorter along its own length, as wide as it was.
          g.rotate(side ? -SLEEVE : SLEEVE)
          g.scale(1, state.pushed)
          g.rotate(side ? SLEEVE : -SLEEVE)
        }
        g.translate(-px, -py)
        if (side) part(piece.w - SLEEVE_CUT, 0, piece.w, piece.h)
        else part(0, 0, SLEEVE_CUT, piece.h)
        g.restore()
      }
    } else if (kind === 'scarf' && state?.wound !== undefined) {
      // Wound round its wearer: the end with the fringe hangs down at one side, where it is cut, and over it lie the
      // turns, one below the other and all leaning the same way. Each turn is the scarf's own band, mud and suds and
      // all. It is wound into a picture of its own when a turn goes on or its mud changes, and stamped from that.
      const turns = Math.max(0, Math.min(TURNS.length, Math.ceil(state.wound)))
      let kept = this.wound.get(key)
      if (!kept || kept.from !== source || kept.rev !== rev || kept.suds !== suds || kept.turns !== turns) {
        const canvas = kept?.canvas ?? canvasOf(piece.canvas.width, piece.canvas.height)
        const b = canvas.getContext('2d')!
        b.setTransform(1, 0, 0, 1, 0, 0)
        b.clearRect(0, 0, canvas.width, canvas.height)
        b.setTransform(this.k, 0, 0, this.k, (EDGE + SIZE / 2) * this.k, (EDGE + SIZE / 2) * this.k)
        const fx = source.width / piece.w, fy = source.height / piece.h, edge = -SIZE / 2 - EDGE
        const ey = EDGE + 0.5 * SIZE, ew = EDGE + 0.33 * SIZE
        b.drawImage(source, 0, ey * fy, ew * fx, (piece.h - ey) * fy, edge, edge + ey, ew, piece.h - ey)
        tally.stamps += 1
        const bx = EDGE + 0.3 * SIZE, by = EDGE + 0.22 * SIZE, bw = piece.w - bx, bh = 0.34 * SIZE
        for (let n = 0; n < turns; n++) {
          const w = TURNS[n][0] * SIZE
          b.save()
          b.translate(TURNS[n][1] * SIZE, (n - 1) * TURN_APART * SIZE)
          b.rotate(COIL)
          b.drawImage(source, bx * fx, by * fy, bw * fx, bh * fy, -w / 2, (-TURN_TALL * SIZE) / 2, w, TURN_TALL * SIZE)
          b.restore()
          tally.stamps += 1
        }
        kept = { from: source, rev, suds, turns, canvas }
        this.wound.set(key, kept)
      }
      g.drawImage(kept.canvas, left, top, piece.w * k, piece.h * k)
      tally.stamps += 1
    } else if (kind === 'dungarees' && state?.straps && (state.straps[0] < 1 || state.straps[1] < 1)) {
      // Going on: the legs, and over them the bib in its two halves, each with its strap and buckle. A half hangs
      // down in front, folded over at the waist, until its strap pings up.
      const cut = EDGE + BIB * SIZE
      part(0, cut, piece.w, piece.h)
      for (const side of [0, 1]) {
        const flip = state.straps[side] * 2 - 1
        if (Math.abs(flip) < 0.02) continue
        g.save()
        g.translate(0, top + cut * k)
        g.scale(1, flip)
        g.translate(0, -(top + cut * k))
        part(side ? piece.w / 2 : 0, 0, side ? piece.w : piece.w / 2, cut)
        g.restore()
      }
    } else if (state?.slices && state.slices.count > 1 && Math.abs(state.slices.by) > 0.002) {
      // Wrung: cut across into bands, each pushed to one side and the next to the other, as the thread of a screw goes.
      const { count, by } = state.slices
      for (let n = 0; n < count; n++) part(0, (piece.h * n) / count, piece.w, (piece.h * (n + 1)) / count, (n % 2 ? by : -by) * SIZE)
    } else {
      g.drawImage(source, left, top, piece.w * k, piece.h * k)
      tally.stamps += 1
    }
    if (kind === 'hat') {
      const at = bobble ?? { dx: 0, dy: 0, scale: 1 }
      // A bobble of no size is drawn by whoever asked for that: it has come away from the hat, as it does in the tub.
      if (at.scale > 0) this.put(g, tally, 'bobble', (at.dx) * k, (BOBBLE_UP * SIZE + at.dy) * k, 20, 20, 0, k * at.scale, k * at.scale)
    }
  }

  /** The hat's bobble by itself, with its middle at (`x`, `y`), for a hat `size` across. */
  drawBobble(g: Ctx, tally: Tally, x: number, y: number, size: number): void {
    this.put(g, tally, 'bobble', x, y, 20, 20, 0, size / SIZE, size / SIZE)
  }

  /** A garment centred at (`x`, `y`), turned and stretched about its middle. */
  drawGarment(g: Ctx, tally: Tally, key: object, kind: Kind, mud: readonly number[], rev: number, x: number, y: number, size: number, turn: number, core: boolean, sx = 1, sy = 1, bobble?: { dx: number; dy: number; scale: number }, state?: GarmentState): void {
    g.save()
    g.translate(x, y)
    if (turn) g.rotate(turn)
    if (sx !== 1 || sy !== 1) g.scale(sx, sy)
    this.stamp(g, tally, key, kind, mud, rev, size, core, bobble, state)
    g.restore()
  }

  /** The pupils, drawn live on the whites stitched into the head: they look where `lx`, `ly` point (each -1 to 1). A blink is a lid in the fur's thread. */
  private eyes(g: Ctx, tally: Tally, at: readonly Pt[], r: number, lx: number, ly: number, blink: number, fur: string, pupil: 'dot' | 'bar' | 'slit'): void {
    g.beginPath()
    if (blink > 0.5) {
      for (const [x, y] of at) {
        g.moveTo(x + r + 1, y)
        g.arc(x, y, r + 1, 0, Math.PI * 2)
      }
      g.fillStyle = fur
      g.fill()
      g.beginPath()
      for (const [x, y] of at) {
        g.moveTo(x - r, y)
        g.quadraticCurveTo(x, y + r * 0.7, x + r, y)
      }
      g.lineWidth = 3
      g.strokeStyle = INK
      g.stroke()
      tally.pen += 2
      return
    }
    for (const [x, y] of at) {
      const px = x + lx * r * 0.42, py = y + ly * r * 0.42
      if (pupil === 'dot') {
        g.moveTo(px + r * 0.5, py)
        g.arc(px, py, r * 0.5, 0, Math.PI * 2)
      } else if (pupil === 'bar') {
        g.rect(px - r * 0.62, py - r * 0.2, r * 1.24, r * 0.4)
      } else {
        g.moveTo(px + r * 0.22, py)
        g.ellipse(px, py, r * 0.22, r * 0.72, 0, 0, Math.PI * 2)
      }
    }
    g.fillStyle = INK
    g.fill()
    tally.pen += 1
  }

  /** What a figure wears, drawn on the part it belongs to: tight things pinch, loose ones hang, long ones trail, short ones fold like a squeezebox. */
  private wear(g: Ctx, look: Look, part: 'legs' | 'body' | 'head', over = false): void {
    const worn = look.worn
    if (!worn) return
    const anchor = anchorOf(look.kind, worn.on)
    if (anchor.part !== part) return
    const sleeved = worn.kind === 'shirt' && anchor.part === 'body'
    // Only a shirt is drawn in two goes: the rest of it under the near arm, and that arm's sleeve over it.
    if (over && !sleeved) return
    const fit = fitOf(look.kind, worn.kind)
    const sx = fit === 'tight' ? 0.86 : 1, sy = fit === 'loose' ? 1.24 : fit === 'long' ? 1.18 : fit === 'short' ? 0.72 + 0.05 * Math.sin(look.pose.bob * 0.5) : 1
    const p = worn.donning
    // Going on, it comes down over its place and grows to its size. The jumper sticks halfway, over the head, and then pops down.
    let lift = (1 - p) * anchor.size * 0.45, grow = 0.55 + 0.45 * p
    const age = p * DON_S
    if (worn.kind === 'jumper' && p < 1) {
      // It pops down when its voice goes thwop.
      lift = anchor.size * 0.5 * (age < THWOP ? 1 : Math.max(0, 1 - (age - THWOP) / 0.15))
      grow = 0.9
    }
    const form: Form = {}
    // The dungarees' two straps hang down in front until each pings up over its shoulder, when its voice does.
    if (worn.kind === 'dungarees' && p < 1) form.straps = [Math.max(0, Math.min(1, (age - STRAPS[0]) / STRAP_SNAP)), Math.max(0, Math.min(1, (age - STRAPS[1]) / STRAP_SNAP))]
    const down = (fit === 'loose' ? anchor.size * 0.12 - look.pose.hitch : 0) - lift
    if (sleeved) {
      // Arms go through the sleeves: each sleeve runs from the shirt's shoulder to a point down the arm that is in
      // it, so it lies over the arm and the hand comes out of the cuff.
      const arm = this.arms(look, ARMS[look.kind][0], ARMS[look.kind][1])
      const [ax, ay] = ARM_AT[look.kind], reach = SLEEVE_REACH * anchor.size
      const sx0 = (0.5 - SLEEVE_CUT_AT) * anchor.size * sx * grow, sy0 = anchor.y + down - (0.5 - SHOULDER_AT) * anchor.size * sy * grow
      const aim = (side: -1 | 1, turn: number) => {
        const x = side * ax - Math.sin(turn) * reach, y = ay + Math.cos(turn) * reach
        return Math.atan2(side * (x - (anchor.x + side * sx0)), y - sy0)
      }
      form.sleeves = [aim(-1, arm.left), aim(1, arm.right)]
      form.pieces = over ? 'over' : 'under'
      form.pushed = SLEEVE_PUSHED
    }
    // The scarf goes on a turn at a time, one for each whup of its voice: 0.22 seconds apart in the second and a half it takes.
    if (worn.kind === 'scarf') form.wound = p >= 1 ? TURNS.length : Math.min(TURNS.length, 1 + Math.floor(age / 0.22))
    g.save()
    // A loose thing is hitched up and slides down again with the pig's own answer to it.
    g.translate(anchor.x, anchor.y + down)
    if (anchor.turn) g.rotate(anchor.turn)
    g.scale(sx * grow, sy * grow)
    worn.draw(g, anchor.size, form)
    g.restore()
  }

  /** The mud on a friend's hide: scruffy stitches over its body, cell by cell. */
  private hide(g: Ctx, tally: Tally, look: Look): void {
    const lies = hideStitchesOf(look.kind)
    let any = false
    g.beginPath()
    for (let cell = 0; cell < HIDE_CELLS; cell++) {
      const level = look.hide[cell]
      if (!(level > 0)) continue
      any = true
      for (let n = 0; n < Math.min(3, level); n++) {
        const lie = lies[cell][n]
        g.moveTo(lie.x0, lie.y0)
        g.lineTo(lie.x1, lie.y1)
      }
    }
    if (!any) return
    g.lineWidth = 6
    g.strokeStyle = THREAD.mud
    g.stroke()
    tally.pen += 1
  }

  /** How far each arm is turned from hanging straight down: at rest, holding a thing out, holding one up, or folded over the front. */
  private arms(look: Look, rest: number, out: number): { left: number; right: number } {
    const pose = look.pose
    const left = (look.arms === 'up' ? 2.7 : look.arms === 'out' ? out : rest) - pose.armL
    const right = (look.arms === 'up' ? -2.7 : -rest) + pose.armR
    return { left: left + (-1.1 - left) * pose.fold, right: right + (1.1 - right) * pose.fold }
  }

  /** A friend, with its feet at (0, 0), at the size it is stitched at. */
  drawFigure(g: Ctx, tally: Tally, look: Look): void {
    if (look.kind === 'pig') this.drawPig(g, tally, look)
    else if (look.kind === 'heron') this.drawHeron(g, tally, look)
    else this.drawGoat(g, tally, look)
  }

  private drawPig(g: Ctx, tally: Tally, look: Look): void {
    const pose = look.pose, c = look.colour, arm = this.arms(look, ARMS.pig[0], ARMS.pig[1])
    // The legs stay on the ground until the pig leaves it.
    this.put(g, tally, `pigLegs${c}`, 0, Math.min(0, pose.bob + 10), 75, 80)
    this.wear(g, look, 'legs')
    g.save()
    // The body turns at the hips, so it never comes away from its legs.
    g.translate(0, pose.bob - 76)
    g.rotate(pose.lean)
    g.scale(1 + pose.squash, 1 - pose.squash)
    g.translate(0, 76)
    this.put(g, tally, `pigTail${c}`, -96, -150, 44, 25, pose.tail * 0.6)
    this.put(g, tally, `pigArm${c}`, 86, -214, 20, 8, arm.right)
    this.put(g, tally, `pigBody${c}`, 0, -170, 116, 110)
    this.put(g, tally, `pigBelly${c}`, pose.own * 9, -150 + Math.abs(pose.own) * 3, 66, 58, pose.own * 0.06)
    this.hide(g, tally, look)
    this.wear(g, look, 'body')
    this.put(g, tally, `pigArm${c}`, -86, -214, 20, 8, arm.left)
    this.wear(g, look, 'body', true)
    g.translate(0, -252 - pose.neck)
    g.rotate(pose.head)
    this.put(g, tally, `pigEar${c}`, -44, -108, 27, 54, -0.35 - pose.ear)
    this.put(g, tally, `pigEar${c}`, 44, -108, 27, 54, 0.35 + pose.ear * 0.6, -1, 1)
    this.put(g, tally, `pigHead${c}`, 0, 0, 82, 136)
    this.eyes(g, tally, [[-27, -80], [27, -80]], 12, look.lx, look.ly, pose.blink, COAT.pig[c], 'dot')
    // The mouth: a smile under the snout, or an open one.
    g.beginPath()
    if (pose.jaw > 0.25) {
      g.ellipse(0, -12, 12, 3 + pose.jaw * 9, 0, 0, Math.PI * 2)
      g.fillStyle = '#7a2c3a'
      g.fill()
    } else {
      g.moveTo(-14, -14)
      g.quadraticCurveTo(0, -4, 14, -14)
      g.lineWidth = 3.4
      g.strokeStyle = '#7a2c3a'
      g.stroke()
    }
    tally.pen += 1
    this.wear(g, look, 'head')
    g.restore()
  }

  /** The heron: seen from the front, with its head turned to the left. */
  private drawHeron(g: Ctx, tally: Tally, look: Look): void {
    const pose = look.pose, c = look.colour, arm = this.arms(look, ARMS.heron[0], ARMS.heron[1])
    // The legs: thin, with a knee that bends backwards.
    g.beginPath()
    const leg = (hipX: number, lift: number) => {
      const footX = hipX + lift * 10, footY = -lift * 74, kneeX = hipX + 8 + lift * 26, kneeY = -66 - lift * 34
      g.moveTo(hipX, -150 + pose.bob)
      g.lineTo(kneeX, kneeY)
      g.lineTo(footX, footY)
      for (const toe of [-15, -4, 11]) {
        g.moveTo(footX, footY)
        g.lineTo(footX + toe - 5, footY + (lift > 0.5 ? 11 : 3))
      }
    }
    leg(-17, 0)
    leg(19, pose.leg)
    g.lineWidth = 8
    g.strokeStyle = '#d7a03c'
    g.stroke()
    tally.pen += 1
    this.wear(g, look, 'legs')

    g.save()
    g.translate(0, pose.bob - 150)
    g.rotate(pose.lean)
    g.translate(0, 150)
    this.put(g, tally, `heronWing${c}`, 50, -306, 30, 12, arm.right, -1, 1)
    this.put(g, tally, `heronBody${c}`, 0, -252, 68, 90)
    this.hide(g, tally, look)
    this.wear(g, look, 'body')
    this.put(g, tally, `heronWing${c}`, -50, -306, 30, 12, arm.left)
    this.wear(g, look, 'body', true)
    // The neck: an S that straightens as it stretches.
    const s = Math.max(0, Math.min(1, pose.own))
    const baseX = -6, baseY = -322, headX = -34 + 12 * s, headY = -390 - 98 * s - pose.neck
    g.beginPath()
    g.moveTo(baseX, baseY + 8)
    g.bezierCurveTo(baseX + 46 * (1 - s), baseY - 34, headX - 50 * (1 - s) + 30, headY + 50, headX + 14, headY + 6)
    g.lineWidth = 21
    g.strokeStyle = shade(COAT.heron[c], -0.45)
    g.stroke()
    g.lineWidth = 15
    g.strokeStyle = shade(COAT.heron[c], 0.2)
    g.stroke()
    tally.pen += 2
    g.translate(headX, headY)
    g.rotate(pose.head * 0.6)
    this.put(g, tally, `heronCrest${c}`, 18, -18, 4, 16, 0.25 - pose.ear * 0.5)
    this.put(g, tally, `heronJaw${c}`, -4, 8, 70, 4, -pose.jaw * 0.36)
    this.put(g, tally, `heronHead${c}`, 0, 0, 92, 38)
    this.eyes(g, tally, [[-6, -3]], 9, look.lx, look.ly, pose.blink, shade(COAT.heron[c], 0.5), 'dot')
    this.wear(g, look, 'head')
    g.restore()
  }

  private drawGoat(g: Ctx, tally: Tally, look: Look): void {
    const pose = look.pose, c = look.colour, arm = this.arms(look, ARMS.goat[0], ARMS.goat[1])
    g.save()
    // The goat leans from its hooves, legs and all, so the body never comes away from them.
    g.translate(0, pose.bob)
    g.rotate(pose.lean)
    this.put(g, tally, `goatLegs${c}`, 0, 0, 70, 86)
    this.wear(g, look, 'legs')
    g.translate(0, -80)
    g.scale(1 + pose.squash, 1 - pose.squash)
    g.translate(0, 80)
    this.put(g, tally, `goatTail${c}`, 86, -118, 16, 40, 0.5 + pose.tail * 0.8)
    this.put(g, tally, `goatArm${c}`, 78, -224, 17, 6, arm.right)
    // The neck at its stretch, behind the shoulders and behind the head it lifts: its foot stays under the body.
    if (pose.neck > 3) this.put(g, tally, `goatNeck${c}`, 0, -264 - pose.neck, GOAT_NECK / 2, 0)
    this.put(g, tally, `goatBody${c}`, 0, -74, 102, 206)
    this.hide(g, tally, look)
    this.wear(g, look, 'body')
    this.put(g, tally, `goatArm${c}`, -78, -224, 17, 6, arm.left)
    this.wear(g, look, 'body', true)
    g.translate(0, -262 - pose.neck)
    g.rotate(pose.head)
    this.put(g, tally, `goatEar${c}`, -44, -66, 64, 16, -0.2 - pose.ear * 0.7)
    this.put(g, tally, `goatEar${c}`, 44, -66, 64, 16, 0.2 + pose.ear * 0.7, -1, 1)
    this.put(g, tally, `goatBeard${c}`, pose.jaw * 5, 0, 20, 4, pose.own * 0.5)
    this.put(g, tally, `goatHead${c}`, 0, 0, 95, 166)
    this.put(g, tally, `goatMuzzle${c}`, pose.jaw * 7, -22, 38, 24)
    this.eyes(g, tally, [[-27, -66], [27, -66]], 12, look.lx, look.ly * 0.6, pose.blink, COAT.goat[c], 'bar')
    this.wear(g, look, 'head')
    g.restore()
  }

  /** The cat, sitting with the middle of its seat at (0, 0). `hangs` draws it held by the scruff, its tail a pendulum. */
  drawCat(g: Ctx, tally: Tally, pose: Pose, lx: number, ly: number, core: boolean, hangs = false, tuck = 0): void {
    // The tail hangs down and swings. Tucked, it hangs from its own crook beside the body.
    g.beginPath()
    g.moveTo(-34, -8)
    if (hangs) {
      const [, a, b, end] = hungTail(tuck, pose.tail)
      g.bezierCurveTo(a[0], a[1], b[0], b[1], end[0], end[1])
      // Hung by the scruff or held in the hand, its hind legs dangle: stitched in the same pass as the tail, so they are striped as it is.
      const reach = hungLegs(tuck)
      g.moveTo(-16, -8); g.lineTo(-18, reach)
      g.moveTo(16, -8); g.lineTo(18, reach)
    } else g.quadraticCurveTo(-46 + pose.tail * 10, 30, -38 + pose.tail * 34, 62)
    g.lineWidth = HUNG.thick
    g.strokeStyle = CAT_FUR
    g.stroke()
    tally.pen += 1
    if (core) {
      g.strokeStyle = shade(CAT_FUR, -0.35)
      g.setLineDash([5, 13])
      g.stroke()
      g.setLineDash([])
      tally.pen += 1
    }
    g.save()
    g.scale(1 + pose.squash, 1 - pose.squash)
    this.put(g, tally, 'catBody', 0, 0, 62, 100)
    g.translate(0, -84)
    g.rotate(pose.head)
    // The ears turn at their roots: pricked above 0, and laid back flat to the sides at -1.
    this.put(g, tally, 'catEar', 26, -31, 20, 33, -pose.ear * CAT_EAR)
    this.put(g, tally, 'catEar', -26, -31, 20, 33, pose.ear * CAT_EAR, -1, 1)
    this.put(g, tally, 'catHead', 0, 0, 48, 64)
    this.eyes(g, tally, [[-15, -18], [15, -18]], 8.5, lx, ly, hangs ? 0 : pose.blink, CAT_FUR, hangs ? 'bar' : 'slit')
    if (pose.jaw > 0.3) {
      g.beginPath()
      g.ellipse(0, 8, 5, 2 + pose.jaw * 5, 0, 0, Math.PI * 2)
      g.fillStyle = '#c9647a'
      g.fill()
      tally.pen += 1
    }
    g.rotate(-pose.head)
    g.translate(0, 84)
    // Hung, both its paws dangle with its legs: the paw it licks is drawn only while it sits.
    if (!hangs) this.put(g, tally, 'catPaw', 20, -56, 13, 6, pose.own * 2.5)
    g.restore()
  }
}
