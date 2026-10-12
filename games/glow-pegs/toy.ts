import { BEAT, beat, enter, fullBeam, type Beam, type BeatOutcome } from './beam'
import { BLUE, BOARD, COLS, GREEN, HOLES, ORIGIN, PITCH, RED, ROWS, WHITE, YELLOW, centreOf, colOf, echoes, holeAt, holeUnder, holesAlong, rowOf, stepOf, type Colour, type Mirror } from './board'
import { fallBeats, fallLength, knockCue, type Faller } from './fallers'
import { DEMO_SECONDS, IDLE_BEFORE_DEMO, MAX_DEMOS } from './guidance'
import { GECKO, HANDLE, LEVER, RIDE_Y, spiderAt, whatIsAt, type Places } from './layout'
import { Actor, GECKO_ACTS, GECKO_IDLE, GECKO_TASTE, SPIDER_ACTS, SPIDER_IDLE, SPIDER_TASTE, geckoPose, spiderPose, type GeckoAct, type GeckoPose, type SpiderAct, type SpiderPose } from './motion'
import { Moth } from './moth'
import { makeRng } from './rng'
import type { Save } from './save'
import { Scene, type Beat as SceneBeat } from './scene'
import { STATE_VERSION } from './state'
import type { Cue } from './voices'

// The game: a peg board of light, the tray's wells and its handle, the three
// mirror buttons, the lever and its beam, the moth and the two watchers, and
// the two scenes. Pure rules on one clock, with no drawing and no sound of
// its own: it queues cues (voices.ts) on the frame in which the thing they
// belong to is seen to happen, and the Mount plays them.
//
// `board` is the truth and is what a save holds: a push is in it the moment
// the finger lands, its echoes with it. `shown` is what is seen: an echo
// appears a little after its push, with its own click, so a save taken in
// between loses nothing. The beam reads `shown`: it plays what is seen.

/** The time between a push and each of its echoes, in seconds. */
export const ECHO_GAP = 0.07
/** A white peg hangs dark for this long before its light and its bell. */
export const WHITE_BREATH = 0.18
/** A new peg is drawn live, springing, for this long, and then stands still. */
export const LIVE_FOR = 0.7
/** No more pegs than this spring at once: a long drag settles its oldest early. */
export const MOST_LIVE = 10
/** No more pulled and knocked pegs than this are in the air at once: a scribble over a full board sends its oldest on to its well. */
export const MOST_FALLERS = 8
/** A bloom's light is drawn for this long after a peg appears, and no more than this many blooms at once. */
export const BLOOM_FOR = 1.2
export const MOST_BLOOMS = 8
/** A finger that travels less than this along the lever's slot from where it landed is tapping it, however far it slides sideways. */
export const LEVER_TAP = 30
/** A pull that has the knob this share of the slot, or more, away from the end it was at when the finger lifts sends the lever to its other end. */
export const LEVER_PULL = 0.25
/** The handle's rattle is seen: the handle and its ball swing this far to each side, in stage units, for this long, in seconds. */
export const HANDLE_RATTLE = { far: 20, lasts: 1 } as const
/**
 * With no touch for this long after a touch, and pegs on the board, the tray's handle rattles once by itself:
 * as long as the idle ladder takes to reach the end of its last demonstration.
 */
export const HINT_AFTER = (() => {
  let start = IDLE_BEFORE_DEMO, gap = IDLE_BEFORE_DEMO * 2, end = 0
  for (let i = 0; i < MAX_DEMOS; i++) {
    end = start + DEMO_SECONDS
    start += DEMO_SECONDS + gap
    gap *= 2
  }
  return end
})()
/** How far the gecko's head leans towards the warm pegs, at most, in stage units. */
export const NECK_REACH = 15
/** A tapped well's whole pile rattles for this long. */
export const PILE_RATTLE = 0.35
/** How long a peg stays bright after the beam met it. Blue stays lit for four beats, white for the beat it holds the beam. */
export const FLASH_FOR: Record<Colour, number> = { [RED]: 0.26, [BLUE]: BEAT * 4, [YELLOW]: BEAT * 0.95, [GREEN]: 0.34, [WHITE]: BEAT * 2 }
/** The clatter: the first column lets go this long after the handle's clunk, and each next one this long after the last. */
export const CLATTER = { first: 0.35, gap: 0.3, tail: 1.75 } as const
/** The trapped beam's scene lasts this long. */
export const TRAPPED_FOR = 6

export type LivePeg = { hole: number; colour: Colour; age: number; held: boolean; since: number; from: number; lit: boolean }
export type Bloom = { hole: number; colour: Colour; age: number; closing: boolean }
export type Flash = { hole: number; colour: Colour; age: number; half: boolean }
type Pending = { hole: number; at: number; colour: Colour | 0; n: number }
type Stroke = { kind: 'place' | 'pull' | 'bare' | 'well' | 'lever' | 'handle' | 'other'; x: number; y: number; held: number; fromX: number; fromY: number; far: number; knobFrom: number }

/** How large a springing peg is drawn, 1 being its size at rest: pressed small under the finger, past its size on the lift, then settled. */
export function liveScale(peg: LivePeg): number {
  if (peg.held) return 0.86 - 0.3 * Math.exp(-40 * peg.age)
  // From the size it was let go at, up past 1 within a tenth of a second, and a small wobble down to 1.
  const s = peg.since
  return 1 + 0.24 * Math.exp(-7 * s) * Math.sin(16 * s) - (1 - peg.from) * Math.exp(-30 * s)
}

/** How far the rattled handle and its ball have swung to one side, in stage units, this long after the rattle began. */
export function handleSwing(age: number): number {
  if (age < 0 || age >= HANDLE_RATTLE.lasts) return 0
  return HANDLE_RATTLE.far * Math.sin(age * 31) * (1 - age / HANDLE_RATTLE.lasts)
}

/** How bright the glint on the rattled ball is, 0 to 1: it flares as the rattle begins and flickers out with it. */
export function handleGlint(age: number): number {
  if (age < 0 || age >= HANDLE_RATTLE.lasts) return 0
  return (1 - age / HANDLE_RATTLE.lasts) * (0.6 + 0.4 * Math.cos(age * 22))
}

/** The middle of a column of the board, where a beam on it stands. */
export function columnX(col: number): number {
  return ORIGIN.x + col * PITCH
}

export class Toy {
  readonly board: number[]
  readonly shown: number[]
  hand: Colour
  mirror: Mirror
  readonly moth: Moth
  readonly spider: Actor<SpiderAct>
  readonly gecko: Actor<GeckoAct>
  readonly live: LivePeg[] = []
  readonly fallers: Faller[] = []
  /** The light running out from each new peg, by its colour's own bloom, and closing in behind a pulled one. */
  readonly blooms: Bloom[] = []
  readonly sparks: { x: number; y: number; age: number }[] = []
  /** Holes whose still picture is out of date. The view redraws them and empties the list. */
  readonly changed: number[] = []
  /** What is to be heard, in order. The Mount plays them and empties the list. */
  readonly sounds: Cue[] = []
  /** Something a save holds has changed. The Mount hands it to storage and sets this back. */
  dirty = false
  /** The change is a scene's outcome: it is saved at once, not at the throttle. */
  saveNow = false
  /** A touch has ended a scene: whatever of it is still sounding is shut off now. The Mount does it and sets this back. */
  hush = false
  time = 0
  /** Where the finger is while it is down. */
  readonly look = { x: 590, y: 330 }
  finger = false
  /** Seconds since each well last took a peg or a tap, since the bezel was kicked, since anything sounded. */
  readonly wellAge: number[] = [9, 9, 9, 9, 9, 9]
  kickAge = 9
  pulseAge = 9
  /** Seconds since the key that is down was pressed, and since each well's pile was last rattled by a tap. */
  buttonAge = 9
  readonly pileAge: number[] = [9, 9, 9, 9, 9, 9]
  /** The lever: down while the show runs. Never saved: a put-away lifts it. */
  leverDown = false
  leverAge = 9
  /** Where the knob is in its slot, 0 up to 1 down, and whether a finger has hold of it. */
  knob = 0
  leverHeld = false
  /**
   * Seconds since the last touch, or null while no touch has earned the ending's hint: before the first touch of
   * an opening, after a put-away, and once the hint has been given. Never saved: a game that is opened waits for a touch.
   */
  untouched: number | null = null
  /** How far the gecko's head leans towards the warm pegs: stage units across and up. */
  readonly neck = { x: 0, y: 0 }
  readonly beams: Beam[] = []
  /** Pegs the beam has just met, each bright in its colour's way. */
  readonly flashes: Flash[] = []
  /** The tray handle: how far the finger has pulled it, and the seconds since it was last rattled or let go. Every rattle is seen: `handleSwing`. */
  handlePull = 0
  handleAge = 9
  /** The scene that is playing, if one is. */
  playing: 'clatter' | 'trapped' | null = null
  /** The marquee's bulbs chase the beam: the trapped beam's scene is on. */
  chase = false
  /** Seconds since a dropped peg last landed: the spider on its thread is shaken by it. */
  joltAge = 9
  private scene: Scene | null = null
  private trappedThisPull = false
  private beatClock = 0
  /** Where the knob is going: its end, or the finger that drags it. */
  private knobTo = 0
  /** The beam took a step in this call of `step`. */
  private stepped = false
  private readonly pending: Pending[] = []
  private stroke: Stroke | null = null
  /** Where this call's sounds begin in `sounds`: the same sound asked for twice in one call is one cue. */
  private batch = 0
  private readonly spiderNow: SpiderPose = { drop: 0, swing: 0, squash: 0, eyeSpread: 0, lids: 0, cover: 0, feet: [0, 0, 0, 0], shake: 0, strand: 0 }
  private readonly geckoNow: GeckoPose = { slide: 0, tremble: 0, tongue: 0, curl: 0, wag: 0, belly: 0, lids: [0, 0], pupil: 1, mouth: 0, slip: 0, rolling: 0, roll: 0, cross: 0, nod: 0 }

  constructor(save: Save, seed: number) {
    this.board = save.board.slice()
    this.shown = save.board.slice()
    this.hand = save.hand
    this.mirror = save.mirror
    this.moth = new Moth(save.moth)
    const spiderChance = makeRng(seed + 1), geckoChance = makeRng(seed + 2)
    this.spider = new Actor(SPIDER_ACTS, SPIDER_IDLE, () => spiderChance.next())
    this.gecko = new Actor(GECKO_ACTS, GECKO_IDLE, () => geckoChance.next())
    // The gecko's head is already where it leans: nothing eases in on load.
    const warm = this.warmth()
    this.neck.x = warm.x
    this.neck.y = warm.y
  }

  /** The state as a save holds it. The board is the truth, so nothing here is in the air. */
  toSave(): Save {
    return { v: STATE_VERSION, position: 'open', finished: false, board: this.board.slice(), hand: this.hand, mirror: this.mirror, moth: this.moth.perch }
  }

  /** The poses of the two watchers now, which the view draws and a touch is measured against. */
  spiderPose(): SpiderPose {
    return spiderPose(this.spider.act, this.spider.t, this.spiderNow)
  }
  geckoPose(): GeckoPose {
    return geckoPose(this.gecko.act, this.gecko.t, this.geckoNow)
  }

  /** Where the things that move are now: each is touched where it is drawn. */
  places(): Places {
    const spider = this.spiderPose()
    return { moth: this.moth.resting ? { x: this.moth.x, y: this.moth.y } : null, spider: spiderAt(spider.drop, spider.swing), geckoSlide: this.geckoPose().slide }
  }

  /** Where the watchers look: at the finger while it is down, at the beam while it runs, and at the moth otherwise. */
  gaze(): { x: number; y: number } {
    if (this.finger) return this.look
    const beam = fullBeam(this.beams)
    if (beam) return { x: columnX(beam.col), y: BOARD.y + BOARD.height / 2 }
    return this.moth
  }

  /** A show or a scene is on: the child is watching what the game does, which is not idleness. */
  get busy(): boolean {
    return this.playing !== null || (this.leverDown && this.shown.some((cell) => cell !== 0))
  }

  /** The finger landed at a point of the stage. A scene that is playing ends first; then whatever is there answers in this call. */
  press(x: number, y: number): void {
    this.batch = this.sounds.length
    this.endScene()
    this.look.x = x
    this.look.y = y
    this.finger = true
    const target = whatIsAt(x, y, this.places())
    this.untouched = 0
    this.stroke = { kind: 'other', x, y, held: -1, fromX: x, fromY: y, far: 0, knobFrom: this.knob }
    switch (target.kind) {
      case 'hole':
        if (this.board[target.hole] === this.hand) {
          // A stroke that starts on a peg of the colour in hand pulls pegs of that colour, and no others.
          this.stroke.kind = 'pull'
          this.pull(target.hole)
        } else {
          this.stroke.kind = 'place'
          this.push(target.hole)
          const peg = this.live.find((live) => live.hole === target.hole)
          if (peg) {
            peg.held = true
            this.stroke.held = target.hole
          }
        }
        break
      case 'well':
        // A finger that goes on from the pile onto the board carries the colour there: the stroke lays pegs from where it comes on.
        this.stroke.kind = 'well'
        this.hand = target.colour
        this.wellAge[target.colour] = 0
        this.pileAge[target.colour] = 0
        this.dirty = true
        this.cue({ name: 'well', colour: target.colour })
        break
      case 'button':
        // The key lights whole and at once, with one sound of its own kind.
        this.mirror = target.mirror
        this.buttonAge = 0
        this.dirty = true
        this.cue({ name: 'button', n: target.mirror })
        break
      case 'lever':
        // The finger has hold of the knob where the knob is, whatever part of the plate it pressed. The knob moves
        // when the finger does, by as much, and the lever is switched when the finger lifts: never on the press.
        this.stroke.kind = 'lever'
        this.leverHeld = true
        this.knobTo = this.knob
        this.cue({ name: 'grip' })
        break
      case 'handle':
        this.stroke.kind = 'handle'
        this.handleAge = 0
        this.cue({ name: 'rattle' })
        break
      case 'moth':
        this.cues(this.moth.tumble())
        break
      case 'spider':
        this.cues(this.spider.begin('yoyo'))
        break
      case 'gecko':
        this.cues(this.gecko.begin('chirp'))
        break
      case 'speaker':
        this.cue({ name: 'thump' })
        break
      case 'bare':
        this.stroke.kind = 'bare'
        this.sparks.push({ x, y, age: 0 })
        this.cue({ name: 'pluck', n: Math.max(0, Math.min(10, Math.floor(x / 118))) })
        break
    }
  }

  /** The finger moved while down. A stroke that began on the board, or on bare backdrop, leaves a line; the lever follows the finger; the handle is pulled. */
  dragMove(x: number, y: number): void {
    this.batch = this.sounds.length
    const stroke = this.stroke
    this.look.x = x
    this.look.y = y
    if (!stroke) return
    if (stroke.kind === 'lever') {
      // The lever reads only the travel along its slot: a slide sideways counts for nothing.
      stroke.far = Math.max(stroke.far, Math.abs(y - stroke.fromY))
      // The knob moves with the finger from where it was taken, from the first unit, and never leaps to it. Nothing is switched until the finger lifts.
      this.knobTo = Math.min(1, Math.max(0, stroke.knobFrom + (y - stroke.fromY) / (LEVER.bottom - LEVER.top)))
      this.knob = this.knobTo
      return
    }
    if (stroke.kind === 'handle') {
      this.handlePull = Math.max(0, Math.min(HANDLE.stop, y - stroke.fromY))
      if (this.handlePull >= HANDLE.stop) this.startClatter()
      return
    }
    // The peg under the finger is let go when the finger leaves its hole.
    if (stroke.held >= 0 && holeUnder(x, y) !== stroke.held) this.letGo()
    if ((stroke.kind === 'bare' || stroke.kind === 'well') && holeUnder(x, y) >= 0) stroke.kind = 'place'
    if (stroke.kind === 'place' || stroke.kind === 'pull') {
      // The line goes on under the moth: only a touch that lands on it is a tap on the moth.
      for (const hole of holesAlong(stroke.x, stroke.y, x, y)) {
        if (stroke.kind === 'place') this.push(hole)
        else this.pull(hole)
      }
    }
    stroke.x = x
    stroke.y = y
  }

  /**
   * The finger moved, however little: the Mount passes every move of the working finger, the ones inside a
   * tap's slack too. Only the lever's knob reads it, so the knob is under the finger from the first unit.
   */
  follow(x: number, y: number): void {
    if (this.stroke?.kind === 'lever') this.dragMove(x, y)
  }

  /**
   * The finger lifted. Every peg it placed stays: each was an act already made. The lever is the one thing a
   * lift moves. A tap sends it to its other end, and so does a pull that has the knob a quarter of the slot or
   * more from the end it was at: the knob falls the rest of the way, with the one clunk. A shorter pull springs
   * back with the knob's creak, and the lever stays as it was. One gesture is at most one move and one clunk.
   */
  release(): void {
    this.batch = this.sounds.length
    const stroke = this.stroke
    if (stroke?.kind === 'lever') {
      const pulled = Math.abs(this.knobTo - (this.leverDown ? 1 : 0))
      if (stroke.far < LEVER_TAP || pulled >= LEVER_PULL) this.setLever(!this.leverDown, true)
      // Let go part of the way, the knob springs back, and is heard to. One the finger carried back to its end has nothing left to do.
      else if (pulled > 0) this.cue({ name: 'grip' })
    }
    this.end()
  }

  /** The touch was taken away. It ends without a move of the child's: the lever stays at the end it was at. */
  cancel(): void {
    this.batch = this.sounds.length
    this.end()
  }

  private end(): void {
    this.letGo()
    // A handle let go part of the way down swings back; one that was only tapped is already rattling.
    if (this.stroke?.kind === 'handle' && this.handlePull > 0) this.handleAge = 0
    this.handlePull = 0
    this.leverHeld = false
    this.knobTo = this.leverDown ? 1 : 0
    this.stroke = null
    this.finger = false
  }

  private letGo(): void {
    const stroke = this.stroke
    if (!stroke || stroke.held < 0) return
    const peg = this.live.find((live) => live.hole === stroke.held)
    if (peg) {
      peg.from = liveScale(peg)
      peg.held = false
      peg.since = 0
      peg.age = Math.min(peg.age, LIVE_FOR - 0.5)
    }
    stroke.held = -1
  }

  /** A peg of the colour in hand goes into the hole and into each echo of it that does not hold that colour already. */
  private push(lead: number): void {
    let n = 0, first = -1
    for (const hole of echoes(lead, this.mirror)) {
      if (this.board[hole] === this.hand) continue
      this.board[hole] = this.hand
      this.due(hole, this.time + n * ECHO_GAP, this.hand, n)
      if (first < 0) first = hole
      n += 1
    }
    if (first < 0) return
    this.dirty = true
    // The moth goes to the newest light. Sitting beside the very hole that is swapped, it is blown off instead.
    if (this.moth.perch === first && this.moth.mode !== 'fly' && this.shown[first] !== 0) this.cues(this.moth.tumble())
    else this.moth.flyTo(first, this.hand)
    this.taste(this.hand)
    this.flush()
  }

  /** A peg of the colour in hand comes out of the hole, and out of each echo of it. A peg of another colour stays. */
  private pull(lead: number): void {
    let n = 0
    for (const hole of echoes(lead, this.mirror)) {
      if (this.board[hole] !== this.hand) continue
      this.board[hole] = 0
      this.due(hole, this.time + n * ECHO_GAP, 0, n)
      // Its light is gone: the moth droops and then flies home to its bulb.
      if (this.moth.perch === hole) this.moth.droopHome()
      n += 1
    }
    if (n === 0) return
    this.dirty = true
    this.flush()
  }

  /** A hole is to show something new at a time. Whatever it was still waiting to show is forgotten: the newest move on a hole is the one that is seen. */
  private due(hole: number, at: number, colour: Colour | 0, n: number): void {
    const waiting = this.pending.findIndex((due) => due.hole === hole)
    if (waiting >= 0) this.pending.splice(waiting, 1)
    this.pending.push({ hole, at, colour, n })
  }

  /** Each watcher answers a new peg by its colour. One in the middle of the same answer, or of being poked, carries on. */
  private taste(colour: Colour): void {
    const spider = SPIDER_TASTE[colour], gecko = GECKO_TASTE[colour]
    if (this.spider.act !== 'yoyo' && this.spider.act !== spider) this.cues(this.spider.begin(spider))
    if (this.gecko.act !== 'chirp' && this.gecko.act !== gecko) this.cues(this.gecko.begin(gecko))
  }

  /** What was pushed or pulled and is due is now seen and heard. With `quiet`, all of it at once and in silence. */
  private flush(quiet = false): void {
    for (let i = 0; i < this.pending.length; ) {
      const due = this.pending[i]
      if (!quiet && due.at > this.time) { i += 1; continue }
      this.pending.splice(i, 1)
      if (quiet) {
        if (this.shown[due.hole] !== due.colour) this.changed.push(due.hole)
        this.shown[due.hole] = due.colour
      } else this.appear(due)
    }
  }

  private appear(due: Pending): void {
    const hole = due.hole, old = this.shown[hole] as Colour | 0
    if (old === due.colour) return
    const at = centreOf(hole)
    const springing = this.live.findIndex((live) => live.hole === hole)
    if (springing >= 0) this.live.splice(springing, 1)
    if (old !== 0) {
      const knocked = due.colour !== 0
      this.fallers.push({ colour: old, kind: knocked ? 'knocked' : 'pulled', t: 0, x: at.x, y: at.y })
      // Too many in the air: the oldest are at their wells in the frame that follows, and land there with their knock.
      const loose = this.fallers.filter((faller) => faller.kind === 'pulled' || faller.kind === 'knocked')
      for (let i = 0; i < loose.length - MOST_FALLERS; i++) loose[i].t = Math.max(loose[i].t, fallLength(loose[i]) - 1e-6)
      const cue: Cue | null = knocked ? knockCue(old) : { name: 'pull', colour: old, steps: [stepOf(hole)] }
      if (cue) this.cue(cue)
      // A pulled blue or yellow peg's rings close in behind it.
      if (!knocked && (old === BLUE || old === YELLOW)) this.bloom(hole, old, true)
    }
    this.shown[hole] = due.colour
    this.changed.push(hole)
    if (due.colour === 0) return
    // A green peg that goes in is obeyed from that moment: a beam or a half beam that was passing green pegs is turned by them again,
    // so a green pushed in behind a beam with another ahead of it traps it on whichever time across it is.
    if (due.colour === GREEN) for (const beam of this.beams) if (beam.shut < 0) beam.open = false
    this.live.push({ hole, colour: due.colour, age: 0, held: false, since: 0, from: 0.72, lit: due.colour !== WHITE })
    if (this.live.length > MOST_LIVE) {
      const oldest = this.live.findIndex((live) => !live.held)
      if (oldest >= 0) {
        const settled = this.live.splice(oldest, 1)[0]
        this.changed.push(settled.hole)
        // A white peg settled before its breath was out lights now, so its bell sounds now.
        if (!settled.lit) this.cue({ name: 'bell', steps: [stepOf(settled.hole)] })
      }
    }
    this.bloom(hole, due.colour, false)
    // An echo sounds a step higher than the one before it.
    this.cue({ name: 'click', colour: due.colour, steps: [stepOf(hole) + due.n] })
    if (due.colour === RED) this.kickAge = 0
  }

  private bloom(hole: number, colour: Colour, closing: boolean): void {
    this.blooms.push({ hole, colour, age: 0, closing })
    if (this.blooms.length > MOST_BLOOMS) this.blooms.shift()
  }

  // --- The lever and its beam --------------------------------------------------

  /** The lever goes down, and a beam comes in at the left edge on this very beat; or it lifts, and every beam is out at once. */
  private setLever(down: boolean, heard: boolean, scene = false): void {
    if (down === this.leverDown) return
    this.leverDown = down
    this.knobTo = down ? 1 : 0
    this.leverAge = 0
    if (heard) this.cue({ name: 'lever', n: down ? 1 : 0, ...(scene ? { scene: true } : {}) })
    if (down) {
      this.trappedThisPull = false
      this.beatClock = 0
      this.meet(enter(this.beams, this.shown))
    } else {
      this.beams.length = 0
      this.flashes.length = 0
      // The moth is back beside its hole when the lever lifts.
      this.moth.comeBack()
    }
  }

  /**
   * What a beat did is seen and heard: each peg it met flashes and sounds, and the moth goes after the newest
   * flash. One sound a colour: pegs of one colour met on one beat by the beam and by a half beam are one cue,
   * at the half strength only when no full beam met any of them.
   */
  private meet(outcome: BeatOutcome): void {
    let newest = -1
    if (outcome.stepped) this.stepped = true
    const full = new Set<Colour>()
    for (const hit of outcome.hits) if (!hit.half) full.add(hit.colour)
    for (const hit of outcome.hits) {
      const old = this.flashes.findIndex((flash) => flash.hole === hit.hole)
      if (old >= 0) this.flashes.splice(old, 1)
      this.flashes.push({ hole: hit.hole, colour: hit.colour, age: 0, half: hit.half })
      this.cue({ name: 'beam', colour: hit.colour, steps: [stepOf(hit.hole)], n: full.has(hit.colour) ? 0 : 1 })
      if (hit.colour === RED && !hit.half) this.kickAge = 0
      if (!hit.half && newest < 0) newest = hit.hole
    }
    // The moth chases the beam's newest flash, unless a scene has it: riding the trapped beam, or falling with the pegs.
    if (newest >= 0 && this.playing === null && this.moth.act !== 'tumble') this.moth.chase(newest)
    if (outcome.trapped && !this.trappedThisPull && this.playing === null) this.startTrapped()
  }

  // --- The two scenes ----------------------------------------------------------

  /** A scene that is playing ends now, every beat left at its end, in silence: a touch, or a put-away. */
  private endScene(): void {
    if (!this.scene?.running) return
    this.scene.finish()
    this.afterScene()
    this.hush = true
  }

  private afterScene(): void {
    this.scene = null
    this.playing = null
    this.chase = false
  }

  /**
   * The clatter: the tray handle is at its stop, and every peg drops. What it saves when it starts is the whole
   * of its outcome: an empty board, and the moth at its bulb. The screen gets there column by column.
   */
  private startClatter(): void {
    // The finger that pulled the handle is let go first, or its next move would be the touch that ends the scene.
    this.stroke = null
    this.finger = false
    this.handlePull = 0
    this.handleAge = 0
    this.leverHeld = false
    this.endScene()
    // Echoes still on their way are seen at once, so that what drops is what was built.
    this.flush(true)
    const columns: number[] = []
    for (let col = 0; col < COLS; col++) if (this.board.some((cell, hole) => cell !== 0 && colOf(hole) === col)) columns.push(col)
    const last = columns[columns.length - 1]
    const caught = columns.length > 0 ? holeAt(last, Array.from({ length: ROWS }, (_, row) => row).find((row) => this.board[holeAt(last, row)] !== 0)!) : -1
    const beats: SceneBeat[] = [
      { at: 0, lasts: 0, play: (_, finishing) => { if (!finishing) this.cue({ name: 'clunk', scene: true }) } },
      // A lever that was down lifts by itself at the handle's clunk, with its own, so no bar sweeps the emptying board.
      { at: 0, lasts: 0, play: (_, finishing) => this.setLever(false, !finishing, true) },
      { at: 0.15, lasts: 0, play: (_, finishing) => { if (!finishing) this.cues(this.spider.begin('ride')) } },
      ...columns.map((col, i): SceneBeat => ({ at: CLATTER.first + i * CLATTER.gap, lasts: 0, play: (_, finishing) => this.dropColumn(col, caught, finishing) })),
      // The moth is caught in the fall as the first column goes.
      { at: CLATTER.first, lasts: 0, play: (_, finishing) => { if (!finishing && columns.length > 0) this.cues(this.moth.leaf()) } },
      // The last pegs land, and the board is dark. Ended by a touch, whatever is still in the air is in its well at once, without its sound.
      {
        at: CLATTER.first + Math.max(0, columns.length - 1) * CLATTER.gap, lasts: CLATTER.tail,
        play: (progress, finishing) => {
          if (progress < 1) return
          if (!finishing) return
          for (let i = this.fallers.length - 1; i >= 0; i--) if (this.fallers[i].kind === 'dropped' || this.fallers[i].kind === 'caught') this.fallers.splice(i, 1)
          this.spider.rest()
          this.gecko.rest()
          this.moth.settle()
        },
      },
    ]
    this.scene = new Scene(beats)
    this.playing = 'clatter'
    this.scene.start(this.time, () => {
      this.board.fill(0)
      if (columns.length > 0) this.moth.unperch()
      else if (this.moth.perch !== null) this.moth.flyTo(null, null)
      this.dirty = true
      this.saveNow = true
    })
    this.scene.update(this.time)
  }

  /** One column lets go. Red is the first of its column; the rest follow a moment apart, top to bottom. */
  private dropColumn(col: number, caught: number, finishing: boolean): void {
    let rank = 0
    for (let row = 0; row < ROWS; row++) {
      const hole = holeAt(col, row), colour = this.shown[hole] as Colour | 0
      if (colour === 0) continue
      this.shown[hole] = 0
      this.changed.push(hole)
      const springing = this.live.findIndex((live) => live.hole === hole)
      if (springing >= 0) this.live.splice(springing, 1)
      if (finishing) continue
      const at = centreOf(hole)
      if (hole === caught) {
        this.fallers.push({ colour, kind: 'caught', t: 0, x: at.x, y: at.y })
        this.cues(this.gecko.begin('flick'))
      } else {
        this.fallers.push({ colour, kind: 'dropped', t: colour === RED ? 0 : -0.04 * (rank += 1), x: at.x, y: at.y })
      }
    }
  }

  /** The trapped beam: the cabinet joins in for a while, and the show goes on underneath as built. It saves nothing. */
  private startTrapped(): void {
    this.trappedThisPull = true
    const beats: SceneBeat[] = [
      {
        at: 0, lasts: 0,
        play: (_, finishing) => {
          if (finishing) return
          this.cue({ name: 'trap', scene: true })
          this.cues(this.spider.begin('conduct'))
          this.cues(this.gecko.begin('roll'))
          this.chase = true
        },
      },
      {
        at: 0, lasts: TRAPPED_FOR,
        play: (progress, finishing) => {
          if (progress < 1) return
          // The watchers go back to watching, and the moth to chasing flashes.
          this.chase = false
          if (finishing) {
            this.spider.rest()
            this.gecko.rest()
          }
          this.moth.comeBack()
        },
      },
    ]
    this.scene = new Scene(beats)
    this.playing = 'trapped'
    this.scene.start(this.time, () => {})
    this.scene.update(this.time)
  }

  // --- Time ----------------------------------------------------------------------

  /** Plays `dt` seconds. */
  step(dt: number): void {
    if (dt <= 0) return
    this.batch = this.sounds.length
    this.stepped = false
    this.time += dt
    this.kickAge += dt
    this.pulseAge += dt
    this.buttonAge += dt
    this.leverAge += dt
    this.handleAge += dt
    this.joltAge += dt
    for (let i = 1; i < this.wellAge.length; i++) {
      this.wellAge[i] += dt
      this.pileAge[i] += dt
    }
    // The knob follows its end, or the finger that drags it, and the gecko's head leans towards the warm pegs.
    this.knob = this.leverHeld ? this.knobTo : this.knob + (this.knobTo - this.knob) * (1 - Math.exp(-dt * 26))
    // The ending's hint: after a touch, a whole stretch with no touch, whether the lever is up or the tune is playing.
    if (this.untouched !== null) {
      this.untouched = this.finger ? 0 : this.untouched + dt
      if (this.untouched >= HINT_AFTER) {
        this.untouched = null
        this.nudge()
      }
    }
    const warm = this.warmth(), lean = 1 - Math.exp(-dt * 5)
    this.neck.x += (warm.x - this.neck.x) * lean
    this.neck.y += (warm.y - this.neck.y) * lean
    if (this.scene) {
      this.scene.update(this.time)
      if (!this.scene.running) this.afterScene()
    }
    this.flush()
    if (this.leverDown) {
      this.beatClock += dt
      while (this.beatClock >= BEAT) {
        this.beatClock -= BEAT
        this.meet(beat(this.beams, this.shown))
      }
    }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const peg = this.live[i]
      peg.age += dt
      peg.since += dt
      // A white peg's light comes a breath after its click, with its bell.
      if (!peg.lit && peg.age >= WHITE_BREATH) {
        peg.lit = true
        this.cue({ name: 'bell', steps: [stepOf(peg.hole)] })
      }
      if (peg.age >= LIVE_FOR && !peg.held && peg.lit) {
        this.live.splice(i, 1)
        this.changed.push(peg.hole)
      }
    }
    for (let i = this.fallers.length - 1; i >= 0; i--) {
      const faller = this.fallers[i]
      const before = faller.t
      faller.t += dt
      for (const due of fallBeats(faller)) if (due.at > before && due.at <= faller.t) this.cue(due.cue)
      if (faller.t >= fallLength(faller)) {
        this.fallers.splice(i, 1)
        this.wellAge[faller.colour] = 0
        if (faller.kind === 'dropped' || faller.kind === 'caught') this.joltAge = 0
      }
    }
    // The moth rides the trapped beam from end to end, along the board's lower edge under it.
    const beam = fullBeam(this.beams)
    if (this.playing === 'trapped' && beam) this.moth.carry(columnX(beam.col), RIDE_Y)
    this.cues(this.moth.step(dt))
    // The conducting spider waits out a beat of quiet with both feet down: while a white peg holds a beam no beam steps, and no foot taps.
    const waits = this.spider.act === 'conduct' && this.beams.some((held) => held.hold > 0)
    if (!waits) this.cues(this.spider.step(dt))
    if (this.stepped && this.spider.act === 'conduct') {
      // The conducting spider keeps the beam's time: a foot comes down in the very step the beam takes.
      const n = Math.round(this.spider.t / BEAT)
      this.spider.t = n * BEAT + this.beatClock
      if (n >= 1) this.cue({ name: 'baton', n: (n - 1) % 2, scene: true })
    }
    this.cues(this.gecko.step(dt))
    for (let i = this.sparks.length - 1; i >= 0; i--) if ((this.sparks[i].age += dt) > 0.5) this.sparks.splice(i, 1)
    for (let i = this.blooms.length - 1; i >= 0; i--) if ((this.blooms[i].age += dt) > BLOOM_FOR) this.blooms.splice(i, 1)
    for (let i = this.flashes.length - 1; i >= 0; i--) if ((this.flashes[i].age += dt) > FLASH_FOR[this.flashes[i].colour]) this.flashes.splice(i, 1)
  }

  /**
   * The game is put away. It settles as a load would find it: the finger gone, the lever up, a scene at its
   * end, every peg where the save has it, the three at rest, and not a sound left. Nothing here is a move.
   */
  putAway(): void {
    this.cancel()
    this.endScene()
    this.setLever(false, false)
    this.flush(true)
    for (const peg of this.live) this.changed.push(peg.hole)
    this.live.length = 0
    this.fallers.length = 0
    this.blooms.length = 0
    this.flashes.length = 0
    this.sparks.length = 0
    this.spider.rest()
    this.gecko.rest()
    this.moth.settle()
    this.knob = 0
    // A put-away earns no hint: opened again, the handle waits for a touch and a whole new stretch.
    this.untouched = null
    this.neck.x = this.warmth().x
    this.neck.y = this.warmth().y
    this.pileAge.fill(9)
    this.kickAge = this.pulseAge = this.buttonAge = this.leverAge = this.handleAge = this.joltAge = 9
    this.wellAge.fill(9)
    this.sounds.length = 0
    this.hush = true
  }

  /** Where the gecko's head leans: towards the middle of the red pegs on the board, and nowhere when there is none. */
  private warmth(): { x: number; y: number } {
    let n = 0, x = 0, y = 0
    for (let hole = 0; hole < HOLES; hole++) {
      if (this.shown[hole] !== RED) continue
      const at = centreOf(hole)
      x += at.x
      y += at.y
      n += 1
    }
    if (n === 0) return { x: 0, y: 0 }
    // From the gecko's head as it is drawn, up the wall beside the board.
    const dx = x / n - GECKO.x, dy = y / n - (GECKO.top + 62)
    const far = Math.hypot(dx, dy) || 1
    return { x: (dx / far) * NECK_REACH, y: (dy / far) * NECK_REACH }
  }

  /**
   * The ending's hint: with pegs on the board, no finger down and no scene, the tray's handle rattles once by
   * itself, so the way to tidy up can be found. No hand shows it. `step` asks once for each stretch.
   */
  private nudge(): void {
    if (this.playing !== null || this.finger || !this.board.some((cell) => cell !== 0)) return
    this.handleAge = 0
    this.cue({ name: 'rattle' })
  }

  /** Two or three empty holes in a row that carry on from the moth's light, up and to the right first: where the idle glow sits and the ghost hand drags. */
  nextHoles(): number[] {
    const from = this.moth.perch ?? Math.floor(HOLES / 2)
    const col = colOf(from), row = rowOf(from)
    for (const [dc, dr] of [[1, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [0, 1]]) {
      const run: number[] = []
      for (let k = 1; k <= 3; k++) {
        const c = col + dc * k, r = row + dr * k
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS || this.board[holeAt(c, r)] !== 0) break
        run.push(holeAt(c, r))
      }
      if (run.length >= 2) return run
    }
    return []
  }

  /** Asks for a sound. Asked for again in the same call, by the same colour, it is the same cue with more steps: one sound event, not a pile. */
  private cue(cue: Cue): void {
    this.pulseAge = 0
    for (let i = this.batch; i < this.sounds.length; i++) {
      const same = this.sounds[i]
      if (same.name !== cue.name || same.colour !== cue.colour || same.n !== cue.n) continue
      if (cue.steps) same.steps = [...(same.steps ?? []), ...cue.steps]
      return
    }
    this.sounds.push({ ...cue, ...(cue.steps ? { steps: cue.steps.slice() } : {}) })
  }

  private cues(cues: Cue[]): void {
    for (const cue of cues) this.cue(cue)
  }
}
