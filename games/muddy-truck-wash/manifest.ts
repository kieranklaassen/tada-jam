// template: cartridge/manifest.ts v1
import type { CartridgeManifest } from '../types'

export const muddyTruckWashManifest = {
  key: 'muddy-truck-wash',
  name: 'Muddy Truck Wash',
  ageBand: [2, 4],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
