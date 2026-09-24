import Matter from 'matter-js'
import { describe, expect, it } from 'vitest'
import { SPRITE_HEIGHT, SPRITE_WIDTH, SPRITE_X, SPRITE_Y } from './buildings'
import { CELL, FLOOR, Game, PLATFORM_WIDTH, SHAPES, cellsFor, seededRandom, type Piece, type Shape } from './model'
import { Neighbourhood, PROP_OUTLINES, SETTLED_FADE, type PropKind, type StreetProp } from './neighbourhood'
import { Renderer } from './renderer'

// Each building's sprite is painted over its matter-js body, so two bodies crossing is two
// buildings crossing on screen. These scenarios play the real game at 60 fps with seeded
// input, wired to the street as the component wires it, and measure every pair of colliders
// and every thrown prop against the slab exactly as the renderer paints it.

const FPS = 60, FRAME = 1000 / FPS, HALF = PLATFORM_WIDTH / 2, SLAB = 38
/** Deepest two bodies may cross for an instant: a landing or a topple before the solver parts them. */
const IMPACT_DEPTH = 3
/** A pair deeper than this must be apart again within `CLEAR_TIME` ms. */
const REST_DEPTH = 1
const CLEAR_TIME = 100
/** Locked foundations keep the sub-pixel resting overlap they had when they locked. */
const LOCKED_DEPTH = 0.3

type Point = { x: number; y: number }
/** A 2D context that keeps where each fill and stroke lands instead of drawing it. */
function recorder() {
  const shapes: Point[][] = [], rects: Point[][] = [], images: number[][] = [], stack: number[][] = []
  let m = [1, 0, 0, 1, 0, 0], path: Point[] = []
  const at = (x: number, y: number) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] })
  const apply = (a: number, b: number, c: number, d: number, e: number, f: number) => {
    m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]]
  }
  const box = (x: number, y: number, rx: number, ry: number) => path.push(at(x - rx, y - ry), at(x + rx, y - ry), at(x + rx, y + ry), at(x - rx, y + ry))
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
    save() { stack.push(m) }, restore() { m = stack.pop()! },
    translate(x: number, y: number) { apply(1, 0, 0, 1, x, y) },
    scale(x: number, y: number) { apply(x, 0, 0, y, 0, 0) },
    rotate(angle: number) { const c = Math.cos(angle), s = Math.sin(angle); apply(c, s, -s, c, 0, 0) },
    fillRect(x: number, y: number, w: number, h: number) { const r = [at(x, y), at(x + w, y), at(x + w, y + h), at(x, y + h)]; rects.push(r); shapes.push(r) },
    beginPath() { path = [] }, closePath() {}, clip() {}, setLineDash() {},
    moveTo(x: number, y: number) { path.push(at(x, y)) }, lineTo(x: number, y: number) { path.push(at(x, y)) },
    rect(x: number, y: number, w: number, h: number) { box(x + w / 2, y + h / 2, w / 2, h / 2) },
    arc(x: number, y: number, r: number) { box(x, y, r, r) },
    ellipse(x: number, y: number, rx: number, ry: number) { box(x, y, rx, ry) },
    fill() { shapes.push(path) }, stroke() { shapes.push(path) },
    drawImage(_image: unknown, x: number, y: number, w: number, h: number) { images.push([x, y, w, h]) },
  }
  return { ctx, shapes, rects, images }
}
type Painter = {
  prop(this: { ctx: unknown }, p: StreetProp, x: number, y: number, scale: number): void
  island(this: { ctx: unknown }, x: number, y: number, width: number, scale: number): void
  drawBuilding(this: { ctx: unknown; sprites: Map<Shape, unknown> }, shape: Shape, x: number, y: number): void
}
const painter = Renderer.prototype as unknown as Painter
/** Where the renderer paints a prop, in world units. */
function paint(p: StreetProp) {
  const { ctx, shapes } = recorder()
  painter.prop.call({ ctx }, p, p.x, p.y, 1)
  return shapes.flat()
}
/** How far any painted point sits inside the slab. */
function slabDepth(points: Point[]) {
  let deepest = 0
  for (const { x, y } of points) deepest = Math.max(deepest, Math.min(y - FLOOR, FLOOR + SLAB - y, HALF - Math.abs(x)))
  return deepest
}

const parts = (body: Matter.Body) => body.parts.length > 1 ? body.parts.slice(1) : [body]
/** The deepest any part of one body crosses any part of the other (SAT). */
function depth(a: Matter.Body, b: Matter.Body) {
  if (!Matter.Bounds.overlaps(a.bounds, b.bounds)) return 0
  let deepest = 0
  for (const pa of parts(a)) for (const pb of parts(b)) deepest = Math.max(deepest, Matter.Collision.collides(pa, pb)?.depth ?? 0)
  return deepest
}
function worstPair(game: Game) {
  const bodies = [game.platform, ...game.pieces.map(p => p.body)]
  let worst = 0
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) worst = Math.max(worst, depth(bodies[i], bodies[j]))
  return worst
}
/** How far a building's cells, placed as the renderer places its sprite, sit from its collider. */
function footprintError(piece: Piece) {
  const { position, angle, parts } = piece.body, c = Math.cos(angle), s = Math.sin(angle)
  let error = parts.length === 5 ? 0 : Infinity
  cellsFor(piece.shape).forEach((cell, i) => {
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => ({ x: cell.x + sx * CELL / 2, y: cell.y + sy * CELL / 2 }))
    parts[i + 1]?.vertices.forEach((v, k) => {
      const x = position.x + corners[k].x * c - corners[k].y * s, y = position.y + corners[k].x * s + corners[k].y * c
      error = Math.max(error, Math.hypot(v.x - x, v.y - y))
    })
  })
  return error
}

type Scenario = { seed: number; deliveries: number; aim: (random: () => number, n: number) => number; turns?: (random: () => number) => number; scaffoldEvery?: number }
function play({ seed, deliveries, aim, turns = () => 0, scaffoldEvery = 0 }: Scenario) {
  const random = seededRandom(seed * 7919), street = new Neighbourhood(), game = new Game(seed)
  const run = { worst: 0, longestDeep: 0, locked: 0, spawnHits: 0, spawnGap: Infinity, footprint: 0, propDepth: 0, propsOnDeck: new Set<StreetProp>(), scaffolds: 0 }
  let delivered = 0
  const steer = (piece: Piece) => {
    const others = game.pieces.filter(p => p !== piece).map(p => p.body), { min, max } = piece.body.bounds
    run.spawnHits += Matter.Query.collides(piece.body, [game.platform, ...others]).length
    for (const other of others) if (other.bounds.max.x > min.x && other.bounds.min.x < max.x) run.spawnGap = Math.min(run.spawnGap, other.bounds.min.y - max.y)
    for (let i = turns(random); i > 0; i--) game.rotate()
    game.aim(aim(random, delivered)); game.drop(); delivered++
  }
  game.onEvent = event => {
    const piece = event.piece
    if (event.type === 'rotate' && piece) street.spill(piece, 3, true)
    if (event.type === 'impact' && piece) {
      street.react(piece, 1.2)
      if (Math.abs(Math.sin(piece.body.angle)) > 0.2) street.spill(piece, 2)
      if (delivered >= deliveries) game.spawnAt = Infinity
    }
    if (event.type === 'lost' && piece) street.rescue(piece)
    if (event.type === 'glue') run.scaffolds++
    if (event.type === 'spawn' && piece && delivered < deliveries) steer(piece)
  }
  steer(game.active!)
  const deepSince = new Map<string, number>()
  for (let frame = 0; frame < (deliveries * 1.3 + 6) * FPS; frame++) {
    game.advance(FRAME)
    if (scaffoldEvery && frame % scaffoldEvery === scaffoldEvery >> 1) game.glue()
    street.update(FRAME, game.pieces, PLATFORM_WIDTH)
    const bodies = [game.platform, ...game.pieces.map(p => p.body)]
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j], d = depth(a, b), key = `${a.id}:${b.id}`
      run.worst = Math.max(run.worst, d)
      if (a.isStatic && b.isStatic) run.locked = Math.max(run.locked, d)
      if (d <= REST_DEPTH) { deepSince.delete(key); continue }
      if (!deepSince.has(key)) deepSince.set(key, game.time)
      run.longestDeep = Math.max(run.longestDeep, game.time - deepSince.get(key)!)
    }
    if (frame % 30 === 0) for (const piece of game.pieces) run.footprint = Math.max(run.footprint, footprintError(piece))
    for (const p of street.props) {
      run.propDepth = Math.max(run.propDepth, slabDepth(paint(p)))
      if (p.kind !== 'resident' && p.bounces) run.propsOnDeck.add(p)
    }
  }
  return { game, run, delivered }
}

const across = (spread: number) => (random: () => number) => Math.round((random() * 2 - 1) * spread) * 16
const anyTurn = (random: () => number) => Math.floor(random() * 4)
const scenarios: Record<string, Scenario> = {
  'a busy street': { seed: 11, deliveries: 40, aim: across(9), turns: anyTurn },
  'a tall stack': { seed: 5, deliveries: 26, aim: () => 0 },
  'pieces landing on neighbours': { seed: 23, deliveries: 30, aim: (random, n) => (n % 2 ? 1 : -1) * (24 + Math.round(random() * 3) * 8), turns: anyTurn },
  'a scaffolded street': { seed: 31, deliveries: 30, aim: across(5), turns: anyTurn, scaffoldEvery: 90 },
}

describe('buildings never pass through each other or the slab', () => {
  for (const [name, scenario] of Object.entries(scenarios)) {
    it(name, () => {
      const { game, run, delivered } = play(scenario)
      expect(delivered).toBe(scenario.deliveries)
      expect(game.placed).toBeGreaterThan(5)
      if (scenario.scaffoldEvery) expect(run.scaffolds).toBeGreaterThan(3)
      expect(run.spawnHits).toBe(0)
      expect(run.spawnGap).toBeGreaterThanOrEqual(100)
      expect(run.worst).toBeLessThanOrEqual(IMPACT_DEPTH)
      expect(run.longestDeep).toBeLessThan(CLEAR_TIME)
      expect(run.locked).toBeLessThanOrEqual(LOCKED_DEPTH)
      expect(run.footprint).toBeLessThan(1e-6)
      expect(run.propDepth).toBeLessThan(1e-6)
      expect(run.propsOnDeck.size).toBeGreaterThan(10)
      // Put away and opened again, the street comes back as it was.
      const settled = worstPair(game), back = new Game(scenario.seed, () => {}, { restore: game.snapshot(), bonds: game.bondPairs() })
      expect(worstPair(back)).toBeLessThanOrEqual(settled + 0.05)
      for (let i = 0; i < 3 * FPS; i++) back.advance(FRAME)
      expect(worstPair(back)).toBeLessThanOrEqual(REST_DEPTH)
      game.dispose(); back.dispose()
    }, 60000)
  }

  it('scaffolding a stack as it settles never flings buildings through each other or the slab', () => {
    for (const seed of [100, 117, 134]) {
      const { game, run } = play({ seed, deliveries: 18, aim: () => 0, scaffoldEvery: 90 })
      expect(run.worst, `seed ${seed}`).toBeLessThanOrEqual(IMPACT_DEPTH)
      expect(run.longestDeep, `seed ${seed}`).toBeLessThan(CLEAR_TIME)
      expect(run.locked, `seed ${seed}`).toBeLessThanOrEqual(LOCKED_DEPTH)
      expect(run.scaffolds, `seed ${seed}`).toBeGreaterThan(3)
      game.dispose()
    }
  }, 60000)
})

describe('each building is drawn exactly over its collider', () => {
  it('the sprite spans its cells and sits on the body the way the collider does', () => {
    for (const shape of Object.keys(SHAPES) as Shape[]) {
      const { ctx, images } = recorder()
      painter.drawBuilding.call({ ctx, sprites: new Map([[shape, {}]]) }, shape, 0, 0)
      expect(images).toEqual([[-SPRITE_X, -SPRITE_Y, SPRITE_WIDTH, SPRITE_HEIGHT]])
      for (const cell of cellsFor(shape)) {
        expect(cell.x - CELL / 2).toBeGreaterThanOrEqual(-SPRITE_X); expect(cell.x + CELL / 2).toBeLessThanOrEqual(SPRITE_WIDTH - SPRITE_X)
        expect(cell.y - CELL / 2).toBeGreaterThanOrEqual(-SPRITE_Y); expect(cell.y + CELL / 2).toBeLessThanOrEqual(SPRITE_HEIGHT - SPRITE_Y)
      }
    }
  })

  it('every building, turned and moved, keeps its cells on its collider', () => {
    const shapes = Object.keys(SHAPES) as Shape[]
    const restore = shapes.map((shape, i) => ({ shape, x: -110 + i * 36, y: 200 + i * 40, angle: i * 0.7 - 2, secured: false }))
    const game = new Game(9, () => {}, { restore })
    for (const piece of game.pieces) expect(footprintError(piece), piece.shape).toBeLessThan(1e-9)
    game.dispose()
  })

  it('the slab is painted where its collider is', () => {
    const { ctx, rects } = recorder(), game = new Game(1)
    painter.island.call({ ctx }, 0, FLOOR, PLATFORM_WIDTH, 1)
    const corners = (r: Point[]) => r.map(({ x, y }) => [x, y])
    expect(corners(rects[0])).toEqual(game.platform.vertices.map(({ x, y }) => [x, y]))
    for (const r of rects) if (Math.min(...r.map(p => p.y)) < FLOOR + SLAB) for (const { x, y } of r) {
      expect(Math.abs(x)).toBeLessThanOrEqual(HALF); expect(y).toBeGreaterThanOrEqual(FLOOR)
    }
    game.dispose()
  })
})

describe('thrown props land on the deck', () => {
  const kinds = Object.keys(PROP_OUTLINES) as Exclude<PropKind, 'resident'>[]

  it('the outline the deck holds a prop up by is the outline the renderer paints', () => {
    for (const kind of kinds) {
      const { ctx, rects } = recorder()
      painter.prop.call({ ctx }, { kind, x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0, age: 0, lifetime: 1, bounces: 0, color: '#000' }, 0, 0, 1)
      const painted = rects.map(r => [r[0].x, r[0].y, r[2].x - r[0].x, r[2].y - r[0].y])
      for (const outline of PROP_OUTLINES[kind]) expect(painted, kind).toContainEqual([...outline])
      for (const [x, y, w, h] of painted) expect(PROP_OUTLINES[kind].some(([ox, oy, ow, oh]) => x >= ox && y >= oy && x + w <= ox + ow && y + h <= oy + oh), kind).toBe(true)
    }
  })

  it('at any turn, a prop bounces on its painted outline, then lies on the deck as it fades', () => {
    for (const kind of kinds) for (let turn = 0; turn < 16; turn++) {
      const street = new Neighbourhood(), angle = turn * Math.PI / 8, where = `${kind} at ${angle.toFixed(2)}`
      street.props.push({ kind, x: (turn - 8) * 10, y: FLOOR - 120, vx: 20, vy: 0, angle, spin: turn % 2 ? 2 : -3, age: 0, lifetime: 4, bounces: 0, color: '#000' })
      let deepest = 0, settled = -1, gone = -1
      while (street.props.length) {
        const p = street.props[0]
        street.update(FRAME, [], PLATFORM_WIDTH)
        if (!street.props.length) { gone = p.age; break }
        deepest = Math.max(deepest, slabDepth(paint(p)))
        if (settled < 0 && p.bounces === 2 && p.vx === 0) settled = p.age
        if (settled >= 0) expect(Math.max(...paint(p).map(q => q.y)), where).toBeCloseTo(FLOOR, 9)
      }
      expect(deepest, where).toBeLessThan(1e-9)
      expect(settled, where).toBeGreaterThan(0)
      expect(gone - settled, where).toBeLessThanOrEqual(SETTLED_FADE + FRAME / 1000 + 1e-9)
    }
  })

  it('a prop coming down over the edge of the deck tips off the corner instead of cutting through it', () => {
    for (const kind of kinds) for (let turn = 0; turn < 8; turn++) for (const side of [-1, 1]) for (let offset = -6; offset <= 6; offset += 2) {
      const street = new Neighbourhood(), p: StreetProp = { kind, x: side * (HALF + offset), y: FLOOR - 40 - turn * 5, vx: side * (turn % 3) * 10, vy: 0, angle: turn * 0.8, spin: turn % 2 ? 2 : 0, age: 0, lifetime: 3, bounces: turn % 3, color: '#000' }
      street.props.push(p)
      let deepest = 0
      while (street.props.length && p.y < FLOOR + 60) { street.update(FRAME, [], PLATFORM_WIDTH); deepest = Math.max(deepest, slabDepth(paint(p))) }
      expect(deepest, `${kind} ${side * (HALF + offset)} at ${p.angle.toFixed(2)}`).toBeLessThan(1e-9)
    }
  })

  it('a prop falling beside the slab towards it is held off its side', () => {
    for (const kind of kinds) for (let turn = 0; turn < 8; turn++) for (const side of [-1, 1]) {
      const street = new Neighbourhood(), p: StreetProp = { kind, x: side * (HALF + 9), y: FLOOR + turn * 3, vx: -side * 35, vy: 20, angle: turn * 0.8, spin: 3, age: 0, lifetime: 3, bounces: 0, color: '#000' }
      street.props.push(p)
      let deepest = 0
      while (street.props.length && p.y < FLOOR + 60) { street.update(FRAME, [], PLATFORM_WIDTH); deepest = Math.max(deepest, slabDepth(paint(p))) }
      expect(deepest, `${kind} at ${turn * 0.8}`).toBeLessThan(1e-9)
      expect(p.y, `${kind} at ${turn * 0.8}`).toBeGreaterThanOrEqual(FLOOR + 60)
    }
  })
})
