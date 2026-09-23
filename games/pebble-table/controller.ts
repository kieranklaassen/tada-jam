import type { TableAudio } from './audio'
import { freeSpotOnPlate, GUEST_RADIUS, gazeTarget, inBowl, nextSeat, plateOf, viewFeeding, wantingSeat, type FeedingView } from './feeding'
import { chooseHint, guestsShouldReach, handPose, HintScheduler, type HandPose, type Hint, type TableSummary } from './guidance'
import { GestureTracker, type Intent, type Target } from './input'
import { BAG, BAG_MOUTH, DOOR, FEEDING, MAT_KEYS, SCALE, SHELF, shelfTile, type MatKey, type Point, type Quarters } from './layout'
import { HOLD_HEIGHT, stoneHeight3, stoneRadius3, TablePhysics, to3, toWorld2, UNIT, type Vec3 } from './physics3d'
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
  'unlock' | 'setActive' | 'touch' | 'clack' | 'rustle' | 'clatter' | 'creak' | 'beat' | 'chord' | 'munch' | 'hop' | 'poke' | 'rumble' | 'knock' | 'squeak' | 'whoosh' | 'snick' | 'dispose'
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
  rumble() {},
  knock() {},
  squeak() {},
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

const STORY_START = 1.2
const STORY_REST = 1.6
const STORY_CARRY = 1.3
const STORY_FADE = 0.7
const RUMBLE_AFTER = 2.5
const RUMBLE_GAP = 8
const MAX_RUMBLES = 3

const KNOCK_PAUSE = 1.1
const VISITOR_WALK = 0.6
const PEEK_AFTER = 2
const PEEK_GAP = 7
const PEEK_LENGTH = 1.8
const MAX_PEEKS = 3

export type Visitor = { home: Point; outAt: number; leaveAt: number | null; pokeAt: number | null; group: number }

type DoorState = {
  knocks: number[]
  knockAt: number | null
  answer: { times: number[]; groups: number[][]; openAt: number } | null
  openAt: number | null
  closeAt: number | null
  visitors: Visitor[]
  peekStretch: { lastIdle: number; count: number; next: number; at: number | null }
}

/** Where visitors stand: each group a small cluster, groups side by side in the yard, so the number reads at a glance. */
export function yardSpots(groups: readonly (readonly number[])[]): (Point & { group: number })[] {
  const spots: (Point & { group: number })[] = []
  const width = 230
  groups.forEach((group, g) => {
    const cx = DOOR.yard.x + (g - (groups.length - 1) / 2) * width
    const cluster = group.length === 1 ? [[0, 0]] : group.length === 2 ? [[-48, 0], [48, 0]] : [[-52, 30], [52, 30], [0, -50]]
    for (let i = 0; i < group.length; i++) spots.push({ x: cx + cluster[i % cluster.length][0], y: DOOR.yard.y + cluster[i % cluster.length][1], group: g })
  })
  return spots
}

type Story = { phase: 'waiting' | 'rolling' | 'resting' | 'carrying' | 'done'; at: number; stoneId: number | null; from: Point | null; spot: Point | null; seat?: number }

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
  /** The one guest who visibly wants a stone (see `wantingSeat`), or null. */
  wanting: number | null = null
  /** When each guest's tummy last rumbled. */
  readonly rumbles = new Map<number, number>()
  private rumbleStretch = { lastIdle: 0, count: 0, next: RUMBLE_AFTER }
  /** Empty stools stay hidden until the first shared meal, so a first-time child sees only who is hungry. */
  stoolsShown: boolean
  /** The first-open story beat: a stone rolls out toward the hungry guest and the ghost hand carries it to the plate. */
  private story: Story | null = null
  /** Knock-Knock: the child's knocks waiting for an answer, the house's answer, and the visitors in the yard. */
  readonly door: DoorState = { knocks: [], knockAt: null, answer: null, openAt: null, closeAt: null, visitors: [], peekStretch: { lastIdle: 0, count: 0, next: PEEK_AFTER, at: null } }

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
    this.stoolsShown = this.state.seats.filter(Boolean).length > 2
    if (this.untouchedTable() && this.state.liveMat === 'feeding' && this.state.seats.some(Boolean)) {
      this.story = { phase: 'waiting', at: 0, stoneId: null, from: null, spot: null }
      // The story feeds the hungry guest nearest the bag, so the stone's roll stays short and in view.
      const nearest = FEEDING.seats
        .map((seat, index) => ({ index, distance: Math.hypot(seat.plate.x - BAG.x, seat.plate.y - BAG.y) }))
        .filter(({ index }) => this.state.seats[index])
        .sort((a, b) => a.distance - b.distance)[0]
      if (nearest) this.dealCursor = (nearest.index - 1 + FEEDING.seats.length) % FEEDING.seats.length
    }
    this.inviteOnScale()
    this.updateWanting()
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
    this.updateStory(now)
    if (this.state.liveMat === 'door') this.updateDoor(now)
    this.updateWanting()
    this.updateRumble(now)

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
      if (!this.stoolsShown) {
        this.stoolsShown = true
        this.syncGuests()
        this.changed()
      }
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

  /**
   * Where a guest looks. The wanting guest faces the child most of the time and
   * glances at where stones are (a loose stone, the bowl, or the bag); a guest
   * with less looks at a fuller plate; everyone else looks at the child.
   */
  gaze(seat: number): Point | null {
    if (seat === this.wanting) {
      const glancing = (this.t + seat * 0.9) % 4.2 > 2.9
      return glancing ? this.stoneSource(seat) : null
    }
    const target = gazeTarget(this.feeding, seat)
    return target === null ? null : FEEDING.seats[target].plate
  }

  /** How strongly a guest asks for a stone right now (0..1): the wanting guest asks, gently at first and fully once the child is idle. */
  asking(seat: number): number {
    if (seat !== this.wanting || this.story) return 0
    return 0.55 + 0.45 * this.guidance.glow
  }

  private stoneSource(seat: number): Point | null {
    const plate = FEEDING.seats[seat].plate
    const summary = this.summary()
    let best: Point | null = null
    let distance = Infinity
    for (const stone of summary.loose) {
      const d = Math.hypot(stone.x - plate.x, stone.y - plate.y)
      if (d < distance) {
        best = stone
        distance = d
      }
    }
    if (best) return best
    if (summary.bowl.length > 0) return FEEDING.bowl
    return this.state.bag > 0 ? BAG : null
  }

  private updateWanting(): void {
    const available = this.state.bag > 0 || this.state.pieces.length > 0
    this.wanting = this.state.liveMat === 'feeding' ? wantingSeat(this.feeding, available, this.dealCursor) : null
  }

  /** A hungry tummy rumbles while the child is idle: first after a few seconds, then with growing gaps, at most three times per idle stretch. */
  private updateRumble(now: number): void {
    const idle = this.scheduler.idleFor(now)
    const stretch = this.rumbleStretch
    if (idle < stretch.lastIdle) {
      stretch.count = 0
      stretch.next = RUMBLE_AFTER
    }
    stretch.lastIdle = idle
    if (this.wanting === null || this.story || this.guidance.hand || stretch.count >= MAX_RUMBLES || idle < stretch.next) return
    this.rumbles.set(this.wanting, now)
    this.sound.rumble(SEAT_SPECIES[this.wanting % SEAT_SPECIES.length])
    stretch.count += 1
    stretch.next = idle + RUMBLE_GAP * 2 ** (stretch.count - 1)
  }

  // --- the first-open story beat ---------------------------------------------

  private updateStory(now: number): void {
    const story = this.story
    if (!story) return
    const age = now - story.at
    switch (story.phase) {
      case 'waiting': {
        if (now < STORY_START) return
        const seat = wantingSeat(this.feeding, true, this.dealCursor)
        const piece = seat === null ? null : pullFromBag(this.state, BAG_MOUTH)
        if (seat === null || !piece) {
          this.story = null
          return
        }
        const plate = FEEDING.seats[seat].plate
        const away = Math.hypot(BAG_MOUTH.x - plate.x, BAG_MOUTH.y - plate.y) || 1
        const rest = { x: plate.x + ((BAG_MOUTH.x - plate.x) / away) * 120, y: plate.y + ((BAG_MOUTH.y - plate.y) / away) * 120 }
        this.bagTipStart = now
        this.sound.rustle()
        Object.assign(story, { phase: 'rolling', at: now, stoneId: piece.id, from: rest, seat })
        this.flights.push({
          id: piece.id,
          q: piece.q,
          from: to3(BAG_MOUTH, 4),
          to: to3(rest, stoneHeight3(piece.q) / 2 + 0.2),
          t0: now,
          duration: 0.95,
          arc: 5,
          carriesPiece: true,
          land: () => {
            if (!this.pieceById(piece.id)) return
            piece.x = rest.x
            piece.y = rest.y
            this.addPieceBody(piece, { y: stoneHeight3(piece.q) / 2 + 0.2 })
            this.sound.clack(0.4)
            if (this.story?.phase === 'rolling') Object.assign(this.story, { phase: 'resting', at: this.t })
          },
        })
        this.changed()
        this.cadence.change(performance.now(), true)
        return
      }
      case 'rolling':
        return
      case 'resting': {
        if (age < STORY_REST) return
        const piece = story.stoneId === null ? undefined : this.pieceById(story.stoneId)
        const seat = story.seat ?? null
        if (!piece || seat === null) {
          this.story = null
          return
        }
        const onPlate = this.restingPieces().filter((p) => plateOf(p) === seat && p.id !== piece.id)
        const spot = freeSpotOnPlate(seat, onPlate, stoneRadius3(piece.q) / UNIT)
        const body = this.physics.body(piece.id)
        const from = body ? { x: body.position.x, y: body.position.y, z: body.position.z } : to3(piece, 1)
        this.physics.removeStone(piece.id)
        Object.assign(story, { phase: 'carrying', at: now, spot })
        this.flights.push({
          id: piece.id,
          q: piece.q,
          from,
          to: to3(spot, stoneHeight3(piece.q) / 2 + 0.6),
          t0: now,
          duration: STORY_CARRY,
          arc: 4,
          carriesPiece: true,
          land: () => {
            if (!this.pieceById(piece.id)) return
            piece.x = spot.x
            piece.y = spot.y
            this.addPieceBody(piece, { y: stoneHeight3(piece.q) / 2 + 0.6 })
            this.dealCursor = seat
            this.sound.touch(1)
            this.pendingVoice = { groups: this.voiceFor(piece.id), deadline: this.t + 1 }
            this.cadence.change(performance.now(), true)
            if (this.story?.phase === 'carrying') Object.assign(this.story, { phase: 'done', at: this.t })
          },
        })
        return
      }
      case 'carrying':
        return
      case 'done':
        if (age > STORY_FADE) {
          this.story = null
          this.scheduler.restart(now)
        }
        return
      default: {
        const unreachable: never = story.phase
        return unreachable
      }
    }
  }

  /** The ghost hand during the story: it arrives over the resting stone, presses, carries it to the plate, and lifts away. */
  private storyHand(): HandPose | null {
    const story = this.story
    if (!story || story.from === null) return null
    const age = this.t - story.at
    switch (story.phase) {
      case 'waiting':
      case 'rolling':
        return null
      case 'resting': {
        const k = Math.min(1, age / STORY_REST)
        return { at: story.from, press: Math.max(0, (k - 0.55) / 0.45), opacity: Math.min(1, k * 2.5) }
      }
      case 'carrying': {
        const view = this.flightViews().find((flight) => flight.id === story.stoneId)
        const at = view ? toWorld2(view.position) : story.from
        return { at, press: 1, opacity: 1 }
      }
      case 'done': {
        const k = Math.min(1, age / STORY_FADE)
        return { at: story.spot ?? story.from, press: Math.max(0, 1 - k * 2), opacity: 1 - k }
      }
      default: {
        const unreachable: never = story.phase
        return unreachable
      }
    }
  }

  /** Any touch ends the story at once: whatever was moving lands where it was going. */
  private endStory(): void {
    if (!this.story) return
    this.story = null
    const moving = this.flights.filter((flight) => flight.carriesPiece)
    this.flights = this.flights.filter((flight) => !flight.carriesPiece)
    for (const flight of moving) flight.land()
  }

  // --- Knock-Knock --------------------------------------------------------------

  /** A knock on the little house. Knocks gather until the child pauses; knocking again sends the last visitors home first. */
  private knock(): void {
    if (this.door.answer) return
    const home = this.door.visitors.filter((visitor) => visitor.leaveAt === null)
    if (home.length > 0) {
      for (const visitor of home) visitor.leaveAt = this.t + Math.random() * 0.15
      this.door.closeAt = this.t + VISITOR_WALK + 0.2
    }
    this.door.knocks.push(this.t)
    this.door.knockAt = this.t
    this.sound.knock(false)
  }

  private updateDoor(now: number): void {
    const door = this.door
    door.visitors = door.visitors.filter((visitor) => visitor.leaveAt === null || now - visitor.leaveAt < VISITOR_WALK)
    if (door.closeAt !== null && now >= door.closeAt && door.visitors.length === 0) {
      door.openAt = null
      door.closeAt = null
    }
    const last = door.knocks[door.knocks.length - 1]
    if (last !== undefined && !door.answer && now - last > KNOCK_PAUSE && door.visitors.length === 0) {
      const count = Math.min(door.knocks.length, DOOR.maxVisitors)
      door.knocks = []
      const groups = chunk(Array.from({ length: count }, (_, i) => i), 3)
      const times: number[] = []
      let cursor = now + 0.4
      for (const group of groups) {
        for (let i = 0; i < group.length; i++) {
          times.push(cursor)
          this.sound.knock(true, cursor - now)
          cursor += 0.27
        }
        cursor += 0.24
      }
      const openAt = cursor + 0.2
      door.answer = { times, groups, openAt }
    }
    const answer = door.answer
    if (answer && now >= answer.openAt) {
      door.answer = null
      door.openAt = now
      door.closeAt = null
      this.sound.whoosh()
      const spots = yardSpots(answer.groups)
      spots.forEach((home, i) => door.visitors.push({ home, outAt: now + 0.25 + i * 0.2, leaveAt: null, pokeAt: null, group: home.group }))
    }
    this.updateDoorPeek(now)
  }

  /** While nobody is out, a face peeks from the window and taps the glass: someone is home. It backs off and stops after three peeks per idle stretch. */
  private updateDoorPeek(now: number): void {
    const stretch = this.door.peekStretch
    const idle = this.scheduler.idleFor(now)
    if (idle < stretch.lastIdle) {
      stretch.count = 0
      stretch.next = PEEK_AFTER
    }
    stretch.lastIdle = idle
    if (stretch.at !== null && now - stretch.at > PEEK_LENGTH) stretch.at = null
    const quiet = this.door.visitors.length === 0 && !this.door.answer && this.door.knocks.length === 0
    if (!quiet || stretch.count >= MAX_PEEKS || idle < stretch.next || this.guidance.hand) return
    stretch.at = now
    stretch.count += 1
    stretch.next = idle + PEEK_GAP * 2 ** (stretch.count - 1)
    this.sound.knock(true, 0.5)
    this.sound.knock(true, 0.72)
  }

  /** 0..1 progress of the window peek, or null. */
  doorPeek(): number | null {
    const at = this.door.peekStretch.at
    return at === null ? null : Math.min(1, (this.t - at) / PEEK_LENGTH)
  }

  private resetDoor(): void {
    this.door.knocks = []
    this.door.answer = null
    this.door.visitors = []
    this.door.openAt = null
    this.door.closeAt = null
    this.door.peekStretch.at = null
  }

  /** On an empty scale, the world asks the question: one stone drops onto a pan and the beam waits, tilted, for a partner. */
  private inviteOnScale(): void {
    if (this.state.liveMat !== 'scale' || this.state.bag <= 0) return
    if (this.state.pieces.some((piece) => panOf(piece) !== null)) return
    const pan = SCALE.pans[0]
    const piece = pullFromBag(this.state, pan)
    if (!piece) return
    this.flights.push({
      id: piece.id,
      q: piece.q,
      from: to3(BAG_MOUTH, 4),
      to: to3(pan, 12),
      t0: this.t + 0.5,
      duration: 0.8,
      arc: 16,
      carriesPiece: true,
      land: () => {
        if (!this.pieceById(piece.id) || this.state.liveMat !== 'scale') return
        piece.x = pan.x
        piece.y = pan.y
        this.addPieceBody(piece, { y: this.restHeight(piece) + 3 })
        this.sound.clack(0.5)
        this.cadence.change(performance.now(), true)
      },
    })
    this.changed()
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
      visitors: this.door.visitors.filter((visitor) => visitor.leaveAt === null).length,
    }
  }

  private untouchedTable(): boolean {
    return this.state.pieces.length === 0 && this.state.bag === this.state.total && MAT_KEYS.every((key) => this.state.parked[key].length === 0)
  }

  private computeGuidance(): GuidanceView {
    if (this.story) {
      return { hint: null, hand: this.storyHand(), glow: 0, glowStones: new Set(), glowBag: false, glowKnife: false, glowShelf: false, peek: null, guestsReach: false }
    }
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
      glowBag: this.state.liveMat !== 'door' && this.state.bag > 0 && (summary.loose.length === 0 || hint?.from.x === BAG.x),
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
      else if (!this.state.seats[index] && this.stoolsShown) this.physics.setFixture(key, { ...seat.guest, r: 42 }, 3)
      else if (!this.state.seats[index]) this.physics.removeFixture(key)
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
    this.endStory()
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
      if (within(to3(tile, tile.height + 3), 10) < Infinity) return { kind: 'shelf', mat: mats[i] }
    }
    if (this.state.liveMat === 'feeding' && this.feeding.leftover && within(to3(this.knife.at, 1), 6) < Infinity) return { kind: 'knife' }
    if (this.state.liveMat === 'door') {
      for (let index = 0; index < this.door.visitors.length; index++) {
        const visitor = this.door.visitors[index]
        if (visitor.leaveAt === null && this.t > visitor.outAt + VISITOR_WALK && within(to3(visitor.home, 4), 5) < Infinity) return { kind: 'visitor', index }
      }
      if (within(to3(DOOR.door, 6), DOOR.doorRadius * UNIT) < Infinity) return { kind: 'door' }
    }

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
        if (!this.state.seats[seat] && !this.stoolsShown) continue
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
      case 'door':
        return this.knock()
      case 'visitor': {
        const visitor = this.door.visitors[target.index]
        if (visitor) visitor.pokeAt = this.t
        this.sound.squeak()
        return
      }
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
      case 'door':
      case 'visitor':
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
      const slot = shelfTile(Math.max(0, this.shelfMats().indexOf(mat)))
      if (Math.hypot(at.x - slot.x, at.y - slot.y) > 120) this.bringOut(mat)
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
    this.resetDoor()
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
    this.inviteOnScale()
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
