import { describe, expect, it } from 'vitest'
import { BOTTOM, EDGE, FEATHERS, IDS, MOST_HIGH, QUILT, SLEDS, SUN, ground } from './layout'
import { makeRng } from './rng'
import { Hand, H, W } from './testing'

const SKY = 4
const fresh = (age: number | null = null) => { const h = new Hand(null, age); h.run(0.2); return h }

const white = () => { const h = new Hand({ ...new Hand().v.toState(), shown: true, snow: Array(120).fill(0.3) }); h.run(0.2); return h }

/** Things that must hold at every instant. */
function sound(h: Hand): void {
  const v = h.v
  expect(v.all).toBeCloseTo(FEATHERS, 6)
  expect(v.quilt.left).toBeGreaterThanOrEqual(-1e-9)
  for (const b of v.list) {
    expect(Number.isFinite(b.x + b.y + b.z + b.v + b.vy + b.tilt), b.id).toBe(true)
    expect(b.x).toBeGreaterThan(EDGE.left - 2)
    expect(b.x).toBeLessThan(EDGE.right + 2)
    if (b.on) expect(v.above(b.on)).toBe(b)
    if (b.on === null && b.mode === 'rest' && Math.abs(b.z) < 0.5) expect(b.y).toBeGreaterThan(ground(b.x) - 0.7)
  }
  for (const id of IDS) if (!v.bodies[id].on) expect(v.high(id)).toBeLessThanOrEqual(MOST_HIGH)
}

describe('the first minute', () => {
  it('shows one shake, its snow and a slip of the tub, before anybody touches', () => {
    const h = new Hand(), at = h.v.bodies.walrus.x, lying = h.v.snow.total
    h.run(6)
    expect(h.v.snow.total).toBeGreaterThan(lying)
    expect(h.v.bodies.walrus.x).toBeGreaterThan(at + 0.5)
    expect(h.v.bodies.walrus.mode).toBe('rest')
    sound(h)
    const snow = h.v.snow.total
    h.run(8)
    expect(h.v.snow.total).toBeCloseTo(snow, 6)
  })
  it('answers the first finger by the next frame, wherever it lands', () => {
    for (const [x, y] of [[-4, 4], [8, 1], [0, -8], [-5, -1], [SUN.x, SUN.y]]) {
      const h = fresh()
      h.down(x, y)
      expect(h.v.events.length).toBeGreaterThan(0)
    }
  })
  it('sends the tub off by two touches', () => {
    const h = fresh(), at = h.v.bodies.walrus.x
    h.tap(-3.5, SKY); h.run(1.2); h.tap(-2, SKY); h.run(3)
    expect(h.v.bodies.walrus.x).toBeGreaterThan(at + 1)
  })
})

it('taps on the quilt alone make a run: the walrus gets to the bottom', () => {
  const h = fresh()
  for (let k = 0; k < 30 && h.v.base(h.v.bodies.walrus).x < BOTTOM; k++) { h.tap(h.v.quilt.x, h.v.quilt.hem + 1.5); h.run(1.1) }
  expect(h.v.base(h.v.bodies.walrus).x).toBeGreaterThan(BOTTOM)
})

describe('feathers and snow', () => {
  it('fall straight down, under where the quilt was', () => {
    const h = fresh()
    const before = Float64Array.from(h.v.snow.depth)
    h.down(4, SKY); h.run(0.5)
    h.up(4, SKY); h.run(0.5); h.tap(4, SKY); h.run(4)
    let near = 0, all = 0
    h.v.snow.depth.forEach((d, i) => { const x = -14 + (i + 0.5) * (28 / 120), more = d - before[i]; if (more > 0 && x > 0) { all += more; if (Math.abs(x - 4) < 3) near += more } })
    expect(near / all).toBeGreaterThan(0.75)
  })
  it('empty the quilt, and four pats bring every one back and the hill is green', () => {
    const h = fresh()
    for (let k = 0; k < 12 && !h.v.quilt.empty; k++) { h.drag(-9, SKY, 10, SKY, 1.5); h.run(0.5); sound(h) }
    h.rest()
    expect(h.v.quilt.empty).toBe(true)
    expect(h.v.quilt.left).toBeLessThan(0.1)
    for (let k = 0; k < 4; k++) { h.tap(h.v.quilt.x, h.v.quilt.hem + 1.5); h.run(0.5) }
    h.rest()
    h.run(2)
    expect(h.v.quilt.empty).toBe(false)
    expect(h.v.snow.total).toBeLessThan(0.5)
    expect(h.v.quilt.left).toBeGreaterThan(FEATHERS - 0.6)
    sound(h)
    // The next round stands ready: somebody asks.
    expect(h.v.asker?.x).toBeLessThan(BOTTOM)
  })
})

describe('the sleds', () => {
  it('stop where the snow stops', () => {
    const h = fresh()
    h.drag(-4, SKY, -1.5, SKY, 0.8)
    h.run(8)
    const w = h.v.bodies.walrus
    expect(w.mode).toBe('rest')
    expect(w.x).toBeLessThan(1.5)
  })
  it('stay on bare grass whatever time goes by, and on snow when nobody is there', () => {
    const h = fresh()
    h.whiten()
    h.rest()
    const at = IDS.map((id) => h.v.bodies[id].x)
    h.run(60)
    IDS.forEach((id, i) => expect(h.v.bodies[id].x, id).toBeCloseTo(at[i], 1))
  })
  it('run the whole hill when it is white, and pick up the hen on the way', () => {
    const h = white()
    const w = h.v.bodies.walrus
    h.tap(w.x, w.y + 1); h.rest()
    expect(h.v.base(w).x).toBeGreaterThan(BOTTOM)
    expect(h.v.bodies.hen.on).not.toBeNull()
  })
  it('come one after another, each by a touch', () => {
    const h = fresh()
    let most = 0
    for (let k = 0; k < 8; k++) { h.drag(-8, SKY, 9, SKY, 1); h.rest(); sound(h); most = Math.max(most, SLEDS.filter((id) => h.v.bodies[id].out).length) }
    expect(most).toBe(4)
  })
  it('go home on a tap, whoever is down the hill', () => {
    const h = white(), w = h.v.bodies.walrus
    h.tap(w.x, w.y + 1); h.rest()
    expect(w.x).toBeGreaterThan(BOTTOM)
    h.v.tap({ kind: 'body', id: 'walrus' })
    h.run(6)
    expect(w.x).toBeLessThan(BOTTOM)
    expect(w.mode).toBe('rest')
  })
  it('never get higher than four', () => {
    const h = fresh(7)
    for (let k = 0; k < 10; k++) { h.drag(-9, SKY, 10, SKY, 1.1); for (const id of SLEDS) { const b = h.v.bodies[id]; if (!b.out && b.mode === 'rest') h.v.tap({ kind: 'body', id }) } h.rest(); sound(h) }
  })
})

describe('evening', () => {
  it('comes and goes at a touch of the sun or the quilt, and everybody rides once', () => {
    const h = fresh()
    h.whiten(); h.rest()
    h.tap(SUN.x, SUN.y)
    expect(h.v.night).toBe(true)
    h.rest(40)
    expect(h.v.busy).toBe(false)
    sound(h)
    h.tap(-3, SKY)
    expect(h.v.night).toBe(false)
  })
})

describe('fingers', () => {
  it('carry one, and let it fall where they let go', () => {
    const h = fresh(), b = h.v.bodies.mayor
    h.drag(b.x, b.y + 1, 3, 2, 0.6)
    h.run(3)
    expect(Math.abs(h.v.bodies.mayor.x - 3)).toBeLessThan(3)
    expect(h.v.held).toBeNull()
    sound(h)
  })
  it('taken away put back what they carried', () => {
    const h = fresh(), b = h.v.bodies.mayor, at = b.x
    h.down(b.x, b.y + 1); h.move(b.x - 4, 2); h.run(0.4)
    expect(h.v.held).toBe('mayor')
    h.play.cancel(h.id)
    h.run(1)
    expect(h.v.bodies.mayor.x).toBeCloseTo(at, 1)
    expect(h.v.held).toBeNull()
  })
  it('survive a short lift, and a long one is a let-go', () => {
    const h = fresh(), b = h.v.bodies.mayor
    h.down(b.x, b.y + 1); h.move(6, 2); h.run(0.3); h.up(6, 2); h.run(0.15)
    expect(h.v.held).toBe('mayor')
    h.down(6, 2); expect(h.v.held).toBe('mayor')
    h.up(6, 2); h.run(0.5)
    expect(h.v.held).toBeNull()
  })
  it('come in twos: the second takes nothing from the first', () => {
    const h = fresh(), b = h.v.bodies.mayor
    h.down(b.x, b.y + 1); h.move(6, 2); h.run(0.2)
    h.play.down(2, 100, 100); h.play.move(2, 400, 100); h.play.up(2, 400, 100)
    expect(h.v.held).toBe('mayor')
    sound(h)
  })
  it('measure nothing on a surface of no size', () => {
    const h = fresh()
    h.play.size(0, 0)
    expect(() => h.play.down(1, 0, 0)).not.toThrow()
    h.play.size(W, H)
  })
})

describe('put away', () => {
  it('at any instant of any play, is found as it was left', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = makeRng(seed), h = new Hand(null, seed % 2 ? 3 : 7, seed)
      for (let k = 0; k < 40; k++) {
        const x = -11 + rng.next() * 23, y = -7 + rng.next() * 14
        if (rng.next() < 0.5) h.drag(x, y, -11 + rng.next() * 23, -6 + rng.next() * 12, 0.2 + rng.next())
        else if (rng.next() < 0.8) h.tap(x, y)
        else { h.down(x, y); h.run(0.2); h.move(x + 2, y + 1); if (rng.next() < 0.5) h.play.cancel(h.id); else h.up(x, y) }
        h.run(rng.next() * 1.5)
        sound(h)
        if (k % 4 !== 3) continue
        h.play.park()
        sound(h)
        const left = JSON.parse(JSON.stringify(h.v.toState()))
        const again = new Hand(left)
        sound(again)
        const found = again.v.toState()
        for (const id of IDS) {
          expect(found.bodies[id].on, `${seed} ${k} ${id}`).toBe(left.bodies[id].on)
          expect(found.bodies[id].out).toBe(left.bodies[id].out)
          if (!left.bodies[id].on) expect(Math.abs(found.bodies[id].x - left.bodies[id].x), `${seed} ${k} ${id}`).toBeLessThan(0.15)
        }
        expect(found.empty).toBe(left.empty)
        expect(found.night).toBe(left.night)
        expect(found.snow).toEqual(left.snow)
        // Nothing starts by itself.
        again.run(5)
        for (const id of IDS) expect(Math.abs(again.v.bodies[id].x - found.bodies[id].x), `${seed} ${k} ${id} moves`).toBeLessThan(0.6)
      }
    }
  })
  it('always leaves a way on: the hand has a move to show', () => {
    const h = fresh()
    for (let k = 0; k < 30; k++) { h.drag(-9, SKY, 10, SKY, 0.8); h.run(1); expect(h.v.quilt.left > 0.03 || h.v.snow.total + h.v.list.reduce((s, b) => s + b.cap, 0) > 1).toBe(true) }
    expect(QUILT.left).toBeLessThan(QUILT.right)
  })
})
