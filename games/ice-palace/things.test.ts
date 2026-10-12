import { describe, expect, it } from 'vitest'
import { BALL, BERRY_LEN, ICICLE, KINDS, ON_BANK_Y, SMALL_BALL, STUB, restOf, type Kind } from './blocks'
import { REACTIONS, peeperPose, reactionOf } from './cast'
import { BERRY } from './first'
import { BLOCK_H, BOUGH, MIN_LEN, SCOOPS } from './ground'
import { bare, carry, drag, faults, frame, letGo, moveTo, names, press, run, scoop } from './testing'
import { STEP, Toy, type Piece, type World } from './toy'
import { HEAT_CLEAR_S, MELT_S, WARM_AFTER } from './toyPieces'

// The object-by-action grid of the design sheet, one test for each cell: six
// things, each set down, knocked, dropped in open water and held under a warm
// thumb. What the lamps' light does at each is in night.test.ts.

/** Where each thing lies in the test clearing: on the front snow, in a row, with one hole in the pond. */
const AT: Record<Kind, number> = { clear: 420, cloudy: 580, snow: 740, ball: 300, icicle: 240, berry: 860 }
const LEN: Record<Kind, number> = { clear: 120, cloudy: 120, snow: 120, ball: BALL, icicle: ICICLE, berry: BERRY_LEN }
const HOLE = { x: 590, y: 700, angle: 0, len: 140 }
const kit = (): World => ({ ...bare(), blocks: KINDS.map((kind) => restOf(kind, LEN[kind], AT[kind], 566, 'lying')), holes: [{ ...HOLE }] })
const the = (toy: Toy, kind: Kind): Piece => toy.pieces.find((p) => p.kind === kind)!

describe('how each thing is got', () => {
  it('a long scoop through the drift packs a snow block of the scoop’s length, a short one a snowball', () => {
    const toy = new Toy(bare(), 1)
    scoop(toy, 200)
    const block = the(toy, 'snow')
    expect(block.len).toBeGreaterThanOrEqual(MIN_LEN)
    expect(toy.drift).toBe(1)
    press(toy, 962, 556)
    moveTo(toy, 962, 590)
    letGo(toy)
    run(toy, 1.5)
    expect(the(toy, 'ball').len).toBe(BALL)
    expect(toy.world().drift).toBe(2)
    expect(faults(toy.world())).toEqual([])
  })

  it('the drift gives eight scoops a day and then only a puff of snow', () => {
    const toy = new Toy({ ...bare(), drift: SCOOPS }, 1)
    press(toy, 962, 556)
    expect(names(toy)).toEqual(['puff'])
    expect(toy.scoop).toBeNull()
  })

  it('an icicle comes away from the bough where it is pressed, and each of the five only once', () => {
    const toy = new Toy(bare(), 1)
    const root = BOUGH[2]
    press(toy, root.x, root.y + 20)
    expect(names(toy)).toEqual(['snap'])
    expect(toy.hand?.piece.kind).toBe('icicle')
    expect(toy.world().icicles).toEqual([2])
    // Let go where it was pressed, it falls from the bough to what is under it.
    letGo(toy)
    run(toy, 2)
    expect(the(toy, 'icicle')).toMatchObject({ mode: 'rest' })
    expect(faults(toy.world())).toEqual([])
    press(toy, root.x, root.y + 20)
    expect(toy.hand).toBeNull()
  })
})

describe('set down on the snow or on the wall', () => {
  it.each([
    ['clear', 'crunch', 'puff'],
    ['cloudy', 'thunk', 'dust'],
    ['snow', 'flump', 'flakes'],
    ['icicle', 'tick', 'puff'],
    ['berry', 'roundKnock', 'puff'],
  ] as const)('a %s thing lands with its own sound and something to see', (kind, sound, motion) => {
    const toy = new Toy(kit(), 1)
    drag(toy, AT[kind], 566, 500, 300, 8)
    letGo(toy)
    toy.takeSounds()
    toy.takeMotions()
    run(toy, 1.5)
    expect(names(toy)).toContain(sound)
    expect(toy.takeMotions().map((m) => m.type)).toContain(motion)
    expect(the(toy, kind)).toMatchObject({ mode: 'rest', y: ON_BANK_Y })
    expect(the(toy, kind).rest.place).toBe('built')
  })

  it('a snowball rolls off what it is set on to the lowest place it can reach, with a rumble, and stops there', () => {
    const toy = new Toy(kit(), 1)
    carry(toy, AT.clear, 566, 500, 300)
    drag(toy, AT.ball, 566, 520, 200, 8)
    letGo(toy)
    toy.takeSounds()
    run(toy, 3)
    expect(names(toy)).toEqual(expect.arrayContaining(['rumble', 'pat']))
    const ball = the(toy, 'ball')
    expect(ball).toMatchObject({ mode: 'rest', y: ON_BANK_Y })
    expect(Math.abs(ball.x - 500)).toBeGreaterThan(60)
    expect(ball.spin).not.toBe(0)
    expect(faults(toy.world())).toEqual([])
  })

  it('an icicle stands point up where it is set, and hangs point down when it is let go under a block', () => {
    const lintel: World = { ...bare(), blocks: [{ ...BERRY }, restOf('clear', 64, 400, ON_BANK_Y, 'built'), restOf('clear', 64, 560, ON_BANK_Y, 'built'), restOf('clear', 240, 480, ON_BANK_Y - BLOCK_H, 'built'), restOf('icicle', ICICLE, 240, 566, 'lying')] }
    const toy = new Toy(lintel, 1)
    carry(toy, 240, 566, 480, ON_BANK_Y)
    expect(the(toy, 'icicle').rest).toMatchObject({ place: 'hung', y: ON_BANK_Y })
    carry(toy, the(toy, 'icicle').x, ON_BANK_Y, 700, 300)
    expect(the(toy, 'icicle').rest).toMatchObject({ place: 'built', y: ON_BANK_Y })
  })

  it('the berry inside its block wobbles after it lands', () => {
    const toy = new Toy(kit(), 1)
    drag(toy, AT.berry, 566, 500, 300, 8)
    letGo(toy)
    let most = 0
    for (let i = 0; i < 90; i++) {
      frame(toy)
      most = Math.max(most, Math.abs(the(toy, 'berry').wobble))
    }
    expect(most).toBeGreaterThan(0.5)
  })
})

describe('knocked with a fingertip', () => {
  it.each([
    ['clear', 'ring'],
    ['cloudy', 'tock'],
    ['snow', 'thup'],
    ['ball', 'scrunch'],
    ['icicle', 'ting'],
    ['berry', 'boop'],
  ] as const)('a %s thing sounds in the call the finger lands in', (kind, sound) => {
    const toy = new Toy(kit(), 1)
    press(toy, AT[kind], 566)
    expect(names(toy)).toEqual([sound])
    letGo(toy)
  })

  it('a fingertip leaves a dent in a snow block that stays, the newest four, and a save holds them', () => {
    const toy = new Toy(kit(), 1)
    for (const dx of [-40, -20, 0, 20, 40]) {
      press(toy, AT.snow + dx, 566)
      letGo(toy)
    }
    expect(the(toy, 'snow').dent).toEqual([-20, 0, 20, 40])
    expect(toy.world().blocks.find((b) => b.kind === 'snow')?.dent).toEqual([-20, 0, 20, 40])
  })

  it('frost dust jumps off a cloudy block, and every knocked thing shivers', () => {
    const toy = new Toy(kit(), 1)
    press(toy, AT.cloudy, 566)
    expect(toy.takeMotions().map((m) => m.type)).toEqual(['dust'])
    letGo(toy)
    for (const kind of ['clear', 'ball', 'icicle', 'berry'] as const) {
      press(toy, AT[kind], 566)
      letGo(toy)
      expect(the(toy, kind).wobbleV, kind).toBeGreaterThan(0)
    }
  })
})

describe('dropped in open water', () => {
  it.each([
    ['clear', 'plop', 'crackle'],
    ['cloudy', 'glug', 'creak'],
    ['snow', 'fizz', 'slush'],
  ] as const)('a %s block goes under, and the ice closes the hole with its own sound', (kind, first, then) => {
    const toy = new Toy(kit(), 1)
    drag(toy, AT[kind], 566, HOLE.x, HOLE.y, 8)
    toy.takeSounds()
    letGo(toy)
    expect(names(toy)).toEqual([first])
    // Gone from every save at once, with its hole.
    expect(toy.world().holes).toEqual([])
    expect(toy.world().blocks.some((b) => b.kind === kind)).toBe(false)
    run(toy, 1.5)
    expect(names(toy)).toContain(then)
    expect(toy.holes).toHaveLength(0)
    expect(toy.pieces.some((p) => p.kind === kind)).toBe(false)
  })

  it('a snowball splashes and floats', () => {
    const toy = new Toy(kit(), 1)
    carry(toy, AT.ball, 566, HOLE.x, HOLE.y)
    expect(the(toy, 'ball').rest).toEqual({ x: HOLE.x, y: HOLE.y, place: 'afloat' })
    expect(toy.holes).toHaveLength(1)
  })

  it('an icicle goes in with a plip and freezes in, standing out of a whole pond', () => {
    const toy = new Toy(kit(), 1)
    drag(toy, AT.icicle, 566, HOLE.x, HOLE.y, 8)
    letGo(toy)
    toy.takeSounds()
    run(toy, 1.5)
    expect(names(toy)).toContain('plip')
    expect(the(toy, 'icicle').rest.place).toBe('frozen')
    expect(toy.world().holes).toEqual([])
  })

  it('the berry block goes in with a bloop and will not sink: the fish comes up to stare, and the peeper, soaked, laughs the splash off and then stretches out to watch the berry bob, with no cheer', () => {
    const toy = new Toy(kit(), 1)
    drag(toy, AT.berry, 566, HOLE.x, HOLE.y, 8)
    letGo(toy)
    toy.takeSounds()
    const heard: string[] = [], did: string[] = []
    let out = 0, quiet = true
    for (let step = 0; step < Math.round(5.5 / STEP); step++) {
      frame(toy)
      const sounds = names(toy), what = toy.cast.peeper.what
      heard.push(...sounds)
      if (what && did[did.length - 1] !== what) did.push(what)
      if (what !== 'watch') continue
      // Its head goes out on its neck, and it makes no sound over it.
      out = Math.max(out, peeperPose(toy.time, toy.cast.peeper).watch)
      quiet &&= sounds.length === 0
    }
    expect(heard).toEqual(expect.arrayContaining(['bloop', 'giggle']))
    expect(did).toEqual(['soaked', 'watch'])
    expect(out).toBeGreaterThan(0.9)
    expect(quiet).toBe(true)
    expect(reactionOf('peeper', 'watch').sound).toBeNull()
    expect(Object.keys(REACTIONS.peeper)).not.toContain('cheer')
    // Taken out of the water while the peeper watches, the berry is nothing to watch any more.
    carry(toy, HOLE.x, HOLE.y, AT.berry, 566)
    drag(toy, AT.berry, 566, HOLE.x, HOLE.y, 8)
    letGo(toy)
    for (let step = 0; step < 400 && toy.cast.peeper.what !== 'watch'; step++) frame(toy)
    expect(toy.cast.peeper.what).toBe('watch')
    press(toy, HOLE.x, HOLE.y)
    moveTo(toy, HOLE.x, HOLE.y - 60)
    expect(toy.cast.peeper.what).toBeNull()
    moveTo(toy, HOLE.x, HOLE.y)
    letGo(toy)
    run(toy, 1.5)
    expect(the(toy, 'berry').rest.place).toBe('afloat')
    expect(toy.fishStare).toBe(1)
    carry(toy, HOLE.x, HOLE.y, 300, 300)
    expect(the(toy, 'berry').rest.place).toBe('built')
    run(toy, 1.5)
    expect(toy.fishStare).toBe(0)
  })
})

describe('a warm thumb held on it', () => {
  const hold = (toy: Toy, kind: Kind, seconds: number): string[] => {
    press(toy, AT[kind], 566)
    toy.takeSounds()
    run(toy, seconds)
    return names(toy)
  }

  it('a tap that lasts up to 0.45 seconds is a tap: nothing warms', () => {
    expect(WARM_AFTER).toBeGreaterThanOrEqual(0.45)
    const toy = new Toy(kit(), 1)
    const shape = (): unknown => toy.world().blocks.map(({ kind, len, x, y, place }) => ({ kind, len, x, y, place }))
    const before = shape()
    for (const kind of KINDS) {
      expect(hold(toy, kind, 0.45), kind).toEqual([])
      letGo(toy)
      expect(the(toy, kind).heat, kind).toBe(0)
    }
    run(toy, 1)
    // All that a tap leaves is the dent in the snow block.
    expect(shape()).toEqual(before)
  })

  it('a clear block sweats, drips with ticks and sinks into a puddle that is gone with a sigh, and leaves the save', () => {
    const toy = new Toy(kit(), 1)
    const heard = hold(toy, 'clear', WARM_AFTER + HEAT_CLEAR_S + MELT_S + 0.2)
    expect(heard.filter((n) => n === 'drip').length).toBeGreaterThanOrEqual(3)
    expect(heard).toContain('sigh')
    expect(toy.pieces.some((p) => p.kind === 'clear')).toBe(false)
    expect(toy.hand).toBeNull()
  })

  it('a clear block under a still finger goes over a time a child can stop: it sweats and sinks in sight, and lifting the finger saves it', () => {
    const toy = new Toy(kit(), 1)
    const block = the(toy, 'clear')
    // Three seconds after the finger landed the block is still there and still saved, and it has been dripping all the while.
    const early = hold(toy, 'clear', 3)
    expect(toy.pieces).toContain(block)
    expect(toy.world().blocks.some((b) => b.kind === 'clear')).toBe(true)
    expect(early.filter((n) => n === 'drip').length).toBeGreaterThanOrEqual(5)
    expect(toy.takeMotions().filter((m) => m.type === 'drips').length).toBeGreaterThanOrEqual(5)
    // It is seen to be going: more than half of its warmth is up, which the view draws as a block sunk and a puddle spread.
    expect(block.heat).toBeGreaterThan(0.6)
    // The finger lifts: it is saved, cools again, and is whole.
    letGo(toy)
    run(toy, 2)
    expect(block.heat).toBe(0)
    expect(block.mode).toBe('rest')
    expect(toy.world().blocks.some((b) => b.kind === 'clear' && b.len === LEN.clear)).toBe(true)
  })

  it('the cloud melts out of a cloudy block with a hiss and then a ting: it is a clear block now', () => {
    const toy = new Toy(kit(), 1)
    const heard = hold(toy, 'cloudy', 1.8)
    expect(heard[0]).toBe('hiss')
    expect(heard).toContain('tingClear')
    expect(toy.pieces.filter((p) => p.kind === 'clear')).toHaveLength(2)
    expect(toy.world().blocks.some((b) => b.kind === 'cloudy')).toBe(false)
  })

  it('a snow block slumps with a squelch into a snowball, a snowball shrinks with a fizz to half the size, an icicle shortens with plinks to a stub', () => {
    const toy = new Toy(kit(), 1)
    expect(hold(toy, 'icicle', 1.8)).toContain('plink')
    expect(the(toy, 'icicle').len).toBe(STUB)
    letGo(toy)
    expect(hold(toy, 'ball', 1.8)).toContain('fizzle')
    expect(the(toy, 'ball').len).toBe(SMALL_BALL)
    letGo(toy)
    expect(hold(toy, 'snow', 1.8)).toContain('squelch')
    expect(toy.pieces.some((p) => p.kind === 'snow')).toBe(false)
    expect(toy.pieces.filter((p) => p.kind === 'ball')).toHaveLength(2)
    letGo(toy)
    run(toy, 1)
    expect(faults(toy.world())).toEqual([])
  })

  it('the berry block blushes and squeaks and does not melt, however long the thumb stays', () => {
    const toy = new Toy(kit(), 1)
    expect(hold(toy, 'berry', 6)).toContain('blush')
    expect(the(toy, 'berry')).toMatchObject({ kind: 'berry', len: BERRY_LEN })
  })
})
