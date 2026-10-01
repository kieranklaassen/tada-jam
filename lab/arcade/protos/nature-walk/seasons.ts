// The four seasons: one limited palette each, the foliage of each tree, and
// which treasures lie along the path.

export type Season = 0 | 1 | 2 | 3
export const WINTER: Season = 0
export const SPRING: Season = 1
export const SUMMER: Season = 2
export const AUTUMN: Season = 3

export type TreeKind = 'oak' | 'cherry' | 'birch' | 'fir'

export type Kind =
  | 'acorn'
  | 'conker'
  | 'feather'
  | 'stone'
  | 'shell'
  | 'cone'
  | 'berries'
  | 'holly'
  | 'fir'
  | 'blossom'
  | 'eggshell'
  | 'catkin'
  | 'primrose'
  | 'daisy'
  | 'strawberry'
  | 'fern'
  | 'oakleaf'

export interface Palette {
  skyTop: string
  skyLow: string
  skyBlot: string[]
  sun: string
  sunAlpha: number
  hillFar: string
  hillNear: string
  farTree: string[]
  farTrunk: string
  groundFar: string
  groundNear: string
  groundBlot: string[]
  tuft: string[]
  litter: string[]
  litterCount: number
  path: string
  pathEdge: string
  pathLight: string
  pebble: string
  trunk: string
  trunkDark: string
  water: string
  waterLight: string
  bank: string
  // The leaf to lift: fill and vein.
  cover: [string, string]
  coat: string
  scarf: string | null
  // The cloth on the nature table: base, shade, light.
  cloth: [string, string, string]
  mist: string
  fall: string[]
  fallCount: number
}

export const PALETTES: Record<Season, Palette> = {
  0: {
    skyTop: '#c6d6e6',
    skyLow: '#f4efe8',
    skyBlot: ['#ffffff', '#e1e7f0', '#f7e8de'],
    sun: '#fff6dc',
    sunAlpha: 0.6,
    hillFar: '#dbe3ed',
    hillNear: '#e9eef4',
    farTree: ['#a7b3c4', '#97a6b9', '#b6c1cf'],
    farTrunk: '#8d8893',
    groundFar: '#e3eaf2',
    groundNear: '#fafbfd',
    groundBlot: ['#c9d8ea', '#d6e2f0', '#ffffff'],
    tuft: ['#b7a57f', '#a8946c', '#c9b993'],
    litter: ['#ffffff', '#bfd0e4'],
    litterCount: 70,
    path: '#dbe5f0',
    pathEdge: '#b3c5da',
    pathLight: '#f2f6fa',
    pebble: '#a9bace',
    trunk: '#5f4a3f',
    trunkDark: '#3f302a',
    water: '#5f8099',
    waterLight: '#a9c3d6',
    bank: '#c6d4e3',
    cover: ['#8f6c48', '#5f4630'],
    coat: '#4f6f96',
    scarf: '#e0aa3e',
    cloth: ['#eef2f6', '#c4d3e4', '#ffffff'],
    mist: '#f4f6fa',
    fall: ['#ffffff'],
    fallCount: 44,
  },
  1: {
    skyTop: '#bfe0ec',
    skyLow: '#fdf2e2',
    skyBlot: ['#ffffff', '#fbe6ee', '#e6f3f6'],
    sun: '#fff3c2',
    sunAlpha: 0.7,
    hillFar: '#cfe2c0',
    hillNear: '#b9d79c',
    farTree: ['#bcd98e', '#f1cdd8', '#a9cf86', '#f6dfe6'],
    farTrunk: '#8a7a66',
    groundFar: '#b9d88e',
    groundNear: '#8fbf66',
    groundBlot: ['#d2e7a2', '#7fb35a', '#e6f0b2'],
    tuft: ['#6fa64c', '#8cc063', '#5b9442'],
    litter: ['#ffffff', '#f6e27a', '#f4b9cb', '#ffffff'],
    litterCount: 150,
    path: '#ecdcb6',
    pathEdge: '#c9b184',
    pathLight: '#f6ecd0',
    pebble: '#b7a27c',
    trunk: '#6b4f3a',
    trunkDark: '#4a3526',
    water: '#7fb9cf',
    waterLight: '#c9e8f0',
    bank: '#8f7f58',
    cover: ['#b08a5a', '#7d5f3a'],
    coat: '#e6c04a',
    scarf: null,
    cloth: ['#f4c6d2', '#dea0b4', '#fde6ec'],
    mist: '#fdf3ee',
    fall: ['#fbdfe7', '#ffffff', '#f6c3d2'],
    fallCount: 16,
  },
  2: {
    skyTop: '#9fd0ea',
    skyLow: '#ecf6e6',
    skyBlot: ['#ffffff', '#f6f3d8', '#ffffff'],
    sun: '#fff0a8',
    sunAlpha: 0.8,
    hillFar: '#a9cf9a',
    hillNear: '#86b877',
    farTree: ['#6fa867', '#5a9658', '#84b873'],
    farTrunk: '#6f6450',
    groundFar: '#8cc06c',
    groundNear: '#62a04e',
    groundBlot: ['#a9d47e', '#4f8a42', '#c3df8c'],
    tuft: ['#3f7f3a', '#5a9a48', '#74b058'],
    litter: ['#f6d94a', '#ffffff', '#e98aa8', '#f6d94a'],
    litterCount: 130,
    path: '#e9d3a2',
    pathEdge: '#c2a672',
    pathLight: '#f4e6c2',
    pebble: '#a8926a',
    trunk: '#6a4c36',
    trunkDark: '#463121',
    water: '#5fa8c8',
    waterLight: '#bfe4f0',
    bank: '#7c6c48',
    cover: ['#6aa353', '#3f7335'],
    coat: '#f1e6cc',
    scarf: null,
    cloth: ['#f3d564', '#d9b03c', '#fbeaa2'],
    mist: '#f6f7e6',
    fall: ['#ffffff', '#f7f3d2'],
    fallCount: 9,
  },
  3: {
    skyTop: '#efd3a0',
    skyLow: '#fbeed2',
    skyBlot: ['#fff6e0', '#f6c9a0', '#f3dcb8'],
    sun: '#fff0c0',
    sunAlpha: 0.75,
    hillFar: '#dcb98a',
    hillNear: '#cfa36c',
    farTree: ['#d08a3c', '#c2622e', '#e2aa48', '#b9773a'],
    farTrunk: '#7a5c44',
    groundFar: '#d4b066',
    groundNear: '#bd8e4a',
    groundBlot: ['#e5c57e', '#a8733a', '#d99a4a'],
    tuft: ['#a8843c', '#c29a4a', '#8f7a3a'],
    litter: ['#c9552a', '#e08a2c', '#e8b63c', '#a8452a', '#d9772b'],
    litterCount: 210,
    path: '#e8d0a2',
    pathEdge: '#b8915e',
    pathLight: '#f3e2bc',
    pebble: '#9c8058',
    trunk: '#674833',
    trunkDark: '#452f20',
    water: '#6f9fb0',
    waterLight: '#bddbe0',
    bank: '#8a6a40',
    cover: ['#d9772b', '#9c4a20'],
    coat: '#4f8088',
    scarf: null,
    cloth: ['#e28a3c', '#bf6328', '#f4b86e'],
    mist: '#fbf0dc',
    fall: ['#c9552a', '#e08a2c', '#e8b63c', '#b8452a'],
    fallCount: 20,
  },
}

// Dark, middle and light tone of each tree's leaves. Winter is bare.
export const FOLIAGE: Record<TreeKind, Record<Season, [string, string, string] | null>> = {
  oak: {
    0: null,
    1: ['#8fb95a', '#a9cf6c', '#c8e08a'],
    2: ['#2f6f41', '#3f8a4a', '#5aa055'],
    3: ['#a8502a', '#d07a2c', '#e8a63a'],
  },
  cherry: {
    0: null,
    1: ['#eeb2c4', '#f8d3dd', '#fff2f5'],
    2: ['#3a7d48', '#4f9a56', '#74b467'],
    3: ['#b23f28', '#d9602c', '#eb9a3a'],
  },
  birch: {
    0: null,
    1: ['#a5c96a', '#c1dc84', '#dcebaa'],
    2: ['#5e9f5a', '#7fb86a', '#a3cf85'],
    3: ['#d9a52e', '#ecc445', '#f6dd72'],
  },
  fir: {
    0: ['#2b5642', '#3a6f52', '#4f8a66'],
    1: ['#2f6046', '#427a54', '#8fbf6a'],
    2: ['#27523d', '#356b4d', '#4a8560'],
    3: ['#2a5540', '#386d4e', '#4d8662'],
  },
}

// What lies at each of the seven spots along the path, season by season.
export const FINDS: Record<Season, Kind[]> = {
  0: ['feather', 'berries', 'holly', 'shell', 'stone', 'fir', 'cone'],
  1: ['primrose', 'feather', 'blossom', 'shell', 'stone', 'eggshell', 'catkin'],
  2: ['daisy', 'oakleaf', 'strawberry', 'shell', 'stone', 'feather', 'fern'],
  3: ['conker', 'acorn', 'berries', 'shell', 'stone', 'feather', 'cone'],
}

// December to February is winter where the owner lives.
export function seasonOfMonth(month: number): Season {
  if (month === 11 || month <= 1) return WINTER
  if (month <= 4) return SPRING
  if (month <= 7) return SUMMER
  return AUTUMN
}
