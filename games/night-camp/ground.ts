import type { CamperId, Ring, Site } from './world'

// The ground plan of the camp, in design pixels from the fire: where each
// tent stands, where each camper lies, where a lantern's pin is, and how far
// the fire and a lantern throw their light. Pure numbers with no surface: the
// stage (stage.ts) scales them to the screen, and the night (night.ts) reads
// who is lit from the very same plan, so the circle of light a child sees is
// the one the rules use.
//
// Each camper has a bearing of its own round the fire, the same at every
// site, and stands at one of three rings. The arc straight below the fire is
// kept bare: the dog lies there, and it is the way down to the rods.

export type Spot = { readonly x: number; readonly y: number }

const TAU = Math.PI * 2
/** The bearing of each camper's tent from the fire, in radians, clockwise from the right as the map lies. */
export const BEARING: Readonly<Record<CamperId, number>> = { sleeper: 2.6, reader: 3.66, cook: 4.72, scout: 5.78, small: 6.84 }
/** A small lean for each tent, so nothing lines up. */
const LEAN: Readonly<Record<CamperId, number>> = { sleeper: 0.06, reader: -0.08, cook: 0.05, scout: -0.06, small: 0.07 }
/** How far from the fire a tent stands at each ring. */
export const RING_AWAY: readonly number[] = [0, 124, 180, 236]
/** How far the fire's light and warmth reach at each reach of its dial: past every camper of that ring, short of the next. */
export const REACH: readonly number[] = [0, 178, 234, 290]
/** How far a lantern throws its light on the low wick and on the high one. */
export const LAMP_LOW = 72
export const LAMP_HIGH = 182
/** The figures are drawn a little over design size. */
export const FIGURE_SCALE = 1.1
/** Where a camper lies in its tent's own frame: a little further from the fire than the tent's middle, and to one side. */
const BESIDE = { back: -26, side: 33 }
/** How far from a camper's middle its lantern pin stands. */
const PIN_AWAY = 52

const turnOf = (who: CamperId) => BEARING[who] + Math.PI + LEAN[who]
const from = (at: Spot, turn: number, x: number, y: number): Spot => {
  const c = Math.cos(turn), s = Math.sin(turn)
  return { x: at.x + (x * c - y * s) * FIGURE_SCALE, y: at.y + (x * s + y * c) * FIGURE_SCALE }
}
export const apart = (a: Spot, b: Spot) => Math.hypot(a.x - b.x, a.y - b.y)

/** A tent's middle, and the turn that points its door at the fire. */
export function tentSpot(who: CamperId, ring: Ring): { at: Spot; turn: number } {
  const away = RING_AWAY[ring]
  return { at: { x: Math.cos(BEARING[who]) * away, y: Math.sin(BEARING[who]) * away }, turn: turnOf(who) }
}

/** The middle of the tent as it is drawn: beside the line from the fire, on the side the camper is not. */
export function tentMiddle(who: CamperId, ring: Ring): Spot {
  const tent = tentSpot(who, ring)
  return from(tent.at, tent.turn, 0, who === 'sleeper' ? -32 : -23)
}

/** Where a camper lies: the origin of its own frame (the head just above it, the feet toward the fire), the frame's turn, its head and its middle. */
export function camperSpot(who: CamperId, ring: Ring): { at: Spot; turn: number; head: Spot; middle: Spot } {
  const tent = tentSpot(who, ring), big = who === 'sleeper'
  const at = from(tent.at, tent.turn, big ? -44 : BESIDE.back, big ? 34 : BESIDE.side), turn = tent.turn - Math.PI / 2
  return { at, turn, head: from(at, turn, 0, big ? 6 : -3), middle: from(at, turn, 0, big ? 42 : 26) }
}

/** The dog lies straight below the fire, in the bare arc. */
export const DOG_HOME: Spot = { x: 0, y: 104 }
/** The snack tin lies out to the right of the camp: inside the fire's widest circle and outside its middle one, so only a big fire keeps it lit. */
export const TIN: Spot = { x: 262, y: 6 }
/** The kettle stands on the ring of stones. */
export const KETTLE: Spot = { x: 13, y: -21 }
/** The steel ring of the fire's dial. */
export const DIAL_RADIUS = 51

/** Everything at a site that a pin, a walker or anything set down must keep clear of: a middle and a radius. */
export function obstacles(site: Site): { name: string; at: Spot; radius: number }[] {
  const all: { name: string; at: Spot; radius: number }[] = [{ name: 'fire', at: { x: 0, y: 0 }, radius: DIAL_RADIUS + 6 }, { name: 'dog', at: DOG_HOME, radius: 18 }, { name: 'tin', at: TIN, radius: 24 }]
  for (const tent of site.tents) {
    const lying = camperSpot(tent.camper, tent.ring), big = tent.camper === 'sleeper'
    // A tent is longer than it is wide: its middle and its two ends, as three rounds.
    const pitched = tentSpot(tent.camper, tent.ring), across = big ? -32 : -23
    all.push({ name: `tent of ${tent.camper}`, at: tentMiddle(tent.camper, tent.ring), radius: 31 })
    for (const along of [-21, 21]) all.push({ name: `tent of ${tent.camper}, end`, at: from(pitched.at, pitched.turn, along, across), radius: 27 })
    all.push({ name: `${tent.camper}, head`, at: lying.head, radius: big ? 22 : 15 }, { name: `${tent.camper}, middle`, at: lying.middle, radius: big ? 32 : 17 })
    all.push({ name: `${tent.camper}, feet`, at: from(lying.at, lying.turn, 0, big ? 78 : 52), radius: big ? 28 : 14 })
  }
  return all
}

/** The radius of a lantern from above, with its handle. */
export const LAMP_BODY = 30

/**
 * Where each pin of a site stands. A pin stands by one camper, on the side
 * toward another: the low wick lights the one it stands by, and the high wick
 * reaches the other. The spot is the first, turning away from the straight
 * line a step at a time, that is clear of every tent, camper and pin already
 * placed, and inside the sheet.
 */
export function pinSpots(site: Site): readonly Spot[] {
  const known = PINS.get(site)
  if (known) return known
  const blocks = obstacles(site), spots: Spot[] = []
  for (const pin of site.pins) {
    const by = site.tents.find((tent) => tent.camper === pin.near[0])!, toward = site.tents.find((tent) => tent.camper === pin.far[0])!
    const a = camperSpot(by.camper, by.ring).middle, b = camperSpot(toward.camper, toward.ring).middle, straight = Math.atan2(b.y - a.y, b.x - a.x)
    // Of every clear spot round the camper it stands by, close enough for the low wick, the one nearest the other camper.
    let best: Spot = { x: a.x + Math.cos(straight) * PIN_AWAY, y: a.y + Math.sin(straight) * PIN_AWAY }, least = Infinity
    for (const away of [PIN_AWAY, PIN_AWAY + 8, PIN_AWAY + 16]) for (let step = 0; step < 36; step++) {
      const angle = straight + (step * TAU) / 36, at = { x: a.x + Math.cos(angle) * away, y: a.y + Math.sin(angle) * away }
      const clear = blocks.every((block) => apart(at, block.at) >= block.radius + LAMP_BODY - 4) && spots.every((other) => apart(at, other) >= LAMP_BODY * 2 + 6)
      // Inside the sheet and above the rods.
      if (clear && at.x > -330 && at.x < 330 && at.y > -205 && at.y < 196 && apart(at, b) < least) { best = at; least = apart(at, b) }
    }
    spots.push(best)
  }
  PINS.set(site, spots)
  return spots
}
const PINS = new WeakMap<Site, readonly Spot[]>()

/** Who a lantern lights from a pin, on a wick: every camper whose middle lies inside its circle. */
export function litBy(site: Site, pin: number, wick: 0 | 1): CamperId[] {
  const at = pinSpots(site)[pin]
  if (!at) return []
  const reach = wick === 1 ? LAMP_HIGH : LAMP_LOW
  return site.tents.filter((tent) => apart(camperSpot(tent.camper, tent.ring).middle, at) <= reach).map((tent) => tent.camper)
}

/** Whether a camper lies inside the fire's circle at a reach of the dial: a matter of the rings, and the plan is drawn so that the circle agrees. */
export function inFireCircle(ring: Ring, reach: Ring): boolean {
  return ring <= reach
}

export const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle))
export { TAU }
