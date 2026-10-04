import { describe, expect, it } from 'vitest'
import { BODIES, type KindName } from './bodies'
import { PERSONALITIES } from './clips'
import { LADDER } from './config'
import { marcherGeometry } from './friends'
import { GROUND, farGroundAt, friendX, groundAt, skySlots, viewFor, waitingSpot, FRIEND_SCALE } from './layout'
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

  it('has no friend walk through another, whatever kinds and sizes change places; somebody is on stage in every frame, and the middle is empty no longer than the slowest kind takes to walk to it', () => {
    for (const leaving of KINDS) for (const coming of KINDS) {
      if (leaving === coming) continue
      for (const [out, into] of [[1, 3], [3, 1], [3, 3], [2, 2], [3, 2], [1, 1]] as const) {
        const served = saveOf({ position: 'trio-singles', troop: { kind: leaving, size: out, held: Array.from({ length: out }, () => true) }, sky: [{ colour: leaving, count: 1 }], waiting: { kind: coming, size: into } })
        const theatre = new Theatre(served, 3), { poses, painter } = recorder()
        tapWaiting(theatre)
        let empty = 0, longest = 0
        for (let t = 0; t < 12 && theatre.playing === 'arrival'; t += 1 / 60) {
          theatre.step(1 / 60)
          theatre.paint(painter, VIEW)
          const goers = [...poses].filter(([name]) => name.startsWith('leaving-')), comers = [...poses].filter(([name]) => name.startsWith('friend-'))
          // A friend that walks in is never beside one that marches off, as near as their two bodies are wide, unless one is well behind the other.
          for (const [a, one] of comers) for (const [b, other] of goers) {
            const apart = (BODIES[coming].halfWidth * one.scale + BODIES[leaving].halfWidth * other.scale) * 0.8
            const clear = Math.abs(one.x - other.x) > apart || Math.abs(one.z - other.z) > 1.6 || Math.abs(one.y - other.y) > 2
            expect(clear, `${out} ${leaving}s out, ${into} ${coming}s in, ${t.toFixed(2)} s: ${a} at ${one.x.toFixed(1)}, ${one.z.toFixed(1)} and ${b} at ${other.x.toFixed(1)}, ${other.z.toFixed(1)}`).toBe(true)
          }
          // And none that walks in is inside another that does, once the tower has come apart.
          for (const [a, one] of comers) for (const [b, other] of comers) {
            if (a >= b || theatre.playing !== 'arrival') continue
            const near = Math.abs(one.x - other.x) < BODIES[coming].halfWidth * (one.scale + other.scale) * 0.6 && Math.abs(one.z - other.z) < 0.7 && Math.abs(one.y - other.y) < 0.6
            expect(near, `${into} ${coming}s in, ${t.toFixed(2)} s: ${a} and ${b}`).toBe(false)
          }
          const middle = [...goers, ...comers].some(([, pose]) => Math.abs(pose.x) < VIEW.width / 4)
          empty = middle ? 0 : empty + 1 / 60
          longest = Math.max(longest, empty)
          expect([...goers, ...comers].some(([, pose]) => Math.abs(pose.x) < VIEW.width / 2), `${out} ${leaving}s out, ${into} ${coming}s in, ${t.toFixed(2)} s: nobody in view`).toBe(true)
        }
        // A quick troop is out of the middle in a third of a second, and a hippo takes a second to walk to it from the edge.
        expect(longest, `${out} ${leaving}s out, ${into} ${coming}s in: the longest the middle was empty`).toBeLessThan(1.2)
      }
    }
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
  it('is already coming when a new game opens, with its mark in the save and saved at once; and the child\'s own troop is on stage from the first frame, reaching up under a full sky', () => {
    const fresh = freshSave(2)
    expect(fresh.shown).toEqual({ give: false, each: false, bunch: false })
    const theatre = new Theatre(fresh), { poses, painter, balloons, clear } = recorder()
    expect(theatre.playing).toBe('arrival')
    expect(theatre.save.shown).toEqual({ give: true, each: false, bunch: false })
    expect(theatre.unsaved).toBe(2)
    // Nothing else of the save is touched by it: no draw from the stream, no part of the sky or the parade.
    expect({ ...serializeSave(theatre.save), shown: fresh.shown }).toEqual(serializeSave(fresh))
    // The very first frame: the child's friend stands in its place, large, with both arms up, and every bunch hangs in the sky.
    theatre.paint(painter, VIEW)
    const own = poses.get('friend-0')!
    expect(own.x).toBeCloseTo(friendX(0, 1), 5)
    expect(own.scale).toBeCloseTo(FRIEND_SCALE, 5)
    expect(Math.min(own.armL, own.armR)).toBeGreaterThan(2)
    expect(balloons()).toBeGreaterThanOrEqual(theatre.save.sky.length)
    play(theatre, 0.5)
    clear()
    theatre.paint(painter, VIEW)
    expect(poses.has('passer-0')).toBe(true)
    expect(poses.has('passer-1')).toBe(false)
    // The troop that passes stops to the left of the child's friend, clear of it, and the friend watches it.
    play(theatre, 2)
    theatre.paint(painter, VIEW)
    const passer = poses.get('passer-0')!
    expect(passer.x).toBeLessThan(own.x - 3)
    expect(poses.get('friend-0')!.lookX).toBeLessThan(-0.5)
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

  it('leaves the child free to begin at once on a new game: the sky is on the screen from the first frame, so a touch on a bunch while the troop passes by ends the scene and sends that bunch', () => {
    for (const [age, seed] of [[2, 1], [2, 3], [3, 5], [4, 2], [4, 7]] as const) for (let slot = 0; slot < 5; slot++) {
      const theatre = new Theatre(freshSave(age, seed))
      if (slot >= theatre.sky.length) continue
      play(theatre, 1)
      theatre.sounds.length = 0
      tapSlot(theatre, slot)
      expect(theatre.playing).toBe(null)
      // The bunch hung there when the finger landed: it is squeezed and sent, as any bunch is.
      expect(theatre.sounds.map((sound) => sound.voice)).toEqual(expect.arrayContaining(['squeak', 'letGo']))
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

  /** The names of the friends in front that are in view in the last frame painted: one beyond the edge of the surface is not drawn. */
  const inFront = (poses: Map<string, Pose>) => [...poses.keys()].filter((name) => /^(friend|passer|leaving|waiting)-/.test(name) && Math.abs(poses.get(name)!.x) < VIEW.width / 2 + 1.7)

  it('plays inside the step-in when the first pair comes: the child\'s pair walks in and stands, and the pair that passes stops beside it, to the left and smaller', () => {
    // A solo troop served, with a pair waiting and "one for each" not yet shown.
    const save: Save = { ...troopOf('duck', 1), next: { kind: 'frog', size: 2 }, shown: { give: true, each: false, bunch: false } }
    const theatre = new Theatre(save), { poses, painter } = recorder()
    tapSlot(theatre, 0)
    until(theatre, 'ending')
    until(theatre, null)
    tapWaiting(theatre)
    // The step-in has started and the showing has not: its mark is written when the showing itself starts.
    expect(theatre.save.shown.each, 'not marked by the step-in').toBe(false)
    let most = 0, taking = false, marked = -1, came = -1
    for (let t = 0; t < 14 && theatre.playing === 'arrival'; t += 1 / 60) {
      theatre.step(1 / 60)
      theatre.paint(painter, VIEW)
      most = Math.max(most, inFront(poses).length)
      const first = poses.get('passer-0'), second = poses.get('passer-1'), own = poses.get('friend-0')!
      if (marked < 0 && theatre.save.shown.each) { marked = t; expect(theatre.unsaved, 'saved at once').toBe(2) }
      if (came < 0 && first) came = t
      if (!first || !second) continue
      // Whenever the passing pair is in view, the child's own pair stands in its places.
      if (first.x > -VIEW.width / 2 - 1) expect(own.x, 'the child\'s troop has walked in').toBeCloseTo(friendX(0, 2), 1)
      if (Math.abs(first.x - second.x) > 0 && first.z === 0 && second.z === 0 && first.x > -VIEW.width / 2 && Math.abs(first.armR - second.armR) < 3) {
        // Where they stop: both to the left of the child's left friend, clear of it, and drawn smaller.
        if (second.x < own.x - 1.5 && first.scale < FRIEND_SCALE) taking = true
      }
    }
    expect(taking, 'the passing pair stood to the left of the child\'s pair, smaller').toBe(true)
    // Marked in the step the passing pair came, well after the step-in began.
    expect(marked).toBeGreaterThan(1)
    expect(marked).toBeCloseTo(came, 1)
    // Never more than two troops in front at once.
    expect(most).toBeLessThanOrEqual(6)
    theatre.paint(painter, VIEW)
    expect(poses.has('passer-0')).toBe(false)
  })

  it('still owes a showing that had not started when the game was put away or a touch ended the step-in: the troop is found in its place with no showing playing, and the next step-in that brings the idea shows it', () => {
    const served: Save = { ...troopOf('duck', 1), next: { kind: 'frog', size: 2 }, shown: { give: true, each: false, bunch: false } }
    for (const how of ['put away', 'a touch'] as const) {
      const theatre = new Theatre(served)
      tapSlot(theatre, 0)
      until(theatre, 'ending')
      until(theatre, null)
      tapWaiting(theatre)
      play(theatre, 0.5)
      expect(theatre.save.shown.each).toBe(false)
      let later: Theatre
      if (how === 'put away') {
        // Opened again from what was saved half a second into the step-in.
        later = new Theatre(deserializeSave(JSON.parse(JSON.stringify(serializeSave(theatre.save)))))
        expect(later.playing).toBe(null)
      } else {
        // A touch on the hill ends the step-in with everyone where they were going.
        theatre.press(3, GROUND - 1.2, VIEW)
        theatre.cancel()
        expect(theatre.playing).toBe(null)
        later = theatre
      }
      const { poses, painter } = recorder()
      later.paint(painter, VIEW)
      expect(poses.has('passer-0'), how).toBe(false)
      expect(poses.get('friend-0')!.x, how).toBeCloseTo(friendX(0, 2), 5)
      expect(later.save.shown.each, how).toBe(false)
      // The pair is served, and whatever troop steps in next, the idea is still to be shown if that troop is two or three.
      const again = new Theatre({ ...later.save, troop: { ...later.save.troop, held: [true, true] }, finished: true, next: { kind: 'hippo', size: 2 } })
      tapWaiting(again)
      let shown = false
      for (let t = 0; t < 14 && again.playing === 'arrival'; t += 1 / 60) {
        again.step(1 / 60)
        again.paint(painter, VIEW)
        if (poses.has('passer-0') && poses.has('passer-1')) shown = true
      }
      expect(shown, `${how}: the pair that shows one for each came by at the next step-in`).toBe(true)
      expect(again.save.shown.each, how).toBe(true)
    }
  })

  it('lays the troop that is already coming when a new game opens out for the surface as it is measured: it stops whole inside the left edge on every surface', () => {
    for (const [wide, high] of [[1180, 820], [1024, 768], [820, 1180], [768, 1024], [844, 390], [1366, 1024]] as const) for (const age of [2, 4]) {
      const view = viewFor(wide, high), theatre = new Theatre(freshSave(age)), { poses, painter } = recorder()
      let kind: KindName = 'duck'
      const spy: Painter = { ...painter, place: (name, placed, pose) => { if (name === 'passer-0') kind = placed; painter.place(name, placed, pose) } }
      // Painted on that surface from the first frame, as the game is.
      theatre.paint(spy, view)
      let stood = false
      for (let t = 0; t < 3; t += 1 / 60) {
        theatre.step(1 / 60)
        theatre.paint(spy, view)
        const first = poses.get('passer-0'), own = poses.get('friend-0')!
        if (!first || t < 2) continue
        stood = true
        // Its leftmost friend is whole on the surface, and its rightmost is clear of the child's own.
        const names = [...poses.keys()].filter((name) => name.startsWith('passer-')), half = BODIES[kind].halfWidth * first.scale
        const left = Math.min(...names.map((name) => poses.get(name)!.x)), right = Math.max(...names.map((name) => poses.get(name)!.x))
        expect(left - half, `${wide} by ${high}, a child of ${age}`).toBeGreaterThanOrEqual(-view.width / 2 - 1e-6)
        expect(right + half, `${wide} by ${high}, a child of ${age}`).toBeLessThan(own.x - BODIES[theatre.troop.kind].halfWidth * FRIEND_SCALE + 1e-6)
      }
      expect(stood, `${wide} by ${high}`).toBe(true)
    }
  })

  it('lets the troop that passes by answer a touch before it goes: the scene ends, and the troop squeaks, jumps and hurries off the way it came', () => {
    for (const age of [2, 4]) {
      const theatre = new Theatre(freshSave(age)), { poses, painter } = recorder()
      let kind: KindName = 'duck'
      const spy: Painter = { ...painter, place: (name, placed, pose) => { if (name === 'passer-0') kind = placed; painter.place(name, placed, pose) } }
      play(theatre, 2.5)
      theatre.paint(spy, VIEW)
      const stood = { ...poses.get('passer-0')! }, saved = JSON.stringify(serializeSave(theatre.save))
      expect(theatre.playing).toBe('arrival')
      const at = { x: stood.x, y: stood.y + BODIES[kind].height * stood.scale * 0.5 }
      expect(theatre.hit(at.x, at.y, VIEW)).toEqual({ on: 'passer', friend: 0 })
      theatre.sounds.length = 0
      theatre.press(at.x, at.y, VIEW)
      theatre.release(VIEW)
      // The scene is over, as after any touch, and nothing of the game is changed by it.
      expect(theatre.playing).toBe(null)
      expect(JSON.stringify(serializeSave(theatre.save))).toBe(saved)
      expect(theatre.sounds.map((sound) => sound.voice)).toEqual([`${kind}Poke`])
      // It is still there in the frame of the touch, where it stood, and its answer is seen: it leaves the ground.
      theatre.paint(spy, VIEW)
      expect(poses.get('passer-0')!.x).toBeCloseTo(stood.x, 5)
      let moved = 0, gone = -1
      for (let t = 0; t < 2 && gone < 0; t += 1 / 60) {
        theatre.step(1 / 60)
        theatre.paint(spy, VIEW)
        const now = poses.get('passer-0')
        if (!now) { gone = t; break }
        if (t < 0.28) { moved = Math.max(moved, Math.abs(now.y - stood.y) + Math.abs(now.squash - stood.squash) + Math.abs(now.lean - stood.lean)); expect(now.x, 'it jumps where it stands first').toBeCloseTo(stood.x, 5) }
        // And then back out by the left edge, the way it came.
        else expect(now.x).toBeLessThanOrEqual(stood.x + 1e-6)
      }
      expect(moved, 'its answer is seen').toBeGreaterThan(0.03)
      expect(gone, 'gone within a second or so').toBeGreaterThan(0.3)
      expect(gone).toBeLessThan(1.1)
      // The child's own troop is where it was, and the game goes on: a bunch can be sent.
      expect(poses.get('friend-0')!.x).toBeCloseTo(friendX(0, theatre.troop.size), 5)
      tapSlot(theatre, 0)
      expect(theatre.playing).toBe(null)
      // Touched again while it is still jumping, it squeaks again: every touch on it is answered.
      const again = new Theatre(freshSave(age))
      play(again, 2.5)
      again.press(at.x, at.y, VIEW)
      again.release(VIEW)
      play(again, 0.15)
      again.sounds.length = 0
      expect(again.hit(at.x, at.y, VIEW)).toEqual({ on: 'passer', friend: 0 })
      again.press(at.x, at.y, VIEW)
      again.release(VIEW)
      expect(again.sounds.map((sound) => sound.voice)).toEqual([`${kind}Poke`])
    }
  })

  it('answers a second touch on a troop that is hurrying off, and takes one that was crossing the middle off behind the troop that stands there by then', () => {
    const served = saveOf({ position: 'bunches-own-colour', troop: { kind: 'crab', size: 1, held: [true] }, sky: [{ colour: 'crab', count: 1 }, { colour: 'crab', count: 2 }], waiting: { kind: 'duck', size: 3 } })
    const theatre = new Theatre({ ...served, rng: 2, shown: { give: true, each: true, bunch: false } }), { poses, painter } = recorder()
    let kind: KindName = 'duck'
    const spy: Painter = { ...painter, place: (name, placed, pose) => { if (name === 'passer-1') kind = placed; painter.place(name, placed, pose) } }
    tapWaiting(theatre)
    // Until the three that pass stand in the middle.
    let middle: Pose | undefined
    for (let t = 0; t < 12 && !middle; t += 1 / 60) {
      theatre.step(1 / 60)
      theatre.paint(spy, VIEW)
      const second = poses.get('passer-1')
      if (second && Math.abs(second.x) < 0.05) middle = { ...second }
    }
    expect(middle).toBeDefined()
    expect(theatre.save.shown.bunch).toBe(true)
    const at = { x: middle!.x, y: middle!.y + BODIES[kind].height * middle!.scale * 0.5 }
    expect(theatre.hit(at.x, at.y, VIEW)).toEqual({ on: 'passer', friend: 1 })
    theatre.sounds.length = 0
    theatre.press(at.x, at.y, VIEW)
    theatre.release(VIEW)
    expect(theatre.playing).toBe(null)
    expect(theatre.sounds.map((sound) => sound.voice)).toEqual([`${kind}Poke`])
    // The child's three are in their places at once, and the three that passed are still to be seen.
    theatre.paint(spy, VIEW)
    expect(poses.get('friend-1')!.x).toBeCloseTo(friendX(1, 3), 5)
    expect(poses.has('passer-1')).toBe(true)
    // A second touch, a moment later, where it is now: it squeaks again. By then it has stepped back, behind the three.
    play(theatre, 0.4)
    theatre.paint(spy, VIEW)
    const fleeing = poses.get('passer-0')!
    expect(fleeing.z).toBeLessThan(-2)
    const seen = VIEW.distance / (VIEW.distance - fleeing.z), top = { x: fleeing.x * seen, y: (groundAt(fleeing.x, fleeing.z) + BODIES[kind].height * fleeing.scale * 0.5) * seen }
    theatre.sounds.length = 0
    const under = theatre.hit(top.x, top.y, VIEW)
    theatre.press(top.x, top.y, VIEW)
    theatre.release(VIEW)
    // Where one of the child's own stands in front of it, that friend is the one touched; otherwise the troop that goes answers again.
    if (under.on === 'passer') expect(theatre.sounds.map((sound) => sound.voice)).toEqual([`${kind}Poke`])
    else expect(under.on).toBe('friend')
    let gone = false
    for (let t = 0; t < 1.2 && !gone; t += 1 / 60) { theatre.step(1 / 60); theatre.paint(spy, VIEW); gone = !poses.has('passer-0') }
    expect(gone).toBe(true)
  })

  it('crosses in the middle before a troop of three walks in, which has no room beside it, coming in as the troop before goes out: the middle is never empty for as long as a second', () => {
    // A solo troop served, three waiting under a sky that will hold bunches, and bunches not yet shown.
    for (const rng of [1, 2, 3, 4]) {
      const served = saveOf({ position: 'bunches-own-colour', troop: { kind: 'crab', size: 1, held: [true] }, sky: [{ colour: 'crab', count: 1 }, { colour: 'crab', count: 2 }], waiting: { kind: 'duck', size: 3 } })
      const theatre = new Theatre({ ...served, rng, shown: { give: true, each: true, bunch: false } }), { poses, painter } = recorder()
      tapWaiting(theatre)
      expect(theatre.save.troop.size).toBe(3)
      let most = 0, passed = false, empty = 0, longest = 0
      for (let t = 0; t < 16 && theatre.playing === 'arrival'; t += 1 / 60) {
        theatre.step(1 / 60)
        theatre.paint(painter, VIEW)
        const names = inFront(poses)
        most = Math.max(most, names.length)
        const passers = names.filter((name) => name.startsWith('passer-')).map((name) => poses.get(name)!)
        if (passers.length === 3 && passers.every((pose) => pose.scale === FRIEND_SCALE) && Math.abs(passers[1].x) < 0.2) passed = true
        // Somebody is in the middle of the stage: the troop that goes, the one that passes, or the child's own. One
        // troop goes out as the next comes in, so the middle half is empty only for the moment of that exchange.
        const middle = names.filter((name) => !name.startsWith('waiting-')).some((name) => Math.abs(poses.get(name)!.x) < VIEW.width / 4)
        empty = middle ? 0 : empty + 1 / 60
        longest = Math.max(longest, empty)
      }
      expect(longest, `rng ${rng}: the longest the middle was empty`).toBeLessThan(1)
      expect(passed, 'three passed through the middle, as large as friends in front').toBe(true)
      // Three troops for that moment and no more: the one that goes, the one that passes, and the child's own at the edge.
      expect(most).toBeLessThanOrEqual(9)
      theatre.paint(painter, VIEW)
      expect(poses.get('friend-1')!.x).toBeCloseTo(friendX(1, 3), 5)
    }
  })

})
