import { ACTS, during, span } from './acts'
import { DRAW_BUDGET } from './config'
import { BEAR, EYES, MUZZLE, PARTS, PART_IDS, PIVOT, type PartId } from './bear'
import { INK, paintArmShade, paintBearPart, paintBit, paintBlanket, paintCatBody, paintCatFluff, paintCatHead, paintCatTail, paintCatWet, paintCorner, paintCurtainFall, paintDamp, paintDome, paintDoorway, paintDuck, paintEarShadow, paintGlow, paintHalo, paintHand, paintHill, paintJug, paintLeaf, paintMark, paintMoonlight, paintMorningLight, paintPyjamaSleeve, paintPyjamaTrunk, paintPyjamas, paintRipple, paintShade, paintSky, paintSoap, paintStreak, paintStripes, paintSuds, paintSun, paintTint, paintTowel, paintWater, paintWig, paintWrap } from './figures'
import { CELLS, CELL_PART, COLS, DAY_FLUFF, SEEN, cellX, cellY, has, most, type Fur } from './fur'
import type { Bit, Game } from './game'
import { handPose, type Guidance, type HandPose } from './guidance'
import { hintFor } from './hint'
import { catIdle, curtainIdle, dripIdle, duckIdle, lampIdle, teddyIdle } from './idle'
import { layersOf, type LayerId } from './layers'
import { NIGHT, dimmed, makeRng, rgba, sprite, tooth, toothTile, type G, type RGB, type Sprite } from './pastel'
import { BED, CAT, DOOR, DUCK, DUCK_LIFT, LAMP, NIGHT_LIGHT, THING_IDS, TUB, WINDOW, duckSpot, type ThingId } from './room'
import { paintBackdrop, paintTubLip } from './scenery'
import { STAGE, fit, type Fit } from './stage'

// The frame: one stamp of the painted room, then the layers of layers.ts in their order, each made of sprites that
// were painted once and a few live strokes for what a sprite cannot hold (eyes, brows, a mouth, a tongue).
// Teddy's coat is the one thing repainted while the child plays, into four small canvases of its own and only
// when it has changed. Everything the view shows it reads from the game; it keeps no rule of its own.

/** Each sprite twice: as the lamp lights it, and sunk toward night blue for when the lamp is down. */
type Pair = { up: Sprite; down: Sprite }
type Layer = { base: Sprite; canvas: HTMLCanvasElement; g: G; cells: number[] }

const MARKS = ['mud', 'foam', 'wet', 'fluff', 'tuft'] as const
const BITS = ['bubble', 'drop', 'puff', 'dust'] as const
const STREAKS = ['smear', 'wipe', 'damp', 'steam', 'gleam'] as const
const PJ: RGB = [246, 128, 118], CAT_C: RGB = [220, 212, 246], TONGUE: RGB = [246, 140, 150]
const CURTAIN = { cx: (WINDOW.left + WINDOW.right) / 2, half: (WINDOW.right - WINDOW.left) / 2 + 22, top: WINDOW.top - 22, width: (WINDOW.right - WINDOW.left) / 2 + 2, height: WINDOW.bottom - WINDOW.top + 40 } as const
const GLASS = { x: DOOR.glass.left, y: DOOR.glass.top, w: DOOR.glass.right - DOOR.glass.left, h: DOOR.glass.bottom - DOOR.glass.top } as const
const PANE = { x: WINDOW.left, y: WINDOW.top, w: WINDOW.right - WINDOW.left, h: WINDOW.bottom - WINDOW.top } as const
const smooth = (t: number): number => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c) }

/** Each cell's own small shove, so the marks of a coat do not stand in rows. */
const JITTER = Array.from({ length: CELLS }, (_, i) => { const r = makeRng(i * 7919 + 13); return { x: (r.next() - 0.5) * 16, y: (r.next() - 0.5) * 16, turn: r.next() * 6.3 } })
/** Cells at his edge, with the way out from him there: where a tuft of fluff can stand past his outline. */
const EDGE = Array.from({ length: CELLS }, (_, i) => {
  const part = CELL_PART[i]
  if (!part) return null
  const open = [i - 1, i + 1, i - COLS, i + COLS].some((j) => j < 0 || j >= CELLS || !CELL_PART[j])
  if (!open) return null
  const middle = PARTS[part].reduce((best, e) => (Math.hypot(e.x - cellX(i), e.y - cellY(i)) < Math.hypot(best.x - cellX(i), best.y - cellY(i)) ? e : best))
  const d = Math.hypot(cellX(i) - middle.x, cellY(i) - middle.y) || 1
  return { x: (cellX(i) - middle.x) / d, y: (cellY(i) - middle.y) / d }
})

export class RoomView {
  private readonly g: G
  private dpr = 1
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private res = 0
  /** The most flying bits drawn at once, from the quality tier. */
  bits = 36
  private backdrop: Pair | null = null
  private sprites: Record<string, Pair> = {}
  private marks: Record<string, Sprite> = {}
  private layers: Record<PartId, Layer> | null = null
  private coat = { version: -1, dark: false }
  /** How wide the lamp's halo stands, eased here: it is a view of the lamp, not a rule. */
  private halo = { v: 3.4, d: 0, set: false }
  /** How wide the halo stands now, for the test that a room found again opens as it was left. */
  get haloWidth(): number { return this.halo.v }
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** What the last frame cost: sprites stamped onto the surface, and live strokes and fills. */
  readonly drawn = { stamps: 0, pen: 0 }
  private dark = false
  /** What is still on his coat, for the pillow he sleeps on. */
  private smudge = { mud: false, foam: false }

  constructor(canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!
  }

  /** The surface's size in CSS pixels and its pixel ratio. Sprites are painted again when their density changes. */
  resize(width: number, height: number, dpr: number): void {
    this.dpr = dpr
    this.by = fit(width, height)
    if (this.by.scale <= 0) return
    const res = Math.min(2.5, Math.ceil(dpr * this.by.scale * 4) / 4)
    const marginX = this.by.x / this.by.scale, marginY = this.by.y / this.by.scale
    const tile = toothTile(res, 7)
    if (res !== this.res) { this.res = res; this.paintSprites(tile) }
    const room = sprite(STAGE.width + marginX * 2 + 2, STAGE.height + marginY * 2 + 2, marginX + 1, marginY + 1, res, (g) => paintBackdrop(g, makeRng(41), marginX + 1, marginY + 1))
    tooth(room, tile, 0.36, false)
    this.backdrop = { up: room, down: dimmed(room, 0.52) }
  }

  private paintSprites(tile: HTMLCanvasElement): void {
    const res = this.res
    const pair = (w: number, h: number, ax: number, ay: number, seed: number, paint: (g: G, rng: ReturnType<typeof makeRng>) => void): Pair => {
      const up = sprite(w, h, ax, ay, res, (g) => paint(g, makeRng(seed)))
      tooth(up, tile, 0.2)
      return { up, down: dimmed(up) }
    }
    const c = CURTAIN, door = { w: DOOR.right - DOOR.left, h: DOOR.bottom - DOOR.top }
    this.sprites = {
      curtainL: pair(c.width + 30, c.height + 20, 14, 8, 3, (g, rng) => paintCurtainFall(g, rng, -1, c.width, c.height)),
      curtainR: pair(c.width + 30, c.height + 20, c.width + 16, 8, 4, (g, rng) => paintCurtainFall(g, rng, 1, c.width, c.height)),
      lip: pair(TUB.right - TUB.left + 20, 120, -TUB.left + 10, -TUB.water + 30, 5, paintTubLip),
      duck: pair(200, 150, 100, 78, 9, paintDuck),
      catBody: pair(170, 170, 80, 146, 11, paintCatBody),
      catWet: pair(170, 180, 80, 156, 11, paintCatWet),
      catFluff: pair(270, 260, 135, 240, 14, paintCatFluff),
      catHead: pair(140, 130, 70, 112, 12, paintCatHead),
      catTail: pair(120, 130, 30, 96, 13, paintCatTail),
      soap: pair(104, 72, 52, 36, 15, paintSoap),
      jug: pair(150, 130, 76, 62, 16, paintJug),
      towel: pair(140, 200, 70, 100, 17, paintTowel),
      pyjamas: pair(140, 160, 70, 78, 18, paintPyjamas),
      blanket: pair(170, 100, 85, 50, 19, paintBlanket),
      shadeOff: pair(150, 124, 75, 62, 21, (g, rng) => paintShade(g, rng, false)),
      shadeLit: pair(150, 124, 75, 62, 21, (g, rng) => paintShade(g, rng, true)),
      wrap: pair(460, 330, 230, 306, 24, paintWrap),
      trunk: pair(300, 280, 150, 300, 25, paintPyjamaTrunk),
      sleeveL: pair(180, 220, 236, 300, 26, (g, rng) => paintPyjamaSleeve(g, rng, -1)),
      sleeveR: pair(180, 220, -56, 300, 27, (g, rng) => paintPyjamaSleeve(g, rng, 1)),
      dome: pair(230, 190, 115, 176, 28, (g, rng) => paintDome(g, rng, false)),
      lump: pair(230, 210, 115, 196, 29, (g, rng) => paintDome(g, rng, true)),
      corner: pair(150, 160, 75, 16, 30, paintCorner),
      wig: pair(120, 100, 60, 64, 32, paintWig),
      suds: pair(380, 190, 190, 160, 33, paintSuds),
      leaf: pair(door.w + 8, door.h + 8, 4, 4, 34, (g, rng) => paintLeaf(g, rng, door.w, door.h, { x: GLASS.x - DOOR.left, y: GLASS.y - DOOR.top, w: GLASS.w, h: GLASS.h })),
    }
    const plain = (size: number, paint: (g: G) => void): Sprite => sprite(size, size, size / 2, size / 2, res, paint)
    const soft = (paint: (g: G) => void): Sprite => sprite(200, 200, 100, 100, Math.min(res, 1), paint)
    const m: Record<string, Sprite> = {}
    for (const mark of MARKS) m[mark] = sprite(88, 88, 44, 44, Math.min(res, 2), (g) => paintMark(g, makeRng(23 + mark.length), mark))
    for (const kind of BITS) m[kind] = plain(48, (g) => paintBit(g, kind))
    for (const kind of STREAKS) m[kind] = plain(48, (g) => paintStreak(g, kind))
    m.halo = soft(paintHalo)
    m.glow = plain(200, paintGlow)
    m.moon = soft(paintMoonlight)
    m.mint = soft((g) => paintTint(g, 'mint'))
    m.amber = soft((g) => paintTint(g, 'amber'))
    m.stripes = soft(paintStripes)
    m.morningLight = soft(paintMorningLight)
    m.earShadow = sprite(280, 240, 140, 120, Math.min(res, 1), paintEarShadow)
    m.armShade = sprite(130, 220, 65, 110, Math.min(res, 1), paintArmShade)
    m.damp = sprite(240, 220, 120, 110, Math.min(res, 1), (g) => paintDamp(g, makeRng(35)))
    m.hand = sprite(120, 120, 26, 20, res, paintHand)
    m.water = sprite(34, 64, 17, 0, res, paintWater)
    m.ripple = sprite(130, 34, 65, 17, res, paintRipple)
    m.sun = plain(96, paintSun)
    // The sky behind the two panes: one night sky, wide enough to turn slowly, and a morning for each pane.
    m.nightSky = sprite(360, 360, 180, 180, res, (g) => { g.translate(-180, -180); paintSky(g, makeRng(36), 360, 360, 'night', false) })
    m.paneMorning = sprite(PANE.w, PANE.h, 0, 0, res, (g) => paintSky(g, makeRng(37), PANE.w, PANE.h, 'morning', false))
    m.glassMorning = sprite(GLASS.w, GLASS.h, 0, 0, res, (g) => paintSky(g, makeRng(38), GLASS.w, GLASS.h, 'morning', false))
    for (const day of [true, false]) {
      m[day ? 'paneHillDay' : 'paneHillNight'] = sprite(PANE.w, PANE.h, 0, 0, res, (g) => { g.beginPath(); g.rect(0, 0, PANE.w, PANE.h); g.clip(); paintHill(g, PANE.w, PANE.h, day) })
      m[day ? 'glassHillDay' : 'glassHillNight'] = sprite(GLASS.w, GLASS.h, 0, 0, res, (g) => { g.beginPath(); g.rect(0, 0, GLASS.w, GLASS.h); g.clip(); paintHill(g, GLASS.w, GLASS.h, day) })
    }
    m.doorway = sprite(door.w, door.h, 0, 0, res, (g) => paintDoorway(g, makeRng(39), door.w, door.h))
    for (const key of Object.keys(m)) if (!['halo', 'glow', 'moon', 'mint', 'amber', 'stripes', 'morningLight', 'earShadow', 'armShade', 'damp', 'water', 'ripple'].includes(key) && !(MARKS as readonly string[]).includes(key) && !(BITS as readonly string[]).includes(key) && !(STREAKS as readonly string[]).includes(key)) tooth(m[key], tile, 0.2)
    this.marks = m
    // Teddy's four pieces, and a canvas beside each for the piece with its coat.
    const layers = {} as Record<PartId, Layer>
    for (const part of PART_IDS) {
      const box = boundsOf(part)
      const base = sprite(box.w, box.h, -box.x, -box.y, res, (g) => paintBearPart(g, makeRng(31 + part.length * 3 + part.charCodeAt(3)), part))
      tooth(base, tile, 0.2)
      const canvas = document.createElement('canvas')
      canvas.width = base.canvas.width; canvas.height = base.canvas.height
      const cells: number[] = []
      for (let i = 0; i < CELLS; i++) if (CELL_PART[i] && cellX(i) > box.x - 8 && cellX(i) < box.x + box.w + 8 && cellY(i) > box.y - 8 && cellY(i) < box.y + box.h + 8) cells.push(i)
      layers[part] = { base, canvas, g: canvas.getContext('2d')!, cells }
    }
    this.layers = layers
    this.coat.version = -1
  }

  /** Lays the coat's marks over each piece of him. Runs only when the coat or the light has changed. */
  private paintCoat(fur: Fur, dark: boolean): void {
    const res = this.res, marks = this.marks
    this.smudge = { mud: has(fur, 'mud'), foam: has(fur, 'foam') }
    // Less than can be seen is not drawn, and what is drawn is never fainter than a child can see.
    const seen = (value: number): number => 0.3 + 0.7 * value
    for (const part of PART_IDS) {
      const layer = this.layers![part], g = layer.g, base = layer.base
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'
      g.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
      g.drawImage(base.canvas, 0, 0)
      const mark = (s: Sprite, i: number, alpha: number, size: number, dx = 0, dy = 0): void => {
        const j = JITTER[i], w = s.w * size
        g.globalAlpha = Math.min(1, alpha)
        g.setTransform(res, 0, 0, res, (cellX(i) + j.x + dx - base.x) * res, (cellY(i) + j.y + dy - base.y) * res)
        g.rotate(j.turn)
        g.drawImage(s.canvas, -w / 2, -w / 2, w, w)
      }
      // Fluff, mud and wet are in the fur, so they keep to his shape. A neighbour's mark may lap onto this piece.
      g.globalCompositeOperation = 'source-atop'
      for (const i of layer.cells) if (fur.fluff[i] > DAY_FLUFF + 0.06) mark(marks.fluff, i, ((fur.fluff[i] - DAY_FLUFF) / (1 - DAY_FLUFF)) * 0.7, 1)
      for (const i of layer.cells) if (fur.mud[i] >= SEEN) mark(marks.mud, i, seen(fur.mud[i]) * 1.15, 1)
      for (const i of layer.cells) if (fur.wet[i] >= SEEN) mark(marks.wet, i, seen(fur.wet[i]) * 0.62, 1)
      // Foam and tufts of fluff stand on him and past his edge, each on its own piece only.
      g.globalCompositeOperation = 'source-over'
      for (const i of layer.cells) {
        if (CELL_PART[i] !== part) continue
        const out = EDGE[i]
        // Tufts stand out of his outline here and there, of uneven sizes: a ragged edge, never a row of beads.
        if (out && fur.fluff[i] > 0.7 && fur.mud[i] < SEEN && JITTER[i].turn > 2.9) mark(marks.tuft, i, (fur.fluff[i] - 0.7) * 3.3, 0.7 + (JITTER[i].x + 8) / 22, out.x * 12, out.y * 12)
        if (fur.foam[i] >= SEEN) mark(marks.foam, i, seen(fur.foam[i]) * 1.5, 0.62 + fur.foam[i] * 0.5)
      }
      if (dark) {
        g.setTransform(1, 0, 0, 1, 0, 0)
        g.globalAlpha = 1
        g.globalCompositeOperation = 'source-atop'
        g.fillStyle = rgba(NIGHT, 0.52)
        g.fillRect(0, 0, layer.canvas.width, layer.canvas.height)
      }
    }
  }

  private pick(p: Pair): Sprite {
    return this.dark ? p.down : p.up
  }

  /** Draws the room as it stands. With no game yet (the slot is still being read) it draws the bare room. */
  draw(game: Game | null, guidance: Guidance | null, step: number): void {
    const g = this.g, by = this.by, k = this.dpr * by.scale
    this.drawn.stamps = 0; this.drawn.pen = 0
    if (by.scale <= 0 || !this.backdrop) return
    // The lamp down makes the room dark, until the morning lights it.
    this.dark = game !== null && game.show.lamp === 'down' && game.env.morning < 0.5
    g.setTransform(k, 0, 0, k, this.dpr * by.x, this.dpr * by.y)
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    this.put(this.pick(this.backdrop))
    if (!game) return
    // The halo eases toward the lamp, in short steps so a long frame cannot throw it.
    const halo = this.halo, wide = game.show.lamp === 'down' ? 0.9 : game.worn('blanket', 'lamp') ? 1.5 : 3.4
    // The first frame of a room finds the halo where the saved lamp leaves it: nothing eases in on load.
    if (!halo.set) { halo.v = wide; halo.d = 0; halo.set = true }
    for (let left = Math.min(step, 0.1); left > 0; left -= 1 / 60) {
      const dt = Math.min(left, 1 / 60)
      halo.d += (wide - halo.v) * 90 * dt - halo.d * 11 * dt
      halo.v += halo.d * dt
    }
    for (const layer of layersOf(game)) this.layer(layer, game)
    if (guidance && (guidance.glow > 0 || guidance.demo !== null)) this.guide(game, guidance, game.time)
  }

  /** Paints one layer of layers.ts. */
  private layer(id: LayerId, game: Game): void {
    const g = this.g, s = this.sprites, m = this.marks, t = game.time, env = game.env
    if (id.startsWith('rest:') || id.startsWith('air:')) { this.thing(game, id.slice(id.indexOf(':') + 1) as ThingId); return }
    switch (id) {
      case 'sky': this.sky(game); return
      case 'outside': this.clipped(GLASS.x, GLASS.y, GLASS.w, GLASS.h, () => this.teddy(game)); return
      case 'doorway': this.at(DOOR.left, DOOR.top, 0, 1, 1, () => this.put(m.doorway)); return
      case 'through': this.clipped(DOOR.left, DOOR.top, DOOR.right - DOOR.left, DOOR.bottom - DOOR.top, () => this.teddy(game)); return
      // The door's leaf swings on its left edge: the further open, the narrower it shows.
      case 'leaf': this.at(DOOR.left - 4, DOOR.top - 4, 0, Math.max(0.12, 1 - env.doorAt * 0.86), 1, () => this.put(this.pick(s.leaf))); return
      case 'curtain': {
        // Two falls on one rail. Closed, they leave a gap in the middle where the sky shows; open, each is gathered at its side.
        const c = CURTAIN, wide = 0.94 - env.curtainAt * 0.62, lean = curtainIdle(t) + env.sway.v * 0.05
        // The cat's paw pulls the right fall toward the middle.
        const pulled = game.cat.paw * 0.12
        this.at(c.cx - c.half, c.top, 0, wide, 1, () => { g.transform(1, 0, lean, 1, 0, 0); this.put(this.pick(s.curtainL)) })
        this.at(c.cx + c.half, c.top, 0, wide + pulled, 1, () => { g.transform(1, 0, -lean * 0.8, 1, 0, 0); this.put(this.pick(s.curtainR)) })
        return
      }
      case 'light': this.light(game); return
      case 'shadow': {
        // The shadow his paws throw: a bear's head on the wall, whose ears waggle.
        const act = game.teddy.act, show = Math.min(span(act, 'shadow', 0.3, 0.9), 1 - span(act, 'shadow', 2.8, 3.4))
        g.globalAlpha = show
        this.at(770, 250 - show * 10, Math.sin(t * 5) * 0.06, 1.1, 1.1 + Math.sin(t * 7) * 0.05, () => this.put(m.earShadow))
        g.globalAlpha = 1
        return
      }
      case 'nightLight': {
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = env.night * (0.8 + Math.sin(t * 1.3) * 0.08)
        this.at(NIGHT_LIGHT.x, NIGHT_LIGHT.y, 0, 1.25, 1.25, () => this.put(m.halo))
        g.globalAlpha = env.night
        this.at(NIGHT_LIGHT.x, NIGHT_LIGHT.y, 0, 0.3, 0.26, () => this.put(m.glow))
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
        return
      }
      case 'lamp': this.lamp(game); return
      case 'lampCloth': this.lampCloth(game); return
      case 'drip': {
        const drip = dripIdle(t)
        if (drip !== null) this.at(72, 446 + drip * drip * 100, 0, 0.5, 0.6, () => this.put(m.drop))
        return
      }
      case 'ripple': {
        const duck = game.duck
        // Rings round the duck after a touch, and wider ones while the bath water rocks.
        const rock = during(game.tub.act, 'slosh') || during(game.tub.act, 'splash') || during(game.tub.act, 'soak') ? Math.sin(game.tub.act!.t * 9) * 0.2 : 0
        if (duck.ripple < 1.3) { g.globalAlpha = 1 - duck.ripple / 1.3; this.at(DUCK.x, TUB.water + 4, rock * 0.1, 1 + duck.ripple * 0.9 + rock, 1 + duck.ripple * 0.5, () => this.put(m.ripple)); g.globalAlpha = 1 }
        return
      }
      case 'raft': {
        // The pyjamas puffed up with air, flat on the water, under the duck.
        const puff = 0.6 + 0.4 * (game.duck.act?.id === 'raft' ? span(game.duck.act, 'raft', 0, 0.45) : 1), bob = duckIdle(t)
        this.at(DUCK.x, TUB.water + 4 + bob.bob * 0.6, Math.PI / 2 + bob.tip * 0.4, 0.5 * puff, 1.5 * puff, () => this.put(this.pick(s.pyjamas)))
        return
      }
      case 'dome': {
        const swell = this.domeAt(game)
        this.at(DUCK.x, TUB.water + 14, 0, 1.2, swell * 0.72, () => this.put(this.pick(s.dome)))
        return
      }
      case 'duck': this.duck(game); return
      case 'duckCloth': this.duckCloth(game); return
      case 'suds': {
        // As much of the hill of suds as there are suds; it swells for a moment as each step rises.
        const f = Math.min(1, game.tub.sudsAt / 3), pop = during(game.tub.act, 'suds') ? Math.sin(span(game.tub.act, 'suds', 0, 0.5) * Math.PI) * 0.08 : 0
        g.globalAlpha = Math.min(1, game.tub.sudsAt * 3)
        this.at((TUB.left + TUB.right) / 2, TUB.water + 14, 0, 0.72 + 0.28 * f + pop, 0.3 + 0.7 * f + pop, () => this.put(this.pick(s.suds)))
        g.globalAlpha = 1
        return
      }
      case 'lip': this.put(this.pick(s.lip)); return
      case 'corner': this.at(230, 566, 0, 1, 1, () => this.put(this.pick(s.corner))); return
      case 'catBehind': this.clipped(0, 0, STAGE.width, BED.top, () => this.cat(game)); return
      case 'cat': this.cat(game); return
      case 'teddy': this.teddy(game); return
      case 'bits': {
        // What flies: the newest bits, as many as the tier allows and as the frame has room for once what is
        // still to come over them (the stream, the things in the air, the idle hand) is kept back.
        const held = (game.stream ? 1 : 0) + THING_IDS.filter((thing) => game.things[thing].mode !== 'home').length * 3 + 3
        const most = Math.max(0, Math.min(this.bits, DRAW_BUDGET - this.drawn.stamps - this.drawn.pen - held))
        const from = Math.max(0, game.bits.length - most)
        for (let n = from; n < game.bits.length; n++) this.bit(game.bits[n])
        return
      }
      case 'stream': {
        const stream = game.stream!
        this.at(stream.x + Math.sin(t * 31) * 2, stream.top, 0, 1, (stream.bottom - stream.top) / 64, () => this.put(m.water))
        return
      }
    }
  }

  /** How far the blanket's dome stands out of the bath water during its act: it swells, holds the duck up, and sinks. */
  private domeAt(game: Game): number {
    return game.domeSwell()
  }

  /** Runs `paint` with nothing drawn outside a box. */
  private clipped(x: number, y: number, w: number, h: number, paint: () => void): void {
    const g = this.g
    g.save()
    g.beginPath(); g.rect(x, y, w, h); g.clip()
    paint()
    g.restore()
  }

  /** The sky behind the window and the door's glass: the stars of the night, turning slowly, and the morning with its sun. */
  private sky(game: Game): void {
    const g = this.g, m = this.marks, env = game.env, night = env.night, morning = env.morning
    if (night <= 0.02 && morning <= 0.02) return
    for (const pane of [PANE, GLASS]) {
      const window = pane === PANE
      this.clipped(pane.x, pane.y, pane.w, pane.h, () => {
        if (night > 0.02) {
          g.globalAlpha = night
          this.at(pane.x + pane.w / 2, pane.y + pane.h / 2, game.time * 0.012, 1, 1, () => this.put(m.nightSky))
          this.at(pane.x, pane.y, 0, 1, 1, () => this.put(window ? m.paneHillNight : m.glassHillNight))
        }
        if (morning > 0.02) {
          g.globalAlpha = morning
          this.at(pane.x, pane.y, 0, 1, 1, () => this.put(window ? m.paneMorning : m.glassMorning))
          // The sun climbs out from behind the hill as the morning comes, and slides back behind it as the day goes.
          this.at(pane.x + pane.w * 0.7, pane.y + pane.h * (1.05 - morning * 0.6), 0, 1, 1, () => this.put(m.sun))
          this.at(pane.x, pane.y, 0, 1, 1, () => this.put(window ? m.paneHillDay : m.glassHillDay))
        }
        g.globalAlpha = 1
      })
    }
    // The window's middle bar, which the sky was laid over.
    g.fillStyle = rgba(this.dark ? [104, 100, 150] : [198, 190, 232], 0.95)
    g.fillRect(PANE.x + PANE.w / 2 - 4, PANE.y, 8, PANE.h)
    this.drawn.pen += 1
  }

  /** The light in the room: the lamp's halo and whatever colours it, the moon through an open curtain, the morning across the bed. */
  private light(game: Game): void {
    const g = this.g, m = this.marks, t = game.time, env = game.env, lamp = game.lampFx
    const down = game.show.lamp === 'down', tent = game.worn('blanket', 'lamp'), striped = game.worn('pyjamas', 'lamp')
    // Steam makes the light flutter; the flare after the towel makes it leap.
    const flutter = during(lamp.act, 'steam') ? 1 + Math.sin(t * 43) * 0.07 : 1
    const flare = during(lamp.act, 'flare') ? 1 + Math.sin(span(lamp.act, 'flare', 0, 0.8) * Math.PI) * 0.45 : 1
    const wide = Math.max(0.1, this.halo.v) * lampIdle(t) * flutter * flare
    g.globalCompositeOperation = 'lighter'
    // While the towel rubs the shade the light is dim and towel-coloured, round the ember too when the lamp is down; under the blanket it is amber.
    const rubbed = lamp.rubbed > 0
    g.globalAlpha = rubbed ? 0.45 : 1
    this.at(LAMP.x, LAMP.y + 14, 0, wide, wide, () => this.put(rubbed ? m.mint : tent && !down ? m.amber : m.halo))
    // Under the blanket the whole room goes amber, a moment after the blanket lands.
    if (tent && !down) { g.globalAlpha = during(lamp.act, 'glowTent') ? span(lamp.act, 'glowTent', 0.3, 1.4) : 1; this.at(LAMP.x, LAMP.y + 14, 0, 4.4, 4.4, () => this.put(m.amber)) }
    g.globalAlpha = 1
    if (striped && !down) {
      // The pyjamas' stripes, thrown across the wall.
      g.globalAlpha = 0.8 * lampIdle(t) * (during(lamp.act, 'wear') ? span(lamp.act, 'wear', 0.3, 1.2) : 1)
      this.at(820, 330, -0.1, 2.6, 2.2, () => this.put(m.stripes))
      g.globalAlpha = 1
    }
    if (game.show.shade === 'foam' && !down) {
      // The light comes through the bubbles on the shade as pale spots that drift across the wall.
      for (const [dx, dy, size, pace] of [[-250, -60, 0.5, 0.11], [-150, 70, 0.3, 0.17], [-330, 40, 0.4, 0.07]] as const) {
        g.globalAlpha = 0.9
        this.at(LAMP.x + dx + Math.sin(t * pace * 6) * 46, LAMP.y + dy + Math.cos(t * pace * 4) * 22, 0, size, size * 0.9, () => this.put(m.moon))
      }
      g.globalAlpha = 1
    }
    if (this.dark && env.curtainAt > 0.05) {
      g.globalAlpha = env.curtainAt * 0.8
      this.at(PANE.x + PANE.w / 2, PANE.y + PANE.h + 60, 0, 2.6, 2.2, () => this.put(m.moon))
      g.globalAlpha = 1
    }
    if (env.morning > 0.02) {
      // Morning light falls from the window across the bed.
      g.globalAlpha = env.morning * env.curtainAt
      this.at(930, 470, 0, 2.8, 2.4, () => this.put(m.morningLight))
      g.globalAlpha = 1
    }
    g.globalCompositeOperation = 'source-over'
  }

  /** The lamp's shade, which swings on its pole when it is touched. Foam sits on it until water or the towel takes it off. */
  private lamp(game: Game): void {
    const g = this.g, s = this.sprites, m = this.marks, lamp = game.lampFx, down = game.show.lamp === 'down'
    this.at(LAMP.x, LAMP.y - 46, lamp.swing.v * 0.12, 1, 1, () => {
      g.translate(0, 46)
      this.put(down ? s.shadeOff.up : s.shadeLit.up)
      if (game.show.shade === 'foam') {
        const pop = during(lamp.act, 'lather') ? 1 + Math.sin(span(lamp.act, 'lather', 0, 0.7) * Math.PI) * 0.25 : 1
        for (const [x, y, size] of [[-30, 6, 0.62], [14, -18, 0.5], [34, 20, 0.7]] as const) this.at(x, y, 0, size * pop, size * pop, () => this.put(m.foam))
      }
    })
  }

  /** What the lamp wears: the pyjamas hung over its shade, or the blanket as a tent that glows. */
  private lampCloth(game: Game): void {
    const g = this.g, s = this.sprites, m = this.marks, lamp = game.lampFx, down = game.show.lamp === 'down'
    this.at(LAMP.x, LAMP.y - 46, lamp.swing.v * 0.12, 1, 1, () => {
      g.translate(0, 46)
      // The pyjamas drop onto the shade and settle.
      if (game.worn('pyjamas', 'lamp')) { const q = game.things.pyjamas.squash.v, drop = during(lamp.act, 'wear') ? (1 - smooth(span(lamp.act, 'wear', 0, 0.3))) * -50 : 0; this.at(0, 6 + drop, 0, 0.96 + q * 0.05, 0.9 - q * 0.05, () => this.put(this.pick(s.pyjamas))) }
      if (game.worn('blanket', 'lamp')) {
        const q = game.things.blanket.squash.v
        this.at(0, 70, 0, 0.96 + q * 0.05, 0.94 - q * 0.05, () => this.put(this.pick(s.dome)))
        if (!down) {
          g.globalCompositeOperation = 'lighter'
          g.globalAlpha = 0.7 * lampIdle(game.time)
          this.at(0, 10, 0, 0.8, 0.8, () => this.put(m.amber))
          g.globalCompositeOperation = 'source-over'
          g.globalAlpha = 1
        }
      }
    })
  }

  /** A carried thing, at its place or in the air. */
  private thing(game: Game, id: ThingId): void {
    const g = this.g, m = this.marks, thing = game.things[id], q = thing.squash.v, away = thing.mode !== 'home', s = this.pick(this.sprites[id])
    if (id === 'pyjamas' && !away) { this.at(thing.x, thing.y - 70, q * 0.22, 1, 1, () => { g.translate(0, 70); this.put(s) }); return }
    if (id === 'blanket' && !away) { this.at(thing.x, thing.y + 40, 0, 1 + q * 0.1, 1 - q * 0.16, () => { g.translate(0, -40); this.put(s) }); return }
    // The towel hangs long on its rail and is bunched in the hand; soaked, it sags.
    const sy = id === 'towel' && away ? (thing.soaked > 0 ? 0.86 : 0.62) : 1
    // In the bath it sinks into the water for a moment and comes up heavy.
    const dip = id === 'towel' && during(game.tub.act, 'soak') ? Math.sin(span(game.tub.act, 'soak', 0, 0.6) * Math.PI) * 22 : 0
    this.at(thing.x, thing.y + dip, thing.tilt, (id === 'jug' ? thing.side : 1) * (1 + q * 0.06), sy * (1 - q * 0.06), () => {
      this.put(s)
      if (id !== 'towel') return
      // Soaked from the bath it is dark with water; rubbed on mud it carries a brown print that fades.
      if (thing.soaked > 0) { g.globalAlpha = 0.6; this.at(0, 10, 0, 0.5, 0.8, () => this.put(m.damp)); g.globalAlpha = 1 }
      if (thing.print > 0.02) { g.globalAlpha = Math.min(1, thing.print); this.at(4, 6, 0.4, 1.1, 1.1, () => this.put(m.mud)); g.globalAlpha = 1 }
    })
  }

  private bit(bit: Bit): void {
    const life = bit.age / bit.life, grows = bit.kind === 'puff' || bit.kind === 'dust' || bit.kind === 'steam' || bit.kind === 'damp'
    const size = (bit.size / 40) * (grows ? 1 + life * 0.9 : bit.kind === 'gleam' ? 0.6 + Math.sin(life * Math.PI) * 0.8 : 1)
    this.g.globalAlpha = Math.max(0, bit.kind === 'drop' ? 1 - life * life : 1 - life)
    this.at(bit.x, bit.y, bit.kind === 'drop' ? Math.atan2(bit.vx, -bit.vy) + Math.PI : 0, size, size, () => this.put(this.marks[bit.kind]))
    this.g.globalAlpha = 1
  }

  /** Where the duck is and how it is turned and squashed: on the water, on the rim, on the raft, on the dome, or shot into the air. */
  private duckPose(game: Game): { x: number; y: number; turn: number; sx: number; sy: number } {
    const duck = game.duck, act = duck.act, t = game.time, bob = duckIdle(t), spot = duckSpot(game.world()), onRim = game.worn('blanket', 'duck')
    let x = spot.x, y = spot.y + (onRim ? 0 : bob.bob) + duck.hop.v * 30 - this.domeAt(game) * DUCK_LIFT.dome
    let turn = (onRim ? 0 : bob.tip) + duck.rock.v * 0.3, sy = 1 + duck.squash.v * 0.5
    // Under the stream it spins: seen from the side, it turns to face the other way and back.
    const sx = (1 - duck.squash.v * 0.25) * Math.cos(duck.spin)
    if (during(act, 'shoot')) { const p = span(act, 'shoot', 0, 0.9); y -= Math.sin(p * Math.PI) * 300; x += Math.sin(p * Math.PI) * 46; turn += p * Math.PI * 2 }
    if (during(act, 'tent', 1)) { const p = span(act, 'tent', 1, 3.2); x += Math.sin(p * Math.PI * 2) * 56; turn += Math.sin(t * 12) * 0.07 }
    if (during(act, 'squirt')) turn -= Math.sin(span(act, 'squirt', 0, 0.9) * Math.PI) * 0.5
    if (during(act, 'snore')) sy *= 1 + Math.sin(span(act, 'snore', 0, 1.1) * Math.PI) * 0.12
    if (during(act, 'wig')) sy *= 1 - Math.sin(span(act, 'wig', 0, 0.4) * Math.PI) * 0.16
    if (during(act, 'tuck')) sy *= 1 - Math.sin(span(act, 'tuck', 0, 0.5) * Math.PI) * 0.12
    return { x, y, turn, sx, sy }
  }

  private duck(game: Game): void {
    const g = this.g, s = this.sprites, m = this.marks, duck = game.duck, p = this.duckPose(game)
    const covered = game.worn('pyjamas', 'duck'), asleep = game.worn('blanket', 'duck') && game.show.lamp === 'down'
    this.at(p.x, p.y, p.turn, p.sx, p.sy, () => {
      this.put(this.pick(s.duck))
      if (game.show.duck === 'shine' || duck.gleam > 0.05) {
        // Polished: a gleam on its side that winks at each stroke.
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = Math.min(1, 0.45 + duck.gleam * 0.55)
        this.at(-22, 6, 0, 1 + duck.gleam * 0.9, 1 + duck.gleam * 0.9, () => this.put(m.gleam))
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
      }
      const wig = duck.wig
      if (!covered && wig < 0.8) {
        if (asleep) this.arc(44, -36, 7, Math.PI * 0.14, Math.PI * 0.86, 3.4)
        else this.eye(44, -32, 6.5, 7.5, game, DUCK.x + 44, DUCK.y - 32, 3)
      }
      // The wig of foam piles up, and slides down over its eyes when it is full.
      if (wig > 0.03) this.at(30, -50 + wig * wig * 20, 0, 0.3 + wig * 0.75, 0.3 + wig * 0.75, () => this.put(this.pick(s.wig)))
    })
  }

  /** What the duck wears: the pyjamas as a tent with its beak out of the neck, or the blanket tucked round it on the rim. */
  private duckCloth(game: Game): void {
    const s = this.sprites, p = this.duckPose(game)
    this.at(p.x, p.y, p.turn, Math.abs(p.sx), p.sy, () => {
      if (game.worn('pyjamas', 'duck')) { const q = game.things.pyjamas.squash.v; this.at(-4, -4, 0, 1.12 + q * 0.05, 0.86 - q * 0.05, () => this.put(this.pick(s.pyjamas))) }
      if (game.worn('blanket', 'duck')) { const q = game.things.blanket.squash.v; this.at(-18, 30, 0.05, 0.92 + q * 0.05, 0.9 - q * 0.05, () => this.put(this.pick(s.blanket))) }
    })
  }

  /** The cat: on the bed, behind it, in the pyjamas on stiff legs, or a lump under the blanket. */
  private cat(game: Game): void {
    const g = this.g, s = this.sprites, m = this.marks, cat = game.cat, act = cat.act, t = game.time, idle = catIdle(t), coat = game.show.cat
    const seat = CAT.y + 88, hop = cat.jump.v * 34
    if (game.worn('blanket', 'cat')) {
      // A cat-shaped lump: it walks to the post at the foot of the bed, bumps it, walks back and sits.
      const walking = during(act, 'lump', 0.5, 2.6), reach = cat.x - (BED.left + 13 + 98)
      const dx = during(act, 'lump') ? -(smooth(span(act, 'lump', 0.5, 1.9)) - smooth(span(act, 'lump', 1.9, 2.6))) * reach : 0
      const q = game.things.blanket.squash.v, step = walking ? Math.abs(Math.sin(act!.t * 11)) * 7 : 0
      this.at(cat.x + dx, seat + hop - step, walking ? Math.sin(act!.t * 11) * 0.04 : 0, 0.94 + q * 0.05, 0.94 - q * 0.06 + Math.sin(t * 1.2) * 0.008, () => {
        this.put(this.pick(s.lump))
        if (walking) return
        // Sitting, two eyes shine out of a fold.
        g.fillStyle = rgba([70, 50, 40], 0.75)
        g.beginPath(); g.ellipse(-6, -74, 40, 15, -0.08, 0, Math.PI * 2); g.fill()
        this.drawn.pen += 1
        for (const x of [-22, 8]) this.eye(x, -75, 6, 8, game, cat.x + x, CAT.y - 30, 2.4, true)
      })
      return
    }
    const dressed = game.worn('pyjamas', 'cat'), stiff = cat.stiff, walking = game.sceneId === 'catWalk' && stiff > 0.9
    const puff = 1 + cat.puff * 0.14
    const roll = during(act, 'roll') ? smooth(span(act, 'roll', 0, 0.35)) * (1 - smooth(span(act, 'roll', 1.4, 1.8))) : 0
    const fluff = coat === 'fluff', wet = coat === 'wet'
    // The towel on a wet cat shoves it about; the ball of fluff springs out of it.
    const shove = cat.rubbed * Math.sin(t * 40) * 4
    const ball = during(act, 'ball') ? 0.5 + 0.5 * (1 - Math.pow(1 - span(act, 'ball', 0, 0.5), 3)) * (1 + Math.sin(span(act, 'ball', 0, 0.9) * Math.PI) * 0.16) : 1
    const y = seat + hop + cat.sunk * 170 - stiff * 18 - (walking ? Math.abs(Math.sin(t * 12.5)) * 5 : 0)
    this.at(cat.x + shove, y, walking ? Math.sin(t * 12.5) * 0.03 : 0, puff, puff, () => {
      if (stiff > 0.02) {
        // Straight legs, which swing from the shoulder and never bend.
        const swing = walking ? Math.sin(t * 12.5) * 7 : 0
        g.strokeStyle = rgba(this.dark ? [112, 108, 160] : CAT_C, 1); g.lineWidth = 15; g.lineCap = 'round'
        g.beginPath(); g.moveTo(-30, -14); g.lineTo(-30 + swing, stiff * 18); g.moveTo(26, -14); g.lineTo(26 + swing, stiff * 18); g.stroke()
        g.beginPath(); g.moveTo(-8, -14); g.lineTo(-8 - swing, stiff * 18); g.moveTo(44, -14); g.lineTo(44 - swing, stiff * 18); g.stroke()
        this.drawn.pen += 2
      }
      if (fluff) {
        // A ball of fluff twice its width, with only its eyes showing.
        this.at(0, 0, 0, ball, ball, () => {
          // The towel on the dry ball of fluff: it rolls over like any dry cat, and pedals its hind legs out of the fluff.
          // A stroke lifts the ball into the finger, and a touch at its tail end makes it start.
          g.translate(0, -86); g.rotate(-roll * 1.7 + Math.sin(cat.swat * 26) * cat.swat * 0.5); g.translate(0, 86)
          g.scale(1 - cat.arch * 0.06, 1 + cat.arch * 0.12)
          this.put(this.pick(s.catFluff))
          // In the pyjamas the ball wears them stretched tight.
          if (dressed) { const q = game.things.pyjamas.squash.v; this.at(4, -70, 0, 1.5 + q * 0.05, 1.15 - q * 0.05, () => this.put(this.pick(s.pyjamas))) }
          if (cat.arch > 0.35 && roll <= 0.5) for (const x of [-30, 14]) this.arc(x, -122, 9, Math.PI * 1.12, Math.PI * 1.88, 3.6)
          else if (roll > 0.5) {
            const pedal = Math.sin(t * 22) * 12
            g.strokeStyle = rgba(this.dark ? [112, 108, 160] : CAT_C, 1); g.lineWidth = 15; g.lineCap = 'round'
            g.beginPath(); g.moveTo(60, -60); g.lineTo(104 + pedal, -64); g.moveTo(62, -104); g.lineTo(106 - pedal, -108); g.stroke()
            this.drawn.pen += 1
            for (const x of [-30, 14]) this.arc(x, -122, 9, Math.PI * 1.12, Math.PI * 1.88, 3.6)
          } else for (const x of [-30, 14]) this.eye(x, -124, 9, 11, game, cat.x + x, CAT.y - 36, 3, this.dark)
        })
        return
      }
      g.translate(0, -62); g.rotate(-roll * 1.7); g.translate(0, 62)
      const tail = idle.tail - cat.puff * 0.5 - cat.arch * 0.5 + Math.sin(cat.swat * 26) * cat.swat - stiff * 0.5
      const drawTail = (): void => this.at(44, -24, tail, wet ? 0.55 : 1, 1, () => this.put(this.pick(s.catTail)))
      // In the pyjamas its tail comes out through one sleeve, so it is drawn over them.
      if (!dressed) drawTail()
      this.at(0, 0, 0, 1 - cat.arch * 0.06, 1 + cat.arch * 0.12, () => this.put(this.pick(wet ? s.catWet : s.catBody)))
      if (dressed) { const q = game.things.pyjamas.squash.v; this.at(4, -50, 0, 1.12 + q * 0.05, 0.9 - q * 0.05, () => this.put(this.pick(s.pyjamas))); drawTail() }
      if (coat === 'foam') for (const [fx, fy, size] of [[44, -104, 0.5], [54, -70, 0.66], [46, -34, 0.44]] as const) this.at(fx, fy, 0, size, size, () => this.put(m.foam))
      if (roll > 0.5) {
        // On its back, it pedals its hind legs.
        const pedal = Math.sin(t * 22) * 12
        g.strokeStyle = rgba(this.dark ? [112, 108, 160] : CAT_C, 1); g.lineWidth = 15; g.lineCap = 'round'
        g.beginPath(); g.moveTo(34, -30); g.lineTo(70 + pedal, -34); g.moveTo(40, -62); g.lineTo(74 - pedal, -64); g.stroke()
        this.drawn.pen += 1
      }
      // Soap: it freezes, turns to lick the foam, and pulls a sour face. Water: it turns its back and looks over its shoulder.
      const licking = during(act, 'lick', 0.5, 1.2), sour = during(act, 'lick', 1.2), frozen = during(act, 'lick', 0, 0.5)
      const turned = wet && (during(act, 'drench', 0.7) || (act === null && cat.sinceWater < 2.6))
      const size = wet ? 0.86 : 1
      this.at(-8, -104 - cat.arch * 14, -cat.arch * 0.14 + cat.puff * 0.1 + (licking ? 0.5 + Math.sin(t * 16) * 0.08 : 0), size * (turned ? -1 : 1), size, () => {
        this.put(this.pick(s.catHead))
        const asleep = game.env.night > 0.5 && act === null && game.sceneId === null
        const shut = cat.arch > 0.35 || idle.blink > 0.6 || sour || asleep || roll > 0.5
        for (const x of [-24, 10]) {
          if (shut) this.arc(x, -42, 8, sour || asleep ? Math.PI * 0.14 : Math.PI * 1.12, sour || asleep ? Math.PI * 0.86 : Math.PI * 1.88, 3.6)
          else this.eye(x, -44, (frozen ? 9 : 6.5) + cat.puff * 2.5, (turned ? 5 : frozen ? 11 : 8.5) + cat.puff * 2, game, cat.x - 8 + x, CAT.y - 60, 2.6, this.dark)
        }
        if (licking || sour) {
          g.fillStyle = rgba(TONGUE, 0.96)
          g.beginPath(); g.ellipse(-8 + (licking ? Math.sin(t * 16) * 3 : 0), -12 + (sour ? 4 : 0), 6, sour ? 11 : 8, 0, 0, Math.PI * 2); g.fill()
          this.drawn.pen += 1
        }
      })
      if (sour || cat.paw > 0.02) {
        // One paw: shaken in disgust, or reached up to pull the curtain to.
        const up = cat.paw, shakeIt = sour ? Math.sin(t * 34) * 8 : 0
        g.strokeStyle = rgba(this.dark ? [112, 108, 160] : CAT_C, 1); g.lineWidth = 15; g.lineCap = 'round'
        g.beginPath(); g.moveTo(-30, -40); g.lineTo(-40 + shakeIt - up * 10, sour ? -22 : -40 - up * 190); g.stroke()
        this.drawn.pen += 1
      }
    })
  }

  /** Teddy, wherever he is: on the rug, walking, in bed, in the doorway or behind the door's glass. */
  private teddy(game: Game): void {
    const g = this.g, s = this.sprites, m = this.marks, teddy = game.teddy, layers = this.layers!, t = game.time, idle = teddyIdle(t), st = teddy.stance, act = teddy.act
    if (this.coat.version !== game.furVersion || this.coat.dark !== this.dark) { this.paintCoat(game.fur, this.dark); this.coat = { version: game.furVersion, dark: this.dark } }
    const wrapped = game.worn('blanket', 'teddy'), dressed = game.worn('pyjamas', 'teddy')
    const asleep = teddy.lying > 0 && teddy.stretch === 0
    const shaking = teddy.shake > 0 ? Math.sin(t * 46) * Math.min(1, teddy.shake * 3) : 0
    const shiver = teddy.shiver > 0.5 ? Math.sin(t * 52) * 2.4 * teddy.shiver : 0
    const wriggle = teddy.squirm * Math.sin(t * 24) * 7 + teddy.tickle * Math.sin(t * 30) * 3 + shiver
    const b = teddy.bounce.v, breath = asleep ? Math.sin(t * 1.15) * 1.4 : idle.breath
    // Touched in his sleep he sighs: his chest and the blanket rise with one quick breath in and sink with a long one out.
    const sigh = during(act, 'stir') ? (act!.t < 0.35 ? smooth(act!.t / 0.35) : 1 - smooth((act!.t - 0.35) / 0.95)) : 0
    // Walking, he rocks from foot to foot and each hop lifts him; in the blanket he sinks a little.
    const waddle = teddy.walk > 0 ? Math.sin(t * 9.7) * 0.07 : 0, sink = wrapped ? 0.025 : 0
    // The pyjamas go on over his head: they come down, his head is stuck in them for a beat, and then it is out.
    const dressing = during(act, 'dress')
    const off = !dressing ? 0 : act!.t < 0.35 ? -330 + (act!.t / 0.35) * 130 : act!.t < 1.1 ? -200 + Math.sin(act!.t * 30) * 5 : -200 * (1 - smooth(span(act, 'dress', 1.1, 1.3)))
    const stuck = off < -60
    const kick = dressing && act!.t >= 1.1 ? (act!.t < 1.4 ? 0.12 : -0.12) * Math.exp(-(act!.t - (act!.t < 1.4 ? 1.1 : 1.4)) * 9) : 0
    const peep = wrapped ? teddy.peep : 0
    const armsOver = wrapped && teddy.armL.v > 0.5
    this.at(st.x, st.y - teddy.hop, st.turn + waddle, st.scale, st.scale, () => {
      if (teddy.puddle > 0) {
        // The puddle he jumps in, and what flies out of it.
        const up = teddy.hop
        g.fillStyle = rgba([150, 190, 240], 0.9)
        g.beginPath(); g.ellipse(0, 10 + up / st.scale, 190, 34, 0, 0, Math.PI * 2); g.fill()
        g.beginPath(); g.ellipse(-210, -40 - up * 3, 26, 34, 0, 0, Math.PI * 2); g.ellipse(214, -70 - up * 2, 22, 30, 0, 0, Math.PI * 2); g.fill()
        this.drawn.pen += 2
      }
      this.at(wriggle + shaking * 9, 0, teddy.lean.v + shaking * 0.07, 1 + b * 0.05 - breath * 0.004 + sink + sigh * 0.05, 1 - b * 0.05 + breath * 0.009 - sink + teddy.stretch * 0.05 + sigh * 0.12, () => {
        const piece = (part: PartId, turn: number, dy = 0, over: Sprite | null = null, squash = 1): void => {
          const layer = layers[part], pivot = PIVOT[part]
          g.save()
          g.translate(pivot.x, pivot.y + dy); g.rotate(turn); if (squash !== 1) g.scale(1 + (1 - squash) * 0.5, squash); g.translate(-pivot.x, -pivot.y)
          const flat = part === 'head' ? teddy.squirm : 0
          // His foot thumps: it lifts off the rug and comes down, apart from the rest of him.
          // It is up for the beat before the thump and lands on it, flat for a moment.
          const lift = part === 'body' ? Math.sin(Math.min(1, teddy.thump) * Math.PI) * 20 : 0, stamp = part === 'body' ? teddy.stamp : 0
          if (lift > 0.5 || stamp > 0.05) {
            const foot = PARTS.body[2]
            g.save()
            g.beginPath(); g.rect(BEAR.left - 60, BEAR.top - 60, BEAR.width + 120, BEAR.height + 120); g.ellipse(foot.x, foot.y, foot.rx + 6, foot.ry + 6, foot.rot, 0, Math.PI * 2); g.clip('evenodd')
            g.drawImage(layer.canvas, layer.base.x, layer.base.y, layer.base.w, layer.base.h)
            g.restore()
            g.save()
            g.translate(foot.x, -lift); g.scale(1 + stamp * 0.08, 1 - stamp * 0.14); g.translate(-foot.x, 0)
            g.beginPath(); g.ellipse(foot.x, foot.y, foot.rx + 6, foot.ry + 6, foot.rot, 0, Math.PI * 2); g.clip()
            g.drawImage(layer.canvas, layer.base.x, layer.base.y, layer.base.w, layer.base.h)
            g.restore()
            this.drawn.stamps += 2
          } else
          if (flat > 0.03) {
            // Under the jug his ears go flat: each is laid out and down from where it joins his head, behind it.
            const [skull, earL, earR] = PARTS.head
            for (const ear of [earL, earR]) {
              const side = Math.sign(ear.x), px = ear.x - side * 12, py = ear.y + 26
              g.save()
              g.translate(px, py); g.rotate(side * flat * 0.95); g.scale(1, 1 - flat * 0.28); g.translate(-px, -py)
              g.beginPath(); g.ellipse(ear.x, ear.y, ear.rx + 6, ear.ry + 6, 0, 0, Math.PI * 2); g.clip()
              g.drawImage(layer.canvas, layer.base.x, layer.base.y, layer.base.w, layer.base.h)
              g.restore()
            }
            g.save()
            g.beginPath(); g.ellipse(skull.x, skull.y, skull.rx + 7, skull.ry + 7, 0, 0, Math.PI * 2); g.clip()
            g.drawImage(layer.canvas, layer.base.x, layer.base.y, layer.base.w, layer.base.h)
            g.restore()
            this.drawn.stamps += 3
          } else {
            g.drawImage(layer.canvas, layer.base.x, layer.base.y, layer.base.w, layer.base.h)
            this.drawn.stamps += 1
          }
          if (over) this.put(over)
          if (part === 'head') this.face(game, asleep, dressing && act!.t >= 1.1 && act!.t < 1.4)
          g.restore()
        }
        const arms = (): void => {
          const sleeves = dressed && !stuck
          // Hugging himself, both arms fold in across his chest; plucking at damp pyjamas, one paw picks at them.
          const pluck = teddy.pluck * (0.4 + Math.sin(t * 9) * 0.12)
          piece('armL', teddy.armL.v * 1.45 + idle.breath * 0.015 - teddy.hug * 0.7, 0, sleeves ? this.pick(s.sleeveL) : null)
          piece('armR', -teddy.armR.v * 1.45 - idle.breath * 0.015 + teddy.hug * 0.7 + pluck, 0, sleeves ? this.pick(s.sleeveR) : null)
        }
        piece('body', 0)
        // A shade on his body under each arm, so the arm keeps its edge when all of him is one pale colour.
        g.globalAlpha = 0.5
        this.at(-138, -192, 0.38, 1, 1, () => this.put(m.armShade)); this.at(138, -192, -0.38, 1, 1, () => this.put(m.armShade))
        g.globalAlpha = 1
        if (dressed && !stuck) {
          this.at(0, off, 0, 1, 1, () => this.put(this.pick(s.trunk)))
          // On wet fur dark patches spread through the cloth.
          const damp = teddy.pluck > 0.03 ? game.dampUnder('pyjamas') : null
          if (damp) { g.globalAlpha = teddy.pluck * 0.8; this.at(damp.x, damp.y, 0, 0.3 + teddy.pluck * 0.4, 0.3 + teddy.pluck * 0.5, () => this.put(m.damp)); g.globalAlpha = 1 }
        }
        if (!armsOver) arms()
        if (wrapped && peep <= 0.03) this.wrap(game, 0)
        if (armsOver) arms()
        // Under the jug his head is pressed down a little and spreads; the piece lays his ears flat.
        piece('head', teddy.nod.v * 0.6 + idle.sway + shaking * 0.1 + kick, -breath * 2.2 + (teddy.sneeze > 0.45 ? -8 : 0), null, 1 - teddy.squirm * 0.07)
        if (dressed && stuck) this.at(Math.sin(t * 30) * 3, off, 0, 1, 1, () => this.put(this.pick(s.trunk)))
        if (wrapped && peep > 0.03) {
          // He pulls the blanket up over his nose and peeps out over it, a paw on its edge at each side.
          this.wrap(game, -peep * 88)
          g.fillStyle = rgba(this.dark ? [120, 96, 96] : [226, 164, 100], 1)
          g.beginPath(); g.ellipse(-104, -284 - peep * 84, 30, 22, -0.3, 0, Math.PI * 2); g.ellipse(104, -284 - peep * 84, 30, 22, 0.3, 0, Math.PI * 2); g.fill()
          this.drawn.pen += 1
        }
        if (teddy.pressed > 0.5) {
          // Outside, his muddiest paw lies flat on the glass beside his face.
          // It is the paw that came back muddy, if one did, with its mud; else the one on the side of his muddiest place, clean.
          const places = game.rec.mudPlaces, muddy = places.includes('armL') || places.includes('armR')
          const px = (places.includes('armL') ? -1 : places.includes('armR') ? 1 : (most(game.fur, 'mud')?.x ?? 1) < 0 ? -1 : 1) * 96
          g.fillStyle = rgba([226, 164, 100], 1)
          g.beginPath(); g.ellipse(px, -272, 44, 40, 0, 0, Math.PI * 2); g.fill()
          g.fillStyle = rgba([246, 208, 160], 1)
          g.beginPath(); g.ellipse(px, -266, 26, 20, 0, 0, Math.PI * 2); g.fill()
          this.drawn.pen += 2
          if (muddy) this.at(px, -272, 0.7, 0.9, 0.9, () => this.put(m.mud))
        }
      })
      if (game.worn('pyjamas', 'lamp') && game.show.lamp === 'up' && teddy.outside === 0) {
        // The striped light falls across him too.
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = 0.5
        this.at(20, -250, -0.1, 2.2, 2.3, () => this.put(m.stripes))
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
      }
    })
    if (asleep && teddy.stretch === 0 && teddy.walk === 0 && this.smudge.mud) {
      // Mud that was still on him shows on the pillow. Foam cannot be: it keeps him from sleep.
      g.globalAlpha = 0.7
      this.at(1150, BED.top - 6, 0.5, 0.9, 0.7, () => this.put(m.mud))
      g.globalAlpha = 1
    }
  }

  /** The blanket round him, lifted by `dy` when he hides behind it, with the wet patch that spreads through it on wet fur. */
  private wrap(game: Game, dy: number): void {
    const g = this.g, teddy = game.teddy, act = teddy.act
    // It lands heavy and he sinks into it.
    const land = during(act, 'wrap') || during(act, 'wrapWet') ? Math.sin(Math.min(1, act!.t / 0.5) * Math.PI) * 0.06 : 0
    // His foot thumps under it: the blanket rises in a bump over the foot for the beat before, with a shade under the
    // bump, and comes down flat with the sound. The blanket is one colour, so the shade is what shows the bump.
    const lift = Math.sin(Math.min(1, teddy.thump) * Math.PI) * 20, stamp = teddy.stamp, sprite = this.pick(this.sprites.wrap)
    this.at(0, dy, 0, 1 + land, 1 - land, () => {
      this.put(sprite)
      if (lift <= 0.5 && stamp <= 0.05) return
      const foot = PARTS.body[2], rx = foot.rx + 8, ry = foot.ry, fy = foot.y - dy - 30
      g.globalAlpha = Math.min(1, lift / 12 + stamp)
      this.at(foot.x, fy + ry * 0.55, Math.PI / 2, 0.55, 0.8, () => this.put(this.marks.armShade))
      g.globalAlpha = 1
      g.save()
      g.translate(foot.x, -lift); g.scale(1 + stamp * 0.08, 1 - stamp * 0.14); g.translate(-foot.x, 0)
      g.beginPath(); g.ellipse(foot.x, fy, rx, ry, foot.rot, 0, Math.PI * 2); g.clip()
      this.put(sprite)
      g.restore()
    })
    // The wet patch lies where the water is under it; foam alone leaves none.
    const damp = teddy.shiver > 0.03 ? game.dampUnder('blanket') : null
    if (damp) {
      g.globalAlpha = Math.min(1, teddy.shiver) * 0.85
      this.at(damp.x, damp.y + dy, 0, 0.4 + teddy.shiver * 0.7, 0.4 + teddy.shiver * 0.6, () => this.put(this.marks.damp))
      g.globalAlpha = 1
    }
  }

  /** His face, drawn live inside the head's own turn: eyes that follow, brows, a mouth with its shapes, the bubble. */
  private face(game: Game, asleep: boolean, earCaught: boolean): void {
    const g = this.g, teddy = game.teddy, act = teddy.act, t = game.time, st = teddy.stance
    const wide = (id: 'yawn1' | 'yawn2' | 'yawn3' | 'yawnIdle', size: number): number => (during(act, id) ? Math.sin(Math.PI * span(act, id, 0, ACTS[id].length)) * size : 0)
    const yawn = Math.max(wide('yawn1', 0.62), wide('yawn2', 0.82), wide('yawn3', 1), wide('yawnIdle', 0.55), teddy.stretch * 0.7)
    const bliss = teddy.bliss > 0.45, squeezed = teddy.squirm > 0.4 || teddy.shake > 0 || (teddy.sneeze > 0 && teddy.sneeze < 0.45)
    const stirring = during(act, 'stir')
    const shut = asleep || bliss || squeezed || teddy.blink < 0 || yawn > 0.5
    const shivering = teddy.shiver > 0.5, peeping = teddy.peep > 0.5
    for (const side of [0, 1]) {
      const e = EYES[side], out = side === 0 ? -1 : 1
      const winking = side === 0 && teddy.wink > 0.5 && !shut
      if (!shut && !winking) {
        const rx = shivering ? 14.5 : 12, ry = shivering ? 17 : peeping ? 8.5 : 14
        this.eye(e.x - out * teddy.cross * 9 + (shivering ? Math.sin(t * 52) * 1.2 : 0), e.y + teddy.cross * 4, rx, ry, game, st.x + e.x * st.scale, st.y + e.y * st.scale, 7 * (1 - teddy.cross), this.dark)
      } else if (bliss && !squeezed && !asleep) this.arc(e.x, e.y + 5, 13, Math.PI * 1.1, Math.PI * 1.9, 5.5)
      else this.arc(e.x, e.y - 7 + (stirring ? 2 : 0), 12, Math.PI * 0.14, Math.PI * 0.86, 5.5)
      // Brows: lifted high under water (a brr, never a frown), by a tickle, by the soap and a little by a shiver; level at rest.
      const pinch = squeezed ? -7 : -teddy.tickle * 5 - teddy.cross * 6 - yawn * 5 - teddy.shiver * 3
      g.beginPath()
      g.moveTo(e.x - out * 15, e.y - 27 + pinch * 0.9 - (squeezed ? 4 : 2))
      g.lineTo(e.x + out * 13, e.y - 27 - pinch * 0.6 - (squeezed ? 12 : 0))
      g.strokeStyle = rgba(INK, 0.7); g.lineWidth = 5; g.lineCap = 'round'
      g.stroke()
      this.drawn.pen += 1
    }
    if (teddy.pressed > 0.5) {
      // His nose, flat against the glass.
      g.fillStyle = rgba([250, 226, 190], 0.96)
      g.beginPath(); g.ellipse(MUZZLE.x, MUZZLE.y + 2, MUZZLE.rx * 1.3, MUZZLE.ry * 1.12, 0, 0, Math.PI * 2); g.fill()
      g.fillStyle = rgba(INK, 0.95)
      g.beginPath(); g.ellipse(MUZZLE.x, MUZZLE.y - 14, 30, 17, 0, 0, Math.PI * 2); g.fill()
      this.drawn.pen += 2
    }
    else {
      // His nose, over whatever is on his coat: a face keeps its nose under foam and fluff.
      g.fillStyle = rgba(INK, 0.95)
      g.beginPath(); g.ellipse(MUZZLE.x, MUZZLE.y - 20, 20, 14, 0, 0, Math.PI * 2); g.fill()
      this.drawn.pen += 1
    }
    const my = MUZZLE.y + 16, open = teddy.sneeze <= 0.45 && (teddy.sneeze > 0 || teddy.tickle > 0.3 || teddy.cross > 0.4)
    g.fillStyle = rgba(INK, 0.95); g.strokeStyle = rgba(INK, 0.9); g.lineWidth = 4.5; g.lineCap = 'round'
    g.beginPath()
    if (yawn > 0.05) { g.ellipse(0, my + yawn * 12, 13 + yawn * 16, 6 + yawn * 27, 0, 0, Math.PI * 2); g.fill() }
    else if (teddy.sneeze > 0.45) { g.ellipse(0, my + 2, 8, 9, 0, 0, Math.PI * 2); g.fill() }
    else if (open) { g.moveTo(-23, my - 4); g.quadraticCurveTo(0, my + 34, 23, my - 4); g.closePath(); g.fill() }
    else if (squeezed) {
      // A wobbly grin: its ends stay up however it wobbles.
      const w = Math.sin(t * 23) * 4
      g.moveTo(-34, my - 12); g.quadraticCurveTo(-17, my + 6 + w, 0, my - 2); g.quadraticCurveTo(17, my - 10 - w, 34, my - 12); g.quadraticCurveTo(0, my + 40, -34, my - 12); g.fill()
    }
    // A shiver: his teeth chatter, a small mouth that opens and shuts fast.
    else if (shivering) { g.ellipse(0, my + 4, 9, 4 + Math.abs(Math.sin(t * 34)) * 6, 0, 0, Math.PI * 2); g.fill() }
    else if (asleep) { g.ellipse(0, my + 3, 6 + Math.sin(t * 1.15) * 1.6, 4 + Math.sin(t * 1.15) * 1.6, 0, 0, Math.PI * 2); g.fill() }
    else { const smile = bliss ? 22 : 15; g.moveTo(-smile, my - 2); g.quadraticCurveTo(0, my + (bliss ? 16 : 10), smile, my - 2); g.stroke() }
    this.drawn.pen += 1
    if (yawn > 0.3 || open || squeezed) {
      g.fillStyle = rgba(TONGUE, 0.95)
      g.beginPath(); g.ellipse(0, my + (yawn > 0.3 ? yawn * 30 : 14), 10 + yawn * 6, 6 + yawn * 5, 0, 0, Math.PI * 2); g.fill()
      this.drawn.pen += 1
    }
    if (teddy.bubble > 0.02) {
      const r = 5 + teddy.bubble * 27, y = MUZZLE.y - 22 - r * 0.5
      g.fillStyle = rgba([226, 230, 255], 0.5); g.beginPath(); g.arc(0, y, r, 0, Math.PI * 2); g.fill()
      g.fillStyle = rgba([255, 255, 255], 0.95); g.beginPath(); g.arc(r * 0.35, y - r * 0.35, r * 0.22, 0, Math.PI * 2); g.fill()
      this.drawn.pen += 2
    }
    if (earCaught) {
      // One ear is still caught in the collar, until it pops out after the other.
      g.fillStyle = rgba(this.dark ? [120, 70, 100] : PJ, 1)
      g.beginPath(); g.ellipse(94, -446, 50, 46, 0, 0, Math.PI * 2); g.fill()
      this.drawn.pen += 1
    }
  }

  /** An open eye whose dark follows what its owner looks at, with a spark of light, larger in the dark. */
  private eye(x: number, y: number, rx: number, ry: number, game: Game, stageX: number, stageY: number, reach: number, shine = this.dark): void {
    const g = this.g, look = game.teddy.look
    const dx = look.x - stageX, dy = look.y - stageY, d = Math.hypot(dx, dy) || 1, pull = Math.min(1, d / 260) * reach
    const ex = x + (dx / d) * pull, ey = y + (dy / d) * pull
    g.fillStyle = rgba(INK, 0.96)
    g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); g.fill()
    g.fillStyle = rgba([255, 252, 240], 0.96)
    g.beginPath(); g.arc(ex + rx * 0.32, ey - ry * 0.34, rx * (shine ? 0.46 : 0.3), 0, Math.PI * 2); g.fill()
    this.drawn.pen += 2
  }

  /** A shut eye: a curve, never a level bar. */
  private arc(x: number, y: number, r: number, from: number, to: number, width: number): void {
    const g = this.g
    g.beginPath(); g.arc(x, y, r, from, to)
    g.strokeStyle = rgba(INK, 0.92); g.lineWidth = width; g.lineCap = 'round'
    g.stroke()
    this.drawn.pen += 1
  }

  /** The idle ladder: a glow that breathes on the one thing the room asks for now, then a hand that shows the one move. */
  private guide(game: Game, guidance: Guidance, t: number): void {
    const g = this.g, hint = hintFor(game.fur, game.want, game.rests())
    if (!hint) return
    if (guidance.glow > 0) {
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = guidance.glow * (0.6 + 0.4 * Math.sin(t * 3.1))
      this.at(hint.glow.x, hint.glow.y, 0, Math.max(0.8, hint.glow.rx / 70), Math.max(0.8, hint.glow.ry / 70), () => this.put(this.marks.glow))
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
    }
    if (guidance.demo === null) return
    // One press where a tap is shown: a second would turn the lamp back up.
    const pose = handPose(guidance.demo, !hint.tap, this.pose, 1)
    const x = hint.from.x + (hint.to.x - hint.from.x) * pose.travel, y = hint.from.y + (hint.to.y - hint.from.y) * pose.travel - Math.sin(pose.travel * Math.PI) * 50
    if (hint.carried) {
      // A faint copy of the thing rides in the hand, so the move reads as carrying it.
      g.globalAlpha = pose.opacity * 0.5
      this.at(x - 6, y - 34, 0, 0.7, 0.7, () => this.put(this.pick(this.sprites[hint.carried!])))
    }
    g.globalAlpha = pose.opacity * 0.95
    this.at(x, y, 0, 1 - pose.press * 0.1, 1 - pose.press * 0.1, () => this.put(this.marks.hand))
    g.globalAlpha = 1
  }

  /** Runs `paint` moved, turned and stretched round a point. */
  private at(x: number, y: number, turn: number, sx: number, sy: number, paint: () => void): void {
    const g = this.g
    g.save()
    g.translate(x, y)
    if (turn) g.rotate(turn)
    if (sx !== 1 || sy !== 1) g.scale(sx, sy)
    paint()
    g.restore()
  }

  /** Stamps a sprite at the origin of the transform it is under. */
  private put(s: Sprite): void {
    this.g.drawImage(s.canvas, s.x, s.y, s.w, s.h)
    this.drawn.stamps += 1
  }
}

/** The box a piece of him is painted in, in his own units, with room for a soft edge and for foam past it. */
function boundsOf(part: PartId): { x: number; y: number; w: number; h: number } {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
  for (const e of PARTS[part]) {
    const r = Math.max(e.rx, e.ry) + 34
    left = Math.min(left, e.x - r); right = Math.max(right, e.x + r); top = Math.min(top, e.y - r); bottom = Math.max(bottom, e.y + r)
  }
  return { x: Math.max(left, BEAR.left - 40), y: top, w: Math.min(right, -BEAR.left + 40) - Math.max(left, BEAR.left - 40), h: bottom - top }
}
