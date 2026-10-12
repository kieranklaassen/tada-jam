import { describe, expect, it } from 'vitest'
import { carry, leastRoom, loaded, names, nudge, run, strip, townWith } from './bench'
import type { Kind, Pose, ToyId } from './layout'

// Where two tapes cross, the pair decides: six crossings, each one thing,
// the same every time and whichever strip was laid first.

const across = (kind: Kind) => strip(kind, 330, 300, 900, 300)
const down = (kind: Kind) => strip(kind, 620, 130, 620, 500)
const onAcross: Pose = { x: 420, y: 300, a: 0 }
const onDown: Pose = { x: 620, y: 190, a: Math.PI / 2 }

function play(kinds: [Kind, Kind], toys: Partial<Record<ToyId, Pose>>, seconds: number, swap = false) {
  const strips = [across(kinds[0]), down(kinds[1])]
  const town = townWith(swap ? strips.reverse() : strips, toys)
  nudge(town)
  const seen: Record<string, boolean> = {}
  const log = run(town, seconds, [], () => { for (const id of Object.keys(toys)) if (town.bodies[id as ToyId].hidden) seen[id] = true })
  return { town, log, heard: names(log), seen }
}
const count = (heard: string[], name: string): number => heard.filter((other) => other === name).length

describe('the six crossings', () => {
  it('road and river is a bridge: the car drums over it, bom-bom', () => {
    const { heard, town } = play([0, 1], { car: onAcross }, 2.2)
    expect(count(heard, 'bom')).toBe(2)
    expect(town.bodies.car.at.x).toBeGreaterThan(660)
  })

  it('the bus drums lower over the same bridge', () => {
    expect(count(play([0, 1], { bus: onAcross }, 3.5).heard, 'bom-low')).toBe(2)
  })

  it('the duck swims under the bridge, is gone for a moment and pops out with a quack', () => {
    const { log, seen, town } = play([1, 0], { duck: onAcross }, 4)
    expect(seen.duck).toBe(true)
    expect(town.bodies.duck.hidden).toBe(false)
    expect(log.filter((heard) => heard.name === 'quack').length).toBeGreaterThanOrEqual(2)
  })

  it('a river that ends just past the road: the duck that turns there is still under the bridge, and is never seen on the road', () => {
    const town = townWith([across(0), strip(1, 620, 230, 620, 520)], { duck: { x: 620, y: 420, a: -Math.PI / 2 }, car: onAcross })
    nudge(town)
    let onRoad = 0, least = Infinity
    run(town, 16, [], () => {
      const duck = town.bodies.duck
      if (Math.abs(duck.at.y - 300) < 100 && !duck.hidden && !duck.flight) onRoad++
      least = Math.min(least, leastRoom(town).room)
    })
    expect(onRoad).toBe(0)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('the dog stops halfway over the bridge and woofs at the water', () => {
    const { heard, town } = play([0, 1], { dog: onAcross }, 5.5)
    expect(count(heard, 'woof')).toBe(2)
    expect(town.bodies.dog.at.x).toBeGreaterThan(640)
  })

  it('road and rail is a level crossing: the train hoots before it and clatters over', () => {
    const { heard } = play([0, 3], { train: onDown }, 3)
    expect(heard.indexOf('hoot')).toBeGreaterThanOrEqual(0)
    expect(heard.indexOf('clatter')).toBeGreaterThan(heard.indexOf('hoot'))
  })

  it('a car that reaches it while the train is near brakes, idles and then drives on', () => {
    const { heard } = play([0, 3], { train: { x: 620, y: 210, a: Math.PI / 2 }, car: { x: 470, y: 300, a: 0 } }, 6)
    expect(count(heard, 'brake')).toBeGreaterThanOrEqual(1)
    expect(count(heard, 'put-put')).toBeGreaterThanOrEqual(1)
    expect(heard).toContain('howl')
  })

  it('road and hedge is a jam: the car stops at the hedge, honks, turns and drives back', () => {
    let furthest = 0
    const town = townWith([across(0), down(2)], { car: onAcross })
    nudge(town)
    const heard = names(run(town, 5, [], () => { furthest = Math.max(furthest, town.bodies.car.at.x) }))
    expect(count(heard, 'honk')).toBe(3)
    expect(furthest).toBeLessThan(620)
    expect(town.bodies.car.at.x).toBeLessThan(540)
  })

  it('the bus honks lower at the same hedge', () => {
    expect(count(play([0, 2], { bus: onAcross }, 6).heard, 'honk-low')).toBe(3)
  })

  it('the bus pulls up behind the car and honks lower: they honk in turn, and then each goes back the way it came', () => {
    const town = townWith([strip(0, 300, 300, 900, 300), strip(2, 760, 130, 760, 500)], { car: { x: 600, y: 300, a: 0 }, bus: { x: 410, y: 300, a: 0 } })
    nudge(town)
    let furthest = 0
    const log = run(town, 14, [], () => { furthest = Math.max(furthest, town.bodies.car.at.x, town.bodies.bus.at.x) })
    const honks = log.filter((heard) => heard.name === 'honk' || heard.name === 'honk-low')
    const joined = honks.findIndex((heard) => heard.name === 'honk-low')
    expect(joined).toBeGreaterThan(0)
    // From the bus's first honk on they take turns, and never honk on the same frame.
    const turns = honks.slice(joined - 1, joined + 5).map((heard) => heard.name)
    expect(turns).toEqual(['honk', 'honk-low', 'honk', 'honk-low', 'honk', 'honk-low'])
    for (let k = 1; k < honks.length; k++) expect(honks[k].frame - honks[k - 1].frame).toBeGreaterThan(10)
    // Neither ever gets through the hedge, however often they come back to it.
    expect(furthest).toBeLessThan(700)
    expect(leastRoom(town).room).toBeGreaterThanOrEqual(0)
  })

  it('river and rail is a trestle: the train rattles across on hollow tonks', () => {
    expect(count(play([1, 3], { train: onDown }, 2.5).heard, 'tonk')).toBe(3)
  })

  it('a duck under the trestle as the train passes gets a puff of steam and sneezes', () => {
    const { heard } = play([1, 3], { train: onDown, duck: { x: 530, y: 300, a: 0 } }, 2.5)
    expect(heard).toContain('duck-sneeze')
  })

  it('river and hedge is reeds: the duck hides in them, and pops out with a quack at whoever passes next', () => {
    const { town, heard } = play([1, 2], { duck: { x: 520, y: 300, a: 0 } }, 3)
    expect(heard).toContain('rustle')
    expect(town.bodies.duck.doing).toMatchObject({ is: 'stand', as: 'reeds' })
    town.bodies.car.at = { x: 380, y: 300, a: 0 }
    town.bodies.car.doing = { is: 'stand', as: 'dazed', since: town.time - 1 }
    const after = names(run(town, 4))
    expect(after).toContain('quack')
  })

  it('a car floating through the reeds snags, bobs with a gulp and floats on', () => {
    const { heard, town } = play([1, 2], { car: { x: 520, y: 300, a: 0 } }, 5)
    expect(count(heard, 'gulp')).toBe(1)
    expect(town.bodies.car.at.x).toBeGreaterThan(660)
  })

  it('rail and hedge is a tunnel: the train goes in muffled and comes out with a leaf that it hoots off', () => {
    const { heard, seen, town } = play([2, 3], { train: onDown }, 2)
    expect(seen.train).toBe(true)
    expect(heard).toContain('chuff-in')
    expect(town.bodies.train.hidden).toBe(false)
    expect(town.bodies.train.leafAt).toBe(-Infinity)
    expect(count(heard, 'hoot')).toBe(2)
  })

  it('which strip was laid first does not matter', () => {
    for (const [kinds, id, pose] of [[[0, 1], 'car', onAcross], [[0, 2], 'car', onAcross], [[1, 3], 'train', onDown], [[2, 3], 'train', onDown], [[1, 2], 'duck', onAcross], [[0, 3], 'train', onDown]] as const) {
      const one = play([...kinds] as [Kind, Kind], { [id]: pose }, 4).heard, other = play([...kinds] as [Kind, Kind], { [id]: pose }, 4, true).heard
      expect(other, `${kinds} ${id}`).toEqual(one)
    }
  })

  it('whichever strip was laid first, a toy set down where two cross is on the one the pair puts on top', () => {
    for (const swap of [false, true]) {
      // On a bridge the road is on top: the bus drives it and does not sail.
      const bridge = [across(0), down(1)]
      const town = townWith(swap ? bridge.reverse() : bridge, {})
      nudge(town)
      carry(town, 'bus', { x: 620, y: 300 })
      expect(town.bodies.bus.doing, `swap ${swap}`).toMatchObject({ is: 'ride', kind: 0 })
      // At a level crossing the rails are on top: the train set down there chuffs off along them.
      const level = [across(0), down(3)]
      const other = townWith(swap ? level.reverse() : level, {})
      nudge(other)
      carry(other, 'train', { x: 620, y: 300 })
      expect(other.bodies.train.doing, `swap ${swap}`).toMatchObject({ is: 'ride', kind: 3 })
    }
  })

  it('a duck found under a bridge is in the river, whichever strip was laid first: it swims on under the road from the first frame and is never seen standing on it', () => {
    for (const swap of [false, true]) {
      const bridge = [across(0), down(1)]
      // Saved as it swam under the road, a little off the middle of the river.
      const town = loaded(townWith(swap ? bridge.reverse() : bridge, { duck: { x: 624, y: 306, a: Math.PI / 2 } }))
      expect(town.bodies.duck.doing, `swap ${swap}`).toMatchObject({ is: 'ride', kind: 1 })
      expect(town.bodies.duck.hidden, `swap ${swap}`).toBe(true)
      // And one a child sets down there goes straight under too.
      const other = townWith(swap ? bridge.reverse() : bridge, {})
      nudge(other)
      carry(other, 'duck', { x: 620, y: 300 })
      expect(other.bodies.duck.doing, `swap ${swap}`).toMatchObject({ is: 'ride', kind: 1 })
      expect(other.bodies.duck.hidden, `swap ${swap}`).toBe(true)
    }
  })

  it('two who each wait for the other do not stand there: the one who gives way gives way within a second', () => {
    const town = townWith([strip(0, 300, 300, 900, 300)], { car: { x: 420, y: 300, a: 0 }, bus: { x: 760, y: 300, a: Math.PI } })
    nudge(town)
    let stood = 0, longest = 0
    run(town, 12, [], () => {
      const still = town.waiting.has('car') && town.waiting.has('bus')
      stood = still ? stood + 1 : 0
      longest = Math.max(longest, stood)
    })
    expect(longest).toBeLessThan(60)
    expect(leastRoom(town).room).toBeGreaterThanOrEqual(0)
  })
})
