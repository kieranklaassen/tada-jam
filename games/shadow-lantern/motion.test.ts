import { describe, expect, it } from 'vitest'
import { buildCreature, CREATURE_ORDER } from './creatures'
import { blankPose, FLIGHT_Z, flightDepth, flightScale, peelPose, PERSONALITIES, restPose, SKY_HOMES, SKY_Z, skyDepth, skyScale, type CreaturePose, type Ring, type SleepPose } from './motion'
import { clearOfProscenium, PROSCENIUM } from './projection'

const KINDS = CREATURE_ORDER
const FROM = { x: -6, y: 22 }

function sleepPose(): SleepPose {
  return { sx: 1, sy: 1, dx: 0, dy: 0, roll: 0, part: 0, partLift: 0 }
}

function rings(): Ring[] {
  return [0, 1, 2, 3].map(() => ({ x: 0, y: 0, r: 0, alpha: 0 }))
}

function finitePose(pose: object): boolean {
  return Object.values(pose).every((v) => typeof v !== 'number' || Number.isFinite(v))
}

/** Total movement of the sleeping outline over ten seconds at a given stir. */
function restlessness(kind: (typeof KINDS)[number], stir: number): number {
  const p = sleepPose()
  let prev = { part: 0, roll: 0, dx: 0 }
  let total = 0
  for (let t = 0; t < 10; t += 1 / 30) {
    PERSONALITIES[kind].sleep(t, stir, p)
    total += Math.abs(p.part - prev.part) + Math.abs(p.roll - prev.roll) + Math.abs(p.dx - prev.dx) * 0.1
    prev = { part: p.part, roll: p.roll, dx: p.dx }
  }
  return total
}

const rms = (xs: number[]) => Math.sqrt(xs.reduce((sum, v) => sum + v * v, 0) / xs.length)

/** How unlike two traces are, 0 for a copy. Scale-free: the snail and the fox both barely move, yet move nothing alike. */
function apart(a: number[], b: number[]): number {
  return rms(a.map((v, i) => v - b[i])) / Math.max(rms(a), rms(b))
}

/** A routine sampled over k = 0..1 in 51 steps, one array per channel. */
function sampleChannels(fill: (k: number, pose: CreaturePose) => number[]): number[][] {
  const channels: number[][] = []
  const pose = blankPose()
  for (let i = 0; i <= 50; i++) {
    restPose(pose)
    fill(i / 50, pose).forEach((v, c) => (channels[c] ??= []).push(v))
  }
  return channels
}

/** The journey home stretched to one length: its detour from a straight line, and what the body does on the way. */
function gaitChannels(kind: (typeof KINDS)[number]): number[][] {
  const home = SKY_HOMES[0]
  return sampleChannels((k, pose) => {
    PERSONALITIES[kind].gait(k, FROM.x, FROM.y, home.x, home.y, pose)
    return [pose.x - (FROM.x + (home.x - FROM.x) * k), pose.y - (FROM.y + (home.y - FROM.y) * k), pose.part, pose.roll, pose.spin, pose.sx - 1, pose.sy - 1]
  })
}

/** The tap reaction stretched to one length, on a creature at rest at the origin. */
function reactChannels(kind: (typeof KINDS)[number]): number[][] {
  return sampleChannels((k, pose) => {
    pose.x = 0
    pose.y = 0
    PERSONALITIES[kind].react(k, pose)
    return [pose.x, pose.y, pose.part, pose.partLift, pose.roll, pose.spin, pose.sx - 1, pose.sy - 1]
  })
}

/** Each channel scaled by its size across all six creatures (dropping any nobody moves), laid end to end, so centimetres do not drown out angles. */
function comparable(all: number[][][]): number[][] {
  const scales = all[0].map((_, c) => rms(all.flatMap((channels) => channels[c])))
  return all.map((channels) => channels.flatMap((values, c) => (scales[c] > 1e-9 ? values.map((v) => v / scales[c]) : [])))
}

/** The idle as a trace of offsets from home, part angle and roll. */
function idleTrace(kind: (typeof KINDS)[number]): number[] {
  const home = SKY_HOMES[0]
  const pose = blankPose()
  const trace: number[] = []
  for (let t = 0; t < 12; t += 0.1) {
    restPose(pose)
    PERSONALITIES[kind].idle(t, home.x, home.y, pose)
    trace.push(pose.x - home.x, pose.y - home.y, pose.part, pose.partLift, pose.roll, pose.sx - 1, pose.sy - 1)
  }
  return trace
}

describe('motion personalities', () => {
  it('every routine stays finite and in range over a long session', () => {
    const r = rings()
    for (const kind of KINDS) {
      const p = PERSONALITIES[kind]
      const sleep = sleepPose()
      const pose = blankPose()
      for (let t = 0; t < 120; t += 0.37) {
        for (const stir of [0, 0.5, 1]) {
          p.sleep(t, stir, sleep)
          expect(finitePose(sleep), `${kind} sleep`).toBe(true)
          expect(Math.abs(sleep.sx - 1), `${kind} sleep squash`).toBeLessThan(0.1)
          const n = p.rings(t, stir, r)
          expect(n, `${kind} rings`).toBeLessThanOrEqual(4)
          for (let i = 0; i < n; i++) {
            expect(r[i].r, `${kind} ring radius`).toBeGreaterThan(0)
            expect(r[i].alpha, `${kind} ring alpha`).toBeGreaterThanOrEqual(0)
            expect(r[i].alpha, `${kind} ring alpha`).toBeLessThanOrEqual(1)
          }
        }
        restPose(pose)
        p.idle(t, 0, 50, pose)
        expect(finitePose(pose), `${kind} idle`).toBe(true)
        expect(pose.eye, `${kind} eye`).toBeGreaterThanOrEqual(0)
        expect(pose.eye, `${kind} eye`).toBeLessThanOrEqual(1)
        expect(p.skyRings(t, r), `${kind} sky rings`).toBeLessThanOrEqual(4)
      }
      for (let k = 0; k <= 1; k += 0.01) {
        restPose(pose)
        p.anticipate(k, pose)
        expect(finitePose(pose), `${kind} anticipate`).toBe(true)
        p.gait(k, FROM.x, FROM.y, 30, 55, pose)
        expect(finitePose(pose), `${kind} gait`).toBe(true)
        restPose(pose)
        p.react(k, pose)
        expect(finitePose(pose), `${kind} react`).toBe(true)
      }
    }
  })

  it('each creature blinks now and then while idle in the sky', () => {
    for (const kind of KINDS) {
      const pose = blankPose()
      let shut = 1
      for (let t = 0; t < 10; t += 1 / 60) {
        PERSONALITIES[kind].idle(t, 0, 50, pose)
        shut = Math.min(shut, pose.eye)
      }
      expect(shut, kind).toBeLessThan(0.3)
    }
  })

  it('a sleeper grows restless as its outline fills', () => {
    for (const kind of KINDS) expect(restlessness(kind, 1), kind).toBeGreaterThan(restlessness(kind, 0) * 1.5)
  })

  it('the journey starts where the peel left off and lands exactly where the idle begins', () => {
    for (const kind of KINDS) {
      const p = PERSONALITIES[kind]
      SKY_HOMES.forEach((home) => {
        const pose = blankPose()
        p.gait(0, FROM.x, FROM.y, home.x, home.y, pose)
        expect(Math.hypot(pose.x - FROM.x, pose.y - FROM.y), `${kind} leaves from the peel`).toBeLessThan(0.05)
        p.gait(1, FROM.x, FROM.y, home.x, home.y, pose)
        const landed = { x: pose.x, y: pose.y }
        restPose(pose)
        p.idle(0, home.x, home.y, pose)
        expect(Math.hypot(landed.x - pose.x, landed.y - pose.y), `${kind} hands over to the idle`).toBeLessThan(0.05)
      })
    }
  })

  it('a tap reaction starts and ends on the idle, so nothing pops: body, wing or tail, or squash', () => {
    const home = SKY_HOMES[0]
    for (const kind of KINDS) {
      const p = PERSONALITIES[kind]
      for (const t of [0.3, 1.7, 4.1]) {
        const idle = blankPose()
        p.idle(t, home.x, home.y, idle)
        for (const k of [0, 1]) {
          const pose = blankPose()
          p.idle(t, home.x, home.y, pose)
          p.react(k, pose)
          const at = `${kind} at k=${k}, t=${t}`
          expect(Math.hypot(pose.x - idle.x, pose.y - idle.y), at).toBeLessThan(1e-6)
          expect(Math.cos(pose.roll - idle.roll), `${at} roll`).toBeCloseTo(1, 6)
          expect(Math.cos(pose.spin - idle.spin), `${at} spin`).toBeCloseTo(1, 6)
          expect(pose.part, `${at} part`).toBeCloseTo(idle.part, 6)
          expect(pose.sx, `${at} sx`).toBeCloseTo(idle.sx, 6)
          expect(pose.sy, `${at} sy`).toBeCloseTo(idle.sy, 6)
        }
      }
    }
  })

  it('a tap reaction moves smoothly all the way through', () => {
    const home = SKY_HOMES[0]
    const step = 1 / 120
    for (const kind of KINDS) {
      const p = PERSONALITIES[kind]
      const pose = blankPose()
      let prev: CreaturePose | null = null
      for (let k = 0; k <= 1 + 1e-9; k += step / p.reactSeconds) {
        restPose(pose)
        p.idle(2, home.x, home.y, pose)
        p.react(Math.min(1, k), pose)
        if (prev) {
          expect(Math.abs(pose.sx - prev.sx), `${kind} sx near k=${k.toFixed(3)}`).toBeLessThan(0.05)
          expect(Math.abs(pose.sy - prev.sy), `${kind} sy near k=${k.toFixed(3)}`).toBeLessThan(0.05)
          // A fast flutter turns a wing about 0.2 rad per step; a pop is a jump of the whole swing.
          expect(Math.abs(pose.part - prev.part), `${kind} part near k=${k.toFixed(3)}`).toBeLessThan(0.3)
        }
        prev = { ...pose }
      }
    }
  })

  it('only the fox turns round when tapped, halfway through its leap', () => {
    for (const kind of KINDS) {
      const pose = blankPose()
      const flips = [0.2, 0.6].map((k) => PERSONALITIES[kind].react(k, pose))
      expect(flips, kind).toEqual(kind === 'fox' ? [false, true] : [false, false])
    }
  })

  it('six genuinely different personalities: travel times, reactions and idles all differ', () => {
    expect(new Set(KINDS.map((k) => PERSONALITIES[k].gaitSeconds)).size).toBe(KINDS.length)
    expect(new Set(KINDS.map((k) => PERSONALITIES[k].reactSeconds)).size).toBe(KINDS.length)
    const traces = KINDS.map(idleTrace)
    for (let a = 0; a < KINDS.length; a++)
      for (let b = a + 1; b < KINDS.length; b++) expect(apart(traces[a], traces[b]), `${KINDS[a]} vs ${KINDS[b]}`).toBeGreaterThan(0.6)
  })

  it('no journey home or tap reaction is a copy of another creature’s, even stretched to the same length', () => {
    const routines = [
      ['journey', comparable(KINDS.map(gaitChannels))],
      ['reaction', comparable(KINDS.map(reactChannels))],
    ] as const
    for (const [routine, traces] of routines)
      for (let a = 0; a < KINDS.length; a++)
        for (let b = a + 1; b < KINDS.length; b++) expect(apart(traces[a], traces[b]), `${routine}: ${KINDS[a]} vs ${KINDS[b]}`).toBeGreaterThan(0.6)
  })

  it('the snail is the slowest traveller and the fox the quickest', () => {
    const times = KINDS.map((k) => PERSONALITIES[k].gaitSeconds)
    expect(Math.max(...times)).toBe(PERSONALITIES.snail.gaitSeconds)
    expect(Math.min(...times)).toBe(PERSONALITIES.fox.gaitSeconds)
  })
})

describe('flight home', () => {
  it('stays in front of the curtains, valance and crest while over them, and lands on the sky layer', () => {
    for (const kind of KINDS) {
      const built = buildCreature(kind)
      const { bounds, center } = built
      const radius = Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0) / 2
      const fromX = center.x + 2 * (bounds.x0 - center.x)
      SKY_HOMES.forEach((home, slot) => {
        const pose = blankPose()
        let hiddenAt = -1
        for (let i = 0; i <= 400; i++) {
          const k = i / 400
          PERSONALITIES[kind].gait(k, fromX, center.y, home.x, home.y, pose)
          const r = radius * flightScale(kind, k)
          const z = flightDepth(k, pose.x, pose.y, r, skyDepth(slot))
          // The last stretch is the settle into a home, which sits clear of the proscenium as seen from the seat.
          if (k < 0.86 && clearOfProscenium(pose.x, pose.y, r) < 0 && z < PROSCENIUM.front + 0.3 && hiddenAt < 0) hiddenAt = k
          if (i === 400) expect(z, `${kind} home ${home.x},${home.y}`).toBeCloseTo(skyDepth(slot), 9)
        }
        expect(hiddenAt, `${kind} to ${home.x},${home.y} passes behind the proscenium`).toBe(-1)
      })
    }
  })

  it('puts every creature at every home clear of the proscenium in the screen plane, not just as seen from the seat', () => {
    for (const kind of KINDS) {
      const { bounds } = buildCreature(kind)
      const hx = ((bounds.x1 - bounds.x0) / 2) * skyScale(kind)
      const hy = ((bounds.y1 - bounds.y0) / 2) * skyScale(kind)
      for (const home of SKY_HOMES) {
        const wide = Math.max(Math.abs(home.x) - hx - PROSCENIUM.halfWidth, home.y - hy - PROSCENIUM.top)
        const crest = Math.max(Math.abs(home.x) - hx - PROSCENIUM.crestHalfWidth, home.y - hy - PROSCENIUM.crestTop)
        expect(Math.min(wide, crest), `${kind} at ${home.x},${home.y}`).toBeGreaterThan(0)
      }
    }
  })

  it('gives every sky slot its own depth, so companions crossing never flicker', () => {
    const depths = SKY_HOMES.map((_, slot) => skyDepth(slot))
    expect(new Set(depths).size).toBe(SKY_HOMES.length)
    expect(depths[0]).toBe(SKY_Z)
    expect(Math.max(...depths) - SKY_Z).toBeLessThan(2)
  })
})

describe('peel', () => {
  it('turns the dark card over like a page and lays it back flat', () => {
    const pose: CreaturePose = blankPose()
    peelPose(0, -9, pose)
    expect(pose.spin).toBe(0)
    expect(pose.dark).toBe(1)
    expect(pose.hinge).toBe(-9)
    expect(pose.z).toBeCloseTo(0.3, 9)
    peelPose(0.5, -9, pose)
    expect(pose.z).toBeGreaterThan(3)
    peelPose(1, -9, pose)
    expect(pose.spin).toBeCloseTo(Math.PI, 9)
    expect(pose.dark).toBe(0)
    // Landed in front of the frame, where the flight home begins.
    expect(pose.z).toBeCloseTo(FLIGHT_Z, 9)
    expect(flightDepth(0, 0, 20, 10)).toBeCloseTo(FLIGHT_Z, 9)
  })
})
