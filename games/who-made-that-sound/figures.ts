import { cutPiece, lathe, mirror, oval, paintSheet, seedFor, shade, soften, zigzag, type Pt, type Sprite } from './tissue'
import type { Kind } from './voices'

// The six kinds as cut-out figures. Each is a handful of pieces of its own
// hue of tissue, and each piece turns on a joint, so a later stage moves a
// figure the way cut-out animation does: whole pieces, never a redrawn shape.
// A kind is told from the others by its outline first and its hue second.
// A piece is measured in body heights from the figure's feet, y upwards
// negative, and drawn at whatever size it is asked for.

/** One bright hue for each kind. None is the hill's, the ground's or the eggs'. */
export const HUES: Readonly<Record<Kind, string>> = { pip: '#f6b100', tok: '#e63e2b', hoom: '#2d6fdb', brrl: '#8d4bd0', wheep: '#ee4c9b', dooo: '#1cc4cf' }

/** How tall a grown one stands, in design pixels. A little one is the same figure at `LITTLE` of that. */
export const GROWN: Readonly<Record<Kind, number>> = { pip: 118, tok: 126, hoom: 206, brrl: 250, wheep: 184, dooo: 172 }
export const LITTLE = 0.55
/** How wide each kind is for its height, for whoever lays figures out side by side. */
export const WIDE: Readonly<Record<Kind, number>> = { pip: 1.22, tok: 1.05, hoom: 1.42, brrl: 0.74, wheep: 0.8, dooo: 1 }

export type Pose = {
  /** 0 with the wings at rest, 1 with them held out. */
  wings: number
  /** 0 holds the wings out to both sides; 1 or -1 holds both out to that one side, towards something. */
  reach: number
  /** -1 to 1: the face, and the ear that listens, turned to that side. */
  turn: number
  /** 0 with the eyes open, 1 shut. */
  blink: number
  /** The body tipped about its feet, in radians. */
  lean: number
}
export const AT_REST: Pose = { wings: 0, reach: 0, turn: 0, blink: 0, lean: 0 }

type Tone = 'body' | 'deep' | 'light' | 'white' | 'dark'
type Role = 'foot' | 'wing' | 'ear' | 'neck' | 'face' | 'eye' | 'pupil' | 'beak' | 'tail'
type Part = {
  tone: Tone
  /** The outline about the joint it turns on. */
  cut: Pt[]
  /** The joint, from the figure's feet or from the joint of the part it is `on`. */
  at: Pt
  role?: Role
  on?: number
  side?: 1 | -1
  /** A wing's or an ear's angle at rest and when out, as on the right side; the left mirrors it. */
  swing?: readonly [number, number]
  /** Thin tissue: what it overlaps shows through a little, which is the only thing that sets a wing off from the body. */
  thin?: boolean
}
type Kit = { parts: Part[]; /** How far the face slides for a full turn. */ face: number }

const part = (tone: Tone, cut: Pt[], at: Pt, more: Partial<Part> = {}): Part => ({ tone, cut, at, ...more })
const both = (one: Part): Part[] => [{ ...one, cut: mirror(one.cut), at: [-one.at[0], one.at[1]], side: -1 }, { ...one, side: 1 }]
const round = (rx: number, ry: number, cx = 0, cy = 0) => soften(oval(rx, ry, cx, cy), 2)
/** A leaf hanging from its joint: `long` down, `half` at its widest. */
const leaf = (long: number, half: number) => soften(lathe([[-0.02, half * 0.4], [long * 0.3, half * 0.92], [long * 0.66, half], [long * 0.94, half * 0.5], [long, 0]]), 2)
const tilt = (cut: Pt[], by: number): Pt[] => cut.map(([x, y, sharp]) => [x * Math.cos(by) - y * Math.sin(by), x * Math.sin(by) + y * Math.cos(by), sharp] as const)
const up = (cut: Pt[]) => tilt(cut, Math.PI)
const feet = (x: number, rx: number, ry = 0.045) => both(part('deep', round(rx, ry), [x, -0.03], { role: 'foot' }))
/** Two eyes: a white dot and a dark dot each, big enough to read across a room. */
const eyes = (x: number, y: number, r: number, on?: number) => [
  ...both(part('white', round(r, r * 1.06), [x, y], { role: 'eye', on })),
  ...both(part('dark', round(r * 0.5, r * 0.54), [x, y], { role: 'pupil', on })),
]

const KITS: Readonly<Record<Kind, Kit>> = {
  // Tiny and round: a ball with two round eyes, and everything on it round.
  pip: { face: 0.09, parts: [
    part('deep', up(leaf(0.2, 0.05)), [0.02, -0.9], { role: 'ear', swing: [0.2, 0.7] }),
    ...feet(0.2, 0.13, 0.055),
    part('body', round(0.5, 0.47, 0, -0.5), [0, 0]),
    ...both(part('deep', leaf(0.27, 0.11), [0.44, -0.5], { role: 'wing', swing: [-0.5, -1.95], thin: true })),
    ...eyes(0.17, -0.6, 0.118),
    part('deep', round(0.06, 0.042), [0, -0.46], { role: 'face' }),
  ] },
  // Tiny and pointed: a drop with a spike for a top, a long sharp beak, and corners wherever pip has curves.
  tok: { face: 0.07, parts: [
    part('deep', [[0.04, -0.1, 1], [-0.36, -0.03, 1], [0.04, 0.09, 1]], [-0.22, -0.2], { role: 'tail' }),
    ...both(part('deep', [[-0.05, 0, 1], [0.02, -0.1, 1], [0.17, 0, 1]], [0.13, -0.01], { role: 'foot' })),
    part('body', soften(lathe([[-1.04, 0, 1], [-0.82, 0.08], [-0.6, 0.2], [-0.36, 0.31], [-0.16, 0.34], [-0.05, 0.27], [-0.03, 0]]), 2), [0, 0]),
    ...both(part('deep', [[-0.06, -0.02, 1], [0.07, -0.02, 1], [0.01, 0.27, 1]], [0.26, -0.45], { role: 'wing', swing: [-0.22, -1.9], thin: true })),
    ...eyes(0.125, -0.52, 0.098),
    part('deep', [[0, -0.075, 1], [0.4, 0.03, 1], [0, 0.08, 1]], [0.1, -0.38], { role: 'beak' }),
  ] },
  // Big and wide: a dome broader than it is tall, small eyes far apart, two round ears and paddles for wings.
  hoom: { face: 0.1, parts: [
    ...both(part('deep', round(0.09, 0.11, 0, -0.07), [0.35, -0.75], { role: 'ear', swing: [0.2, 0.85] })),
    ...feet(0.27, 0.15, 0.05),
    part('body', soften(lathe([[-0.88, 0], [-0.87, 0.2], [-0.78, 0.42], [-0.58, 0.56], [-0.32, 0.62], [-0.1, 0.6], [-0.02, 0.46], [-0.02, 0]]), 3), [0, 0]),
    part('light', round(0.36, 0.26), [0, -0.31]),
    ...both(part('deep', leaf(0.47, 0.13), [0.53, -0.5], { role: 'wing', swing: [-0.12, -1.75], thin: true })),
    ...eyes(0.21, -0.64, 0.088),
    part('deep', round(0.07, 0.045), [0, -0.55], { role: 'face' }),
  ] },
  // Big, with a long neck: a low body, and a small head a long way above it.
  brrl: { face: 0.035, parts: [
    ...feet(0.15, 0.11, 0.04),
    part('body', soften(lathe([[-0.56, 0.055], [-0.3, 0.06], [-0.06, 0.095], [0.05, 0.08]]), 2), [0, -0.36], { role: 'neck' }),
    part('body', round(0.33, 0.22, 0, -0.25), [0, 0]),
    ...both(part('deep', leaf(0.25, 0.09), [0.26, -0.3], { role: 'wing', swing: [-0.3, -1.85], thin: true })),
    ...both(part('deep', up(leaf(0.12, 0.04)), [0.09, -0.6], { role: 'ear', on: 2, swing: [0.5, 1.2] })),
    part('body', round(0.175, 0.135, 0, -0.02), [0, -0.52], { on: 2 }),
    ...eyes(0.075, -0.055, 0.062, 8),
    part('deep', round(0.085, 0.045), [0, 0.055], { role: 'face', on: 8 }),
  ] },
  // Middle-sized and springy: a bean on two springs, with a spring for each arm and one on its head.
  wheep: { face: 0.06, parts: [
    ...feet(0.14, 0.1, 0.04),
    ...both(part('deep', zigzag(0.38, 0.05, 5, 0.055), [0.12, -0.42])),
    part('deep', up(zigzag(0.19, 0.04, 4, 0.045)), [0, -0.95], { role: 'ear', swing: [0.1, 0.6] }),
    part('light', round(0.055, 0.055, 0, -0.22), [0, 0], { on: 4 }),
    part('body', soften(lathe([[-1, 0], [-0.98, 0.15], [-0.86, 0.27], [-0.68, 0.3], [-0.5, 0.26], [-0.39, 0.15], [-0.37, 0]]), 2), [0, 0]),
    ...both(part('deep', zigzag(0.23, 0.04, 3, 0.05), [0.26, -0.66], { role: 'wing', swing: [-0.4, -1.85] })),
    ...eyes(0.105, -0.76, 0.088),
    part('deep', round(0.04, 0.03), [0, -0.64], { role: 'face' }),
  ] },
  // Middle-sized and droopy: a pear that has settled, with ears, arms and a nose that all hang.
  dooo: { face: 0.05, parts: [
    ...feet(0.15, 0.13),
    part('body', soften(lathe([[-0.9, 0], [-0.88, 0.13], [-0.76, 0.2], [-0.55, 0.22], [-0.33, 0.28], [-0.13, 0.33], [-0.03, 0.27], [-0.03, 0]]), 2), [0, 0]),
    ...both(part('deep', leaf(0.28, 0.045), [0.25, -0.46], { role: 'wing', swing: [-0.08, -1.7], thin: true })),
    ...both(part('deep', leaf(0.66, 0.1), [0.19, -0.84], { role: 'ear', swing: [-0.3, -1.25], thin: true })),
    ...eyes(0.095, -0.7, 0.08),
    // Heavy lids that slope down and out: sleepy, never cross.
    ...both(part('body', tilt(round(0.105, 0.05, 0, -0.055), 0.32), [0.095, -0.7], { role: 'face' })),
    part('deep', leaf(0.27, 0.058), [0, -0.64], { role: 'face' }),
  ] },
}

/** A sheet is painted this many pixels square and stands for this many design pixels of tissue. */
const SHEET = { pixels: 512, span: 300 } as const
const INK: Readonly<Record<'white' | 'dark', string>> = { white: '#fbf6e9', dark: '#2c2432' }

export class Figures {
  /** Device pixels for each design pixel, and where the design's 0,0 lands on the surface. */
  private k = 1
  private left = 0
  private top = 0
  private sheets = new Map<string, HTMLCanvasElement>()
  private cuts = new Map<string, Sprite[]>()

  constructor(private seed: number) {}

  /** Sets how the design lies on the surface. Pieces cut for another scale are thrown away; the painted sheets are kept. */
  fit(k: number, left: number, top: number) {
    if (k !== this.k) this.cuts.clear()
    this.k = k; this.left = left; this.top = top
  }

  private sheet(kind: Kind, tone: Tone, which: number): HTMLCanvasElement {
    const key = tone === 'white' || tone === 'dark' ? tone : `${kind}/${tone}/${which % 3}`
    let sheet = this.sheets.get(key)
    if (!sheet) {
      const hex = tone === 'white' || tone === 'dark' ? INK[tone] : tone === 'deep' ? shade(HUES[kind], -4, -0.1) : tone === 'light' ? shade(HUES[kind], 6, 0.13) : HUES[kind]
      sheet = paintSheet(hex, seedFor(this.seed, key), SHEET.pixels, SHEET.pixels, { drama: tone === 'white' || tone === 'dark' ? 0.4 : 1, broad: 1 })
      this.sheets.set(key, sheet)
    }
    return sheet
  }

  private pieces(kind: Kind, size: number): Sprite[] {
    const scale = size * this.k, key = `${kind}/${Math.round(scale * 4)}`
    let pieces = this.cuts.get(key)
    if (!pieces) {
      pieces = KITS[kind].parts.map((piece, i) => {
        const small = piece.role === 'eye' || piece.role === 'pupil'
        return cutPiece(this.sheet(kind, piece.tone, i), piece.cut, seedFor(this.seed, `${kind}/${i}`), {
          scale, spread: (this.k * SHEET.span) / SHEET.pixels, facet: (small ? 5 : 12) / size, wobble: (small ? 0.7 : 1.1) / size, alpha: piece.thin ? 0.88 : 1,
        })
      })
      this.cuts.set(key, pieces)
    }
    return pieces
  }

  /** Lays one of a kind on the surface with its feet at `x`, `y`, `size` design pixels tall. Returns how many pieces it drew. Leaves the context's transform changed. */
  draw(ctx: CanvasRenderingContext2D, kind: Kind, x: number, y: number, size: number, pose: Pose): number {
    const kit = KITS[kind], pieces = this.pieces(kind, size), unit = size * this.k
    const placed: [number, number, number][] = []
    const towards = Math.sign(pose.reach), far = Math.abs(pose.reach), slide = pose.turn * kit.face
    kit.parts.forEach((piece, i) => {
      const side = piece.side ?? 1, [rest, out] = piece.swing ?? [0, 0]
      let [ax, ay] = piece.at, angle = 0, flip = 1, squash = 1
      if (piece.role === 'wing') {
        // Held out to both sides each wing lifts on its own side. Held out towards something, both point that way:
        // the near one a little up, and the far one, its shoulder come round to the front and lower, a little down,
        // so that the two open towards the thing like arms.
        const open = side * (rest + (out - rest) * pose.wings), reaching = towards * out * (side === towards ? 1.08 : 0.62) * pose.wings
        angle = open + (reaching - open) * far
        if (towards !== 0 && side !== towards) { ax += towards * far * Math.abs(ax) * 1.82; ay += far * 0.2 }
      } else if (piece.role === 'ear') angle = side * (rest + (out - rest) * Math.max(0, side * pose.turn))
      else if (piece.role === 'neck') angle = pose.turn * 0.14
      else if (piece.role === 'face' || piece.role === 'eye') ax += slide
      else if (piece.role === 'pupil') ax += slide * 1.5
      else if (piece.role === 'beak' || piece.role === 'tail') { flip = pose.turn < 0 ? -1 : 1; ax = ax * flip + (piece.role === 'beak' ? slide : 0) }
      if (piece.role === 'eye' || piece.role === 'pupil') squash = Math.max(0.1, 1 - pose.blink)
      // Feet stay flat on the ground when the body tips.
      const [px, py, pa] = piece.on === undefined ? [0, 0, piece.role === 'foot' ? 0 : pose.lean] : placed[piece.on]
      const wx = px + (ax * Math.cos(pa) - ay * Math.sin(pa)) * size, wy = py + (ax * Math.sin(pa) + ay * Math.cos(pa)) * size, turned = pa + angle
      placed.push([wx, wy, turned])
      const cos = Math.cos(turned) * unit, sin = Math.sin(turned) * unit, sprite = pieces[i]
      ctx.setTransform(cos * flip, sin * flip, -sin * squash, cos * squash, (x + wx) * this.k + this.left, (y + wy) * this.k + this.top)
      ctx.drawImage(sprite.canvas, sprite.x, sprite.y, sprite.w, sprite.h)
    })
    return kit.parts.length
  }
}
