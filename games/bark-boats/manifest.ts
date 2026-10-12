// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const barkBoatsManifest = {
  key: 'bark-boats',
  name: 'Bark Boats',
  ageBand: [4, 8],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
