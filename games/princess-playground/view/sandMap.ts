import { MARK_COLS, MARK_ROWS, RAKED, SMOOTH, centreOf, type Marks } from '../marks'
import { PLANK, TRAY } from '../world'

// The sand's height as a small grey canvas, which the sand shader lights from
// its slope. Mid grey is flat sand, darker is lower, lighter is higher. The
// plane is never displaced: every groove, dimple and crater is drawn here.

export const MAP_WIDTH = 512
export const MAP_HEIGHT = 320
const FLAT = 128
/** Distance between two raked lines, in tray units. */
const RAKE_PITCH = 0.4

export class SandMap {
  readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  /** The tray as the rake leaves it, kept so that raking again is one copy. */
  private readonly raked: HTMLCanvasElement
  /** Set when the canvas changed and the texture must be sent again. */
  dirty = true

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = MAP_WIDTH
    this.canvas.height = MAP_HEIGHT
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false })!
    this.raked = document.createElement('canvas')
    this.raked.width = MAP_WIDTH
    this.raked.height = MAP_HEIGHT
    this.paintRaked()
    this.rake()
  }

  private px(x: number): number {
    return ((x + TRAY.halfWidth) / (TRAY.halfWidth * 2)) * MAP_WIDTH
  }

  private pz(z: number): number {
    return ((z + TRAY.halfDepth) / (TRAY.halfDepth * 2)) * MAP_HEIGHT
  }

  private get scale(): number {
    return MAP_WIDTH / (TRAY.halfWidth * 2)
  }

  /** The whole tray raked again. */
  rake(): void {
    this.ctx.drawImage(this.raked, 0, 0)
    this.dirty = true
  }

  /** The rake on its way across: the tray is raked again from the left rim as far as `x`. */
  rakeUpTo(x: number): void {
    const width = Math.max(0, Math.min(MAP_WIDTH, Math.ceil(this.px(x))))
    if (width === 0) return
    this.ctx.drawImage(this.raked, 0, 0, width, MAP_HEIGHT, 0, 0, width, MAP_HEIGHT)
    this.dirty = true
  }

  /** How a load finds the sand: each cell drawn from its digit alone. Raked is the tray as it starts, smooth is flat, anything deeper is a soft hollow of that depth. */
  fromMarks(marks: Marks): void {
    this.rake()
    const cell = (TRAY.halfWidth * 2) / MARK_COLS
    for (let row = 0; row < MARK_ROWS; row++) {
      for (let col = 0; col < MARK_COLS; col++) {
        const digit = marks[row * MARK_COLS + col]
        if (digit === RAKED) continue
        const { x, z } = centreOf(col, row)
        if (digit === SMOOTH) {
          this.ctx.fillStyle = grey(FLAT, 1)
          this.ctx.fillRect(this.px(x - cell / 2), this.pz(z - cell / 2), cell * this.scale, cell * this.scale)
        } else this.hollow(x, z, cell * 1.05, 0.2 + digit / 14)
      }
    }
    this.dirty = true
  }

  /** A soft dip with no lip, wide enough to run into its neighbours: a saved mark, drawn from its cell alone. */
  private hollow(x: number, z: number, radius: number, depth: number): void {
    const ctx = this.ctx, cx = this.px(x), cz = this.pz(z), r = radius * this.scale
    const dip = ctx.createRadialGradient(cx, cz, 0, cx, cz, r)
    dip.addColorStop(0, grey(FLAT - 70 * depth, 0.85))
    dip.addColorStop(0.6, grey(FLAT - 46 * depth, 0.6))
    dip.addColorStop(1, grey(FLAT - 20 * depth, 0))
    ctx.fillStyle = dip
    ctx.beginPath()
    ctx.arc(cx, cz, r, 0, Math.PI * 2)
    ctx.fill()
  }

  /** Dot's ring: a thin furrow drawn round where it stands. */
  ring(x: number, z: number, radius: number): void {
    const ctx = this.ctx, r = radius * this.scale
    for (const [width, style] of [[5, grey(FLAT + 30, 0.5)], [3, grey(FLAT - 44, 0.9)], [1.2, grey(FLAT - 66, 1)]] as const) {
      ctx.lineWidth = width
      ctx.strokeStyle = style
      ctx.beginPath()
      ctx.arc(this.px(x), this.pz(z), r, 0, Math.PI * 2)
      ctx.stroke()
    }
    this.dirty = true
  }

  /** Even raked lines along the tray, bending into rings round the stone: painted once. */
  private paintRaked(): void {
    const target = this.raked.getContext('2d')!
    const image = target.createImageData(MAP_WIDTH, MAP_HEIGHT)
    const data = image.data
    const wave = (Math.PI * 2) / RAKE_PITCH
    for (let j = 0; j < MAP_HEIGHT; j++) {
      const z = (j / MAP_HEIGHT - 0.5) * TRAY.halfDepth * 2
      for (let i = 0; i < MAP_WIDTH; i++) {
        const x = (i / MAP_WIDTH - 0.5) * TRAY.halfWidth * 2
        const r = Math.hypot(x, z - PLANK.z)
        // 1 near the stone, 0 away from it.
        const ring = 1 - smooth((r - 1.5) / 1.1)
        // The lines sag a little toward the middle so they do not read as ruled.
        const line = Math.sin((z + 0.05 * Math.sin(x * 0.9)) * wave)
        const rings = Math.sin(r * wave)
        const h = FLAT + 20 * (line * (1 - ring) + rings * ring)
        const at = (j * MAP_WIDTH + i) * 4
        data[at] = data[at + 1] = data[at + 2] = h
        data[at + 3] = 255
      }
    }
    target.putImageData(image, 0, 0)
  }

  /** A finger's poke, or a small friend set down: a bowl with a soft raised lip. */
  dimple(x: number, z: number, radius: number, depth = 1): void {
    const ctx = this.ctx, cx = this.px(x), cz = this.pz(z), r = radius * this.scale
    const lip = ctx.createRadialGradient(cx, cz, r * 0.7, cx, cz, r * 1.5)
    lip.addColorStop(0, grey(FLAT + 46 * depth, 0.9))
    lip.addColorStop(1, grey(FLAT, 0))
    ctx.fillStyle = lip
    ctx.beginPath()
    ctx.arc(cx, cz, r * 1.5, 0, Math.PI * 2)
    ctx.fill()
    const bowl = ctx.createRadialGradient(cx, cz, 0, cx, cz, r)
    bowl.addColorStop(0, grey(FLAT - 70 * depth, 1))
    bowl.addColorStop(0.7, grey(FLAT - 40 * depth, 0.95))
    bowl.addColorStop(1, grey(FLAT + 20 * depth, 0.5))
    ctx.fillStyle = bowl
    ctx.beginPath()
    ctx.arc(cx, cz, r, 0, Math.PI * 2)
    ctx.fill()
    this.dirty = true
  }

  /** A finger drawn through the sand: a furrow with a ridge thrown up on each side. */
  groove(x0: number, z0: number, x1: number, z1: number, width: number): void {
    const ctx = this.ctx, w = width * this.scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const stroke = (lineWidth: number, style: string) => {
      ctx.lineWidth = lineWidth
      ctx.strokeStyle = style
      ctx.beginPath()
      ctx.moveTo(this.px(x0), this.pz(z0))
      ctx.lineTo(this.px(x1), this.pz(z1))
      ctx.stroke()
    }
    stroke(w * 2.1, grey(FLAT + 34, 0.55))
    stroke(w * 1.5, grey(FLAT + 10, 0.8))
    stroke(w, grey(FLAT - 48, 0.95))
    stroke(w * 0.45, grey(FLAT - 74, 1))
    this.dirty = true
  }

  /** Where an end of the plank comes down: a short trench across the tray, deeper and wider the heavier the end (`strength`, 0 to 1). */
  bite(x: number, halfWidth: number, strength: number): void {
    const ctx = this.ctx, cx = this.px(x), cz = this.pz(PLANK.z)
    const s = Math.min(1, Math.max(0, strength))
    const rx = (0.3 + 0.24 * s) * this.scale, rz = (halfWidth + 0.1) * this.scale
    ctx.save()
    ctx.translate(cx, cz)
    ctx.scale(rx / rz, 1)
    // A soft dent, deepest in the middle and fading out to nothing, with no lip: a lip catches the low light all the
    // way round and reads as a ring lying on the sand.
    const pit = ctx.createRadialGradient(0, 0, 0, 0, 0, rz * 1.25)
    // Deeper the heavier the end that came down: `strength` is 0 for an empty end and 1 for the heaviest stack.
    pit.addColorStop(0, grey(FLAT - 34 - 60 * s, 0.95))
    pit.addColorStop(0.5, grey(FLAT - 24 - 40 * s, 0.8))
    pit.addColorStop(1, grey(FLAT - 12, 0))
    ctx.fillStyle = pit
    ctx.beginPath()
    ctx.arc(0, 0, rz * 1.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    this.dirty = true
  }
}

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

function grey(value: number, alpha: number): string {
  const v = Math.round(Math.min(255, Math.max(0, value)))
  return `rgba(${v},${v},${v},${alpha})`
}
