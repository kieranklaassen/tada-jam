import { boardOf, isSocket } from './board'
import { clipLeadEnd, clipProbe, flickPart, hasRoom, turnLead, isPad, layDown, layLead, MAX_LOOSE, movePart, moveLoose, partAcross, placePart, removeLead, removePart, seat, startLead, trayPart, turnPart, unclipLead, type Bite, type Body, type Circuit, type Loose, type Part } from './circuit'
import { boardOnMat, callNext, change, handOver, openGadget, swapBoards } from './cycle'
import { handBack, switchedOn } from './handback'
import { ODD_FLICK } from './grid'
import { type Job } from './jobs'
import { Lane, VALANCE, type LaneHit } from './lane'
import { LEAD_SPRING, stepSpring, type Spring } from './motion'
import { Mouse } from './mouse'
import { type Stall } from './save'
import { followedBy, Scene } from './scene'
import { covers } from './standing'
import { settle, type Consequence } from './settle'
import { atRest, changeOverScene, handBackScene, laidBackScene, LENGTH, neatWayScene, settled, type Show } from './show'
import { braking, level, read, RUNS_FROM, type Reading, type Spin } from './solve'
import { answerTo, noseToNose, pulses, summary, type Did, type Sound } from './benchSound'
import { biteAt, biteNear, COIL, HELD, hitTest, inBox, layOf, leadEnds, looseEnd, MAT_BOX, matAt, nearestCell, nearestFreeCell, OWNER, OWNER_HANDS, padAt, PILLAR_LEFT, PROBE_HOME, reseat, restBend, STAGE, TRAY, TRAY_KINDS, WAITING_HEAD, WINDOW_LEFT, type Box, type P } from './stage'
import { reaction } from './tastes'

// The bench: what every touch does, with no drawing and no sound in it. A
// touch changes the stall, the world answers, and a list of sounds and marks
// is left for the Mount to play and the view to show. Every answer starts in
// the press: a clip bites, a lever throws, a part rings where the finger
// lands. The cycle's own moves are here too: opening the gadget its owner
// holds out, handing it back, and calling the customer who waits.
//
// Nothing in the hand is in the save. A lead in the hand is in the circuit
// with its second clip loose; a part being carried still sits where it came
// from in the stored circuit, and is only left out of the circuit that is
// solved and drawn (`live`).

export type { Sound } from './benchSound'

/** Something that just happened, for the view to show and the folk to react to. */
export type Mark =
  | { type: 'bite'; at: P }
  | { type: 'pat'; at: P }
  /** A finger on what is not the mat and is nothing in particular: the wood of the bench, the counter, a wall, the awning, the air of the lane. */
  | { type: 'knock'; on: 'wood' | 'steel' | 'wall' | 'awning' | 'air'; at: P }
  /** The toaster or the radio on the shelf was touched. */
  | { type: 'shelf'; what: 'toaster' | 'radio' }
  | { type: 'pop'; at: P }
  | { type: 'blow'; at: P }
  | { type: 'poke'; who: 'oldHand' | 'mug' | 'owner' | 'waiting' }
  /** Something of the old hand's was touched: her biscuits, or the clutter in her corner. */
  | { type: 'hers'; what: 'plate' | 'clutter' | 'practice'; at: P }
  | { type: 'lit' }
  | { type: 'out' }
  /** A part was set down: across two pads, or loose on the mat. */
  | { type: 'down'; at: P }
  /** A board came down onto the mat. */
  | { type: 'land' }
  /** A lead wound itself back into the coil. */
  | { type: 'wind'; at: P }

type Carried = { body: Body; from: { board: number; a: number; b: number } | { loose: number } | 'tray'; angle: number }

export type Hand =
  | { holds: 'lead'; lead: number; at: P; startedOn: Bite | null }
  /** A whole lead: fresh from the coil, or one taken up off the mat, which stays where it lay in the saved circuit (`lifted`) until it is put down. */
  | { holds: 'coil'; at: P; lifted?: number }
  | ({ holds: 'part'; at: P } & Carried)
  | { holds: 'probe'; end: 0 | 1; at: P }
  | { holds: 'gadget'; at: P }

/** For how long after a cycle's own move (the gadget opened, the next customer called) a second touch in the same place is only answered, in seconds. */
const SETTLES = 0.9
/** How long a part takes to turn round, in seconds. */
const TURN_TAKES = 0.42

const bodyOf = (part: Part): Body => {
  const { a: _a, b: _b, ...body } = part
  return body as Body
}
const sockets = new Map<string, [number, number][]>()
/** Every pair of pads one unit apart on this board: the places a part can sit. */
function socketsOf(circuit: Circuit): [number, number][] {
  let list = sockets.get(circuit.gadget)
  if (!list) {
    const board = boardOf(circuit.gadget)
    list = []
    for (let a = 0; a < board.pads.length; a++) for (let b = a + 1; b < board.pads.length; b++) if (isSocket(board, a, b)) list.push([a, b])
    sockets.set(circuit.gadget, list)
  }
  return list
}

export class Bench {
  /** The circuit that is solved and drawn: the stored one, less a part that is in the hand. */
  live: Circuit
  reading: Reading
  hand: Hand | null = null
  /** Where the finger is, while it is down: for whoever watches it. Not saved. */
  finger: P | null = null
  /** The grown-up's corner of the surface, in stage units: the Mount sets it when the surface is sized. Until then, as large as it can be. */
  grownUps: Box = { x: STAGE.w - 128, y: 0, w: 128, h: 128 }
  /** The clockwork mouse on the bare mat. Not saved. */
  readonly mouse = new Mouse()
  /** The lane beyond the open front: whoever passes, the pigeon, the washing. */
  readonly lane = new Lane()
  /** A lead whose first clip was tapped on, waiting for the tap that says where its second goes. */
  armed: number | null = null
  /** How far each lead is from its rest bow, as a spring. */
  sway: Spring[] = []
  /** Where each loose clip is on its way to where it lies, or null when it lies there. */
  tips: ({ x: Spring; y: Spring } | null)[] = []
  /** A hop of a part that was flicked, keyed by where it sits. */
  kick = new Map<string, Spring>()
  /** Leads that carried a short, and how long they still glow. */
  hot = new Map<number, number>()
  /** The traces and the parts on the way a short took, by trace and by where the part sits, and how long they still glow. */
  hotTraces = new Map<number, number>()
  hotParts = new Map<string, number>()
  /** Parts that have just been turned round, by where they sit, and for how many seconds: each turns in its own way. */
  turning = new Map<string, number>()
  /** Two cells push against each other and nothing runs: they lean on each other for as long as that is so. */
  opposed = false
  /** A lead the finger is on by its wire: let go where it was pressed it has been flicked; drawn aside first, it is turned round. */
  private wire: { lead: number; from: P; drawn: boolean } | null = null
  sounds: Sound[] = []
  marks: Mark[] = []
  /** Set when the stall changed: `soon` for a small change, `now` for a scene's outcome or the end of a cycle. */
  dirty: 'soon' | 'now' | null = null
  /** The numbers the scenes move, which the view draws from. */
  show: Show
  /** The customer who is walking off while the next comes to the bench. Not saved: on load nobody is walking. */
  leaving: Job | null = null
  /** That customer was sent away with a gadget that had not run. */
  sentAway = false
  scene: Scene | null = null
  seconds = 0
  /** Blades set turning by a flick, by where their motor sits: how hard each still pushes, and how far it has turned. */
  private spun = new Map<string, { push: number; turned: number }>()
  /** Hops still to come: a flat cell bounces a second time. */
  private later: { at: number; key: string; v: number }[] = []
  private pulseIn = 0
  private spent = false
  /** A part the finger is on that has not moved yet: a tap flicks it, a drag carries it. */
  private pending: { board: number } | { loose: number } | null = null

  constructor(public stall: Stall) {
    // As it was left, on the bench as it is laid out now.
    const job = reseat(stall.job.circuit), sign = reseat(stall.sign)
    if (job !== stall.job.circuit || sign !== stall.sign) {
      this.stall = { ...stall, job: { ...stall.job, circuit: job }, sign }
      this.dirty = 'soon'
    }
    this.live = this.circuit
    this.reading = read(this.live)
    this.opposed = this.live.parts.filter((part) => part.kind === 'cell').length >= 2 && !this.running && noseToNose(this.live, this.reading)
    this.pair()
    this.show = stall.finished ? settled(reaction(stall.job.who, handBack(stall.job.circuit)).act, stall.board !== null) : atRest()
    this.resetLeads()
  }

  /** The board on the mat: the gadget's, or the sign's. */
  get circuit(): Circuit {
    return boardOnMat(this.stall)
  }
  /** A board lies on the mat now: the sign, or the gadget open there and not in the hand or on its way to its owner. */
  get lying(): boolean {
    return this.open && (this.stall.onMat === 'sign' || this.show.take < 0.02) && this.hand?.holds !== 'gadget'
  }
  /** The customer's gadget has a switch in it, on its board or hanging by its leads: so its case has one for its owner to throw. */
  get switched(): boolean {
    const circuit = this.stall.job.circuit
    return circuit.parts.some((part) => part.kind === 'switch') || circuit.loose.some((part) => part.kind === 'switch')
  }
  /** A board lies open on the mat and can be worked on. */
  get open(): boolean {
    return this.stall.onMat === 'sign' || (this.stall.job.open && !this.stall.finished)
  }

  private resetLeads(): void {
    this.sway = this.circuit.leads.map(() => ({ x: 0, v: 0 }))
    this.tips = this.circuit.leads.map(() => null)
    this.hot.clear()
    this.hotTraces.clear()
    this.hotParts.clear()
    this.turning.clear()
    this.armed = null
  }

  bends(): number[] {
    return this.live.leads.map((_, i) => {
      const rest = restBend(...leadEnds(this.live, i), i), twin = this.twins[i]
      // A lead that lies across another, between the same two things, bows out on the other side of it, or wider.
      return (twin ? Math.abs(rest) * twin : rest) + (this.sway[i]?.x ?? 0)
    })
  }

  /** For each lead that shares both its ends with an earlier one: which side it bows to, and how much wider. 0 for a lead with no twin before it. */
  private twins: number[] = []
  private pair(): void {
    const leads = this.live.leads, key = (bite: Bite | null) => JSON.stringify(bite)
    const firstSide = new Map<string, { side: number; a: string; seen: number }>()
    this.twins = leads.map((lead, i) => {
      if (lead.a === null || lead.b === null) return 0
      const a = key(lead.a), b = key(lead.b), name = a < b ? `${a}|${b}` : `${b}|${a}`
      const first = firstSide.get(name)
      if (!first) {
        firstSide.set(name, { side: i % 2 ? -1 : 1, a, seen: 1 })
        return 0
      }
      const nth = first.seen++
      // The same side of the gap is the other sign for a lead that runs the other way.
      const side = first.side * (nth % 2 ? -1 : 1) * (first.a === a ? 1 : -1)
      return side * (1 + 0.55 * Math.floor(nth / 2))
    })
  }

  /** Where the second end of a lead is now: in the hand, on its way down, on what it bites or lying on the mat. */
  endOf(lead: number): P {
    if (this.hand?.holds === 'lead' && this.hand.lead === lead) return this.hand.at
    const l = this.live.leads[lead]
    if (l.b !== null) return leadEnds(this.live, lead)[1]
    const tip = this.tips[lead]
    return tip ? { x: tip.x.x, y: tip.y.x } : looseEnd(this.live, lead)
  }

  /** How much of a turn round a part still has to go, from 1 as it is let go to 0 when it is round. */
  turnOf(key: string): number {
    const age = this.turning.get(key)
    if (age === undefined) return 0
    const t = age / TURN_TAKES
    return 1 - t * t * (3 - 2 * t)
  }

  kickOf(key: string): number {
    return this.kick.get(key)?.x ?? 0
  }
  private kickAt(key: string, v: number): void {
    const spring = this.kick.get(key) ?? { x: 0, v: 0 }
    spring.v += v
    this.kick.set(key, spring)
  }

  // --- Changing the circuit ----------------------------------------------------------

  private refresh(): void {
    const hand = this.hand
    this.live = hand?.holds === 'part' && typeof hand.from === 'object' && 'board' in hand.from ? removePart(this.circuit, hand.from.board)
      : hand?.holds === 'coil' && hand.lifted !== undefined ? removeLead(this.circuit, hand.lifted)
      : this.circuit
    this.reading = read(this.live, this.spin())
    if (this.sway.length !== this.live.leads.length) this.resetLeads()
    // Worked out here, when the circuit changes, and never in a frame: with two cells and nothing running, whether they
    // are pushing against each other.
    this.opposed = this.live.parts.filter((part) => part.kind === 'cell').length >= 2 && !this.running && noseToNose(this.live, this.reading)
    this.pair()
  }

  /**
   * Change the board on the mat and let the world answer. `did` says what
   * the finger did, in the grid's terms, so the answer has the grid's motion
   * and voice; whatever gave way says so itself.
   */
  private apply(act: (circuit: Circuit) => Circuit, did: Did | null, removedLead: number | null = null): boolean {
    const before = summary(this.live, this.reading)
    const changed = change(this.stall, act)
    if (changed.stall === this.stall) return false
    const leadsBefore = this.live.leads.length
    this.stall = changed.stall
    if (removedLead !== null && this.circuit.leads.length === leadsBefore - 1) this.forget(removedLead)
    this.refresh()
    this.dirty = this.dirty ?? 'soon'
    this.after(before, did, changed.consequences)
    return true
  }

  /** The sounds and marks of a change: what the finger did, what gave way, and what started or stopped. */
  private after(before: ReturnType<typeof summary>, did: Did | null, consequences: readonly Consequence[]): void {
    const now = summary(this.live, this.reading)
    this.sounds.push(...answerTo(did, before, now, consequences, this.live, this.reading))
    for (const c of consequences) {
      const at = c.onMat ? matAt(this.live.loose[c.part]?.at ?? 0) : this.midOf(c.part)
      this.marks.push({ type: c.type, at })
      // A pop or a blown lamp is a bang: the pigeon across the way is gone.
      this.lane.bang()
      if (c.type === 'pop') {
        for (const lead of c.hot.leads) this.hot.set(lead, 1.4)
        // The glow marks the whole of the way the current took: its traces, and whatever lay on it that is no cell.
        for (const trace of c.hot.traces) this.hotTraces.set(trace, 1.4)
        for (const part of c.hot.parts) {
          const kind = this.live.parts[part]?.kind
          if (kind === 'odd' || kind === 'switch') this.hotParts.set(this.keyOf(this.live.parts[part]), 1.4)
        }
        for (const index of c.hot.loose) {
          const body = this.live.loose[index]
          if (body && (body.kind === 'odd' || body.kind === 'switch')) this.hotParts.set(`loose-${body.at}`, 1.4)
        }
        if (!c.onMat) this.kickAt(this.keyOf(this.live.parts[c.part]), 9)
      }
    }
    // The creak of two cells pushing against each other was just heard, if this act made them push.
    if (this.sounds.some((sound) => sound.voice === 'cell-nose-to-nose')) this.creakIn = 2.5
    if (before.running === 0 && now.running > 0) this.marks.push({ type: 'lit' })
    else if (before.running > 0 && now.running === 0) this.marks.push({ type: 'out' })
    if (now.running > 0 && before.running === 0) this.pulseIn = 0.5
  }

  private forget(lead: number): void {
    this.sway.splice(lead, 1)
    this.tips.splice(lead, 1)
    const hot = new Map<number, number>()
    for (const [i, left] of this.hot) if (i !== lead) hot.set(i > lead ? i - 1 : i, left)
    this.hot = hot
    if (this.armed !== null) this.armed = this.armed === lead ? null : this.armed > lead ? this.armed - 1 : this.armed
  }

  keyOf(part: Part): string {
    return `${Math.min(part.a, part.b)}-${Math.max(part.a, part.b)}`
  }
  midOf(part: number): P {
    const p = this.live.parts[part]
    if (!p) return { x: 0, y: 0 }
    const a = padAt(this.live, p.a), b = padAt(this.live, p.b)
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  }

  // --- The press -----------------------------------------------------------------------

  /** The finger lands. A scene that is playing ends first; then whatever the finger is on answers here and now. */
  press(at: P): void {
    this.finger = at
    this.released = false
    this.scene?.finish()
    this.scene = null
    this.spent = false
    this.pending = null
    if (this.hand) this.lift(this.hand.at, 'end')
    if (this.armed !== null) {
      const lead = this.armed, bite = this.open ? biteNear(this.live, at, lead) : null
      this.armed = null
      if (bite !== null) {
        this.bite(lead, bite)
        this.spent = true
        return
      }
      this.drop(lead, this.endOf(lead))
    }
    if (this.mouse.hit(at)) {
      // The clockwork mouse is wound up and is off; in its box, it only rattles.
      const out = this.mouse.where !== 'home'
      if (out) this.mouse.wind()
      this.sounds.push({ voice: out ? 'mouse-wind' : 'mouse-rattle', pitch: 1 })
      // Out on the mat the finger leaves its print there; its matchbox stands on the wood, which takes none.
      this.marks.push(out ? { type: 'pat', at } : { type: 'knock', on: 'wood', at })
      this.spent = true
      return
    }
    const found = hitTest(this.live, at, this.bends(), this.open)
    // The head of the one who waits answers as the one who waits, except where the grown-up's corner of the surface lies over it.
    const waits = found.on === 'mat' && inBox(at, WAITING_HEAD) && !inBox(at, this.grownUps) ? ({ on: 'waiting' } as const) : found
    // The awning's valance hangs in front of whoever stands under it: a finger there is on the canvas, not on a customer.
    const hit = (waits.on === 'owner' || waits.on === 'waiting') && at.y < VALANCE ? ({ on: 'mat' } as const) : waits
    // Whoever passes down the lane passes behind the customers and shows above and beside them. A finger there, clear
    // of the customer as it is drawn, is on the one who passes; a finger on the customer is on the customer.
    if ((hit.on === 'owner' || hit.on === 'waiting') && this.show.walk >= 1 && !covers(hit.on, hit.on === 'owner' ? this.stall.job.who : this.stall.next.who, at)) {
      const lane = this.lane.hit(at)
      if (lane) return this.inTheLane(lane)
    }
    switch (hit.on) {
      case 'pad': {
        const started = startLead(this.circuit, hit.pad)
        if (started.lead < 0) return this.pat(at)
        this.sway.push({ x: 0, v: 180 })
        this.tips.push(null)
        this.apply(() => started.circuit, { what: 'lead', act: 'start', at: hit.pad })
        this.marks.push({ type: 'bite', at: padAt(this.live, hit.pad) })
        this.hand = { holds: 'lead', lead: started.lead, at, startedOn: hit.pad }
        return
      }
      case 'lug': {
        // The leg of a part that lies loose is metal like any pad: a clip bites it where the finger lands.
        const bite = { loose: hit.loose, end: hit.end }
        const started = startLead(this.circuit, bite, nearestCell(this.circuit, at))
        if (started.lead < 0) return this.pat(at)
        this.sway.push({ x: 0, v: 180 })
        this.tips.push(null)
        this.apply(() => started.circuit, { what: 'lead', act: 'start', at: bite })
        this.marks.push({ type: 'bite', at: biteAt(this.live, bite) })
        this.hand = { holds: 'lead', lead: started.lead, at, startedOn: bite }
        return
      }
      case 'boot': {
        const lead = this.live.leads[hit.lead]
        if (lead.b === null) {
          // Its only clip: the whole lead is in the hand now, biting nothing. It is still where it was in what is saved.
          this.sounds.push({ voice: 'lead-unclip', pitch: 1 })
          this.takeUp(hit.lead, at)
          return
        }
        this.apply((c) => unclipLead(c, hit.lead, hit.end), { what: 'lead', act: 'unclip' })
        if (this.sway[hit.lead]) this.sway[hit.lead].v -= 200
        this.hand = { holds: 'lead', lead: hit.lead, at, startedOn: null }
        return
      }
      case 'whole':
        // A lead that lies loose on the mat is taken up whole.
        this.sounds.push({ voice: 'lead-pick', pitch: 1 })
        this.takeUp(hit.lead, at)
        return
      case 'clip':
        this.sounds.push({ voice: 'lead-pick', pitch: 1 })
        this.tips[hit.lead] = null
        this.hand = { holds: 'lead', lead: hit.lead, at, startedOn: null }
        return
      case 'probe':
        // The test lamp's clip comes off what it bit, if anything, and into the hand.
        if (this.circuit.probe[hit.end] !== null) this.apply((c) => clipProbe(c, hit.end, null), { what: 'lead', act: 'unclip' })
        else this.sounds.push({ voice: 'lead-pick', pitch: 1 })
        this.hand = { holds: 'probe', end: hit.end, at }
        return
      case 'coil':
        if (!this.open) {
          // The coil springs where it lies: its loops shiver and it twangs.
          this.sounds.push({ voice: 'lead-flick', pitch: 0.7 })
          this.kickAt(`tray-${TRAY_KINDS.indexOf('coil')}`, 11)
          this.spent = true
          return
        }
        this.sounds.push({ voice: 'coil-pull', pitch: 1 })
        this.hand = { holds: 'coil', at }
        return
      case 'part': {
        const part = this.live.parts[hit.part]
        this.kickAt(this.keyOf(part), 11)
        const did: Did = { what: part.kind, act: 'flick', part }
        // A lever throws and a popped flag is set back in the press; anything else rings.
        if (!this.apply((c) => flickPart(c, hit.part), did)) this.sounds.push(...answerTo(did, summary(this.live, this.reading), summary(this.live, this.reading), [], this.live, this.reading))
        // A flat cell bounces a second time, as a flat cell does.
        if (part.kind === 'cell' && part.flat) this.later.push({ at: this.seconds + 0.17, key: this.keyOf(part), v: 6 })
        // A blade that no current is turning is set turning by the flick, and freewheels.
        if (part.kind === 'motor' && !part.dead && Math.abs(this.reading.parts[hit.part]) < RUNS_FROM) {
          this.spun.set(this.keyOf(part), { push: 0.6, turned: this.spun.get(this.keyOf(part))?.turned ?? 0 })
          this.reading = read(this.live, this.spin())
        }
        this.pending = { board: hit.part }
        return
      }
      case 'loose': {
        const body = this.live.loose[hit.loose]
        this.kickAt(`loose-${body.at}`, 11)
        const s = summary(this.live, this.reading)
        this.sounds.push(...answerTo({ what: body.kind, act: 'flick', part: body }, s, s, [], this.live, this.reading))
        // Lying loose, a part is what it is on the board: a flat cell bounces a second time, and a blade no current turns freewheels.
        if (body.kind === 'cell' && body.flat) this.later.push({ at: this.seconds + 0.17, key: `loose-${body.at}`, v: 6 })
        if (body.kind === 'motor' && !body.dead && Math.abs(this.reading.loose[hit.loose]) < RUNS_FROM) {
          this.spun.set(`loose-${body.at}`, { push: 0.6, turned: this.spun.get(`loose-${body.at}`)?.turned ?? 0 })
          this.reading = read(this.live, this.spin())
        }
        this.pending = { loose: hit.loose }
        return
      }
      case 'tray':
        if (!this.open) {
          // With no board to put it on it stays in the tray: it is flicked where it lies, hops, and sounds as it does on a board.
          this.sounds.push({ voice: `${hit.kind}-flick`, pitch: 1 })
          this.kickAt(`tray-${TRAY_KINDS.indexOf(hit.kind)}`, 11)
          this.spent = true
          return
        }
        this.sounds.push({ voice: 'part-lift', pitch: 1 })
        this.hand = { holds: 'part', at, body: bodyOf(trayPart(hit.kind, 0, 1)), from: 'tray', angle: 0 }
        return
      case 'odd': {
        if (!this.open) {
          this.sounds.push({ voice: ODD_FLICK[hit.what].voice, pitch: 1 })
          this.kickAt(`odd-${hit.what}`, 11)
          this.spent = true
          return
        }
        const body: Body = { kind: 'odd', what: hit.what }
        const s = summary(this.live, this.reading)
        this.sounds.push(...answerTo({ what: 'odd', act: 'flick', part: body }, s, s, [], this.live, this.reading))
        this.hand = { holds: 'part', at, body, from: 'tray', angle: -0.9 }
        return
      }
      case 'wire': {
        const [p, q] = leadEnds(this.live, hit.lead), span = Math.hypot(q.x - p.x, q.y - p.y)
        this.sway[hit.lead].v += (this.sway[hit.lead].x >= 0 ? -1 : 1) * 520
        this.sounds.push({ voice: 'lead-flick', pitch: Math.max(0.6, Math.min(1.6, 1.7 - span / 420)) })
        this.wire = { lead: hit.lead, from: at, drawn: false }
        this.spent = true
        return
      }
      case 'testLamp':
        this.sounds.push({ voice: 'lamp-flick', pitch: 1.1 })
        this.kickAt('test-lamp', 11)
        this.spent = true
        return
      case 'lid':
        // The gadget is taken by its lid, to be handed back.
        this.sounds.push({ voice: 'part-lift', pitch: 0.7 })
        this.hand = { holds: 'gadget', at }
        return
      case 'hung':
        return this.swap()
      case 'owner':
        return this.touchOwner(at)
      case 'waiting':
        return this.next()
      case 'oldHand':
        this.sounds.push({ voice: 'old-hand-grumble', pitch: 1 })
        this.marks.push({ type: 'poke', who: 'oldHand' })
        this.spent = true
        return
      case 'mug':
        this.sounds.push({ voice: 'mug-tink', pitch: 1 })
        this.marks.push({ type: 'poke', who: 'mug' })
        this.spent = true
        return
      case 'plate':
      case 'clutter':
        // What is hers answers, and so does she.
        this.sounds.push({ voice: hit.on === 'plate' ? 'plate-chink' : 'clutter-rattle', pitch: hit.on === 'plate' ? 1 : 0.8 + ((at.x * 7 + at.y * 3) % 5) * 0.1 })
        this.marks.push({ type: 'hers', what: hit.on, at })
        this.spent = true
        return
      case 'practice':
        // Her practice board rocks on its shelf with a click, and she minds: it is hers.
        this.sounds.push({ voice: 'practice-tick', pitch: 1 })
        this.kickAt('practice', 11)
        this.marks.push({ type: 'hers', what: 'practice', at })
        this.spent = true
        return
      case 'toaster':
      case 'radio':
        // The toaster throws up the slice it has had in it all this time; the radio finds half a tune and loses it.
        this.sounds.push({ voice: hit.on === 'toaster' ? 'toaster-pop' : 'radio-burst', pitch: 1 })
        this.kickAt(hit.on, 11)
        this.marks.push({ type: 'shelf', what: hit.on })
        this.spent = true
        return
      default: {
        // Out in the lane: the washing, the pigeon, whoever is passing.
        const lane = this.lane.hit(at)
        return lane ? this.inTheLane(lane) : this.pat(at)
      }
    }
  }

  /** A whole lead comes up off the mat into the hand. It is left out of the circuit that runs from this frame, and stays in the one that is saved until it is put down. */
  private takeUp(lead: number, at: P): void {
    const before = summary(this.live, this.reading)
    this.hand = { holds: 'coil', at, lifted: lead }
    this.refresh()
    this.after(before, null, [])
  }

  /** A finger on something out in the lane: the washing swings, the pigeon is off, whoever is passing answers. Each has its own sound. */
  private inTheLane(lane: LaneHit): void {
    this.lane.touch(lane)
    this.sounds.push({ voice: lane.on === 'washing' ? 'washing-flap' : lane.on === 'pigeon' ? 'pigeon-off' : `passer-${lane.who}`, pitch: lane.on === 'washing' ? 0.9 + lane.item * 0.07 : 1 })
    this.spent = true
  }

  /** A finger on nothing in particular. The mat takes its print with a thud; anything else is knocked on, and sounds as what it is. */
  private pat(at: P): void {
    this.spent = true
    if (inBox(at, MAT_BOX)) {
      this.sounds.push({ voice: 'mat-pat', pitch: 1 })
      this.marks.push({ type: 'pat', at })
      return
    }
    const on = at.y >= STAGE.counterBottom ? 'wood' : at.y >= STAGE.counterTop ? 'steel' : at.x < WINDOW_LEFT + 2 || at.x >= PILLAR_LEFT - 2 ? 'wall' : at.y < VALANCE ? 'awning' : 'air'
    this.sounds.push({ voice: `knock-${on}`, pitch: 1 })
    this.marks.push({ type: 'knock', on, at })
  }

  /** The second clip of a lead bites something. */
  private bite(lead: number, bite: Bite): void {
    const from = this.live.leads[lead].a
    this.tips[lead] = null
    if (this.sway[lead]) this.sway[lead].v += from === bite ? 420 : 260
    this.marks.push({ type: 'bite', at: isPad(bite) ? padAt(this.live, bite) : this.endOf(lead) })
    const place = nearestCell(this.circuit, this.endOf(lead))
    // Whether the part this lead will lie across is carrying anything now, before the bite.
    const across = from !== null && isPad(from) && isPad(bite) ? partAcross(this.live, from, bite) : -1
    const ran = across >= 0 ? Math.abs(this.reading.parts[across]) >= RUNS_FROM : undefined
    this.apply((c) => clipLeadEnd(c, lead, bite, place), { what: 'lead', act: 'bite', lead, from, to: bite, ran })
  }

  private drop(lead: number, from: P): void {
    if (!this.live.leads[lead]) return
    const rest = looseEnd(this.live, lead)
    this.tips[lead] = { x: { x: from.x, v: 0 }, y: { x: from.y, v: 0 } }
    if (this.sway[lead]) this.sway[lead].v += Math.hypot(from.x - rest.x, from.y - rest.y) > 20 ? 220 : 60
    this.sounds.push({ voice: 'lead-drop', pitch: 1 })
    // Its free clip snaps once as it lands: seen where it lands.
    this.marks.push({ type: 'down', at: rest })
  }

  // --- The move and the lift -------------------------------------------------------------

  /** The finger moves. A part it is on is lifted off and carried from the first move. */
  move(at: P): void {
    if (this.pending && !this.hand) {
      const before = summary(this.live, this.reading)
      if ('board' in this.pending) {
        const index = this.pending.board
        // A lever that the press threw is thrown back as the switch is lifted: carrying a switch, or turning it round, does not also work it.
        if (this.circuit.parts[index]?.kind === 'switch') {
          this.stall = change(this.stall, (c) => flickPart(c, index)).stall
          this.dirty = this.dirty ?? 'soon'
        }
        const part = this.circuit.parts[index]
        if (part) {
          const p = padAt(this.circuit, part.a), q = padAt(this.circuit, part.b)
          this.hand = { holds: 'part', at, body: bodyOf(part), from: { board: index, a: part.a, b: part.b }, angle: Math.atan2(q.y - p.y, q.x - p.x) }
        }
      } else {
        const body = this.circuit.loose[this.pending.loose]
        if (body) {
          const { at: _cell, ...rest } = body
          this.hand = { holds: 'part', at, body: rest as Body, from: { loose: this.pending.loose }, angle: 0 }
        }
      }
      this.pending = null
      if (this.hand) {
        // Lifted off: the circuit that runs is the one without it, from this frame.
        this.refresh()
        this.sounds.push({ voice: 'part-lift', pitch: 1 })
        this.after(before, null, [])
      }
    }
    if (this.hand) this.hand.at = at
    if (this.wire && Math.hypot(at.x - this.wire.from.x, at.y - this.wire.from.y) > 16) this.wire.drawn = true
    this.released = false
    this.finger = at
  }

  /** The finger lifts. `tap`: it never moved. `lift`: it let go in the middle of a drag and may come back. `end`: the touch is over. */
  lift(at: P, how: 'tap' | 'lift' | 'end'): void {
    this.finger = how === 'lift' ? at : null
    this.released = how === 'lift'
    this.pending = null
    if (this.wire) {
      // A lead drawn aside by its wire and let go is turned round: its clips swap ends with a flourish, and nothing changes.
      const { lead, drawn } = this.wire
      this.wire = null
      if (drawn && this.live.leads[lead]) {
        if (!this.apply((c) => turnLead(c, lead), { what: 'lead', act: 'turn' })) this.sounds.push({ voice: 'lead-turn', pitch: 1 })
        if (this.sway[lead]) this.sway[lead].v += (this.sway[lead].x >= 0 ? 1 : -1) * 900
      }
    }
    const hand = this.hand
    if (!hand || this.spent) {
      if (how !== 'lift') this.spent = false
      return
    }
    hand.at = at
    if (hand.holds === 'part') return this.setDown(hand, at, how)
    if (hand.holds === 'gadget') {
      if (how === 'lift' && !inBox(at, OWNER)) return
      this.hand = null
      if (inBox(at, OWNER)) this.handBack()
      else this.sounds.push({ voice: 'part-down', pitch: 0.7 })
      return
    }
    const self = hand.holds === 'lead' ? hand.lead : null
    const bite = biteNear(this.live, at, self)
    if (hand.holds === 'probe') {
      if (bite !== null) {
        this.hand = null
        this.marks.push({ type: 'bite', at: isPad(bite) ? padAt(this.live, bite) : at })
        this.apply((c) => clipProbe(c, hand.end, bite), { what: 'lead', act: 'start', at: bite })
      } else if (how !== 'lift') {
        // Let go over nothing, a clip of the test lamp goes back to its own place.
        this.hand = null
        this.sounds.push({ voice: 'lead-drop', pitch: 1.2 })
      }
      return
    }
    if (hand.holds === 'coil') {
      // The circuit without the lead in the hand: as stored, for one fresh from the coil; less the one taken up, for that.
      const base = hand.lifted !== undefined ? removeLead(this.circuit, hand.lifted) : this.circuit
      if (bite !== null) {
        const started = startLead(base, bite, nearestCell(base, at))
        this.hand = null
        if (started.lead < 0) {
          if (base !== this.circuit) this.apply(() => base, { what: 'lead', act: 'wind' })
          else this.sounds.push({ voice: 'lead-wind', pitch: 1 })
          this.marks.push({ type: 'wind', at: COIL })
          return
        }
        this.sway.push({ x: 0, v: 180 })
        this.tips.push({ x: { x: COIL.x, v: 0 }, y: { x: COIL.y, v: 0 } })
        this.apply(() => started.circuit, { what: 'lead', act: 'start', at: bite })
        this.marks.push({ type: 'bite', at: isPad(bite) ? padAt(this.live, bite) : at })
      } else if (how !== 'lift') {
        this.hand = null
        // Let go over the tray, a whole lead winds back into the coil. Let go anywhere else, it lies where it was put.
        const laid = inBox(at, TRAY) || !this.open ? base : layLead(base, nearestCell(base, at))
        // Wound back into the coil: heard, and seen there.
        if (laid === this.circuit || laid === base) {
          this.marks.push({ type: 'wind', at: COIL })
          if (laid === this.circuit) this.sounds.push({ voice: 'lead-wind', pitch: 1 })
          else this.apply(() => base, { what: 'lead', act: 'wind' })
          return
        }
        this.sway.push({ x: 0, v: 160 })
        this.tips.push(null)
        this.apply(() => laid, { what: 'lead', act: 'down' })
        this.marks.push({ type: 'down', at: matAt(nearestCell(base, at)) })
      }
      return
    }
    const lead = hand.lead
    if (how === 'tap' && hand.startedOn !== null) {
      this.hand = null
      this.armed = lead
      this.tips[lead] = null
      return
    }
    if (bite !== null) {
      this.hand = null
      this.bite(lead, bite)
    } else if (inBox(at, TRAY) && Math.hypot(at.x - COIL.x, at.y - COIL.y) < 90 && how !== 'lift') {
      // Dropped on the coil, a lead winds itself up.
      this.hand = null
      this.apply((c) => removeLead(c, lead), { what: 'lead', act: 'wind' }, lead)
      this.marks.push({ type: 'wind', at: COIL })
    } else if (how !== 'lift') {
      this.hand = null
      this.drop(lead, at)
    }
  }

  /**
   * The game is put away, or goes to rest, with a touch in progress. Whatever is in the hand goes back where it came
   * from, and no move is made that the child did not make: no clip bites, no part is seated or turned round, and the
   * gadget is not handed back. What the press itself already did stands: a clip pulled off is off, and a lead begun on a
   * pad lies with its second clip loose. This is exactly what the save holds while a thing is in the hand.
   */
  letGo(): void {
    // A finger that had already lifted, and was only being waited for in case it came back, made its move: that move stands.
    if (this.hand && this.released) this.lift(this.hand.at, 'end')
    const hand = this.hand
    this.hand = null
    this.released = false
    this.finger = null
    this.pending = null
    this.armed = null
    this.wire = null
    this.spent = false
    if (!hand) return
    if (hand.holds === 'part' || hand.holds === 'coil') this.refresh()
    else if (hand.holds === 'lead') this.tips[hand.lead] = null
  }

  /** A carried part is put down: across a pair of pads, in the tray, or loose on the mat. */
  private setDown(hand: Extract<Hand, { holds: 'part' }>, at: P, how: 'tap' | 'lift' | 'end'): void {
    if (how === 'lift') return
    this.hand = null
    const from = hand.from, lay = layOf(this.circuit)
    // A tap on a part in the tray, or on a bench odd where it lies, is a flick: it has sounded, and nothing is laid down.
    if (how === 'tap' && from === 'tray') return void this.refresh()
    const fromBoard = typeof from === 'object' && 'board' in from ? from : null
    const fromLoose = typeof from === 'object' && 'loose' in from ? from : null
    const stored = this.circuit
    // The circuit as it is while the part is in the air: its own place is free.
    const without = fromBoard ? removePart(stored, fromBoard.board) : stored
    // The nearest free pair of pads, if the part is over one.
    let best: [number, number] | null = null, bestD = lay.u * 0.6
    for (const [a, b] of socketsOf(stored)) {
      // A pair with something across it, or where this part's body would run into its neighbour's, is no place for it.
      if (partAcross(without, a, b) >= 0 || !hasRoom(without, { ...hand.body, a, b } as Part)) continue
      const p = padAt(stored, a), q = padAt(stored, b), d = Math.hypot((p.x + q.x) / 2 - at.x, (p.y + q.y) / 2 - at.y)
      if (d < bestD) { best = [a, b]; bestD = d }
    }
    const kind = hand.body.kind
    const mid = (a: number, b: number): P => ({ x: (padAt(stored, a).x + padAt(stored, b).x) / 2, y: (padAt(stored, a).y + padAt(stored, b).y) / 2 })
    if (best) {
      const [a, b] = best
      if (fromBoard && ((fromBoard.a === a && fromBoard.b === b) || (fromBoard.a === b && fromBoard.b === a))) {
        // Let go over the place it came from: it is turned round.
        this.kickAt(`${Math.min(a, b)}-${Math.max(a, b)}`, 9)
        this.turning.set(`${Math.min(a, b)}-${Math.max(a, b)}`, 0)
        this.marks.push({ type: 'down', at: mid(a, b) })
        this.refreshAfter(() => this.apply((c) => turnPart(c, fromBoard.board), { what: kind, act: 'turn', part: hand.body }))
        return
      }
      // It keeps the way round it was held: its first end goes to the pad that lies that way.
      const p = padAt(stored, a), q = padAt(stored, b)
      const along = Math.cos(hand.angle) * (q.x - p.x) + Math.sin(hand.angle) * (q.y - p.y)
      // Held square across the place, as a part fresh from the tray is over a cell's place, it has no way round of its
      // own: it goes in as the board was built, so that a fresh cell for a flat one pushes the way the old one did.
      const built = Math.abs(along) < 1e-6 ? boardOf(stored.gadget).cellSockets.find(([base, cap]) => (base === a && cap === b) || (base === b && cap === a)) : undefined
      const [first, second] = built ?? (along >= 0 ? [a, b] : [b, a])
      const seated = { ...hand.body, a: first, b: second } as Part
      const did: Did = { what: kind, act: 'clip', part: hand.body, seat: [first, second] }
      this.kickAt(`${Math.min(a, b)}-${Math.max(a, b)}`, 9)
      this.marks.push({ type: 'down', at: mid(a, b) })
      if (fromBoard) this.refreshAfter(() => this.apply((c) => movePart(c, fromBoard.board, seated), did))
      else if (fromLoose) this.refreshAfter(() => this.apply((c) => seat(c, fromLoose.loose, first, second), did))
      else this.refreshAfter(() => this.apply((c) => placePart(c, seated), did))
      return
    }
    if (inBox(at, TRAY)) {
      // Back into the tray, which never runs out and never fills.
      if (fromBoard) this.refreshAfter(() => this.apply((c) => removePart(c, fromBoard.board), { what: kind, act: 'away' }))
      else if (fromLoose) this.refreshAfter(() => this.apply((c) => moveLoose(c, fromLoose.loose, null), { what: kind, act: 'away' }))
      else { this.refresh(); this.sounds.push({ voice: 'part-away', pitch: 1 }) }
      return
    }
    // Loose on the mat, at the nearest free place, when there is one near enough.
    const cell = nearestFreeCell(stored, at)
    const near = cell >= 0 && Math.hypot(matAt(cell).x - at.x, matAt(cell).y - at.y) < 150
    if (near && (fromLoose || stored.loose.length < MAX_LOOSE)) {
      const did: Did = { what: kind, act: 'down' }
      this.kickAt(`loose-${cell}`, 7)
      this.marks.push({ type: 'down', at: matAt(cell) })
      if (fromBoard) this.refreshAfter(() => this.apply((c) => layDown(c, fromBoard.board, cell), did))
      else if (fromLoose) this.refreshAfter(() => this.apply((c) => moveLoose(c, fromLoose.loose, cell), did))
      else this.refreshAfter(() => this.apply((c) => ({ ...c, loose: [...c.loose, { ...hand.body, at: cell } as Loose] }), did))
      return
    }
    // Nowhere to put it: it goes back where it came from, and a part from the tray goes back to the tray.
    const before = summary(this.live, this.reading)
    this.refresh()
    this.sounds.push({ voice: fromBoard || fromLoose ? 'part-down' : 'part-away', pitch: 1 })
    this.after(before, null, [])
  }

  /** Run a change that ends a carry: if the change did nothing, the part is simply back where it was. */
  private refreshAfter(run: () => boolean): void {
    if (run()) return
    const before = summary(this.live, this.reading)
    this.refresh()
    this.sounds.push({ voice: 'part-down', pitch: 1 })
    this.after(before, null, [])
  }

  // --- The cycle -------------------------------------------------------------------------

  /** The other board comes onto the mat. */
  private swap(): void {
    this.stall = swapBoards(this.stall)
    this.refresh()
    this.resetLeads()
    this.sounds.push({ voice: 'board-swap', pitch: 1 })
    if (this.lying) this.marks.push({ type: 'land' })
    this.dirty = this.dirty ?? 'soon'
    this.spent = true
  }

  /** A touch on the customer at the bench: the gadget they hold out comes onto the mat, or the gadget on the mat is handed back. */
  private touchOwner(at: P): void {
    this.spent = true
    // With its gadget open on the mat, the owner's hands at the counter are where it is handed back. A touch on its head
    // or its shoulders is a touch on the owner, who answers, and hands nothing back.
    if (this.stall.job.open && !this.stall.finished && this.stall.onMat === 'job' && !inBox(at, OWNER_HANDS)) {
      this.sounds.push({ voice: `voice-${this.stall.job.who}`, pitch: 1 })
      this.marks.push({ type: 'poke', who: 'owner' })
      return
    }
    // A second tap in the same place, as the ghost hand shows two, does no harm: for a moment after the gadget has
    // come onto the mat a touch on its owner only has the owner answer.
    if (this.stall.job.open && !this.stall.finished && this.seconds - this.openedAt < SETTLES) {
      this.sounds.push({ voice: `voice-${this.stall.job.who}`, pitch: 1 })
      this.marks.push({ type: 'poke', who: 'owner' })
      return
    }
    if (this.stall.finished) {
      this.sounds.push({ voice: `voice-${this.stall.job.who}`, pitch: 1 })
      this.marks.push({ type: 'poke', who: 'owner' })
      return
    }
    if (!this.stall.job.open) {
      this.stall = openGadget(this.stall)
      this.openedAt = this.seconds
      this.refresh()
      this.resetLeads()
      this.sounds.push({ voice: 'lid-open', pitch: 1 })
      this.marks.push({ type: 'land' })
      this.dirty = this.dirty ?? 'soon'
      return
    }
    if (this.stall.onMat === 'job') this.handBack()
    else this.sounds.push({ voice: `voice-${this.stall.job.who}`, pitch: 1 })
  }

  /** The gadget goes to its owner, who switches it on. The outcome is in the stall before the scene's first beat. */
  private handBack(): void {
    const over = handOver(this.stall)
    if (!over) return
    this.stall = over.stall
    this.dirty = 'now'
    this.armed = null
    this.refresh()
    // When the old hand has a neat way to show after it, her board stands broken from the start of the hand-back.
    const beats = over.outcome === null ? laidBackScene(this.show, over.reaction.act) : handBackScene(this.show, over.reaction.act, over.neatWay !== null)
    this.scene = new Scene(over.neatWay ? followedBy(beats, neatWayScene(this.show)) : beats)
    this.scene.start(this.seconds, () => {})
    this.sounds.push({ voice: over.handed.lid === 'banded' ? 'lid-band' : 'lid-shut', pitch: 1 }, { voice: `voice-${this.stall.job.who}`, pitch: 1 })
  }

  /** A touch on the customer who waits: the one at the bench goes, the one who waits comes, and a new one steps up. */
  private next(): void {
    this.spent = true
    // The same for the one who waits: while the customers are still changing places, and for a moment after, a
    // second touch there only has the newcomer answer, and sends nobody away.
    if (this.seconds - this.calledAt < LENGTH.changeOver + SETTLES) {
      this.sounds.push({ voice: `voice-${this.stall.next.who}`, pitch: 1 })
      this.marks.push({ type: 'poke', who: 'waiting' })
      return
    }
    this.calledAt = this.seconds
    this.leaving = this.stall.job
    const leftShow = this.stall.finished
    this.sentAway = !leftShow
    this.stall = callNext(this.stall).stall
    this.dirty = 'now'
    this.refresh()
    this.resetLeads()
    // The one who leaves keeps the gadget as it was in their hands; the show starts afresh for the one who comes.
    if (!leftShow) this.leaving = { ...this.leaving, open: false }
    this.scene = new Scene(changeOverScene(this.show))
    this.scene.start(this.seconds, () => {})
    this.sounds.push({ voice: 'step-up', pitch: 1 }, { voice: `voice-${this.stall.job.who}`, pitch: 1 })
  }

  // --- Time ------------------------------------------------------------------------------

  /** Game time moves on by `dt` seconds. */
  step(dt: number): void {
    this.seconds += dt
    if (this.scene) {
      this.scene.update(this.seconds)
      if (!this.scene.running) this.scene = null
    }
    if (!this.scene && this.show.walk >= 1) this.leaving = null
    this.live.leads.forEach((_, i) => {
      if (!this.sway[i]) return
      stepSpring(this.sway[i], 0, LEAD_SPRING.stiffness, LEAD_SPRING.damping, dt)
      const tip = this.tips[i]
      if (!tip || (this.hand?.holds === 'lead' && this.hand.lead === i)) return
      const rest = looseEnd(this.live, i)
      stepSpring(tip.x, rest.x, 70, 11, dt)
      stepSpring(tip.y, rest.y, 70, 11, dt)
      if (Math.hypot(tip.x.x - rest.x, tip.y.x - rest.y) < 0.5 && Math.hypot(tip.x.v, tip.y.v) < 2) this.tips[i] = null
    })
    // A blade that turns moves the air: the leads on the mat stir in it, each a little out of step with the next.
    const wind = this.wind()
    if (wind !== 0) this.sway.forEach((spring, i) => { spring.v += Math.sin(this.seconds * 5.3 + i * 1.7) * wind * 90 * dt })
    this.later = this.later.filter((hop) => {
      if (hop.at > this.seconds) return true
      this.kickAt(hop.key, hop.v)
      return false
    })
    // A blade set turning by hand slows by itself, and sooner the harder the current it drives holds it back. While
    // any blade freewheels the circuit is solved each frame, since a spun motor is a source; when the last has
    // stopped, nothing is solved again until a touch.
    if (this.spun.size > 0) {
      for (const [key, blade] of this.spun) {
        // On the board a motor is found by where it sits; lying loose, by its place on the mat, and it is spun under -1 less its number.
        const lying = this.live.loose.findIndex((body) => body.kind === 'motor' && `loose-${body.at}` === key)
        const seated = this.live.parts.findIndex((part) => part.kind === 'motor' && this.keyOf(part) === key)
        const found = seated >= 0 || lying >= 0, index = seated >= 0 ? seated : -1 - lying
        const held = found ? braking(this.live, index, blade.push) : 1
        blade.turned += blade.push * 22 * dt
        blade.push *= Math.exp(-dt * (0.7 + held * 5))
        if (!found || blade.push < 0.03) this.spun.delete(key)
      }
      this.reading = read(this.live, this.spin())
    }
    // The mouse has the mat to itself while no board lies there.
    this.mouse.step(dt, !this.lying)
    this.lane.step(dt)
    for (const [key, spring] of this.kick) {
      stepSpring(spring, 0, 160, 9, dt)
      if (Math.abs(spring.x) < 0.001 && Math.abs(spring.v) < 0.01) this.kick.delete(key)
    }
    for (const [lead, left] of this.hot) left - dt <= 0 ? this.hot.delete(lead) : this.hot.set(lead, left - dt)
    for (const glow of [this.hotTraces, this.hotParts] as Map<number | string, number>[]) for (const [key, left] of glow) left - dt <= 0 ? glow.delete(key) : glow.set(key, left - dt)
    for (const [key, age] of this.turning) age + dt >= TURN_TAKES ? this.turning.delete(key) : this.turning.set(key, age + dt)
    // What runs is heard for as long as it runs: struck again twice a second, and silent the moment it stops. On the
    // mat that is the board as it lies; in its owner's hands, the gadget as its owner has switched it on.
    // Two cells that push against each other creak for as long as they do, however they came to: turned, seated, or
    // let at each other by a lever.
    if (this.lying && this.opposed) {
      if ((this.creakIn -= dt) <= 0) {
        this.sounds.push({ voice: 'cell-nose-to-nose', pitch: 1 })
        this.creakIn = 2.5
      }
    } else this.creakIn = 0
    // In its owner's hands a gadget with a switch is on while that switch is; one with none runs from the moment it is taken.
    const switched = this.switched
    const on = this.show.take > 0.5 && (this.show.on > 0.5 || !switched)
    // The owner throws the switch, on or off: it is heard, and seen on the gadget's edge.
    if (switched && on !== this.wasOn && this.show.take > 0.5) this.sounds.push({ voice: 'switch-flick', pitch: on ? 1 : 0.9 })
    if (on && !this.wasOn) {
      // A flag that pops in its owner's hands is a pop like any other: heard, seen, and felt by everybody.
      if (this.triedOf(this.stall.job.circuit).popped) {
        this.sounds.push({ voice: 'cell-across', pitch: 1 })
        this.marks.push({ type: 'pop', at: { x: HELD.x + HELD.w * 0.2, y: HELD.y } })
        this.lane.bang()
      }
      this.pulseIn = Math.min(this.pulseIn, 0.12)
    }
    this.wasOn = on
    if ((this.pulseIn -= dt) <= 0) {
      if (this.lying) this.sounds.push(...pulses(this.live, this.reading))
      // The one who walks off with a gadget that runs is heard as far as the end of the lane.
      if (this.leaving && !this.sentAway && this.show.walk < 1) {
        const carried = this.triedOf(this.leaving.circuit)
        this.sounds.push(...pulses(carried.circuit, carried.reading))
      }
      if (on) {
        const tried = this.triedOf(this.stall.job.circuit)
        this.sounds.push(...pulses(tried.circuit, tried.reading))
        // The cockatoo joins the loudest rasp and drowns it out, for as long as its reaction lasts.
        if (this.show.act === 'cockatoo-joins-and-drowns-it-out' && this.show.react < 1) this.sounds.push({ voice: 'voice-cockatoo', pitch: 1.12 })
      }
      this.pulseIn = 0.5
    }
  }

  /** The gadget as its owner tries it, switched on and settled: worked out once for a circuit, never in a frame that only draws. */
  private triedOf(circuit: Circuit): { circuit: Circuit; reading: Reading; popped: boolean } {
    let tried = this.tried.get(circuit)
    if (!tried) {
      const settled = settle(switchedOn(circuit))
      tried = { circuit: settled.circuit, reading: settled.reading, popped: settled.consequences.some((c) => c.type === 'pop') }
      this.tried.set(circuit, tried)
    }
    return tried
  }
  private readonly tried = new WeakMap<Circuit, { circuit: Circuit; reading: Reading; popped: boolean }>()
  private wasOn = false
  private creakIn = 0
  /** When the gadget last came onto the mat, and when the next customer was last called, in the bench's own seconds. */
  /** The finger has lifted in the middle of a drag and may come back: what is in the hand is where it was let go. */
  private released = false
  private openedAt = -10
  private calledAt = -10

  /** How bright the brightest lamp on the mat is, and where: for the glow and for whoever likes a lamp. */
  brightest(): { at: P; much: number } | null {
    let best: { at: P; much: number } | null = null
    this.live.parts.forEach((part, i) => {
      const much = part.kind === 'lamp' ? level(this.reading.parts[i]) : 0
      if (much > 0 && (!best || much > best.much)) best = { at: this.midOf(i), much }
    })
    return best
  }

  /** How hard the fastest blade on the mat blows, 0 to 3: negative when it turns the wrong way and sucks. */
  wind(): number {
    // Only a fan's blade moves the air: a car's motor turns a wheel and a robot's an arm.
    if (!this.open || this.live.gadget === 'car' || this.live.gadget === 'robot') return 0
    let wind = 0
    this.live.parts.forEach((part, i) => {
      const much = part.kind === 'motor' ? level(this.reading.parts[i]) : 0
      if (much > Math.abs(wind)) wind = this.reading.parts[i] > 0 ? much : -much
    })
    this.live.loose.forEach((part, i) => {
      const much = part.kind === 'motor' ? level(this.reading.loose[i]) : 0
      if (much > Math.abs(wind)) wind = this.reading.loose[i] > 0 ? much : -much
    })
    return wind
  }

  /** The push of every blade that is freewheeling, by its motor's place in the live circuit. */
  private spin(): Spin {
    const spin: Record<number, number> = {}
    if (this.spun.size === 0) return spin
    this.live.parts.forEach((part, i) => {
      const blade = part.kind === 'motor' ? this.spun.get(this.keyOf(part)) : undefined
      if (blade) spin[i] = blade.push
    })
    this.live.loose.forEach((body, i) => {
      const blade = body.kind === 'motor' ? this.spun.get(`loose-${body.at}`) : undefined
      if (blade) spin[-1 - i] = blade.push
    })
    return spin
  }

  /** How far a blade has been turned by hand, in radians, for the view: 0 for one that never was, or that has stopped. */
  turnedOf(part: Part): number {
    return this.spun.get(this.keyOf(part))?.turned ?? 0
  }
  /** The same for a motor that lies loose, by its place on the mat. */
  turnedLoose(at: number): number {
    return this.spun.get(`loose-${at}`)?.turned ?? 0
  }

  /** Whether anything on the mat carries current. */
  get running(): boolean {
    return summary(this.live, this.reading).running > 0
  }

  /** Where a clip of the test lamp is now: in the hand, on what it bites, or at its own place. */
  probeAt(end: 0 | 1): P {
    if (this.hand?.holds === 'probe' && this.hand.end === end) return this.hand.at
    const bite = this.live.probe[end]
    return bite === null ? PROBE_HOME[end] : biteAt(this.live, bite)
  }
}
