import { describe, expect, it } from 'vitest'
import { WALL } from './stage'
import { ROUTES, passersAt } from './street'

describe('the street behind the stall', () => {
  it('has somebody going by when the game opens, and is the same street every time', () => {
    expect(passersAt(0).length).toBeGreaterThan(0)
    expect(passersAt(12.5)).toEqual(passersAt(12.5))
  })

  it('lets each one cross from one end to the other and then leaves the street empty of it for a while', () => {
    for (const route of ROUTES) {
      const seen: number[] = []
      let away = 0
      for (let t = 0; t < 400; t += 0.25) {
        const one = passersAt(t).find((passer) => passer.kind === route.kind)
        if (one) seen.push(one.x)
        else away++
      }
      expect(seen.length, route.kind).toBeGreaterThan(40)
      expect(away, route.kind).toBeGreaterThan(40)
      // It is seen at both ends of the street, and never further off than its own length.
      expect(Math.min(...seen), route.kind).toBeLessThan(WALL.x + 60)
      expect(Math.max(...seen), route.kind).toBeGreaterThan(WALL.x + WALL.w - 60)
      for (const x of seen) {
        expect(x, route.kind).toBeGreaterThanOrEqual(WALL.x - route.span / 2 - 0.001)
        expect(x, route.kind).toBeLessThanOrEqual(WALL.x + WALL.w + route.span / 2 + 0.001)
      }
    }
  })

  it('keeps each to its own pace and its own way, and nobody walks backwards', () => {
    expect(new Set(ROUTES.map((route) => route.speed)).size).toBe(ROUTES.length)
    for (const route of ROUTES) {
      const a = passersAt(100).find((passer) => passer.kind === route.kind), b = passersAt(100.5).find((passer) => passer.kind === route.kind)
      if (a && b) expect(Math.sign(b.x - a.x), route.kind).toBe(route.dir)
    }
  })

  it('stands still when the clock does: it reads nothing but the seconds it is handed', () => {
    expect(passersAt(33)).toEqual(passersAt(33))
    expect(passersAt(-5)).toEqual(passersAt(0))
  })
})
