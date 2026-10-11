// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const eggHeistManifest = {
  key: 'egg-heist',
  name: 'Egg Heist',
  ageBand: [6, 10],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
