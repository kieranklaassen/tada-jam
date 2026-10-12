import { describe, expect, it } from 'vitest'
import { BLUE, COLOURS, GREEN, HOLES, MOTH_RADIUS, PEG_RADIUS, RED, WHITE, YELLOW, centreOf, holeAt, perchOf, type Colour } from './board'
import { MOTH_HOME } from './layout'
import { BUMP_TOUCHES, DROOP_SINK, MOTH_ACT_LENGTH, MOTH_TASTE, Moth, type MothAct } from './moth'
import type { Cue } from './voices'

const DT = 1 / 60

/** Plays the moth until it sits, and hands back each cue with the time and the place it was given at. */
function play(moth: Moth, most = 10): { t: number; cue: Cue; x: number; y: number; act: MothAct | null }[] {
  const heard: { t: number; cue: Cue; x: number; y: number; act: MothAct | null }[] = []
  let t = 0
  while (moth.mode !== 'sit' && t < most) {
    t += DT
    const act = moth.act
    for (const cue of moth.step(DT)) heard.push({ t, cue, x: moth.x, y: moth.y, act })
  }
  expect(moth.mode).toBe('sit')
  return heard
}

describe('the moth', () => {
  it('starts where it was left: beside its hole, or under its bulb', () => {
    expect(new Moth(30)).toMatchObject({ ...perchOf(30), perch: 30, mode: 'sit' })
    expect(new Moth(null)).toMatchObject({ ...MOTH_HOME, perch: null, mode: 'sit' })
  })

  it('flies to the new light and pats down on the frame it arrives, beside the peg and on no hole', () => {
    for (const hole of [0, 10, 38, 66, HOLES - 1]) {
      const moth = new Moth(null)
      moth.flyTo(hole, BLUE)
      expect(moth.perch).toBe(hole)
      const heard = play(moth)
      expect(heard[0].cue.name).toBe('pat')
      expect({ x: heard[0].x, y: heard[0].y }).toEqual(perchOf(hole))
      expect(heard[0].t).toBeLessThanOrEqual(1 + DT)
      for (let other = 0; other < HOLES; other++) expect(Math.hypot(moth.x - centreOf(other).x, moth.y - centreOf(other).y)).toBeGreaterThanOrEqual(PEG_RADIUS + MOTH_RADIUS)
    }
  })

  it('wobbles on the way: its line is not straight, and it never jumps', () => {
    const moth = new Moth(null)
    moth.flyTo(holeAt(1, 5), RED)
    let furthest = 0, last = { x: moth.x, y: moth.y }
    const to = perchOf(holeAt(1, 5)), dx = to.x - MOTH_HOME.x, dy = to.y - MOTH_HOME.y, far = Math.hypot(dx, dy)
    while (moth.mode === 'fly') {
      moth.step(DT)
      expect(Math.hypot(moth.x - last.x, moth.y - last.y)).toBeLessThan(40)
      last = { x: moth.x, y: moth.y }
      furthest = Math.max(furthest, Math.abs((moth.x - MOTH_HOME.x) * dy - (moth.y - MOTH_HOME.y) * dx) / far)
    }
    expect(furthest).toBeGreaterThan(8)
  })

  it('does a different thing on landing for each colour, the same thing every time', () => {
    expect(new Set(COLOURS.map((colour) => MOTH_TASTE[colour])).size).toBe(5)
    for (const colour of COLOURS) {
      for (let again = 0; again < 2; again++) {
        const moth = new Moth(null)
        moth.flyTo(40, colour)
        while (moth.mode === 'fly') moth.step(DT)
        expect(moth.act, `colour ${colour}`).toBe(MOTH_TASTE[colour])
      }
    }
    expect(new Set(Object.values(MOTH_ACT_LENGTH)).size).toBe(Object.keys(MOTH_ACT_LENGTH).length)
  })

  it('bumps a green peg twice, each bump heard on the frame it is nearest the peg', () => {
    const moth = new Moth(null)
    moth.flyTo(40, GREEN)
    const peg = centreOf(40), perch = perchOf(40)
    const rest = Math.hypot(perch.x - peg.x, perch.y - peg.y)
    const heard = play(moth).filter((h) => h.cue.name === 'mothTaste')
    expect(heard).toHaveLength(BUMP_TOUCHES.length)
    for (const bump of heard) {
      expect(bump.cue.colour).toBe(GREEN)
      expect(Math.hypot(bump.x - peg.x, bump.y - peg.y)).toBeLessThan(rest - 4)
    }
    // The second dart is the shorter one.
    expect(Math.hypot(heard[1].x - peg.x, heard[1].y - peg.y)).toBeGreaterThan(Math.hypot(heard[0].x - peg.x, heard[0].y - peg.y))
  })

  it('loops at a yellow peg and lands a second time, circles a white one twice, fans at a red one and dozes at a blue one', () => {
    const run = (colour: Colour) => {
      const moth = new Moth(null)
      moth.flyTo(40, colour)
      return { moth, names: play(moth).map((h) => h.cue.name) }
    }
    expect(run(YELLOW).names).toEqual(['pat', 'mothTaste', 'pat'])
    expect(run(WHITE).names).toEqual(['pat', 'mothTaste'])
    expect(run(RED).names).toEqual(['pat', 'mothTaste'])
    const dozer = run(BLUE).moth
    expect(dozer.dozing).toBe(true)
    expect(dozer.wingOpen).toBeLessThan(0.2)
    // It wakes when it next flies.
    dozer.flyTo(41, RED)
    expect(dozer.dozing).toBe(false)
  })

  it('can be poked while it sits, fans or dozes, and is no target in the air or in a caper', () => {
    const moth = new Moth(40)
    expect(moth.resting).toBe(true)
    moth.flyTo(41, YELLOW)
    expect(moth.resting).toBe(false)
    while (moth.mode === 'fly') moth.step(DT)
    expect(moth.act).toBe('loop')
    expect(moth.resting).toBe(false)
    play(moth)
    expect(moth.resting).toBe(true)
  })

  it('tumbles with a squeak when poked and comes back to where it sat', () => {
    const moth = new Moth(40)
    expect(moth.tumble()).toEqual([{ name: 'squeak' }])
    moth.step(0.3)
    expect(Math.hypot(moth.x - perchOf(40).x, moth.y - perchOf(40).y)).toBeGreaterThan(10)
    play(moth)
    expect({ x: moth.x, y: moth.y }).toEqual(perchOf(40))
    expect(moth.perch).toBe(40)
  })

  it('flies home with no light to sit by, and bumps its bulb with a tink', () => {
    const moth = new Moth(40)
    moth.flyTo(null, null)
    expect(moth.perch).toBeNull()
    expect(play(moth).map((h) => h.cue.name)).toEqual(['tink'])
    expect({ x: moth.x, y: moth.y }).toEqual({ x: MOTH_HOME.x, y: MOTH_HOME.y })
  })

  it('beats its wings fast in the air and breathes them slowly at rest', () => {
    const swing = (moth: Moth) => {
      let low = 1, high = 0
      for (let i = 0; i < 12; i++) { moth.wing += DT; low = Math.min(low, moth.wingOpen); high = Math.max(high, moth.wingOpen) }
      return high - low
    }
    const flying = new Moth(null)
    flying.flyTo(40, RED)
    expect(swing(flying)).toBeGreaterThan(0.8)
    expect(swing(new Moth(40))).toBeLessThan(0.2)
  })
})

describe('the moth whose light is gone', () => {
  it('droops where it sat, wings shut and head down, and only then flies home to bump its bulb', () => {
    const moth = new Moth(40)
    const open = moth.wingOpen
    moth.droopHome()
    // Its perch is its bulb from this moment, so a save taken now finds it at home.
    expect(moth.perch).toBeNull()
    expect(moth.act).toBe('droop')
    expect(moth.flying).toBe(false)
    let lowest = moth.y, shut = open, turned = 0
    for (let t = 0; t < MOTH_ACT_LENGTH.droop - DT; t += DT) {
      expect(moth.step(DT)).toEqual([])
      // It has not left: it hangs on the spot, lower and lower.
      expect(moth.x).toBe(perchOf(40).x)
      expect(moth.y).toBeGreaterThanOrEqual(lowest)
      lowest = moth.y
      shut = Math.min(shut, moth.wingOpen)
      turned = Math.max(turned, moth.heading + Math.PI / 2)
    }
    expect(lowest - perchOf(40).y).toBeCloseTo(DROOP_SINK, 1)
    expect(shut).toBeLessThan(0.05)
    expect(open).toBeGreaterThan(0.3)
    expect(turned).toBeGreaterThan(Math.PI / 2)
    expect(play(moth).map((h) => h.cue.name)).toEqual(['tink'])
    expect({ x: moth.x, y: moth.y }).toEqual({ x: MOTH_HOME.x, y: MOTH_HOME.y })
    expect(moth.droop).toBe(0)
  })

  it('in the air it has nowhere to droop: it turns for home at once', () => {
    const moth = new Moth(null)
    moth.flyTo(40, RED)
    moth.step(0.1)
    moth.droopHome()
    expect(moth.mode).toBe('fly')
    expect(moth.droop).toBe(0)
    expect(play(moth).map((h) => h.cue.name)).toEqual(['tink'])
  })
})
