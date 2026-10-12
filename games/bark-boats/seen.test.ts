import { beforeAll, describe, expect, it } from 'vitest'
import { setUp, type Easel } from './easel'
import { LAID, carryTo, launchBoat, pick, play, playUntil, tapAt, visit, type Visit } from './hands'
import { FROG, SEAT, SUN } from './layout'
import { STONE_TOP, boxOf, overlaps } from './pieces'
import { fit } from './stage'
import { STEP, type World } from './world'

// What the second reader found a child would notice: a touch is answered
// where it is seen. What the finger holds stays under the finger whatever
// the view does, a thing let go where there is no bank flies back in a move
// that is seen, and a touch during the morning is read in the frame that is
// then on show.

type Sheet = { sheet: unknown }
let easel: Easel
let cap: Sheet
const by = fit(1180, 820)
const acts = (w: World): string[] => w.acts.map((run) => run.act.id)

/** Where the cap is stamped on the stage in a frame of `w`, in stage units. */
function capSeen(w: World): { x: number; y: number } | null {
  easel.frame(w)
  const stamped = easel.surface.stamped.filter((each) => each.image === cap.sheet)
  if (stamped.length !== 1) return null
  return { x: (stamped[0].x / 2 - by.x) / by.scale + stamped[0].w / 4 / by.scale, y: (stamped[0].y / 2 - by.y) / by.scale + stamped[0].h / 4 / by.scale }
}

/** A boat afloat is sent on by a ring, and the cap is picked up and held still while the brook takes the boat. */
function heldAsTheBrookTakesIt(): Visit {
  const v = visit()
  launchBoat(v)
  expect(playUntil(v, (w) => w.journey.phase === 'out')).toBe(true)
  pick(v, LAID.cap, { x: 700, y: 430 })
  return v
}

beforeAll(() => {
  easel = setUp()
  cap = (easel.view as unknown as { sheets: { makings: { cap: Sheet } } }).sheets.makings.cap
})

describe('a making held while the brook takes the boat', () => {
  it('stays under the finger, in the frame the child sees, while the view moves on', () => {
    const v = heldAsTheBrookTakesIt()
    // It has come to hang from the finger; the view may already be moving.
    play(v, 0.4, true)
    expect(v.game.w.cam).toBeGreaterThan(-200)
    const before = capSeen(v.game.w)
    expect(before).not.toBeNull()
    let moved = 0, panned = false
    for (let i = 0; i < 6 / STEP && !(panned && v.game.w.journey.phase !== 'pan'); i++) {
      play(v, STEP, true)
      const w = v.game.w
      if (w.journey.phase === 'pan') panned = true
      const now = capSeen(w)
      expect(now, `at ${i}`).not.toBeNull()
      moved = Math.max(moved, Math.hypot((now?.x ?? 0) - (before?.x ?? 0), (now?.y ?? 0) - (before?.y ?? 0)))
    }
    expect(panned).toBe(true)
    expect(v.game.w.frame).toBe(0)
    // The view has run a whole frame on, and the cap has not left the finger.
    expect(moved).toBeLessThan(12)
    expect(v.game.w.hand?.on).toBe('piece')
  })

  it('let go where there is no bank in the frame, flies back in a seen arc to where it lay, and nobody is given it unseen', () => {
    const v = heldAsTheBrookTakesIt()
    expect(playUntil(v, (w) => w.journey.phase === 'pan' && w.cam < -500 && w.cam > -900, 20)).toBe(true)
    const piece = v.game.w.pieces.find((each) => each.kind === 'cap')
    const held = capSeen(v.game.w)
    v.game.heard()
    // Over where the frog sits in the frame that is leaving: he is not there to take it.
    v.game.dragMove(FROG.x, FROG.y - 100)
    play(v, 0.3, true)
    const over = capSeen(v.game.w)
    v.game.dragEnd()
    expect(piece?.mode).toBe('fly')
    expect(piece?.back).toBe(true)
    let was = capSeen(v.game.w), farthest = 0
    expect(Math.hypot((was?.x ?? 0) - (over?.x ?? 0), (was?.y ?? 0) - (over?.y ?? 0))).toBeLessThan(30)
    for (let i = 0; i < 90 && piece?.mode === 'fly'; i++) {
      play(v, STEP)
      const now = capSeen(v.game.w)
      // A seen move: from one frame to the next it goes a step, never a jump.
      if (was && now) farthest = Math.max(farthest, Math.hypot(now.x - was.x, now.y - was.y))
      was = now
    }
    expect(farthest).toBeGreaterThan(4)
    expect(farthest).toBeLessThan(120)
    expect(piece?.mode).toBe('rest')
    expect({ x: piece?.x, y: piece?.y }).toEqual(LAID.cap)
    expect(acts(v.game.w).filter((id) => id.startsWith('frog') || id.startsWith('bank'))).toEqual([])
    expect(v.game.heard().plain.map((sound) => sound.name)).not.toContain('thwip')
    expect(held).not.toBeNull()
  })
})

describe('a touch during the morning scene', () => {
  it('ends the scene and is answered in the frame that is then on show: the frog on the bank croaks where the finger is', () => {
    for (const after of [0.4, 1.6, 3]) {
      const v = visit()
      launchBoat(v)
      expect(playUntil(v, (w) => w.finished && !w.scene)).toBe(true)
      v.game.press(SUN.x, SUN.pond, false); v.game.dragStart()
      for (let i = 1; i <= 10; i++) { v.game.dragMove(SUN.x, SUN.pond - i * 9); play(v, STEP, true) }
      v.game.dragEnd()
      play(v, after)
      expect(v.game.w.scene?.name, String(after)).toBe('morning')
      tapAt(v, FROG.x, FROG.y - 82)
      const w = v.game.w
      expect(w.scene, String(after)).toBeNull()
      expect(w.cam, String(after)).toBe(0)
      expect(w.frame, String(after)).toBe(-1)
      expect(acts(w), String(after)).toContain('frog:croak')
      // And a making on the sand is picked up where it is seen.
      play(v, 0.5)
      v.game.press(LAID.cap.x, LAID.cap.y, false)
      const hand = v.game.w.hand
      expect(hand?.on === 'piece' ? hand.piece.kind : null, String(after)).toBe('cap')
      v.game.tap()
    }
  })
})

describe('a touch off the print', () => {
  it('in the letterbox beside the stage or on the paper margin is answered by nothing: no sound, nothing in the hand, nothing changed', () => {
    for (const [x, y] of [[-60, 400], [1240, 400], [600, -80], [600, 900], [6, 400], [600, 814], [1176, 700]] as const) {
      const v = visit()
      play(v, 0.5)
      v.game.heard()
      v.game.changed()
      const before = JSON.stringify(v.game.w.pieces.map((piece) => [piece.kind, piece.x, piece.y, piece.mode]))
      v.game.press(x, y, false)
      expect(v.game.w.hand, `${x},${y}`).toBeNull()
      expect(v.game.w.finger.down, `${x},${y}`).toBe(false)
      v.game.dragStart(); v.game.dragMove(600, 400); v.game.dragEnd()
      play(v, 0.3)
      const heard = v.game.heard()
      expect([...heard.plain, ...heard.scene], `${x},${y}`).toEqual([])
      expect(v.game.w.puffs.length, `${x},${y}`).toBe(0)
      expect(v.game.w.rings.length, `${x},${y}`).toBe(0)
      expect(v.game.changed(), `${x},${y}`).toBe('no')
      expect(JSON.stringify(v.game.w.pieces.map((piece) => [piece.kind, piece.x, piece.y, piece.mode])), `${x},${y}`).toBe(before)
    }
    // Just inside the frame line the ground knocks, as it does anywhere.
    const v = visit()
    play(v, 0.5)
    v.game.heard()
    tapAt(v, 520, 804)
    expect(v.game.heard().plain.map((each) => each.name)).toEqual(['ground'])
  })
})

describe('a tap on nothing in particular', () => {
  it('is answered as what it landed on, with a sight where it landed: the sky gives a gust, the far bank a small far puff of petals, and only the near ground knocks', () => {
    const petals = (easel.view as unknown as { sheets: { props: { petals: Sheet } } }).sheets.props.petals
    // Open sky, the far hills, the far shore, and the near moss; on the bank and at a place of the brook.
    const cases: [string, number, number, 'sky' | 'far' | 'ground', string][] = [
      ['open sky', 560, 90, 'sky', 'whiff'], ['sky beside the sun', 1040, 150, 'sky', 'whiff'],
      ['the far hills', 560, 280, 'far', 'rustle'], ['the far shore', 420, 326, 'far', 'rustle'],
      ['the near moss', 520, 792, 'ground', 'ground'],
    ]
    for (const brook of [false, true]) {
      for (const [name, x, y, kind, sound] of cases) {
        const v = brook ? visit(undefined, { place: 'brook', journey: { reach: 2, stuck: false }, boat: { at: 'eddy', x: 500, aboard: true } as never }) : visit()
        play(v, 0.5)
        v.game.heard()
        easel.frame(v.game.w)
        const before = { pen: easel.surface.strokes + easel.surface.fills, petals: easel.surface.stamped.filter((each) => each.image === petals.sheet).length }
        tapAt(v, x, y)
        const w = v.game.w
        const heard = v.game.heard().plain.map((each) => each.name)
        expect(heard, name).toEqual([sound])
        expect(w.puffs.map((puff) => [puff.kind, puff.x, puff.y]), name).toEqual([[kind, x, y]])
        expect(v.game.changed(), name).toBe('no')
        // Seen where it landed, a moment later: a stroke of the pen in the sky, a stamp of petals on a bank.
        play(v, 0.2)
        easel.frame(w)
        const stamped = easel.surface.stamped.filter((each) => each.image === petals.sheet)
        if (kind === 'sky') {
          expect(easel.surface.strokes + easel.surface.fills, name).toBe(before.pen + 1)
          expect(stamped.length, name).toBe(0)
        } else {
          expect(stamped.length, name).toBe(before.petals + 1)
          const middle = { x: (stamped[0].x / 2 - by.x) / by.scale, y: (stamped[0].y / 2 - by.y) / by.scale }
          expect(Math.hypot(middle.x - x, middle.y - y), name).toBeLessThan(40)
          // The puff off the far bank is further away, and so smaller than the one off the near ground.
          expect(stamped[0].w, name).toBeLessThan(kind === 'far' ? 120 : 400)
        }
        expect(brook ? w.frame : -1, name).toBe(brook ? 2 : -1)
      }
    }
  })
})

describe('a thing let go where it cannot lie', () => {
  it('hops to the nearest free place in an arc that is seen, and does not blink there: a hull or a berry on the stone the boat has left, a cap on top of the pebble', () => {
    const cases: [string, 'walnut' | 'berry' | 'cap', { x: number; y: number }][] = [
      ['a hull on the stone while the boat floats', 'walnut', { x: SEAT.x, y: SEAT.y - 30 }],
      ['a berry on the stone while the boat floats', 'berry', { x: SEAT.x, y: SEAT.y + 10 }],
      ['a cap on top of the pebble', 'cap', { x: LAID.pebble.x, y: LAID.pebble.y }],
    ]
    for (const [name, kind, to] of cases) {
      const v = visit({})
      launchBoat(v)
      play(v, 2.5)
      const w = v.game.w
      expect(w.boat.mode, name).toBe('afloat')
      const piece = w.pieces.find((each) => each.kind === kind && each.place.on === 'bank')
      if (!piece) throw new Error(kind)
      carryTo(v, { x: piece.x, y: piece.y }, to)
      // It is not there in a blink: it is in the air for most of half a second, up over the straight way.
      expect(piece.mode, name).toBe('fly')
      expect(piece.place.on, name).toBe('bank')
      const end = piece.place.on === 'bank' ? { x: piece.place.x, y: piece.place.y } : to
      expect(Math.hypot(end.x - to.x, end.y - to.y), name).toBeGreaterThan(30)
      let frames = 0, lifted = 0
      const from = { x: piece.x, y: piece.y }
      while (piece.mode === 'fly' && frames < 200) {
        play(v, STEP)
        frames += 1
        const k = Math.min(1, frames * STEP / 0.45)
        lifted = Math.max(lifted, from.y + (end.y - from.y) * k - piece.y)
      }
      expect(frames, name).toBeGreaterThanOrEqual(20)
      expect(lifted, name).toBeGreaterThan(30)
      // It lies on free ground, off the stone, and the boat floats on as it was.
      expect([piece.x, piece.y], name).toEqual([end.x, end.y])
      expect(overlaps(boxOf(kind, end), STONE_TOP), name).toBe(false)
      expect(w.boat.mode, name).toBe('afloat')
      expect(v.game.save().loose.some((each) => each.kind === kind && each.x === Math.round(end.x) && each.y === Math.round(end.y)), name).toBe(true)
    }
    // Let go on free sand it lies where it was put, with no hop.
    const v = visit({})
    play(v, 0.3)
    const berry = v.game.w.pieces.find((each) => each.kind === 'berry')
    if (!berry) throw new Error('berry')
    carryTo(v, LAID.berry, { x: 590, y: 786 })
    expect(berry.place).toMatchObject({ on: 'bank', x: 590, y: 786 })
    play(v, 0.2)
    expect(berry.mode).toBe('rest')
  })
})
