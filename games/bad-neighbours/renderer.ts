import { CELL, FLOOR, PLATFORM_WIDTH, SECURE_DELAY, cellsFor, outlineCenter, type Shape, type Game } from './model'
import { buildingSprite, drawResidents, pixelPerson, silhouetteFor, type Context } from './buildings'
import { Neighbourhood, type StreetProp } from './neighbourhood'

// Canvas scene for the street. Wordless: no bubbles, metres or labels.

function rect(ctx: Context, x: number, y: number, w: number, h: number, color: string) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h) }
function line(ctx: Context, x: number, y: number, xx: number, yy: number, color: string, width = 1) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(xx, yy); ctx.stroke() }
function cloud(ctx: Context, x: number, y: number, size: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size); ctx.fillStyle = '#e9f1e6'; ctx.beginPath(); ctx.roundRect(-42, 0, 100, 12, 6); ctx.fill(); ctx.beginPath(); ctx.roundRect(-16, -13, 49, 25, 12); ctx.fill(); ctx.restore()
}
export function canvasDensity(width: number, height: number, deviceRatio: number) {
  // Keep phones sharp while bounding full-screen raster work on large tablets.
  return Math.max(1, Math.min(deviceRatio || 1, 2, Math.sqrt(2_000_000 / Math.max(1, width * height))))
}
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }

export class Renderer {
  ctx: Context
  bg = document.createElement('canvas')
  width = 0; height = 0; dpr = 1; scale = 1; cx = 0; base = 0; camera = 0
  sprites = new Map<Shape, HTMLCanvasElement>()
  particles: Particle[] = []
  neighbourhood = new Neighbourhood()
  reduced: boolean
  private clock = 0
  private game: Game | null = null
  private observer: ResizeObserver
  private media: MediaQueryList
  private onMotion = (event: MediaQueryListEvent) => { this.reduced = event.matches; if (this.reduced) { this.particles = []; this.neighbourhood.props = [] } }
  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!
    for (const shape of ['O', 'T', 'L', 'J', 'I', 'S', 'Z'] as Shape[]) this.sprites.set(shape, buildingSprite(shape))
    this.media = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.reduced = this.media.matches
    this.media.addEventListener('change', this.onMotion)
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); this.resize()
  }
  dispose() { this.observer.disconnect(); this.media.removeEventListener('change', this.onMotion) }
  resize() {
    const width = this.canvas.clientWidth, height = this.canvas.clientHeight
    // A parked surface measures 0×0; keep the last good size.
    if (width <= 0 || height <= 0) return
    const dpr = canvasDensity(width, height, window.devicePixelRatio)
    if (width === this.width && height === this.height && dpr === this.dpr) return
    this.width = width; this.height = height; this.dpr = dpr
    this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr)
    this.bg.width = this.canvas.width; this.bg.height = this.canvas.height
    this.paintBackdrop()
    // Resizing clears the canvas to black. Repaint before the browser presents it.
    this.render(0, this.game)
  }
  private paintBackdrop() {
    const ctx = this.bg.getContext('2d')!; ctx.scale(this.dpr, this.dpr)
    const w = this.width, h = this.height, street = h - 34
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#94cce7'); sky.addColorStop(0.72, '#b7dfeb'); sky.addColorStop(1, '#d4e6db'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
    // The expensive city scenery is painted only on resize.
    ctx.fillStyle = '#f8dfa0'; ctx.beginPath(); ctx.arc(w * 0.77, h * 0.2, Math.min(70, w * 0.09), 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 0.65; cloud(ctx, w * 0.48, h * 0.18, 0.7); cloud(ctx, w * 0.88, h * 0.38, 1.1); cloud(ctx, w * 0.11, h * 0.34, 0.8); ctx.globalAlpha = 1
    for (let layer = 0; layer < 2; layer++) {
      const bw = layer ? 57 : 84
      for (let i = -1; i < w / bw + 1; i++) {
        const x = i * bw + layer * 21, bh = 45 + ((i + 9) * 43 % (layer ? 110 : 150)), y = street - bh
        const color = layer ? ['#8ab0b9', '#95b9bc', '#9cc0c1'][(i + 9) % 3] : '#a1c8d0'
        rect(ctx, x + 3, y, bw - 5, bh, color); rect(ctx, x + 1, y - 4, bw - 1, 4, color)
        if (i % 3 === 0) { rect(ctx, x + 15, y - 17, 18, 13, color); line(ctx, x + 24, y - 30, x + 24, y - 17, color, 2) }
        for (let wx = 12; wx < bw - 8; wx += 16) for (let wy = 13; wy < bh - 6; wy += 23) rect(ctx, x + wx, y + wy, 7, 12, layer ? '#7da2ad65' : '#8db7c455')
      }
    }
    // Distant construction crane and street lamps give the skyline a place.
    const craneX = w * 0.89, craneY = Math.max(h * 0.49, street - 255)
    line(ctx, craneX, craneY, craneX, street, '#7ca8b5', 3); line(ctx, craneX - 88, craneY, craneX + 42, craneY, '#7ca8b5', 3); line(ctx, craneX, craneY - 29, craneX - 88, craneY, '#7ca8b5'); line(ctx, craneX, craneY - 29, craneX + 42, craneY, '#7ca8b5'); line(ctx, craneX - 71, craneY, craneX - 71, craneY + 62, '#7ca8b5')
    rect(ctx, 0, street, w, 34, '#9eaaa6'); rect(ctx, 0, street, w, 3, '#e0dcca'); rect(ctx, 0, street + 18, w, 16, '#899797')
    for (let x = 30; x < w; x += 190) { line(ctx, x, street, x, street - 48, '#5d7c85', 2); line(ctx, x, street - 48, x + 11, street - 48, '#5d7c85', 2); rect(ctx, x + 7, street - 47, 8, 4, '#f5dda3') }
    for (let x = 0; x < w; x += 65) line(ctx, x, street + 4, x + 10, street + 18, '#849793')
  }
  drawBuilding(shape: Shape, x: number, y: number, angle = 0, scale = 1, time?: number, identity = 0, reaction = 0) {
    const ctx = this.ctx; ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale)
    ctx.drawImage(this.sprites.get(shape)!, -85, -65, 170, 135)
    if (time !== undefined) drawResidents(ctx, shape, time, identity, reaction)
    ctx.restore()
  }
  private island(x: number, y: number, width: number, scale: number) {
    const ctx = this.ctx; ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); const half = width / 2
    // This entire concrete landing slab matches the collider, including its side walls.
    rect(ctx, -half, 0, width, 38, '#3a4d59'); rect(ctx, -half, 0, width, 4, '#e6dfc6'); rect(ctx, -half, 5, width, 9, '#d4b35f')
    ctx.save(); ctx.beginPath(); ctx.rect(-half, 5, width, 9); ctx.clip()
    for (let xx = -half - 15; xx < half + 15; xx += 18) { ctx.fillStyle = '#3a4850'; ctx.beginPath(); ctx.moveTo(xx, 5); ctx.lineTo(xx + 8, 5); ctx.lineTo(xx - 1, 14); ctx.lineTo(xx - 9, 14); ctx.fill() } ctx.restore()
    rect(ctx, -half + 9, 21, width - 18, 9, '#50616a')
    for (const xx of [-half + 8, half - 10]) { rect(ctx, xx, 18, 2, 2, '#bcc6bd'); rect(ctx, xx, 31, 2, 2, '#bcc6bd') }
    // Narrow support columns are visual scenery below the playable landing slab.
    for (const xx of [-half + 26, half - 35]) { rect(ctx, xx, 38, 9, 76, '#536b74'); rect(ctx, xx + 2, 38, 2, 76, '#7d9090') }
    line(ctx, -half + 31, 40, half - 31, 103, '#698089', 3); line(ctx, half - 31, 40, -half + 31, 103, '#698089', 3)
    ctx.restore()
  }
  worldX(clientX: number) { return (clientX - this.canvas.getBoundingClientRect().left - this.cx) / this.scale }
  burst(x: number, y: number, color: string, big = false) {
    if (this.reduced) return
    for (let i = 0; i < (big ? 18 : 7) && this.particles.length < 64; i++) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 55, vy: -15 - Math.random() * 45, life: 1, color, size: 1 + Math.random() * 2 })
  }
  private prop(p: StreetProp, x: number, y: number, scale: number) {
    const ctx = this.ctx
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = Math.min(1, (p.lifetime - p.age) * 2)
    if (p.kind === 'resident') {
      ctx.translate(Math.sin(p.age * 3) * 3, 0); line(ctx, -11, -23, 0, -5, '#466073', 0.7); line(ctx, 11, -23, 0, -5, '#466073', 0.7)
      ctx.fillStyle = '#e77351'; ctx.beginPath(); ctx.arc(0, -23, 12, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#f3d595'; ctx.beginPath(); ctx.ellipse(0, -23, 5, 12, 0, Math.PI, Math.PI * 2); ctx.fill(); pixelPerson(ctx, 0, 2, p.age * 4, p.color, true); ctx.restore(); return
    }
    ctx.rotate(p.angle)
    if (p.kind === 'plant') { rect(ctx, -3, -1, 6, 5, '#b3674a'); rect(ctx, -1, -9, 1.5, 8, '#436c4c'); rect(ctx, -4, -8, 4, 2, '#5b825b'); rect(ctx, 0, -6, 4, 2, '#436c4c') }
    if (p.kind === 'book') { rect(ctx, -4, -3, 8, 6, p.color); rect(ctx, -2, -2, 6, 4, '#f2e4c5'); rect(ctx, -4, -3, 2, 6, '#435567') }
    if (p.kind === 'paper') { rect(ctx, -3, -4, 6, 8, '#fff0cf'); for (let i = 0; i < 3; i++) rect(ctx, -2, -2 + i * 2, 4, 0.5, '#7b8e90') }
    if (p.kind === 'sock') { rect(ctx, -2, -5, 4, 7, p.color); rect(ctx, -2, 0, 7, 3, p.color); rect(ctx, -2, -4, 4, 1, '#f7ebd0') }
    ctx.restore()
  }
  /** The next delivery sits on a paper card in the top corner, like a note on the fridge. */
  private nextCard(game: Game, t: number) {
    const ctx = this.ctx, size = this.width < 500 ? 0.62 : 0.8, x = this.width - 16 - 118 * size, y = 16
    ctx.save(); ctx.translate(x, y); ctx.scale(size, size); ctx.rotate(0.03)
    rect(ctx, 4, 4, 118, 100, '#233c5014'); rect(ctx, 0, 0, 118, 100, '#fff3d9'); ctx.strokeStyle = '#233c5030'; ctx.strokeRect(0.5, 0.5, 117, 99)
    rect(ctx, 38, -5, 40, 9, '#f1d28ecc')
    this.drawBuilding(game.next[0], 59, 50, 0, 0.72, t, 99)
    ctx.restore()
  }
  render(delta: number, game: Game | null) {
    this.game = game
    if (!this.width || !this.height) return
    const ctx = this.ctx, w = this.width, h = this.height
    this.clock += Math.min(50, delta) / 1000; const t = this.reduced ? 0 : this.clock
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.bg, 0, 0); ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    const walkers = w < 700 ? 4 : 9
    for (let i = 0; i < walkers; i++) { const xx = ((i * 173 + t * (i % 2 ? -8 : 11)) % (w + 60) + w + 60) % (w + 60) - 30; pixelPerson(ctx, xx, h - 36, t * 4 + i, ['#eec46c', '#bc6c51', '#e9e2cc'][i % 3], false, 1.1) }
    if (!game) return
    // Keep the slab above the control dock; short screens put the controls in the corners instead.
    const reserve = h <= 500 ? 20 : 100
    this.scale = Math.max(0.34, Math.min(w / 400, 1.35, (h - reserve - 60) / 470))
    this.cx = w / 2; this.base = h - reserve - (38 * this.scale + 8)
    const target = Math.max(0, game.maxHeight * CELL - 265)
    this.camera += (target - this.camera) * (1 - Math.exp(-delta / 220))
    const sy = (y: number) => this.base + (y - FLOOR + this.camera) * this.scale
    if (delta > 0) this.neighbourhood.update(delta, game.pieces, PLATFORM_WIDTH, this.reduced)
    this.island(this.cx, sy(FLOOR), PLATFORM_WIDTH, this.scale)
    if (game.active) {
      const piece = game.active, xx = this.cx + outlineCenter(piece.body).x * this.scale
      ctx.save(); ctx.setLineDash([3, 6]); line(ctx, xx, sy(piece.body.bounds.max.y) + 8, xx, sy(FLOOR) - 3, '#304f6630'); ctx.restore()
    }
    for (const piece of game.pieces) {
      const yy = sy(piece.body.position.y); if (yy < -110 * this.scale || yy > h + 100 * this.scale) continue
      const xx = this.cx + piece.body.position.x * this.scale
      this.drawBuilding(piece.shape, xx, yy, piece.body.angle, this.scale, t, piece.body.id, this.neighbourhood.reactions.get(piece.body.id) || 0)
      if (piece.scored) {
        // A small in-shape tick shows when a building has become a solid foundation.
        ctx.save(); ctx.translate(xx, yy); ctx.rotate(piece.body.angle); ctx.scale(this.scale, this.scale); ctx.clip(silhouetteFor(piece.shape))
        const cell = cellsFor(piece.shape).sort((a, b) => b.y - a.y || a.x - b.x)[0]
        if (piece.securedAt) {
          rect(ctx, cell.x + 7, cell.y + 7, 8, 8, '#087e73')
          line(ctx, cell.x + 9, cell.y + 11, cell.x + 11, cell.y + 13, '#edfff4', 1)
          line(ctx, cell.x + 11, cell.y + 13, cell.x + 14, cell.y + 9, '#edfff4', 1)
        } else if (piece.stableSince) {
          rect(ctx, cell.x - 13, cell.y + 12, 26, 2, '#173b4a88')
          rect(ctx, cell.x - 13, cell.y + 12, 26 * Math.min(0.94, (game.time - piece.contactTime) / SECURE_DELAY), 2, '#9cf4cf')
        }
        ctx.restore()
      }
      if (piece.glued) {
        ctx.save(); ctx.translate(xx, yy); ctx.rotate(piece.body.angle); ctx.scale(this.scale, this.scale); ctx.clip(silhouetteFor(piece.shape))
        for (const cell of cellsFor(piece.shape)) { line(ctx, cell.x - 14, cell.y - 13, cell.x + 14, cell.y + 13, '#d1cabb', 1.6); for (const sign of [-1, 1]) rect(ctx, cell.x + sign * 13 - 1, cell.y + sign * 12 - 1, 2, 2, '#263c4b') }
        ctx.restore()
      }
    }
    for (const p of this.neighbourhood.props) this.prop(p, this.cx + p.x * this.scale, sy(p.y), this.scale)
    const dt = Math.min(delta, 50) / 1000
    for (const p of this.particles) { p.life -= dt * 1.8; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; ctx.globalAlpha = Math.max(0, p.life) * 0.6; rect(ctx, this.cx + p.x * this.scale, sy(p.y), p.size * this.scale, p.size * this.scale, p.color) }
    ctx.globalAlpha = 1; this.particles = this.particles.filter(p => p.life > 0)
    if (!game.full) this.nextCard(game, t)
  }
}
