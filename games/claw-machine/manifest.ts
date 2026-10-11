// template: cartridge/manifest.ts v2
import type { CartridgeManifest } from '../types'

export const clawMachineManifest = {
  key: 'claw-machine',
  name: 'Claw Machine',
  ageBand: [4, 6],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
