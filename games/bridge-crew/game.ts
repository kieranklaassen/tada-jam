import { consequence } from './consequence'
import { length, type Part } from './kit'
import { TROLLEY_REACH, onRoll, onVehicle, parkAt, rackSlot, toolAt, tracingSpot, waitAt } from './layout'
import { modelInMargin, nearestDifferences, neatWayDue, oneChangeDue, type Difference } from './order'
import { DRAWN_DIP, atRest, rests, type Rest } from './pose'
import { answerOf, between, creaks, ended, frontAt, seat, stepAt, type Seat } from './ride'
import type { Strain } from './frame'
import { hang, lowPoint, park, roadOf, run, type Ending, type Run, type Train } from './run'
import { crossed, failedRun, markShown, onNewest, parked, pluckHat, ringed, sentHome, setTrolley, standing, swapTracing, toFront, trace, turnTo, unroll, type Save } from './save'
import { Scene } from './scene'
import { groundAt } from './sheet'
import { isFooting, site, type Idea, type VehicleId } from './sites'
import { crossingBeats, giveBeats, idleShow, type Cue, type Show } from './stage'
import { RING, Toy } from './toy'
import { TASTE, VEHICLES, bargeReaction, reaction, trainOf, type Reaction } from './vehicles'
import { bargeHorn, chiefTaps, chord, creak, give, honk, lay as layVoice, pendulum, pinTick, reactVoice, restore, splash, trolleyBells, trolleyFlip, trolleyOff, trolleySet, trolleyWeight, unrollVoice } from './voices'

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
/** How tall each vehicle stands with its load, in cells: what a touch on it can reach. */
const TALL: Readonly<Record<VehicleId, number>> = { 'post-van': 2.1, 'jelly-truck': 1.9, 'piano-mover': 2.2, 'giraffe-bus': 3.3, 'caterpillar-bus': 1.6 }

export class Game extends Toy {
  drive: Drive | null = null
  show: Show = idleShow()
  /** During a give: the part that gave and where. The view draws it parted there. */
  gave: { part: number; spot: readonly [number, number] } | null = null
  /** Seconds since each vehicle was last touched: its answer to a poke is drawn from it. */
  poked = new Map<VehicleId, number>()
  /** The roadway reaches from lip to lip: a vehicle sent now has a road to try. */
  ready = false
  /** The tracing laid on the board for a comparison, by its place among the kept ones. Not saved: it is lifted again. */
  laidTracing: number | null = null
  /** Where the laid tracing's parts would lie under the same load at the same place: the second line. */
  tracingRest: Rest[] = []
  /** Seconds since the trolley was rung, since it was set down (it trundles from there), and since a part gave under it (it falls from there). */
  trolleyRung = Infinity
  trolleyRolled: { from: number; since: number } | null = null
  trolleyFell: { from: readonly [number, number]; since: number } | null = null
  /** The showing the chief is giving: the neat way of an idea, or the one change with the two differences that fill its models. */
  showing: { idea: Idea } | { differences: Difference[] } | null = null
  /** How the barge took the last crossing, on a sheet where one passes underneath: what it does during that crossing's scene. */
  bargeTook: Reaction | null = null
  /** A hat the chief has plucked off a part and wears until the next sheet is unrolled. Short-lived: not saved. */
  chiefHat = false
  private owed: Idea | null = null
  /** The threads plucked one after another, for the secret: every thread of the bridge from longest to shortest is a scale. */
  private tune: number[] = []
  private scene: Scene | null = null
  private urgent = false
  private sceneClock = 0
  /** A touch is ending the scene: its beats land where they were going, and none of their sounds is played late. */
  private skipping = false

  constructor(save: Save, random: () => number) {
    super(save, random)
    // The fields above are set after the toy has built itself, so the model is run again here, with the trolley on it.
    this.model()
    this.moving = this.rest.map(atRest)
  }

  /** The vehicles at the near bank, the front of the line first, and those parked on the far bank. */
  get waiting(): VehicleId[] { return standing(this.save) }
  get across(): VehicleId[] { return parked(this.save) }

  /** A scene is playing: the idle ladder waits. */
  get playing(): boolean { return (this.scene?.running ?? false) || this.drive !== null || (this.showing !== null && (this.chief.act === 'shows' || this.chief.act === 'compares')) }

  /** The test trolley of the sheet on the board. */
  get trolley() { return this.save.sheets[this.save.on].trolley }

  /** The small model that stands in the margin: the idea of this sheet's position, once it has been shown. */
  get marginModel(): Idea | null { return modelInMargin(this.save.sheets[this.save.on].site, this.save.shown) }

  /** Where the trolley is on the bridge now, in cells: on the deck, or at the pin it hangs from. Null in the tray. */
  trolleyPlace(): readonly [number, number] | null {
    const place = this.trolley.at
    if (!place) return null
    const node = 'x' in place ? roadOf(this.at, this.frame).nodes.find((n) => this.frame.nodes[n].x === place.x) : this.frame.at.get(`${place.pin[0]},${place.pin[1]}`)
    if (node === undefined) return null
    const [dx, dy] = this.answer.moved(node)
    return [this.frame.nodes[node].x + dx * DRAWN_DIP, this.frame.nodes[node].y + dy * DRAWN_DIP]
  }

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

  /**
   * The model, with the trolley where it stands or hangs: the bridge lies as
   * the frame answers under that one load. A part that gives under it gets the
   * ring, and the trolley drops back to the tray. A tracing laid on the board
   * is answered under the same load at the same place.
   */
  protected override model(): void {
    super.model()
    this.ready = roadOf(this.at, this.frame).complete
    const footing = isFooting(this.at), ground = (x: number) => groundAt(this.at, x)
    const trolley = this.trolley, place = trolley.at
    const under = (parts: readonly Part[]) => (!place ? null : 'x' in place ? park(this.at, parts, place.x, trolley.weights) : hang(this.at, parts, place.pin, trolley.weights))
    if (place) {
      const loaded = under(this.bridge)
      if (!loaded || loaded.ending) {
        // Nothing holds it there, or what held it gave: it is back in the tray, and the bridge lies with nothing on it.
        if (loaded?.ending) this.trolleyGave(loaded.ending)
        this.save = setTrolley(this.save, trolley.weights, null)
        this.changed = true
      } else {
        this.frame = loaded.frame
        this.answer = answerOf(loaded.step)
        this.rest = rests(this.bridge, loaded.frame, this.answer, footing, ground)
      }
    }
    const tracing = this.laidTracing === null || this.laidTracing === undefined ? null : this.save.sheets[this.save.on].tracings[this.laidTracing]
    if (!tracing) { this.tracingRest = []; return }
    const loaded = this.trolley.at ? under(tracing) : null
    this.tracingRest = loaded && !loaded.ending ? rests(tracing, loaded.frame, answerOf(loaded.step), footing, ground) : this.modelOf(tracing).rest
  }

  /** A part gave under the trolley, or the build folded: it is heard, the spot is ringed, and the trolley falls from where it was. */
  private trolleyGave(ending: Ending): void {
    this.trolleyFell = { from: this.trolleyPlace() ?? [this.at.left[0] + 1, this.at.left[1]], since: 0 }
    if (ending.kind === 'gives') {
      const kind = this.bridge[ending.part].kind
      this.voices.push(give(ending.strain === 'pull' || ending.strain === 'bow' || ending.strain === 'squeeze' ? ending.strain : 'bend', kind))
      this.save = ringed(this.save, { part: ending.part, spot: ending.spot })
    }
    this.voices.push(splash(this.trolley.weights))
  }

  // --- Gestures ------------------------------------------------------------------

  override press(x: number, y: number): void {
    // A touch ends a scene, and is then an ordinary touch.
    if (this.scene?.running) { this.skipping = true; this.scene.finish(); this.afterScene(); this.skipping = false }
    // While a vehicle is on the bridge the bridge is not changed under it: a touch is answered and no more.
    if (this.drive) { this.voices.push(pinTick); this.hand = null; return }
    // A touch ends a showing too: the chief stops where it is, and the showing has been given.
    if (this.showing && (this.chief.act === 'shows' || this.chief.act === 'compares')) { this.chief.rest(); if ('differences' in this.showing) this.showing = null }
    this.owed = null
    const tool = toolAt(this.at, x, y)
    if (tool?.tool === 'trolley') { this.hand = { what: 'trolley', placed: false, carried: false, finger: [x, y] }; this.voices.push(pinTick); return }
    if (tool?.tool === 'tracing') { this.hand = { what: 'tracing', spot: tracingSpot(tool, x, y), carried: false, finger: [x, y] }; this.voices.push(unrollVoice(0)); return }
    const cart = this.trolleyPlace()
    if (cart && Math.hypot(x - cart[0], y - cart[1] - 0.3) <= TROLLEY_REACH) { this.hand = { what: 'trolley', placed: true, carried: false, finger: [x, y] }; this.voices.push(pinTick); return }
    // A hat hanging on a part comes off at a touch, and the chief wears it.
    const sheet = this.save.sheets[this.save.on], ends = this.drawn()
    const hat = sheet.hats.find((index) => ends[index] && Math.hypot(x - (ends[index].a[0] + ends[index].b[0]) / 2, y - (ends[index].a[1] + ends[index].b[1]) / 2 - 0.2) <= 0.45)
    if (hat !== undefined) { this.save = pluckHat(this.save, hat); this.chiefHat = true; this.changed = true; this.voices.push(unrollVoice(0)); this.chief.poke(); this.hand = null; return }
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
    if (hand?.what === 'trolley') { this.hand = null; this.tapTrolley(hand.placed); return }
    if (hand?.what === 'tracing') { this.hand = null; this.tapTracing(hand.spot); return }
    if (hand?.what === 'roll') { this.hand = null; this.chiefHat = false; this.turn(unroll(this.save)); return }
    if (hand?.what === 'rack') { this.hand = null; if (hand.index !== this.save.on) this.turn(turnTo(this.save, hand.index)); return }
    super.tap()
  }

  override dragStart(): void {
    const hand = this.hand
    if (hand?.what === 'trolley' || hand?.what === 'tracing') { hand.carried = true; return }
    super.dragStart()
  }

  override dragMove(x: number, y: number): void {
    const hand = this.hand
    if (hand?.what === 'trolley' || hand?.what === 'tracing') { hand.finger = [x, y]; return }
    super.dragMove(x, y)
  }

  override dragEnd(): void {
    const hand = this.hand
    if (hand?.what === 'trolley') { this.hand = null; if (hand.carried) this.dropTrolley(hand.finger[0], hand.finger[1]); return }
    if (hand?.what === 'tracing') {
      this.hand = null
      // A kept tracing carried up onto the board changes places with the bridge.
      const board = !toolAt(this.at, hand.finger[0], hand.finger[1]) && hand.finger[1] > 0
      if (hand.carried && hand.spot !== 'pad' && board && this.save.sheets[this.save.on].tracings[hand.spot]) {
        this.laidTracing = null
        this.reseat(swapTracing(this.save, hand.spot))
      }
      return
    }
    super.dragEnd()
  }

  /**
   * A secret, which works every time and is never hinted: the threads of a
   * bridge plucked one after another from the longest to the shortest play a
   * scale, and the chief taps along. It needs three threads of three lengths.
   */
  protected override plucked(index: number): void {
    if (this.bridge[index].kind !== 'thread') { this.tune = []; return }
    this.tune.push(index)
    const threads = this.bridge.flatMap((part, i) => (part.kind === 'thread' ? [i] : []))
    const last = this.tune.slice(-threads.length), longs = last.map((i) => length(this.bridge[i]))
    if (threads.length < 3 || last.length < threads.length || new Set(last).size < threads.length) return
    if (!longs.every((long, i) => i === 0 || long < longs[i - 1])) return
    this.tune = []
    this.chief.react('taps-and-listens')
    this.voices.push(chiefTaps(longs.slice(0, 3).map((long) => 440 * Math.sqrt(4 / long))))
  }

  // --- The trolley and the tracing paper -------------------------------------------

  private tapTrolley(placed: boolean): void {
    const trolley = this.trolley
    if (placed) {
      // A tap rings one bell for each weight; a second tap while it rings flips it to ride under the plank, or back.
      if (this.trolleyRung < RING && trolley.at && 'x' in trolley.at) {
        this.save = setTrolley(this.save, trolley.weights, { x: trolley.at.x, under: !trolley.at.under })
        this.voices.push(trolleyFlip)
        this.trolleyRung = Infinity
        this.changed = true
      } else { this.voices.push(trolleyBells(trolley.weights)); this.trolleyRung = 0 }
      return
    }
    // A tap on its compartment puts one more weight on, and after six it starts again at one.
    const weights = (trolley.weights % 6) + 1
    this.save = setTrolley(this.save, weights, trolley.at)
    this.voices.push(trolleyWeight(weights))
    this.changed = true
    this.model()
    this.compare()
  }

  /** The trolley let go at a place: on the deck it trundles to the low point, at a pin it hangs, anywhere else it goes back to the tray. */
  private dropTrolley(x: number, y: number): void {
    const trolley = this.trolley, snapped = Math.round(x * 2) / 2, was = trolley.at
    const onDeck = park(this.at, this.bridge, snapped, trolley.weights)
    const deckY = onDeck ? roadOf(this.at, onDeck.frame).nodes.map((n) => onDeck.frame.nodes[n]).find((n) => n.x === snapped)?.y ?? Infinity : Infinity
    const pin = [Math.round(x), Math.round(y)] as const
    if (onDeck && Math.abs(y - deckY) <= 1 && snapped > this.at.left[0] && snapped < this.at.right[0]) {
      const rest = lowPoint(this.at, this.bridge, snapped, trolley.weights) ?? snapped
      this.save = setTrolley(this.save, trolley.weights, { x: rest, under: false })
      this.trolleyRolled = { from: snapped, since: 0 }
      this.voices.push(trolleySet)
    } else if (Math.hypot(x - pin[0], y - pin[1]) <= 0.45 && hang(this.at, this.bridge, pin, trolley.weights) && !isFooting(this.at)(pin)) {
      this.save = setTrolley(this.save, trolley.weights, { pin })
      this.voices.push(pendulum)
    } else {
      this.save = setTrolley(this.save, trolley.weights, null)
      if (was) this.voices.push(trolleyOff(trolley.weights))
    }
    this.changed = true
    this.model()
    this.compare()
  }

  private tapTracing(spot: 'pad' | 0 | 1): void {
    const sheet = this.save.sheets[this.save.on]
    if (spot === 'pad') {
      if (this.bridge.length === 0) return
      // A white line copy of the bridge as it stands: a third takes the place of the oldest.
      this.laidTracing = null
      this.save = trace(this.save)
      this.changed = true
      this.voices.push(unrollVoice(1))
      this.model()
      return
    }
    if (!sheet.tracings[spot]) return
    // A kept tracing is laid on the board, or lifted again.
    this.laidTracing = this.laidTracing === spot ? null : spot
    this.voices.push(unrollVoice(1))
    this.model()
    this.compare()
  }

  /** With a tracing laid and the trolley on the bridge, the two are compared. The first time they differ in more than one part, the chief shows one clean comparison. */
  private compare(): void {
    const sheet = this.save.sheets[this.save.on], place = this.trolley.at
    if (this.laidTracing === null || !place || !('x' in place)) return
    const tracing = sheet.tracings[this.laidTracing]
    if (!tracing || !oneChangeDue(this.bridge, tracing, this.save.shown)) return
    this.showing = { differences: nearestDifferences(this.bridge, tracing, place.x) }
    this.save = markShown(this.save, 'one-change')
    this.urgent = true
    this.changed = true
    this.chief.showing('compares')
  }

  /** The bridge on the board was changed for another whole: every part is found where it rests. */
  private reseat(save: Save): void {
    this.save = save
    this.model()
    this.moving = this.rest.map(atRest)
    this.rung = this.bridge.map(() => Infinity); this.turned = this.bridge.map(() => Infinity); this.laid = this.bridge.map(() => Infinity)
    this.flying = []
    this.voices.push(unrollVoice(1))
    this.changed = true
  }

  // --- Time ----------------------------------------------------------------------

  override step(dt: number): void {
    this.sceneClock += dt
    this.trolleyRung += dt
    if (this.trolleyRolled && (this.trolleyRolled.since += dt) > 0.7) this.trolleyRolled = null
    if (this.trolleyFell && (this.trolleyFell.since += dt) > 1.1) this.trolleyFell = null
    if (this.showing && 'differences' in this.showing && this.chief.act !== 'compares') this.showing = null
    if (this.showing && 'idea' in this.showing && this.chief.act !== 'shows') this.showing = null
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
    const near = this.waiting.findIndex((id, place) => onVehicle(this.at, waitAt(this.at, place), longOf(id), TALL[id], x, y))
    if (near >= 0) return { id: this.waiting[near], across: false }
    const far = this.across.findIndex((id, place) => onVehicle(this.at, parkAt(this.at, longOf(id), place), longOf(id), TALL[id], x, y))
    return far >= 0 ? { id: this.across[far], across: true } : null
  }

  /** A vehicle sets off across the bridge as built: the whole run is computed now and then watched. */
  private send(id: VehicleId, homeward: boolean): void {
    // The trolley gives the road to the vehicle: it goes back to the tray first.
    if (this.trolley.at) { this.voices.push(trolleyOff(this.trolley.weights)); this.save = setTrolley(this.save, this.trolley.weights, null); this.changed = true; this.model() }
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
      this.bargeTook = this.at.channel ? bargeReaction(drive.run.ride) : null
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
    // The neat way of this sheet's idea is owed after this scene, if the rule says so: the child has tried first.
    const byJob = !drive.homeward && onNewest(this.save) && drive.vehicle === this.at.job
    const tries = drive.run.ending.kind === 'crossed' ? this.save.tries : Math.max(this.save.tries, 1)
    this.owed = neatWayDue(this.at.idea, tries, drive.run.ending, drive.run.frame.firm.some((firm) => !firm), this.save.shown, byJob) ? this.at.idea : null
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
    if (what === 'react' && this.show.reaction) this.voices.push(reactVoice(drive.vehicle, this.show.reaction.mood), ...(this.bargeTook ? [bargeHorn(this.bargeTook.mood === 'like')] : []))
    if (what === 'arrive') this.voices.push(unrollVoice(1))
    if (what === 'restore') this.voices.push(restore)
  }

  /** The scene is over, by itself or by a touch: everything is where it was taking it. */
  private afterScene(): void {
    this.gave = null
    this.show = idleShow()
    this.scene = null
    this.model()
    // A scene that played out by itself is followed by the showing it owes: it is marked given the moment it starts.
    // A scene a touch ended owes nothing now, and the idea is still owed at the next run that calls for it.
    if (this.owed && !this.skipping) {
      this.showing = { idea: this.owed }
      this.save = markShown(this.save, this.owed)
      this.urgent = true
      this.changed = true
      this.chief.showing('shows')
    }
    this.owed = null
  }

  /** Another sheet comes onto the board: the roll unrolled, or a sheet taken back from the rack. */
  private turn(save: Save): void {
    if (save === this.save) return
    this.save = save
    const sheet = save.sheets[save.on]
    this.at = site(sheet.site, sheet.variant)
    this.selected = (['plank', 'stick', 'tube', 'thread'] as const).find((kind) => this.at.kit[kind] > 0) ?? 'plank'
    this.laidTracing = null
    this.model()
    this.moving = this.rest.map(atRest)
    this.rung = this.bridge.map(() => Infinity); this.turned = this.bridge.map(() => Infinity); this.laid = this.bridge.map(() => Infinity)
    this.flying = []; this.clicked.clear()
    this.voices.push(unrollVoice(1))
    this.urgent = true
    this.changed = true
  }
}
