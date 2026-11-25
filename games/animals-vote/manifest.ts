// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const animalsVoteManifest = {
  key: 'animals-vote',
  name: 'The Animals Vote',
  ageBand: [3, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
