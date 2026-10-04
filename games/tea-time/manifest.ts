// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const teaTimeManifest = {
  key: 'tea-time',
  name: 'Tea Time',
  ageBand: [4, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
