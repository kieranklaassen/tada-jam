// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const fruitSlicerManifest = {
  key: 'fruit-slicer',
  name: 'Fruit Slicer',
  ageBand: [9, 12],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
