import { describe, expect, it } from 'vitest'
import { BEACHES } from './beaches'
import { deltaAt } from './field'
import { SHELL_KEPT } from './folk'
import { Play } from './play'
import { apart, crabRounds } from './solid'
import { JOURNEY_SECONDS } from './sun'
import { SHELL_RADIUS } from './things'

// The shell the crab wears as a hat. Nothing lifts or sounds that no touch
// asked for when the beach is opened or a scene is ended; the tock of the
// shell set down as the tide goes out belongs to that scene; and a shell set
// down beside the crab lies on dry flat sand, in the same place lap after lap.

const DT = 1 / 60
const steps = (play: Play, seconds: number, each?: () => void): void => {
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    play.step(DT)
    each?.()
  }
}
const tapSun = (play: Play): void => {
  play.press({ kind: 'sun' })
  play.tap()
}
/** How far the crab's legs and body are from a shell. */
const off = (play: Play, index: number): number => apart(crabRounds(play.folk.crab), [{ x: play.things.shells[index].x, z: play.things.shells[index].z, r: SHELL_RADIUS }])
const tocks = (play: Play): number => play.heard.filter((heard) => heard.name === 'tock').length

describe('a shell lying where the crab would be set down', () => {
  it('on load: the crab is set down clear of it, and nothing lifts or sounds untouched', () => {
    // Where the evening sets the crab down with nothing there.
    const bare = new Play(BEACHES.evening(7), 3)
    const state = BEACHES.evening(7)
    state.shells[0] = { x: bare.folk.crab.x, z: bare.folk.crab.z, up: true, state: 'lying' }
    const play = new Play(state, 3)
    expect(off(play, 0)).toBeGreaterThanOrEqual(SHELL_KEPT)
    steps(play, 0.5, () => expect(play.hat).toBe(-1))
    expect(play.heard).toEqual([])
    expect(play.poses.shells.every((pose) => pose.fly === null)).toBe(true)
  })

  it('at the end of a scene a touch cut short: the same', () => {
    const ended = (shell: { x: number; z: number } | null): Play => {
      const state = BEACHES.kingdom(7)
      if (shell) state.shells[0] = { ...shell, up: true, state: 'lying' }
      const play = new Play(state, 3)
      steps(play, 1)
      tapSun(play)
      steps(play, JOURNEY_SECONDS + 1.5)
      expect(play.playing).toBe(true)
      play.endScene()
      return play
    }
    const bare = ended(null)
    const play = ended({ x: bare.folk.crab.x, z: bare.folk.crab.z })
    expect(off(play, 0)).toBeGreaterThanOrEqual(SHELL_KEPT)
    const heard = tocks(play)
    steps(play, 0.5, () => expect(play.hat).toBe(-1))
    expect(tocks(play)).toBe(heard)
    expect(play.poses.shells.every((pose) => pose.fly === null)).toBe(true)
  })
})

/** A wrong evening with one shell laid at the crab's feet after `start` seconds: it wears it, the sun is tapped up, and the tide goes out. */
function tideWithHat(start: number): { play: Play; worn: boolean } {
  const play = new Play(BEACHES['wrong-evening'](7), 1)
  for (const index of [0, 1]) play.things.shells[index].state = 'bucket'
  steps(play, start)
  Object.assign(play.things.shells[2], { x: play.folk.crab.x + 0.3, z: play.folk.crab.z + 0.2, state: 'lying' })
  for (let t = 0; t < 2 && play.hat !== 2; t += DT) play.step(DT)
  expect(play.hat).toBe(2)
  tapSun(play)
  // Until the scene begins with the shell in the air.
  let worn = true
  for (let t = 0; t < JOURNEY_SECONDS + 2 && !(play.playing && play.poses.shells[2].fly !== null); t += DT) {
    worn = play.hat === 2
    play.step(DT)
  }
  expect(play.playing).toBe(true)
  expect(play.poses.shells[2].fly).not.toBeNull()
  expect(play.hat).toBe(-1)
  return { play, worn }
}

/** A touch ends the scene with the shell in the air: it lies where the save has it, and its landing is never heard. */
function endedInTheAir(play: Play): void {
  play.step(DT)
  const before = tocks(play)
  play.endScene()
  const lies = play.things.shells[2], drawn = play.shellPose(2)
  expect(play.poses.shells[2].fly).toBeNull()
  expect(drawn.x).toBeCloseTo(lies.x, 5)
  expect(drawn.z).toBeCloseTo(lies.z, 5)
  expect(play.toState().shells[2]).toMatchObject({ x: lies.x, z: lies.z })
  // The tock of its landing was still to come: it is taken back, and nothing sounds after.
  expect(tocks(play)).toBe(before - 1)
  const voices = play.voices.length
  steps(play, 2)
  expect(tocks(play)).toBe(before - 1)
  expect(play.voices.length).toBe(voices)
}

describe('the hat set down as the tide goes out', () => {
  it('is a cue of that scene: a touch that ends the scene leaves the shell where the save has it, silent from that frame', () => {
    // Far from home when the sun is tapped: the shell is still on its head when the sun arrives, and the scene sets it down.
    const { play, worn } = tideWithHat(5)
    expect(worn).toBe(true)
    endedInTheAir(play)
  })

  it('and a shell the crab had set down by itself, still in the air as the scene begins, lands silently too', () => {
    // Near home: it has stopped and set the shell down a moment before the sun arrives.
    const { play, worn } = tideWithHat(3)
    expect(worn).toBe(false)
    endedInTheAir(play)
  })
})

describe('a hat set down beside the crab', () => {
  // Two shells on the crab's bank: wearing one, it comes to the other and sets the first down beside itself.
  // In the first evening the two lie a stride apart; in the second the nearest clear place beside the crab is in
  // the channel that runs to the sea, and the shell is set down on the dry sand next to it all the same.
  for (const [name, seed, first, second, laps] of [['beside the moat', 3, [0, 5.88], [2.35, 3.42], 10], ['beside the channel', 2, [1.57, 2.18], [1.97, 4.88], 6]] as const) {
    it(`lies on dry flat sand out of the water, and in the same place lap after lap: ${name}`, { timeout: 60_000 }, () => {
      const state = BEACHES.evening(7)
      state.shells[0] = { x: first[0], z: first[1], up: true, state: 'lying' }
      state.shells[2] = { x: second[0], z: second[1], up: true, state: 'lying' }
      const play = new Play(state, seed)
      const downs: { index: number; x: number; z: number }[] = []
      let hat = play.hat
      steps(play, 150, () => {
        if (hat >= 0 && play.hat !== hat) downs.push({ index: hat, x: play.things.shells[hat].x, z: play.things.shells[hat].z })
        hat = play.hat
      })
      // It goes on lapping, and lifts and sets down lap after lap.
      expect(downs.length).toBeGreaterThanOrEqual(laps)
      for (const down of downs) {
        for (const [dx, dz] of [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) expect(Math.abs(deltaAt(play.field, down.x + dx, down.z + dz)), `shell ${down.index} at ${down.x.toFixed(2)}, ${down.z.toFixed(2)}`).toBeLessThan(0.05)
      }
      // It goes on the same way round, one shell and then the other: an arm of the starfish out over its bank for a
      // moment does not send it right round its ring to come at the next place from the other side.
      if (name === 'beside the moat') downs.forEach((down, at) => {
        if (at > 0) expect(down.index, `set down ${at}`).not.toBe(downs[at - 1].index)
      })
      // Each shell comes to rest in one place, and is put back there each lap after: it does not creep.
      for (const index of [0, 2]) {
        const mine = downs.filter((down) => down.index === index).slice(-3)
        expect(mine.length).toBe(3)
        for (const down of mine) expect(Math.hypot(down.x - mine[0].x, down.z - mine[0].z)).toBeLessThan(1e-6)
      }
    })
  }
})
