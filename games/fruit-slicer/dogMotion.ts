import { draw, pick } from './stream'

// The dog under the counter, as numbers. It is the one character of the toy,
// and it moves like itself: slow to start, quick at the end, nose first. Its
// ears are the funny part, and they are always a beat behind the rest of it.
// At idle it breathes and looks about, and now and then does one small thing,
// never the same thing twice running. A touch gets a reaction of its own.
// Pure: it runs on the seconds it is handed and a stream of its own.

/** Everything the figure needs to draw the dog. Lengths are in the figure's own units; angles in radians. */
export type DogPose = {
  /** How far the head is raised above the counter's edge. */
  lift: number
  tilt: number
  /** Each ear's swing out from the head. */
  earLeft: number
  earRight: number
  /** Where the eyes look, each from -1 to 1. */
  eyeX: number
  eyeY: number
  /** 0 open, 1 shut. */
  lids: number
  /** 0 shut, 1 wide. */
  jaw: number
  tongue: number
  /** 0 to 1: how far the cheeks bulge with what is in them. */
  cheeks: number
  /** A whole turn is 2 pi: the circle it turns for the smallest things. */
  spin: number
  /** The nose's wrinkle, 0 to 1, when it sniffs. */
  sniff: number
}

export const IDLE = ['blink', 'earFlick', 'sniff', 'headTilt', 'yawn', 'pant'] as const
export type Idle = (typeof IDLE)[number]
export const REACTIONS = ['bark', 'snap', 'spin', 'gulp', 'cheeks'] as const
export type Reaction = (typeof REACTIONS)[number]

const IDLE_SECONDS: Readonly<Record<Idle, number>> = { blink: 0.28, earFlick: 0.5, sniff: 1.1, headTilt: 1.6, yawn: 1.9, pant: 2.4 }
const REACTION_SECONDS: Readonly<Record<Reaction, number>> = { bark: 0.45, snap: 0.32, spin: 0.7, gulp: 0.6, cheeks: 1.5 }

export type DogState = {
  /** Seconds the dog has been watched: its breathing runs on this. */
  t: number
  seed: number
  /** The small thing it is doing now, or nothing, and how far through it. */
  idle: Idle | null
  idleAge: number
  /** Seconds until the next small thing. */
  rest: number
  last: Idle | null
  react: Reaction | null
  reactAge: number
  /** How big the thing was that set the reaction off, 0 to 1: the length of the piece it was given. */
  amount: number
}

export const newDog = (seed: number): DogState => ({ t: 0, seed, idle: null, idleAge: 0, rest: 1.4, last: null, react: null, reactAge: 0, amount: 0 })

/** A reaction starts at once and replaces whatever the dog was doing. */
export function react(state: DogState, reaction: Reaction, amount = 0): DogState {
  return { ...state, react: reaction, reactAge: 0, amount: Math.max(0, Math.min(1, amount)), idle: null, idleAge: 0, rest: Math.max(state.rest, 0.8) }
}

/** Plays `dt` seconds: a reaction runs out, a small thing ends, and after a rest the next one is chosen, never the one before. */
export function stepDog(state: DogState, dt: number): DogState {
  const next: DogState = { ...state, t: state.t + dt }
  if (next.react) {
    next.reactAge += dt
    if (next.reactAge >= REACTION_SECONDS[next.react]) next.react = null
    return next
  }
  if (next.idle) {
    next.idleAge += dt
    if (next.idleAge >= IDLE_SECONDS[next.idle]) {
      next.last = next.idle
      next.idle = null
      const pause = draw(next.seed)
      next.seed = pause.state
      next.rest = 1.1 + pause.value * 2.6
    }
    return next
  }
  next.rest -= dt
  if (next.rest <= 0) {
    const chosen = pick(next.seed, IDLE.filter((one) => one !== next.last))
    next.seed = chosen.state
    next.idle = chosen.value
    next.idleAge = 0
  }
  return next
}

const bump = (t: number): number => Math.sin(Math.max(0, Math.min(1, t)) * Math.PI)
const ramp = (t: number, from: number, to: number): number => Math.max(0, Math.min(1, (t - from) / (to - from)))

/**
 * The dog's pose now. `look` is where its eyes go, each from -1 to 1: the view hands it the blade while a
 * finger is down, and the dog watches it. Breathing and a slow sway of the ears never stop.
 */
export function poseOf(state: DogState, look: { x: number; y: number } | null = null): DogPose {
  const breath = Math.sin(state.t * 1.7)
  const pose: DogPose = {
    lift: 2.5 * breath,
    tilt: 0,
    // The ears trail the breath by a beat, and not by the same beat.
    earLeft: 0.05 * Math.sin(state.t * 1.7 - 0.9),
    earRight: 0.05 * Math.sin(state.t * 1.7 - 1.5),
    eyeX: look ? Math.max(-1, Math.min(1, look.x)) : 0.15 * Math.sin(state.t * 0.43),
    eyeY: look ? Math.max(-1, Math.min(1, look.y)) : -0.55,
    lids: 0,
    jaw: 0,
    tongue: 0,
    cheeks: 0,
    spin: 0,
    sniff: 0,
  }
  if (state.idle) {
    const t = state.idleAge / IDLE_SECONDS[state.idle]
    switch (state.idle) {
      case 'blink':
        pose.lids = bump(t)
        break
      case 'earFlick':
        pose.earRight += 0.7 * bump(t * 2) * (t < 0.5 ? 1 : 0) + 0.25 * bump((t - 0.5) * 2) * (t >= 0.5 ? 1 : 0)
        break
      case 'sniff':
        pose.sniff = Math.abs(Math.sin(t * Math.PI * 4))
        pose.lift += 5 * bump(t)
        pose.eyeY = 0.2
        break
      case 'headTilt':
        pose.tilt = 0.26 * bump(t)
        pose.earLeft += 0.35 * bump(ramp(t, 0.12, 1))
        break
      case 'yawn':
        pose.jaw = bump(ramp(t, 0.1, 0.9))
        pose.lids = bump(ramp(t, 0.2, 0.8))
        pose.tongue = 0.7 * bump(ramp(t, 0.25, 0.85))
        pose.lift += 6 * bump(t)
        break
      case 'pant':
        pose.jaw = 0.35
        pose.tongue = 0.8 + 0.2 * Math.sin(t * Math.PI * 14)
        pose.lift += 1.5 * Math.sin(t * Math.PI * 14)
        break
    }
  }
  if (state.react) {
    const t = state.reactAge / REACTION_SECONDS[state.react]
    switch (state.react) {
      case 'bark':
        pose.jaw = bump(ramp(t, 0, 0.5))
        pose.lift += 14 * bump(ramp(t, 0, 0.6))
        pose.earLeft += 0.5 * bump(ramp(t, 0.15, 0.9))
        pose.earRight += 0.5 * bump(ramp(t, 0.25, 1))
        break
      case 'snap':
        pose.jaw = t < 0.35 ? ramp(t, 0, 0.35) : 1 - ramp(t, 0.35, 0.5)
        pose.lift += 18 * bump(ramp(t, 0, 0.7))
        pose.tilt = -0.2 * bump(t)
        break
      case 'spin':
        // A full circle for the smallest things: slow to start, quick at the end.
        pose.spin = Math.PI * 2 * t * t * (3 - 2 * t)
        pose.earLeft += 0.8 * bump(t)
        pose.earRight += 0.8 * bump(ramp(t, 0.1, 1))
        pose.tongue = 0.6 * bump(t)
        break
      case 'gulp':
        pose.jaw = bump(ramp(t, 0, 0.4))
        pose.cheeks = state.amount * bump(ramp(t, 0.2, 1))
        pose.lift += 8 * bump(ramp(t, 0, 0.5)) - 6 * bump(ramp(t, 0.5, 1))
        break
      case 'cheeks':
        // A long piece, eaten politely and with difficulty.
        pose.jaw = 0.5 * bump(ramp(t, 0, 0.2))
        pose.cheeks = Math.min(1, Math.max(0.5, state.amount) * (1 - ramp(t, 0.6, 1)) * ramp(t, 0, 0.15) * (1 + 0.12 * Math.sin(t * Math.PI * 9)))
        pose.lids = 0.4 * bump(ramp(t, 0.2, 0.9))
        pose.lift -= 4 * bump(t)
        break
    }
  }
  return pose
}
