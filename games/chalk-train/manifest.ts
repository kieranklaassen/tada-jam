// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const chalkTrainManifest = {
  key: 'chalk-train',
  name: 'Chalk Train',
  ageBand: [2, 4],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
