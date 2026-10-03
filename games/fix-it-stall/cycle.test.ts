import { describe, expect, it } from 'vitest'
import { boardFor, clipLead, clipLeadEnd, removeLead, type Circuit } from './circuit'
import { boardOnMat, callNext, change, handOver, openGadget, swapBoards } from './cycle'
import { deserializeStall, freshStall, serializeStall, type Stall } from './save'

// The first customer of a fresh stall brings one break in plain sight. This mends it, whichever it is.
function mendFirst(circuit: Circuit): Circuit {
  const board = boardFor(circuit)
  if (circuit.cracks.length > 0) return clipLead(circuit, board.traces[circuit.cracks[0]].a, board.traces[circuit.cracks[0]].b)
  return clipLeadEnd(circuit, circuit.leads.findIndex((l) => l.b === null), board.linkSocket[1])
}
const mended = (stall: Stall) => change(openGadget(stall), mendFirst).stall

describe('one cycle', () => {
  it('nothing on the gadget changes until it is opened', () => {
    const stall = freshStall(null)
    expect(change(stall, mendFirst).stall).toBe(stall)
    expect(handOver(stall)).toBeNull()
    expect(openGadget(stall).job.open).toBe(true)
  })

  it('handed back running the first time, it went well: the position moves up and the cycle is finished', () => {
    const over = handOver(mended(freshStall(null)))!
    expect(over.outcome).toBe('well')
    expect(over.handed.ran).toBe(true)
    expect(over.stall).toMatchObject({ position: 'switch', finished: true })
    expect(over.stall.job.open).toBe(false)
  })

  it('handed back not running, it is laid back on the mat as it was, and the cycle goes on', () => {
    const opened = openGadget(freshStall(null))
    const over = handOver(opened)!
    expect(over.outcome).toBeNull()
    expect(over.reaction.mood).toBe('shrug')
    expect(over.stall).toMatchObject({ position: 'gap', finished: false })
    expect(over.stall.job).toEqual({ ...opened.job, missed: true })
  })

  it('handed back running on a later try, it was mixed: the position stays', () => {
    const missed = handOver(openGadget(freshStall(null)))!.stall
    const over = handOver(change(missed, mendFirst).stall)!
    expect(over.outcome).toBe('mixed')
    expect(over.stall).toMatchObject({ position: 'gap', finished: true })
  })

  it('sent away not running, it went badly: the position moves down, and never below the first', () => {
    const start: Stall = { ...freshStall(null), position: 'flat' }
    const away = callNext(start)
    expect(away.sentAway).toBe(true)
    expect(away.stall).toMatchObject({ position: 'switch', finished: false })
    expect(callNext(freshStall(null)).stall.position).toBe('gap')
  })

  it('a finished gadget is its owner\'s: it is not changed again and not handed back twice', () => {
    const done = handOver(mended(freshStall(null)))!.stall
    expect(change(done, (c) => removeLead(c, 0)).stall).toBe(done)
    expect(handOver(done)).toBeNull()
    expect(openGadget(done)).toBe(done)
  })

  it('a finished scene stays: nothing new starts until the child touches the customer who waits', () => {
    const done = handOver(mended(freshStall(null)))!.stall
    // Saved at once and loaded again, it is the same finished scene, with the same customer waiting.
    const loaded = deserializeStall(JSON.parse(JSON.stringify(serializeStall(done))))
    expect(loaded).toEqual(done)
    const next = callNext(loaded)
    expect(next.sentAway).toBe(false)
    expect(next.stall.finished).toBe(false)
    expect(next.stall.job).toEqual(done.next)
    expect(next.stall.next.who).not.toBe(next.stall.job.who)
  })
})

describe('the position and the customers', () => {
  it('a new position first shows in the customer after next', () => {
    const first = freshStall(null)
    expect([first.job.from, first.next.from]).toEqual(['gap', 'gap'])
    const judged = handOver(mended(first))!.stall
    expect(judged.position).toBe('switch')
    // The one who waits was laid out before the cycle was judged.
    expect(judged.next.from).toBe('gap')
    const second = callNext(judged).stall
    expect(second.job.from).toBe('gap')
    expect(second.next.from).toBe('switch')
  })

  it('moves one step at a time and never inside a cycle', () => {
    let stall = freshStall(null)
    const seen = [stall.position]
    for (let i = 0; i < 4; i++) {
      const opened = openGadget(stall)
      expect(opened.position).toBe(stall.position)
      stall = callNext(opened).stall
      seen.push(stall.position)
    }
    expect(seen).toEqual(['gap', 'gap', 'gap', 'gap', 'gap'])
  })

  it('lays out the same customers again from the same save', () => {
    const judged = handOver(mended(freshStall(null)))!.stall
    expect(callNext(judged)).toEqual(callNext(deserializeStall(JSON.parse(JSON.stringify(serializeStall(judged))))))
  })
})

describe('the neat way', () => {
  it('is shown once for an idea, after the first hand-back that ran', () => {
    const over = handOver(mended(freshStall(null)))!
    expect(over.neatWay).toBe('gap')
    expect(over.stall.shown).toEqual(['gap'])
    // The next customer was also laid out from `gap`: its neat way has been shown and is not shown again.
    const again = handOver(mended(callNext(over.stall).stall))!
    expect(again.outcome).toBe('well')
    expect(again.neatWay).toBeNull()
    expect(again.stall.shown).toEqual(['gap'])
  })

  it('is not shown for a hand-back that did not run', () => {
    expect(handOver(openGadget(freshStall(null)))!.neatWay).toBeNull()
  })
})

describe('the sign', () => {
  it('comes onto the mat and goes back at a touch, and is the child\'s own to change at any time', () => {
    const stall = freshStall(null)
    const down = swapBoards(stall)
    expect(boardOnMat(down)).toBe(stall.sign)
    const changed = change(down, (c) => clipLead(c, 0, 1))
    expect(changed.stall.sign.leads.length).toBe(stall.sign.leads.length + 1)
    expect(changed.stall.job).toBe(stall.job)
    expect(swapBoards(changed.stall).onMat).toBe('job')
    // Even after a cycle has ended.
    const done = swapBoards(handOver(mended(stall))!.stall)
    expect(change(done, (c) => clipLead(c, 0, 1)).stall.sign).not.toBe(done.sign)
  })

  it('is never handed back and moves no position', () => {
    const down = swapBoards(openGadget(freshStall(null)))
    expect(handOver(down)).toBeNull()
    expect(change(down, (c) => clipLead(c, 0, 1)).stall.position).toBe('gap')
  })

  it('answers a short like any board: the flag pops, and the state stays', () => {
    const down = swapBoards(freshStall(null))
    const board = boardFor(down.sign)
    const [base, cap] = board.cellSockets[1]
    const shorted = change(down, (c) => clipLead(c, base, cap))
    expect(shorted.consequences.map((c) => c.type)).toEqual(['pop'])
    expect(shorted.stall.sign.leads).toHaveLength(down.sign.leads.length + 1)
  })
})
