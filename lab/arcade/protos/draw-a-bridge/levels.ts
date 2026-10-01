// Ten hand-laid levels, one idea each, cycling with wider gaps, taller steps
// and an extra star each time round. Ground is a list of columns; anything
// between two columns is a ball pit.

import { H, W } from '../../kit/types.ts'

export interface Col {
  x0: number
  x1: number
  top: number
}

export interface LevelDef {
  cols: Col[]
  startX: number
  flagX: number
  // Optional pickups, a little above the easy path.
  stars: [number, number][]
  // The ghost line the idle hint draws.
  hint: [number, number][]
  boulder?: { x: number; r: number }
  button?: { x: number; gateX: number }
}

export const G = 580
export const PIT_FLOOR = H - 56
export const LEVELS = 10

export function makeLevel(index: number, rand: () => number): LevelDef {
  const cyc = Math.floor(index / LEVELS)
  const j = cyc === 0 ? 0 : rand() * 2 - 1
  const grow = Math.min(cyc, 3)
  const base = { startX: 120, flagX: 1010 }
  switch (index % LEVELS) {
    case 0: {
      const a = 430
      const w = 200 + grow * 25 + j * 25
      return {
        ...base,
        cols: [
          { x0: 0, x1: a, top: G },
          { x0: a + w, x1: W, top: G },
        ],
        stars: cyc > 0 ? [[a + w / 2, G - 128]] : [],
        hint: [
          [a - 80, G - 30],
          [a + w / 2, G - 46],
          [a + w + 80, G - 30],
        ],
      }
    }
    case 1: {
      const sx = 640 + j * 40
      const h = 90 + Math.min(grow, 2) * 20
      return {
        ...base,
        cols: [
          { x0: 0, x1: sx, top: G + 30 },
          { x0: sx, x1: W, top: G + 30 - h },
        ],
        stars: cyc > 0 ? [[sx + 160, G + 30 - h - 118]] : [],
        hint: [
          [sx - 250, G + 6],
          [sx + 40, G + 30 - h - 26],
        ],
      }
    }
    case 2: {
      const a = 400
      const w = 250 + grow * 20 + j * 20
      return {
        ...base,
        cols: [
          { x0: 0, x1: a, top: G },
          { x0: a + w, x1: W, top: G },
        ],
        stars: [[a + w / 2, G - 128]],
        hint: [
          [a - 80, G - 30],
          [a + w / 2, G - 90],
          [a + w + 80, G - 30],
        ],
      }
    }
    case 3: {
      const s = j * 20
      return {
        ...base,
        cols: [
          { x0: 0, x1: 320, top: G },
          { x0: 510 + s, x1: 640 + s, top: G },
          { x0: 830, x1: W, top: G },
        ],
        stars: cyc > 0
          ? [
              [415, G - 120],
              [735, G - 120],
            ]
          : [[575 + s, G - 122]],
        hint: [
          [250, G - 30],
          [575, G - 44],
          [900, G - 30],
        ],
      }
    }
    case 4: {
      // The button is behind the car, so whatever lands on it is out of the way.
      const bx = 130
      return {
        startX: 340 + j * 30,
        flagX: 1010,
        cols: [{ x0: 0, x1: W, top: G }],
        stars: cyc > 0 ? [[560, G - 124]] : [],
        button: { x: bx, gateX: 720 },
        hint: [
          [bx - 50, G - 210],
          [bx + 50, G - 180],
          [bx - 44, G - 150],
          [bx + 44, G - 120],
        ],
      }
    }
    case 5: {
      const h = 110 + Math.min(grow, 2) * 15
      return {
        ...base,
        cols: [
          { x0: 0, x1: 540, top: G + 10 },
          { x0: 540, x1: 690, top: G + 10 - h },
          { x0: 690, x1: W, top: G + 10 },
        ],
        stars: [[615, G + 10 - h - 122]],
        hint: [
          [300, G - 14],
          [560, G + 10 - h - 24],
          [670, G + 10 - h - 24],
          [900, G - 14],
        ],
      }
    }
    case 6: {
      const w = 220 + grow * 20 + j * 20
      return {
        ...base,
        cols: [
          { x0: 0, x1: 400, top: G + 30 },
          { x0: 400 + w, x1: W, top: G - 50 },
        ],
        stars: [[400 + w / 2, G - 118]],
        hint: [
          [300, G + 6],
          [400 + w + 90, G - 76],
        ],
      }
    }
    case 7:
      return {
        ...base,
        cols: [
          { x0: 0, x1: 400, top: G + 40 },
          { x0: 400, x1: 660, top: G - 40 },
          { x0: 660, x1: W, top: G - 120 },
        ],
        stars: [[530, G - 40 - 124]],
        hint: [
          [200, G + 18],
          [760, G - 144],
        ],
      }
    case 8:
      return {
        ...base,
        cols: [
          { x0: 0, x1: 430, top: G },
          { x0: 430, x1: 680, top: G + 64 },
          { x0: 680, x1: W, top: G },
        ],
        stars: [[555, G - 150]],
        boulder: { x: 555, r: 52 },
        hint: [
          [360, G - 30],
          [555, G - 70],
          [750, G - 30],
        ],
      }
    default: {
      const w = 330 + grow * 15
      return {
        ...base,
        cols: [
          { x0: 0, x1: 360, top: G - 70 },
          { x0: 360 + w, x1: W, top: G + 30 },
        ],
        stars: [
          [450, G - 170],
          [620, G - 84],
        ],
        hint: [
          [280, G - 100],
          [360 + w + 80, G + 4],
        ],
      }
    }
  }
}

// Height of the ground under x (the pit floor where there is none).
export function surfaceAt(def: LevelDef, x: number): number {
  for (const c of def.cols) if (x >= c.x0 && x <= c.x1) return c.top
  return PIT_FLOOR
}

export interface Theme {
  paper: string
  sky: string
  hill: string
  hill2: string
  dirt: string
  dirtDark: string
  top: string
  topDark: string
  bloom: readonly string[]
}

export const THEMES: readonly Theme[] = [
  { paper: '#fbf3dc', sky: '#7cc4ef', hill: '#cfe8c6', hill2: '#b4dcb0', dirt: '#c08a52', dirtDark: '#94602f', top: '#6cc24a', topDark: '#3f8f2c', bloom: ['#ff6b8a', '#ffd23f', '#ffffff', '#b07cff'] },
  { paper: '#fdf0d8', sky: '#f4a65a', hill: '#f6dcae', hill2: '#efc98c', dirt: '#d79a55', dirtDark: '#a8702f', top: '#f4d06a', topDark: '#c99a36', bloom: ['#5ed36a', '#ff7a59', '#5ed36a', '#ff5d8f'] },
  { paper: '#eef4fb', sky: '#8fb1ea', hill: '#dbe7f6', hill2: '#c4d6ee', dirt: '#8ea4c4', dirtDark: '#64799c', top: '#ffffff', topDark: '#b9cbe4', bloom: ['#4db8ff', '#ffffff', '#b07cff', '#ff7ac8'] },
]
