import type { JamGame } from './contract'

// Every games/<key>/index.ts exports `game: JamGame`. Adding a folder is the
// whole registration step in the jam; Tada's four touchpoints come at port time.
const modules = import.meta.glob<{ game: JamGame }>('../games/*/index.ts', { eager: true })

export const games: readonly JamGame[] = Object.values(modules)
  .map((module) => module.game)
  .sort((a, b) => a.cartridge.manifest.name.localeCompare(b.cartridge.manifest.name))

export function findGame(key: string): JamGame | undefined {
  return games.find((game) => game.cartridge.manifest.key === key)
}
