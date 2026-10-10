import { WALL } from './stage'

// Who is walking down the street behind the stall, as numbers. It has
// nothing to do with the task: somebody goes by under an umbrella, somebody
// pushes a barrow of fruit, and somebody walks a dog that is far too long and
// takes a long time to pass. They go by at their own paces with long gaps
// between, and they are never asked for anything. A tap on one gets its own
// small answer and changes nothing: not its pace, and nothing in the game
// (decor.ts). They stand still when the game rests, since they run on the
// attended clock.
// Pure.

export type PasserKind = 'umbrella' | 'longDog' | 'barrow'

/** One who is passing now: where its middle is along the street, how far through its stride it is, and which way it goes. */
export type Passer = { kind: PasserKind; x: number; stride: number; dir: 1 | -1 }

type Route = {
  kind: PasserKind
  /** Stage units a second. */
  speed: number
  /** How long the whole of it is, nose to tail. */
  span: number
  /** The length of empty street after it, before it comes round again. */
  gap: number
  dir: 1 | -1
  /** How far along its lap it is when the game opens. */
  start: number
}

export const ROUTES: readonly Route[] = [
  { kind: 'umbrella', speed: 22, span: 70, gap: 760, dir: 1, start: 760 },
  { kind: 'longDog', speed: 31, span: 380, gap: 1500, dir: -1, start: 930 },
  { kind: 'barrow', speed: 44, span: 130, gap: 2300, dir: 1, start: 2500 },
]

/** Who is in the street after `time` attended seconds. One that is between laps is not in the list. */
export function passersAt(time: number): Passer[] {
  const out: Passer[] = []
  const t = Math.max(0, time)
  for (const route of ROUTES) {
    const lap = WALL.w + route.span + route.gap
    const along = (t * route.speed + route.start) % lap
    if (along > WALL.w + route.span) continue
    const x = route.dir > 0 ? WALL.x - route.span / 2 + along : WALL.x + WALL.w + route.span / 2 - along
    out.push({ kind: route.kind, x, stride: (t * route.speed) / 9, dir: route.dir })
  }
  return out
}
