import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Cast } from './cast'
import { TIERS } from './config'
import { Effects } from './effects'
import { drawn, everyEvent, roomFor } from './fixtures'
import { ACTS, CHARM_EVERY_S, Game, type ActName } from './game'
import { CAGE, TOOLS, indexOf } from './layout'
import { BACK_S, WIND_S, heldIn, molePose, passed, strikeOf, swayOf } from './poses'
import { layWorld } from './world'

// The poses are read off the game's clock: a blow is at its far point at the
// moment the game makes its sound. And every value the model sets for the
// view to show is read by the view: a pose that is set and never drawn is a
// lie the tests of the rules cannot see.

const ACT_NAMES = Object.keys(ACTS) as ActName[]

describe('a blow is at its far point at its moment', () => {
  it('is exactly 1 at every moment of every act, and rises into it and falls away after it', () => {
    for (const act of ACT_NAMES) {
      for (const cue of ACTS[act].cues as readonly number[]) {
        expect(strikeOf(act, cue), act).toBe(1)
        expect(strikeOf(act, cue - WIND_S / 2), act).toBeLessThan(1)
        expect(strikeOf(act, cue - WIND_S / 2), act).toBeGreaterThan(0)
        expect(strikeOf(act, cue + BACK_S / 2), act).toBeLessThan(1)
      }
    }
    // Away from every moment the paw is at rest.
    expect(strikeOf('swing', 0)).toBe(0)
    expect(strikeOf('wedgeEarth', 0.6)).toBe(0)
    expect(strikeOf('judder', 0.2)).toBe(0)
  })

  it('counts the moments that have passed, and every act ends after its last moment', () => {
    for (const act of ACT_NAMES) {
      const cues = ACTS[act].cues as readonly number[]
      expect(passed(act, 0)).toBe(0)
      expect(passed(act, ACTS[act].length)).toBe(cues.length)
      for (const cue of cues) expect(cue).toBeLessThan(ACTS[act].length)
      // No two moments so close that one blow hides the next.
      for (let i = 1; i < cues.length; i++) expect(cues[i] - cues[i - 1]).toBeGreaterThan(0.19)
    }
  })

  it('stands the charmed rope up at its moment and has it at one end of its sway at every hiss', () => {
    const cue = ACTS.ropeCharm.cues[0]
    expect(swayOf(cue - 0.01)).toBe(0)
    expect(swayOf(cue)).toBe(1)
    for (let k = 1; k < 6; k++) expect(Math.abs(swayOf(cue + k * CHARM_EVERY_S))).toBeCloseTo(1, 6)
    expect(Math.abs(swayOf(cue + CHARM_EVERY_S / 2))).toBeLessThan(1e-6)
  })

  it('holds the tool he carries, and the pick for a blow of the pick', () => {
    for (const tool of TOOLS) {
      expect(heldIn(null, tool)).toBe(tool)
      expect(heldIn('swing', tool)).toBe('pick')
      expect(heldIn('judder', tool)).toBe('pick')
    }
    expect(heldIn(null, null)).toBe('pick')
    expect(heldIn('mallet', 'wedge')).toBe('pick')
    expect(heldIn('gong', 'bucket')).toBe('bucket')
    expect(heldIn('haul', 'rope')).toBe('rope')
  })

  it('keeps his pick down in the cage, ducks under a lamp, and pulls his hat down in white light', () => {
    const waiting = layWorld(2, 'near')
    waiting.mole.at = CAGE
    const inCage = new Game(waiting)
    expect(molePose(inCage, new Cast(1, inCage).mole).arm).toBeGreaterThan(0)
    const lamp = drawn('@oe', 'eee')
    lamp.gems.push({ colour: 'red', at: 0, rest: 'hung' })
    const under = new Game(lamp)
    expect(molePose(under, new Cast(1, under).mole).tall).toBeLessThan(0.6)
    const white = drawn('@oe', 'eee')
    for (const colour of ['red', 'green', 'blue'] as const) white.gems.push({ colour, at: 1, rest: 'floor' })
    const dazzled = new Game(white)
    expect(molePose(dazzled, new Cast(1, dazzled).mole).hatDown).toBe(1)
  })
})

describe('every value the model sets for the view is read by the view', () => {
  const source = (name: string): string => readFileSync(new URL(name, import.meta.url), 'utf8')
  const view = source('./view.ts'), poses = source('./poses.ts'), game = source('./game.ts'), cast = source('./cast.ts')
  const reads = (text: string, owner: string, key: string): boolean => new RegExp(`\\b${owner}\\.${key}\\b`).test(text)

  /** Checks every key of a thing: it is read where the list says, unless it is named as the rules' own with a reason. */
  function held(thing: object, owner: string[], texts: string[], own: Record<string, string>): void {
    const unread: string[] = []
    for (const key of Object.keys(thing)) {
      if (key in own) continue
      if (!texts.some((text) => owner.some((name) => reads(text, name, key)))) unread.push(key)
    }
    expect(unread).toEqual([])
    // A reason that is listed is still needed: the key is there, and is not drawn.
    for (const key of Object.keys(own)) expect(Object.keys(thing), key).toContain(key)
  }

  it('the pose of the mole: every value `molePose` works out is drawn', () => {
    const world = layWorld(2, 'near')
    const one = new Game(world)
    held(molePose(one, new Cast(1, one).mole), ['pose'], [view], {})
  })

  it('the mole as the rules hold him', () => {
    const one = new Game(layWorld(2, 'near'))
    held(one.mole, ['mole'], [view, poses], {
      x: 'read through `moleAt`, which the view draws him at',
      y: 'read through `moleAt`, which the view draws him at',
      length: 'how long the act takes: the rules end the act by it, and the poses read the act\'s moments',
      n: 'which blow of a block this is: it sets the pitch of the tink and the ring, and the cracks are drawn from the block\'s own blows',
    })
    expect(view).toMatch(/\bmoleAt\(\)/)
    expect(game).toMatch(/moleAt\(\): Point/)
  })

  it('what a scene stages', () => {
    const one = new Game(layWorld(2, 'near'))
    held(one.staging, ['staging'], [view, poses], { name: 'which scene plays: the cast and the poses read it as `sceneName`' })
    expect(cast).toMatch(/\bsceneName\b/)
    for (const key of ['backed', 'swept', 'riding']) expect(game, key).toMatch(new RegExp(`this\\.${key}\\b`))
    for (const key of ['shaking', 'stepping', 'sceneAge', 'swept']) expect(poses, key).toMatch(new RegExp(`game\\.${key}\\b`))
    for (const key of ['motions', 'drips', 'hand', 'masks', 'world']) expect(view, key).toMatch(new RegExp(`game\\.${key}\\b`))
  })

  it('the cast: the mammoth, the mole face, a dweller, a worm, the herd, the cage and the lamp', () => {
    const one = new Game(roomFor('bat'))
    const all = new Cast(1, one)
    held(all.mammoth, ['m'], [view], {})
    held(all.mole, ['face'], [view, poses], {})
    held(all.lodgers[0], ['lodger'], [view], {
      away: 'how far it has drawn back: folded into `shown`, which is what is drawn and touched',
      wait: 'seconds until its next idle move: the move itself is `idleBeat`',
      here: 'how far it has arrived: folded into `shown`; the view reads it for the manner of leaving',
      flight: 'where a leaving bat flies to: the cast turns it into `off`, which is what is drawn and touched',
    })
    expect(reads(view, 'lodger', 'here')).toBe(true)
    const fresh = new Game(layWorld(2, 'near'))
    const worms = new Cast(1, fresh).worms
    expect(worms.length).toBeGreaterThan(0)
    held(worms[0], ['worm'], [view], { shy: 'seconds it stays in: the spring `out` is what is drawn' })
    for (const key of ['beasts', 'cage', 'lamp', 'lodgers', 'worms', 'mammoth', 'mole']) expect(view, key).toMatch(new RegExp(`cast\\.${key}\\b`))
  })

  it('what a touch throws off: every number of every kind of it', () => {
    const one = new Game(roomFor('bat'))
    const effects = new Effects(3)
    for (const event of everyEvent()) effects.feed({ ...event, ...('index' in event ? { index: indexOf(1, 5) } : {}) } as never, one, TIERS[0])
    const names: [string, readonly object[], string[], Record<string, string>][] = [
      ['chips', effects.chips, ['chip'], { vx: 'its speed: the effects move it, the view draws where it is', vy: 'its speed, as `vx`', spin: 'its turning speed: `turn` is drawn', floor: 'the dug space it stays in: the effects keep it there', left: 'as `floor`', right: 'as `floor`' }],
      ['puffs', effects.puffs, ['puff'], {}],
      ['prints', effects.prints, ['print'], {}],
      ['shudders', effects.shudders, ['shudder'], {}],
      ['wisps', effects.wisps, ['wisp'], {}],
      ['flashes', effects.flashes, ['flash'], {}],
      ['beads', effects.beads, ['bead'], {}],
      ['hops', effects.hops, ['hop', 'other'], {}],
    ]
    for (const [name, list, owner, own] of names) {
      expect(list.length, name).toBeGreaterThan(0)
      expect(view, name).toMatch(new RegExp(`effects\\.${name}\\b`))
      held(list[0], owner, [view], own)
    }
  })
})
