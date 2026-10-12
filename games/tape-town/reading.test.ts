import { describe, expect, it } from 'vitest'
import { SHELF, carry, loaded, names, nudge, run, strip, townWith } from './bench'
import { Desk } from './desk'
import { IDLE_BEFORE_GLOW } from './guidance'
import { TOY_SIZE, type ToyId } from './layout'
import { STAGE, fit } from './stage'
import { END_REACH, toyAt } from './touch'

// What the first reading of the game found, each held by name.

const W = STAGE.width, H = STAGE.height
const across = strip(0, 330, 300, 900, 300), down = strip(1, 620, 130, 620, 500), rail = strip(3, 330, 300, 900, 300)

function deskOn(town: ReturnType<typeof townWith>, width = W, height = H): Desk {
  const at = new Desk()
  at.size(width, height)
  at.open(town)
  return at
}

describe('only a toy in the river is under what crosses it', () => {
  it('a duck that walks a road over a bridge, or a rail over a trestle, is never hidden and can be picked up there', () => {
    for (const walks of [across, rail]) {
      const town = townWith([walks, down], { duck: { x: 470, y: 300, a: 0 } })
      nudge(town)
      expect(town.bodies.duck.doing).toMatchObject({ is: 'ride', kind: walks.kind })
      let met = 0
      run(town, 9, [], () => {
        const duck = town.bodies.duck, at = town.poseOf('duck')
        expect(duck.hidden, `frame ${town.frames}`).toBe(false)
        if (toyAt(town, at) === 'duck') met++
      })
      expect(met).toBeGreaterThan(500)
    }
  })

  it('a duck dived under a road is met by a finger on the road there, and comes out with the finger', () => {
    // A river that lies wholly under the road: the duck in it is never seen whole.
    const town = townWith([across, strip(1, 620, 250, 620, 350)], { duck: { x: 620, y: 300, a: Math.PI / 2 } })
    nudge(town)
    run(town, 1)
    const duck = town.bodies.duck
    expect(duck.hidden).toBe(true)
    const at = town.poseOf('duck')
    expect(toyAt(town, at)).toBe('duck')
    town.press({ x: at.x, y: at.y })
    town.move({ x: at.x + 60, y: at.y + 120 })
    expect(duck.doing.is).toBe('held')
    expect(duck.hidden).toBe(false)
    town.lift()
    expect(town.state.strips.length).toBe(2)
  })

  it('a car or a bus afloat under a bridge is under the road, and makes its own sound there and no drum of boards', () => {
    for (const id of ['car', 'bus'] as const) {
      const town = townWith([across, down], { [id]: { x: 620, y: 185, a: Math.PI / 2 } })
      nudge(town)
      let under = 0
      const log = run(town, 6, [], () => { if (town.bodies[id].hidden) under++ })
      expect(under, id).toBeGreaterThan(30)
      expect(names(log).filter((name) => name === 'bom' || name === 'bom-low'), id).toEqual([])
      expect(names(log).some((name) => name === (id === 'car' ? 'glug' : 'boo')), id).toBe(true)
    }
    // And on the road over it, they drum.
    const town = townWith([across, down], { car: { x: 420, y: 300, a: 0 } })
    nudge(town)
    expect(names(run(town, 3))).toContain('bom')
  })
})

describe('habits keep what they leave behind', () => {
  it('long after the last touch, and after a load, the sound is gone and the ripples, bubbles and puffs are not', () => {
    const town = townWith([strip(1, 330, 250, 900, 250), strip(3, 330, 400, 900, 400)], { duck: { x: 420, y: 250, a: 0 }, train: { x: 500, y: 400, a: 0 }, car: { x: 700, y: 250, a: 0 } })
    nudge(town)
    run(town, 40)
    expect(town.level).toBe(0)
    town.fx.length = 0
    const kinds = new Set<string>()
    const log = run(town, 8, [], () => { for (const fx of town.fx) kinds.add(fx.kind) })
    expect(names(log)).toEqual([])
    expect([...kinds].sort()).toEqual(expect.arrayContaining(['puff', 'wake']))
    const fresh = loaded(town), after = new Set<string>()
    // The shelf toys stay on the shelf here as they did before the load, so the river and the rail are clear.
    for (const id of ['bus', 'dog', 'pegA', 'pegB', 'pegC'] as const) { fresh.bodies[id].doing = { is: 'stand', as: 'bath', since: 0 }; fresh.bodies[id].at = { ...SHELF[id] } }
    const quiet = run(fresh, 8, [], () => { for (const fx of fresh.fx) after.add(fx.kind) })
    expect(names(quiet)).toEqual([])
    expect([...after]).toEqual(expect.arrayContaining(['puff', 'wake']))
  })

  it('the dog sits and howls at the train\'s hoot though the town has gone quiet', () => {
    const town = townWith([strip(3, 330, 400, 900, 400), strip(0, 620, 300, 620, 480)], { train: { x: 440, y: 400, a: 0 }, dog: { x: 700, y: 200, a: 0 } })
    town.bodies.dog.doing = { is: 'stand', as: 'plain', since: 0 }
    let howled = false
    const log = run(town, 12, [], () => { const dog = town.bodies.dog.doing; if (dog.is === 'act' && dog.name === 'howl') howled = true })
    expect(town.level).toBe(0)
    expect(names(log)).toEqual([])
    expect(howled).toBe(true)
  })
})

describe('touched where it is drawn', () => {
  const NOSES: [ToyId, number][] = [['bus', TOY_SIZE.bus.long / 2 - 6], ['train', TOY_SIZE.train.long / 2 - 6], ['dog', TOY_SIZE.dog.long / 2 - 6]]

  it('the bus, the train and the dog are met over their whole length, nose and tail, through the path the Mount uses, and a tap there never lays tape', () => {
    for (const [id, reach] of NOSES) for (const end of [1, -1]) for (const turn of [0, 0.9, 2.4]) {
      const town = townWith([], { [id]: { x: 620, y: 380, a: turn } })
      town.bodies[id].doing = { is: 'stand', as: 'plain', since: 0 }
      const desk = deskOn(town), at = { x: 620 + Math.cos(turn) * reach * end, y: 380 + Math.sin(turn) * reach * end }
      desk.down(1, at, 0, 0)
      desk.up(1, at, 120)
      const out = desk.take().sounds.map((sound) => sound.name)
      expect(town.state.strips, `${id} ${end} ${turn}`).toEqual([])
      expect(out, `${id} ${end} ${turn}`).not.toContain('stick')
      expect(town.bodies[id].tappedAt, `${id} ${end} ${turn}`).toBeGreaterThan(-Infinity)
    }
  })

  it('beside a toy, a tape-width off its flank, the floor is the floor', () => {
    const town = townWith([], { bus: { x: 620, y: 380, a: 0 } })
    town.bodies.bus.doing = { is: 'stand', as: 'plain', since: 0 }
    expect(toyAt(town, { x: 620, y: 380 + TOY_SIZE.bus.wide / 2 + 20 })).toBeNull()
    expect(toyAt(town, { x: 620 + TOY_SIZE.bus.long / 2 + 20, y: 380 })).toBeNull()
  })
})

describe('the small targets', () => {
  it('a strip\'s torn end is 48 px or more across on every surface the game is held to', () => {
    for (const [width, height] of [[1180, 820], [820, 1180], [1024, 768]]) expect(END_REACH * 2 * fit(width, height).scale, `${width}x${height}`).toBeGreaterThanOrEqual(48)
  })
})

describe('the home control', () => {
  it('a touch on or round it is not the game\'s: it ends no scene, wakes nobody, and does not take the idle ladder back', () => {
    const town = townWith([strip(2, 330, 300, 900, 300)], { car: { x: 600, y: 300, a: 0 } })
    const desk = deskOn(town), home = { x: W / 2, y: 34 }
    expect(town.bodies.car.doing).toMatchObject({ is: 'stand', as: 'dormant' })
    let guidance = desk.frame(0, 0, 0)
    for (let k = 1; k <= (IDLE_BEFORE_GLOW + 1) * 60; k++) guidance = desk.frame((k / 60) * 1000, k / 60, 1 / 60)
    expect(guidance.glow).toBeGreaterThan(0)
    desk.take()
    for (const at of [home, { x: home.x + 40, y: home.y }, { x: home.x, y: home.y + 40 }]) {
      const t = IDLE_BEFORE_GLOW + 1
      desk.down(1, at, t * 1000, t)
      desk.up(1, at, t * 1000 + 100)
      expect(desk.take().sounds).toEqual([])
      expect(town.bodies.car.doing).toMatchObject({ is: 'stand', as: 'dormant' })
      expect(town.touchedAt).toBe(-Infinity)
      expect(desk.frame(t * 1000 + 120, t + 0.12, 0).glow).toBeGreaterThan(0)
    }
    // The model itself, asked without the Mount, says the same: a press there is nobody's.
    const stageHome = { x: 590, y: 30 }
    expect(town.onHome(stageHome)).toBe(true)
    town.press(stageHome)
    town.lift()
    expect(town.takeSounds()).toEqual([])
    expect(town.touchedAt).toBe(-Infinity)
    expect(town.state.strips).toHaveLength(1)
    // A scene is not ended by it either.
    town.press({ x: 120, y: 220 })
    town.lift()
    expect(town.playing).toBe(true)
    desk.down(1, home, 9000, 9)
    desk.up(1, home, 9100)
    expect(town.playing).toBe(true)
  })
})

describe('a toy caught in the air', () => {
  it('grabbed mid-hop and then taken away or put away, it stands where it was going, as a load would find it', () => {
    for (const how of ['cancel', 'rest'] as const) {
      const town = townWith([across], { car: { x: 420, y: 300, a: 0 }, pegA: { x: 640, y: 300, a: 0 } })
      nudge(town)
      let caught = false
      run(town, 4, [], () => {
        const peg = town.bodies.pegA
        if (caught || !peg.flight?.started || peg.flight.t < 0.1) return
        caught = true
        const to = { ...peg.at }, mid = town.poseOf('pegA')
        town.press({ x: mid.x, y: mid.y })
        town.move({ x: mid.x + 40, y: mid.y + 40 })
        expect(peg.doing.is).toBe('held')
        if (how === 'cancel') town.cancel(); else town.rest()
        expect(town.poseOf('pegA'), how).toMatchObject({ x: to.x, y: to.y })
        expect(town.bodies.pegA.flight, how).toBeNull()
        expect(town.saved().toys, how).toEqual(loaded(town).saved().toys)
      })
      expect(caught, how).toBe(true)
    }
  })
})

describe('nobody parks for ever', () => {
  it('a walker that cannot get through goes back the way it came, and tries again from there', () => {
    // The bus on its way to the road, and a duck that turns and turns at the river's end in its way.
    const town = townWith([strip(0, 450, 262, 910, 338), strip(1, 560, 120, 600, 470), strip(2, 490, 185, 655, 185)], { bus: { x: 388, y: 166, a: 0.2 }, duck: { x: 590, y: 420, a: Math.PI / 2 } })
    nudge(town)
    let still = 0, longest = 0, was = { ...town.bodies.bus.at }, parked = 0
    run(town, 60, [], () => {
      const bus = town.bodies.bus, at = bus.at
      still = at.x === was.x && at.y === was.y && at.a === was.a ? still + 1 : 0
      longest = Math.max(longest, still)
      was = { ...at }
      if (bus.doing.is === 'stand' && bus.doing.as === 'parked') parked++
    })
    expect(longest / 60).toBeLessThan(12)
    expect(parked / 60).toBeLessThan(12)
  })
})

describe('the bus in the hedge', () => {
  it('comes out wearing its hat, and the hat comes off with the sneeze on the frame it is out', () => {
    const town = townWith([strip(2, 330, 300, 900, 300)], {})
    nudge(town)
    carry(town, 'bus', { x: 600, y: 300 })
    const bus = town.bodies.bus, from = { ...bus.at }
    let hatOn = -1, hatOff = -1, out = -1, choo = -1
    const log = run(town, 3.2, [], () => {
      if (hatOn < 0 && bus.hatAt > -Infinity) hatOn = town.frames
      if (hatOn >= 0 && hatOff < 0 && bus.hatAt === -Infinity) hatOff = town.frames
      const doing = bus.doing
      if (out < 0 && doing.is === 'act' && doing.to && Math.hypot(bus.at.x - doing.to.x, bus.at.y - doing.to.y) < 1e-6 && Math.hypot(bus.at.x - from.x, bus.at.y - from.y) > 10) out = town.frames
    })
    for (const heard of log) if (heard.name === 'choo') choo = heard.frame
    expect(hatOn).toBeGreaterThan(0)
    expect(hatOff).toBeGreaterThan(hatOn)
    expect(Math.abs(hatOff - out)).toBeLessThanOrEqual(1)
    expect(Math.abs(choo - hatOff)).toBeLessThanOrEqual(1)
  })
})
