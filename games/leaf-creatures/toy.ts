import { Air } from './air'
import { Cast } from './cast'
import { ACORN_REACH, CAST, CORNER, GROUND, HEAPS, HEAP_REACH, ontoGround } from './clearing'
import { keepIn, needOf } from './reach'
import { EXIT_Y } from './travel'
import { STAGE } from './stage'
import { MAX_CREATURES, MAX_LOOSE } from './config'
import { about, facing, newCreature, type Creature } from './creatures'
import { stepHand, type Hand } from './hand'
import { meet, type World } from './meet'
import { MANNERS, SHAPES, type Kind } from './parts'
import { LOOKS } from './pen'
import { makeRng, type Rng } from './rng'
import { read, write, type Saved, type SavedAcorn, type SavedThing } from './save'
import type { Scene } from './scene'
import { PUSH, acornBeats, begin, wakingBeats, type SceneKind } from './scenes'
import { caps, newPart, placed, radius, recentre, wayOf, type Part, type Thing } from './things'
import * as touching from './touching'
import { stepCreature } from './travel'
import type { Asked, VoiceKey } from './voices'

// The clearing as it is played. A finger lifts a part from a heap or from
// where it lies, carries it, and presses it on; two caps on one thing wake
// it; what is awake is poked, stroked, bedded down and taken apart. Every
// act is answered in the call that makes it, and every sound is asked for in
// the step in which its motion happens. What a finger does is in
// touching.ts, the scenes are in scenes.ts; the view draws what is here and
// the Mount plays what `asked` holds. Nothing here draws, reads a clock or
// makes a sound.

const DEG = Math.PI / 180

/** A finger on a creature: where it is, how far it has stroked along it, and whether the touch has done what it does. */
export type Grip = { creature: Creature; index: number; x: number; y: number; stroked: number; spent: boolean; /** The finger landed on an eye. */ onEye: boolean; /** It has slid off the creature with that eye stretched after it. */ out: boolean }

/** The creature that walked off last. It waits behind the trees at the edge it left by; `creature` is its body while it is still on its way there. */
export type Away = { thing: Thing; side: -1 | 1; creature: Creature | null }

/** The most creatures that can be on their way off at once: the one that walks, and two that bolt before it. */
export const MOST_LEAVING = 3
/** How far inside the stage the foremost part of a creature is when it starts back from behind the trees. */
export const IN_SIGHT = 40

/** An acorn as it is shown, which a scene takes beat by beat to where it is saved. */
export type AcornShown = { x: number; y: number; /** 0 under the earth, 1 out. */ out: number; hop: number; dust: number; spin: number }

export class Toy {
  /** Everything that lies on the clearing, creatures included, but not a creature that is walking off for good. */
  readonly things: Thing[] = []
  /** The things that are awake, each with its body; one that is leaving is only here. */
  readonly creatures: Creature[] = []
  readonly cast = new Cast()
  readonly air = new Air()
  /** How far each heap has sunk or sprung, and how fast it is moving. */
  readonly heaps = Object.fromEntries(Object.keys(HEAPS).map((kind) => [kind, { squash: 0, speed: 0 }])) as Record<Kind, { squash: number; speed: number }>
  /** The three acorns as they are saved, and as they are shown. */
  readonly acorns: SavedAcorn[]
  readonly acornShown: AcornShown[]
  hand: Hand | null = null
  grip: Grip | null = null
  /** The finger on the ground, calling the creatures. */
  finger: { x: number; y: number } | null = null
  /** Marks a finger left on the ground, fading. */
  readonly scuffs: { x: number; y: number; age: number }[] = []
  /** The creature whose eyes came off, while its parts leave it: it is no longer one of the things. */
  ghost: Creature | null = null
  scene: Scene | null = null
  sceneKind: SceneKind | null = null
  /** The sounds asked for since the Mount last played them. */
  asked: Asked[] = []
  /** A touch has ended a scene: the Mount silences what the scene was sounding, and clears this. */
  hush = false
  /** What changed since the Mount last saved: 0 nothing, 1 something small, 2 something to save at once. */
  changed: 0 | 1 | 2 = 0
  /** Seconds of play, for whatever in the view only sways. */
  time = 0
  /** Whether a finger has landed in this visit: until then nothing sounds and nothing begins. */
  touched = false
  /** The thing never woken that the child last added to. */
  focus: Thing | null = null
  /** The creature that walked off last, or null. */
  away: Away | null = null
  /** Eyes that waited behind the trees and are gone for good now another waits: they shut and are not seen again. */
  left: { side: -1 | 1; age: number; looks: number[] } | null = null
  /** Where the finger last was, for a creature's eyes. */
  lastTouch: { x: number; y: number; age: number } | null = null
  /** What last answered the child: the three who watch look at it, never at the finger. Anything with a place. */
  heed: { at: { x: number; y: number }; age: number } | null = null
  /** The creature the toad croaked or started at: its eyes are on that one. */
  toadAt: { at: { x: number; y: number }; age: number } | null = null
  /** The slitherers the toad has croaked at and that are still near it: it croaks once for each as it wakes or comes near. */
  readonly greeted = new Set<Creature>()
  /** The runners the toad has started at since each last came near the stump. */
  readonly glaredAt = new Set<Creature>()
  /** How many parts have been laid in this visit, to tell which was laid longest ago. */
  laid = 0
  stirred = false
  nextId = 1
  order = 0
  readonly rng: Rng
  readonly airRng: Rng
  private readonly seed: number
  private readonly position: string
  private readonly world: World

  constructor(saved: Saved, visitSeed: number) {
    this.seed = saved.seed; this.position = saved.position
    this.acorns = saved.acorns.map((acorn) => ({ ...acorn }))
    this.acornShown = this.acorns.map((acorn) => ({ x: acorn.x, y: acorn.y, out: acorn.dug ? 1 : 0, hop: 0, dust: 0, spin: 0 }))
    this.rng = makeRng(visitSeed ^ 0x1eaf)
    this.airRng = makeRng(visitSeed ^ 0xa172)
    for (const kept of saved.things) {
      const thing: Thing = { id: kept.id, x: kept.x, y: kept.y, turn: kept.turn * DEG, awake: kept.awake, woke: kept.woke, drowsy: kept.drowsy, bedded: kept.bedded, parts: kept.parts.map((part, i) => newPart(part.kind, part.x, part.y, part.turn * DEG, (kept.id + i) % LOOKS)) }
      // What is found is taken to have been laid in the order it is kept in.
      for (const part of thing.parts) part.order = ++this.laid
      this.things.push(thing)
      this.nextId = Math.max(this.nextId, kept.id + 1)
      this.order = Math.max(this.order, kept.woke)
      // A creature is found awake where it stood: nothing wakes a second time.
      if (thing.awake) this.creatures.push(newCreature(thing, true))
      if (!thing.awake && kept.id === saved.focus) this.focus = thing
    }
    const waits = saved.waiting
    if (waits) {
      const kept = waits.thing
      this.away = { side: waits.side, creature: null, thing: { id: kept.id, x: kept.x, y: kept.y, turn: kept.turn * DEG, awake: true, woke: kept.woke, drowsy: false, bedded: false, parts: kept.parts.map((part, i) => newPart(part.kind, part.x, part.y, part.turn * DEG, (kept.id + i) % LOOKS)) } }
      this.nextId = Math.max(this.nextId, kept.id + 1)
      this.order = Math.max(this.order, kept.woke)
    }
    // A slitherer found near the toad was croaked at before the game was put away.
    for (const creature of this.creatures) if (this.nearToad(creature)) this.greeted.add(creature)
    this.cast.toad.again = 3
    const toy = this
    this.world = {
      finger: null, holdStill: false, lookAt: null, chance: () => this.rng.next(), creatures: this.creatures, acorns: this.acorns,
      free: (x, y, who) => toy.free(x, y, who), hideAt: { x: GROUND.x + GROUND.rx - 44, y: GROUND.y + 64 },
    }
  }

  /** Asks for a sound, in the step or the touch of its motion. Nothing sounds before the first touch of a visit. */
  ask(key: VoiceKey, pitch = 1, level = 1, scene = false): void {
    if (this.touched) this.asked.push({ key, pitch, level, scene })
  }

  /** Whether a scene the child caused is playing: the Mount holds the idle ladder down for as long. A creature's own digging does not. */
  get holdsLadder(): boolean {
    return this.scene !== null && this.sceneKind !== 'acorn'
  }

  /** Ends the scene that is playing, where its outcome already stands, and silences it from this call. */
  endScene(): void {
    if (!this.scene) return
    this.scene.finish()
    this.scene = null; this.sceneKind = null
    this.asked = this.asked.filter((asked) => !asked.scene)
    this.hush = true
    // The breath the wind children were drawing for it is let go without a sound.
    this.cast.big.blowIn = 0; this.cast.small.blowIn = 0
  }

  press(x: number, y: number): void { touching.press(this, x, y) }
  move(x: number, y: number): void { touching.move(this, x, y) }
  tap(): void { touching.tap(this) }
  drop(): void { touching.drop(this) }
  cancel(): void { touching.cancel(this) }
  /** The finger has lifted in the middle of a carry and may come back: the part waits where it is. */
  wait(): void { if (this.hand && !this.hand.waiting) { this.hand.waiting = true; this.hand.waited = 0 } }

  creatureOf(thing: Thing): Creature | undefined {
    return this.creatures.find((creature) => creature.thing === thing)
  }

  /** Whether a creature would lie on nothing else if it stood at x, y. */
  free(x: number, y: number, who: Creature): boolean {
    const r = radius(who.thing)
    for (const other of this.things) {
      if (other === who.thing || other.bedded) continue
      if (Math.hypot(other.x - x, other.y - y) < Math.min(150, 0.55 * (r + radius(other)))) return false
    }
    for (const acorn of this.acorns) if (acorn.dug && Math.hypot(acorn.x - x, acorn.y - y) < ACORN_REACH + Math.min(60, r * 0.4)) return false
    // Nor does it stop where it would reach over a heap: a heap is always there to be tapped.
    for (const kind of Object.keys(HEAPS) as Kind[]) if (Math.hypot(HEAPS[kind].x - x, HEAPS[kind].y - y) < HEAP_REACH + r * 0.8) return false
    return true
  }

  /** A part has been added to a thing: remember it, keep the loose parts within their number, and ask for a save. */
  settled(thing: Thing): void {
    if (!thing.awake) this.focus = thing
    this.heed = { at: thing, age: 0 }
    for (const part of thing.parts) if (part.order === 0) part.order = ++this.laid
    let loose = 0
    for (const other of this.things) if (!other.awake) loose += other.parts.length
    if (loose > MAX_LOOSE) {
      // One more than may lie about: the small wind child puffs the part laid longest ago back to its heap.
      let from: Thing | null = null, oldest: Part | null = null
      for (const other of this.things) {
        if (other.awake) continue
        for (const part of other.parts) if (!part.inHand && (!oldest || part.order < oldest.order)) { oldest = part; from = other }
      }
      if (from && oldest) {
        const where = placed(from, oldest)
        this.takeOut(from, oldest)
        this.air.sendHome(oldest.kind, oldest.look, where.x, where.y, where.turn)
        this.cast.puffOnce('small')
        this.ask('puff', 1.3)
      }
    }
    this.changed = 2
  }

  takeOut(thing: Thing, part: Part): void {
    thing.parts.splice(thing.parts.indexOf(part), 1)
    if (thing.parts.length === 0) { this.things.splice(this.things.indexOf(thing), 1); if (this.focus === thing) this.focus = null }
    else recentre(thing)
    this.changed = 2
  }

  /** A thing has its second cap: it is a creature from this step on, and its waking is a scene. */
  private wake(thing: Thing): void {
    this.endScene()
    thing.awake = true
    thing.woke = ++this.order
    const creature = newCreature(thing, false)
    creature.inScene = true
    this.creatures.push(creature)
    if (this.focus === thing) this.focus = null
    this.heed = { at: thing, age: 0 }
    // The wind children blow at every waking, whatever they were doing; and the toad has had its say about a slitherer by the end of it.
    this.cast.breatheIn('big', true); this.cast.breatheIn('small', true)
    if (wayOf(thing) === 'willow') this.greeted.add(creature)
    // A runner woken beside the stump is started at in its waking: that is the toad's one start until it has been away.
    else if (wayOf(thing) === 'twig' || wayOf(thing) === 'round') this.glaredAt.add(creature)
    this.keepToFive(creature)
    begin(this, 'waking', wakingBeats(this, creature), () => {})
  }

  /** Six are up: the one woken longest ago, other than `newest`, walks off between the trees in its own way and is seen to go. */
  private keepToFive(newest: Creature): void {
    const staying = this.creatures.filter((c) => !c.leaving)
    if (staying.length <= MAX_CREATURES) return
    const eldest = staying.filter((c) => c !== newest).reduce((a, b) => (a.thing.woke <= b.thing.woke ? a : b))
    // Whoever was still on the way off bolts, so that at most a few are ever going at once; and the one that waited is gone for good.
    const going = this.creatures.filter((c) => c.leaving)
    for (const other of going) other.bolt = true
    while (going.length >= MOST_LEAVING) { const out = going.shift()!; this.creatures.splice(this.creatures.indexOf(out), 1); if (this.grip?.creature === out) { this.grip = null; out.held = -1 } }
    if (this.away && !this.away.creature) this.left = { side: this.away.side, age: 0, looks: this.away.thing.parts.filter((part) => part.kind === 'cap').map((part) => part.look) }
    eldest.leaving = true; eldest.gone = 0; eldest.bolt = false; eldest.habit = null; eldest.tumble = null; eldest.leap = null; eldest.held = -1; eldest.tug = null; eldest.entering = null; eldest.inScene = false; eldest.sceneEnd = null
    eldest.thing.bedded = false; eldest.thing.drowsy = false
    const reach = radius(eldest.thing)
    const side = this.sideFor(eldest.thing)
    eldest.target = { x: side < 0 ? -(reach + 80) : STAGE.width + reach + 80, y: EXIT_Y }
    if (this.grip?.creature === eldest) this.grip = null
    this.things.splice(this.things.indexOf(eldest.thing), 1)
    this.greeted.delete(eldest); this.glaredAt.delete(eldest)
    this.away = { thing: eldest.thing, side, creature: eldest }
    this.changed = 2
  }

  /** The edge a creature walks off by: the nearer one; one too long to pass below the corner leaves by the left. */
  private sideFor(thing: Thing): -1 | 1 {
    return thing.x >= GROUND.x && needOf(radius(thing)) < EXIT_Y - CORNER - 8 ? 1 : -1
  }

  /** A tap on the eyes that wait between the trunks: that creature comes back on to the ground, and the one that is now eldest walks off in its turn. */
  comeBack(): void {
    const away = this.away
    if (!away || away.creature) return
    this.away = null
    const { thing, side } = away, reach = radius(thing)
    thing.woke = ++this.order; thing.bedded = false; thing.drowsy = false
    const creature = newCreature(thing, true)
    const to = keepIn(GROUND.x + side * GROUND.rx * 0.5, GROUND.y - 10, reach)
    creature.entering = { x: to.x, y: to.y }
    // It is seen coming at once: it starts at the edge it left by, facing in, with its foremost part already
    // `IN_SIGHT` inside the stage, and comes on quickened as a leaver goes.
    const from = keepIn(side < 0 ? -reach : STAGE.width + reach, EXIT_Y, reach, false)
    thing.x = from.x; thing.y = from.y
    thing.turn += Math.atan2(to.y - thing.y, to.x - thing.x) - facing(creature)
    let fore = -Infinity
    for (const part of thing.parts) { const at = placed(thing, part); fore = Math.max(fore, (at.x - thing.x) * -side + SHAPES[part.kind].r) }
    thing.x = (side < 0 ? IN_SIGHT : STAGE.width - IN_SIGHT) + side * fore
    creature.gone = 0
    this.things.push(thing); this.creatures.push(creature)
    this.heed = { at: thing, age: 0 }
    this.ask('blink', 1.1)
    this.keepToFive(creature)
    this.changed = 2
  }

  /** Whether a creature is a slitherer near enough the toad to be croaked at. */
  private nearToad(creature: Creature, within = 260): boolean {
    return wayOf(creature.thing) === 'willow' && Math.hypot(creature.thing.x - CAST.toad.x, creature.thing.y - CAST.toad.y) <= within
  }

  /** Plays `dt` seconds. */
  step(dt: number): void {
    this.time += dt
    if (this.lastTouch && (this.lastTouch.age += dt) > 2.5) this.lastTouch = null
    if (this.heed && (this.heed.age += dt) > 2.5) this.heed = null
    if (this.toadAt && (this.toadAt.age += dt) > 2.5) this.toadAt = null
    if (this.left && (this.left.age += dt) > 0.6) this.left = null
    // While a scene plays, the three keep their eyes on what it is about.
    if (this.scene && this.heed) this.heed.age = Math.min(this.heed.age, 1)
    if (this.scene) { this.scene.update(this.time); if (!this.scene.running) { this.scene = null; this.sceneKind = null } }
    const hand = this.hand
    if (hand && stepHand(hand, dt)) this.ask(`carry-${hand.kind}`, Math.max(0.8, Math.min(1.5, 0.8 + hand.speed / 900)), 0.8)
    for (const kind of Object.keys(this.heaps) as Kind[]) {
      const heap = this.heaps[kind]
      if (heap.squash === 0 && heap.speed === 0) continue
      heap.speed += (-160 * heap.squash - 11 * heap.speed) * dt
      heap.squash += heap.speed * dt
      // It comes to rest, and is then part of the picture of the place again.
      if (Math.abs(heap.squash) < 0.004 && Math.abs(heap.speed) < 0.04) { heap.squash = 0; heap.speed = 0 }
    }
    this.stepParts(dt)
    const world = this.world, grip = this.grip
    world.finger = this.finger
    world.holdStill = hand !== null && !hand.waiting
    world.lookAt = hand ?? this.finger ?? grip ?? this.lastTouch
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const creature = this.creatures[i]
      // The lean into a stroke lasts while the finger strokes, and is let go after it.
      if (creature.lean > 0 && grip?.creature !== creature) creature.lean = Math.max(0, creature.lean - dt * 3)
      if (stepCreature(creature, dt, world, (key, pitch, level) => this.ask(key, pitch, level, creature.inScene))) continue
      // It has walked off the stage. The last to leave waits behind the trees from now on.
      this.creatures.splice(i, 1)
      if (this.away?.creature === creature) this.away.creature = null
      if (this.grip?.creature === creature) { this.grip = null; creature.held = -1 }
    }
    meet(world, (key, pitch, level) => this.ask(key, pitch, level))
    this.keepApart(dt)
    this.stepAcorns(dt)
    this.stepToad()
    const lies = this.focus ?? this.things.find((thing) => !thing.awake) ?? null
    // The three look at the thing that answered the child (the part in the hand, the creature touched, the thing
    // a part flew to), never at the finger; and the toad at the creature it croaked or started at.
    const seen = hand ?? this.heed?.at ?? null
    this.cast.step(dt, seen, lies, this.stirred, this.things.some((thing) => thing.bedded), this.airRng, this.toadAt?.at ?? seen)
    this.stirred = false
    for (const event of this.cast.events) {
      if (event.who === 'toad') {
        // The toad gulps, and a hat it has worn a moment slides back to its heap.
        const hat = this.cast.toad.hat
        if (hat && hat.age > 1.2) { this.air.sendHome(hat.kind, hat.look, CAST.toad.x, CAST.toad.y - 66, hat.turn); this.cast.toad.hat = null; this.ask('gulp') }
      } else if (event.what === 'blow') {
        this.air.blow(event.who, this.airRng)
        if (event.who === 'big') { this.cast.flatten(); this.ask('gust', 1, 1, this.sceneKind === 'waking') }
      } else this.air.loosen(CAST[event.who].x + (event.who === 'big' ? 110 : -90), CAST[event.who].y + 50, this.airRng)
    }
    this.air.step(dt, (kind, scene) => { this.heaps[kind].speed += MANNERS[kind].slump * 6; this.ask('home', 0.9 + 0.05 * Object.keys(HEAPS).indexOf(kind), 1, scene && this.scene !== null) })
    for (let i = this.scuffs.length - 1; i >= 0; i--) if ((this.scuffs[i].age += dt) > 0.9) this.scuffs.splice(i, 1)
  }

  /** Parts that are coming down touch, ring out and bounce; a second cap that lands wakes its thing. */
  private stepParts(dt: number): void {
    for (const thing of this.things) if (this.settleParts(thing, dt)) return
    // A creature that is walking off is no longer one of the things, and a part that was coming down on it still comes down.
    for (const creature of this.creatures) if (creature.leaving) this.settleParts(creature.thing, dt)
  }

  /** The parts of one thing, stepped. Returns true when the thing woke in this step. */
  private settleParts(thing: Thing, dt: number): boolean {
    {
      for (const part of thing.parts) {
        if (part.settle > 0) part.settle = Math.max(0, part.settle - dt * 4)
        if (part.fall > 0) {
          part.fall -= dt
          if (part.fall > 0) continue
          // It touches down in this step: its sound, its settle, and its bounces to come.
          part.fall = 0; part.flight = 0; part.settle = 1
          part.bounces = MANNERS[part.kind].bounces; part.nextBounce = MANNERS[part.kind].bounceGap
          this.ask(`press-${part.kind}`)
          let landed = 0
          for (const other of thing.parts) if (other.kind === 'cap' && other.fall === 0 && !other.inHand) landed++
          // Two caps on one thing, however they came to be on it (a part that joins two one-eyed things counts): it wakes.
          if (landed >= 2 && !thing.awake) { this.wake(thing); return true }
          // One more cap on a creature is one more eye, open as it lands; any part changes its ways from this step.
          const creature = thing.awake ? this.creatureOf(thing) : undefined
          if (creature && !creature.inScene) { creature.eyes = landed; creature.thing.drowsy = false; if (part.kind === 'cap') this.ask('blink', 1.2) }
        } else if (part.bounces > 0 && (part.nextBounce -= dt) <= 0) {
          const done = MANNERS[part.kind].bounces - part.bounces + 1
          part.bounces--
          part.nextBounce = MANNERS[part.kind].bounceGap * 0.8 ** done
          part.settle = 0.7 * 0.75 ** done
          this.ask(`press-${part.kind}`, 1.12 ** done, 0.8 ** done)
        }
      }
    }
    return false
  }

  /** A thing never woken that has two caps lying on it wakes, however the second came to lie there. */
  wakeIfEyed(thing: Thing): void {
    if (thing.awake || !this.things.includes(thing)) return
    let landed = 0
    for (const part of thing.parts) if (part.kind === 'cap' && part.fall === 0 && !part.inHand) landed++
    if (landed >= 2) this.wake(thing)
  }

  /** Two creatures that stand on one another step apart: nothing rests on anything. */
  private keepApart(dt: number): void {
    const list = this.creatures
    for (let i = 0; i < list.length; i++) {
      const a = list[i]
      if (!about(a) || a.leap || a.tumble) continue
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]
        if (!about(b) || b.leap || b.tumble) continue
        const dx = b.thing.x - a.thing.x, dy = b.thing.y - a.thing.y, d = Math.hypot(dx, dy) || 1
        const least = Math.max(36, Math.min(100, 0.36 * (radius(a.thing) + radius(b.thing))))
        if (d >= least) continue
        const push = (least - d) * 0.5 * Math.min(1, dt * 8), ux = d > 1 ? dx / d : 1, uy = d > 1 ? dy / d : 0
        const pa = ontoGround(a.thing.x - ux * push, a.thing.y - uy * push, 18), pb = ontoGround(b.thing.x + ux * push, b.thing.y + uy * push, 18)
        a.thing.x = pa.x; a.thing.y = pa.y; b.thing.x = pb.x; b.thing.y = pb.y
      }
    }
  }

  /** A seed nose that has reached a buried acorn digs it up, which is a scene; one that has reached a dug one gives it a push. */
  private stepAcorns(dt: number): void {
    this.acornShown.forEach((shown, i) => {
      const acorn = this.acorns[i]
      if (this.sceneKind === 'acorn') return
      // Pressed back under, or pushed: it eases to where it is saved.
      shown.out += ((acorn.dug ? 1 : 0) - shown.out) * Math.min(1, dt * 9)
      if (Math.abs(shown.out - (acorn.dug ? 1 : 0)) < 0.01) shown.out = acorn.dug ? 1 : 0
      const dx = acorn.x - shown.x, dy = acorn.y - shown.y, far = Math.hypot(dx, dy)
      if (far < 0.5) { shown.x = acorn.x; shown.y = acorn.y } else { const go = Math.min(1, dt * 5); shown.x += dx * go; shown.y += dy * go; shown.spin += (far * go) / 20 }
    })
    if (this.scene || !this.touched || this.hand || this.grip) return
    for (const creature of this.creatures) {
      const want = creature.want
      if (!about(creature) || creature.poke || creature.tumble || creature.leap || (want.what !== 'dig' && want.what !== 'push')) continue
      const acorn = this.acorns[want.acorn], far = Math.hypot(acorn.x - creature.thing.x, acorn.y - creature.thing.y)
      if (far > 46 + Math.min(40, radius(creature.thing) * 0.3)) continue
      // It is pushed on the way the creature came, and comes to lie on free ground, clear of the rim.
      const ux = far > 1 ? (acorn.x - creature.thing.x) / far : 1, uy = far > 1 ? (acorn.y - creature.thing.y) / far : 0
      const to = this.acornSpot(acorn.x + ux * PUSH, acorn.y + uy * PUSH, creature)
      if (want.what === 'dig') {
        creature.inScene = true; creature.target = null; creature.habit = null
        const beats = acornBeats(this, creature, want.acorn, to)
        begin(this, 'acorn', beats, () => { acorn.dug = true; acorn.x = Math.round(to.x); acorn.y = Math.round(to.y) })
      } else {
        acorn.x = Math.round(to.x); acorn.y = Math.round(to.y)
        creature.again = 9; creature.target = null; creature.rest = 1.2
        this.ask('roll'); this.changed = 1
      }
      return
    }
  }

  /** Where a pushed acorn comes to lie: the place asked for, or the first place round it that nothing else lies on. */
  private acornSpot(x: number, y: number, pusher: Creature): { x: number; y: number } {
    for (let tries = 0; tries < 8; tries++) {
      const angle = tries * 0.9, reach = tries === 0 ? 0 : 50
      const at = ontoGround(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach, 46)
      let clear = true
      for (const thing of this.things) if (thing !== pusher.thing && !thing.bedded && Math.hypot(thing.x - at.x, thing.y - at.y) < radius(thing) * 0.7 + ACORN_REACH) clear = false
      for (const other of this.acorns) if (other.dug && Math.hypot(other.x - at.x, other.y - at.y) < ACORN_REACH * 2 && !(other.x === Math.round(x) && other.y === Math.round(y))) clear = false
      if (clear || tries === 7) return at
    }
    return ontoGround(x, y, 46)
  }

  /** The toad's fixed tastes about who comes near: one low croak for a slitherer as it comes near, a start and a glare for a scuttler or a roller that runs by. */
  private stepToad(): void {
    const toad = this.cast.toad
    // A slitherer that has gone away again is croaked at the next time it comes.
    for (const creature of this.greeted) if (!this.creatures.includes(creature) || creature.leaving || !this.nearToad(creature, 320)) this.greeted.delete(creature)
    // And a runner that has gone away again is started at the next time it runs by.
    for (const creature of this.glaredAt) if (!this.creatures.includes(creature) || creature.leaving || Math.hypot(creature.thing.x - CAST.toad.x, creature.thing.y - CAST.toad.y) > 320) this.glaredAt.delete(creature)
    if (toad.again > 0 || !this.touched || this.scene) return
    for (const creature of this.creatures) {
      if (!about(creature) || Math.hypot(creature.thing.x - CAST.toad.x, creature.thing.y - CAST.toad.y) > 260) continue
      const way = wayOf(creature.thing)
      if (way === 'willow') {
        if (this.greeted.has(creature)) continue
        this.greeted.add(creature)
        this.cast.toadCroaks(); this.ask('croak', 0.72, 0.8); toad.again = 3
        this.toadAt = { at: creature.thing, age: 0 }
        return
      }
      if ((way === 'twig' || way === 'round') && creature.body.speed > 20) {
        // Once for each time it comes running by, as the croak comes once: not again while it stays about the stump.
        if (this.glaredAt.has(creature)) continue
        this.glaredAt.add(creature)
        this.cast.toadStarts(); this.ask('croak', 1.5, 0.7); toad.again = 6; this.toadAt = { at: creature.thing, age: 0 }
        return
      }
    }
  }

  /** The clearing as it is saved: everything at rest. A part in the air lies where it will land, one lifted from the earth lies where it was, and a creature in a scene stands where the scene will leave it. */
  saved(): Saved {
    const record = (thing: Thing): SavedThing => {
      const creature = this.creatureOf(thing)
      const awake = caps(thing) >= 2, end = creature?.sceneEnd ?? creature?.entering ?? thing
      const turn = creature?.sceneEnd ? creature.sceneEnd.turn : thing.turn
      return {
        id: thing.id, x: end.x, y: end.y, turn: turn / DEG, awake, woke: awake ? thing.woke || this.order + 1 : 0, drowsy: awake && thing.drowsy, bedded: awake && thing.bedded,
        parts: thing.parts.map((part) => ({ kind: part.kind, x: part.x, y: part.y, turn: part.turn / DEG })),
      }
    }
    const things: SavedThing[] = this.things.map(record)
    const focus = this.focus && this.things.includes(this.focus) && !this.focus.awake ? this.focus.id : 0
    // The one that walked off last waits behind the trees from the step it sets out.
    let waiting: Saved['waiting'] = this.away ? { side: this.away.side, thing: { ...record(this.away.thing), awake: true, bedded: false, drowsy: false } } : null
    // A thing whose second cap is still in the air is saved awake. With five already up that makes six, and the
    // record holds what the child would have seen had the game gone on: the one woken longest ago is the one
    // that waits behind the trees, at the edge it would have left by. No creature is dropped unseen.
    for (;;) {
      const up = things.filter((thing) => thing.awake)
      if (up.length <= MAX_CREATURES) break
      const eldest = up.reduce((a, b) => (a.woke <= b.woke ? a : b)), live = this.things.find((thing) => thing.id === eldest.id)!
      things.splice(things.indexOf(eldest), 1)
      waiting = { side: this.sideFor(live), thing: { ...eldest, x: live.x, y: live.y, bedded: false, drowsy: false } }
    }
    return { v: 1, position: this.position, finished: false, seed: this.seed, things, acorns: this.acorns.map((acorn) => ({ ...acorn })), focus, waiting }
  }
}

/** The clearing as it is found after being put away: exactly what a load of what was saved gives. */
export function putAway(toy: Toy, childAge: number | null, visitSeed: number): Toy {
  return new Toy(read(write(toy.saved()), childAge, visitSeed), visitSeed)
}
