import { STILL, features, stamp } from './figure'
import { FRIEND_MANE } from './kits'
import { CAPE, CHAIR, COLLAR_Y, FLOOR_Y, HEAD, fit } from './layout'
import { LOOKS, tuftOutline, type Look } from './looks'
import { ROOM, bleedFor, leafOutline, paintDoorway, paintLeaf, paintRoom, roughBox } from './paintRoom'
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
  /** The whole figure as it waits at the door under its rain hat, in one sheet: only its eyes are drawn on top. */
  waiting: Sprite | null
  /** The whole mane as the customer has it now, tufts and ruff in one sheet, for the looking glass and for going out of the door. */
  mane: { key: string; sprite: Sprite } | null
  tufts: ({ steps: number; sprite: Sprite } | undefined)[]
}

const PARTS = ['ruff', 'face', 'ear', 'body', 'tailEnd'] as const
type Part = (typeof PARTS)[number]
type Making = Partial<Pick<Animal, Part>> & Pick<Animal, 'friendHead' | 'waiting' | 'mane' | 'tufts'>

/** Sheets a frame may paint once the first frame is done: a new customer's hair comes up over a few frames, behind the opening door. */
const PER_FRAME = 2
/** The number the door's leaf is seeded from, in the room and by itself. */
const LEAF_N = 12

const ORDER = Object.keys(LOOKS)

export class Sprites {
  private readonly makeSheet: MakeSheet
  private readonly seed: number
  /** Device pixels to a scene unit. */
  readonly scale: number
  private readonly paint: Watercolour
  private readonly animals = new Map<CustomerId, Making>()
  /** How many times a tuft has been painted, for a test and for the grown-up overlay. */
  repaints = 0
  /** How many sheets have been painted in all. */
  painted = 0
  private allowance = Infinity
  private fresh = true

  /** The whole surface behind everything: the salon as it stands with nobody in it. */
  readonly backdrop: Sheet
  /** The cape over the customer, the same cape draped over the chair, and its knot. */
  readonly cape: Sprite
  readonly drape: Sprite
  readonly knot: Sprite
  readonly hat: Sprite
  readonly glow: Sprite
  /** Somebody going by in the street under an umbrella. */
  readonly passer: Sprite
  /** The door's leaf by itself, to swing, and the doorway it swings out of: drawn only while the door is open. */
  readonly leaf: Sprite
  readonly doorway: Sprite

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
      // The room is painted as far as the surface shows: a surface wider or taller than the scene has wall and floor to its edges.
      paintRoom(g, this.paint, rng, makeRng(seed * 31 + LEAF_N), bleedFor(width, height))
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
    // The same leaf as the one painted shut into the room, from the same seed.
    this.leaf = this.piece(LEAF_N, leafOutline, (g, paint, outline, rng) => paintLeaf(g, paint, outline, rng), 8)
    this.doorway = this.piece(LEAF_N + 1, leafOutline, (g, paint, _outline, rng) => paintDoorway(g, paint, rng), 8)
    this.passer = this.piece(9, (rng) => blob(rng, 0, 0, 62, 96, 0.02, 10), (g, paint, _outline, rng) => {
      paint.wash(g, blob(rng, 0, 46, 22, 46, 0.05, 10), { color: ROOM.steelEdge, strength: 0.8, reserve: true })
      paint.pencil(g, [{ x: 4, y: -40 }, { x: 4, y: 30 }], false, 0.9)
      const dome: Point[] = [{ x: -58, y: -34 }, { x: -40, y: -70 }, { x: 0, y: -86 }, { x: 40, y: -70 }, { x: 58, y: -34 }, { x: 30, y: -42 }, { x: 0, y: -34 }, { x: -30, y: -42 }]
      paint.wash(g, dome, { color: ROOM.door, edge: ROOM.doorEdge, blooms: [ROOM.lamp], strength: 0.9, reserve: true })
      paint.pencil(g, dome, true, 0.8)
    })
  }

  /** Lays painted pieces together on one sheet, so that what never moves apart is one stamp. `lay` draws in the units of `box`. */
  private together(box: Box, lay: (g: Ctx) => void): Sprite {
    const s = Math.max(this.scale, 0.01)
    const sheet = this.makeSheet(Math.max(1, Math.ceil(box.w * s)), Math.max(1, Math.ceil(box.h * s)))
    sheet.g.setTransform(s, 0, 0, s, -box.x * s, -box.y * s)
    lay(sheet.g)
    sheet.g.setTransform(1, 0, 0, 1, 0, 0)
    this.painted++
    this.allowance--
    return { sheet, box }
  }

  /** One of the pair at the door: body, face and rain hat in one sheet, with the hair that will not stay under the hat out at both sides. */
  waiting(who: CustomerId): Sprite {
    const animal = this.animal(who)
    if (animal.waiting) return animal.waiting
    const look = LOOKS[who], rng = makeRng(this.seed * 31 + 950 + ORDER.indexOf(who))
    const made = this.together({ x: -176, y: -150, w: 352, h: 150 + HEAD.ry + 270 }, (g) => {
      stamp(g, animal.body)
      for (const side of [-1, 1]) this.paint.from(rng).wash(g, blob(rng, side * (HEAD.rx + 16), -34, 30, 22, 0.22, 9), { color: look.mane, edge: look.maneEdge, blooms: [look.maneBlooms[0]], reserve: true })
      stamp(g, animal.face)
      features(g, STILL, look, false, 'rest')
      g.translate(0, -30)
      stamp(g, this.hat)
    })
    animal.waiting = made
    return made
  }

  /**
   * The customer's whole mane in one sheet, as long as its tufts are now. It
   * is laid together from the tufts' own sheets, so it costs no painting, and
   * again only when a length has changed and `settled` says nothing is in the
   * fingers. Until then the one before is given, or nothing.
   */
  mane(who: CustomerId, steps: readonly number[], settled: boolean): Sprite | null {
    const animal = this.animal(who), key = steps.join(',')
    if (animal.mane?.key === key) return animal.mane.sprite
    if (!settled || this.allowance <= 0) return animal.mane?.sprite ?? null
    const count = steps.length
    const tufts = steps.map((length, index) => ({ pose: tuftPose(who, index, length, count), painted: this.tuft(who, index, length, count, false) }))
    if (tufts.some((tuft) => !tuft.painted || tuft.painted.steps !== steps[tufts.indexOf(tuft)])) return animal.mane?.sprite ?? null
    const reach = Math.max(...tufts.map((tuft) => tuft.pose.reach)) + HEAD.rx + 60
    const sprite = this.together({ x: -reach, y: -reach, w: reach * 2, h: reach * 2 }, (g) => {
      for (const tuft of tufts) {
        g.save()
        g.translate(tuft.pose.base.x, tuft.pose.base.y)
        g.rotate(tuft.pose.angle)
        stamp(g, tuft.painted!.sprite)
        g.restore()
      }
      stamp(g, animal.ruff)
      // The ears go in too, at rest: whoever is drawn from this sheet is not flicking them.
      const look = LOOKS[who]
      for (const side of [-1, 1]) {
        g.save()
        g.translate(side * look.ears.x, look.ears.y)
        g.scale(side, 1)
        g.rotate(look.ears.kind === 'long' ? 0.12 : 0)
        stamp(g, animal.ear)
        g.restore()
      }
    })
    if (animal.mane) { animal.mane.sprite.sheet.canvas.width = 0; animal.mane.sprite.sheet.canvas.height = 0 }
    animal.mane = { key, sprite }
    return sprite
  }

  /** Paints one piece on a sheet of its own, from a stream of its own. `shape` gives the outline its box is taken from. */
  private piece(n: number, shape: (rng: Rng) => Point[], paintIt: (g: Ctx, paint: Watercolour, outline: Point[], rng: Rng) => void, pad = 14): Sprite {
    const rng = makeRng(this.seed * 31 + n)
    const outline = shape(rng), box = boxOf(outline, pad), s = Math.max(this.scale, 0.01)
    const sheet = this.makeSheet(Math.max(1, Math.ceil(box.w * s)), Math.max(1, Math.ceil(box.h * s)))
    sheet.g.setTransform(s, 0, 0, s, -box.x * s, -box.y * s)
    paintIt(sheet.g, this.paint.from(rng), outline, rng)
    sheet.g.setTransform(1, 0, 0, 1, 0, 0)
    this.painted++
    this.allowance--
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

  /** Starts a frame. The first frame of a set paints all it needs; after it a frame paints a few sheets at most, so nobody's arrival is a hitch. */
  frame(): void {
    this.allowance = this.fresh ? Infinity : PER_FRAME
    this.fresh = false
  }

  /** With what is left of this frame's allowance, paints ahead for one who will come on: the pair behind the door, long before it opens. */
  ahead(who: CustomerId, asFriend: boolean): void {
    // The first frame painted all it needed; what it paints ahead is held to a frame's share like any other.
    this.allowance = Math.min(this.allowance, PER_FRAME)
    const have = this.pieces(who)
    for (const part of PARTS) {
      if (this.allowance <= 0) return
      have[part] ??= this.recipe(who, part)
    }
    if (asFriend && this.allowance > 0) this.friendHead(who)
    if (this.allowance > 0) this.waiting(who)
  }

  private pieces(who: CustomerId): Making {
    let have = this.animals.get(who)
    if (!have) { have = { friendHead: null, waiting: null, mane: null, tufts: [] }; this.animals.set(who, have) }
    return have
  }

  /** The painted pieces of a customer, made the first time it is seen if they were not painted ahead. */
  animal(who: CustomerId): Animal {
    const have = this.pieces(who)
    for (const part of PARTS) have[part] ??= this.recipe(who, part)
    return have as Animal
  }

  private recipe(who: CustomerId, part: Part): Sprite {
    const look = LOOKS[who], n = 100 * (1 + ORDER.indexOf(who))
    switch (part) {
      case 'ruff': return this.piece(n + 1, (rng) => blob(rng, 0, 4, HEAD.rx + look.ruff.wide, HEAD.ry + look.ruff.tall, look.ruff.ragged, 22), (g, paint, outline) => {
        paint.wash(g, outline, { color: look.mane, edge: look.maneEdge, blooms: [look.maneBlooms[1], look.maneBlooms[0]], strength: 0.78, reserve: true })
      })
      case 'face': return this.piece(n + 2, (rng) => blob(rng, 0, 0, HEAD.rx, HEAD.ry, 0.035, 18), (g, paint, outline, rng) => paintFace(g, paint, outline, rng, look), look.horns ? 70 : 14)
      case 'ear': return this.piece(n + 3, (rng) => blob(rng, 0, look.ears.kind === 'long' ? -look.ears.ry * 0.8 : 0, look.ears.rx, look.ears.ry, look.ears.kind === 'pom' ? 0.11 : 0.05, 12), (g, paint, outline, rng) => {
        const hairy = look.ears.kind === 'pom'
        paint.wash(g, outline, { color: hairy ? look.mane : look.fur, edge: hairy ? look.maneEdge : look.furEdge, blooms: [hairy ? look.maneBlooms[0] : look.blush], reserve: true })
        paint.pencil(g, outline, true, 0.8)
        if (look.ears.kind === 'long') paint.wash(g, blob(rng, 0, -look.ears.ry * 0.8, look.ears.rx * 0.45, look.ears.ry * 0.72, 0.05, 10), { color: look.blush, strength: 0.6 })
      })
      // A body for a customer who is out of the cape and for a friend: a long torso and two feet.
      case 'body': return this.piece(n + 4, (rng) => blob(rng, 0, HEAD.ry + 122, 66, 118, 0.04, 14), (g, paint, outline, rng) => {
        for (const side of [-1, 1]) paint.wash(g, blob(rng, side * 34, HEAD.ry + 232, 30, 15, 0.05, 10), { color: look.fur, edge: look.furEdge, reserve: true })
        paint.wash(g, outline, { color: look.fur, edge: look.furEdge, blooms: [look.blush], reserve: true })
        paint.pencil(g, outline, true, 0.8)
      }, 30)
      case 'tailEnd': return this.piece(n + 5, () => tuftOutline(look.tail === 'tuft' ? 'flame' : look.tail === 'brush' ? 'curtain' : 'pom', look.tail === 'scut' ? 44 : 66, look.tail === 'scut' ? 50 : 52, 0.2), (g, paint, outline) => {
        paint.wash(g, outline, { color: look.tail === 'scut' ? look.fur : look.mane, edge: look.tail === 'scut' ? look.furEdge : look.maneEdge, blooms: [look.maneBlooms[0]], reserve: true })
      })
    }
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
   * sprite and the length it was painted at, or nothing while it waits its turn
   * to be painted.
   */
  tuft(who: CustomerId, index: number, steps: number, count: number, held: boolean): { sprite: Sprite; steps: number } | null {
    const animal = this.animal(who), have = animal.tufts[index]
    if (have) {
      const ratio = tuftPose(who, index, steps, count).reach / tuftPose(who, index, have.steps, count).reach
      if (have.steps === steps || (held && ratio >= REPAINT.shorter && ratio <= REPAINT.longer)) return have
    }
    // The frame has painted what it may: the sheet it has is stretched for now, and a tuft with none waits a frame.
    if (this.allowance <= 0) return have ?? null
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
    const sheets: (Sheet | undefined)[] = [this.backdrop, this.cape.sheet, this.drape.sheet, this.knot.sheet, this.hat.sheet, this.glow.sheet, this.passer.sheet, this.leaf.sheet, this.doorway.sheet]
    for (const animal of this.animals.values()) sheets.push(...PARTS.map((part) => animal[part]?.sheet), animal.friendHead?.sheet, animal.waiting?.sheet, animal.mane?.sprite.sheet, ...animal.tufts.map((tuft) => tuft?.sprite.sheet))
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
