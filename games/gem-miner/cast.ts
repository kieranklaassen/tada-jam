import type { Event, Game } from './game'
import type { Point } from './input'
import { BEASTS, BURROW, BURROW_INDEX, CAGE, CELL, COLS, HILL, MAMMOTH_FEET, ROWS, beside, colOf, inBox, isGrass, rowOf, type Box } from './layout'
import { below, makeRng, type Rng } from './rng'
import { dwellerBox } from './shapes'
import type { Dweller, DwellerKind } from './world'

// How everyone in the frame moves, as plain numbers on game time: the view
// maps them onto sprites. Each character has a tempo, a weight and a funniest
// part of its own, its own idle moves picked without repeats, and its own
// answer to what the child causes. Nothing here is saved: on load everyone is
// at rest in the place the cave gives it.
//
//   the mole     round, quick and earnest; the nose and the hat
//   the mammoth  huge, slow and heavy; the ears and the trunk
//   a dweller    each kind by `MANNER` below, and by its own drawing in the view
//
// What the mole does with his paws is not here: it is read straight off the
// game's own clock (`poses.ts`), so a blow is seen when it is heard.

/** A value on a spring: it overshoots its target and settles. `stiff` sets the tempo, `damp` the weight. */
export type Spring = { x: number; v: number; to: number; stiff: number; damp: number }
const spring = (stiff: number, damp: number, x = 0): Spring => ({ x, v: 0, to: x, stiff, damp })
function settle(s: Spring, dt: number): void {
  // Two half steps keep a stiff spring stable on a long frame.
  for (let i = 0; i < 2; i++) {
    const h = dt / 2
    s.v += ((s.to - s.x) * s.stiff - s.v * s.damp) * h
    s.x += s.v * h
  }
}

/** A countdown that says how far through it is, 0 at the start and 1 at the end, and null when it is not running. */
export type Beat = { left: number; length: number }
const beat = (): Beat => ({ left: 0, length: 1 })
const begin = (b: Beat, length: number): void => { b.left = length; b.length = length }
const run = (b: Beat, dt: number): void => { b.left = Math.max(0, b.left - dt) }
export const through = (b: Beat): number | null => (b.left > 0 ? 1 - b.left / b.length : null)

export const MAMMOTH_IDLES = ['ear', 'tail', 'curl', 'shift'] as const
export const MOLE_IDLES = ['sniff', 'wipe', 'tip'] as const
export type MammothIdle = (typeof MAMMOTH_IDLES)[number]
export type MoleIdle = (typeof MOLE_IDLES)[number]

export type Mammoth = {
  /** Seconds lived, for the breath. */
  time: number
  /** Ears: 0 at rest, toward 1 flapped out, toward -1 clamped down. Heavy and slow. */
  ear: Spring
  /** The trunk off the crank: 0 resting on it, 1 lifted high. */
  trunk: Spring
  /** The hind foot and the fore foot, each lifted over a blow under it: 0 down, 1 up. */
  hind: Spring
  fore: Spring
  /** The head dipped to look between its legs: 0 up, 1 down. */
  dip: Spring
  /** Tusks rattling after a clang, 1 falling to 0. */
  rattle: number
  /** Seconds its trunk stays tied in a knot against the smell of gas. */
  knot: number
  /** Its fur standing on end after a blast, 1 falling to 0. */
  fur: number
  idle: MammothIdle | null
  idleBeat: Beat
  blink: Beat
}

export type MoleFace = {
  time: number
  idle: MoleIdle | null
  idleBeat: Beat
  blink: Beat
  /** The body squashed by a blow or a landing: 0 round, positive squashed flat, negative stretched. Light and bouncy. */
  squash: Spring
  /** Startled: brows up and eyes wide, 1 falling to 0. */
  start: number
  /** His nose twitching as earth crumbles, 1 falling to 0. */
  nose: number
  /** Shaking the sting of granite out of his paws, 1 falling to 0. */
  sting: number
}

/** How a kind of dweller keeps time: how long it takes to come and to go, how often it does its idle move and how long that and its start last, and how far off a noise makes it flinch. */
export const MANNER: Record<DwellerKind, { arrive: number; leave: number; every: number; idle: number; start: number; hears: number }> = {
  bat: { arrive: 0.45, leave: 0.4, every: 3.2, idle: 1.3, start: 1.3, hears: 4 },
  newt: { arrive: 0.9, leave: 0.5, every: 5, idle: 1.6, start: 0.9, hears: 1 },
  lizard: { arrive: 0.3, leave: 0.22, every: 4.2, idle: 1.2, start: 0.8, hears: 2 },
  mushroom: { arrive: 0.7, leave: 0.3, every: 6, idle: 1.4, start: 0.7, hears: 1 },
  beetle: { arrive: 0.6, leave: 0.5, every: 4.6, idle: 1.5, start: 1.4, hears: 2 },
  fern: { arrive: 1.0, leave: 0.5, every: 3.6, idle: 1.2, start: 1.0, hears: 2 },
  glowworm: { arrive: 1.1, leave: 0.6, every: 5.4, idle: 2.0, start: 1.0, hears: 3 },
  snail: { arrive: 1.3, leave: 0.8, every: 7, idle: 2.4, start: 1.6, hears: 1 },
  moth: { arrive: 0.5, leave: 0.4, every: 2.8, idle: 0.9, start: 1.1, hears: 3 },
  dragonfly: { arrive: 0.35, leave: 0.3, every: 2.2, idle: 0.7, start: 0.9, hears: 3 },
  spider: { arrive: 0.8, leave: 0.5, every: 4, idle: 1.8, start: 1.2, hears: 2 },
  flower: { arrive: 1.6, leave: 0.7, every: 5, idle: 1.6, start: 0.8, hears: 1 },
}

/** When in its invitation the mammoth's trunk taps the rope, as parts of the whole. */
export const INVITE_TAPS = [0.45, 0.62] as const
/** How far a leaving bat flies before it is gone, at most, in stage units. */
export const FLIGHT = CELL * 1.5

/** A dweller where it is drawn now: where it lives, or as far along its way out as it has flown. */
export function lodgerBox(lodger: Lodger): Box {
  const box = dwellerBox(lodger.kind, lodger.at, lodger.shown)
  return { x: box.x + lodger.off.x, y: box.y + lodger.off.y, w: box.w, h: box.h }
}

/** The block the middle of a box is in, or null outside the hill. */
function blockAt(box: Box): number | null {
  const c = Math.floor((box.x + box.w / 2 - HILL.x) / CELL), r = Math.floor((box.y + box.h / 2 - HILL.y) / CELL)
  return c >= 0 && c < COLS && r >= 0 && r < ROWS ? r * COLS + c : null
}

/**
 * Where a bat goes when the light drives it out: along the dug space toward the nearest dug block that is still
 * dark, as far as that way runs straight; when no dark can be reached it does not fly, and draws back into its roof.
 */
function flightOf(game: Game, at: number): Point {
  const kinds = game.world.kinds
  // The nearest dark block by the dug way, and the first step of the way to it.
  const first = new Map<number, number>([[at, 0]])
  const queue = [at]
  let found = -1
  while (queue.length > 0 && found < 0) {
    const here = queue.shift()!
    for (const next of beside(here)) {
      if (first.has(next) || kinds[next] !== 'open') continue
      first.set(next, here === at ? next - at : first.get(here)!)
      if (game.masks[next] === 0) { found = next; break }
      queue.push(next)
    }
  }
  // No dark to reach: it stays where it hangs and draws back into its own roof.
  if (found < 0) return { x: 0, y: 0 }
  const step = first.get(found)!
  // As far as the way runs straight from its place, and no further than a bat is seen to fly.
  let blocks = 0
  for (let b = at + step; kinds[b] === 'open' && beside(b - step).includes(b) && blocks < 2; b += step) blocks += 1
  const far = Math.min(FLIGHT, blocks * CELL)
  return Math.abs(step) === 1 ? { x: step * far, y: 0 } : { x: 0, y: Math.sign(step) * far }
}

/** Seconds a dweller takes to draw back out of the mole's way, and to come out again. */
export const DRAW_BACK_S = 0.1
export const COME_OUT_S = 0.35

export type Lodger = {
  kind: DwellerKind
  /** The block it lives in. */
  at: number
  /** 0 not there yet, 1 there: each kind comes and goes at its own speed. */
  here: number
  leaving: boolean
  /** Where a bat that is leaving flies to, from the place it hung in: the nearest dark, or up into the roof. */
  flight: Point
  /** How far along that flight it is drawn now. */
  off: Point
  /** Drawn back out of the mole's way: 0 out, 1 drawn back to nothing. */
  away: number
  /** How much of it there is to see and to touch: `here` less `away`. */
  shown: number
  /** Its own start, after a finger or on the ride. */
  start: Beat
  /** A flinch at a noise: 0 easy, 1 tight. Quick and stiff. */
  flinch: Spring
  idleBeat: Beat
  /** Seconds until its next idle move, and how many it has done: each kind has a few and takes them in turn. */
  wait: number
  turn: number
  /** Seconds it is still blown off its place by a blast. */
  blown: number
  /** Each one moves a little out of step with the others. */
  phase: number
}

/** A worm that looks out of a block of earth: 1 out, 0 pulled back in. */
export type Worm = { at: number; out: Spring; shy: number; phase: number }

/** Picks the next of `count` idle moves, never the one before. */
export function nextIdle(rng: Rng, count: number, last: number): number {
  const pick = below(rng, count - 1)
  return last >= 0 && pick >= last ? pick + 1 : pick
}

const phaseOf = (index: number): number => ((Math.imul(index + 1, 2654435761)) >>> 0) / 4294967296

export class Cast {
  readonly mammoth: Mammoth = { time: 0, ear: spring(40, 5), trunk: spring(55, 7), hind: spring(120, 11), fore: spring(120, 11), dip: spring(30, 7), rattle: 0, knot: 0, fur: 0, idle: null, idleBeat: beat(), blink: beat() }
  readonly mole: MoleFace = { time: 0, idle: null, idleBeat: beat(), blink: beat(), squash: spring(420, 16), start: 0, nose: 0, sting: 0 }
  readonly lodgers: Lodger[] = []
  readonly worms: Worm[] = []
  /** The heads of the painted herd: 0 looking ahead, 1 turned down to the mole. Slow, as paint would be. */
  readonly beasts: Spring[] = BEASTS.map(() => spring(26, 9))
  /** The lift's cage bouncing on its rope after a finger rattled it. */
  readonly cage: Spring = spring(260, 9)
  /**
   * The mammoth's invitation, 0 to 1 through it, or null: with the mole waiting in the cage and the child idle, it
   * looks at the cage's rope, reaches its trunk over and taps it twice. Without a sound: it is a nudge, not a touch.
   */
  invite: number | null = null

  /** The idle ladder's demonstration, for as long as the mole waits in the cage: the mammoth shows the rope. */
  nudge(game: Game, demo: number | null): void {
    const waits = demo !== null && game.world.mole.at === CAGE && game.mole.mode === 'rest' && game.sceneName === null
    const was = this.invite ?? 0, now = waits ? demo : null
    // Each tap of the trunk sets the cage bobbing a little on its rope.
    if (now !== null) for (const tap of INVITE_TAPS) if (was < tap && now >= tap) this.cage.v += 2.6
    this.invite = now
  }
  /** A hung lamp swinging on its rope after the mole has ducked under it. Light, and slow to stop. */
  readonly lamp: Spring = spring(34, 1.6)
  private ducked = false
  /** Where the mole was drawn at the last step. */
  private stood: Point | null = null
  /** The seed of the hillside whose dwellers these are. */
  private hill: number
  private readonly rng: Rng
  private wait = { mammoth: 2.5, mole: 4, mammothBlink: 3, moleBlink: 2 }
  private last = { mammoth: -1, mole: -1 }

  constructor(seed: number, game: Game) {
    this.rng = makeRng(seed ^ 0x51ab)
    this.hill = game.world.seed
    // Whoever lives in the cave is there when it opens: nothing arrives on load.
    for (const dweller of game.dwellers) this.lodgers.push(this.lodger(dweller.kind, dweller.at, 1))
    for (const at of game.worms) this.worms.push({ at, out: spring(90, 12, 1), shy: 0, phase: phaseOf(at) })
    this.keepClear(game, 1)
  }

  /** One thing the child caused. Everyone answers it in its own way. */
  feed(event: Event, game: Game): void {
    const m = this.mammoth, face = this.mole
    switch (event.type) {
      case 'knock':
        if (event.kind === 'grass') break
        this.noise(event.index, 1)
        this.shy(event.index, 1.6)
        // A wisp curls out of a knocked gas pocket, and the mammoth smells it.
        if (event.kind === 'gas') m.knot = Math.max(m.knot, 0.9)
        break
      case 'chip':
      case 'break': {
        this.underFoot(event.index, 7)
        if (event.type === 'break') {
          m.dip.to = 1
          begin(m.idleBeat, 0)
          m.idle = null
          this.wait.mammoth = Math.max(this.wait.mammoth, 1.6)
          // He likes earth: his nose twitches as it crumbles.
          if (event.kind === 'earth') face.nose = 1
        }
        face.squash.v += event.type === 'break' ? 9 : 6
        this.noise(event.index, event.type === 'break' ? 2 : 3)
        this.shy(event.index, 2.4)
        break
      }
      case 'clang':
        this.clang()
        face.squash.v += 12
        face.start = 1
        face.sting = 1
        this.noise(event.index, 4)
        break
      case 'ring':
      case 'gong':
        this.clang()
        face.squash.v += 8
        this.noise(event.index, 4)
        break
      case 'boom':
      case 'thud':
        m.hind.v += 6
        m.fore.v += 6
        this.noise(event.index, 3)
        break
      case 'split':
      case 'scoop':
        this.underFoot(event.index, 6)
        m.dip.to = 1
        this.noise(event.index, 2)
        break
      case 'step':
        face.squash.v += 2.5
        break
      case 'sit':
      case 'flop':
        face.squash.v += 14
        face.start = 1
        break
      case 'bump':
        face.squash.v += 16
        break
      case 'ding':
      case 'soak':
      case 'spray':
        face.squash.v += 8
        face.start = 1
        break
      case 'poke':
        if (event.who === 'mammoth') { m.trunk.to = 1; m.ear.to = 1; m.ear.v += 4 }
        else if (event.who === 'lift') this.cage.v += 9
        else if (event.who === 'mole') { face.squash.v += 10; face.start = 1 }
        else if (event.who !== 'wedge' && event.who !== 'bucket' && event.who !== 'rope') this.startOf(event.who, event.index)
        break
      case 'show':
        this.startOf(event.kind, event.index)
        break
      case 'clack':
        this.cage.v += 5
        break
      case 'squeal':
      case 'roll':
        // The crank squeals and the whole hide is rolled up: every worm in the hill pulls back in and stays in.
        for (const worm of this.worms) worm.shy = Math.max(worm.shy, 3)
        break
      case 'whoomph': {
        // Its fur stands on end and it knots its trunk; whoever lives up the shaft is blown off its place.
        m.fur = 1
        m.knot = Math.max(m.knot, 3)
        m.hind.v += 8
        m.fore.v += 8
        face.start = 1
        // Beside the pocket is every side of it.
        const near = beside(event.index)
        const shaft = isGrass(game.world.mole.at) ? -1 : colOf(game.world.mole.at)
        for (const lodger of this.lodgers) {
          if (colOf(lodger.at) === shaft || lodger.at === event.index || near.includes(lodger.at)) lodger.blown = 1.6
          else lodger.flinch.to = 1
        }
        break
      }
      case 'whistle':
        m.knot = Math.max(m.knot, 2)
        break
      case 'fff':
        m.knot = Math.max(m.knot, 1.2)
        break
      case 'charm':
        m.knot = Math.max(m.knot, 0.7)
        break
      default:
        break
    }
  }

  /** What a clang does to the mammoth: its ears clamp down and its tusks rattle. */
  private clang(): void {
    this.mammoth.ear.to = -1
    this.mammoth.rattle = 1
  }

  /** A blow in a column under one of the mammoth's feet lifts that foot. */
  private underFoot(index: number, kick: number): void {
    const c = colOf(index)
    if ((MAMMOTH_FEET.hind as readonly number[]).includes(c)) this.mammoth.hind.v += kick
    if ((MAMMOTH_FEET.fore as readonly number[]).includes(c)) this.mammoth.fore.v += kick
  }

  /** The dweller of a kind in a block does its own start, one that is on its way out included. */
  private startOf(kind: DwellerKind, index: number): void {
    for (const lodger of this.lodgers) if (lodger.kind === kind && lodger.at === index) begin(lodger.start, MANNER[kind].start)
  }

  /** The dweller a finger lands on: each one is found where it is drawn, at the size it is drawn at, and not at all once it has drawn back. */
  under(at: Point): Dweller | null {
    for (const lodger of this.lodgers) if (lodger.shown > 0.02 && inBox(at, lodgerBox(lodger))) return { kind: lodger.kind, at: lodger.at }
    return null
  }

  /** A noise in a block: every dweller that hears that far flinches. */
  private noise(index: number, loud: number): void {
    for (const lodger of this.lodgers) {
      const far = Math.abs(colOf(lodger.at) - colOf(index)) + Math.abs(rowOf(lodger.at) - rowOf(index))
      if (far > Math.min(loud, MANNER[lodger.kind].hears)) continue
      lodger.flinch.to = 1
      lodger.flinch.v += 6
      lodger.wait = Math.max(lodger.wait, 0.9)
    }
  }

  /** A worm in or beside a block that was struck pulls back in for a while. */
  private shy(index: number, seconds: number): void {
    for (const worm of this.worms) if (worm.at === index || beside(index).includes(worm.at)) worm.shy = Math.max(worm.shy, seconds)
  }

  step(dt: number, game: Game): void {
    const rng = this.rng
    // A fresh hillside has been unrolled: whoever lived in the old one was rolled away with it, and is not drawn on this one.
    if (this.hill !== game.world.seed) { this.hill = game.world.seed; this.lodgers.length = 0 }
    // The mammoth: slow springs, and long rests between its idle moves.
    const m = this.mammoth
    m.time += dt
    m.rattle = Math.max(0, m.rattle - dt / 0.7)
    m.knot = Math.max(0, m.knot - dt)
    m.fur = Math.max(0, m.fur - dt / 2.4)
    if (m.rattle <= 0 && m.ear.to < 0) m.ear.to = 0
    if (m.trunk.to > 0 && m.trunk.x > 0.9) m.trunk.to = 0
    if (m.ear.to > 0 && m.ear.x > 0.85) m.ear.to = 0
    if (m.dip.to > 0 && m.dip.x > 0.92) m.dip.to = 0
    run(m.idleBeat, dt)
    run(m.blink, dt)
    if (m.idleBeat.left <= 0) m.idle = null
    this.wait.mammoth -= dt
    // It never moves by itself while it winds, drinks or holds its nose.
    const busy = game.sceneName === 'ride' || game.mole.act === 'tipFeet' || m.knot > 0
    if (busy) { m.idle = null; begin(m.idleBeat, 0); this.wait.mammoth = Math.max(this.wait.mammoth, 1.5) }
    if (this.wait.mammoth <= 0) {
      this.last.mammoth = nextIdle(rng, MAMMOTH_IDLES.length, this.last.mammoth)
      m.idle = MAMMOTH_IDLES[this.last.mammoth]
      begin(m.idleBeat, m.idle === 'shift' ? 2.6 : 1.8)
      if (m.idle === 'ear') m.ear.v += 3.2
      this.wait.mammoth = 4 + rng.next() * 3
    }
    this.wait.mammothBlink -= dt
    if (this.wait.mammothBlink <= 0) { begin(m.blink, 0.42); this.wait.mammothBlink = 3 + rng.next() * 4 }
    settle(m.ear, dt); settle(m.trunk, dt); settle(m.hind, dt); settle(m.fore, dt); settle(m.dip, dt)
    settle(this.cage, dt)

    // The mole: quick blinks, and an idle move only while he rests with no finger down.
    const face = this.mole
    face.time += dt
    face.start = Math.max(0, face.start - dt / 0.8)
    face.nose = Math.max(0, face.nose - dt / 0.9)
    face.sting = Math.max(0, face.sting - dt / 1.1)
    run(face.idleBeat, dt)
    run(face.blink, dt)
    if (face.idleBeat.left <= 0) face.idle = null
    const resting = game.mole.mode === 'rest' && !game.working && !game.mole.hang
    if (!resting) { face.idle = null; begin(face.idleBeat, 0); this.wait.mole = 3 }
    else {
      this.wait.mole -= dt
      if (this.wait.mole <= 0) {
        this.last.mole = nextIdle(rng, MOLE_IDLES.length, this.last.mole)
        face.idle = MOLE_IDLES[this.last.mole]
        begin(face.idleBeat, face.idle === 'wipe' ? 1.5 : 1.1)
        this.wait.mole = 3.5 + rng.next() * 3
      }
    }
    this.wait.moleBlink -= dt
    if (this.wait.moleBlink <= 0) { begin(face.blink, 0.16); this.wait.moleBlink = 1.5 + rng.next() * 3 }
    settle(face.squash, dt)
    if (game.mole.duck && !this.ducked) this.lamp.v += 2.4 * game.mole.face
    this.ducked = game.mole.duck
    settle(this.lamp, dt)

    // The dwellers: who lives where follows the cave, at once, and each kind comes and goes at its own speed.
    // One that moves in where the mole is, or beside him, stays drawn back until he has gone.
    const close = this.nearMole(game)
    for (const dweller of game.dwellers) {
      if (this.lodgers.some((lodger) => lodger.kind === dweller.kind && lodger.at === dweller.at && !lodger.leaving)) continue
      const lodger = this.lodger(dweller.kind, dweller.at, 0)
      if (close.has(dweller.at)) lodger.away = 1
      this.lodgers.push(lodger)
    }
    for (const lodger of this.lodgers) {
      if (lodger.leaving || game.dwellers.some((dweller) => dweller.kind === lodger.kind && dweller.at === lodger.at)) continue
      lodger.leaving = true
      if (lodger.kind === 'bat') lodger.flight = flightOf(game, lodger.at)
    }
    for (let i = this.lodgers.length - 1; i >= 0; i--) {
      const lodger = this.lodgers[i], manner = MANNER[lodger.kind]
      lodger.here = Math.max(0, Math.min(1, lodger.here + (lodger.leaving ? -dt / manner.leave : dt / manner.arrive)))
      if (lodger.leaving && lodger.here <= 0) { this.lodgers.splice(i, 1); continue }
      if (lodger.leaving) { lodger.off.x = lodger.flight.x * (1 - lodger.here); lodger.off.y = lodger.flight.y * (1 - lodger.here) }
      lodger.blown = Math.max(0, lodger.blown - dt)
      run(lodger.start, dt)
      run(lodger.idleBeat, dt)
      if (lodger.flinch.to > 0 && lodger.flinch.x > 0.8) lodger.flinch.to = 0
      settle(lodger.flinch, dt)
      lodger.wait -= dt
      if (lodger.wait <= 0) {
        if (lodger.start.left <= 0 && !lodger.leaving) { begin(lodger.idleBeat, manner.idle); lodger.turn = (lodger.turn + 1) % 3 }
        lodger.wait = manner.every * (0.7 + rng.next() * 0.8)
      }
    }
    this.keepClear(game, dt)

    // The worms: out in the quiet, and back in when the mole is beside them or their earth is struck.
    for (let i = this.worms.length - 1; i >= 0; i--) if (!game.worms.includes(this.worms[i].at)) this.worms.splice(i, 1)
    for (const at of game.worms) if (!this.worms.some((worm) => worm.at === at)) this.worms.push({ at, out: spring(90, 12, 1), shy: 0, phase: phaseOf(at) })
    const near = this.nearMole(game)
    for (const worm of this.worms) {
      worm.shy = Math.max(0, worm.shy - dt)
      worm.out.to = worm.shy > 0 || near.has(worm.at) ? 0 : 1
      settle(worm.out, dt)
    }

    // The painted herd: the head of the animal the mole passes under turns down to look at him.
    const mole = game.moleAt()
    BEASTS.forEach((place, i) => {
      this.beasts[i].to = Math.abs(mole.x - place.x) < CELL * 1.2 ? 1 : 0
      settle(this.beasts[i], dt)
    })
  }

  /** The blocks the mole is in, is walking into or is rising through, and the ones beside them. */
  private nearMole(game: Game): Set<number> {
    const out = new Set<number>()
    const add = (node: number): void => {
      // On the grass over the mouth of the burrow he is beside the burrow: he comes down into it feet first.
      if (isGrass(node)) { if (colOf(node) === BURROW.c) add(BURROW_INDEX); return }
      out.add(node)
      for (const next of beside(node)) out.add(next)
    }
    add(game.world.mole.at)
    add(game.mole.to)
    // Carried up a shaft by a bucket of gas, he clears the whole of it.
    if (game.mole.afloat && !isGrass(game.world.mole.at)) for (let b = game.world.mole.at; b >= 0; b -= COLS) add(b)
    // Wherever a scene has him, he clears the block he is drawn in.
    const at = game.moleAt()
    const c = Math.floor((at.x - HILL.x) / CELL), r = Math.floor((at.y - 1 - HILL.y) / CELL)
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) add(r * COLS + c)
    return out
  }

  /** No dweller is where the mole is: the ones in his way draw back to nothing, quickly, and come out again when he has gone. */
  private keepClear(game: Game, dt: number): void {
    const near = this.nearMole(game)
    // Whatever is falling clears its way too: the blocks from where it is now down to where it will lie.
    for (const motion of game.motions) {
      if (motion.dy === 0 && motion.dx === 0) continue
      const at = motion.gem ? game.gemPlace(motion.gem) : motion.tool ? game.toolPlace(motion.tool) : game.boulderPlace(motion)
      const c = Math.floor((at.x + (motion.what === 'boulder' ? CELL / 2 : 0) - HILL.x) / CELL)
      const from = Math.max(0, Math.floor((at.y - (motion.what === 'tool' ? 20 : 0) - HILL.y) / CELL))
      if (c < 0 || c >= COLS) continue
      for (let r = from; r <= rowOf(motion.to) && r < ROWS; r++) near.add(r * COLS + c)
      near.add(motion.to)
    }
    // A touch that ends a scene puts the mole where the scene was taking him, at once: whoever is there is gone at once too.
    const at = game.moleAt()
    const jumped = this.stood !== null && Math.hypot(at.x - this.stood.x, at.y - this.stood.y) > CELL / 2
    this.stood = at
    for (const lodger of this.lodgers) {
      // A bat on its way out is where it has flown to: it is gone at once from a block the mole is in or beside.
      const flown = lodger.off.x !== 0 || lodger.off.y !== 0 ? blockAt(lodgerBox(lodger)) : null
      const back = near.has(lodger.at) || lodger.blown > 0 || (flown !== null && near.has(flown))
      if ((jumped || flown !== null) && back) lodger.away = 1
      lodger.away = Math.max(0, Math.min(1, lodger.away + (back ? dt / DRAW_BACK_S : -dt / COME_OUT_S)))
      lodger.shown = lodger.here * (1 - lodger.away)
    }
  }

  private lodger(kind: DwellerKind, at: number, here: number): Lodger {
    const phase = phaseOf(at)
    return { kind, at, here, leaving: false, flight: { x: 0, y: 0 }, off: { x: 0, y: 0 }, away: 0, shown: here, start: beat(), flinch: spring(300, 22), idleBeat: beat(), wait: MANNER[kind].every * (0.4 + phase), turn: Math.floor(phase * 3), blown: 0, phase }
  }
}
