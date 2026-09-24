import { describe, expect, it } from 'vitest'
import {
  BALL_APART,
  BALL_SWELL,
  ballClearOfScene,
  ballReach,
  ballRest,
  basketDistanceAt,
  clearBall,
  hopPast,
  liftBall,
  outFromBasket,
  SLIDE_LIMIT,
  type BallScene,
} from './balls'
import { ScarfController, type Projector } from './controller'
import type { Point3 } from './guidance'
import type { Point } from './input'
import {
  BALL_RADIUS,
  BASKET,
  BASKET_RIM,
  BODY,
  CELL_H,
  CELL_W,
  groundY,
  LOOM_SPOT,
  LOOPS,
  NEEDLE_BAR,
  NEEDLE_ENDS,
  needlePoint,
  needlesY,
  SCARF,
  type KeepOut,
  type NeedlePose,
} from './layout'
import { initialState, WIDTH } from './state'

const COUNTS = [4, 5, 6]
const distance = (a: Point3, b: Point3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
const clearOfBasket = (p: Point3) => basketDistanceAt(p.x, p.y, p.z)

/** The camera as the view places it for a wide screen: 240 back from the loom, looking 7° down. */
const EYE = { x: 1.5, y: 30 + 240 * Math.sin((7 * Math.PI) / 180), z: 240 * Math.cos((7 * Math.PI) / 180) }
const towardEye = (p: Point3): Point3 => ({ x: (EYE.x - p.x) / (EYE.z - p.z), y: (EYE.y - p.y) / (EYE.z - p.z), z: 1 })

/** Points all along both needles and the live loops riding between them, in the bar's own frame, each with its radius. */
const NEEDLE_POINTS: { x: number; y: number; z: number; r: number }[] = [...NEEDLE_ENDS]
for (const side of [-1, 1]) {
  const tilt = side * NEEDLE_BAR.tilt
  for (let s = -NEEDLE_BAR.length / 2; s <= NEEDLE_BAR.length / 2; s += 1) {
    NEEDLE_POINTS.push({ x: s * Math.cos(tilt), y: s * Math.sin(tilt), z: side * NEEDLE_BAR.apart, r: NEEDLE_BAR.radius })
  }
}
for (let i = 0; i < WIDTH; i++) {
  const x = (i + 0.5 - WIDTH / 2) * CELL_W
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    NEEDLE_POINTS.push({ x: x + Math.cos(a) * LOOPS.radius, y: LOOPS.y + Math.sin(a) * LOOPS.radius * LOOPS.stretch, z: 0, r: LOOPS.tube })
  }
}
const at = { x: 0, y: 0, z: 0 }

/** How far a ball reaching `reach` at `p` is from the needles' yarn and wood (negative: through them). */
function fromNeedles(p: Point3, reach: number, pose: NeedlePose, swing: number): number {
  let best = Infinity
  for (const e of NEEDLE_POINTS) {
    needlePoint(pose, swing, e, at)
    best = Math.min(best, distance(p, at) - e.r - reach)
  }
  return best
}

/** How far a ball reaching `reach` at `p` is from an animal standing at (x, z): its body, head and ears as a column. */
function fromAnimal(p: Point3, reach: number, animal: keyof typeof BODY, x: number, z: number): number {
  const out = Math.hypot(p.x - x, p.z - z) - BODY[animal].reach - reach
  const over = p.y - reach - (groundY(x, z) + BODY[animal].top)
  return Math.max(out, over)
}

/** The needles' pose for a loom scarf of `rows` rows hanging still. */
function stillNeedles(rows: number): NeedlePose {
  return { pivotY: SCARF.top, pivotZ: SCARF.z, rock: 0, lean: 0, x: 0, y: -rows * CELL_H - 0.5, click: 0 }
}

describe('the yarn balls at rest', () => {
  it('sit on the heap or the rim without sinking into the basket, each leaning on something', () => {
    for (const count of COUNTS) {
      for (let i = 0; i < count; i++) {
        const rest = ballRest(i, count)
        const gap = clearOfBasket(rest)
        expect(gap).toBeGreaterThanOrEqual(BALL_RADIUS * BALL_SWELL)
        const neighbour = Math.min(...Array.from({ length: count }, (_, j) => (j === i ? Infinity : distance(rest, ballRest(j, count)))))
        expect(Math.min(gap - BALL_RADIUS * BALL_SWELL, neighbour - BALL_APART)).toBeLessThan(0.3)
        expect(outFromBasket(rest.x, rest.z)).toBeLessThan(BASKET_RIM.ring)
      }
    }
  })

  it('keep apart even while one swells as the suggested colour', () => {
    for (const count of COUNTS) {
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          expect(distance(ballRest(i, count), ballRest(j, count))).toBeGreaterThanOrEqual(BALL_RADIUS * (1 + BALL_SWELL))
        }
      }
    }
  })

  it('hop past the ball behind instead of up into it, and clear of the basket', () => {
    let wouldHaveHit = false
    for (const count of COUNTS) {
      const rests = Array.from({ length: count }, (_, i) => ballRest(i, count))
      for (let i = 0; i < count; i++) {
        for (let h = 0; h <= 8; h += 0.25) {
          const others = rests.map((r) => ({ ...r }))
          const p = { x: rests[i].x, y: rests[i].y + h, z: rests[i].z }
          for (let j = 0; j < count; j++) if (j !== i && distance(p, rests[j]) < BALL_APART - 1e-6) wouldHaveHit = true
          others[i] = p
          hopPast(p, rests[i], others, rests, i)
          for (let j = 0; j < count; j++) if (j !== i) expect(distance(p, rests[j])).toBeGreaterThanOrEqual(BALL_APART - 1e-6)
          expect(clearOfBasket(p)).toBeGreaterThanOrEqual(BALL_RADIUS * BALL_SWELL)
        }
      }
    }
    expect(wouldHaveHit).toBe(true)
  })
})

describe('a moving yarn ball', () => {
  const bunnyWaiting: KeepOut = { x: LOOM_SPOT.x, z: LOOM_SPOT.z, r: BODY.bunny.reach, top: groundY(LOOM_SPOT.x, LOOM_SPOT.z) + BODY.bunny.top }
  const away: KeepOut = { x: 0, z: 0, r: 0, top: -Infinity }

  it('rides over the basket and the balls resting in it, and in front of the loom, needles, butterfly and waiting animal', () => {
    for (const rows of [0, 3, 8, 14]) {
      const scene: BallScene = { needles: stillNeedles(rows), swing: 0, rows, butterfly: 1, animals: [bunnyWaiting, away, away, away] }
      const count = 6
      const others = Array.from({ length: count }, (_, i) => ballRest(i, count))
      const reaches = others.map(() => BALL_RADIUS * BALL_SWELL)
      const moving = 2
      const reach = ballReach(260, 0, 1, 0)
      reaches[moving] = reach
      for (let x = -60; x <= 60; x += 3) {
        for (let y = 0; y <= 70; y += 3) {
          for (const z of [SCARF.z + 6, SCARF.z + 12.4, BASKET.z]) {
            const start = { x, y, z }
            const p = { ...start }
            others[moving] = p
            clearBall(p, moving, others, reaches, towardEye(start), scene)
            for (let j = 0; j < count; j++) if (j !== moving) expect(distance(p, others[j])).toBeGreaterThanOrEqual(reach + reaches[j])
            expect(clearOfBasket(p)).toBeGreaterThanOrEqual(reach)
            expect(ballClearOfScene(p, reach, scene)).toBe(true)
            expect(fromNeedles(p, reach, scene.needles, 0)).toBeGreaterThanOrEqual(0)
            expect(fromAnimal(p, reach, 'bunny', LOOM_SPOT.x, LOOM_SPOT.z)).toBeGreaterThanOrEqual(0)
            expect(p.z - start.z).toBeLessThanOrEqual(SLIDE_LIMIT)
          }
        }
      }
    }
  })

  it('stays under the finger: it slides along its line of sight unless it has to ride up over the basket or the snow', () => {
    const scene: BallScene = { needles: stillNeedles(6), swing: 0, rows: 6, butterfly: 1, animals: [bunnyWaiting, away, away, away] }
    const reach = BALL_RADIUS
    let slid = 0
    for (let x = -50; x <= 20; x += 2) {
      for (let y = 12; y <= 64; y += 2) {
        const start = { x, y, z: SCARF.z + 12.4 }
        const lifted = { ...start }
        liftBall(lifted, reach)
        if (lifted.y !== start.y) continue
        const p = { ...start }
        clearBall(p, 0, [p], [reach], towardEye(start), scene)
        if (p.z > start.z) slid++
        // Still on the line from the eye through where it started.
        const k = (p.z - start.z) / (EYE.z - start.z)
        expect(p.x).toBeCloseTo(start.x + (EYE.x - start.x) * k, 6)
        expect(p.y).toBeCloseTo(start.y + (EYE.y - start.y) * k, 6)
      }
    }
    expect(slid).toBeGreaterThan(50)
  })
})

// The orthographic projector of the controller tests: the line of sight runs straight toward +z.
const PPU = 10
const projector: Projector = {
  toScreen(p, out) {
    out.x = (p.x + 70) * PPU
    out.y = (80 - p.y) * PPU
    return true
  },
  toPlaneZ(s, z, out) {
    out.x = s.x / PPU - 70
    out.y = 80 - s.y / PPU
    out.z = z
    return true
  },
  toPlaneY(s, y, out) {
    out.x = s.x / PPU - 70
    out.y = y
    out.z = 0
    return true
  },
  pixelsPerUnit: () => PPU,
}
const screenOf = (x: number, y: number): Point => ({ x: (x + 70) * PPU, y: (80 - y) * PPU })

describe('a ball carried by a finger', () => {
  it('never passes through the waiting animal, the needles, the basket or another ball, carried or flying', () => {
    const state = initialState()
    state.loom = [
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0],
    ]
    const game = new ScarfController(state, { save: () => {}, childAge: 5 })
    game.setProjector(projector)
    for (let i = 0; i < 8 * 60; i++) game.step(1 / 60)
    expect(game.state.atLoom).toBe('bunny')
    const bunny = game.actors.bunny
    const check = () => {
      game.balls.forEach((ball, i) => {
        if (ball.held === null && ball.returning < 0) return
        const reach = ballReach(ball.carry.x.v, ball.carry.y.v, 1, 0)
        expect(fromAnimal(ball.pos, reach, 'bunny', bunny.x, bunny.z)).toBeGreaterThan(-1e-6)
        expect(fromNeedles(ball.pos, reach, game.needlePose, game.needleSwing)).toBeGreaterThan(-1e-6)
        expect(clearOfBasket(ball.pos)).toBeGreaterThan(reach - 1e-6)
        game.balls.forEach((other, j) => {
          if (j !== i) expect(distance(ball.pos, other.pos)).toBeGreaterThan(reach + BALL_RADIUS - 1e-6)
        })
      })
    }
    const glide = (path: Point3[]) => {
      let t = 0
      game.pointerDown(1, screenOf(path[0].x, path[0].y), t)
      for (let leg = 1; leg < path.length; leg++) {
        for (let i = 1; i <= 30; i++) {
          t += 16
          const a = path[leg - 1]
          const b = path[leg]
          game.pointerMove(1, screenOf(a.x + ((b.x - a.x) * i) / 30, a.y + ((b.y - a.y) * i) / 30), t)
          game.step(1 / 60)
          check()
        }
      }
      const end = path[path.length - 1]
      game.pointerUp(1, screenOf(end.x, end.y), t + 16)
      for (let i = 0; i < 90; i++) {
        game.step(1 / 60)
        check()
      }
    }
    const ball = game.balls[3].rest
    const head = { x: bunny.x, y: groundY(bunny.x, bunny.z) + 24, z: 0 }
    const needles = { x: SCARF.x, y: needlesY(3), z: 0 }
    // Out of the back row, over the front row, across the needles, down over the bunny's head and let go: it flies into the loom, then home.
    glide([ball, { x: BASKET.x - 6, y: ball.y + 2, z: 0 }, { x: SCARF.x + 14, y: needles.y, z: 0 }, needles, { x: SCARF.x - 14, y: needles.y - 2, z: 0 }, head])
    expect(game.state.loom).toHaveLength(4)
    // Across the scarf and back down into the basket among the others.
    glide([game.balls[1].rest, { x: SCARF.x, y: SCARF.top - CELL_H, z: 0 }, needles, { x: BASKET.x + 4, y: BASKET.rimY + 2, z: 0 }])
  })
})
