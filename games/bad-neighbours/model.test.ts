import Matter from 'matter-js'
import { describe, expect, it } from 'vitest'
import { CELL, FLOOR, Game, MAX_DELIVERIES, SECURE_DELAY, SHAPES, STEP, paceForAge, type Piece, type Shape } from './model'

function run(game: Game, ms: number, fps = 120) { for (let i = 0; i < Math.ceil(ms / (1000 / fps)); i++) game.advance(1000 / fps) }
const geometry = (p: Piece) => ({ position: { ...p.body.position }, angle: p.body.angle })

function firstLanding() {
  const game = new Game(1), first = game.active!
  game.onEvent = e => { if (e.type === 'impact') game.spawnAt = Infinity }
  game.drop(); run(game, 1200)
  return { game, first }
}

// Deliver an exact arrangement through the real input and collision paths.
function stackBuildings(shapes: Shape[], offsets: number[], fps = 60) {
  const game = new Game(1)
  const buildings = [game.active!]
  let peakAngle = 0
  game.next = [...shapes.slice(1), 'O', 'O', 'O']
  game.onEvent = event => {
    if (event.type === 'spawn' && event.piece) { buildings.push(event.piece); game.aim(offsets[buildings.length - 1]); game.drop() }
    if (event.type === 'impact' && buildings.length === shapes.length) game.spawnAt = Infinity
  }
  game.aim(offsets[0]); game.drop()
  for (let frame = 0; frame < 15 * fps; frame++) {
    game.advance(1000 / fps)
    for (const piece of buildings) if (piece.landed) peakAngle = Math.max(peakAngle, Math.abs(piece.body.angle))
  }
  return { game, buildings, peakAngle }
}

describe('stacking', () => {
  it('a centred drop lands on the slab and settles', () => {
    const { game, first } = firstLanding()
    expect(first.scored).toBe(true)
    expect(Math.abs(first.body.position.x)).toBeLessThan(3)
    expect(Math.abs(first.body.bounds.max.y - FLOOR)).toBeLessThan(1)
    game.dispose()
  })

  it('produces the same landing at 30, 60 and 120 display fps', () => {
    const results = [30, 60, 120].map(fps => {
      const game = new Game(300), first = game.active!
      game.drop(); run(game, 1200, fps)
      const result = [first.body.position.x, first.body.position.y, first.body.angle]; game.dispose(); return result
    })
    for (const r of results.slice(1)) r.forEach((v, i) => expect(Math.abs(v - results[0][i])).toBeLessThan(0.001))
  })

  it('a fallen building is not a loss: it goes back to the queue and nothing ends', () => {
    const game = new Game(7); let lost = 0
    game.onEvent = e => { if (e.type === 'lost') lost++ }
    for (let i = 0; i < 5; i++) { game.aim(180); game.drop(); run(game, 1800) }
    expect(lost).toBeGreaterThanOrEqual(5)
    expect(game.active).not.toBeNull()
    expect(game.spawned).toBe(game.pieces.length)
    game.dispose()
  })

  it('quarter turns return to the original orientation', () => {
    const game = new Game(15), body = game.active!.body, position = { ...body.position }
    for (let i = 0; i < 4; i++) expect(game.rotate()).toBe(true)
    expect(Math.abs(body.angle - Math.PI * 2)).toBeLessThan(1e-8)
    expect(body.position).toEqual(position)
    game.dispose()
  })

  it('aiming uses the visible centre for every shape', () => {
    for (const shape of Object.keys(SHAPES) as Shape[]) {
      const game = new Game(1)
      Matter.Composite.remove(game.engine.world, game.active!.body); game.pieces = []
      game.next[0] = shape; game.spawn(); game.aim(64)
      const { min, max } = game.active!.body.bounds
      expect(Math.abs((min.x + max.x) / 2 - 64)).toBeLessThan(1e-8)
      game.dispose()
    }
  })

  it('the zigzag nests into the J corner without a correction', () => {
    const { game, buildings } = stackBuildings(['O', 'J', 'S'], [0, 0, 0])
    const inset = buildings[2].body.bounds.max.y - buildings[1].body.bounds.min.y
    expect(Math.abs(inset - CELL)).toBeLessThan(1)
    expect(Math.abs(game.height - 5)).toBeLessThan(0.1)
    game.dispose()
  })

  it('a supported wide roof stays level after a fast drop', () => {
    for (const fps of [30, 60, 120]) {
      const { game, peakAngle } = stackBuildings(['O', 'I'], [0, 16], fps)
      expect(game.pieces.length).toBe(2)
      expect(peakAngle).toBeLessThan(0.06)
      game.dispose()
    }
  })

  it('an unsupported overhang still tips while its base becomes a foundation', () => {
    const { game, buildings } = stackBuildings(['O', 'I'], [0, 64])
    expect(Math.abs(buildings[1].body.angle)).toBeGreaterThan(0.4)
    expect(buildings[0].securedAt).toBeGreaterThan(0)
    expect(buildings[0].body.isStatic).toBe(true)
    game.dispose()
  })

  it('scaffolding braces a moving building and needs no charges', () => {
    const game = new Game(11)
    expect(game.glue()).toBe(false)
    const first = game.active!
    game.onEvent = e => { if (e.type === 'impact') game.spawnAt = Infinity }
    game.drop(); run(game, 1100)
    expect(game.glue()).toBe(true)
    expect(first.glued).toBe(true)
    game.dispose()
  })

  it('stops delivering at the cap instead of ending', () => {
    const game = new Game(10); game.spawned = MAX_DELIVERIES
    game.drop(); run(game, 3000)
    expect(game.full).toBe(true)
    expect(game.active).toBeNull()
    game.dispose()
  })

  it('age sets the pace as a hint, with open ends and null', () => {
    expect(paceForAge(null)).toBe(1)
    expect(paceForAge(2)).toBeLessThan(1)
    expect(paceForAge(12)).toBeGreaterThan(1)
  })
})

describe('secured foundations', () => {
  it('a settled building locks after the landing window without moving', () => {
    const { game, first } = firstLanding()
    let events = 0
    game.onEvent = e => { if (e.type === 'secure') events++ }
    while (!first.securedAt) {
      const before = geometry(first); game.advance(STEP)
      if (first.securedAt) {
        expect(first.securedAt - first.contactTime).toBeGreaterThanOrEqual(SECURE_DELAY - 1e-6)
        expect(geometry(first)).toEqual(before)
      }
      expect(game.time).toBeLessThan(5000)
    }
    const fixed = geometry(first)
    for (let n = 0; n < 6; n++) { game.next[0] = 'O'; game.spawn(); game.aim(n % 2 ? 16 : 0); game.drop(); run(game, 1300) }
    expect(geometry(first)).toEqual(fixed)
    expect(events).toBe(game.secured)
    game.dispose()
  })

  it('a sleeping body with no support cannot freeze in mid-air', () => {
    const { game, first } = firstLanding()
    run(game, 1500); Matter.Body.translate(first.body, { x: 0, y: -100 }); Matter.Sleeping.set(first.body, true)
    run(game, 4000)
    expect(first.securedAt).toBe(0)
    expect(first.body.isStatic).toBe(false)
    game.dispose()
  })

  it('a tall tower keeps only its recent landings dynamic', () => {
    const { game } = firstLanding()
    for (let n = 1; n < 40; n++) { game.next[0] = 'O'; game.spawn(); game.drop(); run(game, 1400) }
    expect(game.pieces.filter(p => !p.body.isStatic).length).toBeLessThanOrEqual(3)
    expect(game.maxHeight).toBeGreaterThan(79)
    game.dispose()
  })
})

describe('saving the street', () => {
  it('a restored street keeps its buildings in place and keeps delivering', () => {
    const { game } = firstLanding()
    for (let n = 1; n < 6; n++) { game.next[0] = 'O'; game.spawn(); game.drop(); run(game, 1400) }
    run(game, 4000)
    const saved = game.snapshot()
    expect(saved.length).toBe(6)
    expect(saved.every(p => p.secured)).toBe(true)
    game.dispose()

    const again = new Game(2, undefined, { restore: saved, next: ['T', 'L', 'J'] })
    expect(again.pieces.length).toBe(7)
    expect(again.active?.shape).toBe('T')
    const before = again.pieces.slice(0, 6).map(p => ({ ...p.body.position }))
    run(again, 2000)
    again.pieces.slice(0, 6).forEach((p, i) => {
      expect(Math.abs(p.body.position.x - before[i].x)).toBeLessThan(0.5)
      expect(Math.abs(p.body.position.y - before[i].y)).toBeLessThan(0.5)
    })
    expect(again.maxHeight).toBeGreaterThan(11)
    again.dispose()
  })

  it('an unsecured restored building still settles and secures', () => {
    const { game, first } = firstLanding()
    const saved = game.snapshot()
    expect(first.securedAt).toBe(0)
    expect(saved[0].secured).toBe(false)
    game.dispose()
    const again = new Game(3, undefined, { restore: saved })
    again.onEvent = e => { if (e.type === 'impact') again.spawnAt = Infinity }
    Matter.Composite.remove(again.engine.world, again.active!.body); again.pieces.pop(); again.active = null; again.spawnAt = Infinity
    run(again, 4000)
    expect(again.pieces[0].securedAt).toBeGreaterThan(0)
    again.dispose()
  })
})
