import { describe, expect, it } from 'vitest'
import { TheatreController, type Projector } from './controller'
import { bestHint, CoverageMeter, TAP_TURN, type HintMove, type Placed } from './coverage'
import { CREATURE_ORDER } from './creatures'
import { IDLE_BEFORE_DEMO } from './guidance'
import type { Point } from './input'
import { ANTICIPATE_S, PEEL_S, PERSONALITIES, SILHOUETTE_S, SKY_HOMES, SKY_Z, skyScale, type CreaturePose } from './motion'
import { PROSCENIUM, shadowScale, STAGE } from './projection'
import { SHAPE_KINDS, SHAPES } from './shapes'
import { defaultTheatre, SKY_SLOTS, type TheatreState } from './state'

// The theatre driven the way a child drives it: pointer events through the
// real hit test, springs, coverage and wake rule. The fake camera looks down
// the stage at a fixed tilt, so a screen point (x, y) in pixels lands on the
// grip plane at world (x, z) = (x, y) / PX_PER_CM.

const FRAME = 1 / 60
const PX_PER_CM = 10
const SQUARE = SHAPE_KINDS.indexOf('square')

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
  return { x: pose.x + pose.hinge * pose.scale * (1 - Math.cos(pose.spin)), y: pose.y }
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

/** Slide shape `index` so its pin ends at `to`, finger held throughout. */
function drag(ctrl: TheatreController, index: number, to: { x: number; z: number }, pointerId = 1, release = true): void {
  const start = grabPoint(ctrl, index)
  const target = ctrl.shapes[index].target
  const end = { x: start.x + (to.x - target.x) * PX_PER_CM, y: start.y + (to.z - target.z) * PX_PER_CM }
  // A short move goes the long way round, so it is a drag and not a tap.
  const path = Math.hypot(end.x - start.x, end.y - start.y) < 30 ? [{ x: start.x, y: start.y - 40 }, end] : [end]
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
    drag(ctrl, SQUARE, { x: square.pose.x, z: 20 }, 1, false)
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
    const nextAfter = runUntil(ctrl, () => ctrl.sleeper !== null, 2.5, () => (spin = Math.max(spin, waking.pose.spin)))
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
        spin = Math.max(spin, waking.pose.spin)
        if (ctrl.waking) last = drawn(waking.pose)
      },
    )
    expect(spin, 'peeled off like a page').toBeCloseTo(Math.PI, 2)
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
      expect(Math.hypot(friend.pose.x - home.x, friend.pose.y - home.y), `${friend.kind} at home`).toBeLessThan(3)
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

  it('putting the theatre away mid-drag sets the card down where it is and saves it', () => {
    const { ctrl, saves } = theatre()
    run(ctrl, 0.2)
    const square = ctrl.shapes[SQUARE]
    drag(ctrl, SQUARE, { x: square.pose.x, z: 25 }, 1, false)
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
    // Onto the empty lit screen beside the sleeper.
    expect(tapAlong({ x: -26, y: 86, z: 90 }, down)).toMatchObject({ surface: 'screen', x: -26, y: expect.closeTo(86 - (90 / 0.8) * 0.6, 6) })
    // Onto the left curtain: in front of it, not hidden behind it on the sky.
    expect(tapAlong({ x: -38, y: 86, z: 90 }, down)).toMatchObject({ surface: 'sky', z: PROSCENIUM.front })
    // Past the theatre into the night.
    expect(tapAlong({ x: 60, y: 150, z: 90 }, { x: 0, y: -0.3, z: -0.95 })).toMatchObject({ surface: 'sky', z: SKY_Z })
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
    expect(ctrl.demoPose.opacity, 'a touch clears the ghost').toBe(0)
    drag(ctrl, demo.index, demo.to)
    expect(ctrl.guidance.demo).toBeNull()
    run(ctrl, 1)
    expect(ctrl.coverage.fill).toBeGreaterThan(before)
    expect(ctrl.shapes.every((shape) => shape.glow === 0)).toBe(true)
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

  function searchCost(): number {
    const { ctrl } = theatre(fullSky(), true)
    run(ctrl, 0.5)
    const times: number[] = []
    for (let i = 0; i < 240 && !ctrl.demo; i++) {
      const t0 = performance.now()
      ctrl.step(FRAME)
      times.push(performance.now() - t0)
    }
    return times.reduce((a, b) => a + b, 0) / times.length
  }

  it('dragging a card under a full sky costs the controller under 0.5 ms per frame on average', () => {
    dragCost(60)
    const best = Math.min(...Array.from({ length: 5 }, () => dragCost(180)))
    console.log(`drag: best average ${best.toFixed(3)} ms`)
    expect(best).toBeLessThan(0.5)
  })

  it('the idle hint search stays within its slice of the frame', () => {
    searchCost()
    const best = Math.min(...Array.from({ length: 3 }, searchCost))
    console.log(`search: best average ${best.toFixed(3)} ms`)
    expect(best).toBeLessThan(1)
  })
})
