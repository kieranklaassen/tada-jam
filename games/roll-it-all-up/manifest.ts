// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const rollItAllUpManifest = {
  key: 'roll-it-all-up',
  name: 'Roll It All Up',
  ageBand: [3, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
