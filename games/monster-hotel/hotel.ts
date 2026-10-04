// The house: rooms in floors and columns, the walls and floors between them,
// and what is built in. Pure data and arithmetic: no renderer, no DOM.
//
// A room is a whole number: floor * cols + col, with floor 0 on the ground.
// An edge is the wall or the floor between two rooms that touch, and it is
// where a quilt hangs or a pipe goes through. The outer sides of the house
// take things too (`outerEdgesOf`).

export type ShapeId = 'square' | 'long' | 'tower'

export type Shape = { floors: number; cols: number }

/** The three houses of the designed order: four rooms, the long house and the tower. */
export const SHAPES: Readonly<Record<ShapeId, Shape>> = {
  square: { floors: 2, cols: 2 },
  long: { floors: 2, cols: 3 },
  tower: { floors: 3, cols: 2 },
}

/** What is built into a house and cannot be moved: the boiler under a column, the snow hole over one. */
export type Fixture = { kind: 'boiler' | 'snow'; col: number }

export type House = {
  shape: ShapeId
  fixtures: readonly Fixture[]
  /** Rooms with two beds. Every other room has one. */
  twins: readonly number[]
}

export type Edge = {
  /** `a-b` with a < b: stable for a shape, and what a save stores. */
  id: string
  a: number
  b: number
  /** A wall joins two rooms on one floor; a floor joins a room (a) and the one above it (b). */
  kind: 'wall' | 'floor'
}

export function roomCount(shape: ShapeId): number {
  const { floors, cols } = SHAPES[shape]
  return floors * cols
}

export function floorOf(shape: ShapeId, room: number): number {
  return Math.floor(room / SHAPES[shape].cols)
}

export function colOf(shape: ShapeId, room: number): number {
  return room % SHAPES[shape].cols
}

export function roomAt(shape: ShapeId, floor: number, col: number): number {
  return floor * SHAPES[shape].cols + col
}

const EDGES: Partial<Record<ShapeId, readonly Edge[]>> = {}

/** Every wall and floor between two rooms of the shape, walls first on each floor from the ground up. */
export function edgesOf(shape: ShapeId): readonly Edge[] {
  const known = EDGES[shape]
  if (known) return known
  const { floors, cols } = SHAPES[shape]
  const edges: Edge[] = []
  for (let floor = 0; floor < floors; floor++) {
    for (let col = 0; col < cols; col++) {
      const room = floor * cols + col
      if (col + 1 < cols) edges.push({ id: `${room}-${room + 1}`, a: room, b: room + 1, kind: 'wall' })
      if (floor + 1 < floors) edges.push({ id: `${room}-${room + cols}`, a: room, b: room + cols, kind: 'floor' })
    }
  }
  EDGES[shape] = edges
  return edges
}

export function edgeById(shape: ShapeId, id: string): Edge | null {
  return edgesOf(shape).find((edge) => edge.id === id) ?? null
}

const OUTER: Partial<Record<ShapeId, readonly Edge[]>> = {}

/**
 * The outer sides of the house, where a thing can be fixed as it can to a
 * wall or a floor between two rooms: the floor under each room on the
 * ground, the ceiling over each room at the top, and the outer wall of each
 * room at either end of a floor. Each belongs to one room, which is both its
 * `a` and its `b`. Nothing travels through them from room to room. What is
 * built in comes through two of them: the boiler's warmth up through the
 * ground floor of its column, the snow hole's cold down through the top
 * ceiling of its (`behind`).
 */
export function outerEdgesOf(shape: ShapeId): readonly Edge[] {
  const known = OUTER[shape]
  if (known) return known
  const { floors, cols } = SHAPES[shape]
  const edges: Edge[] = []
  for (let room = 0; room < floors * cols; room++) {
    const floor = Math.floor(room / cols), col = room % cols
    if (floor === 0) edges.push({ id: `under-${room}`, a: room, b: room, kind: 'floor' })
    if (floor === floors - 1) edges.push({ id: `over-${room}`, a: room, b: room, kind: 'floor' })
    if (col === 0) edges.push({ id: `left-${room}`, a: room, b: room, kind: 'wall' })
    if (col === cols - 1) edges.push({ id: `right-${room}`, a: room, b: room, kind: 'wall' })
  }
  OUTER[shape] = edges
  return edges
}

/** A wall or a floor of the house by its id, between two rooms or on the outside. */
export function anyEdgeById(shape: ShapeId, id: string): Edge | null {
  return edgeById(shape, id) ?? outerEdgesOf(shape).find((edge) => edge.id === id) ?? null
}

/** The outer side a fixture's warmth or cold comes through: the floor under the boiler's room, the ceiling over the snow hole's. */
export function fixtureEdge(house: House, fixture: Fixture): string {
  return `${fixture.kind === 'boiler' ? 'under' : 'over'}-${fixtureRoom(house, fixture)}`
}

/** How many guests a room sleeps. */
export function bedsIn(house: House, room: number): number {
  return house.twins.includes(room) ? 2 : 1
}

/** The room a fixture sits in: the boiler warms the ground room of its column, the snow hole chills the top one. */
export function fixtureRoom(house: House, fixture: Fixture): number {
  const { floors } = SHAPES[house.shape]
  return roomAt(house.shape, fixture.kind === 'boiler' ? 0 : floors - 1, fixture.col)
}

/** Warmth (above zero) or cold (below) a fixture gives its room. */
export function fixtureHeat(fixture: Fixture): number {
  return fixture.kind === 'boiler' ? 2 : -2
}
