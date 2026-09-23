// Δ1 calendar mirror: the meadow looks like the season outside. Spring has
// blossom flecks in fresh grass, summer is warm and golden, autumn scatters
// russet felt leaves, winter frosts the hill with white flecks. It changes
// only the look; nothing becomes possible or impossible by date, and nothing
// counts days.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

const SOUTHERN = new Set(['AU', 'NZ', 'ZA', 'AR', 'CL', 'UY', 'PY', 'BR', 'PE', 'BO', 'NA', 'BW', 'ZW', 'MZ', 'MG', 'LS', 'SZ', 'FJ'])

const NORTHERN_BY_MONTH: readonly Season[] = [
  'winter',
  'winter',
  'spring',
  'spring',
  'spring',
  'summer',
  'summer',
  'summer',
  'autumn',
  'autumn',
  'autumn',
  'winter',
]

const OPPOSITE: Readonly<Record<Season, Season>> = { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' }

export function seasonFor(date: Date, country?: string | null): Season {
  const month = date.getMonth()
  const northern = NORTHERN_BY_MONTH[Number.isInteger(month) && month >= 0 && month < 12 ? month : 5]
  return country && SOUTHERN.has(country.toUpperCase()) ? OPPOSITE[northern] : northern
}

export type SeasonLook = {
  grass: string
  grassFleck: string
  sky: string
  sun: string
  /** Small felt things lying on the hill: blossom, none, leaves, or snow. */
  scatter: 'blossom' | 'none' | 'leaves' | 'snow'
  scatterColors: readonly string[]
}

export const SEASON_LOOKS: Readonly<Record<Season, SeasonLook>> = {
  spring: { grass: '#5b714b', grassFleck: '#8ca170', sky: '#f1e6d2', sun: '#f2c65a', scatter: 'blossom', scatterColors: ['#f3d3dc', '#fbf3ea', '#f6e3a8'] },
  summer: { grass: '#61704a', grassFleck: '#9e9d5f', sky: '#f3e3c6', sun: '#f0b43c', scatter: 'none', scatterColors: [] },
  autumn: { grass: '#646c48', grassFleck: '#8f8a55', sky: '#efdcc4', sun: '#e59a4a', scatter: 'leaves', scatterColors: ['#b8542e', '#c98a33', '#8f4a2a'] },
  winter: { grass: '#6a7a67', grassFleck: '#d9ddd2', sky: '#e8e6e0', sun: '#f1dfa8', scatter: 'snow', scatterColors: ['#f7f5ef', '#eeede8'] },
}
