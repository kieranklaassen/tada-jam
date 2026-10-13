import { DYE, chance, css, type Ctx, type Maker } from './felted'
import { sinceBeat } from './acts'
import { CELL, FELT, FIGURE, SHEPHERD } from './layout'
import type { Toy } from './toy'
import { DROPS_A_COLUMN, DROPS_A_SECOND, STEAM_AT, dropPhase, type Bow, type Rain } from './weather'
import { WHITE, type Shape } from './wool'

// The weather as it is drawn: rain, steam, the nap a comb raises, and the bow.
// Each of the first three is lines added to one path, which the view strokes
// once. All of it is read from the toy and its clock, and none of it is saved:
// the same wool gives the same weather on load, already under way.

const frac = (x: number): number => ((x % 1) + 1) % 1

/** How far a rain has come, 0 to 1: its own scene brings it on, and otherwise it falls steadily. */
function fallOf(toy: Toy, rain: Rain): number {
  return toy.show.kind === 'rain' && rain.cloud.id === toy.show.cloud ? toy.show.fall : 1
}

/** How far a sun has dried the rain in its reach: its own scene brings that on, and otherwise it is dry there. */
function driedOf(toy: Toy, rain: Rain): number {
  return toy.show.kind === 'sun' && rain.cloud.id === toy.show.cloud ? toy.show.steam : 1
}


/**
 * Adds the rain to `c`'s path: drops under every cloud that rains, down to what lies under it, and the splash
 * where they land; then each figure's own drops (a cloud on its head rains on it, a soaked one shakes drops off,
 * the wet shepherd has one on his nose). `dxOf` is how far a cloud has drifted. Returns whether anything was added.
 */
export function rainPath(c: Ctx, toy: Toy, dxOf: (cloud: Shape) => number): boolean {
  const t = toy.t
  let any = false
  for (const rain of toy.weather.rains) {
    const fall = fallOf(toy, rain)
    if (fall <= 0) continue
    const dx = dxOf(rain.cloud), y0 = FELT.y + rain.top * CELL - 4, y1 = FELT.y + rain.floor * CELL, dried = driedOf(toy, rain)
    for (let col = rain.x0; col <= rain.x1; col += 2) {
      // The first drops are few; the steady rain fills every other column.
      if (chance(col, rain.cloud.id, 7) > 0.3 + 0.7 * fall) continue
      const dry = rain.dry[col - rain.x0] ? dried : 0, depth = (y1 - y0) * Math.min(1, fall / 0.4) * (1 - (1 - STEAM_AT) * dry)
      if (depth < 8) continue
      const x = FELT.x + (col + 0.5) * CELL + dx
      // A cloud that has drifted to the frame's edge rains only inside the frame.
      if (x < FELT.x + 2 || x > FELT.x + FELT.w - 2) continue
      // The splash is two low ticks that fly out flat and apart, so that a drop and its splash make no letter.
      // Where each drop is on its way is the model's (weather.ts): a figure answers when one reaches it.
      for (let drop = 0; drop < DROPS_A_COLUMN; drop++) {
        const u = frac(t * DROPS_A_SECOND + dropPhase(col, rain.cloud.id) + drop / DROPS_A_COLUMN), y = y0 + u * depth
        c.moveTo(x, y); c.lineTo(x - 1.5, y + 9)
        if (dry < 0.5 && fall >= 0.4 && u > 0.86) { c.moveTo(x - 5, y1 - 1); c.lineTo(x - 11, y1 - 4); c.moveTo(x + 4, y1 - 1); c.lineTo(x + 10, y1 - 4) }
      }
      any = true
    }
  }
  toy.folk.forEach((figure, who) => {
    const tall = FIGURE[who].h * figure.scale, wide = FIGURE[who].w * figure.scale, x = figure.x, top = figure.y - tall
    if (figure.coat === WHITE) {
      // A small rain of its own, out of the cloud on its head.
      for (let i = 0; i < 4; i++) { const u = frac(t * 1.3 + i * 0.27), dx = (i - 1.5) * wide * 0.16; c.moveTo(x + dx, top + tall * (0.2 + 0.6 * u)); c.lineTo(x + dx - 1, top + tall * (0.2 + 0.6 * u) + 7) }
      any = true
    }
    if (figure.shown === 'shiver' || figure.shown === 'soaked') {
      // It shakes itself like a dog, and drops fly off all round: with each shake of the act, and not between them.
      const u = sinceBeat(figure.shown, t - figure.shownSince) / 0.75
      if (u < 1) {
        for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.1 + 0.8 * (i / 6)), r = wide * (0.35 + 0.45 * u); c.moveTo(x + r * Math.cos(a), figure.y - tall * 0.5 + r * Math.sin(a)); c.lineTo(x + (r + 6) * Math.cos(a), figure.y - tall * 0.5 + (r + 6) * Math.sin(a)) }
        any = true
      }
    }
    if (who === SHEPHERD && figure.shown === 'wet') {
      // The drop on his nose: it hangs, falls, and the next one gathers.
      const u = frac(t / 1.6), y = figure.y - 178 * figure.scale + (u > 0.7 ? (u - 0.7) * 120 * figure.scale : 0)
      c.moveTo(x, y); c.lineTo(x, y + 5)
      any = true
    }
  })
  return any
}

/** One wisp of steam from (x, y): a short line that bends as it rises. */
function wisp(c: Ctx, x: number, y: number, bend: number): void {
  c.moveTo(x, y)
  c.quadraticCurveTo(x + bend, y - 8, x - bend * 0.3, y - 17)
}

/**
 * Adds the steam to `c`'s path: where a sun dries the rain the drops turn and rise, a fire the rain falls on
 * steams, and so does a figure a sun is drying or a fire is warming. Returns whether anything was added.
 */
export function steamPath(c: Ctx, toy: Toy, dxOf: (cloud: Shape) => number): boolean {
  const t = toy.t, show = toy.show
  let any = false
  for (const rain of toy.weather.rains) {
    const dried = driedOf(toy, rain), dx = dxOf(rain.cloud), y0 = FELT.y + rain.top * CELL, y1 = FELT.y + rain.floor * CELL
    if (dried > 0) for (let col = rain.x0; col <= rain.x1; col += 3) {
      if (!rain.dry[col - rain.x0]) continue
      const u = frac(t * 0.45 + chance(col, rain.cloud.id, 5))
      if (FELT.x + (col + 0.5) * CELL + dx > FELT.x + FELT.w - 2 || FELT.x + (col + 0.5) * CELL + dx < FELT.x + 2) continue
      wisp(c, FELT.x + (col + 0.5) * CELL + dx, y0 + (y1 - y0) * STEAM_AT - u * 30 * dried, 6 * Math.sin(t * 2 + col))
      any = true
    }
    const under = rain.under
    if (under && under.kind === 'fire' && fallOf(toy, rain) > 0.4) {
      for (let i = 0; i < 3; i++) wisp(c, FELT.x + (under.x0 + (under.x1 + 1 - under.x0) * (0.25 + 0.25 * i)) * CELL, FELT.y + under.y0 * CELL - 6 - frac(t * 0.5 + i * 0.3) * 24, 6 * Math.sin(t * 2 + i))
      any = true
    }
  }
  toy.folk.forEach((figure, who) => {
    // In the sun's scene what was wet dries as itself: the steam comes on with the drying.
    const amount = figure.dried ? (show.kind === 'sun' ? show.dry : 1) : figure.shown === 'warm' && figure.act === 'warm' ? 1 : 0
    if (amount <= 0) return
    const top = figure.y - FIGURE[who].h * figure.scale
    for (const side of [-1, 1]) wisp(c, figure.x + side * 10, top - 4 - frac(t * 0.5 + side * 0.2) * 16 * amount, side * 6)
    any = true
  })
  return any
}

/** Adds what the comb raises on bare felt to `c`'s path: dust that rolls low down, the nap standing in a stripe in the middle, stray fibres on end high up. */
export function napPath(c: Ctx, toy: Toy): boolean {
  for (const nap of toy.naps) {
    const u = Math.min(1, (toy.t - nap.born) / 0.9), up = Math.sin(u * Math.PI)
    if (nap.height === 0) for (const side of [-1, 1]) { const x = nap.x + side * (10 + 34 * u), r = 3 + 4 * u; c.moveTo(x + r, nap.y + 5); c.arc(x, nap.y + 5, r, 0, Math.PI, true) }
    else if (nap.height === 1) for (let i = -2; i <= 2; i++) { c.moveTo(nap.x + i * 8, nap.y + 5); c.lineTo(nap.x + i * 8 + 1.5, nap.y + 5 - 10 * up) }
    else for (let i = -1; i <= 1; i++) { c.moveTo(nap.x + i * 10, nap.y + 3); c.quadraticCurveTo(nap.x + i * 10 + 4 * Math.sin(toy.t * 20 + i), nap.y - 8 * up, nap.x + i * 13, nap.y - 18 * up) }
  }
  return toy.naps.length > 0
}

/** The order of the dyes in a bow, from the outside in. */
const BOW_ORDER = [4, 3, 0, 2, 1]
const BOW_PAD = 12

type Sprite = { canvas: HTMLCanvasElement; rx: number; ry: number }

/** The bows, each painted once into a canvas of its own and stamped whole: one strand of each of the five dyes. */
export class Bows {
  private sprites = new Map<string, Sprite>()
  private scale = 0

  constructor(private make: Maker) {}

  /** The pixels a stage unit takes: a new size paints every bow again. */
  setScale(scale: number): void {
    if (scale !== this.scale) { this.scale = scale; this.sprites.clear() }
  }

  private sprite(bow: Bow): Sprite {
    const rx = Math.max(60, (Math.abs(bow.to - bow.from) * CELL) / 2), ry = Math.max(70, Math.min(rx * 0.85, 190))
    const key = `${Math.round(rx)}`
    let sprite = this.sprites.get(key)
    if (sprite) return sprite
    const k = this.scale, canvas = this.make(Math.ceil((rx + BOW_PAD) * 2 * k), Math.ceil((ry + BOW_PAD) * k)), c = canvas.getContext('2d')!
    c.setTransform(k, 0, 0, k, (rx + BOW_PAD) * k, (ry + BOW_PAD) * k)
    c.lineCap = 'round'
    c.lineWidth = 5.4
    c.shadowBlur = 2.5 * k
    BOW_ORDER.forEach((dye, i) => {
      // The white strand is laid at full strength: thinner, it reads as grey against the felt.
      c.strokeStyle = css(DYE[dye], dye === WHITE ? 1 : 0.62)
      c.shadowColor = css(DYE[dye], dye === WHITE ? 1 : 0.58)
      c.beginPath()
      c.ellipse(0, 0, rx - i * 6, ry - i * 6, 0, Math.PI, Math.PI * 2)
      c.stroke()
    })
    if (this.sprites.size > 6) this.sprites.clear()
    sprite = { canvas, rx, ry }
    this.sprites.set(key, sprite)
    return sprite
  }

  /**
   * Draws the bows that stand, at most `most` of them. In its scene a bow's strands rise from the wet side and
   * arch across to the sun's side; standing, it hangs and breathes. Returns how many draws it made.
   */
  draw(c: Ctx, toy: Toy, most: number): number {
    if (this.scale <= 0) return 0
    let draws = 0
    for (const bow of toy.weather.bows) {
      if (draws >= most) break
      const show = toy.show, mine = show.kind === 'sun' && show.bow && bow.sun === show.sun && bow.cloud === show.cloud
      const across = mine ? 0.12 * show.rise + 0.88 * show.arch : 1, hang = mine ? show.hang : 1
      if (across <= 0) continue
      const sprite = this.sprite(bow), mx = FELT.x + ((bow.from + bow.to) / 2 + 0.5) * CELL, foot = FELT.y + bow.row * CELL
      const breath = 1 + 0.025 * hang * Math.sin(toy.t * 1.4)
      c.save()
      if (across < 1) {
        // Only as far as the strands have come, from the wet side over the top.
        c.beginPath()
        c.moveTo(mx, foot)
        if (bow.from <= bow.to) c.arc(mx, foot, sprite.rx + sprite.ry, Math.PI, Math.PI * (1 + across))
        else c.arc(mx, foot, sprite.rx + sprite.ry, 0, -Math.PI * across, true)
        c.clip()
      }
      c.drawImage(sprite.canvas, mx - (sprite.rx + BOW_PAD), foot - (sprite.ry + BOW_PAD) * breath, (sprite.rx + BOW_PAD) * 2, (sprite.ry + BOW_PAD) * breath)
      c.restore()
      draws++
    }
    return draws
  }
}
