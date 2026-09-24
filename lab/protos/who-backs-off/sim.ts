// Who Backs Off. A one-lane bridge, three animals, and a scare rule that runs in
// a circle: the cat scares the mouse, the mouse scares the elephant, the
// elephant scares the cat. When two animals meet head on, the scarier one
// walks on and the other backs off, and so does everything queued behind it.
//
// A round: one animal is marked (a crown). It has to cross, but its scarier
// animal is already plodding toward it on the bridge. Waiting out the blocker
// is slow; the circle offers a shortcut (send the animal that scares the
// blocker first, then follow it). The other animals get impatient and set off
// by themselves, so the child ushers: tap an animal to send it now, hold a
// finger on the front animal to keep it back.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now, or
// performance.now. It reads a seeded rng and counts ticks, nothing else.

import { between, createRng, int, pick } from '../../kit/rng.ts'
import { FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export type Kind = 'mouse' | 'cat' | 'elephant'
export type Phase = 'wait' | 'gate' | 'walk' | 'flee' | 'across'
export type Bank = 0 | 1

export const KINDS: readonly Kind[] = ['mouse', 'cat', 'elephant']
// Who scares whom. It runs in a circle.
export const SCARES: Record<Kind, Kind> = { cat: 'mouse', mouse: 'elephant', elephant: 'cat' }
// The animal that scares this one.
export const PREDATOR: Record<Kind, Kind> = { mouse: 'cat', elephant: 'mouse', cat: 'elephant' }

// The bridge runs left to right at LANE_Y between the two gates. Bank 0 is the
// left bank, bank 1 the right.
export const LANE_Y = 410
export const GATE: readonly [number, number] = [260, 920]
export const LANE = GATE[1] - GATE[0]

// Pixels per tick along the bridge, and body sizes (half the length along the lane).
const SPEED: Record<Kind, number> = { mouse: 5.2, cat: 3.4, elephant: 1.8 }
const HALF: Record<Kind, number> = { mouse: 28, cat: 38, elephant: 60 }
export const RADIUS: Record<Kind, number> = { mouse: 30, cat: 42, elephant: 62 }
// A finger is not a pixel: the sim's own hit-test forgives this much.
const HIT: Record<Kind, number> = { mouse: 56, cat: 60, elephant: 70 }
const FLEE = 1.5
const GAP = 14
// Nobody steps onto the bridge when an animal from the other bank is this close to arriving.
const ENTRY_LOOKOUT = 200
const PATIENCE = 200
// An animal that was turned back is too shaken to be sent again for this long.
const SHAKEN = 90
// Shorter than this is a tap; longer, without moving, is a hold.
const HOLD_TICKS = 10
const DRAG_SEND = 70
const MAX_PRESS = 300
const PAUSE = 90
const PAR_SLACK = 130
const HINT_AFTER = 150
const MAX_LEVEL = 6
// The browser view never calls observe(), so the queue must not grow forever.
const MAX_EVENTS = 64

const WAIT_ROWS = [290, 190, 90, 530, 630, 730]
const WAIT_COLS = [170, 70]

const dirOf = (bank: Bank): 1 | -1 => (bank === 0 ? 1 : -1)
const waitPos = (bank: Bank, rank: number) => {
  const col = WAIT_COLS[rank % 2]!
  return { x: bank === 0 ? col : FIELD_W - col, y: WAIT_ROWS[Math.floor(rank / 2) % WAIT_ROWS.length]! }
}

interface Animal {
  id: number
  kind: Kind
  from: Bank
  vip: boolean
  phase: Phase
  // Centre along the bridge; meaningful while walking or fleeing.
  x: number
  // Place in the queue (waiting) or at the gate.
  order: number
  // Where it stands once across.
  slot: number
  // Held up by a slower animal ahead of it on the last tick.
  slowed: boolean
  // A blocker that has sat down in the middle of the bridge and will not move
  // until something scares it.
  still: boolean
  // Ticks left before it can be sent again after being turned back.
  shaken: number
}

interface Press {
  animal: number
  x0: number
  y0: number
  down: number
  moved: number
}

interface Last {
  winner: Kind
  loser: Kind
  kin: boolean
  convoy: number
  tick: number
}

export interface AnimalView {
  id: number
  kind: Kind
  from: Bank
  vip: boolean
  phase: Phase
  x: number
  y: number
  r: number
  // The waiting animal that sets off by itself next.
  head: boolean
  slowed: boolean
  still: boolean
  shaken: boolean
  held: boolean
}

// Plain data the view draws from (contract: snapshot).
export interface WhoSnapshot {
  tick: number
  round: number
  // A round has just been won and the next is about to start.
  pause: boolean
  animals: AnimalView[]
  // 0 to 1: how close each bank's front animal is to setting off.
  patience: [number, number]
  last: { winner: Kind; loser: Kind; kin: boolean; convoy: number; age: number } | null
  // Null when the stars hook is removed or the round is still on.
  stars: number | null
  roundTicks: number
  par: number
  // Where the idle hint points, or null. Only ever set when config.hints is on.
  hint: { x: number; y: number } | null
}

export const createSim: CreateSim<WhoSnapshot> = (config): Sim<WhoSnapshot> => {
  const rng = createRng(config.seed)
  // (contract: hooks) Each hook is honoured only when it is in this list.
  const hooks = new Set(config.hooks)

  let animals: Animal[] = []
  let nextId = 0
  let queueCounter = 0
  let round = 0
  let tick = 0
  let idle = 0
  let pause = 0
  let roundTicks = 0
  // Animals of the marked animal's bank turned back this round, and in all.
  let roundSetbacks = 0
  let par = 0
  let stars: number | null = null
  let crossed = 0
  let setbacks = 0
  let last: Last | null = null
  let pending: SimEvent[] = []
  const timer: [number, number] = [0, 0]
  const lastHead: [number, number] = [-1, -1]
  const presses = new Map<number, Press>()

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }
  const happened = (name: string) => emit({ kind: 'state', name })

  const add = (kind: Kind, from: Bank, vip: boolean, phase: Phase, x = 0): Animal => {
    const a: Animal = { id: nextId++, kind, from, vip, phase, x, order: queueCounter++, slot: 0, slowed: false, still: false, shaken: 0 }
    animals.push(a)
    return a
  }
  const inPhase = (bank: Bank, phase: Phase) =>
    animals.filter((a) => a.from === bank && a.phase === phase).sort((a, b) => a.order - b.order)
  const onBridge = () => animals.filter((a) => a.phase === 'walk' || a.phase === 'flee')
  // The front of a bank's queue in a phase, taking only animals that pass
  // `ok`: what inPhase(...).find(ok) finds, without building and sorting a list
  // (`order` is never shared, so the lowest one is the first).
  const frontOf = (bank: Bank, phase: Phase, ok?: (a: Animal) => boolean): Animal | undefined => {
    let front: Animal | undefined
    for (const a of animals) {
      if (a.from === bank && a.phase === phase && (!ok || ok(a)) && (!front || a.order < front.order)) front = a
    }
    return front
  }
  const canLead = (a: Animal) => !a.vip && a.shaken === 0
  // The waiting animal that sets off by itself: the first that is not marked
  // and not shaken.
  const headOf = (bank: Bank) => frontOf(bank, 'wait', canLead)
  // Whether a finger is down on this animal.
  const isHeld = (id: number): boolean => {
    for (const p of presses.values()) if (p.animal === id) return true
    return false
  }
  const vipOf = () => animals.find((a) => a.vip)!

  const place = (a: Animal): { x: number; y: number } => {
    if (a.phase === 'wait') return waitPos(a.from, inPhase(a.from, 'wait').indexOf(a))
    if (a.phase === 'gate') {
      const k = inPhase(a.from, 'gate').indexOf(a)
      return { x: GATE[a.from] - dirOf(a.from) * (75 + 85 * k), y: LANE_Y }
    }
    if (a.phase === 'across') {
      const arrivedRight = a.from === 0
      return { x: arrivedRight ? FIELD_W - 30 - 32 * a.slot : 30 + 32 * a.slot, y: 785 }
    }
    return { x: a.x, y: LANE_Y }
  }

  // The sim's own hit-test: the nearest waiting animal within its hit radius.
  const hit = (x: number, y: number): Animal | null => {
    let best: Animal | null = null
    let bestDistance = Infinity
    for (const a of animals) {
      if (a.phase !== 'wait') continue
      const p = place(a)
      const d = Math.hypot(x - p.x, y - p.y)
      if (d <= HIT[a.kind] && d < bestDistance) {
        best = a
        bestDistance = d
      }
    }
    return best
  }

  // ---- rounds -------------------------------------------------------------

  const setupRound = () => {
    animals = []
    presses.clear()
    timer[0] = 0
    timer[1] = 0
    lastHead[0] = -1
    lastHead[1] = -1
    roundTicks = 0
    roundSetbacks = 0
    stars = null
    last = null
    const level = hooks.has('levels') ? Math.min(round, MAX_LEVEL) : 0
    const vipKind = pick(rng, KINDS)
    const vb = int(rng, 0, 1) as Bank
    const ob = (1 - vb) as Bank
    const blocker = PREDATOR[vipKind]
    const helper = SCARES[vipKind]
    // Some later rounds have no helper on the marked animal's bank; then the
    // blocker keeps walking and waiting it out is the way.
    const helperMissing = level >= 2 && rng() < 0.4
    const sits = !helperMissing && (level === 0 || rng() < 0.7)

    // The jam: the blocker is already partway across, walking toward the
    // marked animal's bank, or sitting down there.
    const progress = between(rng, 0.15, 0.4)
    const bx = GATE[ob] + dirOf(ob) * progress * LANE
    add(blocker, ob, false, 'walk', bx).still = sits
    if (level >= 2 && rng() < 0.6) {
      const kind = pick(rng, KINDS)
      const fx = bx - dirOf(ob) * (HALF[blocker] + HALF[kind] + GAP + 40)
      if (dirOf(ob) * (fx - GATE[ob]) >= 0) add(kind, ob, false, 'walk', fx)
    }
    // The marked animal, then whoever is queued ahead of the helper (they set
    // off first, by themselves), then the helper.
    add(vipKind, vb, true, 'wait')
    const ahead = level >= 1 ? int(rng, 0, level >= 3 ? 2 : 1) : 0
    for (let i = 0; i < ahead; i++) add(pick(rng, KINDS), vb, false, 'wait')
    if (helperMissing) add(helper, ob, false, 'wait')
    else add(helper, vb, false, 'wait')
    const traffic = 1 + (level >= 1 ? int(rng, 0, 1) : 0) + (level >= 4 ? 1 : 0)
    for (let i = 0; i < traffic; i++) add(pick(rng, KINDS), ob, false, 'wait')
    // Par: how fast a good round goes. With a sitting blocker that is the helper
    // and the marked animal crossing together; otherwise waiting the blocker out.
    par = Math.round(
      (sits ? LANE / Math.min(SPEED[vipKind], SPEED[helper]) : (1 - progress) * (LANE / SPEED[blocker]) + LANE / SPEED[vipKind]) + PAR_SLACK,
    )
    if (hooks.has('levels') && round > 0 && round <= MAX_LEVEL) emit({ kind: 'hook', name: 'levels' })
  }

  const finishRound = () => {
    pause = PAUSE
    crossed++
    happened('round-done')
    if (hooks.has('stars')) {
      stars = 1 + (roundSetbacks === 0 ? 1 : 0) + (roundTicks <= par ? 1 : 0)
      emit({ kind: 'hook', name: 'stars' })
    }
  }

  // ---- what the child does ------------------------------------------------

  const send = (a: Animal) => {
    if (a.phase !== 'wait' || a.shaken > 0) return
    if (headOf(a.from) === a) timer[a.from] = 0
    a.phase = 'gate'
    a.order = queueCounter++
    happened('send')
  }

  const finishPress = (p: Press) => {
    const a = animals.find((x) => x.id === p.animal)
    if (!a || a.phase !== 'wait') return
    if (tick - p.down < HOLD_TICKS || p.moved >= DRAG_SEND) {
      send(a)
      return
    }
    // A hold: the animal was kept back, and its patience starts over.
    if (headOf(a.from) === a) timer[a.from] = 0
    happened('hold')
  }

  // (contract: pointer) Only waiting animals react. A short touch or a drag
  // sends the animal; a long still touch keeps it back.
  const pointer = (input: PointerInput) => {
    idle = 0
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (phase === 'down') {
      presses.delete(id)
      if (!finite || pause > 0) return
      const a = hit(x, y)
      if (a) presses.set(id, { animal: a.id, x0: x, y0: y, down: tick, moved: 0 })
      return
    }
    const p = presses.get(id)
    if (!p) return
    if (finite) p.moved = Math.max(p.moved, Math.hypot(x - p.x0, y - p.y0))
    if (phase === 'up') {
      presses.delete(id)
      finishPress(p)
    }
  }

  // ---- one tick -----------------------------------------------------------

  const expirePresses = () => {
    for (const [id, p] of presses) {
      if (tick - p.down <= MAX_PRESS) continue
      presses.delete(id)
      finishPress(p)
    }
  }

  // Each bank's front animal gets impatient and sets off by itself, unless a
  // finger is on it.
  const autoGo = () => {
    for (const bank of [0, 1] as const) {
      const head = headOf(bank)
      if (!head) {
        timer[bank] = 0
        lastHead[bank] = -1
        continue
      }
      if (lastHead[bank] !== head.id) {
        lastHead[bank] = head.id
        timer[bank] = 0
      }
      if (isHeld(head.id)) continue
      timer[bank]++
      if (timer[bank] >= PATIENCE) send(head)
    }
  }

  // An animal at the gate steps onto the bridge when there is room, its friends
  // are not running home along it, and nobody from the other bank is about to arrive.
  const enter = () => {
    for (const bank of [0, 1] as const) {
      if (animals.some((o) => o.from === bank && o.phase === 'flee')) continue
      const a = frontOf(bank, 'gate')
      if (!a) continue
      const at = GATE[bank]
      const free = animals.every((o) => {
        if (o.phase !== 'walk' && o.phase !== 'flee') return true
        const d = Math.abs(o.x - at)
        if (d < HALF[o.kind] + HALF[a.kind] + GAP) return false
        return !(o.phase === 'walk' && o.from !== bank && d < ENTRY_LOOKOUT)
      })
      if (!free) continue
      a.phase = 'walk'
      a.x = at
      happened('enter')
    }
  }

  // Which way it is heading: right (+1) or left (-1), even while it sits.
  const heading = (a: Animal): number => (a.phase === 'walk' ? dirOf(a.from) : -dirOf(a.from))
  const velocity = (a: Animal): number => {
    if (a.still) return 0
    return a.phase === 'walk' ? dirOf(a.from) * SPEED[a.kind] : -dirOf(a.from) * SPEED[a.kind] * FLEE
  }
  const clearance = (a: Animal, b: Animal) => HALF[a.kind] + HALF[b.kind] + GAP

  // Two animals met head on: the scarier one walks on, the other turns back,
  // and every animal of its bank queued behind it on the bridge turns back too.
  const clash = (p: Animal, q: Animal) => {
    let winner = p
    let loser = q
    let kin = false
    if (SCARES[q.kind] === p.kind) {
      winner = q
      loser = p
    } else if (SCARES[p.kind] !== q.kind) {
      // The same kind: whoever has walked less gives way.
      kin = true
      if (p.x - GATE[0] < GATE[1] - q.x) {
        winner = q
        loser = p
      }
    }
    loser.phase = 'flee'
    loser.still = false
    let convoy = 0
    for (const o of animals) {
      if (o === loser || o.phase !== 'walk' || o.from !== loser.from) continue
      if (loser.from === 0 ? o.x < loser.x : o.x > loser.x) {
        o.phase = 'flee'
        convoy++
      }
    }
    if (loser.from === vipOf().from) {
      setbacks += 1 + convoy
      roundSetbacks += 1 + convoy
    }
    last = { winner: winner.kind, loser: loser.kind, kin, convoy, tick }
    happened(kin ? 'yield-kin' : `scare-${winner.kind}-${loser.kind}`)
    if (convoy > 0) happened('convoy')
  }

  const arrive = (a: Animal) => {
    a.phase = 'across'
    a.slot = animals.filter((o) => o.phase === 'across' && o.from === a.from).length - 1
    happened('across')
    if (a.vip) finishRound()
  }

  const goHome = (a: Animal) => {
    a.phase = 'wait'
    a.order = queueCounter++
    a.shaken = SHAKEN
    happened('home')
  }

  const move = () => {
    const on = onBridge().sort((a, b) => a.x - b.x || a.id - b.id)
    const n = on.length
    if (n === 0) return
    const vel = on.map(velocity)
    const facing = on.map(heading)
    const nx = on.map((a) => a.x)
    for (const a of on) a.slowed = false

    // Neighbours heading toward each other that would touch this tick (a
    // sitting blocker still faces the way it was going).
    for (let i = 0; i + 1 < n; i++) {
      if (!(facing[i]! > 0 && facing[i + 1]! < 0)) continue
      const p = on[i]!
      const q = on[i + 1]!
      const gap = q.x - p.x - clearance(p, q)
      const closing = vel[i]! - vel[i + 1]!
      if (gap - closing > 0) continue
      if (p.phase === 'walk' && q.phase === 'walk' && p.from !== q.from) {
        const t = Math.min(1, Math.max(0, gap / closing))
        nx[i] = p.x + vel[i]! * t
        nx[i + 1] = q.x + vel[i + 1]! * t
        clash(p, q)
      }
      vel[i] = 0
      vel[i + 1] = 0
    }
    // Animals heading right, front first; none passes the one ahead.
    for (let i = n - 1; i >= 0; i--) {
      if (vel[i]! <= 0) continue
      const a = on[i]!
      let target = a.x + vel[i]!
      const ahead = on[i + 1]
      if (ahead && vel[i + 1]! >= 0) {
        const limit = nx[i + 1]! - clearance(a, ahead)
        if (target > limit) {
          target = Math.max(a.x, limit)
          a.slowed = true
        }
      }
      nx[i] = target
    }
    // Animals heading left, front first.
    for (let i = 0; i < n; i++) {
      if (vel[i]! >= 0) continue
      const a = on[i]!
      let target = a.x + vel[i]!
      const ahead = on[i - 1]
      if (ahead && vel[i - 1]! <= 0) {
        const limit = nx[i - 1]! + clearance(a, ahead)
        if (target < limit) {
          target = Math.min(a.x, limit)
          a.slowed = true
        }
      }
      nx[i] = target
    }
    on.forEach((a, i) => {
      a.x = nx[i]!
    })
    for (const a of on) {
      if (a.phase === 'walk' && (a.from === 0 ? a.x >= GATE[1] : a.x <= GATE[0])) arrive(a)
      else if (a.phase === 'flee' && (a.from === 0 ? a.x <= GATE[0] : a.x >= GATE[1])) goHome(a)
    }
  }

  // (contract: step) One fixed tick.
  const step = () => {
    tick++
    idle++
    if (pause > 0) {
      pause--
      if (pause === 0) {
        round++
        setupRound()
      }
      return
    }
    roundTicks++
    for (const a of animals) if (a.shaken > 0) a.shaken--
    expirePresses()
    autoGo()
    enter()
    move()
  }

  // (contract: affordances) The waiting animals: a tap sends one, and the front
  // one can be held back. Reading this changes nothing.
  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    for (const a of animals) {
      if (a.phase !== 'wait') continue
      const p = place(a)
      const r = HIT[a.kind]
      const rect = { x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r }
      const head = headOf(a.from) === a
      list.push({ ...rect, kind: 'tap', salience: a.shaken > 0 ? 0.15 : a.vip ? 0.7 : head ? 0.5 : 0.35 })
      if (head) {
        // Holding matters most when something scarier is already coming.
        const threatened = onBridge().some((o) => o.from !== a.from && SCARES[o.kind] === a.kind)
        list.push({ ...rect, kind: 'hold', salience: threatened ? 0.6 : 0.2 })
      }
    }
    return list
  }

  // (contract: observe) A discrete outcome class, a few named features, and the
  // events since the last call. The signature names the state of the marked
  // animal, the kind of traffic on the bridge, and the last scare: never a
  // coordinate or a count.
  const observe = (): Observation => {
    const events = pending
    pending = []
    const vip = vipOf()
    const bridge = onBridge()
    const lastName = last === null ? 'none' : last.kin ? 'kin' : `${last.winner}-${last.loser}`
    let signature: string
    if (vip.phase === 'across') signature = `done/${lastName}`
    else {
      const crossing = vip.phase === 'walk' || vip.phase === 'flee' ? 'cross' : 'wait'
      let traffic = 'flow'
      if (bridge.length === 0) traffic = 'empty'
      else if (bridge.some((a) => a.phase === 'flee')) traffic = 'flee'
      else if (bridge.some((a) => a.from === 0) && bridge.some((a) => a.from === 1)) traffic = 'twoway'
      else if (bridge.some((a) => a.still || a.slowed)) traffic = 'jam'
      signature = `${crossing}/${traffic}/${lastName}`
    }
    return { signature, features: { crossed, setbacks, rounds: round, onBridge: bridge.length }, events }
  }

  // (contract: hints) Off by default for return and self-aim runs. The hint is
  // only data for the view; it never changes what the sim does.
  const hint = (): { x: number; y: number } | null => {
    if (!config.hints || idle < HINT_AFTER || pause > 0) return null
    const vip = vipOf()
    return vip.phase === 'wait' ? place(vip) : null
  }

  const snapshot = (): WhoSnapshot => {
    return {
      tick,
      round,
      pause: pause > 0,
      animals: animals.map((a) => {
        const p = place(a)
        return {
          id: a.id,
          kind: a.kind,
          from: a.from,
          vip: a.vip,
          phase: a.phase,
          x: p.x,
          y: p.y,
          r: RADIUS[a.kind],
          head: a.phase === 'wait' && headOf(a.from) === a,
          slowed: a.slowed,
          still: a.still,
          shaken: a.shaken > 0,
          held: isHeld(a.id),
        }
      }),
      patience: [headOf(0) ? timer[0] / PATIENCE : 0, headOf(1) ? timer[1] / PATIENCE : 0],
      last: last ? { winner: last.winner, loser: last.loser, kin: last.kin, convoy: last.convoy, age: tick - last.tick } : null,
      stars,
      roundTicks,
      par,
      hint: hint(),
    }
  }

  setupRound()
  return { step, pointer, affordances, observe, snapshot }
}
