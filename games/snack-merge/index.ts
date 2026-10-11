// template: cartridge/index.ts v3
import type { JamGame } from '../types'
import { snackMergeCartridge } from './snack-merge'

export const game: JamGame = { cartridge: snackMergeCartridge, emoji: '🍩' }
