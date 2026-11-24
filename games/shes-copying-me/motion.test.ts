import { describe, expect, it } from 'vitest'
import { ANTIC_SECONDS, NATURE, OWN, guestPose, type Pose } from './motion'
import { COATS, EFFECTS, GUESTS, outcomeOf, type Coat, type Guest } from './rules'

const track = (guest: Guest, coat: Coat, antic: Parameters<typeof guestPose>[2], from = 5): number[] => {
  const out: number[] = []
  for (let t = 0; t < ANTIC_SECONDS; t += 0.05) {
    const p = guestPose(guest, coat, antic, null, t, from + t)
    out.push(p.x / 40, p.y / 40, p.turn * 2, p.sx * 3, p.sy * 3)
  }
  return out
}
const apart = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]))

describe('how guests move', () => {
  it('ends what only one guest does where the mood ends', () => {
    for (const [key, own] of Object.entries(OWN)) for (const [name, v] of Object.entries(own!(2.29))) expect(name.startsWith('s') ? Math.abs((v as number) - 1) : Math.abs(v as number), `${key} ${name}`).toBeLessThan(name === 'x' || name === 'y' ? 4 : 0.45)
  })
  it('gives each guest its own idle life', () => {
    for (const a of GUESTS) for (const b of GUESTS) if (a < b) expect(apart(track(a, 'clean', null), track(b, 'clean', null)), `${a} ${b}`).toBeGreaterThan(0.1)
    expect(new Set(GUESTS.map((guest) => NATURE[guest].tempo)).size).toBe(4)
  })
  it('gives each of the antics its own movement', () => {
    const antics = COATS.flatMap((coat) => EFFECTS.map((effect) => outcomeOf(coat, effect).antic))
    for (const a of antics) for (const b of antics) if (a < b) expect(apart(track('pig', 'clean', a), track('pig', 'clean', b)), `${a} ${b}`).toBeGreaterThan(0.12)
  })
  it('plays the same antic differently on each body', () => {
    for (const a of GUESTS) for (const b of GUESTS) if (a < b) expect(apart(track(a, 'clean', 'wobble'), track(b, 'clean', 'wobble')), `${a} ${b}`).toBeGreaterThan(0.15)
  })
  it('ends every antic where it began, the right way up', () => {
    for (const guest of GUESTS) for (const coat of COATS) for (const effect of EFFECTS) {
      const { coat: to, antic } = outcomeOf(coat, effect)
      const end = guestPose(guest, to, antic, null, 6, 40), rest: Pose = guestPose(guest, to, null, null, 6, 40)
      expect(end).toEqual(rest)
    }
  })
})
