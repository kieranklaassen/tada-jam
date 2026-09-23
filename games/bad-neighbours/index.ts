import type { JamGame } from '../types'
import { badNeighbours } from './bad-neighbours'
import tileArt from './tile.svg'

export const game: JamGame = { cartridge: badNeighbours, emoji: '🏘️', tile: { art: tileArt, from: '#5fb0d6', to: '#bfe6f2' } }
