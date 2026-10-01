// The reference arcade prototype: a blob that hops to wherever you tap and
// gobbles the strawberries it lands on. It is here to show the kit in use
// (springs for squash, a face, emoji sprites, fx and rising sound on a streak,
// an idle hint), not to be one of the 30.

import { blinkAt, face, ellipse, hint, label, shadow, sky, sprite, squash, volume } from '../draw.ts'
import { clamp, dist, ease, lerp, rnd, spring } from '../math.ts'
import { H, W } from '../types.ts'
import type { Game, Pointer, Proto, Stage } from '../types.ts'

const GROUND = H - 120

interface Berry {
  x: number
  y: number
  // 0..1, pops in with overshoot.
  grow: number
  bob: number
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const blob = { x: W / 2, y: GROUND, fromX: W / 2, toX: W / 2, hop: 1, height: 0 }
  // One spring drives the squash: 1 is round, above 1 is tall, below is flat.
  const stretch = spring(1, 220, 10)
  const berries: Berry[] = []
  let eaten = 0
  let streak = 0
  let lastEatAt = -10
  let lastTouchAt = 0
  let mood: 'happy' | 'yum' | 'wow' = 'happy'

  const addBerry = () => {
    berries.push({ x: lerp(100, W - 100, stage.rand()), y: GROUND - 30, grow: 0, bob: rnd(0, 6) })
    const berry = berries[berries.length - 1]!
    stage.tween(0.4, (t) => (berry.grow = t), ease.outBack)
  }
  for (let i = 0; i < 4; i++) addBerry()

  const land = () => {
    stretch.value = 0.6
    fx.burst(blob.x, GROUND, { count: 10, color: '#ffffff', speed: 260, angle: -Math.PI / 2, spread: Math.PI, life: 0.4, size: 9 })
    sfx.thud(0.6)
    for (let i = berries.length - 1; i >= 0; i--) {
      const berry = berries[i]!
      if (dist(berry.x, berry.y, blob.x, GROUND - 30) > 95) continue
      berries.splice(i, 1)
      streak = stage.time - lastEatAt < 2.5 ? streak + 1 : 0
      lastEatAt = stage.time
      eaten++
      mood = 'yum'
      stage.after(0.5, () => (mood = 'happy'))
      sfx.chomp()
      sfx.coin(streak)
      fx.burst(berry.x, berry.y, { count: 14, color: ['#ff4d6d', '#ff8fa3', '#7bd88f'], speed: 380, life: 0.7 })
      fx.text(berry.x, berry.y - 60, streak > 1 ? `YUM x${streak + 1}!` : 'YUM!', { color: '#fff3b0', size: 40 + Math.min(streak, 5) * 6 })
      if (streak >= 2) fx.shake(4 + Math.min(streak, 4) * 2)
      stage.after(0.6, addBerry)
    }
  }

  return {
    update(dt) {
      if (blob.hop < 1) {
        blob.hop = Math.min(1, blob.hop + dt / 0.45)
        blob.x = lerp(blob.fromX, blob.toX, ease.inOutQuad(blob.hop))
        blob.height = Math.sin(blob.hop * Math.PI) * 190
        if (blob.hop === 1) land()
      }
      stretch.update(dt)
      for (const berry of berries) berry.bob += dt * 3
    },
    draw(g) {
      sky(g, '#7fd4ff', '#d8f6ff')
      ellipse(g, W / 2, H + 60, W * 0.8, 200, '#6fcf6f')
      ellipse(g, W / 2, H + 90, W * 0.8, 200, '#57b85c')

      for (const berry of berries) {
        shadow(g, berry.x, GROUND + 4, 30, berry.grow)
        sprite(g, '🍓', berry.x, berry.y + Math.sin(berry.bob) * 5, 64 * berry.grow)
      }

      const y = GROUND - blob.height
      shadow(g, blob.x, GROUND + 6, 80, 1 - blob.height / 400)
      // Stretch while rising and falling, squash from the spring on landing.
      const air = blob.hop < 1 ? 1 + Math.abs(Math.cos(blob.hop * Math.PI)) * 0.25 : 1
      const [sx, sy] = volume(stretch.value * air)
      squash(g, blob.x, y, sx, sy, () => {
        ellipse(g, blob.x, y - 70, 80, 72, '#b07cff')
        ellipse(g, blob.x - 26, y - 100, 22, 14, 'rgba(255,255,255,0.35)', -0.5)
        const look = clamp((blob.toX - blob.x) / 200, -1, 1)
        face(g, blob.x, y - 84, 15, blob.hop < 1 ? 'wow' : mood, look, blob.hop < 1 ? -0.5 : 0, blinkAt(stage.time))
      })

      label(g, `🍓 ${eaten}`, 90, 60, 44)
      const first = berries[0]
      if (stage.time - lastTouchAt > 5 && first && blob.hop === 1) hint(g, first.x, first.y, stage.time)
    },
    down(p: Pointer) {
      lastTouchAt = stage.time
      fx.ring(p.x, p.y, '#ffffff', 50, 0.3)
      if (blob.hop < 1) return
      blob.fromX = blob.x
      blob.toX = clamp(p.x, 80, W - 80)
      blob.hop = 0
      // Anticipation: a quick crouch before the jump.
      stretch.value = 0.75
      stretch.kick(6)
      sfx.boing(Math.round(rnd(-1, 2)))
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'example',
    name: 'Hoppy Blob',
    emoji: '🍓',
    ages: [3, 6],
    pitch: 'Tap anywhere and the blob hops there; land on a strawberry to gobble it.',
    howTo: 'Tap where the blob should hop.',
    basedOn: 'the kit reference, not one of the 30',
    whyFun: 'A big jump with squash on every tap, and a streak sound that climbs.',
  },
  create,
}
