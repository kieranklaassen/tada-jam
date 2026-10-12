import { BEAR, CAT, FROG, GATEPOST_FIGURE, HEDGEHOG, OWL, PERCH, POST_TOP, TUB, type Figure } from './figures'
import type { Receiver } from './lap'
import type { Load, Marks } from './lapState'
import { PERSONALITY, watch, type Sight } from './motion'
import { Now, Pose, Spell, Spring, TAU, arc, clamp, ease } from './pose'
import { SHELF_BEFORE } from './props'
import { CLEARING } from './scenery'
import { PLACES, offset } from './trail'

// The five who wait at the clearing. Each moves like itself and no two share
// a move: the owl snaps between stillnesses, the bear rocks like a sack, the
// hedgehog bounces, the frog sits dead still and then is suddenly somewhere
// else, and the cat is slow except for the end of her tail.
//
// Each also has its part in the hand-over: it steps in to the fox, takes
// what it wanted, carries it home and does with it what its tastes say. The
// scene (handover.ts) names the steps and when each happens; a step starts
// its motion on the frame it is named, so the sound that goes with it is the
// sound of that motion. `settle` puts one straight into the pose the scene
// ends in, which is also how a saved game finds it.

/** What was handed over: the load as it arrived. `fetched` is the owl left on the branch, which its mother brings home herself. */
export type Got = { load: Exclude<Load, 'none'>; left: number; marks: Marks; rode: boolean; fetched: boolean }

/**
 * How far along the trail from the shelf a receiver stands when it has stepped in: in the gateway, far enough
 * beyond the fox at the hand-over spot that all of it is behind all of the fox. Nothing of the two is ever in
 * the other, however near they stand on the glass.
 */
export const BESIDE = -SHELF_BEFORE

type Place = { x: number; s: number }

/** The way in from where each stands to the fox: by its own side of the trail and through the gateway, never through a post. Pegs right of the trail's middle and pegs from the shelf. */
const WAY_IN: Record<Receiver, readonly Place[]> = {
  bear: [],
  frog: [],
  // Down its own side to the gateway and then across, in front of the frog all the way: never through it.
  hedgehog: [{ x: 13, s: 10 }, { x: 13, s: BESIDE }],
  owl: [{ x: -11, s: 10 }],
  // Round the hedgehog, by the trail, and across in front of the frog like the hedgehog.
  cat: [{ x: 12, s: 62 }, { x: 12, s: BESIDE }],
}
/** Which side of a fox in the middle lane each comes to stand on. Beside a fox in an outer lane all of them stand on the side of the trail's middle, where there is room. */
const SIDE: Record<Receiver, -1 | 1> = { bear: -1, frog: 1, hedgehog: 1, owl: -1, cat: 1 }
/** A fox further than this from the trail's middle is in an outer lane, in pegs: half a lane's width. */
const OUTER = 10
/**
 * Pegs between the fox and whoever has stepped in beside it, as each stood when it set off. It reaches a paw or
 * a wing across some of them to take the load, and trail still shows between the two on the glass.
 */
export const STANDS_CLEAR = 8
/** How far to each side of where it stands a figure reaches, in pegs, as it is drawn on the frame it steps in. */
export type Reach = { left: number; right: number }

/** Seconds a step in, or a walk home, takes. */
export const WALK = 1.1

function alongWay(way: readonly Place[], p: number, out: Place): void {
  // Each leg takes time by its length, so the pace is even.
  let whole = 0
  for (let i = 1; i < way.length; i++) whole += Math.hypot(way[i].x - way[i - 1].x, way[i].s - way[i - 1].s)
  let gone = ease(clamp(p, 0, 1)) * whole
  for (let i = 1; i < way.length; i++) {
    const leg = Math.hypot(way[i].x - way[i - 1].x, way[i].s - way[i - 1].s)
    if (gone <= leg || i === way.length - 1) {
      const k = leg > 0 ? Math.min(1, gone / leg) : 1
      out.x = way[i - 1].x + (way[i].x - way[i - 1].x) * k
      out.s = way[i - 1].s + (way[i].s - way[i - 1].s) * k
      return
    }
    gone -= leg
  }
  out.x = way[0].x
  out.s = way[0].s
}

export abstract class Waiter {
  abstract readonly who: Receiver
  abstract readonly figure: Figure
  abstract readonly pose: Pose
  /** What it keeps beside it, which stays where it is when it steps in. */
  readonly fixture: { figure: Figure; pose: Pose } | null = null
  /** How much of the load it is holding where a load is drawn in its hands, or null when it holds none. */
  holding: number | null = null
  /** Where its hands are, in its own pegs. */
  abstract readonly hand: { x: number; y: number }
  protected got: Got | null = null
  protected readonly walk = new Spell()
  protected walking = false
  private way: Place[] = []
  private readonly at: Place = { x: 0, s: 0 }
  private away = false
  /** Which side of the fox it came to stand on: -1 to the left of it, 1 to the right. */
  protected side: -1 | 1 = 1
  protected readonly shutFor = new Spell()
  protected readonly looking = new Spell()
  protected readonly greeting = new Spell()

  /** Where it stands: pegs right of the trail's middle, and pegs from the shelf by the shorter way. */
  get home(): Place {
    const home = CLEARING[this.who]
    return { x: home.x, s: offset(PLACES.shelf, home.s) }
  }

  /**
   * Steps in to the fox, which stands `foxX` pegs right of the trail's middle and is drawn from `fox.left` to
   * `fox.right`. It stops beside the fox with trail showing between them: `own` is how far it reaches to each
   * side of where it stands, plate, wing and all.
   */
  come(foxX: number, fox: Reach, own: Reach): void {
    const home = this.home
    const side = Math.abs(foxX) > OUTER ? (foxX > 0 ? -1 : 1) : SIDE[this.who]
    this.side = side
    const x = side < 0 ? fox.left - STANDS_CLEAR - own.right : fox.right + STANDS_CLEAR + own.left
    // The bear and the frog stand by the gate already: they step across to the fox and no nearer the child.
    this.way = [{ x: home.x, s: home.s }, ...WAY_IN[this.who], { x, s: home.s <= 0 ? home.s : BESIDE }]
    this.away = true
    this.walk.start(WALK)
  }

  /** Goes home by the way it came. */
  goHome(): void {
    if (!this.away) return
    this.way = [...this.way].reverse()
    this.away = false
    this.walk.start(WALK)
  }

  /** Looks at the fox's empty hands: the mother owl only, before she fetches the baby herself. */
  look(): void {
    this.looking.start(1.6)
  }

  /** Looks the fox in the face as it comes in, as it would anyone. */
  greet(): void {
    this.greeting.start(1.6)
  }

  /** A finger landed on it. */
  abstract poke(): void
  /** A step of the hand-over, by name. */
  abstract react(step: string, got: Got | null): void
  /** Straight into the pose the hand-over ends in for `got`, or waiting when it got nothing. */
  settle(got: Got | null): void {
    this.got = got
    this.walk.stop()
    this.looking.stop()
    this.greeting.stop()
    this.away = false
    this.way = []
    this.walking = false
    this.rest(got)
  }
  protected abstract rest(got: Got | null): void
  protected abstract move(seconds: number, t: number, sight: Sight): void

  update(seconds: number, t: number, sight: Sight): Pose {
    const pose = this.pose
    pose.clear()
    this.fixture?.pose.clear()
    const walk = this.walk.step(seconds)
    this.walking = walk >= 0
    const home = this.home
    if (this.way.length > 0) {
      alongWay(this.way, walk >= 0 ? walk : 1, this.at)
      pose.x = this.at.x - home.x
      pose.s = this.at.s - home.s
      if (walk < 0 && !this.away) this.way = []
    }
    watch(pose, sight)
    this.move(seconds, t, sight)
    if (this.looking.step(seconds) >= 0) {
      // Eyes on the fox's hands.
      pose.lookX = sight.right > 0 ? 1 : -1
      pose.lookY = 0
      pose.shut = false
    }
    if (this.greeting.step(seconds) >= 0) {
      // Eyes up at the fox's face, and open.
      pose.lookX = sight.right > 0 ? 1 : -1
      pose.lookY = 1
      pose.shut = false
    }
    return pose
  }
}

// --- The bear ----------------------------------------------------------------

/** Licking the crumbs off the fox's hands: how long it takes, how far the bear leans over to the fox, in radians, and how far its head reaches that way, in pegs. */
export const CRUMBS_SECONDS = 1
export const BEAR_LEANS = 0.5
export const BEAR_REACHES = 12

export class BearMotion extends Waiter {
  readonly who = 'bear' as const
  readonly figure = BEAR
  readonly pose = new Pose(BEAR)
  readonly hand = { x: 9, y: 20 }
  private readonly person = PERSONALITY.bear
  private readonly belly = new Spring(this.person.stiffness, this.person.damping)
  private readonly sniff = new Now(31, 6, 10)
  private readonly blink = new Now(32, 3.5, 7)
  private readonly sniffing = new Spell()
  private readonly chomp = new Spell()
  private readonly frozen = new Spell()
  private readonly licking = new Spell()
  private readonly wringing = new Spell()
  private readonly leaning = new Spell()
  private crumbs = false
  private content = false

  poke(): void {
    this.belly.kick(-9)
  }

  react(step: string, got: Got | null): void {
    switch (step) {
      case 'take':
        this.holding = got ? got.left : null
        this.belly.kick(4)
        break
      case 'wring':
        this.wringing.start(0.8)
        break
      case 'bite':
        this.chomp.start(0.3)
        this.frozen.start(0.9)
        break
      case 'spit':
        this.belly.kick(-12)
        if (this.holding !== null) this.holding = Math.max(0, this.holding - 1)
        break
      case 'eat':
        this.chomp.start(0.45)
        this.belly.kick(6)
        if (this.holding !== null) this.holding = Math.max(0, this.holding - 1)
        break
      case 'lick':
        this.licking.start(0.9)
        break
      case 'crumbs':
        // No tier is left: it leans over to the fox, where the cake was eaten, and licks the crumbs off its hands.
        this.leaning.start(CRUMBS_SECONDS)
        break
      case 'sigh':
        this.rest(got)
        this.belly.kick(3)
        break
      default:
        break
    }
  }

  protected rest(got: Got | null): void {
    // Whatever came, it has been eaten: crumbs on the plate, and a bear with its eyes shut.
    this.leaning.stop()
    this.holding = null
    this.crumbs = got !== null
    this.content = got !== null
  }

  protected move(seconds: number, t: number, sight: Sight): void {
    const pose = this.pose, parts = pose.parts
    const beat = t * TAU * this.person.tempo
    // A heavy rock from side to side, with the head a beat behind; on the way it is a waddle.
    pose.tilt = this.walking ? 0.12 * Math.sin(t * TAU * 2.2) : 0.035 * Math.sin(beat)
    parts.head.turn = 0.05 * Math.sin(beat - 0.9)
    const belly = this.belly.step(seconds)
    pose.sy = 1 + clamp(belly * 0.1, -0.22, 0.16)
    pose.sx = 1 - clamp(belly * 0.08, -0.14, 0.18)
    parts.head.turn += clamp(belly * 0.12, -0.3, 0.3)
    // The plate is held out, and jiggles when the fox is by.
    const near = Math.abs(sight.ahead) < 70 && this.holding === null && !this.crumbs
    parts.plate.turn = near ? 0.1 * Math.sin(t * TAU * 1.1) : 0.06 * Math.sin(beat * 2)
    parts.plate.dy = (near ? 1 : 0) + 0.5 * Math.sin(beat) + clamp(belly * 0.8, -2, 2)
    if (this.sniff.due(t)) this.sniffing.start(0.9)
    const sniff = this.sniffing.step(seconds)
    if (sniff >= 0) parts.head.dy = Math.abs(Math.sin(sniff * TAU)) * 1.2
    const chomp = this.chomp.step(seconds)
    if (chomp >= 0) {
      // Down to the plate and up again, jaw going.
      parts.head.dy = -3 * arc(chomp)
      parts.head.turn = -0.3 * arc(chomp)
      parts.plate.dy += 3 * arc(chomp)
    }
    const frozen = this.frozen.step(seconds)
    if (frozen >= 0) {
      // A mud tier: it stops dead with its eyes wide.
      pose.tilt = 0
      parts.head.turn = 0.02 * Math.sin(t * 60)
    }
    const lick = this.licking.step(seconds)
    if (lick >= 0) {
      parts.head.dy = -2 + Math.sin(lick * TAU * 3)
      parts.head.turn = -0.35 + 0.1 * Math.sin(lick * TAU * 3)
    }
    const lean = this.leaning.step(seconds)
    if (lean >= 0) {
      // Over to the fox's side, head down to its hands, three licks, and up again.
      const over = Math.min(1, lean / 0.2, (1 - lean) / 0.2)
      pose.tilt = BEAR_LEANS * over * this.side
      parts.head.dx = -this.side * BEAR_REACHES * over
      parts.head.dy = -3 * over + Math.sin(lean * TAU * 3) * over
      parts.head.turn = this.side * 0.3 * over
    }
    const wring = this.wringing.step(seconds)
    if (wring >= 0) parts.plate.turn = 0.5 * Math.sin(wring * TAU * 3)
    parts.crumbs.show = this.crumbs
    parts.crumbs.dy = parts.plate.dy
    if (this.blink.due(t)) this.shutFor.start(0.2)
    pose.shut = this.shutFor.step(seconds) >= 0 || (this.content && frozen < 0)
    if (frozen >= 0) pose.shut = false
  }
}

// --- The frog ------------------------------------------------------------------

/** How high the frog goes to clear the side of its tub. */
const OVER_THE_RIM = 17

export class FrogMotion extends Waiter {
  readonly who = 'frog' as const
  readonly figure = FROG
  readonly pose = new Pose(FROG)
  override readonly fixture = { figure: TUB, pose: new Pose(TUB) }
  readonly hand = { x: 0, y: 24 }
  private readonly person = PERSONALITY.frog
  private readonly rise = new Spring(this.person.stiffness, this.person.damping)
  private readonly dip = new Now(41, 1.6, 3.2)
  private readonly blink = new Now(42, 2, 4)
  private readonly under = new Spell()
  private readonly tapping = new Spell()
  private readonly diving = new Spell()
  /** How much water stands in the tub, 0 to 3, or -1 when the bucket came empty and is a hat. */
  private water = 0
  private hat = false

  poke(): void {
    this.under.start(0.9)
  }

  react(step: string, got: Got | null): void {
    switch (step) {
      case 'take':
        this.holding = got ? got.left : null
        break
      case 'pour':
        this.holding = null
        this.water = got ? got.left : 0
        break
      case 'dive':
        this.diving.start(2.4)
        break
      case 'float':
      case 'sit':
        this.rest(got)
        this.rise.kick(-30)
        break
      case 'hat':
        this.rest(got)
        this.rise.kick(20)
        break
      default:
        break
    }
  }

  protected rest(got: Got | null): void {
    this.holding = null
    this.water = got ? got.left : 0
    this.hat = got !== null && got.left === 0
  }

  protected move(seconds: number, t: number): void {
    const pose = this.pose, parts = pose.parts
    const tub = this.fixture.pose.parts
    const out = pose.x !== 0 || pose.s !== 0
    // Out of its tub it goes in hops, legs and all.
    parts.legs.show = out
    if (this.walking) pose.y = Math.abs(Math.sin(t * TAU * 2.6)) * 7
    if (out) {
      // Out of the tub and into it again goes over the rim, never through the side: while it is over the wall
      // of the tub it is higher than the wall.
      const near = Math.abs(pose.x)
      const over = near < 3 ? near / 3 : near < 12 ? 1 : near < 16 ? (16 - near) / 4 : 0
      pose.y = Math.max(pose.y, OVER_THE_RIM * ease(clamp(over, 0, 1)))
    }
    const waiting = this.water === 0 && !this.hat && !out
    // Dead still, then gone under the rim, then up again all at once.
    if (waiting && !this.under.on && this.dip.due(t)) {
      if (this.dip.roll() < 0.5) this.under.start(0.45)
      else this.tapping.start(0.8)
    }
    const under = this.under.step(seconds) >= 0 && !out
    const head = this.rise.step(seconds, under ? -7 : 0)
    parts.head.dy = clamp(head, -7, 6)
    parts.arm.dy = parts.head.dy
    const tap = this.tapping.step(seconds)
    // It points down into the dry tub, and taps the rim.
    parts.arm.turn = tap >= 0 ? 0.35 * Math.abs(Math.sin(tap * TAU * 2.5)) : 0
    const dive = this.diving.step(seconds)
    tub.water.show = this.water > 0
    // One level is a puddle in the bottom, three is the brim.
    tub.water.dy = (this.water - 3) * 3.5 + 0.4 * Math.sin(t * 3)
    if (this.water === 3 && !out) {
      // Brim full: round and round, only the top of its head out.
      parts.head.dy = -5 + (dive >= 0 ? -2 * arc(dive * 2) : 0)
      parts.head.dx = 7 * Math.sin(t * TAU * (dive >= 0 ? 0.9 : 0.35))
      parts.arm.show = false
    } else if (this.water === 2 && !out) {
      // On its back, belly up, turning slowly.
      parts.belly.show = true
      parts.head.show = parts.arm.show = false
      parts.belly.dx = 3 * Math.sin(t * 0.8)
      parts.belly.dy = 0.5 * Math.sin(t * 1.7)
    } else if (this.water === 1 && !out) {
      // Sat in the puddle, patting it.
      parts.arm.turn = 0.4 * Math.abs(Math.sin(t * TAU * 0.8))
    }
    parts.hat.show = this.hat && !out
    parts.hat.dy = parts.head.dy
    if (this.blink.due(t)) this.shutFor.start(0.1)
    pose.shut = this.shutFor.step(seconds) >= 0
  }
}

// --- The owl -------------------------------------------------------------------

export class OwlMotion extends Waiter {
  readonly who = 'owl' as const
  readonly figure = OWL
  readonly pose = new Pose(OWL)
  override readonly fixture = { figure: PERCH, pose: new Pose(PERCH) }
  readonly hand = { x: 0, y: 18 }
  private readonly person = PERSONALITY.owl
  private readonly head = new Spring(this.person.stiffness, this.person.damping)
  private readonly puff = new Spring(160, 9)
  private readonly snap = new Now(51, 1.8, 3.4)
  private readonly blink = new Now(52, 4, 8)
  private readonly flutter = new Spell()
  private readonly gone = new Spell()
  private readonly pluck = new Spell()
  private readonly drying = new Spell()
  private to = 0
  private tucked = false
  private asleep = false

  poke(): void {
    this.puff.kick(6)
    this.flutter.start(0.6)
  }

  react(step: string, got: Got | null): void {
    switch (step) {
      case 'take':
        this.holding = got ? 1 : null
        this.flutter.start(0.5)
        break
      case 'flyoff':
        // Up and away over the trees, and back with the baby.
        this.gone.start(1.6)
        break
      case 'fetch':
        this.holding = 1
        break
      case 'dry':
      case 'shakeout':
        this.drying.start(0.8)
        break
      case 'preen':
        this.pluck.start(0.45)
        break
      case 'tuck':
        this.holding = null
        this.tucked = true
        this.puff.kick(4)
        break
      case 'snore':
        this.rest(got)
        break
      default:
        break
    }
  }

  protected rest(got: Got | null): void {
    this.holding = null
    this.tucked = got !== null
    this.asleep = got !== null
  }

  protected move(seconds: number, t: number): void {
    const pose = this.pose, parts = pose.parts
    const flying = this.walking || pose.x !== 0 || pose.s !== 0
    // An owl is still, and then its head is somewhere else: it tilts in snaps and holds.
    if (!this.asleep && this.snap.due(t)) {
      this.to = [-0.32, 0, 0.32][Math.floor(this.snap.roll() * 3)]
      this.flutter.start(0.35)
    }
    parts.body.turn = this.head.step(seconds, this.asleep ? 0.12 : this.to)
    const puff = this.puff.step(seconds)
    // Only she puffs up: the post she sits on stays as it is.
    parts.body.dy = Math.max(0, puff * 2)
    const flutter = this.flutter.step(seconds)
    // The wing stays open over the empty hollow, and shivers after each snap. With the baby home it folds.
    parts.wing.turn = (this.tucked ? -0.9 : 0) + parts.body.turn * 0.5 + (flutter >= 0 ? 0.16 * Math.sin(flutter * TAU * 4) * (1 - flutter) : 0)
    if (flying) parts.wing.turn = 0.9 * Math.sin(t * TAU * 4)
    const gone = this.gone.step(seconds)
    if (gone >= 0) {
      pose.y += 70 * arc(gone)
      pose.x -= 40 * arc(gone)
      parts.wing.turn = 0.9 * Math.sin(t * TAU * 4)
    }
    const pluck = this.pluck.step(seconds)
    if (pluck >= 0) parts.body.turn = -0.5 * arc(pluck)
    const dry = this.drying.step(seconds)
    if (dry >= 0) {
      parts.wing.turn = -0.9 + 0.5 * Math.sin(dry * TAU * 4)
      parts.body.turn = 0.2 * Math.sin(dry * TAU * 4)
    }
    parts.wing.dy = parts.body.dy
    this.fixture.pose.parts.baby.show = this.tucked
    // Asleep, the two of them breathe a little out of step.
    if (this.asleep) {
      parts.body.dy += 0.6 * Math.sin(t * 1.9)
      this.fixture.pose.parts.baby.dy = 0.5 * Math.sin(t * 1.9 + 1.2)
    }
    // A slow owl blink.
    if (this.blink.due(t)) this.shutFor.start(0.38)
    pose.shut = this.shutFor.step(seconds) >= 0 || this.asleep
  }
}

// --- The hedgehog ----------------------------------------------------------------

export class HedgehogMotion extends Waiter {
  readonly who = 'hedgehog' as const
  readonly figure = HEDGEHOG
  readonly pose = new Pose(HEDGEHOG)
  readonly hand = { x: -12, y: 12 }
  private readonly person = PERSONALITY.hedgehog
  private readonly blink = new Now(62, 1.5, 3.5)
  private readonly curl = new Spell()
  private readonly jump = new Spring(260, 12)
  private readonly laugh = new Spell()
  private readonly skip = new Spell()
  private floats = false
  private strings = false

  poke(): void {
    this.curl.start(0.6)
  }

  react(step: string, got: Got | null): void {
    switch (step) {
      case 'take':
        this.holding = got ? got.left : null
        break
      case 'hug':
        this.jump.kick(14)
        break
      case 'pop':
        // One always goes on its own spines.
        if (this.holding !== null) this.holding = Math.max(0, this.holding - 1)
        this.jump.kick(60)
        break
      case 'laugh':
        this.laugh.start(0.9)
        break
      case 'float':
        this.floats = true
        break
      case 'skip':
        this.strings = true
        this.skip.start(0.5)
        this.jump.kick(34)
        break
      default:
        break
    }
  }

  protected rest(got: Got | null): void {
    this.holding = got ? Math.max(0, got.left - 1) : null
    // With all four it is off the ground, holding the other three.
    this.floats = got !== null && got.left === 4
    this.strings = got !== null && got.left === 0
  }

  protected move(seconds: number, t: number): void {
    const pose = this.pose, parts = pose.parts
    const beat = t * TAU * this.person.tempo
    const has = this.holding !== null
    // Up on its toes again and again, reaching with both arms, a little out of step with each other.
    pose.y += Math.abs(Math.sin(beat / 2)) * (this.walking ? 3 : has ? 0.6 : 1.7)
    parts.armLeft.turn = has ? 0.1 : 0.3 * Math.sin(beat)
    parts.armRight.turn = has ? -0.1 : -0.3 * Math.sin(beat + 1.3)
    pose.y += Math.max(0, this.jump.step(seconds) * 0.2)
    if (this.floats && !this.walking) {
      pose.y += 7 + 1.5 * Math.sin(t * 1.3)
      pose.tilt = 0.1 * Math.sin(t * 0.9)
    }
    const laugh = this.laugh.step(seconds)
    if (laugh >= 0) pose.tilt = 0.18 * Math.sin(laugh * TAU * 5)
    const skip = this.skip.step(seconds)
    if (this.strings) {
      // The strings go round like a skipping rope.
      const round = skip >= 0 ? skip * TAU : t * 2
      parts.armLeft.turn = 0.6 * Math.sin(round)
      parts.armRight.turn = 0.6 * Math.sin(round + 0.4)
    }
    const curl = this.curl.step(seconds)
    if (curl >= 0) {
      // Poked, it rolls right over once as a ball of spines.
      pose.tilt = ease(curl) * TAU
      parts.armLeft.show = parts.armRight.show = false
      pose.y += arc(curl) * 3
    }
    if (this.blink.due(t)) this.shutFor.start(0.09)
    pose.shut = this.shutFor.step(seconds) >= 0 || laugh >= 0
  }
}

// --- The cat -----------------------------------------------------------------------

/** Where the kitten is: on top of the post, on a rung of the ladder (1 the top, 5 the foot), on the goose's back, or down beside its mother. */
type KittenAt = 'post' | 1 | 2 | 3 | 4 | 5 | 'goose' | 'down'

/** Where the goose sits by the gatepost when she rode the ladder in, in the cat's own pegs. */
export const GOOSE_BY_POST = { x: 34, y: 0 }

export class CatMotion extends Waiter {
  readonly who = 'cat' as const
  readonly figure = CAT
  readonly pose = new Pose(CAT)
  override readonly fixture = { figure: GATEPOST_FIGURE, pose: new Pose(GATEPOST_FIGURE) }
  readonly hand = { x: 9, y: 6 }
  private readonly person = PERSONALITY.cat
  private readonly stretch = new Spring(this.person.stiffness, this.person.damping)
  private readonly kittenHop = new Spring(400, 20)
  private readonly blink = new Now(72, 3, 6.5)
  private readonly washing = new Spell()
  private ladder = false
  private muddy = false
  private kitten: KittenAt = 'post'

  poke(): void {
    this.stretch.kick(5)
  }

  react(step: string, got: Got | null): void {
    switch (step) {
      case 'take':
        this.holding = got ? 1 : null
        break
      case 'prop':
        this.holding = null
        this.ladder = true
        this.muddy = got !== null && got.marks.muddy
        break
      case 'rung':
        this.kitten = this.kitten === 'post' ? 1 : typeof this.kitten === 'number' && this.kitten < 5 ? ((this.kitten + 1) as KittenAt) : this.kitten
        this.kittenHop.kick(30)
        break
      case 'slide':
        this.kitten = 5
        this.kittenHop.kick(-40)
        break
      case 'wash':
        this.kitten = 'down'
        this.washing.start(0.5)
        break
      case 'ridedown':
        this.kitten = 'goose'
        this.kittenHop.kick(-30)
        break
      case 'down':
        this.kitten = 'down'
        this.kittenHop.kick(30)
        break
      case 'purr':
        this.rest(got)
        break
      default:
        break
    }
  }

  protected rest(got: Got | null): void {
    this.holding = null
    this.ladder = got !== null
    // Licked clean by the end.
    this.muddy = false
    this.kitten = got === null ? 'post' : got.rode ? 'goose' : 'down'
  }

  protected move(seconds: number, t: number): void {
    const pose = this.pose, parts = pose.parts
    const post = this.fixture.pose.parts
    const beat = t * TAU * this.person.tempo
    // All of her is still but the end of her tail, which lashes for a while and then rests. On the way it is up like a flag.
    const lashing = clamp(Math.sin(t * TAU * 0.13) * 3, 0, 1)
    parts.tail.turn = this.walking ? -0.5 + 0.1 * Math.sin(t * 9) : 0.5 * Math.sin(beat) * lashing
    if (this.walking) pose.y = Math.abs(Math.sin(t * TAU * 2)) * 1.2
    // The arm points up at the kitten and nudges that way, until the kitten is down.
    const pointing = this.kitten === 'post' && this.holding === null
    parts.arm.turn = pointing ? 0.07 * Math.sin(t * TAU * 0.9) : 0.45
    parts.arm.dy = pointing ? 0.5 * Math.abs(Math.sin(t * TAU * 0.9)) : 0
    const stretch = this.stretch.step(seconds)
    parts.head.dy = clamp(stretch * 1.6, -1, 3)
    parts.head.turn = 0.08 + clamp(stretch * 0.1, -0.2, 0.2)
    const wash = this.washing.step(seconds)
    if (wash >= 0) {
      // Down to the kitten, ears back, one long lick.
      parts.head.dy = -2.5 * arc(wash)
      parts.head.turn = 0.5 * arc(wash)
    }

    post.ladder.show = this.ladder
    post.ladderMud.show = this.ladder && this.muddy
    const hop = this.kittenHop.step(seconds)
    const where = this.kitten
    post.kitten.show = where !== 'down'
    post.kittenDown.show = where === 'down'
    if (where === 'post') post.kitten.turn = 0.12 * Math.sin(t * TAU * 0.7)
    else if (where === 'goose') {
      // On the goose's back, beside the post.
      post.kitten.dx = GOOSE_BY_POST.x - 13 + 1
      post.kitten.dy = -POST_TOP + 13 + Math.max(0, hop * 0.1)
    } else if (where !== 'down') {
      // On the ladder, a rung lower each time.
      post.kitten.dx = 6 + where * 0.7
      post.kitten.dy = 22 - POST_TOP - where * 4 + Math.max(0, hop * 0.1)
    } else post.kittenDown.dy = Math.max(0, hop * 0.1)
    if (this.blink.due(t)) this.shutFor.start(0.25)
    pose.shut = this.shutFor.step(seconds) >= 0 || wash >= 0
  }
}

export function makeWaiters(): Record<Receiver, Waiter> {
  return { owl: new OwlMotion(), bear: new BearMotion(), hedgehog: new HedgehogMotion(), frog: new FrogMotion(), cat: new CatMotion() }
}
