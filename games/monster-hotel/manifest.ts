// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const monsterHotelManifest = {
  key: 'monster-hotel',
  name: 'Monster Hotel',
  ageBand: [9, 12],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
