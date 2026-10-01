// The little felt figures from the dish: two sheep, a shepherd child, a
// cottage, a gnome and a bird. Needle-felted like everything else, with
// barely a face. Each is drawn from its feet.

import { spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { TAU, feltBlob, feltEllipse, felted, gauss, put, rng, roundRectPath, sprite, strand, wash } from './felt.ts'
import type { G, RGB, Sprite } from './felt.ts'

export type FigKind = 'sheep' | 'child' | 'cottage' | 'gnome' | 'bird'

export interface Hop {
  fromX: number
  fromY: number
  toX: number
  toY: number
  t: number
  last: boolean
}

export interface Fig {
  kind: FigKind
  // 'dish': lying in its place. 'held': on the finger. 'home': gliding back
  // to the dish. 'felt': set in the picture (x, y are felt coordinates).
  where: 'dish' | 'held' | 'home' | 'felt'
  slot: number
  x: number
  y: number
  flip: 1 | -1
  phase: number
  // 1 at rest; below is squashed.
  squash: Spring
  // How far it has grown from its small size in the dish.
  size: number
  grazing: boolean
  nib: number
  duck: number
  hop: Hop | null
  wait: number
  perched: boolean
  lift: number
}

interface Part {
  s: Sprite
  ax: number
  ay: number
}

function part(w: number, h: number, ax: number, ay: number, paint: (g: G) => void): Part {
  return {
    s: sprite(w, h, (g) => {
      g.translate(ax, ay)
      paint(g)
    }),
    ax,
    ay,
  }
}

function putPart(g: G, p: Part, x = 0, y = 0, rot = 0): void {
  if (rot === 0) {
    g.drawImage(p.s.canvas, x - p.ax, y - p.ay, p.s.w, p.s.h)
    return
  }
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.drawImage(p.s.canvas, -p.ax, -p.ay, p.s.w, p.s.h)
  g.restore()
}

function dot(g: G, x: number, y: number, r: number, color: string): void {
  g.fillStyle = color
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fill()
}

const CREAM: RGB = [247, 240, 224]
const DARK: RGB = [92, 72, 64]
const SKIN: RGB = [243, 208, 180]
const WALNUT: RGB = [118, 82, 60]

export interface Folk {
  sheepBody: Part
  sheepHead: Part
  child: Part
  cottage: Part
  gnome: Part
  bird: Part
  smoke: Sprite
  shadow: Sprite
}

// How tall each stands, and how big it lies in the dish.
export const FIG: Record<FigKind, { h: number; w: number; dish: number }> = {
  sheep: { h: 56, w: 74, dish: 0.92 },
  child: { h: 84, w: 46, dish: 0.74 },
  cottage: { h: 114, w: 118, dish: 0.6 },
  gnome: { h: 84, w: 40, dish: 0.76 },
  bird: { h: 28, w: 40, dish: 1.25 },
}

export function makeFolk(): Folk {
  const rand = rng(4242)
  const firm = { soft: 1.8, plump: 0.75, lift: 0, density: 15, len: [4, 11] as const, fuzz: 0.8 }

  const sheepBody = part(110, 92, 55, 82, (g) => {
    for (const x of [-19, -9, 9, 19]) felted(g, roundRectPath(x - 3.5, -18, 7, 18, 3), { x: x - 4, y: -18, w: 8, h: 18 }, DARK, rand, { ...firm, len: [3, 7] })
    feltEllipse(g, -31, -37, 6.5, 5.5, CREAM, rand, { ...firm, spread: 3 })
    feltEllipse(g, 0, -33, 31, 21, CREAM, rand, { soft: 3, plump: 0.8, lift: 0, density: 20, len: [4, 10], spread: 3, fuzz: 1.6, flecks: [[226, 214, 196], [255, 252, 244]] })
    // Curls.
    g.strokeStyle = 'rgba(206,192,172,0.5)'
    g.lineWidth = 1
    for (let i = 0; i < 26; i++) {
      const x = gauss(rand) * 15
      const y = -33 + gauss(rand) * 10
      g.beginPath()
      g.arc(x, y, 2.4 + rand() * 2, rand() * TAU, rand() * TAU + 3.4)
      g.stroke()
    }
  })
  const sheepHead = part(52, 46, 14, 24, (g) => {
    feltEllipse(g, 12, 1, 12.5, 9.5, DARK, rand, firm, 0.3)
    feltEllipse(g, 2, -6, 6.5, 3.6, [80, 62, 56], rand, { ...firm, len: [3, 6] }, -0.5)
    feltEllipse(g, 6, -9, 6.5, 5, CREAM, rand, { ...firm, spread: 3, fuzz: 1.5 })
    dot(g, 15, -1.5, 1.3, 'rgba(250,244,230,0.85)')
  })

  const child = part(76, 112, 34, 104, (g) => {
    felted(g, roundRectPath(21, -88, 4.6, 88, 2.3), { x: 20, y: -88, w: 7, h: 88 }, WALNUT, rand, { ...firm, angle: Math.PI / 2, spread: 0.2, len: [5, 14] })
    feltEllipse(g, -6, -3, 5.5, 3.6, DARK, rand, { ...firm, len: [3, 6] })
    feltEllipse(g, 7, -3, 5.5, 3.6, DARK, rand, { ...firm, len: [3, 6] })
    const tunic: RGB = [98, 128, 176]
    feltBlob(g, [[-8, -54], [8, -54], [16, -24], [20, -7], [0, -3], [-20, -7], [-16, -24]], tunic, rand, { ...firm, soft: 2.2, angle: Math.PI / 2, spread: 0.35, len: [6, 16], flecks: [[132, 158, 196], [74, 100, 150]] })
    feltEllipse(g, 12, -38, 10, 4.4, [84, 112, 160], rand, { ...firm, len: [3, 8] }, -0.35)
    feltEllipse(g, 21.5, -42, 3.4, 3.4, SKIN, rand, { ...firm, len: [2, 4], fuzz: 0.3 })
    feltEllipse(g, 0, -63, 11.5, 11.5, SKIN, rand, { ...firm, soft: 2, plump: 0.8, len: [3, 7], fuzz: 0.4 })
    const straw: RGB = [230, 192, 112]
    feltEllipse(g, 0, -71, 17.5, 5.6, straw, rand, { ...firm, spread: 0.3, len: [5, 12] })
    feltEllipse(g, 0, -76, 9.5, 7, straw, rand, { ...firm, spread: 0.3, len: [4, 9] })
    dot(g, -4, -61.5, 1.15, 'rgba(84,60,54,0.75)')
    dot(g, 4, -61.5, 1.15, 'rgba(84,60,54,0.75)')
  })

  const cottage = part(156, 142, 78, 132, (g) => {
    felted(g, roundRectPath(24, -110, 15, 34, 4), { x: 24, y: -110, w: 15, h: 34 }, [156, 114, 94], rand, firm)
    felted(g, roundRectPath(-45, -64, 90, 64, 9), { x: -45, y: -64, w: 90, h: 64 }, [244, 230, 202], rand, { ...firm, soft: 2.6, len: [5, 15], flecks: [[226, 208, 176]] })
    feltBlob(g, [[-62, -52], [-32, -86], [0, -118], [32, -86], [62, -52], [32, -50], [0, -53], [-32, -50]], [192, 104, 86], rand, { ...firm, soft: 2.6, plump: 0.85, len: [7, 18], spread: 0.6, angle: Math.PI / 2, flecks: [[220, 140, 110], [160, 80, 74]], fuzz: 1.3 })
    felted(g, roundRectPath(-31, -40, 23, 40, 11), { x: -31, y: -40, w: 23, h: 40 }, WALNUT, rand, { ...firm, angle: Math.PI / 2, spread: 0.2 })
    felted(g, roundRectPath(7, -46, 25, 23, 6), { x: 7, y: -46, w: 25, h: 23 }, [240, 200, 118], rand, { ...firm, len: [3, 7], fuzz: 0.3 })
    g.strokeStyle = 'rgba(130,92,66,0.7)'
    g.lineWidth = 1.8
    strand(g, 19.5, -34.5, Math.PI / 2, 20, 0.6)
    strand(g, 19.5, -34.5, 0, 22, 0.6)
    dot(g, -13, -19, 1.6, 'rgba(240,210,150,0.9)')
  })

  const gnome = part(72, 104, 36, 94, (g) => {
    feltBlob(g, [[-13, -36], [13, -36], [19, -11], [16, -2], [0, 0], [-16, -2], [-19, -11]], [176, 126, 76], rand, { ...firm, soft: 2.2, angle: Math.PI / 2, spread: 0.4, len: [5, 13], flecks: [[204, 160, 104]] })
    feltEllipse(g, 0, -39, 9, 7, SKIN, rand, { ...firm, len: [2, 5], fuzz: 0.3 })
    feltEllipse(g, 0, -27, 12.5, 12.5, [250, 246, 236], rand, { soft: 2.6, plump: 0.6, lift: 0, density: 22, len: [4, 10], spread: 3, fuzz: 1.8 })
    feltEllipse(g, 0, -35.5, 3.1, 2.8, [236, 180, 160], rand, { ...firm, len: [2, 4], fuzz: 0.2 })
    feltBlob(g, [[-14, -41], [0, -47], [14, -41], [9, -58], [6, -74], [11, -86], [1, -82], [-6, -62]], [202, 78, 68], rand, { ...firm, soft: 2.2, plump: 0.85, angle: Math.PI / 2, spread: 0.4, len: [5, 13], flecks: [[226, 120, 96]] })
    dot(g, -3.6, -40.5, 1.05, 'rgba(84,60,54,0.75)')
    dot(g, 3.6, -40.5, 1.05, 'rgba(84,60,54,0.75)')
  })

  const bird = part(64, 52, 32, 44, (g) => {
    feltBlob(g, [[-24, -19], [-11, -19], [-9, -9], [-16, -11]], [112, 86, 72], rand, { ...firm, len: [3, 7] })
    feltEllipse(g, 0, -12, 15, 11, [156, 122, 98], rand, { ...firm, soft: 2, len: [3, 8] }, -0.15)
    feltEllipse(g, 6, -9, 8.5, 7, [226, 126, 86], rand, { ...firm, len: [3, 7], fuzz: 0.5 })
    feltEllipse(g, -4, -14, 9.5, 5.6, [112, 86, 72], rand, { ...firm, len: [3, 8] }, 0.3)
    feltBlob(g, [[13, -18.5], [22, -15.5], [13, -12.5]], [238, 184, 76], rand, { ...firm, soft: 1.2, len: [2, 4], fuzz: 0.2 })
    dot(g, 9, -17, 1.25, 'rgba(60,44,40,0.85)')
  })

  const smoke = sprite(64, 64, (g) => {
    wash(g, 33, 35, 23, 16, [150, 144, 152], 0.42)
    wash(g, 30, 30, 21, 15, [240, 236, 232], 0.8)
    wash(g, 38, 27, 12, 9, [255, 252, 248], 0.5)
    for (let i = 0; i < 46; i++) {
      g.strokeStyle = rand() < 0.7 ? 'rgb(252,250,246)' : 'rgb(176,170,176)'
      g.lineWidth = 0.5 + rand() * 0.8
      g.globalAlpha = 0.2 + rand() * 0.4
      const len = 10 + rand() * 20
      strand(g, 32 + gauss(rand) * 10, 31 + gauss(rand) * 7, rand() * TAU, len, gauss(rand) * len * 0.45)
    }
    g.globalAlpha = 1
  })
  const shadow = sprite(96, 32, (g) => wash(g, 48, 16, 44, 12, [46, 50, 58], 0.5))
  return { sheepBody, sheepHead, child, cottage, gnome, bird, smoke, shadow }
}

export function makeFigs(): Fig[] {
  const kinds: FigKind[] = ['sheep', 'sheep', 'child', 'cottage', 'gnome', 'bird']
  return kinds.map((kind, slot) => ({
    kind,
    where: 'dish',
    slot,
    x: 0,
    y: 0,
    flip: slot === 1 ? -1 : 1,
    phase: slot * 2.1 + 0.7,
    squash: spring(1, 160, 11),
    size: 0,
    grazing: false,
    nib: 0,
    duck: 0,
    hop: null,
    wait: 1.5,
    perched: false,
    lift: 0,
  }))
}

// Draw a figure with its feet at (x, y). `life` 0 lies still (in the dish, or
// in a small picture on the wall); `eve` 0..1 lights windows and lanterns.
export function drawFig(g: G, folk: Folk, glow: Sprite, f: Fig, x: number, y: number, scale: number, time: number, life: number, eve: number): void {
  const dim = FIG[f.kind]
  const k = f.squash.value
  g.save()
  g.translate(x, y)
  if (f.lift > 0.01 || f.where === 'felt') {
    g.globalAlpha = 0.5
    const sw = (dim.w / 96) * scale * 1.1 * (1 - f.lift * 0.25)
    g.drawImage(folk.shadow.canvas, -48 * sw + f.lift * 6, -8 * scale + f.lift * 18, 96 * sw, 28 * scale)
    g.globalAlpha = 1
  }
  g.scale(scale * f.flip, scale)
  g.scale(1 + (1 - k) * 0.6, k)
  const t = time + f.phase
  if (f.kind === 'sheep') {
    const breathe = 1 + 0.014 * Math.sin(t * 1.3) * life
    g.save()
    g.scale(1, breathe)
    putPart(g, folk.sheepBody)
    g.restore()
    const chew = Math.sin(t * 9) * 0.05 * f.nib
    const look = (1 - f.nib) * 0.1 * Math.sin(t * 0.45) * life
    putPart(g, folk.sheepHead, 24 + f.nib * 3, -40 + f.nib * 9, f.nib * 1.02 + chew + look)
  } else if (f.kind === 'child') {
    g.rotate(0.022 * Math.sin(t * 0.8) * life)
    putPart(g, folk.child)
    if (eve > 0.02) {
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = eve * (0.5 + 0.06 * Math.sin(t * 3.1))
      put(g, glow, -19, -30, 0, 0.42)
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = eve
      dot(g, -19, -30, 2.6, 'rgba(255,236,170,1)')
      g.globalAlpha = 1
    }
  } else if (f.kind === 'cottage') {
    putPart(g, folk.cottage)
    // Smoke from the chimney, in grey fleece.
    if (life > 0) {
      for (let i = 0; i < 5; i++) {
        const u = (t * 0.085 + i / 5) % 1
        g.globalAlpha = Math.min(1, Math.sin(u * Math.PI) * 1.2) * 0.9 * life
        put(g, folk.smoke, 31.5 + Math.sin(u * 5.2 + i * 1.7) * 14 * u + u * 12, -114 - u * 84, Math.sin(u * 3 + i) * 0.6, 0.4 + u * 0.8)
      }
      g.globalAlpha = 1
    }
    if (eve > 0.02) {
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = eve * (0.62 + 0.05 * Math.sin(t * 2.3))
      put(g, glow, 19.5, -34.5, 0, 0.62)
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
    }
  } else if (f.kind === 'gnome') {
    g.scale(1 + f.duck * 0.08, 1 - f.duck * 0.2)
    g.rotate(0.03 * Math.sin(t * 0.7) * life)
    putPart(g, folk.gnome)
    if (eve > 0.02) {
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = eve * (0.5 + 0.06 * Math.sin(t * 2.7))
      put(g, glow, 20, -20, 0, 0.36)
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = eve
      dot(g, 20, -20, 2.4, 'rgba(255,236,170,1)')
      g.globalAlpha = 1
    }
  } else {
    const bob = f.perched ? Math.sin(t * 2.2) * 0.06 * life : 0
    g.rotate(bob + (f.hop ? -0.25 : 0))
    putPart(g, folk.bird)
  }
  g.restore()
}
