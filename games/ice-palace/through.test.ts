import { describe, expect, it } from 'vitest'
import { CEILING_Y, ICICLE, ON_BANK_Y, restOf, widthOf, type Kind, type Rest } from './blocks'
import { AT, FOOT_LANDS, KING_REACH, kingPose, lampPose, lampReachesTo, reactionOf, type Actor, type KingPose, type LampMood } from './cast'
import * as figures from './figures'
import { BERRY } from './first'
import { BLOCK_H, BOUGH, BUILD, FRONT_Y, GROUND_Y, type Hole, type Point } from './ground'
import { GATE_MIN, KING_SEATED, SEAT_ROWS, lampsOf, nightOf, openGapOf, overSeat, seatOf } from './night'
import { Print, type Sprite } from './print'
import { FEET, along, clearance, lengthOf } from './route'
import { STAGE, fit } from './stage'
import { bare, carry, drag, frame, letGo, moveTo, names, press, pullSun, run, scoop, cut } from './testing'
import { STEP, Toy, type World } from './toy'
import { BIRD_BOX, HOME_CONTROL, perch } from './toyDay'
import { inTheWay, lampFeet, peeperFeet, skateOf } from './toyKids'
import { KING_BODY, KING_DRAWN, KING_FAR, NARROWEST, POLISH_REACH, clearInReach, gateOf, hatPlace, kingAwake, kingInSnow, tryPlace } from './toyKing'

// Nothing passes through anything, where the model says who is where: King
// Winter and the wall, a block and his head, the frost children and what
// lies in their way, the lamp and the bank's end, the bird and the home
// control. And King Winter stirs only for his own seat.

const row = (n: number): number => ON_BANK_Y - n * BLOCK_H
const on = (kind: Kind, len: number, x: number, n: number): Rest => restOf(kind, len, x, row(n), 'built')
const gate = (kind: Kind = 'clear'): Rest[] => [on(kind, 64, 400, 0), on(kind, 64, 560, 0), on(kind, 224, 480, 1)]
const world = (blocks: Rest[], night = false, holes: Hole[] = []): World => ({ ...bare(night), blocks: [{ ...BERRY }, ...blocks], holes })
const standing = (toy: Toy): Rest[] => toy.pieces.filter((p) => p.mode === 'rest' && (p.rest.place === 'built' || p.rest.place === 'hung')).map((p) => ({ kind: p.kind, len: p.len, x: p.rest.x, y: p.rest.y, place: p.rest.place, dent: p.dent, cap: p.cap }))

/**
 * How far to each side King Winter is drawn, on the stage: the real figure drawn by the real view code onto a
 * surface that only keeps the furthest left and right of every shape. His sprites are painted in place of
 * their stamps, so that what is measured is his ink and not the box it was baked in.
 */
function kingSpan(at: { x: number; y: number; scale: number; sat: number; narrow: number }, pose: KingPose): { x0: number; x1: number } {
  type M = [number, number, number, number, number, number]
  let m: M = [1, 0, 0, 1, 0, 0]
  const stack: M[] = []
  const span = { x0: Infinity, x1: -Infinity }
  const seen = (x: number, y: number): void => {
    const sx = m[0] * x + m[2] * y + m[4]
    span.x0 = Math.min(span.x0, sx)
    span.x1 = Math.max(span.x1, sx)
  }
  const by = (n: M): void => {
    m = [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]
  }
  const calls: Record<string, (...v: number[]) => void> = {
    save: () => void stack.push(m),
    restore: () => void (m = stack.pop() ?? m),
    translate: (x, y) => by([1, 0, 0, 1, x, y]),
    rotate: (a) => by([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]),
    scale: (x, y) => by([x, 0, 0, y, 0, 0]),
    moveTo: seen,
    lineTo: seen,
    quadraticCurveTo: (cx, cy, x, y) => (seen(cx, cy), seen(x, y)),
    bezierCurveTo: (ax, ay, bx, by2, x, y) => (seen(ax, ay), seen(bx, by2), seen(x, y)),
    ellipse: (cx, cy, rx, ry, turn) => {
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry
        seen(cx + ex * Math.cos(turn) - ey * Math.sin(turn), cy + ex * Math.sin(turn) + ey * Math.cos(turn))
      }
    },
  }
  const g = new Proxy({} as Record<string, unknown>, {
    get: (target, name) => (typeof name !== 'string' ? undefined : name in target ? target[name] : (calls[name] ?? (() => undefined))),
    set: (target, name, value) => ((target[name as string] = value), true),
  }) as unknown as CanvasRenderingContext2D
  const p = new Print(g)
  const sprite = (box: { x: number; y: number; w: number; h: number }): Sprite => ({ ...box, day: {} as CanvasImageSource, night: {} as CanvasImageSource, figure: {} as CanvasImageSource })
  const s = { body: sprite(figures.KING_BODY), beard: sprite(figures.KING_BEARD), head: sprite(figures.KING_HEAD) }
  const paint = new Map<Sprite, (p: Print) => void>([[s.body, figures.paintKingBody], [s.beard, figures.paintKingBeard], [s.head, figures.paintKingHead]])
  p.sprite = (of, x, y, turn = 0, sx = 1, sy = 1) => p.at(x, y, turn, sx, sy, () => paint.get(of)!(p))
  figures.drawKing(p, s, pose, at, null, null)
  return span
}

/** What is wrong with where King Winter is in this step, in words; and whether he is changing sides of the wall. */
function kingFault(toy: Toy): { fault: string | null; crossing: boolean } {
  const king = toy.king, things = standing(toy)
  if (king.y > GROUND_Y + 0.01 && king.y < FRONT_Y - 0.01) {
    // Between the front snow and the bank he is in the wall's own plane: only at the gate, and drawn no wider than it.
    const at = gateOf(things), gap = openGapOf(things)
    if (Math.abs(king.x - at.x) > 0.01) return { fault: `crosses the wall at ${king.x}, and the gate is at ${at.x}`, crossing: true }
    const span = kingSpan(king, kingPose(toy.time, toy.cast.king, true))
    if (gap && (span.x0 < gap.x - gap.w / 2 - 0.5 || span.x1 > gap.x + gap.w / 2 + 0.5)) {
      return { fault: `is drawn from ${span.x0.toFixed(1)} to ${span.x1.toFixed(1)} in a gap from ${gap.x - gap.w / 2} to ${gap.x + gap.w / 2}`, crossing: true }
    }
    // He is as tall as the wall is high: nothing of it, at any height, is over what is drawn of him.
    const hit = things.find((b) => b.x + widthOf(b) / 2 > span.x0 + 0.5 && b.x - widthOf(b) / 2 < span.x1 - 0.5)
    return { fault: hit ? `squeezes through a ${hit.kind} block at ${hit.x}` : null, crossing: true }
  }
  if (king.y <= GROUND_Y + 0.01) {
    // Up on the bank he is behind the wall, or standing on the top of a block.
    const onTop = things.some((b) => b.place === 'built' && Math.abs(b.y - BLOCK_H / 2 - king.y) < 0.01 && Math.abs(b.x - king.x) <= widthOf(b) / 2)
    if (!king.behind && !onTop) return { fault: `is in front of the wall at ${Math.round(king.x)}, ${Math.round(king.y)}, on the bank`, crossing: false }
    return { fault: null, crossing: false }
  }
  return { fault: king.behind ? 'is behind the wall on the front snow' : null, crossing: false }
}

describe('King Winter and the wall', () => {
  it.each([
    ['a gate with a seat on it, and the widest gap beside it', gate(), 732],
    ['a gap narrower than he is, which he squeezes through', [on('clear', 300, 364, 0), on('clear', 250, 705, 0)], 547],
    ['a gap as narrow as a gate can be, where he is a quarter of himself', [on('clear', 300, 364, 0), on('clear', 290, 715, 0)], 542],
    ['a roofed gap, which he passes over for the next open one, narrower as it is', [on('clear', 120, 330, 0), on('clear', 120, 570, 0), on('clear', 300, 450, 1), on('clear', 120, 800, 0)], 685],
    ['a gap a block overhangs by a sliver, which roofs nothing: he walks in by what is left open', [on('clear', 220, 324, 0), on('clear', 220, 764, 0), on('clear', 240, 334, 1)], 554],
    ['a wall with no gap in it, which he goes round by the bank’s end', [on('clear', 220, 324, 0), on('clear', 220, 544, 0), on('clear', 220, 764, 0), on('clear', 200, 544, 1)], BUILD.x1 + 36 + KING_BODY / 2],
  ] as const)('never passes through it, in or out: %s', (_, blocks, gateX) => {
    const toy = new Toy(world([...blocks]), 1)
    expect(gateOf(standing(toy)).x).toBe(gateX)
    let crossings = 0, was = false
    const watch = (seconds: number): void => {
      for (let step = 0; step < Math.round(seconds / STEP); step++) {
        frame(toy)
        const { fault, crossing } = kingFault(toy)
        expect(fault, `King Winter ${fault} (step ${step})`).toBeNull()
        if (crossing && !was) crossings++
        was = crossing
      }
    }
    pullSun(toy, true)
    watch(16)
    expect(toy.king).toMatchObject({ where: 'seat', sat: 1 })
    expect(crossings).toBe(1)
    pullSun(toy, false)
    watch(9)
    expect(toy.king).toMatchObject({ where: 'home', x: AT.king.x, y: AT.king.y, behind: false, narrow: 1 })
    expect(crossings).toBe(2)
  })

  it('is drawn no wider than his own measure says, cushion and all: what goes through a gap is all of him', () => {
    let left = 0, right = 0
    for (let t = 0; t < 12; t += 0.1) {
      const span = kingSpan({ x: 0, y: 0, scale: 1, sat: 0, narrow: 1 }, kingPose(t, { what: null, age: 0, next: [] }, true))
      left = Math.min(left, span.x0)
      right = Math.max(right, span.x1)
    }
    expect(-left).toBeLessThanOrEqual(KING_REACH)
    expect(right).toBeLessThanOrEqual(KING_REACH)
    expect(Math.max(-left, right)).toBeGreaterThan(KING_REACH - 4)
    expect(KING_DRAWN).toBe(2 * KING_REACH * KING_FAR)
    // Squeezed, he is that much narrower, and nothing of him is left outside.
    const thin = kingSpan({ x: 500, y: 500, scale: KING_FAR, sat: 0, narrow: NARROWEST }, kingPose(3, { what: null, age: 0, next: [] }, true))
    expect(thin.x1 - thin.x0).toBeLessThanOrEqual(KING_DRAWN * NARROWEST)
  })

  it('takes for his gate the widest gap that is open to the sky, and counts a gap roofed only when less than his narrowest is left open', () => {
    const END = BUILD.x1 + 36 + KING_BODY / 2
    // One gap, from 400 to 500, in a wall that fills the rest of the bank; a block in the row above hangs over it from the left. No block is longer than the pond gives.
    const wall = (over: number): Rest[] => [on('clear', 186, 307, 0), on('clear', 186, 593, 0), on('clear', 186, 779, 0), on('clear', 186 + over, 307 + over / 2, 1)]
    expect(gateOf(wall(0))).toEqual({ x: 450, narrow: (100 - 4) / KING_DRAWN })
    // A sliver of overhang roofs nothing: he walks in by what is left open.
    expect(gateOf(wall(10))).toEqual({ x: 455, narrow: (90 - 4) / KING_DRAWN })
    // He squeezes to a quarter of himself as he is drawn, which with a finger of air each side is the least a gate can be.
    expect(GATE_MIN).toBe(Math.ceil(KING_DRAWN * NARROWEST + 4))
    expect(gateOf(wall(100 - GATE_MIN))).toEqual({ x: 500 - GATE_MIN / 2, narrow: (GATE_MIN - 4) / KING_DRAWN })
    // One unit more over it and the gap is roofed; with no other gap open he goes round the bank's end.
    expect(gateOf(wall(100 - GATE_MIN + 1))).toEqual({ x: END, narrow: 1 })
    // A wider roofed gap is passed over for a narrower open one.
    const two = [on('clear', 100, 264, 0), on('clear', 100, 524, 0), on('clear', 300, 394, 1), on('clear', 178, 783, 0)]
    expect(gateOf(two)).toEqual({ x: 634, narrow: (120 - 4) / KING_DRAWN })
    // And a gap roofed high up, rows above, is roofed all the same.
    expect(gateOf([...two.slice(0, 2), on('clear', 100, 264, 1), on('clear', 100, 524, 1), on('clear', 300, 394, 2), two[3]])).toEqual({ x: 634, narrow: (120 - 4) / KING_DRAWN })
  })

  it.each([
    ['under a lintel, on the lamp that hangs in that hollow', 2, true],
    ['under a lamp that hangs high over it, where no block is in his way', 5, false],
  ] as const)('never sits through a roof or on a lamp: a wide block between pillars %s is no seat', (_, rows, ball) => {
    // Two pillars with a lintel across them and a wide block on the snow between: the lamp hangs in the hollow over the wide block.
    const pillar = (x: number): Rest[] => Array.from({ length: rows }, (_n, n) => on('clear', 64, x, n))
    const blocks = [...pillar(400), ...pillar(600), on('clear', 130, 500, 0), on('clear', 264, 500, rows), ...(ball ? [restOf('ball', 46, 500, row(rows + 1), 'built')] : [])]
    const wide = blocks.findIndex((b) => b.len === 130)
    const night = nightOf(blocks)
    expect(night.lamps[0]).toMatchObject({ x: 500, y: row(rows - 1), hung: true })
    // Its roof is in the air he would sit in when it is low; a lamp is in it either way.
    expect(overSeat(blocks[wide], blocks, []).things.some((b) => b.len === 264)).toBe(rows === 2)
    expect(overSeat(blocks[wide], blocks.filter((b) => b.kind !== 'ball'), night.lamps).lamp).toBe(true)
    const found = seatOf(blocks)
    expect(found.bearing).not.toContain(wide)
    expect(found.seat).toBe(-1)
    // Without the lamp and the roof the same block is his seat.
    expect(seatOf([blocks[wide]]).seat).toBe(0)
    const toy = new Toy(world(blocks), 1)
    pullSun(toy, true)
    let sat = false
    for (let step = 0; step < Math.round(30 / STEP); step++) {
      frame(toy)
      sat ||= toy.king.where === 'seat'
      const { fault } = kingFault(toy)
      expect(fault, `King Winter ${fault} (step ${step})`).toBeNull()
    }
    expect(sat).toBe(false)
    expect(toy.king).toMatchObject({ where: 'snow', sat: 1, x: AT.king.x, y: AT.king.y })
  })

  it('takes no seat above the fourth row, where he can still climb: the same wide block a row higher is tried with one foot and grumbled at', () => {
    const tower = (rows: number): Rest[] => Array.from({ length: rows }, (_, n) => on('clear', 150, 500, n))
    expect(SEAT_ROWS).toBe(4)
    expect(seatOf(tower(4)).seat).toBe(3)
    // A fifth block on the tower: the fourth has it on it, and the fifth stands too high.
    expect(seatOf(tower(5))).toMatchObject({ seat: -1, highest: 4, bearing: [] })
    // A low seat beside the tower is his seat then, as the highest block that will bear him.
    expect(seatOf([...tower(5), on('clear', 150, 720, 0)]).seat).toBe(5)
    // Why the fourth row: sat there his crown is under the tips of the bough's icicles, and a row higher it would be among them.
    const tips = Math.max(...BOUGH.map((root) => root.y + ICICLE))
    expect(row(3) - BLOCK_H / 2 - KING_SEATED).toBeGreaterThan(tips)
    expect(row(4) - BLOCK_H / 2 - KING_SEATED).toBeLessThan(tips)
    // Played: he walks in, tries the top of the tower once with one foot, and sits in the snow with his grumble.
    const toy = new Toy(world(tower(5)), 1)
    pullSun(toy, true)
    toy.takeSounds()
    let tries = 0, sat = false
    const heard: string[] = []
    for (let step = 0; step < Math.round(30 / STEP); step++) {
      const was = toy.cast.king.what
      frame(toy)
      heard.push(...names(toy))
      if (toy.cast.king.what === 'foot' && was !== 'foot') tries++
      sat ||= toy.king.where === 'seat'
    }
    expect([tries, sat]).toEqual([1, false])
    expect(heard).toContain('grumble')
    expect(toy.king).toMatchObject({ where: 'snow', sat: 1, x: AT.king.x, y: AT.king.y })
    expect(toy.pieces.find((p) => p.id === toy.king.tested)?.rest.y).toBe(row(4))
  })

  it('is seen to drop onto the snow when his seat is pulled from under him: not one step on air', () => {
    const toy = new Toy(world(gate(), true), 1)
    const top = toy.king.y
    expect(top).toBe(row(1) - BLOCK_H / 2)
    press(toy, 384, row(1))
    moveTo(toy, 384, row(1) + 120)
    expect(toy.hand?.piece.len).toBe(224)
    // In the call that takes the block he is already falling.
    expect(toy.king.fall).toBeGreaterThan(0)
    expect(toy.king.behind).toBe(true)
    toy.takeSounds()
    let before = toy.king.y, steps = 0
    while (toy.king.y < GROUND_Y && steps < 120) {
      frame(toy)
      expect(toy.king.y).toBeGreaterThan(before)
      before = toy.king.y
      steps++
    }
    expect(steps).toBeGreaterThan(5)
    expect(steps).toBeLessThan(30)
    expect(toy.king).toMatchObject({ y: GROUND_Y, sat: 1, where: 'snow', fall: 0, behind: true })
    expect(names(toy)).toContain('oomph')
    expect(toy.takeMotions().some((m) => m.type === 'puff')).toBe(true)
    letGo(toy)
  })

  it('stirs only for his own seat: nothing else that is taken, set, cut or scooped makes him stand', () => {
    const toy = new Toy(world([...gate(), on('clear', 100, 740, 0), restOf('clear', 64, 700, 600, 'lying')], true), 1)
    const seat = { x: toy.king.x, y: toy.king.y }
    let stood = false
    const heard: string[] = []
    const watch = (seconds: number): void => {
      for (let step = 0; step < Math.round(seconds / STEP); step++) {
        frame(toy)
        heard.push(...names(toy))
        stood ||= toy.king.sat < 1 || toy.king.wait > 0 || toy.king.x !== seat.x || toy.king.y !== seat.y
      }
    }
    for (const [x0, y0, x1, y1] of [[700, 600, 740, 300], [740, row(1), 300, 300], [300, row(0), 760, 590]]) {
      drag(toy, x0, y0, x1, y1, 8)
      watch(0.3)
      letGo(toy)
      watch(1.6)
    }
    scoop(toy, 200)
    cut(toy, 480, 700, 600, 700)
    watch(2)
    expect(stood).toBe(false)
    for (const sound of ['oomph', 'grumble', 'squawk', 'hatOff']) expect(heard).not.toContain(sound)
    // A block set on his seat beside him is his seat touched: he stands on it, waits, and goes.
    drag(toy, 760, 590, 582, 330, 8)
    letGo(toy)
    let onIt = 0
    for (let step = 0; step < 120; step++) {
      frame(toy)
      if (toy.king.sat < 1 && toy.king.x === seat.x && toy.king.y === seat.y) onIt++
    }
    expect(onIt).toBeGreaterThan(20)
    run(toy, 14)
    expect(toy.king.where).not.toBe('seat')
  })

  it('wears a block that is let go over him on his seat: it lands on his head, never behind him', () => {
    const toy = new Toy(world([...gate(), restOf('cloudy', 70, 700, 600, 'lying')], true), 1)
    drag(toy, 700, 600, toy.king.x + 10, toy.king.y - 220, 8)
    letGo(toy)
    const hat = toy.pieces.find((p) => p.kind === 'cloudy')!
    expect(hat.mode).toBe('hat')
    expect(names(toy)).toContain('hatOn')
    run(toy, 0.6)
    const head = hatPlace(toy)
    expect(Math.hypot(hat.x - head.x, hat.y - head.y)).toBeLessThan(2)
    expect(toy.king).toMatchObject({ where: 'seat', sat: 1 })
    // The save has it lying on the snow, where it comes off to.
    expect(toy.world().blocks.find((b) => b.kind === 'cloudy')).toMatchObject({ place: 'lying' })
  })

  it('rises with a squawk from an icicle let go over him as he sits: an icicle is no hat, it goes to his seat, point up', () => {
    const toy = new Toy(world([...gate(), restOf('icicle', ICICLE, 700, 600, 'lying')], true), 1)
    const seat = { x: toy.king.x, y: toy.king.y }, icicle = toy.pieces.find((p) => p.kind === 'icicle')!
    drag(toy, 700, 600, seat.x + 10, seat.y - 220, 8)
    toy.takeSounds()
    letGo(toy)
    // In the call that lets it go he is already on his way up: the point never comes down on him.
    expect(icicle.mode).not.toBe('hat')
    expect(toy.cast.king.what).toBe('squawk')
    const heard = names(toy)
    for (let step = 0; step < 120; step++) {
      frame(toy)
      heard.push(...names(toy))
      expect(icicle.mode).not.toBe('hat')
    }
    expect(heard).toContain('squawk')
    expect(heard).not.toContain('hatOn')
    expect(icicle.rest).toMatchObject({ place: 'built', y: row(2) })
    expect(Math.abs(icicle.rest.x - seat.x)).toBeLessThan(KING_BODY / 2)
    // With a point on his only seat he ends in the snow at his own place.
    run(toy, 14)
    expect(toy.king).toMatchObject({ where: 'snow', sat: 1, x: AT.king.x, y: AT.king.y })
  })

  it('wears no block that is let go beside him, however long it is: only one whose middle is over him', () => {
    const toy = new Toy(world([...gate(), on('clear', 100, 760, 0), restOf('cloudy', 200, 700, 600, 'lying')], true), 1)
    const long = toy.pieces.find((p) => p.kind === 'cloudy')!
    // Its middle is beside him, over the bank, and its end reaches over his shoulder.
    drag(toy, 700, 600, toy.king.x + KING_BODY / 2 + 40, toy.king.y - 150, 8)
    toy.takeSounds()
    letGo(toy)
    expect(long.mode).not.toBe('hat')
    run(toy, 2)
    expect(long.mode).toBe('rest')
    expect(names(toy)).not.toContain('hatOn')
    // By day at his own place it is the same: its end over his shoulder is no hat, its middle on him is one.
    const day = new Toy(world([restOf('cloudy', 200, 700, 600, 'lying')]), 1)
    const block = day.pieces.find((p) => p.kind === 'cloudy')!
    drag(day, 700, 600, AT.king.x - 124, AT.king.y - 300, 8)
    letGo(day)
    expect(block.mode).not.toBe('hat')
    run(day, 2)
    expect(block.mode).toBe('rest')
    drag(day, block.x, block.y, AT.king.x - 100, AT.king.y - 300, 8)
    letGo(day)
    expect(block.mode).toBe('hat')
  })

  it('does not stir when a block is taken from under a seat that still stands, and drops when his seat falls with what bore it', () => {
    // His seat lies on three posts: it stands without the middle one, and without a second.
    const toy = new Toy(world([on('clear', 64, 400, 0), on('clear', 64, 480, 0), on('clear', 64, 560, 0), on('clear', 224, 480, 1)], true), 1)
    const seat = toy.pieces.find((p) => p.len === 224)!, at = { x: toy.king.x, y: toy.king.y }
    expect(at).toEqual({ x: 480, y: row(1) - BLOCK_H / 2 })
    toy.takeSounds()
    let stirred = false
    const heard: string[] = []
    const watch = (seconds: number): void => {
      for (let step = 0; step < Math.round(seconds / STEP); step++) {
        frame(toy)
        heard.push(...names(toy))
        stirred ||= toy.king.sat < 1 || toy.king.wait > 0 || toy.king.fall > 0 || toy.king.x !== at.x || toy.king.y !== at.y
      }
    }
    for (const [x, to] of [[480, 300], [400, 250]]) {
      drag(toy, x, row(0), to, 620, 8)
      watch(0.3)
      letGo(toy)
      watch(2)
      expect(seat).toMatchObject({ mode: 'rest', rest: { x: 480, y: row(1) } })
    }
    expect(stirred).toBe(false)
    for (const sound of ['oomph', 'grumble', 'squawk', 'hatOff']) expect(heard).not.toContain(sound)
    // The last post goes, and his seat comes down with it: he is falling in that call.
    press(toy, 560, row(0))
    moveTo(toy, 700, 620)
    expect(seat.mode).not.toBe('rest')
    expect(toy.king.fall).toBeGreaterThan(0)
    letGo(toy)
    let lowest = toy.king.y
    for (let step = 0; step < 90; step++) {
      frame(toy)
      heard.push(...names(toy))
      lowest = Math.max(lowest, toy.king.y)
    }
    expect(heard).toContain('oomph')
    expect(lowest).toBe(GROUND_Y)
  })

  it('stands, waits and goes when a roof is set over his head: he never sits on under a block that is in the air he sits in', () => {
    // He sits on a wide block between two pillars that stand a row higher than his seat.
    const toy = new Toy(world([on('clear', 150, 500, 0), on('clear', 64, 360, 0), on('clear', 64, 360, 1), on('clear', 64, 640, 0), on('clear', 64, 640, 1), restOf('cloudy', 240, 700, 620, 'lying')], true), 1)
    const at = { x: toy.king.x, y: toy.king.y }
    expect(at).toEqual({ x: 500, y: row(0) - BLOCK_H / 2 })
    // A long block is let go on the right pillar, its middle beside him and its end over his head.
    drag(toy, 700, 620, 590, row(2) - 30, 8)
    toy.takeSounds()
    letGo(toy)
    const roof = toy.pieces.find((p) => p.kind === 'cloudy')!
    let onIt = 0, through = false
    for (let step = 0; step < 240; step++) {
      frame(toy)
      if (roof.mode !== 'rest') continue
      if (toy.king.x === at.x && toy.king.y === at.y && toy.king.sat < 1) onIt++
      // Once it has landed he is not sat under it in front of the wall: he is on his feet behind what was set, or gone.
      through ||= toy.king.x === at.x && toy.king.y === at.y && toy.king.sat >= 1 && toy.king.wait <= 0
    }
    expect(roof.mode).toBe('rest')
    expect(roof.rest).toMatchObject({ place: 'built', y: row(2) })
    expect(Math.abs(roof.rest.x - at.x)).toBeLessThan(120 + KING_BODY / 2)
    expect(names(toy)).not.toContain('hatOn')
    expect(onIt).toBeGreaterThan(20)
    expect(through).toBe(false)
    run(toy, 14)
    expect(toy.king.where).not.toBe('seat')
  })

  it('stands, waits and goes when a lamp comes to hang in the air he sits in: a lintel too high to be his roof still hangs a lamp over his seat, and no lamp ever hangs in his crown', () => {
    // He sits on a wide block between two pillars five rows high; nothing lies across them yet.
    const pillar = (x: number): Rest[] => Array.from({ length: 5 }, (_n, n) => on('clear', 64, x, n))
    const toy = new Toy(world([on('clear', 130, 500, 0), ...pillar(400), ...pillar(600), restOf('cloudy', 240, 700, 640, 'lying')], true), 1)
    const at = { x: toy.king.x, y: toy.king.y }
    expect(at).toEqual({ x: 500, y: row(0) - BLOCK_H / 2 })
    // A lintel is let go on the right pillar, its middle beside him: it comes to rest five rows over his seat.
    drag(toy, 700, 640, 575, row(5) - 20, 8)
    toy.takeSounds()
    letGo(toy)
    const lintel = toy.pieces.find((p) => p.kind === 'cloudy')!
    const heard: string[] = []
    let onIt = 0, under = false
    for (let step = 0; step < 240; step++) {
      frame(toy)
      heard.push(...names(toy))
      if (lintel.mode !== 'rest') continue
      if (toy.king.x === at.x && toy.king.y === at.y && toy.king.sat < 1) onIt++
      under ||= toy.king.x === at.x && toy.king.y === at.y && toy.king.sat >= 1 && toy.king.wait <= 0
    }
    expect(lintel.rest).toMatchObject({ place: 'built', y: row(5) })
    // The block itself is above his crown; the lamp that hangs under it is not.
    const wall = standing(toy), seat = wall.find((b) => b.len === 130)!
    const over = overSeat(seat, wall, lampsOf(wall))
    expect(over.things).toEqual([])
    expect(over.lamp).toBe(true)
    expect(onIt).toBeGreaterThan(20)
    expect(under).toBe(false)
    expect(heard).not.toContain('squawk')
    expect(heard).not.toContain('hatOn')
    run(toy, 14)
    expect(toy.king).toMatchObject({ where: 'snow', sat: 1, x: AT.king.x, y: AT.king.y })
  })

  it('drops when a warm thumb makes a snowball of his snow seat: the seat is gone from under him', () => {
    const toy = new Toy(world([on('snow', 150, 500, 0)], true), 1)
    const seat = toy.pieces.find((p) => p.kind === 'snow')!
    expect(toy.king).toMatchObject({ where: 'seat', x: 500, y: row(0) - BLOCK_H / 2 })
    // The thumb rests on the block under him, which is touched below him.
    press(toy, 500, row(0) + 6)
    expect(toy.hand?.piece).toBe(seat)
    toy.takeSounds()
    const heard: string[] = []
    let fell = -1
    for (let step = 0; step < Math.round(2.4 / STEP); step++) {
      const was = seat.kind
      frame(toy)
      heard.push(...names(toy))
      // In the step the block slumps into a ball he is already falling.
      if (was === 'snow' && seat.kind !== 'snow') fell = toy.king.fall
    }
    letGo(toy)
    expect(seat.kind).toBe('ball')
    expect(fell).toBeGreaterThan(0)
    expect(heard).toEqual(expect.arrayContaining(['squelch', 'oomph']))
    run(toy, 14)
    expect(toy.king).toMatchObject({ where: 'snow', sat: 1, x: AT.king.x, y: AT.king.y })
    // A seat of clear ice melted away under a thumb is gone from under him just the same.
    const ice = new Toy(world([on('clear', 150, 500, 0)], true), 1)
    expect(ice.king.where).toBe('seat')
    press(ice, 500, row(0) + 6)
    ice.takeSounds()
    const melting: string[] = []
    for (let step = 0; step < Math.round(5 / STEP); step++) {
      frame(ice)
      melting.push(...names(ice))
    }
    letGo(ice)
    expect(ice.pieces.some((p) => p.kind === 'clear')).toBe(false)
    expect(melting).toEqual(expect.arrayContaining(['sigh', 'oomph']))
    expect(ice.king.where).toBe('snow')
  })

  it('sat in the snow at night wears a block let go with its middle over him, as by day, nods it off, and takes no hat with him when he gets up for a seat', () => {
    const toy = new Toy(world([restOf('cloudy', 70, 700, 600, 'lying'), restOf('icicle', ICICLE, 600, 600, 'lying'), restOf('clear', 150, 420, 620, 'lying')], true), 1)
    expect(toy.king).toMatchObject({ where: 'snow', sat: 1, x: AT.king.x, y: AT.king.y })
    expect(kingInSnow(toy)).toBe(true)
    const hat = toy.pieces.find((p) => p.kind === 'cloudy')!, icicle = toy.pieces.find((p) => p.kind === 'icicle')!
    // An icicle is no hat by night.
    drag(toy, 600, 600, AT.king.x - 60, AT.king.y - 300, 8)
    letGo(toy)
    expect(icicle.mode).not.toBe('hat')
    run(toy, 1.5)
    // Its end over his shoulder is no hat; its middle on him is one.
    drag(toy, 700, 600, AT.king.x - 124, AT.king.y - 300, 8)
    letGo(toy)
    expect(hat.mode).not.toBe('hat')
    run(toy, 1.5)
    drag(toy, hat.x, hat.y, AT.king.x - 60, AT.king.y - 300, 8)
    toy.takeSounds()
    letGo(toy)
    expect(hat.mode).toBe('hat')
    expect(names(toy)).toContain('hatOn')
    expect(toy.world().blocks.find((b) => b.kind === 'cloudy')).toMatchObject({ place: 'lying' })
    // Under a hat he dozes, by night too: his head sinks, he starts awake, and the hat is off, on the snow beside him.
    expect(kingAwake(toy)).toBe(false)
    const heard: string[] = []
    let nod = 0, worn = 0
    for (let step = 0; step < Math.round(11.5 / STEP) && hat.mode === 'hat'; step++) {
      frame(toy)
      heard.push(...names(toy))
      nod = Math.max(nod, kingPose(toy.time, toy.cast.king, kingAwake(toy)).nod)
      worn++
    }
    expect(worn).toBeLessThan(Math.round(11.2 / STEP))
    expect(nod).toBeGreaterThan(0.8)
    expect(heard).toContain('hatOff')
    run(toy, 1.5)
    expect(hat).toMatchObject({ mode: 'rest', rest: { place: 'lying' } })
    expect(toy.king).toMatchObject({ where: 'snow', sat: 1, x: AT.king.x, y: AT.king.y })
    expect(kingAwake(toy)).toBe(true)
    // With a hat on again, a seat is set on the bank: he gets up for it, and the hat comes off as he sets out.
    drag(toy, hat.x, hat.y, AT.king.x - 60, AT.king.y - 300, 8)
    letGo(toy)
    expect(hat.mode).toBe('hat')
    drag(toy, 420, 620, 500, 440, 8)
    letGo(toy)
    toy.takeSounds()
    let carried = false
    const after: string[] = []
    for (let step = 0; step < Math.round(3 / STEP); step++) {
      frame(toy)
      after.push(...names(toy))
      carried ||= hat.mode === 'hat' && (toy.king.x !== AT.king.x || toy.king.y !== AT.king.y)
    }
    expect(carried).toBe(false)
    expect(after).toContain('hatOff')
    run(toy, 12)
    expect(toy.king).toMatchObject({ where: 'seat', sat: 1, x: 500 })
    expect(hat).toMatchObject({ mode: 'rest', rest: { place: 'lying' } })
  })

  it('nods a hat off his head on his seat by night as he does by day, and sits on', () => {
    const toy = new Toy(world([...gate(), restOf('cloudy', 70, 700, 600, 'lying')], true), 1)
    const seat = { x: toy.king.x, y: toy.king.y }, hat = toy.pieces.find((p) => p.kind === 'cloudy')!
    drag(toy, 700, 600, seat.x + 10, seat.y - 220, 8)
    letGo(toy)
    expect(hat.mode).toBe('hat')
    toy.takeSounds()
    const heard: string[] = []
    let stirred = false
    for (let step = 0; step < Math.round(13 / STEP); step++) {
      frame(toy)
      heard.push(...names(toy))
      stirred ||= toy.king.sat < 1 || toy.king.x !== seat.x || toy.king.y !== seat.y
    }
    expect(heard.filter((name) => name === 'hatOff')).toHaveLength(1)
    expect(hat).toMatchObject({ mode: 'rest', rest: { place: 'lying' } })
    expect(stirred).toBe(false)
  })

  it.each([
    ['a clear block that stands where he passes, and only when his beard reaches it', 'clear', 1],
    ['nothing, where no clear block stands on his way', 'cloudy', 0],
  ] as const)('polishes %s', (_, kind, times) => {
    // The gap he walks in by is at the right of the wall; the block beside it is clear, or is not.
    const toy = new Toy(world([on('cloudy', 300, 364, 0), on(kind, 250, 705, 0)]), 1)
    pullSun(toy, true)
    let polished = 0
    for (let step = 0; step < Math.round(16 / STEP); step++) {
      const was = toy.cast.king.what
      frame(toy)
      if (toy.cast.king.what !== 'polish' || was === 'polish') continue
      polished++
      const block = clearInReach(toy)
      expect(block).not.toBeNull()
      expect(Math.abs(block!.rest.x - toy.king.x)).toBeLessThanOrEqual(widthOf(block!) / 2 + POLISH_REACH)
      expect(toy.king.y).toBeGreaterThanOrEqual(GROUND_Y)
    }
    expect(polished).toBe(times)
    expect(toy.king.where).toBe('seat')
  })

  it('with nothing to bear him walks in, stands clear of the highest block and tries it once with one foot, then sits in the snow at his own place', () => {
    const toy = new Toy(world([on('clear', 90, 500, 0), on('clear', 90, 500, 1), on('cloudy', 90, 500, 2)]), 1)
    const high = toy.pieces.find((p) => p.kind === 'cloudy')!
    pullSun(toy, true)
    toy.takeSounds()
    let tries = 0, landed = false, birdOn = false, clear = true
    const heard: string[] = []
    for (let step = 0; step < Math.round(30 / STEP); step++) {
      const was = toy.cast.king.what
      frame(toy)
      const sounds = names(toy)
      heard.push(...sounds)
      const king = toy.cast.king
      if (king.what !== 'foot') continue
      if (was !== 'foot') tries++
      // He stands on the front snow beside it, his body clear of it, and the bird is off it before the foot is.
      clear &&= toy.king.y === FRONT_Y && toy.king.x - KING_BODY / 2 >= high.rest.x + 45
      if (king.age >= reactionOf('king', 'foot').lasts * FOOT_LANDS) {
        landed ||= sounds.includes('tock')
        birdOn ||= Math.abs(toy.bird.x - high.rest.x) < 45 + BIRD_BOX.side && Math.abs(toy.bird.y - (high.rest.y - BLOCK_H / 2 - 24)) < 30
      }
    }
    expect([tries, landed, birdOn, clear]).toEqual([1, true, false, true])
    const foot = tryPlace({ x: high.rest.x, y: high.rest.y, kind: high.kind, len: high.len }).foot
    expect(foot.y).toBe(high.rest.y - BLOCK_H / 2)
    expect(Math.abs(foot.x - high.rest.x)).toBeLessThanOrEqual(45)
    expect(heard).toContain('grumble')
    expect(toy.king).toMatchObject({ where: 'snow', sat: 1, x: AT.king.x, y: AT.king.y, behind: false })
    // The bird is back on the block he left.
    expect(toy.bird).toMatchObject({ x: high.rest.x, y: high.rest.y - BLOCK_H / 2 - 24 })
  })
})

describe('the frost children', () => {
  const crowded = (): World => world(
    [restOf('clear', 200, 420, 610, 'lying'), restOf('cloudy', 160, 520, 760, 'lying'), restOf('snow', 120, 300, 700, 'lying'), restOf('clear', 90, 640, 590, 'lying')],
    false,
    [{ x: 420, y: 680, angle: 0.3, len: 180 }, { x: 640, y: 700, angle: -0.5, len: 140 }, { x: 300, y: 600, angle: 0, len: 90 }],
  )

  it('skate round open water and round everything that lies, out at dusk and home at morning', () => {
    const toy = new Toy(crowded(), 1)
    const way = inTheWay(toy)
    expect(way.holes).toHaveLength(3)
    expect(way.bars.length).toBeGreaterThanOrEqual(4)
    for (const out of [true, false]) {
      const skate = skateOf(toy, out)
      for (const [name, path, feet] of [['the lamp child', skate.lamp, lampFeet], ['the peeper', skate.peeper, peeperFeet]] as const) {
        let least = Infinity
        for (let i = 0; i <= 600; i++) least = Math.min(least, clearance(feet(along(path, i / 600)), way))
        expect(least, `${name}, ${out ? 'out' : 'home'}`).toBeGreaterThanOrEqual(FEET - 3)
        // It is a way round: longer than the straight line it would be with nothing there.
        expect(lengthOf(path)).toBeGreaterThan(Math.hypot(path[0].x - path[path.length - 1].x, path[0].y - path[path.length - 1].y))
      }
    }
    // And played: in no step of dusk or of morning are a child's feet in water or on a thing.
    for (const down of [true, false]) {
      pullSun(toy, down)
      for (let step = 0; step < Math.round(11 / STEP); step++) {
        frame(toy)
        if (toy.kids.lamp.behind) continue
        expect(clearance(lampFeet(toy.kids.lamp), inTheWay(toy)), `the lamp child, step ${step}`).toBeGreaterThan(8)
        expect(clearance(peeperFeet(toy.kids.peeper), inTheWay(toy)), `the peeper, step ${step}`).toBeGreaterThan(8)
      }
    }
  })

  it('the lamp in the lamp child’s mitten stays short of the bank where a palace is built, whatever it is doing', () => {
    let most = -Infinity
    const aims: (Point | null)[] = [null, { x: BUILD.x0 + 30, y: row(0) }, { x: 480, y: row(2) }, { x: 800, y: row(5) }]
    const acts: Actor[] = [{ what: null, age: 0, next: [] }]
    for (const what of ['lift', 'chirrup'] as const) for (let p = 0.05; p < 1; p += 0.05) acts.push({ what, age: p * reactionOf('lamp', what).lasts, next: [] })
    for (const mood of ['seek', 'point'] as LampMood[]) for (const aim of mood === 'point' ? aims.slice(1) : [null]) for (const actor of acts) {
      for (let t = 0; t < 24; t += 0.07) most = Math.max(most, lampReachesTo(lampPose(t, actor, mood), AT.lamp, aim))
    }
    expect(most).toBeLessThan(BUILD.x0)
    expect(most).toBeGreaterThan(AT.lamp.x + 40)
  })
})

describe('the bird', () => {
  const SIZES = [[1180, 820], [1024, 768], [820, 1180], [844, 390], [667, 375]] as const

  it.each(SIZES)('never perches under the home control on a surface of %i by %i, however high the tower and wherever it stands', (width, height) => {
    const by = fit(width, height)
    const home = { x0: width / 2 - 24, x1: width / 2 + 24, y1: 58 }
    for (let x = 440; x <= 740; x += 10) {
      const rows = Math.floor((ON_BANK_Y - CEILING_Y) / BLOCK_H) + 1
      const tower = Array.from({ length: rows }, (_, n) => on('clear', 120, x, n))
      const toy = new Toy(world([...tower, on('clear', 120, 300, 0)]), 1)
      const at = perch(toy)
      const box = { x0: by.x + (at.x - BIRD_BOX.side) * by.scale, x1: by.x + (at.x + BIRD_BOX.side) * by.scale, y0: by.y + (at.y - BIRD_BOX.up) * by.scale }
      // Its touch shape keeps a few pixels' clear of the control's foot as well.
      expect(box.x1 > home.x0 && box.x0 < home.x1 && box.y0 < home.y1 + 4, `a tower at ${x}: the bird at ${at.x}, ${at.y}`).toBe(false)
      expect(toy.bird).toMatchObject(at)
    }
    expect(HOME_CONTROL.x).toBe(STAGE.width / 2)
  })

  it('perches only on a top that is free: not under a lintel, not on King Winter’s seat, and on its bush when there is no such block', () => {
    const seated = new Toy(world(gate(), true), 1)
    expect(seated.king.where).toBe('seat')
    expect(perch(seated)).toEqual(AT.bird)
    const clearGate = new Toy(world(gate()), 1)
    expect(perch(clearGate)).toEqual({ x: 480, y: row(1) - BLOCK_H / 2 - 24 })
    const night = new Toy(world([...gate(), on('clear', 100, 740, 0)], true), 1)
    expect(night.king.where).toBe('seat')
    expect(perch(night)).toEqual({ x: 740, y: row(0) - BLOCK_H / 2 - 24 })
    // A snowball on the highest block takes the bird's place there.
    const taken = new Toy(world([on('clear', 100, 740, 0), on('clear', 100, 740, 1), restOf('ball', 46, 740, row(2), 'built'), on('clear', 100, 400, 0)]), 1)
    expect(perch(taken)).toEqual({ x: 400, y: row(0) - BLOCK_H / 2 - 24 })
    carry(taken, 740, row(2), 760, 600)
    expect(perch(taken)).toEqual({ x: 740, y: row(1) - BLOCK_H / 2 - 24 })
  })
})
