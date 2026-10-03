import { describe, expect, it } from 'vitest'
import { boardOf, GADGET_KINDS, isSocket } from './board'
import { benchOdd, clipLead, clipProbe, crackTrace, flickPart, placePart, removeLead, removePart, trayPart, turnPart, type Circuit } from './circuit'
import { asBuilt } from './gadgets'
import { settle } from './settle'
import { braking, level, read, RUNS_FROM } from './solve'

// The grid in the design sheet says what each object does under each action.
// These tests hold the model to it: every line here is a cell of that grid,
// or a row of the table of errors as consequences.

const board = boardOf('lamp-plain')
const [base, cap] = board.cellSockets[0]
const mainRung = board.rungs[2]
const spare = board.rungs[0]
const [linkA, linkB] = board.linkSocket
const indexOf = (circuit: Circuit, kind: string) => circuit.parts.findIndex((p) => p.kind === kind)
const currentIn = (circuit: Circuit, kind: string) => read(circuit).parts[indexOf(circuit, kind)]

describe('the boards', () => {
  it('every socket a board names is a pair of pads one unit apart', () => {
    for (const kind of GADGET_KINDS) {
      const b = boardOf(kind)
      for (const [x, y] of [...b.cellSockets, b.switchSocket, b.linkSocket, ...b.rungs]) expect(isSocket(b, x, y)).toBe(true)
      for (const trace of b.traces) expect(trace.a).not.toBe(trace.b)
    }
  })

  it('the sign is the largest board by far', () => {
    const sign = boardOf('sign'), gadget = boardOf('robot')
    expect(sign.cols * sign.rows).toBeGreaterThan(2 * gadget.cols * gadget.rows)
    expect(sign.rungs.length).toBeGreaterThan(2 * gadget.rungs.length)
  })

  it('every gadget runs as built', () => {
    for (const kind of GADGET_KINDS) {
      const settled = settle(asBuilt(kind))
      expect(settled.consequences).toEqual([])
      settled.circuit.parts.forEach((part, i) => {
        if (part.kind === 'lamp' || part.kind === 'motor' || part.kind === 'buzzer') expect(level(settled.reading.parts[i])).toBe(2)
        if (part.kind === 'motor') expect(settled.reading.parts[i]).toBeGreaterThan(0)
      })
    }
  })
})

describe('a closed loop', () => {
  it('carries one current all the way round: none is used up in the lamp', () => {
    const reading = read(asBuilt('lamp-plain'))
    const lamp = currentIn(asBuilt('lamp-plain'), 'lamp'), cell = currentIn(asBuilt('lamp-plain'), 'cell')
    expect(cell).toBeCloseTo(lamp, 6)
    // The traces on the way round carry it too; the stubs to the empty rungs carry nothing.
    const sizes = reading.traces.map((c) => Math.abs(c))
    for (const size of sizes) expect(size < 1e-6 || Math.abs(size - lamp) < 1e-6).toBe(true)
    expect(sizes.filter((size) => size > 1e-6).length).toBeGreaterThan(6)
  })

  it('stops everywhere at once when one lead comes off', () => {
    const open = removeLead(asBuilt('lamp-plain'), 0)
    const reading = read(open)
    for (const c of [...reading.parts, ...reading.traces, ...reading.leads]) expect(Math.abs(c)).toBeLessThan(1e-6)
  })

  it('stops at a cracked trace, and a lead across the crack closes it', () => {
    const cracked = crackTrace(asBuilt('fan-plain'), 3)
    expect(level(currentIn(cracked, 'motor'))).toBe(0)
    const trace = board.traces[3]
    expect(level(currentIn(clipLead(cracked, trace.a, trace.b), 'motor'))).toBe(2)
  })
})

describe('the cell', () => {
  it('turned round, drives the beads the other way: a motor backs up and a lamp does not care', () => {
    const fan = asBuilt('fan-plain')
    expect(currentIn(turnPart(fan, indexOf(fan, 'cell')), 'motor')).toBeCloseTo(-currentIn(fan, 'motor'), 9)
    const lamp = asBuilt('lamp-plain')
    expect(level(currentIn(turnPart(lamp, indexOf(lamp, 'cell')), 'lamp'))).toBe(level(currentIn(lamp, 'lamp')))
  })

  const withSecondCell = (turned: boolean) => {
    const open = removeLead(asBuilt('lamp-plain'), 0)
    // In the row, in place of the link: its cap toward the first cell's base, or nose to nose.
    return placePart(open, turned ? trayPart('cell', linkB, linkA) : trayPart('cell', linkA, linkB))
  }

  it('a second one nose to tail makes the lamp too bright, and it holds', () => {
    const settled = settle(withSecondCell(false))
    expect(level(settled.reading.parts[indexOf(settled.circuit, 'lamp')])).toBe(3)
    expect(settled.consequences).toEqual([])
  })

  it('a second one nose to nose stops everything', () => {
    expect(level(currentIn(withSecondCell(true), 'lamp'))).toBe(0)
  })

  it('a second one side by side changes nothing to see', () => {
    const one = asBuilt('lamp-plain')
    const two = clipLead(clipLead(placePart(one, trayPart('cell', spare[1], spare[0])), spare[0], cap), spare[1], base)
    expect(placePart(one, trayPart('cell', spare[1], spare[0]))).not.toBe(one)
    expect(level(currentIn(two, 'lamp'))).toBe(2)
    expect(currentIn(two, 'lamp') / currentIn(one, 'lamp')).toBeGreaterThan(0.99)
    expect(currentIn(two, 'lamp') / currentIn(one, 'lamp')).toBeLessThan(1.05)
    // Each cell sends out half the beads at half the speed, and the two streams join into the one the lamp had.
    const reading = read(two)
    const cells = two.parts.flatMap((p, i) => (p.kind === 'cell' ? [reading.parts[i]] : []))
    expect(cells).toHaveLength(2)
    for (const cell of cells) expect(cell / currentIn(two, 'lamp')).toBeCloseTo(0.5, 1)
    expect(cells[0] + cells[1]).toBeCloseTo(currentIn(two, 'lamp'), 6)
  })

  it('a third in the row blows the lamp, which is then a gap', () => {
    // The switched lamp has room for three in a row: its own cell, one in place of the link, one in place of the switch.
    const switched = asBuilt('lamp')
    const sw = boardOf('lamp').switchSocket
    const noSwitch = removePart(removeLead(switched, 0), indexOf(switched, 'switch'))
    const three = placePart(placePart(noSwitch, trayPart('cell', linkA, linkB)), trayPart('cell', sw[0], sw[1]))
    const settled = settle(three)
    const lamp = indexOf(settled.circuit, 'lamp')
    expect(settled.consequences).toEqual([{ type: 'blow', part: lamp }])
    expect(settled.circuit.parts[lamp]).toMatchObject({ blown: true })
    expect(level(settled.reading.parts[lamp])).toBe(0)
  })

  it('a lead straight across it pops its flag and marks the way the current took', () => {
    const settled = settle(clipLead(asBuilt('lamp-plain'), base, cap))
    expect(settled.consequences).toHaveLength(1)
    const pop = settled.consequences[0]
    expect(pop.type).toBe('pop')
    if (pop.type !== 'pop') return
    expect(pop.hot.leads).toEqual([1])
    expect(pop.hot.parts).toEqual([pop.part])
    expect(pop.hot.traces).toEqual([])
    // With the flag up nothing runs, and it pops again for as long as the short is there.
    expect(level(settled.reading.parts[indexOf(settled.circuit, 'lamp')])).toBe(0)
  })

  it('its flag stays up until it is flicked, and pops again while the short is still there', () => {
    const shorted = settle(clipLead(asBuilt('lamp-plain'), base, cap)).circuit
    const cell = indexOf(shorted, 'cell')
    expect(settle(shorted).consequences).toEqual([])
    expect(shorted.parts[cell]).toMatchObject({ popped: true })
    expect(settle(flickPart(shorted, cell)).consequences.map((c) => c.type)).toEqual(['pop'])
    // With the lead taken off, a flick sets it back and the lamp is lit: nothing was lost.
    const cleared = settle(flickPart(removeLead(shorted, 1), cell))
    expect(cleared.consequences).toEqual([])
    expect(level(cleared.reading.parts[indexOf(cleared.circuit, 'lamp')])).toBe(2)
  })

  it('a flat one pushes nothing', () => {
    const lamp = asBuilt('lamp-plain')
    const flat: Circuit = { ...lamp, parts: lamp.parts.map((p) => (p.kind === 'cell' ? { ...p, flat: true } : p)) }
    expect(level(currentIn(flat, 'lamp'))).toBe(0)
  })
})

describe('lamps, motors and buzzers', () => {
  const second = (kind: 'lamp' | 'motor' | 'buzzer', inRow: boolean) => {
    const whole = asBuilt(`${kind === 'lamp' ? 'lamp' : kind === 'motor' ? 'fan' : 'bell'}-plain`)
    return inRow ? placePart(removeLead(whole, 0), trayPart(kind, linkA, linkB)) : placePart(whole, trayPart(kind, spare[0], spare[1]))
  }

  it('two in a row both run a little, two side by side both run as meant', () => {
    for (const kind of ['lamp', 'motor', 'buzzer'] as const) {
      const row = second(kind, true), side = second(kind, false)
      const levels = (circuit: Circuit) => circuit.parts.flatMap((p, i) => (p.kind === kind ? [level(read(circuit).parts[i])] : []))
      expect(levels(row)).toEqual([1, 1])
      expect(levels(side)).toEqual([2, 2])
    }
  })

  it('side by side, the cell gives nearly twice as much', () => {
    const one = currentIn(asBuilt('lamp-plain'), 'cell'), two = currentIn(second('lamp', false), 'cell')
    expect(two / one).toBeGreaterThan(1.8)
    expect(two / one).toBeLessThan(2)
  })

  it('a lead straight across one of two in a row puts it out and the other runs harder', () => {
    const row = second('lamp', true)
    const bridged = clipLead(row, linkA, linkB)
    const lamps = bridged.parts.flatMap((p, i) => (p.kind === 'lamp' ? [read(bridged).parts[i]] : []))
    expect(lamps.map(level).sort()).toEqual([0, 2])
  })

  it('a lead straight across the only one is a short', () => {
    const settled = settle(clipLead(asBuilt('lamp-plain'), mainRung[0], mainRung[1]))
    expect(settled.consequences.map((c) => c.type)).toEqual(['pop'])
  })

  it('a lead straight across a motor in a row with a lamp stops it, and the lamp runs harder', () => {
    const fan = asBuilt('fan-plain')
    const row = placePart(removeLead(fan, 0), trayPart('lamp', linkA, linkB))
    const before = read(row), bridged = clipLead(row, mainRung[0], mainRung[1]), after = read(bridged)
    expect(level(after.parts[indexOf(bridged, 'motor')])).toBe(0)
    expect(after.parts[indexOf(bridged, 'lamp')]).toBeGreaterThan(before.parts[indexOf(row, 'lamp')] * 1.8)
  })

  it('a blade spun by hand freewheels with its legs free, is held back a little by a lamp, and stops short with a lead across its legs', () => {
    const car = asBuilt('car')
    const noCell = removePart(car, indexOf(car, 'cell'))
    const noLamp = removePart(noCell, indexOf(noCell, 'lamp'))
    const motorOf = (c: Circuit) => indexOf(c, 'motor')
    const free = braking(noLamp, motorOf(noLamp), 0.6)
    const lit = braking(noCell, motorOf(noCell), 0.6)
    const { a, b } = noLamp.parts[motorOf(noLamp)]
    const shorted = braking(clipLead(noLamp, a, b), motorOf(noLamp), 0.6)
    expect(free).toBeLessThan(1e-6)
    expect(lit).toBeGreaterThan(0.2)
    expect(shorted).toBeGreaterThan(lit * 1.8)
  })

  it('a lamp glows the same either way round, and a motor turns the other way', () => {
    const lamp = asBuilt('lamp-plain'), fan = asBuilt('fan-plain')
    expect(Math.abs(currentIn(turnPart(lamp, indexOf(lamp, 'lamp')), 'lamp'))).toBeCloseTo(currentIn(lamp, 'lamp'), 9)
    expect(currentIn(turnPart(fan, indexOf(fan, 'motor')), 'motor')).toBeCloseTo(-currentIn(fan, 'motor'), 9)
  })

  it('a blade spun by hand lights a lamp a little, with no cell in the loop', () => {
    const car = asBuilt('car')
    const noCell = removePart(car, indexOf(car, 'cell'))
    const motor = indexOf(noCell, 'motor'), lamp = indexOf(noCell, 'lamp')
    expect(level(read(noCell).parts[lamp])).toBe(0)
    expect(level(read(noCell, { [motor]: 0.6 }).parts[lamp])).toBe(1)
  })
})

describe('bench odds', () => {
  const inGap = (what: Parameters<typeof benchOdd>[0]) => placePart(removeLead(asBuilt('lamp-plain'), 0), benchOdd(what, linkA, linkB))

  it('metal lets everything through, a pencil a little, and rubber, wood and string nothing', () => {
    for (const what of ['spoon', 'key', 'foil'] as const) expect(level(currentIn(inGap(what), 'lamp'))).toBe(2)
    expect(level(currentIn(inGap('pencil'), 'lamp'))).toBe(1)
    for (const what of ['rubber', 'stick', 'string'] as const) expect(level(currentIn(inGap(what), 'lamp'))).toBe(0)
  })

  it('a lead straight across a rubber makes it stop mattering', () => {
    expect(level(currentIn(clipLead(inGap('rubber'), linkA, linkB), 'lamp'))).toBe(2)
  })

  it('foil across a spare rung is a way round that misses the lamp', () => {
    const settled = settle(placePart(asBuilt('lamp-plain'), benchOdd('foil', spare[0], spare[1])))
    expect(settled.consequences.map((c) => c.type)).toEqual(['pop'])
  })
})

describe('the test lamp', () => {
  const probe = (circuit: Circuit, a: number, b: number) => read(clipProbe(clipProbe(circuit, 0, a), 1, b)).probe
  const crackAt = 3, crack = board.traces[crackAt]
  const cracked = crackTrace(asBuilt('lamp-plain'), crackAt)

  it('glows dully across the break, where it closes the loop through the lamp it shares it with', () => {
    expect(level(probe(cracked, crack.a, crack.b))).toBe(1)
  })

  it('stays dark across a sound trace, lead or part of a dead loop', () => {
    const sound = board.traces.findIndex((_, i) => i !== crackAt)
    expect(Math.abs(probe(cracked, board.traces[sound].a, board.traces[sound].b))).toBeLessThan(RUNS_FROM)
    expect(Math.abs(probe(cracked, linkA, linkB))).toBeLessThan(RUNS_FROM)
    expect(Math.abs(probe(cracked, mainRung[0], mainRung[1]))).toBeLessThan(RUNS_FROM)
  })

  it('across a cell glows if the cell is good, whether the loop is dead or not, and stays dark if it is flat', () => {
    expect(level(probe(cracked, base, cap))).toBe(2)
    expect(level(probe(asBuilt('lamp-plain'), base, cap))).toBe(2)
    const flat: Circuit = { ...cracked, parts: cracked.parts.map((p) => (p.kind === 'cell' ? { ...p, flat: true } : p)) }
    expect(level(probe(flat, base, cap))).toBe(0)
  })

  it('across a rubber in the gap glows: the rubber is the break', () => {
    const stuffed = placePart(removeLead(asBuilt('lamp-plain'), 0), benchOdd('rubber', linkA, linkB))
    expect(level(probe(stuffed, linkA, linkB))).toBe(1)
  })

  it('with two breaks in one loop, neither comes alive until the other is closed', () => {
    const twice = removeLead(cracked, 0)
    expect(Math.abs(probe(twice, crack.a, crack.b))).toBeLessThan(RUNS_FROM)
    expect(Math.abs(probe(twice, linkA, linkB))).toBeLessThan(RUNS_FROM)
    expect(level(probe(clipLead(twice, linkA, linkB), crack.a, crack.b))).toBe(1)
    expect(level(probe(clipLead(twice, crack.a, crack.b), linkA, linkB))).toBe(1)
  })
})
