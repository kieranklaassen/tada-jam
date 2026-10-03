import { compare, whole, type Fraction } from './ratio'
import type { Night } from './night'
import type { CamperId, Site } from './world'

// The campers' fixed tastes. Each camper has one visible want and a few likes
// and dislikes that never change, and what each does in a night is their
// reaction to exactly this plan (ART.md, "The characters and their fixed
// tastes"). The reactions are the game's feedback. They are about the camp and
// never about the child, and nothing here rates a night.
//
// Pure: the same night always gives the same acts, so a child can learn a
// taste and test it on purpose. The view maps each act onto a pose and a
// voice of that camper's own.

/** What a camper wants, in one line of the sheet. */
export const WANTS: Readonly<Record<CamperId, string>> = {
  reader: 'light to read by, all night',
  sleeper: 'to sleep through, warm and in the dark',
  cook: 'a big fire and a full kettle',
  scout: 'to carry nothing back',
  small: 'never to be in the dark',
}

/** Everything a camper can be seen doing because of the plan. A liked thing and a disliked thing are both worth causing. */
export const ACTS = {
  reader: ['reads-by-lantern', 'reads-by-fire', 'walks-to-the-light', 'walks-into-the-stream'],
  sleeper: ['sleeps-through', 'hides-in-the-bag', 'drags-the-bag-to-the-fire', 'wakes-hugging-a-raccoon'],
  cook: ['beams-at-the-fire', 'tends-the-fire', 'fans-the-fire', 'looks-into-the-kettle', 'tastes-cold-cocoa'],
  scout: ['keeps-watch', 'tips-the-hat', 'straps-a-tower-on-the-mule'],
  small: ['sleeps-on-the-dog', 'moves-in-with', 'hides-under-the-dog'],
} as const satisfies Record<CamperId, readonly string[]>

export type Act = (typeof ACTS)[CamperId][number]

/** The acts a camper does only when something they dislike has happened. */
export const DISLIKED: ReadonlySet<Act> = new Set<Act>([
  'walks-to-the-light', 'walks-into-the-stream', 'hides-in-the-bag', 'drags-the-bag-to-the-fire', 'wakes-hugging-a-raccoon',
  'fans-the-fire', 'looks-into-the-kettle', 'tastes-cold-cocoa', 'straps-a-tower-on-the-mule', 'moves-in-with', 'hides-under-the-dog',
])

export type Reaction = {
  readonly camper: CamperId
  readonly act: Act
  /** The moment of the night it starts, in hours from dusk. A morning act starts at dawn. */
  readonly at: Fraction
  /** Whose tent, for the small one moving in. */
  readonly withCamper?: CamperId
  /** How tall the tower on the mule is, in places on the sled, for the scout. */
  readonly size?: number
}

const before = (a: Fraction, b: Fraction) => compare(a, b) < 0

/** The last moment at which any light is left in the camp: the later of the fire and the lanterns. */
function lastLight(night: Night): Fraction {
  const lantern = night.lantern ? night.lantern.until : whole(0)
  return before(night.fire.until, lantern) ? lantern : night.fire.until
}

/**
 * What every camper does in this night, in the order the tents stand, each
 * camper's acts in the order they happen. `leftPlaces` is what is left over
 * at dawn beyond the slack of a tight night, in places on the sled.
 */
export function reactions(site: Site, night: Night, leftPlaces = 0): Reaction[] {
  const dusk = whole(0), dawn = whole(night.hours), out: Reaction[] = []
  const add = (camper: CamperId, act: Act, at: Fraction, more: Partial<Reaction> = {}) => out.push({ camper, act, at, ...more })

  for (const mine of night.campers) {
    const who = mine.camper
    if (who === 'reader') {
      // Lantern light is best and firelight will do; with none, the reader goes looking, still reading.
      if (mine.lantern && before(dusk, mine.lanternUntil)) add(who, 'reads-by-lantern', dusk)
      else if (before(dusk, mine.lightUntil)) add(who, 'reads-by-fire', dusk)
      if (mine.lantern && before(mine.lanternUntil, mine.lightUntil)) add(who, 'reads-by-fire', mine.lanternUntil)
      if (before(mine.lightUntil, dawn)) {
        const last = lastLight(night)
        if (before(mine.lightUntil, last)) add(who, 'walks-to-the-light', mine.lightUntil)
        if (before(last, dawn)) add(who, 'walks-into-the-stream', last)
      }
    } else if (who === 'sleeper') {
      // Warm and dark. A lantern on the tent is glare; a tent outside the circle, or a dead fire, is cold.
      const fireLit = before(dusk, night.fire.until)
      if (mine.lantern && before(dusk, mine.lanternUntil)) add(who, 'hides-in-the-bag', dusk)
      if (!mine.inCircle && fireLit) add(who, 'drags-the-bag-to-the-fire', dusk)
      if (before(night.fire.until, dawn)) add(who, 'wakes-hugging-a-raccoon', night.fire.until)
      if (out.every((reaction) => reaction.camper !== who)) add(who, 'sleeps-through', dusk)
    } else if (who === 'cook') {
      // The biggest fire the dial has, and a round for everyone, poured hot.
      const top = site.fire.length - 1
      add(who, site.fire.length === 1 || (night.fire.setting === top) ? 'beams-at-the-fire' : night.fire.setting === 0 ? 'fans-the-fire' : 'tends-the-fire', dusk)
      const firstCold = night.kettle?.rounds.find((round) => round.cold && round.served.length > 0)
      if (firstCold) add(who, 'tastes-cold-cocoa', whole(firstCold.hour))
      if (night.kettle && night.kettle.firstShort !== null) add(who, 'looks-into-the-kettle', whole(night.kettle.firstShort))
    } else if (who === 'scout') {
      // Keeps watch all night; the opinion comes in the morning, on what is left to carry.
      add(who, 'keeps-watch', dusk)
      if (leftPlaces > 0) add(who, 'straps-a-tower-on-the-mule', dawn, { size: leftPlaces })
      else add(who, 'tips-the-hat', dawn)
    } else {
      // The small one: any light at all. In the dark, into the nearest tent that still has light, whoever is in it.
      if (before(dusk, mine.lightUntil)) add(who, 'sleeps-on-the-dog', dusk)
      if (before(mine.lightUntil, dawn)) {
        const host = night.campers.find((other) => other.camper !== who && before(mine.lightUntil, other.lightUntil))
        if (host) add(who, 'moves-in-with', mine.lightUntil, { withCamper: host.camper })
        else add(who, 'hides-under-the-dog', mine.lightUntil)
      }
    }
  }
  return out
}

/** Whether a camper's own want was met for the whole night: nothing they dislike happened. */
export function content(camper: CamperId, all: readonly Reaction[]): boolean {
  return all.filter((reaction) => reaction.camper === camper).every((reaction) => !DISLIKED.has(reaction.act))
}
