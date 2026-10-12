// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const wetPaintManifest = {
  key: 'wet-paint',
  name: 'Wet Paint',
  ageBand: [3, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
