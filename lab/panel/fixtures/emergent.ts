// Fixture: drops that combine into new kinds on contact. There are no unlocks:
// every kind, and so every signature class, comes from what the child brings
// together. Tap open water to add a drop, tap a drop to pop it, hold a drop to
// copy it, drag one into another to combine them. Combining kinds a and b makes
// kind (a + b + 1) mod KINDS, so the same few moves reach places nobody
// scripted. Let go of a drop near another and it is pulled in. The water drifts slowly, so what changes is mostly what the child
// does. The signature names which kinds are in the water, so the classes are
// the 63 non-empty sets of kinds (bounded) and the water can be steered toward
// different ones.

import { createRng, int } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, ProtoMeta, SimEvent } from '../../kit/sim.ts'

const KINDS = 6
const MAX_DROPS = 14
// How far a drop stays from the edge of the water.
const MARGIN = 40
// How far a finger travels before a touch is a drag, not a tap or a hold.
const DRAG_DIST = 30
// Ticks a finger stays down before a release copies the drop instead of popping it.
const HOLD_TICKS = 9
export const meta: ProtoMeta = {
  key: 'emergent',
  name: 'Emergent drops',
  verb: 'combine',
  engine: 'combination',
  lens: 'other',
  ageBand: [5, 8],
  hooks: [],
  features: [{ name: 'made', objective: 'up' }],
  // Which kinds of drop are present: any non-empty set of the kinds, or none.
  signatureBound: 2 ** KINDS,
  hookAblation: { supported: false, reason: 'the fixture declares no hooks' },
}

interface Drop {
  x: number
  y: number
  vx: number
  vy: number
  kind: number
}

interface Finger {
  drop: Drop | null
  x: number
  y: number
  tick: number
  dist: number
}

const radius = (kind: number): number => 26 + 3 * kind
const keepIn = (v: number, size: number): number => Math.min(size - MARGIN, Math.max(MARGIN, v))

export const createSim: CreateSim = (config) => {
  const rng = createRng(config.seed)
  const drops: Drop[] = []
  const fingers = new Map<number, Finger>()
  let events: SimEvent[] = []
  let now = 0
  let merges = 0
  const spawn = (x: number, y: number, kind: number): void => {
    drops.push({ x, y, vx: 0, vy: 0, kind })
  }
  for (const kind of [0, 1, 2, int(rng, 0, 2)]) spawn(int(rng, 120, FIELD_W - 120), int(rng, 120, FIELD_H - 120), kind)

  const held = (drop: Drop): boolean => {
    for (const f of fingers.values()) if (f.drop === drop) return true
    return false
  }

  const mergeAll = (): void => {
    for (let guard = 0; guard < 8; guard++) {
      let merged = false
      for (let i = 0; i < drops.length && !merged; i++) {
        for (let j = i + 1; j < drops.length && !merged; j++) {
          const a = drops[i]!
          const b = drops[j]!
          if (Math.hypot(a.x - b.x, a.y - b.y) < (radius(a.kind) + radius(b.kind)) * 0.8) {
            const made: Drop = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: 0, vy: 0, kind: (a.kind + b.kind + 1) % KINDS }
            for (const f of fingers.values()) if (f.drop === a || f.drop === b) f.drop = made
            drops.splice(j, 1)
            drops.splice(i, 1)
            drops.push(made)
            merges++
            events.push({ kind: 'state', name: 'merge' })
            merged = true
          }
        }
      }
      if (!merged) return
    }
  }

  return {
    step() {
      now++
      for (const d of drops) {
        if (held(d)) continue
        d.vx = (d.vx + (rng() - 0.5) * 0.25) * 0.95
        d.vy = (d.vy + (rng() - 0.5) * 0.25) * 0.95
        d.x += d.vx
        d.y += d.vy
        if (d.x < MARGIN || d.x > FIELD_W - MARGIN) d.vx = -d.vx
        if (d.y < MARGIN || d.y > FIELD_H - MARGIN) d.vy = -d.vy
        d.x = keepIn(d.x, FIELD_W)
        d.y = keepIn(d.y, FIELD_H)
      }
      mergeAll()
    },
    pointer(input) {
      if (input.phase === 'down') {
        let hit: Drop | null = null
        for (const d of drops) {
          if (Math.hypot(d.x - input.x, d.y - input.y) <= radius(d.kind) + 10) hit = d
        }
        fingers.set(input.id, { drop: hit, x: input.x, y: input.y, tick: now, dist: 0 })
        return
      }
      const f = fingers.get(input.id)
      if (!f) return
      f.dist = Math.max(f.dist, Math.hypot(input.x - f.x, input.y - f.y))
      if (input.phase === 'move') {
        if (f.drop && f.dist >= DRAG_DIST) {
          f.drop.x = keepIn(input.x, FIELD_W)
          f.drop.y = keepIn(input.y, FIELD_H)
        }
        return
      }
      fingers.delete(input.id)
      const dragged = f.dist >= DRAG_DIST
      const target = f.drop
      if (dragged && target && drops.includes(target)) {
        // Let go near another drop and it is pulled in: small hands miss.
        let near: Drop | null = null
        let nearest = Number.POSITIVE_INFINITY
        for (const other of drops) {
          if (other === target) continue
          const gap = Math.hypot(other.x - target.x, other.y - target.y)
          if (gap < (radius(other.kind) + radius(target.kind)) * 1.6 && gap < nearest) {
            nearest = gap
            near = other
          }
        }
        if (near) {
          target.x = near.x
          target.y = near.y
        }
      }
      if (target && drops.includes(target)) {
        if (!dragged && now - f.tick >= HOLD_TICKS) {
          if (drops.length < MAX_DROPS) {
            spawn(target.x + radius(target.kind) * 2, target.y, target.kind)
            events.push({ kind: 'state', name: 'copy' })
          }
        } else if (!dragged) {
          drops.splice(drops.indexOf(target), 1)
          events.push({ kind: 'state', name: 'pop' })
        }
      } else if (!target && !dragged && drops.length < MAX_DROPS) {
        spawn(f.x, f.y, int(rng, 0, 2))
        events.push({ kind: 'state', name: 'spawn' })
      }
    },
    affordances() {
      const out: Affordance[] = drops.map((d) => {
        const r = radius(d.kind)
        return { x: d.x - r, y: d.y - r, w: r * 2, h: r * 2, kind: 'drag' as const, salience: 0.5 + 0.05 * d.kind }
      })
      out.push({ x: 0, y: 0, w: FIELD_W, h: FIELD_H, kind: 'tap', salience: 0.6 })
      return out
    },
    observe() {
      const out = events
      events = []
      let mask = 0
      for (const d of drops) mask |= 1 << d.kind
      return {
        signature: mask === 0 ? 'empty' : `s${mask}`,
        features: { made: merges },
        events: out,
      }
    },
    snapshot: () => ({ drops: drops.map((d) => ({ x: d.x, y: d.y, kind: d.kind })) }),
  }
}
