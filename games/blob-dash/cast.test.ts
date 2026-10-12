import { describe, expect, it } from 'vitest'
import { cameraPose, catBeat, catPose, neighbourBeat, neighbourPose, pigeonBeat, pigeonEyes, pigeonPose, pigeonStand, pulse, ratBeat, ratPose, type Clock } from './cast'
import { TEMPO } from './config'
import { CAT, PIGEON, RAT, WHISKER_TIPS } from './figures'
import { CAST, CAT_TAIL, DIAL, PIGEON_SCALE, RING, castAt } from './layout'

const NEVER = Number.POSITIVE_INFINITY
const REST = { kind: -1, age: NEVER }
const clock = (beats: number, seconds = beats / 2, tempo = 120): Clock => ({ beats, seconds, tempo, blob: { x: 800, y: 200 } })

const quiet = {
  pigeon: { poke: NEVER, coo: NEVER, puff: NEVER, strut: NEVER, duck: NEVER, apart: NEVER, shake: NEVER, pant: NEVER, habit: REST },
  rat: { poke: NEVER, rattle: NEVER, smirk: NEVER, take: NEVER, hush: NEVER, sniff: NEVER, habit: REST },
  cat: { poke: NEVER, fur: NEVER, ear: NEVER, blink: NEVER, bat: NEVER, habit: REST },
  camera: { poke: NEVER, nod: NEVER, lookX: 0, lookY: 0 },
  neighbour: { poke: NEVER, habit: REST },
}

/** A curve sampled over four beats. */
const sample = (curve: (beats: number) => number): number[] => Array.from({ length: 400 }, (_, i) => curve(i / 100))

/** How alike two curves are at their best, sliding one along the other: 1 is the same curve. */
function likeness(a: number[], b: number[]): number {
  const centre = (xs: number[]) => {
    const mean = xs.reduce((sum, x) => sum + x, 0) / xs.length
    return xs.map((x) => x - mean)
  }
  const ca = centre(a), cb = centre(b)
  const size = (xs: number[]) => Math.sqrt(xs.reduce((sum, x) => sum + x * x, 0))
  let best = 0
  for (let shift = 0; shift < a.length; shift++) {
    let dot = 0
    for (let i = 0; i < a.length; i++) dot += ca[i] * cb[(i + shift) % a.length]
    best = Math.max(best, Math.abs(dot) / (size(ca) * size(cb)))
  }
  return best
}

describe('how the cast keeps time', () => {
  it('has the pigeon snap its head out on the beat and draw it back slowly', () => {
    expect(pigeonBeat(3)).toBe(0)
    expect(pigeonBeat(3.125)).toBeCloseTo(1, 6)
    expect(pigeonBeat(3.5)).toBeGreaterThan(0.4)
    expect(pigeonBeat(3.99)).toBeLessThan(0.01)
  })

  it('has the rat lift its toe towards each half and slap it down on the half, never on the beat', () => {
    expect(ratBeat(3.49)).toBeGreaterThan(0.95)
    expect(ratBeat(3.5)).toBe(0)
    expect(ratBeat(3.9)).toBe(0)
    expect(ratBeat(4)).toBe(0)
    expect(ratBeat(4.1)).toBe(0)
  })

  it("has the cat's tail swing one way a beat, so a whole swing takes two", () => {
    expect(catBeat(0)).toBeCloseTo(1, 9)
    expect(catBeat(1)).toBeCloseTo(-1, 9)
    expect(catBeat(2)).toBeCloseTo(1, 9)
  })

  it('gives no two of them the same curve, however one is slid along the other', () => {
    const pigeon = sample(pigeonBeat), rat = sample(ratBeat), cat = sample(catBeat), neighbour = sample(neighbourBeat)
    const nod = sample((beats) => ratPose(clock(beats), quiet.rat).nod)
    expect(likeness(pigeon, pigeon)).toBeCloseTo(1, 6)
    for (const [name, a, b] of [['pigeon and rat', pigeon, rat], ['pigeon and cat', pigeon, cat], ['rat and cat', rat, cat], ['the pigeon and the nod', pigeon, nod], ['the foot and the nod', rat, nod], ['neighbour and pigeon', neighbour, pigeon], ['neighbour and rat', neighbour, rat], ['neighbour and cat', neighbour, cat]] as const) expect(likeness(a, b), name).toBeLessThan(0.9)
  })
})

describe('how the cast answers', () => {
  /** The numbers of a pose that differ from the pose at rest, over the second after something happened. */
  function moved<P extends object>(pose: (age: number) => P, rest: P): string[] {
    const names = new Set<string>()
    for (let age = 0; age < 1; age += 0.02) {
      const now = pose(age) as Record<string, unknown>
      for (const [name, value] of Object.entries(rest)) if (typeof value === 'number' && Math.abs((now[name] as number) - value) > 0.02) names.add(name)
    }
    return [...names].sort()
  }
  const at = clock(8.6, 20)

  it('has the neighbour sway once across in a bar of four beats', () => {
    expect(neighbourBeat(0)).toBeCloseTo(-1, 6)
    expect(neighbourBeat(2)).toBeCloseTo(1, 6)
    expect(neighbourBeat(4)).toBeCloseTo(-1, 6)
    expect(neighbourBeat(1)).toBeCloseTo(0, 6)
  })

  it('lifts a foot in the pigeon\'s strut: it rocks about the foot it stands on, each foot in turn, and the other one leaves the perch', () => {
    const lifts: [number, number][] = []
    for (let strut = 0; strut < 1.2; strut += 1 / 120) {
      const pose = pigeonPose(at, { ...quiet.pigeon, strut }), stand = pigeonStand(pose, PIGEON.feet)
      // The foot it stands on does not move: where it is drawn is where it was.
      const planted = pose.rock > 0 ? 1 : 0, foot = PIGEON.feet[planted], cos = Math.cos(pose.rock), sin = Math.sin(pose.rock)
      expect(stand.dx + foot.x * cos - foot.y * sin).toBeCloseTo(foot.x, 9)
      expect(stand.dy + foot.x * sin + foot.y * cos).toBeCloseTo(foot.y, 9)
      expect(stand.lifted[planted]).toBe(0)
      lifts.push(stand.lifted)
    }
    // Each foot is off the perch by five pixels or more on the stage at the top of its step, and they take turns.
    for (const side of [0, 1]) expect(Math.max(...lifts.map((lifted) => lifted[side])) * PIGEON_SCALE, `foot ${side}`).toBeGreaterThan(5)
    expect(lifts.every((lifted) => lifted[0] === 0 || lifted[1] === 0)).toBe(true)
    // Standing still, both are down and the bird is where it is placed.
    expect(pigeonStand(pigeonPose(at, quiet.pigeon), PIGEON.feet)).toEqual({ dx: 0, dy: 0, lifted: [0, 0] })
  })

  it('takes a poke on the cat\'s tail as a poke of the cat, wherever the tail has swung to, and the tail hangs clear of the dial', () => {
    const root = { x: CAST.cat.x + CAT.tail.x, y: CAST.cat.y + CAT.tail.y }
    let widest = 0
    for (let beats = 0; beats < 8; beats += 0.05) {
      const swing = catPose(clock(beats), quiet.cat).tail
      widest = Math.max(widest, Math.abs(swing))
      // Along its length, from just under the ledge to its end.
      for (const along of [0.2, 0.4, 0.6, 0.8, 1]) {
        const p = { x: root.x - Math.sin(swing) * CAT.reach * along, y: root.y + Math.cos(swing) * CAT.reach * along }
        expect(castAt(p), `${beats} beats, ${along} along`).toBe('cat')
      }
    }
    expect(widest).toBeGreaterThan(0.3)
    // The box of the tail is under the cat's own, and a finger on it is not on the dial.
    expect(CAT_TAIL.y).toBe(CAST.cat.box.y + CAST.cat.box.h)
    for (const corner of [{ x: CAT_TAIL.x, y: CAT_TAIL.y + CAT_TAIL.h }, { x: CAT_TAIL.x + CAT_TAIL.w, y: CAT_TAIL.y + CAT_TAIL.h }]) expect(Math.hypot(corner.x - DIAL.x, corner.y - DIAL.y)).toBeGreaterThan(DIAL.reach)
  })

  it('answers each thing the cast likes or cannot stand with a part of its own', () => {
    const pigeon = (ages: Partial<typeof quiet.pigeon>) => pigeonPose(at, { ...quiet.pigeon, ...ages })
    // The drum: it struts on the spot, rocking from foot to foot.
    const feet = [0.1, 0.2, 0.3, 0.4, 0.5].map((strut) => pigeon({ strut }).foot)
    expect(Math.max(...feet)).toBeGreaterThan(0.5)
    expect(Math.min(...feet)).toBeLessThan(-0.5)
    expect(pigeon({}).foot).toBe(0)
    // The slap: down behind its wing, eyes shut, and no bob while it is down there.
    const ducked = pigeon({ duck: 0.2 })
    expect(ducked.duck).toBe(1)
    expect(ducked.blink).toBe(1)
    expect(ducked.thrust).toBe(0)
    expect(ducked.wing).toBeLessThan(-1)
    // Twins thrown by a flip: one eye each way, which is the other way from crossed.
    expect(pigeon({ apart: 0.2 }).cross).toBe(-1)
    // Off the fast end of the dial: it shakes its head straight.
    expect(Math.max(...[0.03, 0.05, 0.08, 0.1].map((shake) => Math.abs(pigeon({ shake }).tilt - pigeon({}).tilt)))).toBeGreaterThan(0.2)
    // Back from its lap: chest heaving, beak open.
    const panting = [0.3, 0.5, 0.7, 0.72].map((pant) => pigeon({ pant }))
    expect(Math.max(...panting.map((pose) => pose.puff))).toBeGreaterThan(0.8)
    expect(Math.max(...panting.map((pose) => pose.beak))).toBeGreaterThan(0.5)

    const rat = (ages: Partial<typeof quiet.rat>) => ratPose(at, { ...quiet.rat, ...ages })
    // The splitter: a double-take, eyes wide, then a slow nod.
    const takes = [0.05, 0.1, 0.2, 0.3].map((take) => rat({ take }))
    expect(Math.max(...takes.map((pose) => pose.wide))).toBeGreaterThan(0.6)
    expect(rat({ take: 0.95 }).nod - rat({}).nod).toBeGreaterThan(0.25)
    // The hush: one cup off its ear, and no grin with it.
    expect(rat({ hush: 0.5 }).cup).toBe(1)
    expect(rat({ hush: 0.5, rattle: 0.2 }).grin).toBe(0)
    // A piece under its nose: head down, and then the tail flicks it home.
    expect(rat({ sniff: 0.3 }).nod - rat({}).nod).toBeGreaterThan(0.3)
    expect(rat({ sniff: 0.63 }).tail - rat({}).tail).toBeLessThan(-0.8)

    const cat = (ages: Partial<typeof quiet.cat>) => catPose(at, { ...quiet.cat, ...ages })
    // What it likes: a slow blink and a curl of the tail's tip.
    expect(cat({ blink: 0.4 }).eye).toBe(0)
    expect(cat({ blink: 0.4 }).tip - cat({}).tip).toBeGreaterThan(1)
    // A piece let go on it: the paw, and not an eye opened.
    expect(cat({ bat: 0.1 }).paw).toBe(1)
    expect(cat({ bat: 0.1 }).eye).toBe(cat({}).eye)
    expect(cat({ poke: 0.15 }).eye).toBeGreaterThan(cat({}).eye)
  })

  it('has the pigeon stop keeping the beat while it stares and while it flies its lap', () => {
    const on = clock(8.125)
    expect(pigeonPose(on, quiet.pigeon).thrust).toBeGreaterThan(14)
    const staring = pigeonPose(on, quiet.pigeon, { stage: 'stare', t: 0.5, beats: 0 })
    expect(staring.thrust).toBe(0)
    expect(staring.stare).toBe(1)
    expect(staring.flight).toBeNull()
    const flying = pigeonPose(on, quiet.pigeon, { stage: 'fly', t: 0.5, beats: 12.5 })
    expect(flying.flight).toBe(12.5)
    // Coming in to land it is still out of its niche, where its flight ended.
    expect(pigeonPose(on, quiet.pigeon, { stage: 'land', t: 0.5, beats: 3 }).flight).toBe(3)
    // Its wings beat as it goes.
    const wings = [0, 0.1, 0.2, 0.3].map((beats) => pigeonPose(clock(8 + beats), quiet.pigeon, { stage: 'fly', t: 0.5, beats: 12 }).wing)
    expect(Math.max(...wings) - Math.min(...wings)).toBeGreaterThan(0.8)
  })

  it('has the neighbour gone behind the sill when poked, and sipping or leaning out when left alone', () => {
    const rest = neighbourPose(at, quiet.neighbour)
    expect(rest.duck).toBe(0)
    const poked = neighbourPose(at, { ...quiet.neighbour, poke: 0.3 })
    expect(poked.duck).toBe(1)
    expect(poked.curtain).toBeGreaterThan(0.9)
    expect(neighbourPose(at, { ...quiet.neighbour, habit: { kind: 0, age: 0.8 } }).sip).toBe(1)
    expect(neighbourPose(at, { ...quiet.neighbour, habit: { kind: 1, age: 0.8 } }).sway - rest.sway).toBeGreaterThan(0.1)
  })

  it('answers a poke with a different part of each: the wing, the headphones, the paw, the lens', () => {
    const pigeon = moved((age) => pigeonPose(at, { ...quiet.pigeon, poke: age }), pigeonPose(at, quiet.pigeon))
    const rat = moved((age) => ratPose(at, { ...quiet.rat, poke: age }), ratPose(at, quiet.rat))
    const cat = moved((age) => catPose(at, { ...quiet.cat, poke: age }), catPose(at, quiet.cat))
    const camera = moved((age) => cameraPose(at, { ...quiet.camera, poke: age, lookX: 100, lookY: 600 }), cameraPose(at, quiet.camera))
    expect(pigeon).toContain('wing')
    expect(rat).toContain('slip')
    expect(cat).toContain('paw')
    expect(camera).toEqual(['pan'])
    expect(new Set([pigeon.join(), rat.join(), cat.join(), camera.join()]).size).toBe(4)
  })

  it('has the pigeon puff and open its beak for a landing on the beat, and the rat grin and shake its can for one on a half', () => {
    const coo = pigeonPose(at, { ...quiet.pigeon, coo: 0.15 })
    expect(coo.puff).toBeGreaterThan(0.9)
    expect(coo.beak).toBeGreaterThan(0.9)
    const look = pigeonPose(at, { ...quiet.pigeon, puff: 0.1 })
    expect(look.puff).toBeGreaterThan(0.3)
    expect(look.beak).toBe(0)
    const rattle = ratPose(at, { ...quiet.rat, rattle: 0.2 })
    expect(rattle.grin).toBeGreaterThan(0.9)
    expect(Math.abs(ratPose(at, { ...quiet.rat, rattle: 0.03 }).arm)).toBeGreaterThan(0.2)
    expect(ratPose(at, { ...quiet.rat, smirk: 0.1 }).grin).toBeGreaterThan(0.3)
  })

  it("stands the cat's fur on end at a clear-out, opens its eyes, and lets it settle", () => {
    expect(catPose(at, quiet.cat).fur).toBe(0)
    expect(catPose(at, quiet.cat).eye).toBeLessThan(0.2)
    const up = catPose(at, { ...quiet.cat, fur: 0.3 })
    expect(up.fur).toBe(1)
    expect(up.eye).toBeGreaterThan(0.9)
    expect(catPose(at, { ...quiet.cat, fur: 1.5 }).fur).toBeGreaterThan(0)
    expect(catPose(at, { ...quiet.cat, fur: 2.4 }).fur).toBe(0)
  })

  it('crosses the eyes of the pigeon only at the fast end of the dial', () => {
    expect(pigeonPose(clock(3, 3, 120), quiet.pigeon).cross).toBe(0)
    expect(pigeonPose(clock(3, 3, TEMPO.fastest), quiet.pigeon).cross).toBe(1)
  })

  it('gives the pigeon two eyes: together on the blob, crossed at the fast end, and one each way when a flip throws twins apart', () => {
    expect(PIGEON.eyes).toHaveLength(2)
    // The further eye is nearer the beak, and the two do not touch.
    const [near, far] = PIGEON.eyes
    expect(far.x).toBeGreaterThan(near.x)
    expect(Math.hypot(far.x - near.x, far.y - near.y)).toBeGreaterThan(near.r + far.r)
    const watching = pigeonEyes(pigeonPose(at, quiet.pigeon))
    expect(watching[0]).toEqual(watching[1])
    expect(Math.hypot(watching[0].x, watching[0].y)).toBeCloseTo(1, 6)
    // Crossed: each eye looks at the other, the nearer one towards the beak and the further one back from it.
    const crossed = pigeonEyes(pigeonPose(clock(8, 4, TEMPO.fastest), quiet.pigeon))
    expect(crossed[0].x).toBeGreaterThan(0.8)
    expect(crossed[1].x).toBeLessThan(-0.8)
    // Apart: one each way.
    const apart = pigeonEyes(pigeonPose(at, { ...quiet.pigeon, apart: 0.15 }))
    expect(apart[0].x).toBeLessThan(-0.8)
    expect(apart[1].x).toBeGreaterThan(0.8)
  })

  it('keeps the tips of the rat\'s whiskers off the ring\'s line, however its head nods, starts and sniffs', () => {
    let nearest = Infinity
    for (let nod = -0.7; nod <= 1.01; nod += 0.05) for (let twitch = -0.6; twitch <= 0.61; twitch += 0.1) for (const hop of [0, -24]) {
      const neck = { x: CAST.rat.x + RAT.neck.x, y: CAST.rat.y + hop + RAT.neck.y }
      const root = { x: neck.x + RAT.whiskers.x * Math.cos(nod) - RAT.whiskers.y * Math.sin(nod), y: neck.y + RAT.whiskers.x * Math.sin(nod) + RAT.whiskers.y * Math.cos(nod) }
      for (const tip of WHISKER_TIPS) {
        const turn = nod + twitch, x = root.x + tip.x * Math.cos(turn) - tip.y * Math.sin(turn), y = root.y + tip.x * Math.sin(turn) + tip.y * Math.cos(turn)
        nearest = Math.min(nearest, Math.hypot(x - RING.x, y - RING.y) - RING.floor - RING.line)
      }
    }
    // Clear of the line by more than the overspray of a stroke.
    expect(nearest).toBeGreaterThan(6)
  })

  it('gives each of the three two idle habits of its own, which move different parts', () => {
    const habit = (kind: number) => ({ kind, age: 0.8 })
    const p0 = pigeonPose(at, { ...quiet.pigeon, habit: habit(0) }), p1 = pigeonPose(at, { ...quiet.pigeon, habit: habit(1) })
    expect(p0.tilt).toBeLessThan(-0.5)
    expect(p1.tilt).toBeGreaterThan(0.3)
    const r0 = ratPose(at, { ...quiet.rat, habit: habit(0) }), r1 = ratPose(at, { ...quiet.rat, habit: habit(1) })
    expect(Math.abs(r0.whiskers) + Math.abs(ratPose(at, { ...quiet.rat, habit: { kind: 0, age: 0.85 } }).whiskers)).toBeGreaterThan(0.05)
    expect(r1.arm).toBeLessThan(-0.5)
    expect(r1.whiskers).toBe(0)
    const c0 = catPose(at, { ...quiet.cat, habit: habit(0) }), c1 = catPose(at, { ...quiet.cat, habit: habit(1) })
    expect(c0.yawn).toBeGreaterThan(0.9)
    expect(c0.stretch).toBe(0)
    expect(c1.stretch).toBeGreaterThan(0.9)
    expect(c1.yawn).toBe(0)
  })

  it('turns the camera to keep the blob in view, within what its joint allows', () => {
    const pivot = CAST.camera
    const towards = (x: number, y: number) => cameraPose({ ...clock(1), blob: { x, y } }, quiet.camera).pan
    expect(towards(pivot.x + 300, pivot.y)).toBeCloseTo(0, 6)
    expect(towards(pivot.x + 300, pivot.y + 300)).toBeCloseTo(Math.PI / 4, 6)
    expect(towards(pivot.x - 300, pivot.y + 10)).toBeLessThanOrEqual(1.25)
    expect(towards(pivot.x + 10, pivot.y - 300)).toBeGreaterThanOrEqual(-0.5)
  })

  it('keeps every number of every pose finite, at any moment', () => {
    for (let i = 0; i < 300; i++) {
      const c = clock(i * 0.37, i * 0.21, i % 2 ? TEMPO.fastest : TEMPO.slowest), age = (i % 40) * 0.05
      const habit = { kind: i % 2, age }
      const lap = i % 3 === 0 ? null : { stage: (['stare', 'fly', 'land'] as const)[i % 3], t: age / 2, beats: i }
      const poses = [
        pigeonPose(c, { poke: age, coo: age / 2, puff: age, strut: age, duck: age * 2, apart: age, shake: age, pant: age * 3, habit }, lap),
        pigeonPose(c, quiet.pigeon), ratPose(c, quiet.rat), catPose(c, quiet.cat), neighbourPose(c, quiet.neighbour),
        ratPose(c, { poke: age, rattle: age / 2, smirk: age, take: age, hush: age, sniff: age, habit }),
        catPose(c, { poke: age, fur: age, ear: age, blink: age, bat: age, habit }),
        cameraPose(c, { poke: age, nod: age, lookX: i, lookY: 820 - i }),
        neighbourPose(c, { poke: age, habit }),
      ]
      for (const pose of poses) for (const value of Object.values(pose)) for (const n of value === null ? [] : typeof value === 'number' ? [value] : Object.values(value as object)) expect(Number.isFinite(n)).toBe(true)
    }
  })

  it('shapes an answer as a rise, a hold and a fall, and is nothing before and after', () => {
    expect(pulse(-1, 0.1, 0.1, 0.1)).toBe(0)
    expect(pulse(0.05, 0.1, 0.1, 0.1)).toBeCloseTo(0.5, 6)
    expect(pulse(0.15, 0.1, 0.1, 0.1)).toBe(1)
    expect(pulse(0.25, 0.1, 0.1, 0.1)).toBeCloseTo(0.5, 6)
    expect(pulse(0.3, 0.1, 0.1, 0.1)).toBe(0)
    expect(pulse(NEVER, 0.1, 0.1, 0.1)).toBe(0)
  })
})
