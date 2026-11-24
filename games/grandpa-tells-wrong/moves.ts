import { bump, clamp, ease, jolt, lerp, span } from './draw'
import { restPose, type Pose } from './figures'
import type { Thing, Who, Worn } from './tale'

// How each of them holds themselves, as numbers. Nobody shares a move: each
// has a tempo, a weight and a funniest part, and an answer of their own to
// every thing.

/** Seconds a happening takes, and when the thing lands within it. */
export const ACT = 1.75
export const HIT = 0.32

export type Stance = {
  who: Who
  worn: Worn
  t: number
  /** Night: everyone is asleep. */
  asleep: boolean
  /** It is this one's turn at the front. */
  asking: boolean
  /** Where to look, -1 to 1, or null for its own business. */
  look: { x: number; y: number } | null
  /** A thing hangs over this one. */
  under: Thing | null
  /** Seconds since a poke. */
  poked: number
  /** Seconds into protesting that it was not so, or a large number. */
  protest: number
  /** Seconds into staring at Grandpa, or a large number. */
  stare: number
}

/** Each one's own breathing: tempo and how far. */
const BREATH: Record<Who, { rate: number; deep: number }> = {
  goose: { rate: 1.1, deep: 0.012 },
  pig: { rate: 2.6, deep: 0.026 },
  granny: { rate: 0.9, deep: 0.006 },
  grandpa: { rate: 0.75, deep: 0.022 },
  moon: { rate: 0.5, deep: 0.01 },
}
const SEED: Record<Who, number> = { goose: 0.3, pig: 2.1, granny: 3.9, grandpa: 5.2, moon: 7.4 }

/** Things each would rather not have over them. */
const DISLIKES: Record<Who, readonly Thing[]> = {
  goose: ['mud', 'water', 'balloon'],
  pig: ['water'],
  granny: ['mud', 'pants'],
  grandpa: [],
  moon: ['mud'],
}

export function idlePose(stance: Stance): Pose {
  const pose = restPose(), { who, t } = stance
  const { rate, deep } = BREATH[who], b = Math.sin(t * rate * 2 + SEED[who])
  pose.sy = 1 + b * deep
  pose.sx = 1 - b * deep * 0.6
  // A blink now and then, in its own rhythm.
  const blink = (t * (0.23 + SEED[who] * 0.013) + SEED[who]) % 1
  pose.eyes = blink > 0.965 ? 0.1 : 1
  const wander = Math.sin(t * 0.6 + SEED[who] * 2)
  pose.look = stance.look ?? { x: wander * 0.7, y: 0.2 * Math.sin(t * 0.43 + SEED[who]) }
  switch (who) {
    case 'goose':
      pose.quirk = 0.35 + 0.18 * Math.sin(t * 0.9) + (stance.asking ? 0.35 + 0.2 * bump((t * 0.7) % 1) : 0)
      pose.brow = -0.2
      if (stance.asking) pose.turn = 0.03 * Math.sin(t * 1.4)
      break
    case 'pig':
      pose.quirk = 0.15 * Math.sin(t * 3.1)
      pose.mouth = 'smile'
      if (stance.asking) {
        pose.y = -18 * bump((t * 1.3) % 1 < 0.4 ? ((t * 1.3) % 1) / 0.4 : 0)
        pose.turn = 0.05 * Math.sin(t * 2.6)
      }
      break
    case 'granny':
      pose.quirk = 0
      pose.brow = stance.asking ? 0.3 + 0.5 * bump(span((t * 0.45) % 1, 0.5, 0.8)) : -0.1
      pose.turn = 0.01 * Math.sin(t * 0.7)
      break
    case 'grandpa':
      pose.quirk = 0.1 * Math.sin(t * 1.5)
      pose.mouth = 'shut'
      break
    case 'moon':
      pose.eyes = 0.55
      pose.look = stance.look ?? { x: 0.8, y: -0.5 }
      pose.y = Math.sin(t * 0.5) * 3
      break
  }
  if (stance.worn.up) {
    pose.kick = (t * (who === 'goose' ? 0.5 : who === 'pig' ? 1.3 : 0.8)) % 1
    pose.y += Math.sin(t * 1.3 + SEED[who]) * 7
    pose.turn += 0.05 * Math.sin(t * 0.9 + SEED[who])
  }
  if (stance.under) {
    const away = DISLIKES[who].includes(stance.under) ? 1 : -1
    pose.sy *= 1 - 0.07 * away
    pose.sx *= 1 + 0.06 * away
    pose.brow = away > 0 ? -0.6 : 1
    pose.eyes = 1.15
    pose.mouth = away > 0 ? 'grit' : 'smile'
    if (who === 'goose') pose.quirk = away > 0 ? -0.3 : 1
  }
  if (stance.poked < 0.9) poke(pose, who, stance.poked)
  if (stance.protest < PROTEST) protest(pose, who, stance.protest)
  if (stance.stare < 1.6) {
    pose.look = { x: who === 'grandpa' ? -0.6 : 1, y: who === 'moon' ? 0.9 : -0.1 }
    pose.eyes = 1.25
    pose.brow = 1
    if (who === 'pig' || who === 'moon') pose.mouth = 'round'
  }
  if (stance.asleep) {
    pose.eyes = 0.05
    pose.brow = 0
    pose.mouth = 'shut'
    pose.look = { x: 0, y: 0.3 }
    const snore = 0.5 + 0.5 * Math.sin(t * rate * 1.5 + SEED[who])
    if (who === 'goose') pose.quirk = -0.72 + 0.1 * snore
    if (who === 'pig') pose.quirk = snore
    if (who === 'granny') pose.turn = 0.07 * snore
    if (who === 'grandpa') pose.quirk = snore - 0.45
    if (who === 'moon') pose.eyes = 0.35
    pose.sy = 1 + (snore - 0.5) * 0.05
    if (stance.poked < 0.9) pose.turn += 0.12 * jolt(stance.poked, 9, 3)
  }
  return pose
}

/** How long one protest is. */
export const PROTEST = 1.3

/** It was not so: each has their own way to say it, at Grandpa and then at the child. */
function protest(pose: Pose, who: Who, t: number): void {
  const k = bump(t / PROTEST)
  pose.look = t < PROTEST * 0.6 ? { x: 1, y: -0.4 } : { x: 0, y: 0.1 }
  pose.eyes = 1.2
  pose.brow = -1
  switch (who) {
    case 'goose': pose.quirk = 1.3 * k; pose.turn += 0.1 * Math.sin(t * 13) * k; pose.mouth = 'open'; break
    case 'pig': pose.y -= 46 * Math.abs(Math.sin((t / PROTEST) * Math.PI * 3)); pose.sx += 0.06 * Math.sin(t * 20); pose.mouth = 'open'; break
    case 'granny': pose.x += 13 * Math.sin(t * 15) * k; pose.turn += 0.05 * Math.sin(t * 15) * k; pose.mouth = 'grit'; break
  }
}

function poke(pose: Pose, who: Who, t: number): void {
  const k = bump(t / 0.9), j = jolt(t, 26, 5)
  pose.look = { x: 0, y: 0.1 }
  switch (who) {
    case 'goose': pose.quirk = 1.1 * k; pose.mouth = 'open'; pose.brow = -1; break
    case 'pig': pose.sx += 0.16 * j; pose.sy -= 0.16 * j; pose.mouth = 'open'; break
    case 'granny': pose.brow = 1 - 1.4 * k; pose.quirk = 0.6 * j; break
    case 'grandpa': pose.quirk = 1.1 * j; pose.sy += 0.03 * j; break
    case 'moon': pose.quirk = k; pose.y += 10 * j; break
  }
}

/** A happening at `t` seconds into it, over what the stance would be. */
export function actPose(stance: Stance, what: Thing, t: number, lie: boolean): Pose {
  const pose = idlePose({ ...stance, asking: false, under: null, poked: 9, stare: 9, protest: 99, asleep: false })
  const { who } = stance
  if (t < HIT) {
    // They see it coming, some sooner than others.
    const k = ease(t / HIT)
    pose.look = { x: 0, y: -1 }
    pose.eyes = 1 + 0.2 * k
    pose.sy *= 1 - 0.06 * k
    pose.sx *= 1 + 0.04 * k
    pose.brow = k
    return pose
  }
  const s = t - HIT, k = clamp(s / (ACT - HIT)), j = jolt(s, 22, 4.5)
  pose.coated = ease(s / 0.8)
  pose.eyes = 1
  pose.look = { x: 0, y: 0 }
  const squash = (much: number) => { pose.sy *= 1 - much * Math.max(0, Math.cos(s * 14)) * Math.exp(-s * 5); pose.sx *= 1 + much * 0.8 * Math.max(0, Math.cos(s * 14)) * Math.exp(-s * 5) }
  switch (who) {
    case 'goose': goose(pose, what, s, k, j, squash); break
    case 'pig': pig(pose, what, s, k, j, squash); break
    case 'granny': granny(pose, what, s, k, j, squash); break
    case 'grandpa': grandpa(pose, what, s, k, j, squash); break
    case 'moon': moon(pose, what, s, k, j, squash); break
  }
  if (lie && s > 0.5) {
    // That was never me.
    pose.brow = 1
    pose.eyes = 1.3
  }
  return pose
}

type Do = (pose: Pose, what: Thing, s: number, k: number, j: number, squash: (much: number) => void) => void

const goose: Do = (pose, what, s, k, j, squash) => {
  switch (what) {
    case 'mud': squash(0.16); pose.quirk = 1; pose.eyes = 1.3; pose.brow = -1; pose.mouth = s > 0.5 ? 'open' : 'shut'; pose.x = s > 0.5 ? Math.sin(s * 60) * 3 * (1 - k) : 0; break
    case 'water': pose.eyes = 0.1; pose.quirk = 0.3 + 0.7 * Math.sin(s * 26) * (1 - k); pose.turn = Math.sin(s * 30) * 0.08 * (1 - k); pose.mouth = 'open'; break
    case 'jam': squash(0.08); pose.quirk = 0.9; pose.mouth = 'shut'; pose.look = { x: 0.9, y: 0.8 }; pose.eyes = 1.15; pose.turn = Math.sin(s * 8) * 0.05 * (1 - k); break
    case 'pillow': pose.quirk = -0.5 * Math.exp(-s * 4) + 0.3; pose.sx = 1 + 0.22 * bump(k); pose.sy = 1 + 0.12 * bump(k); pose.eyes = 1.3; pose.mouth = 'round'; pose.x = 26 * Math.exp(-s * 4); break
    case 'pants': pose.quirk = lerp(0.2, 1, ease(k * 2)); pose.brow = 0.4; pose.eyes = 0.6; pose.turn = -0.08 * ease(k * 2) * (1 - span(k, 0.8, 1)); pose.x = Math.sin(s * 4) * 14 * (1 - k); pose.mouth = s > 0.7 ? 'smile' : 'shut'; break
    case 'balloon': pose.quirk = -0.85 * ease(s * 1.6); pose.kick = (s * 1.6) % 1; pose.eyes = 1.2; pose.brow = 1; pose.mouth = 'round'; pose.turn = 0.12 * j; break
  }
}

const pig: Do = (pose, what, s, k, j, squash) => {
  switch (what) {
    case 'mud': squash(0.24); pose.mouth = 'smile'; pose.eyes = 0.35; pose.turn = Math.sin(s * 16) * 0.16 * (1 - k); pose.quirk = Math.sin(s * 16); break
    case 'water': pose.quirk = 1.5 * (1 - span(k, 0.6, 1)); pose.eyes = 0.1; pose.sy *= 1 - 0.14 * bump(k); pose.brow = -1; pose.mouth = 'grit'; pose.x = -18 * bump(k); break
    case 'jam': pose.turn = Math.sin(s * 5.5) * 0.2 * (1 - k * 0.6); pose.mouth = Math.sin(s * 22) > 0 ? 'open' : 'smile'; pose.eyes = 0.5; pose.look = { x: Math.sin(s * 5.5), y: -0.6 }; break
    case 'pillow': pose.eyes = s < 0.55 ? 0.1 : 1.2; pose.mouth = 'open'; pose.x = -46 * bump(span(s, 0.5, 1.2)); pose.turn = -0.2 * bump(span(s, 0.5, 1.1)); squash(0.14); break
    case 'pants': pose.x = Math.sin(s * 11) * 30 * (1 - k); pose.kick = (s * 3) % 1; pose.y = -10 * Math.abs(Math.sin(s * 22)) * (1 - k); pose.mouth = 'open'; pose.eyes = 0.2; break
    case 'balloon': pose.turn = Math.PI * 2 * ease(k * 1.1) * (k < 1 ? 1 : 0) + 0.1 * j; pose.mouth = 'open'; pose.kick = (s * 2.4) % 1; pose.eyes = 1.15; if (pose.turn > 6.28) pose.turn = 0; break
  }
}

const granny: Do = (pose, what, s, k, j, squash) => {
  switch (what) {
    case 'mud': squash(0.06); pose.brow = -1; pose.eyes = s > 0.9 ? 0.45 : 1; pose.look = { x: 0, y: 0 }; break
    case 'water': pose.quirk = Math.sin(s * 34) * (1 - k); pose.eyes = 0.15; pose.mouth = 'round'; break
    case 'jam': pose.look = { x: s > 0.5 ? 0.8 : 0, y: 0.6 }; pose.brow = s > 0.8 ? 0.8 : -0.5; pose.mouth = s > 0.9 ? 'smile' : 'shut'; pose.turn = 0.06 * ease(span(s, 0.6, 1)) * (1 - span(k, 0.9, 1)); break
    case 'pillow': pose.turn = 0.24 * Math.exp(-s * 3) ; pose.quirk = j * 1.4; pose.mouth = s > 0.7 && s < 1 ? 'round' : 'shut'; pose.brow = -0.8; break
    case 'pants': squash(0.1); pose.brow = -1; pose.eyes = 0.5; pose.x = 3 * Math.sin(s * 40) * (1 - k); break
    case 'balloon': pose.kick = (s * 2) % 1; pose.mouth = s > 0.4 ? 'open' : 'shut'; pose.brow = 1; pose.eyes = 1.2; pose.turn = 0.1 * Math.sin(s * 7) * (1 - k * 0.5); break
  }
}

const grandpa: Do = (pose, what, s, k, j, squash) => {
  switch (what) {
    case 'mud': squash(0.1); pose.quirk = -0.7; pose.eyes = 1.25; pose.mouth = 'grit'; break
    case 'water': pose.quirk = -1 + 0.4 * Math.sin(s * 40) * (1 - k); pose.eyes = 0.1; pose.turn = 0.03 * Math.sin(s * 44) * (1 - k); pose.mouth = 'round'; break
    case 'jam': pose.quirk = -0.9 + 0.5 * Math.abs(Math.sin(s * 8)) * (1 - k); pose.look = { x: 0, y: 1 }; pose.mouth = 'grit'; break
    case 'pillow': pose.turn = -0.1 * Math.exp(-s * 3); pose.quirk = j * 1.3; pose.eyes = 1.3; pose.mouth = 'open'; pose.y = -16 * Math.abs(Math.sin(s * 9)) * (1 - k); break
    case 'pants': pose.eyes = 0.3; pose.quirk = 0.6; pose.sy *= 1 + 0.06 * ease(s * 3) * (1 - span(k, 0.8, 1)); pose.brow = 0.4; break
    case 'balloon': pose.quirk = 1; pose.mouth = 'open'; pose.eyes = 1.3; pose.brow = 1; pose.turn = 0.07 * Math.sin(s * 6) * (1 - k); break
  }
}

const moon: Do = (pose, what, s, k, j, squash) => {
  switch (what) {
    case 'mud': squash(0.14); pose.eyes = s % 0.5 < 0.25 ? 0.2 : 1; pose.brow = -1; pose.mouth = 'grit'; break
    case 'water': pose.x = 4 * Math.sin(s * 42) * (1 - k); pose.eyes = 0.2; pose.mouth = 'round'; break
    case 'jam': pose.mouth = Math.sin(s * 12) > 0 ? 'open' : 'smile'; pose.eyes = 0.6; pose.look = { x: 0, y: 0.8 }; break
    case 'pillow': pose.x = 22 * Math.exp(-s * 3); pose.turn = 0.3 * j; pose.eyes = 1.3; pose.mouth = 'round'; break
    case 'pants': pose.quirk = 1; pose.eyes = 1.2; pose.look = { x: 0, y: -1 }; pose.brow = 1; pose.mouth = 'grit'; break
    case 'balloon': pose.y = -8 * Math.sin(s * 8) * (1 - k); pose.mouth = 'smile'; pose.eyes = 1; pose.brow = 0.6; break
  }
}
