// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const blobDashManifest = {
  key: 'blob-dash',
  name: 'Blob Dash',
  ageBand: [8, 12],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
