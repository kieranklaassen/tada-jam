import { afterAll, describe, expect, it } from 'vitest'
import { freshBakery, type Bakery, type Visitor } from './bakery'
import { occasionOf, type Occasion } from './consequence'
import { formOf, restOutline, type Form } from './doughBody'
import { Game, type Point, type Still } from './game'
import { BENCH, MARGIN, REF_H, REF_W, SPOTS, layout } from './lookLayout'
import { FIGURE, FIGURES_OF, LEAST_TOUCH, LUMP_AT, PEEL_SCALE, RACK, animalBox, middle, type Figure, type Rect, type Stand } from './stage'
import { BAKE_SECONDS, EMPTY, WORK_SMOOTH, type Bread, type Load, type Stuff } from './stuff'
import { ANIMALS, IDEAS, POOLS, judge, reachableBreads, type Animal, type Group, type Idea } from './tastes'

// Nothing passes through anything. Bread Day is a print laid in flat pieces, so
// what a child would see cross is one piece lying over another that it should
// be clear of, a piece leaving the place it belongs in, and a thing to touch
// that is too small or lies under something else. These scenarios play the
// real controller at 60 frames a second with seeded input, and measure every
// frame in the look's reference units (the sheet is 1180 by 820 of them, so at
// 1180 by 820 one unit is one logical pixel).
//
// The first run of this file found seven places where the game did not hold a
// budget. Each was mended in the game, and every expectation here is a plain
// `it` now. If one fails again, the game has a fault: mend the game, not the
// budget.

const FPS = 60, FRAME = 1 / FPS
/** Set to print the worst of every measure with the frame it was taken on. */
const SHOW = !!process.env.BREAD_DAY_MEASURES

// --- The budgets -----------------------------------------------------------------

/** Units the stuff may hang over the blade while it lies still. The blade is the left 62% of the peel's box. Measured 0. */
const BLADE_MARGIN = 4
/** Units it may squash over the blade when it is patted, slapped or rubbed, and the seconds it may stay over the margin above. Measured 24.4 for 0.13 s: the fullest dough, risen and pulled long, slapped in the middle. */
const BLADE_SQUASH = 28, SQUASH_TIME = 0.3
/** Units a lobe may reach past the blade, under the finger or flying home: the longest lobe the body gives (230) and its knob. Measured 183.2. */
const LOBE_OVER = 245
/** Seconds a lobe may stay out once the finger is gone. Measured 0.17 (batter). */
const LOBE_HOME = 0.4
/** Units the stuff may hang over the box of the nook or the sill it stands in. Measured 7.9: the fullest risen dough, patted, below the ledge's box and still on the peel. */
const LEDGE_MARGIN = 10
/** Units the stuff may leave the oven's mouth. Measured 0. */
const MOUTH_MARGIN = 2
/** Units a bread may hang over its own place on the rack. Measured 0: each is drawn to fit its place. */
const RACK_MARGIN = 2
/** Units two breads side by side on the rack may lie in each other. Measured none: the widest leave 0.8 between them. */
const RACK_OVERLAP = 0
/** Units a standing figure's box may reach above the hatch's opening or to the right of it, where the badger begins. Measured 11.8 above (the bear alone), 7.6 to the right (the hen's last chick) and 4.3 with the hatch empty. */
const STANDS_OVER = 16
/**
 * The least share of a waiting animal's main figure that no figure in front is laid over, and the least share of it
 * on which a finger calls its own group in. Measured 0.93 seen and 0.80 within reach over every staging. While a
 * customer is still leaving with its bread those who wait keep their places behind it, and come forward when it has gone.
 */
const VISIBLE = 0.4
/**
 * Units a thing in a customer's hold may leave the opening: tossed above it (measured 54.6, the pancake the duck wears
 * as a hat), past its right edge (75.8, the fullest dough, pulled long, up to the mole's elbows) and below it, onto the
 * ledge and as far as the bench (69.1, the loaf the dachshund chases). The game keeps the thing's middle in the opening,
 * so this is the reach of its own size. The lane leads off to the left, so that side is open.
 */
const HELD_ABOVE = 62, HELD_RIGHT = 80, HELD_BELOW = 80
/**
 * Units a held thing may lie over the badger's head: the upper half of its box, less the bare strip of `FACE_STRIP`
 * units at either side (lookBadger.ts prints the head no nearer). Measured 2.2 for the bear. The whole of
 * a held thing is kept inside the opening by the game, the duck's included.
 */
const ON_FACE = 4, FACE_STRIP = 48
/** Units the badger's own lump may lie in the child's load, or leave the printed sheet, during a showing. Measured 0 with the child's peel on the board, in the nook and in the oven. */
const LUMP_ON_LOAD = 0, LUMP_OUT = 0
/** The least side of anything that answers a touch, in logical pixels, at both sizes of surface. Measured at 1024 by 768: 48.6 for a place on the rack, 59.0 for the smallest animal (its box is never under 68 units). */
const TOUCH = 48
/** Units a rider's foot may be from the middle of the peel it rides (three chicks sit 44 apart), and how far beyond that while it hops on or off: the chicks' hop from the board back to the hatch is the longest, measured 349.4. */
const RIDER_REACH = 60, RIDER_HOP = 370
const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768]]
/** The grown-up corner: nothing of the game answers in the top right this many logical pixels at 1180 by 820. */
const CORNER = 72

/** A waiting animal's main figure is asked what answers a finger at this many points a side. */
const REACH_GRID = 5

const LUMP = LUMP_AT.board, SACK = middle(SPOTS.sack), JUG = middle(SPOTS.jug), HATCH = middle(SPOTS.hatch)
const BADGER: Point = { x: middle(SPOTS.badger).x, y: SPOTS.badger[1] + 120 }
const BOARD: Point = { x: LUMP.x, y: BENCH + 120 }
/** The blade about the middle of its load, at full size. */
const BLADE: Rect = [SPOTS.peel[0] - LUMP.x, SPOTS.peel[1] - LUMP.y, SPOTS.peel[2] * 0.62, SPOTS.peel[3]]
/** The peel's handle on the board, as game.ts has it. */
const HANDLE: Rect = [SPOTS.peel[0] + SPOTS.peel[2] * 0.62, SPOTS.peel[1] + SPOTS.peel[3] * 0.6, SPOTS.peel[2] * 0.38, SPOTS.peel[3] * 0.4]
const HATCH_RIGHT = SPOTS.hatch[0] + SPOTS.hatch[2], HATCH_TOP = SPOTS.hatch[1], HATCH_FLOOR = SPOTS.hatch[1] + SPOTS.hatch[3]
const FACE: Rect = [SPOTS.badger[0] + FACE_STRIP, SPOTS.badger[1], SPOTS.badger[2] - 2 * FACE_STRIP, SPOTS.badger[3] / 2]
const ROOM: Rect = [MARGIN, MARGIN, REF_W - 2 * MARGIN, REF_H - 2 * MARGIN]

const OWNER = new Map<Figure, Animal>()
for (const animal of ANIMALS) for (const figure of FIGURES_OF[animal]) OWNER.set(figure, animal)

/** The scenarios' own stream of chance: the same wobbles and the same taps every run. */
function seeded(seed: number): () => number {
  let s = (Math.imul(seed, 2654435761) >>> 0) || 1
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
}

// --- Measuring ---------------------------------------------------------------

/** The worst a measure came to, and where: who, in which scenario, on which frame. */
type Mark = { value: number; where: string }
class Tally {
  readonly marks = new Map<string, Mark>()
  most(key: string, value: number, where: string): void { const old = this.marks.get(key); if (!old || value > old.value) this.marks.set(key, { value, where }) }
  least(key: string, value: number, where: string): void { const old = this.marks.get(key); if (!old || value < old.value) this.marks.set(key, { value, where }) }
  count(key: string): void { const old = this.marks.get(key); this.marks.set(key, { value: (old?.value ?? 0) + 1, where: '' }) }
  of(key: string, none = 0): number { return this.marks.get(key)?.value ?? none }
}
/** How far a point lies outside a box; 0 inside it. */
const outside = (x: number, y: number, [bx, by, bw, bh]: Rect): number => Math.max(bx - x, x - bx - bw, by - y, y - by - bh, 0)
function furthestOut(points: readonly number[], box: Rect): number {
  let far = 0
  for (let i = 0; i < points.length; i += 2) far = Math.max(far, outside(points[i], points[i + 1], box))
  return far
}
/** How far inside a box the deepest point of an outline lies; 0 when none is in it. */
function deepestIn(points: readonly number[], [bx, by, bw, bh]: Rect): number {
  let deep = 0
  for (let i = 0; i < points.length; i += 2) deep = Math.max(deep, Math.min(points[i] - bx, bx + bw - points[i], points[i + 1] - by, by + bh - points[i + 1]))
  return deep
}

/** Whether a point is inside a closed outline of x,y pairs, and how far it is from the outline's edge. */
function within(x: number, y: number, p: readonly number[]): boolean {
  let odd = false
  for (let i = 0, m = p.length, j = m - 2; i < m; j = i, i += 2) {
    if ((p[i + 1] > y) !== (p[j + 1] > y) && x < p[i] + ((p[j] - p[i]) * (y - p[i + 1])) / (p[j + 1] - p[i + 1])) odd = !odd
  }
  return odd
}
function toEdge(x: number, y: number, p: readonly number[]): number {
  let near = Infinity
  for (let i = 0, m = p.length, j = m - 2; i < m; j = i, i += 2) {
    const ex = p[i] - p[j], ey = p[i + 1] - p[j + 1], t = Math.max(0, Math.min(1, ((x - p[j]) * ex + (y - p[j + 1]) * ey) / (ex * ex + ey * ey || 1)))
    near = Math.min(near, Math.hypot(x - p[j] - ex * t, y - p[j + 1] - ey * t))
  }
  return near
}
/** How deep one outline lies in another: the furthest any point of either is inside the other. 0 when they are apart. */
function depth(a: readonly number[], b: readonly number[]): number {
  let deep = 0
  for (const [p, q] of [[a, b], [b, a]]) for (let i = 0; i < p.length; i += 2) if (within(p[i], p[i + 1], q)) deep = Math.max(deep, toEdge(p[i], p[i + 1], q))
  return deep
}

/** The share of a box that lies under any of the others, each grown by `pad`. */
function covered(box: Rect, others: readonly Rect[], pad: number): number {
  const [x, y, w, h] = box, cut: number[][] = []
  for (const [ox, oy, ow, oh] of others) {
    const x0 = Math.max(x, ox - pad), x1 = Math.min(x + w, ox + ow + pad), y0 = Math.max(y, oy - pad), y1 = Math.min(y + h, oy + oh + pad)
    if (x1 > x0 && y1 > y0) cut.push([x0, y0, x1, y1])
  }
  const xs = [...new Set(cut.flatMap((c) => [c[0], c[2]]))].sort((a, b) => a - b)
  let area = 0
  for (let i = 0; i + 1 < xs.length; i++) {
    // The slab between two cuts: the stretches of it that are covered, merged.
    const spans = cut.filter((c) => c[0] <= xs[i] && c[2] >= xs[i + 1]).sort((a, b) => a[1] - b[1])
    let top = -Infinity, tall = 0
    for (const [, y0, , y1] of spans) if (y1 > top) { tall += y1 - Math.max(y0, top); top = y1 }
    area += tall * (xs[i + 1] - xs[i])
  }
  return area / (w * h)
}

const RESTS = new WeakMap<Form, number[]>()
/** The outline of a thing at rest where the look lays it: scaled, turned and moved. */
function laid({ form, x, y, scale, turn }: Still): number[] {
  let rest = RESTS.get(form)
  if (!rest) { rest = new Array<number>(72); restOutline(form, rest, 36); RESTS.set(form, rest) }
  const c = Math.cos(turn) * scale, s = Math.sin(turn) * scale, out = new Array<number>(rest.length)
  for (let i = 0; i < rest.length; i += 2) { out[i] = x + rest[i] * c - rest[i + 1] * s; out[i + 1] = y + rest[i] * s + rest[i + 1] * c }
  return out
}
/** The outline of what lies on the peel, where it is drawn now. */
function loadOutline(game: Game): number[] {
  const { x, y, scale } = game.peel
  return game.body.outline().map((v, i) => (i % 2 ? y : x) + v * scale)
}

/** The box round an outline: left, top, right, bottom. */
function span(points: readonly number[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i < points.length; i += 2) { x0 = Math.min(x0, points[i]); x1 = Math.max(x1, points[i]); y0 = Math.min(y0, points[i + 1]); y1 = Math.max(y1, points[i + 1]) }
  return [x0, y0, x1, y1]
}

/** Where an animal stands, read back from the box its main figure is laid in. */
function standOf(animal: Animal, [x, y, w, h]: Rect): Stand {
  const made = FIGURE[FIGURES_OF[animal][0]], scale = w / made.w
  return { x: x + w / 2 - made.dx * scale, y: y + h - made.dy * scale, scale }
}

/** Who stands where, measured on a frame in which nobody walks. */
function stage(game: Game, tally: Tally, where: string): void {
  const { hatch, lane } = game.bakery, waiting = new Set(lane.flatMap((visitor) => visitor.group)), served = new Set(hatch?.group ?? [])
  const cast = [hatch ? hatch.group.join('+') : 'nobody', ...lane.map((visitor) => visitor.group.join('+'))].join(' | ')
  // One who is still leaving with its bread may already be laid out to wait again: until its ending is over it is the one leaving, not one waiting.
  const going = new Set<Animal>(game.leavingNow ?? [])
  const boxes = new Map<Animal, Rect[]>(), front: Rect[] = []
  for (const { figure, box } of game.figures()) {
    const animal = OWNER.get(figure)!
    boxes.set(animal, [...(boxes.get(animal) ?? []), box])
    // Whoever is not waiting in the lane is laid in front of it: those at the hatch, and those still leaving with a bread.
    if (!waiting.has(animal) || going.has(animal)) front.push(box)
  }
  // Someone handed a bread it wants is no longer in the bakery, and stays on stage until it has walked off with it.
  const leaving = [...boxes.keys()].some((animal) => !waiting.has(animal) && !served.has(animal))
  for (const [animal, own] of boxes) {
    if (!waiting.has(animal) && !served.has(animal)) continue
    const who = `the ${animal} ${served.has(animal) ? 'at the hatch' : 'waiting'} (${cast})${where && `, ${where}`}`
    for (const [x, y, w] of own) {
      tally.most('stands above the opening', HATCH_TOP - y, who)
      tally.most(hatch ? 'stands right of the opening' : 'stands right of the opening, hatch empty', x + w - HATCH_RIGHT, who)
    }
    // An animal answers anywhere in the box stage.ts gives it for a touch.
    const [, , wide, high] = animalBox(animal, standOf(animal, own[0]), LEAST_TOUCH)
    tally.least(`target, ${animal}`, Math.min(wide, high), who)
    if (waiting.has(animal) && !going.has(animal)) {
      const [x, y, w, h] = own[0], place = lane.findIndex((visitor) => visitor.group.includes(animal))
      // Seen: the share of its main figure no figure in front is laid over. Within reach: the share of it on which a finger calls its own group in.
      let reached = 0
      for (let i = 0; i < REACH_GRID; i++) for (let j = 0; j < REACH_GRID; j++) {
        const target = game.hit({ x: x + ((i + 0.5) * w) / REACH_GRID, y: y + ((j + 0.5) * h) / REACH_GRID })
        if (target.on === 'animal' && target.where === 'lane' && target.place === place) reached++
      }
      tally.least(leaving ? 'seen, while someone leaves' : 'seen', 1 - covered(own[0], front, 0), who)
      tally.least('within reach', reached / (REACH_GRID * REACH_GRID), who)
    }
  }
}

/** The real game played a frame at a time, measured after every frame. */
class Play {
  readonly tally = new Tally()
  readonly random: () => number
  frame = 0
  private finger: Point | null = null
  private before = new Map<Figure, Rect>()
  private staged = ''
  private loose = 0
  private over = 0

  constructor(readonly name: string, readonly game: Game, seed = 1) { this.random = seeded(seed); this.measure() }

  private tick(): void { this.game.step(FRAME); this.game.voices(); this.frame++; this.measure() }
  wait(seconds: number): this { for (let i = Math.round(seconds * FPS); i > 0; i--) this.tick(); return this }
  press(at: Point): this { this.game.press(at); this.finger = at; return this }
  /** The finger slides on, a frame at a time, wobbling by up to `wobble` on the way and landing where it was sent. */
  slide(to: Point, seconds = 0.4, wobble = 0): this {
    const from = this.finger!, steps = Math.max(1, Math.round(seconds * FPS))
    for (let i = 1; i <= steps; i++) {
      const loose = i < steps ? wobble : 0
      this.finger = { x: from.x + ((to.x - from.x) * i) / steps + (this.random() * 2 - 1) * loose, y: from.y + ((to.y - from.y) * i) / steps + (this.random() * 2 - 1) * loose }
      this.game.moveTo(this.finger)
      this.tick()
    }
    return this
  }
  lift(): this { this.game.lift(); this.finger = null; return this }
  tap(at: Point): this { this.press(at); this.tick(); return this.lift() }
  drag(from: Point, to: Point, seconds = 0.4, wobble = 0): this { return this.press(from).slide(to, seconds, wobble) }

  /** Strokes across the lump until it is smooth, as a child kneads: back and forth, never quite the same. */
  knead(): this {
    const lump = this.game.peel
    for (let i = 0; i < 14; i++) {
      const load = this.game.bakery.peel.load
      if (!load || !load.raw || load.work >= WORK_SMOOTH) break
      const side = i % 2 ? -1 : 1, lean = () => (this.random() - 0.5) * 30 * lump.scale
      this.drag({ x: lump.x - 60 * side * lump.scale, y: lump.y + lean() }, { x: lump.x + 60 * side * lump.scale, y: lump.y + lean() }, 0.3, 5 * lump.scale).lift().wait(0.1)
    }
    return this.wait(1)
  }

  /** The peel is picked up where it can be (by its handle on the board), drawn clear of its load, carried and let go. */
  carry(to: Point): this {
    const place = this.game.bakery.peel.at, at = LUMP_AT[place], size = PEEL_SCALE[place]
    const grip = place === 'board' ? { x: SPOTS.peel[0] + SPOTS.peel[2] * 0.86, y: SPOTS.peel[1] + SPOTS.peel[3] * 0.84 }
      : place === 'oven' ? middle(SPOTS.mouth) : { x: at.x + SPOTS.peel[2] * size * 0.4, y: at.y + 30 }
    const away = Math.hypot(grip.x - at.x, grip.y - at.y) || 1
    this.press(grip)
    if (place === 'nook' || place === 'sill') this.slide({ x: grip.x + ((grip.x - at.x) / away) * 45, y: grip.y + ((grip.y - at.y) / away) * 45 }, 0.1)
    return this.slide(to, 0.45, 3).lift().wait(0.7)
  }

  private measure(): void {
    const { game, tally } = this, at = `${this.name}, frame ${this.frame}`, peel = game.peel, place = game.bakery.peel.at
    const load = game.form ? loadOutline(game) : null
    if (load) {
      const s = peel.scale, off = furthestOut(load, [peel.x + BLADE[0] * s, peel.y + BLADE[1] * s, BLADE[2] * s, BLADE[3] * s])
      if (game.body.reach > 0) {
        // A lobe is out: under the finger, or on its way home.
        tally.most('lobe off the blade', off, at)
        this.loose = this.finger ? 0 : this.loose + 1
        tally.most('lobe out after the finger', this.loose * FRAME, at)
      } else {
        this.loose = 0
        // Patted or slapped it squashes wider for a moment; lying still it is all on the blade.
        this.over = off > BLADE_MARGIN ? this.over + 1 : 0
        tally.most(game.body.settled ? 'off the blade, lying still' : 'off the blade, squashed', off, at)
        tally.most('squashed over the blade for', this.over * FRAME, at)
        const there = Math.hypot(peel.x - LUMP_AT[place].x, peel.y - LUMP_AT[place].y) < 0.5 && Math.abs(s - PEEL_SCALE[place]) < 0.002
        if (there && place !== 'board') tally.most(`out of the ${place}`, furthestOut(load, SPOTS[place === 'oven' ? 'mouth' : place]), at)
      }
    }

    const racked: (number[] | null)[] = RACK.map(() => null)
    for (const thing of game.things()) {
      const shape = laid(thing)
      if (thing.kind === 'rack') {
        const slot = RACK.findIndex((r) => middle(r).x === thing.x)
        racked[slot] = shape
        tally.most('out of its place on the rack', furthestOut(shape, RACK[slot]), `place ${slot}, ${at}`)
      } else if (thing.kind === 'shown') {
        tally.most('lump out of the room', furthestOut(shape, ROOM), at)
        if (load) tally.most('lump on the load', depth(shape, load), at)
        tally.count('frames with the lump')
      } else if (thing.kind === 'hand') {
        tally.count('frames with a bread in the hand')
      } else {
        const [, top, right, bottom] = span(shape)
        tally.most('held above the opening', HATCH_TOP - top, at)
        tally.most('held right of the opening', right - HATCH_RIGHT, at)
        tally.most('held below the opening', bottom - HATCH_FLOOR, at)
        tally.most('held over the badger\'s head', deepestIn(shape, FACE), at)
        tally.count('frames with a thing held')
      }
    }
    for (let slot = 0; slot + 1 < RACK.length; slot++) {
      const a = racked[slot], b = racked[slot + 1]
      if (a && b) tally.most('rack neighbours', depth(a, b), `places ${slot} and ${slot + 1}, ${at}`)
    }

    // Who stands where is measured once each time everyone has come to rest somewhere new.
    let still = true, key = ''
    const now = new Map<Figure, Rect>()
    for (const { figure, box } of game.figures()) {
      const old = this.before.get(figure)
      if (!old || old[0] !== box[0] || old[1] !== box[1] || old[2] !== box[2] || old[3] !== box[3]) still = false
      now.set(figure, box)
      key += `${figure}${box[0]},${box[1]},${box[2]};`
    }
    this.before = now
    if (still && now.size > 0 && key !== this.staged) { this.staged = key; stage(game, tally, at); tally.count('stagings') }

    if (this.frame % 20 === 0) {
      for (let x = REF_W - CORNER + 4; x < REF_W; x += 8) for (let y = 4; y < CORNER; y += 8) {
        const target = game.hit({ x, y })
        if (target.on !== 'room' || target.what !== 'wall') tally.most('answers in the corner', 1, `${target.on} at ${x},${y}, ${at}`)
      }
    }
  }
}

// --- Building a bakery ---------------------------------------------------------

const BASE = freshBakery(null, 1).bakery
const visitor = (group: Group): Visitor => ({ group, from: 'trios', handedBack: 0 })
/** A bakery late in the order, as play could have left it: everything shown, both tools out, whoever is named at the hatch and in the lane. */
function bakeryWith(hatch: Group | null, lane: readonly Group[], change: Partial<Bakery> = {}): Bakery {
  return { ...BASE, position: 'trios', finished: hatch === null, shown: IDEAS, tools: { jar: true, seeds: true }, hatch: hatch && visitor(hatch), lane: lane.map(visitor), ...change }
}
const on = (bakery: Bakery, seed = 7): Game => new Game({ bakery, happened: [] }, seed)
const GROUPS: readonly Group[] = [...ANIMALS.map((animal) => [animal]), ...POOLS.pairs, ...POOLS.trios.filter((group) => group.length > 1)]
const apart = (a: Group, b: Group): boolean => a.every((animal) => !b.includes(animal))

const RAW: readonly Stuff[] = [
  { ...EMPTY, flour: 3 }, { ...EMPTY, water: 3 }, { ...EMPTY, seeds: true }, { ...EMPTY, flour: 2, water: 3, bubbly: true },
  { ...EMPTY, flour: 3, water: 3, work: 4 }, { ...EMPTY, flour: 3, water: 3, work: 12, bubbly: true, rise: 100, seeds: true },
]
const BREADS: readonly Bread[] = reachableBreads()
const THINGS: readonly NonNullable<Load>[] = [...RAW, ...BREADS]
const wide = (thing: Load): number => formOf(thing)?.rx ?? 0

const byWidth = [...BREADS].sort((a, b) => wide(b) - wide(a))
/** A dough as full as the peel holds, smooth, with whatever the tools that are out can add. */
const fullDough = (jar = true, seeds = true, long = false): Stuff => ({ ...EMPTY, flour: 3, water: 3, work: 12, bubbly: jar, rise: jar ? 100 : 0, seeds, long })

/** The budgets the duck's bill once broke when it handed back a bread it wants least or raw stuff: they have a test of their own. */
const BILL = ['held over the badger\'s head', 'held below the opening']
function offTheBill(group: Group, thing: NonNullable<Load>): string[] {
  const verdict = judge(group, thing)
  return !verdict.wanted && verdict.by === 'duck' && (verdict.hated || verdict.reason === 'raw') ? BILL : []
}

// --- Holding a play to the budgets ---------------------------------------------

const MOST: Record<string, number> = {
  'off the blade, lying still': BLADE_MARGIN, 'off the blade, squashed': BLADE_SQUASH, 'squashed over the blade for': SQUASH_TIME, 'lobe off the blade': LOBE_OVER, 'lobe out after the finger': LOBE_HOME,
  'out of the nook': LEDGE_MARGIN, 'out of the sill': LEDGE_MARGIN, 'out of the oven': MOUTH_MARGIN,
  'out of its place on the rack': RACK_MARGIN, 'rack neighbours': RACK_OVERLAP,
  'lump out of the room': LUMP_OUT, 'lump on the load': LUMP_ON_LOAD,
  'held above the opening': HELD_ABOVE, 'held right of the opening': HELD_RIGHT, 'held below the opening': HELD_BELOW, 'held over the badger\'s head': ON_FACE,
  'stands above the opening': STANDS_OVER, 'stands right of the opening': STANDS_OVER, 'stands right of the opening, hatch empty': STANDS_OVER,
  'answers in the corner': 0,
}
/** `seen, while someone leaves` is measured too, and held in a test of its own. */
const LEAST: Record<string, number> = { seen: VISIBLE, 'within reach': VISIBLE }
const SEEN = new Map<string, Mark>()
/** Every budget a play is held to, but for the named ones, each of which has a test of its own. */
function hold(tally: Tally, known: readonly string[] = []): void {
  for (const [key, mark] of tally.marks) {
    const old = SEEN.get(key)
    if (mark.where === '') SEEN.set(key, { value: (old?.value ?? 0) + mark.value, where: '' })
    else if (!old || (key in MOST ? mark.value > old.value : mark.value < old.value)) SEEN.set(key, mark)
  }
  for (const [key, mark] of tally.marks) {
    if (known.includes(key)) continue
    if (key in MOST) expect(mark.value, `${key} (${mark.where})`).toBeLessThanOrEqual(MOST[key] + 1e-9)
    if (key in LEAST) expect(mark.value, `${key} (${mark.where})`).toBeGreaterThanOrEqual(LEAST[key])
  }
}
afterAll(() => {
  if (SHOW) console.log([...SEEN].sort(([a], [b]) => a.localeCompare(b)).map(([key, mark]) => `${key}: ${mark.value.toFixed(2)}  ${mark.where}`).join('\n'))
})

describe('the real game at 60 frames a second, measured every frame', () => {
  it('a first visit: the showing, flour and water, kneading, a pull, the nook, the sill, the oven, and the goat leaves with its bread', () => {
    const p = new Play('a first visit', new Game(freshBakery(null, 7), 7), 11)
    p.wait(9)
    expect(p.game.playing, 'the showing ran out by itself').toBe(false)
    expect(p.tally.of('frames with the lump')).toBeGreaterThan(200)
    p.tap(SACK).wait(0.5).tap(JUG).wait(1).tap(LUMP).wait(0.4)
    // Rough dough rips short.
    p.drag(LUMP, { x: LUMP.x + 300, y: LUMP.y - 40 }, 0.6).lift().wait(1)
    p.knead()
    // All the peel holds, kneaded again, then pulled long and held out, gathered, and pulled long the other way.
    p.tap(SACK).wait(0.3).tap(SACK).wait(0.3).tap(JUG).wait(0.3).tap(JUG).wait(0.6).knead()
    p.drag(LUMP, { x: LUMP.x + 260, y: LUMP.y - 30 }, 0.5, 4).slide({ x: LUMP.x + 240, y: LUMP.y + 90 }, 0.4, 4).slide({ x: LUMP.x + 290, y: LUMP.y - 120 }, 0.4, 4).lift().wait(1.5)
    expect(p.game.bakery.peel.load).toMatchObject({ long: true })
    p.drag({ x: LUMP.x - 190, y: BENCH + 200 }, LUMP, 0.5).lift().wait(1)
    expect(p.game.bakery.peel.load).toMatchObject({ long: false })
    p.drag(LUMP, { x: LUMP.x - 250, y: LUMP.y + 40 }, 0.5, 4).lift().wait(1.2)
    expect(p.game.bakery.peel.load).toMatchObject({ long: true })
    p.carry(middle(SPOTS.nook)).wait(1.5)
    expect(p.game.bakery.peel.at).toBe('nook')
    p.tap(LUMP_AT.nook).wait(0.5).drag(LUMP_AT.nook, { x: LUMP_AT.nook.x - 150, y: LUMP_AT.nook.y + 50 }, 0.4).lift().wait(1)
    p.carry(middle(SPOTS.sill)).wait(1)
    expect(p.game.bakery.peel.at).toBe('sill')
    p.carry(middle(SPOTS.mouth)).wait(BAKE_SECONDS + 1.5)
    expect(p.game.bakery.peel).toMatchObject({ at: 'oven', load: { raw: false } })
    p.carry(BOARD).wait(1)
    expect(p.game.bakery.peel.at).toBe('board')
    p.drag(LUMP, HATCH, 0.5).lift()
    expect(p.game.bakery.hatch, 'the goat has its bread').toBeNull()
    p.wait(8.5)
    expect(p.game.figures().some((piece) => piece.figure === 'goat'), 'and is gone').toBe(false)
    expect(p.game.things().length).toBe(0)
    for (const reached of ['out of the nook', 'out of the sill', 'out of the oven', 'lobe off the blade', 'held above the opening']) expect(p.tally.marks.has(reached), reached).toBe(true)
    hold(p.tally)
  }, 20000)

  it('the fullest peel, patted, rubbed and pulled every way, keeps its load on the blade', () => {
    const loads: Stuff[] = [fullDough(true, true, true), fullDough(), { ...EMPTY, flour: 2, water: 3, bubbly: true, rise: 100 }, { ...EMPTY, water: 3 }, { ...EMPTY, flour: 3 }]
    for (const [i, load] of loads.entries()) {
      const p = new Play(`a full peel (${formOf(load)!.kind}${load.long ? ', long' : ''})`, on(bakeryWith(['goat'], [], { peel: { at: 'board', load } })), 23 + i), form = formOf(load)!
      // Slapped in the middle, where a pat spreads it widest, then anywhere on it: a pat, or a short rub.
      p.wait(0.2).tap(LUMP).wait(0.5).tap(LUMP).wait(0.1).tap(LUMP).wait(0.6)
      for (let n = 0; n < 12; n++) {
        const from = { x: LUMP.x + (p.random() * 2 - 1) * (form.rx + 20), y: LUMP.y + (p.random() * 2 - 1) * (form.ry + 20) }
        if (p.game.hit(from).on !== 'stuff') continue
        if (n % 2) p.tap(from).wait(0.25)
        else p.drag(from, { x: from.x + (p.random() * 2 - 1) * 70, y: from.y + (p.random() * 2 - 1) * 40 }, 0.2, 3).lift().wait(0.25)
      }
      // Pulled out as far as a finger goes, each way, and held there.
      for (const [dx, dy] of [[0, -330], [380, 20], [-330, 60]]) p.drag(LUMP, { x: LUMP.x + dx, y: LUMP.y + dy }, 0.45, 3).wait(0.5).lift().wait(1)
      hold(p.tally)
    }
    // The same dough standing in each place the peel is carried to, patted there; in the oven it bakes into the widest loaf.
    for (const place of ['nook', 'sill', 'oven'] as const) for (const long of [true, false]) {
      const p = new Play(`a full peel in the ${place}${long ? ', long' : ''}`, on(bakeryWith(['goat'], [], { peel: { at: place, load: fullDough(true, true, long) } })), 31)
      p.wait(0.3).tap(LUMP_AT[place]).wait(0.6).tap({ x: LUMP_AT[place].x + 40, y: LUMP_AT[place].y }).wait(BAKE_SECONDS + 1)
      expect(p.tally.marks.has(`out of the ${place}`), place).toBe(true)
      hold(p.tally)
    }
  }, 20000)

  for (const animal of ANIMALS) {
    it(`the ${animal} alone, handed the widest thing for each thing it can make of one, holds it in the opening`, () => {
      const widest = new Map<Occasion, NonNullable<Load>>()
      for (const thing of THINGS) { const occasion = occasionOf(judge([animal], thing)), old = widest.get(occasion); if (!old || wide(thing) > wide(old)) widest.set(occasion, thing) }
      expect(widest.size).toBeGreaterThanOrEqual(6)
      // And the fullest risen dough, which the finger pulls long on the way over: the widest thing a customer ever holds.
      for (const [occasion, thing] of [...widest, ['raw, pulled long', fullDough()] as const]) {
        const p = new Play(`the ${animal} handed ${occasion}`, on(bakeryWith([animal], [], { peel: { at: 'board', load: thing } })))
        p.wait(0.2).drag(LUMP, HATCH, 0.4).lift()
        const leaves = p.game.bakery.hatch === null
        if (occasion === 'secret') {
          // A secret's thing is not held: it lies on the peel, which the scene draws at the hatch, and the customer
          // or her chicks ride it. Whoever rides stays on the printed sheet, with its foot on the peel's blade.
          expect(p.game.things().length, p.name).toBe(0)
          let rode = 0, off = 0
          for (let frame = 0; frame < 7.5 * FPS; frame++) {
            p.game.step(FRAME)
            for (const piece of p.game.figures()) {
              if (!piece.front) continue
              rode++
              const [x, y, w, h] = piece.box, peel = p.game.peel
              expect(x >= 0 && y >= 0 && x + w <= 1180 && y + h <= 820, `${p.name}: a rider left the sheet at frame ${frame}`).toBe(true)
              off = Math.max(off, Math.hypot(x + w / 2 - peel.x, y + h - peel.y) - RIDER_REACH)
            }
          }
          if (SHOW) console.log(`${p.name}: ${rode} rider-frames, furthest from the peel beyond its reach ${off.toFixed(1)}`)
          expect(rode, `${p.name}: someone rode the peel`).toBeGreaterThan(60)
          expect(off, `${p.name}: a rider's foot stays on the peel once it has hopped on`).toBeLessThanOrEqual(RIDER_HOP)
          expect(p.game.playing).toBe(false)
          expect(p.game.figures().some((piece) => OWNER.get(piece.figure) === animal), `${p.name}: gone down the lane`).toBe(false)
          expect(p.game.figures().some((piece) => piece.front), `${p.name}: nobody is left on the peel`).toBe(false)
          expect(Math.hypot(p.game.peel.x - LUMP.x, p.game.peel.y - LUMP.y), `${p.name}: the peel is home`).toBeLessThan(0.01)
          continue
        }
        expect(p.game.things().length, p.name).toBe(1)
        p.wait(leaves ? 7.5 : 2.5)
        expect(p.game.things().length, `${p.name}: the thing is back, or gone with it`).toBe(0)
        expect(p.tally.of('frames with a thing held'), p.name).toBeGreaterThan(60)
        hold(p.tally, offTheBill([animal], thing))
      }
    }, 20000)
  }

  // Measured after the thing's middle was kept in the opening: alone at the hatch, the fullest risen dough, pulled long on
  // the way over and stuck on the duck's bill, still swells 20.7 units over the badger's head (frame 118; 68.7 into the
  // upper half of its box, 66.7 right of the opening). The long airy loaf the duck wants least slides off the bill, turns
  // on end and reaches 92.4 units below the opening, 18 past the bench's back edge (frame 108).
  it('the duck keeps a loaf it wants least on the ledge, and dough stuck on its bill off the badger\'s head', () => {
    const plays: Play[] = []
    for (const thing of [byWidth[0], fullDough()]) {
      const p = new Play(`the duck handed ${thing.raw ? 'risen dough' : 'a long airy loaf'}`, on(bakeryWith(['duck'], [], { peel: { at: 'board', load: thing } })))
      plays.push(p.wait(0.2).drag(LUMP, HATCH, 0.4).lift().wait(2.5))
    }
    if (SHOW) console.log(plays.map((p) => `${p.name}: ${BILL.map((key) => `${key} ${p.tally.of(key).toFixed(1)} (${p.tally.marks.get(key)!.where})`).join(', ')}`).join('\n'))
    for (const p of plays) hold(p.tally)
  })

  // Measured: a customer handed a bread it wants is out of the bakery at once, so those who wait come forward into the
  // whole opening while it still stands at the hatch for the five seconds of its ending, and the last of them is laid under it.
  // With the goat leaving and the sparrows and the dachshund waiting, none of the dachshund's own figure shows (0%)
  // from the frame it arrives (75) until the goat walks off; every ending played above that fills the lane does the same.
  // A finger still reaches it: the one leaving no longer answers.
  it('while a customer leaves with its bread, those who come forward are not laid under it', () => {
    const p = new Play('the goat leaves', on(bakeryWith(['goat'], [['sparrows'], ['dachshund']], { peel: { at: 'board', load: byWidth.find((bread) => bread.crumb === 'dense')! } })))
    p.wait(0.2).drag(LUMP, HATCH, 0.4).lift()
    expect(p.game.bakery.hatch).toBeNull()
    p.wait(4)
    // Those who wait now keep their places until the customer has gone, so nobody may have been measured under it at all.
    const mark = p.tally.marks.get('seen, while someone leaves')
    if (SHOW) console.log(mark ? `seen, while someone leaves: ${mark.value.toFixed(2)}  ${mark.where}` : 'nobody came forward while someone was leaving')
    if (mark) expect(mark.value, mark.where).toBeGreaterThanOrEqual(VISIBLE)
    p.wait(4)
    expect(p.game.figures().some((piece) => piece.figure === 'goat'), 'and then the goat is gone and they come forward').toBe(false)
  })

  it('every pair and trio at the hatch, with two groups waiting, handed the bread it wants and one for each of them to refuse', () => {
    const random = seeded(5)
    let endings = 0, refusals = 0
    for (const group of GROUPS.filter((each) => each.length > 1)) {
      const free = GROUPS.filter((other) => apart(group, other)), first = free[Math.floor(random() * free.length)]
      const rest = free.filter((other) => apart(first, other)), second = rest[Math.floor(random() * rest.length)]
      const wanted = byWidth.find((bread) => judge(group, bread).wanted)
      const refused = group.map((animal) => [...THINGS].sort((a, b) => wide(b) - wide(a)).find((thing) => { const verdict = judge(group, thing); return !verdict.wanted && verdict.by === animal }))
      for (const thing of [wanted, ...refused]) {
        if (!thing) continue
        const p = new Play(`${group.join('+')} handed ${thing.raw ? 'raw stuff' : `${thing.crumb} ${thing.shape} ${thing.crust}`}`, on(bakeryWith(group, [first, second], { peel: { at: 'board', load: thing } })))
        p.wait(0.2).drag(LUMP, HATCH, 0.4).lift()
        const leaves = p.game.bakery.hatch === null
        expect(leaves, p.name).toBe(thing === wanted)
        expect(p.game.things().length, p.name).toBe(1)
        p.wait(leaves ? 7.5 : 2.5)
        expect(p.game.things().length, p.name).toBe(0)
        if (leaves) endings++; else refusals++
        hold(p.tally, offTheBill(group, thing))
      }
    }
    expect(endings).toBe(GROUPS.filter((each) => each.length > 1).length)
    expect(refusals).toBeGreaterThan(40)
  }, 30000)

  it('the rack filled with four breads, one taken back to the peel, one handed back from it, one handed over, one fed to the badger', () => {
    const pancake = byWidth.find((bread) => bread.crumb === 'pancake')!, brick = byWidth.find((bread) => bread.crumb === 'dense' && bread.shape === 'long')!, crumbly = byWidth.find((bread) => bread.crumb === 'crumbly')!
    const p = new Play('the rack', on(bakeryWith(['goat'], [['bear'], ['crow']], { rack: [byWidth[0], pancake, brick, null], peel: { at: 'board', load: crumbly } })), 3)
    p.wait(0.3).drag(LUMP, middle(RACK[3]), 0.5, 3).lift().wait(1)
    expect(p.game.bakery.rack.every((bread) => bread !== null), 'four on the rack').toBe(true)
    p.drag(middle(RACK[0]), LUMP, 0.5, 3).lift().wait(1)
    expect(p.game.bakery.peel.load).toBe(byWidth[0])
    p.drag(LUMP, middle(RACK[0]), 0.5, 3).lift().wait(0.6)
    p.drag(middle(RACK[1]), HATCH, 0.5, 3).lift().wait(2.6)
    expect(p.game.bakery.rack[1], 'the goat hands a pancake back to its place').toBe(pancake)
    p.drag(middle(RACK[3]), BADGER, 0.5, 3).lift().wait(1)
    expect(p.game.bakery.rack[3], 'the badger eats the crumbly one').toBeNull()
    p.drag(middle(RACK[2]), HATCH, 0.5, 3).lift()
    expect(p.game.bakery.hatch, 'the goat leaves with the brick').toBeNull()
    p.wait(8)
    // Then dough to the badger, on the peel carried up in front of it.
    p.tap(SACK).wait(0.3).tap(JUG).wait(0.6).knead().drag(middle(HANDLE), BADGER, 0.5, 3).lift().wait(1.2)
    expect(p.game.bakery.peel.load).toBeNull()
    expect(p.tally.of('frames with a bread in the hand')).toBeGreaterThan(100)
    expect(p.tally.marks.has('rack neighbours'), 'the breads on the rack were found and measured').toBe(true)
    hold(p.tally)
  }, 20000)

  it('customers called in and sent back by seeded taps, from a first visit, a pair, a trio and an empty hatch', () => {
    const starts: [string, Game][] = [
      ['a first visit', new Game(freshBakery(null, 3), 3)],
      ['a pair', on(bakeryWith(['goat', 'hen'], [['sparrows', 'crow'], ['bear']]))],
      ['a trio', on(bakeryWith(['sparrows', 'crow', 'hen'], [['goat', 'dachshund'], ['mole']]))],
      ['an empty hatch', on(bakeryWith(null, [['bear', 'crow', 'hen'], ['goat', 'dachshund'], ['sparrows']]))],
    ]
    for (const [name, game] of starts) {
      const p = new Play(`calling in and sending back, ${name}`, game, 17), met = new Set<string>()
      p.wait(name === 'a first visit' ? 9 : 0.3)
      for (let i = 0; i < 30; i++) {
        const pieces = p.game.figures(), pick = pieces[Math.floor(p.random() * pieces.length)]
        p.tap(middle(pick.box)).wait(0.15 + p.random() * 1.8)
        met.add(p.game.bakery.hatch ? p.game.bakery.hatch.group.join('+') : `nobody, ${p.game.bakery.lane.length} waiting`)
      }
      p.wait(2)
      expect(met.size, `${name}: different stagings reached`).toBeGreaterThanOrEqual(3)
      expect(p.tally.of('stagings'), name).toBeGreaterThan(8)
      hold(p.tally)
    }
  }, 20000)
})

// --- The badger's own lump -------------------------------------------------------

const NEW_TO: readonly (readonly [Idea, Animal])[] = [['shapes', 'dachshund'], ['rising', 'bear'], ['crust', 'crow'], ['seeds', 'hen'], ['batter', 'duck']]
/** An idea is shown for the first time while the child has something on the peel, in a place: the fullest dough the tools out by then can make, or the widest bread. */
function shown(idea: Idea, animal: Animal, place: 'board' | 'nook' | 'oven'): Play {
  const before = IDEAS.slice(0, IDEAS.indexOf(idea)), tools = { jar: before.includes('rising'), seeds: before.includes('seeds') }
  const loaf = byWidth.find((bread) => (tools.jar || bread.crumb !== 'airy') && (tools.seeds || !bread.seeds))!
  const p = new Play(`${idea} shown with a ${place === 'oven' ? 'bread' : 'dough'} of the child's ${place === 'board' ? 'on the board' : `in the ${place}`}`, on(bakeryWith(null, [[animal]], { shown: before, tools, peel: { at: place, load: place === 'oven' ? loaf : fullDough(tools.jar, tools.seeds) } })))
  p.wait(0.2).tap(middle(p.game.figures()[0].box))
  expect(p.game.playing, p.name).toBe(true)
  p.wait(9)
  expect(p.game.playing, p.name).toBe(false)
  expect(p.tally.of('frames with the lump'), p.name).toBeGreaterThan(100)
  return p
}

describe('the badger shows on a lump of its own', () => {
  it('which stays in the room and off the child\'s load, wherever the child\'s peel stands, for every idea', () => {
    for (const [idea, animal] of NEW_TO) for (const place of ['board', 'nook', 'oven'] as const) {
      const p = shown(idea, animal, place)
      expect(p.tally.marks.has('lump on the load'), p.name).toBe(true)
      hold(p.tally)
    }
  }, 30000)
})

// --- Where everyone stands ---------------------------------------------------------

type Staging = { hatch: Group | null; lane: Group[]; game: Game; tally: Tally }
let stagings: Staging[] | null = null
/** Every way the cast can stand that the rules allow: anyone at the hatch with one or two groups waiting, and nobody at the hatch with one, two or three. Each is a game opened on that bakery. */
function everyStaging(): Staging[] {
  if (stagings) return stagings
  stagings = []
  for (const hatch of [null, ...GROUPS]) for (const a of GROUPS) for (const b of [null, ...GROUPS]) for (const c of hatch || !b ? [null] : [null, ...GROUPS]) {
    const lane = [a, b, c].filter((group): group is Group => group !== null), all = hatch ? [hatch, ...lane] : lane
    if (all.some((one, i) => all.some((other, j) => i < j && !apart(one, other)))) continue
    const game = on(bakeryWith(hatch, lane)), tally = new Tally()
    stage(game, tally, '')
    stagings.push({ hatch, lane, game, tally })
  }
  return stagings
}
/** The worst of one measure over a set of stagings. */
function worst(of: readonly Staging[], key: string, least = false): Mark {
  let found: Mark = { value: least ? Infinity : -Infinity, where: 'nowhere' }
  for (const { tally } of of) { const mark = tally.marks.get(key); if (mark && (least ? mark.value < found.value : mark.value > found.value)) found = mark }
  if (SHOW) console.log(`${key}, ${of.length} stagings: ${found.value.toFixed(2)} ${found.where}`)
  return found
}

describe('where everyone stands', () => {
  it('nobody stands over the top of the opening or past its right edge into the badger', () => {
    const all = everyStaging(), taken = all.filter((each) => each.hatch), empty = all.filter((each) => !each.hatch)
    expect(taken.length).toBeGreaterThan(3000)
    expect(empty.length).toBeGreaterThan(3000)
    expect(taken.some((each) => each.hatch!.length === 2 && each.lane.length === 2) && taken.some((each) => each.hatch!.length === 3 && each.lane.length === 2), 'a pair and a trio, each with two groups waiting').toBe(true)
    for (const [of, key] of [[taken, 'stands above the opening'], [taken, 'stands right of the opening'], [empty, 'stands above the opening'], [empty, 'stands right of the opening, hatch empty']] as const) {
      const mark = worst(of, key)
      expect(mark.value, `${key}: ${mark.where}`).toBeLessThanOrEqual(STANDS_OVER)
    }
  }, 20000)

  it('at least 40% of every waiting animal\'s main figure is clear of those at the hatch, and calls its own group in', () => {
    const all = everyStaging()
    for (const key of ['seen', 'within reach']) {
      const mark = worst(all, key, true)
      expect(mark.value, `${key}: ${mark.where}`).toBeGreaterThanOrEqual(VISIBLE)
    }
  }, 20000)

  it('with nobody at the hatch, a touch on the middle of each waiting animal\'s main figure is answered by that animal', () => {
    // Held out from the measures above: the game's own answer, for one, two and three groups waiting.
    const asked = [0, 0, 0, 0], wrong: string[] = []
    for (const { hatch, lane, game } of everyStaging()) {
      if (hatch) continue
      const boxes = new Map(game.figures().map((piece) => [piece.figure, piece.box]))
      lane.forEach((group, place) => group.forEach((animal) => {
        const target = game.hit(middle(boxes.get(FIGURES_OF[animal][0])!))
        asked[lane.length]++
        if (target.on !== 'animal' || target.animal !== animal || target.where !== 'lane' || target.place !== place) wrong.push(`the ${animal} of ${lane.map((each) => each.join('+')).join(' | ')} answers as ${JSON.stringify(target)}`)
      }))
    }
    if (SHOW) console.log(`touches asked with one, two and three waiting: ${asked.slice(1).join(', ')}; answered by someone else: ${wrong.length}`)
    expect(asked[1]).toBeGreaterThan(50)
    expect(asked[2]).toBeGreaterThan(1000)
    expect(asked[3]).toBeGreaterThan(10000)
    expect(wrong.slice(0, 5)).toEqual([])
  }, 20000)
})

// --- The rack ------------------------------------------------------------------------

describe('the rack', () => {
  it('holds every bread the oven can make inside its own place, clear of any neighbour', () => {
    // Each bread on all four places of a real game's rack: how far it leaves its place, and how far it reaches to either side of its middle.
    const all = BREADS.map((bread) => {
      const things = on(bakeryWith(null, [['goat']], { rack: [bread, bread, bread, bread] })).things()
      expect(things.map((thing) => thing.kind)).toEqual(['rack', 'rack', 'rack', 'rack'])
      const out = Math.max(...things.map((thing, place) => furthestOut(laid(thing), RACK[place]))), [left, , right] = span(laid(things[0]))
      return { name: `${bread.crumb} ${bread.shape}`, out, left: things[0].x - left, right: right - things[0].x, step: things[1].x - things[0].x }
    })
    if (SHOW) console.log([...new Set(all.map((a) => `${a.name}: ${(a.left + a.right).toFixed(1)} wide, ${a.out.toFixed(1)} out of its place, ${(a.right + a.left - a.step).toFixed(1)} over one like it`))].join('\n'))
    for (const a of all) {
      expect(a.out, a.name).toBeLessThanOrEqual(RACK_MARGIN)
      for (const b of all) expect(a.right + b.left - a.step, `${a.name} beside ${b.name}`).toBeLessThanOrEqual(RACK_OVERLAP)
    }
  })
})

// --- What answers a touch --------------------------------------------------------------

describe('what answers a touch', () => {
  const FIXED: Record<string, Rect> = { sack: SPOTS.sack, jug: SPOTS.jug, jar: SPOTS.jar, dish: SPOTS.dish, 'peel handle': HANDLE, 'oven mouth': SPOTS.mouth, nook: SPOTS.nook, sill: SPOTS.sill }
  RACK.forEach((place, i) => { FIXED[`rack place ${i}`] = place })
  /** The smallest target each animal ever is, in units: the box stage.ts gives it for a touch. */
  const smallest = (animal: Animal): Mark => worst(everyStaging(), `target, ${animal}`, true)

  it('is at least 48 by 48 logical pixels for every tool and place, at 1180 by 820 and at 1024 by 768', () => {
    for (const [width, height] of SURFACES) {
      const k = layout(width, height).scale
      for (const [name, [, , w, h]] of Object.entries(FIXED)) expect(Math.min(w, h) * k, `${name} at ${width} by ${height}`).toBeGreaterThanOrEqual(TOUCH)
    }
  }, 20000)

  it('is at least 48 by 48 logical pixels for every animal wherever it stands, at both sizes', () => {
    for (const [width, height] of SURFACES) for (const animal of ANIMALS) {
      const mark = smallest(animal)
      expect(mark.value * layout(width, height).scale, `${mark.where} at ${width} by ${height}`).toBeGreaterThanOrEqual(TOUCH)
    }
  }, 20000)

  it('never lies in the top right 72 by 72 logical pixels at 1180 by 820, which are the grown-up\'s', () => {
    expect(layout(1180, 820).scale).toBe(1)
    const corner: Rect = [REF_W - CORNER, 0, CORNER, CORNER]
    for (const [name, [x, y, w]] of Object.entries(FIXED)) expect(x < corner[0] + corner[2] && x + w > corner[0] && y < corner[1] + corner[3], name).toBe(false)
    // No figure of any staging reaches it either: a finger there lands on the bare wall.
    for (const { game } of everyStaging().filter((_, i) => i % 40 === 0)) {
      for (let x = REF_W - CORNER + 4; x < REF_W; x += 8) for (let y = 4; y < CORNER; y += 8) expect(game.hit({ x, y }), `${x},${y}`).toEqual({ on: 'room', what: 'wall' })
    }
  }, 20000)
})
