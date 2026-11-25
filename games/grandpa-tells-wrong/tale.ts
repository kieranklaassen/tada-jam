// What can happen, what it leaves behind, and how Grandpa gets it wrong. The
// day, the pictures and the lamp all go through `run`, so they cannot disagree.

export const YARD = ['goose', 'pig', 'granny'] as const
/** Everyone who can be told of. Grandpa and the moon only happen in a telling. */
export const CAST = ['goose', 'pig', 'granny', 'grandpa', 'moon'] as const
export const THINGS = ['mud', 'water', 'jam', 'pillow', 'pants', 'balloon'] as const
export const COATS = ['bare', 'mud', 'jam', 'feathers'] as const
export type Neighbour = (typeof YARD)[number]
export type Who = (typeof CAST)[number]
export type Thing = (typeof THINGS)[number]
export type Coat = (typeof COATS)[number]
export type Worn = { coat: Coat; pants: boolean; up: boolean }
export type World = Record<Who, Worn>
/** One happening: whom it happened to, and what. */
export type Event = { who: Who; what: Thing }

/** The most that happens in a day: at morning, noon and dusk. */
export const DAY = 3

export const BARE: Worn = { coat: 'bare', pants: false, up: false }

export function morning(): World {
  return { goose: { ...BARE }, pig: { ...BARE }, granny: { ...BARE }, grandpa: { ...BARE }, moon: { ...BARE } }
}

export function after(worn: Worn, what: Thing): Worn {
  switch (what) {
    // Mud is heavy: whoever is up comes down.
    case 'mud': return { ...worn, coat: 'mud', up: false }
    case 'water': return { ...worn, coat: 'bare', pants: false }
    case 'jam': return { ...worn, coat: 'jam' }
    case 'pillow': return { ...worn, coat: worn.coat === 'jam' ? 'feathers' : worn.coat }
    case 'pants': return { ...worn, pants: true }
    case 'balloon': return { ...worn, up: true }
  }
}

export function run(base: World, events: readonly Event[]): World {
  const world = { ...base }
  for (const { who, what } of events) world[who] = after(world[who], what)
  return world
}

export const same = (a: Event, b: Event): boolean => a.who === b.who && a.what === b.what
export const sameTale = (a: readonly Event[], b: readonly Event[]): boolean => a.length === b.length && a.every((event, i) => same(event, b[i]))

/** The kinds of lie, as positions of the designed order. */
export const LIES = ['who', 'what', 'himself', 'order', 'moon'] as const
export type Lie = (typeof LIES)[number]

/** What each of the yard asks for, dearest first. */
const WISHES: Record<Neighbour, readonly Thing[]> = { goose: ['pants', 'pillow', 'jam'], pig: ['mud', 'balloon', 'jam'], granny: ['jam', 'balloon', 'pillow'] }

/** The first wish that would change anything, or else the dearest. */
export function wishOf(who: Neighbour, worn: Worn): Thing {
  const other = WISHES[who].find((what) => JSON.stringify(after(worn, what)) !== JSON.stringify(worn))
  return other ?? WISHES[who][0]
}

type Pick = <T>(from: readonly T[]) => T

/** Grandpa's telling of a day: the same length, and never the same tale. */
export function tellWrong(day: readonly Event[], position: string, pick: Pick): Event[] {
  const told = day.map((event) => ({ ...event }))
  let lie: Lie = (LIES as readonly string[]).includes(position) ? (position as Lie) : pick(LIES)
  if (lie === 'order') {
    const pairs = told.flatMap((a, i) => told.flatMap((b, j) => (j > i && !same(a, b) ? [[i, j] as const] : [])))
    if (pairs.length) {
      // A swap that changes how the yard ends up is the better lie.
      const [i, j] = pick(telling(day, pairs))
      ;[told[i], told[j]] = [told[j], told[i]]
      return told
    }
    lie = 'who'
  }
  const at = pick(told.map((_, i) => i))
  const { who, what } = told[at]
  if (lie === 'who') told[at].who = pick(YARD.filter((one) => one !== who))
  else if (lie === 'what') told[at].what = pick(THINGS.filter((one) => one !== what))
  else told[at].who = lie === 'himself' ? 'grandpa' : 'moon'
  return told
}

function telling(day: readonly Event[], pairs: readonly (readonly [number, number])[]): readonly (readonly [number, number])[] {
  const end = JSON.stringify(run(morning(), day))
  const better = pairs.filter(([i, j]) => {
    const swapped = [...day]
    ;[swapped[i], swapped[j]] = [swapped[j], swapped[i]]
    return JSON.stringify(run(morning(), swapped)) !== end
  })
  return better.length ? better : pairs
}

/** The next one round, for a tap on a puppet or a thing in a picture. */
export function next<T>(of: readonly T[], now: T): T {
  return of[(of.indexOf(now) + 1) % of.length]
}
