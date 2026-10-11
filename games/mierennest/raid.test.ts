import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { EARTH, MOUTH, MUD, OPEN, SAND, STONE, at, clone, equal, fromPicture, generate, put, settle, type Ground } from './ground'
import { HABITS } from './habits'
import { PARTY, judge, partyAt, type Party } from './order'
import { LONGEST, TICK, callRaid, endOf, hit, playOut, stepRaid, type Raid, type RaidEvent } from './raid'

// Whole raids, played from a nest and a party to their end. In the pictures the mouth is the open cell of the top
// row, a tunnel is two cells high and a room is four wide and three high.
const mouthOf = (picture: string[]) => [...picture[0]].flatMap((mark, x) => (mark === '.' ? [x] : []))
const raidOn = (picture: string[], party: Party) => callRaid(fromPicture(picture), party, mouthOf(picture))
const kinds = (events: RaidEvent[], type: RaidEvent['type']) => events.filter((event) => event.type === type)
const states = (raid: Raid) => raid.invaders.map((invader) => invader.state)

/**
 * A shaft, a tunnel two cells high to the right, and a room six wide at its end, a cell deeper than the tunnel.
 * `upper` and `lower` are the tunnel's two rows, ten cells from the shaft.
 */
const nest = (upper = '..........', lower = '..........') => [
  'X.XXXXXXXXXXXXXXXXXX',
  '#.##################',
  `#.${upper.slice(1)}......###`,
  `#.${lower.slice(1)}......###`,
  '###########......###',
  '####################',
  'XXXXXXXXXXXXXXXXXXXX',
]
const COLS = 20

describe('a raid with nothing in the way', () => {
  it('every kind that fits gets in, does its own act once, and goes home', () => {
    for (const kind of ['ant', 'beetle'] as const) {
      const raid = playOut(raidOn(nest(), [kind]))
      expect(raid.acts, kind).toBe(1)
      expect(kinds(raid.events, 'acted').length).toBe(1)
      expect(raid.time).toBeLessThan(LONGEST)
      expect(judge(endOf(raid))).toBe('not-well')
    }
  })

  it('an ant walks all the way home, and a beetle sits down at the foot of the shaft it cannot climb', () => {
    expect(states(playOut(raidOn(nest(), ['ant'])))).toEqual(['home'])
    const raid = playOut(raidOn(nest(), ['beetle']))
    expect(states(raid)).toEqual(['held'])
    expect(raid.invaders[0].cell % COLS).toBe(1)
  })

  it('a fly does not come into a tunnel two cells high: it peers, gives up and goes home', () => {
    const raid = playOut(raidOn(nest(), ['fly']))
    expect(raid.acts).toBe(0)
    expect(states(raid)).toEqual(['home'])
    expect(judge(endOf(raid))).toBe('well')
  })

  it('a fly comes into a room it can fly to, and does its act', () => {
    const picture = ['X...XXXXXX', '#...######', '#........#', '#........#', '#........#', '##########', 'XXXXXXXXXX']
    const raid = playOut(raidOn(picture, ['fly']))
    expect(raid.acts).toBe(1)
  })

  it('the act takes as long as the habit says', () => {
    const raid = raidOn(nest(), ['ant'])
    let began = -1, ended = -1
    while (!raid.over) {
      stepRaid(raid)
      if (began < 0 && raid.invaders[0].state === 'acting') began = raid.time
      if (began >= 0 && ended < 0 && raid.invaders[0].state !== 'acting') ended = raid.time
    }
    expect(ended - began).toBeCloseTo(HABITS.ant.act.seconds, 0)
  })
})

describe('mud and raider ants', () => {
  it('one cell of mud on the floor holds one ant, and the next walks over its back', () => {
    const one = playOut(raidOn(nest('..........', '....m.....'), ['ant']))
    expect(states(one)).toEqual(['stuck'])
    expect(one.acts).toBe(0)
    expect(judge(endOf(one))).toBe('well')
    const three = playOut(raidOn(nest('..........', '....m.....'), ['ant', 'ant', 'ant']))
    expect(states(three).filter((state) => state === 'stuck').length).toBe(1)
    expect(three.acts).toBe(2)
  })

  it('three cells of mud hold a file of three', () => {
    const raid = playOut(raidOn(nest('..........', '...mmm....'), ['ant', 'ant', 'ant']))
    expect(states(raid)).toEqual(['stuck', 'stuck', 'stuck'])
    expect(raid.acts).toBe(0)
  })

  it('a beetle walks over the mud that holds an ant: mud is no wall to it when it lies in the floor', () => {
    const picture = nest()
    picture[4] = '####m######......###'
    const raid = playOut(raidOn(picture, ['beetle', 'ant']))
    expect(raid.invaders[0].acted).toBe(true)
    expect(raid.invaders[1].state).toBe('stuck')
  })
})

describe('walls and beetles', () => {
  it('a lump of sand on the floor is shoved along by one beetle, which gets in', () => {
    const raid = playOut(raidOn(nest('..........', '....s.....'), ['beetle']))
    expect(kinds(raid.events, 'gave').length).toBeGreaterThan(0)
    expect(raid.acts).toBe(1)
    expect(raid.gave.size).toBeGreaterThan(0)
  })

  it('sand packed by mud holds one beetle, which gives up, and gives to two', () => {
    const wall = nest('..........', '....sm....')
    const one = playOut(raidOn(wall, ['beetle']))
    expect(one.acts).toBe(0)
    expect(kinds(one.events, 'strain').length).toBe(1)
    expect(kinds(one.events, 'givesUp').length).toBe(1)
    expect(judge(endOf(one))).toBe('well')
    const two = playOut(raidOn(wall, ['beetle', 'beetle']))
    expect(kinds(two.events, 'gave').length).toBeGreaterThan(0)
    expect(two.acts).toBeGreaterThan(0)
  })

  it('with a stone bedded in the mud it holds two beetles, and three', () => {
    const wall = nest('..........', '....smo...')
    for (const party of [['beetle', 'beetle'], ['beetle', 'beetle', 'beetle']] as Party[]) {
      const raid = playOut(raidOn(wall, party))
      expect(raid.acts, String(party.length)).toBe(0)
      expect(kinds(raid.events, 'gave').length).toBe(0)
      expect(raid.time).toBeLessThan(LONGEST)
    }
  })

  it('what stops a beetle lets an ant through, unless there is mud on top of it', () => {
    // Sand and a stone hold one beetle; an ant walks over them.
    const dry = playOut(raidOn(nest('..........', '....so....'), ['ant', 'beetle']))
    expect(dry.invaders[0].acted).toBe(true)
    expect(dry.invaders[1].acted).toBe(false)
    // With mud in the wall the ant that walks over it sticks on the mud.
    const bound = playOut(raidOn(nest('..........', '....smo...'), ['ant', 'beetle']))
    expect(bound.invaders[0].state).toBe('stuck')
    expect(bound.invaders[1].acted).toBe(false)
    expect(bound.acts).toBe(0)
  })

  it('a pit two cells deep holds a beetle and not an ant', () => {
    const picture = nest()
    picture[4] = '####..#####......###'
    picture[5] = '####..##############'
    const raid = playOut(raidOn(picture, ['beetle', 'ant']))
    expect(raid.invaders[0].acted).toBe(false)
    expect(raid.invaders[0].state).toBe('held')
    expect(raid.invaders[1].acted).toBe(true)
  })
})

describe('what a raid leaves behind', () => {
  const built = () => fromPicture(nest('..........', '....s.....'))

  it('leaves the nest as built, cell for cell, whatever it knocked down in its copy', () => {
    const ground = built(), before = clone(ground)
    const raid = playOut(callRaid(ground, ['beetle', 'beetle', 'ant'], [1]))
    expect(equal(ground, before)).toBe(true)
    expect(equal(raid.ground, before)).toBe(false)
  })

  it('plays the same way twice with no shot fired, invader for invader', () => {
    const log = () => {
      const raid = playOut(callRaid(built(), ['beetle', 'ant', 'beetle', 'ant'], [1]))
      return JSON.stringify([raid.events, raid.time, raid.invaders.map((i) => [i.state, i.cell, i.acted])])
    }
    expect(log()).toBe(log())
  })

  it('marks the place that gave', () => {
    const raid = playOut(callRaid(built(), ['beetle'], [1]))
    expect(raid.gave.has(3 * COLS + 5)).toBe(true)
  })

  it('is not judged where the kingdom had no chamber as it was called', () => {
    const raid = playOut(raidOn(['X.XXXX', '#.####', '#....#', '#....#', '######', 'XXXXXX'], ['ant', 'beetle']))
    expect(raid.chambersWhenCalled).toBe(0)
    expect(raid.acts).toBe(0)
    expect(judge(endOf(raid))).toBe('not-judged')
    expect(judge(endOf(raid, true))).toBe('not-judged')
  })
})

describe('a shot', () => {
  const at3 = (party: Party, seconds: number) => {
    const raid = raidOn(nest(), party)
    while (raid.time < seconds) stepRaid(raid)
    return raid
  }

  it('sends a raider ant home with sand, and holds it with mud', () => {
    const sand = at3(['ant'], 2.2)
    hit(sand, 0, 'sand')
    playOut(sand)
    expect([sand.invaders[0].state, sand.invaders[0].acted, sand.acts]).toEqual(['home', false, 0])
    const mud = at3(['ant'], 2.2)
    hit(mud, 0, 'mud')
    playOut(mud)
    expect(mud.invaders[0].state).toBe('held')
    expect(mud.invaders[0].answer).toBe(HABITS.ant.shots.mud.id)
  })

  it('rattles off a beetle with sand, turns it round with mud, and knocks it back with a stone, twice for home', () => {
    const sand = at3(['beetle'], 3)
    hit(sand, 0, 'sand')
    expect(playOut(sand).invaders[0].acted).toBe(true)
    const mud = at3(['beetle'], 3)
    hit(mud, 0, 'mud')
    expect(playOut(mud).invaders[0].acted).toBe(false)
    const once = at3(['beetle'], 3)
    hit(once, 0, 'stone')
    expect(once.invaders[0].state).toBe('dazed')
    expect(playOut(once).invaders[0].acted).toBe(true)
    const twice = at3(['beetle'], 3)
    hit(twice, 0, 'stone')
    stepRaid(twice)
    hit(twice, 0, 'stone')
    expect(playOut(twice).invaders[0].acted).toBe(false)
  })

  it('sends an invader out before its act is over, and the act is not counted', () => {
    const raid = raidOn(nest(), ['ant'])
    while (raid.invaders[0].state !== 'acting') stepRaid(raid)
    hit(raid, 0, 'stone')
    playOut(raid)
    expect(raid.acts).toBe(0)
    expect(judge(endOf(raid))).toBe('well')
  })

  it('never removes an invader: every one ends at home, held or stuck', () => {
    for (const shot of ['sand', 'mud', 'stone'] as const) for (const kind of ['ant', 'beetle'] as const) {
      const raid = at3([kind], 3)
      hit(raid, 0, shot)
      playOut(raid)
      expect(['home', 'held', 'stuck']).toContain(raid.invaders[0].state)
      expect(raid.invaders.length).toBe(1)
    }
  })
})

/** The game's own ground with a tunnel and a room dug in it, and a wall of lumps in the tunnel, for raids at full size. */
function dugNest(seed: number, wall: boolean): Ground {
  const ground = generate(seed)
  const dig = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (at(ground, x, y) === EARTH) put(ground, x, y, OPEN)
  }
  dig(MOUTH[0], 1, MOUTH[2], 5)
  dig(22, 4, 27, 5)
  dig(28, 3, 33, 5)
  settle(ground)
  if (wall) for (const [x, kind] of [[23, SAND], [24, MUD], [25, STONE]] as const) if (at(ground, x, 5) === OPEN) put(ground, x, 5, kind)
  settle(ground)
  return ground
}

describe('at every place of the order', () => {
  it('a raid ends by itself, with and without a wall, and leaves the nest as built', () => {
    for (const place of LADDER.slice(0, LADDER.indexOf('dung-scout'))) {
      for (const wall of [false, true]) {
        const ground = dugNest(1, wall), before = clone(ground)
        const raid = playOut(callRaid(ground, partyAt(place, 0)))
        expect(raid.over, place).toBe(true)
        expect(raid.time, `${place} ${wall}`).toBeLessThan(LONGEST)
        expect(equal(ground, before)).toBe(true)
        for (const invader of raid.invaders) expect(['home', 'held', 'stuck']).toContain(invader.state)
        expect(raid.invaders.length).toBe(PARTY[place as keyof typeof PARTY].length)
      }
    }
  })

  it('takes a bounded time by the tick', () => {
    const raid = callRaid(dugNest(1, true), partyAt('full-camp', 0))
    let ticks = 0
    while (!raid.over) { stepRaid(raid); ticks++ }
    expect(ticks * TICK).toBeCloseTo(raid.time, 6)
    expect(ticks).toBeLessThan(LONGEST / TICK)
  })
})
