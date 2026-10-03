import { describe, expect, it } from 'vitest'
import { Bench } from './bench'
import { boardOf } from './board'
import { removeLead, type Circuit } from './circuit'
import { asBuilt } from './gadgets'
import { handBack } from './handback'
import { deserializeStall, freshStall, serializeStall, type Stall } from './save'
import { atRest, LENGTH, settled } from './show'
import { level, WORK } from './solve'
import { bootAt, COIL, HUNG, leadEnds, lidBox, looseEnd, matAt, matCells, MUG, oddPlace, OWNER, padAt, probeGrip, TEST_LAMP, trayPlace, TRAY_KINDS, WAITING, type P } from './stage'

// A stall whose customer at the bench brought this circuit, shut.
const stallWith = (circuit: Circuit, who: Stall['job']['who'] = 'owl'): Stall => {
  const fresh = freshStall(null)
  return { ...fresh, job: { ...fresh.job, who, circuit, open: false, missed: false, ticket: null }, next: { ...fresh.next, who: who === 'moth' ? 'yak' : 'moth' } }
}
const mid = (box: { x: number; y: number; w: number; h: number }): P => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
const OWNER_AT = mid(OWNER), WAITING_AT = mid(WAITING)
const tap = (bench: Bench, at: P) => { bench.press(at); bench.lift(at, 'tap') }
const drag = (bench: Bench, from: P, to: P) => {
  bench.press(from)
  bench.move({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 })
  bench.move(to)
  bench.lift(to, 'end')
}
const run = (bench: Bench, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) bench.step(1 / 60) }
const voices = (bench: Bench) => bench.sounds.map((s) => s.voice)
const quiet = (bench: Bench) => { bench.sounds = []; bench.marks = [] }
const through = (bench: Bench) => new Bench(deserializeStall(JSON.parse(JSON.stringify(serializeStall(bench.stall)))))
const pad = (bench: Bench, i: number) => padAt(bench.live, i)
const partMid = (bench: Bench, kind: string) => bench.midOf(bench.live.parts.findIndex((p) => p.kind === kind))
const lit = (bench: Bench, kind = 'lamp') => bench.live.parts.some((p, i) => p.kind === kind && level(bench.reading.parts[i]) > 0)

const board = boardOf('lamp')
const [linkA, linkB] = board.linkSocket
const spare = board.rungs[0]
/** A lantern with its link taken off: a gap in plain sight. */
const gapped = (kind: 'lamp' | 'fan' | 'bell' = 'lamp') => removeLead(asBuilt(kind), 0)
/** The bench with that lantern open on the mat and its switch down. */
const opened = (circuit = gapped()) => {
  const bench = new Bench(stallWith(circuit))
  tap(bench, OWNER_AT)
  quiet(bench)
  bench.dirty = null
  return bench
}

describe('the gadget its owner holds out', () => {
  it('is shut until it is touched: nothing on the mat answers but the mat', () => {
    const bench = new Bench(stallWith(gapped()))
    expect(bench.open).toBe(false)
    tap(bench, padAt(bench.live, linkA))
    expect(voices(bench)).toEqual(['mat-pat'])
    expect(bench.stall.job.circuit.leads).toEqual([])
  })

  it('comes onto the mat and opens at a touch on its owner', () => {
    const bench = new Bench(stallWith(gapped()))
    tap(bench, OWNER_AT)
    expect(bench.stall.job.open).toBe(true)
    expect(bench.open).toBe(true)
    expect(voices(bench)).toEqual(['lid-open'])
    expect(bench.dirty).toBe('soon')
  })
})

describe('leads on a gadget', () => {
  it('a clip bites in the press, and closing the gap makes the lamp light in that call', () => {
    const bench = opened()
    bench.press(pad(bench, linkA))
    expect(bench.stall.job.circuit.leads).toEqual([{ a: linkA, b: null }])
    expect(voices(bench)).toEqual(['lead-clip'])
    bench.move(pad(bench, linkB))
    expect(lit(bench)).toBe(false)
    bench.lift(pad(bench, linkB), 'end')
    expect(lit(bench)).toBe(true)
    expect(voices(bench)).toEqual(['lead-clip', 'lead-clip', 'lamp-clip', 'cell-clip'])
    expect(bench.marks.map((m) => m.type)).toContain('lit')
  })

  it('pulled by its boot, a lead lets everything stop at once; dropped on the coil it winds up', () => {
    const bench = opened()
    drag(bench, pad(bench, linkA), pad(bench, linkB))
    quiet(bench)
    bench.press(bootAt(bench.live, 0, 1, bench.bends()[0]))
    expect(lit(bench)).toBe(false)
    expect(voices(bench)).toEqual(['lead-unclip'])
    bench.move(COIL); bench.lift(COIL, 'end')
    expect(bench.stall.job.circuit.leads).toEqual([])
    expect(voices(bench).at(-1)).toBe('lead-wind')
  })

  it('two leads join end to end where one clip is let go on another that lies loose', () => {
    const bench = opened()
    drag(bench, pad(bench, linkA), { x: 620, y: 680 })
    run(bench, 2)
    const loose = looseEnd(bench.live, 0)
    drag(bench, pad(bench, linkB), loose)
    expect(bench.stall.job.circuit.leads).toEqual([{ a: linkA, b: null }, { a: linkB, b: { lead: 0, end: 1 } }])
    expect(lit(bench)).toBe(true)
    expect(voices(bench)).toContain('lead-second')
  })

  it('a lead straight across the cell pops its flag and glows; a lead across a lamp in a row puts it out with a tink', () => {
    const bench = opened()
    const cell = bench.live.parts.find((p) => p.kind === 'cell')!
    drag(bench, pad(bench, cell.a), pad(bench, cell.b))
    expect(voices(bench)).toContain('cell-across')
    expect(bench.marks.some((m) => m.type === 'pop')).toBe(true)
    expect([...bench.hot.keys()]).toEqual([0])
    // A second lamp in the row, in place of the link, then a lead across it.
    const row = opened()
    drag(row, mid(trayPlace(TRAY_KINDS.indexOf('lamp'))), { x: (pad(row, linkA).x + pad(row, linkB).x) / 2, y: pad(row, linkA).y })
    expect(lit(row)).toBe(true)
    expect(voices(row)).toContain('lamp-second')
    quiet(row)
    drag(row, pad(row, linkA), pad(row, linkB))
    expect(voices(row)).toEqual(['lead-clip', 'lamp-across'])
  })
})

describe('parts on a gadget', () => {
  const mended = () => {
    const bench = opened()
    drag(bench, pad(bench, linkA), pad(bench, linkB))
    quiet(bench)
    return bench
  }

  it('a lever throws in the press', () => {
    const bench = mended()
    bench.press(partMid(bench, 'switch'))
    expect(lit(bench)).toBe(false)
    expect(voices(bench)).toEqual(['switch-flick'])
    bench.lift(partMid(bench, 'switch'), 'tap')
    tap(bench, partMid(bench, 'switch'))
    expect(lit(bench)).toBe(true)
  })

  it('a lever with a lead across it clicks to no effect', () => {
    const bench = mended()
    const sw = bench.live.parts.find((p) => p.kind === 'switch')!
    drag(bench, pad(bench, sw.a), pad(bench, sw.b))
    quiet(bench)
    tap(bench, partMid(bench, 'switch'))
    expect(voices(bench)).toEqual(['switch-across'])
    expect(lit(bench)).toBe(true)
  })

  it('a part lifted off leaves the running circuit at once, and still sits in the saved one until it is put down', () => {
    const bench = mended()
    const lamp = partMid(bench, 'lamp')
    bench.press(lamp)
    bench.move({ x: lamp.x - 60, y: lamp.y + 40 })
    expect(bench.hand).toMatchObject({ holds: 'part' })
    expect(bench.live.parts.some((p) => p.kind === 'lamp')).toBe(false)
    expect(bench.stall.job.circuit.parts.some((p) => p.kind === 'lamp')).toBe(true)
    // Put away now, it is found where it came from.
    expect(through(bench).live.parts.some((p) => p.kind === 'lamp')).toBe(true)
    // Dropped in the tray, it is gone from both.
    bench.move(mid(trayPlace(1))); bench.lift(mid(trayPlace(1)), 'end')
    expect(bench.stall.job.circuit.parts.some((p) => p.kind === 'lamp')).toBe(false)
    expect(voices(bench).at(-1)).toBe('part-away')
  })

  it('let go over the place it came from, a part is turned round: a motor then turns the other way', () => {
    const bench = opened(gapped('fan'))
    drag(bench, pad(bench, linkA), pad(bench, linkB))
    const motor = () => bench.reading.parts[bench.live.parts.findIndex((p) => p.kind === 'motor')]
    expect(motor()).toBeGreaterThan(0)
    quiet(bench)
    const at = partMid(bench, 'motor')
    drag(bench, at, { x: at.x + 22, y: at.y + 6 })
    expect(motor()).toBeLessThan(0)
    expect(voices(bench)).toContain('motor-turn')
    expect(handBack(bench.stall.job.circuit).ran).toBe(false)
  })

  it('from the tray onto a spare rung, a second lamp side by side: both at full glow', () => {
    const bench = mended()
    const rung = { x: pad(bench, spare[0]).x, y: (pad(bench, spare[0]).y + pad(bench, spare[1]).y) / 2 }
    drag(bench, mid(trayPlace(TRAY_KINDS.indexOf('lamp'))), rung)
    const lamps = bench.live.parts.flatMap((p, i) => (p.kind === 'lamp' ? [level(bench.reading.parts[i])] : []))
    expect(lamps).toEqual([2, 2])
    expect(voices(bench)).toEqual(['part-lift', 'lamp-second'])
  })

  it('laid loose on the mat, a part stays there and can be clipped to by its ends', () => {
    const bench = mended()
    const cell = matCells(bench.live)[0]
    drag(bench, partMid(bench, 'lamp'), matAt(cell))
    expect(bench.stall.job.circuit.loose).toEqual([{ kind: 'lamp', blown: false, at: cell }])
    expect(lit(bench)).toBe(false)
    const rung = board.rungs[2]
    drag(bench, pad(bench, rung[0]), { x: matAt(cell).x - 42, y: matAt(cell).y })
    drag(bench, pad(bench, rung[1]), { x: matAt(cell).x + 42, y: matAt(cell).y })
    expect(bench.stall.job.circuit.leads.slice(-2)).toEqual([{ a: rung[0], b: { loose: 0, end: 0 } }, { a: rung[1], b: { loose: 0, end: 1 } }])
    expect(level(bench.reading.loose[0])).toBe(2)
    expect(through(bench).stall.job.circuit).toEqual(bench.stall.job.circuit)
  })

  it('a bench odd goes in a gap: a spoon passes, a rubber blocks, each with its own sound', () => {
    const gap = (bench: Bench) => ({ x: (pad(bench, linkA).x + pad(bench, linkB).x) / 2, y: pad(bench, linkA).y })
    const spoon = opened()
    drag(spoon, oddPlace('spoon'), gap(spoon))
    expect(lit(spoon)).toBe(true)
    expect(voices(spoon)).toContain('odd-clip-spoon')
    const rubber = opened()
    drag(rubber, oddPlace('rubber'), gap(rubber))
    expect(lit(rubber)).toBe(false)
    expect(voices(rubber)).toContain('odd-clip-rubber')
    expect(rubber.stall.job.circuit.parts.at(-1)).toMatchObject({ kind: 'odd', what: 'rubber' })
  })

  it('three cells in a row blow the lamp: it flares, and is then a gap that rattles', () => {
    const bench = opened()
    const sw = bench.live.parts.find((p) => p.kind === 'switch')!
    const swMid = partMid(bench, 'switch')
    drag(bench, swMid, mid(trayPlace(4)))
    const cellTray = mid(trayPlace(0))
    drag(bench, cellTray, { x: (pad(bench, linkA).x + pad(bench, linkB).x) / 2, y: pad(bench, linkA).y })
    quiet(bench)
    drag(bench, cellTray, { x: (pad(bench, sw.a).x + pad(bench, sw.b).x) / 2, y: pad(bench, sw.a).y })
    // Whichever way round the two went in, turning one makes three in a row or leaves them pushing against each other.
    const lamp = () => bench.live.parts.find((p) => p.kind === 'lamp')!
    if (lamp().kind === 'lamp' && !(lamp() as { blown: boolean }).blown) {
      for (const at of [{ x: (pad(bench, linkA).x + pad(bench, linkB).x) / 2, y: pad(bench, linkA).y }, { x: (pad(bench, sw.a).x + pad(bench, sw.b).x) / 2, y: pad(bench, sw.a).y }]) {
        if ((lamp() as { blown: boolean }).blown) break
        drag(bench, at, { x: at.x + 18, y: at.y })
      }
    }
    expect((lamp() as { blown: boolean }).blown).toBe(true)
    expect(voices(bench)).toContain('lamp-blow')
    quiet(bench)
    tap(bench, partMid(bench, 'lamp'))
    expect(voices(bench)).toEqual(['lamp-blown-flick'])
  })
})

describe('a lead on the bare mat', () => {
  it('pulled out of the coil and let go on the mat, it lies where it was put; taken up again and let go on the tray, it winds back', () => {
    const bench = opened()
    drag(bench, COIL, { x: 600, y: 230 })
    expect(bench.stall.job.circuit.leads).toHaveLength(1)
    expect(bench.stall.job.circuit.leads[0]).toMatchObject({ a: null, b: null })
    expect(voices(bench)).toEqual(['coil-pull', 'lead-drop'])
    expect(through(bench).stall.job.circuit).toEqual(bench.stall.job.circuit)
    // It is where it was put, and is taken up whole by either clip.
    const [first, second] = leadEnds(bench.live, 0)
    expect(Math.hypot(first.x - 600, first.y - 230)).toBeLessThan(80)
    quiet(bench)
    drag(bench, second, mid(trayPlace(2)))
    expect(bench.stall.job.circuit.leads).toEqual([])
    expect(voices(bench)).toEqual(['lead-pick', 'lead-wind'])
  })

  it('taken up whole and let go on a pad, its first clip bites there', () => {
    const bench = opened()
    drag(bench, COIL, { x: 600, y: 230 })
    drag(bench, leadEnds(bench.live, 0)[0], pad(bench, linkA))
    expect(bench.stall.job.circuit.leads).toEqual([{ a: linkA, b: null }])
  })

  it('pulled off by its only clip and let go over the mat, a lead lies there and is not lost', () => {
    const bench = opened()
    drag(bench, pad(bench, linkA), { x: 620, y: 680 })
    run(bench, 2)
    drag(bench, bootAt(bench.live, 0, 0, bench.bends()[0]), { x: 300, y: 230 })
    expect(bench.stall.job.circuit.leads).toHaveLength(1)
    expect(bench.stall.job.circuit.leads[0].a).toBeNull()
  })
})

describe('a second motor', () => {
  it('in a row, both lazy with a low drone; side by side, both at full speed and the whirr doubles', () => {
    const spareMid = (bench: Bench) => ({ x: pad(bench, spare[0]).x, y: (pad(bench, spare[0]).y + pad(bench, spare[1]).y) / 2 })
    const beside = opened(gapped('fan'))
    drag(beside, pad(beside, linkA), pad(beside, linkB))
    quiet(beside)
    drag(beside, mid(trayPlace(TRAY_KINDS.indexOf('motor'))), spareMid(beside))
    expect(beside.live.parts.filter((p) => p.kind === 'motor')).toHaveLength(2)
    expect(beside.sounds.find((s) => s.voice === 'motor-second')!.pitch).toBe(1)
    expect(voices(beside)).toContain('motor-clip')
    const row = opened(gapped('fan'))
    drag(row, mid(trayPlace(TRAY_KINDS.indexOf('motor'))), { x: (pad(row, linkA).x + pad(row, linkB).x) / 2, y: pad(row, linkA).y })
    expect(row.sounds.find((s) => s.voice === 'motor-second')!.pitch).toBeLessThan(0.8)
    const speeds = row.live.parts.flatMap((p, i) => (p.kind === 'motor' ? [level(row.reading.parts[i])] : []))
    expect(speeds).toEqual([1, 1])
  })
})

describe('the two secrets of a flick', () => {
  const motorOf = (bench: Bench) => bench.live.parts.find((p) => p.kind === 'motor')!

  it('a blade flicked with a lamp in its loop and no cell makes the lamp glint while it turns, and then stops', () => {
    // A car with its cell taken out: the motor and the lamp side by side are a loop of their own.
    const bench = opened(removeLead(asBuilt('car'), 0))
    drag(bench, pad(bench, linkA), pad(bench, linkB))
    drag(bench, partMid(bench, 'cell'), mid(trayPlace(0)))
    expect(lit(bench)).toBe(false)
    const before = WORK.solves
    tap(bench, partMid(bench, 'motor'))
    expect(lit(bench)).toBe(true)
    run(bench, 0.5)
    expect(lit(bench)).toBe(true)
    expect(bench.turnedOf(motorOf(bench))).toBeGreaterThan(1)
    run(bench, 6)
    expect(lit(bench)).toBe(false)
    // While it freewheeled the circuit was solved each frame; once it has stopped, not again.
    const after = WORK.solves
    expect(after).toBeGreaterThan(before + 20)
    run(bench, 2)
    expect(WORK.solves).toBe(after)
  })

  it('a blade flicked with a lead across its motor\'s legs stops short; with its legs free it turns for longest', () => {
    const far = (shorted: boolean) => {
      const bench = opened(removeLead(asBuilt('fan'), 0))
      const motor = motorOf(bench)
      if (shorted) drag(bench, pad(bench, motor.a), pad(bench, motor.b))
      tap(bench, partMid(bench, 'motor'))
      let most = 0
      for (let i = 0; i < 600; i++) { bench.step(1 / 60); most = Math.max(most, bench.turnedOf(motorOf(bench))) }
      // Once it has stopped it is no longer turning.
      expect(bench.turnedOf(motorOf(bench))).toBe(0)
      return most
    }
    expect(far(true)).toBeGreaterThan(0.2)
    expect(far(false)).toBeGreaterThan(far(true) * 2.5)
  })

  it('a flat cell bounces twice', () => {
    const fan = removeLead(asBuilt('fan'), 0)
    const bench = opened({ ...fan, parts: fan.parts.map((p) => (p.kind === 'cell' ? { ...p, flat: true } : p)) })
    const key = bench.keyOf(bench.live.parts.find((p) => p.kind === 'cell')!)
    tap(bench, partMid(bench, 'cell'))
    expect(voices(bench)).toEqual(['cell-flat-flick'])
    const heights: number[] = []
    for (let i = 0; i < 40; i++) { bench.step(1 / 60); heights.push(bench.kickOf(key)) }
    const peaks = heights.filter((h, i) => i > 0 && i < heights.length - 1 && h > heights[i - 1] && h >= heights[i + 1] && h > 0.02)
    expect(peaks.length).toBe(2)
  })
})

describe('the test lamp', () => {
  it('each clip is taken where it lies and bites where it is let go; across the gap it glows', () => {
    const bench = opened()
    drag(bench, probeGrip(bench.live, 0), pad(bench, linkA))
    drag(bench, probeGrip(bench.live, 1), pad(bench, linkB))
    expect(bench.stall.job.circuit.probe).toEqual([linkA, linkB])
    expect(level(bench.reading.probe)).toBe(1)
    expect(through(bench).stall.job.circuit.probe).toEqual([linkA, linkB])
    // Taken off by its boot and let go over nothing, a clip goes back to its own place.
    drag(bench, probeGrip(bench.live, 1), { x: 700, y: 690 })
    expect(bench.stall.job.circuit.probe).toEqual([linkA, null])
    quiet(bench)
    tap(bench, TEST_LAMP)
    expect(voices(bench)).toEqual(['lamp-flick'])
  })

  it('does not count at the hand-back: a mend that only runs through it is laid back', () => {
    const bench = opened()
    drag(bench, probeGrip(bench.live, 0), pad(bench, linkA))
    drag(bench, probeGrip(bench.live, 1), pad(bench, linkB))
    tap(bench, OWNER_AT)
    expect(bench.stall.finished).toBe(false)
    expect(bench.stall.job.missed).toBe(true)
  })
})

describe('handing back', () => {
  const ready = () => {
    const bench = opened()
    drag(bench, pad(bench, linkA), pad(bench, linkB))
    quiet(bench)
    bench.dirty = null
    return bench
  }

  it('saves the outcome before the scene\'s first beat, and the scene ends where a load of that save starts', () => {
    const bench = ready()
    tap(bench, OWNER_AT)
    expect(bench.stall).toMatchObject({ finished: true, position: 'switch' })
    expect(bench.dirty).toBe('now')
    expect(bench.scene?.running).toBe(true)
    // Not one beat has played: the show has not moved yet.
    expect(bench.show.take).toBe(0)
    const saved = through(bench)
    run(bench, LENGTH.handBack + LENGTH.neatWay + 0.5)
    expect(bench.scene).toBeNull()
    expect(bench.show).toEqual(saved.show)
    expect(saved.show).toEqual(settled(bench.show.act!, true))
    expect(saved.scene).toBeNull()
  })

  it('can be done by dragging the gadget to its owner by its lid', () => {
    const bench = ready()
    drag(bench, mid(lidBox(bench.live)), OWNER_AT)
    expect(bench.stall.finished).toBe(true)
    const back = ready()
    drag(back, mid(lidBox(back.live)), { x: 700, y: 500 })
    expect(back.stall.finished).toBe(false)
  })

  it('a touch ends the scene and is then an ordinary touch', () => {
    const bench = ready()
    tap(bench, OWNER_AT)
    run(bench, 1)
    quiet(bench)
    tap(bench, MUG)
    expect(bench.scene).toBeNull()
    expect(bench.show).toEqual(settled(bench.show.act!, true))
    expect(voices(bench)).toEqual(['mug-tink'])
  })

  it('when it does not run, the owner lays it back as it was and the cycle goes on', () => {
    const bench = opened()
    const before = bench.stall.job.circuit
    tap(bench, OWNER_AT)
    expect(bench.stall).toMatchObject({ finished: false, position: 'gap' })
    expect(bench.stall.job).toMatchObject({ missed: true, open: true })
    expect(bench.dirty).toBe('now')
    run(bench, LENGTH.laidBack + 0.2)
    expect(bench.show).toEqual(atRest())
    expect(bench.stall.job.circuit).toEqual(before)
    expect(bench.open).toBe(true)
  })

  it('a finished gadget is its owner\'s: the mat is bare, and a touch on the owner only gets its voice', () => {
    const bench = ready()
    tap(bench, OWNER_AT)
    run(bench, 12)
    quiet(bench)
    expect(bench.open).toBe(false)
    tap(bench, OWNER_AT)
    expect(voices(bench)).toEqual(['voice-owl'])
    expect(bench.stall.finished).toBe(true)
  })
})

describe('the customer who waits', () => {
  it('comes to the bench at a touch, after a finished cycle or in place of an unfinished one', () => {
    const bench = opened()
    drag(bench, pad(bench, linkA), pad(bench, linkB))
    tap(bench, OWNER_AT)
    run(bench, 12)
    const waiting = bench.stall.next
    bench.dirty = null
    tap(bench, WAITING_AT)
    expect(bench.stall.job).toEqual(waiting)
    expect(bench.stall.finished).toBe(false)
    expect(bench.leaving?.who).toBe('owl')
    expect(bench.dirty).toBe('now')
    expect(bench.show.walk).toBe(1)
    run(bench, 0.1)
    expect(bench.show.walk).toBeLessThan(0.2)
    run(bench, LENGTH.changeOver + 0.2)
    expect(bench.show).toEqual(atRest())
    expect(bench.leaving).toBeNull()
    // Sent away unfinished: the position moves down, never below the first.
    const sent = new Bench({ ...stallWith(gapped()), position: 'flat' })
    tap(sent, WAITING_AT)
    expect(sent.stall.position).toBe('switch')
  })

  it('nothing new starts by itself: a finished scene stays for as long as nothing is touched', () => {
    const bench = opened()
    drag(bench, pad(bench, linkA), pad(bench, linkB))
    tap(bench, OWNER_AT)
    const job = bench.stall.job
    run(bench, 120)
    expect(bench.stall.job).toBe(job)
    expect(bench.stall.finished).toBe(true)
  })
})

describe('the sign', () => {
  it('comes down at a touch on where it hangs, is worked on like any board, and goes back up', () => {
    const bench = opened()
    tap(bench, mid(HUNG))
    expect(bench.stall.onMat).toBe('sign')
    expect(bench.live.gadget).toBe('sign')
    expect(voices(bench)).toEqual(['board-swap'])
    const cell = bench.live.parts.find((p) => p.kind === 'cell' && p.flat)!
    drag(bench, pad(bench, cell.a), pad(bench, cell.b))
    expect(bench.stall.sign.leads.length).toBe(2)
    tap(bench, mid(HUNG))
    expect(bench.stall.onMat).toBe('job')
    expect(bench.stall.sign.leads.length).toBe(2)
    // It is never handed back.
    tap(bench, mid(HUNG))
    tap(bench, OWNER_AT)
    expect(bench.stall.finished).toBe(false)
    expect(bench.stall.job.missed).toBe(false)
  })
})

describe('everything answers', () => {
  it('the old hand grumbles, her mug tinks, a customer answers in its own voice', () => {
    const bench = opened()
    tap(bench, { x: 120, y: 730 }); tap(bench, MUG)
    expect(voices(bench)).toEqual(['old-hand-grumble', 'mug-tink'])
  })

  it('five hundred random touches: every press is answered in that call, and the stall is always found as left', () => {
    const bench = opened(removeLead(asBuilt('robot'), 0))
    let seed = 11
    const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647
    const somewhere = () => (random() < 0.5 ? { x: 250 + random() * 900, y: 200 + random() * 600 } : pad(bench, Math.floor(random() * 20)))
    for (let i = 0; i < 500; i++) {
      const at = somewhere()
      bench.sounds = []
      bench.press(at)
      expect(bench.sounds.length, `press ${i} at ${Math.round(at.x)}, ${Math.round(at.y)}`).toBeGreaterThan(0)
      const to = somewhere()
      bench.move(to)
      if (i % 7 === 0) {
        // Put away in the middle of a touch: what is saved is a state the reader takes as it stands.
        const saved = serializeStall(bench.stall)
        expect(deserializeStall(JSON.parse(JSON.stringify(saved)))).toEqual(saved)
      }
      bench.lift(to, random() < 0.3 ? 'tap' : 'end')
      bench.step(1 / 30)
      expect(bench.sway).toHaveLength(bench.live.leads.length)
      expect(bench.tips).toHaveLength(bench.live.leads.length)
      expect(bench.live).toEqual(bench.circuit)
    }
  })
})
