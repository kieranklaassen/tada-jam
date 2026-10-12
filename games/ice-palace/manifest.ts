// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const icePalaceManifest = {
  key: 'ice-palace',
  name: 'Ice Palace',
  ageBand: [5, 9],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
