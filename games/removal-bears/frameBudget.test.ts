import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { Game } from './game'
import { hint } from './guide'
import { freshSave } from './save'
import { Stage } from './view/stage3d'

// What a frame submits, counted and never timed: the scene with no renderer,
// through a first showing, with the glow and the hand up.

const DRAWS = 60, TRIANGLES = 60000

describe('a frame', () => {
  it('stays inside its budget', () => {
    const stage = new Stage(), game = new Game(freshSave(5, 4))
    stage.resize(1180, 820)
    game.begin()
    let draws = 0, triangles = 0
    for (let i = 0; i < 400; i++) {
      game.step(1 / 20)
      if (i === 320) game.tap({ type: 'cart' })
      stage.update(game, { hint: hint(game, 0), glow: 1, press: 0.5, opacity: 1 }, 1 / 20)
      let d = 0, t = 0
      stage.scene.traverseVisible((o) => {
        if (o instanceof THREE.Sprite) { d += 1; return }
        if (!(o instanceof THREE.Mesh)) return
        const g = o.geometry as THREE.BufferGeometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3
        d += 1
        t += n * (o instanceof THREE.InstancedMesh ? o.count : 1)
      })
      draws = Math.max(draws, d); triangles = Math.max(triangles, t)
    }
    console.log(draws, triangles)
    expect(draws).toBeLessThanOrEqual(DRAWS)
    expect(triangles).toBeLessThanOrEqual(TRIANGLES)
  })
})
