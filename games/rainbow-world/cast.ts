import { DOLL, DOLL_SCALE, drawBrowsAndMouth, drawEyes, hatY, headY, type DollId, type Face } from './figures'
import { CAT } from './layout'
import { DOLL_TURN, HORSE_CROUCH, dollTurn, freshPose, horseRear, idle, type Character, type Pose } from './motion'
import { stamp, type Ctx, type Sprite } from './paper'
import { facing, type Stand } from './stack'
import { gaze, hideout, inTheAir, loadTop, nearestDoll, strainOf, tallestTop } from './tastes'
import type { Piece } from './thing'
import { SNORT, type World } from './world'

// The characters drawn: three dolls, the horse and the cat. Each is its body's sprite, the part that swings,
// and a face drawn fresh. Everything they do is read from the world: its clock for how each moves when nothing
// is happening (motion.ts), and each thing's pose for what a pair or a scene is doing to it.

export type CastSprites = { body: Record<DollId, Sprite>; hat: Record<DollId, Sprite>; horse: Sprite; tail: Sprite; cat: Sprite; catTail: Sprite; veil: { body: Record<DollId, Sprite>; horse: Sprite } }
export type Drawn = { stamps: number; pen: number; fullSurface: number }

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
const hump = (s: number, length: number): number => (s <= 0 || s >= length ? 0 : Math.sin((s / length) * Math.PI))

export class Cast {
  private readonly pose: Pose = freshPose()
  private readonly face: Face = { lookX: 0, lookY: 0, eye: 1, mouth: 0, brow: 0, grin: 0, strain: 0 }

  constructor(private readonly drawn: Drawn) {}

  /** Turns a face at a point to what it looks at (tastes.ts). */
  private lookFrom(world: World, p: Piece | null, x: number, y: number, face: Face, want: { x: number; y: number } | null): void {
    const to = gaze(world, p, want)
    face.lookX = to ? clamp((to.x - x) / 240, -1, 1) : 0
    face.lookY = to ? clamp((to.y - y) / 200, -1, 1) : 0
  }

  /** What a character's face does on top of its resting pose: wide when it is in the air, startled at a knock, shut tight as it lands, and whatever its pose says. */
  private react(world: World, p: Piece | null, pose: Pose, inHand: boolean): Face {
    const t = world.time, face = this.face
    const startled = t < world.look.until && !world.look.peek ? clamp(1 - (t - world.knockAt) / 0.5, 0, 1) : 0
    face.eye = Math.max(pose.eye, startled)
    face.mouth = Math.max(pose.mouth, 0.7 * startled, p && p.hop > 0 && !p.led ? 0.4 : 0)
    face.brow = Math.max(pose.brow, startled)
    face.grin = 0
    face.strain = 0
    if (inHand) { face.eye = 1; face.mouth = 0.85; face.brow = 1 }
    if (p && t - p.landAt < 0.14) face.eye = 0
    if (p) {
      // Asleep, ducking, pleased or put out.
      face.eye *= 1 - p.shut
      if (p.shut > 0.5) face.mouth = 0
      face.grin = Math.max(0, p.mood)
      // The tall doll under a load strains: that is effort, with its eyes on the load. Anyone else who is put out frowns.
      face.strain = strainOf(p)
      if (face.strain > 0) face.eye = Math.max(0.5, face.eye * (1 - 0.35 * face.strain))
      else if (p.mood < 0) { face.brow = Math.min(face.brow, p.mood); face.mouth = 0 }
      else if (p.mood > 0) { face.brow = Math.max(face.brow, 0.5 * p.mood); face.mouth *= 1 - p.mood }
    }
    return face
  }

  /** Dims what is behind a body that stands in front of another, before the body is laid on. */
  private veil(ctx: Ctx, sprite: Sprite): void {
    ctx.globalCompositeOperation = 'source-over'
    stamp(ctx, sprite, 0, 0, 0, 1, 1, 0.55)
    ctx.globalCompositeOperation = 'multiply'
    this.drawn.stamps += 1
  }

  doll(ctx: Ctx, sprites: CastSprites, world: World, p: Piece, at: Stand, sx: number, sy: number, inHand: boolean, veil: boolean): void {
    const t = world.time, id = p.def.id as DollId, d = DOLL[id], pose = idle(id as Character, t, this.pose), since = t - p.turnAt
    const way = facing(p) * (since < DOLL_TURN ? -dollTurn(since) : 1)
    const side = Math.abs(way) < 0.08 ? (way < 0 ? -0.08 : 0.08) : way
    const awake = 1 - p.shut, onMat = p.at === 'mat' && p.on === null && !p.led
    // Everyone on the mat stretches up to peek over a hill.
    const peek = onMat && world.look.peek ? 0.09 * hump(t - (world.look.until - 1.8), 1.8) : 0
    const tall = (1 + pose.stretch * (0.4 + 0.6 * awake) + peek + (inHand ? 0.06 : 0)) * (1 - 0.42 * p.duck), hy = headY(id)
    const face = this.react(world, p, pose, inHand)
    // The tall doll looks up at the top of whatever is tallest while it stands on tiptoe.
    const want = face.strain > 0 ? loadTop(world, p) : id === 'doll-tall' && pose.habit > 0.05 ? tallestTop(world, p) : null
    this.lookFrom(world, p, at.x, at.y + hy * sy * tall * DOLL_SCALE, face, want)
    face.lookX *= Math.sign(side)
    // The small doll ducks towards the nearest larger thing and peeks round it.
    const hide = id === 'doll-small' && onMat && pose.habit > 0 ? hideout(world, p) : null
    const sneak = hide ? Math.sign(hide.x - at.x) * 0.16 * pose.habit : 0
    ctx.save()
    ctx.translate(at.x, at.y)
    // Set down, it wobbles like a skittle and comes to rest.
    const down = t - p.landAt, wobble = onMat && down < 1.5 ? 0.13 * Math.exp(-4 * down) * Math.sin(17 * down) : 0
    ctx.rotate(at.rot + pose.lean * awake + sneak + wobble + (inHand ? 0.05 * Math.sin(t * 5) : 0))
    ctx.scale(DOLL_SCALE * sx * side * (1 - pose.stretch * 0.5), DOLL_SCALE * sy * tall)
    if (veil) this.veil(ctx, sprites.veil.body[id])
    stamp(ctx, sprites.body[id], 0, 0)
    // The hat is the funniest part of each: the point quivers and sags under a load, the cap tips back in a yawn, the bobble swings.
    const tip = id === 'doll-tall' ? 0.1 * pose.part + 0.6 * Math.max(0, -p.mood) : id === 'doll-round' ? 0.04 * pose.part - 0.3 * pose.habit * awake : 0.13 * pose.part + clamp(p.hopV * 0.0009, -0.3, 0.3)
    stamp(ctx, sprites.hat[id], 0, hatY(id), tip)
    ctx.globalCompositeOperation = 'source-over'
    const r = d.head * 0.235
    this.drawn.pen += drawEyes(ctx, 0, hy - d.head * 0.04, r, d.head * 0.42, face)
    this.drawn.pen += drawBrowsAndMouth(ctx, 0, hy - d.head * 0.04, r, d.head * 0.42, 0, hy + d.head * 0.5, face)
    ctx.restore()
    this.drawn.stamps += 2
  }

  horse(ctx: Ctx, sprites: CastSprites, world: World, p: Piece, at: Stand, sx: number, sy: number, inHand: boolean, veil: boolean): void {
    const t = world.time, pose = idle('horse', t, this.pose), rear = horseRear(t - p.turnAt)
    const way = facing(p) * (rear.swung ? 1 : -1)
    const face = this.react(world, p, pose, inHand)
    // It turns its head to the nearest doll while it paws the ground.
    this.lookFrom(world, p, at.x + way * 72, at.y - 140, face, pose.habit > 0.05 ? nearestDoll(world, p) : null)
    face.lookX *= way
    ctx.save()
    ctx.translate(at.x, at.y)
    ctx.rotate(at.rot)
    ctx.scale(sx * way, sy * (1 + pose.stretch) * (1 - HORSE_CROUCH * p.duck))
    // It rears, and paws, round its back hooves.
    ctx.translate(-40, 0)
    // After its hooves are down on the mat it shakes its mane.
    const shake = p.at === 'mat' && !p.led ? hump(t - p.landAt - SNORT, 0.5) * 0.06 * Math.sin((t - p.landAt) * 44) : 0
    ctx.rotate(shake - (0.6 * rear.up + 0.07 * pose.habit))
    ctx.translate(40, 0)
    stamp(ctx, sprites.tail, -72, -96, 0.35 * pose.part + 0.5 * rear.up + 0.3 * Math.max(0, p.mood) * Math.sin(t * 9))
    if (veil) this.veil(ctx, sprites.veil.horse)
    stamp(ctx, sprites.horse, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    this.drawn.pen += drawEyes(ctx, 72, -142, 10, 0, face)
    this.drawn.pen += drawBrowsAndMouth(ctx, 72, -142, 10, 0, 86, -116, face)
    ctx.restore()
    this.drawn.stamps += 2
  }

  cat(ctx: Ctx, sprites: CastSprites, world: World): void {
    const t = world.time, pose = idle('cat', t, this.pose), poked = hump(t - world.catAt, 0.9)
    // A knock on the sill it lies on: its tail flicks and its eyes open.
    const flick = hump(t - world.sillAt, 0.5)
    const face = this.react(world, null, pose, false)
    // Its eyes follow whatever is in the air.
    const flying = inTheAir(world)
    this.lookFrom(world, null, CAT.x + 80, CAT.y - 56, face, flying)
    if (flying) { face.lookX = clamp((flying.x - CAT.x - 80) / 240, -1, 1); face.lookY = clamp((flying.y - CAT.y + 56) / 200, -1, 1) }
    // A knock makes it look up; a poke makes it stretch and mew.
    if (t - world.knockAt < 1 || t - world.sillAt < 1 || flying) face.eye = 1
    face.mouth = Math.max(pose.mouth, poked)
    ctx.save()
    ctx.translate(CAT.x, CAT.y)
    ctx.scale(1 + 0.1 * poked, 1 + pose.stretch - 0.05 * poked)
    ctx.globalCompositeOperation = 'multiply'
    stamp(ctx, sprites.catTail, -112, -18, 0.3 * pose.part + 0.5 * poked + 0.6 * flick * Math.sin((t - world.sillAt) * 26))
    stamp(ctx, sprites.cat, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    this.drawn.pen += drawEyes(ctx, 80, -58, 6.5, 14, face)
    this.drawn.pen += drawBrowsAndMouth(ctx, 80, -58, 6.5, 14, 81, -33, face, false)
    ctx.restore()
    this.drawn.stamps += 2
  }
}
