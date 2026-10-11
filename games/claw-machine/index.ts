// template: cartridge/index.ts v2
import type { JamGame } from '../types'
import { clawMachineCartridge } from './claw-machine'

export const game: JamGame = { cartridge: clawMachineCartridge, emoji: '🧸' }
