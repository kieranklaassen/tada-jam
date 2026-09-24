// Singing Plate. A square plate, a pinch of sand, and a pitch bar. Pour sand by
// touching the plate; hold a finger on the bar. At seven hidden tones the plate
// shivers: every grain that sits far from that tone's quiet lines hops, and hops
// again, until it lands on a quiet line and stops. Between tones nothing moves.
//
// The depth is in the sand's memory. Grains that already sit on a tone's quiet
// lines do not move when that tone sounds, so the next tone scatters only the
// sand on its shaking places, and the picture depends on the ORDER of tones
// (ring then star keeps beads on the ring's radius; star then ring does not).
// The star's quiet lines contain the cross's and the ex's, so a cross pile
// sings the star without moving at all.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now, or
// performance.now. It reads a seeded rng and counts ticks, nothing else.

import { createRng } from '../../kit/rng.ts'
import { FIELD_H } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// Field furniture, logical coordinates, x and y the top-left corner.
export const PLATE: Rect = { x: 90, y: 40, w: 640, h: 640 }
export const BAR: Rect = { x: 90, y: 715, w: 1000, h: 90 }
export const TIP: Rect = { x: 800, y: 600, w: 220, h: 80 }

// Plate units: u and v run -1 to 1 across the plate. Each tone is the distance
// from a point to that tone's quiet lines; zero means "on a line".
const SQRT1_2 = Math.SQRT1_2
const gridLine = (t: number) => Math.min(Math.abs(t - 0.6), Math.abs(t - 0.2), Math.abs(t + 0.2), Math.abs(t + 0.6))

interface Tone {
  name: string
  distance: (u: number, v: number) => number
}

// Low to high along the bar; busier patterns sit higher, like a real plate.
const TONES: readonly Tone[] = [
  { name: 'ring', distance: (u, v) => Math.abs(Math.hypot(u, v) - 0.6) },
  { name: 'cross', distance: (u, v) => Math.min(Math.abs(u), Math.abs(v)) },
  { name: 'ex', distance: (u, v) => Math.min(Math.abs(u - v), Math.abs(u + v)) * SQRT1_2 },
  {
    name: 'star',
    distance: (u, v) => Math.min(Math.abs(u), Math.abs(v), Math.abs(u - v) * SQRT1_2, Math.abs(u + v) * SQRT1_2),
  },
  { name: 'diamond', distance: (u, v) => Math.abs(Math.abs(u) + Math.abs(v) - 0.8) * SQRT1_2 },
  {
    name: 'target',
    distance: (u, v) => {
      const r = Math.hypot(u, v)
      return Math.min(Math.abs(r - 0.3), Math.abs(r - 0.85))
    },
  },
  { name: 'grid', distance: (u, v) => Math.min(gridLine(u), gridLine(v)) },
]
export const TONE_NAMES: readonly string[] = TONES.map((t) => t.name)

// A tone window on the bar: 72 logical pixels wide, centred at toneX.
export const TONE_HALF = 36
export const toneX = (tone: number): number => BAR.x + (BAR.w * (tone + 0.5)) / TONES.length

const MAX_GRAINS = 900
const BURST = 30
const TRICKLE = 3
const BURST_SPREAD = 0.09
const TRICKLE_SPREAD = 0.06
// A grain closer than this to the sounding tone's line is "quiet" and stays.
const QUIET = 0.045
const HOP_P = 0.65
const HOP_MAX = 0.4
// Plate energy: a touch strikes at STRIKE, holding builds to 1, letting go
// rings out. Sliding into a window starts from silence, so a fast sweep across
// a tone does not sound it.
const STRIKE = 0.9
const RISE = 0.2
const FALL = 0.02
const RING_MIN = 0.55
// Share of sand on the sounding tone's lines for the pile to count as shaped.
const SETTLE = 0.72
// Share of the pile a tone must move to reshape it (below this it "fits").
const MOVE_SHARE = 0.12
// Share of sand still on the wearing shape's lines for the pile to keep it.
const KEEP = 0.6
const BAR_SLOP = 26
const BAR_SLICES = 5
const PLATE_SLOP = 10
const HINT_AFTER = 150
const MAX_EVENTS = 64

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inRect = (r: Rect, x: number, y: number, slop = 0) =>
  x >= r.x - slop && x <= r.x + r.w + slop && y >= r.y - slop && y <= r.y + r.h + slop
const toneAt = (x: number): number => {
  for (let i = 0; i < TONES.length; i++) if (Math.abs(x - toneX(i)) <= TONE_HALF) return i
  return -1
}

interface BarFinger {
  x: number
  tone: number
}

interface PourFinger {
  u: number
  v: number
  on: boolean
}

// Plain data the view draws from (contract: snapshot).
export interface SingingPlateSnapshot {
  tick: number
  // Sand in logical screen coordinates, x then y.
  grains: number[]
  // The tone that sounds or last sounded, -1 for none.
  voice: number
  ringing: boolean
  // 0 to 1: how hard the plate shakes.
  energy: number
  // 0 to 1: how close a finger on the bar is to a hidden tone (never a tone).
  hum: number
  found: boolean[]
  fingerX: number | null
  // What the pile is called right now: bare, heap, or "shape<previous shape".
  pile: string
  woven: number
  hint: { kind: 'pour' | 'slide'; x: number; y: number } | null
}

export const createSim: CreateSim<SingingPlateSnapshot> = (config): Sim<SingingPlateSnapshot> => {
  const rng = createRng(config.seed)

  // Sand: plate units, a ring buffer so a full plate spills its oldest grains.
  const gu = new Float64Array(MAX_GRAINS)
  const gv = new Float64Array(MAX_GRAINS)
  const hopped = new Uint8Array(MAX_GRAINS)
  let count = 0
  let head = 0
  let moved = 0
  // Bumped whenever a grain is added, moved, or the plate is tipped, so
  // quietShare can reuse its last sweep of the sand for each tone until then.
  let rev = 0
  const quietRev = new Int32Array(TONES.length).fill(-1)
  const quietMemo = new Float64Array(TONES.length)

  const bar = new Map<number, BarFinger>()
  const pours = new Map<number, PourFinger>()
  const found: boolean[] = TONES.map(() => false)
  let pending: SimEvent[] = []
  let tick = 0
  let idle = 0

  // The plate.
  let voice = -1
  let energy = 0
  let wasRinging = false
  let episodeTone = -1
  let fitted = false

  // What the pile remembers: the tone that last shaped it, the one before, and
  // which tones have shaped it since the plate was last tipped.
  let shape = -1
  let prev = -1
  let worn = 0

  const emit = (name: string) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push({ kind: 'state', name })
  }

  const isRinging = () => voice >= 0 && energy >= RING_MIN

  // A shaped pile is named for the tone that shaped it, then the one before.
  const shapeName = () => (prev < 0 ? TONES[shape]!.name : `${TONES[shape]!.name}<${TONES[prev]!.name}`)

  const addGrain = (u: number, v: number) => {
    let slot: number
    if (count < MAX_GRAINS) slot = count++
    else {
      slot = head
      head = (head + 1) % MAX_GRAINS
      if (hopped[slot]) moved--
    }
    gu[slot] = clamp(u, -0.98, 0.98)
    gv[slot] = clamp(v, -0.98, 0.98)
    hopped[slot] = 0
    rev++
  }

  const scatter = (u: number, v: number, n: number, spread: number) => {
    for (let i = 0; i < n; i++) addGrain(u + (rng() + rng() - 1) * spread, v + (rng() + rng() - 1) * spread)
  }

  const tip = () => {
    count = 0
    head = 0
    moved = 0
    hopped.fill(0)
    rev++
    shape = -1
    prev = -1
    worn = 0
    emit('tip')
  }

  const release = (id: number) => {
    bar.delete(id)
    pours.delete(id)
  }

  const toU = (x: number) => ((x - PLATE.x) / PLATE.w) * 2 - 1
  const toV = (y: number) => ((y - PLATE.y) / PLATE.h) * 2 - 1

  const quietShare = (tone: number): number => {
    if (count === 0 || tone < 0) return 0
    if (quietRev[tone] === rev) return quietMemo[tone]!
    const distance = TONES[tone]!.distance
    let quiet = 0
    for (let i = 0; i < count; i++) if (distance(gu[i]!, gv[i]!) <= QUIET) quiet++
    const share = quiet / count
    quietRev[tone] = rev
    quietMemo[tone] = share
    return share
  }

  // (contract) The sim's own hit-test decides what a touch does. The bar is a
  // tall forgiving strip; a finger that started on it keeps sliding wherever it
  // goes. The plate pours; the tip button empties.
  const pointer = (input: PointerInput) => {
    idle = 0
    const { id, phase, x, y } = input
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      if (phase === 'up') release(id)
      return
    }
    if (phase === 'down') {
      release(id)
      if (x >= BAR.x - 20 && x <= BAR.x + BAR.w + 20 && y >= BAR.y - BAR_SLOP && y <= FIELD_H) {
        const cx = clamp(x, BAR.x, BAR.x + BAR.w)
        const tone = toneAt(cx)
        bar.set(id, { x: cx, tone })
        if (tone >= 0) {
          // A touch inside a window strikes the tone at once, so a tap rings.
          if (voice !== tone) energy = 0
          voice = tone
          energy = Math.max(energy, STRIKE)
        }
      } else if (inRect(PLATE, x, y, PLATE_SLOP)) {
        const u = clamp(toU(x), -1, 1)
        const v = clamp(toV(y), -1, 1)
        pours.set(id, { u, v, on: true })
        scatter(u, v, BURST, BURST_SPREAD)
        emit('pour')
      } else if (inRect(TIP, x, y, 12)) tip()
      return
    }
    const finger = bar.get(id)
    if (finger) {
      const cx = clamp(x, BAR.x, BAR.x + BAR.w)
      const tone = toneAt(cx)
      if (tone !== finger.tone) {
        finger.tone = tone
        // Sliding into a window starts from silence; it takes a moment to sing.
        if (tone >= 0 && voice !== tone) {
          voice = tone
          energy = 0
        }
      }
      finger.x = cx
    }
    const pourer = pours.get(id)
    if (pourer) {
      pourer.on = inRect(PLATE, x, y, PLATE_SLOP)
      if (pourer.on) {
        pourer.u = clamp(toU(x), -1, 1)
        pourer.v = clamp(toV(y), -1, 1)
      }
    }
    if (phase === 'up') release(id)
  }

  const hop = () => {
    const distance = TONES[voice]!.distance
    const p = HOP_P * energy
    let changed = false
    for (let i = 0; i < count; i++) {
      const d = distance(gu[i]!, gv[i]!)
      if (d <= QUIET || rng() >= p) continue
      const reach = Math.min(HOP_MAX, 0.05 + d)
      const angle = rng() * Math.PI * 2
      const r = reach * Math.sqrt(rng())
      gu[i] = clamp(gu[i]! + Math.cos(angle) * r, -0.98, 0.98)
      gv[i] = clamp(gv[i]! + Math.sin(angle) * r, -0.98, 0.98)
      changed = true
      if (!hopped[i]) {
        hopped[i] = 1
        moved++
      }
    }
    if (changed) rev++
  }

  // (contract: step) One fixed tick.
  const step = () => {
    tick++
    idle++
    for (const p of pours.values()) if (p.on) scatter(p.u, p.v, TRICKLE, TRICKLE_SPREAD)

    let sustained = false
    for (const f of bar.values()) if (voice >= 0 && f.tone === voice) sustained = true
    energy = sustained ? Math.min(1, energy + RISE) : Math.max(0, energy - FALL)

    const ringing = isRinging()
    if (ringing && (!wasRinging || episodeTone !== voice)) {
      episodeTone = voice
      hopped.fill(0)
      moved = 0
      fitted = false
      if (!found[voice]) {
        found[voice] = true
        emit(`found:${TONES[voice]!.name}`)
      }
    }
    wasRinging = ringing
    if (!ringing || count === 0) return

    hop()
    if (voice !== shape && quietShare(voice) >= SETTLE) {
      if (moved >= count * MOVE_SHARE) {
        prev = shape
        shape = voice
        worn |= 1 << voice
        emit(`settle:${TONES[voice]!.name}`)
      } else if (!fitted) {
        // The pile already sits on this tone's lines: nothing to scatter.
        fitted = true
        emit('fits')
      }
    }
  }

  const activeBar = (): BarFinger | null => {
    let last: BarFinger | null = null
    for (const f of bar.values()) last = f
    return last
  }

  const wovenCount = () => {
    let n = 0
    for (let i = 0; i < TONES.length; i++) if (worn & (1 << i)) n++
    return n
  }

  // (contract: affordances) The plate to pour on, the bar to slide along, the
  // tones already found (hidden ones are not listed), and the tip button.
  const affordances = (): Affordance[] => {
    const list: Affordance[] = [
      { ...PLATE, kind: 'drag', salience: count === 0 ? 0.95 : 0.35 },
      { ...TIP, kind: 'tap', salience: count > 600 ? 0.5 : 0.1 },
    ]
    // The bar is one strip to a child, with nothing marked on it. It is listed
    // as five equal slices so an aim at a slice's middle does not always land
    // on the same hidden tone; the slice edges are not the tone windows.
    for (let i = 0; i < BAR_SLICES; i++) {
      list.push({ x: BAR.x + (i * BAR.w) / BAR_SLICES, y: BAR.y, w: BAR.w / BAR_SLICES, h: BAR.h, kind: 'drag', salience: count === 0 ? 0.4 : 0.85 })
    }
    TONES.forEach((_, i) => {
      if (!found[i]) return
      list.push({ x: toneX(i) - TONE_HALF, y: BAR.y, w: TONE_HALF * 2, h: BAR.h, kind: 'hold', salience: count === 0 ? 0.2 : 0.7 })
    })
    return list
  }

  // (contract: observe) The signature names where the sand has ended up:
  // bare, dancing (a tone is moving it), heap (poured, not shaped), or the tone
  // that last shaped it, with the tone before it when there was one. At most
  // 4 + 7 + 7 x 6 = 53 values; never a coordinate or a count.
  const observe = (): Observation => {
    const events = pending
    pending = []
    const ringing = isRinging()
    const qVoice = ringing ? quietShare(voice) : 0
    const qShape = shape >= 0 ? quietShare(shape) : 0
    let signature: string
    if (count === 0) signature = ringing ? 'bare-ring' : 'bare'
    else if (ringing && qVoice < SETTLE) signature = 'dancing'
    else if (shape < 0 || qShape < KEEP) signature = 'heap'
    else signature = shapeName()
    return {
      signature,
      features: {
        woven: wovenCount(),
        found: found.filter(Boolean).length,
        settled: ringing ? qVoice : qShape,
        grains: count,
        ringing: ringing ? 1 : 0,
      },
      events,
    }
  }

  // (contract: hints) Data for the view only; it never changes the sim.
  const hint = (): SingingPlateSnapshot['hint'] => {
    if (!config.hints || idle < HINT_AFTER) return null
    if (count === 0) return { kind: 'pour', x: PLATE.x + PLATE.w / 2, y: PLATE.y + PLATE.h / 2 }
    return { kind: 'slide', x: BAR.x + (((idle - HINT_AFTER) * 8) % BAR.w), y: BAR.y + BAR.h / 2 }
  }

  const hum = (): number => {
    const f = activeBar()
    if (!f || f.tone >= 0) return 0
    let nearest = Infinity
    for (let i = 0; i < TONES.length; i++) nearest = Math.min(nearest, Math.abs(f.x - toneX(i)))
    return clamp(1 - (nearest - TONE_HALF) / 60, 0, 1)
  }

  const snapshot = (): SingingPlateSnapshot => {
    const grains: number[] = []
    for (let i = 0; i < count; i++) {
      grains.push(PLATE.x + ((gu[i]! + 1) / 2) * PLATE.w, PLATE.y + ((gv[i]! + 1) / 2) * PLATE.h)
    }
    const ringing = isRinging()
    return {
      tick,
      grains,
      voice,
      ringing,
      energy: ringing ? energy : 0,
      hum: hum(),
      found: [...found],
      fingerX: activeBar()?.x ?? null,
      pile: shape < 0 ? (count === 0 ? 'bare' : 'heap') : shapeName(),
      woven: wovenCount(),
      hint: hint(),
    }
  }

  return { step, pointer, affordances, observe, snapshot }
}
