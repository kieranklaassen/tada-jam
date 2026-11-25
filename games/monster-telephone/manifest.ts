// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const monsterTelephoneManifest = {
  key: 'monster-telephone',
  name: 'Monster by Telephone',
  ageBand: [4, 8],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
