// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const hungryHoleManifest = {
  key: 'hungry-hole',
  name: 'Hungry Hole',
  ageBand: [4, 8],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
