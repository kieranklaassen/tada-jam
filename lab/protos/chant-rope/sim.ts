// The Chant Rope sim. Two turners keep one chant, slow, slow, quick, quick. A
// swing sweeps the ground at the end of each beat: if the jumper is in the air
// then, it is cleared; if it is on the ground (standing or crouching) it trips.
// The child holds the jumper to crouch and lets go to leap, and the length of
// the hold decides how long the leap hangs. A short hold is a plain hop that
// clears one swing; a long hold hangs over several, so the quick pair can be
// cleared by ONE leap. The chant never changes, so what the child learns
// carries over from one play to the next.
//
// Pure and deterministic: no DOM, no Vite globals, no clocks. The seed only
// picks the turners' colours and cheers; the rope keeps the same time every play.

import { createRng, int, pick } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// Field furniture, in logical coordinates. Rect x and y are the top-left corner.
export const GROUND_Y = 660
export const JUMPER_X = 590
const FIELD: Rect = { x: 0, y: 0, w: FIELD_W, h: FIELD_H }
// A touch on a turner waves; a touch anywhere else in the field holds the jumper.
export const LEFT_TURNER: Rect = { x: 40, y: 380, w: 250, h: 300 }
export const RIGHT_TURNER: Rect = { x: 890, y: 380, w: 250, h: 300 }

export const CHANT = ['slow', 'slow', 'quick', 'quick'] as const
const BEAT_SLOW = 30
const BEAT_QUICK = 15
// The tempo hook's three speeds, as a share of the base beat.
const PACE = [1, 0.85, 0.7] as const
// A hold of `h` ticks hangs BASE_HANG + HANG_PER_HOLD * h ticks in the air.
const BASE_HANG = 8
const HANG_PER_HOLD = 3
export const MAX_HOLD = 20
export const MAX_HANG = BASE_HANG + HANG_PER_HOLD * MAX_HOLD
// After landing the jumper squashes for a few ticks and cannot leap again yet.
const RECOVER = 7
// After a trip the jumper is tangled, and the turners wait.
const TANGLE = 24
// A tap on a turner echoes the whole chant once: 30 + 30 + 15 + 15 ticks.
const DEMO_TICKS = 90
const HINT_AFTER = 90
const STREAK_EVERY = 4
const TEMPO_EVERY = 8
const MAX_EVENTS = 64

export type JumperState = 'stand' | 'coil' | 'air' | 'tangled'
type Last = 'none' | 'whiff' | 'hop-slow' | 'hop-quick' | 'pair-slow' | 'pair-quick' | 'pair-mixed' | 'long' | 'trip'

const TURNER_COLORS = ['#6a8fbf', '#c07a5a', '#7fa877', '#a889b8', '#c9a545'] as const

// Plain data the view draws from.
export interface ChantRopeSnapshot {
  tick: number
  turning: boolean
  // Which beat of the chant (0 to 3) and how far through it.
  beat: number
  beatTick: number
  beatLen: number
  // Tempo level 0 to 2; always 0 when the tempo hook is removed.
  level: number
  jumper: {
    state: JumperState
    x: number
    // Height off the ground, in logical pixels.
    lift: number
    // Ticks the current (or most recent) leap hangs, and how far through it.
    hang: number
    airTick: number
    // 0 to 1, how far the hold has charged.
    charge: number
    // How long a leap would hang if the finger came up now.
    predictedHang: number
  }
  // Null when the streak hook is removed.
  streak: number | null
  last: string
  cheer: number
  cheerStyle: number
  wave: number
  // Which beat the turners' echo is on (0 to 3), or -1.
  demoBeat: number
  turners: [string, string]
  // Where the idle hint points, or null. Only ever set when config.hints is on.
  hint: { x: number; y: number } | null
}

const inside = (rect: Rect, x: number, y: number) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h

export const createSim: CreateSim<ChantRopeSnapshot> = (config): Sim<ChantRopeSnapshot> => {
  const rng: Rng = createRng(config.seed)
  // Each hook is honoured only when it is in this list, so an empty list means
  // no hook events and no hook behaviour, and each one can be removed alone.
  const hooks = new Set(config.hooks)

  const turners: [string, string] = [pick(rng, TURNER_COLORS), pick(rng, TURNER_COLORS)]
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0

  // The rope.
  let turning = false
  let beat = 0
  let beatTick = 0
  let level = 0
  let pendingLevel = 0

  // The jumper.
  let state: JumperState = 'stand'
  let coilId: number | null = null
  let holdTicks = 0
  // A finger came up while the jumper was still landing: leap when it is ready.
  let releasePending = false
  // A finger went down in mid-air: it becomes the next crouch on landing.
  let bufferedId: number | null = null
  let bufferedReleased = false
  let recover = 0
  let airTick = 0
  let hang = 0
  let covered: number[] = []
  let tangleTicks = 0

  // How the play is going.
  let streak = 0
  let reach = 0
  let last: Last = 'none'
  let cheer = 0
  let cheerStyle = 0
  let wave = 0
  let echo = 0

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }
  const hookFired = (name: string) => emit({ kind: 'hook', name })

  const beatLen = () => Math.round((CHANT[beat] === 'slow' ? BEAT_SLOW : BEAT_QUICK) * PACE[level]!)
  const baseHang = () => Math.round(BASE_HANG * PACE[level]!)
  const hangFor = (hold: number) => Math.min(MAX_HANG, baseHang() + HANG_PER_HOLD * Math.min(hold, MAX_HOLD))

  const launch = () => {
    hang = hangFor(holdTicks)
    state = 'air'
    airTick = 0
    covered = []
    coilId = null
    holdTicks = 0
    releasePending = false
    emit({ kind: 'state', name: 'leap' })
  }

  const startRope = () => {
    turning = true
    beat = 0
    beatTick = 0
    level = pendingLevel
    emit({ kind: 'state', name: 'chant-start' })
  }

  const press = (id: number) => {
    if (state === 'tangled' || coilId !== null) return
    if (state === 'air') {
      // A finger down in mid-air starts charging the next leap right away.
      if (bufferedId === null) {
        bufferedId = id
        bufferedReleased = false
        holdTicks = 0
      }
      return
    }
    if (!turning) startRope()
    state = 'coil'
    coilId = id
    holdTicks = 0
    releasePending = false
    emit({ kind: 'state', name: 'crouch' })
  }

  // A finger lifted (or replaced by a second down on the same id).
  const letGo = (id: number) => {
    if (coilId === id && state === 'coil') {
      if (recover > 0) releasePending = true
      else launch()
    } else if (bufferedId === id) {
      bufferedReleased = true
    }
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (phase === 'down') {
      if (!finite) return
      letGo(id)
      if (inside(LEFT_TURNER, x, y) || inside(RIGHT_TURNER, x, y)) {
        wave = 24
        echo = DEMO_TICKS
        emit({ kind: 'state', name: 'wave' })
      } else if (inside(FIELD, x, y)) {
        // Anywhere else in the field holds the jumper, so a small finger cannot miss.
        press(id)
      }
      return
    }
    if (phase === 'up') letGo(id)
  }

  const trip = () => {
    turning = false
    beat = 0
    beatTick = 0
    state = 'tangled'
    tangleTicks = TANGLE
    coilId = null
    holdTicks = 0
    releasePending = false
    bufferedId = null
    bufferedReleased = false
    streak = 0
    level = 0
    pendingLevel = 0
    last = 'trip'
    emit({ kind: 'state', name: 'trip' })
  }

  // The end of a beat: the rope crosses the ground where the jumper's feet are.
  const sweep = () => {
    if (state === 'air') {
      covered.push(beat)
      streak++
      emit({ kind: 'state', name: 'clear' })
      if (hooks.has('streak') && streak % STREAK_EVERY === 0) hookFired('streak')
      if (hooks.has('tempo') && streak % TEMPO_EVERY === 0 && pendingLevel < PACE.length - 1) {
        pendingLevel++
        hookFired('tempo')
      }
    } else {
      trip()
      return
    }
    beat = (beat + 1) % CHANT.length
    beatTick = 0
    // A new tempo starts with a new chant, never in the middle of one.
    if (beat === 0) level = pendingLevel
  }

  // What one whole leap covered, named by which swings it hung over.
  const classify = (): Last => {
    const n = covered.length
    if (n === 0) return 'whiff'
    if (n === 1) return CHANT[covered[0]!] === 'slow' ? 'hop-slow' : 'hop-quick'
    if (n === 2) return covered[0] === 0 ? 'pair-slow' : covered[0] === 2 ? 'pair-quick' : 'pair-mixed'
    return 'long'
  }

  const land = () => {
    last = classify()
    reach = reach * 0.6 + covered.length * 0.4
    emit({ kind: 'state', name: last === 'hop-slow' || last === 'hop-quick' ? 'hop' : last })
    if (covered.length >= 2) {
      cheer = 45
      cheerStyle = int(rng, 0, 2)
    }
    covered = []
    state = 'stand'
    recover = RECOVER
    airTick = 0
    if (bufferedId !== null) {
      // The charge carries over from the air: a finger kept down through the landing has been charging all along.
      state = 'coil'
      coilId = bufferedId
      releasePending = bufferedReleased
      bufferedId = null
      bufferedReleased = false
    }
  }

  const step = () => {
    tick++
    idleTicks++
    if (cheer > 0) cheer--
    if (wave > 0) wave--
    if (echo > 0) echo--
    if (recover > 0) recover--

    // The rope first, so a leap counts as airborne for the whole tick it lands on.
    if (turning) {
      beatTick++
      if (beatTick >= beatLen()) sweep()
    }

    // The charge is how long the finger has been down (up to MAX_HOLD), on the
    // ground or in the air; a finger that has come up stops charging.
    if ((state === 'coil' && !releasePending) || (state === 'air' && bufferedId !== null && !bufferedReleased)) {
      holdTicks = Math.min(MAX_HOLD, holdTicks + 1)
    }
    if (state === 'coil') {
      if (releasePending && recover === 0) launch()
    } else if (state === 'air') {
      airTick++
      if (airTick >= hang) land()
    } else if (state === 'tangled') {
      tangleTicks--
      if (tangleTicks <= 0) state = 'stand'
    }
  }

  const jumperCentre = () => {
    const lift = liftNow()
    return { x: JUMPER_X, y: GROUND_Y - 80 - lift }
  }

  const liftNow = () => {
    if (state !== 'air' || hang === 0) return 0
    const u = airTick / hang
    const peak = Math.min(240, 60 + hang * 3)
    return peak * 4 * u * (1 - u)
  }

  const affordances = (): Affordance[] => {
    const c = jumperCentre()
    const list: Affordance[] = [
      {
        x: c.x - 100,
        y: c.y - 130,
        w: 200,
        h: 260,
        kind: 'hold',
        salience: state === 'air' ? 0.35 : turning ? 0.7 : 0.9,
      },
    ]
    list.push({ ...LEFT_TURNER, kind: 'tap', salience: 0.2 })
    list.push({ ...RIGHT_TURNER, kind: 'tap', salience: 0.2 })
    return list
  }

  // The charge the next leap would carry: on the ground, or a finger kept down in the air.
  const chargeNow = () => (state === 'coil' || bufferedId !== null ? holdTicks : 0)

  // A discrete outcome class: what the jumper is doing now (5 modes) times how
  // the last leap or trip ended (9 kinds). 5 x 9 = 45.
  const observe = (): Observation => {
    const events = pending
    pending = []
    const mode = state === 'stand' && !turning ? 'still' : state
    return {
      signature: `${mode}/${last}`,
      features: { streak, reach, charge: chargeNow() / MAX_HOLD },
      events,
    }
  }

  // Off by default for return and self-aim runs. Only data for the view.
  const hint = (): { x: number; y: number } | null => {
    if (!config.hints || turning || state !== 'stand' || idleTicks < HINT_AFTER) return null
    const c = jumperCentre()
    return { x: c.x, y: c.y }
  }

  const demoBeat = (): number => {
    if (echo <= 0) return -1
    const elapsed = DEMO_TICKS - echo
    return elapsed < BEAT_SLOW ? 0 : elapsed < 2 * BEAT_SLOW ? 1 : elapsed < 2 * BEAT_SLOW + BEAT_QUICK ? 2 : 3
  }

  const snapshot = (): ChantRopeSnapshot => ({
    tick,
    turning,
    beat,
    beatTick,
    beatLen: beatLen(),
    level,
    jumper: {
      state,
      x: JUMPER_X,
      lift: liftNow(),
      hang,
      airTick,
      charge: chargeNow() / MAX_HOLD,
      predictedHang: hangFor(chargeNow()),
    },
    streak: hooks.has('streak') ? streak : null,
    last,
    cheer,
    cheerStyle,
    wave,
    demoBeat: demoBeat(),
    turners: [turners[0], turners[1]],
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
