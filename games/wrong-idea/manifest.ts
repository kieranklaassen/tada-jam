// template: cartridge/manifest.ts v3
import type { CartridgeManifest } from '../types'

export const wrongIdeaManifest = {
  key: 'wrong-idea',
  name: 'He Gets the Wrong Idea',
  ageBand: [4, 8],
  permissions: ['storage'],
  iconIdentity: { family: 'learn', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
