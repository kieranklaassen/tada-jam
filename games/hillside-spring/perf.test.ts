import { describe, expect, it } from 'vitest'
import { GardenController, type Picker } from './controller'
import { buildable, PLOTS } from './layout'
import { tapTurns, type Piece, type PieceKind } from './pieces'
import { defaultGarden } from './state'

// Frame-time budget for the CPU side of a frame. On an iPad the whole frame
// has about 12 ms and the GPU needs most of it, so the controller and the
// visitors' poses must stay a small slice even on a CI runner. Two costs
// matter: a steady busy frame (water everywhere, a wheel turning, three
// visitors moving), and the frame where the child turns a piece, which
// re-solves the water and searches for the next hint (the search solves the
// whole hillside once per candidate move, so a cluttered hillside with dry
// plots is the worst case). Budgets are loose enough not to flake on a busy
// runner and tight enough to catch per-frame solving or a search blow-up.

const FRAME = 1 / 60
const KINDS: readonly PieceKind[] = ['straight', 'bend', 'split', 'sluice', 'wheel']

const picker: Picker = {
  pick: (at) => ({ kind: 'cell', c: Math.floor(at.x / 100), r: Math.floor(at.y / 100) }),
  dropCell: (at) => ({ c: Math.floor(at.x / 100), r: Math.floor(at.y / 100) }),
}

function garden(pieces: Piece[], growth = 0): GardenController {
  const state = defaultGarden(8)
  state.pieces = pieces
  state.growth = PLOTS.map(() => growth)
  const controller = new GardenController(state, { save: () => {} })
  controller.setPicker(picker)
  controller.setRunning(true)
  return controller
}

/** Every plot drinking through splits, a wheel turning, and all three visitors home. */
function busyFrameCost(frames: number): number {
  const controller = garden(
    [
      { kind: 'split', c: 3, r: 0, turn: 0, open: true },
      { kind: 'split', c: 4, r: 0, turn: 2, open: true },
      { kind: 'wheel', c: 4, r: 1, turn: 0, open: true },
      { kind: 'split', c: 2, r: 2, turn: 3, open: true },
    ],
    1,
  )
  for (let i = 0; i < 600; i++) controller.step(FRAME)
  let total = 0
  for (let i = 0; i < frames; i++) {
    const start = performance.now()
    controller.step(FRAME)
    for (const presence of controller.creatures) controller.creatureMotion[presence.kind].sample(controller.now, presence.phase === 'here' ? null : controller.now)
    total += performance.now() - start
  }
  return total / frames
}

/** A seeded hillside with pieces scattered over about half the free cells. */
function cluttered(seed: number): Piece[] {
  let s = seed
  const random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const pieces: Piece[] = []
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 7; c++) {
      if (!buildable(c, r) || random() > 0.45) continue
      pieces.push({ kind: KINDS[Math.floor(random() * KINDS.length)], c, r, turn: Math.floor(random() * 4), open: random() > 0.3 })
    }
  }
  return pieces
}

/** The slowest single turn across the seeded hillsides (each timed as its best of three). */
function worstTurn(seeds: number): number {
  let worst = 0
  for (let seed = 1; seed <= seeds; seed++) {
    const controller = garden(cluttered(seed))
    const piece = controller.state.pieces.find((p) => tapTurns(p.kind))
    if (!piece) continue
    const at = { x: piece.c * 100 + 50, y: piece.r * 100 + 50 }
    let best = Infinity
    for (let i = 0, t = 0; i < 3; i++) {
      const start = performance.now()
      controller.pointerDown(1, at, (t += 500))
      controller.pointerUp(1, at, (t += 60))
      best = Math.min(best, performance.now() - start)
      controller.step(FRAME)
    }
    worst = Math.max(worst, best)
  }
  return worst
}

describe('frame budget', () => {
  it('a busy garden costs the controller and the visitors under 0.1 ms per frame on average', () => {
    busyFrameCost(60)
    const best = Math.min(...Array.from({ length: 5 }, () => busyFrameCost(300)))
    console.log(`busy frame: best average ${best.toFixed(3)} ms`)
    expect(best).toBeLessThan(0.1)
  })

  it('turning a piece (re-solve plus hint search) costs under 4 ms on the worst of 60 cluttered hillsides', () => {
    worstTurn(10)
    const worst = worstTurn(60)
    console.log(`turn: worst ${worst.toFixed(3)} ms`)
    expect(worst).toBeLessThan(4)
  })
})
