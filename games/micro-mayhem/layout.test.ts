import { describe, expect, it } from 'vitest'
import { Game } from './game'
import { FIRST, ROOMS, type House, type RoomId } from './house'
import type { Point } from './input'
import { BUTTONS, CORD, CORD_AREAS, DOORS, DOOR_AREAS, GLASS, HOME, LAMP_AREAS, STAIRS_X, boxOfShape, buttonAt, doorAt, inGlass, inShape, middleOf, onCord, stagePoint, type Rect, type Shape } from './layout'
import { CORNER } from './overlay'
import { makeRng } from './rng'
import { FLY_SPOTS as BEDROOM_SPOTS, PICTURES as BEDROOM_PICTURES } from './roomBedroom'
import { FLY_SPOTS as KITCHEN_SPOTS, PICTURES as KITCHEN_PICTURES, hopFrom } from './roomKitchen'
import { STAGE, fit, toStage } from './stage'
import { inkedIn, play } from './testing'

// Lesson 7, and the sheet's sentence about the home control: where a touch
// lands, what never answers one, and what lies under nothing.

/** Surfaces a tablet or a window gives the game, in CSS pixels. The sheet names the first two. */
const SURFACES: readonly [number, number][] = [[1180, 820], [820, 1180], [1024, 768], [768, 1024], [1366, 1024], [1080, 810], [2000, 700], [390, 844], [844, 390], [667, 375]]

const meets = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** Whether a shape and a disc share any point, tried on a ring of points and the middles. */
function touches(shape: Shape, disc: { x: number; y: number; r: number }): boolean {
  if (inShape(disc, shape)) return true
  const mid = middleOf(shape)
  if (Math.hypot(mid.x - disc.x, mid.y - disc.y) <= disc.r) return true
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    if (inShape({ x: disc.x + Math.cos(a) * disc.r, y: disc.y + Math.sin(a) * disc.r }, shape)) return true
  }
  const box = boxOfShape(shape)
  for (let i = 0; i <= 12; i++) {
    for (const point of [{ x: box.x + (box.w * i) / 12, y: box.y }, { x: box.x + (box.w * i) / 12, y: box.y + box.h }, { x: box.x, y: box.y + (box.h * i) / 12 }, { x: box.x + box.w, y: box.y + (box.h * i) / 12 }]) {
      if (inShape(point, shape) && Math.hypot(point.x - disc.x, point.y - disc.y) <= disc.r) return true
    }
  }
  return false
}

/** Every shape that answered a touch in long sessions, room by room, with the thing it belongs to. */
function everyTarget(): Map<string, { room: RoomId; id: string; shape: Shape }> {
  const all = new Map<string, { room: RoomId; id: string; shape: Shape }>()
  for (const seed of [1, 2, 3, 4]) {
    const game = new Game({ ...FIRST }, seed)
    play(game, makeRng(seed + 40), 1500, {
      cordEvery: 300,
      touched: () => {
        const room = game.house.place
        if (game.glass.room !== room) return
        for (const target of game.targets()) all.set(`${room} ${target.id} ${JSON.stringify(target.shape)}`, { room, id: target.id, shape: target.shape })
      },
    })
  }
  return all
}

describe('lesson 7: the corner, the home control and what lies under nothing', () => {
  it('answers nothing in the grown-up corner, at every surface size, and everything else lands on the stage', () => {
    for (const [width, height] of SURFACES) {
      const by = fit(width, height)
      for (const point of [{ x: width - 1, y: 1 }, { x: width - CORNER, y: CORNER }, { x: width - 30, y: 40 }]) expect(stagePoint(point, width, by), `${width}x${height}`).toBeNull()
      expect(stagePoint({ x: width - CORNER - 1, y: 10 }, width, by)).not.toBeNull()
      expect(stagePoint({ x: width - 10, y: CORNER + 1 }, width, by)).not.toBeNull()
      const mid = stagePoint({ x: width / 2, y: height / 2 }, width, by)!
      expect(mid.x).toBeCloseTo(STAGE.width / 2, 5)
      expect(mid.y).toBeCloseTo(STAGE.height / 2, 5)
    }
    expect(stagePoint({ x: 10, y: 10 }, 0, fit(0, 0))).toBeNull()
  })

  it('has nothing a child taps, rubs or pulls under the home control, at 1180 by 820, at 820 by 1180, on short landscape surfaces of 844 by 390 and 667 by 375 and at six more sizes', () => {
    const targets = [...everyTarget().values()]
    expect(new Set(targets.map((one) => one.room)).size).toBe(ROOMS.length)
    const under: string[] = []
    for (const [width, height] of SURFACES) {
      const by = fit(width, height)
      const middle = toStage({ x: width / 2, y: HOME.top + HOME.size / 2 }, by)
      const disc = { x: middle.x, y: middle.y, r: HOME.size / 2 / by.scale }
      for (const { room, id, shape } of targets) if (touches(shape, disc)) under.push(`${width}x${height}: ${room} ${id}`)
      for (const button of BUTTONS) if (Math.hypot(button.x - disc.x, button.y - disc.y) <= button.r + 6 + disc.r) under.push(`${width}x${height}: a case button`)
      for (const spot of [...BEDROOM_SPOTS, ...KITCHEN_SPOTS]) if (Math.hypot(spot.x - disc.x, spot.y - disc.y) <= 40 + disc.r) under.push(`${width}x${height}: a fly spot`)
    }
    expect(under).toEqual([])
  }, 60_000)

  it('keeps the two case buttons out of the grown-up corner and off the glass', () => {
    for (const [width, height] of SURFACES) {
      const by = fit(width, height)
      for (const button of BUTTONS) {
        const on = { x: button.x * by.scale + by.x, y: button.y * by.scale + by.y }
        expect(stagePoint(on, width, by), `${width}x${height}`).not.toBeNull()
        expect(inGlass(button)).toBe(false)
        expect(buttonAt(button)).not.toBeNull()
      }
    }
  })

  it('keeps every room\'s things on the glass, left of the stairwell, and clear of the doors and the lamp', () => {
    const wrong: string[] = []
    for (const { room, id, shape } of everyTarget().values()) {
      if (id === 'lamp' || id.startsWith('door')) continue
      const box = boxOfShape(shape)
      if (box.x < GLASS.x - 30 || box.y < GLASS.y - 30 || box.y + box.h > GLASS.y + GLASS.h + 30) wrong.push(`${room} ${id} is off the glass`)
      if (box.x + box.w > STAIRS_X - 4) wrong.push(`${room} ${id} reaches into the stairwell`)
      for (const area of [...DOOR_AREAS, ...LAMP_AREAS]) if (meets(box, boxOfShape(area))) wrong.push(`${room} ${id} lies on a door or the lamp`)
    }
    expect(wrong).toEqual([])
    // A tap for a door is never taken for the lamp: their areas share nothing.
    for (const lamp of LAMP_AREAS) for (const door of DOOR_AREAS) expect(meets(boxOfShape(lamp), door)).toBe(false)
  }, 60_000)

  it('is large enough for a finger: every thing answers over 48 CSS pixels or more on a tablet, the cord\'s strips too', () => {
    const { scale } = fit(1024, 768)
    for (const { room, id, shape } of everyTarget().values()) {
      const box = boxOfShape(shape)
      expect(Math.min(box.w, box.h) * scale, `${room} ${id}`).toBeGreaterThanOrEqual(48)
    }
  }, 60_000)

  it('gives the cord a strip 48 CSS pixels wide or more at 1180 by 820, at 1024 by 768 and upright at 820 by 1180', () => {
    for (const [width, height] of [[1180, 820], [1024, 768], [820, 1180]] as const) {
      const { scale } = fit(width, height)
      for (const area of CORD_AREAS) expect(Math.min(area.w, area.h) * scale, `${width}x${height}`).toBeGreaterThanOrEqual(48)
    }
    // The bobble hangs in the strip, with room on both sides of it.
    expect(onCord({ x: CORD.x, y: CORD.y[0] })).toBe(true)
    for (const dx of [-34, 34]) expect(onCord({ x: CORD.x + dx, y: CORD.y[0] })).toBe(true)
  })

  it('takes a near miss beside the cord for the cord and never for the top door: a finger a width off the bobble swings the lamp and goes nowhere', () => {
    const house: House = { ...FIRST, place: 'fair', day: true, balloon: 1 }
    for (const dx of [-40, -24, 0, 24, 40]) {
      for (const dy of [-30, 0, 30]) {
        const at = { x: CORD.x + dx, y: CORD.y[0] + dy }
        expect(doorAt(at), `${dx},${dy}`).toBeNull()
        const game = new Game(house, 1)
        game.press(at)
        game.release()
        expect(game.cues(), `${dx},${dy}`).toEqual(['lampSwing'])
        expect(game.house.place).toBe('fair')
      }
    }
    // And the strips share no point with a door.
    for (const strip of CORD_AREAS) for (const door of DOOR_AREAS) expect(meets(strip, door)).toBe(false)
  })

  it('never opens a door for a near miss on any side of the cord\'s strip: a finger just outside it, all the way round, goes nowhere, and further out only a tap on the door itself opens it', () => {
    const house: House = { ...FIRST, place: 'fair', day: true, balloon: 1 }
    const strip = CORD_AREAS[0]
    const tried: Point[] = []
    for (const out of [2, 6, 12, 20, 30]) {
      for (let x = strip.x - out; x <= strip.x + strip.w + out; x += 4) tried.push({ x, y: strip.y - out }, { x, y: strip.y + strip.h + out })
      for (let y = strip.y - out; y <= strip.y + strip.h + out; y += 4) tried.push({ x: strip.x - out, y }, { x: strip.x + strip.w + out, y })
    }
    // The point the second reading named: 25 pixels below the hanging bobble and 12 to its right, on a tablet held
    // upright, on one lying down and at the stage's own size.
    for (const [width, height] of [[820, 1180], [1024, 768], [1180, 820]] as const) {
      const { scale } = fit(width, height)
      tried.push({ x: CORD.x + 12 / scale, y: CORD.y[0] + 25 / scale })
    }
    let onTheDoor = 0, beside = 0
    for (const at of tried) {
      const game = new Game(house, 1)
      game.press(at)
      game.release()
      for (let i = 0; i < 30; i++) game.step(1 / 60)
      // The door itself is always the door's: a tap on it is never taken for the lamp.
      if (inShape(at, DOORS[0])) {
        onTheDoor += 1
        expect(game.house.place, `${at.x},${at.y}`).not.toBe('fair')
        continue
      }
      beside += 1
      expect(game.house.place, `${at.x},${at.y}`).toBe('fair')
      expect(game.playing, `${at.x},${at.y}`).toBe(false)
    }
    expect(beside).toBeGreaterThan(500)
    expect(onTheDoor).toBeGreaterThan(0)
    // Within ten units of the strip, on every side, there is no door at all.
    for (const at of tried) if (at.x >= strip.x - 9 && at.x <= strip.x + strip.w + 9 && at.y <= strip.y + strip.h + 9) expect(inShape(at, DOORS[0]), `${at.x},${at.y}`).toBe(false)
    // Further down the door is a door again: its middle opens it.
    const through = new Game(house, 1)
    through.press({ x: DOORS[0].x + DOORS[0].w / 2, y: DOORS[0].y + DOORS[0].h / 2 })
    expect(through.house.place).not.toBe('fair')
  })
})

describe('what the game brings to rest', () => {
  const at = (place: RoomId, more: Partial<House> = {}): House => ({ ...FIRST, place, day: true, ...more })

  it('never covers a room\'s thing: the dog who came in ahead has no ink on what answers before him', () => {
    const covered: string[] = []
    for (const room of ROOMS) {
      for (const full of [false, true]) {
        if (room === 'dining') continue
        const game = new Game(at(room, { dog: 3, full, pies: full ? 3 : 0 }), 1)
        const dog = game.poses().find(([who]) => who === 'dog')?.[1] ?? []
        const targets = game.targets()
        const own = targets.findIndex((target) => target.id === 'dog')
        expect(own, room).toBeGreaterThanOrEqual(0)
        for (const target of targets.slice(0, own)) {
          const cells = dog.reduce((sum, name) => sum + inkedIn(room, name, target.shape), 0)
          if (cells > 2) covered.push(`${room}: the dog lies on ${target.id} (${cells} cells)`)
        }
        // And a tap on him is his own tap.
        const lit = dog.reduce((sum, name) => sum + inkedIn(room, name, targets[own].shape), 0)
        expect(lit, room).toBeGreaterThan(40)
      }
    }
    expect(covered).toEqual([])
  })

  it('never sits the fly on a printed picture, where it would be lost', () => {
    const lost: string[] = []
    for (const [room, spots, pictures] of [['bedroom', BEDROOM_SPOTS, BEDROOM_PICTURES], ['kitchen', KITCHEN_SPOTS, KITCHEN_PICTURES]] as const) {
      for (const spot of spots) {
        // The fly with its wings up and its legs down.
        const fly = { x: spot.x - 34, y: spot.y - 36, w: 68, h: 56 }
        for (const picture of pictures) if (meets(fly, picture)) lost.push(`${room}: the spot at ${spot.x}, ${spot.y}`)
      }
    }
    expect(lost).toEqual([])
  })

  it('hops the fly to a spot the swatter\'s arm does not pass over', () => {
    for (let from = 0; from < KITCHEN_SPOTS.length; from++) {
      for (let where = 0; where < KITCHEN_SPOTS.length; where++) {
        const to = hopFrom(from, where)
        expect(to).not.toBe(where)
        expect(to).not.toBe(from === where ? where : -1)
      }
    }
  })
})
