import * as THREE from 'three'
import { PALETTE } from './palette'

// Every texture is drawn on a canvas at startup: nothing is fetched or
// committed as an image. Gradients are posterized into flat bands so the
// sky, glows, and ripples share the toon ramp's stepped look.

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  return [element, element.getContext('2d')!]
}

function texture(element: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const map = new THREE.CanvasTexture(element)
  if (srgb) map.colorSpace = THREE.SRGBColorSpace
  map.needsUpdate = true
  return map
}

/** Deterministic pseudo-random numbers so the painting is the same every open. */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function puff(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, shade: string): void {
  const bumps = [
    [0.18, 0.62, 0.3],
    [0.4, 0.42, 0.42],
    [0.64, 0.5, 0.36],
    [0.84, 0.66, 0.24],
  ]
  const draw = (color: string, dy: number) => {
    g.fillStyle = color
    g.beginPath()
    for (const [bx, by, br] of bumps) {
      g.moveTo(x + bx * w + br * h, y + by * h + dy)
      g.arc(x + bx * w, y + by * h + dy, br * h, 0, Math.PI * 2)
    }
    g.rect(x + 0.12 * w, y + 0.6 * h + dy, 0.76 * w, 0.3 * h)
    g.fill()
  }
  draw(shade, 0)
  g.save()
  g.beginPath()
  g.rect(x - w, y - h, w * 3, h * 1.55)
  g.clip()
  draw(fill, -h * 0.05)
  g.restore()
}

/** The dusk backdrop: banded sky, a low sun with stepped halos, flat-bottomed clouds, first stars, and two rows of hills. */
export function skyTexture(): THREE.CanvasTexture {
  const W = 1024
  const H = 512
  const [element, g] = canvas(W, H)
  const horizon = 0.66 * H
  const bands = PALETTE.skyBands
  const bandHeight = horizon / bands.length
  bands.forEach((color, i) => {
    g.fillStyle = color
    g.fillRect(0, Math.floor(i * bandHeight), W, Math.ceil(bandHeight) + 1)
  })
  const random = seeded(7)
  g.fillStyle = '#fff6ea'
  for (let i = 0; i < 26; i++) {
    const x = random() * W
    const y = random() * bandHeight * 1.8
    const r = 1.2 + random() * 2.2
    g.globalAlpha = 0.55 + random() * 0.45
    g.beginPath()
    g.moveTo(x, y - r * 2.2)
    g.quadraticCurveTo(x, y, x + r * 2.2, y)
    g.quadraticCurveTo(x, y, x, y + r * 2.2)
    g.quadraticCurveTo(x, y, x - r * 2.2, y)
    g.quadraticCurveTo(x, y, x, y - r * 2.2)
    g.fill()
  }
  g.globalAlpha = 1
  const sunX = W * 0.62
  for (const [r, alpha] of [
    [118, 0.16],
    [84, 0.26],
    [58, 0.5],
  ] as const) {
    g.globalAlpha = alpha
    g.fillStyle = PALETTE.sunGlow
    g.beginPath()
    g.arc(sunX, horizon, r, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  g.fillStyle = PALETTE.sun
  g.beginPath()
  g.arc(sunX, horizon, 38, 0, Math.PI * 2)
  g.fill()
  puff(g, W * 0.06, bandHeight * 1.4, 190, 58, PALETTE.cloud, PALETTE.cloudShade)
  puff(g, W * 0.36, bandHeight * 0.7, 130, 40, '#fbe0e4', '#efc3d0')
  puff(g, W * 0.72, bandHeight * 1.9, 230, 64, PALETTE.cloud, PALETTE.cloudShade)
  const hills = (color: string, base: number, amplitude: number, bumps: number, phase: number) => {
    g.fillStyle = color
    g.beginPath()
    g.moveTo(0, H)
    for (let x = 0; x <= W; x += 8) {
      const u = x / W
      const y = base - amplitude * (0.55 + 0.45 * Math.sin(u * Math.PI * bumps + phase)) * (0.7 + 0.3 * Math.sin(u * 9.1 + phase * 2))
      g.lineTo(x, y)
    }
    g.lineTo(W, H)
    g.closePath()
    g.fill()
  }
  hills(PALETTE.hillsFar, horizon + 10, 46, 3.2, 0.6)
  hills(PALETTE.hillsNear, horizon + 34, 34, 4.4, 2.1)
  const map = texture(element)
  map.anisotropy = 4
  return map
}

/** A soft round blob with a flat core: toon contact shadows. */
export function blobTexture(): THREE.CanvasTexture {
  const S = 64
  const [element, g] = canvas(S, S)
  const gradient = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.92)')
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.35)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gradient
  g.fillRect(0, 0, S, S)
  return texture(element, false)
}

function steppedDisc(g: CanvasRenderingContext2D, S: number, steps: readonly (readonly [number, number])[]): void {
  for (const [r, alpha] of steps) {
    g.globalAlpha = alpha
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(S / 2, S / 2, r * (S / 2), 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
}

/** The "touch here" ring: a bright band with a stepped inner glow, readable on lilac pads and mint water. */
export function ringTexture(): THREE.CanvasTexture {
  const S = 128
  const [element, g] = canvas(S, S)
  g.lineWidth = S * 0.075
  g.strokeStyle = 'rgba(255,255,255,1)'
  g.beginPath()
  g.arc(S / 2, S / 2, S * 0.42, 0, Math.PI * 2)
  g.stroke()
  g.lineWidth = S * 0.05
  g.strokeStyle = 'rgba(255,255,255,0.45)'
  g.beginPath()
  g.arc(S / 2, S / 2, S * 0.34, 0, Math.PI * 2)
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.2)'
  g.beginPath()
  g.arc(S / 2, S / 2, S * 0.27, 0, Math.PI * 2)
  g.stroke()
  return texture(element, false)
}

/** A thin water ring. */
export function rippleTexture(): THREE.CanvasTexture {
  const S = 128
  const [element, g] = canvas(S, S)
  g.lineWidth = S * 0.045
  g.strokeStyle = '#ffffff'
  g.beginPath()
  g.arc(S / 2, S / 2, S * 0.44, 0, Math.PI * 2)
  g.stroke()
  return texture(element, false)
}

/** The firefly's halo: concentric stepped discs instead of a smooth bloom. */
export function haloTexture(): THREE.CanvasTexture {
  const S = 128
  const [element, g] = canvas(S, S)
  steppedDisc(g, S, [
    [0.98, 0.06],
    [0.7, 0.1],
    [0.44, 0.18],
    [0.24, 0.4],
    [0.12, 0.85],
  ])
  return texture(element, false)
}

/** The lily pad's face: a lighter heart, radiating veins, and a darker rim band. */
export function padTexture(): THREE.CanvasTexture {
  const S = 256
  const [element, g] = canvas(S, S)
  const c = S / 2
  g.fillStyle = PALETTE.pad
  g.fillRect(0, 0, S, S)
  g.fillStyle = PALETTE.padLight
  g.beginPath()
  g.arc(c, c, S * 0.36, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = PALETTE.padVein
  g.lineCap = 'round'
  g.globalAlpha = 0.7
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.2
    g.lineWidth = i % 2 === 0 ? 2.5 : 1.6
    g.beginPath()
    g.moveTo(c + Math.cos(a) * S * 0.12, c + Math.sin(a) * S * 0.12)
    g.quadraticCurveTo(c + Math.cos(a + 0.12) * S * 0.25, c + Math.sin(a + 0.12) * S * 0.25, c + Math.cos(a + 0.05) * S * 0.44, c + Math.sin(a + 0.05) * S * 0.44)
    g.stroke()
  }
  g.globalAlpha = 1
  g.lineWidth = S * 0.04
  g.strokeStyle = PALETTE.padSide
  g.globalAlpha = 0.45
  g.beginPath()
  g.arc(c, c, S * 0.47, 0, Math.PI * 2)
  g.stroke()
  g.globalAlpha = 1
  const map = texture(element)
  map.wrapS = THREE.ClampToEdgeWrapping
  map.wrapT = THREE.ClampToEdgeWrapping
  return map
}

/** A big friendly mitten hand pointing down, drawn for the ghost-hand demonstration. */
export function handTexture(): THREE.CanvasTexture {
  const W = 256
  const H = 320
  const [element, g] = canvas(W, H)
  g.translate(W / 2, 0)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  const outline = () => {
    g.beginPath()
    g.moveTo(-22, 14)
    g.arc(0, 18, 22, Math.PI, 0)
    g.lineTo(22, 120)
    g.bezierCurveTo(40, 104, 70, 108, 80, 126)
    g.bezierCurveTo(98, 130, 104, 150, 100, 170)
    g.bezierCurveTo(108, 200, 96, 250, 60, 272)
    g.bezierCurveTo(30, 292, -40, 296, -62, 262)
    g.bezierCurveTo(-86, 228, -84, 180, -70, 150)
    g.bezierCurveTo(-58, 128, -36, 132, -22, 146)
    g.closePath()
  }
  outline()
  g.fillStyle = PALETTE.hand
  g.fill()
  g.lineWidth = 10
  g.strokeStyle = PALETTE.handLine
  g.stroke()
  g.lineWidth = 6
  g.strokeStyle = 'rgba(106,80,120,0.45)'
  for (const [x0, y0, x1, y1] of [
    [22, 150, 30, 190],
    [58, 140, 62, 184],
  ]) {
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.stroke()
  }
  g.fillStyle = 'rgba(255,170,190,0.55)'
  g.beginPath()
  g.ellipse(-8, 226, 26, 16, -0.3, 0, Math.PI * 2)
  g.fill()
  return texture(element)
}

/** A round frog silhouette (body and two eye bumps), carried by the ghost hand during a drag demonstration. */
export function ghostFrogTexture(): THREE.CanvasTexture {
  const S = 128
  const [element, g] = canvas(S, S)
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.ellipse(64, 80, 46, 36, 0, 0, Math.PI * 2)
  g.moveTo(52, 44)
  g.arc(40, 44, 16, 0, Math.PI * 2)
  g.moveTo(104, 44)
  g.arc(88, 44, 16, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(80,60,110,0.55)'
  for (const x of [40, 88]) {
    g.beginPath()
    g.arc(x, 44, 6, 0, Math.PI * 2)
    g.fill()
  }
  return texture(element, false)
}
