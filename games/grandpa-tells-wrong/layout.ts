import type { Point } from './input'
import { CAST, THINGS, type Neighbour, type Thing, type Who } from './tale'

// Where everything stands, in stage units.

export const GROUND = 596
export const SPOT: Record<Who, Point> = {
  goose: { x: 158, y: GROUND },
  pig: { x: 412, y: GROUND },
  granny: { x: 642, y: GROUND },
  grandpa: { x: 930, y: GROUND + 14 },
  moon: { x: 520, y: 168 },
}
/** How high a balloon takes each of them. */
export const LIFT: Record<Who, number> = { goose: 92, pig: 92, granny: 84, grandpa: 74, moon: 44 }
/** Half width and height of each one's touch, from the feet up; the moon's from its middle. */
export const REACH: Record<Who, { half: number; tall: number }> = {
  goose: { half: 116, tall: 300 },
  pig: { half: 120, tall: 220 },
  granny: { half: 100, tall: 300 },
  grandpa: { half: 158, tall: 410 },
  moon: { half: 74, tall: 74 },
}
/** Where a thing that is thrown at someone lands. */
export const CROWN: Record<Who, Point> = {
  goose: { x: 54, y: -300 },
  pig: { x: 0, y: -212 },
  granny: { x: 0, y: -300 },
  grandpa: { x: 0, y: -404 },
  moon: { x: 0, y: -76 },
}

/** One of the yard comes this much nearer when it asks. */
export const NEARER = 1.06

/** The band along the bottom: things by day, pictures in the evening. */
export const BAND = { top: 640, bottom: 800, left: 18, right: 1162 } as const
export const THING_AT = (i: number): Point => ({ x: 112 + i * 191, y: 724 })
export const THING_REACH = 74
export const thingHome = (thing: Thing): Point => THING_AT(THINGS.indexOf(thing))

export const PICTURE = { width: 366, height: 148, gap: 12 } as const
/** One of `n` pictures, in the middle of the band. */
export function pictureAt(i: number, n = 3): { x: number; y: number; width: number; height: number } {
  const all = PICTURE.width * n + PICTURE.gap * (n - 1)
  return { x: (1180 - all) / 2 + i * (PICTURE.width + PICTURE.gap), y: 648, width: PICTURE.width, height: PICTURE.height }
}

export const LAMP: Point = { x: 1112, y: 318 }
export const COCK: Point = { x: 806, y: 122 }
export const SHOULDER: Point = { x: 820, y: 400 }

/** The sun at morning, noon, dusk, and gone. */
export const SUN: readonly Point[] = [{ x: 150, y: 168 }, { x: 350, y: 104 }, { x: 590, y: 150 }, { x: 660, y: 560 }]

export type Target =
  | { kind: 'who'; who: Who }
  | { kind: 'thing'; thing: Thing }
  | { kind: 'puppet'; at: number }
  | { kind: 'prop'; at: number }
  | { kind: 'lamp' }
  | { kind: 'cock' }
  | { kind: 'yard' }

const within = (p: Point, at: Point, r: number): boolean => Math.hypot(p.x - at.x, p.y - at.y) <= r

/** What is under a finger. `pictures` is whether the band holds the pictures. */
export function targetAt(p: Point, pictures: boolean, up: (who: Who) => boolean, moon: boolean, n = 3): Target {
  if (p.y >= BAND.top) {
    if (pictures) {
      for (let at = 0; at < n; at++) {
        const box = pictureAt(at, n)
        if (p.x >= box.x - PICTURE.gap / 2 && p.x < box.x + box.width + PICTURE.gap / 2) return { kind: p.x < box.x + box.width * 0.5 ? 'puppet' : 'prop', at }
      }
      return { kind: 'yard' }
    }
    const thing = THINGS.find((one) => within(p, thingHome(one), THING_REACH + 18))
    return thing ? { kind: 'thing', thing } : { kind: 'yard' }
  }
  if (within(p, { x: LAMP.x, y: LAMP.y + 6 }, 72)) return { kind: 'lamp' }
  if (within(p, COCK, 70)) return { kind: 'cock' }
  if (moon && within(p, { x: SPOT.moon.x, y: SPOT.moon.y - (up('moon') ? LIFT.moon : 0) }, REACH.moon.half + 14)) return { kind: 'who', who: 'moon' }
  const who = nearest(p, up, CAST.filter((one) => one !== 'moon'))
  return who ? { kind: 'who', who } : { kind: 'yard' }
}

/** Whoever the point is on, a little forgiving at the sides. */
export function nearest(p: Point, up: (who: Who) => boolean, among: readonly Who[], slack = 0): Who | null {
  let best: Who | null = null, least = Infinity
  for (const who of among) {
    const at = SPOT[who], reach = REACH[who], lift = up(who) ? LIFT[who] : 0
    const dx = Math.abs(p.x - at.x), dy = at.y - lift - p.y
    if (dx > reach.half + slack || dy < -60 - slack - lift || dy > reach.tall + slack + (up(who) ? 120 : 0)) continue
    if (dx / reach.half < least) {
      least = dx / reach.half
      best = who
    }
  }
  return best
}

export const isNeighbour = (who: Who): who is Neighbour => who !== 'grandpa' && who !== 'moon'
