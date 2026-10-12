// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const lanternWalkManifest = {
  key: 'lantern-walk',
  name: 'Lantern Walk',
  ageBand: [4, 8],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
