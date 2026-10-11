import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { EARTH, LUMPS, MOUTH, MUD, OPEN, STONE, at, clone, count, equal, put, settle } from './ground'
import { Kingdom, SCENE_SECONDS, type KingdomEvent } from './kingdom'
import { RELOAD } from './machines'
import type { RaidEvent } from './raid'
import { deserialize, freshGame, serialize, type Game } from './save'

/** A nest on the game's own ground: the shaft, a tunnel two cells high to the right and a room at its end. */
function nestGame(position = 'first-chamber', floorMud = 0): Game {
  const game = freshGame(null, 1), g = game.ground
  for (let y = 1; y < g.rows - 1; y++) for (let x = 0; x < g.cols; x++) put(g, x, y, EARTH)
  for (let y = 1; y <= 5; y++) for (const x of MOUTH) put(g, x, y, OPEN)
  for (const y of [4, 5]) for (let x = 22; x <= 29; x++) put(g, x, y, OPEN)
  for (let y = 3; y <= 5; y++) for (let x = 30; x <= 35; x++) put(g, x, y, OPEN)
  // Mud let into the floor of the tunnel: it holds this many raider ants.
  for (let n = 0; n < floorMud; n++) put(g, 24 + n, 6, MUD)
  settle(g)
  game.position = position
  game.ant = { x: 20, y: 5 }
  // Every kind has had its first showing, so that the bell calls the party at once; a test of a showing takes them out again.
  game.shown.push('ant', 'beetle', 'fly', 'dungBeetle', 'dungFly')
  return game
}
const play = (k: Kingdom, seconds: number, events: KingdomEvent[] = [], raidEvents: RaidEvent[] = []) => {
  for (let t = 0; t < seconds; t += 1 / 30) {
    k.step(1 / 30)
    events.push(...k.drainEvents())
    raidEvents.push(...k.drainRaidEvents())
  }
  return events
}
/** Plays until no raid and no scene is running. */
const settleAll = (k: Kingdom, events: KingdomEvent[] = []) => {
  for (let n = 0; n < 6000 && (k.raid || k.scene); n++) {
    k.step(1 / 30)
    events.push(...k.drainEvents())
    k.drainRaidEvents()
  }
  return events
}
const saved = (game: Game) => deserialize(JSON.parse(JSON.stringify(serialize(game))), null, 1)
/** The nest as it lies in the game's own ground, come to rest. */
const asLoaded = (k: Kingdom) => deserialize(JSON.parse(JSON.stringify(serialize(k.game))), null, 1).ground
const whole = (game: Game) => LUMPS.map((kind) => count(game.ground, kind) + game.machines.filter((m) => m.load === ['', '', 'sand', 'mud', 'stone'][kind]).length)

describe('with no raid called', () => {
  it('nothing comes in and nothing changes, however long the game is left', () => {
    const k = new Kingdom(nestGame())
    const before = clone(k.game.ground)
    const events = play(k, 40)
    expect(k.raid).toBeNull()
    expect(equal(k.game.ground, before)).toBe(true)
    expect(events.filter((e) => e.type === 'called' || e.type === 'judged')).toEqual([])
    expect(k.game.position).toBe('first-chamber')
  })
})

describe('the bell', () => {
  it('with no chamber in the kingdom brings the party to shrug and go back, and judges nothing', () => {
    const k = new Kingdom(freshGame(null, 1))
    k.press(5, 5, 0)
    k.release()
    settleAll(k)
    k.drainEvents()
    k.bell()
    expect(k.raid).toBeNull()
    expect(k.scene?.is).toBe('shrug')
    const events = play(k, SCENE_SECONDS.shrug + 1)
    expect(k.scene).toBeNull()
    expect(events.some((e) => e.type === 'judged')).toBe(false)
    expect(k.game.position).toBe('first-chamber')
  })

  it('with a chamber calls the party at the log, and rung again meanwhile does nothing more', () => {
    const k = new Kingdom(nestGame())
    k.bell()
    expect(k.raid?.invaders.map((i) => i.kind)).toEqual(['ant'])
    const raid = k.raid
    k.bell()
    expect(k.raid).toBe(raid)
  })
})

describe('the bell and a ground that is still falling', () => {
  it('waits for the ground to rest: the raid starts by itself then, and no machine is left in the air', () => {
    const game = nestGame('the-cannon')
    game.shown.push('catapult', 'cannon')
    game.machines.push({ kind: 'cannon', x: 32, y: 5, facing: -1, load: 'stone' })
    const k = new Kingdom(game)
    // The floor under the cannon is dug away, and the bell is rung before anything has come down.
    k.press(33, 6.9, 0)
    k.drag(33, 8.5, 0.1)
    k.release()
    expect(k.toy.atRest).toBe(false)
    k.bell()
    expect(k.raid).toBeNull()
    const events: KingdomEvent[] = []
    for (let n = 0; n < 600 && !k.raid; n++) { k.step(1 / 30); events.push(...k.drainEvents()) }
    expect(k.raid).not.toBeNull()
    expect(k.toy.atRest).toBe(true)
    expect(events.filter((e) => e.type === 'called').length).toBe(1)
    const cannon = k.game.machines[0]
    expect(cannon.y).toBeGreaterThan(5)
    expect(at(k.game.ground, cannon.x, cannon.y + 1)).not.toBe(OPEN)
    // The copy the raid runs on is the ground as it lies, and the cells it keeps clear of waiters are where the machine stands now.
    expect(equal(k.raid!.ground, k.game.ground)).toBe(true)
    expect(k.raid!.machines.has(cannon.y * 40 + cannon.x)).toBe(true)
  })

  it('a game put away before the ground has come to rest plays no scene on return: the queen\'s move is owed, and starts at the next touch', () => {
    const game = freshGame(null, 1), g = game.ground
    for (let y = 1; y < g.rows - 1; y++) for (let x = 0; x < g.cols; x++) put(g, x, y, MOUTH.includes(x) && y <= 6 ? OPEN : EARTH)
    for (const y of [4, 5]) for (let x = 22; x <= 27; x++) put(g, x, y, OPEN)
    settle(g)
    game.shown.push('ant')
    const k = new Kingdom(game)
    // The stroke that finishes the first room, and the game put away in the same instant.
    k.press(22.5, 6, 0)
    for (let n = 1; n <= 10; n++) k.drag(22.5 + n * 0.5, 6, n * 0.05)
    k.release()
    expect(k.toy.atRest).toBe(false)
    k.putAway()
    // Back again: the ground comes to rest, the room is there, and nothing plays by itself.
    expect(play(k, 10).filter((e) => e.type === 'scene')).toEqual([])
    expect(k.toy.realm.chambers.length).toBe(1)
    expect(k.queenStays).toBe('mouth')
    // The next touch, wherever it lands, and her move begins.
    k.press(5.5, 5.5, 20)
    k.release()
    const after = play(k, 1)
    expect(after.filter((e) => e.type === 'scene').map((e) => (e as { is: string }).is)).toEqual(['moves'])
  })
})

describe('a raid on call', () => {
  it('is judged when it ends by itself, and the position moves one place forward after one that went well', () => {
    const k = new Kingdom(nestGame('first-chamber', 1))
    k.bell()
    const events = settleAll(k)
    expect(events.find((e) => e.type === 'judged')).toEqual({ type: 'judged', verdict: 'well' })
    expect(k.game.position).toBe('ant-file')
  })

  it('leaves the position where it is after one that did not go well, and never moves it back', () => {
    const k = new Kingdom(nestGame('ant-file', 0))
    k.bell()
    const events = settleAll(k)
    expect(events.find((e) => e.type === 'judged')).toEqual({ type: 'judged', verdict: 'not-well' })
    expect(k.game.position).toBe('ant-file')
  })

  it('saves the position in the instant it is judged, before the put-back is seen', () => {
    const k = new Kingdom(nestGame('first-chamber', 1))
    k.bell()
    k.drainUnsaved()
    let judgedAt = -1
    for (let n = 0; n < 3000 && judgedAt < 0; n++) {
      k.step(1 / 30)
      if (k.drainEvents().some((e) => e.type === 'judged')) judgedAt = n
    }
    expect(k.scene?.is).toBe('putBack')
    expect(k.drainUnsaved()).toEqual({ changed: true, now: true })
    // Put away in that instant: the save has the new position and no raid.
    expect(saved(k.game).position).toBe('ant-file')
  })

  it('leaves the nest as built, cell for cell, and marks the place that gave until the next raid', () => {
    const game = nestGame('first-beetle')
    put(game.ground, 25, 5, 2)
    const k = new Kingdom(game)
    const before = clone(game.ground)
    k.bell()
    settleAll(k)
    expect(equal(game.ground, before)).toBe(true)
    expect(k.marks.length).toBeGreaterThan(0)
    expect(k.marks).toContain(5 * 40 + 25)
    k.bell()
    expect(k.marks).toEqual([])
  })

  it('does not let the nest be built on while it runs: a touch digs nothing, takes nothing and moves no machine', () => {
    const game = nestGame('the-cannon')
    put(game.ground, 26, 5, STONE)
    game.machines.push({ kind: 'cannon', x: 32, y: 5, facing: -1, load: null })
    game.shown.push('ant', 'beetle', 'fly', 'catapult', 'cannon')
    const k = new Kingdom(game)
    const before = clone(game.ground)
    k.bell()
    play(k, 0.5)
    k.press(10.5, 10.5, 1)
    k.drag(14.5, 10.5, 1.1)
    k.release()
    k.press(26.5, 5.5, 2)
    expect(k.toy.carried).toBeNull()
    k.drag(27.5, 4.5, 2.1)
    k.release()
    k.press(32.5, 5.5, 3)
    k.drag(28.5, 5.5, 3.1)
    k.release()
    expect(equal(game.ground, before)).toBe(true)
    expect(k.raid && equal(k.raid.ground, before)).toBe(true)
    expect(game.machines[0]).toMatchObject({ x: 32, y: 5, facing: -1 })
  })

  it('put away while it runs, is found with the invaders at their camp and the nest as built, and is not judged', () => {
    const k = new Kingdom(nestGame('beetle-pair'))
    const before = clone(k.game.ground)
    k.bell()
    const events = play(k, 6)
    expect(k.raid?.invaders.some((i) => i.cell >= 0)).toBe(true)
    k.putAway()
    events.push(...k.drainEvents())
    expect(k.raid).toBeNull()
    expect(k.scene).toBeNull()
    expect(events.some((e) => e.type === 'judged')).toBe(false)
    expect(k.game.position).toBe('beetle-pair')
    const back = saved(k.game)
    expect(equal(back.ground, before)).toBe(true)
    expect(back.position).toBe('beetle-pair')
  })

  it('moves the position on from every place to the next, one raid that went well at a time, as far as the open kingdom', () => {
    const k = new Kingdom(fortGame('first-chamber'))
    for (let n = 0; n < LADDER.length - 1; n++) {
      expect(k.game.position).toBe(LADDER[n])
      k.bell()
      const events = settleAll(k)
      expect(events.find((e) => e.type === 'judged'), LADDER[n]).toEqual({ type: 'judged', verdict: 'well' })
      // The ending holds until a touch, and a first showing or a machine arriving plays out by itself.
      if (k.scene) {
        k.press(22.5, 4.5, 0)
        k.release()
        settleAll(k)
      }
    }
    expect(k.game.position).toBe('open-kingdom')
    expect(k.game.ended).toBe(true)
  })
})

/**
 * The nest of these tests made safe from every party of the order with no machine: three cells of mud in the
 * tunnel's floor hold three raider ants; the tunnel is two cells high, so no fly gets in; a stone in its roof,
 * a lintel with earth either side of it, jams a dung ball, whose beetle goes on without it; and a pit two cells
 * deep beyond it holds every beetle.
 */
function fortGame(position: string): Game {
  const game = nestGame(position, 3)
  game.shown.push('ant', 'beetle', 'fly', 'dungBeetle', 'dungFly', 'catapult', 'cannon')
  put(game.ground, 24, 3, STONE)
  for (const x of [27, 28]) for (const y of [6, 7]) put(game.ground, x, y, OPEN)
  settle(game.ground)
  return game
}

describe('the great raid and the ending', () => {
  /** Plays until the raid is judged, and stops in that instant. */
  const untilJudged = (k: Kingdom, events: KingdomEvent[] = []) => {
    for (let n = 0; n < 9000 && !events.some((e) => e.type === 'judged'); n++) {
      k.step(1 / 30)
      events.push(...k.drainEvents())
      k.drainRaidEvents()
    }
    return events
  }

  it('turned back, opens the kingdom: that is saved in the instant the raid is judged, and the ending plays once after the put-back and holds', () => {
    const k = new Kingdom(fortGame('great-raid'))
    const before = clone(k.game.ground)
    k.bell()
    expect(k.raid?.invaders.map((i) => i.kind)).toEqual(['dungFly', 'dungBeetle', 'dungBeetle', 'dungBeetle', 'dungBeetle', 'dungBeetle'])
    const events = untilJudged(k)
    expect(events.find((e) => e.type === 'judged')).toEqual({ type: 'judged', verdict: 'well' })
    expect(k.drainUnsaved()).toEqual({ changed: true, now: true })
    expect(saved(k.game).position).toBe('open-kingdom')
    expect(saved(k.game).ended).toBe(true)
    expect(k.scene?.is).toBe('putBack')
    expect(equal(k.game.ground, before)).toBe(true)
    // The put-back plays out, and then the ending begins.
    for (let n = 0; n < 900 && k.scene?.is === 'putBack'; n++) { k.step(1 / 30); events.push(...k.drainEvents()) }
    expect(k.scene?.is).toBe('ending')
    // It holds on its last beat for as long as nobody touches.
    play(k, SCENE_SECONDS.ending + 30, events)
    expect(k.scene).toEqual({ is: 'ending', t: SCENE_SECONDS.ending, length: SCENE_SECONDS.ending })
    expect(events.filter((e) => e.type === 'scene' && e.is === 'ending').length).toBe(1)
    // A touch ends it, and is then an ordinary touch.
    k.press(22.5, 4.5, 0)
    k.release()
    expect(k.scene).toBeNull()
    // The kingdom stays open to play: a raid can still be called, and no ending plays again.
    k.bell()
    expect(k.raid?.invaders.map((i) => i.kind)).toEqual(['ant', 'ant', 'fly'])
    const later = settleAll(k)
    expect(later.some((e) => e.type === 'scene' && e.is === 'ending')).toBe(false)
    expect(k.game.ended).toBe(true)
    expect(equal(k.game.ground, before)).toBe(true)
  })

  it('put away in the instant the last of the army turns back, reads back with the ending seen and plays no scene', () => {
    for (const when of ['as it is judged', 'in the put-back'] as const) {
      const k = new Kingdom(fortGame('great-raid'))
      const before = clone(k.game.ground)
      k.bell()
      untilJudged(k)
      if (when === 'in the put-back') play(k, 1)
      expect(k.scene?.is, when).toBe('putBack')
      k.putAway()
      expect(k.scene, when).toBeNull()
      const back = saved(k.game)
      expect(back.position, when).toBe('open-kingdom')
      expect(back.ended, when).toBe(true)
      expect(equal(back.ground, before), when).toBe(true)
      // Opened again: nothing plays, at load or at the first touch, and the next party is at the log.
      const again = new Kingdom(back)
      const events = play(again, 10)
      again.press(22.5, 4.5, 0)
      again.release()
      play(again, 30, events)
      expect(events.filter((e) => e.type === 'scene'), when).toEqual([])
      expect(again.scene, when).toBeNull()
      expect(again.party, when).toEqual(['ant', 'ant', 'fly'])
      // And in the visit it was put away in, nothing plays either.
      const same = play(k, 30)
      expect(same.filter((e) => e.type === 'scene'), when).toEqual([])
    }
  })

  it('not turned back, leaves the position where it was, plays no ending, and the ground is as built', () => {
    const k = new Kingdom(nestGame('great-raid'))
    k.game.shown.push('ant', 'beetle', 'fly', 'dungBeetle', 'dungFly', 'catapult', 'cannon')
    // A hall three cells high from the shaft to the room: the dung fly flies straight in.
    for (let x = 22; x <= 29; x++) put(k.game.ground, x, 3, OPEN)
    const before = clone(k.game.ground)
    k.bell()
    const events = settleAll(k)
    expect(events.find((e) => e.type === 'judged')).toEqual({ type: 'judged', verdict: 'not-well' })
    expect(events.some((e) => e.type === 'scene' && e.is === 'ending')).toBe(false)
    expect(k.game.position).toBe('great-raid')
    expect(k.game.ended).toBe(false)
    expect(equal(k.game.ground, before)).toBe(true)
  })

  it('in the open kingdom lays out a mixed party after each raid that went well, round and round the six', () => {
    const k = new Kingdom(fortGame('open-kingdom'))
    k.game.ended = true
    const seen: string[] = []
    for (let n = 0; n < 7; n++) {
      expect(k.game.muster).toBe(n % 6)
      seen.push(k.party.join(' '))
      k.bell()
      const events = settleAll(k)
      expect(events.find((e) => e.type === 'judged')).toEqual({ type: 'judged', verdict: 'well' })
      expect(events.some((e) => e.type === 'scene' && e.is === 'ending')).toBe(false)
    }
    expect(new Set(seen.slice(0, 6)).size).toBe(6)
    expect(seen[6]).toBe(seen[0])
    expect(k.game.position).toBe('open-kingdom')
  })
})

describe('the queen moves in', () => {
  /** Drags the finger through the ground from one place to another, as a child digs. */
  const dig = (k: Kingdom, from: [number, number], to: [number, number], t = 0) => {
    const steps = Math.max(2, Math.ceil(Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1])) * 2))
    k.press(from[0], from[1], t)
    for (let n = 1; n <= steps; n++) {
      k.drag(from[0] + ((to[0] - from[0]) * n) / steps, from[1] + ((to[1] - from[1]) * n) / steps, t + n * 0.05)
      k.step(0.05)
    }
    k.release()
  }
  /** A fresh game whose first showing has been seen, so that nothing else is owed. */
  const shownGame = () => {
    const game = freshGame(null, 1), g = game.ground
    // Plain earth under the shaft, so that a stroke digs what it is drawn through.
    for (let y = 1; y < g.rows - 1; y++) for (let x = 0; x < g.cols; x++) put(g, x, y, MOUTH.includes(x) && y <= 2 ? OPEN : EARTH)
    game.shown.push('ant')
    return game
  }
  /** Digs a room beside the shaft, on rows 4 to 6, from column `from` to column `to`. */
  const digRoom = (k: Kingdom, from: number, to: number, events: KingdomEvent[]) => {
    const a = Math.min(from, to) + 0.5, b = Math.max(from, to) + 0.5
    dig(k, [20.5, 3.5], [20.5, 6.5])
    // A mouthful is two cells across, so two strokes open three rows.
    for (const y of [5, 6]) {
      dig(k, from < to ? [a, y] : [b, y], from < to ? [b, y] : [a, y])
      events.push(...k.drainEvents())
    }
    for (let n = 0; n < 60; n++) { k.step(1 / 30); events.push(...k.drainEvents()) }
  }

  it('is a scene of her own when the kingdom gets its first chamber: it saves nothing, a touch ends it, and she is in her room from its start', () => {
    const k = new Kingdom(shownGame())
    expect(k.toy.realm.queenRoom).toBeNull()
    const events: KingdomEvent[] = []
    digRoom(k, 22, 27, events)
    expect(k.toy.realm.chambers.length).toBe(1)
    expect(events.filter((e) => e.type === 'scene')).toEqual([{ type: 'scene', is: 'moves' }])
    expect(k.scene?.is).toBe('moves')
    const scene = k.scene as Extract<NonNullable<Kingdom['scene']>, { is: 'moves' }>
    // She is carried from under the mouth, through open cells, to her seat.
    expect(scene.way.length).toBeGreaterThan(3)
    for (const cell of scene.way.slice(1)) expect(at(k.game.ground, cell % 40, Math.floor(cell / 40))).toBe(OPEN)
    expect(scene.length).toBe(SCENE_SECONDS.moves)
    // Where she lives follows from the ground: a save in the middle of the scene reads back with her in her room and plays nothing.
    const back = new Kingdom(saved(k.game))
    expect(back.toy.realm.queenRoom).not.toBeNull()
    expect(play(back, 10).filter((e) => e.type === 'scene')).toEqual([])
    // A touch ends it, and is then an ordinary touch.
    k.press(24.5, 5.5, 9)
    k.release()
    expect(k.scene).toBeNull()
    // It plays out by itself too, and not again while she lives in the same room, however it grows.
    const again = new Kingdom(shownGame()), more: KingdomEvent[] = []
    digRoom(again, 22, 27, more)
    play(again, SCENE_SECONDS.moves + 1, more)
    expect(again.scene).toBeNull()
    for (const y of [5, 6]) dig(again, [28.5, y], [31.5, y])
    play(again, 4, more)
    expect(more.filter((e) => e.type === 'scene').length).toBe(1)
  })

  it('waits for a scene that is playing: she stays where she was and is carried when it is over, and a put-away finds her in her room', () => {
    /** A nest one stroke short of its first room, with the ant's first showing still owed at the first touch. */
    const oneStrokeShort = () => {
      const game = shownGame(), g = game.ground
      game.shown.length = 0
      for (let y = 3; y <= 6; y++) for (const x of MOUTH) put(g, x, y, OPEN)
      for (const y of [4, 5]) for (let x = 22; x <= 27; x++) put(g, x, y, OPEN)
      settle(g)
      return new Kingdom(game)
    }
    const k = oneStrokeShort(), events: KingdomEvent[] = []
    expect(k.toy.realm.chambers.length).toBe(0)
    // The touch that starts the showing digs the room as it goes on.
    dig(k, [22.5, 6], [27.5, 6])
    play(k, 2, events)
    expect(k.toy.realm.chambers.length).toBe(1)
    expect(k.scene?.is).toBe('showing')
    expect(k.queenStays).toBe('mouth')
    expect(events.filter((e) => e.type === 'scene').map((e) => (e as { is: string }).is)).toEqual(['showing'])
    play(k, SCENE_SECONDS.showing, events)
    expect(events.filter((e) => e.type === 'scene').map((e) => (e as { is: string }).is)).toEqual(['showing', 'moves'])
    expect(k.scene?.is).toBe('moves')
    expect(k.queenStays).toBeNull()
    play(k, SCENE_SECONDS.moves + 1, events)
    expect(events.filter((e) => e.type === 'scene').length).toBe(2)
    // The bell, rung while she waits, ends the showing and shows her move first; the next ring calls the party.
    const rung = oneStrokeShort()
    dig(rung, [22.5, 6], [27.5, 6])
    play(rung, 2)
    rung.bell()
    expect(rung.scene?.is).toBe('moves')
    expect(rung.raid).toBeNull()
    rung.bell()
    expect(rung.raid).not.toBeNull()
    // Put away while she waits: she is found in her room, and nothing plays.
    const away = oneStrokeShort()
    dig(away, [22.5, 6], [27.5, 6])
    play(away, 2)
    expect(away.queenStays).toBe('mouth')
    away.putAway()
    expect(away.queenStays).toBeNull()
    expect(play(away, 10).filter((e) => e.type === 'scene')).toEqual([])
  })

  it('plays again when another room becomes the largest, and never on load or after a put-away', () => {
    const k = new Kingdom(shownGame()), events: KingdomEvent[] = []
    digRoom(k, 22, 26, events)
    play(k, SCENE_SECONDS.moves + 1, events)
    // A larger room further down, at the foot of a shaft dug from the first.
    dig(k, [24, 7.5], [24, 11.5])
    events.push(...k.drainEvents())
    for (const y of [11, 12]) { dig(k, [22.5, y], [33.5, y]); events.push(...k.drainEvents()) }
    play(k, 3, events)
    expect(k.toy.realm.chambers.length).toBe(2)
    expect(events.filter((e) => e.type === 'scene').length).toBe(2)
    expect(k.scene?.is).toBe('moves')
    // Put away in the middle of it: nothing is lost, and nothing replays in this visit or the next.
    k.putAway()
    expect(k.scene).toBeNull()
    expect(play(k, 10).filter((e) => e.type === 'scene')).toEqual([])
    const back = new Kingdom(saved(k.game))
    expect(play(back, 10).filter((e) => e.type === 'scene')).toEqual([])
  })
})

describe('first showings', () => {
  /** A nest whose kinds have not been shown yet. */
  const unshown = (position?: string) => {
    const game = nestGame(position)
    game.shown.length = 0
    return game
  }

  it('starts at a first touch that lands on the bell as well: the showing plays, and the party comes at the next ring', () => {
    const k = new Kingdom(unshown())
    k.bell()
    expect(k.scene).toMatchObject({ is: 'showing', kind: 'ant' })
    expect(k.raid).toBeNull()
    expect(k.game.shown).toEqual(['ant'])
    // The second ring ends the showing and calls the party.
    k.bell()
    expect(k.scene).toBeNull()
    expect(k.raid).not.toBeNull()
    // A machine that is owed is in the nest before the raid it was brought for.
    const late = unshown('the-catapult')
    late.shown.push('ant', 'beetle', 'fly')
    const kl = new Kingdom(late)
    kl.bell()
    expect(kl.scene).toMatchObject({ is: 'arrives', machine: 'catapult' })
    expect(kl.raid).toBeNull()
    expect(late.machines.map((m) => m.kind)).toEqual(['catapult'])
  })

  it('owes the first kind at the first touch of a first visit, marks it as it starts, and never shows it again', () => {
    const k = new Kingdom(unshown())
    expect(k.scene).toBeNull()
    k.press(10.5, 10.5, 0)
    expect(k.scene).toMatchObject({ is: 'showing', kind: 'ant' })
    expect(k.game.shown).toEqual(['ant'])
    expect(k.drainUnsaved().now).toBe(true)
    k.release()
    const again = new Kingdom(saved(k.game))
    again.press(10.5, 10.5, 0)
    expect(again.scene).toBeNull()
  })

  it('brings the catapult when its place is reached: in the nest and saved from the moment the workers start', () => {
    const game = nestGame('first-fly')
    game.shown.push('ant', 'beetle', 'fly')
    const k = new Kingdom(game)
    k.bell()
    const events: KingdomEvent[] = []
    // The fly cannot come into a tunnel two cells high, so this raid goes well.
    for (let n = 0; n < 6000 && !(k.scene && k.scene.is === 'arrives'); n++) { k.step(1 / 30); events.push(...k.drainEvents()) }
    expect(game.position).toBe('the-catapult')
    expect(game.machines.map((m) => m.kind)).toEqual(['catapult'])
    expect(game.shown).toContain('catapult')
    expect(saved(game).machines.length).toBe(1)
    // A touch ends the scene; the machine is there all the same.
    k.press(10.5, 10.5, 99)
    expect(k.scene).toBeNull()
    expect(game.machines.length).toBe(1)
  })

  it('still owes a showing when the game is put away before it starts, and starts it at the next first touch', () => {
    const game = nestGame('first-fly')
    game.shown.push('ant', 'beetle', 'fly')
    const k = new Kingdom(game)
    k.bell()
    for (let n = 0; n < 6000 && k.scene?.is !== 'putBack'; n++) k.step(1 / 30)
    expect(game.position).toBe('the-catapult')
    k.putAway()
    expect(game.shown).not.toContain('catapult')
    expect(game.machines).toEqual([])
    const again = new Kingdom(saved(game))
    expect(again.scene).toBeNull()
    again.press(10.5, 10.5, 0)
    expect(again.scene).toMatchObject({ is: 'arrives', machine: 'catapult' })
    expect(again.game.machines.length).toBe(1)
  })
})

describe('a machine', () => {
  const armed = (load: 'sand' | 'mud' | 'stone' | null = null) => {
    const game = nestGame('the-cannon')
    game.shown.push('ant', 'beetle', 'fly', 'catapult', 'cannon')
    game.machines.push({ kind: 'cannon', x: 32, y: 5, facing: -1, load })
    put(game.ground, 28, 5, STONE)
    return new Kingdom(game)
  }

  it('turns round at a tap when it is empty', () => {
    const k = armed()
    k.press(32.5, 5.5, 0)
    k.release()
    expect(k.game.machines[0].facing).toBe(1)
    expect(k.drainEvents()).toContainEqual({ type: 'turned', machine: 'cannon' })
  })

  it('is dragged to a floor where it can stand and faces the way it was dragged; let go anywhere else it goes back', () => {
    const k = armed()
    k.press(32.5, 5.5, 0)
    k.drag(25, 5.5, 0.2)
    k.release()
    expect(k.game.machines[0]).toMatchObject({ x: 24, y: 5, facing: -1 })
    k.press(24.5, 5.5, 1)
    k.drag(10.5, 12.5, 1.2)
    k.release()
    expect(k.game.machines[0]).toMatchObject({ x: 24, y: 5 })
    expect(k.drainEvents().map((e) => e.type)).toEqual(['machineSet', 'machineBack'])
  })

  it('is loaded by a lump set on it, which leaves the ground for the cup', () => {
    const k = armed()
    const before = whole(k.game)
    k.press(28.5, 5.5, 0)
    expect(k.toy.carried?.kind).toBe(STONE)
    k.drag(32.5, 5.5, 0.2)
    k.release()
    expect(k.game.machines[0].load).toBe('stone')
    expect(at(k.game.ground, 28, 5)).toBe(OPEN)
    expect(whole(k.game)).toEqual(before)
    expect(saved(k.game).machines[0].load).toBe('stone')
  })

  it('fired outside a raid really throws its lump, which lies where it landed, and is saved empty', () => {
    const k = armed('stone')
    put(k.game.ground, 28, 5, OPEN)
    const before = whole(k.game)
    k.press(32.5, 5.5, 0)
    k.release()
    expect(k.game.machines[0].load).toBeNull()
    play(k, 2)
    expect(count(k.game.ground, STONE)).toBe(1)
    expect(whole(k.game)).toEqual(before)
    expect(saved(k.game).machines[0].load).toBeNull()
  })

  it('fired in a raid sends an invader out, has its lump again after a few beats, and after the raid', () => {
    const game = nestGame('first-chamber')
    game.shown.push('ant', 'catapult', 'cannon')
    game.position = 'first-chamber'
    game.machines.push({ kind: 'cannon', x: 32, y: 5, facing: -1, load: 'stone' })
    const k = new Kingdom(game)
    k.bell()
    const raidEvents: RaidEvent[] = []
    for (let n = 0; n < 3000 && !(k.raid && k.raid.invaders[0].cell % 40 >= 24 && Math.floor(k.raid.invaders[0].cell / 40) >= 4); n++) { k.step(1 / 30); raidEvents.push(...k.drainRaidEvents()) }
    k.press(32.5, 5.5, 5)
    k.release()
    expect(k.reloading[0]).toBe(RELOAD)
    expect(game.machines[0].load).toBe('stone')
    const events = settleAll(k)
    expect(events.find((e) => e.type === 'judged')).toEqual({ type: 'judged', verdict: 'well' })
    expect(game.machines[0].load).toBe('stone')
    expect(k.reloading[0]).toBe(0)
    expect(count(game.ground, STONE)).toBe(0)
  })

  it('never loses its lump: a shot in the air over the nest lands at once when the game is put away, or the bell is rung', () => {
    for (const how of ['put away', 'the bell'] as const) {
      const k = armed('stone')
      put(k.game.ground, 28, 5, OPEN)
      const before = whole(k.game)
      k.press(32.5, 5.5, 0)
      k.release()
      k.step(1 / 30)
      expect(k.flying.length).toBe(1)
      if (how === 'put away') k.putAway()
      else k.bell()
      expect(k.flying.filter((shot) => !shot.inRaid)).toEqual([])
      expect(whole(k.game), how).toEqual(before)
      expect(count(k.game.ground, STONE), how).toBe(1)
      expect(whole(saved(k.game)), how).toEqual(before)
    }
  })

  it('fired outside a raid, is stored at every instant with its lump a cell of the ground where it lands and its cup empty: never in neither', () => {
    for (const load of ['sand', 'mud', 'stone'] as const) {
      const k = armed(load)
      put(k.game.ground, 28, 5, OPEN)
      const before = whole(k.game)
      k.press(32.5, 5.5, 0)
      k.release()
      // From the instant it lets go, through every frame of the flight and after it has landed.
      for (let n = 0; n < 40; n++) {
        const stored = saved(k.stored())
        expect(whole(stored), `${load} at frame ${n}`).toEqual(before)
        expect(stored.machines[0].load, `${load} at frame ${n}`).toBeNull()
        expect(count(stored.ground, LUMPS[['sand', 'mud', 'stone'].indexOf(load)]), `${load} at frame ${n}`).toBe(count(asLoaded(k), LUMPS[['sand', 'mud', 'stone'].indexOf(load)]) + (k.flying.length > 0 ? 1 : 0))
        k.step(1 / 30)
      }
      expect(k.flying).toEqual([])
      expect(k.stored()).toBe(k.game)
    }
  })

  it('is ready again after a put-away in the middle of a raid, however soon after its shot', () => {
    const k = armed('stone')
    k.bell()
    play(k, 1)
    k.press(32.5, 5.5, 1)
    k.release()
    play(k, 0.3)
    expect(k.reloading.some((left) => left > 0)).toBe(true)
    k.putAway()
    expect(k.reloading.every((left) => left === 0)).toBe(true)
    expect(k.game.machines[0].load).toBe('stone')
    // The next tap, outside a raid, fires it for good.
    k.drainEvents()
    k.press(32.5, 5.5, 2)
    k.release()
    expect(k.drainEvents().some((event) => event.type === 'fired')).toBe(true)
  })

  it('shuts no column of the mouth where it stands under it: every invader of the party still comes in', () => {
    const game = freshGame(null, 1), g = game.ground
    for (let y = 1; y <= 3; y++) for (let x = 22; x <= 31; x++) put(g, x, y, OPEN)
    settle(g)
    game.position = 'the-catapult'
    game.shown.push('ant', 'beetle', 'fly', 'catapult')
    // Where the workers set it down: at the foot of the shaft, under the mouth.
    game.machines.push({ kind: 'catapult', x: MOUTH[0], y: 3, facing: 1, load: null })
    const k = new Kingdom(game)
    k.bell()
    const raidEvents: RaidEvent[] = []
    for (let n = 0; n < 3000 && k.raid; n++) { k.step(1 / 30); k.drainEvents(); raidEvents.push(...k.drainRaidEvents()) }
    expect(raidEvents.filter((event) => event.type === 'in').length).toBe(4)
    expect(raidEvents.filter((event) => event.type === 'acted').length).toBe(4)
  })

  it('answers a tap in a raid when it has nothing in it yet, with a cough', () => {
    const k = armed()
    k.bell()
    play(k, 1)
    k.drainEvents()
    k.press(32.5, 5.5, 2)
    k.release()
    expect(k.drainEvents()).toContainEqual({ type: 'fizzled', machine: 'cannon' })
    expect(k.game.machines[0].facing).toBe(-1)
  })

  it('whose floor was dug away before a put-away comes down to the floor it finds when the game is opened again', () => {
    const game = nestGame('the-cannon')
    game.shown.push('ant', 'beetle', 'fly', 'catapult', 'cannon')
    game.machines.push({ kind: 'cannon', x: 32, y: 5, facing: -1, load: null })
    for (const x of [32, 33]) put(game.ground, x, 6, OPEN)
    const k = new Kingdom(saved(game))
    expect(k.game.machines[0]).toMatchObject({ x: 32, y: 6 })
  })

  it('a shot that meets the ground is answered by what it met: sand, mud and stone each say so, and a free stone struck by a level shot rolls one cell on', () => {
    const shoot = (target: number, beyond: number = OPEN) => {
      const k = armed('stone')
      put(k.game.ground, 28, 5, OPEN)
      put(k.game.ground, 25, 5, target as never)
      put(k.game.ground, 24, 5, beyond as never)
      settle(k.game.ground)
      const before = whole(k.game)
      k.press(32.5, 5.5, 0)
      k.release()
      const events = play(k, 2)
      expect(whole(k.game)).toEqual(before)
      return { k, hit: events.find((e) => e.type === 'shotHit') }
    }
    const sand = shoot(2)
    expect(sand.hit).toEqual({ type: 'shotHit', kind: 2, cell: 5 * 40 + 25 })
    // The shot lies against it.
    expect(at(sand.k.game.ground, 26, 5)).toBe(STONE)
    expect(shoot(MUD).hit).toEqual({ type: 'shotHit', kind: MUD, cell: 5 * 40 + 25 })
    // A free stone rolls one cell on, and the shot lies where it stopped.
    const stone = shoot(STONE)
    expect(stone.hit).toEqual({ type: 'shotHit', kind: STONE, cell: 5 * 40 + 25 })
    expect([at(stone.k.game.ground, 24, 5), at(stone.k.game.ground, 25, 5), at(stone.k.game.ground, 26, 5)]).toEqual([STONE, OPEN, STONE])
    // A stone bedded in mud rings and does not move.
    const bedded = shoot(STONE, MUD)
    expect(bedded.hit).toEqual({ type: 'shotHit', kind: STONE, cell: 5 * 40 + 25 })
    expect([at(bedded.k.game.ground, 24, 5), at(bedded.k.game.ground, 25, 5), at(bedded.k.game.ground, 26, 5)]).toEqual([MUD, STONE, STONE])
  })

  it('a stone goes by a fly, which steps aside, and meets whoever is behind it', () => {
    const game = nestGame('first-fly')
    game.shown.push('ant', 'beetle', 'fly', 'catapult', 'cannon')
    // A hall three high all the way, so the fly gets in, and the cannon at its far end.
    for (let x = 22; x <= 29; x++) put(game.ground, x, 3, OPEN)
    game.machines.push({ kind: 'cannon', x: 34, y: 5, facing: -1, load: 'stone' })
    const k = new Kingdom(game)
    k.bell()
    const raidEvents: RaidEvent[] = []
    for (let n = 0; n < 3000 && !(k.raid && k.raid.invaders[0].cell >= 0 && k.raid.invaders[0].cell % 40 >= 23); n++) { k.step(1 / 30); raidEvents.push(...k.drainRaidEvents()) }
    k.press(34.5, 5.5, 5)
    k.release()
    const events: KingdomEvent[] = []
    for (let n = 0; n < 40; n++) { k.step(1 / 30); events.push(...k.drainEvents()); raidEvents.push(...k.drainRaidEvents()) }
    const hits = raidEvents.filter((e) => e.type === 'hit') as Extract<RaidEvent, { type: 'hit' }>[]
    expect(hits.map((e) => [e.kind, e.shot, e.answer])).toEqual([['fly', 'stone', 'steps-aside']])
    // The stone flew on past it to the end of its way and lies there, in the raid's copy.
    const landed = events.find((e) => e.type === 'shotLanded') as Extract<KingdomEvent, { type: 'shotLanded' }>
    expect(landed.cell % 40).toBeLessThan(22)
  })

  it('that has just arrived fires once to show that it works, three quarters of the way through its scene', () => {
    const game = nestGame('the-catapult')
    game.shown.push('ant', 'beetle', 'fly')
    const k = new Kingdom(game)
    k.press(22.5, 4.5, 0)
    k.release()
    expect(k.scene?.is).toBe('arrives')
    const events = play(k, SCENE_SECONDS.arrives + 1)
    expect(events.filter((e) => e.type === 'tried')).toEqual([{ type: 'tried', machine: 'catapult' }])
  })

  it('falls to the floor when the floor under it is dug away', () => {
    const k = armed()
    k.press(32.5, 6.9, 0)
    k.drag(33.5, 7.2, 0.2)
    k.release()
    play(k, 2)
    expect(k.game.machines[0].y).toBeGreaterThan(5)
    const m = k.game.machines[0]
    for (const [x, y] of [[m.x, m.y], [m.x + 1, m.y], [m.x, m.y - 1], [m.x + 1, m.y - 1]]) expect(at(k.game.ground, x, y)).toBe(OPEN)
  })
})

describe('a whole game played carelessly', () => {
  it('never throws, never loses a lump, never moves the position by chance, and reads back from any instant', () => {
    for (const seed of [1, 2, 3]) {
      let k = new Kingdom(freshGame(null, seed))
      let t = 0
      const start = whole(k.game)
      for (let n = 0; n < 220; n++) {
        const x = ((n * 7.3 + seed) % 38) + 1, y = 1.5 + ((n * 3.7) % 17)
        const before = clone(k.game.ground)
        k.press(x, y, t)
        k.drag((x + 3 + (n % 7)) % 39, 1.5 + ((y + (n % 4)) % 17), (t += 0.1))
        if (n % 9 === 0) k.cancel()
        else k.release()
        if (n % 13 === 5) k.bell()
        for (let f = 0; f < 3; f++) k.step(1 / 30)
        // A lump that has just moved is on its way down: the finger snatches at it and lets go somewhere else, on a machine now and then.
        const falling = k.game.ground.cells.findIndex((kind, i) => LUMPS.includes(kind as (typeof LUMPS)[number]) && before.cells[i] === OPEN)
        if (falling >= 0) {
          k.press((falling % 40) + 0.5, Math.floor(falling / 40) + 0.5, t)
          for (let f = 0; f < 3; f++) k.step(1 / 30)
          const machine = k.game.machines[n % 2]
          if (machine && n % 4 === 0) k.drag(machine.x + 0.5, machine.y + 0.5, (t += 0.1))
          else k.drag((x + 9) % 39, 1.5 + ((y + 6) % 17), (t += 0.1))
          if (n % 5 === 0) k.cancel()
          else k.release()
        }
        for (let f = 0; f < 3; f++) k.step(1 / 30)
        k.drainEvents()
        k.drainRaidEvents()
        t += 0.2
        if (n % 31 === 17) {
          k.putAway()
          k = new Kingdom(saved(k.game))
          expect(k.raid).toBeNull()
          expect(k.scene).toBeNull()
        }
      }
      k.putAway()
      for (let f = 0; f < 300; f++) k.step(1 / 30)
      expect(whole(k.game), `seed ${seed}`).toEqual(start)
      expect(LADDER as readonly string[]).toContain(k.game.position)
      expect(at(k.game.ground, k.game.ant.x, k.game.ant.y)).toBe(OPEN)
    }
  })
})
