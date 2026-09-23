import type { JamGame } from '../types'
import { moonPhases } from './moon-phases'
import tileArt from './tile.svg'

export const game: JamGame = { cartridge: moonPhases, emoji: '🌓', tile: { art: tileArt, from: '#0e1a52', to: '#3d57c9' } }
