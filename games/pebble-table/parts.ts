import { clampToTable, insideCircle, MAT_CENTER, type Circle, type Point } from './layout'

// Loose parts for the Honest Scale: jars of acorns, shells, and sticks, and
// one big boulder. They differ in size and weight, so the scale can compare
// unlike things: a boulder balances three stones, two acorns one stone, four
// shells one stone, and a long stick weighs the same as one small stone.
// Parts live only while the scale is out; putting it away tidies them home.
// They are not stones: they never count toward the table's stone total and
// guests never eat them.

export const PART_KINDS = ['acorn', 'shell', 'stick', 'boulder'] as const
export type PartKind = (typeof PART_KINDS)[number]

/** How many of each kind there are in all (jar plus table). */
export const PART_COUNTS: Record<PartKind, number> = { acorn: 6, shell: 6, stick: 4, boulder: 1 }

/** Weight in quarter-stones, the same unit the scale uses for stones (a whole stone is 4). */
export const PART_WEIGHT: Record<PartKind, number> = { acorn: 2, shell: 1, stick: 4, boulder: 12 }

/** Footprint radius in table units, for hit tests and spacing. */
export const PART_RADIUS: Record<PartKind, number> = { acorn: 17, shell: 22, stick: 38, boulder: 40 }

/** Each kind's home in the scale mat's front row, nearest the child: three jars and a nest for the boulder. */
export const JARS: Record<PartKind, Circle> = {
  acorn: { x: 540, y: 835, r: 65 },
  shell: { x: 760, y: 860, r: 65 },
  stick: { x: 980, y: 845, r: 65 },
  boulder: { x: 1190, y: 800, r: 70 },
}

/** Jars (and the nest) are drawn this much larger than their base model. */
export const JAR_SCALE = 1.5

export type Part = { id: number; kind: PartKind; x: number; y: number }

/** How many of a kind are still in their jar. */
export function inJar(parts: readonly Part[], kind: PartKind): number {
  return PART_COUNTS[kind] - parts.filter((part) => part.kind === kind).length
}

/** The jar a point is over, if any. */
export function jarAt(point: Point): PartKind | null {
  return PART_KINDS.find((kind) => insideCircle(point, JARS[kind])) ?? null
}

/** Where a spilled part starts and which way it is thrown: out of the jar mouth, toward the middle of the mat. */
export function spillFrom(kind: PartKind, index: number, count: number): { at: Point; direction: Point } {
  const jar = JARS[kind]
  const toward = { x: (MAT_CENTER.x - jar.x) * 0.4, y: MAT_CENTER.y + 150 - jar.y }
  const length = Math.hypot(toward.x, toward.y) || 1
  const spread = (index / Math.max(1, count - 1) - 0.5) * 0.9
  const angle = Math.atan2(toward.y, toward.x) + spread
  return { at: { x: jar.x + (toward.x / length) * 75, y: jar.y + (toward.y / length) * 75 }, direction: { x: Math.cos(angle), y: Math.sin(angle) } }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Saved parts are untrusted: known kinds only, never more of a kind than exist, positions kept on the table. Ids are assigned fresh. */
export function readParts(raw: unknown, nextId: () => number): Part[] {
  if (!Array.isArray(raw)) return []
  const counts: Record<PartKind, number> = { acorn: 0, shell: 0, stick: 0, boulder: 0 }
  const parts: Part[] = []
  for (const item of raw) {
    if (!isRecord(item)) continue
    const kind = item.kind
    if (typeof kind !== 'string' || !(PART_KINDS as readonly string[]).includes(kind)) continue
    const typed = kind as PartKind
    if (counts[typed] >= PART_COUNTS[typed]) continue
    const x = typeof item.x === 'number' && Number.isFinite(item.x) ? item.x : MAT_CENTER.x
    const y = typeof item.y === 'number' && Number.isFinite(item.y) ? item.y : MAT_CENTER.y
    const at = clampToTable({ x, y }, PART_RADIUS[typed])
    counts[typed] += 1
    parts.push({ id: nextId(), kind: typed, x: Math.round(at.x), y: Math.round(at.y) })
  }
  return parts
}
