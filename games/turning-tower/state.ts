import { computeLayout, isWalkable, overlaps, stateRange, type Room } from './world'

// What survives a put-away (R12): which diorama is open, and for every
// diorama the settled state of each group and the tile the wanderer stands
// on. With nothing saved yet, the child's age picks the diorama that opens. Everything read back goes through `deserialize`, which never throws and
// repairs anything it does not trust to the diorama's starting arrangement.

export type RoomSave = { groups: number[]; walker: number }

export type SavedState = {
  v: 1
  current: string
  rooms: Record<string, RoomSave>
}

export function startSave(room: Room): RoomSave {
  return { groups: [...room.startArrangement], walker: room.startTile }
}

/**
 * The diorama a first visit opens on. The five stand in a designed order, one
 * new idea each, and age sets only where a child starts in it: 8 and under, or
 * no age, at the one-turn opener; 9 at the Ferry; 10 and over at the first
 * impossible join. It is a default and never a gate: every diorama is one tap
 * away on the ring at every age, and a saved diorama wins over the age.
 */
export function firstRoomKey(age: number | null): string {
  if (age === null || age <= 8) return 'first-turn'
  return age === 9 ? 'ferry' : 'impossible-stair'
}

export function defaultState(rooms: readonly Room[], age: number | null = null): SavedState {
  const saves: Record<string, RoomSave> = {}
  for (const room of rooms) saves[room.def.key] = startSave(room)
  const first = firstRoomKey(age)
  return { v: 1, current: rooms.some((room) => room.def.key === first) ? first : rooms[0].def.key, rooms: saves }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readGroups(room: Room, raw: unknown): number[] {
  const values = Array.isArray(raw) ? raw : []
  return room.def.groups.map((group, index) => {
    const value = values[index]
    if (typeof value !== 'number' || !Number.isInteger(value)) return room.startArrangement[index]
    const range = stateRange(group)
    if (range.wraps) return ((value % 4) + 4) % 4
    return Math.min(range.max, Math.max(range.min, value))
  })
}

function readRoom(room: Room, raw: unknown): RoomSave {
  if (!isRecord(raw)) return startSave(room)
  const groups = readGroups(room, raw.groups)
  const layout = computeLayout(room, groups)
  if (overlaps(layout)) return startSave(room)
  const walker = raw.walker
  if (typeof walker === 'number' && Number.isInteger(walker) && isWalkable(layout, walker)) return { groups, walker }
  if (isWalkable(layout, room.startTile)) return { groups, walker: room.startTile }
  return startSave(room)
}

export function deserialize(raw: unknown, rooms: readonly Room[], age: number | null = null): SavedState {
  const state = defaultState(rooms, age)
  if (!isRecord(raw) || raw.v !== 1) return state
  if (typeof raw.current === 'string' && rooms.some((room) => room.def.key === raw.current)) state.current = raw.current
  const saved = isRecord(raw.rooms) ? raw.rooms : {}
  for (const room of rooms) {
    if (Object.prototype.hasOwnProperty.call(saved, room.def.key)) state.rooms[room.def.key] = readRoom(room, saved[room.def.key])
  }
  return state
}

export function serialize(state: SavedState): SavedState {
  const rooms: Record<string, RoomSave> = {}
  for (const [key, save] of Object.entries(state.rooms)) rooms[key] = { groups: [...save.groups], walker: save.walker }
  return { v: 1, current: state.current, rooms }
}
