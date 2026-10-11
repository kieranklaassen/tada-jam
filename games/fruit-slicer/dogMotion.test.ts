import { describe, expect, it } from 'vitest'
import { IDLE, REACTIONS, newDog, poseOf, react, stepDog, type DogPose, type DogState, type Idle } from './dogMotion'

/** Plays the dog forward at 60 frames a second, handing each frame's state on. */
function play(state: DogState, seconds: number, each?: (state: DogState) => void): DogState {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    state = stepDog(state, 1 / 60)
    each?.(state)
  }
  return state
}

/** The run of a pose through one action, sampled, as one list of numbers: what the action looks like. */
function print(start: DogState, seconds: number): number[] {
  const numbers: number[] = []
  let state = start
  for (let i = 0; i < 24; i++) {
    state = { ...state, idleAge: state.idle ? (i / 24) * seconds : 0, reactAge: state.react ? (i / 24) * seconds : 0 }
    const pose = poseOf({ ...state, t: 0 })
    numbers.push(pose.lift / 20, pose.tilt, pose.earLeft, pose.earRight, pose.lids, pose.jaw, pose.tongue, pose.cheeks, pose.spin / 6.3, pose.sniff, pose.tail)
  }
  return numbers
}
const distance = (a: number[], b: number[]) => Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0))

describe('the dog at idle', () => {
  it('breathes without stopping, and its two ears never move as one', () => {
    const lifts = new Set<number>(), gaps = new Set<number>()
    play(newDog(1), 1, (state) => {
      const pose = poseOf({ ...state, idle: null })
      lifts.add(Math.round(pose.lift * 10))
      gaps.add(Math.round((pose.earLeft - pose.earRight) * 1000))
    })
    expect(lifts.size).toBeGreaterThan(10)
    expect(gaps.size).toBeGreaterThan(5)
  })

  it('does one small thing after a rest, and never the same thing twice running', () => {
    const done: Idle[] = []
    let before: Idle | null = null
    play(newDog(5), 240, (state) => {
      if (state.idle && state.idle !== before) done.push(state.idle)
      before = state.idle
    })
    expect(done.length).toBeGreaterThan(40)
    for (let i = 1; i < done.length; i++) expect(done[i], `at ${i}`).not.toBe(done[i - 1])
    expect(new Set(done)).toEqual(new Set(IDLE))
  })

  it('rests between one small thing and the next: it never asks, flashes or beckons', () => {
    let busy = 0, frames = 0
    play(newDog(9), 120, (state) => {
      frames++
      if (state.idle) busy++
    })
    expect(busy / frames).toBeLessThan(0.55)
    expect(busy / frames).toBeGreaterThan(0.1)
  })

  it('is the same dog from the same seed, and another from another', () => {
    expect(play(newDog(3), 30)).toEqual(play(newDog(3), 30))
    expect(play(newDog(3), 30)).not.toEqual(play(newDog(4), 30))
  })
})

describe('what the dog does', () => {
  const seconds: Record<string, number> = { blink: 0.28, earFlick: 0.5, sniff: 1.1, headTilt: 1.6, yawn: 1.9, pant: 2.4, bark: 0.45, snap: 0.32, spin: 0.7, gulp: 0.6, cheeks: 1.5, ironed: 1.2, flip: 0.62 }
  const prints = [
    ...IDLE.map((idle) => ({ name: idle, numbers: print({ ...newDog(1), idle }, seconds[idle]) })),
    ...REACTIONS.map((reaction) => ({ name: reaction, numbers: print({ ...newDog(1), react: reaction, amount: 0.7 }, seconds[reaction]) })),
  ]

  it('is different every time: no two of its actions are the same, or nearly', () => {
    for (let i = 0; i < prints.length; i++) for (let j = i + 1; j < prints.length; j++) expect(distance(prints[i].numbers, prints[j].numbers), `${prints[i].name} against ${prints[j].name}`).toBeGreaterThan(0.6)
  })

  it('keeps every number of the pose in range through every action', () => {
    const inRange = (pose: DogPose) => {
      expect(Math.abs(pose.lift)).toBeLessThanOrEqual(30)
      expect(Math.abs(pose.tilt)).toBeLessThanOrEqual(0.5)
      for (const ear of [pose.earLeft, pose.earRight]) expect(Math.abs(ear)).toBeLessThanOrEqual(1.2)
      for (const part of [pose.lids, pose.jaw, pose.tongue, pose.cheeks, pose.sniff]) {
        expect(part).toBeGreaterThanOrEqual(0)
        expect(part).toBeLessThanOrEqual(1.05)
      }
      expect(Math.abs(pose.tail)).toBeLessThanOrEqual(1)
      expect(pose.spin).toBeGreaterThanOrEqual(0)
      expect(pose.spin).toBeLessThanOrEqual(Math.PI * 2 + 0.001)
    }
    for (const reaction of REACTIONS) play(react(newDog(2), reaction, 1), 2, (state) => inRange(poseOf(state)))
    play(newDog(2), 60, (state) => inRange(poseOf(state)))
  })

  it('reacts at once, drops what it was doing, and goes back to idling when the reaction is over', () => {
    const yawning: DogState = { ...newDog(1), idle: 'yawn', idleAge: 0.5 }
    const barking = react(yawning, 'bark')
    expect(barking).toMatchObject({ react: 'bark', reactAge: 0, idle: null })
    expect(poseOf(stepDog(barking, 0.1)).jaw).toBeGreaterThan(0.3)
    const after = play(barking, 0.6)
    expect(after.react).toBeNull()
    expect(play(after, 6).last).not.toBeNull()
  })

  it('turns one full circle for the smallest things, and bulges its cheeks by the length it was given', () => {
    let furthest = 0
    play(react(newDog(1), 'spin'), 0.69, (state) => (furthest = Math.max(furthest, poseOf(state).spin)))
    expect(furthest).toBeGreaterThan(Math.PI * 1.9)
    const cheeks = (amount: number) => {
      let most = 0
      play(react(newDog(1), 'gulp', amount), 0.6, (state) => (most = Math.max(most, poseOf(state).cheeks)))
      return most
    }
    expect(cheeks(0.9)).toBeGreaterThan(cheeks(0.3))
  })

  it('thumps its tail twice at a bark, and flips for a piece caught in the air, higher the longer the piece', () => {
    let swings = 0, last = 0
    play(react(newDog(1), 'bark'), 0.45, (state) => {
      const tail = poseOf(state).tail
      if (Math.abs(tail) > 0.25 && Math.sign(tail) !== Math.sign(last)) swings++
      if (Math.abs(tail) > 0.25) last = tail
    })
    expect(swings).toBeGreaterThanOrEqual(3)
    const height = (amount: number) => {
      let most = 0, turned = 0
      play(react(newDog(1), 'flip', amount), 0.6, (state) => {
        most = Math.max(most, poseOf(state).lift)
        turned = Math.max(turned, poseOf(state).spin)
      })
      expect(turned).toBeCloseTo(Math.PI * 2, 1)
      return most
    }
    expect(height(1)).toBeGreaterThan(height(0.2) + 8)
  })

  it('watches the blade while a finger is down, and looks up at the board when left alone', () => {
    expect(poseOf(newDog(1), { x: -0.8, y: -0.3 })).toMatchObject({ eyeX: -0.8, eyeY: -0.3 })
    expect(poseOf(newDog(1), { x: -9, y: 9 })).toMatchObject({ eyeX: -1, eyeY: 1 })
    expect(poseOf(newDog(1)).eyeY).toBeLessThan(0)
  })
})
