// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const treetopVillageManifest = {
  key: 'treetop-village',
  name: 'Treetop Village',
  ageBand: [4, 8],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
