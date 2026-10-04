import { describe, expect, it } from 'vitest'
import { BEHIND_PEN, Journey, PACE, PLAN_MOST, Wagons, type Fired } from './gait'
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
    expect(fired[fired.length - 2].what).toBe('done')
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
    // Each route says when it is done; only the last is an arrival.
    expect(fired.filter((f) => f.what === 'done').length).toBe(2)
  })
})

describe('what the engine is told on the way', () => {
  const to = (x: number) => routeTo(start, { x, y: 460 })

  it('is told each thing as it reaches it, once, and whatever is left when the route is done', () => {
    const j = new Journey(start, 1)
    j.add(to(650), [{ at: 100 }, { at: 300 }, { at: 9999 }])
    expect(j.waiting.length).toBe(3)
    const seen: { at: number; x: number }[] = []
    play(j, 20, undefined).fired.forEach((f) => { if (f.what === 'told') seen.push({ at: f.told!.at, x: Math.round(f.pose.x) }) })
    expect(seen.map((s) => s.at)).toEqual([100, 300, 9999])
    expect(j.waiting).toEqual([])
  })

  it('counts as told what the engine is already past when a line being drawn is made again', () => {
    const j = new Journey(start, 1)
    j.setLive(to(700), [{ at: 100 }, { at: 500 }])
    const fired: Fired[] = []
    for (let i = 0; i < 90; i++) fired.push(...j.step(1 / 60))
    expect(fired.filter((f) => f.what === 'told').length).toBe(1)
    // The line grows, and the same things are said of it again: the first is not told twice.
    j.setLive(to(900), [{ at: 100 }, { at: 500 }, { at: 700 }])
    expect(j.waiting.map((t) => t.at)).toEqual([500, 700])
    j.add(to(900), [{ at: 100 }, { at: 500 }, { at: 700 }])
    const rest = play(j).fired.filter((f) => f.what === 'told').map((f) => f.told!.at)
    expect(rest).toEqual([500, 700])
  })

  it('jumps to the end of its route when a touch ends a scene, telling what was left and nothing of the way', () => {
    const j = new Journey(start, 1)
    j.add(routeOf(start, line({ x: 160, y: 460 }, { x: 900, y: 460 })), [{ at: 400 }])
    for (let i = 0; i < 10; i++) j.step(1 / 60)
    const fired = j.skip()
    expect(fired.map((f) => f.what)).toEqual(['told', 'done', 'arrived'])
    expect(Math.abs(j.pose.x - 900)).toBeLessThan(6)
    expect(j.busy).toBe(false)
    expect(j.skip()).toEqual([])
  })

  it('can be carried somewhere by a scene', () => {
    const j = new Journey(start, 1)
    j.carry({ ...j.pose, x: 300, y: 200, angle: 1 }, 50)
    expect(j.pose).toMatchObject({ x: 300, y: 200, angle: 1 })
    expect(j.travelled).toBe(50)
  })
})

describe('a plan that grows faster than the engine can ride', () => {
  it('never holds more than a few routes: the middle ones are left out and one short way across stands in their place', () => {
    const j = new Journey(start, 1)
    let at = start
    const ends: Pt[] = []
    for (let i = 0; i < 12; i++) {
      const to = { x: 200 + ((i * 337) % 800), y: 100 + ((i * 211) % 500) }
      const added = j.add(routeTo(at, to))
      expect(added.planned).toBe(true)
      expect(added.dropped).toBe(i < PLAN_MOST ? 0 : 2)
      at = to
      ends.push(to)
    }
    let jumped = 0, last = { ...j.pose }
    const { t } = play(j, 120, (x) => {
      // It never jumps: every frame it is a short step from where it was.
      if (Math.hypot(x.pose.x - last.x, x.pose.y - last.y) > 40) jumped++
      last = { ...x.pose }
    })
    expect(jumped).toBe(0)
    expect(j.busy).toBe(false)
    expect(Math.hypot(j.pose.x - at.x, j.pose.y - at.y)).toBeLessThan(4)
    // Far sooner than riding all twelve would take at a trundle.
    expect(t).toBeLessThan(40)
  })
})

describe('the wagons are pulled along behind', () => {
  const couplings = [168, 154]

  it('start in a straight line behind the engine, each its coupling from the one ahead', () => {
    const j = new Journey(start, 1)
    const wagons = new Wagons(j.pose, couplings)
    expect(wagons.poses.map((w) => w.x)).toEqual([start.x - 168, start.x - 322])
    expect(wagons.poses.every((w) => w.y === start.y && w.facing === 1)).toBe(true)
  })

  it('are never a heap: on a zigzag, a loop and a scribble each stays its coupling from the one ahead, and none jumps', () => {
    const zz: Pt[] = []
    for (let i = 0; i < 6; i++) zz.push(...line({ x: 300 + i * 50, y: i % 2 ? 300 : 460 }, { x: 350 + i * 50, y: i % 2 ? 460 : 300 }, 8))
    const tangle: Pt[] = []
    for (let i = 0; i < 10; i++) tangle.push(...line({ x: 700 + i * 8, y: i % 2 ? 235 : 165 }, { x: 708 + i * 8, y: i % 2 ? 165 : 235 }, 6))
    for (const raw of [zz, loopLine(), tangle]) {
      const j = new Journey(start, 1)
      const wagons = new Wagons(j.pose, couplings)
      j.add(routeOf(start, raw))
      let last = wagons.poses
      play(j, 40, (x) => {
        wagons.follow(x.pose, couplings)
        const chain = [x.pose, ...wagons.poses]
        for (let i = 1; i < chain.length; i++) expect(Math.hypot(chain[i].x - chain[i - 1].x, chain[i].y - chain[i - 1].y)).toBeCloseTo(couplings[i - 1], 3)
        wagons.poses.forEach((w, i) => expect(Math.hypot(w.x - last[i].x, w.y - last[i].y)).toBeLessThan(30))
        last = wagons.poses
      })
    }
  })

  it('face the way they are pulled and stay the right way up', () => {
    const from = { x: 900, y: 460 }
    const j = new Journey(from, 1)
    const wagons = new Wagons(j.pose, couplings)
    j.add(routeOf(from, line({ x: 890, y: 300 }, { x: 200, y: 300 })))
    play(j, 30, (x) => wagons.follow(x.pose, couplings))
    for (const w of wagons.poses) {
      expect(w.facing).toBe(-1)
      // A trailer comes round gradually: after a long pull it is nearly in line.
      expect(Math.cos(w.angle)).toBeGreaterThan(0.6)
      expect(w.x).toBeGreaterThan(j.pose.x)
    }
  })
})
