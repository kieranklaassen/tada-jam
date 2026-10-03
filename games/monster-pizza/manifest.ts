// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const monsterPizzaManifest = {
  key: 'monster-pizza',
  name: 'Monster Pizza',
  ageBand: [4, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
