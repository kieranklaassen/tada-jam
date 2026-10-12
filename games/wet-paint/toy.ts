import type { Note } from './audio'
import { Bird } from './bird'
import { Cat, tasteFor } from './cat'
import { BROWN, ORANGE, POTS, WATER, isPot } from './colours'
import { DEMO_SECONDS, IDLE_BEFORE_DEMO, MAX_DEMOS } from './guidance'
import { CAT, CLOTHS, HELD, HOLD_PAWS, PAPER, PEGS, POOL, POT, PRINT, SILL, TOOL, fromCells, hungRect, inRect, lineY, onWater, toCells, whatIsAt, type Laid, type Rect, type ToolId } from './layout'
import { pack, unpack } from './marble'
import { makeRng } from './rng'
import { MOST_PRINTS, PRINT_BY, PRINT_CELLS, deserialize, freePeg, serialize, toolsAt, type InHand, type Print, type Save } from './save'
import { Scene, followedBy, type Beat } from './scene'
import { AWAY, HOLD, dabBeats, hungBeats, printBeats, restingShow, toolBeats, type Show, type Stagehand, type Taste } from './scenes'
import { Spring } from './spring'
import { finishCycle } from './state'
import { BLOOM, CELLS, COMB, GRID, SOAP, TICK, Tray, stick } from './tray'
import { beadVoice, cheepVoice, clothVoice, combVoice, dropVoice, glugVoice, knockVoice, paperVoice, pegVoice, soapTailVoice, soapVoice, spatterVoice, strawVoice, swishVoice, takeVoice, thumpVoice } from './voices'
import { chief, nearestColour, printOf, shares, stateAt, type WaterState } from './water'

// The game, built on the toy: the tray, the three pots, the tools, the paper
// and the prints, the cat, the bird and the cloths, and what a finger does
// to each. It is played by `step` alone. Every motion and every sound comes
// out of the seconds `step` is given: nothing here reads a clock, and a sound
// that comes later is asked for later, by a later step. The Mount hands it
// touches in stage units and plays what `takeSounds` gives back; view.ts
// draws what it holds.

/** The model's own step. A frame plays as many whole steps as it has time for. */
export const STEP = TICK

/** Something short-lived on the water or the table: a ring of ripples, a puff where a knock landed, the comb's five lines, the soap's lens, a bubble. */
export type Ripple = { kind: 'ring' | 'puff' | 'lines' | 'lens' | 'bubble'; x: number; y: number; born: number; size: number; angle: number }
export const RIPPLE_SECONDS: Record<Ripple['kind'], number> = { ring: 0.8, puff: 0.8, lines: 0.6, lens: 0.45, bubble: 0.7 }

/** The idle seconds after which the ghost hand has shown its last move: the cat may dip a paw from then on. */
export function showingsOver(): number {
  let start = IDLE_BEFORE_DEMO, gap = IDLE_BEFORE_DEMO * 2
  for (let i = 1; i < MAX_DEMOS; i++) {
    start += DEMO_SECONDS + gap
    gap *= 2
  }
  return start + DEMO_SECONDS + 1
}

/** What the last steps and touches sounded: the notes of ordinary sounds, the notes of a scene's, and whether every scene sound still ringing is to be cut. */
export type Sounds = { plain: Note[]; scene: Note[]; hush: boolean }

/** How a touch ended: a tap, a drag let go, or the touch taken away (parked, or taken by the browser), which never acts for the child. */
export type Lift = 'tap' | 'drop' | 'cancel'

/** A print as it is to be drawn: where, how large, how it hangs, and whether it is behind the cat. */
export type PrintPlace = { cells: string; x: number; y: number; w: number; h: number; tilt: number; behind: boolean; pegged: boolean }
/** A tool as it is to be drawn: where its middle is, how it is turned, and whether it is lifted off the cloth. */
export type ToolPlace = { x: number; y: number; turn: number; lifted: boolean }

type Hand = { on: 'water' | 'cat' | 'paper' | 'print' } | null
type Cue = { at: number; notes: Note[] }
type Flick = { at: number; x: number; y: number; colour: number }

const FLICK = { radius: 3.4, seconds: 0.3, seed: 1.5 } as const
/** A finger that rests on the water keeps giving: after the first bloom is full, the bloom under it swells on at an even pace for `seconds`, by a disc of `radius` cells in all, with a plop `every` so often. The bloom ends about twice as wide as one drop makes it. */
export const REST = { radius: 20.5, seconds: 5, every: 0.5 } as const
/** A bar of soap dragged over the water opens a small clear hole each time it has gone this far, in stage units. */
export const SOAP_DRAG = { every: 46, size: 0.55 } as const
/**
 * What is carried survives a lifted finger: the sheet of paper on its way to the tray, the held print on its way to
 * the line and a tool in the hand hang where they were let go for this long, on the model's clock, and a finger
 * that lands on the thing again carries on. A pull through the water is not a carry: it ends at the lift.
 */
export const GRACE = 0.3
/** How far a held print must be carried from the paws for the lift to hang it: its own width, about a hand's. Let go nearer, it comes back to the paws. */
export const FAR = PRINT.w
/** How long a print let go near the paws takes to come back to them. */
const BACK = 0.25
/** The cat's dab: the least and the most its paw reaches from where it rests, in stage units, and how far in from the rim the dab lands at least. */
export const DAB = { least: 70, most: 140, in: 18 } as const
const ease = (t: number): number => {
  const u = Math.min(1, Math.max(0, t))
  return u * u * (3 - 2 * u)
}
const mixRect = (a: Rect, b: Rect, t: number): Rect => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t })

export class Toy {
  /** Seconds of play, on the model's clock. */
  time = 0
  tray: Tray
  readonly cat: Cat
  readonly bird: Bird
  /** The pot the stick is dipped in, and what the hand holds. */
  pot: number
  tool: InHand
  position: string
  finished: boolean
  used: ToolId[]
  prints: Print[]
  shown: ToolId[]
  /** What a scene shows that the save does not hold. */
  show: Show = restingShow()
  /** Each pot's liquid, sloshing round 0, and how far its stick stands up, 0 lying to 1 standing. */
  readonly slosh: Spring[] = POT.ys.map(() => new Spring(0, 160, 7))
  readonly stick: Spring[]
  /** How far each cloth on the line swings, and each hung print, round 0. */
  readonly sway: Spring[] = [new Spring(0, 14, 1.6), new Spring(0, 42, 3)]
  readonly swing: Spring[] = PEGS.map((_, peg) => new Spring(0, 30 + 5 * peg, 2.4))
  /** The light on the water, jolted by a knock on the rim. */
  readonly jolt = new Spring(0, 120, 6)
  /** The corner of paper: how far it is lifted, and how far it has been pulled. */
  readonly paper = { lift: new Spring(0, 170, 12), dx: 0, dy: 0 }
  /** 0 to 1: the corner of paper asks to be taken, curling up and breathing. It asks while there is colour on the water. */
  asking = 0
  /** The tool that was last tapped, and the small hop it makes on its cloth. */
  hopped: ToolId | null = null
  readonly toolHop = new Spring(0, 220, 14)
  ripples: Ripple[] = []
  /** Where a finger is down, in stage units, or null. */
  finger: { x: number; y: number } | null = null
  /** Whether there is any colour on the water. */
  inked = false
  /** 0 to 1: how much of the sheen lies on the water. None while a finger is down. */
  calm = 1
  private orange = 0
  private brown = 0
  private talliedAt = -1
  private nextTally = 0
  private hand: Hand = null
  /** A finger resting where it dropped colour: the cell, when the next swell comes, and how many it has given. */
  private rest: { x: number; y: number; from: number; next: number } | null = null
  private nothing = false
  /** The tool this touch took up, with what the hand held before: a contact that only rests gives it back (`handOver`). */
  private took: { before: InHand } | null = null
  /** Where on the held print the finger took it, from its top left: the print does not jump under the finger. */
  private grab = { x: HELD.w / 2, y: HELD.h / 2 }
  /** A thing let go mid-carry, hanging where the finger left it until the grace is over. */
  private carried: { on: 'paper' | 'print'; x: number; y: number; until: number } | null = null
  /** A held print let go near the paws, on its way back to them. */
  private back: { from: Rect; start: number } | null = null
  /** A tool let go over the water or the cat, hanging there until the grace is over. */
  private toolAir: { x: number; y: number; until: number } | null = null
  private soaped = 0
  private owed = 0
  private moved = 0
  private pulled = 0
  private way = { x: 1, y: 0 }
  private swishFrom = 0
  private nextSwish = 0
  private said = 0
  private plain: Note[] = []
  private sceneNotes: Note[] = []
  private hush = false
  /** Nothing of the cat's own is heard on a visit until the child has touched something. */
  private awake = false
  private cues: Cue[] = []
  private flicks: Flick[] = []
  private scene: Scene | null = null
  /** The scene that plays is the cat's own act, not something the child set off. */
  private own = false
  private still = 0
  /** How high the cat has been since it last stood on the pile. */
  private air = 0
  private dabbed = false
  private changed: 0 | 1 | 2 = 0
  private stagehand: Stagehand
  private readonly seed: number

  /** The game as it was left. Nothing eases in: the water lies as saved, the prints hang, and the dipped stick already stands. */
  constructor(save: Save, seed: number) {
    this.position = save.position
    this.finished = save.finished
    this.tray = new Tray(unpack(save.tray, CELLS) ?? undefined)
    this.pot = save.pot
    this.tool = save.tool
    this.used = [...save.used]
    this.prints = save.prints.map((print) => ({ ...print }))
    this.shown = [...save.shown]
    this.stick = POT.ys.map((_, pot) => new Spring(pot === save.pot && save.tool === 'finger' ? 1 : 0, 150, 13))
    this.seed = seed
    this.cat = new Cat(makeRng(seed))
    this.bird = new Bird(makeRng(seed ^ 0x5bd1e995))
    this.stagehand = this.hands()
    // A print in the paws is in them from the first frame.
    if (this.held >= 0) this.cat.holdNow(HOLD)
    this.count()
  }

  /** What a scene may ask of the game. */
  private hands(): Stagehand {
    const toy = this
    return {
      get show() { return toy.show },
      say: (notes) => toy.say(notes, true),
      ripple: (x, y, size) => toy.ripple('ring', x, y, size),
      hop: () => toy.cat.hop(),
      shake: () => toy.cat.shake(),
      swing: (peg) => toy.swing[peg].kick(2.6),
    }
  }

  /** Anything on the water still moving by itself, or still to land on it. */
  get moving(): boolean {
    return this.tray.moving || this.flicks.length > 0
  }

  /** A scene the child set off is playing: the child is not idle. The cat's own dab does not count. */
  get busy(): boolean {
    return this.scene !== null && !this.own
  }

  /** Whether a scene plays, whoever set it off. */
  get playing(): boolean {
    return this.scene !== null
  }

  /** The tools that lie on the table. */
  get tools(): ToolId[] {
    return toolsAt(this.position)
  }

  /** The print in the cat's paws: its place in `prints`, or -1. */
  get held(): number {
    return this.prints.findIndex((print) => print.peg === null)
  }

  /** The water to draw: as it lay, while the sheet is still on its way down, and as it is otherwise. */
  get water(): Uint8Array {
    return this.show.under ?? this.tray.cells
  }

  /** What to save: every field of the sheet, with the water as it will lie at rest, cell for cell. */
  toSave(): Save {
    return { v: 1, position: this.position, finished: this.finished, tray: this.rested(), pot: this.pot, tool: this.tool, used: [...this.used], prints: this.prints.map((print) => ({ ...print })), shown: [...this.shown] }
  }

  /** 0 when nothing worth saving changed since this was last asked, 1 for a small change that keeps coming, 2 for one that is saved at once. */
  takeChanged(): 0 | 1 | 2 {
    const changed = this.changed
    this.changed = 0
    return changed
  }

  /** What sounded since this was last asked. */
  takeSounds(): Sounds {
    const sounds = { plain: this.plain, scene: this.sceneNotes, hush: this.hush }
    this.plain = []
    this.sceneNotes = []
    this.hush = false
    return sounds
  }

  /** Every print as it is to be drawn now. */
  placed(): PrintPlace[] {
    const places: PrintPlace[] = [], show = this.show, held = this.held
    const leaving = show.leaving
    if (leaving) {
      const from = hungRect(leaving.peg), to: Rect = { x: CAT.body.x - 30, y: CAT.body.y - 30, w: from.w * 0.8, h: from.h * 0.8 }
      places.push({ cells: leaving.cells, ...mixRect(from, to, leaving.t), tilt: PEGS[leaving.peg].tilt + leaving.t * 0.9, behind: true, pegged: true })
    }
    this.prints.forEach((print, index) => {
      let rect: Rect, tilt = 0, pegged = print.peg !== null
      if (print.peg !== null) {
        rect = hungRect(print.peg)
        tilt = PEGS[print.peg].tilt + this.swing[print.peg].value
      } else {
        if (index === held && !show.holding) return
        const at = this.carrying()
        rect = at ? this.carriedRect(at) : this.back ? mixRect(this.back.from, HELD, ease((this.time - this.back.start) / BACK)) : { ...HELD, y: HELD.y - 24 * show.cheek + AWAY * show.away }
      }
      if (show.fly && show.fly.print === index) {
        rect = mixRect(show.fly.from, rect, show.fly.t)
        tilt *= show.fly.t
        pegged = false
      }
      places.push({ cells: print.cells, ...rect, tilt, behind: false, pegged })
    })
    return places
  }

  /** Where the finger has the held print, or left it hanging; null while it is in the paws. */
  private carrying(): { x: number; y: number } | null {
    if (this.hand?.on === 'print' && this.finger) return this.finger
    return this.carried?.on === 'print' ? this.carried : null
  }

  /** The held print's box while it is carried: under the finger where the finger took it. */
  private carriedRect(at: { x: number; y: number }): Rect {
    return { ...HELD, x: at.x - this.grab.x, y: at.y - this.grab.y }
  }

  /** A tool as it is to be drawn, or null while it has not come to the table. */
  toolPlace(tool: ToolId): ToolPlace | null {
    const show = this.show, spot = TOOL[tool]
    if (show.hidden === tool) return null
    if (show.tool && show.tool.id === tool) return { x: show.tool.x, y: show.tool.y, turn: show.tool.turn, lifted: true }
    const hop = this.hopped === tool ? Math.abs(this.toolHop.value) : 0
    const x = spot.x + spot.w / 2, y = spot.y + spot.h / 2 - hop
    if (tool !== this.tool) return { x, y, turn: 0.02 * hop, lifted: false }
    // In the hand: over the finger while it works, and lifted off the cloth otherwise.
    if (this.finger && (this.hand?.on === 'water' || this.hand?.on === 'cat')) return { x: this.finger.x + 30, y: this.finger.y - 44, turn: 0.55, lifted: true }
    // Let go, it hangs where it was for the grace, and then goes back over its place.
    if (this.toolAir && this.time < this.toolAir.until) return { x: this.toolAir.x + 30, y: this.toolAir.y - 44, turn: 0.55, lifted: true }
    return { x, y: y - 12 + 3 * Math.sin(this.time * 3), turn: 0.1, lifted: true }
  }

  private laid(): Laid {
    return { birdX: this.bird.pose.x, tools: this.tools, held: this.held >= 0, hung: PEGS.map((_, peg) => this.prints.some((print) => print.peg === peg)), holding: this.holds, curl: this.curl }
  }

  /** How far the corner of paper is curled up now, in stage units: it breathes while it asks. view.ts draws it so, and a touch finds it so. */
  get curl(): number {
    return this.asking * (5 + 4 * Math.sin(this.time * 2.6))
  }

  /** The finger that is down landed where nothing is: on the rim, the table or the wall. The next contact that lands may then take the work (hands.ts). */
  get onNothing(): boolean {
    return this.finger !== null && this.nothing
  }

  /** The straw's dimple: where the breath lands and how deep it has got, 0 to 1, for as long as it puffs; null otherwise. */
  get dimple(): { x: number; y: number; deep: number } | null {
    const finger = this.finger
    if (!finger || this.hand?.on !== 'water' || this.tool !== 'straw' || this.tray.breath >= 1) return null
    return { x: finger.x, y: finger.y, deep: this.tray.breath }
  }

  /** The cat's paws are at the sides of a print it holds, and not carried off by a finger or still on its way there. */
  private get holds(): boolean {
    return this.held >= 0 && this.hand?.on !== 'print' && this.show.holding && this.carried?.on !== 'print' && !this.back
  }

  private say(notes: Note[], scene = false): void {
    // Nothing is heard on a visit before the child's first touch: not on load, and not after a put-away.
    if (!this.awake) return
    for (const note of notes) (scene ? this.sceneNotes : this.plain).push(note)
  }

  private ripple(kind: Ripple['kind'], x: number, y: number, size: number, angle = 0): void {
    this.ripples.push({ kind, x, y, born: this.time, size, angle })
    if (this.ripples.length > 8) this.ripples.shift()
  }

  private note(level: 1 | 2): void {
    if (level > this.changed) this.changed = level
  }

  /** The water as it will lie at rest if nothing touches it again, as text: played ahead on a second water, in the same steps, with what is still in the air landing when it would. */
  private rested(): string {
    if (!this.moving) return pack(this.tray.cells)
    const twin = this.tray.clone(), flicks = this.flicks.map((flick) => ({ ...flick }))
    // A swell under a resting finger stops where it is, as it does when the finger lifts.
    twin.swellEnd()
    let time = this.time
    for (let guard = 0; (twin.moving || flicks.length > 0) && guard < 1200; guard++) {
      time += STEP
      while (flicks.length > 0 && flicks[0].at <= time) {
        const flick = flicks.shift()!
        twin.drop(flick.x, flick.y, flick.colour, FLICK.radius, FLICK.seconds, FLICK.seed)
      }
      twin.step(STEP)
    }
    return pack(twin.cells)
  }

  /** What a touch on the water lands in, and the colours near it. */
  private landsIn(x: number, y: number, colours?: number[]): WaterState {
    return stateAt(this.tray.cells, GRID.w, GRID.h, x, y, colours)
  }

  /** A finger lands. A scene that is playing ends first; then whatever the finger lands on answers now. */
  press(x: number, y: number): void {
    const carried = this.carried
    if (carried) {
      // A finger that lands again on the thing it let go carries on with it, as if it had never lifted.
      const paper: Rect = { x: PAPER.x + this.paper.dx, y: PAPER.y + this.paper.dy, w: PAPER.w, h: PAPER.h }
      if (inRect(x, y, carried.on === 'paper' ? paper : this.carriedRect(carried), 20)) {
        if (carried.on === 'print') {
          const rect = this.carriedRect(carried)
          this.grab = { x: Math.min(HELD.w, Math.max(0, x - rect.x)), y: Math.min(HELD.h, Math.max(0, y - rect.y)) }
        }
        this.carried = null
        this.awake = true
        this.still = 0
        this.calm = 0
        this.finger = { x, y }
        this.hand = { on: carried.on }
        this.say(paperVoice(3))
        return
      }
      // A finger that lands anywhere else: the lift was the drop.
      this.settleCarry()
    }
    this.back = null
    this.toolAir = null
    this.took = null
    this.endScene()
    this.awake = true
    this.still = 0
    this.dabbed = false
    const spot = whatIsAt(x, y, this.laid())
    this.finger = { x, y }
    this.calm = 0
    this.hand = null
    this.moved = 0
    this.pulled = 0
    this.rest = null
    this.soaped = 0
    this.nothing = false
    this.swishFrom = this.time
    // The next cycle starts on the first touch of the water or of a pot.
    if (this.finished && (spot.kind === 'water' || spot.kind === 'pot')) {
      this.finished = false
      this.note(2)
    }
    switch (spot.kind) {
      case 'water':
        this.hand = { on: 'water' }
        this.touchWater(x, y, spot.x, spot.y)
        break
      case 'pot':
        if (this.tool !== 'finger') this.say(takeVoice('finger'))
        this.pot = spot.pot
        this.tool = 'finger'
        this.slosh[spot.pot].kick(7)
        this.say(glugVoice(spot.pot, this.said++))
        this.cat.heard(POT.x, POT.ys[spot.pot])
        this.note(1)
        break
      case 'tool':
        // A tap on a tool takes it up; a tap on the tool in the hand puts it down where it lies. Either way it hops.
        this.hopped = spot.tool
        this.toolHop.kick(150)
        if (this.tool === spot.tool) {
          this.tool = 'finger'
          this.say(takeVoice('finger'))
          this.note(1)
          break
        }
        this.took = { before: this.tool }
        this.tool = spot.tool
        this.say(takeVoice(spot.tool))
        this.cat.heard(TOOL[spot.tool].x, TOOL[spot.tool].y)
        this.note(1)
        // A tool whose first showing is still owed is shown now.
        if (!this.shown.includes(spot.tool)) {
          this.shown.push(spot.tool)
          this.note(2)
          this.start(toolBeats(this.stagehand, spot.tool, true), false)
        }
        break
      case 'paper':
        this.hand = { on: 'paper' }
        this.say(paperVoice(0))
        this.cat.heard(PAPER.x, PAPER.y)
        break
      case 'held':
        this.hand = { on: 'print' }
        this.grab = { x: x - HELD.x, y: y - HELD.y }
        this.say(paperVoice(3))
        break
      case 'print':
        this.swing[spot.peg].kick(x < PEGS[spot.peg].x ? 2.4 : -2.4)
        this.say([...paperVoice(3), ...pegVoice()])
        this.cat.heard(PEGS[spot.peg].x, lineY(PEGS[spot.peg].x))
        break
      case 'cat':
        this.hand = { on: 'cat' }
        if (this.tool === 'comb') {
          this.cat.comb(18)
          this.say(combVoice('bloom', 0, 0, this.said++))
        } else if (this.tool === 'straw') this.cat.blow(true)
        else if (this.tool === 'soap') this.cat.soap()
        else if (spot.part === 'paw') this.wetPaw(spot.paw)
        else this.cat.poke()
        break
      case 'bird':
        this.bird.startle()
        this.say(cheepVoice(this.said++))
        this.cat.heard(this.bird.pose.x, SILL.y)
        break
      case 'cloth':
        this.sway[spot.cloth].kick(x < CLOTHS[spot.cloth].x ? 3.2 : -3.2)
        this.say(clothVoice(spot.cloth))
        this.cat.heard(CLOTHS[spot.cloth].x, lineY(CLOTHS[spot.cloth].x))
        break
      case 'mat':
        // A tool in the hand is put down on its cloth.
        if (this.tool !== 'finger') {
          this.hopped = this.tool
          this.toolHop.kick(150)
          this.tool = 'finger'
          this.say(takeVoice('finger'))
          this.note(1)
          break
        }
      // falls through: with nothing to put down, the cloth is the table.
      case 'rim':
      case 'room':
        this.nothing = true
        if (spot.kind === 'rim') this.jolt.kick(6)
        this.say(knockVoice(spot.kind === 'rim', this.said++))
        this.ripple('puff', x, y, 0.45)
        this.cat.heard(x, y)
        break
    }
    // What the cat says to a touch is heard with the touch, not a step later.
    for (const sound of this.cat.takeSounds()) this.say(sound)
  }

  /** The stick, or the tool in hand, touches the water at this cell. */
  private touchWater(x: number, y: number, cx: number, cy: number): void {
    const colours: number[] = [], state = this.landsIn(cx, cy, colours), under = this.tray.at(cx, cy)
    if (this.tool !== 'finger' && !this.used.includes(this.tool)) this.used.push(this.tool)
    this.note(1)
    if (this.tool === 'comb') {
      this.tray.strokeStart(cx, cy, COMB)
      this.say(combVoice(state, 0, under, this.said++))
      if (state === 'plain') this.ripple('lines', x, y, 1)
      return
    }
    if (this.tool === 'straw') {
      this.tray.blowStart(cx, cy)
      this.say(strawVoice(state, 0, this.said++))
      this.ripple('ring', x, y, 0.7)
      this.cat.batAt(x, y)
      return
    }
    if (this.tool === 'soap') {
      this.tray.drop(cx, cy, WATER, SOAP.radius, SOAP.seconds, SOAP.seed)
      this.say(soapVoice(state, this.said++))
      this.ripple('lens', x, y, 1)
      if (state === 'plain') this.ripple('bubble', x, y, 1)
      const tail = soapTailVoice(state, this.said)
      if (tail) this.cues.push({ at: this.time + (state === 'plain' ? RIPPLE_SECONDS.bubble : SOAP.seconds), notes: tail })
      this.cat.startle(x, y)
      return
    }
    // The dipped stick drops colour, and what it sounds like is the row of the grid it landed in.
    const colour = POTS[this.pot]
    let row: WaterState = state, other = under
    if (state !== 'mix') {
      if (under === WATER) row = colours.length >= 2 ? 'two' : 'plain'
      else if (under === colour) row = colours.length === 1 ? 'bloom' : 'two'
      else row = 'rings'
    }
    if (row === 'two') other = colours.find((c) => c !== colour) ?? under
    const fuller = row === 'bloom' ? Math.min(1, shares(this.tray.cells)[colour] * 10) : 0
    this.tray.drop(cx, cy, colour)
    this.tray.strokeStart(cx, cy, stick(colour))
    this.say(dropVoice(this.pot, this.said++, row, fuller, other))
    this.ripple('ring', x, y, 1)
    this.cat.bloom(x, y)
    this.rest = { x: cx, y: cy, from: this.time + BLOOM.seconds + 0.2, next: 0 }
    // A colour dropped inside another makes a bullseye, and rings make the cat hunt.
    if (row === 'rings' && isPot(under)) this.cat.hunt(x, y)
    this.inked = true
  }

  /** A drop on the paw that rests on the rim: the paw is coloured, the cat shakes it, and three small blooms are flicked into the water. */
  private wetPaw(paw: number): void {
    const holds = this.holds, colour = POTS[this.pot], at = (holds ? HOLD_PAWS : CAT.paws)[paw]
    // Colour is on its way to the water: the next cycle has begun. A paw that holds a print answers the same way,
    // but that touch was meant for the print: it starts nothing, and the print stays in the paws.
    if (this.finished && !holds) {
      this.finished = false
      this.note(2)
    }
    this.cat.wetPaw(paw, colour)
    // Nothing lands unseen: under a print in the paws the blooms land below it, clear of the sheet.
    const top = this.held >= 0 ? HELD.y + HELD.h + 20 : POOL.y + 30
    for (let i = 0; i < 3; i++) {
      const cell = toCells(at.x + [-34, 8, 46][i], top + [4, 28, 0][i])
      this.flicks.push({ at: this.time + 0.2 + 0.18 * i, x: cell.x, y: cell.y, colour })
    }
    this.note(1)
  }

  /** The finger no longer rests: what the swell gave stays on the water, and it gives no more. */
  private unrest(): void {
    if (this.rest) this.tray.swellEnd()
    this.rest = null
  }

  /** The finger has moved to here while down. */
  move(x: number, y: number): void {
    const was = this.finger ?? { x, y }
    const length = Math.hypot(x - was.x, y - was.y)
    this.finger = { x, y }
    if (length > 0.5) this.way = { x: (x - was.x) / length, y: (y - was.y) / length }
    const on = this.hand?.on
    if (on === 'water') {
      const cell = toCells(x, y)
      // A finger that moves is pulling, not resting.
      this.unrest()
      if (this.tool === 'straw') this.tray.blowTo(cell.x, cell.y)
      else if (this.tool !== 'soap') this.tray.strokeTo(cell.x, cell.y)
      else {
        // The soap, dragged, opens a small clear hole every so far: seen and heard together.
        this.soaped += length
        if (this.soaped >= SOAP_DRAG.every && onWater(x, y)) {
          this.soaped = 0
          this.tray.drop(cell.x, cell.y, WATER, SOAP.radius * SOAP_DRAG.size, SOAP.seconds, SOAP.seed)
          this.say(soapVoice(this.landsIn(cell.x, cell.y), this.said++))
          this.ripple('lens', x, y, SOAP_DRAG.size)
        }
      }
      this.moved += length
      this.pulled += length
      this.note(1)
    } else if (on === 'cat') {
      if (this.tool === 'comb') {
        this.cat.comb(length)
        this.moved += length
        this.pulled += length
      } else if (this.tool === 'finger') this.cat.stroke(length)
    } else if (on === 'paper') {
      // The corner comes a little way with the finger: toward the tray, the way a print is taken.
      this.paper.dx = Math.max(0, Math.min(70, x - (PAPER.x + PAPER.w / 2)))
      this.paper.dy = Math.max(0, Math.min(70, y - (PAPER.y + PAPER.h / 2)))
    }
  }

  /** The finger is up, or the touch was taken away. A touch that is taken away makes no move for the child. */
  release(lift: Lift): void {
    const on = this.hand?.on, finger = this.finger
    this.hand = null
    this.finger = null
    this.unrest()
    // A tool let go over the water or the cat hangs where it was for the grace.
    if ((on === 'water' || on === 'cat') && lift !== 'cancel' && this.tool !== 'finger' && finger) this.toolAir = { x: finger.x, y: finger.y, until: this.time + GRACE }
    if (on === 'water') {
      // A pull through the water is not a carry: it ends at the lift, and the water coasts on.
      if (this.tool === 'straw') this.tray.blowEnd()
      else this.tray.strokeEnd(lift !== 'cancel')
      this.note(1)
    } else if (on === 'cat') {
      if (this.tool === 'straw') this.cat.blow(false)
    } else if (on === 'paper') {
      // A corner that was dragged and let go hangs where it is for the grace: the lift is the drop only when no
      // finger takes it up again. A tap lays the sheet at once. A touch that was taken away lays nothing.
      if (lift === 'drop' && finger) this.carried = { on: 'paper', x: finger.x, y: finger.y, until: this.time + GRACE }
      else {
        this.paper.dx = this.paper.dy = 0
        if (lift !== 'cancel') this.layPaper()
      }
    } else if (on === 'print' && finger) {
      // A tap sends it to the lowest free peg: it has not left the paws. A print that was dragged and let go hangs
      // where it is for the grace. A touch that was taken away leaves it in the paws.
      if (lift === 'tap') this.hang(this.held, freePeg(this.prints), HELD)
      else if (lift === 'drop') this.carried = { on: 'print', x: finger.x, y: finger.y, until: this.time + GRACE }
    }
    for (const sound of this.cat.takeSounds()) this.say(sound)
  }

  /** The sheet is laid, if there is colour to take. */
  private layPaper(): void {
    // Colour the cat flicked that is still in the air lands first, whole: it is on the water the sheet covers,
    // and in the print. Nothing the child made is lost unseen.
    for (const flick of this.flicks) this.tray.drop(flick.x, flick.y, flick.colour, FLICK.radius, FLICK.seconds, FLICK.radius)
    if (this.flicks.length > 0) this.note(1)
    this.flicks = []
    // Plain water takes no print: the corner settles back, the cat looks at the water, and the line keeps its prints.
    if (shares(this.tray.cells)[WATER] < 1) this.takePrint()
    else this.cat.glance(POOL.x + POOL.w / 2, POOL.y + POOL.h * 0.4, 1.4)
  }

  /** The grace is over, or a finger landed somewhere else: the lift was the drop. */
  private settleCarry(): void {
    const carried = this.carried
    if (!carried) return
    this.carried = null
    if (carried.on === 'paper') {
      this.paper.dx = this.paper.dy = 0
      this.layPaper()
      return
    }
    // The held print: carried further than its own width from the paws, or let go above the cat, it is hung on the
    // free peg nearest where it was let go. Let go nearer, it comes back to the paws with a rustle.
    const from = this.carriedRect(carried), gone = Math.hypot(from.x - HELD.x, from.y - HELD.y)
    if (gone >= FAR || carried.y < CAT.head.y - CAT.head.ry) {
      let best = -1
      PEGS.forEach((peg, i) => {
        if (this.prints.some((print) => print.peg === i)) return
        if (best < 0 || Math.abs(peg.x - carried.x) < Math.abs(PEGS[best].x - carried.x)) best = i
      })
      this.hang(this.held, best, from)
    } else {
      this.back = { from, start: this.time }
      this.say(paperVoice(3))
    }
  }

  /**
   * The contact that is down has only rested, and another finger starts work somewhere else (hands.ts). A tool
   * this touch took up goes back to its place, so a thumb that grips the edge of the glass takes up no tool for
   * good. The touch itself is then taken away, which makes no move.
   */
  handOver(): void {
    if (!this.took) return
    this.hopped = this.tool === 'finger' ? this.hopped : this.tool
    this.toolHop.kick(150)
    this.tool = this.took.before
    this.took = null
    this.say(takeVoice(this.tool))
    this.note(1)
  }

  private tasteOf(print: Print): Taste {
    const most = chief(unpack(print.cells, PRINT_CELLS) ?? new Uint8Array(PRINT_CELLS))
    return tasteFor(most.colour, most.share)
  }

  /** Scene 1, and scene 2 after it when the cycle went well. Everything it changes is in the state, and saved, before its first beat. */
  private takePrint(): void {
    const cells = this.tray.cells, print: Print = { cells: pack(printOf(cells, GRID.w, GRID.h, PRINT_BY)), peg: null }
    // The cycle is judged here: it went well when the newest tool on the table has touched this water, or, with no tool yet, when there is colour on it.
    const tools = this.tools, newest = tools[tools.length - 1]
    const well = newest ? this.used.includes(newest) : shares(cells)[WATER] < 1
    const show = restingShow()
    show.under = cells.slice()
    show.holding = false
    show.sheet = { phase: 'down', t: 0 }
    const earlier = this.held
    this.prints.push(print)
    let before = earlier
    if (this.prints.length > MOST_PRINTS) {
      const oldest = this.prints.shift()!
      before = earlier - 1
      if (oldest.peg !== null) show.leaving = { cells: oldest.cells, peg: oldest.peg, t: 0 }
    }
    if (before >= 0) {
      this.prints[before].peg = freePeg(this.prints)
      show.fly = { print: before, from: HELD, t: 0 }
    }
    this.tray = new Tray()
    this.flicks = []
    this.cues = []
    this.used = []
    const place = finishCycle({ v: 1 as const, position: this.position, finished: this.finished }, well ? 'well' : 'mixed')
    const arrives = place.position !== this.position ? toolsAt(place.position).pop() : undefined
    this.position = place.position
    this.finished = true
    this.show = show
    this.count()
    let beats = printBeats(this.stagehand, this.tasteOf(print), before)
    if (arrives) {
      // The tool is behind the cat until its own scene, which follows the print without a gap. That scene's
      // outcome, the tool as shown, is saved when it starts. Ended or put away before then, the tool lies on
      // the table and its showing is still owed.
      show.hidden = arrives
      const begun: Beat = { at: 0, lasts: 0, play: (_, finishing) => {
        if (finishing || this.shown.includes(arrives)) return
        this.shown.push(arrives)
        this.note(2)
      } }
      beats = followedBy(beats, [begun, ...toolBeats(this.stagehand, arrives, false)])
    }
    this.note(2)
    this.start(beats, false)
  }

  /** Scene 4: the print is hung on `peg`. Saved before its first beat. */
  private hang(index: number, peg: number, from: Rect): void {
    if (index < 0 || peg < 0) return
    const print = this.prints[index]
    print.peg = peg
    this.note(2)
    this.show.fly = { print: index, from, t: 0 }
    this.start(hungBeats(this.stagehand, this.tasteOf(print), index, peg, from), false)
  }

  /** Scene 3: the cat dips a paw. It saves nothing and changes nothing the child made. */
  private dab(): void {
    const nose = toCells(CAT.nose.x, POOL.y), near = nearestColour(this.tray.cells, GRID.w, GRID.h, nose.x, nose.y)
    if (!near) return
    const colour = fromCells(near.x, near.y), home = CAT.paws[1]
    const dx = colour.x - home.x, dy = Math.max(1, colour.y - home.y), far = Math.hypot(dx, dy), reach = Math.min(DAB.most, Math.max(DAB.least, far - 40))
    const at = { x: Math.min(POOL.x + POOL.w - 20, Math.max(POOL.x + 20, home.x + (dx / far) * reach)), y: Math.max(POOL.y + DAB.in, home.y + (dy / far) * reach) }
    // The paw is set at least `DAB.in` into the water, which can carry it further out: it is brought back to its reach.
    const across = Math.sqrt(Math.max(0, DAB.most * DAB.most - (at.y - home.y) * (at.y - home.y)))
    at.x = Math.min(home.x + across, Math.max(home.x - across, at.x))
    // Nothing lands unseen: with a print in the paws the dab lands below it, clear of the sheet.
    if (this.held >= 0 && inRect(at.x, at.y, HELD, 24)) {
      at.y = HELD.y + HELD.h + 26
      const beside = Math.sqrt(Math.max(0, DAB.most * DAB.most - (at.y - home.y) * (at.y - home.y)))
      at.x = Math.min(home.x + beside, Math.max(home.x - beside, at.x))
    }
    this.dabbed = true
    this.start(dabBeats(this.stagehand, tasteFor(near.colour === ORANGE || near.colour === BROWN ? near.colour : WATER, 1), colour, at), true)
  }

  private start(beats: ReturnType<typeof printBeats>, own: boolean): void {
    this.scene = new Scene(beats)
    this.own = own
    this.scene.start(this.time, () => {})
  }

  /** A touch, or a put-away, ends the scene that plays: every beat lands where it was going, and nothing of it is heard from this frame on. */
  private endScene(): void {
    if (!this.scene) return
    this.scene.finish()
    this.afterScene()
    // What the scene set swinging hangs still.
    for (const swing of this.swing) {
      swing.value = 0
      swing.speed = 0
    }
    this.sceneNotes = []
    this.hush = true
  }

  private afterScene(): void {
    this.scene = null
    this.own = false
    this.show = restingShow()
  }

  /**
   * Put away: the game becomes what a load would find. The scene ends, the touch is taken away, and then it is
   * built again from its own save, by the same road a load takes: the water at rest, the prints where they
   * belong, every short-lived thing gone, every timer empty, the cat and the bird as a visit begins. So a game
   * that was parked and one that was closed and opened are the same game, and nothing of the visit before is
   * heard again.
   */
  putAway(seed: number = this.seed): void {
    this.endScene()
    this.release('cancel')
    // A thing hanging in its grace is not dropped: the child did not let it go for good.
    this.carried = null
    const again = new Toy(deserialize(JSON.parse(JSON.stringify(serialize(this.toSave())))), seed)
    Object.assign(this, again)
    this.stagehand = this.hands()
    this.hush = true
  }

  /** Plays `dt` seconds of the model's clock, in whole steps. What is left over is played by a later call. */
  step(dt: number): void {
    this.owed += dt
    while (this.owed >= STEP - 1e-9) {
      this.owed -= STEP
      this.tick(STEP)
    }
  }

  private tick(dt: number): void {
    this.time += dt
    const tray = this.tray, before = tray.version
    // What the cat flicked off its paw lands.
    while (this.flicks.length > 0 && this.flicks[0].at <= this.time) {
      const flick = this.flicks.shift()!, at = fromCells(flick.x, flick.y)
      tray.drop(flick.x, flick.y, flick.colour, FLICK.radius, FLICK.seconds, FLICK.seed)
      this.say(spatterVoice(flick.colour, this.said++))
      this.ripple('ring', at.x, at.y, 0.3)
    }
    tray.step(dt)
    for (const event of tray.takeEvents()) {
      const at = fromCells(event.x, event.y)
      this.say(beadVoice(event.colour, this.said++, this.tool === 'comb'))
      this.ripple('ring', at.x, at.y, 0.4)
      this.cat.bead(at.x, at.y)
    }
    if (tray.version !== before) this.note(1)
    while (this.cues.length > 0 && this.cues[0].at <= this.time) this.say(this.cues.shift()!.notes)

    // The sound of the hand at work, asked for on the model's clock: at most one every so often.
    const on = this.hand?.on, finger = this.finger
    if (finger && on && this.time >= this.nextSwish) {
      const cell = toCells(finger.x, finger.y), since = Math.max(STEP, this.time - this.swishFrom)
      if (on === 'water' && this.tool === 'finger' && this.moved > 4) {
        this.say(swishVoice(this.moved / since / 900, tray.at(cell.x + this.way.x * 8, cell.y + this.way.y * 8)))
        this.beat(0.09)
      } else if (this.tool === 'comb' && this.moved > 3) {
        const n = this.said++, off = ((n % 5) - 2) * COMB.apart
        const under = on === 'water' ? tray.at(cell.x - this.way.y * off, cell.y + this.way.x * off) : 0
        const state = on === 'water' ? this.landsIn(cell.x, cell.y) : 'bloom'
        this.say(combVoice(state, this.pulled / 420, under, n))
        // On plain water the teeth leave five wakes that run side by side and are gone.
        if (on === 'water' && state === 'plain' && n % 2 === 0) this.ripple('lines', finger.x, finger.y, 0.8, Math.atan2(this.way.y, this.way.x))
        this.beat(0.085)
      } else if (on === 'water' && this.tool === 'straw' && tray.breath < 1 && this.time - this.swishFrom >= 0.14) {
        // The puff is heard while the dent deepens, and stops with it.
        this.say(strawVoice(this.landsIn(cell.x, cell.y), tray.breath, this.said++))
        this.beat(0.14)
      }
    }

    // A finger that rests where it dropped colour keeps giving: the bloom under it swells again, with its plop.
    const rest = this.rest
    if (rest && this.time >= rest.from && this.time < rest.from + REST.seconds && this.time >= rest.next) {
      if (rest.next === 0) tray.swellStart(rest.x, rest.y, POTS[this.pot], REST.radius, REST.seconds)
      this.say(dropVoice(this.pot, this.said++, 'bloom', Math.min(1, (this.time - rest.from) / REST.seconds + 0.1), POTS[this.pot]))
      rest.next = this.time + REST.every
      this.note(1)
    }

    if (this.scene) {
      this.scene.update(this.time)
      if (!this.scene.running) this.afterScene()
    }
    // Stillness, on the model's clock: a finger down or a scene the child set off is not stillness.
    if (this.carried && this.time >= this.carried.until) this.settleCarry()
    if (this.back && this.time - this.back.start >= BACK) this.back = null
    if (this.finger || this.busy || this.carried) this.still = 0
    else this.still += dt
    if (!this.scene && !this.dabbed && this.inked && this.still >= showingsOver()) this.dab()

    if (tray.version !== this.talliedAt && this.time >= this.nextTally) this.count()
    // The paws hold a print that is in them, whatever else a scene has the cat do.
    // It is still a cat while it holds one: it purrs when stroked and bats at the straw's dent.
    this.cat.hold = this.holds ? HOLD : null
    this.cat.direction = this.scene ? this.show.direction : null
    this.cat.step(dt, this.finger, this.orange, this.brown)
    // The cat lands from a hop: heard in the frame its weight comes down, and the water in the tray jolts.
    const up = this.cat.pose.hop
    if (up > this.air) this.air = up
    else if (up === 0 && this.air > 0) {
      if (this.air > 6) {
        this.say(thumpVoice(), this.scene !== null)
        this.jolt.kick(3)
      }
      this.air = 0
    }
    for (const sound of this.cat.takeSounds()) if (this.awake) this.say(sound, this.scene !== null)
    this.bird.step(dt)

    for (let pot = 0; pot < this.stick.length; pot++) {
      this.slosh[pot].step(dt, 0)
      this.stick[pot].step(dt, pot === this.pot && this.tool === 'finger' ? 1 : 0)
    }
    // A draught moves each cloth in its own slow time: the towel heavy, the sock quick.
    this.sway[0].step(dt, 0.05 * Math.sin(this.time * 0.7))
    this.sway[1].step(dt, 0.09 * Math.sin(this.time * 1.9 + 1.3))
    for (const swing of this.swing) swing.step(dt, 0)
    this.jolt.step(dt, 0)
    this.calm = this.finger ? 0 : Math.min(1, this.calm + dt / 0.9)
    const lifted = this.hand?.on === 'paper' || this.carried?.on === 'paper'
    this.paper.lift.step(dt, lifted ? 1 : 0)
    this.asking += ((this.inked && !this.scene && !lifted ? 1 : 0) - this.asking) * Math.min(1, dt * 3)
    this.toolHop.step(dt, 0)
    while (this.ripples.length > 0 && this.time - this.ripples[0].born > RIPPLE_SECONDS[this.ripples[0].kind]) this.ripples.shift()
  }

  private beat(every: number): void {
    this.moved = 0
    this.swishFrom = this.time
    this.nextSwish = this.time + every
  }

  /** Counts the colours on the water, a few times a second at most: what the cat's tastes go by. */
  private count(): void {
    const part = shares(this.tray.cells)
    this.orange = part[ORANGE]
    this.brown = part[BROWN]
    this.inked = part[WATER] < 1
    this.talliedAt = this.tray.version
    this.nextTally = this.time + 0.25
  }
}
