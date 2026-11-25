import * as THREE from 'three'
import { makeRng } from '../rng'

// One sheet of sixteen small prints, in greys that the vertex colours dye.
// Each print is one patch: darker where the seam pinches it, with a line of
// running stitches inside the edge. Everything in the picture is cut from it.

export const PRINTS = { plain: 0, dots: 1, gingham: 2, stripes: 3, sprigs: 4, bigdots: 5, slant: 6, checks: 7, flowers: 8, scallops: 9, flags: 10, plaid: 11, ticking: 12, petals: 13, rings: 14, smooth: 15 } as const
export type Print = keyof typeof PRINTS
const CELL = 256

export function cellOf(print: Print): { u: number; v: number; s: number } {
  const i = PRINTS[print], pad = 2 / (CELL * 4)
  return { u: (i % 4) / 4 + pad, v: 1 - (Math.floor(i / 4) + 1) / 4 + pad, s: 1 / 4 - pad * 2 }
}

export function makeFabric(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = CELL * 4
  const g = canvas.getContext('2d')!
  const rng = makeRng(11)
  const grey = (v: number) => `rgb(${v},${v},${v})`
  const blob = (x: number, y: number, r: number, v: number) => { g.fillStyle = grey(v); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
  const DRAW: Record<Print, () => void> = {
    plain: () => {},
    smooth: () => {},
    dots: () => { for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) blob(i * 32 + (j % 2 ? 24 : 8), j * 32 + 16, 6.5, 255) },
    bigdots: () => { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) blob(i * 64 + (j % 2 ? 48 : 16), j * 64 + 32, 17, 255) },
    gingham: () => { g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 4; i++) { g.fillRect(i * 64, 0, 32, 256); g.fillRect(0, i * 64, 256, 32) } },
    stripes: () => { g.fillStyle = grey(255); for (let i = 0; i < 8; i++) g.fillRect(i * 32 + 4, 0, 13, 256) },
    ticking: () => { g.fillStyle = grey(150); for (let i = 0; i < 6; i++) { g.fillRect(i * 43 + 12, 0, 7, 256); g.fillRect(i * 43 + 23, 0, 3, 256) } },
    slant: () => { g.save(); g.translate(128, 128); g.rotate(0.78); g.fillStyle = grey(255); for (let i = -8; i < 8; i++) g.fillRect(i * 36, -260, 15, 520); g.restore() },
    checks: () => { g.fillStyle = 'rgba(120,120,120,.45)'; for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) if ((i + j) % 2) g.fillRect(i * 26, j * 26, 26, 26) },
    plaid: () => { g.fillStyle = 'rgba(110,110,110,.4)'; for (let i = 0; i < 3; i++) { g.fillRect(i * 86 + 20, 0, 34, 256); g.fillRect(0, i * 86 + 20, 256, 34) } g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 3; i++) { g.fillRect(i * 86 + 66, 0, 6, 256); g.fillRect(0, i * 86 + 66, 256, 6) } },
    sprigs: () => { for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const x = i * 52 + (j % 2 ? 40 : 14), y = j * 52 + 24; g.strokeStyle = grey(140); g.lineWidth = 3.5; g.beginPath(); g.moveTo(x, y + 12); g.quadraticCurveTo(x + 3, y, x - 2, y - 8); g.stroke(); blob(x - 8, y + 1, 5, 150); blob(x + 9, y - 1, 5, 150); blob(x - 2, y - 12, 6, 255) } },
    flowers: () => { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const x = i * 64 + (j % 2 ? 48 : 16), y = j * 64 + 32; for (let k = 0; k < 5; k++) blob(x + Math.cos(k * 1.257) * 12, y + Math.sin(k * 1.257) * 12, 8.5, 255); blob(x, y, 7, 130) } },
    petals: () => { for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { g.fillStyle = grey(255); g.save(); g.translate(i * 43 + 21, j * 43 + 21); g.rotate((i + j) % 2 ? 0.8 : -0.8); g.beginPath(); g.ellipse(0, 0, 14, 6, 0, 0, 7); g.fill(); g.restore() } },
    scallops: () => { g.strokeStyle = grey(255); g.lineWidth = 5; for (let j = 0; j < 8; j++) for (let i = -1; i < 7; i++) { g.beginPath(); g.arc(i * 44 + (j % 2 ? 22 : 0), j * 34, 20, 0.15, Math.PI - 0.15); g.stroke() } },
    flags: () => { g.fillStyle = grey(255); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(i * 64 + 4, j * 64 + 58); g.lineTo(i * 64 + 60, j * 64 + 58); g.lineTo(i * 64 + 32, j * 64 + 8); g.fill() } },
    rings: () => { g.strokeStyle = grey(255); g.lineWidth = 6; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i * 64 + 32, j * 64 + 32, 17, 0, 7); g.stroke() } },
  }
  for (const name of Object.keys(PRINTS) as Print[]) {
    const i = PRINTS[name]
    g.save()
    g.beginPath(); g.rect((i % 4) * CELL, Math.floor(i / 4) * CELL, CELL, CELL); g.clip()
    g.translate((i % 4) * CELL, Math.floor(i / 4) * CELL)
    g.fillStyle = grey(name === 'plain' || name === 'smooth' || name === 'ticking' || name === 'checks' || name === 'plaid' ? 236 : 205)
    g.fillRect(0, 0, CELL, CELL)
    DRAW[name]()
    // The weave.
    for (let k = 0; k < 64; k++) { g.fillStyle = `rgba(0,0,0,${0.015 + rng.next() * 0.03})`; g.fillRect(0, k * 4, CELL, 1.5); g.fillRect(k * 4, 0, 1.5, CELL) }
    if (name !== 'smooth') {
      // The seam pinches, and the stitches run inside it.
      for (let k = 0; k < 18; k++) { g.strokeStyle = `rgba(30,20,40,${0.055 * (1 - k / 18)})`; g.lineWidth = 2 + k * 1.6; g.strokeRect(0, 0, CELL, CELL) }
      g.setLineDash([13, 10]); g.lineWidth = 4.5; g.strokeStyle = 'rgba(40,30,45,.3)'; g.strokeRect(18, 19.5, CELL - 36, CELL - 36)
      g.strokeStyle = 'rgba(255,252,240,.95)'; g.strokeRect(17, 17, CELL - 34, CELL - 34)
    }
    g.restore()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}
