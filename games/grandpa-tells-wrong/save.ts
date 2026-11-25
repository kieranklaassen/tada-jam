import { DAY_OF, FIRST_VISIT, LADDER } from './config'
import { finishCycle, firstPosition, isReadable, isRecord, STATE_VERSION, type GameState } from './state'
import { CAST, COATS, DAY, THINGS, YARD, morning, run, sameTale, type Event, type Neighbour, type World } from './tale'

// What is kept: the morning the day began from, what happened, what is told.
// How the yard looks is worked out from these and never stored.

export type Phase = 'day' | 'dusk' | 'told'
export type Save = GameState & {
  phase: Phase
  base: World
  day: Event[]
  told: Event[]
  /** His telling as it was laid out at dusk. */
  first: Event[]
  asks: Neighbour
}

/** How many things happen before dusk, on this save's day. */
export const dayLength = (save: Save): number => DAY_OF[save.position]

export function fresh(childAge: number | null): Save {
  return { v: STATE_VERSION, position: firstPosition(childAge, FIRST_VISIT), finished: false, phase: 'day', base: morning(), day: [], told: [], first: [], asks: 'pig' }
}

/** How the yard looks, from the one rule. */
export function worldOf(save: Save): World {
  return run(save.base, save.finished ? save.told : save.day)
}

function readEvents(raw: unknown): Event[] {
  if (!Array.isArray(raw)) return []
  const out: Event[] = []
  for (const one of raw.slice(0, DAY)) {
    if (!isRecord(one)) continue
    const who = CAST.find((c) => c === one.who), what = THINGS.find((c) => c === one.what)
    if (who && what) out.push({ who, what })
  }
  return out
}

function readWorld(raw: unknown): World {
  const world = morning()
  if (!isRecord(raw)) return world
  for (const who of CAST) {
    const one = raw[who]
    if (!isRecord(one)) continue
    world[who] = { coat: COATS.find((c) => c === one.coat) ?? 'bare', pants: one.pants === true, up: one.up === true }
  }
  return world
}

export function deserialize(raw: unknown, childAge: number | null): Save {
  const out = fresh(childAge)
  if (!isReadable(raw)) return out
  if (typeof raw.position === 'string' && LADDER.includes(raw.position)) out.position = raw.position
  out.base = readWorld(raw.base)
  out.day = readEvents(raw.day).filter((event) => (YARD as readonly string[]).includes(event.who))
  out.asks = YARD.find((c) => c === raw.asks) ?? out.asks
  out.told = readEvents(raw.told)
  out.first = readEvents(raw.first)
  const whole = out.day.length > 0 && out.told.length === out.day.length && out.first.length === out.day.length
  if (whole && (raw.phase === 'dusk' || raw.phase === 'told')) {
    out.phase = raw.phase
    out.finished = raw.finished === true && raw.phase === 'told'
    return out
  }
  // A day with no whole telling goes on as a day with room in it.
  out.phase = 'day'
  out.day = out.day.slice(0, dayLength(out) - 1)
  out.told = []
  out.first = []
  return out
}

export function serialize(save: Save): Save {
  return JSON.parse(JSON.stringify(save)) as Save
}

/** The lamp goes out: a story she touched moves his next one on. */
export function putOut(save: Save): Save {
  return finishCycle(save, sameTale(save.told, save.first) ? 'mixed' : 'well')
}

export function nextMorning(save: Save): Save {
  return { ...save, base: worldOf(save), day: [], told: [], first: [], phase: 'day', finished: false, asks: nextAsk(save.asks) }
}

export function nextAsk(asks: Neighbour): Neighbour {
  return YARD[(YARD.indexOf(asks) + 1) % YARD.length]
}
