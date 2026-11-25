// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const endlessStringManifest = {
  key: 'endless-string',
  name: 'The Endless String',
  ageBand: [3, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
