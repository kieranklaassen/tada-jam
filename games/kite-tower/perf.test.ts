import * as CANNON from 'cannon-es'
import { describe, expect, it } from 'vitest'
import { KiteController } from './controller'
import { PlayPhysics } from './physics'
import { PIECES, SHAPES } from './pieces'
import { defaultState } from './state'

// A frame budget CI can hold: the worst thing a child can do to the
// controller is topple everything at once. On a tablet the controller shares
// a 16 ms frame with rendering, so the collapse must stay far below that.
// Milliseconds on a shared runner flake, so this counts the work that sets
// the cost instead: fixed physics steps per frame, the contacts the solver
// works through, and how soon every piece sleeps so the solver stops.
function leaningColumn(lean = 0.18, x0 = -1): { id: number; x: number; y: number }[] {
  let base = 0
  return PIECES.map((piece, i) => {
    const outline = SHAPES[piece.kind].outline
    const bottom = Math.min(...outline.map((p) => p.y))
    const top = Math.max(...outline.map((p) => p.y))
    const at = { id: piece.id, x: x0 + i * lean, y: base - bottom }
    base += top - bottom + 0.02
    return at
  })
}

function columnState() {
  const state = defaultState(5)
  for (const p of leaningColumn()) state.pieces[p.id] = { id: p.id, tray: false, x: p.x, y: p.y, a: 0 }
  return state
}

function awake(world: CANNON.World): number {
  let count = 0
  for (const body of world.bodies) if (body.type === CANNON.Body.DYNAMIC && body.sleepState !== CANNON.Body.SLEEPING) count += 1
  return count
}

describe('frame budget', () => {
  it('all twelve pieces toppling from one leaning column run one fixed step a frame over a bounded contact set', () => {
    const game = new KiteController(columnState(), { save: () => {} })
    const world = game.physics.world
    let maxSteps = 0
    let maxContacts = 0
    for (let frame = 0; frame < 360; frame++) {
      const before = world.stepnumber
      game.step(1 / 60)
      maxSteps = Math.max(maxSteps, world.stepnumber - before)
      maxContacts = Math.max(maxContacts, world.contacts.length)
    }
    expect(maxSteps, 'fixed physics steps in one 60 Hz frame').toBe(1)
    expect(maxContacts, 'most contacts the solver handled in one step').toBeLessThanOrEqual(80)
  })

  it('a slow frame runs at most the tier catch-up substeps, and a stall runs no more', () => {
    for (const substeps of [3, 2]) {
      const game = new KiteController(columnState(), { save: () => {} })
      game.physics.maxSubsteps = substeps
      const world = game.physics.world
      for (const dt of [1 / 20, 0.5, 5]) {
        const before = world.stepnumber
        game.step(dt)
        expect(world.stepnumber - before, `steps for a ${dt} s frame at ${substeps} substeps`).toBe(substeps)
      }
    }
  })

  // The doll is left out: her weight wakes whatever she climbs, on purpose.
  it('a heap of all twelve pieces falls asleep within five seconds, whichever way the column leans', () => {
    const trials: [number, number][] = [[0.18, -1], [0.12, -1], [0.24, -1], [-0.18, 1], [0.18, -4], [-0.18, 4], [0.3, -2], [0.08, 0], [0.04, 0], [0, 0], [0.5, -3]]
    for (const [lean, x0] of trials) {
      const physics = new PlayPhysics()
      for (const p of leaningColumn(lean, x0)) physics.add(p.id, { x: p.x, y: p.y, angle: 0 })
      let asleepAt = -1
      for (let frame = 0; frame < 420; frame++) {
        physics.step(1 / 60)
        if (awake(physics.world) > 0) asleepAt = -1
        else if (asleepAt < 0) asleepAt = frame
      }
      expect(asleepAt, `lean ${lean} from x ${x0}: every piece asleep, and staying asleep, by 7 s`).toBeGreaterThanOrEqual(0)
      expect(asleepAt / 60, `lean ${lean} from x ${x0}: seconds until the solver stops`).toBeLessThan(5)
    }
  })
})
