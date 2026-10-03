import { describe, expect, it } from 'vitest'
import { DROPS_PER_GULP } from './drops'
import { levelAt } from './ground'
import { TRUCK } from './layout'
import { Toy } from './toy'
import { LIMITS, type VoiceSpec } from './voices'

const FRAME = 1 / 60

function toy() {
  const heard: VoiceSpec[] = []
  return { toy: new Toy((voice) => heard.push(voice)), heard }
}

/** Plays frames from `from` for `seconds`, and returns the clock at the end. */
function play(t: Toy, from: number, seconds: number, each?: (now: number) => void): number {
  let now = from
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    now = from + (frame + 1) * FRAME
    t.step(FRAME, now)
    each?.(now)
  }
  return now
}

const sand = { truck: false, point: { x: 9, z: 4 } }
const onTruck = { truck: true, point: { x: TRUCK.x, z: TRUCK.z } }

describe('the answer to a touch', () => {
  it('starts when the finger lands, before any frame is played: sound, water and the nozzle', () => {
    const { toy: t, heard } = toy()
    t.press(sand, 0)
    expect(heard).toHaveLength(1)
    expect(t.drops.alive).toBe(DROPS_PER_GULP)
    expect(t.hose.flying).toHaveLength(1)
    // The truck has been knocked: the very next frame shows it rocked back and its nozzle swinging.
    t.step(FRAME, FRAME)
    expect(t.truck.pose.rock).toBeGreaterThan(0.02)
    expect(Math.abs(t.truck.pose.turn)).toBeGreaterThan(0.001)
  })

  it('is bigger than the touch: one tap moves the truck, throws water across the yard and leaves a mark', () => {
    const { toy: t, heard } = toy()
    t.press(sand, 0)
    t.lift()
    let mostRock = 0
    play(t, 0, 1, () => { mostRock = Math.max(mostRock, t.truck.pose.rock) })
    expect(mostRock).toBeGreaterThan(0.1)
    expect(t.paint.at(9, 4).damp).toBeGreaterThan(80)
    expect(levelAt(t.ground, 9, 4)).toBe('damp')
    // The hose with its pop, and then the landing.
    expect(heard).toHaveLength(2)
  })

  it('is one voice at the first touch, since only one can wait for sound to unlock', () => {
    const { toy: t, heard } = toy()
    t.press(sand, 0)
    expect(heard[0].length).toBeLessThanOrEqual(LIMITS.partials)
    expect(heard[0].reduce((sum, partial) => sum + partial.peak, 0)).toBeLessThanOrEqual(LIMITS.loudest)
  })
})

describe('tapping and holding', () => {
  it('leaves a blot for a tap, which is pale again in a quarter of a minute or so', () => {
    const { toy: t } = toy()
    t.press(sand, 0)
    t.lift()
    const now = play(t, 0, 1)
    expect(t.paint.at(9, 4).damp).toBeGreaterThan(0)
    play(t, now, 20)
    expect(t.paint.at(9, 4).damp).toBe(0)
    expect(levelAt(t.ground, 9, 4)).toBe('dry')
  })

  it('leaves a line for a sweep, as long as the sweep', () => {
    const { toy: t } = toy()
    t.press({ truck: false, point: { x: 6, z: 6 } }, 0)
    play(t, 0, 1.2, (now) => t.move({ x: 6 + (now / 1.2) * 7, z: 6 }))
    t.lift()
    play(t, 1.2, 0.6)
    for (let x = 6.5; x <= 12; x += 0.5) expect(t.paint.at(x, 6).damp, `at ${x}`).toBeGreaterThan(6)
    expect(t.paint.at(9, 8.5).damp).toBe(0)
  })

  it('turns a held spot to a puddle and then to mud, each with its own sound', () => {
    const { toy: t, heard } = toy()
    t.press(sand, 0)
    play(t, 0, 2.2)
    t.lift()
    play(t, 2.2, 1)
    expect(levelAt(t.ground, 9, 4)).toBe('mud')
    expect(t.paint.at(9, 4).mud).toBeGreaterThan(200)
    // On sand a landing falls in pitch, in a puddle it rises, and in mud it is lowest.
    const landings = heard.filter((voice) => voice[0].attack <= 0.01 && voice[0].kind === 'noise' ? true : voice[0].glideTo! > voice[0].frequency && voice[0].frequency > 500)
    expect(landings.some((voice) => voice[0].kind === 'tone' && voice[0].glideTo! > voice[0].frequency)).toBe(true)
    expect(landings.some((voice) => voice[0].kind === 'noise' && voice[0].frequency < 400 && voice[0].q === 3)).toBe(true)
  })

  it('keeps a puddle and mud while the damp sand round them dries', () => {
    const { toy: t } = toy()
    t.press(sand, 0)
    play(t, 0, 2.2)
    t.lift()
    play(t, 2.2, 120)
    expect(levelAt(t.ground, 9, 4)).toBe('mud')
    expect(t.paint.at(9, 4).mud).toBeGreaterThan(200)
  })

  it('never has two taps sound the same landing twice running', () => {
    const { toy: t, heard } = toy()
    let now = 0
    for (let tap = 0; tap < 8; tap++) {
      t.press({ truck: false, point: { x: 5 + tap, z: 7 } }, now)
      t.lift()
      now = play(t, now, 0.6)
    }
    const landings = heard.filter((voice) => voice.length === 2 && voice[0].kind === 'noise' && voice[0].q === 1.1)
    expect(landings.length).toBe(8)
    for (let i = 1; i < landings.length; i++) expect(landings[i][0].frequency).not.toBe(landings[i - 1][0].frequency)
  })

  it('goes quiet within a second of the child stopping', () => {
    const { toy: t, heard } = toy()
    t.press(sand, 0)
    play(t, 0, 1)
    t.lift()
    play(t, 1, 0.5)
    const before = heard.length
    play(t, 1.5, 5)
    expect(heard.length).toBe(before)
  })
})

describe('the truck', () => {
  it('takes no water: a touch on it honks, hops and lands with a thud', () => {
    const { toy: t, heard } = toy()
    t.press(onTruck, 0)
    expect(heard).toHaveLength(1)
    expect(t.hose.flying).toHaveLength(0)
    expect(t.drops.alive).toBe(0)
    let highest = 0
    play(t, 0, 2, () => { highest = Math.max(highest, t.truck.pose.lift) })
    expect(highest).toBeGreaterThan(0.15)
    expect(heard).toHaveLength(2)
    expect(t.ground.every((gulps) => gulps === 0)).toBe(true)
  })
})

describe('going to rest', () => {
  it('loses nothing: water in the air is on the sand when the game is found again', () => {
    const { toy: t, heard } = toy()
    t.press(sand, 0)
    const before = heard.length
    t.rest()
    expect(levelAt(t.ground, 9, 4)).toBe('damp')
    expect(t.paint.at(9, 4).damp).toBeGreaterThan(80)
    expect(t.drops.alive).toBe(0)
    expect(t.hose.holding).toBe(false)
    // It lands silently: a resting game makes no sound.
    expect(heard.length).toBe(before)
  })
})

describe('quality tiers', () => {
  it('draw fewer drops and move the same water', () => {
    const full = toy().toy, low = toy().toy
    low.dropsShare = 0.5
    let mostFull = 0, mostLow = 0
    for (const [t, most] of [[full, (n: number) => { mostFull = Math.max(mostFull, n) }], [low, (n: number) => { mostLow = Math.max(mostLow, n) }]] as const) {
      t.press(sand, 0)
      play(t, 0, 2, () => most(t.drops.alive))
      t.lift()
      play(t, 2, 1)
    }
    expect(mostLow).toBeLessThan(mostFull)
    expect(low.ground).toEqual(full.ground)
  })
})
