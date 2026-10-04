import { bellows, cutPiece, lathe, mirror, oval, paintSheet, seedFor, shade, soften, type Pt, type Sprite } from './tissue'
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
export const WIDE: Readonly<Record<Kind, number>> = { pip: 1.23, tok: 1.05, hoom: 1.38, brrl: 0.78, wheep: 0.82, dooo: 0.78 }

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
type Kit = { parts: Part[]; /** How far the face slides for a full turn. */ face: number; /** The pieces on top of its head that a little one sitting there takes the place of: they are not drawn under a rider. */ under?: readonly number[] }

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
    // A short tail low at its back, under where the wing on that side hangs: a long spike there lay across the wing.
    part('deep', [[0.04, -0.06, 1], [-0.2, -0.02, 1], [0.04, 0.06, 1]], [-0.2, -0.08], { role: 'tail' }),
    ...both(part('deep', [[-0.05, 0, 1], [0.02, -0.1, 1], [0.17, 0, 1]], [0.13, -0.01], { role: 'foot' })),
    part('body', soften(lathe([[-1.06, 0, 1], [-0.84, 0.08], [-0.62, 0.2], [-0.4, 0.3], [-0.21, 0.34], [-0.08, 0.3], [-0.02, 0.17], [-0.01, 0]]), 2), [0, 0]),
    ...both(part('deep', [[-0.05, 0, 1], [0.055, -0.01, 1], [0, 0.34, 1]], [0.29, -0.36], { role: 'wing', swing: [-0.75, -2], thin: true })),
    ...eyes(0.12, -0.56, 0.098),
    part('deep', [[-0.07, 0, 1], [0.07, -0.1, 1], [0.46, 0.03, 1], [0.07, 0.11, 1]], [0.03, -0.4], { role: 'beak' }),
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
  // Middle-sized and springy: a bean on two springs, with one more spring on its head. Each spring is a bellows,
  // a solid column that is wide and narrow by turns and the same on both sides: a spring cut as a zigzag strip
  // showed three or four strokes wherever something stood in front of part of it, and those can be read as a
  // letter. Its arms are plain flaps.
  // The spring on its head and the bobble are left out under a rider, who sits where they were.
  wheep: { face: 0.06, under: [4, 5], parts: [
    ...feet(0.14, 0.1, 0.04),
    ...both(part('deep', bellows(0.38, 0.07, 8), [0.12, -0.42])),
    part('deep', up(bellows(0.24, 0.045, 8)), [0, -0.95], { role: 'ear', swing: [0.1, 0.6] }),
    part('light', round(0.05, 0.05, 0, -0.275), [0, 0], { on: 4 }),
    part('body', soften(lathe([[-1, 0], [-0.98, 0.15], [-0.86, 0.27], [-0.68, 0.3], [-0.5, 0.26], [-0.39, 0.15], [-0.37, 0]]), 2), [0, 0]),
    ...both(part('deep', leaf(0.31, 0.055), [0.27, -0.66], { role: 'wing', swing: [-0.4, -1.85], thin: true })),
    ...eyes(0.105, -0.76, 0.088),
    part('deep', round(0.04, 0.03), [0, -0.64], { role: 'face' }),
  ] },
  // Middle-sized and droopy: a pear that has settled, with ears, arms and a nose that all hang. The ears are
  // broad flaps that hang close and lift only a little, so that they stay within its own outline, or all but: a
  // long strip that swings far out lies across whoever stands beside it, and two bars that cross are a sign.
  dooo: { face: 0.05, parts: [
    ...feet(0.15, 0.13),
    part('body', soften(lathe([[-0.9, 0], [-0.88, 0.13], [-0.76, 0.2], [-0.55, 0.22], [-0.33, 0.28], [-0.13, 0.33], [-0.03, 0.27], [-0.03, 0]]), 2), [0, 0]),
    // The arms are short and hang from low on its sides, so that an arm held out is seen whole under a lifted ear
    // and neither lies across the other.
    ...both(part('deep', leaf(0.52, 0.12), [0.17, -0.84], { role: 'ear', swing: [-0.3, -0.58], thin: true })),
    ...both(part('deep', leaf(0.2, 0.045), [0.26, -0.22], { role: 'wing', swing: [-0.08, -1.7], thin: true })),
    ...eyes(0.095, -0.7, 0.08),
    // Heavy lids that slope down and out: sleepy, never cross.
    ...both(part('body', tilt(round(0.105, 0.05, 0, -0.055), 0.32), [0.095, -0.7], { role: 'face' })),
    part('deep', leaf(0.27, 0.058), [0, -0.64], { role: 'face' }),
  ] },
}

/** Where one piece lies: its joint in design pixels from the figure's feet, how far it is turned, mirrored or not, and squashed (a shut eye) or not. */
export type Joint = { x: number; y: number; turn: number; flip: 1 | -1; squash: number }

/** The pose as cut-out animation has it: every piece of a kind laid on its joint, in drawing order. No piece changes shape. */
export function arrange(kind: Kind, size: number, pose: Pose): Joint[] {
  const kit = KITS[kind], joints: Joint[] = []
  const towards = Math.sign(pose.reach), far = Math.abs(pose.reach), slide = pose.turn * kit.face
  for (const piece of kit.parts) {
    const side = piece.side ?? 1, [rest, out] = piece.swing ?? [0, 0]
    let [ax, ay] = piece.at, angle = 0, flip: 1 | -1 = 1, squash = 1
    if (piece.role === 'wing') {
      // Held out to both sides each wing lifts on its own side. Held out towards something, both point that way:
      // the near one a little up, and the far one, its shoulder come round to the front and lower, a little down,
      // so that the two open towards the thing like arms.
      const open = side * (rest + (out - rest) * pose.wings), reaching = towards * out * (side === towards ? 1.12 : 0.84) * pose.wings
      angle = open + (reaching - open) * far
      if (towards !== 0 && side !== towards) { ax += towards * far * Math.abs(ax) * 1.82; ay += far * 0.14 }
    } else if (piece.role === 'ear') angle = side * (rest + (out - rest) * Math.max(0, side * pose.turn))
    else if (piece.role === 'neck') angle = pose.turn * 0.14
    else if (piece.role === 'face' || piece.role === 'eye') ax += slide
    else if (piece.role === 'pupil') ax += slide * 1.5
    else if (piece.role === 'beak' || piece.role === 'tail') { flip = pose.turn < 0 ? -1 : 1; ax = ax * flip + (piece.role === 'beak' ? slide : 0) }
    if (piece.role === 'eye' || piece.role === 'pupil') squash = Math.max(0.1, 1 - pose.blink)
    // Feet stay flat on the ground when the body tips.
    const on = piece.on === undefined ? { x: 0, y: 0, turn: piece.role === 'foot' ? 0 : pose.lean } : joints[piece.on]
    const cos = Math.cos(on.turn), sin = Math.sin(on.turn)
    joints.push({ x: on.x + (ax * cos - ay * sin) * size, y: on.y + (ax * sin + ay * cos) * size, turn: on.turn + angle, flip, squash })
  }
  return joints
}

/** The outline of every piece of a posed figure, in design pixels from its feet: what the figure covers, for a test or a later stage that asks what a finger hit. */
export function outlines(kind: Kind, size: number, pose: Pose): Pt[][] {
  const joints = arrange(kind, size, pose)
  return KITS[kind].parts.map((piece, i) => {
    const { x, y, turn, flip, squash } = joints[i], cos = Math.cos(turn), sin = Math.sin(turn)
    return piece.cut.map(([px, py]) => [x + (px * flip * cos - py * squash * sin) * size, y + (px * flip * sin + py * squash * cos) * size] as const)
  })
}

/** A sheet is painted this many pixels square and stands for this many design pixels of tissue. */
const SHEET = { pixels: 512, span: 300 } as const
const INK: Readonly<Record<'white' | 'dark', string>> = { white: '#fbf6e9', dark: '#2c2432' }

/** The sizes pieces are cut at, in design pixels of a figure's height: a little one riding, a little one or a small grown one, a big grown one. */
export const CUT_SIZES = [80, 136, 208] as const

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
    const key = tone === 'white' || tone === 'dark' ? tone : `${kind}/${tone}/${which % 2}`
    let sheet = this.sheets.get(key)
    if (!sheet) {
      const hex = tone === 'white' || tone === 'dark' ? INK[tone] : tone === 'deep' ? shade(HUES[kind], -4, -0.1) : tone === 'light' ? shade(HUES[kind], 6, 0.13) : HUES[kind]
      sheet = paintSheet(hex, seedFor(this.seed, key), SHEET.pixels, SHEET.pixels, { drama: tone === 'white' || tone === 'dark' ? 0.4 : 1, broad: 1 })
      this.sheets.set(key, sheet)
    }
    return sheet
  }

  /**
   * The pieces of a kind, cut for a figure of about this size. Pieces are cut at a few sizes only (`CUT_SIZES`)
   * and laid down a little smaller where a figure stands between two of them: someone who walks up the hill
   * and shrinks on the way is laid from pieces already cut, and never cut again.
   */
  private pieces(kind: Kind, size: number): Sprite[] {
    const cut = CUT_SIZES.find((one) => one >= size) ?? CUT_SIZES[CUT_SIZES.length - 1], key = `${kind}/${cut}`
    let pieces = this.cuts.get(key)
    if (!pieces) {
      pieces = KITS[kind].parts.map((piece, i) => {
        const small = piece.role === 'eye' || piece.role === 'pupil'
        return cutPiece(this.sheet(kind, piece.tone, i), piece.cut, seedFor(this.seed, `${kind}/${i}`), {
          scale: cut * this.k, spread: (this.k * SHEET.span) / SHEET.pixels, facet: (small ? 5 : 12) / cut, wobble: (small ? 0.7 : 1.1) / cut, alpha: piece.thin ? 0.88 : 1,
        })
      })
      this.cuts.set(key, pieces)
    }
    return pieces
  }

  /**
   * Cuts one kind at one size that has not been cut yet, and says whether there was one. A frame calls it once,
   * after it has drawn, until everything is cut: the page is up at once, and within the first moments of a
   * visit nothing that walks, grows or shrinks ever has to be cut in the middle of play.
   */
  warm(): boolean {
    for (const kind of Object.keys(KITS) as Kind[]) for (const cut of CUT_SIZES) {
      if (this.cuts.has(`${kind}/${cut}`)) continue
      this.pieces(kind, cut)
      return true
    }
    return false
  }

  /**
   * Lays one of a kind on the surface with its feet at `x`, `y`, `size` design pixels tall. `body` stretches the
   * whole figure about its feet: across (a negative `sx` turns it over, as a cut-out is flipped) and upwards.
   * With `carrying`, a little one sits on its head, and what grows out of the top of the head is left out.
   * Returns how many pieces it drew. Leaves the context's transform changed.
   */
  draw(ctx: CanvasRenderingContext2D, kind: Kind, x: number, y: number, size: number, pose: Pose, body: { sx: number; sy: number } = { sx: 1, sy: 1 }, carrying = false): number {
    const pieces = this.pieces(kind, size), unit = size * this.k, under = carrying ? KITS[kind].under ?? [] : []
    arrange(kind, size, pose).forEach((joint, i) => {
      if (under.includes(i)) return
      const cos = Math.cos(joint.turn) * unit, sin = Math.sin(joint.turn) * unit, sprite = pieces[i]
      ctx.setTransform(body.sx * cos * joint.flip, body.sy * sin * joint.flip, -body.sx * sin * joint.squash, body.sy * cos * joint.squash, (x + joint.x * body.sx) * this.k + this.left, (y + joint.y * body.sy) * this.k + this.top)
      ctx.drawImage(sprite.canvas, sprite.x, sprite.y, sprite.w, sprite.h)
    })
    return pieces.length - under.length
  }
}
