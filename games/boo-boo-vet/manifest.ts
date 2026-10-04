// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const booBooVetManifest = {
  key: 'boo-boo-vet',
  name: 'Boo-Boo Vet',
  ageBand: [3, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
