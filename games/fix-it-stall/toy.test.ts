import { describe, expect, it } from 'vitest'
import { deserializeStall, freshStall, serializeStall } from './save'
import { bootAt, looseEnd, padAt, TOY, type P } from './stage'
import { suggest, Toy, withToy } from './toy'

// Pads of the toy's board: 0 the cell's base, 1 its cap, 2 and 3 the lamp's legs, 4 and 5 the two posts.
const fresh = () => new Toy(freshStall(null))
const pad = (toy: Toy, i: number) => padAt(toy.circuit, i)
const lit = (toy: Toy) => toy.litLamp() !== null
/** One whole touch: down on `from`, across to `to`, and up. */
const drag = (toy: Toy, from: P, to: P) => {
  toy.press(from)
  toy.move({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 })
  toy.move(to)
  toy.lift(to, 'end')
}
const tap = (toy: Toy, at: P) => { toy.press(at); toy.lift(at, 'tap') }
const voices = (toy: Toy) => toy.sounds.map((s) => s.voice)
const settle = (toy: Toy, seconds = 3) => { for (let i = 0; i < seconds * 60; i++) toy.step(1 / 60) }
const mid = (toy: Toy, part: number) => {
  const p = pad(toy, toy.circuit.parts[part].a), q = pad(toy, toy.circuit.parts[part].b)
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
}
const loop = (toy: Toy) => { drag(toy, pad(toy, 1), pad(toy, 2)); drag(toy, pad(toy, 3), pad(toy, 0)) }

describe('the empty scene', () => {
  it('is a cell, a lamp and no lead, with nothing running', () => {
    const toy = fresh()
    expect(toy.circuit.gadget).toBe('toy')
    expect(toy.circuit.parts.map((p) => p.kind)).toEqual(['cell', 'lamp'])
    expect(toy.circuit.leads).toEqual([])
    expect(lit(toy)).toBe(false)
  })

  it('is put on the mat over whatever the stall held, and left alone once it is there', () => {
    const stall = freshStall(null)
    const once = withToy(stall)
    expect(once.job.circuit.gadget).toBe('toy')
    expect(once.next).toBe(stall.next)
    expect(withToy(once)).toBe(once)
  })
})

describe('clipping a lead', () => {
  it('a clip bites in the press, before any lift: the answer starts when the finger lands', () => {
    const toy = fresh()
    toy.press(pad(toy, 1))
    expect(toy.circuit.leads).toEqual([{ a: 1, b: null }])
    expect(voices(toy)).toEqual(['lead-clip'])
    expect(toy.marks.map((m) => m.type)).toEqual(['bite'])
    expect(toy.hand).toMatchObject({ lead: 0 })
  })

  it('the second clip bites where the finger lifts', () => {
    const toy = fresh()
    drag(toy, pad(toy, 1), pad(toy, 2))
    expect(toy.circuit.leads).toEqual([{ a: 1, b: 2 }])
    expect(voices(toy)).toEqual(['lead-clip', 'lead-clip'])
    expect(toy.hand).toBeNull()
  })

  it('forgives a finger that lifts near a pad, and one that lets go and comes back', () => {
    const toy = fresh()
    const near = { x: pad(toy, 2).x + 30, y: pad(toy, 2).y - 25 }
    drag(toy, pad(toy, 1), near)
    expect(toy.circuit.leads[0]).toEqual({ a: 1, b: 2 })
    // Let go in the middle of the mat, come back, and carry on to the pad.
    toy.press(pad(toy, 3))
    toy.move({ x: 700, y: 700 })
    toy.lift({ x: 700, y: 700 }, 'lift')
    expect(toy.hand).not.toBeNull()
    toy.move(pad(toy, 0))
    toy.lift(pad(toy, 0), 'end')
    expect(toy.circuit.leads[1]).toEqual({ a: 3, b: 0 })
  })

  it('the moment the loop closes the lamp is lit, in that call: no button and no wait', () => {
    const toy = fresh()
    drag(toy, pad(toy, 1), pad(toy, 2))
    expect(lit(toy)).toBe(false)
    toy.sounds = []; toy.marks = []
    toy.press(pad(toy, 3)); toy.move(pad(toy, 0))
    expect(lit(toy)).toBe(false)
    toy.lift(pad(toy, 0), 'end')
    expect(lit(toy)).toBe(true)
    expect(voices(toy)).toEqual(['lead-clip', 'lead-clip', 'lamp-clip', 'cell-clip'])
    expect(toy.marks.map((m) => m.type)).toContain('lit')
    // One current all the way round: both leads carry what the lamp carries.
    expect(Math.abs(toy.reading.leads[0])).toBeCloseTo(Math.abs(toy.reading.leads[1]), 6)
  })

  it('two taps do the same as a drag: the first pad, then the second', () => {
    const toy = fresh()
    tap(toy, pad(toy, 1))
    expect(toy.armed).toBe(0)
    expect(toy.circuit.leads).toEqual([{ a: 1, b: null }])
    tap(toy, pad(toy, 2))
    expect(toy.armed).toBeNull()
    expect(toy.circuit.leads).toEqual([{ a: 1, b: 2 }])
    tap(toy, pad(toy, 3)); tap(toy, pad(toy, 0))
    expect(lit(toy)).toBe(true)
  })

  it('a lead let go over nothing drops limp, its free clip snaps once, and it stays', () => {
    const toy = fresh()
    drag(toy, pad(toy, 1), { x: 760, y: 720 })
    expect(toy.circuit.leads).toEqual([{ a: 1, b: null }])
    expect(voices(toy)).toEqual(['lead-clip', 'lead-drop'])
    // It falls from where it was let go to where it lies.
    expect(toy.endOf(0)).toEqual({ x: 760, y: 720 })
    settle(toy)
    expect(toy.endOf(0)).toEqual(looseEnd(toy.circuit, 0))
    // And is picked up again from there.
    drag(toy, looseEnd(toy.circuit, 0), pad(toy, 2))
    expect(toy.circuit.leads).toEqual([{ a: 1, b: 2 }])
  })

  it('a lead can start at the coil: its first clip bites where the finger lifts', () => {
    const toy = fresh()
    drag(toy, TOY.coil, pad(toy, 4))
    expect(toy.circuit.leads).toEqual([{ a: 4, b: null }])
    expect(voices(toy)).toEqual(['coil-pull', 'lead-clip'])
    // Pulled out and let go over nothing, it winds back.
    drag(toy, TOY.coil, { x: 800, y: 740 })
    expect(toy.circuit.leads).toHaveLength(1)
    expect(voices(toy).at(-1)).toBe('lead-wind')
  })
})

describe('taking a lead off', () => {
  it('everything stops at once when a boot is pulled, in the press', () => {
    const toy = fresh()
    loop(toy)
    expect(lit(toy)).toBe(true)
    toy.sounds = []; toy.marks = []
    toy.press(bootAt(toy.circuit, 1, 1, toy.bends()[1]))
    expect(lit(toy)).toBe(false)
    expect(toy.circuit.leads[1]).toEqual({ a: 3, b: null })
    for (const c of [...toy.reading.leads, ...toy.reading.parts]) expect(Math.abs(c)).toBeLessThan(1e-6)
    expect(voices(toy)).toEqual(['lead-unclip'])
    expect(toy.marks.map((m) => m.type)).toEqual(['out'])
    // Put back, it runs again.
    toy.move(pad(toy, 0)); toy.lift(pad(toy, 0), 'end')
    expect(lit(toy)).toBe(true)
  })

  it('pulled by the boot at its first pad, a lead keeps hold with its other clip', () => {
    const toy = fresh()
    drag(toy, pad(toy, 1), pad(toy, 2))
    toy.press(bootAt(toy.circuit, 0, 0, toy.bends()[0]))
    expect(toy.circuit.leads[0]).toEqual({ a: 2, b: null })
    toy.lift({ x: 800, y: 740 }, 'end')
    expect(toy.circuit.leads).toHaveLength(1)
  })

  it('dropped on the coil, a lead winds itself up', () => {
    const toy = fresh()
    drag(toy, pad(toy, 1), pad(toy, 2))
    drag(toy, bootAt(toy.circuit, 0, 1, toy.bends()[0]), TOY.coil)
    expect(toy.circuit.leads).toEqual([])
    expect(voices(toy).at(-1)).toBe('lead-wind')
    expect(toy.sway).toEqual([])
  })

  it('a lead with one clip on, pulled by that clip, is whole in the hand and goes back to the coil or onto a pad', () => {
    const toy = fresh()
    drag(toy, pad(toy, 1), { x: 760, y: 720 })
    settle(toy)
    toy.press(bootAt(toy.circuit, 0, 0, toy.bends()[0]))
    expect(toy.circuit.leads).toEqual([])
    expect(toy.hand).toMatchObject({ lead: 'coil' })
    toy.move(pad(toy, 5)); toy.lift(pad(toy, 5), 'end')
    expect(toy.circuit.leads).toEqual([{ a: 5, b: null }])
  })
})

describe('the wrong uses, which all work', () => {
  it('a lead straight across the cell pops its flag, the lead glows, and a flick of the cell sets the flag back', () => {
    const toy = fresh()
    drag(toy, pad(toy, 1), pad(toy, 0))
    expect(voices(toy)).toContain('cell-across')
    expect(toy.marks.some((m) => m.type === 'pop')).toBe(true)
    expect(toy.circuit.parts[0]).toMatchObject({ popped: true })
    expect([...toy.hot.keys()]).toEqual([0])
    // The state stays: the lead is where the child put it.
    expect(toy.circuit.leads).toEqual([{ a: 1, b: 0 }])
    settle(toy, 2)
    expect(toy.hot.size).toBe(0)
    // Flicked while the short is still there, the flag pops again.
    toy.sounds = []
    tap(toy, mid(toy, 0))
    expect(voices(toy)).toEqual(['flag-reset', 'cell-across'])
    expect(toy.circuit.parts[0]).toMatchObject({ popped: true })
    // With the lead taken off, a flick sets it back for good.
    drag(toy, bootAt(toy.circuit, 0, 1, toy.bends()[0]), TOY.coil)
    tap(toy, mid(toy, 0))
    expect(toy.circuit.parts[0]).toMatchObject({ popped: false })
  })

  it('a lead across the lamp of a running loop is a short too', () => {
    const toy = fresh()
    loop(toy)
    toy.sounds = []
    drag(toy, pad(toy, 2), pad(toy, 3))
    expect(voices(toy)).toContain('cell-across')
    expect(lit(toy)).toBe(false)
  })

  it('both clips on one pad make a loop of nothing, with its own sound', () => {
    const toy = fresh()
    drag(toy, pad(toy, 4), { x: pad(toy, 4).x + 200, y: pad(toy, 4).y + 60 })
    settle(toy)
    drag(toy, looseEnd(toy.circuit, 0), pad(toy, 4))
    expect(toy.circuit.leads).toEqual([{ a: 4, b: 4 }])
    expect(voices(toy).at(-1)).toBe('lead-loop-of-nothing')
  })

  it('a second lead across the first plaits with a zip, and one that meets another at a post bites lower', () => {
    const toy = fresh()
    drag(toy, pad(toy, 1), pad(toy, 2))
    drag(toy, pad(toy, 1), pad(toy, 2))
    expect(voices(toy).at(-1)).toBe('lead-across')
    const longer = fresh()
    drag(longer, pad(longer, 1), pad(longer, 4))
    drag(longer, pad(longer, 2), pad(longer, 4))
    expect(voices(longer).at(-1)).toBe('lead-second')
    // The longer way round still lights the lamp.
    drag(longer, pad(longer, 3), pad(longer, 0))
    expect(lit(longer)).toBe(true)
  })
})

describe('random touching always does something', () => {
  it('every press anywhere is answered with a sound in that call', () => {
    const toy = fresh()
    loop(toy)
    let seed = 7
    const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647
    for (let i = 0; i < 400; i++) {
      const at = { x: 40 + random() * 1100, y: 190 + random() * 600 }
      toy.sounds = []
      toy.press(at)
      expect(toy.sounds.length, `press ${i} at ${Math.round(at.x)}, ${Math.round(at.y)}`).toBeGreaterThan(0)
      const to = { x: 40 + random() * 1100, y: 190 + random() * 600 }
      toy.move(to)
      toy.lift(to, random() < 0.3 ? 'tap' : 'end')
      toy.step(1 / 60)
      expect(toy.sway).toHaveLength(toy.circuit.leads.length)
      expect(toy.tips).toHaveLength(toy.circuit.leads.length)
    }
  })

  it('the cell hops and the lamp rings, each in its own voice; the bare mat pats', () => {
    const toy = fresh()
    tap(toy, mid(toy, 0)); tap(toy, mid(toy, 1)); tap(toy, { x: 900, y: 720 })
    expect(voices(toy)).toEqual(['cell-flick', 'lamp-flick', 'mat-pat'])
    expect(toy.circuit.leads).toEqual([])
  })

  it('a flicked lead twangs lower the longer it is, swings past its rest and settles', () => {
    const toy = fresh()
    drag(toy, pad(toy, 1), pad(toy, 2))
    drag(toy, pad(toy, 4), pad(toy, 5))
    settle(toy)
    toy.sounds = []
    const wire = (lead: number) => { const [p, q] = [pad(toy, toy.circuit.leads[lead].a), pad(toy, toy.circuit.leads[lead].b!)]; return { x: (p.x + q.x) / 2 - ((q.y - p.y) / Math.hypot(q.x - p.x, q.y - p.y)) * toy.bends()[lead] * 0.75, y: (p.y + q.y) / 2 + ((q.x - p.x) / Math.hypot(q.x - p.x, q.y - p.y)) * toy.bends()[lead] * 0.75 } }
    tap(toy, wire(0)); tap(toy, wire(1))
    expect(voices(toy)).toEqual(['lead-flick', 'lead-flick'])
    // The lead from the cell to the lamp is the longer of the two, and sounds lower.
    expect(toy.sounds[0].pitch).toBeLessThan(toy.sounds[1].pitch)
    let lowest = 0, highest = 0
    for (let i = 0; i < 240; i++) { toy.step(1 / 60); lowest = Math.min(lowest, toy.sway[0].x); highest = Math.max(highest, toy.sway[0].x) }
    expect(lowest).toBeLessThan(-5)
    expect(highest).toBeGreaterThan(1)
    expect(Math.abs(toy.sway[0].x)).toBeLessThan(0.5)
  })
})

describe('the hum', () => {
  it('is struck again twice a second while the loop runs, and never while it does not', () => {
    const toy = fresh()
    settle(toy, 2)
    expect(voices(toy)).toEqual([])
    loop(toy)
    toy.sounds = []
    settle(toy, 3)
    expect(voices(toy).filter((v) => v === 'hum').length).toBeGreaterThanOrEqual(5)
    toy.press(bootAt(toy.circuit, 0, 0, toy.bends()[0])); toy.lift({ x: 800, y: 740 }, 'end')
    toy.sounds = []
    settle(toy, 2)
    expect(voices(toy)).toEqual([])
  })
})

describe('found as left', () => {
  const through = (toy: Toy) => new Toy(deserializeStall(JSON.parse(JSON.stringify(serializeStall(toy.stall)))))

  it('a running loop comes back running, with nothing replayed', () => {
    const toy = fresh()
    loop(toy)
    expect(toy.dirty).toBe(true)
    const back = through(toy)
    expect(back.circuit).toEqual(toy.circuit)
    expect(lit(back)).toBe(true)
    expect(back.sounds).toEqual([])
    expect(back.marks).toEqual([])
  })

  it('put away with a lead in the hand, the lead is found with one clip on and the other loose: nothing is saved in the air', () => {
    const toy = fresh()
    toy.press(pad(toy, 1)); toy.move({ x: 700, y: 600 })
    const back = through(toy)
    expect(back.circuit.leads).toEqual([{ a: 1, b: null }])
    expect(back.hand).toBeNull()
    expect(back.endOf(0)).toEqual(looseEnd(back.circuit, 0))
  })

  it('a popped flag and a waiting tap come back as a popped flag and a loose lead', () => {
    const toy = fresh()
    drag(toy, pad(toy, 1), pad(toy, 0))
    tap(toy, pad(toy, 4))
    const back = through(toy)
    expect(back.circuit.parts[0]).toMatchObject({ popped: true })
    expect(back.circuit.leads).toEqual([{ a: 1, b: 0 }, { a: 4, b: null }])
    expect(back.armed).toBeNull()
  })
})

describe('what an idle child is shown', () => {
  it('first one lead from the cell to the lamp, as a drag', () => {
    const toy = fresh()
    const hint = suggest(toy)
    expect(hint.drag).toBe(true)
    expect(hint.from).toEqual(pad(toy, 0))
    expect([pad(toy, 2), pad(toy, 3)]).toContainEqual(hint.to)
    expect(hint.glow.length).toBeGreaterThanOrEqual(4)
  })

  it('then a loose clip to a pad nothing bites, a popped cell to tap, or a lead to flick: one move, never the whole loop', () => {
    const toy = fresh()
    drag(toy, pad(toy, 1), { x: 760, y: 720 })
    settle(toy)
    const loose = suggest(toy)
    expect(loose.from).toEqual(looseEnd(toy.circuit, 0))
    expect(loose.drag).toBe(true)
    const shorted = fresh()
    drag(shorted, pad(shorted, 1), pad(shorted, 0))
    expect(suggest(shorted)).toMatchObject({ drag: false, from: mid(shorted, 0) })
    const running = fresh()
    loop(running)
    expect(suggest(running).drag).toBe(false)
  })
})
