// Home: the room with the nature table, the cloth of the season, the view
// from the window, the candle, the basket and the wooden wheel of the year.

import { TAU, dot, fillBlob, fillLeaf, makeSprite, mix, oval, rgba, rng, softSpot, strokeLine, washLayer, wobblyRect } from './paint.ts'
import type { G, Sprite } from './paint.ts'
import { FOLIAGE } from './seasons.ts'
import type { Palette, Season } from './seasons.ts'

export const WIN = { x: 330, y: 80, w: 360, h: 320 }
// Where a thing may rest on the cloth, and on the sill.
export const TABLE = { x0: 208, x1: 788, y0: 516, y1: 640 }
export const SILL = { x0: 345, x1: 675, y: 408 }
export const CANDLE = { x: 262, y: 556 }
export const BASKET_HOME = { x: 905, y: 528, s: 0.9 }
export const PEG = { x: 925, y: 198 }
export const BOX = { x: 128, y: 600 }
export const DOORWAY = { x: 1036, y: 46, bottom: 746 }

export function makeHomeBg(): Sprite {
  return makeSprite(1180, 820, 0, 0, 1.5, (g) => {
    const r = rng(77)
    // Lazured wall: thin warm washes over cream.
    g.fillStyle = '#f4e1c1'
    g.fillRect(0, 0, 1180, 820)
    const washes = ['#f3c9a2', '#f6d6b8', '#f8e9c0', '#efc4b0', '#fbf0d6']
    washLayer(g, 0, 0, 1180, 820, (wg) => {
      for (let i = 0; i < 52; i++) softSpot(wg, r() * 1180, r() * 760, 90 + r() * 220, washes[i % washes.length], 0.2 + r() * 0.2)
      softSpot(wg, 540, 480, 320, '#fff6d6', 0.45)
      softSpot(wg, 1010, 420, 260, '#fff6d6', 0.4)
    }, 0.25)

    // Floor and skirting.
    g.fillStyle = '#b07d4f'
    g.fillRect(0, 746, 1180, 74)
    g.save()
    g.beginPath()
    g.rect(0, 746, 1180, 74)
    g.clip()
    washLayer(g, 0, 660, 1180, 160, (wg) => {
      for (let i = 0; i < 16; i++) softSpot(wg, r() * 1180, 760 + r() * 60, 60 + r() * 90, i % 2 ? '#c39160' : '#96673d', 0.3)
    })
    g.restore()
    g.strokeStyle = rgba('#7c5330', 0.5)
    g.lineWidth = 2
    for (const y of [771, 797]) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(1180, y)
      g.stroke()
    }
    for (let i = 0; i < 9; i++) {
      const x = 60 + i * 140 + r() * 40
      g.beginPath()
      g.moveTo(x, i % 2 ? 746 : 771)
      g.lineTo(x, i % 2 ? 771 : 797)
      g.stroke()
    }
    g.fillStyle = '#cfa06a'
    g.fillRect(0, 734, 1180, 13)
    g.fillStyle = rgba('#8a5f3a', 0.4)
    g.fillRect(0, 745, 1180, 2)

    // The two ways out: the window and the door stay clear for the season.
    g.clearRect(WIN.x, WIN.y, WIN.w, WIN.h)
    g.clearRect(DOORWAY.x, DOORWAY.y, 1180 - DOORWAY.x, DOORWAY.bottom - DOORWAY.y)

    // Door frame.
    g.fillStyle = '#9a6c44'
    wobblyRect(g, DOORWAY.x - 18, 26, 18, 722, r, 1.5)
    g.fill()
    wobblyRect(g, DOORWAY.x - 18, 26, 170, 20, r, 1.5)
    g.fill()
    g.fillStyle = '#b9ab95'
    g.fillRect(DOORWAY.x, DOORWAY.bottom - 4, 150, 12)

    // Window frame, mullions, sill.
    const wood = '#b98858'
    g.fillStyle = wood
    wobblyRect(g, WIN.x - 17, WIN.y - 17, WIN.w + 34, 18, r, 1.5)
    g.fill()
    wobblyRect(g, WIN.x - 17, WIN.y - 4, 18, WIN.h + 8, r, 1.5)
    g.fill()
    wobblyRect(g, WIN.x + WIN.w - 1, WIN.y - 4, 18, WIN.h + 8, r, 1.5)
    g.fill()
    g.fillRect(WIN.x + WIN.w / 2 - 5, WIN.y, 10, WIN.h)
    g.fillRect(WIN.x, WIN.y + WIN.h * 0.44 - 5, WIN.w, 10)
    g.fillStyle = rgba('#ffffff', 0.25)
    g.fillRect(WIN.x + WIN.w / 2 - 5, WIN.y, 3, WIN.h)
    g.fillRect(WIN.x, WIN.y + WIN.h * 0.44 - 5, WIN.w, 3)
    g.fillStyle = '#dcb27e'
    wobblyRect(g, WIN.x - 28, WIN.y + WIN.h, WIN.w + 56, 15, r, 1.5)
    g.fill()
    g.fillStyle = wood
    wobblyRect(g, WIN.x - 28, WIN.y + WIN.h + 14, WIN.w + 56, 9, r, 1)
    g.fill()
    g.fillStyle = 'rgba(80,50,30,0.12)'
    g.fillRect(WIN.x - 22, WIN.y + WIN.h + 23, WIN.w + 44, 8)

    // Linen curtains on a wooden rod.
    strokeLine(g, [WIN.x - 60, WIN.y - 34, WIN.x + WIN.w + 60, WIN.y - 34], '#8a5f3a', 7)
    dot(g, WIN.x - 62, WIN.y - 34, 8, '#8a5f3a')
    dot(g, WIN.x + WIN.w + 62, WIN.y - 34, 8, '#8a5f3a')
    for (const s of [-1, 1]) {
      const ox = s < 0 ? WIN.x - 44 : WIN.x + WIN.w + 44
      g.beginPath()
      g.moveTo(ox, WIN.y - 32)
      g.lineTo(ox - s * 96, WIN.y - 32)
      g.quadraticCurveTo(ox - s * 88, WIN.y + 120, ox - s * 26, WIN.y + 196)
      g.quadraticCurveTo(ox - s * 54, WIN.y + 260, ox - s * 62, WIN.y + WIN.h + 4)
      g.lineTo(ox + s * 2, WIN.y + WIN.h + 6)
      g.closePath()
      g.fillStyle = '#fbf4e4'
      g.fill()
      g.strokeStyle = rgba('#d9c7a4', 0.8)
      g.lineWidth = 2.4
      for (let k = 0; k < 5; k++) {
        g.beginPath()
        g.moveTo(ox - s * (10 + k * 18), WIN.y - 30)
        g.quadraticCurveTo(ox - s * (8 + k * 15), WIN.y + 110, ox - s * (8 + k * 5), WIN.y + 194)
        g.stroke()
      }
      for (let k = 0; k < 3; k++) {
        g.beginPath()
        g.moveTo(ox - s * (10 + k * 6), WIN.y + 200)
        g.quadraticCurveTo(ox - s * (14 + k * 14), WIN.y + 260, ox - s * (10 + k * 22), WIN.y + WIN.h + 2)
        g.stroke()
      }
      strokeLine(g, [ox - s * 4, WIN.y + 190, ox - s * 30, WIN.y + 198], '#c8452f', 6)
    }

    // The peg rail, with the red cap hung up. The last peg is the basket's.
    wobblyRect(g, PEG.x - 168, PEG.y - 9, 236, 17, r, 1.5)
    g.fillStyle = wood
    g.fill()
    for (const dx of [-138, -69, 0]) {
      dot(g, PEG.x + dx, PEG.y + 1, 8.5, '#8a5f3a')
      dot(g, PEG.x + dx - 2, PEG.y - 1, 3.4, '#b98858')
    }
    const cx = PEG.x - 138
    g.beginPath()
    g.moveTo(cx, PEG.y - 2)
    g.quadraticCurveTo(cx - 32, PEG.y + 30, cx - 26, PEG.y + 62)
    g.quadraticCurveTo(cx, PEG.y + 70, cx + 24, PEG.y + 60)
    g.quadraticCurveTo(cx + 26, PEG.y + 28, cx, PEG.y - 2)
    g.fillStyle = '#c8452f'
    g.fill()
    g.globalAlpha = 0.25
    strokeLine(g, [cx - 24, PEG.y + 58, cx, PEG.y + 65, cx + 22, PEG.y + 57], '#7a2418', 4)
    g.globalAlpha = 1

    // The low table.
    washLayer(g, 100, 300, 860, 520, (wg) => softSpot(wg, 530, 720, 420, '#6b4a2c', 0.25), 0.25)
    g.fillStyle = '#a67746'
    wobblyRect(g, 62, 682, 36, 132, r, 2)
    g.fill()
    wobblyRect(g, 968, 682, 36, 132, r, 2)
    g.fill()
    g.fillStyle = 'rgba(40,25,15,0.2)'
    g.fillRect(62, 684, 36, 14)
    g.fillRect(968, 684, 36, 14)
    g.beginPath()
    g.moveTo(70, 498)
    g.lineTo(1000, 498)
    g.lineTo(1024, 650)
    g.lineTo(44, 650)
    g.closePath()
    g.fillStyle = '#cfa06a'
    g.fill()
    g.save()
    g.clip()
    washLayer(g, 40, 496, 990, 156, (wg) => {
      for (let i = 0; i < 14; i++) softSpot(wg, 44 + r() * 980, 500 + r() * 150, 60 + r() * 120, i % 2 ? '#dcb27e' : '#b98a55', 0.35)
    })
    g.strokeStyle = rgba('#a87a48', 0.45)
    g.lineWidth = 1.6
    for (let i = 0; i < 22; i++) {
      const y = 503 + i * 6.8
      g.beginPath()
      g.moveTo(40, y)
      g.bezierCurveTo(300, y + (r() - 0.5) * 8, 700, y + (r() - 0.5) * 8, 1030, y + (r() - 0.5) * 5)
      g.stroke()
    }
    g.restore()
    g.fillStyle = '#b3824f'
    wobblyRect(g, 44, 650, 980, 36, r, 1.5)
    g.fill()
    g.fillStyle = rgba('#ffffff', 0.18)
    g.fillRect(44, 650, 980, 3)
    g.fillStyle = rgba('#5a3a1e', 0.28)
    g.fillRect(46, 680, 976, 6)

    // The keeping box at the left end, its lid leaning on the wall.
    g.beginPath()
    g.moveTo(BOX.x - 50, BOX.y - 30)
    g.lineTo(BOX.x - 44, BOX.y - 92)
    g.lineTo(BOX.x + 50, BOX.y - 98)
    g.lineTo(BOX.x + 52, BOX.y - 34)
    g.closePath()
    g.fillStyle = '#d2a56e'
    g.fill()
    g.strokeStyle = rgba('#8a5f3a', 0.6)
    g.lineWidth = 2
    g.stroke()
    fillLeaf(g, BOX.x - 18, BOX.y - 60, 36, 13, -0.3, rgba('#8a5f3a', 0.45))
    g.globalAlpha = 0.25
    oval(g, BOX.x + 4, BOX.y + 34, 60, 9, '#3a2414')
    g.globalAlpha = 1
    wobblyRect(g, BOX.x - 50, BOX.y - 34, 100, 66, r, 1.5)
    g.fillStyle = '#c08f5a'
    g.fill()
    g.beginPath()
    g.moveTo(BOX.x - 50, BOX.y - 34)
    g.lineTo(BOX.x - 40, BOX.y - 48)
    g.lineTo(BOX.x + 42, BOX.y - 48)
    g.lineTo(BOX.x + 50, BOX.y - 34)
    g.closePath()
    g.fillStyle = '#6e4a2c'
    g.fill()
    g.strokeStyle = rgba('#8a5f3a', 0.55)
    g.lineWidth = 1.6
    for (let k = 0; k < 4; k++) {
      g.beginPath()
      g.moveTo(BOX.x - 46, BOX.y - 22 + k * 14)
      g.bezierCurveTo(BOX.x - 10, BOX.y - 20 + k * 14 + r() * 3, BOX.x + 20, BOX.y - 24 + k * 14, BOX.x + 46, BOX.y - 22 + k * 14)
      g.stroke()
    }
    dot(g, BOX.x, BOX.y - 4, 4.5, '#8a5f3a')
  })
}

// The silk cloth on the table. Painted in room coordinates, placed at (0, 0).
export function makeCloth(pal: Palette): Sprite {
  return makeSprite(700, 250, -150, -480, 1.5, (g) => {
    const r = rng(83)
    const [base, shade, light] = pal.cloth
    const hem = (x: number) => 695 + 9 * Math.sin(x * 0.045) + 5 * Math.sin(x * 0.11 + 1)
    const shape = () => {
      g.beginPath()
      g.moveTo(203, 505)
      g.quadraticCurveTo(500, 500, 794, 505)
      g.lineTo(816, 650)
      g.quadraticCurveTo(821, 672, 812, hem(812))
      for (let x = 800; x >= 184; x -= 12) g.lineTo(x, hem(x))
      g.quadraticCurveTo(177, 672, 182, 650)
      g.closePath()
    }
    g.globalAlpha = 0.22
    g.fillStyle = '#3a2414'
    g.beginPath()
    g.ellipse(500, 700, 330, 12, 0, 0, TAU)
    g.fill()
    g.globalAlpha = 1
    shape()
    g.fillStyle = base
    g.fill()
    g.save()
    g.clip()
    washLayer(g, 150, 480, 700, 250, (wg) => {
      for (let i = 0; i < 22; i++) softSpot(wg, 180 + r() * 640, 500 + r() * 200, 50 + r() * 110, i % 2 ? light : shade, 0.28 + r() * 0.2)
    })
    // The part that hangs is out of the light.
    g.fillStyle = rgba(shade, 0.42)
    g.fillRect(170, 652, 660, 70)
    for (let i = 0; i < 11; i++) {
      const x = 205 + i * 58 + (r() - 0.5) * 22
      const lean = (r() - 0.5) * 14
      g.strokeStyle = rgba(mix(shade, '#3a2414', 0.25), 0.55)
      g.lineWidth = 5
      g.beginPath()
      g.moveTo(x, 653)
      g.quadraticCurveTo(x + lean, 676, x + lean * 1.4, 712)
      g.stroke()
      g.strokeStyle = rgba(light, 0.6)
      g.lineWidth = 3.4
      g.beginPath()
      g.moveTo(x + 11, 654)
      g.quadraticCurveTo(x + 11 + lean, 676, x + 12 + lean * 1.4, 712)
      g.stroke()
    }
    g.restore()
    strokeLine(g, [183, 650, 500, 652, 815, 650], rgba(light, 0.75), 3)
    g.beginPath()
    for (let x = 812; x >= 184; x -= 12) {
      if (x === 812) g.moveTo(x, hem(x) - 2)
      else g.lineTo(x, hem(x) - 2)
    }
    g.strokeStyle = rgba(light, 0.85)
    g.lineWidth = 2
    g.stroke()
  })
}

// What the window shows. Needs the season's sky already painted.
export function makeView(pal: Palette, season: Season, sky: Sprite): Sprite {
  return makeSprite(WIN.w, WIN.h, 0, 0, 1.5, (g) => {
    const r = rng(89)
    const k = sky.canvas.width / sky.w
    g.drawImage(sky.canvas, 560 * k, 10 * k, 420 * k, 373 * k, 0, 0, WIN.w, WIN.h)
    const ridge = (base: number, amp: number, color: string, ph: number) => {
      g.beginPath()
      g.moveTo(0, WIN.h)
      for (let x = 0; x <= WIN.w; x += 20) g.lineTo(x, base - amp * Math.sin(x * 0.012 + ph) - amp * 0.4 * Math.sin(x * 0.03 + ph * 2))
      g.lineTo(WIN.w, WIN.h)
      g.closePath()
      g.fillStyle = color
      g.fill()
    }
    ridge(198, 18, pal.hillFar, 1)
    ridge(226, 12, pal.hillNear, 3)
    for (const [x, h, ci] of [[52, 92, 0], [124, 66, 1], [306, 98, 2], [250, 58, 3]] as const) {
      const c = mix(pal.farTree[ci % pal.farTree.length], pal.skyLow, 0.22)
      strokeLine(g, [x, 250, x + 1, 250 - h * 0.6], pal.farTrunk, 3)
      if (season === 0) {
        g.strokeStyle = rgba(pal.farTrunk, 0.85)
        g.lineWidth = 1.4
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI / 2 + (i - 4) * 0.24
          g.beginPath()
          g.moveTo(x + 1, 250 - h * 0.45)
          g.lineTo(x + 1 + Math.cos(a) * h * 0.42, 250 - h * 0.45 + Math.sin(a) * h * 0.42)
          g.stroke()
        }
      } else {
        fillBlob(g, x - h * 0.16, 250 - h * 0.56, h * 0.22, h * 0.2, c, r, 0.08, 10)
        fillBlob(g, x + h * 0.17, 250 - h * 0.58, h * 0.22, h * 0.2, c, r, 0.08, 10)
        fillBlob(g, x, 250 - h * 0.76, h * 0.28, h * 0.26, c, r, 0.08, 10)
        g.globalAlpha = 0.5
        fillBlob(g, x + h * 0.07, 250 - h * 0.82, h * 0.16, h * 0.14, mix(c, '#ffffff', 0.35), r, 0.12)
        g.globalAlpha = 1
      }
    }
    const ground = g.createLinearGradient(0, 240, 0, WIN.h)
    ground.addColorStop(0, pal.groundFar)
    ground.addColorStop(1, pal.groundNear)
    g.beginPath()
    g.moveTo(0, WIN.h)
    for (let x = 0; x <= WIN.w; x += 20) g.lineTo(x, 246 + 5 * Math.sin(x * 0.02))
    g.lineTo(WIN.w, WIN.h)
    g.closePath()
    g.fillStyle = ground
    g.fill()
    // The path, winding away.
    g.beginPath()
    g.moveTo(120, WIN.h)
    g.bezierCurveTo(170, 290, 250, 280, 214, 250)
    g.lineTo(226, 250)
    g.bezierCurveTo(280, 282, 230, 296, 220, WIN.h)
    g.closePath()
    g.fillStyle = pal.path
    g.fill()
    for (let i = 0; i < 40; i++) {
      const x = r() * WIN.w
      const y = 256 + r() * 60
      strokeLine(g, [x, y, x + (r() - 0.5) * 5, y - 6 - r() * 6], rgba(pal.tuft[i % pal.tuft.length], 0.8), 1.6)
    }
    // A branch close to the glass.
    const limb = [372, 14, 300, 30, 226, 62, 168, 70]
    strokeLine(g, limb, pal.trunk, 9)
    strokeLine(g, [286, 36, 250, 20, 214, 22], pal.trunk, 5)
    strokeLine(g, [240, 58, 214, 92, 190, 108], pal.trunk, 4.5)
    const tones = FOLIAGE.cherry[season]
    if (tones) {
      const tips: [number, number][] = [[168, 70], [214, 22], [190, 108], [262, 44], [318, 22], [228, 86], [300, 46], [340, 30]]
      for (const [x, y] of tips) fillBlob(g, x, y + 3, 21 + r() * 7, 17 + r() * 6, tones[0], r, 0.14)
      for (const [x, y] of tips) fillBlob(g, x + 3, y - 4, 16 + r() * 6, 13 + r() * 5, tones[1], r, 0.14)
      for (const [x, y] of tips) fillBlob(g, x + 7, y - 9, 8 + r() * 4, 6 + r() * 3, tones[2], r, 0.14)
      for (const [x, y] of tips) {
        for (let i = 0; i < 7; i++) fillLeaf(g, x + (r() - 0.5) * 48, y + (r() - 0.5) * 38, 9, 4.5, r() * TAU, tones[1 + Math.floor(r() * 2)])
      }
    } else {
      strokeLine(g, [372, 9, 300, 25, 226, 57, 170, 65], '#ffffff', 5)
      strokeLine(g, [286, 32, 250, 16, 216, 18], '#ffffff', 3.4)
    }
  })
}

// A beeswax candle in a turned wooden dish. (0, 0) is the middle of its foot.
export const WICK = { x: 1, y: -104 }

export function makeCandle(): Sprite {
  return makeSprite(100, 150, 50, 132, 2, (g) => {
    const r = rng(93)
    g.globalAlpha = 0.22
    oval(g, 4, 6, 40, 9, '#3a2414')
    g.globalAlpha = 1
    oval(g, 0, 0, 37, 11, '#9a683a')
    oval(g, 0, -3, 37, 10, '#b98452')
    oval(g, 0, -4, 26, 6.5, '#8f5f34')
    g.fillStyle = '#e9b955'
    wobblyRect(g, -14, -94, 28, 90, r, 1.2)
    g.fill()
    g.save()
    g.clip()
    softSpot(g, -8, -50, 22, '#f8dc96', 0.8)
    softSpot(g, 12, -40, 20, '#c88f2e', 0.5)
    g.strokeStyle = rgba('#c9922e', 0.45)
    g.lineWidth = 1
    for (let i = 0; i < 14; i++) {
      g.beginPath()
      g.moveTo(-16, -96 + i * 8)
      g.lineTo(16, -84 + i * 8)
      g.moveTo(16, -96 + i * 8)
      g.lineTo(-16, -84 + i * 8)
      g.stroke()
    }
    g.restore()
    oval(g, 0, -94, 14, 4.6, '#f3cd6e')
    fillBlob(g, -10, -84, 4.5, 9, '#f0c462', r, 0.1)
    fillBlob(g, 8, -80, 4, 12, '#e3ae48', r, 0.1)
    strokeLine(g, [0, -94, 0.5, -99, 1, -104], '#3a2a20', 2.4)
  })
}

export function makeGlow(): Sprite {
  return makeSprite(640, 640, 320, 320, 0.5, (g) => {
    softSpot(g, 0, 0, 320, '#ffcf7a', 0.5)
    softSpot(g, 0, 0, 120, '#fff0c0', 0.5)
  })
}

// The flame, drawn live. (x, y) is the top of the wick; k is 0 out, 1 burning.
export function drawFlame(g: G, x: number, y: number, k: number, time: number, lean: number): void {
  if (k <= 0.01) return
  const flick = 1 + 0.06 * Math.sin(time * 13) + 0.04 * Math.sin(time * 7.3 + 1)
  const sway = Math.sin(time * 2.1) * 2 + lean
  const h = 40 * k * flick
  const w = 9.5 * Math.sqrt(k)
  g.beginPath()
  g.moveTo(x, y + 3)
  g.bezierCurveTo(x - w * 1.25, y - 4, x - w, y - h * 0.62, x + sway, y - h)
  g.bezierCurveTo(x + w, y - h * 0.62, x + w * 1.25, y - 4, x, y + 3)
  g.fillStyle = '#f6b530'
  g.fill()
  g.beginPath()
  g.moveTo(x, y + 1)
  g.bezierCurveTo(x - w * 0.6, y - 3, x - w * 0.5, y - h * 0.4, x + sway * 0.6, y - h * 0.68)
  g.bezierCurveTo(x + w * 0.5, y - h * 0.4, x + w * 0.6, y - 3, x, y + 1)
  g.fillStyle = '#fff3c0'
  g.fill()
  g.globalAlpha = 0.5
  g.beginPath()
  g.ellipse(x, y - 1, w * 0.42, 3.4, 0, 0, TAU)
  g.fillStyle = '#7fa6d9'
  g.fill()
  g.globalAlpha = 1
}

// The basket in two halves, so the treasures can sit between them. (0, 0) of
// both is the middle of the rim.
export const BASKET_HANDLE = 143

export function makeBasket(): { back: Sprite; front: Sprite } {
  const back = makeSprite(270, 210, 135, 176, 2, (g) => {
    g.strokeStyle = '#a87a40'
    g.lineWidth = 16
    g.beginPath()
    g.moveTo(-104, 2)
    g.bezierCurveTo(-104, -190, 104, -190, 104, 2)
    g.stroke()
    g.strokeStyle = '#c99b5a'
    g.lineWidth = 9
    g.stroke()
    g.strokeStyle = rgba('#8a6030', 0.7)
    g.lineWidth = 2
    for (let i = 1; i < 26; i++) {
      const t = i / 26
      const u = 1 - t
      const x = u * u * u * -104 + 3 * u * u * t * -104 + 3 * u * t * t * 104 + t * t * t * 104
      const y = 3 * u * u * t * -190 + 3 * u * t * t * -190 + 2
      g.beginPath()
      g.moveTo(x - 7, y - 3)
      g.lineTo(x + 7, y + 3)
      g.stroke()
    }
    oval(g, 0, 0, 113, 30, '#6b4a2a')
    g.save()
    g.beginPath()
    g.ellipse(0, 0, 113, 30, 0, 0, TAU)
    g.clip()
    g.strokeStyle = rgba('#9a7040', 0.8)
    g.lineWidth = 3
    for (let row = 0; row < 3; row++) {
      g.beginPath()
      g.ellipse(0, 6 + row * 9, 108, 30, 0, Math.PI, TAU)
      g.stroke()
    }
    g.restore()
  })
  const front = makeSprite(270, 170, 135, 24, 2, (g) => {
    const body = () => {
      g.beginPath()
      g.moveTo(-114, 0)
      g.ellipse(0, 0, 114, 30, 0, Math.PI, 0, true)
      g.bezierCurveTo(113, 58, 102, 104, 86, 119)
      g.quadraticCurveTo(0, 134, -86, 119)
      g.bezierCurveTo(-102, 104, -113, 58, -114, 0)
      g.closePath()
    }
    body()
    g.fillStyle = '#c99b5a'
    g.fill()
    g.save()
    g.clip()
    softSpot(g, 70, 100, 110, '#7a5226', 0.45)
    softSpot(g, -60, 50, 90, '#ecc98e', 0.4)
    for (let row = 0; row < 9; row++) {
      const y0 = 24 + row * 12
      const width = 114 - row * 3.2
      for (let x = -width - 8 + (row % 2) * 9; x < width + 8; x += 18) {
        const sag = (xx: number) => 30 * Math.sqrt(Math.max(0, 1 - (xx / 116) ** 2)) * (1 - row * 0.07)
        g.strokeStyle = '#a2743c'
        g.lineWidth = 2.6
        g.beginPath()
        g.moveTo(x, y0 + sag(x))
        g.quadraticCurveTo(x + 9, y0 + sag(x + 9) - 7, x + 18, y0 + sag(x + 18))
        g.stroke()
        g.strokeStyle = rgba('#edcf98', 0.7)
        g.lineWidth = 1.6
        g.beginPath()
        g.moveTo(x + 3, y0 + sag(x + 3) - 4)
        g.quadraticCurveTo(x + 9, y0 + sag(x + 9) - 9, x + 15, y0 + sag(x + 15) - 4)
        g.stroke()
      }
    }
    g.restore()
    // The braided rim.
    g.strokeStyle = '#b5854a'
    g.lineWidth = 14
    g.beginPath()
    g.ellipse(0, 0, 113, 30, 0, Math.PI, 0, true)
    g.stroke()
    g.strokeStyle = rgba('#8a6030', 0.75)
    g.lineWidth = 2.2
    for (let i = 0; i <= 26; i++) {
      const a = Math.PI - (i / 26) * Math.PI
      const x = Math.cos(a) * 113
      const y = Math.sin(a) * 30
      g.beginPath()
      g.moveTo(x - 5, y - 6)
      g.lineTo(x + 5, y + 6)
      g.stroke()
    }
    g.strokeStyle = rgba('#edcf98', 0.6)
    g.lineWidth = 2
    g.beginPath()
    g.ellipse(0, -4, 111, 29, 0, Math.PI * 0.9, Math.PI * 0.1, true)
    g.stroke()
  })
  return { back, front }
}

// The wheel of the year: four painted quarters on a wooden disc. Season s is
// centred at -90 degrees minus s quarter-turns, so turning the wheel clockwise
// brings the next season to the top.
export const WHEEL_R = 64

export function makeWheel(): Sprite {
  return makeSprite(150, 150, 75, 75, 2, (g) => {
    const r = rng(99)
    dot(g, 0, 0, WHEEL_R, '#d8ae74')
    g.save()
    g.beginPath()
    g.arc(0, 0, WHEEL_R, 0, TAU)
    g.clip()
    for (let i = 0; i < 8; i++) softSpot(g, (r() - 0.5) * 120, (r() - 0.5) * 120, 30 + r() * 40, i % 2 ? '#e8c692' : '#c0935a', 0.4)
    g.restore()
    const fills = ['#c9dbea', '#f7dbe2', '#a6d283', '#e99c44']
    for (let s = 0; s < 4; s++) {
      const mid = -Math.PI / 2 - (s * Math.PI) / 2
      g.beginPath()
      g.arc(0, 0, 55, mid - 0.72, mid + 0.72)
      g.arc(0, 0, 13, mid + 0.6, mid - 0.6, true)
      g.closePath()
      g.fillStyle = fills[s]
      g.fill()
      g.save()
      g.clip()
      softSpot(g, Math.cos(mid) * 40, Math.sin(mid) * 40, 30, '#ffffff', 0.4)
      g.restore()
      g.save()
      g.rotate(mid + Math.PI / 2)
      g.translate(0, -36)
      if (s === 0) {
        g.strokeStyle = '#ffffff'
        g.lineWidth = 2.6
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI
          g.beginPath()
          g.moveTo(Math.cos(a) * 12, Math.sin(a) * 12)
          g.lineTo(-Math.cos(a) * 12, -Math.sin(a) * 12)
          g.stroke()
        }
        for (let i = 0; i < 6; i++) dot(g, Math.cos((i / 6) * TAU) * 12, Math.sin((i / 6) * TAU) * 12, 2, '#ffffff')
      } else if (s === 1) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU - Math.PI / 2
          oval(g, Math.cos(a) * 7, Math.sin(a) * 7, 6.4, 5, '#ee8fab', a)
        }
        dot(g, 0, 0, 3.6, '#f1c13c')
      } else if (s === 2) {
        dot(g, 0, 0, 8, '#f7d84a')
        g.strokeStyle = '#f7d84a'
        g.lineWidth = 2.6
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU
          g.beginPath()
          g.moveTo(Math.cos(a) * 11, Math.sin(a) * 11)
          g.lineTo(Math.cos(a) * 15, Math.sin(a) * 15)
          g.stroke()
        }
      } else {
        fillLeaf(g, -11, 7, 25, 12, -0.6, '#a8402a')
        strokeLine(g, [-13, 9, 9, -6], '#6b2a1a', 1.4)
      }
      g.restore()
    }
    g.strokeStyle = '#a87643'
    g.lineWidth = 6
    g.beginPath()
    g.arc(0, 0, WHEEL_R - 3, 0, TAU)
    g.stroke()
    g.strokeStyle = rgba('#edcf98', 0.6)
    g.lineWidth = 1.6
    g.beginPath()
    g.arc(0, 0, WHEEL_R - 6.5, 0, TAU)
    g.stroke()
    dot(g, 0, 0, 10, '#8a5a34')
    dot(g, -2.4, -2.4, 3.6, '#b98858')
  })
}
