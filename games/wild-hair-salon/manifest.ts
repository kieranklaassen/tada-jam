// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const wildHairSalonManifest = {
  key: 'wild-hair-salon',
  name: 'Wild Hair Salon',
  ageBand: [4, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
