import { describe, expect, it } from 'vitest'
import { boardFor, clipLead, clipLeadEnd, partAcross, placePart, removeLead, removePart, trayPart, turnPart, type Circuit } from './circuit'
import { LADDER } from './config'
import { asBuilt, hasSwitch } from './gadgets'
import { handBack } from './handback'
import { draw, kindsMetBy, layOut, meetsTicket, oneActMends, type Break, type BreakKind } from './jobs'
import { CUSTOMERS } from './tastes'

// One plain mend for each kind of break, made only with what a finger can do
// and what the tray holds. It proves every job can be mended; it is not the
// only mend, and the game never looks for it.
function mend(circuit: Circuit, broke: Break): Circuit {
  const board = boardFor(circuit)
  const renew = (a: number, b: number) => {
    const at = partAcross(circuit, a, b), old = circuit.parts[at]
    if (old.kind === 'odd' || old.kind === 'switch') throw new Error('nothing to renew here')
    const fresh = trayPart(old.kind, old.a, old.b)
    return placePart(removePart(circuit, at), fresh)
  }
  switch (broke.kind) {
    case 'gap':
    case 'branch':
      if (broke.how === 'crack') return clipLead(circuit, board.traces[broke.trace].a, board.traces[broke.trace].b)
      if (broke.how === 'loose') return clipLeadEnd(circuit, circuit.leads.findIndex((l) => l.b === null), board.linkSocket[1])
      return renew(broke.a, broke.b)
    case 'flat':
    case 'dead':
      return renew(broke.a, broke.b)
    case 'stuff':
      return clipLead(removePart(circuit, partAcross(circuit, board.linkSocket[0], board.linkSocket[1])), board.linkSocket[0], board.linkSocket[1])
    case 'backwards':
      return turnPart(circuit, partAcross(circuit, broke.a, broke.b))
    case 'short':
      return removePart(circuit, partAcross(circuit, broke.a, broke.b))
  }
}

const SEEDS = Array.from({ length: 120 }, (_, i) => (i * 2654435761) >>> 0)
const laid = LADDER.flatMap((position) => SEEDS.map((seed) => ({ position, seed, ...layOut(position, seed) })))

describe('the seeded stream', () => {
  it('gives the same numbers from the same state, and reads no clock', () => {
    expect(draw(12345)).toEqual(draw(12345))
    const [value, next] = draw(12345)
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThan(1)
    expect(next).not.toBe(12345)
  })

  it('lays out the same job from the same position and state', () => {
    for (const position of LADDER) expect(layOut(position, 99)).toEqual(layOut(position, 99))
  })
})

describe('the designed order', () => {
  it('has ten positions whose ids name an idea of the game, never a year of school', () => {
    expect(LADDER).toEqual(['gap', 'switch', 'flat', 'dead', 'stuff', 'backwards', 'short', 'branch', 'double', 'ticket'])
    for (const id of LADDER) expect(id).not.toMatch(/grade|groep|level|fase|year|class|\d/)
  })

  it('adds at most one kind of break at a step', () => {
    let before: BreakKind[] = []
    for (const position of LADDER) {
      const now = kindsMetBy(position)
      expect(now.slice(0, before.length)).toEqual(before)
      expect(now.length - before.length).toBeLessThanOrEqual(1)
      before = now
    }
    expect(before).toEqual(['gap', 'flat', 'dead', 'stuff', 'backwards', 'short', 'branch'])
  })

  it('every job arrives broken: it does not run for its owner as it is', () => {
    for (const { position, seed, job, breaks } of laid) {
      expect(breaks.length, `${position} ${seed}`).toBeGreaterThanOrEqual(1)
      expect(handBack(job.circuit).ran, `${position} ${seed}`).toBe(false)
      expect(job).toMatchObject({ open: false, missed: false })
    }
  })

  it('every job can be mended with a finger and the tray', () => {
    for (const { position, seed, job, breaks } of laid) {
      const mended = breaks.reduce(mend, job.circuit)
      expect(handBack(mended).ran, `${position} ${seed} ${JSON.stringify(breaks)}`).toBe(true)
    }
  })

  it('a job holds only kinds of break its position has met', () => {
    for (const { position, job, breaks } of laid) {
      const met = kindsMetBy(position)
      for (const broke of breaks) expect(met, `${position}: ${broke.kind}`).toContain(broke.kind)
      // A plain gadget only at the first position; from the second on, a switch that arrives up.
      expect(hasSwitch(job.circuit.gadget)).toBe(position !== 'gap')
      for (const part of job.circuit.parts) if (part.kind === 'switch') expect(part.down).toBe(false)
    }
  })

  it('lays out its own kind most often and earlier kinds beside it, from the third position on', () => {
    for (const position of ['flat', 'dead', 'stuff', 'backwards', 'short', 'branch']) {
      const jobs = laid.filter((j) => j.position === position)
      const own = jobs.filter((j) => j.breaks[0].kind === position).length / jobs.length
      expect(own, position).toBeGreaterThan(0.5)
      expect(own, position).toBeLessThan(0.85)
    }
  })

  it('the first two positions hold one break in plain sight, and the last two hold more', () => {
    for (const j of laid.filter((x) => x.position === 'gap' || x.position === 'switch')) expect(j.breaks.map((b) => b.kind)).toEqual(['gap'])
    for (const j of laid.filter((x) => x.job.idea === 'double' || x.job.idea === 'ticket')) {
      expect(j.breaks).toHaveLength(2)
      expect(j.breaks[0].kind).not.toBe(j.breaks[1].kind)
    }
    for (const j of laid.filter((x) => x.job.idea !== 'double' && x.job.idea !== 'ticket')) expect(j.breaks).toHaveLength(1)
    // One job in three at the last two positions is laid out for an earlier idea, and holds a single break.
    for (const position of ['double', 'ticket']) {
      const jobs = laid.filter((x) => x.position === position)
      const own = jobs.filter((x) => x.job.idea === position).length / jobs.length
      expect(own, position).toBeGreaterThan(0.5)
      expect(own, position).toBeLessThan(0.85)
    }
    for (const j of laid) expect(j.job.ticket === null, `${j.position} ${j.job.idea}`).toBe(j.job.idea !== 'ticket')
  })

  it('cannot be got through by trying: no single lead and no single swap makes a job laid out for `double` or `ticket` run', () => {
    for (const j of laid.filter((x) => x.job.idea === 'double' || x.job.idea === 'ticket')) expect(oneActMends(j.job.circuit), `${j.position} ${j.seed}`).toBe(false)
    // The check itself sees a mend when there is one: every first-position job is mended by one lead or by none at all.
    for (const j of laid.filter((x) => x.position === 'gap' && x.breaks[0].kind === 'gap' && x.breaks[0].how === 'crack')) expect(oneActMends(j.job.circuit)).toBe(true)
  })

  it('a break that cannot be seen is not closed by a lead: a flat cell or a dead part needs the part itself', () => {
    for (const j of laid.filter((x) => x.breaks.length === 1 && (x.breaks[0].kind === 'flat' || x.breaks[0].kind === 'dead'))) {
      const pads = boardFor(j.job.circuit).pads.length
      for (let a = 0; a < pads; a++) for (let b = a + 1; b < pads; b++) expect(handBack(clipLead(j.job.circuit, a, b)).ran).toBe(false)
      expect(oneActMends(j.job.circuit)).toBe(true)
    }
  }, 30_000)

  it('varies who comes and what they bring, and never seats the same customer twice at once', () => {
    for (const position of LADDER) {
      const jobs = laid.filter((j) => j.position === position)
      expect(new Set(jobs.map((j) => j.job.who)).size, position).toBe(CUSTOMERS.length)
      expect(new Set(jobs.map((j) => j.job.circuit.gadget)).size, position).toBeGreaterThanOrEqual(2)
    }
    for (const seed of SEEDS.slice(0, 40)) for (const who of CUSTOMERS) expect(layOut('double', seed, who).job.who).not.toBe(who)
  })

  it('a job keeps its own idea: the position its breaks were drawn for', () => {
    const bringsIn: Record<string, string> = { gap: 'gap', flat: 'flat', dead: 'dead', stuff: 'stuff', backwards: 'backwards', short: 'short', branch: 'branch' }
    for (const { position, job, breaks } of laid) {
      // Always the position's own at `gap` and `switch`. From `flat` on: the position's id for its own idea (its own kind
      // of break, or two breaks at `double` and `ticket`), and for an earlier idea the id of the position that brought it in.
      const combining = position === 'double' || position === 'ticket'
      const earlier = combining ? breaks.length === 1 : !['gap', 'switch'].includes(position) && breaks[0].kind !== position
      const expected = earlier ? bringsIn[breaks[0].kind] : position
      expect(job.idea, `${position} ${breaks[0].kind}`).toBe(expected)
      expect(LADDER).toContain(job.idea)
    }
    // So about one job in three at such a position carries an earlier idea.
    const dead = laid.filter((j) => j.position === 'dead')
    expect(dead.some((j) => j.job.idea !== 'dead')).toBe(true)
  })

  it('an unknown position lays out the first', () => {
    expect(layOut('nowhere', 5).job.idea).toBe('gap')
  })
})

describe('the order ticket', () => {
  it('counts a part that hangs in the loop by its leads as it counts one seated on the board', () => {
    const lantern = removeLead(asBuilt('lamp'), 0), board = boardFor(lantern), [linkA, linkB] = board.linkSocket
    // A second lamp in place of the link, lying loose and held by two leads: two lamps in a row, both carrying current.
    const hung: Circuit = { ...lantern, loose: [{ kind: 'lamp', blown: false, at: 12 }], leads: [{ a: linkA, b: { loose: 0, end: 0 } }, { a: linkB, b: { loose: 0, end: 1 } }] }
    expect(handBack(hung)).toMatchObject({ ran: true, lit: 2 })
    expect(meetsTicket(hung, { part: 'lamp', count: 2 })).toBe(true)
    expect(meetsTicket(lantern, { part: 'lamp', count: 2 })).toBe(false)
  })

  it('asks for two or three of a part, and is met by that many carrying current', () => {
    for (const { job } of laid.filter((x) => x.job.idea === 'ticket')) {
      expect([2, 3]).toContain(job.ticket!.count)
      expect(['lamp', 'cell', 'switch']).toContain(job.ticket!.part)
    }
    const { job, breaks } = layOut('gap', 7)
    const mended = breaks.reduce(mend, job.circuit)
    const board = boardFor(mended)
    const load = mended.parts.find((p) => p.kind === 'lamp' || p.kind === 'motor' || p.kind === 'buzzer')!
    expect(meetsTicket(mended, { part: 'cell', count: 1 })).toBe(true)
    expect(meetsTicket(mended, { part: 'cell', count: 2 })).toBe(false)
    const twoLamps = placePart(mended, trayPart('lamp', board.rungs[0][0], board.rungs[0][1]))
    expect(meetsTicket(twoLamps, { part: 'lamp', count: load.kind === 'lamp' ? 2 : 1 })).toBe(true)
    expect(meetsTicket(job.circuit, { part: 'cell', count: 1 })).toBe(false)
  })
})
