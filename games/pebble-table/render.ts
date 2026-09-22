import type { FeedingView } from './feeding'
import {
  BAG,
  FEEDING,
  MAT,
  RADIUS_BY_QUARTERS,
  SCALE,
  shelfSlot,
  SHELF,
  TABLE,
  WORLD,
  type MatKey,
  type Point,
  type Quarters,
} from './layout'
import { panDrops } from './scale'
import type { Piece } from './state'

// Procedural art for the table (KTD1). Everything is drawn in world units
// onto one canvas: a walnut table under a warm lamp, a linen bag, identical
// terracotta clay stones, felt and linen mats, soft round guests. No text
// is ever drawn on the child's side (R17).

export type Flight = { id: number; q: Quarters; x: number; y: number; scale: number }
export type Puff = { x: number; y: number; t: number }

export type FeedingModel = {
  view: FeedingView
  seats: readonly boolean[]
  gaze: (seat: number) => number | null
  munchStart: number | null
  arrivals: ReadonlyMap<number, number>
  guestDrag: { seat: number; x: number; y: number } | null
  knife: { x: number; y: number; visible: boolean; held: boolean }
}

export type RenderModel = {
  now: number
  liveMat: MatKey
  pieces: readonly Piece[]
  dropOf: (piece: Piece) => number
  heldIds: ReadonlySet<number>
  beamAngle: number
  bagFullness: number
  bagTipStart: number | null
  flights: readonly Flight[]
  pulses: ReadonlyMap<number, number>
  puffs: readonly Puff[]
  shelf: readonly MatKey[]
  shelfDrag: { mat: MatKey; x: number; y: number } | null
  matSlideStart: number | null
  feeding: FeedingModel | null
}

const PALETTE = {
  wall: '#231b16',
  tableEdge: '#5c3a24',
  table: '#8d5b3a',
  clay: '#c86f47',
  clayLight: '#eaa27c',
  clayDark: '#9b4e2e',
  linen: '#e2d2ae',
  linenShade: '#bda77c',
  string: '#6e4f33',
  felt: '#35566a',
  feltLight: '#46708a',
  brass: '#d4ac52',
  brassDark: '#9c7a2e',
  cloth: '#f0e4cd',
  clothDot: '#e3a58f',
  plate: '#fbf7ee',
  plateRim: '#dcd3c2',
  bowl: '#a86b3c',
  bowlInner: '#7d4a26',
  shelf: '#4a3325',
  shelfLip: '#3a271b',
} as const

const GUEST_COLORS = ['#f2c75c', '#8fd3b6', '#f29c8a', '#9cc8ec', '#c7a8e6'] as const

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Pre-render the walnut grain for the table at the current device scale. */
export function renderTableTexture(pixelsPerUnit: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(TABLE.w * pixelsPerUnit))
  canvas.height = Math.max(1, Math.round(TABLE.h * pixelsPerUnit))
  const g = canvas.getContext('2d')!
  g.scale(pixelsPerUnit, pixelsPerUnit)
  const base = g.createLinearGradient(0, 0, TABLE.w, TABLE.h)
  base.addColorStop(0, '#9a6541')
  base.addColorStop(0.5, PALETTE.table)
  base.addColorStop(1, '#7a4c2f')
  g.fillStyle = base
  g.fillRect(0, 0, TABLE.w, TABLE.h)

  const random = mulberry32(7)
  const planks = 5
  const plankH = TABLE.h / planks
  for (let p = 0; p < planks; p++) {
    const y0 = p * plankH
    g.fillStyle = `rgba(${p % 2 ? '60,30,15' : '255,220,180'},${0.04 + random() * 0.03})`
    g.fillRect(0, y0, TABLE.w, plankH)
    for (let line = 0; line < 26; line++) {
      const y = y0 + random() * plankH
      const amplitude = 3 + random() * 9
      const wavelength = 180 + random() * 320
      const phase = random() * Math.PI * 2
      g.strokeStyle = `rgba(${random() > 0.5 ? '70,38,20' : '180,120,80'},${0.12 + random() * 0.16})`
      g.lineWidth = 0.8 + random() * 2.2
      g.beginPath()
      for (let x = 0; x <= TABLE.w; x += 12) {
        const yy = y + Math.sin(x / wavelength + phase) * amplitude + Math.sin(x / 57 + phase * 2) * 1.2
        if (x === 0) g.moveTo(x, yy)
        else g.lineTo(x, yy)
      }
      g.stroke()
    }
    for (let knot = 0; knot < 2; knot++) {
      if (random() > 0.6) continue
      const kx = random() * TABLE.w
      const ky = y0 + plankH * (0.3 + random() * 0.4)
      for (let ring = 5; ring > 0; ring--) {
        g.strokeStyle = `rgba(70,38,20,${0.08 + ring * 0.02})`
        g.lineWidth = 1.4
        g.beginPath()
        g.ellipse(kx, ky, ring * 7, ring * 3, 0, 0, Math.PI * 2)
        g.stroke()
      }
    }
    g.fillStyle = 'rgba(40,20,10,0.35)'
    g.fillRect(0, y0 + plankH - 2, TABLE.w, 2)
  }
  const lamp = g.createRadialGradient(TABLE.w * 0.45, TABLE.h * 0.35, 80, TABLE.w * 0.5, TABLE.h * 0.5, TABLE.w * 0.75)
  lamp.addColorStop(0, 'rgba(255,225,170,0.22)')
  lamp.addColorStop(1, 'rgba(20,8,0,0.35)')
  g.fillStyle = lamp
  g.fillRect(0, 0, TABLE.w, TABLE.h)
  return canvas
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

function drawFrame(g: CanvasRenderingContext2D, texture: HTMLCanvasElement | null): void {
  g.fillStyle = PALETTE.wall
  g.fillRect(-2000, -2000, WORLD.w + 4000, WORLD.h + 4000)
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.55)'
  g.shadowBlur = 40
  g.shadowOffsetY = 14
  roundRect(g, TABLE.x - 14, TABLE.y - 14, TABLE.w + 28, TABLE.h + 28, 34)
  g.fillStyle = PALETTE.tableEdge
  g.fill()
  g.restore()
  g.save()
  roundRect(g, TABLE.x, TABLE.y, TABLE.w, TABLE.h, 24)
  g.clip()
  if (texture) g.drawImage(texture, TABLE.x, TABLE.y, TABLE.w, TABLE.h)
  else {
    g.fillStyle = PALETTE.table
    g.fillRect(TABLE.x, TABLE.y, TABLE.w, TABLE.h)
  }
  g.restore()
}

function drawShelf(g: CanvasRenderingContext2D, model: RenderModel): void {
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.5)'
  g.shadowBlur = 18
  g.shadowOffsetX = -4
  roundRect(g, SHELF.x, SHELF.y, SHELF.w, SHELF.h, 16)
  g.fillStyle = PALETTE.shelf
  g.fill()
  g.restore()
  for (let i = 0; i < 5; i++) {
    const slot = shelfSlot(i)
    g.fillStyle = PALETTE.shelfLip
    g.fillRect(SHELF.x + 6, slot.y + slot.h + 14, SHELF.w - 12, 7)
  }
  model.shelf.forEach((mat, index) => {
    if (model.shelfDrag?.mat === mat) return
    const slot = shelfSlot(index)
    drawMatPicture(g, mat, slot.x + slot.w / 2, slot.y + slot.h / 2, slot.w, model.now)
  })
  if (model.shelfDrag) {
    const { mat, x, y } = model.shelfDrag
    g.save()
    g.globalAlpha = 0.92
    drawMatPicture(g, mat, x, y, 150, model.now)
    g.restore()
  }
}

function drawMatPicture(g: CanvasRenderingContext2D, mat: MatKey, cx: number, cy: number, size: number, now: number): void {
  const half = size / 2
  g.save()
  g.translate(cx, cy)
  g.rotate(Math.sin(now * 0.6 + cx) * 0.01)
  g.shadowColor = 'rgba(0,0,0,0.4)'
  g.shadowBlur = 8
  g.shadowOffsetY = 4
  roundRect(g, -half, -half * 0.8, size, size * 0.8, 10)
  g.fillStyle = mat === 'scale' ? PALETTE.felt : PALETTE.cloth
  g.fill()
  g.shadowColor = 'transparent'
  const s = size / 110
  if (mat === 'scale') {
    g.strokeStyle = PALETTE.brass
    g.lineWidth = 5 * s
    g.beginPath()
    g.moveTo(-34 * s, -12 * s)
    g.lineTo(34 * s, -12 * s)
    g.moveTo(0, -18 * s)
    g.lineTo(0, 20 * s)
    g.stroke()
    for (const side of [-1, 1]) {
      g.beginPath()
      g.ellipse(side * 34 * s, 10 * s, 18 * s, 8 * s, 0, 0, Math.PI * 2)
      g.fillStyle = PALETTE.brass
      g.fill()
    }
  } else {
    g.beginPath()
    g.arc(0, 0, 14 * s, 0, Math.PI * 2)
    g.fillStyle = PALETTE.bowl
    g.fill()
    for (const [i, a] of [-2.4, -0.7, 0.9, 2.5].entries()) {
      g.beginPath()
      g.arc(Math.cos(a) * 32 * s, Math.sin(a) * 22 * s, 10 * s, 0, Math.PI * 2)
      g.fillStyle = PALETTE.plate
      g.fill()
      g.beginPath()
      g.arc(Math.cos(a) * 44 * s, Math.sin(a) * 30 * s, 5 * s, 0, Math.PI * 2)
      g.fillStyle = GUEST_COLORS[i]
      g.fill()
    }
  }
  g.restore()
}

function drawBag(g: CanvasRenderingContext2D, model: RenderModel): void {
  const fullness = model.bagFullness
  const breathe = 1 + Math.sin(model.now * 1.3) * 0.012
  const tip = model.bagTipStart === null ? 0 : Math.max(0, 1 - (model.now - model.bagTipStart) / 0.7)
  const tilt = -Math.sin(tip * Math.PI) * 0.55
  const w = BAG.r * (0.75 + fullness * 0.25)
  const h = BAG.r * (0.55 + fullness * 0.45) * breathe
  g.save()
  g.translate(BAG.x, BAG.y + 30)
  g.fillStyle = 'rgba(30,12,4,0.35)'
  g.beginPath()
  g.ellipse(10, 18, w * 1.05, BAG.r * 0.38, 0, 0, Math.PI * 2)
  g.fill()
  g.rotate(tilt)
  const body = g.createRadialGradient(-w * 0.3, -h * 0.6, 10, 0, -h * 0.3, w * 1.3)
  body.addColorStop(0, '#f1e5c8')
  body.addColorStop(1, PALETTE.linenShade)
  g.fillStyle = body
  g.beginPath()
  g.moveTo(-w * 0.35, -h * 1.25)
  g.bezierCurveTo(-w * 1.15, -h * 0.9, -w * 1.1, 0.3 * h, -w * 0.2, 0.35 * h)
  g.bezierCurveTo(w * 0.5, 0.42 * h, w * 1.15, 0.1 * h, w * 1.0, -h * 0.55)
  g.bezierCurveTo(w * 0.9, -h * 1.0, w * 0.55, -h * 1.2, w * 0.3, -h * 1.25)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(120,95,60,0.35)'
  g.lineWidth = 2
  for (const fold of [-0.4, 0.1, 0.55]) {
    g.beginPath()
    g.moveTo(w * fold, -h * 1.15)
    g.quadraticCurveTo(w * (fold + 0.12), -h * 0.4, w * (fold - 0.05), h * 0.2)
    g.stroke()
  }
  g.fillStyle = PALETTE.linen
  g.beginPath()
  g.ellipse(0, -h * 1.27, w * 0.42, 12, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = PALETTE.string
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(-w * 0.38, -h * 1.12)
  g.quadraticCurveTo(0, -h * 1.0, w * 0.38, -h * 1.12)
  g.stroke()
  g.beginPath()
  g.moveTo(w * 0.3, -h * 1.1)
  g.quadraticCurveTo(w * 0.7, -h * 1.0 + Math.sin(model.now * 1.1) * 3, w * 0.62, -h * 0.72)
  g.stroke()
  g.restore()
}

function stoneSpeckles(): Point[] {
  const random = mulberry32(42)
  return Array.from({ length: 7 }, () => ({ x: (random() - 0.5) * 1.3, y: (random() - 0.5) * 1.3 }))
}
const SPECKLES = stoneSpeckles()

/** One clay stone (or a half or quarter of one). Identical by design; only the light differs. */
export function drawStone(g: CanvasRenderingContext2D, q: Quarters, x: number, y: number, id: number, lift = 0, glow = 0): void {
  const r = RADIUS_BY_QUARTERS[q]
  g.save()
  g.translate(x, y)
  g.fillStyle = `rgba(30,10,0,${0.32 - lift * 0.12})`
  g.beginPath()
  g.ellipse(4 + lift * 6, 7 + lift * 10, r * (1 + lift * 0.1), r * 0.92, 0, 0, Math.PI * 2)
  g.fill()
  if (glow > 0) {
    g.fillStyle = `rgba(255,236,190,${glow * 0.55})`
    g.beginPath()
    g.arc(0, 0, r * (1.25 + glow * 0.35), 0, Math.PI * 2)
    g.fill()
  }
  const scale = 1 + lift * 0.08 + glow * 0.12
  g.scale(scale, scale)
  g.rotate((id * 1.7) % (Math.PI * 2))
  const clay = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05)
  clay.addColorStop(0, PALETTE.clayLight)
  clay.addColorStop(0.55, PALETTE.clay)
  clay.addColorStop(1, PALETTE.clayDark)
  g.fillStyle = clay
  g.beginPath()
  if (q === 4) g.ellipse(0, 0, r, r * 0.94, 0, 0, Math.PI * 2)
  else if (q === 2) {
    g.moveTo(-r, r * 0.25)
    g.bezierCurveTo(-r, -r * 1.05, r, -r * 1.05, r, r * 0.25)
    g.closePath()
  } else {
    g.moveTo(-r * 0.7, r * 0.6)
    g.lineTo(-r * 0.7, -r * 0.8)
    g.quadraticCurveTo(r * 0.9, -r * 0.8, r * 0.9, r * 0.6)
    g.closePath()
  }
  g.fill()
  g.fillStyle = 'rgba(110,50,25,0.35)'
  for (const speck of SPECKLES) {
    g.beginPath()
    g.arc(speck.x * r * 0.7, speck.y * r * 0.7, r * 0.06, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = 'rgba(255,240,220,0.35)'
  g.beginPath()
  g.ellipse(-r * 0.35, -r * 0.42, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

function pulseGlow(model: RenderModel, id: number): number {
  const start = model.pulses.get(id)
  if (start === undefined) return 0
  const t = model.now - start
  if (t < 0 || t > 0.45) return 0
  return Math.sin((t / 0.45) * Math.PI)
}

function drawPieces(g: CanvasRenderingContext2D, model: RenderModel, filter: (piece: Piece) => boolean): void {
  for (const piece of model.pieces) {
    if (!filter(piece)) continue
    const held = model.heldIds.has(piece.id)
    drawStone(g, piece.q, piece.x, piece.y + model.dropOf(piece), piece.id, held ? 1 : 0, pulseGlow(model, piece.id))
  }
}

function drawScaleMat(g: CanvasRenderingContext2D, model: RenderModel): void {
  const angle = model.beamAngle
  const [leftPan, rightPan] = SCALE.pans
  const drops = panDrops(angle)
  feltMat(g)
  const post = SCALE.post
  g.save()
  g.fillStyle = 'rgba(10,20,30,0.35)'
  g.beginPath()
  g.ellipse(post.x + 8, post.y + 160, 70, 22, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = PALETTE.brassDark
  roundRect(g, post.x - 60, post.y + 135, 120, 30, 12)
  g.fill()
  const postGradient = g.createLinearGradient(post.x - 12, 0, post.x + 12, 0)
  postGradient.addColorStop(0, PALETTE.brassDark)
  postGradient.addColorStop(0.45, '#f0d27f')
  postGradient.addColorStop(1, PALETTE.brassDark)
  g.fillStyle = postGradient
  g.fillRect(post.x - 11, post.y - 90, 22, 235)
  g.restore()

  const pans = [leftPan, rightPan]
  pans.forEach((pan, side) => {
    const y = pan.y + drops[side]
    g.fillStyle = `rgba(10,20,30,${0.28 + drops[side] / 400})`
    g.beginPath()
    g.ellipse(pan.x + 10, pan.y + 24, pan.r * 0.98, pan.r * 0.9, 0, 0, Math.PI * 2)
    g.fill()
    const dish = g.createRadialGradient(pan.x - pan.r * 0.3, y - pan.r * 0.3, 10, pan.x, y, pan.r)
    dish.addColorStop(0, '#f3d98e')
    dish.addColorStop(0.7, PALETTE.brass)
    dish.addColorStop(1, PALETTE.brassDark)
    g.fillStyle = dish
    g.beginPath()
    g.ellipse(pan.x, y, pan.r, pan.r * 0.92, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(120,85,20,0.35)'
    g.beginPath()
    g.ellipse(pan.x, y + 4, pan.r * 0.82, pan.r * 0.74, 0, 0, Math.PI * 2)
    g.fill()
  })
}

function drawBeam(g: CanvasRenderingContext2D, model: RenderModel): void {
  const angle = model.beamAngle + Math.sin(model.now * 0.9) * 0.004
  const post = SCALE.post
  const drops = panDrops(model.beamAngle)
  const ends = [-1, 1].map((side) => ({
    x: post.x + Math.cos(angle) * SCALE.beamHalf * side,
    y: post.y - 90 + Math.sin(angle) * SCALE.beamHalf * side,
  }))
  g.save()
  g.strokeStyle = 'rgba(80,60,20,0.7)'
  g.lineWidth = 2
  SCALE.pans.forEach((pan, side) => {
    const y = pan.y + drops[side]
    for (const dx of [-0.8, 0, 0.8]) {
      g.beginPath()
      g.moveTo(ends[side].x, ends[side].y)
      g.lineTo(pan.x + dx * pan.r, y - (dx === 0 ? pan.r * 0.9 : pan.r * 0.3))
      g.stroke()
    }
  })
  g.lineCap = 'round'
  g.strokeStyle = PALETTE.brassDark
  g.lineWidth = 18
  g.beginPath()
  g.moveTo(ends[0].x, ends[0].y + 3)
  g.lineTo(ends[1].x, ends[1].y + 3)
  g.stroke()
  g.strokeStyle = PALETTE.brass
  g.lineWidth = 13
  g.beginPath()
  g.moveTo(ends[0].x, ends[0].y)
  g.lineTo(ends[1].x, ends[1].y)
  g.stroke()
  g.fillStyle = '#f0d27f'
  g.beginPath()
  g.arc(post.x, post.y - 90, 16, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = PALETTE.brassDark
  g.beginPath()
  g.moveTo(post.x, post.y - 90 - 34)
  g.lineTo(post.x - 7, post.y - 96)
  g.lineTo(post.x + 7, post.y - 96)
  g.closePath()
  g.fill()
  g.restore()
}

function feltMat(g: CanvasRenderingContext2D): void {
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.35)'
  g.shadowBlur = 16
  g.shadowOffsetY = 6
  roundRect(g, MAT.x, MAT.y, MAT.w, MAT.h, 26)
  const felt = g.createLinearGradient(MAT.x, MAT.y, MAT.x + MAT.w, MAT.y + MAT.h)
  felt.addColorStop(0, PALETTE.feltLight)
  felt.addColorStop(1, PALETTE.felt)
  g.fillStyle = felt
  g.fill()
  g.restore()
  g.save()
  g.setLineDash([10, 9])
  g.strokeStyle = 'rgba(220,235,240,0.35)'
  g.lineWidth = 3
  roundRect(g, MAT.x + 16, MAT.y + 16, MAT.w - 32, MAT.h - 32, 18)
  g.stroke()
  g.restore()
}

function drawFeedingMat(g: CanvasRenderingContext2D, model: RenderModel, feeding: FeedingModel): void {
  const cx = MAT.x + MAT.w / 2
  const cy = MAT.y + MAT.h / 2
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.3)'
  g.shadowBlur = 18
  g.shadowOffsetY = 6
  g.beginPath()
  const scallops = 36
  for (let i = 0; i <= scallops; i++) {
    const a = (i / scallops) * Math.PI * 2
    const wobble = 1 + Math.sin(i * 2.0) * 0.012
    const x = cx + Math.cos(a) * (MAT.w / 2) * wobble
    const y = cy + Math.sin(a) * (MAT.h / 2) * wobble
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.fillStyle = PALETTE.cloth
  g.fill()
  g.restore()
  g.save()
  g.beginPath()
  g.ellipse(cx, cy, MAT.w / 2 - 8, MAT.h / 2 - 8, 0, 0, Math.PI * 2)
  g.clip()
  g.fillStyle = PALETTE.clothDot
  for (let y = MAT.y + 20; y < MAT.y + MAT.h; y += 44) {
    for (let x = MAT.x + ((y / 44) % 2 ? 22 : 0); x < MAT.x + MAT.w; x += 44) {
      g.beginPath()
      g.arc(x, y, 3.2, 0, Math.PI * 2)
      g.fill()
    }
  }
  g.restore()

  const bowl = FEEDING.bowl
  g.fillStyle = 'rgba(40,15,0,0.3)'
  g.beginPath()
  g.ellipse(bowl.x + 8, bowl.y + 12, bowl.r * 1.02, bowl.r * 0.95, 0, 0, Math.PI * 2)
  g.fill()
  const wood = g.createRadialGradient(bowl.x - 30, bowl.y - 30, 10, bowl.x, bowl.y, bowl.r)
  wood.addColorStop(0, '#c98a55')
  wood.addColorStop(1, PALETTE.bowl)
  g.fillStyle = wood
  g.beginPath()
  g.arc(bowl.x, bowl.y, bowl.r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = PALETTE.bowlInner
  g.beginPath()
  g.arc(bowl.x + 3, bowl.y + 4, bowl.r * 0.8, 0, Math.PI * 2)
  g.fill()

  FEEDING.seats.forEach((seat, index) => {
    if (!feeding.seats[index]) return
    const plate = seat.plate
    g.fillStyle = 'rgba(40,15,0,0.2)'
    g.beginPath()
    g.ellipse(plate.x + 5, plate.y + 8, FEEDING.plateRadius, FEEDING.plateRadius * 0.95, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = PALETTE.plate
    g.beginPath()
    g.arc(plate.x, plate.y, FEEDING.plateRadius, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = PALETTE.plateRim
    g.lineWidth = 5
    g.beginPath()
    g.arc(plate.x, plate.y, FEEDING.plateRadius * 0.72, 0, Math.PI * 2)
    g.stroke()
  })

  FEEDING.seats.forEach((seat, index) => {
    const drag = feeding.guestDrag?.seat === index ? feeding.guestDrag : null
    if (feeding.seats[index] || drag) drawGuest(g, model, feeding, index, drag ?? seat.guest)
    else drawStool(g, seat.guest)
  })
}

function drawStool(g: CanvasRenderingContext2D, at: Point): void {
  g.fillStyle = 'rgba(40,15,0,0.25)'
  g.beginPath()
  g.ellipse(at.x + 5, at.y + 8, 40, 36, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#9d6b42'
  g.beginPath()
  g.arc(at.x, at.y, 38, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(60,30,10,0.35)'
  g.lineWidth = 3
  g.beginPath()
  g.arc(at.x, at.y, 28, 0, Math.PI * 2)
  g.stroke()
}

function drawGuest(g: CanvasRenderingContext2D, model: RenderModel, feeding: FeedingModel, seat: number, at: Point): void {
  const t = model.now
  const arrival = feeding.arrivals.get(seat)
  const pop = arrival === undefined ? 1 : Math.min(1, (t - arrival) / 0.45)
  const bounce = pop < 1 ? Math.sin(pop * Math.PI) * 0.25 + pop : 1
  const munching = feeding.munchStart !== null && t - feeding.munchStart < 1.4
  const chew = munching ? Math.abs(Math.sin((t - feeding.munchStart!) * 11)) : 0
  const breathe = Math.sin(t * 1.6 + seat * 1.3) * 0.03
  const r = 52 * bounce
  const color = GUEST_COLORS[seat % GUEST_COLORS.length]
  const facing = FEEDING.seats[seat].facing
  g.save()
  g.translate(at.x, at.y)
  g.fillStyle = 'rgba(40,15,0,0.28)'
  g.beginPath()
  g.ellipse(6, 12, r * 1.02, r * 0.9, 0, 0, Math.PI * 2)
  g.fill()
  g.scale(1 + breathe, 1 - breathe - chew * 0.04)
  const body = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.2, 0, 0, r * 1.1)
  body.addColorStop(0, '#ffffff')
  body.addColorStop(0.25, color)
  body.addColorStop(1, shade(color, -0.22))
  g.fillStyle = body
  g.beginPath()
  g.ellipse(0, 0, r, r * 0.94, 0, 0, Math.PI * 2)
  g.fill()
  for (const side of [-1, 1]) {
    g.fillStyle = shade(color, -0.12)
    g.beginPath()
    g.ellipse(side * r * 0.62, -r * 0.72, r * 0.2, r * 0.26, side * 0.4, 0, Math.PI * 2)
    g.fill()
  }

  const gazeSeat = feeding.gaze(seat)
  let look = { x: -facing.x, y: -facing.y }
  if (gazeSeat !== null) {
    const target = FEEDING.seats[gazeSeat].plate
    const dx = target.x - at.x
    const dy = target.y - at.y
    const d = Math.hypot(dx, dy) || 1
    look = { x: dx / d, y: dy / d }
  }
  const eyeCenter = { x: -facing.x * r * 0.35, y: -facing.y * r * 0.3 - r * 0.1 }
  const across = { x: -facing.y, y: facing.x }
  const blink = (t + seat * 0.83) % 4.2 < 0.12
  for (const side of [-1, 1]) {
    const ex = eyeCenter.x + across.x * side * r * 0.32
    const ey = eyeCenter.y + across.y * side * r * 0.32
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.ellipse(ex, ey, r * 0.2, blink ? r * 0.03 : r * 0.22, 0, 0, Math.PI * 2)
    g.fill()
    if (!blink) {
      g.fillStyle = '#2b2118'
      g.beginPath()
      g.arc(ex + look.x * r * 0.08, ey + look.y * r * 0.08, r * 0.1, 0, Math.PI * 2)
      g.fill()
    }
  }
  const mouth = { x: eyeCenter.x - facing.x * r * 0.28, y: eyeCenter.y - facing.y * r * 0.28 + r * 0.18 }
  g.fillStyle = '#6b2f2a'
  g.beginPath()
  g.ellipse(mouth.x, mouth.y, r * 0.14, r * (0.04 + chew * 0.1), 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(255,120,120,0.35)'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.arc(mouth.x + across.x * side * r * 0.38, mouth.y + across.y * side * r * 0.38 - r * 0.06, r * 0.09, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value + amount * 255)))
  return `rgb(${channel(n >> 16)},${channel((n >> 8) & 255)},${channel(n & 255)})`
}

function drawKnife(g: CanvasRenderingContext2D, knife: FeedingModel['knife'], now: number): void {
  if (!knife.visible) return
  const lift = knife.held ? 1 : 0
  g.save()
  g.translate(knife.x, knife.y)
  g.rotate(-0.5 + (knife.held ? 0 : Math.sin(now * 0.8) * 0.02))
  g.fillStyle = `rgba(30,10,0,${0.3 - lift * 0.1})`
  roundRect(g, -70 + 6 + lift * 6, -9 + 8 + lift * 8, 140, 18, 9)
  g.fill()
  g.fillStyle = '#c99b6b'
  roundRect(g, -70, -10, 62, 20, 10)
  g.fill()
  const blade = g.createLinearGradient(0, -10, 0, 10)
  blade.addColorStop(0, '#f3f5f7')
  blade.addColorStop(1, '#b9c1c9')
  g.fillStyle = blade
  g.beginPath()
  g.moveTo(-10, -8)
  g.lineTo(52, -8)
  g.quadraticCurveTo(72, -2, 60, 8)
  g.lineTo(-10, 8)
  g.closePath()
  g.fill()
  g.restore()
}

function drawPuffs(g: CanvasRenderingContext2D, model: RenderModel): void {
  for (const puff of model.puffs) {
    const age = model.now - puff.t
    if (age < 0 || age > 0.6) continue
    const k = age / 0.6
    g.fillStyle = `rgba(240,225,200,${0.45 * (1 - k)})`
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26 + puff.x
      g.beginPath()
      g.arc(puff.x + Math.cos(a) * 30 * k, puff.y + Math.sin(a) * 20 * k - 20 * k, 8 * (1 - k * 0.5), 0, Math.PI * 2)
      g.fill()
    }
  }
}

export function drawTable(g: CanvasRenderingContext2D, model: RenderModel, texture: HTMLCanvasElement | null): void {
  drawFrame(g, texture)
  const slide = model.matSlideStart === null ? 1 : Math.min(1, (model.now - model.matSlideStart) / 0.35)
  const withSlide = (draw: () => void) => {
    g.save()
    g.globalAlpha = slide
    g.translate(0, (1 - slide) * 40)
    draw()
    g.restore()
  }
  const resting = (piece: Piece) => !model.heldIds.has(piece.id)
  if (model.liveMat === 'scale') {
    withSlide(() => drawScaleMat(g, model))
    drawPieces(g, model, resting)
    withSlide(() => drawBeam(g, model))
  } else if (model.feeding) {
    const feeding = model.feeding
    withSlide(() => drawFeedingMat(g, model, feeding))
    drawPieces(g, model, resting)
    if (!feeding.knife.held) withSlide(() => drawKnife(g, feeding.knife, model.now))
  }
  drawBag(g, model)
  drawShelf(g, model)
  for (const flight of model.flights) drawStone(g, flight.q, flight.x, flight.y, flight.id, 0.6 * flight.scale, 0)
  drawPuffs(g, model)
  drawPieces(g, model, (piece) => model.heldIds.has(piece.id))
  if (model.feeding?.knife.held) drawKnife(g, model.feeding.knife, model.now)
}
