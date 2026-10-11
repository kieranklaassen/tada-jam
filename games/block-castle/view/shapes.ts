import * as THREE from 'three'
import type { Kind } from '../blocks'
import { HOLE } from '../castle'
import { SIZE } from '../layout'
import { ARCS, BARK, GRAIN, RINGS, type Region } from './paint'

// The six kinds of block as geometry, built once. Raw branch wood: bark where
// the outside of the branch was, pale sawn wood with rings or grain where the
// saw went, hard edges and no bevels. Every face reads one quarter of the
// wood atlas, so all eighteen blocks draw with one material.
// Each shape stands on the origin: the middle of its foot is (0, 0, 0).

type V3 = [number, number, number]

class Builder {
  private readonly position: number[] = []
  private readonly normal: number[] = []
  private readonly uv: number[] = []

  /** A point of a region: `s` across and `t` up, each 0 to 1. */
  static at(region: Region, s: number, t: number): [number, number] {
    return [region.u0 + (region.u1 - region.u0) * s, region.v0 + (region.v1 - region.v0) * t]
  }

  private push(p: V3, n: V3, uv: [number, number]): void {
    this.position.push(p[0], p[1], p[2])
    this.normal.push(n[0], n[1], n[2])
    this.uv.push(uv[0], uv[1])
  }

  /** A triangle, counter-clockwise seen from outside, each corner with its own normal. */
  tri(a: V3, b: V3, c: V3, na: V3, nb: V3, nc: V3, ua: [number, number], ub: [number, number], uc: [number, number]): void {
    this.push(a, na, ua); this.push(b, nb, ub); this.push(c, nc, uc)
  }

  /** A flat four-cornered face, counter-clockwise seen from outside, with the region's corners at s,t = (s0,t0) (s1,t0) (s1,t1) (s0,t1). */
  quad(a: V3, b: V3, c: V3, d: V3, n: V3, region: Region, s0 = 0, t0 = 0, s1 = 1, t1 = 1, turned = false): void {
    const corners: [number, number][] = turned
      ? [Builder.at(region, s0, t0), Builder.at(region, s0, t1), Builder.at(region, s1, t1), Builder.at(region, s1, t0)]
      : [Builder.at(region, s0, t0), Builder.at(region, s1, t0), Builder.at(region, s1, t1), Builder.at(region, s0, t1)]
    this.tri(a, b, c, n, n, n, corners[0], corners[1], corners[2])
    this.tri(a, c, d, n, n, n, corners[0], corners[2], corners[3])
  }

  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normal, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    geometry.computeBoundingSphere()
    return geometry
  }
}

/** The lumps of a branch: no length of branch is quite round. */
const lump = (angle: number): number => 1 + 0.045 * Math.sin(angle * 3 + 1) + 0.03 * Math.sin(angle * 5 + 2.4)

/** A length of branch standing on end: bark round it, rings on both sawn ends. `rings` is how much of the ring face its ends show. */
function branch(b: Builder, radius: number, height: number, segments: number, barkAcross: number, rings: number): void {
  const point = (i: number, y: number): V3 => {
    const angle = (i / segments) * Math.PI * 2
    return [Math.cos(angle) * radius * lump(angle), y, -Math.sin(angle) * radius * lump(angle)]
  }
  const out = (i: number): V3 => {
    const angle = (i / segments) * Math.PI * 2
    return [Math.cos(angle), 0, -Math.sin(angle)]
  }
  const ringAt = (i: number): [number, number] => {
    const angle = (i / segments) * Math.PI * 2
    return Builder.at(RINGS, 0.5 + Math.cos(angle) * 0.5 * rings * lump(angle), 0.5 + Math.sin(angle) * 0.5 * rings * lump(angle))
  }
  const middle = Builder.at(RINGS, 0.5, 0.5)
  for (let i = 0; i < segments; i++) {
    const s0 = (i / segments) * barkAcross, s1 = ((i + 1) / segments) * barkAcross
    const a = point(i, 0), bb = point(i + 1, 0), c = point(i + 1, height), d = point(i, height)
    b.tri(a, bb, c, out(i), out(i + 1), out(i + 1), Builder.at(BARK, s0, 0), Builder.at(BARK, s1, 0), Builder.at(BARK, s1, 1))
    b.tri(a, c, d, out(i), out(i + 1), out(i), Builder.at(BARK, s0, 0), Builder.at(BARK, s1, 1), Builder.at(BARK, s0, 1))
    b.tri([0, height, 0], d, c, [0, 1, 0], [0, 1, 0], [0, 1, 0], middle, ringAt(i), ringAt(i + 1))
    b.tri([0, 0, 0], bb, a, [0, -1, 0], [0, -1, 0], [0, -1, 0], middle, ringAt(i + 1), ringAt(i))
  }
}

/** A box with a region on each pair of faces. `ends` are the faces at left and right, `sides` at front and back, `caps` on top and underneath. */
function box(b: Builder, w: number, h: number, d: number, faces: { ends: [Region, number, number, number, number, boolean?]; sides: [Region, number, number, number, number, boolean?]; caps: [Region, number, number, number, number, boolean?] }): void {
  const x = w / 2, z = d / 2
  const [er, es0, et0, es1, et1, eturn] = faces.ends
  const [sr, ss0, st0, ss1, st1, sturn] = faces.sides
  const [cr, cs0, ct0, cs1, ct1, cturn] = faces.caps
  b.quad([x, 0, z], [x, 0, -z], [x, h, -z], [x, h, z], [1, 0, 0], er, es0, et0, es1, et1, eturn)
  b.quad([-x, 0, -z], [-x, 0, z], [-x, h, z], [-x, h, -z], [-1, 0, 0], er, es0, et0, es1, et1, eturn)
  b.quad([-x, 0, z], [x, 0, z], [x, h, z], [-x, h, z], [0, 0, 1], sr, ss0, st0, ss1, st1, sturn)
  b.quad([x, 0, -z], [-x, 0, -z], [-x, h, -z], [x, h, -z], [0, 0, -1], sr, ss0, st0, ss1, st1, sturn)
  b.quad([-x, h, z], [x, h, z], [x, h, -z], [-x, h, -z], [0, 1, 0], cr, cs0, ct0, cs1, ct1, cturn)
  b.quad([-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], [0, -1, 0], cr, cs0, ct0, cs1, ct1, cturn)
}

/** The arch: a slab sawn across a thick trunk, with a half-round hole sawn through it. Rings on its two sawn faces, bark over its back. */
function arch(b: Builder, w: number, h: number, d: number): void {
  const x = w / 2, z = d / 2
  const hole = HOLE.round, legs = HOLE.legs, corner = 0.4
  const steps = 16
  // The outline and the hole, each walked from the left foot over the top to the right foot in the same number of steps.
  const outer: [number, number][] = []
  const inner: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const angle = Math.PI * (1 - t)
    inner.push(t < 0.08 ? [-hole, legs * (t / 0.08)] : t > 0.92 ? [hole, legs * ((1 - t) / 0.08)] : [Math.cos(Math.PI * (1 - (t - 0.08) / 0.84)) * hole, legs + Math.sin(Math.PI * (1 - (t - 0.08) / 0.84)) * hole])
    // A rectangle with its two top corners rounded, as a trunk is.
    const ox = Math.cos(angle), oy = Math.sin(angle)
    const stretch = Math.min(1 / Math.max(Math.abs(ox), 1e-6), 1 / Math.max(oy, 1e-6))
    let px = ox * stretch * x, py = oy * stretch * h
    px = Math.max(-x, Math.min(x, px)); py = Math.min(h, py)
    // Pull the square corners in onto a round.
    const cx = Math.sign(px) * (x - corner), cy = h - corner
    if (Math.abs(px) > x - corner && py > cy) {
      const dx = px - cx, dy = py - cy, far = Math.hypot(dx, dy) || 1
      px = cx + (dx / far) * corner; py = cy + (dy / far) * corner
    }
    outer.push([px, py])
  }
  const face = (px: number, py: number): [number, number] => Builder.at(ARCS, 0.5 + px / 2.1, 0.04 + py / 2.1)
  for (let i = 0; i < steps; i++) {
    const [ox0, oy0] = outer[i], [ox1, oy1] = outer[i + 1], [ix0, iy0] = inner[i], [ix1, iy1] = inner[i + 1]
    // Front and back: the sawn faces.
    b.tri([ox0, oy0, z], [ix0, iy0, z], [ix1, iy1, z], [0, 0, 1], [0, 0, 1], [0, 0, 1], face(ox0, oy0), face(ix0, iy0), face(ix1, iy1))
    b.tri([ox0, oy0, z], [ix1, iy1, z], [ox1, oy1, z], [0, 0, 1], [0, 0, 1], [0, 0, 1], face(ox0, oy0), face(ix1, iy1), face(ox1, oy1))
    b.tri([ox0, oy0, -z], [ix1, iy1, -z], [ix0, iy0, -z], [0, 0, -1], [0, 0, -1], [0, 0, -1], face(ox0, oy0), face(ix1, iy1), face(ix0, iy0))
    b.tri([ox0, oy0, -z], [ox1, oy1, -z], [ix1, iy1, -z], [0, 0, -1], [0, 0, -1], [0, 0, -1], face(ox0, oy0), face(ox1, oy1), face(ix1, iy1))
    // The back of the trunk: bark, wrapped over the top.
    const on = (px0: number, py0: number, px1: number, py1: number): V3 => { const dx = px1 - px0, dy = py1 - py0, far = Math.hypot(dx, dy) || 1; return [-dy / far, dx / far, 0] }
    const n = on(ox0, oy0, ox1, oy1)
    b.quad([ox0, oy0, z], [ox1, oy1, z], [ox1, oy1, -z], [ox0, oy0, -z], [n[0], n[1], 0], BARK, i / steps, 0, (i + 1) / steps, 0.4, true)
    // The inside of the hole: sawn.
    const m = on(ix0, iy0, ix1, iy1)
    b.quad([ix0, iy0, -z], [ix1, iy1, -z], [ix1, iy1, z], [ix0, iy0, z], [-m[0], -m[1], 0], GRAIN, i / steps, 0.1, (i + 1) / steps, 0.35)
  }
  // The two feet.
  b.quad([-x, 0, -z], [-hole, 0, -z], [-hole, 0, z], [-x, 0, z], [0, -1, 0], GRAIN, 0, 0.6, 0.2, 0.8)
  b.quad([hole, 0, -z], [x, 0, -z], [x, 0, z], [hole, 0, z], [0, -1, 0], GRAIN, 0.8, 0.6, 1, 0.8)
}

/** The slope: a wedge split off a branch. Its heel is at the left, its toe at the right; bark on its two sides and its heel, pale sawn grain down its face. */
function slope(b: Builder, w: number, h: number, d: number): void {
  const x = w / 2, z = d / 2, lip = 0.05
  const face = (px: number, py: number): [number, number] => Builder.at(BARK, 0.5 + px / 2.6, 0.1 + py / 1.6)
  const heelLow: [number, number] = [-x, 0], heelHigh: [number, number] = [-x, h], toeHigh: [number, number] = [x, lip], toeLow: [number, number] = [x, 0]
  for (const side of [1, -1]) {
    const p = (q: [number, number]): V3 => [q[0], q[1], z * side]
    const n: V3 = [0, 0, side]
    if (side === 1) {
      b.tri(p(heelLow), p(toeLow), p(toeHigh), n, n, n, face(...heelLow), face(...toeLow), face(...toeHigh))
      b.tri(p(heelLow), p(toeHigh), p(heelHigh), n, n, n, face(...heelLow), face(...toeHigh), face(...heelHigh))
    } else {
      b.tri(p(heelLow), p(toeHigh), p(toeLow), n, n, n, face(...heelLow), face(...toeHigh), face(...toeLow))
      b.tri(p(heelLow), p(heelHigh), p(toeHigh), n, n, n, face(...heelLow), face(...heelHigh), face(...toeHigh))
    }
  }
  const run = Math.hypot(w, h - lip)
  const up: V3 = [(h - lip) / run, w / run, 0]
  b.quad([-x, h, z], [x, lip, z], [x, lip, -z], [-x, h, -z], up, GRAIN, 0, 0.05, 1, 0.45)
  b.quad([-x, 0, -z], [-x, 0, z], [-x, h, z], [-x, h, -z], [-1, 0, 0], BARK, 0.1, 0.1, 0.5, 0.6)
  b.quad([x, 0, z], [x, 0, -z], [x, lip, -z], [x, lip, z], [1, 0, 0], GRAIN, 0, 0.5, 0.4, 0.55)
  b.quad([-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], [0, -1, 0], BARK, 0, 0, 1, 0.45)
}

export function blockGeometry(kind: Kind): THREE.BufferGeometry {
  const [w, h, d] = SIZE[kind]
  const b = new Builder()
  switch (kind) {
    case 'round':
      branch(b, w / 2 / 1.045, h, 16, 1, 0.98)
      break
    case 'thin':
      branch(b, w / 2 / 1.045, h, 9, 0.3, 0.42)
      break
    case 'cube':
      // A chunk squared off a branch that stood upright: rings on top, bark left on the two sides that face the child and the wall, sawn on the other two.
      box(b, w, h, d, { ends: [GRAIN, 0.1, 0.1, 0.75, 0.6, true], sides: [BARK, 0.05, 0.1, 0.5, 0.75], caps: [RINGS, 0.2, 0.2, 0.8, 0.8] })
      break
    case 'long':
      // A plank split from a branch: sawn on top and underneath, bark along its two long edges, rings on its ends.
      box(b, w, h, d, { ends: [RINGS, 0.25, 0.42, 0.75, 0.58], sides: [BARK, 0, 0.1, 0.5, 0.95, true], caps: [GRAIN, 0, 0.5, 1, 0.82] })
      break
    case 'arch':
      arch(b, w, h, d)
      break
    case 'slope':
      slope(b, w, h, d)
      break
  }
  return b.build()
}
