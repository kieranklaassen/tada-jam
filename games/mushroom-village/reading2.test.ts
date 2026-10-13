import { describe, expect, it } from 'vitest'
import { FULL, TAP_S, TIERS } from './config'
import { hand, lift } from './finger'
import { CART, GNOMES, LAMP, SEATS, SNAIL, SUN, handOn, inWater, onHat, pebbleMay, under, type GnomeId } from './ground'
import { ForgivingTouch, LIFT_GRACE_MS, type Point } from './input'
import { along, lengthOf, wayRound } from './paths'
import { freshSave } from './save'
import type { Beat } from './scene'
import { HOPS, MANNER_S, STRIDE, movingIn, overMoss, walkLasts } from './scenes'
import { FINGER, bodyBox, boxesMeet, capHit, doorBox, doorHit, doorOf, doorstepped, hatHit, inBox, shapeOf, stepAt, type Box } from './shapes'
import { fit } from './stage'
import { HAT_AT_ONCE, HAT_OFF, LOOSE_S, footAt } from './touch'
import { GladeView, ROPE_DOWN } from './view'
import { OUT, type Shown, type Village } from './village'
import { World } from './world'
import { BELL, FRAME, LOOSEN_S, ON_CART, PUFF, RED, carry, chestOf, doorOf as doorMiddle, fromLog, liftPath, hatOf, loaded, middle, pullUp, run, tap, village, type At } from './testkit'

// What the second fresh reading of this folder found, one named test for each
// finding: each fails on the game as that reader read it.

const NOBODY = { tall: null, sleepy: null, sneezy: null, baker: null } as const
const KINDS = ['red', 'bell', 'puff'] as const
const HOUSE = { red: RED, bell: BELL, puff: PUFF } as const
const SIZES = Array.from({ length: FULL }, (_, i) => i + 1)
const pebbleCount = (v: Village): number => v.toSave().paths.reduce((sum, path) => sum + path.length, 0)
const sounded = (v: Village): boolean => v.takeNotes().length > 0
/** Steps the village frame by frame and hands each frame to `each`. */
function frames(v: Village, seconds: number, each: () => void): void {
  for (let t = 0; t < seconds - 1e-9; t += FRAME) { v.step(FRAME); each() }
}
/** 48 px on a tablet of 1024 by 768, in stage units. */
const TABLET_48 = 48 / fit(1024, 768).scale

describe('1. a touch that starts on a hat is the hat\'s', () => {
  it('gives each gnome two touch shapes of his own, his hat above his body, each a finger each way', () => {
    for (const who of GNOMES) {
      const hat = hatOf(who), chest = chestOf(who)
      const w = new World(freshSave(6), 1)
      expect(w.hit(hat.x, hat.y)).toEqual({ what: 'gnome', who, hat: true })
      expect(w.hit(chest.x, chest.y)).toEqual({ what: 'gnome', who, hat: false })
      // The hat's shape, measured: across at its middle, and from its top to the brow.
      let across = 0, high = 0
      for (let x = hat.x - 200; x <= hat.x + 200; x += 1) { const hit = w.hit(x, hat.y); if (hit.what === 'gnome' && hit.who === who && hit.hat) across += 1 }
      for (let y = 0; y <= SEATS[who].y; y += 1) { const hit = w.hit(hat.x, y); if (hit.what === 'gnome' && hit.who === who && hit.hat) high += 1 }
      expect(across, `the ${who} gnome's hat across`).toBeGreaterThanOrEqual(TABLET_48)
      expect(high, `the ${who} gnome's hat high`).toBeGreaterThanOrEqual(TABLET_48)
    }
  })

  it.each(GNOMES)('never lays a pebble, starts a stroll or marks the pebbles as shown, however far the finger goes: the %s gnome', (who) => {
    const v = village({ shown: ['cart'] })
    const hat = hatOf(who)
    v.press(hat)
    // Up past where the hat comes off, and on across the glade.
    for (let up = 10; up <= 420; up += 10) v.drag({ x: hat.x + up * 0.4, y: hat.y - up })
    for (let across = 0; across <= 300; across += 20) v.drag({ x: hat.x + 168 + across, y: hat.y - 420 + across })
    v.lift()
    run(v, 1)
    expect(pebbleCount(v)).toBe(0)
    expect(v.toSave().shown).toEqual(['cart'])
    expect(v.sceneRunning).toBe(false)
    expect(v.show().gnomes[who].where).toBe('log')
    expect(v.count).toBe(0)
  })

  it('comes off with the pop where the finger lets go, and in the hand when it is pulled very far, and nothing else happens after', () => {
    const v = village()
    const hat = hatOf('baker')
    carry(v, hat, { x: hat.x, y: hat.y - HAT_OFF - 10 })
    expect(v.show().gnomes.baker.hatPull).toBeGreaterThanOrEqual(HAT_OFF)
    v.takeNotes()
    v.lift()
    expect(sounded(v)).toBe(true)
    run(v, 0.3)
    expect(v.show().gnomes.baker.hands).toBe(true)
    run(v, 3)

    // Pulled very far it pops in the hand, and the finger that goes on is still no path.
    v.press(hat)
    v.takeNotes()
    for (let up = 10; up < HAT_AT_ONCE; up += 10) v.drag({ x: hat.x, y: hat.y - up })
    v.takeNotes()
    v.drag({ x: hat.x, y: hat.y - HAT_AT_ONCE - 2 })
    expect(sounded(v)).toBe(true)
    expect(v.show().gnomes.baker.hatPull).toBe(0)
    for (let up = HAT_AT_ONCE; up <= 300; up += 10) v.drag({ x: hat.x, y: hat.y - up })
    v.lift()
    run(v, 0.3)
    expect(v.show().gnomes.baker.hands).toBe(true)
    expect(pebbleCount(v)).toBe(0)
  })

  it('can be made with a door just above his head: the finger that crosses the door is still on the hat', () => {
    // A lived-in house whose door and doorstep lie right over the baker's hat.
    const above = { id: 1, x: SEATS.baker.x, y: 470, size: 6, door: true }
    const v = village({ mushrooms: [above], homes: { ...NOBODY, sneezy: 1 } })
    const hat = hatOf('baker')
    const door = doorBox(v.show().mushrooms[0])
    expect(hat.y - HAT_OFF - 30).toBeLessThan(door.y1)
    carry(v, hat, { x: hat.x, y: hat.y - HAT_OFF - 30 }, 10)
    expect(v.show().gnomes.baker.hatPull).toBeGreaterThanOrEqual(HAT_OFF)
    v.lift()
    run(v, 0.3)
    expect(v.show().gnomes.baker.hands).toBe(true)
    expect(pebbleCount(v)).toBe(0)
    expect(v.sceneRunning).toBe(false)
    expect(v.toSave().homes).toEqual({ ...NOBODY, sneezy: 1 })
  })

  it.each([[0, -1], [0.6, -0.8], [1, 0.1], [-1, -0.2]])('starts a path from his body at any slope (%f, %f), his own hat included, and no hat comes off', (dx, dy) => {
    const v = village()
    const chest = chestOf('sneezy')
    carry(v, chest, { x: chest.x + dx * 240, y: chest.y + dy * 240 }, 24)
    expect(v.show().gnomes.sneezy.hatPull).toBe(0)
    expect(pebbleCount(v)).toBeGreaterThan(2)
    v.lift()
    run(v, 0.3)
    expect(v.show().gnomes.sneezy.hands).toBe(false)
  })
})

describe('2. a door\'s touch shape is the door, never the cap above it', () => {
  it('leaves the cap of every kind and size a finger each way, and gives the door a finger each way under it', () => {
    for (const kind of KINDS) for (const size of SIZES) {
      const cap = capHit(kind, size), door = doorHit(kind, size), painted = doorOf(kind, size)
      expect(cap.y1 - cap.y0, `${kind} ${size}: the cap high`).toBeGreaterThanOrEqual(FINGER)
      expect(cap.x1 - cap.x0, `${kind} ${size}: the cap across`).toBeGreaterThanOrEqual(FINGER)
      expect(door.y1 - door.y0, `${kind} ${size}: the door high`).toBeGreaterThanOrEqual(FINGER)
      expect(door.x1 - door.x0, `${kind} ${size}: the door across`).toBeGreaterThanOrEqual(FINGER)
      expect(FINGER).toBeGreaterThanOrEqual(TABLET_48)
      // The door's shape never starts above the painted door: what is above it is the cap's.
      expect(door.y0, `${kind} ${size}`).toBeGreaterThanOrEqual(painted.y0 - 4 - 1e-9)
      expect(cap.y1).toBe(door.y0)
    }
  })

  it('never lays a door\'s shape over a red cap, whatever the size', () => {
    for (const size of SIZES) expect(doorHit('red', size).y0).toBeGreaterThanOrEqual(-shapeOf('red', size).stemHeight - 4)
  })

  /** A small house with the sneezy gnome at home in it, and the middle of the mushroom as it is painted. */
  const small = (kind: (typeof KINDS)[number], size: number) => {
    const v = village({ mushrooms: [{ ...HOUSE[kind], size, door: true }], homes: { ...NOBODY, sneezy: HOUSE[kind].id } })
    const m = v.show().mushrooms[0], body = bodyBox(m)
    const cap: At = { x: (body.x0 + body.x1) / 2, y: m.y - shapeOf(kind, size).height * 0.6 }
    const step: At = { x: middle(doorBox(m)).x, y: m.y + 14 }
    return { v, m, cap, step }
  }

  it.each(KINDS.flatMap((kind) => [1, 2, 3].map((size) => [kind, size] as const)))('lets the cap win the tap on a small house: a %s of size %i is poked, and its door is reached by the doorstep', (kind, size) => {
    const { v, cap, step } = small(kind, size)
    v.takeNotes()
    tap(v, cap)
    // A poke: its own sound and move, and nobody comes out.
    expect(sounded(v)).toBe(true)
    expect(v.sceneRunning).toBe(false)
    let moved = 0
    frames(v, 0.9, () => { const now = v.show(); moved = Math.max(moved, Math.abs(now.mushrooms[0].swing), now.specks.length > 3 ? 1 : 0) })
    expect(moved).toBeGreaterThan(0.1)
    expect(v.show().gnomes.sneezy.where).toBe('home')
    run(v, 2)
    // The doorstep is the door: a tap there brings its gnome out.
    tap(v, step)
    expect(v.sceneRunning).toBe(true)
  })

  // A red house is never too small for both: its door is in its stem (reading 3, points 1 and 2, in reading3.test.ts).
  it.each((['bell', 'puff'] as const).flatMap((kind) => [1, 2, 3].map((size) => [kind, size] as const)))('stretches a small %s of size %i under a pull up, from its cap or from its doorstep, and never takes the door off', (kind, size) => {
    for (const from of ['cap', 'step'] as const) {
      const { v, cap, step } = small(kind, size)
      const at = from === 'cap' ? cap : step
      v.press(at)
      for (let up = 8; up <= OUT + 8; up += 8) v.drag({ x: at.x, y: at.y - up })
      const now = v.show()
      expect(now.mushrooms[0].pull, `from the ${from}`).toBeGreaterThan(20)
      expect(now.door, `from the ${from}`).toBeNull()
      expect(now.mushrooms[0].door).toBe(true)
      v.lift()
      run(v, 0.5)
      expect(v.toSave().mushrooms[0].door).toBe(true)
      expect(v.toSave().homes.sneezy).toBe(HOUSE[kind].id)
      expect(v.show().gnomes.sneezy.where).toBe('home')
    }
  })

  it('still takes such a door off sideways, and takes the door of a big house by any pull that starts on it', () => {
    const { v, step } = small('bell', 1)
    carry(v, step, { x: step.x + 120, y: step.y + 10 })
    expect(v.show().door).not.toBeNull()
    v.takeAway()
    for (const kind of KINDS) {
      const big = village({ mushrooms: [{ ...HOUSE[kind], size: FULL, door: true }] })
      expect(doorstepped(kind, FULL)).toBe(false)
      const door = doorMiddle(big, HOUSE[kind].id)
      carry(big, door, { x: door.x, y: door.y - 80 })
      expect(big.show().door, kind).not.toBeNull()
      expect(big.show().mushrooms[0].pull).toBe(0)
    }
  })
})

describe('3. an upward smear never removes a house', () => {
  it.each([0.05, 0.2, 0.4])('leaves the mushroom standing when a finger smears up %f s after it landed and lifts', (after) => {
    for (const m of [RED, BELL, PUFF]) {
      const v = village({ mushrooms: [{ ...m, door: true }], homes: { ...NOBODY, sneezy: m.id } })
      const cap = { x: m.x, y: m.y - 110 }
      v.press(cap)
      run(v, after)
      // 56 units and more, in two frames, and off the glass.
      v.drag({ x: cap.x + 4, y: cap.y - OUT - 4 }); v.step(FRAME)
      v.drag({ x: cap.x + 6, y: cap.y - OUT - 30 }); v.step(FRAME)
      expect(v.show().mushrooms[0].pull).toBeGreaterThan(OUT)
      v.lift()
      expect(v.count).toBe(1)
      run(v, 0.6)
      expect(v.show().mushrooms[0].pull).toBe(0)
      expect(v.toSave().homes.sneezy).toBe(m.id)
    }
  })

  it('shows a deliberate pull before it happens: past the tap\'s time the cap leans over with a sound, and only then does a lift take it out', () => {
    const v = village({ mushrooms: [RED] })
    const cap = { x: RED.x, y: RED.y - 100 }
    v.press(cap)
    v.drag({ x: cap.x, y: cap.y - OUT - 20 })
    run(v, TAP_S - 0.05)
    const before = Math.abs(v.show().mushrooms[0].swing)
    v.takeNotes()
    run(v, 0.07)
    // It has come loose, and says so.
    expect(sounded(v)).toBe(true)
    run(v, LOOSE_S)
    expect(Math.abs(v.show().mushrooms[0].swing)).toBeGreaterThan(before + 0.08)
    expect(v.count).toBe(1)
    v.lift()
    expect(v.count).toBe(0)
  })

  it('is undone by lifting early: a finger that lets go as the cap begins to lean leaves the mushroom in', () => {
    const v = village({ mushrooms: [RED] })
    const cap = { x: RED.x, y: RED.y - 100 }
    v.press(cap)
    v.drag({ x: cap.x, y: cap.y - OUT - 20 })
    run(v, TAP_S + LOOSE_S * 0.5)
    v.lift()
    expect(v.count).toBe(1)
    run(v, 0.6)
    expect(v.show().mushrooms[0].pull).toBe(0)
    expect(Math.abs(v.show().mushrooms[0].swing)).toBeLessThan(0.1)
  })

  it('leans for a tenth of a second or more before it can come out: a lift in the frame after it came loose leaves it in', () => {
    expect(LOOSE_S).toBeGreaterThanOrEqual(0.1)
    const v = village({ mushrooms: [RED] })
    const cap = { x: RED.x, y: RED.y - 100 }
    v.press(cap)
    v.drag({ x: cap.x, y: cap.y - OUT - 20 })
    run(v, TAP_S - 0.05)
    v.takeNotes()
    // Frame by frame until the creak of its coming loose, and one frame more.
    let waited = 0
    while (v.takeNotes().length === 0 && waited < 30) { v.step(FRAME); waited += 1 }
    expect(waited).toBeLessThan(30)
    v.step(FRAME)
    v.lift()
    expect(v.count).toBe(1)
  })

  it('is undone by bringing the cap back down: it sits tight again with a sound, and a lift leaves it in', () => {
    const v = village({ mushrooms: [RED] })
    const cap = { x: RED.x, y: RED.y - 100 }
    pullUp(v, cap, OUT + 20)
    v.takeNotes()
    v.drag({ x: cap.x, y: cap.y - 20 })
    expect(sounded(v)).toBe(true)
    run(v, 0.3)
    v.lift()
    expect(v.count).toBe(1)
  })

  it('never takes a mushroom out in the hand before it was seen to be loose, however far it is pulled', () => {
    const v = village({ mushrooms: [RED] })
    const cap = { x: RED.x, y: RED.y - 100 }
    v.press(cap)
    for (let up = 20; up <= 400; up += 20) { v.drag({ x: cap.x, y: cap.y - up }); v.step(FRAME) }
    expect(v.count).toBe(1)
    run(v, LOOSEN_S)
    v.drag({ x: cap.x, y: cap.y - 404 })
    expect(v.count).toBe(0)
  })
})

describe('4. a path survives a lifted finger', () => {
  /** A finger on the glass as the Mount hears it: the same two functions, with the stage fitted one to one. */
  function finger(v: Village) {
    const touch = new ForgivingTouch()
    const same = (at: Point): Point => at
    let t = 0
    return {
      touch,
      down: (at: At) => { t += 16; hand(v, touch.down(1, at, t), same) },
      move: (at: At) => { t += 16; hand(v, touch.move(1, at), same) },
      up: (at: At) => { t += 16; hand(v, lift(touch, v.drawing, 1, at, t), same) },
      wait: (ms: number) => { t += ms; hand(v, touch.advance(t), same); run(v, ms / 1000) },
    }
  }
  const draw = (f: ReturnType<typeof finger>, from: At, to: At, steps = 12): void => {
    for (let i = 1; i <= steps; i++) f.move({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps })
  }

  it('goes on with the same stroke when the finger comes back within the grace, and grows no mushroom where it lands', () => {
    const v = village()
    const f = finger(v), chest = chestOf('sneezy'), mid = { x: 520, y: 480 }, on = { x: 540, y: 470 }, end = { x: 620, y: 420 }
    f.down(chest)
    draw(f, chest, mid)
    const laid = pebbleCount(v)
    expect(laid).toBeGreaterThan(2)
    f.up(mid)
    // The stroke is still the finger's: nothing has ended.
    expect(v.drawing).toBe(true)
    expect(v.sceneRunning).toBe(false)
    f.wait(LIFT_GRACE_MS / 2)
    f.down(on)
    expect(v.count).toBe(0)
    draw(f, on, end, 6)
    expect(pebbleCount(v)).toBeGreaterThan(laid + 2)
    expect(v.toSave().paths.length).toBe(1)
    f.up(end)
    f.wait(LIFT_GRACE_MS + 50)
    // Let go for good, it ends as any stroke from a gnome does: he sets off along it.
    expect(v.drawing).toBe(false)
    expect(v.sceneRunning).toBe(true)
    expect(v.count).toBe(0)
  })

  it('ends where it was let go when the finger stays away, with every pebble kept', () => {
    const v = village()
    const f = finger(v), from = { x: 800, y: 600 }, to = { x: 960, y: 600 }
    f.down(from)
    draw(f, from, to)
    const laid = pebbleCount(v)
    expect(laid).toBeGreaterThan(4)
    f.up(to)
    expect(v.drawing).toBe(true)
    f.wait(LIFT_GRACE_MS + 50)
    expect(v.drawing).toBe(false)
    expect(v.count).toBe(0)
    expect(pebbleCount(v)).toBe(laid)
    expect(loaded(v).toSave().paths).toEqual(v.toSave().paths)
  })

  it('ends any other touch at the lift, as before: a mushroom stops swelling the moment the finger is off it', () => {
    const v = village()
    const f = finger(v), at = { x: RED.x, y: RED.y }
    f.down(at)
    run(v, 0.6)
    const size = v.toSave().mushrooms[0].size
    f.up(at)
    run(v, 0.5)
    expect(v.toSave().mushrooms[0].size).toBe(size)
  })

  it.each([[0, -1], [1, 0], [-0.7, -0.7], [0, 1]])('goes on from its last pebble under a new press there, whichever way the finger goes (%f, %f)', (dx, dy) => {
    const path = [0, 1, 2, 3].map((i) => ({ x: 860 + i * 20, y: 600 }))
    const v = village({ paths: [path] })
    const last = path[path.length - 1]
    carry(v, last, { x: last.x + dx * 80, y: last.y + dy * 80 }, 8)
    v.lift()
    const paths = v.toSave().paths
    expect(paths.length).toBe(1)
    expect(paths[0].length).toBeGreaterThan(path.length + 2)
    expect(paths[0].slice(0, path.length)).toEqual(path)
    expect(v.count).toBe(0)
    // Nothing was lifted or rolled away.
    expect(v.show().props.some((prop) => prop.what === 'rolling')).toBe(false)
  })

  it('still lifts the path by any other pebble that is pulled up', () => {
    const path = [0, 1, 2, 3].map((i) => ({ x: 860 + i * 20, y: 600 }))
    const v = village({ paths: [path] })
    liftPath(v, path[1], OUT + 30)
    v.lift()
    expect(v.toSave().paths).toEqual([])
  })
})

// ---------------------------------------------------------------- what is painted

type Stamp = { source: unknown; at: readonly number[] }
type Seen = { fills: string[]; lines: string[]; stamps: Stamp[]; drawn: Point[][] }

/** A canvas whose context accepts any call and does nothing. */
function standIn(width: number, height: number): HTMLCanvasElement {
  const context: Record<string | symbol, unknown> = {}
  const proxy = new Proxy(context, {
    get: (target, key) => (key in target ? target[key] : key === 'createPattern' ? () => null : () => undefined),
    set: (target, key, value) => { target[key] = value; return true },
  })
  return { width, height, getContext: () => proxy } as unknown as HTMLCanvasElement
}

/** A view that draws into a context which writes down every paint it fills or strokes with, every sprite it stamps and where, and every line it draws. */
function watching() {
  let seen: Seen = { fills: [], lines: [], stamps: [], drawn: [] }
  let at: readonly number[] = [1, 0, 0, 1, 0, 0], path: Point[] = []
  const context: Record<string | symbol, unknown> = {
    setTransform: (...m: number[]) => { at = m },
    beginPath: () => { path = [] },
    moveTo: (x: number, y: number) => { path.push({ x, y }) },
    lineTo: (x: number, y: number) => { path.push({ x, y }) },
    fill: () => { seen.fills.push(String(context.fillStyle)) },
    stroke: () => { seen.lines.push(String(context.strokeStyle)); seen.drawn.push(path) },
    drawImage: (source: unknown) => { seen.stamps.push({ source, at }) },
  }
  const proxy = new Proxy(context, {
    get: (target, key) => (key in target ? target[key] : key === 'createPattern' ? () => null : () => undefined),
    set: (target, key, value) => { target[key] = value; return true },
  })
  const made = new GladeView({ width: 2360, height: 1640, getContext: () => proxy } as unknown as HTMLCanvasElement, standIn)
  made.resize(1180, 820, 2)
  made.setTier(TIERS[0])
  return {
    /** Draws a frame and says what it was painted with. */
    frame: (shown: Shown): Seen & { counts: { stamps: number; strokes: number } } => {
      seen = { fills: [], lines: [], stamps: [], drawn: [] }
      const counts = made.draw(shown, null)
      return { ...seen, counts: { ...counts } }
    },
  }
}

const paints = (seen: Seen): Set<string> => new Set([...seen.fills, ...seen.lines].filter((paint) => paint.startsWith('#') || paint.startsWith('rgb')))
const sprites = (seen: Seen): Set<unknown> => new Set(seen.stamps.map((stamp) => stamp.source))

describe('5. the night paints everything', () => {
  const day = (shown: Shown): Shown => ({ ...shown, dark: 0 })
  const night = (shown: Shown): Shown => ({ ...shown, dark: 1 })

  /**
   * What one thing is painted with by day: the paints and sprites of a frame with it that a frame without it
   * has not. None of them may be in the night's frame.
   */
  function dayPaintOf(shown: Shown, without: Shown): { paints: string[]; sprites: unknown[]; atNight: Seen } {
    const view = watching()
    const withIt = view.frame(day(shown)), bare = view.frame(day(without)), atNight = view.frame(night(shown))
    return {
      paints: [...paints(withIt)].filter((paint) => !paints(bare).has(paint)),
      sprites: [...sprites(withIt)].filter((sprite) => !sprites(bare).has(sprite)),
      atNight,
    }
  }
  function holdsAtNight(name: string, shown: Shown, without: Shown): void {
    const its = dayPaintOf(shown, without)
    // It is drawn at all, with something of its own.
    expect(its.paints.length + its.sprites.length, `${name} is drawn`).toBeGreaterThan(0)
    for (const paint of its.paints) expect(paints(its.atNight).has(paint), `${name}: the day's ${paint} at night`).toBe(false)
    for (const sprite of its.sprites) expect(sprites(its.atNight).has(sprite), `${name}: a day sprite at night`).toBe(false)
  }

  it('paints the frog and the water drawn up in the night\'s paint', () => {
    const v = village()
    v.press({ x: 806, y: 742 })
    run(v, 0.9)
    const frog = v.show()
    expect(frog.frog).not.toBeNull()
    holdsAtNight('the frog', frog, { ...frog, frog: null })
    v.drag({ x: 806, y: 620 })
    run(v, 0.1)
    const column = v.show()
    expect(column.column).not.toBeNull()
    holdsAtNight('the column of water', column, { ...column, column: null })
  })

  it('paints a door in the hand, a door flying from the cart, the gate, the raft and a door a gnome knocks on in the night\'s paint', () => {
    const v = village({ mushrooms: [RED], paths: [[860, 880, 900, 920].map((x) => ({ x, y: 620 }))] })
    carry(v, ON_CART, { x: 700, y: 300 })
    const inHand = v.show()
    expect(inHand.door).not.toBeNull()
    holdsAtNight('the carried door', inHand, { ...inHand, door: null })
    v.takeAway()
    const prop = (what: string, to: At): void => {
      const each = village({ mushrooms: [RED], paths: [[860, 880, 900, 920].map((x) => ({ x, y: 620 }))] })
      if (what === 'flight') tap(each, ON_CART)
      else { carry(each, ON_CART, to); each.lift() }
      run(each, 0.1)
      const shown = each.show()
      expect(shown.props.some((p) => p.what === what), what).toBe(true)
      holdsAtNight(`the ${what}`, shown, { ...shown, props: shown.props.filter((p) => p.what !== what) })
    }
    prop('flight', RED)
    prop('gate', { x: 900, y: 620 })
    prop('raft', { x: 806, y: 742 })
    prop('knocked', chestOf('sleepy'))
  })

  it('paints a sneezed hat in the night\'s paint', () => {
    const v = village({ mushrooms: [{ ...PUFF, door: true }], homes: { ...NOBODY, sneezy: 3 } })
    tap(v, { x: PUFF.x, y: PUFF.y - 90 })
    let shown: Shown | null = null
    frames(v, 3, () => { const now = v.show(); if (!shown && now.props.some((p) => p.what === 'hatOut' && p.since > 0.1)) shown = now })
    expect(shown).not.toBeNull()
    holdsAtNight('the sneezed hat', shown!, { ...shown!, props: [] })
  })

  it('paints what is in the air in the night\'s paint: spores, flour, smoke', () => {
    const v = village({ mushrooms: [PUFF, { ...RED, door: true }], night: true })
    tap(v, { x: PUFF.x, y: PUFF.y - 60 })
    tap(v, chestOf('baker'))
    // A frame for each kind of speck that comes into the air: the spores, the flour, a puff of smoke.
    const seen = new Map<string, Shown>()
    frames(v, 6, () => {
      const now = v.show()
      for (const speck of now.specks) if (!seen.has(speck.what)) seen.set(speck.what, now)
    })
    expect([...seen.keys()]).toEqual(expect.arrayContaining(['spore', 'flour', 'smoke']))
    // The pots the specks are painted from by day. Spores and flour share theirs with other white things, so the night's frame is searched for the pots themselves.
    const POTS = ['#fff6e4', '#bfe2ff', '#3c8746', '#efe6ee', '#7a6238']
    const view = watching()
    for (const [kind, shown] of seen) {
      const only = { ...shown, specks: shown.specks.filter((speck) => speck.what === kind) }
      const byDay = view.frame(day(only)), byNight = view.frame(night(only)), bare = view.frame(night({ ...only, specks: [] }))
      expect(POTS.some((pot) => byDay.fills.includes(pot)), `the ${kind} by day`).toBe(true)
      // It is drawn at night, in one fill, and in none of the day's pots.
      expect(byNight.fills.length - bare.fills.length, `the ${kind}`).toBe(1)
      for (const pot of POTS) expect(paints(byNight).has(pot), `the ${kind}: the day's ${pot} at night`).toBe(false)
    }
  })

  it('leaves nothing of the bare glade in a day paint: the snail\'s eyes, the gnomes, the pebbles and the mushrooms', () => {
    const v = village({ mushrooms: [RED, BELL, { ...PUFF, door: true }], paths: [fromLog(stepAt(RED))], homes: { ...NOBODY, tall: 3 }, hatOff: true })
    run(v, 0.2)
    const shown = v.show(), view = watching()
    const byDay = view.frame(day(shown)), byNight = view.frame(night(shown))
    // The eye whites of the snail were in the day's paint.
    expect(paints(byDay).has('#fffdf6')).toBe(true)
    // The ink of a pupil, a brow and a mouth is as dark by night as by day, and that is all the two frames share.
    const INK = new Set(['#2b2440', '#1d4a2a'])
    const shared = [...paints(byDay)].filter((paint) => paints(byNight).has(paint) && !INK.has(paint))
    expect(shared).toEqual([])
    // The sun is a light: its rays and its face are in their own paint wherever it stands. No other sprite of the day is stamped by night.
    const sun = new Set(byDay.stamps.filter((stamp) => Math.abs(stamp.at[4] / 2 - SUN.x) < 1 && stamp.at[5] / 2 < 300).map((stamp) => stamp.source))
    expect(sun.size).toBe(2)
    expect(byDay.stamps.length).toBeGreaterThan(20)
    expect([...sprites(byDay)].filter((sprite) => sprites(byNight).has(sprite) && !sun.has(sprite))).toEqual([])
  })
})

describe('6. the snail\'s lamp', () => {
  const box: Box = { x0: LAMP.x - LAMP.left, y0: LAMP.y - LAMP.up, x1: LAMP.x + LAMP.right, y1: LAMP.y }

  it('stands in a box of its own, below the cart and clear of it, wheels and all', () => {
    // The cart as it is painted: its wheels reach a little below and beside the box it is touched in.
    const cart: Box = { x0: CART.left - 16, y0: CART.top - 10, x1: CART.right + 16, y1: CART.bottom + 30 }
    expect(boxesMeet(box, cart)).toBe(false)
    expect(box.y0).toBeGreaterThan(CART.bottom + 30)
    expect(box.x1).toBeLessThanOrEqual(1180)
    expect(box.y1).toBeLessThanOrEqual(820)
  })

  it('is stamped there by the view, and nowhere on the cart', () => {
    const v = village({ mushrooms: [RED], night: true })
    run(v, 0.2)
    const shown = v.show(), view = watching()
    expect(shown.snail.lamp).toBe(true)
    expect(shown.cart).not.toBeNull()
    const lit = view.frame(shown), unlit = view.frame({ ...shown, snail: { ...shown.snail, lamp: false } })
    const lamps = lit.stamps.filter((stamp) => !sprites(unlit).has(stamp.source))
    expect(lamps.length).toBe(1)
    // Where its foot is put, in stage units: the view draws at two device pixels to the unit.
    const [, , , , e, f] = lamps[0].at
    expect(e / 2).toBeCloseTo(shown.snail.x + shown.snail.facing * (LAMP.x - SNAIL.x), 3)
    expect(f / 2).toBeCloseTo(LAMP.y, 3)
    expect(f / 2 - LAMP.up).toBeGreaterThan(CART.bottom + 30)
  })
})

describe('7. a hat on a doorstep', () => {
  it('is touched in a shape of 48 px each way on a small tablet, wherever the low house stands', () => {
    for (const m of [{ ...RED, size: 1 }, { ...RED, size: 3 }, { ...BELL, size: 2 }, { ...PUFF, size: 3 }, { id: 9, x: 200, y: 400, size: 1, door: true }]) {
      const w = new World({ ...freshSave(6), mushrooms: [{ ...m, door: true }], homes: { ...NOBODY, tall: m.id }, hatOff: true }, 1)
      const house = w.mushrooms[0], shape = hatHit(house)
      expect((shape.x1 - shape.x0) / TABLET_48).toBeGreaterThanOrEqual(1)
      expect((shape.y1 - shape.y0) / TABLET_48, `the hat by the house at ${m.x}`).toBeGreaterThanOrEqual(1)
      // Its upper part is the hat's too, where a finger aimed at so low a thing lands.
      const top = { x: (shape.x0 + shape.x1) / 2, y: shape.y0 + 4 }
      expect(w.hit(top.x, top.y).what, `the hat by the house at ${m.x}`).toBe('hat')
    }
  })
})

describe('8. a gnome walking back to the log is touched as himself', () => {
  /** The sneezy gnome on his way back from a house that was pulled up. */
  const walkingBack = (): Village => {
    const v = village({ mushrooms: [{ ...RED, door: true }], homes: { ...NOBODY, sneezy: 1 } })
    pullUp(v, { x: RED.x, y: RED.y - 110 }, OUT + 30)
    v.lift()
    run(v, 1.2)
    expect(v.show().gnomes.sneezy.where).toBe('out')
    expect(v.count).toBe(0)
    return v
  }

  it('is in a shape of his own, a finger each way, where he walks', () => {
    const v = walkingBack(), g = v.show().gnomes.sneezy
    const w = new World({ ...freshSave(6), mushrooms: [{ ...RED, door: true }], homes: { ...NOBODY, sneezy: 1 } }, 1)
    w.walkBack('sneezy', { x: g.x, y: g.y })
    const box = w.walkerBox('sneezy')
    expect(box.x1 - box.x0).toBeGreaterThanOrEqual(FINGER)
    expect(box.y1 - box.y0).toBeGreaterThanOrEqual(FINGER)
    expect(w.hit(g.x, g.y - 40)).toEqual({ what: 'walker', who: 'sneezy' })
  })

  it('grows no mushroom under the finger that lands on him: he squashes, stands still, and walks on when it lifts', () => {
    const v = walkingBack(), g = v.show().gnomes.sneezy
    v.takeNotes()
    v.press({ x: g.x, y: g.y - 40 })
    expect(sounded(v)).toBe(true)
    expect(v.count).toBe(0)
    run(v, 0.3)
    const held = v.show().gnomes.sneezy
    expect({ x: held.x, y: held.y }).toEqual({ x: g.x, y: g.y })
    v.takeNotes()
    v.lift()
    // His own poke, as on the log.
    expect(sounded(v)).toBe(true)
    expect(v.count).toBe(0)
    run(v, 0.5)
    const on = v.show().gnomes.sneezy
    expect(Math.hypot(on.x - g.x, on.y - g.y)).toBeGreaterThan(10)
    run(v, 12)
    expect(v.show().gnomes.sneezy.where).toBe('log')
  })

  it('grumbles under a finger that stays, as he does on the log', () => {
    const v = walkingBack(), g = v.show().gnomes.sneezy
    v.press({ x: g.x, y: g.y - 40 })
    run(v, TAP_S - 0.05)
    v.takeNotes()
    run(v, 0.1)
    expect(sounded(v)).toBe(true)
    expect(v.show().gnomes.sneezy.press).toBeGreaterThan(0.2)
    v.lift()
    expect(v.count).toBe(0)
  })
})

describe('9. each gnome walks at his own pace', () => {
  const ORDER: readonly GnomeId[] = ['baker', 'sneezy', 'tall', 'sleepy']

  it('takes four different times over any way, short or long, in the order of their manners', () => {
    expect(ORDER.map((who) => MANNER_S[who])).toEqual([...ORDER.map((who) => MANNER_S[who])].sort((a, b) => a - b))
    for (const bounds of [[0.8, 3.4], [2, 5], [1.2, 5]] as const) for (const total of [20, 120, 400, 900, 2000, 6000]) {
      const times = ORDER.map((who) => walkLasts(who, total, bounds[0], bounds[1]))
      for (let i = 1; i < times.length; i++) expect(times[i], `${ORDER[i]} over ${total}`).toBeGreaterThan(times[i - 1] + 0.1)
    }
  })

  it('shows it on the way to a house: over the same long path, no two gnomes are as long on the pebbles', () => {
    const way = fromLog(stepAt(RED))
    const walked = (who: GnomeId): number => {
      const w = new World({ ...freshSave(6), mushrooms: [{ ...RED, size: FULL, door: true }], paths: [way], shown: ['cart', 'pebbles'] }, 1)
      const beats = movingIn(w, who, w.mushrooms[0], way, 0)
      // His walk is the longest move of the scene.
      return Math.max(...beats.map((beat) => beat.lasts))
    }
    const times = ORDER.map(walked)
    for (let i = 1; i < times.length; i++) expect(times[i], ORDER[i]).toBeGreaterThan(times[i - 1] + 0.3)
  })
})

describe('10. a gnome who is sent crosses what no pebble covers in his own way, seen and heard', () => {
  /** Plays a list of beats through, frame by frame, and hands each frame to `each`. */
  function play(beats: readonly Beat[], each: (t: number) => void): void {
    const end = Math.max(...beats.map((beat) => beat.at + beat.lasts))
    const done = new Set<Beat>()
    for (let t = 0; t <= end + FRAME; t += FRAME) {
      for (const beat of beats) {
        if (t < beat.at || done.has(beat)) continue
        const progress = beat.lasts > 0 ? Math.min(1, (t - beat.at) / beat.lasts) : 1
        beat.play(progress, false)
        if (progress >= 1) done.add(beat)
      }
      each(t)
    }
  }
  /** A way over the moss that crosses the stream. */
  const ACROSS: Point[] = [{ x: 560, y: 540 }, { x: 900, y: 540 }]

  it('lies across water, so the crossing is a real one', () => {
    let wet = 0
    for (let p = 0; p <= 1; p += 0.01) { const at = along(ACROSS, p); if (inWater(at.x, at.y)) wet += 1 }
    expect(wet).toBeGreaterThan(5)
    expect(wet).toBeLessThan(80)
  })

  it.each(GNOMES)('moves the %s gnome step by step with a sound at every stride, and never in a jump', (who) => {
    const w = new World(freshSave(6), 1), beats: Beat[] = []
    const g = w.gnomes[who]
    g.at = { ...ACROSS[0] }
    const arrives = overMoss(w, beats, who, ACROSS, 0)
    const total = lengthOf(ACROSS)
    // A sound for every stride of his own length, or a hop.
    const cues = beats.filter((beat) => beat.lasts === 0)
    expect(cues.length).toBeGreaterThanOrEqual(Math.floor(total / STRIDE[who]) - (HOPS[who] ? 3 : 0))
    let last = { ...g.at }, heard = 0, lifted = 0, waded = 0
    play(beats, () => {
      expect(Math.hypot(g.at.x - last.x, g.at.y - last.y), `the ${who} gnome in one frame`).toBeLessThan(14)
      const line = along(ACROSS, Math.min(1, Math.max(0, (g.at.x - ACROSS[0].x) / (ACROSS[1].x - ACROSS[0].x))))
      lifted = Math.max(lifted, line.y - g.at.y)
      if (inWater(g.at.x, g.at.y) && line.y - g.at.y < 1) waded += 1
      last = { ...g.at }
      heard += w.sceneNotes.length + w.notes.length
      w.sceneNotes = []
      w.notes = []
    })
    expect(heard).toBeGreaterThan(cues.length)
    expect(g.at).toEqual(ACROSS[1])
    expect(arrives).toBeGreaterThan(1)
    // In his own way: two of them wade, feet in the water, and two hop it.
    if (HOPS[who]) expect(lifted).toBeGreaterThan(25)
    else { expect(lifted).toBeLessThan(1); expect(waded).toBeGreaterThan(10) }
  })

  it('gives each of the four his own stride, and two ways over the water', () => {
    expect(new Set(GNOMES.map((who) => STRIDE[who])).size).toBe(4)
    expect(GNOMES.filter((who) => HOPS[who]).length).toBe(2)
  })

  it('takes the pebbles there are first: a sent gnome walks the part of a path that brings him nearer, then the moss', () => {
    // Pebbles from the log halfway up, a house beyond them, and the sleepy one sleepwalking to it.
    const part = fromLog({ x: 800, y: 540 })
    const v = village({ mushrooms: [RED], paths: [part] })
    tap(v, ON_CART)
    run(v, 2.5)
    expect(v.toSave().homes.sleepy).toBe(1)
    tap(v, chestOf('baker'))
    expect(v.toSave().homes).toEqual({ ...NOBODY, baker: 1 })
    const end = part[part.length - 1]
    const step = stepAt(RED), moss = Math.hypot(step.x - end.x, step.y - end.y)
    let last = v.show().gnomes.baker, onPebbles = 0, reachedEnd = false, sounds = 0, out = 0
    frames(v, 14, () => {
      const g = v.show().gnomes.baker, fired = v.takeFired()
      if (g.where === 'out' && last.where === 'out') {
        out += 1
        expect(Math.hypot(g.x - last.x, g.y - last.y)).toBeLessThan(16)
        if (part.some((p) => Math.hypot(p.x - g.x, p.y - g.y) < 6)) onPebbles += 1
        if (Math.hypot(end.x - g.x, end.y - g.y) < 6) reachedEnd = true
        // Past the last pebble and short of the doorstep: what sounds there is his steps on the moss, his hops and his splashes.
        if (reachedEnd && Math.hypot(end.x - g.x, end.y - g.y) > 12 && Math.hypot(step.x - g.x, step.y - g.y) > 12) sounds += fired.filter((beat) => beat.sound).length
      }
      last = g
    })
    expect(onPebbles).toBeGreaterThan(10)
    expect(reachedEnd).toBe(true)
    // He is heard at about every stride of his own over the moss that is left.
    expect(moss).toBeGreaterThan(150)
    expect(sounds).toBeGreaterThanOrEqual(Math.floor(moss / STRIDE.baker) - 3)
    expect(out).toBeGreaterThan(120)
    expect(v.show().gnomes.baker.where).toBe('home')
  })
})

describe('11. what a path leaves at a red mushroom, and a bell\'s rope, are drawn', () => {
  const to = fromLog(stepAt(RED))

  it('shows the last pebble as a step under a door, a pile against the stem with no door, and nothing with no path', () => {
    expect(village({ mushrooms: [{ ...RED, door: true }], paths: [to], homes: { ...NOBODY, sneezy: 1 } }).show().mushrooms[0].stone).toBe('step')
    expect(village({ mushrooms: [RED], paths: [to] }).show().mushrooms[0].stone).toBe('pile')
    expect(village({ mushrooms: [RED] }).show().mushrooms[0].stone).toBeNull()
    expect(village({ mushrooms: [RED], paths: [to.slice(0, 3)] }).show().mushrooms[0].stone).toBeNull()
    // The other kinds take a path in their own way, with nothing left at the foot.
    expect(village({ mushrooms: [BELL], paths: [fromLog(stepAt(BELL))] }).show().mushrooms[0].stone).toBeNull()
  })

  it('appears as the path arrives: drawn onto a red mushroom, the pebbles pile up at its stem', () => {
    const v = village({ mushrooms: [RED] })
    expect(v.show().mushrooms[0].stone).toBeNull()
    const step = stepAt(RED)
    carry(v, { x: step.x - 200, y: step.y + 60 }, step, 14)
    v.lift()
    expect(v.show().mushrooms[0].stone).toBe('pile')
  })

  it('paints them: a frame with a step or a pile has stone in it that the same frame without has not', () => {
    for (const door of [true, false]) {
      const v = village({ mushrooms: [{ ...RED, door }], paths: [to.slice(0, 2), to], homes: door ? { ...NOBODY, sneezy: 1 } : NOBODY })
      run(v, 0.2)
      const shown = v.show(), view = watching()
      const withIt = view.frame(shown), bare = view.frame({ ...shown, mushrooms: shown.mushrooms.map((m) => ({ ...m, stone: null })) })
      // A shadow, the stone and its light: three fills for all of them.
      expect(withIt.counts.strokes - bare.counts.strokes, door ? 'a step' : 'a pile').toBe(3)
      expect(withIt.fills.length - bare.fills.length).toBe(3)
    }
  })

  it('lets the rope down as the door goes in: it is drawn longer frame by frame until it is all out', () => {
    const v = village({ mushrooms: [BELL] })
    const view = watching()
    tap(v, ON_CART)
    let lengths: number[] = [], whole = false, built = 0
    frames(v, 3, () => {
      const shown = v.show(), m = shown.mushrooms[0]
      if (!m.door) return
      built = m.built
      const without = view.frame({ ...shown, mushrooms: [{ ...m, built: 1 }] }), now = view.frame(shown)
      // The rope as a line of its own, drawn live: what this frame strokes that the finished house does not.
      const live = now.drawn.length - without.drawn.length
      if (m.built > 0.02 && m.built < ROPE_DOWN) {
        expect(live, `at ${m.built.toFixed(2)}`).toBe(1)
        const rope = now.drawn.find((line) => !without.drawn.some((other) => other.length === line.length && other[0]?.x === line[0]?.x && other[0]?.y === line[0]?.y))!
        lengths.push(rope[rope.length - 1].y - rope[0].y)
      } else if (m.built >= ROPE_DOWN) { whole = true; expect(live).toBe(0) }
    })
    expect(built).toBeGreaterThan(0.9)
    expect(whole).toBe(true)
    // Seen over a good many frames, and longer at the end than at the start.
    expect(lengths.length).toBeGreaterThan(8)
    expect(lengths[lengths.length - 1]).toBeGreaterThan(lengths[0] * 2)
    for (let i = 1; i < lengths.length; i++) expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1] - 1.5)
  })
})

describe('13. a path through another mushroom\'s foot goes round it', () => {
  const pebbleFree = (v: World) => (q: Point): boolean => pebbleMay(q.x, q.y) && !footAt(v, q)

  it('finds a way round a foot on the grid, step by step, with no pebble under it', () => {
    const w = new World({ ...freshSave(6), mushrooms: [{ id: 1, x: 900, y: 500, size: 6, door: false }] }, 1)
    const from = { x: 840, y: 500 }, to = { x: 960, y: 500 }
    const round = wayRound(from, to, pebbleFree(w))
    expect(round.length).toBeGreaterThan(3)
    const way = [from, ...round, to]
    for (let i = 1; i < way.length; i++) {
      expect(Math.hypot(way[i].x - way[i - 1].x, way[i].y - way[i - 1].y)).toBeLessThanOrEqual(20 * Math.SQRT2 + 1e-9)
      expect(footAt(w, way[i])).toBeUndefined()
    }
  })

  it.each([[RED, 0], [BELL, 0], [PUFF, 0], [RED, 20]])('lays a whole path when a finger is drawn straight through a foot: the %o', (m, dy) => {
    const v = village({ mushrooms: [m] })
    const from = { x: m.x - 120, y: m.y + dy }, to = { x: m.x + 120, y: m.y + dy }
    v.takeFired()
    carry(v, from, to, 32)
    // The mushroom the finger went through answers in its own way, as it does to a path that reaches it.
    expect(v.takeFired().some((fired) => fired.what.includes('mushroom') && fired.sound)).toBe(true)
    v.lift()
    const paths = v.toSave().paths
    expect(paths.length).toBe(1)
    const path = paths[0], w = new World({ ...freshSave(6), mushrooms: [m] }, 1)
    expect(w.mushrooms.length).toBe(1)
    expect(path[0].x).toBeLessThan(m.x - 80)
    expect(path[path.length - 1].x).toBeGreaterThan(m.x + 80)
    // No gap: every pebble lies next to the one before it, and none under the foot.
    for (let i = 1; i < path.length; i++) expect(Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y), `pebble ${i}`).toBeLessThanOrEqual(20 * Math.SQRT2 + 1e-9)
    for (const p of path) expect(footAt(w, p)).toBeUndefined()
  })

  it('walks a gnome along it: the path round a foot is one way from the log to the door, and he never steps through the foot', () => {
    const blocker = { id: 2, x: 760, y: 520, size: 6, door: false }
    // The sleepy one, who would come over the moss with no path, lives elsewhere already.
    const v = village({ mushrooms: [{ ...RED, door: true }, blocker, { ...PUFF, door: true }], homes: { ...NOBODY, sleepy: 3 } })
    // From the baker, along the moss, straight through the blocker's foot, and on to the red house's doorstep.
    const step = stepAt(RED), chest = chestOf('baker')
    v.press(chest)
    let at: At = chest
    for (const to of [{ x: 606, y: 520 }, { x: 680, y: 520 }, { x: 840, y: 520 }, { x: 940, y: 520 }, step]) {
      for (let i = 1; i <= 8; i++) v.drag({ x: at.x + ((to.x - at.x) * i) / 8, y: at.y + ((to.y - at.y) * i) / 8 })
      at = to
    }
    v.lift()
    // The pebbles join the log to the door, so somebody who walks pebbles has moved in: not the sleepy one, who needs none.
    const who = GNOMES.find((g) => v.toSave().homes[g] === 1)
    expect(who).toBeDefined()
    expect(who).not.toBe('sleepy')
    let through = 0, out = 0
    frames(v, 14, () => {
      const g = v.show().gnomes[who!]
      if (g.where !== 'out' || g.scale > 0.7) return
      out += 1
      // The stem, where it stands in the moss.
      if (Math.abs(g.x - blocker.x) < 20 && Math.abs(g.y - blocker.y) < 8) through += 1
    })
    expect(out).toBeGreaterThan(60)
    expect(through).toBe(0)
    expect(v.show().gnomes[who!].where).toBe('home')
  })
})

describe('the gap in 7: a tap on another gnome during the snail\'s pebble showing', () => {
  it('ends the showing, lays its pebbles, and still sends him: he is the one who moves in', () => {
    const v = village({ mushrooms: [RED], shown: ['cart'] })
    tap(v, ON_CART)
    // The snail is flicking, and the first mover has not yet set off.
    run(v, 0.8)
    expect(v.sceneRunning).toBe(true)
    expect(v.show().props.some((prop) => prop.what === 'toss')).toBe(true)
    const first = (Object.entries(v.toSave().homes).find(([, home]) => home === 1) ?? [null])[0] as GnomeId | null
    expect(first).not.toBeNull()
    const other = GNOMES.find((who) => who !== first)!
    v.takeChange()
    tap(v, chestOf(other))
    // The showing is over: nothing in the air, the three pebbles lie.
    expect(v.show().props.some((prop) => prop.what === 'toss')).toBe(false)
    expect(v.show().pebbles.length).toBe(3)
    // And the tap did what a tap on him does while another is on his way: he goes instead.
    expect(v.toSave().homes).toEqual({ ...NOBODY, [other]: 1 })
    expect(v.takeChange()).toBe('now')
    expect(v.sceneRunning).toBe(true)
    expect(loaded(v).toSave()).toEqual(v.toSave())
    run(v, 14)
    expect(v.show().gnomes[other].where).toBe('home')
    expect(v.show().gnomes[first!].where).toBe('log')
  })

  it('is only his poke once nobody is on his way', () => {
    const v = village({ mushrooms: [RED], shown: ['cart'] })
    tap(v, ON_CART)
    run(v, 20)
    const homes = v.toSave().homes
    const other = GNOMES.find((who) => homes[who] === null)!
    tap(v, chestOf(other))
    expect(v.toSave().homes).toEqual(homes)
  })
})

describe('the shapes that tell the gestures apart, on the stage', () => {
  it('never lays a doorstep over the cart: the door of a small house above it ends where the cart begins', () => {
    const cart: Box = { x0: CART.left, y0: CART.top, x1: CART.right, y1: CART.bottom }
    for (const x of [1010, 1050, 1094, 1140]) for (const size of [1, 2, 3]) {
      const m = { x, y: 540, kind: 'red' as const, size, flip: false }
      const door = doorBox(m)
      expect(boxesMeet(door, cart)).toBe(false)
      expect(door.x1 - door.x0).toBeGreaterThanOrEqual(FINGER)
      // What it loses under the cart it is given above, as far as the cap keeps a finger of its own.
      expect(door.y1 - door.y0).toBeGreaterThanOrEqual(FINGER - 10)
      expect(inBox(door, x, 540)).toBe(true)
    }
  })

  it('tells a gnome\'s body from his hat: the idle hand\'s path move starts on his body', () => {
    for (const who of GNOMES) {
      expect(under(handOn(who).x, handOn(who).y)).toEqual({ what: 'gnome', who })
      expect(onHat(who, handOn(who).x, handOn(who).y)).toBe(false)
    }
  })
})
