import { describe, expect, it } from 'vitest'
import { KINDS } from './cloth'
import { CLAPS, GUST_EVERY, HICCUPS, JUMPER_STRETCH, LASTS, SLEEVE, SLEEVES_IN, SNEEZED, STRETCH, STRIDE, TEMPO, idle, linePose, nextVariant, railPose, react, stretched, tubPose, walk, windAt, type Hang, type Happening, type Pose, type Who } from './motion'

const WHO: Who[] = ['pig', 'heron', 'goat', 'cat']
const FRIENDS = ['pig', 'heron', 'goat'] as const
const HAPPENINGS = Object.keys(LASTS) as Happening[]
const KEYS: (keyof Pose)[] = ['bob', 'squash', 'lean', 'head', 'armL', 'armR', 'leg', 'ear', 'tail', 'jaw', 'blink', 'own', 'spin', 'neck', 'fold', 'hitch']
/** What every character may meet: the rest are the answers of one friend's taste, or of the friends alone. */
const SHARED: Happening[] = ['poke', 'toss', 'catch', 'splat', 'dripped', 'tickle', 'pegged', 'refuse', 'arrive', 'bonk', 'climb', 'tubrub', 'don', 'patch', 'squelch', 'bubbly', 'proud']
const HANG: Exclude<keyof Hang, 'sleeves'>[] = ['dx', 'dy', 'turn', 'sx', 'sy', 'bobble']
const hangTrace = (pose: (t: number) => Hang, seconds: number) => {
  const out: string[] = []
  for (let t = 0; t <= seconds; t += 0.1) out.push(HANG.map((key) => pose(t)[key].toFixed(3)).join(','))
  return out.join('|')
}

/** A pose sampled over time, as one string to compare. */
const trace = (pose: (t: number) => Pose, seconds: number) => {
  const out: string[] = []
  for (let t = 0; t <= seconds; t += 0.05) out.push(KEYS.map((key) => pose(t)[key].toFixed(3)).join(','))
  return out.join('|')
}

const finite = (pose: Pose) => KEYS.every((key) => Number.isFinite(pose[key]))

describe('each character at rest', () => {
  it('has a tempo of its own', () => {
    const tempos = WHO.map((who) => TEMPO[who])
    expect(new Set(tempos).size).toBe(WHO.length)
    tempos.forEach((a, i) => tempos.forEach((b, j) => { if (i !== j) expect(Math.abs(a - b) / Math.max(a, b)).toBeGreaterThan(0.2) }))
  })

  it.each(WHO)('%s is alive: it moves while nobody touches it', (who) => {
    const poses = Array.from({ length: 240 }, (_, n) => idle(who, n * 0.05))
    expect(poses.every(finite)).toBe(true)
    const moving = KEYS.filter((key) => key !== 'blink' && new Set(poses.map((pose) => pose[key].toFixed(3))).size > 3)
    expect(moving.length).toBeGreaterThanOrEqual(2)
    expect(poses.some((pose) => pose.blink > 0.5)).toBe(true)
    expect(poses.some((pose) => pose.blink < 0.5)).toBe(true)
  })

  it('no two characters share an idle', () => {
    const traces = WHO.map((who) => trace((t) => idle(who, t), 12))
    expect(new Set(traces).size).toBe(WHO.length)
  })

  it('stays small: an idle never throws a body about', () => {
    for (const who of WHO) for (let t = 0; t < 30; t += 0.05) {
      const pose = idle(who, t)
      expect(Math.abs(pose.bob)).toBeLessThan(14)
      expect(Math.abs(pose.lean)).toBeLessThan(0.2)
      expect(Math.abs(pose.squash)).toBeLessThan(0.12)
    }
  })
})

describe('each character answering', () => {
  const answer = (who: Who, what: Happening, variant: number) => (age: number) => react(who, what, variant, age, idle(who, 0))

  it.each(WHO)('%s answers a poke in three different ways', (who) => {
    const ways = [0, 1, 2].map((variant) => trace(answer(who, 'poke', variant), LASTS.poke))
    expect(new Set(ways).size).toBe(3)
    for (const way of ways) expect(way).not.toBe(trace(() => idle(who, 0), LASTS.poke))
  })

  it('no two friends answer the same happening alike', () => {
    for (const what of SHARED) {
      const traces = FRIENDS.map((who) => trace(answer(who, what, 0), LASTS[what]))
      expect(new Set(traces).size, what).toBe(FRIENDS.length)
    }
  })

  it('every friend moves at everything that can happen to it', () => {
    const own: Record<string, Happening[]> = { pig: ['strut', 'trip'], heron: ['plank', 'preen', 'shudder'], goat: ['lick', 'sneeze', 'pleased'] }
    for (const who of FRIENDS) for (const what of [...SHARED, ...own[who]]) {
      expect(trace(answer(who, what, 0), LASTS[what]), `${who} ${what}`).not.toBe(trace(() => idle(who, 0), LASTS[what]))
    }
  })

  it("a friend's answers to what it wears differ from each other", () => {
    const own: Record<string, Happening[]> = { pig: ['strut', 'trip', 'proud', 'patch', 'squelch', 'bubbly'], heron: ['plank', 'preen', 'shudder', 'proud', 'patch', 'squelch', 'bubbly'], goat: ['lick', 'sneeze', 'pleased', 'proud', 'patch', 'squelch', 'bubbly'] }
    // Sampled over the same stretch, so two answers differ in how they move and not only in how long they run.
    for (const who of FRIENDS) expect(new Set(own[who].map((what) => trace(answer(who, what, 0), 1.1))).size, who).toBe(own[who].length)
  })

  it('an answer is finite, begins from the idle pose and has gone when its time is up', () => {
    for (const who of WHO) for (const what of HAPPENINGS) for (const variant of [0, 1, 2]) {
      const rest = idle(who, 0)
      for (let age = 0; age <= LASTS[what]; age += 0.02) expect(finite(react(who, what, variant, age, idle(who, 0)))).toBe(true)
      const after = react(who, what, variant, LASTS[what] + 0.01, idle(who, 0))
      for (const key of KEYS) expect(after[key]).toBe(rest[key])
      const last = react(who, what, variant, LASTS[what], idle(who, 0))
      // A spin that has gone once round stands as it stood.
      expect(Math.abs(last.spin - Math.round(last.spin)), `${who} ${what} spin`).toBeLessThan(0.02)
      for (const key of KEYS) if (key !== 'blink' && key !== 'spin') expect(Math.abs(last[key] - rest[key]), `${who} ${what} ${key}`).toBeLessThan(0.02 + Math.abs(rest[key]) * 0.1 + (key === 'bob' ? 1 : 0))
    }
  })
})

describe('each friend walking', () => {
  it('has a stride of its own, and a walk no other has', () => {
    expect(new Set(FRIENDS.map((who) => STRIDE[who])).size).toBe(3)
    const traces = FRIENDS.map((who) => trace((t) => walk(who, t * 2, idle(who, 0)), 3))
    expect(new Set(traces).size).toBe(3)
    for (const who of FRIENDS) for (let steps = 0; steps < 8; steps += 0.07) expect(finite(walk(who, steps, idle(who, 0)))).toBe(true)
  })
})

describe('the heron by its taste', () => {
  it('in a tight thing it walks as stiff as a plank: wings out, no knee, no neck, rocking from foot to foot', () => {
    const leans = new Set<number>()
    for (let steps = 0; steps < 4; steps += 0.125) {
      const pose = walk('heron', steps, idle('heron', steps), true), loose = walk('heron', steps, idle('heron', steps))
      expect(pose.armL).toBeLessThanOrEqual(loose.armL - 1.1)
      expect(pose.armR).toBeGreaterThanOrEqual(loose.armR + 1.1)
      expect(pose.leg).toBe(0)
      expect(pose.head).toBe(0)
      leans.add(Math.round(pose.lean * 100))
    }
    expect(leans.size).toBeGreaterThan(4)
    // The pig and the goat have no such walk: tight is what the pig likes.
    for (const who of ['pig', 'goat'] as const) expect(walk(who, 1.3, idle(who, 1), true)).toEqual(walk(who, 1.3, idle(who, 1)))
  })

  it('it shudders harder at a damp thing with sleeves: wings wider, and the whole bird shakes', () => {
    let wider = 0, shakes = 0
    for (let age = 0.1; age < LASTS.shudder - 0.1; age += 0.05) {
      const plain = react('heron', 'shudder', 0, age, idle('heron', age)), sleeves = react('heron', 'shudder', 1, age, idle('heron', age))
      if (sleeves.armR > plain.armR + 0.05) wider += 1
      if (Math.abs(sleeves.bob - plain.bob) > 0.5) shakes += 1
    }
    expect(wider).toBeGreaterThan(3)
    expect(shakes).toBeGreaterThan(3)
  })
})

describe('each garment at each station', () => {
  it('in the tub: no two go in alike, and each has settled after a while', () => {
    const traces = KINDS.map((kind) => hangTrace((t) => tubPose(kind, t, t), 3))
    expect(new Set(traces).size).toBe(KINDS.length)
    for (const kind of KINDS) for (let t = 0; t < 6; t += 0.1) for (const key of HANG) expect(Number.isFinite(tubPose(kind, t, t)[key]), kind).toBe(true)
  })

  it('on the rail: no two wring alike, and none has moved before it is wrung', () => {
    const traces = KINDS.map((kind) => hangTrace((twist) => railPose(kind, twist / 3), 3))
    expect(new Set(traces).size).toBe(KINDS.length)
    for (const kind of KINDS) for (const key of HANG) expect(railPose(kind, 0)[key], kind).toBeCloseTo(key === 'sx' || key === 'sy' ? 1 : 0)
  })

  it('on the line: no two hang alike in the same wind', () => {
    const traces = KINDS.map((kind) => hangTrace((t) => linePose(kind, t, windAt(t), t % GUST_EVERY, 6, true, true), 12))
    expect(new Set(traces).size).toBe(KINDS.length)
  })

  it('on the line: one peg hangs it crooked, to the side of the peg that holds', () => {
    for (const kind of KINDS) {
      const both = linePose(kind, 1, 0, 5, 0, true, true), left = linePose(kind, 1, 0, 5, 0, true, false), right = linePose(kind, 1, 0, 5, 0, false, true)
      expect(left.dx, kind).toBeLessThan(both.dx)
      expect(right.dx, kind).toBeGreaterThan(both.dx)
      expect(left.turn - both.turn, kind).toBeGreaterThan(0.2)
      expect(right.turn - both.turn, kind).toBeLessThan(-0.2)
    }
  })

  it('the wind is a breath: it stays between its ends and changes sides', () => {
    let low = 0, high = 0
    for (let t = 0; t < 60; t += 0.1) { const wind = windAt(t); expect(Math.abs(wind)).toBeLessThanOrEqual(1); low = Math.min(low, wind); high = Math.max(high, wind) }
    expect(low).toBeLessThan(-0.5)
    expect(high).toBeGreaterThan(0.5)
  })
})

describe('which way next', () => {
  it('never the one before, and always one of them', () => {
    for (let last = -1; last < 3; last++) for (let r = 0; r < 1; r += 0.05) {
      const next = nextVariant(last, 3, r)
      expect([0, 1, 2]).toContain(next)
      expect(next).not.toBe(last)
    }
  })

  it('reaches every way', () => {
    const seen = new Set<number>()
    for (let r = 0; r < 1; r += 0.05) seen.add(nextVariant(-1, 3, r))
    expect(seen.size).toBe(3)
    const after = new Set<number>()
    for (let r = 0; r < 1; r += 0.05) after.add(nextVariant(0, 3, r))
    expect(after).toEqual(new Set([1, 2]))
  })
})

describe('the sheet, sentence by sentence: what a third reader found missing', () => {
  it("the shirt's sleeves are pieces of their own: they float up and spread in the tub, wind in on the rail, and wave and clap on the line", () => {
    // As it lands in the tub the sleeves lie as the shirt is cut; then both rise well above the shoulders and keep moving.
    expect(tubPose('shirt', 0, 0).sleeves.every((out) => Math.abs(out - SLEEVE) < 0.15)).toBe(true)
    for (let t = 2; t < 12; t += 0.25) expect(tubPose('shirt', t, t).sleeves.every((out) => out > Math.PI / 2 + 0.2)).toBe(true)
    expect(new Set(Array.from({ length: 20 }, (_, n) => tubPose('shirt', 3 + n * 0.2, 3 + n * 0.2).sleeves[0].toFixed(2))).size).toBeGreaterThan(5)
    // The body fills: wider and deeper than it landed.
    expect(tubPose('shirt', 2, 2).sx).toBeGreaterThan(tubPose('shirt', 0, 0).sx)
    expect(tubPose('shirt', 2, 2).sy).toBeGreaterThan(tubPose('shirt', 0, 0).sy)
    // On the rail they come in with every squeeze until one cuff lies over the other.
    expect(railPose('shirt', 0).sleeves).toEqual([SLEEVE, SLEEVE])
    expect(railPose('shirt', 1).sleeves).toEqual([SLEEVES_IN, SLEEVES_IN])
    let last = SLEEVE + 0.001
    for (let twist = 0.1; twist <= 1.001; twist += 0.1) { const now = railPose('shirt', twist).sleeves[0]; expect(now).toBeLessThan(last); last = now }
    // On the line each waves at its own beat and never crosses the front by itself.
    const waved = Array.from({ length: 200 }, (_, n) => linePose('shirt', n * 0.05, windAt(n * 0.05), 5, 0, true, true).sleeves)
    expect(new Set(waved.map((sleeves) => sleeves[0].toFixed(2))).size).toBeGreaterThan(10)
    expect(waved.some((sleeves) => Math.abs(sleeves[0] - sleeves[1]) > 0.2)).toBe(true)
    expect(waved.every((sleeves) => sleeves.every((out) => out > 0.3))).toBe(true)
    // At each of the three claps its voice has, the cuffs meet in front of it, and between two claps they are apart.
    for (const at of CLAPS) for (const out of linePose('shirt', 1, 0.2, 5, 0, true, true, at).sleeves) expect(out).toBeCloseTo(SLEEVES_IN, 9)
    for (const at of [0.08, 0.25, 0.45]) expect(linePose('shirt', 1, 0.2, 5, 0, true, true, at).sleeves.every((out) => out > 0.3)).toBe(true)
    // No other garment has sleeves that move.
    for (const kind of KINDS) if (kind !== 'shirt') for (const pose of [tubPose(kind, 2, 2), railPose(kind, 1), linePose(kind, 1, 0.5, 0.2, 5, true, true, 0)]) expect(pose.sleeves).toEqual([SLEEVE, SLEEVE])
  })

  it('the goat hops once at each hiccup, with its mouth open, and stands between them', () => {
    const rest = idle('goat', 0)
    const at = (age: number) => react('goat', 'lick', 0, age, idle('goat', 0))
    expect(HICCUPS).toHaveLength(3)
    for (const hiccup of HICCUPS) {
      expect(at(hiccup + 0.09).bob).toBeLessThan(rest.bob - 15)
      expect(at(hiccup + 0.07).jaw).toBeGreaterThan(0.5)
      expect(at(hiccup + 0.14).own).toBeGreaterThan(rest.own + 1)
    }
    for (let n = 1; n < HICCUPS.length; n++) expect(Math.abs(at((HICCUPS[n - 1] + 0.18 + HICCUPS[n]) / 2).bob - rest.bob)).toBeLessThan(1)
    expect(HICCUPS[HICCUPS.length - 1] + 0.28).toBeLessThan(LASTS.lick)
    // In the tub it is one mouthful and one hiccup.
    expect(react('goat', 'tubrub', 0, 0.39, idle('goat', 0)).bob).toBeLessThan(rest.bob - 12)
  })

  it('the goat at the stretch of its neck: head up off its shoulders and nose turned away, by as much as it is asked', () => {
    const rest = idle('goat', 0)
    const full = stretched(idle('goat', 0), 1), half = stretched(idle('goat', 0), 0.5)
    expect(full.neck - rest.neck).toBe(STRETCH)
    expect(STRETCH).toBeGreaterThan(30)
    expect(full.head).toBeLessThan(rest.head - 0.25)
    expect(half.neck - rest.neck).toBe(STRETCH / 2)
    // The sneeze itself leaves the neck alone: the stretch is the wearing, and lasts as long as that does.
    for (let age = 0; age < LASTS.sneeze; age += 0.05) expect(react('goat', 'sneeze', 0, age, idle('goat', 0)).neck).toBe(rest.neck)
    expect(SNEEZED).toBeLessThan(LASTS.sneeze)
  })

  it("the pig hitches a loose thing up as it trips and lets it slide down again, and nobody else's answer does", () => {
    const hitch = Array.from({ length: 40 }, (_, n) => react('pig', 'trip', 0, n * 0.05, idle('pig', 0)).hitch)
    expect(Math.max(...hitch)).toBeGreaterThan(20)
    expect(Math.min(...hitch)).toBeLessThan(-5)
    expect(Math.abs(react('pig', 'trip', 0, LASTS.trip, idle('pig', 0)).hitch)).toBeLessThan(0.5)
    for (const who of FRIENDS) for (const what of HAPPENINGS) if (what !== 'trip') expect(react(who, what, 0, 0.3, idle(who, 0)).hitch).toBe(0)
  })

  it('the wet jumper stretches down with its water, more for each tenth', () => {
    let last = linePose('jumper', 0, 0, 5, 0, true, true)
    for (let wet = 1; wet <= 10; wet++) {
      const now = linePose('jumper', 0, 0, 5, wet, true, true)
      expect(now.sy).toBeGreaterThan(last.sy)
      expect(now.dy).toBeGreaterThan(last.dy)
      last = now
    }
    expect(last.sy).toBeCloseTo(1 + JUMPER_STRETCH.sy * 10, 9)
  })
})
