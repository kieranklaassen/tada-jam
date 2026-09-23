import type { CartridgeManifest } from '../types'

export const pebbleTableManifest: CartridgeManifest = {
  key: 'pebble-table',
  name: 'Pebble Table',
  ageBand: [3, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
  author: 'Kieran Klaassen',
  version: '0.1.0',
}
