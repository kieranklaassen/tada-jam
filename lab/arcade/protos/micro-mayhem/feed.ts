// FEED! Three hungry animals, one snack. Drag it (or tap the animal) to feed
// the one whose thought bubble shows it.

import { circle, ellipse, rrect, shadow, sprite } from '../../kit/draw.ts'
import { clamp, damp, dist, ease, lerp, rnd, shuffle, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import type { Pointer } from '../../kit/types.ts'
import { H, W } from '../../kit/types.ts'
import { vgrad } from './micro.ts'
import type { Env, Micro, MicroDef } from './micro.ts'

const PAIRS: readonly [string, string][] = [
  ['🐶', '🦴'],
  ['🐰', '🥕'],
  ['🐭', '🧀'],
  ['🐵', '🍌'],
  ['🐱', '🐟'],
  ['🐻', '🍯'],
  ['🐼', '🎋'],
  ['🐷', '🌽'],
  ['🐴', '🍎'],
  ['🐸', '🪰'],
]
const ANIMAL_Y = 400
const PLATE: [number, number] = [W / 2, 665]

interface Animal {
  who: string
  wants: string
  x: number
  bounce: Spring
  seed: number
}

function make(env: Env): Micro {
  const { fx, sfx, stage } = env
  const count = env.level >= 2 ? 4 : 3
  const chosen = shuffle(PAIRS, stage.rand).slice(0, count)
  const animals: Animal[] = chosen.map(([who, wants], i) => ({
    who,
    wants,
    x: W / 2 + (i - (count - 1) / 2) * (count === 4 ? 265 : 330),
    bounce: spring(0.4, 200, 9),
    seed: i * 1.9,
  }))
  for (const a of animals) a.bounce.target = 1
  const target = Math.floor(stage.rand() * count)
  const snack = chosen[target]![1]
  const food = { x: PLATE[0], y: PLATE[1], held: false, flying: false, gone: false }
  const foodPop = spring(0.3, 220, 9)
  foodPop.target = 1
  let fedTo = -1
  let spit = 0
  let lastRattle = -1

  const near = (x: number, y: number, reach: number): number => {
    let best = -1
    let bestD = reach
    animals.forEach((a, i) => {
      const d = dist(x, y, a.x, ANIMAL_Y)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    return best
  }

  const arrive = (i: number) => {
    const a = animals[i]!
    fedTo = i
    food.gone = true
    food.flying = false
    a.bounce.value = 1.35
    if (i === target) {
      sfx.chomp()
      env.after(0.16, () => sfx.chomp())
      fx.burst(a.x, ANIMAL_Y - 40, { count: 16, color: ['#ff7ac8', '#ff5d6c'], speed: 460, life: 0.9, size: 18, shape: 'heart', gravity: 200 })
      for (const o of animals) o.bounce.kick(4)
      env.win()
    } else {
      // Wrong mouth: it goes green and spits the snack clean off the screen.
      sfx.tone({ freq: 300, to: 110, dur: 0.35, type: 'sawtooth', vol: 0.16 })
      sfx.whoosh()
      fx.burst(a.x, ANIMAL_Y + 20, { count: 12, color: ['#a6e04a', '#d9ff7a'], speed: 380, life: 0.6, size: 12 })
      fx.shake(7, 0.2)
      env.lose()
    }
  }

  const send = (i: number) => {
    if (food.flying || food.gone) return
    const a = animals[i]!
    const fromX = food.x
    const fromY = food.y
    food.flying = true
    food.held = false
    sfx.whoosh()
    stage.tween(
      0.2,
      (k) => {
        if (food.gone) return
        food.x = lerp(fromX, a.x, k)
        food.y = lerp(fromY, ANIMAL_Y + 40, k) - Math.sin(k * Math.PI) * 90
      },
      ease.inOutQuad,
      () => {
        if (!food.gone && env.state === 'play') arrive(i)
      },
    )
  }

  return {
    update(dt) {
      for (const a of animals) a.bounce.update(dt)
      foodPop.update(dt)
      if (fedTo >= 0 && env.state === 'lost') spit += dt
      if (!food.held && !food.flying && !food.gone) {
        food.x = damp(food.x, PLATE[0], 14, dt)
        food.y = damp(food.y, PLATE[1], 14, dt)
      }
    },
    draw(g) {
      const t = env.age
      const hungry = env.state === 'lost' && fedTo < 0
      animals.forEach((a, i) => {
        const s = clamp(a.bounce.value, 0.3, 1.6)
        const isFed = fedTo === i
        const happy = env.state === 'won'
        const bob = happy ? Math.abs(Math.sin(env.since * 10 + a.seed)) * (isFed ? 50 : 22) : Math.sin(t * 3 + a.seed) * 6
        const tilt = hungry ? Math.sin(env.since * 40 + a.seed) * 0.12 : food.held ? clamp((food.x - a.x) / 900, -0.2, 0.2) : Math.sin(t * 2 + a.seed) * 0.05
        const who = isFed && env.state === 'lost' ? '🤢' : a.who
        // Bib.
        ellipse(g, a.x, ANIMAL_Y + 118, 70, 46, '#ffffff')
        ellipse(g, a.x, ANIMAL_Y + 112, 58, 36, ['#ff8fa3', '#8fd3ff', '#ffe08a', '#b7f09a'][i % 4]!)
        sprite(g, who, a.x, ANIMAL_Y - bob, 215 * s, tilt)
        if (hungry) sprite(g, '💧', a.x + 70, ANIMAL_Y + 10 + ((env.since * 160 + i * 30) % 90), 36)
        // Thought bubble with what it wants.
        if (!(isFed && env.state !== 'play')) {
          const by = ANIMAL_Y - 215 + Math.sin(t * 2.4 + a.seed) * 7
          const pulse = ease.outBack(clamp((t - 0.1 - i * 0.07) / 0.25, 0, 1))
          circle(g, a.x + 52, by + 96, 9 * pulse, '#ffffff')
          circle(g, a.x + 62, by + 72, 14 * pulse, '#ffffff')
          ellipse(g, a.x + 40, by, 78 * pulse, 62 * pulse, '#ffffff')
          sprite(g, a.wants, a.x + 40, by, 84 * pulse, Math.sin(t * 5 + a.seed) * 0.12)
        }
      })
      // The counter in front of them.
      rrect(g, -10, 520, W + 20, 60, 10, '#c98a4f', '#8f5a2c', 6)
      g.fillStyle = '#a86f3c'
      g.fillRect(0, 580, W, 22)

      // The plate and the snack.
      ellipse(g, PLATE[0], PLATE[1] + 46, 130, 28, 'rgba(0,0,0,0.18)')
      ellipse(g, PLATE[0], PLATE[1] + 36, 124, 30, '#ffffff')
      ellipse(g, PLATE[0], PLATE[1] + 33, 92, 19, '#e9eef7')
      if (!food.gone) {
        const lifted = food.held || food.flying
        if (lifted) shadow(g, food.x, Math.min(H - 60, food.y + 120), 50, 0.8, 0.15)
        const wiggle = lifted ? Math.sin(t * 18) * 0.12 : Math.sin(t * 5) * 0.1
        sprite(g, snack, food.x, food.y - (lifted ? 10 : Math.abs(Math.sin(t * 5)) * 12), 130 * clamp(foodPop.value, 0.3, 1.6) * (lifted ? 1.15 : 1), wiggle)
      } else if (env.state === 'lost' && fedTo >= 0) {
        const a = animals[fedTo]!
        const dir = a.x < W / 2 ? 1 : -1
        sprite(g, snack, a.x + dir * spit * 1300, ANIMAL_Y + 40 - spit * 900 + spit * spit * 1400, 120, spit * 20)
      }
    },
    down(p: Pointer) {
      if (env.state !== 'play' || food.flying || food.gone) return
      const tapped = near(p.x, p.y, 150)
      if (tapped >= 0 && p.y < 520) {
        send(tapped)
        return
      }
      if (dist(p.x, p.y, food.x, food.y) < 170 || p.y > 540) {
        food.held = true
        food.x = p.x
        food.y = p.y - 30
        foodPop.value = 1.4
        sfx.pop(2)
        return
      }
      if (env.age - lastRattle > 0.1) {
        lastRattle = env.age
        foodPop.kick(5)
        sfx.note(-3 + Math.round(rnd(0, 2)), 0.07, 'triangle', 0.13)
        fx.burst(p.x, p.y, { count: 5, color: '#ffffff', speed: 180, life: 0.3, size: 8, gravity: 0 })
      }
    },
    move(p: Pointer) {
      if (env.state !== 'play' || food.flying || food.gone) return
      // A finger already down when the game appeared picks the snack up too.
      if (!food.held && dist(p.x, p.y, food.x, food.y) < 150) food.held = true
      if (!food.held) return
      food.x = p.x
      food.y = p.y - 30
      // Fudged in the child's favour: brushing past the right mouth feeds it, a
      // wrong mouth only counts when the snack is let go there.
      if (near(food.x, food.y, 125) === target) arrive(target)
    },
    up() {
      if (!food.held) return
      food.held = false
      if (env.state !== 'play') return
      const i = near(food.x, food.y, 230)
      if (i >= 0) send(i)
      else sfx.boing(-2)
    },
    timeout() {
      sfx.noise({ dur: 0.7, freq: 90, to: 160, vol: 0.3, filter: 'lowpass', q: 4 })
      sfx.tone({ freq: 70, to: 110, dur: 0.7, type: 'sawtooth', vol: 0.12 })
      fx.shake(6, 0.5)
      env.lose()
    },
    resultWord() {
      return env.state === 'lost' && fedTo < 0 ? 'HANGRY!' : null
    },
    hint() {
      const a = animals[target]!
      const k = (env.age * 0.8) % 1
      return [lerp(PLATE[0], a.x, ease.inOutQuad(k)), lerp(PLATE[1], ANIMAL_Y + 40, ease.inOutQuad(k))]
    },
  }
}

export const feed: MicroDef = {
  key: 'feed',
  word: 'FEED!',
  icon: '🍽️',
  winWord: 'YUM!',
  loseWord: 'BLEH!',
  backdrop(g) {
    vgrad(g, 0, H, '#3fb8af', '#7fd8c8')
    // Diner wall: tiles below, bunting above.
    g.fillStyle = 'rgba(255,255,255,0.12)'
    for (let y = 300; y < 520; y += 56) for (let x = ((y / 56) % 2) * 28 - 28; x < W; x += 56) g.fillRect(x + 3, y + 3, 50, 50)
    g.strokeStyle = '#ffffff'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(0, 96)
    g.quadraticCurveTo(W / 2, 170, W, 96)
    g.stroke()
    const flags = ['#ff5d6c', '#ffc93c', '#5ed36a', '#4db8ff', '#b07cff']
    for (let i = 0; i < 12; i++) {
      const k = (i + 0.5) / 12
      const x = k * W
      const y = 96 + 74 * (1 - (2 * k - 1) ** 2) * 1
      g.fillStyle = flags[i % flags.length]!
      g.beginPath()
      g.moveTo(x - 30, y - 4)
      g.lineTo(x + 30, y - 4)
      g.lineTo(x, y + 56)
      g.closePath()
      g.fill()
    }
    // Floor under the counter.
    vgrad(g, 600, H, '#f7e3c0', '#e8cfa0')
    g.fillStyle = 'rgba(0,0,0,0.06)'
    for (let x = 0; x < W; x += 118) g.fillRect(x, 600, 59, H - 600)
  },
  make,
}
