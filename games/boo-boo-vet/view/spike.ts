// The look spike: the game's real room in the sticker look, in one fixed
// state, with nothing playable behind it. A rabbit that is cold sits on the
// table, a dog that is thirsty waits at the door, the five care things lie on
// the cart with the mouse, and two who were made well sit in the garden.
//
// Everything that moves is a pure function of the game time handed in, and of
// one fixed seed: the same time draws the same frame.

import { CAST, type Species } from '../cast'
import { CARES } from '../needs'
import { DOG_BOUNDS, RABBIT_BOUNDS, dog, rabbit, sized } from './animals'
import { DUCK_BOUNDS, HEDGEHOG_BOUNDS, MOUSE_BOUNDS, duck, hedgehog, mouse } from './critters'
import { layout, type Layout } from './layout'
import type { Ctx, Pen } from './paint'
import { PAL } from './palette'
import { CART_BOUNDS, DOOR_BOUNDS, LAMP_BOUNDS, LEAF_BOUNDS, TABLE_BOUNDS, WINDOW_BOUNDS, cart, door, floor, lamp, leaf, table, windowFrame } from './room'
import { Sheet, drawGloss, drawSticker, type Pose, type Sticker } from './sticker'
import { THINGS } from './things'

const SEED = 20261003
const TAU = Math.PI * 2

/** A fixed number from 0 to 1 for each thing that needs its own timing, from the seed and the thing's place in the scene. */
function chance(n: number): number {
  let h = (SEED ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32
}

/** Breathing: a slow squash and stretch of the whole sticker, in the animal's own tempo. */
function breath(t: number, tempo: number, n: number, depth = 0.022): { sx: number; sy: number } {
  const wave = Math.sin(TAU * (t * tempo * 0.2 + chance(n)))
  return { sx: 1 - wave * depth * 0.6, sy: 1 + wave * depth }
}

/** Whether the eyes are shut at this moment: a short blink every few seconds, at each one's own moments. */
function blinking(t: number, n: number): boolean {
  const every = 2.6 + chance(n + 40) * 2.4
  return (t + chance(n + 80) * every) % every < 0.13
}

/** Where the gloss streak lies across sticker `n` at time `t`: a slow drift to and fro, each at its own pace. */
function drift(t: number, n: number): number {
  return 0.5 + 0.34 * Math.sin(t * (0.36 + chance(n + 200) * 0.2) + chance(n + 300) * TAU)
}

/** How large the two patients are drawn against their drawings: the one on the table is the largest face in the room. */
const RABBIT_SIZE = 1.14, DOG_SIZE = 1.08
const RABBIT_BOX = sized(RABBIT_BOUNDS, RABBIT_SIZE), DOG_BOX = sized(DOG_BOUNDS, DOG_SIZE)
const grown = (pen: Pen, scale: number, paint: (pen: Pen) => void) => { pen.g.scale(scale, scale); paint(pen) }

/** The gloss on the large calm pieces of the room is fainter than on a character or a thing. */
const CALM = 0.55

const sheet = new Sheet()
/** The pieces that never move (wall, door, floor, window, table), painted once for a size and blitted each frame. */
let ground: { canvas: HTMLCanvasElement; key: string } | null = null

type Still = { sticker: Sticker; pose: Pose }

/** The still pieces of the room, back to front. Their gloss still moves, so each keeps its sticker. */
function stills(room: Layout): Still[] {
  const p = room.pieces, fw = Math.ceil(room.floor.w), fh = Math.ceil(room.floor.h)
  return [
    { sticker: sheet.get('door', DOOR_BOUNDS, door), pose: p.door },
    { sticker: sheet.get('floor', { x0: 0, y0: 0, x1: fw, y1: fh }, (pen) => floor(pen, fw, fh), 0, `${fw} ${fh}`), pose: { x: room.floor.x, y: room.floor.y } },
    { sticker: sheet.get('window', WINDOW_BOUNDS, windowFrame), pose: p.window },
    { sticker: sheet.get('table', TABLE_BOUNDS, table), pose: p.table },
  ]
}

function paintGround(room: Layout, pieces: Still[], width: number, height: number, dpr: number): HTMLCanvasElement {
  const canvas = ground?.canvas ?? document.createElement('canvas')
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  const g = canvas.getContext('2d')!, k = dpr * room.scale
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  const wall = g.createLinearGradient(0, 0, 0, height)
  wall.addColorStop(0, PAL.sheet)
  wall.addColorStop(1, PAL.sheetLow)
  g.fillStyle = wall
  g.fillRect(0, 0, width, height)
  g.setTransform(k, 0, 0, k, dpr * room.ox, dpr * room.oy)
  // The lamp's light on the wall behind the table: a soft warm pool, painted on the sheet itself.
  const lit = room.pieces.lamp, pool = g.createRadialGradient(lit.x, lit.y + 150, 20, lit.x, lit.y + 150, 300)
  pool.addColorStop(0, PAL.light)
  pool.addColorStop(1, PAL.lightEdge)
  g.fillStyle = pool
  g.fillRect(lit.x - 300, lit.y - 150, 600, 600)
  for (const { sticker, pose } of pieces) drawSticker(g, sticker, pose)
  return canvas
}

/**
 * Draws the whole fixed scene at game time `seconds` on a surface of
 * `width` by `height` logical pixels, and returns how many sprites it drew.
 */
export function drawSpike(g: Ctx, width: number, height: number, dpr: number, seconds: number): number {
  const room = layout(width, height), t = seconds, p = room.pieces
  const k = dpr * room.scale
  sheet.use(k)
  const pieces = stills(room), key = `${width} ${height} ${dpr}`
  if (ground?.key !== key) ground = { canvas: paintGround(room, pieces, width, height, dpr), key }
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.drawImage(ground.canvas, 0, 0)
  g.setTransform(k, 0, 0, k, dpr * room.ox, dpr * room.oy)
  let draws = 1, n = 0
  for (const { sticker, pose } of pieces) {
    drawGloss(g, sticker, pose, drift(t, n++), CALM)
    draws++
  }

  /** One sticker and its gloss. */
  const put = (sticker: Sticker, pose: Pose, shine = 1) => {
    drawSticker(g, sticker, pose)
    drawGloss(g, sticker, pose, drift(t, n++), shine)
    draws += 2
  }
  const of = (species: Species) => CAST[species].tempo

  // The garden, through the window: a sprig in the air, and the two who were made well.
  put(sheet.get('leaf', LEAF_BOUNDS, leaf), { ...p.leaf, rot: 0.16 * Math.sin(t * 1.1) + 0.05 * Math.sin(t * 2.7) })
  const hedgehogShut = blinking(t, 1), duckShut = blinking(t, 2)
  put(sheet.get(`hedgehog ${hedgehogShut}`, HEDGEHOG_BOUNDS, (pen) => hedgehog(pen, hedgehogShut)), { ...p.gardenLeft, ...breath(t, of('hedgehog'), 1, 0.03) })
  put(sheet.get(`duck ${duckShut}`, DUCK_BOUNDS, (pen) => duck(pen, duckShut)), { ...p.gardenRight, ...breath(t, of('duck'), 2, 0.03), rot: 0.05 * Math.sin(t * of('duck') * 0.7) })
  put(sheet.get('lamp', LAMP_BOUNDS, lamp), { ...p.lamp, rot: 0.012 * Math.sin(t * 0.7) })

  // The rabbit is cold: under its breathing the whole sticker shivers, finely and in gusts.
  const rabbitShut = blinking(t, 3)
  const gust = 0.55 + 0.45 * Math.sin(t * 1.9) ** 2
  const shiver = { x: gust * (1.5 * Math.sin(TAU * 11.3 * t) + 0.8 * Math.sin(TAU * 17.9 * t + 1)), rot: gust * 0.011 * Math.sin(TAU * 13.1 * t + 2) }
  put(sheet.get(`rabbit ${rabbitShut}`, RABBIT_BOX, (pen) => grown(pen, RABBIT_SIZE, (q) => rabbit(q, rabbitShut))), { x: p.patient.x + shiver.x, y: p.patient.y, rot: shiver.rot, ...breath(t, of('rabbit'), 3, 0.018) })

  put(sheet.get('cart', CART_BOUNDS, cart), p.cart, CALM)
  for (const care of CARES) put(sheet.get(care, THINGS[care].bounds, THINGS[care].paint), room.things[care])

  // The mouse fusses: it shifts along its place, turns a little, and tidies its whiskers now and then.
  const mouseShut = blinking(t, 4), fuss = (t * 0.45 + chance(9)) % 1 < 0.38
  const hop = Math.abs(Math.sin(t * 3.1)) * (fuss ? 2.5 : 0)
  put(sheet.get(`mouse ${mouseShut} ${fuss}`, MOUSE_BOUNDS, (pen) => mouse(pen, mouseShut, fuss)), { x: p.mouse.x + 7 * Math.sin(t * 0.8), y: p.mouse.y - hop, rot: 0.07 * Math.sin(t * 1.6), ...breath(t, 4, 4, 0.03) })

  // The dog is thirsty: it pants slowly, and the whole sticker sags and lifts with each pant.
  const dogShut = blinking(t, 5), panting = Math.sin(TAU * t * of('dog') * 0.5)
  const hang = panting > 0.4 ? 2 : panting > -0.4 ? 1 : 0
  put(sheet.get(`dog ${dogShut} ${hang}`, DOG_BOX, (pen) => grown(pen, DOG_SIZE, (q) => dog(q, dogShut, hang / 2))), { ...p.waiting, sx: 1 + panting * 0.012, sy: 1 - panting * 0.02, rot: 0.012 * Math.sin(t * 0.5) })

  g.setTransform(1, 0, 0, 1, 0, 0)
  return draws
}
