import { describe, expect, it } from 'vitest'
import { BEHIND_PEN, Journey, PACE, Trail, type Fired } from './gait'
import { readMark, tidy } from './marks'
import { routeAlong, routeTo } from './ride'
import type { Pt } from './yard'

const line = (from: Pt, to: Pt, steps = 40): Pt[] => Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }))
const routeOf = (train: Pt, raw: Pt[]) => { const p = tidy(raw); return routeAlong(train, p, readMark(p), []) }
const start: Pt = { x: 150, y: 460 }
/** Plays until the journey rests, and gives back everything fired and the top speed. */
const play = (j: Journey, seconds = 20, each?: (j: Journey) => void) => {
  const fired: Fired[] = []
  let top = 0, t = 0
  for (; t < seconds && (j.busy || j.moving || t === 0); t += 1 / 60) {
    fired.push(...j.step(1 / 60))
    top = Math.max(top, j.pose.speed)
    each?.(j)
  }
  return { fired, top, t }
}
const loopLine = (): Pt[] => {
  const arc = Array.from({ length: 51 }, (_, i) => { const a = Math.PI / 4 - (Math.PI * 1.6 * i) / 50; return { x: 600 + Math.cos(a) * 113, y: 360 + Math.sin(a) * 113 } })
  return [...line({ x: 200, y: 480 }, { x: 680, y: 440 }, 14), ...arc, ...line({ x: 549, y: 461 }, { x: 816, y: 596 }, 12)]
}

describe('how the engine rides', () => {
  it('rides a line to its end and comes to rest there', () => {
    const j = new Journey(start, 1)
    j.add(routeOf(start, line({ x: 160, y: 460 }, { x: 900, y: 460 })))
    const { fired } = play(j)
    expect(j.busy).toBe(false)
    expect(j.pose.speed).toBe(0)
    expect(Math.abs(j.pose.x - 900)).toBeLessThan(6)
    expect(fired[0].what).toBe('set-off')
    expect(fired[fired.length - 1].what).toBe('arrived')
    expect(fired.filter((f) => f.what === 'arrived').length).toBe(1)
  })

  it('is fast on chalk and slow on bare tar', () => {
    const chalk = new Journey(start, 1)
    chalk.add(routeOf(start, line({ x: 160, y: 460 }, { x: 1000, y: 460 })))
    const tar = new Journey(start, 1)
    tar.add(routeTo(start, { x: 1000, y: 460 }))
    expect(play(chalk).top).toBeGreaterThan(PACE.chalk)
    expect(play(tar).top).toBeLessThanOrEqual(PACE.tar + 1)
    expect(play(new Journey(start, 1)).top).toBe(0)
  })

  it('slows on a climb and runs away on a fall', () => {
    const up = new Journey({ x: 300, y: 700 }, 1), down = new Journey({ x: 300, y: 100 }, 1)
    up.add(routeOf({ x: 300, y: 700 }, line({ x: 310, y: 700 }, { x: 800, y: 150 })))
    down.add(routeOf({ x: 300, y: 100 }, line({ x: 310, y: 100 }, { x: 800, y: 650 })))
    expect(play(down).top).toBeGreaterThan(play(up).top * 1.5)
  })

  it('fires each happening once, in order, and loses pace at a corner', () => {
    const zz: Pt[] = []
    for (let i = 0; i < 5; i++) zz.push(...line({ x: 200 + i * 60, y: i % 2 ? 350 : 460 }, { x: 260 + i * 60, y: i % 2 ? 460 : 350 }, 8))
    const route = routeOf(start, zz)
    const j = new Journey(start, 1)
    j.add(route)
    const speeds: number[] = []
    const fired: Fired[] = []
    for (let t = 0; t < 20 && j.busy; t += 1 / 60) {
      const before = j.pose.speed
      const now = j.step(1 / 60)
      if (now.some((f) => f.what === 'corner')) speeds.push(j.pose.speed / Math.max(1, before))
      fired.push(...now)
    }
    expect(fired.filter((f) => f.what === 'corner').length).toBe(route.happenings.filter((h) => h.what === 'corner').length)
    expect(fired.filter((f) => f.what === 'corner').length).toBe(4)
    for (const ratio of speeds) expect(ratio).toBeLessThan(0.6)
  })

  it('goes upside down only on a stretch that goes all the way round, and comes out the right way up', () => {
    const j = new Journey({ x: 190, y: 480 }, 1)
    j.add(routeOf({ x: 190, y: 480 }, loopLine()))
    let upsideInRound = false, upsideOutside = false
    play(j, 20, (x) => {
      const upside = Math.cos(x.pose.angle) < -0.3
      if (upside && x.pose.round) upsideInRound = true
      if (upside && !x.pose.round) upsideOutside = true
    })
    expect(upsideInRound).toBe(true)
    expect(upsideOutside).toBe(false)
    expect(Math.cos(j.pose.angle)).toBeGreaterThan(0.5)
    expect(j.pose.facing).toBe(1)
  })

  it('turns to face the way it goes on a line drawn leftwards, and stays the right way up', () => {
    const from = { x: 900, y: 460 }
    const j = new Journey(from, 1)
    j.add(routeOf(from, line({ x: 890, y: 460 }, { x: 200, y: 430 })))
    play(j, 20, (x) => expect(Math.cos(x.pose.angle)).toBeGreaterThan(0.5))
    expect(j.pose.facing).toBe(-1)
  })

  it('follows a line still being drawn without ever passing the chalk, and carries on when it is finished', () => {
    const j = new Journey(start, 1)
    for (let reach = 200; reach <= 800; reach += 20) {
      j.setLive(routeOf(start, line({ x: 160, y: 460 }, { x: reach, y: 460 })))
      for (let i = 0; i < 6; i++) j.step(1 / 60)
      expect(j.pose.x).toBeLessThanOrEqual(reach - BEHIND_PEN + 1)
    }
    for (let i = 0; i < 120; i++) j.step(1 / 60)
    expect(j.busy).toBe(true)
    expect(Math.abs(j.pose.x - (800 - BEHIND_PEN))).toBeLessThan(3)
    expect(j.intoLive).toBeGreaterThan(500)
    j.add(routeOf(start, line({ x: 160, y: 460 }, { x: 800, y: 460 })))
    const { fired } = play(j)
    expect(Math.abs(j.pose.x - 800)).toBeLessThan(6)
    expect(fired.filter((f) => f.what === 'arrived').length).toBe(1)
  })

  it('holds back from a line being drawn while it may not enter it, and drops it when it is taken away', () => {
    const j = new Journey(start, 1)
    j.setLive(routeOf(start, line({ x: 160, y: 460 }, { x: 600, y: 460 })))
    for (let i = 0; i < 60; i++) j.step(1 / 60, false)
    expect(j.pose.x).toBe(150)
    j.setLive(null)
    expect(j.busy).toBe(false)
  })

  it('rides one finished line after another, and hurries while more is waiting', () => {
    const j = new Journey(start, 1)
    j.add(routeTo(start, { x: 500, y: 460 }))
    j.add(routeTo({ x: 500, y: 460 }, { x: 500, y: 200 }))
    let top = 0
    const { fired } = play(j, 30, (x) => { top = Math.max(top, x.pose.speed) })
    expect(top).toBeGreaterThan(PACE.tar * 1.2)
    expect(j.pose.x).toBeCloseTo(500, 0)
    expect(Math.abs(j.pose.y - 200)).toBeLessThan(4)
    expect(fired.filter((f) => f.what === 'arrived').length).toBe(1)
  })
})

describe('the wagons follow in the engine tracks', () => {
  it('stands each wagon where the engine stood, its gap behind', () => {
    const j = new Journey(start, 1)
    const trail = new Trail(j.pose)
    expect(trail.behind(150).x).toBeCloseTo(0, 0)
    j.add(routeOf(start, line({ x: 160, y: 460 }, { x: 600, y: 460 })))
    j.add(routeTo({ x: 600, y: 460 }, { x: 600, y: 200 }))
    play(j, 30, (x) => trail.note(x.pose, x.travelled))
    const wagon = trail.behind(150)
    // The engine went along and then up; the wagon is on the upward stretch, 150 below it.
    expect(wagon.x).toBeCloseTo(600, -1)
    expect(Math.abs(wagon.y - (j.pose.y + 150))).toBeLessThan(12)
    const far = trail.behind(400)
    expect(Math.abs(far.y - 460)).toBeLessThan(8)
    expect(far.x).toBeLessThan(600)
  })
})
