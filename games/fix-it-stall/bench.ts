import { boardOf, isSocket } from './board'
import { clipLeadEnd, clipProbe, flickPart, isPad, layDown, layLead, MAX_LOOSE, moveLoose, partAcross, placePart, removeLead, removePart, seat, startLead, trayPart, turnPart, unclipLead, type Bite, type Body, type Circuit, type Loose, type Part } from './circuit'
import { boardOnMat, callNext, change, handOver, openGadget, swapBoards } from './cycle'
import { handBack } from './handback'
import { type Job } from './jobs'
import { LEAD_SPRING, stepSpring, type Spring } from './motion'
import { type Stall } from './save'
import { followedBy, Scene } from './scene'
import { type Consequence } from './settle'
import { atRest, changeOverScene, handBackScene, laidBackScene, neatWayScene, settled, type Show } from './show'
import { braking, level, read, RUNS_FROM, type Reading, type Spin } from './solve'
import { answerTo, pulses, summary, type Did, type Sound } from './benchSound'
import { biteAt, biteNear, COIL, hitTest, inBox, layOf, leadEnds, looseEnd, matAt, nearestCell, nearestFreeCell, OWNER, padAt, PROBE_HOME, restBend, TRAY, type P } from './stage'
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
  | { type: 'pop'; at: P }
  | { type: 'blow'; at: P }
  | { type: 'poke'; who: 'oldHand' | 'mug' | 'owner' | 'waiting' }
  | { type: 'lit' }
  | { type: 'out' }

type Carried = { body: Body; from: { board: number; a: number; b: number } | { loose: number } | 'tray'; angle: number }

export type Hand =
  | { holds: 'lead'; lead: number; at: P; startedOn: Bite | null }
  | { holds: 'coil'; at: P }
  | ({ holds: 'part'; at: P } & Carried)
  | { holds: 'probe'; end: 0 | 1; at: P }
  | { holds: 'gadget'; at: P }

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
  sounds: Sound[] = []
  marks: Mark[] = []
  /** Set when the stall changed: `soon` for a small change, `now` for a scene's outcome or the end of a cycle. */
  dirty: 'soon' | 'now' | null = null
  /** The numbers the scenes move, which the view draws from. */
  show: Show
  /** The customer who is walking off while the next comes to the bench. Not saved: on load nobody is walking. */
  leaving: Job | null = null
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
    this.live = this.circuit
    this.reading = read(this.live)
    this.show = stall.finished ? settled(reaction(stall.job.who, handBack(stall.job.circuit)).act, stall.board !== null) : atRest()
    this.resetLeads()
  }

  /** The board on the mat: the gadget's, or the sign's. */
  get circuit(): Circuit {
    return boardOnMat(this.stall)
  }
  /** A board lies open on the mat and can be worked on. */
  get open(): boolean {
    return this.stall.onMat === 'sign' || (this.stall.job.open && !this.stall.finished)
  }

  private resetLeads(): void {
    this.sway = this.circuit.leads.map(() => ({ x: 0, v: 0 }))
    this.tips = this.circuit.leads.map(() => null)
    this.hot.clear()
    this.armed = null
  }

  bends(): number[] {
    return this.live.leads.map((_, i) => restBend(...leadEnds(this.live, i), i) + (this.sway[i]?.x ?? 0))
  }

  /** Where the second end of a lead is now: in the hand, on its way down, on what it bites or lying on the mat. */
  endOf(lead: number): P {
    if (this.hand?.holds === 'lead' && this.hand.lead === lead) return this.hand.at
    const l = this.live.leads[lead]
    if (l.b !== null) return leadEnds(this.live, lead)[1]
    const tip = this.tips[lead]
    return tip ? { x: tip.x.x, y: tip.y.x } : looseEnd(this.live, lead)
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
    this.live = hand?.holds === 'part' && typeof hand.from === 'object' && 'board' in hand.from ? removePart(this.circuit, hand.from.board) : this.circuit
    this.reading = read(this.live, this.spin())
    if (this.sway.length !== this.live.leads.length) this.resetLeads()
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
      if (c.type === 'pop') {
        for (const lead of c.hot.leads) this.hot.set(lead, 1.4)
        if (!c.onMat) this.kickAt(this.keyOf(this.live.parts[c.part]), 9)
      }
    }
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
    const hit = hitTest(this.live, at, this.bends(), this.open)
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
      case 'boot': {
        const lead = this.live.leads[hit.lead]
        if (lead.b === null) {
          // Its only clip: the whole lead is in the hand now, biting nothing.
          this.apply((c) => unclipLead(c, hit.lead, 0), { what: 'lead', act: 'unclip' }, hit.lead)
          this.hand = { holds: 'coil', at }
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
        this.apply((c) => removeLead(c, hit.lead), null, hit.lead)
        this.hand = { holds: 'coil', at }
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
        this.pending = { loose: hit.loose }
        return
      }
      case 'tray':
        this.sounds.push({ voice: 'part-lift', pitch: 1 })
        this.hand = { holds: 'part', at, body: bodyOf(trayPart(hit.kind, 0, 1)), from: 'tray', angle: 0 }
        return
      case 'odd': {
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
        return this.touchOwner()
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
      default:
        return this.pat(at)
    }
  }

  private pat(at: P): void {
    this.sounds.push({ voice: 'mat-pat', pitch: 1 })
    this.marks.push({ type: 'pat', at })
    this.spent = true
  }

  /** The second clip of a lead bites something. */
  private bite(lead: number, bite: Bite): void {
    const from = this.live.leads[lead].a
    this.tips[lead] = null
    if (this.sway[lead]) this.sway[lead].v += from === bite ? 420 : 260
    this.marks.push({ type: 'bite', at: isPad(bite) ? padAt(this.live, bite) : this.endOf(lead) })
    const place = nearestCell(this.circuit, this.endOf(lead))
    this.apply((c) => clipLeadEnd(c, lead, bite, place), { what: 'lead', act: 'bite', lead, from, to: bite })
  }

  private drop(lead: number, from: P): void {
    if (!this.live.leads[lead]) return
    const rest = looseEnd(this.live, lead)
    this.tips[lead] = { x: { x: from.x, v: 0 }, y: { x: from.y, v: 0 } }
    if (this.sway[lead]) this.sway[lead].v += Math.hypot(from.x - rest.x, from.y - rest.y) > 20 ? 220 : 60
    this.sounds.push({ voice: 'lead-drop', pitch: 1 })
  }

  // --- The move and the lift -------------------------------------------------------------

  /** The finger moves. A part it is on is lifted off and carried from the first move. */
  move(at: P): void {
    if (this.pending && !this.hand) {
      const before = summary(this.live, this.reading)
      if ('board' in this.pending) {
        const index = this.pending.board, part = this.circuit.parts[index]
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
  }

  /** The finger lifts. `tap`: it never moved. `lift`: it let go in the middle of a drag and may come back. `end`: the touch is over. */
  lift(at: P, how: 'tap' | 'lift' | 'end'): void {
    this.pending = null
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
      if (bite !== null) {
        const started = startLead(this.circuit, bite, nearestCell(this.circuit, at))
        this.hand = null
        if (started.lead < 0) return void this.sounds.push({ voice: 'lead-wind', pitch: 1 })
        this.sway.push({ x: 0, v: 180 })
        this.tips.push({ x: { x: COIL.x, v: 0 }, y: { x: COIL.y, v: 0 } })
        this.apply(() => started.circuit, { what: 'lead', act: 'start', at: bite })
        this.marks.push({ type: 'bite', at: isPad(bite) ? padAt(this.live, bite) : at })
      } else if (how !== 'lift') {
        this.hand = null
        // Let go over the tray, a whole lead winds back into the coil. Let go anywhere else, it lies where it was put.
        const laid = inBox(at, TRAY) || !this.open ? this.circuit : layLead(this.circuit, nearestCell(this.circuit, at))
        if (laid === this.circuit) return void this.sounds.push({ voice: 'lead-wind', pitch: 1 })
        this.sway.push({ x: 0, v: 160 })
        this.tips.push(null)
        this.apply(() => laid, { what: 'lead', act: 'down' })
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
    } else if (how !== 'lift') {
      this.hand = null
      this.drop(lead, at)
    }
  }

  /** A carried part is put down: across a pair of pads, in the tray, or loose on the mat. */
  private setDown(hand: Extract<Hand, { holds: 'part' }>, at: P, how: 'tap' | 'lift' | 'end'): void {
    if (how === 'lift') return
    this.hand = null
    const from = hand.from, lay = layOf(this.circuit)
    const fromBoard = typeof from === 'object' && 'board' in from ? from : null
    const fromLoose = typeof from === 'object' && 'loose' in from ? from : null
    const stored = this.circuit
    // The circuit as it is while the part is in the air: its own place is free.
    const without = fromBoard ? removePart(stored, fromBoard.board) : stored
    // The nearest free pair of pads, if the part is over one.
    let best: [number, number] | null = null, bestD = lay.u * 0.6
    for (const [a, b] of socketsOf(stored)) {
      if (partAcross(without, a, b) >= 0) continue
      const p = padAt(stored, a), q = padAt(stored, b), d = Math.hypot((p.x + q.x) / 2 - at.x, (p.y + q.y) / 2 - at.y)
      if (d < bestD) { best = [a, b]; bestD = d }
    }
    const kind = hand.body.kind
    if (best) {
      const [a, b] = best
      if (fromBoard && ((fromBoard.a === a && fromBoard.b === b) || (fromBoard.a === b && fromBoard.b === a))) {
        // Let go over the place it came from: it is turned round.
        this.kickAt(`${Math.min(a, b)}-${Math.max(a, b)}`, 9)
        this.refreshAfter(() => this.apply((c) => turnPart(c, fromBoard.board), { what: kind, act: 'turn', part: hand.body }))
        return
      }
      // It keeps the way round it was held: its first end goes to the pad that lies that way.
      const p = padAt(stored, a), q = padAt(stored, b)
      const along = Math.cos(hand.angle) * (q.x - p.x) + Math.sin(hand.angle) * (q.y - p.y)
      const [first, second] = along >= 0 ? [a, b] : [b, a]
      const seated = { ...hand.body, a: first, b: second } as Part
      const did: Did = { what: kind, act: 'clip', part: hand.body }
      this.kickAt(`${Math.min(a, b)}-${Math.max(a, b)}`, 9)
      if (fromBoard) this.refreshAfter(() => this.apply((c) => placePart(removePart(c, fromBoard.board), seated), did))
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
    this.dirty = this.dirty ?? 'soon'
    this.spent = true
  }

  /** A touch on the customer at the bench: the gadget they hold out comes onto the mat, or the gadget on the mat is handed back. */
  private touchOwner(): void {
    this.spent = true
    if (this.stall.finished) {
      this.sounds.push({ voice: `voice-${this.stall.job.who}`, pitch: 1 })
      this.marks.push({ type: 'poke', who: 'owner' })
      return
    }
    if (!this.stall.job.open) {
      this.stall = openGadget(this.stall)
      this.refresh()
      this.resetLeads()
      this.sounds.push({ voice: 'lid-open', pitch: 1 })
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
    const beats = over.outcome === null ? laidBackScene(this.show, over.reaction.act) : handBackScene(this.show, over.reaction.act)
    this.scene = new Scene(over.neatWay ? followedBy(beats, neatWayScene(this.show)) : beats)
    this.scene.start(this.seconds, () => {})
    this.sounds.push({ voice: over.handed.lid === 'banded' ? 'lid-band' : 'lid-shut', pitch: 1 }, { voice: `voice-${this.stall.job.who}`, pitch: 1 })
  }

  /** A touch on the customer who waits: the one at the bench goes, the one who waits comes, and a new one steps up. */
  private next(): void {
    this.spent = true
    this.leaving = this.stall.job
    const leftShow = this.stall.finished
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
        const index = this.live.parts.findIndex((part) => part.kind === 'motor' && this.keyOf(part) === key)
        const held = index >= 0 ? braking(this.live, index, blade.push) : 1
        blade.turned += blade.push * 22 * dt
        blade.push *= Math.exp(-dt * (0.7 + held * 5))
        if (index < 0 || blade.push < 0.03) this.spun.delete(key)
      }
      this.reading = read(this.live, this.spin())
    }
    for (const [key, spring] of this.kick) {
      stepSpring(spring, 0, 160, 9, dt)
      if (Math.abs(spring.x) < 0.001 && Math.abs(spring.v) < 0.01) this.kick.delete(key)
    }
    for (const [lead, left] of this.hot) left - dt <= 0 ? this.hot.delete(lead) : this.hot.set(lead, left - dt)
    // What runs is heard for as long as it runs: struck again twice a second, and silent the moment it stops.
    if (this.open && (this.pulseIn -= dt) <= 0) {
      this.sounds.push(...pulses(this.live, this.reading))
      this.pulseIn = 0.5
    }
  }

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
    if (!this.open) return 0
    let wind = 0
    this.live.parts.forEach((part, i) => {
      const much = part.kind === 'motor' ? level(this.reading.parts[i]) : 0
      if (much > Math.abs(wind)) wind = this.reading.parts[i] > 0 ? much : -much
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
    return spin
  }

  /** How far a blade has been turned by hand, in radians, for the view: 0 for one that never was, or that has stopped. */
  turnedOf(part: Part): number {
    return this.spun.get(this.keyOf(part))?.turned ?? 0
  }

  /** Whether anything on the mat carries current. */
  get running(): boolean {
    return this.reading.parts.some((c) => Math.abs(c) >= RUNS_FROM)
  }

  /** Where a clip of the test lamp is now: in the hand, on what it bites, or at its own place. */
  probeAt(end: 0 | 1): P {
    if (this.hand?.holds === 'probe' && this.hand.end === end) return this.hand.at
    const bite = this.live.probe[end]
    return bite === null ? PROBE_HOME[end] : biteAt(this.live, bite)
  }
}
