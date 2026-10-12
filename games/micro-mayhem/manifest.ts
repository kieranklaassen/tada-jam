// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const microMayhemManifest = {
  key: 'micro-mayhem',
  name: 'Micro Mayhem',
  ageBand: [6, 10],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
