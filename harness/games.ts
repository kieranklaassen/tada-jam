import type { JamGame, JamShowcase } from './contract'

// Every games/<key>/index.ts exports `game: JamGame`. Adding a folder is the
// whole registration step in the jam; Tada's four touchpoints come at port time.
const modules = import.meta.glob<{ game: JamGame }>('../games/*/index.ts', { eager: true })

export const games: readonly JamGame[] = Object.values(modules)
  .map((module) => module.game)
  .sort((a, b) => a.cartridge.manifest.name.localeCompare(b.cartridge.manifest.name))

// Showcases (showcases/<key>/index.ts exporting `showcase`) are not cartridges:
// they open in the same shell but are listed apart and never ported to Tada.
const showcaseModules = import.meta.glob<{ showcase: JamShowcase }>('../showcases/*/index.ts', { eager: true })

export const showcases: readonly JamShowcase[] = Object.values(showcaseModules)
  .map((module) => module.showcase)
  .sort((a, b) => a.cartridge.manifest.name.localeCompare(b.cartridge.manifest.name))

export function findGame(key: string): JamGame | undefined {
  return [...games, ...showcases].find((game) => game.cartridge.manifest.key === key)
}
