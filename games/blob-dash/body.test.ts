import { describe, expect, it } from 'vitest'
import { bodyOf, ghostAt, outlineOf, riseAt, springHeight, type Body } from './body'
import { BARE, FRAME, fresh, piece, runTo } from './drive'
import { BEAT_LENGTH, BLOB, PIECE, RING, SPRING, WALL, WALL_STEPS, onTrack, uprightOn } from './layout'
import { KINDS, type Kind, type Piece } from './pieces'
import { makeRng } from './rng'
import type { Toy } from './toy'

// Nothing passes through anything. The blob is a round thing as wide and as
// tall as it is squashed; these tests hold its outline to the two lines of
// the course and to the things that stand on them, through visits that reach
// every state.

const TOLERANCE = 2.5
const radius = (p: { x: number; y: number }) => Math.hypot(p.x - RING.x, p.y - RING.y)

/** How far a body is through the floor's line or the niche's rim, in stage units: 0 when it is clear of both. */
function through(body: Body): number {
  let worst = 0
  for (const p of outlineOf(body)) worst = Math.max(worst, radius(p) - RING.floor, RING.hub - radius(p))
  return worst
}

/** A point of the wall in the frame of a slot: how far along the way the blob runs from the beat, and how far off the surface. */
function inFrame(p: { x: number; y: number }, beat: number, ceiling: boolean): { along: number; lift: number } {
  const a = Math.PI / 2 - (beat / 16) * Math.PI * 2
  const dx = p.x - RING.x, dy = p.y - RING.y
  const out = dx * Math.cos(a) + dy * Math.sin(a), along = dx * Math.sin(a) - dy * Math.cos(a)
  return { along, lift: ceiling ? out - RING.hub : RING.floor - out }
}

/** How deep a body's outline is inside the box of a low piece standing in a slot. */
function into(body: Body, beat: number, ceiling: boolean, top: number, halfWidth: number): number {
  let worst = 0
  for (const p of outlineOf(body, 48)) {
    const f = inFrame(p, beat, ceiling)
    if (Math.abs(f.along) < halfWidth && f.lift < top && f.lift > -20) worst = Math.max(worst, Math.min(top - f.lift, halfWidth - Math.abs(f.along)))
  }
  return worst
}

/** How deep a body's outline is inside the upright of a wall standing in a slot: between its two faces and below its top. */
function intoWall(body: Body, beat: number, ceiling: boolean): number {
  let worst = 0
  for (const p of outlineOf(body, 48)) {
    const f = inFrame(p, beat, ceiling)
    if (Math.abs(f.along - WALL.ahead) < WALL.thick / 2 && f.lift < WALL.height && f.lift > 0) worst = Math.max(worst, Math.min(WALL.thick / 2 - Math.abs(f.along - WALL.ahead), WALL.height - f.lift))
  }
  return worst
}

function visit(pieces: Piece[], springs: number[], seed: number, seconds: number, tempo: number, each: (toy: Toy) => void, taps = 0.06): void {
  const toy = fresh(tempo, springs, pieces, seed)
  const rng = makeRng(seed)
  for (let i = 0; i < 60 * seconds; i++) {
    if (rng.next() < taps) toy.press({ x: BARE.x + rng.next() * 20, y: BARE.y })
    toy.step(FRAME)
    each(toy)
  }
}

/** A track that takes the blob through every piece on both surfaces, and one with a flip inside a pipe. */
const ALL: Piece[] = [piece('wall', 0), piece('drum', 1), piece('chime', 2), piece('wall', 4), piece('splitter', 6), piece('flip', 8), piece('drum', 10, true), piece('wall', 12, true), piece('tunnel', 14, true), piece('tunnel', 0, true), piece('flip', 2, true)]
const PIPED: Piece[] = [piece('tunnel', 2), piece('drum', 3), piece('flip', 4), piece('wall', 6, true), piece('tunnel', 8, true), piece('flip', 10, true), piece('flip', 13), piece('flip', 14, true)]

describe('the blob and the two lines of the course', () => {
  it('never goes through the floor or the rim of the niche, in any state a visit reaches', () => {
    const states = new Set<string>()
    for (const [seed, tempo, pieces, taps] of [[1, 60, ALL, 0.06], [2, 120, ALL, 0.06], [3, 160, ALL, 0], [4, 120, PIPED, 0.06], [5, 120, PIPED, 0]] as const) {
      visit(pieces, [5, 9, 18, 40, 50], seed, 80, tempo, (toy) => {
        for (const r of toy.runners) {
          const body = bodyOf(toy, r)
          states.add(r.flight ? `flight ${r.flight.how}` : r.stuck ? `stuck ${r.stuck.how}` : r.hushed ? 'hushed' : r.air ? 'air' : r.ceiling ? 'ceiling' : 'run')
          expect(Number.isFinite(body.x + body.y + body.turn + body.wide + body.tall)).toBe(true)
          expect(through(body), `${[...states].at(-1)} at ${toy.pos}`).toBeLessThan(TOLERANCE)
        }
      }, taps)
    }
    for (const state of ['run', 'air', 'ceiling', 'hushed', 'stuck slap', 'stuck towel', 'stuck hang', 'flight scoop', 'flight hard', 'flight drop', 'flight pipe']) expect([...states]).toContain(state)
  })

  it('stands on its surface when it runs: its feet on the line, its head towards the other one', () => {
    const toy = fresh()
    runTo(toy, 2.25)
    const body = bodyOf(toy, toy.blob), foot = onTrack(toy.pos, 0, false)
    expect(Math.hypot(body.x - foot.x, body.y - foot.y)).toBeCloseTo((BLOB.size / 2) * body.tall, 0)
    expect(body.turn).toBeCloseTo(uprightOn(toy.pos, false), 6)
    expect(body.mirror).toBe(false)
  })

  it('is upside down on the ceiling, mirrored so that its face still looks the way it runs', () => {
    const toy = fresh(120, [], [piece('flip', 1)])
    runTo(toy, 3.25)
    const body = bodyOf(toy, toy.blob)
    expect(body.mirror).toBe(true)
    expect(radius(body)).toBeCloseTo(RING.hub + (BLOB.size / 2) * body.tall, 0)
  })

  it('stretches off the line: the squash the launch gives is drawn in the air, and an accent stretches it further', () => {
    const tallest = (springs: number[], accent: boolean): { tall: number; wide: number; through: number } => {
      const toy = fresh(120, springs)
      runTo(toy, accent ? 2.02 : 1.9)
      toy.press(BARE)
      let best = { tall: 0, wide: 1, through: 0 }
      while (toy.pos < 2.6) {
        toy.step(FRAME)
        if (!toy.blob.air) continue
        const body = bodyOf(toy, toy.blob)
        expect(body.face).toBe('air')
        if (body.tall > best.tall) best = { tall: body.tall, wide: body.wide, through: best.through }
        best.through = Math.max(best.through, through(body))
      }
      return best
    }
    // A plain jump, tapped a little early: taller than it is at rest, and thinner.
    const plain = tallest([], false)
    expect(plain.tall).toBeGreaterThan(1.1)
    expect(plain.wide).toBeLessThan(0.97)
    // A tap just after the spring there has fired: the same jump, stretched a good deal further.
    const accented = tallest([4], true)
    expect(accented.tall).toBeGreaterThan(plain.tall + 0.08)
    // Stretched and turning, it is still off the line.
    expect(plain.through).toBeLessThan(TOLERANCE)
    expect(accented.through).toBeLessThan(TOLERANCE)
    // The stretch is spent by the top of the jump, so it clears what it cleared before.
    const toy = fresh(120)
    runTo(toy, 1.9)
    toy.press(BARE)
    runTo(toy, 2.5)
    expect(bodyOf(toy, toy.blob).tall).toBeCloseTo(1, 1)
  })

  it('reads the squash in every state in which the model sets it: on the line and in the air', () => {
    const read = (toy: Toy): boolean => {
      let seen = false
      const r = toy.blob, watched = new Proxy(r, { get: (target, key) => { if (key === 'squash') seen = true; return Reflect.get(target, key) } })
      bodyOf(toy, watched)
      return seen
    }
    const running = fresh(120)
    runTo(running, 1.3)
    expect(read(running)).toBe(true)
    const jumping = fresh(120)
    runTo(jumping, 1.9)
    jumping.press(BARE)
    runTo(jumping, 2.2)
    expect(jumping.blob.air).not.toBeNull()
    expect(read(jumping)).toBe(true)
  })

  it('wears a face for each pose', () => {
    const toy = fresh(120, [], [piece('wall', 6)])
    runTo(toy, 1.2)
    expect(bodyOf(toy, toy.blob).face).toBe('run')
    runTo(toy, 1.75)
    toy.press(BARE)
    expect(bodyOf(toy, toy.blob).face).toBe('crouch')
    runTo(toy, 2.4)
    expect(bodyOf(toy, toy.blob).face).toBe('air')
    runTo(toy, 6.2)
    expect(bodyOf(toy, toy.blob).face).toBe('flat')
  })
})

describe('the blob and what stands on the line', () => {
  it('rolls over a pad, a step and a blade: it is never inside one', () => {
    for (const kind of ['drum', 'chime', 'splitter'] as const) for (const ceiling of [false, true]) {
      const pieces = ceiling ? [piece('flip', 1), piece(kind, 6, true)] : [piece(kind, 6)]
      for (const springs of [[], [12 + (ceiling ? 32 : 0)], [11 + (ceiling ? 32 : 0)]]) {
        visit(pieces, springs, 3, 10, 120, (toy) => {
          const top = PIECE.height + (springs[0] === 12 + (ceiling ? 32 : 0) ? SPRING.pressed : 0)
          for (const r of toy.runners) expect(into(bodyOf(toy, r), 6, ceiling, top, PIECE.width / 2), `${kind} ${ceiling} ${springs} at ${toy.pos}`).toBeLessThan(TOLERANCE)
        }, 0)
      }
    }
  })

  it('leaves its trail where it went: a ghost stands on top of the piece the blob was rolling or flying over, never in it', () => {
    const toy = fresh(120, [8, 21], [piece('drum', 2), piece('chime', 6), piece('splitter', 9), piece('flip', 12), piece('drum', 14, true), piece('chime', 2, true)])
    let left = 0, over = 0
    for (let i = 0; i < 60 * 20; i++) {
      const before = toy.ghosts.at(-1)
      toy.step(FRAME)
      toy.take()
      const ghost = toy.ghosts.at(-1)
      if (!ghost || ghost === before) continue
      left += 1
      // Just left, it is where the blob is drawn, give or take the blob's own squash.
      const at = ghostAt(toy, ghost), body = bodyOf(toy, toy.blob)
      expect(Math.hypot(at.x - body.x, at.y - body.y), `ghost at ${ghost.beats}`).toBeLessThan(10)
      if (riseAt(toy, ghost.beats, ghost.ceiling) > PIECE.height / 2) over += 1
    }
    expect(left).toBeGreaterThan(60)
    // And some of them were left right over a piece.
    expect(over).toBeGreaterThan(4)
  })

  it('is on top of a piece it is spat out beside, from the frame it is out: still the shape of the pipe, and never in the piece', () => {
    for (const [kind, beat] of [['drum', 3], ['chime', 4], ['splitter', 6]] as const) for (const lag of [-0.3, -0.1, 0, 0.15, 0.3]) {
      const toy = fresh(120, [], [piece('tunnel', 1), piece(kind, beat), piece('tunnel', 9)], 5)
      runTo(toy, beat + lag)
      expect(toy.blob.hushed).toBe(true)
      // A mouth of its pipe is lifted while the lump is passing the piece.
      const mouth = onTrack(9, PIECE.height / 2, false)
      toy.press(mouth)
      toy.drag(mouth, { x: 130, y: 300 })
      expect(toy.blob.hushed).toBe(false)
      for (let i = 0; i < 24; i++) {
        const body = bodyOf(toy, toy.blob)
        expect(body.lump).toBe(false)
        expect(into(body, beat, false, PIECE.height, PIECE.width / 2), `${kind}, ${lag}, frame ${i}`).toBeLessThan(TOLERANCE)
        expect(through(body), `${kind}, ${lag}, frame ${i}`).toBeLessThan(TOLERANCE)
        toy.step(FRAME)
      }
    }
  })

  it('needs no rise where there is nothing to roll over, and the whole height of a piece when it is right over one', () => {
    const toy = fresh(120, [], [piece('drum', 6)])
    expect(riseAt(toy, 3, false)).toBe(0)
    expect(riseAt(toy, 6, false)).toBe(PIECE.height)
    expect(riseAt(toy, 6, true)).toBe(0)
    expect(riseAt(toy, 5.4, false)).toBeGreaterThan(0)
    expect(riseAt(toy, 5.4, false)).toBeLessThan(PIECE.height)
    expect(riseAt(toy, 5, false)).toBe(0)
  })

  it('clears every low piece and every spring at the top of a jump from a half', () => {
    for (const kind of KINDS.filter((kind) => kind !== 'wall')) {
      const toy = fresh(120, [11], [piece(kind, 6)])
      runTo(toy, 5.6)
      while (toy.blob.air) {
        expect(into(bodyOf(toy, toy.blob), 6, false, PIECE.height, PIECE.width / 2), `${kind} at ${toy.pos}`).toBeLessThan(TOLERANCE)
        toy.step(FRAME)
      }
    }
    expect(BLOB.jump).toBeGreaterThan(PIECE.height + SPRING.pressed)
    expect(BLOB.jump).toBeGreaterThan(SPRING.height)
    expect(BLOB.jump).toBeLessThan(WALL.height)
  })

  it('has its front at a wall\'s face when it gets there, and is never through the wall', () => {
    for (const ceiling of [false, true]) {
      const pieces = ceiling ? [piece('flip', 1), piece('wall', 6, true)] : [piece('wall', 6)]
      // Run into, and come down on from a jump off the beat before it.
      for (const springs of [[], [10 + (ceiling ? 32 : 0)]]) visit(pieces, springs, 2, 12, 120, (toy) => {
        expect(intoWall(bodyOf(toy, toy.blob), 6, ceiling), `${ceiling} at ${toy.pos}`).toBeLessThan(TOLERANCE)
      }, 0)
    }
  })

  it('is thrown by a flip onto what stands on the far side, never into it: every piece, both surfaces, every kind of throw', () => {
    // Where the thing stands, how the blob is thrown at it, and whether a spring is pressed under it.
    const throws: [string, (kind: Kind) => Piece[], number[], number, boolean][] = [
      ['a scoop to the ceiling', (kind) => [piece('flip', 5), piece(kind, 6, true)], [], 6, true],
      ['a scoop onto a piece on a spring', (kind) => [piece('flip', 5), piece(kind, 6, true)], [12 + 32], 6, true],
      ['a drop to the floor', (kind) => [piece('flip', 1), piece('flip', 4, true), piece(kind, 5)], [], 5, false],
      ['a drop onto a piece on a spring', (kind) => [piece('flip', 1), piece('flip', 4, true), piece(kind, 5)], [10], 5, false],
      ['the harder throw, a thing just ahead', (kind) => [piece('flip', 5), piece(kind, 6, true)], [8], 6, true],
      ['the harder throw, a thing just behind', (kind) => [piece('flip', 4), piece(kind, 4, true)], [6], 4, true],
      ['twins in canon', (kind) => [piece('splitter', 1), piece('flip', 5), piece(kind, 6, true)], [], 6, true],
      ['twins dropping', (kind) => [piece('flip', 1), piece('splitter', 2, true), piece('flip', 4, true), piece(kind, 5)], [], 5, false],
    ]
    for (const kind of ['drum', 'chime', 'splitter', 'wall'] as const) for (const [name, pieces, springs, beat, ceiling] of throws) {
      const under = springs.includes(beat * 2 + (ceiling ? 32 : 0)) ? SPRING.pressed : 0
      let flights = 0
      visit(pieces(kind), springs, 4, 10, 100, (toy) => {
        for (const r of toy.runners) {
          const body = bodyOf(toy, r)
          if (r.flight) flights += 1
          const deep = kind === 'wall' ? intoWall(body, beat, ceiling) : into(body, beat, ceiling, PIECE.height + under, PIECE.width / 2)
          expect(deep, `${kind}, ${name}, at ${toy.pos}${r.flight ? ', thrown' : ''}`).toBeLessThan(TOLERANCE)
        }
      }, 0)
      expect(flights, `${kind}, ${name}`).toBeGreaterThan(0)
    }
  })

  it('comes down the way the wall will be met: over the top alone on the floor, in front of it on the ceiling and as twins', () => {
    const landing = (pieces: Piece[], springs: number[], ceiling: boolean, twins: boolean) => {
      const toy = fresh(120, springs, pieces)
      let before: Body | null = null, last: Body | null = null, how = ''
      for (let i = 0; i < 60 * 8 && !how; i++) {
        toy.step(FRAME)
        const r = toy.blob
        if (r.stuck && r.stuck.beat === 6 && r.ceiling === ceiling && toy.split === twins) {
          how = r.stuck.how
          last = bodyOf(toy, r)
        } else before = bodyOf(toy, r)
      }
      return { how, before: before!, last: last!, step: Math.hypot(last!.x - before!.x, last!.y - before!.y) }
    }
    // A slap spreads the body up the wall's face in two frames, sixteen units in the first, the same as when it is
    // run into; a landing adds nothing to that.
    const floor = landing([piece('wall', 6)], [10], false, false)
    expect(floor.how).toBe('towel')
    expect(inFrame(floor.before, 6, false).along).toBeGreaterThan(WALL.ahead - 12)
    expect(floor.step).toBeLessThan(18)
    const ceiling = landing([piece('flip', 1), piece('wall', 6, true)], [10 + 32], true, false)
    expect(ceiling.how).toBe('hang')
    expect(inFrame(ceiling.before, 6, true).along).toBeLessThan(0)
    expect(ceiling.before.wide).toBeLessThan(0.9)
    expect(ceiling.step).toBeLessThan(18)
    const twins = landing([piece('splitter', 4), piece('wall', 6)], [10], false, true)
    expect(twins.how).toBe('slap')
    expect(inFrame(twins.before, 6, false).along).toBeLessThan(0)
    expect(twins.before.wide).toBeLessThan(0.9)
    expect(twins.step).toBeLessThan(18)
  })

  it('presses a spring as it comes over it, and the spring is never taller than the room under the blob', () => {
    const toy = fresh(120, [12])
    expect(springHeight(toy, 12)).toBe(SPRING.height)
    runTo(toy, 5.95)
    expect(springHeight(toy, 12)).toBe(SPRING.pressed)
    runTo(toy, 6.5)
    // The blob is at the top of its jump, half a beat on: the spring has all its height back.
    expect(springHeight(toy, 12)).toBe(SPRING.height)
    // Under a piece it is pressed for good.
    const under = fresh(120, [12], [piece('drum', 6)])
    expect(springHeight(under, 12)).toBe(SPRING.pressed)
  })

  it('keeps the places of each surface far enough apart: a piece to a beat on the floor, and to every second beat on the ceiling', () => {
    // On the floor a piece and the spring on the half beside it both fit in a beat.
    expect(BEAT_LENGTH.floor).toBeGreaterThan(PIECE.width + SPRING.width)
    // On the ceiling a wall's stub, which stands ahead of its beat, ends before the next place's piece begins.
    expect(BEAT_LENGTH.ceiling * 2 - PIECE.width / 2).toBeGreaterThan(WALL.ahead + WALL.thick / 2 + WALL_STEPS)
    // Springs on a beat and on the half beside it do not touch on the floor.
    expect(BEAT_LENGTH.floor / 2).toBeGreaterThan(SPRING.width)
  })

  it('leaves room between the two surfaces: a jump on one clears whatever stands on the other', () => {
    const between = RING.floor - RING.hub
    expect(BLOB.size + BLOB.jump + WALL.height).toBeLessThanOrEqual(between)
    expect(BLOB.size + PIECE.height + SPRING.pressed + WALL.height).toBeLessThanOrEqual(between)
  })
})
