// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const laneRunnerManifest = {
  key: 'lane-runner',
  name: 'Lane Runner',
  ageBand: [6, 10],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
