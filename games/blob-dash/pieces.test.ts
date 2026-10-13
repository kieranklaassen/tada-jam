import { describe, expect, it } from 'vitest'
import { BARE, FRAME, carry, fresh, of, piece, runTo, types } from './drive'
import { LUMP, bodyOf, zipOf } from './body'
import { BLOB, CAST, PIPE, RACK, RING, overRack, rackBox, rackPoint, slotOf, slotPoint } from './layout'
import { KINDS, WAYS, bySlot, isKind, listed, pipeFrom, wayOf, type Kind, type Piece, type Way } from './pieces'
import { HARD_BEATS, PERCH_BEATS, REST, SLIDE, type Toy, type ToyEvent } from './toy'

// The grid of the sheet: six pieces, each met in five ways. The same few
// arrangements bring a blob to beat 3 (or to beat 4 of the ceiling) in each way.

/** The track that brings the blob to the piece in a way, and the beat and surface it is met on. */
function arranged(kind: Kind, way: Way): { toy: Toy; beat: number; ceiling: boolean } {
  switch (way) {
    case 'run': return { toy: fresh(120, [], [piece(kind, 3)]), beat: 3, ceiling: false }
    case 'landed': return { toy: fresh(120, [4], [piece(kind, 3)]), beat: 3, ceiling: false }
    case 'ceiling': return { toy: fresh(120, [], [piece('flip', 1), piece(kind, 4, true)]), beat: 4, ceiling: true }
    case 'twins': return { toy: fresh(120, [], [piece('splitter', 1), piece(kind, 3)]), beat: 3, ceiling: false }
    case 'hushed': return { toy: fresh(120, [], [piece('tunnel', 1), piece(kind, 3)]), beat: 3, ceiling: false }
  }
}

/** Plays up to just before the piece, throws that away, and hands back what the meeting itself raises. */
function met(kind: Kind, way: Way): { toy: Toy; events: ToyEvent[]; beat: number; ceiling: boolean } {
  const { toy, beat, ceiling } = arranged(kind, way)
  runTo(toy, beat - 0.1)
  return { toy, events: runTo(toy, beat + 0.01), beat, ceiling }
}

describe('the grid', () => {
  it('has every one of the six pieces met in every one of the five ways, by the blob, on its beat', () => {
    for (const kind of KINDS) for (const way of WAYS) {
      const { events, beat } = met(kind, way)
      expect(of(events, 'meet')[0], `${kind} ${way}`).toEqual({ type: 'meet', kind, way, beat, second: false })
    }
  })

  it('picks the way by what the blob is: hushed before twins, twins before the ceiling, the ceiling before a landing', () => {
    expect(wayOf({ hushed: true, split: true, ceiling: true, landed: true })).toBe('hushed')
    expect(wayOf({ hushed: false, split: true, ceiling: true, landed: true })).toBe('twins')
    expect(wayOf({ hushed: false, split: false, ceiling: true, landed: true })).toBe('ceiling')
    expect(wayOf({ hushed: false, split: false, ceiling: false, landed: true })).toBe('landed')
    expect(wayOf({ hushed: false, split: false, ceiling: false, landed: false })).toBe('run')
  })

  it('remembers on the piece how it was last met, so the piece is drawn answering in that way', () => {
    for (const kind of KINDS) for (const way of WAYS) {
      const { toy, beat, ceiling } = met(kind, way)
      const hit = toy.hits[slotOf(beat, ceiling)]
      expect(hit.way, `${kind} ${way}`).toBe(way)
      expect(hit.age).toBeLessThan(0.05)
    }
  })

  it('keeps a piece still and plain until a blob meets it', () => {
    const toy = fresh(120, [], KINDS.map((kind, i) => piece(kind, 8 + i)))
    runTo(toy, 2)
    for (const hit of toy.hits) expect(hit.age).toBe(Infinity)
  })
})

describe('the drum', () => {
  it('kicks dust under a run, and sends flecks up under a landing', () => {
    expect(met('drum', 'run').toy.fx.some((fx) => fx.kind === 'dust')).toBe(true)
    expect(met('drum', 'landed').toy.fx.some((fx) => fx.kind === 'flecks')).toBe(true)
  })

  it('is the pigeon\'s: it struts; and it is not the cat\'s: its fur goes up', () => {
    const { toy } = met('drum', 'run')
    expect(toy.cast.pigeon.strut).toBeLessThan(0.05)
    expect(toy.cast.cat.fur).toBeLessThan(0.05)
  })

  it('only bulges its pipe under a hushed blob, and nobody on the wall minds', () => {
    const { toy } = met('drum', 'hushed')
    expect(toy.fx.some((fx) => fx.kind === 'bulge')).toBe(true)
    expect(toy.cast.pigeon.strut).toBe(Infinity)
    expect(toy.cast.cat.fur).toBe(Infinity)
    // The cat likes anything hushed.
    expect(toy.cast.cat.blink).toBeLessThan(0.05)
  })

  it('is hit by each of two, a third of a beat apart', () => {
    const { toy, events } = met('drum', 'twins')
    expect(of(events, 'meet').map((event) => event.second)).toEqual([false])
    const later = runTo(toy, 3.4)
    expect(of(later, 'meet')).toEqual([{ type: 'meet', kind: 'drum', way: 'twins', beat: 3, second: true }])
    expect(toy.hits[3].second).toBe(true)
  })
})

describe('the chime', () => {
  it('trips a running blob up its step, and hums under a landing until the next beat', () => {
    expect(met('chime', 'run').toy.blob.trip).toBeLessThan(0.05)
    const { toy } = met('chime', 'landed')
    expect(toy.blob.trip).toBe(Infinity)
    expect(toy.fx.some((fx) => fx.kind === 'hum')).toBe(true)
    runTo(toy, 3.9)
    expect(toy.fx.some((fx) => fx.kind === 'hum')).toBe(true)
    runTo(toy, 4.1)
    expect(toy.fx.some((fx) => fx.kind === 'hum')).toBe(false)
  })

  it('is the cat\'s: a slow blink, every time', () => {
    for (const way of WAYS) expect(met('chime', way).toy.cast.cat.blink, way).toBeLessThan(0.05)
  })
})

describe('the flip', () => {
  it('throws the blob to the other surface in one beat, each way in its own manner, and in half a beat when landed on', () => {
    const how = { run: 'scoop', landed: 'hard', ceiling: 'drop', twins: 'scoop', hushed: 'pipe' } as const
    for (const way of WAYS) {
      const { toy, beat, ceiling } = met('flip', way)
      const long = way === 'landed' ? 0.5 : 1
      expect(toy.blob.flight, way).toEqual({ from: beat, to: beat + long, how: how[way], kicks: [] })
      expect(toy.blob.ceiling).toBe(ceiling)
      runTo(toy, beat + long - 0.02)
      expect(toy.blob.flight, way).not.toBeNull()
      runTo(toy, beat + long + 0.01)
      expect(toy.blob.flight).toBeNull()
      expect(toy.blob.ceiling).toBe(!ceiling)
    }
  })

  it('hits the far side flat when landed on: the bap, the dust and the flat body come in one step, and it runs on', () => {
    const { toy, beat } = met('flip', 'landed')
    const before = runTo(toy, beat + HARD_BEATS - 0.02)
    expect(of(before, 'after')).toEqual([])
    // The step that takes it across the half.
    let events: ToyEvent[] = []
    while (toy.blob.flight) {
      toy.step(FRAME)
      events = toy.take()
    }
    expect(of(events, 'after')).toEqual([{ type: 'after', what: 'bap', kind: 'flip', beat, second: false }])
    expect(of(events, 'land')).toEqual([])
    // The dust is where it hit: on the rim of the niche, half a beat on.
    const dust = toy.fx.filter((fx) => fx.kind === 'dust' && fx.age === 0)
    expect(dust).toHaveLength(1)
    expect(Math.hypot(dust[0].x - RING.x, dust[0].y - RING.y)).toBeCloseTo(RING.hub, 5)
    expect(toy.blob.ceiling).toBe(true)
    const body = bodyOf(toy, toy.blob)
    expect(body.tall).toBeLessThan(0.6)
    expect(body.wide).toBeGreaterThan(1.2)
    // Flat on the rim of the niche: its underside is on the line.
    expect(Math.hypot(body.x - RING.x, body.y - RING.y) - (BLOB.size / 2) * body.tall).toBeCloseTo(RING.hub, 0)
    // It sticks a moment: a tenth of a beat on it is as flat as it hit and has hardly left the place, while the
    // loop has gone on under it. Then it comes away, and is itself again and at its place by the next beat.
    runTo(toy, beat + HARD_BEATS + 0.1)
    const stuck = bodyOf(toy, toy.blob), length = (2 * Math.PI * RING.hub) / 16
    expect(stuck.tall).toBeLessThan(0.6)
    expect(stuck.face).toBe('flat')
    expect(Math.hypot(stuck.x - body.x, stuck.y - body.y)).toBeLessThan(0.02 * length)
    expect(toy.shown(toy.blob)).toBeLessThan(toy.at(toy.blob) - 0.09)
    let last = toy.shown(toy.blob)
    while (toy.at(toy.blob) < beat + 1 - 0.02) {
      toy.step(FRAME)
      toy.take()
      // It never goes back, and never gets ahead of the loop.
      expect(toy.shown(toy.blob)).toBeGreaterThanOrEqual(last)
      expect(toy.shown(toy.blob)).toBeLessThanOrEqual(toy.at(toy.blob))
      last = toy.shown(toy.blob)
    }
    const after = runTo(toy, beat + 1.02)
    expect(bodyOf(toy, toy.blob).tall).toBeGreaterThan(0.9)
    expect(of(after, 'step').map((event) => event.beat)).toEqual([beat + 1])
    expect(toy.shown(toy.blob)).toBe(toy.at(toy.blob))
  })

  it('does not stick where the harder throw put it when it is launched from that very place: a held tap bounces it straight off', () => {
    const { toy, beat } = met('flip', 'landed')
    runTo(toy, beat + HARD_BEATS - 0.1)
    toy.wallTap(BARE)
    runTo(toy, beat + HARD_BEATS + 0.05)
    expect(toy.blob.air).not.toBeNull()
    expect(toy.shown(toy.blob)).toBe(toy.at(toy.blob))
    // A tap that comes a little late launches it from where it sticks: it is drawn in the air where it was on the line.
    const late = met('flip', 'landed')
    runTo(late.toy, late.beat + HARD_BEATS + 0.1)
    const before = late.toy.shown(late.toy.blob)
    late.toy.wallTap(BARE)
    expect(late.toy.blob.air).not.toBeNull()
    expect(late.toy.shown(late.toy.blob)).toBe(before)
    expect(before).toBeLessThan(late.toy.at(late.toy.blob) - 0.09)
  })

  it('lands the blob on the other surface with a landing of its own, and the loop goes on up there', () => {
    const toy = fresh(120, [], [piece('flip', 3)])
    const events = runTo(toy, 5.02)
    expect(of(events, 'land')).toEqual([{ type: 'land', place: 8, second: false }])
    expect(of(events, 'step').map((event) => event.beat)).toEqual([1, 2, 5])
    // A tap up there leaves its spring on the ceiling.
    runTo(toy, 6.05)
    toy.press(BARE)
    expect([...toy.springs]).toEqual([12 + 32])
  })

  it('plays ping-pong between a flip on the floor and one on the next beat of the ceiling', () => {
    const toy = fresh(120, [], [piece('flip', 3), piece('flip', 4, true)])
    const events = runTo(toy, 5.02)
    expect(of(events, 'meet').map((event) => [event.beat, event.way])).toEqual([[3, 'run'], [4, 'ceiling']])
    expect(toy.blob.ceiling).toBe(false)
    expect(toy.blob.flight).toBeNull()
  })

  it('makes the pigeon\'s eyes go apart when it throws twins', () => {
    expect(met('flip', 'twins').toy.cast.pigeon.apart).toBeLessThan(0.05)
    expect(met('flip', 'run').toy.cast.pigeon.apart).toBe(Infinity)
  })
})

describe('the splitter', () => {
  it('makes one blob two, each way in its own manner, and the twin runs a third of a beat behind', () => {
    const born = { run: 'peel', landed: 'egg', ceiling: 'string', hushed: 'lumps' } as const
    for (const way of ['run', 'landed', 'ceiling', 'hushed'] as const) {
      const { toy, beat, ceiling } = met('splitter', way)
      expect(toy.runners).toHaveLength(2)
      const twin = toy.runners[1]
      expect(twin).toMatchObject({ twin: true, born: born[way], ceiling })
      // It stands where it was made until the blob is a third of a beat ahead.
      expect(toy.at(twin)).toBeCloseTo(beat, 6)
      runTo(toy, beat + 0.2)
      expect(toy.at(twin)).toBeCloseTo(beat, 6)
      runTo(toy, beat + 0.6)
      expect(toy.at(twin)).toBeCloseTo(beat + 0.6 - 1 / 3, 6)
    }
  })

  it('lets go of the string a twin on the ceiling hangs by, a third of a beat on, with a plip', () => {
    const { toy, events } = met('splitter', 'ceiling')
    expect(of(events, 'after')).toEqual([])
    expect(of(runTo(toy, 4.4), 'after')).toEqual([{ type: 'after', what: 'plip', kind: 'splitter', beat: 4, second: true }])
  })

  it('zips twins back into one, and the one is fat for a moment', () => {
    const { toy } = met('splitter', 'twins')
    expect(toy.runners).toHaveLength(1)
    expect(toy.fx.some((fx) => fx.kind === 'zip')).toBe(true)
    const events = runTo(toy, 3.4)
    expect(of(events, 'after')).toEqual([{ type: 'after', what: 'shlup', kind: 'splitter', beat: 0, second: false }])
    expect(toy.blob.fat).toBeLessThan(0.05)
  })

  it('alone on the track is met again a lap later by its own twins: the loop plays single and in canon, lap about', () => {
    const toy = fresh(160, [], [piece('splitter', 2)])
    const count: number[] = []
    for (let lap = 0; lap < 4; lap++) {
      runTo(toy, 16 * lap + 8)
      count.push(toy.runners.length)
    }
    expect(count).toEqual([2, 1, 2, 1])
  })

  it('leaves twins running for good when a flip has taken them to the other surface', () => {
    const toy = fresh(160, [], [piece('splitter', 2), piece('flip', 5)])
    for (let lap = 1; lap <= 3; lap++) {
      runTo(toy, 16 * lap + 8)
      expect(toy.runners).toHaveLength(2)
      expect(toy.runners.every((r) => r.ceiling)).toBe(true)
    }
  })

  it('gives the twin the springs: it jumps where the blob jumped, a third of a beat later', () => {
    const toy = fresh(120, [8], [piece('splitter', 2)])
    const events = runTo(toy, 5.5)
    expect(of(events, 'launch').map((event) => event.second)).toEqual([false, true])
    expect(of(events, 'land').map((event) => event.second)).toEqual([false, true])
  })

  it('is the rat\'s: a double-take', () => {
    expect(met('splitter', 'run').toy.cast.rat.take).toBeLessThan(0.05)
  })
})

describe('the tunnel', () => {
  it('swallows a running blob, which is hushed from there to the next mouth', () => {
    const toy = fresh(120, [], [piece('tunnel', 2), piece('tunnel', 6)])
    runTo(toy, 2.02)
    expect(toy.blob.hushed).toBe(true)
    expect(toy.blob.dive).toBeLessThan(0.05)
    expect(toy.blob.pipe.map((span) => span.beat)).toEqual([2, 3, 4, 5])
    const inside = runTo(toy, 5.9)
    // Not a footfall in there.
    expect(of(inside, 'step')).toEqual([])
    const out = runTo(toy, 6.02)
    expect(of(out, 'meet')).toEqual([{ type: 'meet', kind: 'tunnel', way: 'hushed', beat: 6, second: false }])
    expect(toy.blob.hushed).toBe(false)
    expect(toy.blob.spat).toBeLessThan(0.05)
    expect(toy.fx.filter((fx) => fx.kind === 'puff' || fx.kind === 'pipe')).toHaveLength(2)
    expect(of(runTo(toy, 7.02), 'step')).toEqual([{ type: 'step', beat: 7, second: false }])
  })

  it('holds a blob that came down on it on its rim for a moment, and then gulps it', () => {
    const { toy, events } = met('tunnel', 'landed')
    expect(toy.blob.hushed).toBe(false)
    expect(toy.blob.perch).toBeCloseTo(3 + PERCH_BEATS, 6)
    expect(of(events, 'after')).toEqual([])
    expect(of(runTo(toy, 3 + PERCH_BEATS + 0.02), 'after')).toEqual([{ type: 'after', what: 'gulp', kind: 'tunnel', beat: 3, second: false }])
    expect(toy.blob.hushed).toBe(true)
  })

  it('lets a spring only bump the lump, with a hand over its boing, and a tap in there does the same and lays its spring', () => {
    const toy = fresh(120, [8], [piece('tunnel', 2), piece('tunnel', 9)])
    const events = runTo(toy, 4.02)
    expect(of(events, 'launch')).toEqual([{ type: 'launch', place: 8, by: 'spring', accent: false, muffled: true, second: false }])
    expect(toy.blob.air).toBeNull()
    expect(toy.blob.bump).toBeLessThan(0.05)
    // A tap just past a place in the pipe: the lump bumps there with the same hushed boing, never leaves the line,
    // and the spring is laid like any other, to be heard in the open when the mouths are gone.
    runTo(toy, 6.05)
    toy.take()
    toy.wallTap(BARE)
    const tapped = toy.take()
    expect(of(tapped, 'launch')).toEqual([{ type: 'launch', place: 12, by: 'tap', accent: false, muffled: true, second: false }])
    expect(of(tapped, 'lay')).toEqual([{ type: 'lay', place: 12 }])
    expect(toy.blob.air).toBeNull()
    expect(toy.blob.hushed).toBe(true)
    expect(toy.toSave().springs).toEqual([8, 12])
  })

  it('has every piece in the pipe met by the lump', () => {
    const toy = fresh(120, [], [piece('tunnel', 1), piece('drum', 2), piece('chime', 3), piece('wall', 4), piece('tunnel', 6)])
    const events = runTo(toy, 6.02)
    expect(of(events, 'meet').map((event) => [event.kind, event.way])).toEqual([['tunnel', 'run'], ['drum', 'hushed'], ['chime', 'hushed'], ['wall', 'hushed'], ['tunnel', 'hushed']])
    // A wall in a pipe only dents it: the lump goes on.
    expect(toy.blob.stuck).toBeNull()
  })

  it('carries its pipe across with a flip inside it, and comes out on the other surface', () => {
    const toy = fresh(120, [], [piece('tunnel', 1), piece('flip', 3), piece('tunnel', 6, true)])
    runTo(toy, 1.02)
    expect(toy.blob.pipe.map((span) => [span.beat, span.ceiling, span.cross])).toEqual([[1, false, false], [2, false, false], [3, false, true], [4, true, false], [5, true, false]])
    const events = runTo(toy, 6.02)
    expect(of(events, 'land')).toEqual([])
    expect(toy.blob.hushed).toBe(false)
    expect(toy.blob.ceiling).toBe(true)
  })

  it('with no second mouth keeps the blob hushed the whole way round, back to the mouth it went in by', () => {
    const toy = fresh(160, [], [piece('tunnel', 2)])
    runTo(toy, 2.02)
    expect(toy.blob.pipe).toHaveLength(16)
    runTo(toy, 17.9)
    expect(toy.blob.hushed).toBe(true)
    runTo(toy, 18.02)
    expect(toy.blob.hushed).toBe(false)
  })

  it('gets the pipe the track now makes when a piece is moved while the blob is inside', () => {
    const toy = fresh(120, [], [piece('tunnel', 1), piece('tunnel', 9)])
    runTo(toy, 2.5)
    expect(toy.blob.pipe).toHaveLength(8)
    carry(toy, 'tunnel', 5)
    expect(toy.blob.pipe.at(-1)!.beat).toBe(4)
    runTo(toy, 5.02)
    expect(toy.blob.hushed).toBe(false)
  })

  /** A finger lifts the piece on a beat and holds it over bare wall. */
  const lift = (toy: Toy, beat: number, ceiling = false) => {
    const from = slotPoint(slotOf(beat, ceiling))
    toy.press(from)
    toy.drag(from, { x: 130, y: 300 })
    return from
  }
  /** A lump is never bare: whenever a blob is hushed, the span it is in is part of its pipe. */
  const piped = (toy: Toy) => toy.runners.every((r) => !r.hushed || r.flight !== null || r.pipe.some((span) => span.ceiling === r.ceiling && span.beat === ((Math.floor(toy.at(r) + 1e-6) % 16) + 16) % 16))

  it('spits the blob out where it is when a mouth of its pipe is lifted, in that frame: a pop, a puff, loud again, and the pipe fades', () => {
    for (const end of [1, 9]) {
      const toy = fresh(120, [], [piece('tunnel', 1), piece('tunnel', 9)])
      runTo(toy, 4.5)
      expect(toy.blob.hushed).toBe(true)
      toy.take()
      lift(toy, end)
      const events = toy.take()
      expect(of(events, 'after'), `mouth ${end}`).toEqual([{ type: 'after', what: 'spit', kind: 'tunnel', beat: 4, second: false }])
      expect(toy.blob.hushed).toBe(false)
      expect(toy.blob.spat).toBe(0)
      expect(toy.blob.pipe).toEqual([])
      expect(toy.fx.filter((fx) => fx.age === 0).map((fx) => fx.kind).sort()).toEqual(['pipe', 'puff'])
      // It is drawn on the line, as a blob, from the next frame on, and what it meets is loud.
      toy.step(FRAME)
      expect(bodyOf(toy, toy.blob).lump).toBe(false)
      // Set back down, the mouth does not take it in again from behind: it runs on, loud.
      toy.endDrag(false)
      expect(toy.blob.hushed).toBe(false)
      expect(of(runTo(toy, 8.5), 'step').length).toBeGreaterThan(0)
    }
  })

  it('never leaves a lump bare: lifted, set back, cancelled or tapped, a piece of the pipe changes the pipe in that frame', () => {
    // A flip in the pipe is lifted while the lump is before it: the pipe no longer changes sides, at once.
    const toy = fresh(120, [], [piece('tunnel', 1), piece('flip', 5), piece('tunnel', 10, true), piece('tunnel', 12)])
    runTo(toy, 3.5)
    expect(toy.blob.pipe.some((span) => span.cross)).toBe(true)
    lift(toy, 5)
    expect(toy.blob.pipe.some((span) => span.cross)).toBe(false)
    expect(toy.blob.pipe.at(-1)!.beat).toBe(11)
    expect(piped(toy)).toBe(true)
    // The finger is taken away: the flip is back, and so is the pipe across it, in that frame.
    toy.endDrag(false)
    expect(toy.blob.pipe.some((span) => span.cross)).toBe(true)
    expect(toy.blob.pipe.at(-1)).toMatchObject({ beat: 9, ceiling: true })
    // Lifted and set straight back on its own beat, and lifted and let go as a tap: the same.
    const from = lift(toy, 5)
    expect(toy.blob.pipe.some((span) => span.cross)).toBe(false)
    toy.drag({ x: 130, y: 300 }, from)
    toy.endDrag(true)
    expect(toy.blob.pipe.some((span) => span.cross)).toBe(true)
    toy.press(from)
    expect(toy.blob.pipe.some((span) => span.cross)).toBe(false)
    toy.tap()
    expect(toy.blob.pipe.some((span) => span.cross)).toBe(true)
    // And through a visit with a hand that never stops, no lump is ever outside its pipe.
    for (let i = 0; i < 60 * 20; i++) {
      if (i % 37 === 5) lift(toy, [1, 5, 12, 10][(i / 37) % 4 | 0], (i / 37) % 4 >= 3)
      if (i % 37 === 20) toy.endDrag(i % 2 === 0)
      toy.step(FRAME)
      toy.take()
      expect(piped(toy), `frame ${i}`).toBe(true)
    }
  })

  it('zips two lumps into one inside the pipe: the twin stays a lump between the pipe\'s walls all the way, and its shlup is hushed', () => {
    // One splitter in a pipe: the lump is made two on one lap, and the two meet it again on the next.
    const toy = fresh(120, [], [piece('tunnel', 1), piece('splitter', 3), piece('tunnel', 12)])
    runTo(toy, 16 + 3 + 0.01)
    expect(toy.runners).toHaveLength(1)
    expect(toy.blob.hushed).toBe(true)
    const zip = toy.fx.find((fx) => fx.kind === 'zip')!
    expect(zip.lump).toBe(true)
    let frames = 0
    const events: ToyEvent[] = []
    while (toy.fx.includes(zip)) {
      const twin = zipOf(zip, bodyOf(toy, toy.blob)), lift = RING.floor - Math.hypot(twin.x - RING.x, twin.y - RING.y), half = (BLOB.size * twin.tall) / 2
      expect(twin.lump, `frame ${frames}`).toBe(true)
      // No wider and no taller than a lump, and wholly between the line and the pipe's roof.
      expect(twin.wide).toBeLessThanOrEqual(LUMP.wide + 1e-9)
      expect(twin.tall).toBeLessThanOrEqual(LUMP.tall + 1e-9)
      expect(lift - half, `frame ${frames}`).toBeGreaterThan(0)
      expect(lift + half, `frame ${frames}`).toBeLessThan(PIPE.roof)
      expect(piped(toy)).toBe(true)
      toy.step(FRAME)
      events.push(...toy.take())
      frames += 1
    }
    expect(frames).toBeGreaterThan(5)
    expect(of(events, 'after')).toEqual([{ type: 'after', what: 'mlp', kind: 'splitter', beat: 0, second: false }])
    // The one lump is fatter for a beat, along the pipe and no taller than it, and then a lump like any other.
    const fat = bodyOf(toy, toy.blob)
    expect(fat.lump).toBe(true)
    expect(fat.wide).toBeGreaterThan(LUMP.wide * 1.25)
    expect(fat.tall).toBeCloseTo(LUMP.tall, 6)
    runTo(toy, toy.pos + 1.05)
    expect(toy.blob.hushed).toBe(true)
    expect(bodyOf(toy, toy.blob).wide).toBeCloseTo(LUMP.wide, 6)
    // Out on the line the same meeting is drawn and heard as a blob's.
    const { toy: open } = met('splitter', 'twins')
    expect(open.fx.find((fx) => fx.kind === 'zip')!.lump).toBe(false)
    expect(of(runTo(open, 3.4), 'after').map((event) => event.what)).toEqual(['shlup'])
  })

  it('takes a twin that is being zipped in out of the pipe with the blob, when a mouth is lifted: no lump is left on the bare line', () => {
    const toy = fresh(120, [], [piece('tunnel', 1), piece('splitter', 3), piece('tunnel', 12)])
    runTo(toy, 16 + 3 + 0.1)
    const zip = toy.fx.find((fx) => fx.kind === 'zip')!
    expect(zip.lump).toBe(true)
    toy.take()
    lift(toy, 12)
    expect(toy.blob.hushed).toBe(false)
    expect(zip.lump).toBe(false)
    expect(zipOf(zip, bodyOf(toy, toy.blob)).lump).toBe(false)
    expect(of(toy.take(), 'after').map((event) => event.what)).toEqual(['spit'])
    // And the shlup that ends it is loud, like the blob.
    expect(of(runTo(toy, 19.5), 'after').map((event) => event.what)).toEqual(['shlup'])
  })

  it('spits a lump out in the frame a mouth is lifted while it changes sides: where it is, loud again, and it flies on and lands as a thrown blob', () => {
    for (const [beat, ceiling] of [[1, false], [10, true]] as const) {
      const toy = fresh(120, [], [piece('tunnel', 1), piece('flip', 5), piece('tunnel', 10, true)])
      runTo(toy, 5.4)
      expect(toy.blob.flight).toMatchObject({ how: 'pipe' })
      expect(toy.blob.hushed).toBe(true)
      toy.take()
      const before = bodyOf(toy, toy.blob)
      lift(toy, beat, ceiling)
      // In that frame, not when it is across: the pop, the puff, the pipe fading, and a blob where the lump was.
      expect(of(toy.take(), 'after'), `mouth ${beat}`).toEqual([{ type: 'after', what: 'spit', kind: 'tunnel', beat: 5, second: false }])
      expect(toy.blob.hushed).toBe(false)
      expect(toy.blob.pipe).toEqual([])
      expect(toy.blob.flight).toMatchObject({ how: 'spat', from: 5, to: 6 })
      expect(toy.fx.filter((fx) => fx.age === 0).map((fx) => fx.kind).sort()).toEqual(['pipe', 'puff'])
      let last = bodyOf(toy, toy.blob)
      expect(last.lump).toBe(false)
      expect(Math.hypot(last.x - before.x, last.y - before.y)).toBeLessThan(1e-6)
      const puff = toy.fx.find((fx) => fx.kind === 'puff')!
      expect(Math.hypot(puff.x - before.x, puff.y - before.y)).toBeLessThan(1e-6)
      // It is in the air like any thrown blob: a tap kicks it.
      toy.wallTap(BARE)
      expect(of(toy.take(), 'touch').map((event) => event.answer)).toEqual(['kick'])
      // It goes on across without a jump in where it is drawn, and comes down loud on the far side.
      const events: ToyEvent[] = []
      while (toy.pos < 6.3) {
        toy.step(FRAME)
        events.push(...toy.take())
        const now = bodyOf(toy, toy.blob)
        expect(Math.hypot(now.x - last.x, now.y - last.y), `at ${toy.pos}`).toBeLessThan(16)
        expect(now.lump).toBe(false)
        last = now
      }
      expect(toy.blob.ceiling).toBe(true)
      expect(toy.blob.hushed).toBe(false)
      expect(of(events, 'land')).toHaveLength(1)
      expect(of(events, 'after')).toEqual([])
    }
  })

  it('keeps the pipe behind the lump when a piece is lifted or set: only what is ahead changes, and what is taken away fades', () => {
    const toy = fresh(120, [], [piece('tunnel', 1), piece('drum', 2), piece('flip', 5), piece('tunnel', 10, true), piece('tunnel', 12)])
    runTo(toy, 3.5)
    const whole = toy.blob.pipe
    expect(whole.map((span) => span.beat)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const fading = () => toy.fx.filter((fx) => fx.kind === 'pipe' && fx.age === 0).map((fx) => fx.spans!.map((span) => `${span.beat}${span.ceiling ? ' up' : ''}${span.cross ? ' across' : ''}`))
    // A piece that is no part of the pipe: nothing of the pipe changes, and nothing fades.
    lift(toy, 2)
    expect(toy.blob.pipe).toEqual(whole)
    expect(fading()).toEqual([])
    toy.endDrag(false)
    expect(toy.blob.pipe).toEqual(whole)
    // The flip ahead is lifted: the pipe still starts at the mouth the lump went in by, goes on along the floor, and
    // the part that crossed and ran the ceiling fades off the wall.
    lift(toy, 5)
    expect(toy.blob.pipe.map((span) => span.beat)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(toy.blob.pipe.every((span) => !span.ceiling && !span.cross)).toBe(true)
    expect(fading()).toEqual([['5 across', '6 up', '7 up', '8 up', '9 up']])
    toy.step(FRAME)
    // Put back, the floor ahead of the flip fades in its turn, and the tail is still there.
    toy.endDrag(false)
    expect(toy.blob.pipe).toEqual(whole)
    expect(fading()).toEqual([['5', '6', '7', '8', '9', '10', '11']])
    // Twins in one pipe lose the same spans once.
    const two = fresh(120, [], [piece('tunnel', 1), piece('splitter', 2), piece('flip', 6), piece('tunnel', 10, true), piece('tunnel', 12)])
    runTo(two, 3.5)
    expect(two.runners).toHaveLength(2)
    two.take()
    lift(two, 6)
    expect(two.fx.filter((fx) => fx.kind === 'pipe' && fx.age === 0)).toHaveLength(1)
    for (const r of two.runners) expect(r.pipe[0].beat).toBe(1)
  })

  it('lets a blob that sits on the rim of a mouth down onto the line when the mouth is lifted from under it', () => {
    const toy = fresh(120, [2], [piece('tunnel', 2)])
    runTo(toy, 2 + PERCH_BEATS / 2)
    expect(toy.blob.perch).toBeGreaterThan(toy.pos)
    lift(toy, 2)
    expect(toy.blob.perch).toBe(-1)
    const events = runTo(toy, 3)
    expect(of(events, 'after')).toEqual([])
    expect(toy.blob.hushed).toBe(false)
  })

  it('is not the rat\'s: it lifts a cup of its headphones', () => {
    expect(met('tunnel', 'run').toy.cast.rat.hush).toBeLessThan(0.05)
  })
})

describe('the wall', () => {
  it('flattens a running blob against it on the beat, peels it off with a squelch at the half, and has it running by the next beat', () => {
    const { toy, events } = met('wall', 'run')
    expect(toy.blob.stuck).toMatchObject({ beat: 3, how: 'slap' })
    expect(of(events, 'step')).toEqual([])
    const peel = runTo(toy, 3.52)
    expect(of(peel, 'after')).toEqual([{ type: 'after', what: 'squelch', kind: 'wall', beat: 3, second: false }])
    expect(toy.blob.stuck).not.toBeNull()
    const on = runTo(toy, 4.02)
    expect(toy.blob.stuck).toBeNull()
    expect(of(on, 'step')).toEqual([{ type: 'step', beat: 4, second: false }])
  })

  it('drapes a blob that came down on it over its top like a towel, without a slap', () => {
    const { toy, events } = met('wall', 'landed')
    expect(toy.blob.stuck).toMatchObject({ how: 'towel' })
    expect(toy.cast.pigeon.duck).toBe(Infinity)
    expect(of(events, 'land')).toEqual([])
    expect(of(runTo(toy, 3.52), 'after')).toEqual([])
  })

  it('hangs a blob on the ceiling from it, and lets go with a drip that falls the wrong way', () => {
    const { toy } = met('wall', 'ceiling')
    expect(toy.blob.stuck).toMatchObject({ how: 'hang' })
    expect(of(runTo(toy, 4.52), 'after')).toEqual([{ type: 'after', what: 'plink', kind: 'wall', beat: 4, second: false }])
    const drip = toy.fx.find((fx) => fx.kind === 'drip')!
    const wall = slotPoint(slotOf(4, true))
    // Away from the middle of the ring is up, for a thing on the ceiling.
    const out = (drip.x - RING.x) * (wall.x - RING.x) + (drip.y - RING.y) * (wall.y - RING.y)
    expect(out).toBeGreaterThan(0)
    expect(drip.vx * (RING.x - wall.x) + drip.vy * (RING.y - wall.y)).toBeGreaterThan(0)
  })

  it('takes the twin on the blob\'s back', () => {
    const { toy } = met('wall', 'twins')
    runTo(toy, 3.35)
    expect(toy.runners[1].stuck).toMatchObject({ how: 'slap', second: true })
    expect(toy.blob.stuck).toMatchObject({ second: false })
  })

  it('is hit from the air when it stands half a beat after a spring: a bigger splat, and the blob slides down its face', () => {
    const toy = fresh(120, [5], [piece('wall', 3)])
    runTo(toy, 2.9)
    const events = runTo(toy, 3.02)
    expect(of(events, 'meet')).toEqual([{ type: 'meet', kind: 'wall', way: 'splat', beat: 3, second: false }])
    expect(toy.blob.air).toBeNull()
    expect(toy.blob.stuck).toMatchObject({ how: 'splat' })
    expect(toy.blob.stuck!.lift).toBeGreaterThan(0.9)
    expect(of(runTo(toy, 3.52), 'after')).toEqual([{ type: 'after', what: 'squelch', kind: 'wall', beat: 3, second: false }])
  })

  it('is not the pigeon\'s: it ducks and loses a feather; and the cat\'s fur goes up', () => {
    const { toy } = met('wall', 'run')
    expect(toy.cast.pigeon.duck).toBeLessThan(0.05)
    expect(toy.cast.cat.fur).toBeLessThan(0.05)
    expect(toy.fx.filter((fx) => fx.kind === 'feather')).toHaveLength(1)
  })

  it('keeps a print of the blob at the dial\'s fastest, which is gone within a lap, and none at any other tempo', () => {
    const fast = fresh(160, [], [piece('wall', 3)])
    runTo(fast, 3.02)
    expect(fast.fx.some((fx) => fx.kind === 'print')).toBe(true)
    runTo(fast, 3 + 15.5)
    expect(fast.fx.some((fx) => fx.kind === 'print')).toBe(false)
    const slower = fresh(150, [], [piece('wall', 3)])
    runTo(slower, 3.02)
    expect(slower.fx.some((fx) => fx.kind === 'print')).toBe(false)
  })

  it('never stops the loop: the blob is on its way again a beat later, lap after lap', () => {
    const toy = fresh(120, [], KINDS.map(() => piece('wall', 0)).concat([piece('wall', 4), piece('wall', 5), piece('wall', 6)]))
    runTo(toy, 40)
    expect(toy.pos).toBeGreaterThanOrEqual(40 - 1e-9)
    expect(toy.blob.stuck === null || toy.blob.stuck.beat > 38).toBe(true)
  })
})

describe('a spring and a piece on one beat', () => {
  it('has the piece met first and the spring fire after it', () => {
    const toy = fresh(120, [6], [piece('drum', 3)])
    const events = runTo(toy, 3.02).filter((event) => event.type === 'meet' || event.type === 'launch')
    expect(types(events)).toEqual(['meet', 'launch'])
    expect(toy.blob.air).toMatchObject({ from: 3 })
  })

  it('does not fire the spring when the piece took the blob off the line', () => {
    for (const kind of ['flip', 'wall'] as const) {
      const toy = fresh(120, [6], [piece(kind, 3)])
      expect(of(runTo(toy, 3.02), 'launch'), kind).toEqual([])
      expect(toy.blob.air).toBeNull()
    }
  })
})

describe('the rack and the hand', () => {
  it('gives a piece to a finger, which sets it on a beat with a sound, and the rack still has one of the kind', () => {
    const toy = fresh()
    const from = rackPoint(0), to = slotPoint(slotOf(5, false))
    expect(toy.press(from)).toBe('rack')
    expect(toy.take()).toEqual([{ type: 'piece', kind: 'drum', act: 'lift' }])
    expect(toy.hand).toMatchObject({ kind: 'drum', from: null })
    expect(toy.blob.air).toBeNull()
    toy.drag(from, to)
    expect(toy.aimed()).toBe(5)
    toy.endDrag(true)
    expect(toy.take()).toEqual([{ type: 'piece', kind: 'drum', act: 'set' }])
    expect(toy.toSave().pieces).toEqual([{ kind: 'drum', beat: 5, ceiling: false }])
    expect(toy.changed).toBe(1)
    expect(toy.press(from)).toBe('rack')
  })

  it('sets a piece on the ceiling when it is let go nearer the niche than the line', () => {
    const toy = fresh()
    carry(toy, 'chime', 8, true)
    expect(toy.toSave().pieces).toEqual([{ kind: 'chime', beat: 8, ceiling: true }])
  })

  it('lifts a piece off the track under a finger without a jump, and a blob no longer meets it while it is in the hand', () => {
    const toy = fresh(120, [], [piece('wall', 3)])
    runTo(toy, 2.5)
    const at = slotPoint(3)
    expect(toy.press(at)).toBe('piece')
    expect(types(toy.take())).toEqual(['piece'])
    expect(toy.pieceIn(3)).toBeUndefined()
    expect(of(runTo(toy, 3.2), 'meet')).toEqual([])
    // Still where it came from, for a save.
    expect(toy.toSave().pieces).toHaveLength(1)
  })

  it('moves a piece from one beat to another', () => {
    const toy = fresh(120, [], [piece('wall', 3)])
    const at = slotPoint(3), to = slotPoint(slotOf(10, true))
    toy.press(at)
    toy.drag(at, to)
    toy.endDrag(true)
    expect(toy.toSave().pieces).toEqual([{ kind: 'wall', beat: 10, ceiling: true }])
  })

  it('rocks a piece that is tapped, on the track or in the rack, and changes nothing', () => {
    const toy = fresh(120, [], [piece('chime', 3)])
    toy.press(slotPoint(3))
    toy.tap()
    toy.press(rackPoint(4))
    toy.tap()
    expect(of(toy.take(), 'piece').map((event) => [event.kind, event.act])).toEqual([['chime', 'lift'], ['chime', 'tap'], ['tunnel', 'lift'], ['tunnel', 'tap']])
    expect(toy.set[3]).toBe(0)
    expect(toy.rack[4]).toBe(0)
    expect(toy.changed).toBe(0)
    expect(toy.hand).toBeNull()
  })

  it('puts a piece taken away with the finger still on it back where it came from, and nothing has moved', () => {
    const toy = fresh(120, [], [piece('wall', 3)])
    const at = slotPoint(3)
    toy.press(at)
    toy.drag(at, { x: 300, y: 60 })
    toy.take()
    toy.endDrag(false)
    expect(toy.take()).toEqual([])
    expect(toy.toSave().pieces).toEqual([{ kind: 'wall', beat: 3, ceiling: false }])
    expect(toy.changed).toBe(0)
  })
})

describe('a piece let go in the wrong place', () => {
  /** Lets a drum from the rack go at a point, and plays two seconds. */
  const letGoAt = (toy: Toy, at: { x: number; y: number }, kind: Kind = 'drum') => {
    const from = rackPoint(KINDS.indexOf(kind))
    toy.press(from)
    toy.drag(from, at)
    toy.endDrag(true)
    const events = toy.take()
    for (let i = 0; i < 120; i++) {
      toy.step(FRAME)
      events.push(...toy.take())
    }
    return of(events, 'piece')
  }

  it('off the track sticks to the wall, slides down it leaving a smear, and clonks back into the rack', () => {
    const toy = fresh(60)
    const from = rackPoint(0)
    toy.press(from)
    toy.drag(from, { x: 130, y: 300 })
    toy.endDrag(true)
    expect(of(toy.take(), 'piece').map((event) => event.act)).toEqual(['lift', 'stick'])
    expect(toy.fx.map((fx) => fx.kind).sort()).toEqual(['slide', 'smear'])
    const acts: string[] = []
    let home: { x: number; y: number } | null = null
    for (let i = 0; i < 120; i++) {
      toy.step(FRAME)
      acts.push(...of(toy.take(), 'piece').map((event) => event.act))
      home ??= toy.fx.find((fx) => fx.kind === 'home') ?? null
    }
    expect(acts).toEqual(['clonk'])
    expect(home).toMatchObject({ x: 130, y: 300 + SLIDE })
    expect(toy.pieces.size).toBe(0)
  })

  it('over the rack or its plank is put back at once: it settles into its own place with a small sound, and nothing sticks, slides or smears', () => {
    const drum = KINDS.indexOf('drum'), box = rackBox(KINDS.indexOf('wall'))
    const plank = { x: RACK.first + RACK.pitch / 2, y: RACK.y + 6 }
    const spots = [rackPoint(drum), rackPoint(KINDS.indexOf('tunnel')), { x: box.x + box.w - 1, y: box.y + 2 }, plank, { x: RACK.first - RACK.over + 2, y: RACK.y - 30 }]
    for (const at of spots) {
      expect(overRack(at)).toBe(true)
      // From the track, and from the rack itself.
      for (const fromTrack of [true, false]) {
        const toy = fresh(60, [], fromTrack ? [piece('drum', 5)] : [])
        const from = fromTrack ? slotPoint(5) : rackPoint(drum)
        toy.press(from)
        toy.drag(from, { x: 500, y: 400 })
        toy.drag({ x: 500, y: 400 }, at)
        toy.endDrag(true)
        expect(of(toy.take(), 'piece').map((event) => event.act)).toEqual(['lift'])
        expect(toy.fx.map((fx) => fx.kind)).toEqual(['home'])
        expect(toy.pieces.size).toBe(0)
        // It is in its place, rocking, within a fifth of a second. Its one sound is the knock, in the frame it
        // lands and the rack rocks: not when the finger let go.
        const acts: string[] = []
        while (toy.fx.length > 0) {
          toy.step(FRAME)
          const now = of(toy.take(), 'piece').map((event) => event.act)
          if (now.length > 0) {
            expect(toy.fx).toEqual([])
            expect(toy.rack[drum]).toBe(0)
          }
          acts.push(...now)
        }
        expect(acts).toEqual(['rest'])
        expect(toy.seconds).toBeLessThan(0.2)
        expect(REST).toBeLessThan(0.2)
      }
    }
    // Away from the rack the wall keeps its joke: just above the reach of the tallest piece it sticks.
    expect(overRack({ x: RACK.first, y: RACK.y - 120 })).toBe(false)
    expect(overRack({ x: 130, y: 300 })).toBe(false)
  })

  it('on the top strip of the rack\'s flip or splitter is over the rack, not on the beat at the foot of the ring: it is put back, and no beat is marked for it', () => {
    for (const kind of ['flip', 'splitter'] as const) {
      const box = rackBox(KINDS.indexOf(kind))
      for (const at of [{ x: box.x + box.w / 2, y: box.y + 2 }, { x: box.x + 4, y: box.y + 1 }, { x: box.x + box.w - 4, y: box.y + 6 }]) {
        // The track's margin reaches here: it is nearer the ring's line than a piece may be let go and still be set.
        expect(Math.hypot(at.x - RING.x, at.y - RING.y)).toBeLessThan(RING.floor + RING.line + 30)
        for (const fromTrack of [true, false]) {
          const toy = fresh(60, [], fromTrack ? [piece('drum', 5)] : [])
          const from = fromTrack ? slotPoint(5) : rackPoint(0)
          toy.press(from)
          toy.drag(from, at)
          expect(toy.aimed()).toBeNull()
          toy.endDrag(true)
          expect(of(toy.take(), 'piece').map((event) => event.act)).toEqual(['lift'])
          expect(toy.pieces.size).toBe(0)
          expect(toy.fx.map((fx) => fx.kind)).toEqual(['home'])
          expect(of(runTo(toy, 0.5), 'piece').map((event) => event.act)).toEqual(['rest'])
        }
      }
    }
  })

  it('on a beat that is taken pops the old piece out with a pok and sends it home', () => {
    const toy = fresh(60, [], [piece('wall', 5)])
    const acts = letGoAt(toy, slotPoint(5))
    expect(acts.map((event) => [event.kind, event.act])).toEqual([['drum', 'lift'], ['drum', 'set'], ['wall', 'pok']])
    expect(toy.toSave().pieces).toEqual([{ kind: 'drum', beat: 5, ceiling: false }])
    expect(toy.rack[KINDS.indexOf('wall')]).toBeLessThan(2)
  })

  it('on the pigeon is a hat until its next bob, and then clonks home', () => {
    const toy = fresh(60)
    runTo(toy, 0.55)
    const from = rackPoint(0)
    toy.press(from)
    toy.drag(from, { x: RING.x, y: RING.y })
    toy.endDrag(true)
    expect(of(toy.take(), 'piece').map((event) => event.act)).toEqual(['lift', 'hat'])
    expect(toy.cast.pigeon.hat).toBe('drum')
    runTo(toy, 0.95)
    expect(toy.cast.pigeon.hat).toBe('drum')
    runTo(toy, 1.02)
    expect(toy.cast.pigeon.hat).toBeNull()
    expect(of(runTo(toy, 1.6), 'piece').map((event) => event.act)).toEqual(['clonk'])
  })

  it('on the rat is sniffed, and then flicked home with its tail', () => {
    const toy = fresh(60)
    const box = CAST.rat.box
    const acts = letGoAt(toy, { x: box.x + box.w / 2, y: box.y + box.h / 2 })
    expect(acts.map((event) => event.act)).toEqual(['lift', 'sniff', 'flick', 'clonk'])
  })

  it('on the cat is batted off the ledge, and the cat does not open an eye', () => {
    const toy = fresh(60)
    const box = CAST.cat.box
    const acts = letGoAt(toy, { x: box.x + box.w / 2, y: box.y + box.h / 2 })
    expect(acts.map((event) => event.act)).toEqual(['lift', 'bat', 'clonk'])
    expect(toy.cast.cat.bat).toBeLessThan(2.1)
    expect(toy.cast.cat.poke).toBe(Infinity)
  })

  it('never loses a piece: the rack always has one of each kind, and the track only what was set on it', () => {
    const toy = fresh(60, [], [piece('wall', 5)])
    const at = slotPoint(5)
    toy.press(at)
    toy.drag(at, { x: 130, y: 300 })
    toy.endDrag(true)
    expect(toy.toSave().pieces).toEqual([])
    expect(toy.changed).toBe(1)
    for (let i = 0; i < KINDS.length; i++) expect(toy.press(rackPoint(i))).toBe('rack'), toy.letGo()
  })
})

describe('a meeting moves as the cell it sounds as', () => {
  /** A track on which the blob comes down on a piece from a jump: on the floor, on the ceiling, and as twins. */
  const landing = (kind: Kind, how: 'floor' | 'ceiling' | 'twins') => {
    // On the ceiling: a flip takes the blob up at 1, a spring on the ceiling's third beat throws it onto the fourth.
    const toy = how === 'ceiling' ? fresh(120, [32 + 6], [piece('flip', 1), piece(kind, 4, true)]) : how === 'twins' ? fresh(120, [10], [piece('splitter', 2), piece(kind, 6)]) : fresh(120, [10], [piece(kind, 6)])
    const beat = how === 'ceiling' ? 4 : 6
    runTo(toy, beat - 0.05)
    toy.take()
    const meets = of(runTo(toy, beat + 0.02), 'meet').filter((event) => event.kind === kind && !event.second)
    return { toy, way: meets[0]?.way }
  }

  it('throws, tears and flattens a blob that lands on the ceiling as the ceiling\'s cell says, not as a landing on the floor', () => {
    const flip = landing('flip', 'ceiling')
    expect(flip.way).toBe('ceiling')
    expect(flip.toy.blob.flight).toMatchObject({ how: 'drop' })
    const splitter = landing('splitter', 'ceiling')
    expect(splitter.way).toBe('ceiling')
    expect(splitter.toy.runners[1]).toMatchObject({ born: 'string' })
    const wall = landing('wall', 'ceiling')
    expect(wall.way).toBe('ceiling')
    expect(wall.toy.blob.stuck).toMatchObject({ how: 'hang' })
  })

  it('throws and flattens twins that land on a piece as the twins\' cell says', () => {
    const flip = landing('flip', 'twins')
    expect(flip.way).toBe('twins')
    expect(flip.toy.blob.flight).toMatchObject({ how: 'scoop' })
    const wall = landing('wall', 'twins')
    expect(wall.way).toBe('twins')
    expect(wall.toy.blob.stuck).toMatchObject({ how: 'slap' })
  })

  it('keeps the landing\'s own motions for a lone blob that lands on the floor', () => {
    expect(landing('flip', 'floor')).toMatchObject({ way: 'landed' })
    expect(landing('flip', 'floor').toy.blob.flight).toMatchObject({ how: 'hard' })
    expect(landing('splitter', 'floor').toy.runners[1]).toMatchObject({ born: 'egg' })
    expect(landing('wall', 'floor').toy.blob.stuck).toMatchObject({ how: 'towel' })
  })
})

describe('the list of pieces', () => {
  it('keeps one piece to a slot, the later of two, and drops whatever is not a piece on a place a piece can stand', () => {
    const rough = [piece('drum', 3), piece('wall', 3), piece('chime', 3, true), piece('chime', 4, true), { kind: 'gong', beat: 2, ceiling: false }, piece('flip', 16), piece('flip', -1), piece('flip', 1.5)] as Piece[]
    expect(listed(bySlot(rough))).toEqual([piece('wall', 3), piece('chime', 4, true)])
    expect(isKind('drum')).toBe(true)
    expect(isKind('gong')).toBe(false)
  })

  it('walks a pipe from its mouth to the next mouth', () => {
    const track = bySlot([piece('tunnel', 2), piece('tunnel', 5)])
    expect(pipeFrom((slot) => track.get(slot), 2, false).map((span) => span.beat)).toEqual([2, 3, 4])
  })
})
