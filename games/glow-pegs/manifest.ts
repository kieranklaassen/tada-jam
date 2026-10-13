// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const glowPegsManifest = {
  key: 'glow-pegs',
  name: 'Glow Pegs',
  ageBand: [4, 8],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
