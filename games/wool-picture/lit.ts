import { DYE, TUFT_H, TUFT_W, chance, makeFleece, stampFleece, type Ctx, type Felt, type Maker } from './felted'
import { makeBack, makeComb, makePicture, strokeLoop } from './fixtures'
import { BOWLS, COMB, FOLK, FRAME, LOOP, ROOM, TABLE_Y, pictureBox } from './layout'
import { paintRoom, paintWall } from './room'
import type { Fit } from './stage'
import type { Toy } from './toy'

// The room as it stands lit: the painted room with everything on it that is
// at rest (the hung pictures, the wool in the bowls, the comb, the yarn loop,
// the back of the felt that waits) and the evening light over it. It is one
// canvas, stamped whole each frame, and put together again only when one of
// those changes. What moves is drawn over it by the view.

/** How much of the room the evening light takes, at its darkest. */
const DUSK = 0.5
/** What the view draws for itself in the evening, and shades there after: the table with all on it, and the two figures at the back. */
const TABLE_STRIP = { y: TABLE_Y - 6 }
const BACK_BLOCK = { x: FRAME.x + FRAME.w + 6, y: 240 }
/** Room past the frame's edge that the wall patch behind it covers. */
export const BEHIND = 12
export const MOUND = { heap: { w: 96, h: 50 }, tuft: { w: 64, h: 74 } } as const

/** The evening's one tint: the light lowers and warms, so the shade is a plum that leans to red, never a blue. */
export const duskColour = (light: number): string => `rgba(62,26,40,${DUSK * light})`

/** A mound of loose wool of one dye, made of fleece sprites: a heap for a bowl, or a tall tuft drawn up out of one. */
export function makeMound(make: Maker, dye: number, k: number, w: number, h: number, stamps: number, tall: boolean): HTMLCanvasElement {
  const canvas = make(Math.ceil((w + TUFT_W) * k), Math.ceil((h + TUFT_H * 2) * k)), c = canvas.getContext('2d')!
  const base = [k, 0, 0, k, (TUFT_W / 2) * k, TUFT_H * k]
  const fleece = makeFleece(make, DYE[dye], k, 400 + dye * 3 + (tall ? 1 : 0), 0.22, 13)
  for (let i = 0; i < stamps; i++) {
    // Wide at the foot and narrow at the top, strands lying across a heap and upward in a tuft.
    const up = chance(i, dye, 1) ** (tall ? 0.8 : 1.5), spread = (1 - up) * (tall ? 0.42 : 0.5) + 0.06
    const x = w / 2 + (chance(i, dye, 2) - 0.5) * 2 * spread * w, y = h - up * h
    const turn = tall ? -Math.PI / 2 + (chance(i, dye, 3) - 0.5) * 0.9 : (chance(i, dye, 3) - 0.5) * 0.9
    stampFleece(c, fleece, x, y, turn, tall ? 0.7 + 0.5 * (1 - up) : 0.9 + 0.5 * chance(i, dye, 4), i, base)
  }
  return canvas
}

/** Stamps a mound with the middle of its foot at (x, y), stretched and turned about that point. */
export function stampMound(c: Ctx, canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number, sx: number, sy: number, turn: number): void {
  c.save()
  c.translate(x, y)
  if (turn !== 0) c.rotate(turn)
  c.scale(sx, sy)
  c.drawImage(canvas, -(w + TUFT_W) / 2, -(h + TUFT_H * 2) + TUFT_H, w + TUFT_W, h + TUFT_H * 2)
  c.restore()
}

/** What is at rest and so belongs to the lit room: each bowl's heap, the comb, the yarn loop. */
export type Resting = { heaps: number; comb: boolean; loop: boolean }

export class Lit {
  /** The lit room, the size of the surface. */
  canvas: HTMLCanvasElement | null = null
  /** The bare room, the wooden back of the waiting felt, the wall behind the frame and the frame's front, the last two at half size. */
  room: HTMLCanvasElement | null = null
  back: HTMLCanvasElement | null = null
  behind: HTMLCanvasElement | null = null
  front: HTMLCanvasElement | null = null
  heaps: HTMLCanvasElement[] = []
  comb: Felt | null = null
  /** How many times the lit room has been put together, for a test. */
  composed = 0
  private pictures = new Map<string, HTMLCanvasElement>()
  private key = ''
  private k = 0
  private base: number[] = [1, 0, 0, 1, 0, 0]
  private bleed = { x: 0, y: 0 }

  constructor(private make: Maker) {}

  resize(width: number, height: number, dpr: number, by: Fit): void {
    const k = dpr * by.scale, w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr))
    this.k = k
    this.base = [k, 0, 0, k, dpr * by.x, dpr * by.y]
    this.bleed = { x: by.x / by.scale + 2, y: by.y / by.scale + 2 }
    const room = this.make(w, h), c = room.getContext('2d')!
    c.setTransform(k, 0, 0, k, dpr * by.x, dpr * by.y)
    paintRoom(c, this.make, this.base, by.x / by.scale, by.y / by.scale, k)
    // The shade under each figure, on the table and the mat.
    c.fillStyle = 'rgba(40,26,44,0.3)'
    for (const figure of FOLK) {
      c.beginPath()
      c.ellipse(figure.x, figure.y - 1, figure.w * 0.42, 9, 0, 0, Math.PI * 2)
      c.fill()
    }
    this.room = room
    this.canvas = this.make(w, h)
    this.back = makeBack(this.make, k)
    // The wall behind the frame and the frame's own front, for the turn: both in motion, so half size will do.
    const half = k / 2, bw = FRAME.w + BEHIND * 2, bh = FRAME.h + BEHIND * 2
    this.behind = this.make(Math.ceil(bw * half), Math.ceil(bh * half))
    const b = this.behind.getContext('2d')!, behindBase = [half, 0, 0, half, -(FRAME.x - BEHIND) * half, -(FRAME.y - BEHIND) * half]
    b.setTransform(half, 0, 0, half, behindBase[4], behindBase[5])
    paintWall(b, this.make, behindBase, FRAME.x - BEHIND, FRAME.y - BEHIND, FRAME.x + FRAME.w + BEHIND, FRAME.y + FRAME.h + BEHIND, half)
    this.front = this.make(Math.ceil(FRAME.w * half), Math.ceil(FRAME.h * half))
    this.front.getContext('2d')!.drawImage(room, dpr * by.x + FRAME.x * k, dpr * by.y + FRAME.y * k, FRAME.w * k, FRAME.h * k, 0, 0, FRAME.w * half, FRAME.h * half)
    this.heaps = DYE.map((_, dye) => makeMound(this.make, dye, k, MOUND.heap.w, MOUND.heap.h, 54, false))
    this.comb = makeComb(this.make, k)
    this.pictures.clear()
    this.key = ''
  }

  /** A hung picture as a canvas, painted the first time it is asked for. */
  picture(veils: string, evening: boolean): HTMLCanvasElement {
    const key = (evening ? 'e' : 'd') + veils
    let canvas = this.pictures.get(key)
    if (!canvas) {
      if (this.pictures.size >= 10) this.pictures.clear()
      canvas = makePicture(this.make, this.k, veils, evening)
      this.pictures.set(key, canvas)
    }
    return canvas
  }

  /**
   * Puts the lit room together again if anything in it has changed. `light` is how far the evening has come
   * (0 to 1) and `resting` what lies still. Returns whether it was put together again.
   */
  compose(toy: Toy, light: number, resting: Resting): boolean {
    if (!this.canvas || !this.room) return false
    const show = toy.show, swinging = show.kind === 'evening' && show.swing < 1
    const dusk = Math.round(light * 16), ways = toy.finished ? Math.round((show.kind === 'evening' ? show.ways : 1) * 8) : 0
    let key = `${dusk}|${ways}|${toy.finished}|${swinging}|${resting.heaps}|${resting.comb}|${resting.loop}`
    for (const picture of toy.wall) key += `|${picture.peg}${picture.veils}`
    if (key === this.key) return false
    this.key = key
    this.composed++
    const c = this.canvas.getContext('2d')!, [k, , , , ox, oy] = this.base
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalAlpha = 1
    c.drawImage(this.room, 0, 0)
    c.setTransform(k, 0, 0, k, ox, oy)
    // In the evening the felt that waits shows its wooden back.
    if (toy.finished && this.back) c.drawImage(this.back, FRAME.x, FRAME.y, FRAME.w, FRAME.h)
    const newest = toy.finished && toy.wall.length > 0 ? toy.wall[toy.wall.length - 1] : null
    for (const picture of toy.wall) {
      // The picture that is swinging up is not on its peg yet.
      if (picture === newest && swinging) continue
      const box = pictureBox(picture.peg)
      c.drawImage(this.picture(picture.veils, false), box.x, box.y, box.w, box.h)
    }
    for (let dye = 0; dye < BOWLS.length; dye++) if (resting.heaps & (1 << dye)) stampMound(c, this.heaps[dye], BOWLS[dye].x, BOWLS[dye].y + 10, MOUND.heap.w, MOUND.heap.h, 1, 1, 0)
    if (resting.comb && this.comb) c.drawImage(this.comb.canvas, COMB.x - this.comb.ox, COMB.y - this.comb.oy, this.comb.w, this.comb.h)
    if (resting.loop) strokeLoop(c, LOOP.x, LOOP.y)
    if (dusk > 0) {
      // The evening light, over all but what the view shades for itself and the picture that was just hung.
      const left = -this.bleed.x, top = -this.bleed.y, right = ROOM.width + this.bleed.x, bottom = ROOM.height + this.bleed.y
      c.fillStyle = duskColour(dusk / 16)
      c.beginPath()
      c.rect(left, top, right - left, bottom - top)
      c.rect(left, TABLE_STRIP.y, right - left, bottom - TABLE_STRIP.y)
      c.rect(BACK_BLOCK.x, BACK_BLOCK.y, right - BACK_BLOCK.x, TABLE_STRIP.y - BACK_BLOCK.y)
      if (newest && !swinging) { const box = pictureBox(newest.peg); c.rect(box.x, box.y, box.w, box.h) }
      c.fill('evenodd')
    }
    if (newest && !swinging && ways > 0) {
      // In the picture each thing takes its evening way.
      const box = pictureBox(newest.peg)
      c.globalAlpha = ways / 8
      c.drawImage(this.picture(newest.veils, true), box.x, box.y, box.w, box.h)
      c.globalAlpha = 1
    }
    return true
  }

  /** Adds to `c`'s path the two parts of the room the view shades for itself in the evening, after it has drawn what moves there. */
  shadePath(c: Ctx): void {
    const left = -this.bleed.x, right = ROOM.width + this.bleed.x, bottom = ROOM.height + this.bleed.y
    c.rect(left, TABLE_STRIP.y, right - left, bottom - TABLE_STRIP.y)
    c.rect(BACK_BLOCK.x, BACK_BLOCK.y, right - BACK_BLOCK.x, TABLE_STRIP.y - BACK_BLOCK.y)
  }
}
