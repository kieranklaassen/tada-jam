// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const leafCreaturesManifest = {
  key: 'leaf-creatures',
  name: 'Leaf Creatures',
  ageBand: [3, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
