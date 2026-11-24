import type { Rng } from './rng'

// What is in the craft box: felt, pom-poms, buttons, lolly sticks, pipe
// cleaners, dry pasta, googly eyes and glue. Each is drawn once into a sprite,
// with its own small hard shadow, and only moved afterwards. Nothing is
// painted and nothing is torn.

export type Pen = CanvasRenderingContext2D
export type Make = (width: number, height: number) => HTMLCanvasElement
/** A picture in stage units, with the point in it that is put down where it is drawn. */
export type Sprite = { canvas: HTMLCanvasElement; w: number; h: number; ox: number; oy: number }

/** Pixels of a sprite to one stage unit: one to one on a tablet at the pixel ratio the jam caps at. */
export const RES = 2
const { PI, cos, sin, sqrt, abs, max, min } = Math
export const TAU = PI * 2

export const SHADE = 'rgba(16, 28, 44, 0.3)'
/** The light falls from the upper left, so every shadow lies this far to the lower right. */
export const CAST = { x: 5, y: 7 } as const

export class Box {
  constructor(readonly make: Make, readonly rng: Rng) {}

  sprite(w: number, h: number, ox: number, oy: number, draw: (g: Pen) => void, res = RES): Sprite {
    const canvas = this.make(Math.ceil(w * res), Math.ceil(h * res))
    const g = canvas.getContext('2d') as Pen
    g.scale(res, res)
    g.translate(ox, oy)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    draw(g)
    return { canvas, w, h, ox, oy }
  }

  /** The hard shadow of a sprite. */
  shadow(of: Sprite): Sprite {
    const canvas = this.make(of.canvas.width, of.canvas.height)
    const g = canvas.getContext('2d') as Pen
    g.drawImage(of.canvas, 0, 0)
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = SHADE
    g.fillRect(0, 0, canvas.width, canvas.height)
    return { ...of, canvas }
  }

  private r(): number {
    return this.rng.next()
  }

  /** A piece of felt or card cut to a shape, lying on what is under it. `box` is what the shape fits into. */
  felt(g: Pen, color: string, box: [number, number, number, number], shape: (g: Pen) => void, o: { lift?: number; fibre?: number; stitch?: string } = {}): void {
    const lift = o.lift ?? 3
    g.save()
    if (lift > 0) {
      g.save()
      g.translate(lift, lift * 1.4)
      g.fillStyle = SHADE
      g.beginPath(); shape(g); g.fill()
      g.restore()
    }
    g.fillStyle = color
    g.beginPath(); shape(g); g.fill()
    g.save()
    g.beginPath(); shape(g); g.clip()
    const [x, y, w, h] = box
    const count = Math.round(w * h * 0.028 * (o.fibre ?? 1))
    for (let i = 0; i < count; i++) {
      const px = x + this.r() * w, py = y + this.r() * h, a = this.r() * TAU, l = 2 + this.r() * 4
      g.strokeStyle = this.r() < 0.5 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.09)'
      g.lineWidth = 0.7
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + cos(a) * l, py + sin(a) * l, px + cos(a + 0.8) * l * 1.6, py + sin(a + 0.8) * l * 1.6); g.stroke()
    }
    // The cut edge has a thickness: light along the top left, dark along the bottom right.
    g.lineWidth = 4
    g.strokeStyle = 'rgba(0,0,0,0.16)'
    g.save(); g.translate(-1.5, -1.8); g.beginPath(); shape(g); g.stroke(); g.restore()
    g.strokeStyle = 'rgba(255,255,255,0.3)'
    g.lineWidth = 2.5
    g.save(); g.translate(1, 1.3); g.beginPath(); shape(g); g.stroke(); g.restore()
    g.restore()
    if (o.stitch) {
      g.save()
      g.beginPath(); shape(g); g.clip()
      g.setLineDash([7, 6])
      g.lineWidth = 12
      g.strokeStyle = 'rgba(0,0,0,0)'
      g.lineWidth = 2.6
      g.strokeStyle = o.stitch
      g.translate(x + w / 2, y + h / 2)
      g.scale(0.88, 0.88)
      g.translate(-x - w / 2, -y - h / 2)
      g.beginPath(); shape(g); g.stroke()
      g.restore()
    }
    g.restore()
  }

  /** A pom-pom: a ball of cut wool. */
  pom(g: Pen, x: number, y: number, rx: number, ry: number, color: [number, number, number], o: { lift?: number; thick?: number } = {}): void {
    const lift = o.lift ?? 3
    const tone = (l: number) => `rgb(${color.map((c) => Math.round(min(255, max(0, c * (l < 1 ? l : 1) + (l > 1 ? (255 - c) * (l - 1) : 0))))).join(',')})`
    g.save()
    if (lift > 0) { g.fillStyle = SHADE; g.beginPath(); g.ellipse(x + lift, y + lift * 1.4, rx * 1.02, ry * 1.02, 0, 0, TAU); g.fill() }
    g.fillStyle = tone(0.74)
    g.beginPath(); g.ellipse(x, y, rx * 0.96, ry * 0.96, 0, 0, TAU); g.fill()
    const big = max(rx, ry), count = Math.round(big * 15 + 120)
    g.lineWidth = o.thick ?? max(1.5, big * 0.042)
    for (let i = 0; i < count; i++) {
      const a = this.r() * TAU, q = sqrt(this.r()) * (i / count < 0.55 ? 1 : 0.86)
      const ux = cos(a), uy = sin(a)
      const l = (0.1 + this.r() * 0.1) * big
      const lit = 0.96 - (ux * 0.55 + uy * 0.8) * q * 0.26 + (this.r() - 0.5) * 0.2
      g.strokeStyle = tone(lit)
      const px = x + ux * q * rx * 0.94, py = y + uy * q * ry * 0.94, b = a + (this.r() - 0.5) * 1.1
      g.beginPath(); g.moveTo(px - cos(b) * l * 0.5, py - sin(b) * l * 0.5); g.lineTo(px + cos(b) * l * 0.6, py + sin(b) * l * 0.6); g.stroke()
    }
    g.restore()
  }

  /** Cotton wool: soft lumps. */
  cotton(g: Pen, lumps: readonly [number, number, number][], tint = '#ffffff', lift = 5): void {
    g.save()
    g.fillStyle = SHADE
    for (const [x, y, r] of lumps) { g.beginPath(); g.arc(x + lift, y + lift * 1.4, r, 0, TAU); g.fill() }
    g.fillStyle = '#dfe6ee'
    for (const [x, y, r] of lumps) { g.beginPath(); g.arc(x, y + 2, r, 0, TAU); g.fill() }
    g.fillStyle = tint
    for (const [x, y, r] of lumps) { g.beginPath(); g.arc(x - r * 0.06, y - r * 0.1, r * 0.88, 0, TAU); g.fill() }
    for (const [x, y, r] of lumps) for (let i = 0; i < r * 1.6; i++) {
      const a = this.r() * TAU, d = r * (0.35 + this.r() * 0.68), px = x + cos(a) * d, py = y + sin(a) * d, l = 3 + this.r() * 7, b = this.r() * TAU
      g.strokeStyle = this.r() < 0.6 ? 'rgba(255,255,255,0.85)' : 'rgba(170,186,204,0.3)'
      g.lineWidth = 1
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + cos(b) * l, py + sin(b) * l, px + cos(b + 1.4) * l, py + sin(b + 1.4) * l); g.stroke()
    }
    g.restore()
  }

  /** A pipe cleaner bent along points. */
  pipe(g: Pen, pts: readonly (readonly [number, number])[], w: number, color: string, dark: string, o: { lift?: number } = {}): void {
    const lift = o.lift ?? 2.5
    const trace = (dx: number, dy: number) => {
      g.beginPath(); g.moveTo(pts[0][0] + dx, pts[0][1] + dy)
      for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0] + dx, pts[i][1] + dy, (pts[i][0] + pts[i + 1][0]) / 2 + dx, (pts[i][1] + pts[i + 1][1]) / 2 + dy)
      g.lineTo(pts[pts.length - 1][0] + dx, pts[pts.length - 1][1] + dy)
    }
    g.save()
    if (lift > 0) { g.strokeStyle = SHADE; g.lineWidth = w; trace(lift, lift * 1.4); g.stroke() }
    g.strokeStyle = dark; g.lineWidth = w; trace(0, 0); g.stroke()
    g.strokeStyle = color; g.lineWidth = w * 0.62; trace(-w * 0.06, -w * 0.1); g.stroke()
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], d = Math.hypot(bx - ax, by - ay)
      for (let t = 0; t < d; t += 1.5) {
        const u = t / d, a = this.r() * TAU, l = w * (0.36 + this.r() * 0.3), mx = ax + (bx - ax) * u, my = ay + (by - ay) * u
        g.strokeStyle = this.r() < 0.5 ? color : dark
        g.lineWidth = 1
        g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + cos(a) * l, my + sin(a) * l); g.stroke()
      }
    }
    g.restore()
  }

  /** A lolly stick. */
  stick(g: Pen, x: number, y: number, len: number, w: number, angle: number, color = '#e7c48c', lift = 3): void {
    g.save()
    g.translate(x, y)
    g.rotate(angle)
    const shape = (dx: number, dy: number) => { g.beginPath(); g.roundRect(-len / 2 + dx, -w / 2 + dy, len, w, w / 2) }
    if (lift > 0) { g.save(); g.rotate(-angle); g.translate(lift, lift * 1.4); g.rotate(angle); g.fillStyle = SHADE; shape(0, 0); g.fill(); g.restore() }
    g.fillStyle = color; shape(0, 0); g.fill()
    g.save(); shape(0, 0); g.clip()
    for (let i = 0; i < w / 2.2; i++) {
      const gy = -w / 2 + this.r() * w
      g.strokeStyle = this.r() < 0.6 ? 'rgba(110,64,20,0.2)' : 'rgba(255,255,255,0.22)'
      g.lineWidth = 0.9
      g.beginPath(); g.moveTo(-len / 2, gy); g.bezierCurveTo(-len / 6, gy + (this.r() - 0.5) * 4, len / 6, gy + (this.r() - 0.5) * 4, len / 2, gy + (this.r() - 0.5) * 3); g.stroke()
    }
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2; shape(0.8, 1.2); g.stroke()
    g.strokeStyle = 'rgba(80,40,10,0.28)'; g.lineWidth = 2.4; shape(-0.8, -1.2); g.stroke()
    g.restore()
    g.restore()
  }

  button(g: Pen, x: number, y: number, r: number, color: string, holes: 2 | 4 = 4, thread = '#fff6e0', lift = 3): void {
    g.save()
    if (lift > 0) { g.fillStyle = SHADE; g.beginPath(); g.arc(x + lift, y + lift * 1.4, r, 0, TAU); g.fill() }
    g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = r * 0.1; g.beginPath(); g.arc(x, y, r * 0.9, PI * 0.95, PI * 1.6); g.stroke()
    g.strokeStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.arc(x, y, r * 0.92, -0.1, PI * 0.7); g.stroke()
    g.lineWidth = r * 0.07; g.strokeStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.arc(x, y, r * 0.66, 0, TAU); g.stroke()
    const at = holes === 2 ? [[-0.26, 0], [0.26, 0]] : [[-0.22, -0.22], [0.22, -0.22], [0.22, 0.22], [-0.22, 0.22]]
    void thread
    g.fillStyle = 'rgba(40,16,20,0.75)'
    for (const [hx, hy] of at) { g.beginPath(); g.ellipse(x + hx * r, y + hy * r, r * (holes === 2 ? 0.13 : 0.1), r * (holes === 2 ? 0.2 : 0.1), 0, 0, TAU); g.fill() }
    g.restore()
  }

  /** A tube of dry pasta, ridged, cut slanting at both ends. */
  penne(g: Pen, x: number, y: number, len: number, w: number, angle: number, lift = 3): void {
    g.save()
    g.translate(x, y); g.rotate(angle)
    const shape = () => { g.beginPath(); g.moveTo(-len / 2 + w * 0.4, -w / 2); g.lineTo(len / 2 + w * 0.2, -w / 2); g.lineTo(len / 2 - w * 0.4, w / 2); g.lineTo(-len / 2 - w * 0.2, w / 2); g.closePath() }
    if (lift > 0) { g.save(); g.rotate(-angle); g.translate(lift, lift * 1.4); g.rotate(angle); g.fillStyle = SHADE; shape(); g.fill(); g.restore() }
    g.fillStyle = '#efc04c'; shape(); g.fill()
    g.save(); shape(); g.clip()
    for (let i = 0; i < 6; i++) { g.strokeStyle = i % 2 ? 'rgba(160,96,10,0.34)' : 'rgba(255,240,180,0.6)'; g.lineWidth = w * 0.09; g.beginPath(); g.moveTo(-len, -w / 2 + (i + 0.5) * (w / 6)); g.lineTo(len, -w / 2 + (i + 0.5) * (w / 6)); g.stroke() }
    g.restore()
    g.fillStyle = '#8f5a12'; g.beginPath(); g.ellipse(len / 2 - w * 0.1, 0, w * 0.2, w * 0.42, 0.5, 0, TAU); g.fill()
    g.restore()
  }

  /** A pasta bow. */
  bow(g: Pen, x: number, y: number, s: number, angle: number, lift = 3): void {
    const shape = () => { g.beginPath(); g.moveTo(-s, -s * 0.55); g.lineTo(-s * 0.2, -s * 0.2); g.lineTo(s * 0.2, -s * 0.2); g.lineTo(s, -s * 0.55); g.lineTo(s * 0.86, 0); g.lineTo(s, s * 0.55); g.lineTo(s * 0.2, s * 0.2); g.lineTo(-s * 0.2, s * 0.2); g.lineTo(-s, s * 0.55); g.lineTo(-s * 0.86, 0); g.closePath() }
    g.save(); g.translate(x, y); g.rotate(angle)
    if (lift > 0) { g.save(); g.rotate(-angle); g.translate(lift, lift * 1.4); g.rotate(angle); g.fillStyle = SHADE; shape(); g.fill(); g.restore() }
    g.fillStyle = '#f2c95a'; shape(); g.fill()
    g.strokeStyle = 'rgba(150,92,10,0.4)'; g.lineWidth = s * 0.07
    g.beginPath(); g.moveTo(-s * 0.2, -s * 0.06); g.lineTo(s * 0.2, -s * 0.06); g.moveTo(-s * 0.2, s * 0.08); g.lineTo(s * 0.2, s * 0.08); g.moveTo(-s * 0.7, -s * 0.2); g.lineTo(-s * 0.3, 0); g.moveTo(s * 0.7, -s * 0.2); g.lineTo(s * 0.3, 0); g.stroke()
    g.restore()
  }

  /** A shiny blob of glue that came out at the side. */
  glue(g: Pen, x: number, y: number, r: number): void {
    g.save()
    g.fillStyle = 'rgba(255,255,255,0.34)'; g.beginPath(); g.ellipse(x, y, r * 1.3, r, 0.3, 0, TAU); g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.2; g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.ellipse(x - r * 0.4, y - r * 0.36, r * 0.34, r * 0.2, -0.6, 0, TAU); g.fill()
    g.restore()
  }

  /** The white of a googly eye, without what rolls in it. */
  eye(g: Pen, x: number, y: number, r: number): void {
    g.save()
    g.fillStyle = SHADE; g.beginPath(); g.arc(x + r * 0.12 + 1, y + r * 0.16 + 1.4, r, 0, TAU); g.fill()
    g.fillStyle = '#c9d2da'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill()
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - r * 0.04, y - r * 0.05, r * 0.91, 0, TAU); g.fill()
    g.restore()
  }
  scatter(n: number, f: (u: number, v: number, w: number) => void): void {
    for (let i = 0; i < n; i++) f(this.r(), this.r(), this.r())
  }
}
void abs
