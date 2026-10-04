import * as THREE from 'three'
import { MAT_REACH } from '../visitor'
import { TRAY } from '../world'
import { LIGHT } from './sand'

// The place round the tray: a veranda of weathered boards, a woven mat under
// the tray, and the light of a tree overhead lying on both. All of it is
// ground: painted once on three canvases at mount, drawn as three flat
// planes, lower in contrast than anything in the tray, and nothing in it is
// a thing to pick up. Only the leaf light moves, and only a little.

/** How far the mat reaches beyond the tray's rim on every side. */
const MAT_MARGIN = MAT_REACH
/** The ground lies this far under the sand, at the foot of the tray's rails. */
const GROUND = -0.2

/** A small generator with a fixed seed: the painting is the same on every mount, so a still can be made again. */
function scatter(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function canvasOf(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, ctx: canvas.getContext('2d')! }
}

/**
 * Paints a shape with soft edges: the shape itself is drawn far off the canvas and only its blurred shadow falls on
 * it. Every browser the game runs in draws a shadow; not every one has a blur filter for a canvas.
 */
function soft(ctx: CanvasRenderingContext2D, blur: number, colour: string, shape: () => void): void {
  const FAR = 8192
  ctx.save()
  ctx.shadowColor = colour
  ctx.shadowBlur = blur
  ctx.shadowOffsetX = FAR
  ctx.translate(-FAR, 0)
  ctx.fillStyle = '#000'
  shape()
  ctx.restore()
}

function textureOf(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** One tile of the veranda floor: boards running across, each its own grey, with fine grain and dark gaps between. */
function paintBoards(): HTMLCanvasElement {
  const SIZE = 512, BOARDS = 8, deep = SIZE / BOARDS
  const { canvas, ctx } = canvasOf(SIZE, SIZE)
  const random = scatter(11)
  for (let row = 0; row < BOARDS; row++) {
    const y = row * deep
    const light = 44 + random() * 7
    ctx.fillStyle = `hsl(${204 + random() * 8}, ${15 + random() * 5}%, ${light}%)`
    ctx.fillRect(0, y, SIZE, deep)
    // Grain: long faint lines along the board, a little wavy. Each runs the whole tile, so the tile repeats with no seam.
    for (let line = 0; line < 9; line++) {
      const at = y + 4 + random() * (deep - 8), wave = 1 + random() * 2.5, phase = random() * 6.28
      ctx.strokeStyle = `hsla(205, 18%, ${random() < 0.5 ? light - 9 : light + 6}%, ${0.16 + random() * 0.16})`
      ctx.lineWidth = 0.8 + random() * 1.2
      ctx.beginPath()
      for (let x = 0; x <= SIZE; x += 16) ctx.lineTo(x, at + Math.sin((x / SIZE) * Math.PI * 2 * Math.round(wave) + phase) * 1.6)
      ctx.stroke()
    }
    // Where two lengths of board meet.
    const joint = Math.floor(random() * SIZE)
    ctx.fillStyle = 'hsla(206, 22%, 27%, 0.55)'
    ctx.fillRect(joint, y, 2, deep)
    // The gap to the next board, with a thin light edge below it where the low sun catches the wood.
    ctx.fillStyle = 'hsl(206, 22%, 29%)'
    ctx.fillRect(0, y, SIZE, 2.5)
    ctx.fillStyle = `hsla(204, 18%, ${light + 9}%, 0.5)`
    ctx.fillRect(0, y + 2.5, SIZE, 1.2)
  }
  return canvas
}

/** The mat: woven rush in a dark cloth border, with the tray's soft shadow lying on it along the light. */
function paintMat(width: number, depth: number): HTMLCanvasElement {
  const SCALE = 60
  const W = Math.round(width * SCALE), H = Math.round(depth * SCALE)
  const { canvas, ctx } = canvasOf(W, H)
  const random = scatter(23)
  ctx.fillStyle = 'hsl(196, 17%, 52%)'
  ctx.fillRect(0, 0, W, H)
  // The weave: fine straws across, each a hair lighter or darker than the last.
  for (let y = 0; y < H; y += 3) {
    ctx.fillStyle = `hsla(${190 + random() * 14}, 16%, ${random() < 0.5 ? 44 : 60}%, ${0.1 + random() * 0.14})`
    ctx.fillRect(0, y, W, 1.6)
  }
  // The warp threads that bind them: dotted lines from front to back.
  for (let x = SCALE * 0.5; x < W; x += SCALE * 0.5) {
    ctx.fillStyle = 'hsla(198, 20%, 36%, 0.28)'
    for (let y = (Math.round(x / (SCALE * 0.5)) % 2) * 5; y < H; y += 10) ctx.fillRect(x, y, 2, 5)
  }
  // The shadow of the tray, thrown away from the light: soft, to the side and toward the child.
  const tray = { x: (MAT_MARGIN - TRAY.rimThick) * SCALE, y: (MAT_MARGIN - TRAY.rimThick) * SCALE, w: (TRAY.halfWidth + TRAY.rimThick) * 2 * SCALE, h: (TRAY.halfDepth + TRAY.rimThick) * 2 * SCALE }
  const throwX = (-LIGHT.x / LIGHT.y) * (TRAY.rimHeight - GROUND) * 0.5 * SCALE, throwZ = (-LIGHT.z / LIGHT.y) * (TRAY.rimHeight - GROUND) * 0.5 * SCALE
  soft(ctx, SCALE * 0.5, 'hsla(205, 35%, 14%, 0.55)', () => ctx.fillRect(tray.x + throwX, tray.y + throwZ, tray.w, tray.h))
  // The border: a band of dark cloth all the way round, with one line of pale stitches.
  const band = SCALE * 0.42
  ctx.fillStyle = 'hsl(204, 26%, 31%)'
  ctx.fillRect(0, 0, W, band)
  ctx.fillRect(0, H - band, W, band)
  ctx.fillRect(0, 0, band, H)
  ctx.fillRect(W - band, 0, band, H)
  ctx.fillStyle = 'hsla(196, 22%, 62%, 0.7)'
  for (let x = band; x < W - band; x += 14) {
    ctx.fillRect(x, band * 0.62, 7, 2)
    ctx.fillRect(x, H - band * 0.62 - 2, 7, 2)
  }
  for (let y = band; y < H - band; y += 14) {
    ctx.fillRect(band * 0.62, y, 2, 7)
    ctx.fillRect(W - band * 0.62 - 2, y, 2, 7)
  }
  return canvas
}

/** The light of a tree overhead: soft patches of sun and the shadows of leaves between them, on a clear ground. */
function paintLeafLight(): HTMLCanvasElement {
  const SIZE = 512
  const { canvas, ctx } = canvasOf(SIZE, SIZE)
  const random = scatter(37)
  for (let i = 0; i < 64; i++) {
    const x = random() * SIZE, y = random() * SIZE, sun = random() < 0.45
    // Kept clear of the edges, so nothing is cut off where the plane ends.
    const edge = Math.min(x, y, SIZE - x, SIZE - y) / SIZE
    const turn = random() * Math.PI, strength = 0.2 + random() * 0.14, a = 18 + random() * 24, b = 12 + random() * 16
    if (edge < 0.1) continue
    soft(ctx, 10, sun ? `hsla(48, 70%, 88%, ${strength * 0.8})` : `hsla(210, 40%, 14%, ${strength})`, () => {
      ctx.translate(x, y)
      ctx.rotate(turn)
      // A patch of sun is round; a leaf's shadow is long and pointed at both ends.
      ctx.beginPath()
      if (sun) ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2)
      else {
        ctx.moveTo(-a, 0)
        ctx.quadraticCurveTo(0, -b, a, 0)
        ctx.quadraticCurveTo(0, b, -a, 0)
      }
      ctx.fill()
    })
  }
  return canvas
}

export type Setting = {
  /** The floor, the mat and the leaf light, from the ground up. */
  parts: THREE.Mesh[]
  /** Moves the leaf light as a breath of wind would: `seconds` is the game's own clock. */
  sway(seconds: number): void
  /** A cheaper tier leaves the leaf light out. */
  setLeafLight(shown: boolean): void
}

export function buildSetting(): Setting {
  const flat = (width: number, depth: number, texture: THREE.Texture, y: number, name: string, transparent = false): THREE.Mesh => {
    const geometry = new THREE.PlaneGeometry(width, depth)
    geometry.rotateX(-Math.PI / 2)
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, transparent, depthWrite: !transparent }))
    mesh.position.y = y
    mesh.name = name
    return mesh
  }
  const boards = textureOf(paintBoards())
  boards.wrapS = boards.wrapT = THREE.RepeatWrapping
  // One tile is eight boards deep and eight units square: the floor runs far past every edge of the frame.
  boards.repeat.set(12, 12)
  const floor = flat(96, 96, boards, GROUND - 0.02, 'setting-floor')
  const matWidth = (TRAY.halfWidth + TRAY.rimThick + MAT_MARGIN) * 2, matDepth = (TRAY.halfDepth + TRAY.rimThick + MAT_MARGIN) * 2
  const mat = flat(matWidth, matDepth, textureOf(paintMat(matWidth, matDepth)), GROUND - 0.01, 'setting-mat')
  const light = flat(30, 30, textureOf(paintLeafLight()), GROUND, 'setting-leaf-light', true)
  light.position.z = -3
  light.renderOrder = 1
  return {
    parts: [floor, mat, light],
    sway(seconds) {
      // Two slow swings out of step, so the light never comes back quite the same way.
      light.position.x = Math.sin(seconds * 0.5) * 0.22 + Math.sin(seconds * 0.23 + 1.3) * 0.16
      light.position.z = -3 + Math.sin(seconds * 0.37 + 0.6) * 0.14
      light.rotation.y = Math.sin(seconds * 0.19) * 0.02
    },
    setLeafLight(shown) {
      light.visible = shown
    },
  }
}
