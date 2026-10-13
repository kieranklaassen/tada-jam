import { describe, expect, it } from 'vitest'
import { DT, nudge, run, strip, townWith } from './bench'
import { ROLL_LOOK, TRAIN_LOOK, paintSprite, paintTrim } from './art'
import { TIERS } from './config'
import { shutGate } from './gates'
import { KINDS, TOY_SIZE } from './layout'
import { STAGE } from './stage'
import type { Town } from './town'
import { View, heldOf } from './view'

// What the second reader found in the drawing, each held by a test: tape in
// the hand is over the toys, a strip in the hand keeps its crossings until
// the lift reaches them and a river is never painted over its bridge, a toy
// on a rail goes through the tunnel under the hedge, the gates are drawn as
// they move, and three shapes that could be read as signs are gone.

/** A canvas that draws nothing and writes down every call and setting. */
function recorder(): { canvas: HTMLCanvasElement; said: string[] } {
  const said: string[] = []
  const tell = (value: unknown): string => (typeof value === 'number' ? value.toFixed(2) : typeof value === 'string' ? value : '#')
  const canvas = { width: 0, height: 0 } as unknown as HTMLCanvasElement
  const held: Record<string | symbol, unknown> = {}
  const shade = { addColorStop: () => {} }
  const context = new Proxy(held, {
    get(_, name) {
      if (name === 'canvas') return canvas
      if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') return () => shade
      if (name in held) return held[name]
      return (...args: unknown[]) => { said.push(`${String(name)}(${args.map(tell).join(',')})`) }
    },
    set(_, name, value) { held[name] = value; said.push(`${String(name)}=${tell(value)}`); return true },
  })
  ;(canvas as unknown as { getContext: () => unknown }).getContext = () => context
  return { canvas, said }
}

/** One view kept across frames: what it paints on the surface, with each sprite named where it is stamped, and what it bakes into its floor layer. */
function rig() {
  const made: { canvas: HTMLCanvasElement; said: string[] }[] = []
  const view = new View(() => { const one = recorder(); made.push(one); return one.canvas })
  const stamp = view.stamp.bind(view)
  let surface = recorder()
  view.stamp = (name, scale) => { surface.said.push(`stamp:${name}`); stamp(name, scale) }
  const paint = (town: Town): { live: string[]; floor: string[] } => {
    surface = recorder()
    const from = made[1]?.said.length ?? 0
    view.paint(surface.canvas.getContext('2d') as CanvasRenderingContext2D, STAGE.width, STAGE.height, 2, town, null, TIERS[0])
    return { live: surface.said, floor: made[1].said.slice(from) }
  }
  return { paint }
}

const GREY = 'fillStyle=#99a1ab', HEDGE_OVER = 'fillStyle=#579945', PARAPET = 'fillStyle=#5b6066', POST = 'fillStyle=#6b4a2b', BAND = 'fillStyle=#c8452f'

describe('tape in the hand', () => {
  it('coming off the roll, it is painted over a toy it is pulled across, and the roll over it', () => {
    const town = townWith([], { car: { x: 600, y: 400, a: 0 } })
    town.press({ x: 450, y: 400 })
    town.move({ x: 760, y: 400 })
    const { live } = rig().paint(town)
    expect(live.lastIndexOf(GREY)).toBeGreaterThan(live.lastIndexOf('stamp:car'))
    expect(live.lastIndexOf('stamp:roll0')).toBeGreaterThan(live.lastIndexOf(GREY))
  })

  it('peeled back over a toy that waits on the strip, the tape that is up is painted over the toy', () => {
    const town = townWith([strip(0, 420, 400, 900, 400)], { car: { x: 640, y: 400, a: 0 } })
    town.press({ x: 420, y: 400 })
    town.move({ x: 520, y: 400 })
    town.move({ x: 700, y: 400 })
    expect(town.grip?.mode).toBe('peel')
    const { live } = rig().paint(town)
    expect(live.lastIndexOf(GREY)).toBeGreaterThan(live.lastIndexOf('stamp:car'))
    // What still lies flat of it is under the toy.
    expect(live.indexOf(GREY)).toBeLessThan(live.indexOf('stamp:car'))
  })
})

describe('a strip with an end in the hand', () => {
  const river = () => strip(1, 620, 130, 620, 500), road = () => strip(0, 330, 300, 900, 300)

  it('keeps its bridge, built as it was, until the lift reaches it; then the bridge goes with the tape', () => {
    for (const lifted of ['river', 'road'] as const) {
      const town = townWith([river(), road()], {})
      const one = rig()
      expect(one.paint(town).floor).toContain(PARAPET)
      // A finger lifts the end: the crossing is 170 along the river and 290 along the road, further than the lift.
      town.press(lifted === 'river' ? { x: 620, y: 130 } : { x: 330, y: 300 })
      let held = heldOf(town)!
      expect(held.dropped.size).toBe(0)
      expect(held.baked).not.toBeNull()
      expect(one.paint(town).floor).toContain(PARAPET)
      // Pulled back until the lift is in the crossing.
      town.move(lifted === 'river' ? { x: 620, y: 200 } : { x: 400, y: 300 })
      town.move(lifted === 'river' ? { x: 620, y: 290 } : { x: 610, y: 300 })
      held = heldOf(town)!
      expect(held.dropped.size).toBe(1)
      const { floor } = one.paint(town)
      expect(floor.length).toBeGreaterThan(0)
      expect(floor).not.toContain(PARAPET)
    }
  })

  it('a river in the hand is never painted over its bridge: what lies flat of it stops at the road and starts again past it', () => {
    const town = townWith([river(), road()], {})
    const crossing = town.crossings[0]
    town.press({ x: 620, y: 130 })
    town.move({ x: 620, y: 200 })
    town.move({ x: 620, y: 260 })
    const held = heldOf(town)!
    expect(held.dropped.has(crossing)).toBe(true)
    const from = crossing.dHigh - crossing.reachHigh, to = crossing.dHigh + crossing.reachHigh
    for (const [a, b] of held.live) expect(b <= from || a >= to).toBe(true)
    // The road itself is in the floor, whole, and the river's live pieces are on top of the floor: none is over the road.
    expect(held.live.length).toBeGreaterThanOrEqual(1)
    // A road in the hand does lie over its river: it is the upper tape.
    const other = townWith([river(), road()], {})
    other.press({ x: 330, y: 300 })
    other.move({ x: 400, y: 300 })
    other.move({ x: 600, y: 300 })
    const above = heldOf(other)!
    expect(above.dropped.size).toBe(1)
    expect(above.live).toHaveLength(1)
    expect(above.live[0][0]).toBeLessThan(290 + 31)
    expect(above.live[0][1]).toBe(570)
  })

  it('is baked again only when the lift reaches or leaves a crossing, not on every move of the finger', () => {
    const town = townWith([river(), road()], {})
    const one = rig()
    town.press({ x: 620, y: 130 })
    one.paint(town)
    town.move({ x: 620, y: 170 })
    town.move({ x: 620, y: 180 })
    expect(one.paint(town).floor).toEqual([])
    town.move({ x: 620, y: 190 })
    expect(one.paint(town).floor).toEqual([])
  })
})

describe('a toy on a rail at a tunnel', () => {
  it('goes through under the hedge like the train: the hedge is painted again over the car, the duck and the dog, and not when they are away from it', () => {
    for (const id of ['car', 'duck', 'dog', 'train'] as const) {
      // It comes along the rail from the left and is painted when its middle has reached `x`.
      const at = (x: number): string[] => {
        const town = townWith([strip(3, 300, 400, 950, 400), strip(2, 620, 250, 620, 550)], { [id]: { x: 430, y: 400, a: 0 } })
        for (let f = 0; f < 600 && town.bodies[id].at.x < x; f++) run(town, DT)
        expect(town.bodies[id].doing, id).toMatchObject({ is: 'ride', kind: 3 })
        expect(Math.abs(town.bodies[id].at.x - x), id).toBeLessThan(4)
        return rig().paint(town).live
      }
      const inside = at(612)
      expect(inside.lastIndexOf(HEDGE_OVER), id).toBeGreaterThan(inside.lastIndexOf(`stamp:${id}`))
      expect(at(432), id).not.toContain(HEDGE_OVER)
    }
  })
})

describe('a hedge that lies aslant over the rails', () => {
  it('is painted over the train for the whole width of the train: the stretch of it laid again is longer by as much as it slants', () => {
    // The hedge runs down across the rail at half a right angle.
    const town = townWith([strip(3, 300, 400, 950, 400), strip(2, 500, 280, 740, 520)], { train: { x: 430, y: 400, a: 0 } })
    for (let f = 0; f < 600 && town.bodies.train.at.x < 600; f++) run(town, DT)
    const { live } = rig().paint(town)
    const over = live.lastIndexOf(HEDGE_OVER)
    expect(over).toBeGreaterThan(live.lastIndexOf('stamp:train'))
    // Along the hedge, a train that lies half a right angle to it reaches as far as half its length and half its width together, to each side.
    const rect = live.slice(over).find((said) => said.startsWith('rect('))
    const long = Number(rect?.slice(5, -1).split(',')[2])
    expect(long).toBeGreaterThan((TOY_SIZE.train.long + TOY_SIZE.train.wide) * Math.SQRT1_2)
    // And it is over the train as soon as a corner of the train is under it, before the middle of the rails is reached.
    const early = townWith([strip(3, 300, 400, 950, 400), strip(2, 500, 280, 740, 520)], { train: { x: 430, y: 400, a: 0 } })
    for (let f = 0; f < 600 && early.bodies.train.at.x < 442; f++) run(early, DT)
    expect(early.bodies.train.at.x).toBeLessThan(450)
    expect(rig().paint(early).live).toContain(HEDGE_OVER)
  })
})

describe('the gates as they are drawn', () => {
  const town = (): Town => townWith([strip(0, 700, 112, 700, 520), strip(3, 300, 400, 950, 400)], { train: { x: 392, y: 400, a: 0 }, car: { x: 700, y: 200, a: Math.PI / 2 }, dog: { x: 340, y: 110, a: 0 } })

  it('the posts are part of the floor, and no arm is drawn while the gates stand open', () => {
    const { live, floor } = rig().paint(town())
    expect(floor).toContain(POST)
    expect(live).not.toContain(BAND)
  })

  it('an arm coming down is another drawing at every moment of it, drawn over the toys on the floor', () => {
    const frames: string[] = []
    for (const down of [0.2, 0.6, 1]) {
      const one = town()
      shutGate(one, one.crossings[0])
      one.gates[0].down = [down, down]
      const { live } = rig().paint(one)
      expect(live.filter((said) => said === BAND)).toHaveLength(1)
      expect(live.lastIndexOf(BAND)).toBeGreaterThan(live.lastIndexOf('stamp:car'))
      frames.push(live.slice(live.lastIndexOf('stamp:car')).join(';'))
    }
    expect(new Set(frames).size).toBe(3)
  })

  it('the frame changes on the frame the gates are shut and goes on changing until they are down', () => {
    const one = town()
    nudge(one)
    const { paint } = rig()
    const arms = (): string => { const { live } = paint(one); const at = live.indexOf('fillStyle=rgba(60, 34, 12, 0.24)'); return live.includes(BAND) || at >= 0 ? live.filter((said) => said.startsWith('rect(')).join(';') : '' }
    let seen = 0, last = ''
    for (let f = 0; f < 60 && seen < 12; f++) {
      run(one, DT)
      if (!one.gates.length) continue
      const now = arms()
      if (seen > 0 && one.gates[0].down[0] < 1) expect(now).not.toBe(last)
      last = now
      seen++
    }
    expect(seen).toBeGreaterThan(5)
  })
})

describe('three shapes that could be read as signs', () => {
  it('nothing is drawn in the core of a roll: after the hole and its outline no roll has another mark', () => {
    for (const kind of KINDS) {
      const made = recorder()
      paintSprite(made.canvas.getContext('2d') as CanvasRenderingContext2D, `roll${kind}`)
      const look = ROLL_LOOK[kind], hole = made.said.map((said, k) => (said.startsWith('ellipse(') && said.split(',')[2] === look.hole.toFixed(2) ? k : -1)).filter((k) => k >= 0)
      expect(hole.length, String(kind)).toBeGreaterThanOrEqual(1)
      const after = made.said.slice(hole[hole.length - 1] + 1)
      expect(after.filter((said) => said === 'fill()'), String(kind)).toHaveLength(1)
      expect(after.filter((said) => said === 'stroke()').length, String(kind)).toBeLessThanOrEqual(1)
      expect(after.some((said) => /^(moveTo|lineTo|ellipse|arc|rect|roundRect)\(/.test(said)), String(kind)).toBe(false)
    }
  })

  it('the train\'s one brass band lies between its funnel and its buffer beam, clear of the funnel\'s ring', () => {
    const { funnel, band, beam } = TRAIN_LOOK
    expect(band.x).toBeGreaterThan(funnel.x + funnel.r + 3)
    expect(band.x + band.wide).toBeLessThan(beam.x - 3)
    const made = recorder()
    paintSprite(made.canvas.getContext('2d') as CanvasRenderingContext2D, 'train')
    const brass = made.said.map((said, k) => (said === 'fillStyle=#e2b13c' ? k : -1)).filter((k) => k >= 0)
    // Brass twice: the band, and the dome further back. The band is the one drawn as a box.
    const boxes = brass.map((k) => made.said.slice(k, k + 4).find((said) => said.startsWith('roundRect('))).filter((said) => said !== undefined)
    expect(boxes).toEqual([`roundRect(${band.x.toFixed(2)},-21.00,${band.wide.toFixed(2)},42.00,2.00)`])
  })

  it('the legs of a trestle are splayed timbers, each of its own lean and width, with no foot across the end: no row of small crosses', () => {
    const rails = strip(3, 620, 130, 620, 500)
    const made = recorder()
    paintTrim(made.canvas.getContext('2d') as CanvasRenderingContext2D, 'trestle', rails, 170, 38)
    expect(made.said.filter((said) => said.startsWith('rect('))).toEqual([])
    const legs: string[] = []
    made.said.forEach((said, k) => {
      if (!said.startsWith('moveTo(')) return
      const xs = made.said.slice(k, k + 4).map((one) => Number(one.split('(')[1].split(',')[0]))
      // How far the far end leans from the near end, and how wide each end is.
      legs.push(`${((xs[2] + xs[3]) / 2 - (xs[0] + xs[1]) / 2).toFixed(1)}/${(xs[1] - xs[0]).toFixed(1)}/${(xs[2] - xs[3]).toFixed(1)}`)
    })
    expect(legs).toHaveLength(6)
    expect(new Set(legs.slice(0, 3)).size).toBe(3)
    for (const leg of legs) { const [, near, far] = leg.split('/').map(Number); expect(far).toBeLessThan(near) }
  })
})
