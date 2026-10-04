import { TERRAIN, type Board } from './board'
import type { EffectFrame, GameFrame } from './frame'
import type { CamperId } from './world'

// The short shows the world puts on when a thing is used wrongly: one for each
// wrong cell of the object-by-action grid (ART.md), each with a motion of its
// own. Called by look.ts after the kit; each show is one entry of
// `frame.effects`, drawn where it happens for as long as it lasts.
//
// A show is drawn from how far through it is (`t`, 0 to 1), its place and its
// seed alone: nothing is remembered between frames, no clock is read and no
// chance is taken, so the same frame painted twice is the same picture.
// Everything is flat ink inside one dark key line, with no gradient and no
// blur. Flame is two flat yellows, smoke and steam are paper white with a
// pencil edge, and the pieces stay plain. No word, letter or numeral is drawn,
// and no text call is made. Nobody is hurt in any of them: whoever a joke is
// played on is only bewildered.

type Ctx = CanvasRenderingContext2D

const TAU = Math.PI * 2

// The inks, as look.ts has them.
const INK = '#3a2c22'
const PENCIL = '#6d6862'
const STEAM = '#f8f3e6'
const FLAME = '#f2a93b'
const FLAME_PALE = '#fbe9a4'
const STONE = '#b8b0a2'
const SOOT = '#5a544e'
const STINK = '#6f7d32'
const BARK = '#96693f'
const SAND = '#e8d3a2'
const TEAL = '#4f8e88'
const RED = '#e2401c'
const WHITE = '#fcf9f1'
const BLACK = '#1c1c1f'
const STEEL = '#c5cdd3'
const SHADOW = 'rgba(46, 34, 22, 0.36)'
const LOG = '#cf9f62'
const LOG_LINE = '#6a4524'
const OIL = '#eca418'
const OIL_LINE = '#8a5a06'
const WATER = '#2c7fd0'
const WATER_DARK = '#17508c'
const WATER_PALE = '#c3e1ee'
const TOAST = '#d9a05a'
const COCOA = '#7a4a2a'
/** The figures are drawn a little over design size (ground.ts). */
const FIGURE = 1.1

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
/** How far through the stretch from `a` to `b` the show is: 0 before it, 1 after. */
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const easeOut = (s: number) => 1 - (1 - s) * (1 - s)
const easeIn = (s: number) => s * s
const ease = (s: number) => s * s * (3 - 2 * s)
/** Out past the end and back to it. */
const back = (s: number) => { const p = s - 1; return 1 + 2.7 * p * p * p + 1.7 * p * p }
/** Up and down again: 0 at both ends, 1 in the middle. */
const arch = (s: number) => Math.sin(Math.PI * clamp01(s))
/** A number in 0 to 1 that is always the same for the same seed and index. */
const chance = (seed: number, i: number) => { const v = Math.sin(seed * 12.9898 + i * 78.233 + 0.37) * 43758.5453; return v - Math.floor(v) }

// Small path helpers, as in look.ts. Each starts a new path; the caller fills or strokes it.
function disc(ctx: Ctx, x: number, y: number, r: number) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU) }
function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, turn = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), turn, 0, TAU) }
function box(ctx: Ctx, x: number, y: number, w: number, h: number, r = 0) { ctx.beginPath(); if (r > 0) ctx.roundRect(x, y, w, h, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)); else ctx.rect(x, y, w, h) }
function poly(ctx: Ctx, points: readonly number[]) {
  ctx.beginPath()
  for (let i = 0; i < points.length; i += 2) { if (i === 0) ctx.moveTo(points[i], points[i + 1]); else ctx.lineTo(points[i], points[i + 1]) }
  ctx.closePath()
}
function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke()
}
/** Fills the current path with a flat ink and gives it its key line. */
function ink(ctx: Ctx, fill: string, width = 1.4, color = INK) {
  ctx.fillStyle = fill; ctx.fill()
  if (width > 0) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke() }
}
/** Strokes the current path: a mark, not a thing. */
function mark(ctx: Ctx, color: string, width: number) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke() }
/** A puff of breath: three small rounds run together, paper white inside one pencil edge, fading as it goes. A single ring would be a nought. */
function puff(ctx: Ctx, x: number, y: number, r: number, strength: number) {
  const rounds: [number, number, number][] = [[-0.7, 0.15, 0.72], [0.1, -0.3, 0.9], [0.8, 0.2, 0.66]]
  ctx.globalAlpha = Math.max(0, Math.min(1, strength))
  ctx.beginPath(); for (const [dx, dy, k] of rounds) { ctx.moveTo(x + dx * r + r * k, y + dy * r); ctx.arc(x + dx * r, y + dy * r, r * k, 0, TAU) }
  ctx.strokeStyle = PENCIL; ctx.lineWidth = 2.2; ctx.stroke()
  ctx.fillStyle = '#fcf9f1'; ctx.fill()
  ctx.globalAlpha = 1
}
/** Draws in a frame of design pixels placed at a point of the surface: `u` is the size of one design pixel. */
function at(ctx: Ctx, x: number, y: number, u: number, turn: number, draw: () => void) {
  ctx.save(); ctx.translate(x, y); if (turn) ctx.rotate(turn); ctx.scale(u, u)
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  draw()
  ctx.restore()
}
/** Draws moved and turned inside the frame it is called in. */
function moved(ctx: Ctx, x: number, y: number, turn: number, scale: number, draw: () => void) {
  ctx.save(); ctx.translate(x, y); if (turn) ctx.rotate(turn); if (scale !== 1) ctx.scale(scale, scale); draw(); ctx.restore()
}

// --- The things the shows are made of ------------------------------------------

/** Smoke or steam: round puffs given as x, y, r in turn, drawn as one flat shape with one pencil edge round all of them. */
function cloud(ctx: Ctx, puffs: readonly number[], fill = STEAM, edge = PENCIL, width = 1.5) {
  ctx.beginPath()
  let any = false
  for (let i = 0; i < puffs.length; i += 3) {
    const r = puffs[i + 2]
    if (r > 0.3) { ctx.moveTo(puffs[i] + r, puffs[i + 1]); ctx.arc(puffs[i], puffs[i + 1], r, 0, TAU); any = true }
  }
  if (!any) return
  ctx.strokeStyle = edge; ctx.lineWidth = width * 2; ctx.stroke()
  ctx.fillStyle = fill; ctx.fill()
}

/** A winding line of smoke or steam through the points given: paper white inside a pencil edge. */
function wisp(ctx: Ctx, points: readonly number[], width: number, fill = STEAM, edge = PENCIL) {
  if (points.length < 4) return
  const trace = () => { ctx.beginPath(); ctx.moveTo(points[0], points[1]); for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]) }
  trace(); mark(ctx, edge, width + 2.2)
  trace(); mark(ctx, fill, width)
}

/** Drops of water given as x, y, size and the turn each flies at: all in one path, the point of each trailing behind it. */
function drops(ctx: Ctx, list: readonly number[], fill = WATER, edge = WATER_DARK) {
  ctx.beginPath()
  let any = false
  for (let i = 0; i < list.length; i += 4) {
    const x = list[i], y = list[i + 1], r = list[i + 2], a = list[i + 3]
    if (!(r > 0.25)) continue
    const c = Math.cos(a), s = Math.sin(a)
    ctx.moveTo(x - c * r * 2.3, y - s * r * 2.3)
    ctx.lineTo(x + s * r, y - c * r)
    ctx.arc(x, y, r, a - Math.PI / 2, a + Math.PI / 2)
    ctx.closePath(); any = true
  }
  if (any) ink(ctx, fill, 1, edge)
}

/** Short straight marks flying out from a middle: each from `near` to `far` along its own turn. */
function rays(ctx: Ctx, x: number, y: number, turns: readonly number[], near: number, far: number, color: string, width: number) {
  if (!(far > near)) return
  ctx.beginPath()
  for (const a of turns) { ctx.moveTo(x + Math.cos(a) * near, y + Math.sin(a) * near); ctx.lineTo(x + Math.cos(a) * far, y + Math.sin(a) * far) }
  mark(ctx, color, width)
}

/** A log: a plain tan bar lying along x, `length` long, about its middle. */
function logBar(ctx: Ctx, length: number, thick = 11) {
  box(ctx, -length / 2, -thick / 2, length, thick, 2.6); ink(ctx, LOG, 1.2, LOG_LINE)
}

/** One flat flame, its foot at the origin and its tip `s` tall above it, with the pale heart inside. */
function flame(ctx: Ctx, s: number, lean = 0) {
  if (!(s > 0.02)) return
  const shape = (k: number, fill: string, width: number) => {
    const tip = lean * 14 * k
    ctx.beginPath(); ctx.moveTo(tip, -27 * k)
    ctx.bezierCurveTo(11 * k + tip * 0.4, -15 * k, 12 * k, -1 * k, 0, 0)
    ctx.bezierCurveTo(-12 * k, -1 * k, -8 * k + tip * 0.3, -13 * k, -4 * k + tip * 0.5, -16 * k)
    ctx.bezierCurveTo(-3 * k + tip * 0.7, -20 * k, -2 * k + tip, -23 * k, tip, -27 * k)
    ink(ctx, fill, width)
  }
  shape(s, FLAME, 1.2); shape(s * 0.55, FLAME_PALE, 0)
}

/** A marshmallow as it lies in the tin: a small white pillow. */
function marshmallow(ctx: Ctx, size = 9) { box(ctx, -size / 2, -size / 2, size, size, size / 3); ink(ctx, WHITE, 1.1, BLACK) }

/** An oil flask, standing, its neck at the top: about 15 wide and 41 tall at a scale of 1. */
function flask(ctx: Ctx) {
  box(ctx, -2.6, -21, 5.2, 5, 1); ink(ctx, BARK, 1, BLACK)
  ctx.beginPath(); ctx.moveTo(-2.6, -16); ctx.lineTo(2.6, -16); ctx.lineTo(2.6, -9); ctx.quadraticCurveTo(7.6, -6, 7.6, 0); ctx.lineTo(7.6, 16)
  ctx.quadraticCurveTo(7.6, 20, 3.6, 20); ctx.lineTo(-3.6, 20); ctx.quadraticCurveTo(-7.6, 20, -7.6, 16); ctx.lineTo(-7.6, 0); ctx.quadraticCurveTo(-7.6, -6, -2.6, -9); ctx.closePath()
  ink(ctx, OIL, 1.1, OIL_LINE)
}

/** A moth from above, its head at the top: `flap` is 0 with the wings shut to 1 with them spread. */
function moth(ctx: Ctx, flap: number) {
  const open = 0.3 + 0.7 * clamp01(flap)
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, -1.5); ctx.quadraticCurveTo(side * 8 * open, -8, side * 9 * open, -1); ctx.quadraticCurveTo(side * 8 * open, 5.5, 0, 2.5); ctx.closePath()
    ink(ctx, SAND, 1)
  }
  oval(ctx, 0, 0.5, 1.5, 3.8); ink(ctx, BARK, 0.9)
  ctx.beginPath(); ctx.moveTo(-0.6, -3); ctx.lineTo(-2.6, -6.4); ctx.moveTo(0.6, -3); ctx.lineTo(2.6, -6.4); mark(ctx, INK, 0.8)
}

/** A frog from above, its eyes at the top: the throat swells out in front, and in the air the legs trail behind. */
function frog(ctx: Ctx, throat: number, lift: number) {
  ctx.strokeStyle = '#4c6a2c'; ctx.lineWidth = 2.2
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 3, 3); ctx.lineTo(side * mix(8.5, 5.5, lift), mix(1, 9, lift)); ctx.lineTo(side * mix(7, 6.5, lift), mix(7.5, 15, lift)); ctx.stroke() }
  if (throat > 0) { disc(ctx, 0, -5.6 - 1.6 * throat, 2 + 2.6 * throat); ink(ctx, '#e6edba', 1, '#3f5a26') }
  oval(ctx, 0, 0, 5.4, 6.6); ink(ctx, '#8fb04c', 1.1, '#3f5a26')
  for (const side of [-1, 1]) { disc(ctx, side * 3.1, -5, 2.3); ink(ctx, '#8fb04c', 1, '#3f5a26'); disc(ctx, side * 3.1, -5.2, 0.9); ctx.fillStyle = INK; ctx.fill() }
}

/** A camp mug seen from the side, standing on the origin: teal enamel with a pale rim, and what is in it. `inside` null is the dark of an empty one. */
function mug(ctx: Ctx, inside: string | null) {
  ctx.beginPath(); ctx.arc(9.5, -8, 5, -1.25, 1.25); mark(ctx, INK, 4.4)
  ctx.beginPath(); ctx.arc(9.5, -8, 5, -1.25, 1.25); mark(ctx, TEAL, 2.2)
  ctx.beginPath(); ctx.moveTo(-8.5, -15); ctx.lineTo(-8, -3); ctx.quadraticCurveTo(-8, 0, -5, 0); ctx.lineTo(5, 0); ctx.quadraticCurveTo(8, 0, 8, -3); ctx.lineTo(8.5, -15); ctx.closePath()
  ink(ctx, TEAL, 1.4)
  oval(ctx, 0, -15, 8.5, 3.1); ink(ctx, WHITE, 1.3)
  oval(ctx, 0, -14.7, 6.4, 1.9); ctx.fillStyle = inside ?? INK; ctx.fill()
}

// --- The stage a show is put on ---------------------------------------------------

/** One show as its painter sees it: where it is, how far through, and a way to place a figure that counts it. */
type Stage = {
  ctx: Ctx; board: Board; frame: GameFrame
  x: number; y: number; t: number; who: CamperId | null; seed: number
  /** Places one figure at a point of the surface, in design pixels times `scale`, and counts it. */
  put(x: number, y: number, turn: number, draw: () => void, scale?: number): void
}
type Show = (s: Stage) => void

// --- Pieces dropped on the fire ----------------------------------------------------

/** Where the stones of the ring lie that do the biting: the three on one side, as look.ts lays them. */
const TEETH = [-0.698, 0, 0.698]

/** A log at dusk: it slides in across the ring, and three stones hop up like teeth and bite it in, a third at a time. */
const bitesItIn: Show = (s) => {
  const { ctx, t } = s, flip = s.seed % 2 ? -1 : 1
  const run = seg(t, 0.16, 0.82) * 3, bite = Math.min(2, Math.floor(run)), p = t < 0.16 ? 0 : t >= 0.82 ? 1 : run - bite
  // The jaw: out and up, then shut on the log with a snap, then back to where the stones lie.
  const open = t < 0.16 || t >= 0.82 ? 0 : p < 0.46 ? easeOut(p / 0.46) : p < 0.56 ? 1 - ((p - 0.46) / 0.1) * 1.7 : -0.7 * (1 - ease((p - 0.56) / 0.44))
  const settle = t >= 0.82 ? Math.sin((t - 0.82) * 70) * (1 - seg(t, 0.82, 1)) * 0.12 : 0
  s.put(s.x, s.y, 0.2, () => {
    ctx.scale(flip, 1)
    // The log goes in a third at each bite, pulled by the teeth that have shut on it: only what is still outside them shows.
    const gone = t < 0.16 ? 0 : t >= 0.82 ? 3 : bite + ease(seg(p, 0.56, 0.92)), end = 70 - 19 * gone + (1 - easeOut(seg(t, 0, 0.14))) * 70
    if (gone < 3) {
      ctx.save(); ctx.beginPath(); ctx.rect(17, -40, 240, 80); ctx.clip()
      moved(ctx, end - 29, 0, 0, 1, () => logBar(ctx, 58, 11))
      ctx.restore()
    }
    // A crumb or two flies from each bite and is gone.
    if (t >= 0.16 && p > 0.56) {
      const q = (p - 0.56) / 0.44, far = 24
      ctx.beginPath()
      for (let i = 0; i < 3; i++) {
        const a = -0.9 + i * 0.9 + chance(s.seed, bite * 3 + i) * 0.5, d = (10 + 16 * chance(s.seed, 20 + i)) * easeOut(q), size = 2.6 * (1 - q)
        const x = far + Math.cos(a) * d, y = Math.sin(a) * d * 1.3 - 9 * arch(q)
        if (size > 0.3) ctx.rect(x - size / 2, y - size / 2, size, size)
      }
      ink(ctx, LOG, 0.9, LOG_LINE)
    }
  }, FIGURE)
  // The three stones: bigger and with a shadow under them while they are up.
  s.put(s.x, s.y, 0.2, () => {
    ctx.scale(flip, 1)
    for (let i = 0; i < 3; i++) {
      const up = Math.max(0, open), shut = Math.max(0, -open)
      const a = TEETH[i] * (1 + 0.16 * up - 0.42 * shut) + settle * (i - 1), r = 22 + 10 * up - 7 * shut
      const x = Math.cos(a) * r, y = Math.sin(a) * r, big = 1 + 0.65 * up - 0.12 * shut
      if (up > 0.02) { oval(ctx, x + 3 * up + 1, y + 5 * up + 1, 6.6 * big, 5.2 * big, a + 1.4); ctx.fillStyle = SHADOW; ctx.fill() }
      oval(ctx, x, y - 4 * up, 6.6 * big, 5.2 * big * (1 + 0.2 * shut), a + 1.4); ink(ctx, STONE, 1.2)
    }
  }, FIGURE)
}

/** A log in the night: flat tongues of flame burst out and sink back, sparks fly out and fall, and one fat ember pops out and bounces. */
const flares: Show = (s) => {
  const { ctx, t } = s
  const grow = back(seg(t, 0, 0.16)) * (1 - easeIn(seg(t, 0.28, 0.72)))
  if (grow > 0.02) s.put(s.x, s.y, 0, () => {
    // Seven tongues in a fan, the middle ones tallest, drawn as one shape so no line shows between them.
    const fan = (k: number) => {
      ctx.beginPath(); ctx.arc(0, 0, 15 * k * Math.min(1, grow * 1.4), 0, TAU)
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.47 + Math.sin(t * 26 + i * 1.9) * 0.07, away = Math.abs(i - 3)
        const len = (74 - 13 * away + 9 * Math.sin(t * 44 + i * 2.3)) * grow * k, wide = (10 - away) * k * (0.6 + 0.4 * grow)
        const c = Math.cos(a), n = Math.sin(a), bend = Math.sin(t * 31 + i) * 6 * k
        ctx.moveTo(-n * wide, c * wide)
        ctx.quadraticCurveTo(c * len * 0.5 - n * (wide + bend), n * len * 0.5 + c * (wide + bend), c * len, n * len)
        ctx.quadraticCurveTo(c * len * 0.5 + n * (wide - bend), n * len * 0.5 - c * (wide - bend), n * wide, -c * wide)
        ctx.closePath()
      }
    }
    fan(1); mark(ctx, INK, 2.6); ctx.fillStyle = FLAME; ctx.fill()
    fan(0.56); ctx.fillStyle = FLAME_PALE; ctx.fill()
  })
  // Sparks: out fast on their own ways, then down.
  const fly = seg(t, 0.03, 0.9)
  if (fly > 0 && fly < 1) s.put(s.x, s.y, 0, () => {
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (chance(s.seed, i) - 0.5) * 3.6, v = 70 + 90 * chance(s.seed, 30 + i)
      const x = Math.cos(a) * v * fly, y = Math.sin(a) * v * fly + 150 * fly * fly, r = (3.8 - 1.2 * chance(s.seed, 60 + i)) * (1 - fly * fly)
      if (r > 0.3) { ctx.moveTo(x, y - r * 1.5); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.5); ctx.lineTo(x - r, y); ctx.closePath() }
    }
    ink(ctx, FLAME, 1)
  })
  // The pop: one ember leaves late, lands, bounces twice and goes grey.
  const pop = seg(t, 0.3, 0.96)
  if (pop > 0) {
    const side = s.seed % 2 ? -1 : 1, hops = [0, 0.5, 0.8, 1], reach = [0, 62, 82, 92]
    let k = 0
    while (k < 2 && pop > hops[k + 1]) k++
    const q = seg(pop, hops[k], hops[k + 1]), x = side * mix(reach[k], reach[k + 1], q), y = 22 - [54, 20, 8][k] * arch(q)
    s.put(s.x, s.y, 0, () => {
      if (pop < 0.16) rays(ctx, 0, -6, [-2.5, -1.9, -1.2, -0.6], 20 + 60 * pop, 30 + 110 * pop, INK, 1.6)
      disc(ctx, x, y, 4.6 - 1.2 * pop); ink(ctx, t > 0.86 ? SOOT : FLAME, 1.2)
      if (t <= 0.86) { disc(ctx, x - 0.6, y - 0.6, 1.8); ctx.fillStyle = FLAME_PALE; ctx.fill() }
    })
  }
}

/** A flask: a ring of flame swells out from the fire and thins away, every hat is blown back, and the cook is left sooty and blinking. */
const fireball: Show = (s) => {
  const { ctx, t, board, frame } = s
  const R = 130 * easeOut(seg(t, 0, 0.5)), thick = 38 * (1 - easeIn(seg(t, 0.1, 0.66)))
  if (thick > 0.4) s.put(s.x, s.y, 0, () => {
    const ring = (out: number, tooth: number, inn: number) => {
      ctx.beginPath()
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * TAU, r = R + out + tooth * Math.pow(Math.abs(Math.sin(a * 8 + t * 9 + Math.sin(a * 3) * 0.8)), 1.6)
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      ctx.closePath()
      const hole = R - inn
      if (hole > 1) { ctx.moveTo(hole, 0); ctx.arc(0, 0, hole, 0, TAU, true) }
    }
    ring(thick * 0.3, thick * 0.9, thick * 0.5); ctx.fillStyle = FLAME; ctx.fill('evenodd'); mark(ctx, INK, 1.5)
    ring(thick * 0.05, thick * 0.3, thick * 0.28); ctx.fillStyle = FLAME_PALE; ctx.fill('evenodd')
  })
  // At each camper the ring reaches, a puff jumps away from the head and settles back: the hat, blown.
  for (const camper of board.campers) {
    const place = frame.places?.[camper.who], head = place ? { x: place.x, y: place.y } : camper.head
    const dx = head.x - s.x, dy = head.y - s.y, far = Math.hypot(dx, dy) || 1, away = Math.atan2(dy, dx)
    const hit = 0.14 + 0.16 * clamp01(far / (290 * board.u)), p = seg(t, hit, hit + 0.5)
    if (p <= 0 || p >= 1) continue
    const q = (p - 0.14) / 0.86, jump = p < 0.14 ? easeOut(p / 0.14) : (1 - q) * (1 - q) * (1 + 0.35 * Math.sin(q * TAU * 1.5))
    s.put(head.x, head.y, away, () => {
      const d = 16 + 26 * jump, puff = 1.45 * (1 - 0.5 * p)
      rays(ctx, 0, 0, [-0.4, 0, 0.4], 14, 14 + 20 * jump, INK, 1.5)
      cloud(ctx, [d, 0, 6.5 * puff, d + 8, -6, 4.6 * puff, d + 8, 6, 4.6 * puff, d + 15, 0, 3.8 * puff])
    })
  }
  // The cook's eyebrows: a sooty smudge over the face, with two eyes that look one way, then the other, and blink.
  const cook = board.campers.find((camper) => camper.who === 'cook'), soot = seg(t, 0.3, 0.38) * (1 - seg(t, 0.9, 1))
  if (cook && soot > 0) {
    const place = frame.places?.cook, head = place ? { x: place.x, y: place.y } : cook.head
    s.put(head.x, head.y, 0, () => {
      ctx.beginPath()
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * TAU, r = (15.5 + 3.4 * Math.sin(a * 7 + 1)) * back(soot)
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r - 3); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r - 3)
      }
      ctx.closePath(); ink(ctx, SOOT, 1.3)
      const blink = (t > 0.52 && t < 0.56) || (t > 0.74 && t < 0.78), look = t < 0.64 ? -1.1 : 1.1
      for (const side of [-1, 1]) {
        if (blink) line(ctx, side * 4.6 - 2.6, -3, side * 4.6 + 2.6, -3, WHITE, 1.5)
        else { disc(ctx, side * 4.6, -3, 3.3 * soot); ctx.fillStyle = WHITE; ctx.fill(); disc(ctx, side * 4.6 + look, -3, 1.4 * soot); ctx.fillStyle = BLACK; ctx.fill() }
      }
    }, FIGURE)
  }
}

/** A can at dusk: a puddle spreads over the ring of stones, a frog hops in from the pool's side, sits, croaks once and hops off as it dries. */
const puddleAndFrog: Show = (s) => {
  const { ctx, t, board } = s
  const R = 46 * back(seg(t, 0, 0.2)) * (1 - easeIn(seg(t, 0.74, 0.98)))
  if (R > 0.5) s.put(s.x, s.y, 0, () => {
    const edge = (k: number, dx: number, dy: number) => {
      ctx.beginPath()
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * TAU, r = R * k * (1 + 0.1 * Math.sin(a * 3 + 1 + s.seed) + 0.06 * Math.sin(a * 5 + 2 + t * 5))
        if (i === 0) ctx.moveTo(dx + Math.cos(a) * r * 1.12, dy + Math.sin(a) * r * 0.9); else ctx.lineTo(dx + Math.cos(a) * r * 1.12, dy + Math.sin(a) * r * 0.9)
      }
      ctx.closePath()
    }
    edge(1, 0, 0); ink(ctx, WATER, 1.4, WATER_DARK)
    // One pale glint lying on it.
    ctx.beginPath(); ctx.arc(0, 0, R * 0.62, Math.PI * 1.08, Math.PI * 1.42); mark(ctx, WATER_PALE, 2.4)
  })
  // The frog comes the way the pool lies, in two hops, and leaves the same way in one.
  const tx = board.frog.x - s.x, ty = board.frog.y - s.y, len = Math.hypot(tx, ty) || 1, dx = tx / len, dy = ty / len
  let d = 118, lift = 0, turned = 0
  if (t < 0.2) return
  if (t < 0.35) { const q = seg(t, 0.2, 0.35); d = mix(118, 60, q); lift = arch(q) }
  else if (t < 0.38) d = 60
  else if (t < 0.52) { const q = seg(t, 0.38, 0.52); d = mix(60, 4, q); lift = arch(q) }
  else if (t < 0.86) { d = 4; turned = ease(seg(t, 0.78, 0.86)) }
  else { const q = seg(t, 0.86, 1); d = mix(4, 96, q); lift = arch(q * 0.86); turned = 1 }
  const croak = arch(seg(t, 0.58, 0.72)), size = 1.9 * (1 + 0.45 * lift) * (1 - seg(t, 0.96, 1))
  // Rings on the water where it landed, and again as it croaks.
  for (const from of [0.52, 0.6]) {
    const ring = seg(t, from, from + 0.2)
    if (ring > 0 && ring < 1 && R > 20) s.put(s.x + dx * 4 * board.u, s.y + dy * 4 * board.u, 0, () => { oval(ctx, 0, 0, 10 + 24 * ring, 8 + 18 * ring); mark(ctx, WATER_PALE, 2 * (1 - ring) + 0.4) })
  }
  s.put(s.x + dx * d * board.u, s.y + dy * d * board.u, Math.atan2(-dx, dy) + Math.PI * turned, () => frog(ctx, croak, lift), size)
}

/** Where the puffs of the steam cloud lie about its middle, and how big each is. */
const CLOUD = [0, 0, 44, -44, 12, 31, 40, 18, 33, -18, -34, 34, 30, -30, 30, -4, 40, 28, 58, -6, 22]

/** A can in the night: a cloud of steam swells up over the fire, big enough to hide the map under it, drifts up and to the right and thins out. */
const steamCloud: Show = (s) => {
  const { ctx, t } = s
  const drift = ease(seg(t, 0.2, 1)), apart = 1 + 0.55 * seg(t, 0.45, 1)
  s.put(s.x, s.y, 0, () => {
    // The hiss at its foot: a few short jets before the cloud is up.
    const hiss = seg(t, 0, 0.2)
    if (hiss < 1) rays(ctx, 0, 0, [-2.6, -2.05, -1.57, -1.1, -0.55], 16 + 30 * hiss, 26 + 52 * hiss, PENCIL, 1.8)
    const puffs: number[] = []
    for (let i = 0; i < CLOUD.length; i += 3) {
      const k = i / 3, up = back(seg(t, 0.03 * k, 0.2 + 0.035 * k)), thin = 1 - easeIn(seg(t, 0.52 + 0.05 * ((k * 3) % 7), 0.86 + 0.02 * ((k * 3) % 7)))
      const billow = 1 + 0.05 * Math.sin(t * 22 + k * 1.7)
      const x = CLOUD[i] * apart * up + 78 * drift, y = CLOUD[i + 1] * apart * up - 22 * up - 62 * drift, r = CLOUD[i + 2] * up * thin * billow
      // Each puff has a smaller one at its shoulder, so what is left as it thins is still cloud and not a ball.
      puffs.push(x, y, r, x + r * (k % 2 ? 0.8 : -0.8), y + r * 0.42, r * 0.62)
    }
    cloud(ctx, puffs, STEAM, PENCIL, 1.6)
    // Two curls of pencil inside it, so it reads as round and thick.
    const whole = 1 - seg(t, 0.5, 0.62)
    if (t > 0.2 && whole > 0) {
      ctx.beginPath()
      ctx.arc(-14 + 78 * drift, -26 - 62 * drift, 17, 0.5, 2.1); ctx.moveTo(34 + 78 * drift, -6 - 62 * drift); ctx.arc(22 + 78 * drift, -8 - 62 * drift, 12, 0.2, 1.9)
      mark(ctx, PENCIL, 1.3 * whole)
    }
  })
}

/** A lantern on the fire: a red glow that pulses, and three thin jets of steam whistling out one after another, each shorter than the last. */
const whistles: Show = (s) => {
  const { ctx, t } = s
  const beat = Math.sin(t * TAU * 5), fadeOut = 1 - seg(t, 0.84, 1)
  s.put(s.x, s.y, 0, () => {
    ctx.globalAlpha = fadeOut * (0.5 + 0.3 * beat)
    disc(ctx, 0, 0, 33 + 4 * beat); mark(ctx, RED, 7)
    ctx.globalAlpha = fadeOut
    disc(ctx, 0, 0, 39 + 6 * beat); mark(ctx, RED, 1.6)
    ctx.globalAlpha = 1
  })
  const jets = [[0.06, 0.36, -2.1, 82], [0.36, 0.62, -1.2, 58], [0.62, 0.84, -1.75, 36]]
  for (const [from, to, turn, reach] of jets) {
    const p = seg(t, from, to)
    if (p <= 0 || p >= 1) continue
    const out = easeOut(seg(p, 0, 0.3)), gone = easeIn(seg(p, 0.55, 1)), trill = Math.sin(t * 190) * 1.4
    s.put(s.x, s.y, turn + Math.sin(t * 60) * 0.03, () => {
      const tip = 16 + reach * out, foot = 16 + reach * gone
      if (tip - foot < 2) return
      // A thin jet of steam, widening into puffs as it goes, and marks beside it that shake with the note.
      const puffs: number[] = []
      for (let i = 0; i <= 9; i++) { const x = mix(foot, tip, i / 9), k = (x - 16) / reach; puffs.push(x, Math.sin(k * 11 - t * 90) * 1.6 * k, 1.2 + 7.4 * Math.pow(k, 0.85)) }
      cloud(ctx, puffs, STEAM, PENCIL, 1.3)
      const mid = (foot + tip) / 2
      ctx.beginPath()
      for (const side of [-1, 1]) for (let i = 0; i < 2; i++) { const x = mid - 8 + i * 14; ctx.moveTo(x, side * (12 + trill)); ctx.lineTo(x + 7, side * (15 + trill)) }
      mark(ctx, PENCIL, 1.4)
    })
  }
}

/** A card on the fire: a thin wisp of smoke winds up from one corner, the corner curls, and the card shakes itself flat. */
const cornerCurls: Show = (s) => {
  const { ctx, t } = s
  const tall = 96 * easeOut(seg(t, 0.1, 0.52)), off = easeIn(seg(t, 0.56, 0.92))
  const here = back(seg(t, 0, 0.09)) * (1 - easeIn(seg(t, 0.94, 1))), shake = seg(t, 0.68, 0.74) * (1 - seg(t, 0.92, 1))
  // The card lies on the fire; one corner curls over and browns, and is shaken flat again.
  const curl = 17 * ease(seg(t, 0.06, 0.3)) * (1 - seg(t, 0.68, 0.76))
  if (here > 0.02) s.put(s.x, s.y, -0.1 + Math.sin(t * 260) * 0.07 * shake, () => {
    ctx.scale(here, here)
    const cut = [-29, -17, 29 - curl, -17, 29, -17 + curl, 29, 17, -29, 17]
    ctx.save(); poly(ctx, cut); ctx.clip(); smallCard(ctx, 1.93); ctx.restore()
    poly(ctx, cut); mark(ctx, BLACK, 1.3)
    if (curl > 0.5) { poly(ctx, [29 - curl, -17, 29, -17 + curl, 29 - curl, -17 + curl]); ink(ctx, t > 0.34 ? BARK : t > 0.2 ? TOAST : STEAM, 1.2) }
  })
  s.put(s.x, s.y, 0, () => {
    if (tall > 2 && off < 1) {
      const points: number[] = []
      for (let i = 0; i <= 26; i++) {
        const k = mix(off, 1, i / 26)
        points.push(22 + (3 + 15 * k) * Math.sin(k * 7.5 - t * 10) + 18 * k * k, -14 - tall * k)
      }
      wisp(ctx, points, 2.6)
    }
    // Shake lines: short arcs either side that jump in and out as it shakes.
    if (shake > 0) {
      const jolt = Math.sin(t * 260) * 3 * shake
      ctx.beginPath()
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
        const r = 12 + i * 4, x = side * (44 + i * 7 + jolt * side * (i % 2 ? -1 : 1))
        ctx.moveTo(x + side * r * (Math.cos(0.7) - 1), -r * Math.sin(0.7)); ctx.arc(x - side * r, 0, r, side > 0 ? -0.7 : Math.PI + 0.7, side > 0 ? 0.7 : Math.PI - 0.7, side < 0)
      }
      mark(ctx, PENCIL, 1.6 * shake)
    }
  })
}

/** A marshmallow on the fire: it swells in gulps until it is as big as a tent, browns from the top, then sags flat with a sigh and is gone. */
const swellsAndSags: Show = (s) => {
  const { ctx, t } = s
  const gulp = seg(t, 0, 0.48) * 3, step = Math.min(2, Math.floor(gulp)), within = gulp - step
  const size = t >= 0.48 ? 70 : mix([9, 28, 50][step], [28, 50, 70][step], back(seg(within, 0, 0.7)))
  const sag = easeIn(seg(t, 0.68, 0.93)), gone = seg(t, 0.93, 1), toast = seg(t, 0.4, 0.68)
  const wobble = t < 0.68 ? Math.sin(t * 60) * 0.035 * seg(t, 0.05, 0.3) : 0
  const w = size * (1 + wobble + 0.75 * sag) * (1 - gone), h = size * (1 - wobble) * (1 - 0.9 * sag), foot = 12
  if (w < 0.6 || h < 0.4) return
  s.put(s.x, s.y, 0, () => {
    const r = Math.min(w, h) * 0.3, dip = h * 0.55 * sag
    const body = () => {
      ctx.beginPath(); ctx.moveTo(-w / 2 + r, foot)
      ctx.quadraticCurveTo(-w / 2, foot, -w / 2, foot - r); ctx.lineTo(-w / 2, foot - h + r); ctx.quadraticCurveTo(-w / 2, foot - h, -w / 2 + r, foot - h)
      ctx.quadraticCurveTo(0, foot - h + dip * 2, w / 2 - r, foot - h)
      ctx.quadraticCurveTo(w / 2, foot - h, w / 2, foot - h + r); ctx.lineTo(w / 2, foot - r); ctx.quadraticCurveTo(w / 2, foot, w / 2 - r, foot)
      ctx.closePath()
    }
    body(); ink(ctx, WHITE, 0)
    if (toast > 0) {
      // The top browns: a flat cap, and a darker crown on that.
      ctx.save(); body(); ctx.clip()
      oval(ctx, 0, foot - h, w * 0.62, h * 0.52 * toast + dip); ctx.fillStyle = TOAST; ctx.fill()
      if (toast > 0.5) { oval(ctx, 0, foot - h, w * 0.4, h * 0.3 * (toast - 0.5) * 2 + dip * 0.8); ctx.fillStyle = BARK; ctx.fill() }
      ctx.restore()
    }
    body(); mark(ctx, BLACK, 1.5)
    // Each gulp of swelling strains at the seams: short marks all round that open and shut.
    if (t < 0.48) rays(ctx, 0, foot - h / 2, [-2.6, -2.1, -1.57, -1.04, -0.54, 0.2, 2.94], size * 0.6 + 3, size * 0.6 + 3 + 9 * arch(within), INK, 1.4)
    // The sigh: air let out at one side as it sags.
    const sigh = seg(t, 0.7, 0.9)
    if (sigh > 0 && sigh < 1) rays(ctx, w / 2, foot - h / 2, [-0.3, 0, 0.3], 5 + 16 * sigh, 12 + 26 * sigh, PENCIL, 1.5)
  })
}

/** A light with nothing left to burn: the flame sputters down to nothing, and one puff of smoke goes up from where it was. */
const gutters: Show = (s) => {
  const { ctx, t } = s
  const q = seg(t, 0, 0.6), size = (1 - q) * (0.72 + 0.28 * Math.abs(Math.sin(q * Math.PI * 4.5)))
  if (size > 0.03) s.put(s.x, s.y, 0, () => { ctx.translate(0, 6); flame(ctx, size * 1.5, Math.sin(t * 46) * 0.9 * q) })
  const p = seg(t, 0.5, 1)
  if (p > 0 && p < 1) s.put(s.x, s.y, 0, () => {
    const r = 13 * easeOut(seg(p, 0, 0.5)) * (1 - easeIn(seg(p, 0.6, 1))), x = Math.sin(p * 5) * 7, y = -10 - 60 * easeOut(p)
    // One puff, with a small one trailing up after it.
    cloud(ctx, [x, y, r, x + r * 0.8, y + r * 0.5, r * 0.55, x - r * 0.7, y + r * 0.6, r * 0.45, -x * 0.6, y + 22 - 8 * p, r * 0.34])
  })
}

// --- Pieces dropped on a lantern ----------------------------------------------------

/** The point of the stream, on the map, that lies nearest a place. */
function streamNear(board: Board, x: number, y: number): { x: number; y: number } {
  let best = { x, y }, least = Infinity
  for (const onMap of [true, false]) {
    for (const p of TERRAIN.stream) {
      const px = p.x * board.w, py = p.y * board.h
      if (onMap && (px < board.inset || px > board.flap.top - board.inset || py < board.inset || py > board.walkway)) continue
      const d = Math.hypot(px - x, py - y)
      if (d < least) { least = d; best = { x: px, y: py } }
    }
    if (least < Infinity) break
  }
  return best
}

/** A log on a lantern: it teeters on top, falls off and tumbles away the other way, and where the lantern meets the stream there is a splash and a hiss. */
const tipsAndRolls: Show = (s) => {
  const { ctx, t, board } = s
  const water = streamNear(board, s.x, s.y), wx = water.x - s.x, wy = water.y - s.y, far = Math.hypot(wx, wy) || 1
  const ax = -wx / far, ay = -wy / far
  if (t < 0.2) {
    // Balancing: it rocks further each time.
    const q = t / 0.2
    s.put(s.x, s.y, Math.sin(q * TAU * 1.75) * 0.5 * q, () => {
      box(ctx, -19, -3, 46, 11, 2.6); ctx.fillStyle = SHADOW; ctx.fill()
      moved(ctx, 0, -3, 0, 1, () => logBar(ctx, 46, 11))
    })
  } else if (t < 0.56) {
    const q = seg(t, 0.2, 0.46), d = 78 * easeOut(q), hop = 16 * Math.abs(Math.sin(q * Math.PI * 2.5)) * (1 - q), away = 1 - seg(t, 0.5, 0.56)
    s.put(s.x + ax * d * board.u, s.y + (ay * d - hop) * board.u, q * TAU * 1.5 * (ax < 0 ? -1 : 1), () => logBar(ctx, 46, 11), away)
  }
  const p = seg(t, 0.55, 0.8)
  if (p > 0) {
    // The splash: rings that widen on the water, and a crown of drops that goes up and comes down.
    if (p < 1) s.put(water.x, water.y, 0, () => {
      ctx.beginPath()
      for (const lag of [0, 0.25, 0.5]) if (p > lag) { const r = 6 + 44 * (p - lag); ctx.moveTo(r * 1.2, 0); ctx.ellipse(0, 0, r * 1.2, r * 0.8, 0, 0, TAU) }
      mark(ctx, WATER_DARK, 2.4 * (1 - p) + 0.5)
      // The water thrown up in the middle of it.
      const up = arch(seg(p, 0, 0.7))
      if (up > 0.05) { ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-5, -20 * up, 0, -44 * up); ctx.quadraticCurveTo(5, -20 * up, 9, 0); ctx.closePath(); ink(ctx, WATER, 1.3, WATER_DARK) }
      const list: number[] = []
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.33, v = 58 + 14 * (i % 2); list.push(Math.cos(a) * v * p, Math.sin(a) * v * p + 70 * p * p - 6, 4.2 * (1 - p * p), Math.atan2(Math.sin(a) * v + 140 * p, Math.cos(a) * v)) }
      drops(ctx, list)
    })
    // The hiss: three small puffs of steam that go up and thin.
    const h = seg(t, 0.6, 0.97)
    if (h > 0 && h < 1) s.put(water.x, water.y, 0, () => {
      const puffs: number[] = []
      for (let i = 0; i < 3; i++) { const k = seg(h, i * 0.16, 0.68 + i * 0.16), r = 12 * arch(k); puffs.push((i - 1) * 16 + Math.sin(k * 6 + i) * 4, -10 - 52 * easeOut(k), r, (i - 1) * 16 + r * 0.8, -6 - 52 * easeOut(k), r * 0.6) }
      cloud(ctx, puffs)
    })
  }
}

/** A flask in its lantern: the oil glugs in, and the lantern burps one fat smoke ring that rises and widens. */
const burpsARing: Show = (s) => {
  const { ctx, t } = s
  // The glugs: three amber drops going in at the cap, one after another.
  const glug = seg(t, 0, 0.27) * 3, which = Math.floor(glug), g = glug - which
  if (t < 0.27 && which < 3) s.put(s.x, s.y, 0, () => { const r = 6.4 * (1 - 0.6 * g); oval(ctx, (which - 1) * 3, -34 + 30 * easeIn(g), r * (1 - 0.25 * g), r * (1 + 0.5 * g)); ink(ctx, OIL, 1.1, OIL_LINE) })
  const q = seg(t, 0.3, 1)
  if (q <= 0) return
  s.put(s.x, s.y, 0, () => {
    if (q < 0.14) rays(ctx, 0, -8, [-2.4, -1.57, -0.74], 12 + 40 * q, 18 + 90 * q, INK, 1.5)
    const rise = easeOut(q), rx = (8 + 30 * rise) * (1 + 0.07 * Math.sin(q * 24)), ry = rx * 0.44 * (1 - 0.07 * Math.sin(q * 24))
    const tube = 8.5 * (1 - 0.72 * q) * (1 - seg(q, 0.86, 1))
    if (tube < 0.4) return
    ctx.translate(Math.sin(q * 5) * 5, -14 - 88 * rise); ctx.rotate(0.14 * Math.sin(q * 8))
    ctx.beginPath(); ctx.ellipse(0, 0, rx + tube / 2, ry + tube / 2, 0, 0, TAU)
    if (ry > tube / 2 + 0.6) { ctx.moveTo(rx - tube / 2, 0); ctx.ellipse(0, 0, rx - tube / 2, ry - tube / 2, 0, 0, TAU, true) }
    mark(ctx, PENCIL, 3); ctx.fillStyle = STEAM; ctx.fill('evenodd')
  })
}

/** A can on a lantern: it gargles small bubbles, then blows one big one that wobbles up and drifts off the top of the sheet. */
const garglesABubble: Show = (s) => {
  const { ctx, t, board } = s
  const bubble = (x: number, y: number, rx: number, ry: number) => {
    oval(ctx, x, y, rx, ry); ctx.fillStyle = 'rgba(195, 225, 238, 0.62)'; ctx.fill(); mark(ctx, WATER_DARK, 1.3)
    ctx.beginPath(); ctx.ellipse(x, y, rx * 0.62, ry * 0.62, 0, Math.PI * 1.1, Math.PI * 1.5); mark(ctx, WHITE, Math.min(2.2, rx * 0.2))
  }
  if (t < 0.5) s.put(s.x, s.y, 0, () => {
    for (let i = 0; i < 10; i++) {
      const from = i * 0.034, p = seg(t, from, from + 0.19)
      if (p <= 0 || p >= 1) continue
      const x = (chance(s.seed, i) - 0.5) * 44 + Math.sin(t * 90 + i) * 1.2, y = -6 - 20 * chance(s.seed, 9 + i) - 14 * p, r = (5.5 + 4.5 * chance(s.seed, 19 + i)) * arch(p / 1.6)
      if (p < 0.8) bubble(x, y, r, r)
      // Five rays, unevenly spread: four at right angles would be a plus.
      else rays(ctx, x, y, [0.4, 1.5, 2.95, 4.05, 5.4], 3, 3 + 4 * ((p - 0.8) / 0.2), WATER_DARK, 1.1)
    }
  })
  const grow = seg(t, 0.3, 0.52)
  if (grow <= 0) return
  // The big one: it swells on the cap, lets go, and goes up over the edge of the map.
  const up = easeIn(seg(t, 0.52, 1)), r = 22 * easeOut(grow), wob = Math.sin(t * 42) * 0.13 * (1 - 0.5 * up)
  const top = -(s.y / board.u) - 34
  s.put(s.x, s.y, 0, () => bubble(Math.sin(up * 7) * 16 + 34 * up, mix(-10 - r * 0.6, top, up), r * (1 + wob), r * (1 - wob)))
}

/** A lantern on a lantern: wobble marks either side of the stack, further out on the side it leans to, until the top one slides off. */
const stackSways: Show = (s) => {
  const { ctx, t } = s
  const live = 1 - seg(t, 0.72, 0.84), sway = Math.sin(t * TAU * 3.25) * (0.35 + 0.65 * seg(t, 0, 0.7)) * live
  if (live > 0) s.put(s.x, s.y, sway * 0.16, () => {
    ctx.beginPath()
    for (const side of [-1, 1]) {
      const lean = Math.max(0, side * sway), n = lean > 0.45 ? 3 : 2
      for (let i = 0; i < n; i++) {
        const r = 17 + 5 * i + 6 * lean, x = side * (37 + 8 * i + 15 * lean) - side * r, half = 0.46 + 0.3 * lean
        ctx.moveTo(x + side * r * Math.cos(half), -15 - r * Math.sin(half))
        ctx.arc(x, -15, r, side > 0 ? -half : Math.PI + half, side > 0 ? half : Math.PI - half, side < 0)
      }
    }
    mark(ctx, PENCIL, 1.9)
  })
  // The slide: two falling strokes on the side it goes off, like the tail of a slide whistle.
  const slide = seg(t, 0.7, 0.96)
  if (slide > 0 && slide < 1) {
    const side = s.seed % 2 ? -1 : 1
    s.put(s.x, s.y, 0, () => {
      ctx.beginPath()
      for (let i = 0; i < 2; i++) {
        const lag = clamp01(slide * 1.25 - i * 0.2), x = side * (22 + 30 * lag + 9 * i), y = -30 + 50 * lag * lag
        ctx.moveTo(x - side * 13, y - 15 + 8 * lag); ctx.quadraticCurveTo(x - side * 2, y - 12, x, y)
      }
      mark(ctx, PENCIL, 2.4 * (1 - slide) + 0.2)
    })
  }
}

/** A card on a lantern: stuck on as a shade, it cuts the light into pale stripes that reach out and turn slowly. */
const stripedLight: Show = (s) => {
  const { ctx, t } = s
  const out = back(seg(t, 0, 0.16)) * (1 - easeIn(seg(t, 0.86, 1)))
  if (out <= 0.02) return
  s.put(s.x, s.y, t * 0.9 + (s.seed % 7) * 0.3, () => {
    const near = 31, far = near + 40 * out, n = 13
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, half = (TAU / n) * 0.24
      ctx.moveTo(Math.cos(a - half) * near, Math.sin(a - half) * near)
      ctx.lineTo(Math.cos(a - half) * far, Math.sin(a - half) * far)
      ctx.arc(0, 0, far, a - half, a + half)
      ctx.lineTo(Math.cos(a + half) * near, Math.sin(a + half) * near)
      ctx.arc(0, 0, near, a + half, a - half, true)
    }
    ctx.globalAlpha = 0.82; ctx.fillStyle = FLAME_PALE; ctx.fill(); ctx.globalAlpha = 1
    mark(ctx, FLAME, 1.1)
  })
  // The card itself, slapped on over the cap and a little askew.
  const stuck = back(seg(t, 0, 0.1)) * (1 - easeIn(seg(t, 0.9, 1)))
  if (stuck > 0.02) s.put(s.x, s.y, 0.22 + Math.sin(t * 40) * 0.05 * (1 - seg(t, 0, 0.3)), () => smallCard(ctx, 1.55 * stuck))
}

/** A marshmallow on a lantern: white goo spreads over the glass and runs down, and four moths fly in, stick in it and flap. */
const meltsAndMoths: Show = (s) => {
  const { ctx, t } = s
  const spread = easeOut(seg(t, 0, 0.22)), back2 = 1 - easeIn(seg(t, 0.88, 1))
  s.put(s.x, s.y, 0, () => {
    const k = spread * back2
    if (k < 0.03) return
    const trace = () => {
      ctx.beginPath(); ctx.ellipse(0, -2, 24 * k, 19 * k, 0, 0, TAU)
      for (let i = 0; i < 4; i++) {
        // A run of goo: a neck that thins as it gets longer, and a fat drop at the end of it.
        const x = (-17 + i * 11.5 + 3 * chance(s.seed, 30 + i)) * k, len = (4 + 24 * chance(s.seed, 5 + i)) * ease(seg(t, 0.1 + 0.07 * ((i * 3) % 4), 0.82)) * back2
        const neck = (3.4 - len * 0.04) * k, bulb = (4 + 2 * chance(s.seed, i)) * k
        ctx.moveTo(x + neck + 2, 4); ctx.lineTo(x + neck, 9 + len); ctx.arc(x, 9 + len, bulb, 0, Math.PI); ctx.lineTo(x - neck - 2, 4); ctx.closePath()
      }
    }
    trace(); mark(ctx, BLACK, 2.8); ctx.fillStyle = WHITE; ctx.fill()
    ctx.beginPath(); ctx.arc(-3, -4, 13 * k, Math.PI * 1.05, Math.PI * 1.45); mark(ctx, STEEL, 1.6)
  })
  // The moths: in on a curve, then stuck, tugging and flapping, and off again as the goo goes.
  for (let i = 0; i < 4; i++) {
    const from = 0.2 + 0.07 * i, come = easeOut(seg(t, from, from + 0.2)), go = easeIn(seg(t, 0.9, 1))
    if (come <= 0) continue
    const a = 0.6 + i * 1.7 + chance(s.seed, 40 + i), d = mix(86, 7 + 9 * chance(s.seed, 50 + i), come) + 70 * go
    const stuck = come >= 1 && go <= 0, tug = stuck ? Math.max(0, Math.sin(t * 52 + i * 2)) * 3.2 : 0, swing = (1 - come) * 1.3
    const x = Math.cos(a + swing) * (d + tug), y = Math.sin(a + swing) * (d + tug) - 2
    s.put(s.x, s.y, 0, () => moved(ctx, x, y, a + swing + Math.PI / 2 + (stuck ? Math.sin(t * 31 + i) * 0.3 : Math.PI), 1.15, () => moth(ctx, Math.abs(Math.sin(t * (stuck ? 120 : 70) + i * 1.3)))))
  }
}

// --- Pieces dropped on a camper ------------------------------------------------------

/** What the view needs to know of a camper to play a show on it: its skin, where its head lies in its own frame and how big that is from above. */
type Manner = { skin: string; headY: number; headR: number; bag: string }
const MANNER: Record<CamperId, Manner> = {
  reader: { skin: '#ecc9a2', headY: -3, headR: 11, bag: '#6283a6' },
  sleeper: { skin: '#e2b98c', headY: 6, headR: 13, bag: '#e2b64c' },
  cook: { skin: '#c88f60', headY: -3, headR: 12, bag: '#5f7a40' },
  scout: { skin: '#8c5c3c', headY: -2, headR: 16.5, bag: '#96693f' },
  small: { skin: '#a87248', headY: -2, headR: 11.5, bag: '#c9a7c0' },
}
const camperOf = (s: Stage): CamperId => (s.who !== null && s.who in MANNER ? s.who : 'scout')
/** Which way the camper of a show lies: as the frame has it now, or as the board laid it. */
function lies(s: Stage): number {
  const place = s.who ? s.frame.places?.[s.who] : undefined
  if (place && Number.isFinite(place.turn)) return place.turn
  return s.board.campers.find((camper) => camper.who === s.who)?.turn ?? 0
}
/** Places a figure in the camper's own frame: the head just above the origin, the feet below. */
const onCamper = (s: Stage, draw: () => void) => s.put(s.x, s.y, lies(s), draw, FIGURE)
/** Only what lies outside a strip down the middle is drawn: a thing tucked under a bag shows at both sides of it. */
function underBag(ctx: Ctx, half: number) { ctx.beginPath(); ctx.rect(-120, -120, 120 - half, 240); ctx.rect(half, -120, 120 - half, 240); ctx.clip() }

// A log, each camper in their own way.
const LOG_WAYS: Record<CamperId, Show> = {
  // The reader sits on it: it is pushed under in two shy shoves, bends with a creak, and is pulled out the other side.
  reader(s) {
    const { ctx, t } = s
    const inn = 0.55 * ease(seg(t, 0, 0.13)) + 0.45 * ease(seg(t, 0.2, 0.34)), x = -56 * (1 - inn) + 64 * easeIn(seg(t, 0.86, 1))
    const sat = back(seg(t, 0.4, 0.5)) * (1 - seg(t, 0.8, 0.86)), creak = Math.sin(t * 34) * 0.05 * seg(t, 0.5, 0.56) * (1 - seg(t, 0.74, 0.86))
    onCamper(s, () => {
      for (const side of [-1, 1]) {
        ctx.save()
        ctx.beginPath(); ctx.rect(side < 0 ? -120 : 13, -120, 107, 240); ctx.clip()
        ctx.translate(x, 28); ctx.rotate(-side * (0.24 * sat + creak))
        logBar(ctx, 50, 11)
        ctx.restore()
      }
    })
    // The creak: three pencil specks at each end, that spread and close. A zigzag there would be a letter.
    const mk = seg(t, 0.42, 0.48) * (1 - seg(t, 0.7, 0.8))
    if (mk > 0) onCamper(s, () => {
      ctx.beginPath()
      for (const side of [-1, 1]) {
        const x0 = side * 31, open = 3 + 2.5 * Math.sin(t * 34)
        for (let i = 0; i < 3; i++) { const x = x0 + side * open * (0.4 + 0.5 * i), y = 12 + i * 4.5; ctx.moveTo(x + 1.3 * mk, y); ctx.arc(x, y, 1.3 * mk, 0, TAU) }
      }
      ctx.fillStyle = PENCIL; ctx.fill()
    })
  },
  // The sleeper takes it as a pillow: it is nudged under the head in three slow shoves, sinks in with a thump, and breathing goes on over it.
  sleeper(s) {
    const { ctx, t } = s
    const inn = (ease(seg(t, 0.16, 0.25)) + ease(seg(t, 0.31, 0.4)) + ease(seg(t, 0.46, 0.55))) / 3
    const y = mix(-66, -5, inn) - 70 * easeIn(seg(t, 0.9, 1)), thump = arch(seg(t, 0.55, 0.68))
    onCamper(s, () => {
      // Under the head: the collar of the bag hides its middle.
      ctx.beginPath(); ctx.rect(-120, -160, 240, 320); ctx.ellipse(0, 6, 17, 13, 0, 0, TAU); ctx.clip('evenodd')
      ctx.translate(0, y); ctx.scale(1 + 0.1 * thump, 1 - 0.16 * thump)
      logBar(ctx, 50, 12)
    })
    if (thump > 0) onCamper(s, () => {
      ctx.beginPath()
      for (const side of [-1, 1]) { ctx.moveTo(side * (29 + 7 * thump), -12); ctx.quadraticCurveTo(side * (33 + 9 * thump), -5, side * (29 + 7 * thump), 2) }
      mark(ctx, PENCIL, 1.7 * thump)
    })
    // Sleep goes on: slow bubbles of breath, one after another, drifting off to one side.
    const breath = seg(t, 0.64, 0.94)
    if (breath > 0 && breath < 1) onCamper(s, () => {
      for (let i = 0; i < 3; i++) {
        const k = seg(breath, i * 0.22, i * 0.22 + 0.5)
        if (k > 0 && k < 1) puff(ctx, 20 + 22 * k + i * 4, 4 - 16 * k, 2 + 5 * k, 1 - k)
      }
    })
  },
  // The cook stirs it round in a pot: brisk, four times round, soup flying.
  cook(s) {
    const { ctx, t } = s
    const here = back(seg(t, 0, 0.1)) * (1 - easeIn(seg(t, 0.92, 1))), round = TAU * 4 * ease(seg(t, 0.1, 0.88)) - 1
    if (here <= 0.02) return
    onCamper(s, () => {
      ctx.translate(31, 24); ctx.scale(here, here)
      for (const side of [-1, 1]) { box(ctx, side * 17 - 3, -3.5, 6, 7, 2); ink(ctx, SOOT, 1.2) }
      disc(ctx, 0, 0, 16); ink(ctx, SOOT, 1.4)
      disc(ctx, 0, 0, 12.5); ink(ctx, '#d9a640', 1.1)
      // The soup goes round after the log.
      ctx.beginPath(); ctx.arc(0, 0, 7.5, round - 2.6, round - 0.5); ctx.moveTo(Math.cos(round - 3.6) * 4, Math.sin(round - 3.6) * 4); ctx.arc(0, 0, 4, round - 3.6, round - 2.2); mark(ctx, '#b98a22', 1.5)
    })
    onCamper(s, () => {
      ctx.translate(31, 24); ctx.scale(here, here)
      const bx = Math.cos(round) * 7, by = Math.sin(round) * 7, tx = Math.cos(round) * 17 + 3, ty = Math.sin(round) * 13 - 19
      moved(ctx, (bx + tx) / 2, (by + ty) / 2, Math.atan2(ty - by, tx - bx), 1, () => logBar(ctx, Math.hypot(tx - bx, ty - by) + 10, 10))
    })
    // A drop of soup leaves the pot each time the log comes round.
    const turns = (round + 1) / TAU, k = turns - Math.floor(turns)
    if (t > 0.14 && t < 0.88) onCamper(s, () => {
      ctx.translate(31, 24)
      const list: number[] = []
      for (let i = 0; i < 2; i++) { const a = 0.5 + Math.floor(turns) * 1.9 + i * 2.6, d = 16 + 20 * easeOut(k); list.push(Math.cos(a) * d, Math.sin(a) * d - 8 * arch(k), 2.6 * (1 - k), a) }
      drops(ctx, list, '#d9a640', '#8a5a06')
    })
  },
  // The scout whittles it: four even strokes of the knife, the end comes to a point, and a shaving flies from each.
  scout(s) {
    const { ctx, t } = s
    const here = seg(t, 0, 0.08) * (1 - seg(t, 0.93, 1)), work = seg(t, 0.1, 0.86) * 4, stroke = Math.min(3, Math.floor(work)), p = work - stroke
    if (here <= 0) return
    const done = t < 0.1 ? 0 : t >= 0.86 ? 4 : stroke + easeOut(seg(p, 0, 0.55)), point = 4.5 * done
    onCamper(s, () => {
      ctx.translate(0, 23); ctx.scale(here, here)
      poly(ctx, [-25, -5.5, 25 - point, -5.5, 27, 0, 25 - point, 5.5, -25, 5.5]); ink(ctx, LOG, 1.2, LOG_LINE)
      if (point > 1) { line(ctx, 25 - point, -5.5, 25 - point * 0.55, 0, LOG_LINE, 0.9); line(ctx, 25 - point, 5.5, 25 - point * 0.55, 0, LOG_LINE, 0.9) }
    })
    // The knife: along the end and off, then lifted back for the next.
    if (t >= 0.1 && t < 0.86) onCamper(s, () => {
      const cut = p < 0.55, k = cut ? ease(p / 0.55) : ease((p - 0.55) / 0.45)
      ctx.translate(cut ? mix(6, 28, k) : mix(28, 6, k), 23 - 6.5 - (cut ? 0 : 9 * arch(k))); ctx.rotate(cut ? 0.32 : 0.05)
      poly(ctx, [0, -2.2, 13, 0.6, 0, 2.2]); ink(ctx, STEEL, 1.1, BLACK)
      box(ctx, -10, -2.6, 10.5, 5.2, 2); ink(ctx, BARK, 1.1)
    })
    // The shavings: each curls off, flies and lies where it fell.
    if (t >= 0.1) onCamper(s, () => {
      for (let i = 0; i <= stroke; i++) {
        const age = t >= 0.86 || i < stroke ? 1 : seg(p, 0.3, 1), land = { x: 36 + i * 5.5, y: 30 - (i % 2) * 6 }
        if (i === stroke && t < 0.86 && p < 0.3) continue
        const x = mix(27, land.x, age), y = mix(17, land.y, age) - 22 * arch(age), spin = age * 5 + i
        // A shaving is a small flat flake that tumbles: a curl of it would be a letter.
        ctx.save(); ctx.translate(x, y); ctx.rotate(spin); box(ctx, -3.6, -1.5, 7.2, 3, 1.4); ink(ctx, LOG, 1, LOG_LINE); ctx.restore()
      }
    })
  },
  // The small one rides it like a rocking horse: quick, end over end, with dust at whichever end comes down.
  small(s) {
    const { ctx, t } = s
    const here = back(seg(t, 0, 0.08)) * (1 - seg(t, 0.94, 1)), go = ease(seg(t, 0.06, 0.16)) * (1 - seg(t, 0.84, 0.94))
    if (here <= 0.02) return
    const beat = Math.sin(t * TAU * 6.5), rock = 0.44 * beat * go
    onCamper(s, () => {
      underBag(ctx, 11)
      ctx.translate(0, 23 - 3 * Math.abs(beat) * go); ctx.rotate(rock); ctx.scale(here, here)
      logBar(ctx, 54, 11)
    })
    if (go > 0.2) onCamper(s, () => {
      const puffs: number[] = []
      for (const side of [-1, 1]) {
        const down = Math.max(0, side * beat), r = 5.5 * down * go
        puffs.push(side * 33, 23 + side * 14 * down, r, side * 39, 23 + side * 10 * down, r * 0.7)
      }
      cloud(ctx, puffs)
      // Two quick marks over the end that is up.
      const up = beat > 0 ? -1 : 1
      rays(ctx, up * 30, 23 - 15 * Math.abs(beat), [-Math.PI / 2 - 0.35, -Math.PI / 2 + 0.35], 3, 3 + 6 * Math.abs(beat), PENCIL, 1.4)
    })
  },
}
const usesALog: Show = (s) => LOG_WAYS[camperOf(s)](s)

/** A point of a camper's own frame, on the surface. */
function fromCamper(s: Stage, lx: number, ly: number): { x: number; y: number } {
  const a = lies(s), c = Math.cos(a), n = Math.sin(a), k = s.board.u * FIGURE
  return { x: s.x + (lx * c - ly * n) * k, y: s.y + (lx * n + ly * c) * k }
}

/**
 * Where the mule's muzzle is and which way it points, as the view draws the mule (lookFigures.ts): from above, at
 * 1.24 of design size, its head on a neck that swings with what it looks at.
 */
function muzzleOf(s: Stage): { x: number; y: number; turn: number } {
  const look = Math.max(0, Math.min(2, Number(s.frame.mule?.look) || 0)), k = s.board.u * 1.24
  const neck = mix(mix(-1.05, -2.05, Math.min(1, look)), 2.35, Math.max(0, look - 1))
  return { x: s.board.mule.x + Math.sin(neck) * 44 * k, y: s.board.mule.y - (24 + Math.cos(neck) * 44) * k, turn: Math.atan2(-Math.cos(neck), Math.sin(neck)) }
}

/** How each camper takes a sniff: how late, how many sniffs, how far off the flask is held, how wide the smell waves and how fast. */
const SNIFF: Record<CamperId, { late: number; sniffs: number; arm: number; wave: number; quick: number }> = {
  reader: { late: 0.05, sniffs: 2, arm: 13, wave: 3, quick: 14 },
  sleeper: { late: 0.13, sniffs: 1, arm: 3, wave: 7.5, quick: 5 },
  cook: { late: 0, sniffs: 3, arm: 5, wave: 3.5, quick: 24 },
  scout: { late: 0.03, sniffs: 1, arm: 8, wave: 5, quick: 9 },
  small: { late: 0, sniffs: 4, arm: 4, wave: 5.5, quick: 30 },
}

/** A flask on a camper: held under the nose, the smell winding up; then it sails over to the mule, which breathes in and sneezes it away. */
const sniffsAndSneezes: Show = (s) => {
  const { ctx, t, board } = s, who = camperOf(s), m = MANNER[who], way = SNIFF[who], u = board.u
  const muzzle = muzzleOf(s), out = muzzle.turn - Math.PI
  if (t < 0.44) {
    const come = ease(seg(t, way.late, way.late + 0.1)), nod = Math.abs(Math.sin(seg(t, way.late + 0.1, 0.38) * Math.PI * way.sniffs)) * (come >= 1 ? 1 : 0)
    const fx = way.arm + 34 * (1 - come), fy = m.headY + m.headR + 12 - 4 * nod
    if (come > 0) onCamper(s, () => moved(ctx, fx, fy, -0.3 - 0.9 * (1 - come), 0.62, () => flask(ctx)))
    // The smell: three lines winding up past the nose, in the camper's own time.
    const smell = seg(t, way.late + 0.1, 0.34) * (1 - seg(t, 0.38, 0.44))
    if (smell > 0) onCamper(s, () => {
      ctx.beginPath()
      for (let i = 0; i < 3; i++) {
        // All three wave together, so they never cross, and fan out as they rise.
        const len = (30 + 7 * (i % 2)) * smell
        for (let j = 0; j <= 14; j++) {
          const k = j / 14, x = fx - 4 + (i - 1) * (7 + 12 * k) + way.wave * 0.5 * Math.sin(k * 6.5 - t * way.quick * 3) * Math.sqrt(k), y = fy - 14 - len * k
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
      }
      mark(ctx, STINK, 2.3)
    })
    // And the face that is pulled: a start of short marks all round the head.
    const start = arch(seg(t, 0.34, 0.44))
    if (start > 0) onCamper(s, () => rays(ctx, 0, m.headY, [-2.7, -2.0, -1.2, -0.4, 0.4, 2.7], m.headR + 4, m.headR + 4 + 8 * start, INK, 1.5))
  }
  // Handed on: the flask goes over the map to the mule, end over end.
  const fly = seg(t, 0.42, 0.6)
  if (fly > 0 && fly < 1) {
    const from = fromCamper(s, way.arm, m.headY + m.headR + 12)
    s.put(mix(from.x, muzzle.x, fly), mix(from.y, muzzle.y, fly) - 64 * u * arch(fly), -0.3 + fly * TAU * 2, () => flask(ctx), 0.62 + 0.2 * fly)
  }
  // The mule breathes in, twice, a little further each time.
  const breath = seg(t, 0.5, 0.6)
  if (breath > 0 && breath < 1) s.put(muzzle.x, muzzle.y, out, () => { const b = breath * 2 - Math.floor(breath * 2); rays(ctx, 0, 0, [2.5, 2.9, 3.3, 3.7], 34 - 20 * b, 46 - 22 * b, PENCIL, 1.5) })
  const sneeze = seg(t, 0.6, 0.9)
  if (sneeze > 0 && sneeze < 1) {
    // The burst at the muzzle, the spray, and the flask blown back the way it came.
    const pop = back(seg(sneeze, 0, 0.2)) * (1 - seg(sneeze, 0.4, 0.8))
    if (pop > 0.02) s.put(muzzle.x, muzzle.y, out, () => {
      const points: number[] = []
      for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, r = (i % 2 ? 22 : 42 + 9 * chance(s.seed, i)) * pop; points.push(-30 + Math.cos(a) * r * 1.2, Math.sin(a) * r) }
      poly(ctx, points); ink(ctx, STEAM, 1.5, PENCIL)
    })
    s.put(muzzle.x, muzzle.y, out, () => {
      const list: number[] = []
      for (let i = 0; i < 11; i++) { const a = Math.PI - 0.2 + (i - 5) * 0.17, d = 30 + (90 + 60 * chance(s.seed, 70 + i)) * easeOut(sneeze); list.push(Math.cos(a) * d, Math.sin(a) * d, 5 * (1 - sneeze * sneeze), a) }
      drops(ctx, list, WATER_PALE, WATER_DARK)
      // And the blast of it, in straight lines.
      rays(ctx, 0, 0, [2.55, 2.85, 3.15, 3.45], 46 + 60 * sneeze, 46 + 150 * easeOut(sneeze) * (1 - sneeze * 0.4), PENCIL, 1.8)
    })
    const blown = easeOut(sneeze)
    s.put(muzzle.x + Math.cos(muzzle.turn) * 190 * u * blown, muzzle.y + (Math.sin(muzzle.turn) * 190 * blown + 40 * blown * blown) * u, -sneeze * TAU * 3.3, () => flask(ctx), 0.8 * (1 - seg(sneeze, 0.6, 1)))
  }
}

/** How each camper shakes dry: when the first shake comes, how long between them, how many drops, how far they are flung, and the twist of a dog's shake. */
const SHAKE: Record<CamperId, { from: number; gap: number; n: number; fling: number; twist: number }> = {
  reader: { from: 0.36, gap: 0.17, n: 6, fling: 24, twist: 0 },
  sleeper: { from: 0.42, gap: 0.18, n: 13, fling: 50, twist: 1.5 },
  cook: { from: 0.26, gap: 0.13, n: 9, fling: 40, twist: 0 },
  scout: { from: 0.3, gap: 0.21, n: 11, fling: 28, twist: 0 },
  small: { from: 0.24, gap: 0.11, n: 8, fling: 42, twist: -0.5 },
}

/** A can on a camper: a splash crown round the head, then the drops flung out in three shakes, each smaller. The reader holds the book overhead as a roof, too late, and it runs off the edges. */
const splashAndShake: Show = (s) => {
  const { ctx, t } = s, who = camperOf(s), m = MANNER[who], way = SHAKE[who]
  const crown = seg(t, 0, 0.27)
  if (crown < 1) onCamper(s, () => {
    ctx.translate(0, m.headY)
    // The water lands, and a ring and a crown of drops go out from it and fall back.
    const wet = (m.headR + 6) * (1 - seg(crown, 0, 0.55))
    if (wet > 0.5) { disc(ctx, 0, 0, wet); ink(ctx, WATER, 1.3, WATER_DARK) }
    disc(ctx, 0, 0, m.headR + 4 + 20 * crown); mark(ctx, WATER, 2.6 * (1 - crown) + 0.3)
    const list: number[] = []
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + 0.3, d = m.headR + 5 + 24 * arch(Math.pow(crown, 0.7)); list.push(Math.cos(a) * d, Math.sin(a) * d, 3.4 * (1 - crown * crown), crown < 0.42 ? a : a + Math.PI) }
    drops(ctx, list)
  })
  if (who === 'reader') {
    // The book, opened over the head when the water has already come.
    const roof = back(seg(t, 0.2, 0.32)) * (1 - easeIn(seg(t, 0.9, 1)))
    if (roof > 0.02) onCamper(s, () => {
      ctx.translate(0, m.headY - 1); ctx.scale(1, roof)
      box(ctx, -17, -12, 34, 24, 2); ink(ctx, BARK, 1.3)
      line(ctx, 0, -12, 0, 12, INK, 1.4)
      line(ctx, -11, -7, -11, 7, '#7a5230', 1); line(ctx, 11, -7, 11, 7, '#7a5230', 1)
    })
  }
  for (let k = 0; k < 3; k++) {
    const from = way.from + k * way.gap, p = seg(t, from, from + way.gap * 1.3), size = [1, 0.68, 0.42][k]
    if (p <= 0 || p >= 1) continue
    onCamper(s, () => {
      ctx.translate(0, m.headY)
      const list: number[] = [], n = Math.max(2, Math.round(way.n * (0.5 + 0.5 * size)))
      for (let i = 0; i < n; i++) {
        // Off a roof the water runs down both edges; off a head it is flung all ways.
        const a = who === 'reader' ? (i % 2 ? 0 : Math.PI) + (Math.floor(i / 2) - 1) * 0.42 : (i / n) * TAU + k * 0.5 + way.twist * p
        const d = m.headR + (who === 'reader' ? 8 : 4) + way.fling * size * easeOut(p)
        list.push(Math.cos(a) * d, Math.sin(a) * d, (1.8 + 2.2 * size) * (1 - p * p), a + way.twist * 0.6)
      }
      drops(ctx, list)
      // The shake itself: marks either side of the head that jump as it goes to and fro.
      if (who !== 'reader' && p < 0.6) {
        const jolt = Math.sin(p * 40) * 2.5 * size
        ctx.beginPath()
        for (const side of [-1, 1]) { const r = m.headR + 5; ctx.moveTo(jolt + side * r * Math.cos(0.5), -r * Math.sin(0.5)); ctx.arc(jolt, 0, r, side > 0 ? -0.5 : Math.PI + 0.5, side > 0 ? 0.5 : Math.PI - 0.5, side < 0) }
        mark(ctx, INK, 1.5 * size)
      }
    })
  }
}

/** The halo of a lantern worn as a hat, each camper's own: how wide, how fast it beats, how far it bobs, and how many rays of pleasure it has. */
const HALO: Record<CamperId, { r: number; rate: number; bob: number; rays: number; wobble: number }> = {
  reader: { r: 36, rate: 1.5, bob: 0, rays: 9, wobble: 0 },
  sleeper: { r: 35, rate: 1, bob: 0, rays: 0, wobble: 0 },
  cook: { r: 36, rate: 7, bob: 0, rays: 0, wobble: 0.14 },
  scout: { r: 41, rate: 0.8, bob: 0, rays: 0, wobble: 0 },
  small: { r: 34, rate: 4, bob: 5, rays: 0, wobble: 0 },
}

/** A lantern on a camper: worn as a hat, with a soft ring of light round the head. The sleeper pulls a flap of the bag over the lot, and the light leaks out round it. */
const wornAsAHat: Show = (s) => {
  const { ctx, t } = s, who = camperOf(s), m = MANNER[who], way = HALO[who]
  const on = back(seg(t, 0.04, 0.16)) * (1 - easeIn(seg(t, 0.88, 1))), cover = who === 'sleeper' ? ease(seg(t, 0.38, 0.62)) * (1 - ease(seg(t, 0.9, 1))) : 0
  // The tonk as it lands.
  if (t < 0.14) onCamper(s, () => rays(ctx, 0, 0, [-2.4, -1.9, -1.24, -0.74], 38 + 40 * t, 43 + 110 * t, INK, 1.6))
  if (on > 0.02) onCamper(s, () => {
    const beat = Math.sin(t * TAU * way.rate * 3), r = way.r * on * (1 + 0.03 * beat) * (1 - 0.1 * cover), wide = 7.5 * (1 - 0.6 * cover)
    ctx.translate(0, -way.bob * Math.abs(Math.sin(t * TAU * way.rate * 2)))
    ctx.rotate(t * 2 * way.rate * (way.wobble > 0 ? 1 : 0))
    ctx.beginPath(); ctx.ellipse(0, 0, r + wide / 2, (r + wide / 2) * (1 - way.wobble), 0, 0, TAU); ctx.moveTo(r - wide / 2, 0); ctx.ellipse(0, 0, r - wide / 2, (r - wide / 2) * (1 - way.wobble), 0, 0, TAU, true)
    ctx.globalAlpha = 0.85; ctx.fillStyle = FLAME_PALE; ctx.fill('evenodd'); ctx.globalAlpha = 1
    mark(ctx, FLAME, 1.1)
    // Pleased: short rays that open and shut slowly, every other one in turn.
    if (way.rays > 0) for (const odd of [0, 1]) {
      const turns: number[] = []
      for (let i = odd; i < way.rays; i += 2) turns.push((i / way.rays) * TAU - 0.4)
      rays(ctx, 0, 0, turns, r + 8, r + 8 + 9 * Math.abs(Math.sin(t * TAU * way.rate + odd * 1.5)) * on, FLAME, 2)
    }
  })
  if (cover > 0.02) onCamper(s, () => {
    // The flap: the quilted top of the bag, drawn up over head and lantern, slow and heavy.
    const top = mix(24, -31, cover)
    ctx.beginPath(); ctx.moveTo(-28, 34); ctx.lineTo(-28, top + 27); ctx.arc(0, top + 27, 28, Math.PI, 0); ctx.lineTo(28, 34); ctx.closePath()
    ink(ctx, m.bag, 1.4)
    ctx.beginPath(); ctx.moveTo(-28, top + 30); ctx.quadraticCurveTo(0, top + 38, 28, top + 30); mark(ctx, '#b98a22', 1.3)
    // What light still gets out, round the edge of it.
    if (cover > 0.6) rays(ctx, 0, top + 27, [-2.6, -2.1, -1.57, -1.04, -0.54], 32, 32 + 9 * (0.5 + 0.5 * Math.sin(t * 30)), FLAME, 2)
  })
}

/** A small amount card, as the dog carries it: white, with its piece of red ruler along the top. */
function smallCard(ctx: Ctx, k = 1) {
  box(ctx, -15 * k, -9 * k, 30 * k, 18 * k, 2 * k); ink(ctx, WHITE, 1.2, BLACK)
  box(ctx, -12 * k, -6 * k, 24 * k, 4.5 * k); ink(ctx, RED, 0.9, BLACK)
  for (let i = 0; i < 3; i++) { box(ctx, (-12 + i * 8) * k + 0.5, 1.5 * k, 8 * k - 1, 4.4 * k, 1.2); ink(ctx, LOG, 0.9, LOG_LINE) }
}

/** How each camper is left when the dog takes the card: how late the start comes, how many marks, and how long. */
const START: Record<CamperId, { late: number; marks: number; long: number }> = {
  reader: { late: 0.04, marks: 3, long: 6 },
  sleeper: { late: 0.2, marks: 2, long: 5 },
  cook: { late: 0, marks: 5, long: 10 },
  scout: { late: 0.06, marks: 4, long: 7 },
  small: { late: 0, marks: 7, long: 9 },
}

/** A card on a camper: the dog has it, and runs its lap with the card flapping in its mouth and dust behind; it comes back damp. */
const dogRunsALap: Show = (s) => {
  const { ctx, t, frame } = s, who = camperOf(s), m = MANNER[who], way = START[who], dog = frame.dog
  // The camper it was taken from is left with a start, each as quick or as slow as they are.
  const start = arch(seg(t, way.late, way.late + 0.16))
  if (start > 0) onCamper(s, () => {
    const turns: number[] = []
    for (let i = 0; i < way.marks; i++) turns.push(-Math.PI / 2 + (i - (way.marks - 1) / 2) * (2.6 / way.marks))
    rays(ctx, 0, m.headY, turns, m.headR + 5, m.headR + 5 + way.long * start, INK, 1.5)
  })
  if (!dog || !Number.isFinite(dog.x) || !Number.isFinite(dog.y)) return
  const running = seg(t, 0.04, 0.1) * (1 - seg(t, 0.9, 0.96))
  // Dust: puffs that are born at the heels, fall behind, swell and thin.
  if (running > 0) s.put(dog.x, dog.y, dog.turn, () => {
    const puffs: number[] = []
    for (let i = 0; i < 5; i++) { const k = t * 9 + i / 5, age = k - Math.floor(k); puffs.push((i % 2 ? 5 : -5) + Math.sin(i * 2.4) * 3, 25 + 40 * age, 9 * Math.sin(Math.PI * Math.sqrt(age)) * running) }
    cloud(ctx, puffs, STEAM, PENCIL, 1.3)
  }, FIGURE)
  // The card across its mouth, flapping as it goes; damp at the end, and dripping.
  s.put(dog.x, dog.y, dog.turn, () => {
    ctx.translate(0, -17); ctx.rotate(Math.sin(t * 75) * 0.16 * running + 0.08)
    smallCard(ctx)
    const damp = seg(t, 0.8, 0.9)
    if (damp > 0) {
      ctx.save(); box(ctx, -15, -9, 30, 18, 2); ctx.clip(); oval(ctx, -9, 8, 13 * damp, 9 * damp); ctx.fillStyle = 'rgba(44, 127, 208, 0.42)'; ctx.fill(); ctx.restore()
      const k = t * 9 - Math.floor(t * 9)
      drops(ctx, [-11, 12 + 12 * k, 2.4 * (1 - k), Math.PI / 2, 6, 12 + 12 * ((k + 0.5) % 1), 2 * (1 - ((k + 0.5) % 1)), Math.PI / 2])
    }
  }, FIGURE)
}

/** How each camper chews: how fast, how big the cheeks are, and how far they swell. */
const CHEW: Record<CamperId, { rate: number; base: number; swell: number }> = {
  reader: { rate: 7, base: 4.2, swell: 2 },
  sleeper: { rate: 1, base: 4.5, swell: 3 },
  cook: { rate: 4.5, base: 5.2, swell: 3.6 },
  scout: { rate: 2.5, base: 5.4, swell: 3.2 },
  small: { rate: 8.5, base: 4.4, swell: 3.4 },
}

/** A marshmallow on a camper: in it goes, and two round cheeks work at it, one after the other. The sleeper's hand comes out of the bag, takes it and goes back in, without waking. */
const eatenWithBothCheeks: Show = (s) => {
  const { ctx, t } = s, who = camperOf(s), m = MANNER[who], way = CHEW[who]
  if (who === 'sleeper') {
    // The hand comes out late and slow, closes on it, and takes it home.
    const reach = ease(seg(t, 0.22, 0.48)) * (1 - ease(seg(t, 0.56, 0.78))), held = t >= 0.5
    const hx = mix(13, 31, reach), hy = mix(12, 1, reach)
    onCamper(s, () => {
      if (!held || reach > 0.06) moved(ctx, held ? hx + 2 : 33, held ? hy - 2 : -1, 0.3, 1, () => marshmallow(ctx, 9.5))
      if (reach > 0.04) {
        line(ctx, 12, 13, hx, hy, INK, 7.4); line(ctx, 12, 13, hx, hy, '#a97c1c', 5)
        disc(ctx, hx, hy, 3.6); ink(ctx, m.skin, 1.1)
      }
    })
    // A snore with a gulp in it: one slow swell at the collar, and a bubble of breath.
    const gulp = arch(seg(t, 0.78, 0.92))
    if (gulp > 0) onCamper(s, () => {
      disc(ctx, 12, 9, 2 + way.swell * gulp); ink(ctx, m.skin, 1.1)
      puff(ctx, 24 + 14 * gulp, -2 - 10 * gulp, 2 + 4 * gulp, 1)
    })
    return
  }
  // In it goes.
  const inn = seg(t, 0, 0.14)
  if (inn < 1) onCamper(s, () => moved(ctx, mix(18, 0, ease(inn)), mix(m.headY - 16, m.headY + 4, ease(inn)) - 8 * arch(inn), inn * 2, 1 - 0.75 * inn, () => marshmallow(ctx, 9.5)))
  const chew = seg(t, 0.12, 0.2) * (1 - seg(t, 0.84, 0.92))
  if (chew > 0) onCamper(s, () => {
    ctx.translate(0, m.headY + 3)
    for (const side of [-1, 1]) {
      const work = Math.max(0, Math.sin(t * TAU * way.rate + (side > 0 ? 0 : Math.PI))), r = (way.base + way.swell * work) * chew
      disc(ctx, side * (m.headR - 2 + r * 0.55), 0, r); ink(ctx, m.skin, 1.2)
      // Two short strokes of colour on each, as a full cheek has.
      const cx = side * (m.headR - 2 + r * 0.7)
      ctx.beginPath(); ctx.moveTo(cx - 1.8, 1.4); ctx.lineTo(cx - 0.4, -1.4); ctx.moveTo(cx + 0.6, 1.4); ctx.lineTo(cx + 2, -1.4); mark(ctx, '#c9705a', 1.1)
    }
    // Crumbs at each chew.
    const k = t * way.rate * 2 - Math.floor(t * way.rate * 2)
    ctx.beginPath()
    for (let i = 0; i < 2; i++) { const x = (i ? 1 : -1) * (3 + 7 * k), y = 5 + 9 * k - 5 * arch(k), size = 2.2 * (1 - k); ctx.rect(x - size / 2, y - size / 2, size, size) }
    ink(ctx, WHITE, 0.8, BLACK)
  })
}

// --- The kettle's round ---------------------------------------------------------------

/** Where a mug stands by a camper: beside the head, on the side the tent is not. */
function mugPlace(s: Stage): { x: number; y: number } {
  const camper = s.board.campers.find((c) => c.who === s.who), u = s.board.u
  let dx = 1, dy = 0
  if (camper) { const vx = s.x - camper.tentMiddle.x, vy = s.y - camper.tentMiddle.y, far = Math.hypot(vx, vy); if (far > 1) { dx = vx / far; dy = vy / far } }
  return { x: s.x + dx * 34 * u, y: s.y + (dy * 34 + 8) * u }
}

/** A full mug: it drops in with a bounce, and a curl of steam winds up from it. */
const fullMug: Show = (s) => {
  const { ctx, t } = s, at = mugPlace(s)
  const fall = seg(t, 0, 0.22), bounce = fall < 1 ? 1 - easeIn(fall) : 0.22 * Math.abs(Math.sin(seg(t, 0.22, 0.4) * Math.PI * 2)) * (1 - seg(t, 0.22, 0.4))
  const land = arch(seg(t, 0.2, 0.3)), away = 1 - easeIn(seg(t, 0.9, 1))
  s.put(at.x, at.y, 0, () => {
    ctx.translate(0, -34 * bounce); ctx.scale(away * (1 + 0.14 * land), away * (1 - 0.16 * land))
    mug(ctx, COCOA)
  }, 1.15)
  const curl = seg(t, 0.26, 0.6) * away
  if (curl > 0) s.put(at.x, at.y, 0, () => {
    const points: number[] = []
    for (let i = 0; i <= 22; i++) {
      const k = i / 22, turn = k * 5.2 - t * 6
      points.push(Math.sin(turn) * (2 + 7 * k), -19 - 34 * k * curl - (1 - Math.cos(turn)) * 1.5)
    }
    // The line ends in a curl of its own.
    const ex = points[points.length - 2], ey = points[points.length - 1]
    for (let i = 1; i <= 8; i++) { const a = -Math.PI / 2 - (i / 8) * 4.4; points.push(ex + 4.5 + Math.cos(a + Math.PI) * 4.5 * (1 - i / 14), ey + Math.sin(a + Math.PI) * 4.5 * (1 - i / 14) - 4.5) }
    wisp(ctx, points, 2)
  }, 1.15)
}

/** A cold mug: it slides in flat and stops dead, no steam, and shivers, with pencil specks over it; and the face that tastes it puts its tongue out. */
const coldMug: Show = (s) => {
  const { ctx, t } = s, at = mugPlace(s)
  const slide = 1 - easeOut(seg(t, 0, 0.22)), away = 1 - easeIn(seg(t, 0.9, 1)), cold = seg(t, 0.26, 0.34) * (1 - seg(t, 0.84, 0.9))
  const shiver = Math.sin(t * 300) * 1.1 * cold
  s.put(at.x, at.y, 0, () => {
    ctx.translate(-40 * slide + shiver, 0); ctx.rotate(-0.12 * slide); ctx.scale(away, away)
    mug(ctx, '#8b7d72')
    oval(ctx, -1, -14.9, 3.6, 1); ctx.fillStyle = '#b9ad9f'; ctx.fill()
  }, 1.15)
  if (cold > 0) s.put(at.x, at.y, 0, () => {
    // The cold: three small rows of pencil specks that tremble. A zigzag there would be a letter.
    ctx.beginPath()
    for (const [x, y, w] of [[-9, -26, 1], [-17, -9, 0.7], [17, -17, 0.7]]) {
      for (let i = 0; i < 4; i++) { const sx = x + shiver + i * 4.6 * w, sy = y + Math.sin(t * 150 + i * 1.9) * 1.6 * w; ctx.moveTo(sx + 1.2 * w, sy); ctx.arc(sx, sy, 1.2 * w * cold, 0, TAU) }
    }
    ctx.fillStyle = PENCIL; ctx.fill()
  }, 1.15)
  // Every face that tastes it: the tongue comes right out from under whatever the camper wears on its head, and wags.
  if (cold > 0 && s.who !== null) onCamper(s, () => {
    const m = MANNER[camperOf(s)]
    ctx.translate(0, m.headY + m.headR - 2.5); ctx.rotate(Math.sin(t * 70) * 0.3 * cold)
    box(ctx, -2.8, 0, 5.6, 8 * cold, 2.6); ink(ctx, '#bb7c92', 1)
  })
}

/** An empty mug: it is held out, turned upside down and shaken, and a moth flies out of it and away. */
const emptyMug: Show = (s) => {
  const { ctx, t } = s, at = mugPlace(s)
  const here = back(seg(t, 0, 0.12)) * (1 - easeIn(seg(t, 0.92, 1))), over = ease(seg(t, 0.2, 0.42)), shaken = seg(t, 0.44, 0.6)
  if (here > 0.02) s.put(at.x, at.y, 0, () => {
    ctx.translate(0, -8 - 12 * arch(over) + Math.sin(shaken * Math.PI * 4) * 3.5 * (shaken < 1 ? 1 : 0)); ctx.rotate(Math.PI * over); ctx.scale(here, here); ctx.translate(0, 8)
    mug(ctx, null)
  }, 1.15)
  // The moth: out from under it, and away up the map on a wandering line.
  const out = seg(t, 0.5, 1)
  if (out > 0 && out < 1) s.put(at.x, at.y, 0, () => {
    const x = Math.sin(out * 9) * 10 * out + 44 * out * out, y = 2 - 78 * easeOut(out) + Math.cos(out * 13) * 4
    const dx = Math.cos(out * 9) * 90 * out + 88 * out, dy = -156 * (1 - out) - Math.sin(out * 13) * 52
    moved(ctx, x, y, Math.atan2(dx, -dy), 1.3 * Math.min(1, out * 8), () => moth(ctx, Math.abs(Math.sin(t * 110))))
  }, 1.15)
}

// --- Every show, by the id the grid and the night give it ----------------------------

const SHOWS: Record<string, Show> = {
  'ring-of-stones-bites-it-in': bitesItIn,
  'fire-flares-and-the-eyes-jump-back': flares,
  'fireball-ring-blows-the-hats-back': fireball,
  'puddle-and-a-frog': puddleAndFrog,
  'steam-cloud-hides-a-patch-of-map': steamCloud,
  'glows-red-whistles-and-hops-out': whistles,
  'corner-curls-and-smokes': cornerCurls,
  'swells-to-the-size-of-a-tent-and-sags': swellsAndSags,
  gutters,
  'lantern-tips-and-rolls-into-the-stream': tipsAndRolls,
  'lantern-glugs-and-burps-a-smoke-ring': burpsARing,
  'lantern-gargles-a-bubble': garglesABubble,
  'two-stack-sway-and-the-top-one-hops-back-to-its-pin': stackSways,
  'stuck-on-as-a-shade-the-light-goes-striped': stripedLight,
  'melts-on-the-glass-and-the-moths-stick': meltsAndMoths,
  'camper-uses-it-their-own-way': usesALog,
  'camper-sniffs-and-the-mule-sneezes': sniffsAndSneezes,
  'splash-and-the-camper-shakes-dry': splashAndShake,
  'worn-as-a-hat': wornAsAHat,
  'the-dog-runs-a-lap-with-it': dogRunsALap,
  'eaten-with-both-cheeks': eatenWithBothCheeks,
  mug: fullMug,
  'cold-mug': coldMug,
  'empty-mug': emptyMug,
}

/** The ids of the shows this module draws. */
export const SHOW_KINDS: readonly string[] = Object.keys(SHOWS)

const CAMPER_IDS: readonly string[] = ['reader', 'sleeper', 'cook', 'scout', 'small']

/** Draws every show that is playing. Returns how many figures were drawn. */
export function paintShows(ctx: Ctx, board: Board, frame: GameFrame): number {
  const effects: readonly EffectFrame[] = frame.effects ?? []
  if (effects.length === 0 || !(board.u > 0)) return 0
  let figures = 0
  for (const effect of effects) {
    const show = Object.hasOwn(SHOWS, effect.kind) ? SHOWS[effect.kind] : undefined
    if (!show || !Number.isFinite(effect.x) || !Number.isFinite(effect.y) || !Number.isFinite(effect.t)) continue
    const who = effect.who !== null && CAMPER_IDS.includes(effect.who) ? (effect.who as CamperId) : null
    const seed = Number.isFinite(effect.seed) ? Math.abs(Math.trunc(effect.seed)) % 9973 : 0
    ctx.save()
    show({
      ctx, board, frame, x: effect.x, y: effect.y, t: clamp01(effect.t), who, seed,
      put: (x, y, turn, draw, scale = 1) => { at(ctx, x, y, board.u * scale, turn, draw); figures++ },
    })
    ctx.restore()
  }
  return figures
}
