import { describe, expect, it } from 'vitest'
import { Bystanders, DUCK_SECONDS, GESTURE_SECONDS, KEEPER_BUILD, MAYOR_BUILD, MAYOR_LEAN_MOST, MAYOR_REACH_Z, armLong, bend, handFor, hatPlace, lookFor, type Arm, type Gesture, type Vec } from './bystanders'
import { KIND } from './kinds'
import { BAR, CROWD, KEEPER, MAYOR, STREET } from './places'
import { HOVER, Play, type World } from './play'
import { makeRng } from './rng'
import { Stage } from './scenes'

const FRAME = 1 / 60
const world = (over: Partial<World> = {}): World => ({ hole: { x: 0, z: 0 }, belly: [], breath: [], street: [], ...over })

function watch(bystanders: Bystanders, play: Play, seconds: number, each: () => void = () => {}, stage = new Stage()): void {
  for (let i = 0; i < Math.round(seconds / FRAME); i++) { bystanders.step(FRAME, play, stage); each() }
}

/** How often a value goes from falling to rising: its tempo. */
function turns(values: number[]): number {
  let count = 0
  for (let i = 2; i < values.length; i++) if (values[i - 1] < values[i - 2] && values[i] >= values[i - 1]) count += 1
  return count
}

/** How far outside the mayor's head a point is: 1 on the skin, less inside. */
function offHead(point: Vec): number {
  const head = MAYOR_BUILD.head
  return Math.hypot((point.x - head.x) / head.rx, (point.y - head.y) / head.ry, (point.z - head.z) / head.rz)
}

/** The least of `offHead` along both parts of an arm from `shoulder`. */
function nearestToHead(shoulder: Vec, arm: Arm): number {
  let least = Infinity
  for (const [from, to] of [[shoulder, arm.elbow], [arm.elbow, arm.hand]] as const) {
    for (let i = 0; i <= 10; i++) least = Math.min(least, offHead({ x: from.x + (to.x - from.x) * (i / 10), y: from.y + (to.y - from.y) * (i / 10), z: from.z + (to.z - from.z) * (i / 10) }))
  }
  return least
}

describe('an arm of two parts', () => {
  it('keeps both parts their length and puts the hand on what it reaches for', () => {
    const arm: Arm = { elbow: { x: 0, y: 0, z: 0 }, hand: { x: 0, y: 0, z: 0 } }, shoulder = { x: 0, y: 2, z: 0 }
    bend(shoulder, { x: 1, y: 2.5, z: 0.5 }, 1, 0.8, { x: 0, y: -1, z: 0 }, arm)
    expect(Math.hypot(arm.elbow.x - shoulder.x, arm.elbow.y - shoulder.y, arm.elbow.z - shoulder.z)).toBeCloseTo(1, 5)
    expect(Math.hypot(arm.hand.x - arm.elbow.x, arm.hand.y - arm.elbow.y, arm.hand.z - arm.elbow.z)).toBeCloseTo(0.8, 5)
    expect(arm.hand).toEqual({ x: 1, y: 2.5, z: 0.5 })
    // The elbow hangs to the side it was told to.
    expect(arm.elbow.y).toBeLessThan(2.3)
  })

  it('reaches as far as it can toward what is out of reach, and never folds flat', () => {
    const arm: Arm = { elbow: { x: 0, y: 0, z: 0 }, hand: { x: 0, y: 0, z: 0 } }, shoulder = { x: 0, y: 0, z: 0 }
    bend(shoulder, { x: 9, y: 0, z: 0 }, 1, 1, { x: 0, y: -1, z: 0 }, arm)
    expect(arm.hand.x).toBeCloseTo(1.99, 5)
    bend(shoulder, { x: 0.001, y: 0, z: 0 }, 1, 1, { x: 0, y: -1, z: 0 }, arm)
    expect(Math.hypot(arm.hand.x, arm.hand.y, arm.hand.z)).toBeGreaterThan(0.04)
  })
})

describe('where the mayor\'s hat is', () => {
  it('is told for every place a thing can be', () => {
    expect(hatPlace(new Play(world({ street: [{ parts: ['hat'], x: 2, z: 1 }] })))).toMatchObject({ how: 'alone', onDog: false, x: 2, z: 1 })
    expect(hatPlace(new Play(world({ street: [{ parts: ['dog', 'hat'], x: 2, z: 1 }] })))).toMatchObject({ how: 'top', onDog: true, y: KIND.dog.seatUnder + KIND.hat.height / 2 })
    expect(hatPlace(new Play(world({ street: [{ parts: ['dog', 'pie', 'hat'], x: 2, z: 1 }] })))).toMatchObject({ how: 'top', onDog: false })
    expect(hatPlace(new Play(world({ street: [{ parts: ['hat', 'dog'], x: 2, z: 1 }] })))).toMatchObject({ how: 'under', onDog: false })
    expect(hatPlace(new Play(world({ hole: { x: 3, z: 1 }, belly: ['pie', 'hat'] })))).toMatchObject({ how: 'belly', x: 3, z: 1 })
    expect(hatPlace(new Play(world({ breath: ['hat'] })))).toMatchObject({ how: 'breath', y: HOVER + KIND.hat.height / 2 })
    expect(hatPlace(new Play(world({ breath: ['dog', 'hat'] })))).toMatchObject({ how: 'top', onDog: true })
    expect(hatPlace(new Play(world({ breath: ['hat', 'pie'] })))).toMatchObject({ how: 'under' })
    expect(hatPlace(new Play(world()))).toBeNull()
  })

  it('is in the float while the float goes out', () => {
    const stage = new Stage()
    stage.float = { parts: [{ kind: 'pie', x: 1, y: 0, z: -1, lean: 0, yaw: 0, size: 1 }, { kind: 'hat', x: 0.2, y: 0, z: -1, lean: 0, yaw: 0, size: 1 }], tower: false, bottom: 'pie', load: 2, gait: 0, sway: 0, squash: 0, hat: 1 }
    expect(hatPlace(new Play(world()), stage)).toMatchObject({ how: 'top', x: 0.2, z: -1 })
  })
})

describe('the mayor', () => {
  it('shuffles along his rail to stay level with his hat, and never leaves the rail', () => {
    for (const x of [-9, -5, 0, 6]) {
      const bystanders = new Bystanders(makeRng(1)), play = new Play(world({ street: [{ parts: ['hat'], x, z: 1 }] }))
      watch(bystanders, play, 8)
      expect(bystanders.mayor.x).toBeCloseTo(Math.max(MAYOR.x0, Math.min(MAYOR.x1, x)), 1)
    }
  })

  it('reaches toward his hat and looks at it', () => {
    const left = new Bystanders(makeRng(1)), right = new Bystanders(makeRng(1))
    watch(left, new Play(world({ street: [{ parts: ['hat'], x: -6.3, z: 2 }] })), 6)
    watch(right, new Play(world({ street: [{ parts: ['hat'], x: 6, z: 2 }] })), 6)
    expect(right.mayor.armYaw).toBeGreaterThan(left.mayor.armYaw + 0.5)
    expect(right.mayor.eyeX).toBeGreaterThan(left.mayor.eyeX)
    // The hat lies on the street below his shoulder: he reaches down.
    expect(right.mayor.armPitch).toBeLessThan(0)
  })

  it('has a fixed opinion of each place his hat can be', () => {
    const faceFor = (over: Partial<World>): Bystanders['mayor'] => {
      const bystanders = new Bystanders(makeRng(1))
      watch(bystanders, new Play(world(over)), 6)
      return { ...bystanders.mayor }
    }
    const alone = faceFor({ street: [{ parts: ['hat'], x: 0, z: 0 }] }), top = faceFor({ street: [{ parts: ['dog', 'hat'], x: 0, z: 0 }] })
    const under = faceFor({ street: [{ parts: ['hat', 'dog'], x: 0, z: 0 }] }), belly = faceFor({ belly: ['hat'] }), breath = faceFor({ breath: ['hat'] })
    // Worn by something: delighted. Used as a bucket: appalled. Swallowed: he leans right out and his mouth falls open.
    expect(top.mouthWide).toBeGreaterThan(alone.mouthWide)
    expect(top.curl).toBeGreaterThan(under.curl)
    expect(under.brow).toBeLessThan(alone.brow)
    expect(belly.lean).toBeGreaterThan(alone.lean)
    expect(belly.mouthOpen).toBeGreaterThan(alone.mouthOpen)
    expect(breath.brow).toBeGreaterThan(alone.brow)
    const faces = [alone, top, under, belly, breath].map((face) => [face.lean, face.brow, face.mouthOpen, face.mouthWide].map((n) => n.toFixed(1)).join(' '))
    expect(new Set(faces).size).toBe(5)
  })

  it('jumps with his tuft on end when his hat goes in, and settles again', () => {
    const bystanders = new Bystanders(makeRng(1)), play = new Play(world({ belly: ['hat'] }))
    watch(bystanders, play, 3)
    bystanders.react({ type: 'drop', kind: 'hat' })
    let tuft = 0, bob = 0
    watch(bystanders, play, 0.5, () => { tuft = Math.max(tuft, bystanders.mayor.tuft); bob = Math.max(bob, bystanders.mayor.bob) })
    expect(tuft).toBeGreaterThan(0.8)
    expect(bob).toBeGreaterThan(0.2)
    watch(bystanders, play, 3)
    expect(bystanders.mayor.tuft).toBeLessThan(0.05)
  })

  it('flinches a little at every swallow, and far more when it is his hat', () => {
    const jump = (kind: 'pie' | 'hat'): number => {
      const bystanders = new Bystanders(makeRng(1)), play = new Play(world({ street: [{ parts: ['dog'], x: 0, z: 0 }] }))
      watch(bystanders, play, 2)
      const before = bystanders.mayor.brow
      bystanders.react({ type: 'drop', kind })
      expect(bystanders.flinch).toBe(1)
      let brow = 0
      watch(bystanders, play, 0.4, () => { brow = Math.max(brow, bystanders.mayor.brow - before) })
      return brow
    }
    expect(jump('pie')).toBeGreaterThan(0.05)
    expect(jump('hat')).toBeGreaterThan(jump('pie') * 2)
  })

  it('jumps at the balloon\'s squeal every time', () => {
    for (const type of ['teeter', 'drop'] as const) {
      const bystanders = new Bystanders(makeRng(1)), play = new Play(world())
      bystanders.react({ type, kind: 'balloon' })
      let tuft = 0
      watch(bystanders, play, 0.4, () => { tuft = Math.max(tuft, bystanders.mayor.tuft) })
      expect(tuft, type).toBeGreaterThan(0.8)
    }
  })

  it('shakes with laughter for as long as his hat sits on the dog, and only then', () => {
    const shake = (parts: World['street'][number]['parts']): number => {
      const bystanders = new Bystanders(makeRng(1)), play = new Play(world({ street: [{ parts, x: 0, z: 0 }] }))
      watch(bystanders, play, 6)
      let most = 0
      watch(bystanders, play, 2, () => { most = Math.max(most, Math.abs(bystanders.mayor.belly)) })
      return most
    }
    expect(shake(['dog', 'hat'])).toBeGreaterThan(0.8)
    expect(shake(['pie', 'hat'])).toBeLessThan(0.01)
    expect(shake(['hat', 'dog'])).toBeLessThan(0.01)
  })
})

describe('the mayor\'s free hand', () => {
  const after = (bystanders: Bystanders, play: Play, seconds: number): Gesture => { watch(bystanders, play, seconds); return bystanders.mayor.gesture }

  it('rests on the rail, clutches his crown while his hat is underneath, and is cupped at his mouth while it is in the hole', () => {
    expect(after(new Bystanders(makeRng(1)), new Play(world({ street: [{ parts: ['hat'], x: 0, z: 0 }] })), 1)).toBe('rest')
    expect(after(new Bystanders(makeRng(1)), new Play(world({ street: [{ parts: ['hat', 'pie'], x: 0, z: 0 }] })), 5)).toBe('clutch')
    expect(after(new Bystanders(makeRng(1)), new Play(world({ belly: ['hat'] })), 5)).toBe('cup')
  })

  it('pats his crown when a finger lands on him, tips a hat he does not have when his is set on top of something, and covers his eyes and peeks for the pie on top', () => {
    const play = new Play(world({ street: [{ parts: ['hat'], x: 0, z: 0 }] }))
    for (const [cue, gesture] of [
      [{ type: 'bystander', who: 'mayor', head: -1 }, 'pat'],
      [{ type: 'setdown', parts: ['dog', 'hat'], x: 0, z: 0 }, 'tip'],
      [{ type: 'burp', kind: 'dog', onto: 'hat', rest: 1 }, 'tip'],
      [{ type: 'secret', which: 'peek' }, 'peek'],
    ] as const) {
      const bystanders = new Bystanders(makeRng(1))
      bystanders.react(cue)
      expect(after(bystanders, play, 0.2), gesture).toBe(gesture)
      expect(after(bystanders, play, GESTURE_SECONDS[gesture]), gesture).toBe('rest')
    }
    // A stack with his hat at the bottom is not a hat worn: no tip.
    const bystanders = new Bystanders(makeRng(1))
    bystanders.react({ type: 'setdown', parts: ['hat', 'dog'], x: 0, z: 0 })
    expect(after(bystanders, play, 0.2)).toBe('rest')
  })

  it('no two gestures put the hand in the same place', () => {
    const places = (['rest', 'pat', 'clutch', 'cup', 'tip', 'peek'] as const).map((gesture) => { const at = handFor(gesture, 0.4, { x: 0, y: 0, z: 0 }); return [at.x, at.y, at.z].map((n) => n.toFixed(2)).join(' ') })
    expect(new Set(places).size).toBe(6)
  })

  it('peeking, the hand is over his eyes and then slips below them', () => {
    const over = handFor('peek', 0.5, { x: 0, y: 0, z: 0 }).y, slipped = handFor('peek', 2, { x: 0, y: 0, z: 0 }).y
    expect(over).toBeGreaterThan(MAYOR_BUILD.head.y)
    expect(slipped).toBeLessThan(over - 0.3)
  })

  it('never passes through his head: through every gesture, and on the way into and out of each, the arm stays outside it', () => {
    const cases: [Partial<World>, Parameters<Bystanders['react']>[0] | null][] = [
      [{ street: [{ parts: ['hat'], x: 0, z: 0 }] }, { type: 'bystander', who: 'mayor', head: -1 }],
      [{ street: [{ parts: ['hat'], x: 0, z: 0 }] }, { type: 'setdown', parts: ['dog', 'hat'], x: 0, z: 0 }],
      [{ street: [{ parts: ['hat'], x: 0, z: 0 }] }, { type: 'secret', which: 'peek' }],
      [{ street: [{ parts: ['hat', 'pie'], x: 0, z: 0 }] }, null],
      [{ belly: ['hat'] }, null],
      [{ belly: ['hat'] }, { type: 'bystander', who: 'mayor', head: -1 }],
      [{ street: [{ parts: ['hat', 'pie'], x: 0, z: 0 }] }, { type: 'secret', which: 'peek' }],
    ]
    for (const [over, cue] of cases) {
      const bystanders = new Bystanders(makeRng(1)), play = new Play(world(over))
      let least = Infinity
      const look = (): void => { least = Math.min(least, nearestToHead(MAYOR_BUILD.shoulder, bystanders.mayor.arm)) }
      watch(bystanders, play, 2, look)
      if (cue) bystanders.react(cue)
      watch(bystanders, play, 5, look)
      expect(least, JSON.stringify([over, cue])).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('the gate keeper', () => {
  /** Where a point of his own measure is in the street, as the view draws him upright. */
  const inStreet = (bystanders: Bystanders, point: Vec): Vec => ({ x: KEEPER.x + point.x * KEEPER.size, y: (bystanders.keeper.lift + point.y) * KEEPER.size, z: KEEPER.z + point.z * KEEPER.size })

  it('watches the hole from the top of his stilts', () => {
    const left = new Bystanders(makeRng(1)), right = new Bystanders(makeRng(1))
    watch(left, new Play(world({ hole: { x: -6, z: 0 } })), 3)
    watch(right, new Play(world({ hole: { x: 6, z: 0 } })), 3)
    expect(right.keeper.headYaw).toBeGreaterThan(left.keeper.headYaw + 0.5)
    expect(KEEPER.x).toBeGreaterThan(-6)
  })

  it('stands with one hand on the bar of the gate and the key held up in the other', () => {
    const bystanders = new Bystanders(makeRng(1)), play = new Play(world())
    watch(bystanders, play, 2)
    const hand = inStreet(bystanders, bystanders.keeper.barArm.hand)
    expect(Math.hypot(hand.x - BAR.x, hand.y - BAR.y, hand.z - BAR.z)).toBeLessThan(0.08)
    expect(bystanders.keeper.keyArm.hand.y).toBeGreaterThan(KEEPER_BUILD.keyShoulder.y + 0.5)
    expect(bystanders.keeper.key).toEqual(bystanders.keeper.keyArm.hand)
    expect(bystanders.keeper.capOff).toBeLessThan(0.01)
  })

  it('fans a burp away with his cap, bending back further for a bigger thing', () => {
    const bent = (kind: 'pie' | 'drummer'): number => {
      const bystanders = new Bystanders(makeRng(1)), play = new Play(world())
      bystanders.react({ type: 'burp', kind, onto: null, rest: 0 })
      let back = 0, cap = 0
      const hands = new Set<string>()
      watch(bystanders, play, 1, () => { back = Math.max(back, bystanders.keeper.back); cap = Math.max(cap, bystanders.keeper.capOff); hands.add(bystanders.keeper.barArm.hand.x.toFixed(1)) })
      // The cap is off his head and in the hand that waves.
      expect(cap).toBeGreaterThan(0.9)
      expect(hands.size).toBeGreaterThan(3)
      watch(bystanders, play, 2)
      expect(bystanders.keeper.capOff).toBeLessThan(0.05)
      return back
    }
    expect(bent('drummer')).toBeGreaterThan(bent('pie') * 2)
  })

  it('rises on his stilts and stretches his neck to look at a stack that is let down, higher for a taller one', () => {
    const risen = (parts: number): { rise: number; neck: number } => {
      const bystanders = new Bystanders(makeRng(1)), play = new Play(world())
      bystanders.react({ type: 'setdown', parts: Array(parts).fill('pie'), x: 0, z: 0 })
      watch(bystanders, play, 0.5)
      return { rise: bystanders.keeper.rise, neck: bystanders.keeper.neck }
    }
    expect(risen(5).rise).toBeGreaterThan(risen(1).rise)
    expect(risen(5).neck).toBeGreaterThan(risen(1).neck)
    expect(risen(1).rise).toBeGreaterThan(0)
    // Every thing more lifts him further, up to the thirteen things of the fullest street, and he is never asked for more than his full height.
    for (let parts = 2; parts <= 13; parts++) {
      expect(lookFor(parts), `${parts} things`).toBeGreaterThan(lookFor(parts - 1))
      expect(risen(parts).rise, `${parts} things`).toBeGreaterThan(risen(parts - 1).rise)
    }
    expect(lookFor(13)).toBeLessThanOrEqual(1)
    expect(lookFor(0)).toBe(0)
  })

  it('puts a finger in each ear when the drummer is loud and drops his key on the pavement, and has it again after', () => {
    const bystanders = new Bystanders(makeRng(1)), play = new Play(world())
    watch(bystanders, play, 1)
    bystanders.react({ type: 'poke', kind: 'drummer' })
    watch(bystanders, play, 0.6)
    const keeper = bystanders.keeper, ear = KEEPER_BUILD.headY(keeper.neck) + KEEPER_BUILD.ear
    expect(keeper.dropped).toBeGreaterThan(0.9)
    expect(inStreet(bystanders, keeper.key).y).toBeLessThan(0.2)
    for (const arm of [keeper.keyArm, keeper.barArm]) expect(Math.abs(arm.hand.y - ear)).toBeLessThan(0.12)
    expect(keeper.keyArm.hand.x).toBeLessThan(0)
    expect(keeper.barArm.hand.x).toBeGreaterThan(0)
    watch(bystanders, play, 3)
    expect(keeper.dropped).toBeLessThan(0.05)
    expect(keeper.key.y).toBeGreaterThan(4.5)
  })

  it('hears the drummer wherever he drums: touched, on the rim, going in, coming out, marching, in the march, bobbing on a stack, stopping on his spot and passing the gate', () => {
    for (const cue of [
      { type: 'poke', kind: 'drummer' }, { type: 'teeter', kind: 'drummer' }, { type: 'drop', kind: 'drummer' }, { type: 'pass', kind: 'drummer' },
      { type: 'bob', parts: ['dog', 'drummer'] }, { type: 'step', parts: ['drummer', 'pie'], step: 0, x: 0, z: 0 },
      { type: 'arrive', kind: 'drummer' }, { type: 'burp', kind: 'drummer', onto: null, rest: 0 }, { type: 'burp', kind: 'pie', onto: 'drummer', rest: 1 },
      { type: 'step', parts: ['dog', 'tuba', 'drummer'], step: 0, x: 0, z: 0 },
    ] as const) {
      const bystanders = new Bystanders(makeRng(1)), play = new Play(world())
      bystanders.react(cue)
      watch(bystanders, play, 0.4)
      expect(bystanders.keeper.dropped, cue.type).toBeGreaterThan(0.5)
    }
    const bystanders = new Bystanders(makeRng(1))
    bystanders.react({ type: 'poke', kind: 'tuba' })
    watch(bystanders, new Play(world()), 0.4)
    expect(bystanders.keeper.dropped).toBeLessThan(0.01)
  })

  it('salutes with his key at his brow when a finger lands on him', () => {
    const bystanders = new Bystanders(makeRng(1)), play = new Play(world())
    watch(bystanders, play, 1)
    bystanders.react({ type: 'bystander', who: 'keeper', head: -1 })
    watch(bystanders, play, 0.25)
    const keeper = bystanders.keeper
    expect(keeper.jingle).toBeGreaterThan(0.5)
    expect(Math.abs(keeper.keyArm.hand.y - (KEEPER_BUILD.headY(keeper.neck) + KEEPER_BUILD.brow))).toBeLessThan(0.15)
  })

  it('rises with the gate and pushes it as it swings open', () => {
    const bystanders = new Bystanders(makeRng(1)), play = new Play(world()), stage = new Stage()
    watch(bystanders, play, 1, undefined, stage)
    const shut = { ...bystanders.keeper.barArm.hand }
    stage.gate = 1
    watch(bystanders, play, 1, undefined, stage)
    expect(bystanders.keeper.rise).toBeGreaterThan(0.9)
    expect(bystanders.keeper.barArm.hand.z).toBeGreaterThan(shut.z + 0.4)
  })

  it('never puts an arm through his own head: fanning, with his fingers in his ears and saluting, his hands stay off its middle', () => {
    for (const cue of [{ type: 'burp', kind: 'drummer', onto: null, rest: 0 }, { type: 'poke', kind: 'drummer' }, { type: 'bystander', who: 'keeper', head: -1 }] as const) {
      const bystanders = new Bystanders(makeRng(1)), play = new Play(world())
      watch(bystanders, play, 1)
      bystanders.react(cue)
      watch(bystanders, play, 2.5, () => {
        const keeper = bystanders.keeper, middle = KEEPER_BUILD.headY(keeper.neck) + 0.9
        for (const arm of [keeper.keyArm, keeper.barArm]) {
          for (const point of [arm.hand, arm.elbow]) expect(Math.hypot(point.x, point.y - middle, point.z), cue.type).toBeGreaterThan(0.45)
        }
      })
    }
  })
})

describe('the crowd', () => {
  it('the head a finger lands on ducks and pops up again, and no other', () => {
    const bystanders = new Bystanders(makeRng(1)), play = new Play(world())
    expect(bystanders.ducking).toBe(-1)
    bystanders.react({ type: 'bystander', who: 'crowd', head: 4 })
    let most = 0
    watch(bystanders, play, DUCK_SECONDS * 0.5, () => { most = Math.max(most, bystanders.duck); expect(bystanders.ducking).toBe(4) })
    expect(most).toBeGreaterThan(0.9)
    watch(bystanders, play, DUCK_SECONDS)
    expect(bystanders.duck).toBe(0)
    expect(bystanders.ducking).toBe(-1)
    expect(CROWD.length).toBeGreaterThan(4)
  })

  it('every head jerks back when the hole swallows, and is still again within half a second', () => {
    const bystanders = new Bystanders(makeRng(1)), play = new Play(world())
    bystanders.react({ type: 'drop', kind: 'pie' })
    expect(bystanders.flinch).toBe(1)
    watch(bystanders, play, 0.5)
    expect(bystanders.flinch).toBe(0)
  })
})

describe('each of them moves like himself', () => {
  it('the mayor is slow and heavy, the gate keeper quick and thin: their tempos are far apart', () => {
    const bystanders = new Bystanders(makeRng(4)), play = new Play(world({ street: [{ parts: ['hat'], x: 0, z: 0 }] }))
    const mayor: number[] = [], keeper: number[] = []
    watch(bystanders, play, 30, () => { mayor.push(bystanders.mayor.bob); keeper.push(bystanders.keeper.lift) })
    expect(turns(keeper)).toBeGreaterThan(turns(mayor) * 1.8)
  })

  it('each has three fidgets of his own and never does the same one twice running', () => {
    const bystanders = new Bystanders(makeRng(9)), play = new Play(world())
    const mayor: string[] = [], keeper: string[] = []
    watch(bystanders, play, 240, () => {
      if (mayor[mayor.length - 1] !== bystanders.mayorIdleNow) mayor.push(bystanders.mayorIdleNow)
      if (keeper[keeper.length - 1] !== bystanders.keeperIdleNow) keeper.push(bystanders.keeperIdleNow)
    })
    expect(new Set(mayor).size).toBe(3)
    expect(new Set(keeper).size).toBe(3)
    expect(mayor.length).toBeGreaterThan(20)
    expect(keeper.length).toBeGreaterThan(40)
    for (const name of mayor) expect(keeper).not.toContain(name)
  })

  it('stands still in a step of no time, and is alive in every other', () => {
    const bystanders = new Bystanders(makeRng(1)), play = new Play(world()), stage = new Stage()
    const before = JSON.stringify([bystanders.mayor, bystanders.keeper])
    bystanders.step(0, play, stage)
    expect(JSON.stringify([bystanders.mayor, bystanders.keeper])).toBe(before)
    const bobs = new Set<string>()
    watch(bystanders, play, 2, () => bobs.add(`${bystanders.mayor.bob.toFixed(3)} ${bystanders.keeper.sway.toFixed(3)}`))
    expect(bobs.size).toBeGreaterThan(60)
  })
})

describe('the gate keeper\'s fidgets under the same seed', () => {
  const idlesOf = (seed: number, frame: number, seconds: number): string => {
    const bystanders = new Bystanders(makeRng(seed)), play = new Play(world()), stage = new Stage()
    const order: string[] = []
    for (let t = 0; t < seconds; t += frame) {
      bystanders.step(frame, play, stage)
      if (order[order.length - 1] !== bystanders.keeperIdleNow) order.push(bystanders.keeperIdleNow)
    }
    return order.join(' ')
  }

  it('come in the same order however long a frame is, and the mayor\'s turns do not shift them', () => {
    for (const seed of [1, 2, 3, 99]) {
      const order = idlesOf(seed, 1 / 60, 40)
      for (const frame of [1 / 30, 0.05, 0.1]) expect(idlesOf(seed, frame, 40).startsWith(order.slice(0, order.length - 12)) || order.startsWith(idlesOf(seed, frame, 40).slice(0, -12)), `seed ${seed}, frame ${frame}`).toBe(true)
    }
    expect(idlesOf(1, 1 / 60, 40)).not.toBe(idlesOf(2, 1 / 60, 40))
  })

  // The intersection audit's moment `gate-keeper-in-every-fidget` (scripts/intersections/games/hungry-hole.ts), played
  // here on the model with the audit's seed. The audit loads `seed=1`, and the Mount starts the bystanders' stream at
  // the seed plus one. The times, the saved hole and the drummer's place are the same numbers as in that moment.
  const AUDIT_SEED = 1 + 1
  const HOLE = { x: 2.2, z: -1.95 }, DRUMMER = { x: -0.6, z: 0.3 }, AWAY = { x: 5.6, z: 1.9 }
  /**
   * Seconds of game time. In each of his fidgets: a tap on the gate keeper (he salutes, and the hole comes to the kerb
   * at his feet), a tap on the hole there (he fans the burp away), a tap on the drummer (fingers in his ears, the key
   * on the pavement, for as long as the drummer teeters at the mouth), and a tap on bare street that calls the hole
   * away so that he takes his fingers out again.
   */
  const TAPS: readonly (readonly [number, 'keeper' | 'hole' | 'drummer' | 'street'])[] = [
    [2.2, 'keeper'], [2.8, 'hole'], [3.55, 'drummer'], [4.1, 'street'],
    [6.0, 'keeper'], [6.6, 'hole'], [7.35, 'drummer'], [7.9, 'street'],
    [9.4, 'keeper'], [10.0, 'hole'], [10.75, 'drummer'], [11.3, 'street'],
  ]
  const ENDS = 12.5

  it('the audit\'s moment reaches the salute, the fanning and the key on the pavement in each of his three fidgets, whenever within a third of a second its first frame falls', () => {
    const frame = 0.033
    for (const late of [-0.3, -0.15, 0, 0.15, 0.3]) {
      const bystanders = new Bystanders(makeRng(AUDIT_SEED)), stage = new Stage()
      const play = new Play(world({ hole: HOLE, belly: ['pie', 'pie', 'pie'], street: [{ parts: ['drummer'], ...DRUMMER }] }))
      bystanders.settle(play, stage)
      const reached = new Set<string>()
      let next = 0
      for (let t = 0; t < ENDS + late; t += frame) {
        while (next < TAPS.length && t >= TAPS[next][0] + late) {
          const what = TAPS[next][1]
          if (what === 'keeper') play.press({ on: 'keeper', x: KEEPER.x, z: STREET.z0 })
          if (what === 'street') {
            // Bare street: nothing stands where the finger lands.
            for (const thing of play.things) expect(Math.hypot(thing.sx - AWAY.x, thing.sz - AWAY.z), `late ${late}, tap ${next}`).toBeGreaterThan(1.6)
            play.press({ on: 'street', ...AWAY })
          }
          if (what === 'drummer') {
            const drummer = play.things.find((thing) => thing.parts[0] === 'drummer')!
            play.press({ on: 'thing', thing: drummer, part: 0, x: drummer.x, z: drummer.z })
          }
          if (what === 'hole') {
            // The audit taps the street where the hole was saved: it has come back there by now.
            expect(Math.hypot(play.x - HOLE.x, play.z - HOLE.z), `late ${late}, tap ${next}`).toBeLessThan(play.mouth / 2 - 0.2)
            expect(play.belly.length, `late ${late}, tap ${next}`).toBeGreaterThan(0)
            expect(play.riders, `late ${late}, tap ${next}`).toHaveLength(0)
            // And no thing stands between the eye and that spot: one beside it is out of the line, and one before it is lower than the line of sight, which climbs steeper than one in one.
            for (const thing of play.things) {
              const half = Math.max(0.55, KIND[thing.parts[0]].width / 2)
              expect(Math.abs(thing.sx - HOLE.x) > half + 0.6 || thing.sz - half - HOLE.z > KIND[thing.parts[0]].height, `late ${late}, tap ${next}`).toBe(true)
            }
            play.press({ on: 'hole', x: HOLE.x, z: HOLE.z })
          }
          play.tap()
          next += 1
        }
        play.step(frame)
        for (const cue of play.cues) bystanders.react(cue)
        play.cues.length = 0
        bystanders.step(frame, play, stage)
        const keeper = bystanders.keeper, idle = bystanders.keeperIdleNow
        // His key hand a hand's breadth before his brow, with the key in it.
        if (keeper.keyArm.hand.z > 0.55 && keeper.dropped < 0.05) reached.add(`${idle} salute`)
        if (keeper.capOff > 0.95 && keeper.back > 0.02) reached.add(`${idle} fan`)
        if (keeper.dropped > 0.95) reached.add(`${idle} key`)
      }
      expect([...reached].sort(), `late ${late}`).toEqual(['crane fan', 'crane key', 'crane salute', 'spin fan', 'spin key', 'spin salute', 'stork fan', 'stork key', 'stork salute'])
    }
  })
})

describe('found as left', () => {
  it('parked equals loaded on a bare street: the mayor followed his hat to the end of his rail, and a put-away leaves him at the middle of it, where a load finds him', () => {
    const middle = (MAYOR.x0 + MAYOR.x1) / 2
    // The float has gone out with his hat in it: he stands at the gate end of his rail, and stays there while the street is bare.
    const play = new Play(world({ hole: { x: -3, z: 1 } })), stage = new Stage(), parked = new Bystanders(makeRng(1))
    stage.float = { parts: [{ kind: 'pie', x: 5, y: 0, z: -2, lean: 0, yaw: 0, size: 1 }, { kind: 'hat', x: 5.5, y: 0, z: -2, lean: 0, yaw: 0, size: 1 }], tower: false, bottom: 'pie', load: 2, gait: 1, sway: 0, squash: 0, hat: 1 }
    watch(parked, play, 6, () => {}, stage)
    stage.float = null
    watch(parked, play, 2, () => {}, stage)
    expect(parked.mayor.x).toBeCloseTo(MAYOR.x1, 1)
    expect(Math.abs(parked.mayor.x - middle)).toBeGreaterThan(1)
    // Put away: the Mount settles the bystanders, as it does on a load.
    parked.settle(play, stage)
    const loaded = new Bystanders(makeRng(7))
    loaded.settle(new Play(world({ hole: { x: -3, z: 1 } })), new Stage())
    expect(parked.mayor.x).toBe(middle)
    expect(parked.mayor.x).toBe(loaded.mayor.x)
    for (const key of ['lean', 'armYaw', 'armPitch', 'headYaw', 'brow', 'mouthOpen', 'curl', 'tuft'] as const) expect(parked.mayor[key], key).toBeCloseTo(loaded.mayor[key], 6)
    // With his hat on the street he is found level with it, as before, wherever he stood.
    const hatted = new Play(world({ street: [{ parts: ['hat'], x: -4.6, z: 1 }] }))
    parked.settle(hatted, new Stage())
    expect(parked.mayor.x).toBeCloseTo(-4.6, 5)
  })

  it('a hat that still waits down in the mouth is in the hole to him: he does not look up at the breath before it is there', () => {
    const play = new Play(world({ belly: ['pie', 'hat'], street: [{ parts: ['drummer'], x: 1.1, z: 0.3 }] }))
    for (let i = 0; i < 30; i++) play.step(FRAME)
    play.press({ on: 'hole', x: play.x, z: play.z })
    play.tap()
    expect(play.riders[0]).toMatchObject({ kind: 'hat' })
    expect(play.riders[0].wait).toBeGreaterThan(0)
    expect(hatPlace(play)?.how).toBe('belly')
    for (let i = 0; i < 120 && play.riders[0].wait > 0; i++) play.step(FRAME)
    expect(hatPlace(play)?.how).toBe('breath')
  })

  it('on load both stand as the street has them, with nothing easing into place', () => {
    const play = new Play(world({ hole: { x: -5, z: 1 }, street: [{ parts: ['hat', 'pie'], x: -4, z: 1 }] }))
    const found = new Bystanders(makeRng(1)), watched = new Bystanders(makeRng(1)), stage = new Stage()
    found.settle(play, stage)
    expect(found.mayor.x).toBeCloseTo(-4, 5)
    expect(found.mayor.gesture).toBe('clutch')
    expect(found.mayor.brow).toBeCloseTo(-1, 5)
    // The same place a long look arrives at.
    watch(watched, play, 12)
    expect(found.mayor.x).toBeCloseTo(watched.mayor.x, 2)
    expect(found.mayor.armYaw).toBeCloseTo(watched.mayor.armYaw, 2)
    expect(found.keeper.headYaw).toBeCloseTo(watched.keeper.headYaw, 2)
  })
})

describe('the mayor keeps to his side of the kerb', () => {
  it('his reaching arm never points further to a side than the onlookers beside his stand allow', () => {
    for (const x of [-6.4, 0, 6.4]) {
      const bystanders = new Bystanders(makeRng(1)), play = new Play(world({ street: [{ parts: ['hat'], x, z: -1.4 }] }))
      bystanders.settle(play, new Stage())
      expect(Math.abs(bystanders.mayor.armYaw), `hat at ${x}`).toBeLessThanOrEqual(1.0 + 1e-9)
    }
  })

  it('his arm has its whole length to the side, and draws in the further out over the kerb it points', () => {
    expect(armLong(0.1, 1.0, -0.3)).toBe(1)
    expect(armLong(0.1, 0, 0)).toBeLessThan(1)
    expect(armLong(MAYOR_LEAN_MOST, 0, 0)).toBeLessThan(armLong(0.1, 0, 0))
    // Pointing back over his shoulder it is never asked to draw in.
    expect(armLong(0.2, Math.PI, 0)).toBe(1)
  })

  it('his fingertips stay behind the edge of the street, however he leans and wherever his hat is', () => {
    const reach = MAYOR_BUILD.reach, long = MAYOR_BUILD.reachLong
    for (const lean of [-0.08, 0.05, 0.16, 0.24, MAYOR_LEAN_MOST]) {
      for (let yaw = -1; yaw <= 1; yaw += 0.25) {
        for (let pitch = -1.2; pitch <= 0.6; pitch += 0.2) {
          const turn = lean * MAYOR_BUILD.leanTurn, forward = Math.sin(pitch) * Math.sin(turn) + Math.cos(yaw) * Math.cos(pitch) * Math.cos(turn)
          const tip = MAYOR.z + MAYOR.size * (reach.y * Math.sin(turn) + reach.z * Math.cos(turn) + long * armLong(lean, yaw, pitch) * forward)
          expect(tip, `lean ${lean}, yaw ${yaw}, pitch ${pitch}`).toBeLessThanOrEqual(MAYOR_REACH_Z + 1e-6)
        }
      }
    }
  })

  it('he leans furthest when his hat is in the hole and he has just been startled, and that is as far as his head may go', () => {
    const bystanders = new Bystanders(makeRng(1)), play = new Play(world({ hole: { x: -4.5, z: -2.3 }, belly: ['pie', 'hat'] })), stage = new Stage()
    bystanders.react({ type: 'drop', kind: 'hat' })
    let most = 0
    watch(bystanders, play, 3, () => { most = Math.max(most, bystanders.mayor.lean) }, stage)
    expect(most).toBeGreaterThan(0.2)
    expect(most).toBeLessThanOrEqual(MAYOR_LEAN_MOST + 1e-9)
  })
})
