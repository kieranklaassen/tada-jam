import type { Note } from './audio'
import { Body } from './bodies'
import type { Gesture, Point } from './input'
import { BULB_COLOURS, NATURE, contentsOf, type Kind, type Puff } from './kinds'
import { BODIES, BOX, CATCH, CRANK, DOG_MOUTH, FLY, NOSES, GROUND, HOME, HOOK, HOOKS, HOST_IDS, LOOP_FLY, MOUTH, OUTLETS, SNOW, SWITCH, type Hook, type HostId } from './layout'
import { SPACING, layPath, makePath, nearestSpan, pointAt } from './path'
import type { Saved } from './save'
import * as voices from './voices'

// The rules. A finger, a tap, the opening round and a load all go through the
// same few acts: hang, light, wind back. There is no browser in here.

/** A thing belongs to the place it lies nearest to, if that is nearer than this along the string. */
export const HOLD = 104
export const THINGS = 120
/** How fast the light runs along the string, how long the hosts then take turns, and one turn. */
const LIGHT_SPEED = 950
export const SHOW_SECONDS = 11
const TURN_SECONDS = 1.05
const END_REACH = 76
const THING_REACH = 52
const STRING_REACH = 34

export type Thing = { kind: Kind; colour: string; swing: number; speed: number; size: number; grow: number; light: number; act: number; x: number; y: number; from: number; host: HostId | null; out: boolean }
export type Bit = { kind: Puff; x: number; y: number; vx: number; vy: number; t: number; life: number; colour: string; size: number }
type End = { mode: 'home' | 'hook' | 'snow' | 'hand' | 'fly'; x: number; y: number }
type Flight = { fx: number; fy: number; tx: number; ty: number; t: number; seconds: number; then: 'home' | 'hook' | 'snow' | 'caught'; hook: string | null }
type Loop = { span: number; x: number; y: number; t: number; held: boolean; fx: number; fy: number; hook: string | null }
export type Want = { act: 'hang'; hook: Hook } | { act: 'press' } | null

export class Play {
  readonly hooks: string[]
  readonly end: End = { mode: 'home', x: HOME.x, y: HOME.y }
  readonly things: Thing[] = []
  readonly bodies: Readonly<Record<HostId, Body>> = { moose: new Body('moose'), house: new Body('house'), tree: new Body('tree'), dog: new Body('dog') }
  readonly path = makePath()
  readonly bits: Bit[] = []
  loop: Loop | null = null
  lit: boolean
  litFor: number
  seed: number
  crank: boolean
  shown: boolean
  /** How far the next thing is out of the box, 0 to 1. */
  strain = 0
  /** Springs of the box and the switch, and the crank's turn. */
  readonly box = { squash: 0, speed: 0, lean: 0 }
  pressed = 0
  crankTurn = 0
  /** The finger, while it is down. */
  finger: Point | null = null
  /** The opening round: its seconds, or null. */
  round: number | null = null
  readonly ghost = { x: 0, y: 0, press: 0, opacity: 0 }
  peek = 9
  stars = 0
  /** Where a touch on nothing was answered, and how long ago. */
  readonly twinkle = { x: 0, y: 0, t: 9 }
  clock = 0
  private flight: Flight | null = null
  private winding = false
  private wound = false
  /** The switch has been pressed since the string last caught on something. */
  private triedIt = false
  /** What the finger has hold of. */
  held: 'end' | 'loop' | null = null
  private before: { hooks: string[]; x: number; y: number; mode: End['mode']; triedIt: boolean } | null = null
  private lead = { x: 0, y: 0 }
  private queue: Note[][] = []
  private dirty = false
  private turnClock = 0
  private turnAt = 0
  private popped = 0
  private readonly twangs: number[] = []
  private readonly points: Point[] = []
  private readonly spots: Point[] = Array.from({ length: 20 }, () => ({ x: 0, y: 0 }))
  private readonly scratch: Point = { x: 0, y: 0 }
  private lastStrain = 0

  constructor(saved: Saved) {
    this.seed = saved.seed
    this.hooks = [...saved.hooks]
    this.lit = saved.lit
    this.litFor = saved.lit ? 99 : 0
    this.crank = saved.crank
    this.shown = saved.shown
    this.triedIt = saved.lit
    this.fill()
    for (const id of HOST_IDS) this.bodies[id].step(0, this.lit)
    if (saved.snow !== null) this.setEnd('snow', Math.min(SNOW.right, Math.max(SNOW.left, saved.snow)), GROUND)
    else if (this.hooks.length) this.endOnHook()
    this.lay()
    this.feed(true, true)
    for (const thing of this.things) { thing.size = 1; thing.light = thing.out && this.lit ? 1 : 0 }
    if (!this.shown && this.hooks.length === 0) { this.round = 0; this.shown = true; this.dirty = true }
  }

  get saved(): Saved {
    let hooks = [...this.hooks]
    let snow = this.end.mode === 'snow' ? this.end.x : null
    let seed = this.seed
    const flight = this.flight
    if (flight?.then === 'caught' && flight.hook) hooks.push(flight.hook)
    if (flight?.then === 'snow') snow = flight.tx
    if (this.winding) { hooks = []; snow = null }
    if (this.wound && hooks.length === 0 && this.end.mode !== 'hand') seed += 1
    if (this.loop?.hook && !this.loop.held) hooks.splice(this.loop.span, 0, this.loop.hook)
    if (this.end.mode === 'hand' && this.before?.mode === 'snow') snow = this.before.x
    return { v: 1, seed, hooks, snow, lit: this.lit, shown: this.shown, crank: this.crank }
  }
  changed(): boolean { const was = this.dirty; this.dirty = false; return was }
  voices(): Note[][] { const out = this.queue; this.queue = []; return out }
  get busy(): boolean { return this.round !== null || this.held !== null || this.flight !== null || this.winding || (this.lit && this.litFor < SHOW_SECONDS) }
  /** The string, the light and every host are still. */
  get steady(): boolean { return !this.busy && this.loop === null }

  want(): Want {
    if (this.hooks.length > 0 && !this.lit && !this.triedIt) return { act: 'press' }
    const hook = this.nextHook()
    return hook ? { act: 'hang', hook } : null
  }
  nextHook(): Hook | null { return HOOKS.find((hook) => this.free(hook.id)) ?? null }
  free(id: string): boolean { return !this.hooks.includes(id) && this.flight?.hook !== id && this.loop?.hook !== id }
  hookAt(hook: Hook, out: Point = this.scratch): Point { return this.bodies[hook.host].hook(hook, out) }

  // --- Touch ---------------------------------------------------------------

  act(gestures: readonly Gesture[]): void {
    for (const gesture of gestures) {
      switch (gesture.type) {
        case 'press': {
          const running = this.winding || (this.round !== null && this.held !== null)
          this.endRound(); this.finger = { ...gesture.at }
          if (this.winding) { this.winding = false; this.land() }
          this.spent = running
          this.press(gesture.at)
          break
        }
        case 'tap': this.finger = null; this.tap(gesture.at); break
        case 'pressEnd': this.finger = null; break
        case 'dragStart': this.take(gesture.from); break
        case 'dragMove': this.finger = { ...gesture.at }; this.drag(gesture.at); break
        case 'dragLift': break
        case 'dragEnd': this.finger = null; this.drop(); break
        case 'dragCancel': this.finger = null; this.putBack(); break
        default: gesture satisfies never
      }
    }
  }

  /** What a point is on. */
  hit(at: Point): { on: 'switch' | 'crank' | 'end' | 'box' | 'string' | 'sky' } | { on: 'thing'; index: number } | { on: 'hook'; hook: Hook } | { on: 'host'; host: HostId } {
    if (this.onEnd(at)) return { on: 'end' }
    if (Math.hypot(at.x - SWITCH.x, at.y - SWITCH.y) < SWITCH.r + 10) return { on: 'switch' }
    if (this.crank && Math.hypot(at.x - CRANK.x, at.y - CRANK.y) < CRANK.r + 6) return { on: 'crank' }
    if (at.x > BOX.left && at.x < BOX.right && at.y > BOX.top - 70 && at.y < BOX.bottom + 20) return { on: 'box' }
    let best = THING_REACH, index = -1
    for (let i = 1; i < this.things.length; i++) {
      const thing = this.things[i]
      if (!thing.out) break
      const d = Math.hypot(at.x - thing.x, at.y - thing.y - 42)
      if (d < best) { best = d; index = i }
    }
    if (index >= 0) return { on: 'thing', index }
    for (const hook of HOOKS) if (this.free(hook.id) && near(this.hookAt(hook), at, 56)) return { on: 'hook', hook }
    if (this.hooks.length > 0 && nearestSpan(this.path, at).distance < STRING_REACH) return { on: 'string' }
    for (const host of ['dog', 'moose', 'house', 'tree'] as const) {
      for (const [x, y, rx, ry] of BODIES[host]) if (((at.x - x) / rx) ** 2 + ((at.y - y) / ry) ** 2 < 1) return { on: 'host', host }
    }
    return { on: 'sky' }
  }
  private onEnd(at: Point): boolean { return near(this.end, at, END_REACH) || Math.hypot(at.x - this.end.x, at.y - this.end.y - 40) < 62 }

  private press(at: Point): void {
    const hit = this.hit(at)
    switch (hit.on) {
      case 'switch': this.flip(true); break
      case 'crank': this.turnCrank(); break
      case 'end': this.nudge(0, 3); this.say(voices.grab); this.box.speed -= 1.2; break
      case 'box': this.box.speed += 5; this.say(voices.creak(0.4)); break
      case 'thing': this.poke(hit.index); break
      case 'hook': this.bodies[hit.hook.host].tickled = 0; if (hit.hook.host === 'tree') this.shed(); this.say(voices.tickle(hit.hook.host)); break
      case 'string': { const span = nearestSpan(this.path, at).span; this.twangs[span] = 1; this.say(voices.twang); break }
      case 'host': this.touchHost(hit.host); break
      case 'sky': this.twinkle.x = at.x; this.twinkle.y = at.y; this.twinkle.t = 0; this.stars += 1; this.say(at.y > 700 ? voices.snow : voices.star(this.stars)); break
    }
  }

  private tap(at: Point): void {
    const hit = this.hit(at)
    if (this.held || this.winding || this.spent) return
    if (hit.on === 'end' || hit.on === 'box') {
      if (this.flight) this.land()
      const hook = this.nextHook()
      if (hook) this.flyToHook(hook)
      else { this.peek = 0; this.say(voices.rattle) }
    } else if (hit.on === 'hook') {
      if (this.flight) this.land()
      if (this.free(hit.hook.id)) this.flyToHook(hit.hook)
    } else if (hit.on === 'host' && !this.hooks.some((id) => HOOK.get(id)!.host === hit.host)) {
      if (this.flight) this.land()
      const hook = this.nearestFree(at, Infinity, hit.host)
      if (hook) this.flyToHook(hook)
    }
  }

  private take(from: Point): void {
    this.settleLoop()
    let hit = this.hit(from)
    if (!['end', 'box', 'string', 'thing'].includes(hit.on)) return
    if (this.flight) {
      const onEnd = hit.on === 'end'
      this.land()
      if (!onEnd) hit = this.hit(from)
    }
    this.caughtNow = []
    this.before = { hooks: [...this.hooks], x: this.end.x, y: this.end.y, mode: this.end.mode, triedIt: this.triedIt }
    const bare = this.hooks.length === 0
    if (hit.on === 'end' || (hit.on === 'box' && bare)) { this.held = 'end'; this.loop = null; this.setEnd('hand', this.end.x, this.end.y); return }
    if (bare) return
    let span = -1
    if (hit.on === 'box') span = 0
    else if (hit.on === 'string') span = nearestSpan(this.path, from).span
    else if (hit.on === 'thing') span = this.spanOf(this.things[hit.index].from)
    if (span < 0) return
    this.held = 'loop'
    this.loop = { span, x: from.x, y: from.y, t: 0, held: true, fx: 0, fy: 0, hook: null }
  }

  private drag(at: Point): void {
    if (this.held === 'end') {
      this.end.x = Math.min(1170, Math.max(10, at.x)); this.end.y = Math.min(GROUND, Math.max(10, at.y))
      for (const hook of HOOKS) if (this.free(hook.id) && near(this.hookAt(hook), this.end, CATCH)) { this.catchOn(hook, this.hooks.length); break }
    } else if (this.held === 'loop' && this.loop) {
      this.loop.x = at.x; this.loop.y = Math.min(GROUND, at.y)
      for (const hook of HOOKS) if (this.free(hook.id) && near(this.hookAt(hook), this.loop, CATCH)) { this.catchOn(hook, this.loop.span); this.loop.span += 1; break }
    } else if (this.round === null && this.finger) {
      this.twinkle.x = at.x; this.twinkle.y = at.y; this.twinkle.t = Math.min(this.twinkle.t, 0.2)
    }
  }

  private drop(): void {
    const hold = this.held
    this.held = null
    if (hold === 'end') {
      const { x, y } = this.end
      this.end.mode = 'snow'
      if (x > BOX.left - 30 && x < BOX.right + 10 && y > BOX.top - 6) { this.windAll(); this.before = null; return }
      const last = this.hooks.length ? this.hookAt(HOOK.get(this.hooks[this.hooks.length - 1])!, { x: 0, y: 0 }) : null
      const hook = this.nearestFree(this.end, FLY)
      if (last && near(last, this.end, CATCH * 1.3)) this.fly(last.x, last.y, 'hook', null)
      else if (hook) this.flyToHook(hook)
      else if (!last && near(HOME, this.end, 130)) this.fly(HOME.x, HOME.y, 'home', null)
      else this.fly(Math.min(SNOW.right, Math.max(SNOW.left, x)), GROUND, 'snow', null)
      this.dirty = true
    } else if (hold === 'loop' && this.loop) {
      const loop = this.loop, hung = this.caughtNow.some((id) => near(this.hookAt(HOOK.get(id)!), loop, CATCH * 1.5))
      const hook = hung ? null : this.nearestFree(this.loop, LOOP_FLY)
      this.loop.held = false; this.loop.t = 0; this.loop.fx = this.loop.x; this.loop.fy = this.loop.y
      if (hook) { this.loop.hook = hook.id; this.dirty = true } else { this.twangs[this.loop.span] = 1; this.say(voices.twang) }
    }
    this.before = null
  }

  /** The browser took the finger: nothing the drag did stays. */
  private putBack(): void {
    const before = this.before, hold = this.held
    this.held = null; this.before = null
    if (!before || !hold) return
    this.hooks.splice(0, this.hooks.length, ...before.hooks)
    this.triedIt = before.triedIt
    this.loop = null
    if (hold === 'end') {
      if (before.mode === 'hook') this.endOnHook()
      else this.setEnd(before.mode === 'snow' ? 'snow' : 'home', before.mode === 'snow' ? before.x : HOME.x, before.mode === 'snow' ? GROUND : HOME.y)
    } else if (this.end.mode === 'hook') this.endOnHook()
    this.lay(); this.feed(true, true)
    this.dirty = true
  }

  // --- The acts --------------------------------------------------------------

  private catchOn(hook: Hook, index: number): void {
    this.hooks.splice(index, 0, hook.id)
    this.caughtNow.push(hook.id)
    if (hook.host === 'tree') this.shed()
    const body = this.bodies[hook.host]
    body.dip = 0; body.tickled = 0
    this.twangs[index] = 1
    this.triedIt = this.lit
    this.say(voices.caught(hook.host))
    this.dirty = true
  }
  private flyToHook(hook: Hook): void {
    const to = this.hookAt(hook, { x: 0, y: 0 })
    this.fly(to.x, to.y, 'caught', hook.id)
    this.dirty = true
  }
  private fly(tx: number, ty: number, then: Flight['then'], hook: string | null): void {
    const { x, y } = this.end, far = Math.hypot(tx - x, ty - y)
    this.end.mode = 'fly'
    this.flight = { fx: x, fy: y, tx, ty, t: 0, seconds: Math.min(0.75, 0.18 + far / 900), then, hook }
    this.say(voices.zip)
  }
  private land(): void {
    const flight = this.flight
    if (!flight) return
    this.flight = null
    this.setEnd('snow', flight.tx, flight.ty)
    if (flight.then === 'caught') { const hook = HOOK.get(flight.hook!)!; this.catchOn(hook, this.hooks.length); this.endOnHook() }
    else if (flight.then === 'hook') this.endOnHook()
    else if (flight.then === 'home') this.arriveHome()
    else this.say(voices.snow)
    this.dirty = true
    this.lay(); this.feed(true, false)
  }
  private arriveHome(): void {
    this.setEnd('home', HOME.x, HOME.y)
    this.say(voices.rattle)
    this.box.speed += 7
    if (this.wound && this.hooks.length === 0) { this.seed += 1; this.fill(); this.triedIt = this.lit }
    this.wound = false; this.winding = false
    this.lay(); this.feed(true, true)
    this.dirty = true
  }
  private setEnd(mode: End['mode'], x: number, y: number): void { this.end.mode = mode; this.end.x = x; this.end.y = y }
  private endOnHook(): void {
    const id = this.hooks[this.hooks.length - 1]
    if (!id) { this.setEnd('home', HOME.x, HOME.y); return }
    this.hookAt(HOOK.get(id)!, this.end)
    this.end.mode = 'hook'
  }

  /** Takes the string back one place. */
  private retract(): void {
    this.wound = true
    if (this.end.mode === 'hook') this.hooks.pop()
    const id = this.hooks[this.hooks.length - 1]
    if (id) { const to = this.hookAt(HOOK.get(id)!, { x: 0, y: 0 }); this.fly(to.x, to.y, 'hook', null) } else this.fly(HOME.x, HOME.y, 'home', null)
    this.dirty = true
  }
  private windAll(): void {
    this.settleLoop()
    if (!this.hooks.length) { this.wound = this.before?.mode === 'snow'; this.fly(HOME.x, HOME.y, 'home', null); this.dirty = true; return }
    this.winding = true
    this.retract()
  }
  /** A loop that is on its way arrives now: on its place, or back in line. */
  private settleLoop(): void {
    const loop = this.loop
    if (!loop || loop.held) return
    this.loop = null
    if (loop.hook) { this.catchOn(HOOK.get(loop.hook)!, Math.min(loop.span, this.hooks.length)); if (this.end.mode === 'hook') this.endOnHook() }
    this.lay(); this.feed(true, false)
  }
  /** Snow off the tree. */
  private shed(): void { for (const [x, y] of [[110, 226], [214, 222], [86, 348], [240, 330]]) this.puff('snow', x, y, 'white', 2, 1) }
  private turnCrank(): void {
    this.crankTurn += Math.PI * 1.5
    this.say(voices.ratchet)
    this.settleLoop()
    if (this.flight) this.land()
    if (this.held) return
    if (this.hooks.length || this.end.mode === 'snow') this.retract()
    else { this.box.speed += 4; this.say(voices.rattle) }
  }

  /** The switch. `child` is false when the opening round presses it. */
  flip(child: boolean): void {
    this.pressed = 1
    this.lit = !this.lit
    this.litFor = 0
    this.turnClock = 0; this.turnAt = 0
    this.say(this.lit ? voices.switchOn : voices.switchOff)
    if (this.lit) {
      if (child && this.hooks.length) this.crank = true
      if (this.hooks.length) this.triedIt = true
    } else for (const id of HOST_IDS) this.bodies[id].kind = null
    this.dirty = true
  }

  private poke(index: number): void {
    const thing = this.things[index]
    this.nudge(index, (index % 2 ? 1 : -1) * 4)
    if (thing.light > 0.5) { this.wake(index); if (thing.host) this.turn(index) } else this.say(voices.mutter(thing.kind))
  }
  private touchHost(host: HostId): void {
    const mine = this.lit ? this.on(host) : []
    if (mine.length) { this.turnAt = (this.turnAt + 1) % 97; this.turn(mine[this.turnAt % mine.length]); return }
    this.bodies[host].tickled = 0
    if (host === 'tree') this.shed()
    this.say(voices.tickle(host))
  }
  /** The things that lie on a host, by their number. */
  on(host: HostId): number[] {
    const list: number[] = []
    this.things.forEach((thing, i) => { if (thing.out && thing.host === host) list.push(i) })
    return list
  }
  private wake(index: number): void {
    const thing = this.things[index]
    thing.act = 0
    this.nudge(index, index % 2 ? 3 : -3)
    this.say(voices.wake(thing.kind))
    this.puff(NATURE[thing.kind].puff, thing.x, thing.y + 40, thing.colour, 2, 0.8)
  }
  /** A host does what lies on it. */
  private turn(index: number): void {
    const thing = this.things[index], host = thing.host!
    thing.act = 0
    this.turned = index
    this.bodies[host].act(thing.kind, thing.colour)
    this.say(voices.turn(thing.kind, host))
    const size = host === 'dog' ? 0.8 : host === 'moose' ? 1.3 : 1.1
    if (host === 'dog' && thing.kind === 'hen') { this.bits.push({ kind: 'hatch', x: 1074, y: 560, vx: 0, vy: 0, t: 0, life: 2.6, colour: 'white', size: 1.5 }); return }
    const outlets = thing.kind === 'uncle' ? [NOSES[host]] : host === 'dog' && thing.kind !== 'kettle' ? [DOG_MOUTH] : OUTLETS[host]
    for (const outlet of outlets) { const at = this.bodies[host].place(outlet.x, outlet.y, 0, { x: 0, y: 0 }); this.puff(NATURE[thing.kind].puff, at.x, at.y, thing.colour, thing.kind === 'uncle' ? 1 : 4, size) }
  }

  private nudge(index: number, speed: number): void { const thing = this.things[index]; if (thing) thing.speed += speed }
  private say(notes: Note[]): void { if (this.queue.length < 12) this.queue.push(notes) }
  private puff(kind: Puff, x: number, y: number, colour: string, n: number, size: number): void {
    for (let i = 0; i < n && this.bits.length < 90; i++) {
      const a = this.seedless(i), spread = (a - 0.5) * 2
      const up = kind === 'egg' || kind === 'drop' || kind === 'dust' || kind === 'snow' ? -60 - 80 * this.seedless(i + 7) : -70 - 90 * this.seedless(i + 3)
      this.bits.push({ kind, x: x + spread * 12, y, vx: spread * 110, vy: up, t: -0.06 * i, life: kind === 'snore' ? 1.6 : 1 + 0.5 * a, colour, size: size * (0.8 + 0.5 * a) })
    }
  }
  /** Scatter that is the same on every machine: decoration only, nothing a rule reads. */
  private scatter = 0
  /** The touch under way was spent on stopping something, so its lift hangs nothing. */
  private spent = false
  /** What was caught by the drag under way. */
  private caughtNow: string[] = []
  /** The thing that last had a turn. */
  turned = -1
  private seedless(i: number): number { this.scatter = (this.scatter + 1) % 4096; const s = Math.sin((this.scatter + i * 17.3) * 12.9898) * 43758.5453; return s - Math.floor(s) }

  private nearestFree(at: Point, within: number, host?: HostId): Hook | null {
    let best = within, found: Hook | null = null
    for (const hook of HOOKS) {
      if (!this.free(hook.id) || (host && hook.host !== host)) continue
      const p = this.hookAt(hook), d = Math.hypot(p.x - at.x, p.y - at.y)
      if (d < best) { best = d; found = hook }
    }
    return found
  }

  // --- The string ------------------------------------------------------------

  private fill(): void {
    this.things.length = 0
    contentsOf(this.seed, THINGS).forEach((kind, i) => this.things.push({ kind, colour: kind === 'bulb' ? BULB_COLOURS[(i / 2 + this.seed) % BULB_COLOURS.length] : KIND_COLOUR[kind], swing: 0, speed: 0, size: 0.5, grow: 0, light: 0, act: 9, x: MOUTH.x, y: MOUTH.y, from: 0, host: null, out: false }))
  }

  private lay(): void {
    const { points, spots, hooks } = this
    points.length = 0
    points.push(MOUTH)
    hooks.forEach((id, i) => points.push(this.hookAt(HOOK.get(id)!, spots[i])))
    if (this.end.mode === 'hook' && hooks.length) { const p = points[points.length - 1]; this.end.x = p.x; this.end.y = p.y }
    else points.push(this.end)
    if (this.loop) points.splice(Math.min(this.loop.span + 1, points.length - 1), 0, this.loop)
    const taut = this.held === 'end' ? points.length - 2 : -1
    layPath(this.path, points, (span, length) => {
      const wobble = this.twangs[span] ? Math.sin(this.clock * 34) * 16 * this.twangs[span] : 0
      return (span === taut ? 0.03 : 0.11) * length + 4 + wobble
    })
  }

  private spanOf(distance: number): number {
    const { at } = this.path
    let span = 0
    while (span + 2 < at.length && at[span + 1] < distance) span += 1
    return span
  }

  /** Sets every thing on the string. Things come out of the box, and go back, only while the string is being moved. */
  private feed(moving: boolean, quiet: boolean): void {
    const { path, things } = this
    this.strain = 0
    for (let i = 0; i < things.length; i++) {
      const thing = things[i], d = path.length - i * SPACING
      if (moving) {
        if (!thing.out && d > 0) {
          thing.out = true
          if (!quiet) { thing.size = 0.45; thing.grow = 9; thing.speed += 7 * (i % 2 ? 1 : -1); thing.x = MOUTH.x; thing.y = MOUTH.y - 30; this.box.speed += 9; this.say(voices.pop(this.popped++)); if (this.lit && this.litFor > 2) thing.light = 0.2 }
        } else if (thing.out && d < -26 && i > 0) {
          thing.out = false; thing.host = null; thing.light = 0
          if (!quiet) { this.box.speed += 5; this.say(voices.plop) }
        }
      }
      if (!thing.out) { if (this.strain === 0) this.strain = Math.min(1, Math.max(0.12, 1 + d / SPACING)); thing.x = MOUTH.x; thing.y = MOUTH.y; thing.from = 0; continue }
      thing.from = Math.max(0, d)
      pointAt(path, d, this.lead)
      thing.x = this.lead.x; thing.y = this.lead.y
      thing.host = this.hostAt(thing.from)
    }
  }
  private hostAt(distance: number): HostId | null {
    let best = HOLD, host: HostId | null = null, span = 0
    const { at } = this.path
    for (let i = 0; i < this.hooks.length; i++) {
      span = i + 1 + (this.loop && this.loop.span <= i ? 1 : 0)
      const d = Math.abs(at[span] - distance)
      if (d < best) { best = d; host = HOOK.get(this.hooks[i])!.host }
    }
    return host
  }

  // --- Time ------------------------------------------------------------------

  step(dt: number): void {
    if (dt <= 0) return
    this.clock += dt
    if (this.round !== null) this.playRound(dt)
    for (const id of HOST_IDS) this.bodies[id].step(dt, this.lit)
    this.peek += dt; this.twinkle.t += dt
    this.pressed = Math.max(0, this.pressed - dt * 3)
    for (let i = 0; i < this.twangs.length; i++) if (this.twangs[i]) this.twangs[i] = this.twangs[i] < 0.02 ? 0 : this.twangs[i] * Math.exp(-dt * 5)
    this.moveEnd(dt)
    this.moveLoop(dt)
    this.lay()
    const was = this.strain
    this.feed(this.held !== null || this.flight !== null || this.loop !== null, false)
    if (this.held && this.strain > was) { const step = Math.floor(this.strain * 5); if (step > this.lastStrain) this.say(voices.creak(this.strain)); this.lastStrain = step } else this.lastStrain = Math.min(this.lastStrain, Math.floor(this.strain * 5))
    const { box } = this
    box.speed += (-box.squash * 190 - box.speed * 9) * dt
    box.squash += box.speed * dt
    const lean = this.held || this.flight ? this.strain : 0
    box.lean += (lean - box.lean) * Math.min(1, dt * 10)
    this.moveThings(dt)
    this.shine(dt)
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const bit = this.bits[i]
      bit.t += dt
      if (bit.t < 0) continue
      bit.x += bit.vx * dt; bit.y += bit.vy * dt
      bit.vx *= Math.exp(-dt * 1.2)
      if (bit.kind === 'egg' || bit.kind === 'drop' || bit.kind === 'snow') { bit.vy += 520 * dt; if (bit.y > GROUND) { bit.y = GROUND; bit.vy *= -0.4; bit.vx *= 0.6 } }
      if (bit.t > bit.life) { this.bits[i] = this.bits[this.bits.length - 1]; this.bits.pop() }
    }
  }

  private moveEnd(dt: number): void {
    const flight = this.flight
    if (!flight) return
    flight.t += dt
    const u = Math.min(1, flight.t / flight.seconds), e = u * u * (3 - 2 * u)
    this.end.x = flight.fx + (flight.tx - flight.fx) * e
    this.end.y = Math.max(20, flight.fy + (flight.ty - flight.fy) * e - Math.sin(Math.PI * e) * (flight.then === 'snow' ? 0 : 46))
    if (u >= 1) { this.land(); if (this.winding) this.retract() }
  }
  private moveLoop(dt: number): void {
    const loop = this.loop
    if (!loop || loop.held) return
    loop.t += dt
    const u = Math.min(1, loop.t / 0.34)
    if (loop.hook) {
      const hook = HOOK.get(loop.hook)!, to = this.hookAt(hook)
      loop.x = loop.fx + (to.x - loop.fx) * u; loop.y = loop.fy + (to.y - loop.fy) * u
      if (u >= 1) { const span = loop.span; this.loop = null; this.catchOn(hook, span); if (this.end.mode === 'hook') this.endOnHook() }
      return
    }
    const { points } = this, a = points[loop.span], b = points[loop.span + 2] ?? points[points.length - 1], spring = 1 - Math.exp(-u * 4) * Math.cos(u * 9)
    loop.x = loop.fx + ((a.x + b.x) / 2 - loop.fx) * spring
    loop.y = loop.fy + ((a.y + b.y) / 2 - loop.fy) * spring
    if (u >= 1) { this.loop = null; this.lay(); this.feed(true, false) }
  }

  private lastX: number[] = []
  private moveThings(dt: number): void {
    this.things.forEach((thing, i) => {
      if (!thing.out) { this.lastX[i] = thing.x; return }
      const moved = Math.max(-40, Math.min(40, thing.x - (this.lastX[i] ?? thing.x)))
      this.lastX[i] = thing.x
      thing.speed += (-thing.swing * 46 - thing.speed * 2.6) * dt - moved * 0.07
      thing.swing = Math.max(-1.5, Math.min(1.5, thing.swing + thing.speed * dt))
      thing.grow += ((1 - thing.size) * 210 - thing.grow * 13) * dt
      thing.size += thing.grow * dt
      thing.act += dt
    })
  }

  private shine(dt: number): void {
    if (this.lit) this.litFor += dt
    const front = this.lit ? this.litFor * LIGHT_SPEED : -1
    this.things.forEach((thing, i) => {
      const to = this.lit && thing.out && thing.from <= front ? 1 : 0, was = thing.light
      thing.light += (to - thing.light) * Math.min(1, dt * (to ? 12 : 8))
      if (to && was < 0.1 && thing.out && this.litFor < 8) this.wake(i)
    })
    if (!this.lit || this.litFor > SHOW_SECONDS) return
    this.turnClock -= dt
    if (this.litFor > 0.55 && this.turnClock <= 0) {
      const order = this.turns()
      if (!order.length) return
      this.turnClock = TURN_SECONDS
      // Only what the light has reached has a turn.
      for (let i = 0; i < order.length; i++) {
        const index = order[this.turnAt % order.length]
        this.turnAt += 1
        if (this.things[index].light > 0.4) { this.turn(index); break }
      }
    }
  }
  /** Whose turn it is in what order: one thing of each host, then the next of each. */
  turns(): number[] {
    const lists = HOST_IDS.map((host) => this.on(host).reverse()).filter((list) => list.length)
    const order: number[] = []
    for (let i = 0; i < Math.max(0, ...lists.map((list) => list.length)); i++) for (const list of lists) if (i < list.length) order.push(list[i])
    // The silly one first where there is one: it is what was just pulled out.
    const silly = order.findIndex((index) => this.things[index].kind !== 'bulb')
    if (lists.length === 1 && silly > 0) order.unshift(...order.splice(silly, 1))
    return order
  }

  // --- The opening round -----------------------------------------------------

  private endRound(): void {
    if (this.round === null) return
    this.round = null
    this.ghost.opacity = 0
    if (this.held) this.drop()
  }
  private playRound(dt: number): void {
    const was = this.round!, now = (this.round = was + dt), past = (t: number) => was < t && now >= t, { ghost } = this
    const nose = this.hookAt(HOOK.get('nose')!, { x: 0, y: 0 }), ease = (a: number, b: number) => { const u = Math.min(1, Math.max(0, (now - a) / (b - a))); return u * u * (3 - 2 * u) }
    ghost.opacity = Math.min(1, now / 0.5, Math.max(0, (9.4 - now) / 0.5))
    const pull = ease(1.2, 2.9), move = ease(3.3, 4.2)
    if (now < 3.3) {
      ghost.x = HOME.x + (nose.x - HOME.x) * pull; ghost.y = HOME.y + (nose.y - HOME.y) * pull - Math.sin(Math.PI * pull) * 30
      ghost.press = Math.min(1, Math.max(0, (now - 0.8) / 0.25)) * (now > 3.1 ? 0 : 1)
    } else {
      ghost.x = nose.x + (SWITCH.x - nose.x) * move; ghost.y = nose.y + (SWITCH.y - 20 - nose.y) * move
      ghost.press = Math.max(0, 1 - Math.abs(now - 4.5) / 0.2, 1 - Math.abs(now - 8.6) / 0.2)
    }
    if (past(1) && this.end.mode === 'home') { this.before = { hooks: [], x: HOME.x, y: HOME.y, mode: 'home', triedIt: false }; this.held = 'end'; this.setEnd('hand', HOME.x, HOME.y); this.say(voices.grab) }
    if (this.held === 'end' && now < 3.1) this.drag({ x: ghost.x, y: ghost.y })
    if (past(3.1) && this.held) this.drop()
    if (past(4.5) && !this.lit) this.flip(false)
    if (past(8.6) && this.lit) { this.flip(false) }
    if (now > 9.4) { this.round = null; ghost.opacity = 0; this.triedIt = false }
  }
}

export const KIND_COLOUR: Readonly<Record<Exclude<Kind, 'bulb'>, string>> = { boot: 'green', pants: 'white', sausage: 'red', kettle: 'blue', uncle: 'white', fish: 'orange', trumpet: 'yellow', hen: 'white', umbrella: 'red', jelly: 'green' }
const near = (a: Point, b: Point, r: number) => Math.hypot(a.x - b.x, a.y - b.y) < r
