import { BEATS, PLACES, TWIN_LAG, onBeat } from './beat'
import { LUMP, bodyOf, by, ghostAt, springHeight, zipOf, type Body } from './body'
import { cameraPose, catPose, neighbourPose, pigeonEyes, pigeonOut, pigeonPose, pigeonStand, pulse, ratPose, type Clock } from './cast'
import { BACKDROP, TEMPO, TIERS, type Tier } from './config'
import { CAT, FACES, NEIGHBOUR, PIECE_BOX, PIGEON, RAT, paintSprites, type Sprites } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import type { Point } from './input'
import { BEAT_LENGTH, BLOB, CAST, DIAL, PIECE, PIGEON_SCALE, PIPE, RACK, RELEASE, RING, SPRING, WALL, WINDOW, angleAt, boxOf, frame, onTrack, rackFoot, rackPoint, slotOf, uprightOn } from './layout'
import { KINDS, type Kind, type Span } from './pieces'
import type { Fit } from './stage'
import { PAINT, type Canvases, type Pen, type Sprite } from './stencil'
import { SLIDE, type Drop, type Fx, type Met, type Runner, type Toy } from './toy'
import { paintWall } from './wall'

// The view: one frame of the wall from the loop's numbers.
//
// What stands still is stamped once and kept: the wall; on a copy of it every
// piece that is at rest, and the rack (the set); and on a clear layer the size
// of the ring every spring that is at rest. A frame stamps the set and the
// springs whole, and then only what moves: the blobs, the cast, the controls,
// a spring that has just fired, a piece that has just been met, and what a
// touch leaves. When a spring or a piece starts or stops moving, the patch it
// stands on is put right, and nothing else is touched. So a full ring costs a
// frame no more than an empty one.
//
// The springs have a layer of their own so that they can leave together.
// When a touch ends a clear-out, the springs still on the wall drop at once:
// their layer becomes the thing that falls, stamped whole a little lower each
// frame until it is out of the frame, and an empty layer takes its place.
//
// Nothing is painted into a sprite in a frame: that happens when the surface
// is sized. The count a frame hands back (stamps, live strokes and fills, and
// what was put right in the set) is what the frame-budget test holds, and what
// the grown-up overlay shows as draw calls.

/**
 * Where the ghost hand shows its tap, by its fingertip: bare brick at the top left, between the camera and the ring.
 * The whole hand is on the stage there, and it is on nothing that answers as itself, on no patch of paint that could
 * be taken for a button, and not in the blob's way.
 */
export const HAND_AT = { x: 296, y: 30 } as const
/** The hand as drawn from its fingertip: how far it reaches to each side and downward, in stage units. */
export const HAND_SIZE = { left: 34, right: 62, down: 118 } as const

/** How long a piece goes on answering after it is met or set down, and a spring after it fires, ducks or is laid, in seconds. */
export const ANSWERS = { hit: 0.7, hum: 1.05, set: 0.4, fired: 0.7, ducked: 0.34, laid: 0.5 } as const

export type Drawn = {
  /** Sprites stamped onto the surface, and live strokes and fills made on it. */
  stamps: number
  strokes: number
  /** Draws made into the set to put a patch of it right. */
  layer: number
}

/** How far round its foot or its middle a thing of the set reaches, in stage units: the patch put right when it changes. */
const REACH = { spring: 52, piece: 68 } as const
/** Added to a piece's look in the set when it stands on a spring. */
const ON_SPRING = 8
/**
 * Once a frame has made this many draws into the set, what is still to be put right waits for the next frame. A thing
 * that waits is drawn live over the set meanwhile, exactly as it is, so the picture is never a frame behind.
 */
const SET_DRAWS_A_FRAME = 2
const ON_RACK = RACK.scale
/** A piece off the line is placed by its middle: its foot is this far below. */
const HELD = (PIECE.height / 2) * ON_RACK
/** How far the middle of a piece as drawn is ahead of its foot, at the size it has in the hand and on the rack: a wall's stub stands ahead of it. A piece in the hand, sliding or flying home is drawn with its middle under the finger, as it stands on the rack. */
const offCentre = (kind: Kind): number => ((boxOf(kind).from + boxOf(kind).to) / 2) * ON_RACK
const SPRINGS = PLACES * 2, SLOTS = BEATS * 2
/** The set holds 64 springs, 32 pieces and the 6 of the rack, in that order. */
const THINGS = SPRINGS + SLOTS + KINDS.length
const HALF = BLOB.size / 2
const MID = (RING.floor + RING.hub) / 2

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const ease = (t: number): number => {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}

export class View {
  private readonly pen: Pen
  private readonly make: Canvases
  private wall: HTMLCanvasElement | null = null
  private set: HTMLCanvasElement | null = null
  private setPen: Pen | null = null
  /** Two layers the size of the ring: one holds the springs at rest, and the other is empty or is falling. */
  private layers: HTMLCanvasElement[] = []
  private current = 0
  /** Where the layers lie on the surface, in pixels. */
  private box = { x: 0, y: 0, w: 0, h: 0 }
  /** The drop whose springs the other layer holds, and those of it that were moving when it began. */
  private falling: Drop | null = null
  private fallingLive: number[] = []
  private sprites: Sprites | null = null
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private ratio = 1
  private tier: Tier = TIERS[0]
  private readonly drawn: Drawn = { stamps: 0, strokes: 0, layer: 0 }
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** What of each thing is painted in the set (0: nothing), and what should be. */
  private readonly baked = new Uint8Array(THINGS)
  private readonly want = new Uint8Array(THINGS)
  /** The loop the set was last laid for: another loop (a load, a put-away) is laid whole. */
  private laidFor: Toy | null = null
  /** The pen in use: the surface's, or the set's or a layer's while a patch is put right. */
  private onto: Pen
  private counting: 'stamps' | 'layer' = 'stamps'
  /** How far the pen in use is shifted, in pixels: a layer's own corner. */
  private shift = { x: 0, y: 0 }

  constructor(canvas: HTMLCanvasElement, make: Canvases) {
    this.pen = canvas.getContext('2d')!
    this.onto = this.pen
    this.make = make
  }

  /** The tier's part of the drawing that is not the pixel ratio. */
  setTier(tier: Tier): void {
    this.tier = tier
  }

  /** The surface has a new size in CSS pixels, or a new pixel ratio: the wall and every sprite are painted again at that density. */
  resize(width: number, height: number, ratio: number): void {
    this.by = frame(width, height)
    this.ratio = ratio
    if (this.by.scale <= 0) return
    const density = ratio * this.by.scale
    this.wall = this.make(Math.round(width * ratio), Math.round(height * ratio))
    const pen = this.wall.getContext('2d')!
    pen.setTransform(density, 0, 0, density, ratio * this.by.x, ratio * this.by.y)
    // The wall goes on past the stage's edges on a surface of another shape.
    paintWall(pen, density, { left: -this.by.x / this.by.scale, top: -this.by.y / this.by.scale, right: (width - this.by.x) / this.by.scale, bottom: (height - this.by.y) / this.by.scale })
    this.set = this.make(this.wall.width, this.wall.height)
    this.setPen = this.set.getContext('2d')!
    // The springs' layers cover the ring and nothing else.
    const reach = RING.floor + RING.line, left = Math.floor((RING.x - reach) * density + ratio * this.by.x), top = Math.floor((RING.y - reach) * density + ratio * this.by.y)
    this.box = { x: left, y: top, w: Math.ceil((RING.x + reach) * density + ratio * this.by.x) - left, h: Math.ceil((RING.y + reach) * density + ratio * this.by.y) - top }
    this.layers = [this.make(this.box.w, this.box.h), this.make(this.box.w, this.box.h)]
    this.current = 0
    this.sprites = paintSprites(this.make, density)
    this.laidFor = null
  }

  /** A touch in the surface's CSS pixels, in stage units. */
  get fit(): Fit {
    return this.by
  }

  /**
   * Lays the set whole for a loop: the wall, and every spring and piece of it that is at rest. The Mount calls it
   * when a loop is loaded or put away and after the surface is sized, outside a frame; a frame only puts patches right.
   */
  lay(toy: Toy): void {
    if (!this.wall || !this.setPen || !this.sprites) return
    const pen = this.setPen
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.globalAlpha = 1
    pen.drawImage(this.wall, 0, 0)
    this.drawn.layer += 1
    this.wanted(toy)
    this.counting = 'layer'
    this.target(pen)
    for (let i = SPRINGS; i < THINGS; i++) {
      this.baked[i] = this.want[i]
      if (this.want[i]) this.thing(toy, i, this.want[i])
    }
    this.target(this.wiped(this.current))
    for (let i = 0; i < SPRINGS; i++) {
      this.baked[i] = this.want[i]
      if (this.want[i]) this.thing(toy, i, this.want[i])
    }
    // Springs that are falling together when the surface is sized are painted where they stood, to go on falling.
    this.falling = toy.dropping
    this.fallingLive = []
    if (toy.dropping) {
      this.target(this.wiped(1 - this.current))
      for (const sp of toy.dropping.places) this.spring(this.sprites!, sp, SPRING.height, 0, 0, 1)
    }
    this.target(null)
    this.counting = 'stamps'
    this.laidFor = toy
  }

  /** Points the drawing at the set, at a layer, or back at the surface. */
  private target(pen: Pen | null): void {
    this.onto = pen ?? this.pen
    const layer = pen !== null && pen !== this.setPen
    this.shift.x = layer ? this.box.x : 0
    this.shift.y = layer ? this.box.y : 0
  }

  /** A layer wiped clear, and its pen. */
  private wiped(index: number): Pen {
    const pen = this.layers[index].getContext('2d')!
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.clearRect(0, 0, this.box.w, this.box.h)
    this.drawn.layer += 1
    return pen
  }

  /** Draws the frame. With no loop yet (the slot is still being read) it is the bare wall. */
  draw(toy: Toy | null, guidance: Guidance | null): Drawn {
    const pen = this.pen, drawn = this.drawn
    drawn.stamps = 0
    drawn.strokes = 0
    drawn.layer = 0
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.globalAlpha = 1
    if (!this.wall || !this.set || !this.sprites) {
      pen.fillStyle = BACKDROP
      pen.fillRect(0, 0, pen.canvas.width, pen.canvas.height)
      return drawn
    }
    if (!toy) {
      pen.drawImage(this.wall, 0, 0)
      drawn.stamps += 1
      return drawn
    }
    if (this.laidFor !== toy) this.lay(toy)
    else this.settle(toy)
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.globalAlpha = 1
    pen.drawImage(this.set, 0, 0)
    pen.drawImage(this.layers[this.current], this.box.x, this.box.y)
    drawn.stamps += 2

    const s = this.sprites
    const bodies = toy.runners.map((r) => bodyOf(toy, r))
    const clock: Clock = { beats: toy.pos, seconds: toy.seconds, tempo: toy.tempo, blob: bodies[0] }

    this.marks(toy, s)
    this.trail(toy, s)
    // A lump in a pipe goes by behind whatever stands there: it is drawn first, and the pieces it passes after it.
    // So does a twin that is being drawn into a lump: it is in the pipe for as long as the lump is.
    const zips = toy.fx.filter((fx) => fx.kind === 'zip' && fx.lump).map((fx) => this.zip(s, fx, bodies[0]))
    for (let i = toy.runners.length - 1; i >= 0; i--) if (bodies[i].lump) this.blob(toy, s, toy.runners[i], bodies[i])
    this.live(toy, bodies, zips)
    this.camera(toy, s, clock)
    this.neighbour(toy, s, clock)
    this.rat(toy, s, clock)
    this.cat(toy, s, clock)
    this.pigeon(toy, s, clock)
    this.blobs(toy, s, bodies, guidance)
    this.controls(toy, s)
    this.effects(toy, s, bodies[0])
    this.falls(toy, s)
    if (toy.hand) {
      const hand = toy.hand, sway = Math.sin(toy.seconds * 9) * 0.08
      this.stamp(s.piece[hand.kind], hand.x - offCentre(hand.kind), hand.y + HELD, sway, ON_RACK, ON_RACK, 1)
    }
    if (guidance && guidance.glow > 0) {
      // The rack glows with the blob: the two things there are to touch.
      const mid = rackPoint(2.5)
      this.stamp(s.glow, mid.x, mid.y, 0, 3.6, 0.5, guidance.glow * (0.5 + 0.16 * Math.sin(toy.seconds * 4.2 + 1)))
    }
    if (guidance && guidance.demo !== null) {
      // The first showing is a tap on the wall. Every other one carries a piece from the rack to a beat.
      const carries = guidance.demoIndex % 2 === 1
      const pose = handPose(guidance.demo, carries, this.pose)
      const press = 1 - 0.12 * pose.press
      if (carries) {
        const from = rackPoint(HAND_CARRIES.rack), to = onTrack(HAND_CARRIES.beat, 14, false)
        const x = from.x + (to.x - from.x) * pose.travel, y = from.y + (to.y - from.y) * pose.travel
        if (pose.press > 0.5) this.stamp(s.piece[KINDS[HAND_CARRIES.rack]], x, y + HELD, 0, ON_RACK, ON_RACK, pose.opacity * 0.8)
        this.stamp(s.hand, x, y + 10 - 10 * pose.press, -0.2, press, press, pose.opacity * 0.92)
      } else this.stamp(s.hand, HAND_AT.x, HAND_AT.y + 10 - 10 * pose.press, -0.2, press, press, pose.opacity * 0.92)
    }
    return drawn
  }

  // --- The set ------------------------------------------------------------------

  /** What of each thing should be in the set now: nothing while it moves, and its look at rest otherwise. */
  private wanted(toy: Toy): void {
    const want = this.want
    want.fill(0)
    for (const sp of toy.standing()) {
      const slot = slotOf(Math.floor((sp % PLACES) / 2), sp >= PLACES)
      const under = onBeat(sp % PLACES) && toy.pieceIn(slot) !== undefined
      const still = toy.fired[sp] >= ANSWERS.fired && toy.ducked[sp] >= ANSWERS.ducked && toy.laid[sp] >= ANSWERS.laid && springHeight(toy, sp) === (under ? SPRING.pressed : SPRING.height)
      if (still) want[sp] = under ? 2 : 1
    }
    for (const [slot, kind] of toy.pieces) {
      const hit = toy.hits[slot]
      const still = toy.hand?.from !== slot && hit.age >= (kind === 'chime' ? ANSWERS.hum : ANSWERS.hit) && toy.set[slot] >= ANSWERS.set
      // A piece on a spring stands on the pressed coil: when the spring comes or goes, its look at rest is another,
      // and it is laid again where it now stands, at once.
      if (still) want[SPRINGS + slot] = KINDS.indexOf(kind) + 1 + (toy.holds((slot % BEATS) * 2 + (slot >= BEATS ? PLACES : 0)) ? ON_SPRING : 0)
    }
    for (let i = 0; i < KINDS.length; i++) if (toy.rack[i] >= ANSWERS.set) want[SPRINGS + SLOTS + i] = 1
  }

  /** The middle of the patch a thing of the set stands on, and how far the patch reaches. */
  private patch(i: number): { x: number; y: number; r: number } {
    if (i < SPRINGS) {
      const at = onTrack((i % PLACES) / 2, SPRING.height / 2, i >= PLACES)
      return { x: at.x, y: at.y, r: REACH.spring }
    }
    // A piece's sprite reaches further ahead of its foot than behind it, and upward: the patch is round its middle.
    const along = (PIECE_BOX.front - PIECE_BOX.back) / 2, up = (PIECE_BOX.up - PIECE_BOX.down) / 2
    if (i < SPRINGS + SLOTS) {
      const slot = i - SPRINGS, at = by(slot % BEATS, along, up + SPRING.pressed / 2, slot >= BEATS)
      return { x: at.x, y: at.y, r: REACH.piece }
    }
    return { x: rackFoot(i - SPRINGS - SLOTS).x + along * ON_RACK, y: RACK.y - up * ON_RACK, r: REACH.piece * ON_RACK }
  }

  /** Puts the set right where a thing has started or stopped moving, or has come or gone. */
  private settle(toy: Toy): void {
    const want = this.want, baked = this.baked
    this.counting = 'layer'
    if (toy.dropping !== this.falling) {
      this.falling = toy.dropping
      this.fallingLive = []
      if (toy.dropping) {
        // The springs still on the wall let go together: the layer that holds them is the thing that falls, and
        // an empty one takes its place. One that was moving is not on the layer, and falls beside it.
        for (const sp of toy.dropping.places) if (!baked[sp]) this.fallingLive.push(sp)
        this.current = 1 - this.current
        this.wiped(this.current)
        baked.fill(0, 0, SPRINGS)
      }
    }
    this.wanted(toy)
    const k = this.ratio * this.by.scale, ox = this.ratio * this.by.x, oy = this.ratio * this.by.y
    for (let i = 0; i < THINGS; i++) {
      if (want[i] === baked[i]) continue
      if (this.drawn.layer >= SET_DRAWS_A_FRAME) break
      // A spring is put right on the springs' layer, and a piece on the set. Neither reaches the other's.
      const spring = i < SPRINGS, pen = spring ? this.layers[this.current].getContext('2d')! : this.setPen!
      this.target(pen)
      const at = this.patch(i)
      // The patch in whole pixels, so that what is put back lands exactly on what was there.
      const x = Math.floor((at.x - at.r) * k + ox) - this.shift.x, y = Math.floor((at.y - at.r) * k + oy) - this.shift.y
      const w = Math.ceil((at.x + at.r) * k + ox) - this.shift.x - x, h = Math.ceil((at.y + at.r) * k + oy) - this.shift.y - y
      pen.save()
      pen.setTransform(1, 0, 0, 1, 0, 0)
      pen.globalAlpha = 1
      pen.beginPath()
      pen.rect(x, y, w, h)
      pen.clip()
      if (spring) pen.clearRect(x, y, w, h)
      else pen.drawImage(this.wall!, x, y, w, h, x, y, w, h)
      this.drawn.layer += 1
      // Everything at rest on the same layer that reaches into the patch goes back on, this thing with it if it is now at rest.
      for (let j = spring ? 0 : SPRINGS; j < (spring ? SPRINGS : THINGS); j++) {
        if (j === i ? !want[j] : !baked[j] || baked[j] !== want[j]) continue
        const other = j === i ? at : this.patch(j)
        const dx = Math.max(0, Math.abs(other.x - at.x) - at.r), dy = Math.max(0, Math.abs(other.y - at.y) - at.r)
        if (dx * dx + dy * dy >= other.r * other.r) continue
        this.thing(toy, j, want[j])
      }
      pen.restore()
      baked[i] = want[i]
    }
    this.target(null)
    this.counting = 'stamps'
  }

  /** One thing of the set at rest. */
  private thing(toy: Toy, i: number, look: number): void {
    const s = this.sprites!
    if (i < SPRINGS) this.spring(s, i, look === 2 ? SPRING.pressed : SPRING.height, 0, 0, 1)
    else if (i < SPRINGS + SLOTS) this.piece(s, toy, i - SPRINGS, KINDS[(look - 1) % ON_SPRING], null, Infinity)
    else {
      const at = rackFoot(i - SPRINGS - SLOTS)
      this.stamp(s.piece[KINDS[i - SPRINGS - SLOTS]], at.x, at.y, 0, ON_RACK, ON_RACK, 1)
    }
  }

  /** A spring at a place, `height` tall. `kick` stretches it, `duck` flattens it and `grown` is how far out of the line it has come. */
  private spring(s: Sprites, sp: number, height: number, kick: number, duck: number, grown: number, fallen = 0): void {
    const place = sp % PLACES, ceiling = sp >= PLACES, beats = place / 2, half = !onBeat(place)
    const foot = onTrack(beats, 0, ceiling), lean = ceiling ? -1 : 1
    foot.y += fallen
    // A spring on a half is the second colour, shorter, and leans the way the blob runs.
    const tall = (half ? 0.78 : 1) * (height / SPRING.height) * grown * (1 + 0.65 * kick) * (1 - 0.45 * duck)
    this.stamp(half ? s.springHalf : s.spring, foot.x, foot.y, uprightOn(beats, ceiling) + (half ? 0.26 * lean : 0), (1 + 0.1 * duck - 0.12 * kick) * lean, tall, 1)
  }

  /** A piece in its slot. `hit` is how it was last met and `age` how long ago; at rest there is neither. */
  private piece(s: Sprites, toy: Toy, slot: number, kind: Kind, hit: { way: Met; age: number } | null, set: number): void {
    const beat = slot % BEATS, ceiling = slot >= BEATS, lean = ceiling ? -1 : 1
    // On a spring it stands on the pressed coil.
    const lift = toy.holds(beat * 2 + (ceiling ? PLACES : 0)) ? SPRING.pressed : 0
    let turn = 0, wide = 1, tall = 1, along = 0
    if (hit) {
      const age = hit.age, soft = hit.way === 'hushed' ? 0.3 : 1, k = Math.exp(-age * 7) * soft, w = Math.sin(age * 34)
      if (kind === 'drum') {
        // It sinks under a run, kicks back under a landing, and swings where it hangs or was hit twice.
        if (hit.way === 'run') tall = 1 - 0.45 * pulse(age, 0.03, 0.06, 0.3)
        else tall = 1 + 0.3 * k * w
        if (hit.way === 'ceiling' || hit.way === 'twins') turn = (hit.way === 'twins' ? 0.3 : 0.22) * k * w
      } else if (kind === 'chime') {
        along = 2.5 * k * Math.sin(age * 70)
        if (hit.way === 'ceiling' || hit.way === 'twins') turn = (hit.way === 'twins' ? 0.3 : 0.24) * Math.exp(-age * 4) * Math.sin(age * 16)
      } else if (kind === 'flip') turn = -0.55 * soft * pulse(age, 0.04, 0.05, 0.3)
      else if (kind === 'splitter') {
        turn = 0.3 * k * Math.sin(age * 40)
        tall = 1 + 0.15 * k
      } else if (kind === 'tunnel') wide = tall = 1 + 0.25 * soft * pulse(age, 0.04, 0.04, 0.2)
      else {
        along = (hit.way === 'splat' ? 5 : 3) * k * Math.sin(age * 50)
        turn = 0.05 * k * w
      }
    }
    // Set down or nudged, it rocks where it stands.
    if (set < ANSWERS.set) turn += 0.25 * Math.exp(-set * 9) * Math.sin(set * 30)
    const foot = by(beat, along, lift, ceiling)
    // On the ceiling a piece is the mirror of itself on the floor, so that it still faces the blob that runs at it.
    // A flip is not mirrored: it is turned round with the surface, as a thing carried there would be, so that at
    // the top of the niche, where it stands the right way up, its tall end is the one the blob meets.
    const side = kind === 'flip' ? 1 : lean
    this.stamp(s.piece[kind], foot.x, foot.y, uprightOn(beat, ceiling) + turn * side, wide * side, tall, 1)
  }

  /** Every spring and piece that is moving, drawn live over the set. */
  private live(toy: Toy, bodies: readonly Body[], zips: readonly Body[]): void {
    const s = this.sprites!, baked = this.baked, want = this.want
    // A piece a lump is passing is drawn again over the lump, where it stands in the set.
    const passed = (slot: number): boolean => {
      for (let i = 0; i < bodies.length; i++) {
        const r = toy.runners[i]
        if (!bodies[i].lump || r.flight || r.ceiling !== slot >= BEATS) continue
        const apart = ((((slot % BEATS) - toy.at(r)) % BEATS) + BEATS + BEATS / 2) % BEATS - BEATS / 2
        if (Math.abs(apart) * (r.ceiling ? BEAT_LENGTH.ceiling : BEAT_LENGTH.floor) < HALF * Math.max(LUMP.wide, bodies[i].wide) + PIECE_BOX.front) return true
      }
      for (const zip of zips) {
        const ceiling = Math.hypot(zip.x - RING.x, zip.y - RING.y) < MID
        if (ceiling !== slot >= BEATS) continue
        const apart = ((((slot % BEATS) - this.beatsOf(zip)) % BEATS) + BEATS + BEATS / 2) % BEATS - BEATS / 2
        if (Math.abs(apart) * (ceiling ? BEAT_LENGTH.ceiling : BEAT_LENGTH.floor) < HALF * LUMP.wide + PIECE_BOX.front) return true
      }
      return false
    }
    for (const sp of toy.standing()) {
      if (baked[sp] && baked[sp] === want[sp]) continue
      const fired = toy.fired[sp], kick = fired < ANSWERS.fired ? Math.exp(-fired * 8) * Math.cos(fired * 30) : 0
      const duck = pulse(toy.ducked[sp], 0.04, 0.05, 0.25)
      const laid = toy.laid[sp], grown = laid < ANSWERS.laid ? 1 - Math.exp(-laid * 14) * Math.cos(laid * 20) : 1
      this.spring(s, sp, springHeight(toy, sp), kick, duck, grown)
    }
    for (const [slot, kind] of toy.pieces) {
      if (toy.hand?.from === slot) continue
      if (baked[SPRINGS + slot] && baked[SPRINGS + slot] === want[SPRINGS + slot] && !passed(slot)) continue
      this.piece(s, toy, slot, kind, toy.hits[slot], toy.set[slot])
    }
    for (let i = 0; i < KINDS.length; i++) {
      if (baked[SPRINGS + SLOTS + i] && baked[SPRINGS + SLOTS + i] === want[SPRINGS + SLOTS + i]) continue
      const at = rackFoot(i), age = toy.rack[i]
      this.stamp(s.piece[KINDS[i]], at.x, at.y, 0.2 * Math.exp(-age * 9) * Math.sin(age * 30), ON_RACK, ON_RACK * (1 + 0.2 * Math.exp(-age * 10) * Math.cos(age * 26)), 1)
    }
  }

  // --- The course ---------------------------------------------------------------

  /** The line lights under a landing, and under the beat a piece in the hand would go to. */
  private marks(toy: Toy, s: Sprites): void {
    const aimed = toy.aimed()
    if (aimed !== null) {
      const at = onTrack(aimed % BEATS, 8, aimed >= BEATS)
      this.stamp(s.flash, at.x, at.y, 0, 0.9, 0.9, 0.75)
    }
    if (!this.tier.dust) return
    for (let sp = 0; sp < toy.flashed.length; sp++) {
      const age = toy.flashed[sp]
      if (age > 0.32) continue
      const at = onTrack((sp % PLACES) / 2, -6, sp >= PLACES)
      this.stamp(s.flash, at.x, at.y, 0, 0.6 + age * 2.4, 0.6 + age * 2.4, 0.8 * (1 - age / 0.32))
    }
  }

  /** The blob's last positions, left on the wall as faint copies: the look's ghost, and the path of the last half beat. */
  private trail(toy: Toy, s: Sprites): void {
    const shown = Math.min(this.tier.ghosts, toy.ghosts.length)
    for (let i = toy.ghosts.length - shown; i < toy.ghosts.length; i++) {
      const ghost = toy.ghosts[i], lean = ghost.ceiling ? -1 : 1
      const at = ghostAt(toy, ghost)
      const newness = (i - (toy.ghosts.length - shown) + 1) / shown
      this.stamp(ghost.lift > 0 ? s.blob.air : s.blob.run, at.x, at.y, uprightOn(ghost.beats, ghost.ceiling) + ghost.turn * lean, lean, 1, 0.04 + 0.16 * newness * newness)
    }
  }

  /**
   * The pipe a hushed blob is in, from mouth to mouth, and across where a flip stands in it: a grey body the lump
   * shows through, and a harder line for its roof.
   */
  private pipe(spans: readonly Span[], alpha: number): void {
    if (spans.length === 0 || alpha <= 0.01) return
    for (const part of ['body', 'roof'] as const) {
      const lift = part === 'body' ? PIPE.roof / 2 : PIPE.roof
      const at = (ceiling: boolean) => (ceiling ? RING.hub + lift : RING.floor - lift)
      const pen = this.base()
      pen.globalAlpha = alpha * (part === 'body' ? 0.34 : 1)
      pen.strokeStyle = PAINT.grey
      pen.lineWidth = part === 'body' ? PIPE.roof - 6 : 5
      pen.lineCap = part === 'body' ? 'butt' : 'round'
      pen.lineJoin = 'round'
      pen.beginPath()
      for (const span of spans) {
        const from = angleAt(span.beat), to = angleAt(span.beat + 1), r = at(span.ceiling)
        pen.moveTo(RING.x + r * Math.cos(from), RING.y + r * Math.sin(from))
        if (span.cross) {
          const far = at(!span.ceiling)
          pen.lineTo(RING.x + far * Math.cos(to), RING.y + far * Math.sin(to))
        } else pen.arc(RING.x, RING.y, r, from, to, true)
      }
      pen.stroke()
      this.drawn.strokes += 1
    }
  }

  private blobs(toy: Toy, s: Sprites, bodies: readonly Body[], guidance: Guidance | null): void {
    if (guidance && guidance.glow > 0) this.stamp(s.glow, bodies[0].x, bodies[0].y, 0, 1.2, 1.2, guidance.glow * (0.62 + 0.2 * Math.sin(toy.seconds * 4.2)))
    // The twin first, so the blob is in front of it: a second colour printed a little off the first.
    for (let i = toy.runners.length - 1; i >= 0; i--) if (!bodies[i].lump) this.blob(toy, s, toy.runners[i], bodies[i])
    // The pipes go on over the lumps inside them and the pieces they pass. Two lumps in one pipe share it.
    let first: readonly Span[] | null = null
    for (const r of toy.runners) {
      if (!r.hushed || r.pipe.length === 0) continue
      if (first && first[0].beat === r.pipe[0].beat && first[0].ceiling === r.pipe[0].ceiling && first.length === r.pipe.length) continue
      this.pipe(r.pipe, 1)
      first ??= r.pipe
    }
  }

  private blob(toy: Toy, s: Sprites, r: Runner, body: Body): void {
    const flip = body.mirror ? -1 : 1
    if (r.twin && r.born === 'string' && r.lag < TWIN_LAG) {
      // Torn off on the ceiling, the twin hangs by a string of its own paint until it starts to run.
      const from = onTrack(toy.at(r), 0, true), pen = this.base()
      pen.strokeStyle = PAINT.teal
      pen.lineWidth = 2 + 4 * (1 - r.lag / TWIN_LAG)
      pen.lineCap = 'round'
      pen.beginPath()
      pen.moveTo(from.x, from.y)
      pen.lineTo(body.x, body.y)
      pen.stroke()
      this.drawn.strokes += 1
    }
    this.stamp((r.twin ? s.twin : s.blob)[body.face], body.x, body.y, body.turn, body.wide * flip, body.tall, body.lump ? 0.9 : 1)
    const face = FACES[body.face]
    if (!face.pupils) return
    // Its eyes look where it is going: along the line, the way it runs. Flat on something, they look two ways.
    const a = angleAt(toy.at(r)), cos = Math.cos(body.turn), sin = Math.sin(body.turn)
    const pen = this.base()
    pen.fillStyle = PAINT.black
    pen.beginPath()
    face.eyes.forEach((eye, i) => {
      const ex = eye.x * body.wide * flip, ey = eye.y * body.tall
      const way = body.face === 'flat' && i === 1 ? -1 : 1, reach = eye.r * 0.42
      const x = body.x + ex * cos - ey * sin + Math.sin(a) * reach * way, y = body.y + ex * sin + ey * cos - Math.cos(a) * reach * way
      pen.moveTo(x + eye.r * 0.45, y)
      pen.arc(x, y, eye.r * 0.45, 0, Math.PI * 2)
    })
    pen.fill()
    this.drawn.strokes += 1
  }

  // --- The cast -------------------------------------------------------------------

  private camera(toy: Toy, s: Sprites, clock: Clock): void {
    const pose = cameraPose(clock, toy.cast.camera), at = CAST.camera
    this.stamp(s.camera, at.x, at.y, pose.pan + pose.nod, 1, 1, 1)
    // Its lamp, on the box.
    const turn = pose.pan + pose.nod
    this.dot(at.x + 6 * Math.cos(turn) - 10 * Math.sin(turn), at.y + 6 * Math.sin(turn) + 10 * Math.cos(turn), 4.2, PAINT.hot, 0.35 + 0.65 * pose.lamp)
  }

  private neighbour(toy: Toy, s: Sprites, clock: Clock): void {
    const pose = neighbourPose(clock, toy.cast.neighbour), at = CAST.neighbour, w = WINDOW
    // Everything of the neighbour stays inside the window: ducked, it is behind the sill.
    const pen = this.base()
    pen.save()
    pen.beginPath()
    pen.rect(w.x, w.y, w.w, w.h)
    pen.clip()
    const x = at.x + 4 * Math.sin(pose.sway * 6), y = at.y + 120 * pose.duck
    this.stamp(s.neighbour.body, x, y, pose.sway, 1, 1, 1)
    this.stamp(s.neighbour.arm, x + NEIGHBOUR.elbow.x, y + NEIGHBOUR.elbow.y, pose.sway + 1.25 * pose.sip, 1, 1, 1)
    if (pose.blink < 0.5) {
      const cos = Math.cos(pose.sway), sin = Math.sin(pose.sway)
      this.dot(x + NEIGHBOUR.eye.x * cos - NEIGHBOUR.eye.y * sin - 2.5, y + NEIGHBOUR.eye.x * sin + NEIGHBOUR.eye.y * cos, 3.6, PAINT.black, 1)
    }
    this.stamp(s.neighbour.leaves, at.x + NEIGHBOUR.plant.x, at.y, pose.leaf, 1, 1, 1)
    // The curtain hangs bunched at one side, and is drawn across when the window is poked.
    this.stamp(s.neighbour.curtain, w.x + w.w, w.y + w.w / 2 + 14, 0, 0.3 + 1.05 * pose.curtain, (w.h - w.w / 2 - 14) / 198, 1)
    this.pen.restore()
  }

  private rat(toy: Toy, s: Sprites, clock: Clock): void {
    const pose = ratPose(clock, toy.cast.rat), x = CAST.rat.x, y = CAST.rat.y + pose.hop
    this.stamp(s.rat.tail, x + RAT.tail.x, y + RAT.tail.y, pose.tail, 1, 1, 1)
    this.stamp(s.rat.body, x, y, 0, pose.breath, 1, 1)
    this.stamp(s.rat.foot, x + RAT.heel.x, CAST.rat.y + RAT.heel.y + pose.hop * 0.4, -pose.foot, 1, 1, 1)
    this.stamp(s.rat.arm, x + RAT.shoulder.x, y + RAT.shoulder.y, pose.arm, 1, 1, 1)
    const nx = x + RAT.neck.x, ny = y + RAT.neck.y
    const cos = Math.cos(pose.nod), sin = Math.sin(pose.nod)
    const on = (p: { x: number; y: number }) => ({ x: nx + p.x * cos - p.y * sin, y: ny + p.x * sin + p.y * cos })
    this.stamp(s.rat.head, nx, ny, pose.nod, 1, 1, 1)
    const whiskers = on(RAT.whiskers)
    this.stamp(s.rat.whiskers, whiskers.x, whiskers.y, pose.nod + pose.whiskers, 1, 1, 1)
    if (pose.grin > 0.02) {
      const mouth = on(RAT.mouth)
      this.stamp(s.rat.grin, mouth.x, mouth.y, pose.nod, 1, pose.grin, 1)
    }
    const eye = on(RAT.eye)
    if (pose.blink > 0.5 && pose.wide < 0.2) this.dot(eye.x, eye.y, 11.5, PAINT.black, 1)
    else this.dot(eye.x + pose.look.x * 5, eye.y + pose.look.y * 3.6, 5 - 2 * pose.wide, PAINT.black, 1)
    // One cup of the headphones comes off its ear when the wall goes quiet; a poke knocks them down its head.
    if (pose.cup > 0.05) {
      // Its frown into the lifted cup: one brow comes down over the eye, lowest towards the nose.
      const inner = on({ x: RAT.eye.x + 13, y: RAT.eye.y - 8 + 3 * pose.cup }), outer = on({ x: RAT.eye.x - 13, y: RAT.eye.y - 16 }), pen = this.base()
      pen.globalAlpha = pose.cup
      pen.strokeStyle = PAINT.white
      pen.lineWidth = 4.5
      pen.lineCap = 'round'
      pen.beginPath()
      pen.moveTo(inner.x, inner.y)
      pen.lineTo(outer.x, outer.y)
      pen.stroke()
      this.drawn.strokes += 1
    }
    // The band's far end stays on its head, and the cup swings out from there.
    const worn = on({ x: RAT.cup.x, y: RAT.cup.y + pose.slip }), turn = pose.nod + pose.slip * 0.012, swung = turn + 0.5 * pose.cup
    const end = RAT.band, px = worn.x + end.x * Math.cos(turn) - end.y * Math.sin(turn), py = worn.y + end.x * Math.sin(turn) + end.y * Math.cos(turn)
    this.stamp(s.rat.phones, px - (end.x * Math.cos(swung) - end.y * Math.sin(swung)), py - (end.x * Math.sin(swung) + end.y * Math.cos(swung)), swung, 1, 1, 1)
  }

  private cat(toy: Toy, s: Sprites, clock: Clock): void {
    const pose = catPose(clock, toy.cast.cat), x = CAST.cat.x, y = CAST.cat.y
    const tx = x + CAT.tail.x, ty = y + CAT.tail.y
    this.stamp(s.cat.tail, tx, ty, pose.tail, 1, 1, 1)
    this.stamp(s.cat.tip, tx - Math.sin(pose.tail) * CAT.tip, ty + Math.cos(pose.tail) * CAT.tip, pose.tail + pose.tip, 1, 1, 1)
    if (pose.fur > 0.01) {
      // Its fur goes up from the neck back, and settles the same way, a tuft at a time.
      const tufts = [{ x: -22, y: -84, turn: -0.2 }, { x: 28, y: -96, turn: 0 }, { x: 78, y: -88, turn: 0.3 }]
      tufts.forEach((tuft, i) => {
        const up = Math.min(1, Math.max(0, pose.fur * 1.7 - i * 0.3))
        if (up > 0) this.stamp(s.cat.fur[i], x + tuft.x, y + tuft.y, tuft.turn, 1, up, 1)
      })
    }
    this.stamp(s.cat.body, x, y, 0, 1, pose.breath, 1)
    this.stamp(s.cat.paw, x + CAT.paw.x - 46 * pose.stretch, y + CAT.paw.y, 1.5 * pose.paw + 1.35 * pose.stretch, 1, 1, 1)
    const hx = x + CAT.head.x, hy = y + CAT.head.y - 3 * (pose.breath - 1) * 40
    this.stamp(s.cat.head, hx, hy, pose.head, 1, 1, 1)
    this.stamp(s.cat.ear, hx - 18, hy - 26, pose.head + pose.ear, 1, 1, 1)
    if (pose.yawn > 0.02) this.stamp(s.cat.yawn, hx, hy + 12, pose.head, 1, pose.yawn, 1)
    // Both eyes in one stroke or one fill: nearly shut they are arcs, as a sleeper's are; open, gold with a slit.
    const pen = this.base()
    pen.beginPath()
    if (pose.eye < 0.2) {
      pen.strokeStyle = PAINT.white
      pen.lineWidth = 3
      pen.lineCap = 'round'
      for (const side of [-1, 1]) {
        pen.moveTo(hx + side * 15 + 8 * Math.cos(0.25), hy - 5 + 8 * Math.sin(0.25))
        pen.arc(hx + side * 15, hy - 5, 8, 0.25, Math.PI - 0.25)
      }
      pen.stroke()
      this.drawn.strokes += 1
      return
    }
    pen.fillStyle = PAINT.gold
    for (const side of [-1, 1]) {
      pen.moveTo(hx + side * 15 + 9, hy - 3)
      pen.ellipse(hx + side * 15, hy - 3, 9, Math.max(0.5, 9 * pose.eye), 0, 0, Math.PI * 2)
    }
    pen.fill()
    pen.beginPath()
    pen.fillStyle = PAINT.black
    for (const side of [-1, 1]) {
      pen.moveTo(hx + side * 15 + 2.4 + 2 * pose.fur, hy - 3)
      pen.ellipse(hx + side * 15, hy - 3, 2.4 + 2 * pose.fur, Math.max(0.5, 8 * pose.eye), 0, 0, Math.PI * 2)
    }
    pen.fill()
    this.drawn.strokes += 2
  }

  private pigeon(toy: Toy, s: Sprites, clock: Clock): void {
    const lap = toy.flying(), pose = pigeonPose(clock, toy.cast.pigeon, lap), away = pigeonOut(pose, lap, toy.homing)
    // In its strut it rocks about the foot it stands on, and the other foot leaves the perch.
    const stand = pigeonStand(pose, PIGEON.feet)
    let k: number = PIGEON_SCALE, x = CAST.pigeon.x + stand.dx * k, y = CAST.pigeon.y + (pose.hop + stand.dy) * k, turn = pose.rock
    if (away) {
      // In its lap it is out of the niche: half its size, between the two lines, ahead of the blob. It comes home
      // in a curve, at the end of its lap and when a touch ends the lap early.
      const a = angleAt(away.beats), fx = RING.x + MID * Math.cos(a), fy = RING.y + MID * Math.sin(a)
      x += (fx - x) * away.out
      y += (fy - y) * away.out
      k = PIGEON_SCALE + (0.5 - PIGEON_SCALE) * away.out
      turn += uprightOn(away.beats, false) * away.out
    }
    const cosT = Math.cos(turn), sinT = Math.sin(turn)
    const from = (p: { x: number; y: number }) => ({ x: x + (p.x * cosT - p.y * sinT) * k, y: y + (p.x * sinT + p.y * cosT) * k })
    this.stamp(s.pigeon.body, x, y, turn, k * (1 + 0.07 * pose.puff), k * (1 + 0.04 * pose.puff) * (1 - 0.12 * pose.duck), 1)
    const shoulder = from({ x: PIGEON.shoulder.x, y: PIGEON.shoulder.y - 6 * pose.foot })
    this.stamp(s.pigeon.wing, shoulder.x, shoulder.y, turn + pose.wing, k, k, 1)
    const neck = from({ x: PIGEON.neck.x + pose.thrust + 5 * pose.puff, y: PIGEON.neck.y - pose.thrust * 0.25 + 26 * pose.duck })
    const tilt = turn + pose.tilt, cos = Math.cos(tilt), sin = Math.sin(tilt)
    const on = (p: { x: number; y: number }) => ({ x: neck.x + (p.x * cos - p.y * sin) * k, y: neck.y + (p.x * sin + p.y * cos) * k })
    const beak = on(PIGEON.beak)
    this.stamp(s.pigeon.beak, beak.x, beak.y, tilt + 0.5 * pose.beak, k, k, 1)
    this.stamp(s.pigeon.head, neck.x, neck.y, tilt, k, k, 1)
    // Its two eyes, in one fill. Shut, each is covered whole. Open, each has a pupil that looks where the pose says:
    // both at the blob, at each other when it cannot keep up, or one each way when twins are thrown apart.
    const looks = pigeonEyes(pose), shut = pose.blink > 0.5, pen = this.base()
    pen.fillStyle = PAINT.black
    pen.beginPath()
    PIGEON.eyes.forEach((eye, i) => {
      const at = on(eye), reach = eye.r * 0.46 * k * (1 - pose.stare), r = shut ? (eye.r + 0.5) * k : eye.r * (0.46 - 0.16 * pose.stare) * k
      const px = shut ? at.x : at.x + (looks[i].x * cos - looks[i].y * sin) * reach, py = shut ? at.y : at.y + (looks[i].x * sin + looks[i].y * cos) * reach
      pen.moveTo(px + r, py)
      pen.arc(px, py, r, 0, Math.PI * 2)
    })
    pen.fill()
    this.drawn.strokes += 1
    // A piece let go on it is a hat until its next bob.
    const hat = toy.cast.pigeon.hat
    if (hat) {
      const top = on({ x: 26, y: -66 })
      this.stamp(s.piece[hat], top.x, top.y, tilt - 0.12, 0.9, 0.9, 1)
    }
  }

  // --- The controls and what a touch leaves ---------------------------------------

  private controls(toy: Toy, s: Sprites): void {
    const release = toy.release, grip = toy.gripAt()
    const gx = RELEASE.x + grip.sway, gy = RELEASE.rest + grip.drop
    for (const [colour, width] of [[PAINT.white, 8], [PAINT.black, 4.5]] as const) {
      const pen = this.base()
      pen.strokeStyle = colour
      pen.lineWidth = width
      pen.lineCap = 'round'
      pen.beginPath()
      pen.moveTo(RELEASE.x, RELEASE.top)
      pen.quadraticCurveTo(RELEASE.x + grip.sway * 0.3, (RELEASE.top + gy) / 2, gx, gy - RELEASE.r + 4)
      pen.stroke()
      this.drawn.strokes += 1
    }
    const grab = release.held ? 1.08 : 1
    this.stamp(s.grip, gx, gy, grip.sway * 0.012, grab, grab, 1)

    const turn = DIAL.from + ((toy.tempo - TEMPO.slowest) / (TEMPO.fastest - TEMPO.slowest)) * (DIAL.to - DIAL.from) + toy.dial.wobble.value * 0.25
    const held = toy.dial.held ? 1.04 : 1
    this.stamp(s.knob, DIAL.x, DIAL.y, turn, held, held, 1)
  }

  private effects(toy: Toy, s: Sprites, blob: Body): void {
    for (const fx of toy.fx) {
      const t = fx.age / fx.life
      switch (fx.kind) {
        case 'burst': {
          const size = 0.5 + 0.5 * Math.min(1, fx.age / 0.07)
          this.stamp(fx.half ? s.burstHalf : s.burst, fx.x, fx.y, fx.turn, size, size, 0.85 * (1 - t) ** 1.4)
          break
        }
        case 'dust':
          if (this.tier.dust) this.stamp(s.dust, fx.x, fx.y, this.upright(fx), 0.7 + t * 0.9, 0.7 + t * 0.5, 0.9 * (1 - t))
          break
        case 'flecks':
          this.stamp(s.flecks, fx.x, fx.y, this.upright(fx), 0.6 + t * 0.9, 0.6 + t * 0.7, 1 - t)
          break
        case 'feather':
          this.stamp(s.feather, fx.x + 10 * Math.sin(fx.age * 5), fx.y, fx.turn + 0.5 * Math.sin(fx.age * 5), 1, 1, Math.min(1, (1 - t) * 3))
          break
        case 'puff':
          this.stamp(s.puff, fx.x, fx.y, 0, 0.5 + t, 0.5 + t, 0.8 * (1 - t))
          break
        case 'hum':
          this.stamp(s.flash, fx.x, fx.y, 0, 0.7, 0.7, 0.5 * (1 - t) * (0.6 + 0.4 * Math.sin(fx.age * 40)))
          break
        case 'drip':
          this.oval(fx.x, fx.y, 2.6, 4.6, fx.half ? PAINT.teal : PAINT.hot, 1 - t * 0.5)
          break
        case 'print': {
          // The blob's print on the wall it hit, fading.
          const ceiling = fx.vy > 0, at = by(fx.vx, WALL.ahead - WALL.thick / 2 - HALF * 0.4, HALF * 1.45, ceiling)
          this.stamp(s.blob.flat, at.x, at.y, uprightOn(fx.vx, ceiling), ceiling ? -0.4 : 0.4, 1.45, 0.34 * (1 - t))
          break
        }
        case 'smear':
          this.stamp(s.smear, fx.x, fx.y, 0, 1, Math.min(1, fx.age / 0.75), 0.9 * (1 - t * t))
          break
        case 'slide':
          // It sticks where it was let go for a moment, and then slides.
          if (fx.piece) this.stamp(s.piece[fx.piece], fx.x - offCentre(fx.piece), fx.y + HELD + SLIDE * ease((t - 0.25) / 0.75), 0.1 * Math.sin(fx.age * 20) * (1 - t), ON_RACK, ON_RACK, 1)
          break
        case 'home': {
          // Home to the rack in an arc, turning over as it goes.
          if (!fx.piece) break
          const e = ease(t), x = fx.x + ((fx.tx ?? fx.x) - fx.x) * e, y = fx.y + ((fx.ty ?? fx.y) - fx.y) * e - 60 * Math.sin(Math.PI * e)
          this.stamp(s.piece[fx.piece], x - offCentre(fx.piece), y + HELD, fx.spin * (1 - e) * Math.PI * 0.4, ON_RACK, ON_RACK, 1)
          break
        }
        case 'sniffed':
          if (fx.piece) this.stamp(s.piece[fx.piece], fx.x - offCentre(fx.piece) + 2 * Math.sin(fx.age * 40), fx.y + HELD, 0, ON_RACK, ON_RACK, 1)
          break
        case 'zip':
          // The twin is drawn into the blob. One that is a lump in a pipe was drawn with the lumps, under the pipe.
          if (!fx.lump) this.zip(s, fx, blob)
          break
        case 'bulge':
        case 'dent': {
          // The pipe's roof swells over a drum, or is knocked in over a wall, and comes back.
          const out = (fx.kind === 'bulge' ? 1 : -1) * Math.sin(Math.PI * t), ceiling = Math.hypot(fx.x - RING.x, fx.y - RING.y) < MID
          const beats = this.beatsOf(fx), top = by(beats, 0, PIPE.roof + 12 * out, ceiling), a = by(beats, -22, PIPE.roof, ceiling), b = by(beats, 22, PIPE.roof, ceiling)
          const pen = this.base()
          pen.strokeStyle = PAINT.grey
          pen.lineWidth = 6
          pen.lineCap = 'round'
          pen.beginPath()
          pen.moveTo(a.x, a.y)
          pen.quadraticCurveTo(top.x, top.y, b.x, b.y)
          pen.stroke()
          this.drawn.strokes += 1
          break
        }
        case 'pipe':
          if (fx.spans) this.pipe(fx.spans, 1 - t)
          break
        case 'hat':
          break
        default:
          fx.kind satisfies never
      }
    }
  }

  /** What has come off the wall and is falling out of the frame: each spring of a clear-out, and the layer of those a touch dropped together. */
  private falls(toy: Toy, s: Sprites): void {
    for (const faller of toy.fallers) this.stamp(faller.half ? s.springHalf : s.spring, faller.x, faller.y, faller.turn, 1, faller.half ? 0.78 : 1, 1)
    const drop = toy.dropping
    if (!drop || drop !== this.falling) return
    const pen = this.pen
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.globalAlpha = 1
    pen.drawImage(this.layers[1 - this.current], this.box.x, this.box.y + drop.y * this.ratio * this.by.scale)
    this.drawn.stamps += 1
    for (const sp of this.fallingLive) this.spring(s, sp, SPRING.height, 0, 0, 1, drop.y)
  }

  /** A twin on its way into the blob: a lump for as long as it is in a pipe, as hushed as a lump is drawn. */
  private zip(s: Sprites, fx: Fx, blob: Body): Body {
    const zip = zipOf(fx, blob)
    this.stamp(s.twin.flat, zip.x, zip.y, zip.turn, zip.wide * (zip.mirror ? -1 : 1), zip.tall, (zip.lump ? 0.9 : 1) * (1 - 0.4 * ease(fx.age / fx.life)))
    return zip
  }

  /** Where round the lap a short-lived thing is, in beats. */
  private beatsOf(fx: { x: number; y: number }): number {
    return ((Math.PI / 2 - Math.atan2(fx.y - RING.y, fx.x - RING.x)) / (Math.PI * 2)) * BEATS
  }

  /** How a thing knocked off a surface at a point stands: feet to the surface it is nearer. */
  private upright(fx: Fx): number {
    return uprightOn(this.beatsOf(fx), Math.hypot(fx.x - RING.x, fx.y - RING.y) < MID)
  }

  // --- Drawing -----------------------------------------------------------------------

  /** The pen in use with its transform set to the stage: stage units in, pixels out. */
  private base(): Pen {
    const pen = this.onto, k = this.ratio * this.by.scale
    pen.setTransform(k, 0, 0, k, this.ratio * this.by.x - this.shift.x, this.ratio * this.by.y - this.shift.y)
    pen.globalAlpha = 1
    return pen
  }

  private stamp(sprite: Sprite, x: number, y: number, turn: number, wide: number, tall: number, alpha: number): void {
    if (alpha <= 0.003) return
    const pen = this.base()
    pen.translate(x, y)
    if (turn !== 0) pen.rotate(turn)
    if (wide !== 1 || tall !== 1) pen.scale(wide, tall)
    pen.globalAlpha = Math.min(1, alpha)
    pen.drawImage(sprite.image, -sprite.ox, -sprite.oy, sprite.w, sprite.h)
    this.drawn[this.counting] += 1
  }

  private dot(x: number, y: number, r: number, colour: string, alpha: number): void {
    this.oval(x, y, r, r, colour, alpha)
  }

  private oval(x: number, y: number, rx: number, ry: number, colour: string, alpha = 1): void {
    const pen = this.base()
    pen.globalAlpha = alpha
    pen.fillStyle = colour
    pen.beginPath()
    pen.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2)
    pen.fill()
    this.drawn.strokes += 1
  }
}

/** What the ghost hand carries when it shows a drag: the drum from the rack to a beat at the bottom of the ring. */
export const HAND_CARRIES = { rack: 0, beat: 15 } as const

/** A point of the wall, for the tests that hold where the hand goes. */
export type Place = Point
