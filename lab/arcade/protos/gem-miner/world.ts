// The ground under Gem Miner: a grid of chunky blocks in five layers, with ores,
// rare finds, lava pockets, crystal caves, buried dynamite and sleeping moles.
// Pure data; nothing here touches the DOM.

export const TILE = 84
export const COLS = 14
export const ROWS = 96
// Left edge of column 0 (14 columns of 84 leave 4 pixels).
export const OX = 2
// Where a fresh miner stands, and where the lift lands on the surface.
export const START_COL = 6
export const LIFT_COL = 1

export type Item = 'coal' | 'copper' | 'gold' | 'emerald' | 'diamond' | 'ruby' | 'amethyst' | 'star' | 'fossil'
export type Find = Item | 'chest' | 'geode' | 'mole'
export type Kind = 'empty' | 'block' | 'lava' | 'tnt' | 'chest' | 'geode' | 'crystal' | 'mole' | 'plate' | 'bedrock'

export const FINDS: readonly Find[] = ['coal', 'copper', 'gold', 'emerald', 'diamond', 'ruby', 'amethyst', 'star', 'fossil', 'chest', 'geode', 'mole']

export const VALUE: Record<Item, number> = {
  coal: 2,
  copper: 4,
  gold: 10,
  emerald: 20,
  diamond: 45,
  ruby: 70,
  amethyst: 15,
  star: 120,
  fossil: 35,
}

// How much of a jackpot a find is: 0 common, 1 nice, 2 rare.
export const RARITY: Record<Item, number> = {
  coal: 0,
  copper: 0,
  gold: 1,
  emerald: 1,
  diamond: 2,
  ruby: 2,
  amethyst: 1,
  star: 2,
  fossil: 2,
}

export const GLOW: Record<Item, string> = {
  coal: '#c9c9d6',
  copper: '#ffb47a',
  gold: '#fff2a0',
  emerald: '#8dffc0',
  diamond: '#bdf4ff',
  ruby: '#ff9db0',
  amethyst: '#dcb8ff',
  star: '#fffbd0',
  fossil: '#fff1d0',
}

export interface Layer {
  name: string
  from: number
  hp: number
  base: string
  light: string
  dark: string
  back: string
  chip: readonly string[]
}

export const LAYERS: readonly Layer[] = [
  { name: 'dirt', from: 0, hp: 1, base: '#b5764a', light: '#d39a68', dark: '#8a5433', back: '#4a2c1c', chip: ['#b5764a', '#d39a68', '#8a5433'] },
  { name: 'stone', from: 6, hp: 2, base: '#93a0b8', light: '#bfcce2', dark: '#65708a', back: '#2c3242', chip: ['#93a0b8', '#bfcce2', '#65708a'] },
  { name: 'slate', from: 14, hp: 6, base: '#5a6aa8', light: '#8493cf', dark: '#3d4a80', back: '#1c2244', chip: ['#5a6aa8', '#8493cf', '#3d4a80'] },
  { name: 'magma', from: 24, hp: 16, base: '#7a3440', light: '#a85060', dark: '#4f1f2b', back: '#260d14', chip: ['#7a3440', '#a85060', '#ff8a3c'] },
  { name: 'star', from: 38, hp: 32, base: '#4b2f7a', light: '#7a55b8', dark: '#2d1a52', back: '#140a2a', chip: ['#4b2f7a', '#7a55b8', '#9ef0ff'] },
]

export interface Cell {
  kind: Kind
  layer: number
  hp: number
  maxHp: number
  ore: Item | null
  variant: number
  // Seconds of wobble left after a hit.
  shake: number
  // A cave or a tunnel: drawn as a dark back wall.
  cave: boolean
}

export interface World {
  cells: Cell[]
  at(col: number, row: number): Cell | null
  solid(col: number, row: number): boolean
}

// The boundary between layers wanders a row up and down so it does not look ruled.
export function layerAt(col: number, row: number): number {
  const wobble = Math.round(Math.sin(col * 1.9 + 0.6) * 0.9)
  let layer = 0
  for (let i = 1; i < LAYERS.length; i++) if (row + wobble >= LAYERS[i]!.from) layer = i
  return layer
}

type Roll = readonly [Item | 'tnt' | 'chest' | 'geode', number]

const TABLES: readonly (readonly Roll[])[] = [
  [['coal', 0.13], ['copper', 0.08], ['gold', 0.02]],
  [['coal', 0.06], ['copper', 0.12], ['gold', 0.08], ['emerald', 0.035], ['fossil', 0.012], ['tnt', 0.018], ['chest', 0.012]],
  [['gold', 0.1], ['emerald', 0.08], ['diamond', 0.035], ['fossil', 0.012], ['chest', 0.014], ['geode', 0.01], ['tnt', 0.018]],
  [['gold', 0.06], ['emerald', 0.08], ['diamond', 0.07], ['ruby', 0.05], ['geode', 0.016], ['chest', 0.016], ['tnt', 0.02]],
  [['diamond', 0.09], ['ruby', 0.09], ['star', 0.045], ['geode', 0.03], ['chest', 0.02], ['tnt', 0.02]],
]

export function createWorld(rand: () => number): World {
  const cells: Cell[] = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const layer = layerAt(col, row)
      const hp = LAYERS[layer]!.hp
      const cell: Cell = { kind: 'block', layer, hp, maxHp: hp, ore: null, variant: Math.floor(rand() * 3), shake: 0, cave: false }
      if (row === ROWS - 1) {
        cell.kind = 'bedrock'
      } else {
        let roll = rand()
        for (const [what, chance] of TABLES[layer]!) {
          if (roll < chance) {
            if (what === 'tnt' || what === 'chest' || what === 'geode') cell.kind = what
            else cell.ore = what
            break
          }
          roll -= chance
        }
      }
      cells.push(cell)
    }
  }
  const at = (col: number, row: number): Cell | null => (col < 0 || col >= COLS || row < 0 || row >= ROWS ? null : cells[row * COLS + col]!)
  const set = (col: number, row: number, kind: Kind, ore: Item | null = null): void => {
    const cell = at(col, row)
    if (!cell || cell.kind === 'bedrock') return
    cell.kind = kind
    cell.ore = ore
    cell.hp = cell.maxHp
  }

  // Lava pockets from the slate down: two or three across.
  for (let row = 17; row < ROWS - 2; row++) {
    const chance = row < 24 ? 0.035 : row < 38 ? 0.06 : 0.045
    for (let col = 0; col < COLS; col++) {
      if (rand() > chance) continue
      const width = 2 + Math.floor(rand() * 2)
      for (let i = 0; i < width; i++) set(col + i, row, 'lava')
      if (rand() < 0.5) set(col + Math.floor(rand() * width), row + 1, 'lava')
    }
  }

  // Crystal caves: an open pocket two rows tall with crystals growing from the floor.
  for (const top of [11, 20, 30, 42, 54, 66, 78]) {
    const left = 1 + Math.floor(rand() * 7)
    const width = 5
    for (let col = left; col < left + width; col++) {
      for (let row = top; row < top + 2; row++) {
        set(col, row, 'empty')
        at(col, row)!.cave = true
      }
    }
    const spots = [left, left + 1, left + 2, left + 3, left + 4].filter(() => rand() < 0.7)
    if (spots.length === 0) spots.push(left + 2)
    for (const col of spots) {
      set(col, top + 1, 'crystal')
      const crystal = at(col, top + 1)!
      crystal.hp = 1
      crystal.maxHp = 1
    }
    // A solid floor under the cave, never lava.
    for (let col = left; col < left + width; col++) if (at(col, top + 2)?.kind === 'lava') set(col, top + 2, 'block')
  }

  // Sleeping moles, the first one early enough to be met in minute two.
  for (const row of [9, 18, 27, 36, 47, 60, 73]) {
    const col = 1 + Math.floor(rand() * (COLS - 2))
    if (at(col, row)?.cave) continue
    set(col, row, 'mole')
  }

  // Treats close to the start, the same every run: the first dig pays out, a
  // buried dynamite crate is three rows down, a chest and a fossil just after.
  const c = START_COL
  set(c, 0, 'block')
  set(c, 1, 'block', 'coal')
  set(c - 1, 1, 'block', 'copper')
  set(c + 1, 1, 'block')
  set(c + 1, 2, 'block', 'copper')
  set(c, 2, 'block')
  set(c - 1, 2, 'block', 'coal')
  set(c, 3, 'block', 'gold')
  set(c - 2, 3, 'tnt')
  set(c - 3, 2, 'block', 'coal')
  set(c - 3, 4, 'block', 'copper')
  set(c - 2, 4, 'block', 'gold')
  set(c - 1, 4, 'block')
  set(c + 2, 4, 'chest')
  set(c + 1, 6, 'block', 'gold')
  set(c - 1, 7, 'block', 'fossil')
  set(c + 3, 8, 'block', 'emerald')
  set(c, 15, 'geode')
  // The lift's landing pad.
  set(LIFT_COL, 0, 'plate')

  return {
    cells,
    at,
    solid(col, row) {
      if (col < 0 || col >= COLS) return true
      if (row < 0) return false
      if (row >= ROWS) return true
      return cells[row * COLS + col]!.kind !== 'empty'
    },
  }
}

export const cellX = (col: number): number => OX + col * TILE + TILE / 2
export const colAt = (x: number): number => Math.floor((x - OX) / TILE)
export const rowAt = (y: number): number => Math.floor(y / TILE)
