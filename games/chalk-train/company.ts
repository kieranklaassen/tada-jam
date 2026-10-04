import { Cast, type Seat, type Wanted } from './cast'
import type { Bits } from './effects'
import { PACE, type Box, type Journey, type Pose } from './gait'
import type { EngineLife } from './life'
import type { Mark } from './marks'
import { pathLength, spotAt } from './path'
import type { Told } from './play'
import type { Rng } from './rng'
import { clipOf, feelClip, outClip } from './riderMotion'
import { Scene, type Beat } from './scene'
import type { Feel, RiderKind, Taste } from './tastes'
import { ownVoice, type VoiceKey } from './voices'
import { MAX_RIDERS, SEATS, railAt, waitsAhead, type Rider, type World } from './world'
import { PLACES, RAIL_DROP, distance, type PlaceId, type Pt } from './yard'

// The riders in the running game: who is seen where, what each is told as
// the train reaches it, and the short scenes. No renderer: the view draws the
// cast this keeps. Everything here is showing. What happened is already in
// the world, which was saved before any of it began.

/** A rider stands with its feet this far below the middle of its place, just above a rail that runs past. */
export const FEET_DROP = RAIL_DROP - 10
/** A rider in a wagon sits this far above the wagon's spot on the rail. */
const SEAT_UP = 30

/** What the company needs of the toy it plays in. */
export type Host = {
  readonly world: World
  /** The world as it will be if the finger lifts now, while a line is being drawn. */
  readonly ahead: World | null
  readonly journey: Journey
  readonly bits: Bits
  readonly life: EngineLife
  /** Game time, in seconds of attended play. */
  readonly clock: number
  ask(key: VoiceKey, pitch?: number, level?: number): void
  wagon(index: number): Pose
  /** A point of the engine's figure, given in its own frame, on the tar. */
  onEngine(local: Pt): Pt
}

/** A home on the tar: whose it is, where, and how far through its small answer to a touch it is (1 just touched, 0 at rest). */
/** How fast a rider walks over to the train, in tar units a second. */
const WALK = 220
/** Stops seen on the tar at once, at the most. */
const STOPS_MOST = 3

/** A home as it is seen: `shown` is how much of it is there, less than 1 while it is rubbed away. */
/** A stop on the tar: where, whose, and how far through its lamp's answer to a touch it is (1 just touched, 0 at rest). */
export type StopShown = Pt & { kind: RiderKind; lit: number }
/** The middle of a stop's lamp, on its post beside whoever waits, and how near a finger lands on it. */
export const lampOf = (stop: Pt): Pt => ({ x: stop.x - 55, y: stop.y - 139 })
const LAMP_TOUCH = 34
/** A touched lamp stays lit this long, in seconds. */
const LAMP_LIT = 0.8
export type HomeShown = { kind: RiderKind; at: Pt; pulse: number; shown: number }

const standAt = (place: PlaceId): Pt => ({ x: PLACES[place].x, y: PLACES[place].y + FEET_DROP })
/** A beat that starts something and ends it, however it is reached: played through, or jumped to its end by a touch. */
function once(at: number, lasts: number, start: () => void, end: () => void = () => {}): Beat {
  let started = false
  return { at, lasts, play(progress) { if (!started) { started = true; start() } if (progress >= 1) end() } }
}

export class Company {
  readonly cast: Cast
  scene: Scene | null = null
  /** Riders a scene is moving: they are left alone until it ends. */
  private inScene = new Set<RiderKind>()
  private pulses = new Map<RiderKind, number>()
  /** A stop's lamp answering a touch, by whose stop it is: 1 just touched, 0 at rest. */
  private lamps = new Map<RiderKind, number>()
  /** The line a rider is scraping in the first showing, and the mark it will be, which is not on the tar yet. */
  showing: { p: Pt[]; colour: number } | null = null
  hidden: Mark | null = null
  /** Riders still to be seen getting out, once the one before them is home. */
  private later: { kind: RiderKind; play: () => void }[] = []
  /** A scene is carrying the engine itself, round a roundabout: it ends as soon as the engine has a line to ride. */
  carrying = false

  constructor(private host: Host, rng: Rng) {
    this.cast = new Cast(rng)
    this.agree(true)
  }

  /** Where the feet of a rider in a wagon are. */
  seatAt = (index: number): Pt => {
    const { x, y, angle } = this.host.wagon(index)
    return { x: x + Math.sin(angle) * SEAT_UP, y: y - Math.cos(angle) * SEAT_UP }
  }

  /** The riders as they should be seen now: as the world has them, but not yet past what the train has still to reach. */
  private wanted(): Wanted[] {
    const world = this.host.ahead ?? this.host.world
    const waiting = this.host.journey.waiting as Told[]
    // Where each rider is seen: one a scene is moving stays as the scene has it.
    const seen = world.riders.map((r) => {
      const toBoard = waiting.some((t) => t.what === 'boarded' && t.rider === r.kind), toGetHome = waiting.some((t) => t.what === 'home' && t.rider === r.kind)
      const where = toBoard ? 'stop' : toGetHome ? 'train' : r.at === 'next' ? 'stop' : r.at === 'before' ? 'home' : r.at
      return { r, where, toGetHome, acting: this.inScene.has(r.kind) ? this.cast.of(r.kind) : undefined, life: this.cast.of(r.kind) }
    })
    // Two wagons seat two: while riders who are home already have still to be seen getting out, one who has
    // climbed aboard since is seen at its stop a little longer.
    let aboard = seen.filter((one) => one.where === 'train').length
    for (let i = seen.length - 1; i >= 0 && aboard > SEATS; i--) {
      if (seen[i].where !== 'train' || seen[i].toGetHome) continue
      seen[i].where = 'stop'
      aboard--
    }
    // The wagons in use: wherever anyone is sitting or climbing in now, whether or not they are about to get out.
    const taken = new Set<number>()
    for (const life of this.cast.riders.values()) if (life.seat.in === 'wagon') taken.add(life.seat.index)
    const wanted = seen.map(({ r, where, acting, life }): Wanted => {
      const id = `${r.kind}:${r.stop}>${r.home}`
      if (acting) return { id, kind: r.kind, seat: acting.seat, gaze: acting.gaze }
      let seat: Seat
      if (where === 'train') {
        let index = life?.seat.in === 'wagon' ? life.seat.index : -1
        if (index < 0) { index = taken.has(0) ? 1 : 0; taken.add(index) }
        seat = { in: 'wagon', index }
      } else seat = where === 'home' ? { in: 'home', at: standAt(r.home) } : { in: 'stop', at: standAt(r.stop) }
      return { id, kind: r.kind, seat, gaze: where === 'home' ? null : PLACES[r.home] }
    })
    // Never more than three stops at once: while a rider who is aboard already is still seen at its stop, a new one
    // waits a moment longer to be drawn in.
    let stops = wanted.filter((w) => w.seat.in === 'stop').length
    for (let i = wanted.length - 1; i >= 0 && stops > STOPS_MOST; i--) {
      if (wanted[i].seat.in !== 'stop' || this.cast.riders.has(wanted[i].id)) continue
      wanted.splice(i, 1)
      stops--
    }
    // Never more than four riders on the tar: while riders that are rubbed away are still fading, a new one waits
    // to be drawn in.
    const kept = wanted.filter((w) => this.cast.riders.has(w.id)).length
    let onTar = this.cast.riders.size + this.cast.gone.length
    for (let i = 0; i < wanted.length; i++) {
      if (this.cast.riders.has(wanted[i].id)) continue
      if (onTar >= MAX_RIDERS && kept + this.cast.gone.length > 0) wanted.splice(i--, 1)
      else onTar++
    }
    return wanted
  }

  /** Brings the cast into line with the world. A rider newly on the tar is drawn in with a scrape and a puff of dust. */
  agree(quietly = false): void {
    for (const kind of this.cast.agree(this.wanted(), quietly)) {
      const life = this.cast.of(kind)!
      this.host.bits.burst('dust', { x: life.x, y: life.y - 40 }, 14, 80, 0, 2.2, 0.7)
      this.host.ask('scrape', 1.2, 0.8)
    }
  }

  /** A free wagon, for a rider climbing aboard: the first, unless someone else sits in it. */
  private freeSeat(but?: RiderKind): number {
    for (const life of this.cast.riders.values()) if (life.kind !== but && life.seat.in === 'wagon' && life.seat.index === 0) return 1
    return 0
  }

  /**
   * No two riders in one wagon. Where three look seated, one of them is home
   * already and has yet to be seen getting out: whatever scene is playing ends,
   * and everyone who is not aboard is put where the world has them. Of two in
   * one wagon, the second takes the other one.
   */
  private oneEach(): void {
    const sitting = () => [...this.cast.riders.values()].filter((life) => life.seat.in === 'wagon')
    if (sitting().length > 2) {
      this.finish()
      const wanted = this.wanted()
      for (const life of sitting()) {
        const want = wanted.find((w) => w.kind === life.kind)
        if (want && want.seat.in !== 'wagon') life.put(want.seat)
      }
    }
    const [one, other] = sitting()
    if (!one || !other || (one.seat as { index: number }).index !== (other.seat as { index: number }).index) return
    const mover = this.inScene.has(other.kind) ? one : other
    const index = (mover.seat as { index: number }).index === 0 ? 1 : 0
    if (mover.moving) mover.seat = { in: 'wagon', index }
    else mover.put({ in: 'wagon', index })
  }

  /**
   * Which wagon a rider sits in is not saved, so it follows from what is: of
   * the riders aboard, the one the world names first sits in the first wagon.
   * A rider left alone in the second wagon moves up, and two that sit the
   * other way round change places, once nothing else is going on. A game put
   * away and opened again then finds each rider in the wagon it was in.
   */
  private moveUp(): void {
    if (this.scene || (this.host.journey.waiting as Told[]).some((t) => t.what === 'home' || t.what === 'boarded')) return
    const world: World = this.host.ahead ?? this.host.world
    const seated = world.riders.filter((r) => r.at === 'train').map((r) => this.cast.of(r.kind)).filter((life): life is NonNullable<typeof life> => !!life && life.seat.in === 'wagon')
    if (seated.some((life) => life.moving) || seated.length !== [...this.cast.riders.values()].filter((life) => life.seat.in === 'wagon').length) return
    seated.forEach((life, index) => {
      if (life.seat.in === 'wagon' && life.seat.index !== index) life.go({ in: 'wagon', index }, 'board', 0.5)
    })
  }

  /** The train has reached something it was to be told: who climbs aboard, who gets home, what a rider makes of the ride. */
  hear(told: Told): void {
    if (!('rider' in told) || told.rider === null) return
    const life = this.cast.of(told.rider), kind = told.rider
    if (!life || this.inScene.has(kind)) return
    if (told.what === 'boarded') {
      // Both wagons still look taken when someone who is home already has yet to be seen getting out: that scene
      // ends now, so the wagon is free for the rider climbing in.
      if (life.seat.in !== 'wagon' && [...this.cast.riders.values()].filter((other) => other !== life && other.seat.in === 'wagon').length >= 2) this.finish()
      if (life.seat.in !== 'wagon') {
        const seat: Seat = { in: 'wagon', index: this.freeSeat(kind) }, to = this.seatAt(seat.index)
        // One that waits near the train walks over to it, a step at a time, and then climbs in; one the train
        // has come to climbs straight in.
        if (told.walked) life.walk(seat, Math.max(0.7, Math.min(2.4, Math.hypot(to.x - life.x, to.y - life.y) / WALK)))
        else {
          life.go(seat, 'board')
          life.climbing = true
        }
      }
      // A rider the train came to is taken up with a clunk of the coupling; one that walks over just climbs in.
      if (!told.walked) this.host.ask('coupling-clunk')
      // It thumps down in the wagon when it lands there: `step` sounds that.
      this.host.ask(ownVoice(kind, 'call'))
    } else if (told.what === 'reaction') {
      // A rider still on its way to its wagon has not felt the ride yet.
      if (life.settledIn < 0) return
      life.act(feelClip(told.feel))
      // A like is heard in the rider's own way: the cat purrs on a fast run, the snail hums over the bumps and
      // sighs inside a scribble, and everyone else squeaks with delight.
      const liked: VoiceKey = kind === 'cat' && told.feel === 'fast' ? 'cat-hum' : kind === 'snail' && told.feel === 'bump' ? 'snail-hum' : kind === 'snail' && told.feel === 'scribble' ? 'sigh' : ownVoice(kind, 'squeak')
      // The chick's feathers fly round a loop.
      if (kind === 'chick' && told.feel === 'loop') this.host.bits.burst('feather', { x: life.x, y: life.y - 60 }, 7, 130, 1, 2.6, 1.7, 0.8)
      // The cat bats at the dust of a scribble: a puff of it in front of its nose, and its paw goes at it.
      if (kind === 'cat' && told.feel === 'scribble') this.host.bits.burst('dust', { x: life.x + 34, y: life.y - 86 }, 12, 70, 0, 2.2, 0.9)
      if (told.taste === 'like') this.host.ask(liked)
      else if (told.taste === 'dislike') this.host.ask(ownVoice(kind, told.feel === 'scribble' ? 'sneeze' : 'grumble'))
    } else if (told.what === 'full') {
      // The train comes to it and stops with its coupling clunk; the rider peers into the full wagons and stays.
      life.act('full')
      this.host.ask('coupling-clunk')
      this.host.ask(ownVoice(kind, 'call'), 0.9, 0.6)
    } else if (told.what === 'greeted') {
      life.act('greet')
      this.host.ask('coupling-clunk')
      this.host.ask(ownVoice(kind, 'call'))
    } else if (told.what === 'home') this.getHome(kind, told.how, told.taste)
  }

  /** Someone is walking over to the train or climbing into it: it waits for them to be seated. */
  get boarding(): boolean {
    for (const life of this.cast.riders.values()) if (life.onItsWay) return true
    return false
  }

  /** The line has stopped short: whoever is still aboard leans out toward its home. */
  reachOut(): void {
    for (const life of this.cast.riders.values()) if (life.seat.in === 'wagon' && !life.moving && !this.inScene.has(life.kind)) life.act('reach')
  }

  /** Something the child did to a rider with chalk: its trick for a tap, and what a zigzag, a ring and a scribble do to it. */
  chalked(kind: RiderKind, mark: 'tap' | 'zigzag' | 'loop' | 'scribble'): void {
    const life = this.cast.of(kind)
    if (!life) return
    life.act(mark === 'tap' ? 'trick' : mark === 'zigzag' ? 'tickled' : mark === 'loop' ? 'hoop' : 'dusted')
    this.host.ask(ownVoice(kind, mark === 'tap' ? 'call' : mark === 'zigzag' ? 'squeak' : mark === 'loop' ? 'hum' : 'sneeze'))
    // The chick's trick is a peep that runs on into a trill, higher than its squeak when it is tickled.
    if (mark === 'tap' && kind === 'chick') this.host.ask('chick-squeak', 1.2, 0.8)
    if (mark === 'scribble') this.host.bits.burst('dust', { x: life.x, y: life.y - 45 }, 22, 120, 0, 2.6, 0.9)
  }

  /**
   * A stop's lamp answers a touch that lands on it: it lights up for a moment
   * with a small glassy ting. Whether one was touched.
   */
  lampAnswers(at: Pt): boolean {
    const stop = this.stage().stops.find((s) => distance(at, lampOf(s)) <= LAMP_TOUCH)
    if (!stop) return false
    this.lamps.set(stop.kind, 1)
    this.host.ask('land-lamp')
    return true
  }

  /** A home answers a touch with its own small move and sound. */
  homeAnswers(kind: RiderKind, sound: VoiceKey): void {
    this.pulses.set(kind, 1)
    this.host.ask(sound)
    const rider = (this.host.ahead ?? this.host.world).riders.find((r) => r.kind === kind)
    if (!rider) return
    const at = PLACES[rider.home]
    if (kind === 'frog') this.host.bits.lay('ripple', { x: at.x, y: at.y + 20 }, 6, 0.8, 3)
    else this.host.bits.burst('dust', { x: at.x, y: at.y + 10 }, 8, 60, kind === 'chick' ? 1 : kind === 'cat' ? 2 : 4, 2.2, 0.6)
  }

  private begin(beats: Beat[], riders: RiderKind[]): void {
    this.scene?.finish()
    for (const kind of riders) this.inScene.add(kind)
    beats.push(once(Math.max(0, ...beats.map((b) => b.at + b.lasts)), 0, () => {}, () => { for (const kind of riders) this.inScene.delete(kind) }))
    this.scene = new Scene(beats)
    // The outcome is in the world already, and the world was handed to storage when the mark was made.
    this.scene.start(this.host.clock, () => {})
  }

  /**
   * Getting home, the ending of a cycle. The rider gets out the way the ride
   * left it, goes to its thing and does what it came for, and the engine lets
   * out one last puff of smoke in the shape of the ride.
   */
  private getHome(kind: RiderKind, how: Feel | null, taste: Taste = 'plain'): void {
    // Two that get out at one stop get out one after the other: the second stays in its wagon until the first is home.
    if (this.scene?.running && this.inScene.size > 0 && !this.carrying) {
      this.inScene.add(kind)
      this.later.push({ kind, play: () => { this.inScene.delete(kind); this.getHome(kind, how, taste) } })
      return
    }
    const life = this.cast.of(kind)
    const rider = this.host.world.riders.find((r) => r.kind === kind)
    if (!life || !rider) return
    const home: Seat = { in: 'home', at: standAt(rider.home) }
    const from = { x: life.x, y: life.y }
    // Beside the train, on the way to its home.
    const beside: Seat = { in: 'stop', at: { x: from.x + (home.at.x - from.x) * 0.45, y: home.at.y } }
    // A quick rider and a slow one take their own time over it, inside five to eight seconds in all.
    const pace = (secs: number) => Math.min(secs, 1.5)
    const out = pace(clipOf(kind, outClip(how)).secs), hop = pace(clipOf(kind, 'to-home').secs), act = Math.min(2.2, clipOf(kind, 'home-act').secs)
    const t1 = 0.6, t2 = t1 + out + 0.35, t3 = t2 + hop, t4 = t3 + act
    this.begin([
      // It gets out the way the ride left it, played as its like or its dislike: pleased and springy with a squeak,
      // or put out, low and leaning, with a grumble.
      once(t1, out, () => {
        life.mood = taste === 'like' ? 1 : taste === 'dislike' ? -1 : 0
        // After splashes it shakes the water off: drops fly.
        if (how === 'splash') this.host.bits.burst('drop', { x: life.x, y: life.y - 45 }, 12, 170, -1, 3, 0.7, 0.7)
        life.go(beside, outClip(how), out)
        this.host.ask(ownVoice(kind, taste === 'like' ? 'squeak' : taste === 'dislike' ? 'grumble' : 'call'), 1.1, 0.8)
      }, () => life.put(beside)),
      once(t2, hop, () => life.go(home, 'to-home', hop), () => { life.mood = 0; life.put(home) }),
      once(t3, act, () => {
        life.act('home-act')
        this.host.ask(`home-${kind}`)
        this.pulses.set(kind, 1)
        if (kind === 'frog') this.host.bits.burst('drop', { x: home.at.x, y: home.at.y - 20 }, 14, 200, 3, 3, 0.8, 0.9)
        else this.host.bits.burst('dust', { x: home.at.x, y: home.at.y - 20 }, 10, 70, kind === 'chick' ? 1 : kind === 'cat' ? 2 : 4, 2.2, 0.7)
      }, () => life.put(home)),
      once(t4, 1.5, () => this.lastPuff(how)),
    ], [kind])
  }

  /**
   * The engine's last puff, in the shape of what the ride did to the rider
   * most: a smoke ring after loops, a small puff and a big one after corners,
   * one big puff streaming back after a fast run, a tangled clump after
   * scribbles, one small round puff after bumps, a puff that rains after
   * splashes, and a plain puff after a ride that did none of them. No shape
   * is a row or a zigzag of puffs, which would read as a sign.
   */
  private lastPuff(how: Feel | null): void {
    const top = this.host.onEngine({ x: 37, y: -150 }), bits = this.host.bits, back = -this.host.journey.pose.facing
    const at = (x: number, y: number): Pt => ({ x: top.x + x, y: top.y + y })
    if (how === 'loop') bits.puff('ring', at(0, -24), 0, 16, 2.2)
    else if (how === 'corner') {
      bits.puff('smoke', at(-12, -14), 0, 6, 2.2)
      bits.puff('smoke', at(14, -44), 0, 12, 2.2)
    } else if (how === 'fast') bits.puff('smoke', at(0, -24), back * 150, 14, 2.2)
    else if (how === 'scribble') for (let i = 0; i < 6; i++) bits.puff('smoke', at(Math.cos(i * 2.4) * 16, Math.sin(i * 2.4) * 14 - 26), 0, 7, 2.2)
    else if (how === 'bump') bits.puff('smoke', at(0, -20), 0, 5, 2.2)
    else if (how === 'splash') {
      bits.puff('smoke', at(0, -30), 0, 10, 2.2)
      bits.burst('drop', at(0, -24), 6, 40, 3, 3, 0.9, 0.2)
    } else bits.puff('smoke', at(0, -24), 0, 9, 2.2)
    this.host.ask('puff')
  }

  /**
   * The roundabout, a secret: the train has ridden a line whose two ends meet
   * once round, and now goes round twice more, faster and then slowing, and
   * stops where it began, giddy.
   */
  roundabout(ring: readonly Pt[], facing: 1 | -1): void {
    const length = pathLength(ring)
    if (length < 10) return
    const { journey, life } = this.host
    let lap = 0
    const carry = (to: number) => {
      const spot = spotAt(ring, Math.max(0, Math.min(length, to * length)))
      // Round a ring the engine keeps its facing and goes right over.
      const angle = facing === 1 ? Math.atan2(spot.ty, spot.tx) : Math.atan2(-spot.ty, -spot.tx)
      const moved = Math.abs(to - lap) * length
      lap = to
      journey.carry({ x: spot.x, y: spot.y, angle, facing, on: 'chalk', speed: to >= 1 ? 0 : 600, round: true }, moved)
    }
    // Timed from the child's own ring. The first time round took the engine `first` seconds at its pace on a
    // round. The second is quicker than that, however small the ring; the third starts faster still and slows to
    // a stop. On a big ring both are hurried so that the whole stays inside seven seconds, and on a small one the
    // engine stands giddy a little longer so that it is not over in under five.
    const first = length / PACE.round, both = Math.min(3.2, 2.2 * first, 6 - first)
    const second = both * 0.4, third = both * 0.6, giddy = Math.max(1, Math.min(4.2, 6 - first - both))
    this.begin([
      // Once more round, faster than the engine rode it the first time.
      { at: 0, lasts: second, play: (p) => { carry(p); if (p >= 1) lap = 0 } },
      // The last time round it runs out of puff: fast at first, and slowing to a stop where it began.
      { at: second, lasts: third, play: (p) => carry(1 - (1 - p) * (1 - p)) },
      once(second + third, giddy, () => { this.carrying = false; life.happen('giddy'); this.host.ask('kettle-whistle', 0.8, 0.6) }),
    ], [])
    this.carrying = true
  }

  /**
   * The first showing, once. The waiting rider scrapes a short line from the
   * engine's rail toward its home, drops the stub of chalk, and climbs aboard;
   * the engine rides to the end of the line. `mark` is that line, already in
   * the world, and `ride` puts the engine on its way.
   */
  firstShowing(kind: RiderKind, mark: Mark, ride: () => void): void {
    const life = this.cast.of(kind)
    if (!life || mark.p.length < 2) return ride()
    const length = pathLength(mark.p)
    const tip = (upTo: number): Pt => { const s = spotAt(mark.p, length * upTo); return { x: s.x, y: s.y - 6 } }
    let scraped = 0
    this.hidden = mark
    this.begin([
      once(0, 0.6, () => life.go({ in: 'stop', at: tip(0) }, 'out-plain'), () => life.put({ in: 'stop', at: tip(0) })),
      {
        at: 0.7, lasts: 1.6, play: (p) => {
          const points = Math.max(2, Math.ceil(mark.p.length * p))
          this.showing = p >= 1 ? null : { p: mark.p.slice(0, points), colour: mark.c }
          life.put({ in: 'stop', at: tip(p) })
          // The scrapes it has made so far, and the rest when the line is whole.
          for (const due = Math.floor(p * 8); scraped < due; scraped++) this.host.ask('scrape', 0.9 + (scraped % 3) * 0.15, 0.9)
          if (p >= 1) this.hidden = null
        },
      },
      // It drops the stub of chalk, which falls and crumbles away.
      once(2.2, 0.2, () => this.host.bits.burst('stub', { x: tip(1).x, y: tip(1).y - 46 }, 1, 30, mark.c, 8, 0.32, 0.6)),
      once(2.5, 0.2, () => { this.host.bits.burst('dust', tip(1), 16, 90, mark.c, 2.2, 0.7); this.host.ask('crumble') }),
      once(2.7, clipOf(kind, 'board').secs, () => { life.go({ in: 'wagon', index: this.freeSeat(kind) }, 'board'); this.host.ask(ownVoice(kind, 'call')) }, () => life.put(life.seat)),
      once(2.8 + clipOf(kind, 'board').secs, 1.6, ride),
    ], [kind])
  }

  /** A touch: whatever scene is playing ends now, with everyone where it was taking them. */
  finish(): void {
    this.scene?.finish()
    // Whoever was still to get out is where the world has it at once.
    for (const waiting of this.later) this.inScene.delete(waiting.kind)
    this.later = []
  }

  get playing(): boolean { return this.scene?.running ?? false }

  step(dt: number): void {
    this.scene?.update(this.host.clock)
    if (this.scene && !this.scene.running) this.scene = null
    if (!this.scene && this.later.length > 0) this.later.shift()!.play()
    this.agree()
    this.oneEach()
    this.cast.step(dt, this.seatAt)
    // Once more, for a rider who has sat down in this very step.
    this.oneEach()
    for (const life of this.cast.riders.values()) {
      if (!life.justSat) continue
      life.justSat = false
      this.host.ask('thump', 1, 0.8)
    }
    this.moveUp()
    for (const [kind, pulse] of this.pulses) {
      if (pulse - dt / 0.5 <= 0) this.pulses.delete(kind)
      else this.pulses.set(kind, pulse - dt / 0.5)
    }
    for (const [kind, lit] of this.lamps) {
      if (lit - dt / LAMP_LIT <= 0) this.lamps.delete(kind)
      else this.lamps.set(kind, lit - dt / LAMP_LIT)
    }
  }

  /** The homes on the tar, and the stops where someone waits. */
  stage(): { homes: HomeShown[]; stops: StopShown[] } {
    const world = this.host.ahead ?? this.host.world
    const stops: StopShown[] = []
    for (const life of this.cast.riders.values()) if (life.seat.in === 'stop' && !this.inScene.has(life.kind)) stops.push({ x: life.seat.at.x, y: life.seat.at.y, kind: life.kind, lit: this.lamps.get(life.kind) ?? 0 })
    const homes: HomeShown[] = world.riders.map((r) => ({ kind: r.kind, at: standAt(r.home), pulse: this.pulses.get(r.kind) ?? 0, shown: 1 }))
    // An earlier home is rubbed away with its rider's wave, and is not gone at once.
    for (const life of this.cast.gone) if (life.seat.in === 'home') homes.push({ kind: life.kind, at: life.seat.at, pulse: 0, shown: life.shown })
    return { homes, stops }
  }

  /**
   * What stands on the tar that the child aims at, each as the box it takes
   * up as drawn: every home, and every rider on its feet. A wagon at rest
   * keeps out of them.
   */
  standing(): Box[] {
    const boxes: Box[] = this.stage().homes.map((home) => ({ at: { x: home.at.x, y: home.at.y - 26 }, w: 85, h: 40 }))
    for (const life of this.cast.riders.values()) if (life.seat.in !== 'wagon' && !life.moving) boxes.push({ at: { x: life.x, y: life.y - 50 }, w: 50, h: 55 })
    return boxes
  }

  /** Where the train is wanted next: the home of whoever is aboard, or the stop of whoever waits to be taken. */
  wantedAt(): Pt | null {
    const riders: readonly Rider[] = this.host.world.riders
    const aboard = riders.find((r) => r.at === 'train'), waits = riders.find((r) => r.at === 'stop') ?? riders.find(waitsAhead)
    return aboard ? railAt(aboard.home) : waits ? railAt(waits.stop) : null
  }
}
