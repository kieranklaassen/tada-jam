// Fixture: an authored progression. A new button unlocks every few
// successful presses, each asking for a different gesture. The `unlock` hook is
// the progression itself: with it removed the sim never advances. The
// `sparkle` hook only decorates: it adds a faint decoy affordance and changes
// nothing about the loop.

import type { Affordance, AffordanceKind, CreateSim, ProtoMeta, SimEvent } from '../../kit/sim.ts'

const MAX_LEVEL = 63
export const meta: ProtoMeta = {
  key: 'ladder',
  name: 'Ladder',
  verb: 'press',
  engine: 'mastery',
  lens: 'other',
  ageBand: [5, 8],
  hooks: ['unlock', 'sparkle'],
  features: [{ name: 'level', objective: 'up' }],
  signatureBound: MAX_LEVEL + 1,
  hookAblation: { supported: true },
}

const KINDS: AffordanceKind[] = ['tap', 'hold', 'drag']
const SIZE = 100

function kindFor(level: number): AffordanceKind {
  return KINDS[level % 3]!
}

function need(level: number): number {
  return 2 + Math.floor(level / 32)
}

function rectFor(level: number): { x: number; y: number; w: number; h: number } {
  return { x: 60 + (level % 8) * 135, y: 40 + Math.floor(level / 8) * 90, w: SIZE - 20, h: SIZE - 20 }
}

interface Down {
  x: number
  y: number
  tick: number
  dist: number
}

export const createSim: CreateSim = (config) => {
  const unlocking = config.hooks.includes('unlock')
  const sparkling = config.hooks.includes('sparkle')
  let level = 0
  let count = 0
  let now = 0
  let events: SimEvent[] = []
  const downs = new Map<number, Down>()
  return {
    step() {
      now++
    },
    pointer(input) {
      if (input.phase === 'down') {
        downs.set(input.id, { x: input.x, y: input.y, tick: now, dist: 0 })
        return
      }
      const down = downs.get(input.id)
      if (!down) return
      down.dist = Math.max(down.dist, Math.hypot(input.x - down.x, input.y - down.y))
      if (input.phase === 'move') return
      downs.delete(input.id)
      const kind: AffordanceKind = down.dist >= 40 ? 'drag' : now - down.tick >= 9 ? 'hold' : 'tap'
      const r = rectFor(level)
      const inside = down.x >= r.x && down.x <= r.x + r.w && down.y >= r.y && down.y <= r.y + r.h
      if (!inside || kind !== kindFor(level)) return
      count++
      events.push({ kind: 'state', name: 'press' })
      if (unlocking && count >= need(level) && level < MAX_LEVEL) {
        level++
        count = 0
        events.push({ kind: 'hook', name: 'unlock' })
        events.push({ kind: 'state', name: 'unlocked' })
      }
    },
    affordances() {
      const out: Affordance[] = [{ ...rectFor(level), kind: kindFor(level), salience: 1 }]
      for (let l = Math.max(0, level - 3); l < level; l++) {
        out.push({ ...rectFor(l), kind: kindFor(l), salience: 0.15 })
      }
      if (sparkling) out.push({ x: 1090, y: 20, w: 60, h: 60, kind: 'tap', salience: 0.05 })
      return out
    },
    observe() {
      const out = events
      events = []
      return { signature: `lv${level}`, features: { level }, events: out }
    },
    snapshot: () => ({ level, count }),
  }
}
