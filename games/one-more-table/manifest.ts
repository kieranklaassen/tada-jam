// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const oneMoreTableManifest = {
  key: 'one-more-table',
  name: 'One More at the Table',
  ageBand: [3, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
