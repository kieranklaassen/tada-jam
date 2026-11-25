import { describe, expect, it } from 'vitest'
import type { Id } from './cast'
import { Game } from './game'
import { freshTable, loadTable, saveTable, type Table } from './table'

// Faults a review found, held so they stay gone.

function table(spots: (Id | null)[]): Table {
  const all: Id[] = ['elephant', 'hen', 'hippo', 'pig', 'giraffe', 'crocodile', 'board'], rest = all.filter((id) => !spots.includes(id))
  return { ...freshTable(4), spots, homes: Array.from({ length: 6 }, (_, n) => rest[n] ?? null) }
}
const run = (game: Game, seconds: number, each?: () => void): void => { for (let t = 0; t < seconds; t += 1 / 60) { game.step(1 / 60); each?.() } }

describe('a body and the table', () => {
  it('never jumps round when the table is turned under one that is hopping over', () => {
    const game = new Game(table(['elephant', null, null, null]))
    run(game, 0.2)
    game.tapped('hen')
    let last = game.poses.hen.yaw, most = 0
    const watch = (): void => { most = Math.max(most, Math.abs(game.poses.hen.yaw - last)); last = game.poses.hen.yaw }
    run(game, 0.3, watch)
    game.spin(1)
    run(game, 3, watch)
    expect(most).toBeLessThan(0.35)
    expect(Math.cos(game.poses.hen.yaw - game.table.turns.hen * Math.PI / 2)).toBeCloseTo(1, 3)
  })

  it('never jumps round when it leaves a table that is turning', () => {
    const game = new Game(table(['elephant', 'hen', null, null]))
    run(game, 0.2)
    game.spin(1)
    let last = game.poses.hen.yaw, most = 0
    game.step(1 / 60)
    last = game.poses.hen.yaw
    game.send('hen', { kind: 'step', n: game.table.homes.indexOf(null) })
    run(game, 3, () => { most = Math.max(most, Math.abs(game.poses.hen.yaw - last)); last = game.poses.hen.yaw })
    expect(most).toBeLessThan(0.35)
  })

  it('does not keep its head turned after its act was cut short', () => {
    const game = new Game(table(['pig', 'hen', null, null]))
    game.paint()
    run(game, 9)
    game.paint()
    run(game, 0.4)
    game.paint()
    run(game, 6)
    expect(game.bodies.pig.gaze).toBe(0)
    expect(game.bodies.hen.gaze).toBe(0)
  })
})

describe('the painter', () => {
  it('looks at whoever the table brings round to him', () => {
    const game = new Game(table(['elephant', 'giraffe', null, null]))
    game.spin(1)
    const far = game.table.spots.slice(2).find((id) => id !== null)
    expect(far).toBeDefined()
    run(game, 0.6)
    // The sitter near him stands on the side he leans his head to.
    const mood = (game as unknown as { mood: { x: number } }).mood
    expect(Math.sign(mood.x)).toBe(game.table.spots.indexOf(far!) % 2 === 0 ? -1 : 1)
  })

  it('never shows off a picture of another table than the one that stands there', () => {
    const t = table(['hen', null, null, null])
    const game = new Game(t)
    game.paint()
    run(game, 9)
    const saved = JSON.parse(JSON.stringify(saveTable(t)))
    expect(loadTable(saved, 4).finished).toBe(true)
    saved.turns.hen = (saved.turns.hen + 1) % 4
    expect(loadTable(saved, 4).finished).toBe(false)
  })

  it('answers a touch on the picture that is just falling off its nail', () => {
    const t = table(['hen', null, null, null])
    for (let n = 0; n < 6; n++) t.wall[n] = [['pig', 0], null, null, null]
    t.last = 5
    t.painted = true
    const game = new Game(t)
    game.paint()
    run(game, 0.2)
    game.interrupt()
    game.cues.length = 0
    game.swingPicture(0)
    expect(game.cues.length).toBeGreaterThan(0)
  })
})
