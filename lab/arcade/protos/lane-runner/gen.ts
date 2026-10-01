// Lays the track out ahead of the fox: a short wordless tutorial (switch, jump,
// roll, then a magnet as the reward), and after that rows picked by how long
// the run has been going. Every row leaves at least one way through.

import { clamp, lerp } from '../../kit/math.ts'
import { CART_LEN, FAR, TRAIN_LEN, TRAIN_V, thing } from './cam.ts'
import type { Kind, Power, Thing } from './cam.ts'

export interface GenInput {
  dist: number
  // Ground speed now, for spacing rows and sizing the coin arcs.
  speed: number
  // 0 is the gentlest; goes up every twenty seconds or so.
  tier: number
  zoneAt(d: number): number
  // A pickup to drop into the next row, if one is due.
  power: Power | null
}

export interface Gen {
  // Fills out to the far distance. True when the requested pickup was placed.
  fill(things: Thing[], input: GenInput): boolean
  // The child has touched: leave the coin-only warm-up and start teaching.
  begin(things: Thing[], dist: number): void
  readonly teaching: boolean
}

const COIN_H = 58
const LANES = [-1, 0, 1] as const

export function createGen(rand: () => number, startD: number): Gen {
  let nextD = startD
  let mode: 'warmup' | 'teach' | 'run' = 'warmup'
  let step = 0
  // A lane a train is running down, and how far up the track it still owns.
  let blockLane = 0
  let blockUntil = -1
  let lastPattern = ''

  const pickOf = <T>(items: readonly T[]): T => items[Math.min(items.length - 1, Math.floor(rand() * items.length))]

  const build = (things: Thing[], input: GenInput) => {
    const zone = (d: number) => input.zoneAt(d)
    const put = (kind: Kind, lane: number, d: number, extra: Partial<Thing> = {}) => {
      things.push(thing(kind, d, lane, { zone: zone(d), seed: rand(), ...extra }))
    }
    const coin = (lane: number, d: number, h = COIN_H) => put('coin', lane, d, { h })
    const coins = (lane: number, d: number, n: number, h = COIN_H, step = 190) => {
      for (let i = 0; i < n; i++) coin(lane, d + i * step, h)
    }
    const diag = (from: number, to: number, d: number, n: number) => {
      for (let i = 0; i < n; i++) coin(lerp(from, to, i / (n - 1)), d + i * 170)
    }
    // Coins over a barrier in the shape of the jump that clears it.
    const arc = (lane: number, d: number) => {
      const span = clamp(input.speed * 0.62, 680, 1350)
      // Now and then the top of the arc is a gem.
      const gem = mode === 'run' && rand() < 0.14
      for (let i = 0; i <= 6; i++) {
        const u = i / 6
        const h = COIN_H + 4 * 190 * u * (1 - u)
        if (gem && i === 3) put('coin', lane, d - span / 2 + u * span + 50, { h: h + 20, char: '💎' })
        else coin(lane, d - span / 2 + u * span + 50, h)
      }
    }
    const under = (lane: number, d: number) => coins(lane, d - 480, 6, 46)
    const obstacle = (kind: 'barrier' | 'beam' | 'cart', lane: number, d: number) => {
      put(kind, lane, d, { len: kind === 'cart' ? CART_LEN : 50 })
    }
    const critter = (lane: number, d: number) => put('critter', lane, d, { size: 70 })
    return { put, coin, coins, diag, arc, under, obstacle, critter }
  }

  // Returns the distance to leave before the next row.
  const warmup = (things: Thing[], input: GenInput, d: number): number => {
    const b = build(things, input)
    b.coins(0, d, 6)
    if (rand() < 0.5) b.critter(pickOf([-1, 1]), d + 500)
    return 1500
  }

  const teach = (things: Thing[], input: GenInput, d: number): number => {
    const b = build(things, input)
    step++
    if (step === 1) {
      b.coins(0, d, 5)
      return 1300
    }
    if (step === 2) {
      // Two lanes parked up; the coins lead round them.
      b.obstacle('cart', 0, d)
      b.obstacle('cart', 1, d)
      b.diag(0, -1, d - 1000, 5)
      b.coins(-1, d - 150, 5)
      return 1900
    }
    if (step === 3) {
      b.diag(-1, 0, d - 500, 5)
      b.coins(0, d + 350, 3)
      return 1500
    }
    if (step === 4) {
      for (const lane of LANES) {
        b.obstacle('barrier', lane, d)
        b.arc(lane, d)
      }
      return 2100
    }
    if (step === 5) {
      for (const lane of LANES) {
        b.obstacle('beam', lane, d)
        b.under(lane, d)
      }
      return 1900
    }
    // The reward: a magnet, then coins in every lane for it to hoover up.
    b.diag(-1, 0, d - 900, 5)
    b.diag(1, 0, d - 900, 5)
    b.coins(0, d - 900, 4, COIN_H, 230)
    b.put('pickup', 0, d, { h: 80, power: 'magnet' })
    for (const lane of LANES) b.coins(lane, d + 300, 9)
    b.critter(-1, d + 900)
    mode = 'run'
    return 2400
  }

  const run = (things: Thing[], input: GenInput, d: number): { gap: number; placed: boolean } => {
    const b = build(things, input)
    const tier = input.tier
    const avail = LANES.filter((lane) => !(lane === blockLane && d < blockUntil))
    const blocked = avail.length < 3
    const gapTime = lerp(1.25, 0.95, Math.min(tier, 5) / 5)
    const gap = clamp(input.speed * gapTime, 1200, 2500)

    if (input.power) {
      // A gift row: coins leading to the pickup, nothing in the way.
      const lane = pickOf(avail)
      b.coins(lane, d - 700, 4)
      b.put('pickup', lane, d, { h: 80, power: input.power })
      lastPattern = 'gift'
      return { gap: gap * 0.9, placed: true }
    }

    const options: [string, number][] = blocked
      ? [
          ['single', 4],
          ['line', 2],
        ]
      : [
          ['single', tier === 0 ? 5 : tier === 1 ? 4 : 3],
          ['double', tier === 0 ? 2 : 3],
          ['snake', tier === 0 ? 2 : 1],
          ['wallJump', tier >= 1 ? 2 : 0],
          ['wallRoll', tier >= 1 ? 2 : 0],
          ['train', tier >= 1 ? 3.2 : 0],
          ['wallMix', tier >= 2 ? 3 : 0],
        ]
    let total = 0
    for (const [name, weight] of options) total += name === lastPattern ? weight * 0.4 : weight
    let roll = rand() * total
    let pattern = options[0][0]
    for (const [name, weight] of options) {
      roll -= name === lastPattern ? weight * 0.4 : weight
      if (roll <= 0) {
        pattern = name
        break
      }
    }
    lastPattern = pattern

    if (pattern === 'single') {
      const lane = pickOf(avail)
      const kind = pickOf(['cart', 'cart', 'barrier', 'barrier', 'beam', 'beam'] as const)
      b.obstacle(kind, lane, d)
      if (kind === 'barrier') b.arc(lane, d)
      else if (kind === 'beam') b.under(lane, d)
      else {
        const others = avail.filter((l) => l !== lane)
        if (others.length > 0) b.coins(pickOf(others), d - 400, 6)
      }
      if (rand() < 0.35) {
        const others = avail.filter((l) => l !== lane)
        if (others.length > 0) b.critter(pickOf(others), d - 650)
      }
      return { gap, placed: false }
    }
    if (pattern === 'line') {
      b.coins(pickOf(avail), d - 300, 6)
      return { gap: gap * 0.8, placed: false }
    }
    if (pattern === 'double') {
      const free = pickOf(LANES)
      const low = tier >= 1 && rand() < 0.4 ? pickOf(LANES.filter((l) => l !== free)) : null
      for (const lane of LANES) {
        if (lane === free) continue
        if (lane === low) {
          const kind = rand() < 0.5 ? 'barrier' : 'beam'
          b.obstacle(kind, lane, d)
        } else b.obstacle('cart', lane, d)
      }
      b.coins(free, d - 650, 7)
      return { gap, placed: false }
    }
    if (pattern === 'snake') {
      const a = pickOf(LANES)
      const mid = a === 0 ? pickOf([-1, 1]) : 0
      const c = a === 0 ? a : -a
      b.coins(a, d, 3)
      b.diag(a, mid, d + 570, 4)
      b.diag(mid, c, d + 1250, 4)
      b.coins(c, d + 1930, 3)
      if (rand() < 0.7) b.critter(mid, d + 300)
      return { gap: 2500 + gap * 0.5, placed: false }
    }
    if (pattern === 'wallJump' || pattern === 'wallRoll') {
      const low = pattern === 'wallJump' ? 'barrier' : 'beam'
      const must = pickOf(LANES)
      for (const lane of LANES) {
        const kind = lane !== must && rand() < 0.4 ? 'cart' : low
        b.obstacle(kind, lane, d)
        if (kind === 'barrier') b.arc(lane, d)
        else if (kind === 'beam') b.under(lane, d)
      }
      return { gap: gap * 1.1, placed: false }
    }
    if (pattern === 'wallMix') {
      const kinds: ('barrier' | 'beam' | 'cart')[] = ['barrier', 'beam', 'cart']
      for (let i = kinds.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        const tmp = kinds[i]
        kinds[i] = kinds[j]
        kinds[j] = tmp
      }
      LANES.forEach((lane, i) => {
        const kind = kinds[i]
        b.obstacle(kind, lane, d)
        if (kind === 'barrier') b.arc(lane, d)
        else if (kind === 'beam') b.under(lane, d)
      })
      return { gap: gap * 1.1, placed: false }
    }
    // A train: it starts far beyond the row and meets the fox about there.
    const lane = pickOf(LANES)
    const eta = (d - input.dist) / Math.max(400, input.speed)
    const from = d + TRAIN_V * eta
    b.put('train', lane, from, { len: TRAIN_LEN })
    blockLane = lane
    blockUntil = from + TRAIN_LEN + 400
    const others = LANES.filter((l) => l !== lane)
    const coinLane = pickOf(others)
    b.coins(coinLane, d - 500, 8)
    if (tier >= 3 && rand() < 0.5) {
      const third = others.find((l) => l !== coinLane)
      if (third !== undefined) b.obstacle(rand() < 0.5 ? 'barrier' : 'beam', third, d + 200)
    }
    return { gap: gap * 1.25, placed: false }
  }

  return {
    fill(things, input) {
      let placed = false
      let power = input.power
      while (nextD < input.dist + FAR) {
        const d = nextD
        if (mode === 'warmup') nextD += warmup(things, input, d)
        else if (mode === 'teach') nextD += teach(things, input, d)
        else {
          const result = run(things, { ...input, power }, d)
          if (result.placed) {
            placed = true
            power = null
          }
          nextD += result.gap
        }
      }
      return placed
    },
    begin(things, dist) {
      if (mode !== 'warmup') return
      mode = 'teach'
      step = 0
      // Clear the warm-up coins beyond what the fox is about to reach.
      const keep = dist + 1500
      for (const t of things) {
        if ((t.kind === 'coin' || t.kind === 'critter') && t.d > keep) t.gone = true
      }
      nextD = keep + 250
    },
    get teaching() {
      return mode === 'teach'
    },
  }
}
