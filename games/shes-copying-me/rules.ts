// The tea party's fixed rules: what each thing does at each place, what that
// does to a guest in each coat, and what each guest thinks of it. No drawing,
// no sound, no time.

export const THINGS = ['teapot', 'glue', 'fan', 'fish', 'duster', 'horn'] as const
export type Thing = (typeof THINGS)[number]

/** What a hand is doing, read from where it goes (gesture.ts). */
export const GESTURES = ['tip', 'dab', 'wave', 'show', 'self'] as const
export type Act = (typeof GESTURES)[number]

/** What an act does to a guest. Acts up high and at the aunt's own face reach no guest. */
export const EFFECTS = ['splash', 'glue', 'feathers', 'wind', 'bump', 'blast'] as const
export type Effect = (typeof EFFECTS)[number]

export const COATS = ['clean', 'wet', 'gluey', 'feathered', 'puffed', 'stiff', 'bubble'] as const
export type Coat = (typeof COATS)[number]

export const HAIRS = ['plain', 'wet', 'gluey', 'feathered'] as const
export type Hair = (typeof HAIRS)[number]

export const GUESTS = ['walrus', 'dog', 'goose', 'pig'] as const
export type Guest = (typeof GUESTS)[number]

export type Mood = 'delight' | 'outrage' | 'puzzled' | 'giggle' | 'sneeze' | 'sing' | 'salute' | 'chase' | 'faint'

/** 0 is the left half of the room, 1 the right. */
export type Side = 0 | 1
export const other = (side: Side): Side => (side === 0 ? 1 : 0)

const ON_GUEST: Record<Thing, Record<'tip' | 'dab' | 'wave', Effect>> = {
  teapot: { tip: 'splash', dab: 'splash', wave: 'splash' },
  glue: { tip: 'glue', dab: 'glue', wave: 'glue' },
  fan: { tip: 'wind', dab: 'bump', wave: 'wind' },
  fish: { tip: 'splash', dab: 'bump', wave: 'bump' },
  duster: { tip: 'feathers', dab: 'bump', wave: 'feathers' },
  horn: { tip: 'bump', dab: 'blast', wave: 'blast' },
}

/** What an act with a thing does to the guest in front of it, or null where it reaches none. */
export function effectOf(thing: Thing, act: Act): Effect | null {
  return act === 'show' || act === 'self' ? null : ON_GUEST[thing][act]
}

/** How a guest's body answers an effect in a coat: the picture of the cell, one for each. */
export type Antic =
  | 'drip' | 'glop' | 'nose' | 'puff' | 'wobble' | 'onEnd'
  | 'puddle' | 'slide' | 'clump' | 'dry' | 'shake' | 'spray'
  | 'wash' | 'thicken' | 'stick' | 'set' | 'stretch' | 'blow'
  | 'rinse' | 'bigger' | 'layer' | 'flap' | 'burst' | 'crow'
  | 'flatten' | 'paste' | 'choke' | 'rounder' | 'deflate' | 'spin'
  | 'soften' | 'coat' | 'slip' | 'rock' | 'crack' | 'ring'
  | 'roll' | 'double' | 'prick' | 'float' | 'pop' | 'bounce'

type Outcome = readonly [Coat, Antic]

const OUTCOMES: Record<Coat, Record<Effect, Outcome>> = {
  clean: { splash: ['wet', 'drip'], glue: ['gluey', 'glop'], feathers: ['clean', 'nose'], wind: ['puffed', 'puff'], bump: ['clean', 'wobble'], blast: ['clean', 'onEnd'] },
  wet: { splash: ['wet', 'puddle'], glue: ['gluey', 'slide'], feathers: ['feathered', 'clump'], wind: ['puffed', 'dry'], bump: ['clean', 'shake'], blast: ['clean', 'spray'] },
  gluey: { splash: ['clean', 'wash'], glue: ['gluey', 'thicken'], feathers: ['feathered', 'stick'], wind: ['stiff', 'set'], bump: ['gluey', 'stretch'], blast: ['bubble', 'blow'] },
  feathered: { splash: ['wet', 'rinse'], glue: ['feathered', 'bigger'], feathers: ['feathered', 'layer'], wind: ['feathered', 'flap'], bump: ['clean', 'burst'], blast: ['feathered', 'crow'] },
  puffed: { splash: ['wet', 'flatten'], glue: ['gluey', 'paste'], feathers: ['clean', 'choke'], wind: ['puffed', 'rounder'], bump: ['clean', 'deflate'], blast: ['puffed', 'spin'] },
  stiff: { splash: ['gluey', 'soften'], glue: ['gluey', 'coat'], feathers: ['stiff', 'slip'], wind: ['stiff', 'rock'], bump: ['clean', 'crack'], blast: ['clean', 'ring'] },
  bubble: { splash: ['bubble', 'roll'], glue: ['bubble', 'double'], feathers: ['clean', 'prick'], wind: ['bubble', 'float'], bump: ['clean', 'pop'], blast: ['bubble', 'bounce'] },
}

export function outcomeOf(coat: Coat, effect: Effect): { coat: Coat; antic: Antic } {
  const [to, antic] = OUTCOMES[coat][effect]
  return { coat: to, antic }
}

const TASTES: Record<Guest, Record<Effect, Mood>> = {
  walrus: { splash: 'delight', glue: 'puzzled', feathers: 'sneeze', wind: 'delight', bump: 'outrage', blast: 'salute' },
  dog: { splash: 'outrage', glue: 'puzzled', feathers: 'chase', wind: 'delight', bump: 'delight', blast: 'sing' },
  goose: { splash: 'delight', glue: 'outrage', feathers: 'delight', wind: 'outrage', bump: 'outrage', blast: 'sing' },
  pig: { splash: 'outrage', glue: 'delight', feathers: 'giggle', wind: 'puzzled', bump: 'giggle', blast: 'faint' },
}

/** What a guest thinks of it. The dog is delighted by the fish however it arrives, save as a jet of water. */
export function moodOf(guest: Guest, effect: Effect): Mood {
  return TASTES[guest][effect]
}

/** What showing a thing up high does to the hair of the aunt who shows it. */
export function hairAfter(hair: Hair, thing: Thing): Hair {
  switch (thing) {
    case 'teapot':
    case 'fish':
      return 'wet'
    case 'glue':
      return 'gluey'
    case 'duster':
      return hair === 'gluey' || hair === 'wet' ? 'feathered' : hair
    case 'fan':
      return hair === 'wet' ? 'plain' : hair
    case 'horn':
      return hair
  }
}

/** Whether an aunt's lips are stuck after she used a thing on her own face, or blew the horn anywhere. */
export function lipsAfter(stuck: boolean, thing: Thing): boolean {
  if (thing === 'glue') return true
  if (thing === 'fan') return stuck
  return false
}

/** How long the copy waits, in seconds. */
export const BEATS = ['quick', 'steady', 'slow'] as const
export type BeatId = (typeof BEATS)[number]
export const BEAT_SECONDS: Record<BeatId, number> = { quick: 0.45, steady: 0.8, slow: 1.2 }

export function nextBeat(beat: BeatId): BeatId {
  return BEATS[(BEATS.indexOf(beat) + 1) % BEATS.length]
}
