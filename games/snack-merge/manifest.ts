// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const snackMergeManifest = {
  key: 'snack-merge',
  name: 'Snack Merge',
  ageBand: [5, 9],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
