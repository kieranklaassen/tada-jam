// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const shesCopyingMeManifest = {
  key: 'shes-copying-me',
  name: 'She\'s Copying Me',
  ageBand: [3, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
