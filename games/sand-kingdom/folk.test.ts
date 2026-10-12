import { describe, expect, it } from 'vitest'
import { base } from './field'
import { type Finger, Folk, type FolkSound, type World } from './folk'
import { GULL_PERCHES, LOG } from './layout'
import { makeRng } from './rng'

const DT = 1 / 60

/** A smooth beach with nothing lying on it. */
const world = (finger: Finger): World => ({ finger, ground: (_x, z) => base(z), blocked: () => null })

/** Plays the folk for some seconds and hands back every sound they made. */
function play(folk: Folk, seconds: number, finger: Finger = null, each?: (time: number) => void): FolkSound[] {
  const sounds: FolkSound[] = []
  for (let t = 0; t < seconds; t += DT) {
    folk.step(DT, world(finger))
    folk.drainSounds(sounds)
    each?.(t)
  }
  return sounds
}

/** How alike two runs of numbers are at their best lag, from 0 (nothing alike) to 1 (the same move). */
function alike(a: number[], b: number[]): number {
  const centre = (xs: number[]) => {
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length
    return xs.map((x) => x - mean)
  }
  const ca = centre(a), cb = centre(b)
  let best = 0
  for (let lag = 0; lag < 100; lag++) {
    let dot = 0, na = 0, nb = 0
    for (let i = 0; i + lag < ca.length; i++) {
      dot += ca[i] * cb[i + lag]
      na += ca[i] * ca[i]
      nb += cb[i + lag] * cb[i + lag]
    }
    if (na > 0 && nb > 0) best = Math.max(best, Math.abs(dot) / Math.sqrt(na * nb))
  }
  return best
}

describe('the sea folk at their places', () => {
  it('are the same for the same seed, and a frame of no time moves nothing', () => {
    const a = new Folk(makeRng(7)), b = new Folk(makeRng(7))
    play(a, 12)
    play(b, 12)
    expect(JSON.stringify(a.spots((_x, z) => base(z)))).toBe(JSON.stringify(b.spots((_x, z) => base(z))))
    const before = JSON.stringify([a.crab.x, a.crab.eyes, a.starfish.stretch, a.starfish.arms, a.eel.out, a.gulls.birds])
    a.step(0, world(null))
    expect(JSON.stringify([a.crab.x, a.crab.eyes, a.starfish.stretch, a.starfish.arms, a.eel.out, a.gulls.birds])).toBe(before)
  })

  it('each move like themselves: no two share an idle move, even a beat apart', () => {
    const folk = new Folk(makeRng(3))
    const moves: Record<string, number[]> = { crab: [], starfish: [], eel: [], gull: [] }
    let frame = 0
    play(folk, 40, null, () => {
      if (frame++ % 3 !== 0) return
      moves.crab.push(folk.crab.x)
      moves.starfish.push(folk.starfish.stretch)
      moves.eel.push(folk.eel.out)
      moves.gull.push(folk.gulls.birds[0].lean + folk.gulls.birds[0].wings[0] + folk.gulls.birds[0].duck)
    })
    const names = Object.keys(moves)
    for (const name of names) expect(Math.max(...moves[name]) - Math.min(...moves[name]), `${name} is alive at idle`).toBeGreaterThan(0.05)
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) expect(alike(moves[names[i]], moves[names[j]]), `${names[i]} and ${names[j]}`).toBeLessThan(0.6)
  })

  it('make no sound of their own at idle but the starfish flopping back onto its rock', () => {
    const sounds = play(new Folk(makeRng(5)), 40)
    expect(new Set(sounds)).toEqual(new Set<FolkSound>(['plop']))
  })
})

describe('the crab', () => {
  it('walks its ring in runs and dead stops, and moves its eyes one at a time', () => {
    const folk = new Folk(makeRng(2))
    let stopped = 0, ran = 0, last = folk.crab.x, both = 0
    let eyes = folk.crab.eyes.map((eye) => eye.across)
    play(folk, 20, null, () => {
      if (Math.abs(folk.crab.x - last) < 1e-6) stopped += 1
      else ran += 1
      last = folk.crab.x
      const now = folk.crab.eyes.map((eye) => eye.across)
      if (Math.abs(now[0] - eyes[0]) > 1e-4 && Math.abs(now[1] - eyes[1]) > 1e-4) both += 1
      eyes = now
    })
    expect(stopped).toBeGreaterThan(200)
    expect(ran).toBeGreaterThan(200)
    // An eye that has just been handed over is still settling for a few frames; they never sweep together.
    expect(both).toBeLessThan((stopped + ran) * 0.2)
  })

  it('pulls its eyes in and snaps its claws when poked, and lets its eyes out one after the other', () => {
    const folk = new Folk(makeRng(2))
    play(folk, 1)
    folk.crab.poke()
    const sounds = play(folk, 0.25)
    expect(sounds).toContain('clack')
    expect(folk.crab.eyes[0].out).toBeLessThan(0.2)
    expect(folk.crab.eyes[1].out).toBeLessThan(0.2)
    play(folk, 0.42)
    expect(folk.crab.eyes[0].out).toBeGreaterThan(0.7)
    expect(folk.crab.eyes[1].out).toBeLessThan(0.3)
    play(folk, 0.8)
    expect(folk.crab.eyes[1].out).toBeGreaterThan(0.7)
  })

  it('runs off sideways from a finger digging beside it and comes back when the sand is quiet', () => {
    const folk = new Folk(makeRng(2))
    const home = folk.crab.x
    play(folk, 0.6, { x: folk.crab.x + 0.6, z: folk.crab.z, digging: true })
    // It runs until it is a body's width clear of the finger.
    expect(folk.crab.x).toBeLessThan(home - 0.35)
    play(folk, 4)
    expect(Math.abs(folk.crab.x - home)).toBeLessThan(1)
  })
})

describe('the starfish', () => {
  it('stretches up as high as it can, wobbles, and flops with a plop', () => {
    const folk = new Folk(makeRng(4))
    let highest = 0, swayed = 0
    const sounds = play(folk, 30, null, () => {
      highest = Math.max(highest, folk.starfish.stretch)
      swayed = Math.max(swayed, Math.abs(folk.starfish.sway))
    })
    expect(highest).toBeGreaterThan(0.95)
    expect(swayed).toBeGreaterThan(0.05)
    expect(sounds).toContain('plop')
  })

  it('curls into a fist when poked, and opens one arm at a time', () => {
    const folk = new Folk(makeRng(4))
    folk.starfish.poke()
    const sounds = play(folk, 0.4)
    expect(sounds).toContain('squeak')
    for (const arm of folk.starfish.arms) expect(arm).toBeGreaterThan(0.9)
    play(folk, 0.45)
    expect(folk.starfish.arms[0]).toBeLessThan(0.5)
    expect(folk.starfish.arms[4]).toBeGreaterThan(0.9)
    play(folk, 1.2)
    for (const arm of folk.starfish.arms) expect(arm).toBeLessThan(0.2)
  })
})

describe('the eel', () => {
  it('threads its rock: it comes out of the other hole each time', () => {
    const folk = new Folk(makeRng(6))
    const holes: number[] = []
    let wasOut = false
    play(folk, 30, null, () => {
      const out = folk.eel.out > 0.3
      if (out && !wasOut) holes.push(folk.eel.hole)
      wasOut = out
    })
    expect(holes.length).toBeGreaterThan(4)
    for (let i = 1; i < holes.length; i++) expect(holes[i]).toBe(1 - holes[i - 1])
  })

  it('shoots back into its hole when poked, then looks out with one eye', () => {
    const folk = new Folk(makeRng(6))
    play(folk, 1.5)
    expect(folk.eel.out).toBeGreaterThan(0.3)
    folk.eel.poke()
    const sounds = play(folk, 0.3)
    expect(sounds).toContain('bloop')
    expect(folk.eel.out).toBeLessThan(0.05)
    play(folk, 1.2)
    expect(folk.eel.out).toBeGreaterThan(0.2)
    expect(folk.eel.out).toBeLessThan(0.4)
    expect(folk.eel.shut).toEqual([1, 0])
  })
})

describe('the gulls', () => {
  it('send a poked gull up and down at the other end of the row, and the others shuffle along', () => {
    const folk = new Folk(makeRng(8))
    folk.gulls.poke(0)
    let highest = 0
    const sounds = play(folk, 2.5, null, () => {
      highest = Math.max(highest, folk.gulls.birds[0].hop)
    })
    expect(sounds[0]).toBe('squawk')
    expect(sounds).toContain('flap')
    expect(highest).toBeGreaterThan(0.8)
    expect(folk.gulls.birds.map((bird) => bird.slot)).toEqual([2, 0, 1])
    folk.gulls.birds.forEach((bird) => expect(bird.x).toBeCloseTo(LOG.x0 + (LOG.x1 - LOG.x0) * GULL_PERCHES[bird.slot], 1))
    // The one at the far end goes to the near end.
    folk.gulls.poke(0)
    play(folk, 2.5)
    expect(folk.gulls.birds.map((bird) => bird.slot)).toEqual([0, 1, 2])
  })

  it('duck one after another, a beat apart', () => {
    const folk = new Folk(makeRng(8))
    folk.gulls.duckAll()
    const first: number[] = [-1, -1, -1]
    play(folk, 1.2, null, (time) => {
      folk.gulls.birds.forEach((bird, index) => {
        if (first[index] < 0 && bird.duck > 0.5) first[index] = time
      })
    })
    expect(first[0]).toBeGreaterThanOrEqual(0)
    expect(first[1]).toBeGreaterThan(first[0] + 0.1)
    expect(first[2]).toBeGreaterThan(first[1] + 0.1)
  })

  it('turn their heads to a finger, the far one last', () => {
    const folk = new Folk(makeRng(8))
    play(folk, 0.12, { x: -8, z: 4, digging: false })
    const heads = folk.gulls.birds.map((bird) => bird.head)
    expect(heads[0]).toBeLessThan(heads[1])
    expect(heads[1]).toBeLessThan(heads[2])
    expect(heads[0]).toBeLessThan(-0.2)
  })
})
