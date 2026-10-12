import * as THREE from 'three'
import { BEADS, type BeadKey } from '../palette'
import { TRAIL_TILE, TRAIL_WIDE, trailBead } from '../trailBeads'

// What is painted once and laid flat: the board with its pegs and the beads
// lying on it, the trail of laid beads, the far sky, the pool of light for
// the idle ladder and the soft dark under whatever stands. Each is drawn on a canvas
// at mount and used as a texture, so the whole floor of the place is two
// draws however far it runs.

/** Pixels to a peg in the painted floor. */
const PX = 8

const hexOf = (key: BeadKey): string => BEADS.find((bead) => bead.key === key)!.hex

function canvasOf(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return [canvas, canvas.getContext('2d')!]
}

/** A bead seen down its hole, lying on the board: a ring with a little light on one side. */
function layBead(g: CanvasRenderingContext2D, x: number, y: number, key: BeadKey): void {
  const cx = x * PX + PX / 2, cy = y * PX + PX / 2
  g.fillStyle = hexOf(key)
  g.beginPath()
  g.arc(cx, cy, PX * 0.49, 0, Math.PI * 2)
  g.arc(cx, cy, PX * 0.19, 0, Math.PI * 2, true)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.35)'
  g.lineWidth = 1
  g.beginPath()
  g.arc(cx, cy, PX * 0.36, Math.PI * 1.05, Math.PI * 1.6)
  g.stroke()
}

function peg(g: CanvasRenderingContext2D, x: number, y: number): void {
  const cx = x * PX + PX / 2, cy = y * PX + PX / 2
  g.fillStyle = 'rgba(120,110,90,0.28)'
  g.beginPath()
  g.arc(cx + 0.6, cy + 0.6, PX * 0.2, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.beginPath()
  g.arc(cx - 0.3, cy - 0.3, PX * 0.17, 0, Math.PI * 2)
  g.fill()
}

function finish(canvas: HTMLCanvasElement, anisotropy: number): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = anisotropy
  return texture
}

/** Pegs along one side of the square board tile. */
export const BOARD_TILE = 64

/** The board beside the trail: pale pegboard with green beads laid on most of it, in patches that tile. */
export function boardTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, g] = canvasOf(BOARD_TILE * PX, BOARD_TILE * PX)
  g.fillStyle = '#efe8d6'
  g.fillRect(0, 0, canvas.width, canvas.height)
  const wave = (x: number, y: number): number => {
    const u = (x / BOARD_TILE) * Math.PI * 2, v = (y / BOARD_TILE) * Math.PI * 2
    return Math.sin(u * 2 + Math.sin(v) * 1.3) + Math.sin(v * 3 + Math.cos(u * 2) * 1.1) + 0.6 * Math.sin((u + v) * 4)
  }
  let seed = 0x9e3779b9
  const chance = (): number => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }
  for (let y = 0; y < BOARD_TILE; y++) {
    for (let x = 0; x < BOARD_TILE; x++) {
      const field = wave(x, y), roll = chance()
      if (field < -1.15) {
        peg(g, x, y)
        continue
      }
      layBead(g, x, y, roll < 0.03 ? 'Y' : roll < 0.05 ? 'W' : field > 0.9 ? 'l' : field < -0.55 ? 'g' : roll < 0.14 ? 'l' : 'G')
    }
  }
  return finish(canvas, anisotropy)
}

export { TRAIL_TILE }

/** The trail, bead for bead as `trailBeads.ts` lays it: sand from edge to edge, a brown edging, a darker row at every step and a worn line of single beads between two lanes. It is the plainest thing in the place. */
export function trailTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, g] = canvasOf(TRAIL_WIDE * PX, TRAIL_TILE * PX)
  g.fillStyle = '#d9c8a2'
  g.fillRect(0, 0, canvas.width, canvas.height)
  for (let y = 0; y < TRAIL_TILE; y++) for (let x = 0; x < TRAIL_WIDE; x++) layBead(g, x, y, trailBead(x, y))
  return finish(canvas, anisotropy)
}

/** The far sky with two rows of hills, fading at its foot into the haze the trail runs into. `haze` is that colour. */
export function skyTexture(haze: string): THREE.CanvasTexture {
  const [canvas, g] = canvasOf(1024, 256)
  const sky = g.createLinearGradient(0, 0, 0, 256)
  sky.addColorStop(0, '#6db6ea')
  sky.addColorStop(0.55, '#a8d8f3')
  sky.addColorStop(0.8, haze)
  sky.addColorStop(1, haze)
  g.fillStyle = sky
  g.fillRect(0, 0, 1024, 256)
  const hills = (base: number, tall: number, colour: string, phase: number): void => {
    g.fillStyle = colour
    g.beginPath()
    g.moveTo(0, 256)
    for (let x = 0; x <= 1024; x += 8) {
      const u = (x / 1024) * Math.PI * 2
      g.lineTo(x, base - tall * (0.55 + 0.3 * Math.sin(u * 3 + phase) + 0.15 * Math.sin(u * 7 + phase * 2)))
    }
    g.lineTo(1024, 256)
    g.fill()
  }
  hills(206, 46, '#b9dcc0', 0.4)
  hills(212, 30, '#a3d2a0', 2.1)
  const foot = g.createLinearGradient(0, 196, 0, 222)
  foot.addColorStop(0, 'rgba(255,255,255,0)')
  foot.addColorStop(1, haze)
  g.fillStyle = foot
  g.fillRect(0, 196, 1024, 60)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  return texture
}

/** A pool of light, brightest in the middle and fading out with no edge: laid on the board round the fox, or stood behind a load, when the game shows what can be touched. It is never a ring. */
export function glowTexture(): THREE.CanvasTexture {
  const [canvas, g] = canvasOf(128, 128)
  const pool = g.createRadialGradient(64, 64, 2, 64, 64, 64)
  pool.addColorStop(0, 'rgba(255,246,190,0.95)')
  pool.addColorStop(0.45, 'rgba(255,224,110,0.6)')
  pool.addColorStop(0.8, 'rgba(255,200,60,0.2)')
  pool.addColorStop(1, 'rgba(255,190,40,0)')
  g.fillStyle = pool
  g.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** The soft dark under a thing that stands on the board. */
export function shadeTexture(): THREE.CanvasTexture {
  const [canvas, g] = canvasOf(64, 64)
  const shade = g.createRadialGradient(32, 32, 2, 32, 32, 32)
  shade.addColorStop(0, 'rgba(40,36,30,0.5)')
  shade.addColorStop(0.6, 'rgba(40,36,30,0.28)')
  shade.addColorStop(1, 'rgba(40,36,30,0)')
  g.fillStyle = shade
  g.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
