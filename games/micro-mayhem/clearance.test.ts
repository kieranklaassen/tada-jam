import { describe, expect, it } from 'vitest'
import { OWL_EYES } from './artCast'
import { DOG_X } from './artDog'
import { Game } from './game'
import { DOORS_OF, FIRST, ROOMS, type RoomId } from './house'
import { CORD_AREAS, DOOR_AREAS, inGlass, inShape } from './layout'
import { HANDS, handFor, peekAt } from './stairs'
import { makeRng } from './rng'
import { STRAW, STRAW_GAP, strawEnds, strokesApart } from './roomHenhouse'
import { ghostsOf, segmentsOf } from './sprites'
import { CELL, GridPen, cellsOf, inked, inkedIn, offGlass, oneMass, play, sharedCells } from './testing'

// Nothing passes through anything. On a display of segments that means: no
// two figures are ever lit on the same patch of glass. Every segment is
// painted into a coarse grid with the same shapes the canvas pen fills, and
// long sessions of touches are played in every room, asking of every frame
// whether two figures share a cell. A room's figures are the ones its rules
// name; the parts of one figure lie on each other by design (a head on a
// body, a hat on a head).

/**
 * Pairs of figures that are meant to touch, each with why and with the most cells (of 4 by 4 stage units) they
 * may share. Anything else that shares a cell fails.
 */
const ALLOWED: readonly { room: RoomId; a: string; b: string; cells: number; why: string }[] = [
  { room: 'bakery', a: 'baker', b: 'pies', cells: 40, why: 'the tower comes down on him: for a third of a second it lies on his raised hands' },
  { room: 'dining', a: 'diner', b: 'soup', cells: 40, why: 'the diner nods off with its chin on the rim of the bowl, where the soup stands' },
]

/** The most cells of the top door's frame the pressed hand's drops may lie on while it draws the cord down beside it. */
const HAND_ON_FRAME = 12

function allowance(room: RoomId, a: string, b: string): number {
  return ALLOWED.find((one) => one.room === room && ((one.a === a && one.b === b) || (one.a === b && one.b === a)))?.cells ?? 0
}

describe('the segments', () => {
  it('paint into the grid as the shapes they are, and only inside a clip', () => {
    const pen = new GridPen()
    pen.ell(100, 100, 40, 20)
    pen.cut(() => pen.ell(100, 100, 10, 10))
    const area = pen.cells.reduce((sum, cell) => sum + cell, 0) * CELL * CELL
    expect(area).toBeGreaterThan((Math.PI * 40 * 20 - Math.PI * 100) * 0.9)
    expect(area).toBeLessThan((Math.PI * 40 * 20 - Math.PI * 100) * 1.1)
    const half = new GridPen()
    half.within(100, 0, 100, 200, () => half.ell(100, 100, 40, 20))
    expect(half.cells.reduce((sum, cell) => sum + cell, 0) * CELL * CELL).toBeLessThan(Math.PI * 40 * 20 * 0.56)
  })

  it('each draw something, and all of it on the glass', () => {
    const found: string[] = []
    for (const room of ROOMS) {
      for (const name of Object.keys(segmentsOf(room))) {
        if (inked(room, name) === 0) found.push(`${room} ${name} draws nothing`)
        const off = offGlass(room, name)
        if (off > 0) found.push(`${room} ${name}: ${off} cells off the glass`)
      }
      for (const name of ghostsOf(room)) if (!segmentsOf(room)[name]) found.push(`${room} has no segment ${name} for its ghost`)
    }
    expect(found).toEqual([])
  }, 60_000)

  // Six long sessions, one to a test, so that no test is long. What they have looked at is shared, so a frame seen
  // in one session is not weighed again in the next.
  const looked = new Set<string>()
  const rooms = new Set<RoomId>()

  it.each([1, 2, 3, 4, 5, 6])('never lie on each other: in no frame of long session %i do two figures share glass', (seed) => {
    const found = new Map<string, number>()
    {
      const game = new Game({ ...FIRST }, seed * 17)
      play(game, makeRng(seed), 1500, {
        cordEvery: 400,
        frame: () => {
          const room = game.glass.room
          rooms.add(room)
          const poses = game.poses()
          const key = `${room}|${poses.map(([, show]) => show.join(',')).join('|')}`
          if (looked.has(key)) return
          looked.add(key)
          for (let i = 0; i < poses.length; i++) {
            for (let j = i + 1; j < poses.length; j++) {
              const allowed = allowance(room, poses[i][0], poses[j][0])
              for (const a of poses[i][1]) {
                for (const b of poses[j][1]) {
                  const cells = sharedCells(room, a, b)
                  if (cells > allowed) found.set(`${room}: ${a} (${poses[i][0]}) on ${b} (${poses[j][0]})`, cells)
                }
              }
            }
          }
        },
      })
    }
    expect([...found].map(([pair, cells]) => `${pair}: ${cells} cells`)).toEqual([])
  }, 60_000)

  it('never lie on each other: the six sessions were in every room between them', () => {
    expect([...rooms].sort()).toEqual([...ROOMS].sort())
  })
})

describe('what the long sessions do not ask', () => {
  it('keeps the gasping flowers off the flower that leans with the stretched weed', () => {
    expect(sharedCells('garden', 'flowersGaspLean', 'bloomLean')).toBe(0)
    expect(sharedCells('garden', 'flowersGaspLean', 'weed1')).toBe(0)
    // Upright, the same gasp would lie on the leaning flower, which is why it has a leaning pose of its own.
    expect(sharedCells('garden', 'flowersGasp', 'bloomLean')).toBeGreaterThan(0)
  })

  it('keeps a door\'s leaf off the picture in its doorway: no leaf, ajar, half open or edge on, shares glass with any way the room behind can be seen', () => {
    const found: string[] = []
    for (const room of ROOMS) {
      const names = Object.keys(segmentsOf(room))
      for (const i of [0, 1, 2]) {
        for (const peek of names.filter((name) => name.startsWith(`peek${i}_`))) {
          for (const pose of ['Ajar', 'Half', 'Open']) {
            const cells = sharedCells(room, `door${i}${pose}`, peek)
            if (cells > 0) found.push(`${room}: door${i}${pose} on ${peek}: ${cells} cells`)
          }
        }
      }
    }
    expect(found).toEqual([])
  }, 60_000)

  it('keeps the ghost hand on the glass, and off every door and the cord but the one it shows, wherever the idle ladder sends it', () => {
    const found = new Set<string>()
    const looked = new Set<string>()
    const check = (game: Game): void => {
      for (let demo = 0; demo < 4; demo++) {
        const hint = game.hint(demo)
        for (const at of hint.to ? [hint.at, hint.to] : [hint.at]) {
          for (const pressed of [false, true]) {
            const name = handFor(at.x, pressed)
            const key = `${name} ${at.x} ${at.y} ${JSON.stringify(hint.glow)}`
            if (looked.has(key)) continue
            looked.add(key)
            const cells = cellsOf((pen) => pen.at(at.x, at.y, () => HANDS[name](pen)))
            if (cells.some((cell) => !inGlass(cell))) found.add(`${game.glass.room}: the hand at ${at.x}, ${at.y} leaves the glass`)
            for (const area of [...DOOR_AREAS, ...CORD_AREAS]) {
              if (JSON.stringify(area) === JSON.stringify(hint.glow)) continue
              const on = cells.filter((cell) => inShape(cell, area)).length
              // Allowed, with a cap: drawing the cord down beside the top door, the drops the pressed finger throws lie on that door's frame.
              const allowed = hint.to && area === DOOR_AREAS[0] ? HAND_ON_FRAME : 0
              if (on > allowed) found.add(`${game.glass.room}: the hand at ${at.x}, ${at.y} lies on ${JSON.stringify(area)}: ${on} cells`)
            }
          }
        }
      }
    }
    for (const seed of [1, 2]) {
      const game = new Game({ ...FIRST }, seed)
      play(game, makeRng(seed + 7), 800, { cordEvery: 300, touched: () => check(game) })
    }
    expect(looked.size).toBeGreaterThan(20)
    expect([...found]).toEqual([])
  }, 60_000)
})

describe('lesson 9: no figure is drawn as a sign', () => {
  it('draws the flood in the kitchen as one pool, never as two level wavy strokes one over the other', () => {
    for (const name of ['flood', 'floodB']) expect(oneMass('kitchen', name), name).toBeGreaterThan(0.8)
  })

  it('draws the flood seen through the kitchen\'s door as one pool too, in each of the three rooms beside the kitchen', () => {
    for (const room of ROOMS) {
      const door = DOORS_OF[room].indexOf('kitchen')
      if (door < 0) continue
      const at = peekAt(door)
      // The water of the peek: the foot of its doorway.
      expect(oneMass(room, `peek${door}_flood`, { x: at.x, y: at.y + 116, w: 56, h: 34 }), room).toBeGreaterThan(0.8)
    }
  })

  it('draws the leaping dog\'s body filled, with a crease in it, and never as a ring round a hole', () => {
    // The middle of his belly, where the ring had its hole: nearly all of it is ink.
    const middle = { x: DOG_X, y: 290, rx: 30, ry: 22 }
    const cells = cellsOf((pen) => pen.ell(middle.x, middle.y, middle.rx, middle.ry)).length
    expect(inkedIn('bedroom', 'dogLeap', middle)).toBeGreaterThan(cells * 0.8)
  })

  it('throws the straw down on the henhouse floor so that no two strokes cross or touch: crossed strokes are a sign', () => {
    expect(STRAW.length).toBe(86)
    let nearest = Infinity
    for (let i = 0; i < STRAW.length; i++) for (let j = i + 1; j < STRAW.length; j++) nearest = Math.min(nearest, strokesApart(strawEnds(STRAW[i]), strawEnds(STRAW[j])))
    // Each stroke is three units thick, so strokes this far apart at their middles leave floor between them.
    expect(nearest).toBeGreaterThanOrEqual(STRAW_GAP + 3)
    // The measure itself: two strokes that cross are no distance apart, and two side by side are as far as they lie.
    expect(strokesApart([0, 0, 10, 10], [0, 10, 10, 0])).toBe(0)
    expect(strokesApart([0, 0, 10, 0], [0, 6, 10, 6])).toBe(6)
  })

  it('draws the owl\'s two eyes unequal: the one is a good deal larger than the other, open or wide', () => {
    for (const name of ['owlOpen', 'owlWings']) {
      const eye = (side: -1 | 1): number => inkedIn('bedroom', name, { x: OWL_EYES.x + side * OWL_EYES.apart, y: OWL_EYES.y, rx: 30, ry: 30 })
      // The larger eye leaves less ink in a disc of the same size round it.
      expect(eye(1) - eye(-1), name).toBeGreaterThan(12)
    }
  })
})
