// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const wrapTheCatManifest = {
  key: 'wrap-the-cat',
  name: 'Wrap the Cat',
  ageBand: [3, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
