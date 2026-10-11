import { describe, expect, it } from 'vitest'
import { KINDS, type Kind } from './kinds'
import { FALL_SECONDS, LIMB, LIMBS, LIMB_OF, PIT_DEPTH, POKE_SECONDS, STEP_SECONDS, STRIDE, STRING, TEETER_HZ, backTo, STICK_HZ, bobSeconds, fall, airborne, inRoom, keepTime, land, makeLimbs, poke, rest, ride, seat, stepLift, still, strode, teeter, walk, type Limbs, type Pose, type Riding, type Seat } from './motion'

const blank = (): Pose => ({ slide: 0, lift: 0, tilt: 0, roll: 0, yaw: 0, fore: 0, wide: 1, tall: 1, about: 0 })
/** A pose and the limbs that go with it, as one string: two that read the same move the same. */
const sign = (pose: Pose, limbs?: Limbs): string => [pose.slide, pose.lift, pose.tilt, pose.roll, pose.yaw, pose.fore, pose.wide, pose.tall, ...(limbs ?? [])].map((n) => n.toFixed(3)).join(' ')
const limbs = makeLimbs()
const riding = (over: Partial<Riding> = {}): Riding => ({ since: 9, lively: 0, look: 0, bob: 0, narrow: false, top: true, time: 1, ...over })
const field = (made: Limbs, limb: number, which: number): number => made[limb * LIMB + which]

/** What a curve looks like, sampled across its run: two kinds with the same string move the same. */
function curve(make: (kind: Kind, t: number, out: Pose, limbs: Limbs) => Pose, kind: Kind): string {
  return [0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map((t) => { const made = makeLimbs(); return sign(make(kind, t, blank(), made), made) }).join(' | ')
}

function allDiffer(curves: string[]): void {
  expect(new Set(curves).size).toBe(curves.length)
}

describe('each thing moves like itself', () => {
  it('on the rim: no two share a wobble, and each has its own tempo', () => {
    allDiffer(KINDS.map((kind) => curve((k, t, out, made) => teeter(k, 0.6, 1, t * 6, rest(out), made), kind)))
    expect(new Set(KINDS.map((kind) => TEETER_HZ[kind])).size).toBe(KINDS.length)
  })

  it('going in: no two share a fall, and small things are quicker', () => {
    allDiffer(KINDS.map((kind) => curve(fall, kind)))
    for (let i = 1; i < KINDS.length; i++) expect(FALL_SECONDS[KINDS[i]]).toBeGreaterThan(FALL_SECONDS[KINDS[i - 1]])
  })

  it('under a finger: no two share an answer', () => {
    allDiffer(KINDS.map((kind) => curve((k, t, out, made) => poke(k, t * POKE_SECONDS[k], rest(out), made), kind)))
  })

  it('walking: no two share a walk, a stride or a tempo', () => {
    allDiffer(KINDS.map((kind) => curve((k, t, out, made) => walk(k, t * 2, 3, rest(out), made), kind)))
    expect(new Set(KINDS.map((kind) => STRIDE[kind])).size).toBe(KINDS.length)
    expect(new Set(KINDS.map((kind) => STEP_SECONDS[kind])).size).toBe(KINDS.length)
  })

  it('sitting on a stack: no two are worn or used the same way, on top or underneath', () => {
    const sat = (kind: Kind, under: boolean): string => {
      const made = makeLimbs(), out = seat(kind, under, riding({ since: 0.2, bob: 0.7, lively: 1, look: 0.6, narrow: true }), { tilt: 0, roll: 0, yaw: 0, lift: 0, back: 0, wide: 1, tall: 1, flip: false }, made)
      return [out.tilt, out.roll, out.yaw, out.lift, out.wide, out.tall, out.flip ? 1 : 0, ...made].map((n) => n.toFixed(3)).join(' ')
    }
    allDiffer(KINDS.map((kind) => sat(kind, false)))
    // Underneath, the pie and the balloon are squashed each by its own amount, the dog's ears are pressed flat, the
    // hat and the tuba are both turned over (their shapes make the bucket and the seat), and the drummer stands as he stands.
    allDiffer((['pie', 'hat', 'balloon', 'dog', 'drummer'] as const).map((kind) => sat(kind, true)))
  })
})

describe('on the rim', () => {
  it('a thing the hole is not under, and that is still, stands as it stood', () => {
    for (const kind of KINDS) expect(sign(teeter(kind, 0, 0, 2, blank(), still(limbs)), limbs)).toBe(sign(blank(), makeLimbs()))
  })

  it('leans toward the hole more the further the hole is under it', () => {
    for (const kind of KINDS) expect(teeter(kind, 1, 0, 0, blank(), limbs).tilt).toBeGreaterThan(teeter(kind, 0.3, 0, 0, blank(), limbs).tilt)
  })

  it('stays the right way up and on the street', () => {
    for (const kind of KINDS) {
      for (let phase = 0; phase < 12; phase += 0.3) {
        const pose = teeter(kind, 1, 1, phase, blank(), limbs)
        expect(Math.abs(pose.tilt)).toBeLessThan(1.2)
        expect(Math.abs(pose.roll)).toBeLessThan(0.6)
        expect(pose.lift).toBeGreaterThanOrEqual(0)
        expect(pose.wide).toBeGreaterThan(0.7)
        expect(pose.tall).toBeGreaterThan(0.7)
      }
    }
  })
})

describe('going in', () => {
  it('starts where the thing stands and ends out of sight in the middle of the hole', () => {
    for (const kind of KINDS) {
      const start = fall(kind, 0, blank(), limbs), end = fall(kind, 1, blank(), limbs)
      expect(start.slide).toBe(0)
      expect(Math.abs(start.lift)).toBeLessThan(1e-9)
      expect(end.slide).toBe(1)
      expect(end.lift).toBeLessThanOrEqual(-PIT_DEPTH * 0.95)
    }
  })

  it('never comes back up once it is on its way down', () => {
    for (const kind of KINDS) {
      let last = fall(kind, 0.55, blank(), limbs).lift
      for (let t = 0.6; t <= 1; t += 0.05) {
        const lift = fall(kind, t, blank(), limbs).lift
        expect(lift, `${kind} at ${t}`).toBeLessThanOrEqual(last + 1e-9)
        last = lift
      }
    }
  })

  it('writes the whole pose, whatever was in it', () => {
    const dirty: Pose = { slide: 9, lift: 9, tilt: 9, roll: 9, yaw: 9, fore: 9, wide: 9, tall: 9, about: 9 }
    expect(sign(fall('pie', 0.5, dirty, limbs))).toBe(sign(fall('pie', 0.5, blank(), limbs)))
  })
})

describe('touched where it stands', () => {
  it('answers from the moment the finger lands and is over when its time is up', () => {
    for (const kind of KINDS) {
      const none = sign(blank(), makeLimbs())
      expect(sign(poke(kind, 0.05, blank(), still(limbs)), limbs)).not.toBe(none)
      expect(sign(poke(kind, POKE_SECONDS[kind], blank(), still(limbs)), limbs)).toBe(none)
      expect(sign(poke(kind, 99, blank(), still(limbs)), limbs)).toBe(none)
    }
  })
})

describe('landing, sitting and riding', () => {
  it('a landing squashes and then stands up again', () => {
    expect(land(1, blank()).tall).toBeLessThan(1)
    expect(land(1, blank()).wide).toBeGreaterThan(1)
    expect(sign(land(0, blank()))).toBe(sign(blank()))
  })

  it('only the thing underneath is used the wrong way: the hat and the tuba are turned over', () => {
    const out: Seat = { tilt: 0, roll: 0, yaw: 0, lift: 0, back: 0, wide: 1, tall: 1, flip: false }
    expect(KINDS.filter((kind) => seat(kind, true, riding(), out, still(limbs)).flip)).toEqual(['hat', 'tuba'])
    expect(KINDS.filter((kind) => seat(kind, false, riding(), out, still(limbs)).flip)).toEqual([])
    expect(seat('pie', true, riding(), out, limbs).tall).toBeLessThan(1)
    expect(seat('hat', false, riding(), out, limbs).roll).not.toBe(0)
  })

  it('a hat comes down over the eyes of a thing narrower than itself, and sits on a wider one', () => {
    const out: Seat = { tilt: 0, roll: 0, yaw: 0, lift: 0, back: 0, wide: 1, tall: 1, flip: false }
    expect(seat('hat', false, riding({ narrow: true }), out, limbs).lift).toBeLessThan(0)
    expect(seat('hat', false, riding({ narrow: false }), out, limbs).lift).toBe(0)
  })

  it('a balloon floats up on its string only when nothing sits on it, and the string grows to reach it', () => {
    const out: Seat = { tilt: 0, roll: 0, yaw: 0, lift: 0, back: 0, wide: 1, tall: 1, flip: false }
    seat('balloon', false, riding({ top: true, time: 0 }), out, still(limbs))
    const up = field(limbs, LIMB_OF.balloon.body, 5)
    expect(up).toBeGreaterThan(0.5)
    expect(field(limbs, LIMB_OF.balloon.string, 3)).toBeCloseTo(up / STRING, 5)
    seat('balloon', false, riding({ top: false }), out, still(limbs))
    expect(field(limbs, LIMB_OF.balloon.body, 5)).toBe(0)
  })

  it('a dog on a stack turns its head to where the hole is, and no further than its neck goes', () => {
    const out: Seat = { tilt: 0, roll: 0, yaw: 0, lift: 0, back: 0, wide: 1, tall: 1, flip: false }
    seat('dog', false, riding({ look: 0.8 }), out, still(limbs))
    expect(field(limbs, LIMB_OF.dog.head, 1)).toBeCloseTo(0.8, 5)
    seat('dog', false, riding({ look: 3 }), out, still(limbs))
    expect(field(limbs, LIMB_OF.dog.head, 1)).toBeCloseTo(1.3, 5)
  })

  it('a pie set on a stack gets its cherry last: the cherry is up in the air at first and down when it has settled', () => {
    const out: Seat = { tilt: 0, roll: 0, yaw: 0, lift: 0, back: 0, wide: 1, tall: 1, flip: false }
    seat('pie', false, riding({ since: 0 }), out, still(limbs))
    expect(field(limbs, LIMB_OF.pie.cherry, 5)).toBeGreaterThan(0.5)
    seat('pie', false, riding({ since: 2 }), out, still(limbs))
    expect(field(limbs, LIMB_OF.pie.cherry, 5)).toBeCloseTo(0, 5)
  })

  it('the drummer keeps time with his sticks at rest, and beats harder at the same tempo when he is asked to', () => {
    const lift = (time: number, drum: number): number => { keepTime(time, drum, still(limbs)); return Math.abs(field(limbs, LIMB_OF.drummer.left, 0)) }
    const swing = (drum: number): number => Math.max(...Array.from({ length: 300 }, (_, i) => lift(i * 0.02, drum)))
    expect(swing(0)).toBeGreaterThan(0.05)
    expect(swing(1)).toBeGreaterThan(swing(0) * 2)
    // The tempo is fixed: a stick is up at the same moments however hard he beats, so a beat that eases in or out never changes its time.
    for (let i = 0; i < 300; i++) {
      const time = i * 0.02
      expect(lift(time, 1) > 0, `at ${time}`).toBe(lift(time, 0) > 0)
      expect(lift(time, 0.4) > 0, `at ${time}`).toBe(lift(time, 0) > 0)
    }
    const beats = Array.from({ length: 600 }, (_, i) => lift(i * 0.01, 0.7) > 0).filter((up, i, all) => i > 0 && up && !all[i - 1]).length
    expect(beats).toBeGreaterThanOrEqual(Math.floor(6 * STICK_HZ) - 1)
    expect(beats).toBeLessThanOrEqual(Math.ceil(6 * STICK_HZ))
  })

  it('no thing asks for a limb it does not have', () => {
    expect(Math.max(...Object.values(LIMB_OF).flatMap((of) => Object.values(of) as number[]))).toBeLessThan(LIMBS)
  })

  it('a walk covers its whole way in its steps, each thing in its own manner, and never goes back', () => {
    for (const kind of KINDS) {
      expect(strode(kind, 0, 4)).toBe(0)
      expect(strode(kind, 4, 4)).toBe(1)
      let last = 0
      for (let phase = 0; phase <= 4; phase += 0.1) {
        const far = strode(kind, phase, 4)
        expect(far).toBeGreaterThanOrEqual(last - 1e-9)
        last = far
      }
    }
    expect(strode('pie', 0.5, 4)).toBeGreaterThan(strode('dog', 0.5, 4))
  })

  it('a bouncing balloon bounces lower under a heavier load', () => {
    const high = (load: number): number => walk('balloon', 0.5, load, blank(), still(limbs)).lift
    expect(high(2)).toBeGreaterThan(high(9))
  })

  it('a light load bobs further and faster than a heavy one', () => {
    const swing = (load: number): number => Math.max(...Array.from({ length: 200 }, (_, i) => Math.abs(ride(load, i * 0.05))))
    expect(swing(1)).toBeGreaterThan(swing(8))
    // One bob to one turn of the beat, whatever the load: how long that turn takes is the model's, and is longer for a heavy load.
    for (const load of [1, 8]) {
      expect(ride(load, 0)).toBeCloseTo(0, 6)
      expect(ride(load, Math.PI * 2)).toBeCloseTo(0, 6)
      expect(ride(load, Math.PI / 2)).toBeCloseTo(swing(load), 3)
    }
    expect(bobSeconds(8)).toBeGreaterThan(bobSeconds(1))
  })
})

describe('a thing keeps to the room it has', () => {
  const leaning = (): Pose => ({ ...blank(), tilt: 0.6, roll: 0.3, fore: 0.2, wide: 1.2, slide: 0.5 })

  it('stands straight, as wide as it is and where it is, when it has no room at all', () => {
    const pose = inRoom(leaning(), 2, 1, 0, 0, 1.5)
    expect(pose.tilt).toBe(0)
    expect(pose.roll).toBe(0)
    expect(pose.fore).toBe(0)
    expect(pose.wide).toBe(1)
    expect(pose.slide).toBe(0)
  })

  it('leans as it likes when it has room to fall its whole length', () => {
    expect(sign(inRoom(leaning(), 2, 1, 2.5, 2.5, 1.5))).toBe(sign(leaning()))
  })

  it('in between, it leans out by no more than half the room, and spreads and slides by no more than a quarter each', () => {
    for (const room of [0.05, 0.2, 0.5, 1, 1.9]) {
      for (const high of [0.7, 2, 3, 5]) {
        if (room >= high) continue
        const pose = inRoom(leaning(), high, 1, room, room, 1.5)
        expect(high * Math.sin(Math.abs(pose.tilt)), `room ${room}, high ${high}`).toBeLessThanOrEqual(room / 2 + 1e-9)
        expect(high * Math.sin(Math.hypot(pose.roll, pose.fore)), `room ${room}, high ${high}`).toBeLessThanOrEqual(room / 2 + 1e-9)
        expect((pose.wide - 1) * 1, `room ${room}, high ${high}`).toBeLessThanOrEqual(room / 4 + 1e-9)
        expect(pose.slide * 1.5, `room ${room}, high ${high}`).toBeLessThanOrEqual(room / 4 + 1e-9)
      }
    }
  })

  it('leans toward the hole by the room it has that way, and to every other side by the room it has all round', () => {
    const pose = inRoom(leaning(), 2, 1, 0, 5, 1.5)
    expect(pose.tilt).toBe(0.6)
    expect(pose.roll).toBe(0)
    const away = inRoom({ ...leaning(), tilt: -0.6 }, 2, 1, 0, 5, 1.5)
    expect(away.tilt).toBeCloseTo(0, 9)
  })
})

describe('the big things go in without sweeping the street', () => {
  it('the drummer turns his back to the hole and topples into it: he never leans away from it', () => {
    for (let t = 0; t <= 1; t += 0.05) expect(fall('drummer', t, blank(), makeLimbs()).tilt).toBeGreaterThanOrEqual(0)
    expect(fall('drummer', 0.3, blank(), makeLimbs()).about).toBe(1)
    expect(fall('pie', 0.3, blank(), makeLimbs()).about).toBe(0)
  })

  it('the turn of his back is toward the hole, wherever it lies', () => {
    for (const [dirX, dirZ] of [[0, 1], [1, 0], [0, -1], [-0.6, 0.8]] as const) {
      // He faces the near kerb, so his back is the far side of him.
      const yaw = backTo(dirX, dirZ), backX = -Math.sin(yaw), backZ = -Math.cos(yaw)
      expect(backX).toBeCloseTo(dirX, 9)
      expect(backZ).toBeCloseTo(dirZ, 9)
    }
  })

  it('the tuba turns over as it sinks: by the time it lies flat it is below the street', () => {
    for (let t = 0; t <= 1; t += 0.02) {
      const pose = fall('tuba', t, blank(), makeLimbs())
      if (pose.tilt > Math.PI / 3 && pose.tilt < (Math.PI * 2) / 3) expect(pose.lift, `t ${t}`).toBeLessThan(-0.25)
    }
  })
})

describe('one clock for what is seen and what is heard', () => {
  const RX = 0

  it('the walk\'s own bounce is one number for the view and the finger: what `walk` lifts a thing by is `stepLift`, for every kind, at every moment of a step, under any load', () => {
    for (const kind of KINDS) {
      for (const load of [1.1, 4, 9]) {
        for (let phase = 0; phase <= 3; phase += 0.05) {
          expect(walk(kind, phase, load, blank(), makeLimbs()).lift, `${kind} ${phase} ${load}`).toBe(stepLift(kind, phase, load))
        }
      }
    }
    // The hat hops half a unit high and a balloon bounces up to three quarters: a finger aimed at the foot would miss them.
    expect(stepLift('hat', 0.5, 2)).toBeCloseTo(0.5, 9)
    expect(stepLift('balloon', 0.5, 0)).toBeCloseTo(0.75, 9)
    expect(stepLift('balloon', 0.5, 9)).toBeLessThan(stepLift('balloon', 0.5, 2))
    for (const kind of KINDS) expect(stepLift(kind, 2, 3)).toBeCloseTo(0, 9)
    // The two that leave the street are the two whose step is heard as it lands.
    expect(KINDS.filter(airborne)).toEqual(['hat', 'balloon'])
    for (const kind of KINDS) expect(stepLift(kind, 0.5, 2) > 0.2, kind).toBe(airborne(kind))
  })

  it('the drummer\'s stick is down when his boom comes: on the breath in the frame the bob begins, and marching in the frame his left foot comes down', () => {
    // On the breath the beat is 1 in the frame of the note, and both sticks are down then and up between beats.
    const sticks = (bob: number): number[] => { const made = makeLimbs(); seat('drummer', false, riding({ bob }), { tilt: 0, roll: 0, yaw: 0, lift: 0, back: 0, wide: 1, tall: 1, flip: false }, made); return [field(made, LIMB_OF.drummer.left, RX), field(made, LIMB_OF.drummer.right, RX)] }
    const [down] = sticks(1), [half] = sticks(0.5), [up] = sticks(-1)
    expect(down).toBeGreaterThan(half)
    expect(half).toBeGreaterThan(up)
    expect(sticks(1)[1]).toBeGreaterThan(sticks(-1)[1])
    expect(sticks(0)).toEqual(sticks(-1))
    // Marching: the boom is on the steps that begin with his left foot coming down, which are the even ones (voices.ts).
    const march = (phase: number): { stick: number; left: number; right: number } => { const made = makeLimbs(); walk('drummer', phase, 3, blank(), made); return { stick: field(made, LIMB_OF.drummer.left, RX), left: field(made, LIMB_OF.drummer.leftLeg, RX), right: field(made, LIMB_OF.drummer.rightLeg, RX) } }
    for (const beat of [0, 2, 4]) {
      // His left stick is fully down in that frame, further than at any other moment of the two steps round it.
      for (const off of [-0.5, -0.25, 0.25, 0.5, 1]) expect(march(beat).stick, `${beat} ${off}`).toBeGreaterThan(march(beat + off).stick)
      // His left foot is on the ground then: it was in the air through the step before, and the right one is in the air through the step after.
      expect(march(beat).left).toBeCloseTo(0, 9)
      expect(Math.abs(march(beat + 0.5).right)).toBeGreaterThan(0.5)
      expect(Math.abs(march(beat + 0.5).left)).toBeLessThan(1e-9)
      if (beat > 0) expect(Math.abs(march(beat - 0.5).left)).toBeGreaterThan(0.5)
    }
  })
})

