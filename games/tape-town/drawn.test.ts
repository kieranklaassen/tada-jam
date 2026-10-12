import { describe, expect, it } from 'vitest'
import { DT, nudge, run, strip, townWith } from './bench'
import { paintCrossing, paintFlat, paintOver } from './art'
import { TIERS } from './config'
import { rideOn, startAct, walkTo } from './going'
import { ACTS, GAITS, GRID, MOVERS, type ActName, type FxKind, type GaitName, type Mover } from './habits'
import { TOY_IDS, type ToyId } from './layout'
import { doorSideOf } from './shoebox'
import { STAGE } from './stage'
import type { Town } from './town'
import { toyAt } from './touch'
import { eyes, type Pen } from './toyView'
import { View } from './view'
import { underOf } from './way'

// Every value the model computes for the eye is read by the view. Two towns
// are brought to the same moment, one value is changed in one of them, and
// the two frames must not be the same frame. A value that changes nothing
// on the surface would be a sound with no motion, or a state nobody sees.

/** A canvas that draws nothing and writes down every call and every setting, so that two frames can be compared. */
function recorder(): { canvas: HTMLCanvasElement; said: string[] } {
  const said: string[] = []
  const ids = new Map<unknown, number>()
  const tell = (value: unknown): string => {
    if (typeof value === 'number') return value.toFixed(2)
    if (typeof value === 'string' || typeof value === 'boolean') return String(value)
    if (value && typeof value === 'object') { if (!ids.has(value)) ids.set(value, ids.size); return `#${ids.get(value)}` }
    return ''
  }
  const canvas = { width: 0, height: 0 } as unknown as HTMLCanvasElement
  const held: Record<string | symbol, unknown> = {}
  const shade = { addColorStop: () => {} }
  const context = new Proxy(held, {
    get(_, name) {
      if (name === 'canvas') return canvas
      if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') return () => shade
      if (name === 'measureText') return () => ({ width: 0 })
      if (name in held) return held[name]
      return (...args: unknown[]) => { said.push(`${String(name)}(${args.map(tell).join(',')})`) }
    },
    set(_, name, value) { held[name] = value; said.push(`${String(name)}=${tell(value)}`); return true },
  })
  ;(canvas as unknown as { getContext: () => unknown }).getContext = () => context
  return { canvas, said }
}

/** The frame a town paints, written down. Sprites are told apart by the order they were first asked for. */
function frameOf(town: Town): string {
  const sprites: string[] = []
  const view = new View(() => { const made = recorder(); sprites.push(''); return made.canvas })
  const surface = recorder()
  surface.canvas.width = STAGE.width * 2
  surface.canvas.height = STAGE.height * 2
  view.paint(surface.canvas.getContext('2d') as CanvasRenderingContext2D, STAGE.width, STAGE.height, 2, town, null, TIERS[0])
  return surface.said.join(';')
}

/** The same town twice, two seconds into a visit, on a floor with one strip of each tape. */
const FLOOR = [strip(0, 320, 180, 900, 180), strip(1, 320, 300, 900, 300), strip(2, 320, 420, 900, 420), strip(3, 320, 540, 900, 540)]
function pair(): [Town, Town] {
  const make = (): Town => {
    const town = townWith(FLOOR, {})
    nudge(town)
    run(town, 2)
    return town
  }
  return [make(), make()]
}

/** Changes one thing in one of two like towns and says whether the frame changed. */
function shows(change: (town: Town) => void): boolean {
  const [plain, changed] = pair()
  change(changed)
  return frameOf(plain) !== frameOf(changed)
}

describe('everything the model says is drawn', () => {
  it('two like towns paint the same frame, so that a difference is a difference', () => {
    const [a, b] = pair()
    expect(frameOf(a)).toBe(frameOf(b))
  })

  it.each([
    ['the bus in its hat of leaves', (town: Town) => { town.bodies.bus.hatAt = town.time }],
    ['the leaf on the train\'s funnel', (town: Town) => { town.bodies.train.leafAt = town.time }],
    ['a toy stuck under a strip', (town: Town) => { town.bodies.car.doing = { is: 'stuck', t: 0.2, strip: FLOOR[0] } }],
    ['a toy in the hand', (town: Town) => { const body = town.bodies.dog; body.doing = { is: 'held', before: body.doing, from: { ...body.at } } }],
    ['a toy in the air', (town: Town) => { const body = town.bodies.duck; body.flight = { from: { ...body.at, x: body.at.x - 80 }, wait: 0, t: 0.15, lasts: 0.34, started: true, scene: false, loud: false, off: ACTS.hide.cues[0].sound!, land: ACTS.hide.cues[0].sound!, then: 'stand' } }],
    ['a toy just tapped', (town: Town) => { town.bodies.pegA.tappedAt = town.time - 0.1 }],
    ['a toy just landed', (town: Town) => { town.bodies.train.landedAt = town.time - 0.05 }],
    ['a peg on the roof of the bus', (town: Town) => { town.state.riding.pegB = true }],
    ['the dog lying down', (town: Town) => { town.bodies.dog.doing = { is: 'stand', as: 'lying', since: town.time } }],
    ['the duck in its nest', (town: Town) => { town.bodies.duck.doing = { is: 'stand', as: 'nested', since: town.time } }],
    ['a toy bewildered after it popped free', (town: Town) => { town.bodies.bus.doing = { is: 'stand', as: 'dazed', since: town.time - 0.2 } }],
    ['the strip in the hand', (town: Town) => { town.pull = { kind: 0, ax: 400, ay: 600, bx: 700, by: 620, ticks: 3, speed: 200, moved: 0, revAt: -Infinity } }],
    ['the finger, which every eye follows', (town: Town) => { town.finger = { x: 900, y: 600 } }],
    ['a torn end lifted', (town: Town) => { town.grip = { strip: town.state.strips[1], end: 0, at: { x: 320, y: 300 }, mode: 'lifted', d: 0, ticks: 0 } }],
    ['a strip half peeled', (town: Town) => { town.grip = { strip: town.state.strips[1], end: 0, at: { x: 320, y: 300 }, mode: 'peel', d: 200, ticks: 6 } }],
    ['a strip being pressed flat', (town: Town) => { const laid = strip(0, 400, 620, 700, 630); town.state.strips.push(laid); town.pressings.push({ strip: laid, t: 0.1, lasts: 0.3 }) }],
    ['the oldest strip lifting to make room', (town: Town) => { town.lifting.push({ strip: strip(2, 400, 620, 700, 630), t: 0.1 }) }],
    ['the roll just picked', (town: Town) => { town.rollPickedAt = town.time - 0.05; town.rollTurns[0]++ }],
    ['another roll in use', (town: Town) => { town.state.roll = 2 }],
    ['the roll springing back', (town: Town) => { town.rollBackAt = town.time - 0.05; town.rollFrom = { x: 700, y: 400 } }],
    ['the box rocking', (town: Town) => { town.boxAt = town.time - 0.05 }],
    ['the box upright with the toys in it', (town: Town) => { town.callHome(); town.rest() }],
    ['the cat stretching', (town: Town) => { town.catAt = town.time - 0.2 }],
    ['the cat\'s ear at a rip', (town: Town) => { town.ripAt = town.time - 0.1 }],
    ['the cat\'s eye at a honk', (town: Town) => { town.honkAt = town.time - 0.1 }],
    ['the basket squashed', (town: Town) => { town.basketAt = town.time - 0.1 }],
    ['the plant swaying', (town: Town) => { town.plantAt = town.time - 0.2 }],
    ['the car bumping over a gap', (town: Town) => { town.bodies.car.doing = walkTo({ x: 700, y: 640 }, 'scoot'); town.bumpAt = town.time - 0.07 }],
    ['a toy bobbing as it toots', (town: Town) => { const ride = rideOn(0, { s: 0, d: 100, dir: 1, skip: -1 }, 'rumble'); town.bodies.bus.doing = { ...ride, toots: 1, tootAt: town.time - 0.15 } }],
    ['the car idling at the level crossing', (town: Town) => { const ride = rideOn(0, { s: 0, d: 100, dir: 1, skip: -1 }, 'drive'); town.bodies.car.doing = { ...ride, braked: true, tootAt: town.time - 0.15 } }],
  ] as [string, (town: Town) => void][])('%s changes the frame', (_, change) => {
    expect(shows(change)).toBe(true)
  })

  it('every short-lived thing a toy leaves is drawn, each kind as itself', () => {
    const kinds: (FxKind | 'knock')[] = ['leaf', 'drop', 'spot', 'puff', 'cloud', 'bubble', 'wake', 'dust', 'drip', 'knock']
    const frames = kinds.map((kind) => { const [, town] = pair(); town.puff(kind, 700, 620); town.fx[town.fx.length - 1].at = town.time - 0.2; town.fx[town.fx.length - 1].turn = 1; return frameOf(town) })
    const [plain] = pair()
    const none = frameOf(plain)
    for (const frame of frames) expect(frame).not.toBe(none)
    expect(new Set(frames).size).toBe(kinds.length)
  })

  it('every act of every toy is drawn as itself, and so is every gait', () => {
    const acts: Record<Mover, ActName[]> = {
      car: ['uturn', 'spin', 'doughnut', 'washed', 'hedge', 'snag', 'jamCar'], bus: ['busTurn', 'sink', 'stop', 'leafHat', 'look', 'jamBus'],
      duck: ['preen', 'bottomUp', 'nest', 'hide', 'popOut', 'sneeze'], train: ['sniffRoad', 'steam', 'buffer', 'ring'], dog: ['circle', 'paddle', 'leg', 'howl', 'watch', 'woof'],
    }
    expect(Object.values(acts).flat().sort()).toEqual(Object.keys(ACTS).sort())
    for (const id of MOVERS) {
      const [plain] = pair()
      // Four moments of each act, taken together: no two acts are the same four frames, and each differs from the toy standing still through the same moments.
      const still = frameOf(plain), frames: string[] = []
      for (const name of acts[id]) {
        const seen = [0.15, 0.4, 0.65, 0.9].map((part) => {
          const [rest, town] = pair()
          // The dog watches a train that is going by: in both towns one is.
          if (name === 'watch') for (const each of [rest, town]) each.bodies.train.doing = rideOn(3, { s: 0, d: 500, dir: -1, skip: -1 }, 'chuff')
          startAct(town, id, name)
          for (const each of [rest, town]) for (let f = Math.round((ACTS[name].lasts * part) / DT); f > 0; f--) each.step(DT)
          return [frameOf(town), frameOf(rest)]
        })
        expect(seen.some(([acted, rested]) => acted !== rested), name).toBe(true)
        frames.push(seen.map(([acted]) => acted).join('|'))
      }
      expect(new Set(frames).size, id).toBe(frames.length)
      const gaits = (Object.keys(GAITS) as GaitName[]).filter((gait) => Object.values(GRID[id]).some((cell) => 'ride' in cell && cell.ride === gait))
      const going = gaits.map((gait) => { const [, town] = pair(); town.bodies[id].doing = { ...walkTo({ x: 700, y: 640 }, gait), odo: GAITS[gait].every * 0.3 }; return frameOf(town) })
      expect(new Set([still, ...going]).size, `${id} gaits`).toBe(going.length + 1)
    }
  })

  it('the bus\'s doors open as it comes up to a peg who waits, and are shut once it has served them', () => {
    const doors = (served: boolean): string => {
      const [, town] = pair()
      town.bodies.bus.at = { x: 500, y: 180, a: 0 }
      town.bodies.bus.doing = rideOn(0, { s: 0, d: 180, dir: 1, skip: -1 }, 'rumble')
      town.bodies.pegA.at = town.state.toys.pegA = { x: 640, y: 262, a: 0 }
      town.bodies.pegA.doing = { is: 'stand', as: 'plain', since: 0 }
      if (served) town.served.add('pegA'); else town.served.delete('pegA')
      return frameOf(town)
    }
    expect(doors(false)).not.toBe(doors(true))
  })
})

describe('where two tapes cross', () => {
  it('the pair decides what lies on top: the same floor is painted whichever strip was laid first', () => {
    for (const kinds of [[0, 1], [0, 3], [0, 2], [1, 3], [1, 2], [2, 3]] as const) {
      const floor = (swap: boolean): string => {
        const strips = [strip(kinds[0], 330, 300, 900, 300), strip(kinds[1], 620, 130, 620, 500)]
        const town = townWith(swap ? strips.reverse() : strips, {})
        const made: { said: string[] }[] = []
        const view = new View(() => { const one = recorder(); made.push(one); return one.canvas })
        const surface = recorder()
        surface.canvas.width = STAGE.width * 2
        surface.canvas.height = STAGE.height * 2
        view.paint(surface.canvas.getContext('2d') as CanvasRenderingContext2D, STAGE.width, STAGE.height, 2, town, null, TIERS[0])
        // The last things painted into the floor are the crossings: what lies on top there.
        const baked = made[1].said, from = baked.map((said, k) => (said.startsWith('fillStyle=') ? k : -1)).filter((k) => k >= 0)
        return baked.slice(from[from.length - 3]).filter((said) => said.startsWith('fillStyle=')).join(';')
      }
      expect(floor(false), kinds.join('-')).toBe(floor(true))
    }
  })

  it('each of the six crossings is a place of its own: more than one bar on another, and no two built alike', () => {
    const pairs: [number, number][] = [[0, 1], [0, 3], [0, 2], [1, 3], [1, 2], [2, 3]]
    const shapes = pairs.map(([low, high]) => {
      const town = townWith([strip(low as 0, 330, 300, 900, 300), strip(high as 0, 620, 130, 620, 500)], {})
      const c = town.crossings[0]
      const made = recorder(), bar = recorder()
      paintCrossing(made.canvas.getContext('2d') as CanvasRenderingContext2D, c.kind, c.low, c.high, c.dLow, c.dHigh, c.reachLow, c.reachHigh)
      paintOver(bar.canvas.getContext('2d') as CanvasRenderingContext2D, c.high, c.dHigh - c.reachHigh, c.dHigh + c.reachHigh)
      // What is built there, and not what colour it is.
      const shape = made.said.filter((said) => !said.startsWith('fillStyle=') && !said.startsWith('strokeStyle='))
      const drawn = (said: string[]): number => said.filter((one) => /^(fill|stroke|fillRect)\(/.test(one)).length
      // Past the bar itself: a shadow, parapets and their lit tops; a shadow and legs; boards, their seams and the posts of two gates; a shadow and bushes in two greens; blades; mouths.
      const more = { bridge: 3, trestle: 2, level: 4, jam: 3, reeds: 1, tunnel: 1 }[c.kind]
      expect(drawn(made.said), c.kind).toBeGreaterThanOrEqual(drawn(bar.said) + more)
      return `${c.kind}:${shape.map((said) => said.split('(')[0]).join(',')}`
    })
    expect(shapes.map((shape) => shape.split(':')[0]).sort()).toEqual(['bridge', 'jam', 'level', 'reeds', 'trestle', 'tunnel'])
    expect(new Set(shapes.map((shape) => shape.split(':')[1])).size).toBe(6)
  })

  it('the parapets of a bridge and the legs of a trestle are painted again over a toy that floats under', () => {
    for (const over of [0, 3] as const) {
      const live = (under: boolean): number => {
        const town = townWith([strip(1, 330, 300, 900, 300), strip(over, 620, 130, 620, 500)], { duck: { x: 620, y: 300, a: 0 } })
        town.bodies.duck.doing = rideOn(1, { s: 0, d: 290, dir: 1, skip: -1 }, 'swim')
        town.bodies.duck.hidden = under
        const view = new View(() => recorder().canvas)
        const surface = recorder()
        view.paint(surface.canvas.getContext('2d') as CanvasRenderingContext2D, STAGE.width, STAGE.height, 2, town, null, TIERS[0])
        const trim = over === 0 ? 'fillStyle=#5b6066' : 'fillStyle=#7a5230'
        return surface.said.filter((said) => said === trim).length
      }
      expect(live(false), String(over)).toBe(0)
      expect(live(true), String(over)).toBe(1)
    }
  })

  it('the rail is plain tape: it is painted with the same marks as a road, however long it is, and nothing is laid across it', () => {
    const marks = (kind: 0 | 3, length: number): string => {
      const made = recorder()
      paintFlat(made.canvas.getContext('2d') as CanvasRenderingContext2D, strip(kind, 330, 300, 330 + length, 300), true)
      const count = (name: string): number => made.said.filter((said) => said.startsWith(`${name}(`)).length
      return ['fill', 'stroke', 'fillRect', 'rect', 'clip'].map((name) => `${name} ${count(name)}`).join(', ')
    }
    expect(marks(3, 200)).toBe(marks(3, 560))
    expect(marks(3, 560)).toBe(marks(0, 560))
  })

  it('a duck under a bridge is drawn under the road it is nearest to, however many roads cross its river', () => {
    // A river down the floor, a road across it, and a stub of road laid across the river a little further up.
    const river = strip(1, 620, 160, 650, 440), stub = strip(0, 560, 190, 700, 196), road = strip(0, 480, 268, 900, 330)
    for (const strips of [[river, stub, road], [river, road, stub], [road, stub, river]]) {
      const town = townWith(strips, { duck: { x: 634, y: 292, a: Math.PI / 2 } })
      town.bodies.duck.hidden = true
      const dive = underOf(town, 'duck')
      expect(dive?.crossing.kind).toBe('bridge')
      expect(dive?.over.ay).toBe(road.ay)
      // Under the stub, it is the stub.
      town.bodies.duck.at = { x: 623, y: 194, a: Math.PI / 2 }
      expect(underOf(town, 'duck')?.over.ay).toBe(stub.ay)
      // Seen, it has not dived at all.
      town.bodies.duck.hidden = false
      expect(underOf(town, 'duck')).toBeNull()
    }
  })

  it('the duck, the car and the bus afloat under a bridge are painted first and the road is painted again on top of them', () => {
    for (const id of ['duck', 'car', 'bus'] as const) {
      const make = (under: boolean): string => {
        const town = townWith([strip(1, 330, 300, 900, 300), strip(0, 620, 130, 620, 500)], { [id]: { x: 620, y: 300, a: 0 } })
        town.bodies[id].doing = rideOn(1, { s: 0, d: 290, dir: 1, skip: -1 }, 'swim')
        town.bodies[id].hidden = under
        return frameOf(town)
      }
      expect(make(true), id).not.toBe(make(false))
      // The toy is still there to be seen at either side of the road: the frame with it is not the frame without.
      const gone = townWith([strip(1, 330, 300, 900, 300), strip(0, 620, 130, 620, 500)], { [id]: { x: 620, y: 300, a: 0 } })
      gone.bodies[id].at = { x: 400, y: 700, a: 0 }
      expect(make(true), id).not.toBe(frameOf(gone))
    }
  })

  it('a toy in the hand is stamped after the rolls, the cat and the box, with whoever rides on it', () => {
    const town = townWith(FLOOR, { bus: { x: 500, y: 180, a: 0 } })
    nudge(town)
    town.state.riding.pegA = true
    const order: string[] = []
    const view = new View(() => recorder().canvas)
    const stamp = view.stamp.bind(view)
    view.stamp = (name, scale) => { order.push(name); stamp(name, scale) }
    const paint = (): void => {
      order.length = 0
      const surface = recorder()
      view.paint(surface.canvas.getContext('2d') as CanvasRenderingContext2D, STAGE.width, STAGE.height, 2, town, null, TIERS[0])
    }
    paint()
    expect(order.indexOf('bus')).toBeLessThan(order.indexOf('roll0'))
    for (const id of ['bus', 'dog'] as const) {
      const body = town.bodies[id]
      body.doing = { is: 'held', before: body.doing, from: { ...body.at } }
      paint()
      const at = order.indexOf(id)
      for (const below of ['roll0', 'roll1', 'roll2', 'roll3', 'cat', 'boxTipped']) expect(at, `${id} over ${below}`).toBeGreaterThan(order.indexOf(below))
      expect(order.filter((name) => name === id), id).toHaveLength(1)
      if (id === 'bus') expect(order.indexOf('pegA')).toBeGreaterThan(at)
      body.doing = { is: 'stand', as: 'plain', since: 0 }
    }
  })

  it('every toy\'s own part is read: the same toy with another part is another drawing', () => {
    const town = townWith(FLOOR, {})
    const drawn = (id: ToyId, part: number): string => {
      const made = recorder()
      const pen: Pen = { g: made.canvas.getContext('2d') as CanvasRenderingContext2D, n: 0, scale: 2, stamp: () => {}, sprite: () => made.canvas }
      eyes(pen, town, id, town.poseOf(id), { lift: 0, sx: 1, sy: 1, da: 0, part }, false)
      return made.said.join(';')
    }
    for (const id of TOY_IDS) {
      expect(drawn(id, 0.6), id).not.toBe(drawn(id, 0))
      expect(drawn(id, -0.6), id).not.toBe(drawn(id, 0.6))
    }
  })

  it('the warm light is where the hand taps: under the box while the toys are in it, under the roll once they are out', () => {
    const lit = (out: boolean, glow: number): string[] => {
      const town = townWith(FLOOR, {})
      if (!out) { town.callHome(); town.rest() }
      const surface = recorder()
      surface.canvas.width = STAGE.width * 2
      surface.canvas.height = STAGE.height * 2
      const view = new View(() => recorder().canvas)
      const marks: string[] = []
      const stamp = view.stamp.bind(view)
      view.stamp = (name, scale) => { marks.push(`${name}:${surface.said.filter((said) => said.startsWith('fillStyle=rgba(255, 196, 64')).length}`); stamp(name, scale) }
      view.paint(surface.canvas.getContext('2d') as CanvasRenderingContext2D, STAGE.width, STAGE.height, 2, town, { glow, demo: null, demoIndex: -1 }, TIERS[0])
      return marks
    }
    const lights = (marks: string[], name: string): number => Number(marks.find((mark) => mark.startsWith(`${name}:`))?.split(':')[1])
    // In the box: one light, and it is lit before the box is stamped and not again at the roll.
    const boxed = lit(false, 1)
    expect(lights(boxed, 'boxUp')).toBe(1)
    expect(lights(boxed, 'roll0')).toBe(1)
    expect(lights(boxed, 'cat')).toBe(1)
    // Out: none at the box, one at the roll in use.
    const out = lit(true, 1)
    expect(lights(out, 'boxTipped')).toBe(0)
    expect(lights(out, 'roll0')).toBe(1)
    // No glow, no light.
    expect(lights(lit(false, 0), 'cat')).toBe(0)
  })

  it('the doors of the bus are on the side of whoever waits for it', () => {
    const town = townWith([strip(0, 320, 300, 900, 300)], { bus: { x: 500, y: 300, a: 0 }, pegA: { x: 600, y: 210, a: 0 } })
    expect(doorSideOf(town)).toBe(-1)
    town.bodies.pegA.at = { x: 600, y: 390, a: 0 }
    expect(doorSideOf(town)).toBe(1)
  })
})

describe('a toy is touched where it is drawn', () => {
  it('in every state: standing, on the move, in an act that carries it, in the air, on the roof of the bus, and under a bridge', () => {
    const town = townWith([strip(0, 320, 180, 900, 180), strip(1, 600, 110, 600, 400)], { car: { x: 420, y: 180, a: 0 }, bus: { x: 420, y: 520, a: 0 } })
    nudge(town)
    const ids: ToyId[] = [...TOY_IDS]
    let checked = 0
    run(town, 6, [], () => {
      for (const id of ids) {
        const at = town.poseOf(id)
        const met = toyAt(town, { x: at.x, y: at.y })
        // Whoever is met at a toy's drawn middle is that toy, or one drawn on top of it there.
        if (met !== id) expect(ids.indexOf(met as ToyId), `${id} at frame ${town.frames}`).toBeGreaterThan(-1)
        else checked++
      }
    })
    expect(checked).toBeGreaterThan(2000)
    // The duck under a bridge is still met where it is: a finger on the road there lifts it out.
    town.bodies.duck.hidden = true
    const duck = town.poseOf('duck')
    expect(toyAt(town, { x: duck.x, y: duck.y })).toBe('duck')
    // A toy in the air is met in the air, and not where it was or where it will be.
    const body = town.bodies.pegC
    body.flight = { from: { ...body.at }, wait: 0, t: 0.17, lasts: 0.34, started: true, scene: false, loud: false, off: ACTS.hide.cues[0].sound!, land: ACTS.hide.cues[0].sound!, then: 'stand' }
    body.at = { x: body.at.x - 150, y: body.at.y - 60, a: body.at.a }
    const mid = town.poseOf('pegC')
    expect(toyAt(town, { x: mid.x, y: mid.y })).toBe('pegC')
    expect(toyAt(town, { x: body.at.x, y: body.at.y })).not.toBe('pegC')
    expect(toyAt(town, { x: body.flight.from.x, y: body.flight.from.y })).not.toBe('pegC')
  })
})
