// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const crocodileJumperManifest = {
  key: 'crocodile-jumper',
  name: 'A Jumper for the Crocodile',
  ageBand: [4, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
