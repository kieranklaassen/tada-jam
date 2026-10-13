import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { Placed } from './blocks'
import { HOLE, grilleBars, restsFor } from './castle'
import { SIZE } from './layout'
import { Play } from './play'
import { buildFolk, type Manner } from './view/folkView'

// The dragon as he is drawn, with his nose under his gate, against the iron of the grille, the wood of the
// arch and the ground he lies on: every corner of his head, his jaw, his eyes and their lids, at every sixtieth of a second.

const CASTLE: Placed[] = [
  { kind: 'cube', col: 0, row: 1 }, { kind: 'arch', col: 3, row: 0 }, { kind: 'thin', col: 0, row: 0 }, { kind: 'round', col: 6, row: 0 },
  { kind: 'slope', col: 0, row: 2 }, { kind: 'long', col: 4, row: 0 }, { kind: 'round', col: 2, row: 0 }, { kind: 'cube', col: 6, row: 1 },
]
const HEAD = ['dragon-head', 'dragon-jaw', 'dragon-lid', 'dragon-pupils']

function watch(script: (play: Play, frame: number, gate: number) => void, frames: number): { iron: number; wood: number; lifted: number; lowest: number; landed: number; ground: number } {
  const play = new Play(CASTLE, 1, true)
  const { evening } = play
  const gate = evening.rests.dragon.thing
  const thing = evening.things[gate]
  const dragon = buildFolk().dragon
  const manner: Manner = { sits: 0, high: 0, tuck: 0, shake: 0, time: 0 }
  const parts: THREE.Mesh[] = []
  dragon.root.traverse((part) => { if (HEAD.includes(part.name)) parts.push(part as THREE.Mesh) })
  const [w, h, d] = SIZE.arch
  const p = new THREE.Vector3()
  const seen = { iron: 0, wood: 0, lifted: 0, lowest: 1, landed: 0, ground: 0 }
  for (let frame = 0; frame < frames; frame++) {
    script(play, frame, gate)
    play.advance(1 / 60)
    manner.tuck = evening.tucked
    manner.time = frame / 60
    dragon.apply(play.folk.pose('dragon'), evening.actors.dragon.placing, manner)
    dragon.root.updateMatrixWorld(true)
    const down = evening.grille(gate)
    seen.lowest = Math.min(seen.lowest, down)
    seen.landed = Math.max(seen.landed, down)
    seen.lifted = Math.max(seen.lifted, evening.noseLift())
    const bars = grilleBars(thing, down)
    for (const part of parts) {
      const at = part.geometry.getAttribute('position')
      for (let i = 0; i < at.count; i++) {
        p.fromBufferAttribute(at, i).applyMatrix4(part.matrixWorld)
        seen.ground = Math.max(seen.ground, thing.base - p.y)
        for (const bar of bars) {
          const inside = Math.min(bar.wide / 2 - Math.abs(p.x - bar.x), bar.tall / 2 - Math.abs(p.y - bar.y), bar.deep / 2 - Math.abs(p.z - bar.z))
          seen.iron = Math.max(seen.iron, inside)
        }
        const x = p.x - thing.x, y = p.y - thing.base, z = p.z - thing.z
        if (Math.abs(x) < w / 2 && Math.abs(z) < d / 2 && y < h) {
          const out = y < HOLE.legs ? Math.abs(x) - HOLE.round : Math.hypot(x, y - HOLE.legs) - HOLE.round
          seen.wood = Math.max(seen.wood, Math.min(out, d / 2 - Math.abs(z)))
        }
      }
    }
  }
  return seen
}

describe("the dragon's head under his gate", () => {
  it('lies under the gate in this castle', () => {
    expect(restsFor(CASTLE).dragon.how).toBe('gate')
  })

  it.each([
    ['at rest, yawning when he yawns', (): void => {}, 60 * 45],
    ['poked again and again', (play: Play, frame: number): void => { if (frame % 100 === 20) play.folk.stir('dragon', 'poke') }, 60 * 12],
    ['with the gate tapped', (play: Play, frame: number, gate: number): void => { if (frame % 240 === 30) play.evening.act(gate) }, 60 * 12],
    ['poked while the grille comes down', (play: Play, frame: number, gate: number): void => {
      if (frame % 300 === 30) play.evening.act(gate)
      if (frame % 300 === 30 + 12 * (Math.floor(frame / 300) + 1)) play.folk.stir('dragon', 'poke')
    }, 60 * 40],
  ] as const)('is never in the iron of the grille, the wood of the arch or the ground: %s', (_name, script, frames) => {
    const seen = watch(script, frames)
    expect(seen.iron).toBeLessThanOrEqual(0.005)
    expect(seen.wood).toBeLessThanOrEqual(0.005)
    expect(seen.ground).toBeLessThanOrEqual(0.005)
  })

  it('has the grille lifted by his head when he is poked, and on the ground while his nose is tucked in', () => {
    const poked = watch((play, frame) => { if (frame === 20) play.folk.stir('dragon', 'poke') }, 240)
    expect(poked.lifted).toBeGreaterThan(0.3)
    expect(poked.lowest).toBeLessThan(0.2)
    expect(poked.landed).toBeLessThan(0.25)
    const tapped = watch((play, frame, gate) => { if (frame === 20) play.evening.act(gate) }, 240)
    expect(tapped.landed).toBeGreaterThan(0.99)
  })
})
