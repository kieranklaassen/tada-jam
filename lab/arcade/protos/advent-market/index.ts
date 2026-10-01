// Advent Market: the advent fair of a Waldorf school. A hall to wander, four
// stalls where the child does the real craft (candle dipping, window stars,
// wreath binding, gingerbread), the advent spiral in a darkened room, and a
// windowsill at home where the basket is unpacked. Nothing is sold, counted
// or hurried; the visit ends when the child walks the spiral and goes home,
// and begins again when they take the basket from its hook.
//
// This file is the shell: which place we are in, the soft change from one to
// the next, and the basket that carries what was made.

import { clamp, ease, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { createAppleTable } from './apple.ts'
import { BASKET, basketBack, basketFront, makeGlow, makeSprite, mulberry, put } from './art.ts'
import type { G, Sprite } from './art.ts'
import { createCandleStall } from './candle.ts'
import { createCave } from './cave.ts'
import { createGingerStall } from './ginger.ts'
import { createHome } from './home.ts'
import { createMarket } from './market.ts'
import { BASKET_AT, createSounds, nearBasket } from './shared.ts'
import { createSpiral } from './spiral.ts'
import { createStarStall } from './stars.ts'
import { createWreathStall } from './wreath.ts'
import type { Made, Memory, Place, Scene, StallKey, Visit, World } from './shared.ts'

// Kept for the whole session, across visits and restarts: the candles set
// down on the spiral stay there.
const memory: Memory = { visits: 0, spiral: [] }

const STALLS: readonly Place[] = ['candle', 'stars', 'wreath', 'ginger', 'cave', 'apple']

interface Flight {
  made: Made
  t: number
  delay: number
}

function create(stage: Stage): Game {
  const dpr = clamp(Math.round(globalThis.devicePixelRatio || 1), 1, 2)
  const snd = createSounds(stage.sfx)
  const visit: Visit = { n: memory.visits, basket: [], given: false }

  const halo = makeGlow('rgba(255,214,130,0.5)', 'rgba(255,180,90,0.2)', 'rgba(255,150,70,0.06)')
  const haloDark = makeGlow('rgba(255,206,120,0.7)', 'rgba(255,160,80,0.3)', 'rgba(255,130,60,0.09)')
  const basketBackSprite: Sprite = makeSprite(220, 250, dpr, (g) => {
    g.translate(110, 140)
    basketBack(g)
  })
  const basketFrontSprite: Sprite = makeSprite(220, 250, dpr, (g) => {
    g.translate(110, 140)
    basketFront(g, mulberry(12))
  })

  let place: Place = 'market'
  let next: Place | null = null
  let veil = 0
  let phase: 'none' | 'out' | 'in' = 'none'
  let focusX = W / 2
  let focusY = H / 2
  let sinceTouch = 0
  const flights: Flight[] = []
  let leaving = false
  // The basket's little bounce when something lands in it or it is touched.
  let bounce = 0
  let bounceV = 0

  const scenes: Partial<Record<Place, Scene>> = {}
  const factories: Partial<Record<Place, (w: World) => Scene>> = {
    market: createMarket,
    candle: createCandleStall,
    stars: createStarStall,
    wreath: createWreathStall,
    ginger: createGingerStall,
    cave: createCave,
    apple: createAppleTable,
    spiral: createSpiral,
    home: createHome,
  }

  const world: World = {
    stage,
    snd,
    dpr,
    bg: Math.min(dpr, 1.5),
    visit,
    memory,
    halo,
    haloDark,
    go(to, fx = W / 2, fy = H / 2) {
      if (phase === 'out' || !factories[to]) return
      next = to
      phase = 'out'
      focusX = fx
      focusY = fy
    },
    stepBack() {
      if (leaving || phase === 'out') return
      leaving = true
      const made = scenes[place]?.made?.() ?? []
      made.forEach((m, i) => flights.push({ made: m, t: 0, delay: i * 0.12 }))
      bounceV -= 3
      snd.cloth()
      stage.after(made.length === 0 ? 0.12 : 0.5 + made.length * 0.12, () => {
        leaving = false
        world.go('market')
      })
    },
    quiet(x, y) {
      stage.fx.burst(x, y, { count: 3, color: ['#ffe2a8', '#f6c878'], speed: 28, life: 0.8, size: 3.5, gravity: -34, drag: 0.96 })
      stage.sfx.tone({ freq: 196 * (1 + (Math.random() - 0.5) * 0.06), to: 150, dur: 0.09, type: 'sine', vol: 0.04 })
    },
    again() {
      memory.visits++
      visit.n = memory.visits
      visit.basket = []
      visit.given = false
      for (const key of Object.keys(scenes) as Place[]) scenes[key]?.reset?.()
      world.go('market')
    },
    basket(g, x, y, items, squash = 0) {
      g.save()
      g.translate(x, y)
      g.scale(1 - squash * 0.05, 1 + squash * 0.07)
      put(g, basketBackSprite, -110, -140)
      drawContents(g, items, stage.time)
      put(g, basketFrontSprite, -110, -140)
      g.restore()
    },
  }

  const scene = (p: Place): Scene => {
    let s = scenes[p]
    if (!s) {
      const make = factories[p] ?? createMarket
      s = make(world)
      scenes[p] = s
    }
    return s
  }
  scene('market').enter?.()

  const isStall = (p: Place): boolean => STALLS.includes(p)
  const showsBasket = (p: Place): boolean => p === 'market' || isStall(p)

  const arrive = (to: Place): void => {
    place = to
    flights.length = 0
    // Back at a stall, its things are on the table again, not in the basket.
    if (isStall(to)) visit.basket = visit.basket.filter((m) => m.from !== (to as StallKey))
    scene(to).enter?.()
  }

  // The things in the basket, each kind in its own corner.
  function drawContents(g: G, items: readonly Made[], t: number): void {
    let candles = 0
    let biscuits = 0
    let apples = 0
    const order = ['wreath', 'star', 'biscuit', 'apple', 'crystal', 'candle'] as const
    for (const kind of order) {
      for (const m of items) {
        if (m.kind !== kind) continue
        g.save()
        if (kind === 'wreath') {
          g.translate(-8, -34)
          g.rotate(-0.12)
          m.draw(g, 0, 0, 132 / m.h, t)
        } else if (kind === 'star') {
          g.translate(46, -46)
          g.rotate(0.2)
          m.draw(g, 0, 0, 112 / m.h, t)
        } else if (kind === 'biscuit') {
          g.translate(-46 + biscuits * 34, -10 - (biscuits % 2) * 8)
          g.rotate(-0.3 + biscuits * 0.22)
          m.draw(g, 0, 0, 62 / m.h, t)
          biscuits++
        } else if (kind === 'apple') {
          m.draw(g, -60 + apples * 30, 14 + (apples % 2) * 8, 0.36, t)
          apples++
        } else if (kind === 'crystal') {
          m.draw(g, 62, 4, 0.7, t)
        } else {
          g.translate(-30 + candles * 19, 44)
          g.rotate(-0.3 + candles * 0.17)
          m.draw(g, 0, 0, 0.56, t)
          candles++
        }
        g.restore()
      }
    }
  }

  const drawBasket = (g: G): void => {
    const x = BASKET_AT.x
    const y = BASKET_AT.y + bounce * 14
    g.fillStyle = 'rgba(24,10,8,0.3)'
    g.beginPath()
    g.ellipse(x + 6, BASKET_AT.y + BASKET.depth + 4, BASKET.rx * 0.92, 13, 0, 0, Math.PI * 2)
    g.fill()
    world.basket(g, x, y, visit.basket, bounce)
  }

  const drawFlights = (g: G, t: number): void => {
    for (const f of flights) {
      if (f.t <= 0) continue
      const k = ease.inOutCubic(clamp(f.t, 0, 1))
      const x = lerp(f.made.x, BASKET_AT.x, k)
      const y = lerp(f.made.y, BASKET_AT.y - 20, k) - Math.sin(k * Math.PI) * 120
      const flat = f.made.kind === 'star' || f.made.kind === 'wreath' || f.made.kind === 'biscuit'
      const small = flat ? 110 / f.made.h : f.made.kind === 'apple' ? 0.36 : 0.56
      const s = lerp(1, small, k)
      f.made.draw(g, x, flat ? y : y + (f.made.h * s) / 2, s, t)
    }
  }

  return {
    update(dt) {
      if (phase === 'out') {
        veil = Math.min(1, veil + dt / 0.3)
        if (veil >= 1 && next) {
          arrive(next)
          next = null
          phase = 'in'
        }
      } else if (phase === 'in') {
        veil = Math.max(0, veil - dt / 0.45)
        if (veil <= 0) phase = 'none'
      }
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i]!
        if (f.delay > 0) {
          f.delay -= dt
          continue
        }
        f.t += dt / 0.48
        if (f.t >= 1) {
          flights.splice(i, 1)
          visit.basket.push(f.made)
          bounceV += 2.2
          snd.wood(0.45)
        }
      }
      bounceV += (-130 * bounce - 12 * bounceV) * dt
      bounce += bounceV * dt
      // Left alone at a stall with something made, the basket's handle stirs
      // once in a long while: it is the way back.
      sinceTouch += dt
      if (isStall(place) && phase === 'none' && sinceTouch > 12) {
        sinceTouch = 4
        if ((scenes[place]?.made?.().length ?? 0) > 0) bounceV -= 1.1
      }
      scene(place).update(dt)
    },
    draw(g) {
      const t = stage.time
      // Stepping closer: the place we leave swells a little toward what was
      // touched, and the place we arrive at settles from just beyond it.
      const k = ease.inOutQuad(veil)
      const zoom = phase === 'out' ? 1 + k * 0.16 : phase === 'in' ? 1 + k * 0.05 : 1
      const zx = phase === 'out' ? focusX : W / 2
      const zy = phase === 'out' ? focusY : H / 2
      g.save()
      if (zoom !== 1) {
        g.translate(zx, zy)
        g.scale(zoom, zoom)
        g.translate(-zx, -zy)
      }
      scene(place).draw(g)
      if (showsBasket(place)) {
        drawBasket(g)
        drawFlights(g, t)
      }
      g.restore()
      if (veil > 0.003) {
        g.fillStyle = `rgba(26,13,14,${ease.inOutQuad(veil)})`
        g.fillRect(0, 0, W, H)
      }
    },
    down(p: Pointer) {
      sinceTouch = 0
      if (phase === 'out' || leaving) return
      if (showsBasket(place) && nearBasket(p.x, p.y)) {
        if (isStall(place)) world.stepBack()
        else {
          bounceV -= 3.4
          snd.cloth()
        }
        return
      }
      scene(place).down?.(p)
    },
    move(p: Pointer) {
      if (phase === 'out') return
      scene(place).move?.(p)
    },
    up(p: Pointer) {
      scene(place).up?.(p)
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'advent-market',
    name: 'Advent Market',
    emoji: '🕯️',
    ages: [3, 7],
    pitch: 'Wander a Waldorf advent fair: dip a beeswax candle, fold a window star, bind a wreath, ice gingerbread, then walk the advent spiral and carry it all home.',
    howTo: 'Slide the hall with a finger; touch a stall to step up to it and the basket to step back. The dark doorway is the advent spiral: walk a candle in, light it, set it down, and the door leads home.',
    basedOn: 'The advent fair and advent spiral of a Waldorf kindergarten: candle dipping, kite-paper window stars, wreath binding, gingerbread.',
    whyFun: 'Thick warm wax that fattens the candle with every dip, and a different real craft for the hand at every stall.',
    set: 'gentle',
  },
  create,
}
