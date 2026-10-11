// Teddy's body as plain shapes, in his own units: x runs from -210 to 210 and y from -500 (above his ears) to 0
// (the floor he sits on), with the middle of his seat at the origin. The painter draws these shapes, the coat's
// grid lies over them, and a touch is tested against them, so the three never disagree. No canvas here.

export type Ellipse = { x: number; y: number; rx: number; ry: number; rot: number }

/** The four pieces he is drawn in. Each moves as one: the head nods, an arm lifts. */
export type PartId = 'body' | 'head' | 'armL' | 'armR'
export const PART_IDS: readonly PartId[] = ['body', 'armL', 'armR', 'head']

export const BEAR = { left: -210, top: -500, width: 420, height: 500 } as const

export const PARTS: Record<PartId, readonly Ellipse[]> = {
  body: [
    { x: 0, y: -168, rx: 128, ry: 142, rot: 0 },
    // His legs stick out to the front, soles to the child.
    { x: -112, y: -58, rx: 66, ry: 58, rot: -0.25 },
    { x: 112, y: -58, rx: 66, ry: 58, rot: 0.25 },
  ],
  head: [
    { x: 0, y: -362, rx: 122, ry: 104, rot: 0 },
    { x: -94, y: -448, rx: 44, ry: 42, rot: 0 },
    { x: 94, y: -448, rx: 44, ry: 42, rot: 0 },
  ],
  armL: [{ x: -146, y: -196, rx: 44, ry: 86, rot: 0.38 }],
  armR: [{ x: 146, y: -196, rx: 44, ry: 86, rot: -0.38 }],
}

/** Where each piece turns: the neck, the shoulders, the seat. */
export const PIVOT: Record<PartId, { x: number; y: number }> = {
  body: { x: 0, y: 0 },
  head: { x: 0, y: -280 },
  armL: { x: -112, y: -262 },
  armR: { x: 112, y: -262 },
}

export const MUZZLE = { x: 0, y: -330, rx: 58, ry: 44 } as const
export const EYES = [{ x: -46, y: -384 }, { x: 46, y: -384 }] as const

/** A place mud can be. The ids are what a save stores in `mudPlaces`: never rename one. */
export type Place = { id: string; x: number; y: number; r: number }
export const PLACES: readonly Place[] = [
  { id: 'belly', x: 8, y: -170, r: 74 },
  { id: 'footL', x: -112, y: -58, r: 52 },
  { id: 'footR', x: 112, y: -58, r: 52 },
  { id: 'earL', x: -92, y: -444, r: 44 },
  { id: 'earR', x: 92, y: -444, r: 44 },
  { id: 'armL', x: -150, y: -190, r: 50 },
  { id: 'armR', x: 150, y: -190, r: 50 },
  { id: 'brow', x: 30, y: -420, r: 50 },
  { id: 'cheek', x: -70, y: -330, r: 46 },
]

export function inEllipse(e: Ellipse, x: number, y: number, grow = 0): boolean {
  const dx = x - e.x, dy = y - e.y
  const c = Math.cos(-e.rot), s = Math.sin(-e.rot)
  const u = (dx * c - dy * s) / (e.rx + grow), v = (dx * s + dy * c) / (e.ry + grow)
  return u * u + v * v <= 1
}

/** The piece of him at a point in his own units, the head before the body where they lap, or null off the bear. */
export function partAt(x: number, y: number, grow = 0): PartId | null {
  for (const id of ['head', 'armL', 'armR', 'body'] as const) for (const e of PARTS[id]) if (inEllipse(e, x, y, grow)) return id
  return null
}

/** The highest point of him straight below `x`, where falling water lands, or null where it falls past him. */
export function topAt(x: number): number | null {
  let top: number | null = null
  for (const id of PART_IDS) {
    for (const e of PARTS[id]) {
      // The ellipse's reach along x, then its upper edge there, taken along the axes: near enough for water.
      const reach = Math.abs(e.rx * Math.cos(e.rot)) + Math.abs(e.ry * Math.sin(e.rot))
      const dx = (x - e.x) / reach
      if (Math.abs(dx) >= 1) continue
      const rise = Math.abs(e.ry * Math.cos(e.rot)) + Math.abs(e.rx * Math.sin(e.rot))
      const y = e.y - rise * Math.sqrt(1 - dx * dx)
      if (top === null || y < top) top = y
    }
  }
  return top
}
