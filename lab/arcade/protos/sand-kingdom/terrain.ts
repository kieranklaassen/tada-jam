// The beach as a height field: one number per grid point, and every way the
// hand and the sea can change it. Nothing here knows about three.js; it keeps
// plain arrays (positions, normals, baked light) that the scene uploads.
//
// World units: x across the beach, z from the sea (negative) up the beach
// toward the child (positive), y up. A bucket tower is about one unit wide.

export const CELL = 0.076
export const NX = 194
export const NZ = 128
export const X0 = (-(NX - 1) * CELL) / 2
export const X1 = -X0
export const Z0 = -4.2
export const Z1 = Z0 + (NZ - 1) * CELL

// The sea by day (far out, below the sand terrace) and at high tide.
export const DAY_LEVEL = -0.25
export const TIDE_LEVEL = 0.285
// Up the beach from here the sand is dry and soft, and the tide never comes.
export const DRY_Z = 2.7
export const POOL = { x: -5.0, z: -1.7, r: 0.82, level: 0.035 }
// How far above the smooth beach sand can be piled.
export const MAX_RISE = 2.3

// The way sunlight travels across the sand (x, z), unit length. The sun only
// ever changes its height, so shadows can be swept in one pass.
export const LIGHT_X = -0.62
export const LIGHT_Z = 0.7846

export type Mould = 'bucket' | 'cone' | 'wall'

// The rocks by the pool. They are meshes in the scene; here they only cast
// shadow and stop the finger digging through them.
export interface Rock {
  x: number
  z: number
  rx: number
  ry: number
  rz: number
}
export const ROCKS: Rock[] = [
  { x: -5.95, z: -2.4, rx: 0.64, ry: 0.56, rz: 0.52 },
  { x: -5.0, z: -2.82, rx: 0.46, ry: 0.34, rz: 0.36 },
  { x: -4.08, z: -2.32, rx: 0.38, ry: 0.28, rz: 0.32 },
  { x: -6.12, z: -1.36, rx: 0.36, ry: 0.3, rz: 0.42 },
  { x: -4.22, z: -0.98, rx: 0.22, ry: 0.15, rz: 0.2 },
]

export interface Hit {
  x: number
  y: number
  z: number
}

export interface Occluder {
  x: number
  z: number
  r: number
  // Height above the sand it stands on.
  h: number
}

function smooth(a: number, b: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function hash2(ix: number, iz: number, seed: number): number {
  let n = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 2246822519)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

function vnoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  let fx = x - ix
  let fz = z - iz
  fx = fx * fx * (3 - 2 * fx)
  fz = fz * fz * (3 - 2 * fz)
  const a = hash2(ix, iz, seed)
  const b = hash2(ix + 1, iz, seed)
  const c = hash2(ix, iz + 1, seed)
  const d = hash2(ix + 1, iz + 1, seed)
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz
}

// The beach the tide leaves: a steep foreshore far out, a wide damp terrace
// that tilts very slightly up toward the child, then a soft dry berm.
export function baseAt(x: number, z: number): number {
  let b = (z + 3.9) * 0.046
  const t = Math.max(0, -3.72 - z)
  b -= t * t * 2.2 + t * 0.45
  b += (vnoise(x * 0.42 + 3, z * 0.42, 11) - 0.5) * 0.045 * smooth(-3.9, -3.1, z)
  const berm = smooth(2.45, 3.5, z)
  b += berm * 0.2 + berm * (vnoise(x * 0.8, z * 0.8, 5) - 0.5) * 0.06
  const d = Math.hypot(x - POOL.x, (z - POOL.z) * 1.25)
  b -= 0.3 * (1 - smooth(POOL.r * 0.45, POOL.r * 1.08, d))
  return b
}

export function inPool(x: number, z: number, pad = 0): boolean {
  return Math.hypot(x - POOL.x, (z - POOL.z) * 1.25) < POOL.r + pad
}

function mouldShape(kind: Mould, dx: number, dz: number): number {
  if (kind === 'bucket') {
    const d = Math.hypot(dx, dz)
    if (d >= 0.5) return 0
    if (d > 0.41) return (0.8 * (0.5 - d)) / 0.09
    let p = 0.8
    // Battlements pressed into the bottom of the bucket.
    if (d > 0.29 && Math.cos(Math.atan2(dz, dx) * 6) > -0.05) p += 0.13
    return p
  }
  if (kind === 'cone') {
    const d = Math.hypot(dx, dz)
    if (d >= 0.3) return 0
    return 0.03 + 0.7 * (1 - d / 0.3) ** 0.9
  }
  // A length of wall, long in x, with a crenellated top.
  const edge = Math.min(0.56 - Math.abs(dx), 0.2 - Math.abs(dz))
  if (edge <= 0) return 0
  if (edge < 0.05) return (0.46 * edge) / 0.05
  return 0.46 + (Math.cos(dx * 21) > 0 ? 0.11 : 0)
}

export const MOULD_HEIGHT: Record<Mould, number> = { bucket: 0.93, cone: 0.73, wall: 0.57 }
export const MOULD_RADIUS: Record<Mould, number> = { bucket: 0.5, cone: 0.3, wall: 0.62 }

export interface Terrain {
  readonly h: Float32Array
  readonly base: Float32Array
  readonly pos: Float32Array
  readonly nor: Float32Array
  readonly light: Float32Array
  heightAt(x: number, z: number): number
  // The sand or the rock standing on it, whichever is higher.
  topAt(x: number, z: number): number
  baseHeight(x: number, z: number): number
  rise(x: number, z: number): number
  // Unit normal of the sand at a point, as [x, y, z].
  normalAt(x: number, z: number): [number, number, number]
  onRock(x: number, z: number): boolean
  raycast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): Hit | null
  dig(x: number, z: number, power?: number): void
  scoop(x: number, z: number): void
  pat(x: number, z: number): void
  drip(x: number, z: number): void
  stamp(kind: Mould, x: number, z: number, yaw?: number): number
  // The nearest tall sand a little way off, if any: where a wall would lead.
  nearestTower(x: number, z: number): { x: number; z: number } | null
  // One step of the sea working on the sand at the water's edge.
  erode(level: number): void
  // Ease everything back toward the smooth beach; 1 finishes it.
  melt(f: number): void
  highest(): Hit & { rise: number }
  setOccluders(list: readonly Occluder[]): void
  // Bring positions, normals and baked light up to date. True if anything
  // changed and the scene should upload.
  refresh(tanElevation: number): boolean
}

export function createTerrain(): Terrain {
  const n = NX * NZ
  const h = new Float32Array(n)
  const base = new Float32Array(n)
  const occ = new Float32Array(n).fill(-9)
  const dyn = new Float32Array(n).fill(-9)
  const pos = new Float32Array(n * 3)
  const nor = new Float32Array(n * 3)
  const light = new Float32Array(n * 2)
  const sweep = new Float32Array(n)
  const lit = new Float32Array(n)

  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const k = j * NX + i
      const x = X0 + i * CELL
      const z = Z0 + j * CELL
      base[k] = baseAt(x, z)
      h[k] = base[k]
      pos[k * 3] = x
      pos[k * 3 + 1] = h[k]
      pos[k * 3 + 2] = z
      for (const r of ROCKS) {
        const q = 1 - ((x - r.x) / r.rx) ** 2 - ((z - r.z) / r.rz) ** 2
        if (q > 0) occ[k] = Math.max(occ[k], baseAt(r.x, r.z) - r.ry * 0.25 + r.ry * 1.2 * Math.sqrt(q))
      }
    }
  }

  // Dirty rectangle, in cells.
  let d0i = 0
  let d1i = NX - 1
  let d0j = 0
  let d1j = NZ - 1
  let lastTan = -1
  const mark = (i0: number, j0: number, i1: number, j1: number) => {
    if (i0 < d0i) d0i = i0
    if (j0 < d0j) d0j = j0
    if (i1 > d1i) d1i = i1
    if (j1 > d1j) d1j = j1
  }

  const ci = (v: number) => (v < 0 ? 0 : v > NX - 1 ? NX - 1 : v)
  const cj = (v: number) => (v < 0 ? 0 : v > NZ - 1 ? NZ - 1 : v)
  const top = (k: number) => Math.max(h[k], occ[k], dyn[k])

  const sample = (field: Float32Array, x: number, z: number): number => {
    const fx = Math.min(NX - 1.001, Math.max(0, (x - X0) / CELL))
    const fz = Math.min(NZ - 1.001, Math.max(0, (z - Z0) / CELL))
    const i = Math.floor(fx)
    const j = Math.floor(fz)
    const u = fx - i
    const v = fz - j
    const k = j * NX + i
    return (field[k] * (1 - u) + field[k + 1] * u) * (1 - v) + (field[k + NX] * (1 - u) + field[k + NX + 1] * u) * v
  }
  const heightAt = (x: number, z: number) => sample(h, x, z)
  const baseHeight = (x: number, z: number) => sample(base, x, z)

  // Run fn over every cell within `radius` of a point, with its distance.
  const around = (x: number, z: number, radius: number, fn: (k: number, d: number, i: number, j: number) => void) => {
    const i0 = ci(Math.floor((x - radius - X0) / CELL))
    const i1 = ci(Math.ceil((x + radius - X0) / CELL))
    const j0 = cj(Math.floor((z - radius - Z0) / CELL))
    const j1 = cj(Math.ceil((z + radius - Z0) / CELL))
    for (let j = j0; j <= j1; j++) {
      const dz = Z0 + j * CELL - z
      for (let i = i0; i <= i1; i++) {
        const dx = X0 + i * CELL - x
        const d = Math.hypot(dx, dz)
        if (d <= radius) fn(j * NX + i, d, i, j)
      }
    }
    mark(i0, j0, i1, j1)
  }

  let prevOcc: Occluder[] = []
  const lean = (k: number, hk: number) => {
    const diff = Math.max(h[k], occ[k], dyn[k]) - hk
    return diff < -0.22 ? -0.22 : diff > 0.4 ? 0.4 : diff
  }

  const cap = (k: number) => {
    const max = base[k] + MAX_RISE
    if (h[k] > max) h[k] = max
  }

  return {
    h,
    base,
    pos,
    nor,
    light,
    heightAt,
    topAt: (x, z) => Math.max(heightAt(x, z), sample(occ, x, z)),
    baseHeight,
    rise: (x, z) => heightAt(x, z) - baseHeight(x, z),

    normalAt(x, z) {
      const e = CELL
      const gx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e)
      const gz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e)
      const l = Math.hypot(gx, 1, gz)
      return [-gx / l, 1 / l, -gz / l]
    },

    onRock(x, z) {
      return sample(occ, x, z) > heightAt(x, z) + 0.02
    },

    raycast(ox, oy, oz, dx, dy, dz) {
      if (dy > -1e-4) return null
      let t = oy > 3.4 ? (3.4 - oy) / dy : 0
      const step = 0.06
      for (let s = 0; s < 700; s++) {
        const x = ox + dx * t
        const y = oy + dy * t
        const z = oz + dz * t
        if (y < -1.6) return null
        if (z < Z0 - 0.05) return null
        if (y <= heightAt(x, z)) {
          let lo = t - step
          let hi = t
          for (let b = 0; b < 6; b++) {
            const mid = (lo + hi) / 2
            if (oy + dy * mid <= heightAt(ox + dx * mid, oz + dz * mid)) hi = mid
            else lo = mid
          }
          const hx = ox + dx * hi
          const hz = oz + dz * hi
          if (hx < X0 || hx > X1 || hz > Z1) return null
          return { x: hx, y: heightAt(hx, hz), z: hz }
        }
        t += step
      }
      return null
    },

    // A fingertip drawn through damp sand: a groove, with what it pushed out
    // heaped along both sides. Built sand is only shaved, so a moat drawn close
    // to a tower does not knock it down.
    dig(x, z, power = 1) {
      const r = 0.34
      around(x, z, r, (k, d) => {
        if (occ[k] > -5) return
        const up = h[k] - base[k]
        const g = Math.exp(-(d * d) / 0.0135)
        if (up > 0.24) {
          h[k] -= 0.045 * g * power
          return
        }
        const floor = base[k] - 0.2
        if (g > 0.02) h[k] = Math.max(floor, h[k] - 0.085 * g * power)
        const ring = Math.exp(-((d - 0.235) ** 2) / 0.0032)
        if (ring > 0.05 && up < 0.075 && up > -0.03) h[k] += 0.02 * ring * power * (1 - up / 0.075)
      })
    },

    // The spade takes a wide shallow bite.
    scoop(x, z) {
      around(x, z, 0.36, (k, d) => {
        if (occ[k] > -5) return
        const up = h[k] - base[k]
        const g = Math.exp(-(d * d) / 0.035)
        if (up > 0.24) h[k] -= 0.03 * g
        else h[k] = Math.max(base[k] - 0.15, h[k] - 0.04 * g)
      })
    },

    // A flat hand: presses a little, and evens out what is under it.
    pat(x, z) {
      let sum = 0
      let weight = 0
      around(x, z, 0.3, (k, d) => {
        const g = Math.exp(-(d * d) / 0.03)
        sum += h[k] * g
        weight += g
      })
      const mean = weight > 0 ? sum / weight : 0
      around(x, z, 0.3, (k, d) => {
        if (occ[k] > -5) return
        const g = Math.exp(-(d * d) / 0.03)
        const next = h[k] + (mean - h[k]) * 0.3 * g - 0.035 * g
        h[k] = Math.max(base[k] - 0.07, next)
      })
    },

    // One drip of wet sand: a soft blob that sets where it lands, and a
    // smaller one that ran a little way down from it.
    drip(x, z) {
      around(x, z, 0.24, (k, d) => {
        if (occ[k] > -5) return
        h[k] += 0.066 * Math.exp(-(d * d) / 0.0085)
        cap(k)
      })
      const a = Math.random() * Math.PI * 2
      const rx = x + Math.cos(a) * 0.13
      const rz = z + Math.sin(a) * 0.13
      around(rx, rz, 0.16, (k, d) => {
        if (occ[k] > -5) return
        h[k] += 0.022 * Math.exp(-(d * d) / 0.004)
        cap(k)
      })
    },

    // Turn a mould out. It stands on whatever is under its middle, so a
    // second one set on a tower makes the tower taller. Returns the height of
    // the sand it stands on.
    stamp(kind, x, z, yaw = 0) {
      let ref = baseHeight(x, z)
      around(x, z, 0.17, (k) => {
        if (h[k] > ref) ref = h[k]
      })
      const tall = MOULD_HEIGHT[kind]
      const ground = baseHeight(x, z)
      if (ref + tall > ground + MAX_RISE) ref = ground + MAX_RISE - tall
      const c = Math.cos(yaw)
      const s = Math.sin(yaw)
      around(x, z, MOULD_RADIUS[kind] + CELL, (k, _d, i, j) => {
        if (occ[k] > -5) return
        const cx = X0 + i * CELL - x
        const cz = Z0 + j * CELL - z
        let p = 0
        for (let a = -1; a <= 1; a++) {
          for (let b = -1; b <= 1; b++) {
            const qx = cx + a * CELL * 0.33
            const qz = cz + b * CELL * 0.33
            p += mouldShape(kind, qx * c + qz * s, -qx * s + qz * c)
          }
        }
        p /= 9
        if (p > 0.012 && ref + p > h[k]) h[k] = ref + p
      })
      return ref
    },

    nearestTower(x, z) {
      let best: { x: number; z: number } | null = null
      let bestD = 2.1
      const i0 = ci(Math.floor((x - 2.1 - X0) / CELL))
      const i1 = ci(Math.ceil((x + 2.1 - X0) / CELL))
      const j0 = cj(Math.floor((z - 2.1 - Z0) / CELL))
      const j1 = cj(Math.ceil((z + 2.1 - Z0) / CELL))
      for (let j = j0; j <= j1; j += 2) {
        for (let i = i0; i <= i1; i += 2) {
          const k = j * NX + i
          if (h[k] - base[k] < 0.62) continue
          const d = Math.hypot(X0 + i * CELL - x, Z0 + j * CELL - z)
          if (d > 0.62 && d < bestD) {
            bestD = d
            best = { x: X0 + i * CELL, z: Z0 + j * CELL }
          }
        }
      }
      return best
    },

    erode(level) {
      let i0 = NX
      let i1 = -1
      let j0 = NZ
      let j1 = -1
      for (let j = 1; j < NZ - 1; j++) {
        for (let i = 1; i < NX - 1; i++) {
          const k = j * NX + i
          const hk = h[k]
          if (occ[k] > -5) continue
          const up = hk - base[k]
          if (up < 0.004 && up > -0.004) continue
          let changed = false
          if (hk > level + 0.03) {
            // Dry sand standing next to water: its foot is taken and laid down
            // just under the surface.
            if (up < 0.02) continue
            for (let q = 0; q < 4; q++) {
              const nk = q === 0 ? k - 1 : q === 1 ? k + 1 : q === 2 ? k - NX : k + NX
              const diff = h[k] - h[nk]
              if (h[nk] < level + 0.02 && diff > 0.09 && occ[nk] < -5) {
                const m = (diff - 0.09) * 0.07
                h[k] -= m
                h[nk] += m * 0.55
                changed = true
              }
            }
          } else if (hk < level - 0.005) {
            // Under water: everything slowly softens.
            const avg = (h[k - 1] + h[k + 1] + h[k - NX] + h[k + NX]) / 4
            const rate = up > 0 ? 0.05 : 0.012
            h[k] += (avg - hk) * rate
            if (up > 0) h[k] -= up * 0.012
            changed = true
          }
          if (changed) {
            if (i < i0) i0 = i
            if (i > i1) i1 = i
            if (j < j0) j0 = j
            if (j > j1) j1 = j
          }
        }
      }
      if (i1 >= i0) mark(i0, j0, i1, j1)
    },

    melt(f) {
      if (f >= 1) {
        h.set(base)
        mark(0, 0, NX - 1, NZ - 1)
        return
      }
      let any = false
      for (let j = 1; j < NZ - 1; j++) {
        for (let i = 1; i < NX - 1; i++) {
          const k = j * NX + i
          const up = h[k] - base[k]
          if (up === 0) continue
          const avg = (h[k - 1] + h[k + 1] + h[k - NX] + h[k + NX]) / 4
          h[k] += (avg - h[k]) * Math.min(0.5, f * 2)
          h[k] += (base[k] - h[k]) * f
          if (Math.abs(h[k] - base[k]) < 0.0015) h[k] = base[k]
          any = true
        }
      }
      if (any) mark(0, 0, NX - 1, NZ - 1)
    },

    highest() {
      let best = -1
      let bestRise = 0
      for (let j = 2; j < NZ - 2; j++) {
        const z = Z0 + j * CELL
        if (z > DRY_Z + 0.4) break
        for (let i = 2; i < NX - 2; i++) {
          const k = j * NX + i
          const up = h[k] - base[k]
          if (up > bestRise + 0.004) {
            bestRise = up
            best = k
          }
        }
      }
      if (best < 0) return { x: 0, y: 0, z: 0, rise: 0 }
      // The middle of the flat top it belongs to, not its first corner.
      const bi = best % NX
      const bj = Math.floor(best / NX)
      let sx = 0
      let sz = 0
      let count = 0
      for (let j = cj(bj - 8); j <= cj(bj + 8); j++) {
        for (let i = ci(bi - 8); i <= ci(bi + 8); i++) {
          const k = j * NX + i
          if (h[k] > h[best] - 0.06) {
            sx += i
            sz += j
            count++
          }
        }
      }
      const x = X0 + (sx / count) * CELL
      const z = Z0 + (sz / count) * CELL
      return { x, y: heightAt(x, z), z, rise: bestRise }
    },

    setOccluders(list) {
      // Clear what was there, then lay the new ones down.
      for (let pass = 0; pass < 2; pass++) {
        const items = pass === 0 ? prevOcc : list
        for (const o of items) {
          const i0 = ci(Math.floor((o.x - o.r - X0) / CELL))
          const i1 = ci(Math.ceil((o.x + o.r - X0) / CELL))
          const j0 = cj(Math.floor((o.z - o.r - Z0) / CELL))
          const j1 = cj(Math.ceil((o.z + o.r - Z0) / CELL))
          const ground = heightAt(o.x, o.z)
          for (let j = j0; j <= j1; j++) {
            for (let i = i0; i <= i1; i++) {
              const k = j * NX + i
              if (pass === 0) dyn[k] = -9
              else {
                // Rounded off at the rim, so its shadow has no steps in it.
                const d = Math.hypot(X0 + i * CELL - o.x, Z0 + j * CELL - o.z)
                if (d <= o.r) dyn[k] = Math.max(dyn[k], ground + o.h * Math.min(1, ((o.r - d) / CELL) * 0.7 + 0.25))
              }
            }
          }
          mark(i0, j0, i1, j1)
        }
      }
      prevOcc = list.map((o) => ({ ...o }))
    },

    refresh(tan) {
      let changed = false
      if (d1i >= d0i && d1j >= d0j) {
        const a0 = ci(d0i - 4)
        const a1 = ci(d1i + 4)
        const b0 = cj(d0j - 4)
        const b1 = cj(d1j + 4)
        for (let j = b0; j <= b1; j++) {
          const ju = cj(j - 1) * NX
          const jd = cj(j + 1) * NX
          const j2u = cj(j - 2) * NX
          const j2d = cj(j + 2) * NX
          for (let i = a0; i <= a1; i++) {
            const k = j * NX + i
            const hk = h[k]
            pos[k * 3 + 1] = hk
            const il = ci(i - 1)
            const ir = ci(i + 1)
            const gx = (h[j * NX + ir] - h[j * NX + il]) / ((ir - il) * CELL)
            const gz = (h[jd + i] - h[ju + i]) / (((jd - ju) / NX) * CELL)
            const l = Math.hypot(gx, 1, gz)
            nor[k * 3] = -gx / l
            nor[k * 3 + 1] = 1 / l
            nor[k * 3 + 2] = -gz / l
            // Hollows are darker, crests a touch lighter: what is around this
            // point, two cells out, compared with it.
            const i2l = ci(i - 2)
            const i2r = ci(i + 2)
            const around8 =
              lean(j * NX + i2l, hk) + lean(j * NX + i2r, hk) + lean(j2u + i, hk) + lean(j2d + i, hk) + lean(j2u + i2l, hk) + lean(j2u + i2r, hk) + lean(j2d + i2l, hk) + lean(j2d + i2r, hk)
            const conc = (around8 / 8) * 2.3
            light[k * 2 + 1] = 1 - (conc < -0.13 ? -0.13 : conc > 0.5 ? 0.5 : conc)
          }
        }
        d0i = NX
        d1i = -1
        d0j = NZ
        d1j = -1
        changed = true
        lastTan = -1
      }
      if (tan !== lastTan) {
        lastTan = tan
        changed = true
        // One pass from the sea toward the child: each point remembers how
        // high the shadow of everything up-sun of it reaches.
        const drop = (CELL / LIGHT_Z) * tan
        const shift = -LIGHT_X / LIGHT_Z
        const si = Math.floor(shift)
        const sf = shift - si
        const soft = 0.07
        for (let j = 0; j < NZ; j++) {
          const row = j * NX
          const up = row - NX
          for (let i = 0; i < NX; i++) {
            const k = row + i
            const hk = h[k]
            let s = top(k)
            if (j > 0) {
              const a = i + si
              const from = a >= NX - 1 ? sweep[up + NX - 1] : sweep[up + a] * (1 - sf) + sweep[up + a + 1] * sf
              if (from - drop > s) s = from - drop
            }
            sweep[k] = s
            const over = (s - hk) / soft
            lit[k] = over <= 0 ? 1 : over >= 1 ? 0 : 1 - over
          }
        }
        // Soften: a shadow on sand has no hard edge.
        for (let j = 0; j < NZ; j++) {
          const row = j * NX
          const a = j > 0 ? row - NX : row
          const b = j < NZ - 1 ? row + NX : row
          for (let i = 0; i < NX; i++) {
            const l = i > 0 ? i - 1 : i
            const r = i < NX - 1 ? i + 1 : i
            light[(row + i) * 2] = (lit[row + i] * 2 + lit[row + l] + lit[row + r] + lit[a + i] + lit[b + i]) / 6
          }
        }
      }
      return changed
    },
  }
}
