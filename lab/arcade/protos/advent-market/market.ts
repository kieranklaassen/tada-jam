// The hall: one wide scene the child slides along with a finger. Four wooden
// stalls with cloth awnings, each with someone quietly doing the craft that
// is done there, and at the far end a doorway with one candle glowing beyond
// it. Touching a stall steps up close to it.

import { clamp, damp, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Pointer } from '../../kit/types.ts'
import {
  DYE,
  apple,
  awning,
  brush,
  candlelit,
  drawSnow,
  duskWindow,
  flame,
  flicker,
  garland,
  glow,
  grain,
  lazure,
  makeSnow,
  makeSprite,
  mulberry,
  paperStar,
  person,
  planks,
  put,
  rgba,
  shade,
  sprig,
} from './art.ts'
import type { G, Look, Rgb, Rng, Snow, Sprite } from './art.ts'
import { lanternBody } from './candle.ts'
import type { Place, Scene, World } from './shared.ts'

const WORLD_W = 3520
const GROUND = 632
const STALL_W = 440
const STALL_H = 410
const FAR = 0.5
const NEAR = 1.16
const NEAR_TILE = 1320

interface Spot {
  key: Place
  x: number
  a: Rgb
  b: Rgb
}

const SPOTS: Spot[] = [
  { key: 'candle', x: 410, a: DYE.ochre, b: DYE.cream },
  { key: 'stars', x: 890, a: DYE.rose, b: DYE.cream },
  { key: 'wreath', x: 1370, a: DYE.moss, b: DYE.cream },
  { key: 'ginger', x: 1850, a: DYE.madder, b: DYE.cream },
  { key: 'apple', x: 2330, a: DYE.plum, b: DYE.cream },
  { key: 'cave', x: 2800, a: DYE.fir, b: DYE.cream },
  { key: 'spiral', x: 3270, a: DYE.indigo, b: DYE.cream },
]

const KEEPERS: Look[] = [
  { coat: DYE.indigo, hat: DYE.madder, hair: [96, 62, 40], skin: DYE.skin, head: 1 },
  { coat: DYE.plum, hat: DYE.ochre, hair: [70, 44, 30], skin: [226, 178, 140], head: 2 },
  { coat: [120, 92, 60], hat: DYE.moss, hair: [200, 190, 176], skin: DYE.skin, head: 0 },
  { coat: DYE.cream, hat: DYE.madder, hair: [130, 80, 44], skin: [214, 160, 122], head: 2 },
  { coat: DYE.moss, hat: DYE.rose, hair: [84, 56, 38], skin: DYE.skin, head: 1 },
]

function heartPath(g: G, x: number, y: number, r: number): void {
  g.beginPath()
  g.moveTo(x, y + r * 0.95)
  g.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.75, y - r * 1.25, x, y - r * 0.4)
  g.bezierCurveTo(x + r * 0.75, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.95)
  g.closePath()
}

function miniWreath(g: G, x: number, y: number, r: number, rng: Rng, squash = 1): void {
  g.save()
  g.translate(x, y)
  g.scale(1, squash)
  const n = Math.round(r * 0.5) + 8
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    sprig(g, Math.cos(a) * r, Math.sin(a) * r, r * 0.62, a + Math.PI / 2 + (rng() - 0.5) * 0.9, rng, 0.9 + rng() * 0.3, false)
  }
  g.restore()
}

function bow(g: G, x: number, y: number, s: number, c: Rgb): void {
  g.fillStyle = rgba(c)
  g.beginPath()
  g.ellipse(x - s, y, s, s * 0.6, 0.4, 0, TAU)
  g.ellipse(x + s, y, s, s * 0.6, -0.4, 0, TAU)
  g.fill()
  g.beginPath()
  g.moveTo(x - s * 0.2, y)
  g.lineTo(x - s * 0.9, y + s * 2.2)
  g.lineTo(x - s * 0.1, y + s * 1.8)
  g.moveTo(x + s * 0.2, y)
  g.lineTo(x + s * 0.9, y + s * 2.2)
  g.lineTo(x + s * 0.1, y + s * 1.8)
  g.fill()
  g.fillStyle = rgba(shade(c, 0.75))
  g.beginPath()
  g.arc(x, y, s * 0.42, 0, TAU)
  g.fill()
}

function miniCandle(g: G, x: number, y: number, len: number, w: number): void {
  g.strokeStyle = '#efe2c2'
  g.lineWidth = 1.4
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x, y + 10)
  g.stroke()
  const grad = g.createLinearGradient(x - w, 0, x + w, 0)
  grad.addColorStop(0, '#d99a34')
  grad.addColorStop(0.35, '#f4c868')
  grad.addColorStop(1, '#b97a24')
  g.fillStyle = grad
  g.beginPath()
  g.moveTo(x - w * 0.5, y + 10)
  g.quadraticCurveTo(x - w, y + len * 0.6, x - w, y + len)
  g.quadraticCurveTo(x, y + len + w, x + w, y + len)
  g.quadraticCurveTo(x + w, y + len * 0.6, x + w * 0.5, y + 10)
  g.closePath()
  g.fill()
}

function gingerHeart(g: G, x: number, y: number, r: number): void {
  heartPath(g, x, y, r)
  g.fillStyle = '#a2643a'
  g.fill()
  heartPath(g, x, y + r * 0.03, r * 0.72)
  g.strokeStyle = 'rgba(255,248,236,0.95)'
  g.lineWidth = Math.max(1.4, r * 0.09)
  g.setLineDash([r * 0.18, r * 0.16])
  g.stroke()
  g.setLineDash([])
}

// What a stall is for, painted on a cloth that hangs from its counter.
function sign(g: G, x: number, y: number, key: Place, dye: Rgb, rng: Rng): void {
  g.fillStyle = rgba(shade(dye, 0.92))
  g.beginPath()
  g.moveTo(x - 52, y)
  g.lineTo(x + 52, y)
  g.lineTo(x + 52, y + 92)
  g.lineTo(x, y + 112)
  g.lineTo(x - 52, y + 92)
  g.closePath()
  g.fill()
  g.save()
  g.clip()
  brush(g, x - 52, y, 104, 112, rng, 26, Math.PI / 2, 0.9, 40)
  g.restore()
  const cy = y + 50
  if (key === 'candle') {
    g.fillStyle = rgba(DYE.cream)
    g.beginPath()
    g.roundRect(x - 9, cy - 12, 18, 46, 5)
    g.fill()
    flame(g, x, cy - 16, 26, 1)
  } else if (key === 'stars') {
    paperStar(g, x, cy + 4, 34, [248, 232, 190], [236, 206, 150], 0.2)
  } else if (key === 'wreath') {
    g.strokeStyle = rgba(DYE.cream)
    g.lineWidth = 9
    g.beginPath()
    g.arc(x, cy + 6, 26, 0, TAU)
    g.stroke()
    bow(g, x, cy + 30, 7, [236, 206, 150])
  } else if (key === 'apple') {
    apple(g, x, cy + 34, 22, 1.9)
    g.fillStyle = rgba(DYE.cream)
    g.beginPath()
    g.roundRect(x - 4, cy - 30, 8, 24, 3)
    g.fill()
    flame(g, x, cy - 32, 16, 1)
  } else {
    heartPath(g, x, cy + 4, 30)
    g.fillStyle = rgba(DYE.cream)
    g.fill()
  }
}

function paintStall(g: G, spot: Spot, index: number): void {
  const rng = mulberry(900 + index * 37)
  // Shadow where it stands.
  g.fillStyle = 'rgba(30,12,10,0.3)'
  g.beginPath()
  g.ellipse(220, 398, 226, 12, 0, 0, TAU)
  g.fill()
  // Back cloth, lit from the lantern that hangs inside.
  g.fillStyle = rgba(shade(DYE.plum, 0.46))
  g.fillRect(34, 60, 372, 200)
  const lit = g.createRadialGradient(92, 150, 10, 92, 150, 320)
  lit.addColorStop(0, 'rgba(255,190,104,0.7)')
  lit.addColorStop(0.5, 'rgba(236,140,76,0.3)')
  lit.addColorStop(1, 'rgba(240,150,80,0)')
  g.fillStyle = lit
  g.fillRect(34, 60, 372, 200)
  g.save()
  g.beginPath()
  g.rect(34, 60, 372, 200)
  g.clip()
  brush(g, 34, 60, 372, 200, rng, 70, Math.PI / 2, 0.9, 70)
  g.restore()
  // Posts.
  planks(g, 22, 44, 16, 356, [140, 92, 54], rng, 1, true)
  planks(g, 402, 44, 16, 356, [120, 78, 46], rng, 1, true)
  // The rail the wares hang from.
  g.strokeStyle = rgba(DYE.woodDark)
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(34, 88)
  g.lineTo(406, 88)
  g.stroke()

  // Wares on the rail.
  if (spot.key === 'candle') {
    for (const [cx, len, cw] of [[306, 78, 7], [328, 64, 6], [350, 64, 6], [374, 86, 8]] as const) {
      g.strokeStyle = '#efe2c2'
      g.lineWidth = 1.4
      g.beginPath()
      g.moveTo(cx, 88)
      g.lineTo(cx, 96)
      g.stroke()
      miniCandle(g, cx, 92, len, cw)
    }
  } else if (spot.key === 'stars') {
    // A paper screen with the light behind it, and stars pinned on.
    g.fillStyle = 'rgba(226,232,246,0.9)'
    g.fillRect(292, 98, 104, 132)
    g.strokeStyle = rgba(DYE.woodDark)
    g.lineWidth = 5
    g.strokeRect(292, 98, 104, 132)
    paperStar(g, 344, 142, 34, [246, 206, 96], [236, 150, 80], 0.1)
    paperStar(g, 328, 200, 22, [226, 120, 110], [200, 96, 120], 0.3)
    paperStar(g, 370, 198, 20, [120, 160, 200], [150, 190, 160], 0)
    for (const [sx, sr, ca, cb] of [[170, 22, [240, 196, 90], [226, 140, 80]], [214, 16, [220, 130, 120], [200, 110, 150]]] as const) {
      g.strokeStyle = 'rgba(240,226,200,0.7)'
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(sx, 88)
      g.lineTo(sx, 122 - sr)
      g.stroke()
      paperStar(g, sx, 122, sr, ca, cb, 0.2)
    }
  } else if (spot.key === 'wreath') {
    miniWreath(g, 176, 132, 26, rng)
    bow(g, 176, 156, 6, DYE.madder)
    miniWreath(g, 352, 140, 34, rng)
    bow(g, 352, 172, 7, DYE.madder)
    for (const [bx, by] of [[330, 122], [372, 128], [352, 108]] as const) {
      g.fillStyle = rgba(DYE.madder)
      g.beginPath()
      g.arc(bx, by, 3.5, 0, TAU)
      g.fill()
    }
  } else if (spot.key === 'apple') {
    for (const [ax, ay, ar] of [[166, 138, 15], [198, 124, 13], [340, 128, 14], [374, 142, 16]] as const) {
      g.strokeStyle = 'rgba(240,226,200,0.7)'
      g.lineWidth = 1.4
      g.beginPath()
      g.moveTo(ax, 88)
      g.lineTo(ax, ay - ar * 1.7)
      g.stroke()
      apple(g, ax, ay, ar, 1)
    }
  } else if (spot.key === 'ginger') {
    for (const [hx, hy, hr] of [[160, 132, 18], [196, 122, 14], [336, 126, 16], [372, 138, 20]] as const) {
      g.strokeStyle = rgba(DYE.madder)
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(hx, 88)
      g.lineTo(hx, hy - hr * 0.5)
      g.stroke()
      gingerHeart(g, hx, hy, hr)
    }
  }

  // The lantern's hook; its body is drawn over the flame each frame.
  g.strokeStyle = 'rgba(40,24,18,0.9)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(92, 88)
  g.lineTo(92, 112)
  g.stroke()

  // The awning.
  awning(g, 2, 8, 436, 58, spot.a, spot.b, rng)
  // A sprig of fir tucked along its ridge.
  garland(g, 30, 10, 410, 10, 4, rng, 22, 0.95)
}

function paintCounter(g: G, spot: Spot, index: number): void {
  const rng = mulberry(1300 + index * 53)
  planks(g, 20, 262, 400, 138, [150, 100, 60], rng, 7, true)
  const fall = g.createLinearGradient(0, 262, 0, 400)
  fall.addColorStop(0, 'rgba(40,18,12,0.3)')
  fall.addColorStop(0.2, 'rgba(40,18,12,0.05)')
  fall.addColorStop(1, 'rgba(40,18,12,0.34)')
  g.fillStyle = fall
  g.fillRect(20, 262, 400, 138)
  // The counter top.
  g.fillStyle = rgba([196, 142, 88])
  g.beginPath()
  g.roundRect(10, 244, 420, 22, 5)
  g.fill()
  g.fillStyle = 'rgba(255,226,170,0.3)'
  g.fillRect(14, 246, 412, 4)
  sign(g, 220, 268, spot.key, spot.a, rng)

  // What lies on the counter.
  if (spot.key === 'candle') {
    // A small pot of wax; the keeper dips into it.
    g.fillStyle = '#7a4a32'
    g.beginPath()
    g.moveTo(134, 210)
    g.lineTo(142, 248)
    g.lineTo(198, 248)
    g.lineTo(206, 210)
    g.closePath()
    g.fill()
    g.fillStyle = '#f2bc4e'
    g.beginPath()
    g.ellipse(170, 210, 36, 8, 0, 0, TAU)
    g.fill()
    g.strokeStyle = '#b97a4c'
    g.lineWidth = 3
    g.beginPath()
    g.ellipse(170, 210, 36, 8, 0, 0, TAU)
    g.stroke()
    for (const [cx, rot] of [[330, 0.1], [352, -0.06], [374, 0.04]] as const) {
      g.save()
      g.translate(cx, 246)
      g.rotate(Math.PI / 2 + rot)
      miniCandle(g, 0, -34, 60, 6)
      g.restore()
    }
  } else if (spot.key === 'stars') {
    const papers: Rgb[] = [[240, 200, 90], [232, 140, 80], [220, 110, 110], [150, 170, 210], [150, 190, 150]]
    papers.forEach((c, i) => {
      g.save()
      g.translate(120 + i * 9, 238 - i * 2)
      g.rotate(-0.2 + i * 0.1)
      g.fillStyle = rgba(c, 0.92)
      g.fillRect(-30, -9, 60, 18)
      g.restore()
    })
  } else if (spot.key === 'wreath') {
    for (let i = 0; i < 9; i++) sprig(g, 310 + rng() * 76, 240 - rng() * 12, 44, -2.6 + rng() * 2, rng, 1, true)
    // The wreath being bound, and a spool of red ribbon.
    miniWreath(g, 196, 240, 34, rng, 0.36)
    g.fillStyle = rgba(DYE.woodLight)
    g.fillRect(96, 222, 30, 24)
    g.fillStyle = rgba(DYE.madder)
    g.fillRect(100, 226, 22, 16)
  } else if (spot.key === 'apple') {
    // A bowl of apples, the one being cored, and holders already made.
    g.fillStyle = '#8a5a30'
    g.beginPath()
    g.moveTo(88, 226)
    g.quadraticCurveTo(126, 262, 164, 226)
    g.closePath()
    g.fill()
    apple(g, 110, 232, 13, 1)
    apple(g, 138, 232, 13, 0.92)
    apple(g, 124, 222, 13, 1.08)
    apple(g, 200, 246, 16, 1)
    for (const hx of [330, 372]) {
      apple(g, hx, 246, 15, 1)
      g.fillStyle = '#f0c868'
      g.beginPath()
      g.roundRect(hx - 3.5, 198, 7, 26, 2)
      g.fill()
      flame(g, hx, 196, 13, 1)
      sprig(g, hx + 3, 224, 20, -0.5, rng, 1.1, false)
    }
  } else if (spot.key === 'ginger') {
    g.fillStyle = rgba([120, 82, 52])
    g.beginPath()
    g.roundRect(300, 232, 100, 14, 4)
    g.fill()
    gingerHeart(g, 322, 226, 13)
    gingerHeart(g, 352, 224, 13)
    gingerHeart(g, 382, 227, 13)
    // The one being iced.
    g.save()
    g.translate(190, 240)
    g.scale(1, 0.5)
    gingerHeart(g, 0, 0, 30)
    g.restore()
  }
}

function paintDoor(g: G): void {
  const rng = mulberry(77)
  // The dark room beyond.
  g.save()
  g.beginPath()
  g.moveTo(60, 400)
  g.lineTo(60, 150)
  g.arc(190, 150, 130, Math.PI, 0)
  g.lineTo(320, 400)
  g.closePath()
  g.fillStyle = '#17142c'
  g.fill()
  g.clip()
  // Its floor, and the first boughs of the spiral catching the one light.
  g.fillStyle = '#231c33'
  g.fillRect(60, 300, 260, 100)
  const pool = g.createRadialGradient(190, 318, 4, 190, 318, 150)
  pool.addColorStop(0, 'rgba(255,190,100,0.55)')
  pool.addColorStop(0.4, 'rgba(240,140,70,0.2)')
  pool.addColorStop(1, 'rgba(240,140,70,0)')
  g.fillStyle = pool
  g.fillRect(60, 160, 260, 240)
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 1.5 + 0.6
    sprig(g, 190 + Math.cos(a) * 88, 340 + Math.sin(a) * 24, 30, a + 1.4, rng, 0.85, false)
  }
  g.restore()
  // The frame, and the door standing open against the wall.
  g.strokeStyle = rgba(DYE.woodDark)
  g.lineWidth = 18
  g.beginPath()
  g.moveTo(60, 400)
  g.lineTo(60, 150)
  g.arc(190, 150, 130, Math.PI, 0)
  g.lineTo(320, 400)
  g.stroke()
  g.strokeStyle = 'rgba(255,214,150,0.18)'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(54, 400)
  g.lineTo(54, 150)
  g.arc(190, 150, 136, Math.PI, 0)
  g.stroke()
  // Fir over the arch.
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (i / 12) * Math.PI
    sprig(g, 190 + Math.cos(a) * 140, 150 + Math.sin(a) * 140, 40, a + Math.PI / 2 + (rng() - 0.5), rng, 1, false)
    sprig(g, 190 + Math.cos(a) * 140, 150 + Math.sin(a) * 140, 36, a - Math.PI / 2 + (rng() - 0.5), rng, 0.9, false)
  }
  paperStar(g, 190, 30, 24, [244, 206, 110], [226, 166, 80], 0.2)
}

// The gnome's cave as it looks from the hall: a bower of dark cloth, moss and
// fir, with a lantern showing a red hat within.
function paintCaveFront(g: G): void {
  const rng = mulberry(431)
  g.fillStyle = 'rgba(30,12,10,0.3)'
  g.beginPath()
  g.ellipse(200, 398, 200, 12, 0, 0, TAU)
  g.fill()
  // The cloth, hung over a frame of branches.
  const dome = (): void => {
    g.beginPath()
    g.moveTo(14, 400)
    g.bezierCurveTo(4, 180, 90, 60, 200, 54)
    g.bezierCurveTo(310, 60, 396, 180, 386, 400)
    g.closePath()
  }
  dome()
  g.fillStyle = '#34463e'
  g.fill()
  g.save()
  g.clip()
  brush(g, 0, 40, 400, 370, rng, 90, 1.2, 1, 80)
  g.restore()
  // The way in, dark, with the lantern's pool of light.
  g.save()
  g.beginPath()
  g.moveTo(96, 400)
  g.bezierCurveTo(92, 250, 140, 168, 200, 166)
  g.bezierCurveTo(260, 168, 308, 250, 304, 400)
  g.closePath()
  g.fillStyle = '#121a22'
  g.fill()
  g.clip()
  const pool = g.createRadialGradient(166, 262, 6, 166, 262, 170)
  pool.addColorStop(0, 'rgba(255,196,110,0.6)')
  pool.addColorStop(0.5, 'rgba(230,140,70,0.2)')
  pool.addColorStop(1, 'rgba(230,140,70,0)')
  g.fillStyle = pool
  g.fillRect(90, 160, 220, 240)
  // Moss underfoot, and the gnome sitting small at the back.
  g.fillStyle = '#4a5e36'
  g.beginPath()
  g.ellipse(200, 404, 120, 34, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#7a5234'
  g.beginPath()
  g.ellipse(236, 352, 30, 34, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#f0e8da'
  g.beginPath()
  g.ellipse(234, 322, 17, 20, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#e8bf9a'
  g.beginPath()
  g.arc(234, 306, 13, 0, TAU)
  g.fill()
  g.fillStyle = '#a8382e'
  g.beginPath()
  g.moveTo(218, 300)
  g.quadraticCurveTo(230, 262, 246, 240)
  g.quadraticCurveTo(250, 272, 250, 300)
  g.quadraticCurveTo(234, 294, 218, 300)
  g.fill()
  g.fillStyle = '#3c2a22'
  g.beginPath()
  g.arc(229, 306, 1.8, 0, TAU)
  g.arc(239, 306, 1.8, 0, TAU)
  g.fill()
  // Crystals catching the light.
  for (const [x, y, sz] of [[150, 392, 9], [176, 398, 7], [272, 394, 8]] as const) {
    g.fillStyle = 'rgba(222,232,248,0.95)'
    g.beginPath()
    g.moveTo(x - sz * 0.5, y)
    g.lineTo(x - sz * 0.5, y - sz)
    g.lineTo(x, y - sz * 1.7)
    g.lineTo(x + sz * 0.5, y - sz)
    g.lineTo(x + sz * 0.5, y)
    g.closePath()
    g.fill()
  }
  g.restore()
  // Moss hanging over the way in, and fir laid over the whole bower.
  for (let i = 0; i < 26; i++) {
    const t = i / 25
    const a = Math.PI + t * Math.PI
    const x = 200 + Math.cos(a) * 108
    const y = 290 + Math.sin(a) * 126
    g.strokeStyle = `rgba(${80 + rng() * 50},${110 + rng() * 40},${60 + rng() * 30},0.9)`
    g.lineWidth = 3 + rng() * 3
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + (rng() - 0.5) * 12, y + 14, x + (rng() - 0.5) * 10, y + 16 + rng() * 26)
    g.stroke()
  }
  for (let i = 0; i < 20; i++) {
    const t = i / 19
    const a = Math.PI * 1.02 + t * Math.PI * 0.96
    sprig(g, 200 + Math.cos(a) * 176, 250 + Math.sin(a) * 190, 46, a + Math.PI / 2 + (rng() - 0.5) * 1.2, rng, 0.9 + rng() * 0.3, true)
  }
  // A toadstool by the door.
  g.fillStyle = '#eadfc8'
  g.fillRect(58, 372, 9, 26)
  g.fillStyle = '#b43c30'
  g.beginPath()
  g.ellipse(62, 372, 22, 12, 0, Math.PI, 0)
  g.fill()
  g.fillStyle = 'rgba(250,240,226,0.9)'
  g.beginPath()
  g.arc(54, 366, 2.6, 0, TAU)
  g.arc(66, 363, 3, 0, TAU)
  g.arc(74, 368, 2.2, 0, TAU)
  g.fill()
}

interface Walker {
  x: number
  y: number
  dir: number
  speed: number
  pause: number
  turn: number
  big: Look
  small: Look | null
  lantern: boolean
  phase: number
}

export function createMarket(world: World): Scene {
  const { stage, snd } = world
  const dpr = world.dpr
  const wallW = W + (WORLD_W - W) * FAR
  let wall: Sprite | null = null
  let floor: Sprite | null = null
  let near: Sprite | null = null
  const backs: Sprite[] = []
  const fronts: Sprite[] = []
  let door: Sprite | null = null
  let cave: Sprite | null = null
  const snows: Snow[] = []
  const sconces: number[] = []
  const windows: number[] = []

  // The hall is wider than the screen: it opens a little way along and
  // settles back, so the next awning is seen sliding out of view.
  let cam = 170
  let settling = true
  let camV = 0
  let dragId = -1
  let dragged = 0
  let pressed = -1
  const bump = SPOTS.map(() => 0)
  const bumpV = SPOTS.map(() => 0)

  const walkers: Walker[] = [
    { x: 760, y: 748, dir: 1, speed: 13, pause: 0, turn: 0, phase: 0, lantern: false, big: { coat: DYE.moss, hat: DYE.cream, hair: [80, 50, 34], skin: DYE.skin, head: 0 }, small: { coat: DYE.madder, hat: DYE.ochre, hair: [200, 160, 90], skin: DYE.skin, head: 3 } },
    { x: 1700, y: 772, dir: -1, speed: 10, pause: 0, turn: 0, phase: 2, lantern: false, big: { coat: [120, 84, 60], hat: DYE.indigo, hair: [60, 40, 30], skin: [206, 150, 112], head: 2 }, small: { coat: DYE.dusk, hat: DYE.cream, hair: [60, 40, 30], skin: [206, 150, 112], head: 0 } },
    { x: 2760, y: 756, dir: 1, speed: 8, pause: 0, turn: 0, phase: 4, lantern: true, big: { coat: DYE.plum, hat: DYE.rose, hair: [150, 100, 60], skin: DYE.skin, head: 1 }, small: null },
  ]

  const build = (): void => {
    const rng = mulberry(5150)
    // The far wall: lazured plaster, tall windows, a beam with fir swags.
    wall = makeSprite(wallW, GROUND, world.bg, (g) => {
      lazure(g, 0, 0, wallW, GROUND, DYE.wall, [[236, 190, 140], [214, 150, 110], [226, 170, 120], [198, 130, 104], [240, 204, 150]], rng, 260)
      for (let x = 150; x < wallW - 100; x += 356) {
        duskWindow(g, x, 46, 176, 420, rng, 0.06, true)
        windows.push(x)
        snows.push(makeSnow(x, 46, 176, 420, 16, rng))
        // Cool light from the snow falls a little way into the room.
        const cool = g.createRadialGradient(x + 88, 240, 40, x + 88, 240, 260)
        cool.addColorStop(0, 'rgba(160,180,230,0.14)')
        cool.addColorStop(1, 'rgba(160,180,230,0)')
        g.fillStyle = cool
        g.fillRect(x - 180, 0, 540, 520)
      }
      // Sconces between the windows; their flames are drawn live.
      for (let x = 150 + 266; x < wallW - 100; x += 356) {
        sconces.push(x)
        g.fillStyle = rgba(DYE.woodDark)
        g.beginPath()
        g.roundRect(x - 22, 196, 44, 9, 3)
        g.fill()
        g.beginPath()
        g.moveTo(x - 6, 205)
        g.lineTo(x + 6, 205)
        g.lineTo(x, 228)
        g.closePath()
        g.fill()
        g.fillStyle = '#eec878'
        g.beginPath()
        g.roundRect(x - 6, 164, 12, 32, 3)
        g.fill()
      }
      // Wainscot.
      planks(g, 0, 500, wallW, GROUND - 500, [150, 100, 64], rng, 30, true)
      g.fillStyle = rgba(DYE.woodDark)
      g.fillRect(0, 494, wallW, 9)
      const lights = [
        ...sconces.map((x) => ({ x, y: 160, r: 300 })),
        ...windows.map((x) => ({ x: x + 88, y: 250, r: 250, lift: 0.5 })),
      ]
      candlelit(g, wallW, GROUND, lights, 'rgba(54,24,46,0.56)', 0.16)
      grain(g, 0, 0, wallW, GROUND, 4000, rng, 0.03, 0.03)
    })

    // The floor: boards running away from us, pools of light before each stall.
    floor = makeSprite(WORLD_W, H - GROUND + 40, 1, (g) => {
      const h = H - GROUND + 40
      planks(g, 0, 0, WORLD_W, h, [150, 104, 66], rng, 5)
      const lights = SPOTS.map((s) => ({ x: s.x, y: 30, r: 330 }))
      candlelit(g, WORLD_W, h, lights, 'rgba(46,20,34,0.6)', 0.2)
      const back = g.createLinearGradient(0, 0, 0, 50)
      back.addColorStop(0, 'rgba(30,12,14,0.5)')
      back.addColorStop(1, 'rgba(30,12,14,0)')
      g.fillStyle = back
      g.fillRect(0, 0, WORLD_W, 50)
    })

    // What hangs nearest us: a beam, fir, and paper stars on threads. It is
    // painted as one stretch that repeats along the hall.
    near = makeSprite(NEAR_TILE, 150, dpr, (g) => {
      planks(g, 0, 0, NEAR_TILE, 16, [104, 66, 40], mulberry(30), 1)
      g.fillStyle = 'rgba(30,12,10,0.3)'
      g.fillRect(0, 16, NEAR_TILE, 5)
      const swags = NEAR_TILE / 330
      for (let k = -1; k <= swags; k++) {
        // Each swag is seeded by its place in the repeat, so the ends meet.
        const r2 = mulberry(31 + ((k + swags) % swags) * 7)
        const x = k * 330
        garland(g, x, 14, x + 330, 14, 46, r2, 38, 0.9)
        bow(g, x, 22, 8, DYE.madder)
        const sx = x + 165
        const len = 62 + r2() * 30
        g.strokeStyle = 'rgba(240,226,200,0.6)'
        g.lineWidth = 1.2
        g.beginPath()
        g.moveTo(sx, 56)
        g.lineTo(sx, len + 22)
        g.stroke()
        const warm = r2() < 0.5
        paperStar(g, sx, len + 44, 24, warm ? [246, 210, 110] : [236, 160, 110], warm ? [228, 170, 80] : [214, 120, 100], r2())
      }
    })

    cave = makeSprite(400, STALL_H, dpr, paintCaveFront)
    SPOTS.forEach((spot, i) => {
      if (spot.key === 'spiral' || spot.key === 'cave') return
      backs[i] = makeSprite(STALL_W, STALL_H, dpr, (g) => paintStall(g, spot, i))
      fronts[i] = makeSprite(STALL_W, STALL_H, dpr, (g) => paintCounter(g, spot, i))
    })
    door = makeSprite(380, STALL_H, dpr, paintDoor)
  }

  const spotAt = (x: number, y: number): number => {
    const wx = x + cam
    for (let i = 0; i < SPOTS.length; i++) {
      const s = SPOTS[i]!
      const half = s.key === 'spiral' ? 150 : s.key === 'cave' ? 190 : 216
      if (Math.abs(wx - s.x) < half && y > GROUND - 400 && y < GROUND + 16) return i
    }
    return -1
  }

  // The keeper of each stall, doing its craft slowly.
  const drawKeeper = (g: G, i: number, sx: number, t: number): void => {
    const top = GROUND - 400
    const kx = sx - 220 + 258
    const ky = GROUND
    const look = KEEPERS[i]!
    const key = SPOTS[i]!.key
    const breathe = Math.sin(t * 1.1 + i) * 1.2
    if (key === 'candle') {
      // Down into the pot, up, a pause to drip, and again.
      const k = (t * 0.13) % 1
      const dip = k < 0.5 ? Math.sin((k / 0.5) * Math.PI) ** 1.5 : 0
      const hx = sx - 220 + 170
      const hy = top + 122 + dip * 56
      person(g, kx, ky, 252, look, [hx - kx + 2, hy - ky - 2], [40, -162], -0.5, breathe)
      g.save()
      g.beginPath()
      g.rect(hx - 30, top + 60, 60, 150)
      g.clip()
      miniCandle(g, hx, hy, 62, 6.5)
      g.restore()
    } else if (key === 'stars') {
      // Holding a star up to the light and turning it.
      const lift = 0.5 + 0.5 * Math.sin(t * 0.5)
      const hx = kx - 46
      const hy = top + 204 - lift * 44
      person(g, kx, ky, 252, look, [hx - kx - 14, hy - ky + 6], [hx - kx + 18, hy - ky + 8], -0.4, breathe)
      g.globalAlpha = 0.9
      paperStar(g, hx, hy - 14, 28, [248, 212, 110], [236, 150, 90], t * 0.12)
      g.globalAlpha = 1
      glow(g, world.halo, hx, hy - 14, 30 + lift * 26, 0.5 * lift)
    } else if (key === 'wreath') {
      // Winding: one hand holds, the other circles.
      const a = t * 1.3
      const cx = kx - 62
      const cy = top + 232
      person(g, kx, ky, 252, look, [cx - kx + Math.cos(a) * 20, cy - ky + Math.sin(a) * 8 - 6], [-18, cy - ky + 2], -0.3, breathe)
    } else if (key === 'apple') {
      // Coring: the handle goes round under her hand.
      const a = t * 1.1
      const cx = kx - 58
      const cy = top + 196
      g.fillStyle = '#b8b2a8'
      g.fillRect(cx - 3, cy + 6, 6, 26)
      g.fillStyle = '#a2713e'
      g.beginPath()
      g.roundRect(cx - 5 - Math.abs(Math.cos(a)) * 12, cy, 10 + Math.abs(Math.cos(a)) * 24, 8, 4)
      g.fill()
      person(g, kx, ky, 252, look, [cx - kx + Math.cos(a) * 9, cy - ky + 2 + Math.sin(a) * 3], [-22, cy - ky + 44], -0.3, breathe)
    } else {
      // Piping: a slow line across a heart, then back to the start.
      const k = (t * 0.2) % 1
      const cx = kx - 70 + Math.sin(k * Math.PI) * 34
      const cy = top + 228
      person(g, kx, ky, 252, look, [cx - kx + 4, cy - ky - 16], [26, -160], -0.4, breathe)
      g.fillStyle = '#f6efe2'
      g.beginPath()
      g.moveTo(cx, cy + 8)
      g.lineTo(cx - 9, cy - 20)
      g.lineTo(cx + 11, cy - 20)
      g.closePath()
      g.fill()
    }
  }

  const drawWalker = (g: G, w: Walker, t: number): void => {
    const x = w.x - cam
    if (x < -160 || x > W + 160) return
    const moving = w.pause <= 0
    const bob = moving ? Math.abs(Math.sin(t * 2.2 + w.phase)) * -3 : 0
    g.fillStyle = 'rgba(20,8,8,0.28)'
    g.beginPath()
    g.ellipse(x, w.y + 2, 46, 8, 0, 0, TAU)
    if (w.small) g.ellipse(x + w.dir * 62, w.y + 4, 30, 6, 0, 0, TAU)
    g.fill()
    const face = moving ? w.dir * 0.8 : w.turn
    if (w.small) {
      const cx = x + w.dir * 62
      const bob2 = moving ? Math.abs(Math.sin(t * 2.9 + w.phase + 1)) * -3 : 0
      // Hand in hand.
      person(g, cx, w.y + 4, 124, w.small, w.dir > 0 ? [-28, -62 + bob2] : null, w.dir > 0 ? null : [28, -62 + bob2], face, bob2)
      person(g, x, w.y, 196, w.big, w.dir > 0 ? null : [-34, -66], w.dir > 0 ? [34, -66] : null, face, bob)
    } else {
      const hx = w.dir * 40
      const hy = -92 + bob
      person(g, x, w.y, 150, w.big, w.dir > 0 ? null : [hx, hy], w.dir > 0 ? [hx, hy] : null, face, bob)
      if (w.lantern) {
        const lx = x + hx
        const ly = w.y + hy + 34
        g.strokeStyle = 'rgba(60,40,30,0.9)'
        g.lineWidth = 1.6
        g.beginPath()
        g.moveTo(lx, ly - 34)
        g.lineTo(lx, ly - 14)
        g.stroke()
        glow(g, world.halo, lx, ly, 62 + flicker(t, 9) * 8, 0.85)
        g.fillStyle = 'rgba(250,206,120,0.92)'
        g.beginPath()
        g.roundRect(lx - 13, ly - 15, 26, 32, 7)
        g.fill()
        g.fillStyle = 'rgba(255,240,190,0.9)'
        g.beginPath()
        g.ellipse(lx, ly + 2, 6, 10, 0, 0, TAU)
        g.fill()
      }
    }
  }

  return {
    enter() {
      if (!wall) build()
      camV = 0
      dragId = -1
    },
    reset() {
      cam = 170
      settling = true
    },
    update(dt) {
      if (settling) {
        cam = damp(cam, 0, 1.1, dt)
        if (cam < 0.5) settling = false
      }
      if (dragId === -1) {
        cam += camV * dt
        camV = damp(camV, 0, 3.2, dt)
        // Soft edges: past either end it eases back.
        if (cam < 0) cam = damp(cam, 0, 10, dt)
        if (cam > WORLD_W - W) cam = damp(cam, WORLD_W - W, 10, dt)
      }
      for (let i = 0; i < SPOTS.length; i++) {
        bumpV[i]! += (-160 * bump[i]! - 11 * bumpV[i]!) * dt
        bump[i]! += bumpV[i]! * dt
      }
      for (const w of walkers) {
        if (w.pause > 0) {
          w.pause -= dt
          continue
        }
        w.x += w.dir * w.speed * dt
        if (w.x > WORLD_W + 140) w.x = -140
        if (w.x < -140) w.x = WORLD_W + 140
      }
    },
    draw(g) {
      const t = stage.time
      const c = clamp(cam, -60, WORLD_W - W + 60)
      g.fillStyle = '#2a1616'
      g.fillRect(0, 0, W, H)
      const wx = -c * FAR
      if (wall) put(g, wall, wx, 0)
      for (const s of snows) if (s.x + wx > -200 && s.x + wx < W + 20) drawSnow(g, s, t, wx)
      for (let i = 0; i < sconces.length; i++) {
        const sx = sconces[i]! + wx
        if (sx < -120 || sx > W + 120) continue
        glow(g, world.halo, sx, 152, 92 + flicker(t, i) * 10, 0.85)
        flame(g, sx, 164, 22, flicker(t, i))
      }
      if (floor) put(g, floor, -c, GROUND - 20)

      for (let i = 0; i < SPOTS.length; i++) {
        const s = SPOTS[i]!
        const sx = s.x - c
        if (sx < -260 || sx > W + 260) continue
        const lift = bump[i]! * 10
        if (s.key === 'spiral') {
          if (door) put(g, door, sx - 190, GROUND - 400)
          // The one candle glowing beyond the door.
          const f = flicker(t, 20)
          glow(g, world.haloDark, sx, GROUND - 96, 120 + f * 14 + bump[i]! * 40, 0.9)
          g.fillStyle = '#f0cc7c'
          g.beginPath()
          g.roundRect(sx - 7, GROUND - 92, 14, 30, 4)
          g.fill()
          flame(g, sx, GROUND - 94, 26, f)
          continue
        }
        const top = GROUND - 400
        if (s.key === 'cave') {
          if (cave) put(g, cave, sx - 200, top + lift * 0.5)
          const f = flicker(t, 31)
          glow(g, world.halo, sx - 34, top + 258, 70 + f * 10 + bump[i]! * 30, 0.8)
          flame(g, sx - 34, top + 268, 13, f)
          lanternBody(g, sx - 34, top + 260, 0.5)
          continue
        }
        g.save()
        g.translate(0, lift)
        put(g, backs[i]!, sx - 220, top)
        // The stall's own lantern.
        const lx = sx - 220 + 92
        const f = flicker(t, i + 5)
        glow(g, world.halo, lx, top + 138, 78 + f * 10, 0.9)
        flame(g, lx, top + 148, 15, f)
        lanternBody(g, lx, top + 140, 0.62)
        g.restore()
        drawKeeper(g, i, sx, t)
        put(g, fronts[i]!, sx - 220, top + lift * 0.4)
      }

      for (const w of walkers) drawWalker(g, w, t)
      if (near) {
        const shift = (((c * NEAR) % NEAR_TILE) + NEAR_TILE) % NEAR_TILE
        for (let x = -shift; x < W; x += NEAR_TILE) put(g, near, x, 0)
      }
    },
    down(p: Pointer) {
      dragId = p.id
      dragged = 0
      camV = 0
      settling = false
      pressed = spotAt(p.x, p.y)
      if (pressed >= 0) {
        bumpV[pressed]! -= 5
        snd.wood(0.5)
        if (SPOTS[pressed]!.key === 'spiral') snd.lyre(-1, 0.5)
        return
      }
      // Someone walking by looks round, and walks on.
      for (const w of walkers) {
        if (Math.abs(p.x + cam - w.x) < 90 && p.y > w.y - 210 && p.y < w.y + 20) {
          w.pause = 1.6
          w.turn = 0
          snd.step()
          return
        }
      }
      world.quiet(p.x, p.y)
    },
    move(p: Pointer) {
      if (p.id !== dragId) return
      dragged += Math.abs(p.dx) + Math.abs(p.dy) * 0.5
      if (dragged > 14) {
        const over = cam < 0 || cam > WORLD_W - W
        cam -= p.dx * (over ? 0.35 : 1)
      }
    },
    up(p: Pointer) {
      if (p.id !== dragId) return
      dragId = -1
      if (dragged <= 22 && pressed >= 0) {
        world.go(SPOTS[pressed]!.key, SPOTS[pressed]!.x - cam, GROUND - 190)
      } else if (dragged > 22) {
        camV = clamp(-p.vx * 0.7, -1500, 1500)
      }
      pressed = -1
    },
  }
}
