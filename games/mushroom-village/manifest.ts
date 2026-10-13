// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const mushroomVillageManifest = {
  key: 'mushroom-village',
  name: 'Mushroom Village',
  ageBand: [3, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
