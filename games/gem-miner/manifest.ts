// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const gemMinerManifest = {
  key: 'gem-miner',
  name: 'Gem Miner',
  ageBand: [7, 11],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
