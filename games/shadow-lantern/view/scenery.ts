import * as THREE from 'three'
import { smoothNoise, wobble, type Point } from '../geometry2d'
import { LAMP, SCREEN } from '../projection'
import { bakeLight, cardGeometry, flatGeometry, mergeStatic, paintCard, paintFlat, paper, planarUV, type Bake } from './paper'

// The paper theatre at night, built once and merged into one unlit mesh with
// the lamp's warm light and the moon's cool fill baked in. Everything is a
// cut card on a folded stand: a deep indigo backdrop with stars and a
// crescent moon, three rows of hills, clouds, two paper pines each side, the
// lit paper screen in a brick-red frame with tied-back curtains, a scalloped
// valance and a gold crest, the plank stage,
// and the brass lamp at the front. Every layer carries an offset dark
// "shadow card" behind it, the style's contact shadow.

export const PALETTE = {
  night: '#17153f',
  nightLow: '#2a2a6c',
  star: '#f8e7b0',
  moon: '#f6e3a1',
  moonHalo: '#232468',
  moonGlow: '#2e2d74',
  hillFar: '#28336a',
  hillMid: '#2f4675',
  hillNear: '#365a7e',
  cloud: '#4b5099',
  cloudLight: '#5d62ab',
  pine: '#1f5a57',
  pineLight: '#2b7064',
  trunk: '#5b3a28',
  meadow: '#26336a',
  stage: '#c28145',
  plank: '#a86a34',
  stageEdge: '#7d4526',
  screen: '#f6e7c6',
  frame: '#9b3b2d',
  frameEdge: '#c25a45',
  crest: '#e3a843',
  curtain: '#8c2742',
  curtainLight: '#a8385a',
  curtainDeep: '#5f1832',
  brass: '#d9a443',
  brassDark: '#8a5a22',
  ink: '#1c1638',
  dropShadow: '#0d0b26',
} as const

/** How far a cut paper edge wanders from its outline (cm). */
export const CUT_WOBBLE = 0.12

/** The floor of the lamp's cup, where its flame stands. */
export const LAMP_CUP_Y = 21.1

const LIT: Bake = { lamp: 1, moon: 0.25, ambient: 0.55 }
const NIGHT: Bake = { lamp: 0.12, moon: 0.7, ambient: 0.75 }
const FAR: Bake = { lamp: 0, moon: 0.35, ambient: 1 }
const MEADOW: Bake = { lamp: 0.45, moon: 0.45, ambient: 0.7 }

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
  const n = Math.ceil((x1 - x0) / 4.4)
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

/** The moon side of a pine, inset from its edge, as if the card were creased down its middle. */
function pineHalf(cx: number, base: number, h: number): Point[] {
  const w = h * 0.36
  const cy = base + h * 0.45
  return [
    [0, 0.12],
    [1, 0.12],
    [0.45, 0.42],
    [0.78, 0.42],
    [0.3, 0.7],
    [0.55, 0.7],
    [0, 1],
  ].map(([u, v]) => ({ x: cx + u * w * 0.86, y: cy + (base + v * h - cy) * 0.86 }))
}

/**
 * A curtain tied back to one side of the frame. The outer edge hangs
 * straight; the inner edge sweeps out to the tie and flares back to the
 * floor. `side` is −1 for the left curtain, +1 for the right.
 */
function drape(inner: number, width: number, top: number, tie: number, side: number): Point[] {
  const outer = inner + side * width
  const out: Point[] = [
    { x: outer, y: 0 },
    { x: outer, y: top },
  ]
  const n = 14
  for (let i = 0; i <= n; i++) {
    const k = i / n
    out.push({ x: inner + side * width * 0.66 * Math.sin((k * Math.PI) / 2) ** 1.6, y: top - (top - tie) * k })
  }
  for (let i = 1; i <= n; i++) {
    const k = i / n
    out.push({ x: inner + side * width * (0.66 - 0.36 * Math.sin((k * Math.PI) / 2)), y: tie * (1 - k) })
  }
  return out
}

/** A strip from x0 to x1 whose lower edge hangs in `count` scallops. */
function scallops(x0: number, x1: number, top: number, bottom: number, count: number): Point[] {
  const out: Point[] = [
    { x: x0, y: top },
    { x: x1, y: top },
  ]
  const n = count * 8
  const dip = (top - bottom) * 0.55
  for (let i = n; i >= 0; i--) {
    const k = i / n
    out.push({ x: x0 + (x1 - x0) * k, y: bottom + dip * (1 - Math.abs(Math.sin(k * count * Math.PI))) })
  }
  return out
}

/**
 * A clump of grass blades fanning out from a narrow base on y = 0. The base
 * reaches past the outermost notches, so the outline never crosses itself
 * (a crossed outline cuts into overlapping triangles that flicker).
 */
function tuft(cx: number, h: number, blades: number, random: () => number): Point[] {
  const w = h * 0.9
  const base = Math.max(0.28, 0.5 - 1 / blades + TUFT_BASE_MARGIN) * w
  const out: Point[] = [{ x: cx + base, y: 0 }]
  for (let i = blades - 1; i >= 0; i--) {
    const x = cx - w / 2 + ((i + 0.5) * w) / blades
    out.push({ x: x + (x - cx) * 0.35, y: h * (0.62 + 0.38 * random()) })
    if (i > 0) out.push({ x: cx - w / 2 + (i * w) / blades, y: h * (0.18 + 0.14 * random()) })
  }
  out.push({ x: cx - base, y: 0 })
  return out
}

const TUFT_BASE_MARGIN = 0.04

/** The meadow's grass tufts beside the stage: outlines before the cut's wobble (by `seed`), standing at `z`. */
export function meadowTufts(): { outline: Point[]; z: number; seed: number }[] {
  const grass = seeded(7)
  const out: { outline: Point[]; z: number; seed: number }[] = []
  for (let i = 0; i < 20; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const z = -14 + (i >> 1) * 8 + grass() * 5
    // The camera sees the meadow out to about |x| = 88 at the back, 62 at the front.
    const reach = 88 - (z + 19) * 0.32
    const x = side * (58.5 + grass() * (reach - 60))
    const h = 3.4 + grass() * 2.8 + z * 0.02
    out.push({ outline: tuft(x, h, 5 + Math.floor(grass() * 3), grass), z, seed: 60 + i })
  }
  return out
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

  /** A cut card (outline in its own xy plane) placed at z, with its dark shadow card just behind. A null bake is a light source: it keeps its own colour. */
  const layer = (outline: Point[], z: number, color: string, bake: Bake | null, options: { depth?: number; shadow?: boolean; seed?: number; edge?: string } = {}) => {
    const cut = wobble(outline, CUT_WOBBLE, options.seed ?? 1)
    const depth = options.depth ?? 0.3
    const g = paintCard(cardGeometry(cut, depth), paper(color), paper(color), paper(options.edge ?? color).multiplyScalar(0.8))
    g.applyMatrix4(matrix.makeTranslation(0, 0, z))
    pieces.push(bake ? bakeLight(g, bake) : g)
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
    // Wide enough for a 20:9 phone held sideways, whose top corners look out past x ±135.
    const g = new THREE.PlaneGeometry(400, 150, 12, 24).toNonIndexed()
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
    const g = paintFlat(flatGeometry(star(x, y, size, random() * 2)), paper(PALETTE.star).multiplyScalar(0.85))
    g.applyMatrix4(matrix.makeTranslation(0, 0, -45.6))
    pieces.push(g)
  }
  layer(circle(moon.x, moon.y, 12.5, 40), moon.z - 2, PALETTE.moonHalo, null, { shadow: false, seed: 3 })
  layer(circle(moon.x, moon.y, 9.8, 36), moon.z - 1, PALETTE.moonGlow, null, { shadow: false, seed: 5 })
  layer(crescent(moon.x, moon.y, 7.5), moon.z, PALETTE.moon, null, { seed: 4, depth: 0.4 })

  // --- clouds and hills behind the screen --------------------------------------
  layer(cloud(-62, 48, 15, 5.5, 5, 1), -36, PALETTE.cloud, NIGHT, { seed: 11 })
  layer(cloud(80, 34, 13, 5, 4, 2), -34, PALETTE.cloud, NIGHT, { seed: 12 })
  layer(cloud(-14, 50, 12, 4.5, 4, 3), -38, PALETTE.cloudLight, NIGHT, { seed: 13 })
  layer(cloud(30, 52, 10, 4, 3, 4), -30, PALETTE.cloudLight, NIGHT, { seed: 14 })
  layer(hills(-200, 200, 30, 8, 1), -34, PALETTE.hillFar, NIGHT, { seed: 21 })
  layer(hills(-200, 200, 21, 7, 4), -24, PALETTE.hillMid, NIGHT, { seed: 22 })
  layer(hills(-200, 200, 12, 6, 9), -14, PALETTE.hillNear, NIGHT, { seed: 23 })
  for (const [x, z, h] of [
    [-46, -8, 26],
    [-58, -10, 20],
    [47, -8, 24],
    [60, -11, 19],
  ] as const) {
    layer(pine(x, 0, h), z, PALETTE.pine, NIGHT, { seed: Math.round(x), edge: PALETTE.pineLight })
    layer(pineHalf(x, 0, h), z + 0.25, PALETTE.pineLight, NIGHT, { seed: Math.round(x) + 1, depth: 0.1, shadow: false })
    // A folded stand behind each tree.
    box(x, h * 0.12, z - 1.2, 0.4, h * 0.24, 2.2, PALETTE.trunk, NIGHT)
  }

  // --- the meadow the theatre stands on, with grass tufts and bushes -----------
  {
    // Only beside the stage, so the floor is not painted twice.
    for (const side of [-1, 1]) {
      const g = new THREE.PlaneGeometry(94, 120, 10, 12).toNonIndexed()
      g.applyMatrix4(matrix.makeRotationX(-Math.PI / 2))
      g.applyMatrix4(matrix.makeTranslation(side * 103, -0.08, 20))
      planarUV(g, 'xz')
      pieces.push(bakeLight(paintFlat(g, paper(PALETTE.meadow)), MEADOW))
    }
    for (const side of [-1, 1]) {
      const edge = paintFlat(new THREE.PlaneGeometry(1.4, 130).toNonIndexed(), paper(PALETTE.dropShadow))
      edge.applyMatrix4(matrix.makeRotationX(-Math.PI / 2))
      edge.applyMatrix4(matrix.makeTranslation(side * 56.7, -0.04, 9))
      pieces.push(bakeLight(edge, FAR))
    }
    const blades = [PALETTE.pine, PALETTE.pineLight, PALETTE.hillNear]
    meadowTufts().forEach(({ outline, z, seed }, i) => layer(outline, z, blades[i % 3], NIGHT, { seed, depth: 0.2 }))
    for (const side of [-1, 1]) {
      layer(cloud(side * 70, 0, 8, 6, 4, side + 2), -13, PALETTE.pine, NIGHT, { seed: 70 + side, edge: PALETTE.pineLight })
      layer(cloud(side * 64, 0, 5, 4, 3, side + 5), -11.5, PALETTE.pineLight, NIGHT, { seed: 72 + side })
    }
  }

  // --- the stage: plank floor that runs under the whole diorama ----------------
  {
    // Kraft-paper planks laid edge to edge, each with a hand-cut back edge and a
    // thin seam of shadow in front of the cut. The strips tile rather than
    // overlap, so nothing is coplanar enough to flicker, and they are
    // subdivided so the lamp's pool bakes smoothly across them.
    const tone = seeded(9)
    const stageTone = paper(PALETTE.stage)
    const plankTone = paper(PALETTE.plank)
    const SEAM = 0.34
    const cutOf = (row: number) => (x: number) => smoothNoise(x * 0.35, row + 90) * 0.18
    const strip = (z0: number, z1: number, rows: number, back: (x: number) => number, front: (x: number) => number, color: THREE.Color) => {
      const g = new THREE.PlaneGeometry(112, z1 - z0, 56, rows)
      g.applyMatrix4(matrix.makeRotationX(-Math.PI / 2))
      g.applyMatrix4(matrix.makeTranslation(0, 0.03, (z0 + z1) / 2))
      const position = g.getAttribute('position')
      for (let i = 0; i < position.count; i++) {
        const z = position.getZ(i)
        const k = (z - z0) / (z1 - z0)
        position.setZ(i, z + back(position.getX(i)) * (1 - k) + front(position.getX(i)) * k)
      }
      const flat = g.toNonIndexed()
      planarUV(flat, 'xz')
      pieces.push(bakeLight(paintFlat(flat, color), LIT))
    }
    const none = () => 0
    for (let z = -50, row = 0; z < 74; z += 8, row++) {
      const last = z + 8 >= 74
      const color = stageTone.clone().lerp(plankTone, tone() * 0.25).multiplyScalar(0.97 + tone() * 0.07)
      strip(row === 0 ? -56 : z, last ? 74.2 : z + 8 - SEAM, row === 0 ? 3 : 2, row === 0 ? none : cutOf(row), last ? none : cutOf(row + 1), color)
      if (!last) strip(z + 8 - SEAM, z + 8, 1, cutOf(row + 1), cutOf(row + 1), paper(PALETTE.stageEdge))
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
    bakeLight(g, { lamp: 1.25, moon: 0, ambient: 0.35 })
    // The lamp throws a pool on its screen: full level with the flame, dimmer toward the corners.
    const position = g.getAttribute('position')
    const color = g.getAttribute('color')
    for (let i = 0; i < position.count; i++) {
      const d = Math.hypot(position.getX(i) - LAMP.x, (position.getY(i) - LAMP.y) * 1.3) / 40
      const f = 1 - 0.22 * Math.min(1, d * d)
      color.setXYZ(i, color.getX(i) * f, color.getY(i) * f, color.getZ(i) * f)
    }
    pieces.push(g)
    // A backing so the screen reads as a sheet of paper, not a plane.
    box(0, (SCREEN.top + SCREEN.bottom) / 2, -0.35, w, h, 0.5, PALETTE.screen, NIGHT)
    const bar = 2.6
    const frameZ = 0.7
    const post = (x: number) => {
      // Up to the top bar, not into it: the two front faces would share a plane.
      box(x, SCREEN.top / 2, frameZ, bar, SCREEN.top, 1.4, PALETTE.frame, LIT)
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
    // Curtains tied back beside the posts, three layers of cut paper each. The
    // curtains, valance and crest must stay inside PROSCENIUM (projection.ts):
    // waking creatures use it to fly in front of them.
    const top = SCREEN.top + bar
    for (const side of [-1, 1]) {
      const inner = side * (SCREEN.right + 0.4)
      layer(drape(inner, 8.6, top, 17, side), 1.65, PALETTE.curtainDeep, LIT, { seed: 40 + side })
      layer(drape(inner + side * 1.4, 6.2, top, 17.4, side), 1.95, PALETTE.curtain, LIT, { seed: 42 + side, edge: PALETTE.curtainLight })
      layer(drape(inner + side * 3.3, 3, top, 17.8, side), 2.25, PALETTE.curtainLight, LIT, { seed: 44 + side, shadow: false })
      const tieInner = inner + side * 4.9
      const tieOuter = inner + side * 9
      layer(
        [
          { x: tieInner, y: 16 },
          { x: tieOuter, y: 16.3 },
          { x: tieOuter, y: 18.1 },
          { x: tieInner, y: 18.5 },
        ],
        2.55,
        PALETTE.crest,
        LIT,
        { seed: 46 + side, depth: 0.4 },
      )
      layer(circle(tieInner + side * 0.3, 17.2, 1.1, 14), 2.85, PALETTE.brassDark, LIT, { seed: 48 + side, shadow: false })
    }
    // A scalloped valance over the top bar, with a gold trim peeking below.
    const reach = SCREEN.right + 10.5
    layer(scallops(-reach - 0.3, reach + 0.3, top + 1.1, SCREEN.top + 0.2, 15), 2.55, PALETTE.crest, LIT, { seed: 50, depth: 0.25 })
    layer(scallops(-reach, reach, top + 1, SCREEN.top + 0.8, 15), 2.8, PALETTE.curtain, LIT, { seed: 51, edge: PALETTE.curtainLight })
    // A gold crest on the valance: a fan of scallops, no words.
    const crest: Point[] = []
    for (let i = 0; i <= 48; i++) {
      const a = Math.PI - (i / 48) * Math.PI
      const r = 7.5 + 0.9 * Math.abs(Math.sin(a * 5))
      crest.push({ x: Math.cos(a) * r * 1.35, y: top + 0.6 + Math.sin(a) * r * 0.8 })
    }
    layer(crest, 3.2, PALETTE.crest, LIT, { seed: 31, depth: 0.5 })
    layer(circle(0, top + 3.2, 1.6, 18), 3.6, PALETTE.frame, LIT, { seed: 32, shadow: false })
  }

  // --- the lamp: two cut profiles slotted into a cross, on a paper disc -----------
  {
    const half: [number, number][] = [
      [5.6, 0],
      [4.9, 1.2],
      [3.7, 1.2],
      [3.1, 2.5],
      [0.9, 2.5],
      [0.9, 8.2],
      [1.8, 8.6],
      [1.8, 9.5],
      [0.9, 9.9],
      [0.9, 15.4],
      [1.9, 15.4],
      [1.9, 16.8],
      [1.3, 16.8],
      [2.2, 18.4],
      [3.1, 19.7],
      [3.8, 20.5],
      [3.9, 21],
      [3.5, 21.4],
      [1.4, LAMP_CUP_Y - 0.5],
    ]
    const profile: Point[] = [...half.map(([x, y]) => ({ x, y })), ...[...half].reverse().map(([x, y]) => ({ x: -x, y }))]
    const dim: Bake = { lamp: 0, moon: 0.45, ambient: 0.45 }
    // The flame warms its own lamp from inside: most at the cup, a little at the foot.
    const warmed = (g: THREE.BufferGeometry) => {
      const base = (g.getAttribute('color').array as Float32Array).slice()
      bakeLight(g, dim)
      const position = g.getAttribute('position')
      const color = g.getAttribute('color')
      for (let i = 0; i < position.count; i++) {
        const w = 0.3 + 0.55 * Math.max(0, Math.min(1, position.getY(i) / 21)) ** 2
        color.setXYZ(i, color.getX(i) + base[i * 3] * w, color.getY(i) + base[i * 3 + 1] * w * 0.85, color.getZ(i) + base[i * 3 + 2] * w * 0.6)
      }
      return g
    }
    for (const turn of [Math.PI / 4, -Math.PI / 4]) {
      const card = paintCard(cardGeometry(wobble(profile, 0.06, 81), 0.35), paper(PALETTE.brass), paper(PALETTE.brass), paper(PALETTE.brassDark))
      card.applyMatrix4(matrix.makeRotationY(turn))
      card.applyMatrix4(matrix.makeTranslation(LAMP.x, 0.5, LAMP.z))
      pieces.push(warmed(card))
    }
    const disc = paintCard(cardGeometry(wobble(circle(0, 0, 6.6, 36), 0.1, 82), 0.5), paper(PALETTE.brass), paper(PALETTE.brass), paper(PALETTE.brassDark))
    disc.applyMatrix4(matrix.makeRotationX(-Math.PI / 2))
    disc.applyMatrix4(matrix.makeTranslation(LAMP.x, 0.25, LAMP.z))
    pieces.push(warmed(disc))
  }

  // Pieces were added back to front; merging them nearest first lets the
  // depth test skip the backdrop, hills and meadow wherever something covers them.
  return { geometry: mergeStatic(pieces.reverse()), anchors: { twinkles: new Float32Array(twinkles), moon } }
}
