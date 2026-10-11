// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const deepSeaFishingManifest = {
  key: 'deep-sea-fishing',
  name: 'Deep Sea Fishing',
  ageBand: [7, 11],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
