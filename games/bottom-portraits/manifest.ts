// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const bottomPortraitsManifest = {
  key: 'bottom-portraits',
  name: 'Bottom Portraits',
  ageBand: [3, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
