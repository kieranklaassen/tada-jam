import { GUEST, MIDDLE, PANE, PANES, PENDULUM, TABLE_TOP, place, toPoint } from './layout'
import { makeRng } from './rng'
import { GOLD, GOLD_DARK, blob, cell, dye, gutta, mix, soft, type G } from './silk'
import { STAGE } from './stage'

// The salon, painted once: silk wall with leaves, window, curtains, sofa,
// stools, floor, and the wooden frame with its pins. Cooler and darker than
// everyone in it.

const WALL = '#1d6a78'

function leaf(g: G, x: number, y: number, length: number, turn: number, colour: string): void {
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(length * 0.5, -length * 0.42, length, 0)
  g.quadraticCurveTo(length * 0.5, length * 0.42, 0, 0)
  g.fillStyle = colour
  g.fill()
  gutta(g, 2)
  g.beginPath()
  g.moveTo(length * 0.08, 0)
  g.lineTo(length * 0.8, 0)
  gutta(g, 1.4)
  g.restore()
}

function flower(g: G, x: number, y: number, r: number): void {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    blob(g, x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72, r * 0.6, r * 0.46, a)
    cell(g, i % 2 ? '#7d4f9a' : '#6a4790', 2)
  }
  blob(g, x, y, r * 0.34, r * 0.34)
  cell(g, '#c79a4a', 2)
}

function vine(g: G, x: number, flip: 1 | -1): void {
  g.beginPath()
  g.moveTo(x, 600)
  g.bezierCurveTo(x + 90 * flip, 480, x - 90 * flip, 340, x + 10 * flip, 210)
  g.bezierCurveTo(x + 50 * flip, 150, x - 20 * flip, 100, x, 40)
  gutta(g, 3)
  const tints = ['#2b8580', '#2f7f93', '#25748a', '#3b8f7b']
  for (let i = 0; i < 9; i++) {
    const k = i / 8, y = 560 - k * 500
    const sx = x + Math.sin(k * 5.4) * 30 * flip
    leaf(g, sx, y, 78 - k * 18, (i % 2 ? -0.5 : Math.PI + 0.5) - 0.3 * flip, tints[i % 4])
    if (i % 3 === 1) flower(g, sx + (i % 2 ? -26 : 26), y - 16, 25 - k * 5)
  }
}

function curtain(g: G, side: 1 | -1): void {
  g.save()
  g.translate(MIDDLE, 0)
  g.scale(side, 1)
  g.beginPath()
  g.moveTo(134, 62)
  g.bezierCurveTo(196, 80, 214, 150, 190, 240)
  g.bezierCurveTo(180, 280, 196, 310, 206, 336)
  g.lineTo(150, 336)
  g.bezierCurveTo(148, 250, 130, 150, 120, 62)
  cell(g, '#8c2f6b', 4)
  for (const d of [0.3, 0.6]) {
    g.beginPath()
    g.moveTo(124 + d * 10, 70)
    g.bezierCurveTo(150 + d * 46, 120, 150 + d * 50, 220, 152 + d * 48, 330)
    gutta(g, 2)
  }
  g.restore()
}

/** The window's garden behind the waiting guests. */
export function paintPane(g: G, side: 0 | 1): void {
  const p = PANES[side]
  const x = p.x - PANE.width / 2, y = p.y - PANE.height / 2
  g.beginPath()
  g.rect(x, y, PANE.width, PANE.height)
  g.fillStyle = '#8fd3dc'
  g.fill()
  g.save()
  g.clip()
  soft(g, [[x - 30, y + 150], [x + 30, y + 104], [x + 80, y + 128], [x + 150, y + 96], [x + 170, y + 210], [x - 40, y + 210]])
  cell(g, '#7bbf6a', 2.5)
  blob(g, side ? x + 88 : x + 30, y + 40, 19, 19)
  cell(g, '#ffd873', 2.5)
  g.restore()
}

export function paintRoom(g: G): void {
  const rng = makeRng(41)
  const { width: W, height: H } = STAGE
  g.fillStyle = WALL
  g.fillRect(-400, -300, W + 800, H + 600)
  // Wall cells: tall lobed panels, each its own flood.
  for (let i = 0; i < 9; i++) {
    const x = 66 + i * 131
    g.save()
    g.translate(x, 300)
    g.beginPath()
    g.moveTo(-62, 320)
    g.lineTo(-62, -190)
    g.quadraticCurveTo(-58, -262, 0, -290)
    g.quadraticCurveTo(58, -262, 62, -190)
    g.lineTo(62, 320)
    g.closePath()
    g.fillStyle = dye(g, i % 2 ? '#236f80' : '#1b6374', 330)
    g.fill()
    gutta(g, 2.4)
    g.restore()
  }
  for (const [x, flip] of [[78, 1], [232, -1], [W - 232, 1], [W - 78, -1]] as const) vine(g, x, flip)
  // Floor: big scales of deep blue.
  g.beginPath()
  g.rect(-400, 598, W + 800, 600)
  cell(g, '#2c2f72', 4)
  for (let row = 0; row < 4; row++) {
    for (let i = -1; i < 12; i++) {
      const x = i * 112 + (row % 2 ? 56 : 0), y = 640 + row * 54
      g.beginPath()
      g.moveTo(x - 56, y - 10)
      g.quadraticCurveTo(x - 50, y + 44, x, y + 50)
      g.quadraticCurveTo(x + 50, y + 44, x + 56, y - 10)
      g.fillStyle = ['#34398a', '#2b3580', '#3b3f93'][(i + row + 3) % 3]
      g.fill()
      gutta(g, 2)
    }
  }
  // Window.
  g.beginPath()
  g.rect(MIDDLE - 140, 84, 280, 226)
  cell(g, '#a86a2c', 5)
  paintPane(g, 0)
  paintPane(g, 1)
  // The sofa: one long scalloped back, shared by both aunts.
  g.save()
  g.translate(MIDDLE, 440)
  soft(g, [[-452, 210], [-460, 10], [-420, -92], [-330, -120], [-250, -150], [-160, -104], [-70, -60], [0, -50], [70, -60], [160, -104], [250, -150], [330, -120], [420, -92], [460, 10], [452, 210]])
  cell(g, dye(g, '#215a3f', 470), 5)
  g.save()
  g.clip()
  for (let row = 0; row < 5; row++) for (let i = -7; i <= 7; i++) {
    const x = i * 76 + (row % 2 ? 38 : 0), y = -92 + row * 64
    g.beginPath()
    g.moveTo(x, y - 34)
    g.quadraticCurveTo(x + 36, y - 10, x + 38, y)
    g.quadraticCurveTo(x + 30, y + 22, x, y + 34)
    g.quadraticCurveTo(x - 30, y + 22, x - 38, y)
    g.quadraticCurveTo(x - 36, y - 10, x, y - 34)
    g.fillStyle = (i + row) % 2 ? '#1f5a41' : '#286848'
    g.fill()
    gutta(g, 1.8)
  }
  g.restore()
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      blob(g, s * (70 + i * 108), 30 - (i === 2 ? 80 : 0) + i * 4, 12, 12)
      cell(g, '#e0a53a', 3)
    }
    soft(g, [[s * 380, 230], [s * 372, 80], [s * 400, 40], [s * 452, 36], [s * 478, 90], [s * 468, 230]])
    cell(g, '#2d7450', 5)
  }
  soft(g, [[-420, 190], [-200, 170], [0, 182], [200, 170], [420, 190], [430, 262], [-430, 262]])
  cell(g, '#2a6b4b', 5)
  g.restore()
  curtain(g, -1)
  curtain(g, 1)
  // Curtain rail, and the pendulum's bracket.
  g.beginPath()
  g.moveTo(MIDDLE - 178, 64)
  g.lineTo(MIDDLE + 178, 64)
  g.strokeStyle = GOLD_DARK
  g.lineWidth = 12
  g.lineCap = 'round'
  g.stroke()
  g.strokeStyle = GOLD
  g.lineWidth = 7
  g.stroke()
  blob(g, PENDULUM.pivot.x, PENDULUM.pivot.y, 20, 12)
  cell(g, '#a86a2c', 4)
  // Stools.
  for (const side of [0, 1] as const) {
    const p = toPoint(side, GUEST)
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(p.x + s * 46, 690)
      g.quadraticCurveTo(p.x + s * 86, 730, p.x + s * 64, 776)
      g.lineTo(p.x + s * 46, 776)
      g.quadraticCurveTo(p.x + s * 58, 730, p.x + s * 22, 690)
      cell(g, '#a86a2c', 4)
    }
    soft(g, [[p.x - 104, 668], [p.x, 654], [p.x + 104, 668], [p.x + 112, 692], [p.x + 92, 712], [p.x, 722], [p.x - 92, 712], [p.x - 112, 692]])
    cell(g, '#c4365c', 5)
    for (const s of [-1, 1]) {
      blob(g, p.x + s * 106, 704, 9, 12)
      cell(g, '#e0a53a', 3)
    }
  }
  // Salt in the wet dye: pale stars of it, sparse and soft.
  for (let i = 0; i < 520; i++) {
    const x = rng.next() * W, y = rng.next() * H, r = 1 + rng.next() * 2.6
    g.globalAlpha = 0.05 + rng.next() * 0.13
    g.fillStyle = '#e8fbff'
    blob(g, x, y, r, r * 0.8, rng.next() * 3)
    g.fill()
  }
  g.globalAlpha = 1
}

/** The low table in front of the aunts' skirts, and the plain cloth the things stand on. */
export function paintTable(g: G): void {
  g.save()
  g.translate(MIDDLE, TABLE_TOP)
  for (const s of [-1, 1]) {
    g.beginPath()
    g.moveTo(s * 220, 20)
    g.quadraticCurveTo(s * 262, 60, s * 232, 100)
    g.lineTo(s * 208, 100)
    g.quadraticCurveTo(s * 232, 60, s * 186, 20)
    cell(g, '#8a521c', 4)
  }
  soft(g, [[-300, -6], [-292, -22], [0, -30], [292, -22], [300, -6], [276, 28], [0, 38], [-276, 28]])
  cell(g, '#f6dfc0', 5)
  g.beginPath()
  g.moveTo(-284, 22)
  for (let i = 0; i < 8; i++) g.quadraticCurveTo(-248 + i * 71, 64, -213 + i * 71, 26)
  g.lineTo(284, 22)
  g.quadraticCurveTo(0, 44, -284, 22)
  cell(g, '#f2c9a2', 4)
  g.restore()
  for (let slot = 0; slot < 4; slot++) {
    const p = place(slot)
    g.globalAlpha = 0.2
    g.fillStyle = '#8a3b52'
    blob(g, p.x, TABLE_TOP - 8, 40, 8)
    g.fill()
  }
  g.globalAlpha = 1
}

/** The stretcher round the silk: wood, and a pin every little way. */
export function paintFrame(g: G): void {
  const { width: W, height: H } = STAGE
  g.fillStyle = '#5b2a4e'
  g.beginPath()
  g.rect(-400, -300, W + 800, H + 600)
  g.rect(10, 10, W - 20, H - 20)
  g.fill('evenodd')
  g.beginPath()
  g.rect(10, 10, W - 20, H - 20)
  g.strokeStyle = mix('#5b2a4e', '#000000', 0.35)
  g.lineWidth = 6
  g.stroke()
  const pin = (x: number, y: number) => {
    blob(g, x, y, 4.4, 4.4)
    g.fillStyle = '#e9d9b0'
    g.fill()
    blob(g, x - 1.2, y - 1.4, 1.5, 1.5)
    g.fillStyle = '#ffffff'
    g.fill()
  }
  for (let x = 40; x < W; x += 73) {
    pin(x, 6)
    pin(x, H - 6)
  }
  for (let y = 46; y < H; y += 73) {
    pin(6, y)
    pin(W - 6, y)
  }
}
