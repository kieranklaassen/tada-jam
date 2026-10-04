// Draws the toy: maps each item of the frame (toyScene.ts) onto a sticker.
// The room's still ground and the sprite cache are the spike's own, so the
// toy's first frame is the spike's room.
//
// Everything that moves comes in with the items or is a pure function of the
// game time handed in: the same items at the same time draw the same frame.

import { SPECIES, type Species } from '../cast'
import type { Face } from '../motion'
import { CARES, type Care } from '../needs'
import type { Item, PartName } from '../toyScene'
import { MOUSE_BOUNDS, mouse } from './critters'
import { EXTRAS } from './extras'
import { FACES as DRAWN_FACES, FIGURES } from './figures'
import type { Layout } from './layout'
import { box, ell, poly, puff, type Ctx, type Pen } from './paint'
import { PAL } from './palette'
import { PARTS } from './parts'
import { CART_BOUNDS, LAMP_BOUNDS, LEAF_BOUNDS, TABLE_BOUNDS, cart, lamp, leaf, table } from './room'
import { CALM, drift, groundFor, sheet, stills } from './spike'
import { LIFT, drawGloss, drawSticker, type Pose, type Sticker } from './sticker'
import { THINGS } from './things'

/** The faces a well animal wears in the toy: these are baked ahead for the animals in view. */
const WELL: readonly Face[] = ['calm', 'glad', 'wow', 'bliss', 'wary']
const FACES: readonly string[] = DRAWN_FACES

type Drawn = Parameters<(typeof FIGURES)[Species]['paint']>[1]
/** The face as the figures can draw it: one they do not hold yet is drawn calm. */
const drawable = (face: Face): Drawn => (FACES.includes(face) ? (face as Drawn) : 'calm')
/** A figure with its ears up is the drawing every state shares; one with an ear or both hanging is a drawing of its own. */
const figure = (species: Species, face: Face, shut: boolean, hang = 0): Sticker =>
  sheet.get(`figure ${species} ${drawable(face)} ${shut}${hang ? ` hang ${hang}` : ''}`, FIGURES[species].bounds, (pen) => FIGURES[species].paint(pen, drawable(face), shut, hang))
const thing = (care: Care, lifted: boolean): Sticker => sheet.get(lifted ? `${care} lifted` : care, THINGS[care].bounds, THINGS[care].paint, lifted ? LIFT : 0)
/** The shelf the carrier stands on: a plain plank on two brackets. Origin: the middle of its top. */
const SHELF_BOUNDS = { x0: -118, y0: -2, x1: 118, y1: 34 }
function shelf(pen: Pen): void {
  puff(pen, box(-96, 10, 14, 22, 5), PAL.cart.post)
  puff(pen, box(82, 10, 14, 22, 5), PAL.cart.post)
  puff(pen, box(-116, 0, 232, 16, 7), PAL.cart.post)
}

/** A frightened hedgehog curled up: the same ring of spines as the hedgehog itself, with no face to be seen. Origin: where it sits. */
const BALL_BOUNDS = { x0: -76, y0: -140, x1: 76, y1: 4 }
function ball(pen: Pen): void {
  // A curled-up ball: spines of uneven length that lean a little all one way, as on something rolled up tight, and
  // two small ears tucked in at the top. It is a prickly ball and never a regular star.
  const spines: number[] = [], long = [72, 64, 70, 60, 74, 66, 62, 71, 58, 68, 73, 61, 69, 65, 59]
  for (let i = 0; i < 30; i++) {
    const a = ((i + (i % 2 ? 0.3 : 0)) / 30) * Math.PI * 2, r = i % 2 ? long[(i - 1) / 2] : 54
    spines.push(Math.sin(a) * r, -68 - Math.cos(a) * r * 0.94)
  }
  puff(pen, poly(spines), PAL.hedgehog.spines, 0.9)
  puff(pen, ell(0, -66, 42, 40), PAL.hedgehog.spines, 0.5)
  for (const s of [-1, 1]) puff(pen, ell(s * 20, -96, 8, 7), PAL.hedgehog.face, 0.4)
}

/** A part of a sign or of the room, as a sprite. Parts that lie on an animal's own sticker are baked bare. */
function part(name: PartName, species: Species | null): Sticker {
  const of = (key: string, made: { paint: Parameters<typeof sheet.get>[2]; bounds: Parameters<typeof sheet.get>[1] }) => sheet.get(key, made.bounds, made.paint, 0, '', 'bare' in made)
  switch (name) {
    case 'paw': return of(`paw ${species}`, PARTS.paw(species ?? 'bear'))
    case 'arms': return of(`arms ${species}`, PARTS.arms(species ?? 'bear'))
    case 'tongue1': return of('tongue 1', PARTS.tongue(1))
    case 'tongue2': return of('tongue 2', PARTS.tongue(2))
    case 'burr': return of('burr', PARTS.burr)
    case 'puff': return of('puff', PARTS.puff)
    case 'shade': return of('shade', PARTS.shade)
    case 'eyes': return of('eyes', PARTS.eyes(false))
    case 'eyesShut': return of('eyes shut', PARTS.eyes(true))
    case 'eye': return of('eye', PARTS.eye)
    case 'fur': return of(`fur ${species}`, PARTS.fur(species ?? 'bear'))
    case 'beard': return of('beard', PARTS.beard)
    case 'foam': return of('foam', PARTS.foam)
    case 'den': return of('den', PARTS.den)
    case 'denLifted': return sheet.get('den lifted', PARTS.den.bounds, PARTS.den.paint, LIFT)
    case 'carrier': return of('carrier', PARTS.carrier(false))
    case 'carrierOpen': return of('carrier open', PARTS.carrier(true))
    case 'table': return sheet.get('table', TABLE_BOUNDS, table)
    case 'shelf': return sheet.get('shelf', SHELF_BOUNDS, shelf)
    case 'ball': return sheet.get('ball', BALL_BOUNDS, ball)
  }
}
/** The parts that carry a gloss: the ones that are stickers of their own, not marks on an animal. */
const GLOSSY: readonly PartName[] = ['paw', 'puff', 'foam', 'den', 'carrier', 'carrierOpen', 'table', 'shelf', 'ball', 'fur']

const extra = (name: keyof typeof EXTRAS): Sticker => sheet.get(name, EXTRAS[name].bounds, EXTRAS[name].paint, 0, '', EXTRAS[name].bare === true)

/**
 * The drawings a frame may ask for next and does not hold yet: one is baked
 * on each frame, under the ground, so a face or a lifted thing never waits
 * for its sprite in the frame that first shows it.
 */
function spare(present: readonly Species[], n: number): (() => Sticker) | null {
  const list: (() => Sticker)[] = []
  for (const care of CARES) list.push(() => thing(care, true))
  for (const name of ['plasterOne', 'blanketOpen', 'drop', 'halo', 'hand'] as const) list.push(() => extra(name))
  list.push(() => sheet.get('plasterOne lifted', EXTRAS.plasterOne.bounds, EXTRAS.plasterOne.paint, LIFT))
  for (const species of present) for (const face of WELL) for (const shut of [false, true]) list.push(() => figure(species, face, shut))
  for (const species of SPECIES) if (!present.includes(species)) list.push(() => figure(species, 'calm', false))
  return n < list.length ? list[n] : null
}
let spared = 0, sparedFor = ''

/**
 * Draws one frame of the toy on a surface of `width` by `height` logical
 * pixels and returns how many sprites it drew. With no items it draws the
 * bare room, which is what shows before the save has been read.
 */
export function drawToy(g: Ctx, room: Layout, width: number, height: number, dpr: number, items: readonly Item[], seconds: number): number {
  const k = dpr * room.scale, t = seconds, p = room.pieces
  const present = items.flatMap((item) => (item.kind === 'figure' && item.who !== 'garden' ? [item.species] : []))
  const forWhom = present.join()
  if (sheet.use(k) || forWhom !== sparedFor) { spared = 0; sparedFor = forWhom }
  const pieces = stills(room)
  const backdrop = groundFor(room, pieces, width, height, dpr)
  g.setTransform(1, 0, 0, 1, 0, 0)
  const next = spare(present, spared)
  if (next) {
    spared++
    const sticker = next()
    g.setTransform(k, 0, 0, k, 0, 0)
    drawSticker(g, sticker, { x: sticker.ox, y: sticker.oy })
    g.setTransform(1, 0, 0, 1, 0, 0)
  }
  g.drawImage(backdrop, 0, 0)
  g.setTransform(k, 0, 0, k, dpr * room.ox, dpr * room.oy)
  let draws = 1, n = 0
  for (const { sticker, pose } of pieces) {
    drawGloss(g, sticker, pose, drift(t, n++), CALM)
    draws++
  }
  const put = (sticker: Sticker, pose: Pose, shine = 1, alpha = 1, glossAt = -1) => {
    if (alpha <= 0) return
    if (alpha < 1) g.globalAlpha = alpha
    drawSticker(g, sticker, pose)
    if (shine > 0) drawGloss(g, sticker, pose, glossAt >= 0 ? glossAt : drift(t, n), shine * alpha)
    if (alpha < 1) g.globalAlpha = 1
    n++
    draws += shine > 0 ? 2 : 1
  }

  // A sprig moves in the garden air.
  put(sheet.get('leaf', LEAF_BOUNDS, leaf), { ...p.leaf, rot: 0.16 * Math.sin(t * 1.1) + 0.05 * Math.sin(t * 2.7) })

  for (const item of items) {
    switch (item.kind) {
      case 'lamp':
        put(sheet.get('lamp', LAMP_BOUNDS, lamp), { ...p.lamp, rot: item.rot }, 1, item.alpha)
        break
      case 'cart':
        put(sheet.get('cart', CART_BOUNDS, cart), { x: p.cart.x + item.x, y: p.cart.y }, CALM)
        break
      case 'part': {
        // The den in the hand or in the air: lifted, with its gloss sliding across it.
        if (item.part === 'denLifted') { put(part(item.part, item.species), { x: item.x, y: item.y, rot: item.rot, sx: item.sx, sy: item.sy }, 1, item.alpha, (t * 1.3) % 1); break }
        put(part(item.part, item.species), { x: item.x, y: item.y, rot: item.rot, sx: item.sx, sy: item.sy }, GLOSSY.includes(item.part) ? (item.part === 'table' || item.part === 'shelf' ? CALM : 1) : 0, item.alpha)
        break
      }
      case 'figure':
        put(figure(item.species, item.face, item.shut, item.hang), { x: item.x, y: item.y, rot: item.rot, sx: item.sx * item.size, sy: item.sy * item.size }, item.who === 'garden' ? 0.6 : 1, item.alpha)
        break
      case 'thing': {
        const pose = { x: item.x, y: item.y, rot: item.rot, sx: item.sx, sy: item.sy }
        if (item.look === 'open') put(extra('blanketOpen'), pose, 1, item.alpha)
        else if (item.look === 'one') put(extra('plasterOne'), pose, 1, item.alpha)
        // One plaster in the hand or in the air is a lifted sticker too: its corner curls and its gloss slides.
        else if (item.look === 'one-lifted') put(sheet.get('plasterOne lifted', EXTRAS.plasterOne.bounds, EXTRAS.plasterOne.paint, LIFT), pose, 1, item.alpha, (t * 1.3) % 1)
        // A lifted thing's gloss slides across it, as on a sticker tilted in the hand.
        else if (item.look === 'lifted') put(thing(item.care, true), pose, 1, item.alpha, (t * 1.3) % 1)
        else put(thing(item.care, false), pose, 1, item.alpha)
        break
      }
      case 'mouse': {
        const pose = { x: item.x, y: item.y, rot: item.rot, sx: item.sx, sy: item.sy }
        put(sheet.get(`mouse ${item.shut} ${item.fuss}`, MOUSE_BOUNDS, (pen) => mouse(pen, item.shut, item.fuss)), pose)
        // A plaster stuck on the mouse sits on its hat and goes down with it when it ducks.
        if (item.hat) put(extra('plasterOne'), { x: item.x + 2, y: item.y - 104 * item.sy, rot: item.rot - 0.2, sx: 0.8, sy: 0.8 })
        break
      }
      case 'halo': {
        const breathe = 1 + 0.06 * Math.sin(t * 3.2)
        put(extra('halo'), { x: item.x, y: item.y, sx: breathe * item.size, sy: breathe * item.size }, 0, item.strength)
        break
      }
      case 'hand':
        put(extra('hand'), { x: item.x, y: item.y, sx: 1 - 0.08 * item.press, sy: 1 - 0.08 * item.press }, 0, item.alpha * 0.8)
        break
      case 'drop':
        put(extra('drop'), { x: item.x, y: item.y }, 0, item.alpha)
        break
      case 'ripple': {
        // A ring spreading on the water of a bowl: flat, as the water is seen, and gone as it reaches the rim.
        const reach = 8 + 34 * item.age, fade = item.alpha * Math.sin(Math.PI * Math.min(1, item.age * 1.1))
        g.beginPath()
        g.ellipse(item.x, item.y, reach * item.size, reach * 0.28 * item.size, 0, 0, Math.PI * 2)
        // Dark on the pale water, with a light edge inside it, so it shows on any tier.
        g.lineWidth = 4.2 * item.size
        g.strokeStyle = `rgba(36, 104, 186, ${0.7 * fade})`
        g.stroke()
        g.lineWidth = 1.6 * item.size
        g.strokeStyle = `rgba(255, 255, 255, ${0.9 * fade})`
        g.stroke()
        draws++
        break
      }
      case 'ring': {
        // A touch on the bare room: one soft patch of light that swells and is gone. It is filled, never an outline.
        const fade = Math.max(0, 1 - item.age / 0.6)
        g.beginPath()
        g.arc(item.x, item.y, 16 + item.age * 90, 0, Math.PI * 2)
        g.fillStyle = `rgba(255, 255, 255, ${0.5 * fade})`
        g.fill()
        draws++
        break
      }
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0)
  return draws
}
