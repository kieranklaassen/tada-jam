import type { CartridgeManifest } from '../types'

export const badNeighboursManifest = {
  key: 'bad-neighbours',
  name: 'Bad Neighbours',
  ageBand: [4, 10],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'ink' },
  windowShape: 'full',
} as const satisfies CartridgeManifest
