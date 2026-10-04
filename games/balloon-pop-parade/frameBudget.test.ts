import { describe, expect, it } from 'vitest'
import { BODIES, type KindName } from './bodies'
import { GROUND, skySlots, viewFor, waitingSpot } from './layout'
import type { Pose } from './pose'
import { freshSave } from './save'
import { MAX_BALLOONS, MAX_SHADOWS, MAX_STRINGS } from './scenery'
import { Theatre, type Painter } from './theatre'

// The frame budget, counted and not timed, so it holds on a busy machine. What a frame costs the renderer is fixed
// by what the theatre asks the stage to draw: six draws for each friend on stage (seven for a hippo, whose jaw is
// a part of its own), and a fixed handful for
// everything else, however many balloons there are. The test plays whole games with a seeded child who taps fast
// and at random, through every scene, and holds the most any frame asked for under the jam's bar.

/**
 * Draws a frame makes besides the friends and the far hill's batches: the sky, two hills, three clouds, the three
 * batches and the ghost hand. The far hill adds one for each batch it uses in the frame: one a kind, and one more
 * for a kind that has a friend there without a balloon.
 */
const FIXED_DRAWS = 1 + 2 + 3 + 3 + 1
const DRAWS_A_FRIEND = 6
/** The jam's bar is about 80 draw calls; the game keeps a margin under it. */
const DRAW_BUDGET = 76

const VIEW = viewFor(1180, 820)

function counter() {
  const frame = { friends: new Map<string, KindName>(), balloons: 0, strings: 0, shadows: 0, marchers: 0, batches: new Set<string>() }
  const painter: Painter = {
    place: (name: string, kind: KindName, _pose: Pose) => void frame.friends.set(name, kind),
    drop: (name) => void frame.friends.delete(name),
    balloon: () => void (frame.balloons += 1),
    string: () => void (frame.strings += 1),
    shadow: () => void (frame.shadows += 1),
    marcher: (kind, _x, _y, _z, _scale, _turn, _lean, holds) => { frame.marchers += 1; frame.batches.add(holds === false && BODIES[kind].lowest <= 0 ? `${kind} strolling` : kind) },
    hand: () => {},
    cloud: () => {},
  }
  return { frame, painter, clear: () => { frame.balloons = 0; frame.strings = 0; frame.shadows = 0; frame.marchers = 0; frame.batches.clear() } }
}

describe('the frame budget', () => {
  it('stays under the jam\'s bar of draw calls and inside every batch through whole games played fast and at random', () => {
    const most = { draws: 0, friends: 0, balloons: 0, strings: 0, shadows: 0, marchers: 0 }
    let cycles = 0
    for (const [age, seed] of [[2, 11], [3, 12], [4, 13], [4, 14]] as const) {
      const theatre = new Theatre(freshSave(age, seed), seed), { frame, painter, clear } = counter()
      let state = seed
      const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
      for (let i = 0; i < 60 * 90; i++) {
        if (i % 9 === 0) {
          const roll = random()
          if (roll < 0.55) {
            // A bunch, most often one of the troop's own colour, so cycles end and troops step in.
            const own = theatre.sky.map((bunch, slot) => (bunch.colour === theatre.troop.kind ? slot : -1)).filter((slot) => slot >= 0)
            const slot = random() < 0.7 && own.length > 0 ? own[Math.floor(random() * own.length)] : Math.floor(random() * theatre.sky.length)
            const at = skySlots(theatre.sky.length, VIEW)[slot]
            theatre.press(at.x, at.y, VIEW)
          } else if (roll < 0.75) {
            const spot = waitingSpot(0, VIEW)
            theatre.press(spot.x, GROUND + 0.8, VIEW)
          } else theatre.press((random() - 0.5) * VIEW.width, (random() - 0.5) * VIEW.height, VIEW)
          if (random() < 0.92) theatre.release(VIEW)
          else theatre.cancel()
        }
        theatre.step(1 / 60)
        clear()
        theatre.paint(painter, VIEW, { glow: 1, demo: 0.4, demoIndex: i % 4 })
        const draws = FIXED_DRAWS + frame.batches.size + [...frame.friends.values()].reduce((sum, kind) => sum + DRAWS_A_FRIEND + (BODIES[kind].jaw.length > 0 ? 1 : 0), 0)
        most.draws = Math.max(most.draws, draws)
        most.friends = Math.max(most.friends, frame.friends.size)
        most.balloons = Math.max(most.balloons, frame.balloons)
        most.strings = Math.max(most.strings, frame.strings)
        most.shadows = Math.max(most.shadows, frame.shadows)
        most.marchers = Math.max(most.marchers, frame.marchers)
      }
      cycles += theatre.save.parade.length
      theatre.sounds.length = 0
    }
    expect(cycles, 'the games got somewhere: troops were served and stepped in').toBeGreaterThan(8)
    expect(most.draws, `${most.friends} friends at most`).toBeLessThanOrEqual(DRAW_BUDGET)
    expect(most.balloons).toBeLessThanOrEqual(MAX_BALLOONS)
    expect(most.strings).toBeLessThanOrEqual(MAX_STRINGS)
    expect(most.shadows).toBeLessThanOrEqual(MAX_SHADOWS)
    // Four troops of three round the far hill, and a troop of three that passed going over its shoulder.
    expect(most.marchers).toBeLessThanOrEqual(15)
    // The heaviest frame is a real one: a troop marching off, one walking in and one coming to the edge.
    expect(most.friends).toBeGreaterThanOrEqual(6)
  }, 30_000)
})
