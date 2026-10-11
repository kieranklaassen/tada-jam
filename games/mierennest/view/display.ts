import { BODY, camperAt, campers, onBell, type Camper } from '../camp'
import { CELL, MUD, OPEN, SAND, STONE, at, type Ground, type Lump } from '../ground'
import { handPose, type Guidance, type HandPose } from '../guidance'
import { idleMove, pokeMove, POKE_SECONDS, type Move, type Mover } from '../motion'
import type { Kingdom, KingdomEvent } from '../kingdom'
import type { Party } from '../order'
import type { RaidEvent } from '../raid'
import type { Machine } from '../save'
import { WEDGED, demoDrag, queenSeat, workerSpots } from '../residents'
import { below, makeRng, type Rng } from '../rng'
import type { Toy, ToyEvent } from '../toy'
import { GRASS_Y, GROUND, MOUTH_X } from './layout'
import { BELL, LIP, dropAt, hillGrown, hillShape } from './props'
import { FLUNG, MOUTH_STEP, showCarriedOut, showFurnishings, showMachine, showMarks, showRaid, showShot, type Shown } from './raidShow'
import type { Effect, Thing } from './things'

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
export const DRAWS: Record<Item['is'], number> = { sprite: 1, lump: 2, hole: 1, target: 1, crumbs: 1, drop: 3, glint: 1, hand: 2, machine: 1, stand: 1, thing: 1, effect: 1, dusk: 3 }
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
/** What each kind does when the bell rang for nothing. */
const SHRUG: Partial<Record<Mover, string>> = { raider: 'shrug', beetle: 'sit', fly: 'peer', dungBeetle: 'lost', dungFly: 'arms' }
/** How each kind is caught out by its own habit in its first showing: the creature and the two poses it flicks between. */
const SHOWN_AS: Record<string, { who: Mover; poses: readonly [string, string] }> = {
  ant: { who: 'raider', poses: ['stuck', 'stuck2'] },
  beetle: { who: 'beetle', poses: ['onBack', 'onBack2'] },
  fly: { who: 'fly', poses: ['bump', 'peer'] },
  dungBeetle: { who: 'dungBeetle', poses: ['heave', 'lost'] },
  dungFly: { who: 'dungFly', poses: ['point', 'arms'] },
}
/** Where a first showing is played: in front of the camp, to the left of the log, half as large again. */
export const SHOWING_AT = { x: 250, y: GRASS_Y, size: 1.5 } as const
/** How long a puff or a splat is seen where a shot landed, and the smoke and the twang of a machine that fired, in seconds. */
export const BURST_SECONDS = 0.45
const BURST: Partial<Record<Effect, number>> = { smoke: 0.7, twang: 0.4 }
const burstSeconds = (effect: Effect) => BURST[effect] ?? BURST_SECONDS
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

const toStage = (cx: number, cy: number) => ({ x: GROUND.x + cx * CELL, y: GROUND.y + cy * CELL })
const cellMiddle = (cell: number, cols: number) => toStage((cell % cols) + 0.5, Math.floor(cell / cols) + 0.5)

export class ToyDisplay {
  /** Seconds of game time this display has played. */
  seconds = 0
  camp: Camper[]
  private campFor = ''
  private readonly toy: Toy
  private shownGround: Ground
  private dirty: number[] = []
  private readonly fired = new Map<number, number>()
  private bursts: { effect: Effect; x: number; y: number; at: number; flip: boolean }[] = []
  private readonly rng: Rng
  /** Every crumb there can be, made once: one in the air has life left. */
  private readonly crumbs: Crumb[] = Array.from({ length: MOST_CRUMBS }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 2, colour: '' }))
  private readonly groups = new Map<string, Crumb[]>()
  private readonly poked = new Map<string, { at: number; count: number }>()
  private sway = 0
  private swing = 0
  private carriedAt: { x: number; y: number } | null = null
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private wasDown = false
  private lookUntil = -1
  private readonly moves: Move[] = []

  constructor(private readonly k: Kingdom, seed = 1) {
    this.toy = k.toy
    this.camp = campers(k.party)
    this.campFor = `${k.game.position}/${k.game.muster}`
    this.shownGround = k.game.ground
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
      } else if (event.type === 'stuck') {
        const p = cellMiddle(event.cell, cols)
        this.puff(p.x, p.y + CELL / 2, 3, CRUMB.mud, 30)
      }
    }
  }

  /** Follows which ground is shown, and puts back what a raid knocked down a cell at a time while the workers carry it. */
  private follow(): void {
    const k = this.k, built = k.game.ground, scene = k.scene
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
      const back = Math.min(scene.cells.length, Math.floor((scene.t / (scene.length * 0.8)) * scene.cells.length))
      for (let n = 0; n < back; n++) {
        const cell = scene.cells[n]
        if (shown.cells[cell] !== built.cells[cell]) {
          shown.cells[cell] = built.cells[cell]
          this.dirty.push(cell)
        }
      }
    }
    if (shown !== this.shownGround) {
      // A different ground is shown: every cell that differs from the one shown before is repainted.
      for (let i = 0; i < shown.cells.length; i++) if (shown.cells[i] !== this.shownGround.cells[i]) this.dirty.push(i)
      this.shownGround = shown
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

  /** The party of the raid that runs, or of the one whose put-back plays: the position may have moved on since. */
  private get raidParty(): Party {
    const raid = this.k.raid ?? this.k.lastRaid
    return raid ? raid.invaders.map((invader) => invader.kind) : this.k.party
  }

  /** One of a raid as an item: one who stands and waits fidgets as its kind does at the camp. */
  private shown(one: Shown, slot: number): Item {
    const move = one.idle ? idleMove(one.who, this.seconds, ((one.id + 1) * 0.37) % 1, this.move(slot)) : null
    return { is: 'sprite', who: one.who, pose: one.pose, x: one.x, y: one.y, flip: one.flip, size: one.size, tall: 1, move, turn: one.turn }
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
    const sway = this.sway + Math.sin(this.seconds * 0.9) * 0.03
    list.push({ is: 'drop', sway, glint: callable ? glow : 0 })
    // The party of a raid, or of the put-back after it, is shown by the raid; otherwise it stands in its file at the log.
    const raided = k.raid ?? (scene?.is === 'putBack' ? k.lastRaid : null)
    const ending = scene?.is === 'ending' ? scene : null
    const showing = scene?.is === 'showing' ? SHOWN_AS[scene.kind] : undefined
    const shownOut = showing ? this.camp.find((camper) => camper.id.startsWith('party') && camper.kind === showing.who)?.id : undefined
    for (const camper of this.camp) {
      const inFile = camper.id.startsWith('party')
      if (inFile && raided) continue
      // In the ending the dung fly is not at the log: it sits on the hill.
      if (ending && camper.kind === 'dungFly' && inFile) continue
      // The one a first showing shows is one of the party: it has stepped out to the front of the camp.
      if (camper.id === shownOut) continue
      const move = this.moveOf(camper.id, camper.kind, camper.phase, slot++)
      let x = camper.x, pose = camper.poses[move.second ? 1 : 0]
      if (inFile && scene?.is === 'shrug') {
        // To the mouth, a look down it, a shrug, and back to the file.
        const n = Number(camper.id.slice(5)), u = scene.t / scene.length
        const there = MOUTH_STEP.x - n * 34
        const go = Math.min(1, u / 0.3), back = Math.min(1, Math.max(0, (u - 0.7) / 0.3))
        x = back > 0 ? there + (camper.x - there) * back : camper.x + (there - camper.x) * go
        pose = u > 0.3 && u < 0.7 ? SHRUG[camper.kind] ?? pose : pose
      }
      list.push({ is: 'sprite', who: camper.kind, pose, x, y: camper.y, flip: camper.flip, size: camper.size ?? 1, tall: 1, move, turn: 0 })
    }
    if (raided && !k.raid && scene?.is === 'putBack') {
      // Those who got home by themselves sit in the file; the others are carried out.
      const home = showRaid(raided, this.raidParty, this.seconds).filter((one) => one.id >= 0 && raided.invaders[one.id].state === 'home')
      for (const one of [...home, ...showCarriedOut(scene, raided, this.raidParty)]) list.push(this.shown(one, slot++))
    }
    if (scene?.is === 'showing') {
      // The kind is caught out by its own habit at the front of the camp, once, large.
      const show = SHOWN_AS[scene.kind]
      if (show) {
        const move = this.move(slot++)
        const hop = pokeMove(show.who, scene.t % POKE_SECONDS, Math.floor(scene.t / POKE_SECONDS), move)
        list.push({ is: 'sprite', who: show.who, pose: show.poses[Math.floor(scene.t * 2.4) % 2], x: SHOWING_AT.x, y: SHOWING_AT.y, flip: false, size: SHOWING_AT.size, tall: 1, move: hop, turn: 0 })
      }
    }
    // The things on the back wall of the rooms, and the marks where a wall gave, lie behind everyone.
    const throne = queenSeat(ground, toy.realm.chambers, toy.realm.queenRoom)
    const queenSpan = throne && toy.realm.queenRoom !== null ? { room: toy.realm.queenRoom, from: throne.x - 2.2 * throne.fit, to: throne.x + 2.2 * throne.fit } : null
    // Once the kingdom is open a glow-worm is lit in every chamber; in the ending they are lit one by one, nearest the mouth first.
    const rooms = toy.realm.chambers.length
    const open = k.game.ended && !k.awaitsEnding
    const lit = !open ? 0 : ending ? Math.max(0, Math.min(rooms, Math.ceil(((ending.t - ENDING.lightFrom) / (ENDING.lightTo - ENDING.lightFrom)) * rooms))) : rooms
    for (const thing of showFurnishings(ground, toy.realm.chambers, lit, queenSpan, open)) list.push({ is: 'thing', thing: thing.thing, x: thing.x, y: thing.y, lit: thing.lit })
    // The dung fly's leaf, hung on a stalk at the camp, once the ending is over.
    if (open && !ending) list.push({ is: 'thing', thing: 'leaf', x: LEAF_AT.x, y: LEAF_AT.y, lit: false })
    // A mark lies on a floor: under each cell that gave which has something firm beneath it.
    const marks = k.raid ? [] : showMarks(k.marks.filter((cell) => at(ground, cell % cols, Math.floor(cell / cols) + 1) !== OPEN), cols)
    marks.forEach((mark, n) => list.push({ is: 'effect', effect: n === 0 ? 'prints' : 'scuff', x: mark.x, y: mark.y, progress: 0.5, flip: false }))
    // The queen: wedged under the mouth while the kingdom has no chamber, and on the floor of the largest once it has.
    const realm = toy.realm
    // While a raid runs the workers stand close together at the far end of their floor, and behind the queen in
    // her room: they are drawn before her then, and look out from either side of her.
    const huddled = k.raid !== null
    const workers = () => {
      workerSpots(ground, realm.chambers, realm.queenRoom, realm.workers, huddled).forEach((spot, n) => {
        const p = toStage(spot.x, spot.y + 1)
        const move = this.moveOf(`worker${n}`, 'worker', (n * 0.37) % 1, slot++)
        list.push({ is: 'sprite', who: 'worker', pose: move.second ? 'walk2' : 'walk', x: p.x, y: p.y, flip: n % 2 === 1, size: 1, tall: 1, move, turn: 0 })
      })
    }
    if (huddled) workers()
    const seat = queenSeat(ground, realm.chambers, realm.queenRoom)
    const queenMove = this.moveOf('queen', 'queen', 0, slot++)
    if (seat) {
      const p = toStage(seat.x, seat.y + 1)
      // In the ending she puts her egg down at last.
      const down = ending !== null && ending.t >= ENDING.egg
      list.push({ is: 'sprite', who: 'queen', pose: down ? (queenMove.second ? 'eggDown2' : 'eggDown') : queenMove.second ? 'sit2' : 'sit', x: p.x, y: p.y, flip: false, size: seat.fit, tall: 1, move: queenMove, turn: 0 })
    } else {
      const p = toStage(WEDGED.x, WEDGED.y + 1)
      list.push({ is: 'sprite', who: 'queen', pose: queenMove.second ? 'wedged2' : 'wedged', x: p.x, y: p.y, flip: false, size: QUEEN_WEDGED.size, tall: QUEEN_WEDGED.tall, move: queenMove, turn: 0 })
    }
    if (!huddled) workers()
    if (marks.length > 0) {
      // One worker stands by the place that gave worst, looking at it with its hands on its hips.
      const move = this.moveOf('hips', 'worker', 0.2, slot++)
      list.push({ is: 'sprite', who: 'worker', pose: 'hips', x: marks[0].x + 30, y: marks[0].y, flip: true, size: 1, tall: 1, move, turn: 0 })
    }
    if (scene?.is === 'putBack' && scene.cells.length > 0) {
      // Workers carry back what fell: one is at the cell that is being put back now, and one at the next.
      const at0 = Math.min(scene.cells.length - 1, Math.floor((scene.t / (scene.length * 0.8)) * scene.cells.length))
      for (const n of [at0, at0 + 1]) {
        if (n >= scene.cells.length) continue
        const p = cellMiddle(scene.cells[n], cols)
        list.push({ is: 'sprite', who: 'worker', pose: Math.floor(this.seconds * 6) % 2 === 0 ? 'carry' : 'walk2', x: p.x, y: p.y + CELL / 2, flip: n % 2 === 1, size: 1, tall: 1, move: null, turn: 0 })
        // What it carries back it holds over its head, where it is seen: the lump the child had built there.
        const lump = k.game.ground.cells[scene.cells[n]]
        if (lump === SAND || lump === MUD || lump === STONE) list.push({ is: 'lump', lump, x: p.x, y: p.y + CELL / 2 - BODY.worker.height - CELL / 2 - 2 })
      }
    }
    k.game.machines.forEach((machine, index) => {
      if (k.grabbed?.index === index) return
      const shown = showMachine(machine, k.reloading[index] ?? 0, this.seconds - (this.fired.get(index) ?? -9))
      if (scene?.is === 'arrives' && scene.machine === machine.kind) {
        // The workers lower it down the mouth to where it will stand, and fire it once to see.
        const u = Math.min(1, scene.t / (scene.length * 0.6))
        const from = { x: MOUTH_X, y: GRASS_Y - 30 }
        shown.x = from.x + (shown.x - from.x) * u
        shown.y = from.y + (shown.y - from.y) * u
        shown.pose = scene.t > scene.length * 0.75 && scene.t < scene.length * 0.75 + FLUNG ? 'fired' : 'ready'
        list.push({ is: 'sprite', who: 'worker', pose: 'carry', x: shown.x - 44, y: shown.y, flip: false, size: 1, tall: 1, move: null, turn: 0 })
        list.push({ is: 'sprite', who: 'worker', pose: 'walk', x: shown.x + 44, y: shown.y, flip: true, size: 1, tall: 1, move: null, turn: 0 })
      }
      list.push({ is: 'machine', kind: shown.kind, load: shown.load, pose: shown.pose, x: shown.x, y: shown.y, flip: shown.flip })
    })
    if (k.raid) for (const one of showRaid(k.raid, this.raidParty, this.seconds)) list.push(this.shown(one, slot++))
    // The worker who carries the spoil stands on the hill, as high as the hill is.
    const hump = hillShape(this.hill).right
    const spoilMove = this.moveOf('spoil', 'worker', 0.6, slot++)
    list.push({ is: 'sprite', who: 'worker', pose: spoilMove.second ? 'walk2' : 'carry', x: MOUTH_X + LIP + hump.reach * 0.32, y: GRASS_Y - hump.height + 3, flip: true, size: 1, tall: 1, move: spoilMove, turn: 0 })
    if (ending) {
      // The dung fly sits on the hill beside the worker, who hands it a leaf: it wipes its eyes.
      const wiping = ending.t >= ENDING.leaf
      list.push({ is: 'sprite', who: 'dungFly', pose: wiping ? (Math.floor(this.seconds * 0.8) % 2 === 0 ? 'weep' : 'weep2') : 'down', x: MOUTH_X + LIP + hump.reach * 0.3 + 96, y: GRASS_Y, flip: true, size: 1, tall: 1, move: null, turn: 0 })
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
    for (const flying of k.flying) {
      const shot = showShot(flying, cols)
      list.push({ is: 'effect', effect: shot.effect, x: shot.x, y: shot.y, progress: shot.progress, flip: shot.flip })
    }
    for (const burst of this.bursts) list.push({ is: 'effect', effect: burst.effect, x: burst.x, y: burst.y, progress: (this.seconds - burst.at) / burstSeconds(burst.effect), flip: burst.flip })
    const grabbed = k.grabbed, holding = k.holding
    if (grabbed && holding) {
      // A machine under the finger: where it would stand is outlined, and it rides at the finger.
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
