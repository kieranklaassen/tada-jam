import { describe, expect, it } from 'vitest'
import { KIND, KINDS, footOf, mouthOf, seatOf, widthOf, type Kind } from './kinds'
import { bobSeconds, inRoom, makeLimbs, rest, teeter } from './motion'
import { BITE, HOVER, LET_DOWN, STRAIN_SECONDS, Play, liftOf, type Cue, type Thing, type World } from './play'
import { takes } from './rules'
import { FLOAT, hiddenBy, hidesGate } from './seen'
import { makeRng } from './rng'
import { GAP, HOLE_START, STOCK, STREET, clampHole, layStreet, type Standing } from './street'

const FRAME = 1 / 60

function world(over: Partial<World> = {}): World {
  return { hole: { x: 0, z: 0 }, belly: [], breath: [], street: [], ...over }
}

function run(play: Play, seconds: number): Cue[] {
  const heard: Cue[] = []
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    play.step(FRAME)
    heard.push(...play.cues)
    play.cues.length = 0
  }
  return heard
}

/**
 * Where two things are in each other: every part of every thing on the street and of the stack on the breath is a
 * drum as wide and as tall as the part, at the height the view draws it, with a balloon on top of a stack as high as
 * it floats. Null when no part of one thing is in a part of another.
 */
function crossing(play: Play): string | null {
  const drums: { who: string; x: number; z: number; r: number; low: number; high: number }[] = []
  const part = (who: string, parts: readonly Kind[], index: number, x: number, z: number, y: number): void => {
    const kind = parts[index], floats = parts.length > 1 && index === parts.length - 1 && kind === 'balloon'
    const high = y + KIND[kind].height + (floats ? FLOAT : 0)
    // A thing down in the mouth is under the street.
    if (high > 0) drums.push({ who, x, z, r: KIND[kind].width / 2, low: Math.max(0, y), high })
  }
  play.things.forEach((thing, n) => {
    if (thing.away || thing.coming) return
    const y = liftOf(thing)
    thing.parts.forEach((_, index) => part(`${n} ${thing.parts.join('+')}`, thing.parts, index, thing.sx, thing.sz, y + seatOf(thing.parts, index)))
  })
  const riding = play.riders.map((rider) => rider.kind)
  play.riders.forEach((rider, index) => part('the breath', riding, index, play.anchor.x, play.anchor.z, rider.y))
  for (const a of drums) {
    for (const b of drums) {
      if (a.who < b.who && Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r - 0.02 && Math.min(a.high, b.high) - Math.max(a.low, b.low) > 0.02) return `${a.who} in ${b.who}`
    }
  }
  return null
}

const on = (thing: Thing) => ({ on: 'thing' as const, thing, x: thing.x, z: thing.z })
const kindsIn = (play: Play): Kind[] => [...play.belly, ...play.riders.map((rider) => rider.kind), ...play.things.flatMap((thing) => thing.parts)].sort()

describe('the finger lands', () => {
  it('on the street: the hole sets off in the same frame, with a sound', () => {
    const play = new Play(world())
    play.press({ on: 'street', x: 3, z: 1 })
    expect(play.cues).toEqual([{ type: 'slide' }])
    play.step(FRAME)
    expect(play.speed).toBeGreaterThan(0)
    expect(play.x).toBeGreaterThan(0)
    run(play, 2)
    expect(play.x).toBeCloseTo(3, 2)
    expect(play.z).toBeCloseTo(1, 2)
  })

  it('on a thing: it answers as itself and calls the hole to its middle', () => {
    const play = new Play(world({ belly: ['drummer', 'drummer', 'drummer'], street: [{ parts: ['tuba'], x: 3, z: 0 }] }))
    play.press({ on: 'thing', thing: play.things[0], x: 3.6, z: 0.4 })
    expect(play.cues).toEqual([{ type: 'slide' }, { type: 'poke', kind: 'tuba' }])
    expect(play.things[0].poked).toBe(0)
    run(play, 2)
    expect(play.x).toBeCloseTo(3, 1)
    expect(play.belly).toContain('tuba')
  })

  it('on a thing of a standing stack: the one under the finger answers as itself, and the hole is called to the stack', () => {
    const play = new Play(world({ hole: { x: -4, z: 1 }, street: [{ parts: ['dog', 'hat', 'pie'], x: 2, z: 0 }] }))
    const stack = play.things[0]
    for (const [part, kind] of [[2, 'pie'], [1, 'hat'], [0, 'dog']] as const) {
      play.press({ on: 'thing', thing: stack, part, x: 2, z: 0 })
      expect(play.cues).toEqual([{ type: 'slide' }, { type: 'poke', kind }])
      expect(stack.poked).toBe(0)
      expect(stack.pokedPart).toBe(part)
      play.cues.length = 0
      play.letGo()
    }
    // With no part named it is the bottom one, and a part the stack does not have is its top one.
    play.press(on(stack))
    expect(stack.pokedPart).toBe(0)
    play.press({ on: 'thing', thing: stack, part: 9, x: 2, z: 0 })
    expect(stack.pokedPart).toBe(2)
  })

  it('what sits in the tuba at the bottom of a stack answers through it; nothing else does', () => {
    const play = new Play(world({ hole: { x: -4, z: 1 }, street: [{ parts: ['tuba', 'dog', 'pie'], x: 2, z: 0 }, { parts: ['pie', 'tuba', 'dog'], x: -1, z: -1 }] }))
    const poked = (thing: Thing, part: number): Cue => { play.cues.length = 0; play.press({ on: 'thing', thing, part, x: thing.x, z: thing.z }); return play.cues[1] }
    expect(poked(play.things[0], 1)).toEqual({ type: 'poke', kind: 'dog', deep: true })
    expect(poked(play.things[0], 2)).toEqual({ type: 'poke', kind: 'pie' })
    expect(poked(play.things[0], 0)).toEqual({ type: 'poke', kind: 'tuba' })
    expect(poked(play.things[1], 2)).toEqual({ type: 'poke', kind: 'dog' })
  })

  it('on the hole: it puckers, and stays where it is', () => {
    const play = new Play(world())
    play.press({ on: 'hole', x: 0.2, z: 0.1 })
    expect(play.cues).toEqual([{ type: 'pucker' }])
    run(play, 0.3)
    expect(play.pucker).toBeGreaterThan(0.9)
    expect(play.x).toBe(0)
  })

  it('on a bystander: that one answers, and the hole comes to the kerb', () => {
    const play = new Play(world())
    play.press({ on: 'mayor', x: -4, z: STREET.z0 })
    expect(play.cues).toEqual([{ type: 'slide' }, { type: 'bystander', who: 'mayor', head: -1 }])
    run(play, 2)
    expect(play.x).toBeCloseTo(-4, 1)
  })

  it('on a head of the crowd: that head is named, and the hole comes to the kerb before it', () => {
    const play = new Play(world())
    play.press({ on: 'crowd', head: 7, x: 2, z: STREET.z1 })
    expect(play.cues).toContainEqual({ type: 'bystander', who: 'crowd', head: 7 })
    run(play, 2)
    expect(play.x).toBeCloseTo(2, 1)
  })

  it('a bystander can be made to answer without the hole being called', () => {
    const play = new Play(world())
    play.touched({ on: 'gate', x: 5, z: STREET.z0 })
    expect(play.cues).toEqual([{ type: 'bystander', who: 'gate', head: -1 }])
    run(play, 1)
    expect(play.x).toBe(0)
  })
})

describe('the hole under a thing', () => {
  it('takes a thing narrower than its mouth: the thing is in the belly from the moment it tips', () => {
    const play = new Play(world({ street: [{ parts: ['pie'], x: 2, z: 0 }] }))
    play.press(on(play.things[0]))
    play.tap()
    const heard = run(play, 1.5)
    expect(play.things).toHaveLength(0)
    expect(play.belly).toEqual(['pie'])
    expect(heard.filter((cue) => cue.type === 'teeter').length).toBeGreaterThan(0)
    expect(heard.filter((cue) => cue.type === 'drop')).toEqual([{ type: 'drop', kind: 'pie' }])
    expect(play.urgent).toBe(true)
    // It is seen going in for its own time, and then it is gone.
    expect(play.falling).toHaveLength(0)
  })

  it('wobbles a thing on the rim before it goes: the rim is under it first', () => {
    const play = new Play(world({ street: [{ parts: ['pie'], x: 2, z: 0 }] }))
    play.press(on(play.things[0]))
    let rimmed = false
    for (let i = 0; i < 120 && play.things.length > 0; i++) { play.step(FRAME); rimmed ||= play.things[0]?.onRim === true }
    expect(rimmed).toBe(true)
  })

  it('grows with what it ate, with a little overshoot, and settles at the width the belly gives', () => {
    const play = new Play(world({ street: [{ parts: ['pie'], x: 1, z: 0 }] }))
    play.press(on(play.things[0]))
    let widest = 0
    for (let i = 0; i < 240; i++) { play.step(FRAME); widest = Math.max(widest, play.mouth) }
    expect(play.wants).toBeCloseTo(mouthOf(['pie']))
    expect(widest).toBeGreaterThan(play.wants)
    expect(play.mouth).toBeCloseTo(play.wants, 2)
  })

  it('cannot take a thing wider than its mouth: it teeters while the hole moves and tugs, and settles, leaning, when the hole rests', () => {
    const play = new Play(world({ street: [{ parts: ['tuba'], x: 2, z: 0 }] }))
    play.press(on(play.things[0]))
    const heard = run(play, 0.8)
    expect(play.things).toHaveLength(1)
    expect(play.belly).toEqual([])
    expect(play.things[0].onRim).toBe(true)
    expect(heard.some((cue) => cue.type === 'teeter' && cue.kind === 'tuba')).toBe(true)
    run(play, 5)
    expect(play.things[0].amp).toBeLessThan(0.05)
    expect(play.things[0].lean).toBeGreaterThan(0.1)
    // And it stands up again when the hole leaves.
    play.press({ on: 'street', x: -4, z: 0 })
    run(play, 2)
    expect(play.things[0].onRim).toBe(false)
    expect(play.things[0].lean).toBeLessThan(0.01)
  })

  it('is heard wobbling at the thing\'s own tempo, and never more than about three times a second', () => {
    for (const kind of ['dog', 'tuba'] as const) {
      const play = new Play(world({ hole: { x: -3, z: 0 }, belly: ['pie'], street: [{ parts: [kind], x: 0.9, z: 0 }] }))
      // The hole is led to it and then to and fro under it, so the wobble stays lively.
      let heard = 0
      for (let i = 0; i < 180; i++) {
        if (i % 20 === 0) play.press({ on: 'street', x: i % 40 === 0 ? 0.6 : -0.2, z: 0 })
        play.step(FRAME)
        heard += play.cues.filter((cue) => cue.type === 'teeter').length
        play.cues.length = 0
      }
      expect(play.things, kind).toHaveLength(1)
      expect(heard, kind).toBeGreaterThanOrEqual(2)
      expect(heard, kind).toBeLessThanOrEqual(10)
    }
  })

  it('takes a stack whole when the mouth is wider than its widest part, bottom first', () => {
    const play = new Play(world({ belly: ['dog', 'dog'], street: [{ parts: ['pie', 'hat'], x: 2, z: 0 }] }))
    play.press(on(play.things[0]))
    const heard = run(play, 2)
    expect(play.belly).toEqual(['dog', 'dog', 'pie', 'hat'])
    expect(heard.filter((cue) => cue.type === 'drop')).toEqual([{ type: 'drop', kind: 'pie' }, { type: 'drop', kind: 'hat' }])
  })

  it('plays on from inside: a muffled beat for every stretch of street, once the drummer is in', () => {
    const play = new Play(world({ belly: ['pie', 'drummer', 'tuba'] }))
    play.press({ on: 'street', x: 5, z: 0 })
    const heard = run(play, 2).filter((cue) => cue.type === 'muffled')
    expect(heard.length).toBeGreaterThanOrEqual(3)
    expect(heard[0]).toEqual({ type: 'muffled', tuba: true })
    const quiet = new Play(world({ belly: ['pie'] }))
    quiet.press({ on: 'street', x: 5, z: 0 })
    expect(run(quiet, 2).some((cue) => cue.type === 'muffled')).toBe(false)
  })
})

describe('a tap on the hole', () => {
  const burp = (play: Play): void => { play.press({ on: 'hole', x: play.x, z: play.z }); play.tap() }

  it('gives back the last thing eaten, which rides on the breath above the mouth', () => {
    const play = new Play(world({ belly: ['pie', 'hat'] }))
    burp(play)
    expect(play.cues).toContainEqual({ type: 'burp', kind: 'hat', onto: null, rest: 0 })
    expect(play.belly).toEqual(['pie'])
    expect(play.riders.map((rider) => rider.kind)).toEqual(['hat'])
    // It starts down in the mouth and comes up.
    expect(play.riders[0].y).toBeLessThan(0)
    run(play, 1.5)
    expect(play.riders[0].y).toBeCloseTo(HOVER, 1)
    expect(play.wants).toBeCloseTo(mouthOf(['pie']))
  })

  it('pushes each next thing up underneath, so the stack stands in the order the things went in', () => {
    const play = new Play(world({ belly: ['dog', 'hat', 'tuba'] }))
    for (let i = 0; i < 3; i++) { burp(play); run(play, 0.4) }
    expect(play.riders.map((rider) => rider.kind)).toEqual(['dog', 'hat', 'tuba'])
    expect(play.belly).toEqual([])
    expect(play.world().breath).toEqual(['dog', 'hat', 'tuba'])
  })

  it('says what the thing came up under, and how many ride above it', () => {
    const play = new Play(world({ belly: ['dog', 'hat'], breath: ['tuba'] }))
    burp(play)
    expect(play.cues).toContainEqual({ type: 'burp', kind: 'hat', onto: 'tuba', rest: 1 })
    play.cues.length = 0
    burp(play)
    expect(play.cues).toContainEqual({ type: 'burp', kind: 'dog', onto: 'hat', rest: 2 })
  })

  it('on an empty hole is a hiccup, and changes nothing', () => {
    const play = new Play(world())
    burp(play)
    expect(play.cues).toContainEqual({ type: 'hiccup' })
    expect(play.riders).toHaveLength(0)
    expect(play.dirty).toBe(false)
  })

  it('is not made by a press that was taken away', () => {
    const play = new Play(world({ belly: ['pie'] }))
    play.press({ on: 'hole', x: 0, z: 0 })
    play.letGo()
    run(play, 0.5)
    expect(play.belly).toEqual(['pie'])
    expect(play.pucker).toBeLessThan(0.05)
  })

  it('does not show a thing twice: one burped while still falling is only on the breath', () => {
    const play = new Play(world({ street: [{ parts: ['pie'], x: 0.3, z: 0 }] }))
    run(play, 0.1)
    expect(play.falling).toHaveLength(1)
    burp(play)
    expect(play.falling).toHaveLength(0)
    expect(play.riders.map((rider) => rider.kind)).toEqual(['pie'])
  })
})

describe('the stack let down', () => {
  it('stands on the street as one thing when the hole slips out from under it, clear of the hole and of everything', () => {
    const play = new Play(world({ breath: ['dog', 'hat'], street: [{ parts: ['tuba'], x: 1.9, z: 0 }] }))
    play.press({ on: 'street', x: -3, z: 0 })
    let heard: Cue[] = []
    for (let i = 0; i < 20 && play.riders.length > 0; i++) heard = heard.concat(run(play, FRAME))
    expect(Math.hypot(play.x, play.z)).toBeGreaterThan(LET_DOWN)
    const stack = play.things.find((thing) => thing.parts.length === 2)!
    // The thump comes with the landing, not before it.
    expect(heard.some((cue) => cue.type === 'setdown')).toBe(false)
    expect(stack.hop).toBeLessThan(1)
    while (stack.hop < 1) heard = heard.concat(run(play, FRAME))
    expect(heard).toContainEqual({ type: 'setdown', parts: ['dog', 'hat'], x: stack.sx, z: stack.sz })
    expect(stack.parts).toEqual(['dog', 'hat'])
    // The save holds it where it will stand, from this moment.
    expect(play.world().street).toContainEqual({ parts: ['dog', 'hat'], x: stack.x, z: stack.z })
    expect(play.world().breath).toEqual([])
    expect(Math.hypot(stack.x - 1.9, stack.z) - (KIND.dog.width + KIND.tuba.width) / 2).toBeGreaterThanOrEqual(GAP - 0.02)
    run(play, 1)
    expect(stack.air).toBe(0)
    expect(Math.hypot(stack.x - play.x, stack.z - play.z)).toBeGreaterThan(play.mouth / 2 + widthOf(stack.parts) / 2)
  })

  it('is not eaten on its way down, and thumps when it lands', () => {
    const play = new Play(world({ belly: ['tuba', 'tuba', 'tuba'], breath: ['pie'] }))
    play.press({ on: 'street', x: 0.6, z: 0 })
    let thumped = false
    for (let i = 0; i < 90; i++) { play.step(FRAME); thumped ||= play.things[0]?.squash > 0.5 }
    expect(thumped).toBe(true)
    expect(play.things).toHaveLength(1)
  })

  it('stays riding while the hole only breathes under it', () => {
    const play = new Play(world({ breath: ['pie'] }))
    run(play, 3)
    expect(play.riders).toHaveLength(1)
  })
})

describe('a stack walks to where it stands', () => {
  const letDown = (breath: Kind[], street: World['street'] = [{ parts: ['tuba'], x: -6, z: 2.4 }]): { play: Play; heard: Cue[] } => {
    const play = new Play(world({ hole: { x: 0, z: 0 }, breath, street }))
    play.press({ on: 'street', x: 3.5, z: 0 })
    return { play, heard: run(play, 6) }
  }

  it('in its bottom thing\'s walk, each step heard as it begins, and stands where the save had it from the start', () => {
    const play = new Play(world({ breath: ['hat', 'pie'], street: [{ parts: ['tuba'], x: -6, z: 2.4 }] }))
    play.press({ on: 'street', x: 3.5, z: 0 })
    let heard: Cue[] = []
    for (let i = 0; i < 30 && play.riders.length > 0; i++) heard = heard.concat(run(play, FRAME))
    const stack = play.things.find((thing) => thing.parts.length === 2)!, saved = play.world().street.find((standing) => standing.parts.length === 2)!
    heard = heard.concat(run(play, 6))
    expect(stack.walk).toBeNull()
    expect({ x: stack.sx, z: stack.sz }).toEqual({ x: saved.x, z: saved.z })
    const steps = heard.filter((cue) => cue.type === 'step')
    for (const cue of steps) expect(cue).toMatchObject({ parts: ['hat', 'pie'] })
    expect(steps.map((cue) => cue.type === 'step' && cue.step)).toEqual(steps.map((_, index) => index))
  })

  it('the dog, the tuba and the drummer march eight steps, however short the way, and the march is announced', () => {
    const { heard } = letDown(['dog', 'tuba', 'drummer'], [{ parts: ['pie'], x: -6, z: 2.4 }])
    expect(heard).toContainEqual({ type: 'secret', which: 'march' })
    expect(heard.filter((cue) => cue.type === 'step')).toHaveLength(8)
  })

  it('a stack with a balloon under it and a balloon on top takes one long bounce clear of the street', () => {
    const play = new Play(world({ breath: ['balloon', 'pie', 'balloon'], street: [{ parts: ['tuba'], x: -6, z: 2.4 }] }))
    play.press({ on: 'street', x: 3.5, z: 0 })
    let lift = 0
    const heard: Cue[] = []
    for (let i = 0; i < 300; i++) {
      heard.push(...run(play, FRAME))
      const walk = play.things.find((thing) => thing.parts.length === 3)?.walk
      if (walk) lift = Math.max(lift, walk.lift)
    }
    expect(heard).toContainEqual({ type: 'secret', which: 'bounce' })
    expect(lift).toBeGreaterThan(2)
    expect(heard.filter((cue) => cue.type === 'step')).toHaveLength(1)
  })

  it('the pie on top of the hat on top of something is told once, when the pie comes up', () => {
    const play = new Play(world({ belly: ['dog', 'hat', 'pie'] }))
    const heard: Cue[] = []
    for (let i = 0; i < 3; i++) { play.press({ on: 'hole', x: 0, z: 0 }); play.tap(); heard.push(...run(play, 0.4)) }
    expect(heard.filter((cue) => cue.type === 'secret')).toEqual([{ type: 'secret', which: 'peek' }])
    expect(play.riders.map((rider) => rider.kind)).toEqual(['dog', 'hat', 'pie'])
  })

  it('walks on to the spot the save has held since it dropped, whatever the hole does on the way', () => {
    const play = new Play(world({ belly: ['pie', 'pie', 'pie', 'pie'], breath: ['tuba', 'drummer'], street: [{ parts: ['hat'], x: -6, z: 2.4 }] }))
    play.press({ on: 'street', x: 3.5, z: 0 })
    for (let i = 0; i < 30 && play.riders.length > 0; i++) run(play, FRAME)
    const stack = play.things.find((thing) => thing.parts.length === 2)!, saved = play.world().street.find((standing) => standing.parts.length === 2)!
    run(play, 0.7)
    expect(stack.walk).not.toBeNull()
    // The hole is called back under it while it walks.
    play.press({ on: 'thing', thing: stack, x: stack.sx, z: stack.sz })
    for (let i = 0; i < 240; i++) {
      run(play, FRAME)
      expect(play.world().street).toContainEqual(saved)
    }
    expect(stack.walk).toBeNull()
    expect({ x: stack.sx, z: stack.sz }).toEqual({ x: saved.x, z: saved.z })
    // It is too wide for the mouth, which has come out to its foot.
    expect(Math.hypot(play.x - stack.x, play.z - stack.z)).toBeGreaterThanOrEqual((KIND.tuba.width + play.wants) / 2 - BITE - 0.02)
  })

  it('a tap on the hole in the way of a walking stack is a hiccup: the thing stays down, the stack walks on, and the thing comes up when the stack has passed', () => {
    const play = new Play(world({ belly: ['pie', 'pie', 'pie', 'pie', 'dog'], breath: ['tuba', 'drummer'], street: [{ parts: ['hat'], x: -6, z: 2.4 }] }))
    play.press({ on: 'street', x: 3.5, z: 0 })
    for (let i = 0; i < 30 && play.riders.length > 0; i++) run(play, FRAME)
    const stack = play.things.find((thing) => thing.parts.length === 2)!
    run(play, 0.5)
    expect(stack.walk).not.toBeNull()
    const saved = { x: stack.x, z: stack.z }
    // The hole is led onto the stack's way, a step ahead of it, and tapped there.
    const ahead = { x: stack.sx + (stack.x - stack.sx) * 0.6, z: stack.sz + (stack.z - stack.sz) * 0.6 }
    play.press({ on: 'street', ...ahead })
    play.letGo()
    for (let i = 0; i < 30; i++) run(play, FRAME)
    expect(stack.walk).not.toBeNull()
    play.cues.length = 0
    play.press({ on: 'hole', x: play.x, z: play.z })
    play.tap()
    expect(play.cues.map((cue) => cue.type)).toContain('hiccup')
    expect(play.riders).toHaveLength(0)
    expect(play.belly).toEqual(['pie', 'pie', 'pie', 'pie', 'dog'])
    for (let i = 0; i < 240; i++) {
      run(play, FRAME)
      expect(crossing(play), `frame ${i}`).toBeNull()
    }
    expect(stack.walk).toBeNull()
    expect({ x: stack.x, z: stack.z }).toEqual(saved)
    // With the stack at rest, the same tap brings the dog up: the stack steps out of its room first, if it stands in it.
    play.press({ on: 'hole', x: play.x, z: play.z })
    play.tap()
    expect(play.riders.map((rider) => rider.kind)).toEqual(['dog'])
    for (let i = 0; i < 120; i++) {
      run(play, FRAME)
      expect(crossing(play), `frame ${i}`).toBeNull()
    }
  })

  it('a riding stack bobs, and each bob is told with what is on it; one thing alone bobs unheard', () => {
    const stack = new Play(world({ breath: ['dog', 'tuba'] })), alone = new Play(world({ breath: ['tuba'] }))
    expect(run(stack, 5).filter((cue) => cue.type === 'bob').length).toBeGreaterThan(1)
    expect(run(alone, 5).filter((cue) => cue.type === 'bob')).toEqual([])
  })
})

describe('the float', () => {
  it('goes out when the hole slips from under a stack that holds the whole street: the street is bare from that moment', () => {
    const play = new Play(world({ breath: ['pie', 'hat', 'dog'] }))
    expect(play.bare).toBe(false)
    play.press({ on: 'street', x: 4, z: 0 })
    const heard = run(play, 1)
    expect(heard).toContainEqual({ type: 'float', parts: ['pie', 'hat', 'dog'], x: 0, z: 0 })
    expect(heard.some((cue) => cue.type === 'setdown')).toBe(false)
    expect(play.bare).toBe(true)
    expect(play.urgent).toBe(true)
    expect(play.world()).toMatchObject({ belly: [], breath: [], street: [] })
  })

  it('does not go out while anything is left on the street or in the hole', () => {
    for (const over of [{ street: [{ parts: ['pie' as Kind], x: -6, z: 2.4 }] }, { belly: ['pie' as Kind] }]) {
      const play = new Play(world({ breath: ['hat', 'dog'], ...over }))
      play.press({ on: 'street', x: 4, z: 0 })
      const heard = run(play, 1)
      expect(heard.some((cue) => cue.type === 'float')).toBe(false)
      expect(heard.filter((cue) => cue.type === 'setdown')).toMatchObject([{ parts: ['hat', 'dog'] }])
    }
  })
})

describe('the next street', () => {
  it('the hole makes way: it glides to its place by the gate end, and the save holds that place from the first moment', () => {
    const play = new Play(world({ hole: { x: -5, z: -1 } }))
    const to = play.makeWay()
    expect(to).toEqual({ x: HOLE_START.x, z: HOLE_START.z })
    expect(play.world().hole).toEqual(to)
    expect(play.x).toBe(-5)
    expect(play.urgent).toBe(true)
    // A drag that is taken away does not stop it on the way.
    run(play, 0.2)
    play.halt()
    expect(play.world().hole).toEqual(to)
    run(play, 3)
    expect(play.x).toBeCloseTo(to.x, 2)
    expect(play.world().hole.x).toBeCloseTo(to.x, 2)
  })

  it('a finger that calls the hole elsewhere on the way is obeyed, and the save follows the hole again', () => {
    const play = new Play(world({ hole: { x: -5, z: -1 } }))
    play.makeWay()
    run(play, 0.1)
    play.press({ on: 'street', x: -5, z: 2 })
    run(play, 0.1)
    expect(play.world().hole.x).toBeCloseTo(play.x, 2)
  })

  it('every thing is on its spot in the save at once, while it is still behind the gate and cannot be eaten', () => {
    const play = new Play(world())
    play.comeIn([{ parts: ['pie'], x: 0.2, z: 0 }, { parts: ['dog'], x: 3, z: 1 }])
    expect(play.world().street).toEqual([{ parts: ['pie'], x: 0.2, z: 0 }, { parts: ['dog'], x: 3, z: 1 }])
    expect(play.things.every((thing) => thing.away && thing.coming)).toBe(true)
    expect(play.urgent).toBe(true)
    expect(play.nearestThatFits()).toBeNull()
    run(play, 1)
    expect(play.belly).toEqual([])
    expect(play.things).toHaveLength(2)
  })
})

describe('a drag', () => {
  it('leads the hole from wherever on the street it began', () => {
    const play = new Play(world())
    play.press({ on: 'street', x: 1, z: 0 })
    play.drag(4, 1)
    run(play, 2)
    expect(play.x).toBeCloseTo(4, 2)
    expect(play.z).toBeCloseTo(1, 2)
  })

  it('carries the hole by the point where the finger took it', () => {
    const play = new Play(world())
    play.press({ on: 'hole', x: 0.3, z: -0.2 })
    play.drag(3.3, 0.8)
    run(play, 2)
    expect(play.x).toBeCloseTo(3, 2)
    expect(play.z).toBeCloseTo(1, 2)
  })

  it('ends with the hole finishing its glide; a drag that is taken away stops it where it is', () => {
    const glides = new Play(world())
    glides.press({ on: 'street', x: 5, z: 0 })
    run(glides, 0.1)
    glides.letGo()
    run(glides, 2)
    expect(glides.x).toBeCloseTo(5, 2)
    const stopped = new Play(world())
    stopped.press({ on: 'street', x: 5, z: 0 })
    run(stopped, 0.1)
    stopped.halt()
    const at = stopped.x
    run(stopped, 2)
    expect(stopped.x).toBe(at)
    // And a move after either is not followed: no finger is leading.
    stopped.drag(-5, 0)
    run(stopped, 1)
    expect(stopped.x).toBe(at)
  })

  it('never takes the hole off the street', () => {
    const play = new Play(world({ belly: ['tuba', 'drummer'] }))
    play.press({ on: 'street', x: 0, z: 0 })
    play.drag(99, 99)
    run(play, 3)
    expect(play.x + play.wants / 2).toBeLessThanOrEqual(STREET.x1 + 0.26)
    expect(play.z + play.wants / 2).toBeLessThanOrEqual(STREET.z1 + 0.26)
  })
})

describe('found as left', () => {
  it('a street made from what was saved saves the same again, with nothing in motion and no sound', () => {
    const play = new Play(world({ hole: { x: 1.5, z: -0.5 }, belly: ['pie', 'dog'], breath: ['hat', 'pie'], street: [{ parts: ['tuba'], x: -3, z: -1 }, { parts: ['pie', 'balloon'], x: 4, z: 1 }] }))
    const again = new Play(play.world())
    expect(again.world()).toEqual(play.world())
    expect(again.cues).toEqual([])
    expect(again.dirty).toBe(false)
    expect(again.riders[0].y).toBeCloseTo(HOVER)
    expect(again.riders[0].v).toBe(0)
    expect(again.mouth).toBeCloseTo(mouthOf(['pie', 'dog']))
    const before = JSON.stringify(again.world())
    run(again, 3)
    expect(JSON.stringify(again.world())).toBe(before)
  })

  it('is plain data that survives being written and read', () => {
    const play = new Play(world({ belly: ['pie'], breath: ['hat'], street: [{ parts: ['dog'], x: 2, z: 1 }] }))
    expect(JSON.parse(JSON.stringify(play.world()))).toEqual(play.world())
  })

  it('put away at any frame of a busy minute, nothing is lost and nothing is made twice', () => {
    for (const id of ['few', 'some', 'many']) {
      const rng = makeRng(11), stock = [...STOCK[id]].sort()
      const play = new Play(world({ street: layStreet(id, 5) }))
      for (let frame = 0; frame < 60 * 60; frame++) {
        if (frame % 23 === 0) {
          const dice = rng.next()
          if (dice < 0.45 && play.things.length > 0) { play.press(on(play.things[Math.floor(rng.next() * play.things.length)])); play.tap() }
          else if (dice < 0.75) { play.press({ on: 'hole', x: play.x, z: play.z }); play.tap() }
          else { play.press({ on: 'street', x: STREET.x0 + rng.next() * 13, z: STREET.z0 + rng.next() * 5.2 }); play.letGo() }
        }
        play.step(FRAME)
        play.cues.length = 0
        if (frame % 7 === 0) {
          expect(kindsIn(play), `${id} at frame ${frame}`).toEqual(stock)
          const saved = play.world()
          expect([...saved.belly, ...saved.breath, ...saved.street.flatMap((standing) => standing.parts)].sort()).toEqual(stock)
        }
      }
    }
  })
})

describe('at rest', () => {
  it('knows the nearest thing its mouth takes now, for the idle rim and the glow', () => {
    const play = new Play(world({ street: [{ parts: ['tuba'], x: 1.5, z: 0 }, { parts: ['pie'], x: -4, z: 0 }, { parts: ['pie'], x: 3, z: 1 }] }))
    expect(play.nearestThatFits()).toBe(play.things[2])
    const none = new Play(world({ street: [{ parts: ['tuba'], x: 1.5, z: 0 }] }))
    expect(none.nearestThatFits()).toBeNull()
  })

  it('does nothing in a step of no time', () => {
    const play = new Play(world({ street: [{ parts: ['pie'], x: 0.2, z: 0 }] }))
    play.step(0)
    expect(play.things).toHaveLength(1)
    expect(play.time).toBe(0)
  })
})

describe('room on the street', () => {
  const hole = (play: Play, x: number, z: number): void => { play.press({ on: 'hole', x, z }); play.tap() }

  it('a thing that stands where a burped stack will hang steps out of its way, and the burp waits down in the mouth until it has', () => {
    // The drummer is too wide for the mouth and stands half over it.
    const play = new Play(world({ belly: ['pie', 'hat'], street: [{ parts: ['drummer'], x: 1.1, z: 0.3 }] }))
    run(play, 0.5)
    const drummer = play.things[0]
    hole(play, 0, 0)
    // The save holds him at his new place from this moment, clear of the stack and of the mouth.
    const saved = play.world().street[0], clear = (KIND.drummer.width + KIND.hat.width) / 2 + GAP
    expect(Math.hypot(saved.x - play.anchor.x, saved.z - play.anchor.z)).toBeGreaterThanOrEqual(clear - 0.01)
    expect(play.world().breath).toEqual(['hat'])
    expect(play.riders[0].wait).toBeGreaterThan(0)
    // Frame by frame: until he is clear, the hat has not come up out of the street.
    for (let i = 0; i < 120; i++) {
      play.step(FRAME)
      const apart = Math.hypot(drummer.sx - play.anchor.x, drummer.sz - play.anchor.z) >= (KIND.drummer.width + KIND.hat.width) / 2
      const below = play.riders[0].y + KIND.hat.height <= 0
      expect(apart || below, `frame ${i}`).toBe(true)
    }
    expect(drummer.sx).toBe(saved.x)
    expect(drummer.walk).toBeNull()
    expect(play.riders[0].y).toBeCloseTo(HOVER, 1)
  })

  it('a wider thing burped up under the stack moves whatever its wider foot now reaches', () => {
    const play = new Play(world({ belly: ['balloon', 'pie'], street: [{ parts: ['dog'], x: 1.6, z: 0 }] }))
    hole(play, 0, 0)
    run(play, 0.6)
    // The pie hangs clear of the dog; the balloon under it does not.
    expect(play.things[0].x).toBe(1.6)
    hole(play, 0, 0)
    expect(play.things[0].x).toBeGreaterThan(1.6)
    expect(Math.hypot(play.things[0].x - play.anchor.x, play.things[0].z - play.anchor.z)).toBeGreaterThanOrEqual((KIND.dog.width + KIND.balloon.width) / 2 + GAP - 0.01)
  })

  it('with nothing in the way the burp comes up at once and nothing moves', () => {
    const play = new Play(world({ belly: ['pie'], street: [{ parts: ['tuba'], x: 3, z: 0 }] }))
    hole(play, 0, 0)
    expect(play.riders[0].wait).toBe(0)
    expect(play.things[0].walk).toBeNull()
    expect(play.world().street[0]).toEqual({ parts: ['tuba'], x: 3, z: 0 })
  })

  it('a thing may lean out by half the gap to its nearest neighbour, less a little; toward the hole only what stands that way counts', () => {
    const play = new Play(world({ hole: { x: 0, z: 1.4 }, street: [{ parts: ['pie'], x: 0, z: 0 }, { parts: ['hat'], x: -1.6, z: 0 }] }))
    run(play, 0.2)
    const [pie, hat] = play.things, gap = 1.6 - (KIND.pie.width + KIND.hat.width) / 2
    expect(play.room(pie)).toBeCloseTo(gap / 2 - 0.06, 6)
    expect(play.room(hat)).toBeCloseTo(gap / 2 - 0.06, 6)
    // The hole is toward the near kerb from the pie, and nothing stands that way but the kerb's crowd, far off.
    expect(pie.dirZ).toBeGreaterThan(0.9)
    expect(play.room(pie, true)).toBeGreaterThan(1)
  })

  it('a stack on the breath counts as a neighbour, and so do the bystanders along the far kerb', () => {
    const play = new Play(world({ hole: { x: 0, z: 0 }, breath: ['balloon'], street: [{ parts: ['pie'], x: 1.9, z: 0 }, { parts: ['tuba'], x: -4, z: STREET.z0 + 0.55 + KIND.tuba.width / 2 }] }))
    run(play, 0.2)
    expect(play.room(play.things[0])).toBeCloseTo((1.9 - (KIND.pie.width + KIND.balloon.width) / 2) / 2 - 0.06, 6)
    // The tuba stands against the strip: it has the strip, less the mayor's reach, and no more.
    expect(play.room(play.things[1])).toBeLessThan(0.5)
    expect(play.room(play.things[1])).toBeGreaterThan(0.3)
  })

  it('two things with the hole between them both lean toward it and never reach each other', () => {
    const play = new Play(world({ hole: { x: 3, z: 0 }, belly: ['pie'], street: [{ parts: ['tuba'], x: -1.2, z: 0 }, { parts: ['drummer'], x: 1.45, z: 0 }] }))
    const gap = 2.65 - (KIND.tuba.width + KIND.drummer.width) / 2
    play.press({ on: 'street', x: 0, z: 0 })
    let leant = 0
    for (let i = 0; i < 240; i++) {
      play.step(FRAME)
      play.cues.length = 0
      let reach = 0
      for (const thing of play.things) {
        const pose = rest({ slide: 0, lift: 0, tilt: 0, roll: 0, yaw: 0, fore: 0, wide: 1, tall: 1, about: 0 }), high = KIND[thing.parts[0]].height, half = KIND[thing.parts[0]].width / 2
        teeter(thing.parts[0], thing.lean, thing.amp, thing.phase, pose, makeLimbs())
        inRoom(pose, high, half, play.room(thing), play.room(thing, true), Math.hypot(play.x - thing.x, play.z - thing.z))
        reach += high * Math.sin(Math.max(Math.abs(pose.tilt), Math.hypot(pose.roll, pose.fore))) + (pose.wide - 1) * half + pose.slide * Math.hypot(play.x - thing.x, play.z - thing.z)
        leant = Math.max(leant, thing.lean)
      }
      expect(reach, `frame ${i}`).toBeLessThan(gap)
    }
    // Both were on the rim: the test is not passed by nothing happening.
    expect(leant).toBeGreaterThan(0.2)
  })
})

describe('a thing too wide for the mouth', () => {
  /** How near the middle of such a thing the middle of the hole may rest: only the lip is under its foot. */
  const need = (play: Play, thing: Thing | Standing): number => (KIND[thing.parts[0]].width + play.wants) / 2 - BITE
  const tapOn = (play: Play, thing: Thing): void => { play.press(on(thing)); play.tap() }

  it('the hole cannot rest under it: a tap on it brings the mouth to its foot with only its lip under the edge, on a side the child can see', () => {
    for (const from of [{ x: -4, z: 2 }, { x: 5, z: 1 }, { x: 2, z: 2.3 }, { x: 4, z: -2.2 }, { x: 2, z: -2.3 }, { x: -3, z: -1.5 }]) {
      const play = new Play(world({ hole: from, street: [{ parts: ['tuba'], x: 2, z: 0 }] }))
      tapOn(play, play.things[0])
      run(play, 3)
      const label = `from ${from.x},${from.z}`
      expect(Math.hypot(play.x - 2, play.z), label).toBeCloseTo(need(play, play.things[0]), 2)
      // Never on the far side of it, where a tall thing would hide the mouth.
      expect(play.z, label).toBeGreaterThanOrEqual(0.25 * need(play, play.things[0]) - 0.02)
      // The mouth is the narrower of the two, and all but its lip is in view beside the thing.
      expect(play.things[0].onRim, label).toBe(true)
      expect(play.belly, label).toEqual([])
    }
  })

  it('at the near kerb and at the ends of the street it stops beside the thing, inside the street', () => {
    for (const at of [{ x: 0, z: 2.25 }, { x: STREET.x1 - 0.7, z: 2.25 }, { x: STREET.x0 + 0.7, z: 2.25 }, { x: STREET.x1 - 1.1, z: -0.9 }, { x: STREET.x0 + 1.1, z: 0 }]) {
      for (const from of [{ x: -3, z: 0 }, { x: 4, z: -1 }, { x: at.x, z: -2 }]) {
        const play = new Play(world({ hole: from, street: [{ parts: ['hat'], x: at.x, z: at.z }] }))
        tapOn(play, play.things[0])
        run(play, 3)
        const label = `hat at ${at.x},${at.z} from ${from.x},${from.z}`
        expect(Math.hypot(play.x - at.x, play.z - at.z), label).toBeGreaterThanOrEqual(need(play, play.things[0]) - 0.02)
        expect(clampHole(play.x, play.z, play.wants), label).toEqual({ x: play.x, z: play.z })
        expect(play.things[0].onRim, label).toBe(true)
      }
    }
  })

  it('the mouth tugs at it with a sound of its own, the thing teeters for as long, and then the mouth lets go and both are still', () => {
    const play = new Play(world({ hole: { x: -2, z: 1.5 }, street: [{ parts: ['drummer'], x: 2, z: 0 }] }))
    tapOn(play, play.things[0])
    const coming = run(play, 0.6)
    expect(coming.filter((cue) => cue.type === 'strain')).toEqual([{ type: 'strain', kind: 'drummer' }])
    // It points from the hole to the thing.
    const far = Math.hypot(2 - play.x, -play.z)
    expect(play.strainX).toBeCloseTo((2 - play.x) / far, 1)
    expect(play.strainZ).toBeCloseTo(-play.z / far, 1)
    run(play, 0.6)
    expect(play.speed).toBeLessThan(0.5)
    expect(play.strain).toBeGreaterThan(0.1)
    expect(play.things[0].amp).toBeGreaterThan(0.1)
    run(play, STRAIN_SECONDS + 3)
    expect(play.strain).toBe(0)
    expect(play.things[0].amp).toBeLessThan(0.05)
    // A second tap on it, with the mouth at its foot already: it tugs again.
    play.cues.length = 0
    play.press(on(play.things[0]))
    expect(play.cues).toContainEqual({ type: 'strain', kind: 'drummer' })
    expect(play.strain).toBe(1)
    play.tap()
    // Called away, it lets go at once.
    play.press({ on: 'street', x: -5, z: 2 })
    run(play, 1)
    expect(play.strain).toBe(0)
  })

  it('does not tug at a thing it can take', () => {
    const play = new Play(world({ hole: { x: -2, z: 1.5 }, street: [{ parts: ['pie'], x: 2, z: 0 }] }))
    tapOn(play, play.things[0])
    expect(run(play, 2).some((cue) => cue.type === 'strain')).toBe(false)
    expect(play.belly).toEqual(['pie'])
  })

  it('a finger that leads the hole to its middle and stays there holds the mouth at its foot', () => {
    const play = new Play(world({ hole: { x: -2, z: 1 }, street: [{ parts: ['tuba'], x: 2, z: 0 }] }))
    play.press({ on: 'street', x: -1, z: 1 })
    for (let i = 0; i <= 20; i++) { play.drag(-1 + (i / 20) * 3, 1 - i / 20); run(play, 0.05) }
    run(play, 2)
    expect(Math.hypot(play.x - 2, play.z)).toBeCloseTo(need(play, play.things[0]), 2)
    play.letGo()
    run(play, 2)
    expect(Math.hypot(play.x - 2, play.z)).toBeCloseTo(need(play, play.things[0]), 2)
  })

  it('a drag leads the hole across under it; taken away while the hole is under, the hole comes out to its foot, and is found there', () => {
    const play = new Play(world({ hole: { x: -2, z: 1 }, street: [{ parts: ['tuba'], x: 2, z: 0 }] }))
    play.press({ on: 'street', x: -1, z: 1 })
    play.drag(6, -1)
    let under = false
    for (let i = 0; i < 120 && !under; i++) {
      run(play, FRAME)
      under = Math.hypot(play.x - 2, play.z) < 0.5
    }
    // On its way across, the hole was under the thing, which teetered.
    expect(under).toBe(true)
    expect(play.things[0].onRim).toBe(true)
    play.halt()
    // Put away at that moment and found again: the hole lies at the thing's foot, with nothing in motion.
    const found = new Play(play.world())
    expect(Math.hypot(found.x - 2, found.z)).toBeGreaterThanOrEqual(need(found, found.things[0]) - 0.02)
    const before = JSON.stringify(found.world())
    run(found, 2)
    expect(JSON.stringify(found.world())).toBe(before)
    // Left on the surface, it slips out to the same foot.
    run(play, 3)
    expect(Math.hypot(play.x - 2, play.z)).toBeCloseTo(need(play, play.things[0]), 2)
  })

  it('on every street as it is laid, whatever is tapped and in whatever order, the hole never rests with more than its lip under a thing it cannot take', () => {
    for (const id of ['few', 'some', 'many']) {
      for (let seed = 1; seed <= 6; seed++) {
        const play = new Play(world({ hole: { ...HOLE_START }, street: layStreet(id, seed) })), rng = makeRng(seed)
        for (let turn = 0; turn < 14 && play.things.length > 0; turn++) {
          tapOn(play, play.things[Math.floor(rng.next() * play.things.length)])
          run(play, 2.5)
          for (const thing of play.things) {
            if (takes(play.belly, thing.parts)) continue
            expect(Math.hypot(play.x - thing.x, play.z - thing.z), `${id} ${seed} turn ${turn} ${thing.parts.join('+')}`).toBeGreaterThanOrEqual(need(play, thing) - 0.03)
          }
        }
      }
    }
  })
})

describe('nothing tips in under a stack that rides', () => {
  it('the stack is let down first, and the thing goes in when the stack is out of the way', () => {
    // A wide mouth, a pie riding over it, and a pie standing just far enough off that a short move of the hole brings it over the mouth.
    const play = new Play(world({ belly: ['tuba', 'tuba', 'balloon', 'balloon', 'dog', 'dog'], breath: ['pie'], street: [{ parts: ['pie'], x: 1.45, z: 0 }] }))
    play.press({ on: 'street', x: 0.36, z: 0 })
    const order: string[] = []
    for (let i = 0; i < 120; i++) {
      const rode = play.riders.length
      play.step(FRAME)
      if (rode > 0 && play.riders.length === 0) order.push('let down')
      for (const cue of play.cues) if (cue.type === 'setdown' || cue.type === 'drop') order.push(cue.type)
      play.cues.length = 0
      // While a thing is on its way in, nothing rides over the mouth and nothing is hopping down beside it.
      if (play.falling.length > 0) {
        expect(play.riders, `frame ${i}`).toHaveLength(0)
        for (const thing of play.things) if (thing.hop < 1) expect(Math.hypot(thing.sx - play.x, thing.sz - play.z), `frame ${i}`).toBeGreaterThanOrEqual((play.mouth + widthOf(thing.parts)) / 2)
      }
    }
    expect(Math.hypot(play.x, play.z)).toBeLessThan(LET_DOWN)
    expect(order[0]).toBe('let down')
    expect([...order].sort()).toEqual(['drop', 'let down', 'setdown'])
    expect(play.belly[play.belly.length - 1]).toBe('pie')
    expect(play.things.map((thing) => thing.parts)).toEqual([['pie']])
  })
})

describe('a stack set down on a street with no place where it covers nothing', () => {
  it('stands where it hides fewest, and each thing it would hide steps out from behind it: afterwards it covers nothing and nothing covers it', () => {
    let stepped = 0, count = 0, frames = 0
    for (const id of ['some', 'many']) {
      for (let seed = 1; seed <= 12; seed++) {
        for (const parts of [['tuba', 'drummer', 'balloon'], ['balloon', 'pie', 'balloon'], ['pie', 'pie', 'pie', 'hat', 'dog', 'balloon', 'balloon', 'tuba'], ['dog', 'drummer', 'tuba', 'balloon']] as Kind[][]) {
          const street = [...layStreet(id, seed)]
          // The stack is made of things of this street, and so is the belly: a street never holds more than was laid on it.
          if (!parts.every((kind) => { const at = street.findIndex((standing) => standing.parts[0] === kind); if (at >= 0) street.splice(at, 1); return at >= 0 })) continue
          const belly = street.splice(0, 1).map((standing) => standing.parts[0])
          for (const [fx, fz, tx, tz] of [[0, 0.4, 3, 0.4], [-4, -0.5, -1, 0.5], [4, 1.5, 4, -1.5], [3, -1.6, 0, -1]]) {
            const play = new Play(world({ hole: { x: fx, z: fz }, belly, breath: parts, street }))
            const before = play.things.map((thing) => `${thing.x},${thing.z}`)
            const label = `${id} ${seed} ${parts.join('+')} from ${fx},${fz}`
            // The stack is let down, and what steps aside does so, with nothing in anything at any frame.
            expect(crossing(play), label).toBeNull()
            play.press({ on: 'street', x: tx, z: tz })
            for (let i = 0; i < 300; i++) {
              run(play, FRAME)
              expect(crossing(play), `${label} frame ${i}`).toBeNull()
              frames += 1
            }
            const stack = play.things.find((thing) => thing.parts.length === parts.length)
            if (!stack) continue
            count += 1
            const others = play.things.filter((thing) => thing !== stack)
            const hidden = hiddenBy(stack.parts, stack.x, stack.z, others)
            expect(hidden.behind.map((thing) => thing.parts.join('+')), label).toEqual([])
            expect(hidden.before.map((thing) => thing.parts.join('+')), label).toEqual([])
            expect(hidesGate(stack.parts, stack.x, stack.z), label).toBe(false)
            expect(play.crowded, label).toBe(0)
            // Nothing stands on or against anything, the stepped ones included.
            for (const a of play.things) for (const b of play.things) if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z) - (widthOf(a.parts) + widthOf(b.parts)) / 2, label).toBeGreaterThanOrEqual(GAP - 0.02)
            if (others.some((thing, index) => `${thing.x},${thing.z}` !== before[index])) stepped += 1
          }
        }
      }
    }
    expect(count).toBeGreaterThan(200)
    expect(frames).toBeGreaterThan(300 * 200)
    // On the fullest streets some thing did have to step out.
    expect(stepped).toBeGreaterThan(0)
  })
})

describe('nothing is in anything, at any frame', () => {
  const CROWDED: Standing[] = [
    { parts: ['drummer'], x: -4.86, z: -0.69 }, { parts: ['tuba'], x: -2.17, z: -0.88 }, { parts: ['tuba'], x: 0.48, z: -0.86 },
    { parts: ['dog'], x: -3.59, z: 2.17 }, { parts: ['dog'], x: -1.8, z: 2.11 }, { parts: ['dog'], x: 0.02, z: 2.18 }, { parts: ['hat'], x: 1.7, z: 2.26 },
    { parts: ['pie'], x: 3.15, z: 0.93 }, { parts: ['pie'], x: 4.6, z: 2.24 }, { parts: ['pie'], x: 4.51, z: 0.75 },
  ]

  it('a stack let down on the fullest street, as the audit plays it: the things in its way step out one after the other, on the ground or over a low thing, never through the stack that hangs, and then it comes down', () => {
    for (const frame of [FRAME, 0.033]) {
      const play = new Play(world({ hole: { x: 4, z: -1 }, belly: [], breath: ['balloon', 'pie', 'balloon'], street: CROWDED }))
      // The save is one the game writes: the stack rides clear of every thing, and nothing moves when it is opened.
      expect(play.world().street).toEqual(CROWDED)
      expect(play.riders).toHaveLength(3)
      for (let i = 0; i < Math.round(1.6 / frame); i++) play.step(frame)
      expect(play.world().street).toEqual(CROWDED)
      play.press({ on: 'street', x: 5.5, z: 1.8 })
      play.tap()
      let round = 0, over = 0, highest = 0
      for (let i = 0; i < Math.round(6 / frame); i++) {
        play.step(frame)
        play.cues.length = 0
        expect(crossing(play), `frame ${i} of ${frame}`).toBeNull()
        for (const thing of play.things) {
          if (!thing.walk || !thing.walk.aside || play.turns.includes(thing)) continue
          if (thing.walk.over > 0) over += 1
          else round += 1
          highest = Math.max(highest, thing.leap)
        }
        // The stack hangs where it rode for as long as a thing has still to set off.
        const stack = play.things.find((thing) => thing.parts.length === 3)
        if (stack && play.turns.some((thing) => thing !== stack)) expect(stack.hop, `frame ${i}`).toBe(0)
      }
      expect(round).toBeGreaterThan(0)
      expect(over).toBeGreaterThan(0)
      // What went over went over a pie, not over the stack.
      expect(highest).toBeLessThan(1.5)
      expect(play.turns).toHaveLength(0)
      expect(play.crowded).toBe(0)
      expect(play.things.every((thing) => thing.walk === null && thing.hop >= 1 && thing.leap === 0 && thing.air === 0)).toBe(true)
      expect(play.things.filter((thing, index) => index < CROWDED.length && (thing.x !== CROWDED[index].x || thing.z !== CROWDED[index].z))).toHaveLength(2)
    }
  })

  it('a save with a thing standing where its stack rides is found with the thing beside the stack, and one with no place for the thing with the stack in the belly', () => {
    const beside = new Play(world({ hole: { x: 1.5, z: 0.3 }, breath: ['balloon', 'pie', 'balloon'], street: CROWDED }))
    expect(crossing(beside)).toBeNull()
    expect(beside.riders).toHaveLength(3)
    expect(beside.world().street.filter((standing, index) => standing.x !== CROWDED[index].x || standing.z !== CROWDED[index].z).map((standing) => standing.parts)).toEqual([['tuba']])
    expect(beside.things.every((thing) => thing.walk === null && thing.sx === thing.x && thing.sz === thing.z)).toBe(true)
    // A street of drummers shoulder to shoulder has no place for one more to step to.
    const full: Standing[] = [-5.2, -2.3, 0.6, 3.5].flatMap((x) => [{ parts: ['drummer' as Kind], x, z: -0.7 }, { parts: ['drummer' as Kind], x, z: 1.9 }])
    const none = new Play(world({ hole: { x: 0.6, z: 0.6 }, belly: ['pie'], breath: ['hat', 'drummer'], street: full }))
    expect(none.riders).toHaveLength(0)
    expect(none.belly).toEqual(['pie', 'drummer', 'hat'])
    expect(none.world().street).toEqual(full)
  })

  it('in play as it comes: the hole led about, tapped and things touched, on full streets, for minutes', () => {
    let over = 0, round = 0, refused = 0, burps = 0, lets = 0
    for (const id of ['some', 'many']) {
      for (let seed = 1; seed <= 12; seed++) {
        const rng = makeRng(seed * 7 + 3)
        const play = new Play(world({ hole: { x: 5.2, z: 1.6 }, street: [...layStreet(id, 1 + (seed % 12))] }))
        const kinds = kindsIn(play)
        const steps = (count: number, label: string): void => {
          for (let i = 0; i < count; i++) {
            play.step(FRAME)
            for (const cue of play.cues) {
              if (cue.type === 'hiccup' && play.belly.length > 0) refused += 1
              if (cue.type === 'burp') burps += 1
              if (cue.type === 'setdown') lets += 1
            }
            play.cues.length = 0
            for (const thing of play.things) {
              if (thing.hop > 0 && thing.hop < 1 && thing.over > 0) over += 1
              if (thing.walk && thing.walk.aside && !play.turns.includes(thing)) { if (thing.walk.over > 0) over += 1; else round += 1 }
            }
            expect(crossing(play), `${id} ${seed} ${label} frame ${i}`).toBeNull()
          }
        }
        for (let act = 0; act < 60; act++) {
          const pick = rng.next()
          if (pick < 0.45) play.press({ on: 'street', x: -6 + rng.next() * 12, z: -1.8 + rng.next() * 4 })
          else if (pick < 0.8) play.press({ on: 'hole', x: play.x, z: play.z })
          else if (play.things.length > 0) { const thing = play.things[Math.floor(rng.next() * play.things.length)]; play.press(on(thing)) }
          play.tap()
          steps(3 + Math.floor(rng.next() * 70), `act ${act}`)
        }
        // Left alone, the street comes to rest: nothing waits for a turn that never comes.
        steps(600, 'rest')
        expect(play.turns, `${id} ${seed}`).toHaveLength(0)
        expect(play.riders.every((rider) => rider.wait === 0), `${id} ${seed}`).toBe(true)
        expect(play.things.every((thing) => thing.walk === null && thing.hop >= 1 && thing.leap === 0 && thing.air === 0), `${id} ${seed}`).toBe(true)
        expect(play.crowded, `${id} ${seed}`).toBe(0)
        expect(kindsIn(play), `${id} ${seed}`).toEqual(kinds)
      }
    }
    // All of it happened: things came up and were let down, stepped round and went over, and a tap with no room was a hiccup.
    expect(burps).toBeGreaterThan(100)
    expect(lets).toBeGreaterThan(80)
    expect(round).toBeGreaterThan(0)
    expect(over).toBeGreaterThan(0)
    expect(refused).toBeGreaterThan(0)
  })

  it('the hole stays where it is while a thing waits down in its mouth for room, and goes when the thing is up', () => {
    const play = new Play(world({ belly: ['pie', 'hat'], street: [{ parts: ['drummer'], x: 1.1, z: 0.3 }] }))
    run(play, 0.5)
    play.press({ on: 'hole', x: play.x, z: play.z })
    play.tap()
    expect(play.riders[0].wait).toBeGreaterThan(0)
    const at = { x: play.x, z: play.z }
    play.press({ on: 'street', x: -4, z: 1 })
    play.tap()
    let waited = 0
    for (let i = 0; i < 240; i++) {
      const waits = play.riders.some((rider) => rider.wait > 0)
      run(play, FRAME)
      if (waits) { waited += 1; expect({ x: play.x, z: play.z }, `frame ${i}`).toEqual(at) }
      expect(crossing(play), `frame ${i}`).toBeNull()
    }
    expect(waited).toBeGreaterThan(0)
    expect(play.x).toBeCloseTo(-4, 1)
    // The hat came up and was let down when the hole left.
    expect(play.things.map((thing) => thing.parts.join('+')).sort()).toEqual(['drummer', 'hat'])
  })

  it('a stack the hole leaves while another is still walking hangs where it rode until the street stands still; a tap on the hole meanwhile is a hiccup', () => {
    const play = new Play(world({ belly: ['pie', 'hat'], breath: ['dog', 'tuba', 'drummer'] }))
    play.press({ on: 'street', x: 4, z: 1.5 })
    play.tap()
    run(play, 1)
    const march = play.things[0]
    expect(march.walk).not.toBeNull()
    play.press({ on: 'hole', x: play.x, z: play.z })
    play.tap()
    expect(play.riders.map((rider) => rider.kind)).toEqual(['hat'])
    play.press({ on: 'street', x: 4, z: -1.5 })
    play.tap()
    run(play, 0.6)
    // The march is still on: the hat hangs where it came up, and the hole, gone from under it, has nothing to bring up there.
    expect(march.walk).not.toBeNull()
    expect(Math.hypot(play.x - play.anchor.x, play.z - play.anchor.z)).toBeGreaterThan(LET_DOWN)
    expect(play.riders.map((rider) => rider.kind)).toEqual(['hat'])
    play.press({ on: 'hole', x: play.x, z: play.z })
    play.tap()
    expect(play.cues.map((cue) => cue.type)).toContain('hiccup')
    expect(play.belly).toEqual(['pie'])
    // Saved at this moment and loaded with no put-away, it is found with the hat hanging where it hangs and the hole under it, and nothing in anything.
    const saved = play.world(), found = new Play(saved)
    expect(Math.hypot(saved.hole.x - play.anchor.x, saved.hole.z - play.anchor.z)).toBeLessThan(0.001)
    expect(saved.breath).toEqual(['hat'])
    expect(found.world()).toEqual(saved)
    expect(crossing(found)).toBeNull()
    let hung = 0
    for (let i = 0; i < 300; i++) {
      const walking = march.walk !== null
      run(play, FRAME)
      if (walking) { hung += 1; expect(play.riders, `frame ${i}`).toHaveLength(1) }
      expect(crossing(play), `frame ${i}`).toBeNull()
    }
    expect(hung).toBeGreaterThan(0)
    expect(play.riders).toHaveLength(0)
    expect(play.things.map((thing) => thing.parts.join('+')).sort()).toEqual(['dog+tuba+drummer', 'hat'])
  })
})

/** Everything of a play that is seen or saved, for holding one play against another. */
const snap = (play: Play) => ({
  x: play.x, z: play.z, mouth: play.mouth, strain: play.strain, speed: play.speed, gulp: play.gulp, pucker: play.pucker, bob: play.bob, anchor: play.anchor,
  belly: [...play.belly], riders: play.riders.map((rider) => ({ ...rider })), things: play.things.map((thing) => ({ ...thing })),
  turns: play.turns.length, falling: play.falling.length, world: play.world(),
})

describe('nothing starts on load', () => {
  /** The hole led to a thing's foot and left to come to rest there, with the thing on its rim. */
  const atFoot = (kind: Kind, belly: Kind[]): Play => {
    const play = new Play(world({ hole: { x: -4, z: 0 }, belly, street: [{ parts: [kind], x: 1, z: 0 }] }))
    play.press({ on: 'street', x: 1 - (mouthOf(belly) + footOf([kind])) / 2 + 0.15, z: 0 })
    play.tap()
    run(play, 4)
    return play
  }

  it('a hole left at a thing\'s foot is found with the thing leaning over its rim as it leant: no wobble, no tug and no sound, for each thing, parked and returned or saved and loaded', () => {
    let tugged = 0, fitted = 0
    for (const kind of KINDS) {
      for (const belly of [[], ['dog', 'dog', 'tuba']] as Kind[][]) {
        const label = `${kind} at a belly of ${belly.length}`
        const play = atFoot(kind, belly), thing = play.things[0]
        // It is there, on the rim, and the reaction it set off when the rim came under it is over.
        expect(play.things, label).toHaveLength(1)
        expect(thing.onRim, label).toBe(true)
        expect(thing.lean, label).toBeGreaterThan(0)
        if (takes(belly, [kind])) fitted += 1
        else tugged += 1
        const loaded = new Play(play.world())
        const parked = atFoot(kind, belly)
        expect(parked.rest(), label).toBeNull()
        for (const found of [loaded, parked]) {
          const there = found.things[0]
          expect(there.onRim, label).toBe(true)
          expect(there.lean, label).toBeCloseTo(thing.lean, 2)
          expect(there.dirX, label).toBeCloseTo(thing.dirX, 5)
          expect([there.amp, found.strain, found.speed], label).toEqual([0, 0, 0])
          // Played on, nothing is heard and nothing moves: no teeter for the mayor to jump at, no rattle for the gate keeper's ears, no tug.
          expect(run(found, 2), label).toEqual([])
          expect([there.amp, found.strain, found.speed], label).toEqual([0, 0, 0])
          expect(there.lean, label).toBeCloseTo(thing.lean, 2)
          expect(found.world(), label).toEqual(play.world())
        }
        expect(snap(parked), label).toEqual(snap(loaded))
      }
    }
    expect(tugged).toBeGreaterThan(0)
    expect(fitted).toBeGreaterThan(0)
  })

  it('the same hole, come to that foot in play, did set the thing wobbling: the test above is of a real rim', () => {
    const play = new Play(world({ hole: { x: -4, z: 0 }, street: [{ parts: ['tuba'], x: 1, z: 0 }] }))
    play.press(on(play.things[0]))
    play.tap()
    const heard = run(play, 2).map((cue) => cue.type)
    expect(heard).toContain('teeter')
    expect(heard).toContain('strain')
  })
})

describe('put away equals loaded', () => {
  const still = (play: Play, label: string): void => {
    expect(play.turns, label).toHaveLength(0)
    expect(play.falling, label).toHaveLength(0)
    expect(play.things.every((thing) => thing.walk === null && thing.hop >= 1 && thing.leap === 0 && thing.air === 0 && !thing.away && !thing.coming), label).toBe(true)
    expect(play.riders.every((rider) => rider.wait === 0), label).toBe(true)
    if (play.riders.length > 0) expect(Math.hypot(play.x - play.anchor.x, play.z - play.anchor.z), label).toBeLessThanOrEqual(LET_DOWN)
    expect(crossing(play), label).toBeNull()
    // What is left is what a load of its save finds, to the last number.
    expect(snap(play), label).toEqual(snap(new Play(play.world())))
  }

  it('a glide in progress is settled at its end, and what the hole takes at the end of it is in the belly, unheard', () => {
    const make = (): Play => {
      const play = new Play(world({ hole: { x: -5, z: 0 }, street: [{ parts: ['pie'], x: 3, z: 0 }, { parts: ['tuba'], x: -1, z: 2 }] }))
      play.press(on(play.things[0]))
      play.tap()
      run(play, 0.1)
      return play
    }
    const played = make(), parked = make()
    expect(Math.hypot(parked.x - 3, parked.z)).toBeGreaterThan(2)
    expect(parked.world().hole.x).toBeLessThan(1)
    run(played, 6)
    expect(played.belly).toEqual(['pie'])
    expect(parked.rest()).toBeNull()
    expect(parked.cues).toEqual([])
    expect(parked.urgent).toBe(true)
    const end = played.world(), found = parked.world()
    expect(found.hole.x).toBeCloseTo(end.hole.x, 2)
    expect(found.hole.z).toBeCloseTo(end.hole.z, 2)
    expect(found.belly).toEqual(end.belly)
    expect(found.street).toEqual(end.street)
    still(parked, 'glide')
    expect(run(parked, 2)).toEqual([])
    expect(parked.world()).toEqual(found)
  })

  it('a drag the put-away takes from under the finger stops the hole where it is, and it is found there', () => {
    const play = new Play(world({ street: [{ parts: ['tuba'], x: -4, z: 2 }] }))
    play.press({ on: 'street', x: 5, z: 1 })
    play.drag(5, 1)
    run(play, 0.1)
    play.halt()
    const x = play.x, z = play.z
    expect(play.rest()).toBeNull()
    expect(play.x).toBeCloseTo(x, 3)
    expect(play.z).toBeCloseTo(z, 3)
    still(play, 'drag')
  })

  it('a stack left hanging while another walks is let down and stands where a load finds it, and a stack on its way down or walking stands on its spot', () => {
    const make = (): Play => {
      const play = new Play(world({ belly: ['pie', 'hat'], breath: ['dog', 'tuba', 'drummer'] }))
      play.press({ on: 'street', x: 4, z: 1.5 })
      play.tap()
      run(play, 1)
      play.press({ on: 'hole', x: play.x, z: play.z })
      play.tap()
      play.press({ on: 'street', x: 4, z: -1.5 })
      play.tap()
      run(play, 0.6)
      return play
    }
    const played = make(), parked = make()
    // The march is on its way and the hat hangs where the hole left it.
    expect(parked.things[0].walk).not.toBeNull()
    expect(parked.riders.map((rider) => rider.kind)).toEqual(['hat'])
    expect(Math.hypot(parked.x - parked.anchor.x, parked.z - parked.anchor.z)).toBeGreaterThan(LET_DOWN)
    const kinds = kindsIn(parked)
    expect(parked.rest()).toBeNull()
    expect(parked.cues).toEqual([])
    expect(parked.riders).toHaveLength(0)
    expect(parked.things.map((thing) => thing.parts.join('+')).sort()).toEqual(['dog+tuba+drummer', 'hat'])
    expect(kindsIn(parked)).toEqual(kinds)
    still(parked, 'hanging')
    // It is where the same play, watched to its end, leaves everything.
    run(played, 8)
    const end = played.world(), found = parked.world()
    expect(found.belly).toEqual(end.belly)
    expect(found.hole.x).toBeCloseTo(end.hole.x, 2)
    expect(found.hole.z).toBeCloseTo(end.hole.z, 2)
    for (const stood of end.street) {
      const same = found.street.find((other) => other.parts.join('+') === stood.parts.join('+'))!
      expect(Math.hypot(same.x - stood.x, same.z - stood.z), stood.parts.join('+')).toBeLessThan(0.02)
    }
    // Played on after the put-away, nothing lands, thumps or whistles a second time.
    expect(run(parked, 2)).toEqual([])
  })

  it('a hole gliding out from under a stack that holds the whole street: the float is reported once, unheard, and the street is bare', () => {
    const play = new Play(world({ breath: ['pie', 'hat', 'dog'] }))
    play.press({ on: 'street', x: 4, z: 0 })
    play.tap()
    run(play, FRAME)
    expect(play.riders).toHaveLength(3)
    const float = play.rest()
    expect(float).toEqual({ type: 'float', parts: ['pie', 'hat', 'dog'], x: 0, z: 0 })
    expect(play.cues).toEqual([])
    expect(play.bare).toBe(true)
    still(play, 'float')
    expect(play.rest()).toBeNull()
  })

  it('at any moment of play as it comes, on full streets: nothing is on its way afterwards, nothing is in anything, nothing is lost, and played on, nothing starts', () => {
    let rests = 0, landed = 0
    for (const id of ['some', 'many']) {
      for (let seed = 1; seed <= 10; seed++) {
        const rng = makeRng(seed * 13 + 5)
        const play = new Play(world({ hole: { x: 5.2, z: 1.6 }, street: [...layStreet(id, 1 + (seed % 12))] }))
        const kinds = kindsIn(play)
        for (let act = 0; act < 40; act++) {
          const pick = rng.next()
          if (pick < 0.45) play.press({ on: 'street', x: -6 + rng.next() * 12, z: -1.8 + rng.next() * 4 })
          else if (pick < 0.8) play.press({ on: 'hole', x: play.x, z: play.z })
          else if (play.things.length > 0) { const thing = play.things[Math.floor(rng.next() * play.things.length)]; play.press(on(thing)) }
          play.tap()
          run(play, (2 + Math.floor(rng.next() * 40)) * FRAME)
          if (act % 4 !== 3) continue
          const label = `${id} ${seed} act ${act}`
          const moving = play.turns.length > 0 || play.things.some((thing) => thing.walk !== null || thing.hop < 1)
          const float = play.rest()
          rests += 1
          if (moving) landed += 1
          expect(play.cues, label).toEqual([])
          still(play, label)
          if (float) break
          expect(kindsIn(play), label).toEqual(kinds)
          // Played on with no touch, the stack on the breath bobs and plays, and nothing else is heard.
          expect(run(play, 0.5).filter((cue) => cue.type !== 'bob'), label).toEqual([])
        }
      }
    }
    expect(rests).toBeGreaterThan(100)
    expect(landed).toBeGreaterThan(20)
  })
})

describe('what the reading asked for', () => {
  it('the thump comes with the landing: in play as it comes, every stack let down is heard in the frame it lands and not before, however long it hung waiting its turn', () => {
    let downs = 0, waited = 0
    for (const id of ['some', 'many']) {
      for (let seed = 1; seed <= 8; seed++) {
        const rng = makeRng(seed * 7 + 3)
        const play = new Play(world({ hole: { x: 5.2, z: 1.6 }, street: [...layStreet(id, 1 + (seed % 12))] }))
        /** The seconds each stack has been in the air since the hole slipped from under it. */
        const up = new Map<Thing, number>()
        for (let act = 0; act < 50; act++) {
          const pick = rng.next()
          if (pick < 0.45) play.press({ on: 'street', x: -6 + rng.next() * 12, z: -1.8 + rng.next() * 4 })
          else if (pick < 0.8) play.press({ on: 'hole', x: play.x, z: play.z })
          else if (play.things.length > 0) { const thing = play.things[Math.floor(rng.next() * play.things.length)]; play.press(on(thing)) }
          play.tap()
          for (let i = 0; i < 3 + Math.floor(rng.next() * 70); i++) {
            play.step(FRAME)
            const landed = play.things.filter((thing) => up.has(thing) && thing.hop >= 1)
            const heard = play.cues.filter((cue) => cue.type === 'setdown')
            // One thump for each stack that came down in this frame, at the place it came down, and none for a stack still in the air.
            expect(heard.length, `${id} ${seed} act ${act} frame ${i}`).toBe(landed.length)
            for (const thing of landed) {
              expect(heard).toContainEqual({ type: 'setdown', parts: thing.parts, x: thing.sx, z: thing.sz })
              expect([thing.air, thing.squash]).toEqual([0, 1])
              downs += 1
              if (up.get(thing)! > 0.6) waited += 1
              up.delete(thing)
            }
            for (const thing of play.things) if (thing.hop < 1) up.set(thing, (up.get(thing) ?? 0) + FRAME)
            play.cues.length = 0
          }
        }
      }
    }
    expect(downs).toBeGreaterThan(20)
    // Some of them hung a good while first, far longer than the hop itself takes.
    expect(waited).toBeGreaterThan(0)
  })

  it('the secret of a stack is heard as it lands and sets off, with its thump', () => {
    const play = new Play(world({ breath: ['balloon', 'pie', 'balloon'], street: [{ parts: ['hat'], x: -5, z: 2 }] }))
    play.press({ on: 'street', x: 4, z: 0 })
    play.tap()
    const frames: string[][] = []
    for (let i = 0; i < 120; i++) {
      play.step(FRAME)
      frames.push(play.cues.map((cue) => (cue.type === 'secret' ? `secret ${cue.which}` : cue.type)))
      play.cues.length = 0
    }
    const down = frames.findIndex((cues) => cues.includes('setdown'))
    expect(down).toBeGreaterThan(0)
    expect(frames[down]).toContain('secret bounce')
    expect(frames.filter((cues) => cues.includes('secret bounce'))).toHaveLength(1)
  })

  it('the lip is heard letting go in the frame it lets go: when the tug has died away, and at once when the hole is led off', () => {
    const play = new Play(world({ hole: { x: -3, z: 0 }, street: [{ parts: ['tuba'], x: 1, z: 0 }] }))
    play.press(on(play.things[0]))
    play.tap()
    let strained = 0, loose = 0
    for (let i = 0; i < 600 && loose === 0; i++) {
      const before = play.strain
      play.step(FRAME)
      strained += play.cues.filter((cue) => cue.type === 'strain').length
      if (play.cues.some((cue) => cue.type === 'loose')) {
        loose += 1
        expect(before).toBeGreaterThan(0)
        expect(play.strain).toBe(0)
        expect(play.cues).toContainEqual({ type: 'loose', kind: 'tuba' })
      }
      play.cues.length = 0
    }
    expect([strained, loose]).toEqual([1, 1])
    // Once: the lip that has let go is not heard again while the hole rests there.
    expect(run(play, 2)).toEqual([])
    // Touched again it tugs again; led off in the middle of the tug, it lets go at once.
    play.press(on(play.things[0]))
    play.tap()
    run(play, 0.2)
    expect(play.strain).toBeGreaterThan(0.5)
    play.press({ on: 'street', x: -5, z: 0 })
    play.tap()
    const heard = run(play, 0.3)
    expect(heard.filter((cue) => cue.type === 'loose')).toEqual([{ type: 'loose', kind: 'tuba' }])
    expect(play.strain).toBe(0)
  })

  it('a finger on a hole that is gliding holds it where it is, and a lift there burps there', () => {
    const play = new Play(world({ belly: ['pie'] }))
    play.press({ on: 'street', x: 5, z: 1 })
    play.tap()
    run(play, 0.1)
    const x = play.x, z = play.z
    expect(x).toBeGreaterThan(0.5)
    expect(x).toBeLessThan(4.5)
    play.press({ on: 'hole', x, z })
    run(play, 1)
    expect([play.x, play.z]).toEqual([x, z])
    expect(play.speed).toBe(0)
    play.tap()
    expect(play.cues.map((cue) => cue.type)).toContain('burp')
    expect(play.anchor).toEqual({ x, z })
    run(play, 1)
    expect([play.x, play.z]).toEqual([x, z])
  })

  it('one clock on the breath: each bob is heard in the frame the stack\'s rise and fall begins again, at any load', () => {
    for (const breath of [['pie', 'hat'], ['dog', 'tuba', 'drummer', 'balloon']] as Kind[][]) {
      const play = new Play(world({ breath }))
      let heard = 0, before = play.bob
      for (let i = 0; i < 600; i++) {
        play.step(FRAME)
        const wrapped = play.bob < before
        expect(play.cues.some((cue) => cue.type === 'bob'), `${breath.join('+')} frame ${i}`).toBe(wrapped)
        if (wrapped) heard += 1
        before = play.bob
        play.cues.length = 0
      }
      expect(heard).toBeGreaterThan(2)
    }
  })

  it('a touch that ends the coming in of a street ends it whole: the hole is at its place on that street, and sets off from there', () => {
    const play = new Play(world({ hole: { x: -6, z: 2 } }))
    const to = play.makeWay()
    run(play, 0.1)
    expect(Math.hypot(play.x - to.x, play.z - to.z)).toBeGreaterThan(1)
    play.arrive()
    expect([play.x, play.z]).toEqual([to.x, to.z])
    expect(play.speed).toBe(0)
    expect(play.world().hole).toEqual({ x: to.x, z: to.z })
    // With no street coming in there is nothing to end: a hole the child sent goes on gliding.
    play.press({ on: 'street', x: -5, z: 0 })
    play.tap()
    run(play, 0.1)
    const x = play.x
    play.arrive()
    expect(play.x).toBe(x)
  })
})

describe('what the second reading asked for', () => {
  const tapHole = (play: Play): void => { play.press({ on: 'hole', x: play.x, z: play.z }); play.tap() }

  it('a burp that waits: the tap is answered in its frame by the rim and the hole\'s growl, and the pop, the thing\'s own sound, the scraps and the bystanders come in the frame the thing comes up', () => {
    // The drummer stands half over the mouth: he steps out first, and the hat waits down in the mouth.
    const play = new Play(world({ belly: ['pie', 'hat'], street: [{ parts: ['drummer'], x: 1.1, z: 0.3 }] }))
    run(play, 0.5)
    tapHole(play)
    expect(play.riders[0].wait).toBeGreaterThan(0)
    expect(play.cues.splice(0)).toEqual([{ type: 'pucker' }, { type: 'growl', kind: 'hat' }])
    let up = -1
    for (let frame = 0; frame < 120 && up < 0; frame++) {
      play.step(FRAME)
      // The rim twitches from the first frame on.
      if (frame === 0) expect(play.gulp).toBeGreaterThan(0)
      const burps = play.cues.filter((cue) => cue.type === 'burp')
      if (play.riders[0].wait > 0) expect(burps, `frame ${frame}`).toEqual([])
      else {
        up = frame
        expect(burps).toEqual([{ type: 'burp', kind: 'hat', onto: null, rest: 0, late: true }])
        // It has only now set off from down in the mouth, and sits as a thing that has just come up.
        expect(play.riders[0].y).toBeLessThan(0)
        expect(play.riders[0].since).toBeLessThanOrEqual(FRAME)
      }
      play.cues.length = 0
    }
    // He took a while to step out: the burp was heard that much after the tap, and once.
    expect(up).toBeGreaterThan(5)
    expect(run(play, 1).filter((cue) => cue.type === 'burp' || cue.type === 'growl')).toEqual([])
  })

  it('a burp that waits under a stack: what rode at the bottom is not pushed up, does not sound as sat on and does not play as the new stack until the thing is up', () => {
    const play = new Play(world({ belly: ['balloon'], breath: ['pie'], street: [{ parts: ['dog'], x: 1.6, z: 0 }] }))
    run(play, 0.3)
    tapHole(play)
    play.cues.length = 0
    expect(play.riders.map((rider) => rider.wait > 0)).toEqual([true, false])
    expect(play.riding.map((rider) => rider.kind)).toEqual(['pie'])
    let up = -1
    for (let frame = 0; frame < 120 && up < 0; frame++) {
      play.step(FRAME)
      if (play.riders[0].wait > 0) {
        expect(play.riders[1].y, `frame ${frame}`).toBeCloseTo(HOVER, 2)
        expect(play.cues.filter((cue) => cue.type === 'burp' || cue.type === 'bob'), `frame ${frame}`).toEqual([])
      } else {
        up = frame
        expect(play.cues).toContainEqual({ type: 'burp', kind: 'balloon', onto: 'pie', rest: 1, late: true })
        // The pie sits on the balloon from this frame.
        expect(play.riders[1].since).toBeLessThanOrEqual(FRAME)
      }
      play.cues.length = 0
    }
    expect(up).toBeGreaterThan(5)
    run(play, 0.6)
    expect(play.riders[1].y).toBeCloseTo(HOVER + seatOf(['balloon', 'pie'], 1), 1)
  })

  it('a burp with nothing in its way is heard at the tap, growl and all', () => {
    const play = new Play(world({ belly: ['pie', 'hat'] }))
    tapHole(play)
    expect(play.cues).toEqual([{ type: 'pucker' }, { type: 'over', cause: 'wail' }, { type: 'burp', kind: 'hat', onto: null, rest: 0 }])
  })

  it('the rim snaps to the finger in the frame it lands: the reach is whole through the first step that is drawn, and eases back from the next', () => {
    const play = new Play(world())
    run(play, 0.2)
    play.press({ on: 'street', x: 4, z: 1 })
    expect(play.lurch).toBe(1)
    // The frame the loop plays next is the one the touch is first drawn in.
    play.step(FRAME)
    expect(play.lurch).toBe(1)
    expect([play.headingX, play.headingZ].map((value) => Math.round(value * 100) / 100)).toEqual([0.97, 0.24])
    play.step(FRAME)
    expect(play.lurch).toBeLessThan(1)
    expect(play.lurch).toBeGreaterThan(0.8)
    run(play, 0.5)
    expect(play.lurch).toBe(0)
    // A press on the hole itself is no call: nothing reaches.
    play.press({ on: 'hole', x: play.x, z: play.z })
    expect(play.lurch).toBe(0)
  })

  it('a thing riding on the breath answers a tap as itself, the one the finger is on, in the frame of the touch; and the stack hides the mouth it rides over, so the touch is the hole\'s as well: it draws its breath, and burps on the lift', () => {
    const play = new Play(world({ belly: ['pie'], breath: ['tuba', 'dog', 'hat'] }))
    run(play, 0.3)
    play.press({ on: 'rider', part: 1, x: 0, z: 0 })
    // The dog's own answer, sounding through the tuba it sits in, and the hole's drawn breath. The hole is not called: it is there.
    expect(play.cues.splice(0)).toEqual([{ type: 'poke', kind: 'dog', deep: true }, { type: 'pucker' }])
    expect(play.riders.map((rider) => rider.poked < 1)).toEqual([false, true, false])
    expect(play.lurch).toBe(0)
    play.tap()
    expect(play.cues.splice(0)).toContainEqual({ type: 'burp', kind: 'pie', onto: 'tuba', rest: 3 })
    expect(play.riders.map((rider) => rider.kind)).toEqual(['pie', 'tuba', 'dog', 'hat'])
    run(play, 0.2)
    expect(play.riders[2].poked).toBeCloseTo(0.2, 2)
    // With nothing left inside, a tap on the bottom one is its own answer and the hole's hiccup.
    run(play, 0.8)
    play.press({ on: 'rider', part: 0, x: 0, z: 0 })
    play.tap()
    expect(play.cues.splice(0).map((cue) => cue.type)).toEqual(['poke', 'pucker', 'hiccup'])
    expect(play.riders).toHaveLength(4)
    // A finger that lands on a thing of the stack and drags leads the hole, as a finger on the mouth does.
    run(play, 0.5)
    play.press({ on: 'rider', part: 3, x: 0, z: 0 })
    play.drag(0.2, 0.1)
    play.letGo()
    run(play, 0.6)
    expect([play.x, play.z].map((value) => Math.round(value * 100) / 100)).toEqual([0.2, 0.1])
    expect(play.riders).toHaveLength(4)
  })

  it('a thing of a stack the hole has left, hanging until the street stands still, answers as itself and calls the hole back under it', () => {
    // A dog is on a long walk across the street, so the stack hangs where it rode while the hole is led away.
    const play = new Play(world({ hole: { x: 0, z: 0 }, breath: ['pie', 'hat'], street: [{ parts: ['dog'], x: -4, z: 1.8 }] }))
    run(play, 0.2)
    play.things[0].walk = { fromX: -6, fromZ: 1.8, steps: 20, seconds: 4, phase: 0, heard: 0, lift: 0, aside: false, over: 0 }
    play.press({ on: 'street', x: 3, z: 1 })
    play.tap()
    run(play, 0.8)
    expect(play.riders).toHaveLength(2)
    expect(Math.hypot(play.x - play.anchor.x, play.z - play.anchor.z)).toBeGreaterThan(0.6)
    play.cues.length = 0
    play.press({ on: 'rider', part: 1, x: play.anchor.x, z: play.anchor.z })
    expect(play.cues.splice(0)).toEqual([{ type: 'poke', kind: 'hat' }, { type: 'slide' }])
    play.tap()
    expect(play.cues.filter((cue) => cue.type === 'burp' || cue.type === 'hiccup')).toEqual([])
    run(play, 1.2)
    expect(play.riders).toHaveLength(2)
    expect(Math.hypot(play.x - play.anchor.x, play.z - play.anchor.z)).toBeLessThan(0.05)
  })

  it('a riding stack plays from its first frame after a load and after a put-away, not a bob late, and keeps its beat from there', () => {
    const parts: Kind[] = ['dog', 'drummer']
    const play = new Play(world({ belly: ['pie'], breath: parts }))
    const bobs = (cues: readonly Cue[]): number => cues.filter((cue) => cue.type === 'bob').length
    play.step(FRAME)
    expect(play.cues.splice(0)).toEqual([{ type: 'bob', parts }])
    // It hangs at the middle of its bob in that frame, as it was found, and rises from there.
    expect(Math.abs(Math.sin(play.bob))).toBeLessThan(0.1)
    // The next comes one bob later, and not sooner.
    const one = bobSeconds(KIND.dog.width + KIND.drummer.width)
    expect(bobs(run(play, one - 3 * FRAME))).toBe(0)
    expect(bobs(run(play, 6 * FRAME))).toBe(1)
    run(play, 0.4)
    // Put away and come back to: the first frame again.
    play.rest()
    expect(play.cues).toEqual([])
    play.step(FRAME)
    expect(play.cues.splice(0)).toEqual([{ type: 'bob', parts }])
    // One thing alone on the breath plays nothing, on a load as at any time.
    const alone = new Play(world({ breath: ['drummer'] }))
    expect(run(alone, 4)).toEqual([])
  })

  it('a step that leaves the street is heard as it lands, and one that stays on it as it begins: the hat\'s hop and a balloon\'s bounce against the dog\'s roll', () => {
    for (const [bottom, lands] of [['hat', true], ['balloon', true], ['dog', false], ['pie', false]] as const) {
      // The stack is let down by leading the hole away, and walks a few steps to where it stands.
      const play = new Play(world({ hole: { x: -5.5, z: 2 }, belly: [], breath: [bottom, 'pie'], street: [{ parts: ['drummer'], x: -5.2, z: -0.4 }, { parts: ['tuba'], x: -3, z: 2 }] }))
      play.press({ on: 'street', x: 4, z: 1 })
      play.tap()
      let steps = 0
      for (let frame = 0; frame < 400; frame++) {
        const stack = play.things.find((thing) => thing.parts.length === 2), then = stack?.walk ? stack.walk.phase : null
        play.step(FRAME)
        const heard = play.cues.filter((cue) => cue.type === 'step').length
        if (stack && then !== null && stack.hop >= 1) {
          const now = stack.walk ? stack.walk.phase : Math.ceil(then)
          // Landing: the count of whole steps done has gone up. Beginning: a new step has been entered, the first with the first frame.
          const landed = Math.floor(now) - Math.floor(then), begun = (then === 0 && now > 0 ? 1 : 0) + (stack.walk ? landed : 0)
          expect(heard, `${bottom} frame ${frame}`).toBe(lands ? landed : begun)
          steps += heard
        }
        play.cues.length = 0
      }
      expect(steps, bottom).toBeGreaterThan(0)
    }
  })
})
