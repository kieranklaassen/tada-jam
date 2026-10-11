import { CLOUDS, DOOR, HENHOUSE, HOME, POST, STEP, WALLOW } from './layout'
import { STAGE } from './stage'

// The look: a lift-the-flap board book. Every moving thing is a piece of thick
// glossy card with a grey board edge showing along its lower right, a small
// soft shadow under it and a streak of laminate gloss across it, printed in
// flat bold colour with no outline. The page behind is printed the same way.
// A piece is painted once into a canvas of its own and stamped from then on.
// Nothing here knows the rules: the view asks for a piece by name.

export type Ctx = CanvasRenderingContext2D
/** What a piece is painted into: a canvas, or a stand-in for one where there is none. */
export type Surface = { width: number; height: number; getContext(kind: '2d'): unknown }

let make = (width: number, height: number): Surface => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/** Where canvases come from. A test hands in a maker of stand-ins, and counts what was asked for. */
export function useCanvases(maker: (width: number, height: number) => Surface): void {
  make = maker
}

/**
 * A copy of something painted, under one flat wash kept to what is painted: the same card in another light. The
 * night's ground and the night's pieces are made this way, once, and stamped in place of the day's.
 */
export function washed(image: Surface, wash: string): Surface {
  const copy = make(image.width, image.height)
  const c = copy.getContext('2d') as Ctx
  c.drawImage(image as CanvasImageSource, 0, 0)
  c.globalCompositeOperation = 'source-atop'
  c.fillStyle = wash
  c.fillRect(0, 0, image.width, image.height)
  return copy
}

/** A painted piece: the canvas, and where it lies round its own origin, in stage units. */
export type Sheet = { image: Surface; x: number; y: number; w: number; h: number }

export const stamp = (ctx: Ctx, sheet: Sheet): void => ctx.drawImage(sheet.image as CanvasImageSource, sheet.x, sheet.y, sheet.w, sheet.h)

export const INK = {
  sky: '#8fd3f4', skyLow: '#c4e8fa', hillFar: '#86d171', hillNear: '#5dbb55', tree: '#3d9a4c', trunk: '#8a5a34',
  yard: '#f3cf78', yardDab: '#e6b85c', yardPale: '#f8dd97', fence: '#fffaf0', fenceShade: '#d9cdb4',
  barn: '#d9432f', barnLine: '#bf3521', trim: '#fff6e6', roof: '#74475a', roofLine: '#5e3848', inside: '#3a2630', straw: '#e2ae2e',
  door: '#f6c445', doorLine: '#dba42a', knob: '#d9432f', rail: '#565664',
  step: '#fcf4de', stepEdge: '#e4d6b0', sack: '#d8c296', sackLine: '#bfa672', pump: '#7ea08d', pumpDark: '#62836f', heap: '#ecd58e',
  wood: '#b0723a', woodDark: '#8a5527', mudDry: '#c99b6c', mudCrack: '#a97c50', mudWet: '#6f4429', mudShine: '#a8774f',
  edge: '#a99e8e', shadow: 'rgba(64,40,18,0.32)',
  pony: '#c9823f', ponyDark: '#a7682f', ponyMane: '#57361f', muzzle: '#f4dfbd', lip: '#eab4a0', hoof: '#4a2f1d', dust: '#d9d0bf',
  goat: '#f6f0e2', goatPatch: '#c9a377', goatDark: '#8f8172', horn: '#9a8f86', goatEye: '#f2bf3f', goatNose: '#e8a9a4',
  pig: '#f6a9b9', pigDark: '#e8899f', pigBelly: '#fbc8d2', pigNose: '#b85f77', pigHoof: '#7c4a55',
  henWhite: '#fff8ea', henWhiteShade: '#eadcc2', henRusset: '#cc6630', henRussetShade: '#a84e22', henBlack: '#33303b', henBlackShade: '#1f1d26',
  comb: '#e2382c', beak: '#f6a21e', leg: '#f08a24',
  scoop: '#5d7fa6', scoopDark: '#48668a', grain: '#e9b53a', bucket: '#2f80d2', bucketDark: '#2567ad', water: '#a4dcff', drop: '#5db8f2',
  bristle: '#3b3039', tine: '#8b9099', hay: '#f2c94c', hayDark: '#d6a326',
  cat: '#f08b3c', catDark: '#c96a22', catEye: '#b6e36a', sun: '#ffd43f', ray: '#ffb405', cheek: '#f58a7a', cloud: '#ffffff',
  eye: '#ffffff', pupil: '#2a1d1d', table: '#6a4c3a',
} as const

// --- Shapes ----------------------------------------------------------------------------------

/** A closed soft shape through the points given as x, y, x, y: rounded at every corner. */
export function blob(ctx: Ctx, points: readonly number[]): void {
  const n = points.length / 2
  const at = (i: number): [number, number] => { const j = ((i % n) + n) % n; return [points[j * 2], points[j * 2 + 1]] }
  ctx.beginPath()
  const [x0, y0] = at(0), [xn, yn] = at(n - 1)
  ctx.moveTo((x0 + xn) / 2, (y0 + yn) / 2)
  for (let i = 0; i < n; i++) {
    const [x, y] = at(i), [nx, ny] = at(i + 1)
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2)
  }
  ctx.closePath()
}

const fill = (ctx: Ctx, colour: string): void => { ctx.fillStyle = colour; ctx.fill() }
const shape = (ctx: Ctx, colour: string, points: readonly number[]): void => { blob(ctx, points); fill(ctx, colour) }
const oval = (ctx: Ctx, colour: string, x: number, y: number, rx: number, ry: number, turn = 0): void => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2); fill(ctx, colour) }
function box(ctx: Ctx, colour: string, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  fill(ctx, colour)
}
function line(ctx: Ctx, colour: string, width: number, points: readonly number[]): void {
  ctx.beginPath()
  ctx.moveTo(points[0], points[1])
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1])
  ctx.strokeStyle = colour
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

/** The near row of hills, which the page prints and the sun sets behind. */
const NEAR_HILL: readonly number[] = [-2400, 420, -2400, 300, -200, 292, 240, 300, 470, 268, 700, 300, 900, 262, 1100, 296, 1300, 270, STAGE.width + 2400, 290, STAGE.width + 2400, 420]
/** Where the hill piece lies, and how far down the sky reaches behind it: the yard starts here. */
export const HORIZON = { left: 690, right: 920, top: 250, yard: 338 }

/** A small stream of chance for printed dabs and straws, so the page is the same every time. */
function chance(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- A piece of card ---------------------------------------------------------------------------

const PAD = 16

/**
 * One piece of thick card. `bounds` is the box the painting fits in, round the piece's own origin, as left, top,
 * right, bottom. The piece gets its gloss, its grey board edge down and to the right, and its shadow. `k` is how
 * many pixels a stage unit is.
 */
export function card(k: number, bounds: readonly [number, number, number, number], paint: (ctx: Ctx) => void, thick = 5, gloss = true): Sheet {
  const [x0, y0, x1, y1] = bounds
  const w = x1 - x0 + PAD * 2, h = y1 - y0 + PAD * 2
  const pw = Math.max(1, Math.ceil(w * k)), ph = Math.max(1, Math.ceil(h * k))
  const top = make(pw, ph)
  const t = top.getContext('2d') as Ctx
  t.setTransform(k, 0, 0, k, (PAD - x0) * k, (PAD - y0) * k)
  paint(t)
  if (gloss) {
    // The laminate: one pale streak across the piece, kept to what is painted.
    t.globalCompositeOperation = 'source-atop'
    const g = t.createLinearGradient(x0, y0, x0 + (x1 - x0) * 0.6, y1)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.34, 'rgba(255,255,255,0)')
    g.addColorStop(0.42, 'rgba(255,255,255,0.2)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.03)')
    g.addColorStop(0.56, 'rgba(255,255,255,0.1)')
    g.addColorStop(0.6, 'rgba(255,255,255,0)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    t.fillStyle = g
    t.fillRect(x0 - PAD, y0 - PAD, w, h)
    t.globalCompositeOperation = 'source-over'
  }
  const out = make(pw, ph)
  const o = out.getContext('2d') as Ctx
  if (thick > 0) {
    const side = make(pw, ph)
    const s = side.getContext('2d') as Ctx
    s.drawImage(top as CanvasImageSource, 0, 0)
    s.globalCompositeOperation = 'source-in'
    s.fillStyle = INK.edge
    s.fillRect(0, 0, pw, ph)
    o.save()
    o.shadowColor = INK.shadow
    o.shadowBlur = 5 * k
    o.shadowOffsetX = 2 * k
    o.shadowOffsetY = (thick + 2) * k
    o.drawImage(side as CanvasImageSource, 0, 0)
    o.restore()
    const steps = Math.max(1, Math.round(thick * k))
    for (let i = 1; i <= steps; i++) o.drawImage(side as CanvasImageSource, i * 0.5, i)
  }
  o.drawImage(top as CanvasImageSource, 0, 0)
  return { image: out, x: x0 - PAD, y: y0 - PAD, w, h }
}

// --- The pony ----------------------------------------------------------------------------------

/** Where the pony's parts hang on its body, from its feet. */
export const PONY = { neck: { x: -112, y: -214 }, tail: { x: 146, y: -212 }, earL: { x: -84, y: -170 }, earR: { x: -24, y: -180 }, lip: { x: -98, y: -40 }, eyes: [{ x: -80, y: -128 }, { x: -30, y: -136 }], eyeR: 9 }

function ponyBody(ctx: Ctx, clean: boolean): void {
  // The far legs, the barrel, the near legs and their hooves.
  box(ctx, INK.ponyDark, -84, -118, 36, 116, 14)
  box(ctx, INK.ponyDark, 62, -118, 36, 116, 14)
  shape(ctx, INK.pony, [-150, -196, -128, -262, -40, -282, 62, -278, 138, -250, 164, -186, 150, -112, 70, -84, -44, -82, -124, -108])
  box(ctx, INK.pony, -128, -128, 44, 128, 16)
  box(ctx, INK.pony, 96, -128, 44, 128, 16)
  for (const x of [-132, 92]) box(ctx, INK.hoof, x, -24, 52, 26, 9)
  for (const x of [-86, 60]) box(ctx, INK.hoof, x, -20, 40, 20, 8)
  oval(ctx, '#d99a57', 4, -116, 96, 26)
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  if (clean) {
    // Brushed: two long shines along its back.
    ctx.globalAlpha = 0.55
    shape(ctx, '#ffffff', [-70, -262, 40, -270, 100, -250, 36, -252, -66, -246])
    shape(ctx, '#ffffff', [84, -228, 128, -214, 136, -180, 118, -200])
    ctx.globalAlpha = 1
  } else {
    // Dusty: grey smudges and specks all over.
    const next = chance(11)
    ctx.globalAlpha = 0.82
    for (const [x, y, rx, ry] of [[-70, -236, 58, 26], [44, -246, 66, 24], [116, -180, 34, 40], [-10, -150, 78, 28], [-110, -70, 20, 34], [114, -70, 20, 34]]) oval(ctx, INK.dust, x, y, rx, ry, 0.2)
    ctx.globalAlpha = 1
    for (let i = 0; i < 46; i++) oval(ctx, INK.dust, -140 + next() * 290, -270 + next() * 250, 3 + next() * 5, 3 + next() * 4)
  }
  ctx.restore()
}

function ponyHead(ctx: Ctx): void {
  // The mane down the back of the neck, the neck, the skull, the big pale muzzle.
  shape(ctx, INK.ponyMane, [10, -150, 58, -84, 60, 6, 24, 30, 30, -60])
  shape(ctx, INK.pony, [-40, 34, 44, 26, 36, -78, -8, -150, -84, -130, -70, -40])
  oval(ctx, INK.pony, -54, -132, 66, 60)
  oval(ctx, INK.muzzle, -96, -70, 66, 50, -0.3)
  oval(ctx, INK.ponyMane, -124, -82, 7, 11, -0.3)
  oval(ctx, INK.ponyMane, -92, -72, 7, 11, -0.2)
  // Two big teeth, which the lip hides until it drops.
  box(ctx, '#ffffff', -118, -40, 17, 20, 4)
  box(ctx, '#ffffff', -99, -38, 17, 20, 4)
  oval(ctx, INK.cheek, -12, -100, 15, 11)
  oval(ctx, INK.eye, PONY.eyes[0].x, PONY.eyes[0].y, 16, 19)
  oval(ctx, INK.eye, PONY.eyes[1].x, PONY.eyes[1].y, 17, 20)
  // The forelock, down over one eye.
  shape(ctx, INK.ponyMane, [-92, -182, -44, -204, 14, -182, 6, -138, -14, -118, -30, -150, -52, -146, -70, -166])
}

const ponyLip = (ctx: Ctx): void => { shape(ctx, INK.lip, [-52, -8, 44, -4, 46, 14, 4, 30, -44, 20]) }
const ponyEar = (ctx: Ctx): void => { shape(ctx, INK.pony, [-13, 4, 13, 4, 17, -30, 0, -56, -15, -30]); shape(ctx, INK.lip, [-5, -4, 5, -4, 7, -28, 0, -40, -6, -28]) }
const ponyTail = (ctx: Ctx): void => { shape(ctx, INK.ponyMane, [-10, -8, 16, -12, 38, 34, 44, 96, 28, 150, 2, 158, -8, 104, -6, 42]) }
/** The hay the pony wears as a wig, round its own middle. */
function wig(ctx: Ctx): void {
  shape(ctx, INK.hay, [-66, 10, -70, -30, -30, -54, 30, -52, 68, -26, 70, 16, 44, 40, 20, 14, -4, 44, -26, 16, -48, 42])
  const next = chance(5)
  for (let i = 0; i < 16; i++) { const x = -56 + next() * 112, y = -40 + next() * 60; line(ctx, INK.hayDark, 3, [x, y, x + (next() - 0.5) * 26, y + 14 + next() * 14]) }
}

// --- The goat ----------------------------------------------------------------------------------

export const GOAT = { neck: { x: 58, y: -182 }, tail: { x: -84, y: -176 }, jaw: { x: 60, y: -46 }, earL: { x: 4, y: -100 }, earR: { x: 64, y: -112 }, eyes: [{ x: 30, y: -104 }, { x: 66, y: -100 }], eyeR: 9, middle: { x: 6, y: -150 } }

function goatBody(ctx: Ctx): void {
  for (const x of [-52, 40]) box(ctx, INK.goatDark, x, -128, 15, 126, 7)
  shape(ctx, INK.goat, [-90, -152, -66, -204, 10, -214, 74, -198, 100, -152, 84, -106, 8, -94, -66, -104])
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  shape(ctx, INK.goatPatch, [-80, -190, -30, -216, 6, -180, -30, -150, -80, -150])
  shape(ctx, INK.goatPatch, [40, -130, 80, -140, 90, -100, 40, -96])
  ctx.restore()
  for (const x of [-74, 62]) {
    box(ctx, INK.goat, x, -132, 17, 130, 8)
    // Knobbly knees.
    oval(ctx, INK.goatPatch, x + 8.5, -64, 12, 10)
    box(ctx, INK.hoof, x - 3, -16, 23, 18, 6)
  }
  for (const x of [-54, 38]) box(ctx, INK.hoof, x, -14, 19, 14, 5)
}

function goatHead(ctx: Ctx): void {
  // Two horns curling back, the neck, the long face.
  for (const dx of [0, 26]) shape(ctx, INK.horn, [2 + dx, -122, 20 + dx, -128, 12 + dx, -172, -18 + dx, -202, -30 + dx, -194, -10 + dx, -166])
  shape(ctx, INK.goat, [-22, 18, 26, 26, 46, -58, 6, -84, -10, -40])
  shape(ctx, INK.goat, [-10, -120, 44, -138, 84, -116, 104, -62, 96, -36, 62, -34, 18, -58, -8, -86])
  oval(ctx, INK.goatNose, 92, -52, 16, 13)
  oval(ctx, INK.goatDark, 96, -56, 3.5, 5)
  oval(ctx, INK.goatDark, 86, -50, 3.5, 5)
  shape(ctx, INK.goatPatch, [8, -124, 40, -136, 50, -116, 18, -108])
  // Eyes set in the face: a dark rim, a yellow iris, and a pale glint. The level pupil is drawn live inside it.
  for (const eye of GOAT.eyes) {
    oval(ctx, INK.goatDark, eye.x, eye.y, 16.5, 17.5)
    oval(ctx, INK.goatEye, eye.x, eye.y, 14, 15)
    oval(ctx, '#fff3c4', eye.x - 5, eye.y - 7, 4, 3.4)
  }
}

/** The lower jaw with the beard hanging from it, round the hinge. */
const goatJaw = (ctx: Ctx): void => { shape(ctx, INK.goat, [-30, -8, 30, -10, 36, 6, 10, 16, -24, 12]); shape(ctx, INK.goatDark, [-12, 10, 14, 12, 10, 52, 0, 70, -10, 50]) }
const goatEar = (ctx: Ctx): void => { shape(ctx, INK.goat, [0, -9, 0, 9, 36, 12, 56, 0, 36, -10]); shape(ctx, INK.goatNose, [8, -3, 8, 4, 34, 5, 42, 0, 34, -4]) }
const goatTail = (ctx: Ctx): void => { shape(ctx, INK.goat, [8, 6, -4, -4, -20, -30, -8, -40, 12, -14]) }
/** A belly round as a ball. */
const goatBelly = (ctx: Ctx): void => { oval(ctx, INK.goat, 0, 0, 86, 80); ctx.save(); ctx.globalCompositeOperation = 'source-atop'; shape(ctx, INK.goatPatch, [-80, -40, -30, -80, 6, -40, -30, -6, -80, -10]); oval(ctx, '#ffffff', 26, 30, 30, 16, -0.5); ctx.restore() }
/** Every hair on end: a round ball of fluff. */
function goatFluff(ctx: Ctx): void {
  const points: number[] = []
  for (let i = 0; i < 44; i++) { const a = (i / 44) * Math.PI * 2, r = i % 2 ? 118 : 88; points.push(Math.cos(a) * r, Math.sin(a) * r * 0.92) }
  ctx.beginPath()
  points.forEach((_, i) => { if (i % 2 === 0) { if (i === 0) ctx.moveTo(points[0], points[1]); else ctx.lineTo(points[i], points[i + 1]) } })
  ctx.closePath()
  fill(ctx, INK.goat)
  oval(ctx, INK.goat, 0, 0, 92, 86)
  ctx.save(); ctx.globalCompositeOperation = 'source-atop'; shape(ctx, INK.goatPatch, [-96, -50, -36, -96, 8, -46, -36, -8, -96, -12]); ctx.restore()
}

// --- The pig -----------------------------------------------------------------------------------

export const PIG = { middle: { x: 10, y: -96 }, head: { x: -72, y: -108 }, tail: { x: 156, y: -128 }, earL: { x: -50, y: -56 }, earR: { x: 26, y: -62 }, eyes: [{ x: -42, y: -34 }, { x: 8, y: -38 }], eyeR: 6.5, mouth: { x: -30, y: 40 },
  /** The four trotters by their hips: the far pair, drawn behind the body, and the near pair in front of it. */
  trotters: [{ x: -77, y: -26, near: false }, { x: 103, y: -26, near: false }, { x: -21, y: -20, near: true }, { x: 53, y: -20, near: true }] }

function pigBody(ctx: Ctx): void {
  oval(ctx, INK.pig, 10, -96, 154, 98)
  oval(ctx, INK.pigBelly, 14, -62, 104, 44)
  // Mud up its sides.
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  for (const [x, y, rx, ry] of [[-110, -34, 40, 22], [120, -40, 44, 26], [20, -8, 70, 14], [150, -100, 20, 26]]) oval(ctx, INK.mudWet, x, y, rx, ry)
  ctx.restore()
}

/** One trotter, hanging from its hip: a piece of its own, so it can kick. */
function pigTrotter(ctx: Ctx, near: boolean): void {
  box(ctx, near ? INK.pig : INK.pigDark, -19, -4, 38, near ? 30 : 32, 12)
  box(ctx, INK.pigHoof, -17, near ? 14 : 16, 34, 12, 5)
}

function pigHead(ctx: Ctx): void {
  oval(ctx, INK.pig, -10, -10, 78, 70)
  oval(ctx, INK.cheek, 40, 14, 15, 11)
  oval(ctx, INK.cheek, -70, 16, 12, 10)
  oval(ctx, INK.pigDark, -32, 8, 39, 29)
  oval(ctx, INK.pigNose, -46, 6, 7, 11)
  oval(ctx, INK.pigNose, -20, 8, 7, 11)
  oval(ctx, INK.eye, PIG.eyes[0].x, PIG.eyes[0].y, 11, 13)
  oval(ctx, INK.eye, PIG.eyes[1].x, PIG.eyes[1].y, 12, 14)
}

const pigEar = (ctx: Ctx): void => { shape(ctx, INK.pigDark, [-18, 4, 18, 4, 24, -30, 4, -50, -14, -36]); shape(ctx, INK.pig, [-8, -2, 9, -2, 12, -26, 2, -36, -7, -28]) }
/** The curl of the tail, wound round its own middle. */
function pigTail(ctx: Ctx): void {
  const points: number[] = []
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 4.4, r = 4 + (i / 40) * 26; points.push(Math.cos(a) * r, Math.sin(a) * r) }
  line(ctx, INK.pigDark, 10, points)
}
const pigMoustache = (ctx: Ctx): void => { shape(ctx, INK.mudWet, [0, -8, 30, -14, 54, 2, 40, 16, 16, 6, 0, 10, -16, 6, -40, 16, -54, 2, -30, -14]) }
/** Straw stuck all over the pig, round its middle. */
function pigStraw(ctx: Ctx): void {
  const next = chance(23)
  for (let i = 0; i < 70; i++) {
    const a = next() * Math.PI * 2, r = 0.25 + next() * 0.8
    const x = Math.cos(a) * 150 * r, y = Math.sin(a) * 94 * r
    const out = 22 + next() * 26, tilt = a + (next() - 0.5) * 1.2
    line(ctx, i % 3 ? INK.hay : INK.hayDark, 5, [x, y, x + Math.cos(tilt) * out, y + Math.sin(tilt) * out])
  }
}

// --- The hens ----------------------------------------------------------------------------------

export const HEN = { neck: { x: 34, y: -76 }, wing: { x: 0, y: -68 }, eye: { x: 21, y: -38 }, eyeR: 4.2, crest: { x: 10, y: -52 }, hipL: { x: -14, y: -18 }, hipR: { x: 12, y: -18 }, middle: { x: -4, y: -62 } }
export const HEN_INKS = [
  { body: INK.henWhite, shade: INK.henWhiteShade, speck: null },
  { body: INK.henRusset, shade: INK.henRussetShade, speck: null },
  { body: INK.henBlack, shade: INK.henBlackShade, speck: '#f4efe6' },
] as const

function henBody(ctx: Ctx, ink: (typeof HEN_INKS)[number]): void {
  // A tail fan, a round body, a paler breast.
  shape(ctx, ink.shade, [-44, -70, -84, -112, -70, -128, -52, -106, -58, -134, -38, -132, -26, -92])
  shape(ctx, ink.body, [-60, -58, -56, -98, -24, -96, 14, -104, 50, -86, 60, -52, 40, -18, -6, -8, -44, -24])
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  oval(ctx, ink.shade, 34, -34, 30, 26)
  if (ink.speck) { const next = chance(3); for (let i = 0; i < 34; i++) oval(ctx, ink.speck, -60 + next() * 120, -124 + next() * 116, 2.6, 2.6) }
  ctx.restore()
}
const henWing = (ctx: Ctx, ink: (typeof HEN_INKS)[number]): void => { shape(ctx, ink.shade, [-22, -14, 14, -18, 34, -2, 20, 22, -14, 20, -30, 4]) }
function henHead(ctx: Ctx, ink: (typeof HEN_INKS)[number]): void {
  for (const [x, y] of [[4, -56], [16, -61], [28, -55]]) oval(ctx, INK.comb, x, y, 9, 10)
  shape(ctx, ink.body, [-16, 10, 16, 14, 30, -24, 8, -34, -6, -16])
  oval(ctx, INK.comb, 30, -16, 6.5, 10)
  oval(ctx, ink.body, 14, -36, 21, 20)
  shape(ctx, INK.beak, [28, -46, 58, -34, 28, -24])
  oval(ctx, INK.eye, HEN.eye.x, HEN.eye.y, 7.5, 7.5)
  if (ink.speck) oval(ctx, ink.speck, 4, -44, 2.4, 2.4)
}
const henCrest = (ctx: Ctx, ink: (typeof HEN_INKS)[number]): void => { shape(ctx, ink.shade, [-16, 4, -22, -34, -10, -24, -6, -56, 4, -28, 14, -48, 18, 4]) }
/** Only a beak, for a hole in the door. */
const beak = (ctx: Ctx): void => { shape(ctx, INK.beak, [-10, -11, 24, 0, -10, 11]) }

/** A heap of hay with a hen under it, round the middle of its foot. */
function haystack(ctx: Ctx): void {
  shape(ctx, INK.hay, [-78, 0, -84, -50, -52, -108, 0, -138, 54, -108, 84, -48, 78, 0])
  const next = chance(41)
  for (let i = 0; i < 26; i++) { const x = -64 + next() * 128, y = -112 + next() * 100; line(ctx, INK.hayDark, 3.5, [x, y, x + (next() - 0.5) * 34, y + 16 + next() * 12]) }
  for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI, x = Math.cos(a) * 76, y = -50 + Math.sin(a) * 78; line(ctx, INK.hay, 5, [x, y, x + Math.cos(a) * 22, y + Math.sin(a) * 22]) }
}

// --- The four things: the plainest pieces on the page ------------------------------------------

function scoop(ctx: Ctx, heaped: boolean): void {
  box(ctx, INK.scoopDark, 18, -9, 50, 18, 9)
  shape(ctx, INK.scoop, [-52, -18, 10, -30, 34, -6, 30, 22, 0, 30, -52, 18])
  if (heaped) shape(ctx, INK.grain, [-48, -14, -30, -40, 0, -46, 22, -30, 28, -8, -10, -4])
}
function bucket(ctx: Ctx, full: boolean): void {
  ctx.beginPath(); ctx.arc(0, -30, 42, Math.PI * 1.03, Math.PI * 1.97); ctx.strokeStyle = INK.tine; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke()
  ctx.beginPath(); ctx.moveTo(-44, -32); ctx.lineTo(44, -32); ctx.lineTo(33, 40); ctx.quadraticCurveTo(0, 48, -33, 40); ctx.closePath(); fill(ctx, INK.bucket)
  box(ctx, INK.bucketDark, -46, -38, 92, 14, 7)
  if (full) oval(ctx, INK.water, 0, -33, 37, 7)
}
function brush(ctx: Ctx): void {
  box(ctx, INK.bristle, -52, 0, 104, 26, 5)
  box(ctx, INK.wood, -58, -24, 116, 28, 13)
}
function fork(ctx: Ctx, loaded: boolean): void {
  box(ctx, INK.wood, -7, -34, 14, 104, 7)
  ctx.beginPath()
  for (const x of [-26, 0, 26]) { ctx.moveTo(x, -34); ctx.lineTo(x, -78) }
  ctx.moveTo(-26, -34); ctx.lineTo(26, -34)
  ctx.strokeStyle = INK.tine; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
  if (loaded) shape(ctx, INK.hay, [-46, -52, -40, -86, -8, -100, 30, -94, 48, -66, 34, -44, 0, -52, -24, -40])
}
/** The pump, round the place of the bucket that hangs on it. It stands in front of the hens' ground. */
const pump = (ctx: Ctx): void => {
  box(ctx, INK.pump, -86, -96, 30, 156, 10)
  box(ctx, INK.pumpDark, -92, 46, 42, 16, 7)
  box(ctx, INK.pump, -62, -76, 52, 16, 8)
  box(ctx, INK.pump, -24, -76, 16, 30, 7)
  oval(ctx, INK.pumpDark, -71, -96, 19, 12)
}

/** The pump's handle, round its pivot. */
const pumpHandle = (ctx: Ctx): void => { box(ctx, INK.pumpDark, -70, -7, 84, 14, 7); oval(ctx, INK.pumpDark, -66, 0, 12, 12) }

// --- The henhouse's moving pieces, and the bystanders ------------------------------------------

function door(ctx: Ctx): void {
  box(ctx, INK.door, 0, 0, DOOR.w, DOOR.h, 12)
  for (const x of [52, 103, 154]) line(ctx, INK.doorLine, 3, [x, 8, x, DOOR.h - 8])
  box(ctx, INK.doorLine, 10, 26, DOOR.w - 20, 20, 8)
  box(ctx, INK.doorLine, 10, DOOR.h - 50, DOOR.w - 20, 20, 8)
  // The tab a thumb slides it by.
  oval(ctx, INK.knob, DOOR.w - 30, DOOR.h * 0.72, 17, 17)
  // The holes are cut right through.
  ctx.globalCompositeOperation = 'destination-out'
  for (const hole of DOOR.holes) oval(ctx, '#000000', hole.x, hole.y, hole.r, hole.r)
  ctx.globalCompositeOperation = 'source-over'
}
const hatch = (ctx: Ctx): void => { const h = HENHOUSE.hatch; box(ctx, INK.door, 0, 0, h.w, h.h, 9); line(ctx, INK.doorLine, 3, [h.w / 2, 6, h.w / 2, h.h - 6]); box(ctx, INK.doorLine, 8, h.h - 24, h.w - 16, 12, 6) }
/** The cat, round the middle of its face. */
function cat(ctx: Ctx): void {
  shape(ctx, INK.cat, [-34, -14, -38, -44, -14, -30, 14, -30, 38, -44, 34, -14, 30, 20, 0, 30, -30, 20])
  shape(ctx, INK.catDark, [-8, -28, 0, -14, 8, -28])
  oval(ctx, INK.catEye, -15, -4, 9, 10)
  oval(ctx, INK.catEye, 15, -4, 9, 10)
  oval(ctx, INK.pupil, -15, -4, 3, 8)
  oval(ctx, INK.pupil, 15, -4, 3, 8)
  oval(ctx, INK.cheek, 0, 9, 5, 4)
}
/** The cat's tail, hanging from its root. */
const catTail = (ctx: Ctx): void => { line(ctx, INK.cat, 15, [0, -6, 2, 30, 8, 54, 22, 66]); line(ctx, INK.catDark, 15, [16, 62, 22, 66]) }
function sunRays(ctx: Ctx): void {
  ctx.beginPath()
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, b = a + Math.PI / 12
    ctx.lineTo(Math.cos(a) * 62, Math.sin(a) * 62)
    ctx.lineTo(Math.cos(b) * 40, Math.sin(b) * 40)
  }
  ctx.closePath()
  fill(ctx, INK.ray)
}
function sunFace(ctx: Ctx): void {
  oval(ctx, INK.sun, 0, 0, 40, 40)
  oval(ctx, INK.cheek, -22, 10, 8, 6)
  oval(ctx, INK.cheek, 22, 10, 8, 6)
  oval(ctx, INK.pupil, -13, -6, 4.5, 6)
  oval(ctx, INK.pupil, 13, -6, 4.5, 6)
  ctx.beginPath(); ctx.arc(0, 6, 13, Math.PI * 0.15, Math.PI * 0.85); ctx.strokeStyle = INK.pupil; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke()
}
const cloud = (ctx: Ctx): void => { for (const [x, y, r] of [[-46, 8, 26], [-14, -8, 34], [26, -2, 30], [54, 10, 22], [4, 14, 28]]) oval(ctx, INK.cloud, x, y, r, r * 0.86) }

function trough(ctx: Ctx, full: boolean): void {
  if (full) shape(ctx, INK.grain, [-54, -10, -34, -34, 0, -42, 36, -34, 54, -10])
  ctx.beginPath(); ctx.moveTo(-64, -14); ctx.lineTo(64, -14); ctx.lineTo(52, 26); ctx.lineTo(-52, 26); ctx.closePath(); fill(ctx, INK.wood)
  box(ctx, INK.woodDark, -66, -20, 132, 12, 6)
  if (!full) oval(ctx, INK.inside, 0, -14, 52, 4)
}
function rack(ctx: Ctx, full: boolean): void {
  if (full) shape(ctx, INK.hay, [-44, -86, -30, -112, 6, -118, 40, -106, 48, -80, 40, 40, 0, 62, -38, 40])
  box(ctx, INK.woodDark, -46, -90, 92, 14, 7)
  for (const x of [-36, -12, 12, 36]) line(ctx, INK.wood, 9, [x, -84, x * 0.7, 66])
  box(ctx, INK.woodDark, -34, 60, 68, 14, 7)
  if (full) for (const [x, y] of [[-50, -40], [48, -10], [-46, 20]]) line(ctx, INK.hay, 5, [x * 0.7, y, x * 1.2, y + 14])
}
function wetWallow(ctx: Ctx): void {
  const w = WALLOW
  shape(ctx, INK.mudWet, [-w.w * 0.48, 10, -w.w * 0.42, -w.h * 0.34, -w.w * 0.1, -w.h * 0.46, w.w * 0.3, -w.h * 0.42, w.w * 0.49, -w.h * 0.1, w.w * 0.46, w.h * 0.4, 0, w.h * 0.5, -w.w * 0.4, w.h * 0.42])
  ctx.save(); ctx.globalCompositeOperation = 'source-atop'
  for (const [x, y, rx, ry] of [[-150, -40, 44, 9], [120, -56, 56, 9], [170, 40, 40, 8], [-120, 60, 50, 8], [10, 76, 60, 7]]) oval(ctx, INK.mudShine, x, y, rx, ry)
  for (const [x, y] of [[-170, -30], [140, -50], [160, 46]]) oval(ctx, '#ffffff', x, y, 12, 3)
  ctx.restore()
}
/** A soft pale light under what can be touched. */
/** The shadow a lifted thing leaves on its place: the further off the page, the wider and softer. */
function shadow(ctx: Ctx): void {
  const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 100)
  g.addColorStop(0, 'rgba(70,46,22,0.42)')
  g.addColorStop(0.6, 'rgba(70,46,22,0.26)')
  g.addColorStop(1, 'rgba(70,46,22,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.fill()
}

/** The long rays of a full morning: twelve pale blades round the sun. */
function longRays(ctx: Ctx): void {
  ctx.beginPath()
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12
    ctx.moveTo(Math.cos(a - 0.1) * 66, Math.sin(a - 0.1) * 66)
    ctx.lineTo(Math.cos(a) * (i % 2 ? 150 : 124), Math.sin(a) * (i % 2 ? 150 : 124))
    ctx.lineTo(Math.cos(a + 0.1) * 66, Math.sin(a + 0.1) * 66)
    ctx.closePath()
  }
  fill(ctx, '#ffe9a6')
}

/** The moon: a pale crescent with one shut eye, asleep like everyone else. */
function moon(ctx: Ctx): void {
  oval(ctx, '#fff6cf', 0, 0, 34, 34)
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath(); ctx.arc(16, -10, 28, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  ctx.beginPath(); ctx.arc(-16, 2, 6, Math.PI * 0.15, Math.PI * 0.85); ctx.strokeStyle = '#c9b982'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke()
}

/** The cat sitting out on the roof: a round back, the same face, and its tail curled round. */
function catSit(ctx: Ctx): void {
  shape(ctx, INK.cat, [-34, 4, -30, -40, 0, -52, 30, -40, 36, 4, 20, 10, -20, 10])
  line(ctx, INK.cat, 13, [30, 0, 52, -6, 60, -26])
  line(ctx, INK.catDark, 13, [58, -22, 60, -26])
  for (const x of [-16, 0, 16]) line(ctx, INK.catDark, 5, [x, -44, x, -32])
  ctx.save()
  ctx.translate(-2, -56)
  ctx.scale(0.86, 0.86)
  cat(ctx)
  ctx.restore()
}

/** The near hill where the sun goes down behind it: the page's own hill again, as a piece that lies over the sun. */
function hill(ctx: Ctx): void {
  shape(ctx, INK.hillNear, NEAR_HILL)
}

function halo(ctx: Ctx): void {
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 100)
  g.addColorStop(0, 'rgba(255,255,236,0.95)')
  g.addColorStop(0.55, 'rgba(255,252,200,0.6)')
  g.addColorStop(1, 'rgba(255,250,190,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.fill()
}
/** The glow of the idle ladder: a sunny ring with a clear middle, so what it lies on keeps its own colour. */
function ring(ctx: Ctx): void {
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 100)
  g.addColorStop(0, 'rgba(255,224,90,0)')
  g.addColorStop(0.5, 'rgba(255,224,90,0)')
  g.addColorStop(0.68, 'rgba(255,214,64,0.95)')
  g.addColorStop(0.8, 'rgba(255,238,150,0.7)')
  g.addColorStop(1, 'rgba(255,240,170,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.fill()
}
/** The ghost hand: a white mitten with one finger out, its tip at the origin, with a dark rim so it shows on pale ground too. */
function ghost(ctx: Ctx): void {
  const hand = (): void => {
    ctx.beginPath()
    ctx.roundRect(-13, -2, 26, 74, 13)
    for (const points of [[-34, 44, 38, 40, 46, 96, 30, 128, -24, 128, -40, 96], [-34, 62, -62, 50, -68, 70, -38, 96]]) {
      ctx.moveTo(points[0], points[1])
      for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1])
      ctx.closePath()
    }
  }
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#5a4763'
  ctx.lineWidth = 9
  hand(); ctx.stroke()
  ctx.fillStyle = '#ffffff'
  hand(); ctx.fill()
}

// --- All the pieces, by name -------------------------------------------------------------------

export type Pieces = ReturnType<typeof makePieces>

/** Paints every piece once, at `k` pixels a stage unit. */
export function makePieces(k: number) {
  const hens = HEN_INKS.map((ink) => ({
    body: card(k, [-90, -138, 66, 4], (c) => henBody(c, ink), 4),
    wing: card(k, [-34, -22, 38, 26], (c) => henWing(c, ink), 3),
    head: card(k, [-20, -74, 62, 18], (c) => henHead(c, ink), 3),
    crest: card(k, [-26, -60, 22, 8], (c) => henCrest(c, ink), 3),
  }))
  return {
    hens,
    beak: card(k, [-12, -13, 26, 13], beak, 3),
    haystack: card(k, [-104, -142, 104, 4], haystack, 5),
    ponyDusty: card(k, [-156, -288, 170, 6], (c) => ponyBody(c, false)),
    ponyClean: card(k, [-156, -288, 170, 6], (c) => ponyBody(c, true)),
    ponyHead: card(k, [-166, -208, 66, 40], ponyHead),
    ponyLip: card(k, [-56, -12, 50, 34], ponyLip, 3),
    ponyEar: card(k, [-18, -60, 20, 8], ponyEar, 3),
    ponyTail: card(k, [-14, -16, 48, 162], ponyTail, 4),
    wig: card(k, [-74, -58, 74, 48], wig, 4),
    goatBody: card(k, [-96, -218, 104, 6], goatBody),
    goatHead: card(k, [-36, -206, 110, 30], goatHead),
    goatJaw: card(k, [-34, -14, 40, 74], goatJaw, 3),
    goatEar: card(k, [-2, -14, 60, 16], goatEar, 3),
    goatTail: card(k, [-24, -44, 16, 10], goatTail, 3),
    goatBelly: card(k, [-90, -84, 90, 84], goatBelly),
    goatFluff: card(k, [-122, -112, 122, 112], goatFluff),
    pigBody: card(k, [-150, -198, 168, 6], pigBody),
    pigTrotter: [card(k, [-22, -8, 22, 32], (c) => pigTrotter(c, false), 3), card(k, [-22, -8, 22, 32], (c) => pigTrotter(c, true), 3)],
    pigHead: card(k, [-92, -84, 72, 64], pigHead),
    pigEar: card(k, [-22, -54, 28, 8], pigEar, 3),
    pigTail: card(k, [-40, -40, 40, 40], pigTail, 3),
    pigMoustache: card(k, [-58, -18, 58, 20], pigMoustache, 3),
    pigStraw: card(k, [-200, -146, 200, 146], pigStraw, 3, false),
    scoop: [card(k, [-56, -34, 72, 34], (c) => scoop(c, false)), card(k, [-56, -50, 72, 34], (c) => scoop(c, true))],
    bucket: [card(k, [-50, -76, 50, 48], (c) => bucket(c, false)), card(k, [-50, -76, 50, 48], (c) => bucket(c, true))],
    brush: [card(k, [-60, -26, 60, 28], brush), card(k, [-60, -26, 60, 28], brush)],
    fork: [card(k, [-34, -84, 34, 72], (c) => fork(c, false)), card(k, [-50, -104, 52, 72], (c) => fork(c, true))],
    pump: card(k, [-94, -110, -6, 64], pump, 4),
    pumpHandle: card(k, [-80, -14, 16, 14], pumpHandle, 4),
    door: card(k, [0, 0, DOOR.w, DOOR.h], door, 6),
    hatch: card(k, [0, 0, HENHOUSE.hatch.w, HENHOUSE.hatch.h], hatch, 5),
    cat: card(k, [-42, -48, 42, 32], cat, 3),
    catTail: card(k, [-10, -14, 34, 76], catTail, 3),
    sunRays: card(k, [-64, -64, 64, 64], sunRays, 4),
    sunFace: card(k, [-42, -42, 42, 42], sunFace, 4),
    cloud: card(k, [-76, -44, 80, 42], cloud, 4),
    trough: [card(k, [-68, -22, 68, 28], (c) => trough(c, false)), card(k, [-68, -44, 68, 28], (c) => trough(c, true))],
    rack: [card(k, [-50, -92, 50, 76], (c) => rack(c, false)), card(k, [-62, -120, 62, 76], (c) => rack(c, true))],
    wetWallow: card(k, [-WALLOW.w / 2, -WALLOW.h / 2, WALLOW.w / 2, WALLOW.h / 2], wetWallow, 0, true),
    halo: card(k, [-100, -100, 100, 100], halo, 0, false),
    shadow: card(k * 0.5, [-100, -100, 100, 100], shadow, 0, false),
    longRays: card(k, [-152, -152, 152, 152], longRays, 3),
    moon: card(k, [-36, -36, 36, 36], moon, 3),
    catSit: card(k, [-40, -100, 64, 12], catSit, 3),
    hill: card(k, [HORIZON.left, HORIZON.top, HORIZON.right, HORIZON.yard], (c) => { c.beginPath(); c.rect(HORIZON.left, HORIZON.top, HORIZON.right - HORIZON.left, HORIZON.yard - HORIZON.top); c.clip(); hill(c) }, 0, false),
    ring: card(k, [-100, -100, 100, 100], ring, 0, false),
    ghost: card(k, [-74, -8, 52, 134], ghost, 3),
  }
}

// --- The page ----------------------------------------------------------------------------------

/**
 * The printed page, painted once for a surface: everything that stands still. It is painted in stage units
 * through the transform it is given, and every ground colour runs far past the stage's edges, so a surface of
 * another shape is still a page from edge to edge.
 */
export function paintPage(ctx: Ctx): void {
  const far = 2400
  const W = STAGE.width, H = STAGE.height
  const next = chance(7)
  // The sky, paler towards the hills.
  ctx.fillStyle = INK.sky
  ctx.fillRect(-far, -far, W + far * 2, far + 340)
  ctx.fillStyle = INK.skyLow
  ctx.fillRect(-far, 170, W + far * 2, 170)
  // Two rows of hills with round trees on them.
  shape(ctx, INK.hillFar, [-far, 400, -far, 250, -300, 236, 20, 250, 330, 196, 560, 244, 760, 204, 980, 248, 1240, 210, 1500, 240, W + far, 236, W + far, 400])
  for (const [x, y, r] of [[-190, 216, 22], [-140, 228, 15], [512, 214, 22], [556, 226, 16], [884, 222, 20], [1106, 214, 24], [1150, 228, 15], [1330, 214, 20]]) { box(ctx, INK.trunk, x - 4, y, 8, 34, 3); oval(ctx, INK.tree, x, y, r, r) }
  shape(ctx, INK.hillNear, NEAR_HILL)
  // The yard, with printed dabs of straw.
  ctx.fillStyle = INK.yard
  ctx.fillRect(-far, 338, W + far * 2, far)
  for (let i = 0; i < 220; i++) {
    const x = -260 + next() * (W + 520), y = 350 + next() * (H - 330)
    oval(ctx, i % 4 ? INK.yardDab : INK.yardPale, x, y, 7 + next() * 12, 2.5 + next() * 2.5, (next() - 0.5) * 0.5)
  }
  // The fence along the back of the yard, behind the pony and the goat.
  // On a surface wider than the stage it runs on past the henhouse too, so the page is a yard from edge to edge.
  for (const y of [398, 452]) { box(ctx, INK.fenceShade, -far, y + 5, W + far * 2, 18, 6); box(ctx, INK.fence, -far, y, W + far * 2, 18, 6) }
  for (let x = 500; x < W + 700; x += 96) { box(ctx, INK.fenceShade, x + 4, 374, 22, 140, 8); box(ctx, INK.fence, x, 370, 22, 140, 8) }
  for (let x = -76; x > -700; x -= 96) { box(ctx, INK.fenceShade, x + 4, 374, 22, 140, 8); box(ctx, INK.fence, x, 370, 22, 140, 8) }
  // The post the pony rubs on.
  box(ctx, INK.woodDark, POST.x + 4, POST.y + 4, POST.w, POST.h, 9)
  box(ctx, INK.wood, POST.x, POST.y, POST.w, POST.h, 9)
  // Flowers along the fence and in the corners.
  for (const [x, y, c] of [[474, 560, '#ffffff'], [846, 566, '#f7799b'], [1150, 560, '#ffffff'], [1120, 530, '#f7799b'], [16, 606, '#f7799b'], [672, 598, '#ffffff'], [1160, 590, '#ffd43f'], [-60, 570, '#ffffff'], [-130, 640, '#ffd43f'], [-36, 720, '#f7799b'], [1250, 640, '#ffffff'], [1300, 560, '#f7799b']] as const) {
    line(ctx, INK.tree, 4, [x, y + 6, x, y + 26])
    for (let i = 0; i < 5; i++) oval(ctx, c, x + Math.cos(i * 1.257) * 8, y + Math.sin(i * 1.257) * 8, 5.5, 5.5)
    oval(ctx, INK.ray, x, y, 4, 4)
  }

  // The henhouse: a roof, a red wall of planks with pale trim, a rail, and the two openings cut into it.
  const wall = HENHOUSE.wall, roof = HENHOUSE.roof, open = HENHOUSE.opening, loft = HENHOUSE.hatch
  box(ctx, INK.barn, wall.x, wall.y, wall.w, wall.h, 10)
  for (let x = wall.x + 37; x < wall.x + wall.w; x += 37) line(ctx, INK.barnLine, 3, [x, wall.y + 6, x, wall.y + wall.h - 6])
  shape(ctx, INK.barn, [roof[0].x + 30, roof[0].y + 8, roof[1].x, roof[1].y + 22, roof[2].x - 30, roof[2].y + 8])
  ctx.beginPath(); ctx.moveTo(roof[0].x - 6, roof[0].y + 14); ctx.lineTo(roof[1].x, roof[1].y); ctx.lineTo(roof[2].x + 6, roof[2].y + 14)
  ctx.strokeStyle = INK.roof; ctx.lineWidth = 34; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
  ctx.beginPath(); ctx.moveTo(roof[0].x - 6, roof[0].y + 20); ctx.lineTo(roof[1].x, roof[1].y + 6); ctx.lineTo(roof[2].x + 6, roof[2].y + 20)
  ctx.strokeStyle = INK.roofLine; ctx.lineWidth = 5; ctx.stroke()
  box(ctx, INK.trim, wall.x - 4, wall.y + wall.h - 22, wall.w + 8, 26, 8)
  // The loft, with straw in it; the cat comes up out of the dark.
  box(ctx, INK.trim, loft.x - 8, loft.y - 8, loft.w + 16, loft.h + 16, 12)
  box(ctx, INK.inside, loft.x, loft.y, loft.w, loft.h, 8)
  // The doorway: dark inside, a perch, and straw on the floor.
  box(ctx, INK.trim, open.x - 10, open.y - 4, open.w + 20, open.h + 14, 14)
  box(ctx, INK.inside, open.x, open.y, open.w, open.h, 8)
  box(ctx, INK.woodDark, open.x, open.y + 150, open.w, 9, 4)
  shape(ctx, INK.straw, [open.x, open.y + open.h, open.x, open.y + open.h - 30, open.x + 50, open.y + open.h - 44, open.x + 110, open.y + open.h - 34, open.x + open.w, open.y + open.h - 46, open.x + open.w, open.y + open.h])
  for (let i = 0; i < 14; i++) { const x = open.x + 8 + next() * (open.w - 16), y = open.y + open.h - 34 + next() * 26; line(ctx, INK.hayDark, 3, [x, y, x + (next() - 0.5) * 22, y + 8]) }
  const rail = HENHOUSE.rail
  box(ctx, INK.rail, rail.x, rail.y, rail.w, rail.h, 7)
  for (const x of [rail.x + 12, rail.x + rail.w - 12]) oval(ctx, INK.rail, x, rail.y + 7, 11, 11)

  // The dry wallow: cracked pale mud.
  const w = WALLOW, wx = w.x + w.w / 2, wy = w.y + w.h / 2
  shape(ctx, INK.mudCrack, [wx - w.w * 0.5, wy + 14, wx - w.w * 0.44, wy - w.h * 0.36, wx - w.w * 0.1, wy - w.h * 0.5, wx + w.w * 0.32, wy - w.h * 0.46, wx + w.w * 0.52, wy - w.h * 0.1, wx + w.w * 0.5, wy + w.h * 0.44, wx, wy + w.h * 0.56, wx - w.w * 0.42, wy + w.h * 0.46])
  shape(ctx, INK.mudDry, [wx - w.w * 0.47, wy + 10, wx - w.w * 0.41, wy - w.h * 0.33, wx - w.w * 0.1, wy - w.h * 0.45, wx + w.w * 0.3, wy - w.h * 0.41, wx + w.w * 0.48, wy - w.h * 0.1, wx + w.w * 0.45, wy + w.h * 0.39, wx, wy + w.h * 0.49, wx - w.w * 0.39, wy + w.h * 0.41])
  for (const crack of [[-190, -30, -150, -10, -160, 30, -120, 50], [-150, -10, -110, -24], [130, -60, 150, -20, 190, -10], [150, -20, 140, 20, 170, 50], [-60, 62, -30, 76, 0, 66, 30, 82], [200, 30, 176, 60]]) line(ctx, INK.mudCrack, 4, crack.map((v, i) => (i % 2 ? wy + v : wx + v)))

  // The pale bare step the four things lie on, and what lies on it: a sack and a heap of hay. The pump is a piece of its own, since the hens walk behind it.
  box(ctx, INK.stepEdge, STEP.x, STEP.y + 8, STEP.w, STEP.h, 20)
  box(ctx, INK.step, STEP.x, STEP.y, STEP.w, STEP.h, 20)
  const sack = HOME.scoop
  shape(ctx, INK.sack, [sack.x - 62, sack.y + 62, sack.x - 70, sack.y - 4, sack.x - 40, sack.y - 30, sack.x + 46, sack.y - 28, sack.x + 72, sack.y, sack.x + 64, sack.y + 62])
  oval(ctx, INK.grain, sack.x + 2, sack.y - 16, 48, 14)
  line(ctx, INK.sackLine, 3, [sack.x - 50, sack.y + 20, sack.x - 44, sack.y + 50])
  line(ctx, INK.sackLine, 3, [sack.x + 50, sack.y + 22, sack.x + 46, sack.y + 50])
  const heap = HOME.fork
  shape(ctx, INK.heap, [heap.x - 70, heap.y + 64, heap.x - 60, heap.y + 20, heap.x - 14, heap.y - 4, heap.x + 40, heap.y + 14, heap.x + 72, heap.y + 64])
  for (let i = 0; i < 8; i++) { const x = heap.x - 50 + next() * 100, y = heap.y + 20 + next() * 34; line(ctx, INK.hayDark, 2.5, [x, y, x + (next() - 0.5) * 20, y + 8]) }
  // A hook on the step's back edge, where the brush lies under it.
  const hook = HOME.brush
  box(ctx, INK.stepEdge, hook.x - 66, hook.y + 30, 132, 12, 6)

  // Printed cloud shadows on the hills, so the sky has depth where the card clouds drift.
  ctx.globalAlpha = 0.08
  for (const c of CLOUDS) oval(ctx, '#2a5a2a', c.x + 40, 300, 70, 12)
  ctx.globalAlpha = 1
}

/** The page's own laminate and its thick edge, in the surface's pixels: a broad pale streak, round corners, and the grey board showing along the right and the bottom. */
export function paintPageEdge(ctx: Ctx, width: number, height: number): void {
  const g = ctx.createLinearGradient(0, 0, width, height)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.3, 'rgba(255,255,255,0)')
  g.addColorStop(0.36, 'rgba(255,255,255,0.1)')
  g.addColorStop(0.44, 'rgba(255,255,255,0.02)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.07)')
  g.addColorStop(0.56, 'rgba(255,255,255,0)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)
  const band = Math.max(5, Math.round(Math.min(width, height) * 0.011)), r = band * 3.2
  // The board's edge: three layers of grey along the right and the bottom.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = ['#8f8576', '#bdb3a3', '#a99e8e'][i]
    const inset = (band * (3 - i)) / 3
    ctx.fillRect(width - inset, 0, inset, height)
    ctx.fillRect(0, height - inset, width, inset)
  }
  // Round corners, cut back to the table.
  ctx.fillStyle = INK.table
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [width, 0, -1, 1], [0, height, 1, -1], [width, height, -1, -1]]) {
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + sx * r, cy)
    ctx.arcTo(cx, cy, cx, cy + sy * r, r)
    ctx.closePath()
    ctx.fill()
  }
}
