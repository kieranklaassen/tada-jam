import { ON_STUDS, type Brick } from './bricks'
import type { GameEvent } from './events'
import { BLACK, WATCHER, WATCHER_DARK, WHITE } from './palette'

// The watcher: a small brick creature that sits on the floor of the cabinet
// beside the tray, at its back corner on the right, and watches. It has no part in the
// sorting: it takes no toy, has no taste, and the claw cannot reach it. It
// follows the claw with its eyes, starts at a bang, laughs when a toy comes
// flying back or a stack comes down, and hops with a peep when a finger
// lands on it. Its feelings are about what happens in the cabinet, never
// about the child. Pure: its build, where it sits, and how it is posed.

/** Where it sits: the middle of its feet, on the floor beside the tray on the right, between the bell post and the step. */
export const WATCHER_AT = { x: 18.9, y: ON_STUDS, z: 1.5 } as const
/** How much bigger than its build it is drawn. */
export const WATCHER_BIG = 1.3
/** How far it is turned from facing the child toward the middle of the tray, at rest. */
export const WATCHER_FACES = -0.75
/** The width of one of its eyes. */
export const WATCHER_EYE = 1.5
/** How tall it is to the top of its ears, and how wide: what a finger has to land in to be on it. */
export const WATCHER_SIZE = { half: 2.5, height: 7.3 } as const

const EYES_AT = { x: 0.78, y: 4.25, z: 0.72 } as const

/** Its body, standing on y = 0 and facing +z, and its two pupils about the middle of an eye. */
export function watcherParts(): { body: Brick[]; pupils: Brick[] } {
  const c = WATCHER, d = WATCHER_DARK, eye = WATCHER_EYE
  const body: Brick[] = [
    { x: -1.3, y: 0, z: -0.5, w: 1, d: 1.6, h: 1, colour: d, studs: false }, { x: 0.3, y: 0, z: -0.5, w: 1, d: 1.6, h: 1, colour: d, studs: false }, // feet
    { x: -1.3, y: 1, z: -1.1, w: 2.6, d: 2.2, h: 5, colour: c, studs: false }, // body
    { x: -1.5, y: 6, z: -1.2, w: 3, d: 2.4, h: 5, colour: c, studs: false }, // head
    { x: -1.5, y: 11, z: -0.9, w: 0.9, d: 0.9, h: 2, colour: d, studs: false }, { x: 0.6, y: 11, z: -0.9, w: 0.9, d: 0.9, h: 2, colour: d, studs: false }, // ears
    { x: -0.3, y: 7.4, z: 1.2, w: 0.6, d: 0.35, h: 1, colour: d, studs: false }, // nose
    { x: -2.16, y: 2.5, z: 0.1, w: 0.8, d: 0.8, h: 2.5, colour: d, round: true, studs: false }, { x: 1.36, y: 2.5, z: 0.1, w: 0.8, d: 0.8, h: 2.5, colour: d, round: true, studs: false }, // paws
  ]
  for (const side of [-1, 1]) body.push({ x: side * EYES_AT.x - eye / 2, y: (EYES_AT.y - eye / 2) / 0.4, z: EYES_AT.z - eye / 2, w: eye, d: eye, h: 0, colour: WHITE, ball: true, studs: false })
  const dot = eye * 0.44
  const pupils: Brick[] = [-1, 1].map((side) => ({ x: side * EYES_AT.x - dot / 2, y: -dot / 2 / 0.4, z: -dot / 2, w: dot, d: dot, h: 0, colour: BLACK, ball: true, studs: false }))
  return { body, pupils }
}

/** Where the middle of its eyes is, measured from its feet: the pupils ride round this. */
export const WATCHER_EYES = { y: EYES_AT.y, z: EYES_AT.z } as const

export type WatcherAct = 'start' | 'laugh' | 'nod' | 'peep' | 'stare'
export type Watcher = { act: WatcherAct | null; t: number }
export const newWatcher = (): Watcher => ({ act: null, t: 0 })

const SECONDS: { readonly [A in WatcherAct]: number } = { start: 0.7, laugh: 1.3, nod: 0.5, peep: 0.8, stare: 1.6 }

/** What it makes of something that happened in the cabinet, or null when it takes no notice. */
export function watcherNotices(event: GameEvent): WatcherAct | null {
  switch (event.type) {
    case 'bonk': case 'bell': case 'double-ding': case 'thud': case 'clank': case 'rim-thud': return 'start'
    case 'wrong': case 'boing': case 'teeter': case 'domino': case 'burp': case 'whistle': case 'huff': return 'laugh'
    case 'gulp': case 'plink': return 'nod'
    case 'pour': case 'show': case 'lifted': return 'stare'
    default: return null
  }
}

/** Something happened: it reacts, unless it is in the middle of something bigger. A laugh is never cut short by a nod. */
export function watcherSees(watcher: Watcher, act: WatcherAct): void {
  const rank: { readonly [A in WatcherAct]: number } = { nod: 0, stare: 1, start: 2, laugh: 3, peep: 4 }
  if (watcher.act && rank[watcher.act] > rank[act] && watcher.t < 0.6) return
  watcher.act = act; watcher.t = 0
}

export function stepWatcher(watcher: Watcher, dt: number): void {
  if (!watcher.act) return
  watcher.t += dt / SECONDS[watcher.act]
  if (watcher.t >= 1) { watcher.act = null; watcher.t = 0 }
}

export type WatcherPose = { dy: number; squash: number; turn: number; gazeX: number; gazeY: number; blink: number }

const bump = (t: number, a: number, b: number) => Math.sin(Math.min(1, Math.max(0, (t - a) / (b - a))) * Math.PI)

/**
 * How it is posed: its own idle life (it breathes, blinks, and now and then looks up at the lamps), with what it is
 * doing laid over it. `lookX` and `lookY` are where the thing it watches is, from -1 to 1 across and up. It never
 * leans, so its feet never leave the floor but in a hop.
 */
export function watcherPose(watcher: Watcher, seconds: number, lookX: number, lookY: number, out: WatcherPose): WatcherPose {
  out.dy = 0
  out.squash = 1 + 0.03 * Math.sin(seconds * 2.3)
  out.blink = (seconds + 1.7) % 4.1 < 0.12 ? 1 : 0
  // Every so often it looks up at the lamps on the wall for a moment, and back. It never looks out at the child.
  const away = bump((seconds + 2) % 9, 0, 1.4)
  out.turn = lookX * 0.35 * (1 - away) - 0.3 * away
  out.gazeX = lookX * (1 - away) - 0.5 * away; out.gazeY = lookY * (1 - away) + 0.9 * away
  const t = watcher.t
  switch (watcher.act) {
    case 'start': // a jump at a bang, and wide eyes
      out.dy = 0.9 * bump(t, 0, 0.55); out.squash *= 1 + 0.16 * bump(t, 0, 0.3) - 0.1 * bump(t, 0.5, 0.8); out.blink = 0
      break
    case 'laugh': // it shakes with it, eyes shut
      out.dy = 0.28 * Math.abs(Math.sin(t * Math.PI * 7)) * (1 - t); out.squash *= 1 - 0.08 * Math.abs(Math.sin(t * Math.PI * 7)) * (1 - t)
      out.blink = t < 0.8 ? 1 : 0
      break
    case 'nod': // a small bob
      out.squash *= 1 - 0.1 * bump(t, 0, 1)
      break
    case 'peep': // a hop straight up and a spin of surprise
      out.dy = 1.3 * bump(t, 0, 0.7); out.squash *= 1 + 0.12 * bump(t, 0, 0.35); out.turn += Math.PI * 2 * Math.min(1, t / 0.7); out.blink = 0
      break
    case 'stare': // up on its toes to see
      out.squash *= 1 + 0.14 * bump(t, 0, 1); out.blink = 0
      break
  }
  return out
}
