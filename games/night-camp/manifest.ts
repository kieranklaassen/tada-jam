// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const nightCampManifest = {
  key: 'night-camp',
  name: 'Night Camp',
  ageBand: [9, 12],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
