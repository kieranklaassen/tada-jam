import { fir, paintBackdrop, ridge } from './backdrop'
import { birdPose, fishPose, kingPose, lampPose, peeperPose, sunPose } from './cast'
import type { Tier } from './config'
import { drawKing, drawSun } from './figures'
import { hintOf } from './first'
import { BLOCK_H, FIRS, FIR_FOOT, POND, SUN, type Point } from './ground'
import { handPose, type Guidance, type HandPose } from './guidance'
import { drawBird, drawFish, drawHare, drawLampChild, drawPeeper } from './kids'
import { Print, all, bar, dot, lens, oval, poly, tiles, type G, type MakeLayer, type Shape, type Tiles } from './print'
import { SPRITE_LAYERS, makeSprites, type Sprites } from './sprites'
import { STAGE, fit } from './stage'
import { addDrift, addScoop, addThing, pulls } from './things'
import type { Toy } from './toy'
import { fishLooksFrom, hareNow, hareOut, peeperBlocked, redOnPond } from './toyDay'
import { lampAim, lampLift, lampMood } from './toyKids'
import { kingAwake, tryPlace } from './toyKing'
import { Bits } from './viewBits'
import { behindWall, boughIcicle, drawHoles, drawLamps, drawLight, drawnOf, lay } from './viewThings'

// The view: one stamp of the still layer, then everything that moves, laid
// through the print kit in as few pulls as the look needs. It holds the
// short-lived things the rules only announce (viewBits.ts), which are gone on
// load, and nothing a save needs. Its work is counted: `paint` returns the
// frame's stamps, fills and strokes, which is the game's draw count.

/** The layers painted for one size: four fleck tiles, the still layer by day and by night, and every sprite three times. */
export const LAYERS_PER_SIZE = 4 + 2 + SPRITE_LAYERS

export class View {
  /** Layers made since the view was made. */
  layers = 0
  private readonly make: MakeLayer
  private day: HTMLCanvasElement | null = null
  private dark: HTMLCanvasElement | null = null
  private sprites: Sprites | null = null
  private flecks: Tiles = { grain: null, cloud: null, nightGrain: null, nightCloud: null }
  private size = { width: 0, height: 0, dpr: 0 }
  private readonly bits = new Bits()
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }

  constructor(make: MakeLayer) {
    this.make = (width, height) => {
      this.layers++
      return make(width, height)
    }
  }

  /** The game was put away: what was flying is gone, as it is on load. */
  settle(): void {
    this.bits.clear()
  }

  /** Paints everything that is made once for a size. */
  private prepare(g: G, width: number, height: number, dpr: number): void {
    const by = fit(width, height), k = dpr * by.scale
    this.size = { width, height, dpr }
    this.flecks = tiles(this.make, g, k)
    this.sprites = makeSprites(this.make, k, this.flecks)
    const still = (night: boolean): HTMLCanvasElement => {
      const layer = this.make(Math.round(width * dpr), Math.round(height * dpr))
      const b = layer.getContext('2d')
      if (b) {
        const p = new Print(b)
        p.use(this.flecks)
        p.night = night
        b.setTransform(k, 0, 0, k, dpr * by.x, dpr * by.y)
        paintBackdrop(p, -by.x / by.scale, -by.y / by.scale, (width - by.x) / by.scale, (height - by.y) / by.scale)
      }
      return layer
    }
    this.day = still(false)
    this.dark = still(true)
  }

  /**
   * Paints one frame on `g`, a surface of `width` by `height` CSS pixels at pixel ratio `dpr`, and returns how
   * much it drew. With no toy yet it paints the still layer alone: the place before the save has been read.
   * `step` is the seconds of play this frame advances, which the short-lived things move by.
   */
  paint(g: G, width: number, height: number, dpr: number, toy: Toy | null, guidance: Guidance | null, step: number, tier: Tier): number {
    const by = fit(width, height)
    if (by.scale <= 0) return 0
    const k = dpr * by.scale
    if (!this.day || this.size.width !== width || this.size.height !== height || this.size.dpr !== dpr) this.prepare(g, width, height, dpr)
    const day = this.day, dark = this.dark, sprites = this.sprites
    const p = new Print(g)
    p.use(this.flecks)
    p.begin()
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'source-over'
    if (!day || !dark) return 0
    const flood = toy ? toy.flood : 0
    p.stamp(flood >= 1 ? dark : day, 0, 0)
    if (!toy || !sprites) return p.count
    g.setTransform(k, 0, 0, k, dpr * by.x, dpr * by.y)
    const x0 = -by.x / by.scale, y0 = -by.y / by.scale, x1 = (width - by.x) / by.scale, y1 = (height - by.y) / by.scale
    const stampOf = (layer: HTMLCanvasElement) => (): void => {
      g.setTransform(1, 0, 0, 1, 0, 0)
      p.stamp(layer, 0, 0)
    }
    // The night is a second pull of the blue: it comes down the sheet behind one hard, slanted edge.
    if (flood > 0 && flood < 1) {
      const line = y0 - 40 + flood * (y1 - y0 + 80)
      p.within(poly(x0, y0, x1, y0, x1, line - 26, x0, line + 26), stampOf(dark))
    }
    p.night = flood >= 0.5

    for (const motion of toy.takeMotions()) this.bits.take(motion)
    this.bits.age(step)
    const t = toy.time, cast = toy.cast, cut = toy.cut
    const tip = cut ? { x: cut.from.x + Math.cos(cut.angle) * cut.len, y: cut.from.y + Math.sin(cut.angle) * cut.len } : null
    const look: Point | null = toy.finger ?? tip
    const glow = guidance ? guidance.glow * (0.6 + 0.4 * Math.sin(t * 2.4)) : 0
    const held = toy.carrying

    // The sun, behind the ridge: pulled down it goes out of sight, and by night its sleeping top half shows.
    const sky: Shape = (c) => {
      c.moveTo(x0, y0)
      c.lineTo(x1, y0)
      for (let x = x1; x > x0 - 20; x -= 20) c.lineTo(x, ridge(x))
      c.closePath()
    }
    const sunHome = toy.night ? SUN.night : SUN.day
    p.within(sky, () => drawSun(p, sprites.sunRays, sunPose(t, cast.sun), toy.sunY, look, p.night, (toy.sunY - sunHome) / (SUN.night - SUN.day)))

    // The far snow: now and then the hare whose tracks cross it. It comes out from behind a fir and goes in behind
    // another: the firs are stamped again over it, so that it is behind them.
    if (hareOut(toy)) drawHare(p, sprites.hare, hareNow(toy))
    // The firs stand in front of the sun's ring of paper and of the hare: they are stamped again over both.
    p.within(all(...FIRS.map(([x, h]) => fir(x, ridge(x) + FIR_FOOT, h))), stampOf(p.night ? dark : day))

    // The lamps' light lies on the ground in front, under everything that stands or lies there.
    if (p.night) drawLight(p, toy.nightNow, stampOf(dark))

    // The pond: the fish under the ice, the glow, the open water, the line being cut.
    const red = redOnPond(toy)
    drawFish(p, fishPose(t, cast.fish, toy.fishAhead), toy.fishStare, red ? fishLooksFrom(red) : null)
    const resting = toy.pieces.filter((piece) => piece !== held && piece.mode === 'rest')
    if (glow > 0.02) {
      const ring = (x: number, y: number, len: number): Shape => all(bar(x, y, len + 6 + glow * 12, BLOCK_H + 6 + glow * 12, 10), bar(x, y, len + 2, BLOCK_H + 2, 7))
      p.fill('red', all(
        oval(POND.cx, POND.cy, POND.rx + 2 + glow * 9, POND.ry + 2 + glow * 7), oval(POND.cx, POND.cy, POND.rx + 1, POND.ry + 1),
        ...resting.filter((piece) => piece.rest.place === 'lying').map((piece) => piece.kind === 'ball'
          ? all(dot(piece.x, piece.y + (BLOCK_H - piece.len) / 2, piece.len / 2 + 4 + glow * 6), dot(piece.x, piece.y + (BLOCK_H - piece.len) / 2, piece.len / 2 + 1))
          : ring(piece.x, piece.y, piece.kind === 'icicle' ? 18 : piece.len)),
      ), true)
    }
    drawHoles(p, toy.holes)
    const scratches = this.bits.scratchLines()
    if (cut || scratches) {
      const to = cut && (cut.aimed || !toy.finger) ? tip : toy.finger
      p.line('paper', 6, (c) => {
        scratches?.(c)
        if (cut && to) {
          c.moveTo(cut.from.x, cut.from.y)
          c.lineTo(to.x, to.y)
        }
      })
      // The saw's tooth at the end of the line.
      if (cut && to) p.fill('paper', poly(to.x, to.y - 9, to.x + 7, to.y, to.x, to.y + 9, to.x - 7, to.y))
    }
    this.bits.drawRings(p)

    // Everything at rest, the drift and the bough's icicles: five pulls for all of it, six by night.
    const still = pulls()
    addDrift(still, toy.driftShown)
    for (let i = 0; i < 5; i++) if (!toy.iciclesShown.includes(i)) boughIcicle(still, i, t)
    for (const piece of resting) {
      const light = toy.lit.get(piece.id)
      addThing(still, drawnOf(piece, t, false, p.night && light !== undefined && light !== 'drum' && light !== 'thud'))
    }
    // A snowball afloat sits in rings on the water: two arcs of unequal length under it, which swell and ebb as it turns.
    for (const piece of resting) {
      if (piece.kind !== 'ball' || piece.rest.place !== 'afloat') continue
      const swell = 0.5 + 0.5 * Math.sin(t * 1.3 + piece.x)
      still.top.push(lens(piece.x - 37 - swell * 7, piece.y + 15, piece.x - 8, piece.y + 21, 2.4), lens(piece.x + 2, piece.y + 25, piece.x + 44 + swell * 9, piece.y + 17, 3))
    }

    // The characters, each where the rules have it. They are left out of the night's pull, as light is: figures of bare paper and bright ink on the flooded sheet.
    const king = toy.king, walking = king.path.length > 0 && king.wait <= 0 && king.fall === 0
    const tried = cast.king.what === 'foot' ? toy.pieces.find((piece) => piece.id === king.seat) : undefined
    const paintKing = (): void => drawKing(p, { body: sprites.kingBody, beard: sprites.kingBeard, head: sprites.kingHead }, kingPose(t, cast.king, kingAwake(toy)),
      { x: king.x, y: king.y - (walking ? Math.abs(Math.sin(t * 9)) * 7 * king.scale : 0), scale: king.scale, sat: king.sat, narrow: king.narrow }, look ?? toy.taste.highest, toy.taste.highest, tried ? tryPlace(tried).foot : null)
    const mood = lampMood(toy), aim = lampAim(toy)
    const kid = toy.kids.lamp, lift = lampLift(toy)
    const paintLampChild = (): void => drawLampChild(p, { body: sprites.kidBody, head: sprites.kidHead, leg: sprites.leg }, lampPose(t, cast.lamp, mood), { x: kid.x, y: kid.y - lift, up: kid.up }, look ?? aim ?? (mood === 'nose' ? { x: kid.x, y: kid.y + 300 } : null), aim, toy.lampsLit === 0)

    // Whoever is behind the wall is drawn between the paper of what stands on the bank and its inks: hidden by every block, and seen through the clear ice a nose is pressed on.
    const standing = resting.filter((piece) => piece.rest.place === 'built' || piece.rest.place === 'hung')
    lay(p, still, king.behind || kid.behind ? () => {
      p.knockout = true
      if (king.behind) p.within(behindWall(standing, 0, x0, y0, x1), paintKing)
      if (kid.behind) p.within(behindWall(standing, mood === 'nose' ? (toy.taste.clear?.id ?? 0) : 0, x0, y0, x1), paintLampChild)
      p.knockout = false
    } : undefined)
    drawLamps(p, toy.nightNow.lamps, t)

    p.knockout = true
    if (!king.behind) paintKing()
    if (!kid.behind) paintLampChild()
    const fish = fishPose(t, cast.fish, toy.fishAhead)
    drawPeeper(p, { body: sprites.peeperBody, head: sprites.peeperHead, leg: sprites.leg }, peeperPose(t, cast.peeper, peeperBlocked(toy)), toy.kids.peeper, look ?? (cast.peeper.what === 'watch' && red ? { x: red.x, y: red.y } : { x: POND.cx + fish.x, y: POND.cy + fish.y }))
    drawBird(p, sprites.bird, birdPose(t, cast.bird), toy.bird)
    p.knockout = false

    // Whatever is in the hand, in the air or on the king's head, and the snow a scooping hand has gathered: over everything else.
    const moving = pulls()
    for (const piece of toy.pieces) if (piece === held || piece.mode !== 'rest') addThing(moving, drawnOf(piece, t, piece === held, false))
    if (toy.scoop) addScoop(moving, toy.scoop.at.x, toy.scoop.at.y, toy.scoop.len)
    lay(p, moving)

    this.bits.drawBits(p)
    // Snow drifting down across the whole sheet, thick while a morning's fresh snow falls: each flake's place is a curve of the clock, so nothing is kept for it.
    const flakes = tier.flakes * (toy.snowing > 0 ? 4 : 1)
    p.fill('paper', all(...Array.from({ length: flakes }, (_, i) => {
      const fall = 26 + (i % 5) * 9 + (toy.snowing > 0 ? 90 : 0), x = (i * 197.3 + Math.sin(t * 0.6 + i) * 22) % (STAGE.width + 40), y = (i * 131.7 + t * fall) % (STAGE.height + 40)
      return dot(x - 20, y - 20, 2.4 + (i % 3) * 0.9)
    })))

    // The idle ladder: the ghost hand is a frost child's mitten showing one move.
    if (guidance && guidance.demo !== null) {
      const hint = hintOf(toy, guidance.demoIndex)
      const pose = handPose(guidance.demo, true, this.hand)
      if (hint && pose.opacity > 0.5) {
        const x = hint.from.x + (hint.to.x - hint.from.x) * pose.travel, y = hint.from.y + (hint.to.y - hint.from.y) * pose.travel
        if (hint.kind === 'cut' && pose.travel > 0) {
          p.line('paper', 4, (c) => {
            c.moveTo(hint.from.x, hint.from.y)
            c.lineTo(x, y)
          })
        }
        p.night = false
        p.sprite(sprites.mitten, x, y + 4 - pose.press * 6, -0.25, 1 - pose.press * 0.08, 1 - pose.press * 0.08)
      }
    }
    return p.count
  }
}
