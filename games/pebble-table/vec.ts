// Small 3D vector and quaternion types for the table's bodies as the rest of
// the game reads them (physics3d.ts syncs them from Rapier each frame). The
// method names follow the vector maths the game and its tests already use.

export class V3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}

  set(x: number, y: number, z: number): this {
    this.x = x
    this.y = y
    this.z = z
    return this
  }

  copy(v: { x: number; y: number; z: number }): this {
    return this.set(v.x, v.y, v.z)
  }

  clone(): V3 {
    return new V3(this.x, this.y, this.z)
  }

  setZero(): this {
    return this.set(0, 0, 0)
  }

  vadd(v: { x: number; y: number; z: number }, target = new V3()): V3 {
    return target.set(this.x + v.x, this.y + v.y, this.z + v.z)
  }

  vsub(v: { x: number; y: number; z: number }, target = new V3()): V3 {
    return target.set(this.x - v.x, this.y - v.y, this.z - v.z)
  }

  scale(s: number, target = new V3()): V3 {
    return target.set(this.x * s, this.y * s, this.z * s)
  }

  addScaledVector(s: number, v: { x: number; y: number; z: number }, target = new V3()): V3 {
    return target.set(this.x + v.x * s, this.y + v.y * s, this.z + v.z * s)
  }

  negate(target = new V3()): V3 {
    return target.set(-this.x, -this.y, -this.z)
  }

  dot(v: { x: number; y: number; z: number }): number {
    return this.x * v.x + this.y * v.y + this.z * v.z
  }

  cross(v: { x: number; y: number; z: number }, target = new V3()): V3 {
    return target.set(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x)
  }

  length(): number {
    return Math.hypot(this.x, this.y, this.z)
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  distanceTo(v: { x: number; y: number; z: number }): number {
    return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z)
  }

  distanceSquared(v: { x: number; y: number; z: number }): number {
    return (this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z]
  }
}

export class Quat {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
    public w = 1,
  ) {}

  set(x: number, y: number, z: number, w: number): this {
    this.x = x
    this.y = y
    this.z = z
    this.w = w
    return this
  }

  copy(q: { x: number; y: number; z: number; w: number }): this {
    return this.set(q.x, q.y, q.z, q.w)
  }

  clone(): Quat {
    return new Quat(this.x, this.y, this.z, this.w)
  }

  setFromAxisAngle(axis: { x: number; y: number; z: number }, angle: number): this {
    const s = Math.sin(angle / 2)
    return this.set(axis.x * s, axis.y * s, axis.z * s, Math.cos(angle / 2))
  }

  /** Euler angles (radians) applied in `order` about the fixed axes' sequence, as three.js composes 'XYZ'. */
  setFromEuler(x: number, y: number, z: number, order: 'XYZ' = 'XYZ'): this {
    void order
    const [c1, c2, c3] = [Math.cos(x / 2), Math.cos(y / 2), Math.cos(z / 2)]
    const [s1, s2, s3] = [Math.sin(x / 2), Math.sin(y / 2), Math.sin(z / 2)]
    return this.set(s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3)
  }

  /** This rotation after `q` (this * q). */
  mult(q: { x: number; y: number; z: number; w: number }, target = new Quat()): Quat {
    const { x: ax, y: ay, z: az, w: aw } = this
    const { x: bx, y: by, z: bz, w: bw } = q
    return target.set(aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz)
  }

  conjugate(target = new Quat()): Quat {
    return target.set(-this.x, -this.y, -this.z, this.w)
  }

  /** `v` turned by this rotation. */
  vmult(v: { x: number; y: number; z: number }, target = new V3()): V3 {
    const { x, y, z } = v
    const { x: qx, y: qy, z: qz, w: qw } = this
    const ix = qw * x + qy * z - qz * y
    const iy = qw * y + qz * x - qx * z
    const iz = qw * z + qx * y - qy * x
    const iw = -qx * x - qy * y - qz * z
    return target.set(ix * qw + iw * -qx + iy * -qz - iz * -qy, iy * qw + iw * -qy + iz * -qx - ix * -qz, iz * qw + iw * -qz + ix * -qy - iy * -qx)
  }

  normalize(): this {
    const l = Math.hypot(this.x, this.y, this.z, this.w) || 1
    return this.set(this.x / l, this.y / l, this.z / l, this.w / l)
  }

  toArray(): [number, number, number, number] {
    return [this.x, this.y, this.z, this.w]
  }
}
