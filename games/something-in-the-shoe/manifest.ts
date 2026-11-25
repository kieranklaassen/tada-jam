// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const somethingInTheShoeManifest = {
  key: 'something-in-the-shoe',
  name: 'Something in the Shoe',
  ageBand: [3, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
