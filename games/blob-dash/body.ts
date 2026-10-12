import { TWIN_LAG } from './beat'
import type { Point } from './input'
import { BEATS, PLACES } from './beat'
import { BEAT_LENGTH, BLOB, PIECE, PIPE, RING, SPRING, WALL, angleAt, slotOf, uprightOn } from './layout'
import type { Fx, Ghost, Runner, Toy } from './toy'

// Where a blob is drawn, from the loop's numbers: its middle, its turn, its
// squash and which face it wears. Pure, so the view, the trail and the
// overlap tests all place it the same way.

export type Face = 'run' | 'crouch' | 'air' | 'flat'

export type Body = {
  x: number
  y: number
  /** Radians, for a sprite drawn feet down. */
  turn: number
  /** Its width and height as shares of the blob's size. */
  wide: number
  tall: number
  face: Face
  /** On the ceiling it is drawn mirrored, so its face still looks the way it runs. */
  mirror: boolean
  /** In a pipe: a lump between the pipe's walls. */
  lump: boolean
}

const HALF = BLOB.size / 2
/** Flat against a wall: thin along the way it was running, and spread up the wall's face. */
export const FLAT = { wide: 0.4, tall: 1.45 } as const
/** Draped over a wall's top edge like a towel. */
export const DRAPED = { wide: 1.35, tall: 0.45 } as const
/** How squashed a blob on the line is before it wears its flat face: more than any landing from a jump squashes it. */
export const FLAT_FACE = 0.38
/** In a pipe. */
export const LUMP = { wide: 1.3, tall: (PIPE.roof - 8) / BLOB.size } as const

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const smooth = (t: number): number => {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
/** Up to 1 over `rise` and back down over `fall`. */
const bump = (age: number, rise: number, fall: number): number => (age < 0 || age >= rise + fall ? 0 : age < rise ? smooth(age / rise) : 1 - smooth((age - rise) / fall))

/** A point by a place of the course: `along` stage units the way the blob runs, and `lift` off the surface. */
export function by(beats: number, along: number, lift: number, ceiling: boolean): Point {
  const a = angleAt(beats), r = ceiling ? RING.hub + lift : RING.floor - lift
  return { x: RING.x + r * Math.cos(a) + along * Math.sin(a), y: RING.y + r * Math.sin(a) - along * Math.cos(a) }
}

/** How far off the surface the underside of a round body is, `x` stage units to the side of its middle, when its feet are `lift` off it. */
function underside(x: number, lift: number, half: number): number {
  return Math.abs(x) >= half ? Infinity : lift + half * (1 - Math.sqrt(1 - (x / half) ** 2))
}

/**
 * How far a blob at a position has to be off its surface to roll over what stands there and is not gone into: a
 * pad, a step and a blade are things it steps on, and a wall it has peeled off is a thing it comes down the far
 * side of, and one it is peeling off is a thing it goes over the top of. A scoop and a mouth are things it goes into, and are left out. A piece on a spring stands on the pressed
 * coil. The floor curves up towards a thing ahead, so a thing there stands a little higher than its own height.
 */
export function riseAt(toy: Toy, at: number, ceiling: boolean, wide = 1, tall = 1, flying = false, peeling = false): number {
  const length = ceiling ? BEAT_LENGTH.ceiling : BEAT_LENGTH.floor, a = HALF * wide, b = HALF * tall
  let rise = 0
  const over = (middle: number, halfWidth: number, top: number) => {
    // Inside the ring a thing ahead leans towards the blob, by its height: its top corner is nearer than its foot.
    const lean = ceiling ? 0 : (top * Math.abs(middle)) / RING.floor
    const x = Math.max(0, Math.abs(middle) - halfWidth - lean)
    if (x >= a) return
    // The floor curves up towards a thing ahead. The rim curves away from it, and a blob that leans over a thing
    // there dips its far side: a unit more keeps it off.
    const curve = ceiling ? 1 : middle ** 2 / (2 * RING.floor)
    rise = Math.max(rise, top + curve - b * (1 - Math.sqrt(1 - (x / a) ** 2)))
  }
  for (let beat = Math.floor(at) - 1; beat <= Math.floor(at) + 2; beat++) {
    const kind = toy.pieceIn(slotOf(beat, ceiling)), away = (beat - at) * length
    if (kind === 'wall') {
      // Only once its beat is behind: in front of it a blob is stopped, not lifted. One that is peeling off it goes
      // over its top, and so does one that came down past its beat, or under which the child set it.
      // A stub stands ahead of its beat along the beat's own level, and the rim of the niche curves away under it:
      // seen from the rim, its top is that much higher.
      if (peeling || away < 0) over(away + WALL.ahead, WALL.thick / 2, WALL.height + (ceiling ? WALL.ahead ** 2 / (2 * RING.hub) : 0))
      continue
    }
    // In the air it is going into nothing: it clears a scoop and a mouth like any other low piece.
    if (kind === undefined || (!flying && (kind === 'flip' || kind === 'tunnel'))) continue
    const place = (((beat % BEATS) + BEATS) % BEATS) * 2 + (ceiling ? PLACES : 0)
    over(away, PIECE.width / 2, PIECE.height + (toy.holds(place) ? SPRING.pressed : 0))
  }
  return rise
}

/**
 * How tall a spring stands at a place (0 to 63): its whole height, or as much as there is room for under a piece on
 * its beat or a blob that is over it. A blob coming over a spring presses it, which is what fires it.
 */
export function springHeight(toy: Toy, sp: number): number {
  const ceiling = sp >= PLACES, at = (sp % PLACES) / 2
  if (Number.isInteger(at) && toy.pieceIn(slotOf(at, ceiling)) !== undefined) return SPRING.pressed
  const length = ceiling ? BEAT_LENGTH.ceiling : BEAT_LENGTH.floor
  let room: number = SPRING.height
  for (const r of toy.runners) {
    if (r.ceiling !== ceiling || r.flight || r.stuck) continue
    const own = toy.shown(r)
    // The nearest way round the lap from the runner to the spring.
    const apart = ((((at - own) % BEATS) + BEATS + BEATS / 2) % BEATS) - BEATS / 2
    const x = Math.abs(apart) * length - SPRING.width / 2
    const lift = r.hushed ? 4 : toy.liftOf(r, BLOB.jump) + (r.air ? 0 : riseAt(toy, own, ceiling))
    room = Math.min(room, underside(Math.max(0, x), lift, HALF))
  }
  return Math.max(SPRING.pressed, room)
}

/**
 * Where a ghost of the blob is drawn: where the blob was when it left it, on top of whatever it was rolling over
 * or flying over there, so the trail is the path it took and never prints through a piece.
 */
export function ghostAt(toy: Toy, ghost: Ghost): Point {
  const rise = riseAt(toy, ghost.beats, ghost.ceiling, 1, 1, ghost.lift > 0)
  return by(ghost.beats, 0, HALF + Math.max(ghost.lift * BLOB.jump, rise), ghost.ceiling)
}

/** Where a runner is drawn now. */
export function bodyOf(toy: Toy, r: Runner): Body {
  const at = toy.shown(r), up = r.ceiling, lean = up ? -1 : 1
  const body: Body = { x: 0, y: 0, turn: uprightOn(at, up), wide: 1, tall: 1, face: 'run', mirror: up, lump: false }
  const place = (beats: number, along: number, lift: number, ceiling = up) => {
    const p = by(beats, along, lift, ceiling)
    body.x = p.x
    body.y = p.y
  }
  const lumpLift = (PIPE.roof - 8) / 2 + 4

  if (r.flight) {
    // Thrown by a flip: across to the other surface, turning over on the way. It goes from where it stood on its own
    // surface to where it will stand on the other one, which is on top of whatever stands there: its flight ends on
    // a pad, a step or a blade, not in it, and the first frame on the far side is the last frame of the flight.
    const flight = r.flight, how = flight.how, u = clamp01((at - flight.from) / (flight.to - flight.from))
    const e = how === 'scoop' ? smooth(u) : how === 'drop' ? u * u : how === 'hard' ? 1 - (1 - u) ** 2 : u
    body.mirror = e > 0.5 ? !up : up
    // A lump changing sides inside its pipe: straight across, between the pipe's walls.
    const a = angleAt(at), radius = lerp(up ? RING.hub + lumpLift : RING.floor - lumpLift, up ? RING.floor - lumpLift : RING.hub + lumpLift, u)
    const lump = { x: RING.x + radius * Math.cos(a), y: RING.y + radius * Math.sin(a) }
    if (how === 'pipe') {
      body.x = lump.x
      body.y = lump.y
      body.face = 'flat'
      body.lump = true
      body.wide = LUMP.wide
      body.tall = LUMP.tall
      body.turn += Math.PI * smooth(u)
      return body
    }
    body.face = 'air'
    // A drop comes down feet first: it is round the right way long before it lands.
    // One spat out of its pipe on the way across goes on turning as the lump did.
    body.turn += how === 'spat' ? Math.PI * smooth(u) + lean * toy.kicked(r) : lean * (Math.PI * (how === 'drop' ? smooth(u / 0.35) : e) + toy.kicked(r))
    let along = 0, land: number
    if (Number.isInteger(flight.to) && toy.pieceIn(slotOf(flight.to, !up)) === 'wall') {
      if (up && !toy.split) {
        // A lone blob that drops onto a wall of the floor comes down on its top edge and folds over it.
        const fold = smooth((u - 0.8) / 0.2)
        along = WALL.ahead * smooth(u)
        body.wide = lerp(1, DRAPED.wide, fold)
        body.tall = lerp(1, DRAPED.tall, fold)
        land = WALL.height + HALF * body.tall
      } else {
        // On the ceiling, and as twins, it comes down in front of the wall and slaps it: it winces on the way to
        // the width that fits there. The twin that comes second does too, and is pressed onto the first one's back.
        body.wide = lerp(1, (WALL.ahead - WALL.thick / 2) / HALF, smooth((u - 0.6) / 0.4))
        land = HALF * body.tall + riseAt(toy, at, !up, body.wide, body.tall)
      }
    } else land = HALF * body.tall + riseAt(toy, at, !up, body.wide, body.tall)
    const from = by(at, 0, HALF, up), to = by(at, along, land, !up)
    body.x = lerp(from.x, to.x, e)
    body.y = lerp(from.y, to.y, e)
    if (how === 'spat') {
      // Spat out between the two surfaces, when a mouth of its pipe was lifted: from the lump it was, where it was,
      // to a blob in the air, which lands as a thrown one.
      const out = 1 - smooth(r.spat / 0.16)
      body.x = lerp(body.x, lump.x, out)
      body.y = lerp(body.y, lump.y, out)
      body.wide = lerp(body.wide, LUMP.wide, out)
      body.tall = lerp(body.tall, LUMP.tall, out)
    }
    return body
  }

  if (r.stuck) {
    const s = r.stuck, e = clamp01(at - s.beat)
    const flatAlong = WALL.ahead - WALL.thick / 2 - (BLOB.size * FLAT.wide) / 2 - (s.second ? BLOB.size * FLAT.wide : 0)
    const flatLift = (BLOB.size * FLAT.tall) / 2
    let along = flatAlong, lift = flatLift, wide: number = FLAT.wide, tall: number = FLAT.tall
    if (s.how === 'towel') {
      along = WALL.ahead
      lift = WALL.height + (BLOB.size * DRAPED.tall) / 2
      wide = DRAPED.wide
      tall = DRAPED.tall
    } else if (s.how === 'splat') {
      // It hit in the air and slides down the wall's face.
      lift += s.lift * BLOB.jump * (1 - smooth(e / 0.45))
    } else {
      // It got here winced to the width that fits in front of the wall, and from there it spreads up the wall's face.
      const k = smooth(e / 0.06), winced = (WALL.ahead - WALL.thick / 2) / HALF
      along = lerp(0, flatAlong, k)
      wide = lerp(winced, FLAT.wide, k)
      tall = lerp(1, FLAT.tall, k)
      lift = HALF * tall
    }
    body.face = 'flat'
    body.turn = uprightOn(s.beat, up)
    if (e < 0.5) {
      place(s.beat, along, lift)
      body.wide = wide
      body.tall = tall
      return body
    }
    // It peels off over the top and is back on the line by the next beat.
    const q = smooth((e - 0.5) / 0.5), stuck = by(s.beat, along, lift, up), free = by(at, 0, HALF + riseAt(toy, at, up, 1, 1, false, true), up), over = by(s.beat, 0, Math.sin(Math.PI * q) * (WALL.height + 2), up), foot = by(s.beat, 0, 0, up)
    body.x = lerp(stuck.x, free.x, q) + (over.x - foot.x)
    body.y = lerp(stuck.y, free.y, q) + (over.y - foot.y)
    body.wide = lerp(wide, 1, q)
    body.tall = lerp(tall, 1, q)
    body.turn = lerp(uprightOn(s.beat, up), uprightOn(at, up), q) + lean * 0.5 * Math.sin(Math.PI * q)
    return body
  }

  if (r.hushed) {
    const k = smooth(r.dive / 0.12)
    body.lump = true
    body.face = 'flat'
    // One again after being two, the lump is fatter for a beat, along the pipe: it is no taller than the pipe.
    body.wide = lerp(1, LUMP.wide, k) * (1 + 0.32 * (1 - clamp01((r.fat * toy.tempo) / 60)))
    body.tall = lerp(1, LUMP.tall, k)
    place(at, 0, lerp(HALF, lumpLift, k) + 6 * bump(r.bump, 0.05, 0.25))
    return body
  }

  if (r.air) {
    const air = r.air, u = clamp01((toy.at(r) - air.start) / (air.to - air.start))
    let along = 0, lift = HALF + Math.max(toy.liftOf(r, BLOB.jump), riseAt(toy, at, up, 1, 1, true))
    if (toy.pieceIn(slotOf(Math.round(air.to), up)) === 'wall') {
      if (!up && !toy.split) {
        // A lone blob that comes down on a wall of the floor comes down on its top edge.
        along = WALL.ahead * smooth(u)
        lift += (WALL.height + (BLOB.size * DRAPED.tall) / 2 - HALF) * u
        const fold = smooth((u - 0.8) / 0.2)
        body.wide = lerp(1, DRAPED.wide, fold)
        body.tall = lerp(1, DRAPED.tall, fold)
      } else {
        // On the ceiling, and as twins, it comes down in front of the wall and slaps it: it winces on the way down
        // to the width that fits there, the twin that comes second too.
        body.wide = lerp(1, (WALL.ahead - WALL.thick / 2) / HALF, smooth((u - 0.6) / 0.4))
      }
    }
    body.face = 'air'
    body.turn += lean * toy.turnOf(r)
    // It stretches off the line: the squash the launch gave it is drawn in the air too, further for an accent, and
    // is spent by the top of the jump. Stretched and turning, it is lifted by whatever it reaches down by.
    const stretch = Math.max(-0.3, Math.min(0.5, r.squash.value))
    if (stretch !== 0) {
      body.tall *= 1 + stretch
      body.wide *= 1 - 0.45 * stretch
      const turned = toy.turnOf(r), down = Math.hypot(HALF * body.wide * Math.sin(turned), HALF * body.tall * Math.cos(turned))
      lift += Math.max(0, down - HALF)
    }
    place(at, along, lift)
    return body
  }

  const squash = Math.max(-0.5, Math.min(0.5, r.squash.value))
  body.tall = 1 + squash
  body.wide = 1 - 0.55 * squash
  // Flat from the harder throw of a flip, it wears the face of a thing that has hit something.
  if (squash < -FLAT_FACE) body.face = 'flat'
  // One again after being two, it is fatter for a beat, and rolls over things as the fatter thing it is.
  const fat = 1 - clamp01((r.fat * toy.tempo) / 60)
  if (fat > 0) body.wide *= 1 + 0.32 * fat
  let lift = HALF * body.tall + riseAt(toy, at, up, body.wide, body.tall)
  if (r.perch > at) lift += PIECE.height
  // A wall ahead: it sees it coming and winces, so its front is at the wall's face when it gets to the beat.
  const next = Math.floor(at) + 1
  if (toy.pieceIn(slotOf(next, up)) === 'wall') {
    const room = (next - at) * (up ? BEAT_LENGTH.ceiling : BEAT_LENGTH.floor) + WALL.ahead - WALL.thick / 2
    if (room < HALF * body.wide) {
      body.wide = Math.max(FLAT.wide, room / HALF)
      body.face = 'flat'
    }
  }
  // Just out of a mouth it is still the shape of the pipe, and as that shape it is on top of whatever stands where
  // it came out, from the frame it is out.
  const out = 1 - smooth(r.spat / 0.16)
  if (out > 0) {
    body.wide = lerp(body.wide, LUMP.wide, out)
    body.tall = lerp(body.tall, LUMP.tall, out)
    lift = HALF * body.tall + riseAt(toy, at, up, body.wide, body.tall)
  }
  // A chime step trips it: a stumble up and forward.
  const trip = bump(r.trip, 0.05, 0.16)
  lift += 12 * trip
  body.turn += lean * 0.3 * trip
  if (r.twin && r.born && r.lag < TWIN_LAG) {
    // A new twin stands where it was made until it is a third of a beat behind.
    const k = clamp01(r.lag / TWIN_LAG)
    if (r.born === 'peel') body.wide *= 0.35 + 0.65 * k
    if (r.born === 'string') lift += 18 * (1 - k)
  }
  if (r.twin && r.born === 'egg') {
    // Out of a burst it is on its head, and rights itself as it starts to run.
    const righted = smooth((toy.pos - r.bornAt) / 0.9)
    // It stands on the blade it burst on, like anything else that is on the line there.
    body.turn += lean * Math.PI * (1 - righted)
  }
  if (!r.twin && toy.held !== null) body.face = 'crouch'
  place(at, 0, lift)
  return body
}

/**
 * A twin on its way into the blob, when a splitter zips two into one: from where and as it was drawn when they met,
 * to the blob, smaller as it goes. In a pipe it is a lump the size of its lump or smaller, between the pipe's walls.
 */
export function zipOf(fx: Fx, blob: Body): Body {
  const t = clamp01(fx.age / fx.life), e = t * t * (3 - 2 * t)
  return { x: lerp(fx.x, blob.x, e), y: lerp(fx.y, blob.y, e), turn: blob.turn, wide: (fx.wide ?? 1) * (1 - 0.7 * e), tall: (fx.tall ?? 1) * (1 - 0.5 * e), face: 'flat', mirror: blob.mirror, lump: fx.lump === true }
}

/** Points round a body as drawn: a round thing, as wide and as tall as it is squashed. For the overlap tests. */
export function outlineOf(body: Body, points = 24): Point[] {
  const w = (BLOB.size * body.wide) / 2, h = (BLOB.size * body.tall) / 2, cos = Math.cos(body.turn), sin = Math.sin(body.turn)
  return Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2, x = w * Math.cos(a), y = h * Math.sin(a)
    return { x: body.x + x * cos - y * sin, y: body.y + x * sin + y * cos }
  })
}

/** The four corners of a body as drawn, for the overlap tests. */
export function cornersOf(body: Body): Point[] {
  const w = (BLOB.size * body.wide) / 2, h = (BLOB.size * body.tall) / 2, cos = Math.cos(body.turn), sin = Math.sin(body.turn)
  return [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => ({ x: body.x + x * cos - y * sin, y: body.y + x * sin + y * cos }))
}
