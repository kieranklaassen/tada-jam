import type { CartridgeManifest } from '../types'

export const moonPhasesManifest = {
  key: 'moon-phases',
  name: 'Moon Phases',
  ageBand: [5, 10],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
