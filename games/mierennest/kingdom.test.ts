import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { EARTH, LUMPS, MOUTH, MUD, OPEN, STONE, at, clone, count, equal, put, settle } from './ground'
import { Kingdom, LAST_BUILT, SCENE_SECONDS, type KingdomEvent } from './kingdom'
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

  it('does not move the position past the last place this build plays', () => {
    const k = new Kingdom(nestGame(LAST_BUILT, 3))
    k.game.shown.push('ant', 'beetle', 'fly', 'catapult', 'cannon')
    // A crawl one cell high with a mud floor: no ant, beetle or fly gets through it.
    put(k.game.ground, 24, 4, EARTH)
    put(k.game.ground, 25, 4, EARTH)
    put(k.game.ground, 26, 4, EARTH)
    put(k.game.ground, 24, 5, OPEN)
    k.bell()
    const events = settleAll(k)
    expect(events.find((e) => e.type === 'judged')).toEqual({ type: 'judged', verdict: 'well' })
    expect(k.game.position).toBe(LAST_BUILT)
    expect(LADDER.indexOf(LAST_BUILT)).toBe(LADDER.indexOf('dung-scout') - 1)
  })
})

describe('first showings', () => {
  it('owes the first kind at the first touch of a first visit, marks it as it starts, and never shows it again', () => {
    const k = new Kingdom(nestGame())
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
        k.press(x, y, t)
        k.drag((x + 3 + (n % 7)) % 39, 1.5 + ((y + (n % 4)) % 17), (t += 0.1))
        if (n % 9 === 0) k.cancel()
        else k.release()
        if (n % 13 === 5) k.bell()
        for (let f = 0; f < 6; f++) k.step(1 / 30)
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
