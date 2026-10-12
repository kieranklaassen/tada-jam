import { describe, expect, it } from 'vitest'
import { BARE, FRAME, GRIP, KNOB, carry, fresh, piece, runTo } from './drive'
import { DIAL, RELEASE, RING, rackPoint, slotPoint } from './layout'
import { Toy } from './toy'

// Parked equals loaded. Whatever the loop was in the middle of when it was
// put away, what is found is what a load of its save would make: the loop as
// built, from its first beat, with nothing in a hand, nothing under way and no
// timer running.

/** Everything a loop holds, as plain data: the private parts too, with "never" kept apart from nothing. */
function whole(toy: Toy): string {
  return JSON.stringify(toy, (_key, value: unknown) => {
    if (value === Infinity) return 'never'
    if (value === -Infinity) return 'never before'
    if (value instanceof Set) return [...value]
    if (value instanceof Map) return [...value.entries()]
    if (typeof value === 'function') return 'does'
    return value
  })
}

const pull = (toy: Toy, share: number) => {
  toy.press(GRIP)
  toy.drag(GRIP, { x: GRIP.x, y: GRIP.y + RELEASE.travel * share })
}

/** Every state a loop can be put away in, by name. */
const STATES: Record<string, () => Toy> = {
  'at rest': () => fresh(100, [4, 9]),
  'in a jump': () => { const toy = fresh(120, [8]); runTo(toy, 4.4); return toy },
  'with a tap held for the next place': () => { const toy = fresh(); runTo(toy, 3.8); toy.press(BARE); return toy },
  'kicking in the air': () => { const toy = fresh(60); runTo(toy, 2.02); toy.press(BARE); runTo(toy, 2.3); toy.press(BARE); return toy },
  'with a piece from the rack in the hand': () => { const toy = fresh(); toy.press(rackPoint(2)); toy.drag(rackPoint(2), slotPoint(4)); return toy },
  'with a piece from the track in the hand': () => { const toy = fresh(120, [], [piece('wall', 3)]); toy.press(slotPoint(3)); toy.drag(slotPoint(3), { x: 130, y: 300 }); return toy },
  'with a finger pressed on a piece': () => { const toy = fresh(120, [], [piece('wall', 3)]); toy.press(slotPoint(3)); return toy },
  'with the dial under a finger, turned': () => { const toy = fresh(100); toy.press(KNOB); toy.drag(KNOB, { x: DIAL.x, y: DIAL.y + 40 }); return toy },
  'with the release pulled past its catch': () => { const toy = fresh(120, [4, 9]); pull(toy, 1); return toy },
  'with the release let go and springing back': () => { const toy = fresh(120, [4]); pull(toy, 0.3); toy.endDrag(true); toy.step(FRAME); return toy },
  'with springs a touch dropped still falling': () => { const toy = fresh(120, Array.from({ length: 64 }, (_, sp) => sp)); pull(toy, 1); toy.endDrag(true); for (let i = 0; i < 10; i++) toy.step(FRAME); toy.press(BARE); for (let i = 0; i < 6; i++) toy.step(FRAME); return toy },
  'with the pigeon on its way home from a lap a touch ended': () => { const toy = fresh(120, Array.from({ length: 16 }, (_, beat) => beat * 2)); runTo(toy, 35.5); toy.press(BARE); toy.step(FRAME); return toy },
  'in a clear-out': () => { const toy = fresh(120, Array.from({ length: 64 }, (_, sp) => sp)); pull(toy, 1); toy.endDrag(true); for (let i = 0; i < 10; i++) toy.step(FRAME); return toy },
  'in the pigeon\'s lap': () => { const toy = fresh(160, Array.from({ length: 16 }, (_, beat) => beat * 2)); runTo(toy, 35.3); return toy },
  'split in two': () => { const toy = fresh(120, [8], [piece('splitter', 2)]); runTo(toy, 4.5); return toy },
  'hushed in a pipe': () => { const toy = fresh(120, [], [piece('tunnel', 2)]); runTo(toy, 5.2); return toy },
  'on the rim of a mouth': () => { const toy = fresh(120, [4], [piece('tunnel', 3)]); runTo(toy, 3.1); return toy },
  'flat on a wall': () => { const toy = fresh(160, [], [piece('wall', 3)]); runTo(toy, 3.3); return toy },
  'thrown by a flip': () => { const toy = fresh(120, [], [piece('flip', 3)]); runTo(toy, 3.5); return toy },
  'on the ceiling': () => { const toy = fresh(120, [], [piece('flip', 3)]); runTo(toy, 6.2); toy.press(BARE); runTo(toy, 7.5); return toy },
  'with a piece sliding down the wall': () => { const toy = fresh(); toy.press(rackPoint(0)); toy.drag(rackPoint(0), { x: 130, y: 300 }); toy.endDrag(true); toy.step(FRAME); return toy },
  'with a hat on the pigeon': () => { const toy = fresh(60); runTo(toy, 0.6); toy.press(rackPoint(0)); toy.drag(rackPoint(0), { x: RING.x, y: RING.y }); toy.endDrag(true); return toy },
  'with a piece under the rat\'s nose': () => { const toy = fresh(); toy.press(rackPoint(1)); toy.drag(rackPoint(1), { x: 140, y: 600 }); toy.endDrag(true); toy.step(FRAME); return toy },
  'with twins about to be zipped into one': () => { const toy = fresh(120, [], [piece('splitter', 1), piece('splitter', 3)]); runTo(toy, 3.05); return toy },
  'after a long visit': () => { const toy = fresh(140, [3, 20, 41], [piece('drum', 1), piece('chime', 6, true), piece('flip', 8), piece('splitter', 10), piece('tunnel', 12), piece('wall', 14)]); runTo(toy, 200); carry(toy, 'wall', 6); return toy },
}

describe('parked equals loaded', () => {
  for (const [name, make] of Object.entries(STATES)) {
    it(`${name}: what is found is what a load of its save makes`, () => {
      const toy = make()
      const save = JSON.parse(JSON.stringify(toy.toSave())) as ReturnType<Toy['toSave']>
      const found = toy.settled(11)
      expect(whole(found)).toBe(whole(new Toy(save, 11)))
      // And the save is not changed by settling: nothing was done for the child on the way out.
      expect(found.toSave()).toEqual(save)
    })
  }

  it('finds nothing in a hand, nothing under way and nothing pending, whatever it was put away in', () => {
    for (const [name, make] of Object.entries(STATES)) {
      const found = make().settled(11)
      expect(found.pos, name).toBe(0)
      expect(found.runners, name).toHaveLength(1)
      expect(found.blob, name).toMatchObject({ air: null, flight: null, stuck: null, hushed: false, ceiling: false, twin: false })
      expect(found.held, name).toBeNull()
      expect(found.hand, name).toBeNull()
      expect(found.clearing, name).toBeNull()
      expect(found.lap, name).toBeNull()
      expect(found.sceneEnded, name).toBe(false)
      expect(found.release, name).toMatchObject({ held: false, pull: 0 })
      expect(found.dial.held, name).toBe(false)
      expect(found.cast.pigeon.hat, name).toBeNull()
      expect(found.fx, name).toEqual([])
      expect(found.ghosts, name).toEqual([])
      expect(found.changed, name).toBe(0)
      expect(found.take(), name).toEqual([])
    }
  })

  it('has no timer that is full on load: every age is "never", so nothing is drawn answering and nothing sounds', () => {
    const found = fresh(120, [4], [piece('drum', 3)]).settled(11)
    for (const ages of [found.fired, found.ducked, found.laid, found.flashed, found.set, found.rack]) for (const age of ages) expect(age).toBe(Infinity)
    for (const hit of found.hits) expect(hit.age).toBe(Infinity)
    for (const who of Object.values(found.cast)) for (const [key, value] of Object.entries(who)) if (typeof value === 'number' && key !== 'lookX' && key !== 'lookY') expect(value, key).toBe(Infinity)
    for (const who of [found.cast.pigeon, found.cast.rat, found.cast.cat, found.cast.neighbour]) expect(who.habit).toEqual({ kind: -1, age: Infinity })
    // Nothing happens by itself in the first moments but the loop running.
    expect(runTo(found, 0.45)).toEqual([])
  })

  it('keeps the tempo the finger found when it is put away with the dial turned under a finger', () => {
    const toy = STATES['with the dial under a finger, turned']()
    expect(toy.tempo).not.toBe(100)
    expect(toy.settled(1).tempo).toBe(100)
  })

  it('pulls nothing when it is put away with the release pulled all the way', () => {
    const toy = STATES['with the release pulled past its catch']()
    expect([...toy.settled(1).springs]).toEqual([4, 9])
  })

  it('keeps a piece that was in the hand where it came from: on its beat, or in the rack', () => {
    expect(STATES['with a piece from the track in the hand']().settled(1).toSave().pieces).toEqual([{ kind: 'wall', beat: 3, ceiling: false }])
    expect(STATES['with a piece from the rack in the hand']().settled(1).toSave().pieces).toEqual([])
  })
})

describe('a finger that is taken away', () => {
  it('does nothing for the child, whatever it held: nothing is said and nothing is changed', () => {
    for (const name of ['with a piece from the rack in the hand', 'with a piece from the track in the hand', 'with a finger pressed on a piece', 'with the dial under a finger, turned', 'with the release pulled past its catch']) {
      const toy = STATES[name]()
      const before = JSON.stringify(toy.toSave())
      toy.take()
      toy.changed = 0
      toy.letGo()
      expect(toy.take(), name).toEqual([])
      expect(JSON.stringify(toy.toSave()), name).toBe(before)
      expect(toy.changed, name).toBe(0)
      expect(toy.hand, name).toBeNull()
      expect(toy.release.held || toy.dial.held, name).toBe(false)
      expect(toy.clearing, name).toBeNull()
    }
  })

  it('leaves no flag behind it: the next finger starts from nothing', () => {
    const toy = fresh(100, [4])
    pull(toy, 1)
    toy.letGo()
    toy.press(KNOB)
    toy.letGo()
    toy.press(rackPoint(0))
    toy.letGo()
    runTo(toy, 2.05)
    expect(toy.press(BARE)).toBe('wall')
    expect(toy.blob.air).not.toBeNull()
    expect([...toy.springs].sort((a, b) => a - b)).toEqual([4])
    expect(toy.tempo).toBe(100)
  })
})
