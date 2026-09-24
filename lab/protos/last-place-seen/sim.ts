// Last Place Seen. Six hollow logs in a ring, one treasure hidden in one of
// them, one flagged log (home). The child shifts the treasure log to log, and
// pockets it at the flag. Two guards each act on where they LAST SAW the
// treasure, never on where it is, and each rechecks by a fixed habit:
//
//   goose  eyes on its post: stares at the log it believes, glances one log
//          clockwise, and every second cycle leans in to peek. An empty log
//          makes it lose its belief and search the ring clockwise, one log at
//          a time. It learns only by seeing (a watched shift, a peek).
//   hound  nose down when it walks. At its post it stares, then looks away for
//          a pause; at the end of the pause it sniffs out any move it did not
//          watch and walks to the truth.
//
// A shift or pocket is WATCHED by a guard whose gaze is on the source or the
// destination log at that instant. Pure and deterministic: a seeded rng picks
// the layout, everything else counts ticks.

import { createRng, int } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const N_LOGS = 6
const LOG_W = 170
const LOG_H = 96
const CENTRE = { x: 590, y: 380 }
// Logs clockwise from the top of an ellipse. Rect x and y are the top-left corner.
export const LOGS: readonly Rect[] = Array.from({ length: N_LOGS }, (_, i) => {
  const a = ((-90 + 60 * i) * Math.PI) / 180
  return {
    x: Math.round(CENTRE.x + 400 * Math.cos(a) - LOG_W / 2),
    y: Math.round(CENTRE.y + 250 * Math.sin(a) - LOG_H / 2),
    w: LOG_W,
    h: LOG_H,
  }
})

// The habits, in ticks (30 to a second) and pixels per tick.
export const STARE = 90
export const GLANCE = 36
export const LEAN = 24
export const ALERT = 72
export const AWAY = 42
const GOOSE_SPEED = 5
const HOUND_SPEED = 8
const HIT_SLOP = 30
const TAP_MOVE = 24
const HINT_AFTER_TICKS = 240
const MAX_EVENTS = 64

type Kind = 'goose' | 'hound'
type Mode = 'walk' | 'post' | 'lean'

interface Guard {
  kind: Kind
  x: number
  y: number
  mode: Mode
  // The log it thinks holds the treasure; -1 once the goose has lost it.
  belief: number
  // The log it is walking to or leaning at; -1 when standing at a post.
  target: number
  // The log whose post it stands at (or last reached).
  post: number
  // Ticks in the current mode.
  t: number
  // Goose: completed stare-and-glance cycles at this post.
  cycles: number
  // Hound: a shift happened that it did not watch.
  unseenMove: boolean
}

interface Press {
  log: number
  sx: number
  sy: number
  x: number
  y: number
  wasSelected: boolean
}

export interface LastPlaceSnapshot {
  tick: number
  logs: Rect[]
  home: number
  treasure: number
  selected: boolean
  drag: { x: number; y: number } | null
  guards: Array<{ kind: Kind; x: number; y: number; mode: Mode; belief: number; target: number; gaze: number }>
  hauls: number
  caught: number
  spotted: number
  // The latest thing that happened, for the view to flash briefly.
  note: string
  noteAge: number
  // Where the idle hint points, or null. Only ever set when config.hints is on.
  hint: { log: number } | null
}

const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
const logCentre = (log: number) => ({ x: LOGS[log]!.x + LOGS[log]!.w / 2, y: LOGS[log]!.y + LOGS[log]!.h / 2 })

// Where a guard stands to watch a log: between the log and the middle of the ring.
function postOf(log: number, kind: Kind): { x: number; y: number } {
  const c = logCentre(log)
  return { x: c.x + (CENTRE.x - c.x) * 0.38 + (kind === 'goose' ? -55 : 55), y: c.y + (CENTRE.y - c.y) * 0.38 }
}

// A different log from every excluded one, chosen by the seeded rng.
function pickLog(rng: Rng, exclude: readonly number[]): number {
  const options = LOGS.map((_, i) => i).filter((i) => !exclude.includes(i))
  return options[int(rng, 0, options.length - 1)]!
}

export const createSim: CreateSim<LastPlaceSnapshot> = (config): Sim<LastPlaceSnapshot> => {
  const rng = createRng(config.seed)

  let home = int(rng, 0, N_LOGS - 1)
  let treasure = pickLog(rng, [home])
  let selected = false
  let drag: { x: number; y: number } | null = null
  let tick = 0
  let idleTicks = 0
  let hauls = 0
  let caught = 0
  let spotted = 0
  let shifts = 0
  let note = ''
  let noteTick = 0
  let pending: SimEvent[] = []
  const presses = new Map<number, Press>()
  // How soon after arriving the goose makes its first peek: a habit with a phase.
  const peekPhase = int(rng, 0, 1)

  const makeGuard = (kind: Kind): Guard => {
    const post = int(rng, 0, N_LOGS - 1)
    const at = postOf(post, kind)
    return { kind, x: at.x, y: at.y, mode: 'walk', belief: treasure, target: treasure, post, t: 0, cycles: peekPhase, unseenMove: false }
  }
  const goose = makeGuard('goose')
  const hound = makeGuard('hound')
  const guards = [goose, hound]

  const emit = (name: string, text = '') => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push({ kind: 'state', name })
    if (text) {
      note = text
      noteTick = tick
    }
  }

  // What a guard is looking at right now, or -1. Derived from its state alone.
  const gazeOf = (g: Guard): number => {
    if (g.kind === 'goose') {
      if (g.mode === 'post') return g.t < STARE ? g.belief : (g.belief + 1) % N_LOGS
      return g.target
    }
    if (g.mode === 'post') return g.t < ALERT ? g.belief : -1
    return -1
  }

  const sendTo = (g: Guard, log: number) => {
    g.mode = 'walk'
    g.target = log
    g.t = 0
  }

  // A guard learns the treasure is at `log` and goes there (or stays, if it is already there).
  const learn = (g: Guard, log: number) => {
    g.belief = log
    g.unseenMove = false
    if (g.mode === 'post' && g.post === log) return
    sendTo(g, log)
  }

  const arrive = (g: Guard) => {
    g.post = g.target
    g.t = 0
    if (g.kind === 'goose' && g.belief === -1) {
      g.mode = 'lean'
      return
    }
    g.mode = 'post'
    g.target = -1
    g.cycles = peekPhase
  }

  // Both guards watch a new hiding.
  const hide = (exclude: readonly number[]) => {
    treasure = pickLog(rng, exclude)
    selected = false
    drag = null
    for (const g of guards) learn(g, treasure)
  }

  const shift = (dest: number) => {
    const src = treasure
    treasure = dest
    selected = false
    drag = null
    shifts++
    let watched = false
    for (const g of guards) {
      const gaze = gazeOf(g)
      if (gaze === src || gaze === dest) {
        watched = true
        emit(`spotted-${g.kind}`)
        learn(g, dest)
      } else if (g.kind === 'hound') g.unseenMove = true
    }
    if (watched) {
      spotted++
      emit('shift-seen', 'seen!')
    } else emit('shift-unseen', 'unseen')
  }

  const pocket = () => {
    selected = false
    if (guards.some((g) => gazeOf(g) === home)) {
      caught++
      emit('caught', 'caught: back it goes')
      hide([home])
      return
    }
    hauls++
    emit('haul', 'got it!')
    const oldHome = home
    hide([oldHome])
    home = pickLog(rng, [oldHome, treasure])
  }

  const hit = (x: number, y: number): number => {
    let best = -1
    let bestDistance = Infinity
    LOGS.forEach((log, i) => {
      const grown = { x: log.x - HIT_SLOP, y: log.y - HIT_SLOP, w: log.w + 2 * HIT_SLOP, h: log.h + 2 * HIT_SLOP }
      if (!inside(grown, x, y)) return
      const c = logCentre(i)
      const d = Math.hypot(x - c.x, y - c.y)
      if (d < bestDistance) {
        best = i
        bestDistance = d
      }
    })
    return best
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (phase === 'down') {
      if (!finite) return
      presses.delete(id)
      const log = hit(x, y)
      presses.set(id, { log, sx: x, sy: y, x, y, wasSelected: selected })
      if (log < 0) return
      if (selected && log !== treasure) shift(log)
      else if (log === treasure) {
        if (treasure === home) pocket()
        else if (!selected) {
          selected = true
          emit('lift')
        }
      }
      return
    }
    const p = presses.get(id)
    if (!p) return
    if (phase === 'move') {
      if (!finite) return
      p.x = x
      p.y = y
      if (p.log === treasure && selected && Math.hypot(x - p.sx, y - p.sy) > TAP_MOVE) drag = { x, y }
      return
    }
    presses.delete(id)
    drag = null
    if (p.log !== treasure || !selected) return
    const ux = finite ? x : p.x
    const uy = finite ? y : p.y
    if (Math.hypot(ux - p.sx, uy - p.sy) > TAP_MOVE) {
      const over = hit(ux, uy)
      if (over >= 0 && over !== treasure) shift(over)
    } else if (p.wasSelected) selected = false
  }

  const walk = (g: Guard, speed: number): boolean => {
    const to = postOf(g.target, g.kind)
    const d = Math.hypot(to.x - g.x, to.y - g.y)
    if (d <= speed) {
      g.x = to.x
      g.y = to.y
      return true
    }
    g.x += ((to.x - g.x) / d) * speed
    g.y += ((to.y - g.y) / d) * speed
    return false
  }

  const stepGoose = (g: Guard) => {
    if (g.mode === 'walk') {
      if (walk(g, GOOSE_SPEED)) arrive(g)
    } else if (g.mode === 'post') {
      g.t++
      if (g.t >= STARE + GLANCE) {
        g.t = 0
        g.cycles++
        if (g.cycles % 2 === 0) {
          g.mode = 'lean'
          g.target = g.belief
        }
      }
    } else if (++g.t >= LEAN) {
      // The peek or search step is over: did it see the treasure in this log?
      const looked = g.target
      if (treasure === looked) {
        g.belief = looked
        arrive(g)
      } else {
        if (g.belief !== -1) emit('goose-lost')
        g.belief = -1
        sendTo(g, (looked + 1) % N_LOGS)
      }
    }
  }

  const stepHound = (g: Guard) => {
    if (g.mode === 'walk') {
      if (walk(g, HOUND_SPEED)) arrive(g)
    } else if (++g.t >= ALERT + AWAY) {
      // The pause is over: sniff out any move it did not watch.
      g.t = 0
      if (g.unseenMove) {
        g.unseenMove = false
        g.belief = treasure
        emit('hound-sniffed')
        if (g.post !== g.belief) sendTo(g, g.belief)
      }
    }
  }

  const step = () => {
    tick++
    idleTicks++
    stepGoose(goose)
    stepHound(hound)
  }

  const affordances = (): Affordance[] =>
    LOGS.map((log, i) => ({
      ...log,
      kind: 'tap' as const,
      salience: i === treasure ? 0.9 : selected ? (i === home ? 0.7 : 0.5) : i === home ? 0.35 : 0.2,
    }))

  const observe = (): Observation => {
    const events = pending
    pending = []
    const where = selected ? 'hand' : treasure === home ? 'home' : 'away'
    const gooseState = goose.belief === treasure ? 'true' : goose.belief === -1 ? 'search' : 'false'
    const houndState = hound.belief === treasure ? 'true' : 'false'
    return {
      signature: `${where}/goose-${gooseState}/hound-${houndState}${hauls > 0 ? '/lifted' : ''}`,
      features: { hauls, caught, spotted, shifts, fooled: guards.filter((g) => g.belief !== treasure).length },
      events,
    }
  }

  // The hint is only data for the view; it never changes what the sim does.
  const snapshot = (): LastPlaceSnapshot => ({
    tick,
    logs: LOGS.map((l) => ({ ...l })),
    home,
    treasure,
    selected,
    drag: drag ? { ...drag } : null,
    guards: guards.map((g) => ({ kind: g.kind, x: g.x, y: g.y, mode: g.mode, belief: g.belief, target: g.target, gaze: gazeOf(g) })),
    hauls,
    caught,
    spotted,
    note,
    noteAge: tick - noteTick,
    hint: config.hints && idleTicks >= HINT_AFTER_TICKS ? { log: selected ? home : treasure } : null,
  })

  return { step, pointer, affordances, observe, snapshot }
}
