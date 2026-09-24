import { describe, expect, it, vi } from 'vitest'
import { TheatreController, type Companion, type Projector } from './controller'
import { bestHint, CoverageMeter, TAP_TURN, type HintMove, type Placed } from './coverage'
import { buildCreature, CREATURE_ORDER } from './creatures'
import { IDLE_BEFORE_DEMO } from './guidance'
import type { Point } from './input'
import { ANTICIPATE_S, CREATURE_STACK, PEEL_S, PERSONALITIES, SETTLE_S, SILHOUETTE_S, SKY_HOMES, SKY_Z, skyDepth, skyScale, SPARK_Z, type CreaturePose } from './motion'
import { clearOfProscenium, LAMP, PROSCENIUM, shadowScale, STAGE } from './projection'
import { SHAPE_KINDS, SHAPES } from './shapes'
import { standsClash, standTooFront } from './stands'
import { defaultTheatre, SKY_SLOTS, type TheatreState } from './state'

// The theatre driven the way a child drives it: pointer events through the
// real hit test, springs, coverage and wake rule. The fake camera looks down
// the stage at a fixed tilt, so a screen point (x, y) in pixels lands on the
// grip plane at world (x, z) = (x, y) / PX_PER_CM.

const FRAME = 1 / 60
const PX_PER_CM = 10
const SQUARE = SHAPE_KINDS.indexOf('square')
const SMALL_TRI = SHAPE_KINDS.indexOf('smallTri')
const BIG_TRI = SHAPE_KINDS.indexOf('bigTri')

const projector: Projector = {
  ray(screen, origin, dir) {
    origin.x = screen.x / PX_PER_CM
    origin.y = 86
    origin.z = screen.y / PX_PER_CM + 80
    dir.x = 0
    dir.y = -0.6
    dir.z = -0.8
    return true
  },
}

function px(x: number, z: number): Point {
  return { x: x * PX_PER_CM, y: z * PX_PER_CM }
}

/** The screen point whose ray passes through world (x, y, z) under the fake camera. */
function onScreen(x: number, y: number, z: number): Point {
  return { x: x * PX_PER_CM, y: ((0.8 * (86 - y)) / 0.6 + z - 80) * PX_PER_CM }
}

function theatre(state: TheatreState = defaultTheatre(6), everTouched = false) {
  const saves: TheatreState[] = []
  const ctrl = new TheatreController(state, { save: (saved) => saves.push(saved), childAge: 6, everTouched })
  ctrl.setProjector(projector)
  return { ctrl, saves }
}

function run(ctrl: TheatreController, seconds: number, each?: () => void): void {
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    ctrl.step(FRAME)
    each?.()
  }
}

/** Steps until `done` holds; returns the seconds it took, or throws. */
function runUntil(ctrl: TheatreController, done: () => boolean, seconds: number, each?: () => void): number {
  for (let i = 0; i <= Math.round(seconds / FRAME); i++) {
    if (done()) return i * FRAME
    ctrl.step(FRAME)
    each?.()
  }
  throw new Error(`not within ${seconds} s`)
}

/** Where the view draws a creature: a page turning about its hinge is offset from its pose. */
function drawn(pose: CreaturePose): { x: number; y: number } {
  return { x: pose.x + pose.hinge * pose.scale * (1 - pose.facing * Math.cos(pose.spin)), y: pose.y }
}

/** Nothing is waking on the screen or still flying home. */
function settled(ctrl: TheatreController): boolean {
  return ctrl.waking === null && ctrl.companions.every((c) => c.flight === null)
}

let clock = 0

/** A screen point where a finger lands on shape `index` (a card in front can hide part of it). */
function grabPoint(ctrl: TheatreController, index: number): Point {
  const pose = ctrl.shapes[index].pose
  for (const dz of [0, -1, 1, -2, 2, -3, 3, -4, 4])
    for (const dx of [0, -1, 1, -2, 2, -3, 3]) {
      const at = px(pose.x + dx, pose.z + dz)
      const hit = ctrl.hitTest(at)
      if (hit.kind === 'shape' && hit.index === index) return at
    }
  throw new Error(`${ctrl.shapes[index].kind} cannot be grabbed`)
}

function tap(ctrl: TheatreController, index: number, pointerId = 1): void {
  const at = grabPoint(ctrl, index)
  ctrl.pointerDown(pointerId, at, clock)
  ctrl.step(FRAME)
  ctrl.pointerUp(pointerId, at, clock + 90)
  clock += 1000
}

/** Slide shape `index` so its pin ends at `to` (by way of `via`), finger held throughout. */
function drag(ctrl: TheatreController, index: number, to: { x: number; z: number }, pointerId = 1, release = true, via: { x: number; z: number }[] = []): void {
  const start = grabPoint(ctrl, index)
  const target = ctrl.shapes[index].target
  const at = (p: { x: number; z: number }) => ({ x: start.x + (p.x - target.x) * PX_PER_CM, y: start.y + (p.z - target.z) * PX_PER_CM })
  const end = at(to)
  // A short move goes the long way round, so it is a drag and not a tap.
  const path = Math.hypot(end.x - start.x, end.y - start.y) < 30 ? [{ x: start.x, y: start.y - 40 }, end] : [...via.map(at), end]
  ctrl.pointerDown(pointerId, start, clock)
  let from = start
  for (const leg of path) {
    for (let i = 1; i <= 12; i++) {
      ctrl.pointerMove(pointerId, { x: from.x + ((leg.x - from.x) * i) / 12, y: from.y + ((leg.y - from.y) * i) / 12 })
      ctrl.step(FRAME)
    }
    from = leg
  }
  clock += 2000
  if (release) ctrl.pointerUp(pointerId, end, clock)
}

/** Do what the game's own hint says, move by move, until the sleeper wakes; returns the number of moves. */
function wakeByHints(ctrl: TheatreController, onMove?: (move: HintMove, placed: Placed[]) => void): number {
  const sleeper = ctrl.sleeper!
  const meter = new CoverageMeter(sleeper.built)
  for (let moves = 1; moves <= 8; moves++) {
    const placed = ctrl.shapes.map((shape) => ({ kind: shape.kind, pose: { ...shape.pose } }))
    const move = bestHint(meter, placed, moves === 1)
    if (!move) break
    onMove?.(move, placed)
    const turns = Math.round((move.angle - placed[move.index].pose.angle) / TAP_TURN)
    for (let i = 0; i < turns; i++) {
      tap(ctrl, move.index)
      run(ctrl, 0.4)
    }
    drag(ctrl, move.index, move)
    try {
      runUntil(ctrl, () => ctrl.sleeper !== sleeper, 1.5)
      return moves
    } catch {
      // Not yet: take the next hint.
    }
  }
  throw new Error(`${sleeper.kind} never woke`)
}

describe('theatre controller', () => {
  it('a card slid toward the screen throws a smaller shadow, and back toward the lamp a bigger one', () => {
    const { ctrl, saves } = theatre()
    run(ctrl, 0.2)
    const square = ctrl.shapes[SQUARE]
    const atRack = shadowScale(square.pose.z)
    // Out from behind the small triangle first: straight down, the two cards would cut through each other.
    const lane = square.pose.x + 8
    drag(ctrl, SQUARE, { x: lane, z: 20 }, 1, false, [{ x: lane, z: square.pose.z }])
    expect(square.heldBy).toBe(1)
    run(ctrl, 0.6)
    expect(square.pose.lift, 'lifted while held').toBeGreaterThan(1.2)
    ctrl.pointerUp(1, px(square.pose.x, 20), clock)
    run(ctrl, 1.5)
    expect(square.heldBy).toBeNull()
    expect(square.pose.z).toBeCloseTo(20, 2)
    expect(Math.abs(square.pose.lift), 'set down').toBeLessThan(0.05)
    expect(shadowScale(square.pose.z)).toBeLessThan(atRack * 0.6)
    expect(saves.at(-1)!.shapes[SQUARE].z).toBeCloseTo(20, 1)

    drag(ctrl, SQUARE, { x: square.pose.x, z: 90 })
    run(ctrl, 1.5)
    expect(square.pose.z, 'the stage ends at the lamp').toBeCloseTo(STAGE.zFar, 2)
    expect(shadowScale(square.pose.z)).toBeGreaterThan(atRack)
  })

  it('a tap turns a card by one step, with a little overshoot, and saves at once', () => {
    const { ctrl, saves } = theatre()
    run(ctrl, 0.2)
    const square = ctrl.shapes[SQUARE]
    const before = saves.length
    tap(ctrl, SQUARE)
    expect(square.target.angle).toBeCloseTo(TAP_TURN, 9)
    expect(saves.length).toBeGreaterThan(before)
    expect(saves.at(-1)!.shapes[SQUARE].angle).toBeCloseTo(TAP_TURN, 2)
    let most = 0
    run(ctrl, 2, () => (most = Math.max(most, square.pose.angle)))
    expect(most, 'stiff card swings past and back').toBeGreaterThan(TAP_TURN * 1.03)
    expect(most, 'but only a touch').toBeLessThan(TAP_TURN * 1.3)
    expect(square.pose.angle).toBeCloseTo(TAP_TURN, 3)
  })

  it('a second finger off the cards twists the held card, and lifting both is not a tap', () => {
    const { ctrl } = theatre()
    run(ctrl, 0.2)
    const square = ctrl.shapes[SQUARE]
    const at = grabPoint(ctrl, SQUARE)
    const home = { x: square.target.x, z: square.target.z }
    ctrl.pointerDown(1, at, clock)
    const off = { x: at.x + 100, y: at.y }
    expect(ctrl.hitTest(off).kind).toBe('backdrop')
    ctrl.pointerDown(2, off, clock + 10)
    for (let i = 1; i <= 10; i++) {
      const a = (-i / 10) * (Math.PI / 2)
      ctrl.pointerMove(2, { x: at.x + Math.cos(a) * 100, y: at.y + Math.sin(a) * 100 })
      ctrl.step(FRAME)
    }
    ctrl.pointerUp(2, { x: at.x, y: at.y - 100 }, clock + 200)
    ctrl.pointerUp(1, at, clock + 220)
    clock += 1000
    run(ctrl, 1.5)
    expect(square.target.angle).toBeCloseTo(Math.PI / 2, 6)
    expect(square.pose.angle).toBeCloseTo(Math.PI / 2, 3)
    expect(square.target).toMatchObject(home)
  })

  it('following the hints wakes the sleeper: it peels off, flies home to the sky, and a new outline drifts in', () => {
    const { ctrl, saves } = theatre()
    run(ctrl, 0.3)
    expect(ctrl.sleeper!.kind).toBe(CREATURE_ORDER[0])
    const version = ctrl.version
    const moves = wakeByHints(ctrl)
    expect(moves).toBeLessThanOrEqual(6)

    const waking = ctrl.waking!
    expect(waking.kind).toBe(CREATURE_ORDER[0])
    expect(ctrl.sleeper).toBeNull()
    expect(ctrl.version).toBeGreaterThan(version)
    expect(ctrl.state.sky).toEqual([{ kind: CREATURE_ORDER[0], slot: 0, paper: 0 }])
    expect(ctrl.state.sleeping).toBe(CREATURE_ORDER[1])
    expect(saves.at(-1)!.sky).toHaveLength(1)
    expect(saves.at(-1)!.sleeping).toBe(CREATURE_ORDER[1])

    // The next outline drifts in while the first creature is still on its way.
    let spin = 0
    let turned = 1
    const peel = () => {
      spin = Math.max(spin, Math.abs(waking.pose.spin))
      turned = Math.min(turned, waking.pose.facing)
    }
    const nextAfter = runUntil(ctrl, () => ctrl.sleeper !== null, 2.5, peel)
    expect(nextAfter).toBeGreaterThan(1.2)
    expect(ctrl.waking).toBe(waking)
    expect(ctrl.sleeper!.kind).toBe(CREATURE_ORDER[1])
    expect(ctrl.sleeper!.armed).toBe(false)

    // Once the page has turned it flies home as a companion, from where the page left it.
    let last = { x: 0, y: 0 }
    runUntil(
      ctrl,
      () => ctrl.waking === null,
      3,
      () => {
        peel()
        if (ctrl.waking) last = drawn(waking.pose)
      },
    )
    expect(turned, 'turned over like a page').toBeCloseTo(-1, 2)
    expect(spin, 'in its own plane, never swung out toward the stands').toBe(0)
    expect(ctrl.companions).toHaveLength(1)
    const friend = ctrl.companions[0]
    expect(friend.flight).not.toBeNull()
    const first = drawn(friend.pose)
    expect(Math.hypot(first.x - last.x, first.y - last.y), 'no jump when the page becomes a flyer').toBeLessThan(0.6)
    runUntil(
      ctrl,
      () => friend.flight === null,
      8,
      () => {
        if (friend.flight) last = { x: friend.pose.x, y: friend.pose.y }
      },
    )
    expect(friend.kind).toBe(CREATURE_ORDER[0])
    expect(friend.pose.z).toBe(SKY_Z)
    expect(friend.pose.scale).toBe(skyScale(CREATURE_ORDER[0]))
    expect(Math.hypot(friend.pose.x - SKY_HOMES[0].x, friend.pose.y - SKY_HOMES[0].y), 'at home in the sky').toBeLessThan(3)
    expect(Math.hypot(friend.pose.x - last.x, friend.pose.y - last.y), 'no jump on arrival').toBeLessThan(0.6)

    // A fresh outline waits for the child: it cannot wake from where the shapes happen to stand.
    run(ctrl, 3)
    expect(ctrl.sleeper!.armed).toBe(false)
    expect(ctrl.waking).toBeNull()
    tap(ctrl, SQUARE)
    expect(ctrl.sleeper!.armed).toBe(true)

    // Tapping the companion in the sky makes it play.
    const home = friend.pose
    const at = { x: home.x * PX_PER_CM, y: ((17 - home.y) / 0.75) * PX_PER_CM }
    expect(ctrl.hitTest(at)).toEqual({ kind: 'sky', index: 0 })
    ctrl.pointerDown(3, at, clock)
    ctrl.pointerUp(3, at, clock + 80)
    expect(friend.reactAt).toBe(ctrl.t)
    run(ctrl, 3)
    expect(friend.reactAt).toBe(-Infinity)
  })

  it('following the hints wakes all six creatures in turn, never by standing one card in another', () => {
    const { ctrl } = theatre()
    run(ctrl, 0.3)
    for (const kind of CREATURE_ORDER) {
      runUntil(ctrl, () => ctrl.sleeper !== null && settled(ctrl), 12)
      expect(ctrl.sleeper!.kind).toBe(kind)
      wakeByHints(ctrl, (move, placed) => {
        const mover = placed[move.index]
        for (const other of placed) {
          if (other === mover) continue
          const inside = Math.abs(other.pose.z - move.z) < 2 && Math.abs(other.pose.x - move.x) < SHAPES[other.kind].radius + SHAPES[mover.kind].radius
          expect(inside, `${kind}: ${mover.kind} into ${other.kind}`).toBe(false)
        }
      })
    }
    runUntil(ctrl, () => settled(ctrl), 8)
    expect(ctrl.state.sky.map((friend) => friend.kind)).toEqual([...CREATURE_ORDER])
    expect(ctrl.companions.map((friend) => friend.kind)).toEqual([...CREATURE_ORDER])
  })

  it('a creature woken while the last one is still flying home does not knock it out of the sky', () => {
    const { ctrl } = theatre()
    run(ctrl, 0.3)
    const [first, second] = CREATURE_ORDER
    wakeByHints(ctrl)
    const firstWokeAt = ctrl.t
    runUntil(ctrl, () => ctrl.sleeper !== null && ctrl.enterProgress() >= 1, 5)
    expect(ctrl.sleeper!.kind).toBe(second)
    wakeByHints(ctrl)
    const trip = SILHOUETTE_S + ANTICIPATE_S + PEEL_S + PERSONALITIES[first].gaitSeconds
    expect(ctrl.t - firstWokeAt, `${second} woke before ${first} was home`).toBeLessThan(trip)

    run(ctrl, 10)
    expect(settled(ctrl)).toBe(true)
    expect(ctrl.companions.map((c) => c.kind)).toEqual([first, second])
    ctrl.companions.forEach((friend) => {
      const home = SKY_HOMES[friend.slot]
      // Within its idle's reach (the fish swims a figure-eight 3.5 cm either side of home).
      expect(Math.hypot(friend.pose.x - home.x, friend.pose.y - home.y), `${friend.kind} at home`).toBeLessThan(4)
    })
    expect(ctrl.state.sky.map((friend) => friend.kind)).toEqual([first, second])
  })

  it('a ninth creature sends the oldest friend to rest behind the moon', () => {
    const state = defaultTheatre(6)
    state.sky = Array.from({ length: SKY_SLOTS }, (_, slot) => ({ kind: CREATURE_ORDER[slot % CREATURE_ORDER.length], slot, paper: slot < CREATURE_ORDER.length ? 0 : 1 }))
    const { ctrl } = theatre(state)
    run(ctrl, 0.3)
    expect(ctrl.companions).toHaveLength(SKY_SLOTS)
    wakeByHints(ctrl)
    expect(ctrl.companions.some((c) => c.leavingAt > -Infinity)).toBe(true)
    runUntil(ctrl, () => settled(ctrl), 8)
    run(ctrl, 3.5)
    expect(ctrl.companions).toHaveLength(SKY_SLOTS)
    expect(ctrl.companions.every((c) => c.leavingAt === -Infinity)).toBe(true)
  })

  it('a saved sky opens with every friend already at home, before the first step', () => {
    const state = defaultTheatre(6)
    state.sky = Array.from({ length: SKY_SLOTS }, (_, slot) => ({ kind: CREATURE_ORDER[slot % CREATURE_ORDER.length], slot, paper: slot < CREATURE_ORDER.length ? 0 : 1 }))
    const { ctrl } = theatre(state, true)
    expect(ctrl.companions).toHaveLength(SKY_SLOTS)
    ctrl.companions.forEach((friend) => {
      const home = SKY_HOMES[friend.slot]
      expect(Math.hypot(friend.pose.x - home.x, friend.pose.y - home.y), `${friend.kind} in slot ${friend.slot} at home`).toBeLessThan(4)
      expect(friend.pose.z).toBeCloseTo(skyDepth(friend.slot), 6)
      expect(friend.pose.scale).toBeCloseTo(skyScale(friend.kind), 6)
    })
  })

  it('a creature flying to a home by the crest keeps in front of the proscenium over it, then settles back onto its sky layer at home', () => {
    const state = defaultTheatre(6)
    state.sky = CREATURE_ORDER.slice(0, 5).map((kind, slot) => ({ kind, slot, paper: 0 as const }))
    state.sleeping = 'dragon'
    const { ctrl } = theatre(state, true)
    run(ctrl, 0.3)
    wakeByHints(ctrl)
    const { bounds } = buildCreature('dragon')
    let dragon: Companion | undefined
    let landedAt = -1
    let last = NaN
    runUntil(
      ctrl,
      () => landedAt >= 0 && ctrl.t - landedAt > SETTLE_S + 0.1,
      20,
      () => {
        dragon ??= ctrl.companions.find((c) => c.kind === 'dragon')
        if (!dragon) return
        const { pose } = dragon
        const over = clearOfProscenium(pose.x, pose.y, ((bounds.x1 - bounds.x0) / 2) * pose.scale, ((bounds.y1 - bounds.y0) / 2) * pose.scale) < 0
        if (over) expect(pose.z + CREATURE_STACK.drop * pose.scale, `over the proscenium at ${pose.x.toFixed(1)}, ${pose.y.toFixed(1)}`).toBeGreaterThan(PROSCENIUM.front)
        if (!Number.isNaN(last)) expect(Math.abs(pose.z - last), 'no jump in depth').toBeLessThan(1)
        last = pose.z
        if (landedAt < 0 && !dragon.flight) {
          landedAt = ctrl.t
          expect(pose.z, 'lands short of the sky layer, in front of the crest').toBeGreaterThan(skyDepth(dragon.slot) + 1)
          const card = drawn(pose)
          expect(ctrl.hitTest(onScreen(card.x, card.y, pose.z)), 'a tap on the card while it settles').toEqual({ kind: 'sky', index: ctrl.companions.indexOf(dragon) })
        }
      },
    )
    expect(dragon!.slot).toBe(5)
    expect(dragon!.pose.z).toBe(skyDepth(5))
  })

  it('putting the theatre away mid-drag sets the card down where it is and saves it', () => {
    const { ctrl, saves } = theatre()
    run(ctrl, 0.2)
    const square = ctrl.shapes[SQUARE]
    const lane = square.pose.x + 8
    drag(ctrl, SQUARE, { x: lane, z: 25 }, 1, false, [{ x: lane, z: square.pose.z }])
    run(ctrl, 0.3)
    expect(square.heldBy).toBe(1)
    const before = saves.length
    ctrl.setRunning(false)
    expect(square.heldBy).toBeNull()
    expect(saves.length).toBeGreaterThan(before)
    expect(saves.at(-1)!.shapes[SQUARE].z).toBeCloseTo(25, 1)
    // The finger that was down when it paused does nothing more.
    const angle = square.target.angle
    ctrl.pointerMove(1, px(0, 10))
    ctrl.pointerUp(1, px(0, 10), clock + 50)
    expect(square.target.z).toBeCloseTo(25, 6)
    expect(square.target.angle).toBe(angle)
  })

  it('a tap on nothing in particular puts its burst of stars on whatever the finger touched', () => {
    const { ctrl } = theatre()
    run(ctrl, 0.2)
    const aim = { origin: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: 0 } }
    ctrl.setProjector({
      ray(_, origin, dir) {
        Object.assign(origin, aim.origin)
        Object.assign(dir, aim.dir)
        return true
      },
    })
    const tapAlong = (origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }) => {
      aim.origin = origin
      aim.dir = dir
      expect(ctrl.hitTest({ x: 0, y: 0 }).kind).toBe('backdrop')
      ctrl.pointerDown(1, { x: 0, y: 0 }, clock)
      ctrl.step(FRAME)
      ctrl.pointerUp(1, { x: 0, y: 0 }, clock + 90)
      clock += 1000
      expect(ctrl.t - ctrl.spark.at).toBeLessThan(0.1)
      return ctrl.spark
    }
    const down = { x: 0, y: -0.6, z: -0.8 }
    // Onto the planks between the lamp and the right-hand rack.
    expect(tapAlong({ x: 12, y: 86, z: 140 }, down)).toMatchObject({ surface: 'floor', x: 12, y: 0, z: expect.closeTo(140 - (86 / 0.6) * 0.8, 6) })
    // Onto the empty lit screen beside the sleeper, just off the paper, under the finger.
    expect(tapAlong({ x: -26, y: 86, z: 90 }, down)).toMatchObject({ surface: 'screen', x: -26, y: expect.closeTo(86 - ((90 - SPARK_Z.screen) / 0.8) * 0.6, 6), z: SPARK_Z.screen })
    // Onto the left curtain: in front of it and of anything flying over it, not hidden behind it on the sky.
    expect(tapAlong({ x: -38, y: 86, z: 90 }, down)).toMatchObject({ surface: 'sky', y: expect.closeTo(86 - ((90 - SPARK_Z.proscenium) / 0.8) * 0.6, 6), z: SPARK_Z.proscenium })
    expect(SPARK_Z.proscenium).toBeGreaterThan(PROSCENIUM.front)
    // Past the theatre into the night, in front of the companions at home.
    expect(tapAlong({ x: 60, y: 150, z: 90 }, { x: 0, y: -0.3, z: -0.95 })).toMatchObject({ surface: 'sky', z: SPARK_Z.sky })
    expect(SPARK_Z.sky).toBeGreaterThan(Math.max(...SKY_HOMES.map((_, slot) => skyDepth(slot))))
  })

  it('a first open invites with a hop; after an idle spell the shapes glow and a ghost hand shows a move that helps', () => {
    const { ctrl } = theatre()
    let hop = 0
    run(ctrl, 2.5, () => (hop = Math.max(hop, ctrl.shapes[ctrl.inviteShape].pose.lift)))
    expect(hop, 'the invite hop').toBeGreaterThan(1)

    runUntil(ctrl, () => ctrl.demoPose.opacity > 0.5, 8)
    expect(ctrl.shapes.some((shape) => shape.glow > 0.3)).toBe(true)
    const demo = ctrl.demo!
    expect(demo).not.toBeNull()
    const before = ctrl.coverage.fill

    const turns = Math.round(demo.turn / TAP_TURN)
    for (let i = 0; i < turns; i++) {
      tap(ctrl, demo.index)
      run(ctrl, 0.4)
    }
    drag(ctrl, demo.index, demo.to, 1, false)
    expect(ctrl.demoPose.opacity, 'a touch clears the ghost').toBe(0)
    ctrl.pointerUp(1, grabPoint(ctrl, demo.index), clock)
    expect(ctrl.guidance.demo).toBeNull()
    run(ctrl, 1)
    expect(ctrl.coverage.fill).toBeGreaterThan(before)
    expect(ctrl.shapes.every((shape) => shape.glow === 0)).toBe(true)
  })
})

describe('stands', () => {
  /** Checks every frame that no two stands meet, none stands over the front line, and none sinks into the planks. */
  function watch(ctrl: TheatreController): { frames: number } {
    const seen = { frames: 0 }
    const step = ctrl.step.bind(ctrl)
    ctrl.step = (dt: number) => {
      step(dt)
      seen.frames++
      const shapes = ctrl.shapes
      for (let i = 0; i < shapes.length; i++) {
        const a = shapes[i]
        if (a.pose.lift < 0) throw new Error(`${a.kind} sank ${(-a.pose.lift).toFixed(3)} cm into the planks at ${ctrl.t.toFixed(2)} s`)
        if (standTooFront(a)) throw new Error(`${a.kind} over the front line at ${ctrl.t.toFixed(2)} s`)
        for (let j = i + 1; j < shapes.length; j++) if (standsClash(a, shapes[j], 0)) throw new Error(`${a.kind} through ${shapes[j].kind} at ${ctrl.t.toFixed(2)} s`)
      }
    }
    return seen
  }

  function seeded(seed: number): () => number {
    let s = seed
    return () => (s = (s * 16807) % 2147483647) / 2147483647
  }

  it('never pass through each other, over the front line or into the planks, following the hints or pushed about', () => {
    const { ctrl } = theatre()
    const seen = watch(ctrl)
    run(ctrl, 0.3)
    for (const kind of CREATURE_ORDER.slice(0, 3)) {
      runUntil(ctrl, () => ctrl.sleeper !== null && settled(ctrl), 12)
      expect(ctrl.sleeper!.kind).toBe(kind)
      wakeByHints(ctrl)
    }
    // Then rough handling: stands dragged straight at each other and the screen, turned and twisted where they stand.
    const random = seeded(11)
    for (let n = 0; n < 40; n++) {
      const i = Math.floor(random() * ctrl.shapes.length)
      const to = { x: STAGE.xMin - 4 + random() * (STAGE.xMax - STAGE.xMin + 8), z: STAGE.zNear - 6 + random() * (STAGE.zFar - STAGE.zNear + 6) }
      try {
        if (random() < 0.3) tap(ctrl, i)
        else drag(ctrl, i, to)
      } catch {
        // Hidden behind a nearer card: a finger cannot reach it either.
      }
      run(ctrl, 0.3 + random())
    }
    run(ctrl, 2)
    expect(seen.frames).toBeGreaterThan(2000)
  })

  it('a stand pushed straight at another stops against it, and is set down there', () => {
    const { ctrl } = theatre()
    watch(ctrl)
    run(ctrl, 0.2)
    const square = ctrl.shapes[SQUARE]
    const small = ctrl.shapes[SMALL_TRI]
    drag(ctrl, SQUARE, { x: square.pose.x, z: 20 })
    run(ctrl, 1.5)
    expect(square.pose.z, 'stopped behind the small triangle').toBeGreaterThan(small.pose.z)
    expect(square.pose.z).toBeLessThan(small.pose.z + 2)
    expect(square.target.z, 'set down where it stopped').toBeCloseTo(square.pose.z, 1)
    expect(standsClash(square, small, 0)).toBe(false)
  })

  it('with no clearly better move, the ghost hand still shows a slide to a rest the stand can hold', () => {
    const best = vi.spyOn(CoverageMeter.prototype, 'best', 'get').mockReturnValue(null)
    try {
      // The square already stands where the outline's middle falls, as it often does while it fills it.
      const { center } = theatre().ctrl.sleeper!.built
      const state = defaultTheatre(6)
      state.shapes[SQUARE] = { ...state.shapes[SQUARE], x: LAMP.x + (center.x - LAMP.x) / shadowScale(21), z: 21 }
      const { ctrl } = theatre(state)
      run(ctrl, 0.3)
      runUntil(ctrl, () => ctrl.demo !== null, 20)
      const demo = ctrl.demo!
      expect(demo.index, 'another stand is shown').not.toBe(SQUARE)
      const shape = ctrl.shapes[demo.index]
      const rest = { kind: shape.kind, pose: { ...shape.pose, x: demo.to.x, z: demo.to.z, angle: demo.to.angle, yaw: 0 } }
      expect(standTooFront(rest), 'behind the front line').toBe(false)
      ctrl.shapes.forEach((other, j) => {
        if (j !== demo.index) expect(standsClash(rest, other), `clear of the ${other.kind}`).toBe(false)
      })
    } finally {
      best.mockRestore()
    }
  })

  it('a twist stops before the card turns into its neighbour; a tap turn steps it aside instead', () => {
    const { ctrl } = theatre()
    watch(ctrl)
    run(ctrl, 0.2)
    const small = ctrl.shapes[SMALL_TRI]
    const big = ctrl.shapes[BIG_TRI]
    const home = { x: small.target.x, z: small.target.z }
    // A quarter turn where it stands would swing its point through the big triangle beside it.
    expect(standsClash({ kind: small.kind, pose: { ...small.pose, angle: Math.PI / 2 } }, big)).toBe(true)
    const at = grabPoint(ctrl, SMALL_TRI)
    ctrl.pointerDown(1, at, clock)
    ctrl.pointerDown(2, { x: at.x + 100, y: at.y }, clock + 10)
    for (let i = 1; i <= 10; i++) {
      const a = (-i / 10) * (Math.PI / 2)
      ctrl.pointerMove(2, { x: at.x + Math.cos(a) * 100, y: at.y + Math.sin(a) * 100 })
      ctrl.step(FRAME)
    }
    ctrl.pointerUp(2, { x: at.x, y: at.y - 100 }, clock + 200)
    ctrl.pointerUp(1, at, clock + 220)
    clock += 1000
    run(ctrl, 1.5)
    expect(small.target.angle, 'turned some way').toBeGreaterThan(0.2)
    expect(small.target.angle, 'but not into the big triangle').toBeLessThan(Math.PI / 2)
    expect(small.target).toMatchObject(home)

    for (let i = 0; i < 3; i++) {
      tap(ctrl, SMALL_TRI)
      run(ctrl, 1)
    }
    run(ctrl, 1.5)
    expect(Math.hypot(small.target.x - home.x, small.target.z - home.z), 'stepped aside').toBeGreaterThan(0.5)
    expect(small.pose.x).toBeCloseTo(small.target.x, 1)
    expect(small.pose.z).toBeCloseTo(small.target.z, 1)
    expect(small.pose.angle).toBeCloseTo(small.target.angle, 2)
  })

  it('a layout saved with two stands in one place opens with them apart', () => {
    const state = defaultTheatre(6)
    state.shapes[SQUARE] = { ...state.shapes[SQUARE], x: state.shapes[SMALL_TRI].x, z: state.shapes[SMALL_TRI].z }
    const { ctrl } = theatre(state)
    watch(ctrl)
    for (let i = 0; i < ctrl.shapes.length; i++) for (let j = i + 1; j < ctrl.shapes.length; j++) expect(standsClash(ctrl.shapes[i], ctrl.shapes[j], 0), `${ctrl.shapes[i].kind}, ${ctrl.shapes[j].kind}`).toBe(false)
    run(ctrl, 1)
  })
})

describe('guidance timing', () => {
  it('the first demonstration is ready on time and the ghost hand never starts halfway through a move', () => {
    for (const age of [4, 6, 9, null]) {
      const ctrl = new TheatreController(defaultTheatre(age), { save: () => {}, childAge: age })
      ctrl.setProjector(projector)
      let firstSeen: number | null = null
      let shownAt = -1
      run(ctrl, 16, () => {
        if (ctrl.demoPose.opacity > 0 && shownAt < 0) {
          shownAt = ctrl.t
          firstSeen = ctrl.guidance.demo
        }
      })
      expect(shownAt, `age ${age}: first demonstration`).toBeGreaterThan(IDLE_BEFORE_DEMO - 0.05)
      expect(shownAt, `age ${age}: first demonstration`).toBeLessThan(IDLE_BEFORE_DEMO + 0.1)
      expect(firstSeen!, `age ${age}: starts at the start`).toBeLessThan(0.02)
    }
  })
})

describe('frame budget', () => {
  // The controller's heaviest frames: a card dragged under a full sky, which
  // re-measures the outline every frame, and the idle hint search, which is
  // spread over frames with a fixed slice. The view needs most of an iPad's
  // frame, so both must stay a small part of it even on a busy CI runner.

  function fullSky(): TheatreState {
    const state = defaultTheatre(6)
    state.sky = Array.from({ length: SKY_SLOTS }, (_, slot) => ({ kind: CREATURE_ORDER[slot % CREATURE_ORDER.length], slot, paper: slot < CREATURE_ORDER.length ? 0 : 1 }))
    return state
  }

  function dragCost(frames: number): number {
    const { ctrl } = theatre(fullSky(), true)
    run(ctrl, 0.2)
    const start = grabPoint(ctrl, SQUARE)
    ctrl.pointerDown(1, start, 0)
    const times: number[] = []
    for (let i = 0; i < frames; i++) {
      ctrl.pointerMove(1, { x: start.x - 120 - Math.sin(i / 20) * 150, y: start.y - 200 + Math.cos(i / 13) * 180 })
      const t0 = performance.now()
      ctrl.step(FRAME)
      times.push(performance.now() - t0)
    }
    ctrl.pointerUp(1, start, 5000)
    return times.reduce((a, b) => a + b, 0) / times.length
  }

  it('dragging a card under a full sky costs the controller under 0.5 ms per frame on average', () => {
    dragCost(60)
    const best = Math.min(...Array.from({ length: 5 }, () => dragCost(180)))
    console.log(`drag: best average ${best.toFixed(3)} ms`)
    expect(best).toBeLessThan(0.5)
  })

  it('the idle hint search runs one budgeted slice a frame until it has a hint', () => {
    // Counted, not timed: each read of the search's clock stands for one scored candidate's cost, so the slices
    // are the same on every machine however busy it is.
    const { ctrl } = theatre(fullSky(), true)
    const continueSearch = CoverageMeter.prototype.continueSearch
    const candidate = 0.05
    let clock = 0
    const budgets: number[] = []
    const slices = vi.spyOn(CoverageMeter.prototype, 'continueSearch').mockImplementation(function (this: CoverageMeter, budgetMs: number) {
      budgets.push(budgetMs)
      return continueSearch.call(this, budgetMs, () => (clock += candidate))
    })
    const scoring = vi.spyOn(CoverageMeter.prototype as unknown as { soloScore: (...args: unknown[]) => number }, 'soloScore')
    try {
      run(ctrl, 0.5)
      let searchFrames = 0
      let mostSlices = 0
      let mostScored = 0
      for (let i = 0; i < 600 && !ctrl.demo; i++) {
        const slicesBefore = slices.mock.calls.length
        const scoredBefore = scoring.mock.calls.length
        ctrl.step(FRAME)
        const frameSlices = slices.mock.calls.length - slicesBefore
        if (frameSlices > 0) searchFrames += 1
        mostSlices = Math.max(mostSlices, frameSlices)
        mostScored = Math.max(mostScored, scoring.mock.calls.length - scoredBefore)
      }
      expect(ctrl.demo, 'the search ended in a hint').not.toBeNull()
      expect(searchFrames, 'the search was spread over frames').toBeGreaterThan(1)
      expect(mostSlices, 'slices in one frame').toBe(1)
      expect(Math.max(...budgets), 'slice budget (ms of a 16.7 ms frame)').toBeLessThanOrEqual(0.6)
      // One read starts a slice, then one per scored candidate until the budget is spent; soloScore also runs once
      // per shape for its baseline.
      expect(mostScored, 'candidates scored in one frame').toBeLessThanOrEqual(Math.ceil(0.6 / candidate) + 2)
    } finally {
      slices.mockRestore()
      scoring.mockRestore()
    }
  })
})
