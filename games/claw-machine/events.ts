import type { GobblerId, LiftWay, WrongWay } from './gobblers'
import type { Kind, Size } from './toys'

// Everything that can be heard, as the game says it happened. The game only
// says what happened; `voices.ts` gives each its sound as plain numbers.

export type GameEvent =
  // The claw.
  | { type: 'chirp'; distance: number }
  | { type: 'tick' }
  | { type: 'clack' }
  | { type: 'bite' }
  | { type: 'ratchet'; progress: number; heavy: number }
  | { type: 'let-go' }
  // Toys on the tray.
  | { type: 'pop'; heavy: number; level: number }
  | { type: 'settle' }
  | { type: 'bonk'; column: number }
  | { type: 'click'; heavy: number; level: number }
  | { type: 'boing' }
  | { type: 'teeter' }
  | { type: 'knock' }
  | { type: 'domino'; nth: number }
  | { type: 'rattle' }
  // A gobbler and a toy.
  | { type: 'catch'; heavy: number }
  | { type: 'chomp'; heavy: number; who: GobblerId }
  | { type: 'gulp'; heavy: number; who: GobblerId }
  | { type: 'plink'; nth: number }
  | { type: 'hmm'; who: GobblerId }
  | { type: 'wrong'; way: WrongWay }
  // A gobbler and the claw.
  | { type: 'groan' }
  | { type: 'lifted'; way: LiftWay }
  | { type: 'thud'; who: GobblerId }
  | { type: 'squeak'; who: GobblerId }
  | { type: 'snap' }
  | { type: 'gargle'; who: GobblerId }
  // The ledge.
  | { type: 'cork' }
  | { type: 'clank' }
  | { type: 'slap' }
  | { type: 'whistle' }
  | { type: 'grunt' }
  | { type: 'huff' }
  | { type: 'creak'; nth: number }
  | { type: 'stare' }
  | { type: 'gate-rattle' }
  | { type: 'ping'; nth: number }
  | { type: 'scrape' }
  | { type: 'comb' }
  | { type: 'gate-creak' }
  // The end of the rail.
  | { type: 'bell' }
  | { type: 'double-ding' }
  | { type: 'zip' }
  | { type: 'rim-thud' }
  | { type: 'bell-hum' }
  // The claw waiting.
  | { type: 'jaw-hum' }
  | { type: 'jaw-click' }
  | { type: 'wind' }
  // The scenes.
  | { type: 'show'; who: GobblerId }
  | { type: 'tip'; nth: number }
  | { type: 'waddle' }
  | { type: 'hop-in'; nth: number }
  | { type: 'grow' }
  | { type: 'ring'; size: Size; kind: Kind; nth: number }
  | { type: 'burp'; nth: number }
  | { type: 'slide-in' }
  | { type: 'pour' }
