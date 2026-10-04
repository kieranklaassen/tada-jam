// How the page is drawn from a guest's place, as pure arithmetic over the two
// transforms that inkPlaces.ts owns (the lens over the large room, and the
// bat's page turned upside down): the same two as flat transforms a canvas
// takes, and each guest's hand, which is the way its whole page is drawn.

import type { GuestId } from './guests'
import { lensOf, upsideDown, type Lens, type Spot } from './inkPlaces'
import type { InkGuest, InkView } from './inkScene'
import type { PageLayout } from './layout'

/** A flat transform, as a canvas takes it: x' = a x + c y + e, y' = b x + d y + f. */
export type Mat = readonly [number, number, number, number, number, number]

export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0]

/** `m` after `n`: what `n` does first, then `m`. */
export function mul(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

export function apply(m: Mat, x: number, y: number): { x: number; y: number } {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] }
}

/**
 * A guest's hand: the way the whole page is drawn from its place. The bat's
 * page is upside down (inkPlaces.ts says so), and the bat alone is the right
 * way up on it. The troll's line is heavier and unsteady. The blob has many
 * eyes, so its page is drawn several times over, slightly apart. The yeti's
 * lines drip wherever it is warm. The lizard's page is thin and spidery and
 * shivers. Steam curls off every warmth on the cook's. The fly sees its room
 * in facets. The singer's lines waver like a held note, and everything on
 * her page is a little see-through. No hand but the bat's moves the page.
 */
export type Hand = { hangs: boolean; heavy: boolean; doubled: boolean; drips: boolean; thin: boolean; steams: boolean; facets: boolean; wavers: boolean }

const PLAIN_HAND: Hand = { hangs: false, heavy: false, doubled: false, drips: false, thin: false, steams: false, facets: false, wavers: false }

export const HANDS: Readonly<Record<GuestId, Hand>> = {
  troll: { ...PLAIN_HAND, heavy: true },
  bat: { ...PLAIN_HAND, hangs: true },
  blob: { ...PLAIN_HAND, doubled: true },
  yeti: { ...PLAIN_HAND, drips: true },
  lizard: { ...PLAIN_HAND, thin: true },
  cook: { ...PLAIN_HAND, steams: true },
  fly: { ...PLAIN_HAND, facets: true },
  singer: { ...PLAIN_HAND, wavers: true },
}

/** The turn of the whole page in a view: half round about the middle of the plate for the bat, and nothing for anyone else. */
export function pageMat(page: PageLayout, view: InkView | null | undefined): Mat {
  if (!view || !upsideDown(view.from, view.inHand)) return IDENTITY
  return [-1, 0, 0, -1, 2 * (page.plate.x + page.plate.w / 2), 2 * (page.plate.y + page.plate.h / 2)]
}

/** The enlargement of a lens: its `from` onto its `to`. */
export function lensMat(lens: Lens): Mat {
  return [lens.scale, 0, 0, lens.scale, lens.to.x - lens.from.x * lens.scale, lens.to.y - lens.from.y * lens.scale]
}

/**
 * The lens of a view, or none on the plain page. A view whose room is not
 * drawn large (a guest being carried) has a lens all the same, of scale one:
 * the room stays where it is, at its own size, and is still laid in full ink.
 */
export function viewLens(page: PageLayout, view: InkView | null | undefined): Lens | null {
  const lens = view ? lensOf(page, view.room) : null
  if (!lens || !view || view.large !== false) return lens
  return { from: lens.from, to: lens.from, scale: 1 }
}

/** Whether a guest is in the room a view draws in full ink. */
export function inLens(view: InkView | null | undefined, guest: InkGuest): boolean {
  return !!view && view.room !== null && typeof guest.place === 'object' && guest.place.room === view.room
}

/** How tall the box is that a finger lands in to touch a guest, in the drawing's units (as in inkPlaces.ts). */
const BOX = 150

/**
 * Where a guest's feet go on the plain page and how far it is turned there.
 * Everyone stands at its spot. The bat asleep in a room hangs: it is turned
 * half round within the very box a finger finds it in, and `cord` is the
 * point on its ceiling that it hangs from, by a cord to its feet. On its own
 * upside-down page it hangs so awake or asleep, and so alone reads the right
 * way up.
 */
export function standOf(page: PageLayout, view: InkView | null | undefined, guest: InkGuest, spot: Spot): { x: number; y: number; turn: number; cord: { x: number; y: number } | null } {
  const hangs = HANDS[guest.id].hangs
  // The bat sleeps hanging, on whoever's page it is: head down from its ceiling, in the same box a finger finds it in. Not while it is rolled in the quilt, and not in the lobby or on the bench, where it waits awake.
  const asleep = hangs && !guest.awake && !guest.wrapped && !guest.carried && typeof guest.place === 'object'
  const own = !!view && view.from === guest.id && hangs && upsideDown(view.from, view.inHand)
  if (!asleep && !own) return { x: spot.x, y: spot.y, turn: 0, cord: null }
  const u = page.scale, y = spot.y - BOX * u
  const ceiling = guest.place === 'lobby' ? page.lobby.y : guest.place === 'bench' ? null : page.rooms[guest.place.room]?.rect.y ?? null
  return { x: spot.x, y, turn: Math.PI, cord: ceiling === null ? null : { x: spot.x, y: ceiling } }
}
