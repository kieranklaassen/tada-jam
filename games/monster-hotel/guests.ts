// The eight guests and their tastes, which never change, so a child can learn
// them and test them on purpose (pack: game-design, characters-with-opinions.md).
// Pure data: the view gives each one its own body, hand and voice.
//
// Strengths count rooms: a noise of 2 is heard in the room it is made in and
// in the rooms that touch it; a noise of 1 stays in its own room.

export type Phase = 'day' | 'night'

export const PHASES: readonly Phase[] = ['day', 'night']

export function otherPhase(phase: Phase): Phase {
  return phase === 'day' ? 'night' : 'day'
}

export const GUEST_IDS = ['troll', 'bat', 'blob', 'yeti', 'lizard', 'cook', 'fly', 'singer'] as const

export type GuestId = (typeof GUEST_IDS)[number]

/** When a guest minds an air that reaches it. */
export type Minds = 'never' | 'asleep' | 'always'

export type Love = 'din' | 'pong' | 'wrap'

export type Taste = {
  /** The hours it is awake. It sleeps through the others. */
  wakes: Phase
  /** It will swap its day for its night when it holds the alarm clock. */
  flexible: boolean
  /** Noise it makes while awake, as a strength. */
  din: number
  /** Smell it makes while awake, as a strength. */
  pong: number
  /** Warmth (above zero) or cold (below) it brings with it, at every hour. */
  carries: number
  /** The coldest and the warmest room it is content in, on the scale from -3 to 3: below zero is cold, zero is mild, above is warm. */
  comfort: readonly [number, number]
  mindsDin: Minds
  mindsPong: Minds
  /** What makes it plainly happier when it is content. Never needed. */
  loves: readonly Love[]
  /** It minds being wrapped in the quilt, since it lives to make its noise. */
  mustPlay: boolean
  /** While awake it must be heard by someone awake who does not mind. */
  needsListener: boolean
}

export const TASTES: Readonly<Record<GuestId, Taste>> = {
  // Plays the tuba all night and sleeps like a log.
  troll: { wakes: 'night', flexible: true, din: 2, pong: 0, carries: 0, comfort: [-3, 3], mindsDin: 'never', mindsPong: 'never', loves: [], mustPlay: true, needsListener: false },
  // Sleeps all day, hanging, in the cool.
  bat: { wakes: 'night', flexible: false, din: 0, pong: 0, carries: 0, comfort: [-3, 0], mindsDin: 'asleep', mindsPong: 'never', loves: [], mustPlay: false, needsListener: false },
  // Sleeps all night in peace, in a room neither warm nor cold.
  blob: { wakes: 'day', flexible: true, din: 0, pong: 0, carries: 0, comfort: [0, 0], mindsDin: 'asleep', mindsPong: 'always', loves: ['wrap'], mustPlay: false, needsListener: false },
  // Leads its own snow cloud on a string; the cold sinks to the room below.
  yeti: { wakes: 'day', flexible: true, din: 0, pong: 0, carries: -2, comfort: [-3, -1], mindsDin: 'never', mindsPong: 'never', loves: [], mustPlay: false, needsListener: false },
  // Shivers in a scarf.
  lizard: { wakes: 'day', flexible: false, din: 0, pong: 0, carries: 0, comfort: [1, 3], mindsDin: 'asleep', mindsPong: 'never', loves: [], mustPlay: false, needsListener: false },
  // Stews all day over its own small fire and hums along to any noise.
  cook: { wakes: 'day', flexible: false, din: 0, pong: 2, carries: 1, comfort: [0, 3], mindsDin: 'never', mindsPong: 'never', loves: ['din'], mustPlay: false, needsListener: false },
  // Wants to smell something rich; its buzz stays in its own room.
  fly: { wakes: 'day', flexible: true, din: 1, pong: 0, carries: 0, comfort: [0, 3], mindsDin: 'never', mindsPong: 'never', loves: ['pong'], mustPlay: false, needsListener: false },
  // A ghost who sings at night and is content only when somebody awake hears her.
  singer: { wakes: 'night', flexible: false, din: 3, pong: 0, carries: -1, comfort: [-3, 0], mindsDin: 'never', mindsPong: 'always', loves: [], mustPlay: false, needsListener: true },
}

export function isGuestId(value: unknown): value is GuestId {
  return typeof value === 'string' && (GUEST_IDS as readonly string[]).includes(value)
}
