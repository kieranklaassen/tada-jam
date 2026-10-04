import * as cells from './cellVoices'
import { voiceKindOf } from './cellVoices'
import { bowlOf, fillLevel, surfaceOf } from './forms'
import type { Guidance } from './guidance'
import { callPot, carry, dropBack, pickUp, pressPot, putDown, releasePot, swapSeats, tapThing, wringIfFull, type HandEvent } from './hands'
import { GATE, WAITING, hintFor } from './hint'
import { dueShowing, markShown, placeOf, seatOf, stored, tick, type Game, type GameEvent } from './host'
import type { StoredTea } from './save'
import type { Gesture, Point } from './input'
import { CLOTH, TRAY, type Spot } from './layout'
import { LEAST_REACH, pick, type Target } from './pick'
import { POUR, liftOf, spoutSpot, type PourEvent } from './pour'
import { Scene } from './scene'
import { changeParty, clink, showing, sip, type Cast } from './scenes'
import { anchorOf, passingLanes, sizeOfGuest, type Stage } from './stage'
import * as voices from './voices'
import type { VoiceSpec } from './voices'
import { PUDDLE_MINDS, PUDDLE_REACH, twinOf } from './tastes'
import { holds, puddleNear, thingById, wipe, type GuestId, type Thing } from './world'

// The game as it is played: the one place that knows a finger, the rules,
// the stage and the sounds at once. A gesture becomes an act of a hand
// (hands.ts), the rules say what came of it (host.ts), and the stage and the
// voices follow. Nothing is decided here that a rule decides, and nothing is
// drawn here.

/** A held finger drifts: it is still holding the pot until it has slid this far, in pixels. */
export const HOLD_SLOP = 44
const GRAIN_EVERY = 0.09
const PATTER_EVERY = 0.12
/** A table has been quiet this long before a guest does its small joke. */
const JOKE_AFTER = 6
/** Pixels a carried or rubbed thing travels between two of its sounds. */
const STROKE_PX = 46
/** Seconds of quiet before a guest shows a new idea, so the child sees the table first. */
const SHOW_AFTER = 0

type Mode = 'idle' | 'pouring' | 'leaning' | 'carry' | 'rub' | 'walk'
/** What is saved, how soon: nothing, at the throttle, or at once. */
export type Change = 0 | 1 | 2

export class Play implements Cast {
  readonly game: Game
  readonly stage: Stage
  now = 0
  private queue: VoiceSpec[] = []
  private change: Change = 0
  /** The scene the whole table is in: a showing, the clink, a change of party. Any touch ends it. */
  private scene: Scene | null = null
  /** A sip plays beside the child's play, one for each guest; a touch on that guest or its cup ends it. */
  private readonly sips = new Map<GuestId, { scene: Scene; cup: string }>()
  private ending = false
  private quiet = 0
  private mode: Mode = 'idle'
  private pressed: string | null = null
  private pressedWidth = 0
  private following = false
  private grab = { x: 0, z: 0 }
  private lag = { x: 0, z: 0 }
  private last: Point = { x: 0, y: 0 }
  private heading: Point = { x: 0, y: 0 }
  private turns = 0
  private stroke = 0
  private took = 0
  private turn = 0
  private grainIn = 0
  private patterIn = 0
  private overflowing = 0
  /** Seconds until a guest next does its small joke at a quiet table, and how many have been done. */
  private jokeIn = JOKE_AFTER
  private joked = 0
  /** The cup that is running over. */
  private over: string | null = null
  /** A finger is on the table, or has only just left it in the middle of a drag. */
  private touching = false
  /** This rub has had its flash. */
  private flashed = false
  private stepIn = 0
  private streamOn: GuestId | null = null
  /** The Ducklings who have a puddle by their place and have paddled in it: each paddles once when the puddle comes. */
  private readonly paddled = new Set<GuestId>()
  /** The finger came down on the pot while it was in the air: it pours when it lands, for as long as the finger is still there, or one drop if it has gone. */
  private pourOnLanding = false
  /** A cup, a saucer or a spot was tapped while the pot was in the air: it is called there when it lands. */
  private callOnLanding: { id: string | null; spot: Spot } | null = null
  /** The finger let go in the middle of a drag: if it comes back at once, the same drag goes on (input.ts). */
  private liftedMid = false
  /** Where a hold on the pot began, when that is not where the drag began: a finger that came back to pour again. */
  private holdFrom: Point | null = null
  /** The table as a showing found it, stored for as long as the showing plays: a showing changes nothing that lasts. */
  private asFound: StoredTea | null = null
  /** The thing that is leaning after the finger, before it follows it. */
  private leaning: string | null = null
  /** The guests who hold their cup in a paw and are looking at the stack of saucers for want of one. */
  private readonly lacking = new Set<GuestId>()
  /** How full each guest's cup was when it last drank, for the pitch of the clink. */
  readonly lastHad: Partial<Record<GuestId, number>> = {}

  constructor(stage: Stage, game: Game) {
    this.stage = stage
    this.game = game
    this.showTable(true)
    // A Duckling that already has a puddle by its place has paddled in it: it does not start again because the game was opened.
    for (const guest of game.tea.guests) {
      if ((guest.who.startsWith('duckling') || guest.who === 'mouse') && puddleNear(game.world, placeOf(game, guest.who), PUDDLE_REACH) > PUDDLE_MINDS) this.paddled.add(guest.who)
    }
  }

  /** What goes to storage now. While a showing plays it is the table as the showing found it, with the showing marked as shown. */
  stored(): StoredTea {
    if (this.asFound) return this.asFound
    const now = stored(this.game)
    // Until the guests have clinked, the sitting is stored as not yet ended: opened again, it ends then, and they clink.
    const before = this.ending ? this.game.unended : null
    return before ? { ...now, finished: false, waiting: null, position: before.position, seed: before.seed } : now
  }

  /**
   * The game is put away with a finger still down: its lift will never come.
   * A pour stops, a thing in the hand goes back where it was picked up, and a
   * guest that was being led goes back to its seat. Nothing happens that the
   * child did not do.
   */
  cancel(): void {
    const { game, stage } = this
    if (this.mode === 'pouring') this.heard(releasePot(game))
    else if (this.mode === 'carry') {
      stage.lift(null)
      // A finger that had already let go made its put: the thing comes down where it was let go.
      if (this.liftedMid) this.heard(putDown(game, stage.clothAt(this.last.x, this.last.y), this.guestUnder(this.last)))
      else dropBack(game)
    } else if (this.mode === 'walk') {
      const who = this.guestOf(this.pressed)
      if (this.liftedMid) this.walked(this.last)
      else if (who) stage.guestWalk(who, seatOf(game, who))
    } else if (this.pressed === 'gate' && this.liftedMid) this.tapped(this.last)
    this.pourOnLanding = false
    this.callOnLanding = null
    this.liftedMid = false
    this.rest()
  }

  // --- what the Mount asks ---------------------------------------------------

  /** The voices queued since they were last taken. The Mount plays them inside the touch, and again after each step. */
  takeVoices(): VoiceSpec[] {
    return this.queue.splice(0)
  }

  /** What has changed in what is saved since this was last asked. */
  takeChange(): Change {
    const change = this.change
    this.change = 0
    return change
  }

  /** A finger is working or a scene is playing: neither is idleness. */
  get busy(): boolean {
    return this.mode !== 'idle' || this.game.pot.hop !== null || this.scene !== null || this.sips.size > 0
  }

  // --- for the scenes (Cast) --------------------------------------------------

  say(voice: VoiceSpec): void {
    this.queue.push(voice)
  }

  found(): void {
    this.asFound = stored(this.game)
  }

  saved(soon: Change): void {
    this.change = Math.max(this.change, soon) as Change
  }

  showTable(atOnce: boolean): void {
    const guests = this.game.tea.guests.map((guest) => ({ who: guest.who, seat: seatOf(this.game, guest.who) }))
    const waiting = this.game.tea.finished && this.game.tea.waiting ? this.game.tea.waiting.guests.map((guest) => guest.who) : []
    this.stage.setParty(guests, waiting, atOnce)
    // A table found after its sitting ended is found settled: nobody settles again.
    if (atOnce && this.game.tea.finished) for (const guest of guests) this.stage.guestSettled(guest.who)
    this.stage.showWorld(this.game.world, guests, atOnce)
  }

  heard(events: readonly (GameEvent | HandEvent)[]): void {
    for (const event of events) {
      if (event.type === 'pour') this.poured(event.event)
      else if (event.type === 'lift') {
        this.lastHad[event.who] = fillLevel(bowlOf(thingById(this.game.world, event.cup)?.size ?? 'house'), event.had)
        this.sips.get(event.who)?.scene.finish()
        const scene = new Scene(sip(this, event.who, event.cup, event.lift, event.had, event.licked))
        this.sips.set(event.who, { scene, cup: event.cup })
        // What the guest found is already in the world and in its note: it is saved before the sip plays.
        scene.start(this.now, () => this.saved(2))
      } else if (event.type === 'waits') {
        this.stage.guestDo(event.who, 'wait')
        this.say(cells.waitCall(voiceKindOf(event.who)))
        this.stage.guestLook(event.who, this.missing(event.who, event.why))
      } else if (event.type === 'tool') {
        this.stage.showWorld(this.game.world, this.seats(), false)
        this.stage.act(event.which, 'slide-in')
        this.say(event.which === 'sponge' ? voices.squelch(0) : voices.land)
        this.saved(2)
      } else if (event.type === 'ended') {
        this.ending = true
        this.saved(2)
      } else if (event.type === 'tapped') {
        if (event.gave > 0) this.say(cells.giveBack(this.turn++))
        if (event.squirted > 0) this.say(voices.pat)
        if (event.gave > 0 || event.squirted > 0) this.saved(1)
      } else if (event.type === 'set-cup') {
        this.stage.guestDo(event.who, 'reach')
        this.say(cells.seatClink)
        this.stage.nudge(event.cup, 0.08)
      } else if (event.type === 'swap') {
        // They squeeze past each other, one on the child's side and one on the wall's.
        const lanes = passingLanes(event.a, event.b)
        ;[event.a, event.b].forEach((who) => {
          this.stage.guestWalk(who, seatOf(this.game, who), lanes[who], who === event.a ? event.b : event.a)
          this.say(cells.squeezePast(voiceKindOf(who)))
        })
        this.saved(2)
      } else if (event.type === 'put') this.wasPut(event)
    }
  }

  // --- reactions --------------------------------------------------------------

  private seats(): { who: GuestId; seat: Spot }[] {
    return this.game.tea.guests.map((guest) => ({ who: guest.who, seat: seatOf(this.game, guest.who) }))
  }

  /** Where a guest looks for what it lacks. */
  private missing(who: GuestId, why: string): Spot | null {
    const world = this.game.world
    if (why === 'no-saucer') return world.things.find((thing) => thing.kind === 'saucer' && thing.on === null && thing.heldBy === null) ?? null
    if (why === 'no-spoon') return world.things.find((thing) => thing.kind === 'spoon' && thing.on === null && thing.heldBy === null) ?? null
    if (why === 'no-cup') return world.things.find((thing) => thing.kind === 'cup' && thing.owner === null && thing.heldBy === null) ?? null
    if (why === 'puddle-near') return { x: placeOf(this.game, who).x, z: placeOf(this.game, who).z + 1.2 }
    const twin = this.game.tea.guests.find((guest) => guest.who !== who && guest.who.startsWith('duckling'))
    return twin ? placeOf(this.game, twin.who) : null
  }

  /** How full the thing under the spout is, and where its surface is: what a drop hits and what the stream sounds like. */
  private landing(): { level: number; x: number; y: number; z: number; wet: boolean } {
    const pot = this.game.pot, spot = spoutSpot(pot)
    const thing = thingById(this.game.world, pot.over)
    if (this.game.overGuest) return { level: 0.5, x: spot.x, y: sizeOfGuest(this.game.overGuest).height * 0.7, z: spot.z - 0.3, wet: true }
    if (!thing) return { level: 0, x: spot.x, y: 0.01, z: spot.z, wet: false }
    if (thing.kind === 'cup') {
      const bowl = bowlOf(thing.size)
      // A cup in a paw is where the paw holds it.
      const paw = thing.heldBy ? anchorOf(thing, seatOf(this.game, thing.heldBy), thing.heldBy) : null
      return { level: fillLevel(bowl, thing.tea), x: paw ? paw.x : thing.x, y: surfaceOf(bowl, thing.tea).y + (paw ? paw.y : thing.on ? 0.035 : 0), z: paw ? paw.z : thing.z, wet: true }
    }
    const share = Math.min(1, thing.tea / Math.max(1e-6, holds(thing)))
    return { level: share, x: thing.x, y: thing.kind === 'bowl' ? 0.14 + 0.45 * share : 0.07, z: thing.z, wet: thing.kind !== 'sponge' }
  }

  private poured(event: PourEvent): void {
    const pot = this.game.pot
    const landing = this.landing()
    const flow = event.type === 'drop' || event.type === 'stream' ? event.flow : null
    if (flow && (flow.spilled > 0 || flow.into.some((part) => part.id !== pot.over && part.id !== 'guest'))) {
      this.overflowing = 0.2
      this.over = pot.over
    }
    if (flow) this.saved(1)
    if (event.type === 'drop') {
      this.stage.drop(landing)
      this.say(landing.wet ? voices.plip(landing.level) : voices.pat)
      if (pot.over) this.stage.nudge(pot.over, 0.035)
    } else if (event.type === 'stream-start') {
      // A guest under the spout gets the stream, each in its own way.
      this.streamOn = this.game.overGuest
      if (this.streamOn) {
        // It answers for as long as the stream is on it: the tail stays up, the gulping and the shaking go on.
        this.stage.guestDo(this.streamOn, 'stream')
        this.stage.guestHold(this.streamOn, 'stream')
        this.say(cells.streamCall(voiceKindOf(this.streamOn)))
      }
    } else if (event.type === 'stream-stop') {
      if (this.streamOn) this.stage.guestHold(this.streamOn, null)
      this.streamOn = null
      this.say(voices.lidClick)
      this.stage.fan(false)
      if (pot.over) this.stage.nudge(pot.over, 0.05)
    } else if (event.type === 'hop') {
      this.say(voices.hop)
      // Where the pot stands is saved: it is stored where its hop ends.
      this.saved(1)
    } else if (event.type === 'land') {
      this.say(voices.land)
      this.stage.nudge('pot', 0.09)
      this.saved(1)
    }
  }

  /** What came of putting a thing down: each result of the grid has its own sound and its own motion. */
  private wasPut(event: Extract<HandEvent, { type: 'put' }>): void {
    const { stage } = this
    const kind = event.guest ? voiceKindOf(event.guest) : null
    const tea = event.flow ? event.flow.into.reduce((sum, part) => sum + part.amount, 0) + event.flow.spilled : 0
    this.saved(event.result === 'set-down' ? 1 : 2)
    switch (event.result) {
      case 'seat': this.say(cells.seatClink); stage.nudge(event.id, 0.1); break
      case 'tip-in': this.say(cells.tipGlug(tea)); stage.act(event.id, 'tip'); if (event.onto) stage.nudge(event.onto, 0.12); if (event.flow && event.flow.spilled > 0) this.say(voices.patter(this.turn++)); break
      case 'hat': this.say(cells.hatPlop); if (event.guest) stage.guestDo(event.guest, 'hat'); break
      case 'stack': this.say(cells.stackClap); stage.nudge(event.id, 0.14); break
      case 'cup-hops-on': this.say(cells.hopOn); if (event.onto) stage.act(event.onto, 'hop'); break
      case 'flat-hat': this.say(cells.hatSlide); stage.act(event.id, 'skim'); if (event.guest) stage.guestDo(event.guest, 'hat'); break
      case 'stir': this.say(cells.stirTing(this.turn++)); if (event.onto) stage.act(event.onto, 'whirl'); break
      case 'rest': this.say(cells.restClick); stage.nudge(event.id, 0.08); break
      case 'nose-balance': this.say(cells.noseTing); if (event.guest) stage.guestDo(event.guest, 'hat'); break
      case 'drink-from-spout': this.say(cells.spoutGurgle(this.turn++)); if (event.guest) { stage.guestDo(event.guest, 'stream'); if (kind) this.say(cells.streamCall(kind)) } break
      case 'empty-bowl': this.say(cells.bowlGurgle); if (event.onto) stage.nudge(event.onto, 0.2); break
      case 'dab': this.say(cells.dabSuck); stage.nudge(event.id, 0.2); break
      case 'wipe-face': this.say(cells.squidge); if (event.guest) { stage.guestDo(event.guest, 'tickle'); if (kind) this.say(cells.giggle(kind, this.turn++)) } break
      // A child who lays a place has no need to be shown it.
      case 'lay': this.say(event.kind === 'spoon' ? cells.restClick : cells.stackClap); stage.nudge(event.id, 0.1); if (event.kind === 'saucer' && !this.scene) markShown(this.game, 'lay'); break
      // A sponge that was let go wrings itself out, with a wetter squelch the more it held.
      default:
        this.say(event.kind === 'sponge' ? voices.squelch(Math.min(1, tea / 0.3)) : event.kind === 'pot' ? voices.land : voices.pat)
        // The pot is set down with its slosh, wherever it is let go.
        if (event.kind === 'pot') this.say(cells.insideSlosh(this.turn++))
        stage.nudge(event.id, event.kind === 'sponge' && tea > 0 ? 0.3 : 0.08)
    }
  }

  // --- the finger -------------------------------------------------------------

  private targets(): Target[] {
    const targets: Target[] = []
    const { game, stage } = this
    const add = (id: string, x: number, y: number, z: number, girth: number, rank: number) => {
      const middle = stage.screenOf(x, y, z), edge = stage.screenOf(x + girth, y, z)
      targets.push({ id, x: middle.x, y: middle.y, reach: Math.abs(edge.x - middle.x) * 1.08, rank })
    }
    add('pot', game.pot.x, liftOf(game.pot) + 0.65, game.pot.z, 1.05, 6)
    for (const guest of game.tea.guests) {
      const seat = seatOf(game, guest.who), size = sizeOfGuest(guest.who)
      add(`guest:${guest.who}`, seat.x, size.height * 0.55, seat.z, size.girth, 2)
    }
    for (const thing of game.world.things) {
      if (thing.kind === 'pot') continue
      const size = stage.sizeOf(thing.id)
      if (thing.heldBy) {
        const at = anchorOf(thing, seatOf(game, thing.heldBy), thing.heldBy)
        add(thing.id, at.x, at.y + size.height / 2, at.z, size.girth, 5)
        continue
      }
      const rank = thing.kind === 'saucer' ? 1 : thing.kind === 'cup' ? 3 : 4
      add(thing.id, thing.x, size.height / 2, thing.z, size.girth, rank)
    }
    // The whole gate takes a touch, its posts and its arch with the bell, and the party that waits before it is one
    // thing to touch with it.
    add('gate', GATE.x, 0.6, GATE.z, 0.85, 6)
    add('gate', GATE.x, 1.45, GATE.z, 0.8, 6)
    if (game.tea.finished && game.tea.waiting) add('gate', WAITING.x, 0.7, WAITING.z, 1.25, 6)
    return targets
  }

  private guestOf(id: string | null): GuestId | null {
    return id && id.startsWith('guest:') ? (id.slice(6) as GuestId) : null
  }

  /** The guest under a point of the surface, for a thing put down on a guest. */
  private guestUnder(at: Point): GuestId | null {
    return this.guestOf(pick(this.targets().filter((target) => target.id.startsWith('guest:')), at.x, at.y))
  }

  /** The point is on the wall behind the table, beyond the far edge of the cloth: a tile of it answers a touch as its picture would, and the corner the grown-up overlay is opened from answers nothing. */
  private onWall(at: Point): boolean {
    return this.stage.clothAt(at.x, at.y).z < CLOTH.minZ - 1.5
  }

  /** What a gesture does. */
  gesture(gesture: Gesture): void {
    const { game, stage } = this
    if (gesture.type === 'press') {
      // A touch ends the table's scene and is then an ordinary touch.
      this.endScene()
      this.touching = true
      this.flashed = false
      const targets = this.targets()
      this.pressed = pick(targets, gesture.at.x, gesture.at.y)
      this.pressedWidth = 2 * Math.max(LEAST_REACH, targets.find((target) => target.id === this.pressed)?.reach ?? 0)
      this.following = false
      this.last = gesture.at
      this.heading = { x: 0, y: 0 }
      this.turns = 0
      this.stroke = 0
      this.took = 0
      const who = this.guestOf(this.pressed)
      const thing = thingById(game.world, this.pressed)
      // A touch on a guest, on its cup, or on the pot while the pot stands by that cup ends that guest's sip, with the cup
      // back on its saucer: a press that adds to the cup always finds the cup under the spout.
      for (const [guest, playing] of this.sips) if (guest === who || playing.cup === this.pressed || (this.pressed === 'pot' && playing.cup === game.pot.over)) playing.scene.finish()
      if (this.pressed === 'pot') {
        stage.nudge('pot', 0.07)
        this.say(voices.potPress)
        const events = pressPot(game)
        // A pot in the air pours when it lands.
        this.pourOnLanding = events.length === 0 && game.pot.hop !== null
        if (events.length > 0 || this.pourOnLanding) this.mode = 'pouring'
        this.heard(events)
        this.holdFrom = null
        const at = stage.clothAt(gesture.at.x, gesture.at.y)
        this.grab = { x: game.pot.x - at.x, z: game.pot.z - at.z }
      } else if (this.pressed === 'gate') {
        stage.nudge('gate', 0.1)
        this.say(cells.gateBell)
      } else if (who) {
        const variant = (this.turn++ % 2) as 0 | 1
        stage.guestDo(who, 'poke')
        this.say(cells.pokeCall(voiceKindOf(who), variant))
        // The Ducklings peep one after the other: the twin answers the poke half a beat later, with the other peep.
        const twin = twinOf(who)
        if (twin && game.tea.guests.some((guest) => guest.who === twin)) {
          stage.guestDo(twin, 'poke')
          this.say(cells.pokeCall('duckling', (1 - variant) as 0 | 1).map((part) => ({ ...part, at: part.at + 0.3 })))
        }
      } else if (thing) {
        stage.nudge(thing.id, thing.kind === 'sponge' ? 0.22 : 0.08)
        this.say(this.tapVoice(thing))
      } else if (!this.onWall(gesture.at)) this.say(voices.clothThump)
      else {
        // A tile of the wall: it comes loose and does what its picture would, with a ring of its own.
        const picture = stage.tile(gesture.at.x, gesture.at.y)
        if (picture !== null) this.say(cells.tileRing(picture))
      }
      return
    }
    if (gesture.type === 'tap' || gesture.type === 'pressEnd') {
      if (this.mode === 'pouring') {
        const released = releasePot(game)
        this.heard(released)
        // A tap on the pot, over before any stream ran: the lid hops and steam toots, and the one drop has already fallen.
        if (gesture.type === 'tap' && !released.some((event) => event.type === 'pour' && event.event.type === 'stream-stop')) {
          this.say(cells.steamToot)
          stage.act('pot', 'toot')
        }
      } else if (gesture.type === 'tap') this.tapped(gesture.at)
      this.rest()
      return
    }
    if (gesture.type === 'dragMove') {
      this.dragged(gesture.from, gesture.at)
      return
    }
    if (gesture.type === 'dragLift') {
      if (this.mode === 'pouring') {
        this.heard(releasePot(game))
        this.mode = 'idle'
      }
      this.liftedMid = true
      return
    }
    if (gesture.type === 'dragEnd') {
      if (this.mode === 'pouring') this.heard(releasePot(game))
      else if (this.mode === 'carry') {
        stage.lift(null)
        this.heard(putDown(game, stage.clothAt(gesture.at.x, gesture.at.y), this.guestUnder(gesture.at)))
      } else if (this.mode === 'walk') this.walked(gesture.at)
      // A finger that slid on the gate has touched it all the same.
      else if (this.pressed === 'gate') this.tapped(gesture.at)
      this.rest()
    }
  }

  private rest(): void {
    this.touching = false
    this.stage.leanPot(0, 0)
    this.unlean()
    this.mode = 'idle'
    this.pressed = null
    this.holdFrom = null
    this.liftedMid = false
  }

  private unlean(): void {
    if (this.leaning) this.stage.lean(this.leaning, 0, 0)
    this.leaning = null
  }

  /** The sound a thing makes when a finger lands on it, which is also the sound of its tap. */
  private tapVoice(thing: Thing): VoiceSpec {
    if (thing.kind === 'cup') return voices.cupRing(fillLevel(bowlOf(thing.size), thing.tea), bowlOf(thing.size).rimR / 0.6)
    if (thing.kind === 'saucer') return voices.saucerRattle
    if (thing.kind === 'spoon') return cells.spoonTinkle
    if (thing.kind === 'sponge') return voices.squelch(thing.tea / holds(thing))
    return voices.cupRing(Math.min(1, thing.tea / holds(thing)), 1.2)
  }

  private tapped(at: Point): void {
    const { game, stage } = this
    if (this.pressed === 'gate') {
      if (game.tea.finished && game.tea.waiting) this.play(changeParty(this))
      return
    }
    // A tap on a guest pokes it, and calls the pot to hold its spout out to it.
    const poked = this.guestOf(this.pressed)
    if (poked) {
      if (game.pot.hop) return
      this.heard(callPot(game, { id: null, guest: poked, spot: seatOf(game, poked) }))
      return
    }
    const thing = thingById(game.world, this.pressed)
    if (thing) {
      const lay = thing.on
      this.heard(tapThing(game, thing.id))
      if (thing.kind === 'saucer') stage.act(thing.id, 'spin')
      else if (thing.kind === 'spoon') stage.act(thing.id, 'flip')
      else if (thing.kind === 'sponge') stage.act(thing.id, 'squirt')
      // A cup in a paw calls the pot like any cup; what a guest wears, and the sponge, do not.
      // A cup in a paw calls the pot like any cup, and so does the sponge where it lies on the cloth. What a guest wears does not, nor the sponge on a cup, which gives its tea back.
      if ((thing.kind === 'sponge' && lay !== null) || (thing.heldBy && (thing.worn || thing.kind !== 'cup'))) return
    }
    const target = { id: thing ? thing.id : null, spot: stage.clothAt(at.x, at.y) }
    // The wall behind the table is backdrop: a touch there does nothing at all.
    if (!thing && this.onWall(at)) return
    // A pot in the air is called when it lands.
    if (game.pot.hop) this.callOnLanding = target
    else this.heard(callPot(game, { ...target, guest: null }))
  }

  private dragged(from: Point, at: Point): void {
    const { game, stage } = this
    // A finger that let go of the pot and came straight back is a new press on the pot: it pours again, from where the finger now is.
    const back = this.liftedMid
    this.liftedMid = false
    if (back && this.pressed === 'pot' && !this.following && this.mode === 'idle') {
      this.holdFrom = at
      this.last = at
      stage.nudge('pot', 0.07)
      this.say(voices.potPress)
      const events = pressPot(game)
      this.pourOnLanding = events.length === 0 && game.pot.hop !== null
      if (events.length > 0 || this.pourOnLanding) this.mode = 'pouring'
      this.heard(events)
      return
    }
    if (this.holdFrom) from = this.holdFrom
    const slid = Math.hypot(at.x - from.x, at.y - from.y)
    const step = { x: at.x - this.last.x, y: at.y - this.last.y }
    const moved = Math.hypot(step.x, step.y)
    // A finger that turns back before it has gone further than the thing is wide is rubbing it.
    if (moved > 2) {
      if (step.x * this.heading.x + step.y * this.heading.y < 0) this.turns += 1
      this.heading = step
    }
    this.last = at
    const spot = stage.clothAt(at.x, at.y)
    if (this.pressed === null || this.pressed === 'gate') return
    if (this.mode === 'pouring') {
      if (slid <= HOLD_SLOP) return
      this.heard(releasePot(game))
      this.mode = 'leaning'
    }
    if (!this.following && slid <= this.pressedWidth) {
      // The sponge scrubs with any stroke on the spot, to and fro or not: a short stroke over a puddle must never do nothing.
      if (this.turns >= 1 || this.mode === 'rub' || this.pressed === 'sponge') this.rubbed(moved)
      else if (this.pressed === 'pot') stage.leanPot(((at.x - from.x) / Math.max(1, slid)) * (slid / this.pressedWidth), ((at.y - from.y) / Math.max(1, slid)) * (slid / this.pressedWidth))
      // Any other thing leans after the finger too, before it follows.
      else if (!this.guestOf(this.pressed)) {
        // What leans is what would come away: the top saucer of a stack, and nothing that carries something else.
        let top = thingById(game.world, this.pressed)
        for (let above = top; above && above.kind === 'saucer'; above = game.world.things.find((other) => other.kind === 'saucer' && other.on === top!.id)) top = above
        if (top && !game.world.things.some((other) => other.on === top!.id)) {
          this.leaning = top.id
          stage.lean(top.id, (at.x - from.x) / this.pressedWidth, (at.y - from.y) / this.pressedWidth)
        }
      }
      return
    }
    // Further than the thing is wide: it follows the finger.
    const who = this.guestOf(this.pressed)
    if (who) {
      this.following = true
      this.mode = 'walk'
      // It toddles after the finger along its row, as far as its neighbours on either side and no further.
      const home = seatOf(game, who).x, girth = sizeOfGuest(who).walking
      let low = -5.4 + girth, high = 5.4 - girth
      for (const other of game.tea.guests) {
        if (other.who === who) continue
        const x = seatOf(game, other.who).x, room = sizeOfGuest(other.who).walking + girth + 0.06
        if (x < home) low = Math.max(low, x + room)
        else high = Math.min(high, x - room)
      }
      stage.guestWalk(who, { x: Math.max(low, Math.min(high, spot.x)), z: seatOf(game, who).z })
      return
    }
    if (!this.following) {
      if (pickUp(game, this.pressed) === null) return
      this.pressed = game.hand!.id
      this.following = true
      this.mode = 'carry'
      stage.leanPot(0, 0)
      this.unlean()
      stage.lift(this.pressed)
      const thing = thingById(game.world, this.pressed)!
      const want = this.pressed === 'pot' ? { x: spot.x + this.grab.x, z: spot.z + this.grab.z + 0.95 } : spot
      this.lag = { x: thing.x - want.x, z: thing.z - want.z }
    }
    this.lag.x *= 0.7
    this.lag.z *= 0.7
    const pot = this.pressed === 'pot'
    const taken = carry(game, { x: spot.x + (pot ? this.grab.x : 0) + this.lag.x, z: spot.z + (pot ? this.grab.z + 0.95 : 0) + this.lag.z })
    this.took += taken
    // A brimful cup leaves a dotted trail: each dot is seen and heard as it falls.
    if (taken > 0 && thingById(game.world, this.pressed)?.kind === 'cup') this.say(voices.plip(0))
    this.wrung(this.pressed)
    this.saved(this.took > 0 ? 1 : 0)
    this.stroke += moved
    if (this.stroke >= STROKE_PX) {
      const thing = thingById(game.world, this.pressed)!
      this.stroke = 0
      this.turn += 1
      if (thing.kind === 'cup') this.say(thing.tea > 0.02 && this.turn % 2 === 0 ? cells.slosh(thing.tea / holds(thing)) : cells.ceramicHiss(this.turn))
      else if (thing.kind === 'saucer') this.say(cells.glassyWhirr(this.turn))
      else if (thing.kind === 'spoon') this.say(cells.thinScrape(this.turn))
      else if (thing.kind === 'pot') this.say(cells.insideSlosh(this.turn))
      else if (thing.kind === 'sponge') this.say(this.took > 0.002 ? voices.squeak(this.turn) : cells.wetShush(this.turn))
      else this.say(cells.ceramicHiss(this.turn))
      this.took = 0
    }
  }

  /** A sponge that has filled wrings itself out with a squelch and goes on wiping. */
  private wrung(id: string | null): void {
    if (id === null || wringIfFull(this.game, id) <= 0) return
    this.say(voices.squelch(1))
    this.stage.nudge(id, 0.3)
  }

  /** A rub: the thing stays where it stands, and each kind of thing answers in its own way. */
  private rubbed(moved: number): void {
    const { game, stage } = this
    const first = this.mode !== 'rub'
    this.mode = 'rub'
    this.stroke += moved
    if (!first && this.stroke < STROKE_PX) return
    this.stroke = 0
    this.turn += 1
    const who = this.guestOf(this.pressed)
    if (who) {
      stage.guestDo(who, 'tickle')
      this.say(cells.giggle(voiceKindOf(who), this.turn))
      return
    }
    if (this.pressed === 'pot') {
      if (first) {
        stage.act('pot', 'fish')
        this.say(cells.risingBubbles)
      }
      return
    }
    const thing = thingById(game.world, this.pressed)
    if (!thing) return
    if (thing.kind === 'cup') { stage.act(thing.id, 'whirl'); this.say(cells.whirlHum(this.turn)) }
    else if (thing.kind === 'saucer') {
      // It squeaks under every stroke, and flashes once in a rub: it swells and a glint runs out to its rim.
      this.say(cells.cleanSqueak(this.turn))
      if (!this.flashed) {
        this.flashed = true
        stage.act(thing.id, 'flash')
        stage.splash(thing.id, 1.6, 0)
      }
    }
    else if (thing.kind === 'spoon') { stage.act(thing.id, 'rattle'); this.say(cells.tableRattle(this.turn)) }
    else if (thing.kind === 'sponge') {
      const took = thing.heldBy || thing.on ? 0 : wipe(game.world, thing.id, thing)
      this.wrung(thing.id)
      this.say(took > 0.002 ? voices.squeak(this.turn) : voices.brush)
      stage.nudge(thing.id, 0.06)
      if (took > 0) this.saved(1)
    } else stage.nudge(thing.id, 0.08)
  }

  /** A guest that was led by the finger is let go: at another guest's seat the two swap, and anywhere else it goes home. */
  private walked(at: Point): void {
    const { game, stage } = this
    const who = this.guestOf(this.pressed)
    if (!who) return
    const spot = stage.clothAt(at.x, at.y)
    // It changes seats with the guest next to it, when it is let go at that seat or beyond it: it never walks past a
    // third guest to get to a seat further off.
    const home = seatOf(game, who).x
    let other: GuestId | null = null
    for (const side of [-1, 1]) {
      const next = game.tea.guests.filter((guest) => (seatOf(game, guest.who).x - home) * side > 0).sort((a, b) => Math.abs(seatOf(game, a.who).x - home) - Math.abs(seatOf(game, b.who).x - home))[0]
      if (next && (spot.x - (seatOf(game, next.who).x - side * 1.5)) * side > 0) other = next.who
    }
    if (other) this.heard(swapSeats(game, who, other))
    else stage.guestWalk(who, seatOf(game, who))
  }

  // --- time ---------------------------------------------------------------------

  private play(beats: ConstructorParameters<typeof Scene>[0]): void {
    this.scene = new Scene(beats)
    // Each scene puts its own outcome into the world in its first beat's builder, before this; it is saved at once.
    this.scene.start(this.now, () => this.saved(2))
  }

  /** The pot has landed: what was asked of it while it was in the air happens now. */
  private landed(): void {
    const { game } = this
    if (this.callOnLanding) {
      const target = this.callOnLanding
      this.callOnLanding = null
      if (this.mode !== 'pouring') this.heard(callPot(game, { ...target, guest: null }))
    }
    if (!this.pourOnLanding) return
    this.pourOnLanding = false
    this.heard(pressPot(game))
    // The finger has already gone: the press was a tap, and gives its one drop.
    if (this.mode !== 'pouring' || this.pressed !== 'pot') this.heard(releasePot(game))
  }

  private endScene(): void {
    if (!this.scene) return
    this.scene.finish()
    this.scene = null
    this.asFound = null
    this.stage.guestsRest()
    this.showTable(false)
    this.saved(2)
  }

  /** Plays `dt` seconds: the rules, the scenes, and the sounds of whatever happened. `now` is the attended clock. */
  step(dt: number, now: number): void {
    const { game, stage } = this
    this.now = now
    if (dt <= 0) return
    const busy = new Set<GuestId>(this.scene ? game.tea.guests.map((guest) => guest.who) : this.sips.keys())
    this.heard(tick(game, dt, busy))
    if (!game.pot.hop) this.landed()
    if (this.scene) {
      this.scene.update(now)
      if (!this.scene.running) {
        this.scene = null
        this.asFound = null
        this.showTable(false)
        this.saved(2)
      }
    }
    for (const [who, playing] of this.sips) {
      playing.scene.update(now)
      if (!playing.scene.running) this.sips.delete(who)
    }
    // The sitting has ended and the last sip is over: the guests clink. Then, at a quiet table, a guest may show something new.
    if (!this.scene && this.sips.size === 0) {
      if (this.ending) {
        this.ending = false
        this.play(clink(this))
      } else {
        // A new idea is shown as soon as the party is in its seats and no finger is on the table.
        const idea = this.mode === 'idle' && !this.touching && stage.guestsSeated() ? dueShowing(game) : null
        this.quiet = idea ? this.quiet + dt : 0
        if (idea && this.quiet >= SHOW_AFTER) {
          // A showing leaves the table as it found it, so what is stored while it plays is the table as found, with its mark.
          this.play(showing(this, idea))
        }
      }
    }
    this.streamSounds(dt)
    this.paddle(busy)
    this.wantsSaucer(busy)
    this.jokes(dt)
    if (this.mode === 'walk' || game.tea.guests.length === 0) {
      this.stepIn -= dt
      const who = this.guestOf(this.pressed)
      if (who && this.stepIn <= 0) {
        this.stepIn = 0.32
        this.say(cells.footstep(voiceKindOf(who), this.turn++))
      }
    }
    stage.showWorld(game.world, this.seats(), false)
  }

  /**
   * Now and then, at a table where nothing is happening and no finger is down, one guest does a small thing of its
   * own that is only funny: the Bear's belly rumbles, the Mouse hiccups, the Hen nods off, a Duckling yawns itself
   * over, and its twin after it. It asks for nothing and says nothing about the tea: it comes whatever is in the
   * cups, each guest in turn. A touch puts the next one off.
   */
  private jokes(dt: number): void {
    const { game, stage } = this
    const quiet = !this.scene && this.sips.size === 0 && this.mode === 'idle' && !this.touching && game.pot.flow <= 0 && !game.pot.hop && !game.tea.finished && game.tea.guests.length > 0 && stage.guestsSeated()
    if (!quiet) {
      this.jokeIn = Math.max(this.jokeIn, JOKE_AFTER)
      return
    }
    this.jokeIn -= dt
    if (this.jokeIn > 0) return
    const who = game.tea.guests[this.joked % game.tea.guests.length].who
    // The next one comes after 9 to 14 seconds, never at an even beat.
    this.jokeIn = 9 + 5 * ((this.joked * 0.618 + 0.3) % 1)
    this.joked += 1
    stage.guestDo(who, 'joke')
    this.say(cells.jokeCall(voiceKindOf(who)))
    // The second Duckling does everything half a beat after the first, this too.
    const twin = twinOf(who)
    if (twin && game.tea.guests.some((guest) => guest.who === twin)) {
      stage.guestDo(twin, 'joke')
      this.say(cells.jokeCall('duckling').map((part) => ({ ...part, at: part.at + 0.3 })))
    }
  }

  /** What a guest does near a puddle is its own taste: when one comes by a Duckling's place it paddles in it, once, and when one comes by the Mouse's she lifts her tail clear of it, once. */
  private paddle(busy: ReadonlySet<GuestId>): void {
    for (const guest of this.game.tea.guests) {
      const mouse = guest.who === 'mouse'
      if (!guest.who.startsWith('duckling') && !mouse) continue
      const wet = puddleNear(this.game.world, placeOf(this.game, guest.who), PUDDLE_REACH) > PUDDLE_MINDS
      if (!wet) this.paddled.delete(guest.who)
      else if (!this.paddled.has(guest.who) && !busy.has(guest.who) && this.game.pot.flow <= 0) {
        this.paddled.add(guest.who)
        // A Duckling paddles in it. The Mouse minds it, whether or not she has tea: she looks at it and lifts her tail clear.
        this.stage.guestDo(guest.who, mouse ? 'wait' : 'stream')
        this.say(mouse ? cells.waitCall('mouse') : cells.streamCall(voiceKindOf(guest.who)))
        this.stage.guestLook(guest.who, { x: placeOf(this.game, guest.who).x, z: placeOf(this.game, guest.who).z + 1.3 })
      }
    }
  }

  /** A guest with no saucer holds its cup in the air and looks at the stack on the tray, for as long as it has none. */
  private wantsSaucer(busy: ReadonlySet<GuestId>): void {
    const { game, stage } = this
    const stack = game.world.things.some((thing) => thing.kind === 'saucer' && thing.on === null && thing.heldBy === null && Math.hypot(thing.x - TRAY.saucers.x, thing.z - TRAY.saucers.z) < 0.05)
    for (const guest of game.tea.guests) {
      if (busy.has(guest.who)) continue
      const inPaw = stack && game.world.things.some((thing) => thing.kind === 'cup' && thing.heldBy === guest.who && !thing.worn)
      if (inPaw) {
        this.lacking.add(guest.who)
        stage.guestLook(guest.who, TRAY.saucers)
      } else if (this.lacking.delete(guest.who)) stage.guestLook(guest.who, null)
    }
  }

  private streamSounds(dt: number): void {
    const pot = this.game.pot
    if (pot.flow <= 0) {
      this.grainIn = 0
      return
    }
    const landing = this.landing()
    const under = thingById(this.game.world, pot.over)
    const spot = spoutSpot(pot)
    const spoon = !under && !this.game.overGuest && this.game.world.things.some((thing) => thing.kind === 'spoon' && thing.on === null && thing.heldBy === null && Math.hypot(thing.x - spot.x, thing.z - spot.z) < 0.5)
    this.stage.fan(spoon)
    this.grainIn -= dt
    if (this.grainIn <= 0) {
      this.grainIn = GRAIN_EVERY
      this.turn += 1
      if (this.streamOn) {
        this.say(cells.spoutGurgle(this.turn))
        // On anyone but the Bear, who gulps it, the stream flies off: the Hen shakes it away in a spray, the Ducklings splash in it, and it runs off the Mouse's tail.
        if (this.streamOn !== 'bear' && this.turn % 3 === 0) this.stage.splash(landing, this.streamOn === 'hen' ? 1.3 : this.streamOn === 'mouse' ? 0.6 : 0.9, this.streamOn === 'hen' ? 5 : 3)
      }
      else if (spoon) {
        this.say(cells.sheetHiss(this.turn))
        // The stream fans out from the bowl of the spoon: drops fly wide of it, all round.
        this.stage.splash(landing, 1.0, 4)
      }
      else if (under && under.kind === 'saucer') this.say(cells.poolPatter(this.turn))
      else if (under && under.kind === 'sponge') this.say(under.tea >= holds(under) - 1e-6 ? cells.slowDrip(this.turn) : cells.slurp(this.turn))
      else if (landing.wet) this.say(voices.trickle(landing.level, pot.flow / POUR.steady, this.turn))
      else this.say(voices.patter(this.turn))
      if (this.turn % 4 === 0) this.say(voices.glug(this.turn))
    }
    this.overflowing -= dt
    this.patterIn -= dt
    if (this.overflowing > 0 && this.patterIn <= 0) {
      this.patterIn = PATTER_EVERY
      this.say(voices.patter(this.turn + 11))
      // What is over the rim runs down the outside of the cup.
      const cup = thingById(this.game.world, this.over)
      if (cup && cup.kind === 'cup') this.stage.runOver(cup.id)
    }
  }

  /** Draws one frame and returns what it cost to draw. `dt` of 0 draws the table as it stands. */
  draw(dt: number, guidance: Guidance): { drawCalls: number; triangles: number } {
    const landing = this.game.pot.flow > 0 ? this.landing() : null
    // A scene that is playing is not idleness: nothing is hinted over it.
    const hint = this.scene || this.sips.size > 0 || this.mode !== 'idle' ? null : hintFor(this.game)
    return this.stage.frame(dt, this.game.world, this.game.pot, landing, guidance, hint)
  }
}
