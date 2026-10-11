// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const fireTruckHeroManifest = {
  key: 'fire-truck-hero',
  name: 'Fire Truck Hero',
  ageBand: [2, 4],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
