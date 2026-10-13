// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const rocketPenguinManifest = {
  key: 'rocket-penguin',
  name: 'Rocket Penguin',
  ageBand: [8, 12],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
