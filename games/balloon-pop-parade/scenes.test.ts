import { describe, expect, it } from 'vitest'
import type { KindName } from './bodies'
import { PERSONALITIES } from './clips'
import { LADDER } from './config'
import { marcherGeometry } from './friends'
import { GROUND, farGroundAt, friendX, skySlots, viewFor, waitingSpot } from './layout'
import { saveOf } from './moments'
import type { Pose } from './pose'
import { deserializeSave, freshSave, serializeSave, type Save } from './save'
import { ENDING, FLIGHT, PASS_BY, Theatre, type Painter } from './theatre'
import type { Count } from './world'

// The three short scenes: what each has put in the save by the time it starts, that a touch ends it and is then
// an ordinary touch, and that none replays when the game is opened again.

const VIEW = viewFor(1180, 820)
const KINDS: KindName[] = ['duck', 'frog', 'hippo', 'crab']

function recorder() {
  const poses = new Map<string, Pose>()
  let balloons = 0
  /** The far-off friends of one frame: where each is, and which way it faces. */
  const marchers: { x: number; y: number; z: number; turn: number }[] = []
  const painter: Painter = {
    place: (name, _kind, pose) => void poses.set(name, { ...pose }),
    drop: (name) => void poses.delete(name),
    balloon: () => void (balloons += 1),
    string: () => {},
    shadow: () => {},
    marcher: (_kind, x, y, z, _scale, turn) => void marchers.push({ x, y, z, turn }),
    hand: () => {},
    cloud: () => {},
  }
  return { poses, painter, marchers, balloons: () => balloons, clear: () => { balloons = 0; marchers.length = 0 } }
}

/** A troop of this kind and size with nobody served, under single balloons of its colour and one other. */
function troopOf(kind: KindName, size: Count, position = 'trio-singles'): Save {
  const other: KindName = kind === 'duck' ? 'frog' : 'duck'
  return saveOf({ position, troop: { kind, size, held: Array.from({ length: size }, () => false) }, sky: [{ colour: kind, count: 1 }, { colour: other, count: 1 }, { colour: kind, count: size }], waiting: { kind: other, size: 2 } })
}

const play = (theatre: Theatre, seconds: number) => { for (let t = 0; t < seconds; t += 1 / 60) theatre.step(1 / 60) }
const tapSlot = (theatre: Theatre, slot: number) => {
  const at = skySlots(theatre.sky.length, VIEW)[slot]
  theatre.press(at.x, at.y, VIEW)
  theatre.release(VIEW)
}
const tapWaiting = (theatre: Theatre) => {
  const spot = waitingSpot(0, VIEW)
  theatre.press(spot.x, GROUND + 0.8, VIEW)
  theatre.release(VIEW)
}
/** Plays until a scene of this kind is running, and says how long that took. */
function until(theatre: Theatre, kind: 'ending' | 'arrival' | null, limit = 12): number {
  let waited = 0
  while (theatre.playing !== kind && waited < limit) { theatre.step(1 / 60); waited += 1 / 60 }
  expect(theatre.playing).toBe(kind)
  return waited
}

describe('the march on the spot', () => {
  it('has its outcome in the save when the finger lifts, before it starts: finished, and the position moved once', () => {
    const theatre = new Theatre(troopOf('duck', 1, 'solo-three-colours'))
    tapSlot(theatre, 0)
    expect(theatre.unsaved, 'saved at once').toBe(2)
    expect(theatre.save.finished).toBe(true)
    expect(theatre.save.position).toBe('pair-singles')
    expect(theatre.save.troop.held).toEqual([true])
    const atLift = serializeSave(theatre.save)
    until(theatre, 'ending')
    expect(serializeSave(theatre.save)).toEqual(atLift)
    until(theatre, null)
    expect(serializeSave(theatre.save), 'the scene itself saves nothing more').toEqual(atLift)
  })

  it.each(KINDS)('lasts between five and seven seconds for a troop of %ss of any size, one at a time or all at once', (kind) => {
    for (const size of [1, 2, 3] as const) for (const together of [false, true]) {
      if (together && size === 1) continue
      const theatre = new Theatre(troopOf(kind, size))
      if (together) tapSlot(theatre, 2)
      else for (let i = 0; i < size; i++) { tapSlot(theatre, 0); if (i < size - 1) play(theatre, 1.3) }
      until(theatre, 'ending')
      const lasted = until(theatre, null)
      expect(lasted, `${size}, ${together ? 'together' : 'in turn'}`).toBeGreaterThanOrEqual(ENDING.shortest - 0.05)
      expect(lasted, `${size}, ${together ? 'together' : 'in turn'}`).toBeLessThanOrEqual(ENDING.longest + 0.05)
    }
  })

  it('starts only when the last balloon is in a hand, and has every friend do its proud move in turn when the balloons came one at a time', () => {
    const theatre = new Theatre(troopOf('frog', 3)), { poses, painter } = recorder()
    // Three single balloons, one after another.
    for (let given = 0; given < 2; given++) { tapSlot(theatre, 0); play(theatre, 1.6) }
    tapSlot(theatre, 0)
    const waited = until(theatre, 'ending')
    expect(waited).toBeGreaterThan(FLIGHT)
    // The throat is the frog's proud move: each friend's swells after the one before it, and nobody jumps.
    const swelled: number[] = [-1, -1, -1]
    let together = 0
    for (let t = 0; t < 3.5; t += 1 / 60) {
      theatre.step(1 / 60)
      theatre.paint(painter, VIEW)
      for (let i = 0; i < 3; i++) if (swelled[i] < 0 && poses.get(`friend-${i}`)!.puff > 1.6) swelled[i] = t
      if ([0, 1, 2].every((i) => poses.get(`friend-${i}`)!.y - GROUND > 0.3)) together += 1
    }
    const turns = [...swelled].sort((a, b) => a - b)
    expect(turns[0]).toBeGreaterThanOrEqual(0)
    expect(turns[1]).toBeGreaterThan(turns[0] + 0.3)
    expect(turns[2]).toBeGreaterThan(turns[1] + 0.3)
    expect(together).toBe(0)
  })

  it.each(['duck', 'frog', 'hippo', 'crab'] as const)('has a troop of %ss that one bunch served jump together: all of them off the ground in the same moment, each with its proud move', (kind) => {
    const theatre = new Theatre(troopOf(kind, 3)), { poses, painter } = recorder()
    tapSlot(theatre, 2)
    until(theatre, 'ending')
    // The scene's first beat is the catch that caused it, which is left to finish; then they jump.
    play(theatre, PERSONALITIES[kind].lasts.catch * 0.7)
    let together = 0
    const began: number[] = [-1, -1, -1]
    for (let t = 0; t < 1.2; t += 1 / 60) {
      theatre.step(1 / 60)
      theatre.paint(painter, VIEW)
      const up = [0, 1, 2].map((i) => poses.get(`friend-${i}`)!.y - GROUND)
      up.forEach((high, i) => { if (began[i] < 0 && high > 0.08) began[i] = t })
      if (up.every((high) => high > 0.3)) together += 1
    }
    // In the air together for a good part of the jump, and off the ground within a frame of one another.
    expect(together).toBeGreaterThan(8)
    expect(Math.max(...began) - Math.min(...began)).toBeLessThanOrEqual(2 / 60)
  })

  it.each(['duck', 'frog', 'hippo', 'crab'] as const)('has only the %ss that one bunch served jump together: one served before them by a balloon of its own takes its turn first, and stays on the ground', (kind) => {
    const other: KindName = kind === 'duck' ? 'frog' : 'duck'
    const theatre = new Theatre(saveOf({ position: 'bunches-own-colour', troop: { kind, size: 3, held: [false, false, false] }, sky: [{ colour: kind, count: 1 }, { colour: kind, count: 2 }], waiting: { kind: other, size: 1 } }))
    const actors = () => (theatre as unknown as { actors: { clip: string | null; jumpAt?: number }[] }).actors
    tapSlot(theatre, 0)
    play(theatre, 2.5)
    tapSlot(theatre, 1)
    expect(theatre.troop.held).toEqual([true, true, true])
    until(theatre, 'ending')
    const proud = [-1, -1, -1]
    for (let i = 0; i < 60 * 4; i++) {
      theatre.step(1 / 60)
      actors().forEach((actor, friend) => { if (proud[friend] < 0 && actor.clip === 'proud') proud[friend] = i })
    }
    // The one that was given a balloon by itself has its turn, and does not jump.
    expect(actors()[0].jumpAt).toBeUndefined()
    expect(proud[0]).toBeGreaterThanOrEqual(0)
    // The two that the bunch served jump in the same moment, after that turn has begun.
    expect(actors()[1].jumpAt).toBeDefined()
    expect(actors()[1].jumpAt).toBe(actors()[2].jumpAt)
    expect(proud[1]).toBe(proud[2])
    expect(proud[1]).toBeGreaterThan(proud[0] + 10)
  })

  /** The order in which the friends of a frog troop swell their throats, which is the frog's proud move. */
  const turnsOf = (theatre: Theatre, size: number): number[] => {
    const { poses, painter } = recorder(), swelled: number[] = Array.from({ length: size }, () => -1)
    for (let t = 0; t < 3.5; t += 1 / 60) {
      theatre.step(1 / 60)
      theatre.paint(painter, VIEW)
      for (let i = 0; i < size; i++) if (swelled[i] < 0 && poses.get(`friend-${i}`)!.puff > 1.6) swelled[i] = t
    }
    return swelled.map((at, i) => ({ at, i })).sort((a, b) => a.at - b.at).map((turn) => turn.i)
  }

  it('gives the friends their turns in the order the balloons were taken, a popped and refilled one last', () => {
    const theatre = new Theatre(troopOf('frog', 3)), { poses, painter } = recorder()
    tapSlot(theatre, 0)
    play(theatre, 1.3)
    tapSlot(theatre, 0)
    play(theatre, 1.3)
    // The first friend's balloon is popped, and the third is served before the first is served again.
    theatre.paint(painter, VIEW)
    theatre.press(friendX(0, 3) + 0.7, GROUND + 4, VIEW)
    theatre.release(VIEW)
    expect(theatre.save.troop.held).toEqual([false, true, false])
    play(theatre, 1.3)
    tapSlot(theatre, 0)
    play(theatre, 1.3)
    tapSlot(theatre, 0)
    expect(theatre.save.troop.held).toEqual([true, true, true])
    until(theatre, 'ending')
    expect(poses.size).toBeGreaterThan(0)
    // The rules hand balloons out from the left, so the first friend took the third balloon and the third friend the last.
    expect(turnsOf(theatre, 3)).toEqual([1, 0, 2])
  })

  it('after a load has those who already held a balloon go first, as they stand, and those served since follow', () => {
    const before = new Theatre(troopOf('frog', 3))
    tapSlot(before, 0)
    play(before, 1.3)
    const found = deserializeSave(JSON.parse(JSON.stringify(serializeSave(before.save))))
    // Opened again with the first friend served; its balloon is popped and it is served last.
    const theatre = new Theatre({ ...found, troop: { ...found.troop, held: [false, true, true] } })
    tapSlot(theatre, 0)
    until(theatre, 'ending')
    expect(turnsOf(theatre, 3)).toEqual([1, 2, 0])
  })

  it('gives way to a touch, which is then an ordinary touch', () => {
    const theatre = new Theatre(troopOf('hippo', 1))
    tapSlot(theatre, 0)
    until(theatre, 'ending')
    play(theatre, 0.8)
    theatre.sounds.length = 0
    // A poke at the friend in the middle of its ending: the scene is over, and the poke is answered as any poke is.
    theatre.press(0, GROUND + 1, VIEW)
    expect(theatre.playing).toBe(null)
    expect(theatre.sounds.map((sound) => sound.voice)).toEqual(['hippoPoke', 'stringHum'])
    theatre.release(VIEW)
    play(theatre, 3)
    expect(theatre.playing, 'it does not start again').toBe(null)
  })

  it('plays again when a troop already served is filled again after a pop, and saves nothing more', () => {
    const theatre = new Theatre(troopOf('crab', 1)), { poses, painter } = recorder()
    tapSlot(theatre, 0)
    until(theatre, 'ending')
    until(theatre, null)
    const judged = serializeSave(theatre.save)
    theatre.paint(painter, VIEW)
    theatre.press(friendX(0, 1) + 0.7, GROUND + 4, VIEW)
    theatre.release(VIEW)
    expect(theatre.save.troop.held).toEqual([false])
    expect(theatre.save.position).toBe(judged.position)
    tapSlot(theatre, 0)
    until(theatre, 'ending')
    expect(serializeSave(theatre.save)).toEqual(judged)
    expect(poses.size).toBeGreaterThan(0)
  })

  it('does not replay when the game is opened again: the troop is found standing with its balloons', () => {
    const theatre = new Theatre(troopOf('duck', 2))
    tapSlot(theatre, 2)
    until(theatre, 'ending')
    play(theatre, 1)
    const reopened = new Theatre(deserializeSave(JSON.parse(JSON.stringify(serializeSave(theatre.save)))))
    expect(reopened.playing).toBe(null)
    play(reopened, 3)
    expect(reopened.playing).toBe(null)
    expect(reopened.save.troop.held).toEqual([true, true])
  })
})

describe('the step-in', () => {
  const served = () => {
    const theatre = new Theatre(troopOf('duck', 2))
    tapSlot(theatre, 2)
    until(theatre, 'ending')
    until(theatre, null)
    theatre.unsaved = 0
    return theatre
  }

  it('only makes the waiting troop wave before the troop on screen is served, and changes nothing', () => {
    const theatre = new Theatre(troopOf('duck', 2)), before = serializeSave(theatre.save)
    tapWaiting(theatre)
    expect(theatre.playing).toBe(null)
    expect(serializeSave(theatre.save)).toEqual(before)
    expect(theatre.unsaved).toBe(0)
  })

  it('only makes the waiting troop wave while the bunch that serves the last friend is in the air and until the ending has begun, so the ending always plays', () => {
    const theatre = new Theatre(troopOf('duck', 2))
    tapSlot(theatre, 2)
    // The lift served the troop, and the save says so; the bunch is still on its way.
    expect(theatre.save.finished).toBe(true)
    const before = serializeSave(theatre.save)
    for (const wait of [0.1, 0.3, 0.3]) {
      play(theatre, wait)
      if (theatre.playing === 'ending') break
      tapWaiting(theatre)
      expect(theatre.playing).not.toBe('arrival')
      expect(serializeSave(theatre.save)).toEqual(before)
    }
    until(theatre, 'ending')
    // Once it plays, the touch ends it and is then an ordinary touch: the troop steps in.
    tapWaiting(theatre)
    expect(theatre.playing).toBe('arrival')
  })

  it('has everything it changes in the save when it starts, saved at once', () => {
    const theatre = served(), before = serializeSave(theatre.save)
    tapWaiting(theatre)
    expect(theatre.playing).toBe('arrival')
    expect(theatre.unsaved).toBe(2)
    const after = serializeSave(theatre.save)
    // Every field the sheet lists for the scene's start.
    expect(after.parade).toEqual([...before.parade, { kind: 'duck', size: 2, balloons: 2 }])
    expect(after.troop).toEqual({ kind: before.next.kind, size: before.next.size, held: [false, false] })
    expect(after.next.kind).not.toBe(after.troop.kind)
    expect(after.sky).not.toEqual(before.sky)
    expect(after.slips).toBe(0)
    expect(after.finished).toBe(false)
    expect(after.rng).not.toBe(before.rng)
    expect(LADDER).toContain(after.position)
    until(theatre, null)
    expect(serializeSave(theatre.save), 'the scene itself saves nothing more').toEqual(after)
  })

  it('takes about three seconds when no new idea comes with it', () => {
    const theatre = served()
    tapWaiting(theatre)
    const lasted = until(theatre, null)
    expect(lasted).toBeGreaterThan(2)
    expect(lasted).toBeLessThan(4.2)
  })

  it('marches the served troop off, walks the next one in from the edge, and brings another to the edge', () => {
    const theatre = served(), { poses, painter } = recorder()
    tapWaiting(theatre)
    play(theatre, 0.5)
    theatre.paint(painter, VIEW)
    expect(poses.get('leaving-0')!.x).toBeGreaterThan(friendX(0, 2))
    expect(poses.has('waiting-0'), 'the troop after next is not there yet').toBe(false)
    const start = poses.get('friend-0')!.x
    play(theatre, 0.7)
    theatre.paint(painter, VIEW)
    expect(poses.get('friend-0')!.x).toBeGreaterThan(start)
    until(theatre, null)
    theatre.paint(painter, VIEW)
    expect(poses.has('leaving-0')).toBe(false)
    expect(poses.get('friend-0')!.x).toBeCloseTo(friendX(0, theatre.save.troop.size), 5)
    expect(poses.get('friend-0')!.armL, 'it reaches up').toBeGreaterThan(2)
    expect(poses.has('waiting-0')).toBe(true)
  })

  it('gives way to a touch: everyone is where they were going, and the touch is answered', () => {
    const theatre = served(), { poses, painter } = recorder()
    tapWaiting(theatre)
    play(theatre, 0.3)
    const saved = serializeSave(theatre.save)
    theatre.sounds.length = 0
    tapSlot(theatre, 0)
    expect(theatre.playing).not.toBe('arrival')
    theatre.paint(painter, VIEW)
    expect(poses.has('leaving-0')).toBe(false)
    expect(poses.get('friend-0')!.x).toBeCloseTo(friendX(0, saved.troop.size), 5)
    expect(poses.has('waiting-0')).toBe(true)
    // The touch that ended it is answered as a touch on what was on the screen when it landed. The new sky was not:
    // the bunch that the end of the scene hangs in that place is not sent by a finger that never saw it.
    expect(theatre.sounds.length).toBeGreaterThan(0)
    expect(theatre.sounds.map((sound) => sound.voice)).not.toContain('letGo')
    expect(serializeSave(theatre.save)).toEqual(saved)
    // It hangs there now, and the next touch on it sends it.
    tapSlot(theatre, 0)
    expect(theatre.sounds.map((sound) => sound.voice)).toContain('letGo')
    expect(serializeSave(theatre.save)).not.toEqual(saved)
  })

  it('does not replay when the game is opened again in the middle of it', () => {
    const theatre = served()
    tapWaiting(theatre)
    play(theatre, 0.4)
    const reopened = new Theatre(deserializeSave(JSON.parse(JSON.stringify(serializeSave(theatre.save))))), { poses, painter } = recorder()
    expect(reopened.playing).toBe(null)
    reopened.paint(painter, VIEW)
    expect(poses.has('leaving-0')).toBe(false)
    expect(poses.get('friend-0')!.x).toBeCloseTo(friendX(0, reopened.save.troop.size), 5)
  })
})

describe('a troop that marched off with a balloon missing', () => {
  it('walks the far hill as it left: the friend without a balloon with its arms down, as it walks in front, and the others with a hand up', () => {
    for (const kind of KINDS) {
      const theatre = new Theatre(saveOf({ position: 'pair-singles', troop: { kind, size: 3, held: [true, true, false] }, sky: [{ colour: kind, count: 1 }], waiting: { kind: kind === 'duck' ? 'frog' : 'duck', size: 1 } }))
      // Served before, by the look of the save, and one balloon popped since.
      const served = new Theatre({ ...theatre.save, finished: true })
      tapWaiting(served)
      expect(served.save.parade).toEqual([{ kind, size: 3, balloons: 2 }])
      play(served, 14)
      const far: { kind: string; holds: boolean | undefined }[] = []
      const painter: Painter = { place: () => {}, drop: () => {}, balloon: () => {}, string: () => {}, shadow: () => {}, marcher: (of, _x, _y, _z, _scale, _turn, _lean, holds) => void far.push({ kind: of, holds }), hand: () => {}, cloud: () => {} }
      served.paint(painter, VIEW)
      expect(far.map((friend) => friend.kind)).toEqual([kind, kind, kind])
      expect(far.map((friend) => friend.holds)).toEqual([true, true, false])
    }
  })

  it('has a shape for it: a duck, a frog and a hippo without a balloon carry their right arm lower than one that holds its string, and a crab keeps its claws up', () => {
    // The two shapes differ in the string arm alone, so the mean height of all their points tells which way it hangs.
    const height = (kind: KindName, holds: boolean) => {
      const geometry = marcherGeometry(kind, holds), at = geometry.getAttribute('position')
      let sum = 0
      for (let i = 0; i < at.count; i++) sum += at.getY(i)
      geometry.dispose()
      return sum / at.count
    }
    for (const kind of KINDS) {
      if (kind === 'crab') expect(height(kind, false)).toBeCloseTo(height(kind, true), 6)
      else expect(height(kind, false), kind).toBeLessThan(height(kind, true) - 0.01)
    }
  })
})

describe('the pass-by', () => {
  it('is already crossing when a new game opens, with its mark in the save and saved at once', () => {
    const fresh = freshSave(2)
    expect(fresh.shown).toEqual({ give: false, each: false, bunch: false })
    const theatre = new Theatre(fresh), { poses, painter } = recorder()
    expect(theatre.playing).toBe('arrival')
    expect(theatre.save.shown).toEqual({ give: true, each: false, bunch: false })
    expect(theatre.unsaved).toBe(2)
    // Nothing else of the save is touched by it: no draw from the stream, no part of the sky or the parade.
    expect({ ...serializeSave(theatre.save), shown: fresh.shown }).toEqual(serializeSave(fresh))
    play(theatre, 0.5)
    theatre.paint(painter, VIEW)
    expect(poses.has('passer-0')).toBe(true)
    expect(poses.has('passer-1')).toBe(false)
  })

  it('shows one for each to a child whose first visit opens on a pair: a pair crosses and both marks are set', () => {
    const theatre = new Theatre(freshSave(4)), { poses, painter } = recorder()
    expect(theatre.save.position).toBe('pair-singles')
    expect(theatre.save.shown).toEqual({ give: true, each: true, bunch: false })
    play(theatre, 0.5)
    theatre.paint(painter, VIEW)
    expect(poses.has('passer-0') && poses.has('passer-1')).toBe(true)
  })

  it('takes four to six seconds to cross, and then the child\'s own troop walks in and the sky fills', () => {
    for (const [age, seed] of [[2, 1], [2, 2], [2, 3], [2, 5], [4, 1], [4, 2], [4, 3], [4, 5], [2, undefined], [4, undefined]] as const) {
      const theatre = new Theatre(freshSave(age, seed)), { poses, painter, marchers, balloons, clear } = recorder()
      // The pass is the troop crossing in front and then going over the far hill, where nobody else is yet in a new game.
      let crossed = 0, size = 0, far = 0, highest = -Infinity, first: { x: number; z: number } | null = null, last: { x: number; z: number; turn: number } | null = null
      for (; crossed < 12; crossed += 1 / 60) {
        theatre.step(1 / 60)
        clear()
        theatre.paint(painter, VIEW)
        if (poses.has('passer-0')) {
          size = [...poses.keys()].filter((name) => name.startsWith('passer-')).length
          expect(marchers, 'nobody is on the far hill while the troop is still in front').toHaveLength(0)
          continue
        }
        far = Math.max(far, marchers.length)
        if (marchers.length === 0 && first) break
        if (marchers.length > 0) {
          first = first ?? { x: marchers[0].x, z: marchers[0].z }
          last = { ...marchers[0] }
          highest = Math.max(highest, ...marchers.map((marcher) => marcher.y))
        }
      }
      expect(crossed, `age ${age}, seed ${seed}`).toBeGreaterThanOrEqual(PASS_BY.shortest)
      expect(crossed, `age ${age}, seed ${seed}`).toBeLessThanOrEqual(PASS_BY.longest)
      // Every friend of it was seen on the far hill at once, and it went over the top: up, away from the child, and down behind.
      expect(far, `age ${age}, seed ${seed}`).toBe(size)
      expect(last!.z).toBeLessThan(first!.z - 5)
      expect(highest).toBeGreaterThan(farGroundAt(last!.x, last!.z) + 3)
      // It faces the way it goes, which is away.
      expect(Math.cos(last!.turn)).toBeLessThan(-0.9)
      until(theatre, null)
      play(theatre, 1.5)
      clear()
      theatre.paint(painter, VIEW)
      expect(poses.get('friend-0')!.x).toBeCloseTo(friendX(0, theatre.save.troop.size), 5)
      expect(balloons()).toBe(theatre.save.sky.length)
      expect(poses.has('waiting-0')).toBe(true)
    }
  })

  it('takes a bunch for the whole troop in its kind\'s own row, as the child\'s own troop does: passing hippos honk one after another, stepping down, and passing frogs twang together and slurp', () => {
    const seen = new Set<string>()
    for (let rng = 1; rng <= 60; rng++) for (const waiting of ['duck', 'frog'] as const) {
      // A friend alone with its balloon, and a troop of three at the edge under a sky that will hold bunches: the
      // step-in brings the first showing of a bunch, by three of another kind.
      const served = saveOf({ position: 'bunches-own-colour', troop: { kind: 'crab', size: 1, held: [true] }, sky: [{ colour: 'crab', count: 1 }, { colour: 'crab', count: 2 }], waiting: { kind: waiting, size: 3 } })
      const theatre = new Theatre({ ...served, rng, shown: { give: true, each: true, bunch: false } })
      tapWaiting(theatre)
      expect(theatre.save.shown.bunch).toBe(true)
      let took: { voice: string; after: number; pitch: number }[] = []
      for (let i = 0; i < 60 * 8 && took.length === 0; i++) {
        theatre.sounds.length = 0
        theatre.step(1 / 60)
        if (theatre.sounds.some((sound) => sound.voice.endsWith('Catch'))) took = theatre.sounds.filter((sound) => sound.voice.endsWith('Catch') || sound.voice === 'frogSlurp').map((sound) => ({ voice: sound.voice, after: sound.after ?? 0, pitch: sound.pitch ?? 1 }))
      }
      const kind = took[0].voice.replace('Catch', '')
      seen.add(kind)
      const catches = took.filter((sound) => sound.voice.endsWith('Catch'))
      expect(catches).toHaveLength(3)
      if (kind === 'hippo') {
        // One after another, as far apart as the child's own hippos, and each lower than the one before.
        expect(catches[1].after - catches[0].after).toBeCloseTo(0.17, 5)
        expect(catches[2].after - catches[1].after).toBeCloseTo(0.17, 5)
        expect(catches[1].pitch).toBeLessThan(catches[0].pitch)
        expect(catches[2].pitch).toBeLessThan(catches[1].pitch)
      }
      if (kind === 'frog') {
        // On top of one another, and then the slurp.
        expect(catches[2].after - catches[0].after).toBeLessThan(0.1)
        expect(took.filter((sound) => sound.voice === 'frogSlurp')).toHaveLength(1)
      } else expect(took.filter((sound) => sound.voice === 'frogSlurp')).toHaveLength(0)
    }
    expect([...seen]).toEqual(expect.arrayContaining(['hippo', 'frog']))
  })

  it('answers a touch on what hangs low for the passing troop as a balloon: it pops under the finger, and the scene is over', () => {
    const theatre = new Theatre(freshSave(2, 5))
    play(theatre, 1.2)
    expect(theatre.playing).toBe('arrival')
    const inside = theatre as unknown as { passer: unknown; lowFor: (passer: unknown) => { x: number; y: number }[]; scraps: unknown[] }
    const low = inside.lowFor(inside.passer)[0], saved = serializeSave(theatre.save)
    theatre.sounds.length = 0
    theatre.press(low.x, low.y, VIEW)
    theatre.release(VIEW)
    expect(theatre.sounds.map((sound) => sound.voice)).toEqual(['pop'])
    expect(inside.scraps.length).toBeGreaterThan(0)
    expect(theatre.playing).toBe(null)
    expect(serializeSave(theatre.save)).toEqual(saved)
  })

  it('sends nothing that was not on the screen: a touch on a place of the sky while a troop passes by ends the scene and counts no slip, wherever it lands', () => {
    for (const [age, seed] of [[2, 1], [2, 3], [3, 5], [4, 2], [4, 7]] as const) for (let slot = 0; slot < 5; slot++) {
      const theatre = new Theatre(freshSave(age, seed))
      if (slot >= theatre.sky.length) continue
      play(theatre, 1)
      const saved = serializeSave(theatre.save)
      theatre.sounds.length = 0
      tapSlot(theatre, slot)
      expect(theatre.playing).toBe(null)
      // It is answered, and no bunch leaves the sky: none hung there when the finger landed.
      expect(theatre.sounds.length).toBeGreaterThan(0)
      expect(theatre.sounds.map((sound) => sound.voice)).not.toContain('letGo')
      expect(serializeSave(theatre.save)).toEqual(saved)
      expect(theatre.save.slips).toBe(0)
    }
  })

  it('is never the kind the child is about to serve, and takes what hangs low for it', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const fresh = freshSave(3, seed), theatre = new Theatre(fresh), kinds: string[] = []
      const painter: Painter = { place: (name, kind) => { if (name === 'passer-0') kinds.push(kind) }, drop: () => {}, balloon: () => {}, string: () => {}, shadow: () => {}, marcher: () => {}, hand: () => {}, cloud: () => {} }
      play(theatre, 0.3)
      theatre.paint(painter, VIEW)
      expect(kinds[0]).not.toBe(fresh.troop.kind)
      const p = PERSONALITIES[kinds[0] as KindName]
      play(theatre, p.walk + 0.6)
      expect(theatre.sounds.map((sound) => sound.voice)).toContain(`${kinds[0]}Catch`)
    }
  })

  it('gives way to a touch and is not shown again, not on a later troop and not when the game is opened again', () => {
    const theatre = new Theatre(freshSave(2)), { poses, painter } = recorder()
    play(theatre, 1)
    theatre.press(0, 0.3, VIEW)
    theatre.release(VIEW)
    expect(theatre.playing).toBe(null)
    theatre.paint(painter, VIEW)
    expect(poses.has('passer-0')).toBe(false)
    expect(poses.get('friend-0')!.x).toBeCloseTo(0, 5)
    const reopened = new Theatre(deserializeSave(JSON.parse(JSON.stringify(serializeSave(theatre.save))), 2))
    expect(reopened.playing).toBe(null)
  })

  it('plays inside the step-in when the first pair comes, before the child\'s troop walks in', () => {
    // A solo troop served, with a pair waiting and "one for each" not yet shown.
    const save: Save = { ...troopOf('duck', 1), next: { kind: 'frog', size: 2 }, shown: { give: true, each: false, bunch: false } }
    const theatre = new Theatre(save), { poses, painter } = recorder()
    tapSlot(theatre, 0)
    until(theatre, 'ending')
    until(theatre, null)
    tapWaiting(theatre)
    expect(theatre.save.shown.each, 'marked when the scene starts').toBe(true)
    play(theatre, 2.2)
    theatre.paint(painter, VIEW)
    expect(poses.has('passer-0') && poses.has('passer-1')).toBe(true)
    // The child's own troop is still at the edge, where it waited.
    expect(poses.get('friend-0')!.x).toBeLessThan(friendX(0, 2) - 2)
    until(theatre, null)
    theatre.paint(painter, VIEW)
    expect(poses.has('passer-0')).toBe(false)
  })
})
