// template: cartridge/manifest.ts v1
import type { CartridgeManifest } from '../types'

export const templateManifest = {
  key: 'cartridge',
  name: 'Cartridge',
  ageBand: [4, 8],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
