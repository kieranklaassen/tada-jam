// Every sound of the game by name. A sound is an event a model makes in the
// step in which the thing that is seen changes, stamped with that model's own
// clock. The Mount plays what the models hand it and makes no sound of its
// own, so nothing is heard that is not seen.

export const SOUND_KINDS = [
  // The lantern.
  'ring', 'tock', 'bell', 'wire', 'strike', 'hookRing',
  // Moths: yellow, red, blue, a light that rushes past, a lantern that comes unlit, plain light, and home again.
  'patter', 'whirr', 'tink', 'pff', 'mothSnore', 'tumble', 'rustle', 'sag', 'tinyFeet', 'settle',
  // Fox.
  'sniff', 'sneeze', 'pad', 'hum', 'plip', 'shake', 'hop', 'thud', 'scrabble', 'thump', 'squeak', 'noseSniff', 'dong', 'whine', 'flop',
  // Owl.
  'hoot', 'spin', 'feather', 'clack', 'hm',
  // Glow-worms.
  'click', 'plop', 'duck', 'eep', 'chime', 'trill', 'bead', 'knock',
  // Hedgehog.
  'feet', 'snuffle', 'spike', 'tiptoe', 'shiver', 'pop', 'rumble', 'root', 'bonk', 'peep',
  // Badger.
  'cheeks', 'blow', 'miss', 'raspberry', 'snore', 'grunt', 'farBlow',
  // The spider.
  'zip',
  // The table.
  'snip', 'scrap', 'bat', 'slide', 'tuck', 'back', 'scamper', 'roll', 'set', 'tap', 'land', 'off', 'wobble',
  // The scenes. Nobody is drawn carrying the lantern, so no footstep sounds.
  'catch', 'door', 'eyes', 'hang', 'pinch', 'unroll',
] as const

export type SoundKind = (typeof SOUND_KINDS)[number]

/** A sound a model made: what, when on that model's clock, and one number from 0 to 1 that says which or how high. */
export type SoundEvent = { kind: SoundKind; at: number; n: number; /** It belongs to a scene, and is cut when a touch ends the scene. */ scene?: boolean }
