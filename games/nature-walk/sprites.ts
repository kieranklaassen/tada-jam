import { setLight, type Box, type G } from './ply'

// Every cut piece is painted once into a sheet of its own and stamped from
// then on, so a frame is a few dozen stamps and no painting. The sheets are
// made at the density the surface is drawn at. Where a sheet comes from is
// handed in, so a test can count stamps and pixels with no canvas.
//
// The store is held to a size. Each sheet remembers the frame it was last
// stamped in; at the end of a frame, while the store holds more pixels than
// its limit, the sheets that frame did not stamp are let go, the longest
// unused first. So a piece keeps the paintings of the ways it is seen in now,
// and the others go when room is wanted, as does the place that is off screen.
//
// A sheet painted at another density, with another grain or for another box
// is stale. It is still the right picture, only not as sharp or not as wide,
// so it is stamped as it is until its turn comes to be painted again: at
// most `REPAINTS` in a frame, and a wide sheet counts for half of that. A
// change of tier or a resize is therefore spread over a few frames.

export type Sheet = { image: CanvasImageSource; g: G }
export type MakeSheet = (widthPx: number, heightPx: number) => Sheet

/** One painted piece: its sheet, and the box of the piece's own units that the sheet holds. */
export type Sprite = { sheet: Sheet; x: number; y: number; w: number; h: number }

type Held = Sprite & { scale: number; grain: boolean; box: Box; used: number; pixels: number }

/** The room kept round a piece that is painted for a way of the light: as far as the longest shadow falls. */
const ROOM = 18
/** How many stale pieces are painted again in one frame, at most. */
export const REPAINTS = 10
/** A sheet of this many pixels or more is a wide one: painting it again counts for half a frame's share. */
const WIDE = 1_000_000

export class Sprites {
  /** Pieces painted since the start: the heavy work, which a frame at rest never does. */
  painted = 0
  /** The pixels of every sheet held now. */
  pixels = 0
  private scale = 0
  private grain = true
  private frame = 0
  private left = REPAINTS
  private readonly held = new Map<string, Held>()

  constructor(private readonly make: MakeSheet) {}

  /** A frame begins: the density the pieces are painted at (sheet pixels to one unit) and whether they carry fine grain. */
  begin(scale: number, grain: boolean): void {
    this.scale = scale
    this.grain = grain
    this.frame += 1
    this.left = REPAINTS
  }

  /** A frame ends: while more than `limit` pixels are held, what this frame did not stamp is let go, the longest unused first. */
  end(limit: number): void {
    if (this.pixels <= limit) return
    // A piece's other paintings go first: those for a way of the light it is not seen in now. Then whatever has gone longest unstamped.
    const latest = new Map<string, number>()
    for (const [name, sprite] of this.held) { const key = name.split('@')[0]; latest.set(key, Math.max(latest.get(key) ?? 0, sprite.used)) }
    const spare = (name: string, sprite: Held): number => (sprite.used < latest.get(name.split('@')[0])! ? 0 : 1)
    const idle = [...this.held].filter(([, sprite]) => sprite.used < this.frame).sort((a, b) => spare(a[0], a[1]) - spare(b[0], b[1]) || a[1].used - b[1].used)
    for (const [name, sprite] of idle) {
      if (this.pixels <= limit) return
      this.held.delete(name)
      this.pixels -= sprite.pixels
    }
  }

  get withGrain(): boolean {
    return this.grain
  }

  /** How many held sheets are stale: painted at another density, with another grain or for another box than they were last asked for. */
  get stale(): number {
    let count = 0
    for (const sprite of this.held.values()) if (sprite.scale !== this.scale || sprite.grain !== this.grain) count += 1
    return count
  }

  /**
   * Lets go of every piece that shows a season other than those in `keep`. A piece that shows a season carries the
   * season's name as the last part of its key.
   */
  keepSeasons(keep: readonly string[], all: readonly string[]): void {
    for (const [name, sprite] of [...this.held]) {
      const key = name.split('@')[0], season = key.slice(key.lastIndexOf(':') + 1)
      if (!all.includes(season) || keep.includes(season)) continue
      this.held.delete(name)
      this.pixels -= sprite.pixels
    }
  }

  private current(sprite: Held, box: Box): boolean {
    return sprite.scale === this.scale && sprite.grain === this.grain && sprite.box[0] === box[0] && sprite.box[1] === box[1] && sprite.box[2] === box[2] && sprite.box[3] === box[3]
  }

  /** Whether the piece under `key` is held as it would be painted now, for that way of the light. */
  has(key: string, box: Box, light = -1): boolean {
    const sprite = this.held.get(light < 0 ? key : `${key}@${light}`)
    return sprite !== undefined && this.current(sprite, box)
  }

  /** The key a held sheet's image was painted under, for a test that asks what was stamped. */
  keyOf(image: unknown): string | undefined {
    for (const [key, sprite] of this.held) if (sprite.sheet.image === image) return key
    return undefined
  }

  /**
   * The piece under `key`, painted now if it is not held. `box` is the part of the piece's own units to keep.
   * `light` is which way the light falls on it (ply.ts): a piece that is stamped turned or mirrored is painted
   * for the way it is seen, with room round it for a shadow that may fall to any side. Without it the piece is
   * painted as it stands on the screen, in its box as given. A stale sheet is handed back as it is once the
   * frame has painted its share.
   */
  get(key: string, box: Box, paint: (g: G, grain: boolean) => void, light = -1): Sprite {
    const name = light < 0 ? key : `${key}@${light}`
    const held = this.held.get(name)
    if (held) {
      held.used = this.frame
      if (this.current(held, box) || this.left <= 0) return held
    }
    const room = light < 0 ? 0 : ROOM
    const x = box[0] - room, y = box[1] - room, w = box[2] - box[0] + room * 2, h = box[3] - box[1] + room * 2
    const wide = Math.max(1, Math.ceil(w * this.scale)), high = Math.max(1, Math.ceil(h * this.scale))
    const sheet = this.make(wide, high)
    sheet.g.setTransform(this.scale, 0, 0, this.scale, -x * this.scale, -y * this.scale)
    setLight(Math.max(0, light))
    paint(sheet.g, this.grain)
    setLight(0)
    const sprite: Held = { sheet, x, y, w, h, scale: this.scale, grain: this.grain, box, used: this.frame, pixels: wide * high }
    if (held) this.pixels -= held.pixels
    this.held.set(name, sprite)
    this.pixels += sprite.pixels
    this.painted += 1
    this.left -= sprite.pixels >= WIDE ? REPAINTS / 2 : 1
    return sprite
  }
}
