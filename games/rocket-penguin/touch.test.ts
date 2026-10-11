import { describe, expect, it } from 'vitest'
import { TOP_SPEED } from './flight'
import { ForgivingTouch, TAP_SLOP, type Gesture } from './input'
import { fit, toStage, STAGE } from './stage'
import { freshSave } from './save'
import { newToy, play, playUntil, type Played } from './testing'
import { CATAPULT, CHICK, ICE_Y, IGLOO, LID, PARTS, PENGUIN, SLOTS, offPage, partAt, thingAt, type Part, type Thing } from './world'

// The finger, measured in the pixels of the surfaces the game is held to: how
// large each thing is as a target, how short a pull can be, and where the
// paper ends on a surface wider than the stage.

/** The two small surfaces: a tablet upright, where the stage is drawn at 0.695, and the smallest tablet lying down. */
const SMALL: [number, number][] = [[820, 1180], [1024, 768]]
const TARGET = 48

/** Each thing a press finds, and each part's place in the kit. */
type Target = Thing | `the ${Part} in the kit`
const inKit = (part: Part): Target => `the ${part} in the kit`
const targetAt = (x: number, y: number): Target => {
  const part = partAt(x, y)
  return part ? inKit(part) : thingAt(x, y)
}

/** Every target as a grid of the stage, a point every `STEP` units. The igloo is asked about with the chick in its doorway, or without. */
const STEP = 1
const COLS = Math.floor(STAGE.width / STEP) + 1, ROWS = Math.floor(STAGE.height / STEP) + 1
function gridOf(door: boolean): Target[] {
  const grid: Target[] = []
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
    const target = targetAt(col * STEP, row * STEP)
    grid.push(door && target === 'chick' ? 'igloo' : target)
  }
  return grid
}

/**
 * The largest box that lies wholly on each target, as the side of a square, in stage units. A thin strip is no
 * wider than it is: a lid 14 units high is 14 here, however long it is and whatever it joins on to.
 */
function boxes(grid: Target[]): Map<Target, number> {
  const side = new Array<number>(grid.length).fill(1)
  const best = new Map<Target, number>()
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
    const i = row * COLS + col
    if (row > 0 && col > 0 && grid[i] === grid[i - 1] && grid[i] === grid[i - COLS] && grid[i] === grid[i - COLS - 1]) side[i] = Math.min(side[i - 1], side[i - COLS], side[i - COLS - 1]) + 1
    best.set(grid[i], Math.max(best.get(grid[i]) ?? 0, (side[i] - 1) * STEP))
  }
  return best
}

/**
 * The largest round that lies wholly on each target, as its width, in stage units: the pad of a finger is a
 * round, and a round target holds it. Found from the boxes: a round of width w holds a square of w over the
 * root of two, so only the middles of such squares are asked, each all the way round its edge and inside.
 */
function rounds(grid: Target[], need: number): Map<Target, boolean> {
  const side = new Array<number>(grid.length).fill(1)
  const fits = new Map<Target, boolean>()
  const r = need / 2, inner = Math.floor(need / Math.SQRT2 / STEP) - 1
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
    const i = row * COLS + col
    if (row > 0 && col > 0 && grid[i] === grid[i - 1] && grid[i] === grid[i - COLS] && grid[i] === grid[i - COLS - 1]) side[i] = Math.min(side[i - 1], side[i - COLS], side[i - COLS - 1]) + 1
    if (fits.get(grid[i]) || side[i] <= inner) { if (!fits.has(grid[i])) fits.set(grid[i], false); continue }
    // The middle of the smallest such square that ends here, and every point of the round about it.
    const cx = col * STEP - inner * STEP * 0.5, cy = row * STEP - inner * STEP * 0.5
    let whole = true
    for (let y = Math.ceil((cy - r) / STEP); y <= (cy + r) / STEP && whole; y++) for (let x = Math.ceil((cx - r) / STEP); x <= (cx + r) / STEP; x++) {
      if (Math.hypot(x * STEP - cx, y * STEP - cy) > r) continue
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS || grid[y * COLS + x] !== grid[i]) { whole = false; break }
    }
    fits.set(grid[i], whole)
  }
  return fits
}

describe('what a finger can hit', () => {
  const things: Target[] = ['nearSeal', 'farSeal', 'chick', 'igloo', 'walrus', 'berg', 'puffin', 'balloon', 'whale', 'whaleEye', 'whaleBack', 'whaleTail', 'cloud', 'crate', 'drift', ...PARTS.map(inKit)]
  /** The targets that are rounds, or lie under a round roof: each holds a round of 48 pixels and not a square of them. */
  const ROUND: Target[] = ['chick', 'whaleEye', 'farSeal', 'whale', 'drift', 'igloo']

  it('gives every touch target a box or a round of at least 48 pixels at 820 by 1180 and at 1024 by 768, measured as an area and not as a cross', () => {
    const grid = gridOf(false), door = gridOf(true)
    const box = boxes(grid)
    expect([...box.keys()].filter((name) => name !== 'paper').sort()).toEqual([...things].sort())
    for (const [width, height] of SMALL) {
      const scale = fit(width, height).scale
      const need = TARGET / scale
      const round = rounds(grid, need), withDoor = rounds(door, need)
      for (const name of things) {
        const where = `${name} at ${width} by ${height}`
        // A box-shaped target holds a square of 48 pixels.
        if (!ROUND.includes(name)) expect(box.get(name)! * scale, `${where}: a box`).toBeGreaterThanOrEqual(TARGET)
        // A round one holds a round of 48 pixels: the igloo with the chick in its doorway, which is a smaller target of its own.
        else expect((name === 'igloo' ? withDoor : round).get(name), `${where}: a round`).toBe(true)
      }
      // The penguin in the pouch is taken hold of within its grip, and each part's place is its whole compartment.
      expect(2 * CATAPULT.grip * scale).toBeGreaterThanOrEqual(TARGET)
      for (const part of PARTS) {
        expect((SLOTS[part].x1 - SLOTS[part].x0) * scale, part).toBeGreaterThanOrEqual(TARGET)
        expect((SLOTS[part].y1 - SLOTS[part].y0) * scale, part).toBeGreaterThanOrEqual(TARGET)
      }
    }
  })

  it('rattles the crate over a box of 48 pixels each way above its lid: a press a little high or a little low is still the lid, and none of it bolts a part', () => {
    for (const [width, height] of SMALL) {
      const scale = fit(width, height).scale
      expect((LID.x1 - LID.x0) * scale).toBeGreaterThanOrEqual(TARGET)
      expect((LID.y1 - LID.y0) * scale).toBeGreaterThanOrEqual(TARGET)
    }
    // The lid as it is drawn lies in that box, and every point of the box is the crate's and no part's.
    expect(LID.y0).toBeLessThan(ICE_Y - 40)
    expect(LID.y1).toBeGreaterThanOrEqual(ICE_Y + 6)
    for (let x = LID.x0; x <= LID.x1; x += 2) for (let y = LID.y0; y < LID.y1; y += 2) {
      expect(partAt(x, y), `${x}, ${y}`).toBeNull()
      expect(thingAt(x, y), `${x}, ${y}`).toBe('crate')
    }
    // And a press there rattles, in the call that lands.
    const played = newToy()
    played.toy.press((LID.x0 + LID.x1) / 2, LID.y0 + 4)
    expect(played.toy.takeSounds().map((sound) => sound.name)).toEqual(['rattle'])
    expect(played.save.bolted).toEqual([])
  })

  it('answers a press on the igloo as the igloo over most of the igloo, with the chick a smaller target of its own in the doorway', () => {
    let igloo = 0, chick = 0, other = 0
    for (let x = IGLOO.x - IGLOO.r; x <= IGLOO.x + IGLOO.r; x += 2) for (let y = IGLOO.y - IGLOO.r; y <= ICE_Y; y += 2) {
      if (Math.hypot(x - IGLOO.x, y - IGLOO.y) > IGLOO.r) continue
      const found = thingAt(x, y)
      if (found === 'igloo') igloo++
      else if (found === 'chick') chick++
      else other++
    }
    expect(other).toBe(0)
    expect(igloo / (igloo + chick)).toBeGreaterThan(0.55)
    expect(chick).toBeGreaterThan(0)
    // The chick's own target is the 48 pixels and no more than it needs.
    for (const [width, height] of SMALL) expect(2 * CHICK.r * fit(width, height).scale).toBeGreaterThanOrEqual(TARGET)
    expect(CHICK.r).toBeLessThan(IGLOO.r * 0.6)
    expect(thingAt(CHICK.x, CHICK.y)).toBe('chick')
  })
})

/** A finger on a surface of `width` by `height`: down on the penguin, moved by (`dx`, `dy`) pixels in steps, and lifted. Returns the toy after the lift. */
function pullBy(width: number, height: number, dx: number, dy: number): Played {
  const by = fit(width, height)
  const played = newToy()
  const touch = new ForgivingTouch()
  const act = (gestures: Gesture[]): void => {
    for (const gesture of gestures) {
      if (gesture.type === 'press') { const at = toStage(gesture.at, by); played.toy.press(at.x, at.y) }
      else if (gesture.type === 'dragMove') { const at = toStage(gesture.at, by); played.toy.drag(at.x, at.y) }
      else if (gesture.type === 'tap') played.toy.tap()
      else if (gesture.type === 'dragEnd') played.toy.release()
      else if (gesture.type === 'pressEnd' || gesture.type === 'dragCancel') played.toy.cancel()
    }
  }
  const from = { x: by.x + CATAPULT.rest.x * by.scale, y: by.y + CATAPULT.rest.y * by.scale }
  act(touch.down(1, from, 0))
  for (let n = 1; n <= 4; n++) act(touch.move(1, { x: from.x + (dx * n) / 4, y: from.y + (dy * n) / 4 }))
  act(touch.up(1, { x: from.x + dx, y: from.y + dy }, 100))
  act(touch.letGo())
  played.toy.takeSounds()
  return played
}

describe('a second finger', () => {
  /** What the Mount does with a finger that comes down: the working finger's gestures go to the toy, and a finger that works nothing is told to the toy as one that also landed. */
  function land(played: Played, touch: ForgivingTouch, id: number, at: { x: number; y: number }): void {
    for (const gesture of touch.down(id, at, 0)) if (gesture.type === 'press') played.toy.press(gesture.at.x, gesture.at.y)
    if (!touch.holds(id)) played.toy.also(at.x, at.y)
  }

  it('is answered on the penguin while the first rests on bare paper: the penguin squawks and bounces, and the first finger\'s flame stays', () => {
    const played = newToy(1, { ...freshSave(null), bolted: ['rocket'] })
    const touch = new ForgivingTouch()
    land(played, touch, 1, { x: 330, y: 330 })
    played.toy.takeSounds()
    played.heard.length = 0
    // The first finger rests until the rocket flares.
    play(played, 1)
    const flared = played.toy.show().pilot.flame
    expect(flared).toBeGreaterThan(0.5)
    const before = played.toy.show().pilot.squash
    land(played, touch, 2, { x: CATAPULT.rest.x + 6, y: CATAPULT.rest.y - 4 })
    expect(played.toy.takeSounds().map((sound) => sound.name)).toEqual(['squawk'])
    play(played, 2 / 60)
    const frame = played.toy.show()
    expect(frame.pilot.squash).not.toBe(before)
    // Nothing is taken over: the catapult is still loaded, nothing is pulled, and the flame is as it was.
    expect(played.toy.phase).toBe('loaded')
    expect(frame.pilot.flame).toBe(flared)
    expect(played.save.last).toBeNull()
  })

  it('works nothing anywhere else, and nothing while the penguin is away', () => {
    const played = newToy()
    const touch = new ForgivingTouch()
    land(played, touch, 1, { x: 330, y: 330 })
    played.toy.takeSounds()
    // On the near seal, on a place in the kit, on bare paper: a second finger is not a press.
    for (const at of [{ x: 392, y: 620 }, { x: SLOTS.rocket.x0 + 30, y: SLOTS.rocket.y0 + 30 }, { x: 600, y: 400 }]) {
      land(played, touch, 2, at)
      touch.up(2, at, 10)
      expect(played.toy.takeSounds()).toEqual([])
    }
    expect(played.save.bolted).toEqual([])
    // In the air the pouch is empty: a second finger where the penguin sat pokes nothing.
    const flying = pullBy(1180, 820, -120, 60)
    playUntil(flying, (toy) => toy.phase === 'fly')
    flying.toy.takeSounds()
    flying.toy.also(CATAPULT.rest.x, CATAPULT.rest.y)
    expect(flying.toy.takeSounds()).toEqual([])
  })
})

describe('the shortest pull', () => {
  // The sheet as it should read (a pair waits for it): a finger that moves no further than a tap's slop, 14 pixels
  // of the surface, has not pulled, and pokes; the shortest pull there is, a pixel more, plops the penguin out at
  // the foot of the catapult. Up to about a square of pull it lands there on its face. On the upright tablet 15
  // pixels are more than a square, and the plop pulled back and down reaches the flank of the near seal, which
  // lies next to the catapult, and is tossed on by it.
  const ways: [string, number, number][] = [['back', -1, 0], ['back and down', -0.7071, 0.7071], ['down', 0, 1]]

  it('pokes the penguin when the finger moves no further than a tap is allowed to, at each size', () => {
    for (const [width, height] of [[1180, 820], ...SMALL]) for (const [name, wx, wy] of ways) {
      const played = pullBy(width, height, wx * TAP_SLOP, wy * TAP_SLOP)
      expect(played.toy.phase, `${name} at ${width} by ${height}`).toBe('loaded')
      expect(played.save.last, name).toBeNull()
    }
  })

  it('plops the penguin out onto its face at the foot of the catapult from the shortest pull a finger can make, at each size', () => {
    for (const [width, height] of [[1180, 820], ...SMALL]) for (const [name, wx, wy] of ways) {
      const played = pullBy(width, height, wx * (TAP_SLOP + 1), wy * (TAP_SLOP + 1))
      const where = `${name} at ${width} by ${height}`
      expect(played.toy.phase, where).toBe('snap')
      expect(playUntil(played, (toy) => toy.phase === 'fly'), where).toBe(true)
      // It leaves the pouch at a crawl: under a fifth of the speed of a full pull.
      const body = played.toy.body!
      expect(Math.hypot(body.vx, body.vy), where).toBeLessThan(TOP_SPEED / 5)
      // And comes down within a second, no further off than the near seal's flank beside the catapult.
      playUntil(played, (toy) => toy.phase === 'scene' || toy.body!.age > 1.2)
      const first = played.heard.flat().map((sound) => sound.name).filter((name) => name !== 'honk' && name !== 'knock')[0]
      const onSeal = first === 'boing'
      expect(['thunk', 'boing'], where).toContain(first)
      if (!onSeal) {
        // On its face: stuck by the beak, within a penguin's width of the foot of the post.
        expect(played.toy.show().pilot.pose, where).toBe('beak')
        expect(Math.abs(played.toy.show().pilot.x - CATAPULT.foot.x), where).toBeLessThan(PENGUIN.width)
      }
      // Where 15 pixels are no more than a square, every way of pulling them lands it on its face at the foot.
      if (fit(width, height).scale > 0.75) expect(onSeal, where).toBe(false)
    }
  })
})

describe('the edge of the paper', () => {
  it('ends where the surface stops showing it: at the stage on a tablet, and further out on a wider surface', () => {
    // A surface of the stage's own shape, and narrower ones, show no paper past the stage.
    for (const [width, height] of [[1180, 820], ...SMALL]) {
      const by = fit(width, height)
      expect(offPage(-by.x / by.scale, (width - by.x) / by.scale)).toEqual({ left: -PENGUIN.r - 2, right: STAGE.width + PENGUIN.r + 2 })
    }
    // A wide one shows more paper either side, and the paper ends where that ends.
    const wide = fit(1920, 820)
    const x0 = -wide.x / wide.scale, x1 = (1920 - wide.x) / wide.scale
    expect(x0).toBeLessThan(-300)
    expect(offPage(x0, x1)).toEqual({ left: x0 - PENGUIN.r - 2, right: x1 + PENGUIN.r + 2 })
  })
})
