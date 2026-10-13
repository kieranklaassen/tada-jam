import type { Tier } from './config'
import type { Shown } from './game'
import { handPose, type Guidance, type HandPose } from './guidance'
import type { RoomId } from './house'
import { GLASS, boxOfShape } from './layout'
import { CanvasPen, INK, type Box } from './pen'
import type { Hint } from './room'
import { ROOM } from './rooms'
import { boxOf, ghostsOf, handBox, segmentsOf } from './sprites'
import { CASE, HANDS, buttonDown, handFor, paintCase, paintStairs } from './stairs'
import { STAGE, fit, type Fit } from './stage'

// The view: a pocket game's display. The case, the printed card of the room
// and the faint ghosts of every unlit segment are painted once into one
// background; every segment of the room is painted once as a dark sprite. A
// frame is that background stamped whole, and then one stamp for each segment
// that is lit (two with its shadow), so a frame costs what is lit and nothing
// more. Nothing glides: a figure jumps from pose to pose, and what just went
// out lingers for a moment as it does on a slow display.
//
// Only the room on the glass has its sprites. When the room changes, the old
// room's canvases are let go before the new room's are made, so the memory
// the sprites take is one room's at any time, and never more than a ceiling
// (`SPRITE_BYTES`).

/** Makes a canvas of that size in pixels. The Mount passes the document's; a test passes one that only counts. */
export type MakeCanvas = (width: number, height: number) => HTMLCanvasElement

/** What one frame cost: sprite stamps, and shapes drawn live. Their sum is the frame's draw count. */
export type Drawn = { stamps: number; strokes: number }

type Sprite = { image: HTMLCanvasElement; box: Box; bytes: number; used: number }

/** How far a segment's shadow falls on the card behind the glass, in stage units. */
const SHADOW = { x: 5, y: 6, strength: 0.17 }
/** How dark an unlit segment's ghost is. */
export const GHOST = 0.035
/** Sprites are never painted denser than this many pixels to a stage unit, whatever the surface, so their memory has a ceiling. */
export const MAX_DENSITY = 2
/**
 * The most the sprites of a room may weigh, in bytes. A room whose segments weigh less has them all painted in
 * the first frames after it comes onto the glass, and no sprite is made after that. The one room that weighs more
 * has what fits painted then, the rest when a pose is first lit, and the pose that was lit longest ago let go to
 * make room.
 */
export const SPRITE_BYTES = 58 * 1024 * 1024
/** The most sprite memory painted ahead in one frame while a room that has just come onto the glass is made ready. */
export const WARM_BYTES = 3 * 1024 * 1024

/** A canvas is let go by taking its size away: the browser frees its pixels then, and not when the last reference goes. */
function free(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return
  canvas.width = 0
  canvas.height = 0
}

export class GameView {
  /** How the stage sits in the surface, in CSS pixels: touches come back through this same fit. */
  fit: Fit = { scale: 0, x: 0, y: 0 }
  private readonly g: CanvasRenderingContext2D
  private readonly make: MakeCanvas
  private sprites = new Map<string, Sprite>()
  /** The bytes of the room's sprites that are painted now, and a count of frames for which was lit when. */
  private weight = 0
  private pending: string[] = []
  private frame = 0
  private hands = new Map<string, Sprite>()
  private background: HTMLCanvasElement | null = null
  private glow: HTMLCanvasElement | null = null
  /** Disposed: it makes and draws nothing more. */
  private gone = false
  private room: RoomId = 'bedroom'
  private day = false
  private ratio = 1
  private density = 0
  private width = 0
  private height = 0
  private tier: Tier = { dpr: 2, shadow: true, afterimage: true }
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private readonly drawn: Drawn = { stamps: 0, strokes: 0 }

  constructor(canvas: HTMLCanvasElement, make: MakeCanvas) {
    this.g = canvas.getContext('2d')!
    this.make = make
  }

  /** What the quality tier sets besides the pixel ratio: the segments' shadows and their afterimages. */
  setTier(tier: Tier): void {
    if (this.gone) return
    this.tier = tier
  }

  /** The surface's size in CSS pixels and its pixel ratio. Everything is painted again only when its density changes. */
  resize(width: number, height: number, ratio: number): void {
    if (this.gone) return
    this.width = width
    this.height = height
    this.ratio = ratio
    this.fit = fit(width, height)
    const density = Math.min(MAX_DENSITY, this.fit.scale * ratio)
    if (density <= 0 || Math.abs(density - this.density) < 0.001) return
    this.density = density
    this.paintHands()
    this.paintRoom()
    this.paintBackground()
  }

  /**
   * Draws one frame. With no game yet, the bare look: the case, the card and the ghosts. `time` is the attended
   * clock's seconds. `hint` is what the idle ladder points at.
   */
  draw(shown: Shown | null, guidance: Guidance | null, hint: Hint | null, time: number): Drawn {
    const g = this.g, drawn = this.drawn
    drawn.stamps = 0
    drawn.strokes = 0
    this.frame += 1
    if (this.gone || this.fit.scale <= 0 || this.density <= 0) return drawn
    // Another room, or the same room in another light: its card is painted before the frame that shows it.
    if (shown && (shown.room !== this.room || shown.day !== this.day)) {
      const room = shown.room !== this.room
      this.room = shown.room
      this.day = shown.day
      if (room) this.paintRoom()
      this.paintBackground()
    }
    if (!this.background) return drawn
    const k = this.fit.scale * this.ratio
    // Past the stage's edges the surface is the case's plastic.
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    g.fillStyle = CASE.plastic
    const barX = Math.ceil(this.fit.x * this.ratio), barY = Math.ceil(this.fit.y * this.ratio)
    const w = Math.round(this.width * this.ratio), h = Math.round(this.height * this.ratio)
    if (barX > 0) { g.fillRect(0, 0, barX, h); g.fillRect(w - barX, 0, barX, h); drawn.strokes += 2 }
    if (barY > 0) { g.fillRect(0, 0, w, barY); g.fillRect(0, h - barY, w, barY); drawn.strokes += 2 }
    g.setTransform(k, 0, 0, k, this.fit.x * this.ratio, this.fit.y * this.ratio)
    g.drawImage(this.background, 0, 0, STAGE.width, STAGE.height)
    drawn.stamps += 1
    if (!shown) return drawn

    // The glow on what can be touched: a soft light behind the glass, breathing.
    if (guidance && guidance.glow > 0 && this.glow && hint) {
      const area = boxOfShape(hint.glow)
      g.globalAlpha = guidance.glow * (0.62 + 0.22 * Math.sin(time * 2.4))
      g.drawImage(this.glow, area.x - area.w * 0.125, area.y - area.h * 0.125, area.w * 1.25, area.h * 1.25)
      drawn.stamps += 1
    }

    // A knock on the case flickers the display, and the lamp's cord dims it as it is pulled.
    const dim = (shown.shock ? 0.45 : 1) * (1 - 0.4 * shown.dim)
    for (const lit of shown.lit) {
      if (lit.fading && !this.tier.afterimage) continue
      this.stamp(lit.name, lit.strength * dim, !lit.fading)
    }
    // A held button lights every segment at once, as a display does when it is tested.
    if (shown.test) for (const name of ghostsOf(this.room)) if (!shown.lit.some((lit) => lit.name === name)) this.stamp(name, 0.5, false)

    if (shown.dim > 0) {
      g.globalAlpha = 0.3 * shown.dim
      g.fillStyle = INK
      g.fillRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h)
      drawn.strokes += 1
    }

    if (guidance && guidance.demo !== null && hint) {
      const pose = handPose(guidance.demo, hint.to !== undefined, this.hand)
      if (pose.opacity > 0.05) {
        const x = hint.to ? hint.at.x + (hint.to.x - hint.at.x) * pose.travel : hint.at.x
        const y = hint.to ? hint.at.y + (hint.to.y - hint.at.y) * pose.travel : hint.at.y
        // Near the right edge the hand comes from the left, so that it stays on the display.
        const sprite = this.hands.get(handFor(x, pose.press > 0.5))
        if (sprite) {
          g.globalAlpha = pose.opacity > 0.5 ? 0.93 : 0.46
          g.drawImage(sprite.image, x + sprite.box.x, y + sprite.box.y, sprite.box.w, sprite.box.h)
          drawn.stamps += 1
        }
      }
    }

    if (shown.bloom) {
      const { x, y, r } = shown.bloom
      g.globalAlpha = 0.2
      g.fillStyle = INK
      g.beginPath()
      g.ellipse(x - r * 0.12, y, r, r * 0.8, -0.3, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      g.ellipse(x + r * 0.2, y + r * 0.1, r * 0.72, r * 0.62, 0.5, 0, Math.PI * 2)
      g.fill()
      drawn.strokes += 2
    }
    if (shown.held !== null) {
      g.globalAlpha = 0.4
      const pen = new CanvasPen(g)
      pen.color = '#000000'
      buttonDown(pen, shown.held)
      drawn.strokes += 1
    }
    g.globalAlpha = 1
    this.warm()
    return drawn
  }

  private stamp(name: string, strength: number, shadow: boolean): void {
    const sprite = this.spriteOf(name)
    if (!sprite) return
    const g = this.g, { box, image } = sprite
    if (shadow && this.tier.shadow) {
      g.globalAlpha = SHADOW.strength * strength
      g.drawImage(image, box.x + SHADOW.x, box.y + SHADOW.y, box.w, box.h)
      this.drawn.stamps += 1
    }
    g.globalAlpha = 0.93 * strength
    g.drawImage(image, box.x, box.y, box.w, box.h)
    this.drawn.stamps += 1
  }

  private sprite(box: Box, picture: (pen: CanvasPen) => void): Sprite {
    const k = this.density
    const image = this.make(Math.ceil(box.w * k), Math.ceil(box.h * k))
    const g = image.getContext('2d')!
    g.setTransform(k, 0, 0, k, -box.x * k, -box.y * k)
    picture(new CanvasPen(g))
    return { image, box, bytes: image.width * image.height * 4, used: this.frame }
  }

  /** What a segment of the room on the glass will weigh as a sprite. */
  private weightOf(name: string): number {
    const box = boxOf(this.room, name), k = this.density
    return Math.ceil(box.w * k) * Math.ceil(box.h * k) * 4
  }

  /** The sprite of a segment of the room on the glass: the one that is painted, or painted now, with the longest unused ones let go if the room weighs too much. */
  private spriteOf(name: string): Sprite | null {
    const have = this.sprites.get(name)
    if (have) {
      have.used = this.frame
      return have
    }
    const picture = segmentsOf(this.room)[name]
    if (!picture) return null
    const sprite = this.sprite(boxOf(this.room, name), picture)
    this.sprites.set(name, sprite)
    this.weight += sprite.bytes
    while (this.weight > SPRITE_BYTES) {
      let oldest: string | null = null, at = this.frame
      for (const [other, one] of this.sprites) if (one.used < at) { oldest = other; at = one.used }
      if (oldest === null) break
      const gone = this.sprites.get(oldest)!
      this.weight -= gone.bytes
      free(gone.image)
      this.sprites.delete(oldest)
    }
    return sprite
  }

  /**
   * The game is unmounted: every canvas the view made is let go now, and nothing is drawn after. A canvas keeps
   * its pixels until its size is taken away, so this is what gives the sprites back, not the view going out of reach.
   */
  dispose(): void {
    this.gone = true
    for (const sprite of this.sprites.values()) free(sprite.image)
    for (const sprite of this.hands.values()) free(sprite.image)
    free(this.glow)
    free(this.background)
    this.sprites = new Map()
    this.hands = new Map()
    this.pending = []
    this.glow = null
    this.background = null
    this.weight = 0
  }

  /** The ghost hand's four sprites and the glow, which every room uses. Painted when the density changes. */
  private paintHands(): void {
    for (const sprite of this.hands.values()) free(sprite.image)
    this.hands = new Map()
    for (const [name, picture] of Object.entries(HANDS)) this.hands.set(name, this.sprite(handBox(name), picture))
    free(this.glow)
    const glow = this.make(128, 128)
    const gg = glow.getContext('2d')!
    const light = gg.createRadialGradient(64, 64, 6, 64, 64, 64)
    light.addColorStop(0, 'rgba(255, 252, 214, 0.95)')
    light.addColorStop(0.55, 'rgba(255, 246, 170, 0.6)')
    light.addColorStop(1, 'rgba(255, 246, 170, 0)')
    gg.fillStyle = light
    gg.fillRect(0, 0, 128, 128)
    this.glow = glow
  }

  /**
   * The sprites of the room on the glass. The sprites of the room before are let go first. What the glass shows
   * unlit is painted now, since the background needs it. The rest wait in `pending`, in the order the room names
   * them, and `warm` paints a few each frame, so that a room coming onto the glass costs no long frame. A segment
   * lit before its turn is painted when it is lit. Never called in the middle of a frame's stamps.
   */
  private paintRoom(): void {
    for (const sprite of this.sprites.values()) free(sprite.image)
    this.sprites = new Map()
    this.weight = 0
    const all = segmentsOf(this.room)
    for (const name of ghostsOf(this.room)) {
      if (this.sprites.has(name) || !all[name]) continue
      const bytes = this.weightOf(name)
      if (this.weight + bytes > SPRITE_BYTES) continue
      const sprite = this.sprite(boxOf(this.room, name), all[name])
      this.sprites.set(name, sprite)
      this.weight += sprite.bytes
    }
    this.pending = Object.keys(all)
  }

  /** Paints the segments still waiting, at most `WARM_BYTES` of them a frame, for as long as the room's weight allows. Called after a frame's stamps. */
  private warm(): void {
    const all = segmentsOf(this.room)
    let spent = 0
    while (this.pending.length > 0 && spent < WARM_BYTES) {
      const name = this.pending.shift()!
      if (this.sprites.has(name) || !all[name]) continue
      const bytes = this.weightOf(name)
      if (this.weight + bytes > SPRITE_BYTES) continue
      const sprite = this.sprite(boxOf(this.room, name), all[name])
      // Painted ahead and not yet lit: it is the first to go if the room turns out too heavy.
      sprite.used = 0
      this.sprites.set(name, sprite)
      this.weight += sprite.bytes
      spent += bytes
    }
  }

  /** The case, the room's card behind the glass, the glass itself and the ghost of every unlit segment, as one picture. */
  private paintBackground(): void {
    const k = this.density
    free(this.background)
    const background = this.make(Math.round(STAGE.width * k), Math.round(STAGE.height * k))
    const g = background.getContext('2d')!
    g.setTransform(k, 0, 0, k, 0, 0)
    const pen = new CanvasPen(g)
    paintCase(pen)
    // The card shows only through the glass.
    g.save()
    g.beginPath()
    g.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h)
    g.clip()
    g.globalCompositeOperation = 'source-over'
    ROOM[this.room].print(pen, this.day)
    paintStairs(pen, this.room)
    g.globalCompositeOperation = 'source-over'
    // The glass itself: a grey-green cast over the print.
    g.fillStyle = 'rgba(126, 150, 116, 0.17)'
    g.fillRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h)
    // The ghost of every unlit segment.
    g.globalAlpha = GHOST
    for (const name of ghostsOf(this.room)) {
      const sprite = this.spriteOf(name)
      if (sprite) g.drawImage(sprite.image, sprite.box.x, sprite.box.y, sprite.box.w, sprite.box.h)
    }
    g.globalAlpha = 1
    // The glass sits a little way back in its frame: a shadow along the top and the left, and one long streak of light.
    const shade = (x0: number, y0: number, x1: number, y1: number, x: number, y: number, w: number, h: number): void => {
      const grad = g.createLinearGradient(x0, y0, x1, y1)
      grad.addColorStop(0, 'rgba(20, 30, 24, 0.3)')
      grad.addColorStop(1, 'rgba(20, 30, 24, 0)')
      g.fillStyle = grad
      g.fillRect(x, y, w, h)
    }
    shade(0, GLASS.y, 0, GLASS.y + 22, GLASS.x, GLASS.y, GLASS.w, 22)
    shade(GLASS.x, 0, GLASS.x + 18, 0, GLASS.x, GLASS.y, 18, GLASS.h)
    g.fillStyle = 'rgba(255, 255, 255, 0.07)'
    g.beginPath()
    g.moveTo(GLASS.x + 520, GLASS.y)
    g.lineTo(GLASS.x + 700, GLASS.y)
    g.lineTo(GLASS.x + 330, GLASS.y + GLASS.h)
    g.lineTo(GLASS.x + 150, GLASS.y + GLASS.h)
    g.closePath()
    g.fill()
    g.restore()
    this.background = background
  }
}
