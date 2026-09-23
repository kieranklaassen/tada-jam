import { describe, expect, it } from 'vitest'
import { BirdMotion, GREETS, LOOK_OUT_SECONDS, POKES, WandererMotion, type Greet, type Poke } from './motion'

const FRAME = 1 / 60
const CAMERA_HEADING = Math.PI / 4
const SAMPLES = 13

function play(motion: WandererMotion, from: number, seconds: number): number {
  let now = from
  for (let t = 0; t < seconds; t += FRAME) {
    now += FRAME
    motion.update(FRAME, now, 0, 0, 0, false, false)
  }
  return now
}

function playBird(motion: BirdMotion, from: number, seconds: number): number {
  let now = from
  for (let t = 0; t < seconds; t += FRAME) {
    now += FRAME
    motion.update(FRAME, now, 0, 0, 0, 0, false)
  }
  return now
}

/** The channels a reaction drives, sampled across its window, as one trace. */
function trace(step: (now: number) => number[], from: number, seconds: number, samples: number): number[] {
  const out: number[] = []
  let now = from
  for (let i = 0; i < samples; i++) {
    const next = from + (seconds * (i + 1)) / samples
    while (now < next) now += FRAME
    out.push(...step(now))
  }
  return out
}

/** Root of the summed squared channel gaps, averaged over the samples. */
function distance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
  return Math.sqrt(sum / SAMPLES)
}

function greetTrace(kind: Greet): number[] {
  const motion = new WandererMotion()
  let now = play(motion, 0, 2)
  motion.greet(now, kind)
  let last = now
  return trace(
    (t) => {
      now = play(motion, last, t - last)
      last = now
      const p = motion.pose
      return [p.headYaw, p.headPitch, p.lean * 3, p.arm, p.swingSide, p.roll * 3, (p.squash - 1) * 4]
    },
    now,
    1.3,
    SAMPLES,
  )
}

function pokeTrace(kind: Poke): number[] {
  const motion = new BirdMotion()
  let now = playBird(motion, 0, 2)
  motion.poke(now, kind)
  let last = now
  return trace(
    (t) => {
      now = playBird(motion, last, t - last)
      last = now
      const p = motion.pose
      return [(p.squash - 1) * 4, p.puff, p.headTilt, p.tail, p.wing, p.pitch * 2]
    },
    now,
    0.7,
    SAMPLES,
  )
}

function pairs<T>(items: readonly T[]): [T, T][] {
  const out: [T, T][] = []
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) out.push([items[i], items[j]])
  return out
}

describe('wanderer', () => {
  it('invites by looking out at the child first, then holding the lantern toward the door', () => {
    const motion = new WandererMotion()
    // Facing -x: the child (toward +x +z) is to its left, the door (toward -z) to its right.
    motion.face(-Math.PI / 2)
    let now = play(motion, 0, 2)
    const side = (angle: number) => Math.sign(Math.atan2(Math.sin(angle), Math.cos(angle)))
    motion.invite(0, 1, -3, now)
    now = play(motion, now, LOOK_OUT_SECONDS * 0.8)
    expect(Math.sign(motion.pose.headYaw)).toBe(side(CAMERA_HEADING - motion.pose.heading))
    expect(motion.pose.arm).toBeLessThan(0.35)
    play(motion, now, 0.9)
    expect(Math.sign(motion.pose.headYaw)).toBe(side(Math.atan2(0, -3) - motion.pose.heading))
    expect(motion.pose.arm).toBeGreaterThan(0.6)
  })

  it('answers the first poke by looking out, then never greets the same way twice running', () => {
    const motion = new WandererMotion()
    let now = play(motion, 0, 1)
    const seen: Greet[] = []
    for (let i = 0; i < 20; i++) {
      seen.push(motion.greet(now))
      now = play(motion, now, 1.6)
    }
    expect(seen[0]).toBe('look-out')
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
    expect(new Set(seen)).toEqual(new Set(GREETS))
  })

  it('each greeting is its own movement, not a copy of another', () => {
    for (const [a, b] of pairs(GREETS)) expect(distance(greetTrace(a), greetTrace(b)), `${a} vs ${b}`).toBeGreaterThan(0.35)
  })
})

describe('bird', () => {
  it('answers the first poke with a ruffle, then never the same way twice running', () => {
    const motion = new BirdMotion()
    let now = playBird(motion, 0, 1)
    const seen: Poke[] = []
    for (let i = 0; i < 20; i++) {
      seen.push(motion.poke(now))
      now = playBird(motion, now, 1)
    }
    expect(seen[0]).toBe('ruffle')
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
    expect(new Set(seen)).toEqual(new Set(POKES))
  })

  it('each answer is its own movement, not a copy of another', () => {
    for (const [a, b] of pairs(POKES)) expect(distance(pokeTrace(a), pokeTrace(b)), `${a} vs ${b}`).toBeGreaterThan(0.35)
  })
})

describe('the two characters move differently', () => {
  it('the bird snaps its head to a new point; the wanderer eases round to it', () => {
    const settle = (headYaw: () => number, step: (now: number) => void, target: number, from: number): number => {
      let now = from
      while (Math.abs(headYaw() - target) > Math.abs(target) * 0.1 && now - from < 3) {
        now += FRAME
        step(now)
      }
      return now - from
    }
    const bird = new BirdMotion()
    let now = playBird(bird, 0, 2)
    bird.lookAt(3, 0.6, 0, now, 2)
    const birdTarget = Math.atan2(3, 0)
    const birdTime = settle(() => bird.pose.headYaw, (t) => bird.update(FRAME, t, 0, 0, 0, 0, false), birdTarget, now)

    const wanderer = new WandererMotion()
    wanderer.face(0)
    now = play(wanderer, 0, 2)
    wanderer.aim(3, 0.45, 0.01, now, 3)
    const wandererTime = settle(() => wanderer.pose.headYaw, (t) => wanderer.update(FRAME, t, 0, 0, 0, false, false), 1.1, now)

    expect(birdTime).toBeLessThan(0.12)
    expect(wandererTime).toBeGreaterThan(birdTime * 3)
  })
})
