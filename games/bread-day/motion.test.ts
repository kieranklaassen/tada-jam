import { describe, expect, it } from 'vitest'
import { EVERYONE, LIMITS, Motion, POKES, type Cue, type Pose, type Who } from './motion'

/** Every cue that plays once and ends by itself; `show` and `rest` are a pair and have a test of their own. */
const CUES: readonly Cue[] = ['flour', 'water', 'bubbly', 'seeds', 'flour-over', 'water-over', 'push', 'slap', 'fed', 'door-shut', 'door-open', 'knock', 'fan', 'shrug']
const VOICES = [
  'badger-sneeze', 'badger-grumble', 'badger-chuckle', 'badger-slurp', 'badger-hm', 'sack-rustle', 'jug-clink', 'peel-knock', 'fire-whoosh', 'fire-crackle',
  'burp', 'jar-clink', 'seed-rattle', 'seed-ticks', 'door-clang', 'door-rattle', 'oven-whoosh', 'knock',
]
const REST: Pose = { dx: 0, dy: 0, turn: 0, sx: 1, sy: 1, frame: 0 }
const FRAME = 1 / 60

/** A small stream of the test's own, so what is thrown at the motion is the same every run. */
function stream(seed: number): () => number {
  let state = seed >>> 0
  return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296
}

const all = (motion: Motion): Pose[] => EVERYONE.map((who) => ({ ...motion.pose(who) }))
/** One pose as numbers on a common scale, so a slide, a turn and a squash weigh about the same. */
const weighed = (p: Pose): number[] => [p.dx / 20, p.dy / 20, p.turn / 0.15, (p.sx - 1) / 0.15, (p.sy - 1) / 0.15, p.frame / 2]
const apart = (a: Pose, b: Pose): number => Math.max(...weighed(a).map((v, i) => Math.abs(v - weighed(b)[i])))
/** How alike two curves are, whatever their size: 1 is the same curve or a scaled copy of it. */
function alike(a: number[], b: number[]): number {
  let ab = 0, aa = 0, bb = 0
  for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i] }
  return Math.abs(ab) / Math.sqrt(aa * bb)
}

/**
 * What an input does to `who`, apart from its idle life: the same seed runs twice, one with the input and one
 * without, and the difference is sampled for `seconds`.
 */
function reaction(motion: Motion, twin: Motion, who: Who, seconds: number): number[] {
  const out: number[] = []
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    motion.step(FRAME); twin.step(FRAME)
    const a = weighed(motion.pose(who)), b = weighed(twin.pose(who))
    out.push(...a.map((v, j) => v - b[j]))
  }
  return out
}

/** Every poke variant of everyone, each sampled alone for a second and a half. */
function variants(): { who: Who; name: string; curve: number[] }[] {
  const found: { who: Who; name: string; curve: number[] }[] = []
  for (const who of EVERYONE) {
    const motion = new Motion(7), twin = new Motion(7), seen = new Set<string>()
    for (let tries = 0; tries < 40 && seen.size < POKES[who].length; tries++) {
      const name = motion.poke(who), curve = reaction(motion, twin, who, 1.5)
      if (!seen.has(name)) { seen.add(name); found.push({ who, name, curve }) }
      motion.step(2); twin.step(2)
    }
  }
  return found
}

/** A minute or two of bakery life with pokes and cues thrown in. Returns every pose and every sound, in order. */
function busy(seed: number, seconds: number): { poses: Pose[][]; sounds: string[] } {
  const motion = new Motion(seed), next = stream(seed + 1), poses: Pose[][] = [], sounds: string[] = []
  for (let i = 0; i < seconds * 60; i++) {
    if (next() < 0.04) motion.poke(EVERYONE[Math.floor(next() * EVERYONE.length)])
    if (next() < 0.03) motion.cue(CUES[Math.floor(next() * CUES.length)])
    motion.step(FRAME)
    poses.push(all(motion)); sounds.push(...motion.sounds())
  }
  return { poses, sounds }
}

describe('motion', () => {
  it('is the same for the same seed and the same calls, and a different idle life for another seed', () => {
    expect(busy(11, 30)).toEqual(busy(11, 30))
    const idle = (seed: number) => { const motion = new Motion(seed), poses: Pose[][] = []; for (let i = 0; i < 1200; i++) { motion.step(FRAME); poses.push(all(motion)) } return poses }
    expect(idle(11)).toEqual(idle(11))
    expect(idle(11)).not.toEqual(idle(12))
  })

  it('has everyone exactly at rest at time 0, on the first printed state', () => {
    const motion = new Motion(3)
    for (const who of EVERYONE) expect(motion.pose(who), who).toEqual(REST)
    expect(motion.calm).toBe(true)
    expect(motion.sounds()).toEqual([])
  })

  it('does not care how long a frame is: one step, a hundred and twenty, or uneven ones', () => {
    const run = (cut: (seconds: number) => number[]) => {
      const motion = new Motion(5), sounds: string[] = [], poses: Pose[][] = []
      const go = (seconds: number) => { for (const part of cut(seconds)) motion.step(part); poses.push(all(motion)); sounds.push(...motion.sounds()) }
      motion.poke('badger'); motion.cue('slap'); go(2)
      motion.poke('jar'); motion.cue('push'); motion.cue('fed'); go(2)
      motion.poke('door'); motion.cue('flour'); motion.cue('show'); go(2)
      motion.cue('knock'); go(2)
      motion.cue('rest'); go(2)
      return { poses, sounds }
    }
    const next = stream(9)
    const uneven = (seconds: number) => {
      const parts: number[] = []
      let left = seconds
      while (left > 0.1) { const part = 0.001 + 0.09 * next(); parts.push(part); left -= part }
      return [...parts, left]
    }
    const whole = run((seconds) => [seconds]), even = run((seconds) => Array<number>(120).fill(seconds / 120)), ragged = run(uneven)
    expect(whole.sounds.length).toBeGreaterThan(6)
    for (const other of [even, ragged]) {
      expect(other.sounds).toEqual(whole.sounds)
      other.poses.forEach((poses, i) => poses.forEach((pose, j) => expect(apart(pose, whole.poses[i][j]), `${EVERYONE[j]} after ${i * 2 + 2} s`).toBeLessThan(1e-6)))
    }
  })

  it('keeps every pose finite, modest and on a printed state through two minutes of pokes and cues', () => {
    const { poses, sounds } = busy(21, 120)
    // Counted, and only the first few that are wrong are named: an expect per pose would take seconds.
    const wrong: string[] = []
    let turns = 0, wide = 0
    for (const frame of poses) frame.forEach((pose, i) => {
      const who = EVERYONE[i], states = who === 'badger' ? 2 : 1
      const fine = Object.values(pose).every(Number.isFinite)
        && Math.abs(pose.dx) <= 40 && Math.abs(pose.dy) <= 40 && Math.abs(pose.turn) <= 0.3
        && Math.min(pose.sx, pose.sy) >= 0.8 && Math.max(pose.sx, pose.sy) <= 1.25
        && Number.isInteger(pose.frame) && pose.frame >= 0 && pose.frame < states
      if (!fine && wrong.length < 5) wrong.push(`${who} ${JSON.stringify(pose)}`)
      turns++
      if (Math.abs(pose.turn) > 0.2) wide++
    })
    expect(wrong).toEqual([])
    expect(turns).toBe(120 * 60 * EVERYONE.length)
    // A turn is rarely over a fifth of a radian.
    expect(wide / turns).toBeLessThan(0.01)
    expect(LIMITS).toEqual({ slide: 40, turn: 0.3, small: 0.8, big: 1.25 })
    expect([...new Set(sounds)].sort()).toEqual([...VOICES].sort())
  })

  it('ends every reaction: three seconds after any poke or cue all is calm and only idle life is left', () => {
    const inputs: [string, (motion: Motion) => void][] = [
      ...EVERYONE.flatMap((who) => [0, 1, 2, 3].map((n): [string, (motion: Motion) => void] => [`poke ${who} ${n}`, (motion) => { motion.poke(who) }])),
      ...CUES.flatMap((cue) => [0, 1, 2].map((n): [string, (motion: Motion) => void] => [`cue ${cue} ${n}`, (motion) => motion.cue(cue)])),
    ]
    const motion = new Motion(31), twin = new Motion(31)
    for (const [label, input] of inputs) {
      input(motion)
      expect(motion.calm, label).toBe(false)
      let moved = 0
      for (let i = 0; i < 180; i++) {
        motion.step(FRAME); twin.step(FRAME)
        EVERYONE.forEach((who) => { moved = Math.max(moved, apart(motion.pose(who), twin.pose(who))) })
      }
      // Something was seen to move, and then all of it went back.
      expect(moved, label).toBeGreaterThan(0.05)
      expect(motion.calm, label).toBe(true)
      EVERYONE.forEach((who) => expect(apart(motion.pose(who), twin.pose(who)), `${label}: ${who}`).toBeLessThan(1e-9))
    }
  })

  it('gives no two characters the same poke, nor a scaled copy of one', () => {
    const found = variants()
    for (const who of EVERYONE) expect(found.filter((one) => one.who === who).map((one) => one.name).sort(), who).toEqual([...POKES[who]].sort())
    for (const who of EVERYONE) expect(POKES[who].length, who).toBeGreaterThanOrEqual(who === 'badger' ? 3 : 2)
    let closest = 0
    for (const a of found) for (const b of found) {
      if (a.who >= b.who) continue
      const likeness = alike(a.curve, b.curve)
      closest = Math.max(closest, likeness)
      expect(likeness, `${a.who} ${a.name} and ${b.who} ${b.name}`).toBeLessThan(0.98)
    }
    expect(closest).toBeGreaterThan(0)
    // One character's own variants are different moves too.
    for (const a of found) for (const b of found) if (a.who === b.who && a.name < b.name) expect(alike(a.curve, b.curve), `${a.who}: ${a.name} and ${b.name}`).toBeLessThan(0.9)
  })

  it('never answers a poke the same way twice running, and uses every variant', () => {
    for (const who of EVERYONE) {
      const motion = new Motion(51), names: string[] = []
      for (let i = 0; i < 30; i++) { names.push(motion.poke(who)); motion.step(0.4 + (i % 5) * 0.5) }
      for (let i = 1; i < names.length; i++) expect(names[i], `${who} poke ${i}`).not.toBe(names[i - 1])
      expect([...new Set(names)].sort(), who).toEqual([...POKES[who]].sort())
    }
  })

  it('moves the idle bakery at each one\'s own tempo, and leaves the props still', () => {
    const motion = new Motion(71), busiest = EVERYONE.map(() => 0), blinks: number[] = []
    let blinking = false
    for (let i = 0; i < 60 * 60; i++) {
      motion.step(FRAME)
      EVERYONE.forEach((who, n) => { busiest[n] = Math.max(busiest[n], apart(motion.pose(who), REST)) })
      const shut = motion.pose('badger').frame === 1
      if (shut && !blinking) blinks.push(i)
      blinking = shut
      expect(motion.calm).toBe(true)
    }
    for (const who of ['sack', 'jug', 'jar', 'dish', 'peel', 'door'] as const) expect(busiest[EVERYONE.indexOf(who)], who).toBe(0)
    for (const who of ['badger', 'fire'] as const) expect(busiest[EVERYONE.indexOf(who)], who).toBeGreaterThan(0.05)
    // The badger blinks now and then, never at the start and never on a beat.
    expect(blinks.length).toBeGreaterThan(8)
    expect(blinks[0]).toBeGreaterThan(30)
    expect(new Set(blinks.slice(1).map((at, i) => at - blinks[i])).size).toBeGreaterThan(blinks.length / 2)
  })

  it('sneezes at about one tip of flour in three, and never twice running', () => {
    const motion = new Motion(81), sneezes: boolean[] = []
    for (let i = 0; i < 150; i++) {
      motion.cue('flour')
      expect(motion.pose('sack')).toEqual(REST)
      motion.step(0.2)
      expect(motion.pose('sack').sy).toBeLessThan(0.9)
      motion.step(1.4)
      sneezes.push(motion.sounds().includes('badger-sneeze'))
      motion.step(1.4)
    }
    const count = sneezes.filter(Boolean).length
    expect(count).toBeGreaterThan(35)
    expect(count).toBeLessThan(65)
    for (let i = 1; i < sneezes.length; i++) expect(sneezes[i] && sneezes[i - 1], `tips ${i - 1} and ${i}`).toBe(false)
  })

  it('answers each cue in the right body', () => {
    const lean = (motion: Motion, twin: Motion) => twin.pose('badger').turn - motion.pose('badger').turn
    const motion = new Motion(91), twin = new Motion(91)
    // Pushes that keep coming hold the badger's lean, and it eases back after the last.
    for (let i = 0; i < 12; i++) { motion.cue('push'); motion.step(0.25); twin.step(0.25); if (i > 1) expect(lean(motion, twin), `push ${i}`).toBeGreaterThan(0.04) }
    motion.step(0.3); twin.step(0.3)
    expect(lean(motion, twin)).toBeGreaterThan(0.04)
    motion.step(1); twin.step(1)
    expect(lean(motion, twin)).toBeCloseTo(0, 9)
    expect(motion.calm).toBe(true)

    // A slap: the peel jumps at once, and the sack, the jar, the jug and the dish follow, each after its own beat.
    motion.cue('slap')
    const first = new Map<Who, number>(), high = new Map<Who, number>()
    for (let i = 1; i <= 90; i++) {
      motion.step(FRAME); twin.step(FRAME)
      for (const who of ['peel', 'sack', 'jar', 'jug', 'dish'] as const) {
        const up = twin.pose(who).dy - motion.pose(who).dy
        if (up > 0.3 && !first.has(who)) first.set(who, i)
        high.set(who, Math.max(high.get(who) ?? 0, up))
      }
    }
    expect([...first.keys()]).toEqual(['peel', 'sack', 'jar', 'jug', 'dish'])
    expect(new Set(first.values()).size).toBe(5)
    expect(high.get('peel')).toBeGreaterThan(high.get('sack')!)
    expect(high.get('sack')).toBeGreaterThan(high.get('jug')!)
    expect(motion.sounds()).toEqual([])

    // The rest, each by its plainest sign.
    const peak = (cue: Cue, who: Who, read: (now: Pose, idle: Pose) => number): number => {
      const one = new Motion(92), other = new Motion(92)
      one.cue(cue)
      let most = 0
      for (let i = 0; i < 150; i++) { one.step(FRAME); other.step(FRAME); most = Math.max(most, read(one.pose(who), other.pose(who))) }
      return most
    }
    expect(peak('water', 'jug', (now) => now.turn)).toBeGreaterThan(0.12)
    expect(peak('water-over', 'badger', (now, idle) => idle.dy - now.dy)).toBeGreaterThan(15)
    expect(peak('flour-over', 'badger', (now, idle) => now.turn - idle.turn)).toBeGreaterThan(0.07)
    expect(peak('flour-over', 'badger', (now, idle) => idle.turn - now.turn)).toBeGreaterThan(0.07)
    expect(peak('fed', 'badger', (now, idle) => idle.turn - now.turn)).toBeGreaterThan(0.06)
    // The jar tips toward the board and the dish tilts, both to their left; the door goes flat when it shuts and narrow when it swings.
    expect(peak('bubbly', 'jar', (now) => -now.turn)).toBeGreaterThan(0.12)
    expect(peak('seeds', 'dish', (now) => -now.turn)).toBeGreaterThan(0.1)
    expect(peak('door-shut', 'door', (now) => 1 - now.sx)).toBeGreaterThan(0.05)
    expect(peak('door-open', 'door', (now) => 1 - now.sx)).toBeGreaterThan(0.1)
    expect(peak('knock', 'badger', (now, idle) => idle.turn - now.turn)).toBeGreaterThan(0.07)
    expect(peak('fan', 'badger', (now, idle) => Math.abs(now.turn - idle.turn))).toBeGreaterThan(0.04)
    expect(peak('shrug', 'badger', (now, idle) => now.sy - idle.sy)).toBeGreaterThan(0.03)
    const heard = (cue: Cue, seconds: number): string[] => { const one = new Motion(93); one.cue(cue); one.step(seconds); return one.sounds() }
    expect(heard('fed', 0.5)).toEqual(['badger-slurp'])
    expect(heard('door-shut', 0.5)).toEqual(['door-clang'])
    expect(heard('door-open', 0.5)).toEqual(['oven-whoosh'])
    expect(heard('knock', 0.6)).toEqual(['knock'])
    expect(heard('knock', 1.5)).toEqual(['knock', 'knock'])
  })

  it('keeps the badger at its own lump from `show` until `rest`, and then lets it go', () => {
    const motion = new Motion(95), twin = new Motion(95)
    const bent = () => twin.pose('badger').sy - motion.pose('badger').sy
    motion.cue('show')
    expect(motion.calm).toBe(false)
    const depths = new Set<string>()
    for (let i = 0; i < 20 * 60; i++) {
      motion.step(FRAME); twin.step(FRAME)
      if (i < 30) continue
      // Still bent over it after twenty seconds, and patting: never frozen in one place.
      expect(bent()).toBeGreaterThan(0.03)
      expect(twin.pose('badger').turn - motion.pose('badger').turn).toBeGreaterThan(0.03)
      depths.add(bent().toFixed(3))
      expect(motion.calm).toBe(false)
    }
    expect(depths.size).toBeGreaterThan(10)
    // A second `show` while it shows changes nothing.
    const before = { ...motion.pose('badger') }
    motion.cue('show')
    expect(motion.pose('badger')).toEqual(before)
    motion.cue('rest'); motion.step(1); twin.step(1)
    expect(motion.calm).toBe(true)
    expect(apart(motion.pose('badger'), twin.pose('badger'))).toBeLessThan(1e-9)
    expect(motion.sounds()).toEqual([])
  })
})
