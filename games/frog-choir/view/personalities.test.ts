import { describe, expect, it } from 'vitest'
import type { FrogMode } from '../controller'
import { CAST, type Character } from './frog'
import { animatorFor, resetPose, restPose, type FrogMoment, type Pose } from './personalities'

// Five frogs must read as five characters, not one puppet copied. Each
// action is run frame by frame twice per frog, once with the event and once
// without, and the difference is the frog's reaction. Reactions are sampled
// at 21 moments across every body channel (props like the flower, the leaf
// parasol, and the nightcap are left out, so a shared body move cannot hide
// behind a different hat), and no two frogs may come within 0.3 of each
// other. A touch must also get its own answer, not a landing or a plain
// firefly song replayed.

const FRAME = 1 / 60
const SAMPLES = 21
const NEAR_COPY = 0.3
const CHARACTERS: readonly Character[] = CAST.map((spec) => spec.character)

type Channel = Exclude<keyof Pose, 'hatY' | 'hatPitch' | 'hatRoll'>
const CHANNELS = (Object.keys(restPose()) as (keyof Pose)[]).filter((key): key is Channel => !key.startsWith('hat'))
const ANGLE = /(Pitch|Yaw|Roll)$/

type Action = {
  seconds: number
  /** Called every frame with seconds since the action began. */
  apply: (m: FrogMoment, age: number) => void
}

const ACTIONS = {
  tap: {
    seconds: 1.6,
    apply: (m, age) => {
      m.tap = age
      m.sing = age
      m.singStrength = 1.25
    },
  },
  sing: {
    seconds: 1.2,
    apply: (m, age) => {
      m.sing = age
    },
  },
  press: {
    seconds: 0.4,
    apply: (m, age) => {
      m.press = age
    },
  },
  carry: {
    seconds: 1.2,
    apply: (m, age) => {
      m.mode = 'held'
      m.lift = age
      m.vx = Math.sin(age * 3) * 1.5
      m.vz = Math.cos(age * 2) * 0.6
    },
  },
  hop: {
    seconds: 0.5,
    apply: (m, age) => {
      m.mode = 'hop'
      m.hop = age / 0.5
    },
  },
  land: {
    seconds: 1.4,
    apply: (m, age) => {
      m.land = age
    },
  },
} satisfies Record<string, Action>

type ActionName = keyof typeof ACTIONS
const ACTION_NAMES = Object.keys(ACTIONS) as ActionName[]

function quietMoment(): FrogMoment {
  return {
    time: 0,
    dt: FRAME,
    clock: 0,
    beat: 60 / 80,
    mode: 'sit' satisfies FrogMode,
    sing: Infinity,
    singStrength: 1,
    press: Infinity,
    tap: Infinity,
    lift: Infinity,
    land: Infinity,
    splash: Infinity,
    hop: -1,
    vx: 0,
    vz: 0,
    gazeX: 0.8,
    gazeY: 1.2,
    gazeZ: -0.6,
    fireNear: 0,
    invite: null,
    visited: 0,
    visitorX: 0,
    visitorY: 1,
    visitorZ: 0,
    visitorSide: 1,
  }
}

/** Animates two seconds of settled idle, then the action, frame by frame. */
function run(character: Character, action: Action, frame: (pose: Pose, index: number) => void): void {
  const animate = animatorFor(character)
  const pose = restPose()
  const warmup = Math.round(2 / FRAME)
  const frames = Math.round(action.seconds / FRAME)
  for (let i = 0; i <= warmup + frames; i++) {
    const m = quietMoment()
    m.time = i * FRAME
    m.clock = m.time
    if (i >= warmup) action.apply(m, (i - warmup) * FRAME)
    animate(m, resetPose(pose))
    frame(pose, i - warmup)
  }
}

/** Body channels at SAMPLES moments spread across the action. */
function trace(character: Character, action: Action): number[][] {
  const every = Math.round(action.seconds / FRAME) / (SAMPLES - 1)
  const samples: number[][] = []
  run(character, action, (pose, index) => {
    if (index >= 0 && samples.length < SAMPLES && index >= Math.round(samples.length * every)) {
      samples.push(CHANNELS.map((channel) => pose[channel]))
    }
  })
  return samples
}

function difference(a: number, b: number, channel: Channel): number {
  const d = a - b
  return ANGLE.test(channel) ? Math.atan2(Math.sin(d), Math.cos(d)) : d
}

function idle(seconds: number): Action {
  return { seconds, apply: () => {} }
}

/** What the action adds to the frog's own idle, per sample and channel. */
function reaction(character: Character, name: ActionName): number[][] {
  const acted = trace(character, ACTIONS[name])
  const quiet = trace(character, idle(ACTIONS[name].seconds))
  return acted.map((row, s) => row.map((value, c) => difference(value, quiet[s][c], CHANNELS[c])))
}

function distance(a: number[][], b: number[][]): number {
  let sum = 0
  for (let s = 0; s < a.length; s++) {
    for (let c = 0; c < CHANNELS.length; c++) sum += difference(a[s][c], b[s][c], CHANNELS[c]) ** 2
  }
  return Math.sqrt(sum)
}

function magnitude(a: number[][]): number {
  return distance(a, a.map((row) => row.map(() => 0)))
}

function pairs<T>(items: readonly T[]): [T, T][] {
  return items.flatMap((a, i) => items.slice(i + 1).map((b): [T, T] => [a, b]))
}

describe('motion personalities', () => {
  it('samples 21 moments of every body channel', () => {
    expect(trace('showoff', ACTIONS.tap)).toHaveLength(SAMPLES)
    expect(CHANNELS).toContain('rootYaw')
    expect(CHANNELS).not.toContain('hatY')
  })

  it('keeps every channel finite on every frame, even before anything has happened', () => {
    const channels = Object.keys(restPose()) as (keyof Pose)[]
    for (const character of CHARACTERS) {
      for (const action of [idle(3), ...Object.values(ACTIONS)]) {
        const broken = new Set<keyof Pose>()
        run(character, action, (pose) => {
          for (const channel of channels) if (!Number.isFinite(pose[channel])) broken.add(channel)
        })
        expect([...broken], character).toEqual([])
      }
    }
  })

  it('gives every frog a visible reaction to every action', () => {
    for (const character of CHARACTERS) {
      for (const name of ACTION_NAMES) {
        expect(magnitude(reaction(character, name)), `${character} ${name}`).toBeGreaterThan(NEAR_COPY)
      }
    }
  })

  it.each(ACTION_NAMES)('no two frogs share a %s reaction', (name) => {
    const reactions = new Map(CHARACTERS.map((character) => [character, reaction(character, name)]))
    for (const [a, b] of pairs(CHARACTERS)) {
      expect(distance(reactions.get(a)!, reactions.get(b)!), `${a} vs ${b}`).toBeGreaterThan(NEAR_COPY)
    }
  })

  it('no two frogs share an idle', () => {
    const idles = new Map(CHARACTERS.map((character) => [character, trace(character, idle(6))]))
    for (const [a, b] of pairs(CHARACTERS)) {
      expect(distance(idles.get(a)!, idles.get(b)!), `${a} vs ${b}`).toBeGreaterThan(NEAR_COPY)
    }
  })

  it('answers a touch with its own move, not a landing or a firefly song replayed', () => {
    for (const character of CHARACTERS) {
      const tap = reaction(character, 'tap')
      expect(distance(tap, reaction(character, 'sing')), `${character} tap vs sing`).toBeGreaterThan(NEAR_COPY)
      expect(distance(tap, reaction(character, 'land')), `${character} tap vs land`).toBeGreaterThan(NEAR_COPY)
    }
  })
})
