import { DOOR, HEDGEHOG, JAY, NEST, NOSE, PUDDLE_SLOT, SPOTS, STONE_SPOT, TOAD_HOME, TOAD_RISE, WHEEL, type P } from './layout'
import { Play, type Speaker } from './play'
import { BOWL, BOWL_SLOT, ROOM_DOOR } from './room'
import { freshWorld } from './save'
import { drawn, indoors, toadRest } from './things'
import { createToy, moving, type Mover, type SoundEvent, type Toy, type ToySave } from './toy'
import { PAIRS, PLACES, THINGS, membersOf, placeOf, type ThingId } from './wood'

// For the tests: a scripted finger that plays the whole game through `Play`,
// the path the Mount hands every pointer event to, in frames of a fixed
// length on a surface the size of the stage. It reads no clock and takes no
// chance but the seed's, and hands every frame to whoever is watching.
// It is a script and not a child: it knows where everything is.

/** The surface the scripted finger plays on: the stage itself, so a stage point is a surface point. */
export const SURFACE = { width: 1180, height: 820 } as const

export type Heard = { at: number; event: SoundEvent }
export type Watch = (toy: Toy, doing: string) => void

/** A speaker that only writes down what it was asked, and when on the model's clock. */
export class Listener implements Speaker {
  heard: Heard[] = []
  sceneCuts: number[] = []
  closes: number[] = []
  now: () => number = () => 0
  play(events: readonly SoundEvent[]): void { for (const event of events) this.heard.push({ at: this.now(), event }) }
  cutScene(): void { this.sceneCuts.push(this.now()) }
  closeAll(): void { this.closes.push(this.now()) }
}

const BARE: P = { x: 590, y: 330 }
/** Where a dry, dull thing lies and nothing answers: the foot of the jay's tree. */
const PARK: readonly P[] = [{ x: 824, y: 470 }, { x: 906, y: 466 }, { x: 988, y: 470 }, { x: 826, y: 552 }, { x: 908, y: 550 }, { x: 988, y: 552 }]
/** The open path at the front. */
const PATH: P = { x: 416, y: 690 }

export class Finger {
  readonly toy: Toy
  readonly play: Play
  readonly ears = new Listener()
  readonly did: string[] = []
  /** Every motion that was seen under way, as mover and kind. */
  readonly seen = new Set<string>()
  frames = 0
  doing = 'load'
  private id = 0

  constructor(seed: number, private readonly fps: number, private readonly watch: Watch = () => {}, saved: ToySave = { ...freshWorld(null), finished: false }) {
    this.toy = createToy(saved, seed)
    this.play = new Play(this.ears)
    this.ears.now = () => this.toy.time
    this.play.load(this.toy)
  }

  private note(): void {
    for (const mover of Object.keys(this.toy.acts) as Mover[]) if (moving(this.toy, mover)) this.seen.add(`${mover.startsWith('thing:') || mover.startsWith('find:') || mover.startsWith('cover:') ? mover.split(':')[0] : mover}>${this.toy.acts[mover]!.kind}`)
    this.watch(this.toy, this.doing)
  }

  /** Plays `seconds` of the clock, frame by frame. */
  wait(seconds: number): void {
    const count = Math.round(seconds * this.fps)
    for (let i = 0; i < count; i++) { this.play.step(1 / this.fps); this.frames += 1; this.note() }
  }

  get busy(): boolean {
    const toy = this.toy
    return toy.scene !== null || toy.hand !== null || (Object.keys(toy.acts) as Mover[]).some((mover) => moving(toy, mover))
  }

  /** Waits until everything has come to rest, and a little longer. */
  rest(most = 14): void {
    for (let waited = 0; waited < most && this.busy; waited += 0.1) this.wait(0.1)
    this.wait(0.25)
  }

  down(at: P, doing: string): void {
    this.doing = doing
    this.id += 1
    this.play.down(this.id, at, SURFACE.width, SURFACE.height)
    this.did.push(doing)
    this.note()
  }

  up(): void {
    this.play.up(this.id)
    this.note()
  }

  tap(at: P, doing: string, held = 0.08): void {
    this.down(at, doing)
    this.wait(held)
    this.up()
  }

  /**
   * The working finger slides to `to` in `steps` reports, a frame after each. Left to itself a slide lasts a
   * third of a second and more, as a carry does: a shorter one is a slipped tap (rules.ts).
   */
  slide(from: P, to: P, steps = Math.max(8, Math.ceil(0.36 * this.fps))): void {
    for (let i = 1; i <= steps; i++) {
      this.play.move(this.id, { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }, SURFACE.width, SURFACE.height)
      this.wait(1 / this.fps)
    }
  }

  drag(from: P, to: P, doing: string): void {
    this.down(from, doing)
    this.wait(0.05)
    this.slide(from, to)
    this.up()
  }

  // --- Knowing where things are -------------------------------------------------------

  /** Brings a thing to where a finger can take it: out of the nest, out from under its cover, into the frame it lies in. */
  reach(thing: ThingId): P {
    const toy = this.toy
    for (let tries = 0; tries < 8; tries++) {
      const where = toy.things[thing]
      if (indoors(where) !== toy.room) { this.tap(toy.room ? ROOM_DOOR : DOOR, toy.room ? 'door out' : 'door in'); this.rest(); continue }
      if (where.at === 'nest') { this.tap(NEST, 'tip the nest'); this.rest(); continue }
      if (where.at === 'home') {
        const place = placeOf(thing, toy.season)
        if (!place) { this.tap(WHEEL, 'wheel'); this.rest(); continue }
        if (!toy.covers[place].open) { this.tap(SPOTS[place].shut, `open ${place}`); this.rest(); continue }
      }
      break
    }
    this.rest()
    const at = drawn(toy, thing)
    if (!at) throw new Error(`${thing} cannot be reached`)
    return at.at
  }

  /** Carries a thing from where it lies to a point, lets it go there, and waits for what follows. */
  put(thing: ThingId, to: P, doing: string): void {
    const from = this.reach(thing)
    this.drag(from, to, doing)
    this.rest()
  }

  /** A dull dry thing is put out of the way, at the foot of the jay's tree. */
  park(thing: ThingId): void {
    if (this.toy.things[thing].at === 'nest') return
    this.put(thing, PARK[THINGS.indexOf(thing)], `park ${thing}`)
  }

  ensureRolled(rolled: boolean): void {
    if (this.toy.room) { this.tap(ROOM_DOOR, 'door out'); this.rest() }
    if (this.toy.rolled === rolled) return
    if (rolled) { this.tap(HEDGEHOG, 'hedgehog rolls'); this.rest(); return }
    // He unrolls for the worm.
    this.put('worm', NOSE, 'worm before the ball')
  }

  toadHome(): void {
    const toy = this.toy
    if (toy.toadAt.at === 'stone') return
    const rest = toadRest(toy)
    if (rest.room !== toy.room) { this.tap(toy.room ? ROOM_DOOR : DOOR, 'door'); this.rest() }
    this.tap({ x: rest.feet.x, y: rest.feet.y - TOAD_RISE }, 'toad goes home')
    this.rest()
  }
}

/** The laps of the walk, in order. Each can be played by itself on a fresh game. */
export const LAPS = {
  /** Every cover opened, what is under it touched, shut and opened again, in each season; the animals, the nest, a knock, the wheel. */
  covers(f: Finger): void {
    for (let year = 0; year < 4; year++) {
      for (const place of PLACES) {
        f.tap(SPOTS[place].shut, `open ${place}`); f.wait(1.5)
        f.tap(SPOTS[place].find, `touch under ${place}`); f.wait(1.3)
        f.tap(SPOTS[place].away[0], `shut ${place}`); f.wait(1.4)
        f.tap(SPOTS[place].shut, `open ${place} again`); f.wait(1.2)
      }
      f.tap(HEDGEHOG, 'hedgehog'); f.wait(0.7)
      f.tap(HEDGEHOG, 'hedgehog again'); f.wait(0.7)
      f.tap(JAY, 'jay'); f.wait(0.4)
      f.tap({ x: TOAD_HOME.x, y: TOAD_HOME.y - TOAD_RISE }, 'toad'); f.wait(1.5)
      f.tap(NEST, 'nest'); f.wait(0.5)
      f.tap(BARE, 'knock'); f.wait(0.3)
      f.tap(WHEEL, 'wheel'); f.wait(0.25)
      // Touched while the year turns them shut: the turn is over at once.
      f.tap(SPOTS.stone.shut, 'cover in the turn'); f.wait(2)
      // Left alone for a while, as the idle ladder would find it.
      f.tap(BARE, 'knock'); f.wait(9)
    }
  },

  /** Each thing touched where it lies, then carried off, so the woodlouse moves in; one brought back home. */
  things(f: Finger): void {
    for (const thing of THINGS) {
      const at = f.reach(thing)
      f.tap(at, `touch ${thing}`); f.rest()
      const place = placeOf(thing, f.toy.season)
      f.park(thing)
      if (place && f.toy.covers[place].open) { f.tap(SPOTS[place].find, `touch the woodlouse under ${place}`); f.rest() }
    }
    // The snail goes back under its cover, if it has one this season.
    const home = placeOf('snail', f.toy.season)
    if (home) {
      if (!f.toy.covers[home].open) { f.tap(SPOTS[home].shut, `open ${home}`); f.rest() }
      f.put('snail', SPOTS[home].find, 'snail back home')
    }
  },

  /** Each thing set down before the hedgehog, unrolled and as a ball. */
  hedgehog(f: Finger): void {
    f.ensureRolled(false)
    for (const thing of THINGS) { f.put(thing, NOSE, `${thing} before the hedgehog`); if (thing !== 'worm') f.park(thing) }
    for (const thing of THINGS) {
      if (thing === 'worm') continue
      f.ensureRolled(true)
      f.put(thing, NOSE, `${thing} on the ball`)
      f.park(thing)
    }
    f.ensureRolled(true)
    f.put('worm', NOSE, 'worm before the ball')
  },

  /** Each dull thing set down on the open path, where the jay answers it; the button there, which he takes. */
  path(f: Finger): void {
    for (const thing of THINGS) { f.put(thing, PATH, `${thing} on the path`); f.park(thing) }
    f.tap(NEST, 'tip the nest'); f.rest()
  },

  /** Each thing set in the puddle, and then, wet, on open ground, where the jay takes it. */
  water(f: Finger): void {
    for (const thing of THINGS) {
      // The open water first, with nothing in it: rings where the finger is, and a plip.
      f.reach(thing)
      f.tap(PUDDLE_SLOT, 'the open water'); f.wait(0.8)
      f.put(thing, PUDDLE_SLOT, `${thing} in the puddle`)
      f.put(thing, PARK[THINGS.indexOf(thing)], `wet ${thing} on the ground`)
      f.wait(0.5)
      f.tap(NEST, 'tip the nest'); f.rest()
    }
  },

  /** Each thing set on the toad's stone: he leaps to where it came from, and one tap sends him home. */
  stone(f: Finger): void {
    for (const thing of THINGS) {
      f.toadHome()
      f.put(thing, STONE_SPOT, `${thing} on the stone`)
      f.toadHome()
      const at = f.reach(thing)
      f.drag(at, { x: at.x + 6, y: at.y - 60 }, `${thing} lifted and set back`); f.rest()
      f.park(thing)
      if (f.toy.things[thing].at === 'nest') { f.tap(NEST, 'tip the nest'); f.rest() }
    }
  },

  /** Everything sent in through the door, the room, every pair on the table, the bowl, and out again. */
  room(f: Finger): void {
    // Six things in a row fill the table: a pair needs room. So each thing has a place at the left, close
    // to the next, and the two of a pair are brought to the free end of the table and taken back after.
    const slot = (thing: ThingId): P => ({ x: 270 + 87 * (THINGS.length - 1 - THINGS.indexOf(thing)), y: 628 })
    const stage: P = { x: 800, y: 628 }
    for (const thing of THINGS) f.put(thing, DOOR, `${thing} through the door`)
    f.tap(DOOR, 'door in'); f.rest()
    for (const thing of [...THINGS].reverse()) {
      const at = f.reach(thing)
      f.tap(at, `touch ${thing} on the table`); f.rest()
      f.put(thing, slot(thing), `${thing} to its place`)
    }
    for (const pair of PAIRS) {
      const [first, second] = membersOf(pair)
      f.put(second, stage, `${second} to the free end`)
      f.put(first, { x: stage.x + 44, y: stage.y }, `${first} beside ${second}`)
      f.wait(0.5)
      f.put(first, slot(first), `${first} to its place`)
      f.put(second, slot(second), `${second} to its place`)
    }
    // The bowl: one thing floats, a second rolls off the table and out of the door; a tap on the water.
    f.put('acorn', BOWL_SLOT, 'acorn in the bowl')
    f.tap({ x: BOWL.x + 62, y: BOWL.y + 34 }, 'the bowl')
    f.put('apple', BOWL_SLOT, 'apple onto the full bowl')
    f.tap({ x: 590, y: 300 }, 'knock indoors'); f.rest()
    // Carried out of the door in the hand, to the toad's stone: he goes to sit where it came from, on the table.
    const at = f.reach('snail')
    f.down(at, 'snail carried out of the door'); f.wait(0.05)
    f.slide(at, ROOM_DOOR); f.wait(0.4)
    f.slide(ROOM_DOOR, STONE_SPOT, 12)
    f.up(); f.rest()
    f.tap(DOOR, 'door in'); f.rest()
    f.toadHome()
    f.tap(ROOM_DOOR, 'door out'); f.rest()
  },
} as const satisfies Record<string, (finger: Finger) => void>

/** The whole walk: every lap, one after the other, on one game. */
export function walk(seed: number, fps: number, watch: Watch = () => {}, saved?: ToySave): Finger {
  const finger = new Finger(seed, fps, watch, saved)
  for (const lap of Object.values(LAPS)) lap(finger)
  return finger
}
