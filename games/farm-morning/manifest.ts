// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const farmMorningManifest = {
  key: 'farm-morning',
  name: 'Farm Morning',
  ageBand: [2, 5],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
