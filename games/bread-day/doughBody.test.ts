import { describe, expect, it } from 'vitest'
import { DoughBody, formOf, restOutline, type Form } from './doughBody'
import { mulberry32 } from './lookCut'
import { EMPTY, kindOf, textureOf, type Bread, type Stuff } from './stuff'
import { reachableBreads } from './tastes'

const stuff = (change: Partial<Stuff>): Stuff => ({ ...EMPTY, ...change })
const form = (change: Partial<Stuff>): Form => {
  const made = formOf(stuff(change))
  if (!made) throw new Error('no form')
  return made
}
const FORMS = {
  dust: form({ flour: 2 }),
  puddle: form({ water: 2 }),
  batter: form({ flour: 1, water: 3 }),
  seeds: form({ seeds: true }),
  streaky: form({ flour: 2, water: 2 }),
  shaggy: form({ flour: 2, water: 2, work: 4 }),
  smooth: form({ flour: 2, water: 2, work: 10 }),
}
const body = (shape: Form | null): DoughBody => { const made = new DoughBody(); made.reshape(shape); return made }
const run = (b: DoughBody, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) b.step(1 / 60) }

function area(p: readonly number[]): number {
  let sum = 0
  for (let i = 0; i < p.length; i += 2) sum += p[i] * p[(i + 3) % p.length] - p[(i + 2) % p.length] * p[i + 1]
  return sum / 2
}
/** The furthest any point lies from where it lay in `rest`. */
function apart(now: readonly number[], rest: readonly number[]): number {
  let most = 0
  for (let i = 0; i < now.length; i += 2) most = Math.max(most, Math.hypot(now[i] - rest[i], now[i + 1] - rest[i + 1]))
  return most
}

describe('formOf', () => {
  it('is null only for nothing', () => {
    expect(formOf(null)).toBeNull()
    expect(formOf(EMPTY)).toBeNull()
    expect(formOf(stuff({ flour: 1 }))?.bread).toBeNull()
  })

  it('follows the rules for kind and texture', () => {
    for (const flour of [0, 1, 3]) for (const water of [0, 2, 3]) for (const work of [0, 4, 9]) for (const bubbly of [false, true]) {
      const load = stuff({ flour, water, work, bubbly, seeds: true }), made = formOf(load)
      expect(made?.kind).toBe(kindOf(load))
      expect(made?.texture).toBe(textureOf(load))
    }
  })

  it('grows with the amount, lies wider and lower when long, and larger and rounder when risen', () => {
    const small = form({ flour: 1, water: 1, work: 10 }), large = form({ flour: 3, water: 3, work: 10 })
    expect(large.rx).toBeGreaterThan(small.rx)
    expect(large.ry).toBeGreaterThan(small.ry)
    const long = form({ flour: 2, water: 2, work: 10, long: true }), round = FORMS.smooth
    expect(long.rx).toBeGreaterThan(round.rx)
    expect(long.ry).toBeLessThan(round.ry)
    const risen = form({ flour: 2, water: 2, work: 10, bubbly: true, rise: 100 })
    expect(risen.rx * risen.ry).toBeGreaterThan(round.rx * round.ry)
    expect(risen.ry / risen.rx).toBeGreaterThan(round.ry / round.rx)
    expect(form({ flour: 3 }).rx).toBeGreaterThan(form({ flour: 1 }).rx)
  })

  it('gives smooth dough the strongest spring and the longest reach, and dust none', () => {
    for (const other of [FORMS.dust, FORMS.puddle, FORMS.batter, FORMS.seeds, FORMS.streaky, FORMS.shaggy]) {
      expect(FORMS.smooth.spring).toBeGreaterThan(other.spring)
      expect(FORMS.smooth.reachMost).toBeGreaterThan(other.reachMost)
    }
    expect(FORMS.dust.spring).toBe(0)
    expect(FORMS.shaggy.lumps).toBeGreaterThan(FORMS.smooth.lumps)
    expect(FORMS.shaggy.reachMost).toBeCloseTo(40, 0)
  })
})

describe('the finger', () => {
  it('dents the outline under it before any step, and bulges the far side', () => {
    const b = body(FORMS.smooth), rest = [...b.outline()], n = rest.length / 2
    b.press(FORMS.smooth.rx * 0.72, 0)
    const now = b.outline()
    expect(apart(now, rest)).toBeGreaterThan(2)
    // Point 0 is the edge nearest the finger: it went in towards it, further than any other point went in.
    const inward = (i: number) => Math.hypot(rest[i * 2], rest[i * 2 + 1]) - Math.hypot(now[i * 2], now[i * 2 + 1])
    expect(inward(0)).toBeGreaterThan(2)
    for (let i = 3; i < n - 2; i++) expect(inward(i)).toBeLessThan(inward(0))
    expect(inward(n / 2)).toBeLessThan(-0.5)
    expect(b.finger).toEqual({ x: FORMS.smooth.rx * 0.72, y: 0 })
  })

  it('presses the edge in from just outside', () => {
    const b = body(FORMS.shaggy), rest = [...b.outline()]
    b.press(rest[0] + 12, rest[1])
    expect(b.outline()[0]).toBeLessThan(rest[0] - 5)
  })

  it('keeps the amount within 6% through a push, a drag and a scribble', () => {
    for (const shape of [FORMS.smooth, FORMS.shaggy, FORMS.streaky]) {
      const b = body(shape), whole = area(b.outline()), rnd = mulberry32(5)
      let worst = 0
      const check = () => { worst = Math.max(worst, Math.abs(area(b.outline()) / whole - 1)) }
      b.press(-shape.rx * 0.6, 0); check()
      for (let i = 0; i < 40; i++) { b.moveTo(-shape.rx * 0.6 + i * 3, i); check(); b.step(1 / 60); check() }
      for (let i = 0; i < 120; i++) { b.moveTo((rnd() - 0.5) * shape.rx * 1.2, (rnd() - 0.5) * shape.ry * 1.2); check(); b.step(1 / 60); check() }
      b.lift(); b.kick(1)
      for (let i = 0; i < 60; i++) { b.step(1 / 60); check() }
      expect(worst).toBeLessThan(0.06)
    }
  })

  it('never folds the outline over itself, however it is scribbled', () => {
    const turn = (p: readonly number[], a: number, b: number, c: number) => Math.sign((p[b] - p[a]) * (p[c + 1] - p[a + 1]) - (p[b + 1] - p[a + 1]) * (p[c] - p[a]))
    const crossings = (p: readonly number[]) => {
      let count = 0
      const n = p.length / 2
      for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue
        const a = i * 2, b = ((i + 1) % n) * 2, c = j * 2, d = ((j + 1) % n) * 2
        if (turn(p, a, b, c) !== turn(p, a, b, d) && turn(p, c, d, a) !== turn(p, c, d, b)) count++
      }
      return count
    }
    for (const shape of [FORMS.smooth, FORMS.shaggy, FORMS.streaky, FORMS.dust, FORMS.batter]) {
      const b = body(shape), rnd = mulberry32(11)
      let x = 0, y = 0, crossed = 0
      b.press(x, y)
      // A fast finger: up to thirty units a frame, anywhere on the lump.
      for (let i = 0; i < 240; i++) {
        x = Math.max(-shape.rx * 0.8, Math.min(shape.rx * 0.8, x + (rnd() - 0.5) * 60)); y = Math.max(-shape.ry * 0.7, Math.min(shape.ry * 0.7, y + (rnd() - 0.5) * 60))
        b.moveTo(x, y); b.step(1 / 60)
        crossed += crossings(b.outline())
      }
      expect(`${shape.kind} ${shape.texture} ${crossed}`).toBe(`${shape.kind} ${shape.texture} 0`)
    }
  })

  it('piles the stuff up ahead of a drag', () => {
    const b = body(FORMS.shaggy), rest = [...b.outline()]
    b.press(0, 0)
    for (let i = 1; i <= 12; i++) { b.moveTo(i * 5, 0); b.step(1 / 60) }
    expect(b.outline()[0]).toBeGreaterThan(rest[0] + 4)
  })

  it('gives a poke, a slap, a smear and a scribble each a different squash', () => {
    const after = (act: (b: DoughBody) => void) => { const b = body(FORMS.smooth); act(b); b.step(0.1); return [...b.outline()] }
    const shapes = [
      after((b) => { b.press(40, 10); b.lift() }),
      after((b) => b.kick(1)),
      after((b) => { b.press(-50, 0); for (let i = 0; i < 20; i++) b.moveTo(-50 + i * 5, 0); b.lift() }),
      after((b) => { b.press(0, 0); for (let i = 0; i < 20; i++) b.moveTo(i % 2 ? 30 : -30, i % 3 ? 20 : -20); b.lift() }),
    ]
    for (let a = 0; a < shapes.length; a++) for (let c = a + 1; c < shapes.length; c++) expect(apart(shapes[a], shapes[c])).toBeGreaterThan(1)
    // And the same slap twice does not land the same way.
    const twice = body(FORMS.smooth)
    twice.kick(1); twice.step(0.1)
    const first = [...twice.outline()]
    run(twice, 3); twice.kick(1); twice.step(0.1)
    expect(apart(first, twice.outline())).toBeGreaterThan(0.5)
  })
})

describe('letting go', () => {
  it('lets smooth dough settle back within 1.2 seconds', () => {
    const b = body(FORMS.smooth), rest = [...b.outline()]
    b.press(-60, 0)
    for (let i = 0; i < 30; i++) { b.moveTo(-60 + i * 4, i); b.step(1 / 60) }
    expect(b.settled).toBe(false)
    b.lift()
    b.step(0.05)
    expect(apart(b.outline(), rest)).toBeGreaterThan(1.5)
    b.step(1.15)
    expect(apart(b.outline(), rest)).toBeLessThan(1.5)
    expect(b.settled).toBe(true)
    expect(b.finger).toBeNull()
  })

  it('leaves a furrow in dust for a second and more, and none after six', () => {
    const b = body(FORMS.dust), rest = [...b.outline()]
    b.press(-FORMS.dust.rx * 0.5, 10)
    for (let i = 0; i < 20; i++) { b.moveTo(-FORMS.dust.rx * 0.5 + i * 5, 10); b.step(1 / 60) }
    b.lift()
    const cut = apart(b.outline(), rest)
    expect(cut).toBeGreaterThan(4)
    run(b, 1)
    expect(apart(b.outline(), rest)).toBeGreaterThan(cut * 0.7)
    expect(b.marks()[2]).toBeGreaterThan(0)
    run(b, 5)
    expect(apart(b.outline(), rest)).toBeLessThan(1)
    expect(b.marks()[2]).toBe(0)
    expect(b.settled).toBe(true)
  })

  it('eases to a new shape and never snaps', () => {
    const b = body(FORMS.shaggy), before = [...b.outline()]
    b.reshape(FORMS.batter)
    expect(apart(b.outline(), before)).toBe(0)
    b.step(1 / 60)
    const moved = apart(b.outline(), before)
    expect(moved).toBeGreaterThan(0)
    expect(moved).toBeLessThan(12)
    run(b, 3)
    expect(apart(b.outline(), body(FORMS.batter).outline())).toBeLessThan(1)
    b.reshape(null)
    run(b, 2)
    expect(apart(b.outline(), b.outline().map(() => 0))).toBeLessThan(1)
  })
})

describe('the lobe', () => {
  const pulled = (shape: Form) => {
    const b = body(shape)
    b.press(shape.rx * 0.5, 0)
    for (let i = 1; i <= 30; i++) { b.moveTo(shape.rx * 0.5 + (i / 30) * (shape.rx * 0.5 + 200), 0); b.step(1 / 60) }
    run(b, 0.3)
    return b
  }

  it('stops short in shaggy and streaky dough and goes far in smooth', () => {
    expect(body(FORMS.smooth).reach).toBe(0)
    expect(pulled(FORMS.shaggy).reach).toBeGreaterThan(34)
    expect(pulled(FORMS.shaggy).reach).toBeLessThan(46)
    expect(pulled(FORMS.streaky).reach).toBeLessThan(46)
    const far = pulled(FORMS.smooth)
    expect(far.reach).toBeGreaterThan(150)
    expect(far.reach).toBeLessThan(FORMS.smooth.reachMost + 3)
    // The lump stays a lump: it gives up only a little of itself to the lobe.
    const rest = body(FORMS.smooth).outline(), now = far.outline()
    let shrunk = 0
    for (let i = 12; i < now.length - 12; i += 2) shrunk = Math.max(shrunk, 1 - Math.hypot(now[i], now[i + 1]) / Math.hypot(rest[i], rest[i + 1]))
    expect(shrunk).toBeLessThan(0.12)
    // The tip of the lobe is out where the finger is.
    expect(Math.max(...far.outline().filter((_, i) => i % 2 === 0))).toBeGreaterThan(FORMS.smooth.rx + 150)
    const further = body(FORMS.smooth)
    further.press(0, 0); further.moveTo(FORMS.smooth.rx + 20, 0); further.moveTo(FORMS.smooth.rx + 600, 0)
    run(further, 0.5)
    expect(Math.abs(further.reach - FORMS.smooth.reachMost)).toBeLessThan(3)
  })

  it('springs home after the finger lifts', () => {
    const b = pulled(FORMS.smooth)
    b.lift()
    run(b, 1.5)
    expect(b.reach).toBe(0)
    expect(b.settled).toBe(true)
    expect(apart(b.outline(), body(FORMS.smooth).outline())).toBeLessThan(1.5)
  })

  it('does not grow for a finger that starts outside', () => {
    const b = body(FORMS.smooth)
    b.press(FORMS.smooth.rx + 80, 0); b.moveTo(FORMS.smooth.rx + 200, 0)
    run(b, 0.2)
    expect(b.reach).toBe(0)
  })
})

describe('the whole body', () => {
  it('knows its own middle from the board around it, in every form', () => {
    for (const shape of Object.values(FORMS)) {
      const b = body(shape)
      expect(b.contains(0, 0)).toBe(true)
      expect(b.contains(shape.rx * 0.8, 0)).toBe(true)
      expect(b.contains(shape.rx + 60, 0)).toBe(false)
      expect(b.contains(0, -shape.ry - 60)).toBe(false)
    }
    expect(body(null).contains(0, 0)).toBe(false)
  })

  /** Thirty seconds of everything at once, from one seed. */
  function abuse(seed: number, frames: (rnd: () => number) => number): { b: DoughBody; furthest: number } {
    const rnd = mulberry32(seed), shapes: (Form | null)[] = [...Object.values(FORMS), null], b = body(FORMS.smooth)
    let furthest = 0, clock = 0
    while (clock < 30) {
      const dice = rnd(), x = (rnd() - 0.5) * 900, y = (rnd() - 0.5) * 700
      if (dice < 0.15) b.press(x * 0.3, y * 0.3)
      else if (dice < 0.6) b.moveTo(x, y)
      else if (dice < 0.7) b.lift()
      else if (dice < 0.8) b.kick(rnd() * 3)
      else if (dice < 0.86) b.reshape(shapes[Math.floor(rnd() * shapes.length)])
      const seconds = frames(rnd)
      b.step(seconds); clock += seconds
      for (const value of b.outline()) { expect(Number.isFinite(value)).toBe(true); furthest = Math.max(furthest, Math.abs(value)) }
    }
    return { b, furthest }
  }

  it('stays whole and near under seeded abuse', () => {
    const widest = Math.max(...Object.values(FORMS).map((shape) => Math.max(shape.rx, shape.ry)))
    for (const seed of [1, 2, 3]) {
      const { b, furthest } = abuse(seed, (rnd) => rnd() * 0.05)
      // Three radii, or for the one form whose lobe is longer than that, the radius and the lobe.
      expect(furthest).toBeLessThan(Math.max(3 * widest, widest + FORMS.smooth.reachMost + 30))
      b.reshape(FORMS.smooth); b.lift()
      run(b, 4)
      expect(b.settled).toBe(true)
    }
  })

  it('does the same thing from the same touches', () => {
    expect([...abuse(9, (rnd) => rnd() * 0.04).b.outline()]).toEqual([...abuse(9, (rnd) => rnd() * 0.04).b.outline()])
  })

  it('does not care how long the frames are', () => {
    const touched = () => { const b = body(FORMS.smooth); b.press(50, 10); b.moveTo(70, 20); b.lift(); b.kick(0.8); return b }
    const one = touched(), many = touched()
    one.step(0.5)
    for (let i = 0; i < 60; i++) many.step(1 / 120)
    expect(apart(one.outline(), many.outline())).toBeLessThan(1e-6)
  })

  it('is cheap: 600 frames with a moving finger', () => {
    const b = body(FORMS.smooth)
    b.press(0, 0)
    for (let i = 0; i < 200; i++) { b.moveTo(Math.sin(i) * 40, Math.cos(i * 1.3) * 30); b.step(1 / 60) }
    const start = performance.now()
    for (let i = 0; i < 600; i++) { b.moveTo(Math.sin(i * 0.2) * 150, Math.cos(i * 0.13) * 60); b.step(1 / 60) }
    const took = performance.now() - start
    console.log(`doughBody: 600 frames of 1/60 s with a moving finger took ${took.toFixed(2)} ms (${(took / 600 * 1000).toFixed(1)} microseconds a frame)`)
    expect(took).toBeLessThan(60)
  })
})

describe('what the oven made', () => {
  const bread = (change: Partial<Bread>): Bread => ({ raw: false, crumb: 'airy', shape: 'round', crust: 'gold', seeds: false, ...change })
  const baked = (change: Partial<Bread>): Form => formOf(bread(change)) as Form
  /** One push near the right edge and a short way in: the same gesture for every form, scaled to it. Returns how far the outline moved at most. */
  const pushed = (b: DoughBody, shape: Form): number => {
    const rest = [...b.outline()]
    b.press(shape.rx * 0.75, 0); b.step(1 / 60)
    let most = apart(b.outline(), rest)
    for (let i = 1; i <= 6; i++) { b.moveTo(shape.rx * (0.75 - 0.05 * i), 0); b.step(1 / 60); most = Math.max(most, apart(b.outline(), rest)) }
    return most
  }

  it('gives every bread that can be baked a form that never stretches', () => {
    const breads = reachableBreads()
    expect(breads.length).toBeGreaterThan(20)
    for (const one of breads) {
      const shape = formOf(one)
      expect(shape?.bread).toEqual(one)
      expect(shape?.reachMost).toBe(0)
      expect(shape?.seeds).toBe(one.seeds)
      expect(shape && shape.rx > 30 && shape.ry > 20).toBe(true)
      const b = body(shape)
      expect(b.contains(0, 0)).toBe(true)
      // Dragged from its middle to far outside, nothing comes with the finger.
      b.press(0, 0); b.moveTo(shape!.rx + 40, 0); b.moveTo(shape!.rx + 300, 0)
      run(b, 0.3)
      expect(b.reach).toBe(0)
      expect(b.finger).toEqual({ x: shape!.rx + 300, y: 0 })
      for (const value of b.outline()) expect(Math.abs(value)).toBeLessThan(shape!.rx * 1.6)
    }
  })

  it('makes an airy loaf larger than a brick of the same shape, a long loaf wider and lower, and a pancake flat', () => {
    for (const shape of ['round', 'long'] as const) {
      const airy = baked({ crumb: 'airy', shape }), dense = baked({ crumb: 'dense', shape })
      expect(airy.rx).toBeGreaterThan(dense.rx * 1.2)
      expect(airy.ry).toBeGreaterThan(dense.ry * 1.2)
    }
    for (const crumb of ['airy', 'dense', 'crumbly'] as const) {
      expect(baked({ crumb, shape: 'long' }).rx).toBeGreaterThan(baked({ crumb }).rx * 1.3)
      expect(baked({ crumb, shape: 'long' }).ry).toBeLessThan(baked({ crumb }).ry * 0.85)
    }
    const pancake = baked({ crumb: 'pancake', shape: 'flat' })
    expect(pancake.rx / pancake.ry).toBeGreaterThan(3)
    expect(baked({ crumb: 'airy' }).rx).toBeCloseTo(100, 0)
    expect(baked({ crumb: 'dense' }).ry).toBeCloseTo(54, 0)
  })

  it('does not give when it is a brick, under a push that dents smooth dough deeply', () => {
    expect(pushed(body(FORMS.smooth), FORMS.smooth)).toBeGreaterThan(10)
    for (const shape of ['round', 'long'] as const) { const brick = baked({ crumb: 'dense', shape }); expect(pushed(body(brick), brick)).toBeLessThan(2) }
    const brick = baked({ crumb: 'dense' }), b = body(brick), rest = [...b.outline()]
    b.kick(1); b.step(0.05)
    expect(apart(b.outline(), rest)).toBeLessThan(2)
  })

  it('squashes when it is airy, and is back at rest within 0.6 seconds of the lift', () => {
    const airy = baked({ crumb: 'airy' }), b = body(airy), rest = [...b.outline()]
    expect(pushed(b, airy)).toBeGreaterThan(8)
    b.lift()
    run(b, 0.6)
    expect(apart(b.outline(), rest)).toBeLessThan(1.5)
    run(b, 0.6)
    expect(b.settled).toBe(true)
  })

  it('does not spring when it is crumbly, sheds marks for crumbs, and flops when it is a pancake', () => {
    const crumbly = baked({ crumb: 'crumbly' }), b = body(crumbly), rest = [...b.outline()]
    expect(crumbly.spring).toBe(0)
    const most = pushed(b, crumbly)
    expect(most).toBeGreaterThan(2)
    expect(most).toBeLessThan(pushed(body(FORMS.shaggy), FORMS.shaggy))
    expect(b.marks()[2]).toBeGreaterThan(0)
    b.lift(); run(b, 4)
    expect(apart(b.outline(), rest)).toBeLessThan(1)
    expect(b.marks()[2]).toBe(0)
    const pancake = baked({ crumb: 'pancake', shape: 'flat' })
    expect(pushed(body(pancake), pancake)).toBeGreaterThan(5)
  })

  it('keeps the amount of every bread within 6% while it is pushed', () => {
    for (const crumb of ['airy', 'dense', 'crumbly', 'pancake', 'dust'] as const) {
      const shape = baked({ crumb, shape: crumb === 'pancake' ? 'flat' : crumb === 'dust' ? 'heap' : 'round' }), b = body(shape), whole = area(b.outline())
      b.press(-shape.rx * 0.5, 0)
      for (let i = 0; i < 40; i++) { b.moveTo(-shape.rx * 0.5 + i * shape.rx * 0.025, Math.sin(i) * shape.ry * 0.4); b.step(1 / 60); expect(Math.abs(area(b.outline()) / whole - 1)).toBeLessThan(0.06) }
    }
  })
})

describe('risen dough and the bubbly alone', () => {
  it('is larger and rounder the more it has risen, up to about a quarter', () => {
    const flat = form({ flour: 2, water: 2, work: 10, bubbly: true }), half = form({ flour: 2, water: 2, work: 10, bubbly: true, rise: 50 }), full = form({ flour: 2, water: 2, work: 10, bubbly: true, rise: 100 })
    expect(half.rx).toBeGreaterThan(flat.rx)
    expect(full.rx).toBeGreaterThan(half.rx)
    expect(full.ry / flat.ry).toBeGreaterThan(1.2)
    expect(full.ry / flat.ry).toBeLessThan(1.3)
    expect(full.ry / full.rx).toBeGreaterThan(flat.ry / flat.rx)
    expect(full.rise).toBe(1)
    expect(full.bubbly).toBe(true)
    // The largest risen lump, round or long, still lies on the blade: about 400 by 230.
    const most = form({ flour: 3, water: 3, work: 10, bubbly: true, rise: 100 }), long = form({ flour: 3, water: 3, work: 10, bubbly: true, rise: 100, long: true })
    expect(most.ry * 2).toBeLessThan(230)
    expect(long.rx * 2).toBeLessThan(410)
  })

  it('still wobbles 0.4 seconds after a kick, when the same dough unrisen has nearly settled', () => {
    const wobble = (shape: Form) => {
      const b = body(shape), rest = [...b.outline()]
      b.kick(1); b.step(0.4)
      let most = 0
      for (let i = 0; i < 24; i++) { b.step(1 / 120); most = Math.max(most, apart(b.outline(), rest)) }
      return most
    }
    const flat = wobble(form({ flour: 2, water: 2, work: 10, bubbly: true })), risen = wobble(form({ flour: 2, water: 2, work: 10, bubbly: true, rise: 100 }))
    expect(risen).toBeGreaterThan(1.5)
    expect(risen).toBeGreaterThan(flat * 2.5)
    // And it does come to rest.
    const b = body(form({ flour: 2, water: 2, work: 10, bubbly: true, rise: 100 }))
    b.kick(1); run(b, 5)
    expect(b.settled).toBe(true)
  })

  it('gives the bubbly alone a small frothy blob', () => {
    const blob = formOf(stuff({ bubbly: true }))
    expect(blob?.kind).toBe('batter')
    expect(blob?.rx).toBeCloseTo(55, 0)
    expect(blob?.bubbly).toBe(true)
    expect(blob?.rx).toBeLessThan(form({ flour: 1, water: 2 }).rx)
    expect(formOf(stuff({ bubbly: true, rise: 100 }))!.rx).toBeGreaterThan(blob!.rx)
  })

  it('shares its resting outline with the painter', () => {
    for (const shape of [...Object.values(FORMS), formOf({ raw: false, crumb: 'dense', shape: 'long', crust: 'dark', seeds: true }) as Form]) {
      const rest: number[] = []
      restOutline(shape, rest, 36)
      expect(apart(rest, body(shape).outline())).toBe(0)
      for (let i = 0; i < 72; i += 2) expect(Math.hypot(rest[i] / shape.rx, rest[i + 1] / shape.ry)).toBeLessThan(1.45)
    }
  })
})
