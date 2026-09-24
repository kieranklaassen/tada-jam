import { describe, expect, it } from 'vitest'
import type { KiteSound } from './audio'
import { KiteController, slotWorld, TUMBLE_OUT, type Projector } from './controller'
import { BODY_PROFILE, HAIR, HEAD_R, HEAD_Y } from './doll'
import { TRAY_SLOTS } from './layout'
import { PERCHES } from './perches'
import { angleOf } from './physics'
import { PIECES, pieceShape, transformInto, type Vec2 } from './pieces'
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

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function slotScreen(id: number) {
  const slot = TRAY_SLOTS[id]
  return { x: slot.x, y: slot.z + 100 }
}

/** Pip's outline, feet at the origin: her body as turned and her head and hair. */
const PIP_BODY: Vec2[] = [...BODY_PROFILE.map((p) => ({ x: p.x, y: p.y })), ...[...BODY_PROFILE].reverse().map((p) => ({ x: -p.x, y: p.y }))]
const PIP_HEAD: Vec2[] = Array.from({ length: 24 }, (_, i) => ({ x: Math.cos((i * Math.PI) / 12) * (HEAD_R + HAIR), y: HEAD_Y + Math.sin((i * Math.PI) / 12) * (HEAD_R + HAIR) }))

function insidePolygon(poly: readonly Vec2[], p: Vec2): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function edgeDistance(poly: readonly Vec2[], p: Vec2): number {
  let best = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
    best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t))
  }
  return best
}

/** How deep two outlines reach into each other, walking each in steps of a few hundredths. */
function outlineOverlap(a: readonly Vec2[], b: readonly Vec2[]): number {
  let deepest = 0
  for (const [from, into] of [
    [a, b],
    [b, a],
  ]) {
    for (let i = 0; i < from.length; i++) {
      const p = from[i]
      const q = from[(i + 1) % from.length]
      const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 0.04))
      for (let k = 0; k < n; k++) {
        const at = { x: p.x + ((q.x - p.x) * k) / n, y: p.y + ((q.y - p.y) * k) / n }
        if (insidePolygon(into, at)) deepest = Math.max(deepest, edgeDistance(into, at))
      }
    }
  }
  return deepest
}

/** Piece `id`'s drawn outline where physics has it now. */
function pieceOutline(game: KiteController, id: number): Vec2[] {
  const b = game.physics.body(id)!
  return transformInto(pieceShape(id).outline, { x: b.position.x, y: b.position.y, angle: angleOf(b) }, [])
}

/** How deep Pip's body or head is in any block on the plane (0 when clear, or while she is up with the kite, rolling or sat out in front). */
function pipInBlock(game: KiteController): { depth: number; id: number } {
  const hero = game.hero
  const worst = { depth: 0, id: -1 }
  if (hero.mode === 'fly' || hero.z > 0.8 || (hero.mode === 'tumble' && hero.tumble === 'roll')) return worst
  const body = PIP_BODY.map((p) => ({ x: p.x + hero.x, y: p.y + hero.y }))
  const head = PIP_HEAD.map((p) => ({ x: p.x + hero.x, y: p.y + hero.y }))
  for (let id = 0; id < PIECES.length; id++) {
    if (game.trayed[id] || !game.physics.has(id) || game.physics.isHeld(id)) continue
    const outline = pieceOutline(game, id)
    const depth = Math.max(outlineOverlap(body, outline), outlineOverlap(head, outline))
    if (depth > worst.depth) {
      worst.depth = depth
      worst.id = id
    }
  }
  return worst
}

/** Carry tray piece `id` over (x, y) and let it fall there. */
function dropFromTray(game: KiteController, pointer: number, id: number, x: number, y: number): void {
  game.pointerDown(pointer, slotScreen(id), game.t * 1000)
  game.pointerMove(pointer, { x: slotScreen(id).x, y: 40 })
  game.pointerMove(pointer, { x, y })
  run(game, 0.3)
  game.pointerUp(pointer, { x, y }, game.t * 1000)
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

  it('everyone watches a piece the child lets go of land, then looks back', () => {
    const { game } = make(defaultState(5))
    run(game, 0.2)
    game.pointerDown(1, slotScreen(0), 0)
    game.pointerMove(1, { x: 0, y: 40 })
    game.pointerMove(1, { x: -1, y: 2 })
    run(game, 0.5)
    game.pointerUp(1, { x: -1, y: 2 }, 900)
    run(game, 0.4)
    const piece = game.physics.body(0)!.position.x
    expect(Math.abs(game.hero.look.x - piece)).toBeLessThan(0.05)
    for (const w of game.watchers) expect(Math.abs(w.look.x - piece)).toBeLessThan(0.05)
    run(game, 1.5)
    expect(Math.abs(game.hero.look.x - piece)).toBeGreaterThan(1)
    for (const w of game.watchers) expect(Math.abs(w.look.x - piece)).toBeGreaterThan(1)
  })

  it('a block set down is one tok and nobody flinches; a tower falling makes the watchers flinch once', () => {
    const drop = (game: KiteController, id: number, at: { x: number; y: number }) => {
      game.pointerDown(1, slotScreen(id), 0)
      game.pointerMove(1, { x: 0, y: 40 })
      game.pointerMove(1, at)
      run(game, 0.5)
      game.pointerUp(1, at, 900)
      run(game, 3)
    }
    // The kite on the shelf board, far right, and the blocks on the left, well away from the doll.
    const stacked = make(withPieces([{ id: 0, tray: false, x: -3, y: 0.5, a: 0 }], 0))
    run(stacked.game, 1)
    stacked.sound.calls.length = 0
    drop(stacked.game, 1, { x: -3, y: 2.2 })
    const bridged = make(withPieces([{ id: 0, tray: false, x: -3, y: 0.5, a: 0 }, { id: 1, tray: false, x: -1, y: 0.5, a: 0 }], 0))
    run(bridged.game, 1)
    drop(bridged.game, 4, { x: -2, y: 1.8 })
    const dropped = make(withPieces([], 0))
    run(dropped.game, 1)
    dropped.sound.calls.length = 0
    drop(dropped.game, 0, { x: -2, y: 5.5 })
    expect([stacked, bridged, dropped].map(({ game }) => game.toppleAt)).toEqual([-Infinity, -Infinity, -Infinity])
    expect(dropped.sound.calls.filter((c) => c === 'tok')).toHaveLength(1)
    expect(stacked.sound.calls.filter((c) => c === 'tok').length).toBeLessThanOrEqual(2)

    const leaning = make(
      withPieces(
        [
          { id: 0, tray: false, x: -2, y: 0.5, a: 0 },
          { id: 1, tray: false, x: -1.65, y: 1.5, a: 0 },
          { id: 3, tray: false, x: -1.3, y: 2.5, a: 0 },
          { id: 8, tray: false, x: -0.95, y: 3.5, a: 0 },
        ],
        3,
      ),
    )
    const flinches = new Set<number>()
    run(leaning.game, 4, () => flinches.add(leaning.game.toppleAt))
    flinches.delete(-Infinity)
    expect(flinches.size).toBe(1)
  })

  it('a touch unlocks the sound on the way down and again on the way up, where a finger counts as a gesture', () => {
    const { game, sound } = make(defaultState(5))
    game.pointerDown(1, { x: 0, y: 40 }, 0)
    expect(sound.calls.filter((c) => c === 'unlock')).toHaveLength(1)
    game.pointerUp(1, { x: 0, y: 40 }, 80)
    expect(sound.calls.filter((c) => c === 'unlock')).toHaveLength(2)
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

  it('a tap on a piece holding another up leaves it where it is with a soft knock, so nothing falls into it', () => {
    const tower: SavedPiece[] = [
      { id: 6, tray: false, x: -3.3, y: 0.95, a: 0 },
      { id: 10, tray: false, x: -1.6, y: 0.95, a: 0 },
      { id: 4, tray: false, x: -2.45, y: 2.06, a: 0 },
      { id: 3, tray: false, x: -2.45, y: 2.72, a: 0 },
    ]
    const leaning: SavedPiece[] = [
      { id: 8, tray: false, x: 3, y: 0.5, a: 0 },
      { id: 9, tray: false, x: 3, y: 1.4, a: 0 },
      { id: 0, tray: false, x: 0.4, y: 0.5, a: 0 },
      { id: 11, tray: false, x: 1.7, y: 1.6, a: 0.25 },
    ]
    for (const [pieces, tapped] of [
      [tower, 10],
      [tower, 4],
      [leaning, 9],
    ] as const) {
      const { game, sound } = make(withPieces([...pieces]))
      run(game, 3)
      const poseOf = (id: number) => {
        const body = game.physics.body(id)!
        return { x: body.position.x, y: body.position.y, angle: angleOf(body) }
      }
      const before = pieces.map((p) => poseOf(p.id))
      const at = game.physics.body(tapped)!.position
      const heard = sound.calls.length
      game.pointerDown(1, { x: at.x, y: at.y }, game.t * 1000)
      game.pointerUp(1, { x: at.x, y: at.y }, game.t * 1000 + 100)
      let deepest = 0
      run(game, 2, () => {
        expect(game.physics.isHeld(tapped)).toBe(false)
        for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) deepest = Math.max(deepest, outlineOverlap(pieceOutline(game, pieces[i].id), pieceOutline(game, pieces[j].id)))
      })
      pieces.forEach((p, i) => {
        const now = poseOf(p.id)
        expect(Math.hypot(now.x - before[i].x, now.y - before[i].y) + Math.abs(now.angle - before[i].angle), `piece ${p.id} after tapping ${tapped}`).toBeLessThan(0.02)
      })
      expect(deepest, `tapping ${tapped}`).toBeLessThan(0.02)
      expect(sound.calls.slice(heard)).toContain('tok')
      expect(sound.calls.slice(heard)).not.toContain('turn')
    }
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

  it('a block that comes down across the doll’s walk stops her short, and she climbs it instead of walking through it', () => {
    const { game } = make(defaultState(5))
    run(game, 0.2)
    expect(game.hero.mode).toBe('travel')
    game.pointerDown(1, slotScreen(0), 0)
    game.pointerUp(1, slotScreen(0), 100)
    const modes = new Set<string>()
    let inside = false
    run(game, 5, () => {
      modes.add(game.hero.mode)
      const body = game.physics.body(0)!
      if (game.hero.y < 0.1 && Math.abs(game.hero.x - body.position.x) < 0.45) inside = true
    })
    expect(inside).toBe(false)
    expect(modes).not.toContain('tumble')
    expect(modes).toContain('grab')
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

  it('the kite catches on its new perch with a shiver and a rustle', () => {
    const perch = PERCHES[0]
    const { game, sound } = make(withPieces([{ id: 0, tray: false, x: perch.x - 0.7, y: 0.5, a: 0 }], 0))
    let driftEnded = -1
    run(game, 16, () => {
      if (driftEnded < 0 && game.state.perch === 1 && game.kite.mode === 'perched') driftEnded = game.t
    })
    expect(driftEnded).toBeGreaterThan(0)
    expect(game.kite.flutterAt).toBeCloseTo(driftEnded, 5)
    expect(sound.calls.lastIndexOf('flutter')).toBeGreaterThan(sound.calls.lastIndexOf('land'))
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

  it('during a demonstration every doll watches the ghost hand carry its piece from the tray to the spot', () => {
    const { game } = make(defaultState(5))
    const dolls = () => [game.hero, ...game.watchers]
    const sawTray = [false, false, false]
    const sawSpot = [false, false, false]
    run(game, 9, () => {
      const hint = game.guidance.hint
      if (!game.guidance.hand || hint?.kind !== 'fromTray') return
      const tray = slotWorld(hint.id)
      const spot = game.guidance.buildAt
      dolls().forEach((doll, i) => {
        if (Math.abs(doll.look.x - tray.x) < 0.01 && Math.abs(doll.look.y - tray.y) < 0.01) sawTray[i] = true
        if (Math.abs(doll.look.x - spot.x) < 0.01) sawSpot[i] = true
      })
    })
    expect(sawTray).toEqual([true, true, true])
    expect(sawSpot).toEqual([true, true, true])
  })

  it('the guidance points at a spot where one block lets the doll reach the kite', () => {
    const { game } = make(defaultState(5))
    run(game, 1)
    const perch = PERCHES[0]
    expect(Math.abs(game.guidance.buildAt.x - perch.x)).toBeLessThanOrEqual(1.2)
  })

  it('the ghost hand never shows a cube set down half off an edge, where it would tip off', () => {
    for (const [below, perch] of [
      [-3.3, 4],
      [-1.4, 1],
      [5.4, 2],
    ] as const) {
      const base: SavedPiece = { id: 0, tray: false, x: below, y: 0.5, a: 0 }
      const { game } = make(withPieces([base], perch))
      run(game, 4)
      const at = { ...game.guidance.buildAt }
      const { game: followed } = make(withPieces([base, { id: 1, tray: false, x: at.x, y: at.y + 0.5, a: 0 }], perch))
      run(followed, 4)
      const pose = followed.physics.pose(1, { x: 0, y: 0, angle: 0 })
      expect(Math.abs(pose.x - at.x)).toBeLessThan(0.15)
      expect(Math.abs(pose.angle)).toBeLessThan(0.05)
    }
  })

  it('a watcher steps aside when the doll comes to reach beside him, and does not wander back into her way', () => {
    const { game } = make(withPieces([{ id: 0, tray: false, x: 5.4, y: 0.5, a: 0 }], 2))
    const [moss, bean] = game.watchers
    let upSince = -1
    let beanClosest = Infinity
    let mossFarthest = 0
    run(game, 20, () => {
      const hero = game.hero
      if (hero.mode === 'stand' && hero.on === 0) {
        if (upSince < 0) upSince = game.t
        if (game.t - upSince > 1.5) beanClosest = Math.min(beanClosest, Math.abs(bean.x - hero.x))
      }
      mossFarthest = Math.max(mossFarthest, Math.abs(moss.x - -6.55))
    })
    expect(upSince).toBeGreaterThan(0)
    expect(beanClosest).toBeGreaterThan(1.9)
    expect(bean.x).toBeCloseTo(7.35, 2)
    expect(mossFarthest).toBeLessThan(0.75)
  })

  it('a watcher steps out from behind a tower built in front of him, and does not wander back behind it', () => {
    const tower: SavedPiece[] = [
      { id: 0, tray: false, x: -6.9, y: 0.5, a: 0 },
      { id: 1, tray: false, x: -6.9, y: 1.5, a: 0 },
    ]
    const { game } = make(withPieces(tower, 0))
    const [moss] = game.watchers
    expect(moss.x).toBeCloseTo(-6.55, 2)
    let hiddenLate = false
    run(game, 25, () => {
      if (game.t > 4 && moss.x < -6.1) hiddenLate = true
    })
    expect(hiddenLate).toBe(false)
    expect(moss.x).toBeGreaterThan(-6.1)
    expect(game.physics.pose(1, { x: 0, y: 0, angle: 0 }).y).toBeCloseTo(1.5, 1)
  })

  it('after the flight she waits under her new kite instead of walking back up the tower she left', () => {
    const hookStair: SavedPiece[] = [
      { id: 8, tray: false, x: 0.9, y: 0.5, a: 0 },
      { id: 0, tray: false, x: -0.1, y: 0.5, a: 0 },
      { id: 3, tray: false, x: -0.1, y: 1.5, a: 0 },
      { id: 1, tray: false, x: -1.2, y: 0.5, a: 0 },
      { id: 6, tray: false, x: -1.2, y: 1.95, a: 0 },
    ]
    const { game } = make(withPieces(hookStair, 1))
    let landed = false
    let farthest = 0
    let highest = 0
    run(game, 25, () => {
      if (game.state.perch !== 2) return
      if (game.hero.mode === 'land') landed = true
      if (!landed) return
      farthest = Math.max(farthest, Math.abs(game.hero.x - PERCHES[2].x))
      highest = Math.max(highest, game.hero.y)
    })
    expect(landed).toBe(true)
    expect(highest).toBe(0)
    expect(farthest).toBeLessThan(2)
    expect(Math.abs(game.hero.x - PERCHES[2].x)).toBeLessThan(1.6)
  })
})

describe('Pip never ends up inside a block', () => {
  it('tumbled out in front, she hops back in beside a block set down where she fell, not into it', () => {
    const perch = PERCHES[2]
    const { game } = make(withPieces([{ id: 0, tray: false, x: perch.x - 1.6, y: 0.5, a: 0 }], 2))
    run(game, 4)
    expect(game.hero.on).toBe(0)
    game.pointerDown(1, { x: perch.x - 1.6, y: 0.5 }, 0)
    game.pointerMove(1, { x: perch.x - 1.6, y: 30 })
    for (let i = 0; i < 60 * 3 && game.hero.tumble !== 'sit'; i++) game.step(FRAME)
    expect(game.hero.mode).toBe('tumble')
    expect(game.hero.tumble).toBe('sit')
    const fell = game.hero.x
    dropFromTray(game, 2, 1, fell, 1.5)
    // Out in front she is out of its way: it is set down and falls at once, rather than waiting in the air over her.
    run(game, 0.4)
    expect(game.isHeld(1)).toBe(false)
    let deepest = 0
    run(game, 6, () => {
      deepest = Math.max(deepest, pipInBlock(game).depth)
    })
    expect(Math.abs(game.physics.body(1)!.position.x - fell)).toBeLessThan(0.3)
    expect(deepest).toBeLessThan(0.02)
    expect(game.hero.mode).not.toBe('tumble')
    expect(game.hero.z).toBe(0)
  })

  it('a block set down where the kite was to land her: she comes down out in front of it, then hops back in beside it', () => {
    const pieces: SavedPiece[] = [{ id: 0, tray: false, x: PERCHES[0].x - 0.7, y: 0.5, a: 0 }]
    const plain = make(withPieces(pieces, 0)).game
    let landX = NaN
    for (let i = 0; i < 60 * 20 && Number.isNaN(landX); i++) {
      const flying = plain.hero.mode === 'fly'
      plain.step(FRAME)
      if (flying && plain.hero.mode !== 'fly') landX = plain.hero.x
    }
    expect(plain.hero.mode).toBe('land')

    const { game } = make(withPieces(pieces, 0))
    for (let i = 0; i < 60 * 20 && game.hero.mode !== 'fly'; i++) game.step(FRAME)
    expect(game.hero.mode).toBe('fly')
    run(game, 0.5)
    dropFromTray(game, 2, 1, landX, 1.5)
    let landed = ''
    let landedZ = -1
    let deepest = 0
    for (let i = 0; i < 60 * 12; i++) {
      const flying = game.hero.mode === 'fly'
      game.step(FRAME)
      if (flying && game.hero.mode !== 'fly') {
        landed = `${game.hero.mode} ${game.hero.tumble}`
        landedZ = game.hero.z
      }
      deepest = Math.max(deepest, pipInBlock(game).depth)
    }
    expect(Math.abs(game.physics.body(1)!.position.x - landX)).toBeLessThan(0.3)
    expect(deepest).toBeLessThan(0.02)
    expect(landed).toBe('tumble sit')
    expect(landedZ).toBe(TUMBLE_OUT)
    expect(game.hero.mode).not.toBe('tumble')
    expect(game.hero.z).toBe(0)
  })

  it('a piece carried over one waiting in the air to fall rides on top of it, never inside it', () => {
    const { game } = make(defaultState(5))
    run(game, 3)
    expect(game.hero.mode).toBe('stand')
    const x = game.hero.x
    dropFromTray(game, 1, 0, x, 3.2)
    expect(game.isHeld(0)).toBe(true)
    game.pointerDown(2, slotScreen(1), game.t * 1000)
    game.pointerMove(2, { x: slotScreen(1).x, y: 40 })
    game.pointerMove(2, { x, y: 2.8 })
    let waiting = 0
    let waitingDepth = 0
    let landingDepth = 0
    const watch = () => {
      if (game.trayed[1]) return
      const depth = outlineOverlap(pieceOutline(game, 0), pieceOutline(game, 1))
      if (game.isHeld(0)) {
        waiting++
        waitingDepth = Math.max(waitingDepth, depth)
      } else landingDepth = Math.max(landingDepth, depth)
    }
    run(game, 0.4, watch)
    game.pointerUp(2, { x, y: 2.8 }, game.t * 1000)
    run(game, 3, watch)
    expect(waiting).toBeGreaterThan(20)
    expect(waitingDepth).toBeLessThan(0.02)
    // Once both fall, the upper lands on the lower with the dip any landing has.
    expect(landingDepth).toBeLessThan(0.25)
    expect(game.physics.body(1)!.position.y).toBeCloseTo(1.5, 1)
  })

  it('however roughly a child plays, dropping blocks on her, under her and where she will land, her body and head stay out of them', () => {
    const step = 1 / 30
    let worst = { depth: 0, where: '' }
    let flights = 0
    for (let seed = 1; seed <= 8; seed++) {
      const rnd = lcg(seed * 7919)
      const { game } = make(defaultState(5))
      let pointer = 1
      let next = 1 + rnd() * 2
      let carry: { from: Vec2; to: Vec2; start: number; end: number; pointer: number } | null = null
      for (let frame = 0; frame < 45 / step; frame++) {
        const flying = game.hero.mode === 'fly'
        game.step(step)
        if (flying && game.hero.mode !== 'fly') flights++
        const t = game.t
        if (carry) {
          const k = Math.min(1, (t - carry.start) / (carry.end - carry.start))
          if (k < 1) game.pointerMove(carry.pointer, { x: carry.from.x + (carry.to.x - carry.from.x) * k, y: carry.from.y + (carry.to.y - carry.from.y) * k })
          else {
            game.pointerUp(carry.pointer, carry.to, t * 1000)
            carry = null
            next = t + 0.2 + rnd() * 1.6
          }
        } else if (t >= next) {
          const r = rnd()
          pointer++
          if (r < 0.1) {
            const at = { x: game.hero.x, y: game.hero.y + 1 }
            game.pointerDown(pointer, at, t * 1000)
            game.pointerUp(pointer, at, t * 1000 + 80)
            next = t + 0.5 + rnd() * 2
          } else if (r < 0.15) {
            next = t + 3 + rnd() * 5
          } else {
            const id = Math.floor(rnd() * PIECES.length)
            let grab: Vec2
            let from: Vec2
            if (game.trayed[id]) {
              grab = slotScreen(id)
              from = { x: grab.x, y: 40 }
            } else if (game.physics.has(id)) {
              const b = game.physics.body(id)!
              grab = { x: b.position.x, y: b.position.y }
              from = { x: grab.x, y: grab.y + 0.8 }
            } else continue
            const perch = PERCHES[game.state.perch]
            const landing = Math.max(-5.5, Math.min(5.5, perch.x - Math.sign(perch.x) * 1.6))
            const to =
              game.hero.mode === 'fly' && rnd() < 0.6
                ? { x: landing + (rnd() - 0.5) * 1.2, y: 0.8 + rnd() * 2 }
                : rnd() < 0.35
                  ? { x: game.hero.x + (rnd() - 0.5) * 2.4, y: game.hero.y + 1 + rnd() * 3 }
                  : { x: -6.8 + rnd() * 13.6, y: 0.6 + rnd() * 4.5 }
            game.pointerDown(pointer, grab, t * 1000)
            game.pointerMove(pointer, from)
            carry = { from, to, start: t, end: t + 0.25 + rnd() * 0.6, pointer }
          }
        }
        const inBlock = pipInBlock(game)
        if (inBlock.depth > worst.depth) worst = { depth: inBlock.depth, where: `seed ${seed} at ${t.toFixed(2)}: ${game.hero.mode} in ${PIECES[inBlock.id].kind} ${inBlock.id}` }
      }
    }
    expect(flights).toBeGreaterThan(2)
    // A block creeping onto her can lean a few hundredths into her outline before the head's skin holds it; the drawn head ducks from it.
    expect(worst.depth, worst.where).toBeLessThan(0.06)
  }, 60_000)
})

describe('a newcomer who only copies the ghost hand', () => {
  // Across the room and back: the kite then lands the doll by the next perch
  // and the hand points where a block helps her from there.
  it('frees the shelf board, the hook and the shelf top, each within a dozen demonstrations', () => {
    const { game } = make(defaultState(5))
    const demosPerPerch: number[] = []
    let perch = game.state.perch
    let demos = 0
    let pointer = 1
    for (let frame = 0; frame < 60 * 400 && demosPerPerch.length < 3; frame++) {
      game.step(FRAME)
      if (game.state.perch !== perch) {
        demosPerPerch.push(demos)
        perch = game.state.perch
        demos = 0
      }
      const hint = game.guidance.hint
      if (!game.guidance.hand || !hint || game.guidance.hand.carry <= 0) continue
      demos += 1
      while (game.guidance.hand) game.step(FRAME)
      run(game, 0.5)
      pointer += 1
      const from = hint.kind === 'fromTray' ? slotScreen(hint.id) : hint.from
      game.pointerDown(pointer, from, game.t * 1000)
      // Up and away first, so the press reads as a drag and not as a tap that turns the piece.
      game.pointerMove(pointer, hint.kind === 'fromTray' ? { x: 0, y: 40 } : { x: from.x, y: from.y + 40 })
      const to = { x: hint.to.x, y: hint.to.y + 1.3 }
      game.pointerMove(pointer, to)
      run(game, 0.5)
      game.pointerUp(pointer, to, game.t * 1000 + 900)
      run(game, 1)
    }
    expect(demosPerPerch).toHaveLength(3)
    for (const count of demosPerPerch) expect(count).toBeLessThanOrEqual(12)
  })
})
