import type { TableAudio } from './audio'
import { freeSpotOnPlate, GUEST_RADIUS, gazeTarget, inBowl, nextSeat, plateOf, viewFeeding, type FeedingView } from './feeding'
import { chooseHint, guestsShouldReach, handPose, HintScheduler, type HandPose, type Hint, type TableSummary } from './guidance'
import { GestureTracker, type Intent, type Target } from './input'
import { BAG, BAG_MOUTH, FEEDING, SHELF, shelfTile, type MatKey, type Point, type Quarters } from './layout'
import { HOLD_HEIGHT, stoneHeight3, stoneRadius3, TablePhysics, to3, UNIT, type Vec3 } from './physics3d'
import { SaveCadence } from './saveCadence'
import { creak, panDrops, panOf, panWeights, restingBeam, stepBeam, targetTilt, type Beam } from './scale'
import { cutPiece, pullFromBag, returnToBag, serialize, swapMat, tipBag, type Piece, type TableState } from './state'
import { chunk, clusterPieces, groupsFor, schedule } from './voice'
import { SEAT_SPECIES } from './motion'

// The table while it is on screen: game rules, real physics, touch, sound,
// saving, and guidance. It knows nothing about rendering; the 3D view reads
// its public snapshot each frame and hands it a projector for hit tests.

export type Sound = Pick<
  TableAudio,
  'unlock' | 'setActive' | 'touch' | 'clack' | 'rustle' | 'clatter' | 'creak' | 'beat' | 'chord' | 'munch' | 'hop' | 'poke' | 'whoosh' | 'snick' | 'dispose'
>

export const silentSound: Sound = {
  unlock() {},
  setActive() {},
  touch() {},
  clack() {},
  rustle() {},
  clatter() {},
  creak() {},
  beat() {},
  chord() {},
  munch() {},
  hop() {},
  poke() {},
  whoosh() {},
  snick() {},
  dispose() {},
}

/** How the view maps between the screen and the table. */
export type Projector = {
  toScreen(point: Vec3): Point | null
  /** The world point under a screen point, on the horizontal plane at `height` (cm). */
  toPlane(screen: Point, height: number): Point | null
}

type Flight = { id: number; q: Quarters; from: Vec3; to: Vec3; t0: number; duration: number; arc: number; carriesPiece: boolean; land: () => void }

export type FlightView = { id: number; q: Quarters; position: Vec3; spin: number }

export type GuidanceView = {
  hint: Hint | null
  hand: HandPose | null
  glow: number
  glowStones: ReadonlySet<number>
  glowBag: boolean
  glowKnife: boolean
  glowShelf: boolean
  peek: number | null
  guestsReach: boolean
}

type PendingVoice = { groups: () => number[][]; deadline: number }

const HIT_SLOP_PX = 14
const MUNCH_DELAY = 0.9
const BAG_TOP = 11

export class TableController {
  readonly state: TableState
  readonly physics = new TablePhysics()
  private readonly sound: Sound
  private readonly cadence: SaveCadence
  private readonly tracker: GestureTracker
  private readonly scheduler: HintScheduler
  private projector: Projector | null = null
  private readonly held = new Map<number, number>()
  private readonly brooms = new Set<number>()
  private readonly screens = new Map<number, Point>()
  private flights: Flight[] = []
  readonly pulses = new Map<number, number>()
  readonly arrivals = new Map<number, number>()
  /** When a guest was last tapped (they hop and nod back). */
  readonly nudges = new Map<number, number>()
  /** Seconds of attended play; stands still while the table is put away. */
  t = 0
  beam: Beam = restingBeam()
  bagTipStart: number | null = null
  matSlideStart: number | null = null
  munchStart: number | null = null
  shelfDrag: { pointerId: number; mat: MatKey; at: Point } | null = null
  knife = { at: { ...FEEDING.knifeRest } as Point, pointerId: null as number | null }
  guestDrag: { pointerId: number; seat: number; at: Point } | null = null
  feeding: FeedingView
  guidance: GuidanceView
  /** Bumped whenever the set of rendered things changes (pieces, mat, seats). */
  version = 0
  private pendingVoice: PendingVoice | null = null
  private calmSince: number | null = null
  private dealCursor: number | null = null
  private shareWasComplete = false
  private munchAt: number | null = null
  private demoHint: Hint | null = null

  constructor(state: TableState, options: { save: (state: TableState) => void; sound?: Sound }) {
    this.state = state
    this.sound = options.sound ?? silentSound
    this.cadence = new SaveCadence(() => options.save(serialize(this.state)))
    this.tracker = new GestureTracker(() => this.hitTest())
    this.scheduler = new HintScheduler(0)
    this.physics.addBag()
    this.enterMat()
    for (const piece of this.state.pieces) this.addPieceBody(piece)
    this.feeding = viewFeeding(this.state.pieces, this.state.seats)
    this.guidance = this.computeGuidance()
  }

  setProjector(projector: Projector): void {
    this.projector = projector
  }

  /** Attended and visible: sound and time run. Otherwise everything pauses where it is. */
  setRunning(running: boolean): void {
    this.sound.setActive(running)
    if (!running) this.pause()
  }

  dispose(): void {
    this.cadence.settle(performance.now())
    this.sound.dispose()
  }

  // --- lifecycle -----------------------------------------------------------

  /** The table was put away, faded, or hidden mid-anything: every gesture ends where it is. */
  pause(): void {
    this.tracker.reset()
    for (const pointerId of [...this.held.keys()]) this.release(pointerId, { x: 0, y: 0 }, false)
    for (const pointerId of this.brooms) this.physics.setBroom(pointerId, null)
    this.brooms.clear()
    this.shelfDrag = null
    this.guestDrag = null
    this.knife.pointerId = null
    this.pendingVoice = null
    this.munchAt = null
    this.sound.creak(0, 200)
    this.cadence.settle(performance.now())
  }

  step(dt: number): void {
    this.t += dt
    const now = this.t
    for (const [pointerId, id] of this.held) {
      const screen = this.screens.get(pointerId)
      const at = screen && this.projector?.toPlane(screen, HOLD_HEIGHT)
      if (at) this.physics.moveHeld(id, at, HOLD_HEIGHT, 1 - Math.exp(-dt * 22))
    }
    for (const pointerId of this.brooms) {
      const screen = this.screens.get(pointerId)
      const at = screen && this.projector?.toPlane(screen, 1.5)
      if (at) this.physics.setBroom(pointerId, at)
    }
    if (this.state.liveMat === 'scale') {
      this.beam = stepBeam(this.beam, targetTilt(panWeights(this.restingPieces())), dt)
      this.physics.setPanDrops(panDrops(this.beam.angle))
      const sound = creak(this.beam)
      this.sound.creak(sound.gain, sound.pitch)
    }
    const report = this.physics.step(dt)
    for (const id of report.fallen) this.sendHome(id)
    for (const speed of report.impacts.slice(0, 2)) this.sound.clack(speed / 180)
    if (report.moving) this.cadence.markDirty()
    for (const piece of this.state.pieces) {
      const at = this.physics.position2(piece.id)
      if (at) {
        piece.x = at.x
        piece.y = at.y
      }
    }
    this.updateFlights(now)
    for (const [id, start] of this.pulses) if (now - start > 1) this.pulses.delete(id)

    const resting = this.restingPieces()
    this.feeding = viewFeeding(resting, this.state.seats)
    if (this.state.liveMat === 'feeding') this.updateFeeding(now)

    const calm = !report.moving && this.held.size === 0 && this.brooms.size === 0 && this.flights.every((f) => !f.carriesPiece)
    if (calm) this.calmSince ??= now
    else this.calmSince = null
    const calmFor = this.calmSince === null ? 0 : now - this.calmSince
    if (this.pendingVoice && (calmFor > 0.15 || now > this.pendingVoice.deadline)) {
      const groups = this.pendingVoice.groups()
      this.pendingVoice = null
      this.speak(groups)
    }
    if (calm) this.cadence.settle(performance.now())
    this.guidance = this.computeGuidance()
  }

  /** Seconds the table has been untouched and still with no demonstration playing; the view paces rendering down while nothing happens. */
  restingFor(): number {
    if (this.guidance.hand || (this.munchStart !== null && this.t - this.munchStart < 3)) return 0
    const calm = this.calmSince === null ? 0 : this.t - this.calmSince
    return Math.min(calm, this.scheduler.idleFor(this.t))
  }

  private updateFeeding(now: number): void {
    const view = this.feeding
    const calm = this.held.size === 0 && this.flights.every((f) => !f.carriesPiece)
    if (view.shareComplete && !this.shareWasComplete) this.munchAt = now + MUNCH_DELAY
    if (!view.shareComplete) this.munchAt = null
    if (this.munchAt !== null && now >= this.munchAt && calm) {
      this.munchAt = null
      this.munchStart = now
      this.sound.munch()
      this.sound.chord()
    }
    this.shareWasComplete = view.shareComplete
    if (this.knife.pointerId === null && !view.leftover) this.knife.at = { ...FEEDING.knifeRest }
  }

  private updateFlights(now: number): void {
    const done = this.flights.filter((flight) => now - flight.t0 >= flight.duration)
    this.flights = this.flights.filter((flight) => now - flight.t0 < flight.duration)
    for (const flight of done) flight.land()
  }

  // --- snapshot for the view ----------------------------------------------

  flightViews(): FlightView[] {
    return this.flights.map((flight) => {
      const k = Math.min(1, Math.max(0, (this.t - flight.t0) / flight.duration))
      const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      return {
        id: flight.id,
        q: flight.q,
        position: {
          x: flight.from.x + (flight.to.x - flight.from.x) * ease,
          y: flight.from.y + (flight.to.y - flight.from.y) * ease + Math.sin(k * Math.PI) * flight.arc,
          z: flight.from.z + (flight.to.z - flight.from.z) * ease,
        },
        spin: k * Math.PI * 2,
      }
    })
  }

  /** Stones drawn from physics: everything on the table except those currently in a carrying flight. */
  visibleStoneIds(): number[] {
    const carried = this.carriedIds()
    return this.state.pieces.filter((piece) => !carried.has(piece.id)).map((piece) => piece.id)
  }

  quartersOf(id: number): Quarters {
    return this.state.pieces.find((piece) => piece.id === id)?.q ?? 4
  }

  isHeld(id: number): boolean {
    for (const held of this.held.values()) if (held === id) return true
    return false
  }

  pulse(id: number): number {
    const start = this.pulses.get(id)
    if (start === undefined) return 0
    const k = (this.t - start) / 0.45
    return k < 0 || k > 1 ? 0 : Math.sin(k * Math.PI)
  }

  shelfMats(): MatKey[] {
    return this.state.shelf.filter((mat) => mat !== this.state.liveMat)
  }

  gaze(seat: number): Point | null {
    if (this.guidance.guestsReach) return FEEDING.bowl
    const target = gazeTarget(this.feeding, seat)
    return target === null ? null : FEEDING.seats[target].plate
  }

  // --- guidance ------------------------------------------------------------

  private summary(): TableSummary {
    const resting = this.restingPieces()
    const zone = (piece: Piece) =>
      this.state.liveMat === 'scale' ? panOf(piece) !== null : inBowl(piece) || (plateOf(piece) !== null && this.state.seats[plateOf(piece)!])
    const tile = shelfTile(0)
    return {
      liveMat: this.state.liveMat,
      bag: this.state.bag,
      loose: resting.filter((piece) => !zone(piece)).map(({ id, x, y }) => ({ id, x, y })),
      panWeights: panWeights(resting),
      bowl: this.state.liveMat === 'feeding' ? resting.filter((piece) => inBowl(piece)).map(({ id, x, y }) => ({ id, x, y })) : [],
      plates: this.feeding.plates,
      seats: this.state.seats,
      shareComplete: this.feeding.shareComplete,
      leftover: this.state.liveMat === 'feeding' && this.feeding.leftover,
      knife: FEEDING.knifeRest,
      shelf: this.shelfMats().length > 0 ? { x: tile.x, y: tile.y } : null,
    }
  }

  private untouchedTable(): boolean {
    return this.state.pieces.length === 0 && this.state.bag === this.state.total && this.state.parked.feeding.length === 0 && this.state.parked.scale.length === 0
  }

  private computeGuidance(): GuidanceView {
    const timing = this.scheduler.state(this.t, this.untouchedTable())
    const summary = this.summary()
    if (timing.demo === null) this.demoHint = null
    else this.demoHint ??= chooseHint(summary)
    const hint = this.demoHint
    const glowStones = new Set<number>(hint?.stoneIds ?? [])
    if (timing.glow > 0) for (const stone of summary.bowl) glowStones.add(stone.id)
    return {
      hint,
      hand: hint && timing.demo !== null ? handPose(hint, timing.demo) : null,
      glow: timing.glow,
      glowStones,
      glowBag: this.state.bag > 0 && (summary.loose.length === 0 || hint?.from.x === BAG.x),
      glowKnife: summary.leftover,
      glowShelf: hint?.kind === 'swapMat',
      peek: timing.peek,
      guestsReach: guestsShouldReach(summary, timing.glow),
    }
  }

  // --- helpers -------------------------------------------------------------

  private carriedIds(): Set<number> {
    return new Set(this.flights.filter((flight) => flight.carriesPiece).map((flight) => flight.id))
  }

  private restingPieces(): Piece[] {
    const heldIds = new Set(this.held.values())
    const carried = this.carriedIds()
    return this.state.pieces.filter((piece) => !heldIds.has(piece.id) && !carried.has(piece.id))
  }

  private pieceById(id: number): Piece | undefined {
    return this.state.pieces.find((piece) => piece.id === id)
  }

  private restHeight(piece: Piece): number {
    const half = stoneHeight3(piece.q) / 2
    if (this.state.liveMat === 'scale') {
      const side = panOf(piece)
      if (side !== null) return this.physics.panTop(side) + half + 0.2
    }
    return half + 0.05
  }

  private addPieceBody(piece: Piece, options: { y?: number; velocity?: Vec3; spin?: number } = {}): void {
    this.physics.addStone(piece.id, piece.q, piece, { y: options.y ?? this.restHeight(piece), velocity: options.velocity, spin: options.spin })
  }

  private enterMat(): void {
    this.physics.setMat(this.state.liveMat)
    this.syncGuests()
  }

  private syncGuests(): void {
    FEEDING.seats.forEach((seat, index) => {
      const key = `guest-${index}`
      if (this.state.liveMat !== 'feeding') this.physics.removeFixture(key)
      else if (this.state.seats[index] && this.guestDrag?.seat !== index) this.physics.setFixture(key, { ...seat.guest, r: GUEST_RADIUS }, 10)
      else if (!this.state.seats[index]) this.physics.setFixture(key, { ...seat.guest, r: 42 }, 3)
      else this.physics.removeFixture(key)
    })
  }

  private changed(): void {
    this.version += 1
  }

  private sendHome(id: number): void {
    const piece = this.pieceById(id)
    const body = this.physics.body(id)
    if (!piece || !body) return
    const from = { x: body.position.x, y: body.position.y, z: body.position.z }
    this.physics.removeStone(id)
    returnToBag(this.state, id)
    this.changed()
    this.flights.push({
      id,
      q: piece.q,
      from,
      to: to3(BAG, BAG_TOP),
      t0: this.t,
      duration: 0.5,
      arc: 18,
      carriesPiece: false,
      land: () => this.sound.clatter(1),
    })
    this.cadence.change(performance.now(), true)
  }

  private speak(groups: number[][]): void {
    const live = groups.map((group) => group.filter((id) => this.pieceById(id))).filter((group) => group.length > 0)
    for (const beat of schedule(live)) {
      this.sound.beat(beat.step, beat.t)
      for (const id of beat.ids) this.pulses.set(id, this.t + beat.t)
    }
  }

  private placed(pieces: Piece[]) {
    return pieces.map((piece) => ({ id: piece.id, x: piece.x, y: piece.y, r: stoneRadius3(piece.q) / UNIT }))
  }

  private voiceFor(id: number): () => number[][] {
    return () => {
      const piece = this.pieceById(id)
      if (!piece) return []
      const resting = this.restingPieces()
      if (this.state.liveMat === 'scale' && panOf(piece) !== null) {
        return [0, 1].flatMap((side) => chunk(resting.filter((p) => panOf(p) === side).map((p) => p.id)))
      }
      const plate = plateOf(piece)
      if (this.state.liveMat === 'feeding' && plate !== null && this.state.seats[plate]) {
        return chunk(resting.filter((p) => plateOf(p) === plate).map((p) => p.id))
      }
      const heap = clusterPieces(this.placed(resting)).find((ids) => ids.includes(id))
      return heap ? chunk(heap) : []
    }
  }

  // --- input ---------------------------------------------------------------

  pointerDown(pointerId: number, screen: Point, timeMs: number): void {
    this.sound.unlock()
    this.scheduler.touch(this.t)
    this.screens.set(pointerId, screen)
    this.apply(this.tracker.down(pointerId, this.planePoint(screen), timeMs))
  }

  pointerMove(pointerId: number, screen: Point, timeMs: number): void {
    if (!this.screens.has(pointerId)) return
    this.screens.set(pointerId, screen)
    this.apply(this.tracker.move(pointerId, this.planePoint(screen), timeMs))
  }

  pointerUp(pointerId: number, screen: Point, timeMs: number): void {
    this.sound.unlock()
    this.scheduler.touch(this.t)
    this.screens.set(pointerId, screen)
    this.apply(this.tracker.up(pointerId, this.planePoint(screen), timeMs))
    if (this.held.has(pointerId)) this.release(pointerId, { x: 0, y: 0 }, false)
    this.screens.delete(pointerId)
  }

  pointerCancel(pointerId: number): void {
    this.apply(this.tracker.cancel(pointerId))
    if (this.held.has(pointerId)) this.release(pointerId, { x: 0, y: 0 }, false)
    this.screens.delete(pointerId)
  }

  private planePoint(screen: Point): Point {
    return this.projector?.toPlane(screen, 0) ?? { x: 0, y: 0 }
  }

  private lastScreen(): Point | null {
    const points = [...this.screens.values()]
    return points[points.length - 1] ?? null
  }

  /** Screen-space hit test: the table is seen at an angle, so compare projected positions in pixels. */
  private hitTest(): Target {
    const screen = this.lastScreen()
    const projector = this.projector
    if (!screen || !projector) return { kind: 'broom' }
    const pixelRadius = (center: Vec3, radius: number) => {
      const a = projector.toScreen(center)
      const b = projector.toScreen({ x: center.x + radius, y: center.y, z: center.z })
      return a && b ? { at: a, r: Math.hypot(b.x - a.x, b.y - a.y) } : null
    }
    const within = (center: Vec3, radius: number, slop = HIT_SLOP_PX) => {
      const projected = pixelRadius(center, radius)
      if (!projected) return Infinity
      const distance = Math.hypot(projected.at.x - screen.x, projected.at.y - screen.y)
      return distance <= projected.r + slop ? distance : Infinity
    }

    const mats = this.shelfMats()
    for (let i = 0; i < mats.length; i++) {
      const tile = shelfTile(i)
      if (within(to3(tile, tile.height + 1), 7) < Infinity) return { kind: 'shelf', mat: mats[i] }
    }
    if (this.state.liveMat === 'feeding' && this.feeding.leftover && within(to3(this.knife.at, 1), 6) < Infinity) return { kind: 'knife' }

    let best: { id: number; distance: number } | null = null
    for (const piece of this.restingPieces()) {
      const body = this.physics.body(piece.id)
      if (!body) continue
      const distance = within({ x: body.position.x, y: body.position.y, z: body.position.z }, stoneRadius3(piece.q))
      if (distance < (best?.distance ?? Infinity)) best = { id: piece.id, distance }
    }
    if (best) return { kind: 'piece', id: best.id }
    if (within(to3(BAG, 6), 9) < Infinity) return { kind: 'bag' }
    if (this.state.liveMat === 'feeding') {
      for (let seat = 0; seat < FEEDING.seats.length; seat++) {
        const guest = FEEDING.seats[seat].guest
        if (within(to3(guest, 5), 5.5) < Infinity) return this.state.seats[seat] ? { kind: 'guest', seat } : { kind: 'chair', seat }
      }
      if (within(to3(FEEDING.bowl, 1), FEEDING.bowl.r * UNIT, 0) < Infinity) return { kind: 'bowl' }
    }
    return { kind: 'broom' }
  }

  private apply(intents: Intent[]): void {
    for (const intent of intents) this.handle(intent)
  }

  private handle(intent: Intent): void {
    switch (intent.type) {
      case 'press':
        return this.press(intent.pointerId, intent.target)
      case 'tap':
        return this.tap(intent.pointerId, intent.target)
      case 'dragStart':
        return this.dragStart(intent.pointerId, intent.target)
      case 'dragMove':
        return this.dragMove(intent.pointerId, intent.at)
      case 'dragEnd':
        return this.dragEnd(intent.pointerId, intent.at, intent.velocity)
      case 'cancelAll':
        return this.cancelAll(intent.pointerIds)
      default: {
        const unreachable: never = intent
        return unreachable
      }
    }
  }

  private press(pointerId: number, target: Target): void {
    if (target.kind === 'piece') {
      const piece = this.pieceById(target.id)
      if (!piece) return
      this.held.set(pointerId, target.id)
      this.physics.hold(target.id)
      this.sound.touch(piece.q === 4 ? 1 : 1.4)
      return
    }
    if (target.kind !== 'broom') this.sound.touch(target.kind === 'bag' ? 0.8 : 1.2)
  }

  private tap(pointerId: number, target: Target): void {
    switch (target.kind) {
      case 'piece': {
        const piece = this.pieceById(target.id)
        const dealing = this.state.liveMat === 'feeding' && piece !== undefined && inBowl(piece)
        this.release(pointerId, { x: 0, y: 0 })
        if (dealing) this.hopFromBowl(target.id)
        return
      }
      case 'bag':
        return this.tipBag()
      case 'shelf':
        return this.bringOut(target.mat)
      case 'chair':
        return this.seat(target.seat)
      case 'guest':
        this.nudges.set(target.seat, this.t)
        this.sound.poke(SEAT_SPECIES[target.seat % SEAT_SPECIES.length])
        return
      case 'bowl':
        return this.hopFromBowl()
      case 'knife':
      case 'broom':
        return
      default: {
        const unreachable: never = target
        return unreachable
      }
    }
  }

  private dragStart(pointerId: number, target: Target): void {
    const screen = this.screens.get(pointerId)
    switch (target.kind) {
      case 'bag': {
        const at = (screen && this.projector?.toPlane(screen, HOLD_HEIGHT)) ?? BAG_MOUTH
        const piece = pullFromBag(this.state, at)
        if (!piece) return
        this.addPieceBody(piece, { y: HOLD_HEIGHT })
        this.physics.hold(piece.id)
        this.held.set(pointerId, piece.id)
        this.changed()
        this.cadence.change(performance.now(), true)
        return
      }
      case 'broom':
        this.brooms.add(pointerId)
        return
      case 'shelf': {
        const at = (screen && this.projector?.toPlane(screen, 4)) ?? { x: SHELF.x, y: SHELF.y }
        this.shelfDrag = { pointerId, mat: target.mat, at }
        return
      }
      case 'knife':
        this.knife.pointerId = pointerId
        return
      case 'guest':
        if (this.feeding.plates[target.seat] === 0) {
          this.guestDrag = { pointerId, seat: target.seat, at: { ...FEEDING.seats[target.seat].guest } }
          this.syncGuests()
        }
        return
      case 'piece':
      case 'chair':
      case 'bowl':
        return
      default: {
        const unreachable: never = target
        return unreachable
      }
    }
  }

  private dragMove(pointerId: number, at: Point): void {
    if (this.held.has(pointerId)) {
      this.cadence.change(performance.now())
      return
    }
    const screen = this.screens.get(pointerId)
    const lifted = (screen && this.projector?.toPlane(screen, 4)) ?? at
    if (this.shelfDrag?.pointerId === pointerId) this.shelfDrag.at = lifted
    else if (this.knife.pointerId === pointerId) this.knife.at = lifted
    else if (this.guestDrag?.pointerId === pointerId) this.guestDrag.at = lifted
  }

  private dragEnd(pointerId: number, at: Point, velocity: Point): void {
    if (this.held.has(pointerId)) return this.release(pointerId, velocity)
    if (this.brooms.delete(pointerId)) {
      this.physics.setBroom(pointerId, null)
      return
    }
    if (this.shelfDrag?.pointerId === pointerId) {
      const mat = this.shelfDrag.mat
      this.shelfDrag = null
      if (at.x < SHELF.x - 20) this.bringOut(mat)
      return
    }
    if (this.knife.pointerId === pointerId) return this.dropKnife()
    if (this.guestDrag?.pointerId === pointerId) {
      const { seat, at: dropped } = this.guestDrag
      this.guestDrag = null
      const home = FEEDING.seats[seat].guest
      if (Math.hypot(dropped.x - home.x, dropped.y - home.y) > 130) {
        this.state.seats[seat] = false
        this.sound.hop()
        this.changed()
        this.cadence.change(performance.now(), true)
      }
      this.syncGuests()
    }
  }

  private cancelAll(pointerIds: number[]): void {
    for (const pointerId of pointerIds) {
      if (this.held.has(pointerId)) this.release(pointerId, { x: 0, y: 0 }, false)
      if (this.brooms.delete(pointerId)) this.physics.setBroom(pointerId, null)
    }
    this.shelfDrag = null
    this.guestDrag = null
    this.knife.pointerId = null
    this.syncGuests()
  }

  private release(pointerId: number, velocity: Point, speak = true): void {
    const id = this.held.get(pointerId)
    this.held.delete(pointerId)
    if (id === undefined || !this.pieceById(id)) return
    const at = this.physics.position2(id)
    if (at && Math.hypot(at.x - BAG.x, at.y - BAG.y) < BAG.r * 0.8) {
      this.physics.release(id, { x: 0, y: 0 })
      return this.sendHome(id)
    }
    this.physics.release(id, velocity)
    if (speak) this.pendingVoice = { groups: this.voiceFor(id), deadline: this.t + 2.5 }
    this.cadence.change(performance.now(), true)
  }

  private tipBag(): void {
    const spilled = tipBag(this.state)
    this.bagTipStart = this.t
    if (spilled.length === 0) {
      this.sound.touch(0.7)
      return
    }
    this.sound.rustle()
    spilled.forEach((piece, index) => {
      const spread = (index / Math.max(1, spilled.length - 1) - 0.5) * 1.2
      const angle = -0.6 + spread + (Math.random() - 0.5) * 0.3
      const speed = 70 + Math.random() * 55
      piece.x += Math.cos(angle) * 12
      piece.y += Math.sin(angle) * 12
      this.addPieceBody(piece, {
        y: 6 + index * 2.6,
        velocity: { x: Math.cos(angle) * speed, y: 28 + Math.random() * 22, z: Math.sin(angle) * speed },
        spin: (Math.random() - 0.5) * 14,
      })
    })
    const ids = spilled.map((piece) => piece.id)
    this.pendingVoice = { groups: () => groupsFor(this.placed(this.restingPieces().filter((p) => ids.includes(p.id)))), deadline: this.t + 3.5 }
    this.changed()
    this.cadence.change(performance.now(), true)
  }

  private bringOut(mat: MatKey): void {
    if (mat === this.state.liveMat) return
    for (const pointerId of [...this.held.keys()]) this.release(pointerId, { x: 0, y: 0 }, false)
    const landing = this.flights.filter((flight) => flight.carriesPiece)
    this.flights = this.flights.filter((flight) => !flight.carriesPiece)
    for (const flight of landing) flight.land()
    this.knife.pointerId = null
    this.guestDrag = null
    swapMat(this.state, mat)
    for (const id of this.physics.stoneIds()) this.physics.removeStone(id)
    this.beam = restingBeam()
    this.enterMat()
    for (const piece of this.state.pieces) this.addPieceBody(piece)
    this.matSlideStart = this.t
    this.dealCursor = null
    this.shareWasComplete = false
    this.munchAt = null
    this.munchStart = null
    this.pendingVoice = null
    this.sound.whoosh()
    this.changed()
    this.cadence.change(performance.now(), true)
  }

  private seat(seat: number): void {
    this.state.seats[seat] = true
    this.arrivals.set(seat, this.t)
    this.syncGuests()
    this.sound.hop()
    this.changed()
    this.cadence.change(performance.now(), true)
  }

  private hopFromBowl(chosen?: number): void {
    const id = chosen ?? this.feeding.bowlIds[0]
    const seat = nextSeat(this.state.seats, this.dealCursor)
    const piece = id === undefined ? undefined : this.pieceById(id)
    if (!piece || seat === null) {
      this.sound.touch(1.1)
      return
    }
    const body = this.physics.body(piece.id)
    const from = body ? { x: body.position.x, y: body.position.y, z: body.position.z } : to3(piece, 1)
    const onPlate = this.restingPieces().filter((p) => plateOf(p) === seat)
    const spot = freeSpotOnPlate(seat, onPlate, stoneRadius3(piece.q) / UNIT)
    this.physics.removeStone(piece.id)
    this.dealCursor = seat
    this.sound.hop()
    this.flights.push({
      id: piece.id,
      q: piece.q,
      from,
      to: to3(spot, stoneHeight3(piece.q) / 2 + 0.6),
      t0: this.t,
      duration: 0.42,
      arc: 9,
      carriesPiece: true,
      land: () => {
        if (!this.pieceById(piece.id)) return
        piece.x = spot.x
        piece.y = spot.y
        this.addPieceBody(piece, { y: stoneHeight3(piece.q) / 2 + 0.6 })
        this.sound.touch(1)
        this.pendingVoice = { groups: this.voiceFor(piece.id), deadline: this.t + 1 }
        this.cadence.change(performance.now(), true)
      },
    })
  }

  private dropKnife(): void {
    const at = this.knife.at
    this.knife.pointerId = null
    this.knife.at = { ...FEEDING.knifeRest }
    if (this.state.liveMat !== 'feeding') return
    const target = this.restingPieces()
      .filter((piece) => piece.q > 1)
      .map((piece) => ({ piece, distance: Math.hypot(piece.x - at.x, piece.y - at.y) }))
      .filter(({ piece, distance }) => distance < stoneRadius3(piece.q) / UNIT + 30)
      .sort((a, b) => a.distance - b.distance)[0]
    if (!target) return
    const halves = cutPiece(this.state, target.piece.id)
    if (halves.length === 0) return
    this.physics.removeStone(target.piece.id)
    halves.forEach((half, index) => {
      this.addPieceBody(half, { y: stoneHeight3(half.q) / 2 + 0.4, velocity: { x: (index === 0 ? -1 : 1) * 12, y: 6, z: 0 } })
      this.pulses.set(half.id, this.t)
    })
    this.sound.snick()
    this.changed()
    this.cadence.change(performance.now(), true)
  }
}
