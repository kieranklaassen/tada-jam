import { describe, expect, it } from 'vitest'
import { BASKET_KEEP_OUT } from './balls'
import {
  BLANKET,
  BODY,
  CELL_H,
  FELT,
  LOOM,
  LOOM_SPOT,
  LOOPS,
  MAX_SWING,
  maxDrop,
  NEEDLE_BAR,
  NEEDLE_ENDS,
  needlePoint,
  needlesClear,
  NEEDLES_FLOOR,
  SCARF,
  swingRoom,
  type KeepOut,
  type NeedlePose,
} from './layout'
import { ANIMALS, MAX_ROWS, offerRowsForAge } from './state'

// The loom's parts as the view builds them (world units, in the loom's own
// frame: the scarf hangs from the loom, so its rock moves both alike).
type P = { x: number; y: number; z: number }
const POST_HEIGHT = LOOM.rodY + 1.5
const FELT_WIDTH = LOOM.postX * 2 - 3.2

function segment(p: P, a: P, b: P): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const abz = b.z - a.z
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / (abx * abx + aby * aby + abz * abz)))
  return Math.hypot(p.x - a.x - abx * t, p.y - a.y - aby * t, p.z - a.z - abz * t)
}

/** Distance from p to the surface of the nearest loom part (negative inside), and which part. */
function loomDistance(p: P): { d: number; part: string } {
  let best = { d: Infinity, part: '' }
  const take = (d: number, part: string) => {
    if (d < best.d) best = { d, part }
  }
  for (const side of [-1, 1]) {
    const x = LOOM.x + side * LOOM.postX
    const y = Math.max(0, Math.min(POST_HEIGHT, p.y))
    const r = LOOM.postBottom + (LOOM.postTop - LOOM.postBottom) * (y / POST_HEIGHT)
    take(Math.hypot(p.x - x, p.z - LOOM.z, p.y - y) - (p.y === y ? r : 0), 'post')
    take(Math.hypot(p.x - x, p.y - (POST_HEIGHT + 2.1), p.z - LOOM.z) - 2.7, 'knob')
    take(Math.hypot(Math.hypot(p.x - x, p.z - LOOM.z) - 1.9, p.y - (POST_HEIGHT + 0.1)) - 0.7, 'knob ring')
    const footZ = LOOM.z + LOOM.foot.z
    take(segment(p, { x, y: LOOM.foot.y, z: footZ - LOOM.foot.length / 2 }, { x, y: LOOM.foot.y, z: footZ + LOOM.foot.length / 2 }) - LOOM.foot.radius, 'foot')
    const loopX = LOOM.x + side * (FELT_WIDTH / 2 - FELT.loopInset)
    take(Math.hypot(Math.hypot(p.y - LOOM.rodY, p.z - SCARF.z) - FELT.loop, p.x - loopX) - FELT.loopTube, 'felt loop')
  }
  const rodHalf = LOOM.postX + 2.5
  take(segment(p, { x: LOOM.x - rodHalf, y: LOOM.rodY, z: SCARF.z }, { x: LOOM.x + rodHalf, y: LOOM.rodY, z: SCARF.z }) - LOOM.rod, 'rod')
  take(segment(p, { x: LOOM.x - LOOM.postX, y: 3.6, z: LOOM.z - 0.4 }, { x: LOOM.x + LOOM.postX, y: 3.6, z: LOOM.z - 0.4 }) - 1.1, 'bottom bar')
  take(p.y - BLANKET.lift, 'blanket')
  return best
}

/** Points all along both needles (their shafts, beads and points) in the bar's own frame, each with its radius. */
const BAR: { x: number; y: number; z: number; r: number }[] = [...NEEDLE_ENDS]
for (const side of [-1, 1]) {
  const tilt = side * NEEDLE_BAR.tilt
  for (let s = -NEEDLE_BAR.length / 2; s <= NEEDLE_BAR.length / 2; s += 1) {
    BAR.push({ x: s * Math.cos(tilt), y: s * Math.sin(tilt), z: side * NEEDLE_BAR.apart, r: NEEDLE_BAR.radius })
  }
}

/** The needles' pose for a loom scarf of `rows` rows, as the view places them. */
function pose(rows: number, o: { lift?: number; pullY?: number; needlePull?: number; slide?: number; click?: number; shown?: number } = {}): NeedlePose {
  const lift = o.lift ?? 0
  const shown = o.shown ?? rows
  const pivotY = SCARF.top + lift * 1.4 + (o.pullY ?? 0)
  const castOn = Math.max(0, 1 - shown) * NEEDLE_BAR.castOnDrop
  return {
    pivotY,
    pivotZ: SCARF.z + lift * 0.8,
    rock: 0,
    lean: -lift * 0.05,
    x: o.slide ?? 0,
    y: Math.max(NEEDLES_FLOOR - pivotY, -shown * CELL_H - 0.5 - castOn + (o.needlePull ?? 0)),
    click: o.click ?? 0,
  }
}

const out = { x: 0, y: 0, z: 0 }

/** The closest any part of the needles comes to the loom (negative: through it). */
function closestToLoom(p: NeedlePose, angle: number): { d: number; part: string } {
  let best = { d: Infinity, part: '' }
  for (const e of BAR) {
    needlePoint(p, angle, e, out)
    const hit = loomDistance(out)
    if (hit.d - e.r < best.d) best = { d: hit.d - e.r, part: hit.part }
  }
  return best
}

describe('the needles', () => {
  it('let the live loops ride between the two needles without either running through their yarn', () => {
    expect(LOOPS.tube + NEEDLE_BAR.radius).toBeLessThan(NEEDLE_BAR.apart)
  })

  it('keep clear of the loom however the scarf hangs, lifts, is pulled, clicks and swings', () => {
    let worst = { d: Infinity, part: '', at: '' }
    for (const rows of [0, 1, 2, 4, 7, 8, 12, 16, 17, MAX_ROWS]) {
      // As the controller pulls: a scarf long enough to offer lifts and follows the finger far; any other only a little.
      const offerable = rows >= offerRowsForAge(5)
      const reach = offerable ? 16 : 3
      const swing = Math.min(MAX_SWING, reach / Math.max(8, rows * CELL_H * 0.8)) + 0.03
      for (const lift of offerable ? [0, 1] : [0]) {
        for (const pullY of [0, -Math.min(reach / 2, maxDrop(rows)), reach / 2]) {
          for (const needlePull of [-1.5, 0, CELL_H * 0.9]) {
            for (const slide of [-2.6, 0, 2.6, 26]) {
              for (const click of [-NEEDLE_BAR.click, NEEDLE_BAR.click]) {
                const p = pose(rows, { lift, pullY, needlePull, slide, click })
                for (const want of [-swing, -swing / 2, 0, swing / 2, swing]) {
                  const side = want < 0 ? -1 : 1
                  const angle = side * swingRoom(side, Math.abs(want), p, [])
                  const hit = closestToLoom(p, angle)
                  if (hit.d < worst.d) worst = { ...hit, at: JSON.stringify({ rows, lift, pullY, needlePull, slide, click, angle }) }
                }
              }
            }
          }
        }
      }
    }
    expect(worst.d, `${worst.part} at ${worst.at}`).toBeGreaterThan(0.1)
  })

  it('stop a long scarf being pulled down into the loom feet', () => {
    for (let rows = 0; rows <= MAX_ROWS; rows++) {
      for (const needlePull of [-1.5, 0]) {
        const p = pose(rows, { pullY: -Math.min(8, maxDrop(rows)), needlePull, click: NEEDLE_BAR.click })
        expect(needlesClear(p, 0, []), `rows ${rows}`).toBe(true)
      }
    }
  })

  it('stop the offered scarf swinging before its needles poke the waiting animal or the basket', () => {
    for (const animal of ANIMALS) {
      const waiting: KeepOut = { x: LOOM_SPOT.x, z: LOOM_SPOT.z, r: BODY[animal].reach, top: BODY[animal].top }
      const keepOuts = [BASKET_KEEP_OUT, waiting]
      for (const rows of [8, 10, 12, 16]) {
        for (const pullY of [-Math.min(8, maxDrop(rows)), 0, 8]) {
          const p = pose(rows, { lift: 1, pullY })
          for (const side of [-1, 1] as const) {
            const room = swingRoom(side, MAX_SWING, p, keepOuts)
            for (let a = 0; a <= room; a += 0.01) expect(needlesClear(p, side * a, keepOuts), `${animal} ${rows} rows at ${side * a}`).toBe(true)
          }
        }
      }
    }
  })

  it('would have poked the waiting penguin at the old full swing', () => {
    const penguin: KeepOut = { x: LOOM_SPOT.x, z: LOOM_SPOT.z, r: BODY.penguin.reach, top: BODY.penguin.top }
    const p = pose(12, { lift: 1 })
    expect(needlesClear(p, -MAX_SWING, [penguin])).toBe(false)
    expect(swingRoom(-1, MAX_SWING, p, [penguin])).toBeLessThan(MAX_SWING)
    expect(swingRoom(-1, MAX_SWING, p, [penguin])).toBeGreaterThan(0.05)
  })
})
