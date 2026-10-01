// The pavement itself, painted once: tar with its grain and pits, cracks,
// stains, a patch of newer tar, the low wall behind, the kerb and the drain.
// The same pit map that darkens the tar is what the chalk skips over, so a
// chalk line breaks up exactly where the surface is rough.

import { H, W } from '../../kit/types.ts'

export const SKY_H = 74
export const PAVE_TOP = 124
export const KERB_Y = 770
// Where chalk and toys may go.
export const FIELD = { x0: 150, y0: 134, x1: 994, y1: 762 }
export const DRAIN = { x: 930, y: 804 }
export const BUCKET = { x: 74, y: 182, r: 46 }
export const SLOT_X = 74
export const SLOT_Y = 274
export const SLOT_GAP = 70
export const RAG = { x: 76, y: 702 }
export const BOX = { x: 1004, y: 146, w: 164, h: 384 }

export const CHALK = ['#f1eee4', '#f2d457', '#ee8ea6', '#7db6e8', '#9ccf86', '#f0a05c']
export const CHALK_DARK = ['#d9d5c8', '#d9b93e', '#d6708b', '#5f9bd0', '#7fb56a', '#d8853f']
// Between the two: for the unevenness within one stroke.
export const CHALK_MID = ['#e8e4d9', '#e8c94c', '#e5839b', '#70aadf', '#90c57a', '#e6954f']

export function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// The cracks, each listed downhill: rain runs along them in this order. The
// long one crosses the whole pavement and ends at the kerb beside the drain.
const CRACK_LINES: number[][][] = [
  [[330, 124], [352, 180], [338, 236], [392, 300], [420, 372], [505, 430], [540, 500], [640, 560], [700, 640], [820, 700], [896, 742], [934, 772]],
  [[420, 372], [360, 410], [300, 470], [250, 484], [200, 540], [170, 612], [182, 690], [160, 772]],
  [[1000, 250], [930, 300], [905, 380], [840, 430], [800, 520], [730, 570], [700, 640]],
  [[640, 560], [610, 640], [560, 700], [574, 772]],
  [[762, 124], [748, 176], [800, 236], [930, 300]],
]

export interface CrackPt {
  x: number
  y: number
  // Index of the next point downhill, or -1 at the kerb.
  next: number
}

function buildCracks(): { lines: number[][][]; pts: CrackPt[] } {
  const rand = mulberry(77)
  const lines: number[][][] = []
  for (const raw of CRACK_LINES) {
    let line = raw
    for (let pass = 0; pass < 3; pass++) {
      const out: number[][] = [line[0]]
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1]
        const b = line[i]
        const len = Math.hypot(b[0] - a[0], b[1] - a[1])
        const off = (rand() - 0.5) * len * 0.34
        out.push([(a[0] + b[0]) / 2 - ((b[1] - a[1]) / len) * off, (a[1] + b[1]) / 2 + ((b[0] - a[0]) / len) * off], b)
      }
      line = out
    }
    lines.push(line)
  }
  const pts: CrackPt[] = []
  const starts: number[] = []
  const ends: number[] = []
  for (const line of lines) {
    starts.push(pts.length)
    for (let i = 0; i < line.length; i++) pts.push({ x: line[i][0], y: line[i][1], next: i < line.length - 1 ? pts.length + 1 : -1 })
    ends.push(pts.length - 1)
  }
  // A branch that stops on another crack carries on down that one.
  for (let k = 0; k < lines.length; k++) {
    const end = pts[ends[k]]
    if (end.y > KERB_Y - 4) continue
    let best = -1
    let bestD = 30
    for (let j = 0; j < pts.length; j++) {
      if (j >= starts[k] && j <= ends[k]) continue
      const d = Math.hypot(pts[j].x - end.x, pts[j].y - end.y)
      if (d < bestD) {
        bestD = d
        best = j
      }
    }
    end.next = best
  }
  return { lines, pts }
}

export const CRACKS = buildCracks()

// Where the live weeds grow: on the cracks and at the foot of the wall.
export const WEEDS: { x: number; y: number; size: number; kind: number }[] = [
  { x: 352, y: 184, size: 1.1, kind: 0 },
  { x: 505, y: 432, size: 1.3, kind: 1 },
  { x: 702, y: 642, size: 1, kind: 0 },
  { x: 252, y: 486, size: 0.9, kind: 0 },
  { x: 906, y: 382, size: 1.2, kind: 1 },
  { x: 612, y: 132, size: 1.2, kind: 0 },
  { x: 884, y: 130, size: 0.9, kind: 0 },
  { x: 208, y: 131, size: 1, kind: 0 },
  { x: 574, y: 764, size: 1, kind: 0 },
]

export interface Ground {
  scale: number
  canvas: HTMLCanvasElement
  // Opaque where the tar is pitted; the chalk is knocked out through these.
  pit: HTMLCanvasElement
  pitHeavy: HTMLCanvasElement
  lid: HTMLCanvasElement
}

const TILE = 256

function smoothNoise(rand: () => number, block: number): Float32Array {
  const n = TILE / block
  const coarse = new Float32Array(n * n)
  for (let i = 0; i < coarse.length; i++) coarse[i] = rand()
  const out = new Float32Array(TILE * TILE)
  for (let y = 0; y < TILE; y++) {
    const fy = y / block
    const y0 = Math.floor(fy) % n
    const y1 = (y0 + 1) % n
    const ty = fy - Math.floor(fy)
    for (let x = 0; x < TILE; x++) {
      const fx = x / block
      const x0 = Math.floor(fx) % n
      const x1 = (x0 + 1) % n
      const tx = fx - Math.floor(fx)
      const a = coarse[x0 + y0 * n] * (1 - tx) + coarse[x1 + y0 * n] * tx
      const b = coarse[x0 + y1 * n] * (1 - tx) + coarse[x1 + y1 * n] * tx
      out[x + y * TILE] = a * (1 - ty) + b * ty
    }
  }
  return out
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return [c, c.getContext('2d')!]
}

function tarTiles(S: number): { tar: HTMLCanvasElement; pit: HTMLCanvasElement; pitHeavy: HTMLCanvasElement } {
  const rand = mulberry(1234)
  const fine = new Float32Array(TILE * TILE)
  for (let i = 0; i < fine.length; i++) fine[i] = rand()
  const two = new Float32Array(TILE * TILE)
  for (let y = 0; y < TILE; y += 2) {
    for (let x = 0; x < TILE; x += 2) {
      const v = rand()
      two[x + y * TILE] = v
      two[x + 1 + y * TILE] = v
      two[x + (y + 1) * TILE] = v
      two[x + 1 + (y + 1) * TILE] = v
    }
  }
  const four = smoothNoise(rand, 4)
  const big = smoothNoise(rand, 32)
  const stone = new Float32Array(TILE * TILE)
  for (let i = 0; i < stone.length; i++) stone[i] = rand()

  const size = TILE * S
  const [tar, tg] = canvas(size, size)
  const [pit, pg] = canvas(size, size)
  const [pitHeavy, hg] = canvas(size, size)
  const tarData = tg.createImageData(size, size)
  const pitData = pg.createImageData(size, size)
  const heavyData = hg.createImageData(size, size)
  for (let Y = 0; Y < size; Y++) {
    const ly = Math.floor(Y / S)
    for (let X = 0; X < size; X++) {
      const lx = Math.floor(X / S)
      const i = lx + ly * TILE
      const at = (X + Y * size) * 4
      const rough = 0.5 * fine[i] + 0.5 * two[i] + 0.45 * (four[i] - 0.5)
      const isPit = rough > 0.68
      const isHeavy = rough > 0.5
      let v = 84 + (fine[i] - 0.5) * 30 + (four[i] - 0.5) * 22 + (big[i] - 0.5) * 18 + (rand() - 0.5) * 8
      if (isPit) v -= 30
      else if (isHeavy) v -= 9
      let r = v + 2
      let g = v
      let b = v + 1
      // Bits of aggregate showing through the worn tar.
      const s = stone[i]
      if (s > 0.972 && !isPit) {
        const lift = 30 + (s - 0.972) * 1600
        r += lift * (two[i] > 0.5 ? 1.08 : 0.9)
        g += lift * 0.98
        b += lift * (two[i] > 0.5 ? 0.86 : 1.06)
      }
      tarData.data[at] = r
      tarData.data[at + 1] = g
      tarData.data[at + 2] = b
      tarData.data[at + 3] = 255
      pitData.data[at + 3] = isPit ? 255 : 0
      heavyData.data[at + 3] = isHeavy ? 255 : 0
    }
  }
  tg.putImageData(tarData, 0, 0)
  pg.putImageData(pitData, 0, 0)
  hg.putImageData(heavyData, 0, 0)
  return { tar, pit, pitHeavy }
}

function blob(g: CanvasRenderingContext2D, rand: () => number, x: number, y: number, r: number, wobble = 0.3, points = 12): void {
  g.beginPath()
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2
    const rr = r * (1 - wobble / 2 + rand() * wobble)
    const px = x + Math.cos(a) * rr
    const py = y + Math.sin(a) * rr
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.closePath()
}

function speckle(g: CanvasRenderingContext2D, rand: () => number, x: number, y: number, w: number, h: number, count: number, colors: string[], max = 1.6): void {
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[Math.floor(rand() * colors.length)]
    const s = 0.5 + rand() * max
    g.fillRect(x + rand() * w, y + rand() * h, s, s)
  }
}

function paintSkyAndWall(g: CanvasRenderingContext2D, rand: () => number): void {
  const sky = g.createLinearGradient(0, 0, 0, SKY_H + 10)
  sky.addColorStop(0, '#8fb4c9')
  sky.addColorStop(0.6, '#c9d4cf')
  sky.addColorStop(1, '#eadfc4')
  g.fillStyle = sky
  g.fillRect(0, 0, W, SKY_H + 10)

  // A tree leaning over the wall: its leaves throw the moving shade.
  const leaf = ['#2f4a2c', '#3c5c33', '#4a6b39', '#24391f', '#5b7a3f']
  for (let i = 0; i < 260; i++) {
    const t = rand()
    const x = 130 + t * 420 + (rand() - 0.5) * 60
    const y = -8 + rand() * (58 - Math.abs(t - 0.45) * 60)
    g.fillStyle = leaf[Math.floor(rand() * leaf.length)]
    g.beginPath()
    g.ellipse(x, y, 7 + rand() * 9, 4 + rand() * 5, rand() * 3, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = '#3a2c22'
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(250, 76)
  g.quadraticCurveTo(262, 40, 300, 22)
  g.moveTo(268, 48)
  g.quadraticCurveTo(232, 30, 206, 26)
  g.stroke()

  // Brick, two courses and a coping.
  const top = SKY_H
  g.fillStyle = '#8a8377'
  g.fillRect(0, top + 10, W, PAVE_TOP - top - 10)
  const bricks = ['#8d4a38', '#7a3f31', '#9a5a41', '#6e3a30', '#a0664a', '#84503f', '#5f342c']
  const courseH = (PAVE_TOP - top - 12) / 2
  for (let row = 0; row < 2; row++) {
    const y = top + 12 + row * courseH
    let x = row === 0 ? -20 : -52
    while (x < W) {
      const w = 58 + rand() * 8
      g.fillStyle = bricks[Math.floor(rand() * bricks.length)]
      g.fillRect(x + 1.5, y + 1.5, w - 3, courseH - 3)
      // A chipped corner, a lighter worn face.
      if (rand() < 0.35) {
        g.fillStyle = 'rgba(210,190,170,0.18)'
        g.fillRect(x + 4 + rand() * 20, y + 3, 10 + rand() * 24, courseH - 8)
      }
      if (rand() < 0.2) {
        g.fillStyle = '#8a8377'
        g.beginPath()
        g.moveTo(x + 1, y + 1)
        g.lineTo(x + 9, y + 1)
        g.lineTo(x + 1, y + 8)
        g.fill()
      }
      x += w
    }
  }
  // Coping stones along the top.
  g.fillStyle = '#a39d92'
  g.fillRect(0, top, W, 13)
  g.fillStyle = 'rgba(255,250,235,0.35)'
  g.fillRect(0, top, W, 2.5)
  g.fillStyle = 'rgba(0,0,0,0.3)'
  g.fillRect(0, top + 12, W, 2.5)
  for (let x = 60 + rand() * 40; x < W; x += 132 + rand() * 30) {
    g.fillStyle = 'rgba(40,36,32,0.5)'
    g.fillRect(x, top, 2, 13)
  }
  // Grime: rain streaks down the brick, damp and moss along the foot.
  for (let i = 0; i < 26; i++) {
    const x = rand() * W
    const streak = g.createLinearGradient(0, top + 10, 0, PAVE_TOP)
    streak.addColorStop(0, 'rgba(20,18,16,0.32)')
    streak.addColorStop(1, 'rgba(20,18,16,0)')
    g.fillStyle = streak
    g.fillRect(x, top + 12, 3 + rand() * 9, PAVE_TOP - top - 12)
  }
  const foot = g.createLinearGradient(0, PAVE_TOP - 16, 0, PAVE_TOP)
  foot.addColorStop(0, 'rgba(18,22,14,0)')
  foot.addColorStop(1, 'rgba(18,22,14,0.55)')
  g.fillStyle = foot
  g.fillRect(0, PAVE_TOP - 16, W, 16)
  speckle(g, rand, 0, PAVE_TOP - 9, W, 9, 900, ['#4f6b33', '#3d5629', '#6b8440', '#2c3f1f'], 2.4)
  speckle(g, rand, 0, top, W, PAVE_TOP - top, 2600, ['rgba(0,0,0,0.22)', 'rgba(255,240,220,0.14)', 'rgba(0,0,0,0.12)'])
  speckle(g, rand, 0, 0, W, top, 700, ['rgba(255,255,255,0.08)', 'rgba(60,70,80,0.06)'])
}

function paintPavement(g: CanvasRenderingContext2D, rand: () => number, S: number, tar: HTMLCanvasElement): void {
  g.save()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = g.createPattern(tar, 'repeat')!
  g.fillRect(0, PAVE_TOP * S, W * S, (H - PAVE_TOP) * S)
  g.restore()

  // Worn, sun-bleached patches and darker damp ones.
  for (let i = 0; i < 22; i++) {
    const x = rand() * W
    const y = PAVE_TOP + rand() * (KERB_Y - PAVE_TOP)
    const r = 90 + rand() * 200
    const light = rand() < 0.55
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, light ? 'rgba(190,182,170,0.13)' : 'rgba(12,12,16,0.2)')
    grad.addColorStop(1, light ? 'rgba(190,182,170,0)' : 'rgba(12,12,16,0)')
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // A square of newer tar where the pavement was dug up once, with its seam of
  // poured sealant.
  const patch = [[204, 600], [300, 590], [404, 598], [414, 662], [402, 730], [300, 740], [210, 730], [196, 664]]
  g.beginPath()
  patch.forEach((p, i) => {
    const q = patch[(i + 1) % patch.length]
    const mx = (p[0] + q[0]) / 2 + (rand() - 0.5) * 8
    const my = (p[1] + q[1]) / 2 + (rand() - 0.5) * 8
    if (i === 0) g.moveTo(mx, my)
    else g.quadraticCurveTo(p[0], p[1], mx, my)
  })
  g.closePath()
  g.fillStyle = 'rgba(14,13,17,0.3)'
  g.fill()
  g.strokeStyle = 'rgba(10,10,12,0.5)'
  g.lineWidth = 4
  g.lineJoin = 'round'
  g.stroke()
  g.strokeStyle = 'rgba(120,118,122,0.16)'
  g.lineWidth = 1
  g.stroke()

  // Cracks: a dark split with a paler worn lip, and fine side fractures.
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (const line of CRACKS.lines) {
    for (let pass = 0; pass < 3; pass++) {
      g.beginPath()
      line.forEach((p, i) => {
        const dx = pass === 0 ? 1.6 : 0
        const dy = pass === 0 ? 1.8 : 0
        if (i === 0) g.moveTo(p[0] + dx, p[1] + dy)
        else g.lineTo(p[0] + dx, p[1] + dy)
      })
      g.strokeStyle = pass === 0 ? 'rgba(160,154,146,0.3)' : pass === 1 ? 'rgba(20,19,22,0.55)' : '#0d0c0f'
      g.lineWidth = pass === 0 ? 2 : pass === 1 ? 5.5 : 2.2
      g.stroke()
    }
    for (let i = 2; i < line.length - 2; i += 2 + Math.floor(rand() * 4)) {
      const p = line[i]
      const a = rand() * Math.PI * 2
      const len = 8 + rand() * 26
      g.beginPath()
      g.moveTo(p[0], p[1])
      g.lineTo(p[0] + Math.cos(a) * len * 0.5 + (rand() - 0.5) * 6, p[1] + Math.sin(a) * len * 0.5 + (rand() - 0.5) * 6)
      g.lineTo(p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len)
      g.strokeStyle = 'rgba(12,11,14,0.8)'
      g.lineWidth = 1.2
      g.stroke()
    }
    // Moss and grit caught in the crack.
    for (let i = 0; i < line.length; i++) {
      if (rand() < 0.5) continue
      const p = line[i]
      speckle(g, rand, p[0] - 4, p[1] - 4, 8, 8, 5, ['#4c6631', '#394f27', '#6d8443', '#1c1b1e'], 2.2)
    }
  }

  // An old oil stain, chewing gum trodden flat, pebbles.
  for (const [x, y, r] of [[820, 250, 46], [470, 668, 34]]) {
    for (let k = 0; k < 4; k++) {
      blob(g, rand, x + (rand() - 0.5) * r, y + (rand() - 0.5) * r * 0.6, r * (0.5 + rand() * 0.6), 0.5)
      g.fillStyle = 'rgba(8,8,12,0.16)'
      g.fill()
    }
  }
  for (let i = 0; i < 9; i++) {
    const x = FIELD.x0 + rand() * (FIELD.x1 - FIELD.x0)
    const y = FIELD.y0 + rand() * (FIELD.y1 - FIELD.y0)
    blob(g, rand, x, y, 5 + rand() * 4, 0.35, 9)
    g.fillStyle = rand() < 0.5 ? 'rgba(18,17,20,0.75)' : 'rgba(150,144,138,0.5)'
    g.fill()
  }
  for (let i = 0; i < 110; i++) {
    const x = rand() * W
    const y = PAVE_TOP + 6 + rand() * (KERB_Y - PAVE_TOP - 10)
    const r = 1.2 + rand() * 2.4
    g.fillStyle = 'rgba(0,0,0,0.4)'
    g.beginPath()
    g.ellipse(x + 1, y + 1.6, r, r * 0.8, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = ['#a7a199', '#8f8a84', '#b9b0a2', '#7c7873', '#a08f7c'][Math.floor(rand() * 5)]
    g.beginPath()
    g.ellipse(x, y, r, r * 0.8, rand() * 3, 0, Math.PI * 2)
    g.fill()
  }

  // Dry leaves blown in, and a bottle top.
  for (const [x, y, rot, col] of [[640, 196, 0.6, '#9a6a2c'], [233, 330, 2.2, '#7d4f22'], [884, 610, -0.8, '#a37a35'], [455, 148, 1.4, '#6f4a26']] as [number, number, number, string][]) {
    g.save()
    g.translate(x, y)
    g.rotate(rot)
    g.fillStyle = 'rgba(0,0,0,0.35)'
    g.beginPath()
    g.ellipse(2, 4, 13, 6, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = col
    g.beginPath()
    g.moveTo(-14, 0)
    g.quadraticCurveTo(-2, -9, 14, 0)
    g.quadraticCurveTo(-2, 8, -14, 0)
    g.fill()
    g.strokeStyle = 'rgba(40,24,10,0.7)'
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(-13, 0)
    g.lineTo(17, 0)
    g.stroke()
    g.restore()
  }
  g.fillStyle = 'rgba(0,0,0,0.4)'
  g.beginPath()
  g.arc(733, 716, 9, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#8c8f92'
  g.beginPath()
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI * 2
    const r = i % 2 === 0 ? 9 : 7.6
    g.lineTo(731 + Math.cos(a) * r, 713 + Math.sin(a) * r)
  }
  g.fill()
  g.fillStyle = '#6a4a38'
  g.beginPath()
  g.arc(731, 713, 5.5, 0, Math.PI * 2)
  g.fill()

  // Flat weeds: dandelion rosettes pressed against the tar.
  for (const w of WEEDS) {
    if (w.kind !== 1) continue
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.4
      const len = (15 + rand() * 9) * w.size
      g.save()
      g.translate(w.x, w.y)
      g.rotate(a)
      g.fillStyle = ['#4d6b2f', '#5d7d38', '#3f5a28'][i % 3]
      g.beginPath()
      g.moveTo(0, 0)
      g.quadraticCurveTo(len * 0.5, -5 * w.size, len, 0)
      g.quadraticCurveTo(len * 0.5, 5 * w.size, 0, 0)
      g.fill()
      g.restore()
    }
    g.fillStyle = '#d7b938'
    g.beginPath()
    g.arc(w.x + 3, w.y - 2, 4.5 * w.size, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#b9962a'
    g.beginPath()
    g.arc(w.x + 3, w.y - 2, 2 * w.size, 0, Math.PI * 2)
    g.fill()
  }

  // The wall's shade lying along the top of the pavement.
  const shade = g.createLinearGradient(0, PAVE_TOP, 0, PAVE_TOP + 34)
  shade.addColorStop(0, 'rgba(6,6,10,0.5)')
  shade.addColorStop(1, 'rgba(6,6,10,0)')
  g.fillStyle = shade
  g.fillRect(0, PAVE_TOP, W, 34)
}

function paintKerb(g: CanvasRenderingContext2D, rand: () => number): void {
  g.fillStyle = '#8c8880'
  g.fillRect(0, KERB_Y, W, 24)
  g.fillStyle = 'rgba(255,250,238,0.28)'
  g.fillRect(0, KERB_Y, W, 3)
  g.fillStyle = 'rgba(0,0,0,0.38)'
  g.fillRect(0, KERB_Y + 19, W, 5)
  for (let x = 30 + rand() * 60; x < W; x += 150 + rand() * 14) {
    g.fillStyle = 'rgba(30,28,26,0.6)'
    g.fillRect(x, KERB_Y, 2.5, 22)
  }
  speckle(g, rand, 0, KERB_Y, W, 22, 1700, ['rgba(0,0,0,0.2)', 'rgba(255,245,230,0.16)', 'rgba(60,50,40,0.18)'], 1.8)
  // Chipped edges.
  for (let i = 0; i < 14; i++) {
    const x = rand() * W
    g.fillStyle = 'rgba(50,48,46,0.55)'
    g.beginPath()
    g.moveTo(x, KERB_Y)
    g.lineTo(x + 6 + rand() * 10, KERB_Y)
    g.lineTo(x + 3, KERB_Y + 3 + rand() * 4)
    g.fill()
  }
  // The gutter and its iron grate.
  g.fillStyle = '#29282b'
  g.fillRect(0, KERB_Y + 24, W, H - KERB_Y - 24)
  speckle(g, rand, 0, KERB_Y + 24, W, H - KERB_Y - 24, 1500, ['rgba(120,116,110,0.25)', 'rgba(0,0,0,0.3)', 'rgba(90,80,60,0.2)'], 1.8)
  const gx = DRAIN.x - 52
  const gy = KERB_Y + 26
  g.fillStyle = '#17171a'
  g.fillRect(gx, gy, 104, 24)
  g.strokeStyle = '#4d4b4a'
  g.lineWidth = 3
  g.strokeRect(gx + 1.5, gy + 1.5, 101, 22)
  for (let i = 0; i < 7; i++) {
    g.fillStyle = '#050506'
    g.fillRect(gx + 9 + i * 13, gy + 5, 7, 16)
    g.fillStyle = 'rgba(150,146,140,0.3)'
    g.fillRect(gx + 16 + i * 13, gy + 5, 1.5, 16)
  }
  speckle(g, rand, gx, gy, 104, 24, 60, ['rgba(140,90,50,0.5)', 'rgba(90,70,50,0.5)'], 2)
  for (const [x, rot, col] of [[gx - 30, 0.3, '#7d5a26'], [gx + 124, -0.5, '#96702f'], [220, 0.2, '#6d4c24']] as [number, number, string][]) {
    g.save()
    g.translate(x, KERB_Y + 38)
    g.rotate(rot)
    g.fillStyle = col
    g.beginPath()
    g.moveTo(-11, 0)
    g.quadraticCurveTo(0, -7, 11, 0)
    g.quadraticCurveTo(0, 6, -11, 0)
    g.fill()
    g.restore()
  }
}

function paintBucket(g: CanvasRenderingContext2D, rand: () => number): void {
  const { x, y, r } = BUCKET
  g.fillStyle = 'rgba(0,0,0,0.42)'
  g.beginPath()
  g.ellipse(x + 7, y + 13, r + 2, r, 0, 0, Math.PI * 2)
  g.fill()
  // A dented tin pail from above: the outer wall, the rolled rim, the dark inside.
  const wallGrad = g.createLinearGradient(x - r, y - r, x + r, y + r)
  wallGrad.addColorStop(0, '#aab0b3')
  wallGrad.addColorStop(0.5, '#7b8286')
  wallGrad.addColorStop(1, '#565c61')
  g.fillStyle = wallGrad
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#1f2224'
  g.beginPath()
  g.arc(x, y, r - 7, 0, Math.PI * 2)
  g.fill()
  const inner = g.createRadialGradient(x - 8, y - 10, 4, x, y, r - 7)
  inner.addColorStop(0, '#4c5357')
  inner.addColorStop(1, '#232629')
  g.fillStyle = inner
  g.beginPath()
  g.arc(x, y + 3, r - 10, 0, Math.PI * 2)
  g.fill()
  // The ends of the chalks still inside.
  const ends: [number, number, number][] = [[-16, -10, 2], [8, -16, 0], [18, 6, 5], [-6, 14, 1], [-22, 10, 4], [4, 0, 3], [-4, -24, 5], [22, -12, 1]]
  for (const [dx, dy, c] of ends) {
    g.fillStyle = 'rgba(0,0,0,0.5)'
    g.beginPath()
    g.arc(x + dx + 2, y + dy + 3, 9.5, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = CHALK_DARK[c]
    g.beginPath()
    g.arc(x + dx, y + dy, 9.5, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = CHALK[c]
    g.beginPath()
    g.arc(x + dx - 1, y + dy - 1.5, 7.5, 0, Math.PI * 2)
    g.fill()
  }
  speckle(g, rand, x - r, y - r, r * 2, r * 2, 240, ['rgba(255,255,255,0.14)', 'rgba(0,0,0,0.2)', 'rgba(140,90,50,0.3)'], 1.6)
  // Rim light and rust.
  g.strokeStyle = 'rgba(235,240,242,0.55)'
  g.lineWidth = 2
  g.beginPath()
  g.arc(x, y, r - 1.5, Math.PI * 0.95, Math.PI * 1.7)
  g.stroke()
  g.strokeStyle = 'rgba(140,84,44,0.6)'
  g.lineWidth = 3
  g.beginPath()
  g.arc(x, y, r - 2, 0.3, 1.1)
  g.stroke()
  // The wire handle, fallen to one side.
  g.strokeStyle = '#2c2f31'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(x - r + 2, y)
  g.quadraticCurveTo(x, y + r + 26, x + r - 2, y)
  g.stroke()
  g.strokeStyle = 'rgba(200,205,208,0.5)'
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(x - r + 3, y - 1)
  g.quadraticCurveTo(x, y + r + 24, x + r - 3, y - 1)
  g.stroke()

  // Years of chalk dust trodden into the tar where the chalks are kept.
  for (let i = 0; i < 6; i++) {
    const cy = SLOT_Y + i * SLOT_GAP
    for (let k = 0; k < 110; k++) {
      const a = rand() * Math.PI * 2
      const d = rand() * rand() * 70
      g.fillStyle = CHALK[i]
      g.globalAlpha = 0.1 + rand() * 0.22
      const s = 0.8 + rand() * 1.8
      g.fillRect(SLOT_X + Math.cos(a) * d * 1.1, cy + Math.sin(a) * d * 0.5, s, s)
    }
  }
  g.globalAlpha = 1
}

function cardboard(g: CanvasRenderingContext2D, rand: () => number, x: number, y: number, w: number, h: number, base: string): void {
  g.fillStyle = base
  g.fillRect(x, y, w, h)
  // The faint ribs of the corrugation and the fibres of the board.
  for (let i = 0; i < w; i += 5) {
    g.fillStyle = i % 10 === 0 ? 'rgba(255,240,210,0.05)' : 'rgba(0,0,0,0.05)'
    g.fillRect(x + i, y, 2.5, h)
  }
  speckle(g, rand, x, y, w, h, (w * h) / 22, ['rgba(60,40,20,0.16)', 'rgba(255,235,200,0.12)', 'rgba(0,0,0,0.1)'], 2.4)
}

function paintBox(g: CanvasRenderingContext2D, rand: () => number): void {
  const { x, y, w, h } = BOX
  g.fillStyle = 'rgba(0,0,0,0.45)'
  g.fillRect(x + 7, y + 12, w + 2, h + 2)
  cardboard(g, rand, x, y, w, h, '#a5835a')
  // The floor of the box, in the shade of its own walls.
  cardboard(g, rand, x + 9, y + 9, w - 18, h - 18, '#7c6243')
  const shadeTop = g.createLinearGradient(0, y + 9, 0, y + 40)
  shadeTop.addColorStop(0, 'rgba(0,0,0,0.5)')
  shadeTop.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = shadeTop
  g.fillRect(x + 9, y + 9, w - 18, 31)
  const shadeLeft = g.createLinearGradient(x + 9, 0, x + 30, 0)
  shadeLeft.addColorStop(0, 'rgba(0,0,0,0.35)')
  shadeLeft.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = shadeLeft
  g.fillRect(x + 9, y + 9, 21, h - 18)
  // Wall tops catch the light; the corners are soft from use.
  g.strokeStyle = 'rgba(240,215,170,0.45)'
  g.lineWidth = 2
  g.strokeRect(x + 1, y + 1, w - 2, h - 2)
  g.strokeStyle = 'rgba(40,26,12,0.6)'
  g.lineWidth = 1.5
  g.strokeRect(x + 9, y + 9, w - 18, h - 18)
  for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
    g.fillStyle = 'rgba(70,50,30,0.5)'
    g.beginPath()
    g.arc(cx, cy, 7, 0, Math.PI * 2)
    g.fill()
  }
  // A strip of old brown tape over a split corner.
  g.save()
  g.translate(x + w - 6, y + h - 40)
  g.rotate(0.12)
  g.fillStyle = 'rgba(196,160,96,0.85)'
  g.fillRect(-9, -22, 18, 50)
  g.fillStyle = 'rgba(255,255,255,0.12)'
  g.fillRect(-9, -22, 5, 50)
  g.restore()
}

function paintLid(S: number): HTMLCanvasElement {
  const rand = mulberry(909)
  const { w, h } = BOX
  const pad = 8
  const [c, g] = canvas((w + pad * 2) * S, (h + pad * 2) * S)
  g.scale(S, S)
  cardboard(g, rand, 0, 0, w + pad * 2, h + pad * 2, '#b08c5e')
  // A printed band, most of it rubbed away, and scuffs.
  g.fillStyle = 'rgba(126,52,40,0.55)'
  g.fillRect(0, 70, w + pad * 2, 46)
  g.fillStyle = 'rgba(126,52,40,0.4)'
  g.fillRect(0, 124, w + pad * 2, 7)
  for (let i = 0; i < 40; i++) {
    g.fillStyle = 'rgba(176,140,94,0.7)'
    g.fillRect(rand() * (w + pad * 2), 66 + rand() * 70, 4 + rand() * 26, 1 + rand() * 3)
  }
  for (let i = 0; i < 16; i++) {
    g.strokeStyle = 'rgba(70,50,30,0.25)'
    g.lineWidth = 1 + rand() * 2
    g.beginPath()
    const sx = rand() * (w + pad * 2)
    const sy = rand() * (h + pad * 2)
    g.moveTo(sx, sy)
    g.lineTo(sx + (rand() - 0.5) * 60, sy + (rand() - 0.5) * 60)
    g.stroke()
  }
  // A child's old crayon spiral on the lid.
  g.strokeStyle = 'rgba(60,90,140,0.5)'
  g.lineWidth = 3.5
  g.beginPath()
  for (let i = 0; i <= 70; i++) {
    const t = i / 70
    const a = t * Math.PI * 5.5
    const r = 5 + t * 36 + Math.sin(t * 40) * 1.5
    const px = (w + pad * 2) / 2 + Math.cos(a) * r * 1.1
    const py = 262 + Math.sin(a) * r
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.stroke()
  // The lip of the lid, turned down towards us.
  g.fillStyle = 'rgba(60,40,20,0.3)'
  g.fillRect(0, h + pad * 2 - 16, w + pad * 2, 16)
  g.fillStyle = 'rgba(245,225,185,0.35)'
  g.fillRect(0, h + pad * 2 - 17, w + pad * 2, 2)
  // Bevelled edge: light on top and left, shade below.
  g.strokeStyle = 'rgba(245,225,185,0.5)'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(1.5, h + pad * 2)
  g.lineTo(1.5, 1.5)
  g.lineTo(w + pad * 2, 1.5)
  g.stroke()
  g.strokeStyle = 'rgba(40,26,12,0.55)'
  g.beginPath()
  g.moveTo(w + pad * 2 - 1.5, 0)
  g.lineTo(w + pad * 2 - 1.5, h + pad * 2 - 1.5)
  g.lineTo(0, h + pad * 2 - 1.5)
  g.stroke()
  g.fillStyle = 'rgba(196,160,96,0.8)'
  g.fillRect(w + pad * 2 - 22, h - 40, 22, 30)
  return c
}

let cached: Ground | null = null

export function buildGround(S: number): Ground {
  if (cached && cached.scale === S) return cached
  const tiles = tarTiles(S)
  const [c, g] = canvas(W * S, H * S)
  g.scale(S, S)
  const rand = mulberry(4242)
  paintSkyAndWall(g, rand)
  paintPavement(g, rand, S, tiles.tar)
  paintKerb(g, rand)
  paintBucket(g, rand)
  paintBox(g, rand)
  // The corners fall away a little, like an old photograph.
  const vig = g.createRadialGradient(W / 2, H * 0.52, H * 0.42, W / 2, H * 0.52, W * 0.7)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.3)')
  g.fillStyle = vig
  g.fillRect(0, SKY_H, W, H - SKY_H)
  cached = { scale: S, canvas: c, pit: tiles.pit, pitHeavy: tiles.pitHeavy, lid: paintLid(S) }
  return cached
}
