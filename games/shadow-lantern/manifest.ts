import type { CartridgeManifest } from '../types'

export const shadowLanternManifest: CartridgeManifest = {
  key: 'shadow-lantern',
  name: 'Shadow Lantern',
  ageBand: [6, 10],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  author: 'Kieran Klaassen',
  version: '0.1.0',
}
