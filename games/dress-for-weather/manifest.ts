// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const dressForWeatherManifest = {
  key: 'dress-for-weather',
  name: 'Dress for the Weather',
  ageBand: [3, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
