import { describe, expect, it } from 'vitest'
import type { Ray } from './aim'
import { COLS, KINDS, PER_KIND, ROWS, hangingSlope, heights, slopeEnds, slopeFaces, type Kind, type Placed } from './blocks'
import { LADDER_OFF } from './castle'
import { firstRug } from './castleState'
import { BASKET, BELL, FOLK, HALF_LEVEL, OFFER, SIZE, placeX, placeZ } from './layout'
import { below, makeRng } from './rng'
import { Play, type PlayEvent } from './play'

const down = (x: number, z: number): Ray => ({ origin: [x, 12, z], dir: [0, -1, 0] })
const overOffer = (kind: Kind): Ray => down(OFFER[kind][0], OFFER[kind][2])
const overPlace = (col: number, row: number): Ray => down(placeX(col), placeZ(row))

/** Plays some seconds in frames of a sixtieth, and gives back everything that happened. */
function run(play: Play, seconds: number): PlayEvent[] {
  const events: PlayEvent[] = []
  for (let i = 0; i < Math.round(seconds * 60); i++) { play.advance(1 / 60); events.push(...play.take()) }
  return events
}

/** Carries a block of the basket to a place and lets it go there. */
function carryOut(play: Play, kind: Kind, col: number, row: number): PlayEvent[] {
  play.press(overOffer(kind))
  play.carry(overPlace(col, row))
  const events = [...play.take(), ...run(play, 0.2)]
  play.carry(overPlace(col, row))
  play.drop()
  return [...events, ...play.take(), ...run(play, 1.5)]
}

const types = (events: readonly PlayEvent[]): string[] => events.map((event) => event.type)
const bare = (): Play => new Play([], 1)

describe('opening the toy', () => {
  it('finds the rug as it was left, at rest and silent', () => {
    const rug: Placed[] = [{ kind: 'cube', col: 3, row: 1 }, { kind: 'round', col: 3, row: 1 }, { kind: 'long', col: 0, row: 2 }]
    const play = new Play(rug, 1)
    expect(play.rug()).toEqual(rug)
    expect(play.pieces).toHaveLength(KINDS.length * PER_KIND)
    expect(play.busy).toBe(false)
    expect(play.take()).toEqual([])
    // Every block stands where it rests: nothing eases in.
    for (const piece of play.pieces) expect([piece.x, piece.y, piece.z]).toEqual(piece.home)
    const round = play.pieces.find((piece) => piece.kind === 'round' && piece.state === 'rug')!
    expect(round.level).toBe(2)
    expect(round.scale.value).toBe(1)
    expect(run(play, 2).filter((event) => event.type !== 'taste')).toEqual([])
    expect(play.rug()).toEqual(rug)
  })

  it('offers one block of every kind in the basket', () => {
    const play = new Play(firstRug(3), 1)
    expect(play.touchable()).toHaveLength(KINDS.length)
    expect(play.pieces.filter((piece) => piece.state === 'offer')).toHaveLength(KINDS.length)
    expect(play.pieces.filter((piece) => piece.state === 'under')).toHaveLength(KINDS.length * PER_KIND - KINDS.length - 2)
  })

  it('plays no time on a first frame', () => {
    const play = new Play(firstRug(3), 1)
    play.advance(0)
    expect(play.time).toBe(0)
    expect(play.take()).toEqual([])
  })

  it('plays whole fixed steps, and no more than a slow frame is worth', () => {
    const play = bare()
    play.advance(1 / 60)
    expect(play.time).toBeCloseTo(1 / 60)
    play.advance(5)
    expect(play.time).toBeLessThan(1 / 60 + 0.21)
  })
})

describe('the finger lands', () => {
  it('is answered at once by a block: it comes up, and its own sound is queued', () => {
    for (const kind of KINDS) {
      const play = bare()
      play.press(overOffer(kind))
      expect(play.take()).toEqual([{ type: 'lift', kind }])
      const piece = play.pieces[play.hand!.id]
      expect(piece.kind).toBe(kind)
      expect(piece.lift.target).toBeGreaterThan(0)
      run(play, 0.2)
      expect(piece.lift.value).toBeGreaterThan(0.1)
    }
  })

  it('is answered by everything else it can land on', () => {
    const play = bare()
    play.press(overPlace(0, 0))
    expect(play.take()).toMatchObject([{ type: 'pat', surface: 'rug' }])
    play.press(down(-7.5, 3.4))
    expect(play.take()).toMatchObject([{ type: 'pat', surface: 'floor' }])
    play.press({ origin: [0, 3, 6], dir: [0, 0, -1] })
    expect(play.take()).toMatchObject([{ type: 'pat', surface: 'wall' }])
    play.press(down(BASKET.x + BASKET.wide / 2 - 0.08, BASKET.z - BASKET.deep / 2 + 0.08))
    expect(play.take()).toEqual([{ type: 'creak' }])
    for (const who of ['king', 'cook', 'dragon'] as const) {
      play.press(down(FOLK[who].x, FOLK[who].z))
      expect(play.take()).toEqual([{ type: 'poke', who }])
    }
    expect(play.hand).toBeNull()
    expect(play.rug()).toEqual([])
  })

  it('lets go without a move when the press is taken away', () => {
    const play = bare()
    play.press(overOffer('cube'))
    play.take()
    play.pressEnd()
    expect(play.hand).toBeNull()
    expect(run(play, 1)).toEqual([])
    expect(play.rug()).toEqual([])
    expect(play.touchable()).toHaveLength(KINDS.length)
  })
})

describe('carrying a block out', () => {
  it('sets it down where the finger lets go, with its knock', () => {
    const play = bare()
    const events = carryOut(play, 'cube', 0, 0)
    expect(play.rug()).toEqual([{ kind: 'cube', col: 0, row: 0 }])
    expect(types(events)).toContain('land')
    expect(events.find((event) => event.type === 'land')).toMatchObject({ kind: 'cube', level: 0, wood: false, soft: false })
    expect(play.busy).toBe(false)
    expect(play.hand).toBeNull()
  })

  it('brings the next of its kind up in the basket, until there are none', () => {
    const play = bare()
    expect(types(carryOut(play, 'cube', 0, 0))).toContain('rise')
    expect(types(carryOut(play, 'cube', 1, 0))).toContain('rise')
    expect(types(carryOut(play, 'cube', 2, 0))).not.toContain('rise')
    expect(play.touchable()).toHaveLength(KINDS.length - 1)
    expect(play.rug()).toHaveLength(3)
  })

  it('lands on what is under it, a step of the scale higher', () => {
    const play = bare()
    carryOut(play, 'cube', 2, 1)
    const events = carryOut(play, 'round', 2, 1)
    expect(events.find((event) => event.type === 'land')).toMatchObject({ kind: 'round', level: 2, wood: true })
    expect(play.pieces.find((piece) => piece.kind === 'round' && piece.state === 'rug')!.y).toBeCloseTo(1)
  })

  it('never saves a block in the air: in the hand it counts as where it came from', () => {
    const play = new Play(firstRug(3), 1)
    play.press(overOffer('arch'))
    play.carry(overPlace(0, 2))
    run(play, 0.3)
    expect(play.rug()).toEqual(firstRug(3))
    // The round one on the cube, carried away: still where it was until it is let go.
    const other = new Play(firstRug(3), 1)
    other.press(overPlace(3, 1))
    expect(other.pieces[other.hand!.id].kind).toBe('round')
    other.carry(overPlace(6, 0))
    run(other, 0.3)
    expect(other.rug()).toEqual(firstRug(3))
    other.carry(overPlace(6, 0))
    other.drop()
    expect(other.rug()).toEqual([{ kind: 'cube', col: 3, row: 1 }, { kind: 'round', col: 6, row: 0 }])
  })

  it('hangs a carried block over its landing place, above the pile', () => {
    const play = new Play(firstRug(3), 1)
    play.press(overOffer('cube'))
    play.carry(overPlace(3, 1))
    run(play, 0.6)
    const piece = play.pieces[play.hand!.id]
    expect(piece.y).toBeGreaterThan(2.5)
    expect(play.landingSpot()).toMatchObject({ kind: 'cube', at: [placeX(3), 2.5, placeZ(1)] })
  })

  it('puts it back in the basket when it is let go over the basket', () => {
    const play = bare()
    play.press(overOffer('cube'))
    play.carry(overPlace(3, 1))
    run(play, 0.2)
    play.carry(down(BASKET.x, BASKET.z))
    expect(play.landingSpot()).toBeNull()
    play.drop()
    const events = [...play.take(), ...run(play, 1)]
    expect(types(events)).toContain('basket')
    expect(play.rug()).toEqual([])
    expect(play.touchable()).toHaveLength(KINDS.length)
    expect(play.pieces.filter((piece) => piece.kind === 'cube' && piece.state === 'offer')).toHaveLength(1)
  })

  it('slides a block off a slope and glances one off a tip, each with its sound', () => {
    const play = bare()
    carryOut(play, 'slope', 4, 1)
    const slid = carryOut(play, 'cube', 4, 1)
    expect(slid).toContainEqual({ type: 'shed', why: 'slope' })
    expect(play.rug()[1]).toEqual({ kind: 'cube', col: 6, row: 1 })
    carryOut(play, 'thin', 0, 0)
    const glanced = carryOut(play, 'round', 0, 0)
    expect(glanced).toContainEqual({ type: 'shed', why: 'tip' })
    expect(play.rug()[3]).toMatchObject({ kind: 'round', row: 0, col: 1 })
  })

  it('turns a slope with a sound as it crosses the middle of the rug', () => {
    const play = bare()
    play.press(overOffer('slope'))
    play.carry(overPlace(5, 1))
    play.take()
    play.carry(overPlace(1, 1))
    expect(play.take()).toEqual([{ type: 'flip' }])
    play.carry(overPlace(0, 1))
    expect(play.take()).toEqual([])
  })
})

describe('a tap', () => {
  it('hops a block of the basket out onto the rug by itself', () => {
    const play = bare()
    play.press(overOffer('arch'))
    play.tap()
    const events = [...play.take(), ...run(play, 1.5)]
    expect(types(events)).toEqual(expect.arrayContaining(['lift', 'rise', 'land']))
    expect(play.rug()).toEqual([{ kind: 'arch', col: 2, row: 1 }])
    // The dragon likes any arch; the king a new highest top.
    expect(events).toContainEqual({ type: 'taste', who: 'dragon' })
    expect(events).toContainEqual({ type: 'taste', who: 'king' })
  })

  it('sets a block of the rug back where it stood, with its knock, and harms nothing', () => {
    const play = new Play(firstRug(3), 1)
    play.press(overPlace(3, 1))
    play.tap()
    const events = [...play.take(), ...run(play, 1)]
    expect(types(events)).toEqual(expect.arrayContaining(['lift', 'land']))
    expect(play.rug()).toEqual(firstRug(3))
  })

  it('can be made over and over: every block of the basket ends on the rug', () => {
    const play = bare()
    for (let n = 0; n < KINDS.length * PER_KIND; n++) {
      const kind = KINDS[n % KINDS.length]
      play.press(overOffer(kind))
      play.tap()
      run(play, 1.2)
    }
    expect(play.rug()).toHaveLength(KINDS.length * PER_KIND)
    expect(play.touchable()).toEqual([])
    // With the basket empty the hand shows a tap on the basket, which tips, and then the bell.
    expect(play.basketGlows()).toBe(true)
    const basket = play.guide(0), bell = play.guide(1)
    if (basket?.kind !== 'tap' || bell?.kind !== 'tap') throw new Error('the hand taps')
    expect(basket.at[0]).toBeGreaterThan(BASKET.x - BASKET.wide / 2)
    expect(bell.at[0]).toBeLessThan(BASKET.x - BASKET.wide / 2)
  })
})

describe('a block pulled from under others', () => {
  it('lets what rested on it drop straight down, with a soft knock', () => {
    const play = new Play(firstRug(3), 1)
    // A finger on the front of the cube, under the round one.
    play.press({ origin: [placeX(3), 0.5, 2], dir: [0, 0, -1] })
    expect(play.pieces[play.hand!.id].kind).toBe('cube')
    expect(play.hand!.riders).toHaveLength(1)
    play.carry(overPlace(0, 0))
    const events = [...play.take(), ...run(play, 1)]
    expect(events.find((event) => event.type === 'land')).toMatchObject({ kind: 'round', soft: true, level: 0 })
    play.carry(overPlace(0, 0))
    play.drop()
    run(play, 1)
    expect(play.rug()).toEqual([{ kind: 'round', col: 3, row: 1 }, { kind: 'cube', col: 0, row: 0 }])
    expect(play.pieces.find((piece) => piece.kind === 'round' && piece.state === 'rug')!.y).toBeCloseTo(0)
  })
})

describe('a block pulled from the foot of a tower', () => {
  it('lets the tower come down bottom block first, its knocks running down the scale', () => {
    const tower: Placed[] = [{ kind: 'round', col: 3, row: 1 }, { kind: 'round', col: 3, row: 1 }, { kind: 'round', col: 3, row: 1 }]
    const play = new Play(tower, 1)
    play.press({ origin: [placeX(3), 0.5, 2], dir: [0, 0, -1] })
    expect(play.hand!.riders).toHaveLength(2)
    play.carry(overPlace(0, 0))
    const lands = [...play.take(), ...run(play, 1.5)].filter((event) => event.type === 'land')
    // The lower of the two lands first, and knocks higher than the one that lands after it.
    expect(lands.map((event) => event.type === 'land' && event.level)).toEqual([0, 3])
    expect(lands.map((event) => event.type === 'land' && event.tier)).toEqual([1, 0])
  })
})

describe('a carry that is taken away', () => {
  it('puts a block of the basket back in the basket', () => {
    const play = bare()
    play.press(overOffer('long'))
    play.carry(overPlace(2, 2))
    run(play, 0.3)
    play.cancel()
    run(play, 1)
    expect(play.rug()).toEqual([])
    expect(play.hand).toBeNull()
    expect(play.touchable()).toHaveLength(KINDS.length)
    expect(play.pieces.filter((piece) => piece.kind === 'long' && piece.state === 'offer')).toHaveLength(1)
    expect(play.pieces.filter((piece) => piece.kind === 'long' && piece.state === 'under')).toHaveLength(2)
  })

  it('puts a block of the rug back where it stood, under whatever stood on it', () => {
    const play = new Play(firstRug(3), 1)
    play.press({ origin: [placeX(3), 0.5, 2], dir: [0, 0, -1] })
    play.carry(overPlace(0, 0))
    run(play, 0.5)
    play.cancel()
    run(play, 1)
    expect(play.rug()).toEqual(firstRug(3))
    const round = play.pieces.find((piece) => piece.kind === 'round' && piece.state === 'rug')!
    expect(round.level).toBe(2)
    expect(round.y).toBeCloseTo(1)
    expect(play.busy).toBe(false)
  })
})

describe('the idle hand', () => {
  it('shows one move from the basket to where a tap would send the block', () => {
    const play = new Play(firstRug(3), 1)
    // With something on the rug every other turn is the bell's.
    const first = play.guide(0)!, second = play.guide(2)!
    if (first.kind !== 'carry' || second.kind !== 'carry') throw new Error('the hand carries a block')
    expect(play.pieces[first.id].state).toBe('offer')
    expect(first.id).not.toBe(second.id)
    expect(first.from[0]).toBeGreaterThan(3)
    expect(first.to[0]).toBeLessThan(3)
    // Never while a finger holds a block.
    play.press(overOffer('cube'))
    expect(play.guide(0)).toBeNull()
  })
})

describe('a game that was put away and is back', () => {
  it('shows an idle child what a loaded game shows: nothing the hand goes by is left over', () => {
    const rug: Placed[] = [{ kind: 'cube', col: 3, row: 1 }, { kind: 'round', col: 5, row: 1 }]
    const play = new Play(rug, 1)
    // The castle is seen and the afternoon rung back, and a block is set down: the hand now shows the basket pulled over.
    const overBell: Ray = down(BELL.x, BELL.z)
    play.press(overBell); run(play, 9)
    play.press(overBell); run(play, 5)
    carryOut(play, 'cube', 0, 0)
    expect(play.guide(0)?.kind).toBe('pull')
    expect(play.basketGlows()).toBe(true)
    const shows = (one: Play): unknown[] => [0, 1, 2, 3, 4, 5].map((turn) => { const move = one.guide(turn); return move ? [move.kind, 'id' in move ? one.pieces[move.id].kind : null] : null })
    play.asLoaded()
    const loaded = new Play(play.rug(), 1)
    expect(shows(play)).toEqual(shows(loaded))
    expect(play.basketGlows()).toBe(loaded.basketGlows())
    expect(shows(play).some((move) => Array.isArray(move) && move[0] === 'pull')).toBe(false)
  })
})

describe('chance', () => {
  it('is the seed alone: the same touches play the same toy', () => {
    const script = (seed: number): string => {
      const play = new Play(firstRug(3), seed)
      const events = [...carryOut(play, 'round', 1, 0), ...carryOut(play, 'thin', 5, 2), ...carryOut(play, 'cube', 1, 0), ...run(play, 6)]
      return JSON.stringify([events, play.pieces.map((piece) => [piece.x, piece.y, piece.z, piece.jitter]), WHO_POSE(play)])
    }
    expect(script(5)).toBe(script(5))
    expect(script(5)).not.toBe(script(6))
  })
})

function WHO_POSE(play: Play): unknown {
  return (['king', 'cook', 'dragon'] as const).map((who) => ({ ...play.folk.pose(who) }))
}

describe('a bare finger', () => {
  it('is followed by the eyes of each of the folk while it is down, and they look at what they want again when it lifts', () => {
    const play = new Play([{ kind: 'cube', col: 3, row: 1 }], 1)
    run(play, 2)
    const eyes = (): number[][] => (['king', 'cook', 'dragon'] as const).map((who) => [play.folk.pose(who).gazeX, play.folk.pose(who).gazeY])
    const wants = eyes()
    // On the bare rug at its far left, then dragged to its far right: no block is touched.
    play.press(down(placeX(0), placeZ(2)))
    expect(play.hand).toBeNull()
    run(play, 2)
    const left = eyes()
    play.carry(down(placeX(6), placeZ(0)))
    run(play, 2)
    const right = eyes()
    // Each one's eyes went with it. The king sits to the left of the whole rug, so his turn less than the others'.
    for (let i = 0; i < 3; i++) expect(Math.abs(right[i][0] - left[i][0]) + Math.abs(right[i][1] - left[i][1]), ['king', 'cook', 'dragon'][i]).toBeGreaterThan(i === 0 ? 0.05 : 0.2)
    play.pressEnd()
    run(play, 3)
    const after = eyes()
    // To the side they looked before; how far up their eyes are also moves with their own small doings.
    for (let i = 0; i < 3; i++) expect(Math.abs(after[i][0] - wants[i][0]), ['king', 'cook', 'dragon'][i]).toBeLessThan(0.1)
  })

  it('gives way to a block: with one in the hand their eyes are on the block', () => {
    const play = new Play([{ kind: 'cube', col: 5, row: 1 }], 1)
    play.press({ origin: [placeX(5), 0.5, 6], dir: [0, 0, -1] })
    expect(play.hand).not.toBeNull()
    play.carry(overPlace(0, 0))
    run(play, 2)
    const onBlock = play.folk.pose('cook').gazeX
    play.drop()
    run(play, 3)
    play.press(down(placeX(6), placeZ(2)))
    run(play, 2)
    expect(Math.abs(play.folk.pose('cook').gazeX - onBlock)).toBeGreaterThan(0.2)
  })
})

describe('a slope carried to a lone block', () => {
  it('sits with its heel on the block and its toe over the air in every column and with both facings, and in the evening its ladder stands on the block', () => {
    const faced = new Set<string>()
    for (const kind of ['cube', 'round'] as const) for (let col = 0; col < COLS; col++) {
      const row = col % ROWS
      const play = new Play([{ kind, col, row }], 1)
      const events = carryOut(play, 'slope', col, row)
      const rug = play.rug()
      const slope = rug[1]
      expect(slope.kind).toBe('slope')
      expect(hangingSlope(rug), `${kind} ${col}`).toBe(-1)
      const piece = play.pieces.find((one) => one.kind === 'slope' && one.state === 'rug')!
      const ends = slopeEnds(slope.col)
      if (col === 0 || col === COLS - 1) {
        // The outermost place can only be the toe of a slope. It touches the block, cannot stay with its heel in
        // the air, and comes down on the rug beside it.
        expect(types(events), `${kind} ${col}`).toContain('shed')
        expect(piece.level).toBe(0)
        expect([ends.heel, ends.toe]).not.toContain(col)
        continue
      }
      expect(types(events), `${kind} ${col}`).not.toContain('shed')
      // Its heel is on the block under the finger, as high as the block's top, and nothing is under its toe.
      expect(ends.heel, `${kind} ${col}`).toBe(col)
      expect(piece.level).toBe(heights([rug[0]])[row * COLS + col])
      expect(heights([rug[0]])[row * COLS + ends.toe]).toBe(0)
      faced.add(`${col} ${slopeFaces(slope.col)}`)
      // In the evening it is a slide, and its ladder stands at its heel on the top of that block.
      const evening = new Play(rug, 1, true).evening
      const slide = evening.things.find((thing) => thing.what === 'slide')!
      const under = evening.things.find((thing) => thing.what !== 'slide')!
      expect(slide.base).toBeCloseTo(under.top)
      expect(slide.base).toBeCloseTo(piece.level * HALF_LEVEL)
      const ladder = slide.x - slide.side * (SIZE.slope[0] / 2 + LADDER_OFF)
      // The ladder is at the heel's end, and the block reaches out under it.
      expect(Math.sign(ladder - slide.x)).toBe(Math.sign(placeX(ends.heel) - placeX(ends.toe)))
      expect(Math.abs(ladder - under.x)).toBeLessThan(SIZE[kind][0] / 2 + LADDER_OFF + 0.03)
    }
    expect([...faced].sort()).toEqual(['1 left', '2 left', '3 right', '4 right', '5 right'])
  })

  it('is never left held up by its toe, whatever is carried, tapped out or pulled from under it', () => {
    let pulls = 0, moved = 0
    for (let seed = 1; seed <= 40; seed++) {
      const rng = makeRng(seed * 7919)
      const play = new Play([], seed)
      for (let turn = 0; turn < 14; turn++) {
        const kind = KINDS[below(rng, KINDS.length)]
        const does = below(rng, 5)
        if (does < 3) carryOut(play, kind, below(rng, COLS), below(rng, ROWS))
        else if (does === 3) { play.press(overOffer(kind)); play.tap(); run(play, 1.5) }
        else {
          // A block of the rug pulled out from under whatever stands on it, by a finger on its face, and carried off.
          const standing = play.pieces.filter((piece) => piece.state === 'rug')
          const target = standing[below(rng, Math.max(1, standing.length))]
          if (!target) continue
          play.press({ origin: [target.home[0], target.home[1] + SIZE[target.kind][1] / 2, 9], dir: [0, 0, -1] })
          if (!play.hand) { play.pressEnd(); continue }
          const before = play.rug().length
          run(play, 0.1)
          play.carry(overPlace(below(rng, COLS), below(rng, ROWS)))
          pulls++
          // With the block in the hand, and wherever it is let go.
          const now = play.pieces.filter((piece) => piece.state === 'rug').map((piece) => ({ kind: piece.kind, home: piece.home }))
          expect(now.length).toBe(before - 1)
          run(play, 0.4)
          play.drop()
          run(play, 1.5)
        }
        const rug = play.rug()
        expect(hangingSlope(rug), `seed ${seed} turn ${turn}`).toBe(-1)
        moved += rug.filter((block) => block.kind === 'slope').length
      }
    }
    expect(pulls).toBeGreaterThan(20)
    expect(moved).toBeGreaterThan(50)
  })

  it('whose block is pulled from under its heel, with a lower one under its toe, comes down and hops to where it can stay', () => {
    // A long one on the rug, a cube beside it, and a slope with its heel on the cube and its toe out over the long one.
    const rug: Placed[] = [{ kind: 'long', col: 4, row: 1 }, { kind: 'cube', col: 3, row: 1 }, { kind: 'slope', col: 3, row: 1 }]
    const play = new Play(rug, 1)
    expect(play.rug()).toEqual(rug)
    expect(slopeEnds(3)).toEqual({ heel: 3, toe: 4 })
    // A finger on the cube's side, from the left of the rug.
    const side = (y: number): Ray => ({ origin: [-4.4, y, placeZ(1)], dir: [1, 0, 0] })
    const cube = play.pieces.find((piece) => piece.kind === 'cube' && piece.state === 'rug')!
    play.press(side(cube.home[1] + 0.5))
    expect(play.hand?.id).toBe(cube.id)
    expect(play.hand?.riders).toHaveLength(1)
    run(play, 0.1)
    play.carry(overPlace(0, 0))
    const events = [...play.take(), ...run(play, 1.5)]
    // It touched where it would have hung, and is now somewhere it is held.
    expect(types(events)).toContain('shed')
    const held = play.pieces.find((piece) => piece.kind === 'slope' && piece.state === 'rug')!
    expect(held.legs).toHaveLength(0)
    play.drop()
    run(play, 1.5)
    expect(hangingSlope(play.rug())).toBe(-1)
    expect(play.rug()).toHaveLength(3)
    // Taken away with the finger still down, everything goes back where it was: the slope too.
    const again = new Play(rug, 1)
    again.press(side(0.5))
    run(again, 0.1)
    again.carry(overPlace(0, 0))
    run(again, 0.5)
    again.cancel()
    run(again, 1.5)
    expect(again.rug()).toEqual(rug)
  })
})

describe('a game put away in the evening and back', () => {
  /** What is seen of the evening that is not saved. */
  const seen = (play: Play): unknown => {
    const { evening } = play
    return JSON.parse(JSON.stringify({
      on: evening.on, running: evening.running, busy: evening.busy, colours: evening.flagColour, dress: evening.dress,
      folk: (['king', 'cook', 'dragon'] as const).map((who) => [evening.actors[who].placing, evening.actors[who].busy]),
      sits: evening.kingSits, high: evening.cookHigh, lids: evening.things.map((_, i) => evening.lid(i)),
    }))
  }
  const CASTLE: Placed[] = [{ kind: 'cube', col: 0, row: 1 }, { kind: 'arch', col: 3, row: 0 }, { kind: 'thin', col: 0, row: 0 }, { kind: 'round', col: 6, row: 0 }, { kind: 'slope', col: 0, row: 2 }, { kind: 'long', col: 4, row: 0 }, { kind: 'round', col: 2, row: 0 }, { kind: 'cube', col: 6, row: 1 }]

  it('is as a saved game loaded: a flag is in its first colour, and one of the folk who was on a trip is where he rests', () => {
    const play = new Play(CASTLE, 1, true)
    run(play, 1)
    const { evening } = play
    const pole = evening.things.findIndex((thing) => thing.what === 'pole')
    const first = evening.flagColour[pole]
    evening.act(pole)
    run(play, 2)
    expect(evening.flagColour[pole]).not.toBe(first)
    // One of them is sent down the slide, and the game is put away while he is on his way.
    evening.act(evening.things.findIndex((thing) => thing.what === 'slide'))
    run(play, 0.8)
    expect((['king', 'cook'] as const).some((who) => evening.actors[who].busy)).toBe(true)
    play.take()
    play.asLoaded()
    const loaded = new Play(play.rug(), 1, play.finished)
    expect(evening.flagColour[pole]).toBe(first)
    expect(seen(play)).toEqual(seen(loaded))
    // Nothing is heard of it, and nothing plays on.
    expect(play.take()).toEqual([])
    run(play, 1); run(loaded, 1)
    expect(seen(play)).toEqual(seen(loaded))
  })

  it('is as a saved game loaded when it was put away while evening fell, or while the afternoon came back', () => {
    for (const from of [false, true]) {
      const play = new Play(CASTLE, 1, from)
      run(play, 1)
      play.press(down(BELL.x, BELL.z))
      play.pressEnd()
      run(play, 1.5)
      expect(play.sceneRunning).toBe(true)
      play.take()
      play.asLoaded()
      const loaded = new Play(play.rug(), 1, play.finished)
      expect(play.finished).toBe(!from)
      expect(play.sceneRunning).toBe(false)
      expect(seen(play)).toEqual(seen(loaded))
      expect(play.rug()).toEqual(CASTLE)
      expect(play.take()).toEqual([])
    }
  })
})
