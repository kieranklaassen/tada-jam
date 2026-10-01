// Keep the original jam's glossy tile palette across both collections.
const TILE_COLOURS: readonly [string, string][] = [
  ['#d055b1', '#ea82d0'], ['#2f7fd8', '#7fc0f5'], ['#2f9c7a', '#8fdcb4'], ['#e0763a', '#f7c16a'],
  ['#7a5bd6', '#b9a4f5'], ['#c9453e', '#f29a7a'], ['#3a8f9e', '#8fd3d6'], ['#b5842c', '#f0d27a'],
]

export function fallbackColours(key: string): [string, string] {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TILE_COLOURS[hash % TILE_COLOURS.length]
}
