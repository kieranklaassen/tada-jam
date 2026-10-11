import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { EARTH, MOUTH, MUD, OPEN, SAND, STONE, at, clone, equal, fromPicture, generate, put, settle, toPicture, type Ground } from './ground'
import { HABITS } from './habits'
import { PARTY, ROUND, judge, partyAt, type Party } from './order'
import { roomOf } from './routes'
import { DIG, LONGEST, QUEUE_GAP, ROLL, SEEN_FOR, TICK, callRaid, endOf, gaitOf, hit, playOut, stepRaid, type Raid, type RaidEvent } from './raid'

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

  it('every kind climbs back up the shaft a new nest starts with by itself: nobody is left at its foot', () => {
    expect(states(playOut(raidOn(nest(), ['ant'])))).toEqual(['home'])
    expect(states(playOut(raidOn(nest(), ['beetle'])))).toEqual(['home'])
    expect(states(playOut(raidOn(nest(), ['beetle', 'beetle', 'ant'])))).toEqual(['home', 'home', 'home'])
    // On the game's own ground, with a hall dug off the foot of the shaft: the whole camp, and the army with its balls.
    const ground = generate(1)
    for (let y = 1; y <= 3; y++) for (let x = 22; x <= 31; x++) put(ground, x, y, OPEN)
    settle(ground)
    for (const party of [PARTY['full-camp'], PARTY['great-raid']]) {
      const raid = playOut(callRaid(ground, party))
      expect(raid.acts).toBeGreaterThan(0)
      for (const invader of raid.invaders) expect(invader.state, invader.kind).toBe('home')
    }
  })

  it('only a pit the child dug holds a beetle: where the shaft was dug deeper, it sits down at the foot and waits for the workers', () => {
    const deep = ['X.XXXXXXXXXXXXXXXXXX', '#.##################', '#.##################', '#.##################', '#................###', '#................###', '##########.......###', '####################', 'XXXXXXXXXXXXXXXXXXXX']
    const raid = playOut(raidOn(deep, ['beetle']))
    expect(raid.acts).toBe(1)
    expect(states(raid)).toEqual(['held'])
    expect(raid.invaders[0].cell % COLS).toBe(1)
    expect(Math.floor(raid.invaders[0].cell / COLS)).toBe(5)
    // An ant climbs out of the same pit.
    expect(states(playOut(raidOn(deep, ['ant'])))).toEqual(['home'])
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

describe('a room under the shaft, and a mouth partly shut', () => {
  const under = ['XXXX...XXXX', '####...####', '####...####', '####...####', '#.........#', '#.........#', '#.........#', '###########', 'XXXXXXXXXXX']

  it('does not keep a raider ant out: it drops in, does its act, and waits at the foot of its drop for the workers', () => {
    const raid = playOut(raidOn(under, ['ant']))
    expect(raid.acts).toBe(1)
    expect(states(raid)).toEqual(['held'])
    expect(Math.floor(raid.invaders[0].cell / 11)).toBe(6)
    expect(judge(endOf(raid))).toBe('not-well')
    // One that climbed all its way in goes home past a beetle that sits held in its way.
    const walled = ['XXXX...XXXX', '####...####', '####...####', '####...####', '####......#', '####......#', '####......#', '###########', 'XXXXXXXXXXX']
    const mixed = playOut(raidOn(walled, ['beetle', 'ant']))
    expect(mixed.acts).toBe(2)
    expect(states(mixed)).toEqual(['held', 'home'])
  })

  it('those who wait for the workers sit a body\'s length apart, each from every other, where the floor has room for it', () => {
    // A body is a little over four cells long: five cells from middle to middle is a body's length apart.
    const apart = (raid: Raid) => {
      const held = raid.invaders.filter((invader) => invader.state === 'held')
      for (const a of held) for (const b of held) {
        if (a.id >= b.id || Math.floor(a.cell / raid.ground.cols) !== Math.floor(b.cell / raid.ground.cols)) continue
        expect(Math.abs((a.cell % raid.ground.cols) - (b.cell % raid.ground.cols)), `${a.id} and ${b.id}`).toBeGreaterThanOrEqual(5)
      }
      return held.length
    }
    // A wide room under the shaft: a file of three raider ants, then beetles with them.
    const wide = ['XXXXXXXXX...XXXXXXXXXXXXXXXXXXXXXX', '#########...######################', '#########...######################', '#########...######################', `#${'.'.repeat(32)}#`, `#${'.'.repeat(32)}#`, `#${'.'.repeat(32)}#`, '#'.repeat(34), 'X'.repeat(34)]
    const file = playOut(raidOn(wide, ['ant', 'ant', 'ant']))
    expect(file.acts).toBe(3)
    expect(apart(file)).toBe(3)
    const mixed = playOut(raidOn(wide, ['beetle', 'ant', 'beetle']))
    expect(mixed.acts).toBe(3)
    expect(apart(mixed)).toBe(3)
    // Two rooms at the ends of a low way that passes under the shaft: two who come back to the foot of the same drop
    // from either side at the same moment do not sit down in one cell.
    const twoRooms = (right: number) => {
      const rest = right + 7
      return [`XXXXXXXXX...${'X'.repeat(rest)}`, ...[1, 2, 3].map(() => `#########...${'#'.repeat(rest)}`), `#......##...${'#'.repeat(right)}......#`, ...[5, 6].map(() => `#${'.'.repeat(rest + 10)}#`), '#'.repeat(rest + 12), 'X'.repeat(rest + 12)]
    }
    for (const [right, party] of [[3, ['ant', 'ant']], [5, ['beetle', 'beetle']]] as [number, Party][]) {
      const met = playOut(raidOn(twoRooms(right), party))
      expect(met.acts, party[0]).toBe(2)
      expect(apart(met), party[0]).toBe(2)
    }
    // Under a shaft that was widened at its top, where an ant lets go twice on its way down.
    const widened = ['XXXXXXXXX...XXXXXXXXXXXX', '########.....###########', '#########...############', '#########...############', '#......................#', '#......................#', '#......................#', '########################', 'XXXXXXXXXXXXXXXXXXXXXXXX']
    const two = playOut(raidOn(widened, ['ant', 'ant']))
    expect(two.acts).toBe(2)
    expect(apart(two)).toBe(2)
    // One that gave up and never did its act waits the same way: at the foot of its drop, a body's length from the next.
    // A low way under the shaft, wider than it, with one lump of sand before the room: the ants drop in, cannot climb the sand, and give up.
    const walled = ['XXXXXXXXX...XXXXXXXXXXXX', '#########...############', '#########...############', '#########...############', '#########...######.....#', '#######................#', '#######.........s......#', '########################', 'XXXXXXXXXXXXXXXXXXXXXXXX']
    const gaveUp = raidOn(walled, ['ant', 'ant'])
    const events: RaidEvent[] = []
    while (!gaveUp.over) { stepRaid(gaveUp); events.push(...gaveUp.events.splice(0)) }
    expect(gaveUp.acts).toBe(0)
    expect(kinds(events, 'givesUp').length).toBe(2)
    expect(states(gaveUp)).toEqual(['held', 'held'])
    expect(apart(gaveUp)).toBe(2)
  })

  it('lets everyone in by a column that is still open, and sends home with a sigh only those the mouth is shut to', () => {
    const plugged = ['XXXX...XXXX', '####m..####', '####...####', '####...####', '#.........#', '#.........#', '#.........#', '###########', 'XXXXXXXXXXX']
    for (const kind of ['beetle', 'fly'] as const) {
      const raid = playOut(raidOn(plugged, [kind]))
      expect(raid.acts, kind).toBe(1)
    }
    // A dung ball is three columns wide: one lump of mud in a column, with earth behind it, it digs, and comes in.
    const scout = raidOn(plugged, ['dungBeetle'])
    const events: RaidEvent[] = []
    while (!scout.over) { stepRaid(scout); events.push(...scout.events.splice(0)) }
    expect(kinds(events, 'leftBall').length).toBe(0)
    expect(kinds(events, 'widened').length).toBeGreaterThan(0)
    expect(scout.acts).toBe(1)
    // All three columns shut: nobody gets in, each gives up at the mouth and is heard, and the raid is over.
    const shut = ['XXXX...XXXX', '####mmm####', '####...####', '####...####', '#.........#', '#.........#', '#.........#', '###########', 'XXXXXXXXXXX']
    const none = raidOn(shut, ['beetle', 'fly'])
    const heard: RaidEvent[] = []
    while (!none.over) { stepRaid(none); heard.push(...none.events.splice(0)) }
    expect(none.acts).toBe(0)
    expect(kinds(heard, 'givesUp').length).toBe(2)
    expect(states(none)).toEqual(['home', 'home'])
  })
})

describe('the shaft', () => {
  it('is the way in and no part of a room dug beside it: an invader coming down it is not yet inside', () => {
    const ground = generate(1)
    for (let y = 1; y <= 3; y++) for (let x = 19; x <= 27; x++) put(ground, x, y, OPEN)
    settle(ground)
    const raid = callRaid(ground, ['ant', 'beetle', 'fly'])
    for (const x of MOUTH) for (let y = 0; y < 3; y++) expect(raid.inside[y * ground.cols + x]).toBe(0)
    const events: RaidEvent[] = []
    while (!raid.over) {
      stepRaid(raid)
      events.push(...raid.events)
      raid.events.length = 0
    }
    const inside = kinds(events, 'inside') as Extract<RaidEvent, { type: 'inside' }>[]
    expect(inside.length).toBeGreaterThan(0)
    // The ant is inside from the first cell of the room; the beetle and the fly, which are wider than a cell, as soon as any part of them is.
    for (const event of inside) expect((event.cell % ground.cols) + (event.kind === 'fly' ? 1 : 0), event.kind).toBeGreaterThanOrEqual(MOUTH[MOUTH.length - 1] + 1)
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

  it('an ant that is stuck is seen for a while before the raid is over, and one that goes home ends the raid at once', () => {
    const raid = raidOn(nest('..........', '....m.....'), ['ant'])
    while (raid.invaders[0].state !== 'stuck') stepRaid(raid)
    const stuckAt = raid.time
    playOut(raid)
    expect(raid.time - stuckAt).toBeGreaterThanOrEqual(SEEN_FOR - TICK - 1e-9)
    expect(raid.time - stuckAt).toBeLessThan(SEEN_FOR + 2 * TICK)
    const home = raidOn(nest(), ['ant'])
    while (home.invaders[0].state !== 'home') stepRaid(home)
    expect(home.over).toBe(true)
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
    // A stone and sand hold one beetle; an ant climbs the stone and walks over them.
    const dry = playOut(raidOn(nest('..........', '....os....'), ['ant', 'beetle']))
    expect(dry.invaders[0].acted).toBe(true)
    expect(dry.invaders[1].acted).toBe(false)
    // With the sand in front it does not get up: a face of sand, one cell high, is not climbed.
    const sandy = playOut(raidOn(nest('..........', '....so....'), ['ant', 'beetle']))
    expect(sandy.invaders[0].acted).toBe(false)
    expect(sandy.acts).toBe(0)
    // With mud in the wall the ant that walks over it sticks on the mud.
    const bound = playOut(raidOn(nest('..........', '....oms...'), ['ant', 'beetle']))
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

describe('a stone that is shoved rolls', () => {
  /** A tunnel two cells high from the shaft to a room at its far end; `floor` is the bottom row of both. */
  const way = (floor: string) => ['X.XXXXXXXXXXXXXXXXXX', '#.##################', '#.##################', '#.##########.......#', '#..................#', `#${floor}#`, '####################', 'XXXXXXXXXXXXXXXXXXXX']
  const rollOn = (floor: string) => {
    // Two rows: the beetle cannot step over a stone under a roof two cells high, so it leans.
    const raid = raidOn(way(floor), ['beetle'])
    const events: RaidEvent[] = []
    while (!raid.over) {
      stepRaid(raid)
      events.push(...raid.events)
      raid.events.length = 0
    }
    return { raid, events, row: toPicture(raid.ground)[5] }
  }

  it('ahead of the push, by itself, until the ground stops it', () => {
    const { events, row, raid } = rollOn('.....o............')
    expect(row).toBe('#.................o#')
    expect(kinds(events, 'rolled').length).toBe(11)
    expect(kinds(events, 'stopped')).toEqual([{ type: 'stopped', cell: 5 * COLS + 18, by: EARTH }])
    expect(raid.rolling).toEqual([])
    // It rolled faster than the beetle walks.
    expect(ROLL).toBeLessThan(1 / 5.5)
  })

  it('into sand, which stops it; into mud, which holds it; and into another stone, which rolls on in its place', () => {
    const sand = rollOn('.....o.....s......')
    expect(kinds(sand.events, 'stopped')[0]).toEqual({ type: 'stopped', cell: 5 * COLS + 11, by: SAND })
    const mud = rollOn('.....o.....m......')
    expect(kinds(mud.events, 'stopped')[0]).toEqual({ type: 'stopped', cell: 5 * COLS + 11, by: MUD })
    // Held by the mud it touches, it is bedded and rolls no more.
    expect(mud.row.slice(11, 13)).toBe('om')
    const stone = rollOn('.....o.....o......')
    expect(kinds(stone.events, 'stopped')[0]).toEqual({ type: 'stopped', cell: 5 * COLS + 11, by: STONE })
    // The first stopped where it struck and the second rolled on to the end; the beetle came on, shoved the first
    // again, and it rolled up behind the second.
    expect(kinds(stone.events, 'stopped').map((e) => (e as Extract<RaidEvent, { type: 'stopped' }>).by)).toEqual([STONE, EARTH, STONE])
    expect(stone.row).toBe('#................oo#')
  })

  it('plays the same way twice, and the raid is not over while a stone still rolls', () => {
    const one = rollOn('.....o............'), two = rollOn('.....o............')
    expect(one.raid.time).toBe(two.raid.time)
    expect(equal(one.raid.ground, two.raid.ground)).toBe(true)
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

/** Plays a raid to its end, looking at every tick. */
const watch = (raid: Raid, look: (raid: Raid) => void, events: RaidEvent[] = []) => {
  while (!raid.over) {
    stepRaid(raid)
    events.push(...raid.events)
    raid.events.length = 0
    look(raid)
  }
  return events
}
/** The invaders in each chamber at this tick: those any part of whom is in it and who are going to leave it by themselves. */
const inRooms = (raid: Raid) => {
  const rooms = new Map<number, number[]>()
  for (const invader of raid.invaders) {
    if (invader.cell < 0 || invader.kind === 'dungFly' || ['home', 'held', 'stuck', 'coming'].includes(invader.state)) continue
    for (const place of invader.along > 0 ? [invader.cell, invader.from] : [invader.cell]) {
      const room = roomOf(raid.ground, gaitOf(invader), place, raid.rooms)
      if (room !== 0 && !rooms.get(room)?.includes(invader.id)) rooms.set(room, [...(rooms.get(room) ?? []), invader.id])
    }
  }
  return rooms
}

describe('one invader in a chamber at a time', () => {
  it('a file of three all get in and do their act, one after the other, the others waiting at the door a body apart', () => {
    const raid = raidOn(nest(), ['ant', 'ant', 'ant'])
    let mostActing = 0, mostInside = 0, waited = 0
    const events = watch(raid, () => {
      mostActing = Math.max(mostActing, raid.invaders.filter((i) => i.state === 'acting').length)
      for (const ids of inRooms(raid).values()) mostInside = Math.max(mostInside, ids.length)
      const waiting = raid.invaders.filter((i) => i.state === 'waiting')
      waited = Math.max(waited, waiting.length)
      // Nobody who waits is in the chamber, and no two who wait stand within a body of each other.
      for (const one of waiting) expect(roomOf(raid.ground, 'ant', one.cell, raid.rooms)).toBe(0)
      for (const a of waiting) for (const b of waiting) {
        if (a.id < b.id) expect(Math.abs((a.cell % COLS) - (b.cell % COLS)) + Math.abs(Math.floor(a.cell / COLS) - Math.floor(b.cell / COLS))).toBeGreaterThanOrEqual(QUEUE_GAP - 1)
      }
    })
    expect(raid.acts).toBe(3)
    expect(mostActing).toBe(1)
    expect(mostInside).toBe(1)
    expect(waited).toBe(2)
    expect([...new Set(kinds(events, 'waits').map((e) => (e as { id: number }).id))]).toEqual([1, 2])
    // Three acts one after the other take three times as long as one.
    expect(raid.time).toBeGreaterThan(3 * HABITS.ant.act.seconds)
    expect(raid.time).toBeLessThan(LONGEST)
  })

  it('the next goes in when the one before has left, and each kind waits for any other', () => {
    for (const party of [['beetle', 'ant'], ['ant', 'beetle'], ['beetle', 'beetle', 'beetle']] as Party[]) {
      const raid = raidOn(nest(), party)
      let most = 0
      watch(raid, () => {
        for (const ids of inRooms(raid).values()) most = Math.max(most, ids.length)
      })
      expect(most, party.join()).toBe(1)
      expect(raid.acts, party.join()).toBe(party.length)
    }
  })

  it('holds at every place of the order, on the game own ground with a hall dug into it, and every raid still ends by itself', () => {
    for (const seed of [1, 2, 3]) {
      const ground = generate(seed)
      for (let y = 3; y <= 6; y++) for (const x of MOUTH) put(ground, x, y, OPEN)
      for (let y = 4; y <= 6; y++) for (let x = 22; x <= 33; x++) put(ground, x, y, OPEN)
      settle(ground)
      for (const place of LADDER) {
        const raid = callRaid(ground, partyAt(place, 0))
        watch(raid, () => {
          expect(raid.invaders.filter((i) => i.state === 'acting' && i.kind !== 'dungFly').length, `${seed} ${place}`).toBeLessThanOrEqual(1)
          for (const ids of inRooms(raid).values()) expect(ids.length, `${seed} ${place} at ${raid.time.toFixed(2)}`).toBeLessThanOrEqual(1)
        })
        expect(raid.time, `${seed} ${place}`).toBeLessThan(LONGEST)
      }
    }
  })

  it('two chambers in a row: one bound for the further chamber waits at the door of the nearer while someone is at its act there, and no two stand in one cell', () => {
    const row = ['X.XXXXXXXXXXXXXXXXXXXXXXXXX', '#.#########################', '#.......................###', '#.......................###', '######......######......###', '###########################', 'XXXXXXXXXXXXXXXXXXXXXXXXXXX']
    const raid = raidOn(row, ['ant', 'ant', 'ant', 'ant'])
    let together = 0, intruding = 0
    const events = watch(raid, () => {
      const standing = raid.invaders.filter((i) => i.cell >= 0 && i.along === 0 && (i.state === 'going' || i.state === 'waiting'))
      for (const a of standing) for (const b of standing) if (a.id < b.id && a.cell === b.cell) together++
      // While one is at its act in a chamber nobody else comes into it to stay: one on its way home from the
      // further chamber passes through, which is the only way out.
      for (const acting of raid.invaders.filter((i) => i.state === 'acting')) {
        const room = roomOf(raid.ground, 'ant', acting.cell, raid.rooms)
        for (const other of standing) if (roomOf(raid.ground, 'ant', other.cell, raid.rooms) === room) intruding++
      }
      expect(raid.invaders.filter((i) => i.state === 'acting').length).toBeLessThanOrEqual(2)
    })
    expect(together).toBe(0)
    expect(intruding).toBe(0)
    expect(raid.acts).toBe(4)
    expect(kinds(events, 'waits').length).toBeGreaterThan(0)
    expect(raid.time).toBeLessThan(LONGEST)
  })

  it('nobody who waits comes to rest in front of a machine: where a machine stands at the door, they wait before it', () => {
    // The catapult stands in the last two cells of the tunnel, right at the door of the room.
    const ground = fromPicture(nest())
    const machine = [2 * COLS + 9, 2 * COLS + 10, 3 * COLS + 9, 3 * COLS + 10]
    for (const party of [['ant', 'ant', 'ant'], ['beetle', 'beetle'], ['beetle', 'ant', 'ant']] as Party[]) {
      const raid = callRaid(ground, party, mouthOf(nest()), machine)
      let waited = 0
      watch(raid, () => {
        for (const one of raid.invaders) {
          if (one.state !== 'waiting' || one.cell < 0) continue
          waited++
          expect(machine, `${party.join()} at ${raid.time.toFixed(2)}`).not.toContain(one.cell)
        }
        for (const ids of inRooms(raid).values()) expect(ids.length).toBeLessThanOrEqual(1)
      })
      expect(waited, party.join()).toBeGreaterThan(0)
      expect(raid.acts, party.join()).toBe(party.length)
    }
  })

  it('one that is held in a chamber and is not at its act keeps nobody out: stuck in mud, rolled up in a mud ball, gummed, or buried', () => {
    // A cell of mud in the floor just inside the door: the first ant sticks there, the second walks over its back and does its act.
    const muddy = nest()
    muddy[5] = '###########m########'
    const file = playOut(raidOn(muddy, ['ant', 'ant', 'ant']))
    expect(states(file).filter((state) => state === 'stuck').length).toBe(1)
    expect(file.acts).toBe(2)
    // An ant rolled up in a mud ball where it lay at its act, and a fly gummed where it hung: the next goes in past them.
    for (const [party, shot] of [[['ant', 'ant'], 'mud'], [['ant', 'ant'], 'sand']] as [Party, 'mud' | 'sand'][]) {
      const raid = raidOn(nest(), party)
      while (!raid.over && raid.invaders[0].state !== 'acting') stepRaid(raid)
      hit(raid, 0, shot)
      const hitAt = raid.time
      while (!raid.over && raid.invaders[1].state !== 'acting') stepRaid(raid)
      expect(raid.invaders[1].state, shot).toBe('acting')
      // It did not wait for the first to be gone: it was at its act within the time it takes to walk in.
      expect(raid.time - hitAt, shot).toBeLessThan(3)
    }
  })

  it('nobody waits behind one who came later, so no two ever wait for each other', () => {
    // Two rooms, one either side of the shaft's foot: the file splits, and nobody is left waiting when the raid is over.
    const picture = [
      'XXXXXXXXX.XXXXXXXXX',
      '#########.#########',
      '#########.#########',
      '#......##.##......#',
      '#......##.##......#',
      '#.................#',
      '###################',
      'XXXXXXXXXXXXXXXXXXX',
    ]
    const raid = playOut(raidOn(picture, ['ant', 'ant', 'ant', 'ant']))
    expect(raid.time).toBeLessThan(LONGEST)
    expect(raid.acts).toBe(4)
  })
})

describe('a dung beetle and its ball', () => {
  /**
   * A shaft three wide, a way to the right and a room at its end. `rows` are the rows of the way, top first, the
   * last two of them the tunnel a beetle walks: a way three rows high and clear is itself a room.
   */
  const hall = (rows: string[]) => {
    const picture = ['XX...XXXXXXXXXXXXXXXXXXX', '##...###################']
    for (let n = 0; n < 3 - rows.length; n++) picture.push('##...###########......##')
    rows.forEach((row, n) => picture.push(`##...${row}${n < rows.length - 3 ? '######' : '......'}##`))
    picture.push('########################', 'XXXXXXXXXXXXXXXXXXXXXXXX')
    return picture
  }
  const WIDE = 24
  const EARTHS = '###########', CLEAR = '...........'
  const dungRaid = (picture: string[], party: Party = ['dungBeetle']) => callRaid(fromPicture(picture), party, [2, 3, 4])
  const mudIn = (raid: Raid) => raid.ground.cells.filter((kind) => kind === MUD).length

  it('rolls its ball down a mouth three cells wide into a room three cells high, does its act, and takes longer than a beetle', () => {
    const open = hall([CLEAR, CLEAR, CLEAR])
    const raid = dungRaid(open)
    const events = watch(raid, () => {})
    expect(raid.acts).toBe(1)
    expect(kinds(events, 'widened')).toEqual([])
    expect(raid.invaders[0].ball).toBe(3)
    const beetle = playOut(dungRaid(open, ['beetle']))
    expect(raid.time).toBeGreaterThan(beetle.time)
  })

  it('digs the way wider where earth makes it too narrow for the ball: earth is no wall to it, and only slows it', () => {
    const low = hall([EARTHS, CLEAR, CLEAR])
    const built = fromPicture(low), before = clone(built)
    const raid = callRaid(built, ['dungBeetle'], [2, 3, 4])
    const events = watch(raid, () => {})
    const widened = kinds(events, 'widened') as Extract<RaidEvent, { type: 'widened' }>[]
    expect(widened.length).toBeGreaterThanOrEqual(11)
    // Every cell it dug was earth, in the row over the tunnel.
    for (const event of widened) for (const cell of event.cells) expect(at(before, cell % WIDE, Math.floor(cell / WIDE))).toBe(EARTH)
    expect(raid.acts).toBe(1)
    expect(raid.time).toBeGreaterThan(11 * DIG)
    // The nest as built is not touched: what it dug, it dug in the copy.
    expect(equal(built, before)).toBe(true)
    expect(equal(raid.ground, before)).toBe(false)
    // A crawl one cell high in earth is dug out the same way.
    const crawl = playOut(dungRaid(hall([EARTHS, '....###....', CLEAR])))
    expect(crawl.acts).toBe(1)
  })

  it('breaks a wall one cell thick and is stopped by a wall two cells thick and bound with mud, where it sits down and then rolls home', () => {
    for (const lump of ['s', 'm', 'o']) {
      const thin = playOut(dungRaid(hall([EARTHS, CLEAR, `....${lump}......`])))
      expect(thin.acts, lump).toBe(1)
    }
    const bound = dungRaid(hall([EARTHS, CLEAR, '....mm.....']))
    const events = watch(bound, () => {})
    expect(bound.acts).toBe(0)
    expect(kinds(events, 'givesUp').length).toBe(1)
    expect(kinds(events, 'gave')).toEqual([])
    expect(mudIn(bound)).toBe(2)
    expect(judge(endOf(bound))).toBe('well')
    // It does not roll its ball up over the wall through the gap that is left for the air: lumps are a wall to it.
    expect(bound.invaders[0].trail.every((cell) => cell % WIDE < 9)).toBe(true)
    // It keeps its ball, and it ends at the foot of the shaft it cannot climb.
    expect(bound.invaders[0].ball).toBe(3)
    expect(bound.invaders[0].state).toBe('held')
  })

  it('pushes 6 however many balls lean on the wall: balls do not push together', () => {
    for (const wall of ['....mm.....', '....mo.....', '....smo....']) {
      const picture = hall([EARTHS, CLEAR, wall])
      const before = fromPicture(picture)
      const raid = dungRaid(picture, ['dungBeetle', 'dungBeetle', 'dungBeetle'])
      const events = watch(raid, () => {})
      expect(raid.acts, wall).toBe(0)
      expect(kinds(events, 'gave'), wall).toEqual([])
      expect(toPicture(raid.ground)[4], wall).toBe(toPicture(before)[4])
    }
    // Plain beetles still push together, three of them 9: the wall that holds 8 gives to three and not to two.
    const three = playOut(dungRaid(hall([EARTHS, CLEAR, '....mo.....']), ['beetle', 'beetle', 'beetle']))
    expect(three.acts).toBeGreaterThan(0)
    const two = playOut(dungRaid(hall([EARTHS, CLEAR, '....mo.....']), ['beetle', 'beetle']))
    expect(two.acts).toBe(0)
  })

  it('meets lumps set under the mouth as a wall like any other: it is not left on the grass for one lump in a column', () => {
    // One lump of mud stuck in the top of the shaft's left column: mud with earth behind it, which the ball digs.
    const one = hall([CLEAR, CLEAR, CLEAR])
    one[1] = '##m..###################'
    const raid = dungRaid(one)
    const events = watch(raid, () => {})
    expect(kinds(events, 'leftBall')).toEqual([])
    expect(kinds(events, 'widened').length).toBeGreaterThan(0)
    expect(raid.invaders[0].ball).toBe(3)
    expect(raid.acts).toBe(1)
    expect(mudIn(raid)).toBe(0)
    // On the game's own ground the army keeps its five balls for one lump of mud in the mouth's left column.
    const ground = generate(1)
    for (let y = 1; y <= 3; y++) for (let x = 22; x <= 31; x++) put(ground, x, y, OPEN)
    put(ground, MOUTH[0], 1, MUD)
    settle(ground)
    expect(at(ground, MOUTH[0], 1)).toBe(MUD)
    const army = callRaid(ground, PARTY['great-raid'])
    const heard = watch(army, () => {})
    expect(kinds(heard, 'leftBall')).toEqual([])
    expect(army.acts).toBe(6)
  })

  it('leaves the ball on the grass only where the lumps under the mouth hold or a stone there jams it, and comes in without it', () => {
    // Two lumps of mud across the left and the middle column hold 6: the ball's push is not greater.
    const plug = hall([CLEAR, CLEAR, CLEAR])
    plug[1] = '##mm.###################'
    const held = dungRaid(plug)
    const events = watch(held, () => {})
    expect(kinds(events, 'leftBall')).toEqual([{ type: 'leftBall', id: 0, cell: -1 }])
    expect(held.invaders[0].ball).toBe(0)
    expect(held.invaders[0].left).toBe(3)
    expect(mudIn(held)).toBe(2)
    expect(held.acts).toBe(1)
    // A stone on the floor of the shaft's left column: the ball can neither dig nor shove it, heaves, and is left at the mouth.
    const stone = hall([CLEAR, CLEAR, CLEAR])
    stone[4] = `##o..${CLEAR}......##`
    const jammed = dungRaid(stone)
    const more = watch(jammed, () => {})
    expect(kinds(more, 'strain').length).toBeGreaterThan(0)
    expect(kinds(more, 'leftBall').length).toBe(1)
    expect(jammed.invaders[0].left).toBe(3)
    expect(jammed.balls).toEqual([])
    expect(jammed.acts).toBe(1)
    expect(toPicture(jammed.ground)[4].slice(0, 5)).toBe('##o..')
  })

  it('digs sand and mud that have earth or rock behind them', () => {
    // A lump of mud on the floor with a step of earth right behind it.
    const raid = dungRaid(hall([EARTHS, CLEAR, '....m#.....']))
    const events = watch(raid, () => {})
    expect(kinds(events, 'widened').length).toBeGreaterThan(0)
    expect(mudIn(raid)).toBe(0)
    expect(raid.acts).toBe(1)
  })

  it('is jammed by a stone it can neither dig nor shove, heaves at it, and then leaves the ball and walks on as a plain beetle', () => {
    // A stone bedded in mud in the roof of a way two cells high: it holds more than the ball pushes.
    const raid = dungRaid(hall(['###mom#####', CLEAR, CLEAR]))
    const events = watch(raid, () => {})
    const left = kinds(events, 'leftBall') as Extract<RaidEvent, { type: 'leftBall' }>[]
    expect(left.length).toBe(1)
    expect(raid.balls.length).toBe(1)
    // The ball lies before the stone's bed, in the last place it fitted.
    expect(raid.balls[0].cell % WIDE).toBe(7)
    expect(raid.invaders[0].ball).toBe(0)
    // The beetle went on under it without the ball and did its act.
    expect(raid.acts).toBe(1)
    expect(at(raid.ground, 9, 2)).toBe(STONE)
    expect(mudIn(raid)).toBe(2)
    // It heaved first.
    const strain = events.findIndex((e) => e.type === 'strain'), gone = events.findIndex((e) => e.type === 'leftBall')
    expect(strain).toBeGreaterThanOrEqual(0)
    expect(gone).toBeGreaterThan(strain)
  })

  it('does not turn a corner narrower than its ball: at a pit one cell wide in the rock the ball stays up and the beetle goes down alone', () => {
    const corner = [
      'XX...XXXXXXXXXXX',
      '##...###########',
      '##...###########',
      '##...###########',
      '##.........#####',
      '##.........#####',
      '#########X.X####',
      '#########X.X####',
      '#########X.....#',
      '#########X.....#',
      '#########X.....#',
      '################',
      'XXXXXXXXXXXXXXXX',
    ]
    const raid = callRaid(fromPicture(corner), ['dungBeetle'], [2, 3, 4])
    const events = watch(raid, () => {})
    expect(kinds(events, 'leftBall').length).toBe(1)
    // The ball lies at the top of the pit, on the floor of the way above it.
    expect(Math.floor(raid.balls[0].cell / 16)).toBe(5)
    expect(raid.invaders[0].ball).toBe(0)
    expect(raid.acts).toBe(1)
    // The same pit in earth is dug as wide as the ball, and the ball goes down it.
    const soft = callRaid(fromPicture(corner.map((row, y) => (y >= 6 && y <= 10 ? row.replaceAll('X', '#') : row))), ['dungBeetle'], [2, 3, 4])
    const softEvents = watch(soft, () => {})
    expect(kinds(softEvents, 'leftBall')).toEqual([])
    expect(kinds(softEvents, 'widened').length).toBeGreaterThan(0)
    expect(soft.invaders[0].ball).toBe(3)
    expect(soft.acts).toBe(1)
  })

  it('leaves its ball on the grass where the mouth is too narrow for it, and comes in as a plain beetle', () => {
    const narrow = ['XXX.XXXXXXXXXXXX', '###.############', '###.......######', '###.......######', '####......######', '################', 'XXXXXXXXXXXXXXXX']
    const raid = callRaid(fromPicture(narrow), ['dungBeetle'], [3])
    const events = watch(raid, () => {})
    expect(kinds(events, 'leftBall')).toEqual([{ type: 'leftBall', id: 0, cell: -1 }])
    expect(raid.balls).toEqual([])
    expect(raid.invaders[0].ball).toBe(0)
  })

  it('answers each shot in its own way: sand makes the ball a size bigger, mud takes the ball from it, a stone knocks it back', () => {
    const tunnel = hall([EARTHS, EARTHS, CLEAR, CLEAR])
    const until = (raid: Raid, x: number) => { while (!raid.over && raid.invaders[0].cell % WIDE < x) stepRaid(raid) }
    const dugBy = (raid: Raid) => {
      const events = watch(raid, () => {})
      return (kinds(events, 'widened') as Extract<RaidEvent, { type: 'widened' }>[]).reduce((sum, event) => sum + event.cells.length, 0)
    }
    const plain = dugBy(dungRaid(tunnel))
    const sand = dungRaid(tunnel)
    until(sand, 6)
    hit(sand, 0, 'sand')
    expect(sand.invaders[0].ball).toBe(4)
    hit(sand, 0, 'sand')
    expect(sand.invaders[0].ball).toBe(4)
    // A ball a size bigger needs a way a cell higher, and digs more earth to get it.
    expect(dugBy(sand)).toBeGreaterThan(plain)
    const mud = dungRaid(tunnel)
    until(mud, 8)
    hit(mud, 0, 'mud')
    expect(mud.invaders[0].ball).toBe(0)
    expect(mud.balls.length).toBe(1)
    playOut(mud)
    expect(mud.acts).toBe(1)
    const stone = dungRaid(tunnel)
    until(stone, 12)
    hit(stone, 0, 'stone')
    // Back to the end of the tunnel behind it: the foot of the shaft. From there the ball rolls out, and that beetle is home.
    expect(stone.invaders[0].state).toBe('home')
    expect(stone.invaders[0].acted).toBe(false)
    playOut(stone)
    expect(stone.acts).toBe(0)
  })
})

describe('the great raid', () => {
  const GREAT = partyAt('great-raid', 0)
  /** The game's own ground with a hall three cells high from the shaft to a room: the dung fly flies straight in. */
  const openNest = (seed = 1) => {
    const ground = generate(seed)
    for (let y = 3; y <= 6; y++) for (const x of MOUTH) put(ground, x, y, OPEN)
    for (let y = 4; y <= 6; y++) for (let x = 22; x <= 34; x++) put(ground, x, y, OPEN)
    settle(ground)
    return ground
  }

  it('is the dung fly and five dung beetles with their balls, and the fly comes first', () => {
    expect(GREAT).toEqual(['dungFly', 'dungBeetle', 'dungBeetle', 'dungBeetle', 'dungBeetle', 'dungBeetle'])
    const raid = callRaid(openNest(), GREAT)
    expect(raid.invaders.map((i) => i.ball)).toEqual([0, 3, 3, 3, 3, 3])
  })

  it('with nothing in its way gets in: the fly leads from the air, and the dung beetles do their act one at a time under it', () => {
    const raid = callRaid(openNest(), GREAT)
    let led = false, most = 0
    watch(raid, () => {
      led ||= raid.led
      most = Math.max(most, raid.invaders.filter((i) => i.state === 'acting' && i.kind === 'dungBeetle').length)
    })
    expect(led).toBe(true)
    expect(most).toBe(1)
    expect(raid.acts).toBe(6)
    expect(judge(endOf(raid))).toBe('not-well')
    expect(raid.time).toBeLessThan(LONGEST)
  })

  it('with the fly brought down, every dung beetle loses its way within a few steps and rolls home, in bounded time', () => {
    const raid = callRaid(openNest(), GREAT)
    while (!raid.over && raid.invaders[0].state !== 'acting') stepRaid(raid)
    expect(raid.invaders[0].state).toBe('acting')
    const downAt = raid.time
    raid.events.length = 0
    hit(raid, 0, 'mud')
    expect(raid.lost).toBe(true)
    expect(raid.events.some((e) => e.type === 'lost')).toBe(true)
    watch(raid, () => expect(raid.led).toBe(false))
    // Nobody finishes an act, the fly included.
    expect(raid.acts).toBe(0)
    for (const invader of raid.invaders) expect(['home', 'held']).toContain(invader.state)
    expect(raid.time - downAt).toBeLessThan(30)
    expect(judge(endOf(raid))).toBe('well')
  })

  it('while the fly is up, a ball digs on through a wall of mud that would have held it, and with no fly it is held', () => {
    const walled = () => {
      const ground = generate(1)
      for (let y = 3; y <= 6; y++) for (const x of MOUTH) put(ground, x, y, OPEN)
      for (let y = 1; y <= 8; y++) for (let x = 15; x <= 38; x++) if (!MOUTH.includes(x) || y > 2) put(ground, x, y, EARTH)
      for (let y = 3; y <= 6; y++) for (const x of MOUTH) put(ground, x, y, OPEN)
      // A tunnel two cells high to a room, and in it a wall two cells thick, bound with mud, with a gap over it for the air.
      for (let y = 5; y <= 6; y++) for (let x = 22; x <= 29; x++) put(ground, x, y, OPEN)
      for (let y = 4; y <= 6; y++) for (let x = 30; x <= 35; x++) put(ground, x, y, OPEN)
      for (const x of [26, 27]) put(ground, x, 6, MUD)
      settle(ground)
      return ground
    }
    const alone = playOut(callRaid(walled(), ['dungBeetle']))
    expect(alone.acts).toBe(0)
    expect(alone.ground.cells.filter((kind) => kind === MUD).length).toBe(callRaid(walled(), []).ground.cells.filter((kind) => kind === MUD).length)
    const raid = callRaid(walled(), GREAT)
    const events = watch(raid, () => {})
    // The fly cannot fly over the wall: it peers, and while it hovers there the first ball digs through.
    expect(kinds(events, 'widened').length).toBeGreaterThan(0)
    expect(raid.acts).toBeGreaterThan(0)
  })

  it('leaves the ground as built, cell for cell, turned back or not', () => {
    for (const seed of [1, 2, 3]) {
      const built = openNest(seed), before = clone(built)
      const raid = callRaid(built, GREAT)
      playOut(raid)
      expect(equal(built, before), `${seed}`).toBe(true)
      const turned = callRaid(built, GREAT)
      while (!turned.over && turned.invaders[0].cell < 0) stepRaid(turned)
      for (let n = 0; n < 40; n++) stepRaid(turned)
      hit(turned, 0, 'mud')
      playOut(turned)
      expect(equal(built, before), `${seed} turned`).toBe(true)
    }
  })

  it('plays the same way twice, invader for invader, ball for ball', () => {
    const one = playOut(callRaid(openNest(2), GREAT)), two = playOut(callRaid(openNest(2), GREAT))
    expect(one.time).toBe(two.time)
    expect(one.invaders.map((i) => [i.state, i.cell, i.ball])).toEqual(two.invaders.map((i) => [i.state, i.cell, i.ball]))
    expect(equal(one.ground, two.ground)).toBe(true)
  })
})

describe('how long a raid takes', () => {
  /** A kingdom of one chamber on the game's own ground: a hall off the shaft, or a room at the end of a tunnel. */
  const oneChamber = (seed: number, shape: 'hall' | 'far') => {
    const ground = generate(seed)
    for (let y = 3; y <= 6; y++) for (const x of MOUTH) put(ground, x, y, OPEN)
    if (shape === 'hall') for (let y = 4; y <= 6; y++) for (let x = 22; x <= 32; x++) put(ground, x, y, OPEN)
    else {
      for (let y = 5; y <= 6; y++) for (let x = 22; x <= 29; x++) put(ground, x, y, OPEN)
      for (let y = 4; y <= 6; y++) for (let x = 30; x <= 37; x++) put(ground, x, y, OPEN)
    }
    settle(ground)
    return ground
  }

  it('is under 45 seconds for every party the order and the round can lay out, on a kingdom of one chamber with nothing in the way', () => {
    const longest: number[] = []
    for (const seed of [1, 2, 3]) for (const shape of ['hall', 'far'] as const) {
      const ground = oneChamber(seed, shape)
      expect(callRaid(ground, []).chambersWhenCalled).toBe(1)
      for (const party of [...Object.values(PARTY), ...ROUND]) {
        const raid = playOut(callRaid(ground, party))
        expect(raid.time, `${seed} ${shape} ${party.join()}`).toBeLessThan(45)
        longest.push(raid.time)
      }
    }
    // The longest are long because every one of a large party gets in and does its act, one at a time.
    expect(Math.max(...longest)).toBeGreaterThan(30)
  })

  it('gives the first of a kind its act in full and a later one of the same kind a short one', () => {
    const raid = raidOn(nest(), ['ant', 'beetle', 'ant'])
    const began: Record<number, number> = {}, ended: Record<number, number> = {}
    while (!raid.over) {
      stepRaid(raid)
      for (const invader of raid.invaders) if (invader.state === 'acting' && began[invader.id] === undefined) began[invader.id] = raid.time
      for (const event of raid.events) if (event.type === 'acted') ended[event.id] = raid.time
      raid.events.length = 0
    }
    expect(ended[0] - began[0]).toBeCloseTo(HABITS.ant.act.seconds, 0)
    expect(ended[1] - began[1]).toBeCloseTo(HABITS.beetle.act.seconds, 0)
    expect(ended[2] - began[2]).toBeCloseTo(HABITS.ant.act.again, 0)
    expect(HABITS.ant.act.again).toBeLessThan(HABITS.ant.act.seconds / 2)
  })
})

