// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const digForTheDuckManifest = {
  key: 'dig-for-the-duck',
  name: 'Dig for the Duck',
  ageBand: [6, 10],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
