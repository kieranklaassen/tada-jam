import * as THREE from 'three'
import type { Game, Pose, Target } from '../game'
import { leftOf } from '../houses'
import { LoadFigure, LoadShapes } from './loads3d'
import { BearFigure, cartOf, cubOf, mouseOf } from './bears3d'
import { BEARS, PITCH, SILL, VIEW, drawnAt } from '../space'
import type { Hint } from '../guide'
import { COLOURS as C, ball, box, join, makeLook, paint } from './look'
import { size } from '../cells'
import type { Kind } from '../loads'

// The scene as three.js objects with no renderer. It is moved from the game's
// numbers each frame and holds no rule.

const COLS = 13, WALL_ROWS = 9
const UPPER = COLS * (WALL_ROWS - SILL), LOWER = COLS * SILL
const MOST_CRUMBS = 70
export type Guide = { hint: Hint; glow: number; press: number; opacity: number }
const ACCENT = [C.pink, C.mint, C.vanilla, C.sky]

export class Stage {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 180)
  readonly look = makeLook()
  private readonly house = new THREE.Group()
  private readonly upper = new THREE.Group()
  private readonly wall: THREE.InstancedMesh
  private readonly base: THREE.InstancedMesh
  private readonly lamp: THREE.Group
  private readonly lampLight: THREE.PointLight
  private readonly figures = new Map<string, LoadFigure>()
  private readonly shapes = new LoadShapes()
  private readonly bears: BearFigure[]
  private readonly cub: THREE.Mesh
  private readonly cart = new THREE.Group()
  private readonly mouse: THREE.Mesh
  private readonly crumbs: THREE.InstancedMesh
  private readonly blobs: THREE.InstancedMesh
  private readonly glows: THREE.InstancedMesh
  private readonly hand: THREE.Sprite
  private readonly kitchen: THREE.Mesh
  private readonly floor: THREE.Mesh
  private laidFor = ''
  private readonly cells: { col: number; row: number }[] = []
  private readonly m = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly p = new THREE.Vector3()
  private readonly s = new THREE.Vector3()
  private readonly colour = new THREE.Color()
  private readonly tints: Record<'sugar' | 'milk' | 'crumb', THREE.Color> = { sugar: new THREE.Color('#ffffff'), milk: new THREE.Color('#f4fbff'), crumb: new THREE.Color(C.crust) }
  private width = 1
  private height = 1

  constructor() {
    this.scene.background = new THREE.Color(C.tile)
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#e2cdbd', 1.9))
    const sun = new THREE.DirectionalLight('#fff9f0', 2.1)
    sun.position.set(-7, 10, 12)
    this.scene.add(sun)
    const add = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, into: THREE.Object3D = this.scene): THREE.Mesh => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = name
      mesh.userData.jamObject = name
      into.add(mesh)
      return mesh
    }
    this.kitchen = add('kitchen', new THREE.PlaneGeometry(40, 14), new THREE.MeshBasicMaterial({ map: this.look.textures.kitchen }))
    this.kitchen.position.set(0, 2.9, -9)
    const cloth = this.look.textures.gingham
    cloth.repeat.set(24, 40)
    this.floor = add('cloth', new THREE.PlaneGeometry(60, 100).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.95 }))
    this.floor.position.set(0, 0, 41)
    // The house: lower wall, upper wall with the openings (which lifts off), and the loft behind.
    this.scene.add(this.house)
    const cube = join([paint(box(0.99, 0.99, 0.95, 0.12, 0, 0, 0, 1), '#ffffff')], 'cube')
    const instanced = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, count: number, into: THREE.Object3D): THREE.InstancedMesh => {
      const mesh = new THREE.InstancedMesh(geometry, material, count)
      mesh.name = name
      mesh.frustumCulled = false
      into.add(mesh)
      return mesh
    }
    this.base = instanced('wall-lower', cube, this.look.sugar, LOWER, this.house)
    this.house.add(this.upper)
    this.wall = instanced('wall-upper', cube, this.look.sugar, UPPER, this.upper)
    for (const mesh of [this.base, this.wall]) mesh.userData.jamInstanceObjects = Array.from({ length: UPPER }, () => 'wall')
    for (let i = 0; i < LOWER; i++) {
      const col = (i % COLS) - 6, row = Math.floor(i / COLS)
      this.base.setMatrixAt(i, this.m.makeTranslation(col, row + 0.5, -0.475))
      this.base.setColorAt(i, this.sugarTint(col, row, null))
    }
    // Icing along the top of the gable and a piped line at the loft floor.
    const icing: THREE.BufferGeometry[] = []
    for (let x = -6; x <= 6; x++) { const y = Math.abs(x) <= 3 ? 9 : 8; icing.push(paint(ball(0.52, x, y + 0.02, -0.46, 1.05, 0.42, 1.05, 12), '#ffffff')); if ((x + 6) % 2 === 0) icing.push(paint(ball(0.2, x + 0.1, y - 0.14, 0.02, 0.9, 1.5, 0.5, 8), '#ffffff')) }
    for (const x of [-4, 4]) icing.push(paint(ball(0.3, x * 1.2, 8.4, -0.46, 1, 1, 1, 12), C.jam))
    icing.push(paint(ball(0.36, 0, 9.4, -0.46, 1, 1, 1, 12), C.jam))
    add('topping', join(icing, 'topping'), this.look.icing, this.upper).userData.jamObject = 'wall'
    const line: THREE.BufferGeometry[] = []
    for (let i = 0; i < 34; i++) line.push(paint(ball(0.19, -6.4 + i * 0.388, 3.8, 0.04, 1, 0.75, 0.6, 8), '#fff'))
    add('piping', join(line, 'piping'), this.look.icing, this.house).userData.jamObject = 'wall'
    const loft = [
      paint(new THREE.BoxGeometry(12.9, 0.3, 4.1).translate(0, SILL - 0.16, -3), C.loftFloor), paint(new THREE.BoxGeometry(12.9, 2.9, 0.2).translate(0, 5.37, -5.06), '#5f3020'),
      ...[-6.4, 6.4].map((x) => paint(new THREE.BoxGeometry(0.2, 2.95, 4).translate(x, 5.4, -3), '#6b3a29')), paint(new THREE.BoxGeometry(12.9, 0.1, 4.2).rotateX(-0.236).translate(0, 7.4, -3), '#5f3324'),
      ...[-5, -3, -1, 1, 3, 5].map((x) => paint(new THREE.BoxGeometry(0.5, 0.5, 0.06).translate(x, 6.6, -4.92), '#8d5440')), ...[-5, -3, -1, 1, 3, 5].map((x) => paint(new THREE.BoxGeometry(0.03, 0.3, 4).translate(x, SILL - 0.145, -2.99), '#9a6a3a')),
    ]
    add('loft', join(loft, 'loft'), this.look.crumb, this.house)
    this.lamp = new THREE.Group()
    this.lamp.position.set(2.2, 7.3, -4.2)
    const shade = add('loft-lamp', join([paint(new THREE.CylinderGeometry(0.03, 0.03, 1, 6).translate(0, -0.5, 0), C.dark), paint(new THREE.ConeGeometry(0.55, 0.5, 20, 1, true).translate(0, -1.1, 0), C.jam), paint(ball(0.17, 0, -1.3, 0), '#fff3b0')], 'loft-lamp'), this.look.lit, this.lamp)
    shade.material = this.look.lit
    this.house.add(this.lamp)
    this.lampLight = new THREE.PointLight('#ffd9a0', 14, 12, 1.6)
    this.lampLight.position.set(0, 7, -2.6)
    this.house.add(this.lampLight)
    this.cub = add('cub', cubOf(), this.look.crumb)
    this.bears = [new BearFigure(0, this.look), new BearFigure(1, this.look)]
    for (const bear of this.bears) this.scene.add(bear.root)
    add('cart-body', cartOf(), this.look.crumb, this.cart).userData.jamObject = 'cart'
    this.mouse = add('mouse-driver', mouseOf(), this.look.icing, this.cart)
    this.mouse.userData.jamObject = 'mouse-driver'
    this.mouse.position.set(-0.5, 0.02, 1.5)
    this.scene.add(this.cart)
    this.crumbs = instanced('crumbs', join([paint(box(1, 1, 1, 0.3, 0, 0, 0, 1), '#ffffff')], 'crumb'), this.look.icing, MOST_CRUMBS, this.scene)
    this.crumbs.count = 0
    const disc = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)
    this.blobs = instanced('shadow-blobs', disc, new THREE.MeshBasicMaterial({ map: this.look.textures.blob, color: '#6b3a2c', transparent: true, opacity: 0.42, depthWrite: false }), 8, this.scene)
    this.glows = instanced('glow-blobs', new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: this.look.textures.blob, color: '#ffe27a', transparent: true, opacity: 0.6, depthWrite: false, depthTest: false }), 6, this.scene)
    this.blobs.renderOrder = 1; this.glows.renderOrder = 8
    this.hand = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.look.textures.hand, transparent: true, depthTest: false, depthWrite: false }))
    this.hand.name = 'ghost-hand'
    this.hand.center.set(0.42, 0.94)
    this.hand.renderOrder = 9
    this.hand.visible = false
    this.scene.add(this.hand)
  }

  private sugarTint(col: number, row: number, accent: string | null): THREE.Color {
    const n = Math.abs(Math.sin(col * 12.9898 + row * 78.233) * 43758.5453) % 1
    this.colour.set(accent ?? (n < 0.2 ? '#fbeee4' : n < 0.45 ? '#fffaf0' : n < 0.7 ? '#f6f1ea' : '#fffdf8'))
    return this.colour.multiplyScalar(0.95 + n * 0.05)
  }

  /** Something in each material, to be compiled before it is first needed. */
  samples(): THREE.Group {
    const group = new THREE.Group(), geometry = paint(new THREE.BoxGeometry(0.01, 0.01, 0.01), '#ffffff')
    for (const one of Object.values(this.look)) if (one instanceof THREE.Material) group.add(new THREE.Mesh(geometry, one))
    return group
  }

  /** The grain is what a slower tier sheds: each material with and without it is compiled ahead by `warm`. */
  setGrain(on: boolean): void {
    for (const [material, map] of [[this.look.sugar, this.look.textures.sugar], [this.look.crumb, this.look.textures.crumb]] as const) {
      if ((material.map !== null) === on) continue
      material.map = on ? map : null
      material.needsUpdate = true
    }
  }

  resize(width: number, height: number): void {
    this.width = width; this.height = height
    const half = Math.max(VIEW.half, ((VIEW.high - VIEW.low) / 2) * (width / height)), tall = half * (height / width), low = VIEW.low
    // On a tall surface the extra goes above and below.
    const spare = tall * 2 - (VIEW.high - VIEW.low), mid = (low + VIEW.high) / 2 + Math.max(0, spare) * 0.06
    this.camera.left = -half; this.camera.right = half; this.camera.top = tall; this.camera.bottom = -tall
    // Looking along the pitch at a point that is drawn at (0, mid).
    const y = mid / Math.cos(PITCH), reach = 100
    this.camera.position.set(0, y + Math.sin(PITCH) * reach, Math.cos(PITCH) * reach)
    this.camera.rotation.set(-PITCH, 0, 0)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
    this.kitchen.scale.set(Math.max(1, half / 18), Math.max(1, tall / 6), 1)
    this.mid = mid; this.half = half; this.tall = tall
  }
  private mid = 0
  private half = 1
  private tall = 1

  at(px: number, py: number): { u: number; v: number } {
    return { u: (px / this.width * 2 - 1) * this.half, v: this.mid + (1 - py / this.height * 2) * this.tall }
  }
  /** Where a drawn point is on the surface, in pixels. */
  onSurface(u: number, v: number): { x: number; y: number } {
    return { x: ((u / this.half + 1) / 2) * this.width, y: ((1 - (v - this.mid) / this.tall) / 2) * this.height }
  }
  get unit(): number { return this.width / (this.half * 2) }

  private figure(owner: string, kind: Kind): LoadFigure {
    const key = `${owner}-${kind}`
    let one = this.figures.get(key)
    if (!one) { one = new LoadFigure(kind, owner, this.shapes, this.look); this.figures.set(key, one); this.scene.add(one.root) }
    return one
  }

  private dented = true
  private cube(game: Game, col: number, row: number): THREE.Matrix4 { return this.m.makeTranslation(col, row + 0.5, -0.475 - (game.dents.get(`${col},${row}`)?.push ?? 0)) }

  /** Lays the upper wall for this house's openings. */
  private lay(game: Game): void {
    const key = game.saved.openings.map((o) => `${o.x}:${o.cells.join(' ')}`).join('|')
    if (key === this.laidFor) return
    this.laidFor = key
    this.dented = true
    const open = new Set<string>()
    for (const o of game.saved.openings) for (const [x, y] of o.cells) open.add(`${leftOf(o) + x},${SILL + y}`)
    const hash = [...key].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7), accent = ACCENT[hash % ACCENT.length]
    this.cells.length = 0
    for (let row = SILL; row < WALL_ROWS; row++) for (let col = -6; col <= 6; col++) {
      if (row === WALL_ROWS - 1 && Math.abs(col) > 3) continue
      if (open.has(`${col},${row}`)) continue
      const beside = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([x, y]) => open.has(`${col + x},${row + y}`))
      this.wall.setColorAt(this.cells.length, this.sugarTint(col, row, beside ? accent : null))
      this.cells.push({ col, row })
    }
    this.wall.count = this.cells.length
    if (this.wall.instanceColor) this.wall.instanceColor.needsUpdate = true
  }

  update(game: Game | null, guide: Guide | null, step: number): void {
    if (!game) { for (const bear of this.bears) bear.root.visible = false; this.cart.visible = false; this.cub.visible = false; this.wall.count = 0; return }
    for (const bear of this.bears) bear.root.visible = true
    this.cart.visible = true; this.cub.visible = true
    this.lay(game)
    this.house.position.x = game.house
    this.upper.position.y = game.front * 10.5
    this.upper.visible = game.front < 0.99
    // The cubes are only written again while one of them is pushed in, and once after.
    if (game.dents.size > 0 || this.dented) {
      this.cells.forEach(({ col, row }, i) => this.wall.setMatrixAt(i, this.cube(game, col, row)))
      for (let i = 0; i < LOWER; i++) this.base.setMatrixAt(i, this.cube(game, (i % COLS) - 6, Math.floor(i / COLS)))
      this.wall.instanceMatrix.needsUpdate = true
      this.base.instanceMatrix.needsUpdate = true
      this.dented = game.dents.size > 0
    }
    this.lamp.rotation.z = Math.sin(game.time * 2.1) * (0.03 + (game.act?.kind === 'ending' ? 0.35 * Math.exp(-Math.abs(game.act.t - 2.5)) : 0))
    this.lampLight.intensity = 14 + game.front * 26
    // Loads.
    for (const one of this.figures.values()) one.hide()
    let blob = 0
    const shade = (x: number, z: number, wide: number, deep: number, y = 0.02): void => { if (blob < 8) this.blobs.setMatrixAt(blob++, this.m.compose(this.p.set(x, y, z), this.q.identity(), this.s.set(wide, 1, deep))) }
    const show = (owner: string, kind: Kind, pose: Pose | null): void => { const f = this.figure(owner, kind); f.update(pose, game, step) }
    game.saved.loads.forEach((load, i) => show(`load-${i}`, load.kind, game.loadPose(i)))
    const next = game.nextPose()
    if (next) show('load-next', game.saved.next!.loads[0].kind, next)
    // Bears.
    this.bears.forEach((bear, who) => {
      const pose = game.bearPose(who as 0 | 1)
      bear.update(pose)
      shade(pose.x, pose.z + 0.1, BEARS[who].radius * 1.4, BEARS[who].radius * 1.1)
    })
    if (game.hands >= 0) { const pose = game.loadPose(game.hands)!; if (pose.z > 2) { const e = size(game.cells()); shade(pose.x, pose.z, e.w * 0.62, 0.8, 0.025) } }
    const cart = game.cart
    this.cart.position.set(cart.x, 0, 4.2)
    this.cart.scale.set(1, cart.squash, 1)
    this.mouse.rotation.y = -0.5 + Math.sin(game.time * 1.3) * 0.2
    this.mouse.position.y = 0.02 + (game.empty && !game.saved.finished ? Math.abs(Math.sin(game.time * 5)) * 0.16 : Math.abs(Math.sin(game.time * 2)) * 0.03)
    shade(cart.x, 4.3, 1.7, 1.2)
    const cub = game.cubPose()
    this.cub.position.set(cub.x + Math.sin(cub.roll) * 0.36, cub.y + (1 - Math.cos(cub.roll)) * 0.52 + Math.abs(Math.sin(cub.roll)) * 0.34, cub.z)
    this.cub.rotation.set(0, 0, cub.roll)
    this.cub.scale.set(1 + (1 - cub.squash) * 0.3, cub.squash, 1)
    shade(cart.x - 0.5, 5.7, 0.6, 0.5)
    this.blobs.count = blob
    this.blobs.instanceMatrix.needsUpdate = true
    game.crumbs.slice(0, MOST_CRUMBS).forEach((c, i) => {
      this.crumbs.setMatrixAt(i, this.m.compose(this.p.set(c.x, c.y, c.z), this.q.setFromAxisAngle(this.s.set(0.6, 0.8, 0), c.life * 9), this.s.setScalar(c.size * Math.min(1, c.life * 4))))
      this.crumbs.setColorAt(i, this.tints[c.kind])
    })
    this.crumbs.count = Math.min(MOST_CRUMBS, game.crumbs.length)
    this.crumbs.instanceMatrix.needsUpdate = true
    if (this.crumbs.instanceColor) this.crumbs.instanceColor.needsUpdate = true
    this.drawGuide(game, guide)
  }

  /** The middle of a target as drawn, and half of its size. */
  middle(target: Target, game: Game): { u: number; v: number; w: number; h: number } {
    if (target.type === 'load') { const pose = game.loadPose(game.hands)!, e = size(game.cells()); return { ...drawnAt(pose.x, pose.y, pose.z + 0.5), w: e.w / 2, h: e.h / 2 } }
    if (target.type === 'bear') { const b = game.bearPose(target.who); return { ...drawnAt(b.x, BEARS[target.who].height * 0.55, b.z + 0.8), w: BEARS[target.who].radius, h: BEARS[target.who].height / 2 } }
    if (target.type === 'opening') { const o = game.saved.openings[target.i], e = size(o.cells); return { ...drawnAt(leftOf(o) + (e.w - 1) / 2, SILL + e.h / 2, 0), w: e.w / 2, h: e.h / 2 } }
    if (target.type === 'cub') { const c = game.cubPose(); return { ...drawnAt(c.x, c.y + 0.5, c.z), w: 0.5, h: 0.6 } }
    return { ...drawnAt(game.cart.x, 1.6, 4.9), w: 1.4, h: 1.5 }
  }

  private drawGuide(game: Game, guide: Guide | null): void {
    let n = 0
    if (guide && guide.glow > 0) for (const target of guide.hint.glow) {
      const at = this.middle(target, game), k = guide.glow * (0.9 + Math.sin(game.time * 4) * 0.1)
      this.glows.setMatrixAt(n++, this.m.compose(this.toWorld(at.u, at.v, 12), this.camera.quaternion, this.s.set((at.w + 0.9) * k, (at.h + 0.9) * k, 1)))
    }
    this.glows.count = n
    ;(this.glows.material as THREE.MeshBasicMaterial).opacity = guide ? guide.glow * 0.34 : 0
    this.glows.instanceMatrix.needsUpdate = true
    this.hand.visible = !!guide && guide.opacity > 0 && !!guide.hint.hand
    if (!this.hand.visible) return
    const at = this.middle(guide!.hint.hand!, game), lift = 0.5 - guide!.press * 0.5
    this.hand.position.copy(this.toWorld(at.u, at.v - lift, 14))
    this.hand.scale.setScalar(1.5 - guide!.press * 0.15)
    ;(this.hand.material as THREE.SpriteMaterial).opacity = guide!.opacity
  }

  /** A point of the world, `z` toward the child, that is drawn at (u, v). */
  private toWorld(u: number, v: number, z: number): THREE.Vector3 { return this.p.set(u, (v + z * Math.sin(PITCH)) / Math.cos(PITCH), z) }

  dispose(): void {
    this.scene.traverse((o) => { const mesh = o as THREE.Mesh; mesh.geometry?.dispose(); const mat = mesh.material; for (const one of Array.isArray(mat) ? mat : mat ? [mat] : []) one.dispose(); if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose() })
    for (const one of Object.values(this.look)) if (one instanceof THREE.Material) one.dispose()
    this.look.dispose()
  }
}

