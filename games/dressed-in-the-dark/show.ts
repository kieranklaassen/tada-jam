import type { Note } from './audio'
import type { Point } from './input'
import { BED, KNOB, LANE, MOON, bedAt, bedX, pegOf, touchedAt } from './layout'
import { LASTS, NATURE, type Act } from './motion'
import { Night, type Walk } from './night'
import type { NightRecord } from './night'
import { Scene, sceneLength, type Beat } from './scene'
import { GARMENTS, SLEEPERS, verdictOf, type Garment, type Part, type Sleeper } from './things'
import { CLOTHES, ROOM, VOICE, hollow, stepOf, type Mood } from './voices'

// What the rules look and sound like, on game time. The record in `night` is always already where things are
// going; what is here walks, flies and reacts its way to it, and any of it can be cut short.

export type Person = {
  sleeper: Sleeper
  /** The bed it is seen in, or null while it is on the floor. */
  bed: number | null
  x: number
  /** 0 on the bed, 1 on the floor. */
  floor: number
  /** 0 under the quilt, 1 out of it. */
  up: number
  act: Act
  actAt: number
  /** What it goes back to when an act is over. */
  rest: Act
  part: Part | null
  show: { garment: Garment; at: number } | null
  /** In the dark: its twitch, its breath, the quilt's hem and its lean to the cord. */
  twitchAt: number
  bulge: number
  hem: number
  lean: number
  breaths: number
  dreamAt: number
  puffAt: number
  /** The bed a reveal sends it to. */
  scuttleFrom: number | null
  /** How far in front of the lane it crosses the floor: two that pass each other pass one behind the other. */
  depth: number
}

export type Piece = {
  garment: Garment
  x: number; y: number; vx: number; vy: number
  /** Where it is: on its peg, in the hand, lifted off its peg by a tap, on its way to a wearer, or on one. */
  at: 'peg' | 'hand' | 'lifted' | 'going' | 'worn' | 'away'
  to: Sleeper | null
  since: number
  touchedAt: number
}

export type Print = { x: number; y: number; sleeper: Sleeper; side: number; way: number; roll: boolean; born: number }
export type Ring = { x: number; y: number; born: number }

type Going = { walk: Walk; t: number; left: boolean; steps: number; stepsBack: number; bumped: boolean; mutter: boolean }

export const FLIGHT = 0.34
export const DREAM = 2.2
export const PRINT = 2.4
/** A walk's parts in seconds: getting up, over, and back. The whole is at most five. */
export const WALK = { rise: 0.6, slippers: 1.7, perBed: 0.3, rollBase: 0.75, bump: 1.5, back: 1.5, lie: 0.4 } as const
const QUIET_FROM = 12, QUIET_BY = 25
const SHIVER_EVERY = 4.2

export class Show {
  readonly night: Night
  t = 0
  /** 0 nothing to save, 1 soon, 2 at once. */
  changed: 0 | 1 | 2 = 0
  light: number
  swing = 0
  private swingV = 0
  knob = 0
  door = 0
  moonAt = -9
  wardrobeAt = -9
  finger: Point | null = null
  readonly people: Record<Sleeper, Person>
  readonly pieces: Record<Garment, Piece>
  readonly prints: Print[] = []
  readonly rings: Ring[] = []
  scene: Scene | null = null
  sceneLasts = 0
  /** The walk being heard, and those that wait for it. */
  private going: Going | null = null
  private readonly waiting: Walk[] = []
  hand: { garment: Garment; from: Sleeper | null; bed: number | null; far: number } | null = null
  lifted: Garment | null = null
  private pressed: { at: Point; what: ReturnType<typeof touchedAt>; used: boolean } | null = null
  private readonly queue: Note[] = []
  /** Sounds that come later in what is playing, on game time: a touch that ends it ends them. */
  private later: { at: number; notes: Note[] }[] = []
  private quietSince = 0
  /** Whoever a reveal is about just now. */
  private star: Person | null = null
  private shiverAt = 1.5

  constructor(record: NightRecord) {
    this.night = new Night(record)
    this.light = this.night.lit ? 1 : 0
    this.door = this.night.open ? 1 : 0
    const people = {} as Record<Sleeper, Person>
    for (const sleeper of SLEEPERS) {
      const bed = this.night.bedOf(sleeper)
      people[sleeper] = { sleeper, bed, x: bedX(bed), floor: 0, up: this.light, act: 'awake', actAt: -9, rest: 'awake', part: null, show: null, twitchAt: -9, bulge: 0, hem: 0, lean: 0, breaths: 0, dreamAt: -9, puffAt: -9, scuttleFrom: null, depth: 0 }
    }
    this.people = people
    const pieces = {} as Record<Garment, Piece>
    for (const garment of GARMENTS) {
      const peg = pegOf(garment), wearer = this.night.wearerOf(garment)
      pieces[garment] = { garment, x: peg.x, y: peg.y, vx: 0, vy: 0, at: wearer ? 'worn' : this.night.out(garment) ? 'peg' : 'away', to: wearer, since: -9, touchedAt: -9 }
    }
    this.pieces = pieces
    for (const sleeper of SLEEPERS) this.settle(sleeper)
  }

  // ---- what the view reads -------------------------------------------------

  get lit(): boolean {
    return this.night.lit
  }

  /** Something plays that the idle hand must not come up over. */
  get busy(): boolean {
    return this.scene !== null || this.going !== null || GARMENTS.some((garment) => this.pieces[garment].at === 'going')
  }

  get walking(): Walk | null {
    return this.going?.walk ?? null
  }

  /** What a sleeper is seen to wear, in order: what is in the air or in the hand is not on it. */
  seenOn(sleeper: Sleeper): Garment[] {
    return this.night.worn[sleeper].filter((garment) => this.pieces[garment].at === 'worn')
      // Thrown off in the record and not yet thrown off to see.
      .concat(GARMENTS.filter((garment) => this.pieces[garment].at === 'worn' && this.pieces[garment].to === sleeper && !this.night.worn[sleeper].includes(garment)))
  }

  /** Who a garment let go over that bed goes on: whoever is seen lying in it, or the one the walk is bringing to it. */
  whoAt(bed: number): Sleeper {
    for (const sleeper of SLEEPERS) if (this.people[sleeper].bed === bed) return sleeper
    if (this.going) {
      const { walk, left } = this.going
      if (walk.to === bed && !(left && walk.other === null)) return walk.walker
      if (walk.from === bed) return walk.other ?? walk.walker
    }
    return this.night.beds[bed]
  }

  /** The one of those with nothing on that shivers now: the nearest to the middle. */
  get cold(): Sleeper | null {
    if (this.night.lit || this.scene) return null
    for (const bed of [2, 1, 3, 0, 4]) {
      const sleeper = this.whoAt(bed), person = this.people[sleeper]
      if (person.bed === bed && this.night.worn[sleeper].length === 0) return sleeper
    }
    return null
  }

  get allDressed(): boolean {
    return SLEEPERS.every((sleeper) => this.night.worn[sleeper].length > 0)
  }

  /** 0 to 1: how loud the sleepers are. Untouched a while, they sink to almost nothing. */
  get loud(): number {
    const quiet = this.t - this.quietSince
    return Math.max(0, Math.min(1, 1 - (quiet - QUIET_FROM) / (QUIET_BY - QUIET_FROM)))
  }

  /** Where a sleeper's eyes go when its act does not take them: to whoever is reacting, to the finger, or to the cord. */
  watch(person: Person): Point {
    const to = this.scene && this.star ? { x: this.star.x, y: BED.foot - 250 }
      : this.hand && this.finger ? this.finger
      : person.rest === 'sleepy' ? KNOB
      : this.finger && this.t - this.quietSince < 2.5 ? this.finger : null
    if (!to || (this.scene && this.star === person)) return { x: 0, y: 0 }
    return { x: Math.max(-1, Math.min(1, (to.x - person.x) / 220)), y: Math.max(-0.8, Math.min(0.8, (to.y - (BED.foot - 250)) / 260)) }
  }

  takeSounds(): Note[] {
    return this.queue.splice(0)
  }

  // ---- the finger ----------------------------------------------------------

  press(at: Point): void {
    this.quietSince = this.t
    this.finger = at
    // A touch ends whatever plays, and is then answered as itself.
    this.finishScene()
    const what = touchedAt(at, (garment) => this.pieces[garment].at === 'peg' || this.pieces[garment].at === 'lifted', (garment) => this.pieces[garment].at === 'worn')
    this.pressed = { at, what, used: false }
    switch (what.what) {
      case 'garment':
        this.pieces[what.garment].touchedAt = this.t
        this.sound(CLOTHES[what.garment].touch, this.pieces[what.garment].x)
        break
      case 'peg':
        this.ring(pegOf(what.garment))
        this.sound(ROOM.peg, pegOf(what.garment).x)
        break
      case 'bed': {
        const person = this.people[this.whoAt(what.bed)]
        if (this.lifted !== null) {
          person.hem = 1
          this.sound(ROOM.hem, bedX(what.bed))
        } else if (person.bed !== what.bed) {
          this.ring(at)
          this.sound(ROOM.quilt, bedX(what.bed))
        } else this.poke(person)
        break
      }
      case 'cord':
        this.pull()
        break
      case 'wardrobe':
        this.wardrobeAt = this.t
        if (!this.night.open) this.openDoor()
        else this.sound(ROOM.creak, 80)
        break
      case 'moon':
        this.moonAt = this.t
        this.sound(ROOM.moon, MOON.x)
        break
      case 'room':
        this.ring(at)
        this.sound(at.y > 640 ? ROOM.floor : ROOM.wall, at.x)
    }
  }

  /** A touch that is not the child's: what follows it finds nothing pressed. */
  nobodys(): void {
    this.pressed = null
  }

  tap(): void {
    const press = this.pressed
    this.pressed = null
    if (!press) return
    if (press.what.what === 'garment') {
      const { garment } = press.what
      const again = this.lifted === garment
      this.hangBack()
      if (!again) {
        this.lifted = garment
        this.pieces[garment].at = 'lifted'
        this.pieces[garment].since = this.t
        this.sound(ROOM.lift, this.pieces[garment].x)
      }
    } else if (press.what.what === 'peg') this.sendHome(press.what.garment)
    else if (press.what.what === 'bed' && this.lifted !== null) {
      const garment = this.lifted
      this.lifted = null
      this.give(garment, press.what.bed)
    }
  }

  dragMove(from: Point, at: Point): void {
    this.quietSince = this.t
    this.finger = at
    if (this.pressed && !this.pressed.used) {
      this.pressed.used = true
      const what = this.pressed.what
      if (what.what === 'garment') {
        if (this.lifted !== what.garment) this.hangBack()
        this.lifted = null
        this.take(what.garment, null, from)
      } else if (what.what === 'bed' && this.lifted === null) {
        const sleeper = this.whoAt(what.bed)
        const last = this.seenOn(sleeper).at(-1)
        if (last) {
          this.sound(CLOTHES[last].off, bedX(what.bed))
          this.take(last, sleeper, from)
          this.twitch(this.people[sleeper])
        } else if (this.people[sleeper].bed === what.bed) this.twitch(this.people[sleeper])
      }
    }
    if (!this.hand) return
    this.hand.far = Math.max(this.hand.far, Math.hypot(at.x - from.x, at.y - from.y))
    const bed = bedAt(at)
    for (const sleeper of SLEEPERS) {
      const over = bed !== null && this.whoAt(bed) === sleeper && this.people[sleeper].bed === bed
      if (over && this.people[sleeper].hem < 0.2) this.sound(ROOM.hem, bedX(bed))
      if (over) this.people[sleeper].hem = 1
    }
  }

  drop(): void {
    const hand = this.hand, at = this.finger, press = this.pressed
    // A tap that slid: it does what the tap would have done, where the finger is now.
    if (!hand) {
      if (press && at && press.what.what === 'bed') press.what.bed = bedAt(at) ?? press.what.bed
      this.tap()
      return
    }
    this.hand = null
    this.pressed = null
    if (!at) return
    const bed = bedAt(at)
    if (bed === null) {
      if (hand.from) this.goHome(hand.garment)
      else this.toPeg(hand.garment)
      return
    }
    // Let go where it was picked up, it was never taken off.
    if (hand.from && hand.bed === bed && hand.far < BED.pitch / 2) this.putBack(hand.garment, hand.from)
    else this.give(hand.garment, bed)
  }

  /** The touch was taken away: no move is made. */
  back(): void {
    const hand = this.hand
    this.hand = null
    this.pressed = null
    if (!hand) return
    if (hand.from) this.putBack(hand.garment, hand.from)
    else this.toPeg(hand.garment)
  }

  // ---- the acts ------------------------------------------------------------

  private take(garment: Garment, from: Sleeper | null, at: Point): void {
    const piece = this.pieces[garment]
    if (from) { piece.x = at.x; piece.y = at.y }
    piece.at = 'hand'
    piece.since = this.t
    this.hand = { garment, from, bed: from ? bedAt(at) : null, far: 0 }
    if (from && this.night.lit) this.react(this.people[from], 'poke', null)
  }

  private putBack(garment: Garment, wearer: Sleeper): void {
    const piece = this.pieces[garment]
    piece.at = 'worn'
    piece.to = wearer
    this.sound(CLOTHES[garment].on, this.people[wearer].x)
  }

  private hangBack(): void {
    if (this.lifted === null) return
    this.toPeg(this.lifted)
    this.lifted = null
  }

  private toPeg(garment: Garment): void {
    const piece = this.pieces[garment]
    piece.at = 'peg'
    piece.to = null
    piece.since = this.t
    this.sound(ROOM.home, pegOf(garment).x)
  }

  /** Taken off for good. */
  private goHome(garment: Garment): void {
    const off = this.night.home(garment)
    this.toPeg(garment)
    this.changed = 2
    if (off) this.settle(off)
  }

  /** A tap on an empty peg: its garment comes home from whoever wears it. */
  private sendHome(garment: Garment): void {
    const wearer = this.night.wearerOf(garment)
    if (!wearer) return
    const person = this.people[wearer], piece = this.pieces[garment]
    piece.x = person.x
    piece.y = this.night.lit ? BED.foot - 150 : BED.top + 60
    this.sound(CLOTHES[garment].off, person.x)
    this.twitch(person)
    this.goHome(garment)
    if (this.night.lit) this.react(person, 'poke', null)
  }

  private give(garment: Garment, bed: number): void {
    const sleeper = this.whoAt(bed)
    const given = this.night.give(garment, this.night.bedOf(sleeper))
    if (!given) { this.toPeg(garment); return }
    this.changed = 2
    const piece = this.pieces[garment]
    piece.at = 'going'
    piece.to = sleeper
    piece.since = this.t
    if (given.off && given.off !== sleeper) this.settle(given.off)
    if (given.walk) this.waiting.push(given.walk)
  }

  /** A garment has arrived: it goes on, is heard, and its wearer answers. */
  private putOn(garment: Garment, sleeper: Sleeper): void {
    const piece = this.pieces[garment], person = this.people[sleeper]
    piece.at = 'worn'
    this.sound(CLOTHES[garment].on, person.x)
    person.bulge = 1
    person.hem = 0
    if (this.night.lit) {
      // Awake, nobody walks: it looks down and tries them where it stands, and only then minds.
      if (garment === 'slippers' || garment === 'skates') {
        this.react(person, 'tap', null)
        for (let i = 0; i < 3; i++) this.sound(CLOTHES[garment].step, person.x, 0.3 + i * 0.22)
      } else this.reactToAll(person)
      return
    }
    this.twitch(person)
    this.sound(VOICE[sleeper][garment === 'feather' ? 'sneeze' : 'murmur'], person.x, 0.45)
  }

  private poke(person: Person): void {
    const { sleeper } = person
    if (this.night.lit) {
      if (this.night.worn[sleeper].length > 0) this.reactToAll(person)
      else {
        this.react(person, 'poke', null)
        this.sound(VOICE[sleeper].poke, person.x)
      }
      person.dreamAt = this.t
      return
    }
    this.twitch(person)
    person.dreamAt = this.t
    this.sound(VOICE[sleeper].poke, person.x, 0, 0.9)
  }

  private twitch(person: Person): void {
    person.twitchAt = this.t
  }

  private openDoor(): void {
    this.night.open = true
    this.changed = 2
    this.sound(ROOM.open, 80)
    for (const garment of GARMENTS) {
      const piece = this.pieces[garment]
      if (piece.at !== 'away') continue
      piece.at = 'peg'
      piece.x = 84
      piece.y = 190
      piece.vx = 300
      piece.since = this.t
    }
  }

  // ---- the lamp ------------------------------------------------------------

  private pull(): void {
    this.knob = 1
    this.swingV += 5
    this.hangBack()
    // Whatever is still in the air is on already.
    for (const garment of GARMENTS) if (this.pieces[garment].at === 'going') this.pieces[garment].at = 'worn'
    const pulled = this.night.pull()
    this.changed = 2
    this.sound(pulled.lit ? ROOM.cordOn : ROOM.cordOff, KNOB.x)
    if (pulled.lit) this.reveal()
    else this.putOut(pulled.thrown)
  }

  private cue(at: number, play: (finishing: boolean) => void): Beat {
    return { at, lasts: 0, play: (_progress, finishing) => play(finishing) }
  }

  private begin(beats: Beat[]): void {
    this.scene = new Scene(beats)
    this.sceneLasts = sceneLength(beats)
    this.scene.start(this.t, () => {})
  }

  private finishScene(): void {
    const scene = this.scene
    this.scene = null
    this.later.length = 0
    scene?.finish()
  }

  /** The lamp goes on. */
  private reveal(): void {
    const beats: Beat[] = []
    this.star = null
    this.going = null
    this.waiting.length = 0
    this.prints.length = 0
    const stray = SLEEPERS.map((sleeper) => this.people[sleeper]).filter((person) => person.bed !== this.night.bedOf(person.sleeper))
    for (const person of SLEEPERS.map((sleeper) => this.people[sleeper])) {
      person.twitchAt = -9
      person.show = null
      person.act = 'awake'
      person.actAt = this.t
      if (!stray.includes(person)) continue
      person.scuttleFrom = person.x
      person.depth = bedX(this.night.bedOf(person.sleeper)) < person.x ? -22 : 4
      this.act(person, 'caught')
      // Out of bed and onto the floor, from wherever it was caught.
      const up = person.floor > 0.02 ? 1 : person.up, floor = person.floor
      beats.push({ at: 0.1, lasts: 0.5, play: (progress) => {
        person.up = up + (1 - up) * Math.min(1, progress * 2)
        person.floor = floor + (1 - floor) * Math.max(0, progress * 2 - 1)
        if (person.floor > 0.02 && person.up >= 1) person.bed = null
      } })
    }
    beats.push({ at: 0, lasts: 0.3, play: (progress) => { this.light = progress } })
    let at = 0.12
    if (stray.length > 0) {
      const from = 1.1
      beats.push(this.cue(0.15, (finishing) => { if (!finishing) for (const person of stray) this.sound(VOICE[person.sleeper].gasp, person.x) }))
      beats.push(this.cue(from, (finishing) => {
        for (const person of stray) {
          this.act(person, 'scuttle')
          if (!finishing) this.scuttleSteps(person)
        }
      }))
      for (const person of stray) {
        const to = this.night.bedOf(person.sleeper)
        beats.push({ at: from, lasts: 0.75, play: (progress) => {
          person.bed = progress >= 1 ? to : null
          person.x = (person.scuttleFrom ?? person.x) + (bedX(to) - (person.scuttleFrom ?? person.x)) * progress
          person.floor = 1 - Math.max(0, progress - 0.8) / 0.2
          person.up = 1
          if (progress >= 1) { person.scuttleFrom = null; this.act(person, 'awake') }
        } })
      }
      at = from + 0.8
    }
    const order = this.night.beds.map((sleeper) => this.people[sleeper])
    order.forEach((person, i) => {
      beats.push({ at: at + i * 0.07, lasts: 0.28, play: (progress) => { person.up = Math.max(person.up, progress) } })
      beats.push(this.cue(at + 0.05 + i * 0.07, (finishing) => {
        this.act(person, 'gasp')
        if (!finishing) this.sound(VOICE[person.sleeper].gasp, person.x, 0, 0.7)
      }))
      beats.push(this.cue(at + 0.8, () => { if (this.night.worn[person.sleeper].length > 0) this.act(person, 'look') }))
    })
    at += 1.5
    const wearers = order.filter((person) => this.night.worn[person.sleeper].length > 0)
    const kind = (person: Person) => verdictOf(person.sleeper, this.night.worn[person.sleeper])
    const plain = wearers.filter((person) => kind(person).kind !== 'part'), sets = wearers.filter((person) => kind(person).kind === 'part')
    const bare = order.filter((person) => !wearers.includes(person))
    let end = at
    for (const person of [...plain, ...sets]) {
      const verdict = kind(person), part = verdict.kind === 'part'
      beats.push(this.cue(at, (finishing) => this.reactToAll(person, finishing)))
      if (bare.length > 0) beats.push(this.cue(at + 0.5, (finishing) => {
        for (const other of bare) {
          this.act(other, 'bare')
          if (!finishing) this.sound(VOICE[other.sleeper].laugh, other.x, (other.bed ?? 0) * 0.05, 0.5)
        }
      }))
      const lasts = part ? 2.6 : verdict.kind === 'late' ? 2.4 : verdict.kind === 'love' && verdict.and ? 3.4 : 1.7
      end = Math.max(end, at + lasts, 3.8)
      at += part ? 1.5 : 0.95
    }
    if (wearers.length === 0) {
      // Nobody has anything on: they laugh at the one in the middle, who looks for its clothes.
      beats.push(this.cue(at, (finishing) => {
        order.forEach((person, i) => {
          this.act(person, i === 2 ? 'look' : 'bare')
          if (!finishing && i !== 2) this.sound(VOICE[person.sleeper].laugh, person.x, i * 0.12, 0.6)
        })
      }))
      end = at + 2.3
    }
    beats.push(this.cue(end, () => {
      for (const sleeper of SLEEPERS) this.settle(sleeper)
    }))
    beats.push({ at: end, lasts: 0.2, play: () => {} })
    for (const sleeper of SLEEPERS) this.settle(sleeper, false)
    this.begin(beats)
  }

  /** The lamp goes out. */
  private putOut(thrown: { sleeper: Sleeper; garment: Garment }[]): void {
    const beats: Beat[] = []
    this.star = null
    thrown.forEach(({ sleeper, garment }, i) => {
      const person = this.people[sleeper]
      beats.push(this.cue(0.15 + i * 0.16, (finishing) => {
        const piece = this.pieces[garment]
        piece.x = person.x
        piece.y = BED.foot - 170
        piece.vy = -900
        piece.vx = (pegOf(garment).x - person.x) * 0.8
        piece.at = 'peg'
        piece.to = null
        piece.since = this.t
        this.act(person, 'poke')
        if (!finishing) this.sound(CLOTHES[garment].off, person.x)
        else this.land(garment)
      }))
    })
    const from = 0.5 + thrown.length * 0.16
    const order = this.night.beds.map((sleeper) => this.people[sleeper])
    order.forEach((person, i) => {
      beats.push(this.cue(from + i * 0.34, (finishing) => {
        this.act(person, 'yawn')
        if (!finishing) this.sound(VOICE[person.sleeper].yawn, person.x, 0, 0.8)
      }))
      beats.push({ at: from + 0.95 + i * 0.34, lasts: 0.55, play: (progress) => {
        person.up = 1 - progress
        if (progress >= 1) this.act(person, 'awake')
      } })
    })
    beats.push({ at: from + 2.0, lasts: 0.9, play: (progress) => { this.light = 1 - progress } })
    beats.push(this.cue(from + 2.9, (finishing) => { if (!finishing) this.sound(ROOM.asleep, MOON.x) }))
    beats.push({ at: from + 2.9, lasts: 0.6, play: () => {} })
    for (const sleeper of SLEEPERS) { this.people[sleeper].rest = 'awake'; this.people[sleeper].part = null }
    this.shiverAt = this.t + from + 4.5
    this.begin(beats)
  }

  private land(garment: Garment): void {
    const piece = this.pieces[garment], peg = pegOf(garment)
    piece.x = peg.x; piece.y = peg.y; piece.vx = piece.vy = 0
  }

  private act(person: Person, act: Act): void {
    person.act = act
    person.actAt = this.t
  }

  private react(person: Person, act: Act, show: Garment | null): void {
    this.act(person, act)
    person.show = show ? { garment: show, at: this.t } : null
  }

  /** What it makes of all it wears, by the lamp. */
  private reactToAll(person: Person, finishing = false): void {
    const { sleeper } = person, worn = this.night.worn[sleeper], verdict = verdictOf(sleeper, worn)
    this.settle(sleeper, false)
    this.star = person
    const last = worn[worn.length - 1]
    if (verdict.kind === 'bare') { this.act(person, 'bare'); return }
    if (verdict.kind === 'part') this.react(person, verdict.part, verdict.at)
    else this.react(person, verdict.kind, verdict.at)
    if (finishing) return
    const mood: Mood = verdict.kind === 'love' ? 'joy' : verdict.kind === 'late' ? 'start' : verdict.kind === 'appalled' ? 'grump' : 'joy'
    this.sound(VOICE[sleeper][mood], person.x)
    this.sound(CLOTHES[verdict.at].show, person.x, verdict.kind === 'late' ? 0.2 : 0.4)
    if (verdict.kind === 'part') for (let i = 0; i < 3; i++) this.sound(CLOTHES[worn[(worn.indexOf(last) + i) % worn.length]].step, person.x, 0.9 + i * 0.4)
  }

  /** What it goes back to between its acts, from what it wears. */
  private settle(sleeper: Sleeper, now = true): void {
    const person = this.people[sleeper], worn = this.night.worn[sleeper], verdict = verdictOf(sleeper, worn)
    person.part = verdict.kind === 'part' ? verdict.part : null
    person.rest = verdict.kind === 'bare' ? 'sleepy' : verdict.kind === 'part' || (verdict.kind === 'love' && !verdict.and) ? 'glow' : 'sulk'
    if (now && this.night.lit) { person.act = person.rest; person.actAt = this.t }
    if (now) person.show = null
  }

  private scuttleSteps(person: Person): void {
    for (let i = 0; i < 4; i++) this.sound(stepOf(person.sleeper), person.x, i * 0.16)
  }

  // ---- time ----------------------------------------------------------------

  private breathOf(sleeper: Sleeper): number {
    return this.t * NATURE[sleeper].breath + SLEEPERS.indexOf(sleeper) * 0.37
  }

  /** The breath's rise and fall, 0 to 1. */
  breath(sleeper: Sleeper): number {
    return 0.5 - 0.5 * Math.cos(this.breathOf(sleeper) * Math.PI * 2)
  }

  step(dt: number): void {
    if (dt <= 0) return
    this.t += dt
    if (this.scene) {
      this.scene.update(this.t)
      if (!this.scene.running) this.scene = null
    } else this.light = this.night.lit ? 1 : 0
    if (this.later.length > 0) {
      for (const { at, notes } of this.later) if (at <= this.t) this.queue.push(...notes)
      this.later = this.later.filter(({ at }) => at > this.t)
    }
    this.knob *= Math.exp(-7 * dt)
    this.swingV += (-this.swing * 38 - this.swingV * 1.5) * dt
    this.swing += this.swingV * dt
    this.door += ((this.night.open ? 1 : 0) - this.door) * (1 - Math.exp(-5 * dt))
    this.stepPieces(dt)
    for (const sleeper of SLEEPERS) this.stepPerson(this.people[sleeper], dt)
    if (!this.night.lit && !this.scene) this.stepWalk(dt)
    while (this.prints.length > 0 && this.t - this.prints[0].born > PRINT) this.prints.shift()
    while (this.rings.length > 0 && this.t - this.rings[0].born > 0.7) this.rings.shift()
    const cold = this.cold
    if (cold && this.t > this.shiverAt && this.loud > 0.1) {
      this.shiverAt = this.t + SHIVER_EVERY
      this.sound(ROOM.shiver, this.people[cold].x, 0, this.loud)
    }
    if (this.hand) this.quietSince = this.t
  }

  private stepPieces(dt: number): void {
    for (const garment of GARMENTS) {
      const piece = this.pieces[garment]
      let x: number, y: number, pull = 130, drag = 15
      if (piece.at === 'worn' || piece.at === 'away') continue
      if (piece.at === 'going') {
        const person = this.people[piece.to!]
        x = person.x
        y = this.night.lit ? BED.foot - 170 : BED.top + 40
        pull = 320; drag = 22
        if (this.t - piece.since >= FLIGHT) { this.putOn(garment, piece.to!); continue }
      } else if (piece.at === 'hand' && this.finger) {
        x = this.finger.x; y = this.finger.y - 18
        pull = 900; drag = 46
      } else {
        const peg = pegOf(garment)
        x = peg.x
        y = peg.y + (piece.at === 'lifted' ? 26 + Math.sin((this.t - piece.since) * 4) * 4 : 0)
        pull = 90; drag = 13
      }
      // A stiff spring in several small steps, so that a slow frame cannot throw it.
      const steps = Math.max(1, Math.ceil(dt / 0.012)), h = dt / steps
      for (let i = 0; i < steps; i++) {
        piece.vx += ((x - piece.x) * pull - piece.vx * drag) * h
        piece.vy += ((y - piece.y) * pull - piece.vy * drag) * h
        piece.x += piece.vx * h
        piece.y += piece.vy * h
      }
    }
  }

  private stepPerson(person: Person, dt: number): void {
    const ease = (rate: number) => 1 - Math.exp(-rate * dt)
    const { sleeper } = person
    person.bulge *= Math.exp(-3.2 * dt)
    if (!this.hand && this.lifted === null) person.hem *= Math.exp(-9 * dt)
    else person.hem *= Math.exp(-6 * dt)
    const lean = this.allDressed && !this.night.lit && !this.scene ? 1 : 0
    person.lean += (lean - person.lean) * ease(2)
    if (LASTS[person.act] > 0 && this.t - person.actAt > LASTS[person.act]) {
      const verdict = verdictOf(sleeper, this.night.worn[sleeper])
      if (person.act === 'tap' && this.night.lit) { this.reactToAll(person); return }
      // Glad of the one thing, and then it sees the rest.
      if (person.act === 'love' && verdict.kind === 'love' && verdict.and && this.night.lit) {
        this.react(person, 'appalled', null)
        this.sound(VOICE[sleeper].grump, person.x)
      } else if (this.scene && this.night.lit && (person.act === 'gasp' || person.act === 'look')) this.act(person, 'awake')
      else if (!this.night.lit) this.act(person, 'awake')
      else { person.act = person.rest; person.actAt = this.t }
    }
    // Asleep: breath, and what can be heard of what it wears.
    if (this.night.lit || this.scene || person.bed === null) person.breaths = Math.floor(this.breathOf(sleeper))
    else {
      const breaths = Math.floor(this.breathOf(sleeper))
      if (breaths > person.breaths) {
        person.breaths = breaths
        const loud = this.loud
        if (loud > 0.05) {
          const every = sleeper === 'hen' ? 4 : sleeper === 'hippo' ? 1 : 2
          const worn = this.seenOn(sleeper)
          if (breaths % every === 0) {
            const snore = VOICE[sleeper].snore
            this.sound(worn.includes('pan') ? hollow(snore) : snore, person.x, 0, loud * 0.8)
            person.puffAt = this.t
          }
          if (sleeper !== 'hen' || breaths % 2 === 0) for (const garment of worn) {
            if (garment === 'pan') continue
            if (garment === 'feather') { if (breaths % 3 === 0) this.sound(VOICE[sleeper].sneeze, person.x, 0.1, loud * 0.6); else this.sound(CLOTHES.feather.breath, person.x, 0, loud) }
            else this.sound(CLOTHES[garment].breath, person.x, 0.2, loud)
          }
        }
      }
    }
  }

  private sound(notes: readonly Note[], x: number, delay = 0, gain = 1): void {
    const pan = Math.round(Math.max(-0.8, Math.min(0.8, (x - 590) / 560)) * 20) / 20
    const parts: [number, Note[]][] = [[0, []], [1, []]]
    for (const note of notes) {
      const own = note.delay ?? 0, part = own >= 1 ? 1 : 0
      parts[part][1].push({ ...note, peak: note.peak * gain, delay: own - part, pan })
    }
    for (const [from, part] of parts) {
      if (part.length === 0) continue
      const wait = delay + from
      if (wait >= 0.3) this.later.push({ at: this.t + wait, notes: part })
      else this.queue.push(...part.map((note) => ({ ...note, delay: (note.delay ?? 0) + wait })))
    }
  }

  private ring(at: Point): void {
    this.rings.push({ x: at.x, y: at.y, born: this.t })
  }

  // ---- the walk ------------------------------------------------------------

  private stepWalk(dt: number): void {
    // It starts when the shoes are on.
    if (!this.going && this.waiting.length > 0 && this.pieces[this.waiting[0].by].at !== 'going') {
      const walk = this.waiting.shift()!
      this.going = { walk, t: 0, left: false, steps: 0, stepsBack: 0, bumped: false, mutter: false }
      this.sound(ROOM.quilt, this.people[walk.walker].x, 0.2)
    }
    const going = this.going
    if (!going) return
    going.t += dt
    const { walk } = going, walker = this.people[walk.walker], from = bedX(walk.from), to = bedX(walk.to)
    const over = walk.other === null ? WALK.bump : walk.by === 'slippers' ? WALK.slippers : WALK.rollBase + WALK.perBed * Math.abs(walk.to - walk.from)
    const u = (going.t - WALK.rise) / over
    if (u <= 0) {
      walker.bed = null
      walker.floor = Math.max(0, going.t / WALK.rise)
      return
    }
    if (walk.other === null) {
      // No bed left on that side: out, a bump, and home.
      const way = walk.by === 'slippers' ? -1 : 1, out = Math.min(1, u / 0.45), home = Math.max(0, (u - 0.6) / 0.4)
      walker.x = from + way * 64 * (out - Math.min(1, home))
      walker.floor = 1
      if (u >= 0.45 && !going.bumped) {
        going.bumped = true
        this.sound(ROOM.bump, walker.x)
        this.sound(VOICE[walk.walker].bump, walker.x)
        this.ring({ x: from + way * 100, y: LANE - 90 })
      }
      this.tread(going, walker, u < 0.45 ? way : -way, false)
      if (u < 1) return
      this.lieDown(walker, walk.from)
      this.going = null
      return
    }
    const other = this.people[walk.other], backAt = WALK.rise + over * 0.55, backLasts = WALK.back
    if (u < 1 && walker.bed === null) {
      walker.floor = 1
      walker.x = from + (to - from) * (walk.by === 'skates' ? 1 - (1 - u) * (1 - u) : u)
      this.tread(going, walker, Math.sign(to - from), false)
    }
    if (going.t > backAt - 0.45 && !going.mutter) {
      going.mutter = true
      this.sound(VOICE[walk.other].murmur, other.x)
      this.twitch(other)
    }
    if (going.t > backAt) {
      const v = Math.min(1, (going.t - backAt) / backLasts)
      other.bed = null
      other.floor = 1
      other.x = to + (from - to) * v
      this.tread(going, other, Math.sign(from - to), true)
      if (v >= 1) {
        this.lieDown(other, walk.from)
        going.left = true
      }
    }
    if (u >= 1 && walker.bed === null && going.t > backAt) this.lieDown(walker, walk.to)
    if (going.left && walker.bed !== null) this.going = null
  }

  private lieDown(person: Person, bed: number): void {
    person.bed = bed
    person.floor = 0
    person.x = bedX(bed)
    person.bulge = 0.8
    person.breaths = Math.floor(this.breathOf(person.sleeper))
    this.sound(ROOM.quilt, person.x)
  }

  /** Footprints come and go, and each is heard, with whatever the one who makes them wears. */
  private tread(going: Going, person: Person, way: number, back: boolean): void {
    const roll = !back && going.walk.by === 'skates'
    const stride = roll ? 0.2 : NATURE[person.sleeper].stride
    const steps = Math.floor((going.t - WALK.rise) / stride)
    const before = back ? going.stepsBack : going.steps
    if (steps <= before) return
    if (back) going.stepsBack = steps; else going.steps = steps
    this.prints.push({ x: person.x, y: LANE - 4 + (back ? 10 : -6) + (steps % 2 === 0 ? -5 : 5), sleeper: person.sleeper, side: steps % 2 === 0 ? -1 : 1, way, roll, born: this.t })
    if (!roll) this.sound(stepOf(person.sleeper), person.x)
    const worn = this.seenOn(person.sleeper)
    for (const garment of worn) if (steps % 2 === 0 || worn.length === 1) this.sound(CLOTHES[garment].step, person.x, 0.02, 1.3)
  }

  /** For the guide: where a garment can be taken from. */
  get hanging(): Garment[] {
    return GARMENTS.filter((garment) => this.pieces[garment].at === 'peg')
  }
}
