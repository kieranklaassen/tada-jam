import { padDistance } from './board'
import { boardFor, isPad, type Circuit, type Loose, type Part } from './circuit'
import { cameWith, LOADS } from './gadgets'
import { settle } from './settle'
import { level, oddResistance, read, RUNS_FROM, type Level } from './solve'

// What a gadget does when its owner takes it and switches it on. Everything
// here is read off the solved circuit as the child left it: whether it runs,
// how bright, how fast and which way, how loud, whether it can be put out,
// how the lid sits. The characters react to these (tastes.ts) and the cycle
// is judged on `ran` alone (cycle.ts). None of it is ever shown as a number.

/** How the lid shuts over the mend. A neater mend is visibly neater: this is where it shows. */
export type Lid = 'flat' | 'bulging' | 'banded'

export type Handed = {
  /** Every lamp, motor and buzzer it came with runs again, motors the right way, and no flag pops. */
  ran: boolean
  /** A cell's flag popped in the owner's hands. */
  popped: boolean
  /** The brightest lamp. */
  light: Level
  /** How many lamps are lit. */
  lit: number
  /** The gadget has a lamp, and none is lit. */
  dark: boolean
  /** The fastest blade: positive blows, negative sucks. */
  wind: -3 | -2 | -1 | 0 | 1 | 2 | 3
  /** The loudest buzzer. */
  sound: Level
  /** How many buzzers rasp at once. */
  buzzing: number
  /** One switch, thrown up, puts everything out. */
  canPutOut: boolean
  lid: Lid
  /** A spoon, a key or the foil carries current in the mend. */
  shiny: boolean
}

/** The circuit as its owner tries it: every lever down, every flag set back, and the stall's test lamp left on the mat. */
export function switchedOn(circuit: Circuit): Circuit {
  return {
    ...circuit,
    probe: [null, null],
    parts: circuit.parts.map((part): Part => (part.kind === 'switch' ? { ...part, down: true } : part.kind === 'cell' ? { ...part, popped: false } : part)),
    loose: circuit.loose.map((part): Loose => (part.kind === 'switch' ? { ...part, down: true } : part.kind === 'cell' ? { ...part, popped: false } : part)),
  }
}

/** How the lid sits, from the leads alone: how many, how long, how many loose ends. A gadget leaves its maker with one short lead. */
export function lidOf(circuit: Circuit): Lid {
  const board = boardFor(circuit)
  // A lead that lies wholly loose on the mat is not in the gadget, and stays on the mat.
  const inside = circuit.leads.filter((lead) => lead.a !== null)
  const loose = inside.filter((lead) => lead.b === null).length
  // A lead between two pads is as long as the pads are apart. One that hangs loose, or goes off the board to a part on the mat or to another lead, is reckoned long.
  const length = inside.reduce((sum, lead) => sum + (lead.b === null ? 1.5 : isPad(lead.a) && isPad(lead.b) ? padDistance(board, lead.a, lead.b) : 2.5), 0)
  // A part that hangs outside the case by its leads never lets the lid shut.
  const hangs = inside.some((lead) => [lead.a, lead.b].some((bite) => bite !== null && !isPad(bite) && 'loose' in bite))
  if (hangs || loose >= 2 || inside.length >= 6 || length > 14) return 'banded'
  if (loose === 0 && inside.length <= 2 && length <= 3) return 'flat'
  return 'bulging'
}

export function handBack(circuit: Circuit): Handed {
  const settled = settle(switchedOn(circuit))
  const { parts } = settled.circuit, currents = settled.reading.parts
  // A part that hangs outside the case by its leads goes home with the gadget, and does what it does there too.
  const hanging = settled.circuit.loose.map((part, i) => ({ part, current: settled.reading.loose[i] }))
  const popped = settled.consequences.some((c) => c.type === 'pop')
  const running = { lamp: 0, motor: 0, buzzer: 0 }
  let light: Level = 0, sound: Level = 0, wind = 0, lamps = 0
  const all = [...parts.map((part, i) => ({ part, current: currents[i] })), ...hanging]
  all.forEach(({ part, current }) => {
    const much = level(current)
    if (part.kind === 'lamp') {
      lamps++
      if (much > 0) running.lamp++
      if (much > light) light = much
    } else if (part.kind === 'buzzer') {
      if (much > 0) running.buzzer++
      if (much > sound) sound = much
    } else if (part.kind === 'motor') {
      // A motor counts as running only when it turns forward: a fan that sucks is not mended.
      if (much > 0 && current > 0) running.motor++
      if (much > Math.abs(wind)) wind = current > 0 ? much : -much
    }
  })
  const came = cameWith(circuit.gadget)
  const ran = !popped && LOADS.every((load) => running[load] >= came[load])
  // One switch that puts everything out: with it up and the rest down, nothing runs.
  const canPutOut = ran && parts.some((part, s) => {
    if (part.kind !== 'switch') return false
    const off = read({ ...settled.circuit, parts: parts.map((p, i): Part => (i === s && p.kind === 'switch' ? { ...p, down: false } : p)) })
    return parts.every((p, i) => !(p.kind === 'lamp' || p.kind === 'motor' || p.kind === 'buzzer') || Math.abs(off.parts[i]) < RUNS_FROM)
  })
  // Seated on the board or hanging in the loop by its leads, it is in the mend either way.
  const shiny = all.some(({ part, current }) => part.kind === 'odd' && part.what !== 'pencil' && oddResistance(part.what) !== null && Math.abs(current) >= RUNS_FROM)
  return { ran, popped, light, lit: running.lamp, dark: lamps > 0 && light === 0, wind: wind as Handed['wind'], sound, buzzing: running.buzzer, canPutOut, lid: lidOf(circuit), shiny }
}
