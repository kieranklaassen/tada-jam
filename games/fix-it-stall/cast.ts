import { STAND, WINDOW_SIZE } from './standing'
import { type Bench, type Mark } from './bench'
import { Customer } from './folk'
import { meetsTicket } from './jobs'
import { Director, Raccoon } from './motion'
import { PLATE } from './paintStall'
import { AT_BENCH, AT_WINDOW, boardBox, CARD, FOLK_SCALE, lidBox, matAt, MUG, OLD_HAND, PRACTICE, STAGE, type P } from './stage'
import { type Who } from './tastes'

// Who is on screen and where: the customer at the bench, the one who waits at
// the window, one who is walking off, and the old hand. Numbers only. Each
// customer keeps its own rig from the moment it steps up to the window until
// it has walked off, so it never changes how it moves on the way.

export type Standing = { customer: Customer; at: P; size: number }

// How big a customer is drawn at the window and how much lower than the rest each stands: standing.ts.
export { STAND, WINDOW_SIZE } from './standing'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** A place on the stage, about the middle of the old hand's face. */
const fromHer = (at: P): P => ({ x: at.x - OLD_HAND.x, y: at.y - OLD_HAND.y })
/** The places on the bench the old hand's paw can reach: the two nearest her in the column at her side. */
export const REACH: readonly number[] = [12, 24]
/** How long everyone goes on looking at where a finger was, after it has lifted. */
const LINGER = 0.9

export class Cast {
  readonly raccoon: Raccoon
  owner: Customer
  waiting: Customer
  leaving: Customer | null = null
  private readonly director: Director
  /** Where the finger is or last was, and for how long it is still looked at. */
  private finger: P | null = null
  private linger = 0
  /** Where something just happened on the mat, and for how long it still draws the eye. */
  private glance: P | null = null
  private glanceLeft = 0
  /** The place of the loose part the old hand has picked up to look at, while she has it: the view draws it in her paw. */
  inspecting: number | null = null
  /** Whether the gadget in its owner's hands holds what its order ticket asks for: worked out once for a circuit. */
  private readonly met = new WeakMap<object, boolean>()
  private seconds = 0
  /** The board on the mat is the owner's own gadget, open: kept from the last step, for the marks that come between two. */
  private own = false

  constructor(seed: number, bench: Bench) {
    this.director = new Director(seed + 7)
    this.raccoon = new Raccoon(new Director(seed))
    this.owner = new Customer(bench.stall.job.who, this.director)
    this.waiting = new Customer(bench.stall.next.who, this.director)
    // As it was left: a customer whose gadget was handed back stands as that reaction left it.
    if (bench.stall.finished && bench.show.act) this.owner.settle(bench.show.act)
  }

  /** What the bench just did, for whoever reacts to it. */
  mark(marks: readonly Mark[]): void {
    for (const mark of marks) {
      if (mark.type === 'pop' || mark.type === 'blow' || mark.type === 'bite') { this.glance = mark.at; this.glanceLeft = mark.type === 'bite' ? 0.8 : 2.2 }
      if (mark.type === 'pop') { this.raccoon.pop(); this.owner.startle(); this.waiting.startle() }
      // The owner has opinions of what is done to its own gadget. The sign is nobody's, and nobody minds what is done to it.
      else if (mark.type === 'bite' && this.own) this.owner.react('flinch')
      else if (mark.type === 'blow' && this.own) this.owner.react('wince')
      else if (mark.type === 'out' && this.own) this.owner.react('droop')
      else if (mark.type === 'poke' && mark.who === 'oldHand') this.raccoon.poke()
      else if (mark.type === 'poke' && mark.who === 'mug') { this.raccoon.slosh.v += 5; this.raccoon.guard(fromHer(MUG)) }
      else if (mark.type === 'hers') this.raccoon.guard(fromHer(mark.what === 'plate' ? PLATE : mark.at))
      else if (mark.type === 'lit') { this.raccoon.hark(); if (this.own) this.owner.react('delight') }
      else if (mark.type === 'poke' && mark.who === 'owner') this.owner.startle()
    }
  }

  /** Keep the cast in step with the stall: when the customers change over, each moves up one place with its own rig. */
  private sync(bench: Bench): void {
    const job: Who = bench.stall.job.who, next: Who = bench.stall.next.who
    if (this.owner.who === job && this.waiting.who === next && (bench.leaving === null) === (this.leaving === null)) return
    if (bench.leaving && !this.leaving) {
      this.leaving = this.owner
      // Sent away with a gadget that has not run, it droops in its own way as it goes.
      if (bench.sentAway) this.leaving.react('droop')
      this.owner = this.waiting.who === job ? this.waiting : new Customer(job, this.director)
      this.waiting = new Customer(next, this.director)
      return
    }
    if (!bench.leaving) this.leaving = null
    if (this.owner.who !== job) this.owner = new Customer(job, this.director)
    if (this.waiting.who !== next) this.waiting = new Customer(next, this.director)
  }

  step(dt: number, bench: Bench): void {
    this.sync(bench)
    if (bench.finger) { this.finger = bench.finger; this.linger = LINGER }
    else if ((this.linger -= dt) <= 0) this.finger = null
    // What the old hand can see: the finger, the board on the mat or else her mug, her own things, and her practice board.
    const board = boardBox(bench.live), watching = bench.open
    // What of the child's is within her reach: a part laid loose near her with nothing clipped to it, and the open lid.
    const lying = bench.lying, circuit = bench.live
    const bitten = (index: number) => circuit.leads.some((lead) => [lead.a, lead.b].some((bite) => bite !== null && typeof bite === 'object' && 'loose' in bite && bite.loose === index)) || circuit.probe.some((bite) => bite !== null && typeof bite === 'object' && 'loose' in bite && bite.loose === index)
    const near = lying && bench.hand === null ? circuit.loose.findIndex((part, index) => REACH.includes(part.at) && !bitten(index)) : -1
    const cell = near >= 0 ? circuit.loose[near].at : null
    // The child's finger near it, and she lets go at once.
    const wanted = cell !== null && this.finger !== null && Math.hypot(this.finger.x - matAt(cell).x, this.finger.y - matAt(cell).y) < 90
    if (wanted || (this.inspecting !== null && this.inspecting !== cell)) this.raccoon.leave()
    const lid = lying && circuit.gadget !== 'sign' && !this.finger ? lidBox(circuit) : null
    this.raccoon.step(dt, {
      loose: cell !== null && !wanted ? fromHer(matAt(cell)) : null,
      lid: lid ? fromHer({ x: lid.x + 40, y: lid.y + 30 }) : null,
      finger: this.finger ? fromHer(this.finger) : null,
      rest: fromHer(watching ? { x: board.x + board.w * 0.3, y: board.y + board.h * 0.4 } : { x: MUG.x + 60, y: MUG.y }),
      mug: fromHer(MUG),
      plate: fromHer(PLATE),
      practice: fromHer({ x: PRACTICE.x + PRACTICE.w / 2, y: PRACTICE.y + PRACTICE.h * 0.3 }),
      neat: bench.show.neat,
      wind: bench.wind(),
    })
    this.inspecting = this.raccoon.holds === 'part' ? cell : null
    // Her knuckles on the lid are heard, and seen where they land.
    for (; this.raccoon.knocks > 0; this.raccoon.knocks--) {
      bench.sounds.push({ voice: 'lid-knock', pitch: this.raccoon.knocks > 1 ? 1 : 0.9 })
      if (lid) bench.marks.push({ type: 'pat', at: { x: lid.x + 40, y: lid.y + 34 } })
    }
    const act = bench.show.act ? { name: bench.show.act, progress: bench.show.react } : null
    if ((this.glanceLeft -= dt) <= 0) this.glance = null
    // The owner watches what is done to its gadget: the hand while it works, else where something last happened, else the
    // board. Its spirits follow the gadget: up while it runs, down while a flag stands. And a part of it out in the hand is
    // an alarm.
    const places = this.places(bench.show.walk), mine = bench.stall.job.open && !bench.stall.finished, onMat = mine && bench.stall.onMat === 'job'
    const from = (who: Standing, at: P) => ({ x: at.x - who.at.x, y: at.y - (who.at.y + 30 * who.size * FOLK_SCALE) })
    this.own = onMat
    const seen = this.finger ?? this.glance ?? (onMat ? { x: board.x + board.w * 0.55, y: board.y + board.h * 0.35 } : null)
    const flag = onMat && bench.live.parts.some((part) => part.kind === 'cell' && part.popped)
    const hand = bench.hand
    // With the gadget back in its hands and an order ticket on it, the owner looks at the card: once, as it puts away an
    // order that has been met; again every few seconds at one that has not.
    this.seconds += dt
    const ticket = bench.stall.finished ? bench.stall.job.ticket : null
    let order = 0
    if (ticket) {
      const circuit = bench.stall.job.circuit
      if (!this.met.has(circuit)) this.met.set(circuit, meetsTicket(circuit, ticket))
      if (this.met.get(circuit)) order = bench.show.react > 0.5 && bench.show.react < 0.85 ? 1 : 0
      else order = bench.show.react >= 1 && this.seconds % 4 < 1.2 ? -1 : 0
    }
    const card = { x: CARD.x + CARD.w / 2, y: CARD.y + CARD.h / 2 }
    // A fan running on the mat ruffles whoever leans over it.
    this.owner.step(dt, act, mine, bench.wind(), {
      order,
      look: order !== 0 ? from(places.owner, card) : seen ? from(places.owner, seen) : { x: 0, y: 150 },
      mood: !onMat ? 0 : flag ? -0.8 : bench.running ? 0.8 : -0.15,
      alarm: onMat && hand?.holds === 'part' && typeof hand.from === 'object' && 'board' in hand.from,
    })
    // The one who waits minds its own business, and looks round at a bang.
    this.waiting.step(dt, null, false, 0, { look: this.glance && this.glanceLeft > 0.9 ? from(places.waiting, this.glance) : null })
    this.leaving?.step(dt, null, false)
  }

  /** Where each stands now. While the customers change over, one walks off down the lane, one comes to the bench, and one steps up to the window. */
  places(walk: number): { owner: Standing; waiting: Standing; leaving: Standing | null } {
    const t = Math.max(0, Math.min(1, walk))
    return {
      owner: { customer: this.owner, at: { x: lerp(AT_WINDOW.x, AT_BENCH.x, t), y: lerp(AT_WINDOW.y + STAND[this.owner.who] * WINDOW_SIZE, AT_BENCH.y + STAND[this.owner.who], t) }, size: lerp(WINDOW_SIZE, 1, t) },
      waiting: { customer: this.waiting, at: { x: lerp(STAGE.w + 160, AT_WINDOW.x, t), y: AT_WINDOW.y + STAND[this.waiting.who] * WINDOW_SIZE }, size: WINDOW_SIZE },
      leaving: this.leaving ? { customer: this.leaving, at: { x: lerp(AT_BENCH.x, -200, t), y: AT_BENCH.y + STAND[this.leaving.who] + 6 * Math.sin(t * 18) }, size: 1 } : null,
    }
  }
}
