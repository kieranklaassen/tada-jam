import { isPad, partAcross, turnPart, type Bite, type Body, type Circuit, type PartKind } from './circuit'
import { humBackPitch, ODD_CLIP, ODD_FLICK } from './grid'
import { type Consequence } from './settle'
import { level, read, RUNS_FROM, type Level, type Reading } from './solve'
import { type VoiceId } from './voices'

// What a change on the bench sounds like. Each act of the finger is named in
// the grid's terms, and the answer is the grid's voice for that thing and
// that act; whatever started, stopped or gave way adds its own. No drawing,
// no audio: voices by name, and how much higher or lower than written.

/** A voice to play, and how much higher or lower than written: 1 is as written. */
export type Sound = { voice: VoiceId; pitch: number }

/** What the finger did. */
export type Did =
  | { what: 'lead'; act: 'start'; at: Bite }
  /** `ran`: the part the lead now lies across carried current until this bite. */
  | { what: 'lead'; act: 'bite'; lead: number; from: Bite | null; to: Bite; ran?: boolean }
  | { what: 'lead'; act: 'down' }
  | { what: 'lead'; act: 'unclip' }
  | { what: 'lead'; act: 'wind' }
  | { what: 'lead'; act: 'turn' }
  | { what: PartKind; act: 'flick'; part: Body }
  | { what: PartKind; act: 'turn'; part: Body }
  /** `seat`: the two pads it was seated across, so that what it now carries can be read. */
  | { what: PartKind; act: 'clip'; part: Body; seat?: readonly [number, number] }
  | { what: PartKind; act: 'away' }
  | { what: PartKind; act: 'down' }

/** What the board is doing, in the few terms a sound depends on. */
export type Summary = { lamp: Level; motor: Level; buzzer: Level; running: number; cell: number; probe: Level }

export function summary(circuit: Circuit, reading: Reading): Summary {
  const s: Summary = { lamp: 0, motor: 0, buzzer: 0, running: 0, cell: 0, probe: level(reading.probe) }
  const take = (kind: PartKind, current: number) => {
    const much = level(current)
    if (kind === 'cell') s.cell += Math.abs(current)
    if (kind !== 'lamp' && kind !== 'motor' && kind !== 'buzzer') return
    if (much > 0) s.running++
    if (much > s[kind]) s[kind] = much
  }
  circuit.parts.forEach((part, i) => take(part.kind, reading.parts[i]))
  circuit.loose.forEach((part, i) => take(part.kind, reading.loose[i]))
  return s
}

/** A clip sounds by what it bites: lower on a cell's fat ends, higher on thin legs, as written on a bare pad. */
function pitchAt(circuit: Circuit, bite: Bite): number {
  if (!isPad(bite)) return 'loose' in bite ? 1.15 : 0.9
  for (const part of circuit.parts) {
    if (part.a !== bite && part.b !== bite) continue
    if (part.kind === 'cell') return part.b === bite ? 0.84 : 0.72
    return 1.22
  }
  return 1
}

/** Two cells push against each other: nothing runs, and turning one of them round would make something run. */
export function noseToNose(circuit: Circuit, reading: Reading): boolean {
  const cells = circuit.parts.flatMap((part, i) => (part.kind === 'cell' && !part.flat && !part.popped ? [i] : []))
  if (cells.length < 2 || summary(circuit, reading).running > 0) return false
  return cells.some((i) => {
    const turned = turnPart(circuit, i)
    return summary(turned, read(turned)).running > 0
  })
}

const count = (circuit: Circuit, kind: PartKind) => circuit.parts.filter((part) => part.kind === kind).length + circuit.loose.filter((part) => part.kind === kind).length
const sameBite = (x: Bite | null, y: Bite | null) => x !== null && y !== null && JSON.stringify(x) === JSON.stringify(y)

/**
 * The sounds of one change. `before` and `now` are the board before and
 * after it, `circuit` and `reading` the board after it.
 */
export function answerTo(did: Did | null, before: Summary, now: Summary, consequences: readonly Consequence[], circuit: Circuit, reading: Reading): Sound[] {
  const out: Sound[] = []
  const say = (voice: VoiceId, pitch = 1) => { if (!out.some((s) => s.voice === voice)) out.push({ voice, pitch }) }
  const popped = consequences.some((c) => c.type === 'pop')
  if (did?.what === 'lead') {
    // A clip that bites a bench odd, seated or lying loose, sounds as its material does.
    const odd = (bite: Bite | null) => (bite !== null && !isPad(bite) && 'loose' in bite && circuit.loose[bite.loose]?.kind === 'odd' ? (circuit.loose[bite.loose] as Extract<Body, { kind: 'odd' }>).what : null)
    if (did.act === 'start') { const what = odd(did.at); what ? say(ODD_CLIP[what].voice) : say('lead-clip', pitchAt(circuit, did.at)) }
    else if (did.act === 'unclip') say('lead-unclip')
    else if (did.act === 'wind') say('lead-wind')
    else if (did.act === 'down') say('lead-drop')
    else if (did.act === 'turn') say('lead-turn')
    else {
      const { from, to, lead } = did
      const spanned = isPad(from) && isPad(to) ? partAcross(circuit, from, to) : -1
      const twin = circuit.leads.some((l, i) => i !== lead && ((sameBite(l.a, from) && sameBite(l.b, to)) || (sameBite(l.a, to) && sameBite(l.b, from))))
      const joins = !isPad(to) || circuit.leads.some((l, i) => i !== lead && (sameBite(l.a, to) || sameBite(l.b, to)))
      const pitch = pitchAt(circuit, to)
      const material = odd(to)
      if (material) say(ODD_CLIP[material].voice)
      else if (sameBite(from, to)) say('lead-loop-of-nothing', pitch)
      else if (spanned >= 0 && !popped) {
        const part = circuit.parts[spanned]
        // A lamp tinks, a blade falls, a rasp hiccups only if it was doing something until this lead lay across it.
        const silent = part.kind === 'cell' || (part.kind !== 'odd' && part.kind !== 'switch' && did.ran === false)
        say(part.kind === 'odd' ? 'odd-across' : silent ? 'lead-clip' : `${part.kind}-across`, silent ? pitch : 1)
      } else if (twin) say('lead-across', pitch)
      else say(joins ? 'lead-second' : 'lead-clip', pitch)
    }
  } else if (did) {
    const kind = did.what
    if (did.act === 'away') say('part-away')
    else if (did.act === 'down') say('part-down')
    else if (did.act === 'turn') {
      say(`${kind}-turn`)
      // A bench odd is the same either way, and each clatters as its own material sounds.
      if (did.part.kind === 'odd') say(ODD_FLICK[did.part.what].voice)
      if (kind === 'cell' && noseToNose(circuit, reading)) say('cell-nose-to-nose')
    } else if (did.act === 'flick') {
      const part = did.part
      if (part.kind === 'cell') say(part.popped ? 'flag-reset' : part.flat ? 'cell-flat-flick' : 'cell-flick')
      else if (part.kind === 'lamp') say(part.blown ? 'lamp-blown-flick' : 'lamp-flick')
      else if (part.kind === 'odd') say(ODD_FLICK[part.what].voice)
      // A lever that changes nothing is one with a lead across it: it clicks to no effect.
      else if (part.kind === 'switch') say(Math.abs(before.cell - now.cell) < 0.02 * now.cell && before.running === now.running && now.running > 0 ? 'switch-across' : 'switch-flick')
      else say(`${part.kind}-flick`)
    } else {
      const part = did.part, second = count(circuit, kind) >= 2
      // What the part carries where it now sits. A part seated where nothing runs is only heard going down: no hum,
      // no ring, no whirr, no rasp. Each swap is a test, and its result is what is seen and heard.
      const seated = did.seat ? circuit.parts.findIndex((p) => (p.a === did.seat![0] && p.b === did.seat![1]) || (p.a === did.seat![1] && p.b === did.seat![0])) : -1
      const carries = seated < 0 || Math.abs(reading.parts[seated]) >= RUNS_FROM
      if (!carries && part.kind !== 'odd' && part.kind !== 'switch') say('part-down')
      else if (part.kind === 'odd') {
        say(ODD_CLIP[part.what].voice)
        // A second odd in the way: the hum cuts off; one that passes beside it: the hum comes back.
        if (second && before.running > 0 && now.running === 0) say('odd-second')
        else if (second && before.running === 0 && now.running > 0) say('odd-hum-back', humBackPitch(part.what))
      } else if (kind === 'motor' && second) {
        // In a row both are lazy and the whirr sinks to a low drone; side by side each keeps its pitch, and the whirr doubles.
        say('motor-second', now.motor <= 1 ? 0.6 : 1)
        if (now.motor >= 2) say('motor-clip')
      } else if (kind === 'cell' && second) {
        // Nose to tail the hum steps up; side by side nothing changes for the lamp, and the cell is only heard going in.
        say(now.cell > before.cell * 1.5 ? 'cell-second' : 'part-down')
      } else if (kind === 'buzzer' && second) {
        // Side by side both are at full rasp and throb; in a row both mutter.
        if (now.buzzer >= 2) say('buzzer-second')
        else say('buzzer-clip', 0.6)
      } else say(second ? `${kind}-second` : `${kind}-clip`)
      if (kind === 'cell' && noseToNose(circuit, reading)) say('cell-nose-to-nose')
    }
  }
  for (const c of consequences) say(c.type === 'pop' ? 'cell-across' : 'lamp-blow')
  // The hum starts in the frame the loop closes, whatever else starts with it: as high as the current that starts,
  // low through a pencil, full through a lead.
  if (before.running === 0 && now.running > 0) say('cell-clip', 0.6 + Math.min(1, now.cell) * 0.4)
  // What started, in its own voice, unless the act that started it has that voice already.
  // The test lamp is a lamp: its glass rings once as it lights, whatever it was clipped across.
  if ((before.lamp === 0 && now.lamp > 0) || (before.probe === 0 && now.probe > 0)) say('lamp-clip')
  if (before.motor === 0 && now.motor > 0) say('motor-clip')
  if (before.buzzer === 0 && now.buzzer > 0) say('buzzer-clip')
  if (before.motor < 3 && now.motor === 3) say('motor-wild')
  if (before.buzzer < 3 && now.buzzer === 3) say('buzzer-shriek')
  // A touch is heard as a few voices at most; the first is always what the finger did. Six lets a robot's lamp, arm
  // and buzzer all start with the hum.
  return out.slice(0, 6)
}

/** What is heard for as long as it runs, struck again twice a second: the hum of a live loop, a blade, a buzzer. */
export function pulses(circuit: Circuit, reading: Reading): Sound[] {
  const s = summary(circuit, reading), out: Sound[] = []
  if (s.cell >= RUNS_FROM && s.running > 0) out.push({ voice: 'hum', pitch: 0.8 + Math.min(3, s.cell) * 0.25 })
  // The test lamp lit across a cell, with nothing else running: the cell hums low for as long as it is lit.
  else if (s.probe > 0) out.push({ voice: 'hum', pitch: 0.7 })
  if (s.motor > 0) {
    // The fastest blade is the one that is heard: a whirr while it blows, breathy while it turns the other way and sucks.
    let fastest = 0, turning = 0, full = 0
    const hear = (kind: PartKind, current: number) => {
      if (kind !== 'motor' || level(current) === 0) return
      turning++
      if (level(current) >= 2) full++
      if (Math.abs(current) > Math.abs(fastest)) fastest = current
    }
    circuit.parts.forEach((part, i) => hear(part.kind, reading.parts[i]))
    circuit.loose.forEach((part, i) => hear(part.kind, reading.loose[i]))
    // Two in a row are both lazy, and the whirr is a low drone; two side by side each keep their pitch, so it is heard twice.
    const voice = fastest < 0 ? 'whirr-in' : 'whirr', pitch = turning >= 2 && s.motor === 1 ? 0.55 : 0.6 + s.motor * 0.3
    out.push({ voice, pitch })
    if (full >= 2) out.push({ voice, pitch: pitch * 1.012 })
  }
  if (s.buzzer > 0) {
    out.push({ voice: 'buzz', pitch: 0.7 + s.buzzer * 0.25 })
    // Two at full rasp are a hair apart in pitch, so they throb against each other for as long as both run.
    let full = 0
    const count = (kind: PartKind, current: number) => { if (kind === 'buzzer' && level(current) >= 2) full++ }
    circuit.parts.forEach((part, i) => count(part.kind, reading.parts[i]))
    circuit.loose.forEach((part, i) => count(part.kind, reading.loose[i]))
    if (full >= 2) out.push({ voice: 'buzz', pitch: (0.7 + s.buzzer * 0.25) * 1.035 })
  }
  return out
}
