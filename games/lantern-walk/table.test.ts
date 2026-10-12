import { describe, expect, it } from 'vitest'
import { GRACE } from './game'
import { Hand, woodSave } from './hand'
import { SURFACES } from './layout'
import { freshSave } from './save'
import { fit } from './stage'
import { STEP } from './wood'
import { CANDLE_REST, CUT_SHOWN, EDGE, LANDS, PAPER_RESTS, PILE, ROLLED, SCISSORS_BOX, SHEET, SLIP, TOP, WICK, fromSheet } from './table'

// What the sheet promises of the table, each held by a test that plays it
// through the path the Mount uses and fails when the thing is taken out:
// a rolled sheet unrolls by the same move backwards, a cut begun at the
// sheet's right-hand strip cuts, a slip off the pile changes nothing, what
// the ghost hand shows is a move that works, a second finger is answered,
// and a scrap lies on the table until it is off its front edge.

const middle = (b: { left: number; right: number; top: number; bottom: number }) => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 })
/** The papers behind the windows of the sheet, in order. */
const papers = (hand: Hand) => hand.table.sheet.map((window) => window.paper).join(',')

/** A hand at the table with the sheet rolled by its edge. */
function rolled(): Hand {
  const hand = new Hand(freshSave(4))
  hand.drag(EDGE.left + 30, 440, SHEET.left + 60, 440, 500)
  hand.wait(GRACE + 0.3)
  expect(hand.table.made).toBe('rolled')
  return hand
}

describe('rolling and unrolling', () => {
  it('a rolled sheet is unrolled by the same move backwards: dragged to the right, it lies flat again as it was cut', () => {
    const hand = rolled()
    const was = papers(hand)
    const at = middle(ROLLED)
    hand.drag(at.x, at.y, at.x + 230, at.y, 400)
    hand.wait(GRACE + 2)
    expect(hand.table.made).toBe('flat')
    expect(hand.table.rolled).toBe(0)
    expect(hand.count('unroll')).toBe(1)
    expect(papers(hand)).toBe(was)
    expect(hand.game.toSave().made).toBe('flat')
    // And flat, it can be cut again.
    const a = fromSheet(30, 60), b = fromSheet(50, 60), c = fromSheet(50, 85), d = fromSheet(30, 85)
    hand.down(a.x, a.y); hand.slide(b.x, b.y, 300); hand.slide(c.x, c.y, 300); hand.slide(d.x, d.y, 300); hand.up()
    hand.wait(GRACE + 0.1)
    expect(hand.table.sheet).toHaveLength(4)
  })

  it('a drag that stops short of half way leaves it rolled', () => {
    const hand = rolled()
    const at = middle(ROLLED)
    hand.drag(at.x, at.y, at.x + 90, at.y, 400)
    hand.wait(GRACE + 2)
    expect(hand.table.made).toBe('rolled')
    expect(hand.table.rolled).toBe(1)
    expect(hand.count('unroll')).toBe(0)
  })

  it('with the candle in, it unrolls as well, and the candle slides back to its place', () => {
    const hand = rolled()
    hand.drag(CANDLE_REST.x, CANDLE_REST.y, WICK.x, WICK.y + 90, 500)
    hand.wait(GRACE + 0.3)
    expect(hand.table.made).toBe('candle')
    const at = middle(ROLLED)
    hand.drag(at.x, at.y, at.x + 230, at.y, 400)
    hand.wait(GRACE + 1)
    expect(hand.table.made).toBe('flat')
    expect([hand.table.candle.x, hand.table.candle.y]).toEqual([CANDLE_REST.x, CANDLE_REST.y])
    expect(hand.game.sceneRunning).toBe(false)
    expect(hand.game.place).toBe('table')
  })

  it('a finger that only slips on the lantern with the candle in has tapped the wick: it lights, by a tap and by a slip of up to a finger\'s width', () => {
    for (const slip of [0, 30, SLIP - 4]) {
      const hand = rolled()
      hand.drag(CANDLE_REST.x, CANDLE_REST.y, WICK.x, WICK.y + 90, 500)
      hand.wait(GRACE + 0.3)
      hand.drag(WICK.x, WICK.y + 60, WICK.x + slip, WICK.y + 60, 300)
      hand.wait(GRACE + 0.2)
      expect(hand.game.sceneRunning, String(slip)).toBe(true)
      expect(hand.table.made, String(slip)).toBe('lit')
    }
  })

  it('a cut begun in the sheet\'s right-hand strip cuts and does not roll: the sheet is rolled by its edge only', () => {
    const hand = new Hand(freshSave(8))
    // A hundredth of the sheet from its right-hand side, and round a window.
    const a = { x: SHEET.right - 4, y: 400 }, b = { x: SHEET.right - 110, y: 400 }, c = { x: SHEET.right - 110, y: 500 }, d = { x: SHEET.right - 4, y: 500 }
    hand.down(a.x, a.y)
    expect(hand.table.hand?.kind).toBe('cut')
    hand.slide(b.x, b.y, 300); hand.slide(c.x, c.y, 300); hand.slide(d.x, d.y, 300)
    expect(hand.table.rolled).toBe(0)
    hand.up()
    hand.wait(GRACE + 0.3)
    expect(hand.table.made).toBe('flat')
    expect(hand.table.sheet).toHaveLength(1)
    expect(hand.count('roll')).toBe(0)
    // The edge itself lies outside the sheet, and is as wide as a finger at both sizes.
    expect(EDGE.left).toBeGreaterThan(SHEET.right)
    for (const surface of SURFACES) expect((EDGE.right - EDGE.left) * fit(surface.width, surface.height).scale).toBeGreaterThanOrEqual(48)
  })
})

describe('the pile', () => {
  it('lies a finger\'s width from the scissors at both sizes, counting the slack round each', () => {
    for (const surface of SURFACES) {
      const scale = fit(surface.width, surface.height).scale
      expect((SCISSORS_BOX.top - 6 - (PILE.bottom + 6)) * scale, `${surface.width}`).toBeGreaterThanOrEqual(48)
    }
  })

  it('a slip off the pile does not swap the sheet: a fresh sheet lands only when it is carried as far as the sheet\'s place', () => {
    const from = middle(PILE)
    for (const [dx, dy] of [[0, 15], [-15, 0], [-SLIP, 20], [-40, 60], [30, 40]]) {
      const hand = new Hand(freshSave(4))
      // A paper is changed first, so a swap would show.
      hand.table.sheet[0].paper = null
      const was = papers(hand)
      hand.drag(from.x, from.y, from.x + dx, from.y + dy, 300)
      hand.wait(GRACE + 0.5)
      expect(papers(hand), `${dx}, ${dy}`).toBe(was)
      expect(hand.count('land'), `${dx}, ${dy}`).toBe(0)
    }
    // The pile is further from where a sheet lands than any slip.
    expect(PILE.left - 6 - LANDS).toBeGreaterThan(SLIP)
    const hand = new Hand(freshSave(4))
    hand.table.sheet[0].paper = null
    hand.drag(from.x, from.y, LANDS - 10, 440, 300)
    hand.wait(GRACE + 0.5)
    expect(hand.count('land')).toBe(1)
    expect(papers(hand)).toBe(papers(new Hand(freshSave(4))))
  })
})

describe('a slip and a sheet let go short', () => {
  /** A hand at the table with the lantern rolled and the candle in. */
  const withCandle = (): Hand => {
    const hand = rolled()
    hand.drag(CANDLE_REST.x, CANDLE_REST.y, WICK.x, WICK.y + 90, 500)
    hand.wait(GRACE + 0.3)
    expect(hand.table.made).toBe('candle')
    return hand
  }

  it('a slip is measured whichever way the finger goes, 60 units in all: up, down, across or aslant it lights, and further than that it does not', () => {
    expect(SLIP).toBe(60)
    for (const [dx, dy, lights] of [[0, SLIP - 4, true], [0, -(SLIP - 4), true], [-(SLIP - 4), 0, true], [40, 40, true], [0, SLIP + 20, false], [0, -(SLIP + 30), false], [46, 46, false], [0, 140, false]] as const) {
      const hand = withCandle()
      hand.drag(WICK.x, WICK.y + 60, WICK.x + dx, WICK.y + 60 + dy, 300)
      hand.wait(GRACE + 0.2)
      expect(hand.table.made === 'lit', `${dx}, ${dy}`).toBe(lights)
      expect(hand.game.sceneRunning, `${dx}, ${dy}`).toBe(lights)
      expect(hand.count('catch'), `${dx}, ${dy}`).toBe(lights ? 1 : 0)
    }
    // And a finger that went further and came back has not slipped: it went.
    const hand = withCandle()
    hand.down(WICK.x, WICK.y + 60)
    hand.slide(WICK.x, WICK.y + 60 + SLIP + 30, 300)
    hand.slide(WICK.x, WICK.y + 62, 300)
    hand.up()
    hand.wait(GRACE + 0.2)
    expect(hand.table.made).not.toBe('lit')
  })

  it('a fresh sheet let go short of the sheet\'s place slides back onto the pile, seen and heard: it never vanishes, and the sheet on the table is as it was', () => {
    const from = middle(PILE)
    for (const [x, y] of [[LANDS + 30, 440], [LANDS + 90, 560], [from.x - 30, from.y + 150]]) {
      const hand = new Hand(freshSave(4))
      hand.frame = STEP
      // A paper is changed first, so a swap would show.
      hand.table.sheet[0].paper = null
      const was = papers(hand)
      hand.down(from.x, from.y)
      hand.slide(x, y, 400)
      expect(hand.table.hand?.kind).toBe('fresh')
      hand.up()
      const along: number[] = []
      let heardAt = -1
      hand.after = (events) => { if (events.some((event) => event.kind === 'back')) heardAt = along.length }
      hand.watch = () => { along.push(hand.table.freshBack.along) }
      hand.wait(GRACE + 1)
      expect(hand.count('back'), `${x}, ${y}`).toBe(1)
      expect(hand.count('land'), `${x}, ${y}`).toBe(0)
      expect(hand.count('off'), `${x}, ${y}`).toBe(0)
      // From where it was let go, all the way: the slide begins in the step that sounds, rises, and ends on the pile.
      const first = along.findIndex((v) => v < 1)
      expect(first).toBeGreaterThanOrEqual(0)
      expect(heardAt).toBe(first)
      expect(hand.table.freshBack.x).toBe(x)
      expect(hand.table.freshBack.y).toBe(y)
      const slide = along.slice(first, along.lastIndexOf(1) + 1).filter((v, i, all) => i === 0 || v !== all[i - 1])
      expect(slide.length).toBeGreaterThan(30)
      for (let i = 1; i < slide.length; i++) expect(slide[i]).toBeGreaterThan(slide[i - 1])
      expect(along[along.length - 1]).toBe(1)
      expect(papers(hand), `${x}, ${y}`).toBe(was)
    }
  })
})

describe('what the ghost hand shows at the table is a move that works', () => {
  const aimOf = (hand: Hand, showing: number) => hand.table.aim({ fromX: 0, fromY: 0, toX: 0, toY: 0, tap: false, glow: SHEET, path: null }, showing)

  it('on a sheet with no window it shows a cut that closes: followed by a finger, it is a window', () => {
    const hand = new Hand(freshSave(8))
    const aim = aimOf(hand, 0)
    expect(aim.path).toBe(CUT_SHOWN)
    const n = CUT_SHOWN.length
    expect([CUT_SHOWN[n - 2], CUT_SHOWN[n - 1]]).toEqual([CUT_SHOWN[0], CUT_SHOWN[1]])
    expect([aim.fromX, aim.fromY, aim.toX, aim.toY]).toEqual([CUT_SHOWN[0], CUT_SHOWN[1], CUT_SHOWN[0], CUT_SHOWN[1]])
    hand.down(CUT_SHOWN[0], CUT_SHOWN[1])
    for (let i = 2; i < n; i += 2) hand.slide(CUT_SHOWN[i], CUT_SHOWN[i + 1], 300)
    hand.up()
    hand.wait(GRACE + 0.2)
    expect(hand.table.sheet).toHaveLength(1)
    expect(hand.table.sheet[0].cut).toBe(true)
  })

  it('once in each idle stretch, the third showing, it sets the candle on the flat sheet: followed by a finger, that rolls the lantern with the candle in', () => {
    for (const age of [4, 8]) {
      const hand = new Hand(freshSave(age))
      expect(aimOf(hand, 0).fromX).not.toBe(CANDLE_REST.x)
      expect(aimOf(hand, 1).fromX).not.toBe(CANDLE_REST.x)
      expect(aimOf(hand, 3).fromX).not.toBe(CANDLE_REST.x)
      const aim = aimOf(hand, 2)
      expect([aim.fromX, aim.fromY]).toEqual([CANDLE_REST.x, CANDLE_REST.y])
      expect(aim.path).toBeNull()
      hand.drag(aim.fromX, aim.fromY, aim.toX, aim.toY, 400)
      hand.wait(GRACE + 0.3)
      expect(hand.table.made, String(age)).toBe('candle')
    }
  })

  it('with a window that has no paper it shows a different paper each time: all three in the four showings of one idle stretch', () => {
    const hand = new Hand(freshSave(4))
    hand.table.sheet[0].paper = null
    const shown = new Set([0, 1, 3].map((showing) => aimOf(hand, showing).fromY))
    expect(shown.size).toBe(3)
  })
})

describe('a second finger at the table', () => {
  it('while one finger cuts, another that lands is answered where it lands with a knock on the wood and the cat\'s ear, and the cut goes on', () => {
    const hand = new Hand(freshSave(8))
    const a = fromSheet(30, 30), b = fromSheet(60, 30), c = fromSheet(60, 60), d = fromSheet(30, 60)
    hand.down(a.x, a.y); hand.slide(b.x, b.y, 300)
    const before = hand.count('tap')
    expect(hand.down(300, 700, 2)).toBe(false)
    expect(hand.count('tap')).toBe(before + 1)
    expect([hand.table.knock.x, hand.table.knock.y, hand.table.knock.pulse]).toEqual([300, 700, 1])
    expect(hand.table.cat.ear).toBe(1)
    expect(hand.table.hand?.kind).toBe('cut')
    hand.up(2)
    hand.slide(c.x, c.y, 300); hand.slide(d.x, d.y, 300); hand.up()
    hand.wait(GRACE + 0.2)
    expect(hand.table.sheet).toHaveLength(1)
  })
})

describe('scraps', () => {
  it('a scrap lies flat on the table and slides to its front edge before it falls: it does not turn or fall through the table top', () => {
    const hand = new Hand(freshSave(8))
    hand.frame = 1 / 120
    const a = fromSheet(30, 20), b = fromSheet(50, 20), c = fromSheet(50, 40), d = fromSheet(30, 40)
    hand.down(a.x, a.y); hand.slide(b.x, b.y, 300); hand.slide(c.x, c.y, 300); hand.slide(d.x, d.y, 300); hand.up()
    let onTop = 0, falling = 0
    hand.watch = () => {
      for (const scrap of hand.table.scraps) {
        if (scrap.landed >= 0) continue
        if (scrap.y <= TOP.bottom) { onTop++; expect(scrap.spin).toBe(0) } else if (scrap.spin > 0) falling++
      }
    }
    hand.wait(3)
    expect(hand.table.scraps).toHaveLength(1)
    expect(onTop).toBeGreaterThan(20)
    expect(falling).toBeGreaterThan(5)
    expect(hand.table.scraps[0].landed).toBeGreaterThanOrEqual(0)
  })
})

describe('relighting in the wood', () => {
  it('a candle that is out is lit by a tap on the lantern and by a drag that begins on it: never by nothing, and a touch on it is never met by nothing', () => {
    const tapped = new Hand(woodSave({ lit: false, lantern: { x: 600, y: 600 } }))
    tapped.tap(tapped.wood.lantern.x, tapped.wood.lantern.y)
    expect(tapped.wood.lit).toBe(true)
    const dragged = new Hand(woodSave({ lit: false, lantern: { x: 600, y: 600 } }))
    dragged.down(dragged.wood.lantern.x, dragged.wood.lantern.y)
    expect(dragged.wood.lit).toBe(false)
    dragged.slide(dragged.wood.lantern.x - 120, dragged.wood.lantern.y + 30, 300)
    expect(dragged.wood.lit).toBe(true)
    expect(dragged.count('strike')).toBe(1)
    // A drag that begins on the pole's grip, away from the lantern, carries it and lights nothing.
    const carried = new Hand(woodSave({ lit: false, lantern: { x: 600, y: 600 } }))
    carried.carry(400, 600, 300, 0.5)
    expect(carried.wood.lit).toBe(false)
    // And left alone, it stays dark.
    const left = new Hand(woodSave({ lit: false, lantern: { x: 600, y: 600 } }))
    left.wait(6)
    expect(left.wood.lit).toBe(false)
  })
})

describe('the cat and a paper that slides back', () => {
  it('the scamper sounds only when the cat moves: a second paper dropped where the cat already sits slides back with its own sound and the cat stays', () => {
    const hand = new Hand(freshSave(4))
    const red = middle(PAPER_RESTS.red), blue = middle(PAPER_RESTS.blue)
    // Dropped on the bare table below the papers, where no window is.
    hand.drag(red.x, red.y, 250, 612, 500)
    hand.wait(GRACE + 0.1)
    expect(hand.count('back')).toBe(1)
    expect(hand.count('scamper')).toBe(1)
    hand.wait(3)
    const sat = hand.table.cat.x
    expect(hand.table.cat.to).toBe(sat)
    let moved = 0, slid = 0
    hand.watch = () => { moved = Math.max(moved, Math.abs(hand.table.cat.x - sat)); slid = Math.max(slid, hand.table.back.along < 1 ? 1 : 0) }
    hand.drag(blue.x, blue.y, 250, 612, 500)
    hand.wait(GRACE + 1)
    expect(hand.count('back')).toBe(2)
    expect(slid).toBe(1)
    expect(hand.count('scamper')).toBe(1)
    expect(moved).toBe(0)
  })

  it('a tap on the pile with the cat at its place makes the slide\'s own small sound and movement, and no scamper', () => {
    const hand = new Hand(freshSave(4))
    const pile = middle(PILE)
    let slid = false
    hand.watch = () => { if (hand.table.freshBack.along < 1) slid = true }
    hand.tap(pile.x, pile.y)
    hand.wait(1)
    expect(hand.count('back')).toBe(1)
    expect(hand.count('scamper')).toBe(0)
    expect(slid).toBe(true)
    expect(hand.table.cat.x).toBe(hand.table.cat.to)
  })
})
