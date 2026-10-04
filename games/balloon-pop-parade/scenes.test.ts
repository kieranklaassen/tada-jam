import { describe, expect, it } from 'vitest'
import type { KindName } from './bodies'
import { PERSONALITIES } from './clips'
import { LADDER } from './config'
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
    tapSlot(theatre, 0)
    expect(theatre.playing).not.toBe('arrival')
    theatre.paint(painter, VIEW)
    expect(poses.has('leaving-0')).toBe(false)
    expect(poses.get('friend-0')!.x).toBeCloseTo(friendX(0, saved.troop.size), 5)
    expect(poses.has('waiting-0')).toBe(true)
    // The touch that ended it sent the bunch it landed on.
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
