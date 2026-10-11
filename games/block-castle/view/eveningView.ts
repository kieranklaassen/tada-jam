import * as THREE from 'three'
import { FLAG, LADDER_OFF, ROOF, ROOF_OUT, SLATS, bridgeBoards, grilleBars, type Thing } from '../castle'
import { ACT_SECONDS, type Evening } from '../evening'
import { BELL, MOAT, RUG, SIZE } from '../layout'
import { clamp01, smooth } from '../motion'
import { merge, type Part } from './folkView'
import { blotTexture, waterTexture } from './paint'

// What the evening adds to the room: the bell, the moat, and what each block
// becomes. A block stays the plain block it is; its thing is laid on it in
// colour: boards and rope on a long one, a grille and two lanterns on an arch,
// a roof on a round one, a flag on a thin one, shutters and a light on a cube,
// a polished face and a ladder on a slope. Each arrives by a motion of its own
// and answers a tap with another.
//
// Draws: the bell two, and one each for the wooden and cloth parts (boxes),
// the lit parts, the roofs, the moat and the glow.

const BITS = 200
const LIGHTS = 16
const ROOFS = 3
const GLOWS = 16

const TONE = {
  board: '#c08a4e', boardDark: '#a8743f', rope: '#e0c890', iron: '#3d4350', roof: '#c2513f', merlon: '#b9a888', shutter: '#4f807a',
  shine: '#f6e7bd', ladder: '#8a623c', lit: '#ffd98a', lantern: '#ffc45e', out: '#4a4136',
}
/** The three colours a flag can show. */
const FLAGS = ['#d9a441', '#3f7fb0', '#c2513f']

/** The moat as one flat mesh of three bands, its ripples the same size all round. */
function moatGeometry(short: boolean): THREE.BufferGeometry {
  const y = -RUG.thick + 0.004
  const bands: [number, number, number, number][] = [
    [RUG.x0 - MOAT.left, RUG.x0, MOAT.from, short ? 0.4 : RUG.z1 + MOAT.front],
    [short ? RUG.x0 + 0.12 : RUG.x0, RUG.x1 + MOAT.right, RUG.z1, RUG.z1 + MOAT.front],
    [RUG.x1, RUG.x1 + MOAT.right, MOAT.from, RUG.z1],
  ]
  const position: number[] = [], uv: number[] = [], index: number[] = []
  bands.forEach(([x0, x1, z0, z1], n) => {
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) {
      position.push(x, y, z)
      uv.push(x / 2.4, -z / 2.4)
    }
    index.push(n * 4, n * 4 + 3, n * 4 + 2, n * 4, n * 4 + 2, n * 4 + 1)
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(index)
  return geometry
}

const bump = (t: number): number => Math.sin(clamp01(t) * Math.PI)
/** Past 1 and back: something that opens with a spring in it. */
const spring = (t: number): number => { const p = clamp01(t); return 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2 }

export class EveningView {
  readonly group = new THREE.Group()
  /** The bell on its branch: the part that swings. */
  readonly bell = new THREE.Group()
  private readonly bits: THREE.InstancedMesh
  private readonly lights: THREE.InstancedMesh
  private readonly roofs: THREE.InstancedMesh
  private readonly moat: THREE.Mesh
  private readonly moatWhole: THREE.BufferGeometry
  private readonly moatShort: THREE.BufferGeometry
  private readonly glows: THREE.InstancedMesh
  private readonly lamp = new THREE.PointLight('#ffb65c', 0, 0, 1)
  private bit = 0
  private light = 0
  private roof = 0
  private glow = 0
  private readonly bitOf: string[] = new Array<string>(BITS).fill('dress')
  private readonly lightOf: string[] = new Array<string>(LIGHTS).fill('dress')
  private readonly roofOf: string[] = new Array<string>(ROOFS).fill('dress')
  private readonly matrix = new THREE.Matrix4()
  private readonly at = new THREE.Vector3()
  private readonly turn = new THREE.Quaternion()
  private readonly size = new THREE.Vector3()
  private readonly euler = new THREE.Euler()
  private readonly tint = new THREE.Color()
  private readonly dim = new THREE.Color()

  constructor() {
    this.group.name = 'evening'

    // The bell's stand: a forked branch stuck in a knot of wood, with the bell hung from its longer fork.
    const twig = '#6d5139'
    const stick = (r0: number, r1: number, long: number): THREE.BufferGeometry => new THREE.CylinderGeometry(r1, r0, long, 7)
    const stand: Part[] = [
      { geometry: new THREE.CylinderGeometry(0.3, 0.36, 0.2, 12), colour: '#8a6a48', at: [-0.42, 0.1, 0] },
      { geometry: stick(0.08, 0.06, 1.5), colour: twig, at: [-0.42, 0.9, 0], turn: [0, 0, 0.04] },
      { geometry: stick(0.055, 0.04, 0.82), colour: twig, at: [-0.1, 1.68, 0], turn: [0, 0, -1.2] },
      { geometry: stick(0.045, 0.03, 0.4), colour: twig, at: [-0.58, 1.72, 0], turn: [0, 0, 0.7] },
      { geometry: new THREE.SphereGeometry(0.07, 7, 5), colour: '#aeb394', at: [-0.7, 1.86, 0] },
    ]
    const post = new THREE.Mesh(merge(stand), new THREE.MeshLambertMaterial({ vertexColors: true }))
    post.name = 'bell-stand'
    const stood = new THREE.Group()
    stood.name = 'bell'
    stood.userData.jamObject = 'bell'
    stood.position.set(BELL.x, 0, BELL.z)
    stood.add(post)
    // The bell: brass, the one bright thing in the room, wide at the mouth, with a clapper showing under it.
    const profile: THREE.Vector2[] = []
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      profile.push(new THREE.Vector2(0.07 + 0.25 * t ** 0.55 + 0.07 * t ** 6, -0.1 - 0.46 * t))
    }
    const brass = new THREE.Mesh(merge([
      { geometry: new THREE.LatheGeometry(profile, 16), colour: '#e2ad3e' },
      { geometry: new THREE.SphereGeometry(0.08, 8, 6), colour: '#e2ad3e', at: [0, -0.08, 0] },
      { geometry: stick(0.02, 0.02, 0.12), colour: '#c9b07a', at: [0, 0, 0] },
      { geometry: new THREE.SphereGeometry(0.075, 8, 6), colour: '#8d6a2c', at: [0, -0.6, 0] },
    ]), new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 90, specular: new THREE.Color('#fff0b8'), side: THREE.DoubleSide }))
    brass.name = 'bell-brass'
    this.bell.position.set(0.22, 1.83 - 0.06, 0)
    this.bell.scale.setScalar(1.3)
    this.bell.add(brass)
    stood.add(this.bell)
    this.group.add(stood)

    const box = new THREE.BoxGeometry(1, 1, 1)
    this.bits = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), BITS)
    this.bits.name = 'dress-wood'
    this.lights = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial(), LIGHTS)
    this.lights.name = 'dress-lights'
    // A roof: a cone standing on its base, a little way down over the top of its tower.
    const cone = new THREE.ConeGeometry(1, 1, 14, 1, false)
    cone.translate(0, 0.5, 0)
    this.roofs = new THREE.InstancedMesh(cone, new THREE.MeshLambertMaterial(), ROOFS)
    this.roofs.name = 'dress-roofs'
    // The moat: the floor round the rug, turned to water on three sides. The wall side has none. Where the king
    // has stayed at his place by the rug it stops short of him.
    this.moatWhole = moatGeometry(false)
    this.moatShort = moatGeometry(true)
    this.moat = new THREE.Mesh(this.moatWhole, new THREE.MeshBasicMaterial({ map: waterTexture(), transparent: true, opacity: 0, depthWrite: false }))
    this.moat.name = 'moat'
    this.moat.renderOrder = 1
    this.moat.visible = false
    this.group.add(this.moat)
    this.glows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blotTexture(0.15), color: '#ffc46a', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }), GLOWS)
    this.glows.name = 'evening-glow'
    this.glows.renderOrder = 6
    for (const mesh of [this.bits, this.lights, this.roofs, this.glows]) {
      mesh.frustumCulled = false
      mesh.count = 0
      this.group.add(mesh)
    }
    for (let i = 0; i < BITS; i++) this.bits.setColorAt(i, this.tint.set('#ffffff'))
    for (let i = 0; i < LIGHTS; i++) this.lights.setColorAt(i, this.tint.set('#ffffff'))
    for (let i = 0; i < ROOFS; i++) this.roofs.setColorAt(i, this.tint.set('#ffffff'))
    this.bits.userData.jamInstanceObjects = this.bitOf
    this.lights.userData.jamInstanceObjects = this.lightOf
    this.roofs.userData.jamInstanceObjects = this.roofOf
    this.lamp.name = 'castle-lamp'
    // High and on the child's side of the rug, and falling off slowly: one of the folk lifted over the castle is lit
    // from above like the rest, and is not much brighter for being nearer.
    this.lamp.position.set(-0.9, 5.6, 5.4)
    this.group.add(this.lamp)
  }

  private wood(owner: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, colour: string, rz = 0, ry = 0): void {
    if (this.bit >= BITS || sx <= 0.0005 || sy <= 0.0005 || sz <= 0.0005) return
    this.at.set(x, y, z)
    this.euler.set(0, ry, rz)
    this.turn.setFromEuler(this.euler)
    this.size.set(sx, sy, sz)
    this.matrix.compose(this.at, this.turn, this.size)
    this.bits.setMatrixAt(this.bit, this.matrix)
    this.bits.setColorAt(this.bit, this.tint.set(colour))
    this.bitOf[this.bit++] = owner
  }

  private lit(owner: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, colour: string, on: number): void {
    if (this.light >= LIGHTS) return
    this.at.set(x, y, z)
    this.size.set(sx, sy, sz)
    this.matrix.compose(this.at, this.turn.identity(), this.size)
    this.lights.setMatrixAt(this.light, this.matrix)
    this.lights.setColorAt(this.light, this.tint.set(colour).lerp(this.dim.set(TONE.out), 1 - on))
    this.lightOf[this.light++] = owner
  }

  private shine(x: number, y: number, z: number, size: number, camera: THREE.Camera): void {
    if (this.glow >= GLOWS || size <= 0.01) return
    this.at.set(x, y, z)
    this.size.setScalar(size)
    this.matrix.compose(this.at, camera.quaternion, this.size)
    this.glows.setMatrixAt(this.glow++, this.matrix)
  }

  /** Lays the evening out as it stands in the toy. `t` is the seconds of play so far. */
  update(evening: Evening, t: number, camera: THREE.Camera): void {
    this.bit = this.light = this.roof = this.glow = 0
    this.bell.rotation.z = evening.bell.value * 0.5
    const dusk = evening.dusk

    const y = -RUG.thick + 0.004
    this.moat.geometry = evening.moatShort ? this.moatShort : this.moatWhole
    this.moat.visible = dusk > 0.01
    const water = this.moat.material as THREE.MeshBasicMaterial
    water.opacity = 0.92 * smooth(dusk)
    // The ripples drift.
    water.map!.offset.set(t * 0.012, 0.04 * Math.sin(t * 0.5))
    // The evening light glints on it.
    if (dusk > 0.3) for (let i = 0; i < 4; i++) {
      const along = (i * 0.29 + 0.11) % 1
      const twinkle = 0.5 + 0.5 * Math.sin(t * (1.1 + 0.3 * i) + i * 2.1)
      this.shine(RUG.x0 + 0.4 + along * (RUG.x1 - RUG.x0), y + 0.03, RUG.z1 + 0.14 + 0.2 * ((i * 0.37) % 1), 0.5 * twinkle * dusk, camera)
    }

    let lamps = 0
    evening.things.forEach((thing, i) => {
      const dress = evening.dress[i]
      if (dress <= 0) return
      const act = evening.acting(i)
      const owner = `thing-${i}`
      switch (thing.what) {
        case 'bridge': this.bridge(evening, thing, i, dress, act, owner); break
        case 'gate': lamps += this.gate(evening, thing, i, dress, owner, camera); break
        case 'tower': this.tower(thing, dress, act, owner, evening.kingOn(i), evening.kingSags(), evening.lid(i)); break
        case 'pole': this.pole(evening, thing, i, dress, act, owner, t); break
        case 'room': lamps += this.room(thing, dress, act, owner, camera); break
        case 'slide': this.slide(thing, dress, act, owner); break
      }
    })
    // The castle's own light falls on its blocks: as warm as there are lamps lit in it.
    this.lamp.intensity = dusk * Math.min(1, 0.35 + lamps * 0.3) * 27

    this.bits.count = this.bit
    this.lights.count = this.light
    this.roofs.count = this.roof
    this.glows.count = this.glow
    for (const mesh of [this.bits, this.lights, this.roofs, this.glows]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }

  /** Boards unroll along its top from one end, and a rope is slung along each side. A tap sends a rattle down the boards. */
  private bridge(evening: Evening, thing: Thing, i: number, dress: number, act: number, owner: string): void {
    const [w, , d] = SIZE.long
    // A springboard bends as one whole: the block turns about the edge of what holds it up, and its boards and
    // ropes with it.
    const bent = evening.bent()
    const angle = bent && bent.index === i ? bent.angle : 0
    const cos = Math.cos(angle), sin = Math.sin(angle)
    const lay = (x: number, y: number, z: number, sx: number, sy: number, sz: number, colour: string): void => {
      if (angle === 0) { this.wood(owner, x, y, z, sx, sy, sz, colour); return }
      const dx = x - bent!.pivot, dy = y - bent!.base
      this.wood(owner, bent!.pivot + cos * dx - sin * dy, bent!.base + sin * dx + cos * dy, z, sx, sy, sz, colour, angle)
    }
    // Every long one has its boards: whole where nothing stands on it, and where a block stands on it the two
    // ends of each board, sticking out from under the block. They unroll along it, and rattle when it is tapped.
    for (const board of bridgeBoards(thing)) {
      const k = board.slat
      const shown = spring((dress * SLATS - k) / 1.6)
      if (dress * SLATS <= k) continue
      const rattle = evening.boardLift(i, k)
      lay(board.x, board.y + rattle, board.z, board.wide * shown, board.tall, board.deep, k % 2 ? TONE.board : TONE.boardDark)
    }
    const rope = clamp01((dress - 0.55) / 0.45)
    if (rope <= 0) return
    // The king's cushion would lie on a rope: where he sits, both are let down.
    const hang = evening.rests.king.thing === i && evening.rests.king.how === 'seat' ? 0.3 : 0.1
    for (const side of [-1, 1]) {
      const z = thing.z + side * (d / 2 + 0.02)
      for (let k = 0; k < 4; k++) lay(thing.x - w / 2 + 0.12 + k * ((w - 0.24) / 3), thing.top - hang + 0.03, z, 0.07, 0.09 * rope, 0.04, TONE.boardDark)
      for (let k = 0; k < 3; k++) {
        const span = (w - 0.24) / 3
        const sway = act < 1 ? 0.03 * bump(act) * Math.sin(act * 30 + k) : 0
        lay(thing.x - w / 2 + 0.12 + (k + 0.5) * span, thing.top - hang - 0.03 + sway, z, span * rope, 0.035, 0.035, TONE.rope)
      }
    }
  }

  /** A grille comes down in its hole in three drops, and a lantern lights on each side. A tap ratchets the grille up and lets it fall. Returns how many lamps are lit. */
  private gate(evening: Evening, thing: Thing, i: number, dress: number, owner: string, camera: THREE.Camera): number {
    const [, , d] = SIZE.arch
    for (const bar of grilleBars(thing, evening.grille(i))) this.wood(owner, bar.x, bar.y, bar.z, bar.wide, bar.tall, bar.deep, TONE.iron)
    // Two lanterns on its face, lit as the grille lands.
    const on = clamp01(dress * 3 - 2)
    for (const side of [-1, 1]) {
      const x = thing.x + side * 0.74, yy = thing.base + 0.98, zz = thing.z + d / 2 + 0.05
      this.wood(owner, x, yy + 0.16, zz, 0.2, 0.05, 0.12, TONE.iron)
      this.lit(owner, x, yy, zz, 0.15, 0.24, 0.1, TONE.lantern, on)
      this.shine(x, yy, zz + 0.1, 1.1 * on, camera)
    }
    return 2 * on
  }

  /** A pointed roof opens over it like an umbrella; with a block on it, battlements pop out round its top. A tap lifts the roof like a lid. */
  private tower(thing: Thing, dress: number, act: number, owner: string, ridden: boolean, sag: number, lid: number): void {
    if (thing.covered) {
      const MERLONS = 6
      for (let k = 0; k < MERLONS; k++) {
        const shown = spring((dress * MERLONS - k) / 1.5)
        if (dress * MERLONS <= k) continue
        const angle = (k / MERLONS) * Math.PI * 2 + 0.26
        // Tapped, they duck one after another round the top.
        const duck = act < 1 ? 0.6 * Math.max(0, Math.sin(act * 14 - k)) * bump(act) : 0
        this.wood(owner, thing.x + Math.cos(angle) * 0.485, thing.top - 0.1 - 0.09 * duck, thing.z + Math.sin(angle) * 0.485, 0.07 * shown, 0.18 * shown * (1 - duck), 0.22, TONE.merlon, 0, -angle)
      }
      return
    }
    if (this.roof >= ROOFS) return
    const open = spring(dress / 0.8)
    // With the king on its point it cannot lift: it sags under him and springs back. Lifted off for a visitor it
    // goes straight up and stays level over his head.
    const lift = act < 1 && !ridden && lid <= 0 ? bump(act) : 0
    // Lifted with nobody coming, it tips back on its far edge.
    this.at.set(thing.x - 0.12 * lift, thing.top + 0.42 * lift + lid, thing.z)
    this.euler.set(0, 0, 0.4 * lift)
    this.turn.setFromEuler(this.euler)
    this.size.set(ROOF_OUT * open, ROOF * (0.55 + 0.45 * clamp01(dress / 0.5)) - sag, ROOF_OUT * open)
    this.matrix.compose(this.at, this.turn, this.size)
    this.roofs.setMatrixAt(this.roof, this.matrix)
    this.roofs.setColorAt(this.roof, this.tint.set(TONE.roof))
    this.roofOf[this.roof++] = owner
  }

  /** A flag unrolls from its top and flies. A tap runs it down the pole and up again in the next of three colours. */
  private pole(evening: Evening, thing: Thing, i: number, dress: number, act: number, owner: string, t: number): void {
    const long = thing.flag * clamp01(dress / 0.6)
    const run = act < 1 ? thing.run * bump(act) : 0
    const colour = FLAGS[(evening.flagColour[i] + (act < 0.5 ? 2 : 0)) % 3]
    // It flies: a slow lift and fall, and a snap as it arrives.
    const snap = dress < 1 ? 0.5 * Math.sin(dress * 19) * (1 - dress) : 0
    const wave = (0.1 * Math.sin(t * 2.6 + i) + snap) * (thing.flag === FLAG.long ? 1 : 0.4)
    const side = thing.side || 1
    const x = thing.x + side * (0.15 + (long / 2) * Math.cos(wave))
    this.wood(owner, x, thing.top - 0.05 - FLAG.deep / 2 - run, thing.z + 0.02 + side * (long / 2) * Math.sin(-wave) * 0.4, long, FLAG.deep, 0.02, colour, side * wave)
    // The knob the rope runs over. Where the king sits on the pole, his cushion is its knob.
    if (evening.rests.king.thing === i && evening.rests.king.how === 'seat') return
    this.wood(owner, thing.x, thing.top + 0.04 * clamp01(dress * 3), thing.z, 0.1, 0.08 * clamp01(dress * 3), 0.1, TONE.rope)
  }

  /** Two shutters clap open on its face and its light comes on. A tap puts the light out and on again. Returns how many lamps are lit. */
  private room(thing: Thing, dress: number, act: number, owner: string, camera: THREE.Camera): number {
    const [w, , d] = SIZE.cube
    const open = spring(dress / 0.5)
    const on = (act < 1 && act * ACT_SECONDS.room < 0.32 ? 0 : 1) * clamp01((dress - 0.5) / 0.25)
    const y = thing.base + 0.52, z = thing.z + d / 2
    this.lit(owner, thing.x, y, z + 0.012, 0.32, 0.4, 0.02, TONE.lit, on)
    for (const side of [-1, 1]) {
      this.wood(owner, thing.x + side * (0.08 + 0.17 * open), y, z + 0.035, 0.16, 0.42, 0.03, TONE.shutter)
      // A small window in each side wall.
      this.lit(owner, thing.x + side * (w / 2 + 0.012), y, thing.z, 0.02, 0.3, 0.3, TONE.lit, on)
    }
    this.shine(thing.x, y, z + 0.12, 1.5 * on, camera)
    return on
  }

  /** Its face takes a shine from the top down, and a ladder drops at its heel. A tap sends a gleam down the face. */
  private slide(thing: Thing, dress: number, act: number, owner: string): void {
    const [w, h, d] = SIZE.slope
    const side = thing.side || 1
    const lip = 0.05
    const run = Math.hypot(w, h - lip)
    const angle = Math.atan2(h - lip, w)
    const shown = clamp01(dress / 0.6)
    // From the heel down: its upper end stays at the heel as it grows.
    const mid = 0.5 * shown
    const cx = thing.x - side * (w / 2) + side * w * mid, cy = thing.base + h - (h - lip) * mid
    const gleam = act < 1 ? bump(act) : 0
    this.wood(owner, cx - side * Math.sin(angle) * 0.012, cy + Math.cos(angle) * 0.012, thing.z, run * shown * 0.96, 0.02, d * (0.66 + 0.2 * gleam), gleam > 0.3 ? '#ffffff' : TONE.shine, -side * angle)
    // The ladder: two rails and four rungs against the heel, dropped from above.
    const drop = (1 - smooth(clamp01((dress - 0.45) / 0.55))) * 1.1
    if (dress <= 0.45) return
    const x = thing.x - side * (w / 2 + LADDER_OFF)
    for (const rail of [-1, 1]) this.wood(owner, x, thing.base + h / 2 + drop, thing.z + rail * 0.2, 0.05, h, 0.05, TONE.ladder)
    for (let k = 0; k < 4; k++) this.wood(owner, x, thing.base + 0.16 + k * 0.23 + drop, thing.z, 0.045, 0.045, 0.36, TONE.ladder)
  }
}
