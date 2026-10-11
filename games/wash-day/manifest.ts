// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const washDayManifest = {
  key: 'wash-day',
  name: 'Wash Day',
  ageBand: [3, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
