import { describe, expect, it } from 'vitest'
import { SUPPLY_LANES, cardHome, hourX, rowEnd, type Point } from './board'
import { deserializeCamp, type CampState } from './camp'
import { Game, GLIDE } from './game'
import { DIAL_RADIUS, LAMP_BODY, obstacles } from './ground'
import { STATE_VERSION } from './state'
import type { CamperId, Supply } from './world'

// Nothing passes through anything. A canvas game has no audit to read its
// scene, so this plays the real model at 60 frames a second through scripted
// nights that reach every state a child can reach, and measures on every
// frame how far anything that moves has gone into anything that stands:
// a walking camper, the dog and each raccoon against every tent, every camper
// lying in its bag, the fire's ring and every lantern on its pin.
//
// Budgets, in design pixels and milliseconds: no mover is ever more than 14
// pixels inside a thing, and all the frames in which any mover is more than
// 6 pixels inside one add up to under 300 ms a scenario. Touching is meant in
// three places and is left out there: a camper setting out from or coming
// back to its own bag, the small one moving in beside its host, and the dog
// lying against the small one.

const DEEPEST = 14
const SHALLOW = 6
const BUDGET_MS = 300

type Play = (game: Game, run: (seconds: number) => void) => void
const at = (position: string, variant: number, more: Partial<CampState> = {}) => new Game(1180, 820, deserializeCamp({ v: STATE_VERSION, position, variant, shown: ['out-fire', 'out-lantern', 'out-kettle'], ...more }), 11)
const tap = (game: Game, p: Point) => { game.press(p); game.lift() }
const lay = (game: Game, supply: Supply, count: number) => tap(game, { x: rowEnd(game.board, supply, count).x, y: game.board.lanes[SUPPLY_LANES.indexOf(supply)] })
const cursor = (game: Game): Point => ({ x: hourX(game.board, game.frame.night.hour), y: game.board.ruler.y - 12 * game.board.u })

function measure(game: Game, play: Play): { deepest: number; where: string; ms: number; frames: number; moved: number } {
  let deepest = 0, where = '', ms = 0, frames = 0, moved = 0
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      game.step(1 / 60, null); game.takeSounds(); game.takeChanged(); frames++
      const board = game.board, u = board.u, frame = game.frame, site = board.site
      const stands = obstacles(site).filter((one) => one.name !== 'dog' && one.name !== 'tin').map((one) => ({ name: one.name, x: board.fire.x + one.at.x * u, y: board.fire.y + one.at.y * u, r: (one.name === 'fire' ? DIAL_RADIUS : one.radius) * u }))
      frame.lanterns.forEach((lantern, i) => { if (!lantern.held) stands.push({ name: `lantern ${i}`, x: lantern.x, y: lantern.y, r: (LAMP_BODY - 6) * u }) })
      const movers: { name: string; x: number; y: number; r: number; skip: (stand: string) => boolean }[] = []
      for (const camper of board.campers) {
        const place = frame.places[camper.who], out = Math.hypot(place.x - camper.at.x, place.y - camper.at.y) > 26 * u
        if (!out) continue
        // A camper out of its bag: its own tent and its own empty bag do not count, nor the host it has moved in beside,
        // nor anything at all while it shuffles along in its bag toward the fire (it comes to lie close against whatever is there).
        const inBag = place.act === 'drags-the-bag-to-the-fire' || place.act === 'hides-in-the-bag' || place.act === 'wakes-hugging-a-raccoon' || place.act === 'wakes-frazzled' || place.act === 'wakes-rested'
        const host = place.withCamper as CamperId | null, near = (who: string) => { const other = board.campers.find((one) => one.who === who); return other ? Math.hypot(place.x - other.head.x, place.y - other.head.y) < 70 * u : false }
        movers.push({ name: `${camper.who} (${place.act})`, x: place.x, y: place.y, r: 11 * u, skip: (stand) => stand.includes(camper.who) || inBag || (host !== null && stand.includes(host) && near(host)) })
        // The bag a camper has left is not there to bump into: take its three rounds out of what stands.
        for (let k = stands.length - 1; k >= 0; k--) if (stands[k].name.startsWith(`${camper.who},`)) stands.splice(k, 1)
      }
      const small = frame.places.small
      movers.push({ name: 'dog', x: frame.dog.x, y: frame.dog.y, r: 10 * u, skip: (stand) => stand.startsWith('small') || (board.campers.some((one) => one.who === 'small') && Math.hypot(frame.dog.x - small.x, frame.dog.y - small.y) < 50 * u) })
      frame.raccoons.forEach((raccoon, i) => { if (raccoon.has !== 'marshmallow') movers.push({ name: `raccoon ${i}`, x: raccoon.x, y: raccoon.y, r: 9 * u, skip: (stand) => stand === 'fire' }) })
      let worst = 0
      for (const mover of movers) for (const stand of stands) {
        if (mover.skip(stand.name)) continue
        const inside = (stand.r + mover.r - Math.hypot(mover.x - stand.x, mover.y - stand.y)) / u
        if (inside > worst) worst = inside
        if (inside > deepest) { deepest = inside; where = `${mover.name} in ${stand.name} at ${site.position}, frame ${frames}` }
      }
      if (worst > SHALLOW) ms += 1000 / 60
      if (movers.length > 1) moved++
    }
  }
  play(game, run)
  return { deepest, where, ms, frames, moved }
}

const nightThrough: Play = (game, run) => { run(0.5); tap(game, cursor(game)); run(game.board.hours / GLIDE + 12) }

describe('nothing passes through anything', () => {
  const scenarios: [string, () => Game, Play][] = [
    ['a dark night at the summit: the fire and the lanterns run out early, the campers go where their tastes take them', () => { const game = at('summit', 0); lay(game, 'logs', 8); lay(game, 'oil', 2); lay(game, 'water', 2); return game }, nightThrough],
    ['the same site with nothing laid in at all: the raccoons come right in, and the secret plays', () => at('summit', 1), nightThrough],
    ['the lantern runs dry and the reader walks to the fire, then into the stream', () => { const game = at('quarry', 0); lay(game, 'logs', 10); lay(game, 'oil', 1); return game }, nightThrough],
    ['the fire too small: the sleeper drags the bag in, and the small one moves in with whoever has light', () => { const game = at('ridge', 1); lay(game, 'logs', 10); lay(game, 'oil', 1); lay(game, 'water', 3); return game }, nightThrough],
    ['a night that holds, at every ring: nobody has to move but the cook', () => { const game = at('birchwood', 0); tap(game, { x: game.board.fire.x - 50 * game.board.u, y: game.board.fire.y }); tap(game, { x: game.board.fire.x - 50 * game.board.u, y: game.board.fire.y }); lay(game, 'logs', 40); return game }, nightThrough],
    ['the scout shows a neat way: it walks down to the rods and back', () => { const game = at('meadow', 0, { shown: ['out-fire'] }); lay(game, 'logs', 18); return game }, nightThrough],
    ['the dog trots to a row\'s end, sniffs, and is sent on a lap of the camp with a card', () => at('tarn', 1), (game, run) => {
      game.press({ x: game.board.pile, y: game.board.lanes[0] - 12 }); game.move(rowEnd(game.board, 'logs', 30)); game.lift(); run(6)
      const home = cardHome(game.board, 'fire'), reader = game.frame.places.reader
      game.press(home); game.move({ x: home.x, y: game.board.walkway - 30 }); game.move({ x: reader.x, y: reader.y }); game.lift(); run(9)
    }],
    ['the cursor dragged to and fro through a bad night, so everyone sets out and turns back', () => { const game = at('summit', 2); lay(game, 'logs', 6); lay(game, 'oil', 1); lay(game, 'water', 1); return game }, (game, run) => {
      run(0.3)
      for (const hour of [3, 6.5, 1, 5, 0.4, 7, 2]) { game.press(cursor(game)); game.move({ x: hourX(game.board, hour), y: game.board.ruler.y }); run(2.2); game.lift(); game.press(cursor(game)); game.lift() }
    }],
  ]

  for (const [name, make, play] of scenarios) {
    it(name, { timeout: 30000 }, () => {
      const seen = measure(make(), play)
      expect(seen.frames).toBeGreaterThan(300)
      expect(seen.deepest, `deepest: ${seen.where}`).toBeLessThanOrEqual(DEEPEST)
      expect(seen.ms, `over ${SHALLOW} pixels inside for ${Math.round(seen.ms)} ms; deepest ${seen.deepest.toFixed(1)}: ${seen.where}`).toBeLessThanOrEqual(BUDGET_MS)
    })
  }

  it('reaches the states it claims to: somebody walks in most of these nights', () => {
    const walked = scenarios.slice(0, 4).map(([, make, play]) => measure(make(), play).moved)
    for (const frames of walked) expect(frames).toBeGreaterThan(60)
  })
})
