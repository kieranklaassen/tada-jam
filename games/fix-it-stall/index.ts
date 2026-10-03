// template: cartridge/index.ts v2
import type { JamGame } from '../types'
import { fixItStallCartridge } from './fix-it-stall'

export const game: JamGame = { cartridge: fixItStallCartridge, emoji: '🔧' }
