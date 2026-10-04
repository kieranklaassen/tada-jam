import { describe, expect, it } from 'vitest'
import { RULER_MOST, SUPPLY_LANES, boardFor, cardHome, dogPath, hourAt, hourX, loadPlaces, placeY, rowEnd, sectionHandle, streamPoint, targetAt, targetSpots, trailCell, trailPoint, unitLength, unitsAt, TRAIL_COLS, TRAIL_ROWS, type Board, type Live, type Target } from './board'
import { LADDER } from './config'
import { ROD_LENGTH, SITES, type Site } from './world'

const SIZES: [number, number][] = [[1180, 820], [1024, 768], [1366, 700], [820, 1180], [600, 420]]
const every = (): Site[] => LADDER.flatMap((position) => [...SITES[position]])
const name = (site: Site) => `${site.position} ${SITES[site.position].indexOf(site)}`
const live = (board: Board): Live => ({ dog: board.dog.at, cursorHour: 0, lanterns: board.pins.slice(0, board.site.lanterns), trail: [] })
const nameOf = (on: Target | null) => (on === null ? 'nothing' : on.kind === 'pile' ? `pile ${on.supply}` : on.kind === 'rod' ? `rod ${on.supply}` : on.kind === 'card' ? `card ${on.user}` : on.kind === 'camper' || on.kind === 'tent' ? `${on.kind} ${on.who}` : on.kind === 'pin' || on.kind === 'lantern' ? `pin ${on.index}` : on.kind)

describe('what a finger is on', () => {
  it('finds every thing at its own place, at every site and every size of surface', () => {
    for (const site of every()) for (const [w, h] of SIZES) {
      const board = boardFor(w, h, site)
      for (const spot of targetSpots(board)) expect(nameOf(targetAt(board, spot.at, live(board))), `${spot.name} at ${name(site)}, ${w} by ${h}`).toBe(spot.name)
    }
  })

  it('makes everything that answers at least 48 pixels across, however small the surface', () => {
    for (const site of every()) for (const [w, h] of SIZES) for (const spot of targetSpots(boardFor(w, h, site))) {
      // The dial is a ring round the fire: it is as wide as the ring, and its spot here is only one point of it.
      if (spot.name !== 'dial') expect(spot.radius * 2, `${spot.name} at ${name(site)}, ${w} by ${h}`).toBeGreaterThanOrEqual(48)
    }
  })

  it('leaves the top right corner to the grown-up', () => {
    for (const site of [SITES.meadow[0], SITES.summit[0]]) for (const [w, h] of SIZES) {
      const board = boardFor(w, h, site)
      for (let x = w - 72; x <= w; x += 8) for (let y = 0; y <= 72; y += 8) expect(targetAt(board, { x, y }, live(board)), `${x}, ${y} at ${w} by ${h}`).toBeNull()
    }
  })

  it('answers nothing on the bare map, and nothing on a lane the site has no rod for', () => {
    const board = boardFor(1180, 820, SITES.meadow[0])
    expect(targetAt(board, { x: 40, y: 40 }, live(board))).toBeNull()
    expect(board.rods).toEqual(['logs'])
    expect(targetAt(board, { x: board.pile, y: board.lanes[1] - 12 }, live(board))).toBeNull()
    expect(targetAt(board, { x: board.pile, y: board.lanes[0] - 12 }, live(board))).toEqual({ kind: 'pile', supply: 'logs' })
  })

  it('finds a lantern where it is now, the dog where it has got to, and the cursor at its hour', () => {
    const board = boardFor(1180, 820, SITES.summit[0]), away = { x: 300, y: 60 }
    expect(targetAt(board, away, { ...live(board), lanterns: [away, board.pins[1]] })).toEqual({ kind: 'lantern', index: 0 })
    expect(targetAt(board, board.pins[0], { ...live(board), lanterns: [away, board.pins[1]] })).toEqual({ kind: 'pin', index: 0 })
    expect(targetAt(board, { x: 700, y: board.walkway }, { ...live(board), dog: { x: 700, y: board.walkway } })).toEqual({ kind: 'dog' })
    const at = { x: hourX(board, 5), y: board.ruler.y - 12 * board.u }
    expect(targetAt(board, at, { ...live(board), cursorHour: 5 })).toEqual({ kind: 'cursor' })
    expect(targetAt(board, { x: at.x, y: board.ruler.y }, live(board))).toMatchObject({ kind: 'ruler' })
  })
})

describe('the kit along the bottom', () => {
  const board = boardFor(1180, 820, SITES.summit[0])

  it('measures along a rod in its own pieces, and along the ruler in hours of one width however long the night', () => {
    for (const supply of SUPPLY_LANES) {
      expect(unitLength(board, supply) * ROD_LENGTH[supply]).toBeCloseTo(board.rodLen)
      for (const units of [0, 1, 7, ROD_LENGTH[supply]]) expect(unitsAt(board, supply, rowEnd(board, supply, units).x)).toBeCloseTo(units)
    }
    for (const hour of [0, 3, 8]) expect(hourAt(board, hourX(board, hour))).toBeCloseTo(hour)
    expect(boardFor(1180, 820, SITES.meadow[0]).ruler.hour).toBe(board.ruler.hour)
    expect(hourX(board, RULER_MOST)).toBeCloseTo(board.rodX + board.rodLen)
  })

  it('makes a longer night a longer ruler, with a handle to unfold it where there is a section to unfold', () => {
    const folded = boardFor(1180, 820, SITES.meadow[0]), longer = boardFor(1180, 820, SITES.meadow[0], 2)
    expect(longer.hours).toBe(folded.hours + 4)
    expect(sectionHandle(longer).x).toBeGreaterThan(sectionHandle(folded).x)
    expect(targetAt(folded, sectionHandle(folded), live(folded))).toEqual({ kind: 'section', unfold: true })
    expect(targetAt(longer, sectionHandle(longer), live(longer))).toEqual({ kind: 'section', unfold: false })
    const strapped = boardFor(1180, 820, SITES.saddle[0], 2)
    expect(strapped.sections).toBe(0)
    expect(strapped.hours).toBe(SITES.saddle[0].hours)
    expect(targetAt(strapped, sectionHandle(strapped), live(strapped))?.kind).not.toBe('section')
  })

  it('keeps the ruler, the ash and the strips inside the sheet, below the rods, at every size', () => {
    for (const [w, h] of SIZES) {
      const at = boardFor(w, h, SITES.summit[0], 0)
      expect(at.ruler.y - at.ruler.thick).toBeGreaterThan(at.lanes[2] + 14 * at.u)
      expect(at.ash.y).toBeGreaterThan(at.ruler.y + at.ruler.thick)
      expect(at.strips.y).toBeGreaterThanOrEqual(at.ash.y + 3 * at.ash.row)
      expect(at.strips.y + 3 * at.strips.row).toBeLessThanOrEqual(h - at.inset + 1)
      expect(hourX(at, RULER_MOST)).toBeLessThan(at.flap.top)
      expect(cardHome(at, 'fire').x).toBeLessThan(at.pile)
    }
  })

  it('gives the sled a bed with a place for everything the rods could never all hold, and none where there is no sled', () => {
    expect(boardFor(1180, 820, SITES.meadow[0]).sled).toBeNull()
    // A given load lies strapped on a bed just as long as it is.
    expect(boardFor(1180, 820, SITES.saddle[0]).sled!.places).toBe(30 + 5 * 2)
    expect(board.sled!.places).toBe(SITES.summit[0].sled)
    expect(placeY(board, board.sled!.places)).toBeLessThan(board.corner.y - 30 * board.u)
    expect(loadPlaces({ logs: 10, oil: 2, water: 3 })).toBe(10 + 4 + 9)
  })

  it('lays the marshmallow grid over the bare map only, and each cell answers to its own point', () => {
    for (let cell = 0; cell < TRAIL_COLS * TRAIL_ROWS; cell++) expect(trailCell(board, trailPoint(board, cell))).toBe(cell)
    expect(trailCell(board, { x: board.pile, y: board.lanes[0] })).toBe(-1)
    expect(trailCell(board, { x: board.flap.top + 20, y: 200 })).toBe(-1)
  })
})

describe('the map', () => {
  it('sends the dog straight down to the walkway and along it, above the rows', () => {
    for (const site of [SITES.meadow[0], SITES.summit[0]]) for (const [w, h] of SIZES) {
      const board = boardFor(w, h, site), path = dogPath(board, 'logs', 30)
      expect(path[0]).toEqual(board.dog.at)
      expect(path[1]).toEqual({ x: board.dog.at.x, y: board.walkway })
      expect(path[2].y).toBe(board.walkway)
      expect(board.walkway + 15 * board.u).toBeLessThan(board.lanes[0] - 30 * board.u)
    }
  })

  it('finds the stream on the map, clear of the folded edge and of the rods', () => {
    for (const site of every()) {
      const board = boardFor(1180, 820, site)
      for (const camper of board.campers) { const at = streamPoint(board, camper.middle); expect(at.x).toBeLessThan(board.flap.top); expect(at.y).toBeLessThan(board.walkway) }
    }
  })
})
