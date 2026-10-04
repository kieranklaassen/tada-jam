// What comes and goes on the page besides the guests: the five things,
// wherever the child has put them or in the child's hand, with the numeral of
// a dial beside its flames or icicles; the coach, pulling up, standing with
// its door open or shut, and pulling away; the porter trundling his trolley;
// a lamp set swinging. Each is a kept figure set down by the stage.

import { lump } from './inkAirs'
import { INK, PAPER } from './inkHatch'
import { paintBench, paintLampPatch } from './inkHouse'
import { mul, type Mat } from './inkLens'
import { shadowBlot } from './inkMarks'
import { fromPlain, thingBox, toPlain, type Spot } from './inkPlaces'
import { COACH_WHEEL_UP, TROLLEY_WHEEL, coachWheels, drawCoach, drawCoachDoor, drawCoachWheel, drawLamp, drawPorter } from './inkProps'
import type { InkGuest, InkScene, InkThing, InkView } from './inkScene'
import type { Stage } from './inkStage'
import { drawThingIn, formOf, numeralSpot, type ThingForm } from './inkThings'
import type { PageLayout, Rect } from './layout'
import { drawWhole } from './symbols'

type Standing = readonly { guest: InkGuest; spot: Spot }[]

/** How much of a cupboard slot a thing fills, and how far above the slot's foot its shelf is, in the drawing's units. */
const SLOT_FILL = 0.8
export const SHELF = 9.5

/** The box a thing is drawn in and the form it takes there. In the cupboard it stands on its shelf, a little smaller than the slot. */
function boxOf(thing: InkThing, page: PageLayout, standing: Standing): { box: Rect; form: ThingForm } | null {
  const box = thingBox(thing, page, standing)
  if (!box) return null
  const at = thing.at
  const edge = typeof at === 'object' && 'edge' in at ? page.edges.find((one) => one.id === at.edge) : null
  const form = formOf(thing, edge?.kind === 'wall')
  if (form !== 'slot') return { box, form }
  const w = box.w * SLOT_FILL, h = box.h * SLOT_FILL
  return { box: { x: box.x + (box.w - w) / 2, y: box.y + box.h - SHELF * page.scale - h, w, h }, form }
}

/** A transform turned back about a point when it has been turned half round, so what is drawn at that point stands the right way up. */
export function upright(t: Mat, x: number, y: number): Mat {
  return t[0] < 0 ? mul(t, [-1, 0, 0, -1, 2 * x, 2 * y]) : t
}

/**
 * The numeral of a dial, laid beside the flames or icicles it counts: ink with a paper edge, so it reads on
 * hatching. `t` is the thing's own transform. On a page that is turned half round (the bat's) the numeral is
 * turned back about its own middle, so a numeral is always the right way up and never reads as anything else.
 */
function numeral(ctx: CanvasRenderingContext2D, thing: InkThing, form: ThingForm, w: number, h: number, t: Mat): number {
  const at = numeralSpot(thing.kind, form, w, h)
  if (!at) return 0
  ctx.setTransform(...upright(t, at.x, at.y))
  drawWhole(ctx, thing.dial, at.x, at.y, at.size, { fill: INK, edge: PAPER, edgeWidth: at.size * 0.3 })
  return 1
}

/**
 * One thing where it is: in its slot, in a room, on a wall or floor, or with
 * a guest. Returns how many figures it drew. A thing in the hand is not drawn
 * here (see `carriedThing`).
 */
export function placedThing(stage: Stage, ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, thing: InkThing, standing: Standing, m: Mat): number {
  if (thing.carried) return 0
  const found = boxOf(thing, page, standing)
  if (!found) return 0
  const u = page.scale, { box, form } = found
  const w = box.w / u, h = box.h / u
  const key = `thing ${thing.kind} ${thing.kind === 'stove' || thing.kind === 'ice' ? thing.dial : 0} ${form} ${Math.round(w)} ${Math.round(h)}`
  const sprite = stage.sprite(key, w + 36, h + 34, w / 2 + 18, h + 18, u, (pen) => drawThingIn(pen, thing.kind, thing.dial, form, w, h))
  // A pipe at a guest's mouth flares away from the guest, whichever side of it the box lies.
  const at = thing.at
  const holder = typeof at === 'object' && 'guest' in at ? standing.find((one) => one.guest.id === at.guest) : null
  const flip = holder && thing.kind === 'pipe' && box.x + box.w / 2 < holder.spot.x ? -1 : 1
  const body = thing.body
  const x = box.x + box.w / 2 + (body?.dx ?? 0) * u, y = box.y + box.h + (body?.dy ?? 0) * u
  stage.blit(ctx, sprite, m, x, y, flip * (body?.sx ?? 1), body?.sy ?? 1, body?.rot ?? 0)
  if (!scene.numerals) return 1
  return 1 + numeral(ctx, thing, form, w, h, mul(m, [u, 0, 0, u, x, y]))
}

/** Whether a thing belongs to a room: stands in it, is fixed to one of its walls or its floor or ceiling, or is with a guest who is in it. */
export function thingInRoom(thing: InkThing, page: PageLayout, scene: InkScene, room: number): boolean {
  const at = thing.at
  if (at === 'cupboard') return false
  if ('room' in at) return at.room === room
  if ('edge' in at) {
    const edge = page.edges.find((one) => one.id === at.edge)
    return !!edge && (edge.a === room || edge.b === room)
  }
  const holder = scene.guests.find((guest) => guest.id === at.guest)
  return !!holder && typeof holder.place === 'object' && holder.place.room === room
}

/** How big a thing is drawn in the hand, in the drawing's units. */
const IN_HAND = 62

/** The floor of whatever lies under a point of the surface, as a point of the surface: where a carried thing's shadow falls. */
export function floorUnder(page: PageLayout, view: InkView | null, x: number, y: number): { x: number; y: number } | null {
  const under = toPlain(page, view, { x, y })
  const floors = [...page.rooms.map((room) => room.rect), page.lobby, page.kerb, page.cupboard]
  const below = floors.find((r) => under.x >= r.x && under.x <= r.x + r.w && under.y >= r.y && under.y <= r.y + r.h)
  return below ? fromPlain(page, view, { x: under.x, y: below.y + below.h - 5 * page.scale }) : null
}

/** A thing in the child's hand: hung by its top from just under the finger, swinging, with its shadow on the floor below. Drawn in screen points. */
export function carriedThing(stage: Stage, ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, thing: InkThing, view: InkView | null, screen: Mat): number {
  const held = thing.carried
  if (!held) return 0
  const u = page.scale
  let count = 1
  ctx.setTransform(...screen)
  ctx.globalAlpha = 1
  const floor = floorUnder(page, view, held.x, held.y)
  if (floor) { shadowBlot(ctx, floor.x, floor.y, 20 * u, u); count++ }
  const key = `thing ${thing.kind} ${thing.kind === 'stove' || thing.kind === 'ice' ? thing.dial : 0} slot ${IN_HAND} ${IN_HAND}`
  const sprite = stage.sprite(key, IN_HAND + 36, IN_HAND + 34, IN_HAND / 2 + 18, IN_HAND + 18, u, (pen) => drawThingIn(pen, thing.kind, thing.dial, 'slot', IN_HAND, IN_HAND))
  const gy = held.y + 6 * u, c = Math.cos(held.swing), s = Math.sin(held.swing), tall = IN_HAND * u
  const fx = held.x - s * tall, fy = gy + c * tall
  stage.blit(ctx, sprite, screen, fx, fy, 1, 1, held.swing)
  if (scene.numerals) {
    count += numeral(ctx, thing, 'slot', IN_HAND, IN_HAND, mul(screen, [c * u, s * u, -s * u, c * u, fx, fy]))
  }
  return count
}

/** The lamps a touch has set swinging: over each painted lamp a patch of bare wall, and on its hook another lamp, swung. */
export function swingingLamps(stage: Stage, ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, m: Mat, only: number | null, skip: number | null): number {
  const u = page.scale
  let count = 0
  for (const lamp of scene.lamps ?? []) {
    const room = page.rooms[lamp.room]
    if (!room || Math.abs(lamp.angle) < 0.002 || (only !== null && lamp.room !== only) || lamp.room === skip) continue
    const x = room.rect.x + (room.bedSide === 'right' ? 108 * u : room.rect.w - 108 * u), y = room.rect.y
    stage.blit(ctx, stage.sprite('lamp patch', 48, 50, 24, 0, u, (pen) => paintLampPatch(pen)), m, x, y, 1, 1, 0)
    stage.blit(ctx, stage.sprite('lamp', 44, 56, 22, 3, u, (pen) => drawLamp(pen)), m, x, y, 1, 1, lamp.angle)
    count += 2
  }
  return count
}

/** The porter where he has trundled to, breathing as slowly as a tortoise does, the wheel of his trolley turning as he goes. */
export function porter(stage: Stage, ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, m: Mat, seconds: number): number {
  const u = page.scale, box = page.porter, slow = Math.sin(seconds * 0.8) * 0.012
  const dx = scene.porterAt?.dx ?? 0, dy = scene.porterAt?.dy ?? 0
  const x = box.x + (52 + dx) * u, y = box.y + box.h + (dy - 3) * u
  stage.blit(ctx, stage.sprite('porter', 160, 126, 62, 120, u, (pen) => drawPorter(pen)), m, x, y, 1 - slow * 0.5, 1 + slow, 0)
  if (dx === 0 && dy === 0) return 1
  // Three spokes across the trolley's wheel, a hand's turn apart, which turn by as far as he has gone. (Two at right angles would read as a sign.)
  const turn = dx / TROLLEY_WHEEL.r, r = (TROLLEY_WHEEL.r - 1.5) * u
  const hx = x + TROLLEY_WHEEL.x * u, hy = y + TROLLEY_WHEEL.y * u
  ctx.setTransform(...m)
  ctx.beginPath()
  for (const a of [turn, turn + Math.PI / 3, turn + (2 * Math.PI) / 3]) {
    ctx.moveTo(hx - Math.cos(a) * r, hy - Math.sin(a) * r)
    ctx.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r)
  }
  ctx.strokeStyle = PAPER
  ctx.lineWidth = 1.3 * u
  ctx.stroke()
  return 2
}

/** How much of its width the coach door's leaf shows when it stands open. */
const OPEN_LEAF = 0.62

/**
 * What the waiting coach shows besides its open door: the next coach-load
 * looking out of the dark doorway, three pairs of eyes that blink in turn and
 * look toward the house, and its exhaust puffing behind it.
 */
function waiting(ctx: CanvasRenderingContext2D, page: PageLayout, seconds: number): number {
  const u = page.scale, door = page.coachDoor, box = page.coach
  const whites: [number, number][] = [], pupils: [number, number][] = []
  ;([[0.36, 0.2, 0], [0.64, 0.42, 1.3], [0.4, 0.64, 2.9]] as const).forEach(([fx, fy, phase], pair) => {
    // Each pair is shut for a moment every few seconds, and never two together.
    if ((seconds + phase) % (3.4 + pair * 0.5) < 0.14) return
    const cx = door.x + door.w * fx, cy = door.y + door.h * fy + Math.sin(seconds * 1.1 + phase) * 1.2 * u
    for (const side of [-1, 1]) { whites.push([cx + side * 5 * u, cy]); pupils.push([cx + side * 5 * u - 1.5 * u, cy + 0.3 * u]) }
  })
  ctx.beginPath()
  for (const [x, y] of whites) { ctx.moveTo(x + 3.8 * u, y); ctx.ellipse(x, y, 3.8 * u, 4.4 * u, 0, 0, Math.PI * 2) }
  ctx.fillStyle = PAPER
  ctx.fill()
  ctx.beginPath()
  for (const [x, y] of pupils) { ctx.moveTo(x + 1.6 * u, y); ctx.arc(x, y, 1.6 * u, 0, Math.PI * 2) }
  ctx.fillStyle = INK
  ctx.fill()
  // The exhaust, low at the back: three puffs that leave the pipe one after another, swell and thin away.
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const t = (seconds * 0.9 + i / 3) % 1, r = (2.5 + t * 6.5) * u
    const x = box.x - (6 + t * 26) * u, y = box.y + box.h - (12 + t * 16) * u + Math.sin(t * 5 + i) * 1.5 * u
    ctx.moveTo(x + r, y)
    ctx.arc(x, y, r, 0, Math.PI * 2)
  }
  ctx.fillStyle = PAPER
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.1 * u
  ctx.stroke()
  return 3
}

/**
 * The coach: at the kerb, or so many coach lengths short of it or past it,
 * its wheels turning by as far as it has rolled and its springs bouncing
 * while it rolls; its door shut, or swung out over a step let down. It keeps
 * to the street: coming from the left it comes out from behind the house, and
 * behind the bench and the luggage.
 */
export function coach(stage: Stage, ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, m: Mat, seconds: number): number {
  const at = scene.coachAt ?? 0
  if (scene.coach === false || at >= 1 || at <= -1) return 0
  const u = page.scale, box = page.coach, door = page.coachDoor, plate = page.plate
  const right = plate.x + plate.w, open = !!scene.coachOpen
  const dx = at < 0 ? at * (box.x + box.w - page.kerb.x + 24 * u) : at * (right - box.x + 24 * u)
  // On the move it rides up and down on its springs.
  const lift = Math.abs(Math.sin(seconds * 11)) * 1.8 * u
  const w = box.w / u, h = box.h / u, doorW = door.w / u, doorH = door.h / u, doorX = (door.x - box.x) / u
  /** The door's leaf in the coach's own units: shut in its doorway, or swung right out on its hinges and standing wide beside the doorway, most of its face still seen. An open door is the one sign that a cycle has ended, so it is no thin strip. */
  const leafAt = open ? { x: doorX - doorW * OPEN_LEAF + 2, sx: OPEN_LEAF } : { x: doorX, sx: 1 }
  const waits = open && !!scene.coachWaits
  if (at === 0) {
    // Standing at the kerb it is one figure: body, wheels and door together.
    const whole = stage.sprite(`coach at rest ${Number(open)}`, w + 30, h + 22, 8, 10, u, (pen) => {
      drawCoach(pen, w, h, doorX, doorW, open)
      const g = pen.ctx
      for (const cx of coachWheels(w)) { g.save(); g.translate(cx, h - COACH_WHEEL_UP); drawCoachWheel(pen); g.restore() }
      g.save()
      g.translate(leafAt.x, (door.y - box.y) / u)
      g.scale(leafAt.sx, 1)
      drawCoachDoor(pen, doorW, doorH)
      g.restore()
    })
    // Waiting for the child with the next coach-load in it, its engine runs: the whole coach shudders on its springs.
    stage.blit(ctx, whole, m, box.x, box.y + (waits ? Math.sin(seconds * 31) * 0.55 * u : 0), 1, 1, 0)
    ctx.setTransform(...m)
    if (waits) return 1 + waiting(ctx, page, seconds)
    if (open) return 1
    return 1 + lump(ctx, page, seconds)
  }
  ctx.save()
  ctx.setTransform(...m)
  ctx.beginPath()
  ctx.rect(page.kerb.x, page.kerb.y - 10 * u, right - page.kerb.x, plate.y + plate.h - page.kerb.y + 10 * u)
  ctx.clip()
  const body = stage.sprite(`coach ${Number(open)}`, w + 30, h + 22, 8, 10, u, (pen) => drawCoach(pen, w, h, doorX, doorW, open))
  stage.blit(ctx, body, m, box.x + dx, box.y - lift, 1, 1, 0)
  const wheel = stage.sprite('coach wheel', 48, 48, 24, 24, u, (pen) => drawCoachWheel(pen))
  for (const cx of coachWheels(w)) stage.blit(ctx, wheel, m, box.x + dx + cx * u, box.y + (h - COACH_WHEEL_UP) * u, 1, 1, dx / (21 * u))
  const leaf = stage.sprite('coach door', doorW + 8, doorH + 8, 4, 4, u, (pen) => drawCoachDoor(pen, doorW, doorH))
  stage.blit(ctx, leaf, m, box.x + dx + leafAt.x * u, door.y - lift, leafAt.sx, 1, 0)
  let count = 4
  if (!open) { ctx.setTransform(...m); count += lump(ctx, page, seconds, dx, -lift) }
  if (at < 0) {
    // It is passing behind the bench: the bench and the luggage are set down again over it.
    const lg = page.luggage, bn = page.bench
    const bx = Math.min(lg.x, bn.x) - 8 * u, by = Math.min(lg.y, bn.y) - 10 * u
    const bw = Math.max(lg.x + lg.w, bn.x + bn.w) + 10 * u - bx, bh = Math.max(lg.y + lg.h, bn.y + bn.h) + 8 * u - by
    stage.blit(ctx, stage.sprite('bench', bw, bh, -bx, -by, 1, (pen) => paintBench(pen, page)), m, 0, 0, 1, 1, 0)
    count++
  }
  ctx.restore()
  return count
}
