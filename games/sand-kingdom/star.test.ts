import { describe, expect, it } from 'vitest'
import { BEACHES } from './beaches'
import { encode, makeField, tower } from './field'
import type { Kingdom } from './kingdom'
import { Play } from './play'
import { type Part, starPartFor, starParts, starSkin } from './solid'
import { JOURNEY_SECONDS } from './sun'
import { BUCKET_HEIGHT, HANDLE_BOW } from './things'
import { FOLK_COME } from './timeline'

// The starfish and the bucket. A turned-out bucket standing by the tower the
// starfish lies on is a thing like any other: the starfish lies with a gap
// between two of its arms turned to the bucket and those arms parted round
// it, and no arm is in the bucket or over its handle, as it leaps onto the
// tower, lies there, feels about, and is poked into a fist.

const DT = 1 / 60
type Point = [number, number, number]

/** How wide the pail is at a height up it, and its rim. */
const pailAt = (up: number): number => 0.44 + (0.16 * up) / BUCKET_HEIGHT
const RIM = 0.645

/** Points over the bucket as it is drawn now: its wall, its rim and the bow of its handle. */
function bucketSkin(play: Play): Point[] {
  const at = play.bucketPose(), out: Point[] = []
  const place = (x: number, y: number, z: number): void => {
    const sx = x * at.wide, sy = y * at.tall, sz = z * at.wide
    out.push([at.x + sx * Math.cos(at.turn) - sy * Math.sin(at.turn), at.y + sx * Math.sin(at.turn) + sy * Math.cos(at.turn), at.z + sz])
  }
  for (let level = 0; level <= 8; level++) {
    const up = (level / 8) * BUCKET_HEIGHT, r = level === 8 ? RIM : pailAt(up)
    for (let i = 0; i < 24; i++) place(Math.cos((i / 24) * Math.PI * 2) * r, up, Math.sin((i / 24) * Math.PI * 2) * r)
  }
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI, x = Math.cos(a) * (HANDLE_BOW + 0.04), y = Math.sin(a) * (HANDLE_BOW + 0.04)
    place(x, BUCKET_HEIGHT - 0.02 + y * Math.cos(at.handle), y * Math.sin(at.handle))
  }
  return out
}

/** How deep a point is inside the pail taken as a solid, or 0 outside it. */
function inPail(play: Play, [x, y, z]: Point): number {
  const at = play.bucketPose()
  const dx = x - at.x, dy = y - at.y
  const lx = (dx * Math.cos(at.turn) + dy * Math.sin(at.turn)) / at.wide, ly = (-dx * Math.sin(at.turn) + dy * Math.cos(at.turn)) / at.tall, lz = (z - at.z) / at.wide
  if (ly <= 0 || ly >= BUCKET_HEIGHT) return 0
  return Math.max(0, Math.min((ly > BUCKET_HEIGHT - 0.06 ? RIM : pailAt(ly)) - Math.hypot(lx, lz), ly, BUCKET_HEIGHT - ly))
}

/** How far inside a lump a point is, as a share of the lump: 0 at its skin and outside it, 1 at its middle. */
function inLump(part: Part, foot: Point, [x, y, z]: Point): number {
  const m = part.m, px = x - foot[0] - part.cx, py = y - foot[1] - part.cy, pz = z - foot[2] - part.cz
  // The lump is a unit ball laid out by `m`: the point in the ball's own frame, by the inverse of `m`.
  const a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5], g = m[6], h = m[7], i = m[8]
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
  const ux = ((e * i - f * h) * px + (c * h - b * i) * py + (b * f - c * e) * pz) / det
  const uy = ((f * g - d * i) * px + (a * i - c * g) * py + (c * d - a * f) * pz) / det
  const uz = ((d * h - e * g) * px + (b * g - a * h) * py + (a * e - b * d) * pz) / det
  return Math.max(0, 1 - Math.hypot(ux, uy, uz))
}

/** The deepest the starfish is in the bucket now, or the bucket in it, and which. */
function meets(play: Play): { deep: number; what: string } {
  const star = play.folk.starfish, foot: Point = [star.x, star.y, star.z]
  let deep = 0, what = ''
  starSkin(star).forEach(([x, y, z], index) => {
    const now = inPail(play, [foot[0] + x, foot[1] + y, foot[2] + z])
    if (now > deep) {
      deep = now
      what = `lump ${Math.floor(index / 48)} of the starfish is ${now.toFixed(3)} into the pail`
    }
  })
  const parts = starParts(star)
  for (const point of bucketSkin(play)) parts.forEach((part, index) => {
    // A share of a lump a quarter across at least: 0.03 of it is under a hundredth.
    const now = inLump(part, foot, point) - 0.03
    if (now > deep) {
      deep = now
      what = `the bucket is ${now.toFixed(3)} of the way into lump ${index} of the starfish`
    }
  })
  return { deep, what }
}

const tapSun = (play: Play): void => {
  play.press({ kind: 'sun' })
  play.tap()
}
/** Plays on for `seconds`, looking at every frame; the worst of it comes back. */
function watch(play: Play, seconds: number, doing: string, worst = { deep: 0, what: '' }): { deep: number; what: string } {
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    play.step(DT)
    const now = meets(play)
    if (now.deep > worst.deep) worst = { deep: now.deep, what: `${now.what}, ${doing}, after ${play.time.toFixed(2)} s` }
  }
  return worst
}

/** A beach with one tower in the middle and the bucket standing empty `far` from it, at an angle round it. */
function towerAndBucket(sun: 'up' | 'down', turn: number, far: number): Kingdom {
  const state = BEACHES.first(7), field = makeField()
  tower(field, 0.4, 3.6, 0, 1)
  state.sand = encode(field)
  state.sun = sun
  state.finished = sun === 'down'
  state.bucket = { x: 0.4 + Math.cos(turn) * far, z: 3.6 + Math.sin(turn) * far, holds: 'nothing', shell: false, side: false }
  // The boughs and the shells out of the way of both.
  state.wood[0] = { x: -4.4, z: 1.0, turn: 0.3 }
  state.wood[1] = { x: 4.6, z: 0.8, turn: -0.4 }
  state.shells.forEach((shell, index) => Object.assign(shell, { x: -5 + index * 0.2, z: 7.3 - index * 1.4 }))
  return state
}

describe('the starfish on a tower the bucket stands by', () => {
  it('tap the full bucket, tap the sun: it leaps onto the tower and lies there with no arm in the bucket or over its handle', { timeout: 30_000 }, () => {
    for (const seed of [1, 7]) {
      const play = new Play(BEACHES.first(3), seed)
      for (let t = 0; t < 1; t += DT) play.step(DT)
      play.press({ kind: 'bucket' })
      play.tap()
      for (let t = 0; t < 1.5; t += DT) play.step(DT)
      const bucket = play.things.bucket, star = play.folk.starfish
      expect(bucket.holds).toBe('nothing')
      tapSun(play)
      let worst = watch(play, JOURNEY_SECONDS + FOLK_COME.end + 8, `seed ${seed}, the folk come`)
      // It is on the tower, the one that was turned out, and the bucket stands within reach of its arms.
      expect(star.on).toBe('tower')
      expect(star.move).toBe('perched')
      expect(Math.hypot(bucket.x - star.x, bucket.z - star.z)).toBeLessThan(2.1)
      expect(star.part).toBeGreaterThan(0.95)
      // Poked there it curls into a fist and opens out again beside the bucket; and it feels about with an arm.
      play.press({ kind: 'folk', who: 'starfish', index: 0 })
      play.tap()
      worst = watch(play, 12, `seed ${seed}, poked`, worst)
      expect(worst.deep, worst.what).toBeLessThan(0.02)
    }
  })

  for (const far of [1.45, 1.65, 1.85, 2]) it(`found there when the beach is opened, it lies turned to the bucket already, wherever round the tower the bucket stands: ${far} from it`, { timeout: 60_000 }, () => {
    // Right by the tower the two arms are parted all the way; out at the tips of its arms the gap alone is room enough.
    expect(starPartFor(1.45)).toBe(1)
    expect(starPartFor(2)).toBe(0)
    for (let i = 0; i < 12; i++) {
      const turn = (i / 12) * Math.PI * 2 + 0.1
      const play = new Play(towerAndBucket('down', turn, far), 3), star = play.folk.starfish
      expect(star.on).toBe('tower')
      const doing = `the bucket ${far} off at ${turn.toFixed(2)} round the tower`
      expect(meets(play).deep, `${doing}: ${meets(play).what}`).toBeLessThan(0.02)
      expect(star.part).toBe(starPartFor(Math.hypot(play.things.bucket.x - star.x, play.things.bucket.z - star.z)))
      expect(Math.abs(star.part - starPartFor(far))).toBeLessThan(0.1)
      expect(star.gap, doing).toBeGreaterThanOrEqual(0)
      const worst = watch(play, 5, doing)
      expect(worst.deep, worst.what).toBeLessThan(0.02)
    }
  })

  it('leaping onto the tower it comes down turned to the bucket, from whichever side the bucket stands', { timeout: 40_000 }, () => {
    for (let i = 0; i < 6; i++) {
      const turn = (i / 6) * Math.PI * 2 + 0.4
      const play = new Play(towerAndBucket('up', turn, 1.5), 5), star = play.folk.starfish
      for (let t = 0; t < 0.5; t += DT) play.step(DT)
      tapSun(play)
      const doing = `the bucket at ${turn.toFixed(2)} round the tower`
      const worst = watch(play, JOURNEY_SECONDS + FOLK_COME.end + 6, doing)
      expect(star.on, doing).toBe('tower')
      expect(worst.deep, worst.what).toBeLessThan(0.02)
    }
  })

  it('with the bucket taken away from the tower its arms come back together', () => {
    const play = new Play(towerAndBucket('down', 0.3, 1.5), 3), star = play.folk.starfish
    expect(star.part).toBeGreaterThan(0.9)
    play.press({ kind: 'bucket' })
    play.dragStart()
    for (let i = 1; i <= 60; i++) {
      play.drag(1.9 + i * 0.05, 4.0 - i * 0.03, 0)
      play.step(DT)
    }
    play.release()
    for (let t = 0; t < 2; t += DT) play.step(DT)
    expect(star.on).toBe('tower')
    expect(star.part).toBeLessThan(0.05)
  })
})
