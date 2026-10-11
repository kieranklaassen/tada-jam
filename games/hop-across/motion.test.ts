import { describe, expect, it } from 'vitest'
import { MOVER_KINDS } from './board'
import { DEPTH, FAMILY, HOP_SECONDS, MARK_HOPS, PEEL_AFTER, PEEL_LENGTH, ROLL_SECONDS, SWELL_SECONDS, TRAIN_SECONDS, WORLD_AT, blinking, blown, breath, earTrail, gaze, hopArc, hopDelay, landSquash, leafLift, nosed, overShell, peel, roll, scurry, settle, shakeDry, shoved, shunted, slideOn, spotLift, swell, trainRun, vault, waddle, windmill, yawn, type Arc, type Roll, type Squash, type Swell, riderSway, lookBehind, logLanded, rollUp, ROLL_UP_SECONDS, SPIT_TURNS, shadowRow, dusting, DUST_SECONDS } from './motion'

const arc: Arc = { along: 0, lift: 0, tip: 0, stretch: 1 }
const squash: Squash = { wide: 1, tall: 1, lean: 0 }
const rolled: Roll = { along: 0, pitch: 0, bob: 0, turn: 0 }
const WHO = [0, 1, 2, 3]
/** A curve sampled at a few moments, as one string to compare. */
const LONG = 1e6
const sample = (fn: (t: number) => number): string => [0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map((t) => fn(t).toFixed(3)).join(' ')

describe('a hop', () => {
  it('starts where the pawn stands and ends one square on, on the ground at both ends', () => {
    for (const who of WHO) {
      expect(hopArc(who, 0, arc)).toMatchObject({ along: 0, lift: 0 })
      const end = hopArc(who, 1, arc)
      expect(end.along).toBeCloseTo(1)
      expect(end.lift).toBeCloseTo(0)
      expect(hopArc(who, 0.5, arc).lift).toBeGreaterThan(0.2)
      expect(spotLift(who, 0)).toBe(0)
      expect(spotLift(who, 1)).toBeCloseTo(0)
    }
  })

  it('never goes backwards on its way', () => {
    for (const who of WHO) {
      let last = 0
      for (let t = 0; t <= 1.0001; t += 0.02) {
        const along = hopArc(who, t, arc).along
        expect(along).toBeGreaterThanOrEqual(last - 1e-9)
        last = along
      }
    }
  })

  it('is answered when the finger lands: the rabbit leaves the ground at once, and is down before a child could tap again', () => {
    expect(hopDelay(0)).toBe(0)
    expect(HOP_SECONDS[0]).toBeLessThanOrEqual(0.2)
    expect(WORLD_AT).toBe(HOP_SECONDS[0])
  })

  it('ripples down the line: every small one leaves after the rabbit and all are down within half a second', () => {
    for (const who of [1, 2, 3]) {
      expect(hopDelay(who)).toBeGreaterThan(0)
      expect(hopDelay(who) + HOP_SECONDS[who]).toBeLessThan(0.5)
    }
  })
})

describe('every one of the family moves like itself', () => {
  it('shares no hop: length, delay, height and way along all differ between any two', () => {
    for (const a of WHO) for (const b of WHO) {
      if (a >= b) continue
      expect(FAMILY[a].hop).not.toBe(FAMILY[b].hop)
      expect(FAMILY[a].late).not.toBe(FAMILY[b].late)
      expect(sample((t) => hopArc(a, t, arc).lift)).not.toBe(sample((t) => hopArc(b, t, arc).lift))
      expect(sample((t) => hopArc(a, t, arc).along)).not.toBe(sample((t) => hopArc(b, t, arc).along))
    }
  })

  it('shares no landing, no ears, no breath and no blink', () => {
    for (const a of WHO) for (const b of WHO) {
      if (a >= b) continue
      expect(sample((t) => landSquash(a, t * 0.5, squash).tall)).not.toBe(sample((t) => landSquash(b, t * 0.5, squash).tall))
      expect(sample((t) => earTrail(a, 1, t * 0.5))).not.toBe(sample((t) => earTrail(b, 1, t * 0.5)))
      expect(sample((t) => breath(a, t * 5))).not.toBe(sample((t) => breath(b, t * 5)))
      expect(FAMILY[a].blinkEvery).not.toBe(FAMILY[b].blinkEvery)
    }
  })

  it('squashes on landing and rings back to rest, and only the wobbly one teeters', () => {
    for (const who of WHO) {
      const hit = landSquash(who, 0, squash)
      expect(hit.tall).toBeLessThan(0.85)
      expect(hit.wide).toBeGreaterThan(1.1)
      const rest = landSquash(who, 3, squash)
      expect(rest.tall).toBeCloseTo(1, 2)
      expect(rest.wide).toBeCloseTo(1, 2)
      expect(Math.abs(rest.lean)).toBeLessThan(0.01)
    }
    expect(Math.abs(landSquash(3, 0.15, squash).lean)).toBeGreaterThan(0.2)
    for (const who of [0, 1, 2]) expect(Math.abs(landSquash(who, 0.15, squash).lean)).toBeLessThan(0.05)
  })

  it('blinks briefly, each at its own moments', () => {
    for (const who of WHO) {
      let shut = 0
      for (let time = 0; time < 60; time += 0.05) if (blinking(who, time)) shut++
      expect(shut).toBeGreaterThan(5)
      expect(shut).toBeLessThan(1200 * 0.15)
    }
    let together = 0
    for (let time = 0; time < 60; time += 0.05) if (WHO.every((who) => blinking(who, time))) together++
    expect(together).toBe(0)
  })
})

describe('a flat pawn peels itself up', () => {
  it('starts flat, stretches past upright and settles, whoever it is', () => {
    for (const who of WHO) {
      expect(peel(0, who)).toBe(1)
      expect(peel(1, who)).toBeCloseTo(0)
      let lowest = 1
      for (let t = 0; t <= 1; t += 0.02) lowest = Math.min(lowest, peel(t, who))
      expect(lowest).toBeLessThan(-0.05)
      expect(PEEL_LENGTH[who]).toBeLessThan(1)
      // It is up again before a child would think it hurt: well inside a second and a half of the wheel.
      expect(PEEL_AFTER[who] + PEEL_LENGTH[who]).toBeLessThan(1.6)
    }
  })

  it('is each one\'s own joke: no two share the wait, the length or the way up, and the wobbly one slips back once', () => {
    expect(new Set(PEEL_AFTER).size).toBe(4)
    expect(new Set(PEEL_LENGTH).size).toBe(4)
    expect(new Set(WHO.map((who) => sample((t) => peel(t, who)))).size).toBe(4)
    // The eager one is up first and the dozy one last.
    expect(PEEL_AFTER[1] + PEEL_LENGTH[1]).toBe(Math.min(...WHO.map((who) => PEEL_AFTER[who] + PEEL_LENGTH[who])))
    expect(PEEL_AFTER[2] + PEEL_LENGTH[2]).toBe(Math.max(...WHO.map((who) => PEEL_AFTER[who] + PEEL_LENGTH[who])))
    expect(peel(0.4, 3)).toBeGreaterThan(peel(0.3, 3))
  })
})

describe('every mover takes its step in its own way', () => {
  it('ends its step exactly one step on', () => {
    for (const kind of MOVER_KINDS) {
      expect(roll(kind, 0, rolled).along).toBeCloseTo(0)
      expect(roll(kind, 1, rolled).along).toBeCloseTo(1)
      expect(ROLL_SECONDS[kind]).toBeLessThan(0.6)
    }
  })

  it('shares no curve: the car overshoots and nods, the lorry never overshoots, the log drifts evenly and turns', () => {
    for (const a of MOVER_KINDS) for (const b of MOVER_KINDS) {
      if (a >= b) continue
      expect(sample((t) => roll(a, t, rolled).along)).not.toBe(sample((t) => roll(b, t, rolled).along))
      expect(sample((t) => settle(a, t * 0.4))).not.toBe(sample((t) => settle(b, t * 0.4)))
      expect(ROLL_SECONDS[a]).not.toBe(ROLL_SECONDS[b])
    }
    let carMost = 0, lorryMost = 0
    for (let t = 0; t <= 1; t += 0.01) {
      carMost = Math.max(carMost, roll('car', t, rolled).along)
      lorryMost = Math.max(lorryMost, roll('lorry', t, rolled).along)
    }
    expect(carMost).toBeGreaterThan(1.03)
    expect(lorryMost).toBeLessThanOrEqual(1 + 1e-9)
    expect(roll('log', 1, rolled).turn).toBeCloseTo(0.25)
    for (const kind of MOVER_KINDS) expect(Math.abs(settle(kind, 5))).toBeLessThan(0.001)
  })
})

describe('the turtle, the train and what the train shoves', () => {
  it('lies deeper at each count of a turtle, and under at the last', () => {
    expect(DEPTH).toEqual([...DEPTH].sort((a, b) => a - b))
    expect(DEPTH[0]).toBe(0)
    expect(DEPTH[DEPTH.length - 1]).toBe(1)
  })

  it('runs the train from one arch to the other without slowing, in less than half a second', () => {
    expect(trainRun(0)).toBe(0)
    expect(trainRun(1)).toBeCloseTo(1)
    let last = 0, lastGain = 0
    for (let t = 0.1; t <= 1.001; t += 0.1) {
      const gain = trainRun(t) - last
      expect(gain).toBeGreaterThan(lastGain)
      last = trainRun(t); lastGain = gain
    }
    expect(TRAIN_SECONDS).toBeLessThan(0.5)
  })

  it('keeps a shoved car ahead of the train\'s nose all the way, and knocks a shunted car on a whole square', () => {
    for (let t = 0; t <= 1.001; t += 0.05) expect(shoved(t, rolled).along).toBeGreaterThanOrEqual(Math.min(1, trainRun(t)))
    expect(shoved(1, rolled).along).toBe(1)
    expect(shunted(0, rolled).along).toBe(0)
    expect(shunted(1, rolled).along).toBe(1)
    expect(shunted(0.3, rolled).along).toBeGreaterThan(0.7)
    expect(sample((t) => shunted(t, rolled).along)).not.toBe(sample((t) => roll('car', t, rolled).along))
  })

  it('tilts a log over a shell and drops it level, and rocks a nosed log to stillness', () => {
    expect(overShell(-0.1)).toBe(0)
    expect(overShell(0.4)).toBeCloseTo(1)
    expect(overShell(0.7)).toBe(0)
    expect(nosed(-0.1)).toBe(0)
    expect(Math.abs(nosed(0.1))).toBeGreaterThan(0.3)
    expect(Math.abs(nosed(2))).toBeLessThan(0.001)
  })
})

describe('dusting a tyre track off with an ear', () => {
  it('brushes three times across the tummy, from one side to the other, and is over in under half a second', () => {
    expect(dusting(-0.01)).toBeNull()
    expect(dusting(DUST_SECONDS)).toBeNull()
    expect(dusting(1e6)).toBeNull()
    expect(DUST_SECONDS).toBeLessThan(0.5)
    expect(dusting(0)).toBeCloseTo(-1)
    let turns = 0, last = dusting(0)!, way = 1
    for (let t = 0.005; t < DUST_SECONDS; t += 0.005) {
      const at = dusting(t)!
      expect(Math.abs(at)).toBeLessThanOrEqual(1)
      if (Math.sign(at - last) === -way) { turns++; way = -way }
      last = at
    }
    // Across, back, and across again.
    expect(turns).toBe(2)
    expect(last).toBeGreaterThan(0.9)
  })
})

describe('the duck, the wet rabbit, the leaf and the slide', () => {
  it('waddles the duck from foot to foot, down at both ends of a step', () => {
    expect(waddle(0, arc).lift).toBeCloseTo(0)
    expect(waddle(1, arc).lift).toBeCloseTo(0)
    expect(waddle(1, arc).along).toBe(1)
    let left = 0, right = 0
    for (let t = 0; t <= 1; t += 0.02) { left = Math.min(left, waddle(t, arc).tip); right = Math.max(right, waddle(t, arc).tip) }
    expect(left).toBeLessThan(-0.15)
    expect(right).toBeGreaterThan(0.15)
    expect(sample((t) => waddle(t, arc).lift)).not.toBe(sample((t) => hopArc(0, t, arc).lift))
  })

  it('whirls her ears dry and stops', () => {
    expect(shakeDry(-0.1)).toBe(0)
    expect(shakeDry(0)).toBeCloseTo(Math.PI * 8)
    expect(shakeDry(0.9)).toBe(0)
  })

  it('lifts the leaf, holds it while the small ones slide, and drops it flat; the board slides on gently and all the way', () => {
    expect(leafLift(0)).toBe(0)
    expect(leafLift(0.3)).toBeCloseTo(1)
    expect(leafLift(0.6)).toBe(1)
    expect(leafLift(1)).toBeCloseTo(0)
    expect(slideOn(0)).toBe(0)
    expect(slideOn(1)).toBe(1)
    expect(slideOn(0.1)).toBeLessThan(0.1)
    expect(slideOn(0.9)).toBeGreaterThan(0.9)
    for (let t = 0.05; t <= 1.001; t += 0.05) expect(slideOn(t)).toBeGreaterThan(slideOn(t - 0.05))
  })
})

describe('a leapfrog', () => {
  it('takes her over twice as high as any hop of hers, and the small one under her along the ground at half its height', () => {
    const highest = Math.max(...[0.1, 0.3, 0.5, 0.7, 0.9].map((t) => hopArc(0, t, arc).lift))
    expect(vault(0.5, arc).lift).toBeGreaterThan(highest * 1.9)
    expect(vault(0, arc)).toMatchObject({ along: 0, lift: 0 })
    expect(vault(1, arc).along).toBe(1)
    expect(vault(1, arc).lift).toBeCloseTo(0)
    for (const t of [0, 0.2, 0.5, 0.8, 1]) expect(scurry(t, arc).lift).toBe(0)
    expect(scurry(0.5, arc).stretch).toBe(0.5)
    expect(scurry(0, arc)).toMatchObject({ along: 0, stretch: 1 })
    expect(scurry(1, arc).along).toBe(1)
    expect(scurry(1, arc).stretch).toBeCloseTo(1)
  })
})

describe('her ears', () => {
  it('windmill two whole turns when she lands on a log, and stop', () => {
    expect(windmill(-0.1)).toBe(0)
    expect(windmill(0)).toBe(0)
    expect(windmill(0.59)).toBeGreaterThan(Math.PI * 3.9)
    expect(windmill(0.7)).toBe(0)
    for (let t = 0.05; t < 0.6; t += 0.05) expect(windmill(t)).toBeGreaterThan(windmill(t - 0.05))
  })

  it('are laid flat at once by the wind of a train, held there, and come up again', () => {
    expect(blown(-0.1)).toBe(0)
    expect(blown(0.06)).toBeCloseTo(1)
    expect(blown(0.3)).toBe(1)
    expect(blown(0.65)).toBeCloseTo(0.5)
    expect(blown(1)).toBe(0)
  })
})

describe('the train after its run', () => {
  it('yawns once: its mouth opens wide and shuts', () => {
    expect(yawn(-0.1)).toBe(0)
    expect(yawn(0)).toBe(0)
    expect(yawn(0.5)).toBeGreaterThan(0.9)
    expect(yawn(1.2)).toBe(0)
  })
})

describe('an onlooker that is touched', () => {
  const out: Swell = { wide: 1, tall: 1, shut: false, big: 0 }
  const TOYS = ['teddy', 'robot', 'giraffe', 'doll'] as const

  it('swells in its own way, never below its size, and is its size again when it is over', () => {
    for (const what of TOYS) {
      let grew = false
      for (let since = 0; since < SWELL_SECONDS; since += 0.02) {
        const now = swell(what, since, out)
        expect(now.wide, what).toBeGreaterThanOrEqual(1)
        expect(now.tall, what).toBeGreaterThanOrEqual(1)
        if (now.wide > 1.03 || now.tall > 1.03) grew = true
      }
      expect(grew, what).toBe(true)
      expect(swell(what, SWELL_SECONDS, out)).toEqual({ wide: 1, tall: 1, shut: false, big: 0 })
      expect(swell(what, -1, out)).toEqual({ wide: 1, tall: 1, shut: false, big: 0 })
    }
    const curve = (what: (typeof TOYS)[number]) => sample((t) => swell(what, t * SWELL_SECONDS, out).wide) + sample((t) => swell(what, t * SWELL_SECONDS, out).tall)
    expect(new Set(TOYS.map(curve)).size).toBe(4)
  })

  it('shows what each one is: the robot\'s eyes go large, the doll shuts hers, the giraffe only grows taller', () => {
    expect(swell('robot', 0.3, out).big).toBe(1)
    expect(swell('doll', 0.3, out).shut).toBe(true)
    expect(swell('teddy', 0.3, out)).toMatchObject({ shut: false, big: 0 })
    expect(swell('giraffe', 0.45, out).wide).toBe(1)
    expect(swell('giraffe', 0.45, out).tall).toBeGreaterThan(1.25)
  })
})

describe('a rider on a log', () => {
  it('leans with the log as it rides up over a turtle, wobbles to and fro when the fish noses it, and sits upright otherwise', () => {
    expect(riderSway(LONG, LONG)).toBe(0)
    expect(riderSway(-1, -1)).toBe(0)
    const lean = [0.1, 0.2, 0.3, 0.4].map((t) => riderSway(t, LONG))
    expect(Math.max(...lean.map(Math.abs))).toBeGreaterThan(0.08)
    for (const t of [0.1, 0.2, 0.3, 0.4]) expect(riderSway(t, LONG)).toBeCloseTo(0.3 * overShell(t))
    const wobble = Array.from({ length: 40 }, (_, n) => riderSway(LONG, n * 0.0175))
    expect(Math.max(...wobble)).toBeGreaterThan(0.1)
    expect(Math.min(...wobble)).toBeLessThan(-0.1)
    expect(riderSway(LONG, 0.71)).toBe(0)
  })
})

describe('what the sheet says of a landing, a knock and a spit', () => {
  it('turns a car driver\'s head right round in a moment, holds it, and turns it back', () => {
    expect(lookBehind(-0.1)).toBe(0)
    expect(lookBehind(0.09)).toBeCloseTo(0.5)
    expect(lookBehind(0.4)).toBe(1)
    expect(lookBehind(0.8)).toBeCloseTo(0.5)
    expect(lookBehind(1)).toBe(0)
  })
  it('dips a log at the landing and lets it roll a little, and leaves it still before and long after', () => {
    const out = { dip: 0, roll: 0 }
    expect(logLanded(-0.1, out)).toEqual({ dip: 0, roll: 0 })
    expect(logLanded(0, out).dip).toBe(1)
    expect(Math.abs(logLanded(0.1, out).roll)).toBeGreaterThan(0.3)
    expect(logLanded(2, out)).toEqual({ dip: 0, roll: 0 })
  })
  it('brings a small one down on its head and rolls it upright, the wobbly one three times round first', () => {
    // A turn and a half in the air is upside down.
    expect(SPIT_TURNS % 1).toBe(0.5)
    for (const who of [1, 2, 3]) {
      expect(rollUp(who, 0)).toBe(SPIT_TURNS)
      expect(rollUp(who, 1) % 1).toBe(0)
      expect(ROLL_UP_SECONDS[who]).toBeGreaterThan(0.2)
      expect(ROLL_UP_SECONDS[who]).toBeLessThan(0.8)
    }
    expect(rollUp(3, 1) - rollUp(3, 0)).toBeGreaterThanOrEqual(3)
    expect(rollUp(1, 1) - rollUp(1, 0)).toBe(0.5)
  })
})

describe('the fish\'s shadow', () => {
  it('keeps to the row next to hers, and comes one whole square nearer, to her own row', () => {
    for (let row = 0; row < 6; row++) {
      const rest = shadowRow(row, false, 6)
      expect(Math.abs(rest - row)).toBe(1)
      expect(rest).toBeGreaterThanOrEqual(0)
      expect(rest).toBeLessThan(6)
      expect(shadowRow(row, true, 6)).toBe(row)
    }
  })
})

describe('marks that wear off', () => {
  it('are counted in hops of the line', () => {
    expect(Number.isInteger(MARK_HOPS)).toBe(true)
    expect(MARK_HOPS).toBeGreaterThanOrEqual(2)
  })
})

describe('the cat watches', () => {
  it('turns its eyes towards what it watches and never past the rim', () => {
    const out = { x: 0, y: 0 }
    gaze(100, 100, 900, 500, 7, out)
    expect(out.x).toBeGreaterThan(0)
    expect(out.y).toBeGreaterThan(0)
    expect(Math.hypot(out.x, out.y)).toBeLessThanOrEqual(7 + 1e-9)
    expect(gaze(100, 100, 100, 100, 7, out)).toEqual({ x: 0, y: 0 })
  })
})
