import { describe, expect, it } from 'vitest'
import type { KiteSound } from './audio'
import { KiteController, type Projector } from './controller'
import { TRAY_SLOTS } from './layout'
import { PERCHES } from './perches'
import { defaultState, type KiteState, type SavedPiece } from './state'

// Screen space in these tests: y below 90 is the build plane itself (x, y
// in room units), y from 90 up is the tray (tray-local z = y - 100).
const projector: Projector = {
  toScreen: (p, out) => {
    out.x = p.x
    out.y = p.y
    return out
  },
  toPlane: (screen) => ({ x: screen.x, y: screen.y }),
  toTray: (screen) => ({ x: screen.x, y: screen.y - 100 }),
}

const FRAME = 1 / 60

function fakeSound(): KiteSound & { calls: string[] } {
  const calls: string[] = []
  const record =
    (name: string) =>
    (..._args: unknown[]) => {
      calls.push(name)
    }
  return {
    calls,
    unlock: record('unlock'),
    setActive: record('setActive'),
    tok: record('tok'),
    pickup: record('pickup'),
    turn: record('turn'),
    putAway: record('putAway'),
    step: record('step'),
    climb: record('climb'),
    giggle: record('giggle'),
    whee: record('whee'),
    boop: record('boop'),
    flutter: record('flutter'),
    wind: record('wind'),
    freed: record('freed'),
    land: record('land'),
    dispose: record('dispose'),
  }
}

function withPieces(pieces: SavedPiece[], perch = 0): KiteState {
  const state = defaultState(5)
  state.perch = perch
  for (const piece of pieces) state.pieces[piece.id] = piece
  return state
}

function make(state: KiteState) {
  const saves: KiteState[] = []
  const sound = fakeSound()
  const game = new KiteController(state, { save: (s) => saves.push(s), sound })
  game.setProjector(projector)
  return { game, saves, sound }
}

function run(game: KiteController, seconds: number, each?: () => void): void {
  for (let t = 0; t < seconds; t += FRAME) {
    game.step(FRAME)
    each?.()
  }
}

function slotScreen(id: number) {
  const slot = TRAY_SLOTS[id]
  return { x: slot.x, y: slot.z + 100 }
}

describe('KiteController', () => {
  it('a drag from the tray puts the piece on the plane, where it lands and is saved', () => {
    const { game, saves, sound } = make(defaultState(5))
    run(game, 0.2)
    game.pointerDown(1, slotScreen(0), 0)
    game.pointerMove(1, { x: 0, y: 40 })
    game.pointerMove(1, { x: -1, y: 0.3 })
    run(game, 0.5)
    expect(game.isHeld(0)).toBe(true)
    game.pointerUp(1, { x: -1, y: 0.3 }, 900)
    run(game, 2)
    expect(game.trayed[0]).toBe(false)
    const body = game.physics.body(0)!
    expect(body.position.x).toBeCloseTo(-1, 0)
    expect(body.position.y).toBeCloseTo(0.5, 1)
    expect(sound.calls).toContain('pickup')
    expect(sound.calls).toContain('tok')
    const last = saves[saves.length - 1]
    expect(last.pieces[0]).toMatchObject({ id: 0, tray: false })
  })

  it('dragging a piece back onto the tray puts it away', () => {
    const { game, sound } = make(withPieces([{ id: 1, tray: false, x: -2, y: 0.5, a: 0 }]))
    run(game, 0.5)
    game.pointerDown(1, { x: -2, y: 0.5 }, 0)
    game.pointerMove(1, { x: -2, y: 30 })
    run(game, 0.2)
    game.pointerUp(1, slotScreen(1), 500)
    expect(game.trayed[1]).toBe(true)
    expect(game.physics.has(1)).toBe(false)
    expect(sound.calls).toContain('putAway')
  })

  it('a tap on a piece turns it a quarter, so a lying plank stands up', () => {
    const { game, sound } = make(withPieces([{ id: 4, tray: false, x: -3, y: 0.16, a: 0 }]))
    run(game, 0.5)
    game.pointerDown(1, { x: -3, y: 0.16 }, 0)
    game.pointerUp(1, { x: -3, y: 0.16 }, 100)
    run(game, 2)
    const body = game.physics.body(4)!
    expect(body.position.y).toBeCloseTo(1.7, 1)
    expect(sound.calls).toContain('turn')
  })

  it('a tap on a tray piece hops it onto the rug beside the doll', () => {
    const { game } = make(defaultState(5))
    run(game, 0.2)
    game.pointerDown(1, slotScreen(0), 0)
    game.pointerUp(1, slotScreen(0), 100)
    run(game, 2)
    expect(game.trayed[0]).toBe(false)
    const body = game.physics.body(0)!
    expect(Math.abs(body.position.x - game.hero.x)).toBeLessThan(1.6)
    expect(body.position.y).toBeCloseTo(0.5, 1)
  })

  it('one cube under the lowest kite: the doll climbs, grabs, flies, lands, and the kite moves on', () => {
    const perch = PERCHES[0]
    const { game, saves, sound } = make(withPieces([{ id: 0, tray: false, x: perch.x - 0.7, y: 0.5, a: 0 }], 0))
    const modes = new Set<string>()
    run(game, 16, () => modes.add(game.hero.mode))
    for (const mode of ['travel', 'grab', 'fly', 'land']) expect(modes).toContain(mode)
    expect(game.state.perch).toBe(1)
    expect(saves.some((s) => s.perch === 1)).toBe(true)
    expect(game.kite.mode).toBe('perched')
    expect(game.kite.position.x).toBeCloseTo(PERCHES[1].kite.x, 5)
    expect(game.hero.y).toBeCloseTo(0, 5)
    for (const name of ['climb', 'freed', 'wind', 'land']) expect(sound.calls).toContain(name)
  })

  it('a bare rug: the doll stays and reaches up', () => {
    const { game } = make(defaultState(5))
    run(game, 3)
    expect(game.hero.mode).toBe('stand')
    expect(game.hero.y).toBe(0)
  })

  it('pulling the doll’s block away makes it tumble to the rug, unhurt', () => {
    const perch = PERCHES[2]
    const { game, sound } = make(withPieces([{ id: 0, tray: false, x: perch.x - 1.6, y: 0.5, a: 0 }], 2))
    run(game, 4)
    expect(game.hero.on).toBe(0)
    game.pointerDown(1, { x: perch.x - 1.6, y: 0.5 }, 0)
    game.pointerMove(1, { x: perch.x - 1.6, y: 30 })
    run(game, 0.1)
    expect(game.hero.mode).toBe('tumble')
    run(game, 2.5)
    expect(game.hero.mode).toBe('stand')
    expect(game.hero.y).toBe(0)
    expect(sound.calls).toContain('whee')
  })

  it('a fourth finger drops everything that is held', () => {
    const { game } = make(defaultState(5))
    run(game, 0.2)
    for (const [pointer, id] of [
      [1, 0],
      [2, 1],
      [3, 3],
    ]) {
      game.pointerDown(pointer, slotScreen(id), 0)
      game.pointerMove(pointer, { x: -4 + pointer * 2, y: 2 })
    }
    run(game, 0.2)
    expect(game.held).toHaveLength(3)
    game.pointerDown(4, { x: 0, y: 3 }, 10)
    run(game, 0.1)
    expect(game.held).toHaveLength(0)
    expect(game.isHeld(0)).toBe(false)
  })

  it('pausing stops time', () => {
    const { game } = make(defaultState(5))
    run(game, 0.5)
    const t = game.t
    game.setRunning(false)
    run(game, 1)
    expect(game.t).toBe(t)
    game.setRunning(true)
    run(game, 0.5)
    expect(game.t).toBeGreaterThan(t)
  })

  it('a restored playroom puts every piece back where it was', () => {
    const pieces: SavedPiece[] = [
      { id: 0, tray: false, x: 2, y: 0.5, a: 0 },
      { id: 1, tray: false, x: 2.1, y: 1.5, a: 0 },
      { id: 4, tray: false, x: -3, y: 0.16, a: 0 },
    ]
    const { game } = make(withPieces(pieces, 3))
    run(game, 1)
    const snapshot = game.snapshot()
    expect(snapshot.perch).toBe(3)
    for (const piece of pieces) {
      const saved = snapshot.pieces[piece.id]
      expect(saved.tray).toBe(false)
      if (saved.tray || piece.tray) continue
      expect(saved.x).toBeCloseTo(piece.x, 1)
      expect(saved.y).toBeCloseTo(piece.y, 1)
    }
    expect(snapshot.pieces[2]).toEqual({ id: 2, tray: true })
  })

  it('a piece dropped onto the doll makes it hop aside', () => {
    const { game } = make(defaultState(5))
    run(game, 0.5)
    const x = game.hero.x
    game.pointerDown(1, slotScreen(0), 0)
    game.pointerMove(1, { x, y: 3 })
    run(game, 0.5)
    game.pointerUp(1, { x, y: 3 }, 800)
    run(game, 0.1)
    expect(game.hero.mode).toBe('travel')
    run(game, 0.5)
    expect(Math.abs(game.hero.x - x)).toBeGreaterThan(0.6)
  })

  it('idle guidance glows at three seconds and demonstrates at five with a ghost hand', () => {
    const { game } = make(defaultState(5))
    run(game, 2.5)
    expect(game.guidance.glow).toBe(0)
    run(game, 1.5)
    expect(game.guidance.glow).toBeGreaterThan(0)
    expect(game.guidance.hint).toMatchObject({ kind: 'fromTray', id: 0 })
    run(game, 1.8)
    expect(game.guidance.hand).not.toBeNull()
    game.pointerDown(1, { x: 0, y: 5 }, 0)
    game.pointerUp(1, { x: 0, y: 5 }, 50)
    run(game, 0.1)
    expect(game.guidance.hand).toBeNull()
    expect(game.guidance.glow).toBe(0)
  })

  it('the guidance points at a spot where one block lets the doll reach the kite', () => {
    const { game } = make(defaultState(5))
    run(game, 1)
    const perch = PERCHES[0]
    expect(Math.abs(game.guidance.buildAt.x - perch.x)).toBeLessThanOrEqual(1.2)
  })
})

describe('frame budget', () => {
  it('a tower toppling costs the controller well under a millisecond per frame on average', () => {
    const cost = () => {
      const pieces: SavedPiece[] = [
        { id: 0, tray: false, x: 0, y: 0.5, a: 0 },
        { id: 1, tray: false, x: 0.3, y: 1.5, a: 0 },
        { id: 3, tray: false, x: 0.6, y: 2.5, a: 0 },
        { id: 8, tray: false, x: 0.9, y: 3.5, a: 0 },
        { id: 2, tray: false, x: -4, y: 0.6, a: 0 },
        { id: 4, tray: false, x: 4, y: 0.16, a: 0 },
      ]
      const { game } = make(withPieces(pieces, 1))
      const times: number[] = []
      for (let i = 0; i < 180; i++) {
        const start = performance.now()
        game.step(FRAME)
        times.push(performance.now() - start)
      }
      return times.reduce((a, b) => a + b, 0) / times.length
    }
    cost()
    const best = Math.min(cost(), cost(), cost())
    console.log(`topple: best average ${best.toFixed(3)} ms per frame`)
    expect(best).toBeLessThan(1)
  })
})
