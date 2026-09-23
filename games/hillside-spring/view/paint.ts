import * as THREE from 'three'

// Every texture in the garden is painted at startup, stroke by stroke, onto
// canvases (R12, R20: nothing is fetched). The light is painted in: grass is
// lit warm from the upper left, stones have sunny tops and cool undersides,
// canopies glow at the edge that faces the sun. Static scenery then renders
// unlit, so the painting is exactly what the child sees. A seeded random
// keeps the painting identical on every open.

export type Rect = { x: number; y: number; w: number; h: number }

export const ATLAS_SIZE = 2048

/** Named regions of the painted atlas, in pixels. */
export const REGION = {
  grass: { x: 0, y: 0, w: 512, h: 512 },
  grassSun: { x: 512, y: 0, w: 512, h: 512 },
  wall: { x: 1024, y: 0, w: 512, h: 512 },
  meadow: { x: 1536, y: 0, w: 512, h: 512 },
  soilDry: { x: 0, y: 512, w: 256, h: 256 },
  soilWet: { x: 256, y: 512, w: 256, h: 256 },
  rock: { x: 512, y: 512, w: 256, h: 256 },
  wood: { x: 768, y: 512, w: 256, h: 256 },
  bamboo: { x: 1024, y: 512, w: 256, h: 256 },
  thatch: { x: 1280, y: 512, w: 256, h: 256 },
  bank: { x: 1536, y: 512, w: 256, h: 256 },
  mat: { x: 1792, y: 512, w: 256, h: 256 },
  canopy: { x: 0, y: 768, w: 512, h: 512 },
  canopyDark: { x: 512, y: 768, w: 512, h: 512 },
  bush: { x: 1024, y: 768, w: 512, h: 256 },
  tuft: { x: 1024, y: 1024, w: 512, h: 256 },
  bambooGrove: { x: 1536, y: 768, w: 512, h: 512 },
  wildflowers: { x: 0, y: 1280, w: 512, h: 256 },
  reeds: { x: 512, y: 1280, w: 256, h: 256 },
  lily: { x: 768, y: 1280, w: 256, h: 256 },
  ring: { x: 1024, y: 1280, w: 256, h: 256 },
  blob: { x: 1280, y: 1280, w: 256, h: 256 },
  shaft: { x: 1536, y: 1280, w: 256, h: 256 },
  sprites: { x: 1792, y: 1280, w: 256, h: 256 },
  farHills: { x: 0, y: 1536, w: 2048, h: 512 },
} as const satisfies Record<string, Rect>

export type RegionName = keyof typeof REGION

export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Ctx = CanvasRenderingContext2D

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${h.toFixed(1)},${(s * 100).toFixed(1)}%,${(l * 100).toFixed(1)}%,${a.toFixed(3)})`
}

/** One loaded-brush stroke: a tapered curve with a lighter bristle line along it. */
function stroke(ctx: Ctx, x: number, y: number, angle: number, length: number, width: number, colour: string, alpha: number, bend: number, bristle?: string): void {
  const dx = Math.cos(angle) * length
  const dy = Math.sin(angle) * length
  const nx = -Math.sin(angle) * bend * length
  const ny = Math.cos(angle) * bend * length
  ctx.globalAlpha = alpha
  ctx.strokeStyle = colour
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + dx / 2 + nx, y + dy / 2 + ny, x + dx, y + dy)
  ctx.stroke()
  if (bristle) {
    ctx.globalAlpha = alpha * 0.55
    ctx.strokeStyle = bristle
    ctx.lineWidth = Math.max(1, width * 0.28)
    const ox = -Math.sin(angle) * width * 0.22
    const oy = Math.cos(angle) * width * 0.22
    ctx.beginPath()
    ctx.moveTo(x + ox, y + oy)
    ctx.quadraticCurveTo(x + dx / 2 + nx + ox, y + dy / 2 + ny + oy, x + dx * 0.9 + ox, y + dy * 0.9 + oy)
    ctx.stroke()
  }
}

/** A soft round dab of paint. */
function dab(ctx: Ctx, x: number, y: number, r: number, colour: string, alpha: number): void {
  ctx.globalAlpha = alpha
  ctx.fillStyle = colour
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

/** An irregular blob (a stone, a leaf clump) as a wobbly closed path. */
function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, wobble: number, random: () => number, colour: string, alpha: number): void {
  ctx.globalAlpha = alpha
  ctx.fillStyle = colour
  ctx.beginPath()
  const n = 10
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const k = 1 + (random() - 0.5) * wobble
    const px = x + Math.cos(a) * rx * k
    const py = y + Math.sin(a) * ry * k
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

function clipTo(ctx: Ctx, r: Rect, draw: () => void): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(r.x, r.y, r.w, r.h)
  ctx.clip()
  draw()
  ctx.restore()
  ctx.globalAlpha = 1
}

/** Wraps a coordinate into the region so strokes that leave one edge re-enter the other (tileable). */
function wrapStroke(r: Rect, x: number, y: number, draw: (x: number, y: number) => void, margin: number): void {
  draw(x, y)
  if (x - r.x < margin) draw(x + r.w, y)
  if (r.x + r.w - x < margin) draw(x - r.w, y)
  if (y - r.y < margin) draw(x, y + r.h)
  if (r.y + r.h - y < margin) draw(x, y - r.h)
}

/**
 * Grass as a painter would lay it: a flat ground colour, broad soft washes of
 * warm light and cool shade, then short upward flicks, then a few sun flecks.
 * Garden cells get a soft darker rim so the grid reads without drawn lines.
 */
function paintGrass(ctx: Ctx, r: Rect, random: () => number, sunny: boolean, edged: boolean): void {
  clipTo(ctx, r, () => {
    ctx.fillStyle = sunny ? hsl(70, 0.34, 0.54) : hsl(82, 0.28, 0.46)
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.lineCap = 'round'
    for (let i = 0; i < 26; i++) {
      const x = r.x + random() * r.w
      const y = r.y + random() * r.h
      const warm = random() > 0.5
      const colour = sunny ? (warm ? hsl(56, 0.44, 0.66) : hsl(88, 0.24, 0.44)) : warm ? hsl(66, 0.34, 0.55) : hsl(104, 0.2, 0.36)
      wrapStroke(r, x, y, (px, py) => dab(ctx, px, py, 60 + random() * 80, colour, 0.14), 140)
    }
    for (let i = 0; i < 460; i++) {
      const x = r.x + random() * r.w
      const y = r.y + random() * r.h
      const light = (sunny ? 0.46 : 0.38) + random() * 0.2
      const hue = 62 + random() * 34 - (light - 0.4) * 30
      const angle = -Math.PI / 2 - 0.35 + (random() - 0.5) * 0.7
      wrapStroke(r, x, y, (px, py) => stroke(ctx, px, py, angle, 16 + random() * 22, 6 + random() * 7, hsl(hue, 0.26 + random() * 0.14, light), 0.3 + random() * 0.25, (random() - 0.5) * 0.4), 50)
    }
    for (let i = 0; i < 640; i++) {
      const x = r.x + random() * r.w
      const y = r.y + random() * r.h
      const light = 0.34 + random() * 0.3
      const hue = 70 + random() * 28
      const angle = -Math.PI / 2 + (random() - 0.5) * 0.8
      wrapStroke(r, x, y, (px, py) => stroke(ctx, px, py, angle, 8 + random() * 12, 2 + random() * 2, hsl(hue, 0.34, light), 0.45 + random() * 0.3, (random() - 0.5) * 0.5), 24)
    }
    const flecks = sunny ? 120 : 30
    for (let i = 0; i < flecks; i++) {
      const x = r.x + random() * r.w
      const y = r.y + random() * r.h
      wrapStroke(r, x, y, (px, py) => stroke(ctx, px, py, -Math.PI / 2 - 0.5 + random() * 0.3, 6 + random() * 8, 2 + random() * 2, hsl(54 + random() * 8, 0.52, 0.78), 0.5, 0.2), 20)
    }
    for (let i = 0; i < 10; i++) {
      const x = r.x + random() * r.w
      const y = r.y + random() * r.h
      wrapStroke(r, x, y, (px, py) => dab(ctx, px, py, 2 + random() * 2, random() > 0.6 ? hsl(48, 0.7, 0.72) : hsl(40, 0.2, 0.94), 0.8), 8)
    }
    if (edged) {
      const edge = 34
      const shade = hsl(96, 0.24, 0.26, 0.3)
      const clear = hsl(96, 0.24, 0.26, 0)
      for (const [x0, y0, x1, y1] of [
        [r.x, 0, r.x + edge, 0],
        [r.x + r.w, 0, r.x + r.w - edge, 0],
        [0, r.y, 0, r.y + edge],
        [0, r.y + r.h, 0, r.y + r.h - edge],
      ]) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1)
        g.addColorStop(0, shade)
        g.addColorStop(1, clear)
        ctx.globalAlpha = 1
        ctx.fillStyle = g
        ctx.fillRect(r.x, r.y, r.w, r.h)
      }
    }
  })
}

function paintWall(ctx: Ctx, r: Rect, random: () => number): void {
  // Dry-laid field stones, warm ochre-grey, lit from above: sunny tops, cool
  // undersides, soft moss along the upper edges, and a grass fringe spilling over.
  // Soft joints and a narrow value range: the walls repeat across the whole
  // frame, so any stronger and they out-shout the bamboo laid between them.
  clipTo(ctx, r, () => {
    ctx.fillStyle = hsl(36, 0.14, 0.4)
    ctx.fillRect(r.x, r.y, r.w, r.h)
    const rows = 4
    const rowH = r.h / rows
    for (let row = 0; row < rows; row++) {
      let x = r.x - random() * 60
      while (x < r.x + r.w + 60) {
        const w = 46 + random() * 100
        const h = rowH * (0.36 + random() * 0.2)
        const cx = x + w / 2
        const cy = r.y + rowH * (row + 0.5) + (random() - 0.5) * rowH * 0.14
        const hue = 30 + random() * 16
        const base = 0.49 + random() * 0.08
        const sat = 0.1 + random() * 0.08
        const draw = (ox: number) => {
          blob(ctx, cx + ox + 2, cy + h * 0.16, w / 2, h, 0.34, random, hsl(hue + 180, 0.08, 0.26), 0.3)
          blob(ctx, cx + ox, cy, w / 2, h, 0.34, random, hsl(hue, sat, base * 0.86), 1)
          blob(ctx, cx + ox - 2, cy - h * 0.12, w / 2 - 5, h * 0.8, 0.3, random, hsl(hue + 4, sat + 0.02, base), 1)
          for (let s = 0; s < 6; s++) stroke(ctx, cx + ox - w * 0.36 + random() * w * 0.44, cy - h * 0.55 + random() * h * 0.3, -0.1 + random() * 0.2, w * (0.2 + random() * 0.3), 4 + random() * 6, hsl(hue + 8, sat + 0.12, base + 0.1), 0.5, 0.1)
          for (let s = 0; s < 3; s++) stroke(ctx, cx + ox - w * 0.3 + random() * w * 0.5, cy + h * 0.5 + random() * h * 0.1, random() * 0.2, w * 0.28, 4, hsl(220, 0.1, base * 0.74), 0.35, -0.1)
          if (random() > 0.5) for (let m = 0; m < 6; m++) dab(ctx, cx + ox - w * 0.34 + random() * w * 0.5, cy - h * 0.72 + random() * 10, 4 + random() * 7, hsl(76 + random() * 18, 0.3, 0.38 + random() * 0.12), 0.55)
        }
        draw(0)
        if (cx - r.x < w) draw(r.w)
        if (r.x + r.w - cx < w) draw(-r.w)
        x += w + 2 + random() * 5
      }
    }
    for (let i = 0; i < 110; i++) {
      const x = r.x + random() * r.w
      stroke(ctx, x, r.y - 4, Math.PI / 2 + (random() - 0.5) * 0.7, 12 + random() * 30, 3 + random() * 4, hsl(72 + random() * 20, 0.3, 0.36 + random() * 0.2), 0.85, (random() - 0.5) * 0.6)
    }
  })
}

function paintSoil(ctx: Ctx, r: Rect, random: () => number, wet: boolean): void {
  // Dry is sun-baked clay, lighter and warmer than the terrace grass and crazed with dark cracks; wet is dark, rich loam.
  clipTo(ctx, r, () => {
    ctx.fillStyle = wet ? hsl(22, 0.34, 0.22) : hsl(34, 0.36, 0.6)
    ctx.fillRect(r.x, r.y, r.w, r.h)
    for (let i = 0; i < 40; i++) dab(ctx, r.x + random() * r.w, r.y + random() * r.h, 14 + random() * 30, wet ? hsl(20, 0.3, 0.16 + random() * 0.08) : hsl(32, 0.34, 0.56 + random() * 0.14), 0.3)
    for (let i = 0; i < 7; i++) {
      const y = r.y + (i + 0.5) * (r.h / 7)
      for (let k = 0; k < 6; k++) stroke(ctx, r.x + random() * r.w, y + (random() - 0.5) * 6, (random() - 0.5) * 0.08, 40 + random() * 60, 9 + random() * 5, wet ? hsl(20, 0.36, 0.12) : hsl(28, 0.32, 0.48), 0.5, 0.02, wet ? hsl(26, 0.3, 0.3) : hsl(40, 0.42, 0.74))
    }
    if (wet) {
      for (let i = 0; i < 40; i++) stroke(ctx, r.x + random() * r.w, r.y + random() * r.h, (random() - 0.5) * 0.3, 8 + random() * 20, 2 + random() * 2, hsl(200, 0.3, 0.75), 0.5, 0)
    } else {
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (let i = 0; i < 22; i++) {
        let x = r.x + random() * r.w
        let y = r.y + random() * r.h
        let angle = random() * Math.PI * 2
        ctx.globalAlpha = 0.75
        ctx.strokeStyle = hsl(22, 0.34, 0.28)
        ctx.lineWidth = 2 + random() * 2.2
        ctx.beginPath()
        ctx.moveTo(x, y)
        for (let k = 0; k < 6; k++) {
          angle += (random() - 0.5) * 1.4
          x += Math.cos(angle) * (10 + random() * 16)
          y += Math.sin(angle) * (10 + random() * 16)
          ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.globalAlpha = 0.4
        ctx.strokeStyle = hsl(40, 0.45, 0.8)
        ctx.lineWidth = 1
        ctx.translate(1.5, 1.5)
        ctx.stroke()
        ctx.translate(-1.5, -1.5)
      }
    }
  })
}

function paintRock(ctx: Ctx, r: Rect, random: () => number): void {
  clipTo(ctx, r, () => {
    ctx.fillStyle = hsl(34, 0.09, 0.5)
    ctx.fillRect(r.x, r.y, r.w, r.h)
    for (let i = 0; i < 120; i++) {
      const y = r.y + random() * r.h
      const up = 1 - (y - r.y) / r.h
      const light = 0.36 + up * 0.36 + random() * 0.08
      const hue = up > 0.5 ? 32 + random() * 14 : 250 + random() * 20
      stroke(ctx, r.x + random() * r.w, y, (random() - 0.5) * 0.8, 20 + random() * 40, 8 + random() * 10, hsl(hue, up > 0.5 ? 0.16 : 0.08, light), 0.5, 0.1)
    }
    for (let i = 0; i < 30; i++) dab(ctx, r.x + random() * r.w, r.y + random() * r.h * 0.4, 6 + random() * 10, hsl(92, 0.4, 0.4 + random() * 0.1), 0.6)
  })
}

function paintWood(ctx: Ctx, r: Rect, random: () => number): void {
  clipTo(ctx, r, () => {
    ctx.fillStyle = hsl(28, 0.42, 0.42)
    ctx.fillRect(r.x, r.y, r.w, r.h)
    const planks = 4
    for (let p = 0; p < planks; p++) {
      const y0 = r.y + (p * r.h) / planks
      ctx.globalAlpha = 1
      ctx.fillStyle = hsl(26 + random() * 8, 0.42, 0.4 + random() * 0.08)
      ctx.fillRect(r.x, y0 + 2, r.w, r.h / planks - 4)
      for (let i = 0; i < 30; i++) stroke(ctx, r.x - 20 + random() * r.w, y0 + 6 + random() * (r.h / planks - 12), (random() - 0.5) * 0.05, 60 + random() * 120, 2 + random() * 3, random() > 0.5 ? hsl(24, 0.45, 0.3) : hsl(34, 0.5, 0.58), 0.45, 0.02)
      stroke(ctx, r.x, y0 + 6, 0, r.w, 3, hsl(38, 0.55, 0.66), 0.6, 0)
      ctx.globalAlpha = 0.8
      ctx.fillStyle = hsl(20, 0.4, 0.18)
      ctx.fillRect(r.x, y0, r.w, 2)
    }
  })
}

function paintBamboo(ctx: Ctx, r: Rect, random: () => number): void {
  // Across u: the skin around the culm; along v: its length, with two nodes.
  // Seasoned bamboo, warm gold all round: no green in it, so even its shaded side never matches the yellow-green grass.
  clipTo(ctx, r, () => {
    const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0)
    g.addColorStop(0, hsl(36, 0.58, 0.46))
    g.addColorStop(0.3, hsl(42, 0.72, 0.66))
    g.addColorStop(0.5, hsl(46, 0.8, 0.78))
    g.addColorStop(0.75, hsl(42, 0.66, 0.6))
    g.addColorStop(1, hsl(36, 0.56, 0.44))
    ctx.globalAlpha = 1
    ctx.fillStyle = g
    ctx.fillRect(r.x, r.y, r.w, r.h)
    for (let i = 0; i < 70; i++) stroke(ctx, r.x + random() * r.w, r.y + random() * r.h, Math.PI / 2 + (random() - 0.5) * 0.04, 30 + random() * 60, 2 + random() * 3, random() > 0.5 ? hsl(46, 0.8, 0.84) : hsl(34, 0.5, 0.42), 0.35, 0)
    for (const v of [0.22, 0.72]) {
      const y = r.y + r.h * v
      ctx.globalAlpha = 0.9
      ctx.fillStyle = hsl(40, 0.45, 0.36)
      ctx.fillRect(r.x, y - 5, r.w, 10)
      ctx.fillStyle = hsl(50, 0.7, 0.86)
      ctx.fillRect(r.x, y - 9, r.w, 4)
    }
  })
}

function paintThatch(ctx: Ctx, r: Rect, random: () => number): void {
  clipTo(ctx, r, () => {
    ctx.fillStyle = hsl(38, 0.5, 0.42)
    ctx.fillRect(r.x, r.y, r.w, r.h)
    for (let i = 0; i < 500; i++) {
      const y = r.y + random() * r.h
      stroke(ctx, r.x + random() * r.w, y, Math.PI / 2 + (random() - 0.5) * 0.3, 18 + random() * 26, 2 + random() * 2.5, hsl(40 + random() * 10, 0.55, 0.36 + random() * 0.3), 0.7, 0.1)
    }
  })
}

function paintBank(ctx: Ctx, r: Rect, random: () => number): void {
  clipTo(ctx, r, () => {
    ctx.fillStyle = hsl(34, 0.3, 0.42)
    ctx.fillRect(r.x, r.y, r.w, r.h)
    for (let i = 0; i < 160; i++) stroke(ctx, r.x + random() * r.w, r.y + random() * r.h, (random() - 0.5) * 0.4, 14 + random() * 30, 6 + random() * 8, hsl(30 + random() * 14, 0.3, 0.34 + random() * 0.2), 0.5, 0.1)
    for (let i = 0; i < 60; i++) dab(ctx, r.x + random() * r.w, r.y + random() * r.h, 3 + random() * 5, hsl(210, 0.08, 0.55 + random() * 0.2), 0.7)
  })
}

function paintMat(ctx: Ctx, r: Rect, random: () => number): void {
  // An indigo-dyed woven cloth for the rack: the complement of the gold bamboo, so the pieces waiting there are the brightest things at the foot of the hill.
  clipTo(ctx, r, () => {
    ctx.fillStyle = hsl(222, 0.3, 0.2)
    ctx.fillRect(r.x, r.y, r.w, r.h)
    const n = 8
    const s = r.w / n
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const over = (i + j) % 2 === 0
        const x = r.x + i * s
        const y = r.y + j * s
        ctx.globalAlpha = 1
        ctx.fillStyle = over ? hsl(220, 0.3, 0.33 + random() * 0.04) : hsl(224, 0.28, 0.26 + random() * 0.04)
        if (over) ctx.fillRect(x + 1, y + 3, s - 2, s - 6)
        else ctx.fillRect(x + 3, y + 1, s - 6, s - 2)
        stroke(ctx, over ? x + 3 : x + s / 2, over ? y + s / 2 : y + 3, over ? 0 : Math.PI / 2, s - 6, 2, hsl(214, 0.28, 0.48), 0.4, 0)
      }
    }
    ctx.globalAlpha = 0.5
    ctx.fillStyle = hsl(40, 0.3, 0.86)
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 6; k++) ctx.fillRect(r.x + i * s + s / 2 - 1, r.y + k * (r.h / 6) + 6, 2, r.h / 12)
    }
  })
}

function paintCanopy(ctx: Ctx, r: Rect, random: () => number, dark: boolean): void {
  clipTo(ctx, r, () => {
    const cx = r.x + r.w / 2
    const cy = r.y + r.h * 0.5
    const R = r.w * 0.44
    const clumps: { x: number; y: number; s: number }[] = []
    for (let i = 0; i < 26; i++) {
      const a = random() * Math.PI * 2
      const d = Math.sqrt(random()) * R * 0.78
      clumps.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.86, s: R * (0.24 + random() * 0.16) })
    }
    clumps.sort((a, b) => a.y - b.y)
    const hue = dark ? 128 : 104
    for (const c of clumps) blob(ctx, c.x, c.y + c.s * 0.1, c.s, c.s * 0.9, 0.35, random, hsl(hue + 20, 0.4, dark ? 0.16 : 0.2), 1)
    for (const c of clumps) {
      blob(ctx, c.x, c.y, c.s * 0.92, c.s * 0.8, 0.35, random, hsl(hue, 0.42, dark ? 0.24 : 0.3), 1)
      const lit = Math.max(0, (cx - c.x) / R * 0.5 + (cy - c.y) / R * 0.7 + 0.3)
      for (let k = 0; k < 9; k++) {
        const a = -2.3 + (random() - 0.5) * 1.4
        const d = c.s * (0.2 + random() * 0.5)
        stroke(ctx, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, random() * Math.PI, 8 + random() * 14, 5 + random() * 6, hsl(hue - 22 + lit * 10, 0.55, (dark ? 0.32 : 0.4) + lit * 0.22), 0.65, 0.3)
      }
      if (lit > 0.35) for (let k = 0; k < 4; k++) stroke(ctx, c.x - c.s * 0.35 + random() * c.s * 0.3, c.y - c.s * 0.45 + random() * c.s * 0.2, random() * Math.PI, 6 + random() * 8, 4, hsl(64, 0.7, 0.66), 0.7, 0.3)
    }
  })
}

function paintBush(ctx: Ctx, r: Rect, random: () => number): void {
  clipTo(ctx, r, () => {
    for (let i = 0; i < 40; i++) {
      const x = r.x + 30 + random() * (r.w - 60)
      const y = r.y + r.h * 0.45 + random() * r.h * 0.4
      const s = 26 + random() * 34
      blob(ctx, x, y, s, s * 0.8, 0.4, random, hsl(112, 0.26, 0.24 + random() * 0.08), 1)
    }
    for (let i = 0; i < 160; i++) {
      const x = r.x + 30 + random() * (r.w - 60)
      const y = r.y + r.h * 0.3 + random() * r.h * 0.5
      const lit = 1 - (y - r.y) / r.h
      stroke(ctx, x, y, random() * Math.PI, 8 + random() * 10, 5 + random() * 4, hsl(94 - lit * 22, 0.34, 0.3 + lit * 0.3), 0.7, 0.3)
    }
    for (let i = 0; i < 24; i++) dab(ctx, r.x + 40 + random() * (r.w - 80), r.y + r.h * 0.3 + random() * r.h * 0.4, 4 + random() * 3, random() > 0.5 ? hsl(340, 0.42, 0.8) : hsl(40, 0.3, 0.92), 0.9)
  })
}

function paintTuft(ctx: Ctx, r: Rect, random: () => number): void {
  clipTo(ctx, r, () => {
    ctx.lineCap = 'round'
    for (let i = 0; i < 260; i++) {
      const x = r.x + 10 + random() * (r.w - 20)
      const base = r.y + r.h - 4
      const len = r.h * (0.3 + random() * 0.6)
      const lean = (random() - 0.5) * 0.7
      const light = 0.3 + random() * 0.35
      stroke(ctx, x, base, -Math.PI / 2 + lean, len, 3 + random() * 3, hsl(80 + random() * 30, 0.5, light), 0.9, (random() - 0.5) * 0.4, hsl(70, 0.6, light + 0.18))
    }
  })
}

function paintGrove(ctx: Ctx, r: Rect, random: () => number): void {
  clipTo(ctx, r, () => {
    for (let i = 0; i < 9; i++) {
      const x = r.x + 30 + i * ((r.w - 60) / 8) + (random() - 0.5) * 20
      const w = 10 + random() * 8
      ctx.globalAlpha = 1
      ctx.fillStyle = hsl(78, 0.4, 0.36 + random() * 0.1)
      ctx.fillRect(x - w / 2, r.y + r.h * 0.05, w, r.h * 0.95)
      ctx.fillStyle = hsl(70, 0.55, 0.6)
      ctx.fillRect(x - w / 2, r.y + r.h * 0.05, w * 0.3, r.h * 0.95)
      for (let n = 0; n < 6; n++) {
        ctx.fillStyle = hsl(60, 0.4, 0.26)
        ctx.fillRect(x - w / 2 - 1, r.y + r.h * (0.1 + n * 0.16), w + 2, 3)
      }
    }
    for (let i = 0; i < 420; i++) {
      const x = r.x + random() * r.w
      const y = r.y + random() * r.h * 0.7
      const lit = 1 - (y - r.y) / (r.h * 0.7)
      stroke(ctx, x, y, 0.3 + random() * 0.6 + (random() > 0.5 ? Math.PI * 0.6 : 0), 16 + random() * 14, 4 + random() * 3, hsl(90 - lit * 14, 0.5, 0.26 + lit * 0.28), 0.8, 0.25)
    }
  })
}

function paintWildflowers(ctx: Ctx, r: Rect, random: () => number): void {
  clipTo(ctx, r, () => {
    for (let i = 0; i < 90; i++) {
      const x = r.x + 10 + random() * (r.w - 20)
      const len = r.h * (0.3 + random() * 0.5)
      const top = r.y + r.h - len
      stroke(ctx, x, r.y + r.h, -Math.PI / 2 + (random() - 0.5) * 0.3, len, 2.5, hsl(100, 0.45, 0.32), 0.9, (random() - 0.5) * 0.3)
      const hue = [48, 330, 280, 0, 200][Math.floor(random() * 5)]
      for (let p = 0; p < 5; p++) dab(ctx, x + Math.cos(p * 1.26) * 5, top + Math.sin(p * 1.26) * 5, 4, hsl(hue, 0.7, 0.72), 0.95)
      dab(ctx, x, top, 3, hsl(45, 0.9, 0.55), 1)
    }
  })
}

function paintReeds(ctx: Ctx, r: Rect, random: () => number): void {
  clipTo(ctx, r, () => {
    for (let i = 0; i < 70; i++) {
      const x = r.x + 10 + random() * (r.w - 20)
      const len = r.h * (0.5 + random() * 0.45)
      stroke(ctx, x, r.y + r.h, -Math.PI / 2 + (random() - 0.5) * 0.4, len, 4, hsl(88, 0.45, 0.28 + random() * 0.25), 0.95, (random() - 0.5) * 0.3, hsl(70, 0.55, 0.62))
    }
  })
}

function paintLily(ctx: Ctx, r: Rect, random: () => number): void {
  clipTo(ctx, r, () => {
    const cx = r.x + r.w / 2
    const cy = r.y + r.h / 2
    ctx.globalAlpha = 1
    ctx.fillStyle = hsl(110, 0.45, 0.32)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r.w * 0.46, 0.25, Math.PI * 2 - 0.25)
    ctx.closePath()
    ctx.fill()
    for (let i = 0; i < 40; i++) {
      const a = 0.3 + random() * (Math.PI * 2 - 0.6)
      stroke(ctx, cx, cy, a, r.w * (0.2 + random() * 0.24), 4, hsl(96, 0.5, 0.4 + random() * 0.18), 0.5, 0)
    }
  })
}

function paintRing(ctx: Ctx, r: Rect): void {
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r.w / 2)
  g.addColorStop(0, 'rgba(255,240,190,0.06)')
  g.addColorStop(0.55, 'rgba(255,236,170,0.16)')
  g.addColorStop(0.78, 'rgba(255,250,225,1)')
  g.addColorStop(0.9, 'rgba(255,220,140,0.45)')
  g.addColorStop(1, 'rgba(255,220,140,0)')
  ctx.globalAlpha = 1
  ctx.fillStyle = g
  ctx.fillRect(r.x, r.y, r.w, r.h)
}

function paintBlob(ctx: Ctx, r: Rect): void {
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r.w / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.7)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.globalAlpha = 1
  ctx.fillStyle = g
  ctx.fillRect(r.x, r.y, r.w, r.h)
}

function paintShaft(ctx: Ctx, r: Rect): void {
  const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.8)')
  g.addColorStop(0.5, 'rgba(255,255,255,1)')
  g.addColorStop(0.65, 'rgba(255,255,255,0.8)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.globalAlpha = 1
  ctx.fillStyle = g
  ctx.fillRect(r.x, r.y, r.w, r.h)
  const v = ctx.createLinearGradient(0, r.y, 0, r.y + r.h)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(0.25, 'rgba(0,0,0,1)')
  v.addColorStop(1, 'rgba(0,0,0,1)')
  // destination-in clears everything outside the drawn shape, so it must stay clipped to the region.
  clipTo(ctx, r, () => {
    ctx.globalCompositeOperation = 'destination-in'
    ctx.fillStyle = v
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.globalCompositeOperation = 'source-over'
  })
}

/** Four particle sprites in quadrants: soft dot, petal, sparkle, puff. */
function paintSprites(ctx: Ctx, r: Rect): void {
  const q = r.w / 2
  const soft = ctx.createRadialGradient(r.x + q / 2, r.y + q / 2, 0, r.x + q / 2, r.y + q / 2, q / 2)
  soft.addColorStop(0, 'rgba(255,255,255,1)')
  soft.addColorStop(0.4, 'rgba(255,255,255,0.6)')
  soft.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.globalAlpha = 1
  ctx.fillStyle = soft
  ctx.fillRect(r.x, r.y, q, q)
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.beginPath()
  ctx.ellipse(r.x + q * 1.5, r.y + q / 2, q * 0.2, q * 0.4, 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.translate(r.x + q / 2, r.y + q * 1.5)
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4)
    ctx.beginPath()
    ctx.ellipse(0, 0, q * 0.45, q * 0.06, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  const puff = ctx.createRadialGradient(r.x + q * 1.5, r.y + q * 1.5, 0, r.x + q * 1.5, r.y + q * 1.5, q / 2)
  puff.addColorStop(0, 'rgba(255,255,255,0.9)')
  puff.addColorStop(0.7, 'rgba(255,255,255,0.35)')
  puff.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = puff
  ctx.fillRect(r.x + q, r.y + q, q, q)
}

function paintFarHills(ctx: Ctx, r: Rect, random: () => number): void {
  clipTo(ctx, r, () => {
    // Farthest first: paler and bluer with distance, rounder and busier up close.
    const layers = [
      { top: 0.16, amp: 0.2, humps: 2.6, colour: hsl(214, 0.26, 0.8), lit: hsl(206, 0.34, 0.88) },
      { top: 0.32, amp: 0.18, humps: 3.8, colour: hsl(196, 0.22, 0.7), lit: hsl(184, 0.26, 0.78) },
      { top: 0.5, amp: 0.15, humps: 5.4, colour: hsl(160, 0.18, 0.6), lit: hsl(140, 0.22, 0.7) },
    ]
    for (const layer of layers) {
      const phase = random()
      const phase2 = random()
      const height = (u: number) => {
        const dome = Math.pow(0.5 + 0.5 * Math.cos(Math.PI * 2 * (u * layer.humps + phase)), 1.4)
        const knoll = 0.5 + 0.5 * Math.cos(Math.PI * 2 * (u * layer.humps * 2.3 + phase2))
        return layer.top + layer.amp * (1 - 0.72 * dome - 0.28 * knoll)
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = layer.colour
      ctx.beginPath()
      ctx.moveTo(r.x, r.y + r.h)
      for (let i = 0; i <= 256; i++) ctx.lineTo(r.x + (i / 256) * r.w, r.y + height(i / 256) * r.h)
      ctx.lineTo(r.x + r.w, r.y + r.h)
      ctx.closePath()
      ctx.fill()
      for (let i = 0; i < 220; i++) {
        const u = random()
        stroke(ctx, r.x + u * r.w, r.y + (height(u) + 0.015 + random() * 0.07) * r.h, -0.25 + random() * 0.5, 18 + random() * 36, 5 + random() * 6, layer.lit, 0.4, 0.1)
      }
    }
  })
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

function texture(canvas: HTMLCanvasElement, wrap = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.needsUpdate = true
  return t
}

export function paintAtlas(): THREE.CanvasTexture {
  const canvas = makeCanvas(ATLAS_SIZE, ATLAS_SIZE)
  const ctx = canvas.getContext('2d')!
  const random = rng(20260923)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  paintGrass(ctx, REGION.grass, random, false, true)
  paintGrass(ctx, REGION.grassSun, random, true, true)
  paintWall(ctx, REGION.wall, random)
  paintGrass(ctx, REGION.meadow, random, true, false)
  paintSoil(ctx, REGION.soilDry, random, false)
  paintSoil(ctx, REGION.soilWet, random, true)
  paintRock(ctx, REGION.rock, random)
  paintWood(ctx, REGION.wood, random)
  paintBamboo(ctx, REGION.bamboo, random)
  paintThatch(ctx, REGION.thatch, random)
  paintBank(ctx, REGION.bank, random)
  paintMat(ctx, REGION.mat, random)
  paintCanopy(ctx, REGION.canopy, random, false)
  paintCanopy(ctx, REGION.canopyDark, random, true)
  paintBush(ctx, REGION.bush, random)
  paintTuft(ctx, REGION.tuft, random)
  paintGrove(ctx, REGION.bambooGrove, random)
  paintWildflowers(ctx, REGION.wildflowers, random)
  paintReeds(ctx, REGION.reeds, random)
  paintLily(ctx, REGION.lily, random)
  paintRing(ctx, REGION.ring)
  paintBlob(ctx, REGION.blob)
  paintShaft(ctx, REGION.shaft)
  paintSprites(ctx, REGION.sprites)
  paintFarHills(ctx, REGION.farHills, random)
  const t = texture(canvas)
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  return t
}

/**
 * The sky: a warm afternoon gradient with cumulus lit gold on top and
 * blue-grey beneath. The top of the painting is the top of the screen and
 * only its upper band shows above the hill, so the clouds live up there.
 * Wraps across so they can drift.
 */
export function paintSky(): THREE.CanvasTexture {
  const w = 1024
  const h = 512
  const canvas = makeCanvas(w, h)
  const ctx = canvas.getContext('2d')!
  const random = rng(77)
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, hsl(204, 0.42, 0.64))
  g.addColorStop(0.16, hsl(198, 0.38, 0.75))
  g.addColorStop(0.34, hsl(46, 0.46, 0.86))
  g.addColorStop(1, hsl(40, 0.46, 0.84))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.lineCap = 'round'
  for (let i = 0; i < 70; i++) stroke(ctx, random() * w, random() * h * 0.3, (random() - 0.5) * 0.3, 60 + random() * 120, 14 + random() * 20, hsl(202, 0.4, 0.66 + random() * 0.12), 0.14, 0.05)
  const clouds = [
    { x: 0.1, y: 0.2, s: 0.75 },
    { x: 0.36, y: 0.16, s: 0.5 },
    { x: 0.62, y: 0.22, s: 0.85 },
    { x: 0.88, y: 0.15, s: 0.45 },
  ]
  for (const cloud of clouds) {
    const puffs: { x: number; y: number; r: number }[] = []
    for (let i = 0; i < 26; i++) {
      const a = random()
      const rr = (26 + random() * 36) * cloud.s
      puffs.push({ x: cloud.x * w + (a - 0.5) * 240 * cloud.s, y: cloud.y * h - Math.sin(a * Math.PI) * 120 * cloud.s * random() - 10, r: rr })
    }
    puffs.sort((p, q) => q.y - p.y)
    const draw = (ox: number) => {
      for (const p of puffs) dab(ctx, p.x + ox, p.y + p.r * 0.25, p.r, hsl(215, 0.28, 0.72), 1)
      for (const p of puffs) {
        dab(ctx, p.x + ox, p.y, p.r * 0.92, hsl(40, 0.5, 0.95), 1)
        for (let k = 0; k < 5; k++) stroke(ctx, p.x + ox - p.r * 0.5 + random() * p.r, p.y - p.r * 0.5 + random() * p.r * 0.3, random() * Math.PI, p.r * 0.4, 8, hsl(46, 0.8, 0.97), 0.6, 0.3)
        for (let k = 0; k < 3; k++) stroke(ctx, p.x + ox - p.r * 0.6 + random() * p.r, p.y + p.r * 0.45, random() * 0.4, p.r * 0.5, 7, hsl(220, 0.25, 0.8), 0.5, -0.2)
      }
    }
    draw(0)
    draw(w)
    draw(-w)
  }
  const t = texture(canvas)
  t.wrapS = THREE.RepeatWrapping
  return t
}

/** The water's flow texture: soft streaks along v (the flow), foam flecks, tileable in both directions. */
export function paintFlow(): THREE.CanvasTexture {
  const s = 256
  const canvas = makeCanvas(s, s)
  const ctx = canvas.getContext('2d')!
  const random = rng(5)
  ctx.fillStyle = 'rgb(128,128,128)'
  ctx.fillRect(0, 0, s, s)
  ctx.lineCap = 'round'
  const r: Rect = { x: 0, y: 0, w: s, h: s }
  for (let i = 0; i < 220; i++) {
    const x = random() * s
    const y = random() * s
    const light = random() > 0.5
    wrapStroke(r, x, y, (px, py) => stroke(ctx, px, py, Math.PI / 2 + (random() - 0.5) * 0.25, 20 + random() * 50, 3 + random() * 6, light ? 'rgb(235,235,235)' : 'rgb(40,40,40)', 0.25 + random() * 0.3, (random() - 0.5) * 0.2), 60)
  }
  for (let i = 0; i < 70; i++) {
    const x = random() * s
    const y = random() * s
    wrapStroke(r, x, y, (px, py) => stroke(ctx, px, py, Math.PI / 2, 6 + random() * 10, 2 + random() * 2, 'rgb(255,255,255)', 0.8, 0), 16)
  }
  const t = texture(canvas, true)
  t.colorSpace = THREE.NoColorSpace
  return t
}

/** Watercolour paper: mid-grey (neutral under the grade's overlay blend) with soft blooms, pooled pigment and fibres. Tiles. */
export function paintPaper(): THREE.CanvasTexture {
  const s = 256
  const canvas = makeCanvas(s, s)
  const ctx = canvas.getContext('2d')!
  const random = rng(7)
  const r: Rect = { x: 0, y: 0, w: s, h: s }
  ctx.fillStyle = 'rgb(128,128,128)'
  ctx.fillRect(0, 0, s, s)
  for (let i = 0; i < 26; i++) {
    const x = random() * s
    const y = random() * s
    const light = random() > 0.5
    wrapStroke(r, x, y, (px, py) => dab(ctx, px, py, 18 + random() * 40, light ? 'rgb(150,150,150)' : 'rgb(108,108,108)', 0.16), 60)
  }
  for (let i = 0; i < 900; i++) {
    const x = random() * s
    const y = random() * s
    const v = random() > 0.5 ? 146 : 112
    wrapStroke(r, x, y, (px, py) => dab(ctx, px, py, 0.6 + random() * 1.4, `rgb(${v},${v},${v})`, 0.35), 3)
  }
  ctx.lineCap = 'round'
  for (let i = 0; i < 160; i++) {
    const x = random() * s
    const y = random() * s
    const v = random() > 0.5 ? 140 : 118
    wrapStroke(r, x, y, (px, py) => stroke(ctx, px, py, random() * Math.PI, 6 + random() * 14, 0.8, `rgb(${v},${v},${v})`, 0.4, (random() - 0.5) * 0.6), 20)
  }
  const t = texture(canvas, true)
  t.colorSpace = THREE.NoColorSpace
  return t
}

/** A big friendly cartoon hand for the ghost demonstration, painted soft and warm. */
export function paintHand(): THREE.CanvasTexture {
  const s = 256
  const canvas = makeCanvas(s, s)
  const ctx = canvas.getContext('2d')!
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const shape = () => {
    ctx.beginPath()
    ctx.moveTo(96, 250)
    ctx.quadraticCurveTo(70, 190, 72, 150)
    ctx.quadraticCurveTo(58, 128, 64, 112)
    ctx.quadraticCurveTo(80, 100, 96, 122)
    ctx.lineTo(98, 40)
    ctx.quadraticCurveTo(110, 18, 122, 40)
    ctx.lineTo(124, 104)
    ctx.quadraticCurveTo(134, 90, 146, 104)
    ctx.quadraticCurveTo(158, 92, 170, 108)
    ctx.quadraticCurveTo(184, 98, 194, 116)
    ctx.quadraticCurveTo(200, 170, 180, 206)
    ctx.quadraticCurveTo(170, 230, 172, 250)
    ctx.closePath()
  }
  ctx.save()
  ctx.translate(6, 8)
  shape()
  ctx.fillStyle = 'rgba(40,30,60,0.28)'
  ctx.fill()
  ctx.restore()
  shape()
  const g = ctx.createLinearGradient(60, 30, 200, 250)
  g.addColorStop(0, '#fffaf0')
  g.addColorStop(1, '#f3dcc4')
  ctx.fillStyle = g
  ctx.fill()
  ctx.lineWidth = 7
  ctx.strokeStyle = '#6b4a3a'
  ctx.stroke()
  ctx.lineWidth = 3
  ctx.globalAlpha = 0.5
  for (const x of [124, 148, 172]) {
    ctx.beginPath()
    ctx.moveTo(x, 112)
    ctx.lineTo(x - 2, 140)
    ctx.stroke()
  }
  return texture(canvas)
}

/** UV rectangle (0..1, flipped for WebGL) of a named atlas region, optionally inset. */
export function uvRect(name: RegionName, inset = 2): { u0: number; v0: number; u1: number; v1: number } {
  const r = REGION[name]
  return {
    u0: (r.x + inset) / ATLAS_SIZE,
    u1: (r.x + r.w - inset) / ATLAS_SIZE,
    v0: 1 - (r.y + r.h - inset) / ATLAS_SIZE,
    v1: 1 - (r.y + inset) / ATLAS_SIZE,
  }
}
