// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const flowerTableManifest = {
  key: 'flower-table',
  name: 'Flower Table',
  ageBand: [4, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
