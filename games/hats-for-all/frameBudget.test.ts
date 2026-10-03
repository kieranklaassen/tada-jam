import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { LEFT_ALONE_S } from './cycle'
import { Game, type Target } from './game'
import { hint } from './guide'
import { layCrew } from './layout'
import { bareSpots, hatsInTile } from './rules'
import { worldOf, type Saved } from './save'
import { FoamStage, type Guide } from './view/stage3d'

// The frame budget, counted and never timed, so it holds on a busy runner
// (docs/solutions/test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md).
// The scene is built with no renderer and driven through the busiest stretch
// a child makes: a full crew dressed, a tower built and a hat left loose, the
// parade, and the old crew walking off while the next walks in, with the idle
// ladder's glow and ghost hand shown throughout. Each frame the test counts
// what three would submit: every visible mesh in the camera's view, one draw
// each, and their triangles.

const FRAME = 1 / 60
/** The jam's bar is about 80 draw calls; this look's own is about 30. */
const DRAW_BUDGET = 30
/** Measured when written: 39,730 at the most, counting every mesh whole. */
const TRIANGLE_BUDGET = 45000

function count(stage: FoamStage): { draws: number; triangles: number } {
  stage.scene.updateMatrixWorld()
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(stage.camera.projectionMatrix, stage.camera.matrixWorldInverse))
  let draws = 0, triangles = 0
  stage.scene.traverse((object) => {
    if (!object.visible) return
    if (object instanceof THREE.Sprite) { draws += 1; triangles += 2; return }
    if (!(object instanceof THREE.Mesh)) return
    if (object.frustumCulled && !frustum.intersectsObject(object)) return
    const geometry = object.geometry as THREE.BufferGeometry, each = (geometry.index ? geometry.index.count : geometry.attributes.position?.count ?? 0) / 3
    if (each === 0) return
    draws += 1
    triangles += each * (object instanceof THREE.InstancedMesh ? object.count : 1)
  })
  return { draws, triangles }
}

type Seen = { draws: number; triangles: number; cast: number; hand: boolean; glows: number; loose: boolean; tower: boolean; walking: number }

function busiestStretch(): Seen[] {
  const position = 'spares-and-one-leaves', seed = 31
  const saved: Saved = { v: 1, position, finished: false, seed, shown: true, ...layCrew(position, seed).world }
  const game = new Game(saved), stage = new FoamStage(), seen: Seen[] = []
  stage.resize(1180, 820)
  // The idle ladder at its fullest: the glow up and the ghost hand pressing.
  const guide: Guide = { hint: { glow: [], hand: null }, glow: 1, press: 0.5, opacity: 1 }
  const run = (seconds: number): void => {
    for (let frame = 0; frame < Math.round(seconds * 60); frame++) {
      game.step(FRAME)
      game.play.cues.length = 0
      guide.hint = hint(game.saved)
      stage.update(game.play, guide)
      const world = worldOf(game.saved), cast = game.play.cast
      seen.push({
        ...count(stage), cast: cast.length, hand: guide.hint.hand !== null, glows: guide.hint.glow.length,
        loose: world.loose.length > 0, tower: world.crew.some((creature) => creature.hats.length > 1), walking: cast.filter((who) => game.play.walking(who)).length,
      })
    }
  }
  const tap = (target: Target): void => { game.press(target); game.tap() }
  const who = (spot: number): string => worldOf(game.saved).crew.find((creature) => creature.spot === spot)!.kind
  // Dress everyone, then build a tower and leave a hat loose: every kind of thing is on the mat at once.
  while (bareSpots(worldOf(game.saved)).length > 0 && hatsInTile(worldOf(game.saved)).length > 0) { tap({ type: 'creature', who: who(bareSpots(worldOf(game.saved))[0]) }); run(0.4) }
  const spare = hatsInTile(worldOf(game.saved))
  game.press({ type: 'hat', hat: spare[0] }); game.dragStart(); game.dragTo(0, 3, 0.8, 0, 0); run(0.2); game.letGo({ on: 'creature', who: worldOf(game.saved).crew[0].kind }); run(1)
  if (spare.length > 1) { tap({ type: 'hat', hat: spare[1] }); run(1.5) }
  // Set it right, as a child who looks would, and let the change and the parade play out.
  for (let guard = 0; guard < 30 && !game.saved.finished; guard++) {
    const world = worldOf(game.saved), tower = world.crew.find((creature) => creature.hats.length > 1)
    if (tower) tap({ type: 'hat', hat: tower.hats[tower.hats.length - 1] })
    else if (world.loose.length > 0) tap({ type: 'hat', hat: world.loose[0].hat })
    else if (bareSpots(world).length > 0 && hatsInTile(world).length > 0) tap({ type: 'creature', who: who(bareSpots(world)[0]) })
    else run(LEFT_ALONE_S + 0.1)
    run(0.8)
    while (game.sceneRunning) run(0.5)
  }
  run(6)
  // The old crew walks off as the next walks in.
  tap({ type: 'arch' })
  while (game.sceneRunning) run(0.5)
  run(1)
  stage.dispose()
  return seen
}

describe('frame budget', () => {
  const seen = busiestStretch()

  it('the stretch is the heavy one: a tower, a loose hat, a marching crew, two crews on the mat at once, the glow and the hand', () => {
    expect(seen.some((frame) => frame.tower)).toBe(true)
    expect(seen.some((frame) => frame.loose)).toBe(true)
    expect(Math.max(...seen.map((frame) => frame.walking))).toBeGreaterThanOrEqual(3)
    expect(Math.max(...seen.map((frame) => frame.cast))).toBeGreaterThanOrEqual(6)
    expect(seen.some((frame) => frame.hand)).toBe(true)
    expect(Math.max(...seen.map((frame) => frame.glows))).toBeGreaterThanOrEqual(2)
    expect(seen.length).toBeGreaterThan(1200)
  })

  it('every frame submits a small, bounded number of draws', () => {
    // Measured when written, with the glow and the hand shown on every frame: 20 at most, 18.5 on average, with seven creatures on the mat at the most.
    expect(Math.max(...seen.map((frame) => frame.draws)), 'most draws in one frame').toBeLessThanOrEqual(DRAW_BUDGET)
    expect(seen.reduce((sum, frame) => sum + frame.draws, 0) / seen.length, 'average draws a frame').toBeLessThanOrEqual(DRAW_BUDGET * 0.7)
  })

  it('and a bounded number of triangles, most of them the floor, which never changes', () => {
    expect(Math.max(...seen.map((frame) => frame.triangles)), 'most triangles in one frame').toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('draws a creature as one mesh: more creatures cost one draw each, and their hands and eyes none', () => {
    const few = seen.filter((frame) => frame.cast <= 3 && !frame.hand), many = seen.filter((frame) => frame.cast >= 6 && !frame.hand)
    if (few.length === 0 || many.length === 0) return
    const perCreature = (Math.max(...many.map((frame) => frame.draws)) - Math.min(...few.map((frame) => frame.draws))) / 3
    expect(perCreature).toBeLessThanOrEqual(3)
  })
})
