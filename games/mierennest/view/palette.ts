// The colours of "Ant farm behind glass". The three materials the child builds with are flat, plain and far apart
// in hue and lightness; the texture and the comedy go on the creatures, the surface and the frame.

export const WOOD = { light: '#c8914f', mid: '#a86f37', dark: '#7a4c22', grain: '#8d5a2a', peg: '#5b3615' } as const
export const SKY = { top: '#8fd0ee', low: '#d9f1f4', cloud: '#ffffff', hill: '#9ccf86', far: '#b7dca0' } as const
export const GRASS = { blade: '#4c9a3c', light: '#7cc35a', dark: '#2f6f2c', turf: '#3d7f33', root: '#d9c79a' } as const
/** Packed earth, lighter near the surface and darker with depth, and the dug-out dark behind an open cell. */
export const EARTH = { strata: ['#bd8a55', '#a06a3e', '#84583a'], top: '#bd8a55', speck: '#5a371d', deep: '#4f3020', open: '#2b1a12', openLow: '#1f120c' } as const
export const SAND = { fill: '#f1d58a', edge: '#d8b560' } as const
export const MUD = { fill: '#4a2c3a', edge: '#35202b', shine: '#7a566a' } as const
export const STONE = { fill: '#9aa3ad', edge: '#6f7882', shine: '#d4dae0' } as const
export const ROCK = { turf: '#3d7f33', bed: '#4b4f58', bedEdge: '#33363d' } as const
export const GLASS = { sheen: 'rgba(255,255,255,0.10)', sheenEdge: 'rgba(255,255,255,0.22)', scratch: 'rgba(255,255,255,0.20)', smudge: 'rgba(255,255,255,0.07)' } as const

/** The creatures: flat colour, one hard highlight, large eyes. */
export const INK = '#2a1b14'
export const EYE = { white: '#fffdf5', pupil: '#1c120d' } as const
export const HIGHLIGHT = 'rgba(255,255,255,0.75)'
export const ANT = { body: '#ffc533', dark: '#d98a10', leg: '#4a2408', lit: '#f2a422', jaw: '#a8521a', scarf: '#2a9dff', scarfDark: '#0e62c4' } as const
export const QUEEN = { body: '#f7b23a', dark: '#c4761a', belly: '#ffe3a3', egg: '#fffaf0', arm: '#8a4a10', leg: '#4a2408' } as const
export const WORKER = { body: '#eeac42', dark: '#c07a1e', leg: '#4a2408', lit: '#dc9226', jaw: '#9c4c1a' } as const
export const RAIDER = { body: '#d22c44', dark: '#84142b', leg: '#2c2632', lit: '#c0263c', jaw: '#f0e2c4', helmet: '#7a7890', brim: '#3f3d4d', mask: '#2a2530', eye: '#ffe98a' } as const
export const BEETLE = { shell: '#2f6fb3', dark: '#214f84', belly: '#f0c86a', horn: '#1a3a63' } as const
export const FLY = { body: '#3f9c8f', dark: '#2a6f66', wing: 'rgba(214,240,255,0.72)', wingEdge: '#9cc7d9', eye: '#e2573a' } as const
export const DUNG_BEETLE = { shell: '#6a4fb0', dark: '#4a3585', belly: '#e9b96a', ball: '#7b5a35', ballDark: '#5a4026', straw: '#d8c27a' } as const
export const DUNG_FLY = { body: '#b89a2f', dark: '#8a7220', wing: 'rgba(255,240,200,0.72)', wingEdge: '#d9c58c', eye: '#3ac0d8', goggles: '#f4f1e6' } as const
