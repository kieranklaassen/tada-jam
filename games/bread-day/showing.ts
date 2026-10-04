// The showing (ART.md, "The scenes"): the badger does one new act, once, on a
// small lump of its own at the back of the bench. Each showing is a short list
// of timed acts, and every act is an act of the rules (stuff.ts) on the
// badger's own lump, so what the child is shown is exactly what the same act
// will do under their own finger. It shows the new act only, never on the
// child's peel, and never ends on a bread the customer who brings the idea
// wants (a test holds this against the tastes).

import { BAKE_SECONDS, RISE_SECONDS, WORK_FULL, darker, gather, pull, push, rest, tip, type Ingredient, type Load } from './stuff'
import type { Idea } from './tastes'

/** Where the badger holds its lump while it shows: at its place on the bench, up in the warm nook, or in the oven's mouth. */
export type Where = 'bench' | 'nook' | 'oven'

export type Shown = { at: number; where: Where; load: Load; voice: string | null }

const tipped = (...what: Ingredient[]): Load => what.reduce<Load>((load, next) => tip(load, next).load, null)
const pushed = (load: Load, times: number): Load => { for (let i = 0; i < times; i++) load = push(load).load; return load }
const smooth = (): Load => pushed(tipped('flour', 'water'), WORK_FULL)
const baked = (load: Load): Load => rest(load, 'oven', BAKE_SECONDS)

/** The moments of each showing, in order: from each `at` on, the lump is `load`, held `where`, and `voice` sounds once as the moment arrives. */
function moments(idea: Idea): Shown[] {
  const list: Shown[] = []
  const say = (at: number, where: Where, load: Load, voice: string | null = null) => { list.push({ at, where, load, voice }); return load }
  if (idea === 'dough') {
    // Flour, water and pushing make dough, and it goes into the oven. The showing stops as the door shuts: whatever
    // comes out of the oven is someone's bread (a brick is the goat's, a crumbly loaf the sparrows'), and how much to
    // push is left for the child to find.
    let load = say(0, 'bench', null)
    load = say(0.5, 'bench', tip(load, 'flour').load, 'flour-hiss')
    load = say(1.3, 'bench', tip(load, 'water').load, 'gurgle')
    for (let i = 0; i < 5; i++) load = say(2 + i * 0.3, 'bench', push(load).load, i % 2 === 0 ? 'squish' : null)
    say(4, 'oven', load, 'door-clang')
  } else if (idea === 'shapes') {
    let load = say(0, 'bench', smooth())
    load = say(0.8, 'bench', pull(load).load, 'stretch-rise')
    load = say(2.4, 'bench', gather(load).load, 'gather-pat')
    say(3.4, 'bench', pull(load).load, 'stretch-rise')
  } else if (idea === 'rising') {
    let load = say(0, 'bench', smooth())
    load = say(0.6, 'bench', tip(load, 'bubbly').load, 'burp')
    for (let i = 0; i < 6; i++) load = say(1.2 + i * 0.2, 'bench', push(load).load, i % 2 === 0 ? 'squish' : null)
    say(2.8, 'nook', load, 'peel-set')
    for (let i = 1; i <= 6; i++) say(2.8 + i * 0.4, 'nook', rest(load, 'nook', (RISE_SECONDS * i) / 6), i % 2 === 1 ? 'bubble-ticks' : null)
  } else if (idea === 'crust') {
    // The act is going back into the oven. It is shown on a heap of toasted flour, which nobody at the hatch wants,
    // and never on a bread: any bread gone dark is the crow's.
    const gold = baked(tipped('flour'))
    const dark = gold && !gold.raw ? darker(gold) : gold, black = dark && !dark.raw ? darker(dark) : dark
    say(0, 'bench', gold)
    say(0.8, 'oven', dark, 'low-sizzle')
    say(2, 'bench', dark, 'dry-patter')
    say(2.8, 'oven', black, 'one-pop')
    say(4, 'bench', black, 'badger-cough')
  } else if (idea === 'seeds') {
    // On a baked crust they roll off; pressed onto raw dough they stay. The raw lump is left unbaked: a seeded loaf is the hen's.
    const loaf = baked(smooth())
    say(0, 'bench', loaf)
    say(0.7, 'bench', tip(loaf, 'seeds').load, 'seed-ticks')
    let load = say(2, 'bench', smooth())
    load = say(2.9, 'bench', tip(load, 'seeds').load, 'seed-ticks')
    say(3.8, 'bench', push(load).load, 'squish')
  } else {
    // More water than flour runs. It is left unbaked: a pancake is the duck's.
    let load = say(0, 'bench', tipped('flour', 'water'))
    load = say(0.8, 'bench', tip(load, 'water').load, 'gurgle')
    load = say(1.8, 'bench', push(load).load, 'slap-ripple')
    load = say(2.6, 'bench', push(load).load, 'glug')
    say(3.4, 'bench', push(load).load, 'slap-ripple')
  }
  return list
}

const MADE = new Map<Idea, Shown[]>()

/** The moments of a showing. Made once from the rules and kept. */
export function showing(idea: Idea): readonly Shown[] {
  let made = MADE.get(idea)
  if (!made) { made = moments(idea); MADE.set(idea, made) }
  return made
}

/** How long a showing lasts: its last moment and a second to look at it. Between four and eight seconds. */
export function showingLength(idea: Idea): number {
  const list = showing(idea)
  return Math.max(4, Math.min(8, list[list.length - 1].at + 1))
}

/** The moment a showing has reached after `seconds`. */
export function shownAt(idea: Idea, seconds: number): Shown {
  const list = showing(idea)
  let found = list[0]
  for (const moment of list) if (moment.at <= seconds) found = moment
  return found
}
