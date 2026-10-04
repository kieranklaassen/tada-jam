import type { CamperFrame, CamperPlace, RaccoonFrame, ToyFrame } from './frame'
import type { CamperId } from './world'

// The figures of the look "Survey map and field kit": tents, campers and
// animals, drawn as if the map's own printed symbols had come alive. Flat warm
// inks inside one thin dark key line, no shadow, and no red, which is the
// kit's. Every figure is drawn in a frame of design pixels that the caller
// (look.ts) has placed, turned and scaled; nothing here knows the surface.
//
// Each camper has two bodies: in the bag, lying on its back with its head at
// the top of its frame and its feet below, and upright, seen from straight
// above, facing down its own frame, the way its feet lay. Both bodies carry
// the same head, turned up to the sky as a printed figure's is, so a camper is
// the same person by hat and colours wherever it goes. What a camper is
// doing (its act) picks the body and the pose, and each act is drawn in that
// camper's own way.
//
// No word, letter or numeral is drawn, and no text call is made.

export type Ctx = CanvasRenderingContext2D

export const TAU = Math.PI * 2

// The map's printing inks, as far as a figure needs them.
export const PAPER = '#f2e9d2'
export const WATER_LINE = '#4a94c6'
const PENCIL = '#6d6862'
// The figures' inks: warm and flat, and none of them red.
export const INK = '#3a2c22'
export const OCHRE = '#d9a640'
export const SAND = '#e8d3a2'
export const OLIVE = '#8d9a4c'
export const MOSS = '#5f7a40'
export const TEAL = '#4f8e88'
export const PLUM = '#7d5470'
export const SLATE = '#6283a6'
export const BARK = '#96693f'
export const STONE = '#b8b0a2'
export const SOOT = '#5a544e'
export const SKIN = ['#ecc9a2', '#c88f60', '#8c5c3c', '#e2b98c', '#a87248'] as const
const DARK = '#4b3b2f'
const WOOD = '#c79a62'
const PAGE = '#fbf6e8'
// The kit's colours, for the few things a figure carries that are kit: a strap on a load, the snack tin.
export const RED = '#e2401c'
export const WHITE = '#fcf9f1'
export const BLACK = '#1c1c1f'
export const SHADOW = 'rgba(46, 34, 22, 0.36)'

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
export const mix = (a: number, b: number, t: number) => a + (b - a) * t
/** 0 below `a`, 1 above `b`, and an eased climb between. */
export const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t) }
/** The shape of an answer over its length: up fast, held, and down again. 0 at both ends. */
export const answer = (p: number) => smooth(0, 0.2, p) * (1 - smooth(0.7, 1, p))
/** How far out an answer to a poke is. The model sends that already, on the character's own curve, so the view only keeps it from going below rest. */
export const out = (p: number) => Math.max(0, p)
/** A shake that needs no clock: it swings as the strength runs down to nothing. */
export const shake = (amount: number, rate: number, phase = 0) => amount * Math.sin(amount * rate + phase)
/** An idle act is on only between its two ends, so a figure at rest is exactly the figure at rest. */
const acting = (t: number) => t > 0 && t < 1
/** A swing that goes on for as long as an act lasts, on the act's own seconds. */
const swing = (age: number, perSecond: number, phase = 0) => Math.sin(age * perSecond * TAU + phase)

// Small path helpers. Each starts a new path; the caller fills or strokes it.
export function disc(ctx: Ctx, x: number, y: number, r: number) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU) }
export function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, turn = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), turn, 0, TAU) }
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, r = 0) { ctx.beginPath(); if (r > 0) ctx.roundRect(x, y, w, h, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)); else ctx.rect(x, y, w, h) }
export function poly(ctx: Ctx, points: readonly number[]) {
  ctx.beginPath()
  for (let i = 0; i < points.length; i += 2) { if (i === 0) ctx.moveTo(points[i], points[i + 1]); else ctx.lineTo(points[i], points[i + 1]) }
  ctx.closePath()
}
export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke()
}
/** Fills the current path with a flat ink and gives it its key line. */
export function ink(ctx: Ctx, fill: string, width = 1.4, color = INK) {
  ctx.fillStyle = fill; ctx.fill()
  if (width > 0) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke() }
}
/** The hard shadow of a kit object: the same path, offset down and to the right, in one flat tone. */
export function cast(ctx: Ctx, trace: () => void, dx = 3, dy = 4) {
  ctx.save(); ctx.translate(dx, dy); trace(); ctx.fillStyle = SHADOW; ctx.fill(); ctx.restore()
}
/** Draws in a frame of design pixels placed at a point of the surface: `u` is the size of one design pixel. */
export function at(ctx: Ctx, x: number, y: number, u: number, turn: number, draw: () => void) {
  ctx.save(); ctx.translate(x, y); if (turn) ctx.rotate(turn); ctx.scale(u, u)
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  draw()
  ctx.restore()
}
/** Draws something turned about a point of its own. */
function turned(ctx: Ctx, x: number, y: number, turn: number, draw: () => void) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(turn); ctx.translate(-x, -y); draw(); ctx.restore()
}
/** A limb: one thick stroke of a flat ink with the key line round it. */
function limb(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, fill: string, width: number) {
  line(ctx, x1, y1, x2, y2, INK, width + 2.2); line(ctx, x1, y1, x2, y2, fill, width)
}

/** A ridge tent from straight above: two panels either side of the ridge, the door at the end that faces the fire. A tapped tent's guy lines twang; a tent being packed folds flat along its ridge. */
export function tent(ctx: Ctx, light: string, dark: string, twang: number, folded = 0) {
  const wide = 1 - 0.86 * folded
  // Guy lines and pegs. A plucked line bows to one side and back, each a little out of step with the next.
  const lines = [[-36, -26], [36, -26], [-36, 26], [36, 26], [-36, 0], [36, 0]]
  for (let i = 0; i < lines.length && folded < 0.5; i++) {
    const [x, y] = lines[i], px = x * 1.24, py = y * 1.3
    if (twang > 0) {
      const bow = shake(twang, 36, i * 1.9) * 4.5, far = Math.hypot(px - x, py - y) || 1
      ctx.beginPath(); ctx.moveTo(x, y * wide); ctx.quadraticCurveTo((x + px) / 2 - ((py - y) / far) * bow, (y + py) / 2 + ((px - x) / far) * bow, px, py)
      ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.stroke()
    } else line(ctx, x, y * wide, px, py, INK, 0.9)
    disc(ctx, px, py, 1.5); ctx.fillStyle = INK; ctx.fill()
  }
  // The canvas shivers with them.
  if (twang > 0) ctx.scale(1 + shake(twang, 36) * 0.012, 1 - shake(twang, 36) * 0.02)
  ctx.scale(1, wide)
  poly(ctx, [-36, -26, 36, -26, 36, 0, -36, 0]); ink(ctx, light)
  poly(ctx, [-36, 0, 36, 0, 36, 26, -36, 26]); ink(ctx, dark)
  // The door: an open flap at the fire end.
  poly(ctx, [36, -11, 20, 0, 36, 11]); ink(ctx, DARK, 1.2)
  line(ctx, -36, 0, 20, 0, INK, 1.8)
}

/** Each camper's own colours: the bag, its stripe, the coat worn out of the bag, and the skin. */
const WEAR: Readonly<Record<CamperId, { bag: string; stripe: string; coat: string; skin: string; width: number; length: number }>> = {
  reader: { bag: SLATE, stripe: '#e9dfc4', coat: SLATE, skin: SKIN[0], width: 26, length: 60 },
  sleeper: { bag: '#e2b64c', stripe: '#b98a22', coat: '#e2b64c', skin: SKIN[3], width: 54, length: 98 },
  cook: { bag: MOSS, stripe: '#d9cf9a', coat: MOSS, skin: SKIN[1], width: 26, length: 58 },
  scout: { bag: BARK, stripe: '#d9c08a', coat: BARK, skin: SKIN[2], width: 25, length: 52 },
  small: { bag: '#c9a7c0', stripe: TEAL, coat: '#c9a7c0', skin: SKIN[4], width: 22, length: 42 },
}

/** A sleeping bag seen from above, in the camper's frame: the head end at the top, the feet below. It swells and sinks with the breath. `sat` shortens it, as it looks with its owner sitting up in it. */
function bag(ctx: Ctx, who: CamperId, breath: number, sat = 0) {
  const wear = WEAR[who], w = wear.width * (1 + 0.05 * breath), top = 2 + wear.length * 0.36 * sat, l = wear.length * (1 + 0.012 * breath) - (top - 2)
  box(ctx, -w / 2, top, w, l, w / 2); ink(ctx, wear.bag)
  ctx.save(); box(ctx, -w / 2, top, w, l, w / 2); ctx.clip()
  if (who === 'sleeper') {
    // The big bag is quilted: curved seams across it, and none down the middle, which would cross them.
    ctx.strokeStyle = wear.stripe; ctx.lineWidth = 1.3
    for (let y = top + 14; y < top + l - 6; y += 15) { ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.quadraticCurveTo(0, y + 7, w / 2, y); ctx.stroke() }
  } else {
    // Two printed stripes across it.
    ctx.fillStyle = wear.stripe; ctx.fillRect(-w / 2, top + l * 0.5, w, 4); ctx.fillRect(-w / 2, top + l * 0.66, w, 4)
  }
  ctx.restore()
  box(ctx, -w / 2, top, w, l, w / 2); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke()
}

/**
 * The upright body from straight above, facing down the frame: two feet that step, the shoulders in the camper's own
 * coat, and two arms to wherever the hands are. The head goes on top of it afterwards. `lean` shifts the shoulders
 * back off the feet.
 */
function upright(ctx: Ctx, who: CamperId, breath: number, walk: number, hands: readonly [number, number, number, number], lean = 0) {
  const wear = WEAR[who], step = Math.sin(walk * TAU) * 9, size = who === 'small' ? 0.82 : 1
  // The one shadow a figure casts: a small flat oval of the map's own brown on the ground under its feet, so that
  // a camper standing still is plainly standing, and not lying down.
  oval(ctx, 2.5 * size, 6 * size, 27 * size, 19 * size); ctx.fillStyle = 'rgba(156, 106, 54, 0.34)'; ctx.fill()
  // Two boots, toes out in front of the shoulders, and one well ahead of the other at a walk.
  const toes = who === 'scout' ? 16 : 12
  for (const side of [-1, 1]) { oval(ctx, side * 7 * size, toes * size + side * step + lean * 4, 5 * size, 8.6 * size); ink(ctx, DARK, 1.2) }
  // Shoulders wider than whatever is on the head: the scout's reach well past the brim.
  const wide = shoulders(who) * (1 + 0.04 * breath)
  oval(ctx, 0, -lean * 5, wide, 11.5 * size); ink(ctx, wear.coat)
  for (const side of [-1, 1]) {
    const hx = hands[side < 0 ? 0 : 2], hy = hands[side < 0 ? 1 : 3]
    limb(ctx, side * (wide - 3.5), -lean * 5, hx, hy, wear.coat, 5.4 * size)
    disc(ctx, hx, hy, 3.3 * size); ink(ctx, wear.skin, 1)
  }
}
/** How far out a camper's shoulders reach when it stands. */
const shoulders = (who: CamperId) => (who === 'scout' ? 25 : who === 'small' ? 15 : 18.5)
/** Where the hands hang when they have nothing to do: at the sides, swinging against the feet at a walk. */
const hanging = (walk: number, who: CamperId): [number, number, number, number] => { const s = Math.sin(walk * TAU) * 6, x = shoulders(who) + 2; return [-x, 6 - s, x, 6 + s] }

/** What a face is doing. Every camper has the same few signs for it, drawn at its own size. */
type Eyes = 'open' | 'shut' | 'happy' | 'wide' | 'heavy' | 'squint' | 'tight' | 'uneven'
type Mouth = 'line' | 'smile' | 'round' | 'grimace' | 'tongue' | 'none'
function eyes(ctx: Ctx, kind: Eyes, y: number, gap: number, r = 1.2) {
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 1.1
  for (const side of [-1, 1]) {
    const x = side * gap
    // After a bad night one eye is open and the other only half: each eye is then drawn as its own kind.
    if (kind === 'uneven' && side > 0) { disc(ctx, x, y, r); ctx.fill(); ctx.beginPath(); ctx.arc(x, y + 1.2, r + 1.2, 0.3, Math.PI - 0.3); ctx.lineWidth = 0.8; ctx.stroke(); ctx.lineWidth = 1.1 }
    else if (kind === 'open') { disc(ctx, x, y, r); ctx.fill() }
    else if (kind === 'wide') { disc(ctx, x, y, r + 1.5); ctx.fillStyle = WHITE; ctx.fill(); ctx.stroke(); disc(ctx, x, y, r * 0.8); ctx.fillStyle = INK; ctx.fill() }
    else if (kind === 'shut') { ctx.beginPath(); ctx.arc(x, y - 0.6, r + 0.7, 0.2, Math.PI - 0.2); ctx.stroke() }
    else if (kind === 'happy') { ctx.beginPath(); ctx.arc(x, y + 0.8, r + 0.7, Math.PI + 0.2, TAU - 0.2); ctx.stroke() }
    else if (kind === 'squint') line(ctx, x - r - 0.6, y, x + r + 0.6, y, INK, 1.2)
    else if (kind === 'tight') { line(ctx, x - side * (r + 0.8), y - 1.2, x + side * (r + 0.4), y, INK, 1.1); line(ctx, x - side * (r + 0.8), y + 1.2, x + side * (r + 0.4), y, INK, 1.1) }
    else { disc(ctx, x, y + 0.3, r); ctx.fill(); line(ctx, x - r - 0.8, y - 0.5, x + r + 0.8, y - 0.5, INK, 1.3); ctx.beginPath(); ctx.arc(x, y + 1.2, r + 1.2, 0.3, Math.PI - 0.3); ctx.lineWidth = 0.8; ctx.stroke(); ctx.lineWidth = 1.1 }
  }
}
function mouth(ctx: Ctx, kind: Mouth, y: number, w = 1.6) {
  ctx.strokeStyle = INK; ctx.lineWidth = 1
  if (kind === 'line') line(ctx, -w, y, w, y, INK, 1)
  else if (kind === 'smile') { ctx.beginPath(); ctx.arc(0, y - 1.4, w + 0.8, 0.35, Math.PI - 0.35); ctx.stroke() }
  else if (kind === 'round') { oval(ctx, 0, y + 0.4, w * 0.8, w * 1.1); ink(ctx, DARK, 1) }
  else if (kind === 'grimace') { ctx.beginPath(); ctx.moveTo(-w - 1, y); ctx.lineTo(-w / 2, y - 1); ctx.lineTo(0, y + 0.2); ctx.lineTo(w / 2, y - 1); ctx.lineTo(w + 1, y); ctx.stroke() }
  else if (kind === 'tongue') { line(ctx, -w - 0.8, y - 0.4, w + 0.8, y - 0.4, INK, 1.1); box(ctx, -1.5, y - 0.4, 3, 3.6, 1.4); ink(ctx, '#bb7c92', 0.9) }
}

// --- The five heads ----------------------------------------------------------
//
// One head each, drawn about its own middle, the crown at the top. `askew` (0 to 1) puts whatever the head wears
// out of place; `hat` (0 to 1) is that camper's own move with its hat: pulled down, tipped back or lifted off.

/** How far a gust has blown back whatever the head being drawn wears, 0 to 1. Set for the length of one camper's drawing and no longer. */
let blown = 0

type Face = { eyes: Eyes; mouth: Mouth; askew?: number; hat?: number; /** The sleeper's bobble, the scout's feather, the small one's ears, the cook's moustache: each head's own small move. */ twitch?: number; sway?: number; wiggle?: number; flat?: number; proud?: number }

function readerHead(ctx: Ctx, face: Face) {
  const a = Math.max(face.askew ?? 0, blown)
  disc(ctx, 0, 0, 11); ink(ctx, SKIN[0])
  ctx.beginPath(); ctx.arc(0, 0, 11, Math.PI + 0.25, TAU - 0.25); ctx.closePath(); ink(ctx, '#5b4030', 1.2)
  // Hair that has been slept on stands up in three tufts.
  if (a > 0.3) for (const [x, lean] of [[-6, -0.5], [0, 0.1], [6, 0.6]]) { poly(ctx, [x - 2.4, -9, x + lean * 7 * a, -9 - 8 * a, x + 2.4, -9.6]); ink(ctx, '#5b4030', 1.1) }
  line(ctx, -10.4, -3.4 + 2.4 * a, 10.4, -3.4 - 1.6 * a, TEAL, 3)
  disc(ctx, 3.5 * a, -5.6 - 0.6 * a, 3.4); ink(ctx, '#f8e9a6', 1.1)
  ctx.save(); ctx.translate(1.6 * a, 2.6 - 1.2 * a); ctx.rotate(0.42 * a)
  for (const side of [-1, 1]) { disc(ctx, side * 4.3, 0, 3.3); ink(ctx, 'rgba(255, 255, 255, 0.7)', 1.2) }
  line(ctx, -1, 0, 1, 0, INK, 1.2)
  ctx.restore()
  eyes(ctx, face.eyes, 3.4 - 0.8 * a, 4.3, 1)
  mouth(ctx, face.mouth, 8.2)
}

/** The sleeper's head in its bobble hat. `hat` pulls the hat down over the eyes. */
function sleeperHead(ctx: Ctx, face: Face, twitch = face.twitch ?? 0) {
  const a = Math.max(face.askew ?? 0, blown), down = face.hat ?? 0
  disc(ctx, 0, 0, 9.5); ink(ctx, SKIN[3])
  if (down < 0.6) eyes(ctx, face.eyes, 2.6, 3.8, 1.2)
  mouth(ctx, face.mouth, 6.6, 1.3)
  ctx.save(); ctx.rotate(0.55 * a)
  ctx.beginPath(); ctx.arc(0, 0, 9.5, Math.PI - 0.15 - 0.75 * down, TAU + 0.15 + 0.75 * down); ctx.closePath(); ink(ctx, PLUM, 1.2)
  const brim = -1 + 6.4 * down, half = Math.sqrt(Math.max(1, 90 - brim * brim))
  line(ctx, -half, brim, half, brim, '#e9dfc4', 2.4)
  disc(ctx, twitch + 7 * a, -11.5 - Math.abs(twitch) * 0.3 + 3 * a, 4.6); ink(ctx, '#f3ead2', 1.2)
  ctx.restore()
}

/** The cook's head: a moustache, and a pan for a hat. `hat` tips the pan back off the brow; with `bare` the pan is in a hand and the head shows what little hair is under it. */
function cookHead(ctx: Ctx, face: Face, bare = false, proud = face.proud ?? 0) {
  const a = Math.max(face.askew ?? 0, blown), tip = face.hat ?? 0
  disc(ctx, 0, 0, 11); ink(ctx, SKIN[1])
  eyes(ctx, face.eyes, 4.6, 4)
  // The moustache: two strokes from under the nose, turned up at the ends when the cook is pleased.
  ctx.strokeStyle = DARK; ctx.lineWidth = 2.2
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 8); ctx.quadraticCurveTo(side * 4, 6.4 + 2 * proud, side * 7.5, 9.8 - 6 * proud + side * 2 * a); ctx.stroke() }
  if (face.mouth !== 'line' && face.mouth !== 'none') mouth(ctx, face.mouth, 10.2, 1.8)
  if (bare) {
    ctx.strokeStyle = DARK; ctx.lineWidth = 1.2
    for (const side of [-1, 0, 1]) { ctx.beginPath(); ctx.arc(side * 2.6 * (1 + a), -9 + Math.abs(side), 3.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke() }
    return
  }
  // The pan, upside down: its flat bottom, and the handle with its hanging hole.
  ctx.translate(-2.5 * tip + 3 * a, -4 * tip - 2 * a); ctx.rotate(-0.4 * tip + 0.5 * a)
  ctx.save(); ctx.rotate(-0.5)
  box(ctx, 8, -8.5, 24, 5.4, 2.4); ink(ctx, SOOT, 1.2)
  disc(ctx, 28.5, -5.8, 1.2); ctx.fillStyle = PAPER; ctx.fill()
  ctx.restore()
  ctx.beginPath(); ctx.arc(0, -1.5, 12, Math.PI - 0.2, TAU + 0.2); ctx.closePath(); ink(ctx, SOOT, 1.3)
  ctx.beginPath(); ctx.arc(0, -1.5, 7.5, Math.PI + 0.1, TAU - 0.1); ctx.strokeStyle = '#8b847b'; ctx.lineWidth = 1.2; ctx.stroke()
}

/** The pan off the head, from above, in a frame at the end of its handle's grip: the handle runs up the frame to the round pan. */
function pan(ctx: Ctx) {
  box(ctx, -2.7, -20, 5.4, 22, 2.4); ink(ctx, SOOT, 1.2)
  disc(ctx, 0, -30, 12.5); ink(ctx, SOOT, 1.3)
  disc(ctx, 0, -30, 8.6); ctx.strokeStyle = '#8b847b'; ctx.lineWidth = 1.2; ctx.stroke()
}

/** The scout's head: a wide brim over the whole face. `hat` lifts it off, and the face it keeps to itself shows: one eye open, one shut, a grey moustache. */
function scoutHead(ctx: Ctx, face: Face, sway = face.sway ?? 0) {
  const a = Math.max(face.askew ?? 0, blown), lift = face.hat ?? 0
  if (lift > 0 || a > 0) {
    disc(ctx, 0, 0, 10); ink(ctx, SKIN[2])
    if (face.eyes !== 'open') eyes(ctx, face.eyes, -0.4, 3.8, 1.1)
    else { disc(ctx, 3.8, -0.4, 1.3); ctx.fillStyle = INK; ctx.fill(); line(ctx, -5.6, -0.2, -2.2, -0.2, INK, 1.2); line(ctx, 1.6, -3.2, 6, -2.6, INK, 1.2) }
    if (face.mouth === 'round') mouth(ctx, 'round', 6.2, 1.9)
    line(ctx, -5.5, 4.4, 5.5, 4.4, '#d9d2c4', 2.6)
  }
  ctx.translate(-4 * lift + 9 * a, -25 * lift - 9 * a); ctx.rotate(0.5 * a); ctx.scale(1 + 0.14 * lift, 1 + 0.14 * lift)
  disc(ctx, 0, 0, 16.5); ink(ctx, SAND)
  disc(ctx, 0, 0, 8.6); ink(ctx, '#d6bf88', 1.2)
  disc(ctx, 0, 0, 10); ctx.strokeStyle = MOSS; ctx.lineWidth = 2.4; ctx.stroke()
  // A feather in the band.
  ctx.translate(8, -4); ctx.rotate(sway + 0.5 * lift); ctx.translate(-8, 4)
  ctx.beginPath(); ctx.moveTo(8, -4); ctx.quadraticCurveTo(19, -12, 17, 0); ctx.quadraticCurveTo(12, -1, 8, -4); ink(ctx, OCHRE, 1)
}

/** The small one's head in its hood with ears. `flat` lays the ears down; with `hid` the hood is pulled right over the face. */
function smallHead(ctx: Ctx, face: Face, wiggle = face.wiggle ?? 0, flat = face.flat ?? 0, hid = false) {
  const a = Math.max(face.askew ?? 0, blown)
  for (const side of [-1, 1]) {
    // An ear swings about the middle of the hood: a little each way to wiggle, right down to lie flat.
    ctx.save(); ctx.rotate(side * (wiggle * 0.32 + 0.75 * flat) + (side > 0 ? 0.9 * a : 0)); ctx.translate(side * 8.6, -9)
    oval(ctx, 0, 0, 4.8, 4.8 * (1 - 0.4 * flat)); ink(ctx, OCHRE, 1.3); oval(ctx, 0, 0, 2.1, 2.1 * (1 - 0.4 * flat)); ctx.fillStyle = '#f0d9a0'; ctx.fill()
    ctx.restore()
  }
  disc(ctx, 0, 0, 11.5); ink(ctx, OCHRE)
  // The hood pulled right down: one curved fold across it. Two bars one above the other would be an equals sign.
  if (hid) { ctx.beginPath(); ctx.moveTo(-6, 2.5); ctx.quadraticCurveTo(0, 8, 6, 2.5); ctx.strokeStyle = '#b98628'; ctx.lineWidth = 1.4; ctx.stroke(); return }
  oval(ctx, 1.5 * a, 2, 7.6, 7); ink(ctx, SKIN[4], 1.1)
  eyes(ctx, face.eyes, 1.4, 3.3, face.eyes === 'open' ? 1.5 : 1.3)
  mouth(ctx, face.mouth, 5.6, 1.3)
}

const HEADS: Readonly<Record<CamperId, (ctx: Ctx, face: Face) => void>> = { reader: readerHead, sleeper: sleeperHead, cook: cookHead, scout: scoutHead, small: smallHead }

/** How far down the frame a camper's shoulders are when it sits up in its bag. */
const seat = (who: CamperId) => 2 + WEAR[who].length * 0.36

/**
 * Sitting up in the bag, seen from above: the bag short, the shoulders over it, the head over them, and the two
 * hands wherever they are. The morning's two poses and the small one's dusk are built on it.
 */
function sitting(ctx: Ctx, who: CamperId, f: CamperFrame, hands: readonly [number, number, number, number], face: Face, lean = 0, up = 0) {
  const wear = WEAR[who], y = seat(who), wide = Math.min(16, wear.width / 2 + 2)
  bag(ctx, who, f.breath, 1)
  ctx.save(); ctx.translate(lean * 5, 0); ctx.rotate(lean * 0.22)
  oval(ctx, 0, y + 1, wide, 8.4); ink(ctx, wear.coat)
  for (const side of [-1, 1]) {
    const hx = hands[side < 0 ? 0 : 2], hy = y + hands[side < 0 ? 1 : 3]
    limb(ctx, side * (wide - 2.5), y + 1, hx, hy, wear.coat, 4.2); disc(ctx, hx, hy, 3); ink(ctx, wear.skin, 1)
  }
  // A face tilted up to the sky comes nearer the eye: a little larger, and back over the shoulders.
  turned(ctx, 0, y + 2, f.head, () => { ctx.translate(0, y - 3 - 3 * up); ctx.scale(1 + 0.16 * up, 1 + 0.16 * up); HEADS[who](ctx, face) })
  ctx.restore()
}

/**
 * The morning, for any camper, told apart at arm's length by its outline. Rested: a big open stretch, both arms out
 * wide, the face tilted up in a yawn. Frazzled: a slump to one side, hair or hat askew, one eye half shut, both
 * hands in the lap, and a small scribble of pencil over the head.
 */
function morning(ctx: Ctx, who: CamperId, f: CamperFrame, rested: boolean, age: number) {
  // The reader's idle act in the morning: one hand goes up to set the glasses straight, and comes down again.
  const own = ownMove(who, f), fuss = who === 'reader' && acting(f.idle) ? Math.sin(Math.PI * f.idle) : 0
  if (rested) {
    const reach = 1 + 0.05 * swing(age, 0.5)
    // The scout's hat is pushed back for it, or there would be no face to tilt.
    sitting(ctx, who, f, [-34 * reach, -7 + 9 * own.start, mix(34 * reach, 9, fuss), -7 + 9 * own.start - 6 * fuss], { eyes: 'happy', mouth: 'round', ...own.face, hat: Math.max(who === 'scout' ? 0.45 : 0, own.face.hat ?? 0) }, 0, 1)
    return
  }
  sitting(ctx, who, f, [-6, 13 - 5 * own.start, mix(7, 9, fuss), 14 - 5 * own.start - 22 * fuss], { eyes: 'uneven', mouth: 'grimace', ...own.face, askew: 1 }, 0.9)
  // The scribble: one tangled pencil line, turning slowly over the head.
  const cx = 12, cy = seat(who) - (who === 'scout' ? 30 : 24), spin = age * 0.9
  ctx.beginPath()
  for (let i = 0; i <= 44; i++) {
    const t = i / 44, a = t * TAU * 3.3 + spin, r = 3 + 5.5 * Math.abs(Math.sin(t * 7.3 + 1))
    const x = cx + Math.cos(a) * r * 1.25, y = cy + Math.sin(a) * r * 0.8
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.2; ctx.stroke()
}

// --- The five campers ----------------------------------------------------------

/**
 * A camper's own small moves, which it makes in whatever pose the night has put it: how far out its answer to a
 * poke is (`start`), and what its head does with it and with its idle act. The reader's glasses go askew, the
 * sleeper's bobble jumps and twitches, the cook's pan tips back and the moustache curls, the scout's hat lifts
 * and the feather sways, the small one's ears go flat and wiggle.
 */
function ownMove(who: CamperId, f: CamperFrame): { start: number; face: Partial<Face> } {
  const start = out(f.poke), live = acting(f.idle), fade = live ? Math.sin(Math.PI * f.idle) : 0
  if (who === 'reader') return { start, face: { askew: Math.max(start, 0.35 * fade) } }
  if (who === 'sleeper') return { start, face: { askew: 0.6 * start, twitch: live ? Math.sin(f.idle * TAU * 3) * 3.2 * (1 - f.idle) : 0 } }
  if (who === 'cook') return { start, face: { hat: start, proud: fade } }
  if (who === 'scout') return { start, face: { hat: start, sway: live ? Math.sin(f.idle * TAU * 2) * 0.55 * fade : 0 } }
  return { start, face: { flat: start, wiggle: live ? Math.sin(f.idle * TAU * 4) * fade : 0 } }
}

/** What the caller knows about where a camper stands that its frame does not say. */
export type CamperMore = {
  /** It stands in the stream or the pool. */
  wet: boolean
  /** The cook's pan is not the cook's just now: a raccoon is wearing it. */
  panGone?: boolean
  /** How far a fireball at the ring has blown every hat back, 0 to 1. */
  gust?: number
}
type Painter = (ctx: Ctx, f: CamperFrame, place: CamperPlace, more: CamperMore) => void

/** An open book from above, about its own middle: `leaf` (0 to 1) is one page on its way over, `flat` foreshortens a book tilted away. */
function book(ctx: Ctx, x: number, y: number, turn: number, leaf: number, flat = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(turn); ctx.scale(1, flat)
  box(ctx, -15, -10, 30, 20, 1.5); ink(ctx, BARK, 1.2)
  box(ctx, -13, -8.5, 26, 17); ink(ctx, PAGE, 0.9)
  line(ctx, 0, -8.5, 0, 8.5, INK, 1)
  if (acting(leaf)) {
    // One leaf swings over from the right-hand page to the left, lifting off the book as it goes.
    const edge = 13 * Math.cos(Math.PI * leaf), rise = Math.sin(Math.PI * leaf) * 3.5
    poly(ctx, [0, -8.5, edge, -8.5 - rise, edge, 8.5 - rise, 0, 8.5]); ink(ctx, '#fffdf6', 0.9)
  }
  ctx.restore()
}

/** Rings on the water round a pair of legs: two thin circles that widen and fade, one after the other. */
function ripples(ctx: Ctx, age: number) {
  disc(ctx, 0, 3, 13); ctx.fillStyle = '#c3e1ee'; ctx.fill()
  for (const lag of [0, 0.5]) {
    const p = (((age * 0.55 + lag) % 1) + 1) % 1
    ctx.globalAlpha = 1 - p; disc(ctx, 0, 3, 11 + 17 * p); ctx.strokeStyle = WATER_LINE; ctx.lineWidth = 1.3; ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// The reader: a head torch, round glasses and a book. Whatever happens, the reader goes on reading.
const reader: Painter = (ctx, f, place, more) => {
  const act = place.act, age = place.actAge
  if (act === 'wakes-rested' || act === 'wakes-frazzled') {
    // The book spent the night on the ground beside the bag, face down.
    ctx.save(); ctx.translate(26, 34); ctx.rotate(act === 'wakes-rested' ? 0.2 : 0.9); box(ctx, -15, -10, 30, 20, 1.5); ink(ctx, BARK, 1.2); line(ctx, 0, -10, 0, 10, INK, 1.2); ctx.restore()
    morning(ctx, 'reader', f, act === 'wakes-rested', age)
    return
  }
  if (act === 'walks-to-the-light' || act === 'walks-into-the-stream') {
    // On its feet and still reading: the book is held up in front of the face, and the feet find their own way.
    if (more.wet) ripples(ctx, age)
    // Looking for light, the book is held out in front at arm's length, the head torch a small disc on the forehead
    // above it. Bound for the stream, the book is right up at the face and nothing shows over it but the torch.
    // Poked, the book jerks up to the face and the glasses go askew; idle, a page turns, walking or not.
    const jolt = out(f.poke)
    const lost = act === 'walks-into-the-stream', bob = Math.abs(Math.sin(place.walk * TAU)) * 1.5, y = (lost ? 10 : 24) + bob - (lost ? 3 : 9) * jolt
    upright(ctx, 'reader', f.breath, place.walk, [-15, y + 2, 15, y + 2])
    turned(ctx, 0, 0, f.head, () => readerHead(ctx, { eyes: jolt > 0.3 ? 'wide' : 'open', mouth: 'none', askew: jolt }))
    book(ctx, 0, y, 0, acting(f.idle) ? f.idle : lost ? (age % 6) / 0.9 : -1)
    for (const side of [-1, 1]) { disc(ctx, side * 15, y + 2, 3); ink(ctx, SKIN[0], 1) }
    return
  }
  // In the bag. Idle, a page turns across the book. Poked, the book comes up over the face and the glasses are left askew above it.
  // In every pose in the bag: poked, the book comes up over the face; at its idle act, a page turns.
  const up = out(f.poke)
  let bookX = 0, bookY = 30, tilt = 0, flat = 1, lean = 0, nod = 0, leaf = -1
  let face: Face = { eyes: 'open', mouth: 'line' }
  if (act === 'at-dusk') { bookX = 6; bookY = 29; tilt = 0.42; lean = 0.3 }
  else if (act === 'reads-by-lantern') { bookY = 21; face = { eyes: 'happy', mouth: 'smile' }; leaf = (age % 5) / 0.9 }
  else if (act === 'reads-by-fire') { bookY = 38; flat = 0.7; tilt = 0.1; nod = 2.5; face = { eyes: 'squint', mouth: 'line' }; leaf = (age % 8) / 0.9 }
  if (acting(f.idle)) leaf = f.idle
  bookX = mix(bookX, 0, up); bookY = mix(bookY, 10, up); tilt = mix(tilt, 0, up); face = { ...face, askew: up }
  bag(ctx, 'reader', f.breath)
  turned(ctx, 0, 5, f.head + lean, () => { ctx.translate(0, -3 + nod); readerHead(ctx, face) })
  const c = Math.cos(tilt), s = Math.sin(tilt)
  for (const side of [-1, 1]) line(ctx, side * 11, 14, bookX + side * 10 * c, bookY - 3 + side * 10 * s, SKIN[0], 4.5)
  book(ctx, bookX, bookY, tilt, leaf, flat)
  for (const side of [-1, 1]) { disc(ctx, bookX + side * 14 * c - 3 * s * flat, bookY + side * 14 * s + 3 * c * flat, 2.8); ink(ctx, SKIN[0], 1) }
}

// The sleeper: a bobble hat, and a quilted bag far too big for one person. Whatever happens, the sleeper stays in the bag.
const sleeper: Painter = (ctx, f, place) => {
  const act = place.act, age = place.actAge
  if (act === 'wakes-rested' || act === 'wakes-frazzled') { morning(ctx, 'sleeper', f, act === 'wakes-rested', age); return }
  if (act === 'sits-up-and-shakes') {
    // Splashed: bolt upright in the bag, eyes wide, and then the whole head and shoulders shaken dry like a dog, less each time.
    const p = clamp01(age / 1.7), shaking = smooth(0.2, 0.3, p) * (1 - smooth(0.85, 1, p)), to = Math.sin(age * TAU * 6.5) * shaking * (1 - 0.6 * p)
    sitting(ctx, 'sleeper', f, [-13 - 9 * shaking, 9, 13 + 9 * shaking, 9], { eyes: shaking > 0.5 ? 'tight' : 'wide', mouth: 'round', askew: 0.5 + 0.5 * Math.abs(to), twitch: to * 5 }, to * 0.9)
    return
  }
  // Idle, the bobble twitches and the collar puffs out with a snore. Poked, the whole bag rolls a quarter over and back, and does not wake.
  const roll = out(f.poke), puff = acting(f.idle) ? Math.sin(Math.PI * f.idle) : 0
  let hump = 0, deep = 0, shown = true, face: Face = { eyes: 'shut', mouth: 'round' }
  if (act === 'at-dusk') face = { eyes: 'shut', mouth: 'line', hat: 1 }
  else if (act === 'sleeps-through') deep = 5
  else if (act === 'hides-in-the-bag') { shown = false; hump = 0.5 - 0.5 * Math.cos(age * TAU * 0.6) }
  else if (act === 'drags-the-bag-to-the-fire') { hump = place.walk > 0 ? 0.5 - 0.5 * Math.cos(place.walk * TAU) : 0; face = { eyes: 'heavy', mouth: 'grimace' } }
  else if (act === 'wakes-hugging-a-raccoon') face = { eyes: 'wide', mouth: 'round' }
  // An inching bag bunches up in the middle and stretches out again, like a caterpillar.
  const w = 54 * (1 + 0.05 * f.breath + 0.03 * puff + 0.12 * hump), long = 98 * (1 - 0.17 * hump), seam = -23 * roll
  // It rolls away from its own tent, which lies on the frame's right.
  ctx.translate(-14 * roll, 0)
  box(ctx, -w / 2, -6, w, long, 25); ink(ctx, '#e2b64c')
  ctx.save(); box(ctx, -w / 2, -6, w, long, 25); ctx.clip()
  // The quilting goes round with the roll: the seam slides off towards the edge.
  ctx.strokeStyle = '#b98a22'; ctx.lineWidth = 1.3
  for (let i = 0; i < 5; i++) { const y = 24 + i * 15 * (1 - 0.3 * hump * Math.sin((i / 4) * Math.PI)) * (long / 98); ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.quadraticCurveTo(seam, y + 7 + 6 * hump, w / 2, y); ctx.stroke() }
  ctx.restore()
  if (!shown) {
    // The bag pulled right over the head and held shut from inside: a pucker of folds, and the bobble left outside.
    // The bobble is all of the hat that is outside the bag: it twitches at the idle act, and a gust blows it back.
    const jump = (acting(f.idle) ? Math.sin(f.idle * TAU * 3) * 3.2 * (1 - f.idle) : 0) + 7 * blown
    disc(ctx, jump, -8 - Math.abs(jump) * 0.3, 4.6); ink(ctx, '#f3ead2', 1.2)
    oval(ctx, 0, 3, 8, 4.5); ink(ctx, '#a97c1c', 1.2)
    for (let i = -2; i <= 2; i++) line(ctx, i * 2.4, 4, i * 6.5, 15, '#b98a22', 1.2)
    return
  }
  if (act === 'wakes-hugging-a-raccoon') {
    // Whatever was warm: a raccoon, held tight under one arm, and no happier about it.
    ctx.save(); ctx.translate(-44, 24); ctx.rotate(-0.18 + swing(age, 0.7) * 0.06); ctx.scale(1.25, 1.25); raccoonFigure(ctx, 0, 'nothing', true); ctx.restore()
    // The arm goes right round its middle, in the bag's own quilted sleeve, with the hand come out the far side.
    limb(ctx, -24, 27, -46, 31, '#e2b64c', 8.4); limb(ctx, -46, 31, -61, 30, '#e2b64c', 8.4)
    for (const x of [-32, -40, -48, -55]) line(ctx, x, 27, x - 1, 34.5, '#b98a22', 1.1)
    disc(ctx, -63, 30, 3.8); ink(ctx, SKIN[3], 1)
  }
  // The collar of the bag, and a small head a long way down inside it.
  oval(ctx, 0, 6 + deep * 0.5, 17 * (1 + 0.15 * puff), 13 * (1 + 0.2 * puff)); ink(ctx, '#a97c1c', 1.2)
  const twitch = acting(f.idle) ? Math.sin(f.idle * TAU * 3) * 3.2 * (1 - f.idle) : 0
  turned(ctx, 0, 6, f.head - 1.1 * roll, () => { ctx.translate(0, 6 + deep); sleeperHead(ctx, face, twitch) })
  if (act === 'sleeps-through') {
    // Now and then one small puff of breath drifts off and is gone.
    const p = (age % 3.6) / 1.4
    // A small cloud of three rounds run together: one outlined round beside the head would be a nought.
    if (p < 1) {
      const x = 9 + 12 * p, y = 14 + deep - 9 * p, r = 2 + 4.5 * p
      ctx.globalAlpha = 1 - p
      ctx.beginPath(); for (const [dx, dy, k] of [[-0.7, 0.15, 0.72], [0.1, -0.3, 0.9], [0.8, 0.2, 0.66]]) { ctx.moveTo(x + dx * r + r * k, y + dy * r); ctx.arc(x + dx * r, y + dy * r, r * k, 0, TAU) }
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = WHITE; ctx.fill()
      ctx.globalAlpha = 1
    }
  }
}

/** The wooden spoon, in a frame at its grip: the handle runs up the frame to the bowl. */
function spoon(ctx: Ctx) {
  line(ctx, 0, -13, 0, 14, WOOD, 3)
  oval(ctx, 0, -17, 4.2, 5.6); ink(ctx, WOOD, 1.1)
}

// The cook: a pan for a hat, its handle out to one side, and a moustache. In the bag only to sleep: every act of
// the cook's is done standing, facing the fire.
const cook: Painter = (ctx, f, place, more) => {
  const act = place.act, age = place.actAge
  if (act === 'wakes-rested' || act === 'wakes-frazzled') { morning(ctx, 'cook', f, act === 'wakes-rested', age); return }
  if (act === null) {
    // Idle, the wooden spoon twirls once in the fingers. Poked, the cook salutes with the spoon and the pan tips back off the brow.
    const salute = out(f.poke)
    bag(ctx, 'cook', f.breath)
    disc(ctx, -4, 24, 3.1); ink(ctx, SKIN[1], 1)
    turned(ctx, 0, 5, f.head, () => { ctx.translate(0, -3); cookHead(ctx, { eyes: 'open', mouth: 'line', hat: salute }) })
    ctx.save(); ctx.translate(mix(5.5, 12, salute), mix(26, 13, salute)); ctx.rotate(-0.1 + (acting(f.idle) ? smooth(0, 1, f.idle) * TAU : 0) - 0.75 * salute)
    spoon(ctx); disc(ctx, 0.5, 1, 3.1); ink(ctx, SKIN[1], 1)
    ctx.restore()
    return
  }
  // On its feet: poked, the cook salutes and the pan tips back off the brow, or jumps in the hands that hold it;
  // at its idle act the spoon twirls where there is one, the held pan wags, and the moustache curls.
  const salute = out(f.poke), twirl = acting(f.idle) ? f.idle : -1, curl = twirl >= 0 ? Math.sin(Math.PI * twirl) : 0
  let hands = hanging(place.walk, 'cook'), face: Face = { eyes: 'open', mouth: 'line' }, bare = false, proud = 0, shudder = 0
  if (act === 'at-dusk') { hands = [-4, 19, 4, 20]; bare = true }
  else if (act === 'beams-at-the-fire') { const bob = swing(age, 0.45) * 2; hands = [-26, 3 + bob, 26, 3 - bob]; face = { eyes: 'happy', mouth: 'none' }; proud = 1 }
  else if (act === 'tends-the-fire') hands = [-20.5, 6, 9, 16 + 3.5 * swing(age, 1.2)]
  else if (act === 'fans-the-fire') { hands = [-5, 15, 5, 15]; bare = true; face = { eyes: 'tight', mouth: 'grimace' } }
  else if (act === 'looks-into-the-kettle') { hands = [-13, 5, 13, 5]; bare = true }
  else if (act === 'tastes-cold-cocoa') { hands = [-20.5, 6, 15, 14]; face = { eyes: 'tight', mouth: 'tongue' }; shudder = swing(age, 7) * 0.9 }
  if (more.panGone) bare = true
  const free = act !== 'at-dusk' && act !== 'fans-the-fire' && act !== 'looks-into-the-kettle' && act !== 'tends-the-fire' && act !== 'tastes-cold-cocoa'
  if (free && salute > 0) hands = [hands[0], hands[1], mix(hands[2], 10, salute), mix(hands[3], -5, salute)]
  if (salute > 0.3) face = { ...face, eyes: 'wide' }
  face = { ...face, hat: Math.max(salute, 0.4 * curl), askew: bare ? salute : 0 }
  ctx.translate(shudder, 0)
  upright(ctx, 'cook', f.breath, place.walk, hands)
  turned(ctx, 0, 0, f.head, () => cookHead(ctx, face, bare, Math.max(proud, curl)))
  if (act === 'at-dusk') {
    // The pan held out over the ring of stones, weighing where the fire will be.
    // Both hands on the handle, the pan held straight out in front and raised: it is drawn the larger for being nearer the eye.
    if (!more.panGone) { ctx.save(); ctx.translate(0, 18 - 7 * salute); ctx.rotate(Math.PI + swing(age, 0.35) * 0.1 + (twirl >= 0 ? Math.sin(twirl * TAU * 2) * 0.45 * curl : 0)); ctx.scale(1.18 + 0.1 * salute, 1.18 + 0.1 * salute); pan(ctx); ctx.restore() }
    for (const [x, y] of [[-3, 19], [3, 23]]) { disc(ctx, x, y, 3.3); ink(ctx, SKIN[1], 1) }
  } else if (act === 'tends-the-fire') {
    ctx.save(); ctx.translate(hands[2], hands[3] - 6 * salute); ctx.rotate(Math.PI + 0.1 + (twirl >= 0 ? smooth(0, 1, twirl) * TAU : 0) - 0.6 * salute); ctx.translate(0, -11); spoon(ctx); ctx.restore()
    disc(ctx, hands[2], hands[3], 3); ink(ctx, SKIN[1], 1)
  } else if (act === 'fans-the-fire') {
    // Both hands on the handle, and the pan going like a wing.
    const beat = swing(age, 3.2)
    ctx.strokeStyle = INK; ctx.lineWidth = 1
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(0, 16, 38, Math.PI / 2 + side * 0.35, Math.PI / 2 + side * 0.75, side < 0); ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1 }
    // With the pan gone the two empty hands go on fanning.
    if (!more.panGone) { ctx.save(); ctx.translate(0, 15); ctx.rotate(Math.PI + beat * 0.7); pan(ctx); ctx.restore() }
    for (const side of [-1, 1]) { disc(ctx, side * 3, 15, 3); ink(ctx, SKIN[1], 1) }
  } else if (act === 'looks-into-the-kettle') {
    // The kettle upside down over the face, its spout to one side, and one last drop. Poked, it jumps; at the idle act it gets a shake.
    ctx.translate(twirl >= 0 ? Math.sin(twirl * TAU * 3) * 1.8 * curl : 0, -4 * salute)
    const drip = (age % 2.2) / 0.8
    if (drip < 1) { disc(ctx, 0, 14 + 9 * drip, 1.6); ctx.fillStyle = WATER_LINE; ctx.fill() }
    poly(ctx, [9, -3, 21, -0.5, 21, 2.5, 9, 5]); ink(ctx, '#8d8881', 1.2)
    disc(ctx, 0, 1, 12.5); ink(ctx, '#8d8881')
    disc(ctx, 0, 1, 8.4); ctx.strokeStyle = SOOT; ctx.lineWidth = 1.2; ctx.stroke()
    ctx.strokeStyle = DARK; ctx.lineWidth = 2.2
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 6, 12.5); ctx.quadraticCurveTo(side * 10, 12, side * 12, 15.5); ctx.stroke() }
    for (const side of [-1, 1]) { disc(ctx, side * 13, 5, 3.1); ink(ctx, SKIN[1], 1) }
  } else if (act === 'tastes-cold-cocoa') {
    // The mug, held well away.
    box(ctx, 20, 13.5, 5.5, 3.6, 1.5); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke()
    disc(ctx, 16, 15, 5.8); ink(ctx, '#e9dfc4', 1.2)
    disc(ctx, 16, 15, 3.8); ink(ctx, '#6b4a2d', 0)
  }
}

// The scout: a wide brim over the whole face, hands folded, boots out of the end of a short bag. The old hand:
// upright for the watch, and never in a hurry.
const scout: Painter = (ctx, f, place) => {
  const act = place.act, age = place.actAge
  if (act === 'wakes-rested' || act === 'wakes-frazzled') { morning(ctx, 'scout', f, act === 'wakes-rested', age); return }
  if (act === null) {
    // Idle, the feather sways and one boot taps. Poked, the hat lifts off, one eye looks out from under it, and it settles.
    const lift = out(f.poke), live = acting(f.idle), fade = live ? Math.sin(Math.PI * f.idle) : 0
    const tap = live ? Math.max(0, Math.sin(f.idle * TAU * 3)) * 4 * fade : 0
    for (const side of [-1, 1]) { box(ctx, side * 6 - 4, 50 + (side > 0 ? tap : 0), 8, 13, 3.5); ink(ctx, DARK, 1.2) }
    bag(ctx, 'scout', f.breath)
    for (const side of [-1, 1]) { disc(ctx, side * 3, 21, 3.2); ink(ctx, SKIN[2], 1) }
    turned(ctx, 0, 5, f.head, () => { ctx.translate(0, -2); scoutHead(ctx, { eyes: 'open', mouth: 'none', hat: lift }, live ? Math.sin(f.idle * TAU * 2) * 0.55 * fade : 0) })
    return
  }
  let hands = hanging(place.walk, 'scout'), lift = 0, lean = 0, sweep = 0
  if (act === 'at-dusk') hands = [-27, 6, 33, 3]
  else if (act === 'keeps-watch') {
    // One hand shades the eyes under the brim, and goes round with the head as the watch sweeps the camp.
    sweep = swing(age, 0.09) * 0.8
    const c = Math.cos(f.head + sweep), n = Math.sin(f.head + sweep)
    hands = [-27, 6, 6 * c - 21 * n, 6 * n + 21 * c]
  }
  else if (act === 'tips-the-hat') { lift = answer(clamp01(age / 1.8)); hands = [-27, 6, mix(27, 11, lift), mix(6, -9 - 16 * lift, smooth(0, 0.3, lift))] }
  else if (act === 'straps-a-tower-on-the-mule') { const heave = 0.5 + 0.5 * swing(age, 0.7); lean = 0.6 + 0.4 * heave; hands = [-5, 24 - 5 * heave, 5, 24 - 5 * heave] }
  // On its feet: poked, the hat lifts off and one eye looks out from under it; at its idle act the feather sways.
  const own = ownMove('scout', f)
  lift = Math.max(lift, own.start)
  if (act === 'straps-a-tower-on-the-mule') line(ctx, 0, hands[1], 0, 72, DARK, 2.4)
  upright(ctx, 'scout', f.breath, place.walk, hands, lean)
  turned(ctx, 0, -lean * 5, f.head + sweep, () => { ctx.translate(0, -lean * 5); scoutHead(ctx, { eyes: 'open', mouth: 'none', hat: lift }, swing(age, 0.3) * 0.12 + (own.face.sway ?? 0) + 0.6 * own.start) })
  if (act === 'at-dusk') {
    // The pack straps, empty, looped over one forearm: what the scout hopes to carry back.
    ctx.strokeStyle = DARK; ctx.lineWidth = 2.2
    // Two flat straps hang from the forearm held out to the side, one longer than the other, each with its buckle,
    // and sway a little. They are bands and not loops: a ring on the map would be a nought.
    for (const [x, tilt, long] of [[25.5, 0.1, 30], [31.5, -0.14, 23]]) {
      ctx.save(); ctx.translate(x, 2); ctx.rotate(tilt + swing(age, 0.4, x) * 0.07)
      box(ctx, -2.6, 0, 5.2, long, 1.6); ink(ctx, '#6b4a2d', 1.2)
      box(ctx, -3.6, long - 3, 7.2, 5.4, 1.2); ink(ctx, SAND, 1.1)
      ctx.restore()
    }
    limb(ctx, 21.5, 0, 33, 3, BARK, 5.4); disc(ctx, 33, 3, 3.3); ink(ctx, SKIN[2], 1)
  }
}

// The small one: a hood with ears, wide awake, and never far from something bigger.
const small: Painter = (ctx, f, place) => {
  const act = place.act, age = place.actAge
  if (act === 'wakes-rested' || act === 'wakes-frazzled') { morning(ctx, 'small', f, act === 'wakes-rested', age); return }
  // In every pose: poked, both arms come out and the ears go flat; at its idle act the ears wiggle.
  const own = ownMove('small', f), startled = own.start > 0.3
  if (act === 'at-dusk') {
    // Sitting up in the bag with both arms round its knees, leaning hard on whatever is nearest.
    sitting(ctx, 'small', f, [mix(-5, -23, own.start), mix(13, 5, own.start), mix(5, 23, own.start), mix(13, 5, own.start)], { eyes: startled ? 'wide' : 'open', mouth: startled ? 'round' : 'line', ...own.face }, 1)
    return
  }
  if (act === 'sleeps-on-the-dog') {
    // Curled round in the bag like a cat, the hood tucked in at the middle.
    ctx.lineCap = 'round'
    for (const [color, width] of [[INK, 24.8], ['#c9a7c0', 22]] as const) { ctx.beginPath(); ctx.arc(4, 16, 14, 2.2, 5.9); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke() }
    ctx.beginPath(); ctx.arc(4, 16, 14, 4.4, 4.7); ctx.strokeStyle = TEAL; ctx.lineWidth = 22; ctx.lineCap = 'butt'; ctx.stroke(); ctx.lineCap = 'round'
    turned(ctx, -2, 8, 0.7 + f.head, () => { ctx.translate(-2, 8); ctx.scale(1 + 0.03 * f.breath, 1 + 0.03 * f.breath); smallHead(ctx, { eyes: startled ? 'wide' : 'shut', mouth: startled ? 'round' : 'smile', ...own.face }) })
    return
  }
  if (act === 'moves-in-with') {
    if (place.walk > 0) {
      // On its feet, dragging the bag behind it by one corner.
      const sway = Math.sin(place.walk * TAU) * 0.18
      ctx.save(); ctx.translate(7, -8); ctx.rotate(0.25 + sway); box(ctx, -9, -40, 18, 38, 9); ink(ctx, '#c9a7c0'); ctx.fillStyle = TEAL; ctx.fillRect(-8.3, -26, 16.6, 3.4); ctx.fillRect(-8.3, -19, 16.6, 3.4); box(ctx, -9, -40, 18, 38, 9); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore()
      upright(ctx, 'small', f.breath, place.walk, [-15, 4 - sway * 20, 9, -9])
      turned(ctx, 0, 0, f.head, () => smallHead(ctx, { eyes: startled ? 'wide' : 'open', mouth: 'line', ...own.face }))
    } else {
      // Moved in: all that shows beside the host is the top of a hood and two ears.
      ctx.save(); ctx.beginPath(); ctx.rect(-22, -24, 44, 21); ctx.clip()
      ctx.translate(0, -5 * own.start)
      smallHead(ctx, { eyes: startled ? 'wide' : 'open', mouth: 'none' }, swing(age, 0.5) * 0.4 + (own.face.wiggle ?? 0), own.start)
      ctx.restore()
      line(ctx, -11.2, -3, 11.2, -3, INK, 1.3)
    }
    return
  }
  if (act === 'hides-under-the-dog') {
    // Flat on the ground with the hood pulled down: two ears stick out, and tremble.
    ctx.save(); ctx.scale(1.2, 0.94); bag(ctx, 'small', f.breath * 0.3); ctx.restore()
    for (const side of [-1, 1]) { disc(ctx, side * 9, 9, 2.8); ink(ctx, SKIN[4], 1) }
    turned(ctx, 0, 5, f.head, () => { ctx.translate(0, -2); smallHead(ctx, { eyes: 'shut', mouth: 'none' }, swing(age, 5) * 0.35 + (own.face.wiggle ?? 0), own.start, true) })
    return
  }
  // In the bag. Idle, the hood's ears wiggle. Poked, both arms come out of the bag and the ears go flat.
  const arms = own.start, wiggle = own.face.wiggle ?? 0
  if (arms > 0) for (const side of [-1, 1]) {
    const hx = side * (9 + 14 * arms), hy = 13 - 5 * arms
    limb(ctx, side * 8, 14, hx, hy, '#c9a7c0', 3.6)
    disc(ctx, hx, hy, 3); ink(ctx, SKIN[4], 1)
  }
  bag(ctx, 'small', f.breath)
  turned(ctx, 0, 5, f.head, () => { ctx.translate(0, -2); smallHead(ctx, { eyes: startled ? 'wide' : 'open', mouth: startled ? 'round' : 'line' }, wiggle, arms) })
}

const PAINTERS: Readonly<Record<CamperId, Painter>> = { reader, sleeper, cook, scout, small }

/** Draws one camper in its own frame: the origin is where it lies or stands, its head at the top of the frame when it lies, and facing down the frame when it is on its feet. */
export function camper(ctx: Ctx, who: CamperId, f: CamperFrame, place: CamperPlace, more: CamperMore) {
  blown = clamp01(more.gust ?? 0)
  try { PAINTERS[who](ctx, f, place, more) } finally { blown = 0 }
}

// --- The fire, the kettle and the animals ---------------------------------------

/**
 * The fire: a ring of stones round three logs laid in a triangle. Lit, one flat flame as tall as the dial's setting, flickering
 * on the clock it is given; a flare is a burst of it and a ring of sparks. Touched, the stones shuffle round and settle.
 */
export function fireRing(ctx: Ctx, shuffle: number, blaze: { lit: boolean; setting: number; flare: number }, clock: number) {
  const burning = blaze.lit || blaze.flare > 0
  disc(ctx, 0, 0, 22); ctx.fillStyle = blaze.lit ? '#f7dc8a' : '#d8ccb0'; ctx.fill()
  const round = shake(shuffle, 10) * 0.3
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.2 + round + shake(shuffle, 24, i * 1.7) * 0.07, r = 22 + shake(shuffle, 28, i * 2.3) * 1.8
    oval(ctx, Math.cos(a) * r, Math.sin(a) * r, 6.6, 5.2, a + 1.4); ink(ctx, STONE, 1.2)
  }
  // Three logs laid end over end in a triangle, each resting on the next. Two laid across each other would be a cross on the map.
  for (let k = 0; k < 3; k++) {
    const turn = (k * TAU) / 3 + 0.3 + round * 0.3
    ctx.save(); ctx.rotate(turn); ctx.translate(2.5, 7.4)
    box(ctx, -13.5, -3.3, 27, 6.6, 2.5); ink(ctx, blaze.lit ? '#6b4a2d' : BARK, 1.2)
    ctx.restore()
  }
  if (!burning) return
  const tall = (blaze.lit ? 0.74 + 0.27 * Math.max(0, Math.min(2, blaze.setting)) : 0.3) * (1 + 0.05 * Math.sin(clock * TAU * 11)) + 0.8 * blaze.flare
  const flame = (s: number, lean: number, fill: string, key: number) => {
    ctx.beginPath(); ctx.moveTo(lean * s, -17 * s); ctx.bezierCurveTo(11 * s, -5 * s, 12 * s, 9 * s, 0, 10 * s); ctx.bezierCurveTo(-12 * s, 9 * s, -8 * s, -3 * s, -4 * s, -6 * s); ctx.bezierCurveTo(-3 * s, -10 * s, -2 * s, -13 * s, lean * s, -17 * s)
    ink(ctx, fill, key)
  }
  const lean = Math.sin(clock * TAU * 7) * 2.2
  flame(tall, lean, '#f2a93b', 1.2); ctx.translate(0.5, 2.5 * tall); flame(tall * 0.55, lean * 0.6, '#fbe9a4', 0)
  for (let i = 0; i < 7 && blaze.flare > 0; i++) {
    const a = i * 0.9 + 0.3, r = 16 + 34 * (1 - blaze.flare)
    disc(ctx, Math.cos(a) * r, Math.sin(a) * r - 2.5 * tall, 0.7 + 1.6 * blaze.flare); ctx.fillStyle = '#f2a93b'; ctx.fill()
  }
}

/** The kettle from above. Touched, its lid rattles on the rim. */
export function kettle(ctx: Ctx, rattle: number, dry = false) {
  poly(ctx, [9, -4, 20, -1.5, 20, 1.5, 9, 4]); ink(ctx, '#8d8881', 1.2)
  disc(ctx, 0, 0, 11.5); ink(ctx, '#8d8881')
  // Poured dry, it is left as it ended: the lid off and lying beside it, and nothing inside.
  const lx = shake(rattle, 42) * 2.4 + (dry ? -15 : 0), ly = shake(rattle, 35, 1.3) * 1.9 + (dry ? 12 : 0)
  if (rattle > 0 || dry) { disc(ctx, 0, 0, 5.8); ctx.fillStyle = SOOT; ctx.fill() }
  disc(ctx, lx, ly, 5.6); ink(ctx, '#a9a49c', 1.1)
  disc(ctx, lx, ly, 1.8); ink(ctx, SOOT, 0.9)
  ctx.beginPath(); ctx.moveTo(-3, -11); ctx.quadraticCurveTo(-15, 0, -3, 11); ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke()
}

/** The dog from above, its head at the top of its frame. The tail wags, the head nods to sniff, the paws go in pairs at a trot, and a poke flings its ears out as it spins. */
export function dog(ctx: Ctx, d: ToyFrame['dog']) {
  const wag = d.tail * 7, fling = acting(d.poke) ? Math.sin(Math.PI * d.poke) : 0, step = Math.sin(d.trot * TAU) * 4.6
  for (const [x, y, lead] of [[-7.8, 2.5, 1], [7.8, 2.5, -1], [-7.8, 18.5, -1], [7.8, 18.5, 1]]) { oval(ctx, x, y - lead * step, 2.7, 3.9); ink(ctx, '#efe3c6', 1.1) }
  ctx.beginPath(); ctx.moveTo(3, 22); ctx.quadraticCurveTo(14 + wag * 0.6, 28, 12 + wag * 1.5, 16 + Math.abs(wag) * 0.4); ctx.strokeStyle = INK; ctx.lineWidth = 4.6; ctx.stroke()
  ctx.strokeStyle = '#efe3c6'; ctx.lineWidth = 2.4; ctx.stroke()
  oval(ctx, 0, 10, 8.5, 14); ink(ctx, '#efe3c6')
  ctx.save(); oval(ctx, 0, 10, 8.5, 14); ctx.clip(); disc(ctx, 5, 15, 7); ctx.fillStyle = BARK; ctx.fill(); ctx.restore()
  oval(ctx, 0, 10, 8.5, 14); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke()
  // The head goes out and nods along the ground when it sniffs.
  const sniffing = acting(d.sniff) ? Math.sin(Math.PI * d.sniff) : 0
  ctx.translate(0, -3.5 * sniffing + Math.sin(d.sniff * TAU * 3) * 2 * sniffing)
  for (const side of [-1, 1]) { oval(ctx, side * (6.4 + 3 * fling), -5 + fling, 3.2, 6, side * (0.5 + 0.8 * fling)); ink(ctx, BARK, 1.2) }
  oval(ctx, 0, -6, 6.2, 7.4); ink(ctx, '#efe3c6')
  disc(ctx, 0, -12.4, 1.8); ctx.fillStyle = INK; ctx.fill()
  eyes(ctx, fling > 0.3 ? 'wide' : 'open', -7.4, 2.6, 1)
}

/** The frog from above. Its throat swells out in front; in the air its legs trail behind. */
export function frog(ctx: Ctx, throat: number, lift: number) {
  ctx.strokeStyle = '#4c6a2c'; ctx.lineWidth = 2.2
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 3, 3); ctx.lineTo(side * mix(8.5, 5.5, lift), mix(1, 9, lift)); ctx.lineTo(side * mix(7, 6.5, lift), mix(7.5, 15, lift)); ctx.stroke() }
  if (throat > 0) { disc(ctx, 0, -5.6 - 1.6 * throat, 2 + 2.6 * throat); ink(ctx, '#e6edba', 1, '#3f5a26') }
  oval(ctx, 0, 0, 5.4, 6.6); ink(ctx, '#8fb04c', 1.1, '#3f5a26')
  for (const side of [-1, 1]) { disc(ctx, side * 3.1, -5, 2.3); ink(ctx, '#8fb04c', 1, '#3f5a26'); disc(ctx, side * 3.1, -5.2, 0.9); ctx.fillStyle = INK; ctx.fill() }
}

const COON = '#928d86', COON_DARK = '#3d3835', COON_PALE = '#d8d2c6'

/**
 * A raccoon from above, its head at the top of its frame: a black mask, a ringed tail, and paws that step. It may
 * carry the snack tin on its back, a marshmallow in its mouth, or wear the cook's pan. `held` is one that has been
 * hugged all night.
 */
export function raccoonFigure(ctx: Ctx, walk: number, has: RaccoonFrame['has'], held = false) {
  const step = Math.sin(walk * TAU) * 3.2
  for (const [x, y, lead] of [[-7, -2, 1], [7, -2, -1], [-7, 12, -1], [7, 12, 1]]) { oval(ctx, x, y - lead * step, 2.4, 3.3); ink(ctx, COON_DARK, 0.9) }
  // The tail: one thick curl, dark and pale by turns.
  const bend = step * 0.8
  ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 15); ctx.quadraticCurveTo(4 + bend, 26, 11 + bend * 1.6, 33); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.stroke()
  ctx.lineCap = 'butt'
  for (let i = 0; i < 6; i++) {
    const t0 = i / 6, t1 = (i + 1) / 6
    const px = (t: number) => 2 * (1 - t) * t * (4 + bend) + t * t * (11 + bend * 1.6), py = (t: number) => (1 - t) * (1 - t) * 15 + 2 * (1 - t) * t * 26 + t * t * 33
    line(ctx, px(t0), py(t0), px(t1), py(t1), i % 2 ? COON_PALE : COON_DARK, 6.6)
  }
  ctx.lineCap = 'round'
  oval(ctx, 0, 5, 8.8, 12.5); ink(ctx, COON)
  if (has === 'tin') {
    // The snack tin, ridden home on its back.
    box(ctx, -9, -2, 18, 13, 3); ink(ctx, RED, 1.2, BLACK)
    ctx.fillStyle = WHITE; ctx.fillRect(-8.4, 2.2, 16.8, 4.4)
    box(ctx, -9, -2, 18, 13, 3); ctx.strokeStyle = BLACK; ctx.lineWidth = 1.2; ctx.stroke()
  }
  for (const side of [-1, 1]) { disc(ctx, side * 6.2, -6, 3.1); ink(ctx, COON_DARK, 1); disc(ctx, side * 6.2, -6, 1.3); ctx.fillStyle = COON_PALE; ctx.fill() }
  oval(ctx, 0, -10, 8.2, 7.4); ink(ctx, COON_PALE)
  ctx.save(); oval(ctx, 0, -10, 8.2, 7.4); ctx.clip(); ctx.fillStyle = COON_DARK; ctx.fillRect(-9, -14, 18, 5.4); ctx.restore()
  oval(ctx, 0, -10, 8.2, 7.4); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke()
  oval(ctx, 0, -17, 3.3, 3.8); ink(ctx, COON_PALE, 1.1)
  disc(ctx, 0, -19.8, 1.4); ctx.fillStyle = INK; ctx.fill()
  for (const side of [-1, 1]) { disc(ctx, side * 3.4, -11.4, held ? 2 : 1.3); ctx.fillStyle = '#f6e79a'; ctx.fill(); if (held) { disc(ctx, side * 3.4, -11.4, 0.8); ctx.fillStyle = INK; ctx.fill() } }
  if (has === 'marshmallow') { box(ctx, -3.6, -26.5, 7.2, 6.6, 2.2); ink(ctx, WHITE, 1.1) }
  if (has === 'pan') {
    // The cook's pan, worn as the cook wears it.
    // Far too big for it: the handle sticks well out to one side, with its hanging hole, and only the nose shows in front.
    ctx.save(); ctx.translate(0, -3.5); ctx.rotate(-0.42); box(ctx, 7, -3, 27, 6, 2.6); ink(ctx, SOOT, 1.2); disc(ctx, 30, 0, 1.4); ctx.fillStyle = PAPER; ctx.fill(); ctx.restore()
    disc(ctx, 0, -3.5, 10); ink(ctx, SOOT, 1.3)
    disc(ctx, 0, -3.5, 6.4); ctx.strokeStyle = '#8b847b'; ctx.lineWidth = 1.2; ctx.stroke()
    // The mask and two eyes look out from under its rim.
    for (const side of [-1, 1]) { disc(ctx, side * 3.4, -13, 1.5); ctx.fillStyle = '#f6e79a'; ctx.fill() }
  }
}

/** A moth from above: two pale wings that beat, and a dark body. */
export function moth(ctx: Ctx, beat: number) {
  const open = 0.55 + 0.45 * beat
  for (const side of [-1, 1]) { poly(ctx, [0, -1, side * 5 * open, -4, side * 5.6 * open, 2.6, 0, 2]); ink(ctx, '#f4eedc', 0.8) }
  line(ctx, 0, -2.4, 0, 2.8, INK, 1.5)
}

/** A pair of eyes in the dark. `blink` (0 to 1) shuts them. */
export function eyePair(ctx: Ctx, blink: number) {
  for (const side of [-1, 1]) {
    oval(ctx, side * 5.5, 0, 3.6, 4.4 * (1 - 0.9 * blink)); ctx.fillStyle = '#f6e79a'; ctx.fill()
    if (blink < 0.5) { oval(ctx, side * 5.5 + 0.8, 0.3, 1.1, 2.6); ctx.fillStyle = '#141a33'; ctx.fill() }
  }
}

/** The owl, as the map prints its creatures: seen from the front, perched in the woodland. Its eyes are shut, and open wide and round as it hoots. */
export function owl(ctx: Ctx, hoot: number) {
  const open = clamp01(hoot)
  for (const side of [-1, 1]) { poly(ctx, [side * 3, -10, side * 8.5, -15 - 2 * open, side * 8, -7]); ink(ctx, '#6b5238', 1.1) }
  oval(ctx, 0, 0, 9, 11.5); ink(ctx, '#6b5238')
  oval(ctx, 0, 4.5, 5.4, 6); ink(ctx, '#d9c8a4', 0)
  // Speckled breast feathers, scattered: bars one above another would be a sign.
  ctx.beginPath(); for (const [x, y] of [[-2, 2], [1.6, 3], [-0.6, 5.2], [2.2, 6.6], [-2.3, 7.6]]) { ctx.moveTo(x + 0.8, y); ctx.arc(x, y, 0.8, 0, TAU) } ctx.fillStyle = '#6b5238'; ctx.fill()
  for (const side of [-1, 1]) {
    if (open > 0.05) { disc(ctx, side * 3.9, -4.6, 2 + 2.6 * open); ink(ctx, '#f6e79a', 1); disc(ctx, side * 3.9, -4.6, 0.8 + 0.9 * open); ctx.fillStyle = INK; ctx.fill() }
    else { ctx.beginPath(); ctx.arc(side * 3.9, -5.4, 2.6, 0.25, Math.PI - 0.25); ctx.strokeStyle = '#d9c8a4'; ctx.lineWidth = 1.2; ctx.stroke() }
  }
  poly(ctx, [-1.6, -2.2, 1.6, -2.2, 0, 1]); ink(ctx, OCHRE, 0.8)
  // The branch it sits on, with a twig, so that it is a branch and not a bar under the owl.
  ctx.beginPath(); ctx.moveTo(-11, 13.4); ctx.quadraticCurveTo(0, 11.6, 12, 12.6); ctx.moveTo(6.5, 12.3); ctx.lineTo(11, 8.6); ctx.strokeStyle = INK; ctx.lineWidth = 1.7; ctx.stroke()
}

const MULE = '#a58e70', MULE_FAR = '#8b765b', MULE_DARK = '#4a3b2f', MULE_PALE = '#eadfc6'
// What is strapped on the mule is the camp's own supplies, in the plain colours they have on the rods.
const LOAD = ['#cf9f62', '#eca418', '#2c7fd0'] as const, LOAD_LINE = ['#6a4524', '#8a5a06', '#17508c'] as const

/**
 * The mule from straight above, facing up the sheet: long ears, a dark stripe down the back, a pack blanket. An ear
 * flicks and the tail swings. Its head turns on its neck to the map on its left, round over that shoulder to the
 * heap past the rods, or right round the other way to the sled behind it. Given too much it sits: haunches out,
 * hind hooves forward, ears out sideways, eyelids level. Poked, the head comes up and it brays.
 */
export function mule(ctx: Ctx, m: ToyFrame['mule'], tower: number, of?: TowerOf) {
  const sit = clamp01(m.sit), bray = out(m.poke)
  const look = Math.max(0, Math.min(2, m.look)), neck = mix(mix(mix(-1.05, -2.05, Math.min(1, look)), 2.35, Math.max(0, look - 1)), -0.25, bray)
  // The tail, straight out behind when it has sat on it.
  const wag = m.tail * 8
  ctx.beginPath(); ctx.moveTo(0, 34); ctx.quadraticCurveTo(wag * 0.5, 44 + 4 * sit, wag * (1 - sit), 52 + 8 * sit); ctx.strokeStyle = MULE_DARK; ctx.lineWidth = 3; ctx.stroke()
  oval(ctx, wag * (1 - sit), 55 + 8 * sit, 3.2, 6); ink(ctx, MULE_DARK, 0)
  // Four hooves at the corners. Sitting, the hind pair come forward and out, with the haunches behind them.
  for (const side of [-1, 1]) {
    oval(ctx, side * 14, -21, 4.4, 6); ink(ctx, MULE_DARK, 1)
    if (sit > 0) { oval(ctx, side * mix(13, 21, sit), mix(27, 22, sit), mix(5, 10, sit), mix(6, 13, sit), side * 0.3 * sit); ink(ctx, MULE_FAR, 1.2) }
    oval(ctx, side * mix(14, 26, sit), mix(28, 6, sit), 4.4, 6, side * 0.5 * sit); ink(ctx, MULE_DARK, 1)
  }
  // The barrel, the dark stripe down the spine, and the pack blanket across it.
  oval(ctx, 0, 4 + 3 * sit, 19 + 2 * sit, 33 - 4 * sit); ink(ctx, MULE)
  line(ctx, 0, -25, 0, 34, MULE_DARK, 2.6)
  box(ctx, -21, -9, 42, 27, 4); ink(ctx, OLIVE, 1.3)
  ctx.fillStyle = OCHRE; ctx.fillRect(-20.3, -2, 40.6, 4); ctx.fillRect(-20.3, 7, 40.6, 4)
  box(ctx, -21, -9, 42, 27, 4); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke()
  if (tower > 0) load(ctx, tower, of)
  // The neck, from the withers out to the head, with the mane along it.
  const hx = Math.sin(neck) * 22, hy = -24 - Math.cos(neck) * 22
  limb(ctx, 0, -24, hx, hy, MULE, 14)
  line(ctx, 0, -25, hx, hy, MULE_DARK, 3.4)
  // The head, in a frame at the poll: the muzzle lies up the frame.
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(neck); ctx.scale(1 + 0.16 * bray, 1 + 0.16 * bray)
  for (const side of [-1, 1]) {
    // Two long ears, laid back along the neck: one flicks, both go out sideways when it sits.
    ctx.save(); ctx.translate(side * 5.6, 1); ctx.rotate(side * (-0.34 - 0.95 * sit + 0.2 * bray) - (side > 0 ? m.ear * 0.5 : m.ear * 0.15))
    poly(ctx, [-4.6, 0, 0, 26, 4.6, 0]); ink(ctx, MULE, 1.2); poly(ctx, [-1.5, 4, 0, 17, 1.5, 4]); ctx.fillStyle = MULE_FAR; ctx.fill()
    ctx.restore()
  }
  oval(ctx, 0, -9, 8.6, 14); ink(ctx, MULE)
  oval(ctx, 0, -20, 6.2, 6.6); ink(ctx, MULE_PALE, 1.2)
  if (bray > 0) { oval(ctx, 0, -22, 3.6 * bray, 4.6 * bray); ink(ctx, INK, 0); line(ctx, -2.2 * bray, -19.2, 2.2 * bray, -19.2, WHITE, 1.4) }
  else for (const side of [-1, 1]) { disc(ctx, side * 2.3, -23, 0.9); ctx.fillStyle = MULE_DARK; ctx.fill() }
  for (const side of [-1, 1]) {
    disc(ctx, side * 6.6, -9, 1.9 + 0.7 * bray); ctx.fillStyle = INK; ctx.fill()
    // A heavy lid: half down as a rule, and dead level when it has sat.
    if (bray < 0.5) line(ctx, side * 4.4, mix(-10.6, -9, sit) + side * 0.5 * (1 - sit), side * 8.8, mix(-11, -9, sit), sit > 0.5 ? INK : MULE_DARK, mix(1.4, 2, sit))
  }
  ctx.restore()
}

/** A tier of the tower is five places of the sled, and a place lifts it this many design pixels. */
const TIER_PLACES = 5
const PLACE_RISE = 0.8

/**
 * The tower strapped on the mule: exactly what was left over, in places of the sled, and of what it was: the logs
 * at the bottom in their own tan, then the oil in amber, then the water in blue, tier on tier of five places with
 * what remains of each as a thinner tier. From straight above its height shows two ways: each tier lies further up
 * the sheet than the one under it by as much as it is thick, and the whole throws a hard shadow that is as long as
 * the tower is tall. It is as tall as the leftover, however much that is. `tower` is how many places of it are on
 * the mule so far, while the scout hauls it up.
 */
function load(ctx: Ctx, tower: number, of: TowerOf | undefined) {
  const places = Math.max(1, Math.round(tower)), known = of ? of.logs + of.oil + of.water : 0
  // With nothing said of what it is made of, it is logs.
  const kinds: [number, number][] = known > 0 && of ? [[0, of.logs], [1, of.oil], [2, of.water]] : [[0, places]]
  const tiers: { kind: number; rise: number }[] = []
  let left = places
  for (const [kind, count] of kinds) {
    let mine = Math.min(left, Math.max(0, Math.round(count)))
    left -= mine
    while (mine > 0) { const here = Math.min(TIER_PLACES, mine); tiers.push({ kind, rise: here * PLACE_RISE }); mine -= here }
  }
  const wide = 34 + Math.min(40, places) * 0.2, deep = 24 + Math.min(40, places) * 0.1
  // One flat shadow for the whole of it: the shadow of each tier falls as much further as the tier stands higher.
  ctx.save(); ctx.beginPath()
  let up = 0
  for (const { rise } of tiers) { for (const part of [0, 0.5, 1]) { const high = up + rise * part; ctx.roundRect(-wide / 2 + 4 + high * 0.56, 9 - deep / 2 + high * 0.28, wide, deep, 4) } up += rise }
  ctx.fillStyle = SHADOW; ctx.fill(); ctx.restore()
  up = 0
  tiers.forEach(({ kind, rise }, i) => {
    up += rise
    const shrink = Math.min(i, 12), w = wide - shrink * 1.4, d = deep - shrink * 0.8
    ctx.save(); ctx.translate(-up / 3, 4 - up); ctx.rotate((i % 2 ? 0.09 : -0.07) * (1 + shrink * 0.1))
    box(ctx, -w / 2, -d / 2, w, d, 4); ink(ctx, LOAD[kind], 1.2, LOAD_LINE[kind])
    // One red strap over every tier, edge to edge, so it is plain that this was done on purpose.
    box(ctx, -2.2, -d / 2 - 0.8, 4.4, d + 1.6, 1); ink(ctx, RED, 1, BLACK)
    ctx.restore()
  })
}

/** What a tower is made of, in places of the sled. */
export type TowerOf = { logs: number; oil: number; water: number }

/** How far up the sheet the top of a tower of so many places reaches above the mule's own place, in design pixels of the mule's figure. */
export const towerRise = (places: number) => Math.max(0, Math.round(places)) * PLACE_RISE + 24 / 2 + 4

/** Each camper's tent in its own two inks: the lighter panel and the darker. */
const TENTS: Readonly<Record<CamperId, readonly [string, string]>> = {
  cook: ['#b3c070', OLIVE], reader: ['#9db6cf', SLATE], sleeper: ['#a9829c', PLUM], small: ['#86bab3', TEAL], scout: ['#e6c067', '#cc9a34'],
}
export const tentInks = (who: CamperId) => TENTS[who]
