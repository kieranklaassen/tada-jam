// Who there is, as plain numbers: no browser and nothing of three.js here.
// Local axes: a sitter looks along +z at turn 0, which is towards the child.
// A turn is a quarter round, anticlockwise seen from above, so turn 1 looks
// along +x (the child's right) and turn 2 looks at the painter.

export const CAST = ['elephant', 'hen', 'hippo', 'pig', 'giraffe', 'crocodile', 'board'] as const
export type Id = (typeof CAST)[number]
export type Turn = 0 | 1 | 2 | 3

export const isId = (value: unknown): value is Id => typeof value === 'string' && (CAST as readonly string[]).includes(value)

/** A box of a sitter in its own axes: middle and half sizes. */
export type Box = { x: number; y: number; z: number; hx: number; hy: number; hz: number }

export type Figure = {
  /** The furthest it reaches from its own axis while it turns. Two neighbours never need more than the places give. */
  reach: number
  /** Its whole height above its stand's foot. */
  height: number
  /** The bulk of it: what covers whoever is behind. */
  body: Box
  /** What has to be seen for it to have been painted with a face (or, from behind, the back of one). */
  head: Box
}

/** How high a stand is: every foot and drawn box starts on top of it. */
export const STAND = { r: 0.86, h: 0.34 } as const

export const FIGURES: Readonly<Record<Id, Figure>> = {
  elephant: { reach: 1.27, height: 3.35, body: { x: 0, y: 1.2, z: -0.1, hx: 0.94, hy: 0.86, hz: 0.95 }, head: { x: 0, y: 2.55, z: 0.12, hx: 0.75, hy: 0.7, hz: 0.65 } },
  hen: { reach: 1.12, height: 2.6, body: { x: 0, y: 1.1, z: -0.12, hx: 0.76, hy: 0.74, hz: 0.9 }, head: { x: 0, y: 2.1, z: 0.3, hx: 0.38, hy: 0.45, hz: 0.38 } },
  hippo: { reach: 1.27, height: 2.75, body: { x: 0, y: 1.15, z: -0.14, hx: 1.02, hy: 0.82, hz: 0.98 }, head: { x: 0, y: 2.1, z: 0.36, hx: 0.72, hy: 0.6, hz: 0.6 } },
  pig: { reach: 1.12, height: 2.4, body: { x: 0, y: 1.02, z: -0.08, hx: 0.8, hy: 0.7, hz: 0.82 }, head: { x: 0, y: 1.95, z: 0.26, hx: 0.6, hy: 0.52, hz: 0.5 } },
  giraffe: { reach: 1.12, height: 4.55, body: { x: 0, y: 1.1, z: -0.14, hx: 0.72, hy: 0.76, hz: 0.82 }, head: { x: 0, y: 3.95, z: 0.4, hx: 0.36, hy: 0.36, hz: 0.5 } },
  crocodile: { reach: 1.28, height: 1.75, body: { x: 0, y: 0.8, z: -0.15, hx: 0.52, hy: 0.44, hz: 1.05 }, head: { x: 0, y: 1.2, z: 0.6, hx: 0.42, hy: 0.36, hz: 0.6 } },
  board: { reach: 1.12, height: 3.3, body: { x: 0, y: 1.75, z: 0.06, hx: 1.05, hy: 1.45, hz: 0.09 }, head: { x: 0, y: 2.42, z: 0.06, hx: 0.42, hy: 0.42, hz: 0.09 } },
}

/** The hole in the board: its middle above the stand's foot, and its radius. */
export const HOLE = { y: 2.42, r: 0.46 } as const
