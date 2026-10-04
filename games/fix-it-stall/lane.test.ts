import { describe, expect, it } from 'vitest'
import { Lane, passerAt, passing, PASSERS, pigeonAt, sag, VALANCE, WASHING } from './lane'
import { OWNER, PILLAR_LEFT, STAGE, WAITING, WAITING_HEAD, WINDOW_LEFT, type Box } from './stage'

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('the washing', () => {
  it('hangs clear of where a customer stands or is touched, between the corner post and the pillar, below the awning', () => {
    for (const item of WASHING) {
      const box = { x: item.x - item.half, y: sag(item.x), w: item.half * 2, h: item.drop }
      for (const other of [OWNER, WAITING, WAITING_HEAD]) expect(overlaps(box, other), item.what).toBe(false)
      expect(box.x).toBeGreaterThan(WINDOW_LEFT + 2)
      expect(box.x + box.w).toBeLessThan(PILLAR_LEFT)
      expect(box.y + box.h).toBeLessThan(STAGE.counterTop)
      expect(box.y + box.h / 2).toBeGreaterThan(VALANCE)
    }
  })

  it('is found under a finger on each thing, and no two things share a place', () => {
    const lane = new Lane()
    WASHING.forEach((item, i) => {
      expect(lane.hit({ x: item.x, y: sag(item.x) + item.drop / 2 })).toEqual({ on: 'washing', item: i })
      for (let other = i + 1; other < WASHING.length; other++) expect(Math.abs(WASHING[other].x - item.x)).toBeGreaterThanOrEqual(WASHING[other].half + item.half)
    })
  })
})

describe('the lane under a finger', () => {
  it('holds nothing beyond the pillar, behind the awning, inside the stall or below the counter', () => {
    const lane = new Lane()
    for (let t = 0; t < 110; t += 0.5) {
      lane.seconds = t
      for (let y = 0; y < STAGE.counterTop; y += 12) {
        expect(lane.hit({ x: PILLAR_LEFT + 20, y })).toBeNull()
        expect(lane.hit({ x: WINDOW_LEFT - 20, y })).toBeNull()
      }
      for (let x = WINDOW_LEFT; x < PILLAR_LEFT; x += 30) {
        expect(lane.hit({ x, y: VALANCE - 6 })).toBeNull()
        expect(lane.hit({ x, y: STAGE.counterTop + 4 })).toBeNull()
      }
    }
  })

  it('finds each who passes where it is drawn, for as long as it is in view', () => {
    const lane = new Lane(), found = new Set<string>()
    for (let t = 0; t < 110; t += 0.1) {
      lane.seconds = t
      lane.scare = 3
      const now = passing(t)
      if (!now) continue
      const at = passerAt(now.who, now.along, t), spot = now.who === 'crates' ? { x: at.x, y: at.y - 100 } : at
      const seen = spot.x > WINDOW_LEFT + 2 && spot.x < PILLAR_LEFT - 2 && spot.y > VALANCE
      // The washing hangs in front of whoever passes: a finger there is on the washing.
      const hit = lane.hit(spot)
      if (seen && hit?.on !== 'washing') { expect(hit, `${now.who} at ${t}`).toEqual({ on: 'passer', who: now.who }); found.add(now.who) }
      if (!seen) expect(hit?.on === 'passer').toBe(false)
    }
    expect([...found].sort()).toEqual([...PASSERS].sort())
  })

  it('has the pigeon under a finger while it is on its doorstep, and not once it has gone', () => {
    const lane = new Lane()
    lane.step(2)
    const bird = pigeonAt(lane.seconds, lane.scare)
    expect(lane.hit({ x: bird.x, y: bird.y - 14 })).toEqual({ on: 'pigeon' })
    lane.touch({ on: 'pigeon' })
    lane.step(0.5)
    expect(lane.hit({ x: bird.x, y: bird.y - 14 })).toBeNull()
    lane.bang()
    expect(lane.scare).toBe(0)
  })

  it('forgets a touch on the one who passes a little over a second later, or when that one has gone by', () => {
    const lane = new Lane()
    while (!passing(lane.seconds)) lane.step(0.25)
    const who = passing(lane.seconds)!.who
    lane.touch({ on: 'passer', who })
    lane.step(0.5)
    expect(lane.poked?.who).toBe(who)
    lane.step(1)
    expect(lane.poked).toBeNull()
    lane.touch({ on: 'passer', who })
    lane.step(40)
    expect(lane.poked).toBeNull()
  })
})
