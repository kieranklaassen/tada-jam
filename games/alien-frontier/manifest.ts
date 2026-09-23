import type { CartridgeManifest } from '../types'

export const alienFrontierManifest = {
  key: 'alien-frontier',
  name: 'Alien Frontier',
  ageBand: [8, 14],
  permissions: [],
  iconIdentity: { family: 'play', contrast: 'paper' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
