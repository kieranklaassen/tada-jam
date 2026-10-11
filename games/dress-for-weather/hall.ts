import { buttonHeld, buttoned, hung, landedOwn, landedWrong, lifted, paperTapped, poked, sailsHome, sliderHeld, stamped, takenOff, tugged, umbrella, unzipped, wornTapped, zipTooth, zippedUp, type Answer, type Cue, type Face } from './answers'
import { BUTTONS, FIGURES, GARMENTS, PARTS, TABS, TUG_STEPS, WEARERS, ZIP_TEETH, belongsAt, sameSpot, type Figure, type Garment, type Spot, type SpotPart, type Wearer, type Where } from './kinds'
import { ARMS, BODIES, DOG_HEAD, DOOR, DOOR_TARGET, GARDEN, HANDLE, HEADING, ON_RACK, RAP, SLIDER_REACH, VANE, VANE_TARGET, WINDOW, armTo, clearOf, fromPaper, onButton, onPaper, onRackTarget, onWearer, ownSpot, paperBox, placesOf, poseOf, sliderAt, spotAt, standOf, teethAt, toPaper, wornPad, type Box, type Point, type Pose, type Stands } from './layout'
import { MANNERS, Spring } from './motion'
import { hatBlows, lastsOf, markAfter, stepsOf, type Outfit, type Step } from './outing'
import { ONCE, WEATHERS, middleWears, serialize, type Mark, type Once, type Save, type Weather } from './save'
import { Scene, followedBy, type Beat } from './scene'
import * as say from './sceneVoices'
import type { Sound } from './voices'
import { LEAVE_SECONDS, STRUT_SECONDS, SWAP_SECONDS, gaitOf, leaveAt, strutAt, swapAt } from './walks'
import { dogIn, figureIn } from './weathering'

// The hall: the game's rules, with no canvas and no sound device. It holds
// what is saved (save.ts) and what is only seen (a garment in the hand or in
// the air, a figure on its way to the middle, the springs, the faces, a
// scene part way through), and it answers every touch.
//
// One clock. `t` is attended game time. An answer to a touch is a list of
// timed beats (answers.ts) and a scene is a list of timed beats (scene.ts);
// both are played from `t`, and a beat sets what is seen and queues what is
// heard in the same call. Nothing is heard that was not shown in that step.
//
// What is saved changes at the moment the child's act is certain: a garment
// tapped or let go is saved in its new place while it is still in the air, a
// garment in the hand is saved where it came from, and a scene's whole
// outcome is saved when it starts. `putAway` then leaves the hall exactly as
// a load of that save would find it, so parked and loaded are one state.
//
// What is heard is queued by group: the scene that is playing, each garment,
// and the hall's own things. A touch that ends a scene, or lifts a garment,
// queues a hush for that group ahead of its own answer, and the Mount shuts
// that group's sound in the same frame (sounding.ts).

/** Whose sound a note is: the scene's, one garment's, or the hall's own. */
export type Group = 'scene' | 'hall' | Garment
/** What the hall has queued for the ear, in order: notes of a group, or a group to be silenced now. */
export type Heard = { hush: Group | 'all' } | { group: Group; notes: Sound[] }

/** One garment as it is seen. */
export type Piece = {
  garment: Garment
  /** Where its pin is now, how it is turned and, for a pair, how far apart its two pieces are. */
  x: number
  y: number
  rot: number
  sep: number
  mode: 'rest' | 'held' | 'flying'
  /** How many of its tabs are folded over. */
  tabs: number
  /** How far each tab has turned over, 0 flat to 1 folded: the view's own easing of `tabs`. */
  fold: number[]
  swing: Spring
  pop: Spring
  sag: Spring
  /** 1 when it starts to turn right round, down to 0 when it is back. */
  turn: number
  /** 0 at rest, 1 lifted off the paper under it. */
  lift: number
  /** The spot it would go on if the finger let go now. */
  offer: Spot | null
  /** What the last outing left on it, as it is seen: a garment in the air still carries what it had. */
  mark: Mark
}

/** One figure or the dog as it is seen. */
export type Actor = {
  who: Wearer
  /** The middle of its stand, where it has got to. */
  x: number
  y: number
  /** The way it faces: -1 is the dog on its way back along the hall. */
  facing: 1 | -1
  /** Its own way of going along, while it walks: stage units off the floor, and radians tipped. */
  walkHop: number
  walkTilt: number
  squash: Spring
  tilt: Spring
  hop: Spring
  bend: Spring
  face: Face
  faceUntil: number
  /** The garment its eyes are on, until `lookUntil`. */
  lookAt: Garment | null
  lookUntil: number
  /** Where its eyes point now, eased, as a unit offset. */
  eyeX: number
  eyeY: number
}

/** What is seen of an outing while the hall sheet is turned over to the garden. */
export type Garden = {
  /** What went out, as it went out. */
  outfit: Outfit
  steps: readonly Step[]
  /** The step that is playing, and how far through it is; -1 before the first. */
  index: number
  u: number
  /** The wind has taken the hat and the dog has it on. */
  hatOnDog: boolean
}

/** A few drops or flakes shaken off, for the view: where, when and what. */
export type Splash = { x: number; y: number; at: number; mark: Mark }

type Flight = { garment: Garment; fromX: number; fromY: number; fromRot: number; fromSep: number; t: number; lasts: number; arc: number; then: Answer; who: Wearer | null }
type Playing = { answer: Answer; from: number; next: number; garment: Garment | null; who: Wearer | null }
type Grab =
  | { kind: 'garment'; garment: Garment; dx: number; dy: number; lastX: number; carried: boolean; flying: Flight | null }
  | { kind: 'zip' }
  | { kind: 'button'; index: number }
  | { kind: 'figure'; who: Wearer }
  | { kind: 'vane' }
  | { kind: 'door' }
  | { kind: 'other' }

/** One move the idle ladder may show: a carry from here to there, or a tap here. `glow` is the paper that glows, or `spot` a round glow where the tap goes. */
export type Hint = { move: 'carry' | 'tap'; glow: readonly Garment[]; spot: boolean; from: Point; to: Point }

/** Which part lies over which when two garments overlap on a figure: later is on top. */
export const PART_Z: Record<SpotPart, number> = { feet: 0, body: 1, neck: 2, hands: 3, head: 4, back: 5 }

/** A tap on the slider runs the zip this many teeth. */
export const ZIP_RUN = 3
/** Seconds the door takes to swing, seconds from the door's opening until the hall sheet is right over (the figure walks out first), and seconds the sheet takes to turn back. */
export const DOOR_SWING = 0.3
export const TURN_OVER = LEAVE_SECONDS + 0.5
export const TURN_BACK = 0.6
/** When the two raps on the glass fall in the showing of the vane, in seconds, and when the cockerel then spins. */
export const RAPS: readonly number[] = [0.45, 0.85]
export const SPIN_AT = 1.2
/** How far the door opens in its showing: a hand's width. */
export const AJAR = 0.22

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
/** Up and back down over a beat, and exactly 0 at both its ends. */
const bump = (p: number): number => (p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p))
const ease = (p: number): number => p * p * (3 - 2 * p)
const fresh = (who: Wearer, at: Point): Actor => {
  const m = MANNERS[who]
  return { who, x: at.x, y: at.y, facing: 1, walkHop: 0, walkTilt: 0, squash: new Spring(m.squash.stiffness, m.squash.damping), tilt: new Spring(m.tilt.stiffness, m.tilt.damping), hop: new Spring(m.hop.stiffness, m.hop.damping), bend: new Spring(m.bend.stiffness, m.bend.damping), face: 'rest', faceUntil: 0, lookAt: null, lookUntil: 0, eyeX: 0, eyeY: 0 }
}

export class Hall {
  readonly save: Save
  /** Attended game time, in seconds. */
  t = 0
  readonly pieces: Record<Garment, Piece>
  readonly actors: Record<Wearer, Actor>
  /** Teeth shown closed: it follows `save.zip` one tooth at a time. */
  zipShown: number
  /** How far through its slit each button is shown, 0 to 1. */
  readonly buttonShown: number[]
  /** How far on the boots are shown, 0 to TUG_STEPS. */
  tugShown: number
  /** How far open the umbrella is shown, 0 to 1. */
  openShown: number
  /** How far the one in the middle has sat down on the edge of its stand, 0 to 1. */
  sit: number
  /** How far it is stretching up, 0 to 1: the first beat of the ending. */
  stretch = 0
  /** How far the two who wait have turned to look at the one in the middle, 0 to 1. */
  heads = 0
  /** How far open the door is, 0 to 1, and its shiver under a knuckle. */
  doorOpen = 0
  readonly doorKnock = new Spring(260, 12)
  /** How far the hall sheet has turned over to the garden, 0 to 1. */
  flip = 0
  /** The outing as it is seen in the garden, while one plays. */
  garden: Garden | null = null
  /** How far round the cockerel has spun in its showing, 0 to 1, and its swing under a finger. */
  vaneSpin = 0
  readonly vaneSwing = new Spring(120, 5)
  /** How far round the cockerel stands, in turns: it goes on round to the heading of the saved weather (HEADING in layout.ts). */
  vaneTurn: number
  /** How many weathers on from the saved one the window shows: only the showing of the vane moves it. */
  weatherAhead = 0
  /** In the showing of the vane: who raps the glass, how far its arm has gone up to the pane, 0 to 1, and how far its knuckles are drawn back for a rap. */
  rapper: Figure | null = null
  rapReach = 0
  rapBack = 0
  /** How far the dog's lead has dropped from its mouth to the floor, 0 to 1. */
  leadDown = 0
  /** Drops and flakes shaken off, newest last. */
  readonly splashes: Splash[] = []
  /** Where the finger is, while one is down. */
  finger: Point | null = null
  /** The last touch on the printed hall, for the ripple the view draws. */
  ripple: { x: number; y: number; at: number } | null = null
  /** Set when the save has changed: `now` for an act that is certain, `soon` for a change that keeps coming. The Mount reads and clears it. */
  dirty: 'now' | 'soon' | null = null
  private heard: Heard[] = []
  /** The touch that is down will, when it is over, start the showing of the vane. */
  private owes = false
  private readonly playing: Playing[] = []
  private readonly flights: Flight[] = []
  private grab: Grab | null = null
  private scene: Scene | null = null
  /** A change of places under way: who leaves the middle, who takes it, and how far along they are. */
  private swap: { from: Figure; to: Figure; u: number } | null = null
  /** How far round its turn of the hall the dog is, or null while it sits. */
  private strut: number | null = null
  /** While an outing's first beats still show the hall as it was: where things were, what marks they had and whether the umbrella was open. */
  private before: Pick<Save, 'where' | 'marks' | 'open'> | null = null
  /** The ending holds the sit back until its own beat. */
  private sitHeld = false
  /** What no worn garment may lie over (layout.ts). */
  private clear: readonly Box[] = clearOf()

  /**
   * Set up from a save, as it was left: nothing eases in, nothing starts and nothing is heard. `phase` is where
   * the hall's clock starts, in seconds: it only moves where each character is in its own idle round, so a
   * visit does not open on the same blink each time, and the same phase gives the same still.
   */
  constructor(save: Save, phase = 0) {
    this.t = phase
    this.save = serialize(save)
    const places = placesOf(this.save.turn)
    this.actors = Object.fromEntries(WEARERS.map((who) => [who, fresh(who, places[who])])) as Record<Wearer, Actor>
    this.pieces = Object.fromEntries(
      GARMENTS.map((garment) => {
        const pose = this.restPose(garment), worn = this.save.where[garment] !== 'rack'
        const piece: Piece = { garment, ...pose, mode: 'rest', tabs: worn ? TABS[garment] : 0, fold: Array.from({ length: TABS[garment] }, () => (worn ? 1 : 0)), swing: new Spring(90, 6), pop: new Spring(320, 14), sag: new Spring(60, 7), turn: 0, lift: 0, offer: null, mark: this.save.marks[garment] }
        return [garment, piece]
      }),
    ) as Record<Garment, Piece>
    this.zipShown = this.save.zip
    this.buttonShown = this.save.buttons.map((through) => (through ? 1 : 0))
    this.tugShown = this.save.tug
    this.openShown = this.save.open ? 1 : 0
    this.sit = this.save.finished ? 1 : 0
    this.vaneTurn = HEADING[this.save.weather]
  }

  /** What goes to storage: every garment where it belongs, none in the air. */
  toSave(): Save {
    return serialize(this.save)
  }

  /** The sounds queued since the last call, in the order they were set off, without their groups: what a test listens to. */
  takeNotes(): Sound[] {
    return this.takeSounds().flatMap((heard) => ('notes' in heard ? heard.notes : []))
  }

  /** What was queued for the ear since the last call, in order: the Mount plays it as one voice (sounding.ts). */
  takeSounds(): Heard[] {
    const heard = this.heard
    this.heard = []
    return heard
  }

  private sound(group: Group, sounds: readonly Sound[]): void {
    if (sounds.length === 0) return
    const last = this.heard[this.heard.length - 1]
    if (last && 'notes' in last && last.group === group) last.notes.push(...sounds)
    else this.heard.push({ group, notes: [...sounds] })
  }

  /** The surface has a size: where the jam's home control lies on the stage now (layout.ts). */
  setControl(control: Box): void {
    this.clear = clearOf(control)
  }

  /** Whether something is under way that the idle ladder should leave alone. */
  get busy(): boolean {
    return this.grab !== null || this.flights.length > 0 || this.playing.length > 0 || this.scene !== null || this.swap !== null || this.strut !== null
  }

  /** Whether a scene is playing. */
  get inScene(): boolean {
    return this.scene !== null
  }

  /** Who stands in the middle. */
  get turn(): Figure {
    return this.save.turn
  }

  /** Where everyone's stand is now. */
  stands(): Stands {
    const a = this.actors
    return { child: a.child, grandfather: a.grandfather, baby: a.baby, dog: a.dog }
  }

  /** Where a garment is as it is seen: as saved, except in the first beats of an outing, which still show the hall as it was. */
  whereShown(garment: Garment): Where {
    return (this.before ?? this.save).where[garment]
  }

  /** Whether the umbrella is open as it is seen. */
  get openSeen(): boolean {
    return (this.before ?? this.save).open
  }

  /** The weather the window shows. */
  get weatherShown(): Weather {
    return WEATHERS[(WEATHERS.indexOf(this.save.weather) + this.weatherAhead) % WEATHERS.length]
  }

  /** Where a garment lies when nothing moves it. */
  restPose(garment: Garment): Pose {
    return poseOf(garment, this.whereShown(garment), this.stands(), garment === 'umbrella' && this.openSeen, this.clear)
  }

  /** Where the garment in the hand would lie if the finger let go now: the dotted cut-line is drawn there, clear of whatever the garment itself would be kept clear of. */
  offerPose(garment: Garment): Pose | null {
    const offer = this.pieces[garment].offer
    return offer ? poseOf(garment, offer, this.stands(), garment === 'umbrella' && this.openSeen, this.clear) : null
  }

  /** The garment on a spot, if any. */
  wornAt(spot: Spot): Garment | null {
    return GARMENTS.find((garment) => sameSpot(this.save.where[garment], spot)) ?? null
  }

  /** The garments a wearer is seen to have on, lowest first. */
  wornBy(who: Wearer): Garment[] {
    return GARMENTS.filter((garment) => {
      const where = this.whereShown(garment)
      return where !== 'rack' && where.who === who
    }).sort((a, b) => PART_Z[(this.whereShown(a) as Spot).part] - PART_Z[(this.whereShown(b) as Spot).part])
  }

  /** Everyone from the back of the hall to the front: a stand lower on the sheet is nearer. The view draws in this order and a touch is tried in the other. */
  backToFront(): Wearer[] {
    return [...WEARERS].sort((a, b) => this.actors[a].y - this.actors[b].y)
  }

  // --- Touch -----------------------------------------------------------------

  /**
   * A finger lands. A scene that is playing ends first, and is silent from this call. In the hall the touch is
   * then an ordinary one: whatever is under it answers now. While the sheet is turned to the garden the touch
   * is the garden's (`gardenTouch`), and never reaches the hall that is hidden under it.
   */
  press(x: number, y: number): void {
    this.finger = { x, y }
    this.grab = { kind: 'other' }
    this.owes = false
    if (this.scene && this.flip > 0) {
      this.gardenTouch(x, y)
      return
    }
    const wasInScene = this.scene !== null
    this.endScene(true)
    // The showing of the vane is owed from the first outing. The first touch after one has ended starts it when
    // the touch is over (`touchOver`): the press itself does one thing, and answers what is under it.
    this.owes = !wasInScene && this.save.shown.includes('out') && !this.save.shown.includes('vane')
    const hit = this.under(x, y)
    this.grab = hit
    switch (hit.kind) {
      case 'zip':
        this.play(sliderHeld, 'raincoat', this.wearerOf('raincoat'))
        return
      case 'button':
        this.play(buttonHeld, 'duffel', this.wearerOf('duffel'))
        return
      case 'garment': {
        const piece = this.pieces[hit.garment]
        // What it was still answering with stops here: a garment in the hand does not finish a sound it began on a body.
        this.hush(hit.garment)
        if (hit.flying) {
          this.flights.splice(this.flights.indexOf(hit.flying), 1)
          piece.mode = 'held'
          this.sound(hit.garment, say.caught)
        }
        piece.lift = 1
        hit.dx = x - piece.x
        hit.dy = y - piece.y
        this.play(lifted(hit.garment), hit.garment, hit.flying ? null : this.wearerOf(hit.garment))
        return
      }
      case 'figure':
        this.play(poked(hit.who), null, hit.who)
        return
      case 'vane':
        this.vaneSwing.kick(2.2)
        this.sound('hall', say.vaneTouch)
        return
      case 'door':
        this.doorKnock.kick(1.6)
        this.sound('hall', say.knock)
        this.kick('dog', 'hop', 0.5)
        return
      case 'other':
        this.ripple = { x, y, at: this.t }
        this.play(paperTapped, null, null)
    }
  }

  /**
   * A touch while the sheet is turned to the garden. It ends the outing, which brings the hall back, and it is
   * answered by what was drawn in the garden under the finger: the figure or the dog, which take it as a poke
   * where they now stand, or else the weather, with a few of its drops or flakes at the finger and its sound.
   * It does nothing else: the lift that follows is no tap on anything.
   */
  private gardenTouch(x: number, y: number): void {
    const who = this.inGarden(x, y), weather = this.garden?.outfit.weather ?? this.save.weather
    this.endScene(true)
    if (who) {
      this.play(poked(who), null, who)
      return
    }
    if (weather === 'rain' || weather === 'snow') this.splashes.push({ x, y, at: this.t, mark: weather === 'rain' ? 'wet' : 'snowy' })
    else this.ripple = { x, y, at: this.t }
    this.sound('hall', say.WEATHER_VOICE[weather])
  }

  /** Who is drawn in the garden at that stage point: the figure that went out or the dog, each where the step that is playing has it, and nobody while the sheet is still turning. */
  private inGarden(x: number, y: number): Wearer | null {
    const garden = this.garden
    if (!garden || this.flip < 1) return null
    const who = garden.outfit.who, step = garden.index >= 0 ? garden.steps[garden.index] : null
    const far = { x: -4000, y: 0 }, stands: Stands = { child: far, grandfather: far, baby: far, dog: far }
    const stance = figureIn(step, who, garden.u)
    if (stance.lie > 0.5) {
      // Lying down, it is a long low shape on the lawn.
      const tall = BODIES[who].height, at = GARDEN.figure
      if (x >= at.x - tall * 0.8 && x <= at.x + tall * 0.35 && y >= at.y - 190 && y <= at.y + 10) return who
    } else {
      stands[who] = { x: GARDEN.figure.x + stance.dx, y: GARDEN.figure.y - stance.up }
      if (onWearer(who, x, y, stands)) return who
    }
    stands.dog = { x: GARDEN.dog.x + dogIn(step, garden.u).dx, y: GARDEN.dog.y }
    return onWearer('dog', x, y, stands) ? 'dog' : null
  }

  /** The finger lifted where it landed. */
  tap(): void {
    const grab = this.grab
    this.release()
    if (grab) this.tapped(grab)
    this.touchOver()
  }

  private tapped(grab: Grab): void {
    switch (grab.kind) {
      case 'zip':
        this.setZip(this.save.zip >= ZIP_TEETH ? 0 : Math.min(ZIP_TEETH, this.save.zip + ZIP_RUN))
        this.dirty = 'now'
        return
      case 'button': {
        const through = !this.save.buttons[grab.index]
        this.save.buttons[grab.index] = through
        this.dirty = 'now'
        this.play(buttoned(grab.index, through), 'duffel', this.wearerOf('duffel'))
        return
      }
      case 'figure':
        // One who waits takes the middle. While two are still changing places the poke is the whole answer.
        if (grab.who !== 'dog' && grab.who !== this.save.turn && !this.swap) this.changePlaces(grab.who)
        return
      case 'vane':
        this.turnVane()
        return
      case 'door':
        if (!this.swap && !this.scene) this.goOut()
        return
      case 'garment':
        break
      case 'other':
        return
    }
    const garment = grab.garment, where = this.save.where[garment]
    if (grab.flying) {
      // Caught and let go again: it flies on to where it was going.
      this.fly(garment, grab.flying.arc, grab.flying.then, grab.flying.who)
      return
    }
    if (where === 'rack') {
      this.putOn(garment, ownSpot(garment, this.save.turn))
      return
    }
    // The boots' fastening works wherever they are worn: a tap is one tug, and tugged right on they stamp.
    if (garment === 'boots') {
      if (this.save.tug < TUG_STEPS) this.tugOnce()
      else this.play(stamped, garment, where.who)
      return
    }
    if (garment === 'umbrella') {
      this.save.open = !this.save.open
      this.dirty = 'now'
      this.play(umbrella(this.save.open), garment, where.who)
      return
    }
    this.play(wornTapped(garment), garment, where.who)
  }

  /**
   * The child's touch is over. If it was the first after an outing had ended, and it has started neither a
   * scene nor a change of places, the showing of the vane starts now; otherwise the showing stays owed.
   */
  private touchOver(): void {
    if (!this.owes) return
    this.owes = false
    if (this.scene || this.swap) return
    if (this.save.shown.includes('out') && !this.save.shown.includes('vane')) this.showVane()
  }

  /** The press is over and was not a tap: whatever it lifted settles back, and a garment caught in the air flies on. */
  pressEnd(): void {
    const grab = this.grab
    this.owes = false
    this.release()
    if (grab?.kind === 'garment' && grab.flying) this.fly(grab.garment, grab.flying.arc, grab.flying.then, grab.flying.who)
  }

  /** The finger has started to move with whatever it landed on. */
  dragStart(): void {
    const grab = this.grab
    // A button under a finger that drags away was not the thing wanted: the coat comes off instead.
    if (grab?.kind === 'button') {
      const piece = this.pieces.duffel, at = this.finger ?? { x: piece.x, y: piece.y }
      this.grab = { kind: 'garment', garment: 'duffel', dx: at.x - piece.x, dy: at.y - piece.y, lastX: at.x, carried: false, flying: null }
    }
  }

  dragMove(x: number, y: number): void {
    this.finger = { x, y }
    const grab = this.grab
    if (!grab) return
    if (grab.kind === 'zip') {
      const teeth = teethAt(toPaper(this.pieces.raincoat, this.mirrored('raincoat', x), y).y)
      if (teeth !== this.save.zip) {
        this.setZip(teeth)
        this.dirty = 'soon'
      }
      return
    }
    if (grab.kind !== 'garment') return
    const garment = grab.garment, piece = this.pieces[garment], where = this.save.where[garment]
    if (!grab.carried) {
      // A worn garment comes off under a dragging finger, whichever way it is dragged: boots too, tugged on or not.
      grab.carried = true
      piece.mode = 'held'
      if (where !== 'rack' && !grab.flying) this.play(takenOff(garment), garment, where.who)
      else this.setTabs(piece, 0, false)
    }
    piece.x = x - grab.dx
    piece.y = y - grab.dy
    // The paper trails the hand: it leans the way it is carried.
    piece.swing.kick(clamp((x - grab.lastX) * -0.05, -1.2, 1.2))
    grab.lastX = x
    piece.offer = spotAt(x, y, this.stands())
  }

  /**
   * The finger lifted in the middle of a drag, and the drag is not over yet (input.ts): the garment in the hand
   * waits in the air where it was let go, and nobody watches a finger that is not there.
   */
  dragLift(): void {
    this.finger = null
  }

  /**
   * Whether a drag whose finger lifts now waits for the finger to come back. A garment let go over nothing
   * does: it hangs in the air for the grace input.ts gives, and then sails home. A garment let go over a spot
   * goes on at once, and so does everything else.
   */
  get waitsWhenLifted(): boolean {
    const grab = this.grab
    return grab?.kind === 'garment' && grab.carried && this.pieces[grab.garment].offer === null
  }

  /** The drag is over: the garment in hand goes on the spot under it, or sails back to the rack. */
  drop(x: number, y: number): void {
    const grab = this.grab
    this.release()
    if (grab?.kind === 'zip') this.dirty = 'now'
    else if (grab?.kind === 'garment' && grab.carried) {
      const spot = spotAt(x, y, this.stands())
      if (spot) this.putOn(grab.garment, spot)
      else {
        this.hang(grab.garment)
        this.cycleMayEnd()
      }
    }
    this.touchOver()
  }

  /** The touch was taken away with the finger still down: the child made no move, so whatever was in hand is back where it is saved and nothing is heard. */
  cancel(): void {
    const grab = this.grab
    this.owes = false
    this.release()
    if (grab?.kind !== 'garment' || !(grab.carried || grab.flying)) return
    this.settle(grab.garment)
  }

  private release(): void {
    const grab = this.grab
    this.grab = null
    this.finger = null
    if (grab?.kind === 'garment') {
      this.pieces[grab.garment].lift = 0
      this.pieces[grab.garment].offer = null
    }
  }

  /** A garment is at once where it is saved, lying as it lies there. */
  private settle(garment: Garment): void {
    const piece = this.pieces[garment]
    piece.mode = 'rest'
    Object.assign(piece, this.restPose(garment))
    this.setTabs(piece, this.whereShown(garment) === 'rack' ? 0 : TABS[garment], true)
  }

  /** A stage point as the dog's own paper has it: the dog is turned round on its way back along the hall, and what it wears with it. */
  private mirrored(garment: Garment, x: number): number {
    const where = this.whereShown(garment)
    if (where === 'rack') return x
    const actor = this.actors[where.who]
    return actor.facing === 1 ? x : 2 * actor.x - x
  }

  /**
   * What a finger at that stage point is on, from the front of the hall to the back, in the order the view
   * draws it the other way: a garment in the air, then each wearer from the nearest with what it wears from
   * the top down (a fastening before the paper it is on), then the rack, the vane, the door and bare paper.
   */
  private under(x: number, y: number): Grab {
    const garmentAt = (garment: Garment, flying: Flight | null): Grab => ({ kind: 'garment', garment, dx: 0, dy: 0, lastX: x, carried: false, flying })
    const open = (garment: Garment) => garment === 'umbrella' && this.openSeen
    for (const flight of this.flights) if (onPaper(flight.garment, this.pieces[flight.garment], open(flight.garment), x, y, 10)) return garmentAt(flight.garment, flight)
    const stands = this.stands()
    for (const who of this.backToFront().reverse()) {
      const actor = this.actors[who], px = actor.facing === 1 ? x : 2 * actor.x - x
      // The dog's head comes through whatever is on its back.
      if (who === 'dog' && px >= actor.x + DOG_HEAD.x0 && px <= actor.x + DOG_HEAD.x1 && y >= actor.y + DOG_HEAD.y0 && y <= actor.y + DOG_HEAD.y1) return { kind: 'figure', who }
      let headTried = false
      for (const garment of this.wornBy(who).reverse()) {
        const piece = this.pieces[garment]
        if (piece.mode !== 'rest') continue
        // The baby's head comes through whatever is on its body or its feet, so there a finger is on the baby.
        if (who === 'baby' && !headTried && PART_Z[(this.whereShown(garment) as Spot).part] <= PART_Z.body) {
          headTried = true
          const face = BODIES.baby.face
          if (Math.hypot(px - (actor.x + face.x), y - (actor.y + face.y)) <= BODIES.baby.faceR) return { kind: 'figure', who }
        }
        if (garment === 'raincoat') {
          const slider = fromPaper(piece, sliderAt(this.zipShown).x, sliderAt(this.zipShown).y)
          if (Math.hypot(slider.x - px, slider.y - y) <= SLIDER_REACH) return { kind: 'zip' }
        }
        if (garment === 'duffel') {
          const at = toPaper(piece, px, y)
          for (let index = 0; index < BUTTONS; index++) if (onButton(index, at.x, at.y)) return { kind: 'button', index }
        }
        if (onPaper(garment, piece, open(garment), px, y, wornPad(garment, open(garment)))) return garmentAt(garment, null)
      }
      if (onWearer(who, px, y, stands)) return { kind: 'figure', who }
    }
    for (const garment of GARMENTS) if (this.whereShown(garment) === 'rack' && this.pieces[garment].mode === 'rest' && onRackTarget(garment, x, y)) return garmentAt(garment, null)
    const inside = (box: Box) => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1
    if (inside(VANE_TARGET)) return { kind: 'vane' }
    if (inside(DOOR_TARGET)) return { kind: 'door' }
    return { kind: 'other' }
  }

  // --- The acts ----------------------------------------------------------------

  /** A garment goes onto a spot. Whatever was there sails back to the rack. It is saved there at once and flies the rest of the way. */
  private putOn(garment: Garment, spot: Spot): void {
    const there = this.wornAt(spot)
    if (there && there !== garment) this.hang(there)
    this.save.where[garment] = spot
    if (garment === 'boots') this.save.tug = 0
    // The one in the middle stands up again for a garment: the next cycle has begun.
    if (spot.who === this.save.turn) this.save.finished = false
    this.dirty = 'now'
    this.setTabs(this.pieces[garment], 0, false)
    const others = WEARERS.filter((who) => who !== spot.who)
    this.fly(garment, 26, belongsAt(garment, spot) ? landedOwn(garment, others) : landedWrong(garment, spot.part, others), spot.who)
    this.cycleMayEnd()
  }

  /** A garment goes back to its peg: saved there at once, shut, loose and dry, and it sails the rest of the way. */
  private hang(garment: Garment): void {
    const wasOpen = garment === 'umbrella' && this.save.open
    this.save.where[garment] = 'rack'
    this.save.marks[garment] = 'dry'
    if (garment === 'umbrella') this.save.open = false
    if (garment === 'boots') this.save.tug = 0
    this.dirty = 'now'
    this.play(sailsHome, garment, null)
    // An umbrella is shut as it is hung up, and heard to shut as it knocks the rail.
    const then: Answer = wasOpen ? [{ ...hung(garment)[0], notes: [...hung(garment)[0].notes, ...umbrella(false)[0].notes] }] : hung(garment)
    this.fly(garment, 60, then, null)
  }

  /** The cycle ends when the one who came home has had the last thing taken off it. */
  private cycleMayEnd(): void {
    if (!this.save.back || middleWears(this.save)) return
    this.sitHeld = true
    this.start(this.endingBeats(), () => {
      this.save.finished = true
      this.save.back = false
    })
  }

  /** One who waits takes the middle, and the one who stood there takes the waiting place that fits its height, keeping what it wears. */
  private changePlaces(who: Figure): void {
    const from = this.save.turn
    this.save.turn = who
    this.save.back = false
    this.save.finished = false
    this.dirty = 'now'
    this.swap = { from, to: who, u: 0 }
    this.sound('hall', say.setsOff)
    this.actors[who].face = 'grin'
    this.actors[who].faceUntil = this.t + SWAP_SECONDS
  }

  /** The vane goes round to the next weather, and the window shows it at once. */
  private turnVane(): void {
    this.save.weather = WEATHERS[(WEATHERS.indexOf(this.save.weather) + 1) % WEATHERS.length]
    this.dirty = 'now'
    this.vaneSwing.kick(7)
    this.sound('hall', [...say.vaneTurn, ...say.WEATHER_VOICE[this.save.weather]])
    for (const figure of FIGURES) if (figure !== this.save.turn) this.kick(figure, 'hop', 0.4)
  }

  private fly(garment: Garment, arc: number, then: Answer, who: Wearer | null): void {
    const piece = this.pieces[garment], to = this.restPose(garment)
    const at = this.flights.findIndex((flight) => flight.garment === garment)
    if (at >= 0) this.flights.splice(at, 1)
    const far = Math.hypot(to.x - piece.x, to.y - piece.y)
    piece.mode = 'flying'
    piece.offer = null
    this.flights.push({ garment, fromX: piece.x, fromY: piece.y, fromRot: piece.rot, fromSep: piece.sep, t: 0, lasts: clamp(far / 1500, 0.1, 0.42), arc: Math.min(arc, far * 0.3), then, who })
  }

  private tugOnce(): void {
    this.save.tug += 1
    this.dirty = 'now'
    this.play(tugged(this.save.tug, this.save.tug >= TUG_STEPS), 'boots', this.wearerOf('boots'))
  }

  private setZip(teeth: number): void {
    this.save.zip = clamp(Math.round(teeth), 0, ZIP_TEETH)
    this.chaseZip()
  }

  /** The zip shown closes or opens one tooth toward the saved one, with that tooth's tick. */
  private chaseZip(): void {
    if (this.zipShown === this.save.zip) return
    this.zipShown += this.zipShown < this.save.zip ? 1 : -1
    const who = this.wearerOf('raincoat')
    this.play(zipTooth(this.zipShown), 'raincoat', who)
    if (this.zipShown === this.save.zip && this.zipShown === ZIP_TEETH) this.play(zippedUp, 'raincoat', who)
    if (this.zipShown === this.save.zip && this.zipShown === 0) this.play(unzipped, 'raincoat', who)
  }

  private setTabs(piece: Piece, tabs: number, atOnce: boolean): void {
    piece.tabs = tabs
    if (atOnce) piece.fold.fill(tabs > 0 ? 1 : 0)
  }

  private wearerOf(garment: Garment): Wearer | null {
    const where: Where = this.save.where[garment]
    return where === 'rack' ? null : where.who
  }

  private kick(who: Wearer, spring: 'squash' | 'tilt' | 'hop' | 'bend', by: number): void {
    this.actors[who][spring].kick(by * MANNERS[who][spring].push)
  }

  // --- Scenes (scene.ts): each saves its whole outcome when it starts ---------------

  /** A beat that happens at one moment: what is seen and what is heard, together. A touch that ends the scene lands it unseen and unheard. */
  private cue(at: number, notes: readonly Sound[] | (() => readonly Sound[]), see: () => void = () => {}): Beat {
    return { at, lasts: 0, play: (_progress, finishing) => {
      if (finishing) return
      see()
      this.sound('scene', typeof notes === 'function' ? notes() : notes)
    } }
  }

  /** A beat that takes a value somewhere over a while. At 1 it leaves the value where the beat was taking it. */
  private ramp(at: number, lasts: number, set: (progress: number) => void): Beat {
    return { at, lasts, play: (progress) => set(progress) }
  }

  /** Starts a scene: its outcome is put into the save first, at once, and its first beat plays in this call. One scene plays at a time, so one that is running ends here. */
  private start(beats: Beat[], saveOutcome: () => void): void {
    this.endScene()
    this.scene = new Scene(beats)
    this.scene.start(this.t, () => {
      saveOutcome()
      this.dirty = 'now'
    })
    this.scene.update(this.t)
  }

  /**
   * The scene ends: every beat that is left lands where it was going, and none of them is heard. When a touch
   * ends it, what it had already set sounding is silenced too, from this call.
   */
  private endScene(byTouch = false): void {
    if (!this.scene) return
    this.scene.finish()
    this.scene = null
    if (byTouch) this.heard.push({ hush: 'scene' })
  }

  /** The door: the one in the middle goes out in what it has on, into the weather the vane points at. */
  private goOut(): void {
    const save = this.save, who = save.turn
    const worn = PARTS.flatMap((part) => {
      const garment = this.wornAt({ who, part })
      return garment ? [{ garment, part }] : []
    })
    const outfit: Outfit = { who, worn, zip: save.zip, buttons: [...save.buttons], tug: save.tug, open: save.open, weather: save.weather, dog: this.wornAt({ who: 'dog', part: 'back' }) }
    const steps = stepsOf(outfit)
    const before = { where: { ...save.where }, marks: { ...save.marks }, open: save.open }
    const blows = hatBlows(outfit)
    const comesHomeBare = worn.every((w) => blows && w.garment === 'hat')
    let beats = this.outingBeats(outfit, steps)
    if (comesHomeBare) {
      beats = followedBy(beats, this.endingBeats())
      this.sitHeld = true
    }
    this.start(beats, () => {
      for (const w of worn) save.marks[w.garment] = markAfter(save.weather, save.marks[w.garment])
      if (blows) {
        // The wind takes the hat and the dog brings it home on its back; what the dog wore goes to the rack.
        if (outfit.dog && outfit.dog !== 'hat') {
          save.where[outfit.dog] = 'rack'
          save.marks[outfit.dog] = 'dry'
          if (outfit.dog === 'umbrella') save.open = false
          if (outfit.dog === 'boots') save.tug = 0
        }
        save.where.hat = { who: 'dog', part: 'back' }
      }
      save.back = !comesHomeBare
      save.finished = comesHomeBare
      this.once('out')
      this.before = before
    })
  }

  private outingBeats(outfit: Outfit, steps: readonly Step[]): Beat[] {
    const garden: Garden = { outfit, steps, index: -1, u: 0, hatOnDog: false }
    const who = outfit.who, actor = this.actors[who]
    let walked = 0
    const beats: Beat[] = [
      this.cue(0, say.doorCreak, () => this.kick('dog', 'hop', 0.8)),
      this.ramp(0, DOOR_SWING, (p) => { this.doorOpen = p }),
      // The figure walks out of the door in what it has on, in its own gait, a footfall heard for each step.
      { at: 0, lasts: LEAVE_SECONDS, play: (p, finishing) => {
        const at = leaveAt(p), gait = gaitOf(who, p)
        actor.x = at.x
        actor.y = at.y
        actor.walkHop = gait.hop
        actor.walkTilt = gait.tilt
        if (!finishing) for (let k = Math.floor(walked * STEPS[who]) + 1; k <= Math.floor(p * STEPS[who]) && k < STEPS[who]; k++) this.sound('scene', say.footstep(who, k))
        walked = p
      } },
      this.cue(LEAVE_SECONDS, [...say.sheetOver, ...say.WEATHER_VOICE[outfit.weather]]),
      // The hall is still seen as it was until the sheet is right over; then everyone is in their places again, unseen.
      this.ramp(LEAVE_SECONDS, TURN_OVER - LEAVE_SECONDS, (p) => {
        this.garden = garden
        this.flip = p
        if (p >= 1) {
          this.before = null
          this.atRest()
          for (const garment of GARMENTS) if (this.pieces[garment].mode === 'rest') this.settle(garment)
        }
      }),
    ]
    let at = TURN_OVER
    steps.forEach((step, index) => {
      const lasts = lastsOf(step), blown = step.kind === 'cell' && step.cell.move === 'blowoff'
      beats.push(this.ramp(at, lasts, (p) => {
        garden.index = index
        garden.u = p
        if (blown && p >= 1) garden.hatOnDog = true
      }))
      for (const [offset, sounds] of step.kind === 'taste' ? step.taste.notes : step.cell.notes) beats.push(this.cue(at + offset * lasts, sounds))
      at += lasts
    })
    beats.push(this.cue(at, say.sheetBack))
    beats.push(this.ramp(at, TURN_BACK, (p) => {
      this.flip = 1 - p
      if (p >= 1) {
        this.garden = null
        this.doorOpen = 0
      }
    }))
    at += TURN_BACK
    const dog = this.actors.dog, feetBare = !outfit.worn.some((w) => w.part === 'feet')
    beats.push(this.cue(at, say.doorShut, () => this.doorKnock.kick(1)))
    // Home again: after rain the dog shakes itself, and wet socks are wrung out on the mat.
    if (outfit.weather === 'rain') beats.push(this.cue(at + 0.12, say.dogShake, () => {
      this.kick('dog', 'tilt', 1.6)
      this.splashes.push({ x: dog.x, y: dog.y - 70, at: this.t, mark: 'wet' })
    }))
    if (feetBare && (outfit.weather === 'rain' || outfit.weather === 'snow')) beats.push(this.cue(at + 0.3, say.sockWring, () => {
      const middle = this.actors[outfit.who]
      this.kick(outfit.who, 'squash', 0.7)
      this.splashes.push({ x: middle.x, y: middle.y - 10, at: this.t, mark: 'wet' })
    }))
    beats.push(this.ramp(at, 0.5, () => {}))
    return beats
  }

  /** The ending: a stretch, a sit on the edge of the stand, a breath, and the two who wait turn to look and back. */
  private endingBeats(): Beat[] {
    const who = this.save.turn
    return [
      this.cue(0, say.stretch),
      this.ramp(0, 1, (p) => { this.stretch = bump(p) }),
      this.ramp(1, 0.7, (p) => {
        this.sit = Math.max(this.sit, p)
        if (p >= 1) this.sitHeld = false
      }),
      this.cue(1.6, say.sitDown, () => this.kick(who, 'squash', 0.9)),
      this.cue(1.95, say.breath, () => {
        this.actors[who].face = 'cosy'
        this.actors[who].faceUntil = this.t + 1.6
        this.kick(who, 'squash', -0.4)
      }),
      this.cue(2.7, say.headsTurn),
      this.ramp(2.7, 1.2, (p) => { this.heads = bump(p) }),
    ]
  }

  /** Seen once: the dog shows what the door is for. */
  private showDoor(): void {
    this.start([
      this.cue(0, say.leadDrop),
      this.ramp(0, 0.3, (p) => { this.leadDown = p }),
      this.cue(0.6, say.scratch, () => this.kick('dog', 'hop', 0.7)),
      this.cue(1.1, say.scratch, () => this.kick('dog', 'hop', 0.7)),
      this.cue(1.7, () => [...say.doorCreak, ...say.WEATHER_VOICE[this.save.weather]]),
      this.ramp(1.7, 0.5, (p) => { this.doorOpen = AJAR * p }),
      this.ramp(2.6, 0.35, (p) => { this.doorOpen = AJAR * (1 - p) }),
      this.cue(2.95, say.doorShut, () => this.doorKnock.kick(1)),
      this.cue(3.4, say.leadUp),
      this.ramp(3.4, 0.4, (p) => { this.leadDown = 1 - p }),
    ], () => this.once('door'))
  }

  /**
   * Seen once: the taller of the two who wait shows what the vane is for. It lifts an arm to the window and raps
   * the glass twice with its knuckles (the child has to jump for it), the cockerel spins once round, and the
   * window goes through all four weathers. It changes nothing.
   */
  private showVane(): void {
    const tall = FIGURES.filter((figure) => figure !== this.save.turn).sort((a, b) => BODIES[b].height - BODIES[a].height)[0]
    const actor = this.actors[tall], hop = tall === 'baby' ? 0 : RAP[tall].hop
    const beats: Beat[] = [this.ramp(0, 0.25, (p) => {
      this.rapper = tall
      this.rapReach = ease(p)
    })]
    for (const at of RAPS) {
      // The knuckles draw back and come down on the glass, and the rap is heard in the frame they touch it.
      beats.push(this.ramp(at - 0.2, 0.2, (p) => {
        this.rapBack = bump(p)
        actor.walkHop = hop * ease(p)
      }))
      beats.push(this.cue(at, say.glassRap, () => this.vaneSwing.kick(1.4)))
      beats.push(this.ramp(at, 0.2, (p) => { actor.walkHop = hop * (1 - ease(p)) }))
    }
    beats.push(this.ramp(RAPS[RAPS.length - 1] + 0.1, 0.25, (p) => {
      this.rapReach = 1 - ease(p)
      if (p >= 1) this.rapper = null
    }))
    beats.push(this.cue(SPIN_AT, say.vaneSpin))
    beats.push(this.ramp(SPIN_AT, 1, (p) => { this.vaneSpin = p >= 1 ? 0 : p }))
    const from = SPIN_AT + 1
    WEATHERS.forEach((_, index) => {
      const at = from + index * 0.5, ahead = (index + 1) % WEATHERS.length
      beats.push(this.ramp(at, 0, () => { this.weatherAhead = ahead }))
      beats.push(this.cue(at, () => say.WEATHER_VOICE[this.weatherShown]))
    })
    beats.push(this.ramp(from, WEATHERS.length * 0.5, () => {}))
    this.start(beats, () => this.once('vane'))
  }

  /**
   * The arm that raps the glass: whose it is, and where its hand is from the middle of that figure's stand.
   * The hand goes from where it hangs to the place on the pane (RAP in layout.ts), drawn back a little before
   * each rap.
   */
  rapArm(): { who: Figure; aim: Point } | null {
    const who = this.rapper
    if (!who || who === 'baby') return null
    const actor = this.actors[who], rest = ARMS[who].hand
    const want = { x: RAP[who].at.x - actor.x - 26 * this.rapBack, y: RAP[who].at.y - (actor.y - actor.walkHop) + 10 * this.rapBack }
    return { who, aim: { x: rest.x + (want.x - rest.x) * this.rapReach, y: rest.y + (want.y - rest.y) * this.rapReach } }
  }

  /** Where the knuckles of the one who raps are on the stage, or null while nobody raps. */
  rapHand(): Point | null {
    const arm = this.rapArm()
    if (!arm) return null
    const actor = this.actors[arm.who], hand = armTo(arm.who, arm.aim).hand
    return { x: actor.x + hand.x, y: actor.y - actor.walkHop + hand.y }
  }

  // --- Answers, played on the hall's own clock -----------------------------------

  private play(answer: Answer, garment: Garment | null, who: Wearer | null): void {
    this.playing.push({ answer, from: this.t, next: 0, garment, who })
    this.runAnswers()
  }

  /** Whatever a garment was still answering with is dropped: the beats it had not reached are neither seen nor heard, and what it had set sounding is silenced from this call. */
  private hush(garment: Garment): void {
    for (let i = this.playing.length - 1; i >= 0; i--) if (this.playing[i].garment === garment) this.playing.splice(i, 1)
    this.heard.push({ hush: garment })
  }

  private runAnswers(): void {
    for (let i = 0; i < this.playing.length; i++) {
      const p = this.playing[i]
      while (p.next < p.answer.length && p.answer[p.next].at <= this.t - p.from + 1e-9) {
        const beat = p.answer[p.next++]
        for (const cue of beat.cues) this.apply(cue, p)
        this.sound(p.garment ?? 'hall', beat.notes)
      }
    }
    for (let i = this.playing.length - 1; i >= 0; i--) if (this.playing[i].next >= this.playing[i].answer.length) this.playing.splice(i, 1)
  }

  private apply(cue: Cue, p: Playing): void {
    if (cue.on === 'everyone') {
      for (const who of WEARERS) {
        this.actors[who].lookAt = p.garment
        this.actors[who].lookUntil = this.t + cue.look
      }
      return
    }
    if (cue.on === 'garment') {
      if (!p.garment) return
      const piece = this.pieces[p.garment]
      if ('tabs' in cue) this.setTabs(piece, cue.tabs, false)
      else if (cue.kick === 'turn') piece.turn = 1
      else if (cue.kick === 'swing') piece.swing.kick(cue.by * 4)
      else if (cue.kick === 'pop') piece.pop.kick(cue.by * 22)
      else piece.sag.kick(cue.by * 90)
      return
    }
    const who = cue.who ?? p.who
    if (!who) return
    const actor = this.actors[who]
    if ('face' in cue) {
      actor.face = cue.face
      actor.faceUntil = this.t + cue.hold
    } else this.kick(who, cue.kick, cue.by)
  }

  /** Marks a thing that happens once as having started, in the order save.ts keeps them. */
  private once(mark: Once): void {
    this.save.shown = ONCE.filter((known) => known === mark || this.save.shown.includes(known))
  }

  // --- Time ------------------------------------------------------------------------

  /** Advances the hall by `dt` seconds of attended time. A step of 0 plays nothing. */
  step(dt: number): void {
    if (!(dt > 0)) return
    this.t += dt
    this.chaseZip()
    this.walk(dt)
    if (this.scene) {
      this.scene.update(this.t)
      if (!this.scene.running) this.scene = null
    }
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i], piece = this.pieces[flight.garment], to = this.restPose(flight.garment)
      flight.t = Math.min(1, flight.t + dt / flight.lasts)
      const u = flight.t * flight.t * (3 - 2 * flight.t)
      piece.x = flight.fromX + (to.x - flight.fromX) * u
      piece.y = flight.fromY + (to.y - flight.fromY) * u - Math.sin(flight.t * Math.PI) * flight.arc
      piece.rot = flight.fromRot + (to.rot - flight.fromRot) * u
      piece.sep = flight.fromSep + (to.sep - flight.fromSep) * u
      if (flight.t >= 1) {
        this.flights.splice(i, 1)
        piece.mode = 'rest'
        this.play(flight.then, flight.garment, flight.who)
        this.landed(flight)
      }
    }
    this.runAnswers()
    for (const garment of GARMENTS) {
      const piece = this.pieces[garment]
      if (piece.mode === 'rest') {
        Object.assign(piece, this.restPose(garment))
        const mark = (this.before ?? this.save).marks[garment]
        if (mark !== piece.mark) {
          // Hung up wet or snowy, it shakes it off on its peg: when the hall is there to be seen, and not under the garden.
          const shakes = mark === 'dry' && this.whereShown(garment) === 'rack'
          if (shakes && this.flip === 0) {
            const box = paperBox(garment, piece, false)
            this.splashes.push({ x: (box.x0 + box.x1) / 2, y: box.y1 - 10, at: this.t, mark: piece.mark })
            this.sound(garment, say.shakeOff)
            piece.swing.kick(3)
          }
          if (!shakes || this.flip === 0) piece.mark = mark
        }
      } else if (piece.mode === 'held') {
        // In the hand a pair draws together and the paper hangs level.
        piece.rot += (0 - piece.rot) * Math.min(1, dt * 10)
        if (piece.sep > 0) piece.sep += (30 - piece.sep) * Math.min(1, dt * 10)
      }
      piece.swing.step(dt)
      piece.pop.step(dt)
      piece.sag.step(dt)
      piece.turn = Math.max(0, piece.turn - dt / 0.6)
      for (let i = 0; i < piece.fold.length; i++) {
        const to = i < piece.tabs ? 1 : 0
        piece.fold[i] += clamp(to - piece.fold[i], -dt / 0.08, dt / 0.08)
      }
    }
    for (const who of WEARERS) {
      const actor = this.actors[who], m = MANNERS[who]
      actor.squash.step(dt)
      actor.tilt.step(dt)
      actor.hop.step(dt)
      actor.bend.step(dt)
      if (actor.face !== 'rest' && this.t >= actor.faceUntil) actor.face = 'rest'
      const target = this.gazeOf(who), ease = Math.min(1, dt * m.eyeSpeed)
      actor.eyeX += (target.x - actor.eyeX) * ease
      actor.eyeY += (target.y - actor.eyeY) * ease
    }
    this.doorKnock.step(dt)
    this.vaneSwing.step(dt)
    // The cockerel goes on round, the way it always turns, to the heading of the weather that is saved.
    const heading = HEADING[this.save.weather]
    let gap = (heading - this.vaneTurn) % 1
    if (gap < 0) gap += 1
    if (gap < 1e-4 || gap > 1 - 1e-4) this.vaneTurn = heading
    else this.vaneTurn = (this.vaneTurn + Math.min(gap, dt * (0.5 + gap * 5))) % 1
    for (let i = 0; i < BUTTONS; i++) this.buttonShown[i] += clamp((this.save.buttons[i] ? 1 : 0) - this.buttonShown[i], -dt / 0.09, dt / 0.09)
    this.tugShown += clamp(this.save.tug - this.tugShown, -dt / 0.07, dt / 0.07)
    this.openShown += clamp((this.openSeen ? 1 : 0) - this.openShown, -dt / 0.1, dt / 0.1)
    if (!this.sitHeld) this.sit += clamp((this.save.finished ? 1 : 0) - this.sit, -dt / 0.35, dt / 0.35)
    while (this.splashes.length > 0 && this.t - this.splashes[0].at > SPLASH_SECONDS) this.splashes.shift()
    if (this.ripple && this.t - this.ripple.at > 0.4) this.ripple = null
  }

  /** A garment has touched down. On the dog it sets off a turn of the hall; the first on the one in the middle is the cause of the door's showing. */
  private landed(flight: Flight): void {
    if (flight.who === 'dog' && this.strut === null) this.strut = 0
    const where = this.save.where[flight.garment]
    if (flight.who === this.save.turn && where !== 'rack' && where.who === this.save.turn && !this.save.shown.includes('door') && !this.scene) this.showDoor()
  }

  /** The figures changing places and the dog's turn of the hall: where each has got to, its own gait, and a sound for each foot as it comes down. */
  private walk(dt: number): void {
    const swap = this.swap
    if (swap) {
      const before = swap.u
      swap.u = Math.min(1, swap.u + dt / SWAP_SECONDS)
      for (const who of FIGURES) {
        const actor = this.actors[who], from = standOf(who, swap.from), to = standOf(who, swap.to)
        if (from.x === to.x && from.y === to.y) continue
        const at = swapAt(who, swap.from, swap.to, swap.u), gait = gaitOf(who, swap.u)
        actor.x = at.x
        actor.y = at.y
        actor.walkHop = gait.hop
        actor.walkTilt = gait.tilt
        const steps = STEPS[who]
        for (let k = Math.floor(before * steps) + 1; k <= Math.floor(swap.u * steps) && k < steps; k++) this.sound('hall', say.footstep(who, k))
      }
      if (swap.u >= 1) {
        this.swap = null
        this.atRest()
      }
    }
    if (this.strut !== null) {
      const before = this.strut
      this.strut = Math.min(1, this.strut + dt / STRUT_SECONDS)
      const at = strutAt(this.strut), dog = this.actors.dog
      dog.x = at.x
      dog.y = at.y
      dog.facing = at.facing
      dog.walkHop = at.trot
      for (let k = Math.floor(before * PAWS) + 1; k <= Math.floor(this.strut * PAWS) && k < PAWS; k++) this.sound('hall', say.paw(k))
      if (this.strut >= 1) {
        this.strut = null
        dog.facing = 1
        dog.walkHop = 0
      }
    }
  }

  /** Everyone stands where the save has them, and nobody is walking. */
  private atRest(): void {
    const places = placesOf(this.save.turn)
    for (const who of WEARERS) {
      const actor = this.actors[who]
      if (who === 'dog' && this.strut !== null) continue
      actor.x = places[who].x
      actor.y = places[who].y
      actor.facing = 1
      actor.walkHop = 0
      actor.walkTilt = 0
    }
  }

  /**
   * Where a character's eyes want to point, as an offset no longer than 1: at the garment it is watching, at
   * the finger, and otherwise where its want is. The two who wait look out of the window, and turn to the one
   * in the middle when the ending has them look. The glance at the door is the view's, from motion.ts.
   */
  private gazeOf(who: Wearer): Point {
    const actor = this.actors[who]
    const eyeY = actor.y + BODIES[who].face.y
    let to: Point | null = null, reach = 1
    if (actor.lookAt && this.t < actor.lookUntil) to = this.pieces[actor.lookAt]
    else if (this.finger) to = this.finger
    else if (who !== 'dog' && who !== this.save.turn) {
      const middle = this.actors[this.save.turn]
      to = { x: WINDOW_EYE.x + (middle.x - WINDOW_EYE.x) * this.heads, y: WINDOW_EYE.y + (middle.y - 300 - WINDOW_EYE.y) * this.heads }
      reach = 0.8
    }
    if (!to) return { x: 0, y: 0 }
    const dx = to.x - actor.x, dy = to.y - eyeY, far = Math.hypot(dx, dy)
    if (far < 1) return { x: 0, y: 0 }
    const by = Math.min(1, far / 160) * reach
    return { x: (dx / far) * by * actor.facing, y: (dy / far) * by }
  }

  // --- Put away ------------------------------------------------------------------------

  /**
   * The game is put away, or parked. Everything that was only on its way arrives, unseen and unheard: the
   * touch is given up, a scene lands at its end, a garment in the air lies where it is saved, whoever was
   * walking stands in its place. What is left is exactly what a load of the save would show, and whatever was
   * still sounding is silenced.
   */
  putAway(): void {
    this.cancel()
    this.endScene()
    this.flights.length = 0
    this.playing.length = 0
    this.heard = [{ hush: 'all' }]
    this.swap = null
    this.strut = null
    this.before = null
    this.garden = null
    this.sitHeld = false
    this.atRest()
    for (const garment of GARMENTS) {
      const piece = this.pieces[garment]
      this.settle(garment)
      for (const spring of [piece.swing, piece.pop, piece.sag]) spring.x = spring.v = 0
      piece.turn = 0
      piece.lift = 0
      piece.offer = null
      piece.mark = this.save.marks[garment]
    }
    for (const who of WEARERS) {
      const actor = this.actors[who]
      for (const spring of [actor.squash, actor.tilt, actor.hop, actor.bend]) spring.x = spring.v = 0
      actor.face = 'rest'
      actor.faceUntil = 0
      actor.lookAt = null
      actor.lookUntil = 0
      actor.eyeX = 0
      actor.eyeY = 0
    }
    for (const spring of [this.doorKnock, this.vaneSwing]) spring.x = spring.v = 0
    this.zipShown = this.save.zip
    for (let i = 0; i < BUTTONS; i++) this.buttonShown[i] = this.save.buttons[i] ? 1 : 0
    this.tugShown = this.save.tug
    this.openShown = this.save.open ? 1 : 0
    this.sit = this.save.finished ? 1 : 0
    this.stretch = 0
    this.heads = 0
    this.doorOpen = 0
    this.flip = 0
    this.vaneSpin = 0
    this.vaneTurn = HEADING[this.save.weather]
    this.weatherAhead = 0
    this.rapper = null
    this.rapReach = 0
    this.rapBack = 0
    this.leadDown = 0
    this.splashes.length = 0
    this.ripple = null
  }

  /** Everything the view draws from, as plain values: what a test compares a parked hall and a loaded one by. */
  seen(): unknown {
    const spring = (s: Spring) => [s.x, s.v]
    return {
      pieces: GARMENTS.map((garment) => {
        const p = this.pieces[garment]
        return [garment, this.whereShown(garment), p.x, p.y, p.rot, p.sep, p.mode, p.tabs, [...p.fold], spring(p.swing), spring(p.pop), spring(p.sag), p.turn, p.lift, p.offer, p.mark]
      }),
      actors: WEARERS.map((who) => {
        const a = this.actors[who]
        return [who, a.x, a.y, a.facing, a.walkHop, a.walkTilt, spring(a.squash), spring(a.tilt), spring(a.hop), spring(a.bend), a.face, a.lookAt, a.eyeX, a.eyeY]
      }),
      fastenings: [this.zipShown, [...this.buttonShown], this.tugShown, this.openShown, this.openSeen],
      middle: [this.sit, this.stretch, this.heads],
      door: [this.doorOpen, spring(this.doorKnock), this.leadDown],
      outside: [this.flip, this.garden, this.weatherShown, this.vaneSpin, this.vaneTurn, spring(this.vaneSwing)],
      rap: [this.rapper, this.rapReach, this.rapBack],
      small: [[...this.splashes], this.ripple, this.finger],
      under: [this.busy, this.hints()],
    }
  }

  // --- The idle ladder's part ---------------------------------------------------------

  /**
   * The moves a child could make now, the most wanted first, each chosen from what is on screen. The ladder
   * shows one at a time. None is an answer to anything: each shows how a thing here is worked.
   */
  hints(): Hint[] {
    const save = this.save, hints: Hint[] = []
    const middleOf = (box: Box): Point => ({ x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 })
    const tapAt = (at: Point): Hint => ({ move: 'tap', glow: [], spot: true, from: at, to: at })
    const onRack = GARMENTS.filter((garment) => save.where[garment] === 'rack')
    const onMiddle = this.wornBy(save.turn)
    const dress = (): void => {
      if (onRack.length === 0) return
      const first = onRack[0]
      const there = poseOf(first, ownSpot(first, save.turn), this.stands(), false, this.clear)
      hints.push({ move: 'carry', glow: onRack, spot: false, from: middleOf(paperBox(first, ON_RACK[first], false)), to: middleOf(paperBox(first, there, false)) })
    }
    const door = (): void => { hints.push(tapAt(HANDLE)) }
    if (save.finished) {
      // The cycle is over: one who waits can be asked to the middle.
      const next = FIGURES.find((figure) => figure !== save.turn && standOf(figure, save.turn).x > 300) ?? save.turn
      const actor = this.actors[next]
      hints.push(tapAt({ x: actor.x, y: actor.y + (BODIES[next].aim.body?.y ?? -100) }))
      dress()
      return hints
    }
    if (save.back && onMiddle.length > 0) {
      // Home again: what it came home in can be hung up.
      const top = onMiddle[onMiddle.length - 1], piece = this.pieces[top]
      hints.push({ move: 'carry', glow: [], spot: false, from: middleOf(paperBox(top, piece, top === 'umbrella' && save.open)), to: middleOf(paperBox(top, ON_RACK[top], false)) })
      door()
      hints.push(tapAt(VANE))
      return hints
    }
    const coat = save.where.raincoat
    if (coat !== 'rack' && save.zip < ZIP_TEETH && this.actors[coat.who].facing === 1) {
      const piece = this.pieces.raincoat
      hints.push({ move: 'carry', glow: [], spot: true, from: fromPaper(piece, sliderAt(save.zip).x, sliderAt(save.zip).y), to: fromPaper(piece, sliderAt(ZIP_TEETH).x, sliderAt(ZIP_TEETH).y) })
    }
    if (onMiddle.length > 0) {
      door()
      dress()
    } else {
      dress()
      door()
    }
    return hints
  }
}

/** Seconds a splash of drops or flakes is seen. */
export const SPLASH_SECONDS = 0.7
/** Footfalls in one change of places, for each figure: a sound for each (walks.ts gives the gait they come from). */
const STEPS: Record<Figure, number> = { child: 6, grandfather: 5, baby: 7 }
/** Paws down in the dog's turn of the hall. */
const PAWS = 14

/** The door and the window, for the eyes that go to them. */
export const DOOR_EYE: Point = { x: (DOOR.x0 + DOOR.x1) / 2, y: (DOOR.y0 + DOOR.y1) / 2 }
export const WINDOW_EYE: Point = { x: (WINDOW.x0 + WINDOW.x1) / 2, y: (WINDOW.y0 + WINDOW.y1) / 2 }
