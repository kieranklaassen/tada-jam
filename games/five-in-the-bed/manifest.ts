// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const fiveInTheBedManifest = {
  key: 'five-in-the-bed',
  name: 'Five in the Bed',
  ageBand: [3, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
