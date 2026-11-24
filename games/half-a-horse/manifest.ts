// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const halfAHorseManifest = {
  key: 'half-a-horse',
  name: 'Half a Horse',
  ageBand: [2, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
