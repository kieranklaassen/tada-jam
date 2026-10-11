import { sneezeIndoors, snore, type Face } from './answers'
import type { Note } from './audio'
import { CART, GNOMES, SEATS, SUN, SUN_DOWN_Y, handOn, inWater, kindAt, type GnomeId, type Kind } from './ground'
import { GHOST_TO } from './hint'
import type { Act } from './hint'
import type { Point } from './input'
import { leadsTo, meetings } from './paths'
import type { VillageSave } from './save'
import { aWalk, endScene } from './scenes'
import { bodyBox, boxesMeet, hatBox, stepAt, type Box } from './shapes'
import { clamp } from './spring'
import { mannerOf, type Manner } from './tastes'
import { drag, hasRoom, pause, press, release, stepHold } from './touch'
import { OWN, World, keyOf, type Change, type Fired, type Leaving, type Prop, type Ring, type SpeckInAir } from './world'

// The glade as the Mount and the view meet it: a finger goes in, game time
// goes in, and what to draw, which notes to play and whether to save come
// out. The village itself is in world.ts, what a finger does in touch.ts and
// the short scenes in scenes.ts.

export type { Change, Leaving, Prop, Ring, SpeckInAir } from './world'
export { DRIFT, OUT, OUT_AT_ONCE, ROOM } from './touch'

/** Seconds of quiet between two of the baker's walks for water, two sneezes indoors, two snores, two puffs of a chimney. */
export const EVERY = { fetch: 22, sneeze: 9, snore: 4.5, smoke: 2.6 } as const

export type MushroomShown = {
  id: number
  x: number
  y: number
  kind: Kind
  flip: boolean
  /** The size it is kept at, and the size it is seen at on its way there. */
  size: number
  seen: number
  squash: number
  swing: number
  puff: number
  pull: number
  door: boolean
  built: number
  glow: number
  /** Who shows in its window, how he carries himself there, and the push on him. */
  who: GnomeId | null
  manner: Manner | null
  jerk: number
  /** What a path that has reached a red mushroom leaves at its foot: a step under its door, or a pile against its stem. */
  stone: 'step' | 'pile' | null
}

export type GnomeShown = {
  where: 'log' | 'out' | 'home'
  x: number
  y: number
  scale: number
  facing: 1 | -1
  walked: number
  low: number
  sat: boolean
  fade: number
  asleep: boolean
  carries: boolean
  hands: boolean
  hatPull: number
  /** Out on the moss without his hat. */
  bare: boolean
  hop: number
  hatBend: number
  hatUp: number
  press: number
  rise: number
  lean: number
  nod: number
  face: Face | null
}

export type PebbleShown = { x: number; y: number; wet: boolean; up: number; turn: number }

export type Shown = {
  t: number
  mushrooms: readonly MushroomShown[]
  gnomes: Readonly<Record<GnomeId, GnomeShown>>
  pebbles: readonly PebbleShown[]
  /** Where two paths meet. */
  knots: readonly Point[]
  /** The tall gnome's hat on his doorstep: where it lies, how far it rocks, and which way its tip points, away from the door. */
  hat: { box: Box; rock: number; tip: 1 | -1 } | null
  cart: { x: number; hop: number } | null
  /** A door in the hand. */
  door: Point | null
  props: readonly Prop[]
  leaving: readonly Leaving[]
  specks: readonly SpeckInAir[]
  rings: readonly Ring[]
  frog: { x: number; y: number; up: number; squash: number } | null
  column: { x: number; y: number; up: number } | null
  sun: { y: number; spin: number; squash: number; cheeks: number; asleep: boolean }
  /** How far the night is painted over the sky, 0 to 1 from the top. */
  dark: number
  snail: { x: number; y: number; facing: 1 | -1; eyes: readonly [number, number]; squash: number; lamp: boolean; crawled: number }
  /** Where everyone is looking, as a point of the stage. */
  gaze: Point | null
  /** Where a finger presses the moss in, and how deep, 0 to 1. */
  dimple: { x: number; y: number; depth: number } | null
}


export class Village {
  private readonly w: World
  private readonly wet = new Map<string, boolean>()

  constructor(save: VillageSave, seed: number) {
    this.w = new World(save, seed)
  }

  // -------------------------------------------------------------- what the Mount asks

  /** What goes into storage: the village at rest, with a scene's end kept from its first beat. */
  toSave(): VillageSave {
    return this.w.toSave()
  }

  /** The notes queued since the last call, to be played as one voice. */
  takeNotes(): Note[] {
    const notes = this.w.notes
    this.w.notes = []
    return notes
  }

  /** The notes of the scene that is playing, queued since the last call: they go through the scene's own gain. */
  takeSceneNotes(): Note[] {
    const notes = this.w.sceneNotes
    this.w.sceneNotes = []
    return notes
  }

  /** Whether a scene was ended by a touch since the last call: what was still ringing of it is then silenced. */
  takeCut(): boolean {
    const cut = this.w.cut
    this.w.cut = false
    return cut
  }

  /** Whether the save changed since the last call: a step of swelling or a pebble is a small change, anything a put-away must find is saved at once. */
  takeChange(): Change {
    const change = this.w.change
    this.w.change = 'none'
    return change
  }

  /** Every beat that fired since the last call: what the sync test reads. */
  takeFired(): Fired[] {
    const fired = this.w.fired
    this.w.fired = []
    return fired
  }

  /**
   * A finger is on the glass, or what the child's touch set off is still going (a scene, an answer, a gnome on
   * his way back to the log): not an idle moment. What a villager does by himself (a snore, smoke, a sneeze
   * indoors, the baker's walk for water) is not the child's touch and never counts here, so the idle ladder
   * climbs through it.
   */
  get busy(): boolean {
    const w = this.w
    return w.hold !== null || (this.sceneRunning && !w.sceneOwn) || w.t < w.childUntil || w.leaving.length > 0 || w.walkers.length > 0 || w.props.some((prop) => prop.what !== 'hatOut')
  }

  /** A finger is drawing a path. That stroke survives a lifted finger: the Mount lets a lift during it wait, where any other lift is the end of the touch. */
  get drawing(): boolean {
    return this.w.hold?.on === 'stroke'
  }

  get sceneRunning(): boolean {
    return this.w.scene?.running ?? false
  }

  get count(): number {
    return this.w.mushrooms.length
  }

  set maxSpecks(most: number) {
    this.w.maxSpecks = most
  }

  hasRoom(x: number, y: number): boolean {
    return hasRoom(this.w, x, y)
  }

  /** Whether the ghost mushroom the idle hand shows could swell at a point without lying over a real one. */
  clearFor(x: number, y: number): boolean {
    if (!hasRoom(this.w, x, y)) return false
    const flip = false, kind = kindAt(x, y), ghost = bodyBox({ x, y, kind, size: GHOST_TO, flip })
    return !this.w.mushrooms.some((m) => boxesMeet(ghost, bodyBox(m)))
  }

  /** What the idle ladder may show next. */
  want(): Act {
    const w = this.w
    if (w.mushrooms.length === 0) return { act: 'grow' }
    const bare = [...w.mushrooms].filter((m) => !m.door).sort((a, b) => b.id - a.id)[0]
    const empty = w.mushrooms.filter((m) => m.door && !w.occupant(m)).sort((a, b) => a.id - b.id)[0]
    if (empty && w.waiting().length > 0) {
      const who = w.waiting().sort((a, b) => Math.abs(SEATS[a].x - empty.x) - Math.abs(SEATS[b].x - empty.x))[0]
      // The hand comes down on him and goes to the doorstep: copied exactly, that move lays pebbles from him to the door.
      return { act: 'path', from: handOn(who), to: stepAt(empty) }
    }
    if (w.cart.there && bare && w.waiting().length > 0 && !w.mushrooms.some((m) => m.door && !w.occupant(m))) return { act: 'door', from: { x: CART.x, y: CART.top + 30 }, to: { x: bare.x, y: bare.y - 20 } }
    if (w.mushrooms.length >= 3 && w.waiting().length === 0) return { act: 'sun', at: { x: SUN.x, y: w.night ? SUN_DOWN_Y - 40 : SUN.y } }
    return { act: 'grow' }
  }

  // -------------------------------------------------------------- a finger

  press(at: Point): void {
    press(this.w, at)
  }

  drag(at: Point): void {
    drag(this.w, at)
  }

  /** The finger let go: the end of a tap, a hold, a pull, a stroke or a carry, and the child's own doing. */
  lift(): void {
    release(this.w, true)
  }

  /** The finger has lifted from a stroke of pebbles, which waits for it to come back: the wait is seen. */
  wait(at: Point): void {
    pause(this.w, at)
  }

  /** The touch was taken away (the game was parked under it, or the browser took the finger): nothing is done in the child's name. */
  takeAway(): void {
    release(this.w, false)
  }

  /**
   * The game goes to rest: the touch is taken away, a scene that was playing ends where its outcome was kept,
   * and everything that is seen is put where the kept village says it is. What is found on return is then
   * exactly what a load of the save gives.
   */
  rest(): void {
    release(this.w, false)
    endScene(this.w)
    this.w.paths = this.w.paths.filter((path) => path.length > 0)
    this.w.land(true)
    this.w.notes = []
    this.w.sceneNotes = []
  }

  // -------------------------------------------------------------- game time

  step(dt: number): void {
    if (!(dt > 0)) return
    const w = this.w
    w.t += dt
    stepHold(w, dt)
    w.scene?.update(w.t)
    w.stepPlaying(dt)
    this.byItself(dt)
    w.stepSeen(dt)
  }

  /**
   * What goes on in the village with no finger on it (allowance for world-time events): a baker far from water
   * fetches some, the sneezy one sneezes in his puffball, at night the sleepy one snores and chimneys smoke.
   * Every count starts from nothing on load and stands still under a finger and during a scene, so none of it
   * rewards staying or is missed by leaving.
   */
  private byItself(dt: number): void {
    const w = this.w
    if (w.hold !== null || this.sceneRunning) return
    const at = (who: GnomeId) => (w.gnomes[who].where === 'home' ? w.houseOf(who) : undefined)
    const bakers = at('baker')
    if (bakers && bakers.kind !== 'bell' && (w.since.fetch += dt) >= EVERY.fetch) { w.since.fetch = 0; return aWalk(w, 'baker', true) }
    const sneezes = at('sneezy')
    if (sneezes && sneezes.kind === 'puff' && (w.since.sneeze += dt) >= EVERY.sneeze) { w.since.sneeze = 0; w.play(sneezeIndoors(), { mushroom: sneezes.id }, 0, OWN) }
    if (!w.night) return
    if ((w.since.snore += dt) >= EVERY.snore) { w.since.snore = 0; w.play(snore(), { gnome: 'sleepy' }, 0, OWN) }
    if ((w.since.smoke += dt) >= EVERY.smoke) {
      w.since.smoke = 0
      for (const m of w.mushrooms) if (m.kind === 'red' && m.door) w.throwSpecks({ what: 'smoke', count: 1, power: 0.4 }, w.topOf(m, true))
    }
  }

  // -------------------------------------------------------------- what is seen

  private isWet(p: Point): boolean {
    const key = keyOf(p)
    let wet = this.wet.get(key)
    if (wet === undefined) { wet = inWater(p.x, p.y); this.wet.set(key, wet) }
    return wet
  }

  /** What the view draws now. */
  show(): Shown {
    const w = this.w
    const gnomes = {} as Record<GnomeId, GnomeShown>
    for (const who of GNOMES) {
      const g = w.gnomes[who]
      gnomes[who] = {
        where: g.where, x: g.at.x, y: g.at.y, scale: g.scale, facing: g.facing, walked: g.walked, low: g.low, sat: g.sat, fade: g.fade, asleep: g.asleep, carries: g.carries, hands: g.hands,
        hatPull: g.hatPull, bare: g.bare, hop: g.hop.value, hatBend: g.hatBend.value, hatUp: g.hatUp.value, press: clamp(g.press.value, 0, 1.1), rise: g.rise.value, lean: g.lean.value, nod: g.nod.value, face: g.face,
      }
    }
    const mushrooms: MushroomShown[] = [...w.mushrooms].sort((a, b) => a.y - b.y || a.id - b.id).map((m) => {
      const who = GNOMES.find((g) => w.homes[g] === m.id && w.gnomes[g].where === 'home') ?? null
      return {
        id: m.id, x: m.x, y: m.y, kind: m.kind, flip: m.flip, size: m.size, seen: m.seen.value, squash: m.squash.value, swing: m.swing.value, puff: m.puff.value, pull: m.pull,
        door: m.door && m.doorSeen, built: clamp(m.built.value, 0, 1.15), glow: clamp(m.glow.value, 0, 1), who, manner: who ? mannerOf(who, w.facts(m)) : null, jerk: m.jerk.value,
        stone: m.kind === 'red' && leadsTo(w.paths, stepAt(m)) ? (m.door && m.doorSeen ? 'step' : 'pile') : null,
      }
    })
    const pebbles: PebbleShown[] = [], drawn = new Set<string>()
    w.paths.forEach((path, p) => path.forEach((point, i) => {
      const key = keyOf(point)
      if (drawn.has(key) || w.unlaid.has(key)) return
      drawn.add(key)
      let up = 0, turn = 0
      const seesaw = w.seesaw
      if (seesaw && seesaw.path === p) {
        const away = Math.abs(i - seesaw.index)
        up += seesaw.lift * Math.max(0, 1 - away / 10) ** 2 + seesaw.sink * (away === 0 ? -5 : away === 1 ? 5 : 0)
        turn += seesaw.lift * 0.02 * (i % 2 ? 1 : -1)
        // A path that has come loose is off the moss along its whole length, every pebble askew.
        if (seesaw.loose) { up += 9; turn += 0.5 * (i % 2 ? 1 : -1) }
      }
      for (const stir of w.stirs) {
        if (stir.x !== point.x || stir.y !== point.y) continue
        const a = Math.min(1, stir.age / 0.3)
        if (stir.move === 'land') up += 12 * (1 - Math.min(1, stir.age / 0.12)) ** 2 - 3 * Math.sin(Math.PI * a)
        else if (stir.move === 'hop') up += 16 * Math.sin(Math.PI * a)
        else if (stir.move === 'rise') up += 5 * Math.sin(Math.PI * a)
        else if (stir.move === 'sink') up -= 3 * Math.sin(Math.PI * a)
        else { turn += 6 * (1 - a); up += 4 * Math.sin(Math.PI * a) }
      }
      pebbles.push({ x: point.x, y: point.y, wet: this.isWet(point), up, turn })
    }))
    // The hat lies on the step from the moment he crawled in, and stays there while he is out on a walk.
    const hatHouse = w.hatSeen ? w.houseOf('tall') : undefined
    return {
      t: w.t,
      mushrooms,
      gnomes,
      pebbles,
      knots: meetings(w.paths).filter((p) => !w.unlaid.has(keyOf(p))),
      hat: hatHouse ? { box: hatBox(hatHouse), rock: w.hatRock.value, tip: hatBox(hatHouse).x0 >= hatHouse.x ? 1 : -1 } : null,
      cart: w.cart.there ? { x: w.cart.x, hop: w.cart.hop.value } : null,
      door: w.doorInHand,
      props: w.props,
      leaving: w.leaving,
      specks: w.specks,
      rings: w.rings,
      frog: w.frog ? { x: w.frog.x, y: w.frog.y, up: w.frog.up.value, squash: w.frog.squash.value } : null,
      column: w.column,
      sun: { y: SUN.y + (SUN_DOWN_Y - SUN.y) * w.sun.drop + (w.night ? -w.sun.pull : w.sun.pull), spin: w.sun.spin.value, squash: w.sun.squash.value, cheeks: clamp(w.sun.cheeks.value, 0, 1.2), asleep: w.night && w.sun.drop > 0.9 && w.sun.pull < 8 },
      dark: w.dark,
      snail: { x: w.snail.x, y: w.snail.y, facing: w.snail.facing, eyes: [clamp(w.snail.eyes[0].value, 0, 1), clamp(w.snail.eyes[1].value, 0, 1)], squash: w.snail.squash.value, lamp: w.snail.lamp, crawled: w.snail.crawled },
      gaze: w.finger ?? w.interest?.at ?? null,
      dimple: w.dimple.on ? { x: w.dimple.x, y: w.dimple.y, depth: clamp(w.dimple.depth.value, 0, 1) } : null,
    }
  }
}
