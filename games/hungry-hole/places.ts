// Where the bystanders stand, beyond the far kerb. Plain numbers with no
// imports, so the street's rules and the figures read the same places.
// x runs along the street, z across it (negative is the far side), y is up.

/** The street between its kerbs. */
export const STREET = { x0: -6.5, x1: 6.5, z0: -2.6, z1: 2.6 } as const

/** The mayor's stand: he shuffles along its rail between `x0` and `x1`. He is drawn at `size` of his sculpted height. */
export const MAYOR = { x0: -6.3, x1: -3.3, z: -4.6, floor: 0.55, size: 0.85 } as const

/** The gate keeper on his stilts, beside the gate. */
export const KEEPER = { x: 2.2, z: -3.7, size: 0.74 } as const

/** The gate: its middle, half the way between its posts, and how high its arch stands. */
export const GATE = { x: 5.5, z: -4.1, half: 1.9, high: 4.7 } as const

/** Where a thing stands behind the bars while the next street waits, and where it comes onto the street. */
export const YARD = { z: GATE.z - 1.25 } as const

/** Where a thing comes onto the street from the gate. A street is laid out with room left round it. */
export const ENTRY = { x: GATE.x, z: STREET.z0 + 1.25 } as const

/** Where the gate keeper's bar hand rests: the end of a short bar on the gate's near post, as far above the street. */
export const BAR = { x: GATE.x - GATE.half - 0.72, y: 2.3, z: GATE.z + 0.1 } as const

/** A head of the crowd: where it stands, how large it is, and whether it has its back to the eye. */
export type Onlooker = { x: number; z: number; size: number; back: boolean }

/** The crowd: beyond the far kerb beside the stand, behind the rope and past the gate, and a row along the near kerb seen from behind. */
export const CROWD: readonly Onlooker[] = [
  { x: -10.6, z: -4.8, size: 1.1, back: false }, { x: -8.9, z: -4.5, size: 1.0, back: false },
  { x: -0.9, z: -4.8, size: 1.0, back: false }, { x: 0.6, z: -5.0, size: 0.95, back: false },
  { x: 8.7, z: -4.5, size: 1.0, back: false }, { x: 10.3, z: -4.8, size: 1.05, back: false },
  ...Array.from({ length: 12 }, (_, i) => ({ x: -10.4 + i * 1.9 + ((i * 37) % 5) * 0.08, z: 4.75 + ((i * 13) % 3) * 0.2, size: 0.9 + ((i * 7) % 3) * 0.04, back: true })),
]
