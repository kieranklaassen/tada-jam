import { describe, expect, it } from 'vitest'
import { boardOf } from './board'
import { canBite, clipLead, clipLeadEnd, clipProbe, layDown, layLead, moveLoose, removeLead, removePart, seat, startLead, unclipLead, type Bite, type Circuit } from './circuit'
import { asBuilt } from './gadgets'
import { handBack, lidOf } from './handback'
import { readCircuit } from './save'
import { settle } from './settle'
import { level, read } from './solve'
import { biteAt, leadEnds, looseEnd, matAt, padAt } from './stage'

// What a clip can bite besides a pad: an end of a part that lies loose on the
// mat, and the clip of another lead. The sheet has all three: two leads joined
// end to end, a buzzer held only by its leads, and a clip on a part's leg.

const board = boardOf('bell-plain')
const [linkA, linkB] = board.linkSocket
const mainRung = board.rungs[2]
const again = (circuit: Circuit) => readCircuit(JSON.parse(JSON.stringify(circuit)))
const indexOf = (circuit: Circuit, kind: string) => circuit.parts.findIndex((p) => p.kind === kind)
const clipOf = (lead: number, end: 0 | 1): Bite => ({ lead, end })
const endOf = (loose: number, end: 0 | 1): Bite => ({ loose, end })

/** The plain bell with its link taken off: a gap between the link's two pads, and no lead on it. */
const gapped = () => removeLead(asBuilt('bell-plain'), 0)

describe('two leads joined end to end', () => {
  // One lead from one side of the gap with its second clip loose; a second lead from that loose clip to the other side.
  const joined = () => {
    const first = startLead(gapped(), linkA).circuit
    return clipLead(first, clipOf(0, 1), linkB)
  }

  it('carry the loop\'s current through the join, with no post between them', () => {
    const circuit = joined()
    expect(circuit.leads).toEqual([{ a: linkA, b: null }, { a: { lead: 0, end: 1 }, b: linkB }])
    const reading = read(circuit)
    expect(level(reading.parts[indexOf(circuit, 'buzzer')])).toBe(2)
    expect(Math.abs(reading.leads[0])).toBeCloseTo(Math.abs(reading.leads[1]), 6)
    expect(Math.abs(reading.leads[0])).toBeCloseTo(Math.abs(reading.parts[indexOf(circuit, 'buzzer')]), 6)
    expect(handBack(circuit).ran).toBe(true)
  })

  it('lie with their two clips in one place', () => {
    const circuit = joined()
    expect(leadEnds(circuit, 1)[0]).toEqual(looseEnd(circuit, 0))
    expect(leadEnds(circuit, 0)[1]).toEqual(looseEnd(circuit, 0))
  })

  it('are found as left', () => {
    expect(again(joined())).toEqual(joined())
  })

  it('part when the first is taken off: the second lets go there, holds on with its other clip, and is turned end for end', () => {
    const parted = removeLead(joined(), 0)
    expect(parted.leads).toEqual([{ a: linkB, b: null }])
    expect(level(read(parted).parts[indexOf(parted, 'buzzer')])).toBe(0)
  })

  it('a lead that held on only by the join stays on the mat when the lead it bit is taken off: it lies at its own place', () => {
    const first = startLead(gapped(), linkA).circuit
    const hanging = startLead(first, clipOf(0, 1), 30).circuit
    // Neither of its clips is on a pad or a part, so it has a place of its own from the start.
    expect(hanging.leads[1]).toEqual({ a: { lead: 0, end: 1 }, b: null, at: 30 })
    expect(removeLead(hanging, 0).leads).toEqual([{ a: null, b: null, at: 30 }])
  })

  it('keep their numbers true when an earlier lead goes', () => {
    const three = clipLead(clipLead(startLead(gapped(), mainRung[0]).circuit, linkA, mainRung[1]), clipOf(0, 1), linkB)
    expect(three.leads[2]).toEqual({ a: { lead: 0, end: 1 }, b: linkB })
    const fewer = removeLead(three, 1)
    expect(fewer.leads).toEqual([{ a: mainRung[0], b: null }, { a: { lead: 0, end: 1 }, b: linkB }])
  })

  it('when the bitten lead\'s first clip is pulled, it is turned end for end and the join follows its clip', () => {
    // Lead 0 from a pad to a pad; lead 1 bites lead 0's second clip.
    const circuit = startLead(clipLead(gapped(), linkA, linkB), clipOf(0, 1), 12).circuit
    const pulled = unclipLead(circuit, 0, 0)
    expect(pulled.leads[0]).toEqual({ a: linkB, b: null })
    expect(pulled.leads[1]).toEqual({ a: { lead: 0, end: 0 }, b: null, at: 12 })
  })

  it('are never a chain: a clip cannot bite its own lead, nor a clip that itself bites a lead\'s clip', () => {
    const circuit = joined()
    expect(canBite(circuit, clipOf(1, 0), null)).toBe(false)
    expect(canBite(circuit, clipOf(0, 1), 0)).toBe(false)
    expect(canBite(circuit, clipOf(0, 1), null)).toBe(true)
    expect(canBite(circuit, clipOf(7, 0), null)).toBe(false)
    expect(startLead(circuit, clipOf(1, 0)).lead).toBe(-1)
    // Nor can the bitten clip go and bite a lead's clip in its turn.
    const third = startLead(circuit, mainRung[0])
    expect(clipLeadEnd(third.circuit, 0, clipOf(third.lead, 1))).toBe(third.circuit)
  })
})

describe('a lead that nothing holds', () => {
  it('lies on the mat at its own place, both clips loose, and joins nothing', () => {
    const laid = layLead(gapped(), 40)
    expect(laid.leads).toEqual([{ a: null, b: null, at: 40 }])
    expect(leadEnds(laid, 0)[0]).toEqual(matAt(40))
    expect(leadEnds(laid, 0)[1]).not.toEqual(matAt(40))
    expect(read(laid).leads).toEqual([0])
    expect(again(laid)).toEqual(laid)
  })

  it('has a place of its own exactly when no pad and no part holds it', () => {
    const onPad = startLead(gapped(), linkA, 7).circuit
    expect(onPad.leads[0]).toEqual({ a: linkA, b: null })
    const onLead = startLead(onPad, clipOf(0, 1), 7).circuit
    expect(onLead.leads[1].at).toBe(7)
    // Its second clip goes onto a pad: a pad holds it now, and it has no place of its own any more.
    expect(clipLeadEnd(onLead, 1, linkB).leads[1]).toEqual({ a: { lead: 0, end: 1 }, b: linkB })
    // Let go of the pad again, it has a place again.
    expect(clipLeadEnd(clipLeadEnd(onLead, 1, linkB), 1, null, 9).leads[1]).toEqual({ a: { lead: 0, end: 1 }, b: null, at: 9 })
  })

  it('can be clipped to by another lead, which then carries the loop through it or not as the rest lies', () => {
    // A lead laid loose; one lead from each side of the gap to each of its clips: three leads end to end across the gap.
    const laid = layLead(gapped(), 40)
    const joined = clipLead(clipLead(laid, linkA, clipOf(0, 0)), linkB, clipOf(0, 1))
    expect(level(read(joined).parts[indexOf(joined, 'buzzer')])).toBe(2)
    expect(again(joined)).toEqual(joined)
    // The laid lead still has its place: no pad and no part holds it.
    expect(joined.leads[0]).toEqual({ a: null, b: null, at: 40 })
  })

  it('lets go and stays where the part it bit lay, when that part goes back in the tray', () => {
    const whole = asBuilt('bell-plain')
    const laid = layDown(whole, indexOf(whole, 'buzzer'), 30)
    const held = startLead(laid, endOf(0, 0)).circuit
    expect(held.leads.at(-1)).toEqual({ a: { loose: 0, end: 0 }, b: null })
    expect(moveLoose(held, 0, null).leads.at(-1)).toEqual({ a: null, b: null, at: 30 })
  })

  it('a save that leaves out its place, or gives a place to a lead that a pad holds, is put right or refused', () => {
    const laid = layLead(gapped(), 40)
    expect(readCircuit({ ...laid, leads: [{ a: null, b: null }] })).toBeNull()
    expect(readCircuit({ ...laid, leads: [{ a: null, b: linkA, at: 3 }] })).toBeNull()
    expect(readCircuit({ ...laid, leads: [{ a: null, b: null, at: 9999 }] })).toBeNull()
    // A place on a lead that a pad holds is dropped: it is where its clip is.
    expect(readCircuit({ ...laid, leads: [{ a: linkA, b: null, at: 3 }] })!.leads).toEqual([{ a: linkA, b: null }])
  })
})

describe('a part held only by its leads', () => {
  // The bell's own buzzer is taken off its rung and laid on the mat, then joined to its two pads again by two leads.
  const hung = () => {
    const whole = asBuilt('bell-plain'), buzzer = indexOf(whole, 'buzzer')
    const { a, b } = whole.parts[buzzer]
    const laid = layDown(whole, buzzer, 30)
    return { a, b, circuit: clipLead(clipLead(laid, a, endOf(0, 0)), endOf(0, 1), b) }
  }

  it('lies loose and joined to nothing until a clip bites each end; then it rasps like any other', () => {
    const whole = asBuilt('bell-plain')
    const laid = layDown(whole, indexOf(whole, 'buzzer'), 30)
    expect(read(laid).loose).toEqual([0])
    const { circuit } = hung()
    expect(level(read(circuit).loose[0])).toBe(2)
    expect(read(circuit).loose[0]).toBeGreaterThan(0)
  })

  it('goes home hanging out of the case: the gadget runs, and the lid needs the band', () => {
    const { circuit } = hung()
    expect(handBack(circuit)).toMatchObject({ ran: true, sound: 2, buzzing: 1, lid: 'banded' })
    expect(lidOf(asBuilt('bell-plain'))).toBe('flat')
  })

  it('is found as left, clips and all', () => {
    const { circuit } = hung()
    expect(again(circuit)).toEqual(circuit)
  })

  it('seated again, keeps its clips: they now bite the pads its ends stand on', () => {
    const { a, b, circuit } = hung()
    const seated = seat(circuit, 0, a, b)
    expect(seated.loose).toEqual([])
    expect(seated.leads.slice(-2)).toEqual([{ a, b: a }, { a: b, b }])
    expect(level(read(seated).parts[indexOf(seated, 'buzzer')])).toBe(2)
  })

  it('put back in the tray, lets its clips go: each lead holds on with its other clip', () => {
    const { a, b, circuit } = hung()
    const gone = moveLoose(circuit, 0, null)
    expect(gone.loose).toEqual([])
    expect(gone.leads.slice(-2)).toEqual([{ a, b: null }, { a: b, b: null }])
  })

  it('gives way like any other: a lead across both ends of a loose cell pops its flag, there on the mat', () => {
    const whole = asBuilt('bell-plain')
    const laid = layDown(whole, indexOf(whole, 'cell'), 12)
    const shorted = settle(clipLead(laid, endOf(0, 0), endOf(0, 1)))
    expect(shorted.consequences).toHaveLength(1)
    expect(shorted.consequences[0]).toMatchObject({ type: 'pop', part: 0, onMat: true })
    expect(shorted.circuit.loose[0]).toMatchObject({ kind: 'cell', popped: true })
  })

  it('can be tried with the test lamp: a clip of it on each end of a loose cell lights it', () => {
    const whole = asBuilt('bell-plain')
    const laid = layDown(whole, indexOf(whole, 'cell'), 12)
    const probed = clipProbe(clipProbe(laid, 0, endOf(0, 0)), 1, endOf(0, 1))
    expect(level(read(probed).probe)).toBe(2)
    expect(again(probed)).toEqual(probed)
  })
})

describe('where a clip is', () => {
  it('on its pad, at one end of the loose part it bites, each end a little apart', () => {
    const whole = asBuilt('bell-plain')
    const laid = layDown(whole, indexOf(whole, 'buzzer'), 30)
    expect(biteAt(laid, linkA)).toEqual(padAt(laid, linkA))
    const left = biteAt(laid, endOf(0, 0)), right = biteAt(laid, endOf(0, 1)), middle = matAt(30)
    expect(left.x).toBeLessThan(middle.x)
    expect(right.x).toBeGreaterThan(middle.x)
    expect(left.y).toBe(middle.y)
  })

  it('every place on the mat is on the mat, clear of the counter', () => {
    for (let cell = 0; cell < 96; cell++) {
      const at = matAt(cell)
      expect(at.x).toBeGreaterThan(50)
      expect(at.x).toBeLessThan(1130)
      expect(at.y).toBeGreaterThan(200)
      expect(at.y).toBeLessThan(800)
    }
  })
})

describe('a save with clips that bite what is not there', () => {
  const sound = clipLead(startLead(gapped(), linkA).circuit, clipOf(0, 1), linkB)

  it('is refused whole', () => {
    const bad: unknown[] = [
      { ...sound, leads: [{ a: linkA, b: null }, { a: { lead: 5, end: 1 }, b: linkB }] },
      { ...sound, leads: [{ a: linkA, b: null }, { a: { lead: 1, end: 1 }, b: linkB }] },
      { ...sound, leads: [{ a: linkA, b: null }, { a: { lead: 0, end: 2 }, b: linkB }] },
      { ...sound, leads: [{ a: { lead: 1, end: 0 }, b: null }, { a: { lead: 0, end: 0 }, b: linkB }] },
      { ...sound, leads: [{ a: { loose: 0, end: 0 }, b: null }] },
      { ...sound, leads: [{ a: null, b: linkB, at: 4 }] },
      { ...sound, probe: [{ lead: 9, end: 0 }, null] },
    ]
    for (const raw of bad) expect(readCircuit(raw), JSON.stringify(raw).slice(0, 120)).toBeNull()
    expect(readCircuit(sound)).toEqual(sound)
  })

  it('a part taken off the board with its neighbours still there leaves every other bite as it was', () => {
    const whole = asBuilt('bell-plain')
    const less = removePart(sound, indexOf(whole, 'cell'))
    expect(less.leads).toEqual(sound.leads)
  })
})
