import type { Voice } from './audio'
import { bowlOf, fillLevel, surfaceOf } from './forms'
import type { Gesture, Point } from './input'
import { TRAY, onCloth, type Spot } from './layout'
import { pick, type Target } from './pick'
import { POUR, callTo, carryTo, liftOf, press, release, spoutSpot, step, thingUnder, type Pot, type PourEvent } from './pour'
import { voiceOf } from './sound'
import type { TableView } from './tableView'
import type { Tableau } from './tableau'
import { brush, clothThump, cupRing, glug, hop, land, lidClick, pat, patter, plip, potPress, saucerRattle, squeak, squelch, trickle } from './voices'
import { holds, puddled, thingById, wipe, type Flow, type Thing, type World } from './world'

// The toy: the pot pours for as long as it is held. This is the only place
// that knows a finger, the model, the view and the sounds at once: a gesture
// changes the model, the model says what happened, and the view and the
// sounds follow. There is no goal here and nothing is judged.

/** A held finger drifts. It is still holding the pot until it has slid this far, in pixels; further is a carry. */
export const HOLD_SLOP = 44
/** Seconds between two grains of the running stream, and between two patters of an overflow. */
const GRAIN_EVERY = 0.09
const PATTER_EVERY = 0.12
/** Table units a sponge travels between two strokes' sounds. */
const STROKE = 0.55

type Mode = 'idle' | 'pouring' | 'carry-pot' | 'carry-sponge'

export class Toy {
  readonly world: World
  readonly pot: Pot
  private mode: Mode = 'idle'
  private pressed: string | null = null
  private grab = { x: 0, z: 0 }
  private grainIn = 0
  private patterIn = 0
  private turn = 0
  private overflowing = 0
  private stroke = 0
  private strokeTook = 0
  private readonly view: TableView
  private readonly play: (voice: Voice) => void

  constructor(view: TableView, play: (voice: Voice) => void, tableau: Tableau) {
    this.view = view
    this.play = play
    this.world = tableau.world
    this.pot = tableau.pot
    view.showAsLeft(this.world)
    view.setGuests(tableau.guests)
  }

  /** A finger is on the pot, pouring or carrying: the idle ladder stays at the bottom. */
  get busy(): boolean {
    return this.mode !== 'idle' || this.pot.hop !== null
  }

  private targets(): Target[] {
    const targets: Target[] = []
    const add = (id: string, x: number, y: number, z: number, girth: number, rank: number) => {
      const middle = this.view.screenOf(x, y, z), edge = this.view.screenOf(x + girth, y, z)
      targets.push({ id, x: middle.x, y: middle.y, reach: Math.abs(edge.x - middle.x) * 1.08, rank })
    }
    add('pot', this.pot.x, liftOf(this.pot) + 0.65, this.pot.z, 1.05, 4)
    for (const thing of this.world.things) {
      const size = this.view.sizeOf(thing.id)
      const under = thingById(this.world, thing.on)
      add(thing.id, under ? under.x : thing.x, size.height / 2, under ? under.z : thing.z, size.girth, thing.kind === 'saucer' ? 1 : thing.kind === 'sponge' ? 3 : 2)
    }
    return targets
  }

  /** How full the thing under the spout is, 0 to 1, and where its surface is: what a drop hits and what the stream sounds like. */
  private landing(): { level: number; x: number; y: number; z: number; wet: boolean } {
    const spot = spoutSpot(this.pot)
    const thing = thingById(this.world, this.pot.over)
    if (!thing) return { level: 0, x: spot.x, y: 0.01, z: spot.z, wet: false }
    if (thing.kind === 'cup') {
      const bowl = bowlOf(thing.size)
      return { level: fillLevel(bowl, thing.tea), x: thing.x, y: surfaceOf(bowl, thing.tea).y + (thing.on ? 0.035 : 0), z: thing.z, wet: true }
    }
    return { level: Math.min(1, thing.tea / Math.max(1e-6, holds(thing))), x: thing.x, y: thing.kind === 'bowl' ? 0.2 + 0.5 * Math.min(1, thing.tea / holds(thing)) : 0.07, z: thing.z, wet: thing.kind !== 'sponge' }
  }

  /** The first spill brings the sponge out of the tray: a tool appears when it means something. */
  private afterFlow(flow: Flow): void {
    const over = flow.spilled > 0 || flow.into.some((part) => part.id !== this.pot.over)
    if (over) this.overflowing = 0.2
    if (flow.spilled > 0 && !thingById(this.world, 'sponge')) {
      const sponge: Thing = { id: 'sponge', kind: 'sponge', size: 'house', ring: null, owner: null, x: TRAY.sponge.x, z: TRAY.sponge.z, on: null, heldBy: null, tea: 0 }
      this.world.things.push(sponge)
      this.view.syncWorld(this.world)
      this.view.nudge('sponge', -0.5)
      this.play(voiceOf(squelch(0)))
    }
  }

  private heard(events: PourEvent[]): void {
    for (const event of events) {
      const landing = this.landing()
      if (event.type === 'drop') {
        this.view.drop(landing.y)
        this.play(voiceOf(landing.wet ? plip(landing.level) : pat))
        if (this.pot.over) this.view.nudge(this.pot.over, 0.035)
        this.afterFlow(event.flow)
      } else if (event.type === 'stream') {
        this.afterFlow(event.flow)
      } else if (event.type === 'stream-stop') {
        this.play(voiceOf(lidClick))
        if (this.pot.over) this.view.nudge(this.pot.over, 0.05)
      } else if (event.type === 'hop') {
        this.play(voiceOf(hop))
      } else if (event.type === 'land') {
        this.play(voiceOf(land))
        this.view.nudge('pot', 0.09)
      }
    }
  }

  private letGo(): void {
    this.heard(release(this.pot))
    this.mode = 'idle'
  }

  /** What a gesture does. Returns true when the world changed, so the Mount can hand it to storage. */
  gesture(gesture: Gesture): boolean {
    if (gesture.type === 'press') {
      this.pressed = pick(this.targets(), gesture.at.x, gesture.at.y)
      const thing = thingById(this.world, this.pressed)
      if (this.pressed === 'pot') {
        this.view.nudge('pot', 0.07)
        this.play(voiceOf(potPress))
        const events = press(this.pot, this.world)
        if (events.length > 0) this.mode = 'pouring'
        this.heard(events)
        const at = this.view.clothAt(gesture.at.x, gesture.at.y)
        this.grab = { x: this.pot.x - at.x, z: this.pot.z - at.z }
      } else if (thing?.kind === 'cup') {
        this.view.nudge(thing.id, 0.08)
        this.play(voiceOf(cupRing(fillLevel(bowlOf(thing.size), thing.tea), bowlOf(thing.size).rimR / 0.6)))
      } else if (thing?.kind === 'saucer') {
        this.view.nudge(thing.id, 0.1)
        this.play(voiceOf(saucerRattle))
      } else if (thing?.kind === 'sponge') {
        this.view.nudge(thing.id, 0.22)
        this.play(voiceOf(squelch(thing.tea / holds(thing))))
      } else {
        this.play(voiceOf(clothThump))
      }
      return this.mode === 'pouring'
    }
    if (gesture.type === 'tap' || gesture.type === 'pressEnd') {
      if (this.mode === 'pouring') this.letGo()
      else if (gesture.type === 'tap' && this.pressed !== 'pot' && this.pressed !== 'sponge') this.call(gesture.at)
      this.pressed = null
      return true
    }
    if (gesture.type === 'dragMove') {
      const slid = Math.hypot(gesture.at.x - gesture.from.x, gesture.at.y - gesture.from.y)
      const at = this.view.clothAt(gesture.at.x, gesture.at.y)
      if (this.pressed === 'pot') {
        // A finger that has only drifted is still holding the pot; one that has gone further is carrying it.
        if (this.mode === 'pouring' && slid <= HOLD_SLOP) return false
        if (this.mode === 'pouring') this.letGo()
        if (this.pot.hop) return false
        this.mode = 'carry-pot'
        carryTo(this.pot, this.world, { x: at.x + this.grab.x, z: at.z + this.grab.z })
        return true
      }
      if (this.pressed === 'sponge') return this.rub(at)
      return false
    }
    if (gesture.type === 'dragLift' && this.mode === 'pouring') {
      this.letGo()
      return true
    }
    if (gesture.type === 'dragEnd') {
      if (this.mode === 'pouring') this.letGo()
      if (this.mode === 'carry-pot') this.settle()
      if (this.mode === 'carry-sponge') this.wring()
      this.mode = 'idle'
      this.pressed = null
      return true
    }
    return false
  }

  /** A tap on a cup, a saucer or the cloth calls the pot: it hops over and stands with its spout there. */
  private call(point: Point): void {
    const thing = thingById(this.world, this.pressed)
    const under = thingById(this.world, thing?.on ?? null)
    const target: Spot = thing ? { x: under ? under.x : thing.x, z: under ? under.z : thing.z } : onCloth(this.view.clothAt(point.x, point.y), 0.4)
    const id = thingUnder(this.world, target)
    if (this.pot.hop || (id !== null && id === this.pot.over && Math.hypot(spoutSpot(this.pot).x - target.x, spoutSpot(this.pot).z - target.z) < 0.05)) return
    this.heard(callTo(this.pot, target, id))
  }

  /** The pot is set down: beside a cup it takes its place with the spout over the cup, and anywhere else it stays where it was put. */
  private settle(): void {
    const id = this.pot.over
    const thing = thingById(this.world, id)
    if (thing) this.heard(callTo(this.pot, thing, id))
    else {
      this.play(voiceOf(land))
      this.view.nudge('pot', 0.08)
    }
  }

  private rub(at: Spot): boolean {
    const sponge = thingById(this.world, 'sponge')
    if (!sponge) return false
    this.mode = 'carry-sponge'
    const to = onCloth(at, 0.4)
    this.stroke += Math.hypot(to.x - sponge.x, to.z - sponge.z)
    sponge.x = to.x
    sponge.z = to.z
    this.strokeTook += wipe(this.world, 'sponge', to)
    if (this.stroke >= STROKE) {
      this.play(voiceOf(this.strokeTook > 0.002 ? squeak(this.turn++) : brush))
      this.view.nudge('sponge', 0.06)
      this.stroke = 0
      this.strokeTook = 0
    }
    this.view.syncWorld(this.world)
    return true
  }

  /** The sponge is let go: it wrings itself out with a squelch, so it is never too full to wipe with. */
  private wring(): void {
    const sponge = thingById(this.world, 'sponge')
    if (!sponge || sponge.tea <= 0) return
    this.play(voiceOf(squelch(sponge.tea / holds(sponge))))
    this.view.nudge('sponge', 0.3)
    sponge.tea = 0
  }

  /** Plays `dt` seconds of the model, and the sounds of whatever happened in them. */
  step(dt: number): void {
    this.heard(step(this.pot, this.world, dt))
    if (this.pot.flow > 0) {
      const landing = this.landing()
      this.grainIn -= dt
      if (this.grainIn <= 0) {
        this.grainIn = GRAIN_EVERY
        this.turn += 1
        if (landing.wet) this.play(voiceOf(trickle(landing.level, this.pot.flow / POUR.steady, this.turn)))
        else this.play(voiceOf(patter(this.turn)))
        if (this.turn % 4 === 0) this.play(voiceOf(glug(this.turn)))
      }
      this.overflowing -= dt
      this.patterIn -= dt
      if (this.overflowing > 0 && this.patterIn <= 0) {
        this.patterIn = PATTER_EVERY
        this.play(voiceOf(patter(this.turn + 11)))
      }
    } else this.grainIn = 0
    if (dt > 0) this.view.syncWorld(this.world)
  }

  /** Draws one frame and returns what it cost to draw. `dt` of 0 draws the table as it stands. */
  draw(dt: number): { drawCalls: number; triangles: number } {
    const landing = this.pot.flow > 0 ? this.landing() : null
    return this.view.frame(dt, this.world, this.pot, landing)
  }

  /** There is tea on the cloth: for the guidance, which shows the sponge only when there is something to wipe. */
  get spilled(): boolean {
    return puddled(this.world) > 0.01
  }
}
