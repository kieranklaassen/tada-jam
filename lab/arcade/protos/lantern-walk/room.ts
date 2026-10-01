// The craft room: a lazured wall in late light, a doorway onto the dusk, and
// a wooden table. The backdrop is painted once; the things on the table are
// drawn each frame because the child moves them.

import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { blob, grain, hexRgb, leafDab, shapePath, soft, wobbly } from './art.ts'
import type { G, Kind, Rng } from './art.ts'
import { drawFlame } from './lantern.ts'

export const TABLE_Y = 430
export const DOOR = { x: 905, y: 46, w: 232, h: TABLE_Y - 46 }

const WALL = ['#f3caa0', '#f7dcb6', '#edb588', '#f5d3a6', '#f1c08f', '#f6cfae'].map(hexRgb)

export function paintRoom(g: G, scale: number, rng: Rng): void {
  // The wall: thin veils of apricot and rose, laid over each other.
  g.fillStyle = '#f2c79c'
  g.fillRect(0, 0, W, TABLE_Y)
  for (let i = 0; i < 170; i++) {
    blob(g, rng() * W, rng() * TABLE_Y, 60 + rng() * 170, WALL[Math.floor(rng() * WALL.length)]!, 0.1 + rng() * 0.12)
  }
  for (let i = 0; i < 16; i++) blob(g, rng() * W, rng() * 120, 120 + rng() * 120, [226, 150, 120], 0.07)
  grain(g, 0, 0, W, TABLE_Y, 5000, rng, 0.03, 0.05)

  // Late sun through a window we cannot see: a leaning patch with its bars.
  soft(g, 'rgba(255,240,196,0.62)', 16, scale, () => {
    g.beginPath()
    g.moveTo(96, 92)
    g.lineTo(452, 150)
    g.lineTo(452, 388)
    g.lineTo(96, 352)
    g.closePath()
  })
  soft(g, 'rgba(215,140,96,0.34)', 7, scale, () => {
    g.beginPath()
    g.moveTo(262, 112)
    g.lineTo(282, 115)
    g.lineTo(282, 376)
    g.lineTo(262, 372)
    g.closePath()
  })
  soft(g, 'rgba(215,140,96,0.34)', 7, scale, () => {
    g.beginPath()
    g.moveTo(96, 214)
    g.lineTo(452, 258)
    g.lineTo(452, 276)
    g.lineTo(96, 232)
    g.closePath()
  })
  // Leaf shadows from the tree outside.
  for (let i = 0; i < 22; i++) {
    const x = 110 + rng() * 330
    const y = 120 + rng() * 110
    soft(g, 'rgba(200,128,90,0.2)', 6, scale, () => {
      g.beginPath()
      g.ellipse(x, y, 10 + rng() * 14, 5 + rng() * 6, rng() * 3, 0, TAU)
    })
  }

  // A garland of pressed leaves on a thread.
  g.strokeStyle = 'rgba(120,80,50,0.7)'
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(40, 30)
  g.quadraticCurveTo(300, 92, 560, 34)
  g.stroke()
  const garland = ['#d9772b', '#c2452d', '#e3a43a', '#b0602a', '#e8c25a', '#a13e2c']
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9
    const x = 40 + 520 * t
    const y = (1 - t) * (1 - t) * 30 + 2 * (1 - t) * t * 92 + t * t * 34
    g.strokeStyle = 'rgba(120,80,50,0.6)'
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + 2, y + 10)
    g.stroke()
    leafDab(g, x + 3, y + 26, 17, Math.PI / 2 + (rng() - 0.5) * 0.7, garland[i % garland.length]!, 'rgba(90,40,20,0.45)')
  }

  paintShelf(g, scale, rng)
  paintDoorway(g, scale, rng)

  // The table: honey-coloured planks running across, seen from where we sit.
  const top = g.createLinearGradient(0, TABLE_Y, 0, H)
  top.addColorStop(0, '#d6a268')
  top.addColorStop(1, '#b98048')
  g.fillStyle = top
  g.fillRect(0, TABLE_Y, W, H - TABLE_Y)
  const seams = [TABLE_Y, TABLE_Y + 88, TABLE_Y + 190, TABLE_Y + 300, H + 10]
  for (let p = 0; p < seams.length - 1; p++) {
    const y0 = seams[p]!
    const y1 = seams[p + 1]!
    g.fillStyle = `rgba(${p % 2 === 0 ? '255,225,170' : '120,70,30'},${0.05 + rng() * 0.04})`
    g.fillRect(0, y0, W, y1 - y0)
    for (let i = 0; i < 16; i++) {
      const y = y0 + 5 + rng() * (y1 - y0 - 10)
      const phase = rng() * 9
      const amp = 1.5 + rng() * 3.5
      g.beginPath()
      for (let x = -10; x <= W + 10; x += 30) {
        const yy = y + Math.sin(x * 0.006 + phase) * amp + Math.sin(x * 0.021 + phase * 2) * amp * 0.4
        if (x === -10) g.moveTo(x, yy)
        else g.lineTo(x, yy)
      }
      g.strokeStyle = `rgba(120,68,28,${0.07 + rng() * 0.1})`
      g.lineWidth = 0.8 + rng() * 1.6
      g.stroke()
    }
    if (p > 0) {
      g.strokeStyle = 'rgba(96,54,24,0.5)'
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(0, y0)
      g.lineTo(W, y0 + (rng() - 0.5) * 3)
      g.stroke()
      g.strokeStyle = 'rgba(255,230,180,0.25)'
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(0, y0 + 2.2)
      g.lineTo(W, y0 + 2.2)
      g.stroke()
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = 60 + rng() * (W - 120)
    const y = TABLE_Y + 30 + rng() * (H - TABLE_Y - 60)
    for (let r = 3; r > 0; r--) {
      g.beginPath()
      g.ellipse(x, y, r * 7, r * 3.4, 0.05, 0, TAU)
      g.strokeStyle = `rgba(100,56,24,${0.12 + (3 - r) * 0.06})`
      g.lineWidth = 1.5
      g.stroke()
    }
    g.beginPath()
    g.ellipse(x, y, 4.5, 2.4, 0.05, 0, TAU)
    g.fillStyle = 'rgba(90,50,22,0.4)'
    g.fill()
  }
  grain(g, 0, TABLE_Y, W, H - TABLE_Y, 5000, rng, 0.04, 0.05)
  // The same sun lies across the table.
  soft(g, 'rgba(255,236,188,0.2)', 40, scale, () => {
    g.beginPath()
    g.moveTo(40, TABLE_Y)
    g.lineTo(560, TABLE_Y)
    g.lineTo(900, H)
    g.lineTo(200, H)
    g.closePath()
  })
  // Where the table meets the wall.
  soft(g, 'rgba(120,64,34,0.34)', 9, scale, () => {
    g.beginPath()
    g.rect(0, TABLE_Y - 9, W, 9)
  })
  g.fillStyle = '#e9c089'
  g.fillRect(0, TABLE_Y - 1.5, W, 4)
  g.fillStyle = 'rgba(100,56,26,0.45)'
  g.fillRect(0, TABLE_Y - 3, W, 1.8)
  // Corners fall away a little, like a page.
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]] as const) blob(g, x, y, 380, [92, 48, 30], 0.2)
}

function paintShelf(g: G, scale: number, rng: Rng): void {
  const y = 182
  soft(g, 'rgba(120,64,34,0.3)', 10, scale, () => {
    g.beginPath()
    g.rect(556, y + 12, 292, 12)
  })
  // The things on it first, then the plank's front edge over their feet.
  // A jar of brushes: the paper was painted here.
  g.fillStyle = 'rgba(214,232,232,0.6)'
  g.strokeStyle = 'rgba(110,140,150,0.75)'
  g.lineWidth = 2
  g.beginPath()
  g.roundRect(580, y - 62, 46, 62, 7)
  g.fill()
  g.stroke()
  g.fillStyle = 'rgba(190,150,200,0.35)'
  g.fillRect(583, y - 26, 40, 24)
  const tips = ['#c8452f', '#e8b83a', '#4a66a8']
  for (let i = 0; i < 3; i++) {
    const bx = 592 + i * 11
    const lean = (i - 1) * 9
    g.strokeStyle = '#b98654'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(bx, y - 12)
    g.lineTo(bx + lean, y - 104)
    g.stroke()
    g.strokeStyle = tips[i]!
    g.lineWidth = 6
    g.beginPath()
    g.moveTo(bx + lean, y - 104)
    g.lineTo(bx + lean * 1.16, y - 120)
    g.stroke()
  }
  // A little felt gnome.
  g.fillStyle = '#c4553b'
  g.beginPath()
  g.moveTo(684, y)
  g.quadraticCurveTo(680, y - 46, 703, y - 50)
  g.quadraticCurveTo(726, y - 46, 722, y)
  g.closePath()
  g.fill()
  g.fillStyle = '#f0d0aa'
  g.beginPath()
  g.arc(703, y - 56, 13, 0, TAU)
  g.fill()
  g.fillStyle = '#496f52'
  g.beginPath()
  g.moveTo(687, y - 60)
  g.quadraticCurveTo(700, y - 78, 712, y - 100)
  g.quadraticCurveTo(716, y - 76, 720, y - 60)
  g.quadraticCurveTo(703, y - 68, 687, y - 60)
  g.fill()
  g.fillStyle = '#4a3528'
  g.beginPath()
  g.arc(698.5, y - 54, 1.5, 0, TAU)
  g.arc(707.5, y - 54, 1.5, 0, TAU)
  g.fill()
  // A basket of wool.
  const wool = ['#d98a8a', '#e8c15a', '#8fae8a', '#b79ac8']
  for (let i = 0; i < 4; i++) {
    const wx = 772 + i * 15 + (i % 2) * 3
    const wy = y - 34 - (i % 2) * 9
    wobbly(g, wx, wy, 13, 13, rng, 0.06)
    g.fillStyle = wool[i]!
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.3)'
    g.lineWidth = 1.2
    for (let k = 0; k < 3; k++) {
      g.beginPath()
      g.arc(wx, wy, 4 + k * 3.4, 0.4 + k, 2.6 + k)
      g.stroke()
    }
  }
  g.fillStyle = '#b98a52'
  g.beginPath()
  g.moveTo(756, y - 30)
  g.lineTo(838, y - 30)
  g.lineTo(830, y)
  g.lineTo(764, y)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(110,70,34,0.5)'
  g.lineWidth = 1.6
  for (let i = 0; i < 4; i++) {
    g.beginPath()
    g.moveTo(758 + i, y - 24 + i * 7)
    g.lineTo(836 - i, y - 24 + i * 7)
    g.stroke()
  }
  for (let i = 0; i < 7; i++) {
    g.beginPath()
    g.moveTo(766 + i * 11, y - 30)
    g.lineTo(769 + i * 10, y)
    g.stroke()
  }
  // The plank and its brackets.
  const plank = g.createLinearGradient(0, y, 0, y + 15)
  plank.addColorStop(0, '#c9935a')
  plank.addColorStop(1, '#9d6a3c')
  g.fillStyle = plank
  g.beginPath()
  g.roundRect(548, y, 304, 15, 3)
  g.fill()
  g.fillStyle = '#8d5c33'
  for (const bx of [584, 806]) {
    g.beginPath()
    g.moveTo(bx, y + 15)
    g.lineTo(bx + 12, y + 15)
    g.lineTo(bx + 12, y + 24)
    g.quadraticCurveTo(bx + 4, y + 44, bx, y + 48)
    g.closePath()
    g.fill()
  }
}

function paintDoorway(g: G, scale: number, rng: Rng): void {
  const { x, y, w, h } = DOOR
  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  const sky = g.createLinearGradient(0, y, 0, y + h * 0.82)
  sky.addColorStop(0, '#4d4688')
  sky.addColorStop(0.45, '#a26490')
  sky.addColorStop(0.8, '#ea9a72')
  sky.addColorStop(1, '#f7c680')
  g.fillStyle = sky
  g.fillRect(x, y, w, h)
  for (let i = 0; i < 14; i++) blob(g, x + rng() * w, y + 120 + rng() * 120, 30 + rng() * 60, [246, 170, 130], 0.14)
  for (let i = 0; i < 5; i++) {
    g.fillStyle = 'rgba(255,246,220,0.75)'
    g.beginPath()
    g.arc(x + 20 + rng() * (w - 40), y + 14 + rng() * 70, 1 + rng() * 0.8, 0, TAU)
    g.fill()
  }
  // The far hill, the near hill, and the path that leaves the door.
  const ridge = (base: number, amp: number, phase: number, fill: string) => {
    g.beginPath()
    g.moveTo(x - 5, y + h + 5)
    for (let px = x - 5; px <= x + w + 5; px += 12) {
      g.lineTo(px, y + base + Math.sin(px * 0.021 + phase) * amp + Math.sin(px * 0.052 + phase * 2) * amp * 0.3)
    }
    g.lineTo(x + w + 5, y + h + 5)
    g.closePath()
    g.fillStyle = fill
    g.fill()
  }
  ridge(238, 13, 0.6, '#6a5a94')
  ridge(270, 10, 2.4, '#463e74')
  ridge(314, 6, 4.1, '#2f2b55')
  g.beginPath()
  g.moveTo(x + 70, y + h + 4)
  g.quadraticCurveTo(x + 100, y + 340, x + 138, y + 316)
  g.quadraticCurveTo(x + 150, y + 330, x + 176, y + h + 4)
  g.closePath()
  g.fillStyle = 'rgba(150,128,160,0.5)'
  g.fill()
  // Trees either side of the path.
  g.fillStyle = '#25223f'
  for (const [tx, tw, lean] of [[x + 14, 30, 6], [x + w - 34, 38, -8], [x + 62, 12, 3]] as const) {
    g.beginPath()
    g.moveTo(tx - tw * 0.2, y + h + 4)
    g.quadraticCurveTo(tx + lean * 0.4, y + 200, tx + lean, y - 6)
    g.lineTo(tx + lean + tw * 0.72, y - 6)
    g.quadraticCurveTo(tx + tw + lean * 0.4, y + 200, tx + tw * 1.2, y + h + 4)
    g.closePath()
    g.fill()
  }
  g.strokeStyle = '#25223f'
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(x + 30, y + 130)
  g.quadraticCurveTo(x + 70, y + 96, x + 112, y + 104)
  g.moveTo(x + w - 20, y + 170)
  g.quadraticCurveTo(x + w - 70, y + 120, x + w - 106, y + 126)
  g.stroke()
  for (let i = 0; i < 26; i++) {
    const left = rng() < 0.5
    const lx = left ? x + 20 + rng() * 100 : x + w - 20 - rng() * 100
    const ly = y + 4 + rng() * 120
    leafDab(g, lx, ly, 6 + rng() * 5, rng() * 6, ['#3a2f55', '#5a3550', '#7a4048'][Math.floor(rng() * 3)]!)
  }
  // The depth of the wall on the left of the opening.
  const jamb = g.createLinearGradient(x, 0, x + 18, 0)
  jamb.addColorStop(0, 'rgba(40,24,30,0.55)')
  jamb.addColorStop(1, 'rgba(40,24,30,0)')
  g.fillStyle = jamb
  g.fillRect(x, y, 18, h)
  g.restore()
  // The frame: three worn boards.
  const board = (bx: number, by: number, bw: number, bh: number) => {
    const grad = g.createLinearGradient(bx, by, bx + (bw < bh ? bw : 0), by + (bw < bh ? 0 : bh))
    grad.addColorStop(0, '#a36f43')
    grad.addColorStop(0.5, '#8c5c36')
    grad.addColorStop(1, '#74492a')
    g.fillStyle = grad
    g.beginPath()
    g.roundRect(bx, by, bw, bh, 3)
    g.fill()
    g.strokeStyle = 'rgba(60,34,18,0.25)'
    g.lineWidth = 1
    for (let i = 0; i < 4; i++) {
      g.beginPath()
      if (bw < bh) {
        const lx = bx + 4 + rng() * (bw - 8)
        g.moveTo(lx, by + 4)
        g.lineTo(lx + (rng() - 0.5) * 3, by + bh - 4)
      } else {
        const ly = by + 4 + rng() * (bh - 8)
        g.moveTo(bx + 4, ly)
        g.lineTo(bx + bw - 4, ly + (rng() - 0.5) * 3)
      }
      g.stroke()
    }
  }
  soft(g, 'rgba(110,60,34,0.3)', 10, scale, () => {
    g.beginPath()
    g.rect(x - 26, y - 22, w + 52, h + 22)
  })
  g.save()
  g.beginPath()
  g.rect(0, 0, W, TABLE_Y - 2)
  g.clip()
  board(x - 22, y - 4, 22, h + 8)
  board(x + w, y - 4, 22, h + 8)
  board(x - 30, y - 26, w + 60, 26)
  g.restore()
}

// Other children's lanterns, far off on the hill, seen through the doorway.
export function drawDoorLanterns(g: G, time: number): void {
  for (let i = 0; i < 6; i++) {
    const x = DOOR.x + 58 + i * 19 + Math.sin(time * 0.11 + i) * 3
    const y = DOOR.y + 262 - i * 2.4 + Math.sin(time * 1.5 + i * 1.9) * 1.6
    g.fillStyle = 'rgba(255,190,90,0.22)'
    g.beginPath()
    g.arc(x, y, 7, 0, TAU)
    g.fill()
    g.fillStyle = '#ffd98a'
    g.beginPath()
    g.arc(x, y, 2.2, 0, TAU)
    g.fill()
  }
}

// A pair of scissors, pivot at (x, y), blades pointing along `rot`. `open` is
// the angle between the blades.
export function drawScissors(g: G, x: number, y: number, rot: number, open: number, lift: number): void {
  const piece = (side: number, shadow: boolean) => {
    g.save()
    g.rotate((side * open) / 2)
    g.strokeStyle = shadow ? 'rgba(60,30,10,0.2)' : '#b8442e'
    g.lineWidth = 8
    g.beginPath()
    g.moveTo(-6, 0)
    g.quadraticCurveTo(-26, side * 5, -40, side * 15)
    g.stroke()
    g.beginPath()
    g.ellipse(-64, side * 25, 25, 13, side * 0.36, 0, TAU)
    g.stroke()
    if (!shadow) {
      g.strokeStyle = 'rgba(255,200,170,0.5)'
      g.lineWidth = 2
      g.beginPath()
      g.ellipse(-64, side * 25, 25, 13, side * 0.36, Math.PI * 1.1, Math.PI * 1.6)
      g.stroke()
    }
    g.beginPath()
    g.moveTo(-12, -side * 1.5)
    g.lineTo(-5, side * 8)
    g.lineTo(98, side * 0.6)
    g.lineTo(94, -side * 1.6)
    g.closePath()
    if (shadow) {
      g.fillStyle = 'rgba(60,30,10,0.2)'
      g.fill()
    } else {
      const steel = g.createLinearGradient(0, -8, 0, 8)
      steel.addColorStop(0, side > 0 ? '#eef0f1' : '#b9bdc3')
      steel.addColorStop(1, side > 0 ? '#b3b8be' : '#e6e8ea')
      g.fillStyle = steel
      g.fill()
      g.strokeStyle = 'rgba(90,96,104,0.7)'
      g.lineWidth = 1.2
      g.stroke()
    }
    g.restore()
  }
  g.save()
  g.translate(x + 3 + lift * 5, y + 5 + lift * 9)
  g.rotate(rot)
  piece(1, true)
  piece(-1, true)
  g.restore()
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  piece(-1, false)
  piece(1, false)
  g.beginPath()
  g.arc(0, 0, 4.2, 0, TAU)
  g.fillStyle = '#e4dfd2'
  g.fill()
  g.strokeStyle = 'rgba(90,96,104,0.8)'
  g.lineWidth = 1.2
  g.stroke()
  g.restore()
}

// A card stencil showing which shape the scissors will cut.
export function drawCard(g: G, x: number, y: number, kind: Kind, lift: number, pop: number, rot: number): void {
  g.save()
  g.translate(x + 2 + lift * 5, y + 4 + lift * 8)
  g.rotate(rot)
  g.fillStyle = `rgba(60,30,10,${0.24 - lift * 0.08})`
  g.beginPath()
  g.roundRect(-47, -47, 94, 94, 9)
  g.fill()
  g.restore()
  g.save()
  g.translate(x, y - lift * 7)
  g.rotate(rot)
  g.scale(pop * (1 + lift * 0.06), pop * (1 + lift * 0.06))
  g.fillStyle = lift > 0.5 ? '#f3e2ba' : '#e6d0a2'
  g.strokeStyle = '#c4a271'
  g.lineWidth = 2
  g.beginPath()
  g.roundRect(-46, -46, 92, 92, 9)
  g.fill()
  g.stroke()
  // The cut-out: the table shows through, a shade darker under the card.
  if (kind === 'moon') g.rotate(-0.35)
  shapePath(g, kind, 27)
  g.fillStyle = '#93602f'
  g.fill()
  g.save()
  g.clip()
  g.strokeStyle = 'rgba(50,24,8,0.4)'
  g.lineWidth = 6
  g.translate(2, 3)
  shapePath(g, kind, 27)
  g.stroke()
  g.restore()
  g.strokeStyle = 'rgba(110,80,50,0.7)'
  g.lineWidth = 1.5
  shapePath(g, kind, 27)
  g.stroke()
  g.restore()
}

export function drawMatchbox(g: G, x: number, y: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(-0.12)
  g.fillStyle = 'rgba(60,30,10,0.22)'
  g.beginPath()
  g.roundRect(-44, -24, 96, 62, 6)
  g.fill()
  // The striking strip along the near side, then the drawer's blue sleeve.
  g.fillStyle = '#5a3d2c'
  g.beginPath()
  g.roundRect(-46, -30, 92, 60, 5)
  g.fill()
  g.fillStyle = 'rgba(210,180,150,0.25)'
  for (let i = 0; i < 26; i++) g.fillRect(-42 + ((i * 37) % 84), 20 + ((i * 13) % 8), 1.6, 1.6)
  g.fillStyle = '#42648f'
  g.beginPath()
  g.roundRect(-46, -30, 92, 48, 5)
  g.fill()
  g.fillStyle = '#f2e3be'
  g.beginPath()
  g.roundRect(-34, -23, 68, 34, 4)
  g.fill()
  // A small drawn flame, so the box says what it is without a word.
  g.beginPath()
  g.moveTo(0, 6)
  g.bezierCurveTo(-11, 0, -4, -11, 1, -19)
  g.bezierCurveTo(5, -11, 11, 0, 0, 6)
  g.fillStyle = '#e8873a'
  g.fill()
  g.beginPath()
  g.ellipse(0.5, -1, 3, 5, 0, 0, TAU)
  g.fillStyle = '#f9d77a'
  g.fill()
  g.restore()
}

// A match with its head at (x, y); `rot` points from the head down the stick.
// state: 0 fresh, 1 burning, 2 spent.
export function drawMatch(g: G, x: number, y: number, rot: number, state: number, flick: number, shadow: boolean): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  if (shadow) {
    g.strokeStyle = 'rgba(60,30,10,0.2)'
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(3, 4)
    g.lineTo(69, 4)
    g.stroke()
  }
  g.strokeStyle = '#ead4a2'
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(2, 0)
  g.lineTo(68, 0)
  g.stroke()
  if (state === 2) {
    g.strokeStyle = '#3a2d26'
    g.beginPath()
    g.moveTo(2, 0)
    g.lineTo(24, 0)
    g.stroke()
  }
  g.beginPath()
  g.ellipse(0, 0, 7, 5.5, 0, 0, TAU)
  g.fillStyle = state === 0 ? '#b5402c' : '#2c2320'
  g.fill()
  g.restore()
  if (state === 1) drawFlame(g, x, y - 2, 0.95, flick)
}

// The hazel stick, from its hooked tip (ax, ay) to the hand end (bx, by).
export function drawStick(g: G, ax: number, ay: number, bx: number, by: number, width: number, shadow: number): void {
  if (shadow > 0) {
    g.strokeStyle = 'rgba(60,30,10,0.2)'
    g.lineWidth = width
    g.beginPath()
    g.moveTo(ax + shadow * 0.4, ay + shadow)
    g.lineTo(bx + shadow * 0.4, by + shadow)
    g.stroke()
  }
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  // A slight natural bend.
  const mx = (ax + bx) / 2 + nx * len * 0.025
  const my = (ay + by) / 2 + ny * len * 0.025
  g.strokeStyle = '#74502f'
  g.lineWidth = width
  g.beginPath()
  g.moveTo(ax, ay)
  g.quadraticCurveTo(mx, my, bx, by)
  g.stroke()
  g.strokeStyle = 'rgba(190,146,96,0.75)'
  g.lineWidth = width * 0.3
  g.beginPath()
  g.moveTo(ax + nx * width * 0.2, ay + ny * width * 0.2)
  g.quadraticCurveTo(mx + nx * width * 0.2, my + ny * width * 0.2, bx + nx * width * 0.2, by + ny * width * 0.2)
  g.stroke()
  // Knots where twigs were trimmed off.
  g.fillStyle = '#5c3e24'
  for (const t of [0.34, 0.63]) {
    g.beginPath()
    g.arc(ax + dx * t - nx * width * 0.42, ay + dy * t - ny * width * 0.42, width * 0.28, 0, TAU)
    g.fill()
  }
  // A notch and a twist of wire at the tip to hang the lantern from.
  g.strokeStyle = '#4b3a30'
  g.lineWidth = Math.max(1.6, width * 0.26)
  g.beginPath()
  g.arc(ax, ay + width * 0.9, width * 0.75, -Math.PI * 0.5, Math.PI * 0.9)
  g.stroke()
}

// A slow four-point glint: the material inviting, instead of a pointing hand.
export function drawGlint(g: G, x: number, y: number, size: number, alpha: number): void {
  if (alpha <= 0.01) return
  g.save()
  g.translate(x, y)
  g.globalAlpha = alpha
  g.fillStyle = '#fffbe6'
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const r = i % 2 === 0 ? size : size * 0.2
    if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  g.closePath()
  g.fill()
  g.globalAlpha = alpha * 0.35
  g.beginPath()
  g.arc(0, 0, size * 0.75, 0, TAU)
  g.fill()
  g.restore()
}

// A scrap of the painted paper, lying where it fell.
export function drawScrap(g: G, x: number, y: number, kind: Kind, rot: number, scaleY: number, fill: string, lift: number): void {
  g.save()
  g.translate(x + 1.5 + lift * 0.1, y + 2.5 + lift * 0.25)
  g.rotate(rot)
  g.scale(1, scaleY)
  shapePath(g, kind, 30)
  g.fillStyle = 'rgba(60,30,10,0.2)'
  g.fill()
  g.restore()
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(1, scaleY)
  shapePath(g, kind, 30)
  g.fillStyle = fill
  g.fill()
  g.strokeStyle = 'rgba(255,248,230,0.55)'
  g.lineWidth = 1.4
  g.stroke()
  g.restore()
}
