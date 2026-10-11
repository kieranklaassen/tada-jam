import { BODY, camperAt, campers, onBell, type Camper } from '../camp'
import { CELL, MUD, OPEN, SAND, STONE, at, type Lump } from '../ground'
import { handPose, type Guidance, type HandPose } from '../guidance'
import { idleMove, pokeMove, POKE_SECONDS, type Move, type Mover } from '../motion'
import type { Party } from '../order'
import { WEDGED, demoDrag, queenSeat, workerSpots } from '../residents'
import { below, makeRng, type Rng } from '../rng'
import type { Toy, ToyEvent } from '../toy'
import { GRASS_Y, GROUND, MOUTH_X } from './layout'
import { BELL, LIP, hillGrown, hillShape } from './props'

// What a frame of the toy shows, as a list of things to draw, with no canvas in sight: the view paints the list,
// and the tests count it and measure it. It also holds what is only ever looked at: the crumbs in the air, the
// swing of the bell, who was poked and when.

export type Item =
  /** A creature, by the middle of its feet. `size` scales it both ways and `tall` its height again. */
  | { is: 'sprite'; who: Mover; pose: string; x: number; y: number; flip: boolean; size: number; tall: number; move: Move | null; turn: number }
  /** A carried lump, by the middle of its cell. */
  | { is: 'lump'; lump: Lump; x: number; y: number }
  /** The cell a carried lump was taken from, shown empty while it is in the jaws. */
  | { is: 'hole'; x: number; y: number }
  /** The open cell under the finger where a carried lump would be set down. */
  | { is: 'target'; x: number; y: number }
  /** All the crumbs of one colour, as one draw. */
  | { is: 'crumbs'; colour: string; at: { x: number; y: number; size: number }[] }
  | { is: 'drop'; sway: number; glint: number }
  /** A soft sparkle on something that can be touched, for the idle ladder. */
  | { is: 'glint'; x: number; y: number; strength: number }
  | { is: 'hand'; x: number; y: number; press: number; opacity: number }

/** How many draws each kind of item costs. */
export const DRAWS: Record<Item['is'], number> = { sprite: 1, lump: 2, hole: 1, target: 1, crumbs: 1, drop: 3, glint: 1, hand: 2 }
export const drawsOf = (items: readonly Item[]): number => items.reduce((sum, item) => sum + DRAWS[item.is], 0)

/**
 * How much larger than her pose the wedged queen is drawn, so that she fills the shaft from side to side, and how
 * much less tall than that, so that only her feelers and brow stand out of the mouth.
 */
export const QUEEN_WEDGED = { size: 1.5, tall: 0.8 } as const
/** The fewest open cells in a row that the ant can stand at full length in. In less it sits. */
export const ANT_LENGTH = 4
/** Where the carried lump rides, from the ant's feet: in its jaws. */
const JAWS = { x: 58, y: -30 }
/** How deep, in cells, a mouthful is still felt at the camp above it; and how long the ant looks at its work when the finger lets go. */
export const FELT_DEPTH = 3.5
export const LOOK_SECONDS = 1.2
/** The most crumbs in the air at once. */
export const MOST_CRUMBS = 36
const CRUMB = { earth: '#c79a63', dust: '#d9dde2', sand: '#f1d58a', spark: '#ffe08a', mud: '#3b2a24' } as const

type Crumb = { x: number; y: number; vx: number; vy: number; life: number; size: number; colour: string }

const toStage = (cx: number, cy: number) => ({ x: GROUND.x + cx * CELL, y: GROUND.y + cy * CELL })
const cellMiddle = (cell: number, cols: number) => toStage((cell % cols) + 0.5, Math.floor(cell / cols) + 0.5)

export class ToyDisplay {
  /** Seconds of game time this display has played. */
  seconds = 0
  readonly camp: Camper[]
  private readonly rng: Rng
  private crumbs: Crumb[] = []
  private readonly poked = new Map<string, { at: number; count: number }>()
  private sway = 0
  private swing = 0
  private carriedAt: { x: number; y: number } | null = null
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private wasDown = false
  private lookUntil = -1
  private readonly moves: Move[] = []

  constructor(private readonly toy: Toy, party: Party, seed = 1) {
    this.camp = campers(party)
    // The crumbs take their chance from a stream of their own, so nothing looked at can change what is played.
    this.rng = makeRng(seed ^ 0x5eed)
  }

  /** How far the hill has grown, from 0 to under 1. */
  get hill(): number {
    return hillGrown(this.toy.realm.hollow)
  }

  /** A touch on the surface, in stage units. Gives what it landed on, for its voice: the bell, a camper, or the setting. */
  poke(x: number, y: number): { on: 'bell' } | { on: 'camper'; kind: Mover } | { on: 'setting' } {
    if (onBell(x, y)) {
      this.swing += x < BELL.x ? 5 : -5
      // Everyone looks up when the bell rings: each in its own way.
      for (const camper of this.camp) this.startle(camper.id)
      return { on: 'bell' }
    }
    const camper = camperAt(this.camp, x, y)
    if (camper) {
      this.startle(camper.id)
      return { on: 'camper', kind: camper.kind }
    }
    this.puff(x, y, 4, CRUMB.dust, 40)
    return { on: 'setting' }
  }

  private startle(id: string): void {
    const was = this.poked.get(id)
    this.poked.set(id, { at: this.seconds, count: (was?.count ?? -1) + 1 })
  }

  /** Startles a creature unless it is still in the middle of its last answer. */
  private startleOnce(id: string): void {
    const was = this.poked.get(id)
    if (!was || this.seconds - was.at >= POKE_SECONDS) this.startle(id)
  }

  private puff(x: number, y: number, count: number, colour: string, speed: number): void {
    for (let n = 0; n < count && this.crumbs.length < MOST_CRUMBS; n++) {
      const turn = this.rng.next() * Math.PI * 2, fast = speed * (0.4 + this.rng.next() * 0.8)
      this.crumbs.push({ x, y, vx: Math.cos(turn) * fast, vy: Math.sin(turn) * fast - speed * 0.6, life: 0.35 + this.rng.next() * 0.3, size: 2 + below(this.rng, 3), colour })
    }
  }

  /** What the toy says happened, turned into what is seen: crumbs, dust, a spark, and a camp that feels a stone land. */
  see(events: readonly ToyEvent[]): void {
    const cols = this.toy.game.ground.cols
    for (const event of events) {
      if (event.type === 'dug') {
        const p = toStage(event.x, event.y)
        this.puff(p.x, p.y, 4 + Math.round(event.speed * 4), CRUMB.earth, 70 + 90 * event.speed)
        // The spoil goes up to the hill, where the worker who carries it gives a hop; and a camper right above a
        // fresh tunnel feels it through its feet.
        this.startleOnce('spoil')
        if (event.y < FELT_DEPTH) {
          const above = this.camp.find((camper) => camper.y === GRASS_Y && Math.abs(camper.x - p.x) < BODY[camper.kind].width / 2)
          if (above) this.startleOnce(above.id)
        }
      } else if (event.type === 'met') {
        const p = toStage(event.x, event.y)
        if (event.kind === STONE) this.puff(p.x, p.y, 2, CRUMB.spark, 150)
        else if (event.kind === SAND) this.puff(p.x, p.y, 3, CRUMB.sand, 30)
        else if (event.kind === MUD) this.puff(p.x, p.y, 2, CRUMB.mud, 25)
      } else if (event.type === 'set' || event.type === 'landed') {
        const p = cellMiddle(event.cell, cols)
        const colour = event.kind === SAND ? CRUMB.sand : event.kind === MUD ? CRUMB.mud : CRUMB.dust
        this.puff(p.x, p.y + CELL / 2, event.kind === STONE ? 5 : 3, colour, event.kind === STONE ? 80 : 45)
        // A stone that fell far is felt at the camp through the feet.
        if (event.type === 'landed' && event.kind === STONE && event.fell >= 2) for (const camper of this.camp) this.startle(camper.id)
      }
    }
  }

  /** Plays this many seconds: crumbs fly and fall, the bell swings back to rest, the carried lump goes to the jaws. */
  advance(dt: number): void {
    this.seconds += dt
    for (const crumb of this.crumbs) {
      crumb.life -= dt
      crumb.vy += 520 * dt
      crumb.x += crumb.vx * dt
      crumb.y += crumb.vy * dt
    }
    this.crumbs = this.crumbs.filter((crumb) => crumb.life > 0)
    // The bell is a damped spring about a slow sway of its own.
    this.swing += (-46 * this.sway - 2.4 * this.swing) * dt
    this.sway += this.swing * dt
    // When the finger lets go the ant sits back and looks at what it made, for a moment.
    const down = this.toy.finger !== null
    if (this.wasDown && !down) this.lookUntil = this.seconds + LOOK_SECONDS
    this.wasDown = down
    const carried = this.toy.carried
    if (!carried) this.carriedAt = null
    else {
      const jaws = this.jaws()
      if (!this.carriedAt) this.carriedAt = cellMiddle(carried.from, this.toy.game.ground.cols)
      const ease = Math.min(1, dt * 14)
      this.carriedAt.x += (jaws.x - this.carriedAt.x) * ease
      this.carriedAt.y += (jaws.y - this.carriedAt.y) * ease
    }
  }

  private antFeet(): { x: number; y: number } {
    return toStage(this.toy.antAt.x, this.toy.antAt.y + 0.5)
  }

  private jaws(): { x: number; y: number } {
    const feet = this.antFeet()
    return { x: feet.x + JAWS.x * (this.toy.antHeading.x < 0 ? -1 : 1), y: feet.y + JAWS.y }
  }

  private move(n: number): Move {
    while (this.moves.length <= n) this.moves.push({ second: false, dx: 0, dy: 0, turn: 0, sx: 1, sy: 1 })
    return this.moves[n]
  }

  /** The idle move of a creature, or its answer to a poke while that lasts. */
  private moveOf(id: string, kind: Mover, phase: number, slot: number): Move {
    const out = this.move(slot)
    const poke = this.poked.get(id)
    if (poke && this.seconds - poke.at < POKE_SECONDS && pokeMove(kind, this.seconds - poke.at, poke.count, out)) return out
    return idleMove(kind, this.seconds, phase, out)
  }

  /** Everything this frame shows on the layer between the ground and the glass, in the order it is drawn. */
  items(guidance: Guidance | null): Item[] {
    const toy = this.toy, ground = toy.game.ground, list: Item[] = []
    let slot = 0
    const glow = guidance?.glow ?? 0
    list.push({ is: 'drop', sway: this.sway + Math.sin(this.seconds * 0.9) * 0.03, glint: 0 })
    for (const camper of this.camp) {
      const move = this.moveOf(camper.id, camper.kind, camper.phase, slot++)
      list.push({ is: 'sprite', who: camper.kind, pose: camper.poses[move.second ? 1 : 0], x: camper.x, y: camper.y, flip: camper.flip, size: 1, tall: 1, move, turn: 0 })
    }
    // The queen: wedged under the mouth while the kingdom has no chamber, and on the floor of the largest once it has.
    const realm = toy.realm
    const seat = queenSeat(ground, realm.chambers, realm.queenRoom)
    const queenMove = this.moveOf('queen', 'queen', 0, slot++)
    if (seat) {
      const p = toStage(seat.x, seat.y + 1)
      list.push({ is: 'sprite', who: 'queen', pose: queenMove.second ? 'sit2' : 'sit', x: p.x, y: p.y, flip: false, size: seat.fit, tall: 1, move: queenMove, turn: 0 })
    } else {
      const p = toStage(WEDGED.x, WEDGED.y + 1)
      list.push({ is: 'sprite', who: 'queen', pose: queenMove.second ? 'wedged2' : 'wedged', x: p.x, y: p.y, flip: false, size: QUEEN_WEDGED.size, tall: QUEEN_WEDGED.tall, move: queenMove, turn: 0 })
    }
    workerSpots(ground, realm.chambers, realm.queenRoom, realm.workers).forEach((spot, n) => {
      const p = toStage(spot.x, spot.y + 1)
      const move = this.moveOf(`worker${n}`, 'worker', (n * 0.37) % 1, slot++)
      list.push({ is: 'sprite', who: 'worker', pose: move.second ? 'walk2' : 'walk', x: p.x, y: p.y, flip: n % 2 === 1, size: 1, tall: 1, move, turn: 0 })
    })
    // The worker who carries the spoil stands on the hill, as high as the hill is.
    const hump = hillShape(this.hill).right
    const spoilMove = this.moveOf('spoil', 'worker', 0.6, slot++)
    list.push({ is: 'sprite', who: 'worker', pose: spoilMove.second ? 'walk2' : 'carry', x: MOUTH_X + LIP + hump.reach * 0.32, y: GRASS_Y - hump.height + 3, flip: true, size: 1, tall: 1, move: spoilMove, turn: 0 })
    // The carried lump leaves its cell looking empty, and shows where it would lie if the finger let go now.
    const carried = toy.carried
    if (carried && this.carriedAt) {
      const from = cellMiddle(carried.from, ground.cols)
      list.push({ is: 'hole', x: from.x, y: from.y })
      const finger = toy.finger
      if (finger && toy.canSetAt(finger.x, finger.y)) {
        const p = toStage(Math.floor(finger.x) + 0.5, Math.floor(finger.y) + 0.5)
        list.push({ is: 'target', x: p.x, y: p.y })
      }
    }
    // The child's ant.
    const feet = this.antFeet(), state = toy.antState
    const antMove = this.moveOf('ant', 'ant', 0, slot++)
    const climbing = state === 'run' && toy.antHeading.y !== 0 && at(ground, toy.game.ant.x, toy.game.ant.y + 1) === OPEN
    // Where the row is too short for it to stand at full length, it sits.
    let room = 1
    for (const side of [-1, 1]) for (let x = toy.game.ant.x + side; at(ground, x, toy.game.ant.y) === OPEN && room < ANT_LENGTH; x += side) room++
    const cramped = room < ANT_LENGTH
    const pose =
      state === 'run' ? (Math.floor(this.seconds * 12) % 2 === 0 ? 'walk1' : 'walk2')
      : state === 'dig' ? 'dig'
      : state === 'carry' ? 'carry'
      : state === 'wait' ? 'wait'
      : cramped || antMove.second || this.seconds < this.lookUntil ? 'look' : 'stand'
    const flip = toy.antHeading.x < 0
    if (state === 'dig') antMove.dy = -Math.abs(Math.sin(this.seconds * 18)) * 2
    list.push({ is: 'sprite', who: 'ant', pose, x: feet.x, y: feet.y, flip, size: 1, tall: 1, move: state === 'idle' || state === 'dig' ? antMove : null, turn: climbing ? (toy.antHeading.y > 0 ? 1 : -1) * (flip ? -1 : 1) * (Math.PI / 2) : 0 })
    if (carried && this.carriedAt) list.push({ is: 'lump', lump: carried.kind, x: this.carriedAt.x, y: this.carriedAt.y })
    // Crumbs, one draw a colour.
    const byColour = new Map<string, { x: number; y: number; size: number }[]>()
    for (const crumb of this.crumbs) {
      let group = byColour.get(crumb.colour)
      if (!group) byColour.set(crumb.colour, (group = []))
      group.push({ x: crumb.x, y: crumb.y, size: crumb.size })
    }
    for (const [colour, group] of byColour) list.push({ is: 'crumbs', colour, at: group })
    // The idle ladder: what can be touched glints, and the hand shows one drag through plain earth.
    if (glow > 0 || (guidance && guidance.demo !== null)) {
      const drag = demoDrag(ground, toy.game.ant)
      if (drag && glow > 0) {
        const p = toStage(drag.from.x, drag.from.y)
        list.push({ is: 'glint', x: p.x, y: p.y, strength: glow * (0.6 + 0.4 * Math.sin(this.seconds * 4)) })
      }
      const lump = glow > 0 ? toy.reachableLump() : null
      if (lump !== null) {
        const p = cellMiddle(lump, ground.cols)
        list.push({ is: 'glint', x: p.x, y: p.y, strength: glow * (0.6 + 0.4 * Math.sin(this.seconds * 4 + 2)) })
      }
      if (drag && guidance && guidance.demo !== null) {
        handPose(guidance.demo, true, this.hand)
        const from = toStage(drag.from.x, drag.from.y), to = toStage(drag.to.x, drag.to.y)
        list.push({ is: 'hand', x: from.x + (to.x - from.x) * this.hand.travel, y: from.y + (to.y - from.y) * this.hand.travel, press: this.hand.press, opacity: this.hand.opacity })
      }
    }
    return list
  }
}
