import { ForgivingTouch, type Gesture, type Point } from './input'
import { DOOR, IDS, MOUSE, MOUSE_R, ROLLS, ROLL_R, inRect, reach, wedgeAt, type Id, type Paper } from './layout'
import { STEP, closeNow, eat, isParcel, isTearing, lay, openDoor, pickPaper, specOf, startMouse, step, stir, tear, thingAt, tie, topOf, unlay, wrapNothing, type World } from './model'

// The Mount's path with no browser in it: fingers land, move, lift and are
// taken away here, in stage units, and the game plays its time here. The Mount
// and the tests make the same calls.
// - Everything happens while the finger is down: a wedge is laid or torn as
//   the finger gets there, and a lift decides nothing. So a lift, a slip or a
//   finger that is taken away loses nothing and does nothing.
// - A finger that lands on a finished parcel tears it. One that lands anywhere
//   else has paper in hand.
// - A finger works on one thing at a time. Another joins only when the finger
//   has gone all the way round it, or has gone over to it.

export type Touched = { kind: 'thing'; id: Id } | { kind: 'roll'; paper: Paper } | { kind: 'door' } | { kind: 'mouse' } | { kind: 'room' }
/** A finger landed: for the view and the sound, whatever else it did. */
export type Poke = { touched: Touched; at: Point }

/** How far apart a moving finger is read. */
const SAMPLE = 14
/** A finger this near the middle, as a share of the reach, is on the thing; or well on it, once the finger has finished another. */
const ON = 0.95
const DEEP = 0.7
/** The share of a turn after which the finger is going round a thing. */
const ABOUT = 0.2
/** Further away than this, paper does not go onto it. Nearer the middle than this, a finger is in no wedge. */
const LEFT = 1.75
const MIDDLE = 0.12
/** The share of a whole turn that counts as all the way round. */
export const ROUND = 0.9
/** How far a tearing finger goes for each wedge. */
const TEAR_EVERY = 26
/** Wedges a finger lays or tears where it lands. */
export const PATCH = 3
/** How long a resting finger keeps the next one out, in ms. */
export const REST_MS = 1000
/** A finger that stays within this is resting; a slow one is further before the time is up. */
const REST_REACH = 18

type Stroke = {
  mode: 'wrap' | 'tear' | 'over'
  focus: Id | null
  /** Finished by this finger: it lays nothing more on them. */
  done: Set<Id>
  /** Turns about the middle of each thing, signed. */
  turns: Map<Id, number>
  path: Point[]
  touchedAny: boolean
  torn: number
  /** What this finger has laid on the thing it is at. */
  laid: number[]
}

export class Play {
  readonly touch = new ForgivingTouch()
  /** Where the paper in hand is, while there is some. */
  hand: Point | null = null
  stroke: Stroke | null = null
  pokes: Poke[] = []
  changed = false
  private at: Point = { x: 0, y: 0 }
  private pressed: Touched | null = null
  /** The working finger: when it last got anywhere, and from where. */
  private landed = { id: -1, at: { x: 0, y: 0 }, moved: 0 }
  private owed = 0
  private began = 0

  constructor(readonly world: World) {}

  down(id: number, at: Point, t: number): void {
    // A finger that has lain still for a second hands the work to the next one that lands.
    if (this.touch.active && this.touch.holds(this.landed.id) && this.landed.id !== id && t - this.landed.moved > REST_MS) this.act(this.touch.cancel(this.landed.id))
    if (this.touch.active && this.touch.holds(this.landed.id)) {
      this.pokes.push({ touched: { kind: 'room' }, at })
      return
    }
    this.landed = { id, at, moved: t }
    this.act(this.touch.down(id, at, t))
  }

  move(id: number, at: Point, t = this.landed.moved): void {
    if (!this.touch.holds(id)) return
    if (Math.hypot(at.x - this.landed.at.x, at.y - this.landed.at.y) > REST_REACH) { this.landed.at = at; this.landed.moved = t }
    this.act(this.touch.move(id, at))
  }

  up(id: number, at: Point, t: number): void {
    this.act(this.touch.up(id, at, t))
    this.act(this.touch.letGo())
  }

  cancel(id: number): void { this.act(this.touch.cancel(id)) }
  clear(): void { this.act(this.touch.clear()) }

  advance(seconds: number): void {
    this.owed += seconds
    this.began += seconds
    // The mouse shows the whole of it once, before anybody has touched anything.
    if (!this.world.shown && this.began > 0.5) { startMouse(this.world); this.changed = true }
    while (this.owed >= STEP) {
      this.owed -= STEP
      const before = this.world.events.length
      step(this.world)
      if (this.world.events.slice(before).some((e) => e.type === 'bow' || e.type === 'burst' || e.type === 'lay')) this.changed = true
    }
  }

  under(at: Point): Touched {
    const roll = ROLLS.findIndex((r) => Math.hypot(at.x - r.x, at.y - r.y) <= ROLL_R + 6)
    if (roll >= 0) return { kind: 'roll', paper: roll as Paper }
    const id = thingAt(this.world, at)
    if (id) return { kind: 'thing', id }
    if (inRect(DOOR, at, 10)) return { kind: 'door' }
    if (Math.hypot(at.x - MOUSE.x, at.y - MOUSE.y) <= MOUSE_R) return { kind: 'mouse' }
    return { kind: 'room' }
  }

  private act(gestures: Gesture[]): void {
    for (const g of gestures) {
      switch (g.type) {
        case 'press': this.press(g.at); break
        case 'tap':
          if (this.pressed?.kind === 'room') { if (eat(this.world, g.at)) this.changed = true }
          if (this.pressed?.kind === 'door') { openDoor(this.world); this.changed = true }
          this.end()
          break
        case 'dragStart': break
        case 'dragMove': this.drag(g.at); break
        case 'dragLift': break
        case 'pressEnd': case 'dragEnd': case 'dragCancel': this.end(); break
        default: g satisfies never
      }
    }
  }

  private press(at: Point): void {
    const w = this.world, on = this.under(at)
    this.at = at
    this.pressed = on
    w.shown = true
    w.mouse = null
    this.pokes.push({ touched: on, at })
    this.stroke = { mode: 'wrap', focus: null, done: new Set(), turns: new Map(), path: [at], touchedAny: on.kind !== 'room', torn: 0, laid: [] }
    this.changed = true
    switch (on.kind) {
      case 'roll':
        pickPaper(w, on.paper)
        this.hand = at
        break
      case 'mouse':
        startMouse(w)
        this.stroke.mode = 'over'
        break
      case 'door':
        break
      case 'room':
        this.hand = at
        break
      case 'thing':
        if (isParcel(w, on.id) || isTearing(w, on.id)) {
          this.stroke.mode = tear(w, on.id, at, PATCH) ? 'over' : 'tear'
          this.stroke.focus = on.id
          break
        }
        this.hand = at
        this.stroke.focus = on.id
        this.patch(on.id, at)
        break
      default: on satisfies never
    }
  }

  private end(): void {
    this.stroke = null
    this.hand = null
    this.pressed = null
  }

  /** The wedges where a finger lands; where those are covered, the nearest bare ones, so tapping one spot wraps too. */
  private patch(id: Id, at: Point): void {
    const s = specOf(this.world, id)!, from = wedgeAt(s, at)
    let left = PATCH
    for (let d = 0; d <= 8 && left > 0; d++) for (const k of d === 0 ? [0] : [d, -d]) if (left > 0 && !isParcel(this.world, id) && lay(this.world, id, from + k)) { left--; this.stroke?.laid.push(from + k) }
    this.finished(id)
  }

  private finished(id: Id): void {
    if (isParcel(this.world, id)) this.stroke?.done.add(id)
  }

  private drag(to: Point): void {
    const from = this.at, s = this.stroke
    if (!s) return
    const before = this.world.events.length
    const d = Math.hypot(to.x - from.x, to.y - from.y), n = Math.max(1, Math.ceil(d / SAMPLE))
    for (let i = 1; i <= n; i++) {
      const a = { x: from.x + ((to.x - from.x) * (i - 1)) / n, y: from.y + ((to.y - from.y) * (i - 1)) / n }
      const b = { x: from.x + ((to.x - from.x) * i) / n, y: from.y + ((to.y - from.y) * i) / n }
      if (s.mode === 'wrap') this.wrap(s, a, b)
      else if (s.mode === 'tear') this.rip(s, b, d / n)
    }
    this.at = to
    if (s.mode === 'wrap') this.hand = to
    else this.hand = null
    if (this.world.events.length > before) this.changed = true
  }

  private rip(s: Stroke, at: Point, d: number): void {
    const id = s.focus
    if (!id || !isTearing(this.world, id)) { s.mode = 'over'; return }
    s.torn += d
    if (s.torn < TEAR_EVERY) return
    s.torn = 0
    if (tear(this.world, id, at, 1)) s.mode = 'over'
  }

  private wrap(s: Stroke, a: Point, b: Point): void {
    const w = this.world
    s.path.push(b)
    if (s.path.length > 400) s.path.shift()
    for (const id of IDS) {
      const spec = specOf(w, id)
      if (!spec) continue
      const p = Math.atan2(a.y - spec.mid.y, a.x - spec.mid.x), q = Math.atan2(b.y - spec.mid.y, b.x - spec.mid.x)
      let d = q - p
      if (d > Math.PI) d -= Math.PI * 2
      if (d < -Math.PI) d += Math.PI * 2
      s.turns.set(id, (s.turns.get(id) ?? 0) + d / (Math.PI * 2))
    }
    this.aim(s, b)
    const id = s.focus
    if (id && !s.done.has(id)) {
      const spec = specOf(w, id), far = spec ? reach(spec, b) : LEFT
      if (spec && far > MIDDLE && far < LEFT) this.put(s, id, wedgeAt(spec, b))
    }
    this.encircled(s)
    stir(w, b)
  }

  /** Which thing the paper in hand goes onto: one the finger is on, or one it is going round. */
  private aim(s: Stroke, at: Point): void {
    const w = this.world, now = s.focus
    if (now && isParcel(w, now)) s.done.add(now)
    const turn = (id: Id) => Math.abs(s.turns.get(id) ?? 0)
    const working = now !== null && !s.done.has(now) && specOf(w, now) !== null
    const here = working ? reach(specOf(w, now)!, at) : 0
    let best: Id | null = null, most = 0
    for (const id of IDS) {
      const t = specOf(w, id)
      if (!t || s.done.has(id) || id === now) continue
      const far = reach(t, at), gone = turn(id)
      const on = working ? far < 0.8 && here > 1.25 : far < (s.done.size ? DEEP : ON)
      const about = far < LEFT && gone >= (working ? Math.max(0.3, turn(now) + 0.15) : s.done.size ? 0.5 : ABOUT)
      const rank = (about ? 1 + gone : 0) + (on ? 1 - far * 0.5 : 0)
      if ((on || about) && rank > most) { most = rank; best = id }
    }
    if (!best) return
    // Paper that only just touched a neighbour on the way comes along off it.
    if (working && s.laid.length <= PATCH + 2) { unlay(w, now, s.laid); this.changed = true }
    s.laid = []
    s.focus = best
    s.touchedAny = true
    const spec = specOf(w, best)!
    for (const p of s.path) { const far = reach(spec, p); if (far > MIDDLE && far < LEFT) this.put(s, best, wedgeAt(spec, p)) }
    this.finished(best)
  }

  private put(s: Stroke, id: Id, wedge: number): void {
    if (!s.done.has(id) && lay(this.world, id, wedge)) { s.laid.push(wedge); this.finished(id) }
  }

  /** What the finger has gone all the way round. */
  private encircled(s: Stroke): void {
    const w = this.world
    // A finger going to and fro over a thing turns about its middle too, so only a path that has kept clear of it counts.
    const round = IDS.filter((id) => specOf(w, id) && Math.abs(s.turns.get(id) ?? 0) >= ROUND && s.path.filter((p) => reach(specOf(w, id)!, p) < 0.45).length < 3)
    for (const id of round) {
      s.touchedAny = true
      if (s.done.has(id)) continue
      if (!isParcel(w, id) || w.layers[id].length < 3) closeNow(w, id)
      s.done.add(id)
    }
    for (const a of round) for (const b of round) if (a < b && s.done.has(a) && s.done.has(b) && topOf(w, a) && topOf(w, b)) tie(w, a, b)
    if (s.touchedAny || s.path.length < 12) return
    const n = s.path.length
    const c = { x: 0, y: 0 }
    for (const p of s.path) { c.x += p.x / n; c.y += p.y / n }
    let turn = 0, r = 0
    for (let i = 0; i < n; i++) {
      r += Math.hypot(s.path[i].x - c.x, s.path[i].y - c.y) / n
      if (i === 0) continue
      let d = Math.atan2(s.path[i].y - c.y, s.path[i].x - c.x) - Math.atan2(s.path[i - 1].y - c.y, s.path[i - 1].x - c.x)
      if (d > Math.PI) d -= Math.PI * 2
      if (d < -Math.PI) d += Math.PI * 2
      turn += d
    }
    if (Math.abs(turn) < Math.PI * 2 * ROUND || r < 24) return
    s.done.add(wrapNothing(w, c, r))
    s.mode = 'over'
  }
}
