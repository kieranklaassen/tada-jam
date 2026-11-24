// template: cartridge/index.ts v3
import type { JamGame } from '../types'
import { wrapTheCatCartridge } from './wrap-the-cat'

export const game: JamGame = { cartridge: wrapTheCatCartridge, emoji: '🎁' }
