import { spanAt, type Placed } from './pieces'

// How wobbly each tower looks (KTD4, render-only). After the build settles,
// pieces touching each other form stacks; a stack's centre of mass against
// the width of what it stands on, and how tall it is for that width, give a
// sway the view plays by rocking the stack on its base edges. A wide base
// barely moves, a tall narrow tower sways, and a lean toward one edge sways
// more, so stability is something a child can see before anything falls.

export type Mass = { id: number; x: number; mass: number }
export type Load = { id: number; x: number; weight: number }
export type Stack = {
  ids: number[]
  /** Where the stack meets the rug. */
  lo: number
  hi: number
  top: number
  /** 0 (solid) .. 1 (about to go). */
  wobble: number
  /** Sway frequency, radians per second: taller towers sway slower. */
  omega: number
}

const SAMPLES = 9
const TOUCH = 0.08
const GROUND = 0.06

function extent(piece: Placed): { lo: number; hi: number } {
  let lo = Infinity
  let hi = -Infinity
  for (const part of piece.parts) {
    for (const p of part) {
      if (p.x < lo) lo = p.x
      if (p.x > hi) hi = p.x
    }
  }
  return { lo, hi }
}

function bottomAt(piece: Placed, x: number): number {
  let bottom = Infinity
  for (const part of piece.parts) {
    const span = spanAt(part, x)
    if (span && span[0] < bottom) bottom = span[0]
  }
  return bottom
}

function topAt(piece: Placed, x: number): number {
  let top = -Infinity
  for (const part of piece.parts) {
    const span = spanAt(part, x)
    if (span && span[1] > top) top = span[1]
  }
  return top
}

function topOf(piece: Placed): number {
  let top = -Infinity
  for (const part of piece.parts) for (const p of part) if (p.y > top) top = p.y
  return top
}

export function findStacks(placed: readonly Placed[], masses: readonly Mass[], load: Load | null): Stack[] {
  const n = placed.length
  const parent = placed.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const ground: { lo: number; hi: number }[] = placed.map(() => ({ lo: Infinity, hi: -Infinity }))

  for (let a = 0; a < n; a++) {
    const { lo, hi } = extent(placed[a])
    const step = (hi - lo) / SAMPLES
    for (let s = 0; s < SAMPLES; s++) {
      const x = lo + step * (s + 0.5)
      const bottom = bottomAt(placed[a], x)
      if (bottom === Infinity) continue
      if (bottom < GROUND) {
        ground[a].lo = Math.min(ground[a].lo, x - step / 2)
        ground[a].hi = Math.max(ground[a].hi, x + step / 2)
        continue
      }
      for (let b = 0; b < n; b++) {
        if (b === a) continue
        if (Math.abs(topAt(placed[b], x) - bottom) < TOUCH) parent[find(a)] = find(b)
      }
    }
  }

  const groups = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const root = find(i)
    const group = groups.get(root)
    if (group) group.push(i)
    else groups.set(root, [i])
  }

  const stacks: Stack[] = []
  for (const members of groups.values()) {
    let lo = Infinity
    let hi = -Infinity
    let top = 0
    let mass = 0
    let moment = 0
    for (const i of members) {
      lo = Math.min(lo, ground[i].lo)
      hi = Math.max(hi, ground[i].hi)
      top = Math.max(top, topOf(placed[i]))
      const m = masses.find((entry) => entry.id === placed[i].id)
      if (m) {
        mass += m.mass
        moment += m.mass * m.x
      }
      if (load && load.id === placed[i].id) {
        mass += load.weight
        moment += load.weight * load.x
      }
    }
    const ids = members.map((i) => placed[i].id)
    if (lo > hi || mass <= 0) {
      stacks.push({ ids, lo: 0, hi: 0, top, wobble: 0, omega: 0 })
      continue
    }
    const base = Math.max(0.1, hi - lo)
    const com = moment / mass
    const margin = Math.max(-1, Math.min(1, Math.min(com - lo, hi - com) / (base / 2)))
    const slender = Math.max(0, top / base - 1.2) * 0.16
    const lean = Math.max(0, 1 - margin) * 0.55
    const wobble = Math.min(1, slender + lean * Math.min(1, top / 1.5))
    stacks.push({ ids, lo, hi, top, wobble, omega: (2 * Math.PI * 1.15) / Math.sqrt(Math.max(1, top)) })
  }
  return stacks
}

/**
 * The rocking angle of a stack at time t (positive tips it left), and the
 * base edge it rocks on. `kick` adds a decaying jiggle after a piece lands.
 */
export type Rock = { angle: number; pivot: number }

export function swayAngle(stack: Stack, t: number, kick: number, out: Rock): Rock {
  const amplitude = stack.wobble * 0.04 + kick * 0.05
  out.angle = amplitude * Math.sin(stack.omega * t + stack.lo * 1.7)
  out.pivot = out.angle > 0 ? stack.lo : stack.hi
  return out
}
