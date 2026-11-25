import { describe, expect, it } from 'vitest'
import { CAST, GUESTS, arrivals } from './cast'
import { TOP } from './layout'
import { dishAt, deserialize, freshState, serialize } from './save'
import { STAGE } from './stage'
import { Hand } from './testing'

const again = (h: Hand) => new Hand(deserialize(JSON.parse(JSON.stringify(serialize(h.table.saved())))))

describe('the pull', () => {
  it('seats the one who waits, and the next one comes to the door', () => {
    const h = new Hand()
    expect(h.table.waiter).toBe('baby')
    h.dragBy(h.knob, 250, 0)
    h.run(1.5)
    expect(h.table.state.order).toEqual(['granny', 'grandpa', 'baby'])
    expect(h.table.waiter).toBe('aunt')
    expect(h.table.waiterT).toBe(1)
  })
  it('is finished for the child from half way, and breathes back before that', () => {
    const h = new Hand()
    h.dragBy(h.knob, 80, 0); h.run(2)
    expect(h.table.state.order).toHaveLength(3)
    const g = new Hand()
    g.dragBy(g.knob, 34, 0); g.run(2)
    expect(g.table.state.order).toHaveLength(2)
    expect(g.table.ext).toBe(0)
  })
  it('works with a tap, all the way to the moose, and everyone is on screen at every length', () => {
    const h = new Hand()
    for (let i = 0; i < 10; i++) {
      h.seat(1)
      expect(h.table.state.order).toHaveLength(3 + i)
      expect(h.knob.x + h.table.radius * h.table.cam.z).toBeLessThan(STAGE.width)
      expect(h.bell.x - h.table.radius * h.table.cam.z).toBeGreaterThan(0)
      expect(h.table.radius * h.table.cam.z).toBeGreaterThanOrEqual(50)
      expect(h.knob.y + h.table.radius * h.table.cam.z).toBeLessThan(STAGE.height - 60)
      const w = h.table.waiter
      if (w) expect(h.on({ x: h.table.door().x + CAST[w].width / 2, y: 0 }).x).toBeLessThan(STAGE.width)
    }
    expect(h.table.state.order.at(-1)).toBe('moose')
    expect(h.table.waiter).toBeNull()
    h.seat(1)
    expect(h.table.state.order).toHaveLength(12)
  })
  it('seats several when it is long and slow', () => {
    const h = new Hand()
    const p = h.knob
    h.play.down(1, p.x, p.y)
    for (let i = 1; i <= 240; i++) { h.play.move(1, p.x + i * 2, p.y); h.run(0.02) }
    h.play.up(1, p.x + 480, p.y)
    h.run(2)
    expect(h.table.state.order.length).toBeGreaterThanOrEqual(4)
  })
  it('seats nobody when the finger is taken away', () => {
    const h = new Hand()
    h.dragBy(h.knob, 100, 0, 'cancel', 8)
    const n = h.table.state.order.length
    h.run(2)
    expect(n).toBe(2)
    expect(h.table.state.order).toHaveLength(2)
  })
  it('never lets two places overlap or a width go below nothing', () => {
    const h = new Hand()
    h.seat(5)
    h.dragBy(h.face('dog'), -300, 0)
    h.tapAt(h.knob)
    h.run(3, () => {
      let end = 0
      for (const id of h.table.state.order) { const p = h.table.place(id); if (!p) continue; expect(p.x - p.w / 2).toBeGreaterThanOrEqual(end - 1e-6); end = p.x + p.w / 2 }
      expect(end).toBeLessThanOrEqual(h.table.length + 1e-6)
    })
  })
})

describe('the push', () => {
  it('squashes everyone, has a floor, hurts nobody and breathes out', () => {
    const h = new Hand()
    h.seat(3)
    const w = h.table.place('aunt')!.w
    h.dragBy(h.knob, -420, 0, 'hold')
    expect(h.table.place('aunt')!.w).toBeLessThan(w * 0.65)
    expect(h.table.squeeze).toBeGreaterThan(0.5)
    h.play.up(1, 0, 400)
    h.run(3)
    expect(h.table.place('aunt')!.w).toBeCloseTo(w, 0)
    expect(h.table.state.order).toHaveLength(5)
  })
})

describe('the feast', () => {
  it('eats what stands before each, stays seen, and a push then sends all home', () => {
    const h = new Hand()
    h.seat(2)
    h.tapAt(h.bell)
    expect(h.table.feast).not.toBeNull()
    const length = h.table.feast!.length
    expect(length).toBeGreaterThanOrEqual(4)
    expect(length).toBeLessThanOrEqual(10)
    h.run(length + 0.1)
    expect(h.table.feast).toBeNull()
    expect(h.table.eaten('grandpa')).toBe('mash')
    expect(h.table.isFull('mash')).toBe(false)
    h.dragBy(h.knob, -420, 0); h.run(4)
    expect(h.table.state.order).toEqual(['granny', 'grandpa'])
    expect(h.table.waiter).toBe('baby')
    expect(h.table.isFull('mash')).toBe(true)
    expect(arrivals(h.table.state.rounds)[1]).not.toBe('aunt')
  })
  it('goes home at a tap of the knob only when nobody waits', () => {
    const h = new Hand()
    h.tapAt(h.bell); h.run(8)
    h.seat(1)
    expect(h.table.state.order).toHaveLength(3)
    h.seat(9)
    h.tapAt(h.bell); h.run(11)
    h.tapAt(h.knob); h.run(5)
    expect(h.table.state.order).toHaveLength(2)
  })
  it('lasts no longer than its length with everyone there, and a touch ends it with everything eaten', () => {
    const h = new Hand()
    h.seat(10)
    h.tapAt(h.bell)
    expect(h.table.feast!.length).toBeLessThanOrEqual(10)
    h.run(1)
    h.tapAt({ x: 590, y: 120 })
    expect(h.table.feast).toBeNull()
    for (const id of GUESTS) expect(h.table.eaten(id)).toBe(CAST[id].brings)
  })
  it('gives a bite of the neighbour’s to one with nothing before it', () => {
    const h = new Hand()
    h.seat(1)
    h.table.state.dishes.milk.full = false
    h.tapAt(h.bell)
    expect(h.table.state.ate.baby).toBe('mash')
  })
  it('fills an empty dish at a tap', () => {
    const h = new Hand()
    h.tapAt(h.bell); h.run(8)
    const p = h.table.dishPos('corn')
    h.tapAt(h.on({ x: p.x, y: p.y - 20 }))
    expect(h.table.isFull('corn')).toBe(true)
  })
})

describe('carrying', () => {
  it('moves a guest along the row', () => {
    const h = new Hand()
    h.seat(3)
    const from = h.face('uncle'), to = h.face('granny')
    h.dragBy(from, to.x - 70 - from.x, 0)
    h.run(1.5)
    expect(h.table.state.order[0]).toBe('uncle')
    expect(h.table.place('uncle')!.x).toBeLessThan(h.table.place('granny')!.x)
    expect(h.table.row.filter((p) => p.id === null)).toHaveLength(0)
  })
  it('puts a guest back when the finger is taken away, and survives a short lift', () => {
    const h = new Hand()
    h.seat(3)
    const before = [...h.table.state.order], from = h.face('uncle')
    h.dragBy(from, -400, -60, 'cancel'); h.run(1.5)
    expect(h.table.state.order).toEqual(before)
    h.dragBy(h.face('uncle'), -200, -60)
    expect(h.table.carry).not.toBeNull()
    h.play.down(1, from.x - 200, from.y - 60)
    h.run(1)
    expect(h.table.carry).not.toBeNull()
    h.play.up(1, from.x - 200, from.y - 60)
    h.run(1)
    expect(h.table.carry).toBeNull()
    expect(h.table.row.map((p) => p.id)).toEqual(h.table.state.order)
  })
  it('seats the one who waits when it is carried to the table, anywhere', () => {
    const h = new Hand()
    const d = h.table.door()
    const p = h.on({ x: d.x + 10, y: TOP - 110 }), to = h.on({ x: 108, y: TOP - 110 })
    h.dragBy(p, to.x - p.x, 0)
    h.run(2)
    expect(h.table.state.order).toEqual(['granny', 'baby', 'grandpa'])
  })
  it('changes two dishes round, and one can be worn', () => {
    const h = new Hand()
    h.seat(1)
    const a = h.table.dishPos('corn'), b = h.table.dishPos('milk'), p = h.on({ x: a.x, y: a.y - 20 })
    h.dragBy(p, (b.x - a.x) * h.table.cam.z, 0); h.run(1)
    expect(dishAt(h.table.state, 'baby')).toBe('corn')
    expect(dishAt(h.table.state, 'granny')).toBe('milk')
    const m = h.table.dishPos('mash'), q = h.on({ x: m.x, y: m.y - 20 })
    h.dragBy(q, 0, -(CAST.grandpa.tall + 20) * h.table.cam.z); h.run(1)
    expect(dishAt(h.table.state, 'grandpa', 'head')).toBe('mash')
  })
  it('tips the dishes along only when the knob goes nearly straight down, and far', () => {
    const h = new Hand()
    h.seat(1)
    h.dragBy(h.knob, 60, 110); h.run(1.5)
    expect(dishAt(h.table.state, 'granny')).toBe('corn')
    h.dragBy(h.knob, 5, 160); h.run(1.5)
    expect(dishAt(h.table.state, 'grandpa')).toBe('corn')
  })
})

describe('small hands', () => {
  it('lets a palm do nothing but leave a flower, and takes nothing from the first finger', () => {
    const h = new Hand()
    const p = h.knob
    h.play.down(1, p.x, p.y)
    h.play.move(1, p.x + 30, p.y)
    const ext = h.table.ext
    for (let i = 2; i < 6; i++) h.play.down(i, 200 + i * 90, 780)
    expect(h.table.marks).toHaveLength(4)
    expect(h.table.ext).toBe(ext)
    h.play.move(1, p.x + 250, p.y); h.run(1.2)
    expect(h.table.state.order).toHaveLength(3)
  })
  it('hands the work on from a finger that lies on bare ground', () => {
    const h = new Hand()
    h.play.down(1, 60, 790)
    h.run(0.1)
    h.tapAt(h.knob, 2); h.run(2)
    expect(h.table.state.order).toHaveLength(3)
  })
  it('answers every touch with sound at once', () => {
    const h = new Hand()
    for (const p of [h.knob, h.bell, h.face('granny'), h.on({ x: h.table.door().x, y: TOP - 100 }), { x: 30, y: 60 }, h.on({ x: 70, y: -462 })]) {
      h.table.sounds.length = 0
      h.play.down(1, p.x, p.y)
      expect(h.table.sounds.length).toBeGreaterThan(0)
      h.play.cancel(1)
    }
  })
  it('bumps the one who waits off the row and cracks the table open', () => {
    const h = new Hand()
    h.tapAt(h.on({ x: h.table.door().x + 20, y: TOP - 100 }))
    let most = 0
    h.run(1.5, () => { most = Math.max(most, h.table.ext) })
    expect(most).toBeGreaterThan(0.12)
    expect(h.table.state.order).toHaveLength(2)
    expect(h.table.lit).toBe(true)
  })
  it('nudges the knob while the child is idle, and stops', () => {
    const h = new Hand()
    let most = 0
    h.run(12, () => { most = Math.max(most, h.table.ext) })
    expect(most).toBeGreaterThan(0.1)
    h.run(60)
    most = 0
    h.run(20, () => { most = Math.max(most, h.table.ext) })
    expect(most).toBeLessThan(0.02)
    expect(h.table.state.order).toHaveLength(2)
  })
})

describe('the first round', () => {
  it('is shown once, seats the baby and is saved from its start', () => {
    const h = new Hand(freshState())
    expect(serialize(h.table.saved()).order).toContain('baby')
    h.run(4)
    expect(h.table.state.order).toHaveLength(3)
    expect(again(h).table.intro).toBeNull()
    expect(again(h).table.waiter).toBe('aunt')
  })
  it('gives way to any touch', () => {
    const h = new Hand(freshState())
    h.run(0.4)
    h.tapAt({ x: 400, y: 790 })
    expect(h.table.intro).toBeNull()
    expect(h.table.state.order).toHaveLength(3)
  })
})

describe('found as left', () => {
  it('at any instant of a long play', () => {
    const h = new Hand(freshState())
    const acts = [() => h.tapAt(h.knob), () => h.dragBy(h.knob, 200, 0), () => h.tapAt(h.bell), () => h.dragBy(h.face('grandpa'), 260, -40), () => h.dragBy(h.knob, 0, 170), () => h.dragBy(h.knob, -400, 0)]
    for (let i = 0; i < 90; i++) {
      acts[(i * 7 + ((i / 5) | 0)) % acts.length]()
      h.run((i % 4) * 0.4)
      const before = serialize(h.table.saved()), b = again(h)
      expect(serialize(b.table.saved())).toEqual(before)
      expect(b.table.waiter).toBe(arrivals(b.table.state.rounds).find((g) => !b.table.state.order.includes(g)) ?? null)
      expect(JSON.stringify(before).length).toBeLessThan(4000)
    }
  })
  it('puts a carried one back when it is put away under the finger, and nothing is left in the air', () => {
    const h = new Hand()
    h.seat(2)
    const before = [...h.table.state.order]
    h.dragBy(h.face('aunt'), -300, -100, 'hold')
    h.play.park()
    expect(h.table.state.order).toEqual(before)
    expect(h.table.carry).toBeNull()
    expect(h.table.row.map((p) => p.id)).toEqual(before)
    for (const id of GUESTS) expect(h.table.bodies[id].fly).toBeNull()
  })
})

describe('help', () => {
  /** Seconds until the hand shows, and where it goes. */
  const wait = (h: Hand) => { for (let t = 0; t < 12; t += 1 / 60) { const g = h.play.step(1 / 60); if (g.demo !== null) return { t, show: h.table.toShow() } } return null }
  it('comes while someone waits, at the full table, and after the feast', () => {
    const h = new Hand()
    expect(wait(h)?.show?.kind).toBe('drag')
    h.seat(10)
    const bell = wait(h)
    expect(bell).not.toBeNull()
    expect(bell!.t).toBeLessThan(6)
    expect(bell!.show).toMatchObject({ kind: 'tap' })
    h.tapAt(h.bell)
    h.run(h.table.feast!.length)
    const home = wait(h)
    expect(home).not.toBeNull()
    expect(home!.t).toBeLessThan(6)
    expect((home!.show as { dx: number }).dx).toBeLessThan(0)
  })
})

describe('two things at once', () => {
  const full = () => { const h = new Hand(); h.seat(10); h.tapAt(h.bell); h.run(h.table.feast!.length + 0.1); return h }
  const sound = (h: Hand) => { h.run(4); expect(h.table.carry).toBeNull(); expect(h.table.busy).toBe(false); expect(h.table.row.map((p) => p.id)).toEqual(h.table.state.order); expect(serialize(again(h).table.saved())).toEqual(serialize(h.table.saved())) }
  it('carries after a round shown to its end', () => {
    const h = new Hand(freshState())
    h.run(6)
    h.dragBy(h.face('granny'), 230, 0); h.run(1)
    expect(h.table.state.order[0]).not.toBe('granny')
    sound(h)
  })
  it('lets the one who waits be picked up while the table opens for it', () => {
    const h = new Hand()
    const d = h.on({ x: h.table.door().x + 30, y: TOP - 100 })
    h.tapAt(h.knob)
    h.dragBy(d, -300, 0)
    sound(h)
    expect(h.table.state.order.filter((g) => g === 'baby')).toHaveLength(1)
  })
  it('keeps a pull that was begun when someone else is picked up', () => {
    const h = new Hand()
    const p = h.face('granny')
    h.tapAt(h.knob)
    h.dragBy(p, 200, 0)
    sound(h)
    expect(h.table.state.order).toContain('baby')
  })
  it('stops the going home for a hand, and loses nobody', () => {
    for (const end of ['up', 'cancel'] as const) for (const what of ['moose', 'granny'] as const) {
      const h = full(), p = h.face(what)
      h.tapAt(h.knob)
      h.run(0.2)
      h.dragBy(p, -200, 0, end)
      sound(h)
      expect(h.table.state.order).toHaveLength(12)
    }
    const h = full()
    h.tapAt(h.knob); h.run(0.2); h.tapAt(h.bell)
    expect(h.table.state.order).toHaveLength(12)
    h.run(12); sound(h)
  })
  it('finishes on put-away what a tap began', () => {
    const h = new Hand()
    h.tapAt(h.knob); h.play.park()
    expect(h.table.state.order).toHaveLength(3)
    const g = full()
    g.tapAt(g.knob); g.play.park()
    expect(g.table.state.order).toHaveLength(2)
    sound(g)
  })
  it('rests at ten frames a second', () => {
    const h = new Hand()
    h.tapAt(h.knob)
    for (let i = 0; i < 80; i++) h.play.step(0.1)
    for (const id of h.table.state.order) expect(h.table.bodies[id].sq).toBeCloseTo(1, 1)
  })
  it('gives the bite from whichever neighbour has something', () => {
    const h = new Hand()
    h.seat(1)
    h.table.state.dishes.mash.full = h.table.state.dishes.milk.full = false
    h.tapAt(h.bell)
    expect(h.table.state.ate.grandpa).toBe('corn')
  })
})
