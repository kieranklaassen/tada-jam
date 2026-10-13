// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const adventMarketManifest = {
  key: 'advent-market',
  name: 'Advent Market',
  ageBand: [4, 8],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
