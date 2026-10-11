import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TIERS } from './config'
import type { Guidance } from './guidance'
import { CAT, FEET_Y, FRIEND_KINDS, GATE, PLACE_X, PUDDLE, RAIL, SOAP, YARD_SCALE, heldAt, lineSpot } from './layout'
import { STAGE } from './stage'
import { useCanvases } from './stitch'
import { YardView } from './view'
import { BOARD_SPOT, type Yard } from './yard'
import { FRAME, callIn, carry, open, play, tapAt, waitingAt, watch, withKinds } from './testHands'

// The frame budget, counted and not timed, so it holds on a busy runner
// (docs/solutions/test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md).
// A canvas 2D frame costs what it draws: each stamp of a cached picture and
// each live stroke or fill. The view counts those in `tally`, and the Mount
// reports that count as the frame's draw calls. This test hands the view
// canvases that count for themselves, plays the real yard through its
// heaviest moments, and holds three things: the view's own count is the true
// count, the full yard stays under the jam's budget of about 80, and a frame
// has one full-surface composite and no blur, shadow or filter.

const BUDGET = 80
const DRAWS = new Set(['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect'])

type Counter = { draws: number; full: number; effects: number }
const counter: Counter = { draws: 0, full: 0, effects: 0 }
const SURFACE = { width: STAGE.width, height: STAGE.height, ratio: 2 }

/** A canvas that draws nothing and counts what it is asked to draw. */
function countingCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = { width, height } as { width: number; height: number; getContext: () => unknown }
  const store: Record<string, unknown> = { canvas }
  const context = new Proxy(store, {
    get(target, name: string) {
      if (name in target) return target[name]
      if (name === 'createPattern') return () => ({})
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => ({ addColorStop: () => {} })
      return (...args: unknown[]) => {
        if (!DRAWS.has(name)) return undefined
        counter.draws += 1
        const source = args[0] as { width?: number; height?: number } | undefined
        if (name === 'drawImage' && source && source.width === SURFACE.width * SURFACE.ratio && source.height === SURFACE.height * SURFACE.ratio) counter.full += 1
        return undefined
      }
    },
    set(target, name: string, value) {
      if ((name === 'shadowBlur' && value !== 0) || (name === 'filter' && value !== 'none') || (name === 'globalCompositeOperation' && value !== 'source-over')) counter.effects += 1
      target[name] = value
      return true
    },
  })
  canvas.getContext = () => context
  return canvas as unknown as HTMLCanvasElement
}

class NoPath { moveTo() {} lineTo() {} bezierCurveTo() {} quadraticCurveTo() {} arc() {} ellipse() {} rect() {} closePath() {} addPath() {} }

const GATE_AT = { x: GATE.x + GATE.w / 2, y: GATE.y + GATE.h / 2 }
const bodyAt = (friend: number) => ({ x: PLACE_X[friend], y: FEET_Y - (FRIEND_KINDS[friend] === 'heron' ? 232 : 180) * YARD_SCALE })
const GUIDED: Guidance = { glow: 1, demo: 0.5, demoIndex: 0 }

let had: unknown
beforeAll(() => {
  had = (globalThis as Record<string, unknown>).Path2D
  ;(globalThis as Record<string, unknown>).Path2D = NoPath
  useCanvases(countingCanvas)
})
afterAll(() => {
  ;(globalThis as Record<string, unknown>).Path2D = had
  useCanvases(null)
})

function viewOf(): YardView {
  const view = new YardView(countingCanvas(SURFACE.width * SURFACE.ratio, SURFACE.height * SURFACE.ratio))
  view.resize(SURFACE.width, SURFACE.height, SURFACE.ratio)
  return view
}

type Seen = { frames: number; most: number; at: string; steady: number }

/** Draws the frame the Mount would draw now, counts it, and holds the view's own count to the true one. */
function frame(view: YardView, yard: Yard, seen: Seen, moment: string, guidance: Guidance | null = null, tier = TIERS[0]): number {
  counter.draws = 0; counter.full = 0; counter.effects = 0
  view.draw(yard, guidance, tier)
  const said = view.tally.stamps + view.tally.pen
  if (said !== counter.draws) throw new Error(`${moment}: the view says ${said} draws and made ${counter.draws}`)
  if (counter.full !== 1) throw new Error(`${moment}: ${counter.full} full-surface composites in one frame`)
  if (counter.effects !== 0) throw new Error(`${moment}: a blur, a shadow or a blend was set`)
  seen.frames += 1
  if (said > seen.most) { seen.most = said; seen.at = moment }
  return said
}

describe('frame budget', () => {
  it('the view counts what it draws: every stamp and every live stroke, the ones made into a cached picture included', () => {
    const view = viewOf(), yard = open(1, 5), seen: Seen = { frames: 0, most: 0, at: '', steady: 0 }
    callIn(yard, 0)
    const first = frame(view, yard, seen, 'three in the yard, first frame')
    // The first frame stitches each muddy garment once; the next frame stamps what was stitched.
    const second = frame(view, yard, seen, 'three in the yard')
    expect(second).toBeLessThanOrEqual(first)
    expect(frame(view, yard, seen, 'three in the yard, again')).toBe(second)
    // No yard yet: the still picture alone.
    counter.draws = 0
    view.draw(null, null, TIERS[0])
    expect(counter.draws).toBe(1)
    expect(view.tally.stamps + view.tally.pen).toBe(1)
  })

  it('the full yard stays within the budget at its heaviest moments, with one full-surface composite a frame', () => {
    const view = viewOf(), yard = open(2, 5), seen: Seen = { frames: 0, most: 0, at: '', steady: 0 }
    let moment = 'at rest behind the gate'
    const each = () => { frame(view, yard, seen, moment) }
    each()
    moment = 'three coming in'
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    watch(yard, each)
    moment = 'three in the yard with the idle hand showing'
    frame(view, yard, seen, moment, GUIDED)
    moment = 'rubbing a soapy garment with mud and bubbles flying'
    tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7, each)
    tapAt(yard, SOAP.x, SOAP.y); play(yard, 0.5, each)
    tapAt(yard, PUDDLE.x, PUDDLE.y); tapAt(yard, PUDDLE.x, PUDDLE.y)
    yard.press(BOARD_SPOT.x, BOARD_SPOT.y)
    for (let n = 0; n < 90; n++) { yard.drag(BOARD_SPOT.x + (n % 2 ? 80 : -80), BOARD_SPOT.y + (n % 20) * 6 - 60); yard.step(FRAME); each() }
    yard.tap()
    moment = 'one on the rail being wrung, one in the tub, the cat on the line'
    tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7, each)
    carry(yard, heldAt(1).x, heldAt(1).y, 372, 676, each); play(yard, 0.7, each)
    carry(yard, CAT.x, CAT.y, lineSpot(2).x, lineSpot(2).y, each)
    for (let n = 0; n < 4; n++) { tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.2, each) }
    moment = 'a wet soapy garment on the line dripping on the one below, a peg chained, a friend in the tub being rubbed'
    tapAt(yard, lineSpot(0).x, lineSpot(0).y); play(yard, 0.7, each)
    carry(yard, yard.pegSpot(2).x, yard.pegSpot(2).y, yard.pegSpot(3).x, yard.pegSpot(3).y + 8, each)
    carry(yard, heldAt(2).x, heldAt(2).y, bodyAt(2).x, bodyAt(2).y, each); watch(yard, each)
    carry(yard, bodyAt(1).x, bodyAt(1).y, 330, 640, each); play(yard, 1, each)
    const bather = yard.friends[1]
    yard.press(bather.x, bather.y - 150)
    for (let n = 0; n < 60; n++) { yard.drag(bather.x + (n % 2 ? 40 : -20), bather.y - 150 + (n % 9) * 12 - 50); yard.step(FRAME); each() }
    yard.tap()
    // Lifted out of the tub and set down at its place again.
    carry(yard, bather.x, bather.y - 150, bodyAt(1).x, bodyAt(1).y, each); play(yard, 3, each)
    expect(bather.where).toBe('yard')
    moment = 'three dressed in muddy things with flies, walking off, the next three coming up, three on the hill'
    for (let friend = 0; friend < 3; friend++) {
      if (yard.friends[friend].wears) continue
      const free = yard.garments.find((garment) => garment.at !== 'friend')!
      carry(yard, yard.spotOf(free).x, yard.spotOf(free).y, bodyAt(friend).x, bodyAt(friend).y, each); watch(yard, each)
    }
    tapAt(yard, lineSpot(2).x, lineSpot(2).y)
    play(yard, 1, each)
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    expect(yard.finished).toBe(true)
    watch(yard, each)
    moment = 'the second cycle, with three on the hill'
    tapAt(yard, GATE_AT.x, GATE_AT.y); watch(yard, each)
    for (let friend = 0; friend < 3; friend++) { carry(yard, heldAt(friend).x, heldAt(friend).y, bodyAt(friend).x, bodyAt(friend).y, each); play(yard, 2.2, each) }
    watch(yard, each)
    frame(view, yard, seen, moment, GUIDED)
    tapAt(yard, GATE_AT.x, GATE_AT.y); watch(yard, each)
    expect(yard.hill).toHaveLength(3)
    moment = 'a third cycle: those on the hill make room, cut out of their picture, while the next walk off'
    tapAt(yard, GATE_AT.x, GATE_AT.y); watch(yard, each)
    for (let friend = 0; friend < 3; friend++) if (yard.friends[friend].where === 'yard') { carry(yard, heldAt(friend).x, heldAt(friend).y, bodyAt(friend).x, bodyAt(friend).y, each); play(yard, 2.2, each) }
    watch(yard, each)
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    let madeRoom = false
    watch(yard, () => { each(); if (yard.hillShift) madeRoom = true })
    expect(madeRoom).toBe(true)

    expect(seen.frames).toBeGreaterThan(2000)
    console.info(`wash-day frame budget: most draws in one frame ${seen.most} (${seen.at}), over ${seen.frames} frames`)
    expect(seen.most, `most draws in one frame, at: ${seen.at}`).toBeLessThanOrEqual(BUDGET)
  })

  it('the garments that are drawn in pieces stay within the budget where they cost most: sleeves, a wound scarf, a wrung rope, the bobble afloat, a neck at its stretch, with the yard at its busiest round them', () => {
    const seen: Seen = { frames: 0, most: 0, at: '', steady: 0 }
    let moment = ''
    const comeIn = (yard: Yard, each: () => void) => { for (const friend of [0, 1, 2]) { const at = waitingAt(friend); tapAt(yard, at.x, at.y); watch(yard, each); play(yard, 1.2, each) } }
    const rub = (yard: Yard, each: () => void) => {
      tapAt(yard, SOAP.x, SOAP.y); play(yard, 0.5, each)
      tapAt(yard, PUDDLE.x, PUDDLE.y); tapAt(yard, PUDDLE.x, PUDDLE.y)
      yard.press(BOARD_SPOT.x, BOARD_SPOT.y)
      for (let n = 0; n < 90; n++) { yard.drag(BOARD_SPOT.x + (n % 2 ? 80 : -80), BOARD_SPOT.y + (n % 20) * 6 - 60); yard.step(FRAME); each() }
      yard.tap()
    }
    {
      // A shirt worn in three pieces, a scarf worn in three turns and its end, the cat on the line, and the third garment soaped and rubbed.
      const view = viewOf(), yard = withKinds(['shirt', 'scarf', 'dungarees'], 2)
      const each = () => { frame(view, yard, seen, moment) }
      moment = 'a shirt and a scarf going on'
      comeIn(yard, each)
      carry(yard, heldAt(1).x, heldAt(1).y, bodyAt(1).x, bodyAt(1).y, each); watch(yard, each)
      carry(yard, heldAt(0).x, heldAt(0).y, bodyAt(0).x, bodyAt(0).y, each); watch(yard, each)
      expect(yard.friends[0].wears?.kind).toBe('shirt')
      expect(yard.friends[1].wears?.kind).toBe('scarf')
      carry(yard, CAT.x, CAT.y, lineSpot(2).x, lineSpot(2).y, each)
      moment = 'a worn shirt, a wound scarf, the cat on the line, and a soapy garment rubbed with mud and bubbles flying'
      tapAt(yard, heldAt(2).x, heldAt(2).y); play(yard, 0.7, each)
      rub(yard, each)
      moment = 'a worn shirt, a wound scarf, and the goat sneezing at its muddy thing and stretching its neck'
      tapAt(yard, PUDDLE.x, PUDDLE.y); play(yard, 1.2, each)
      carry(yard, BOARD_SPOT.x, BOARD_SPOT.y, bodyAt(2).x, bodyAt(2).y, each); watch(yard, each); play(yard, 2, each)
      expect(yard.friends[2].stretch).toBe(1)
      moment = 'three dressed in a shirt, a wound scarf and a muddy thing, walking off'
      tapAt(yard, lineSpot(2).x, lineSpot(2).y); play(yard, 1, each)
      tapAt(yard, GATE_AT.x, GATE_AT.y); watch(yard, each)
      expect(yard.hill).toHaveLength(3)
      frame(view, yard, seen, 'three on the hill in a shirt, a wound scarf and a muddy thing', GUIDED)
    }
    {
      // A scarf wrung into a rope of seven bands, a shirt afloat in three pieces, the hat's bobble afloat, and the three in the yard.
      const view = viewOf(), yard = withKinds(['scarf', 'shirt', 'hat'], 2)
      const each = () => { frame(view, yard, seen, moment) }
      moment = 'three coming in, one after another'
      comeIn(yard, each)
      moment = 'a shirt and a hat afloat, the scarf wrung to a rope, the cat on the line'
      carry(yard, heldAt(1).x, heldAt(1).y, 372, 676, each); play(yard, 0.7, each)
      carry(yard, heldAt(2).x, heldAt(2).y, 372, 676, each); play(yard, 0.7, each)
      carry(yard, CAT.x, CAT.y, lineSpot(2).x, lineSpot(2).y, each)
      tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7, each)
      rub(yard, each)
      tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.7, each)
      for (let n = 0; n < 12; n++) { tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.15, each) }
      moment = 'a shirt on the line clapping, a hat on the rail, a scarf wound on the horns'
      const shirt = yard.garments[1], hat = yard.garments[2]
      carry(yard, RAIL.hang.x, RAIL.hang.y, bodyAt(2).x, bodyAt(2).y - 90, each); watch(yard, each)
      expect(yard.friends[2].wears?.kind).toBe('scarf')
      carry(yard, yard.spotOf(shirt).x, yard.spotOf(shirt).y, RAIL.hang.x, RAIL.hang.y, each); play(yard, 0.7, each)
      for (let n = 0; n < 4; n++) { tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.2, each) }
      tapAt(yard, lineSpot(0).x, lineSpot(0).y); play(yard, 1.5, each)
      expect(shirt.at).toBe('line')
      carry(yard, yard.spotOf(hat).x, yard.spotOf(hat).y, RAIL.hang.x, RAIL.hang.y, each); play(yard, 0.7, each)
      for (let n = 0; n < 4; n++) { tapAt(yard, RAIL.hang.x, RAIL.hang.y); play(yard, 0.2, each) }
      play(yard, 3, each)
    }
    {
      // The dearest three at once: a shirt worn, a muddy scarf wound on the goat with its neck at its stretch, and a sock soaped and rubbed while its stripes flash.
      const view = viewOf(), yard = withKinds(['shirt', 'sock', 'scarf'], 2)
      const each = () => { frame(view, yard, seen, moment) }
      moment = 'a shirt and a muddy scarf going on'
      comeIn(yard, each)
      // A peg that has run down the board is shiny from then on, and is stitched in a pass of its own.
      carry(yard, yard.pegSpot(0).x, yard.pegSpot(0).y, BOARD_SPOT.x, BOARD_SPOT.y, each); play(yard, 1.2, each)
      expect(yard.pegs[0].shiny).toBe(true)
      carry(yard, heldAt(2).x, heldAt(2).y, bodyAt(2).x, bodyAt(2).y, each); watch(yard, each)
      carry(yard, heldAt(0).x, heldAt(0).y, bodyAt(0).x, bodyAt(0).y, each); watch(yard, each)
      expect(yard.friends[0].wears?.kind).toBe('shirt')
      expect(yard.friends[2].wears?.kind).toBe('scarf')
      expect(yard.friends[2].stretch).toBe(1)
      carry(yard, CAT.x, CAT.y, lineSpot(1).x, lineSpot(1).y, each)
      moment = 'a worn shirt, a muddy scarf wound on a goat at the stretch of its neck, the cat on the line, a shiny peg, and a soapy sock rubbed with mud and bubbles flying'
      tapAt(yard, heldAt(1).x, heldAt(1).y); play(yard, 0.7, each)
      rub(yard, each)
      rub(yard, each)
    }
    expect(seen.frames).toBeGreaterThan(1500)
    console.info(`wash-day frame budget, garments in pieces: most draws in one frame ${seen.most} (${seen.at}), over ${seen.frames} frames`)
    expect(seen.most, `most draws in one frame, at: ${seen.at}`).toBeLessThanOrEqual(BUDGET)
  })

  it('a lower tier draws no more than the top one', () => {
    const counts = TIERS.map((tier) => {
      const view = viewOf(), yard = open(3, 5), seen: Seen = { frames: 0, most: 0, at: '', steady: 0 }
      callIn(yard, 0)
      tapAt(yard, heldAt(0).x, heldAt(0).y); play(yard, 0.7)
      tapAt(yard, SOAP.x, SOAP.y)
      yard.press(BOARD_SPOT.x, BOARD_SPOT.y)
      for (let n = 0; n < 40; n++) { yard.drag(BOARD_SPOT.x + (n % 2 ? 80 : -80), BOARD_SPOT.y); yard.step(FRAME); frame(view, yard, seen, 'rubbing', null, tier) }
      yard.tap()
      return seen.most
    })
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
    expect(counts[0]).toBeLessThanOrEqual(BUDGET)
  })
})
