import type { JamShowcase } from '../../harness/contract'
import { alienFrontier } from './alien-frontier'
import tileArt from './tile.svg'

export const showcase: JamShowcase = {
  cartridge: alienFrontier,
  emoji: '🛸',
  tile: { art: tileArt, from: '#3a2448', to: '#e8834a' },
  requires: 'keyboard & mouse',
}
