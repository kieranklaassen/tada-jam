import * as THREE from 'three'
import { smoothNoise, wobble, type Point } from '../geometry2d'
import { LAMP, SCREEN } from '../projection'
import { bakeLight, cardGeometry, flatGeometry, mergeStatic, paintCard, paintFlat, paper, planarUV, type Bake } from './paper'

// The paper theatre at night, built once and merged into one unlit mesh with
// the lamp's warm light and the moon's cool fill baked in. Everything is a
// cut card on a folded stand: a deep indigo backdrop with stars and a
// crescent moon, three rows of hills, clouds, two paper pines each side, the
// lit paper screen in a brick-red frame with a gold crest, the plank stage,
// and the brass lamp at the front. Every layer carries an offset dark
// "shadow card" behind it, the style's contact shadow.

export const PALETTE = {
  night: '#17153f',
  nightLow: '#2a2a6c',
  star: '#f8e7b0',
  moon: '#f6e3a1',
  moonHalo: '#34357c',
  hillFar: '#28336a',
  hillMid: '#2f4675',
  hillNear: '#365a7e',
  cloud: '#4b5099',
  cloudLight: '#5d62ab',
  pine: '#1f5a57',
  pineLight: '#2b7064',
  trunk: '#5b3a28',
  stage: '#c28145',
  plank: '#a86a34',
  stageEdge: '#7d4526',
  screen: '#f6e7c6',
  frame: '#9b3b2d',
  frameEdge: '#c25a45',
  crest: '#e3a843',
  brass: '#d9a443',
  brassDark: '#8a5a22',
  ink: '#1c1638',
  dropShadow: '#0d0b26',
} as const

const LIT: Bake = { lamp: 1, moon: 0.25, ambient: 0.55 }
const NIGHT: Bake = { lamp: 0.12, moon: 0.7, ambient: 0.75 }
const FAR: Bake = { lamp: 0, moon: 0.35, ambient: 1 }

export type SceneryAnchors = {
  /** Stars that twinkle (tier-dependent), as x, y, z, size. */
  twinkles: Float32Array
  moon: { x: number; y: number; z: number }
}

function circle(cx: number, cy: number, r: number, n = 28): Point[] {
  const out: Point[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return out
}

function star(cx: number, cy: number, r: number, spin: number): Point[] {
  const out: Point[] = []
  for (let i = 0; i < 10; i++) {
    const a = spin + (i / 10) * Math.PI * 2 + Math.PI / 2
    const rr = i % 2 === 0 ? r : r * 0.45
    out.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr })
  }
  return out
}

/** A hill row: flat along y = 0, with a rolling top from x0 to x1. */
function hills(x0: number, x1: number, base: number, amp: number, seed: number): Point[] {
  const out: Point[] = [
    { x: x0, y: -2 },
    { x: x1, y: -2 },
  ]
  const n = 64
  for (let i = n; i >= 0; i--) {
    const x = x0 + ((x1 - x0) * i) / n
    const y = base + amp * (0.55 * Math.sin(x * 0.05 + seed) + 0.3 * Math.sin(x * 0.11 + seed * 2.3) + 0.15 * smoothNoise(x * 0.08, seed))
    out.push({ x, y })
  }
  return out
}

/** A flat-bottomed cloud of bumps. */
function cloud(cx: number, cy: number, w: number, h: number, bumps: number, seed: number): Point[] {
  const out: Point[] = []
  const n = 56
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const upper = Math.sin(a) > 0
    const bump = upper ? 1 + 0.22 * Math.abs(Math.sin((a * bumps) / 2 + seed)) : 1
    const y = Math.sin(a) * h * (upper ? bump : 0.35)
    out.push({ x: cx + Math.cos(a) * w * (upper ? bump * 0.96 : 1), y: cy + y })
  }
  return out
}

function crescent(cx: number, cy: number, r: number): Point[] {
  const out: Point[] = []
  const n = 40
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  for (let i = n; i >= 0; i--) {
    const a = -Math.PI / 2 + (i / n) * Math.PI
    out.push({ x: cx + Math.cos(a) * r * 0.42, y: cy + Math.sin(a) * r * 0.96 })
  }
  return out
}

function pine(cx: number, base: number, h: number): Point[] {
  const w = h * 0.36
  return [
    { x: cx - w * 0.16, y: base },
    { x: cx + w * 0.16, y: base },
    { x: cx + w * 0.16, y: base + h * 0.12 },
    { x: cx + w, y: base + h * 0.12 },
    { x: cx + w * 0.45, y: base + h * 0.42 },
    { x: cx + w * 0.78, y: base + h * 0.42 },
    { x: cx + w * 0.3, y: base + h * 0.7 },
    { x: cx + w * 0.55, y: base + h * 0.7 },
    { x: cx, y: base + h },
    { x: cx - w * 0.55, y: base + h * 0.7 },
    { x: cx - w * 0.3, y: base + h * 0.7 },
    { x: cx - w * 0.78, y: base + h * 0.42 },
    { x: cx - w * 0.45, y: base + h * 0.42 },
    { x: cx - w, y: base + h * 0.12 },
    { x: cx - w * 0.16, y: base + h * 0.12 },
  ]
}

function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

export function buildScenery(): { geometry: THREE.BufferGeometry; anchors: SceneryAnchors } {
  const pieces: THREE.BufferGeometry[] = []
  const matrix = new THREE.Matrix4()

  /** A cut card (outline in its own xy plane) placed at z, with its dark shadow card just behind. */
  const layer = (outline: Point[], z: number, color: string, bake: Bake, options: { depth?: number; shadow?: boolean; seed?: number; edge?: string } = {}) => {
    const cut = wobble(outline, 0.12, options.seed ?? 1)
    const depth = options.depth ?? 0.3
    const g = paintCard(cardGeometry(cut, depth), paper(color), paper(color), paper(options.edge ?? color).multiplyScalar(0.8))
    g.applyMatrix4(matrix.makeTranslation(0, 0, z))
    pieces.push(bakeLight(g, bake))
    if (options.shadow !== false) {
      const s = paintFlat(flatGeometry(cut), paper(PALETTE.dropShadow))
      s.applyMatrix4(matrix.makeTranslation(0.45, -0.6, z - depth / 2 - 0.12))
      pieces.push(bakeLight(s, FAR))
    }
  }

  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string, bake: Bake, uv: 'xy' | 'xz' = 'xy') => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed()
    g.applyMatrix4(matrix.makeTranslation(x, y, z))
    planarUV(g, uv)
    pieces.push(bakeLight(paintFlat(g, paper(color)), bake))
  }

  const random = seeded(42)

  // --- the night: backdrop, stars, moon --------------------------------------
  {
    const g = new THREE.PlaneGeometry(260, 150, 12, 24).toNonIndexed()
    g.applyMatrix4(matrix.makeTranslation(0, 60, -46))
    planarUV(g)
    paintFlat(g, paper(PALETTE.night))
    const position = g.getAttribute('position')
    const color = g.getAttribute('color')
    const low = paper(PALETTE.nightLow)
    const high = paper(PALETTE.night)
    const c = new THREE.Color()
    for (let i = 0; i < position.count; i++) {
      const k = Math.min(1, Math.max(0, (position.getY(i) - 10) / 90))
      c.copy(low).lerp(high, Math.sqrt(k))
      color.setXYZ(i, c.r, c.g, c.b)
    }
    pieces.push(g)
  }
  const twinkles: number[] = []
  const moon = { x: 62, y: 46, z: -42 }
  for (let i = 0; i < 70; i++) {
    const x = -100 + random() * 200
    const y = 22 + random() * 40
    if (Math.abs(x - moon.x) < 14 && Math.abs(y - moon.y) < 14) continue
    const size = 0.45 + random() * 0.9
    if (i % 4 === 0) {
      twinkles.push(x, y, -45.5, size * 1.2)
      continue
    }
    const g = paintFlat(flatGeometry(star(x, y, size, random() * 2)), paper(PALETTE.star))
    g.applyMatrix4(matrix.makeTranslation(0, 0, -45.6))
    pieces.push(bakeLight(g, FAR))
  }
  layer(circle(moon.x, moon.y, 12, 40), moon.z - 1.5, PALETTE.moonHalo, FAR, { shadow: false, seed: 3 })
  layer(crescent(moon.x, moon.y, 7.5), moon.z, PALETTE.moon, FAR, { seed: 4, depth: 0.4 })

  // --- clouds and hills behind the screen --------------------------------------
  layer(cloud(-62, 48, 15, 5.5, 5, 1), -36, PALETTE.cloud, NIGHT, { seed: 11 })
  layer(cloud(80, 34, 13, 5, 4, 2), -34, PALETTE.cloud, NIGHT, { seed: 12 })
  layer(cloud(-14, 50, 12, 4.5, 4, 3), -38, PALETTE.cloudLight, NIGHT, { seed: 13 })
  layer(cloud(30, 52, 10, 4, 3, 4), -30, PALETTE.cloudLight, NIGHT, { seed: 14 })
  layer(hills(-140, 140, 30, 8, 1), -34, PALETTE.hillFar, NIGHT, { seed: 21 })
  layer(hills(-140, 140, 21, 7, 4), -24, PALETTE.hillMid, NIGHT, { seed: 22 })
  layer(hills(-140, 140, 12, 6, 9), -14, PALETTE.hillNear, NIGHT, { seed: 23 })
  for (const [x, z, h] of [
    [-46, -8, 26],
    [-58, -10, 20],
    [47, -8, 24],
    [60, -11, 19],
  ] as const) {
    layer(pine(x, 0, h), z, PALETTE.pine, NIGHT, { seed: Math.round(x), edge: PALETTE.pineLight })
    // A folded stand behind each tree.
    box(x, h * 0.12, z - 1.2, 0.4, h * 0.24, 2.2, PALETTE.trunk, NIGHT)
  }

  // --- the stage: plank floor that runs under the whole diorama ----------------
  {
    const g = new THREE.PlaneGeometry(112, 130, 28, 40).toNonIndexed()
    g.applyMatrix4(matrix.makeRotationX(-Math.PI / 2))
    g.applyMatrix4(matrix.makeTranslation(0, 0, 9))
    planarUV(g, 'xz')
    pieces.push(bakeLight(paintFlat(g, paper(PALETTE.stage)), LIT))
    for (let z = -50; z <= 72; z += 8) {
      const plank = paintFlat(new THREE.PlaneGeometry(112, 0.35).toNonIndexed(), paper(PALETTE.plank))
      plank.applyMatrix4(matrix.makeRotationX(-Math.PI / 2))
      plank.applyMatrix4(matrix.makeTranslation(0, 0.03, z))
      planarUV(plank, 'xz')
      pieces.push(bakeLight(plank, LIT))
    }
    box(0, -1.2, 74.2, 112, 2.4, 0.6, PALETTE.stageEdge, LIT)
  }

  // --- the screen and its frame ----------------------------------------------
  {
    const w = SCREEN.right - SCREEN.left
    const h = SCREEN.top - SCREEN.bottom
    const g = new THREE.PlaneGeometry(w, h, 32, 20).toNonIndexed()
    g.applyMatrix4(matrix.makeTranslation(0, (SCREEN.top + SCREEN.bottom) / 2, 0))
    planarUV(g)
    paintFlat(g, paper(PALETTE.screen))
    pieces.push(bakeLight(g, { lamp: 1.25, moon: 0, ambient: 0.35 }))
    // A backing so the screen reads as a sheet of paper, not a plane.
    box(0, (SCREEN.top + SCREEN.bottom) / 2, -0.35, w, h, 0.5, PALETTE.screen, NIGHT)
    const bar = 2.6
    const frameZ = 0.7
    const post = (x: number) => {
      box(x, (SCREEN.top + bar) / 2, frameZ, bar, SCREEN.top + bar, 1.4, PALETTE.frame, LIT)
      // Folded paper feet, braced behind each post.
      const foot = paintCard(cardGeometry([{ x: 0, y: 0 }, { x: 7, y: 0 }, { x: 0, y: 9 }], 0.5), paper(PALETTE.frame), paper(PALETTE.frame), paper(PALETTE.frameEdge))
      foot.applyMatrix4(matrix.makeRotationY(Math.PI / 2))
      foot.applyMatrix4(matrix.makeTranslation(x, 0, 0))
      pieces.push(bakeLight(foot, LIT))
    }
    post(SCREEN.left - bar / 2)
    post(SCREEN.right + bar / 2)
    box(0, SCREEN.top + bar / 2, frameZ, w + bar * 2, bar, 1.4, PALETTE.frame, LIT)
    box(0, SCREEN.bottom - bar / 2 + 0.2, frameZ, w, bar - 0.4, 1.4, PALETTE.frame, LIT)
    // A gold crest over the screen: a fan of scallops, no words.
    const crest: Point[] = []
    for (let i = 0; i <= 48; i++) {
      const a = Math.PI - (i / 48) * Math.PI
      const r = 7.5 + 0.9 * Math.abs(Math.sin(a * 5))
      crest.push({ x: Math.cos(a) * r * 1.35, y: SCREEN.top + bar + Math.sin(a) * r * 0.8 })
    }
    layer(crest, frameZ + 0.4, PALETTE.crest, LIT, { seed: 31, depth: 0.5 })
    layer(circle(0, SCREEN.top + bar + 2.6, 1.6, 18), frameZ + 0.8, PALETTE.frame, LIT, { seed: 32, shadow: false })
  }

  // --- the lamp -----------------------------------------------------------------
  {
    const add = (g: THREE.BufferGeometry, color: string, y: number) => {
      const flat = g.toNonIndexed()
      flat.applyMatrix4(matrix.makeTranslation(LAMP.x, y, LAMP.z))
      planarUV(flat)
      pieces.push(bakeLight(paintFlat(flat, paper(color)), { lamp: 0, moon: 0.6, ambient: 0.9 }))
    }
    add(new THREE.CylinderGeometry(5.2, 6, 1.4, 20), PALETTE.brassDark, 0.7)
    add(new THREE.CylinderGeometry(4, 4.8, 1.2, 20), PALETTE.brass, 2)
    add(new THREE.CylinderGeometry(0.9, 1.1, 14, 10), PALETTE.brass, 9.5)
    add(new THREE.CylinderGeometry(1.6, 1.6, 0.8, 12), PALETTE.brassDark, 16.8)
    add(new THREE.CylinderGeometry(3.2, 1.4, 3, 16), PALETTE.brass, 19)
    add(new THREE.CylinderGeometry(3.3, 3.3, 0.5, 16), PALETTE.brassDark, 20.6)
  }

  return { geometry: mergeStatic(pieces), anchors: { twinkles: new Float32Array(twinkles), moon } }
}
