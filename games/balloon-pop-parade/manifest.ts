// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const balloonPopParadeManifest = {
  key: 'balloon-pop-parade',
  name: 'Balloon Pop Parade',
  ageBand: [2, 4],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
