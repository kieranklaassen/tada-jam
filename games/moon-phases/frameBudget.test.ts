import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { PHASE_COUNT, TAU, phaseIndex, wrap } from './phase'
import { TIERS, postPasses, type Tier } from './quality'
import { OrreryScene, type OrreryAssets } from './scene'

// Frame budget, counted rather than timed so it holds on a busy CI runner
// (docs/solutions/test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md).
// On a slow device most of the orrery's frame is draw submission, so this
// drives the busiest stretch through the real scene logic and counts the
// draws each view submits, the way three decides them: visible, in the
// camera's layers, inside its frustum, one per material group.

const FRAME = 1 / 60
/** Draws inside UnrealBloomPass: a bright pass, each blur level twice, the composite and the blend. */
const bloomDraws = (mips: number) => 1 + mips * 2 + 2
/** The output pass, the film grade, the depth of field's composite, and the window's disc: one draw each. */
const PASS_DRAW = 1

function blankAssets(): OrreryAssets {
  const texture = () => new THREE.Texture()
  return {
    envMap: null, wood: texture(), scale: texture(), medallions: texture(),
    earthColor: texture(), earthRough: texture(), earthLights: texture(), clouds: texture(), moonColor: texture(),
    moonBump: texture(), ring: texture(), sun: texture(), glow: texture(), shadow: texture(),
  }
}

function countDraws(scene: THREE.Scene, camera: THREE.Camera, hidden: readonly THREE.Object3D[] = []): number {
  scene.updateMatrixWorld()
  camera.updateMatrixWorld()
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
  let draws = 0
  const visit = (object: THREE.Object3D) => {
    if (!object.visible || hidden.includes(object)) return
    if (object.layers.test(camera.layers)) {
      if (object instanceof THREE.Sprite) {
        if ((!object.frustumCulled || frustum.intersectsSprite(object)) && object.material.visible) draws += 1
      } else if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
        if (!object.frustumCulled || frustum.intersectsObject(object)) {
          const material = object.material as THREE.Material | THREE.Material[]
          if (Array.isArray(material)) draws += object.geometry.groups.filter((group: { materialIndex?: number }) => material[group.materialIndex ?? 0]?.visible).length
          else if (material.visible) draws += 1
        }
      }
    }
    for (const child of object.children) visit(child)
  }
  visit(scene)
  return draws
}

type Frame = { main: number; depth: number; window: number; standing: number }

/**
 * The busiest stretch a child makes: the moon dragged all the way round with the halves showing, a step onto
 * Earth and back, and the day turning, with the window refreshed each frame.
 */
function busiestStretch(): { frames: Frame[]; phasesSeen: Set<number>; stood: number; drawsBeforeHalves: number } {
  const orrery = new OrreryScene(blankAssets())
  orrery.camera.aspect = 1180 / 820
  orrery.camera.updateProjectionMatrix()
  for (let t = 0; t < 4; t += FRAME) orrery.update(FRAME)
  orrery.showHint = false
  orrery.update(FRAME)
  orrery.aimMain()
  const drawsBeforeHalves = countDraws(orrery.scene, orrery.camera)
  orrery.showHalves = true
  const frames: Frame[] = []
  const phasesSeen = new Set<number>()
  let stood = 0
  for (let i = 0; i < 720; i++) {
    orrery.setMoon(wrap(orrery.elongation + TAU / 480))
    orrery.hours = (orrery.hours + 0.05) % 24
    const target = i >= 480 && i < 600 ? 1 : 0
    orrery.pov += Math.sign(target - orrery.pov) * Math.min(Math.abs(target - orrery.pov), FRAME / 1.2)
    orrery.update(FRAME)
    phasesSeen.add(phaseIndex(orrery.elongation))
    stood = Math.max(stood, orrery.pov)
    const window = countDraws(orrery.scene, orrery.aimWindow())
    const { standing } = orrery.aimMain()
    frames.push({ main: countDraws(orrery.scene, orrery.camera), depth: countDraws(orrery.scene, orrery.camera, orrery.depthless), window, standing })
  }
  orrery.disposeScene()
  return { frames, phasesSeen, stood, drawsBeforeHalves }
}

/** Draws one frame submits at a tier: the window's view on its refresh frames, the main view, the passes after it. */
function frameDraws(frame: Frame, tier: Tier, index: number): number {
  const passes = postPasses(tier.post, frame.standing)
  return (index % tier.windowEvery === 0 ? frame.window : 0)
    + frame.main
    + (passes.depthOfField ? frame.depth + PASS_DRAW : 0)
    + (passes.bloom ? bloomDraws(tier.bloomMips) : 0)
    + PASS_DRAW
    + (passes.grade ? PASS_DRAW : 0)
    + PASS_DRAW
}

describe('frame budget', () => {
  const run = busiestStretch()

  it('the stretch is the heavy one: every phase, the halves on, and a full step onto Earth', () => {
    expect(run.phasesSeen.size).toBe(PHASE_COUNT)
    // The halves (a glass cap, its rim, and the gold edge of the day side) faded in and were drawn.
    expect(Math.max(...run.frames.map((f) => f.main))).toBe(run.drawsBeforeHalves + 3)
    expect(run.stood).toBe(1)
  })

  it('each view submits a small, bounded number of draws', () => {
    const main = Math.max(...run.frames.map((f) => f.main))
    const window = Math.max(...run.frames.map((f) => f.window))
    expect(main, 'most draws in the main view').toBeLessThanOrEqual(28)
    expect(window, 'most draws in the round window').toBeLessThanOrEqual(27)
    // The window mostly shows the sky from home, which is a handful of draws.
    const skyFrames = run.frames.filter((f) => f.standing === 0)
    expect(Math.max(...skyFrames.map((f) => f.window)), 'draws for the sky in the window').toBeLessThanOrEqual(10)
  })

  it('every tier fits its budget, and each tier down submits less', () => {
    // Measured at the time of writing: averages of 59, 39, 26 and 25, worst frames of 64, 45, 32 and 32 (before
    // the medallions, metalwork, arm, pinion and child were merged, the main view alone was 68 draws).
    const budgets = [64, 43, 30, 29]
    const worstBudgets = [70, 50, 36, 36]
    const averages = TIERS.map((tier) => run.frames.reduce((sum, frame, i) => sum + frameDraws(frame, tier, i), 0) / run.frames.length)
    const worst = TIERS.map((tier) => Math.max(...run.frames.map((frame, i) => frameDraws(frame, tier, i))))
    TIERS.forEach((tier, i) => {
      expect(averages[i], `average draws a frame at tier ${i} (${tier.post})`).toBeLessThanOrEqual(budgets[i])
      expect(worst[i], `most draws in one frame at tier ${i}`).toBeLessThanOrEqual(worstBudgets[i])
      if (i > 0) expect(averages[i], `tier ${i} submits less than tier ${i - 1}`).toBeLessThan(averages[i - 1])
    })
  })
})
