import { describe, expect, it } from 'vitest'
import { BERRY_LEN, ON_BANK_Y, overWater } from './blocks'
import { AT } from './cast'
import { BERRY, firstWorld } from './first'
import { BLOCK_H, GROUND_Y, MAX_LEN, MIN_LEN, POND } from './ground'
import { MOST_BLOCKS, MOST_HOLES } from './limits'
import { makeRng } from './rng'
import { bare, carry, cut, drag, faults, letGo, moveTo, names, press, run, takeAway } from './testing'
import { Toy, type World } from './toy'
import { HOP_S } from './toyPieces'

describe('the cut', () => {
  it('is answered when the finger lands: the saw bites before any move', () => {
    const toy = new Toy(bare(), 1)
    press(toy, 500, 668)
    expect(names(toy)).toEqual(['bite'])
    expect(toy.takeMotions().map((m) => m.type)).toEqual(['chips'])
    expect(toy.cut).not.toBeNull()
    expect(toy.cast.peeper.what).toBe('look')
  })

  it('leaves the nick of the saw’s tooth where a finger only tapped: something is seen after the tap, and nothing is cut', () => {
    const toy = new Toy(bare(), 1)
    press(toy, 460, 668)
    toy.takeMotions()
    letGo(toy)
    expect(toy.takeMotions().map((m) => m.type)).toEqual(['scratch'])
    expect(toy.pieces).toHaveLength(1)
    expect(toy.holes).toEqual([])
    expect(toy.takeChanged()).toBe('no')
  })

  it('gives a block exactly as long as the line, from the place the line was cut', () => {
    const toy = new Toy(bare(), 1)
    cut(toy, 480, 668, 620, 668)
    expect(toy.holes).toHaveLength(1)
    expect(toy.holes[0]).toMatchObject({ x: 550, y: 668, len: 140, angle: 0 })
    const block = toy.pieces.find((p) => p.kind !== 'berry')!
    expect(block).toMatchObject({ kind: 'clear', len: 140, mode: 'rest' })
    expect(block.rest.place).toBe('lying')
    expect(overWater(block.len, block.x, block.y, toy.holes[0])).toBe(false)
  })

  it('cracks the block out in the frame the finger lifts: no wait, and the crack is heard in that call', () => {
    const toy = new Toy(bare(), 1)
    drag(toy, 480, 668, 620, 668)
    toy.takeSounds()
    letGo(toy)
    // No step has been played since the lift.
    expect(names(toy)).toEqual(['crack'])
    expect(toy.holes).toHaveLength(1)
    expect(toy.pieces.find((p) => p.kind === 'clear')).toMatchObject({ mode: 'hop', age: 0 })
    expect(toy.cut).toBeNull()
    expect(toy.takeChanged()).toBe('now')
  })

  it('gives cloudy ice from the edge of the pond and clear ice from its middle', () => {
    const toy = new Toy(bare(), 1)
    cut(toy, POND.cx - 60, POND.cy, POND.cx + 60, POND.cy)
    cut(toy, POND.cx - 330, POND.cy - 10, POND.cx - 250, POND.cy - 30)
    expect(toy.pieces.filter((p) => p.kind !== 'berry').map((p) => p.kind)).toEqual(['clear', 'cloudy'])
  })

  it('keeps its direction once the finger has set it, so a wandering hand still cuts a straight block', () => {
    const toy = new Toy(bare(), 1)
    press(toy, 480, 668)
    moveTo(toy, 520, 668)
    moveTo(toy, 600, 700)
    expect(toy.cut).toMatchObject({ angle: 0, aimed: true })
    expect(toy.cut!.len).toBeCloseTo(120, 0)
  })

  it('scrapes once for each stretch of line, and clonks once where it is stopped', () => {
    const toy = new Toy(bare(), 1)
    press(toy, 400, 668)
    toy.takeSounds()
    moveTo(toy, 500, 668)
    expect(names(toy).filter((n) => n === 'scrape')).toHaveLength(4)
    moveTo(toy, 900, 668)
    expect(names(toy).filter((n) => n === 'clonk')).toHaveLength(1)
    expect(toy.cut!.len).toBe(MAX_LEN)
    moveTo(toy, 950, 668)
    expect(names(toy)).toEqual([])
  })

  it('gives chips, a squeak and no block for a line that is too short', () => {
    const toy = new Toy(bare(), 1)
    drag(toy, 500, 668, 500 + MIN_LEN - 20, 668)
    toy.takeSounds()
    letGo(toy)
    expect(names(toy)).toEqual(['squeak'])
    run(toy, 0.35)
    expect(toy.holes).toHaveLength(0)
    expect(toy.pieces).toHaveLength(1)
  })

  it('survives a skip of the finger: the line carries on when the finger comes straight back, and gives one block of the whole length', () => {
    const toy = new Toy(bare(), 1)
    drag(toy, 460, 668, 540, 668)
    letGo(toy)
    expect(toy.holes).toHaveLength(1)
    // The finger is back before the tracker has called the drag over: the block that cracked out goes back in.
    press(toy, 548, 672)
    moveTo(toy, 640, 668)
    expect(toy.holes).toHaveLength(0)
    expect(toy.pieces).toHaveLength(1)
    expect(toy.cut!.len).toBe(180)
    letGo(toy)
    expect(toy.holes).toHaveLength(1)
    expect(toy.holes[0].len).toBe(180)
    expect(toy.pieces).toHaveLength(2)
    run(toy, 0.35)
    expect(toy.lastCut).toBeNull()
  })

  it('gives no block when the touch is taken away', () => {
    const toy = new Toy(bare(), 1)
    drag(toy, 460, 668, 640, 668)
    takeAway(toy)
    expect(toy.holes).toHaveLength(0)
    expect(toy.cut).toBeNull()
    expect(toy.pieces).toHaveLength(1)
  })

  it('answers as a very short line does once the clearing holds all it can: chips, a squeak, and nothing counted or shown', () => {
    const blocks = Array.from({ length: MOST_BLOCKS - 1 }, (_, i) => ({ kind: 'ball' as const, len: 46, x: 60 + (i % 20) * 52, y: 530 + Math.floor(i / 20) * 4, place: 'lying' as const, dent: [], cap: false }))
    const toy = new Toy({ ...bare(), blocks: [{ ...BERRY }, ...blocks] }, 1)
    expect(toy.pieces).toHaveLength(MOST_BLOCKS)
    drag(toy, 480, 668, 620, 668)
    toy.takeSounds()
    letGo(toy)
    expect(names(toy)).toEqual(['squeak'])
    expect(toy.pieces).toHaveLength(MOST_BLOCKS)
    expect(toy.holes).toHaveLength(0)
    const holes = Array.from({ length: MOST_HOLES }, (_, i) => ({ x: 300 + (i % 10) * 60, y: 600 + Math.floor(i / 10) * 40, angle: 0, len: 64 }))
    const holed = new Toy({ ...bare(), holes }, 1)
    drag(holed, 420, 770, 560, 770)
    letGo(holed)
    expect(holed.holes).toHaveLength(MOST_HOLES)
  })
})

describe('a block', () => {
  it('sounds its own note the moment a finger lands on it', () => {
    const toy = new Toy(firstWorld(null), 1)
    press(toy, 560, 606)
    expect(names(toy)).toEqual(['ring'])
    letGo(toy)
    press(toy, 700, ON_BANK_Y)
    expect(names(toy)).toEqual(['tock'])
    letGo(toy)
    press(toy, BERRY.x, BERRY.y)
    expect(names(toy)).toEqual(['boop'])
  })

  it('rests where it is set: carried over the bank it falls to the snow, and the next one stands on it', () => {
    const toy = new Toy(firstWorld(null), 1)
    carry(toy, 560, 606, 400, 300)
    const first = toy.pieces.find((p) => p.len === 150)!
    expect(first).toMatchObject({ mode: 'rest', x: 400, y: ON_BANK_Y })
    expect(first.rest.place).toBe('built')
    carry(toy, BERRY.x, BERRY.y, 410, 250)
    expect(toy.pieces.find((p) => p.kind === 'berry')).toMatchObject({ mode: 'rest', x: 410, y: ON_BANK_Y - BLOCK_H })
  })

  it('brings down what stood on it when it is carried off', () => {
    const toy = new Toy(firstWorld(null), 1)
    carry(toy, 700, ON_BANK_Y, 400, 300)
    expect(toy.pieces.find((p) => p.len === 96)).toMatchObject({ mode: 'rest', y: ON_BANK_Y })
  })

  it('goes back where it came from when the carry is taken away', () => {
    const toy = new Toy(firstWorld(null), 1)
    const before = toy.world()
    drag(toy, 560, 606, 500, 400, 3)
    takeAway(toy)
    expect(toy.world()).toEqual(before)
    expect(toy.pieces.find((p) => p.len === 150)).toMatchObject({ mode: 'rest', x: 560, y: 606 })
  })

  it('lands on King Winter when it is let go over him, and is worn as a hat until he nods it off beside him', () => {
    const toy = new Toy(firstWorld(null), 1)
    drag(toy, 560, 606, AT.king.x, AT.king.y - 300, 8)
    letGo(toy)
    const hat = toy.pieces.find((p) => p.len === 150)!
    expect(hat.mode).toBe('hat')
    expect(names(toy)).toContain('hatOn')
    // From the moment it is set the save has it lying beside him.
    expect(hat.rest.place).toBe('lying')
    expect(faults(toy.world())).toEqual([])
    run(toy, 0.5)
    expect(hat.y).toBeLessThan(AT.king.y - 300)
    // It is touched where it is drawn: on his head.
    press(toy, hat.x, hat.y)
    expect(toy.hand?.piece).toBe(hat)
    letGo(toy)
    run(toy, 12)
    expect(hat).toMatchObject({ mode: 'rest', x: hat.rest.x, y: hat.rest.y })
  })
})

describe('everything else a finger can land on', () => {
  it.each([
    ['King Winter', 1034, 330, 'harrumph', 'king'],
    ['the lamp child', 90, 400, 'chirrup', 'lamp'],
    ['the peeper', 80, 740, 'oof', 'peeper'],
    ['the sun', 176, 108, 'boing', 'sun'],
    ['the bird in its bush', 1100, 660, 'tweet', 'bird'],
  ] as const)('%s answers with its own move and sound', (_, x, y, sound, who) => {
    const toy = new Toy(bare(), 1)
    press(toy, x, y)
    expect(names(toy)).toEqual([sound])
    expect(toy.cast[who].what).not.toBeNull()
  })

  it.each([
    ['the snow', 520, 380, 'puff'],
    ['the sky', 590, 40, 'flake'],
    ['the drift', 962, 556, 'puff'],
  ] as const)('%s answers with a sound and something to see', (_, x, y, sound) => {
    const toy = new Toy(bare(), 1)
    press(toy, x, y)
    expect(names(toy)).toEqual([sound])
    expect(toy.takeMotions()).toHaveLength(1)
  })

  it('open water answers with a ripple', () => {
    const toy = new Toy(firstWorld(null), 1)
    press(toy, 560, 672)
    expect(names(toy)).toEqual(['plip'])
  })
})

describe('by age', () => {
  it('starts the youngest and a child of no known age with a block cut and a step built, and an older child with a whole pond', () => {
    for (const age of [null, 2, 5, 6]) {
      const world = firstWorld(age)
      expect(world.holes).toHaveLength(1)
      expect(world.blocks.filter((b) => b.place === 'built')).toHaveLength(2)
    }
    for (const age of [7, 9, 12]) expect(firstWorld(age)).toEqual(bare())
  })

  it('never gates: both starts hold the berry block, and the same cut works in both', () => {
    for (const age of [null, 9]) {
      const toy = new Toy(firstWorld(age), 1)
      expect(toy.pieces.filter((p) => p.kind === 'berry')).toHaveLength(1)
      cut(toy, 300, 700, 420, 690)
      expect(toy.holes.length).toBe(firstWorld(age).holes.length + 1)
    }
  })
})

describe('found as left', () => {
  it('holds a block in the air where it will land, one in the hand where it came from, and one going under as gone', () => {
    const toy = new Toy(bare(), 1)
    drag(toy, 480, 668, 620, 668)
    letGo(toy)
    const hopping = toy.world()
    run(toy, HOP_S + 0.1)
    expect(toy.world()).toEqual(hopping)
    const block = toy.pieces.find((p) => p.kind === 'clear')!
    press(toy, block.x, block.y)
    moveTo(toy, 400, 300)
    expect(toy.world()).toEqual(hopping)
    moveTo(toy, 550, 668)
    letGo(toy)
    expect(toy.world()).toEqual(bare())
    expect(toy.takeChanged()).toBe('now')
  })
})

describe('nothing passes through anything', () => {
  // A seeded hand cuts, carries and drops at random for a long time. At every rest the clearing has no fault (testing.ts).
  it('holds through two hundred random moves of a cutting and carrying hand', { timeout: 120_000 }, () => {
    const chance = makeRng(5)
    const toy = new Toy(firstWorld(null), 5)
    const between = (a: number, b: number): number => a + chance.next() * (b - a)
    for (let move = 0; move < 200; move++) {
      const pick = chance.next()
      if (pick < 0.4) {
        const x = between(POND.cx - 340, POND.cx + 340), y = between(POND.cy - 90, POND.cy + 90), turn = between(0, Math.PI * 2), far = between(40, 320)
        cut(toy, x, y, x + Math.cos(turn) * far, y + Math.sin(turn) * far)
      } else {
        const resting = toy.pieces.filter((p) => p.mode === 'rest')
        const piece = resting[Math.floor(chance.next() * resting.length)]
        if (pick < 0.75) carry(toy, piece.x, piece.y, between(100, 1000), between(160, GROUND_Y))
        else carry(toy, piece.x, piece.y, between(60, 1120), between(GROUND_Y + 30, 800))
      }
      run(toy, 1)
      const world: World = toy.world()
      expect(toy.pieces.filter((p) => p.mode !== 'rest' && p.mode !== 'hat'), `move ${move}`).toEqual([])
      expect(faults(world), `move ${move}`).toEqual([])
    }
    expect(toy.world().blocks.length).toBeGreaterThan(3)
    expect(toy.world().blocks.find((b) => b.kind === 'berry')?.len).toBe(BERRY_LEN)
  })
})
