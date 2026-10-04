import { describe, expect, it } from 'vitest'
import { Bench } from './bench'
import { boardOf } from './board'
import { placePart, removeLead, trayPart, turnPart, type Circuit } from './circuit'
import { asBuilt } from './gadgets'
import { handBack } from './handback'
import { deserializeStall, freshStall, serializeStall, type Stall } from './save'
import { atRest, LENGTH, settled } from './show'
import { covers } from './standing'
import { suggest } from './ladder'
import { settle } from './settle'
import { level, read, WORK } from './solve'
import { passerAt, passing, pigeonAt, sag, WASHING } from './lane'
import { biteAt, bootAt, COIL, flagAt, HELD, HELD_AT_WINDOW, hitTest, HUNG, leadCurve, leadEnds, lidBox, MAT_BOX, onCurve, looseEnd, matAt, matCells, MUG, oddPlace, OLD_HAND, OWNER, OWNER_HANDS, padAt, PILLAR_LEFT, PRACTICE, probeGrip, PROBE_HOME, RADIO, STAGE, TEST_LAMP, TOASTER, TRAY, trayPlace, TRAY_KINDS, WAITING, WAITING_HEAD, WINDOW_LEFT, type P } from './stage'

// A stall whose customer at the bench brought this circuit, shut.
const stallWith = (circuit: Circuit, who: Stall['job']['who'] = 'owl'): Stall => {
  const fresh = freshStall(null)
  return { ...fresh, job: { ...fresh.job, who, circuit, open: false, missed: false, ticket: null }, next: { ...fresh.next, who: who === 'moth' ? 'yak' : 'moth' } }
}
const mid = (box: { x: number; y: number; w: number; h: number }): P => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
// A tap on the owner's hands at the counter: where an open gadget is handed back. A shut one opens at a touch anywhere on its owner.
const OWNER_AT = mid(OWNER_HANDS), WAITING_AT = mid(WAITING)
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
const mid2 = (p: P, q: P): P => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })
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
  // A second later: a touch on the owner any sooner would only have the owner answer.
  run(bench, 1)
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
    expect(voices(bench)).toEqual(['lead-clip', 'lead-clip', 'cell-clip', 'lamp-clip'])
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
    drag(bench, COIL, { x: 720, y: 650 })
    expect(bench.stall.job.circuit.leads).toHaveLength(1)
    expect(bench.stall.job.circuit.leads[0]).toMatchObject({ a: null, b: null })
    expect(voices(bench)).toEqual(['coil-pull', 'lead-drop'])
    expect(through(bench).stall.job.circuit).toEqual(bench.stall.job.circuit)
    // It is where it was put, and is taken up whole by either clip.
    const [first, second] = leadEnds(bench.live, 0)
    expect(Math.hypot(first.x - 720, first.y - 650)).toBeLessThan(80)
    quiet(bench)
    drag(bench, second, mid(trayPlace(2)))
    expect(bench.stall.job.circuit.leads).toEqual([])
    expect(voices(bench)).toEqual(['lead-pick', 'lead-wind'])
  })

  it('taken up whole and let go on a pad, its first clip bites there', () => {
    const bench = opened()
    drag(bench, COIL, { x: 720, y: 650 })
    drag(bench, leadEnds(bench.live, 0)[0], pad(bench, linkA))
    expect(bench.stall.job.circuit.leads).toEqual([{ a: linkA, b: null }])
  })

  it('pulled off by its only clip and let go over the mat, a lead lies there and is not lost', () => {
    const bench = opened()
    drag(bench, pad(bench, linkA), { x: 620, y: 680 })
    run(bench, 2)
    drag(bench, bootAt(bench.live, 0, 0, bench.bends()[0]), { x: 100, y: 440 })
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
    tap(bench, OLD_HAND); tap(bench, MUG)
    expect(voices(bench)).toEqual(['old-hand-grumble', 'mug-tink'])
  })

  it('a lead drawn aside by its wire and let go is turned round: its clips swap ends, and nothing else changes', () => {
    const bench = opened(asBuilt('lamp'))
    // A long lead from one end of the top rail to a far rung: it changes nothing that runs, and has a wire to take hold of.
    const from = spare[0], to = board.rungs[2][1]
    drag(bench, pad(bench, from), pad(bench, to))
    const index = bench.live.leads.length - 1, before = bench.reading.parts.map((c) => Math.round(c * 1e6))
    expect(bench.live.leads[index]).toEqual({ a: from, b: to })
    run(bench, 3)
    quiet(bench)
    // Somewhere along its wire that is clear of every pad and part.
    const wire = () => {
      const curve = leadCurve(...leadEnds(bench.live, index), bench.bends()[index])
      for (let t = 0.3; t <= 0.7; t += 0.02) if (hitTest(bench.live, onCurve(curve, t), bench.bends(), true).on === 'wire') return onCurve(curve, t)
      throw new Error('no clear place on the wire')
    }
    // A tap on the wire is a flick, as before.
    tap(bench, wire())
    expect(voices(bench)).toEqual(['lead-flick'])
    expect(bench.live.leads[index]).toEqual({ a: from, b: to })
    run(bench, 3)
    quiet(bench)
    const at = wire()
    bench.press(at); bench.move({ x: at.x + 4, y: at.y - 30 }); bench.lift({ x: at.x + 4, y: at.y - 30 }, 'end')
    expect(voices(bench)).toEqual(['lead-flick', 'lead-turn'])
    expect(bench.live.leads[index]).toEqual({ a: to, b: from })
    expect(bench.reading.parts.map((c) => Math.round(c * 1e6))).toEqual(before)
    expect(through(bench).stall.job.circuit).toEqual(bench.stall.job.circuit)
  })

  it('two leads between the same two pads bow out to either side of each other, whichever way each runs', () => {
    const bench = opened()
    drag(bench, pad(bench, linkA), pad(bench, linkB))
    drag(bench, pad(bench, linkB), pad(bench, linkA))
    drag(bench, pad(bench, linkA), pad(bench, linkB))
    run(bench, 3)
    const middles = bench.live.leads.map((_, i) => onCurve(leadCurve(...leadEnds(bench.live, i), bench.bends()[i]), 0.5))
    for (let a = 0; a < middles.length; a++) for (let b = a + 1; b < middles.length; b++) expect(Math.hypot(middles[a].x - middles[b].x, middles[a].y - middles[b].y), `${a} and ${b}`).toBeGreaterThan(18)
  })

  it('a part turned round turns for a moment in its own way, and a short marks the whole way it took', () => {
    const bench = opened(asBuilt('lamp'))
    const at = partMid(bench, 'cell')
    bench.press(at); bench.move({ x: at.x + 6, y: at.y }); bench.lift({ x: at.x + 4, y: at.y }, 'end')
    const cell = bench.live.parts.find((part) => part.kind === 'cell')!
    expect(bench.turnOf(bench.keyOf(cell))).toBeGreaterThan(0.9)
    run(bench, 0.2)
    expect(bench.turnOf(bench.keyOf(cell))).toBeGreaterThan(0)
    expect(bench.turnOf(bench.keyOf(cell))).toBeLessThan(0.9)
    run(bench, 0.4)
    expect(bench.turnOf(bench.keyOf(cell))).toBe(0)
    // A lead from one pad of the lamp's rung to the rail it comes back by makes a way round the lamp: the flag pops,
    // and the traces on that way glow as well as the lead.
    const lamp = bench.live.parts.find((part) => part.kind === 'lamp')!
    drag(bench, pad(bench, lamp.a), pad(bench, lamp.b))
    expect(bench.live.parts.some((part) => part.kind === 'cell' && part.popped)).toBe(true)
    expect(bench.hot.size).toBeGreaterThan(0)
    expect(bench.hotTraces.size).toBeGreaterThan(0)
    run(bench, 2)
    expect(bench.hotTraces.size).toBe(0)
  })

  it('two leads side by side across a cell both glow when the flag pops', () => {
    const bench = opened(asBuilt('lamp'))
    const cell = bench.live.parts.find((part) => part.kind === 'cell')!
    drag(bench, pad(bench, cell.a), pad(bench, cell.b))
    const first = bench.live.leads.length - 1
    expect(bench.hot.has(first)).toBe(true)
    // A second lead beside the first while the flag is up, and the glow gone. Then the flag is set back: it pops again
    // at once, since the short is still there, and this time the current took both leads.
    drag(bench, pad(bench, cell.b), pad(bench, cell.a))
    run(bench, 2)
    expect(bench.hot.size).toBe(0)
    tap(bench, partMid(bench, 'cell'))
    expect(bench.live.parts.some((part) => part.kind === 'cell' && part.popped)).toBe(true)
    expect(bench.hot.has(first)).toBe(true)
    expect(bench.hot.has(first + 1)).toBe(true)
  })

  it('her practice board stands broken through the hand-back and is mended only as she reaches', () => {
    const bench = opened()
    drag(bench, pad(bench, linkA), pad(bench, linkB))
    tap(bench, OWNER_AT)
    expect(bench.stall.board).toBe('gap')
    // Saved as mended from the start, shown as broken from the scene's first frame until her move.
    run(bench, 1 / 60)
    expect(bench.show.neat).toBe(0)
    run(bench, LENGTH.handBack - 0.1)
    expect(bench.show.neat).toBe(0)
    run(bench, 0.1 + LENGTH.neatWay * 0.3)
    expect(bench.show.neat).toBeGreaterThan(0)
    expect(bench.show.neat).toBeLessThan(0.45)
    run(bench, LENGTH.neatWay)
    expect(bench.show.neat).toBe(1)
    // A load in the middle finds it mended, with nothing replayed.
    expect(through(bench).show.neat).toBe(1)
  })

  it('a flag that pops in its owner\'s hands is heard there, each time the switch is thrown', () => {
    const lamp = asBuilt('lamp'), cell = lamp.parts.find((part) => part.kind === 'cell')!
    const bench = opened(lamp)
    drag(bench, pad(bench, cell.a), pad(bench, cell.b))
    // The flag is set back on the mat; the lead across the cell stays, so it pops again when the owner tries it.
    run(bench, 1)
    quiet(bench)
    tap(bench, OWNER_AT)
    expect(bench.stall.finished).toBe(false)
    quiet(bench)
    let pops = 0
    for (let i = 0; i < 60 * 5; i++) { bench.step(1 / 60); pops += bench.sounds.filter((sound) => sound.voice === 'cell-across').length; bench.sounds = [] }
    expect(pops).toBe(2)
  })

  it('a second tap in the same place, as the ghost hand shows two, does no harm', () => {
    // On the gadget held out: the first tap opens it, the second only has its owner answer. Nothing is handed back.
    const held = new Bench(stallWith(gapped()))
    tap(held, mid(HELD)); tap(held, mid(HELD))
    expect(held.stall.job).toMatchObject({ open: true, missed: false })
    expect(held.scene).toBeNull()
    run(held, 0.4)
    tap(held, mid(HELD))
    expect(held.stall.job.missed).toBe(false)
    // A second later a touch on the owner is the hand-back, as before.
    run(held, 1)
    tap(held, OWNER_AT)
    expect(held.stall.job.missed).toBe(true)
    // On the one who waits: the first tap calls it, the second sends nobody away and moves no position.
    const fresh = opened(asBuilt('lamp'))
    tap(fresh, OWNER_AT)
    run(fresh, LENGTH.handBack + LENGTH.neatWay + 1)
    const position = fresh.stall.position
    tap(fresh, mid(HELD_AT_WINDOW)); tap(fresh, mid(HELD_AT_WINDOW))
    const came = fresh.stall.job.who
    run(fresh, 1)
    tap(fresh, mid(HELD_AT_WINDOW))
    expect(fresh.stall.job.who).toBe(came)
    expect(fresh.stall.position).toBe(position === 'gap' ? 'switch' : position)
    expect(fresh.stall.finished).toBe(false)
  })

  it('a lead with both clips on one pad hangs from it as a loop, and five leads side by side across a cell all glow', () => {
    const bench = opened()
    drag(bench, pad(bench, linkA), pad(bench, linkA))
    expect(bench.live.leads[0]).toEqual({ a: linkA, b: linkA })
    run(bench, 2)
    const curve = leadCurve(...leadEnds(bench.live, 0), bench.bends()[0]), low = onCurve(curve, 0.5)
    expect(low.y - pad(bench, linkA).y).toBeGreaterThan(40)
    expect(Math.abs(onCurve(curve, 0.25).x - onCurve(curve, 0.75).x)).toBeGreaterThan(30)
    const short = opened(asBuilt('lamp'))
    const cell = short.live.parts.find((part) => part.kind === 'cell')!
    const first = short.live.leads.length
    for (let i = 0; i < 5; i++) drag(short, pad(short, i % 2 ? cell.b : cell.a), pad(short, i % 2 ? cell.a : cell.b))
    run(short, 2)
    expect(short.hot.size).toBe(0)
    tap(short, flagAt(short.live, short.live.parts.findIndex((part) => part.kind === 'cell')))
    for (let i = 0; i < 5; i++) expect(short.hot.has(first + i), `lead ${i}`).toBe(true)
    // And the lamp beside the short does not.
    expect(short.hotParts.size).toBe(0)
  })

  it('the head of the one who waits answers as the one who waits, except under the grown-up\'s corner', () => {
    const bench = opened(asBuilt('lamp'))
    tap(bench, OWNER_AT)
    run(bench, LENGTH.handBack + LENGTH.neatWay + 1)
    const head = { x: WAITING_HEAD.x + 30, y: WAITING_HEAD.y + 60 }, under = { x: WAITING_HEAD.x + WAITING_HEAD.w - 10, y: WAITING_HEAD.y + 20 }
    const was = bench.stall.job.who
    quiet(bench)
    tap(bench, under)
    expect(bench.stall.job.who).toBe(was)
    expect(voices(bench)).toEqual(['knock-air'])
    tap(bench, head)
    expect(bench.stall.job.who).not.toBe(was)
  })

  it('a finger that had already lifted made its move: put away inside the wait for it to come back, the move stands', () => {
    // A lamp from the tray let go over a free pair of pads, the finger only lifted: it is waited for, and then the game is put away.
    const bench = opened()
    bench.press(mid(trayPlace(1))); bench.move(mid2(pad(bench, spare[0]), pad(bench, spare[1])))
    bench.lift(mid2(pad(bench, spare[0]), pad(bench, spare[1])), 'lift')
    expect(bench.hand?.holds).toBe('part')
    bench.letGo()
    expect(bench.hand).toBeNull()
    expect(bench.stall.job.circuit.parts.filter((part) => part.kind === 'lamp')).toHaveLength(2)
    // A switch lifted off and put back by a put-away stands as it stood, in the save as on the mat.
    const lever = opened(asBuilt('lamp'))
    const before = JSON.stringify(serializeStall(lever.stall))
    lever.dirty = null
    lever.press(partMid(lever, 'switch')); lever.move({ x: partMid(lever, 'switch').x + 60, y: partMid(lever, 'switch').y + 90 })
    lever.letGo()
    expect(JSON.stringify(serializeStall(lever.stall))).toBe(before)
    expect(lever.dirty).not.toBeNull()
    expect(lit(lever)).toBe(true)
  })

  it('a clip that bites a bench odd where it lies loose sounds as its material does', () => {
    const bench = opened()
    const place = matAt(matCells(bench.live)[4])
    drag(bench, oddPlace('spoon'), place)
    expect(bench.live.loose.map((part) => part.kind)).toEqual(['odd'])
    quiet(bench)
    drag(bench, pad(bench, linkA), { x: place.x - 42, y: place.y })
    expect(voices(bench)).toContain('odd-clip-spoon')
  })

  it('the one who walks off with a gadget that runs is heard on the way, and one sent away is not', () => {
    const bench = opened(asBuilt('bell-plain'))
    tap(bench, OWNER_AT)
    run(bench, LENGTH.handBack + LENGTH.neatWay + 1)
    quiet(bench)
    tap(bench, WAITING_AT)
    quiet(bench)
    run(bench, 1.2)
    expect(voices(bench)).toContain('buzz')
    const away = opened()
    tap(away, WAITING_AT)
    quiet(away)
    run(away, 1.2)
    expect(voices(away)).not.toContain('hum')
  })

  it('an open gadget is handed back at its owner\'s hands; a touch on its head only has it answer', () => {
    const bench = opened(asBuilt('lamp'))
    quiet(bench)
    tap(bench, { x: mid(OWNER).x, y: OWNER.y + 60 })
    expect(bench.stall.finished).toBe(false)
    expect(bench.stall.job.missed).toBe(false)
    expect(voices(bench)).toEqual(['voice-owl'])
    expect(bench.marks).toContainEqual({ type: 'poke', who: 'owner' })
    tap(bench, mid(OWNER_HANDS))
    expect(bench.stall.finished).toBe(true)
    // Dragged by its lid, it is handed back anywhere on its owner.
    const dragged = opened(asBuilt('lamp'))
    drag(dragged, mid(lidBox(dragged.live)), { x: mid(OWNER).x, y: OWNER.y + 60 })
    expect(dragged.stall.finished).toBe(true)
  })

  it('a fresh cell from the tray goes into the cell\'s place the way the gadget\'s own cell lay: a fan whose cell is swapped still blows', () => {
    const fan = asBuilt('fan-plain')
    const bench = opened(fan)
    expect(bench.wind()).toBeGreaterThan(0)
    const own = bench.live.parts.find((part) => part.kind === 'cell')!
    drag(bench, partMid(bench, 'cell'), mid(trayPlace(0)))
    expect(bench.live.parts.some((part) => part.kind === 'cell')).toBe(false)
    drag(bench, mid(trayPlace(0)), mid2(pad(bench, own.a), pad(bench, own.b)))
    expect(bench.live.parts.find((part) => part.kind === 'cell')).toMatchObject({ a: own.a, b: own.b })
    expect(bench.wind()).toBeGreaterThan(0)
  })

  it('a tap on a part in the tray or on a bench odd is a flick and lays nothing down; a finger on a loose part\'s leg clips there', () => {
    const bench = opened()
    tap(bench, oddPlace('spoon'))
    tap(bench, mid(trayPlace(1)))
    expect(bench.live.loose).toEqual([])
    expect(voices(bench).length).toBeGreaterThanOrEqual(2)
    const place = matAt(matCells(bench.live)[4])
    drag(bench, mid(trayPlace(2)), place)
    quiet(bench)
    const leg = { x: place.x + 42, y: place.y }
    bench.press(leg)
    expect(bench.hand).toMatchObject({ holds: 'lead' })
    expect(bench.live.leads.at(-1)).toMatchObject({ a: { loose: 0, end: 1 } })
    expect(voices(bench)).toEqual(['lead-clip'])
    bench.lift(leg, 'end')
    // The middle of it is still the part itself.
    tap(bench, place)
    expect(bench.kick.has(`loose-${bench.live.loose[0].at}`)).toBe(true)
  })

  it('a fan that lies loose and runs through its leads blows as one on the board does, and a spoon that hangs in the loop is in the mend', () => {
    const lamp = gapped()
    const place = matCells(lamp)[4]
    const hanging = (body: Circuit['loose'][number]): Circuit => ({ ...lamp, loose: [body], leads: [{ a: linkA, b: { loose: 0, end: 0 } }, { a: linkB, b: { loose: 0, end: 1 } }] })
    const fan = opened(hanging({ kind: 'motor', dead: false, at: place }))
    expect(Math.abs(fan.wind())).toBeGreaterThan(0)
    expect(handBack(hanging({ kind: 'odd', what: 'spoon', at: place }))).toMatchObject({ ran: true, shiny: true })
  })

  it('a gadget with no switch in it has none for its owner to throw: it is heard from the moment it is taken; and a pop in its owner\'s hands is a pop for everybody', () => {
    const plain = opened(asBuilt('bell-plain'))
    expect(plain.switched).toBe(false)
    tap(plain, OWNER_AT)
    quiet(plain)
    run(plain, 1.2)
    expect(voices(plain)).toContain('buzz')
    expect(voices(plain)).not.toContain('switch-flick')
    const lamp = asBuilt('lamp'), cell = lamp.parts.find((part) => part.kind === 'cell')!
    const bench = opened(lamp)
    expect(bench.switched).toBe(true)
    drag(bench, pad(bench, cell.a), pad(bench, cell.b))
    run(bench, 1)
    quiet(bench)
    tap(bench, OWNER_AT)
    bench.marks = []
    let pops = 0, flicks = 0
    for (let i = 0; i < 60 * 5; i++) { bench.step(1 / 60); pops += bench.marks.filter((mark) => mark.type === 'pop').length; flicks += bench.sounds.filter((sound) => sound.voice === 'switch-flick').length; bench.marks = []; bench.sounds = [] }
    expect(pops).toBe(2)
    expect(flicks).toBe(4)
  })

  it('a gadget with no switch that does not run is laid back with no switch thrown: it does what its circuit does from the moment it is taken until it lies on the mat again', () => {
    const fan = asBuilt('fan-plain')
    const bench = opened(turnPart(fan, fan.parts.findIndex((part) => part.kind === 'motor')))
    expect(bench.switched).toBe(false)
    tap(bench, OWNER_AT)
    quiet(bench)
    const heard: string[] = []
    let sucked = 0
    for (let i = 0; i < 60 * (LENGTH.laidBack + 0.5); i++) {
      bench.step(1 / 60)
      // While it is in its owner's hands it sucks, all the time: nobody switches it off and on.
      if (bench.show.take > 0.9 && bench.sounds.some((sound) => sound.voice === 'whirr-in')) sucked++
      heard.push(...voices(bench))
      bench.sounds = []
    }
    expect(heard).not.toContain('switch-flick')
    expect(sucked).toBeGreaterThanOrEqual(3)
    expect(bench.show.take).toBe(0)
    expect(bench.open).toBe(true)
    expect(bench.stall.finished).toBe(false)
  })

  it('the idle hand\'s move is worked out without solving in a frame that only shows it', () => {
    const bench = opened()
    suggest(bench)
    const before = WORK.solves
    for (let i = 0; i < 120; i++) suggest(bench)
    expect(WORK.solves - before).toBe(0)
  })

  it('a part seated where nothing runs is only heard going down, and a lead across a part that carried nothing does not make it tink, fall or hiccup', () => {
    // The lantern with its link off: nothing runs. A second lamp, a buzzer and a second cell go in, and none of them sounds as if it ran.
    const dead = opened()
    drag(dead, mid(trayPlace(1)), mid2(pad(dead, spare[0]), pad(dead, spare[1])))
    expect(voices(dead)).toEqual(['part-lift', 'part-down'])
    quiet(dead)
    drag(dead, mid(trayPlace(3)), mid2(pad(dead, board.rungs[1][0]), pad(dead, board.rungs[1][1])))
    expect(voices(dead)).toEqual(['part-lift', 'part-down'])
    quiet(dead)
    // A lead across the dark lamp is a clack, with no tink of cooling glass.
    const lamp = dead.live.parts.find((part) => part.kind === 'lamp')!
    drag(dead, pad(dead, lamp.a), pad(dead, lamp.b))
    expect(voices(dead)).not.toContain('lamp-across')
    // On a lantern that runs with two lamps in a row, a lead across one of them makes it tink as it goes dark.
    const live = opened()
    drag(live, mid(trayPlace(1)), mid2(pad(live, linkA), pad(live, linkB)))
    expect(lit(live)).toBe(true)
    expect(voices(live)).toContain('lamp-second')
    quiet(live)
    const own = live.live.parts.find((part) => part.kind === 'lamp')!
    drag(live, pad(live, own.a), pad(live, own.b))
    expect(live.live.parts.some((part) => part.kind === 'cell' && part.popped)).toBe(false)
    expect(voices(live)).toContain('lamp-across')
  })

  it('a second cell is heard by what it does: nose to tail the hum steps up, and side by side it only goes in', () => {
    const lamp = asBuilt('lamp-plain'), plain = boardOf('lamp-plain')
    const tail = opened(removeLead(lamp, 0))
    quiet(tail)
    // In the link's place the way the first cell pushes: the loop closes through two cells.
    const [la, lb] = plain.linkSocket
    drag(tail, mid(trayPlace(0)), mid2(pad(tail, la), pad(tail, lb)))
    const heard = voices(tail)
    expect(tail.running || tail.opposed).toBe(true)
    if (tail.running) expect(heard).not.toContain('part-down')
    // Beside the first, across a spare rung of a lantern that runs: the lamp does not change, and nothing is said of a step up.
    const beside = opened(asBuilt('lamp'))
    quiet(beside)
    drag(beside, mid(trayPlace(0)), mid2(pad(beside, spare[0]), pad(beside, spare[1])))
    expect(voices(beside)).not.toContain('cell-second')
  })

  it('a spoon that lies loose on a short\'s way is marked as one that is seated is, and a whole lead laid on the mat raises its dust', () => {
    const lantern = asBuilt('lamp'), cell = lantern.parts.find((part) => part.kind === 'cell')!
    const place = matCells(lantern)[4]
    const hung: Circuit = { ...lantern, loose: [{ kind: 'odd', what: 'spoon', at: place }], leads: [...lantern.leads, { a: cell.a, b: { loose: 0, end: 0 } }] }
    const bench = opened(hung)
    drag(bench, { x: matAt(place).x + 42, y: matAt(place).y }, pad(bench, cell.b))
    expect(bench.live.parts.some((part) => part.kind === 'cell' && part.popped)).toBe(true)
    expect(bench.hotParts.has(`loose-${place}`)).toBe(true)
    const laid = opened()
    laid.marks = []
    drag(laid, COIL, { x: 720, y: 650 })
    expect(laid.marks.some((mark) => mark.type === 'down')).toBe(true)
  })

  it('the sign, whole, pops its flags with no short when one thing more is hung on it near its cells; and nothing that is a load is marked', () => {
    const sign = asBuilt('sign'), signBoard = boardOf('sign')
    expect(settle(sign).consequences).toEqual([])
    // A lamp lying loose, held by two leads across the rails at the first rung: an eighth thing on two cells.
    const upper = signBoard.rungs[0][0], x = signBoard.pads[upper].x
    const top = signBoard.pads.findIndex((p) => p.x === x && p.y === 0), low = signBoard.pads.findIndex((p) => p.x === x && p.y === signBoard.rows - 1)
    const more: Circuit = { ...sign, loose: [{ kind: 'lamp', blown: false, at: matCells(sign)[0] }], leads: [...sign.leads, { a: top, b: { loose: 0, end: 0 } }, { a: low, b: { loose: 0, end: 1 } }] }
    const settled = settle(more)
    expect(settled.consequences.some((c) => c.type === 'pop')).toBe(true)
    // No one way carried it: every lamp was only doing what a lamp does.
    const before = read(more)
    for (const [i, part] of more.parts.entries()) if (part.kind === 'lamp') expect(Math.abs(before.parts[i])).toBeLessThan(2.4)
    // On the bench the same pop marks no lamp, motor or buzzer: laid on the mat with its last lead clipped by hand.
    const fresh = freshStall(null)
    const bench = new Bench({ ...fresh, sign: { ...more, leads: more.leads.slice(0, -1) }, onMat: 'sign' })
    const lug = biteAt(bench.live, { loose: 0, end: 1 })
    bench.press(lug); bench.move(padAt(bench.live, low)); bench.lift(padAt(bench.live, low), 'end')
    expect(bench.live.parts.some((part) => part.kind === 'cell' && part.popped)).toBe(true)
    for (const key of bench.hotParts.keys()) {
      const part = bench.live.parts.find((p) => bench.keyOf(p) === key)
      expect(part?.kind === 'odd' || part?.kind === 'switch', key).toBe(true)
    }
  })

  it('only a fan\'s blade moves the air: a car\'s wheel and a robot\'s arm turn and blow nothing; and the hum comes up low through a pencil', () => {
    expect(opened(asBuilt('fan-plain')).wind()).toBeGreaterThan(0)
    const car = opened(asBuilt('car'))
    expect(car.running).toBe(true)
    expect(car.wind()).toBe(0)
    expect(opened(asBuilt('robot')).wind()).toBe(0)
    const lead = opened()
    drag(lead, pad(lead, linkA), pad(lead, linkB))
    const full = lead.sounds.find((sound) => sound.voice === 'cell-clip')!.pitch
    const pencil = opened()
    drag(pencil, oddPlace('pencil'), mid2(pad(pencil, linkA), pad(pencil, linkB)))
    const low = pencil.sounds.find((sound) => sound.voice === 'cell-clip')
    expect(low).toBeDefined()
    expect(low!.pitch).toBeLessThan(full - 0.15)
  })

  it('a tap on the flag itself, where it stands beside its cell, sets it back', () => {
    const bench = opened(asBuilt('lamp'))
    const index = bench.live.parts.findIndex((part) => part.kind === 'cell'), cell = bench.live.parts[index]
    drag(bench, pad(bench, cell.a), pad(bench, cell.b))
    expect(bench.live.parts[index]).toMatchObject({ popped: true })
    // Take the lead off again, so that the flag stays down once it is set back.
    bench.press(bootAt(bench.live, bench.live.leads.length - 1, 1, bench.bends()[bench.live.leads.length - 1])); bench.lift({ x: 700, y: 650 }, 'end')
    quiet(bench)
    const flag = flagAt(bench.live, index)
    expect(Math.hypot(flag.x - partMid(bench, 'cell').x, flag.y - partMid(bench, 'cell').y)).toBeGreaterThan(40)
    tap(bench, flag)
    expect(voices(bench)).toContain('flag-reset')
    expect(bench.live.parts[index]).toMatchObject({ popped: false })
  })

  it('the test lamp across a good cell rings as it lights and the cell hums, and nothing of the gadget counts as running', () => {
    const bench = opened()
    const cell = bench.live.parts.find((part) => part.kind === 'cell')!
    drag(bench, probeGrip(bench.live, 0), pad(bench, cell.a))
    quiet(bench)
    drag(bench, probeGrip(bench.live, 1), pad(bench, cell.b))
    expect(level(bench.reading.probe)).toBeGreaterThan(0)
    expect(voices(bench)).toContain('lamp-clip')
    expect(bench.running).toBe(false)
    quiet(bench)
    run(bench, 1.1)
    expect(voices(bench)).toContain('hum')
  })

  it('a switch dragged a finger\'s width and let go is turned round and not thrown as well', () => {
    const bench = opened(asBuilt('lamp'))
    const index = bench.live.parts.findIndex((part) => part.kind === 'switch'), before = bench.live.parts[index]
    expect(lit(bench)).toBe(true)
    const at = partMid(bench, 'switch')
    bench.press(at); bench.move({ x: at.x + 6, y: at.y }); bench.lift({ x: at.x + 5, y: at.y }, 'end')
    const after = bench.live.parts.find((part) => part.kind === 'switch')!
    expect(after).toMatchObject({ a: before.b, b: before.a, down: (before as { down: boolean }).down })
    expect(lit(bench)).toBe(true)
    // A tap is still a flick: the lever throws.
    tap(bench, partMid(bench, 'switch'))
    expect(lit(bench)).toBe(false)
  })

  it('lying loose, a flat cell still bounces twice and a blade no current turns still freewheels', () => {
    const bench = opened()
    const place = matAt(matCells(bench.live)[4])
    drag(bench, mid(trayPlace(2)), place)
    expect(bench.live.loose.map((part) => part.kind)).toEqual(['motor'])
    run(bench, 1)
    tap(bench, place)
    expect(bench.turnedLoose(bench.live.loose[0].at)).toBe(0)
    run(bench, 0.3)
    expect(bench.turnedLoose(bench.live.loose[0].at)).toBeGreaterThan(0.5)
    run(bench, 12)
    expect(bench.turnedLoose(bench.live.loose[0].at)).toBe(0)
    // A flat cell laid loose: one hop at the tap, and a second a sixth of a second later.
    const flat = opened({ ...gapped(), loose: [{ kind: 'cell', flat: true, popped: false, at: matCells(gapped())[4] }] })
    tap(flat, matAt(flat.live.loose[0].at))
    const key = `loose-${flat.live.loose[0].at}`
    let hops = 0, rising = false
    for (let i = 0; i < 60; i++) { const was = flat.kick.get(key)?.v ?? 0; flat.step(1 / 60); const now = flat.kick.get(key)?.v ?? 0; if (now > was + 3 && !rising) hops++; rising = now > was + 3 }
    expect(hops).toBe(1)
    expect(voices(flat)).toContain('cell-flat-flick')
  })

  it('two cells that push against each other creak for as long as they do, however they came to', () => {
    const lamp = asBuilt('lamp-plain'), board = boardOf('lamp-plain')
    // A lantern that arrives with a second cell the wrong way round in place of its link: no act of the child's made them push.
    const bench = opened(placePart(removeLead(lamp, 0), trayPart('cell', board.linkSocket[1], board.linkSocket[0])))
    expect(bench.opposed).toBe(true)
    quiet(bench)
    let creaks = 0
    for (let i = 0; i < 60 * 6; i++) { bench.step(1 / 60); creaks += bench.sounds.filter((sound) => sound.voice === 'cell-nose-to-nose').length; bench.sounds = [] }
    expect(creaks).toBeGreaterThanOrEqual(2)
    expect(creaks).toBeLessThanOrEqual(4)
  })

  it('two cells pushing against each other are known as soon as the circuit changes, and no longer when one is turned', () => {
    const lamp = asBuilt('lamp-plain'), board = boardOf('lamp-plain')
    const second = placePart(removeLead(lamp, 0), trayPart('cell', board.linkSocket[1], board.linkSocket[0]))
    const bench = opened(second)
    expect(bench.running).toBe(false)
    expect(bench.opposed).toBe(true)
    // Found as left: a stall read back with them so has them leaning from the first frame.
    expect(through(bench).opposed).toBe(true)
    const whole = opened(placePart(removeLead(lamp, 0), trayPart('cell', board.linkSocket[0], board.linkSocket[1])))
    expect(whole.opposed).toBe(false)
  })

  it('in its owner\'s hands a gadget is heard for as long as it is on: two buzzers throb, and one that is laid back is heard each time it is tried', () => {
    const bell = asBuilt('bell-plain')
    const two = placePart(bell, trayPart('buzzer', spare[0], spare[1]))
    const bench = opened(two)
    tap(bench, OWNER_AT)
    expect(bench.stall.finished).toBe(true)
    run(bench, 3)
    quiet(bench)
    run(bench, 1.1)
    expect(voices(bench).filter((v) => v === 'buzz').length).toBeGreaterThanOrEqual(4)
    expect(new Set(bench.sounds.filter((sound) => sound.voice === 'buzz').map((sound) => sound.pitch)).size).toBe(2)
    // After a load it is still running in its owner's hands, and still heard.
    const later = through(bench)
    run(later, 1.1)
    expect(voices(later)).toContain('buzz')
    // A fan that sucks does not run: it is tried twice, heard breathy each time, and laid back.
    const fan = asBuilt('fan-plain')
    const sucks = opened(turnPart(fan, fan.parts.findIndex((part) => part.kind === 'motor')))
    tap(sucks, OWNER_AT)
    expect(sucks.stall.finished).toBe(false)
    let on = 0, heard = 0
    for (let i = 0; i < 60 * 5; i++) {
      const was = sucks.show.on
      sucks.step(1 / 60)
      if (was < 0.5 && sucks.show.on >= 0.5) on++
      heard += sucks.sounds.filter((sound) => sound.voice === 'whirr-in').length
    }
    expect(on).toBe(2)
    expect(heard).toBeGreaterThan(0)
    expect(sucks.show).toEqual(atRest())
  })

  it('put away with something in the hand, makes no move the child did not make: the thing goes back where it came from', () => {
    const saved = (bench: Bench) => JSON.stringify(serializeStall(bench.stall))
    // A lead from a pad, held over the other pad of the gap: it does not bite, and the loop stays open.
    const lead = opened()
    lead.press(pad(lead, linkA)); lead.move(pad(lead, linkB))
    const held = saved(lead)
    lead.letGo()
    expect(lead.hand).toBeNull()
    expect(saved(lead)).toBe(held)
    expect(lead.stall.job.circuit.leads).toEqual([{ a: linkA, b: null }])
    expect(lit(lead)).toBe(false)
    // A lead whose first clip was tapped on, waiting for its second tap: the wait is over, and the next touch is its own.
    const armed = opened()
    tap(armed, pad(armed, linkA))
    expect(armed.armed).not.toBeNull()
    armed.letGo()
    expect(armed.armed).toBeNull()
    // A lamp from the tray, held over a free pair of pads: it is not seated.
    const part = opened()
    part.press(mid(trayPlace(1))); part.move(mid2(pad(part, spare[0]), pad(part, spare[1])))
    const before = saved(part)
    part.letGo()
    expect(saved(part)).toBe(before)
    expect(part.live).toEqual(part.circuit)
    // The gadget's own lamp, lifted and held over its own place: it is not turned round, and it is back in the loop.
    const own = opened(asBuilt('lamp'))
    const lamp = own.circuit.parts.find((p) => p.kind === 'lamp')!
    own.press(partMid(own, 'lamp')); own.move({ x: partMid(own, 'lamp').x + 6, y: partMid(own, 'lamp').y + 4 })
    expect(own.hand?.holds).toBe('part')
    own.letGo()
    expect(own.circuit.parts.find((p) => p.kind === 'lamp')).toEqual(lamp)
    expect(lit(own)).toBe(true)
    // The gadget, taken by its lid and held over its owner: it is not handed back, and nothing is judged.
    const gadget = opened(asBuilt('lamp'))
    gadget.press(mid(lidBox(gadget.live))); gadget.move(OWNER_AT)
    expect(gadget.hand?.holds).toBe('gadget')
    gadget.letGo()
    expect(gadget.stall.finished).toBe(false)
    expect(gadget.stall.job.open).toBe(true)
    expect(gadget.scene).toBeNull()
    // A lead that lay loose on the mat, taken up whole and held over a pad: it is back where it lay, and was in the save all the while.
    const whole = opened()
    drag(whole, COIL, { x: 720, y: 650 })
    const lay = saved(whole)
    whole.press(leadEnds(whole.live, 0)[0]); whole.move(pad(whole, linkA))
    expect(whole.hand).toMatchObject({ holds: 'coil', lifted: 0 })
    expect(whole.live.leads).toEqual([])
    expect(saved(whole)).toBe(lay)
    whole.letGo()
    expect(saved(whole)).toBe(lay)
    expect(whole.live.leads).toHaveLength(1)
    // The same for a lead that hung by its only clip, pulled off by that clip.
    const hung = opened()
    drag(hung, pad(hung, linkA), { x: 620, y: 680 })
    run(hung, 2)
    const hanging = saved(hung)
    hung.press(bootAt(hung.live, 0, 0, hung.bends()[0])); hung.move({ x: 600, y: 660 })
    expect(hung.hand).toMatchObject({ holds: 'coil', lifted: 0 })
    hung.letGo()
    expect(saved(hung)).toBe(hanging)
    // A clip of the test lamp, held over a pad: it bites nothing and is back at its own place.
    const probe = opened()
    probe.press(probeGrip(probe.live, 0)); probe.move(pad(probe, linkA))
    probe.letGo()
    expect(probe.stall.job.circuit.probe).toEqual([null, null])
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

describe('a part carried off the board and let go', () => {
  it('stays on the board when let go by a free pair of pads where it has no room: a robot\'s buzzer, a little up and to the right of its place', () => {
    const bench = opened(asBuilt('robot'))
    const before = JSON.stringify(bench.stall.job.circuit), from = partMid(bench, 'buzzer')
    drag(bench, from, { x: from.x + 30, y: from.y - 30 })
    run(bench, 0.5)
    expect(bench.live.parts.filter((p) => p.kind === 'buzzer')).toHaveLength(1)
    expect(bench.live.parts.length + bench.live.loose.length).toBe(asBuilt('robot').parts.length)
    expect(voices(bench)).not.toContain('part-away')
    // It is on the board still, and what is saved holds it: where it was, or across a pair where it has room.
    expect(JSON.parse(JSON.stringify(bench.stall.job.circuit)).parts.some((p: { kind: string }) => p.kind === 'buzzer')).toBe(true)
    expect(before).toContain('buzzer')
  })

  it('is never lost: wherever it is let go outside the tray it is still on the board or on the mat', () => {
    for (const gadget of ['lamp', 'fan', 'bell', 'car', 'robot', 'sign'] as const) {
      const built = asBuilt(gadget)
      for (let index = 0; index < built.parts.length; index++) {
        const start = opened(built)
        const from = start.midOf(index), u = Math.hypot(pad(start, built.parts[index].a).x - pad(start, built.parts[index].b).x, pad(start, built.parts[index].a).y - pad(start, built.parts[index].b).y)
        for (let dx = -2; dx <= 2; dx += 0.5) for (let dy = -2; dy <= 2; dy += 0.5) {
          const to = { x: from.x + dx * u * 0.75, y: from.y + dy * u * 0.75 }
          if (to.x >= TRAY.x && to.x <= TRAY.x + TRAY.w && to.y >= TRAY.y && to.y <= TRAY.y + TRAY.h) continue
          const bench = opened(built)
          drag(bench, from, to)
          run(bench, 0.5)
          const held = bench.live.parts.length + bench.live.loose.length
          expect(held, `${gadget} part ${index} (${built.parts[index].kind}) let go at ${dx},${dy}`).toBe(built.parts.length + built.loose.length)
        }
      }
    }
  })
})

describe('what only looked touchable answers as itself', () => {
  // The stall as it is first seen: a customer holds a gadget out, shut, and no board lies on the mat.
  const shut = () => new Bench(stallWith(gapped()))

  it('with no board open, each part in the tray is flicked where it lies: it sounds as it does on a board, swells, and stays in the tray', () => {
    const bench = shut()
    const before = JSON.stringify(serializeStall(bench.stall))
    TRAY_KINDS.forEach((kind, i) => {
      quiet(bench)
      tap(bench, mid(trayPlace(i)))
      expect(voices(bench), kind).toEqual([kind === 'coil' ? 'lead-flick' : `${kind}-flick`])
      expect(bench.marks, kind).toEqual([])
      expect(bench.hand, kind).toBeNull()
      expect(bench.kickOf(`tray-${i}`), kind).toBe(0)
      bench.step(1 / 60)
      expect(Math.abs(bench.kickOf(`tray-${i}`)), kind).toBeGreaterThan(0)
    })
    // A drag out of the tray takes nothing with it, and nothing of it is saved.
    quiet(bench)
    drag(bench, mid(trayPlace(1)), { x: 600, y: 500 })
    expect(bench.hand).toBeNull()
    expect(JSON.stringify(serializeStall(bench.stall))).toBe(before)
    expect(bench.open).toBe(false)
  })

  it('with no board open, each bench odd sounds as its material and swells where it lies, and the test lamp rings by its glass or by either clip', () => {
    const bench = shut()
    const heard = new Set<string>()
    for (const what of ['spoon', 'key', 'foil', 'pencil', 'rubber', 'stick', 'string'] as const) {
      quiet(bench)
      tap(bench, oddPlace(what))
      expect(voices(bench), what).toEqual([`odd-flick-${what}`])
      heard.add(voices(bench)[0])
      bench.step(1 / 60)
      expect(Math.abs(bench.kickOf(`odd-${what}`)), what).toBeGreaterThan(0)
      expect(bench.hand, what).toBeNull()
    }
    expect(heard.size).toBe(7)
    for (const at of [TEST_LAMP, PROBE_HOME[0], PROBE_HOME[1]]) {
      quiet(bench)
      tap(bench, at)
      expect(voices(bench)).toEqual(['lamp-flick'])
      expect(bench.hand).toBeNull()
    }
    expect(bench.stall.job.circuit.probe).toEqual([null, null])
  })

  it('her practice board rocks and she minds; the toaster throws its slice; the radio finds half a tune', () => {
    const bench = shut()
    tap(bench, mid(PRACTICE))
    expect(voices(bench)).toEqual(['practice-tick'])
    expect(bench.marks).toEqual([{ type: 'hers', what: 'practice', at: mid(PRACTICE) }])
    bench.step(1 / 60)
    expect(Math.abs(bench.kickOf('practice'))).toBeGreaterThan(0)
    quiet(bench)
    tap(bench, mid(TOASTER))
    tap(bench, mid(RADIO))
    expect(voices(bench)).toEqual(['toaster-pop', 'radio-burst'])
    expect(bench.marks).toEqual([{ type: 'shelf', what: 'toaster' }, { type: 'shelf', what: 'radio' }])
  })

  it('each thing on the washing line swings when it is touched and shakes its neighbours, and sounds a little apart from the next', () => {
    const bench = shut()
    const pitches = WASHING.map((item, i) => {
      quiet(bench)
      tap(bench, { x: item.x, y: sag(item.x) + item.drop / 2 })
      expect(voices(bench), item.what).toEqual(['washing-flap'])
      expect(bench.marks, item.what).toEqual([])
      run(bench, 0.15)
      expect(Math.abs(bench.lane.swing[i].x), item.what).toBeGreaterThan(0.1)
      for (let other = 0; other < WASHING.length; other++) if (other !== i) expect(Math.abs(bench.lane.swing[other].x)).toBeLessThan(Math.abs(bench.lane.swing[i].x))
      const pitch = bench.sounds[0]?.pitch
      run(bench, 6)
      expect(Math.abs(bench.lane.swing[i].x), item.what).toBeLessThan(0.02)
      return pitch
    })
    expect(new Set(pitches).size).toBe(WASHING.length)
  })

  it('the pigeon is off at a finger as at a bang, and walks back; whoever passes answers in its own voice where it is', () => {
    const bench = shut()
    const bird = pigeonAt(bench.lane.seconds, bench.lane.scare)
    tap(bench, { x: bird.x, y: bird.y - 14 })
    expect(voices(bench)).toEqual(['pigeon-off'])
    run(bench, 1)
    expect(pigeonAt(bench.lane.seconds, bench.lane.scare).away).toBe(1)
    // Where it stood there is now only the air of the lane.
    quiet(bench)
    tap(bench, { x: bird.x, y: bird.y - 14 })
    expect(voices(bench)).toEqual(['knock-air'])
    run(bench, 7)
    expect(pigeonAt(bench.lane.seconds, bench.lane.scare).away).toBe(0)
    // Each of the three who pass, touched where it is when it is well into view.
    const heard: string[] = []
    for (let n = 0; n < 60 * 120 && heard.length < 3; n++) {
      bench.step(1 / 60)
      const now = passing(bench.lane.seconds)
      if (!now || heard.includes(`passer-${now.who}`)) continue
      const at = passerAt(now.who, now.along, bench.lane.seconds), spot = now.who === 'crates' ? { x: at.x, y: at.y - 120 } : at
      // Where it shows: not behind the washing, and clear of both customers as they are drawn.
      if (bench.lane.hit(spot)?.on !== 'passer' || covers('owner', bench.stall.job.who, spot) || covers('waiting', bench.stall.next.who, spot)) continue
      quiet(bench)
      tap(bench, spot)
      expect(voices(bench), now.who).toEqual([`passer-${now.who}`])
      expect(bench.lane.poked?.who).toBe(now.who)
      heard.push(voices(bench)[0])
      run(bench, 1.5)
      expect(bench.lane.poked).toBeNull()
    }
    expect(heard).toHaveLength(3)
    // Beside the owner's head a finger on the giraffe is on the giraffe; on the owner it is on the owner, giraffe or no giraffe.
    const beside = shut()
    while (passing(beside.lane.seconds)?.who !== 'giraffe' || Math.abs(passerAt('giraffe', passing(beside.lane.seconds)!.along, beside.lane.seconds).x - (OWNER.x + 14)) > 8) beside.step(1 / 60)
    const head = passerAt('giraffe', passing(beside.lane.seconds)!.along, beside.lane.seconds)
    expect(head.x).toBeGreaterThan(OWNER.x)
    expect(covers('owner', beside.stall.job.who, head)).toBe(false)
    quiet(beside)
    tap(beside, head)
    expect(voices(beside)).toEqual(['passer-giraffe'])
    expect(beside.open).toBe(false)
    tap(beside, OWNER_AT)
    expect(beside.open).toBe(true)
    // A pop is a bang: the pigeon is gone again.
    const lamp = opened(asBuilt('lamp')), cell = lamp.live.parts.find((part) => part.kind === 'cell')!
    run(lamp, 8)
    expect(pigeonAt(lamp.lane.seconds, lamp.lane.scare).away).toBe(0)
    drag(lamp, pad(lamp, cell.a), pad(lamp, cell.b))
    expect(lamp.marks.some((mark) => mark.type === 'pop')).toBe(true)
    expect(lamp.lane.scare).toBe(0)
  })

  it('a finger on nothing in particular leaves its print on the mat alone: wood, steel, a wall, the awning and the air each sound as what they are', () => {
    const bench = shut()
    const cases: [P, string][] = [
      [{ x: MAT_BOX.x + 300, y: MAT_BOX.y + 250 }, 'mat-pat'],
      [{ x: 400, y: STAGE.counterBottom + 4 }, 'knock-wood'],
      [{ x: 400, y: (STAGE.counterTop + STAGE.counterBottom) / 2 }, 'knock-steel'],
      [{ x: 470, y: 150 }, 'knock-wall'],
      [{ x: PILLAR_LEFT + 30, y: 100 }, 'knock-wall'],
      [{ x: 860, y: 20 }, 'knock-awning'],
      // The valance hangs in front of the owner: a finger on it over the owner's head is on the canvas.
      [{ x: 700, y: 20 }, 'knock-awning'],
      [{ x: 860, y: 120 }, 'knock-air'],
    ]
    for (const [at, voice] of cases) {
      quiet(bench)
      tap(bench, at)
      expect(voices(bench), voice).toEqual([voice])
      expect(bench.marks.map((mark) => mark.type), voice).toEqual([voice === 'mat-pat' ? 'pat' : 'knock'])
    }
    // Sweep the whole stage: a print is left only on the mat, and every touch is answered with a sound.
    for (let x = 6; x < STAGE.w; x += 23) for (let y = 6; y < STAGE.h; y += 19) {
      const fresh = shut()
      tap(fresh, { x, y })
      expect(fresh.sounds.length, `${x},${y}`).toBeGreaterThan(0)
      if (fresh.marks.some((mark) => mark.type === 'pat')) expect(x >= MAT_BOX.x && x <= MAT_BOX.x + MAT_BOX.w && y >= MAT_BOX.y && y <= MAT_BOX.y + MAT_BOX.h, `${x},${y}`).toBe(true)
    }
    expect(WINDOW_LEFT).toBeLessThan(PILLAR_LEFT)
  })
})
