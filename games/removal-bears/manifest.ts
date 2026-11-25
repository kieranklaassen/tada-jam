// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const removalBearsManifest = {
  key: 'removal-bears',
  name: 'The Removal Bears',
  ageBand: [2, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
