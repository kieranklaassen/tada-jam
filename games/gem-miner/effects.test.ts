import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { Effects, MOST_BEADS, MOST_CHIPS, MOST_FLASHES, MOST_PRINTS, MOST_PUFFS, MOST_SHUDDERS, MOST_WISPS, TINT } from './effects'
import { drawn, everyEvent } from './fixtures'
import { Game, type Event } from './game'
import { CELL, HILL, indexOf } from './layout'

// What a touch throws off: how much of it at each quality tier, where it
// stays, and that all of it is gone again.

const FRAME = 1 / 60
const at = { x: 300, y: 300 }
const cave = (): Game => new Game(drawn('o@ee', 'eeee'))
const fed = (event: Event, tier = TIERS[0], game = cave()): Effects => {
  const effects = new Effects(7)
  effects.feed(event, game, tier)
  return effects
}
const total = (effects: Effects): number => effects.chips.length + effects.puffs.length + effects.prints.length + effects.shudders.length + effects.wisps.length + effects.flashes.length + effects.beads.length + effects.hops.length

describe('what each touch throws off', () => {
  it('gives every kind of knock its own: crumbs, a thread of sand, a bead, a wisp, a flash', () => {
    const knock = (kind: 'earth' | 'sandstone' | 'granite' | 'water' | 'gas' | 'gem' | 'open' | 'grass'): Effects => fed({ type: 'knock', kind, index: 2, at, colour: kind === 'gem' ? 'green' : undefined })
    const earth = knock('earth')
    expect(earth.chips).toHaveLength(3)
    expect(earth.chips.every((chip) => chip.tint >= TINT.earth && chip.tint < TINT.sand)).toBe(true)
    const sand = knock('sandstone')
    expect(sand.chips).toHaveLength(4)
    expect(sand.chips.every((chip) => chip.tint >= TINT.sand && chip.tint < TINT.spark && chip.vy > 0)).toBe(true)
    expect(knock('granite').chips).toHaveLength(0)
    expect(knock('water').beads).toHaveLength(1)
    expect(knock('water').puffs).toHaveLength(0)
    expect(knock('gas').wisps).toHaveLength(1)
    expect(knock('gem').flashes).toMatchObject([{ index: 2, colour: 'green', swirl: false }])
    // Every block that is struck shudders; dug space and the grass do not.
    for (const kind of ['earth', 'sandstone', 'granite', 'water', 'gas', 'gem'] as const) expect(knock(kind).shudders, kind).toMatchObject([{ index: 2 }])
    expect(knock('open').shudders).toHaveLength(0)
    expect(knock('grass').shudders).toHaveLength(0)
    expect(knock('grass').puffs).toHaveLength(1)
  })

  it('throws twice the chips at a break as at a chip, in the pigment of the ground', () => {
    const chip = fed({ type: 'chip', kind: 'sandstone', index: 2, n: 1, aside: false, from: at })
    const broke = fed({ type: 'break', kind: 'earth', index: 2, n: 1, aside: false, from: at })
    expect(chip.chips).toHaveLength(TIERS[0].chips)
    expect(broke.chips).toHaveLength(TIERS[0].chips * 2)
    expect(chip.chips.every((one) => one.tint >= TINT.sand && one.tint < TINT.spark)).toBe(true)
    expect(broke.chips.every((one) => one.tint < TINT.sand)).toBe(true)
    expect(chip.shudders).toHaveLength(1)
  })

  it('strikes sparks off granite and off a gem sprung free, and drops off water', () => {
    expect(fed({ type: 'clang', index: 2, from: at }).chips.every((chip) => chip.tint === TINT.spark)).toBe(true)
    expect(fed({ type: 'clang', index: 2, from: at }).chips).toHaveLength(8)
    expect(fed({ type: 'ping', colour: 'red', index: 2 }).chips.every((chip) => chip.tint === TINT.spark)).toBe(true)
    for (const type of ['jet', 'bloop', 'plap', 'gush', 'plink'] as const) {
      const wet = fed({ type, index: 1 })
      expect(wet.chips.length, type).toBeGreaterThan(0)
      expect(wet.chips.every((chip) => chip.tint === TINT.water), type).toBe(true)
    }
    expect(fed({ type: 'step', node: 1, wade: true, slop: false }).chips.every((chip) => chip.tint === TINT.water)).toBe(true)
    expect(fed({ type: 'step', node: 1, wade: false, slop: false }).chips).toHaveLength(0)
  })

  it('tips out what the bucket held, in its own pigment', () => {
    const tint = { earth: TINT.earth, mud: TINT.earth, sand: TINT.sand, water: TINT.water } as const
    for (const what of ['earth', 'sand', 'water'] as const) {
      const tipped = fed({ type: 'tip', index: 1, what })
      expect(tipped.chips).toHaveLength(TIERS[0].chips)
      for (const chip of tipped.chips) expect(Math.floor(chip.tint / 3) * 3 === tint[what] || chip.tint === tint[what], what).toBe(true)
      expect(tipped.puffs.length, what).toBe(what === 'water' ? 0 : 1)
    }
  })

  it('curls a wisp out at every smell of gas, and swirls a struck gem its own colour', () => {
    for (const type of ['whoomph', 'whistle', 'fff', 'charm'] as const) expect(fed({ type, index: 2 }).wisps, type).toHaveLength(1)
    for (const colour of ['red', 'green', 'blue'] as const) expect(fed({ type: 'chime', colour, index: 2 }).flashes).toMatchObject([{ colour, swirl: true }])
  })

  it('hops the tool a finger lands on, and only that one', () => {
    const effects = new Effects(7), game = cave()
    for (const tool of ['wedge', 'bucket', 'rope'] as const) {
      effects.feed({ type: 'poke', who: tool, index: 0 }, game, TIERS[0])
      effects.feed({ type: 'poke', who: tool, index: 0 }, game, TIERS[0])
    }
    expect(effects.hops.map((hop) => hop.tool)).toEqual(['wedge', 'bucket', 'rope'])
    expect(fed({ type: 'poke', who: 'mammoth', index: 0 }).hops).toHaveLength(0)
  })

  it('leaves a sprayed hand on bare wall', () => {
    const effects = fed({ type: 'print', at })
    expect(effects.prints).toMatchObject([{ x: at.x, y: at.y }])
  })
})

describe('a cheaper tier', () => {
  it('throws fewer chips and, at the last, no dust: the same events, less of each', () => {
    const blow: Event = { type: 'break', kind: 'earth', index: 2, n: 1, aside: false, from: at }
    const chips = TIERS.map((tier) => fed(blow, tier).chips.length)
    for (let i = 1; i < chips.length; i++) expect(chips[i]).toBeLessThanOrEqual(chips[i - 1])
    expect(chips[chips.length - 1]).toBeGreaterThan(0)
    expect(chips[chips.length - 1]).toBeLessThan(chips[0])
    const last = TIERS[TIERS.length - 1]
    expect(last.dust).toBe(false)
    for (const event of everyEvent()) expect(fed(event, last).puffs, event.type).toHaveLength(0)
    // What marks the block itself is drawn at every tier.
    for (const tier of TIERS) {
      expect(fed({ type: 'knock', kind: 'granite', index: 2, at }, tier).shudders).toHaveLength(1)
      expect(fed({ type: 'knock', kind: 'gas', index: 2, at }, tier).wisps).toHaveLength(1)
      expect(fed({ type: 'knock', kind: 'water', index: 2, at }, tier).beads).toHaveLength(1)
      expect(fed({ type: 'chime', colour: 'blue', index: 2 }, tier).flashes).toHaveLength(1)
    }
  })
})

describe('how much there is at once', () => {
  it('never holds more than its caps, whatever is fed and however fast', () => {
    const effects = new Effects(7), game = cave()
    const events = everyEvent()
    for (let round = 0; round < 6; round++) {
      for (const event of events) {
        effects.feed(event, game, TIERS[0])
        expect(effects.chips.length).toBeLessThanOrEqual(MOST_CHIPS)
        expect(effects.puffs.length).toBeLessThanOrEqual(MOST_PUFFS)
        expect(effects.prints.length).toBeLessThanOrEqual(MOST_PRINTS)
        expect(effects.shudders.length).toBeLessThanOrEqual(MOST_SHUDDERS)
        expect(effects.wisps.length).toBeLessThanOrEqual(MOST_WISPS)
        expect(effects.flashes.length).toBeLessThanOrEqual(MOST_FLASHES)
        expect(effects.beads.length).toBeLessThanOrEqual(MOST_BEADS)
        expect(effects.hops.length).toBeLessThanOrEqual(3)
      }
      effects.step(FRAME)
    }
  })

  it('keeps one shudder a block and one flash a block: a second starts it again', () => {
    const effects = new Effects(7), game = cave()
    for (let i = 0; i < 5; i++) effects.feed({ type: 'knock', kind: 'gem', index: 2, at, colour: 'red' }, game, TIERS[0])
    expect(effects.shudders).toHaveLength(1)
    expect(effects.flashes).toHaveLength(1)
  })
})

describe('where it goes', () => {
  it('keeps every chip inside the dug space it was thrown into until it is gone', () => {
    for (const event of everyEvent()) {
      const game = cave()
      const effects = new Effects(11)
      // In the hill the event is at the block beside the mole; on the grass it is where it says.
      const here = 'index' in event && event.index === 90 ? { ...event, index: 2 } as Event : event
      effects.feed(here, game, TIERS[0])
      for (let t = 0; t < 1.5; t += FRAME) {
        effects.step(FRAME)
        for (const chip of effects.chips) {
          expect(chip.x, event.type).toBeGreaterThanOrEqual(chip.left)
          expect(chip.x, event.type).toBeLessThanOrEqual(chip.right)
          expect(chip.y, event.type).toBeLessThanOrEqual(chip.floor)
          expect(chip.right - chip.left, event.type).toBeLessThanOrEqual(2 * CELL)
        }
      }
    }
  })

  it('gives the chips of a block that breaks the room of that block and the one the mole stands in', () => {
    // The mole stands in block 0 and breaks block 1 beside him.
    const game = new Game(drawn('@ee'))
    const effects = new Effects(7)
    effects.feed({ type: 'break', kind: 'earth', index: 1, n: 1, aside: false, from: { x: HILL.x + 45, y: HILL.y + 45 } }, game, TIERS[0])
    for (const chip of effects.chips) {
      expect(chip.left).toBe(HILL.x + 5)
      expect(chip.right).toBe(HILL.x + 2 * CELL - 5)
      expect(chip.floor).toBe(HILL.y + CELL - 7)
    }
    // A chip off a block that still stands stays on the mole's side of it.
    const chipped = new Effects(7)
    chipped.feed({ type: 'chip', kind: 'sandstone', index: 1, n: 1, aside: false, from: { x: HILL.x + 45, y: HILL.y + 45 } }, game, TIERS[0])
    for (const chip of chipped.chips) expect(chip.right).toBe(HILL.x + CELL - 5)
    expect(indexOf(1, 0)).toBe(1)
  })
})

describe('how long it lasts', () => {
  it('is all gone within three seconds of every event, and starts with nothing', () => {
    expect(total(new Effects(7))).toBe(0)
    for (const event of everyEvent()) {
      const effects = fed(event)
      for (let t = 0; t < 3; t += FRAME) effects.step(FRAME)
      expect(total(effects), event.type).toBe(0)
    }
  })

  it('throws nothing by itself: a visit left alone has nothing in the air', () => {
    const effects = new Effects(7)
    for (let t = 0; t < 5; t += FRAME) effects.step(FRAME)
    expect(total(effects)).toBe(0)
  })
})
