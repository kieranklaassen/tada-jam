import { consequence } from './consequence'
import { length } from './kit'
import { onRoll, onVehicle, parkAt, rackSlot, waitAt } from './layout'
import { DRAWN_DIP, atRest, rests } from './pose'
import { between, creaks, ended, frontAt, seat, stepAt, type Seat } from './ride'
import type { Strain } from './frame'
import { roadOf, run, type Run, type Train } from './run'
import { crossed, failedRun, onNewest, parked, sentHome, standing, toFront, turnTo, unroll, type Save } from './save'
import { Scene } from './scene'
import { groundAt } from './sheet'
import { isFooting, site, type VehicleId } from './sites'
import { crossingBeats, giveBeats, idleShow, type Cue, type Show } from './stage'
import { Toy } from './toy'
import { TASTE, VEHICLES, reaction, trainOf } from './vehicles'
import { chord, creak, honk, lay as layVoice, pinTick, reactVoice, restore, splash, unrollVoice } from './voices'

// The game on the toy: the vehicles at the two banks, a run over the bridge,
// the two scenes a run ends in, and the sheets (the roll and the rack). Pure,
// like the toy it extends. Everything the designed order needs is in save.ts
// and order.ts; this only says when their transitions happen.

/** A run being watched. */
export type Drive = {
  vehicle: VehicleId
  run: Run
  train: Train
  homeward: boolean
  seconds: number
  /** Each part's strain when it was last listened to, for the creaks, and how it is strained now. */
  heard: number[]
  strain: Strain[]
}

const longOf = (id: VehicleId): number => Math.max(...VEHICLES[id].axles)

export class Game extends Toy {
  drive: Drive | null = null
  show: Show = idleShow()
  /** During a give: the part that gave and where. The view draws it parted there. */
  gave: { part: number; spot: readonly [number, number] } | null = null
  /** Seconds since each vehicle was last touched: its answer to a poke is drawn from it. */
  poked = new Map<VehicleId, number>()
  /** The roadway reaches from lip to lip: a vehicle sent now has a road to try. */
  ready = false
  private scene: Scene | null = null
  private urgent = false
  private sceneClock = 0
  /** A touch is ending the scene: its beats land where they were going, and none of their sounds is played late. */
  private skipping = false

  constructor(save: Save, random: () => number) {
    super(save, random)
    // The fields above are set after the toy has built itself, so what the model found is read again here.
    this.ready = roadOf(this.at, this.frame).complete
  }

  /** The vehicles at the near bank, the front of the line first, and those parked on the far bank. */
  get waiting(): VehicleId[] { return standing(this.save) }
  get across(): VehicleId[] { return parked(this.save) }

  /** A scene is playing: the idle ladder waits. */
  get playing(): boolean { return (this.scene?.running ?? false) || this.drive !== null }

  /** True once after an outcome that must be saved at once: a scene's, a cycle's. */
  takeUrgent(): boolean {
    const urgent = this.urgent
    this.urgent = false
    return urgent
  }

  /** How a vehicle on a run sits on the road now. */
  seatNow(): Seat | null {
    const drive = this.drive
    if (!drive) return null
    const x = frontAt(this.at, drive.seconds, drive.homeward)
    return seat(this.at, drive.run, between(drive.run, stepAt(this.at, drive.run, x, drive.homeward)), drive.train, x, DRAWN_DIP, drive.homeward)
  }

  protected override model(): void {
    super.model()
    this.ready = roadOf(this.at, this.frame).complete
  }

  // --- Gestures ------------------------------------------------------------------

  override press(x: number, y: number): void {
    // A touch ends a scene, and is then an ordinary touch.
    if (this.scene?.running) { this.skipping = true; this.scene.finish(); this.skipping = false; this.afterScene() }
    // While a vehicle is on the bridge the bridge is not changed under it: a touch is answered and no more.
    if (this.drive) { this.voices.push(pinTick); this.hand = null; return }
    const vehicle = this.vehicleAt(x, y)
    if (vehicle) {
      this.hand = { what: 'vehicle', id: vehicle.id, across: vehicle.across }
      this.poked.set(vehicle.id, 0)
      this.voices.push(honk(vehicle.id))
      return
    }
    if (this.save.next && onNewest(this.save) && onRoll(this.at, x, y)) { this.hand = { what: 'roll' }; this.voices.push(unrollVoice(0)); return }
    const slot = this.save.sheets.length > 1 ? rackSlot(this.save.sheets.length, x, y) : -1
    if (slot >= 0) { this.hand = { what: 'rack', index: slot }; this.voices.push(unrollVoice(0)); return }
    super.press(x, y)
  }

  override tap(): void {
    const hand = this.hand
    if (hand?.what === 'vehicle') {
      this.hand = null
      const id = hand.id as VehicleId
      if (hand.across) { this.send(id, true); return }
      // Only the vehicle at the front of the line sets off; one behind it comes to the front first.
      if (this.waiting[0] === id) this.send(id, false)
      else { this.save = toFront(this.save, id); this.changed = true }
      return
    }
    if (hand?.what === 'roll') { this.hand = null; this.turn(unroll(this.save)); return }
    if (hand?.what === 'rack') { this.hand = null; if (hand.index !== this.save.on) this.turn(turnTo(this.save, hand.index)); return }
    super.tap()
  }

  // --- Time ----------------------------------------------------------------------

  override step(dt: number): void {
    this.sceneClock += dt
    for (const [id, since] of this.poked) { if (since > 2) this.poked.delete(id); else this.poked.set(id, since + dt) }
    const drive = this.drive
    if (drive) {
      drive.seconds += dt
      const x = frontAt(this.at, drive.seconds, drive.homeward), progress = stepAt(this.at, drive.run, x, drive.homeward)
      const answer = between(drive.run, progress)
      // The bridge lies as the model says it does under the load where it is now.
      this.rest = rests(this.bridge, drive.run.frame, answer, isFooting(this.at), (gx) => groundAt(this.at, gx))
      for (const due of creaks(drive.heard, answer.use)) this.voices.push(creak(due.use))
      drive.heard = answer.use
      drive.strain = answer.strain
      if (ended(this.at, drive.run, x, drive.homeward)) this.finishDrive(drive)
    }
    if (this.scene) {
      const wasRunning = this.scene.running
      this.scene.update(this.sceneClock)
      if (wasRunning && !this.scene.running) this.afterScene()
    }
    super.step(dt)
  }

  // --- Runs ----------------------------------------------------------------------

  private vehicleAt(x: number, y: number): { id: VehicleId; across: boolean } | null {
    const near = this.waiting.findIndex((id, place) => onVehicle(this.at, waitAt(this.at, place), longOf(id), x, y))
    if (near >= 0) return { id: this.waiting[near], across: false }
    const far = this.across.findIndex((id, place) => onVehicle(this.at, parkAt(this.at, longOf(id), place), longOf(id), x, y))
    return far >= 0 ? { id: this.across[far], across: true } : null
  }

  /** A vehicle sets off across the bridge as built: the whole run is computed now and then watched. */
  private send(id: VehicleId, homeward: boolean): void {
    const train = trainOf(VEHICLES[id])
    const result = run(this.at, this.bridge, train, homeward)
    this.drive = { vehicle: id, run: result, train, homeward, seconds: 0, heard: Array.from(result.steps[0].use), strain: result.steps[0].strain }
    this.voices.push(honk(id))
  }

  /** The run has reached its ending: its outcome is saved at once, and the scene that shows it starts. */
  private finishDrive(drive: Drive): void {
    const where = this.seatNow()!
    this.drive = null
    const show = (this.show = { ...idleShow(), vehicle: drive.vehicle, homeward: drive.homeward, from: [where.x, where.y], tilt: where.tilt })
    const cue = (what: Cue) => this.cue(what, drive)
    if (drive.run.ending.kind === 'crossed') {
      show.kind = 'crossing'
      show.reaction = reaction(drive.vehicle, drive.run.ride)
      // Homeward, the vehicle is back at the near bank and nothing is judged; outward, it has crossed.
      this.save = drive.homeward ? sentHome(this.save, drive.vehicle) : crossed(this.save, drive.vehicle, drive.vehicle === 'giraffe-bus' ? drive.run.ride.low[TASTE.bus.headroom - 1] : [])
      this.scene = new Scene(crossingBeats(show, cue))
    } else {
      const what = consequence(drive.run, this.bridge, VEHICLES[drive.vehicle].crates)
      show.kind = 'give'
      this.gave = what.ring
      this.voices.push(what.voice.filter((sound) => (sound.after ?? 0) < 0.35))
      // A vehicle that fails on its way home paddles to the near bank like any other, and is home.
      this.save = drive.homeward ? sentHome(this.save, drive.vehicle) : failedRun(this.save, drive.vehicle, what.ring)
      this.scene = new Scene(giveBeats(show, cue))
      // What is left of the bridge with the part that gave let go at one end: it sags or folds from there. With no
      // part given (the road ended, the wheels rolled off), the bridge lies as it does with nothing on it.
      const gone = what.ring?.part
      this.rest = gone === undefined ? this.modelOf(this.bridge).rest : this.modelOf(this.bridge.map((part, index) => (index === gone ? { ...part, loose: 'a' as const } : part))).rest
    }
    this.urgent = true
    this.changed = true
    this.scene.start(this.sceneClock, () => {})
  }

  private cue(what: Cue, drive: Drive): void {
    if (what === 'restore') { this.gave = null; this.model() }
    if (this.skipping) return
    if (what === 'splash') this.voices.push(splash(VEHICLES[drive.vehicle].crates))
    if (what === 'ring') {
      // The bridge springs up and rings with the notes of its own parts.
      this.voices.push(chord(this.bridge.map((part) => layVoice(part.kind, length(part))[0].pitch)))
      this.bridge.forEach((_, index) => { this.rung[index] = 0.2 })
    }
    if (what === 'react' && this.show.reaction) this.voices.push(reactVoice(drive.vehicle, this.show.reaction.mood))
    if (what === 'arrive') this.voices.push(unrollVoice(1))
    if (what === 'restore') this.voices.push(restore)
  }

  /** The scene is over, by itself or by a touch: everything is where it was taking it. */
  private afterScene(): void {
    this.gave = null
    this.show = idleShow()
    this.scene = null
    this.model()
  }

  /** Another sheet comes onto the board: the roll unrolled, or a sheet taken back from the rack. */
  private turn(save: Save): void {
    if (save === this.save) return
    this.save = save
    const sheet = save.sheets[save.on]
    this.at = site(sheet.site, sheet.variant)
    this.selected = (['plank', 'stick', 'tube', 'thread'] as const).find((kind) => this.at.kit[kind] > 0) ?? 'plank'
    this.model()
    this.moving = this.rest.map(atRest)
    this.rung = this.bridge.map(() => Infinity); this.turned = this.bridge.map(() => Infinity); this.laid = this.bridge.map(() => Infinity)
    this.flying = []; this.clicked.clear()
    this.voices.push(unrollVoice(1))
    this.urgent = true
    this.changed = true
  }
}
