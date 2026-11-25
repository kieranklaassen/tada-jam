import { AIRS, BUMP_X, HEADS, DOORSTEP, FLOOR, FULL, IDS, MAX_LAYERS, SPECS, WEDGES, airSpec, bits, inRect, isAir, wedgeAt, type AirId, type Id, type Paper, type Spec } from './layout'
import type { Point } from './input'

// The rules: paper is laid on things in wedges, closes, is torn and bursts off.
// Pure and stepped; everything seen and heard follows the state and the events.

export const STEP = 1 / 60
/** With this many wedges laid, the rest closes by itself. */
export const CLOSES_FROM = 12
/** Seconds between wedges that close by themselves. */
const CLOSE_EVERY = 0.06
/** With this many wedges or fewer left of a torn paper, all of it bursts off. */
export const BURSTS_AT = 9
export const MAX_SCRAPS = 24

export type Layer = { paper: Paper; cover: number; torn: boolean }
export type Scrap = { x: number; y: number; paper: Paper; turn: number }
export const FAMILY = ['aunt', 'boy', 'dog'] as const
export type Kin = (typeof FAMILY)[number]
export type Member = { who: Kin; at: Point; phase: 'wait' | 'run' | 'rip' | 'look' | 'home' | 'gone'; target: Id | null; t: number }
/** A visit. `todo` is what was finished when the door was tapped and is still in its paper. */
export type Visit = { todo: Id[]; members: Member[] }

export type Event =
  | { type: 'lay'; id: Id; paper: Paper; wedge: number; laid: number }
  | { type: 'bow'; id: Id; paper: Paper; layers: number }
  | { type: 'tie'; a: Id; b: Id }
  | { type: 'tear'; id: Id; paper: Paper; at: Point; left: number }
  | { type: 'burst'; id: Id; paper: Paper; layers: number; by: Kin | null; at: Point; scraps: Scrap[] }
  | { type: 'moth'; at: Point }
  | { type: 'paper'; paper: Paper }
  | { type: 'bump' }
  | { type: 'sit' }
  | { type: 'stir'; at: Point; n: number }
  | { type: 'eat'; scrap: Scrap }
  | { type: 'visit' }
  | { type: 'noses' }
  | { type: 'tug'; who: Kin; id: Id }
  | { type: 'out' }
  | { type: 'squeak'; beat: number }

export type World = {
  paper: Paper
  layers: Record<Id, Layer[]>
  airs: Record<AirId, { at: Point; r: number } | null>
  ties: [Id, Id][]
  /** The parcel of nothing that has been there longest. */
  oldAir: AirId
  scraps: Scrap[]
  /** Where the cat is, and how long its walk in paper has gone on. */
  catX: number
  walk: number | null
  visit: Visit | null
  /** The mouse's round: seconds into it. `shown` is whether it has been played once. */
  mouse: number | null
  shown: boolean
  /** What the idle hand need not show any more. */
  known: { ripped: boolean; door: boolean }
  closing: number
  turn: number
  events: Event[]
}

/** The bare side of the bicycle on a first visit: the half to the right, from its top to its foot. */
export const FIRST_COVER = FULL & ~0b1111000000001111

export function freshWorld(): World {
  return {
    paper: 0,
    layers: { bike: [{ paper: 0, cover: FIRST_COVER, torn: false }], cat: [], grandpa: [], giraffe: [], tuba: [], tree: [], air0: [], air1: [] },
    airs: { air0: null, air1: null },
    ties: [],
    oldAir: 'air0',
    scraps: [],
    catX: SPECS.cat.x,
    walk: null,
    visit: null,
    mouse: null,
    shown: false,
    known: { ripped: false, door: false },
    closing: 0,
    turn: 0,
    events: [],
  }
}

/** Where a thing is now; null for a parcel of nothing that is not there. */
export function specOf(w: World, id: Id): Spec | null {
  if (isAir(id)) {
    const a = w.airs[id]
    return a ? airSpec(a.at, a.r) : null
  }
  if (id === 'cat' && w.catX !== SPECS.cat.x) {
    const s = SPECS.cat, d = w.catX - s.x
    return { ...s, x: s.x + d, mid: { x: s.mid.x + d, y: s.mid.y }, bow: { x: s.bow.x + d, y: s.bow.y }, touch: s.touch.map((r) => ({ ...r, x: r.x + d })) }
  }
  return SPECS[id]
}

export const topOf = (w: World, id: Id): Layer | null => w.layers[id][w.layers[id].length - 1] ?? null
/** Finished: covered all round, with its bow on and no tear. */
export function isParcel(w: World, id: Id): boolean {
  const top = topOf(w, id)
  return top !== null && top.cover === FULL && !top.torn
}
export const isTearing = (w: World, id: Id): boolean => topOf(w, id)?.torn === true
/** Some paper laid and more to lay. */
export function isPartial(w: World, id: Id): boolean {
  const top = topOf(w, id)
  return top !== null && !top.torn && top.cover !== FULL
}
export const tiedTo = (w: World, id: Id): Id | null => {
  const pair = w.ties.find((p) => p.includes(id))
  return pair ? (pair[0] === id ? pair[1] : pair[0]) : null
}
export const parcels = (w: World): Id[] => IDS.filter((id) => isParcel(w, id))

/** Front to back, for a finger. */
export function drawOrder(w: World): Id[] {
  return IDS.filter((id) => specOf(w, id) !== null).sort((a, b) => specOf(w, a)!.y - specOf(w, b)!.y)
}
export function thingAt(w: World, at: Point): Id | null {
  const order = drawOrder(w)
  for (let i = order.length - 1; i >= 0; i--) {
    const s = specOf(w, order[i])!
    if (s.touch.some((r) => inRect(r, at, 8))) return order[i]
  }
  return null
}

/** Lays one wedge on a thing. Over a finished parcel it begins another paper, up to three. Returns whether anything was laid. */
export function lay(w: World, id: Id, wedge: number): boolean {
  let top = topOf(w, id)
  if (top && top.cover === FULL && !top.torn) {
    if (w.layers[id].length >= MAX_LAYERS) return false
    top = null
  }
  if (!top) {
    top = { paper: w.paper, cover: 0, torn: false }
    w.layers[id].push(top)
    if (id === 'cat') w.walk = null
    claim(w, id)
  }
  // Paper laid over a tear mends it.
  if (top.torn) claim(w, id)
  top.torn = false
  const bit = 1 << (((wedge % WEDGES) + WEDGES) % WEDGES)
  if (top.cover & bit) return false
  top.cover |= bit
  w.events.push({ type: 'lay', id, paper: top.paper, wedge, laid: bits(top.cover) })
  if (top.cover === FULL) bow(w, id)
  return true
}

/** What the child has begun to wrap again is no longer the family's to rip. */
function claim(w: World, id: Id): void {
  if (w.visit) w.visit.todo = w.visit.todo.filter((x) => x !== id)
}

/** Takes wedges off that were only just laid. A paper with nothing left of it is gone. */
export function unlay(w: World, id: Id, wedges: readonly number[]): void {
  const top = topOf(w, id)
  if (!top || top.cover === FULL) return
  for (const k of wedges) top.cover &= ~(1 << (((k % WEDGES) + WEDGES) % WEDGES))
  if (top.cover === 0) w.layers[id].pop()
}

function bow(w: World, id: Id): void {
  const layers = w.layers[id]
  w.events.push({ type: 'bow', id, paper: layers[layers.length - 1].paper, layers: layers.length })
  if (id === 'cat' && !tiedTo(w, 'cat') && w.catX === SPECS.cat.x) w.walk = 0
}

/** The finger has gone all the way round: whatever is bare closes now. */
export function closeNow(w: World, id: Id): void {
  for (let i = 0; i < WEDGES; i++) {
    lay(w, id, i)
    if (isParcel(w, id)) return
  }
}

/** Two finished parcels inside one circle. */
export function tie(w: World, a: Id, b: Id): boolean {
  if (a === b || tiedTo(w, a) || tiedTo(w, b) || !topOf(w, a) || !topOf(w, b)) return false
  w.ties.push([a, b])
  if (a === 'cat' || b === 'cat') w.walk = null
  w.events.push({ type: 'tie', a, b })
  return true
}

/** A circle round nothing. With two already, the older puffs open. */
export function wrapNothing(w: World, at: Point, r: number): AirId {
  let id = AIRS.find((a) => w.airs[a] === null)
  if (!id) {
    id = w.oldAir
    burstAll(w, id)
  }
  w.oldAir = AIRS.find((a) => a !== id)!
  const k = Math.max(46, Math.min(80, r))
  w.airs[id] = { at: clearOf(at, k), r: k }
  closeNow(w, id)
  return id
}

/** Nearest to where it was drawn, clear of every head and of the rolls. */
function clearOf(at: Point, k: number): Point {
  let { x, y } = at
  for (const [hx, hy, hr] of HEADS) {
    const dx = x - hx, dy = y - hy, d = Math.hypot(dx, dy), need = hr + k
    if (d >= need) continue
    x = hx + (d < 1 ? 1 : dx / d) * need
    y = hy + (d < 1 ? 0 : dy / d) * need
  }
  if (x < 310 + k && y > 650 - k) y = 650 - k
  return { x: Math.max(k, Math.min(1180 - k, x)), y: Math.max(k + 40, Math.min(770 - k, y)) }
}

function burstAll(w: World, id: Id): void {
  while (w.layers[id].length) burst(w, id, null)
}

/** The giraffe eats a scrap that is tapped. */
export function eat(w: World, at: Point): boolean {
  let best = -1, least = 60
  w.scraps.forEach((s, i) => { const d = Math.hypot(s.x - at.x, s.y - at.y); if (d < least) { least = d; best = i } })
  if (best < 0) return false
  w.events.push({ type: 'eat', scrap: w.scraps.splice(best, 1)[0] })
  return true
}

/** Tears wedges off the top paper, from where the finger is. Returns whether it burst. */
export function tear(w: World, id: Id, at: Point, wedges: number): boolean {
  const top = topOf(w, id), s = specOf(w, id)
  if (!top || !s) return false
  const from = wedgeAt(s, at)
  let left = wedges
  // The nearest that is still there, to either side of the finger.
  for (let d = 0; d <= WEDGES / 2 && left > 0; d++) {
    for (const k of d === 0 ? [0] : [d, -d]) {
      const bit = 1 << (((from + k) % WEDGES) + WEDGES) % WEDGES
      if (left > 0 && top.cover & bit) { top.cover &= ~bit; left-- }
    }
  }
  top.torn = true
  if (id === 'cat') w.walk = null
  w.events.push({ type: 'tear', id, paper: top.paper, at, left: bits(top.cover) })
  if (bits(top.cover) > BURSTS_AT) return false
  burst(w, id, null)
  return true
}

/** What paper leaves on the floor: a spread that follows the count and no chance, so that a test and a still come out the same. */
function scrapsOf(w: { turn: number }, x: number, gone: readonly Layer[], each: number): Scrap[] {
  const out: Scrap[] = []
  for (const l of gone.slice(0, MAX_LAYERS)) for (let i = 0; i < each; i++) {
    w.turn += 1
    const k = (w.turn * 0.618) % 1, q = (w.turn * 0.414) % 1
    out.push({
      x: Math.max(FLOOR.left, Math.min(FLOOR.right, x + (k - 0.5) * 460)),
      y: FLOOR.top + q * (FLOOR.bottom - FLOOR.top),
      paper: l.paper,
      turn: (w.turn * 2.4) % 6.28,
    })
  }
  return out
}

/** The floor as the family will leave it. */
export function scrapsToCome(w: World): Scrap[] {
  const count = { turn: w.turn }
  return (w.visit?.todo ?? []).flatMap((id) => scrapsOf(count, specOf(w, id)?.x ?? 0, w.layers[id], 1))
}

function burst(w: World, id: Id, by: Kin | null): void {
  const s = specOf(w, id)!, layers = w.layers[id]
  const gone = by ? layers.splice(0) : layers.splice(-1)
  const scraps = scrapsOf(w, s.x, gone, by ? 1 : 3)
  w.scraps.push(...scraps)
  if (w.scraps.length > MAX_SCRAPS) w.scraps.splice(0, w.scraps.length - MAX_SCRAPS)
  w.ties = w.ties.filter((p) => !p.includes(id))
  if (by === null) {
    w.known.ripped = true
    // What the child ripped is no longer the family's to rip.
    if (w.visit) w.visit.todo = w.visit.todo.filter((x) => x !== id)
  }
  w.events.push({ type: 'burst', id, paper: gone[gone.length - 1].paper, layers: layers.length, by, at: { ...s.mid }, scraps })
  if (id === 'cat') w.walk = null
  if (isAir(id) && layers.length === 0) {
    w.events.push({ type: 'moth', at: { ...s.mid } })
    w.airs[id] = null
    for (const m of w.visit?.members ?? []) if (m.target === id) m.target = null
  }
}

export function pickPaper(w: World, paper: Paper): void {
  w.paper = paper
  w.events.push({ type: 'paper', paper })
}

/** Scraps near a finger hop out of its way. */
export function stir(w: World, at: Point): number {
  let n = 0
  for (const s of w.scraps) {
    const dx = s.x - at.x, dy = s.y - at.y, d = Math.hypot(dx, dy)
    if (d > 56) continue
    n++
    s.x = Math.max(FLOOR.left, Math.min(FLOOR.right, s.x + (d < 1 ? 1 : dx / d) * 46))
    s.y = Math.max(FLOOR.top, Math.min(FLOOR.bottom, s.y + (d < 1 ? 0 : dy / d) * 24))
    s.turn = (s.turn + 1.3) % 6.28
  }
  if (n) w.events.push({ type: 'stir', at, n })
  return n
}

// --- The mouse ---------------------------------------------------------------

/** Round its cheese, the bow, the rip and the bite. */
export const MOUSE_BEATS = { run: 0.5, bow: 2.2, rip: 3.1, bite: 3.7, end: 5 } as const

export function startMouse(w: World): void {
  if (w.mouse !== null) return
  w.mouse = 0
  w.shown = true
}

// --- The family --------------------------------------------------------------

const RUN = { aunt: 560, boy: 700, dog: 820 } as const
export const RIP_SECONDS = 0.8
export const LOOK_SECONDS = 0.75

export function openDoor(w: World): void {
  if (w.visit) return
  const todo = parcels(w)
  if (todo.length === 0) {
    w.events.push({ type: 'noses' })
    return
  }
  w.known.door = true
  w.visit = { todo, members: FAMILY.map((who, i) => ({ who, at: { x: DOORSTEP.x, y: DOORSTEP.y + i * 8 }, phase: 'wait', target: null, t: -0.2 * i })) }
  w.events.push({ type: 'visit' })
}

/** Where somebody stands to rip a thing. */
export function standAt(w: World, id: Id, who: Kin): Point {
  const s = specOf(w, id)
  if (!s) return DOORSTEP
  const side = s.x < 600 ? 1 : -1
  return { x: Math.max(80, Math.min(1120, s.x + side * (s.rx * 0.7 + (who === 'aunt' ? 30 : 10)))), y: Math.max(590, Math.min(785, s.y + 14)) }
}

function stepVisit(w: World, v: Visit): void {
  let home = 0
  for (const m of v.members) {
    m.t += STEP
    switch (m.phase) {
      case 'wait':
        if (m.t < 0.35) break
      // falls through
      case 'look': {
        if (m.phase === 'look' && m.t < LOOK_SECONDS) break
        const taken = v.members.map((x) => x.target)
        m.target = v.todo.find((id) => !taken.includes(id)) ?? null
        m.phase = m.target ? 'run' : 'home'
        m.t = 0
        break
      }
      case 'run': {
        if (!m.target || !v.todo.includes(m.target)) { m.target = null; m.phase = 'look'; m.t = 0; break }
        if (go(m, standAt(w, m.target, m.who))) { m.phase = 'rip'; m.t = 0; w.events.push({ type: 'tug', who: m.who, id: m.target }) }
        break
      }
      case 'rip': {
        const id = m.target
        if (!id || !v.todo.includes(id)) { m.target = null; m.phase = 'look'; m.t = 0; break }
        if (m.t < RIP_SECONDS) break
        v.todo = v.todo.filter((x) => x !== id)
        if (topOf(w, id)) burst(w, id, m.who)
        m.target = null
        m.phase = 'look'
        m.t = 0
        break
      }
      case 'home':
        if (go(m, DOORSTEP)) m.phase = 'gone'
        break
      case 'gone':
        home++
        break
      default:
        m.phase satisfies never
    }
  }
  if (home === v.members.length) {
    w.visit = null
    w.events.push({ type: 'out' })
  }
}
function go(m: Member, to: Point): boolean {
  const dx = to.x - m.at.x, dy = to.y - m.at.y, d = Math.hypot(dx, dy), k = RUN[m.who] * STEP
  if (d <= k) { m.at = { ...to }; return true }
  m.at = { x: m.at.x + (dx / d) * k, y: m.at.y + (dy / d) * k }
  return false
}

// --- Time --------------------------------------------------------------------

export const WALK = { start: 0.9, there: 2.4, back: 4.2 } as const

export function step(w: World): void {
  w.closing += STEP
  if (w.closing >= CLOSE_EVERY) {
    w.closing = 0
    for (const id of IDS) {
      const top = topOf(w, id)
      if (!top || top.torn || top.cover === FULL || bits(top.cover) < CLOSES_FROM) continue
      for (let i = 0; i < WEDGES; i++) if (!(top.cover & (1 << i))) { lay(w, id, i); break }
    }
  }
  if (w.walk !== null) {
    const home = SPECS.cat.x, before = w.walk
    w.walk += STEP
    const t = w.walk
    const out = Math.max(0, Math.min(1, (t - WALK.start) / (WALK.there - WALK.start)))
    const back = Math.max(0, Math.min(1, (t - WALK.there - 0.4) / (WALK.back - WALK.there - 0.4)))
    w.catX = home + (BUMP_X - home) * (out - back)
    if (before < WALK.there && t >= WALK.there) w.events.push({ type: 'bump' })
    if (t >= WALK.back) { w.walk = null; w.catX = home; w.events.push({ type: 'sit' }) }
  }
  // A walk that was cut short: it shuffles home, faster out of its paper.
  else if (w.catX !== SPECS.cat.x) {
    const left = SPECS.cat.x - w.catX, k = STEP * (w.layers.cat.length ? 90 : 420)
    w.catX = Math.abs(left) <= k ? SPECS.cat.x : w.catX + Math.sign(left) * k
  }
  if (w.mouse !== null) {
    const before = w.mouse
    w.mouse += STEP
    Object.values(MOUSE_BEATS).forEach((at, beat) => { if (before < at && w.mouse! >= at) w.events.push({ type: 'squeak', beat }) })
    if (w.mouse >= MOUSE_BEATS.end) w.mouse = null
  }
  if (w.visit) stepVisit(w, w.visit)
}

/** Nothing is under way that the child should watch before a hand shows anything. */
export const quiet = (w: World): boolean => w.visit === null && w.walk === null && w.mouse === null

/** What a test holds the room to at every moment. */
export function faults(w: World): string[] {
  const out: string[] = []
  for (const id of IDS) {
    const layers = w.layers[id]
    if (layers.length > MAX_LAYERS) out.push(`${id} has ${layers.length} papers`)
    layers.forEach((l, i) => { if (i < layers.length - 1 && (l.cover !== FULL || l.torn)) out.push(`${id} has an open paper under another`) })
    if (isAir(id) && (w.airs[id] === null) !== (layers.length === 0)) out.push(`${id} is there without paper, or paper without it`)
  }
  if (w.scraps.length > MAX_SCRAPS) out.push('too many scraps')
  for (const [a, b] of w.ties) if (!topOf(w, a) || !topOf(w, b)) out.push(`${a} and ${b} are tied without paper`)
  if (w.ties.flat().length !== new Set(w.ties.flat()).size) out.push('tied twice')
  return out
}
