import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { cheeksOf, freshBadger } from './badger'
import { BADGER_STRIPE, BADGER_TEETH, BRUSH_BAND, LONG_BRUSH_BAND, NOSE_WRINKLE, OWL_BACK, OWL_TAIL, drawBadger, drawFox, drawHedgehog, drawOwl } from './figures'
import { Hand, boundsOf, meet, woodSave } from './hand'
import {
  BADGER_BOX, BADGER_HOLE, BODY_APART, CORNER_PX, FALLEN_WORM, FERN_BOX, FLAME_BOX, FOX_HOME_END, FOX_LANE, HEDGEHOG_LANE, HEDGEHOG_MAT, HOOK, HUNG_BOX, MOTHS, MOTH_BOX, MOTH_TRUNK,
  OPEN_MOTH_BOX, OWL_BOX, PAPER_BOX, PLACES, POLE, REACH, SLEEPER_BOX, SPIDER_BOX, STAGE_H, STAGE_W, STEP_BOX, STUMP_BOX, SURFACES, WIRE, WORMS, WORM_BOX, WORM_GROUND, apart, box, boxAt,
  foxBox, hedgehogBox, homeBox, perch, within, wormPlace, type Box,
} from './layout'
import { COLD_SEATS, MOTH_SIZES, bed, bedTilt, lanternBox } from './moths'
import { CANDLE_SHAPE, CAT_PAWS, CAT_STRIPES, WALL_THINGS, drawCat, liesAt, paintRoom, plasterStrokes } from './room'
import { CRACKS, HOLE_MOUTH, TWIGS, paintSetting, twigOf } from './setting'
import { freshSave } from './save'
import { sheetOf, type Paper, type SheetWindow } from './sheet'
import { Sketch } from './sketch'
import { BIG } from './seen'
import { drawSmall } from './small'
import { fit } from './stage'
import { CANDLE_BOX, CANDLE_REST, EDGE, NEAR, PAPER_RESTS, PILE, ROLLED, SCISSORS_BOX, SCISSORS_REST, SHEET, fromSheet } from './table'
import { HANG_SEATS, wormAt } from './worms'

// Nothing passes through or stands on anything, a thing is touched where it
// is drawn, and nothing to touch lies under the home control or in the
// grown-up's corner: all of it read from the one set of numbers in layout.ts
// and from the game as it is played.

const TRUNK = box(MOTH_TRUNK.left, 132, MOTH_TRUNK.right, MOTH_TRUNK.foot)
const SPIDER = boxAt(SPIDER_BOX, PLACES.spider.x, PLACES.spider.y)
const STAND: Record<string, Box> = { owl: OWL_BOX, badger: BADGER_BOX, fern: FERN_BOX, stump: STUMP_BOX, trunk: TRUNK, spider: SPIDER }

function hole(x: number, paper: Paper | null, r = 16, y = 50): SheetWindow {
  const outline: number[] = []
  for (let i = 0; i < 12; i++) outline.push(Math.round(x + Math.cos((i / 12) * Math.PI * 2) * r), Math.round(y + Math.sin((i / 12) * Math.PI * 2) * r))
  return { outline, paper, cut: true }
}

describe('nothing stands on anything', () => {
  it('at rest every room keeps clear of every other', () => {
    const rooms: Record<string, Box> = { ...STAND, fox: foxBox(PLACES.fox.x), hedgehog: hedgehogBox(PLACES.hedgehog.x), step: STEP_BOX }
    const names = Object.keys(rooms)
    const lying: string[] = []
    for (let a = 0; a < names.length; a++) for (let b = a + 1; b < names.length; b++) if (!apart(rooms[names[a]], rooms[names[b]])) lying.push(`${names[a]} on ${names[b]}`)
    expect(lying).toEqual([])
  })

  it('the fox, for the whole of its lane and at its place in the ending, stands across nothing: not the fern, not the hedgehog wherever that is', () => {
    const across: string[] = []
    const places: number[] = [FOX_HOME_END]
    for (let x = FOX_LANE.left; x <= FOX_LANE.right; x += 2) places.push(x)
    for (const x of places) {
      const fox = foxBox(x)
      for (const [name, room] of Object.entries({ ...STAND, step: STEP_BOX, hook: HUNG_BOX })) if (!apart(fox, room)) across.push(`${name} at ${x}`)
      // The hedgehog keeps a body's length to the fox's right (the two models hold that; a test below plays it).
      for (let hog = Math.max(HEDGEHOG_LANE.left, x + BODY_APART); hog <= HEDGEHOG_MAT; hog += 2) if (!apart(fox, hedgehogBox(hog))) across.push(`hedgehog at ${x}`)
    }
    expect(across).toEqual([])
    expect(FOX_HOME_END).toBeLessThanOrEqual(FOX_LANE.right)
  })

  it('the hedgehog, for the whole of its lane, stands across nothing, and on the mat it is clear of the hung lantern', () => {
    const across: string[] = []
    for (let x = HEDGEHOG_LANE.left; x <= HEDGEHOG_LANE.right; x += 2) {
      for (const [name, room] of Object.entries({ ...STAND, step: STEP_BOX })) if (!apart(hedgehogBox(x), room)) across.push(`${name} at ${x}`)
    }
    for (const [name, room] of Object.entries({ ...STAND, hook: HUNG_BOX, fox: foxBox(FOX_HOME_END) })) if (!apart(hedgehogBox(HEDGEHOG_MAT), room)) across.push(`${name} at the mat`)
    expect(across).toEqual([])
  })

  it('led to both ends of their lanes by every light and by a rush, the fox and the hedgehog never leave them, and the fox never stands on a fallen worm', () => {
    const out = new Set<string>()
    for (const paper of ['red', 'blue', 'yellow', null] as const) {
      const hand = new Hand(woodSave({ sheet: [hole(79, paper)] }))
      hand.watch = () => {
        const wood = hand.wood
        if (wood.fox.x < FOX_LANE.left || wood.fox.x > FOX_LANE.right) out.add(`fox ${paper}`)
        if (wood.hedgehog.x < HEDGEHOG_LANE.left || wood.hedgehog.x > HEDGEHOG_LANE.right) out.add(`hedgehog ${paper}`)
        const drop = wood.worms.drop
        if (drop.i >= 0 && drop.landed >= 0 && !apart(foxBox(wood.fox.x), boxAt(FALLEN_WORM, wormPlace(drop.i).x, WORM_GROUND))) out.add(`fox on a worm ${paper}`)
      }
      // Along the fox's lane and past both its ends, slowly; along the hedgehog's; then a rush each way.
      for (const [x, y] of [[300, 600], [1000, 600], [300, 600], [300, 770], [1050, 770], [300, 770]]) hand.shine(paper, x, y, 0.6, 170)
      hand.shine(paper, 1050, 620, 0.4, 1500)
      hand.shine(paper, 300, 760, 0.4, 1500)
      hand.shine(paper, 1050, 760, 0.4, 1500)
      // Under the fern in yellow, until a worm has had time to drop.
      hand.shine(paper, 520, 350, 3, 200)
      hand.up()
      hand.wait(1)
    }
    expect([...out]).toEqual([])
  })

  it('the moths keep to their own places: on the bark, asleep in a row at the foot of their tree, and on a cold lantern never on its paper or over its candle', () => {
    const perches = Array.from({ length: MOTHS }, (_, i) => boxAt(MOTH_BOX, perch(i).x, perch(i).y))
    const beds = Array.from({ length: MOTHS }, (_, i) => box(bed(i).x + SLEEPER_BOX.left * MOTH_SIZES[i], bed(i).y + SLEEPER_BOX.top * MOTH_SIZES[i], bed(i).x + SLEEPER_BOX.right * MOTH_SIZES[i], bed(i).y + SLEEPER_BOX.bottom * MOTH_SIZES[i]))
    const seats = COLD_SEATS.map(([x, y]) => box(x - 16.5, y - 36, x + 16.5, y + 22))
    // The sleepers lie in two loose heaps, wing over wing: they keep off everything else, and not off each other.
    for (const set of [perches, seats]) for (let a = 0; a < set.length; a++) for (let b = a + 1; b < set.length; b++) expect(apart(set[a], set[b]), `${a} and ${b}`).toBe(true)
    for (const place of perches) expect(within(place, TRUNK)).toBe(true)
    for (const place of beds) {
      for (let x = FOX_LANE.left; x <= FOX_LANE.right; x += 4) expect(apart(place, foxBox(x))).toBe(true)
      for (const room of [STUMP_BOX, STEP_BOX, FERN_BOX]) expect(apart(place, room)).toBe(true)
    }
    for (const seat of seats) {
      expect(apart(seat, PAPER_BOX)).toBe(true)
      expect(apart(seat, FLAME_BOX)).toBe(true)
    }
    expect(COLD_SEATS).toHaveLength(MOTHS)
  })

  /** A yellow window of the sheet, `rx` by `ry` hundredths, low on the left where the three-window sheet has its own. */
  const yellow = (rx: number, ry: number): SheetWindow => {
    const outline: number[] = []
    for (let i = 0; i < 16; i++) outline.push(Math.round(22 + Math.cos((i / 16) * Math.PI * 2) * rx), Math.round(66 + Math.sin((i / 16) * Math.PI * 2) * ry))
    return { outline, paper: 'yellow', cut: true }
  }
  /** Every moth on the yellow light, by its open wings: against the others, the lantern as it hangs or is held, and the frame. */
  const seated = (hand: Hand): string[] => {
    const wood = hand.wood, wrong: string[] = []
    const lantern = lanternBox(wood), frame = box(0, 0, STAGE_W, STAGE_H)
    const seats = wood.moths.list.map((moth) => boxAt(OPEN_MOTH_BOX, moth.x, moth.y))
    wood.moths.list.forEach((moth, i) => {
      if (moth.mode !== 'on') wrong.push(`${i} is ${moth.mode}`)
      if (!apart(seats[i], lantern)) wrong.push(`${i} on the lantern`)
      if (!within(seats[i], frame)) wrong.push(`${i} off the frame`)
      for (let b = i + 1; b < seats.length; b++) if (!apart(seats[i], seats[b])) wrong.push(`${i} on ${b}`)
    })
    return wrong
  }

  it('on the yellow light the moths sit along the window\'s own outline: a long window gives a long ring and a tall one a tall ring, and no seat is on another, on the lantern or off the frame', () => {
    const spans: number[] = []
    for (const [rx, ry] of [[18, 5], [5, 18], [12, 12], [3, 3]]) {
      const hand = new Hand(woodSave({ sheet: [yellow(rx, ry)] }))
      hand.shine('yellow', PLACES.mothTree.x, 330, 7, 200)
      expect(seated(hand), `${rx} by ${ry}`).toEqual([])
      const xs = hand.wood.moths.list.map((moth) => moth.x), ys = hand.wood.moths.list.map((moth) => moth.y)
      spans.push((Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys)))
    }
    // Wide, tall, round, and a window too small to sit round, whose ring is grown and keeps its shape.
    expect(spans[0]).toBeGreaterThan(1.8)
    expect(spans[1]).toBeLessThan(0.55)
    expect(spans[2]).toBeGreaterThan(0.7); expect(spans[2]).toBeLessThan(1.4)
    expect(spans[3]).toBeGreaterThan(0.6); expect(spans[3]).toBeLessThan(1.6)
  })

  it('in the ending the moths\' ring keeps off the hung lantern, its handle, its flame and its paper, and no seat is off the frame at either size', () => {
    for (const surface of SURFACES) {
      for (const sheet of [sheetOf('three-windows'), sheetOf('one-window'), [yellow(18, 5)], [yellow(4, 4)]]) {
        const hand = new Hand(woodSave({ sheet }), surface)
        // Straight out from the step at carrying height: the yellow is the first light on the bark.
        hand.shine('yellow', perch(7).x, perch(7).y, 5, 120)
        expect(hand.wood.met.has('moths')).toBe(true)
        hand.carry(HOOK.x - POLE.x, HOOK.y - POLE.y, 260, 0.3)
        hand.up()
        hand.wait(9)
        expect(hand.wood.hung).toBe(true)
        expect(seated(hand), `${surface.width}: ${JSON.stringify(sheet[0].outline.slice(0, 4))}`).toEqual([])
      }
    }
  })

  it('on a yellow light that runs off the frame the moths sit along the frame\'s edge, and none is off it', () => {
    for (const [x, y] of [[60, 420], [560, 800], [700, 800]]) {
      const hand = new Hand(woodSave({ sheet: [yellow(18, 12)] }))
      hand.carry(1100, 700, 200, 0.2)
      hand.carry(1100, 330, 200, 0.2)
      hand.shine('yellow', PLACES.mothTree.x, 330, 4, 120)
      hand.carry(x, y, 110, 6)
      const patch = hand.wood.patchOf('yellow')!
      // The light itself is partly off the frame.
      expect(patch.world.some((v, i) => (i % 2 === 0 ? v < 0 || v > STAGE_W : v < 0 || v > STAGE_H)), `${x}, ${y}`).toBe(true)
      expect(seated(hand), `${x}, ${y}`).toEqual([])
    }
  })

  it('asleep in blue, the moths are drawn inside their row, and nothing of them lies on the stump or in the fox\'s lane', () => {
    const hand = new Hand(woodSave({ sheet: [hole(79, 'blue')] }))
    hand.shine('blue', PLACES.mothTree.x, PLACES.mothTree.y, 6)
    expect(hand.wood.moths.list.every((moth) => moth.mode === 'asleep')).toBe(true)
    const sketch = new Sketch()
    sketch.wobble = 0
    drawSmall(sketch, hand.wood, hand.game.time, false)
    const lowest = Math.max(...Array.from({ length: MOTHS }, (_, i) => bed(i).y))
    const row = box(bed(0).x + SLEEPER_BOX.left, 480, bed(MOTHS - 1).x + SLEEPER_BOX.right, lowest + SLEEPER_BOX.bottom)
    const pts = sketch.hide.pts
    for (let i = 0; i < sketch.hide.n; i += 2) {
      // The wax each moth stands on: every point below the fern and right of the fox's lane is a sleeper's.
      if (pts[i + 1] > 440 && pts[i] > 760) expect(pts[i] >= row.left && pts[i] <= row.right && pts[i + 1] <= row.bottom, `${pts[i]}, ${pts[i + 1]}`).toBe(true)
    }
  })

  it('the glow-worms that hang round a cold lantern hang at its sides and under it, never on its paper, its candle or a moth\'s seat', () => {
    const seats = HANG_SEATS.map(([x, y]) => boxAt(WORM_BOX, x, y))
    for (let a = 0; a < seats.length; a++) for (let b = a + 1; b < seats.length; b++) expect(apart(seats[a], seats[b]), `${a} and ${b}`).toBe(true)
    for (const seat of seats) {
      expect(apart(seat, PAPER_BOX)).toBe(true)
      expect(apart(seat, FLAME_BOX)).toBe(true)
      for (const [x, y] of COLD_SEATS) expect(apart(seat, box(x - 16.5, y - 36, x + 16.5, y + 22))).toBe(true)
    }
    expect(HANG_SEATS).toHaveLength(WORMS)
    // Played: a dark lantern under the fern, held still. Each worm comes to its own seat.
    const hand = new Hand(woodSave({ lit: false }))
    hand.carry(750, 560, 300, 6)
    const at = { x: 0, y: 0 }
    for (let i = 0; i < WORMS; i++) {
      expect(hand.wood.worms.hang[i]).toBe(1)
      wormAt(hand.wood, i, at)
      expect(Math.hypot(at.x - hand.wood.lantern.x - HANG_SEATS[i][0], at.y - hand.wood.lantern.y - HANG_SEATS[i][1])).toBeLessThan(30)
    }
  })
})

describe('rows that must not read as signs', () => {
  /** Whether a row goes turn and turn about: every step up is followed by a step down and every step down by a step up. */
  const alternates = (values: readonly number[]): boolean => {
    const steps = values.slice(1).map((v, i) => Math.sign(v - values[i]))
    return steps.length > 1 && steps.every((step, i) => step !== 0 && (i === 0 || step === -steps[i - 1]))
  }
  const gapsOf = (values: readonly number[]) => values.slice(1).map((v, i) => v - values[i])
  /** The paths of a bucket, each as its own list of numbers. */
  const pathsOf = (bucket: Sketch['lines']): number[][] => {
    const out: number[][] = []
    let from = 0
    for (let p = 0; p < bucket.m; p++) { out.push(Array.from(bucket.pts.subarray(from, bucket.ends[p]))); from = bucket.ends[p] }
    return out
  }
  /** Whether two strokes cross or touch. */
  const cross = (a: readonly number[], b: readonly number[]): boolean => {
    const side = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px))
    const d1 = side(a[0], a[1], a[2], a[3], b[0], b[1]), d2 = side(a[0], a[1], a[2], a[3], b[2], b[3])
    const d3 = side(b[0], b[1], b[2], b[3], a[0], a[1]), d4 = side(b[0], b[1], b[2], b[3], a[2], a[3])
    return d1 !== d2 && d3 !== d4
  }

  it('the moths on the bark are no grid: no three share a line across or down, and their heights are unevenly spaced', () => {
    const spread = (values: number[]) => { const gaps = gapsOf(values); return Math.max(...gaps) - Math.min(...gaps) }
    const perches = Array.from({ length: MOTHS }, (_, i) => perch(i))
    for (const key of ['x', 'y'] as const) {
      // No column and no row of three: at most two moths share a line across or down.
      for (const at of perches) expect(perches.filter((other) => Math.abs(other[key] - at[key]) < 5).length).toBeLessThanOrEqual(2)
    }
    const rows = perches.map((at) => at.y).sort((a, b) => a - b)
    expect(spread(rows)).toBeGreaterThan(30)
  })

  it('the sleeping moths are no fence and no tally of pairs: two loose heaps of unlike size, some with a wing across a neighbour, and neither their gaps, their heights, their leans nor their sizes go turn and turn about', () => {
    const order = Array.from({ length: MOTHS }, (_, i) => i).sort((a, b) => bed(a).x - bed(b).x)
    const xs = order.map((i) => bed(i).x), ys = order.map((i) => bed(i).y), leans = order.map((i) => bedTilt(i)), sizes = order.map((i) => MOTH_SIZES[i])
    const gaps = gapsOf(xs)
    for (const [name, row] of [['gaps', gaps], ['heights', ys], ['leans', leans], ['sizes', sizes]] as const) expect(alternates(row), name).toBe(false)
    // Two heaps: one gap is the space between them, at least twice any other, and it does not halve the row.
    const widest = Math.max(...gaps), at = gaps.indexOf(widest)
    expect(widest).toBeGreaterThanOrEqual(2 * Math.max(...gaps.filter((_, i) => i !== at)))
    expect(at + 1).not.toBe(MOTHS / 2)
    // Inside a heap some lie wing over wing (nearer than a folded moth is wide) and some do not.
    const wide = SLEEPER_BOX.right - SLEEPER_BOX.left
    const over = gaps.filter((gap, i) => i !== at && gap < wide * Math.min(sizes[i], sizes[i + 1]) * 0.6)
    expect(over.length).toBeGreaterThanOrEqual(2)
    expect(over.length).toBeLessThan(gaps.length - 1)
    // No two gaps side by side are alike, no two neighbours lie at one height or lean one way by the same amount, and the sizes are many.
    for (let i = 1; i < gaps.length; i++) expect(Math.abs(gaps[i] - gaps[i - 1])).toBeGreaterThanOrEqual(5)
    for (let i = 1; i < MOTHS; i++) { expect(Math.abs(ys[i] - ys[i - 1])).toBeGreaterThanOrEqual(4); expect(Math.abs(leans[i] - leans[i - 1])).toBeGreaterThan(0.05) }
    expect(new Set(MOTH_SIZES).size).toBeGreaterThan(4)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(10)
  })

  /** How far the middle of a bow lies to one side of the line between its ends, and how long that line is. */
  const bowOf = (band: readonly number[]) => {
    const [ax, ay, mx, my, bx, by] = band
    const long = Math.hypot(bx - ax, by - ay)
    return { long, off: Math.abs(((bx - ax) * (my - ay) - (by - ay) * (mx - ax)) / long) }
  }
  /**
   * Whether an open path is a zigzag: three strokes or more of a size, each turning sharply the other way from
   * the last, as a W, a Z or an N does.
   */
  const zigzag = (path: readonly number[]): boolean => {
    const n = path.length / 2
    if (n < 4 || (path[0] === path[path.length - 2] && path[1] === path[path.length - 1])) return false
    const strokes = Array.from({ length: n - 1 }, (_, k) => [path[k * 2 + 2] - path[k * 2], path[k * 2 + 3] - path[k * 2 + 1]])
    const longs = strokes.map(([x, y]) => Math.hypot(x, y))
    if (Math.min(...longs) < 3 || Math.max(...longs) > 2.2 * Math.min(...longs)) return false
    const turns = strokes.slice(1).map(([x, y], k) => Math.atan2(strokes[k][0] * y - strokes[k][1] * x, strokes[k][0] * x + strokes[k][1] * y))
    return turns.every((turn, k) => Math.abs(turn) > 0.9 && (k === 0 || Math.sign(turn) === -Math.sign(turns[k - 1])))
  }
  /** Whether two straight strokes lie one beside the other like an equals sign: nearly parallel, of a size, close. */
  const twinned = (a: readonly number[], b: readonly number[]): boolean => {
    if (a.length !== 4 || b.length !== 4) return false
    const la = Math.hypot(a[2] - a[0], a[3] - a[1]), lb = Math.hypot(b[2] - b[0], b[3] - b[1])
    if (Math.min(la, lb) < 10 || Math.max(la, lb) > 1.6 * Math.min(la, lb)) return false
    let turn = Math.abs(Math.atan2(a[3] - a[1], a[2] - a[0]) - Math.atan2(b[3] - b[1], b[2] - b[0])) % Math.PI
    turn = Math.min(turn, Math.PI - turn)
    return turn < 0.12 && Math.hypot((a[0] + a[2] - b[0] - b[2]) / 2, (a[1] + a[3] - b[1] - b[3]) / 2) < 16
  }

  it('the band on the fox\'s brush is one bowed stroke, not a zigzag', () => {
    expect(zigzag([-24, -80, -12, -68, -22, -58, -8, -50])).toBe(true)
    for (const band of [BRUSH_BAND, LONG_BRUSH_BAND]) {
      expect(band).toHaveLength(6)
      // The middle of the bow lies to one side of the line between its ends, by less than half that line's length.
      const bow = bowOf(band)
      expect(bow.off).toBeGreaterThan(4)
      expect(bow.off).toBeLessThan(bow.long / 2)
    }
    // As it is drawn: no path of the sitting fox goes up, down, up, down in four strokes of a size.
    const hand = new Hand(woodSave())
    const sketch = new Sketch()
    sketch.wobble = 0
    drawFox(sketch, hand.wood, 0)
    const zigzags = pathsOf(sketch.lines).filter((path) => {
      if (path.length !== 10) return false
      const ups = [1, 2, 3, 4].map((k) => Math.sign(path[k * 2 + 1] - path[k * 2 - 1]))
      const even = [1, 2, 3, 4].map((k) => Math.hypot(path[k * 2] - path[k * 2 - 2], path[k * 2 + 1] - path[k * 2 - 1]))
      return ups.every((up, i) => up !== 0 && (i === 0 || up === -ups[i - 1])) && Math.max(...even) < 1.6 * Math.min(...even)
    })
    expect(zigzags).toEqual([])
  })

  it('in every pose a walk puts the fox in (walking in the red, leaping the blue, pouncing, on its nose, creeping to a dark lantern, sneezing) no path of it is a zigzag but the fur down its chest as it sits, and no two strokes lie like an equals sign', () => {
    const poses = { walk: 0, air: 0, dive: 0, creep: 0, squint: 0, sit: 0 }
    const look = (hand: Hand) => {
      hand.watch = () => {
        const fox = hand.wood.fox
        sketch.clear()
        drawFox(sketch, hand.wood, hand.wood.time)
        const paths = pathsOf(sketch.lines)
        const long = fox.mode === 'walk' || fox.mode === 'pounce' || (fox.mode === 'puddle' && fox.beat >= 3) || fox.creep > 0
        const zigzags = paths.filter(zigzag)
        // Sitting, the one edge of fur that runs down its chest; long and low, nothing.
        expect(zigzags.length, `${fox.mode} at ${hand.wood.time}`).toBeLessThanOrEqual(long ? 0 : 1)
        for (const path of zigzags) expect(path).toHaveLength(10)
        for (let a = 0; a < paths.length; a++) for (let b = a + 1; b < paths.length; b++) expect(twinned(paths[a], paths[b]), `${fox.mode} at ${hand.wood.time}`).toBe(false)
        if (fox.mode === 'walk') poses.walk++
        if (long && fox.air > 0.3) poses.air++
        if (fox.dive > 0.5) poses.dive++
        if (fox.creep > 0) poses.creep++
        if (fox.squint > 0.6) poses.squint++
        if (!long) poses.sit++
      }
    }
    const sketch = new Sketch()
    sketch.wobble = 0
    // Red: it pads into it and follows.
    let hand = new Hand(woodSave({ lantern: { x: 800, y: 640 } }))
    look(hand)
    meet(hand, 'fox')
    hand.carry(900, 640, 100, 1)
    // Blue: the puddle and the leap. Yellow: the sneeze, with its nose wrinkled.
    for (const paper of ['blue', 'yellow'] as const) {
      hand = new Hand(woodSave({ sheet: [hole(25, paper)], lantern: { x: 800, y: 640 } }))
      look(hand)
      hand.shine(paper, hand.wood.fox.x, PLACES.fox.y - 100, 3)
    }
    // A rush: the pounce, and the landing on its nose.
    hand = new Hand(woodSave({ sheet: [hole(25, 'red')], lantern: { x: 1000, y: 640 } }))
    look(hand)
    hand.carry(300, 640, 1500, 2.5)
    // A lantern that gives no light: the creep.
    hand = new Hand(woodSave({ lit: false, lantern: { x: 800, y: 640 } }))
    look(hand)
    hand.carry(700, 640, 220, 3)
    for (const [pose, frames] of Object.entries(poses)) expect(frames, pose).toBeGreaterThan(5)
  })

  it('the wrinkle over the squinting fox\'s nose is one bow, and the three feathers of the owl\'s tail are no tally: no two of one length or lean, and the gaps between them unlike', () => {
    expect(NOSE_WRINKLE).toHaveLength(6)
    const bow = bowOf(NOSE_WRINKLE)
    expect(bow.off).toBeGreaterThan(4)
    expect(bow.off).toBeLessThan(bow.long / 2)
    expect(OWL_TAIL).toHaveLength(3)
    const longs = OWL_TAIL.map(([x, y, toX, toY]) => Math.hypot(toX - x, toY - y))
    const leans = OWL_TAIL.map(([x, y, toX, toY]) => Math.atan2(toX - x, toY - y))
    for (let a = 0; a < 3; a++) {
      for (let b = a + 1; b < 3; b++) {
        expect(Math.max(longs[a], longs[b]) / Math.min(longs[a], longs[b]), `${a} ${b}`).toBeGreaterThan(1.2)
        expect(Math.abs(leans[a] - leans[b]), `${a} ${b}`).toBeGreaterThan(0.2)
      }
    }
    // The gaps, where the feathers leave the body and where they end.
    expect(Math.abs((OWL_TAIL[1][0] - OWL_TAIL[0][0]) - (OWL_TAIL[2][0] - OWL_TAIL[1][0]))).toBeGreaterThanOrEqual(8)
    expect(Math.abs((OWL_TAIL[1][2] - OWL_TAIL[0][2]) - (OWL_TAIL[2][2] - OWL_TAIL[1][2]))).toBeGreaterThanOrEqual(6)
    expect(alternates(longs) && Math.abs(longs[0] - longs[2]) < 4).toBe(false)
    // As it is drawn: the three are there, each from its own numbers.
    const hand = new Hand(woodSave())
    const sketch = new Sketch()
    sketch.wobble = 0
    drawOwl(sketch, hand.wood, 0)
    const drawn = pathsOf(sketch.lines).filter((path) => path.length === 4)
    for (const [x, y, toX, toY] of OWL_TAIL) {
      expect(drawn.some((path) => Math.abs(path[0] - PLACES.owl.x - x) < 0.01 && Math.abs(path[1] - PLACES.owl.y - y) < 0.01 && Math.abs(path[2] - PLACES.owl.x - toX) < 0.01 && Math.abs(path[3] - PLACES.owl.y - toY) < 0.01)).toBe(true)
    }
  })

  it('the three cracks in the plaster stand in no column, and each is one jagged hairline: none forks, and none bows like a letter', () => {
    expect(CRACKS).toHaveLength(3)
    const spans = CRACKS.map((crack) => { const xs = crack.filter((_, i) => i % 2 === 0); return [Math.min(...xs), Math.max(...xs)] })
    // No two share a column: side by side they keep a gap.
    for (let a = 0; a < spans.length; a++) for (let b = a + 1; b < spans.length; b++) expect(spans[a][1] + 10 < spans[b][0] || spans[b][1] + 10 < spans[a][0], `${a} and ${b}`).toBe(true)
    const slants: number[] = [], lengths: number[] = []
    for (const crack of CRACKS) {
      const n = crack.length / 2
      const ax = crack[0], ay = crack[1], bx = crack[n * 2 - 2], by = crack[n * 2 - 1]
      const long = Math.hypot(bx - ax, by - ay)
      slants.push(Math.atan2(by - ay, bx - ax)); lengths.push(long)
      // Nearly straight: no point leaves the line between its ends by more than an eighth of its length, and it runs on without turning back.
      const offs: number[] = []
      for (let i = 1; i < n - 1; i++) offs.push(((bx - ax) * (crack[i * 2 + 1] - ay) - (by - ay) * (crack[i * 2] - ax)) / long)
      for (const off of offs) expect(Math.abs(off)).toBeLessThan(long / 8)
      for (let i = 1; i < n; i++) expect((crack[i * 2] - crack[i * 2 - 2]) * (bx - ax) + (crack[i * 2 + 1] - crack[i * 2 - 1]) * (by - ay)).toBeGreaterThan(0)
      // Jagged: it changes sides of that line twice or more, which an S, with its one change, does not.
      const sides = offs.map(Math.sign).filter((side) => side !== 0)
      expect(sides.filter((side, i) => i > 0 && side !== sides[i - 1]).length).toBeGreaterThanOrEqual(2)
    }
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
      expect(Math.abs(slants[a] - slants[b])).toBeGreaterThan(0.25)
      expect(Math.abs(lengths[a] - lengths[b])).toBeGreaterThan(8)
    }
    // And as the wall is drawn, each crack is one path: nothing else starts from a point of one.
    const sketch = new Sketch()
    sketch.wobble = 0
    paintSetting(sketch)
    const paths = pathsOf(sketch.lines)
    for (const crack of CRACKS) {
      const touching = paths.filter((path) => { for (let i = 0; i < path.length; i += 2) for (let k = 0; k < crack.length; k += 2) if (Math.hypot(path[i] - crack[k], path[i + 1] - crack[k + 1]) < 3) return true; return false })
      expect(touching).toHaveLength(1)
      expect(touching[0]).toHaveLength(crack.length)
    }
  })

  it('the badger\'s teeth are closed pegs of unlike width and length with a gap where one is gone, and the stripe through each eye is one closed patch: no open zigzag and no wedge', () => {
    const widths = BADGER_TEETH.map((tooth) => tooth[1]), lengths = BADGER_TEETH.map((tooth) => tooth[2])
    expect(new Set(widths).size).toBe(BADGER_TEETH.length)
    expect(new Set(lengths).size).toBe(BADGER_TEETH.length)
    const gaps = BADGER_TEETH.slice(1).map((tooth, i) => tooth[0] - (BADGER_TEETH[i][0] + BADGER_TEETH[i][1]))
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(0)
    expect(Math.max(...gaps)).toBeGreaterThan(3 * Math.max(...gaps.filter((gap) => gap !== Math.max(...gaps))))
    expect(BADGER_STRIPE.slice(0, 2)).toEqual(BADGER_STRIPE.slice(-2))
    // As it is drawn grinning: every path below the lip, where the teeth hang, ends where it began.
    const hand = new Hand(woodSave())
    hand.wood.badger.mode = 'grin'
    const sketch = new Sketch()
    sketch.wobble = 0
    drawBadger(sketch, hand.wood, 0)
    const closed = (path: number[]) => Math.hypot(path[0] - path[path.length - 2], path[1] - path[path.length - 1]) < 0.01
    const paths = pathsOf(sketch.lines)
    const pegs = paths.filter((path) => path.length === 12 && closed(path))
    expect(pegs).toHaveLength(BADGER_TEETH.length)
    // No open path of the face zigzags: three or four strokes of a size going down, up, down.
    const zigzags = paths.filter((path) => {
      const n = path.length / 2
      if (closed(path) || n < 4 || n > 6) return false
      const ups = Array.from({ length: n - 1 }, (_, k) => Math.sign(path[k * 2 + 3] - path[k * 2 + 1]))
      const even = Array.from({ length: n - 1 }, (_, k) => Math.hypot(path[k * 2 + 2] - path[k * 2], path[k * 2 + 3] - path[k * 2 + 1]))
      return ups.every((up, i) => up !== 0 && (i === 0 || up === -ups[i - 1])) && Math.max(...even) < 1.6 * Math.min(...even) && Math.max(...even) < 30
    })
    expect(zigzags).toEqual([])
    // Two stripes, each closed.
    expect(paths.filter((path) => path.length === BADGER_STRIPE.length && closed(path)).length).toBeGreaterThanOrEqual(2)
  })

  it('the twigs on the ground are each one bent stick, and no two lie one way at one length', () => {
    expect(TWIGS.length).toBeGreaterThanOrEqual(8)
    for (let n = 0; n < TWIGS.length; n++) {
      // Three points: one bend, no fork.
      expect(twigOf(n)).toHaveLength(6)
      expect(Math.abs(TWIGS[n][3])).toBeGreaterThan(0.25)
      expect(Math.abs(TWIGS[n][3])).toBeLessThan(0.7)
    }
    const turned = (turn: number) => ((turn % Math.PI) + Math.PI) % Math.PI
    for (let a = 0; a < TWIGS.length; a++) for (let b = a + 1; b < TWIGS.length; b++) {
      const lie = Math.abs(turned(TWIGS[a][0]) - turned(TWIGS[b][0]))
      expect(Math.min(lie, Math.PI - lie) > 0.2 || Math.abs(TWIGS[a][1] - TWIGS[b][1]) > 3, `${a} and ${b}`).toBe(true)
    }
    // They do not bend to one side turn and turn about, nor grow and shrink so.
    expect(alternates(TWIGS.map((twig) => twig[3]))).toBe(false)
    expect(alternates(TWIGS.map((twig) => twig[1]))).toBe(false)
  })

  it('the drops on the back of the owl\'s head are scattered: neither their heights nor their sizes go turn and turn about, and no two gaps side by side are alike', () => {
    const xs = OWL_BACK.map((drop) => drop[0]), ys = OWL_BACK.map((drop) => drop[1]), sizes = OWL_BACK.map((drop) => drop[2])
    expect(alternates(ys)).toBe(false)
    expect(alternates(sizes)).toBe(false)
    const gaps = gapsOf(xs)
    expect(alternates(gaps)).toBe(false)
    for (let i = 1; i < gaps.length; i++) expect(Math.abs(gaps[i] - gaps[i - 1])).toBeGreaterThanOrEqual(8)
    expect(new Set(sizes).size).toBe(OWL_BACK.length)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(40)
  })

  it('the cat\'s paws are low mounds and its stripes no tally: no path of the sitting cat is two strokes at a right angle, and no two gaps between stripes are alike', () => {
    for (const [, wide, high] of CAT_PAWS) expect(wide).toBeGreaterThan(high)
    expect(CAT_PAWS[0][1]).not.toBe(CAT_PAWS[1][1])
    const gaps = gapsOf(CAT_STRIPES)
    for (let a = 0; a < gaps.length; a++) for (let b = a + 1; b < gaps.length; b++) expect(Math.abs(gaps[a] - gaps[b])).toBeGreaterThanOrEqual(4)
    const table = new Hand(freshSave(4)).table
    const sketch = new Sketch()
    sketch.wobble = 0
    drawCat(sketch, table, 0)
    const corners = pathsOf(sketch.lines).filter((path) => {
      if (path.length !== 6) return false
      const ax = path[2] - path[0], ay = path[3] - path[1], bx = path[4] - path[2], by = path[5] - path[3]
      const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by)
      // An upright and a level stroke that meet square: the shape of a letter.
      const upright = (x: number, long: number) => Math.abs(x) < long * 0.26
      return Math.abs(ax * bx + ay * by) / (la * lb) < 0.26 && ((upright(ax, la) && upright(by, lb)) || (upright(ay, la) && upright(bx, lb)))
    })
    expect(corners.map((path) => path.map(Math.round).join(' '))).toEqual([])
  })

  it('no two strokes of the room\'s plaster cross or touch, none lies on the window, the shelf and its jars, the coat or the picture, and no two side by side lie one way', () => {
    const strokes = plasterStrokes()
    expect(strokes.length).toBeGreaterThan(8)
    for (let a = 0; a < strokes.length; a++) {
      for (let b = a + 1; b < strokes.length; b++) {
        expect(cross(strokes[a], strokes[b]), `${a} and ${b}`).toBe(false)
        // Nor do they come near enough to read as one sign: a finger's nail apart at the least.
        let least = Infinity
        for (const [px, py] of [[strokes[a][0], strokes[a][1]], [strokes[a][2], strokes[a][3]], [(strokes[a][0] + strokes[a][2]) / 2, (strokes[a][1] + strokes[a][3]) / 2]]) {
          for (const [qx, qy] of [[strokes[b][0], strokes[b][1]], [strokes[b][2], strokes[b][3]], [(strokes[b][0] + strokes[b][2]) / 2, (strokes[b][1] + strokes[b][3]) / 2]]) least = Math.min(least, Math.hypot(px - qx, py - qy))
        }
        expect(least, `${a} and ${b}`).toBeGreaterThanOrEqual(12)
      }
      for (const [name, thing] of Object.entries(WALL_THINGS)) {
        for (const along of [0, 0.25, 0.5, 0.75, 1]) {
          const x = strokes[a][0] + (strokes[a][2] - strokes[a][0]) * along, y = strokes[a][1] + (strokes[a][3] - strokes[a][1]) * along
          expect(x > thing.left && x < thing.right && y > thing.top && y < thing.bottom, `${a} on the ${name}`).toBe(false)
        }
      }
    }
    // And they are what the room draws: every stroke is a path of the room, as it is.
    const sketch = new Sketch()
    sketch.wobble = 0
    paintRoom(sketch)
    const paths = pathsOf(sketch.lines)
    for (const stroke of strokes) expect(paths.some((path) => path.length === 4 && Math.hypot(path[0] - stroke[0], path[1] - stroke[1]) < 0.01 && Math.hypot(path[2] - stroke[2], path[3] - stroke[3]) < 0.01)).toBe(true)
  })
})

describe('the badger at rest', () => {
  const sketch = new Sketch()
  sketch.wobble = 0

  it('its cheeks are half full as it sits, and are drawn so: a bulge at either side of its face that is not there when it grins', () => {
    expect(cheeksOf(freshBadger())).toBe(0.5)
    const hand = new Hand(woodSave())
    const face = { x: PLACES.badger.x + 14, y: PLACES.badger.y - 176 + 26 }
    /** Points of the scraped line out past the side of the head, level with the cheeks. */
    const bulge = () => {
      sketch.clear()
      drawBadger(sketch, hand.wood, 0)
      let count = 0
      const pts = sketch.lines.pts
      for (let i = 0; i < sketch.lines.n; i += 2) if (Math.abs(Math.abs(pts[i] - face.x) - 84) < 6 && Math.abs(pts[i + 1] - face.y) < 14) count++
      return count
    }
    expect(hand.wood.badger.mode).toBe('sit')
    const sitting = bulge()
    expect(sitting).toBeGreaterThanOrEqual(2)
    hand.wood.badger.mode = 'grin'
    expect(cheeksOf(hand.wood.badger)).toBe(0)
    expect(bulge()).toBeLessThan(sitting)
    // Drawing breath they fill past half, and the great puff fills them right up.
    hand.wood.badger.mode = 'draw'; hand.wood.badger.manner = 0; hand.wood.badger.breath = 1
    expect(cheeksOf(hand.wood.badger)).toBe(1)
  })

  it('its hole is drawn at the foot of its mound beside it, in its own room: clear of the badger however it sits, and of the fox and the hedgehog wherever they stand', () => {
    const xs = HOLE_MOUTH.filter((_, i) => i % 2 === 0), ys = HOLE_MOUTH.filter((_, i) => i % 2 === 1)
    const mouth = box(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))
    expect(within(mouth, BADGER_HOLE)).toBe(true)
    // It is in the picture: a path of the setting is the mouth itself.
    const setting = new Sketch()
    setting.wobble = 0
    paintSetting(setting)
    let found = false, from = 0
    for (let p = 0; p < setting.lines.m; p++) {
      const end = setting.lines.ends[p]
      if (end - from === HOLE_MOUTH.length && HOLE_MOUTH.every((v, i) => Math.abs(setting.lines.pts[from + i] - v) < 0.01)) found = true
      from = end
    }
    expect(found).toBe(true)
    for (let x = FOX_LANE.left; x <= FOX_LANE.right; x += 6) expect(apart(foxBox(x), BADGER_HOLE)).toBe(true)
    for (let x = HEDGEHOG_LANE.left; x <= HEDGEHOG_MAT; x += 6) expect(apart(hedgehogBox(x), BADGER_HOLE)).toBe(true)
    // The badger as it is drawn, sitting, grinning, asleep, starting up and blowing: none of its wax reaches the mouth.
    const hand = new Hand(woodSave())
    const badger = hand.wood.badger
    for (const mode of ['sit', 'grin', 'asleep', 'draw', 'miss'] as const) {
      for (const start of [0, 0.5]) {
        for (let t = 0; t < 8; t += 0.5) {
          badger.mode = mode; badger.start = start; badger.breath = mode === 'draw' ? 1 : 0; badger.snore = mode === 'asleep' ? 1 : 0
          sketch.clear()
          drawBadger(sketch, hand.wood, t)
          const pts = sketch.hide.pts
          for (let i = 0; i < sketch.hide.n; i += 2) expect(pts[i] > mouth.left - 2 && pts[i] < mouth.right && pts[i + 1] > mouth.top - 2 && pts[i + 1] < mouth.bottom, `${mode} at ${t}`).toBe(false)
        }
      }
    }
  })
})

describe('at rest on the step', () => {
  it('the lantern\'s patches lie on no creature: the first frame of a walk shows every creature in the scraped line, waiting', () => {
    for (const position of LADDER) {
      const hand = new Hand(woodSave({ sheet: sheetOf(position) }))
      const wood = hand.wood
      expect(wood.lit).toBe(true)
      expect(wood.grip.x).toBe(PLACES.lantern.x)
      const sketch = new Sketch()
      for (const name of BIG) expect(wood.sight[name].touch, name).toBeNull()
      drawSmall(sketch, wood, 0, true)
      expect(sketch.lines.n + sketch.hide.n + sketch.whites.n).toBe(0)
    }
  })

  it('whatever sheet the child cut, every creature waits there for the first touch: no finger down, nothing moves off and nothing sounds', () => {
    const sheets: SheetWindow[][] = [...LADDER.map((position) => sheetOf(position)), [hole(50, 'red', 44)], [hole(20, 'yellow', 30), hole(80, 'blue', 16)], [hole(20, null, 40)]]
    for (const sheet of sheets) {
      const hand = new Hand(woodSave({ sheet }))
      hand.wait(3)
      expect(hand.heard).toHaveLength(0)
      expect(hand.wood.fox.x).toBe(PLACES.fox.x)
      expect(hand.wood.hedgehog.x).toBe(PLACES.hedgehog.x)
      expect(hand.wood.moths.list.every((moth) => moth.mode === 'bark')).toBe(true)
    }
  })

  it('the lantern stands inside its room on the step, pole and all', () => {
    const hand = new Hand(woodSave())
    const lantern = hand.wood.lantern
    expect(within(boxAt(PAPER_BOX, lantern.x, lantern.y), STEP_BOX)).toBe(true)
    expect(within(boxAt(FLAME_BOX, lantern.x, lantern.y), STEP_BOX)).toBe(true)
    expect(PLACES.lantern.x + POLE.x).toBeLessThanOrEqual(STEP_BOX.right)
    expect(PLACES.lantern.y + 44).toBeLessThanOrEqual(STEP_BOX.bottom)
  })
})

describe('the home control and the grown-up corner', () => {
  it('nothing to touch, no creature and no lantern lies under the home control at either surface size', () => {
    for (const surface of SURFACES) {
      const home = homeBox(surface.width, surface.height)
      for (const [name, room] of Object.entries({ ...STAND, step: STEP_BOX, hook: HUNG_BOX, sheet: SHEET, edge: EDGE, pile: PILE, scissors: SCISSORS_BOX, candle: CANDLE_BOX, rolled: ROLLED, ...PAPER_RESTS })) expect(apart(home, room), name).toBe(true)
      // The lantern carried as high as the finger can take it, anywhere across the wood.
      const top = REACH.top + POLE.y + WIRE
      expect(apart(home, box(0, top + FLAME_BOX.top, STAGE_W, STAGE_H))).toBe(true)
      // The spider's thread ends below it.
      expect(home.bottom).toBeLessThanOrEqual(70)
    }
  })

  it('nothing to touch lies in the grown-up corner at either surface size, and the grip cannot be carried into it', () => {
    for (const surface of SURFACES) {
      const by = fit(surface.width, surface.height)
      const corner = box((surface.width - CORNER_PX - by.x) / by.scale, -9999, 9999, (CORNER_PX - by.y) / by.scale)
      for (const room of [SHEET, EDGE, PILE, SCISSORS_BOX, CANDLE_BOX, ROLLED, ...Object.values(PAPER_RESTS)]) expect(apart(corner, room)).toBe(true)
      expect(REACH.top).toBeGreaterThan(corner.bottom)
      // The hung lantern is pulled from where it hangs, below the corner.
      expect(HOOK.y + WIRE - 120).toBeGreaterThan(corner.bottom)
    }
  })
})

describe('touch targets', () => {
  it('everything the finger takes is 48 px or more across at both surface sizes', () => {
    for (const surface of SURFACES) {
      const scale = fit(surface.width, surface.height).scale
      const small: string[] = []
      const targets: Record<string, Box> = { edge: EDGE, pile: PILE, scissors: SCISSORS_BOX, candle: CANDLE_BOX, rolled: ROLLED, sheet: SHEET, ...PAPER_RESTS }
      for (const [name, target] of Object.entries(targets)) if (Math.min(target.right - target.left, target.bottom - target.top) * scale < 48) small.push(name)
      // The windows the ready sheets lay out for a paper.
      for (const position of LADDER) {
        for (const window of sheetOf(position)) {
          const xs = window.outline.filter((_, i) => i % 2 === 0), ys = window.outline.filter((_, i) => i % 2 === 1)
          const a = fromSheet(Math.min(...xs), Math.min(...ys)), b = fromSheet(Math.max(...xs), Math.max(...ys))
          if (Math.min(b.x - a.x, b.y - a.y) * scale < 48) small.push(`${position} window`)
        }
      }
      // A window the child cut, however small, takes a paper let go within this of its middle.
      if (NEAR * 2 * scale < 48) small.push('a cut window')
      // The hung lantern: what a finger may land on to pull it down.
      if (156 * scale < 48) small.push('the hung lantern')
      expect(small).toEqual([])
    }
  })

  it('a window too small for a finger takes a paper let go right beside it, and one let go further off slides back', () => {
    const tiny = hole(30, null, 3)
    for (const [by, takes] of [[NEAR - 4, true], [NEAR + 30, false]] as const) {
      const save = { ...freshSave(null), sheet: [tiny] }
      const hand = new Hand(save)
      const rest = PAPER_RESTS.red, at = fromSheet(30, 50)
      hand.drag((rest.left + rest.right) / 2, (rest.top + rest.bottom) / 2, at.x + by, at.y, 600)
      hand.wait(0.5)
      expect(hand.table.sheet[0].paper).toBe(takes ? 'red' : null)
    }
  })

  it('in the wood the whole stage is the target: a finger anywhere takes the lantern there', () => {
    for (const [x, y] of [[200, 700], [600, 400], [1100, 780]]) {
      const hand = new Hand(woodSave())
      hand.down(x, y)
      expect(hand.wood.holding).toBe(true)
      expect(hand.wood.want.x).toBe(x)
    }
  })
})

describe('a thing is touched where it is drawn', () => {
  it('the sheet lies in its box flat and rolled, and the pieces lie in theirs', () => {
    expect(liesAt(0)).toEqual(SHEET)
    expect(within(liesAt(1), ROLLED, 10)).toBe(true)
    expect(within(boxAt(CANDLE_SHAPE, CANDLE_REST.x, CANDLE_REST.y), CANDLE_BOX, 6)).toBe(true)
    expect(SCISSORS_REST.x).toBe((SCISSORS_BOX.left + SCISSORS_BOX.right) / 2)
    expect(SCISSORS_REST.y).toBe((SCISSORS_BOX.top + SCISSORS_BOX.bottom) / 2)
    // A paper is a slab of 140 by 84, and so is its place.
    for (const rest of Object.values(PAPER_RESTS)) expect([rest.right - rest.left, rest.bottom - rest.top]).toEqual([140, 84])
  })

  it('the scissors, picked up where they lie, go with the finger and cut from where they come onto the sheet; let go off the sheet they go back and nothing is cut', () => {
    const hand = new Hand({ ...freshSave(null), sheet: [] })
    hand.down(SCISSORS_REST.x, SCISSORS_REST.y)
    expect(hand.count('snip')).toBe(1)
    hand.slide(840, 420, 500)
    expect(Math.hypot(hand.table.scissors.x - 840, hand.table.scissors.y - 420)).toBeLessThan(1)
    expect(hand.table.sheet).toHaveLength(0)
    const a = fromSheet(70, 30), b = fromSheet(40, 30), c = fromSheet(40, 70), d = fromSheet(70, 70)
    for (const to of [a, b, c, d, a]) hand.slide(to.x, to.y, 500)
    hand.up()
    hand.wait(0.5)
    expect(hand.table.sheet).toHaveLength(1)
    expect(hand.table.sheet[0].cut).toBe(true)
    // And carried about the table and let go on bare wood: no cut, and they slide home.
    hand.down(SCISSORS_REST.x, SCISSORS_REST.y)
    hand.slide(850, 600, 500)
    hand.up()
    hand.wait(1.5)
    expect(hand.table.sheet).toHaveLength(1)
    expect(Math.hypot(hand.table.scissors.x - SCISSORS_REST.x, hand.table.scissors.y - SCISSORS_REST.y)).toBeLessThan(2)
    expect(hand.table.hand).toBeNull()
  })

  it('the hung lantern answers a finger anywhere on what is drawn of it', () => {
    const hand = new Hand(woodSave({ finished: true }))
    const wood = hand.wood
    expect(wood.hung).toBe(true)
    const drawn = [boxAt(PAPER_BOX, wood.lantern.x, wood.lantern.y), boxAt(FLAME_BOX, wood.lantern.x, wood.lantern.y)]
    for (const part of drawn) for (const [x, y] of [[part.left, part.top], [part.right, part.top], [part.left, part.bottom], [part.right, part.bottom]]) expect(wood.onHung(x, y)).toBe(true)
    expect(within(drawn[0], HUNG_BOX)).toBe(true)
  })

  it('the four large creatures at rest are drawn inside their rooms', () => {
    const hand = new Hand(woodSave())
    const sketch = new Sketch()
    sketch.wobble = 0
    for (const [paint, room] of [[drawOwl, OWL_BOX], [drawBadger, BADGER_BOX], [drawFox, foxBox(PLACES.fox.x)], [drawHedgehog, hedgehogBox(PLACES.hedgehog.x)]] as const) {
      sketch.clear()
      paint(sketch, hand.wood, 0)
      expect(within(boundsOf(sketch), room, 1)).toBe(true)
    }
  })
})
