import { describe, expect, it } from 'vitest'
import { BASKET, COUNTER, FOLK, HANDS, HOME, LANTERNS, LENGTH, POT, REST, STICK, WHO, WINDOW, inEllipse } from './hall'
import { CORNER } from './overlay'
import { BENCH, BOARD, CLOTH, COLOUR_X, DOORWAY, PLACES, RING, SIZE_X, SLOT, SNOW, SOURCE, STALLS, STAR, WALK, drawnOn, handOf, hasSizes, isStall, neighbour, onBench, slotAt, spotAt, whoAt, type Place, type Spot, type Standing } from './places'
import { fresh, type Biscuit } from './things'
import { STAGE, fit, toStage } from './stage'

// Where things stand, at each of the five places. The tests lay out two
// surfaces, 1180 by 820 and 1024 by 768: kid-land is landscape only.
const SURFACES = [{ w: 1180, h: 820 }, { w: 1024, h: 768 }]
/** The smallest side a target may have, in the surface's own pixels. */
const FINGER = 48

type Target = { name: string; at: { x: number; y: number }; rx: number; ry: number; spot: Spot }

/** A place as a first visit finds it, but for the cloth and the basket: its fresh piece is in work on the bench. */
const standing = (place: Place, over: Partial<Standing> = {}): Standing => ({ place, covered: false, things: BASKET.slots, finished: false, piece: isStall(place) ? fresh(place) : null, ...over })

/** Everything a child must be able to touch at a place, with the cloth off and the basket full, each as the ellipse that answers. */
function targets(place: Place): Target[] {
  const list: Target[] = [
    { name: 'left lantern', at: WALK.left, rx: WALK.left.r, ry: WALK.left.r, spot: { kind: 'lantern', dir: -1 } },
    { name: 'right lantern', at: WALK.right, rx: WALK.right.r, ry: WALK.right.r, spot: { kind: 'lantern', dir: 1 } },
  ]
  // The two rows of a full basket overlap, and the nearer thing answers: each row keeps the part of its things that is its own.
  const rows = slotAt(3).y - slotAt(0).y, own = (SLOT.h + rows) / 4
  for (let i = 0; i < BASKET.slots; i++) {
    const at = slotAt(i)
    list.push({ name: `basket place ${i}`, at: { x: at.x, y: at.y + (i < 3 ? -1 : 1) * (SLOT.h / 2 - own) }, rx: SLOT.w / 2, ry: own, spot: { kind: 'slot', index: i } })
  }
  // At the door a full basket is taken off its hook by its handle, above the things in it, or by its wicker, below them.
  if (!isStall(place)) return [...list,
    { name: 'basket handle', at: { x: BASKET.x, y: 485 }, rx: BASKET.rx, ry: 29, spot: { kind: 'basket' } },
    { name: 'basket wicker', at: { x: BASKET.x, y: 666 }, rx: BASKET.rx, ry: 34, spot: { kind: 'basket' } },
    { name: 'doorway', at: { x: (DOORWAY.left + DOORWAY.right) / 2, y: 600 }, rx: 110, ry: 150, spot: { kind: 'bench' } }]
  COLOUR_X.forEach((x, index) => list.push({ name: `colour ${index}`, at: { x, y: SOURCE.y }, rx: SOURCE.rx, ry: SOURCE.ry, spot: { kind: 'colour', index } }))
  if (hasSizes(place)) SIZE_X.forEach((x, index) => list.push({ name: `size ${index}`, at: { x, y: SOURCE.y }, rx: SOURCE.rx, ry: SOURCE.ry, spot: { kind: 'size', index } }))
  const bench = place === 'candle' ? { at: { x: POT.x, y: POT.y + 20 }, rx: POT.rx, ry: POT.ry + 30 }
    : place === 'star' ? { at: STAR, rx: STAR.r[0] + 22, ry: STAR.r[0] + 22 }
    : place === 'wreath' ? { at: RING, rx: RING.r + RING.band, ry: RING.r + RING.band }
    : { at: BOARD, rx: BOARD.dough, ry: BOARD.dough }
  list.push({ name: 'bench', ...bench, spot: { kind: 'bench' } })
  return list
}

/** Points of an ellipse: its middle, and a ring of points at four fifths of its reach. */
function points(t: { at: { x: number; y: number }; rx: number; ry: number }): { x: number; y: number }[] {
  const list = [{ x: t.at.x, y: t.at.y }]
  for (let a = 0; a < 12; a++) list.push({ x: t.at.x + Math.cos((a / 12) * Math.PI * 2) * t.rx * 0.8, y: t.at.y + Math.sin((a / 12) * Math.PI * 2) * t.ry * 0.8 })
  return list
}

describe('the five places', () => {
  it('are a round: walking one way comes back to where it began, and each place has two neighbours', () => {
    for (const dir of [-1, 1] as const) {
      let place: Place = 'candle'
      const seen: Place[] = []
      for (let i = 0; i < PLACES.length; i++) { seen.push(place); place = neighbour(place, dir) }
      expect(place).toBe('candle')
      expect(new Set(seen).size).toBe(PLACES.length)
    }
    expect(neighbour('door', 1)).toBe('candle')
  })

  it('answer a touch on each target as that target, at every place: a thing is touched where it stands', () => {
    for (const place of PLACES) {
      for (const target of targets(place)) {
        for (const p of points(target)) expect(spotAt(p.x, p.y, standing(place)), `${place}, ${target.name}`).toEqual(target.spot)
      }
    }
  })

  it('give every target at least a fingertip, at both surfaces', () => {
    for (const surface of SURFACES) {
      const scale = fit(surface.w, surface.h).scale
      for (const place of PLACES) for (const target of targets(place)) {
        expect(Math.min(target.rx, target.ry) * 2 * scale, `${place}, ${target.name}, ${surface.w}`).toBeGreaterThanOrEqual(FINGER)
      }
      for (const who of WHO) expect(Math.min(FOLK[who].touch.rx, FOLK[who].touch.ry) * 2 * scale, who).toBeGreaterThanOrEqual(FINGER * 2)
      // The hand each one holds out, where a thing is given.
      for (const who of WHO) expect(Math.min(HANDS[who].rx, HANDS[who].ry) * 2 * scale, `${who}, hand`).toBeGreaterThanOrEqual(FINGER)
      // The stick, the cloth and the hanging lanterns.
      expect(46 * 2 * scale).toBeGreaterThanOrEqual(FINGER)
      expect(Math.min(CLOTH.w, CLOTH.h) * scale).toBeGreaterThanOrEqual(FINGER)
    }
  })

  it('keeps everything a child touches clear of the home control, at both surfaces and at every place', () => {
    for (const surface of SURFACES) {
      const by = fit(surface.w, surface.h)
      // The control is drawn in the surface's own pixels at the top centre: where it lies on the stage.
      const centre = toStage({ x: surface.w / 2, y: HOME.top + HOME.size / 2 }, by), r = HOME.size / 2 / by.scale
      for (const place of PLACES) {
        for (const covered of [true, false]) {
          for (let a = 0; a < 16; a++) {
            const x = centre.x + Math.cos((a / 16) * Math.PI * 2) * r, y = centre.y + Math.sin((a / 16) * Math.PI * 2) * r
            expect(spotAt(x, y, standing(place, { covered })).kind, `${place}, ${surface.w}`).toBe('wall')
          }
        }
        for (const target of targets(place)) expect(Math.hypot(target.at.x - centre.x, target.at.y - centre.y) - Math.max(target.rx, target.ry), `${place}, ${target.name}`).toBeGreaterThan(r)
      }
      // The stick on its hooks, and as high as the hand can take it, hangs clear below the control.
      expect(REST.y - 46).toBeGreaterThan(centre.y + r)
      expect(STICK.minY - 46).toBeGreaterThan(centre.y + r)
      for (const lantern of LANTERNS) expect(Math.hypot(lantern.x - centre.x, lantern.y + 22 - centre.y) - 46).toBeGreaterThan(r)
    }
  })

  it('keeps the grown-up corner bare of everything but wall, at both surfaces and at every place', () => {
    for (const surface of SURFACES) {
      const by = fit(surface.w, surface.h)
      for (const place of PLACES) for (const [dx, dy] of [[0, 0], [CORNER, 0], [0, CORNER], [CORNER, CORNER], [CORNER / 2, CORNER / 2]]) {
        const p = toStage({ x: surface.w - dx, y: dy }, by)
        expect(spotAt(p.x, p.y, standing(place)).kind, `${place}, ${surface.w}`).toBe('wall')
      }
    }
  })

  it('stands no fair-goer over the stick, the pot, the basket, a cloth, a colour, a size or a walking lantern', () => {
    for (const place of PLACES) {
      const here = [...targets(place), { name: 'cloth', at: { x: CLOTH.x + CLOTH.w / 2, y: CLOTH.y + CLOTH.h / 2 }, rx: CLOTH.w / 2, ry: CLOTH.h / 2, spot: { kind: 'cloth' } as Spot }]
      if (place === 'candle') here.push({ name: 'stick', at: REST, rx: STICK.half + 22, ry: 46, spot: { kind: 'wall' } }, { name: 'wick', at: { x: REST.x, y: REST.y + LENGTH / 2 }, rx: 44, ry: LENGTH / 2, spot: { kind: 'wall' } })
      for (const target of here) {
        // The goat and the bundle are in front of the counter: they must stand clear of every target outright.
        for (const who of ['goat', 'bundle'] as const) for (const p of points({ ...target, rx: target.rx * 1.25, ry: target.ry * 1.25 })) {
          expect(inEllipse(p.x, p.y, FOLK[who].touch), `${who} over ${target.name} at ${place}`).toBe(false)
        }
        // The three behind the counter are drawn behind every target, and a touch on a target is never taken for one of them.
        for (const p of points(target)) expect(spotAt(p.x, p.y, standing(place, { covered: target.name === 'cloth' })).kind, `${target.name} at ${place}`).not.toBe('who')
        for (const who of WHO) expect(inEllipse(target.at.x, target.at.y, { ...FOLK[who].touch, rx: FOLK[who].touch.rx * 0.6, ry: FOLK[who].touch.ry * 0.6 }), `${who} behind ${target.name} at ${place}`).toBe(false)
      }
    }
  })

  it('gives every fair-goer a place to be poked that is its own, at every place, and takes a thing let go there', () => {
    for (const place of PLACES) for (const who of WHO) {
      const eyes = FOLK[who].eyes
      expect(spotAt(eyes.x, eyes.y, standing(place, { things: 0 })), `${who} at ${place}`).toEqual({ kind: 'who', who })
      expect(whoAt(eyes.x, eyes.y)).toBe(who)
      expect(FOLK[who].touch.x - FOLK[who].touch.rx * 0.5).toBeGreaterThanOrEqual(0)
      expect(FOLK[who].touch.x + FOLK[who].touch.rx * 0.5).toBeLessThanOrEqual(STAGE.width)
    }
  })

  it('gives a hand held out to its owner before the bench or the doorway behind it, and to the piece in work only where the piece is drawn over it', () => {
    let behind = 0, under = 0
    for (const place of PLACES) for (const who of ['maker', 'baker'] as const) {
      const hand = HANDS[who]
      const pieces = place === 'biscuit' ? [0, 1, 2].map((tin) => ({ ...(fresh('biscuit', tin) as Biscuit), cut: true })) : [isStall(place) ? fresh(place) : null]
      for (const piece of pieces) for (const k of [0, 0.5, 0.9]) for (let a = 0; a < 12; a++) {
        const x = hand.x + Math.cos((a / 12) * Math.PI * 2) * hand.rx * k, y = hand.y + Math.sin((a / 12) * Math.PI * 2) * hand.ry * k
        expect(handOf(x, y)).toBe(who)
        const spot = spotAt(x, y, standing(place, { things: 0, piece }))
        if (piece && drawnOn(piece, x, y)) { expect(spot, `${who} at ${place}`).toEqual({ kind: 'bench' }); under += 1 }
        else {
          expect(spot, `${who} at ${place}`).toEqual({ kind: 'who', who })
          if (onBench(place, x, y)) behind += 1
        }
      }
      // The middle of his hand lies inside the board's dough and off every biscuit a tin cuts: it is his.
      if (place === 'biscuit' && who === 'baker') for (const piece of pieces) {
        expect(Math.hypot(hand.x - BOARD.x, hand.y - BOARD.y)).toBeLessThan(BOARD.dough)
        expect(spotAt(hand.x, hand.y, standing(place, { piece }))).toEqual({ kind: 'who', who })
      }
    }
    // Both happen: points of a hand that have a bench behind them, and points a piece lies over.
    expect(behind).toBeGreaterThan(20)
    expect(under).toBeGreaterThan(5)
  })

  it('lays the cloth over the second and third colour and leaves the first open', () => {
    for (const stall of STALLS) {
      const covered = standing(stall, { covered: true })
      expect(spotAt(COLOUR_X[0], SOURCE.y, covered)).toEqual({ kind: 'colour', index: 0 })
      expect(spotAt(COLOUR_X[1], SOURCE.y, covered).kind).toBe('cloth')
      expect(spotAt(COLOUR_X[2], SOURCE.y, covered).kind).toBe('cloth')
    }
  })

  it('has six places in the basket, and an empty one answers as the basket', () => {
    const seen = new Set(Array.from({ length: BASKET.slots }, (_, i) => `${slotAt(i).x},${slotAt(i).y}`))
    expect(seen.size).toBe(BASKET.slots)
    expect(spotAt(slotAt(4).x, slotAt(4).y, standing('star', { things: 2 }))).toEqual({ kind: 'basket' })
    expect(spotAt(slotAt(1).x, slotAt(1).y, standing('star', { things: 2 }))).toEqual({ kind: 'slot', index: 1 })
    // At the door a thing in the basket answers as it does at a stall; once the basket is carried out it stands in the snow and nowhere else.
    expect(spotAt(slotAt(1).x, slotAt(1).y, standing('door'))).toEqual({ kind: 'slot', index: 1 })
    expect(spotAt(slotAt(1).x, slotAt(1).y, standing('door', { things: 0 }))).toEqual({ kind: 'basket' })
    expect(spotAt(SNOW.x, SNOW.y - 40, standing('door', { finished: true }))).toEqual({ kind: 'basket' })
    expect(spotAt(slotAt(1).x, slotAt(1).y, standing('star', { finished: true })).kind).not.toBe('basket')
  })

  it('finds the hanging lanterns and the window where they are, and bare wall between them', () => {
    LANTERNS.forEach((lantern, index) => expect(spotAt(lantern.x, lantern.y + 22, standing('wreath'))).toEqual({ kind: 'lamp', index }))
    expect(spotAt(WINDOW.x + WINDOW.w / 2, WINDOW.y + 60, standing('candle')).kind).toBe('window')
    expect(spotAt(590, 300, standing('candle')).kind).toBe('wall')
  })

  it('lets the stick take the whole wick under the wax and reach over the basket, and stands the basket clear of the pot', () => {
    expect(STICK.maxY + LENGTH).toBeGreaterThan(POT.y + 200)
    expect(STICK.maxY).toBeLessThan(POT.y - POT.ry + 10)
    expect(STICK.maxX).toBeGreaterThan(BASKET.x)
    expect(POT.y + POT.ry).toBeLessThan(COUNTER.top)
    expect(BASKET.x - BASKET.rx).toBeGreaterThan(POT.x + POT.rx + 20)
    for (const stall of STALLS) expect(BENCH[stall].x + BENCH[stall].r).toBeLessThan(BASKET.x - BASKET.rx + 30)
  })
})
