import { TableAudio } from './audio'
import { freeSpotOnPlate, gazeTarget, GUEST_RADIUS, inBowl, nextSeat, plateOf, viewFeeding, type FeedingView } from './feeding'
import { GestureTracker, pickPiece, type Intent, type Target } from './input'
import {
  BAG,
  FEEDING,
  fitWorld,
  insideCircle,
  RADIUS_BY_QUARTERS,
  SCALE,
  SHELF,
  shelfSlot,
  TABLE,
  toWorld,
  type Circle,
  type Fit,
  type MatKey,
  type Point,
  type Quarters,
} from './layout'
import { stepWorld, type Body, type Pusher } from './physics'
import { drawTable, renderTableTexture, type Flight, type Puff, type RenderModel } from './render'
import { SaveCadence } from './saveCadence'
import { creak, panDrops, panOf, panWeights, restingBeam, stepBeam, targetTilt, type Beam } from './scale'
import { cutPiece, pullFromBag, returnToBag, serialize, swapMat, tipBag, type Piece, type TableState } from './state'
import { chunk, clusterPieces, groupsFor, schedule } from './voice'

// The scene owns the canvas, the loop, and the table while the Mount is on
// screen, in the shape of Tada's fishing scene: an attention-gated rAF loop,
// a ResizeObserver on its own canvas, and disposal on unmount. Game rules
// live in the pure modules; this file only wires them to touch, sound,
// and pixels.

type FlightAnim = {
  id: number
  q: Quarters
  from: Point
  to: Point
  t0: number
  duration: number
  arc: number
  land: (() => void) | null
}

type PendingVoice = { groups: () => number[][]; deadline: number }

export type SceneOptions = {
  state: TableState
  save: (state: TableState) => void
}

const BASE_FRICTION = 3.2
const ZONE_FRICTION = 7.5
const BROOM_RADIUS = 46
const PIECE_SLOP = 22
const MUNCH_DELAY = 0.9
const BAG_BODY: Circle = { x: BAG.x, y: BAG.y + 10, r: 80 }

export class PebbleScene {
  private readonly canvas: HTMLCanvasElement
  private readonly g: CanvasRenderingContext2D
  private readonly state: TableState
  private readonly audio = new TableAudio()
  private readonly cadence: SaveCadence
  private readonly tracker: GestureTracker
  private readonly resizeObserver: ResizeObserver
  private readonly bodies = new Map<number, Body>()
  private readonly held = new Map<number, number>()
  private readonly brooms = new Map<number, Pusher>()
  private readonly flights: FlightAnim[] = []
  private readonly pulses = new Map<number, number>()
  private readonly arrivals = new Map<number, number>()
  private puffs: Puff[] = []
  private fit: Fit = fitWorld(0, 0)
  private dpr = 1
  private texture: HTMLCanvasElement | null = null
  private attended = true
  private hidden = false
  private raf: number | null = null
  private lastFrame: number | null = null
  private readonly epoch = performance.now()
  private beam: Beam = restingBeam()
  private bagTipStart: number | null = null
  private matSlideStart: number | null = null
  private pendingVoice: PendingVoice | null = null
  private calmSince: number | null = null
  private shelfDrag: { pointerId: number; mat: MatKey; x: number; y: number } | null = null
  private knife = { x: FEEDING.knifeRest.x, y: FEEDING.knifeRest.y, pointerId: null as number | null }
  private guestDrag: { pointerId: number; seat: number; x: number; y: number } | null = null
  private dealCursor: number | null = null
  private shareWasComplete = false
  private munchAt: number | null = null
  private munchStart: number | null = null
  private feedingView: FeedingView | null = null

  constructor(canvas: HTMLCanvasElement, options: SceneOptions) {
    this.canvas = canvas
    this.g = canvas.getContext('2d')!
    this.state = options.state
    this.cadence = new SaveCadence(() => options.save(serialize(this.state)))
    this.tracker = new GestureTracker((at) => this.hitTest(at))
    for (const piece of this.state.pieces) this.addBody(piece)
    this.hidden = document.visibilityState === 'hidden'

    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerCancel)
    canvas.addEventListener('contextmenu', this.preventDefault)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.resize()
    this.updateRunning()
  }

  setAttended(attended: boolean): void {
    this.attended = attended
    if (!attended) this.cadence.settle(performance.now())
    this.updateRunning()
  }

  dispose(): void {
    this.cadence.settle(performance.now())
    this.stopLoop()
    this.resizeObserver.disconnect()
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel)
    this.canvas.removeEventListener('contextmenu', this.preventDefault)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.audio.dispose()
  }

  private now(): number {
    return (performance.now() - this.epoch) / 1000
  }

  // --- lifecycle -----------------------------------------------------------

  private readonly onVisibility = () => {
    this.hidden = document.visibilityState === 'hidden'
    if (this.hidden) this.cadence.settle(performance.now())
    this.updateRunning()
  }

  private updateRunning(): void {
    const running = this.attended && !this.hidden
    this.audio.setActive(running)
    if (running) this.startLoop()
    else this.stopLoop()
  }

  private startLoop(): void {
    if (this.raf !== null) return
    this.lastFrame = null
    this.raf = requestAnimationFrame(this.frame)
  }

  private stopLoop(): void {
    if (this.raf !== null) cancelAnimationFrame(this.raf)
    this.raf = null
  }

  private resize(): void {
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    const fit = fitWorld(width, height)
    if (!fit.usable) return
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.canvas.width = Math.round(width * this.dpr)
    this.canvas.height = Math.round(height * this.dpr)
    this.fit = fit
    this.texture = renderTableTexture(fit.scale * this.dpr)
    this.draw()
  }

  // --- the loop ------------------------------------------------------------

  private readonly frame = (timestamp: number) => {
    this.raf = requestAnimationFrame(this.frame)
    const dt = this.lastFrame === null ? 1 / 60 : Math.min(0.05, (timestamp - this.lastFrame) / 1000)
    this.lastFrame = timestamp
    this.update(dt)
    this.draw()
  }

  private update(dt: number): void {
    const now = this.now()
    const bodies = [...this.bodies.values()]
    for (const body of bodies) body.friction = this.frictionAt(body)
    const report = stepWorld(bodies, dt, TABLE, [...this.brooms.values()], this.fixtures(), this.containers())
    for (const id of report.fallen) this.sendHome(id)
    for (const impact of report.impacts.slice(0, 2)) this.audio.clack(impact.speed / 900)
    if (report.moving) this.cadence.markDirty()
    for (const piece of this.state.pieces) {
      const body = this.bodies.get(piece.id)
      if (body) {
        piece.x = body.x
        piece.y = body.y
      }
    }
    this.updateFlights(now)
    this.puffs = this.puffs.filter((puff) => now - puff.t < 0.7)
    for (const [id, start] of this.pulses) if (now - start > 1) this.pulses.delete(id)

    const resting = this.restingPieces()
    if (this.state.liveMat === 'scale') {
      this.beam = stepBeam(this.beam, targetTilt(panWeights(resting)), dt)
      const sound = creak(this.beam)
      this.audio.creak(sound.gain, sound.pitch)
    } else {
      this.audio.creak(0, 200)
      this.updateFeeding(now, resting)
    }

    const calm = !report.moving && this.held.size === 0 && this.brooms.size === 0 && this.flights.length === 0
    if (calm) this.calmSince ??= now
    else this.calmSince = null
    const calmFor = this.calmSince === null ? 0 : now - this.calmSince
    if (this.pendingVoice && (calmFor > 0.15 || now > this.pendingVoice.deadline)) {
      const groups = this.pendingVoice.groups()
      this.pendingVoice = null
      this.speak(groups)
    }
    if (calm) this.cadence.settle(performance.now())
  }

  /** Things stones bump into but cannot move: the bag, and guests sitting at the table. */
  private fixtures(): Circle[] {
    const fixtures: Circle[] = [BAG_BODY]
    if (this.state.liveMat === 'feeding') {
      FEEDING.seats.forEach((seat, index) => {
        if (this.state.seats[index] && this.guestDrag?.seat !== index) fixtures.push({ ...seat.guest, r: GUEST_RADIUS })
      })
    }
    return fixtures
  }

  private containers(): readonly Circle[] {
    return this.state.liveMat === 'scale' ? SCALE.pans : [FEEDING.bowl]
  }

  private frictionAt(body: Body): number {
    if (this.state.liveMat === 'scale') return panOf(body) === null ? BASE_FRICTION : ZONE_FRICTION
    return inBowl(body) || plateOf(body) !== null ? ZONE_FRICTION : BASE_FRICTION
  }

  private updateFeeding(now: number, resting: Piece[]): void {
    const view = viewFeeding(resting, this.state.seats)
    this.feedingView = view
    const calm = this.held.size === 0 && this.flights.length === 0
    if (view.shareComplete && !this.shareWasComplete) this.munchAt = now + MUNCH_DELAY
    if (!view.shareComplete) this.munchAt = null
    if (this.munchAt !== null && now >= this.munchAt && calm) {
      this.munchAt = null
      this.munchStart = now
      this.audio.munch()
      this.audio.chord()
    }
    this.shareWasComplete = view.shareComplete
    if (this.knife.pointerId === null && !view.leftover) {
      this.knife.x = FEEDING.knifeRest.x
      this.knife.y = FEEDING.knifeRest.y
    }
  }

  private updateFlights(now: number): void {
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i]
      if (now - flight.t0 < flight.duration) continue
      this.flights.splice(i, 1)
      flight.land?.()
    }
  }

  private flightPosition(flight: FlightAnim, now: number): Flight {
    const k = Math.min(1, Math.max(0, (now - flight.t0) / flight.duration))
    const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
    return {
      id: flight.id,
      q: flight.q,
      x: flight.from.x + (flight.to.x - flight.from.x) * ease,
      y: flight.from.y + (flight.to.y - flight.from.y) * ease - Math.sin(k * Math.PI) * flight.arc,
      scale: Math.sin(k * Math.PI),
    }
  }

  // --- drawing -------------------------------------------------------------

  private draw(): void {
    if (!this.fit.usable) return
    const { scale, offsetX, offsetY } = this.fit
    const d = this.dpr
    this.g.setTransform(d * scale, 0, 0, d * scale, d * offsetX, d * offsetY)
    drawTable(this.g, this.model(), this.texture)
  }

  private model(): RenderModel {
    const now = this.now()
    const flying = new Set(this.flights.filter((f) => f.land).map((f) => f.id))
    const drops = panDrops(this.beam.angle)
    const heldIds = new Set(this.held.values())
    const view = this.feedingView ?? viewFeeding(this.restingPieces(), this.state.seats)
    return {
      now,
      liveMat: this.state.liveMat,
      pieces: this.state.pieces.filter((piece) => !flying.has(piece.id)),
      dropOf: (piece) => {
        if (this.state.liveMat !== 'scale' || heldIds.has(piece.id)) return 0
        const side = panOf(piece)
        return side === null ? 0 : drops[side]
      },
      heldIds,
      beamAngle: this.beam.angle,
      bagFullness: this.state.bag / this.state.total,
      bagTipStart: this.bagTipStart,
      flights: this.flights.map((flight) => this.flightPosition(flight, now)),
      pulses: this.pulses,
      puffs: this.puffs,
      shelf: this.shelfMats(),
      shelfDrag: this.shelfDrag,
      matSlideStart: this.matSlideStart,
      feeding:
        this.state.liveMat === 'feeding'
          ? {
              view,
              seats: this.state.seats,
              gaze: (seat) => gazeTarget(view, seat),
              munchStart: this.munchStart,
              arrivals: this.arrivals,
              guestDrag: this.guestDrag,
              knife: { x: this.knife.x, y: this.knife.y, visible: view.leftover || this.knife.pointerId !== null, held: this.knife.pointerId !== null },
            }
          : null,
    }
  }

  // --- helpers -------------------------------------------------------------

  private shelfMats(): MatKey[] {
    return this.state.shelf.filter((mat) => mat !== this.state.liveMat)
  }

  private restingPieces(): Piece[] {
    const heldIds = new Set(this.held.values())
    const flying = new Set(this.flights.filter((f) => f.land).map((f) => f.id))
    return this.state.pieces.filter((piece) => !heldIds.has(piece.id) && !flying.has(piece.id))
  }

  private addBody(piece: Piece, velocity: Point = { x: 0, y: 0 }): Body {
    const body: Body = {
      id: piece.id,
      x: piece.x,
      y: piece.y,
      vx: velocity.x,
      vy: velocity.y,
      r: RADIUS_BY_QUARTERS[piece.q],
      kinematic: false,
      friction: BASE_FRICTION,
    }
    this.bodies.set(piece.id, body)
    return body
  }

  private pieceById(id: number): Piece | undefined {
    return this.state.pieces.find((piece) => piece.id === id)
  }

  /** A piece left the table: it goes home to the bag, visibly, with a clatter. */
  private sendHome(id: number): void {
    const piece = this.pieceById(id)
    const body = this.bodies.get(id)
    if (!piece || !body) return
    this.bodies.delete(id)
    returnToBag(this.state, id)
    const now = this.now()
    this.flights.push({
      id,
      q: piece.q,
      from: { x: body.x, y: body.y },
      to: { x: BAG.x, y: BAG.y - 20 },
      t0: now,
      duration: 0.45,
      arc: 120,
      land: null,
    })
    setTimeout(() => {
      this.audio.clatter(1)
      this.puffs.push({ x: BAG.x, y: BAG.y - 30, t: this.now() })
    }, 430)
    this.cadence.change(performance.now(), true)
  }

  private speak(groups: number[][]): void {
    const live = groups.map((group) => group.filter((id) => this.pieceById(id))).filter((group) => group.length > 0)
    const beats = schedule(live)
    const now = this.now()
    for (const beat of beats) {
      this.audio.beat(beat.step, beat.t)
      for (const id of beat.ids) this.pulses.set(id, now + beat.t)
    }
  }

  private placed(pieces: Piece[]) {
    return pieces.map((piece) => ({ id: piece.id, x: piece.x, y: piece.y, r: RADIUS_BY_QUARTERS[piece.q] }))
  }

  /** The set the child just acted on, as the number voice should group it. */
  private voiceFor(id: number): () => number[][] {
    return () => {
      const piece = this.pieceById(id)
      if (!piece) return []
      const resting = this.restingPieces()
      if (this.state.liveMat === 'scale') {
        const side = panOf(piece)
        if (side !== null) {
          const pans = [0, 1].map((s) => resting.filter((p) => panOf(p) === s).map((p) => p.id))
          return pans.flatMap((ids) => chunk(ids))
        }
      } else {
        const plate = plateOf(piece)
        if (plate !== null && this.state.seats[plate]) {
          return chunk(resting.filter((p) => plateOf(p) === plate).map((p) => p.id))
        }
      }
      const heap = clusterPieces(this.placed(resting)).find((ids) => ids.includes(id))
      return heap ? chunk(heap) : []
    }
  }

  // --- input ---------------------------------------------------------------

  private readonly preventDefault = (event: Event) => event.preventDefault()

  private toWorldPoint(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect()
    return toWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top }, this.fit)
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    event.preventDefault()
    this.audio.unlock()
    this.canvas.setPointerCapture?.(event.pointerId)
    this.apply(this.tracker.down(event.pointerId, this.toWorldPoint(event), event.timeStamp))
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.fit.usable) return
    this.apply(this.tracker.move(event.pointerId, this.toWorldPoint(event), event.timeStamp))
  }

  private readonly onPointerUp = (event: PointerEvent) => {
    this.apply(this.tracker.up(event.pointerId, this.toWorldPoint(event), event.timeStamp))
  }

  private readonly onPointerCancel = (event: PointerEvent) => {
    this.apply(this.tracker.cancel(event.pointerId))
  }

  private hitTest(at: Point): Target {
    const mats = this.shelfMats()
    for (let i = 0; i < mats.length; i++) {
      const slot = shelfSlot(i)
      if (at.x >= slot.x - 10 && at.x <= slot.x + slot.w + 10 && at.y >= slot.y - 10 && at.y <= slot.y + slot.h + 10) {
        return { kind: 'shelf', mat: mats[i] }
      }
    }
    const view = this.state.liveMat === 'feeding' ? viewFeeding(this.restingPieces(), this.state.seats) : null
    if (view?.leftover && Math.hypot(at.x - this.knife.x, at.y - this.knife.y) < 75) return { kind: 'knife' }
    const drops = panDrops(this.beam.angle)
    const rendered = this.restingPieces().map((piece) => {
      const side = this.state.liveMat === 'scale' ? panOf(piece) : null
      return { id: piece.id, x: piece.x, y: piece.y + (side === null ? 0 : drops[side]), r: RADIUS_BY_QUARTERS[piece.q] }
    })
    const hit = pickPiece(rendered, at, PIECE_SLOP)
    if (hit) return { kind: 'piece', id: hit.id }
    if (insideCircle(at, BAG, 20)) return { kind: 'bag' }
    if (this.state.liveMat === 'feeding') {
      for (let seat = 0; seat < FEEDING.seats.length; seat++) {
        const guest = FEEDING.seats[seat].guest
        if (Math.hypot(at.x - guest.x, at.y - guest.y) < 62) return this.state.seats[seat] ? { kind: 'guest', seat } : { kind: 'chair', seat }
      }
      if (inBowl(at)) return { kind: 'bowl' }
    }
    return { kind: 'broom' }
  }

  private apply(intents: Intent[]): void {
    for (const intent of intents) this.handle(intent)
  }

  private handle(intent: Intent): void {
    const nowMs = performance.now()
    switch (intent.type) {
      case 'press':
        return this.press(intent.pointerId, intent.target)
      case 'tap':
        return this.tap(intent.pointerId, intent.target, intent.at)
      case 'dragStart':
        return this.dragStart(intent.pointerId, intent.target, intent.at)
      case 'dragMove':
        return this.dragMove(intent.pointerId, intent.at, intent.velocity, nowMs)
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
      const body = this.bodies.get(target.id)
      if (!piece || !body) return
      this.held.set(pointerId, target.id)
      body.kinematic = true
      body.vx = 0
      body.vy = 0
      this.audio.touch(piece.q === 4 ? 1 : 1.4)
      return
    }
    if (target.kind === 'broom') return
    this.audio.touch(target.kind === 'bag' ? 0.8 : 1.2)
  }

  private tap(pointerId: number, target: Target, at: Point): void {
    switch (target.kind) {
      case 'piece': {
        const piece = this.pieceById(target.id)
        const dealing = this.state.liveMat === 'feeding' && piece !== undefined && inBowl(piece)
        this.release(pointerId, dealing ? null : at, { x: 0, y: 0 })
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
        this.arrivals.set(target.seat, this.now())
        this.audio.hop()
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

  private dragStart(pointerId: number, target: Target, at: Point): void {
    switch (target.kind) {
      case 'bag': {
        const piece = pullFromBag(this.state, at)
        if (!piece) return
        const body = this.addBody(piece)
        body.kinematic = true
        this.held.set(pointerId, piece.id)
        this.cadence.change(performance.now(), true)
        return
      }
      case 'broom':
        this.brooms.set(pointerId, { x: at.x, y: at.y, vx: 0, vy: 0, r: BROOM_RADIUS })
        return
      case 'shelf':
        this.shelfDrag = { pointerId, mat: target.mat, x: at.x, y: at.y }
        return
      case 'knife':
        this.knife.pointerId = pointerId
        return
      case 'guest': {
        const view = viewFeeding(this.restingPieces(), this.state.seats)
        if (view.plates[target.seat] === 0) this.guestDrag = { pointerId, seat: target.seat, x: at.x, y: at.y }
        return
      }
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

  private dragMove(pointerId: number, at: Point, velocity: Point, nowMs: number): void {
    const heldId = this.held.get(pointerId)
    if (heldId !== undefined) {
      const body = this.bodies.get(heldId)
      const piece = this.pieceById(heldId)
      if (body && piece) {
        body.x = piece.x = at.x
        body.y = piece.y = at.y
        this.cadence.change(nowMs)
      }
      return
    }
    const broom = this.brooms.get(pointerId)
    if (broom) {
      Object.assign(broom, { x: at.x, y: at.y, vx: velocity.x, vy: velocity.y })
      return
    }
    if (this.shelfDrag?.pointerId === pointerId) Object.assign(this.shelfDrag, { x: at.x, y: at.y })
    else if (this.knife.pointerId === pointerId) Object.assign(this.knife, { x: at.x, y: at.y })
    else if (this.guestDrag?.pointerId === pointerId) Object.assign(this.guestDrag, { x: at.x, y: at.y })
  }

  private dragEnd(pointerId: number, at: Point, velocity: Point): void {
    if (this.held.has(pointerId)) return this.release(pointerId, at, velocity)
    if (this.brooms.delete(pointerId)) return
    if (this.shelfDrag?.pointerId === pointerId) {
      const mat = this.shelfDrag.mat
      this.shelfDrag = null
      if (at.x < SHELF.x - 20) this.bringOut(mat)
      return
    }
    if (this.knife.pointerId === pointerId) return this.dropKnife(at)
    if (this.guestDrag?.pointerId === pointerId) {
      const { seat } = this.guestDrag
      this.guestDrag = null
      const home = FEEDING.seats[seat].guest
      if (Math.hypot(at.x - home.x, at.y - home.y) > 130) {
        this.state.seats[seat] = false
        this.audio.hop()
        this.cadence.change(performance.now(), true)
      }
    }
  }

  private cancelAll(pointerIds: number[]): void {
    for (const pointerId of pointerIds) {
      if (this.held.has(pointerId)) this.release(pointerId, null, { x: 0, y: 0 })
      this.brooms.delete(pointerId)
    }
    this.shelfDrag = null
    this.guestDrag = null
    this.knife.pointerId = null
  }

  private release(pointerId: number, at: Point | null, velocity: Point): void {
    const id = this.held.get(pointerId)
    this.held.delete(pointerId)
    if (id === undefined) return
    const body = this.bodies.get(id)
    const piece = this.pieceById(id)
    if (!body || !piece) return
    body.kinematic = false
    if (at && insideCircle(at, BAG)) return this.sendHome(id)
    if (at && this.state.liveMat === 'scale') {
      const drops = panDrops(this.beam.angle)
      for (const side of [0, 1] as const) {
        const rest = { x: at.x, y: at.y - drops[side] }
        if (panOf(rest) === side) {
          body.y = piece.y = rest.y
          break
        }
      }
    }
    body.vx = velocity.x * 0.85
    body.vy = velocity.y * 0.85
    this.pendingVoice = { groups: this.voiceFor(id), deadline: this.now() + 2.5 }
    this.cadence.change(performance.now(), true)
  }

  private tipBag(): void {
    const spilled = tipBag(this.state)
    this.bagTipStart = this.now()
    if (spilled.length === 0) {
      this.audio.touch(0.7)
      return
    }
    this.audio.rustle()
    spilled.forEach((piece, index) => {
      const spread = (index / Math.max(1, spilled.length - 1) - 0.5) * 1.3
      const angle = -0.62 + spread + (Math.random() - 0.5) * 0.25
      const speed = 520 + Math.random() * 520
      piece.x += Math.cos(angle) * (10 + index * 3)
      piece.y += Math.sin(angle) * (10 + index * 3)
      this.addBody(piece, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed })
    })
    const ids = spilled.map((piece) => piece.id)
    this.pendingVoice = {
      groups: () => groupsFor(this.placed(this.restingPieces().filter((p) => ids.includes(p.id)))),
      deadline: this.now() + 3.5,
    }
    this.cadence.change(performance.now(), true)
  }

  private bringOut(mat: MatKey): void {
    if (mat === this.state.liveMat) return
    for (const pointerId of [...this.held.keys()]) this.release(pointerId, null, { x: 0, y: 0 })
    swapMat(this.state, mat)
    const present = new Set(this.state.pieces.map((piece) => piece.id))
    for (const id of [...this.bodies.keys()]) if (!present.has(id)) this.bodies.delete(id)
    for (const piece of this.state.pieces) if (!this.bodies.has(piece.id)) this.addBody(piece)
    this.beam = restingBeam()
    this.matSlideStart = this.now()
    this.dealCursor = null
    this.shareWasComplete = false
    this.munchAt = null
    this.munchStart = null
    this.pendingVoice = null
    this.audio.whoosh()
    this.cadence.change(performance.now(), true)
  }

  private seat(seat: number): void {
    this.state.seats[seat] = true
    this.arrivals.set(seat, this.now())
    this.audio.hop()
    this.cadence.change(performance.now(), true)
  }

  private hopFromBowl(chosen?: number): void {
    const view = viewFeeding(this.restingPieces(), this.state.seats)
    const id = chosen ?? view.bowlIds[0]
    const seat = nextSeat(this.state.seats, this.dealCursor)
    if (id === undefined || seat === null) {
      this.audio.touch(1.1)
      return
    }
    const piece = this.pieceById(id)!
    const onPlate = this.restingPieces().filter((p) => plateOf(p) === seat)
    const spot = freeSpotOnPlate(seat, onPlate, RADIUS_BY_QUARTERS[piece.q])
    this.bodies.delete(id)
    this.dealCursor = seat
    this.audio.hop()
    this.flights.push({
      id,
      q: piece.q,
      from: { x: piece.x, y: piece.y },
      to: spot,
      t0: this.now(),
      duration: 0.38,
      arc: 90,
      land: () => {
        piece.x = spot.x
        piece.y = spot.y
        this.addBody(piece)
        this.audio.touch(1)
        this.pendingVoice = { groups: this.voiceFor(id), deadline: this.now() + 1 }
        this.cadence.change(performance.now(), true)
      },
    })
  }

  private dropKnife(at: Point): void {
    this.knife.pointerId = null
    const candidates = this.restingPieces().map((piece) => ({ id: piece.id, x: piece.x, y: piece.y, r: RADIUS_BY_QUARTERS[piece.q] }))
    const hit = pickPiece(candidates, at, 30)
    this.knife.x = FEEDING.knifeRest.x
    this.knife.y = FEEDING.knifeRest.y
    if (!hit) return
    const halves = cutPiece(this.state, hit.id)
    if (halves.length === 0) return
    this.bodies.delete(hit.id)
    const now = this.now()
    halves.forEach((half, index) => {
      this.addBody(half, { x: (index === 0 ? -1 : 1) * 90, y: 0 })
      this.pulses.set(half.id, now)
    })
    this.audio.snick()
    this.cadence.change(performance.now(), true)
  }
}
