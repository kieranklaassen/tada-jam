import { describe, expect, it } from 'vitest'
import { chooseHint, DEMO_SECONDS, handPose, HintScheduler, IDLE_BEFORE_GLOW, IDLE_BEFORE_HINT, MAX_DEMOS_PER_IDLE, MAX_PEEKS, type GardenSummary, type GuidanceTiming } from './guidance'
import { BLUE, GREEN, RED, WHITE } from './optics'

const base: GardenSummary = {
  sleepers: [
    { index: 0, x: 2, y: 21, wants: WHITE },
    { index: 1, x: 40, y: -18, wants: RED },
    { index: 2, x: -16, y: -22, wants: RED | GREEN },
    { index: 3, x: 36, y: 16, wants: GREEN | BLUE },
  ],
  lamps: [{ id: 'lampA', x: -46, y: 2 }],
  tray: [
    { id: 'lampB', x: -37.5, y: 50 },
    { id: 'prism', x: -22.5, y: 50 },
    { id: 'mirror1', x: -7.5, y: 50 },
    { id: 'mirror2', x: 7.5, y: 50 },
    { id: 'filterR', x: 22.5, y: 50 },
  ],
  whiteBeam: { x: 0, y: 2 },
  colourBeam: null,
  lit: [],
  open: { x: 0, y: 0 },
}

const timing = (): GuidanceTiming => ({ demo: null, glow: 0, peek: null })

describe('guidance', () => {
  it('while the moth sleeps, shows the lamp being tapped', () => {
    expect(chooseHint(base)).toMatchObject({ kind: 'tapLamp', piece: 'lampA', to: null })
  })

  it('with the moth awake, brings the prism into the white beam', () => {
    const summary = { ...base, sleepers: base.sleepers.slice(1) }
    expect(chooseHint(summary)).toMatchObject({ kind: 'bringPiece', piece: 'prism', from: { x: -22.5, y: 50 }, to: { x: 0, y: 2 } })
  })

  it('then a red filter for a sleeping fish, then a mirror into coloured light', () => {
    const noPrism = { ...base, sleepers: base.sleepers.slice(1), tray: base.tray.filter((p) => p.id !== 'prism') }
    expect(chooseHint(noPrism)).toMatchObject({ kind: 'bringPiece', piece: 'filterR' })
    const noFilter = { ...noPrism, tray: noPrism.tray.filter((p) => p.id !== 'filterR'), colourBeam: { x: 10, y: 10 } }
    expect(chooseHint(noFilter)).toMatchObject({ kind: 'bringPiece', piece: 'mirror1', to: { x: 10, y: 10 } })
  })

  it('with the tray empty, turns a piece the light is touching', () => {
    const summary = { ...base, sleepers: base.sleepers.slice(2), tray: [], lit: [{ id: 'mirror1' as const, x: 5, y: 5 }] }
    expect(chooseHint(summary)).toMatchObject({ kind: 'tapPiece', piece: 'mirror1' })
  })

  it('with no lamp on the panel, brings one out', () => {
    const summary = { ...base, lamps: [], tray: [...base.tray, { id: 'lampA' as const, x: -52.5, y: 50 }] }
    expect(chooseHint(summary)).toMatchObject({ kind: 'bringPiece', piece: 'lampA', to: base.open })
  })

  it('shows nothing once everyone is awake', () => {
    expect(chooseHint({ ...base, sleepers: [] })).toBeNull()
  })

  it('glows after a few idle seconds, demonstrates after a few more, backs off, and stops', () => {
    const scheduler = new HintScheduler(0)
    scheduler.touch(0)
    expect(scheduler.state(IDLE_BEFORE_GLOW - 0.1, timing()).glow).toBe(0)
    expect(scheduler.state(IDLE_BEFORE_HINT - 0.1, timing()).demo).toBeNull()
    expect(scheduler.state(IDLE_BEFORE_HINT + 0.5, timing()).glow).toBeGreaterThan(0)
    expect(scheduler.state(IDLE_BEFORE_HINT + DEMO_SECONDS / 2, timing()).demo).toBeCloseTo(0.5)
    let demos = 0
    let inDemo = false
    for (let t = 0; t < 400; t += 0.1) {
      const now = scheduler.state(t, timing()).demo !== null
      if (now && !inDemo) demos++
      inDemo = now
    }
    expect(demos).toBe(MAX_DEMOS_PER_IDLE)
    const secondStart = IDLE_BEFORE_HINT + DEMO_SECONDS + IDLE_BEFORE_HINT * 2
    expect(scheduler.state(secondStart - 0.2, timing()).demo).toBeNull()
    expect(scheduler.state(secondStart + 0.2, timing()).demo).not.toBeNull()
  })

  it('any touch clears the glow and the demonstration at once', () => {
    const scheduler = new HintScheduler(0)
    const during = IDLE_BEFORE_HINT + 1
    expect(scheduler.state(during, timing()).demo).not.toBeNull()
    scheduler.touch(during)
    const after = scheduler.state(during, timing())
    expect(after.demo).toBeNull()
    expect(after.glow).toBe(0)
  })

  it('peeks on first open a few times, never after a touch', () => {
    const scheduler = new HintScheduler(0)
    let peeks = 0
    let inPeek = false
    for (let t = 0; t < 60; t += 0.05) {
      const now = scheduler.state(t, timing()).peek !== null
      if (now && !inPeek) peeks++
      inPeek = now
    }
    expect(peeks).toBe(MAX_PEEKS)
    const touched = new HintScheduler(0)
    touched.touch(0.5)
    for (let t = 0; t < 30; t += 0.1) expect(touched.state(t, timing()).peek).toBeNull()
  })

  it('the ghost hand taps twice in place, or presses, carries, and lifts', () => {
    const pose = { x: 0, y: 0, press: 0, opacity: 0 }
    const tap = { kind: 'tapLamp' as const, from: { x: 3, y: 4 }, to: null, piece: 'lampA' as const }
    expect(handPose(tap, 0.27, pose)).toMatchObject({ x: 3, y: 4 })
    expect(pose.press).toBeGreaterThan(0.9)
    expect(handPose(tap, 0.41, pose).press).toBeLessThan(0.2)
    const drag = { kind: 'bringPiece' as const, from: { x: 0, y: 50 }, to: { x: 0, y: 0 }, piece: 'prism' as const }
    expect(handPose(drag, 0.1, pose).y).toBe(50)
    expect(handPose(drag, 0.8, pose)).toMatchObject({ x: 0, y: 0 })
    expect(handPose(drag, 0.5, pose).press).toBe(1)
    expect(handPose(drag, 1, pose).opacity).toBe(0)
  })
})
