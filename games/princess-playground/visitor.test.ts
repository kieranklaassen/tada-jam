import { describe, expect, it } from 'vitest'
import { HIDES, MAT_REACH, PEEK_SECONDS, SNAIL, Snail } from './visitor'
import { TRAY } from './world'

const play = (snail: Snail, seconds: number, each?: (snail: Snail) => void) => {
  for (let t = 0; t < seconds; t += 1 / 60) {
    snail.step(1 / 60)
    each?.(snail)
  }
}

describe('the snail behind the tray', () => {
  it('lives on the boards behind the tray and its mat, outside the tray altogether', () => {
    expect(SNAIL.z + SNAIL.shell).toBeLessThan(-TRAY.halfDepth - TRAY.rimThick - MAT_REACH)
    const snail = new Snail(1)
    play(snail, 600, (s) => {
      expect(s.pose.z).toBe(SNAIL.z)
      expect(s.pose.x).toBeGreaterThanOrEqual(-SNAIL.reach - 0.05)
    })
  })

  it('keeps to the left part of the boards whatever the seed: it never creeps into the middle, where the shell that holds the game lays its home control over the top edge', () => {
    for (const seed of [1, 2, 3, 7, 12345]) {
      const snail = new Snail(seed)
      expect(snail.pose.x).toBeLessThanOrEqual(-SNAIL.near)
      play(snail, 600, (s) => expect(s.pose.x).toBeLessThanOrEqual(-SNAIL.near + 0.05))
    }
  })

  it('creeps slowly, stretching and gathering, and turns round at the end of its line', () => {
    const snail = new Snail(1)
    const from = snail.pose.x
    play(snail, 10)
    const crept = Math.abs(snail.pose.x - from)
    expect(crept).toBeGreaterThan(0.3)
    expect(crept).toBeLessThan(1.5)
    const headings = new Set<number>()
    let leftmost = Infinity, rightmost = -Infinity
    play(snail, 400, (s) => {
      headings.add(Math.round(Math.cos(s.pose.heading)))
      leftmost = Math.min(leftmost, s.pose.x)
      rightmost = Math.max(rightmost, s.pose.x)
    })
    // It has faced both ways, and been to both ends of its line.
    expect(headings.has(1) && headings.has(-1)).toBe(true)
    expect(rightmost - leftmost).toBeGreaterThan((SNAIL.reach - SNAIL.near) * 0.95)
  })

  it('touched, it pulls into its shell at once, its shell rocks, and it looks out again one eye at a time and creeps on', () => {
    const snail = new Snail(1)
    play(snail, 1)
    expect(snail.tucked).toBe(false)
    expect(snail.pose.out).toBe(1)
    snail.poke()
    expect(snail.tucked).toBe(true)
    let rocked = 0
    play(snail, 0.3, (s) => { rocked = Math.max(rocked, Math.abs(s.pose.rock)) })
    expect(snail.pose.out).toBeLessThan(0.05)
    expect(snail.pose.first).toBeLessThan(0.05)
    expect(rocked).toBeGreaterThan(0.1)
    // It stays where it is while it is in.
    const at = snail.pose.x
    play(snail, HIDES.touched - 0.3 + 0.45)
    expect(snail.pose.x).toBe(at)
    // One eye is out and the other is not yet.
    expect(snail.pose.first).toBeGreaterThan(0.6)
    expect(snail.pose.second).toBeLessThan(0.1)
    play(snail, PEEK_SECONDS)
    expect(snail.tucked).toBe(false)
    expect(snail.pose.out).toBe(1)
    expect(snail.pose.second).toBe(1)
    play(snail, 6)
    expect(snail.pose.x).not.toBe(at)
  })

  it('touched again while it is in, it stays in that much longer', () => {
    const snail = new Snail(2)
    snail.poke()
    play(snail, HIDES.touched - 0.2)
    snail.poke()
    play(snail, HIDES.touched - 0.2)
    expect(snail.pose.out).toBeLessThan(0.05)
  })

  it('a hard knock in the tray sends it in for a moment; a soft one only makes its eyes flinch and look', () => {
    const hard = new Snail(1)
    play(hard, 1)
    hard.startle(0.9)
    expect(hard.tucked).toBe(true)
    play(hard, HIDES.startled + PEEK_SECONDS + 0.1)
    expect(hard.tucked).toBe(false)
    const soft = new Snail(1)
    play(soft, 1)
    soft.startle(0.3)
    expect(soft.tucked).toBe(false)
    play(soft, 0.2)
    expect(soft.pose.first).toBeLessThan(0.7)
    expect(soft.pose.look).toBeGreaterThan(0.3)
    play(soft, 3)
    expect(soft.pose.first).toBeGreaterThan(0.95)
    expect(soft.pose.look).toBeLessThan(0.05)
  })

  it('is the same snail for the same seed, and stops when the game does: it moves only when it is stepped', () => {
    const a = new Snail(7), b = new Snail(7)
    play(a, 20)
    play(b, 20)
    expect(a.pose).toEqual(b.pose)
  })
})
