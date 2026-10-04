import type { DoughBody, Form } from './doughBody'
import { paintBadger } from './lookBadger'
import { paintBear } from './lookBear'
import { paintCrow } from './lookCrow'
import { mulberry32, type Print } from './lookCut'
import { paintDachshund } from './lookDachshund'
import { paintDuck } from './lookDuck'
import { paintGoat } from './lookGoat'
import { HAND, drawMarks, paintHand } from './lookGuide'
import { paintChick, paintHen } from './lookHen'
import { INK, Press, type Sprite } from './lookInk'
import { SPOTS, layout, type Box, type Layout, type Spot } from './lookLayout'
import { paintMole } from './lookMole'
import { paintDish, paintDoor, paintFire, paintJar, paintJug, paintPeel, paintSack } from './lookProps'
import { paintRoom } from './lookRoom'
import { paintSparrow } from './lookSparrows'
import { createStuffPainter } from './lookStuff'
import { drawExtras, drawWisps } from './lookWisps'
import type { Pose, Who } from './motion'
import { FIGURE, type Figure, type Rect } from './stage'
import type { Place } from './stuff'
import type { Extra, Wisp } from './wisps'

// The look of Bread Day: a linocut. One sheet of cream paper, three flat inks
// and a dark key block that is carved, not drawn. Everything that keeps its
// shape is printed into a cached sprite (lookInk.ts) and laid whole, posed as
// a cut-out piece: the room first, which is the one full-surface composite,
// then the cast, the tools and the peel. What the finger shapes, and every
// bread, is drawn live by its form (lookStuff.ts). The look holds no rule of
// the game: it draws the frame it is handed.

/** The fire's three stills, in the order it flickers through them, eight a second. Time 0 shows the first. */
const FLICKER = [0, 1, 2, 1, 0, 2, 1, 0, 2, 0, 1, 2, 2, 1]
/** Where the middle of the lump lies on the peel's own sprite, as shares of its box. */
const ON_PEEL = { u: (SPOTS.dough[0] + SPOTS.dough[2] / 2 - SPOTS.peel[0]) / SPOTS.peel[2], v: (SPOTS.dough[1] + SPOTS.dough[3] / 2 - SPOTS.peel[1]) / SPOTS.peel[3] }

/** What the game hands the look for one frame. All positions are in reference units. */
export type Frame = {
  pose(who: Who): Readonly<Pose>
  /** The peel: where the middle of its load is, how large it is drawn, and the place it is in. */
  peel: Readonly<{ x: number; y: number; scale: number }>
  place: Place
  doorShut: boolean
  /** What lies on the peel, under the finger. */
  body: DoughBody
  form: Form | null
  jar: boolean
  dish: boolean
  /** The cast, back to front. One marked `front` is on the peel and is laid over it. */
  figures: readonly { figure: Figure; box: Rect; pose: Readonly<Pose>; front?: boolean; floured?: boolean }[]
  /** What a reaction leaves on a customer: strings of dough, a seed in a tooth, soot on a nose. */
  extras: readonly Extra[]
  /** The badger is white with flour. */
  floured: boolean
  /** Steam, shimmer, clouds, smoke and a rolling seed. */
  wisps: readonly Wisp[]
  /** Things drawn at rest by their form: the rack, the hand, a customer's hold, the badger's own lump. */
  things: readonly { form: Form; x: number; y: number; scale: number; turn: number }[]
  specks: readonly { x: number; y: number; size: number; wet: boolean }[]
  /** The idle ladder: how strong the marks are round the thing a child would want next, and the box of that thing. */
  glow: number
  wanted: Rect | null
  /** The ghost hand's fingertip, how far it is pressed (0..1) and how solid it is (0..1), or null. */
  hand: { x: number; y: number; press: number; opacity: number } | null
}

export type Look = {
  /**
   * Sizes the look for a surface. The room is reprinted when the surface changes size or the pixel ratio rises
   * above what it was printed at, and the pieces are printed again as they are next needed; a lower ratio (a
   * cheaper quality tier) only scales the same prints down. Does nothing when neither changed.
   */
  resize(width: number, height: number, dpr: number): void
  /**
   * Lays one frame at `seconds` of attended time and returns how many sprites and paths it drew. With no frame it
   * lays the bare room: what the surface shows until the saved state has been read.
   */
  draw(g: CanvasRenderingContext2D, seconds: number, frame?: Frame | null): number
  /** Where each piece is, in logical pixels, once the look has a size. */
  readonly layout: Layout | null
}

type Paint = (p: Print) => void
const REST: Pose = { dx: 0, dy: 0, turn: 0, sx: 1, sy: 1, frame: 0 }

/** How each figure of the cast is printed: its painter in two states, and a seed of its own. */
const CAST: Record<Figure, { seed: number; paint: (p: Print, other: boolean) => void }> = {
  goat: { seed: 7, paint: (p) => paintGoat(p) },
  sparrow0: { seed: 12, paint: paintSparrow }, sparrow1: { seed: 13, paint: paintSparrow }, sparrow2: { seed: 14, paint: paintSparrow },
  dachshund: { seed: 41, paint: paintDachshund }, bear: { seed: 42, paint: paintBear }, mole: { seed: 43, paint: paintMole },
  crow: { seed: 44, paint: paintCrow }, hen: { seed: 45, paint: paintHen }, duck: { seed: 46, paint: paintDuck },
  chick0: { seed: 47, paint: paintChick }, chick1: { seed: 48, paint: paintChick }, chick2: { seed: 49, paint: paintChick },
}

export function createLook(): Look {
  /** `ratio` is the surface's pixel ratio now; `printed` is the ratio the pieces are printed at. */
  let width = 0, height = 0, ratio = 0, printed = 0
  let plan: Layout | null = null, room: Sprite | null = null
  /** A small press kept for the pieces: each is printed the first time a frame needs it, so no frame prints them all. */
  let press: Press | null = null
  const made = new Map<string, Sprite>()
  const stuff = createStuffPainter(31)

  const piece = (key: string, w: number, h: number, seed: number, paint: Paint): Sprite | null => {
    let sprite = made.get(key)
    if (!sprite && press) { sprite = press.print(w, h, seed, paint); made.set(key, sprite) }
    return sprite ?? null
  }
  const spot = (name: Spot, seed: number, paint: Paint, key: string = name) => piece(key, SPOTS[name][2], SPOTS[name][3], seed, paint)
  // A figure white with flour: the same print, dusted. Flecks of paper are laid over its ink and nowhere else, so
  // it keeps its outline and its dark shows through.
  let flour: HTMLCanvasElement | null = null
  const dusted = (key: string, sprite: Sprite | null): Sprite | null => {
    if (!sprite) return null
    const cached = made.get(`${key}:dusted`)
    if (cached) return cached
    if (!flour) {
      flour = document.createElement('canvas')
      flour.width = flour.height = 96
      const f = flour.getContext('2d'), rnd = mulberry32(77)
      if (f) { f.fillStyle = INK.paper; for (let i = 0; i < 520; i++) { const s = 2 + Math.floor(rnd() * 3); f.fillRect(Math.floor(rnd() * 96), Math.floor(rnd() * 96), s, s) } }
    }
    const canvas = document.createElement('canvas')
    canvas.width = sprite.canvas.width; canvas.height = sprite.canvas.height
    const c = canvas.getContext('2d'), pattern = c?.createPattern(flour, 'repeat')
    if (!c || !pattern) return sprite
    c.drawImage(sprite.canvas, 0, 0)
    c.globalCompositeOperation = 'source-atop'
    c.fillStyle = pattern
    c.fillRect(0, 0, canvas.width, canvas.height)
    const white = { canvas, w: sprite.w, h: sprite.h }
    made.set(`${key}:dusted`, white)
    return white
  }

  return {
    get layout() { return plan },

    resize(w, h, dpr) {
      if (w <= 0 || h <= 0 || dpr <= 0 || (w === width && h === height && dpr === ratio)) return
      const reprint = w !== width || h !== height || dpr > printed
      width = w; height = h; ratio = dpr
      if (!reprint) return
      printed = dpr
      plan = layout(w, h)
      const at = plan, k = at.scale * printed
      const sheet = new Press(k, printed, Math.ceil(width * printed) + 2, Math.ceil(height * printed) + 2)
      room = sheet.print(width / at.scale, height / at.scale, 1, (p) => paintRoom(p, at.view), -at.ox / at.scale, -at.oy / at.scale, true)
      sheet.done()
      press?.done()
      made.clear()
      flour = null
      // The largest piece is the peel: the press for pieces is that large and no larger.
      press = new Press(k, printed, Math.ceil(SPOTS.peel[2] * k) + 4, Math.ceil(340 * k) + 4)
    },

    draw(g, seconds, frame) {
      if (!plan || !room) return 0
      const at = plan, unit = at.scale, snap = (v: number) => Math.round(v * ratio) / ratio
      const px = (x: number) => at.ox + x * unit, py = (y: number) => at.oy + y * unit
      let count = 0
      // A piece is laid whole: slid, turned and squashed about its foot, the middle of its lower edge, at any size.
      const lay = (sprite: Sprite | null, x: number, y: number, w: number, h: number, pose: Readonly<Pose>) => {
        if (!sprite) return
        count++
        const dx = pose.dx * unit, dy = pose.dy * unit
        if (pose.turn === 0 && pose.sx === 1 && pose.sy === 1) { g.drawImage(sprite.canvas, snap(x + dx), snap(y + dy), w, h); return }
        g.save()
        g.translate(snap(x + w / 2 + dx), snap(y + h + dy))
        g.rotate(pose.turn)
        g.scale(pose.sx, pose.sy)
        g.drawImage(sprite.canvas, -w / 2, -h, w, h)
        g.restore()
      }
      const box = (b: Box, sprite: Sprite | null, pose: Readonly<Pose>) => lay(sprite, b.x, b.y, b.w, b.h, pose)
      g.setTransform(ratio, 0, 0, ratio, 0, 0)
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
      g.drawImage(room.canvas, 0, 0, room.w, room.h); count++
      if (!frame) return count

      // The cast, back to front: the lane, then the hatch.
      const figureAt = ({ figure, box: [x, y, w, h], pose, floured }: Frame['figures'][number]) => {
        const other = pose.frame === 1 && figure !== 'goat', key = `${figure}:${other ? 1 : 0}`
        const sprite = piece(key, FIGURE[figure].w, FIGURE[figure].h, CAST[figure].seed, (p) => CAST[figure].paint(p, other))
        lay(floured ? dusted(key, sprite) : sprite, px(x), py(y), w * unit, h * unit, pose)
      }
      for (const figure of frame.figures) if (!figure.front) figureAt(figure)
      const badger = frame.pose('badger'), blink = badger.frame === 1, white = frame.floured
      box(at.boxes.badger, spot('badger', 8, (p) => paintBadger(p, blink, white), `badger:${blink ? 1 : 0}${white ? ':floured' : ''}`), badger)
      const flame = FLICKER[Math.floor(seconds * 8) % FLICKER.length]
      box(at.boxes.fire, spot('fire', 9 + flame, (p) => paintFire(p, flame), `fire:${flame}`), frame.pose('fire'))
      box(at.boxes.sack, spot('sack', 4, paintSack), frame.pose('sack'))
      box(at.boxes.jug, spot('jug', 5, paintJug), frame.pose('jug'))
      if (frame.jar) box(at.boxes.jar, spot('jar', 22, paintJar), frame.pose('jar'))
      if (frame.dish) box(at.boxes.dish, spot('dish', 23, paintDish), frame.pose('dish'))

      // The peel with what lies on it, at the size of the place it is in. In the oven only what the mouth shows is drawn.
      const jolt = frame.pose('peel'), size = frame.peel.scale, pw = SPOTS.peel[2] * size * unit, ph = SPOTS.peel[3] * size * unit
      const cx = px(frame.peel.x + jolt.dx * size), cy = py(frame.peel.y + jolt.dy * size), inOven = frame.place === 'oven'
      if (inOven) { const m = at.boxes.mouth; g.save(); g.beginPath(); g.rect(m.x, m.y, m.w, m.h); g.clip() }
      lay(spot('peel', 2, paintPeel), cx - ON_PEEL.u * pw, cy - ON_PEEL.v * ph, pw, ph, REST)
      count += stuff.paint(g, frame.body, frame.form, cx, cy, unit * size)
      if (inOven) g.restore()
      if (frame.doorShut) box(at.boxes.door, spot('door', 24, paintDoor), frame.pose('door'))
      // Whoever rides the peel is laid over it.
      for (const figure of frame.figures) if (figure.front) figureAt(figure)

      for (const thing of frame.things) count += stuff.still(g, thing.form, px(thing.x), py(thing.y), unit * thing.scale, thing.turn)

      count += drawExtras(g, frame.extras, px, py, unit)
      count += drawWisps(g, frame.wisps, px, py, unit)
      // Flour in the air as hard-edged flecks of paper, water as short falling strokes: one path.
      if (frame.specks.length > 0) {
        g.fillStyle = INK.paper
        g.beginPath()
        for (const speck of frame.specks) {
          const x = px(speck.x), y = py(speck.y), s = speck.size * unit
          if (speck.wet) g.rect(x - s * 0.3, y - s, s * 0.6, s * 2.2)
          else g.rect(x - s / 2, y - s / 2, s, s)
        }
        g.fill(); count++
      }
      if (frame.wanted && frame.glow > 0) {
        const [x, y, w, h] = frame.wanted
        count += drawMarks(g, px(x + w / 2), py(y + h / 2), (w / 2) * unit, (h / 2) * unit, frame.glow, seconds, unit)
      }
      if (frame.hand && frame.hand.opacity > 0.01) {
        const hand = frame.hand, squeeze = 1 - 0.1 * hand.press, sprite = piece('hand', HAND.w, HAND.h, 21, paintHand)
        if (sprite) {
          g.globalAlpha = hand.opacity
          g.save()
          g.translate(px(hand.x), py(hand.y + 10 - 10 * hand.press))
          g.scale(squeeze, squeeze)
          g.drawImage(sprite.canvas, -HAND.tipX * unit, -HAND.tipY * unit, sprite.w, sprite.h)
          g.restore()
          g.globalAlpha = 1; count++
        }
      }
      return count
    },
  }
}
