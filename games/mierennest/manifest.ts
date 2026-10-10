// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const mierennestManifest = {
  key: 'mierennest',
  name: 'Mierennest',
  ageBand: [9, 12],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
