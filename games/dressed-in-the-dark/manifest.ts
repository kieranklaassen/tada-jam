// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const dressedInTheDarkManifest = {
  key: 'dressed-in-the-dark',
  name: 'Dressed in the Dark',
  ageBand: [3, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
