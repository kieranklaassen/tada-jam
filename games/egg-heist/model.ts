import type { Point } from './input'
import { heldOf, resolve, schedule, type Plan } from './pairings'
import {
  APRON_TOP, BESIDE, BUSHES, BUSH_SNAP, CLOUDS, DOOR, FENCE, FLOOR, SUN, GOOSE_SPEED, HOME, FEET, LEG, NEAR, PLACES, PLACE_IDS, ROUND, ROWS, START, STRIP, TAIL_GAP, THINGS,
  bushAt, clampToRow, freeSpot, gazeShape, gooseAt, inRect, inside, landingShape, onBarn, onCurtain, onHills, onPelmet, onTree, rowAt, stretchOf,
  type Loc, type PlaceId, type Spot, type ThingId,
} from './yard'
import { LOOKS, drawnBoxes, restBox } from './looks'
import { NEST_NODS, NEST_PUZZLED } from './motion'

// The game's rules, with no drawing and no clock of its own: the raccoon that
// creeps where it is sent, the goose on her round and what she does when she
// sees it, the things that are lifted and set down, the thirty pairings of a
// thing with a place and the rounds they set going, and the farmer's tidy.
// Everything is stepped on game time and nothing here draws chance.
//
// The state a save holds changes at once when an outcome is certain (a punt,
// a set-down, a pairing or a whole round, the tidy), and what is still seen
// playing is kept apart as a view of it, so a save taken at any instant holds
// nothing in the air and no scene is ever replayed.

/** One push of the raccoon's wire, in stage units, and how long it takes. */
export const PUSH = 48
export const PUSH_SECONDS = 0.2
export const HOP_SECONDS = 0.24
/** How long the goose's double-take lasts before she honks. */
export const TAKE_SECONDS = 0.55
export const HONK_SECONDS = 0.4
export const KICK_SECONDS = 0.18
export const FLY_SECONDS = 0.95
export const DIZZY_SECONDS = 0.9
export const STARTLED_SECONDS = 1
/** How long she looks the way a pluck came from. */
export const GLARE_SECONDS = 1.6
/** The gap between two things the farmer whisks home, and how long each takes. */
export const WHISK_EVERY = 0.4
export const WHISK_SECONDS = 0.42
/** How long the farmer stays awake after one tap on his door: a second tap in that time has him tidy. */
export const AWAKE_SECONDS = 4.5
/** How long he takes to slide out before the first thing goes home, and to slide back in after the last. */
export const TIDY_LEAD = 0.9
export const TIDY_TAIL = 0.9
export const WHISTLES_AT = 0.35
/** How far from the raccoon she comes down to kick it. */
export const KICK_REACH = 118
/** How far from a thing the raccoon stands to lift it, and how far in front of itself it sets one down. */
export const REACH = 74

/** The sounds of the pairings that are loud enough to wake the farmer for a moment. */
const LOUD = new Set(['ring', 'ringHigh', 'ringRising', 'ringThin', 'gargledRing', 'squawk', 'howl', 'greatSplash', 'hollowHonks', 'sneeze', 'clatter', 'proudHonk', 'threeYaps', 'caw', 'honkHop'])

/** A sound the Mount plays: a name in voices.ts, and which of its variants. */
export type Cue = { name: CueName; n: number; /** For `act`: the name of the sound in the grid. */ sound?: string }
export type CueName =
  | 'aim' | 'step' | 'hop' | 'rustle' | 'lift' | 'land' | 'poke' | 'notice' | 'hmph' | 'honk' | 'kick' | 'crash'
  | 'gloat' | 'pluck' | 'door' | 'whistle' | 'wake' | 'creak' | 'cloud' | 'curtain' | 'sun' | 'apple' | 'fence' | 'knock' | 'frame' | 'hill' | 'ruffle' | 'waddle' | 'nestCluck' | 'nestPuzzled' | 'act' | 'hush'

export type Target =
  | { kind: 'floor'; x: number; row: number }
  | { kind: 'thing'; id: ThingId }
  | { kind: 'place'; id: PlaceId }
  | { kind: 'goose' }

export type RaccoonMode = 'still' | 'push' | 'hop' | 'shock' | 'fly' | 'dizzy'
export type GooseMode = 'round' | 'take' | 'relax' | 'honk' | 'dash' | 'kick' | 'strut' | 'startled' | 'glare' | 'scene'

/** A thing seen moving: a view of where the state already has it. */
export type ThingMove =
  | { kind: 'hop'; t: number }
  | { kind: 'land'; t: number }
  /** Thrown up from where it was carried. `t` is negative until the kick lands. */
  | { kind: 'pop'; t: number; fromX: number; fromY: number }
  /** Whisked home by the farmer from where it was seen. `t` is negative while it waits its turn. */
  | { kind: 'whisk'; t: number; fromX: number; fromY: number }

/** What the save holds of the yard (save.ts repairs it field by field). */
export type YardSave = {
  raccoon: Spot
  things: Record<ThingId, Loc>
  goose: { leg: number; along: number }
}

export function freshYard(): YardSave {
  return { raccoon: { ...HOME }, things: structuredCloneThings(START), goose: { leg: 0, along: 0 } }
}

function structuredCloneThings(things: Record<ThingId, Loc>): Record<ThingId, Loc> {
  const copy = {} as Record<ThingId, Loc>
  for (const id of THINGS) copy[id] = { ...things[id] }
  return copy
}

/** How much a change asks of the save: nothing, at the throttle, or at once. */
export type Dirty = 0 | 1 | 2

/** How near the goose a place's tap point may lie before the ghost hand passes it over: she is this wide and this tall. */
export const HAND_CLEAR = { x: 130, up: 190, down: 40 } as const
/** How long a place's owner takes to settle to rest when its thing is taken out. */
export const SETTLE_SECONDS = 0.28
/** When the woken farmer pushes his door ajar: the first push this long after he wakes, one every so often after, each this long. */
export const AJAR = { first: 0.5, every: 1.6, seconds: 0.5 } as const
/** How many pushes of the door have started `since` seconds after he woke. */
export const ajarPushes = (since: number): number => (since < AJAR.first ? 0 : Math.floor((since - AJAR.first) / AJAR.every) + 1)

/** Where two places' patches meet, the one drawn in front is asked first: the nest stands before the washing. */
const TOUCH_ORDER: readonly PlaceId[] = ['nest', 'pond', 'bowl', 'scarecrow', 'line']

/**
 * Where the goose walks on from when a scene is over, for a raccoon that stands at `place`: the start of the lane
 * that place is not beside, with her back to it. Whoever watched the scene to its end is not under her wedge or
 * her patch then, and has at least four seconds to creep away before her sight comes round. This is the one spot
 * every scene saves her at, a single pairing and a round alike.
 */
export function gooseAfterScene(place: PlaceId): { leg: number; along: number } {
  return { leg: PLACES[place].stand.row <= 1 ? LEG.right : LEG.toNest, along: 0 }
}

export class Yard {
  time = 0
  /** False until the child has touched the screen once this visit: until then the goose notices nothing. */
  awake = false

  readonly raccoon = {
    x: HOME.x, row: HOME.row, face: 1 as 1 | -1, mode: 'still' as RaccoonMode, t: 0,
    fromX: HOME.x, toX: HOME.x, fromRow: HOME.row, toRow: HOME.row,
    /** Where a punt lifted it from: the flight is a view, the raccoon is already home. */
    flownFrom: { x: HOME.x, row: HOME.row },
    /** Which note of the tiptoe tune the next push plays. */
    note: 0,
    /** Seconds since it last came to a stop, for the peep. */
    rested: 0,
  }
  things: Record<ThingId, Loc>
  readonly moves: Partial<Record<ThingId, ThingMove>> = {}
  readonly goose = {
    leg: 0, along: 0, mode: 'round' as GooseMode, t: 0,
    /** Where she is off her round: in a dash, a kick, a strut. */
    x: 0, y: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, seconds: 0,
    /** The way she faces off her round. */
    face: 1 as 1 | -1,
    /** She has turned to face a pluck, and looks that way until she walks on. */
    turned: false,
    /** The step of her waddle she last sounded. */
    stepped: 0,
    /** What she found in the nest on this lap's look: nothing until she has stopped there this visit. */
    nestSaw: null as null | 'egg' | 'empty' | 'other',
  }
  /**
   * A pairing or a round that is playing. The things, the raccoon and the goose are already where it leaves them;
   * `before` is where the things were seen when it started, which is all the view needs to show it arriving there.
   */
  scene: { plan: Plan; t: number; sounded: number; before: Record<ThingId, Loc>; gooseFrom: { leg: number; along: number } } | null = null
  target: Target | null = null
  /** A finger is leading the raccoon: it follows, and does nothing where it arrives until the finger lets go. */
  leading = false
  /** The stage peg where the last tap landed, and its age. */
  peg: { x: number; y: number; t: number } | null = null
  /** Short-lived stirrings the view draws: seconds since each, or a large number. */
  readonly stir = { bush: BUSHES.map(() => 99), place: Object.fromEntries(PLACE_IDS.map((id) => [id, 99])) as Record<PlaceId, number>, cloud: CLOUDS.map(() => 99), curtain: 99, feather: 99, crash: 99, perk: 99, poke: 99, noise: 99, sun: 99, apple: 99, fence: 99, frame: 99, hill: 99, ruffle: 99, knock: 99 }
  /** Where the last tap on the tree, the fence and the hills landed, and whether the last knock on the frame was on the pelmet. */
  readonly toy = { appleX: 180, appleY: 120, fenceX: 600, hillX: 600, hillY: 340, pelmet: false }
  /** The place the raccoon last poked with empty paws, for how it is drawn doing it. */
  poked: PlaceId = 'nest'
  /** The place the ghost hand shows while the paws are full, and whether a showing is up now. Short-lived, and gone on load. */
  readonly hand: { place: PlaceId | null; up: boolean } = { place: null, up: false }
  /** The thing just taken out of each place, and how long ago: its owner settles from that picture to rest. Short-lived, and gone on load. */
  left: Record<PlaceId, { thing: ThingId; t: number } | null> = { nest: null, pond: null, bowl: null, line: null, scarecrow: null }
  /** The farmer: seconds into the tidy, or -1 when he is not tidying, when it ends, and how long he stays awake. */
  readonly tidy = { t: -1, ends: 0, awake: 0, whistled: true, any: false }
  private cues: Cue[] = []
  private dirty: Dirty = 0

  constructor(saved: YardSave = freshYard()) {
    this.things = structuredCloneThings(saved.things)
    this.raccoon.x = this.raccoon.fromX = this.raccoon.toX = saved.raccoon.x
    this.raccoon.row = this.raccoon.fromRow = this.raccoon.toRow = saved.raccoon.row
    this.goose.leg = saved.goose.leg
    this.goose.along = saved.goose.along
  }

  // --- What the Mount reads --------------------------------------------------

  toSave(): YardSave {
    return { raccoon: { x: Math.round(this.raccoon.x), row: this.raccoon.row }, things: structuredCloneThings(this.things), goose: { leg: this.goose.leg, along: Math.round(this.goose.along * 1000) / 1000 } }
  }

  /** The sounds queued since the last call, oldest first. */
  takeCues(): Cue[] {
    const cues = this.cues
    this.cues = []
    return cues
  }

  /** What the save should do about the changes since the last call. */
  takeDirty(): Dirty {
    const dirty = this.dirty
    this.dirty = 0
    return dirty
  }

  carried(): ThingId | null {
    for (const id of THINGS) if (this.things[id].at === 'paws') return id
    return null
  }

  heldBy(place: PlaceId): ThingId | null {
    for (const id of THINGS) if (this.things[id].at === place) return id
    return null
  }

  /** Whether the raccoon is down behind a bush. */
  get hidden(): boolean {
    const r = this.raccoon
    return (r.mode === 'still' || r.mode === 'push' || r.mode === 'dizzy') && bushAt(r.x, r.row) >= 0 && !this.scene
  }

  /** Where the goose is now and which way she faces, on her round or off it. */
  gooseNow(): { x: number; y: number; row: number; face: 1 | -1 } {
    const g = this.goose
    const on = gooseAt(g.leg, g.along)
    if (g.mode === 'round' || g.mode === 'take' || g.mode === 'relax' || g.mode === 'startled' || g.mode === 'glare' || g.mode === 'scene') return g.turned ? { ...on, face: g.face } : on
    return { x: g.x, y: g.y, row: rowAt(g.y - 34), face: g.face }
  }

  /** Whether her gaze is live: only on her round, and only once the child has touched the screen. */
  get watching(): boolean {
    const mode = this.goose.mode
    return mode === 'round' || mode === 'take' || mode === 'relax' || mode === 'glare'
  }

  /**
   * The ground she sees now, as the shapes that are drawn on the floor: her wedge, and, while she looks about
   * before a hop to her other lane and while she hops, the patch she will land on. Empty while she is not watching.
   */
  gaze(): { x: number; y: number }[][] {
    if (!this.watching) return []
    const g = this.gooseNow()
    const shapes = [gazeShape(g.x, g.y, g.row, g.face)]
    const leg = ROUND[this.goose.leg], next = ROUND[(this.goose.leg + 1) % ROUND.length]
    const lands = leg.kind === 'hop' ? leg.to : leg.kind === 'look' && next.kind === 'hop' ? next.to : null
    if (lands) shapes.push(landingShape(lands.x, lands.row))
    return shapes
  }

  /** Whether a figure standing at `x` in `row` lies under what is drawn of her gaze. */
  seesSpot(x: number, row: number): boolean {
    return this.gaze().some((shape) => inside(shape, x, ROWS[row] - FEET))
  }

  /** Whether the goose can see the raccoon now: it is in the open, the child has touched the screen, and it lies under her drawn gaze. */
  sees(): boolean {
    const r = this.raccoon
    if (!this.awake || !this.watching || this.hidden) return false
    if (r.mode !== 'still' && r.mode !== 'push' && r.mode !== 'hop') return false
    return this.seesSpot(r.x, r.row)
  }

  // --- Touch -----------------------------------------------------------------

  /** A finger landed at a stage point. Answered here and now. */
  press(at: Point): void {
    this.awake = true
    this.leading = false
    // A scene gives way to any touch: the yard is already as the scene leaves it, and the touch is then an ordinary one.
    const tidying = this.tidy.t >= 0
    // What was still sounding of a scene, a punt or the tidy is hushed with it.
    if (tidying || this.scene || this.goose.mode === 'honk' || this.goose.mode === 'dash' || this.goose.mode === 'kick') this.cue('hush')
    // The place the raccoon put the thing in, and the place whose pairing of a round is playing now.
    const playing = this.scene ? this.scene.plan.timed.filter((step, i) => i === 0 || (step.at <= this.scene!.t && this.scene!.t < step.at + step.len)).map((step) => step.place) : []
    this.endTidy()
    this.endPunt()
    this.endScene()
    const hit = this.whatIsAt(at, true)
    if (hit.kind === 'target' && hit.target.kind === 'place' && playing.includes(hit.target.id)) {
      // A second tap on a place whose own pairing is playing only ends it: the thing stays in, and the place answers with a nudge.
      this.stir.place[hit.target.id] = 0
      return
    }
    if (hit.kind === 'door') {
      // One tap wakes the farmer, who looks out. A second while he is awake has him tidy the yard.
      if (this.tidy.awake > 0 && !tidying) this.startTidy()
      else { this.tidy.awake = AWAKE_SECONDS; this.cue('wake') }
      return
    }
    if (hit.kind === 'ruffled') { this.stir.ruffle = 0; this.cue('ruffle'); return }
    if (hit.kind === 'sky') {
      this.stir.cloud[hit.cloud] = 0
      this.cue('cloud', hit.cloud)
      return
    }
    if (hit.kind === 'curtain') {
      this.stir.curtain = 0
      this.cue('curtain')
      return
    }
    // Each toy of the setting answers as itself, and nothing in the yard changes.
    if (hit.kind === 'sun') { this.stir.sun = 0; this.cue('sun'); return }
    if (hit.kind === 'tree') { this.stir.apple = 0; this.toy.appleX = at.x; this.toy.appleY = at.y; this.cue('apple'); return }
    if (hit.kind === 'fence') { this.stir.fence = 0; this.toy.fenceX = at.x; this.cue('fence'); return }
    if (hit.kind === 'hills') { this.stir.hill = 0; this.toy.hillX = at.x; this.toy.hillY = at.y; this.cue('hill'); return }
    // A knock on the barn is a loud noise: the half-door shakes on its hinge, and the farmer opens one eye or, awake already, jumps.
    if (hit.kind === 'barn') { this.stir.noise = 0; this.stir.knock = 0; this.cue('knock'); return }
    if (hit.kind === 'frame') { this.stir.frame = 0; this.toy.pelmet = hit.pelmet; this.cue('frame', hit.pelmet ? 1 : 0); return }
    if (hit.kind === 'target') this.aim(hit.target, true)
  }

  /** The finger moved while down: the raccoon follows it over the floor. */
  lead(at: Point): void {
    const hit = this.whatIsAt(at, false)
    if (hit.kind !== 'target') return
    this.leading = true
    this.aim(hit.target, false)
  }

  /** The finger let go after leading: the raccoon does what it does where it was sent. */
  letGo(): void {
    this.leading = false
  }

  /**
   * Told which showing of the ghost hand is up, or -1 for none. As each new one comes up the hand moves on to
   * another place: the first is the place nearest the raccoon, never the one it showed last, and never one the
   * goose is standing at.
   */
  showHand(showing: number): void {
    if (showing < 0) { this.hand.up = false; return }
    if (this.hand.up) return
    this.hand.up = true
    // With empty paws the hand taps a thing: no place is shown, and none is used up.
    if (!this.carried()) return
    const g = this.gooseNow(), r = this.raccoon
    const last = this.hand.place
    let from = 0
    if (last === null) {
      let gap = Infinity
      PLACE_IDS.forEach((id, i) => { const d = Math.hypot(PLACES[id].stand.x - r.x, (PLACES[id].stand.row - r.row) * 90); if (d < gap) { gap = d; from = i } })
    } else from = PLACE_IDS.indexOf(last) + 1
    for (let i = 0; i < PLACE_IDS.length; i++) {
      const id = PLACE_IDS[(from + i) % PLACE_IDS.length]
      const at = PLACES[id].holds
      if (id === last) continue
      if (Math.abs(at.x - g.x) < HAND_CLEAR.x && at.y - 20 > g.y - HAND_CLEAR.up && at.y - 20 < g.y + HAND_CLEAR.down) continue
      this.hand.place = id
      return
    }
  }

  /**
   * The game was parked or put away. It stays mounted, so this does what a load of the same save would have done:
   * a scene, a punt, a tidy or a glare ends without its sounds, the farmer is asleep, and the goose notices nothing
   * until the child touches the screen again.
   */
  putAway(): void {
    // A scene, a punt or a tidy that was playing is over: the state already holds its end.
    this.endTidy()
    this.endPunt()
    this.endScene()
    const saved = this.toSave()
    const r = this.raccoon, g = this.goose
    // Everything short-lived goes, exactly as a new yard made from this save starts: the raccoon stands where it
    // had got to, the goose walks her round from where she was, the farmer dozes, and no errand is pending.
    Object.assign(r, { x: saved.raccoon.x, row: saved.raccoon.row, face: 1, mode: 'still', t: 0, fromX: saved.raccoon.x, toX: saved.raccoon.x, fromRow: saved.raccoon.row, toRow: saved.raccoon.row, flownFrom: { x: HOME.x, row: HOME.row }, note: 0, rested: 0 })
    Object.assign(g, { leg: saved.goose.leg, along: saved.goose.along, mode: 'round', t: 0, x: 0, y: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, seconds: 0, face: 1, turned: false, stepped: 0, nestSaw: null })
    for (const id of THINGS) delete this.moves[id]
    this.target = null
    this.leading = false
    this.peg = null
    const stir = this.stir
    stir.bush.fill(99)
    stir.cloud.fill(99)
    for (const id of PLACE_IDS) { stir.place[id] = 99; this.left[id] = null }
    stir.curtain = stir.feather = stir.crash = stir.perk = stir.poke = stir.noise = stir.sun = stir.apple = stir.fence = stir.frame = stir.hill = stir.ruffle = stir.knock = 99
    Object.assign(this.toy, { appleX: 180, appleY: 120, fenceX: 600, hillX: 600, hillY: 340, pelmet: false })
    this.poked = 'nest'
    Object.assign(this.hand, { place: null, up: false })
    Object.assign(this.tidy, { t: -1, ends: 0, awake: 0, whistled: true, any: false })
    this.awake = false
    // Nothing of what was playing sounds on: what was queued is dropped, and the Mount cuts what had started.
    this.cues = []
  }

  /** The finger was taken away: the child chose no spot, so the raccoon stops where it has got to and does nothing. */
  takenAway(): void {
    this.leading = false
    this.target = null
  }

  private aim(target: Target, fresh: boolean): void {
    const r = this.raccoon
    if (fresh) {
      if (target.kind === 'thing') this.moves[target.id] = { kind: 'hop', t: 0 }
      else if (target.kind === 'place') this.stir.place[target.id] = 0
      else if (target.kind === 'goose') { this.stir.ruffle = 0; this.cue('ruffle') }
      if (target.kind === 'floor') this.peg = { x: target.x, y: ROWS[target.row], t: 0 }
      // The raccoon snaps round with its ears up and the first note is plucked; the peg's tok is for bare floor only.
      this.stir.perk = 0
      this.cue('aim', (target.kind === 'floor' ? 0 : 2) + (this.carried() ? 1 : 0))
    }
    if (r.mode === 'shock' || r.mode === 'fly') return
    if (r.mode === 'dizzy') { r.mode = 'still'; r.t = 0 }
    this.target = target
    const goal = this.goalOf(target)
    // It snaps round at once, standing or in the middle of a creep: the turn is drawn when the note sounds.
    if (goal && (r.mode === 'still' || (fresh && (r.mode === 'push' || r.mode === 'hop'))) && Math.abs(goal.x - r.x) > 1) r.face = goal.x > r.x ? 1 : -1
  }

  private whatIsAt(at: Point, withSetting: boolean): { kind: 'target'; target: Target } | { kind: 'door' } | { kind: 'sky'; cloud: number } | { kind: 'curtain' } | { kind: 'sun' } | { kind: 'tree' } | { kind: 'fence' } | { kind: 'hills' } | { kind: 'barn' } | { kind: 'frame'; pelmet: boolean } | { kind: 'ruffled' } | { kind: 'none' } {
    const { x, y } = at
    if (withSetting) {
      // The gilt frame and the curtains are drawn over everything else, so a finger on them has touched them.
      if (onPelmet(x, y)) return { kind: 'frame', pelmet: true }
      if (y >= APRON_TOP) return { kind: 'frame', pelmet: false }
      if (onCurtain(x, y)) return { kind: 'curtain' }
      if (inRect(x, y, DOOR)) return { kind: 'door' }
    }
    let nearest: ThingId | null = null, gap = 48
    for (const id of THINGS) {
      const loc = this.things[id]
      if (loc.at !== 'floor') continue
      const d = Math.hypot(loc.x - x, ROWS[loc.row] - 18 - y)
      if (d < gap) { gap = d; nearest = id }
    }
    if (nearest) return { kind: 'target', target: { kind: 'thing', id: nearest } }
    const g = this.gooseNow()
    // On her round a tap on her sends the raccoon to her tail. Stopped in a double-take, startled or glaring, she is still
    // herself: she ruffles, and nothing is sent to her feet.
    if (withSetting && Math.abs(x - g.x) < 62 && y < g.y + 8 && y > g.y - 200) return this.goose.mode === 'round' ? { kind: 'target', target: { kind: 'goose' } } : { kind: 'ruffled' }
    // A place is touched wherever it is drawn as it stands: first on the thing in it, which lies in front, then
    // on its own patch and its owner. The boxes are the ones the frame draws from (looks.ts).
    for (const id of PLACE_IDS) {
      const held = this.heldBy(id), box = held ? restBox(id, held) : null
      if (box && inRect(x, y, box)) return { kind: 'target', target: { kind: 'place', id } }
    }
    for (const id of TOUCH_ORDER) {
      for (const box of drawnBoxes(id, this.heldBy(id))) if (inRect(x, y, box)) return { kind: 'target', target: { kind: 'place', id } }
    }
    // A bush is touched where it is drawn, which is higher than the strip of floor it stands on.
    for (const bush of BUSHES) {
      if (Math.abs(x - bush.x) <= BUSH_SNAP && y >= ROWS[bush.row] - 60 && y <= ROWS[bush.row] + 8) return { kind: 'target', target: { kind: 'floor', x: bush.x, row: bush.row } }
    }
    if (y >= FLOOR.top && y <= FLOOR.bottom && x >= FLOOR.left - 40 && x <= FLOOR.right + 40) {
      const row = rowAt(y)
      const bush = bushAt(x, row, BUSH_SNAP)
      if (bush >= 0) return { kind: 'target', target: { kind: 'floor', x: BUSHES[bush].x, row } }
      return { kind: 'target', target: { kind: 'floor', x: clampToRow(row, x), row } }
    }
    if (!withSetting) return { kind: 'none' }
    if (Math.hypot(x - SUN.x, y - SUN.y) <= SUN.r) return { kind: 'sun' }
    if (onBarn(x, y)) return { kind: 'barn' }
    if (y >= FENCE.top && y < FENCE.bottom && x < FENCE.right) return { kind: 'fence' }
    if (onTree(x, y)) return { kind: 'tree' }
    if (onHills(x, y)) return { kind: 'hills' }
    // The open sky is the clouds': the one nearest the finger bobs.
    let cloud = 0, far = Infinity
    for (let i = 0; i < CLOUDS.length; i++) {
      const d = Math.hypot(this.cloudX(i) - x, CLOUDS[i].y - y)
      if (d < far) { far = d; cloud = i }
    }
    return { kind: 'sky', cloud }
  }

  /** Where a cloud has been slid to along its wire: slowly out and back, between the tree and the barn. */
  cloudX(i: number): number {
    return CLOUDS[i].x + CLOUDS[i].reach * Math.sin(this.time * CLOUDS[i].pace + i * 2.1)
  }

  /** The spot the raccoon heads for, for a target as things stand now. */
  private goalOf(target: Target): Spot | null {
    const r = this.raccoon
    if (target.kind === 'floor') return { x: target.x, row: target.row }
    if (target.kind === 'place') return PLACES[target.id].stand
    if (target.kind === 'thing') {
      const loc = this.things[target.id]
      if (loc.at !== 'floor') return null
      // It stands beside the thing, on the side it comes from.
      const side = r.x <= loc.x ? -1 : 1
      const beside = clampToRow(loc.row, loc.x + side * REACH)
      return { x: Math.abs(beside - loc.x) > REACH - 20 ? beside : clampToRow(loc.row, loc.x - side * REACH), row: loc.row }
    }
    // A goose that walks is walking away: it heads for a spot nearer than her tail, and plucks as it slides in reach.
    const g = this.gooseNow()
    return { x: clampToRow(g.row, g.x - g.face * (this.goose.mode === 'round' && ROUND[this.goose.leg].kind === 'walk' ? TAIL_GAP - 30 : TAIL_GAP)), row: g.row }
  }

  // --- Time ------------------------------------------------------------------

  step(dt: number): void {
    if (!(dt > 0)) return
    this.time += dt
    this.age(dt)
    this.stepTidy(dt)
    this.stepScene(dt)
    this.stepGoose(dt)
    this.stepRaccoon(dt)
  }

  private age(dt: number): void {
    if (this.peg && (this.peg.t += dt) > 1.6) this.peg = null
    const stir = this.stir
    for (let i = 0; i < stir.bush.length; i++) stir.bush[i] += dt
    for (let i = 0; i < stir.cloud.length; i++) stir.cloud[i] += dt
    for (const id of PLACE_IDS) stir.place[id] += dt
    for (const id of PLACE_IDS) { const gone = this.left[id]; if (gone && (gone.t += dt) > SETTLE_SECONDS) this.left[id] = null }
    stir.curtain += dt
    stir.sun += dt
    stir.apple += dt
    stir.fence += dt
    stir.frame += dt
    stir.hill += dt
    stir.ruffle += dt
    stir.knock += dt
    stir.feather += dt
    stir.crash += dt
    stir.perk += dt
    stir.poke += dt
    stir.noise += dt
    for (const id of THINGS) {
      const move = this.moves[id]
      if (!move) continue
      const before = move.t
      move.t += dt
      if (move.kind === 'hop' && move.t > 0.34) delete this.moves[id]
      else if (move.kind === 'land' && move.t > 1.4) delete this.moves[id]
      else if (move.kind === 'pop' && move.t >= 0.6) { this.moves[id] = { kind: 'land', t: 0 }; this.cue('land', THINGS.indexOf(id)) }
      else if (move.kind === 'whisk') {
        // Each goes home with its own lifting sound.
        if (before < 0 && move.t >= 0) this.cue('lift', THINGS.indexOf(id))
        if (move.t >= WHISK_SECONDS) delete this.moves[id]
      }
    }
  }

  // --- The raccoon -----------------------------------------------------------

  private stepRaccoon(dt: number): void {
    const r = this.raccoon
    r.t += dt
    if (r.mode === 'shock' || r.mode === 'fly') return
    if (r.mode === 'dizzy') {
      if (r.t >= DIZZY_SECONDS) { r.mode = 'still'; r.t = 0; r.rested = 0 }
      return
    }
    if (r.mode === 'push') {
      const k = Math.min(1, r.t / PUSH_SECONDS)
      // A push of the wire: quick at first, then it stops dead.
      r.x = r.fromX + (r.toX - r.fromX) * (1 - (1 - k) * (1 - k))
      if (this.bumpsGoose()) return
      if (k >= 1) this.arrive()
      return
    }
    if (r.mode === 'hop') {
      if (r.t >= HOP_SECONDS) {
        r.row = r.toRow
        this.cue('hop', r.row)
        this.arrive()
      }
      return
    }
    r.rested += dt
    this.plan()
  }

  private arrive(): void {
    const r = this.raccoon
    r.x = r.mode === 'push' ? r.toX : r.x
    r.mode = 'still'
    r.t = 0
    r.rested = 0
    this.mark(1)
    this.plan()
  }

  /** Chooses the raccoon's next push or hop towards its target, or does what it came to do. */
  private plan(): void {
    const r = this.raccoon, target = this.target
    if (!target || r.mode !== 'still') return
    const goal = this.goalOf(target)
    if (!goal) { this.target = null; return }
    if (target.kind === 'goose') {
      if (this.goose.mode !== 'round') { this.target = null; return }
      if (this.atTail()) { this.pluck(); return }
    }
    if (r.row === goal.row && Math.abs(r.x - goal.x) < 1) {
      if (target.kind === 'goose') { this.target = null; return }
      if (this.leading) return
      this.target = null
      this.actOn(target)
      return
    }
    // The front groove is entered and left straight across: the pond lies along it.
    let nextRow = r.row
    if (r.row !== goal.row) nextRow = r.row + Math.sign(goal.row - r.row)
    else if (stretchOf(r.row, r.x) !== stretchOf(goal.row, goal.x)) nextRow = r.row - 1
    if (nextRow === r.row) { this.pushTowards(goal.x); return }
    let hopAt = clampToRow(nextRow, nextRow === 3 ? goal.x : r.x)
    // It is never set down on top of the goose: it goes along its own groove until there is room beside her.
    const g = this.gooseNow()
    if (this.gooseStands() && g.row === nextRow && Math.abs(hopAt - g.x) < TAIL_GAP) {
      const side = r.x <= g.x ? -1 : 1
      const clear = clampToRow(nextRow, g.x + side * TAIL_GAP)
      hopAt = Math.abs(clear - g.x) >= TAIL_GAP - 1 ? clear : clampToRow(nextRow, g.x - side * TAIL_GAP)
    }
    const mine = clampToRow(r.row, hopAt)
    if (Math.abs(r.x - mine) > 1) { this.pushTowards(mine); return }
    r.mode = 'hop'
    r.t = 0
    r.fromRow = r.row
    r.toRow = nextRow
    r.x = hopAt
  }

  /** Whether the goose stands in a groove as a card the raccoon could slide into. */
  private gooseStands(): boolean {
    const mode = this.goose.mode
    return mode === 'round' || mode === 'take' || mode === 'relax' || mode === 'glare' || mode === 'startled'
  }

  /** Whether the raccoon stands where its paws reach her tail, behind her and unseen. */
  private atTail(): boolean {
    const r = this.raccoon, g = this.gooseNow()
    if (g.row !== r.row || this.sees()) return false
    const behind = (g.x - r.x) * g.face
    return behind > 0 && behind <= TAIL_GAP + 4
  }

  private pushTowards(x: number): void {
    const r = this.raccoon
    let reach = Math.max(-PUSH, Math.min(PUSH, x - r.x))
    // Two cards in one groove do not pass: it stops short of her.
    const g = this.gooseNow()
    if (this.gooseStands() && g.row === r.row) {
      const side = r.x <= g.x ? -1 : 1
      const limit = g.x + side * NEAR
      if (side < 0 ? r.x + reach > limit : r.x + reach < limit) reach = limit - r.x
      if ((side < 0 && reach < 0 && x > r.x) || (side > 0 && reach > 0 && x < r.x)) reach = 0
    }
    if (Math.abs(reach) < 1) { if (this.target?.kind !== 'goose') this.target = null; return }
    r.face = reach >= 0 ? 1 : -1
    r.mode = 'push'
    r.t = 0
    r.fromX = r.x
    r.toX = r.x + reach
    this.cue('step', (r.note++ % 12) + (this.carried() ? 12 : 0))
  }

  /** A raccoon that slides into the goose's tail in her own groove plucks it, meant or not. */
  private bumpsGoose(): boolean {
    const r = this.raccoon, g = this.gooseNow()
    if (this.goose.mode !== 'round' || !this.atTail()) return false
    if ((r.toX - r.fromX) * g.face <= 0) return false
    r.mode = 'still'
    r.t = 0
    this.pluck()
    return true
  }

  private actOn(target: Target): void {
    const r = this.raccoon
    const carried = this.carried()
    if (target.kind === 'floor') {
      const bush = bushAt(r.x, r.row)
      if (bush >= 0) { this.stir.bush[bush] = 0; this.cue('rustle'); return }
      if (carried) this.setDown(carried)
      return
    }
    if (target.kind === 'thing') {
      const loc = this.things[target.id]
      if (loc.at !== 'floor') return
      r.face = loc.x >= r.x ? 1 : -1
      if (carried) this.setDown(carried, -1)
      this.lift(target.id)
      return
    }
    if (target.kind === 'place') {
      const place = PLACES[target.id]
      r.face = place.holds.x >= r.x ? 1 : -1
      const held = this.heldBy(target.id)
      // A thing brought to a place goes in, and does there what it always does there.
      if (carried) { this.startScene(carried, target.id); return }
      // With empty paws it takes out what the place holds, or gives an empty place a poke.
      if (held) { this.lift(held); return }
      this.stir.place[target.id] = 0
      this.stir.poke = 0
      this.poked = target.id
      this.cue('poke', PLACE_IDS.indexOf(target.id))
    }
  }

  // --- A pairing, or a round of them ------------------------------------------

  /**
   * The raccoon has reached a place with a thing in its paws. Everything that follows is certain, so the state takes
   * all of it here and it is saved at once: the thing in that place, whatever was sent on where it ends, and the
   * goose where she will walk on from. What plays after is a view of getting there.
   */
  private startScene(thing: ThingId, place: PlaceId): void {
    const before = structuredCloneThings(this.things)
    for (const id of PLACE_IDS) this.left[id] = null
    const plan = schedule(resolve(heldOf((id) => this.things[id].at), thing, place))
    for (const id of PLACE_IDS) { const holds = plan.held[id]; if (holds) this.things[holds] = { at: id } }
    // Each thing that ends on the floor is laid beside its place, clear of what lies there already.
    for (const floor of plan.floors) {
      const beside = BESIDE[floor.beside]
      const spot = freeSpot(beside.x, beside.row, this.onFloor(floor.thing))
      this.things[floor.thing] = { at: 'floor', x: spot.x, row: spot.row }
    }
    const g = this.goose
    const gooseFrom = { leg: g.leg, along: g.along }
    // However the scene ends (played out, cut short by a touch, put away or loaded) she is found here: whatever
    // part she had in it, the boot hat's dive into the pond included, she is lifted on her wire to this spot.
    const after = gooseAfterScene(place)
    g.leg = after.leg
    g.along = after.along
    g.mode = 'scene'
    g.t = 0
    g.turned = false
    this.scene = { plan, t: 0, sounded: 0, before, gooseFrom }
    this.target = null
    this.mark(2)
    this.soundScene()
  }

  private stepScene(dt: number): void {
    const scene = this.scene
    if (!scene) return
    scene.t += dt
    this.soundScene()
    if (scene.t >= scene.plan.total) this.endScene()
  }

  /** Plays every sound of the scene whose moment has come. */
  private soundScene(): void {
    const scene = this.scene!
    const sounds = scene.plan.sounds
    while (scene.sounded < sounds.length && sounds[scene.sounded].t <= scene.t) {
      const name = sounds[scene.sounded++].sound
      if (name.startsWith('land:')) { const id = name.slice(5) as ThingId; this.moves[id] = { kind: 'land', t: 0 }; this.cue('land', THINGS.indexOf(id)) }
      else {
        this.cues.push({ name: 'act', n: 0, sound: name })
        if (LOUD.has(name)) this.stir.noise = 0
      }
    }
  }

  /** The scene is over, or a touch ended it: only the view of it goes, and no sound of the rest of it plays. */
  private endScene(): void {
    if (!this.scene) return
    this.scene = null
    this.goose.mode = 'round'
    this.goose.t = 0
  }

  /** A thing is about to be taken from where it is: if that is a place, its owner settles from the picture it was in. */
  private leaves(id: ThingId): void {
    const where = this.things[id].at
    if ((PLACE_IDS as readonly string[]).includes(where)) this.left[where as PlaceId] = { thing: id, t: 0 }
  }

  private lift(id: ThingId): void {
    this.leaves(id)
    this.things[id] = { at: 'paws' }
    delete this.moves[id]
    this.cue('lift', THINGS.indexOf(id))
    this.mark(2)
  }

  /** Lays the carried thing at the nearest free spot in front of the raccoon, or behind it when `side` is -1. */
  private setDown(id: ThingId, side: 1 | -1 = 1): void {
    const r = this.raccoon
    const spot = freeSpot(r.x + r.face * side * REACH, r.row, this.onFloor(id))
    this.things[id] = { at: 'floor', x: spot.x, row: spot.row }
    this.moves[id] = { kind: 'land', t: 0 }
    this.cue('land', THINGS.indexOf(id))
    this.mark(2)
  }

  /** Where the things on the floor lie, so nothing is laid on another. */
  private onFloor(except: ThingId): Spot[] {
    const spots: Spot[] = []
    for (const id of THINGS) {
      const loc = this.things[id]
      if (id !== except && loc.at === 'floor') spots.push({ x: loc.x, row: loc.row })
    }
    return spots
  }

  private pluck(): void {
    const r = this.raccoon, g = this.goose
    this.target = null
    const now = this.gooseNow()
    r.face = now.x >= r.x ? 1 : -1
    g.mode = 'startled'
    g.t = 0
    // She ends up facing the way the pluck came from.
    g.face = r.x >= now.x ? 1 : -1
    g.turned = false
    this.stir.feather = 0
    this.cue('pluck')
  }

  // --- The goose -------------------------------------------------------------

  private stepGoose(dt: number): void {
    const g = this.goose, r = this.raccoon
    g.t += dt
    switch (g.mode) {
      case 'round': {
        if (this.sees()) { g.mode = 'take'; g.t = 0; this.cue('notice'); return }
        // Before the child's first touch she notices nothing, so she waits rather than walk into a raccoon left in her lane.
        if (!this.awake && this.wouldMeet(dt)) return
        const was = g.along
        g.along += dt / ROUND[g.leg].seconds
        if (g.leg === LEG.nest) this.soundsAtNest(was, g.along)
        while (g.along >= 1) {
          g.along = (g.along - 1) * ROUND[g.leg].seconds
          g.leg = (g.leg + 1) % ROUND.length
          g.along /= ROUND[g.leg].seconds
          if (g.leg === LEG.nest) this.looksInNest()
          else if (g.leg === LEG.left) g.nestSaw = null
        }
        if (ROUND[g.leg].kind === 'walk') {
          const steps = Math.floor(this.time * 2.4)
          if (steps !== g.stepped) { g.stepped = steps; this.cue('waddle', steps % 2) }
        }
        return
      }
      case 'take':
        if (!this.sees()) { g.mode = 'relax'; g.t = 0; this.cue('hmph'); return }
        if (g.t >= TAKE_SECONDS) this.honk()
        return
      case 'relax':
        if (this.sees()) { g.mode = 'take'; g.t = 0; this.cue('notice'); return }
        if (g.t >= 0.5) { g.mode = 'round'; g.t = 0; g.turned = false }
        return
      case 'honk':
        if (g.t >= HONK_SECONDS) {
          g.mode = 'dash'
          g.t = 0
          g.fromX = g.x; g.fromY = g.y
          const side = g.x <= r.flownFrom.x ? -1 : 1
          g.toX = r.flownFrom.x + side * KICK_REACH
          g.toY = ROWS[r.flownFrom.row]
          g.face = side < 0 ? 1 : -1
          g.seconds = Math.min(0.5, Math.max(0.14, Math.hypot(g.toX - g.x, g.toY - g.y) / 1100))
        }
        return
      case 'dash': {
        const k = Math.min(1, g.t / g.seconds)
        g.x = g.fromX + (g.toX - g.fromX) * k
        g.y = g.fromY + (g.toY - g.fromY) * k
        if (k >= 1) { g.mode = 'kick'; g.t = 0; this.cue('kick') }
        return
      }
      case 'kick':
        if (g.t >= KICK_SECONDS && r.mode === 'shock') { r.mode = 'fly'; r.t = 0 }
        if (r.mode === 'fly' && r.t >= FLY_SECONDS) this.land(false)
        return
      case 'strut': {
        const k = Math.min(1, g.t / g.seconds)
        g.x = g.fromX + (g.toX - g.fromX) * k
        g.y = g.fromY + (g.toY - g.fromY) * k
        if (k >= 1) { g.mode = 'round'; g.t = 0 }
        return
      }
      case 'startled':
        if (g.t >= STARTLED_SECONDS) { g.mode = 'glare'; g.t = 0; g.turned = true }
        return
      case 'scene':
        return
      case 'glare':
        if (this.sees()) { g.mode = 'take'; g.t = 0; this.cue('notice'); return }
        if (g.t >= GLARE_SECONDS) { g.mode = 'relax'; g.t = 0; this.cue('hmph') }
        return
    }
  }

  /** Whether her next step, or the hop she is about to make, would bring her card onto the raccoon's in one groove. */
  private wouldMeet(dt: number): boolean {
    const g = this.goose, r = this.raccoon
    const leg = ROUND[g.leg], next = ROUND[(g.leg + 1) % ROUND.length]
    const lands = leg.kind === 'hop' ? leg.to : leg.kind !== 'walk' && next.kind === 'hop' ? next.to : null
    if (lands) return r.row === lands.row && Math.abs(r.x - lands.x) < NEAR
    if (leg.kind !== 'walk' || r.row !== leg.from.row) return false
    const now = gooseAt(g.leg, g.along), then = gooseAt(g.leg, g.along + dt / leg.seconds)
    return Math.abs(then.x - r.x) < NEAR && Math.abs(then.x - r.x) < Math.abs(now.x - r.x)
  }

  /** She stops beside the nest and looks in. What she finds is fixed as she stops, and she answers it as she is drawn doing it. */
  private looksInNest(): void {
    const holds = this.heldBy('nest')
    this.goose.nestSaw = holds === 'egg' ? 'egg' : holds === null ? 'empty' : 'other'
  }

  /** A cluck with each nod at her egg, and one puzzled honk as she straightens up from an empty nest: only while she is doing it. */
  private soundsAtNest(was: number, now: number): void {
    const saw = this.goose.nestSaw
    if (saw === 'egg') NEST_NODS.forEach((at, i) => { if (was < at && now >= at) this.cue('nestCluck', i) })
    else if (saw === 'empty' && was < NEST_PUZZLED && now >= NEST_PUZZLED) this.cue('nestPuzzled')
  }

  /** The double-take ran out. The outcome is certain here, so the state takes it at once: the rest is a view. */
  private honk(): void {
    const g = this.goose, r = this.raccoon
    const now = this.gooseNow()
    g.x = now.x; g.y = now.y; g.face = r.x >= now.x ? 1 : -1
    g.turned = false
    g.mode = 'honk'
    g.t = 0
    const carried = this.carried()
    r.flownFrom = { x: r.x, row: r.mode === 'hop' ? r.fromRow : r.row }
    if (carried) {
      const spot = freeSpot(r.flownFrom.x, r.flownFrom.row, this.onFloor(carried))
      this.things[carried] = { at: 'floor', x: spot.x, row: spot.row }
      this.moves[carried] = { kind: 'pop', t: -(HONK_SECONDS + 0.3 + KICK_SECONDS), fromX: r.flownFrom.x, fromY: ROWS[r.flownFrom.row] - 150 }
    }
    r.x = r.fromX = r.toX = HOME.x
    r.row = r.fromRow = r.toRow = HOME.row
    r.mode = 'shock'
    r.t = 0
    this.target = null
    this.leading = false
    this.cue('honk')
    this.mark(2)
  }

  /** A touch ends the punt: the raccoon is already home in the state, so only the view of it flying goes, quietly. */
  private endPunt(): void {
    const mode = this.goose.mode
    if (mode !== 'honk' && mode !== 'dash' && mode !== 'kick') return
    for (const id of THINGS) if (this.moves[id]?.kind === 'pop') delete this.moves[id]
    this.land(true)
  }

  private land(quiet: boolean): void {
    const g = this.goose, r = this.raccoon
    r.mode = 'dizzy'
    r.t = quiet ? DIZZY_SECONDS : 0
    r.face = 1
    this.stir.bush[0] = 0
    if (!quiet) {
      this.stir.crash = 0
      this.cue('crash')
      this.cue('gloat')
    }
    // She struts back to where she left her round, beak up and eyes shut.
    const back = gooseAt(g.leg, g.along)
    g.mode = 'strut'
    g.t = 0
    g.fromX = g.x; g.fromY = g.y
    g.toX = back.x; g.toY = back.y
    g.face = back.x >= g.x ? 1 : -1
    g.seconds = Math.max(0.6, Math.hypot(back.x - g.x, back.y - g.y) / (GOOSE_SPEED * 1.6))
  }

  // --- The farmer ------------------------------------------------------------

  private startTidy(): void {
    // In the order of the grid's rows, which has the egg last.
    const moved = THINGS.filter((id) => !sameLoc(this.things[id], START[id]))
    for (const id of moved) this.leaves(id)
    this.tidy.t = 0
    this.tidy.awake = 0
    this.tidy.whistled = false
    this.tidy.any = moved.length > 0
    this.tidy.ends = TIDY_LEAD + moved.length * WHISK_EVERY + (moved.length ? WHISK_SECONDS : 0) + TIDY_TAIL
    this.cue('door')
    if (!moved.length) return
    moved.forEach((id, i) => {
      const seen = this.seenAt(id)
      this.moves[id] = { kind: 'whisk', t: -(TIDY_LEAD + i * WHISK_EVERY), fromX: seen.x, fromY: seen.y }
      this.things[id] = { ...START[id] }
    })
    if (this.target?.kind === 'thing') this.target = null
    this.mark(2)
  }

  private stepTidy(dt: number): void {
    const tidy = this.tidy
    if (tidy.awake > 0) {
      // Each time he pushes his door ajar it creaks, at the moment the door card starts to swing.
      const was = AWAKE_SECONDS - tidy.awake
      tidy.awake = Math.max(0, tidy.awake - dt)
      const now = AWAKE_SECONDS - tidy.awake
      if (ajarPushes(now) > ajarPushes(was)) this.cue('creak')
    }
    if (tidy.t < 0) return
    tidy.t += dt
    // He whistles once he has slid out: two notes with things to tidy, one falling note with none.
    if (!tidy.whistled && tidy.t >= WHISTLES_AT) { tidy.whistled = true; this.cue('whistle', tidy.any ? 1 : 0) }
    if (tidy.t >= tidy.ends) tidy.t = -1
  }

  /** A touch ends the tidy: the things are already home in the state, so only the view of them moving goes. */
  private endTidy(): void {
    if (this.tidy.t < 0) return
    this.tidy.t = -1
    this.tidy.whistled = true
    for (const id of THINGS) if (this.moves[id]?.kind === 'whisk') delete this.moves[id]
  }

  /** Where a thing is seen at rest: on the floor, over the raccoon's head, or in its place. */
  seenAt(id: ThingId): { x: number; y: number } {
    const loc = this.things[id]
    if (loc.at === 'floor') return { x: loc.x, y: ROWS[loc.row] + STRIP }
    if (loc.at === 'paws') return { x: this.raccoon.x + this.raccoon.face * 10, y: ROWS[this.raccoon.row] - 150 }
    const look = LOOKS[loc.at][id]
    return { x: look.x, y: look.y }
  }

  private cue(name: CueName, n = 0): void {
    this.cues.push({ name, n })
    // The farmer opens one eye at any loud noise.
    if (name === 'honk' || name === 'crash' || name === 'pluck') this.stir.noise = 0
  }

  private mark(level: Dirty): void {
    if (level > this.dirty) this.dirty = level
  }
}

export function sameLoc(a: Loc, b: Loc): boolean {
  if (a.at !== b.at) return false
  return a.at !== 'floor' || (b.at === 'floor' && a.x === b.x && a.row === b.row)
}
