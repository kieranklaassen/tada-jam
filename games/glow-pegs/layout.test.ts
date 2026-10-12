import { describe, expect, it } from 'vitest'
import { BOARD, COLS, HOLES, HOLE_MARK, MOTH_RADIUS, MOTH_TOUCH, PEG_RADIUS, PITCH, ROWS, centreOf, holeUnder, perchOf } from './board'
import { AT_REST, BULBS, BUTTONS, BUTTON_CORNER, BUTTON_HALF, CRADLE, ECHO_LINE, GECKO, GROWN_UP_CORNER, HANDLE, HOME_CONTROL, LEVER, MOTH_HOME, RAILS, RIDE_Y, SPEAKER, SPIDER, WELL, handPlace, inGrownUpCorner, keptClear, keyMarks, knobAt, targetBoxes, wellMouth, whatIsAt, type Places } from './layout'
import { MOTH_SIZE } from './figures'
import { STAGE, fit } from './stage'

/** The surfaces a child sees: the kid shell is landscape. The two tablet sizes, and a short landscape one. */
const SHORT: [number, number] = [1180, 640]
const SIZES: [number, number][] = [[1180, 820], [1024, 768], SHORT]
/** A surface held upright, which the shell covers with its turn-the-device card: the stage is only fitted into it. */
const UPRIGHT: [number, number] = [820, 1180]
const laidOut = (width: number, height: number) => ({ fit: fit(width, height) })
const withMoth = (moth: { x: number; y: number } | null): Places => ({ ...AT_REST, moth })

describe('what a touch lands on', () => {
  it('is a hole anywhere on the board, a well in the tray, a key, the lever, the handle, a watcher, the loudspeaker, or bare backdrop', () => {
    const hole = centreOf(40)
    expect(whatIsAt(hole.x, hole.y, AT_REST)).toEqual({ kind: 'hole', hole: 40 })
    expect(whatIsAt(wellMouth(3).x, wellMouth(3).y, AT_REST)).toEqual({ kind: 'well', colour: 3 })
    for (const button of BUTTONS) expect(whatIsAt(button.x, button.y, AT_REST)).toEqual({ kind: 'button', mirror: button.mirror })
    for (const down of [0, 0.5, 1]) expect(whatIsAt(knobAt(down).x, knobAt(down).y, AT_REST)).toEqual({ kind: 'lever' })
    expect(whatIsAt(HANDLE.x, HANDLE.y, AT_REST)).toEqual({ kind: 'handle' })
    // The handle's ball where it hangs, from its top to its bottom and from side to side.
    for (const [dx, dy] of [[0, -24], [0, 40], [-30, 12], [30, 12]]) expect(whatIsAt(HANDLE.x + dx, HANDLE.y + dy, AT_REST)).toEqual({ kind: 'handle' })
    // The slot under the target is bare backdrop: a pull begun there could not be finished on the surface.
    expect(whatIsAt(HANDLE.x, HANDLE.bottom + 1, AT_REST)).toEqual({ kind: 'bare' })
    expect(whatIsAt(SPIDER.x, SPIDER.y, AT_REST)).toEqual({ kind: 'spider' })
    expect(whatIsAt(GECKO.x, GECKO.y, AT_REST)).toEqual({ kind: 'gecko' })
    expect(whatIsAt(SPEAKER.x, SPEAKER.y, AT_REST)).toEqual({ kind: 'speaker' })
    expect(whatIsAt(600, 596, AT_REST)).toEqual({ kind: 'bare' })
  })

  it('lets the handle\'s pull be finished on the surface wherever the handle is grabbed, at 1180 by 820 and at 1024 by 768', () => {
    for (const [width, height] of [[1180, 820], [1024, 768]]) {
      const by = fit(width, height)
      for (let x = HANDLE.left; x <= HANDLE.right; x += 8) for (let y = HANDLE.top; y <= HANDLE.bottom; y += 1) {
        expect(whatIsAt(x, y, AT_REST), `${x}, ${y}`).toEqual({ kind: 'handle' })
        // Where the finger is when the handle is at its stop, in the surface's own pixels: on the surface, a finger's room inside its lower edge.
        const stop = (y + HANDLE.stop) * by.scale + by.y
        expect(stop, `${width} by ${height}, grabbed at ${y}`).toBeLessThanOrEqual(height - 16)
        expect(x * by.scale + by.x).toBeGreaterThanOrEqual(16)
        expect(x * by.scale + by.x).toBeLessThanOrEqual(width - 16)
      }
    }
    // The stop is inside the stage itself, so it is on any surface the stage is fitted into.
    expect(HANDLE.bottom + HANDLE.stop).toBeLessThanOrEqual(STAGE.height - 16)
  })

  it('stands the peg in hand inside its own well\'s target and below the board\'s bottom row', () => {
    for (const colour of [1, 2, 3, 4, 5] as const) {
      const at = handPlace(colour)
      expect(whatIsAt(at.x, at.y, AT_REST)).toEqual({ kind: 'well', colour })
      // The whole of the peg, not only its middle.
      expect(at.y - PEG_RADIUS).toBeGreaterThanOrEqual(WELL.y)
      expect(at.y - PEG_RADIUS).toBeGreaterThan(BOARD.y + BOARD.height)
      expect(at.x - PEG_RADIUS).toBeGreaterThanOrEqual(WELL.x + (colour - 1) * WELL.width)
      expect(at.x + PEG_RADIUS).toBeLessThanOrEqual(WELL.x + colour * WELL.width)
    }
  })

  it('touches each thing that moves where it is drawn now: the spider down its thread, the gecko slid down the wall', () => {
    const dropped: Places = { ...AT_REST, spider: { x: SPIDER.x, y: SPIDER.y + 180 } }
    expect(whatIsAt(SPIDER.x, SPIDER.y + 180, dropped).kind).toBe('spider')
    expect(whatIsAt(SPIDER.x, SPIDER.y - 40, dropped).kind).not.toBe('spider')
    const slid: Places = { ...AT_REST, geckoSlide: 40 }
    expect(whatIsAt(GECKO.x, GECKO.top + 20, slid).kind).not.toBe('gecko')
    expect(whatIsAt(GECKO.x, GECKO.bottom + 30, slid).kind).toBe('gecko')
  })
})

describe('the moth beside its hole', () => {
  it('takes a touch within 32 units of its corner, wins where that overlaps a hole, and gives the same point to the hole when it is away', () => {
    expect(MOTH_TOUCH).toBe(32)
    for (let hole = 0; hole < HOLES; hole++) {
      const perch = perchOf(hole)
      for (const [dx, dy] of [[0, 0], [31, 0], [0, -31], [-22, 22]]) expect(whatIsAt(perch.x + dx, perch.y + dy, withMoth(perch)).kind).toBe('moth')
      expect(whatIsAt(perch.x + 33, perch.y, withMoth(perch)).kind).not.toBe('moth')
      if (holeUnder(perch.x, perch.y) >= 0) expect(whatIsAt(perch.x, perch.y, withMoth(null)).kind).toBe('hole')
      // The moth takes no touch from the middle of any hole.
      const at = centreOf(hole)
      expect(whatIsAt(at.x, at.y, withMoth(perch))).toEqual({ kind: 'hole', hole })
    }
    expect(whatIsAt(MOTH_HOME.x, MOTH_HOME.y, withMoth(MOTH_HOME)).kind).toBe('moth')
  })

  it('is a target of 48 pixels or more each way at each surface a child sees, and as wide as a hole wherever a hole is', () => {
    for (const [width, height] of SIZES) expect(MOTH_TOUCH * 2 * laidOut(width, height).fit.scale, `${width} by ${height}`).toBeGreaterThanOrEqual(48)
    expect(MOTH_TOUCH * 2).toBe(PITCH)
  })

  it('covers no hole mark and no peg, at each surface size', () => {
    for (const [width, height] of SIZES) {
      const scale = laidOut(width, height).fit.scale
      for (let hole = 0; hole < HOLES; hole++) {
        const perch = perchOf(hole)
        for (let other = 0; other < HOLES; other++) {
          const at = centreOf(other)
          // In pixels of the surface: the moth's body clear of the peg's cap, and so of the smaller hole mark.
          const gap = (Math.hypot(perch.x - at.x, perch.y - at.y) - MOTH_RADIUS - PEG_RADIUS) * scale
          expect(gap, `moth of ${hole} and hole ${other} at ${width}`).toBeGreaterThanOrEqual(0)
        }
      }
      // At its bulb it is above the board altogether.
      expect((BOARD.y - (MOTH_HOME.y + MOTH_RADIUS)) * scale).toBeGreaterThan(0)
    }
    expect(HOLE_MARK).toBeLessThan(PEG_RADIUS)
    expect(MOTH_RADIUS + PEG_RADIUS).toBeLessThanOrEqual(Math.hypot(PITCH / 2, PITCH / 2))
    expect(COLS * ROWS).toBe(HOLES)
  })
})

describe('what a mirror key shows', () => {
  it('is one solid peg, small hollow echoes and the fold lines, the folds the largest marks: never one, two and four like marks', () => {
    expect([0, 1, 2].map((mirror) => keyMarks(mirror as 0 | 1 | 2).echoes.length)).toEqual([0, 1, 3])
    expect([0, 1, 2].map((mirror) => keyMarks(mirror as 0 | 1 | 2).folds.length)).toEqual([0, 1, 2])
    for (const mirror of [0, 1, 2] as const) {
      const marks = keyMarks(mirror), button = BUTTONS[mirror]
      // Every echo is clearly smaller than the one solid peg: half its size or a little more.
      for (const echo of marks.echoes) expect(echo.r).toBeLessThanOrEqual(marks.peg.r * 0.55)
      // Each fold runs into the rim at both ends, on the rim's straight part, and is longer than anything else on the key is wide.
      for (const [x1, y1, x2, y2] of marks.folds) {
        const long = Math.hypot(x2 - x1, y2 - y1)
        expect(long).toBe(BUTTON_HALF * 2)
        expect(long).toBeGreaterThan(marks.peg.r * 2 * 2)
        const upright = x1 === x2
        expect(upright || y1 === y2).toBe(true)
        if (upright) {
          expect([y1, y2]).toEqual([button.y - BUTTON_HALF, button.y + BUTTON_HALF])
          expect(Math.abs(x1 - button.x)).toBeLessThan(BUTTON_HALF - BUTTON_CORNER)
        } else {
          expect([x1, x2]).toEqual([button.x - BUTTON_HALF, button.x + BUTTON_HALF])
          expect(Math.abs(y1 - button.y)).toBeLessThan(BUTTON_HALF - BUTTON_CORNER)
        }
      }
      // The solid peg sits in the same place on every key, up and left of the middle: the first key is no die's one.
      expect({ x: marks.peg.x - button.x, y: marks.peg.y - button.y, r: marks.peg.r }).toEqual({ x: keyMarks(0).peg.x - BUTTONS[0].x, y: keyMarks(0).peg.y - BUTTONS[0].y, r: keyMarks(0).peg.r })
      expect(button.x - marks.peg.x).toBeGreaterThanOrEqual(10)
      expect(button.y - marks.peg.y).toBeGreaterThanOrEqual(10)
      // The hole in an echo is seen: inside its line it is 8 pixels or more across at pixel ratio 1, at each surface a child sees.
      for (const echo of marks.echoes) for (const [width, height] of SIZES) expect((echo.r * 2 - ECHO_LINE) * fit(width, height).scale, `${width} by ${height}`).toBeGreaterThanOrEqual(8)
      // A fold lies between the peg and its echo, and touches neither.
      for (const [x1, y1, x2] of marks.folds) {
        const upright = x1 === x2
        for (const mark of [marks.peg, ...marks.echoes]) expect(Math.abs(upright ? mark.x - x1 : mark.y - y1)).toBeGreaterThan(mark.r + 2)
      }
      for (const mark of [marks.peg, ...marks.echoes]) {
        expect(Math.abs(mark.x - button.x) + mark.r).toBeLessThan(BUTTON_HALF)
        expect(Math.abs(mark.y - button.y) + mark.r).toBeLessThan(BUTTON_HALF)
      }
    }
  })
})

describe('where the targets stand', () => {
  it('keeps every target on the stage and 48 pixels or more each way, at each surface a child sees', () => {
    for (const [width, height] of SIZES) {
      const scale = laidOut(width, height).fit.scale
      for (const box of targetBoxes()) {
        const name = `${box.name} at ${width} by ${height}`
        expect(box.left, name).toBeGreaterThanOrEqual(0)
        expect(box.top, name).toBeGreaterThanOrEqual(0)
        expect(box.right, name).toBeLessThanOrEqual(STAGE.width)
        expect(box.bottom, name).toBeLessThanOrEqual(STAGE.height)
        expect((box.right - box.left) * scale, name).toBeGreaterThanOrEqual(48)
        expect((box.bottom - box.top) * scale, name).toBeGreaterThanOrEqual(48)
      }
      // A hole, a key, a well, the lever and the handle, each in pixels.
      expect(PITCH * scale).toBeGreaterThanOrEqual(48)
      expect(BUTTON_HALF * 2 * scale).toBeGreaterThanOrEqual(48)
      expect(WELL.width * scale).toBeGreaterThanOrEqual(48)
      expect((LEVER.right - LEVER.left) * scale).toBeGreaterThanOrEqual(48)
      expect((HANDLE.right - HANDLE.left) * scale).toBeGreaterThanOrEqual(48)
    }
  })

  it('holds 48 pixels down to a landscape surface 615 high, which is as far as a hole can be held; held upright the stage is only fitted in, and a hole there is 44', () => {
    // The smallest target is a hole's cell and the moth, 64 units: 48 pixels at three quarters of the stage's size.
    const smallest = Math.min(PITCH, MOTH_TOUCH * 2, BUTTON_HALF * 2, ...targetBoxes().map((box) => Math.min(box.right - box.left, box.bottom - box.top)))
    expect(smallest).toBe(64)
    expect(smallest * fit(1180, 615).scale).toBeGreaterThanOrEqual(48)
    expect(smallest * fit(1180, 610).scale).toBeLessThan(48)
    // A child never sees the upright size: the shell lays its turn-the-device card over it.
    const upright = fit(...UPRIGHT).scale
    expect(Math.floor(PITCH * upright)).toBe(44)
    expect(Math.floor(BUTTON_HALF * 2 * upright)).toBe(47)
    expect(Math.floor(MOTH_TOUCH * 2 * upright)).toBe(44)
  })

  it('lets no two targets overlap', () => {
    const boxes = targetBoxes()
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j]
        const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top
        expect(apart, `${a.name} and ${b.name}`).toBe(true)
      }
    }
  })

  it('puts nothing that answers as a control or a character under the home control or in the grown-up\'s corner, at any surface size', () => {
    for (const [width, height] of [...SIZES, UPRIGHT]) {
      const { fit } = laidOut(width, height), kept = keptClear(width, fit)
      for (const box of targetBoxes()) {
        for (const clear of [kept.home, kept.corner]) {
          const apart = box.right <= clear.left || clear.right <= box.left || box.bottom <= clear.top || clear.bottom <= box.top
          expect(apart, `${box.name} at ${width} by ${height}`).toBe(true)
        }
      }
      // The corner is the top right 72 pixels of the surface, whatever the stage's fit.
      expect(inGrownUpCorner(width - 1, 0, width)).toBe(true)
      expect(inGrownUpCorner(width - GROWN_UP_CORNER, GROWN_UP_CORNER - 1, width)).toBe(true)
      expect(inGrownUpCorner(width - GROWN_UP_CORNER - 1, 10, width)).toBe(false)
      expect(inGrownUpCorner(width - 10, GROWN_UP_CORNER, width)).toBe(false)
      // A touch under the home control is bare backdrop.
      const under = { x: (width / 2 - fit.x) / fit.scale, y: (34 - fit.y) / fit.scale }
      expect(whatIsAt(under.x, under.y, AT_REST)).toEqual({ kind: 'bare' })
    }
  })
})

describe('the marquee and the home control', () => {
  it('hangs its cradle under the control and keeps both rails off it, with pixels to spare, at each surface size, on a short surface and held upright', () => {
    for (const [width, height] of [...SIZES, UPRIGHT]) {
      const { fit } = laidOut(width, height), name = `${width} by ${height}`
      // The control: a round thing 48 pixels across, 10 from the top, in the middle of the surface, here in stage units.
      const r = HOME_CONTROL.size / 2 / fit.scale, spare = 3 / fit.scale
      const cx = (width / 2 - fit.x) / fit.scale, cy = (HOME_CONTROL.top + HOME_CONTROL.size / 2 - fit.y) / fit.scale
      // Every point of the marquee's lines near the middle: the half ring, the two drops from the upper rail, both rails.
      const points: [number, number][] = []
      for (let i = 0; i <= 180; i++) points.push([CRADLE.x + CRADLE.r * Math.cos((i * Math.PI) / 180), CRADLE.y + CRADLE.r * Math.sin((i * Math.PI) / 180)])
      for (let y = RAILS.top; y <= CRADLE.y; y += 1) points.push([CRADLE.x - CRADLE.r, y], [CRADLE.x + CRADLE.r, y])
      for (let x = CRADLE.r; x <= 400; x += 1) points.push([CRADLE.x - x, RAILS.top], [CRADLE.x + x, RAILS.top])
      for (let x = -400; x <= 400; x += 1) points.push([CRADLE.x + x, RAILS.bottom])
      const nearest = Math.min(...points.map(([x, y]) => Math.hypot(x - cx, y - cy)))
      expect(nearest - r, name).toBeGreaterThanOrEqual(spare)
      // The control is in the middle of the cradle, and the lower rail runs under both.
      expect(Math.abs(cx - CRADLE.x), name).toBeLessThan(1)
      expect(RAILS.bottom).toBeGreaterThanOrEqual(CRADLE.y + CRADLE.r)
    }
  })

  it('carries the moth along the trapped beam well below the control, at each surface size, on a short surface and held upright', () => {
    for (const [width, height] of [...SIZES, UPRIGHT]) {
      const { fit } = laidOut(width, height)
      const bottom = (HOME_CONTROL.top + HOME_CONTROL.size - fit.y) / fit.scale
      // The moth in the air, wings wide, at the height it rides.
      expect(RIDE_Y - 27 * MOTH_SIZE.flying, `${width} by ${height}`).toBeGreaterThan(bottom + 3 / fit.scale)
    }
  })
})

describe('the marquee\'s lamps', () => {
  it('are no two alike: no two share a size, and no two hang at the same height', () => {
    for (let a = 0; a < BULBS.length; a++) {
      for (let b = a + 1; b < BULBS.length; b++) {
        expect(BULBS[a].r, `lamps ${a} and ${b}`).not.toBe(BULBS[b].r)
        expect(BULBS[a].y, `lamps ${a} and ${b}`).not.toBe(BULBS[b].y)
      }
    }
    // Each hangs between the two rails.
    for (const bulb of BULBS) {
      expect(bulb.y - bulb.r).toBeGreaterThan(RAILS.top)
      expect(bulb.y + bulb.r).toBeLessThan(RAILS.bottom)
    }
  })
})
