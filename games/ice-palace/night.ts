import { BEARS_FROM, ON_BANK_Y, bears, widthOf, type Kind, type Rest } from './blocks'
import { BLOCK_H, BUILD, GROUND_Y } from './ground'

// The night, worked out from what stands on the bank and from nothing else:
// where the hollows are and so where the lamps hang, what each lamp's light
// crosses and so what lies lit on the snow in front, and where King Winter
// can sit. No chance and no clock: the same palace gives the same night every
// time, so none of it is saved (ART.md, "Every field of the saved state").

/** A free place right under a block: where a lamp hangs. `x`, `y` is the middle of the place. */
export type Hollow = { x: number; y: number; w: number }
/** A lamp: in a hollow, or stood on the bank beside the wall when the wall has no hollow for it. */
export type Lamp = { x: number; y: number; hung: boolean }
/** How the light that crossed a thing lies on the snow: whole, broken into specks, red, or as a fan of rays. */
export type Tone = 'sharp' | 'soft' | 'red' | 'fan'
/**
 * How a thing of the wall is laid on the ground in front of it: a point `lx`, `ly` from the thing's middle lies
 * at `e + a * lx + c * ly`, `f + d * ly`. The wall lies there as it stands, row by row outward, each row a
 * little shorter than a block is high and spread a little away from its lamp.
 */
export type Cast = { a: number; c: number; d: number; e: number; f: number }
/**
 * One shape on the ground in front: the thing it belongs to (its index in the list), how its outline is laid
 * there (leaning away from its lamp, as light that left the lamp does), and the box that holds it. A lit patch has a tone; `dark` is the unlit shape of a thing that stops the
 * light, snow or a snowball, which is seen by the rim of light on its two far sides.
 */
export type Patch = { of: number; tone: Tone | 'dark'; kind: Kind; len: number; cast: Cast; x0: number; x1: number; y0: number; y1: number }

/** Where the first row's light begins, just below the bank's face, and how far each row lies beyond the last. */
export const LIGHT_Y = GROUND_Y + 28
export const LIGHT_ROW = 38
/** How much of a row a block's light takes: the rest is the dark between two rows, which keeps each shape its own. */
const LIGHT_FILL = 0.88
/**
 * The rim of light by which the unlit shape of a thing that stops the light is seen. It is the thing's outline
 * grown by `RIM_GROW` and pushed `RIM_PUSH` away from its lamp and away from the wall, in the thing's own
 * measures. The push is the larger of the two, so the unlit shape breaks the rim on its two near sides: the rim
 * is an arc round the far side of a snowball and two sides of a snow block, never a closed ring or frame.
 */
export const RIM_GROW = 5
export const RIM_PUSH = 6
/** How far the rim reaches on the far sides. */
export const RIM = RIM_GROW + RIM_PUSH
/** Which way a thing's rim of light is pushed, in the thing's own measures: away from its lamp, and outward from the wall. */
export const rimPush = (cast: Cast): { x: number; y: number } => ({ x: Math.sign(cast.c || 1) * RIM_PUSH, y: RIM_PUSH })

/** Which row of the wall a thing stands in: 0 on the bank. */
export const rowOf = (thing: { y: number }): number => Math.max(0, Math.round((ON_BANK_Y - thing.y) / BLOCK_H))

/** How a thing lit, or left unlit, by `lamp` is laid on the ground in front of the wall. */
export function castOf(thing: Rest, lamp: { x: number }): Cast {
  const row = rowOf(thing), high = LIGHT_ROW * LIGHT_FILL
  const y0 = LIGHT_Y + row * LIGHT_ROW
  // Further out, the light has spread further from its lamp.
  const spread = (y: number): number => 1.05 + ((y - LIGHT_Y) / LIGHT_ROW) * 0.09
  const mid = spread(y0 + high / 2), dx = thing.x - lamp.x
  return { a: mid, c: (dx * (spread(y0 + high) - spread(y0))) / BLOCK_H, d: high / BLOCK_H, e: lamp.x + dx * mid, f: y0 + high / 2 }
}
/** Where a point of a thing lies on the ground. */
export const castPoint = (cast: Cast, lx: number, ly: number): { x: number; y: number } => ({ x: cast.e + cast.a * lx + cast.c * ly, y: cast.f + cast.d * ly })

/** A hollow narrower than this takes no lamp. */
export const HOLLOW_MIN = 40
/** The frost children hang at most this many lamps, and always bring two. */
export const MOST_LAMPS = 6
/** How far a lamp's light carries, from the lamp to the middle of a thing. */
export const REACH = 190
/** The two places on the bank beside the wall where a lamp with no hollow is stood: outside the stretch a palace is built on. */
export const BESIDE: readonly { x: number; y: number }[] = [{ x: BUILD.x0 - 20, y: ON_BANK_Y }, { x: BUILD.x1 + 20, y: ON_BANK_Y }]

const inWall = (thing: Rest): boolean => thing.place === 'built' || thing.place === 'hung'

/** Every hollow of the wall, from left to right and then from the top down. */
export function hollows(things: readonly Rest[]): Hollow[] {
  const wall = things.filter(inWall)
  const found: Hollow[] = []
  for (const over of wall) {
    if (!bears(over.kind) || over.place !== 'built') continue
    const y = over.y + BLOCK_H
    if (y > ON_BANK_Y + 0.5) continue
    // The stretch under the block, less whatever stands or hangs in that row.
    let free: [number, number][] = [[over.x - widthOf(over) / 2, over.x + widthOf(over) / 2]]
    for (const b of wall) {
      if (Math.abs(b.y - y) > 0.5) continue
      const b0 = b.x - widthOf(b) / 2, b1 = b.x + widthOf(b) / 2
      free = free.flatMap(([a0, a1]): [number, number][] => (b1 <= a0 || b0 >= a1 ? [[a0, a1]] : [[a0, Math.min(a1, b0)], [Math.max(a0, b1), a1]]))
    }
    for (const [a0, a1] of free) if (a1 - a0 >= HOLLOW_MIN) found.push({ x: (a0 + a1) / 2, y, w: a1 - a0 })
  }
  return found.sort((a, b) => a.x - b.x || a.y - b.y)
}

/** Where the lamps are: one in each hollow, from left to right, and the frost children's own two stood beside the wall when it has fewer hollows than that. */
export function lampsOf(things: readonly Rest[]): Lamp[] {
  const lamps: Lamp[] = hollows(things).slice(0, MOST_LAMPS).map((hollow) => ({ x: hollow.x, y: hollow.y, hung: true }))
  for (let spare = 0; lamps.length < 2; spare++) lamps.push({ ...BESIDE[spare], hung: false })
  return lamps
}

/** What a lamp's light does at a thing: it goes through ice, and a snow block or a snowball stops it. */
function stops(kind: Kind): boolean {
  return kind === 'snow' || kind === 'ball'
}

/** The things, other than `to`, that a straight line from the lamp to the middle of `to` crosses. */
function crossed(lamp: Lamp, to: Rest, wall: readonly Rest[]): Rest[] {
  const away = Math.hypot(to.x - lamp.x, to.y - lamp.y), steps = Math.max(1, Math.ceil(away / 6))
  const hit = new Set<Rest>()
  for (let i = 1; i < steps; i++) {
    const x = lamp.x + ((to.x - lamp.x) * i) / steps, y = lamp.y + ((to.y - lamp.y) * i) / steps
    for (const b of wall) if (b !== to && Math.abs(x - b.x) <= widthOf(b) / 2 && Math.abs(y - b.y) <= BLOCK_H / 2) hit.add(b)
  }
  return [...hit]
}

export type Night = {
  lamps: Lamp[]
  patches: Patch[]
  /** The things that stop a lamp's light and leave their own shape unlit, by index. */
  stopped: number[]
  /** The things the light comes through, by index: every patch's thing. */
  lit: number[]
  /** A lamp has snow in its light and lights no ice at all: it is shut in. The snow that shuts the first such lamp in, by index, or -1. */
  shutIn: number
  /** Every lamp that is shut in, where it is, and the snow that shuts it in, by index. */
  shut: { x: number; y: number; snow: number }[]
  /** The lowest clear block with a lamp's light coming straight through it, and of two equally low the one further left: by index, or -1. */
  clearLit: number
}

/**
 * The whole night of a clearing. Light leaves each lamp in straight lines. A thing within reach is lit when the
 * line to its middle crosses no snow; what the line crossed on the way colours it: red after the berry block,
 * broken into specks after cloudy ice. Each lit thing's own outline lies on the ground in front, a row further
 * out for each row the thing stands higher, and spread a little away from the lamp; a thing that stops the
 * light leaves its own outline unlit there. `most` is how many of the lamps are lit yet.
 */
export function nightOf(things: readonly Rest[], most = MOST_LAMPS): Night {
  const lamps = lampsOf(things).slice(0, most)
  const wall = things.filter(inWall)
  const best = new Map<number, { lamp: Lamp; away: number; tone: Tone }>()
  const stopped = new Map<number, Lamp>()
  let shutIn = -1
  const shut: Night['shut'] = []
  for (const lamp of lamps) {
    let ice = 0, snow = -1
    things.forEach((thing, index) => {
      if (!inWall(thing)) return
      const away = Math.hypot(thing.x - lamp.x, thing.y - lamp.y)
      if (away > REACH) return
      const through = crossed(lamp, thing, wall)
      if (through.some((b) => stops(b.kind))) return
      if (stops(thing.kind)) {
        if (!stopped.has(index)) stopped.set(index, lamp)
        if (snow < 0) snow = index
        return
      }
      ice++
      const kinds = [thing.kind, ...through.map((b) => b.kind)]
      const tone: Tone = kinds.includes('berry') ? 'red' : thing.kind === 'icicle' ? 'fan' : kinds.includes('cloudy') ? 'soft' : 'sharp'
      const had = best.get(index)
      if (!had || away < had.away) best.set(index, { lamp, away, tone })
    })
    if (ice === 0 && snow >= 0) {
      shut.push({ x: lamp.x, y: lamp.y, snow })
      if (shutIn < 0) shutIn = snow
    }
  }
  const patches: Patch[] = []
  const patch = (index: number, tone: Tone | 'dark', lamp: Lamp): void => {
    const thing = things[index], w = widthOf(thing) / 2
    // A snowball is as round and as small as it is drawn, and sits on what bears it: its unlit spot is that ball.
    const up = thing.kind === 'ball' ? thing.len - BLOCK_H / 2 : BLOCK_H / 2, down = BLOCK_H / 2
    const cast = castOf(thing, lamp)
    const box = (grow: number, dx: number, dy: number): { x: number; y: number }[] => [castPoint(cast, -w - grow + dx, -up - grow + dy), castPoint(cast, w + grow + dx, -up - grow + dy), castPoint(cast, w + grow + dx, down + grow + dy), castPoint(cast, -w - grow + dx, down + grow + dy)]
    // An unlit shape's box holds its rim of light as well.
    const push = rimPush(cast), corners = tone === 'dark' ? [...box(0, 0, 0), ...box(RIM_GROW, push.x, push.y)] : box(0, 0, 0)
    patches.push({ of: index, tone, kind: thing.kind, len: thing.len, cast, x0: Math.min(...corners.map((p) => p.x)), x1: Math.max(...corners.map((p) => p.x)), y0: Math.min(...corners.map((p) => p.y)), y1: Math.max(...corners.map((p) => p.y)) })
  }
  for (const [index, { lamp, tone }] of best) patch(index, tone, lamp)
  for (const [index, lamp] of stopped) patch(index, 'dark', lamp)
  patches.sort((a, b) => a.of - b.of)
  let clearLit = -1
  for (const lit of patches) {
    const thing = things[lit.of]
    if (lit.tone !== 'sharp' || thing.kind !== 'clear') continue
    if (clearLit < 0 || thing.y > things[clearLit].y || (thing.y === things[clearLit].y && thing.x < things[clearLit].x)) clearLit = lit.of
  }
  return { lamps, patches, stopped: [...stopped.keys()].sort((a, b) => a - b), lit: patches.filter((p) => p.tone !== 'dark').map((p) => p.of), shutIn, shut, clearLit }
}

// --- King Winter's seat ------------------------------------------------------

/** King Winter seated is this wide, and a seat must be at least as wide as he is. */
export const KING_WIDE = 130
/**
 * A seat stands no higher than the fourth row, where he can still climb. Sat a row higher his crown would be in
 * the bough's icicles and, on his feet, under the jam's home control; two rows higher he would be out of the
 * frame.
 */
export const SEAT_ROWS = 4
/** The top of a seat is no higher than this: the top of the fourth row. */
export const SEAT_TOP_MIN = ON_BANK_Y - BLOCK_H / 2 - (SEAT_ROWS - 1) * BLOCK_H

const top = (b: Rest): number => b.y - BLOCK_H / 2

/** How much of a standing block's length rests on something: all of it on the bank. */
function rests(block: Rest, wall: readonly Rest[]): number {
  if (Math.abs(block.y - ON_BANK_Y) < 0.5) return widthOf(block)
  let sum = 0
  for (const b of wall) {
    if (b === block || !bears(b.kind) || b.place !== 'built' || Math.abs(b.y - (block.y + BLOCK_H)) > 0.5) continue
    sum += Math.max(0, Math.min(block.x + widthOf(block) / 2, b.x + widthOf(b) / 2) - Math.max(block.x - widthOf(block) / 2, b.x - widthOf(b) / 2))
  }
  return sum
}

export type Seat = {
  /** The highest block that will bear him, by index, or -1 when none will and he sits in the snow. */
  seat: number
  /** A block he would have taken but for the icicle standing on it, when it is higher than the seat he gets: by index, or -1. */
  point: number
  /** The highest thing in the clearing, which is the place he wanted: its top, or null when nothing stands. */
  wanted: { x: number; y: number } | null
  /** That thing, by index, or -1. */
  highest: number
  /** Every block that would bear him now, by index. */
  bearing: number[]
}

/** How tall King Winter is sat down, crown and all, at the size he is at the wall: the air a seat needs over it. */
export const KING_SEATED = 180
/** A lamp as a thing that takes up room: this far to each side of its hook, from this far above the middle of its place to this far below. */
const LAMP_ROOM = { side: 19, up: BLOCK_H / 2, down: 44 } as const

/**
 * What is on a block where King Winter would sit, or in the air over it: everything of the wall that stands on
 * the block, and everything that reaches into the space as wide as he is and as high as he sits, from the
 * block's top up; and whether a lamp hangs or stands in that space.
 */
export function overSeat(block: Rest, wall: readonly Rest[], lamps: readonly Lamp[]): { things: Rest[]; lamp: boolean } {
  const x0 = block.x - KING_WIDE / 2, x1 = block.x + KING_WIDE / 2, y1 = top(block), y0 = y1 - KING_SEATED
  const things = wall.filter((b) => {
    if (b === block) return false
    // A hung icicle hangs from the foot of the block over it; everything else is a block high about its middle.
    const b0 = b.y - BLOCK_H / 2, b1 = b.y + BLOCK_H / 2
    const inAir = b.x + widthOf(b) / 2 > x0 + 0.5 && b.x - widthOf(b) / 2 < x1 - 0.5 && b1 > y0 + 0.5 && b0 < y1 - 0.5
    // And whatever stands on the block itself, anywhere along it, is on his seat.
    const onIt = Math.abs(b1 - y1) < 0.5 && b.x + widthOf(b) / 2 > block.x - widthOf(block) / 2 + 0.5 && b.x - widthOf(b) / 2 < block.x + widthOf(block) / 2 - 0.5
    return inAir || onIt
  })
  const lamp = lamps.some((l) => l.x + LAMP_ROOM.side > x0 && l.x - LAMP_ROOM.side < x1 && l.y + LAMP_ROOM.down > y0 && l.y - LAMP_ROOM.up < y1)
  return { things, lamp }
}

/**
 * Where King Winter sits. A block bears him when it is at least as wide as he is, rests on at least half its
 * length, stands no higher than the fourth row, and has free air over it for his whole width and height:
 * nothing on it, no lintel over it and no lamp in it. He takes the highest such block, and of two equally high the one nearer his own
 * place.
 */
export function seatOf(things: readonly Rest[]): Seat {
  const wall = things.filter(inWall), lamps = lampsOf(things)
  let seat = -1, point = -1, highest = -1
  const bearing: number[] = []
  let wanted: Rest | null = null
  things.forEach((block, index) => {
    if (block.place !== 'built') return
    if (!wanted || block.y < wanted.y || (block.y === wanted.y && block.x > wanted.x)) (wanted = block), (highest = index)
    if (!bears(block.kind) || widthOf(block) < KING_WIDE || top(block) < SEAT_TOP_MIN - 0.5) return
    if (rests(block, wall) < widthOf(block) / 2 || rests(block, wall) < BEARS_FROM) return
    const over = overSeat(block, wall, lamps)
    if (over.lamp) return
    const better = (than: number): boolean => than < 0 || block.y < things[than].y || (block.y === things[than].y && block.x > things[than].x)
    if (over.things.length === 0) {
      bearing.push(index)
      if (better(seat)) seat = index
    } else if (over.things.every((b) => b.kind === 'icicle' && b.place === 'built' && Math.abs(b.y - (block.y - BLOCK_H)) < 0.5) && better(point)) point = index
  })
  if (point >= 0 && seat >= 0 && things[point].y >= things[seat].y) point = -1
  const high = wanted as Rest | null
  return { seat, point, wanted: high ? { x: high.x, y: top(high) } : null, highest, bearing }
}

/** The widest gap in the wall at the foot of it, which King Winter walks in by: its middle. The whole bank is one gap while nothing stands on it. */
export function widestGap(things: readonly Rest[]): number {
  return gapOf(things).x
}
/** That gap: its middle and how wide it is. */
export function gapOf(things: readonly Rest[]): { x: number; w: number } {
  const row = things.filter((b) => inWall(b) && Math.abs(b.y - ON_BANK_Y) < 0.5).sort((a, b) => a.x - b.x)
  let from: number = BUILD.x0, best = { w: -1, x: (BUILD.x0 + BUILD.x1) / 2 }
  for (const edge of [...row.map((b) => [b.x - widthOf(b) / 2, b.x + widthOf(b) / 2] as const), [BUILD.x1, BUILD.x1] as const]) {
    if (edge[0] - from > best.w) best = { w: edge[0] - from, x: (from + edge[0]) / 2 }
    from = Math.max(from, edge[1])
  }
  return { x: Math.round(best.x), w: best.w }
}

/** King Winter squeezes through a gap down to this width, in stage units; a narrower one is no way in. */
export const GATE_MIN = 56
/**
 * The widest stretch at the foot of the wall that is open to the sky: bank with nothing standing on it and
 * nothing of the wall over it at any height. An overhang narrows a gap by as much as it hangs over, so a gap
 * `w` wide is roofed, and passed over, once what hangs over it leaves less than `GATE_MIN` open: a sliver of
 * overhang roofs nothing. Null when no stretch is that wide.
 */
export function openGapOf(things: readonly Rest[]): { x: number; w: number } | null {
  const spans = things.filter(inWall).map((b) => [b.x - widthOf(b) / 2, b.x + widthOf(b) / 2] as const).sort((a, b) => a[0] - b[0])
  let from: number = BUILD.x0, best: { x: number; w: number } | null = null
  for (const [a0, a1] of [...spans, [BUILD.x1, BUILD.x1] as const]) {
    const w = Math.min(a0, BUILD.x1) - from
    if (w >= GATE_MIN && (!best || w > best.w)) best = { x: Math.round((from + Math.min(a0, BUILD.x1)) / 2), w }
    from = Math.max(from, a1)
  }
  return best
}
