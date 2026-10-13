import { BODY, bodyBox, camperAt, campers, faceRadius, onBell, partyFile, type Box, type Camper } from '../camp'
import { CELL, MUD, OPEN, ROCK, SAND, STONE, at, type Ground, type Lump } from '../ground'
import { handPose, type Guidance, type HandPose } from '../guidance'
import { idleMove, pokeMove, POKE_SECONDS, type Move, type Mover } from '../motion'
import { TRIED_AT, type Kingdom, type KingdomEvent } from '../kingdom'
import type { Party } from '../order'
import { gaitOf, type Raid, type RaidEvent } from '../raid'
import { roomOf } from '../routes'
import type { Machine } from '../save'
import { QUEEN_HALF, WEDGED, demoDrag, floorOf, queenSeat, workerSpots, type Floor, type Standing } from '../residents'
import { below, makeRng, type Rng } from '../rng'
import type { Toy, ToyEvent } from '../toy'
import { GRASS_Y, GROUND, MOUTH_X, TOADSTOOL } from './layout'
import { BELL, LIP, dropAt, hillGrown, hillShape } from './props'
import { FLUNG, MOUTH_STEP, alongWay, invaderAt, showCarriedOut, showFurnishings, showMachine, showMarks, showRaid, showShot, toStage, type Shown } from './raidShow'
import type { Effect, Thing } from './things'

// What a frame of the toy shows, as a list of things to draw, with no canvas in sight: the view paints the list,
// and the tests count it and measure it. It also holds what is only ever looked at: the crumbs in the air, the
// swing of the bell, who was poked and when.

export type Item =
  /** A creature, by the middle of its feet. `size` scales it both ways and `tall` its height again. `id` says which creature it is: one of the camp, of the party, the queen or the child's ant; a worker, one of a crowd, has none. */
  | { is: 'sprite'; id: string; who: Mover; pose: string; x: number; y: number; flip: boolean; size: number; tall: number; move: Move | null; turn: number }
  /** A carried lump, by its middle. `drip` is how far a drip of mud hangs under it, in stage units. */
  | { is: 'lump'; lump: Lump; x: number; y: number; drip: number }
  /** The roots that hang from the turf into what was dug right under it, each by the point it hangs from and how far it swings, in radians. */
  | { is: 'roots'; at: { x: number; y: number; swing: number }[] }
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
  /** A machine, by the middle of its base. */
  | { is: 'machine'; kind: Machine['kind']; load: Machine['load']; pose: 'ready' | 'fired'; x: number; y: number; flip: boolean }
  /** The two-by-two cells where a held machine would stand, by their middle. */
  | { is: 'stand'; x: number; y: number }
  /** A thing on the back wall of a room, by the middle of its foot. */
  | { is: 'thing'; thing: Thing; x: number; y: number; lit: boolean }
  /** A shot in the air, a mark where a wall gave, a puff or a splat. */
  | { is: 'effect'; effect: Effect; x: number; y: number; progress: number; flip: boolean }
  /** Dusk over the camp, from 0 to 1, and a small glow on the grass, by its middle. */
  | { is: 'dusk'; strength: number; x: number; y: number }

/** How many draws each kind of item costs. */
export const DRAWS: Record<Item['is'], number> = { sprite: 1, lump: 3, roots: 1, hole: 1, target: 1, crumbs: 1, drop: 3, glint: 1, hand: 2, machine: 1, stand: 1, thing: 1, effect: 1, dusk: 3 }
export const drawsOf = (items: readonly Item[]): number => items.reduce((sum, item) => sum + DRAWS[item.is], 0)

/**
 * How much larger than her pose the wedged queen is drawn, so that she fills the shaft from side to side, and how
 * much less tall than that, so that only her feelers and brow stand out of the mouth.
 */
export const QUEEN_WEDGED = { size: 1.5, tall: 0.8 } as const
/** The fewest open cells in a row that the ant can stand at full length in. In less it sits. */
export const ANT_LENGTH = 4
/**
 * Where a carried lump rides, from the ant's feet, facing right: sand as a heap on its head, mud hanging from its
 * jaws, and a stone dragged behind it on the floor.
 */
const JAWS = { x: 58, y: -30 }
const RIDES: Record<number, { x: number; y: number }> = { [SAND]: { x: 30, y: -46 }, [MUD]: { x: 60, y: -24 }, [STONE]: { x: -72, y: -13 } }
/** How long the ant shakes after its jaws rang on a stone, and how long the worker takes to trot a mouthful of spoil up the hill, in seconds. */
export const RATTLE_SECONDS = 0.35
export const SPOIL_TROT = 0.7
/** How long the roots under the turf swing after a mouthful near them, in seconds, and how near, in cells. */
export const ROOTS_SWING = { seconds: 1.4, near: 3 } as const
/** How deep, in cells, a mouthful is still felt at the camp above it; and how long the ant looks at its work when the finger lets go. */
export const FELT_DEPTH = 3.5
export const LOOK_SECONDS = 1.2
/** How long after the finger has lifted the kingdom's own still keep out of the cell it pressed, in seconds. */
export const ASIDE_SECONDS = 0.5
/** What each kind does when the bell rang for nothing. */
const SHRUG: Partial<Record<Mover, string>> = { raider: 'shrug', beetle: 'sit', fly: 'peer', dungBeetle: 'lost', dungFly: 'arms' }
/**
 * How each kind is caught out by its own habit: the creature, the two frames of what it does first, and the two
 * of what it does then, where its habit has a second beat. The beats follow one another and never flick back.
 */
const HABIT: Record<string, { who: Mover; first: readonly [string, string]; then?: readonly [string, string] }> = {
  ant: { who: 'raider', first: ['stuck', 'stuck2'] },
  beetle: { who: 'beetle', first: ['onBack', 'onBack2'] },
  fly: { who: 'fly', first: ['bump', 'bump'] },
  dungBeetle: { who: 'dungBeetle', first: ['heave', 'push'], then: ['lost', 'lost'] },
  dungFly: { who: 'dungFly', first: ['point', 'point2'], then: ['arms', 'arms'] },
}
const HABIT_OF: Partial<Record<Mover, keyof typeof HABIT>> = { raider: 'ant', beetle: 'beetle', fly: 'fly', dungBeetle: 'dungBeetle', dungFly: 'dungFly' }
/** How much of a habit's time its first beat takes, where it has two; and how long a habit that was asked for by a press is acted out, in seconds. */
const FIRST_BEAT = 0.6
export const HABIT_SECONDS = 2.4
/** The pose of a habit this far through it, from 0 to 1, at this second. */
function habitPose(kind: keyof typeof HABIT, through: number, seconds: number): string {
  const habit = HABIT[kind], beat = habit.then && through >= FIRST_BEAT ? habit.then : habit.first
  return beat[Math.floor(seconds * 2.4) % 2]
}
/**
 * Where a first showing is played, by the creature it shows: at the front of the camp, where what catches that kind
 * out is. The ant at its puddle, the fly under the low twig, the beetle under the toadstool it cannot climb, the dung
 * beetle behind its ball, which lies against the two pebbles, and the dung fly on the toadstool. Each is larger than
 * at the log.
 */
export const SHOWING_AT: Record<string, { x: number; y: number; size: number }> = {
  raider: { x: 108, y: GRASS_Y, size: 1.3 },
  fly: { x: 230, y: GRASS_Y, size: 1.3 },
  beetle: { x: 900, y: GRASS_Y, size: 1.3 },
  dungBeetle: { x: 1010, y: GRASS_Y, size: 1.15 },
  dungFly: { x: TOADSTOOL.x, y: GRASS_Y - TOADSTOOL.top, size: 1.3 },
}
/** Where the ball lies in the dung beetle's showing: before the two pebbles, which it will not go between. */
const SHOWN_BALL = { x: 1100, y: GRASS_Y } as const
/** How long a puff or a splat is seen where a shot landed, and the smoke and the twang of a machine that fired, in seconds. */
export const BURST_SECONDS = 0.45
const BURST: Partial<Record<Effect, number>> = { smoke: 0.7, twang: 0.4 }
const burstSeconds = (effect: Effect) => BURST[effect] ?? BURST_SECONDS
/** On the idle ladder: how long the ant looks out before it scratches, and scratches before it looks out again, in seconds; and how far the bell sways by itself, in radians. */
export const LADDER_BEAT = 0.9
export const LADDER_SWAY = 0.16
/** How far through the put-back the last cell is back in its place: the cells go back one by one until then. */
const PUT_BACK_BY = 0.8
/** How much of the scene in which the queen moves in she is carried for; for the rest she tries the floor. */
const MOVES = { carried: 0.7 } as const
/** Where a machine's smoke or twang is shown, from the middle of its base, facing right. */
const MUZZLE = { x: 23, y: -37 } as const
const ARM = { x: 0, y: -28 } as const
/** The beats of the ending, in seconds from its start: the leaf, the glow-worms from first to last, the egg, the dusk. */
export const ENDING = { leaf: 1.5, lightFrom: 4, lightTo: 12, egg: 12.5, duskFrom: 13, duskTo: 19 } as const
/** Where the dung fly's leaf hangs once the ending is over: under the edge of the toadstool, beside the bell's stalk. */
export const LEAF_AT = { x: 768, y: GRASS_Y } as const
/** Where the small glow of the ending lies: on the grass in front of the army. */
const GLOW_AT = { x: 280, y: GRASS_Y - 14 } as const
/** The most crumbs in the air at once. */
export const MOST_CRUMBS = 36
const CRUMB = { earth: '#c79a63', dust: '#d9dde2', sand: '#f1d58a', spark: '#ffe08a', mud: '#3b2a24' } as const

type Crumb = { x: number; y: number; vx: number; vy: number; life: number; size: number; colour: string }

const cellMiddle = (cell: number, cols: number) => toStage((cell % cols) + 0.5, Math.floor(cell / cols) + 0.5)

export class ToyDisplay {
  /** Seconds of game time this display has played. */
  seconds = 0
  camp: Camper[]
  private campFor = ''
  private readonly toy: Toy
  private shownGround: Ground
  /** The cells as they were last handed to the repaint. */
  private painted: Uint8Array
  private dirty: number[] = []
  private readonly fired = new Map<number, number>()
  private bursts: { effect: Effect; x: number; y: number; at: number; flip: boolean }[] = []
  private readonly rng: Rng
  /** Every crumb there can be, made once: one in the air has life left. */
  private readonly crumbs: Crumb[] = Array.from({ length: MOST_CRUMBS }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 2, colour: '' }))
  private readonly groups = new Map<string, Crumb[]>()
  private readonly poked = new Map<string, { at: number; count: number }>()
  /** Whom the finger pressed, and when: that one acts out its own habit for a while. The bell and a falling stone startle; they ask for nothing. */
  private readonly asked = new Map<string, number>()
  /** The cell under the finger, and until when the kingdom's own keep out of it: while it is down and a moment after. */
  private asideCell: { x: number; y: number } | null = null
  private asideUntil = -1
  private sway = 0
  private swing = 0
  private carriedAt: { x: number; y: number } | null = null
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private wasDown = false
  private lookUntil = -1
  private rattleUntil = -1
  private spoilAt = -9
  /** Where and when the last mouthful near the turf was dug: the roots there swing for a while. */
  private rootsShook: { x: number; at: number } = { x: 0, at: -9 }
  private readonly moves: Move[] = []
  private readonly roots: { x: number; y: number; swing: number }[] = []

  constructor(private readonly k: Kingdom, seed = 1) {
    this.toy = k.toy
    this.camp = campers(k.party)
    this.campFor = `${k.game.position}/${k.game.muster}`
    this.shownGround = k.game.ground
    this.painted = k.game.ground.cells.slice()
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
      this.k.bell()
      return { on: 'bell' }
    }
    // Any touch ends a scene that is playing.
    this.k.touch()
    const camper = camperAt(this.present(), x, y)
    if (camper) {
      this.startle(camper.id)
      this.asked.set(camper.id, this.seconds)
      return { on: 'camper', kind: camper.kind }
    }
    this.puff(x, y, 4, CRUMB.dust, 40)
    return { on: 'setting' }
  }

  /**
   * The campers who are at the camp now. While a raid runs, the party's places at the log are empty but for those
   * who still sit there waiting their turn and those who are home again: a press on an empty place is a press on the
   * setting, and a press on one who sits there is answered by it.
   */
  private present(): readonly Camper[] {
    const raid = this.k.raid
    if (!raid) return this.camp
    const laid = this.partyOf(raid)
    const seated = showRaid(raid, laid.party, this.seconds, [], laid.file).filter((one) => one.id >= 0 && one.y <= GRASS_Y)
    return this.camp.filter((camper) => {
      const place = /^party(?:Ball)?(\d+)$/.exec(camper.id)
      if (!place) return true
      return seated.some((one) => one.id === Number(place[1]) && one.who === camper.kind && Math.abs(one.x - camper.x) < 1)
    })
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
    let made = 0
    for (const crumb of this.crumbs) {
      if (made >= count) break
      if (crumb.life > 0) continue
      const turn = this.rng.next() * Math.PI * 2, fast = speed * (0.4 + this.rng.next() * 0.8)
      crumb.x = x
      crumb.y = y
      crumb.vx = Math.cos(turn) * fast
      crumb.vy = Math.sin(turn) * fast - speed * 0.6
      crumb.life = 0.35 + this.rng.next() * 0.3
      crumb.size = 2 + below(this.rng, 3)
      crumb.colour = colour
      made++
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
        if (this.seconds - this.spoilAt > SPOIL_TROT) this.spoilAt = this.seconds
        if (event.y < ROOTS_SWING.near + 1) this.rootsShook = { x: event.x, at: this.seconds }
        if (event.y < FELT_DEPTH) {
          const above = this.camp.find((camper) => camper.y === GRASS_Y && Math.abs(camper.x - p.x) < BODY[camper.kind].width / 2)
          if (above) this.startleOnce(above.id)
        }
      } else if (event.type === 'met') {
        const p = toStage(event.x, event.y)
        if (event.kind === STONE) {
          // The jaws ring on it: one spark, and the ant shakes to its feelers.
          this.puff(p.x, p.y, 2, CRUMB.spark, 150)
          this.rattleUntil = this.seconds + RATTLE_SECONDS
        } else if (event.kind === SAND) this.puff(p.x, p.y, 3, CRUMB.sand, 30)
        else if (event.kind === MUD) this.puff(p.x, p.y, 2, CRUMB.mud, 25)
        // The turf and the bedrock do not give: a little dust, and that is all.
        else if (event.kind === ROCK) this.puff(p.x, p.y, 2, CRUMB.dust, 35)
      } else if (event.type === 'set' || event.type === 'landed') {
        const p = cellMiddle(event.cell, cols)
        const colour = event.kind === SAND ? CRUMB.sand : event.kind === MUD ? CRUMB.mud : CRUMB.dust
        this.puff(p.x, p.y + CELL / 2, event.kind === STONE ? 5 : 3, colour, event.kind === STONE ? 80 : 45)
        // A stone that is set down or has fallen is felt at the camp through the feet.
        if (event.kind === STONE && (event.type === 'set' || event.fell >= 1)) for (const camper of this.camp) this.startle(camper.id)
      } else if (event.type === 'called') {
        // Nothing to bite here: a little dust lifts off the floor under the finger, and the ant comes.
        const p = toStage(event.x, event.y)
        this.puff(p.x, p.y, 2, CRUMB.dust, 30)
      } else if (event.type === 'tapped') {
        // The ant taps a stone it passes: a spark off the stone, and a small shake.
        const p = cellMiddle(event.cell, cols)
        this.puff(p.x, p.y - CELL / 2, 1, CRUMB.spark, 90)
        this.rattleUntil = this.seconds + RATTLE_SECONDS * 0.6
      } else if (event.type === 'carrying') {
        // Sand leaks a thread of grains from the heap, mud lets a drop fall, a stone scrapes dust off the floor.
        const feet = toStage(event.x, event.y + 0.5), back = this.toy.antHeading.x < 0 ? 1 : -1
        if (event.kind === SAND) this.puff(feet.x + back * 10, feet.y - 40, 2, CRUMB.sand, 18)
        else if (event.kind === MUD) this.puff(feet.x - back * 58, feet.y - 10, 1, CRUMB.mud, 10)
        else this.puff(feet.x + back * 72, feet.y - 2, 2, CRUMB.dust, 30)
      }
    }
  }

  /** Plays this many seconds: crumbs fly and fall, the bell swings back to rest, the carried lump goes to the jaws. */
  advance(dt: number): void {
    this.seconds += dt
    for (const crumb of this.crumbs) {
      if (crumb.life <= 0) continue
      crumb.life -= dt
      crumb.vy += 520 * dt
      crumb.x += crumb.vx * dt
      crumb.y += crumb.vy * dt
    }
    this.bursts = this.bursts.filter((burst) => this.seconds - burst.at < burstSeconds(burst.effect))
    this.follow()
    // The bell is a damped spring about a slow sway of its own.
    this.swing += (-46 * this.sway - 2.4 * this.swing) * dt
    this.sway += this.swing * dt
    // When the finger lets go the ant sits back and looks at what it made, for a moment.
    const down = this.toy.finger !== null
    if (this.toy.finger) {
      this.asideCell = { x: Math.floor(this.toy.finger.x), y: Math.floor(this.toy.finger.y) }
      this.asideUntil = this.seconds + ASIDE_SECONDS
    }
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

  /** The ground that is shown now: the nest as built, the raid's copy, or that copy as the workers put it back. */
  ground(): Ground {
    return this.shownGround
  }

  /** The cells of the shown ground that changed since the last call, for the view's repaint. */
  drainDirty(): number[] {
    const dirty = this.dirty
    this.dirty = []
    return dirty
  }

  /** What the game and the raid say happened, turned into what is seen. */
  seeGame(events: readonly KingdomEvent[], raidEvents: readonly RaidEvent[]): void {
    const cols = this.k.game.ground.cols
    for (const event of events) {
      if (event.type === 'fired') {
        const index = this.k.game.machines.findIndex((m) => m.kind === event.machine), machine = this.k.game.machines[index]
        this.fired.set(index, this.seconds)
        if (machine) {
          // Smoke at the cannon's mouth, and the shake of the catapult's thread.
          const base = toStage(machine.x + 1, machine.y + 1), at = machine.kind === 'cannon' ? MUZZLE : ARM
          this.bursts.push({ effect: machine.kind === 'cannon' ? 'smoke' : 'twang', x: base.x + at.x * machine.facing, y: base.y + at.y, at: this.seconds, flip: machine.facing < 0 })
        }
      } else if (event.type === 'shotLanded') {
        const p = cellMiddle(event.cell, cols)
        this.bursts.push({ effect: event.shot === 'mud' ? 'splat' : 'puff', x: p.x, y: p.y, at: this.seconds, flip: false })
      } else if (event.type === 'shotHit') {
        // Sand bursts into a fan of grains, a stone throws sparks; mud takes the shot with its splat.
        const p = cellMiddle(event.cell, cols)
        if (event.kind === SAND) {
          this.bursts.push({ effect: 'sandBlast', x: p.x, y: p.y, at: this.seconds, flip: false })
          this.puff(p.x, p.y, 6, CRUMB.sand, 90)
        } else if (event.kind === STONE) this.puff(p.x, p.y, 4, CRUMB.spark, 160)
        else if (event.kind === MUD) this.puff(p.x, p.y, 3, CRUMB.mud, 40)
      } else if (event.type === 'tried') {
        const index = this.k.game.machines.findIndex((m) => m.kind === event.machine), machine = this.k.game.machines[index]
        if (machine) {
          const base = toStage(machine.x + 1, machine.y + 1), at = machine.kind === 'cannon' ? MUZZLE : ARM
          this.bursts.push({ effect: machine.kind === 'cannon' ? 'smoke' : 'twang', x: base.x + at.x * machine.facing, y: base.y + at.y, at: this.seconds, flip: machine.facing < 0 })
        }
      } else if (event.type === 'called') for (const camper of this.camp) this.startle(camper.id)
    }
    for (const event of raidEvents) {
      if (event.type === 'gave') {
        this.dirty.push(...event.cells)
        const p = cellMiddle(event.cells[0], cols)
        this.puff(p.x, p.y, 6, CRUMB.sand, 70)
      } else if (event.type === 'widened') {
        this.dirty.push(...event.cells)
        const p = cellMiddle(event.cells[0], cols)
        this.puff(p.x, p.y, 4, CRUMB.earth, 60)
      } else if (event.type === 'rolled') {
        const p = cellMiddle(event.cell, cols)
        this.puff(p.x, p.y + CELL / 2, 1, CRUMB.dust, 30)
      } else if (event.type === 'stopped') {
        const p = cellMiddle(event.cell, cols)
        this.puff(p.x, p.y, 4, event.by === SAND ? CRUMB.sand : event.by === MUD ? CRUMB.mud : CRUMB.spark, 80)
      } else if (event.type === 'stuck') {
        const p = cellMiddle(event.cell, cols)
        this.puff(p.x, p.y + CELL / 2, 3, CRUMB.mud, 30)
      }
    }
  }

  /** Follows which ground is shown, and puts back what a raid knocked down a cell at a time while the workers carry it. */
  private follow(): void {
    const k = this.k, built = k.game.ground, scene = k.scene
    // The file of a raid is kept no longer than the raid and its put-back.
    if (this.laidOut && this.laidOut.raid !== k.raid && this.laidOut.raid !== k.lastRaid) this.laidOut = null
    const camp = `${k.game.position}/${k.game.muster}`
    // The party at the log is laid out again when a raid and what follows it are over: the army sits out the ending.
    if (camp !== this.campFor && !k.raid && scene?.is !== 'putBack' && scene?.is !== 'ending') {
      this.campFor = camp
      this.camp = campers(k.party)
    }
    let shown = built
    if (k.raid) shown = k.raid.ground
    else if (scene?.is === 'putBack') {
      shown = scene.ground
      // As many cells are back as the scene is far along; each is copied from the nest as built.
      const back = Math.min(scene.cells.length, Math.floor((scene.t / (scene.length * PUT_BACK_BY)) * scene.cells.length))
      for (let n = 0; n < back; n++) {
        const cell = scene.cells[n]
        if (shown.cells[cell] !== built.cells[cell]) {
          shown.cells[cell] = built.cells[cell]
          this.dirty.push(cell)
        }
      }
    }
    // Every cell that is not as it was painted is painted again: a different ground is shown, or the one that is
    // shown has changed under a raid (a wall gave, a way was dug wider, a stone rolled, a shot came to lie).
    const painted = this.painted
    for (let i = 0; i < shown.cells.length; i++) {
      if (shown.cells[i] !== painted[i]) {
        painted[i] = shown.cells[i]
        this.dirty.push(i)
      }
    }
    this.shownGround = shown
  }

  private antFeet(): { x: number; y: number } {
    return toStage(this.toy.antAt.x, this.toy.antAt.y + 0.5)
  }

  /** The child's ant as a body on the stage, standing along its floor. */
  private antBox(): Box {
    const feet = this.antFeet()
    return bodyBox('ant', feet.x, feet.y)
  }

  /** Where the carried lump rides: by its kind. */
  private jaws(): { x: number; y: number } {
    const feet = this.antFeet(), rides = RIDES[this.toy.carried?.kind ?? -1] ?? JAWS
    return { x: feet.x + rides.x * (this.toy.antHeading.x < 0 ? -1 : 1), y: feet.y + rides.y }
  }

  private move(n: number): Move {
    while (this.moves.length <= n) this.moves.push({ second: false, dx: 0, dy: 0, turn: 0, sx: 1, sy: 1 })
    return this.moves[n]
  }

  /**
   * The party of a raid and its file at the log. Both stand from the bell to the end of the put-back, whatever the
   * position has moved on to since, so they are laid out once for each raid and kept.
   */
  private partyOf(raid: Raid): { party: Party; file: readonly Camper[] } {
    if (this.laidOut?.raid !== raid) {
      const party = raid.invaders.map((invader) => invader.kind)
      this.laidOut = { raid, party, file: partyFile(party) }
    }
    return this.laidOut
  }
  private laidOut: { raid: Raid; party: Party; file: readonly Camper[] } | null = null

  /** The pose of the habit a camper was asked for by a press, while it acts it out; null when it was not asked or is done. */
  private habitAsked(id: string, who: Mover): string | null {
    const at = this.asked.get(id), kind = HABIT_OF[who]
    if (at === undefined || kind === undefined || this.seconds - at >= HABIT_SECONDS) return null
    return habitPose(kind, (this.seconds - at) / HABIT_SECONDS, this.seconds - at)
  }

  /**
   * Where one of the kingdom's own stands this frame, and which way it faces: where it lives, unless it has to make
   * way. It steps aside from the cell under the finger, which is always that cell's and never its own, and from the
   * child's ant, turning its face away from it, so that its face is never under the ant. It stays on its own floor:
   * where the floor has no room to make way, it stays where it is. `x` is the middle of its feet in cell units,
   * `half` half its width in cells, `y` the row of its floor, `high` how many rows it stands in, and `radius` that
   * of its face in stage units.
   */
  private makeWay(x: number, half: number, y: number, high: number, radius: number, flip: boolean): { x: number; flip: boolean } {
    const ground = this.shownGround, toy = this.toy
    const pressed = this.asideCell && this.seconds < this.asideUntil && this.asideCell.y <= y && this.asideCell.y > y - high ? this.asideCell : null
    const ant = Math.floor(toy.antAt.y) === y ? toy.antAt.x : null
    // The least its middle may be from the ant's for its face to be clear of the ant's body, facing away.
    const apart = ant === null ? 0 : (BODY.ant.width / 2 + radius + 2 - (half * CELL - radius - 2)) / CELL
    const fits = (at: number) => (!pressed || at + half <= pressed.x || at - half >= pressed.x + 1) && (ant === null || Math.abs(at - ant) >= apart)
    if (fits(x)) return { x, flip: ant !== null && Math.abs(x - ant) < half + BODY.ant.width / 2 / CELL ? x < ant : flip }
    // The floor it stands on, from end to end.
    let from = Math.floor(x), to = Math.floor(x)
    const floor = (cx: number) => at(ground, cx, y) === OPEN && at(ground, cx, y + 1) !== OPEN
    while (floor(from - 1)) from--
    while (floor(to + 1)) to++
    let best: number | null = null
    const tries = [pressed ? pressed.x - half - 0.05 : x, pressed ? pressed.x + 1 + half + 0.05 : x, ant !== null ? ant - apart - 0.05 : x, ant !== null ? ant + apart + 0.05 : x, from + half, to + 1 - half]
    for (const at of tries) {
      if (at - half < from - 1e-6 || at + half > to + 1 + 1e-6 || !fits(at)) continue
      if (best === null || Math.abs(at - x) < Math.abs(best - x)) best = at
    }
    const stands = best ?? x
    return { x: stands, flip: ant !== null ? stands < ant : flip }
  }

  /**
   * What follows from the nest's ground and the kingdom alone: the floor of each chamber, the queen's seat, where the
   * workers stand apart and huddled, and the things on the walls for the glow-worms that are lit. All are kept from
   * frame to frame and worked out again when a cell of the ground changes or the kingdom is another one.
   */
  private roomsNow(): NonNullable<ToyDisplay['kept']> {
    const toy = this.toy, realm = toy.realm, kept = this.kept
    if (kept && kept.stamp === toy.groundStamp && kept.realm === realm) return kept
    const ground = toy.game.ground, floors = realm.chambers.map((room) => floorOf(ground, room))
    return (this.kept = { stamp: toy.groundStamp, realm, floors, throne: queenSeat(ground, realm.chambers, realm.queenRoom, floors), apart: null, huddled: null, things: null, lit: 0, open: false })
  }
  private kept: {
    stamp: number; realm: Toy['realm']; floors: Floor[]; throne: ReturnType<typeof queenSeat>
    apart: Standing[] | null; huddled: Standing[] | null
    things: ReturnType<typeof showFurnishings> | null; lit: number; open: boolean
  } | null = null

  /** One of a raid as an item: one who stands and waits fidgets as its kind does at the camp. */
  private shown(one: Shown, slot: number): Item {
    // One of the party who sits at the log answers a poke as it does before the raid: it is the same camper.
    const move = one.idle ? this.moveOf(`party${one.id}`, one.who, ((one.id + 1) * 0.37) % 1, slot) : null
    if (one.idle && one.id >= 0 && one.y <= GRASS_Y) one = { ...one, pose: this.habitAsked(`party${one.id}`, one.who) ?? one.pose }
    return { is: 'sprite', id: one.who === 'worker' || one.id < 0 ? '' : one.who === 'dungBall' ? `partyBall${one.id}` : `party${one.id}`, who: one.who, pose: one.pose, x: one.x, y: one.y, flip: one.flip, size: one.size, tall: 1, move, turn: one.turn }
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
    const k = this.k, scene = k.scene, cols = ground.cols
    // A kingdom with a chamber can be raided: the idle ladder then lights the drop as well, which calls the raid.
    const callable = glow > 0 && toy.realm.chambers.length > 0 && !k.raid && !scene
    // On the idle ladder the bell of a kingdom that can be raided sways by itself, and its drop catches the light.
    const sway = this.sway + Math.sin(this.seconds * 0.9) * 0.03 + (callable ? Math.sin(this.seconds * 3.1) * LADDER_SWAY * glow : 0)
    list.push({ is: 'drop', sway, glint: callable ? glow : 0 })
    // The roots that hang from the turf into what was dug right under it: they swing when a mouthful is dug near them.
    this.roots.length = 0
    const since = this.seconds - this.rootsShook.at
    for (let x = 0; x < cols; x++) {
      if (ground.cells[cols + x] !== OPEN || ground.cells[x] === OPEN) continue
      const near = Math.abs(x + 0.5 - this.rootsShook.x)
      const swing = since < ROOTS_SWING.seconds && near <= ROOTS_SWING.near ? 0.5 * (1 - since / ROOTS_SWING.seconds) * (1 - near / (ROOTS_SWING.near + 1)) * Math.sin(since * 16 + x) : 0
      for (const off of [0.3, 0.72]) this.roots.push({ x: GROUND.x + (x + off) * CELL, y: GROUND.y + CELL, swing: swing * (off < 0.5 ? 1 : -0.7) })
    }
    if (this.roots.length > 0) list.push({ is: 'roots', at: this.roots })
    // The party of a raid, or of the put-back after it, is shown by the raid; otherwise it stands in its file at the log.
    const raided = k.raid ?? (scene?.is === 'putBack' ? k.lastRaid : null)
    const ending = scene?.is === 'ending' ? scene : null
    const showing = scene?.is === 'showing' ? HABIT[scene.kind] : undefined
    const shownOut = showing ? this.camp.find((camper) => /^party\d+$/.test(camper.id) && camper.kind === showing.who)?.id : undefined
    // The dung beetle that is shown has its ball with it, at the pebbles.
    const shownBall = shownOut ? shownOut.replace('party', 'partyBall') : undefined
    for (const camper of this.camp) {
      const inFile = camper.id.startsWith('party')
      if (inFile && raided) continue
      // In the ending the dung fly is not at the log: it sits on the hill.
      if (ending && camper.kind === 'dungFly' && inFile) continue
      // The one a first showing shows is one of the party: it has stepped out to the front of the camp.
      if (camper.id === shownOut || camper.id === shownBall) continue
      const move = this.moveOf(camper.id, camper.kind, camper.phase, slot++)
      let x = camper.x, y = camper.y, pose = this.habitAsked(camper.id, camper.kind) ?? camper.poses[move.second ? 1 : 0]
      if (inFile && scene?.is === 'shrug' && camper.kind !== 'dungBall') {
        // To the mouth, a look down it, a shrug, and back to the file. A ball stays at the log; whoever sat on a
        // ball or rode a back gets down and walks on the grass, and a flier keeps its height.
        const n = Number(camper.id.slice(5)), u = scene.t / scene.length
        const there = MOUTH_STEP.x - n * 34
        const go = Math.min(1, u / 0.3), back = Math.min(1, Math.max(0, (u - 0.7) / 0.3))
        const away = back > 0 ? 1 - back : go
        x = camper.x + (there - camper.x) * away
        if (camper.kind !== 'fly' && camper.kind !== 'dungFly') y = camper.y + (GRASS_Y - camper.y) * Math.min(1, away * 4)
        pose = u > 0.3 && u < 0.7 ? SHRUG[camper.kind] ?? pose : pose
      }
      list.push({ is: 'sprite', id: camper.id, who: camper.kind, pose, x, y, flip: camper.flip, size: camper.size ?? 1, tall: 1, move, turn: 0 })
    }
    // The child's ant is drawn after everyone of a raid: one whose face it would lie over ducks.
    const antOver = [this.antBox()]
    if (raided && !k.raid && scene?.is === 'putBack') {
      // Those who got home by themselves sit in the file; the others are carried out.
      const laid = this.partyOf(raided)
      const home = showRaid(raided, laid.party, this.seconds, [], laid.file).filter((one) => one.id >= 0 && raided.invaders[one.id].state === 'home')
      for (const one of [...home, ...showCarriedOut(scene, raided, laid.party, antOver, laid.file)]) list.push(this.shown(one, slot++))
    }
    if (scene?.is === 'showing' && showing) {
      // The kind is caught out by its own habit at the front of the camp, once, large, where what catches it out is.
      const at = SHOWING_AT[showing.who]
      const move = this.move(slot++)
      const hop = pokeMove(showing.who, scene.t % POKE_SECONDS, Math.floor(scene.t / POKE_SECONDS), move)
      if (showing.who === 'dungBeetle') list.push({ is: 'sprite', id: shownBall ?? '', who: 'dungBall', pose: 'plain', x: SHOWN_BALL.x, y: SHOWN_BALL.y, flip: false, size: 1, tall: 1, move: null, turn: 0 })
      list.push({ is: 'sprite', id: shownOut ?? '', who: showing.who, pose: habitPose(scene.kind, scene.t / scene.length, scene.t), x: at.x, y: at.y, flip: false, size: at.size, tall: 1, move: hop, turn: 0 })
    }
    // The things on the back wall of the rooms, and the marks where a wall gave, lie behind everyone.
    // The floor of each chamber, her seat, the workers' places and the things on the walls follow from the ground
    // alone, and are kept from frame to frame until it changes.
    const realm = toy.realm, rooms = this.roomsNow(), floors = rooms.floors, throne = rooms.throne
    const queenSpan = throne && realm.queenRoom !== null ? { room: realm.queenRoom, from: throne.x - QUEEN_HALF * throne.fit, to: throne.x + QUEEN_HALF * throne.fit } : null
    // Once the kingdom is open a glow-worm is lit in every chamber; in the ending they are lit one by one, nearest the mouth first.
    const chambers = realm.chambers.length
    const open = k.game.ended && !k.awaitsEnding
    const lit = !open ? 0 : ending ? Math.max(0, Math.min(chambers, Math.ceil(((ending.t - ENDING.lightFrom) / (ENDING.lightTo - ENDING.lightFrom)) * chambers))) : chambers
    if (!rooms.things || rooms.lit !== lit || rooms.open !== open) {
      rooms.things = showFurnishings(ground, realm.chambers, lit, queenSpan, open, floors)
      rooms.lit = lit
      rooms.open = open
    }
    for (const thing of rooms.things) list.push({ is: 'thing', thing: thing.thing, x: thing.x, y: thing.y, lit: thing.lit })
    // The dung fly's leaf, hung on a stalk at the camp, once the ending is over.
    if (open && !ending) list.push({ is: 'thing', thing: 'leaf', x: LEAF_AT.x, y: LEAF_AT.y, lit: false })
    // A mark lies on a floor: under each cell that gave which has something firm beneath it.
    const marks = k.raid ? [] : showMarks(k.marks.filter((cell) => at(ground, cell % cols, Math.floor(cell / cols) + 1) !== OPEN), cols)
    marks.forEach((mark, n) => list.push({ is: 'effect', effect: n === 0 ? 'prints' : 'scuff', x: mark.x, y: mark.y, progress: 0.5, flip: false }))
    // The queen: wedged under the mouth while the kingdom has no chamber, and on the floor of the largest once it has.
    // While a raid runs the workers stand close together at the far end of their floor, and behind the queen in
    // her room: they are drawn before her then, and look out from either side of her.
    const huddled = k.raid !== null
    const workers = () => {
      const spots = huddled ? (rooms.huddled ??= workerSpots(ground, realm.chambers, realm.queenRoom, realm.workers, true, floors)) : (rooms.apart ??= workerSpots(ground, realm.chambers, realm.queenRoom, realm.workers, false, floors))
      spots.forEach((spot, n) => {
        const stands = this.makeWay(spot.x, BODY.worker.width / 2 / CELL, spot.y, 1, faceRadius('worker'), n % 2 === 1)
        const p = toStage(stands.x, spot.y + 1)
        const move = this.moveOf(`worker${n}`, 'worker', (n * 0.37) % 1, slot++)
        list.push({ is: 'sprite', id: '', who: 'worker', pose: move.second ? 'walk2' : 'walk', x: p.x, y: p.y, flip: stands.flip, size: 1, tall: 1, move, turn: 0 })
      })
    }
    if (huddled) workers()
    // While her move waits for another scene to end she is still where she was: on her old seat, or under the mouth.
    const stays = k.raid ? null : k.queenStays
    const seat = stays === 'mouth' ? null : (stays ?? throne)
    const queenMove = this.moveOf('queen', 'queen', 0, slot++)
    if (seat && scene?.is === 'moves') {
      // She is carried to her new room by two workers, complaining, tries each end of its floor, and sits.
      const u = scene.t / scene.length, carried = Math.min(1, u / MOVES.carried)
      const feet = scene.way.map((cell) => toStage((cell % cols) + 0.5, Math.floor(cell / cols) + 1))
      const home = toStage(seat.x, seat.y + 1)
      feet[feet.length - 1] = home
      if (carried < 1) {
        const at = alongWay(feet, carried)
        const kick = Math.floor(this.seconds * 5) % 2 === 0
        list.push({ is: 'sprite', id: '', who: 'worker', pose: kick ? 'walk' : 'walk2', x: at.x - 46 * seat.fit, y: at.y, flip: false, size: 1, tall: 1, move: null, turn: 0 })
        list.push({ is: 'sprite', id: 'queen', who: 'queen', pose: kick ? 'carried' : 'carried2', x: at.x, y: at.y - 12, flip: false, size: seat.fit, tall: 1, move: null, turn: 0 })
        list.push({ is: 'sprite', id: '', who: 'worker', pose: kick ? 'walk2' : 'walk', x: at.x + 46 * seat.fit, y: at.y, flip: true, size: 1, tall: 1, move: null, turn: 0 })
      } else {
        // Each end of the floor in turn, then her own place.
        const floor = floors[realm.queenRoom!]
        const half = QUEEN_HALF * seat.fit, ends = [toStage(floor.from + half, seat.y + 1), toStage(floor.to + 1 - half, seat.y + 1), home]
        const tries = Math.min(ends.length - 1, Math.floor(((u - MOVES.carried) / (1 - MOVES.carried)) * ends.length))
        list.push({ is: 'sprite', id: 'queen', who: 'queen', pose: tries < ends.length - 1 ? 'sit2' : 'sit', x: ends[tries].x, y: ends[tries].y, flip: false, size: seat.fit, tall: 1, move: queenMove, turn: 0 })
      }
    } else if (seat) {
      const stands = this.makeWay(seat.x, (BODY.queen.width / 2 / CELL) * seat.fit, seat.y, Math.ceil((BODY.queen.height * seat.fit) / CELL), faceRadius('queen', seat.fit), false)
      const p = toStage(stands.x, seat.y + 1)
      // In the ending she puts her egg down at last.
      const down = ending !== null && ending.t >= ENDING.egg
      // She dislikes guests: one that does its act in her room gets her whole opinion, eyebrows first, for as long as it is at it.
      const raid = k.raid
      const guest = raid ? raid.invaders.find((invader) => invader.state === 'acting' && roomOf(raid.ground, gaitOf(invader), invader.cell, raid.rooms) === raid.queenRoom) : undefined
      if (guest && raid) {
        const at = invaderAt(guest, cols)
        list.push({ is: 'sprite', id: 'queen', who: 'queen', pose: Math.floor(this.seconds * 3) % 2 === 0 ? 'glare' : 'glare2', x: p.x, y: p.y, flip: at.x < p.x, size: seat.fit, tall: 1, move: null, turn: 0 })
      } else list.push({ is: 'sprite', id: 'queen', who: 'queen', pose: down ? (queenMove.second ? 'eggDown2' : 'eggDown') : queenMove.second ? 'sit2' : 'sit', x: p.x, y: p.y, flip: stands.flip, size: seat.fit, tall: 1, move: queenMove, turn: 0 })
    } else {
      const p = toStage(WEDGED.x, WEDGED.y + 1)
      list.push({ is: 'sprite', id: 'queen', who: 'queen', pose: queenMove.second ? 'wedged2' : 'wedged', x: p.x, y: p.y, flip: false, size: QUEEN_WEDGED.size, tall: QUEEN_WEDGED.tall, move: queenMove, turn: 0 })
    }
    if (!huddled) workers()
    if (marks.length > 0) {
      // One worker stands by the place that gave worst, looking at it with its hands on its hips.
      const move = this.moveOf('hips', 'worker', 0.2, slot++)
      list.push({ is: 'sprite', id: '', who: 'worker', pose: 'hips', x: marks[0].x + 30, y: marks[0].y, flip: true, size: 1, tall: 1, move, turn: 0 })
    }
    if (scene?.is === 'putBack' && scene.cells.length > 0) {
      // Workers carry back what fell: one is at the cell that is being put back now, and one at the next.
      const at0 = Math.min(scene.cells.length - 1, Math.floor((scene.t / (scene.length * PUT_BACK_BY)) * scene.cells.length))
      for (const n of [at0, at0 + 1]) {
        if (n >= scene.cells.length) continue
        const p = cellMiddle(scene.cells[n], cols)
        list.push({ is: 'sprite', id: '', who: 'worker', pose: Math.floor(this.seconds * 6) % 2 === 0 ? 'carry' : 'walk2', x: p.x, y: p.y + CELL / 2, flip: n % 2 === 1, size: 1, tall: 1, move: null, turn: 0 })
        // What it carries back it holds over its head, where it is seen: the lump the child had built there.
        const lump = k.game.ground.cells[scene.cells[n]]
        if (lump === SAND || lump === MUD || lump === STONE) list.push({ is: 'lump', lump, x: p.x, y: p.y + CELL / 2 - BODY.worker.height - CELL / 2 - 2, drip: 0 })
      }
    }
    k.game.machines.forEach((machine, index) => {
      if (k.grabbed?.index === index) return
      const shown = showMachine(machine, k.reloading[index] ?? 0, this.seconds - (this.fired.get(index) ?? -9))
      if (scene?.is === 'arrives' && scene.machine === machine.kind) {
        // Two workers lower it down the mouth to where it will stand, and it fires once, empty, to show that it
        // works. They stand at the mouth, one at each lip: one on the grass, hands out over the hole, and the one on
        // the hill, who has put the spoil down to watch. Nobody goes down with it.
        const u = Math.min(1, scene.t / (scene.length * 0.6))
        const from = { x: MOUTH_X, y: GRASS_Y - 30 }
        shown.x = from.x + (shown.x - from.x) * u
        shown.y = from.y + (shown.y - from.y) * u
        shown.pose = scene.t > scene.length * TRIED_AT && scene.t < scene.length * TRIED_AT + FLUNG ? 'fired' : 'ready'
        list.push({ is: 'sprite', id: '', who: 'worker', pose: u < 1 && Math.floor(this.seconds * 4) % 2 === 0 ? 'carry' : 'walk', x: MOUTH_STEP.x - 14, y: GRASS_Y, flip: false, size: 1, tall: 1, move: null, turn: 0 })
      }
      list.push({ is: 'machine', kind: shown.kind, load: shown.load, pose: shown.pose, x: shown.x, y: shown.y, flip: shown.flip })
    })
    if (k.raid) {
      const laid = this.partyOf(k.raid)
      for (const one of showRaid(k.raid, laid.party, this.seconds, antOver, laid.file)) list.push(this.shown(one, slot++))
    }
    // The worker who carries the spoil stands on the hill, as high as the hill is.
    const hump = hillShape(this.hill).right
    const spoilMove = this.moveOf('spoil', 'worker', 0.6, slot++)
    // A mouthful dug: it catches the spoil at the mouth and trots it up to the top of the hill.
    const trot = Math.min(1, (this.seconds - this.spoilAt) / SPOIL_TROT)
    const top = { x: MOUTH_X + LIP + hump.reach * 0.32, y: GRASS_Y - hump.height + 3 }, lip = { x: MOUTH_X + LIP + 6, y: GRASS_Y }
    if (trot < 1 && scene?.is !== 'arrives') list.push({ is: 'sprite', id: '', who: 'worker', pose: Math.floor(this.seconds * 10) % 2 === 0 ? 'carry' : 'walk2', x: lip.x + (top.x - lip.x) * trot, y: lip.y + (top.y - lip.y) * trot, flip: false, size: 1, tall: 1, move: null, turn: 0 })
    else list.push({ is: 'sprite', id: '', who: 'worker', pose: spoilMove.second ? 'walk2' : 'carry', x: top.x, y: top.y, flip: true, size: 1, tall: 1, move: spoilMove, turn: 0 })
    if (ending) {
      // The dung fly sits on the hill beside the worker, who hands it a leaf: it wipes its eyes.
      const wiping = ending.t >= ENDING.leaf
      list.push({ is: 'sprite', id: this.camp.find((camper) => camper.kind === 'dungFly' && camper.id.startsWith('party'))?.id ?? '', who: 'dungFly', pose: wiping ? (Math.floor(this.seconds * 0.8) % 2 === 0 ? 'weep' : 'weep2') : 'down', x: MOUTH_X + LIP + hump.reach * 0.3 + 96, y: GRASS_Y, flip: true, size: 1, tall: 1, move: null, turn: 0 })
      // Dusk comes over the camp, and the army sits on its balls round a small glow.
      const dusk = Math.max(0, Math.min(1, (ending.t - ENDING.duskFrom) / (ENDING.duskTo - ENDING.duskFrom)))
      if (dusk > 0) list.push({ is: 'dusk', strength: dusk, x: GLOW_AT.x, y: GLOW_AT.y })
    }
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
    // On the idle ladder it looks out of the screen, then scratches at the earth beside it, where the glint is.
    const hint = glow > 0 && state === 'idle' ? demoDrag(ground, toy.game.ant) : null
    const scratches = hint !== null && Math.floor(this.seconds / LADDER_BEAT) % 2 === 1
    const pose =
      state === 'run' ? (Math.floor(this.seconds * 12) % 2 === 0 ? 'walk1' : 'walk2')
      : state === 'dig' || scratches ? 'dig'
      : state === 'carry' ? 'carry'
      : state === 'wait' ? 'wait'
      : cramped || antMove.second || hint !== null || this.seconds < this.lookUntil ? 'look' : 'stand'
    const flip = scratches ? toStage(hint!.from.x, 0).x < feet.x : toy.antHeading.x < 0
    if (state === 'dig' || scratches) antMove.dy = -Math.abs(Math.sin(this.seconds * 18)) * 2
    const rattles = this.seconds < this.rattleUntil
    if (rattles) antMove.dx = Math.sin(this.seconds * 70) * 2.2
    // It leans forward into the weight of a stone it drags.
    const drags = state === 'carry' && carried?.kind === STONE
    if (drags) antMove.turn = (flip ? -1 : 1) * 0.12
    list.push({ is: 'sprite', id: 'ant', who: 'ant', pose, x: feet.x, y: feet.y, flip, size: 1, tall: 1, move: state === 'idle' || state === 'dig' || rattles || drags ? antMove : null, turn: climbing ? (toy.antHeading.y > 0 ? 1 : -1) * (flip ? -1 : 1) * (Math.PI / 2) : 0 })
    // Mud hangs from the jaws in a drip that stretches and snaps back.
    if (carried && this.carriedAt) list.push({ is: 'lump', lump: carried.kind, x: this.carriedAt.x, y: this.carriedAt.y, drip: carried.kind === MUD ? 7 + 9 * Math.abs(Math.sin(this.seconds * 4.5)) : 0 })
    for (const flying of k.flying) {
      const shot = showShot(flying, cols)
      list.push({ is: 'effect', effect: shot.effect, x: shot.x, y: shot.y, progress: shot.progress, flip: shot.flip })
    }
    for (const burst of this.bursts) list.push({ is: 'effect', effect: burst.effect, x: burst.x, y: burst.y, progress: (this.seconds - burst.at) / burstSeconds(burst.effect), flip: burst.flip })
    const grabbed = k.grabbed, holding = k.holding
    if (grabbed && holding) {
      // A machine under the finger: where it would stand is shown as a soft pale patch, and it rides at the finger.
      const stand = k.standUnder()
      if (stand && grabbed.moved) {
        const p = toStage(stand.x + 1, stand.y)
        list.push({ is: 'stand', x: p.x, y: p.y })
      }
      const machine = k.game.machines[grabbed.index], at = grabbed.moved ? toStage(holding.x, holding.y + 0.5) : toStage(machine.x + 1, machine.y + 1)
      list.push({ is: 'machine', kind: machine.kind, load: machine.load, pose: 'ready', x: at.x, y: at.y, flip: grabbed.facing < 0 })
    }
    // Crumbs, one draw a colour.
    for (const group of this.groups.values()) group.length = 0
    for (const crumb of this.crumbs) {
      if (crumb.life <= 0) continue
      let group = this.groups.get(crumb.colour)
      if (!group) this.groups.set(crumb.colour, (group = []))
      group.push(crumb)
    }
    for (const [colour, group] of this.groups) if (group.length > 0) list.push({ is: 'crumbs', colour, at: group })
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
      if (callable) {
        const p = dropAt(sway)
        list.push({ is: 'glint', x: p.x, y: p.y, strength: glow * (0.6 + 0.4 * Math.sin(this.seconds * 4 + 4)) })
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
