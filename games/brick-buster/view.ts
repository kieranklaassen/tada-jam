import { TIERS, type Tier } from './config'
import { handPose, type Guidance, type HandPose } from './guidance'
import { BALL_R, BELL, BUMPER, FIELD, FOLDED, GATES, LADYBIRD, LANE, LIE, PLACES, REACH, STAGE, SWELL, TAIL_HOME, TRAY, WALL, brickBox, rowOf, vineFoot, vineTip } from './layout'
import { MANNERS, Pose, blinking, breath, gape, hidingFlame, idle } from './motion'
import { C, INK, INSERTS, LAMPS, TUB, paintBoard, sprite, type Sprite } from './paint'
import { CAP, STEM, paintPieces, type Pieces } from './pieces'
import { fit, type Fit } from './stage'
import type { Table } from './table'
import { DRAGON, ELEPHANT, TUFT, WALRUS, paintToys, type ToySprites } from './toys'

// The view: one board stamped whole, then the pieces and the toys as a few
// sprites each, then the faces, which are drawn live so that every eye can
// follow the ball. It reads the table and changes nothing on it. Every brick
// is drawn in the box the rules meet it in (`table.boxOf`), in every state.
//
// `draws` is what the last frame cost, counted as the jam counts a canvas
// game: every sprite stamped and every live fill or stroke.

type Point = { x: number; y: number }
type Eye = Point & { r: number }
type Mouth = Point & { open: number; wide: number }

/** What a thing with no pose of its own shows: every channel at rest. */
const STILL = new Pose(MANNERS.brick)
const W = WALL.brickW, H = WALL.brickH

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

/**
 * The shine of a wiped face, as two streaks: where each starts across the brick, how wide it is, how far under the
 * brick's top it starts, how far over its foot it ends, and how far it slants. One is long, wide and leans well
 * over; the other is short, thin and all but upright. They start and end at different heights and lean at
 * different angles, so they are no pair of like strokes.
 */
export const SHINE: readonly (readonly [number, number, number, number, number])[] = [[-18, 13, 4, 4, 20], [9, 4, 14, 10, 2]]

/** A vine: how far round its tip curls, in turns, and how many leaves a short one keeps. */
export const VINE = { turns: 1.5, curl: 13, leaves: 2 } as const

/**
 * The line of a vine, from its foot to the end of its tip, and its leaves, whether its seed stands or is gone. It
 * comes straight out of the board, bends one way and the other on its way up, and its tip droops over and curls
 * into a spiral of a turn and a half. A short one keeps two leaves, at different heights on opposite sides. So it
 * is a curled tendril, and no stroke with a hook at each end.
 */
export function vineLine(foot: number, top: number, lean: number): { stem: Point[]; leaves: { x: number; y: number; side: 1 | -1; size: number }[] } {
  const stem: Point[] = []
  const bend = (t: number) => LANE.x + Math.sin(t * Math.PI * 2) * 6 * (1 - t) + lean * t
  for (let i = 0; i <= 10; i++) stem.push({ x: bend(i / 10), y: foot + (top - foot) * (i / 10) })
  const cx = LANE.x + lean - VINE.curl, cy = top
  for (let i = 1; i <= 18; i++) {
    const t = i / 18, a = -t * VINE.turns * Math.PI * 2, r = VINE.curl * (1 - 0.7 * t)
    stem.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  const tall = foot - top
  const leaves: { x: number; y: number; side: 1 | -1; size: number }[] = []
  if (tall < 160) {
    leaves.push({ x: bend(0.3), y: foot - tall * 0.3, side: 1, size: 1 }, { x: bend(0.72), y: foot - tall * 0.72, side: -1, size: 0.75 })
  } else {
    let side: 1 | -1 = 1
    for (let y = foot - 40; y > top + 26; y -= 37) {
      leaves.push({ x: bend((foot - y) / tall), y, side, size: side > 0 ? 1 : 0.8 })
      side = side > 0 ? -1 : 1
    }
  }
  return { stem, leaves }
}

/**
 * The runner from a standing seed to the foot of its vine: from the seed's near edge, low along the board, into
 * the foot. It sags by a few units and turns back nowhere, so it is no second hook to match the curled tip.
 */
export function vineRunner(foot: number): [Point, Point, Point] {
  return [{ x: LANE.x + WALL.cellW / 2 + 4, y: foot - 6 }, { x: LANE.x + WALL.cellW / 4, y: foot + 5 }, { x: LANE.x, y: foot }]
}

/** How far round the dragon's feet the spare ball has rolled, from 0 to 1: it rolls while `spare` goes from 0.2 to 0.85. */
export function scorchedTo(spare: number): number {
  return spare <= 0.02 || spare > 0.85 ? 1 : clamp01((spare - 0.2) / 0.65)
}

/** How many blots a whole scorch is made of. */
export const SCORCH_BLOTS = 34

/**
 * The scorch the spare ball leaves round the dragon's feet, as blots: laid from where the ball set off up to
 * `to` of the way round (0 to 1), a little behind the ball. Each blot is of its own size and lies a little in
 * or out of the ball's way, so the mark is a smudge of uneven width and no drawn line; and it is laid only where
 * the ball has been, never ahead of it.
 */
export function scorch(feet: { x: number; y: number; rx: number; ry: number }, to: number): { x: number; y: number; r: number }[] {
  const blots: { x: number; y: number; r: number }[] = []
  for (let i = 0; i < SCORCH_BLOTS; i++) {
    const at = i / SCORCH_BLOTS
    if (at > to - 0.02) break
    const a = at * Math.PI * 2, off = 1 + ((((i * 7) % 5) - 2) * 0.035)
    blots.push({ x: feet.x + Math.cos(a) * feet.rx * off, y: feet.y + Math.sin(a) * feet.ry * off, r: 9 + ((i * 7) % 5) * 1.1 + ((i * 3) % 4) * 0.8 })
  }
  return blots
}

/** Where the walrus's two flippers are: how far each is off the rim of the tub, and how far it is turned. */
export type Flippers = { right: { dx: number; dy: number; turn: number }; left: { dx: number; dy: number; turn: number } }

/**
 * The walrus's flippers. At rest both lie over the rim. `pat` brings the right one down onto its belly for a slap,
 * and `rub` holds it to its chest to rub a ball dry. The left one never leaves the rim: the two never meet, and
 * no pose of the walrus is a clap.
 */
export function flippers(pat: number, rub: number): Flippers {
  const p = Math.max(0, Math.min(1.3, pat)), r = Math.max(0, Math.min(1.3, rub))
  return {
    right: { dx: 92 - p * 46 - r * 40, dy: 6 - p * 34 - r * 62, turn: -0.3 - p * 0.9 + r * 0.5 },
    left: { dx: -92, dy: 6, turn: 0.3 },
  }
}

export class TableView {
  draws = 0
  /**
   * The faces of the last frame's standing bricks: how many mouths were drawn, how many bricks were flinching
   * from the ball, and how many ice bricks had their breath showing.
   */
  faced = { mouths: 0, flinching: 0, breaths: 0 }
  /** The last frame drew the stem of the tall vine over the ball, which was behind it on its way round. */
  behindStem = false
  /** How far open the last frame drew the dragon's mouth, and how large the flame at its nostril. */
  dragonShows = { jaw: 0, flame: 0 }
  /** Where each large toy last looked with its eyes open, for the tests. */
  looksAt: Record<'dragon' | 'walrus' | 'elephant', Point> = { dragon: { x: 0, y: 0 }, walrus: { x: 0, y: 0 }, elephant: { x: 0, y: 0 } }
  /** Where the last frame drew the walrus's flippers. */
  walrusShows: Flippers = flippers(0, 0)
  /** The order the last frame drew the unfolding in: the sheet first, and the standing bricks after it. */
  order: ('sheet' | 'brick' | 'old vine' | 'old pool')[] = []
  /** The toy whose tail or trunk the last frame drew out over the table, and where its tip was. */
  reaching: { toy: 'dragon' | 'elephant'; x: number; y: number } | null = null
  fit: Fit = { scale: 0, x: 0, y: 0 }

  private readonly g: CanvasRenderingContext2D
  private ratio = 1
  private density = 0
  private tier: Tier = TIERS[0]
  private board: Sprite | null = null
  /** How far the surface shows past the stage at each side and above and below, in stage units: the board is painted that much larger. */
  private band = { x: -1, y: -1 }
  private lampsLit: Sprite | null = null
  private pieces: Pieces | null = null
  private toys: ToySprites | null = null
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** The frame's drops of water and its pale puffs (steam, frost, smoke), each drawn as one fill: x, y, radius. */
  private readonly wet: number[] = []
  private readonly pale: number[] = []
  // The frame's faces, drawn together: the whites, where each looks, the shut eyes, the mouths, and what is filled dark.
  private readonly whites: Eye[] = []
  private readonly looks: Point[] = []
  private readonly shut: Eye[] = []
  private readonly mouths: Mouth[] = []
  private readonly darks: Eye[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!
  }

  /** The surface's size in CSS pixels and its pixel ratio. The sprites are cut again when the density changes, so they stay sharp. */
  resize(width: number, height: number, ratio: number): void {
    this.ratio = ratio
    this.fit = fit(width, height)
    const density = this.fit.scale * ratio
    if (!(density > 0)) return
    const band = { x: this.fit.x / this.fit.scale, y: this.fit.y / this.fit.scale }
    const sharp = Math.abs(density - this.density) > 1e-6
    // The board is one sprite for the whole surface: the stage, and the table's own surroundings past its edges.
    if (sharp || Math.abs(band.x - this.band.x) > 0.01 || Math.abs(band.y - this.band.y) > 0.01) {
      this.band = band
      this.board = paintBoard(density, band.x, band.y)
    }
    if (sharp) {
      this.density = density
      this.pieces = paintPieces(density)
      this.toys = paintToys(density)
      this.lampsLit = sprite(density, STAGE.width, 70, 0, 0, (g) => {
        for (const [x, y] of LAMPS) {
          const light = g.createRadialGradient(x, y, 0, x, y, 30)
          light.addColorStop(0, 'rgba(255,236,150,0.95)')
          light.addColorStop(1, 'rgba(0,0,0,0)')
          g.fillStyle = light
          g.fillRect(x - 30, y - 30, 60, 60)
        }
      })
    }
  }

  setTier(tier: Tier): void {
    this.tier = tier
  }

  /** The table with nothing on it: what shows before the saved state has been read. */
  blank(): void {
    this.draws = 0
    if (!this.begin()) return
    this.g.setTransform(1, 0, 0, 1, 0, 0)
  }

  draw(table: Table, guidance: Guidance | null): void {
    this.draws = 0
    if (!this.begin() || !this.pieces || !this.toys) return
    const g = this.g
    const ball = this.ballAt(table)
    this.wet.length = 0
    this.pale.length = 0
    this.lamps(table, ball)
    this.dragon(table, ball)
    this.walrus(table, ball)
    this.elephant(table, ball)
    this.drum(table)
    // The sheet of the unfolding wall lies on the board: the bricks stand up on it, over it.
    this.sheet(table)
    this.vine(table)
    this.wall(table, ball)
    this.folded(table)
    this.bell(table)
    this.particles(table)
    this.bumper(table)
    this.reach(table, ball)
    this.ball(table, ball)
    this.ladybird(table)
    if (guidance) this.guide(table, guidance, ball)
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
  }

  // --- Counting ----------------------------------------------------------------

  private stamp(s: Sprite, x: number, y: number, turn = 0, sx = 1, sy = 1): void {
    const g = this.g
    this.draws += 1
    if (turn === 0 && sx === 1 && sy === 1) {
      g.drawImage(s.canvas, x - s.ax, y - s.ay, s.w, s.h)
      return
    }
    g.save()
    g.translate(x, y)
    if (turn !== 0) g.rotate(turn)
    if (sx !== 1 || sy !== 1) g.scale(sx, sy)
    g.drawImage(s.canvas, -s.ax, -s.ay, s.w, s.h)
    g.restore()
  }

  private fill(colour: string): void {
    this.draws += 1
    this.g.fillStyle = colour
    this.g.fill()
  }

  private stroke(colour: string, width: number): void {
    this.draws += 1
    this.g.strokeStyle = colour
    this.g.lineWidth = width
    this.g.stroke()
  }

  /** A soft light: added to what is under it where the tier has lights, and left out where it has none. */
  private light(s: Sprite, x: number, y: number, alpha: number, sx = 1, sy = 1): void {
    if (!this.tier.lights || alpha <= 0.03) return
    const g = this.g
    g.globalCompositeOperation = 'lighter'
    g.globalAlpha = Math.min(1, alpha)
    this.stamp(s, x, y, 0, sx, sy)
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
  }

  // --- The frame ------------------------------------------------------------------

  /** Clears to the board. Returns false while the surface has no size. */
  private begin(): boolean {
    const g = this.g, by = this.fit
    if (by.scale <= 0 || !this.board) return false
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    g.setTransform(this.ratio * by.scale, 0, 0, this.ratio * by.scale, this.ratio * by.x, this.ratio * by.y)
    g.lineJoin = 'round'
    g.lineCap = 'round'
    this.stamp(this.board, 0, 0)
    return true
  }

  /** How far the bumper's cap is pressed down, and where its top is. */
  private capTop(table: Table): number {
    return BUMPER.top + table.pose('bumper').get('squash') * 24
  }

  /** Where the ball is drawn: where the rules have it, and riding the cap of the bumper while it rests there. */
  private ballAt(table: Table): Point {
    const ball = table.ball
    return ball.state === 'resting' || ball.state === 'caught' ? { x: ball.x, y: this.capTop(table) - BALL_R } : { x: ball.x, y: ball.y }
  }

  /**
   * Where a toy that watches is looking: the folded wall with its lifted corner over a cleared wall, and the foot
   * of the sheet as it drops open. A toy's eyes go there while the sheet unfolds, and over a cleared wall whenever
   * the ball is not in the air; a ball in the air they follow, as always.
   */
  private watched(table: Table, toy: 'dragon' | 'walrus' | 'elephant', watch: number, ball: Point): Point {
    return (this.looksAt[toy] = this.watchPoint(table, watch, ball))
  }

  private watchPoint(table: Table, watch: number, ball: Point): Point {
    if (watch < 0.5) return ball
    const open = (table.posed('folded') ?? STILL).get('open')
    if (open > 0.02) return { x: WALL.left + (WALL.cols * WALL.cellW) / 2, y: WALL.top + Math.min(WALL.rows, open) * WALL.cellH }
    return table.ball.state === 'flying' ? ball : { x: FOLDED.x + FOLDED.w * 0.8, y: FOLDED.y + FOLDED.h }
  }

  private drop(x: number, y: number, r: number): void {
    if (r > 0.3) this.wet.push(x, y, r)
  }

  private puff(x: number, y: number, r: number): void {
    if (r > 0.3) this.pale.push(x, y, r)
  }

  /** A toy that was soaked: drops run off it. */
  private soaked(box: { x: number; y: number; w: number; h: number }, soak: number): void {
    if (soak <= 0.03) return
    for (let i = 0; i < 6; i++) this.drop(box.x + box.w * (0.16 + ((i * 37) % 70) / 100), box.y + box.h * (0.2 + ((i * 53) % 50) / 100) + (1 - soak) * 46, 3 + soak * 3)
  }

  private lamps(table: Table, ball: Point): void {
    const g = this.g, pose = table.pose('lamps'), pieces = this.pieces!
    const flash = pose.get('apron')
    const lit = [pose.get('dragon'), pose.get('walrus'), pose.get('elephant')]
    // The lamps of the lower field: one glows at a time, slowly, and those the ball goes by light up for it.
    const flying = table.ball.state === 'flying'
    const turn = (table.time * 1.1) % INSERTS.length
    let flat = false
    for (let i = 0; i < INSERTS.length; i++) {
      const [x, y, r] = INSERTS[i]
      const near = flying ? clamp01(1 - Math.hypot(ball.x - x, ball.y - y) / 120) : 0
      const glow = Math.max(near, i === Math.floor(turn) ? 0.4 * Math.sin((turn % 1) * Math.PI) : 0)
      if (glow <= 0.06) continue
      if (this.tier.lights) this.light(pieces.lampLight, x, y, glow * 0.9)
      else {
        if (!flat) g.beginPath()
        flat = true
        g.moveTo(x + r, y)
        g.arc(x, y, r * (0.5 + 0.5 * glow), 0, Math.PI * 2)
      }
    }
    if (flat) this.fill('rgba(255,246,190,0.85)')
    if (!this.tier.lights) return
    // The lamps of the apron chase slowly along it, one at a time, and all blink when the ball knocks on the roof.
    if (flash > 0.04) {
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = Math.min(1, flash)
      this.stamp(this.lampsLit!, 0, 0)
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'
    } else {
      const at = (table.time * 1.6) % LAMPS.length
      const lamp = LAMPS[Math.floor(at)]
      this.light(pieces.lampLight, lamp[0], lamp[1], 0.75 * Math.sin((at % 1) * Math.PI))
    }
    // The rail lights up beside the toy the ball clicked off at.
    const rails: readonly (readonly [number, number])[] = [[FIELD.left - 6, 330], [FIELD.left - 6, 500], [FIELD.right + 6, 300]]
    rails.forEach(([x, y], i) => this.light(pieces.lampLight, x, y, lit[i], 1, 3))
  }

  /** Two pupils that look from their eyes towards a point, as one fill. `hard` turns them all the way. */
  private pupils(eyes: readonly Point[], radius: number, at: readonly Point[], hard = false): void {
    const g = this.g
    g.beginPath()
    eyes.forEach((eye, i) => {
      const to = at[i % at.length]
      const dx = to.x - eye.x, dy = to.y - eye.y
      const far = Math.hypot(dx, dy) || 1
      const reach = hard ? radius * 0.5 : Math.min(radius * 0.55, far * 0.05)
      g.moveTo(eye.x + (dx / far) * reach + radius * 0.5, eye.y + (dy / far) * reach)
      g.arc(eye.x + (dx / far) * reach, eye.y + (dy / far) * reach, radius * 0.5, 0, Math.PI * 2)
    })
    this.fill(INK)
  }

  /** Two shut eyes: lids in the toy's own colour, each with a curved lash line. */
  private lids(eyes: readonly Point[], radius: number, colour: string): void {
    const g = this.g
    g.beginPath()
    for (const eye of eyes) {
      g.moveTo(eye.x + radius * 0.82, eye.y)
      g.arc(eye.x, eye.y, radius * 0.82, 0, Math.PI * 2)
    }
    this.fill(colour)
    g.beginPath()
    for (const eye of eyes) {
      g.moveTo(eye.x - radius * 0.7, eye.y)
      g.quadraticCurveTo(eye.x, eye.y + radius * 0.75, eye.x + radius * 0.7, eye.y)
    }
    this.stroke(INK, 3)
  }

  private dragon(table: Table, ball: Point): void {
    const g = this.g, toys = this.toys!, pieces = this.pieces!, pose = table.pose('dragon'), still = idle('dragon', table.time)
    const gateAt = GATES.dragon.mouth
    // It holds its mouth open towards the ball, and wider as the ball comes to its gate.
    const jaw = gape(pose.get('jaw'), table.ball.state === 'flying' ? Math.hypot(ball.x - gateAt.x, ball.y - gateAt.y) : Infinity)
    // The flame it keeps trying to hide: now and then it holds its breath and squints at it, and the flame gets out again.
    const hide = hidingFlame(table.time)
    const lit = Math.max(0, pose.get('flame'))
    const flame = lit > 0.9 && lit < 1.1 ? lit * hide.size : lit
    this.dragonShows = { jaw, flame }
    const neck = pose.get('neck'), ring = pose.get('ring')
    const cross = pose.get('cross'), gulp = pose.get('gulp'), blowing = pose.get('blowing'), spare = pose.get('spare')
    const scorched = pose.get('scorched'), hop = pose.get('hop'), soak = pose.get('soak')
    // It watches by stretching its neck up, unless the ball is coming to its mouth or is in it: the mouth is its gate.
    const away = table.ball.state === 'flying' ? Math.hypot(ball.x - gateAt.x, ball.y - gateAt.y) : table.ball.state === 'hidden' ? 0 : Infinity
    const watch = pose.get('watch') * clamp01((away - 140) / 160)
    const feet = { x: DRAGON.base.x, y: DRAGON.base.y - 10, rx: 96, ry: 14 }
    if (scorched > 0.03) {
      // What the spare ball scorched as it rolled round the feet: a smudge, laid only where the ball has been.
      g.globalAlpha = Math.min(1, scorched) * 0.42
      g.beginPath()
      for (const blot of scorch(feet, scorchedTo(spare))) {
        g.moveTo(blot.x + blot.r, blot.y)
        g.ellipse(blot.x, blot.y, blot.r, blot.r * 0.55, 0, 0, Math.PI * 2)
      }
      this.fill('#7a3b1a')
      g.globalAlpha = 1
    }
    // While its tail is out over the table for a ball, the body is the one without the curled tail.
    this.stamp(pose.get('fetch') > 0.02 ? toys.dragonBare : toys.dragonBody, DRAGON.base.x, DRAGON.base.y + still.other * 1.2 - hop * 14)
    const hx = DRAGON.head.x + neck * 12 + still.bob * 7 * (1 - watch * 0.7), hy = DRAGON.head.y - (neck < 0 ? -neck * 16 : neck * 4) - hop * 20 - watch * 16
    const turn = -neck * 0.28 + still.bob * 0.07 * (1 - watch * 0.7) - watch * 0.14
    // The long neck, drawn live so that the head can dart.
    const rootY = DRAGON.neckRoot.y - hop * 14
    g.beginPath()
    g.moveTo(DRAGON.neckRoot.x, rootY)
    g.quadraticCurveTo(DRAGON.neckRoot.x - 18 - neck * 12, (rootY + hy) / 2, hx - 4, hy - 6)
    this.stroke(INK, 46)
    this.stroke(C.dragon, 36)
    if (gulp > 0.06) {
      // What it swallowed, on its way down the neck.
      g.beginPath()
      g.arc(DRAGON.neckRoot.x - 12 - neck * 6, (rootY + hy) / 2 + 4, 14 + Math.min(1.2, gulp) * 12, 0, Math.PI * 2)
      this.fill(C.dragon)
      this.stroke(INK, 5)
    }
    const cos = Math.cos(turn), sin = Math.sin(turn)
    const onHead = (p: Point): Point => ({ x: hx + p.x * cos - p.y * sin, y: hy + p.x * sin + p.y * cos })
    const hinge = onHead(DRAGON.jaw)
    if (jaw > 0.04) {
      // The inside of the mouth shows between the jaws.
      const lip = onHead({ x: 84, y: -2 })
      const low = { x: hinge.x + Math.cos(turn + jaw * 0.55) * 66, y: hinge.y + Math.sin(turn + jaw * 0.55) * 66 }
      g.beginPath()
      g.moveTo(hinge.x, hinge.y)
      g.lineTo(lip.x, lip.y)
      g.lineTo(low.x, low.y)
      g.closePath()
      this.fill(C.rubberDark)
    }
    this.stamp(toys.dragonJaw, hinge.x, hinge.y, turn + jaw * 0.55)
    this.stamp(toys.dragonHead, hx, hy, turn)
    const eyes = DRAGON.eyes.map(onHead)
    if (blinking(101, table.time) && cross < 0.5) this.lids(eyes, 15, C.dragon)
    // Cross-eyed: each eye looks at the other.
    else if (cross >= 0.5) this.pupils(eyes, 15, [eyes[1], eyes[0]], true)
    else if (hide.looking && flame > 0.03) this.pupils(eyes, 15, [onHead(DRAGON.nostril)], true)
    else this.pupils(eyes, 15, [this.watched(table, 'dragon', watch, ball)])
    // The flame at one nostril, which never burns the same way twice.
    if (flame > 0.03) {
      const from = onHead(DRAGON.nostril)
      const size = 30 * flame * still.part
      g.beginPath()
      g.moveTo(from.x - 4, from.y)
      g.bezierCurveTo(from.x - 6, from.y - size * 0.7, from.x + size * 0.5, from.y - size * 0.8, from.x + size * 0.9, from.y - size * 1.7)
      g.bezierCurveTo(from.x + size * 1.1, from.y - size * 0.7, from.x + size * 0.9, from.y - size * 0.1, from.x + 6, from.y + 2)
      g.closePath()
      this.fill(C.flameB)
    }
    const mouth = onHead(DRAGON.mouth)
    if (ring > 0.01 && ring < 1) {
      // A smoke ring: a loop of puffs of several sizes, which thins as it rises.
      const cx = mouth.x + 12 + ring * 16, cy = mouth.y - 8 - ring * 84
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + ring * 2
        this.puff(cx + Math.cos(a) * (10 + ring * 17), cy + Math.sin(a) * (14 + ring * 25), (5 + (i % 3) * 1.6) * (1 - ring * 0.7))
      }
    }
    // It blows a swallowed ball cool: puffs out of its mouth, towards the table.
    if (blowing > 0.03 && blowing < 1) for (let i = 0; i < 3; i++) this.puff(mouth.x + 10 + blowing * 46 + i * 15, mouth.y - i * 5, 5 + i * 2.5)
    if (spare > 0.02 && spare < 0.995) {
      // Its own spare ball, hot: out of the mouth, once round its feet, and back in.
      const start = { x: feet.x + feet.rx, y: feet.y }
      let at: Point
      if (spare < 0.2) at = { x: lerp(mouth.x, start.x, spare / 0.2), y: lerp(mouth.y, start.y, (spare / 0.2) ** 2) }
      else if (spare > 0.85) at = { x: lerp(start.x, mouth.x, (spare - 0.85) / 0.15), y: lerp(start.y, mouth.y, (spare - 0.85) / 0.15) }
      else {
        const a = scorchedTo(spare) * Math.PI * 2
        at = { x: feet.x + Math.cos(a) * feet.rx, y: feet.y + Math.sin(a) * feet.ry }
      }
      this.light(pieces.hotLight, at.x, at.y, 0.8)
      this.stamp(pieces.balls.hot, at.x, at.y, 0, 0.8, 0.8)
    }
    this.soaked({ x: 30, y: 150, w: 200, h: 240 }, soak)
  }

  private walrus(table: Table, ball: Point): void {
    const g = this.g, toys = this.toys!, pose = table.pose('walrus'), still = idle('walrus', table.time)
    const sink = Math.max(0, pose.get('sink')), whisk = pose.get('whisk'), belly = pose.get('belly')
    const plop = pose.get('plop'), spout = pose.get('spout'), spare = pose.get('spare'), dripping = pose.get('dripping')
    const hop = pose.get('hop'), soak = pose.get('soak'), wallow = pose.get('wallow'), slop = pose.get('slop')
    // It wallows: the whole of it rocks one way and back in the tub.
    // It watches by sitting up in its tub and leaning back.
    const watch = pose.get('watch') * (1 - Math.min(1, sink * 3))
    const x = WALRUS.base.x + wallow * 9 - watch * 5, y = WALRUS.base.y + sink * 84 + still.bob * 6 - hop * 12 - watch * 13
    this.stamp(toys.walrusBody, x, y, wallow * 0.07 - watch * 0.06, 1 + belly * 0.05, 1 - belly * 0.04)
    // The water, a quarter breath behind the body, and tipped when it wallows.
    g.beginPath()
    g.ellipse(TUB.x, TUB.rimY + 6 - still.part * 2.5, TUB.rx - 7, 21, still.part * 0.012 - wallow * 0.05, 0, Math.PI * 2)
    this.fill(C.water)
    this.stamp(toys.tubFront, TUB.x, TUB.rimY)
    // The flippers lie over the rim. One comes down on its belly for a slap, or to its chest to rub a ball dry; the other stays on the rim.
    const at = flippers(pose.get('pat'), pose.get('rub'))
    this.walrusShows = at
    this.stamp(toys.walrusFlipper, TUB.x + at.right.dx, TUB.rimY + at.right.dy, at.right.turn)
    this.stamp(toys.walrusFlipper, TUB.x + at.left.dx, TUB.rimY + at.left.dy, at.left.turn, -1, 1)
    // The water it slops over the rim, at both sides.
    if (slop > 0.02 && slop < 1) for (let i = 0; i < 6; i++) this.drop(TUB.x + (i % 2 ? 1 : -1) * (TUB.rx - 12 + (i >> 1) * 9 + slop * 14), TUB.rimY + 4 - Math.sin(slop * Math.PI) * (16 + (i % 3) * 7) + slop * slop * 30, 5 - slop * 2.5)
    if (sink < 0.75) {
      // The whiskers: drooping at rest, sprung out straight when they twang, curled up tight when they are let go the other way.
      g.beginPath()
      for (const pad of WALRUS.muzzle) {
        const side = Math.sign(pad.x)
        for (const row of [-9, 2, 13]) {
          const fromX = x + pad.x + side * 24, fromY = y + pad.y + row
          const reach = 40 + Math.max(0, whisk) * 22 - Math.max(0, -whisk) * 14
          const droop = (1 - Math.max(0, whisk)) * 12 + row * 0.5 + Math.min(0, whisk) * 26
          g.moveTo(fromX, fromY)
          g.quadraticCurveTo(fromX + side * reach * 0.6, fromY - 4 + Math.min(0, whisk) * 10, fromX + side * reach, fromY + droop)
        }
      }
      this.stroke(INK, 3)
    }
    const eyes = WALRUS.eyes.map((eye) => ({ x: x + eye.x, y: y + eye.y }))
    if (blinking(202, table.time)) this.lids(eyes, 14, C.walrus)
    else this.pupils(eyes, 14, [this.watched(table, 'walrus', watch, ball)])
    const mouth = GATES.walrus.mouth
    // The water jumps where a ball went in.
    if (plop > 0.02 && plop < 1) for (let i = 0; i < 5; i++) this.drop(mouth.x - 26 + i * 12, TUB.rimY - 4 - Math.sin(plop * Math.PI) * (24 + ((i * 7) % 4) * 8), 5 - plop * 2)
    if (spout > 0.02 && spout < 1) {
      // It spits the ball out in a spout of water.
      const out = GATES.walrus.out
      g.globalAlpha = 1 - spout * 0.7
      g.beginPath()
      g.moveTo(mouth.x, TUB.rimY - 6)
      g.quadraticCurveTo(mouth.x + 40, out.y - 70, out.x + spout * 50, out.y + spout * 40)
      this.stroke(C.water, 16 - spout * 8)
      g.globalAlpha = 1
    }
    if (spare > 0.02 && spare < 0.995) {
      // Its own spare ball, wet: lifted out of the tub on its nose, and dropped back.
      const up = Math.sin(Math.min(1, spare) * Math.PI)
      const at = { x: lerp(x + 52, x, up), y: lerp(TUB.rimY - 4, y - 198, up) }
      this.stamp(this.pieces!.balls.wet, at.x, at.y, 0, 0.85, 0.85)
      for (let i = 0; i < Math.min(3, Math.round(dripping)); i++) this.drop(at.x - 8 + i * 8, at.y + 24 + i * 13, 3.6)
    }
    this.soaked({ x: 24, y: 470, w: 210, h: 190 }, soak)
  }

  private elephant(table: Table, ball: Point): void {
    const toys = this.toys!, pose = table.pose('elephant'), still = idle('elephant', table.time)
    // It watches with both ears pricked out wide and held there, and its head a little raised.
    const watch = pose.get('watch')
    const ears = pose.get('ears') + watch * 0.42, cover = Math.max(0, pose.get('cover')), trunk = pose.get('trunk'), hop = pose.get('hop')
    const bulge = pose.get('bulge'), shake = pose.get('shake'), soak = pose.get('soak')
    this.stamp(toys.elephantBody, ELEPHANT.base.x, ELEPHANT.base.y - hop * 12, 0, 1, 1 + hop * 0.03)
    const hx = ELEPHANT.head.x + shake * 9, hy = ELEPHANT.head.y - hop * 20 + still.bob * 6 - watch * 7
    const ear = (side: 1 | -1, fan: number) => {
      const fold = Math.min(1, cover)
      this.stamp(toys.elephantEar, hx + side * (ELEPHANT.ear.x - fold * 62), hy + ELEPHANT.ear.y + fold * 10, side * (ears * 0.45 + fan * 0.1) * (1 - fold), side * (1 - 0.25 * Math.min(1, Math.abs(ears)) - 0.2 * fold), 1 - 0.3 * fold)
    }
    // The ears are behind the head, until it folds them over its eyes.
    const over = cover > 0.3
    if (!over) {
      ear(-1, still.part * (1 - watch))
      ear(1, still.other * (1 - watch))
    }
    this.stamp(toys.elephantHead, hx, hy)
    const eyes = ELEPHANT.eyes.map((eye) => ({ x: hx + eye.x, y: hy + eye.y }))
    if (blinking(303, table.time) && !over) this.lids(eyes, 15, C.elephant)
    else this.pupils(eyes, 15, [this.watched(table, 'elephant', watch, ball)])
    if (over) {
      ear(-1, 0)
      ear(1, 0)
    }
    // The trunk, held up to its gate in the rail: the open end is where the ball goes in. While it is out over the
    // table for a ball it is drawn later, over the wall (`reach`).
    if (pose.get('fetch') > 0.02) {
      this.soaked({ x: 950, y: 440, w: 200, h: 250 }, soak)
      return
    }
    this.trunk(hx, hy, GATES.elephant.mouth.x - 6 + still.bob * 5 - trunk * 6, GATES.elephant.mouth.y - trunk * 34, bulge, 1)
    this.soaked({ x: 950, y: 440, w: 200, h: 250 }, soak)
  }

  /** The elephant's trunk from its head to its tip. `droop` is how far it hangs on its way: all the way at its gate, less when it is stretched out. */
  private trunk(hx: number, hy: number, tipX: number, tipY: number, bulge: number, droop: number): void {
    const g = this.g
    const rx = hx + ELEPHANT.trunk.x, ry = hy + ELEPHANT.trunk.y
    const a = { x: rx + 6, y: ry + 76 * droop }, b = { x: tipX + 34 * droop, y: tipY + 96 * droop }
    g.beginPath()
    g.moveTo(rx, ry)
    g.bezierCurveTo(a.x, a.y, b.x, b.y, tipX, tipY)
    this.stroke(INK, 40)
    this.stroke(C.elephant, 30)
    if (bulge > 0.04 && bulge < 0.97) {
      // The ball on its way up the trunk.
      const t = 1 - bulge, u = 1 - t
      const bx = u * u * u * rx + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * tipX
      const by = u * u * u * ry + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * tipY
      g.beginPath()
      g.arc(bx, by, 22, 0, Math.PI * 2)
      this.fill(C.elephant)
      this.stroke(INK, 5)
    }
    g.beginPath()
    g.ellipse(tipX - 2, tipY, 8, 12, 0.1, 0, Math.PI * 2)
    this.fill(C.earIn)
  }

  /**
   * A toy that fetches a ball: the dragon's tail or the elephant's trunk, out over the table and over the wall,
   * with its tip at the ball. It is drawn just under the ball, which it holds lifted off the board.
   */
  private reach(table: Table, ball: Point): void {
    const g = this.g
    this.reaching = null
    const tail = (table.posed('dragon') ?? STILL).get('fetch'), curl = (table.posed('dragon') ?? STILL).get('curl')
    if (tail > 0.02) {
      const out = clamp01(tail)
      const tip = { x: lerp(TAIL_HOME.x, ball.x, out), y: lerp(TAIL_HOME.y, ball.y, out) }
      this.reaching = { toy: 'dragon', x: tip.x, y: tip.y }
      const root = REACH.dragon
      const ctrl = { x: lerp(232, (root.x + tip.x) / 2, out), y: lerp(372, Math.max(root.y, tip.y) + 54, out) }
      const a = Math.atan2(tip.y - ctrl.y, tip.x - ctrl.x)
      g.beginPath()
      g.moveTo(root.x, root.y)
      g.quadraticCurveTo(ctrl.x, ctrl.y, tip.x - Math.cos(a) * (BALL_R + 5) * out, tip.y - Math.sin(a) * (BALL_R + 5) * out)
      // With hold of the ball, the end of the tail is curled round it.
      if (curl > 0.1) g.arc(tip.x, tip.y, BALL_R + 5, a + Math.PI, a + Math.PI + Math.min(1.1, curl) * 3.6)
      this.stroke(INK, 24)
      this.stroke(C.dragon, 15)
      // The tuft at its end: a few soft lobes of uneven size, bunched round the tip. It has no point and shows no way.
      const end = curl > 0.1 ? a + Math.PI + Math.min(1.1, curl) * 3.6 : a + Math.PI
      const sx = curl > 0.1 ? tip.x + Math.cos(end) * (BALL_R + 5) : tip.x - Math.cos(a) * (BALL_R + 5) * out
      const sy = curl > 0.1 ? tip.y + Math.sin(end) * (BALL_R + 5) : tip.y - Math.sin(a) * (BALL_R + 5) * out
      const way = curl > 0.1 ? end + Math.PI / 2 : a
      // Filled twice, in ink a little larger and then in colour: the bunch has one ink line round all of it.
      for (const grow of [4.5, 0]) {
        g.beginPath()
        for (const lobe of TUFT) {
          const lx = sx + Math.cos(way + lobe.turn) * lobe.far, ly = sy + Math.sin(way + lobe.turn) * lobe.far
          g.moveTo(lx + lobe.r + grow, ly)
          g.arc(lx, ly, lobe.r + grow, 0, Math.PI * 2)
        }
        this.fill(grow > 0 ? INK : C.dragonSpike)
      }
    }
    const pose = table.posed('elephant') ?? STILL, trunk = pose.get('fetch')
    if (trunk > 0.02) {
      const out = clamp01(trunk), still = idle('elephant', table.time)
      const hx = ELEPHANT.head.x + pose.get('shake') * 9, hy = ELEPHANT.head.y - pose.get('hop') * 20 + still.bob * 6 - pose.get('watch') * 7
      const home = GATES.elephant.mouth
      // Its tip comes to the side of the ball, and with hold of it hooks in under it.
      const hook = clamp01(pose.get('curl'))
      const tip = { x: lerp(home.x - 6, ball.x + BALL_R * (0.7 - 0.45 * hook), out), y: lerp(home.y, ball.y + 4 + hook * 9, out) }
      this.reaching = { toy: 'elephant', x: tip.x, y: tip.y }
      this.trunk(hx, hy, tip.x, tip.y, 0, 1 - out * 0.55)
    }
  }

  private drum(table: Table): void {
    const pose = table.pose('drum'), dip = pose.get('dip'), drops = pose.get('drops'), damp = pose.get('damp'), steam = pose.get('steam'), scorch = pose.get('scorch')
    const g = this.g, x = Math.max(FIELD.left + 96, Math.min(FIELD.right - 96, pose.get('x')))
    // What a wet or a hot ball left on the skin: a damp patch that dries, a scorch that fades. Both are blots, with ragged edges.
    const mark = Math.max(damp, scorch)
    if (mark > 0.03) {
      g.globalAlpha = Math.min(1, mark) * 0.4
      g.beginPath()
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI * 2, r = 1 + (((i * 5) % 4) - 1.5) * 0.09
        const px = x + Math.cos(a) * 46 * r, py = FIELD.floor + 26 + Math.sin(a) * 10 * r
        if (i === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.closePath()
      this.fill(scorch > damp ? '#6b3a1c' : '#7a6a48')
      g.globalAlpha = 1
    }
    if (drops > 0.02 && drops < 1) for (let i = 0; i < 6; i++) this.drop(x + (i - 2.5) * (10 + drops * 12), FIELD.floor - 4 - Math.sin(drops * Math.PI) * (20 + (i % 3) * 9), 4.5 - drops * 2)
    if (steam > 0.02 && steam < 1) for (let i = 0; i < 4; i++) this.puff(x + (i - 1.5) * 16, FIELD.floor - 6 - steam * (40 + i * 9), (7 + i * 2) * (1 - steam * 0.6))
    if (Math.abs(dip) < 0.02) return
    // The skin dips where it was struck and rings on for a moment.
    g.beginPath()
    g.moveTo(x - 90, FIELD.floor + 3)
    g.bezierCurveTo(x - 40, FIELD.floor + 3, x - 34, FIELD.floor + 3 + dip * 16, x, FIELD.floor + 3 + dip * 16)
    g.bezierCurveTo(x + 34, FIELD.floor + 3 + dip * 16, x + 40, FIELD.floor + 3, x + 90, FIELD.floor + 3)
    this.stroke(C.rubberLight, 5)
    g.beginPath()
    g.ellipse(x, FIELD.floor + 26, 30 + Math.abs(dip) * 34, 7 + Math.abs(dip) * 6, 0, Math.PI * 0.1, Math.PI * 0.9)
    this.stroke('rgba(150,110,50,0.5)', 3)
  }

  /**
   * The vine of a seed: it stands in the wall's first column, which a wall with a seed keeps empty. And the vine the
   * last wall left, which is seen until the shadow of the folded wall has swept past it.
   */
  private vine(table: Table): void {
    const old = table.old.vine
    if (old) {
      const sweep = (table.posed('folded') ?? STILL).get('sweep')
      const left = sweep > 0 ? clamp01((LANE.x - (TRAY.x + sweep * TRAY.w) + 30) / 60) : 1
      if (old.grow * left > 0.03) this.order.push('old vine')
      this.tendril(old.row, old.grow * left, old.tall, old.brown, 0, !old.gone)
    }
    const pose = table.posed('vine') ?? STILL
    // The vine stays where it grew, whether its seed still stands or lies in the tray.
    const seed = table.vinePlace
    if (seed < 0) return
    const seedBrick = table.wall[seed]
    this.tendril(rowOf(seed), pose.get('grow'), pose.get('tall'), pose.get('brown'), pose.get('sway'), !(seedBrick !== null && seedBrick.kind === 'seed' && seedBrick.gone === true))
  }

  /**
   * One vine, as a tendril (`vineLine`): straight out of the board, bending one way and the other, with its tip
   * drooped over into a spiral. While its seed stands beside it a runner lies from the seed to its foot, low and
   * nearly flat, which hooks nowhere; a vine whose seed is gone has none.
   */
  private tendril(row: number, grow: number, tall: number, brown: number, sway: number, rooted: boolean): void {
    if (grow <= 0.03) return
    const g = this.g
    const foot = vineFoot(row) - 6
    const top = vineTip(row, grow, tall)
    const dry = brown > 0.5
    const line = vineLine(foot, top, sway * 7)
    g.beginPath()
    line.stem.forEach((point, index) => (index === 0 ? g.moveTo(point.x, point.y) : g.lineTo(point.x, point.y)))
    if (rooted) {
      const runner = vineRunner(foot)
      g.moveTo(runner[0].x, runner[0].y)
      g.quadraticCurveTo(runner[1].x, runner[1].y, runner[2].x, runner[2].y)
    }
    this.stroke(INK, 10)
    this.stroke(dry ? C.vineDark : C.vine, 5.5)
    g.beginPath()
    for (const leaf of line.leaves) {
      g.moveTo(leaf.x, leaf.y)
      g.ellipse(leaf.x + leaf.side * (dry ? 9 : 14) * leaf.size, leaf.y - 3, (dry ? 8 : 13) * leaf.size, (dry ? 4.5 : 6.5) * leaf.size, leaf.side * -0.45, 0, Math.PI * 2)
    }
    this.fill(dry ? C.vineBrown : C.leaf)
    this.stroke(INK, 2.2)
  }

  private wall(table: Table, ball: Point): void {
    const g = this.g, pieces = this.pieces!, time = table.time
    // The bricks flinch from a ball that comes at them: one in the air, and one that rolls off the wall past them.
    const flying = table.ball.state === 'flying' || table.rolling
    this.whites.length = this.looks.length = this.shut.length = this.mouths.length = this.darks.length = 0
    this.faced = { mouths: 0, flinching: 0, breaths: 0 }
    const eye = (x: number, y: number, r: number, at: Point, closed = false) => {
      if (r < 0.6) return
      if (closed) this.shut.push({ x, y, r })
      else {
        this.whites.push({ x, y, r })
        this.looks.push(at)
      }
    }

    // The pools first: they lie flat on the board, under everything.
    const oldSweep = (table.posed('folded') ?? STILL).get('sweep')
    for (let place = 0; place < PLACES; place++) {
      const brick = table.wall[place], pose = table.posed(`brick:${place}`) ?? STILL
      const ripple = pose.get('ripple'), splash = pose.get('splash'), boil = pose.get('boil'), melt = pose.get('melt')
      const box = brickBox(place), cx = box.x + W / 2, cy = box.y + H / 2
      if (brick && brick.kind === 'ice' && brick.state === 'pool') {
        g.globalAlpha = clamp01(melt)
        this.stamp(pieces.pool, cx, cy, 0, 1 + ripple * 0.04, 1 + ripple * 0.06)
        g.globalAlpha = 1
      }
      // A pool the last wall left lies there until the shadow of the folded wall has swept past it.
      if (table.old.pools.includes(place)) {
        const left = clamp01((cx - (TRAY.x + oldSweep * TRAY.w) + 30) / 60)
        if (left > 0.02) {
          this.order.push('old pool')
          this.stamp(pieces.pool, cx, cy, 0, left, left)
        }
      }
      // A pool that is thrown out or boiled off is gone from the wall, and its water and its steam are still in the air.
      if (splash > 0.02 && splash < 1) {
        for (let i = 0; i < 8; i++) {
          const side = i % 2 ? 1 : -1, far = 16 + (i >> 1) * 13
          this.drop(cx + side * far * (0.4 + splash * 1.9), cy - Math.sin(splash * Math.PI) * (16 + (i % 3) * 8), 5.5 - splash * 3)
        }
      }
      if (boil > 0.02 && boil < 1) for (let i = 0; i < 6; i++) this.puff(cx + (i - 2.5) * 15, cy - boil * (30 + (i % 3) * 16), (9 + (i % 2) * 4) * (1 - boil * 0.5))
    }

    // What lies in the sand of the tray, under its clear cover: each where it fell. The tray is swept from the left when the next wall unfolds.
    const sweep = (table.posed('folded') ?? STILL).get('sweep')
    const sweptTo = TRAY.x + sweep * TRAY.w
    for (let heap = 0; heap < table.falls.length; heap++) {
      const pose = table.posed(`rubble:${heap}`) ?? STILL, fallen = table.lying[heap], spot = table.spots[heap]
      const fall = pose.get('fall'), peek = pose.get('peek'), look = pose.get('look'), wobble = pose.get('wobble'), sprout = pose.get('sprout'), snore = pose.get('snore')
      if (fall < 0.999 || (sweep > 0 && spot.x < sweptTo)) continue
      const up = look > 0.5 ? { x: spot.x + 30, y: spot.y - 400 } : ball
      const size = 4.8 * Math.min(1.5, Math.max(0, peek))
      if (fallen.kind === 'glass') this.stamp(pieces.chips, spot.x, spot.y, spot.lean, LIE, LIE)
      else if (fallen.kind === 'jelly') this.stamp(fallen.form === 'syrup' ? pieces.syrup : pieces.splat, spot.x, spot.y, spot.lean * 0.5, LIE * (1 + wobble * 0.12), LIE * (1 - wobble * 0.1))
      else if (fallen.kind === 'seed' && fallen.form === 'flower') this.stamp(pieces.flower, spot.x, spot.y, spot.lean * 2, LIE, LIE)
      else if (fallen.kind === 'seed') this.stamp(pieces.sprout, spot.x, spot.y + 9, 0, LIE, LIE * Math.max(0.05, sprout))
      else {
        this.stamp(pieces.sleeper, spot.x, spot.y, spot.lean * 0.4, LIE, LIE)
        // It sleeps on in the tray, and snores.
        eye(spot.x - 12, spot.y, 3.2, up, true)
        eye(spot.x - 6, spot.y, 3.2, up, true)
        if (snore > 0.05) this.puff(spot.x - 17, spot.y - 6, 2 + snore * 5)
        continue
      }
      const closed = blinking(heap + 40, time)
      eye(spot.x - 6, spot.y, size, up, closed)
      eye(spot.x + 6, spot.y, size, up, closed)
    }
    // The cover of the tray: one band of gloss across it.
    g.beginPath()
    g.moveTo(TRAY.x + 70, TRAY.y + 3)
    g.lineTo(TRAY.x + 150, TRAY.y + 3)
    g.lineTo(TRAY.x + 104, TRAY.y + TRAY.h - 3)
    g.lineTo(TRAY.x + 24, TRAY.y + TRAY.h - 3)
    g.closePath()
    this.fill('rgba(255,255,255,0.26)')
    if (sweep > 0.01 && sweep < 1) {
      // The folded wall's shadow, which sweeps the tray.
      g.beginPath()
      // Where the last wall left a pool or a vine on the board, the shadow sweeps the board too.
      const board = table.old.pools.length > 0 || table.old.vine !== null
      g.rect(sweptTo - 30, board ? WALL.top : TRAY.y + 2, 60, board ? TRAY.y + TRAY.h - 2 - WALL.top : TRAY.h - 4)
      this.fill('rgba(30,42,82,0.2)')
    }

    // The bricks that stand, each where the rules meet it.
    for (let place = 0; place < PLACES; place++) {
      const brick = table.wall[place]
      if (!brick || !table.up[place] || (brick.kind === 'ice' && brick.state === 'pool' && (table.posed(`brick:${place}`) ?? STILL).get('melt') >= 0.999)) continue
      const pose = table.posed(`brick:${place}`) ?? STILL, box = table.boxOf(place)
      this.order.push('brick')
      const pop = pose.get('pop'), hop = pose.get('hop')
      const cx = box.x + box.w / 2, foot = box.y + box.h - hop * 8
      const cy = foot - H / 2
      const far = Math.hypot(ball.x - cx, ball.y - cy)
      const fright = flying ? Math.max(0, 1 - far / 170) : 0
      const size = 1 + pop * 0.16
      const blink = blinking(place, time)
      // Every brick flinches as the ball comes: its face shrinks away from the ball inside the brick, its eyes go
      // wide and its mouth goes round. The brick itself stays where the rules meet it.
      const awayX = -((ball.x - cx) / (far || 1)) * fright * 3, awayY = -((ball.y - cy) / (far || 1)) * fright * 3
      if (fright > 0.35) this.faced.flinching += 1
      switch (brick.kind) {
        case 'glass': {
          const flat = pose.get('flat'), sag = pose.get('sag'), shut = pose.get('blink') > 0.5
          this.light(pieces.insertLight, cx, cy, pop > 0.12 ? pop : 0)
          const x = cx + awayX, y = cy + awayY
          if (brick.state === 'sagged') {
            const slump = 0.55 + 0.45 * clamp01(sag)
            this.stamp(pieces.glassSagged, cx, cy - (1 - slump) * H * 0.5, 0, size, slump * size)
            eye(x - 24, y - 6, 5.5, ball, blink)
            eye(x - 6, y - 5, 5.5, ball, blink)
            this.mouths.push({ x: x - 15, y: y + 6, open: fright, wide: 4 })
            break
          }
          this.stamp(brick.state === 'cracked' ? pieces.glassCracked : pieces.glass, cx, cy, 0, size, size)
          // Wiped clean, the face behind is pressed flat against the glass: wide eyes and a wide mouth.
          const wide = 6.5 + fright * 2.5 + flat * 3.5
          eye(x - 12 - flat * 3, y - 4, wide, ball, shut || (fright < 0.2 && flat < 0.2 && blink))
          eye(x + 12 + flat * 3, y - 4, wide, ball, shut || (fright < 0.2 && flat < 0.2 && blink))
          this.mouths.push({ x, y: y + 10 + flat * 2, open: fright, wide: 6 + flat * 9 })
          break
        }
        case 'jelly': {
          const wobble = pose.get('wobble'), tilt = pose.get('tilt'), swell = pose.get('swell'), squash = pose.get('squash'), titter = pose.get('titter')
          const tall = (H + SWELL * Math.max(0, swell)) / H * (1 - squash * 0.32)
          const turn = wobble * 0.13 + tilt * 0.05
          this.stamp(pieces.jelly, cx + tilt * 2, foot, turn, size * (1 + squash * 0.1 + tilt * 0.03), size * tall)
          const ey = foot - H * tall * 0.55 + awayY, ex = cx + wobble * 5 + tilt * 3 + awayX
          eye(ex - 10, ey, 5.2, ball, titter < 0.3 && blink)
          eye(ex + 10, ey, 5.2, ball, titter < 0.3 && blink)
          this.mouths.push({ x: ex, y: ey + 11, open: Math.max(titter * 0.8, fright), wide: 5 })
          break
        }
        case 'ice': {
          const shiver = pose.get('shiver'), chips = pose.get('chips'), melt = pose.get('melt'), icicle = pose.get('icicle')
          const shake = shiver * 3 * Math.sin(time * 95)
          const x = cx + shake + awayX, y = cy + awayY
          // Melting, it sinks into its pool.
          const left = 1 - clamp01(melt)
          this.stamp(pieces.ice, cx + shake, cy + (1 - left) * H * 0.5, 0, size, size * Math.max(0.04, left))
          if (icicle > 0.05 && left > 0.9) this.stamp(pieces.icicle, box.x + W - 17, box.y + 3, 0, 1, Math.min(1.1, icicle))
          if (chips > 0.02 && chips < 1) for (let i = 0; i < 6; i++) this.puff(x + Math.cos(i * 1.1 + 0.4) * (22 + chips * 34), cy + Math.sin(i * 1.1 + 0.4) * (14 + chips * 26) + chips * chips * 16, 3.6 - chips * 2)
          if (left > 0.5) {
            eye(x - 13, y - 4, 4.6 + fright, ball, fright < 0.2 && blink)
            eye(x + 9, y - 4, 4.6 + fright, ball, fright < 0.2 && blink)
            this.mouths.push({ x: x - 2, y: y + 8, open: fright, wide: 4 })
            // It is cold: its breath shows, a small puff that rises and thins, every few seconds.
            const out = breath(place, time)
            if (out >= 0) this.faced.breaths += 1
            if (out >= 0) this.puff(x + 6 + out * 16, y + 6 - out * 24, 2.5 + 5 * Math.sin(out * Math.PI))
          }
          break
        }
        case 'seed': {
          const rattle = pose.get('rattle'), leaf = pose.get('leaf')
          if (leaf > 0.05) {
            // A leaf peeps out from under the cap and ducks back.
            g.beginPath()
            g.ellipse(cx + 20, box.y + 9 - Math.min(1, leaf) * 3, 10 * Math.min(1, leaf), 5, -0.5, 0, Math.PI * 2)
            this.fill(C.leaf)
            this.stroke(INK, 2)
          }
          this.stamp(pieces.seed, cx, cy, rattle * 0.15, size, size)
          eye(cx - 11 + awayX, cy + 1 + awayY, 4.8 + fright, ball, fright < 0.2 && blink)
          eye(cx + 7 + awayX, cy + 1 + awayY, 4.8 + fright, ball, fright < 0.2 && blink)
          this.mouths.push({ x: cx - 2 + awayX, y: cy + 12 + awayY, open: fright, wide: 4 })
          break
        }
        case 'sleepy': {
          const yawn = pose.get('yawn'), lean = pose.get('lean'), snore = pose.get('snore'), snug = pose.get('snug'), open = pose.get('eye'), turn = pose.get('turn')
          // It turns over: its head goes to the other end of the bed.
          const over = clamp01(turn)
          const flip = (over < 0.5 ? 1 : -1) * (1 - 0.22 * Math.sin(over * Math.PI))
          // Asleep, it still flinches: its face shrinks away from the ball under its quilt.
          this.stamp(pieces.sleepy, cx, cy, lean * 0.16, size * flip * (1 + snug * 0.06), size * (1 - snug * 0.08))
          const hx = cx - 20 * flip + awayX
          if (open > 0.4) {
            eye(hx - 6 * flip, cy - 4, 5, ball)
            eye(hx + 6 * flip, cy - 4, 4.4, ball, true)
          } else {
            eye(hx - 6, cy - 4, 4.4, ball, true)
            eye(hx + 6, cy - 4, 4.4, ball, true)
          }
          if (yawn > 0.08) this.darks.push({ x: hx, y: cy + 8, r: 2 + Math.min(1.2, yawn) * 5 })
          else this.mouths.push({ x: hx, y: cy + 7 + awayY, open: fright, wide: 3.5 })
          if (snore > 0.05) this.puff(hx - 10 * flip, cy - 12, 3 + snore * 7)
          break
        }
        default:
          brick satisfies never
      }
    }
    this.faces(ball)

    // What lies over a brick's face: a breath of fog, a shine, a glow, a fingerprint, a dent.
    for (let place = 0; place < PLACES; place++) {
      const brick = table.wall[place], pose = table.posed(`brick:${place}`)
      if (!brick || !pose || !table.up[place]) continue
      const box = table.boxOf(place), cx = box.x + box.w / 2, cy = box.y + box.h / 2
      const fog = pose.get('fog'), shine = pose.get('shine'), glow = pose.get('glow'), warm = pose.get('warm'), print = pose.get('print'), dimple = pose.get('dimple')
      if (fog > 0.03) {
        g.beginPath()
        g.ellipse(cx, cy + 3, 27 * Math.min(1.3, fog), 14 * Math.min(1.3, fog), 0, 0, Math.PI * 2)
        this.fill(`rgba(255,255,255,${0.75 * Math.min(1, fog)})`)
      }
      if (shine > 0.03) {
        // The shine of a wiped face: a long wide streak, and a short thin one that starts lower and slants less.
        g.beginPath()
        for (const [x, w, top, foot, slant] of SHINE) {
          g.moveTo(cx + x, box.y + top)
          g.lineTo(cx + x + w, box.y + top)
          g.lineTo(cx + x + w - slant, box.y + box.h - foot)
          g.lineTo(cx + x - slant, box.y + box.h - foot)
          g.closePath()
        }
        this.fill(`rgba(255,255,255,${0.7 * Math.min(1, shine)})`)
      }
      const heat = Math.max(glow, warm * 0.5)
      if (heat > 0.03) {
        g.beginPath()
        g.ellipse(cx, cy, box.w / 2 - 5, box.h / 2 - 5, 0, 0, Math.PI * 2)
        this.fill(`rgba(255,140,50,${0.55 * Math.min(1, heat)})`)
      }
      const mark = Math.max(print, dimple)
      if (mark > 0.03 && brick.kind === 'ice' && brick.state === 'whole') {
        // A fingerprint is a clear patch that frosts over; a dimple is a dent that stays.
        g.beginPath()
        if (print > 0.03) g.ellipse(cx + 16, cy + 4, 9 * Math.min(1, print), 11 * Math.min(1, print), 0.3, 0, Math.PI * 2)
        if (dimple > 0.03) g.ellipse(cx - 20, cy + 6, 8 * Math.min(1.2, dimple), 5 * Math.min(1.2, dimple), -0.2, 0, Math.PI * 2)
        this.fill('rgba(70,130,180,0.45)')
      }
    }

    this.falling(table)
  }

  /** What is on its way down to the tray: each kind of fallen brick in its own manner. */
  private falling(table: Table): void {
    const g = this.g, pieces = this.pieces!
    let shards = false
    for (let heap = 0; heap < table.falls.length; heap++) {
      const from = table.falls[heap]
      if (from < 0) continue
      const pose = table.posed(`rubble:${heap}`) ?? STILL
      const fall = pose.get('fall'), glint = pose.get('glint'), pop = pose.get('pop'), wobble = pose.get('wobble'), drive = pose.get('drive'), awake = pose.get('awake'), shake = pose.get('shake')
      if (fall >= 0.999) continue
      const fallen = table.lying[heap], box = brickBox(from), spot = table.spots[heap]
      const sx = box.x + W / 2 + table.fellAside[heap], sy = box.y + H / 2
      const x = lerp(sx, spot.x, fall), y = lerp(sy, spot.y, fall * fall)
      if (fallen.kind === 'glass') {
        // Shards, all in one path. A drip that was popped bursts into beads instead.
        if (!shards) g.beginPath()
        shards = true
        const count = this.tier.shards, landed = Math.floor((glint / 4) * count)
        for (let i = 0; i < count; i++) {
          const t = i < landed ? 1 : fall
          const px = lerp(box.x + ((i + 0.5) / count) * W, spot.x + (i - count / 2) * 5, t)
          const py = lerp(box.y + (i % 2 ? 12 : 30), spot.y + 2, t * t) - Math.sin(t * Math.PI) * (18 + (i % 3) * 9) - pop * 10
          const turn = t * 5 + i
          for (let corner = 0; corner < 4; corner++) {
            const a = turn + (corner * Math.PI) / 2 + (corner % 2) * 0.5, r = corner % 2 ? 5 + (i % 3) : 9
            if (corner === 0) g.moveTo(px + Math.cos(a) * r, py + Math.sin(a) * r)
            else g.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r)
          }
          g.closePath()
        }
      } else if (fallen.kind === 'jelly' && fallen.form === 'splat') {
        this.stamp(pieces.jelly, x + wobble * 6, y + H / 2 - Math.sin(fall * Math.PI) * 30, wobble * 0.5 + fall * 2, 0.8, 0.8)
      } else if (fallen.kind === 'jelly') {
        // Syrup runs down the board from where the jelly stood.
        g.beginPath()
        g.moveTo(sx, sy)
        g.quadraticCurveTo(sx, lerp(sy, y, 0.7), x, y)
        this.stroke(C.syrup, 13 - fall * 6)
        this.stamp(pieces.syrup, x, y, 0, 0.5 + fall * 0.5, 0.5 + fall * 0.5)
      } else if (fallen.kind === 'seed' && fallen.form === 'flower') {
        // A puffed flower, which jumps off and floats down.
        const lift = Math.sin(Math.min(1, fall * 3) * Math.PI * 0.5) * 40 * (1 - fall)
        this.stamp(pieces.flower, x + Math.sin(fall * 10) * 16, lerp(sy, spot.y, fall) - lift, Math.sin(fall * 7) * 0.4, 1 + pop * 0.5, 1 + pop * 0.5)
      } else if (fallen.kind === 'seed') {
        // Driven into the board like a peg.
        const left = Math.max(0.06, 1 - drive * 0.9)
        this.stamp(pieces.seed, sx, sy + (1 - left) * H * 0.5, 0, 1, left)
      } else {
        // A sleepy brick on its way down: awake and climbing, or still asleep and dropped.
        const px = lerp(sx, spot.x, fall) + shake * 5, py = lerp(sy, spot.y, awake > 0.5 ? fall : fall * fall)
        const small = lerp(1, 0.62, fall)
        this.stamp(pieces.sleepy, px, py, awake > 0.5 ? Math.sin(fall * 26) * 0.12 : fall * 0.5, small, small)
        if (awake > 0.5) {
          // Wide awake: two round eyes on its pillow.
          g.beginPath()
          for (const side of [-1, 1]) g.ellipse(px - 20 * small + side * 6 * small, py - 3 * small, 5 * small, 5.5 * small, 0, 0, Math.PI * 2)
          this.fill(C.white)
          this.stroke(INK, 2)
          g.beginPath()
          for (const side of [-1, 1]) g.ellipse(px - 20 * small + side * 6 * small, py - 1.5 * small, 2.4 * small, 2.4 * small, 0, 0, Math.PI * 2)
          this.fill(INK)
        }
        if (awake > 0.5) for (let i = 0; i < 3; i++) this.drop(px + shake * (14 + i * 9), py - 14 + i * 9, 3 * Math.abs(shake))
      }
    }
    if (shards) {
      this.fill(C.glassLight)
      this.stroke(INK, 2)
    }
  }

  /** The frame's faces, batched: every white of an eye as one fill, every pupil and open mouth as another, and the shut eyes and the mouths as one stroke. */
  private faces(ball: Point): void {
    const g = this.g
    if (this.whites.length > 0) {
      g.beginPath()
      for (const eye of this.whites) {
        g.moveTo(eye.x + eye.r, eye.y)
        g.arc(eye.x, eye.y, eye.r, 0, Math.PI * 2)
      }
      this.fill(C.white)
      this.stroke(INK, 2)
    }
    if (this.whites.length + this.darks.length > 0) {
      g.beginPath()
      this.whites.forEach((eye, i) => {
        const to = this.looks[i] ?? ball
        const dx = to.x - eye.x, dy = to.y - eye.y, far = Math.hypot(dx, dy) || 1
        const px = eye.x + (dx / far) * eye.r * 0.42, py = eye.y + (dy / far) * eye.r * 0.42
        g.moveTo(px + eye.r * 0.48, py)
        g.arc(px, py, eye.r * 0.48, 0, Math.PI * 2)
      })
      for (const dark of this.darks) {
        g.moveTo(dark.x + dark.r, dark.y)
        g.arc(dark.x, dark.y, dark.r, 0, Math.PI * 2)
      }
      this.fill(INK)
    }
    this.faced.mouths = this.mouths.length
    if (this.shut.length + this.mouths.length === 0) return
    g.beginPath()
    for (const eye of this.shut) {
      g.moveTo(eye.x - eye.r * 0.8, eye.y)
      g.quadraticCurveTo(eye.x, eye.y + eye.r * 0.8, eye.x + eye.r * 0.8, eye.y)
    }
    for (const mouth of this.mouths) {
      if (mouth.open > 0.35) {
        // A round mouth as the ball comes.
        g.moveTo(mouth.x + 3 + mouth.open * 2, mouth.y)
        g.arc(mouth.x, mouth.y, 3 + mouth.open * 2, 0, Math.PI * 2)
      } else {
        g.moveTo(mouth.x - mouth.wide, mouth.y - 2)
        g.quadraticCurveTo(mouth.x, mouth.y + 5, mouth.x + mouth.wide, mouth.y - 2)
      }
    }
    this.stroke(INK, 2.4)
  }

  /** The concertina of the unfolding wall, open over the wall's board: a pale sheet with a soft foot. It lies on the board, and the bricks stand up on it. */
  private sheet(table: Table): void {
    const g = this.g, open = table.pose('folded').get('open')
    this.order.length = 0
    if (open <= 0.02) return
    this.order.push('sheet')
    const top = FIELD.roof + 4, foot = WALL.top + (Math.min(WALL.rows, open) / WALL.rows) * WALL.rows * WALL.cellH
    const left = WALL.left - 8, right = WALL.left + WALL.cols * WALL.cellW + 8
    g.beginPath()
    g.moveTo(left, top)
    g.lineTo(right, top)
    g.lineTo(right, foot)
    g.quadraticCurveTo((left + right) / 2, foot + 14, left, foot)
    g.closePath()
    this.fill('rgba(228,242,230,0.72)')
  }

  private folded(table: Table): void {
    const pose = table.pose('folded')
    const shake = pose.get('shake'), lift = pose.get('lift')
    // Over a cleared wall it holds its near corner lifted, leaning towards the bell.
    this.stamp(this.pieces!.folded, FOLDED.x + Math.sin(table.time * 70) * 3 * shake, FOLDED.y + FOLDED.h, -0.11 * lift - 0.02 * shake)
  }

  private bell(table: Table): void {
    const pose = table.pose('bell'), swing = pose.get('swing'), glow = pose.get('glow'), drip = pose.get('drip')
    this.stamp(this.pieces!.bell, BELL.x, BELL.y - BELL.r - 2, swing * 0.5)
    // A hot ball leaves it glowing, a wet one dripping.
    this.light(this.pieces!.hotLight, BELL.x, BELL.y, glow)
    if (drip > 0.02 && drip < 1) for (let i = 0; i < 3; i++) this.drop(BELL.x - 10 + i * 10, BELL.y + BELL.r + 8 + drip * (40 + i * 16), 4 - drip * 2)
  }

  /** The frame's water and its pale puffs, each as one fill, and the wet tracks a ball leaves after the pool. */
  private particles(table: Table): void {
    const g = this.g
    for (const track of table.tracks) this.drop(track.x, track.y + BALL_R - 4, 5 * (1 - track.age / 1.2))
    if (this.wet.length > 0) {
      g.beginPath()
      for (let i = 0; i < this.wet.length; i += 3) {
        g.moveTo(this.wet[i] + this.wet[i + 2], this.wet[i + 1])
        g.ellipse(this.wet[i], this.wet[i + 1], this.wet[i + 2], this.wet[i + 2] * 1.25, 0, 0, Math.PI * 2)
      }
      this.fill('rgba(74,182,240,0.85)')
    }
    if (this.pale.length > 0) {
      g.beginPath()
      for (let i = 0; i < this.pale.length; i += 3) {
        g.moveTo(this.pale[i] + this.pale[i + 2], this.pale[i + 1])
        g.arc(this.pale[i], this.pale[i + 1], this.pale[i + 2], 0, Math.PI * 2)
      }
      this.fill('rgba(255,255,255,0.86)')
      this.stroke('rgba(30,42,82,0.35)', 1.6)
    }
  }

  private bumper(table: Table): void {
    const pose = table.pose('bumper'), squash = pose.get('squash'), lean = pose.get('lean')
    const top = this.capTop(table)
    const capH = CAP.h * (1 - squash * 0.35)
    const stemTop = top + capH - 8
    this.stamp(this.pieces!.stem, table.bumperX, FIELD.floor + 2, 0, 1 + squash * 0.06, Math.max(0.2, (FIELD.floor + 2 - stemTop) / STEM.h))
    this.stamp(this.pieces!.cap, table.bumperX + lean * 6, top, 0, 1 + squash * 0.12, capH / CAP.h)
  }

  private ball(table: Table, at: Point): void {
    const g = this.g, pieces = this.pieces!, ball = table.ball
    const pose = table.posed('ball') ?? STILL, frost = pose.get('frost'), thread = pose.get('thread')
    // In a toy's hold it is lifted off the board: a little larger, with its shadow further off.
    const lift = clamp01(pose.get('lift'))
    if (ball.state === 'hidden') return
    if (thread > 0.5) {
      // The sticky thread of a melted jelly, from where the jelly stood.
      g.beginPath()
      g.moveTo(table.threadFrom.x, table.threadFrom.y)
      g.quadraticCurveTo((table.threadFrom.x + at.x) / 2, Math.max(table.threadFrom.y, at.y) + 14, at.x, at.y)
      this.stroke(C.syrup, 3.5)
    }
    this.stamp(pieces.shadow, at.x + 5 + lift * 9, at.y + 9 + lift * 15)
    if (table.look === 'hot') this.light(pieces.hotLight, at.x, at.y, 0.75)
    // A ball in the air stretches a little along its way. A heavy one does not.
    const sprite = pieces.balls[table.look]
    const speed = ball.state === 'flying' ? Math.hypot(ball.vx, ball.vy) : 0
    const stretch = table.look === 'heavy' ? 0 : Math.min(0.14, speed / 9000)
    const turn = speed > 1 ? Math.atan2(ball.vy, ball.vx) : 0
    if (stretch > 0.01) {
      g.save()
      g.translate(at.x, at.y)
      g.rotate(turn)
      g.scale(1 + stretch, 1 - stretch)
      g.rotate(-turn)
      this.stamp(sprite, 0, 0)
      g.restore()
    } else this.stamp(sprite, at.x, at.y, 0, 1 + lift * 0.14, 1 + lift * 0.14)
    const wound = table.winding
    this.behindStem = wound !== null && Math.cos(wound * Math.PI * 2) < 0
    if (this.behindStem) {
      // On its way round a tall vine the ball goes behind the stem: the stem is drawn over it.
      g.beginPath()
      g.moveTo(LANE.x, at.y - BALL_R - 4)
      g.lineTo(LANE.x, at.y + BALL_R + 4)
      this.stroke(INK, 10)
      this.stroke((table.posed('vine') ?? STILL).get('brown') > 0.5 ? C.vineDark : C.vine, 5.5)
    }
    if (frost > 0.03) {
      // A cap of frost, which melts off.
      g.globalAlpha = Math.min(1, frost)
      g.beginPath()
      g.arc(at.x, at.y, BALL_R - 1, Math.PI * 1.08, Math.PI * 1.92)
      g.quadraticCurveTo(at.x + 6, at.y - 7, at.x, at.y - 3)
      g.quadraticCurveTo(at.x - 7, at.y - 8, at.x - BALL_R * 0.95, at.y - 4)
      g.closePath()
      this.fill(C.frost)
      this.stroke(INK, 2)
      g.globalAlpha = 1
    }
    if (this.tier.lights && (table.look === 'plain' || table.look === 'wet')) {
      // A glint that turns as the ball rolls.
      const a = ball.roll / BALL_R
      g.beginPath()
      g.arc(at.x + Math.cos(a) * BALL_R * 0.5, at.y + Math.sin(a) * BALL_R * 0.5, 2.6, 0, Math.PI * 2)
      this.fill('rgba(255,255,255,0.9)')
    }
  }

  private ladybird(table: Table): void {
    const g = this.g, pose = table.pose('ladybird'), lady = table.ladybird
    const flight = pose.get('flight'), wings = Math.max(0, pose.get('wings'))
    const x = table.ladybirdX, y = LADYBIRD.y - Math.sin(flight * Math.PI) * 30
    const walking = !lady.flying && lady.pause <= 0
    if (wings > 0.05) {
      g.beginPath()
      for (const side of [-1, 1]) g.ellipse(x - lady.dir * 6, y + side * (10 + wings * 12), 16, 7 + wings * 3, side * lady.dir * (0.5 + 0.3 * Math.sin(table.time * 90)), 0, Math.PI * 2)
      this.fill('rgba(255,255,255,0.8)')
    }
    this.stamp(this.pieces!.ladybird, x, y, walking ? Math.sin(table.time * 13) * 0.07 : 0, lady.dir, 1)
  }

  /**
   * The idle ladder: a glow on what the child can do next, then a ghost hand that shows one move. Over a cleared
   * wall it is one press on the bell; with the ball at rest, a press on the bumper; with the ball in the air, a
   * slide of the bumper under it.
   */
  private guide(table: Table, guidance: Guidance, ball: Point): void {
    const g = this.g, pieces = this.pieces!, want = table.want
    const at = want === 'bell' ? { x: BELL.x, y: BELL.y } : { x: table.bumperX, y: BUMPER.top + 20 }
    if (guidance.glow > 0.01) {
      const strength = guidance.glow * (0.45 + 0.12 * Math.sin(table.time * 3))
      if (this.tier.lights) this.light(pieces.glow, at.x, at.y, strength, want === 'bell' ? 0.6 : 1, want === 'bell' ? 0.6 : 1)
      else {
        // With no lights, a pale halo.
        g.globalAlpha = strength * 0.7
        g.beginPath()
        g.ellipse(at.x, at.y, want === 'bell' ? 46 : 96, want === 'bell' ? 46 : 40, 0, 0, Math.PI * 2)
        this.fill(C.white)
        g.globalAlpha = 1
      }
    }
    if (guidance.demo === null) return
    const slide = want === 'slide' && Math.abs(ball.x - table.bumperX) > 30
    // One press on the bell: a second would end the unfolding it starts.
    const pose = want === 'bell' ? handPose(guidance.demo, false, this.hand, 1) : handPose(guidance.demo, slide, this.hand)
    const x = at.x + (slide ? (ball.x - table.bumperX) * pose.travel : 0)
    const y = want === 'bell' ? BELL.y + 6 : BUMPER.top + 34
    g.globalAlpha = pose.opacity
    this.stamp(pieces.hand, x + 8, y - pose.press * 10, 0, 1 - pose.press * 0.05, 1 - pose.press * 0.05)
    g.globalAlpha = 1
  }
}
