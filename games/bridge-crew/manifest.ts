// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const bridgeCrewManifest = {
  key: 'bridge-crew',
  name: 'Bridge Crew',
  ageBand: [9, 12],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
