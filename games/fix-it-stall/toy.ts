import { boardFor, clipLeadEnd, flickPart, removeLead, startLead, type Circuit } from './circuit'
import { change } from './cycle'
import { asBuilt } from './gadgets'
import { LEAD_SPRING, stepSpring, type Spring } from './motion'
import { type Stall } from './save'
import { level, read, RUNS_FROM, type Reading } from './solve'
import { hitTest, leadCurve, leadEnds, looseEnd, onCurve, padAt, REACH, restBend, TOY, type P } from './stage'
import { type VoiceId } from './voices'

// The toy: one cell, one lamp, a coil of leads, and a finger. No goal.
//
// This is what a touch does, with no drawing and no sound in it: it changes
// the circuit, lets the world answer, and leaves a list of sounds to play and
// marks for the view to show. Every answer starts in the press, never in the
// lift: a clip bites the pad the finger lands on in that call.
//
// The circuit lives in the stall's `job`, in the stall's own save shape, so
// what the toy keeps is found as left by the same reader the game will use.

/** A voice to play, and how much higher or lower than written: 1 is as written. */
export type Sound = { voice: VoiceId; pitch: number }

/** Something that just happened, for the view to show and the folk to react to. */
export type Mark =
  | { type: 'bite'; at: P }
  | { type: 'pop'; part: number }
  | { type: 'hop'; part: number }
  | { type: 'lit' }
  | { type: 'out' }
  | { type: 'pat'; at: P }

/** The stall as the toy starts it: the toy's bare board on the mat, open, with nothing on it but its cell and its lamp. */
export function withToy(stall: Stall): Stall {
  if (stall.job.circuit.gadget === 'toy' && stall.job.open && !stall.finished && stall.onMat === 'job') return stall
  return { ...stall, finished: false, onMat: 'job', job: { who: 'moth', idea: stall.job.idea, circuit: asBuilt('toy'), ticket: null, open: true, missed: false } }
}

/** A clip sounds by what it bites: lower on the cell's fat ends, higher on a lamp's thin legs. */
function pitchAt(circuit: Circuit, pad: number): number {
  for (const part of circuit.parts) {
    if (part.a !== pad && part.b !== pad) continue
    if (part.kind === 'cell') return part.b === pad ? 0.84 : 0.72
    return 1.22
  }
  return 1
}

const nearestPad = (circuit: Circuit, at: P): number => {
  let best = -1, bestD: number = REACH.pad * 1.25
  boardFor(circuit).pads.forEach((_, i) => {
    const p = padAt(circuit, i), d = Math.hypot(at.x - p.x, at.y - p.y)
    if (d <= bestD) { best = i; bestD = d }
  })
  return best
}
const onCoil = (at: P) => Math.hypot(at.x - TOY.coil.x, at.y - TOY.coil.y) <= TOY.coil.r * 1.15

export class Toy {
  reading: Reading
  /** What the finger holds: the loose end of a lead on the board, or a lead fresh from the coil that bites nothing yet. */
  hand: { lead: number | 'coil'; at: P; startedOn: number | null } | null = null
  /** A lead whose first clip was tapped on, waiting for the tap that says where its second goes. */
  armed: number | null = null
  /** How far each lead is from its rest bow, as a spring: it swings, overshoots and settles. */
  sway: Spring[] = []
  /** Where each loose clip is on its way to where it lies, or null when it lies there. */
  tips: ({ x: Spring; y: Spring } | null)[] = []
  /** A hop of the cell or a quiver of the lamp, one spring a part. */
  kick: Spring[] = []
  /** Leads that carried a short, and how long they still glow. */
  hot = new Map<number, number>()
  sounds: Sound[] = []
  marks: Mark[] = []
  /** Set when the stall has changed and should be handed to storage. */
  dirty = false
  private humIn = 0
  /** This press was used up by the answer it got; its lift does nothing more. */
  private spent = false

  constructor(public stall: Stall) {
    this.stall = withToy(stall)
    this.reading = read(this.circuit)
    this.sway = this.circuit.leads.map(() => ({ x: 0, v: 0 }))
    this.tips = this.circuit.leads.map(() => null)
    this.kick = this.circuit.parts.map(() => ({ x: 0, v: 0 }))
  }

  get circuit(): Circuit {
    return this.stall.job.circuit
  }

  /** How far each lead bows now. */
  bends(): number[] {
    return this.circuit.leads.map((_, i) => restBend(...leadEnds(this.circuit, i), i) + this.sway[i].x)
  }

  /** Where the second end of a lead is now: in the hand, on its way down, on its pad or lying on the mat. */
  endOf(lead: number): P {
    if (this.hand?.lead === lead) return this.hand.at
    const l = this.circuit.leads[lead]
    if (l.b !== null) return padAt(this.circuit, l.b)
    const tip = this.tips[lead]
    return tip ? { x: tip.x.x, y: tip.y.x } : looseEnd(this.circuit, lead)
  }

  private lampLevel(): number {
    return Math.max(0, ...this.circuit.parts.map((part, i) => (part.kind === 'lamp' ? level(this.reading.parts[i]) : 0)))
  }

  /** Change the circuit and let the world answer: flags pop, the lamp lights or goes out, and each says so. */
  private apply(act: (circuit: Circuit) => Circuit): void {
    const before = this.lampLevel()
    const changed = change(this.stall, act)
    if (changed.stall === this.stall) return
    this.stall = changed.stall
    this.reading = read(this.circuit)
    this.dirty = true
    for (const c of changed.consequences) {
      if (c.type !== 'pop') continue
      this.sounds.push({ voice: 'cell-across', pitch: 1 })
      this.marks.push({ type: 'pop', part: c.part })
      for (const lead of c.hot.leads) this.hot.set(lead, 1.4)
      this.kick[c.part].v += 9
    }
    const after = this.lampLevel()
    if (before === 0 && after > 0) {
      this.sounds.push({ voice: 'lamp-clip', pitch: 1 }, { voice: 'cell-clip', pitch: 1 })
      this.marks.push({ type: 'lit' })
      this.humIn = 0.5
    } else if (before > 0 && after === 0) this.marks.push({ type: 'out' })
  }

  /** The second clip of a lead bites `pad`. What it sounds like says what it made. */
  private bite(lead: number, pad: number): void {
    const a = this.circuit.leads[lead].a
    const twin = this.circuit.leads.some((l, i) => i !== lead && l.b !== null && ((l.a === a && l.b === pad) || (l.a === pad && l.b === a)))
    const joins = this.circuit.leads.some((l, i) => i !== lead && (l.a === pad || l.b === pad))
    const voice: VoiceId = a === pad ? 'lead-loop-of-nothing' : twin ? 'lead-across' : joins ? 'lead-second' : 'lead-clip'
    this.sounds.push({ voice, pitch: pitchAt(this.circuit, pad) })
    this.marks.push({ type: 'bite', at: padAt(this.circuit, pad) })
    this.tips[lead] = null
    this.sway[lead].v += a === pad ? 420 : 260
    this.apply((c) => clipLeadEnd(c, lead, pad))
  }

  private drop(lead: number, from: P): void {
    // It falls limp from where the finger let go to where it lies, and its free clip snaps once.
    const rest = looseEnd(this.circuit, lead)
    this.tips[lead] = { x: { x: from.x, v: 0 }, y: { x: from.y, v: 0 } }
    this.sway[lead].v += Math.hypot(from.x - rest.x, from.y - rest.y) > 20 ? 220 : 60
    this.sounds.push({ voice: 'lead-drop', pitch: 1 })
  }

  private forget(lead: number): void {
    this.sway.splice(lead, 1)
    this.tips.splice(lead, 1)
    const hot = new Map<number, number>()
    for (const [i, left] of this.hot) if (i !== lead) hot.set(i > lead ? i - 1 : i, left)
    this.hot = hot
    if (this.armed !== null) this.armed = this.armed === lead ? null : this.armed > lead ? this.armed - 1 : this.armed
  }

  /** The finger lands. Whatever it lands on answers here and now. */
  press(at: P): void {
    this.spent = false
    if (this.hand) this.lift(this.hand.at, 'end')
    if (this.armed !== null) {
      const lead = this.armed, pad = nearestPad(this.circuit, at)
      this.armed = null
      if (pad >= 0) {
        this.bite(lead, pad)
        this.spent = true
        return
      }
      this.drop(lead, this.endOf(lead))
    }
    const hit = hitTest(this.circuit, at, this.bends())
    switch (hit.on) {
      case 'pad': {
        // A clip bites the pad in this frame, and a lead comes out behind the finger.
        const started = startLead(this.circuit, hit.pad)
        if (started.lead < 0) return this.pat(at)
        this.sway.push({ x: 0, v: 180 })
        this.tips.push(null)
        this.apply(() => started.circuit)
        this.sounds.push({ voice: 'lead-clip', pitch: pitchAt(this.circuit, hit.pad) })
        this.marks.push({ type: 'bite', at: padAt(this.circuit, hit.pad) })
        this.hand = { lead: started.lead, at, startedOn: hit.pad }
        return
      }
      case 'boot': {
        // The clip comes off. The loop it closed stops at once, everywhere.
        const lead = this.circuit.leads[hit.lead]
        this.sounds.push({ voice: 'lead-unclip', pitch: 1 })
        if (lead.b === null) {
          // Its only clip: the whole lead is in the hand now, biting nothing.
          this.forget(hit.lead)
          this.apply((c) => removeLead(c, hit.lead))
          this.hand = { lead: 'coil', at, startedOn: null }
          return
        }
        const stays = hit.end === 0 ? lead.b : lead.a
        this.apply((c) => ({ ...c, leads: c.leads.map((l, i) => (i === hit.lead ? { a: stays, b: null } : l)) }))
        this.sway[hit.lead].v -= 200
        this.hand = { lead: hit.lead, at, startedOn: null }
        return
      }
      case 'clip':
        this.sounds.push({ voice: 'lead-pick', pitch: 1 })
        this.tips[hit.lead] = null
        this.hand = { lead: hit.lead, at, startedOn: null }
        return
      case 'coil':
        this.sounds.push({ voice: 'coil-pull', pitch: 1 })
        this.hand = { lead: 'coil', at, startedOn: null }
        return
      case 'part': {
        const part = this.circuit.parts[hit.part]
        this.kick[hit.part].v += 11
        this.marks.push({ type: 'hop', part: hit.part })
        if (part.kind === 'cell' && part.popped) {
          this.sounds.push({ voice: 'flag-reset', pitch: 1 })
          this.apply((c) => flickPart(c, hit.part))
        } else if (part.kind === 'cell') this.sounds.push({ voice: part.flat ? 'cell-flat-flick' : 'cell-flick', pitch: 1 })
        else if (part.kind === 'lamp') this.sounds.push({ voice: part.blown ? 'lamp-blown-flick' : 'lamp-flick', pitch: 1 })
        this.spent = true
        return
      }
      case 'wire': {
        // A slack string: lower the longer it is.
        const [p, q] = leadEnds(this.circuit, hit.lead), span = Math.hypot(q.x - p.x, q.y - p.y)
        this.sway[hit.lead].v += (this.sway[hit.lead].x >= 0 ? -1 : 1) * 520
        this.sounds.push({ voice: 'lead-flick', pitch: Math.max(0.6, Math.min(1.6, 1.7 - span / 420)) })
        this.spent = true
        return
      }
      case 'mat':
        return this.pat(at)
    }
  }

  private pat(at: P): void {
    this.sounds.push({ voice: 'mat-pat', pitch: 1 })
    this.marks.push({ type: 'pat', at })
    this.spent = true
  }

  /** The finger moves with something in it. */
  move(at: P): void {
    if (this.hand) this.hand.at = at
  }

  /**
   * The finger lifts. `tap`: it never moved. `lift`: it let go in the middle
   * of a drag and may come back. `end`: the touch is over.
   */
  lift(at: P, how: 'tap' | 'lift' | 'end'): void {
    const hand = this.hand
    if (!hand || this.spent) {
      if (how !== 'lift') this.spent = false
      return
    }
    hand.at = at
    const pad = nearestPad(this.circuit, at)
    if (hand.lead === 'coil') {
      if (pad >= 0) {
        // A lead from the coil bites its first pad, and its other end lies loose.
        const started = startLead(this.circuit, pad)
        this.hand = null
        if (started.lead < 0) return void this.sounds.push({ voice: 'lead-wind', pitch: 1 })
        this.sway.push({ x: 0, v: 180 })
        this.tips.push({ x: { x: TOY.coil.x, v: 0 }, y: { x: TOY.coil.y, v: 0 } })
        this.apply(() => started.circuit)
        this.sounds.push({ voice: 'lead-clip', pitch: pitchAt(this.circuit, pad) })
        this.marks.push({ type: 'bite', at: padAt(this.circuit, pad) })
      } else if (how !== 'lift') {
        this.hand = null
        this.sounds.push({ voice: 'lead-wind', pitch: 1 })
      }
      return
    }
    const lead = hand.lead
    if (how === 'tap' && hand.startedOn !== null) {
      // A tap on a pad: the first clip is on, and the lead waits for the tap that says where the second goes.
      this.hand = null
      this.armed = lead
      this.tips[lead] = null
      return
    }
    if (pad >= 0) {
      this.hand = null
      this.bite(lead, pad)
    } else if (onCoil(at) && how !== 'lift') {
      // Dropped on the coil, a lead winds itself up.
      this.hand = null
      this.forget(lead)
      this.apply((c) => removeLead(c, lead))
      this.sounds.push({ voice: 'lead-wind', pitch: 1 })
    } else if (how !== 'lift') {
      this.hand = null
      this.drop(lead, at)
    }
  }

  /** Game time moves on by `dt` seconds: leads swing, clips fall, a short cools, the hum is struck again. */
  step(dt: number): void {
    this.circuit.leads.forEach((_, i) => {
      stepSpring(this.sway[i], 0, LEAD_SPRING.stiffness, LEAD_SPRING.damping, dt)
      const tip = this.tips[i]
      if (!tip || this.hand?.lead === i) return
      const rest = looseEnd(this.circuit, i)
      stepSpring(tip.x, rest.x, 70, 11, dt)
      stepSpring(tip.y, rest.y, 70, 11, dt)
      if (Math.hypot(tip.x.x - rest.x, tip.y.x - rest.y) < 0.5 && Math.hypot(tip.x.v, tip.y.v) < 2) this.tips[i] = null
    })
    for (const k of this.kick) stepSpring(k, 0, 160, 9, dt)
    for (const [lead, left] of this.hot) left - dt <= 0 ? this.hot.delete(lead) : this.hot.set(lead, left - dt)
    const lamp = this.circuit.parts.findIndex((p) => p.kind === 'lamp')
    const current = lamp >= 0 ? Math.abs(this.reading.parts[lamp]) : 0
    if (current >= RUNS_FROM && (this.humIn -= dt) <= 0) {
      // Higher for more current, and struck again while the loop runs.
      this.sounds.push({ voice: 'hum', pitch: 0.8 + current * 0.25 })
      this.humIn = 0.5
    }
  }

  /** Where a lit lamp is, for the moth: or null while none is lit. */
  litLamp(): P | null {
    const lamp = this.circuit.parts.findIndex((p, i) => p.kind === 'lamp' && level(this.reading.parts[i]) > 0)
    if (lamp < 0) return null
    const p = padAt(this.circuit, this.circuit.parts[lamp].a), q = padAt(this.circuit, this.circuit.parts[lamp].b)
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  }
}

/**
 * What an idle child is shown: the things that can be touched now, and one
 * move the hand could make. Never a way to light the lamp from start to end:
 * one clip, one place it could go.
 */
export function suggest(toy: Toy): { glow: P[]; from: P; to: P; drag: boolean } {
  const c = toy.circuit
  const cell = c.parts.findIndex((p) => p.kind === 'cell')
  const popped = cell >= 0 && (c.parts[cell] as { popped?: boolean }).popped === true
  const mid = (part: number) => {
    const p = padAt(c, c.parts[part].a), q = padAt(c, c.parts[part].b)
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  }
  if (popped) return { glow: [mid(cell)], from: mid(cell), to: mid(cell), drag: false }
  const loose = c.leads.findIndex((l) => l.b === null)
  const used = new Set(c.leads.flatMap((l) => (l.b === null ? [l.a] : [l.a, l.b])))
  const free = boardFor(c).pads.map((_, i) => i).filter((i) => !used.has(i))
  if (loose >= 0 && free.length > 0) {
    // A loose clip, and the nearest pad nothing bites yet.
    const from = looseEnd(c, loose)
    const to = free.map((i) => padAt(c, i)).sort((p, q) => Math.hypot(p.x - from.x, p.y - from.y) - Math.hypot(q.x - from.x, q.y - from.y))[0]
    return { glow: [from, to], from, to, drag: true }
  }
  if (toy.litLamp() === null && free.length >= 2) {
    // Two pads nothing bites: from the first of them to the nearest that belongs to another part, a lamp's leg before a post.
    const start = free[0]
    const own = c.parts.find((part) => part.a === start || part.b === start)
    const others = free.filter((i) => i !== start && !(own && (own.a === i || own.b === i)))
    const legs = others.filter((i) => c.parts.some((part) => part.kind === 'lamp' && (part.a === i || part.b === i)))
    const from = padAt(c, start)
    const to = (legs.length > 0 ? legs : others.length > 0 ? others : free.filter((i) => i !== start)).map((i) => padAt(c, i)).sort((p, q) => Math.hypot(p.x - from.x, p.y - from.y) - Math.hypot(q.x - from.x, q.y - from.y))[0]
    return { glow: free.map((i) => padAt(c, i)), from, to, drag: true }
  }
  // Everything is clipped: a lead can be flicked, where it stands.
  const at = c.leads.length > 0 ? onCurve(leadCurve(...leadEnds(c, 0), toy.bends()[0]), 0.5) : { x: TOY.coil.x, y: TOY.coil.y }
  return { glow: [at], from: at, to: at, drag: false }
}
