// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const breadDayManifest = {
  key: 'bread-day',
  name: 'Bread Day',
  ageBand: [4, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
