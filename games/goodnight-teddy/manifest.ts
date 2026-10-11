// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const goodnightTeddyManifest = {
  key: 'goodnight-teddy',
  name: 'Goodnight, Teddy',
  ageBand: [2, 5],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
