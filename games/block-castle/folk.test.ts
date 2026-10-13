import { describe, expect, it } from 'vitest'
import { DRAGON_RINGS, Folk, GATE_GAPE, KING_WOBBLE, WHO, dragonHead, type FolkPose } from './folk'
import { FOLK, type Who } from './layout'
import { makeRng } from './rng'

const STEP = 1 / 120

function run(folk: Folk, seconds: number, each?: () => void): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) { folk.step(STEP); each?.() }
}

/** How one of the folk's body moved over a stretch: the numbers a watcher would see, sampled. */
function trace(folk: Folk, who: Who, seconds: number): number[][] {
  const out: number[][] = []
  let n = 0
  run(folk, seconds, () => { if (n++ % 6 === 0) { const p = folk.pose(who); out.push([p.y, p.lean, p.nod, p.squash, p.hold, p.prop, p.lid, p.brow, p.mouthOpen, p.ruffle.reduce((sum, ring) => sum + ring, 0)]) } })
  return out
}

const apart = (a: number[][], b: number[][]): number => a.reduce((sum, row, i) => sum + row.reduce((s, value, j) => s + Math.abs(value - b[i][j]), 0), 0) / a.length

const sane = (pose: FolkPose): void => {
  for (const value of [pose.y, pose.lean, pose.nod, pose.squash, pose.prop, pose.propTilt, pose.hold, pose.mouthWide, pose.mouthOpen, pose.brow, ...pose.ruffle]) expect(Number.isFinite(value)).toBe(true)
  expect(pose.lid).toBeGreaterThanOrEqual(0)
  expect(pose.lid).toBeLessThanOrEqual(1)
  expect(Math.abs(pose.gazeX)).toBeLessThanOrEqual(1)
  expect(Math.abs(pose.gazeY)).toBeLessThanOrEqual(1)
  expect(pose.squash).toBeGreaterThan(0.6)
  expect(pose.squash).toBeLessThan(1.4)
  expect(pose.y).toBeGreaterThanOrEqual(0)
}

describe('the folk at rest', () => {
  it('are alive: each one moves with nothing touched', () => {
    const folk = new Folk(makeRng(1))
    for (const who of WHO) {
      const rows = trace(new Folk(makeRng(1)), who, 8)
      const moved = rows.reduce((most, row) => Math.max(most, Math.abs(row[0] - rows[0][0]) + Math.abs(row[1] - rows[0][1]) + Math.abs(row[2] - rows[0][2]) + Math.abs(row[3] - rows[0][3]) + Math.abs(row[4] - rows[0][4])), 0)
      expect(moved, who).toBeGreaterThan(0.01)
    }
    expect(folk.pose('dragon').ruffle).toHaveLength(DRAGON_RINGS)
    expect(folk.pose('king').ruffle).toHaveLength(0)
  })

  it('blink, each at his own pace', () => {
    const folk = new Folk(makeRng(4))
    const shut: Record<Who, number> = { king: 0, cook: 0, dragon: 0 }
    const blinks: Record<Who, number> = { king: 0, cook: 0, dragon: 0 }
    const was: Record<Who, boolean> = { king: false, cook: false, dragon: false }
    run(folk, 60, () => {
      for (const who of WHO) {
        const closed = folk.pose(who).lid > 0.8
        if (closed) shut[who]++
        if (closed && !was[who]) blinks[who]++
        was[who] = closed
      }
    })
    for (const who of WHO) expect(blinks[who], who).toBeGreaterThan(3)
    expect(blinks.cook).toBeGreaterThan(blinks.king)
    expect(blinks.king).toBeGreaterThan(blinks.dragon)
  })

  it('never share a motion: no two move alike, at rest or startled', () => {
    for (const stirred of [false, true]) {
      const traces = WHO.map((who) => {
        const folk = new Folk(makeRng(9))
        if (stirred) for (const each of WHO) folk.stir(each, 'knock', 1)
        return trace(folk, who, 3)
      })
      for (let a = 0; a < WHO.length; a++) for (let b = a + 1; b < WHO.length; b++) expect(apart(traces[a], traces[b]), `${WHO[a]} and ${WHO[b]}`).toBeGreaterThan(0.02)
    }
  })

  it('stay within themselves through anything', () => {
    const folk = new Folk(makeRng(2))
    const chance = makeRng(77)
    let n = 0
    run(folk, 40, () => {
      if (n++ % 37 === 0) {
        const who = WHO[Math.floor(chance.next() * 3)]
        folk.stir(who, (['knock', 'taste', 'poke'] as const)[Math.floor(chance.next() * 3)], chance.next())
        folk.lookAt(who, chance.next() * 20 - 10, chance.next() * 6, chance.next() * 10 - 5)
      }
      for (const who of WHO) sane(folk.pose(who))
    })
  })
})

describe('what sets them off', () => {
  it.each(WHO.flatMap((who) => (['knock', 'taste', 'poke'] as const).map((what) => [who, what] as const)))('%s answers a %s', (who, what) => {
    const still = new Folk(makeRng(5)), stirred = new Folk(makeRng(5))
    run(still, 1)
    run(stirred, 1)
    stirred.stir(who, what, 1)
    expect(apart(trace(stirred, who, 1.2), trace(still, who, 1.2))).toBeGreaterThan(0.01)
  })

  it('gives each a different answer to a knock, a taste and a poke', () => {
    for (const who of WHO) {
      const traces = (['knock', 'taste', 'poke'] as const).map((what) => {
        const folk = new Folk(makeRng(6))
        run(folk, 1)
        folk.stir(who, what, 1)
        const out: number[][] = []
        let n = 0
        run(folk, 1.5, () => { if (n++ % 6 === 0) { const p = folk.pose(who); out.push([p.y, p.lean, p.nod, p.squash, p.prop, p.brow, p.mouthOpen, p.mouthWide, ...p.ruffle]) } })
        return out
      })
      expect(apart(traces[0], traces[1]), `${who}: knock and taste`).toBeGreaterThan(0.01)
      expect(apart(traces[1], traces[2]), `${who}: taste and poke`).toBeGreaterThan(0.01)
    }
  })

  it('comes to rest again: a stir is not a state', () => {
    for (const who of WHO) {
      const folk = new Folk(makeRng(8))
      folk.stir(who, 'poke')
      run(folk, 8)
      expect(folk.pose(who).mouthOpen, who).toBeLessThan(0.35)
      expect(folk.pose(who).y, who).toBeLessThan(0.08)
    }
  })
})

describe('where they look', () => {
  it('follow a thing with their eyes, the cook fastest and the dragon slowest', () => {
    /** The share of the way each one's eyes have gone, a moment after the thing they watch has moved. */
    const share = (who: Who): number => {
      const gaze = (after: number): number => {
        const folk = new Folk(makeRng(3))
        folk.lookAt(who, FOLK[who].x, FOLK[who].eyes, FOLK[who].z + 6)
        run(folk, 6)
        const before = folk.pose(who).gazeX
        folk.lookAt(who, FOLK[who].x + 8, FOLK[who].eyes, FOLK[who].z + 6)
        run(folk, after)
        return folk.pose(who).gazeX - before
      }
      return gaze(0.1) / gaze(8)
    }
    expect(share('cook')).toBeGreaterThan(share('king'))
    expect(share('king')).toBeGreaterThan(share('dragon'))
    expect(share('dragon')).toBeGreaterThan(0)
    // To one side and to the other.
    const folk = new Folk(makeRng(3))
    folk.lookAt('king', FOLK.king.x + 8, FOLK.king.eyes, FOLK.king.z + 6)
    run(folk, 6)
    const right = folk.pose('king').gazeX
    folk.lookAt('king', FOLK.king.x - 8, FOLK.king.eyes, FOLK.king.z + 6)
    run(folk, 6)
    expect(Math.abs(right)).toBeGreaterThan(0.2)
    expect(Math.sign(folk.pose('king').gazeX)).toBe(-Math.sign(right))
  })

  it('look up at a thing above them', () => {
    const folk = new Folk(makeRng(3))
    folk.lookAt('king', FOLK.king.x + 3, 6, FOLK.king.z)
    run(folk, 4)
    const up = folk.pose('king').gazeY
    folk.lookAt('king', FOLK.king.x + 3, 0, FOLK.king.z)
    run(folk, 4)
    expect(up).toBeGreaterThan(folk.pose('king').gazeY)
  })
})

describe('chance', () => {
  it('is the seed alone: the same seed plays the same folk', () => {
    const one = new Folk(makeRng(11)), two = new Folk(makeRng(11)), other = new Folk(makeRng(12))
    const a = WHO.map((who) => trace(one, who, 4)), b = WHO.map((who) => trace(two, who, 4)), c = WHO.map((who) => trace(other, who, 4))
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })
})

describe("the dragon's head", () => {
  it('keeps his jaw level and lifts his head only a little where he lies under a gate, whatever he does', () => {
    const folk = new Folk(makeRng(5))
    let widest = 0
    for (let i = 0; i < 60 * 40; i++) {
      if (i % 240 === 30) folk.stir('dragon', 'poke')
      folk.step(1 / 60)
      const pose = folk.pose('dragon')
      const out = dragonHead(pose, 0)
      expect(out.head).toBeGreaterThanOrEqual(0)
      expect(out.head).toBeLessThanOrEqual(GATE_GAPE)
      // His jaw against his lifted head never goes below level.
      expect(out.head + out.jaw).toBeGreaterThanOrEqual(-1e-9)
      const home = dragonHead(pose, 1)
      expect(home.head).toBeCloseTo(-pose.nod, 9)
      widest = Math.max(widest, out.head)
    }
    expect(widest).toBeGreaterThan(0.1)
  })
})

describe('the king on the tip of a roof or a pole', () => {
  it('wobbles there: a slow round sway of its own, three times as far as his everyday rocking, and it stops when he is off it', () => {
    const sway = (perched: boolean): { lean: number; nod: number } => {
      const folk = new Folk(makeRng(3))
      folk.perch(perched)
      run(folk, 3)
      let lean = 0, nod = 0
      run(folk, 14, () => { lean = Math.max(lean, Math.abs(folk.pose('king').lean)); nod = Math.max(nod, Math.abs(folk.pose('king').nod)) })
      return { lean, nod }
    }
    const everyday = sway(false), tipped = sway(true)
    expect(everyday.lean).toBeLessThan(0.07)
    expect(tipped.lean).toBeGreaterThan(KING_WOBBLE)
    expect(tipped.lean).toBeGreaterThan(2.5 * everyday.lean)
    // Round and round: he nods as well as leans.
    expect(tipped.nod).toBeGreaterThan(4 * everyday.nod)
    // Told he is off it, he is back to his rocking.
    const folk = new Folk(makeRng(3))
    folk.perch(true)
    run(folk, 5)
    folk.perch(false)
    run(folk, 4)
    let after = 0
    run(folk, 8, () => { after = Math.max(after, Math.abs(folk.pose('king').lean)) })
    expect(after).toBeLessThan(0.07)
    // Nobody else wobbles.
    const others = new Folk(makeRng(3))
    others.perch(true)
    let cook = 0
    run(others, 8, () => { cook = Math.max(cook, Math.abs(others.pose('cook').lean)) })
    expect(cook).toBeLessThan(0.05)
  })
})
