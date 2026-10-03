import { describe, expect, it } from 'vitest'
import { boardOf, GADGET_KINDS, isSocket } from './board'
import { layDown, MAT, MAX_LEADS, MAX_LOOSE, MAX_PARTS, seat, turnPart, type Circuit, type Loose, type Part } from './circuit'
import { LADDER } from './config'
import { handBack } from './handback'
import { deserializeStall, FIRST_STREAM, freshStall, readCircuit, readJob, serializeStall, type Stall } from './save'
import { firstDaySign } from './sign'
import { STATE_VERSION } from './state'

const through = (stall: Stall) => deserializeStall(JSON.parse(JSON.stringify(serializeStall(stall))))

describe('a fresh stall', () => {
  it('has a customer at the bench and another at the window, both laid out from the starting position', () => {
    const stall = freshStall(null)
    expect(stall).toMatchObject({ v: STATE_VERSION, position: 'gap', finished: false, onMat: 'job', shown: [], board: null })
    expect(stall.job.idea).toBe('gap')
    expect(stall.next.idea).toBe('gap')
    expect(stall.next.who).not.toBe(stall.job.who)
    expect(handBack(stall.job.circuit).ran).toBe(false)
  })

  it('is the same for every child of an age, and starts older children one step on', () => {
    expect(freshStall(9)).toEqual(freshStall(null))
    expect(freshStall(4).position).toBe('gap')
    expect(freshStall(11).position).toBe('switch')
    expect(freshStall(30).position).toBe('switch')
    expect(freshStall(12).job.idea).toBe('switch')
  })

  it('hangs the sign broken, and bigger than any gadget', () => {
    const sign = freshStall(null).sign
    expect(sign).toEqual(firstDaySign())
    expect(sign.cracks.length).toBeGreaterThan(0)
    expect(sign.parts.some((p) => p.kind === 'lamp' && p.blown)).toBe(true)
    expect(sign.parts.some((p) => p.kind === 'cell' && p.flat)).toBe(true)
  })
})

describe('saving and loading', () => {
  it('comes back exactly as it was left', () => {
    const stall = freshStall(10)
    const worked: Stall = {
      ...stall,
      position: 'stuff',
      finished: true,
      onMat: 'sign',
      shown: ['gap', 'switch'],
      board: 'switch',
      job: { ...stall.job, open: true, missed: true, ticket: { part: 'lamp', count: 2 }, circuit: { ...stall.job.circuit, leads: [...stall.job.circuit.leads, { a: 3, b: null }], probe: [2, null] } },
    }
    expect(through(worked)).toEqual(worked)
    expect(serializeStall(worked)).toEqual(worked)
  })

  it('a saved position wins over the age', () => {
    const saved = serializeStall({ ...freshStall(9), position: 'branch' })
    expect(deserializeStall(JSON.parse(JSON.stringify(saved)), 12).position).toBe('branch')
  })

  it('writes these fields and no others', () => {
    const saved = serializeStall({ ...freshStall(null), extra: 1 } as Stall)
    expect(Object.keys(saved).sort()).toEqual(['board', 'finished', 'job', 'next', 'onMat', 'position', 'shown', 'sign', 'stream', 'v'])
    expect(Object.keys(saved.job).sort()).toEqual(['circuit', 'idea', 'missed', 'open', 'ticket', 'who'])
    expect(Object.keys(saved.sign).sort()).toEqual(['cracks', 'gadget', 'leads', 'loose', 'parts', 'probe'])
  })

  it('holds no date, no duration and no count of visits or mends', () => {
    const text = JSON.stringify(serializeStall(freshStall(null)))
    expect(text).not.toMatch(/time|date|day|visit|count"|score|streak|played|seconds|mended/i)
  })
})

describe('a damaged or foreign record', () => {
  const fresh = freshStall(null)

  it.each([
    ['nothing', undefined], ['null', null], ['a number', 7], ['a string', 'stall'], ['an array', []], ['an empty record', {}],
    ['a version above this one', { ...serializeStall(fresh), v: STATE_VERSION + 1 }], ['no version', { ...serializeStall(fresh), v: undefined }],
  ])('%s gives a fresh stall', (_, raw) => {
    expect(deserializeStall(raw)).toEqual(fresh)
  })

  it('repairs one field and keeps the rest', () => {
    const good = serializeStall({ ...fresh, position: 'dead', shown: ['gap'], onMat: 'sign' })
    for (const [field, bad] of [['job', 'gone'], ['next', { who: 'nobody' }], ['sign', { gadget: 'lamp' }], ['stream', -4], ['shown', 'all'], ['onMat', 3], ['position', 'grade-4']] as const) {
      const read = deserializeStall({ ...good, [field]: bad })
      for (const other of ['position', 'job', 'next', 'sign', 'onMat', 'shown'] as const) {
        if (other === field) continue
        // The stream moves on when a customer had to be laid out again, and the window's customer may then change too.
        if ((field === 'job' && other === 'next') || (field === 'stream' && false)) continue
        expect(read[other], `${field} damaged, ${other} kept`).toEqual(good[other])
      }
      expect(LADDER).toContain(read.position)
      expect(read.next.who).not.toBe(read.job.who)
      expect(readJob(read.job)).not.toBeNull()
      expect(readCircuit(read.sign)).not.toBeNull()
    }
  })

  it('lays out a new customer from where the child is when the one at the bench is lost', () => {
    const read = deserializeStall({ ...serializeStall({ ...fresh, position: 'short' }), job: null })
    expect(read.job.idea).toBe('short')
    expect(read.stream).not.toBe(fresh.stream)
  })

  it('keeps her practice board mended only for an idea that was shown, and only while that cycle is on screen', () => {
    const done = { ...serializeStall(fresh), finished: true, shown: ['gap'] }
    expect(deserializeStall({ ...done, board: 'gap' }).board).toBe('gap')
    expect(deserializeStall({ ...done, board: 'switch' }).board).toBeNull()
    expect(deserializeStall({ ...done, board: 7 }).board).toBeNull()
    expect(deserializeStall({ ...done, finished: false, board: 'gap' }).board).toBeNull()
  })

  it('keeps only the ideas it knows in `shown`, each once', () => {
    expect(deserializeStall({ ...serializeStall(fresh), shown: ['switch', 'gap', 'gap', 'grade-5', 9] }).shown).toEqual(['gap', 'switch'])
  })

  it('refuses a circuit that could not lie on the board', () => {
    const c = fresh.job.circuit
    const bad: unknown[] = [
      { ...c, gadget: 'toaster' }, { ...c, cracks: [999] }, { ...c, cracks: [0, 0] }, { ...c, cracks: 'all' },
      { ...c, parts: [{ kind: 'lamp', a: 0, b: 0, blown: false }] }, { ...c, parts: [{ kind: 'lamp', a: 0, b: 9999, blown: false }] },
      { ...c, parts: [{ kind: 'kettle', a: 0, b: 1 }] }, { ...c, parts: [...c.parts, c.parts[0]] }, { ...c, parts: [{ kind: 'odd', a: 0, b: 1, what: 'ham' }] },
      { ...c, leads: [{ a: -1, b: 2 }] }, { ...c, leads: [{ a: 1, b: 2.5 }] }, { ...c, leads: new Array(MAX_LEADS + 1).fill({ a: 0, b: 1 }) },
      { ...c, probe: [0] }, { ...c, probe: [0, 'x'] }, { ...c, loose: undefined }, { ...c, loose: [{ kind: 'lamp', blown: false, at: -1 }] },
      { ...c, loose: [{ kind: 'lamp', blown: false, at: 3 }, { kind: 'cell', flat: true, popped: false, at: 3 }] }, { ...c, loose: [{ kind: 'kettle', at: 3 }] }, { ...c, parts: new Array(MAX_PARTS + 1).fill(c.parts[0]) },
    ]
    for (const raw of bad) expect(readCircuit(raw), JSON.stringify(raw).slice(0, 80)).toBeNull()
    expect(readCircuit(c)).toEqual(c)
    // A part lost its flag in the save: the flag reads as down, and the part is kept.
    expect(readCircuit({ ...c, parts: c.parts.map((p) => ({ kind: p.kind, a: p.a, b: p.b, what: 'spoon' })) })).not.toBeNull()
  })

  it('a customer never brings the sign, and the sign is never a gadget', () => {
    expect(readJob({ ...fresh.job, circuit: fresh.sign })).toBeNull()
    expect(deserializeStall({ ...serializeStall(fresh), sign: fresh.job.circuit }).sign).toEqual(firstDaySign())
  })
})

describe('what stays where it was put', () => {
  const stall = freshStall(null)
  const again = (circuit: Circuit) => readCircuit(JSON.parse(JSON.stringify(circuit)))

  it('the way round a part lies', () => {
    const cell = stall.sign.parts.findIndex((p) => p.kind === 'cell')
    const turned = turnPart(stall.sign, cell)
    expect(again(turned)).toEqual(turned)
    expect(again(turned)!.parts[cell]).toMatchObject({ a: stall.sign.parts[cell].b, b: stall.sign.parts[cell].a })
  })

  it('a part laid loose on the mat, with what it is and the state it is in', () => {
    const lamp = stall.sign.parts.findIndex((p) => p.kind === 'lamp' && p.blown)
    const { a, b } = stall.sign.parts[lamp]
    const laid = layDown(stall.sign, lamp, 40)
    expect(laid.loose).toEqual([{ kind: 'lamp', blown: true, at: 40 }])
    expect(again(laid)).toEqual(laid)
    // Seated again the other way round, it is the same blown lamp.
    expect(seat(again(laid)!, 0, b, a).parts.at(-1)).toEqual({ kind: 'lamp', blown: true, a: b, b: a })
  })

  it('the test lamp, clipped by one clip, by both, or lying on the mat', () => {
    for (const probe of [[null, null], [3, null], [3, 7]] as [number | null, number | null][]) expect(again({ ...stall.sign, probe })!.probe).toEqual(probe)
  })
})

describe('the size of a save', () => {
  /** The fullest circuit a board can hold: every trace cracked, every socket filled up to the cap, every lead out, the longest names. */
  const fullest = (gadget: Circuit['gadget']): Circuit => {
    const board = boardOf(gadget)
    const sockets: Part[] = []
    for (let a = 0; a < board.pads.length; a++) for (let b = a + 1; b < board.pads.length; b++) if (isSocket(board, a, b)) sockets.push({ kind: 'buzzer', a, b, dead: false })
    // The sockets with the highest pad numbers, which are the longest to write down.
    const parts = sockets.slice(-MAX_PARTS)
    const last = board.pads.length - 1
    const loose: Loose[] = new Array(MAX_LOOSE).fill(null).map((_, i) => ({ kind: 'buzzer', dead: false, at: MAT.cols * MAT.rows - 1 - i }))
    // The longest a lead can be written: every second lead bites the two clips of the lead before it.
    const leads = new Array(MAX_LEADS).fill(null).map((_, i) => (i % 2 === 0 ? { a: last, b: last } : { a: { lead: i - 1, end: 0 as const }, b: { lead: i - 1, end: 1 as const }, at: MAT.cols * MAT.rows - 1 }))
    return { gadget, cracks: board.traces.map((_, i) => i), parts, leads, loose, probe: [{ loose: MAX_LOOSE - 1, end: 1 }, { loose: MAX_LOOSE - 1, end: 0 }] }
  }

  it('the largest legal state is under half of the 64 KB cap', () => {
    const widest = [...GADGET_KINDS].filter((k) => k !== 'sign').sort((x, y) => JSON.stringify(fullest(y)).length - JSON.stringify(fullest(x)).length)[0]
    const job = { who: 'cockatoo' as const, idea: 'backwards', circuit: fullest(widest), ticket: { part: 'switch' as const, count: 3 as const }, open: false, missed: false }
    const largest: Stall = { v: STATE_VERSION, position: 'backwards', finished: false, stream: 0xffffffff, job, next: job, sign: fullest('sign'), onMat: 'sign', shown: [...LADDER], board: 'backwards' }
    // It is a state the reader accepts as it stands, so it is a legal one.
    const read = deserializeStall(JSON.parse(JSON.stringify({ ...largest, next: { ...job, who: 'tortoise' } })))
    expect(read.sign.parts).toHaveLength(MAX_PARTS)
    expect(read.job.circuit.leads).toHaveLength(MAX_LEADS)
    expect(read.sign.loose).toHaveLength(MAX_LOOSE)
    const bytes = new TextEncoder().encode(JSON.stringify(serializeStall(largest))).length
    expect(bytes).toBeLessThan(32 * 1024)
    expect(bytes).toBeLessThan(8 * 1024)
  })

  it('a fresh stall is small', () => {
    expect(JSON.stringify(serializeStall(freshStall(null))).length).toBeLessThan(2500)
    expect(FIRST_STREAM).toBeGreaterThan(0)
  })
})
