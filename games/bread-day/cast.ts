// The customers' motion. castClips.ts says what each animal does, as
// keyframes; this plays it: who is on stage, each one's idle life (its want,
// always on show), its reaction to the exact thing it is handed, the plain
// beats of an ending, and where the thing is while a clip holds it. Like
// motion.ts it only gives numbers for whole sprites. Pure: time arrives
// through `step`, and chance comes from the seed.

import type { Occasion } from './consequence'
import { HIT, LEDGE, ROLES, type Clip, type Direction, type Held, type Hold, type Key, type Part, type Role } from './castClips'
import type { Pose } from './motion'
import { FIGURES_OF, type Figure } from './stage'
import { ANIMALS, type Animal } from './tastes'

export type { Direction, Held } from './castClips'

/** No pose of the cast ever leaves these: the furthest slide, the furthest turn, the smallest and the largest scale. */
export const LIMITS = { slide: 60, turn: 0.35, small: 0.75, big: 1.3 } as const
/** The names of each animal's poke answers. */
export const POKES = {} as Record<Animal, readonly string[]>
for (const animal of ANIMALS) POKES[animal] = ROLES[animal].pokes.map((poke) => poke.name)

/** Every motion is advanced in steps of this many seconds, so the length of a frame changes nothing. */
const STEP = 1 / 120
const LONGEST = 60
/** How long one thing takes to give way to the next: a clip cut in on, idle life making room for a reaction. */
const FADE = 0.15
const NEVER = 1e12
const CHANNELS = ['dx', 'dy', 'turn', 'sx', 'sy'] as const
const REST: Pose = { dx: 0, dy: 0, turn: 0, sx: 1, sy: 1, frame: 0 }

const ramp = (t: number, a: number, b: number) => { const x = t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a); return x * x * (3 - 2 * x) }

/** A track at `t`: from rest at the start, through its keys, and back to rest by the end unless it `stays` or its last key is at the end. */
function value(keys: readonly Key[] | undefined, t: number, length: number, rest: number, stays = false): number {
  if (!keys) return rest
  let at = 0, from = rest
  for (const [next, to, ease] of keys) {
    if (t < next) { const x = (t - at) / (next - at); return from + (to - from) * (ease === HIT ? x * x : x * x * (3 - 2 * x)) }
    at = next; from = to
  }
  return stays || at >= length ? from : from + (rest - from) * ramp(t, at, length)
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), state | 1)
    return (((mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)) ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

/** A clip being played: when it began, when something cut in on it, which of its voices have been heard (and in which turn of a loop), and where the thing was when it took over. */
type Run = { clip: Clip; at: number; fade: number; said: number; cycle: number; from: Held | null }
/**
 * One animal. `idle` are its habits in play, `acts` its reactions and directions (the last is the one in charge, any
 * before it are giving way), `pokes` its answers to a finger. `idleness` is how much of its idle life shows, 0 to 1.
 * `chance` times the habits and `pick` chooses poke answers: two streams, so a poke never shifts anyone's idle life.
 */
type Player = { role: Role; on: boolean; since: number; idle: Run[]; acts: Run[]; pokes: Run[]; next: number[]; idleness: number; chance: () => number; pick: () => number; last: number }

const run = (clip: Clip, at: number, from: Held | null = null): Run => ({ clip, at, fade: NEVER, said: 0, cycle: 0, from })
/** Where a run is in its clip: a loop goes round, anything else stops at its end. */
const timeIn = (of: Run, now: number): number => { const t = now - of.at; return of.clip.loop ? t - Math.floor(t / of.clip.length) * of.clip.length : t }
const over = (of: Run, now: number): boolean => now >= of.fade + FADE || (!of.clip.loop && !of.clip.stays && now >= of.at + of.clip.length)
const prune = (list: Run[], now: number) => { for (let i = list.length - 1; i >= 0; i--) if (over(list[i], now)) list.splice(i, 1) }
/** The run in charge of an animal, if any: the newest, unless it too has been let go of. */
const leading = (player: Player): Run | null => { const last = player.acts[player.acts.length - 1]; return last && last.fade === NEVER ? last : null }

/** Adds one figure's part of a run to a pose, as much of it as `weight` says. Scales are sums about 0 here. */
function add(p: Pose, of: Run, part: Part | undefined, now: number, weight: number): void {
  const t = timeIn(of, now), length = of.clip.length
  if (!part || weight <= 0 || t < 0 || t >= length) return
  for (const channel of CHANNELS) if (part[channel]) p[channel] += (value(part[channel], t, length, REST[channel]) - REST[channel]) * weight
  if (weight === 1 && part.open) for (const [from, to] of part.open) if (t >= from && t < to) p.frame = 1
}

const OWNER = {} as Record<Figure, readonly [Animal, number]>
for (const animal of ANIMALS) FIGURES_OF[animal].forEach((figure, i) => { OWNER[figure] = [animal, i] })

export class Cast {
  private ticks = 0
  private left = 0
  private readonly players = {} as Record<Animal, Player>
  private heard: string[] = []

  constructor(seed: number) {
    ANIMALS.forEach((animal, i) => {
      const chance = mulberry32(seed ^ Math.imul(2 * i + 1, 0x9e3779b1)), pick = mulberry32(seed ^ Math.imul(2 * i + 2, 0x85ebca6b))
      this.players[animal] = { role: ROLES[animal], on: false, since: 0, idle: [], acts: [], pokes: [], next: [], idleness: 1, chance, pick, last: -1 }
    })
  }

  private get now(): number { return this.ticks * STEP }

  /** Advance by attended seconds. Fixed internal steps, so a long frame and many short ones agree. */
  step(seconds: number): void {
    if (!(seconds > 0)) return
    this.left += Math.min(seconds, LONGEST)
    // A hair of slack, so sixty steps of a sixtieth come to the same ticks as one step of a second.
    for (let n = Math.floor(this.left / STEP + 1e-6); n > 0; n--) { this.left -= STEP; this.tick() }
  }

  private tick(): void {
    const now = ++this.ticks * STEP
    for (const animal of ANIMALS) {
      const player = this.players[animal], habits = player.role.habits
      if (!player.on) continue
      prune(player.idle, now); prune(player.acts, now); prune(player.pokes, now)
      const free = player.acts.length === 0
      for (let i = 0; i < habits.length; i++) {
        // A habit never starts in the middle of a reaction, nor on the instant one ends: it waits its turn.
        if (!free) { player.next[i] = Math.max(player.next[i], now + 0.6 + 0.25 * i); continue }
        if (now < player.next[i]) continue
        const { clips, every } = habits[i]
        player.idle.push(run(clips[Math.floor(player.chance() * clips.length)], now))
        player.next[i] = now + every[0] + (every[1] - every[0]) * player.chance()
      }
      player.idleness = free ? Math.min(1, player.idleness + STEP / FADE) : Math.max(0, player.idleness - STEP / FADE)
      if (free) for (const each of player.idle) this.speak(each, now)
      for (const each of player.acts) if (each.fade === NEVER) this.speak(each, now)
      for (const each of player.pokes) if (each.fade === NEVER) this.speak(each, now)
    }
  }

  /** Lets a run's voices be heard as their moments come; a loop says them again each time round. */
  private speak(of: Run, now: number): void {
    const { voices, length, loop } = of.clip
    let t = now - of.at + 1e-9
    if (loop) {
      const cycle = Math.floor(t / length)
      if (cycle > of.cycle) { of.cycle = cycle; of.said = 0 }
      t -= cycle * length
    }
    while (of.said < voices.length && voices[of.said][0] <= t) this.heard.push(voices[of.said++][1])
  }

  /** Who is on stage (at the hatch or in the lane). Only they live, move and sound. The same set again changes nothing. */
  setStage(animals: readonly Animal[]): void {
    for (const animal of ANIMALS) {
      const player = this.players[animal], on = animals.includes(animal)
      if (on === player.on) continue
      player.on = on; player.since = this.now; player.idle = []; player.acts = []; player.pokes = []; player.idleness = 1
      player.next = player.role.habits.map((each) => this.now + each.first * (0.75 + 0.5 * player.chance()))
    }
  }

  private start(animal: Animal, clip: Clip): number {
    const player = this.players[animal], now = this.now
    if (!player.on) return 0
    const taking = run(clip, now, this.holds(animal))
    // Whatever it was doing gives way as the new thing starts, so two clips never pile up.
    for (const old of player.acts) old.fade = Math.min(old.fade, now)
    player.acts.push(taking)
    this.speak(taking, now)
    return clip.loop ? Infinity : clip.length
  }

  /** The animal's own reaction to an occasion. Returns its length in seconds. An occasion it has no name for is played as an empty peel. */
  react(animal: Animal, occasion: Occasion): number {
    const reactions = this.players[animal].role.reactions
    return this.start(animal, reactions[occasion] ?? reactions.nothing!)
  }

  /** A stage direction. Returns its length in seconds; 'walk' and 'carry' return Infinity and loop until `rest` or the next thing. */
  direct(animal: Animal, what: Direction): number { return this.start(animal, this.players[animal].role.directions[what]) }

  /** Back to its idle routine: whatever it was doing is let go of, and so is the thing. */
  rest(animal: Animal): void { for (const old of this.players[animal].acts) old.fade = Math.min(old.fade, this.now) }

  /** The child's finger landed on it: a small answer, a different variant than last time. It plays over whatever else the animal is doing. */
  poke(animal: Animal): string {
    const player = this.players[animal], pokes = player.role.pokes
    // Never the one just played: the draw is among the others.
    let i = Math.floor(player.pick() * (player.last < 0 ? pokes.length : pokes.length - 1))
    if (player.last >= 0 && i >= player.last) i++
    player.last = i
    if (player.on) {
      for (const old of player.pokes) old.fade = Math.min(old.fade, this.now)
      player.pokes.push(run(pokes[i], this.now))
      this.speak(player.pokes[player.pokes.length - 1], this.now)
    }
    return pokes[i].name
  }

  pose(figure: Figure): Readonly<Pose> {
    const [animal, index] = OWNER[figure], player = this.players[animal], now = this.now
    if (!player.on) return { ...REST }
    const p: Pose = { dx: 0, dy: 0, turn: 0, sx: 0, sy: 0, frame: 0 }, idleness = ramp(player.idleness, 0, 1)
    if (idleness > 0) {
      // Idle life gives way to a reaction as a whole, and comes back as a whole.
      const idle: Pose = { dx: 0, dy: 0, turn: 0, sx: 0, sy: 0, frame: 0 }
      player.role.rest?.(now - player.since, index, idle)
      for (const each of player.idle) add(idle, each, each.clip.figures[index], now, 1)
      for (const channel of CHANNELS) p[channel] += idle[channel] * idleness
      if (idleness === 1) p.frame = idle.frame
    }
    for (const list of [player.acts, player.pokes]) for (const each of list) add(p, each, each.clip.figures[index], now, 1 - ramp(now, each.fade, each.fade + FADE))
    const { slide, turn, small, big } = LIMITS, cap = (v: number, low: number, high: number) => (v < low ? low : v > high ? high : v)
    return { dx: cap(p.dx, -slide, slide), dy: cap(p.dy, -slide, slide), turn: cap(p.turn, -turn, turn), sx: cap(1 + p.sx, small, big), sy: cap(1 + p.sy, small, big), frame: p.frame }
  }

  /** Where the thing is, while the animal's clip holds it; null when nothing is held. A thing taken over from another clip crosses to its new place. */
  holds(animal: Animal): Readonly<Held> | null {
    const of = leading(this.players[animal]), track: Hold | undefined = of?.clip.held
    if (!of || !track) return null
    const { length, stays } = of.clip, t = of.clip.loop ? timeIn(of, this.now) : Math.min(this.now - of.at, length)
    const read = (keys: readonly Key[] | undefined, rest: number) => value(keys, t, length, rest, stays)
    const held: Held = { u: read(track.u, LEDGE.u), v: read(track.v, LEDGE.v), turn: read(track.turn, LEDGE.turn), scale: read(track.scale, LEDGE.scale) }
    const taken = ramp(this.now, of.at, of.at + FADE), from = of.from
    if (from && taken < 1) for (const key of ['u', 'v', 'turn', 'scale'] as const) held[key] = from[key] + (held[key] - from[key]) * taken
    return held
  }

  /** Sound cues that became due since the last call, in order, each a name for the game to give a voice. Drains. */
  sounds(): string[] { const due = this.heard; this.heard = []; return due }

  /** True while the animal is in a reaction or a direction. A wanted thing still held after its clip is not being busy. */
  busy(animal: Animal): boolean {
    const of = leading(this.players[animal])
    return of !== null && (of.clip.loop === true || this.now < of.at + of.clip.length)
  }

  /** True when no one is in a reaction, a direction or an answer to a poke (idle routines may still run). */
  get calm(): boolean { return ANIMALS.every((animal) => !this.busy(animal) && this.players[animal].pokes.length === 0) }
}
