// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const boxFortManifest = {
  key: 'box-fort',
  name: 'Box Fort',
  ageBand: [4, 8],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
