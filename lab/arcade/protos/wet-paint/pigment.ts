// Wet-on-wet watercolour on a small grid. Each cell holds water, three
// pigments still afloat in that water (red, yellow, blue) and the same three
// settled into the paper. Every step, water creeps toward drier neighbours
// and carries pigment with it, pigment diffuses where the paper is wet, and a
// little of it settles. The paper's own unevenness (`perm`) is what makes the
// edges feather instead of spreading as a blurred disc.
//
// The grid is small and only the box around wet paint is stepped, so the cost
// has a flat ceiling (the whole sheet) and drops to nothing once it has dried.

export const GW = 156
export const GH = 108
const N = GW * GH

// Dampness of the sheet as laid. Paint creeps at this level and runs where a
// brush has just been.
const BASE = 0.5
const W_FULL = 1.2
// Per step (sixty a second): how readily water moves to drier paper, how
// readily each pigment spreads through wet paper (yellow runs, blue is
// heavy), and how fast things calm down.
const KW = 0.22
const KD0 = 0.19
const KD1 = 0.23
const KD2 = 0.15
const DRY = 0.0015
const SETTLE = 0.0032
const REDISSOLVE = 0.016
// The most pigment a spot of paper will take, all colours together.
const CAP = 1.9

// How strongly each pigment absorbs red, green and blue light. Mixing is
// adding these up: yellow (takes blue) with blue (takes red) leaves green.
const K = [
  [0.02, 1.25, 1.12], // red
  [0.01, 0.13, 1.35], // yellow
  [1.5, 0.7, 0.08], // blue
] as const

export const PAPER_RGB = [246, 240, 226] as const

// The colour a pigment load makes on this paper, for brush tips and jars.
export function pigmentRgb(r: number, y: number, b: number, paper: readonly number[] = PAPER_RGB): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0]
  for (let c = 0; c < 3; c++) {
    const d = r * K[0][c]! + y * K[1][c]! + b * K[2][c]!
    out[c] = Math.round(paper[c]! * Math.exp(-d))
  }
  return out
}

export interface Sheet {
  // GW by GH pixels; draw it scaled up with smoothing on.
  readonly canvas: HTMLCanvasElement
  clear(): void
  // One touch of the flat brush at a cell position, lying across the stroke
  // direction. `load` is mutated: it gives pigment and picks some up.
  // `water` is how wet the hairs are (about 1.1 loaded, more when rinsed).
  brush(cx: number, cy: number, ux: number, uy: number, load: Float32Array, bristles: Float32Array, water: number): void
  // One press of the sponge. `lifted` collects what it took.
  sponge(cx: number, cy: number, lifted: Float32Array): void
  step(): void
  // Repaint the image if anything changed.
  render(): void
  // Rough total of pigment on the sheet, for the idle invitation.
  amount(): number
  readonly active: boolean
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

function smooth(e0: number, e1: number, v: number): number {
  const t = v <= e0 ? 0 : v >= e1 ? 1 : (v - e0) / (e1 - e0)
  return t * t * (3 - 2 * t)
}

export function createSheet(rand: () => number): Sheet {
  const canvas = document.createElement('canvas')
  canvas.width = GW
  canvas.height = GH
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(GW, GH)
  const px = image.data

  const w = new Float32Array(N)
  const m0 = new Float32Array(N)
  const m1 = new Float32Array(N)
  const m2 = new Float32Array(N)
  const f0 = new Float32Array(N)
  const f1 = new Float32Array(N)
  const f2 = new Float32Array(N)
  const dw = new Float32Array(N)
  const d0 = new Float32Array(N)
  const d1 = new Float32Array(N)
  const d2 = new Float32Array(N)
  const a = new Float32Array(N)
  const perm = new Float32Array(N)
  const gran = new Float32Array(N)

  // Paper unevenness: soft patches a few centimetres across, smaller ones a
  // finger wide, and fibre-fine noise on top. Value noise on two lattices.
  const lattice = (lw: number, lh: number) => {
    const v = new Float32Array(lw * lh)
    for (let i = 0; i < v.length; i++) v[i] = rand()
    return (x: number, y: number) => {
      const fx = (x / GW) * (lw - 1)
      const fy = (y / GH) * (lh - 1)
      const ix = Math.min(lw - 2, Math.floor(fx))
      const iy = Math.min(lh - 2, Math.floor(fy))
      const tx = smooth(0, 1, fx - ix)
      const ty = smooth(0, 1, fy - iy)
      const top = v[iy * lw + ix]! * (1 - tx) + v[iy * lw + ix + 1]! * tx
      const bottom = v[(iy + 1) * lw + ix]! * (1 - tx) + v[(iy + 1) * lw + ix + 1]! * tx
      return top * (1 - ty) + bottom * ty
    }
  }
  const coarse = lattice(14, 10)
  const mid = lattice(46, 32)
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const fine = rand()
      const m = mid(x, y)
      perm[y * GW + x] = clamp01(0.2 + coarse(x, y) * 0.3 + m * 0.52 + fine * 0.07)
      gran[y * GW + x] = 0.82 + m * 0.26 + fine * 0.12
    }
  }

  // exp(-density) for each channel, already multiplied by the paper colour.
  const LUT_N = 512
  const LUT_SCALE = 72
  const lutR = new Uint8ClampedArray(LUT_N)
  const lutG = new Uint8ClampedArray(LUT_N)
  const lutB = new Uint8ClampedArray(LUT_N)
  for (let i = 0; i < LUT_N; i++) {
    const t = Math.exp(-i / LUT_SCALE)
    lutR[i] = PAPER_RGB[0] * t
    lutG[i] = PAPER_RGB[1] * t
    lutB[i] = PAPER_RGB[2] * t
  }

  // The box of cells that may still be moving, and the box to repaint.
  let bx0 = GW
  let by0 = GH
  let bx1 = -1
  let by1 = -1
  let rx0 = 0
  let ry0 = 0
  let rx1 = GW - 1
  let ry1 = GH - 1
  let active = false
  let dirty = true
  // A touch repaints at once; slow creeping repaints every other step.
  let urgent = true
  let steps = 0

  const touch = (x0: number, y0: number, x1: number, y1: number) => {
    if (x0 < bx0) bx0 = x0
    if (y0 < by0) by0 = y0
    if (x1 > bx1) bx1 = x1
    if (y1 > by1) by1 = y1
    if (x0 < rx0) rx0 = x0
    if (y0 < ry0) ry0 = y0
    if (x1 > rx1) rx1 = x1
    if (y1 > ry1) ry1 = y1
    active = true
    dirty = true
    urgent = true
  }

  const clear = () => {
    w.fill(BASE)
    m0.fill(0)
    m1.fill(0)
    m2.fill(0)
    f0.fill(0)
    f1.fill(0)
    f2.fill(0)
    dw.fill(0)
    d0.fill(0)
    d1.fill(0)
    d2.fill(0)
    for (let i = 0; i < N; i++) a[i] = perm[i]! * (0.28 + BASE * (0.72 / W_FULL))
    bx0 = GW
    by0 = GH
    bx1 = -1
    by1 = -1
    rx0 = 0
    ry0 = 0
    rx1 = GW - 1
    ry1 = GH - 1
    active = false
    dirty = true
    urgent = true
  }

  const HALF_WIDE = 5.6
  const HALF_LONG = 2.3

  const brush = (cx: number, cy: number, ux: number, uy: number, load: Float32Array, bristles: Float32Array, water: number) => {
    const R = 7
    const x0 = Math.max(0, Math.floor(cx - R))
    const y0 = Math.max(0, Math.floor(cy - R))
    const x1 = Math.min(GW - 1, Math.ceil(cx + R))
    const y1 = Math.min(GH - 1, Math.ceil(cy + R))
    if (x1 < x0 || y1 < y0) return
    const l0 = load[0]!
    const l1 = load[1]!
    const l2 = load[2]!
    let k0 = 0
    let k1 = 0
    let k2 = 0
    let wsum = 0
    const nb = bristles.length
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx
        const dy = y + 0.5 - cy
        const u = dx * ux + dy * uy
        const v = dy * ux - dx * uy
        const au = u < 0 ? -u : u
        const av = v < 0 ? -v : v
        if (au >= HALF_LONG || av >= HALF_WIDE) continue
        const wt = (1 - smooth(HALF_LONG - 1.4, HALF_LONG, au)) * (1 - smooth(HALF_WIDE - 1.6, HALF_WIDE, av))
        if (wt <= 0) continue
        const i = y * GW + x
        const bristle = bristles[Math.min(nb - 1, Math.floor(((v + HALF_WIDE) / (HALF_WIDE * 2)) * nb))]!
        // The wet hairs lift a little of what is already there...
        const pick = 0.07 * wt
        wsum += wt
        let t = m0[i]! * pick
        m0[i]! -= t
        k0 += t
        t = m1[i]! * pick
        m1[i]! -= t
        k1 += t
        t = m2[i]! * pick
        m2[i]! -= t
        k2 += t
        // ...wake some settled pigment...
        const wake = 0.06 * wt
        t = f0[i]! * wake
        f0[i]! -= t
        m0[i]! += t
        t = f1[i]! * wake
        f1[i]! -= t
        m1[i]! += t
        t = f2[i]! * wake
        f2[i]! -= t
        m2[i]! += t
        // ...and lay down their own, less where the paper is already full.
        const give = 0.66 * wt * bristle
        const room = 1 - (m0[i]! + f0[i]! + m1[i]! + f1[i]! + m2[i]! + f2[i]!) / CAP
        if (room > 0) {
          const g = give * room
          m0[i]! += l0 * g
          m1[i]! += l1 * g
          m2[i]! += l2 * g
        }
        const wi = w[i]!
        if (wi < water) w[i] = wi + (water - wi) * 0.55 * wt
      }
    }
    // The brush pales as it goes, and takes on wet paint it is dragged
    // through (never more than is lying there).
    const under = wsum > 0 ? 1 / (0.07 * wsum) : 0
    load[0] = l0 * 0.9974 + Math.max(0, k0 * under - l0) * 0.02
    load[1] = l1 * 0.9974 + Math.max(0, k1 * under - l1) * 0.02
    load[2] = l2 * 0.9974 + Math.max(0, k2 * under - l2) * 0.02
    touch(x0, y0, x1, y1)
  }

  const SPONGE_R = 9.5

  const sponge = (cx: number, cy: number, lifted: Float32Array) => {
    const x0 = Math.max(0, Math.floor(cx - SPONGE_R))
    const y0 = Math.max(0, Math.floor(cy - SPONGE_R))
    const x1 = Math.min(GW - 1, Math.ceil(cx + SPONGE_R))
    const y1 = Math.min(GH - 1, Math.ceil(cy + SPONGE_R))
    if (x1 < x0 || y1 < y0) return
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx
        const dy = (y + 0.5 - cy) * 1.25
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d >= SPONGE_R) continue
        const i = y * GW + x
        // A sponge is porous: it lifts unevenly, which leaves a soft cloud.
        const wt = (1 - smooth(SPONGE_R - 4, SPONGE_R, d)) * (0.55 + 0.45 * perm[i]!)
        const loose = 0.42 * wt
        const fixed = 0.16 * wt
        let t = m0[i]! * loose
        m0[i]! -= t
        lifted[0]! += t
        t = m1[i]! * loose
        m1[i]! -= t
        lifted[1]! += t
        t = m2[i]! * loose
        m2[i]! -= t
        lifted[2]! += t
        t = f0[i]! * fixed
        f0[i]! -= t
        lifted[0]! += t
        t = f1[i]! * fixed
        f1[i]! -= t
        lifted[1]! += t
        t = f2[i]! * fixed
        f2[i]! -= t
        lifted[2]! += t
        const wi = w[i]!
        const dryTo = BASE * 0.8
        if (wi > dryTo) w[i] = wi + (dryTo - wi) * 0.35 * wt
      }
    }
    touch(x0, y0, x1, y1)
  }

  const step = () => {
    if (!active) return
    steps++
    // Paint can creep one cell a step, so the box grows by one each time.
    const x0 = Math.max(0, bx0 - 1)
    const y0 = Math.max(0, by0 - 1)
    const x1 = Math.min(GW - 1, bx1 + 1)
    const y1 = Math.min(GH - 1, by1 + 1)
    bx0 = x0
    by0 = y0
    bx1 = x1
    by1 = y1
    // Every pair of neighbours once: this cell with the one to its right,
    // then with the one below.
    for (let y = y0; y <= y1; y++) {
      const row = y * GW
      const down = y < y1
      for (let x = x0; x <= x1; x++) {
        const i = row + x
        const ai = a[i]!
        const wi = w[i]!
        const p0 = m0[i]!
        const p1 = m1[i]!
        const p2 = m2[i]!
        const pSum = p0 + p1 + p2
        if (x < x1) {
          const j = i + 1
          const wj = w[j]!
          const q0 = m0[j]!
          const q1 = m1[j]!
          const q2 = m2[j]!
          const head = wi - wj
          if (pSum + q0 + q1 + q2 !== 0 || head !== 0) {
            const g = ai * a[j]!
            const fw = KW * g * head
            dw[i]! -= fw
            dw[j]! += fw
            let c: number
            let f: number
            if (fw > 0) {
              c = fw / wi
              if (c > 0.2) c = 0.2
              f = KD0 * g * (p0 - q0) + c * p0
              d0[i]! -= f
              d0[j]! += f
              f = KD1 * g * (p1 - q1) + c * p1
              d1[i]! -= f
              d1[j]! += f
              f = KD2 * g * (p2 - q2) + c * p2
              d2[i]! -= f
              d2[j]! += f
            } else {
              c = fw / wj
              if (c < -0.2) c = -0.2
              f = KD0 * g * (p0 - q0) + c * q0
              d0[i]! -= f
              d0[j]! += f
              f = KD1 * g * (p1 - q1) + c * q1
              d1[i]! -= f
              d1[j]! += f
              f = KD2 * g * (p2 - q2) + c * q2
              d2[i]! -= f
              d2[j]! += f
            }
          }
        }
        if (down) {
          const j = i + GW
          const wj = w[j]!
          const q0 = m0[j]!
          const q1 = m1[j]!
          const q2 = m2[j]!
          const head = wi - wj
          if (pSum + q0 + q1 + q2 !== 0 || head !== 0) {
            const g = ai * a[j]!
            const fw = KW * g * head
            dw[i]! -= fw
            dw[j]! += fw
            let c: number
            let f: number
            if (fw > 0) {
              c = fw / wi
              if (c > 0.2) c = 0.2
              f = KD0 * g * (p0 - q0) + c * p0
              d0[i]! -= f
              d0[j]! += f
              f = KD1 * g * (p1 - q1) + c * p1
              d1[i]! -= f
              d1[j]! += f
              f = KD2 * g * (p2 - q2) + c * p2
              d2[i]! -= f
              d2[j]! += f
            } else {
              c = fw / wj
              if (c < -0.2) c = -0.2
              f = KD0 * g * (p0 - q0) + c * q0
              d0[i]! -= f
              d0[j]! += f
              f = KD1 * g * (p1 - q1) + c * q1
              d1[i]! -= f
              d1[j]! += f
              f = KD2 * g * (p2 - q2) + c * q2
              d2[i]! -= f
              d2[j]! += f
            }
          }
        }
      }
    }
    // Take the moves, then let some pigment settle into the paper (slowly
    // where it is very wet) and some settled pigment float again there.
    for (let y = y0; y <= y1; y++) {
      const row = y * GW
      for (let i = row + x0, e = row + x1; i <= e; i++) {
        const wn = w[i]! + dw[i]!
        let s = SETTLE * (1.25 - wn)
        if (s < SETTLE * 0.12) s = SETTLE * 0.12
        const r = wn > 0.8 ? REDISSOLVE * (wn - 0.8) : 0
        let p = m0[i]! + d0[i]!
        if (p < 0) p = 0
        let t = p * s - f0[i]! * r
        m0[i] = p - t
        f0[i]! += t
        p = m1[i]! + d1[i]!
        if (p < 0) p = 0
        t = p * s - f1[i]! * r
        m1[i] = p - t
        f1[i]! += t
        p = m2[i]! + d2[i]!
        if (p < 0) p = 0
        t = p * s * 1.5 - f2[i]! * r
        m2[i] = p - t
        f2[i]! += t
        let wd = wn + (BASE - wn) * DRY
        if (wd - BASE < 0.004 && BASE - wd < 0.004) wd = BASE
        w[i] = wd
        // Ready for the next step: how freely this cell lets things through,
        // and a clean slate for the moves.
        a[i] = perm[i]! * (0.28 + (wd < W_FULL ? wd : W_FULL) * (0.72 / W_FULL))
        dw[i] = 0
        d0[i] = 0
        d1[i] = 0
        d2[i] = 0
      }
    }
    if (x0 < rx0) rx0 = x0
    if (y0 < ry0) ry0 = y0
    if (x1 > rx1) rx1 = x1
    if (y1 > ry1) ry1 = y1
    dirty = true

    // Now and then pull the box back in around what is still moving, and
    // stop altogether once the sheet has settled.
    if (steps % 20 === 0) {
      let nx0 = GW
      let ny0 = GH
      let nx1 = -1
      let ny1 = -1
      for (let y = y0; y <= y1; y++) {
        const row = y * GW
        for (let x = x0; x <= x1; x++) {
          const i = row + x
          const dwet = w[i]! - BASE
          if (m0[i]! + m1[i]! + m2[i]! > 0.003 || dwet !== 0) {
            if (x < nx0) nx0 = x
            if (x > nx1) nx1 = x
            if (y < ny0) ny0 = y
            if (y > ny1) ny1 = y
          }
        }
      }
      bx0 = nx0
      by0 = ny0
      bx1 = nx1
      by1 = ny1
      if (nx1 < 0) active = false
    }
  }

  const render = () => {
    if (!dirty || (!urgent && steps % 2 === 1)) return
    dirty = false
    urgent = false
    if (rx1 < rx0 || ry1 < ry0) return
    const K00 = K[0][0] * LUT_SCALE
    const K01 = K[0][1] * LUT_SCALE
    const K02 = K[0][2] * LUT_SCALE
    const K10 = K[1][0] * LUT_SCALE
    const K11 = K[1][1] * LUT_SCALE
    const K12 = K[1][2] * LUT_SCALE
    const K20 = K[2][0] * LUT_SCALE
    const K21 = K[2][1] * LUT_SCALE
    const K22 = K[2][2] * LUT_SCALE
    const top = LUT_N - 1
    for (let y = ry0; y <= ry1; y++) {
      const row = y * GW
      for (let x = rx0; x <= rx1; x++) {
        const i = row + x
        const gr = gran[i]!
        // Settled pigment sits in the hollows of the paper; blue most of all.
        // The speckle is strongest in thin washes and evens out in thick ones.
        let s0 = f0[i]!
        const s1 = f1[i]!
        const s2 = f2[i]!
        const c0 = m0[i]! + s0 + (gr - 1) * 0.6 * (s0 < 0.4 ? s0 : 0.4)
        const c1 = m1[i]! + s1 + (gr - 1) * 0.4 * (s1 < 0.4 ? s1 : 0.4)
        s0 = gr * gr - 1
        const c2 = m2[i]! + s2 + s0 * (s2 < 0.45 ? s2 : 0.45)
        // Wet paper is a shade darker and cooler than damp paper.
        let wet = (w[i]! - BASE) * LUT_SCALE
        if (wet < 0) wet *= 0.4
        let r = (c0 * K00 + c1 * K10 + c2 * K20 + wet * 0.11) | 0
        let gch = (c0 * K01 + c1 * K11 + c2 * K21 + wet * 0.1) | 0
        let b = (c0 * K02 + c1 * K12 + c2 * K22 + wet * 0.07) | 0
        if (r > top) r = top
        else if (r < 0) r = 0
        if (gch > top) gch = top
        else if (gch < 0) gch = 0
        if (b > top) b = top
        else if (b < 0) b = 0
        const o = i * 4
        px[o] = lutR[r]!
        px[o + 1] = lutG[gch]!
        px[o + 2] = lutB[b]!
        px[o + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0, rx0, ry0, rx1 - rx0 + 1, ry1 - ry0 + 1)
    rx0 = GW
    ry0 = GH
    rx1 = -1
    ry1 = -1
  }

  const amount = () => {
    let sum = 0
    for (let i = 0; i < N; i += 7) sum += m0[i]! + m1[i]! + m2[i]! + f0[i]! + f1[i]! + f2[i]!
    return (sum * 7) / N
  }

  clear()
  render()

  return {
    canvas,
    clear,
    brush,
    sponge,
    step,
    render,
    amount,
    get active() {
      return active
    },
  }
}
