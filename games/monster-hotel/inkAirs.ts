// What travels through the house, and the few other things that are drawn
// afresh each frame as strokes: warmth, cold, smell and noise, the snow, the
// lump behind the coach's blind. Each air can be drawn four ways, by how the
// guest whose place the page is drawn from takes it: plain; loved, in the
// spot colour with curls; minded, in heavy black scribble that marks the wall
// or floor it came through; or faint, in pencil. Everything moves by the
// seconds handed in and scatters by fixed numbers.

import { SHAPES } from './hotel'
import { TUBA_BELL } from './inkGuests'
import { INK, PAPER, SPOT } from './inkHatch'
import { spotsOf, thingBox } from './inkPlaces'
import type { InkAir, InkScene, InkTaken, InkThing } from './inkScene'
import { Marks, type PathLike, type Trace } from './inkTrace'
import type { PageLayout, Rect } from './layout'

/** The troll's beat: how many times a second its cheeks fill, and its noise sets out. */
export const BEAT = 1.5

/** How strong a pencil line is beside an ink one. */
export const PENCIL = 0.36

const TAU = Math.PI * 2

/** A number from 0 to 1 that is always the same for the same two whole numbers. */
export function fixed(a: number, b: number): number {
  let t = (Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca6b)) >>> 0
  t = Math.imul(t ^ (t >>> 15), 0x2c1b3c6d) >>> 0
  return ((t ^ (t >>> 13)) >>> 0) / 4294967296
}

/** The three weights the airs are drawn in, in the drawing's units. */
const THIN = 1.2, MID = 1.7, THICK = 2.3

/**
 * The pen an air is drawn with, by how it is taken: plain ink; the spot
 * colour for what is loved; a heavier black for what is minded; pencil for
 * what is nothing to the viewer.
 */
function penOf(marks: Marks, weight: number, taken: InkTaken, u: number, join: CanvasLineJoin = 'round'): Trace {
  if (taken === 'loved') return marks.stroke(SPOT, weight * u, 1, join)
  if (taken === 'minded') return marks.stroke(INK, weight * 1.7 * u, 1, join)
  if (taken === 'faint') return marks.stroke(INK, weight * u, PENCIL, join)
  return marks.stroke(INK, weight * u, 1, join)
}

/** Wavy lines rising between two heights, broken into lengths that climb. */
function wavy(to: PathLike, x1: number, x2: number, bottom: number, top: number, lines: number, seconds: number, seed: number, u: number): void {
  const period = 64 * u, climb = seconds * 16 * u
  for (let i = 0; i < lines; i++) {
    const x = x1 + ((i + 0.5) / lines) * (x2 - x1), shift = fixed(seed, i) * period
    let pen = false
    for (let y = bottom; y >= top; y -= 4 * u) {
      // A length is drawn, then a gap; both climb with the seconds.
      const along = (((bottom - y) - climb + shift) % period + period) % period
      if (along > period * 0.68) { pen = false; continue }
      const px = x + Math.sin((y / u) * 0.11 + i * 1.9 + seconds * 0.6) * 4.5 * u
      if (pen) to.lineTo(px, y); else to.moveTo(px, y)
      pen = true
    }
  }
}

/** Cold sinking through a floor: fine strokes falling and a fringe of icicles on the ceiling below. */
function cold(marks: Marks, taken: InkTaken, x: number, w: number, floorY: number, ceilingY: number, roomH: number, level: number, seconds: number, u: number): void {
  const top = floorY - 34 * u, reach = ceilingY + roomH * Math.min(0.62, 0.22 + 0.2 * level)
  const strokes = penOf(marks, THIN, taken, u)
  for (let i = 0; i < 30; i++) {
    const px = x + (0.08 + 0.84 * fixed(31, i)) * w
    const t = (fixed(32, i) + seconds * (0.1 + fixed(33, i) * 0.06)) % 1
    const y = top + t * (reach - top), len = (7 + fixed(34, i) * 9) * u * (1 - t * 0.5)
    strokes.moveTo(px, y)
    strokes.lineTo(px, y + len)
  }
  // The icicles, hung from the ceiling the cold comes through.
  const ice = marks.filled(PAPER, taken === 'loved' ? SPOT : INK, THIN * (taken === 'minded' ? 1.7 : 1) * u, taken === 'faint' ? PENCIL : 1)
  const teeth = 15
  for (let i = 0; i < teeth; i++) {
    const cx = x + ((i + 0.5) / teeth) * w + (fixed(35, i) - 0.5) * 6 * u, half = (2.4 + fixed(36, i) * 2) * u
    const len = (9 + fixed(37, i) * 15 * level) * u
    ice.moveTo(cx - half, ceilingY)
    ice.lineTo(cx + (fixed(38, i) - 0.5) * u, ceilingY + len)
    ice.lineTo(cx + half, ceilingY)
  }
}

/** Something lumpy leaning on the coach's blind from inside: it shifts now and then. */
export function lump(ctx: CanvasRenderingContext2D, page: PageLayout, seconds: number, dx = 0, dy = 0): number {
  const u = page.scale, coach = page.coach
  // Still for most of every seven seconds, then a slow lurch to somewhere else along the blind.
  const turnOf = Math.floor(seconds / 7), within = seconds / 7 - turnOf
  const ease = within < 0.82 ? 0 : (1 - Math.cos(((within - 0.82) / 0.18) * Math.PI)) / 2
  const spot = fixed(71, turnOf) + (fixed(71, turnOf + 1) - fixed(71, turnOf)) * ease
  const span = page.coachDoor.x - coach.x - 44 * u
  const x = coach.x + dx + 22 * u + spot * Math.max(0, span), y = coach.y + dy + 50 * u
  ctx.beginPath()
  ctx.moveTo(x - 9 * u, y + 12 * u)
  ctx.quadraticCurveTo(x - 10 * u, y - 4 * u, x - 2 * u, y - 5 * u)
  ctx.quadraticCurveTo(x + 2 * u, y - 12 * u, x + 8 * u, y - 4 * u)
  ctx.quadraticCurveTo(x + 13 * u, y + 2 * u, x + 10 * u, y + 12 * u)
  ctx.fillStyle = PAPER
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.3 * u
  ctx.stroke()
  ctx.beginPath()
  for (const k of [-5, 0, 5]) { ctx.moveTo(x + k * u, y + 2 * u); ctx.lineTo(x + (k + 1.5) * u, y + 11 * u) }
  ctx.lineWidth = 0.7 * u
  ctx.stroke()
  return 1
}

/** Snow: drifting down through a snow hole into the room under it, and falling from the yeti's own cloud. */
export function snow(ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, seconds: number, flakes: number, cloud: { x: number; y: number } | null): number {
  const u = page.scale, { floors } = SHAPES[scene.house.shape]
  ctx.beginPath()
  let any = false
  for (const fixture of scene.house.fixtures) {
    if (fixture.kind !== 'snow') continue
    const bay = page.roofBays[fixture.col], room = page.rooms[(floors - 1) * SHAPES[scene.house.shape].cols + fixture.col]
    if (!bay || !room) continue
    const cx = bay.x + bay.w / 2, top = bay.y - 30 * u, bottom = room.rect.y + room.rect.h - 8 * u
    for (let i = 0; i < flakes; i++) {
      const t = (fixed(41 + fixture.col, i) + seconds * (0.045 + fixed(42, i) * 0.03)) % 1
      const y = top + t * (bottom - top)
      // Through the hole it is a narrow stream; in the room it spreads.
      const spread = (y < room.rect.y ? 18 : 18 + ((y - room.rect.y) / room.rect.h) * 50) * u
      const x = cx + (fixed(43, i) - 0.5) * 2 * spread + Math.sin(seconds * 0.8 + i) * 4 * u
      const r = (1.5 + fixed(44, i) * 1.4) * u
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, TAU)
      any = true
    }
  }
  if (cloud) {
    for (let i = 0; i < 7; i++) {
      const t = (fixed(51, i) + seconds * (0.22 + fixed(52, i) * 0.1)) % 1
      const x = cloud.x + (fixed(53, i) - 0.5) * 44 * u + Math.sin(seconds + i) * 2 * u, y = cloud.y + (2 + t * 26) * u
      const r = (1.3 + fixed(54, i) * 0.9) * u
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, TAU)
      any = true
    }
  }
  if (!any) return 0
  ctx.fillStyle = PAPER
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.9 * u
  ctx.stroke()
  return 1
}

/** Adds one curling line to a path, from one point to another: a pen left to loop as it goes. `turn` is where in a loop it starts. */
function curl(to: PathLike, x1: number, y1: number, x2: number, y2: number, rho: number, loops: number, turn: number): void {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1, ax = (x2 - x1) / length, ay = (y2 - y1) / length
  const steps = Math.max(8, loops * 12)
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, a = turn + t * loops * TAU
    const along = t * length - Math.sin(a) * rho * 1.5, out = Math.cos(a) * rho
    const px = x1 + ax * along - ay * out, py = y1 + ay * along + ax * out
    if (k === 0) to.moveTo(px, py); else to.lineTo(px, py)
  }
}

/**
 * A smell: fat, lazy curls drifting from where it is made toward the wall it
 * crosses (or the pipe it is let through), and thinner curls on the far side.
 */
function pong(marks: Marks, taken: InkTaken, x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, seconds: number, u: number): void {
  const drift = seconds * 0.9, near = penOf(marks, MID, taken, u), far = penOf(marks, THIN, taken, u)
  for (let i = 0; i < 2; i++) {
    const side = (i - 0.5) * 18 * u, sideways = Math.abs(x2 - x1) >= Math.abs(y2 - y1)
    const ox = sideways ? 0 : side, oy = sideways ? side : 0
    curl(near, x1 + ox, y1 + oy, cx + ox * 0.4, cy + oy * 0.4, 7 * u, Math.max(2, Math.round(Math.hypot(cx - x1, cy - y1) / (34 * u))), drift + i * 2)
    curl(far, cx + ox * 0.4, cy + oy * 0.4, x2 + ox, y2 + oy, 5.5 * u, Math.max(1, Math.round(Math.hypot(x2 - cx, y2 - cy) / (30 * u))), drift + i * 2 + 1)
  }
}

/** The box of the thing of that kind that stands in a room, or is fixed to the wall or floor between two rooms, and is not in the hand. */
function placed(scene: InkScene, page: PageLayout, kind: InkThing['kind'], where: { room: number } | { a: number; b: number }): Rect | null {
  for (const thing of scene.things) {
    if (thing.kind !== kind || thing.carried || thing.at === 'cupboard') continue
    const at = thing.at
    if ('room' in where && 'room' in at && at.room === where.room) return thingBox(thing, page, [])
    if ('a' in where && 'edge' in at) {
      const edge = page.edges.find((one) => one.id === at.edge)
      if (edge && ((edge.a === where.a && edge.b === where.b) || (edge.a === where.b && edge.b === where.a))) return thingBox(thing, page, [])
    }
  }
  return null
}

/** Where a noise sets out from: the bell of the tuba whose player is awake in that room, or the middle of the room. */
function sourceOf(scene: InkScene, page: PageLayout, room: number): { x: number; y: number } | null {
  const from = page.rooms[room]
  if (!from) return null
  const u = page.scale
  const maker = scene.guests.find((guest) => guest.id === 'troll' && guest.awake && !guest.carried && typeof guest.place === 'object' && guest.place.room === room)
  const where = maker ? spotsOf(scene.guests, page).find((entry) => entry.guest === maker)?.spot ?? null : null
  if (where) return { x: where.x + TUBA_BELL.x * u * (where.flip ? -1 : 1), y: where.y + TUBA_BELL.y * u }
  return { x: from.rect.x + from.rect.w / 2, y: from.rect.y + from.rect.h / 2 }
}

/**
 * Noise: marks that leave the tuba's bell, cross a wall or a floor and are
 * thinner on the far side. Plain, they are jagged arcs. Loved, they are
 * looping curls in the spot colour with a few round blobs floating among
 * them. Minded, the arcs are heavy and the wall or floor they came through is
 * scribbled black. Faint, they are the plain arcs in pencil.
 */
function din(marks: Marks, scene: InkScene, page: PageLayout, air: InkAir, taken: InkTaken, seconds: number): void {
  const u = page.scale
  const source = air.rooms[0]!, last = air.rooms[air.rooms.length - 1]!, before = air.rooms[air.rooms.length - 2]!
  const to = page.rooms[last], via = page.rooms[before], start0 = sourceOf(scene, page, source)
  if (!to || !via || !start0) return
  const sx = start0.x, sy = start0.y
  // It heads for the middle of the wall or floor it crosses last, and a little beyond.
  const sideways = to.rect.y === via.rect.y
  const crossX = sideways ? (to.rect.x > via.rect.x ? to.rect.x - 5 * u : via.rect.x - 5 * u) : Math.max(via.rect.x + via.rect.w * 0.25, Math.min(via.rect.x + via.rect.w * 0.75, sx))
  const crossY = sideways ? Math.max(via.rect.y + via.rect.h * 0.3, Math.min(via.rect.y + via.rect.h * 0.7, sy)) : (to.rect.y > via.rect.y ? to.rect.y - 6 * u : via.rect.y - 6 * u)
  const heading = Math.atan2(crossY - sy, crossX - sx), wall = Math.hypot(crossX - sx, crossY - sy)
  const loved = taken === 'loved', minded = taken === 'minded'
  const start = 30 * u, beyond = (44 + 24 * air.level + (minded ? 26 : 0)) * u, far = wall + beyond, gap = (loved ? 27 : 21) * u
  const phase = (seconds * BEAT) % 1
  const count = Math.ceil((far - start) / gap)
  const seed = last * 7 + source
  const join: CanvasLineJoin = loved ? 'round' : 'miter'
  const nearPen = penOf(marks, THICK, taken, u, join), farPen = penOf(marks, THIN, taken, u, join)
  for (let i = 0; i < count; i++) {
    const r = start + (i + phase) * gap
    if (r > far) continue
    const across = r > wall, pen = across ? farPen : nearPen
    // Each mark is shorter as it dies away, and shorter again once through.
    const fade = Math.min(1, (far - r) / (30 * u)), grow = Math.min(1, (r - start) / (24 * u) + 0.35)
    const half = (across ? 0.24 : 0.36) * (minded ? 1.25 : 1) * fade * grow * Math.min(1, (150 * u) / r + 0.3)
    if (loved) {
      // A curl: a line that loops as it goes round, like a pen left to enjoy itself.
      const length = 2 * half * r, loops = Math.max(2, Math.round(length / (19 * u))), rho = (across ? 5.5 : 8) * u
      const steps = loops * 10
      for (let k = 0; k <= steps; k++) {
        const t = k / steps, turn = t * loops * TAU
        const along = t * length - Math.sin(turn) * rho * 1.5, out = r + Math.cos(turn) * rho
        const a = heading - half + along / r
        if (k === 0) pen.moveTo(sx + Math.cos(a) * out, sy + Math.sin(a) * out); else pen.lineTo(sx + Math.cos(a) * out, sy + Math.sin(a) * out)
      }
      continue
    }
    const teeth = Math.max(3, Math.round((2 * half * r) / (7 * u)))
    for (let k = 0; k <= teeth; k++) {
      const a = heading - half + (2 * half * k) / teeth
      const jag = (k % 2 ? 1 : -1) * (across ? 2.4 : 4.2) * (minded ? 1.5 : 1) * u * (0.7 + 0.6 * fixed(seed + i, k))
      const px = sx + Math.cos(a) * (r + jag), py = sy + Math.sin(a) * (r + jag)
      if (k === 0) pen.moveTo(px, py); else pen.lineTo(px, py)
    }
  }
  if (loved) {
    // Round blobs afloat among the curls, bobbing outward. They have no stems and no flags: they are not written music.
    const blobs = marks.filled(SPOT, INK, 1.1 * u)
    for (let i = 0; i < 5; i++) {
      const t = (fixed(seed + 90, i) + seconds * 0.19) % 1
      const r = start + t * (far - start), a = heading + (fixed(seed + 91, i) - 0.5) * 0.9
      const size = (3 + fixed(seed + 92, i) * 2.6) * u * Math.min(1, (1 - t) * 4) * Math.min(1, t * 6 + 0.2)
      blobs.oval(sx + Math.cos(a) * r, sy + Math.sin(a) * r + Math.sin(seconds * 2.3 + i * 1.7) * 3 * u, size * 1.3, size, -0.5)
    }
  }
  if (minded) {
    // The wall or floor it came through, scribbled over: this is where the trouble gets in.
    const flick = Math.floor(seconds * 6) % 2, scribble = marks.stroke(INK, 2.1 * u)
    for (let pass = 0; pass < 3; pass++) {
      const reach = (40 - pass * 6) * u, thick = (9 + pass * 2.5) * u, turns = 13 + pass * 2
      for (let k = 0; k <= turns; k++) {
        const t = k / turns - 0.5, side = (k % 2 ? 1 : -1) * thick * (0.6 + 0.5 * fixed(seed + pass * 13 + flick * 5, k))
        const jitter = (fixed(seed + 40 + pass + flick * 3, k) - 0.5) * 5 * u
        const px = sideways ? crossX + 5 * u + side : crossX + t * 2 * reach + jitter
        const py = sideways ? crossY + t * 2 * reach + jitter : crossY + 6 * u + side
        if (k === 0) scribble.moveTo(px, py); else scribble.lineTo(px, py)
      }
    }
  }
}

/**
 * Every air of the scene, a boiler's own warmth, and what the stove and the
 * ice box give off where they stand. On the plain page (`plain`) each is drawn
 * plainly whatever a view would make of it. With `only`, just what touches
 * that room is drawn: the large room is laid over the page and has its airs
 * drawn again inside it. All of it is gathered first and then drawn one pen
 * at a time; the number of pens is what it returns.
 */
export function drawAirs(ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, seconds: number, plain: boolean, only: number | null = null): number {
  const u = page.scale, marks = new Marks()
  /** How the marks a thing makes in its own room are taken: as the air of that kind that starts there is, the one that stays there first. */
  const madeIn = (kind: InkAir['kind'], room: number): InkTaken => {
    const airs = scene.airs.filter((air) => air.kind === kind && air.rooms[0] === room)
    const air = airs.find((one) => one.rooms.length === 1) ?? airs[0]
    return plain ? 'plain' : air?.taken ?? 'plain'
  }
  // A boiler's warmth, from its drum up through the room over it.
  for (const fixture of scene.house.fixtures) {
    if (fixture.kind !== 'boiler' || (only !== null && only !== fixture.col)) continue
    const bay = page.cellarBays[fixture.col], room = page.rooms[fixture.col]
    if (!bay || !room) continue
    const left = room.bedSide === 'right' ? room.rect.x + 14 * u : room.rect.x + room.rect.w - 104 * u
    wavy(penOf(marks, THIN, madeIn('warm', fixture.col), u), left, left + 90 * u, bay.y + 18 * u, room.rect.y + 12 * u, 5, seconds, fixture.col + 1, u)
  }
  // The stove's warmth, rising off it to the ceiling, and the ice box's cold, falling round it: more of each for every step of the dial.
  for (const thing of scene.things) {
    if (thing.carried || thing.at === 'cupboard' || !('room' in thing.at) || (only !== null && only !== thing.at.room)) continue
    const box = thingBox(thing, page, []), room = page.rooms[thing.at.room]
    if (!box || !room) continue
    if (thing.kind === 'stove') {
      wavy(penOf(marks, THIN, madeIn('warm', thing.at.room), u), box.x - 4 * u - thing.dial * 3 * u, box.x + box.w + 4 * u + thing.dial * 3 * u, box.y - 4 * u, room.rect.y + 12 * u, 1 + thing.dial, seconds, 21, u)
    } else if (thing.kind === 'ice') {
      const pen = penOf(marks, THIN, madeIn('cold', thing.at.room), u)
      for (let i = 0; i < 5 * thing.dial; i++) {
        const side = i % 2 ? 1 : -1, px = box.x + box.w / 2 + side * (box.w / 2 + (3 + fixed(75, i) * 20) * u)
        const t = (fixed(76, i) + seconds * (0.16 + fixed(77, i) * 0.1)) % 1
        const y = box.y - 6 * u + t * (box.h + 2 * u)
        pen.moveTo(px, y)
        pen.lineTo(px, Math.min(room.rect.y + room.rect.h - 2 * u, y + (5 + fixed(78, i) * 7) * u))
      }
    }
  }
  for (const air of scene.airs) {
    const last = air.rooms[air.rooms.length - 1] ?? -1, before = air.rooms[air.rooms.length - 2] ?? -1
    const from = page.rooms[before], to = page.rooms[last]
    if (!from || !to || (only !== null && last !== only && before !== only)) continue
    const taken = plain ? 'plain' : air.taken ?? 'plain'
    if (air.kind === 'din') din(marks, scene, page, air, taken, seconds)
    else if (air.kind === 'warm' && to.rect.y < from.rect.y) {
      // On through the ceiling, weaker: fewer lines, and not so far. Over a stove they rise where the stove's own do.
      const stove = placed(scene, page, 'stove', { room: air.rooms[0]! })
      const left = stove ? stove.x - 14 * u : from.bedSide === 'right' ? from.rect.x + 22 * u : from.rect.x + from.rect.w - 96 * u
      wavy(penOf(marks, THIN, taken, u), left, left + 74 * u, from.rect.y + 12 * u, to.rect.y + to.rect.h * (1 - 0.3 * air.level - 0.1), 3, seconds, 9, u)
    } else if (air.kind === 'cold' && to.rect.y > from.rect.y) {
      cold(marks, taken, from.rect.x, from.rect.w, from.rect.y + from.rect.h, to.rect.y, to.rect.h, air.level, seconds, u)
    } else if (air.kind === 'pong') {
      // From over the pot of whoever stews there, or the middle of the room; through the wall, or through a pipe in a floor.
      const maker = spotsOf(scene.guests, page).find(({ guest }) => guest.id === 'cook' && !guest.carried && typeof guest.place === 'object' && guest.place.room === air.rooms[0])
      const first = page.rooms[air.rooms[0]!] ?? from
      const sx = air.rooms.length > 2 || !maker ? from.rect.x + from.rect.w / 2 : maker.spot.x + (maker.spot.flip ? -40 : 40) * u
      // It hangs under the ceiling, over everyone's head, where the wisp off the pot rises to.
      const sy = (air.rooms.length > 2 ? from : first).rect.y + first.rect.h * 0.3
      if (to.rect.y === from.rect.y) {
        const wallX = to.rect.x > from.rect.x ? to.rect.x - 5 * u : from.rect.x - 5 * u, way = to.rect.x > from.rect.x ? 1 : -1
        pong(marks, taken, sx, sy, wallX, sy, wallX + way * (40 + 46 * air.level) * u, sy - 6 * u, seconds, u)
      } else {
        const pipe = placed(scene, page, 'pipe', { a: before, b: last })
        const px = pipe ? pipe.x + pipe.w / 2 : from.rect.x + from.rect.w / 2, up = to.rect.y < from.rect.y ? -1 : 1
        const crossY = up < 0 ? from.rect.y - 6 * u : to.rect.y - 6 * u
        pong(marks, taken, sx, sy, px, crossY, px + 14 * u, crossY + up * (36 + 40 * air.level) * u, seconds, u)
      }
    }
  }
  edgeMarks(marks, scene, page, seconds, only)
  // The cook's pot, which only stews by day: at night, one thin wisp.
  for (const { guest, spot: where } of spotsOf(scene.guests, page)) {
    if (guest.id !== 'cook' || guest.wrapped || guest.carried || guest.place === 'lobby' || guest.place === 'bench' || (only !== null && guest.place.room !== only)) continue
    const x = where.x + (where.flip ? -40 : 40) * u, y = where.y - 62 * u
    const wisp = marks.stroke(INK, (guest.awake ? MID : THIN) * u), rise = guest.awake ? 86 : 58
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, px = x + Math.sin(t * 5 - seconds * 1.1) * (2 + t * 7) * u, py = y - t * rise * u
      if (i === 0) wisp.moveTo(px, py); else wisp.lineTo(px, py)
    }
  }
  return marks.flush(ctx)
}

/**
 * What a quilt and a pipe do to the airs at the wall or floor they are on.
 * Against a hung quilt, whatever is in the room on either side bunches up in
 * short pressed strokes: it gets no further. At a pipe, what passes between
 * its two rooms is drawn in to one flange and fans out of the other.
 */
function edgeMarks(marks: Marks, scene: InkScene, page: PageLayout, seconds: number, only: number | null): void {
  const u = page.scale, pen = marks.stroke(INK, THIN * u)
  for (const thing of scene.things) {
    if (thing.carried || thing.at === 'cupboard' || !('edge' in thing.at) || (thing.kind !== 'quilt' && thing.kind !== 'pipe')) continue
    const id = thing.at.edge
    const edge = page.edges.find((one) => one.id === id), box = thingBox(thing, page, [])
    if (!edge || !box || (only !== null && edge.a !== only && edge.b !== only)) continue
    const wall = edge.kind === 'wall'
    // The room a is to the left of a wall and under a floor: so side -1 of the box is a's for a wall, and b's for a floor.
    for (const side of [-1, 1]) {
      const room = wall ? (side < 0 ? edge.a : edge.b) : side < 0 ? edge.b : edge.a
      if (thing.kind === 'quilt') {
        if (!scene.airs.some((air) => air.rooms.includes(room))) continue
        // Pressed against the padding: little bows, each flattened where it meets the quilt, and shivering a little.
        for (let i = 0; i < 4; i++) {
          const t = (i + 0.5) / 4, shake = Math.sin(seconds * 9 + i * 2.1 + side) * 0.8 * u
          for (let k = 0; k < 3; k++) {
            const off = (6 + k * 5.5) * u + shake, half = (9 - k * 2) * u
            if (wall) {
              const x = (side < 0 ? box.x : box.x + box.w) + side * off, y = box.y + box.h * t
              pen.moveTo(x, y - half)
              pen.quadraticCurveTo(x + side * 5 * u, y, x, y + half)
            } else {
              const y = (side < 0 ? box.y : box.y + box.h) + side * off, x = box.x + box.w * t
              pen.moveTo(x - half, y)
              pen.quadraticCurveTo(x, y + side * 5 * u, x + half, y)
            }
          }
        }
      } else {
        const passes = scene.airs.some((air) => air.rooms.some((one, index) => (one === edge.a && air.rooms[index + 1] === edge.b) || (one === edge.b && air.rooms[index + 1] === edge.a)))
        if (!passes) continue
        // Three strokes that close on the pipe's mouth on one side, and open from it on the other.
        const mx = wall ? (side < 0 ? box.x : box.x + box.w) : box.x + box.w / 2, my = wall ? box.y + box.h / 2 : side < 0 ? box.y : box.y + box.h
        const breathe = (seconds * 1.4 + (side < 0 ? 0 : 0.5)) % 1
        for (const fan of [-0.5, 0, 0.5]) {
          const near = (4 + breathe * 6) * u, far = (16 + breathe * 10) * u
          if (wall) { pen.moveTo(mx + side * near, my + fan * near); pen.lineTo(mx + side * far, my + fan * far * 1.5) }
          else { pen.moveTo(mx + fan * near, my + side * near); pen.lineTo(mx + fan * far * 1.5, my + side * far) }
        }
      }
    }
  }
}

/** The rooms that are warm: over a boiler, with a stove in them, or on the way of a warmth. */
function warmRooms(scene: InkScene): Set<number> {
  const { cols } = SHAPES[scene.house.shape]
  const warm = new Set<number>()
  for (const fixture of scene.house.fixtures) if (fixture.kind === 'boiler') warm.add(fixture.col % cols)
  for (const air of scene.airs) if (air.kind === 'warm') for (const room of air.rooms) warm.add(room)
  for (const thing of scene.things) if (thing.kind === 'stove' && typeof thing.at === 'object' && 'room' in thing.at) warm.add(thing.at.room)
  return warm
}

/** The cook's hand: steam, in loose curls, rising off every room that is warm and off its own pot. */
export function steam(ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, seconds: number): number {
  const u = page.scale, warm = warmRooms(scene)
  for (const guest of scene.guests) if (guest.id === 'cook' && typeof guest.place === 'object') warm.add(guest.place.room)
  if (warm.size === 0) return 0
  ctx.beginPath()
  for (const index of warm) {
    const room = page.rooms[index]
    if (!room) continue
    for (let i = 0; i < 5; i++) {
      const x = room.rect.x + (0.1 + 0.8 * fixed(index + 60, i)) * room.rect.w
      const t = (fixed(index + 61, i) + seconds * (0.07 + fixed(62, i) * 0.04)) % 1
      const foot = room.rect.y + room.rect.h * (0.95 - 0.55 * t), tall = (26 + 30 * t) * u
      curl(ctx, x, foot, x + (fixed(63, i) - 0.5) * 16 * u, foot - tall, (3 + 4 * t) * u, 2, seconds * 1.3 + i)
    }
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.1 * u
  ctx.stroke()
  return 1
}

/** The lizard's hand: thin cracks of frost creeping in from the corners of its room, shivering. */
export function frost(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seconds: number, u: number): number {
  const flick = Math.floor(seconds * 9) % 3
  ctx.beginPath()
  for (let corner = 0; corner < 4; corner++) {
    const cx = corner % 2 ? x + w : x, cy = corner < 2 ? y : y + h, dx = corner % 2 ? -1 : 1, dy = corner < 2 ? 1 : -1
    for (let i = 0; i < 5; i++) {
      let px = cx, py = cy
      const heading = (0.12 + 0.19 * i) * Math.PI
      ctx.moveTo(px, py)
      for (let k = 0; k < 5; k++) {
        const a = heading + (fixed(corner * 9 + i + flick * 31, k) - 0.5) * 0.9, step = (9 + fixed(corner + 40, i * 5 + k) * 12) * u
        px += Math.cos(a) * step * dx
        py += Math.sin(a) * step * dy
        ctx.lineTo(px, py)
        // A side twig off every other joint, as a crack in ice has.
        if (k % 2) { ctx.lineTo(px + Math.cos(a + 1) * 6 * u * dx, py + Math.sin(a + 1) * 6 * u * dy); ctx.moveTo(px, py) }
      }
    }
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.9 * u
  ctx.stroke()
  return 1
}

/** The yeti's hand: ink running down from the ceiling of every room that is warm, each run ending in a bead. */
export function drips(ctx: CanvasRenderingContext2D, scene: InkScene, page: PageLayout, seconds: number): number {
  const u = page.scale, warm = warmRooms(scene)
  if (warm.size === 0) return 0
  ctx.beginPath()
  for (const index of warm) {
    const room = page.rooms[index]
    if (!room) continue
    for (let i = 0; i < 9; i++) {
      const x = room.rect.x + (0.06 + 0.88 * fixed(index + 80, i)) * room.rect.w
      const t = (fixed(index + 81, i) + seconds * (0.05 + fixed(82, i) * 0.05)) % 1
      const length = (10 + t * 60 * (0.5 + fixed(83, i))) * u
      ctx.moveTo(x, room.rect.y)
      ctx.lineTo(x + Math.sin(length * 0.05) * u, room.rect.y + length)
      ctx.moveTo(x + 2.4 * u, room.rect.y + length + 1.5 * u)
      ctx.arc(x, room.rect.y + length + 1.5 * u, 2.4 * u, 0, TAU)
    }
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5 * u
  ctx.stroke()
  return 1
}
