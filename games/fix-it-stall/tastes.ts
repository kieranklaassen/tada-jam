import { type Handed } from './handback'

// The characters and their fixed tastes. A reaction is a pure function of who
// the customer is and the exact gadget they were handed: nothing else enters,
// so the same gadget always gets the same reaction from the same customer,
// and a child can learn each taste and test it on purpose. A reaction is
// about the gadget, never about the child, and nothing here rates the mend.

export type Who = 'owl' | 'moth' | 'yak' | 'tortoise' | 'cockatoo' | 'magpie'
export const CUSTOMERS: readonly Who[] = ['owl', 'moth', 'yak', 'tortoise', 'cockatoo', 'magpie']

export function isWho(value: unknown): value is Who {
  return typeof value === 'string' && (CUSTOMERS as readonly string[]).includes(value)
}

/** How it lands. `shrug` is for a gadget that does nothing: the owner tries it twice and lays it back on the mat. */
export type Mood = 'delight' | 'content' | 'disgust' | 'fright' | 'sulk' | 'asleep' | 'shrug'

/** `act` names the motion the view plays. A `secret` is a combination that always gives this, is never hinted and is counted nowhere. */
export type Reaction = { mood: Mood; act: string; secret?: true }

type Taste = (h: Handed) => Reaction | null

const when = (test: (h: Handed) => boolean, mood: Mood, act: string, secret?: true): Taste => (h) => (test(h) ? { mood, act, ...(secret ? { secret } : {}) } : null)

/** Each customer's tastes, strongest feeling first: the first that fits is the reaction. They never change. */
const TASTES: Record<Who, readonly Taste[]> = {
  // A night watchman. Likes a dim glow and a switch to put it out at dawn. Dislikes glare.
  owl: [
    when((h) => h.light === 3, 'disgust', 'owl-cap-down-head-right-round'),
    when((h) => h.light === 1, 'delight', 'owl-settles-in-the-glow'),
    when((h) => h.light > 0 && h.canPutOut, 'delight', 'owl-puts-it-out-and-on-again'),
  ],
  // Cannot leave a lamp alone. Likes the brightest lamp there is. Dislikes a fan's wind, and the dark.
  moth: [
    when((h) => h.wind < 0, 'delight', 'moth-rides-the-blade', true),
    when((h) => h.wind > 0, 'fright', 'moth-pinned-to-the-post'),
    when((h) => h.light === 3, 'delight', 'moth-bumps-the-glass-in-bliss'),
    when((h) => h.light === 2, 'content', 'moth-circles-the-lamp'),
    when((h) => h.light <= 1, 'sulk', 'moth-droops'),
  ],
  // Always too hot. Likes a strong wind in the face. Dislikes a fan that sucks, and a hot bright lamp.
  yak: [
    when((h) => h.wind < 0, 'disgust', 'yak-fringe-goes-in'),
    when((h) => h.wind >= 2, 'delight', 'yak-hair-streams-back'),
    when((h) => h.light === 3, 'disgust', 'yak-wilts'),
  ],
  // Has all the time there is. Likes slow and soft. Dislikes anything fast or sudden.
  tortoise: [
    when((h) => Math.abs(h.wind) === 3 || h.sound === 3, 'fright', 'tortoise-head-and-legs-in'),
    when((h) => Math.max(Math.abs(h.wind), h.sound) === 1, 'delight', 'tortoise-stretches-its-neck-out'),
  ],
  // Loud. Likes the loudest rasp, and two buzzers throbbing. Dislikes silence, and a lamp that is out.
  cockatoo: [
    when((h) => h.dark, 'asleep', 'cockatoo-asleep-at-once'),
    when((h) => h.buzzing >= 2 && h.sound >= 2, 'delight', 'cockatoo-conducts-the-duet', true),
    when((h) => h.sound === 3, 'delight', 'cockatoo-joins-and-drowns-it-out'),
    when((h) => h.sound === 0, 'sulk', 'cockatoo-taps-it-and-sulks'),
  ],
  // A collector who cannot bear a mess. Likes a lid shut flat and anything shiny in the mend. Dislikes trailing leads and the rubber band.
  magpie: [
    when((h) => h.shiny, 'delight', 'magpie-keeps-the-shiny-thing', true),
    when((h) => h.lid === 'banded', 'disgust', 'magpie-snaps-the-rubber-band'),
    when((h) => h.lid === 'bulging', 'disgust', 'magpie-picks-at-the-leads'),
    when((h) => h.lid === 'flat', 'delight', 'magpie-pats-the-lid'),
  ],
}

/** How this customer takes this gadget. */
export function reaction(who: Who, handed: Handed): Reaction {
  if (!handed.ran) {
    // It does not run. A popped flag is sudden, and only the tortoise minds that; everyone else just tries it twice.
    if (handed.popped && who === 'tortoise') return { mood: 'fright', act: 'tortoise-stays-in-a-beat-longer' }
    return { mood: 'shrug', act: `${who}-tries-it-twice-and-lays-it-back` }
  }
  for (const taste of TASTES[who]) {
    const found = taste(handed)
    if (found) return found
  }
  return { mood: 'content', act: `${who}-takes-it-and-nods-to-nobody` }
}
