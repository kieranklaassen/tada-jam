import { BELL, GUEST, toPoint, outward } from './layout'
import { makeRng, type Rng } from './rng'
import type { PartyEvent } from './party'
import type { Act, Antic, Side, Thing } from './rules'
import { GOLD, INK, blob, cell, gutta, soft, type G } from './silk'
import type { Stamp } from './stamps'
import type { Point } from './stage'

// Bits in the air and on the floor: what each thing throws, pours and blows,
// and what comes off a guest. Each cell of the sheet's grid throws its own.

export type Shape = 'drop' | 'glop' | 'plume' | 'curl' | 'ring' | 'puff' | 'shard' | 'mouse' | 'pool' | 'kiss' | 'string' | 'soap'

type Bit = { shape: Shape; x: number; y: number; vx: number; vy: number; size: number; colour: string; life: number; age: number; wait: number; pull: number; turn: number; spin: number; floor: number }

type Throw = { shape: Shape; colour: string; count: number; size: number; speed: number; spread: number; up: number; pull: number; life: number; over: number }

const T = (shape: Shape, colour: string, count: number, size: number, speed: number, spread: number, up: number, pull: number, life: number, over = 0): Throw => ({ shape, colour, count, size, speed, spread, up, pull, life, over })

/** What each thing throws in each act. `over` spreads the throw over that many seconds. Two cells never throw the same. */
export const THROWS: Record<Thing, Record<Act, Throw>> = {
  teapot: {
    tip: T('drop', '#b8642a', 26, 9, 60, 0.2, 0, 1500, 0.9, 0.7), dab: T('drop', '#d98a4a', 7, 6, 120, 2, 80, 900, 0.7), wave: T('drop', '#b8642a', 16, 8, 520, 0.7, 180, 1300, 0.9, 0.3),
    show: T('puff', '#f4f4ff', 12, 18, 60, 0.9, 190, -60, 1.1, 0.6), self: T('drop', '#e8a25e', 9, 5, 90, 2.4, 60, 700, 0.8, 0.7),
  },
  glue: {
    tip: T('glop', '#fffdf4', 9, 20, 30, 0.2, 0, 900, 1, 0.5), dab: T('string', '#fffdf4', 5, 12, 60, 1.2, 0, 60, 0.8), wave: T('string', '#fff4d8', 9, 16, 380, 0.8, 60, 500, 1, 0.3),
    show: T('glop', '#fff4d8', 4, 15, 20, 0.6, 0, 1000, 1), self: T('kiss', '#fffdf4', 4, 12, 70, 1.6, 80, 60, 0.9),
  },
  fan: {
    tip: T('curl', '#dff6ff', 9, 22, 260, 0.6, -240, 0, 0.8, 0.5), dab: T('ring', '#ffd873', 2, 16, 0, 0, 0, 0, 0.5, 0.16), wave: T('curl', '#ffffff', 12, 26, 520, 0.5, 20, 0, 0.9, 0.5),
    show: T('ring', '#ff9ec2', 3, 34, 0, 0, 0, 0, 0.8, 0.3), self: T('curl', '#ffc9dd', 5, 12, 80, 2.2, 40, 0, 0.7),
  },
  fish: {
    tip: T('drop', '#7fd4ff', 18, 7, 320, 0.3, -60, 900, 0.8, 0.5), dab: T('kiss', '#ff7d8f', 4, 13, 90, 1.4, 120, 0, 0.9), wave: T('drop', '#bfeaff', 10, 10, 260, 2, 160, 900, 0.7, 0.4),
    show: T('drop', '#e2f6ff', 14, 6, 190, 3.2, 160, 800, 0.9, 0.6), self: T('kiss', '#ffa2b0', 5, 10, 60, 2, 120, 0, 1, 0.5),
  },
  duster: {
    tip: T('plume', '#ffb3cf', 15, 22, 80, 2, 0, 190, 1.5, 0.5), dab: T('plume', '#f7b733', 4, 16, 120, 2, 60, 130, 1), wave: T('puff', '#efe3d2', 12, 24, 300, 0.9, 50, -10, 1.1, 0.4),
    show: T('plume', '#fff0d0', 7, 20, 120, 2.6, 130, 120, 1.4), self: T('puff', '#fff7ea', 10, 20, 420, 0.6, 10, 0, 0.7, 0.1),
  },
  horn: {
    tip: T('mouse', '#b9a7c9', 1, 20, 130, 0, 0, 1200, 3), dab: T('ring', '#fff3b0', 4, 24, 160, 0, 0, 0, 0.6, 0.3), wave: T('ring', '#f2b23a', 5, 22, 320, 0.2, 0, 0, 0.8, 0.5),
    show: T('ring', '#ffe39a', 6, 30, 90, 0.6, 150, 0, 1.2, 0.9), self: T('ring', '#9fd8e8', 3, 18, -60, 0, 0, 0, 1.1, 0.8),
  },
}

/** What comes off a guest as it answers. */
const OFF: Partial<Record<Antic, Throw>> = {
  puddle: T('pool', '#b8642a', 1, 70, 0, 0, 0, 0, 2.6), shake: T('drop', '#7fd4ff', 26, 7, 420, 6, 200, 1200, 0.9), spray: T('drop', '#bfeaff', 22, 6, 520, 1.4, 120, 900, 0.8), wash: T('drop', '#eaf8ff', 18, 10, 240, 5, 120, 1100, 1),
  thicken: T('pool', '#fffdf4', 1, 74, 0, 0, 0, 0, 2.6), stretch: T('string', '#fffdf4', 8, 20, 160, 2, 40, 100, 0.9), blow: T('soap', '#c9f4ff', 8, 12, 140, 6, 160, -60, 1.3),
  burst: T('plume', '#f25c9a', 30, 22, 480, 6, 220, 420, 1.7), flap: T('plume', '#ffb3cf', 8, 16, 200, 6, 60, 260, 1.2), bigger: T('plume', '#f7b733', 6, 16, 160, 6, 160, 260, 1.1), layer: T('plume', '#fff0d0', 8, 16, 140, 6, 160, 260, 1.1), crow: T('ring', '#ffd873', 3, 30, 60, 1, 200, 0, 0.9, 0.5),
  nose: T('puff', '#fff7ea', 6, 14, 320, 0.6, 20, 0, 0.6), choke: T('puff', '#fff7ea', 8, 12, 260, 6, 100, 0, 0.7), puff: T('puff', '#ffffff', 8, 18, 160, 6, 80, 0, 0.7), deflate: T('curl', '#ffffff', 6, 18, 300, 6, 80, 0, 0.7),
  crack: T('shard', '#d9cdb4', 22, 13, 380, 6, 260, 1300, 1), ring: T('shard', '#d9cdb4', 18, 16, 300, 6, 220, 1300, 1), slip: T('plume', '#ffb3cf', 6, 16, 60, 3, 0, 260, 1.2), rock: T('ring', '#d9cdb4', 1, 40, 0, 0, 0, 0, 0.6),
  pop: T('soap', '#c9f4ff', 22, 11, 340, 6, 120, 500, 0.8), prick: T('soap', '#e2f6ff', 18, 9, 300, 6, 120, 500, 0.8), double: T('soap', '#fffdf4', 8, 16, 120, 6, 120, -50, 1.2), bounce: T('ring', '#c9f4ff', 2, 60, 0, 0, 0, 0, 0.6, 0.3), roll: T('drop', '#7fd4ff', 8, 6, 160, 6, 120, 900, 0.8),
  soften: T('drop', '#e8dcc4', 12, 10, 120, 5, 40, 900, 1), rinse: T('plume', '#ffb3cf', 12, 18, 120, 5, 40, 420, 1), flatten: T('drop', '#7fd4ff', 12, 7, 240, 6, 140, 1100, 0.8), clump: T('plume', '#f25c9a', 4, 14, 80, 6, 80, 240, 1), onEnd: T('ring', '#fff3b0', 2, 46, 0, 0, 0, 0, 0.5, 0.15), spin: T('curl', '#ffffff', 8, 22, 260, 6, 60, 0, 0.8, 0.8),
}

export class Bits {
  readonly bits: Bit[] = []
  private readonly rng: Rng

  constructor(seed: number) {
    this.rng = makeRng(seed)
  }

  clear(): void {
    this.bits.length = 0
  }

  private throwAt(what: Throw, at: Point, aim: number, most: number, floor: number, wait = 0): void {
    const wide = what.shape === 'curl' ? 110 : 12
    for (let i = 0; i < what.count; i++) {
      if (this.bits.length >= most) this.bits.shift()
      const a = aim + (this.rng.next() - 0.5) * what.spread, v = what.speed * (0.6 + this.rng.next() * 0.8)
      this.bits.push({
        shape: what.shape, x: at.x + (this.rng.next() - 0.5) * wide, y: at.y + (this.rng.next() - 0.5) * wide * 0.7,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - what.up * (0.6 + this.rng.next() * 0.6), size: what.size * (0.75 + this.rng.next() * 0.5), colour: what.colour,
        life: what.life, age: 0, wait: wait + (what.count > 1 ? (i / what.count) * what.over : 0), pull: what.pull, turn: this.rng.next() * 6, spin: (this.rng.next() - 0.5) * 8, floor,
      })
    }
  }

  /** One thing that happened, as bits. */
  add(event: PartyEvent, most: number, spout: (side: Side) => Point): void {
    if (event.type === 'act') {
      const out = outward(event.side)
      const aim = event.act === 'self' || event.act === 'show' ? (out > 0 ? 0 : Math.PI) : event.act === 'tip' ? Math.PI / 2 : out > 0 ? 0.2 : Math.PI - 0.2
      const floor = event.act === 'tip' && event.thing !== 'horn' ? 500 : 770
      const at = event.act === 'tip' || event.act === 'wave' ? spout(event.side) : event.at
      const own = event.act === 'show' && (event.thing === 'glue' || event.thing === 'teapot')
      // What is held over her own head comes down on her own hair.
      if (own) this.throwAt(T(event.thing === 'glue' ? 'glop' : 'drop', event.thing === 'glue' ? '#fff4d8' : '#b8642a', 5, event.thing === 'glue' ? 14 : 8, 30, 1, 0, 900, 0.5, 0.2), toPoint(event.side, { u: 262, y: 50 }), Math.PI / 2, most, 150)
      if (event.thing === 'horn' && event.act === 'wave') this.throwAt(THROWS.horn.wave, at, aim + Math.PI, most, floor)
      if (event.thing !== 'glue' || !own) this.throwAt(THROWS[event.thing][event.act], at, event.thing === 'horn' && event.act === 'tip' ? (out > 0 ? 0 : Math.PI) : aim, most, floor)
    } else if (event.type === 'answer') {
      const off = OFF[event.antic]
      const at = toPoint(event.side, { u: GUEST.u, y: off?.shape === 'pool' ? 758 : GUEST.y - 20 })
      if (off) this.throwAt(off, at, Math.PI * 1.5, most, 770, 0.25)
    } else if (event.type === 'extra') this.throwAt(T('ring', '#ffe39a', 2, 14, 0, 0, 0, 0, 0.5, 0.15), event.at, 0, most, 900)
    else if (event.type === 'press') this.throwAt(T('ring', '#fff3b0', 1, 20, 0, 0, 0, 0, 0.4), event.at, 0, most, 900)
    else if (event.type === 'miss') this.throwAt(T('puff', '#fff7ea', 4, 12, 100, 6, 20, 0, 0.5), toPoint(event.side, { u: 70, y: 470 }), 0, most, 900)
    else if (event.type === 'bell') this.throwAt(T('ring', '#ffe39a', event.rung ? 4 : 2, 26, 0, 0, 0, 0, 0.8, 0.5), { x: BELL.x, y: BELL.y - 20 }, 0, most, 900)
    else if (event.type === 'cue' && event.kind === 'trade' && event.cue === 0) this.throwAt(T('ring', '#ffe39a', 4, 34, 0, 0, 0, 0, 0.7, 0.3), { x: BELL.x, y: 470 }, 0, most, 900)
    else if (event.type === 'cue' && event.kind === 'bubbles' && event.cue === 1) this.throwAt(T('soap', '#c9f4ff', 14, 12, 260, 6, 60, -30, 1.1), { x: BELL.x, y: 400 }, 0, most, 900)
    else if (event.type === 'cue' && event.kind === 'tidy') this.throwAt(T('soap', '#eaf8ff', 8, 10, 120, 6, 120, -40, 1), toPoint(event.cue % 2 === 0 ? 0 : 1, { u: GUEST.u, y: 560 }), 0, most, 900)
  }

  step(dt: number): void {
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const b = this.bits[i]
      if (b.wait > 0) {
        b.wait -= dt
        continue
      }
      b.age += dt
      if (b.age > b.life) {
        this.bits.splice(i, 1)
        continue
      }
      b.vy += b.pull * dt
      if (b.shape === 'plume') {
        b.vx *= 1 - dt * 1.6
        b.vy = Math.min(b.vy, 130)
        b.x += Math.sin(b.age * 5 + b.turn) * 40 * dt
      }
      if (b.shape === 'puff' || b.shape === 'curl') {
        b.vx *= 1 - dt * 2
        b.vy *= 1 - dt * 2
      }
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.turn += b.spin * dt
      if (b.y > b.floor) {
        b.y = b.floor
        if (b.shape === 'mouse') b.vy = -120 * Math.abs(Math.sin(b.age * 12)) - 30
        else if (b.shape === 'shard') {
          b.vy *= -0.4
          b.vx *= 0.6
        } else if (b.shape === 'drop' || b.shape === 'glop') {
          b.vy = 0
          b.vx = 0
          b.age = Math.max(b.age, b.life - 0.16)
        }
      }
      if (b.shape === 'mouse' && b.age > 0.6) b.vx += Math.sign(b.vx || 1) * 500 * dt
    }
  }

  draw(g: G, put: Stamp): void {
    for (const b of this.bits) {
      if (b.wait > 0) continue
      const k = b.age / b.life, fade = Math.min(1, (1 - k) * 4)
      g.save()
      g.translate(b.x, b.y)
      g.globalAlpha = fade
      switch (b.shape) {
        case 'drop': {
          g.rotate(Math.atan2(b.vy, b.vx))
          const l = 1 + Math.min(1.4, Math.hypot(b.vx, b.vy) / 420)
          g.scale((b.size * l) / 16, (b.size * 0.8) / 16)
          put(g, `drop${b.colour}`, [-20, -20, 40, 40], '', '', (g) => {
            blob(g, 0, 0, 16, 16)
            cell(g, b.colour, 3)
          })
          break
        }
        case 'glop':
          g.scale(b.size / 20, b.size / 20)
          put(g, `glop${b.colour}`, [-24, -24, 48, 56], '', '', (g) => {
            soft(g, [[-16, -20], [16, -20], [20, 14], [0, 26], [-20, 14]])
            cell(g, b.colour, 3)
          })
          break
        case 'plume':
          g.rotate(b.turn)
          g.scale(b.size / 24, b.size / 24)
          put(g, `plume${b.colour}`, [-28, -14, 56, 28], '', '', (g) => {
            g.beginPath()
            g.moveTo(-24, 0)
            g.quadraticCurveTo(0, -17, 24, 0)
            g.quadraticCurveTo(0, 17, -24, 0)
            cell(g, b.colour, 2.4)
          })
          break
        case 'curl':
          g.rotate(Math.atan2(b.vy, b.vx))
          g.beginPath()
          g.moveTo(-b.size * 2, 0)
          g.quadraticCurveTo(0, -b.size * 0.2, b.size * 0.6, -b.size * 0.3)
          g.arc(b.size * 0.6, -b.size * 0.72, b.size * 0.42, Math.PI / 2, -Math.PI * 0.9, true)
          g.strokeStyle = b.colour
          g.lineWidth = 5
          g.lineCap = 'round'
          g.stroke()
          break
        case 'ring':
          // Three pieces of unlike length, never one closed round.
          g.rotate(b.turn)
          g.strokeStyle = b.colour
          g.lineCap = 'round'
          g.lineWidth = 6 * (1 - k) + 1
          for (const [from, to] of [[0.1, 1.7], [2.4, 3.1], [3.9, 5.6]] as const) {
            g.beginPath()
            g.arc(0, 0, b.size * (0.5 + k * 1.6), from, to)
            g.stroke()
          }
          break
        case 'puff':
          g.scale((b.size * (0.6 + k)) / 24, (b.size * (0.6 + k)) / 24)
          g.globalAlpha = fade * 0.8
          put(g, `puff${b.colour}`, [-28, -25, 56, 50], '', '', (g) => {
            blob(g, 0, 0, 24, 20.4)
            cell(g, b.colour, 2.4)
          })
          break
        case 'shard':
          g.rotate(b.turn)
          g.scale(b.size / 16, b.size / 16)
          put(g, `shard${b.colour}`, [-20, -18, 40, 30], '', '', (g) => {
            g.beginPath()
            g.moveTo(-16, 0)
            g.lineTo(0, -13)
            g.lineTo(14, 6)
            g.closePath()
            cell(g, b.colour, 2)
          })
          break
        case 'kiss':
          blob(g, 0, 0, b.size * (0.7 + k * 0.5), b.size * 0.6)
          cell(g, b.colour, 2.6)
          blob(g, 0, 0, b.size * 0.3, b.size * 0.2)
          g.fillStyle = GOLD
          g.fill()
          break
        case 'string':
          g.beginPath()
          // A sagging loop with a bead of glue at its end.
          g.rotate(b.turn * 0.2 - 0.6)
          g.moveTo(-b.size * 2, 0)
          g.bezierCurveTo(-b.size, b.size * 2.2, b.size, b.size * 2.4, b.size * 1.8, -b.size * 0.4)
          g.lineCap = 'round'
          g.strokeStyle = GOLD
          g.lineWidth = 9
          g.stroke()
          g.strokeStyle = b.colour
          g.lineWidth = 5
          g.stroke()
          break
        case 'soap':
          g.scale(b.size / 16, b.size / 16)
          put(g, `soap${b.colour}`, [-20, -20, 40, 40], '', '', (g) => {
            blob(g, 0, 0, 16, 16)
            g.globalAlpha = 0.4
            g.fillStyle = b.colour
            g.fill()
            g.globalAlpha = 1
            gutta(g, 2)
          })
          break
        case 'pool':
          blob(g, 0, 0, b.size * Math.min(1, k * 5), b.size * 0.17 * Math.min(1, k * 5))
          cell(g, b.colour, 3)
          break
        case 'mouse': {
          const s = Math.sign(b.vx || 1)
          g.scale(s, 1)
          g.beginPath()
          g.moveTo(-14, 0)
          g.quadraticCurveTo(-34, 8, -44, -8 + Math.sin(b.age * 20) * 6)
          gutta(g, 4)
          soft(g, [[-18, 8], [-16, -10], [4, -14], [28, 4], [10, 12]])
          cell(g, b.colour, 3)
          blob(g, 4, -14, 8, 8)
          cell(g, '#e8b6c4', 2.6)
          blob(g, 16, -2, 2.6, 2.6)
          g.fillStyle = INK
          g.fill()
          break
        }
      }
      g.restore()
    }
    g.globalAlpha = 1
  }
}
