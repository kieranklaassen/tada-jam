// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const darkGardenManifest = {
  key: 'dark-garden',
  name: 'The Dark Garden',
  ageBand: [4, 8],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
