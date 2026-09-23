import { CREATURE_ORDER, isCreatureKind, type CreatureKind } from './creatures'
import { STAGE } from './projection'
import { isShapeKind, SHAPE_KINDS, type ShapeKind } from './shapes'

// The theatre's saved shape: where each of the seven cut-paper shapes
// stands, which creature sleeps on the screen, and who keeps the child
// company in the paper sky. Every shape kind is on the stage exactly once,
// so a corrupt or older save can always be repaired rather than refused.

export const STATE_VERSION = 1
/** Homes in the paper sky. A ninth woken creature sends the oldest behind the moon (never shown as a loss). */
export const SKY_SLOTS = 8

export type ShapeState = { kind: ShapeKind; x: number; z: number; angle: number }
/** `paper` picks which of its kind's two papers it is cut from, so a second fish is not a copy of the first. */
export type SkyCreature = { kind: CreatureKind; slot: number; paper: 0 | 1 }

export type TheatreState = {
  v: typeof STATE_VERSION
  shapes: ShapeState[]
  sleeping: CreatureKind
  sky: SkyCreature[]
}

const TAU = Math.PI * 2

/**
 * Where the shapes stand on a first open: two racks in the front corners,
 * beside the lamp, where the light throws their shadows wide of the screen.
 * One half-disc stands out on its own, so its shadow already rests on the
 * screen's edge beside the empty outline: before any touch, the scene shows
 * that a shape makes a shadow, and the first-open hop makes that shadow hop.
 */
const HOME: Record<ShapeKind, { x: number; z: number }> = {
  bigTri: { x: -30, z: 38 },
  smallTri: { x: -21, z: 38 },
  semiA: { x: -26, z: 46 },
  square: { x: -16, z: 47 },
  semiB: { x: 20, z: 24 },
  strip: { x: 17, z: 47 },
  crescent: { x: 28, z: 46 },
}

/** The shape that stands out on its own at home, and hops on a first open. */
export const INVITE_SHAPE: ShapeKind = 'semiB'

export function homeOf(kind: ShapeKind): { x: number; z: number } {
  return HOME[kind]
}

export function firstCreature(childAge: number | null): CreatureKind {
  return childAge !== null && childAge >= 8 ? 'fox' : 'bird'
}

export function nextCreature(kind: CreatureKind): CreatureKind {
  return CREATURE_ORDER[(CREATURE_ORDER.indexOf(kind) + 1) % CREATURE_ORDER.length]
}

export function defaultShapes(): ShapeState[] {
  return SHAPE_KINDS.map((kind) => ({ kind, x: HOME[kind].x, z: HOME[kind].z, angle: 0 }))
}

export function defaultTheatre(childAge: number | null): TheatreState {
  return { v: STATE_VERSION, shapes: defaultShapes(), sleeping: firstCreature(childAge), sky: [] }
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}

/** Angles are kept in [0, 2π). */
export function normalizeAngle(angle: number): number {
  const a = angle % TAU
  return a < 0 ? a + TAU : a
}

function readShapes(raw: unknown): ShapeState[] {
  const found = new Map<ShapeKind, ShapeState>()
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const { kind, x, z, angle } = item as Record<string, unknown>
      if (!isShapeKind(kind) || found.has(kind)) continue
      found.set(kind, {
        kind,
        x: clamp(finite(x, HOME[kind].x), STAGE.xMin, STAGE.xMax),
        z: clamp(finite(z, HOME[kind].z), STAGE.zNear, STAGE.zFar),
        angle: normalizeAngle(finite(angle, 0)),
      })
    }
  }
  return SHAPE_KINDS.map((kind) => found.get(kind) ?? { kind, x: HOME[kind].x, z: HOME[kind].z, angle: 0 })
}

function readSky(raw: unknown): SkyCreature[] {
  if (!Array.isArray(raw)) return []
  const used = new Set<number>()
  const sky: SkyCreature[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const { kind, slot, paper } = item as Record<string, unknown>
    if (!isCreatureKind(kind)) continue
    const wanted = typeof slot === 'number' && Number.isInteger(slot) && slot >= 0 && slot < SKY_SLOTS && !used.has(slot) ? slot : -1
    const free = wanted >= 0 ? wanted : [...Array(SKY_SLOTS).keys()].find((s) => !used.has(s))
    if (free === undefined) break
    used.add(free)
    sky.push({ kind, slot: free, paper: paper === 1 ? 1 : 0 })
  }
  return sky.slice(-SKY_SLOTS)
}

/** Any saved value, however broken, becomes a playable theatre. */
export function deserialize(raw: unknown, childAge: number | null): TheatreState {
  if (!raw || typeof raw !== 'object') return defaultTheatre(childAge)
  const data = raw as Record<string, unknown>
  if (data.v !== STATE_VERSION) return defaultTheatre(childAge)
  return {
    v: STATE_VERSION,
    shapes: readShapes(data.shapes),
    sleeping: isCreatureKind(data.sleeping) ? data.sleeping : firstCreature(childAge),
    sky: readSky(data.sky),
  }
}

/** A plain copy for storage, rounded so saves stay small and stable. */
export function serialize(state: TheatreState): TheatreState {
  const round = (value: number) => Math.round(value * 100) / 100
  return {
    v: STATE_VERSION,
    shapes: state.shapes.map((shape) => ({ kind: shape.kind, x: round(shape.x), z: round(shape.z), angle: round(normalizeAngle(shape.angle)) })),
    sleeping: state.sleeping,
    sky: state.sky.map((creature) => ({ kind: creature.kind, slot: creature.slot, paper: creature.paper })),
  }
}

/**
 * The sleeping creature woke: it takes a free home in the sky and the next
 * creature falls asleep on the screen. When every home is taken, the oldest
 * companion drifts behind the moon to make room; that one is returned.
 * A creature whose kind is already in the sky is cut from the other paper.
 */
export function wakeCreature(state: TheatreState): { arrived: SkyCreature; departed: SkyCreature | null } {
  let departed: SkyCreature | null = null
  const used = new Set(state.sky.map((creature) => creature.slot))
  let slot = [...Array(SKY_SLOTS).keys()].find((s) => !used.has(s))
  if (slot === undefined) {
    departed = state.sky.shift() ?? null
    slot = departed?.slot ?? 0
  }
  const kind = state.sleeping
  const paper = state.sky.some((creature) => creature.kind === kind && creature.paper === 0) ? 1 : 0
  const arrived: SkyCreature = { kind, slot, paper }
  state.sky.push(arrived)
  state.sleeping = nextCreature(state.sleeping)
  return { arrived, departed }
}
