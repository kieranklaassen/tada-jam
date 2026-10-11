import type { Tier } from './config'
import type { Event, Game } from './game'
import { CELL, HILL, cellOf, centre, colOf, feetOf, isGrass, rowOf, type Tool } from './layout'
import { makeRng, type Rng } from './rng'
import type { Colour } from './world'

// What a touch throws off: chips, sparks, drops, dust, a shudder, a wisp of
// gas, a flash of a gem's colour, a sprayed hand. Short-lived, never saved
// and gone on load. Plain numbers on game time, so the view only stamps them.

/** Which pigment a chip is: red ochre for earth, yellow ochre for sandstone, a spark, or a drop of water. */
export const TINT = { earth: 0, sand: 3, spark: 6, water: 7 } as const

export type Chip = {
  x: number; y: number; vx: number; vy: number
  turn: number; spin: number; size: number
  /** 0 to 2 red ochre, 3 to 5 yellow ochre, 6 a spark, 7 a drop of water. */
  tint: number
  life: number
  /** The dug space it stays inside: it lands on the floor and bounces off the sides, and never falls through rock. */
  floor: number; left: number; right: number
}
export type Puff = { x: number; y: number; grow: number; life: number; length: number }
export type Print = { x: number; y: number; turn: number; life: number; length: number }
export type Shudder = { index: number; life: number; length: number; strength: number }
/** A wisp of gas that curls up out of a block and thins. */
export type Wisp = { x: number; y: number; lean: number; life: number; length: number }
/** A gem's colour thrown over the blocks round it: for a blink when it is knocked in the rock, swirling when it is struck free. */
export type Flash = { index: number; colour: Colour; swirl: boolean; life: number; length: number }
/** A bead of water that runs down the face of a knocked pocket. */
export type Bead = { x: number; y: number; life: number; length: number }
/** A block of sandstone the wedge has split: its two halves slide apart and sink to the floor of the block they stood in. */
export type Halves = { index: number; life: number; length: number }
/** A tool that hops where it lies when a finger lands on it. */
export type Hop = { tool: Tool; life: number; length: number }

export const MOST_CHIPS = 24
export const MOST_PUFFS = 6
export const MOST_PRINTS = 3
export const MOST_SHUDDERS = 3
export const MOST_WISPS = 4
export const MOST_FLASHES = 2
export const MOST_BEADS = 2

type Room = { left: number; right: number; floor: number }

export class Effects {
  readonly chips: Chip[] = []
  readonly puffs: Puff[] = []
  readonly prints: Print[] = []
  readonly shudders: Shudder[] = []
  readonly wisps: Wisp[] = []
  readonly flashes: Flash[] = []
  readonly beads: Bead[] = []
  readonly hops: Hop[] = []
  readonly halves: Halves[] = []
  private readonly rng: Rng

  constructor(seed: number) {
    this.rng = makeRng(seed ^ 0xeffe)
  }

  feed(event: Event, game: Game, tier: Tier): void {
    const rng = this.rng
    const stands = isGrass(game.world.mole.at) ? null : game.world.mole.at
    switch (event.type) {
      case 'knock': {
        if (event.kind === 'grass') { if (tier.dust) this.puff(event.at.x, event.at.y, 0.6); break }
        const { c, r } = cellOf(event.index)
        const face: Room = { left: HILL.x + c * CELL + 6, right: HILL.x + (c + 1) * CELL - 6, floor: HILL.y + (r + 1) * CELL - 6 }
        if (event.kind !== 'open') this.shudder(event.index, 0.22, 1)
        // What comes off the face of the block stays in front of it: crumbs of earth, a thread of sand.
        if (event.kind === 'earth') for (let i = 0; i < Math.min(3, tier.chips); i++) this.chip(event.at.x + (rng.next() - 0.5) * 20, event.at.y, (rng.next() - 0.5) * 60, -40 - rng.next() * 60, TINT.earth, face, 0.45)
        if (event.kind === 'sandstone') for (let i = 0; i < Math.min(4, tier.chips); i++) this.chip(event.at.x + (rng.next() - 0.5) * 4, event.at.y + i * 5, (rng.next() - 0.5) * 8, 30 + i * 14, TINT.sand, face, 0.5, 2)
        if (event.kind === 'water') this.bead(event.at.x, event.at.y)
        if (event.kind === 'gas') this.wisp(event.at.x, event.at.y)
        if (event.kind === 'gem' && event.colour) this.flash(event.index, event.colour, false, 0.28)
        if (tier.dust && event.kind !== 'water' && event.kind !== 'gas') this.puff(event.at.x, event.at.y, event.kind === 'open' ? 0.5 : 1)
        break
      }
      case 'chip':
      case 'break': {
        const mid = centre(cellOf(event.index).c, cellOf(event.index).r)
        const dx = event.from.x - mid.x, dy = event.from.y - mid.y
        const far = Math.hypot(dx, dy) || 1
        // The face the blow landed on: the side of the block toward the mole.
        const fx = mid.x + (dx / far) * CELL * 0.42, fy = mid.y + (dy / far) * CELL * 0.42
        const room = event.type === 'break' ? this.room(event.index, stands ?? event.index) : this.room(stands ?? event.index, stands ?? event.index)
        const count = event.type === 'break' ? tier.chips * 2 : tier.chips
        const tint = event.kind === 'earth' ? TINT.earth : TINT.sand
        for (let i = 0; i < count; i++) {
          const a = Math.atan2(dy, dx) + (rng.next() - 0.5) * 1.9
          const speed = (event.type === 'break' ? 130 : 110) + rng.next() * 210
          const sx = event.type === 'break' ? mid.x + (rng.next() - 0.5) * CELL * 0.6 : fx + (rng.next() - 0.5) * 14
          const sy = event.type === 'break' ? mid.y + (rng.next() - 0.5) * CELL * 0.6 : fy + (rng.next() - 0.5) * 14
          this.chip(sx, sy, Math.cos(a) * speed, Math.sin(a) * speed - 90, tint, room, event.type === 'break' ? 0.75 : 0.5)
        }
        if (event.type === 'chip') this.shudder(event.index, 0.2, 1.4)
        if (tier.dust) this.puff(event.type === 'break' ? mid.x : fx, event.type === 'break' ? mid.y : fy, event.type === 'break' ? 1.7 : 0.8)
        break
      }
      case 'clang': {
        const mid = centre(cellOf(event.index).c, cellOf(event.index).r)
        const dx = event.from.x - mid.x, dy = event.from.y - mid.y
        const far = Math.hypot(dx, dy) || 1
        const fx = mid.x + (dx / far) * CELL * 0.46, fy = mid.y + (dy / far) * CELL * 0.46
        const room = this.room(stands ?? event.index, stands ?? event.index)
        for (let i = 0; i < Math.min(8, tier.chips + 2); i++) {
          const a = Math.atan2(dy, dx) + (rng.next() - 0.5) * 2.4
          const speed = 200 + rng.next() * 260
          this.chip(fx, fy, Math.cos(a) * speed, Math.sin(a) * speed - 60, TINT.spark, room, 0.32)
        }
        this.shudder(event.index, 0.3, 0.7)
        break
      }
      case 'ring':
      case 'gong':
      case 'twang':
      case 'strain':
        this.shudder(event.index, 0.3, event.type === 'ring' ? 1.2 : 0.8)
        break
      case 'boom':
        this.shudder(event.index, 0.45, 2.2)
        if (tier.dust) { const mid = this.middle(event.index); this.puff(mid.x - 24, mid.y + 10, 1.4); this.puff(mid.x + 24, mid.y - 10, 1.4) }
        break
      case 'split':
      case 'scoop': {
        if (event.type === 'split') { this.halves.length = 0; this.halves.push({ index: event.index, life: 0.5, length: 0.5 }) }
        const mid = this.middle(event.index)
        const room = this.room(event.index, stands ?? event.index)
        const tint = event.type === 'scoop' && event.what === 'earth' ? TINT.earth : TINT.sand
        for (let i = 0; i < tier.chips; i++) this.chip(mid.x + (rng.next() - 0.5) * 50, mid.y + (rng.next() - 0.5) * 50, (rng.next() - 0.5) * 160, -60 - rng.next() * 120, tint, room, 0.6)
        if (tier.dust) this.puff(mid.x, mid.y, 1.3)
        break
      }
      case 'squelch':
      case 'ropehiss': {
        const mid = this.middle(event.index)
        const room = this.room(stands ?? event.index, stands ?? event.index)
        for (let i = 0; i < Math.min(4, tier.chips); i++) this.chip(mid.x + (rng.next() - 0.5) * 30, mid.y + (rng.next() - 0.5) * 30, (rng.next() - 0.5) * 90, -30 - rng.next() * 70, TINT.earth, room, 0.5)
        break
      }
      case 'zip':
        if (tier.dust) { const at = game.moleAt(); this.puff(at.x + game.mole.face * 40, at.y - 50 + (event.n % 2) * 16, 0.7) }
        break
      case 'tip': {
        const mid = this.middle(event.index)
        const room = this.room(event.index, event.index)
        const tint = event.what === 'sand' ? TINT.sand : event.what === 'water' ? TINT.water : TINT.earth
        for (let i = 0; i < tier.chips; i++) this.chip(mid.x + (rng.next() - 0.5) * 30, mid.y - 10, (rng.next() - 0.5) * 150, -40 - rng.next() * 110, tint, room, 0.6)
        if (tier.dust && event.what !== 'water') this.puff(mid.x, mid.y + 20, 1.2)
        break
      }
      case 'plip': {
        // One drop: a bead runs down the face of the pocket, and the drop lands in the bucket held under it.
        const mid = this.middle(event.index), at = game.moleAt()
        const lean = Math.sign(at.x - mid.x)
        this.bead(mid.x + lean * (CELL / 2 - 4), mid.y - 6)
        const room = this.room(stands ?? event.index, stands ?? event.index)
        for (let i = 0; i < Math.min(2, tier.chips); i++) this.chip(at.x + game.mole.face * 26, at.y - 36, (rng.next() - 0.5) * 60, -70 - rng.next() * 40, TINT.water, room, 0.3, 2.2)
        break
      }
      case 'trickle': {
        // Wrung out: the water he pulled up runs off the rope in a few drops at his feet.
        const at = game.moleAt()
        const room = stands === null ? { left: at.x - 80, right: at.x + 80, floor: at.y } : this.room(stands, stands)
        for (let i = 0; i < Math.min(4, tier.chips); i++) this.chip(at.x + game.mole.face * (20 + rng.next() * 10), at.y - 30 + i * 4, (rng.next() - 0.5) * 30, 20 + i * 30, TINT.water, room, 0.45, 2.4)
        break
      }
      case 'jet':
      case 'bloop':
      case 'plap':
      case 'gush':
      case 'plink': {
        const mid = this.middle(event.index)
        const room = this.room(event.index, stands ?? event.index)
        // A drop that runs down the face of its own spout is taken up by the wet under the hole: nothing splashes.
        if (event.type === 'plink' && game.world.kinds[event.index] !== 'open') break
        const count = event.type === 'plink' ? Math.min(2, tier.chips) : Math.min(7, tier.chips)
        for (let i = 0; i < count; i++) this.chip(mid.x + (rng.next() - 0.5) * 24, event.type === 'plink' ? room.floor - 4 : mid.y, (rng.next() - 0.5) * 170, -50 - rng.next() * 130, TINT.water, room, 0.5, 2.4)
        break
      }
      case 'soak':
      case 'spray':
      case 'flap': {
        const at = game.moleAt()
        const room = stands === null ? { left: at.x - 80, right: at.x + 80, floor: at.y } : this.room(stands, stands)
        for (let i = 0; i < Math.min(6, tier.chips); i++) this.chip(at.x + (rng.next() - 0.5) * 40, at.y - 40 - rng.next() * 30, (rng.next() - 0.5) * 260, -70 - rng.next() * 120, TINT.water, room, 0.45, 2.4)
        break
      }
      case 'step':
        if (event.wade) {
          const at = feetOf(event.node)
          const room = this.room(event.node, event.node)
          for (let i = 0; i < Math.min(4, tier.chips); i++) this.chip(at.x + (rng.next() - 0.5) * 30, at.y - 26, (rng.next() - 0.5) * 150, -60 - rng.next() * 90, TINT.water, room, 0.4, 2.4)
        }
        break
      case 'whoomph': {
        const mid = this.middle(event.index)
        const room = this.room(event.index, stands ?? event.index)
        for (let i = 0; i < tier.chips; i++) this.chip(mid.x, mid.y, (rng.next() - 0.5) * 520, -rng.next() * 420, TINT.spark, room, 0.5)
        if (tier.dust) { this.puff(mid.x, mid.y, 2.2); this.puff(mid.x + 30, mid.y - 30, 1.6); this.puff(mid.x - 30, mid.y - 20, 1.6) }
        this.wisp(mid.x, mid.y)
        break
      }
      case 'whistle':
      case 'fff':
      case 'charm': {
        const mid = this.middle(event.index)
        this.wisp(mid.x + (rng.next() - 0.5) * 20, mid.y)
        break
      }
      case 'thud':
      case 'clunk':
        if (tier.dust) { const mid = this.middle(event.index); this.puff(mid.x, mid.y + CELL / 2 - 8, event.type === 'thud' ? 1.5 : 0.7) }
        break
      case 'ping': {
        const mid = this.middle(event.index)
        const room = this.room(event.index, stands ?? event.index)
        for (let i = 0; i < Math.min(5, tier.chips); i++) this.chip(mid.x, mid.y, (rng.next() - 0.5) * 300, -80 - rng.next() * 200, TINT.spark, room, 0.35)
        break
      }
      case 'chime':
        this.flash(event.index, event.colour, true, 1.2)
        break
      case 'print':
        if (this.prints.length >= MOST_PRINTS) this.prints.shift()
        this.prints.push({ x: event.at.x, y: event.at.y, turn: (rng.next() - 0.5) * 0.8, life: 2.2, length: 2.2 })
        if (tier.dust) this.puff(event.at.x, event.at.y, 1.2)
        break
      case 'poke':
        if (event.who === 'wedge' || event.who === 'bucket' || event.who === 'rope') {
          for (let i = this.hops.length - 1; i >= 0; i--) if (this.hops[i].tool === event.who) this.hops.splice(i, 1)
          this.hops.push({ tool: event.who, life: 0.3, length: 0.3 })
        }
        break
      default:
        break
    }
  }

  step(dt: number): void {
    for (let i = this.chips.length - 1; i >= 0; i--) {
      const chip = this.chips[i]
      chip.life -= dt
      if (chip.life <= 0) { this.chips.splice(i, 1); continue }
      chip.vy += 900 * dt
      chip.x += chip.vx * dt
      chip.y += chip.vy * dt
      chip.turn += chip.spin * dt
      if (chip.y > chip.floor) { chip.y = chip.floor; chip.vy *= -0.35; chip.vx *= 0.6; chip.spin *= 0.5 }
      if (chip.x < chip.left) { chip.x = chip.left; chip.vx = Math.abs(chip.vx) * 0.5 }
      if (chip.x > chip.right) { chip.x = chip.right; chip.vx = -Math.abs(chip.vx) * 0.5 }
    }
    for (const list of [this.puffs, this.prints, this.shudders, this.wisps, this.flashes, this.beads, this.hops, this.halves]) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].life -= dt
        if (list[i].life <= 0) list.splice(i, 1)
      }
    }
  }

  private middle(index: number): { x: number; y: number } {
    return isGrass(index) ? { x: feetOf(index).x, y: HILL.y - 30 } : centre(colOf(index), rowOf(index))
  }

  /** The dug space two blocks share, as the room a chip stays in. */
  private room(a: number, b: number): Room {
    if (isGrass(a) || isGrass(b)) { const at = feetOf(isGrass(a) ? a : b); return { left: at.x - CELL, right: at.x + CELL, floor: HILL.y - 2 } }
    const ca = cellOf(a), cb = cellOf(b)
    return {
      left: HILL.x + Math.min(ca.c, cb.c) * CELL + 5,
      right: HILL.x + (Math.max(ca.c, cb.c) + 1) * CELL - 5,
      floor: HILL.y + (Math.max(ca.r, cb.r) + 1) * CELL - 7,
    }
  }

  private chip(x: number, y: number, vx: number, vy: number, tint: number, room: Room, life: number, size = 0): void {
    if (this.chips.length >= MOST_CHIPS) this.chips.shift()
    const rng = this.rng
    const plain = tint === TINT.spark || tint === TINT.water
    this.chips.push({ x, y, vx, vy, turn: rng.next() * 6, spin: (rng.next() - 0.5) * 22, size: size || (plain ? 2 + rng.next() * 2 : 3 + rng.next() * 5), tint: plain ? tint : tint + Math.floor(rng.next() * 3), life: life * (0.7 + rng.next() * 0.5), ...room })
  }

  private puff(x: number, y: number, grow: number): void {
    if (this.puffs.length >= MOST_PUFFS) this.puffs.shift()
    this.puffs.push({ x, y, grow, life: 0.5, length: 0.5 })
  }

  private shudder(index: number, length: number, strength: number): void {
    for (let i = this.shudders.length - 1; i >= 0; i--) if (this.shudders[i].index === index) this.shudders.splice(i, 1)
    if (this.shudders.length >= MOST_SHUDDERS) this.shudders.shift()
    this.shudders.push({ index, life: length, length, strength })
  }

  private wisp(x: number, y: number): void {
    if (this.wisps.length >= MOST_WISPS) this.wisps.shift()
    this.wisps.push({ x, y, lean: (this.rng.next() - 0.5) * 2, life: 0.9, length: 0.9 })
  }

  private flash(index: number, colour: Colour, swirl: boolean, length: number): void {
    for (let i = this.flashes.length - 1; i >= 0; i--) if (this.flashes[i].index === index) this.flashes.splice(i, 1)
    if (this.flashes.length >= MOST_FLASHES) this.flashes.shift()
    this.flashes.push({ index, colour, swirl, life: length, length })
  }

  private bead(x: number, y: number): void {
    if (this.beads.length >= MOST_BEADS) this.beads.shift()
    this.beads.push({ x, y, life: 0.7, length: 0.7 })
  }
}
