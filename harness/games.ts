import type { JamGame } from './contract'

// Every games/<key>/index.ts exports `game: JamGame`. Adding a folder is the
// whole registration step in the jam; Tada's four touchpoints come at port time.
const modules = import.meta.glob<{ game: JamGame }>('../games/*/index.ts', { eager: true })

export const games: readonly JamGame[] = Object.values(modules)
  .map((module) => module.game)
  .sort((a, b) => a.cartridge.manifest.name.localeCompare(b.cartridge.manifest.name))

// Owner-approved showcases live in showcase/<key>/ and export `showcase: JamGame`.
// They are not cartridges (they do not follow the kid-side rules), so the
// home page lists them apart from the games and the cartridge checks skip them.
const showcaseModules = import.meta.glob<{ showcase: JamGame }>('../showcase/*/index.ts', { eager: true })

export const showcases: readonly JamGame[] = Object.values(showcaseModules)
  .map((module) => module.showcase)
  .sort((a, b) => a.cartridge.manifest.name.localeCompare(b.cartridge.manifest.name))

export function findGame(key: string): JamGame | undefined {
  return [...games, ...showcases].find((game) => game.cartridge.manifest.key === key)
}
