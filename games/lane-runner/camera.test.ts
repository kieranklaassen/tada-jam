import { describe, expect, it } from 'vitest'
import { CLOSED_AT, CLOSES_AT_MOST, HALF_IN_FRAME, HOLDS, lanePixels, onGlass, onTrail, project, shotFor, type Box } from './camera'
import { Game, type Sink } from './game'
import { LOADS, TAKEN_WITH, type Load } from './lapState'
import { GATE_FLOWN, GATE_HALF, SHELF_BEFORE, SHELF_HEIGHT, gateFlown, gateLift } from './props'
import type { Item } from './stage'
import { LANES, PLACES, SHELF_REACH, STEP, ZONES, laneX, offset, type Lane, type Obstacle } from './trail'
import { STAND } from './view/heights'

// Where the camera stands, held with no renderer: the clearing fills the
// frame, the trail is whole on every surface, and what stands in the fox's
// own lane is seen over the fox before the fox is at it.

const quiet: Sink = { play: () => {}, hush: () => {}, save: () => {} }
const W = 1180, H = 820

type Rect = { left: number; right: number; top: number; bottom: number }

/** Every upright plaque of a thing as a rectangle on the glass, for a fox at `foxS`. */
function rectsOf(game: Game, item: Item, foxS: number, shot = game.shot(W, H)): Rect[] {
  const out: Rect[] = []
  for (let i = item.from; i < item.to; i++) {
    const quad = game.stage.quads[i]
    if (quad.flat) continue
    const rx = (Math.abs(quad.ax) + Math.abs(quad.bx)) / 2, ry = (Math.abs(quad.ay) + Math.abs(quad.by)) / 2
    const box: Box = { minX: item.x + quad.x - rx, maxX: item.x + quad.x + rx, minY: STAND + item.y + quad.y - ry, maxY: STAND + item.y + quad.y + ry, z: -(item.key === 'fox' ? 0 : offset(foxS, item.s)) + item.z + quad.z }
    const rect = onGlass(shot, W, H, box)
    if (rect) out.push(rect)
  }
  return out
}

/** How much of what stands in the fox's lane (or, with `whole`, of all of the obstacle) shows past the fox and what it carries, 0 to 1, with the fox `before` pegs before the obstacle's near edge. */
function shows(name: Obstacle, lane: Lane, load: Load, before: number, whole = false): number {
  const at = ZONES[name].from - before
  const game = new Game(load === 'none' ? { v: 1, position: 'pond', finished: false, at, lane } : { v: 1, position: 'pond', finished: false, at, lane, load, lies: null, left: TAKEN_WITH[load] }, () => null, 1, 48, quiet)
  const items = game.stage.items
  const hides = items.filter((item) => item.key === 'fox' || item.key === `load-${load}`).flatMap((item) => rectsOf(game, item, at))
  const thing = items.find((item) => item.key === name)!
  const shot = game.shot(W, H)
  // The part of the obstacle that is in the fox's own lane, sampled bead by bead.
  let all = 0, seen = 0
  for (let i = thing.from; i < thing.to; i++) {
    const quad = game.stage.quads[i]
    if (quad.flat) continue
    const rx = (Math.abs(quad.ax) + Math.abs(quad.bx)) / 2, ry = (Math.abs(quad.ay) + Math.abs(quad.by)) / 2
    for (let x = Math.ceil(thing.x + quad.x - rx); x < thing.x + quad.x + rx; x++) {
      if (!whole && Math.abs(x + 0.5 - laneX(lane)) > 10) continue
      for (let y = 0; y < ry * 2; y++) {
        const point = project(shot, W, H, [x + 0.5, STAND + thing.y + quad.y - ry + y + 0.5, -offset(at, thing.s) + thing.z + quad.z])
        all += 1
        if (!hides.some((rect) => point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom)) seen += 1
      }
    }
  }
  return all === 0 ? 1 : seen / all
}

describe('the camera', () => {
  it('stands low at the clearing and high on the trail, and has changed over well before the first thing that stands up in a lane', () => {
    expect(onTrail(0)).toBe(0)
    expect(onTrail(offset(PLACES.shelf, PLACES.handOver))).toBe(0)
    // It is most of the way there at the stream, which lies flat, and all the way soon after it.
    expect(onTrail(ZONES.stream.from)).toBeGreaterThan(0.7)
    expect(CLOSED_AT).toBeLessThan(ZONES.stream.to + 2 * STEP)
    expect(onTrail(CLOSED_AT)).toBeCloseTo(1, 9)
    expect(onTrail(ZONES.branch.from - 6 * STEP)).toBe(1)
    expect(onTrail(offset(PLACES.shelf, ZONES.log.to))).toBe(1)
    expect(shotFor(W, H, 0, 400).eye[1]).toBeGreaterThan(shotFor(W, H, 0, 0).eye[1] + 40)
    // It follows where the fox is and never how it moves: the same place gives the same shot.
    expect(shotFor(W, H, 0, 55)).toEqual(shotFor(W, H, 0, 55))
  })

  it('puts the fox low in the frame on the trail, with more of the trail ahead of it than behind', () => {
    const fox = project(shotFor(W, H, 0, 400), W, H, [0, 14, 0])
    expect(fox.y / H).toBeGreaterThan(0.62)
    expect(fox.y / H).toBeLessThan(0.86)
    expect(fox.x).toBeCloseTo(W / 2, 3)
  })

  it('shows what stands in the fox\'s own lane over the fox, at the last step before it and at the step before that', () => {
    const upright: Obstacle[] = ['branch', 'brambles', 'goose', 'log']
    const report: string[] = []
    for (const name of upright) {
      for (const lane of LANES) {
        if (!ZONES[name].blocked[lane]) continue
        // With empty hands, most of it shows at one step and nearly all of it at two.
        const one = shows(name, lane, 'none', STEP), two = shows(name, lane, 'none', 2 * STEP)
        report.push(`${name} lane ${lane}: ${one.toFixed(2)} at one step, ${two.toFixed(2)} at two`)
        expect(one, `${name} lane ${lane} at one step`).toBeGreaterThan(0.6)
        expect(two, `${name} lane ${lane} at two steps`).toBeGreaterThan(0.95)
        // A load over its head hides more of the fox's own lane, since what is ahead is drawn above the fox. At
        // the last step a third of it or more still shows past the tallest load, and at two steps nearly all of it.
        for (const load of LOADS) {
          const last = shows(name, lane, load, STEP), before = shows(name, lane, load, 2 * STEP)
          report.push(`${name} lane ${lane} with ${load}: ${last.toFixed(2)} at one step`)
          expect(last, `${name} lane ${lane} with ${load} at one step`).toBeGreaterThan(0.3)
          expect(before, `${name} lane ${lane} with ${load} at two steps`).toBeGreaterThan(0.95)
        }
      }
    }
    expect(report.length).toBeGreaterThan(20)
  })

  it('has the three lanes and the verge in frame at the fox on every surface, upright ones too, with the same picture', () => {
    for (const [width, height] of [[1180, 820], [1024, 768], [820, 1180], [768, 1024], [390, 844], [1366, 1024], [2048, 1536]] as const) {
      for (const along of [0, 400]) {
        const shot = shotFor(width, height, 0, along)
        for (const side of [-1, 1]) {
          const edge = project(shot, width, height, [side * HALF_IN_FRAME, 0, 0])
          expect(edge.x, `${width}x${height}`).toBeGreaterThanOrEqual(-1)
          expect(edge.x, `${width}x${height}`).toBeLessThanOrEqual(width + 1)
        }
        expect(lanePixels(width, height, along), `${width}x${height}`).toBeGreaterThan(width / 12)
        // The eye stands in the same place whatever the surface: only how wide it opens changes.
        expect(shot.eye).toEqual(shotFor(1180, 820, 0, along).eye)
        expect(shot.target).toEqual(shotFor(1180, 820, 0, along).target)
      }
    }
  })

  it('flies the gate out of the frame when the fox is three steps out, and passes under it: the gate is never in front of the lens', () => {
    // Run out with the finger down all the way, and stopped at every few pegs for as long as the gate takes: the
    // camera stands where the fox is, the gate flies by the clock, and the two never meet.
    for (const stops of [1e9, 61, 70, 80, 90, 100, 110, 120]) {
      const game = new Game(null, () => null, 1, 48, quiet)
      game.press(600, 640, W, H, 0)
      let flown = 0, clock = 0
      for (let frame = 0; frame < 170; frame++) {
        clock += 1 / 60
        const along = offset(PLACES.shelf, game.lap.s)
        if (along >= stops) game.lift()
        game.frame(1 / 60, clock)
        const lift = game.stage.items.find((item) => item.key === 'shelf')!.y
        const now = offset(PLACES.shelf, game.lap.s)
        const shot = game.shot(W, H)
        // Flown, all of it is higher than the camera stands.
        if (lift === GATE_FLOWN) {
          flown += 1
          expect(lift, `at ${now}`).toBeGreaterThan(shot.eye[1] + 30)
        }
        // While it is anywhere in front of the camera, no part of it that is in the frame is nearer than forty pegs.
        for (const x of [-GATE_HALF, 0, GATE_HALF]) {
          for (const y of [lift, lift + SHELF_HEIGHT, lift + SHELF_HEIGHT + 30]) {
            const point = project(shot, W, H, [x, y, SHELF_BEFORE + now])
            const inFrame = point.depth > 0 && point.x >= 0 && point.x <= W && point.y >= 0 && point.y <= H
            if (inFrame) expect(point.depth, `stopping at ${stops}, at ${now}: ${x}, ${y}`).toBeGreaterThan(40)
          }
        }
      }
      expect(flown, `stopping at ${stops}`).toBeGreaterThan(60)
    }
    // Where the fox's place puts it: down for the three steps, flown from there, and down again when the fox comes round.
    expect(gateFlown(0)).toBe(false)
    expect(gateFlown(SHELF_REACH - 0.01)).toBe(false)
    expect(gateFlown(SHELF_REACH)).toBe(true)
    expect(gateFlown(-20)).toBe(false)
    expect(gateFlown(-150)).toBe(false)
    expect(gateLift(0)).toBe(0)
    expect(gateLift(1)).toBe(GATE_FLOWN)
  })

  it('does not follow the fox for the three steps a load can be taken, and stands square at the clearing whichever lane the fox is in', () => {
    const rest = shotFor(W, H, 0, 0)
    for (let along = 0; along <= HOLDS; along += 5) {
      for (const x of LANES.map(laneX)) {
        const shot = shotFor(W, H, x, along)
        // In the fox's own world the camera falls behind by exactly as far as the fox has run: it has not moved.
        for (const [has, had] of [[shot.eye, rest.eye], [shot.target, rest.target]] as const) {
          expect(has[0]).toBeCloseTo(had[0], 9)
          expect(has[1]).toBeCloseTo(had[1], 9)
          expect(has[2]).toBeCloseTo(had[2] + along, 9)
        }
        expect(shot.fov).toBe(rest.fov)
      }
    }
    expect(HOLDS).toBe(SHELF_REACH)
  })

  it('goes after the fox when the three steps are run, at no more than twice the fox\'s own pace, and gathers that pace from standing', () => {
    // In the board's own world, which is the fox's moved on by how far it has run: how far the eye and what it
    // looks at move for each peg the fox runs.
    const paceAt = (along: number, step: number): { eye: number; target: number } => {
      const a = shotFor(W, H, 0, along - step), b = shotFor(W, H, 0, along)
      return {
        eye: Math.hypot(b.eye[1] - a.eye[1], b.eye[2] - a.eye[2] - step) / step,
        target: Math.hypot(b.target[1] - a.target[1], b.target[2] - a.target[2] - step) / step,
      }
    }
    let most = 0, before = 0
    for (let along = HOLDS + 0.25; along <= CLOSED_AT + 40; along += 0.25) {
      const pace = paceAt(along, 0.25)
      expect(pace.eye, `the eye at ${along}`).toBeLessThanOrEqual(2.01)
      expect(pace.target, `what it looks at, at ${along}`).toBeLessThanOrEqual(2.2)
      // From standing: the pace never changes by more than a tenth of the fox's from one quarter peg to the next.
      expect(Math.abs(pace.eye - before), `at ${along}`).toBeLessThan(0.1)
      before = pace.eye
      most = Math.max(most, pace.eye)
    }
    expect(most).toBeCloseTo(CLOSES_AT_MOST, 2)
    expect(CLOSES_AT_MOST).toBeGreaterThan(1.9)
    expect(CLOSES_AT_MOST).toBeLessThanOrEqual(2.01)
    // And then it runs beside the fox: one peg for each of the fox's.
    expect(paceAt(CLOSED_AT + 30, 1).eye).toBeCloseTo(1, 9)
    // On the glass that is gentler still, since the camera is further off while it closes: a bead of the board
    // at the fox's feet streams past hardly faster than it does out on the trail.
    const stream = (along: number): number => {
      const a = shotFor(W, H, 0, along - 1), b = shotFor(W, H, 0, along)
      return Math.abs(project(b, W, H, [0, 0, 1]).y - project(a, W, H, [0, 0, 0]).y)
    }
    const steady = stream(400)
    let fastest = 0
    for (let along = HOLDS + 1; along <= CLOSED_AT + 40; along += 1) fastest = Math.max(fastest, stream(along) / steady)
    expect(fastest).toBeLessThan(1.3)
    expect(fastest).toBeGreaterThan(1)
  })

  it('leans after the fox, and never as far as the fox goes', () => {
    const left = shotFor(W, H, -20, 400), right = shotFor(W, H, 20, 400)
    expect(left.eye[0]).toBeLessThan(0)
    expect(right.eye[0]).toBeGreaterThan(0)
    expect(Math.abs(right.eye[0])).toBeLessThan(20)
    expect(project(right, W, H, [20, 0, 0]).x).toBeGreaterThan(W / 2)
  })
})
