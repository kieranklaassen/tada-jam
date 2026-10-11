import { beetle, beetleHat, beetleOpen, letter, mouseA, mouseAPoints, mouseB, mouseBPoints, owl, owlHead, squirrel, squirrelTail } from './figures'
import { NIGHT, type Item } from './frame'
import { C, INK, PAPER, SHADOW, type G, type SpriteDef } from './paint'
import { cupRopeSprite, cupSprite, cupTubSprite, iconSprite, pieceSprite, seatSprite } from './pieces'
import { acornSprite, backdropSprite, birdSprite, cloudSprite, drawGlow, fallenLeafSprite, handSprite, leafSprite, moonSprite, snailSprite, sunSprite, windowSprite } from './scenery'
import { STAGE, type Fit } from './stage'
import type { Folk } from './tree'
import type { Kind } from './ways'

// Stamps a composed frame onto the canvas. Every card is painted once, at
// the density the surface is shown at, and stamped from then on; the pupils,
// the pegs and the glow are the only things stroked live. A card under the
// evening sheet is the same card painted once more with the sheet's blue
// laid over it.

const FIXED: Record<string, SpriteDef> = {
  backdrop: backdropSprite, sun: sunSprite, moon: moonSprite, 'cloud-a': cloudSprite(74), 'cloud-b': cloudSprite(56), bird: birdSprite, snail: snailSprite,
  acorn: acornSprite, leaf: fallenLeafSprite, hand: handSprite, cup: cupSprite, 'cup-rope': cupRopeSprite, 'cup-tub': cupTubSprite,
  squirrel, 'squirrel-tail': squirrelTail, letter, owl, 'owl-head': owlHead, 'mouse-a': mouseA, 'mouse-b': mouseB, 'mouse-a-point': mouseAPoints, 'mouse-b-point': mouseBPoints, beetle, 'beetle-open': beetleOpen, 'beetle-hat': beetleHat,
}

function defOf(id: string): SpriteDef | null {
  if (FIXED[id]) return FIXED[id]
  const [what, a, b, c] = id.split(':')
  if (what === 'leaves') return leafSprite(Number(a))
  if (what === 'icon') return iconSprite(a as Kind)
  // A piece, as it hangs; with its lanterns burning; with its wheels turned (`t`); or with a bump part-way along it (`r`).
  if (what === 'piece') return pieceSprite(a as Kind, Number(b), c === 'lit', c?.[0] === 't' ? Number(c.slice(1)) : 0, c?.[0] === 'r' ? Number(c.slice(1)) : -1)
  if (what === 'seat') return seatSprite(Number(a))
  if (what === 'window') return windowSprite(a as Folk)
  return null
}

/** The evening sheet over a card: a deep blue laid on whatever is printed there. */
const SHEET = 'rgba(26, 34, 92, 0.56)'
const PEG_NIGHT = '#8f93b8', PIN_NIGHT = '#6e6a86'

type Painted = { def: SpriteDef; canvas: HTMLCanvasElement }

export class Renderer {
  private sprites = new Map<string, Painted>()
  private density = 0

  constructor(private readonly g: G) {}

  /** The cards are painted again when the surface's density changes, so the print stays sharp at every tier. */
  private painted(id: string, density: number): Painted | null {
    if (density !== this.density) { this.sprites.clear(); this.density = density }
    const have = this.sprites.get(id)
    if (have) return have
    const night = id.endsWith(NIGHT)
    const def = defOf(night ? id.slice(0, -NIGHT.length) : id)
    if (!def) return null
    // Pieces are painted for the place they are in, so a long visit could paint many: the oldest go first.
    if (this.sprites.size > 150) for (const key of [...this.sprites.keys()].filter((one) => one.startsWith('piece:') || one.startsWith('seat:')).slice(0, 50)) this.sprites.delete(key)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.ceil(def.w * density))
    canvas.height = Math.max(1, Math.ceil(def.h * density))
    const g = canvas.getContext('2d')!
    g.setTransform(density, 0, 0, density, -def.x * density, -def.y * density)
    def.draw(g)
    if (night) {
      g.globalCompositeOperation = 'source-atop'
      g.fillStyle = SHEET
      g.fillRect(def.x, def.y, def.w, def.h)
      g.globalCompositeOperation = 'source-over'
      def.night?.(g)
    }
    const painted = { def, canvas }
    this.sprites.set(id, painted)
    return painted
  }

  /** Draws the list. `dpr` is the surface's pixel ratio and `fit` how the stage sits in it. */
  draw(list: readonly Item[], dpr: number, fit: Fit): void {
    const g = this.g
    const k = dpr * fit.scale
    if (!(k > 0)) return
    const ox = dpr * fit.x, oy = dpr * fit.y
    const set = (m: readonly number[]): void => g.setTransform(k * m[0], k * m[1], k * m[2], k * m[3], k * m[4] + ox, k * m[5] + oy)
    /** What lies below `floor` on the stage is not drawn: it is behind a hill, a trough's wall or a bucket. */
    const cut = (floor: number | undefined): boolean => {
      if (floor === undefined) return false
      g.save()
      set([1, 0, 0, 1, 0, 0])
      g.beginPath()
      g.rect(0, 0, STAGE.width, floor)
      g.clip()
      return true
    }
    for (const item of list) {
      if (item.t === 'sprite') {
        const painted = this.painted(item.id, k)
        if (!painted) continue
        const { def, canvas } = painted
        if (item.rows) {
          // A band of rows of a card that is not turned: the page above the edge of the evening sheet, or below it.
          const from = Math.round((item.rows[0] - def.y) * k), to = Math.round((item.rows[1] - def.y) * k)
          if (to <= from) continue
          set(item.m)
          g.drawImage(canvas, 0, from, canvas.width, to - from, def.x, def.y + from / k, def.w, (to - from) / k)
          continue
        }
        const clipped = cut(item.floor)
        set(item.m)
        g.globalAlpha = item.alpha
        g.drawImage(canvas, def.x, def.y, def.w, def.h)
        g.globalAlpha = 1
        if (clipped) g.restore()
      } else if (item.t === 'eyes') {
        const clipped = cut(item.floor)
        set(item.m)
        g.globalAlpha = item.alpha
        // Open eyes are filled pupils that look at something; shut eyes are one short line each.
        g.beginPath()
        item.at.forEach((eye, index) => {
          if (item.shut[index]) return
          const x = eye.x + item.look.x * item.r * 0.42, y = eye.y + item.look.y * item.r * 0.42
          g.moveTo(x + item.r * 0.52, y)
          g.arc(x, y, item.r * 0.52, 0, Math.PI * 2)
        })
        g.fillStyle = INK
        g.fill()
        if (item.shut.some(Boolean)) {
          g.beginPath()
          item.at.forEach((eye, index) => {
            if (!item.shut[index]) return
            // The whole white is covered by the lid, and the lid's edge is the line.
            g.moveTo(eye.x - item.r * 0.8, eye.y + 1)
            g.quadraticCurveTo(eye.x, eye.y + item.r * 0.5, eye.x + item.r * 0.8, eye.y + 1)
          })
          g.strokeStyle = INK
          g.lineWidth = Math.max(1.6, item.r * 0.3)
          g.lineCap = 'round'
          g.stroke()
        }
        g.globalAlpha = 1
        if (clipped) g.restore()
      } else if (item.t === 'pegs') {
        // Plain pale pegs, each a small card: its shadow, then the peg, by day or under the evening sheet, then its pin.
        set([1, 0, 0, 1, 0, 0])
        const body = (dx: number, dy: number, colour: string, night: boolean | null): void => {
          g.beginPath()
          for (const peg of item.pegs) {
            if (night !== null && peg.night !== night) continue
            const tx = Math.sin(peg.lean) * 16, ty = -Math.cos(peg.lean) * 16
            g.moveTo(peg.x + dx - 5, peg.y + dy + 3)
            g.lineTo(peg.x + dx + tx - 5, peg.y + dy + ty)
            g.arc(peg.x + dx + tx, peg.y + dy + ty, 5, Math.PI, 0)
            g.lineTo(peg.x + dx + 5, peg.y + dy + 3)
            g.closePath()
          }
          g.fillStyle = colour
          g.fill()
        }
        body(2, 3, SHADOW, null)
        body(0, 0, PAPER, false)
        body(0, 0, PEG_NIGHT, true)
        g.beginPath()
        for (const peg of item.pegs) { g.moveTo(peg.x + 3, peg.y - 4); g.arc(peg.x, peg.y - 4, 3, 0, Math.PI * 2) }
        g.fillStyle = item.pegs.every((peg) => peg.night) ? PIN_NIGHT : C.woodDark
        g.fill()
      } else {
        set([1, 0, 0, item.ry / item.r, 0, item.y * (1 - item.ry / item.r)])
        drawGlow(g, item.x, item.y, item.r, item.alpha)
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0)
  }

  dispose(): void {
    this.sprites.clear()
  }
}
