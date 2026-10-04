// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const princessPlaygroundManifest = {
  key: 'princess-playground',
  name: 'Princess Playground',
  ageBand: [2, 5],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
