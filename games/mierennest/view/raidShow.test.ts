import { describe, expect, it } from 'vitest'
import { BODY, partyFile } from '../camp'
import { LADDER } from '../config'
import { CELL, EARTH, MOUTH, OPEN, STONE, at, fromPicture, put, settle } from '../ground'
import type { Guidance } from '../guidance'
import { Kingdom } from '../kingdom'
import { partyAt } from '../order'
import { callRaid, hit, playOut, stepRaid } from '../raid'
import { queenSeat, workerSpots } from '../residents'
import { freshGame, type Game } from '../save'
import { POSES } from './creatures'
import { DRAWS, ToyDisplay, drawsOf, type Item } from './display'
import { GRASS_Y, GROUND } from './layout'
import { DUCKS, FURNISHED, MOUTH_STEP, PLAYED_BY, RAID_POSES, covers, invaderAt, invaderPose, roomFloor, showCarriedOut, showFurnishings, showMachine, showRaid, showShot, shownBox, shownFace } from './raidShow'
import { THING_SIZE } from './things'

const DRAW_BUDGET = 80

/** A kingdom of eight rooms off two halls, with both machines, at the place of the largest party this build plays. */
function fullKingdom(): Game {
  const game = freshGame(null, 1), g = game.ground
  for (let y = 1; y < g.rows - 1; y++) for (let x = 0; x < g.cols; x++) put(g, x, y, EARTH)
  for (let y = 1; y <= 15; y++) for (const x of MOUTH) put(g, x, y, OPEN)
  for (const [row, hall] of [[5, 8], [12, 15]]) {
    for (let x = 1; x < g.cols - 1; x++) for (const y of [hall, hall + 1]) put(g, x, y, OPEN)
    for (const left of [1, 9, 23, 31]) for (let y = row; y < row + 3; y++) for (let x = left; x < left + 7; x++) put(g, x, y, OPEN)
  }
  put(g, 16, 9, STONE)
  put(g, 26, 9, 2)
  settle(g)
  game.ant = { x: 17, y: 9 }
  game.position = 'full-camp'
  game.shown.push('ant', 'beetle', 'fly', 'catapult', 'cannon')
  game.machines.push({ kind: 'cannon', x: 30, y: 9, facing: -1, load: 'stone' }, { kind: 'catapult', x: 12, y: 9, facing: 1, load: 'mud' })
  return game
}

describe('the poses of a raid', () => {
  it('every pose a raid can name is one the painters have', () => {
    for (const who of ['raider', 'beetle', 'fly', 'dungBeetle', 'dungFly'] as const) for (const pose of RAID_POSES[who]) expect(POSES[who], `${who}/${pose}`).toContain(pose)
    for (const [who, pose] of Object.entries(DUCKS)) expect(POSES[who as 'raider'], who).toContain(pose)
  })

  it('names only poses from its list, in every state, of every kind, at every moment', () => {
    const named: Record<string, Set<string>> = { raider: new Set(), beetle: new Set(), fly: new Set(), dungBeetle: new Set(), dungFly: new Set() }
    for (const place of ['full-camp', 'great-raid'] as const) {
      const raid = callRaid(fullKingdom().ground, partyAt(place, 0))
      for (let n = 0; !raid.over; n++) {
        stepRaid(raid)
        // The dung fly is brought down half way through, so the army's lost poses are named as well.
        if (place === 'great-raid' && n === 400) hit(raid, 0, 'mud')
        for (const invader of raid.invaders) named[PLAYED_BY[invader.kind]].add(invaderPose(invader, n / 20, raid.ground.cols))
        for (const one of showRaid(raid, partyAt(place, 0), n / 20)) if (one.who !== 'dungBall') named[one.who].add(one.pose)
      }
    }
    for (const who of ['raider', 'beetle', 'fly', 'dungBeetle', 'dungFly'] as const) {
      for (const pose of named[who]) expect([...RAID_POSES[who], ...POSES[who]], `${who}/${pose}`).toContain(pose)
      for (const pose of named[who]) expect(POSES[who], `${who}/${pose}`).toContain(pose)
      expect(named[who].size, who).toBeGreaterThanOrEqual(3)
    }
  })

  it('gives each kind a pose of its own for its act, and another for the end of it', () => {
    const acting = (kind: 'ant' | 'beetle' | 'fly', wait: number) => invaderPose({ kind, state: 'acting', wait, cell: 100, from: 100, lastShot: null } as never, 0, 40)
    const during = (['ant', 'beetle', 'fly'] as const).map((kind) => acting(kind, 5)), ending = (['ant', 'beetle', 'fly'] as const).map((kind) => acting(kind, 0.5))
    expect(new Set([...during, ...ending]).size).toBe(6)
  })
})

describe('where a raid is shown', () => {
  it('sits each invader in its place at the log, walks the next one to the mouth, and shows it in the nest where the raid has it', () => {
    const party = partyAt('mixed-party', 0)
    const raid = callRaid(fullKingdom().ground, party), file = partyFile(party)
    const start = showRaid(raid, party, 0)
    expect(start.length).toBe(party.length)
    // The first has set off; the others sit where they sat, and nobody is past the mouth.
    start.forEach((one, n) => {
      expect(one.x).toBeGreaterThanOrEqual(file[n].x - 0.001)
      expect(one.x).toBeLessThanOrEqual(MOUTH_STEP.x + 0.001)
      expect(one.y).toBeLessThanOrEqual(GRASS_Y)
      if (n > 0) expect([one.x, one.idle]).toEqual([file[n].x, true])
    })
    for (let n = 0; n < 200; n++) stepRaid(raid)
    const later = showRaid(raid, party, 10)
    const inNest = later.filter((one) => raid.invaders[one.id].cell >= 0 && raid.invaders[one.id].state !== 'home')
    expect(inNest.length).toBeGreaterThan(0)
    for (const one of inNest) {
      expect(one.y).toBeGreaterThan(GRASS_Y - CELL)
      expect(one.x).toBeGreaterThan(GROUND.x)
      expect(one.x).toBeLessThan(GROUND.x + GROUND.width)
    }
    playOut(raid)
    showRaid(raid, party, 60).forEach((one) => {
      if (raid.invaders[one.id].state === 'home') expect(one.x).toBe(file[one.id].x)
    })
  })

  it('draws an invader where the raid has it: in its place when it stands, and between its place and the next as it goes, never a place behind', () => {
    const party = ['ant', 'beetle', 'fly'] as const
    const raid = callRaid(fullKingdom().ground, party), cols = raid.ground.cols
    const feet = (kind: string, cell: number) => (kind === 'fly' ? GROUND.x + ((cell % cols) + 1) * CELL : GROUND.x + ((cell % cols) + 0.5) * CELL)
    let standing = 0, going = 0
    while (!raid.over) {
      stepRaid(raid)
      for (const invader of raid.invaders) {
        if (invader.cell < 0 || invader.state === 'home' || invader.state === 'coming') continue
        const at = invaderAt(invader, cols)
        const a = feet(invader.kind, invader.cell), b = feet(invader.kind, invader.toward)
        if (invader.along === 0) {
          expect(invader.toward).toBe(invader.cell)
          expect(at.x).toBeCloseTo(a, 6)
          standing++
        } else {
          expect(at.x).toBeGreaterThanOrEqual(Math.min(a, b) - 1e-6)
          expect(at.x).toBeLessThanOrEqual(Math.max(a, b) + 1e-6)
          if (a !== b) expect(Math.abs(at.x - a)).toBeGreaterThan(0)
          going++
        }
      }
    }
    expect(standing).toBeGreaterThan(100)
    expect(going).toBeGreaterThan(100)
  })

  it('seats one who rode a beetle to the log on the grass while that beetle is away, and on its back again when it is home', () => {
    const party = ['ant', 'beetle'] as const
    const [antSeat, beetleSeat] = partyFile(party)
    expect(antSeat.y).toBeLessThan(GRASS_Y)
    const raid = callRaid(fullKingdom().ground, party)
    expect(showRaid(raid, party, 0)[1].y).toBe(beetleSeat.y)
    let onGrass = false, onBack = false
    while (!raid.over) {
      stepRaid(raid)
      const [ant] = showRaid(raid, party, raid.time)
      if (raid.invaders[0].state !== 'home') continue
      const beetleHome = raid.invaders[1].state === 'home'
      expect(ant.y).toBe(beetleHome ? antSeat.y : GRASS_Y)
      if (beetleHome) onBack = true
      else onGrass = true
    }
    expect(onGrass).toBe(true)
    // In this kingdom the beetle cannot climb home, so the ant stays on the grass to the end.
    expect(onBack).toBe(raid.invaders[1].state === 'home')
  })

  it('shows a dung beetle behind its ball, and the ball where the raid has it', () => {
    const party = ['dungBeetle'] as const
    const raid = callRaid(fullKingdom().ground, party)
    let rolled = 0
    while (!raid.over) {
      stepRaid(raid)
      const shown = showRaid(raid, party, raid.time)
      const invader = raid.invaders[0]
      if (invader.cell < 0 || invader.state === 'home' || invader.ball === 0) continue
      const ball = shown.find((one) => one.who === 'dungBall')!, beetle = shown.find((one) => one.who === 'dungBeetle')!
      expect(ball).toBeDefined()
      // The ball is drawn before the beetle, and the two are never further apart than a ball and a beetle are long.
      expect(shown.indexOf(ball)).toBeLessThan(shown.indexOf(beetle))
      expect(Math.hypot(ball.x - beetle.x, ball.y - beetle.y)).toBeLessThan(BODY.dungBall.width / 2 + BODY.dungBeetle.width)
      if (invader.state === 'going' && invader.along > 0) rolled++
    }
    expect(rolled).toBeGreaterThan(20)
  })

  it('shows a machine empty in a raid until its own lump is back, and flung just after it fired', () => {
    const cannon = { kind: 'cannon', x: 30, y: 9, facing: -1, load: 'stone' } as const
    expect(showMachine(cannon, 0, 9)).toMatchObject({ load: 'stone', pose: 'ready', flip: true })
    expect(showMachine(cannon, 1.9, 0.1)).toMatchObject({ load: null, pose: 'fired' })
    expect(showMachine(cannon, 1, 1)).toMatchObject({ load: null, pose: 'ready' })
    expect(showMachine(cannon, 0, 0.1)).toMatchObject({ load: 'stone', pose: 'fired' })
  })

  it('flies a shot along its way from its first cell to its last', () => {
    const flying = { shot: 'mud', path: [100, 101, 102, 103], t: 0, length: 1, inRaid: true, machine: 0 } as const
    const a = showShot({ ...flying, path: [...flying.path] }, 40), b = showShot({ ...flying, path: [...flying.path], t: 1 }, 40)
    expect(b.x - a.x).toBe(3 * CELL)
    expect([a.effect, a.flip]).toEqual(['mudBall', false])
    expect(showShot({ ...flying, shot: 'sand', path: [103, 102, 101] }, 40)).toMatchObject({ effect: 'sandBlast', flip: true })
  })
})

describe('who is where in a raid', () => {
  /** A box on the stage. */
  type Box = { left: number; right: number; top: number; bottom: number }
  const overlap = (a: Box, b: Box) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 6 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 6
  /** The game's own ground with a way three cells wide down to a hall and a second room beyond a tunnel. */
  const nestOf = (seed: number) => {
    const game = freshGame(null, seed), g = game.ground
    for (let y = 3; y <= 6; y++) for (const x of MOUTH) put(g, x, y, OPEN)
    for (let y = 4; y <= 6; y++) for (let x = 22; x <= 34; x++) put(g, x, y, OPEN)
    for (let y = 5; y <= 6; y++) for (let x = 12; x <= 18; x++) put(g, x, y, OPEN)
    for (let y = 4; y <= 6; y++) for (let x = 5; x <= 11; x++) put(g, x, y, OPEN)
    settle(g)
    return game
  }

  it('at no tick lies an invader face under another invader, under the queen or under a worker, inside the nest', () => {
    let ducked = 0, ticks = 0
    for (const seed of [1, 2, 3]) {
      const game = nestOf(seed), k = new Kingdom(game)
      for (const place of LADDER) {
        const party = partyAt(place, 0)
        const raid = callRaid(game.ground, party)
        // The kingdom's own, where the display draws them while a raid runs, before every invader.
        const realm = k.toy.realm, seat = queenSeat(game.ground, realm.chambers, realm.queenRoom)!
        const stage = (cx: number, cy: number) => ({ x: GROUND.x + cx * CELL, y: GROUND.y + cy * CELL })
        const own: Box[] = [
          { left: stage(seat.x, 0).x - (BODY.queen.width / 2) * seat.fit, right: stage(seat.x, 0).x + (BODY.queen.width / 2) * seat.fit, top: stage(0, seat.y + 1).y - BODY.queen.height * seat.fit, bottom: stage(0, seat.y + 1).y },
          ...workerSpots(game.ground, realm.chambers, realm.queenRoom, realm.workers, true).map((spot) => ({
            left: stage(spot.x, 0).x - BODY.worker.width / 2, right: stage(spot.x, 0).x + BODY.worker.width / 2, top: stage(0, spot.y + 1).y - BODY.worker.height, bottom: stage(0, spot.y + 1).y,
          })),
        ]
        while (!raid.over) {
          stepRaid(raid)
          ticks++
          const shown = showRaid(raid, party, raid.time)
          shown.forEach((one, n) => {
            if (one.who === 'dungBall' || one.y <= GRASS_Y) return
            const face = shownFace(one)
            if (!face) {
              // It ducks: its face is hidden, in its own way, and only because somebody is over it.
              expect(one.pose).toBe(DUCKS[one.who])
              ducked++
              return
            }
            // Nobody drawn after it lies over its face.
            for (let m = n + 1; m < shown.length; m++) {
              if (shown[m].id === one.id || shown[m].y <= GRASS_Y) continue
              expect(covers(shownBox(shown[m]), face), `${seed} ${place} at ${raid.time.toFixed(2)}: ${shown[m].who} over ${one.who}`).toBe(false)
            }
          })
          // The queen and the workers are drawn before every invader: an invader lies over them, never under.
          // And one who does its act does it in the open: it does not duck, and it stands in nobody of the kingdom.
          for (const invader of raid.invaders) {
            if (invader.state !== 'acting' || invader.kind === 'dungFly') continue
            const one = shown.find((other) => other.id === invader.id && other.who !== 'dungBall')!
            expect(one.pose, `${seed} ${place} at ${raid.time.toFixed(2)}: ${one.who} acting`).not.toBe(DUCKS[one.who])
            for (const box of own) expect(overlap(shownBox(one), box), `${seed} ${place} at ${raid.time.toFixed(2)}: ${one.who} in the kingdom's own`).toBe(false)
          }
          // Two who wait never stand in each other.
          const waiting = shown.filter((one) => one.id >= 0 && raid.invaders[one.id].state === 'waiting' && one.who !== 'dungBall')
          for (let a = 0; a < waiting.length; a++) for (let b = a + 1; b < waiting.length; b++) {
            expect(overlap(shownBox(waiting[a]), shownBox(waiting[b])), `${seed} ${place} at ${raid.time.toFixed(2)}: two waiting`).toBe(false)
          }
        }
      }
    }
    // Ducking is for the moment somebody goes by, and for one who sits held under those who pass: on average fewer than one in three ticks has anybody ducking.
    expect(ticks).toBeGreaterThan(5000)
    expect(ducked / ticks).toBeLessThan(0.35)
  })

  it('gives one who waits at a door the fidget of its kind at the camp', () => {
    const game = nestOf(1), party = ['ant', 'beetle', 'fly'] as const
    const raid = callRaid(game.ground, ['ant', 'ant', 'beetle', 'fly'])
    const seen = new Set<string>()
    while (!raid.over) {
      stepRaid(raid)
      for (const one of showRaid(raid, ['ant', 'ant', 'beetle', 'fly'], raid.time)) {
        if (one.id >= 0 && raid.invaders[one.id].state === 'waiting' && one.pose !== DUCKS[one.who]) {
          expect(one.idle).toBe(true)
          seen.add(`${one.who}/${one.pose}`)
        }
      }
    }
    expect(party.length).toBe(3)
    expect([...seen].some((name) => name.startsWith('raider/pillow'))).toBe(true)
  })
})

describe('an ant held fast in the mud', () => {
  /** A shaft one cell wide below the mouth, onto a floor of mud, with a room off it. */
  const muddy = () => {
    const g = fromPicture([
      'XXX...XXXXXXXX',
      '###...########',
      '####.#########',
      '####.#########',
      '####......####',
      '####......####',
      '####......####',
      '####m#########',
      'XXXXXXXXXXXXXX',
    ])
    const raid = callRaid(g, ['ant'], [3, 4, 5])
    while (raid.invaders[0].state !== 'stuck') stepRaid(raid)
    return raid
  }

  it('stands on end where the way is one cell wide, and lies along a floor that has room', () => {
    const narrow = fromPicture(['XXX...XXXX', '###...####', '####.#####', '###m.m####', '####....##', '####....##', '####....##', '##########', 'XXXXXXXXXX'])
    const tight = callRaid(narrow, ['ant'], [3, 4, 5])
    while (!tight.over && tight.invaders[0].state !== 'stuck') stepRaid(tight)
    expect(tight.invaders[0].state).toBe('stuck')
    expect(Math.abs(showRaid(tight, ['ant'], 0)[0].turn)).toBeCloseTo(Math.PI / 2)
    const raid = muddy()
    expect(showRaid(raid, ['ant'], 0)[0].turn).toBe(0)
  })

  it('is carried out the way it came, through the open and never through the earth', () => {
    const raid = muddy(), g = raid.ground
    playOut(raid)
    const scene = { is: 'putBack' as const, t: 0, length: 4, cells: [], ground: g, held: [0] }
    for (let n = 0; n <= 200; n++) {
      scene.t = (4 * n) / 200
      const [one] = showCarriedOut(scene, raid, ['ant'])
      // Below the turf, that is: from the top of the mouth it steps out onto the grass.
      if (one.y > GROUND.y + CELL) {
        // Its middle is in an open cell: it stands on a floor or swings round a corner, as it did coming in.
        const cx = Math.floor((one.x - GROUND.x) / CELL), cy = Math.floor((one.y - CELL / 2 - GROUND.y) / CELL)
        expect(at(g, cx, cy), `at ${n}`).toBe(OPEN)
      }
    }
    scene.t = 4
    expect(showCarriedOut(scene, raid, ['ant'])[0].x).toBe(partyFile(['ant'])[0].x)
  })
})

describe('rooms that look lived in', () => {
  it('have two things each on their back wall, on or over their own floor, and no room more than two', () => {
    const game = fullKingdom()
    const k = new Kingdom(game)
    const rooms = k.toy.realm.chambers
    expect(rooms.length).toBeGreaterThanOrEqual(6)
    const things = showFurnishings(game.ground, rooms, 0)
    // Two to a room, in the first rooms of the list; a room whose floor is too short for them has none.
    expect(things.length).toBeLessThanOrEqual(FURNISHED * 2)
    expect(things.length).toBeGreaterThanOrEqual(FURNISHED)
    const floors = rooms.slice(0, FURNISHED).map((room) => roomFloor(game.ground, room))
    things.forEach((thing) => {
      const tx = (thing.x - GROUND.x) / CELL
      const floor = floors.find((f) => tx >= f.from && tx <= f.to + 1 && thing.y <= GROUND.y + (f.y + 1) * CELL && thing.y > GROUND.y + (f.y - 2) * CELL)!
      expect(floor, `${thing.thing} at ${tx}`).toBeDefined()
      const cx = (thing.x - GROUND.x) / CELL
      expect(cx).toBeGreaterThanOrEqual(floor.from)
      expect(cx).toBeLessThanOrEqual(floor.to + 1)
      // Its foot is at the floor, or it hangs over it, and it fits under the room's roof.
      expect(thing.y).toBeLessThanOrEqual(GROUND.y + (floor.y + 1) * CELL)
      expect(thing.y - THING_SIZE[thing.thing].height).toBeGreaterThanOrEqual(GROUND.y + (floor.y - 2) * CELL)
      expect(at(game.ground, Math.floor(cx), floor.y)).toBe(OPEN)
    })
    // Two rooms next to each other in the list are not furnished alike.
    expect(things[0].thing).not.toBe(things[2].thing)
    expect(showFurnishings(game.ground, rooms, rooms.length).some((thing) => thing.lit)).toBe(true)
    expect(things.some((thing) => thing.lit)).toBe(false)
  })

  it('are bare where there is no chamber', () => {
    const game = freshGame(null, 1)
    expect(showFurnishings(game.ground, new Kingdom(game).toy.realm.chambers, 0)).toEqual([])
  })
})

describe('the fullest frame of a raid', () => {
  it('stays under the draw budget: a full kingdom, the largest party inside, both machines firing, marks, crumbs and the hand', () => {
    const k = new Kingdom(fullKingdom())
    const display = new ToyDisplay(k, 1)
    // A raid before this one left its marks.
    k.marks = [9 * 40 + 22, 9 * 40 + 23, 9 * 40 + 24, 9 * 40 + 25, 9 * 40 + 27, 9 * 40 + 28, 9 * 40 + 29]
    const withMarks = display.items(null)
    expect(withMarks.filter((item) => item.is === 'effect').length).toBe(6)
    k.bell()
    let most = 0, mostItems: Item[] = []
    const guidance: Guidance = { glow: 1, demo: 0.5, demoIndex: 0 }
    for (let n = 0; n < 2400 && k.raid; n++) {
      if (n % 70 === 20) { k.press(30.5, 9.5, n / 30); k.release() }
      if (n % 70 === 40) { k.press(12.5, 9.5, n / 30); k.release() }
      k.step(1 / 30)
      display.see([{ type: 'dug', x: 5, y: 5, cells: 4, speed: 1 }, { type: 'met', kind: STONE, x: 6, y: 5 }, { type: 'met', kind: 2, x: 7, y: 5 }, { type: 'met', kind: 3, x: 8, y: 5 }])
      display.seeGame(k.drainEvents(), k.drainRaidEvents())
      display.advance(1 / 30)
      const items = display.items(guidance)
      if (drawsOf(items) > most) { most = drawsOf(items); mostItems = items.slice() }
    }
    expect(most).toBeLessThanOrEqual(DRAW_BUDGET)
    expect(most).toBeGreaterThan(45)
    // Every kind was on screen in that frame, with machines, things on the walls and a shot or its landing.
    const has = (test: (item: Item) => boolean) => mostItems.some(test)
    for (const who of ['raider', 'beetle', 'fly', 'worker', 'queen', 'ant']) expect(has((item) => item.is === 'sprite' && item.who === who), who).toBe(true)
    expect(mostItems.filter((item) => item.is === 'machine').length).toBe(2)
    expect(mostItems.filter((item) => item.is === 'thing').length).toBeGreaterThanOrEqual(FURNISHED)
    expect(Object.keys(DRAWS).length).toBe(13)
  })
})
