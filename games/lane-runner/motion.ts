import { FOX, GOOSE, type Figure } from './figures'
import { ACTS, HANG, REST_BEFORE_TURN, TEETER_SECONDS, type Lap, type LapEvent, type Who } from './lap'
import { Now, Pose, Spell, Spring, TAU, arc, clamp, ease } from './pose'
import { CLEAR, zoneAt } from './trail'

// How the fox and the goose move. Each character has its own tempo, its own
// weight and one part that is the funniest thing about it, and no two share
// a move: the fox is quick and trails a tail, the goose is all neck. The five
// who wait are in receivers.ts, and what lives on the trail in wayside.ts.
//
// Nothing here draws. A motion turns play time and what the lap says into a
// `Pose` of plain numbers, which placing.ts lays onto the figure's plaques.

/** What each character is like. `tempo` is beats a second of its move at rest; `stiffness` and `damping` are its spring, so its weight. */
export const PERSONALITY: Record<Who, { tempo: number; stiffness: number; damping: number; funniest: string }> = {
  fox: { tempo: 0.45, stiffness: 220, damping: 14, funniest: 'tail' },
  goose: { tempo: 0.18, stiffness: 150, damping: 10, funniest: 'neck' },
  owl: { tempo: 0.4, stiffness: 600, damping: 30, funniest: 'body' },
  bear: { tempo: 0.22, stiffness: 40, damping: 5, funniest: 'plate' },
  hedgehog: { tempo: 1.6, stiffness: 300, damping: 16, funniest: 'armLeft' },
  frog: { tempo: 0.3, stiffness: 500, damping: 18, funniest: 'head' },
  cat: { tempo: 0.55, stiffness: 90, damping: 9, funniest: 'tail' },
}

/** Pegs a running foot is lifted off the board. */
export const LEG_LIFT = 2.6
/** How tall the fox is when it gives way under the branch: lower than the branch's underside. */
export const DUCKED = (CLEAR.ball - 1) / CLEAR.fox
/** How far round its arms are flung in a dive: straight out past its ears. */
export const DIVE_ARMS = 2.9
/** How flat the ball goes in the hollow end of the log. */
export const SQUASHED = (CLEAR.hollow - 1) / CLEAR.ball

/** Seconds the fox holds its hands out to be licked clean, and how far to that side of its middle the crumbs lie, in pegs. */
export const OFFER_SECONDS = 1
/** How far over the goose is, 0 to 1, when her feet come out from under her, and how far they paddle to each side, in radians. */
export const GOOSE_FEET_SHOW = 0.5
export const GOOSE_PADDLES = 0.3
export const OFFER_REACH = 9

/** What a watcher knows of the fox: how far to its right the fox is, how far down the trail from it, in pegs. */
export type Sight = { right: number; ahead: number; up: number }

export function watch(pose: Pose, sight: Sight): void {
  pose.lookX = sight.right > 8 ? 1 : sight.right < -8 ? -1 : 0
  pose.lookY = sight.ahead > 60 ? 1 : 0
}

// --- The fox ---------------------------------------------------------------

/** How far from its middle the fox may reach with an arm, in pegs: less than half a lane, so that what stands in the next lane is never touched. */
export const ARM_REACH = 9.7
const ARMS = (['armLeft', 'armRight'] as const).map((name) => {
  const part = FOX.parts.find((one) => one.name === name)!
  return { name, side: Math.sign(part.at[0]), at: part.at[0], turn: part.turn ?? 0, long: part.plaque.h - part.pivot[1], wide: part.plaque.w }
})

export class FoxMotion {
  readonly figure: Figure = FOX
  readonly pose = new Pose(FOX)
  private readonly person = PERSONALITY.fox
  private readonly tail = new Spring(this.person.stiffness, this.person.damping)
  private readonly give = new Spring(520, 22)
  private readonly blink = new Now(11, 2.2, 5)
  private readonly glance = new Now(12, 2.5, 5.5)
  private readonly shutFor = new Spell()
  private readonly fright = new Spell()
  private readonly shake = new Spell()
  private readonly offer = new Spell()
  private offerTo: -1 | 1 = -1
  private readonly hop = new Spell()
  private spin: number
  private looks = 0

  constructor(lap: Lap) {
    // Found as left: turned the way the lap says, with nothing eased in.
    this.spin = lap.faces === 'trail' && !lap.finished ? Math.PI : 0
  }

  /** What the lap just did. Called on the frame it happened. */
  on(event: LapEvent): void {
    switch (event.type) {
      case 'start':
        this.give.kick(2.2)
        this.tail.kick(-4)
        break
      case 'stop':
        // Heels in: the body gives, and the tail whips past.
        this.give.kick(-2.6)
        this.tail.kick(9)
        break
      case 'jump':
        this.give.kick(3)
        break
      case 'land':
        this.give.kick(event.hard ? -5 : -3.6)
        this.tail.kick(5)
        break
      case 'lane':
        this.tail.kick(-event.dir * 5)
        break
      case 'fright':
        this.fright.start(0.55)
        this.give.kick(4)
        break
      case 'bump':
        this.give.kick(-3)
        this.tail.kick(-8)
        break
      case 'up':
      case 'pickup':
        this.give.kick(2.4)
        break
      case 'take':
        this.give.kick(1.8)
        break
      case 'step':
        // On the stepping stones every footfall is a hop.
        if (event.surface === 'stone') this.hop.start(0.16)
        break
      case 'cue':
        // The fox shakes itself dry, and shakes its head after a knock.
        if (event.act === 'splash' || (event.act === 'bonk' && event.index === 0)) this.shake.start(0.14)
        break
      case 'arrive':
        this.give.kick(-3)
        this.tail.kick(10)
        break
      default:
        break
    }
  }

  /** The fox holds out its hands, with the crumbs of a cake that is all gone on them, to whoever stands on that side of it. */
  offers(side: -1 | 1): void {
    this.offerTo = side
    this.offer.start(OFFER_SECONDS)
  }

  /** Nothing the hand-over set going is still going: the scene was ended. */
  still(): void {
    this.offer.stop()
  }

  /** `mime` is 0 to 1: how hard the ghost hand is pressing, at which the fox jogs on the spot to show what a press does. */
  update(seconds: number, t: number, lap: Lap, mime = 0): Pose {
    const pose = this.pose
    pose.clear()
    const parts = pose.parts
    const act = lap.act
    const p = act ? act.t / ACTS[act.kind].seconds : 0

    // The turn between the child and the trail: quick to go, slower to come back. At the end of the lap it turns to the child at once.
    const to = lap.faces === 'trail' && !lap.finished ? Math.PI : 0
    const rate = (to > this.spin ? 24 : 10) * seconds
    this.spin += clamp(to - this.spin, -rate, rate)
    pose.spin = this.spin
    const away = this.spin > Math.PI / 2
    const side = away ? 1 : -1

    const running = lap.speed > 0 && !lap.air && lap.roll <= 0 && !act
    const jogging = !running && !act && mime > 0.05 && !lap.down && !lap.air
    // One leg is off the board at a time, and a foot is back on it exactly as the lap says a foot came down.
    const beat = act?.kind === 'trot' ? p * 3 * Math.PI : running ? lap.phase : act?.kind === 'snag' || act?.kind === 'catch' ? t * TAU * 5 : t * TAU * 2.4
    const stride = running || act?.kind === 'trot' || act?.kind === 'snag' || act?.kind === 'catch' ? 1 : jogging ? mime : 0
    const swing = Math.sin(beat) * stride, bob = Math.abs(swing)

    const give = this.give.step(seconds)
    pose.sy = 1 + clamp(give * 0.09, -0.28, 0.22)
    pose.sx = 1 - clamp(give * 0.05, -0.16, 0.12)
    const hop = this.hop.step(seconds)
    pose.y = lap.y + bob * 1.3 + (hop >= 0 ? arc(hop) * 3 : 0)
    pose.x = lap.x
    pose.tilt = clamp(lap.vx * 0.009, -0.4, 0.4) * side

    parts.legLeft.dy = Math.max(0, swing) * LEG_LIFT
    parts.legRight.dy = Math.max(0, -swing) * LEG_LIFT
    parts.legLeft.turn = Math.max(0, swing) * 0.35
    parts.legRight.turn = Math.min(0, swing) * 0.35
    // The arms pump outwards in turn, each with the leg on its own side.
    parts.armLeft.turn = -Math.max(0, swing) * 0.9
    parts.armRight.turn = Math.max(0, -swing) * 0.9
    parts.face.dy = parts.nape.dy = -bob * 0.5

    // The tail hangs from a spring: it streams when the fox runs, trails a jump, and is thrown about by every stop and turn.
    const stream = running ? 0.55 + 0.22 * Math.sin(beat * 2) : 0
    const tail = this.tail.step(seconds, stream - lap.vx * 0.012 - (lap.air ? clamp(lap.vy * 0.006, -0.7, 0.7) : 0))
    parts.tail.turn = clamp(tail, -1.5, 1.6)

    // How the load changes the way it goes.
    if (running && lap.mode === 'wade') {
      // Knee deep: a slow heave from side to side.
      pose.tilt += 0.16 * Math.sin(beat)
      pose.sy *= 0.94
    } else if (running && lap.mode === 'tiptoe') {
      parts.legLeft.turn = parts.legRight.turn = 0
      parts.legLeft.dy = parts.legRight.dy = 0
      pose.y += 2 + bob * 0.6
    } else if (lap.mode === 'dangle') {
      // Hung from the balloons with its toes on the water.
      pose.y += 3
      parts.legLeft.turn = 0.12 * Math.sin(t * 7)
      parts.legRight.turn = -0.12 * Math.sin(t * 7 + 1)
      parts.legLeft.dy = parts.legRight.dy = -1
    }

    if (lap.air && !act && lap.diving) {
      // A dive: head first at the board, arms out ahead of its head, legs straight out behind and the tail after them.
      pose.tilt = Math.PI * side
      parts.legLeft.turn = parts.legRight.turn = 0
      parts.legLeft.dy = parts.legRight.dy = 0
      parts.armLeft.turn = -DIVE_ARMS
      parts.armRight.turn = DIVE_ARMS
      parts.face.dy = parts.nape.dy = 0
      parts.tail.turn = 0.5
    } else if (lap.air && !act) {
      // Legs tucked and arms flung up, more the higher it is.
      const up = clamp(lap.y / 14, 0, 1)
      parts.legLeft.turn = 0.7 * up
      parts.legRight.turn = -0.7 * up
      parts.armLeft.turn = -2.3 * up
      parts.armRight.turn = 2.3 * up
      parts.face.dy = parts.nape.dy = up
    }
    // With something in its hands the arms are up over its head, holding it.
    if (lap.carrying && lap.load !== 'none') {
      parts.armLeft.turn = -2.5 - Math.max(0, swing) * 0.2
      parts.armRight.turn = 2.5 + Math.max(0, -swing) * 0.2
    }
    if (lap.teeter > 0) {
      // Over the edge on one leg, arms going like a windmill.
      const q = 1 - lap.teeter / TEETER_SECONDS
      const out = arc(q) * lap.teeterDir * side
      pose.tilt += out * 0.5
      parts.legLeft.turn += out * 0.9
      parts.armLeft.turn = t * 22
      parts.armRight.turn = -t * 22
    }
    const fright = this.fright.step(seconds)
    if (fright >= 0) {
      parts.armLeft.turn = -2.6
      parts.armRight.turn = 2.6
      parts.tail.turn = 1.5
      pose.sx += 0.1 * (1 - fright)
    }
    if (lap.duck) pose.sy = DUCKED

    if (act) this.acting(act.kind, p, t, side)

    const shake = this.shake.step(seconds)
    if (shake >= 0) pose.tilt += 0.22 * Math.sin(shake * TAU * 2)
    const offer = this.offer.step(seconds)
    if (offer >= 0) {
      // Both hands out to one side, level, like a tray, and its head turned to watch them licked.
      const to = this.offerTo
      const out = Math.min(1, offer / 0.15, (1 - offer) / 0.15)
      parts.armLeft.turn = (to < 0 ? -1.5 : 1.1) * out
      parts.armRight.turn = (to < 0 ? -1.1 : 1.5) * out
      parts.face.turn = -0.18 * to * out
    }
    // The crumbs lie on the hands until the last of them is licked off.
    parts.crumbs.show = offer >= 0 && offer < 0.8 && !away
    parts.crumbs.dx = this.offerTo * OFFER_REACH

    const resting = !lap.down && !lap.air && !act && (lap.finished || lap.rest >= REST_BEFORE_TURN)
    if (resting && !jogging && offer < 0) {
      // At rest it breathes, sways its tail, tilts its head and looks about.
      const atRest = t * TAU * this.person.tempo
      pose.sy += 0.015 * Math.sin(atRest * 0.8)
      parts.tail.turn += 0.22 * Math.sin(atRest)
      parts.face.turn = 0.06 * Math.sin(atRest * 0.45 + 1)
      if (!lap.carrying) {
        parts.armLeft.turn = 0.05 * Math.sin(atRest * 0.8)
        parts.armRight.turn = -0.05 * Math.sin(atRest * 0.8)
      }
      if (this.glance.due(t)) this.looks = [-1, 0, 0, 1][Math.floor(this.glance.roll() * 4)]
    } else this.looks = 0
    pose.lookX = this.looks
    if (this.blink.due(t)) this.shutFor.start(0.12)
    pose.shut = this.shutFor.step(seconds) >= 0
    if (fright >= 0 || act?.kind === 'thrown' || act?.kind === 'burrs') {
      pose.shut = false
      pose.lookY = 1
    }

    // Rolled up it is one ball, which wears what the lap has put on the fox.
    const ball = lap.roll > 0 && !act
    if (ball) {
      for (const name in parts) parts[name].show = false
      const which = lap.fox.burrs ? 'ballBurrs' : lap.fox.muddy ? 'ballMud' : 'ball'
      parts[which].show = true
      // It rolls by quarter turns: a plaque of beads turned a quarter is the same square of beads, so no corner of
      // it ever dips or rises. Which quarter it is at is read from where the fox is and from nothing it did to get
      // there, so a ball stopped in a tunnel is found as it was left.
      parts[which].turn = Math.round((-lap.s * 0.14 * -side) / (Math.PI / 2)) * (Math.PI / 2)
      pose.sx = 1
      pose.tilt = 0
      // In the hollow end of the log there is less room than a ball is tall: it goes through squashed.
      pose.sy = zoneAt(lap.s) === 'log' && lap.lane === 0 ? SQUASHED : 1
      pose.y = lap.y
      return pose
    }
    parts.face.show = parts.chest.show = !away
    parts.nape.show = parts.back.show = away
    // What the lap has left on the fox, on whichever side the child sees.
    parts.mudFront.show = lap.fox.muddy && !away
    parts.mudBack.show = lap.fox.muddy && away
    parts.burrsFront.show = lap.fox.burrs && !away
    parts.burrsBack.show = lap.fox.burrs && away
    parts.hatFront.show = lap.fox.leaves && !away
    parts.hatBack.show = lap.fox.leaves && away
    // Wet, it drips: the drops fall and come again.
    const drip = -((t * 5) % 3)
    parts.dropsFront.show = lap.fox.wet && !away
    parts.dropsBack.show = lap.fox.wet && away
    parts.dropsFront.dy = parts.dropsBack.dy = drip
    parts.hatFront.dy = parts.hatBack.dy = parts.face.dy
    // The fox is never wider than its lane: an arm flung out is flung from nearer its middle.
    for (const arm of ARMS) {
      const part = parts[arm.name]
      const turn = arm.turn + part.turn
      const out = arm.side * (arm.at + part.dx) + arm.long * Math.max(0, arm.side * Math.sin(turn)) + (arm.wide / 2) * Math.abs(Math.cos(turn))
      if (out > ARM_REACH) part.dx -= arm.side * (out - ARM_REACH)
    }
    return pose
  }

  /** What carries the fox: each act has its own shape. */
  private acting(kind: keyof typeof ACTS, p: number, t: number, side: number): void {
    const pose = this.pose, parts = pose.parts
    const sit = (): void => {
      parts.legLeft.turn = 1.2
      parts.legRight.turn = -1.2
    }
    switch (kind) {
      case 'thrown':
        // Thrown back head over heels, then sat down shaking its head.
        pose.tilt = p < 0.5 ? ease(p * 2) * TAU * side : 0
        if (p >= 0.5) {
          sit()
          parts.face.turn = parts.nape.turn = Math.sin(t * 34) * 0.6 * (1 - p)
        }
        break
      case 'splash':
        // In with a hop, and then it sits in the water with its legs out.
        if (p > 0.3) sit()
        parts.armLeft.turn = -0.9
        parts.armRight.turn = 0.9
        break
      case 'bonk':
        // Once round the branch by its hands, and down.
        parts.armLeft.turn = -2.8
        parts.armRight.turn = 2.8
        pose.tilt = p < 0.75 ? ease(p / 0.75) * TAU * side : 0
        if (p >= 0.75) sit()
        break
      case 'flop':
        // Flat on its belly, arms and legs out.
        pose.tilt = (Math.PI / 2) * side * (p < 0.85 ? 1 : (1 - p) / 0.15)
        parts.armLeft.turn = -1.6
        parts.armRight.turn = 1.6
        parts.legLeft.turn = 0.5
        parts.legRight.turn = -0.5
        break
      case 'burrs':
        // Out backwards on one leg, hands in the air, fur on end.
        parts.armLeft.turn = -2.6
        parts.armRight.turn = 2.6
        parts.legLeft.turn = 0.8 * arc(p * 2)
        parts.tail.turn = 1.5
        pose.sx += 0.08
        break
      case 'tailhang':
        // Upside down by the tail: it swings, and comes round as it drops.
        pose.tilt = (p < HANG.drops ? Math.PI + 0.35 * Math.sin(p * TAU * 2.5) : Math.PI * (1 - ease((p - HANG.drops) / (1 - HANG.drops)))) * side
        parts.armLeft.turn = -2.9
        parts.armRight.turn = 2.9
        parts.tail.turn = 0
        break
      case 'trip':
        // Head over heels over the log, and flat on the far side.
        pose.tilt = (p < 0.6 ? -ease(p / 0.6) * TAU : -(Math.PI / 2) * (p < 0.9 ? 1 : (1 - p) / 0.1)) * side
        if (p >= 0.6) {
          parts.armLeft.turn = -1.6
          parts.armRight.turn = 1.6
        }
        break
      case 'snag':
        // Hung from the ladder, legs still running, creaking back and forth.
        parts.armLeft.turn = -2.9
        parts.armRight.turn = 2.9
        pose.tilt = p < 0.8 ? 0.3 * Math.sin(p * TAU * 2) : 0
        break
      case 'climb': {
        // Hand over hand up the rungs, then down the far side on its tail.
        const up = p < 0.45
        const reach = Math.sin(t * 26)
        parts.armLeft.turn = up ? -2.2 - 0.5 * reach : -2.8
        parts.armRight.turn = up ? 2.2 - 0.5 * reach : 2.8
        parts.legLeft.turn = up ? 0.4 * reach : 0.9
        parts.legRight.turn = up ? 0.4 * reach : -0.9
        pose.tilt = up ? 0 : -0.35 * side
        break
      }
      case 'vault':
        // Up and over on the end of the pole.
        parts.armLeft.turn = -2.9
        parts.armRight.turn = 2.9
        pose.tilt = (0.5 - p) * 1.3 * side
        parts.legLeft.turn = 0.6 * arc(p)
        parts.legRight.turn = -0.6 * arc(p)
        break
      case 'catch':
        // Held by the balloons, it leans into the run.
        pose.tilt += 0.18 * side
        break
      case 'blind':
        // The bucket is over its eyes: it weaves, hands out in front.
        pose.x += 7 * Math.sin(p * TAU * 2)
        pose.tilt = 0.25 * Math.sin(p * TAU * 2 + 1)
        parts.armLeft.turn = -1.5
        parts.armRight.turn = 1.5
        break
      case 'flight':
        // Carried by the ears: everything else hangs and swings.
        parts.armLeft.turn = 0.3
        parts.armRight.turn = -0.3
        parts.legLeft.turn = 0.25 * Math.sin(t * 9)
        parts.legRight.turn = -0.25 * Math.sin(t * 9 + 0.8)
        pose.tilt = 0.16 * Math.sin(p * TAU * 3)
        pose.sy *= 1.08
        break
      default:
        break
    }
  }
}

// --- The goose -------------------------------------------------------------

/** Where the goose is: on her nest, on the ladder the fox carries, or at the clearing where the ladder took her. */
export type GooseAt = 'nest' | 'riding' | 'clearing'

/** How far before her a fox in the air makes the goose flatten herself, in pegs, and how flat she goes: under half her height, so that all of her is lower than a fox that clears her. */
const GOOSE_FLATTENS = 50
export const GOOSE_FLAT = 0.45

export class GooseMotion {
  readonly figure: Figure = GOOSE
  readonly pose = new Pose(GOOSE)
  private readonly person = PERSONALITY.goose
  private readonly neck = new Spring(this.person.stiffness, this.person.damping)
  private readonly hop = new Spring(300, 14)
  private readonly swell = new Spring(120, 7)
  private readonly preen = new Now(21, 5, 9)
  private readonly preening = new Spell()
  private readonly honking = new Spell()
  private readonly ducking = new Spell()
  private readonly flapping = new Spell()
  private readonly gobbling = new Spell()
  private readonly fallen = new Spell()
  private readonly tall = new Spell()
  /** 0 to 1: how flat she has made herself under a fox in the air over her lane. */
  private flat = 0

  on(event: LapEvent): void {
    switch (event.type) {
      case 'honk':
        this.honking.start(0.42)
        this.neck.kick(event.after ? 5 : 7)
        this.hop.kick(event.after ? 14 : 22)
        this.flapping.start(0.5)
        break
      case 'bump':
        this.honking.start(0.6)
        this.neck.kick(9)
        this.hop.kick(30)
        this.flapping.start(0.9)
        break
      case 'squawk':
        this.honking.start(0.5)
        this.hop.kick(-40)
        this.flapping.start(0.7)
        break
      case 'duck':
        this.ducking.start(0.5)
        break
      case 'near':
        // She has seen something coming: up goes the neck.
        if (event.obstacle === 'goose') this.tall.start(1.2)
        break
      case 'poke':
        if (event.who !== 'goose') break
        this.honking.start(0.3)
        this.neck.kick(-6)
        this.hop.kick(16)
        break
      case 'step':
        // Riding the ladder, she honks in time with the fox's feet.
        if (event.rides) {
          this.honking.start(0.12)
          this.hop.kick(8)
        }
        break
      case 'gag':
        if (event.obstacle !== 'goose') break
        if (event.gag === 'snatch') this.gobbling.start(1.4)
        else if (event.gag === 'bang') this.fallen.start(1.6)
        else if (event.gag === 'sulk') {
          this.swell.kick(9)
          this.honking.start(0.5)
          this.flapping.start(1)
        } else if (event.gag === 'shove') {
          this.flapping.start(0.5)
          this.neck.kick(8)
        } else if (event.gag === 'ride') {
          this.hop.kick(34)
          this.flapping.start(0.6)
        }
        break
      default:
        break
    }
  }

  /** A hop and a flap of her own, for the hand-over. */
  flutter(seconds: number): void {
    this.flapping.start(seconds)
    this.hop.kick(20)
  }

  update(seconds: number, t: number, sight: Sight, looks: 'left' | 'right', at: GooseAt): Pose {
    const pose = this.pose
    pose.clear()
    const parts = pose.parts
    const beat = t * TAU * this.person.tempo
    // Drawn looking left; turned in a sulk, she is the same goose the other way round.
    pose.flip = looks === 'right'

    // She keeps an eye on a fox that is coming: the neck goes up tall. Otherwise it sways, and now and then dips back to preen.
    const coming = at === 'nest' && sight.ahead < 0 && sight.ahead > -170
    if (!coming && this.preen.due(t)) this.preening.start(1.3)
    const preen = this.preening.step(seconds)
    let to = 0.07 * Math.sin(beat)
    if (coming) to = 0.14
    else if (preen >= 0) to = -0.95 * arc(preen)
    const duck = this.ducking.step(seconds)
    if (duck >= 0) to = 1.3 * arc(Math.min(1, duck * 1.4))
    const tall = this.tall.step(seconds)
    const neck = clamp(this.neck.step(seconds, to), -1.2, 1.45)
    for (const name of ['neck', 'honk', 'full'] as const) {
      parts[name].turn = neck
      parts[name].dy = (coming ? 1.5 : 0) + (tall >= 0 ? 2.5 * arc(tall) : 0)
    }

    const hop = this.hop.step(seconds)
    pose.y = Math.max(0, hop * 0.12)
    pose.sy = 1 + clamp(hop * 0.006, -0.3, 0.08) - (duck >= 0 ? 0.12 * arc(duck) : 0)
    // A fox in the air over her lane: she flattens herself on the nest, neck along the ground, lower than the
    // height a fox must have to go over her, and is up again when it has gone.
    const over = at === 'nest' && Math.abs(sight.right) < 10 && sight.ahead > -GOOSE_FLATTENS && sight.ahead < 16 && sight.up > 1
    this.flat += ((over ? 1 : 0) - this.flat) * (1 - Math.exp(-seconds * 30))
    if (this.flat > 0.001) {
      const flat = this.flat
      pose.y *= 1 - flat
      pose.sy = pose.sy * (1 - flat) + GOOSE_FLAT * flat
      for (const name of ['neck', 'honk', 'full'] as const) {
        parts[name].turn += (1.45 - parts[name].turn) * flat
        parts[name].dy *= 1 - flat
      }
    }
    // Slopped on, she swells up to twice her height and shakes it off. She swells upward and never wider: she is
    // as wide as her lane already, and whoever passes beside her is not to be touched.
    const swell = Math.max(0, this.swell.step(seconds))
    pose.sy *= 1 + Math.min(1, swell)

    const flap = this.flapping.step(seconds)
    parts.wing.turn = flap >= 0 ? Math.sin(flap * TAU * 5) * 0.9 * (1 - flap) : 0.03 * Math.sin(beat * 2)

    const fallen = this.fallen.step(seconds)
    if (fallen >= 0) {
      // Off her nest backwards, feet in the air, and up again.
      const over = fallen < 0.15 ? fallen / 0.15 : fallen > 0.8 ? (1 - fallen) / 0.2 : 1
      pose.tilt = -1.5 * over * (pose.flip ? -1 : 1)
      parts.wing.turn = 0.8 * Math.sin(fallen * TAU * 4)
      // Her feet come out from under her as she goes over, and stand straight up in the air, paddling, however
      // far over she is.
      parts.feet.show = over > GOOSE_FEET_SHOW
      parts.feet.turn = -pose.tilt + GOOSE_PADDLES * Math.sin(fallen * TAU * 6)
    }

    const honk = this.honking.step(seconds) >= 0
    const gobble = this.gobbling.step(seconds)
    parts.honk.show = honk && gobble < 0
    parts.full.show = gobble >= 0
    parts.neck.show = !parts.honk.show && !parts.full.show
    if (gobble >= 0) for (const name of ['neck', 'honk', 'full'] as const) parts[name].turn += 0.25 * Math.sin(gobble * TAU * 4)
    return pose
  }
}
