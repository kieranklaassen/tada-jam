// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const whoMadeThatSoundManifest = {
  key: 'who-made-that-sound',
  name: 'Who Made That Sound',
  ageBand: [2, 4],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
