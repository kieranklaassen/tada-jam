import type { CartridgeManifest } from '../types'

export const lightGardenManifest: CartridgeManifest = {
  key: 'light-garden',
  name: 'Light Garden',
  ageBand: [7, 10],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  author: 'Kieran Klaassen',
  version: '0.1.0',
}
