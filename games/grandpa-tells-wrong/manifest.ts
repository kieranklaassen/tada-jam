// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const grandpaTellsWrongManifest = {
  key: 'grandpa-tells-wrong',
  name: 'Grandpa Tells It Wrong',
  ageBand: [4, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
