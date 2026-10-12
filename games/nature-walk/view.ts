import { BIRD_ART, CLOUD_ART, HAND_ART, HEDGEHOG as HOG_ART, JAY as JAY_ART, NEST_ART, SLAB_ART, SUN_ART, TOAD as TOAD_ART, TOAD_MINI, WHEEL_ART, type Part } from './animalArt'
import type { Go } from './cells'
import type { Tier } from './config'
import { CHIP_ART, COVER_ART, GLOW_BOX, paintGlow } from './coverArt'
import { FIND_ART, type FindArtKey } from './findArt'
import { handPose, type Guidance, type HandPose } from './guidance'
import { DOOR, HANGERS, HEDGEHOG, NEST, SLAB, SPOTS, STONE_SPOT, TOAD_SCALE, WHEEL, type P } from './layout'
import { coverPose, lerp, type FindPose } from './motion'
import { BURNT, ENGRAVE, SCORCH, WOOD, lightFor, type Box, type G } from './ply'
import { findPose, flipOf, gaze, hangerAngle, hedgehogPose, holeOf, jayPose, knuckleOf, shinySpot, slabTilt, slideOf, toadPose, toadWant, wakeOf, wheelAngle, wormSpot } from './poses'
import { ROOM_DOOR } from './room'
import { DOORWAY_ART, DOORWAY_AT, LAMP, LAMP_ART, WINDOW_ART, WINDOW_AT, paintRoom } from './roomArt'
import { BACK_FOOT, HILLS, STRIP, paintScenery, paintSky, paintStrip } from './scenery'
import { SEASONAL } from './seasonal'
import { Sprites, type MakeSheet } from './sprites'
import { fit } from './stage'
import { invitation, type Invitation } from './step'
import { FOUND, MINI, biteShows, drawn, jayAway, leafNow, miniSpot, pairsOf, type Drawn } from './things'
import { acting, amount, isWet, landed, moving, progress, seconds, stirOf, tuckAt, type Toy } from './toy'
import { SEASONS, THINGS, type FindId, type PlaceId, type ThingId } from './wood'

// The one place the game draws. A frame of the wood is the back board
// stamped whole, the two sheets of hills, the rest of the scenery stamped
// whole, then the stained pieces, the animals, the covers, what is under
// them and the six things, each a stamp of a piece painted once, the strip
// of blades at the front, and a few live strokes for what must change shape:
// pupils, mouths, threads, the snail's horns, ripples, gloss and dust.
// `draws` is the count of those stamps and strokes, which is what the
// frame-budget test counts and what the grown-up overlay shows.
// Every piece throws its shadow the one way, down and to the right, and shows
// the thickness of its sheet on that side, however it is turned or mirrored:
// `put` asks how the piece stands and stamps the painting of it made for
// that way of the light (ply.ts).
// There are two frames, the wood and the room at the table. One is on
// screen, and while the view slides between them both are. A thing in the
// hand is drawn last and outside both, so it stays under the finger while
// the frames slide.

export type Frame = { toy: Toy | null; guidance: Guidance | null; tier: Tier }

const TAU = Math.PI * 2
/** Back to front: a cover nearer the child is drawn over one further off. */
const ORDER: readonly PlaceId[] = ['branch', 'burrow', 'log', 'grass', 'stone', 'puddle']
/** The pairs whose first thing is drawn over the second: it lies on it or goes through it. */
const OVER: ReadonlySet<string> = new Set(['worm+snail', 'worm+button', 'feather+button', 'snail+acorn', 'acorn+button'])
const NO_POSE: HandPose = { travel: 0, press: 0, opacity: 0 }
const WHEEL_SPOT = { ...WHEEL }
const DOOR_SPOT = { ...ROOM_DOOR }
const HOUSE_SPOT = { ...DOOR }

/** Where the toad's feet are when he shows through the door of the house, and at what share of the size he was cut at: he fills the doorway from side to side. */
export const TOAD_IN_DOOR = { x: 1122, y: 468, scale: 0.4 } as const

/** How many sheets of the coming season are painted ahead in one frame of the turning year. */
const WARMED = 2
/**
 * How much the store of painted sheets may hold, in surfaces: this many times the pixels of the surface. At
 * 1180 by 820 and pixel ratio 2 a surface is 3.87 megapixels, so the store is trimmed to 20 at the end of a
 * frame; what one frame stamps is never let go, and the frames of the turning year stamp more than that.
 */
export const HELD = 5.9

/** A piece to stamp: its name in the store, the box of its own units, and how it is painted. */
type Piece = { key: string; box: Box; paint: (g: G, grain: boolean) => void }

export class View {
  draws = 0
  readonly sprites: Sprites
  /** The seasons whose sides are kept: the one that shows, and while the year turns the one it turns from. The others are let go. */
  private keptSeasons = ''
  private readonly pieces = new Map<string, Piece>()
  private readonly hand: HandPose = { ...NO_POSE }

  constructor(make: MakeSheet) {
    this.sprites = new Sprites(make)
  }

  /** Draws one frame onto a surface of `width` by `height` CSS pixels at pixel ratio `dpr`. Returns the draws it made. */
  draw(g: G, width: number, height: number, dpr: number, frame: Frame): number {
    this.draws = 0
    const by = fit(width, height)
    if (by.scale <= 0) return 0
    const k = dpr * by.scale
    this.sprites.begin(k, frame.tier.grain)

    // The whole surface in stage units: the scenery is painted to fill it, past the stage's own edges.
    const left = -by.x / by.scale, top = -by.y / by.scale, wide = width / by.scale
    const box: Box = [Math.floor(left) - 1, Math.floor(top) - 1, Math.ceil(left + wide) + 1, Math.ceil(top + height / by.scale) + 1]

    const toy = frame.toy, slide = toy ? slideOf(toy) : 0
    if (toy) {
      const turning = acting(toy, 'wheel', 'turn') !== null, keep = turning ? [toy.turnedFrom, toy.season] : [toy.season]
      if (keep.join() !== this.keptSeasons) { this.keptSeasons = keep.join(); this.sprites.keepSeasons(keep, SEASONS) }
    }
    const asked = toy && frame.guidance && frame.guidance.glow > 0 ? invitation(toy, WHEEL_SPOT, DOOR_SPOT, frame.guidance.demoIndex, HOUSE_SPOT) : null
    // The wood slides out to the left as the room comes in from the right, a whole surface apart.
    if (slide < 1) {
      g.setTransform(k, 0, 0, k, dpr * by.x - slide * wide * k, dpr * by.y)
      // The back board shows only above the path: it is stamped no further down than the sheets in front of it reach.
      const back: Box = [box[0], box[1], box[2], BACK_FOOT]
      this.whole(g, 'sky', back, (sheet, grain) => paintSky(sheet, back, grain))
      if (toy) {
        this.hills(g, toy, box)
        this.whole(g, 'scenery', box, (sheet, grain) => paintScenery(sheet, box, grain))
        this.wood(g, toy, frame, toy.room ? null : asked, box)
      } else {
        // Before the saved state has been read nothing of the wood shows, so nothing shows half-drawn: the back
        // board only, bare below where its sheet ends. The whole wood comes in the frame the state is read.
        g.fillStyle = WOOD.board.fill
        g.fillRect(box[0], BACK_FOOT - 1, box[2] - box[0], box[3] - BACK_FOOT + 1)
        this.draws += 1
      }
    }
    if (toy && slide > 0) {
      g.setTransform(k, 0, 0, k, dpr * by.x + (1 - slide) * wide * k, dpr * by.y)
      this.whole(g, 'room', box, (sheet, grain) => paintRoom(sheet, box, grain))
      this.room(g, toy, frame, toy.room ? asked : null)
    }
    // The thing in the hand is under the finger, which is on the glass and not in either frame: it does not slide.
    if (toy?.hand?.carried) {
      const seen = drawn(toy, toy.hand.thing)
      g.setTransform(k, 0, 0, k, dpr * by.x, dpr * by.y)
      if (seen?.inHand) this.thing(g, toy, toy.hand.thing, seen)
    }
    this.sprites.end(HELD * width * dpr * height * dpr)
    return this.draws
  }

  /** A sheet that fills the surface, stamped whole. */
  private whole(g: G, key: string, box: Box, paint: (g: G, grain: boolean) => void): void {
    const sheet = this.sprites.get(key, box, paint)
    g.drawImage(sheet.sheet.image, sheet.x, sheet.y, sheet.w, sheet.h)
    this.draws += 1
  }

  /** A strip of a sheet as wide as the surface, squeezed about a level as it flips over to its next season's side. */
  private band(g: G, key: string, box: Box, paint: (g: G, grain: boolean) => void, level: number, flat: number): void {
    const sheet = this.sprites.get(key, box, paint)
    g.save()
    g.translate(0, level)
    g.scale(1, Math.max(0.03, flat))
    g.translate(0, -level)
    g.drawImage(sheet.sheet.image, sheet.x, sheet.y, sheet.w, sheet.h)
    g.restore()
    this.draws += 1
  }

  /** The two sheets of hills and the meadow in front of them, each showing its season's side. */
  private hills(g: G, toy: Toy, box: Box): void {
    for (const hill of HILLS) {
      const { season, flat } = flipOf(toy, hill)
      this.band(g, `hill:${hill.key}:${season}`, [box[0], hill.top, box[2], hill.bottom], (sheet, grain) => hill.paint(sheet, season, grain), hill.foot, flat)
    }
  }

  /** The two halves of the strip of blades at the very front: the name of each, the box it is painted in, and where it stands in the wave of the turning year. */
  private halves(box: Box): readonly { name: string; box: Box; x: number }[] {
    const foot = Math.max(box[3], STRIP.level + 40)
    return [{ name: 'l', box: [box[0], STRIP.top, STRIP.seam, foot], x: STRIP.seam / 2 }, { name: 'r', box: [STRIP.seam, STRIP.top, box[2], foot], x: STRIP.seam * 1.5 }]
  }

  /** The strip of blades at the very front, in its two halves, each showing its season's side. */
  private strip(g: G, toy: Toy, box: Box): void {
    for (const half of this.halves(box)) {
      const { season, flat } = flipOf(toy, half)
      this.band(g, `strip:${half.name}:${season}`, half.box, (sheet, grain) => paintStrip(sheet, season, grain), STRIP.level, flat)
    }
  }

  /**
   * While the year turns, the coming season's side of each sheet is painted ahead of its flip, a few in a frame,
   * so that a touch that ends the turn at once does not have every one of them to paint in the frame it lands.
   */
  private warm(toy: Toy, box: Box): void {
    const season = toy.season, upright = lightFor(1, 0, 0, 1)
    let left = WARMED
    for (const hill of HILLS) {
      if (left === 0) return
      const name = `hill:${hill.key}:${season}`, band: Box = [box[0], hill.top, box[2], hill.bottom]
      if (!this.sprites.has(name, band)) left -= 1
      this.sprites.get(name, band, (sheet, grain) => hill.paint(sheet, season, grain))
    }
    for (const half of this.halves(box)) {
      if (left === 0) return
      const name = `strip:${half.name}:${season}`
      if (!this.sprites.has(name, half.box)) left -= 1
      this.sprites.get(name, half.box, (sheet, grain) => paintStrip(sheet, season, grain))
    }
    for (const piece of SEASONAL) {
      if (left === 0) return
      const name = `${piece.key}:${season}`
      if (!this.sprites.has(name, piece.box, upright)) left -= 1
      this.sprites.get(name, piece.box, (sheet, grain) => piece.paint(sheet, season, grain), upright)
    }
  }

  // --- The two frames ---------------------------------------------------------------

  private stained(g: G, toy: Toy, front: boolean): void {
    for (const piece of SEASONAL) {
      if (Boolean(piece.front) !== front) continue
      const { season, flat } = flipOf(toy, piece), thin = Math.max(0.03, flat)
      this.put(g, this.piece(`${piece.key}:${season}`, piece.box, () => (sheet, grain) => piece.paint(sheet, season, grain)), piece.x, piece.y, 0, piece.flip === 'x' ? thin : 1, piece.flip === 'y' ? thin : 1)
    }
  }

  private wood(g: G, toy: Toy, frame: Frame, asked: Invitation | null, box: Box): void {
    const glow = asked ? frame.guidance!.glow : 0, breath = 0.65 + 0.35 * Math.sin(toy.time * 3)
    if (acting(toy, 'wheel', 'turn')) this.warm(toy, box)
    // What is on the table at home shows through the door of the house, small with the distance: the toad when he
    // sits there, all of him and plain to see, and the things in front of him.
    const toad = toadPose(toy)
    if (toad.room) this.put(g, this.part('toad:mini', TOAD_MINI), TOAD_IN_DOOR.x, TOAD_IN_DOOR.y, 0, TOAD_IN_DOOR.scale, TOAD_IN_DOOR.scale * toad.sy)
    for (const thing of THINGS) {
      const spot = miniSpot(toy, thing), act = acting(toy, `thing:${thing}`)
      if (!spot || (act && !act.room) || (toy.hand?.carried && toy.hand.thing === thing)) continue
      this.put(g, this.find(thing === 'snail' ? 'snailShell' : thing), spot.x, spot.y, 0, MINI, MINI)
      if (thing === 'acorn') this.put(g, this.find('acornCap'), spot.x, spot.y, 0, MINI, MINI)
    }
    this.stained(g, toy, false)
    this.hangers(g, toy)
    for (const spot of asked?.spots ?? []) this.glow(g, spot.x, spot.y, spot.r / 84, glow * breath)
    this.put(g, this.part('wheel', WHEEL_ART), WHEEL.x, WHEEL.y, wheelAngle(toy))

    const things = THINGS.map((thing) => ({ thing, at: drawn(toy, thing) })).filter((entry): entry is { thing: ThingId; at: Drawn } => entry.at !== null && !entry.at.room && !entry.at.inHand && entry.at.pose.show > 0)
    const where = (thing: ThingId): string => toy.things[thing].at
    // The worm with its head tucked under the stone or the long grass is drawn before that cover, so the cover lies over its head.
    const worm = toy.things.worm, tuck = worm.at === 'path' ? tuckAt(toy, worm) : null
    const under = tuck === 'stone' || tuck === 'grass' ? things.find((entry) => entry.thing === 'worm') : undefined
    // What is in the nest shows over its rim: it is drawn first, and the nest in front of it.
    for (const entry of things) if (where(entry.thing) === 'nest' && !moving(toy, `thing:${entry.thing}`)) this.thing(g, toy, entry.thing, entry.at)
    const away = jayAway(toy) > 0.02
    this.nest(g, toy)
    if (!away) this.jay(g, toy)
    this.put(g, this.part('slab', SLAB_ART), SLAB.x, SLAB.y, slabTilt(toy))

    for (const place of ORDER) {
      const spots = SPOTS[place], lit = asked && asked.covers.includes(place) ? glow * breath : 0
      if (lit > 0) this.glow(g, spots.shut.x, spots.shut.y, spots.shut.r / 84, lit)
      const dweller = findPose(toy, place)
      if (dweller?.shown) this.dweller(g, toy, place, dweller.find, dweller.pose, dweller.fade)
      // A thing that is at home here lies under its cover, as the thing it is.
      for (const entry of things) if (where(entry.thing) === 'home' && entry.at.scale === FOUND && !entry.at.inHand && near(entry.at.at, spots.find) < 120 && !moving(toy, `thing:${entry.thing}`)) this.thing(g, toy, entry.thing, entry.at)
      if (under && place === tuck) this.thing(g, toy, 'worm', under.at)
      this.cover(g, toy, place, 1 + 0.035 * lit)
      for (const entry of things) if (where(entry.thing) === 'home' && !entry.at.inHand && near(entry.at.at, spots.find) < 120 && moving(toy, `thing:${entry.thing}`)) this.thing(g, toy, entry.thing, entry.at)
    }

    this.trail(g, toy)
    // The hole the worm dived into, between the hedgehog's paws: he stares at it.
    const hole = holeOf(toy)
    if (hole) this.live(g, (h) => h.ellipse(hole.at.x, hole.at.y, 21 * hole.open, 8 * hole.open, 0, 0, TAU), { fill: '#2f1b0d', line: BURNT, width: 1.6 })
    this.hedgehog(g, toy)
    if (!toad.room) this.toad(g, toy, toad)
    this.water(g, toy, false)
    const loose = things.filter((entry) => entry !== under && where(entry.thing) !== 'home' && (where(entry.thing) !== 'nest' || moving(toy, `thing:${entry.thing}`))).sort((a, b) => a.at.at.y - b.at.at.y)
    for (const entry of loose) this.thing(g, toy, entry.thing, entry.at)
    if (away) this.jay(g, toy)
    // The front sheet: the strip of blades, over whatever lies at the front of the path, and the patches on it.
    this.strip(g, toy, box)
    this.stained(g, toy, true)
    if (!toy.room) { this.knock(g, toy, frame.tier.dust); if (asked) this.ghost(g, toy, asked, frame.guidance!) }
  }

  private room(g: G, toy: Toy, frame: Frame, asked: Invitation | null): void {
    const glow = asked ? frame.guidance!.glow : 0, breath = 0.65 + 0.35 * Math.sin(toy.time * 3)
    const season = toy.season
    this.put(g, this.piece(`window:${season}`, WINDOW_ART.box, () => (sheet, grain) => WINDOW_ART.paint(sheet, season, grain)), WINDOW_AT.x, WINDOW_AT.y)
    this.put(g, this.piece(`doorway:${season}`, DOORWAY_ART.box, () => (sheet, grain) => DOORWAY_ART.paint(sheet, season, grain)), DOORWAY_AT.x, DOORWAY_AT.y)
    // The lamp on its cord: the one hanging piece of the room, which a knock sets swinging.
    const swing = hangerAngle(toy, HANGERS.length), pin = LAMP.y - LAMP.thread
    const end = { x: LAMP.x + Math.sin(swing) * LAMP.thread, y: pin + Math.cos(swing) * LAMP.thread }
    this.live(g, (h) => { h.moveTo(LAMP.x, pin); h.lineTo(end.x, end.y) }, { line: ENGRAVE, width: 2, alpha: 0.9 })
    this.put(g, this.part('lamp', LAMP_ART), end.x, end.y, -swing)
    for (const spot of asked?.spots ?? []) this.glow(g, spot.x, spot.y, spot.r / 84, glow * breath)
    this.water(g, toy, true)
    const things = THINGS.map((thing) => ({ thing, at: drawn(toy, thing) })).filter((entry): entry is { thing: ThingId; at: Drawn } => entry.at !== null && entry.at.room && !entry.at.inHand && entry.at.pose.show > 0)
    const order = things.sort((a, b) => a.at.at.y - b.at.at.y || THINGS.indexOf(a.thing) - THINGS.indexOf(b.thing))
    // In some pairs the first lies on the second: it is drawn after it.
    for (const couple of pairsOf(toy)) {
      const first = order.findIndex((entry) => entry.thing === couple.first), second = order.findIndex((entry) => entry.thing === couple.second)
      if (first < 0 || second < 0 || OVER.has(couple.pair) === first > second) continue
      const [moved] = order.splice(first, 1)
      order.splice(order.findIndex((entry) => entry.thing === couple.second) + (OVER.has(couple.pair) ? 1 : 0), 0, moved)
    }
    const toad = toadPose(toy)
    if (toad.room) this.toad(g, toy, toad)
    for (const entry of order) this.thing(g, toy, entry.thing, entry.at)
    if (toy.room) { this.knock(g, toy, frame.tier.dust); if (asked) this.ghost(g, toy, asked, frame.guidance!) }
  }

  // --- Stamps and strokes -----------------------------------------------------

  /** A piece by its name in the store: made once, so that a frame makes none. */
  private piece(key: string, box: Box, paint: () => (g: G, grain: boolean) => void): Piece {
    let piece = this.pieces.get(key)
    if (!piece) { piece = { key, box, paint: paint() }; this.pieces.set(key, piece) }
    return piece
  }

  private part(key: string, art: Part): Piece {
    return this.piece(key, art.box, () => art.paint)
  }

  private find(key: FindArtKey): Piece {
    return this.piece(`find:${key}`, FIND_ART[key].box, () => FIND_ART[key].paint)
  }

  /** The glow is light, not wood: it has no thickness and throws no shadow, and is painted one way only. */
  private glow(g: G, x: number, y: number, size: number, alpha: number): void {
    const sprite = this.sprites.get('glow', GLOW_BOX, (sheet) => paintGlow(sheet))
    g.save()
    g.translate(x, y)
    g.scale(size, size)
    g.globalAlpha = Math.max(0, Math.min(1, alpha))
    g.drawImage(sprite.sheet.image, sprite.x, sprite.y, sprite.w, sprite.h)
    g.restore()
    this.draws += 1
  }

  /**
   * One stamp of a painted piece, about its own origin. The piece is stamped in the painting of it whose shadow
   * and whose thickness fall down and to the right on the screen under the turn and the mirror it stands in now.
   */
  private put(g: G, piece: Piece, x: number, y: number, turn = 0, sx = 1, sy = 1, alpha = 1): void {
    g.save()
    g.translate(x, y)
    if (turn !== 0) g.rotate(turn)
    if (sx !== 1 || sy !== 1) g.scale(sx, sy)
    if (alpha < 1) g.globalAlpha = Math.max(0, alpha)
    const stands = g.getTransform()
    const sprite = this.sprites.get(piece.key, piece.box, piece.paint, lightFor(stands.a, stands.b, stands.c, stands.d))
    g.drawImage(sprite.sheet.image, sprite.x, sprite.y, sprite.w, sprite.h)
    g.restore()
    this.draws += 1
  }

  /** One live stroke or fill: whatever `trace` adds to a fresh path. */
  private live(g: G, trace: (g: G) => void, style: { fill?: string; line?: string; width?: number; alpha?: number }): void {
    g.save()
    if (style.alpha !== undefined) g.globalAlpha = Math.max(0, style.alpha)
    g.beginPath()
    trace(g)
    if (style.fill) { g.fillStyle = style.fill; g.fill() }
    if (style.line) { g.strokeStyle = style.line; g.lineWidth = style.width ?? 2; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke() }
    g.restore()
    this.draws += 1
  }

  /** A pupil in its socket: it slides towards what the eye looks at, and a blink flattens it. */
  private pupil(g: G, x: number, y: number, r: number, look: P, shut: number, reach = 0.45, wide = 1): void {
    this.live(g, (h) => h.ellipse(x + look.x * r * reach * 2, y + look.y * r * reach * 2, r * wide, Math.max(0.6, r * (1 - shut)), 0, 0, TAU), { fill: '#1d120a' })
  }

  // --- The pieces on threads ----------------------------------------------------

  private hangers(g: G, toy: Toy): void {
    const ends: P[] = HANGERS.map((hanger, index) => {
      const angle = hangerAngle(toy, index)
      return { x: hanger.x + Math.sin(angle) * hanger.thread, y: hanger.y - hanger.thread + Math.cos(angle) * hanger.thread }
    })
    this.live(g, (h) => HANGERS.forEach((hanger, index) => { h.moveTo(hanger.x, hanger.y - hanger.thread); h.lineTo(ends[index].x, ends[index].y) }), { line: ENGRAVE, width: 1.6, alpha: 0.8 })
    HANGERS.forEach((hanger, index) => {
      const art = hanger.kind === 'sun' ? SUN_ART : hanger.kind === 'bird' ? BIRD_ART : CLOUD_ART
      this.put(g, this.part(hanger.kind, art), ends[index].x, ends[index].y, -hangerAngle(toy, index))
    })
  }

  // --- The covers and who lives under them ----------------------------------------

  private cover(g: G, toy: Toy, place: PlaceId, lift: number): void {
    const art = COVER_ART[place], a = amount(toy, place), stir = stirOf(toy, place), since = landed(toy, place)
    const { season, flat } = flipOf(toy, { x: SPOTS[place].shut.x })
    const sprite = this.piece(art.seasonal ? `cover:${place}:${season}` : `cover:${place}`, art.box, () => (sheet, grain) => art.paint(sheet, season, grain))
    const squeeze = art.seasonal ? Math.max(0.03, flat) : 1
    if (place === 'grass') {
      for (const side of [-1, 1] as const) {
        const pose = coverPose('grass', a, stir, since, side)
        this.put(g, sprite, pose.x, pose.y, pose.turn, side * lift * squeeze, lift)
      }
      return
    }
    // The leaf on the puddle sails a circle with the snail on it (things.ts).
    const pose = place === 'puddle' ? leafNow(toy) : coverPose(place, a, stir, since)
    const x = pose.x, y = pose.y
    this.put(g, sprite, x, y, pose.turn, pose.sx * lift * squeeze, pose.sy * lift)
    if (place === 'puddle' && moving(toy, 'cover:puddle')) this.ripples(g, x, y + 6, progress(toy, 'cover:puddle') ?? 1, 70)
  }

  private ripples(g: G, x: number, y: number, u: number, size: number): void {
    this.live(g, (h) => { for (const lag of [0, 0.35]) { const w = Math.max(0, u - lag) * size + 14; h.moveTo(x + w, y); h.ellipse(x, y, w, w * 0.4, 0, 0, TAU) } }, { line: '#f4fbff', width: 2.2, alpha: 0.9 * (1 - u) })
  }

  /** Rings on the water where a thing was set in it or a finger tapped it, and the wake behind the feather as it glides across. */
  private water(g: G, toy: Toy, room: boolean): void {
    const wake = wakeOf(toy)
    if (wake && wake.room === room) {
      // Two bent lines of different lengths trail off behind it, the way it came.
      const { x, y } = wake.at
      this.live(g, (h) => { h.moveTo(x - 30, y + 2); h.quadraticCurveTo(x - 56, y - 8, x - 86, y - 2); h.moveTo(x - 24, y + 18); h.quadraticCurveTo(x - 44, y + 24, x - 60, y + 20) }, { line: '#f4fbff', width: 2.6, alpha: 0.95 * wake.strength })
    }
    const act = toy.acts.water
    if (!act || act.room !== room) return
    const u = progress(toy, 'water')
    if (u !== null) this.ripples(g, act.to.x, act.to.y + 8, u, 60)
  }

  private dweller(g: G, toy: Toy, place: PlaceId, find: FindId | 'woodlouse', pose: FindPose, fade: number): void {
    const at = SPOTS[place].find, x = at.x + pose.dx, y = at.y + pose.dy
    // What is found is drawn larger than it was cut: it is what the child came to see.
    const stamp = (key: FindArtKey, dy = 0, sx = pose.sx): void => this.put(g, this.find(key), x, y + dy * FOUND, pose.turn, sx * FOUND, pose.sy * FOUND, fade)
    switch (find) {
      case 'woodlouse': stamp(pose.own > 0.5 ? 'woodlouseBall' : 'woodlouse'); break
      case 'ladybird': stamp(pose.own > 0.15 ? 'ladybirdOpen' : 'ladybird'); break
      case 'sleeper': stamp(pose.own > 0.2 && Math.floor(toy.time * 12) % 2 === 1 ? 'sleeperB' : 'sleeper'); break
      case 'moth': stamp('moth', 0, pose.sx * (1 - 0.55 * Math.abs(pose.own))); break
      default: stamp(find as FindArtKey)
    }
    // What a dweller sets off round itself: the mushroom's spores, rings on the water.
    if (find === 'mushroom' && pose.own > 0) this.live(g, (h) => { for (let i = 0; i < 9; i++) { const angle = -Math.PI * (0.1 + i * 0.1), far = 16 + pose.own * 44; h.moveTo(x + Math.cos(angle) * far + 3, y - 20 + Math.sin(angle) * far); h.arc(x + Math.cos(angle) * far, y - 20 + Math.sin(angle) * far, 3, 0, TAU) } }, { fill: '#f6e8c8', alpha: 1 - pose.own })
    const acted = progress(toy, `find:${place}`, 'act')
    if (place === 'puddle' && acted !== null) this.ripples(g, x, y + 8, acted, 46)
  }

  // --- The six things ---------------------------------------------------------------

  private thing(g: G, toy: Toy, thing: ThingId, where: Drawn): void {
    const pose: Go = where.pose, k = where.scale * (where.inHand ? lerp(1 / 1.12, 1, Math.min(1, (seconds(toy, `thing:${thing}`, 'lift') ?? 0.2) / 0.2)) : 1)
    const { x, y } = where.at
    const stamp = (key: FindArtKey, dx = 0, dy = 0, sx = pose.sx, turn = pose.turn): void => this.put(g, this.find(key), x + dx * k, y + dy * k, turn, sx * k, pose.sy * k, pose.show)
    switch (thing) {
      case 'snail':
        stamp(pose.own > 0.5 ? 'snailShell' : 'snail')
        // Its two horns, each as far out as it is: the longer leans back and the shorter forward, and they come and go one at a time.
        if (pose.own <= 0.5 && (pose.hornA > 0.05 || pose.hornB > 0.05)) {
          g.save()
          g.translate(x, y)
          g.rotate(pose.turn)
          g.scale(pose.sx * k, pose.sy * k)
          this.live(g, (h) => {
            for (const [bx, by, tx, ty, out] of [[35, 4, 29, -19, pose.hornA], [42, 3, 50, -9, pose.hornB]] as const) {
              if (out <= 0.05) continue
              const ex = bx + (tx - bx) * out, ey = by + (ty - by) * out, long = Math.hypot(ex - bx, ey - by) || 1, nx = -(ey - by) / long, ny = (ex - bx) / long
              h.moveTo(bx + nx * 2.4, by + ny * 2.4); h.lineTo(ex + nx * 1.5, ey + ny * 1.5); h.lineTo(ex - nx * 1.5, ey - ny * 1.5); h.lineTo(bx - nx * 2.4, by - ny * 2.4); h.closePath()
              h.moveTo(ex + 3.2, ey); h.arc(ex, ey, 3.2, 0, TAU)
            }
          }, { fill: '#f0d2a4', line: BURNT, width: 1.4, alpha: pose.show })
          g.restore()
        }
        break
      case 'acorn': {
        stamp('acorn')
        // Its cap: on it, lifted like a hat, or off and somewhere of its own.
        const off = pose.capX !== 0 || pose.capY !== 0
        stamp('acornCap', pose.capX, off ? pose.capY : -pose.own * 16, pose.sx, off ? 0 : pose.turn)
        break
      }
      case 'button':
        stamp('button', 0, 0, Math.abs(pose.sx) < 0.06 ? 0.06 : pose.sx)
        // The glint: one short bright arc along its rim, that opens and shuts.
        if (pose.own > 0) this.live(g, (h) => h.arc(x, y, 25 * k, -2.7, -2.7 + 0.35 + 0.75 * pose.own), { line: '#ffffff', width: 4.5, alpha: Math.min(1, pose.own * 1.4) * pose.show })
        break
      case 'worm': stamp(pose.own > 0.5 ? 'wormKnot' : 'worm'); break
      case 'apple': {
        stamp('apple')
        // Its leaf is hinged at the stalk and flaps; it goes where the apple goes, turned and squashed with it.
        const lx = 4 * pose.sx, ly = -36 * pose.sy
        this.put(g, this.find('appleLeaf'), x + (Math.cos(pose.turn) * lx - Math.sin(pose.turn) * ly) * k, y + (Math.sin(pose.turn) * lx + Math.cos(pose.turn) * ly) * k, pose.turn - 0.7 * pose.own, pose.sx * k, pose.sy * k, pose.show)
        if (biteShows(toy)) this.put(g, this.find('bite'), x + (Math.cos(pose.turn) * 20 - Math.sin(pose.turn) * 8) * k, y + (Math.sin(pose.turn) * 20 + Math.cos(pose.turn) * 8) * k, pose.turn, k, k, pose.show)
        break
      }
      default: stamp(thing)
    }
    // Wet, it carries a streak of gloss and drips. Dry again, neither.
    if (isWet(toy, thing) || (where.inHand && (toy.things[thing].at === 'puddle' || toy.things[thing].at === 'bowl'))) {
      const fall = (toy.time * 0.9 + THINGS.indexOf(thing) * 0.37) % 1
      this.live(g, (h) => { h.moveTo(x - 20 * k, y - 10 * k); h.quadraticCurveTo(x - 16 * k, y - 24 * k, x - 2 * k, y - 26 * k); h.moveTo(x + 10 * k, y + 30 * k + fall * 16); h.lineTo(x + 10 * k, y + 36 * k + fall * 16); h.moveTo(x - 12 * k, y + 28 * k + ((fall + 0.5) % 1) * 16); h.lineTo(x - 12 * k, y + 33 * k + ((fall + 0.5) % 1) * 16) }, { line: '#e4f6ff', width: 4, alpha: 0.95 * pose.show })
    }
  }

  /** The snail's silver trail on the path, which dries. */
  private trail(g: G, toy: Toy): void {
    const trail = toy.trail
    if (!trail) return
    const age = toy.time - trail.since, laid = Math.min(1, Math.max(0, (age - 0.2) / 1.2)), fade = 1 - Math.min(1, Math.max(0, (age - 4.5) / 2.5))
    if (laid <= 0 || fade <= 0) return
    this.live(g, (h) => { h.moveTo(trail.from.x, trail.from.y + 26); h.lineTo(lerp(trail.from.x, trail.to.x, laid), lerp(trail.from.y, trail.to.y, laid) + 26) }, { line: '#f2f7fa', width: 9, alpha: 0.85 * fade })
  }

  // --- The hedgehog -------------------------------------------------------------

  private hedgehog(g: G, toy: Toy): void {
    const pose = hedgehogPose(toy), eye = { x: HEDGEHOG.x + 68, y: HEDGEHOG.y - 8 }
    const seen = gaze(toy, eye, wormSpot(toy)), look = { x: lerp(seen.x, 0.9, pose.cross), y: lerp(seen.y, 0.7, pose.cross) }
    g.save()
    g.translate(HEDGEHOG.x + pose.x, HEDGEHOG.y + pose.y)
    if (pose.roll >= 0.5) {
      // A ball. One eye looks out between the spines, towards the worm.
      const size = pose.ballScale * (0.86 + 0.14 * (pose.roll - 0.5) * 2)
      g.translate(-6 + pose.shake, -4)
      g.rotate(pose.ballTurn)
      g.scale(size, size)
      this.put(g, this.part('hog:ball', HOG_ART.ball), 0, 0)
      this.pupil(g, 46, -14, 8 * pose.peep, look, 0, 0.4)
      g.restore()
      return
    }
    const tuck = pose.roll * 2
    const face = (): void => {
      g.save()
      g.translate(30 + pose.faceSlide - 44 * tuck, 10 + 16 * tuck)
      g.rotate(pose.faceTurn + tuck * 1.25)
      g.translate(-30, -10)
      this.put(g, this.part('hog:face', HOG_ART.face), 0, 0)
      this.pupil(g, 68, -8, 7, look, pose.blink)
      // The mouth: a smile under the snout, which opens when he snuffles and turns down when he is put out.
      this.live(g, (h) => { h.moveTo(92, 30); h.quadraticCurveTo(104, 30 + 9 * pose.mouth + 10 * pose.open, 118, 22) }, { line: SCORCH, width: 2.4 })
      g.restore()
    }
    const back = (): void => {
      g.save()
      g.translate(pose.shake, 78)
      g.rotate(pose.kick * 0.02)
      g.scale(1 + 0.1 * pose.fan, (pose.breathe + 0.16 * pose.fan) * (1 - 0.1 * tuck))
      g.translate(0, -78)
      this.put(g, this.part('hog:back', HOG_ART.back), 0, 0)
      g.restore()
    }
    this.put(g, this.part('hog:feet', HOG_ART.feet), 0, -pose.kick * 5)
    // Unrolled the face is in front of the spines; as he rolls up it goes under them.
    if (tuck < 0.3) { back(); face() } else { face(); back() }
    g.restore()
  }

  // --- The jay and his nest -------------------------------------------------------

  private nest(g: G, toy: Toy): void {
    const rustle = progress(toy, 'nest', 'rustle'), tip = progress(toy, 'nest', 'tip')
    this.put(g, this.part('nest', NEST_ART), NEST.x, NEST.y, rustle !== null ? Math.sin(rustle * 40) * 0.06 * (1 - rustle) : tip !== null ? 0.5 * Math.sin(tip * Math.PI) : 0)
  }

  private jay(g: G, toy: Toy): void {
    const pose = jayPose(toy), eye = { x: pose.x - 38 * pose.facing, y: pose.y - 86 }, seen = gaze(toy, eye, shinySpot(toy))
    const look = { x: seen.x * pose.facing, y: seen.y }
    g.save()
    // He swells and leans about his feet, which stay on the rim of the nest or on the ground he has flown down to.
    g.translate(pose.x, pose.y + 78)
    g.rotate(pose.turn)
    g.scale(pose.scale * pose.facing, pose.scale)
    g.translate(0, -78)
    this.put(g, this.part('jay:tail', JAY_ART.tail), 30, 46, -0.22 + pose.tail, 0.72, 0.72)
    this.put(g, this.part('jay:body', JAY_ART.body), 0, 0)
    this.put(g, this.part('jay:wing', JAY_ART.wing), -8, -18, pose.wing)
    g.translate(-26 + pose.headX, -78 + pose.headY)
    g.rotate(pose.headTurn)
    this.put(g, this.part('jay:crest', JAY_ART.crest), 8, -28, (1 - pose.crest) * 1.0)
    this.put(g, this.part('jay:head', JAY_ART.head), 0, 0)
    if (pose.beak > 0.05) this.live(g, (h) => { h.moveTo(-30, 6); h.lineTo(-58, 8 + 16 * pose.beak); h.lineTo(-30, 14); h.closePath() }, { fill: '#2b2118', line: SCORCH, width: 1.4 })
    this.pupil(g, -12, -8, 6, look, pose.blink)
    // The brow comes down when he scolds.
    this.live(g, (h) => { h.moveTo(-26, -20 + 8 * pose.crest); h.lineTo(0, -24 - 2 * pose.crest) }, { line: SCORCH, width: 2.6 })
    g.restore()
  }

  // --- The toad -------------------------------------------------------------------

  private toad(g: G, toy: Toy, pose: ReturnType<typeof toadPose>): void {
    const look = gaze(toy, { x: pose.feetX, y: pose.feetY - 100 }, toadWant(toy), pose.room)
    g.save()
    // Everything about him squashes and stretches from his feet; in the air he turns about his middle.
    g.translate(pose.feetX + pose.x, pose.feetY + pose.y)
    g.scale(TOAD_SCALE, TOAD_SCALE)
    g.translate(0, -56)
    g.rotate(pose.turn)
    g.translate(0, 56)
    g.scale(pose.sx, pose.sy)
    g.translate(0, -62)
    this.put(g, this.part('toad:body', TOAD_ART.body), 0, 0)
    if (!pose.back) this.put(g, this.part('toad:throat', TOAD_ART.throat), 0, 14 + 12 * (pose.throat - 1), 0, pose.throat, pose.throat)
    g.translate(0, -30 + pose.headY)
    g.rotate(pose.headTilt)
    if (pose.back) {
      this.put(g, this.part('toad:back', TOAD_ART.backHead), 0, 0)
    } else {
      this.put(g, this.part('toad:head', TOAD_ART.head), 0, 0)
      this.pupil(g, -44, -50, 7, look, pose.blinkLeft, 0.5, 1.5)
      this.pupil(g, 44, -50, 7, look, pose.blinkRight, 0.5, 1.5)
      // The mouth: one wide line, and a dark hole while the croak comes out.
      if (pose.mouth > 0.05) this.live(g, (h) => h.ellipse(0, 2, 34, 18 * pose.mouth, 0, 0, TAU), { fill: '#3a1410', line: SCORCH, width: 2 })
      else this.live(g, (h) => { h.moveTo(-58, -4); h.quadraticCurveTo(0, 14, 58, -4) }, { line: SCORCH, width: 2.6 })
    }
    g.restore()
    // His knuckle, out to the acorn on the bare half of his stone: it knocks with each tok.
    const knuckle = pose.room ? 0 : knuckleOf(toy)
    if (knuckle > 0.03) {
      const from = { x: pose.feetX + pose.x * TOAD_SCALE - 52, y: pose.feetY - 40 }, to = { x: lerp(from.x, STONE_SPOT.x + 24, knuckle), y: lerp(from.y, STONE_SPOT.y - 6, knuckle) }
      const long = Math.hypot(to.x - from.x, to.y - from.y) || 1, nx = -(to.y - from.y) / long, ny = (to.x - from.x) / long
      this.live(g, (h) => { h.moveTo(from.x + nx * 8, from.y + ny * 8); h.lineTo(to.x + nx * 6.5, to.y + ny * 6.5); h.arc(to.x, to.y, 6.5, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI); h.lineTo(from.x - nx * 8, from.y - ny * 8); h.closePath() }, { fill: '#8fa63c', line: BURNT, width: 1.8 })
    }
  }

  // --- A knock on wood, and the hand ------------------------------------------------

  private knock(g: G, toy: Toy, dust: number): void {
    const u = progress(toy, 'knock')
    if (u === null) return
    const { x, y } = toy.knock.at, r = 14 + 54 * u
    // The knock itself: a pale ring with a dark one in it, opening out from under the finger, and a chip of wood
    // that hops up from where the finger is and falls back. A tier may leave the sawdust out, never these.
    this.live(g, (h) => { h.moveTo(x + r, y); h.arc(x, y, r, 0, TAU) }, { line: '#fff3d0', width: 12 * (1 - u) + 4, alpha: Math.min(1, 3 * (1 - u)) })
    this.live(g, (h) => { h.moveTo(x + r, y); h.arc(x, y, r, 0, TAU) }, { line: ENGRAVE, width: 5 * (1 - u) + 2, alpha: Math.min(1, 3 * (1 - u)) })
    this.put(g, this.part('chip', CHIP_ART), x + 26 * u, y - 8 - 54 * Math.sin(Math.min(1, u * 1.15) * Math.PI), u * 7, 1, 1, Math.min(1, 2.4 * (1 - u)))
    if (dust > 0) this.live(g, (h) => { for (let i = 0; i < dust; i++) { const angle = -Math.PI * (0.12 + (i / dust) * 0.76), far = 14 + u * (38 + (i % 3) * 14), mx = x + Math.cos(angle) * far, my = y + Math.sin(angle) * far + u * u * 26; h.moveTo(mx + 3.2, my); h.arc(mx, my, 3.2 - u * 1.4, 0, TAU) } }, { fill: '#c9a36c', alpha: 1 - u * u })
  }

  /** The ghost hand: one tap where it stands, or one thing picked up and moved a short way, to no one. */
  private ghost(g: G, toy: Toy, asked: Invitation, guidance: Guidance): void {
    if (guidance.demo === null) return
    const show = asked.hand, carrying = 'carry' in show
    const pose = handPose(guidance.demo, carrying, this.hand)
    if (pose.opacity <= 0) return
    const at = carrying ? { x: lerp(show.from.x, show.to.x, pose.travel), y: lerp(show.from.y, show.to.y, pose.travel) } : show.tap
    if (carrying && pose.press > 0.5 && pose.travel > 0) {
      // A pale copy of the thing goes with the hand: the thing itself stays where it lies.
      this.put(g, this.find(show.carry), at.x, at.y, 0, 1, 1, pose.opacity * 0.5)
    } else if (pose.press > 0.5) {
      this.live(g, (h) => { h.moveTo(at.x + 26, at.y); h.arc(at.x, at.y, 26, 0, TAU) }, { line: '#fff6d8', width: 4, alpha: pose.opacity * (pose.press - 0.5) * 2 })
    }
    this.put(g, this.part('hand', HAND_ART), at.x + 4, at.y + 22 - 18 * pose.press, 0, 1 - 0.06 * pose.press, 1 - 0.06 * pose.press, pose.opacity * 0.92)
    void toy
  }
}

const near = (a: P, b: P): number => Math.hypot(a.x - b.x, a.y - b.y)

