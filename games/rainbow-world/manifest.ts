// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const rainbowWorldManifest = {
  key: 'rainbow-world',
  name: 'Rainbow World',
  ageBand: [2, 5],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
