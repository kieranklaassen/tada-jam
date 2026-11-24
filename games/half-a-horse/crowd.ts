import { animalOf, partOf, type End } from './ends'
import type { Routine } from './routines'

// The four who watch. Each has a taste that never changes, believes to its own
// measure, and moves like itself. Pure numbers; the view maps them onto cloth.

export const WATCHERS = ['farmer', 'cow', 'hen', 'pig'] as const
export type Watcher = (typeof WATCHERS)[number]

export type Beast = { front: End; rear: End; gap: number; lift: number; sit: boolean; tied: boolean; asleep: boolean }

/** How strange the animal looks, 0 for an animal that could be one, up to 1 and over. */
export function strangeness(b: Beast): number {
  if (b.asleep) return 0
  const gap = Math.max(0, (Math.abs(b.gap) - 400) / 300) + Math.max(0, (170 - Math.abs(b.gap)) / 260)
  const lift = Math.max(0, (Math.abs(b.lift) - 30) / 190)
  return gap + lift + (b.sit ? 0.5 : 0) + (b.tied ? 0.65 : 0) + (partOf(b.front) === partOf(b.rear) ? 0.4 : 0)
}

/** Where each stops believing, and by how much more it gapes fully. */
const DOUBTS: Record<Watcher, { from: number; over: number; speed: number }> = {
  farmer: { from: 0.45, over: 0.5, speed: 3.2 },
  cow: { from: 0.75, over: 0.5, speed: 1.7 },
  hen: { from: 0.1, over: 0.7, speed: 8 },
  pig: { from: 0.05, over: 0.8, speed: 5 },
}

export function wants(who: Watcher, b: Beast): number {
  const front = animalOf(b.front), rear = animalOf(b.rear)
  switch (who) {
    case 'farmer': return (front === 'horse' ? 0.5 : 0) + (rear === 'horse' ? 0.5 : 0)
    case 'cow': return b.tied ? 1 : 0
    case 'hen': return Math.max(front === 'hen' ? 1 : 0, rear === 'hen' ? 1 : 0)
    case 'pig': return 0
  }
}

export type React = 'jump' | 'shake' | 'laugh' | 'roll' | 'blown' | 'sneeze' | 'hop' | 'skip' | 'poke' | 'wave' | 'catch' | 'flat' | 'buttons' | 'hatless' | 'egg' | 'fed' | 'snip' | 'rattle' | 'pluck' | 'hum' | 'mumble' | 'throw' | 'lean'
const LASTS: Record<React, number> = { jump: 0.7, shake: 1, laugh: 1.6, roll: 2.2, blown: 1.4, sneeze: 1.5, hop: 0.6, skip: 0.9, poke: 0.9, wave: 1.4, catch: 1.2, flat: 1.9, buttons: 1.8, hatless: 2.4, egg: 1.6, fed: 2, snip: 1.7, rattle: 1.6, pluck: 1.2, hum: 1.6, mumble: 1.4, throw: 0.9, lean: 0.5 }
export const REACTS = Object.keys(LASTS) as React[]

/** What a routine does to each of them. */
const TO_ROUTINE: Record<Routine, Partial<Record<Watcher, React>>> = {
  trot: { farmer: 'wave', pig: 'hop' },
  leap: { pig: 'roll', hen: 'jump', cow: 'hop', farmer: 'jump' },
  twang: { farmer: 'shake', cow: 'shake', hen: 'shake', pig: 'laugh' },
  bow: { cow: 'wave', hen: 'jump' },
  seesaw: { cow: 'shake', pig: 'laugh' },
  tower: { cow: 'jump', pig: 'hop', hen: 'shake' },
  squash: { pig: 'roll', hen: 'shake', farmer: 'sneeze', cow: 'hop' },
  skip: { hen: 'skip', pig: 'hop' },
}

export type WatcherState = { doubt: number; doubtV: number; like: number; react: React | null; t: number; phase: number }

export type Look = {
  /** 0 to 1 gaping, and 0 to 1 pleased. */
  doubt: number; like: number
  lift: number; tilt: number; squash: number
  /** The funniest part of each: the farmer's hat, the cow's jaw, the hen's neck, the pig's belly. */
  part: number
  mouth: number
  blink: number
}

export class Crowd {
  readonly states: Record<Watcher, WatcherState>
  private now = 0
  private blinks: Record<Watcher, number> = { farmer: 2, cow: 4.6, hen: 1.1, pig: 3 }
  private readonly chance: () => number

  constructor(chance: () => number) {
    this.chance = chance
    const one = (phase: number): WatcherState => ({ doubt: 0, doubtV: 0, like: 0, react: null, t: 0, phase })
    this.states = { farmer: one(0), cow: one(1.9), hen: one(0.7), pig: one(3.1) }
  }

  react(who: Watcher, react: React): void {
    const state = this.states[who]
    state.react = react
    state.t = 0
  }

  routine(routine: Routine): void {
    const to = TO_ROUTINE[routine]
    for (const who of WATCHERS) { const react = to[who]; if (react) this.react(who, react) }
  }

  busy(who: Watcher): boolean {
    return this.states[who].react !== null
  }

  step(dt: number, beast: Beast): void {
    this.now += dt
    const strange = strangeness(beast)
    for (const who of WATCHERS) {
      const state = this.states[who], taste = DOUBTS[who]
      const target = Math.max(0, Math.min(1, (strange - taste.from) / taste.over))
      // A spring with a little overshoot, each at its own pace.
      const k = taste.speed * taste.speed * 4
      state.doubtV += ((target - state.doubt) * k - state.doubtV * taste.speed * 2.6) * dt
      state.doubt = Math.max(-0.1, Math.min(1.2, state.doubt + state.doubtV * dt))
      state.like += (wants(who, beast) * (1 - Math.max(0, Math.min(1, state.doubt)) * (who === 'farmer' ? 1 : 0.3)) - state.like) * Math.min(1, dt * 3)
      if (state.react) {
        state.t += dt / LASTS[state.react]
        if (state.t >= 1) { state.react = null; state.t = 0 }
      }
      this.blinks[who] -= dt
      if (this.blinks[who] < -BLINK[who]) this.blinks[who] = 1.6 + this.chance() * (who === 'cow' ? 6 : who === 'hen' ? 2 : 4)
    }
  }

  look(who: Watcher, out: Look): Look {
    const { doubt: d, like, react, t, phase } = this.states[who]
    const now = this.now + phase
    const doubt = Math.max(0, d)
    out.doubt = Math.min(1, doubt)
    out.like = like
    out.mouth = doubt
    out.blink = this.blinks[who] < 0 ? 1 : 0
    out.lift = out.tilt = out.squash = out.part = 0
    const hump = Math.sin(Math.min(1, t) * Math.PI), fade = 1 - t
    switch (who) {
      case 'farmer':
        out.squash = Math.sin(now * 1.5) * 0.008
        out.tilt = -0.05 * doubt + Math.sin(now * 0.8) * 0.012 + like * Math.sin(now * 5) * 0.015
        out.part = doubt * 46
        break
      case 'cow':
        // She chews. Doubt stops her jaw off to one side.
        out.part = (1 - out.doubt) * Math.sin(now * 2.3) + out.doubt * 1.6
        out.mouth = 0.18 * Math.max(0, Math.cos(now * 4.6)) * (1 - out.doubt)
        out.tilt = Math.sin(now * 0.55) * 0.02 + out.doubt * 0.1
        out.lift = -doubt * 6
        break
      case 'hen':
        out.part = doubt + (like > 0.5 ? 0.12 * Math.abs(Math.sin(now * 7)) : 0)
        out.tilt = (Math.sin(now * 3.1) > 0.86 ? 0.14 : 0) + like * Math.sin(now * 6) * 0.07
        out.squash = like * 0.05 * Math.sin(now * 12)
        break
      case 'pig':
        out.squash = Math.sin(now * 2) * 0.015 + doubt * 0.05 * Math.sin(now * 15)
        out.part = doubt
        out.mouth = doubt * (0.55 + 0.45 * Math.abs(Math.sin(now * 9)))
        break
    }
    if (react) {
      switch (react) {
        case 'jump': out.lift += hump * (who === 'cow' ? 14 : who === 'hen' ? 70 : 36); out.squash += (t < 0.2 ? 0.1 : -0.06) * fade; break
        case 'hop': out.lift += Math.abs(Math.sin(t * Math.PI * (who === 'pig' ? 2 : 1))) * (who === 'pig' ? 22 : 10); break
        case 'shake': out.tilt += Math.sin(t * Math.PI * (who === 'hen' ? 14 : who === 'cow' ? 5 : 9)) * 0.16 * fade; break
        case 'laugh': out.squash += Math.sin(t * Math.PI * 12) * 0.07 * fade; out.mouth = Math.max(out.mouth, fade); break
        case 'roll': out.tilt += hump * 2.6; out.lift += hump * 20; out.mouth = 1; break
        case 'blown': out.tilt += (who === 'farmer' || who === 'hen' ? 0.2 : -0.1) * hump; out.part += who === 'farmer' ? hump * 90 : hump * 0.4; break
        case 'sneeze': out.tilt += t < 0.55 ? -0.14 * (t / 0.55) : 0.24 * (1 - t); out.mouth = t > 0.5 && t < 0.7 ? 1 : 0.3; out.part += who === 'farmer' && t > 0.55 ? (1 - t) * 60 : 0; break
        case 'skip': out.lift += hump * 150; out.tilt += Math.sin(t * Math.PI * 2) * 0.4; break
        case 'poke': out.squash += Math.sin(t * Math.PI * (who === 'cow' ? 2 : who === 'farmer' ? 3 : 6)) * 0.12 * fade; out.tilt += who === 'farmer' ? -0.08 * hump : 0; break
        case 'wave': out.tilt += Math.sin(t * Math.PI * 6) * 0.06; out.mouth = Math.max(out.mouth, hump * 0.7); out.part += who === 'cow' ? 0.5 * hump : 0; break
        case 'catch': out.part += hump * 30; out.squash += hump * 0.06; break
        case 'flat': out.squash += -0.22 * Math.min(1, hump * 1.6); out.tilt += 0.06 * hump; out.mouth = 0.8; break
        case 'buttons': out.squash += Math.sin(t * Math.PI * 6) * 0.04; out.mouth = 0.5; break
        case 'hatless': out.tilt += Math.sin(t * Math.PI * 3) * 0.07; out.mouth = 0.6; break
        case 'egg': out.lift += hump * 8; out.mouth = 0.4; break
        case 'fed': out.tilt += -0.1 * hump; out.squash += Math.sin(t * Math.PI * 4) * 0.03; break
        case 'snip': out.tilt += 0.16 * Math.min(1, t * 8) * fade; out.mouth = 0.9 * fade; out.part += fade * 30; break
        case 'rattle': out.lift += Math.abs(Math.sin(t * Math.PI * 7)) * 18 * fade; out.squash += Math.sin(t * Math.PI * 14) * 0.06 * fade; break
        case 'pluck': out.tilt += -0.12 * hump; break
        case 'hum': out.tilt += Math.sin(t * Math.PI * 4) * 0.05; break
        case 'mumble': out.tilt += 0.16 * hump; out.lift -= 6 * hump; break
        case 'throw': out.tilt += (t < 0.35 ? 0.16 * (t / 0.35) : -0.2 * (1 - t)); out.mouth = hump; break
        case 'lean': out.tilt += -0.06 * hump; break
      }
    }
    return out
  }
}
const BLINK: Record<Watcher, number> = { farmer: 0.13, cow: 0.24, hen: 0.07, pig: 0.11 }
