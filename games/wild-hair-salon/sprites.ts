import { FRIEND_MANE } from './kits'
import { CAPE, CHAIR, COLLAR_Y, DOOR, FLOOR_Y, HEAD, PEG, fit } from './layout'
import { LOOKS, tuftOutline, type Look } from './looks'
import { ROOM, paintBench, paintChair, paintMirror, paintStool, paintWalls, roughBox } from './paintRoom'
import { PLAIN, capeOutline } from './paintStrips'
import { tuftPose } from './poses'
import { makeRng, type Rng } from './rng'
import type { CustomerId } from './tastes'
import { Watercolour, blob, boxOf, type Box, type Ctx, type MakeSheet, type Point, type Sheet } from './wash'

// The painted pieces. Each is painted once into a sheet of its own and
// afterwards only moved, turned and stretched: a wash never blurs or blooms
// again while it moves. A tuft of the customer's mane is painted again only
// when its length has changed enough to show. A friend's hair never changes,
// so its whole head is one sheet. Every piece is painted over bare paper of
// its own, so it keeps its colour and its white halo whatever it passes in
// front of.

/** A painted piece: its sheet, and the box of scene units it covers around its own origin. */
export type Sprite = { sheet: Sheet; box: Box }

/** While a tuft is held it is only stretched; it is painted again once it is this much longer or shorter than its sheet. */
const REPAINT = { shorter: 0.8, longer: 1.3 }

/** The painted pieces of one customer, in its head's own units. */
export type Animal = {
  ruff: Sprite
  face: Sprite
  ear: Sprite
  body: Sprite
  tailEnd: Sprite
  /** The whole head as a friend wears it, hair and all, in one sheet. Made when it is first a friend. */
  friendHead: Sprite | null
  tufts: ({ steps: number; sprite: Sprite } | undefined)[]
}

const ORDER = Object.keys(LOOKS)

export class Sprites {
  private readonly makeSheet: MakeSheet
  private readonly seed: number
  /** Device pixels to a scene unit. */
  readonly scale: number
  private readonly paint: Watercolour
  private readonly animals = new Map<CustomerId, Animal>()
  /** How many times a tuft has been painted, for a test and for the grown-up overlay. */
  repaints = 0

  /** The whole surface behind everything: paper, wall, floor, mirror, chair, bench, stool, door and peg. */
  readonly backdrop: Sheet
  /** The cape over the customer, the same cape draped over the chair, and its knot. */
  readonly cape: Sprite
  readonly drape: Sprite
  readonly knot: Sprite
  readonly hat: Sprite
  readonly glow: Sprite

  constructor(makeSheet: MakeSheet, width: number, height: number, seed: number) {
    this.makeSheet = makeSheet
    this.seed = seed
    const f = fit(width, height)
    this.scale = f.scale
    this.paint = new Watercolour(makeSheet, makeRng(seed), Math.max(f.scale, 0.01))

    this.backdrop = makeSheet(Math.max(1, width), Math.max(1, height))
    if (f.scale > 0) {
      const g = this.backdrop.g, rng = makeRng(seed + 1)
      this.paint.from(rng).paper(g, width, height)
      g.setTransform(f.scale, 0, 0, f.scale, f.dx, f.dy)
      paintWalls(g, this.paint, rng)
      paintMirror(g, this.paint, rng)
      paintBench(g, this.paint, rng)
      paintStool(g, this.paint, rng)
      paintChair(g, this.paint, rng)
      // The door, without its pane: the pane and who waits behind it are drawn each frame.
      const leaf = roughBox(rng, DOOR.x, DOOR.y, DOOR.w, DOOR.h, 3)
      this.paint.wash(g, leaf, { color: ROOM.door, edge: ROOM.doorEdge, blooms: [ROOM.wallBloom], reserve: true })
      this.paint.pencil(g, leaf, true)
      this.paint.wash(g, blob(rng, DOOR.x + 26, DOOR.y + DOOR.h * 0.56, 9, 9, 0.05, 8), { color: ROOM.frame, edge: ROOM.frameEdge, reserve: true })
      // The peg the ribbon hangs from.
      this.paint.wash(g, blob(rng, PEG.x, PEG.y - 30, 9, 9, 0.05, 8), { color: ROOM.wood, edge: ROOM.woodEdge, reserve: true })
      g.setTransform(1, 0, 0, 1, 0, 0)
    }

    this.cape = this.piece(5, () => capeOutline(), (g, paint, outline) => {
      paint.wash(g, outline, { color: PLAIN.cape, edge: PLAIN.capeEdge, flat: true })
      paint.pencil(g, outline, true)
      const half = CAPE.collarHalf + 4
      const collar: Point[] = [{ x: CHAIR.x - half, y: COLLAR_Y - 9 }, { x: CHAIR.x, y: COLLAR_Y - 5 }, { x: CHAIR.x + half, y: COLLAR_Y - 9 }, { x: CHAIR.x + half + 4, y: COLLAR_Y + 7 }, { x: CHAIR.x, y: COLLAR_Y + 10 }, { x: CHAIR.x - half - 4, y: COLLAR_Y + 7 }]
      paint.wash(g, collar, { color: PLAIN.collar, edge: PLAIN.capeEdge, flat: true })
      paint.pencil(g, collar, true, 0.8)
    })
    // Off the customer, the cape hangs over the chair behind the pair: the same plain blue behind the two locks.
    this.drape = this.piece(6, (rng) => roughBox(rng, CHAIR.x - 190, 286, 380, FLOOR_Y - 286 - 20, 5), (g, paint, outline) => {
      paint.wash(g, outline, { color: PLAIN.cape, edge: PLAIN.capeEdge, flat: true })
      paint.pencil(g, outline, true)
      for (const x of [-96, 4, 104]) paint.pencil(g, [{ x: CHAIR.x + x, y: 300 }, { x: CHAIR.x + x + 8, y: 440 }, { x: CHAIR.x + x - 4, y: FLOOR_Y - 34 }], false, 0.7)
    })
    // The knot the cape is pulled off by: two loops and two tails, darker, so it reads as a thing to take hold of.
    this.knot = this.piece(7, (rng) => blob(rng, 0, 0, 44, 30, 0.02, 10), (g, paint, _outline, rng) => {
      for (const side of [-1, 1]) {
        paint.wash(g, [{ x: side * 3, y: 4 }, { x: side * 13, y: 6 }, { x: side * 24, y: 44 }, { x: side * 10, y: 42 }], { color: PLAIN.knot, edge: PLAIN.knotEdge, flat: true, sharp: true })
        const loop = blob(rng, side * 21, -5, 19, 12, 0.05, 10)
        paint.wash(g, loop, { color: PLAIN.knot, edge: PLAIN.knotEdge, flat: true })
        paint.pencil(g, loop, true, 0.8)
      }
      paint.wash(g, blob(rng, 0, 0, 9, 9, 0.04, 8), { color: PLAIN.knotEdge, flat: true })
    }, 26)
    // A rain hat: a dome and a brim, big enough to tuck a whole head of hair under.
    this.hat = this.piece(8, (rng) => blob(rng, 0, -18, 150, 100, 0.02, 12), (g, paint, _outline, rng) => {
      const dome = blob(rng, 0, -56, 112, 84, 0.04, 12), brim = blob(rng, 0, -2, 148, 26, 0.05, 12)
      paint.wash(g, dome, { color: ROOM.hat, edge: ROOM.hatEdge, reserve: true })
      paint.wash(g, brim, { color: ROOM.hat, edge: ROOM.hatEdge, reserve: true })
      paint.pencil(g, brim, true, 0.8)
    })
    this.glow = this.makeGlow()
  }

  /** Paints one piece on a sheet of its own, from a stream of its own. `shape` gives the outline its box is taken from. */
  private piece(n: number, shape: (rng: Rng) => Point[], paintIt: (g: Ctx, paint: Watercolour, outline: Point[], rng: Rng) => void, pad = 14): Sprite {
    const rng = makeRng(this.seed * 31 + n)
    const outline = shape(rng), box = boxOf(outline, pad), s = Math.max(this.scale, 0.01)
    const sheet = this.makeSheet(Math.max(1, Math.ceil(box.w * s)), Math.max(1, Math.ceil(box.h * s)))
    sheet.g.setTransform(s, 0, 0, s, -box.x * s, -box.y * s)
    paintIt(sheet.g, this.paint.from(rng), outline, rng)
    sheet.g.setTransform(1, 0, 0, 1, 0, 0)
    return { sheet, box }
  }

  /** The soft warm light behind the thing a child could touch next: a round patch that fades to nothing at its rim. */
  private makeGlow(): Sprite {
    const box: Box = { x: -60, y: -60, w: 120, h: 120 }, s = Math.max(this.scale, 0.01)
    const sheet = this.makeSheet(Math.max(1, Math.ceil(box.w * s)), Math.max(1, Math.ceil(box.h * s)))
    const g = sheet.g
    g.setTransform(s, 0, 0, s, -box.x * s, -box.y * s)
    const fade = g.createRadialGradient(0, 0, 0, 0, 0, 60)
    fade.addColorStop(0, 'rgba(255,196,46,0.95)')
    fade.addColorStop(0.55, 'rgba(255,196,46,0.6)')
    fade.addColorStop(1, 'rgba(255,196,46,0)')
    g.fillStyle = fade
    g.fillRect(-60, -60, 120, 120)
    g.setTransform(1, 0, 0, 1, 0, 0)
    return { sheet, box }
  }

  /** The painted pieces of a customer, made the first time it is seen. */
  animal(who: CustomerId): Animal {
    const have = this.animals.get(who)
    if (have) return have
    const look = LOOKS[who], n = 100 * (1 + ORDER.indexOf(who))
    const made: Animal = {
      ruff: this.piece(n + 1, (rng) => blob(rng, 0, 4, HEAD.rx + look.ruff.wide, HEAD.ry + look.ruff.tall, look.ruff.ragged, 22), (g, paint, outline) => {
        paint.wash(g, outline, { color: look.mane, edge: look.maneEdge, blooms: [look.maneBlooms[1], look.maneBlooms[0]], strength: 0.78, reserve: true })
      }),
      face: this.piece(n + 2, (rng) => blob(rng, 0, 0, HEAD.rx, HEAD.ry, 0.035, 18), (g, paint, outline, rng) => paintFace(g, paint, outline, rng, look), look.horns ? 70 : 14),
      ear: this.piece(n + 3, (rng) => blob(rng, 0, look.ears.kind === 'long' ? -look.ears.ry * 0.8 : 0, look.ears.rx, look.ears.ry, look.ears.kind === 'pom' ? 0.11 : 0.05, 12), (g, paint, outline, rng) => {
        const hairy = look.ears.kind === 'pom'
        paint.wash(g, outline, { color: hairy ? look.mane : look.fur, edge: hairy ? look.maneEdge : look.furEdge, blooms: [hairy ? look.maneBlooms[0] : look.blush], reserve: true })
        paint.pencil(g, outline, true, 0.8)
        if (look.ears.kind === 'long') paint.wash(g, blob(rng, 0, -look.ears.ry * 0.8, look.ears.rx * 0.45, look.ears.ry * 0.72, 0.05, 10), { color: look.blush, strength: 0.6 })
      }),
      // A body for a customer who is out of the cape and for a friend: a long torso and two feet.
      body: this.piece(n + 4, (rng) => blob(rng, 0, HEAD.ry + 122, 66, 118, 0.04, 14), (g, paint, outline, rng) => {
        for (const side of [-1, 1]) paint.wash(g, blob(rng, side * 34, HEAD.ry + 232, 30, 15, 0.05, 10), { color: look.fur, edge: look.furEdge, reserve: true })
        paint.wash(g, outline, { color: look.fur, edge: look.furEdge, blooms: [look.blush], reserve: true })
        paint.pencil(g, outline, true, 0.8)
      }, 30),
      tailEnd: this.piece(n + 5, () => tuftOutline(look.tail === 'tuft' ? 'flame' : look.tail === 'brush' ? 'curtain' : 'pom', look.tail === 'scut' ? 44 : 66, look.tail === 'scut' ? 50 : 52, 0.2), (g, paint, outline) => {
        paint.wash(g, outline, { color: look.tail === 'scut' ? look.fur : look.mane, edge: look.tail === 'scut' ? look.furEdge : look.maneEdge, blooms: [look.maneBlooms[0]], reserve: true })
      }),
      friendHead: null,
      tufts: [],
    }
    this.animals.set(who, made)
    return made
  }

  /** A friend's whole head in one sheet: its ruff, its nine tufts as it always wears them, and its face. Its hair is not the child's to change. */
  friendHead(who: CustomerId): Sprite {
    const animal = this.animal(who)
    if (animal.friendHead) return animal.friendHead
    const look = LOOKS[who], lengths = FRIEND_MANE[who]
    const tufts = lengths.map((steps, index) => {
      const pose = tuftPose(who, index, steps, lengths.length)
      const c = Math.cos(pose.angle), s = Math.sin(pose.angle)
      return tuftOutline(look.tuft, pose.reach, pose.width, pose.curl).map((p) => ({ x: pose.base.x + p.x * c - p.y * s, y: pose.base.y + p.x * s + p.y * c }))
    })
    animal.friendHead = this.piece(900 + ORDER.indexOf(who), (rng) => [...tufts.flat(), ...blob(rng, 0, 4, HEAD.rx + look.ruff.wide, HEAD.ry + look.ruff.tall, look.ruff.ragged, 22)], (g, paint, _outline, rng) => {
      for (const tuft of tufts) paint.wash(g, tuft, { color: look.mane, edge: look.maneEdge, blooms: [look.maneBlooms[0], look.maneBlooms[1]], strength: 0.82, reserve: true })
      paint.wash(g, blob(rng, 0, 4, HEAD.rx + look.ruff.wide, HEAD.ry + look.ruff.tall, look.ruff.ragged, 22), { color: look.mane, edge: look.maneEdge, blooms: [look.maneBlooms[1], look.maneBlooms[0]], strength: 0.78, reserve: true })
      paintFace(g, paint, blob(rng, 0, 0, HEAD.rx, HEAD.ry, 0.035, 18), rng, look)
    }, look.horns ? 70 : 14)
    return animal.friendHead
  }

  /**
   * A tuft of a customer's mane, painted pointing straight up from its root
   * at the origin. `held` says it is in the fingers: then the sheet it has is
   * kept and stretched until the length is far enough off to show. Returns the
   * sprite and the length it was painted at.
   */
  tuft(who: CustomerId, index: number, steps: number, count: number, held: boolean): { sprite: Sprite; steps: number } {
    const animal = this.animal(who), have = animal.tufts[index]
    if (have) {
      const ratio = tuftPose(who, index, steps, count).reach / tuftPose(who, index, have.steps, count).reach
      if (have.steps === steps || (held && ratio >= REPAINT.shorter && ratio <= REPAINT.longer)) return have
    }
    const look = LOOKS[who], pose = tuftPose(who, index, steps, count)
    const sprite = this.piece(20 + index + 40 * ORDER.indexOf(who), () => tuftOutline(look.tuft, pose.reach, pose.width, pose.curl), (g, paint, outline) => {
      paint.wash(g, outline, { color: look.mane, edge: look.maneEdge, blooms: [look.maneBlooms[0], look.maneBlooms[1]], strength: 0.82, reserve: true })
      // Two strands in pencil up from the root, either side of the middle.
      const last = outline.length - 1
      const mid = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
      for (const t of [0.28, 0.72]) paint.pencil(g, [mid(outline[0], outline[last], t), mid(outline[1], outline[last - 1], t), mid(outline[2], outline[last - 2], t)], false, 0.55)
    })
    if (have) { have.sprite.sheet.canvas.width = 0; have.sprite.sheet.canvas.height = 0 }
    this.repaints++
    animal.tufts[index] = { steps, sprite }
    return animal.tufts[index]!
  }

  /** Gives back the memory of every sheet, before a new set is made for another size. */
  dispose(): void {
    const sheets: (Sheet | undefined)[] = [this.backdrop, this.cape.sheet, this.drape.sheet, this.knot.sheet, this.hat.sheet, this.glow.sheet]
    for (const animal of this.animals.values()) sheets.push(animal.ruff.sheet, animal.face.sheet, animal.ear.sheet, animal.body.sheet, animal.tailEnd.sheet, animal.friendHead?.sheet, ...animal.tufts.map((tuft) => tuft?.sprite.sheet))
    for (const sheet of sheets) if (sheet) { sheet.canvas.width = 0; sheet.canvas.height = 0 }
    this.animals.clear()
    this.paint.dispose()
  }
}

/** A face: horns behind it for the one who has them, one wash of fur, a pencil line and two cheeks. */
function paintFace(g: Ctx, paint: Watercolour, outline: Point[], rng: Rng, look: Look): void {
  if (look.horns) {
    for (const side of [-1, 1]) {
      const horn: Point[] = [{ x: side * 62, y: -66 }, { x: side * 104, y: -92 }, { x: side * 128, y: -138 }, { x: side * 116, y: -150 }, { x: side * 92, y: -112 }, { x: side * 46, y: -84 }]
      paint.wash(g, horn, { color: '#f1e3c4', edge: '#c9b48a', reserve: true })
      paint.pencil(g, horn, true, 0.8)
    }
  }
  paint.wash(g, outline, { color: look.fur, edge: look.furEdge, blooms: [look.blush, look.maneBlooms[1]], strength: 0.9, grain: 0.14, reserve: true })
  paint.pencil(g, outline, true)
  for (const side of [-1, 1]) paint.wash(g, blob(rng, side * 66, 22, 20, 14, 0.06, 8), { color: look.blush, bleed: 6, strength: 0.5 })
}
