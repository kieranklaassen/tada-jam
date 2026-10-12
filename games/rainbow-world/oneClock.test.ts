import { beforeAll, describe, expect, it } from 'vitest'
import { IdleLadder } from './guidance'
import { useCanvases } from './paper'
import { PIECES } from './pieces'
import { Recording, recordingCanvases } from './recording'
import { RainbowView } from './view'
import { World, firstPlaces } from './world'
import cast from './cast.ts?raw'
import hit from './hit.ts?raw'
import pairs from './pairs.ts?raw'
import play from './play.ts?raw'
import pose from './pose.ts?raw'
import scenesBasket from './scenesBasket.ts?raw'
import scenesCarry from './scenesCarry.ts?raw'
import scenesClimb from './scenesClimb.ts?raw'
import scenesGhost from './scenesGhost.ts?raw'
import script from './script.ts?raw'
import stack from './stack.ts?raw'
import tastes from './tastes.ts?raw'
import thing from './thing.ts?raw'
import figures from './figures.ts?raw'
import layout from './layout.ts?raw'
import motion from './motion.ts?raw'
import mount from './rainbow-world.tsx?raw'
import paper from './paper.ts?raw'
import pieces from './pieces.ts?raw'
import props from './props.ts?raw'
import save from './save.ts?raw'
import scenery from './scenery.ts?raw'
import sounds from './sounds.ts?raw'
import view from './view.ts?raw'
import world from './world.ts?raw'

// One clock for sight and sound. Everything that moves and everything that sounds is driven from the world's
// own time, which only `World.step` moves. This file holds that in three ways: the game's own modules name no
// other clock, the world does nothing between steps, and the view draws the same frame twice from the same
// world.

/** The code of a file without its comments, where the words below are allowed. */
const code = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const OTHER_CLOCKS = ['setTimeout', 'setInterval', 'Date.now', 'new Date', 'performance.now', 'requestAnimationFrame', 'currentTime', 'timeStamp']

describe('one clock for sight and sound', () => {
  it('names no other clock in the rules, the motion, the sounds or the view', () => {
    const own = { figures, layout, motion, paper, pieces, props, save, scenery, sounds, view, world, cast, hit, pairs, play, pose, scenesBasket, scenesCarry, scenesClimb, scenesGhost, script, stack, tastes, thing }
    for (const [name, source] of Object.entries(own)) for (const clock of OTHER_CLOCKS) expect(code(source).includes(clock), `${name} names ${clock}`).toBe(false)
  })

  it('sets no timer in the Mount, and hands the world nothing but the attended clock\'s step', () => {
    const source = code(mount)
    for (const clock of ['setTimeout', 'setInterval', 'Date.now', 'new Date', 'currentTime']) expect(source.includes(clock), clock).toBe(false)
    // The tracker's wait for a lifted finger runs on the wall clock, so the Mount never asks it to advance.
    expect(source.includes('touch.advance(')).toBe(false)
    // The Mount hands the step to `play.frame`, which hands the same step to the world and to the idle ladder.
    expect(source.match(/play\.frame\(([^)]*)\)/g)).toEqual(['play.frame(playing.step)'])
    expect(source.includes('world.step(')).toBe(false)
    expect(code(play).match(/world\.step\(([^)]*)\)/g)).toEqual(['world.step(step)'])
    // The wall clock is read for the save throttle and the frame's cost, and for nothing the world is told.
    for (const line of source.split('\n').filter((each) => each.includes('performance.now()'))) expect(/cadence\.|const start =|lastWork =/.test(line), line.trim()).toBe(true)
  })

  it('does nothing between steps: a thing sent to the mat lands only when the world is stepped', () => {
    const still = new World()
    still.press(PIECES['doll-round'].home.x, PIECES['doll-round'].home.y - 40)
    still.press(560, 560)
    still.takeSounds()
    expect(still.time).toBe(0)
    expect(still.piece('doll-round').flight?.t).toBe(0)
    expect(still.takeSounds()).toEqual([])
    still.step(1)
    expect(still.time).toBeCloseTo(1, 9)
    expect(still.takeSounds().map((sound) => sound.name)).toEqual(['knock'])
  })

  it('plays the same sounds at the same moments however the time is cut into frames', () => {
    const run = (frame: number): { name: string; at: number }[] => {
      const world = new World(firstPlaces(true)), heard: { name: string; at: number }[] = []
      const listen = (): void => { for (const sound of world.takeSounds()) heard.push({ name: `${sound.name}:${sound.piece ?? ''}`, at: world.time }) }
      const script: [number, () => void][] = [
        [0.2, () => world.press(PIECES.horse.home.x, PIECES.horse.home.y - 40)],
        [0.6, () => world.press(480, 540)],
        [1.6, () => { world.press(480, 500); world.tap() }],
        [2.0, () => { world.press(480, 470); world.tap() }],
        [3.4, () => world.press(PIECES['arch-large'].home.x, PIECES['arch-large'].home.y - 40)],
        [3.8, () => { world.press(PIECES['arch-large'].home.x, PIECES['arch-large'].home.y - 70); world.tap() }],
      ]
      let next = 0
      for (let t = 0; t < 8; t += frame) {
        while (next < script.length && script[next][0] <= t + 1e-9) { script[next][1](); listen(); next += 1 }
        world.step(frame)
        listen()
      }
      return heard
    }
    // The script's moments are whole numbers of both frame lengths, so the two runs are touched at the same times.
    const fine = run(1 / 60), coarse = run(1 / 20)
    expect(fine.length).toBeGreaterThan(12)
    expect(coarse.map((sound) => sound.name)).toEqual(fine.map((sound) => sound.name))
    for (let i = 0; i < fine.length; i++) expect(Math.abs(coarse[i].at - fine[i].at), fine[i].name).toBeLessThanOrEqual(1 / 20 + 1e-6)
  })

  describe('the view', () => {
    let surface: Recording
    let seen: RainbowView
    beforeAll(() => {
      useCanvases(recordingCanvases().make)
      surface = new Recording(1180, 820)
      seen = new RainbowView({ getContext: () => surface.ctx } as unknown as HTMLCanvasElement, 1)
      seen.setTier({ dpr: 1, motes: 7 })
      seen.resize(1180, 820, 1)
    })

    it('draws the same frame twice from the same world, and another once the world has stepped', () => {
      const moving = new World(firstPlaces(true)), ladder = new IdleLadder(0)
      moving.press(PIECES.horse.home.x, PIECES.horse.home.y - 40)
      moving.press(480, 540)
      moving.step(0.1)
      const frame = (): string => { surface.reset(); seen.draw(moving, ladder.update(moving.time)); return surface.log.join('\n') }
      const first = frame()
      expect(frame()).toBe(first)
      moving.step(1 / 60)
      expect(frame()).not.toBe(first)
    })
  })
})
