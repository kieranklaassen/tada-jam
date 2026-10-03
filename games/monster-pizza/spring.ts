// A damped spring on game time: the squash of a tub, the jiggle of the
// pizza, the settle of a piece that has just landed. Stepped in small fixed
// slices so a long frame does not blow it up.

export type Spring = { x: number; v: number }

export function spring(x = 0): Spring {
  return { x, v: 0 }
}

/** Moves `s` toward `target`. `stiffness` is how hard it pulls, `damping` how fast it settles. */
export function stepSpring(s: Spring, target: number, dt: number, stiffness = 260, damping = 16): void {
  let left = dt
  while (left > 0) {
    const h = Math.min(left, 1 / 120)
    s.v += ((target - s.x) * stiffness - s.v * damping) * h
    s.x += s.v * h
    left -= h
  }
}

/** Whether the spring has come to rest at `target`. */
export function atRest(s: Spring, target: number): boolean {
  return Math.abs(s.x - target) < 0.001 && Math.abs(s.v) < 0.01
}
