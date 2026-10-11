// How each creature moves when nothing is asked of it, and how each takes a
// jolt. Pure numbers over game time: the view maps them onto the drawing.
// Every creature has its own tempo, its own weight and its own funniest part,
// and no two share a curve (motion.test.ts holds that).

/** A spring towards a target: `stiff` is how hard it pulls and `damp` how soon it settles. */
export class Spring {
  value: number
  speed = 0
  private readonly stiff: number
  private readonly damp: number

  constructor(value: number, stiff: number, damp: number) {
    this.value = value
    this.stiff = stiff
    this.damp = damp
  }

  step(target: number, dt: number): number {
    // Two half steps keep a stiff spring steady at the longest frame the game plays.
    for (let i = 0; i < 2; i++) {
      const h = dt / 2
      this.speed += ((target - this.value) * this.stiff - this.speed * this.damp) * h
      this.value += this.speed * h
    }
    return this.value
  }

  kick(by: number): void {
    this.speed += by
  }

  set(value: number): void {
    this.value = value
    this.speed = 0
  }
}

const TAU = Math.PI * 2
/** 0 to 1 and back, once in each `period`, sharp at the bottom: a hop. */
const hop = (t: number, period: number): number => Math.abs(Math.sin((Math.PI * t) / period))
/** A short pulse that comes once in each `period` and lasts `lasts` seconds: 0, up to 1, back to 0. */
const pulse = (t: number, period: number, lasts: number, offset = 0): number => {
  const at = (((t + offset) % period) + period) % period
  return at < lasts ? Math.sin((Math.PI * at) / lasts) : 0
}

/** The pilot in the pouch: light and impatient. It swings in the sling, and its feet, the funniest part, kick in turn. */
export function pilotIdle(t: number): { swing: number; feet: number; flipper: number; blink: number } {
  return {
    swing: 0.05 * Math.sin(1.7 * t) + 0.018 * Math.sin(4.3 * t),
    feet: Math.sin(5.6 * t),
    flipper: pulse(t, 3.1, 0.45),
    blink: pulse(t, 3.7, 0.14, 1.1),
  }
}

/** The near seal: fat and slow. Its belly rises and sinks, and the ball on its nose is always about to fall. */
export function nearSealIdle(t: number): { breath: number; ball: number; nose: number; blink: number } {
  const ball = 0.2 * Math.sin(1.3 * t) + 0.09 * Math.sin(3.1 * t + 1)
  return { breath: Math.sin((TAU * t) / 4.2), ball, nose: ball * 0.55, blink: pulse(t, 5.9, 0.2, 2) }
}

/** The far seal: asleep. A long breath in, a quick one out, a bubble that swells with it, and one flipper waving at a dream. */
export function farSealIdle(t: number): { breath: number; bubble: number; flipper: number } {
  const at = (t % 3.4) / 3.4
  // In over three quarters of the snore, out over the last quarter.
  const breath = at < 0.75 ? at / 0.75 : 1 - (at - 0.75) / 0.25
  return { breath, bubble: breath * breath, flipper: 0.5 + 0.5 * Math.sin(0.9 * t + Math.sin(0.31 * t) * 2) }
}

/** The chick: small and quick. It bobs on its toes, and its head tips from side to side as it looks. */
export function chickIdle(t: number): { bob: number; tilt: number; blink: number } {
  const side = Math.floor(t / 1.25) % 2 === 0 ? 1 : -1
  const turn = Math.min(1, ((t % 1.25) / 1.25) * 6)
  return { bob: hop(t, 0.62), tilt: side * (turn * 2 - 1), blink: pulse(t, 2.3, 0.1, 0.4) }
}

/** The walrus: nearly still. Its moustache twitches now and then, one brow lifts, and it blinks slowly. */
export function walrusIdle(t: number): { twitch: number; brow: number; blink: number; breath: number } {
  return { twitch: pulse(t, 5.3, 0.5), brow: pulse(t, 11.7, 2.4, 4), blink: pulse(t, 7.1, 0.55, 3), breath: Math.sin((TAU * t) / 6.5) }
}

/** The puffin: stiff and busy. The spyglass goes out and in, and it leans further over the rim each time. */
export function puffinIdle(t: number): { glass: number; lean: number; blink: number } {
  const glass = 0.5 + 0.5 * Math.sin(0.83 * t)
  return { glass, lean: glass * glass, blink: pulse(t, 4.4, 0.12, 2.6) }
}

/** The whale: huge and patient. Now and then it lets a little breath go; its eye drifts when it has nothing to watch. */
export function whaleIdle(t: number): { puff: number; drift: number; blink: number } {
  return { puff: pulse(t, 7.7, 1.3, 5), drift: Math.sin(0.37 * t), blink: pulse(t, 9.3, 0.7, 6) }
}

/** The cloud drifts a little either way, and the lights in the sky come and go. */
export function skyIdle(t: number): { cloud: number; lights: number } {
  return { cloud: Math.sin(0.21 * t), lights: 0.5 + 0.5 * Math.sin(0.13 * t + 1) }
}

/** How near a body is to a place: 0 at `far` or beyond, 1 at `near` or nearer. With no body about, 0. */
export function nearness(x: number, y: number, body: { x: number; y: number } | null, near: number, far: number): number {
  if (!body) return 0
  const away = Math.hypot(body.x - x, body.y - y)
  return Math.min(1, Math.max(0, (far - away) / (far - near)))
}

/**
 * Where a loose thing is when a body comes by: at `rest`, or pushed straight away from the body until it is
 * `clear` of the body's middle. The seal's ball is knocked off its nose and never passed through.
 */
export function dodge(rest: { x: number; y: number }, body: { x: number; y: number } | null, clear: number, out: { x: number; y: number }): { x: number; y: number } {
  out.x = rest.x
  out.y = rest.y
  if (!body) return out
  const dx = rest.x - body.x, dy = rest.y - body.y
  const away = Math.hypot(dx, dy)
  if (away >= clear) return out
  // A body that is right on the thing sends it straight up.
  const nx = away > 0.001 ? dx / away : 0, ny = away > 0.001 ? dy / away : -1
  out.x = body.x + nx * clear
  out.y = body.y + ny * clear
  return out
}

/** The idle curves by name, each as one number over time, for the test that holds them apart. */
export const IDLE_CURVES: Record<string, (t: number) => number> = {
  pilot: (t) => pilotIdle(t).swing,
  pilotFeet: (t) => pilotIdle(t).feet,
  nearSeal: (t) => nearSealIdle(t).breath,
  nearSealBall: (t) => nearSealIdle(t).ball,
  farSeal: (t) => farSealIdle(t).breath,
  farSealFlipper: (t) => farSealIdle(t).flipper,
  chick: (t) => chickIdle(t).bob,
  chickTilt: (t) => chickIdle(t).tilt,
  walrus: (t) => walrusIdle(t).twitch,
  puffin: (t) => puffinIdle(t).glass,
  whale: (t) => whaleIdle(t).puff,
  cloud: (t) => skyIdle(t).cloud,
}
