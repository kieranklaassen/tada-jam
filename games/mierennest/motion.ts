// How each creature moves when nothing is asked of it, and how it answers a poke. Pure: time in, numbers out; the
// view lays them on a sprite. No two kinds share a motion: each has its own shape, tempo, weight and funniest
// part, written as a row of its own and held apart by a test.

export type Mover = 'ant' | 'worker' | 'queen' | 'raider' | 'beetle' | 'fly' | 'dungBeetle' | 'dungFly' | 'dungBall'

/** What the view does to a sprite: which of its two poses to show, and how to shift, turn and squash it about its feet. */
export type Move = { second: boolean; dx: number; dy: number; turn: number; sx: number; sy: number }

type Idle = {
  /** The shape of the motion: what the creature is busy with. */
  shape: 'twitch' | 'mutter' | 'squirm' | 'pull' | 'rock' | 'rub' | 'polish' | 'stiff' | 'still'
  /** Seconds for one round of it. */
  period: number
  /** How far it rises or sinks, in stage units; how far it leans, in radians; how much it squashes, as a share. */
  bob: number
  lean: number
  squash: number
}

/** One row a kind. Tempo, weight and the busy part differ in every row. */
export const IDLE: Record<Mover, Idle> = {
  // Quick and light; the feelers lead, so the pose flicks and the body barely moves.
  ant: { shape: 'twitch', period: 1.7, bob: 1.2, lean: 0.02, squash: 0.012 },
  // Mutters with its shoulders: a short double shrug, then stands.
  worker: { shape: 'mutter', period: 2.9, bob: 0.8, lean: 0.035, squash: 0.045 },
  // Slow and heavy: a long breath that widens her, and a squirm now and then.
  queen: { shape: 'squirm', period: 4.6, bob: 0.6, lean: 0.015, squash: 0.06 },
  // Tugs at a stuck foot: a sharp pull up, a slow sag back.
  raider: { shape: 'pull', period: 1.3, bob: 4, lean: 0.07, squash: 0.03 },
  // On its back it rocks like a bowl, late and dignified.
  beetle: { shape: 'rock', period: 2.3, bob: 1.5, lean: 0.13, squash: 0.02 },
  // Jittery: rubs its hands very fast, stops dead, starts again.
  fly: { shape: 'rub', period: 2.1, bob: 0.7, lean: 0.025, squash: 0.015 },
  // Careful little circles of the rag, then a step back to look.
  dungBeetle: { shape: 'polish', period: 5.2, bob: 1.6, lean: 0.03, squash: 0.025 },
  // Holds still and points; now and then one stiff tap of the twig.
  dungFly: { shape: 'stiff', period: 3.4, bob: 0.3, lean: 0.01, squash: 0.01 },
  // A ball of dung does nothing.
  dungBall: { shape: 'still', period: 1, bob: 0, lean: 0, squash: 0 },
}

const wave = (x: number) => Math.sin(x * Math.PI * 2)
/** 0 to 1 and back over a part of a round, and 0 outside it. */
const bump = (u: number, from: number, to: number) => (u < from || u > to ? 0 : Math.sin(((u - from) / (to - from)) * Math.PI))

/**
 * The idle move of a kind at a time. `phase` is from 0 to 1 and sets one creature apart from another of its
 * kind, so two raider ants do not tug in step.
 */
export function idleMove(kind: Mover, seconds: number, phase = 0, out: Move = { second: false, dx: 0, dy: 0, turn: 0, sx: 1, sy: 1 }): Move {
  const row = IDLE[kind]
  const u = (((seconds / row.period + phase) % 1) + 1) % 1
  out.second = false
  out.dx = 0
  out.dy = 0
  out.turn = 0
  out.sx = 1
  out.sy = 1
  switch (row.shape) {
    case 'twitch':
      out.second = u > 0.82
      out.dy = -row.bob * bump(u, 0.8, 0.9)
      out.turn = row.lean * bump(u, 0.82, 1)
      break
    case 'mutter': {
      const shrug = bump(u, 0.1, 0.22) + bump(u, 0.26, 0.38)
      out.second = u > 0.6 && u < 0.8
      out.sy = 1 + row.squash * shrug
      out.sx = 1 - row.squash * 0.5 * shrug
      out.turn = -row.lean * shrug
      break
    }
    case 'squirm': {
      const breath = (1 - Math.cos(u * Math.PI * 2)) / 2
      out.second = u > 0.7 && u < 0.92
      out.sx = 1 + row.squash * breath
      out.sy = 1 - row.squash * 0.5 * breath
      out.turn = row.lean * wave(u * 3) * bump(u, 0.68, 0.95)
      break
    }
    case 'pull': {
      const tug = u < 0.22 ? u / 0.22 : Math.max(0, 1 - (u - 0.22) / 0.5)
      out.second = u < 0.36
      out.dy = -row.bob * tug
      out.turn = -row.lean * tug
      out.sy = 1 + row.squash * tug
      break
    }
    case 'rock':
      out.second = Math.floor(u * 6) % 2 === 1
      out.turn = row.lean * wave(u)
      out.dx = row.bob * 2 * wave(u)
      break
    case 'rub': {
      const busy = u < 0.62
      out.second = busy && Math.floor(u * row.period * 9) % 2 === 1
      out.dy = busy ? -row.bob * Math.abs(wave(u * 14)) : 0
      out.turn = busy ? row.lean * wave(u * 7) : 0
      break
    }
    case 'polish': {
      const rubbing = u < 0.7
      out.second = rubbing ? Math.floor(u * row.period * 3.2) % 2 === 1 : false
      out.dx = rubbing ? row.bob * wave(u * 16) : -6 * bump(u, 0.7, 1)
      out.dy = rubbing ? row.bob * 0.5 * wave(u * 16 + 0.25) : 0
      out.turn = rubbing ? 0 : -row.lean * bump(u, 0.72, 0.98)
      break
    }
    case 'stiff':
      out.second = u > 0.86 && u < 0.94
      out.dy = -row.bob * bump(u, 0.86, 0.94)
      break
    case 'still':
      break
  }
  return out
}

/** How long a poke's answer lasts, in seconds. */
export const POKE_SECONDS = 0.9

type Poke = { hop: number; spin: number; squash: number; hops: number }

/** How each kind answers a poke: every one jumps in its own way, by its weight. A kind has two answers and takes them in turn. */
export const POKE: Record<Mover, readonly [Poke, Poke]> = {
  ant: [{ hop: 16, spin: 0, squash: 0.2, hops: 2 }, { hop: 10, spin: 6.283, squash: 0.12, hops: 1 }],
  worker: [{ hop: 9, spin: 0, squash: 0.24, hops: 1 }, { hop: 5, spin: -0.5, squash: 0.16, hops: 3 }],
  queen: [{ hop: 3, spin: 0, squash: 0.14, hops: 1 }, { hop: 2, spin: 0.12, squash: 0.2, hops: 2 }],
  raider: [{ hop: 22, spin: 0.3, squash: 0.18, hops: 1 }, { hop: 12, spin: -0.4, squash: 0.26, hops: 2 }],
  beetle: [{ hop: 5, spin: 0.22, squash: 0.1, hops: 1 }, { hop: 7, spin: -0.3, squash: 0.08, hops: 1 }],
  fly: [{ hop: 30, spin: 0, squash: 0.1, hops: 1 }, { hop: 18, spin: 12.566, squash: 0.06, hops: 1 }],
  dungBeetle: [{ hop: 8, spin: -0.16, squash: 0.13, hops: 2 }, { hop: 12, spin: 0.2, squash: 0.1, hops: 1 }],
  dungFly: [{ hop: 14, spin: 0.08, squash: 0.05, hops: 1 }, { hop: 6, spin: -0.1, squash: 0.07, hops: 3 }],
  dungBall: [{ hop: 4, spin: 0.5, squash: 0.08, hops: 1 }, { hop: 3, spin: -0.5, squash: 0.1, hops: 1 }],
}

/**
 * The answer to a poke, `since` seconds after it: a squash as the finger lands, then the hop. Null once it is over.
 * `which` counts the pokes this creature has had, so it never gives the same answer twice running.
 */
export function pokeMove(kind: Mover, since: number, which: number, out: Move = { second: true, dx: 0, dy: 0, turn: 0, sx: 1, sy: 1 }): Move | null {
  if (since < 0 || since >= POKE_SECONDS) return null
  const poke = POKE[kind][((which % 2) + 2) % 2]
  const u = since / POKE_SECONDS
  // The first tenth is the squash under the finger; the rest is the hops, each lower than the last.
  const press = u < 0.1 ? Math.sin((u / 0.1) * Math.PI) : 0
  const v = u < 0.1 ? 0 : (u - 0.1) / 0.9
  const hopU = (v * poke.hops) % 1, hopN = Math.min(poke.hops - 1, Math.floor(v * poke.hops))
  const height = poke.hop * Math.pow(0.5, hopN) * Math.sin(hopU * Math.PI)
  const landing = v > 0 ? Math.max(0, 1 - Math.sin(hopU * Math.PI) * 4) * (1 - v) : 0
  out.second = true
  out.dx = 0
  out.dy = -height
  // A spin of a whole turn or more goes round and lands facing as it was; a smaller one tips over and comes back.
  out.turn = Math.abs(poke.spin) > 3 ? poke.spin * v : poke.spin * Math.sin(v * Math.PI)
  out.sy = 1 - poke.squash * (press + landing * 0.6)
  out.sx = 1 + poke.squash * 0.7 * (press + landing * 0.6)
  return out
}
