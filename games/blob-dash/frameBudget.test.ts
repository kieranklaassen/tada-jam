import { beforeAll, describe, expect, it } from 'vitest'
import { BEATS, PLACES } from './beat'
import { TIERS } from './config'
import { bodyOf, by } from './body'
import { pigeonPose, pigeonStand, type Clock } from './cast'
import { BARE, FRAME, GRIP, carry, fresh as loop, piece, runTo } from './drive'
import { IdleLadder } from './guidance'
import { BLOB, CAST, PIGEON_SCALE, RACK, RELEASE, RING, SLOTS, SPRING, SURFACES, frame as placed, homeOn, rackFoot, rackPoint, slotOf, slotPoint } from './layout'
import { KINDS, type Piece } from './pieces'
import { Count, standIn, type Stamp } from './recording'
import { PIGEON } from './figures'
import { STAGE } from './stage'
import type { Toy } from './toy'
import { HAND_AT, HAND_SIZE, View } from './view'

// The frame budget, counted and not timed, so it holds on a busy machine.
// A frame of this game is one stamp of the set (the wall with every piece
// that is at rest), one of the springs' layer (every spring at rest), a stamp
// for each sprite that moves, a few live strokes and fills (eyes, the cord, a
// pipe), and whatever was put right in a layer because a spring or a piece
// started or stopped moving. The real view draws into stand-ins that count all
// three. Their sum is the game's draw count: what the grown-up overlay shows
// and what the report gives.

/**
 * The jam's bar: a frame stays under this many draws. Counted on 2026-10-12 at each of the three surface sizes
 * below, the worst frame of each case. At 1180 by 820 and at 1024 by 768: 76 in the clear-out of a full ring with
 * six pieces out, the glow and the hand, every falling spring stamped until it is out of the frame; 72 with a lump
 * in a pipe, its twin loud on the ring and a piece in the hand; 77 with two lumps in one pipe, split and zipped
 * there, the pipe losing a part, pieces lifted and put back and taps on the wall (its worst frame is the twins out
 * of the pipe and in the air over a ring of springs, with a piece in the hand); 75 in the largest state there is
 * (sixty-four springs and twenty-four pieces) with a clear-out; 51 in the pigeon's lap; 68 while pieces are
 * carried out and home; 65 when a touch drops the rest of a clear-out as one stamp. At 820 by 1180 the clear-out
 * is 77 and the rest are the same: a spring falls harder where the frame goes on below the stage, so at most one
 * more is in the air there. So the worst frame found at any size is 77. A full ring at rest costs what an empty
 * one does.
 */
const BAR = 80
const RATIO = 2
/** The sizes the count is held at: a tablet lying, a smaller one, and a tablet standing, where the frame goes on below the stage and a falling spring is in it for longer. */
const SIZES = [[1180, 820], [1024, 768], [820, 1180]] as const

for (const [W, H] of SIZES) {

  /** A loop as a visit at this surface size holds it: it knows where the frame ends below, so a falling spring is kept until it is out of it. */
  const fresh = (...args: Parameters<typeof loop>): Toy => {
    const toy = loop(...args), by = placed(W, H)
    toy.bottom = Math.max(STAGE.height, (H - by.y) / by.scale)
    return toy
  }
  /** How wide the ring is on this surface, in canvas pixels, less a margin: a layer of springs is at least that size, and no sprite is. */
  const RING_PX = 600 * RATIO * placed(W, H).scale
  const whole = (stamp: Stamp): boolean => stamp.w >= W * RATIO * 0.8 && stamp.h >= H * RATIO * 0.8
  const ringSized = (stamp: Stamp): boolean => stamp.w >= RING_PX && stamp.h >= RING_PX && !whole(stamp)

  /** The surface, and the canvases behind it: the wall and the set, of its size, and the two layers of springs. */
  const surface = new Count(), behind = new Count(), small = new Count()
  let made = 0
  let view: View

  beforeAll(() => {
    const make = (w: number, h: number) => {
      made += 1
      // The wall and the set are the size of the surface, and the two layers of springs the size of the ring.
      return standIn(w, h, w >= RING_PX && h >= RING_PX ? behind : small)
    }
    view = new View(standIn(W * RATIO, H * RATIO, surface), make)
    view.setTier(TIERS[0])
    view.resize(W, H, RATIO)
  })

  const EVERY = Array.from({ length: PLACES * 2 }, (_, place) => place)
  const BEAT_SPRINGS = Array.from({ length: BEATS }, (_, beat) => beat * 2)
  /** All six pieces out, spread round the floor, with a flip so the ceiling is run too. */
  const SIX: Piece[] = [piece('drum', 2), piece('chime', 4), piece('splitter', 6), piece('tunnel', 9), piece('wall', 12), piece('flip', 14)]

  type Cost = { stamps: number; pen: number; layer: number; all: number }
  const none = (): Cost => ({ stamps: 0, pen: 0, layer: 0, all: 0 })
  const most = (a: Cost, b: Cost): Cost => ({ stamps: Math.max(a.stamps, b.stamps), pen: Math.max(a.pen, b.pen), layer: Math.max(a.layer, b.layer), all: Math.max(a.all, b.all) })

  /** One frame drawn, and what it cost. What the view says it drew is what the stand-ins saw. */
  function frame(toy: Toy, idle: number): Cost {
    surface.reset()
    behind.reset()
    const drawn = view.draw(toy, new IdleLadder(0).update(idle))
    expect(drawn.stamps).toBe(surface.stamps.length)
    expect(drawn.strokes).toBe(surface.strokes + surface.fills)
    expect(drawn.layer).toBe(behind.stamps.length + behind.strokes + behind.fills)
    // One stamp covers the surface: the set. Nothing else is that size. One or two cover the ring: the springs at
    // rest, and the springs that are falling together.
    expect(surface.stamps.filter(whole)).toHaveLength(1)
    expect(surface.stamps.filter((stamp) => ringSized(stamp) || whole(stamp)).length).toBeLessThanOrEqual(3)
    return { stamps: drawn.stamps, pen: drawn.strokes, layer: drawn.layer, all: drawn.stamps + drawn.strokes + drawn.layer }
  }

  /** Plays a loop frame by frame and draws every one. `each` is the child's hand, by frame; `idle` is how long nothing was touched. */
  function play(toy: Toy, frames: number, idle: (i: number) => number, each: (i: number) => void = () => {}): Cost {
    view.lay(toy)
    let worst = none()
    for (let i = 0; i < frames; i++) {
      each(i)
      toy.step(FRAME)
      const now = frame(toy, idle(i))
      worst = most(worst, now)
    }
    return worst
  }

  const pull = (toy: Toy): void => {
    toy.press(GRIP)
    toy.drag(GRIP, { x: RELEASE.x, y: RELEASE.rest + RELEASE.travel })
    toy.endDrag(true)
  }

  describe(`the frame budget at ${W} by ${H}`, () => {
    it('paints the wall, the set and every sprite once, when the surface is sized, and none in a frame', () => {
      const before = made
      expect(before).toBeGreaterThan(40)
      const toy = fresh(160, EVERY, SIX, 1)
      play(toy, 240, (i) => i / 20, (i) => { if (i % 7 === 0) toy.wallTap({ x: BARE.x + (i % 5) * 9, y: BARE.y }) })
      expect(made).toBe(before)
    })

    it('draws a full ring at rest for the cost of an empty one: the springs and pieces at rest are in the set', () => {
      const empty = fresh(100, [], [], 2), full = fresh(100, EVERY, SIX, 2)
      view.lay(empty)
      const bare = frame(empty, 0)
      view.lay(full)
      const laden = frame(full, 0)
      // All that is live is the spring or two the blob is standing over.
      expect(laden.all).toBeLessThanOrEqual(bare.all + 3)
      expect(laden.layer).toBe(0)
    })

    it('keeps the fullest frame under the bar: a full ring coming down in a clear-out, all six pieces out, the glow and the hand', () => {
      let worst = none()
      for (const seed of [3, 4, 5]) {
        const toy = fresh(160, EVERY, SIX, seed)
        // A storm of taps, then the release: every spring comes off the wall while the last bursts are still on it.
        worst = most(worst, play(toy, 90, () => 0, (i) => { if (i % 6 === 0) toy.wallTap({ x: 300 + i * 6, y: 60 + (i % 5) * 150 }) }))
        pull(toy)
        expect(toy.clearing).not.toBeNull()
        worst = most(worst, play(toy, 400, (i) => 5 + i / 100))
      }
      expect(worst.all).toBeGreaterThan(50)
      expect(worst.all).toBeLessThan(BAR)
    })

    it('keeps a lump and a loud twin on a full ring under the bar, with a piece in the hand and taps on the wall', () => {
      let worst = none()
      let apart = 0
      for (const seed of [6, 7]) {
        const toy = fresh(150, EVERY, SIX, seed)
        worst = most(worst, play(toy, 1500, (i) => 5 + (i % 400) / 80, (i) => {
          if (i % 11 === 0) toy.wallTap({ x: 300 + (i % 60) * 6, y: 60 + (i % 5) * 150 })
          if (i % 300 === 100) {
            const from = slotPoint(slotOf(2, false))
            toy.press(from)
            toy.drag(from, { x: from.x + 60, y: from.y - 80 })
          }
          if (i % 300 === 220) toy.endDrag(false)
          if (toy.runners.length === 2 && toy.runners.some((r) => r.hushed) && toy.runners.some((r) => !r.hushed)) apart += 1
        }))
        expect(toy.pieces.size).toBe(SIX.length)
      }
      // The case was reached: on a ring full of springs one of two is swallowed and the other jumps the mouth.
      expect(apart).toBeGreaterThan(0)
      expect(worst.all).toBeLessThan(BAR)
    })

    it('keeps two lumps in one pipe under the bar: split and zipped in it, across a flip, with the pipe losing a part, a piece in the hand and taps', () => {
      // A ring full of springs but for the run-up to the mouth on the floor and the way back down from the ceiling,
      // so the blob goes round through the pipe lap after lap: one lump is made two at the splitter, and the two are
      // zipped into one there a lap later.
      const springs = EVERY.filter((sp) => sp > 2 && (sp < PLACES + 24 || sp > PLACES + 28))
      const pieces: Piece[] = [piece('tunnel', 1), piece('splitter', 3), piece('drum', 4), piece('wall', 5), piece('flip', 6), piece('tunnel', 12, true), piece('flip', 14, true), piece('chime', 10)]
      let worst = none()
      let lumps = 0, zipped = 0, fading = 0
      for (const seed of [6, 7]) {
        const toy = fresh(150, springs, pieces, seed)
        worst = most(worst, play(toy, 1800, (i) => 5 + (i % 400) / 80, (i) => {
          if (i % 11 === 0) toy.wallTap({ x: 300 + (i % 60) * 6, y: 60 + (i % 5) * 150 })
          // A piece of the pipe itself, the flip, is lifted and put back, and then one that is not: what the pipe
          // loses fades while the lumps are in it.
          if (i % 97 === 20 || i % 97 === 60) {
            const from = slotPoint(slotOf(i % 97 === 20 ? 6 : 10, false))
            toy.press(from)
            toy.drag(from, { x: from.x + 60, y: from.y - 80 })
          }
          if (i % 97 === 45 || i % 97 === 85) toy.endDrag(false)
          if (toy.runners.length === 2 && toy.runners.every((r) => r.hushed)) lumps += 1
          if (toy.fx.some((fx) => fx.kind === 'zip' && fx.lump)) zipped += 1
          if (toy.runners.some((r) => r.hushed) && toy.fx.some((fx) => fx.kind === 'pipe')) fading += 1
        }))
        expect(toy.pieces.size).toBe(pieces.length)
      }
      // The case was reached, every part of it.
      expect(lumps).toBeGreaterThan(100)
      expect(zipped).toBeGreaterThan(0)
      expect(fading).toBeGreaterThan(0)
      expect(worst.all).toBeLessThan(BAR)
    })

    it('keeps the largest state there is under the bar: sixty-four springs and a piece in every place of both surfaces', () => {
      const all: Piece[] = SLOTS.map((slot) => piece(KINDS[(slot * 5 + Math.floor(slot / 6)) % KINDS.length], slot % BEATS, slot >= BEATS))
      let worst = none()
      for (const seed of [11, 12]) {
        const toy = fresh(160, EVERY, all, seed)
        worst = most(worst, play(toy, 1200, (i) => 5 + (i % 300) / 60, (i) => { if (i % 13 === 0) toy.wallTap({ x: 300 + (i % 60) * 6, y: 60 + (i % 5) * 150 }) }))
        // And all of it cleared: sixty-four springs come off a ring that twins are running, each one falling out of the frame.
        pull(toy)
        expect(toy.clearing).not.toBeNull()
        worst = most(worst, play(toy, 400, (i) => 5 + i / 100))
      }
      expect(worst.all).toBeLessThan(BAR)
    })

    it('keeps the pigeon\'s lap under the bar: the springs it flies over duck one after another', () => {
      const toy = fresh(160, BEAT_SPRINGS, [], 8)
      runTo(toy, 2 * BEATS - 0.5)
      const worst = play(toy, 400, () => 0)
      expect(toy.pos).toBeGreaterThan(2 * BEATS + 8)
      expect(worst.all).toBeLessThan(BAR)
    })

    it('keeps a child rearranging under the bar: every piece carried out, nudged and thrown home, on a full ring', () => {
      const toy = fresh(140, EVERY, [], 9)
      const worst = play(toy, 900, () => 0, (i) => {
        const k = Math.floor(i / 60) % KINDS.length
        if (i % 60 === 10 && i < 360) carry(toy, KINDS[k], k % 2 === 1 ? 2 + k * 2 : 1 + k * 2, k % 2 === 1)
        if (i % 60 === 30 && i >= 360 && i < 720) {
          const from = slotPoint(slotOf(k % 2 === 1 ? 2 + k * 2 : 1 + k * 2, k % 2 === 1))
          toy.press(from)
          toy.drag(from, rackPoint(k))
          toy.endDrag(true)
        }
        if (i % 9 === 0) toy.wallTap({ x: BARE.x + (i % 4) * 12, y: BARE.y + (i % 3) * 20 })
      })
      expect(worst.all).toBeLessThan(BAR)
    })

    it('stamps every spring that is falling, in every frame it is in the air: none is left out to save a draw', () => {
      // What a falling spring is, as a stamp: whatever the frame with one more faller has one more of.
      const toy = fresh(160, EVERY, [], 13)
      view.lay(toy)
      pull(toy)
      let frames = 0, most = 0
      while (toy.clearing || toy.fallers.length > 0) {
        toy.step(FRAME)
        surface.reset()
        behind.reset()
        const drawn = view.draw(toy, null)
        // Every stamp but those of a frame with nothing falling: the fallers are on top of a bare ring's frame.
        const sizes = new Map<string, number>()
        for (const stamp of surface.stamps) sizes.set(`${Math.round(stamp.w)}x${Math.round(stamp.h)}`, (sizes.get(`${Math.round(stamp.w)}x${Math.round(stamp.h)}`) ?? 0) + 1)
        const beatSprings = toy.fallers.filter((faller) => !faller.half).length, halfSprings = toy.fallers.length - beatSprings
        // A spring's sprite is stamped at its own size: the two kinds are two heights of one width.
        const counts = [...sizes.values()]
        expect(counts.some((count) => count >= beatSprings), `${beatSprings} on a beat at frame ${frames}`).toBe(true)
        expect(counts.some((count) => count >= halfSprings), `${halfSprings} on a half at frame ${frames}`).toBe(true)
        expect(drawn.stamps).toBeGreaterThanOrEqual(toy.fallers.length + 20)
        most = Math.max(most, toy.fallers.length)
        frames += 1
      }
      expect(most).toBeGreaterThan(10)
    })

    it('keeps a touch in the middle of a clear-out under the bar: the springs still on the wall fall together as one stamp', () => {
      let worst = none()
      for (const after of [3, 20, 90]) {
        const toy = fresh(160, EVERY, SIX, 14)
        view.lay(toy)
        for (let i = 0; i < 30; i++) { toy.step(FRAME); frame(toy, 0) }
        pull(toy)
        for (let i = 0; i < after; i++) { toy.step(FRAME); worst = most(worst, frame(toy, 0)) }
        toy.wallTap(BARE)
        expect(toy.dropping).not.toBeNull()
        let falling = 0
        while (toy.dropping || toy.fallers.length > 0) {
          toy.step(FRAME)
          const now = frame(toy, 0)
          worst = most(worst, now)
          if (toy.dropping) {
            falling += 1
            // The falling layer is the size of the ring: with the layer at rest there are two such stamps.
            expect(surface.stamps.filter(ringSized)).toHaveLength(2)
          }
        }
        expect(falling).toBeGreaterThan(10)
      }
      expect(worst.all).toBeLessThan(BAR)
    })

    it('draws a lump in a pipe behind the piece it passes: the piece is stamped again after the lump', () => {
      const toy = fresh(120, [], [piece('tunnel', 1), piece('drum', 3), piece('tunnel', 9)], 15)
      view.lay(toy)
      const order = (): { lump: number; pieces: number[] } => {
        surface.reset()
        behind.reset()
        view.draw(toy, null)
        // A blob's sprite is a square of its own size and a margin for its overspray. No ghost is left in a pipe, so
        // the last such stamp is the lump.
        const side = BLOB.size + 28
        const lump = surface.stamps.reduce((last, stamp, i) => (stamp.w === side && stamp.h === side ? i : last), -1)
        return { lump, pieces: surface.stamps.map((stamp, i) => (stamp.image === drumImage ? i : -1)).filter((i) => i >= 0) }
      }
      // The drum's sprite: the one stamp a frame gains when the drum is in the hand.
      surface.reset()
      view.draw(toy, null)
      const without = surface.stamps.map((stamp) => stamp.image)
      toy.press(rackPoint(0))
      surface.reset()
      view.draw(toy, null)
      const drumImage = surface.stamps.map((stamp) => stamp.image).find((image) => !without.includes(image))
      expect(drumImage).toBeDefined()
      toy.endDrag(false)
      for (let i = 0; i < 30; i++) { toy.step(FRAME); view.draw(toy, null) }
      // Far from the drum, the drum is in the set and is not stamped.
      runTo(toy, 1.9)
      expect(order().pieces).toEqual([])
      // At the drum, in its pipe: the lump is stamped, and the drum after it.
      runTo(toy, 3)
      expect(toy.blob.hushed).toBe(true)
      const passing = order()
      expect(passing.lump).toBeGreaterThan(0)
      expect(passing.pieces.length).toBeGreaterThan(0)
      expect(Math.min(...passing.pieces)).toBeGreaterThan(passing.lump)
      // Well past it, the drum is left to the set again.
      runTo(toy, 6)
      for (let i = 0; i < 60; i++) { toy.step(FRAME); view.draw(toy, null) }
      expect(order().pieces).toEqual([])
    })

    it('draws a twin that is zipped into a lump with the lumps, under the pipe: its stamp is next to the lump\'s, and on the line it is not', () => {
      const side = BLOB.size + 28
      const blobs = (toy: Toy): number[] => {
        surface.reset()
        behind.reset()
        view.draw(toy, null)
        return surface.stamps.map((stamp, i) => (stamp.w === side && stamp.h === side ? i : -1)).filter((i) => i >= 0)
      }
      const toy = fresh(120, [], [piece('tunnel', 1), piece('splitter', 3), piece('tunnel', 12)], 15)
      view.lay(toy)
      runTo(toy, 16 + 3 + 0.1)
      expect(toy.fx.some((fx) => fx.kind === 'zip' && fx.lump)).toBe(true)
      const piped = blobs(toy)
      expect(piped).toHaveLength(2)
      expect(piped[1] - piped[0]).toBe(1)
      // On the line the twin is drawn in over everything, with the other short-lived things.
      const open = fresh(120, [], [piece('splitter', 3)], 15)
      view.lay(open)
      runTo(open, 16 + 3 + 0.1)
      expect(open.fx.some((fx) => fx.kind === 'zip' && !fx.lump)).toBe(true)
      const out = blobs(open).slice(-2)
      expect(out[1] - out[0]).toBeGreaterThan(1)
    })

    it('sheds the dust, the flash and most of the ghosts on the lowest tier, and still draws the blob and the cast', () => {
      const toy = fresh(120, BEAT_SPRINGS, [], 10)
      view.lay(toy)
      for (let i = 0; i < 200; i++) toy.step(FRAME)
      const full = frame(toy, 0)
      view.setTier(TIERS[TIERS.length - 1])
      const least = frame(toy, 0)
      view.setTier(TIERS[0])
      expect(least.stamps).toBeLessThan(full.stamps)
      expect(least.stamps).toBeGreaterThanOrEqual(1 + 1 + 2 + 20)
      expect(least.pen).toBe(full.pen)
    })

    it('stands each piece of the rack where a finger finds it: its foot where the layout says, the wall with its stub on the plank', () => {
    const toy = fresh()
    behind.reset()
    view.lay(toy)
    const feet = behind.stamps.filter((stamp) => stamp.at !== null && stamp.at.y === RACK.y).map((stamp) => stamp.at!.x)
    expect(feet).toEqual(KINDS.map((_, i) => rackFoot(i).x))
    // Lifted and let go again, it is drawn rocking on the same foot.
    toy.press(rackPoint(KINDS.indexOf('wall')))
    toy.endDrag(false)
    toy.step(FRAME)
    surface.reset()
    view.draw(toy, null)
    expect(surface.stamps.filter((stamp) => stamp.at !== null && stamp.at.y === RACK.y).map((stamp) => stamp.at!.x)).toContain(rackFoot(KINDS.indexOf('wall')).x)
  })

  it('settles a piece onto the line at once when the spring under it comes off: in that frame it is drawn where it now stands', () => {
    const toy = fresh(120, [6], [piece('drum', 3)], 16)
    const raised = by(3, 0, SPRING.pressed, false), down = by(3, 0, 0, false)
    const near = (stamp: Stamp, p: { x: number; y: number }) => stamp.at !== null && Math.hypot(stamp.at.x - p.x, stamp.at.y - p.y) < 0.01
    behind.reset()
    view.lay(toy)
    // On its spring it stands on the pressed coil. Its sprite is known by its size from here on.
    const standing = behind.stamps.filter((stamp) => near(stamp, raised))
    expect(standing).toHaveLength(1)
    const drum = (stamp: Stamp) => stamp.w === standing[0].w && stamp.h === standing[0].h
    expect(toy.holds(6)).toBe(true)
    pull(toy)
    // Its spring is still on the wall until it comes off, and the drum on it.
    expect(toy.holds(6)).toBe(true)
    toy.step(FRAME)
    expect(toy.holds(6)).toBe(false)
    surface.reset()
    behind.reset()
    view.draw(toy, null)
    const drawn = [...surface.stamps, ...behind.stamps].filter(drum)
    expect(drawn.filter((stamp) => near(stamp, down)).length).toBeGreaterThan(0)
    expect(drawn.filter((stamp) => near(stamp, raised))).toEqual([])
    // And it stays there: the frame after, the set holds it on the line and nothing is drawn for it.
    toy.step(FRAME)
    surface.reset()
    behind.reset()
    view.draw(toy, null)
    expect([...surface.stamps, ...behind.stamps].filter(drum)).toEqual([])
  })

  it('draws the pigeon in its strut rocked about the foot it stands on: the bird is placed by its stand, not left where it perches', () => {
    const toy = fresh()
    view.lay(toy)
    toy.step(FRAME)
    toy.cast.pigeon.strut = 0.25
    const clock: Clock = { beats: toy.pos, seconds: toy.seconds, tempo: toy.tempo, blob: bodyOf(toy, toy.blob) }
    const pose = pigeonPose(clock, toy.cast.pigeon, toy.flying()), stand = pigeonStand(pose, PIGEON.feet)
    expect(Math.hypot(stand.dx, stand.dy) * PIGEON_SCALE).toBeGreaterThan(2)
    const perch = { x: CAST.pigeon.x, y: CAST.pigeon.y + pose.hop * PIGEON_SCALE }
    const stood = { x: perch.x + stand.dx * PIGEON_SCALE, y: perch.y + stand.dy * PIGEON_SCALE }
    const near = (stamp: Stamp, p: { x: number; y: number }) => stamp.at !== null && Math.hypot(stamp.at.x - p.x, stamp.at.y - p.y) < 0.01
    surface.reset()
    view.draw(toy, null)
    expect(surface.stamps.filter((stamp) => near(stamp, stood)).length).toBeGreaterThan(0)
    expect(surface.stamps.filter((stamp) => near(stamp, perch))).toEqual([])
  })

  it('draws with the fit the layout places the home control by, at every surface size: a touch comes back through the fit the frame was drawn with', () => {
    for (const [width, height] of SURFACES) {
      const count = new Count()
      const sized = new View(standIn(width * RATIO, height * RATIO, count), (w, h) => standIn(w, h, count))
      sized.resize(width, height, RATIO)
      expect(sized.fit, `${width}x${height}`).toEqual(placed(width, height))
    }
  })

  it('draws the bare wall, and nothing else, before the slot has been read', () => {
      surface.reset()
      expect(view.draw(null, null)).toEqual({ stamps: 1, strokes: 0, layer: 0 })
      expect(surface.stamps).toHaveLength(1)
    })

    it('shows the ghost hand whole, on bare wall: on the stage, off the ring, off the camera and clear of the home control', () => {
      const box = { x: HAND_AT.x - HAND_SIZE.left, y: HAND_AT.y, w: HAND_SIZE.left + HAND_SIZE.right, h: HAND_SIZE.down }
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w).toBeLessThanOrEqual(STAGE.width)
      expect(box.y + box.h).toBeLessThanOrEqual(STAGE.height)
      for (const [x, y] of [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]]) expect(Math.hypot(x - RING.x, y - RING.y)).toBeGreaterThan(RING.floor + RING.line)
      const camera = CAST.camera.box
      expect(box.x >= camera.x + camera.w || box.y >= camera.y + camera.h || box.y + box.h <= camera.y).toBe(true)
      expect(box.x + box.w).toBeLessThan(homeOn(W, H).x - 6)
    })
  })
}
