import * as THREE from 'three'
import { EASEL, FLOOR_Y, KEY, NAILS, PICTURE, STEPS, TABLE, HUNG } from '../layout'
import { Press, canvas, sheetOf, swatch, texture, tinMaterial } from './tin'

// The studio: one printed tin doll's room. The wall and floor are printed
// flat and stay paler than whoever stands before them.

const INK = '#2b2430'
const S = { cream: swatch(0), ink: swatch(1), orange: swatch(2), teal: swatch(3), red: swatch(4), brown: swatch(5), steel: swatch(6), gold: swatch(7), pale: swatch(8), blue: swatch(9), wood: swatch(10), green: swatch(11), pink: swatch(12), plum: swatch(13) }

function wallPrint(): HTMLCanvasElement {
  const { sheet, pen } = canvas(2048, 1024)
  pen.fillStyle = '#dfe3c9'
  pen.fillRect(0, 0, 2048, 1024)
  // Paper: rows of small pressed flowers between stripes.
  for (let x = 0; x < 2048; x += 64) {
    pen.fillStyle = x % 128 ? '#d3dabd' : '#e6e8d2'
    pen.fillRect(x, 0, 64, 1024)
    for (let y = 20; y < 760; y += 74) {
      pen.save()
      pen.translate(x + 32, y + (x % 128 ? 37 : 0))
      pen.fillStyle = '#b9c9a0'
      for (let k = 0; k < 5; k++) { pen.rotate((Math.PI * 2) / 5); pen.beginPath(); pen.ellipse(0, -11, 6, 9, 0, 0, 7); pen.fill() }
      pen.fillStyle = '#e8c487'
      pen.beginPath(); pen.arc(0, 0, 5, 0, 7); pen.fill()
      pen.restore()
    }
  }
  // Cornice.
  pen.fillStyle = '#efe6cb'
  pen.fillRect(0, 0, 2048, 42)
  for (let x = 0; x < 2048; x += 48) { pen.fillStyle = '#d7b98a'; pen.beginPath(); pen.arc(x + 24, 42, 22, 0, Math.PI); pen.fill() }
  // A tall window with weather, behind the painter.
  const wx = 820, wy = 70, ww = 408, wh = 660
  pen.fillStyle = '#f7f0dc'
  pen.fillRect(wx - 26, wy - 20, ww + 52, wh + 46)
  pen.strokeStyle = '#b99c6b'
  pen.lineWidth = 5
  pen.strokeRect(wx - 26, wy - 20, ww + 52, wh + 46)
  const sky = pen.createLinearGradient(0, wy, 0, wy + wh)
  sky.addColorStop(0, '#9fd0e0')
  sky.addColorStop(1, '#e9f2e6')
  pen.fillStyle = sky
  pen.fillRect(wx, wy, ww, wh)
  for (const [x, y, r] of [[880, 190, 34], [920, 176, 46], [966, 194, 32], [1110, 300, 30], [1150, 286, 42], [1190, 304, 28]]) { pen.fillStyle = '#fbfaf2'; pen.beginPath(); pen.arc(x, y, r, 0, 7); pen.fill() }
  pen.fillStyle = '#a9c489'
  pen.beginPath(); pen.ellipse(930, 760, 240, 190, 0, 0, 7); pen.ellipse(1190, 770, 190, 150, 0, 0, 7); pen.save(); pen.clip(); pen.fillRect(wx, 400, ww, wy + wh - 400); pen.restore()
  // Roofs of a small town.
  for (let k = 0; k < 6; k++) {
    const x = wx + 10 + k * 66, y = 600 + (k % 3) * 22
    pen.fillStyle = ['#e7d7b4', '#f0e2c6', '#dcc9a4'][k % 3]
    pen.fillRect(x, y, 54, wy + wh - y)
    pen.fillStyle = ['#d98a5c', '#c9744e', '#e0a06c'][k % 3]
    pen.beginPath(); pen.moveTo(x - 6, y); pen.lineTo(x + 27, y - 38); pen.lineTo(x + 60, y); pen.fill()
    pen.fillStyle = '#8fb4c0'
    pen.fillRect(x + 12, y + 22, 12, 16); pen.fillRect(x + 32, y + 22, 12, 16)
  }
  pen.fillStyle = '#f7f0dc'
  pen.fillRect(wx + ww / 2 - 8, wy, 16, wh)
  for (const y of [0.34, 0.67]) pen.fillRect(wx, wy + wh * y - 6, ww, 12)
  // Curtains.
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? wx - 90 : wx + ww + 90
    for (let k = 0; k < 7; k++) {
      pen.fillStyle = k % 2 ? '#e09a5c' : '#d4854a'
      pen.beginPath()
      pen.moveTo(x0 - s * 4 + s * -k * 20, wy - 40)
      pen.quadraticCurveTo(x0 - s * k * 20, 420, x0 - s * k * 9, 520)
      pen.quadraticCurveTo(x0 - s * k * 6, 640, x0 - s * k * 13, 800)
      pen.lineTo(x0 - s * k * 13 - s * 22, 800)
      pen.quadraticCurveTo(x0 - s * k * 6 - s * 14, 640, x0 - s * k * 9 - s * 14, 520)
      pen.quadraticCurveTo(x0 - s * k * 20 - s * 14, 420, x0 - s * k * 20 - s * 24, wy - 40)
      pen.fill()
    }
    pen.fillStyle = '#c8a24c'
    pen.fillRect(s < 0 ? wx - 96 : wx + ww + 18, 508, 78, 20)
  }
  pen.fillStyle = '#b07a3a'
  pen.fillRect(wx - 150, wy - 52, ww + 300, 18)
  // Wainscot.
  pen.fillStyle = '#c7a878'
  pen.fillRect(0, 790, 2048, 234)
  pen.fillStyle = '#efe0bb'
  pen.fillRect(0, 782, 2048, 16)
  for (let x = 12; x < 2048; x += 128) {
    pen.fillStyle = '#d9bf92'
    pen.fillRect(x, 820, 104, 170)
    pen.strokeStyle = '#a5804e'
    pen.lineWidth = 4
    pen.strokeRect(x, 820, 104, 170)
    pen.fillStyle = '#cfb182'
    pen.beginPath(); pen.ellipse(x + 52, 905, 34, 58, 0, 0, 7); pen.fill()
  }
  // The screen of a cheap print, over it all.
  pen.fillStyle = 'rgba(120,96,60,0.16)'
  for (let y = 0; y < 1024; y += 8) for (let x = (y % 16) / 2; x < 2048; x += 8) pen.fillRect(x, y, 2, 2)
  return sheet
}

function floorPrint(): HTMLCanvasElement {
  const { sheet, pen } = canvas(1024, 1024)
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    pen.fillStyle = (x + y) % 2 ? '#c99767' : '#dcb384'
    pen.fillRect(x * 64, y * 64, 64, 64)
    pen.strokeStyle = 'rgba(120,76,38,0.35)'
    pen.lineWidth = 2
    for (let k = 0; k < 5; k++) { pen.beginPath(); if ((x + y) % 2) { pen.moveTo(x * 64, y * 64 + 8 + k * 12); pen.lineTo(x * 64 + 64, y * 64 + 8 + k * 12) } else { pen.moveTo(x * 64 + 8 + k * 12, y * 64); pen.lineTo(x * 64 + 8 + k * 12, y * 64 + 64) } pen.stroke() }
  }
  // A printed rug under the table.
  for (const [r, c] of [[500, '#8f2f2c'], [480, '#e7c27a'], [462, '#a83a34'], [390, '#e7c27a'], [378, '#2f7f80']] as const) { pen.fillStyle = c; pen.beginPath(); pen.ellipse(512, 560, r, r * 0.92, 0, 0, 7); pen.fill() }
  for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; pen.fillStyle = k % 2 ? '#e7c27a' : '#f3e3bb'; pen.beginPath(); pen.ellipse(512 + Math.cos(a) * 426, 560 + Math.sin(a) * 392, 18, 18, 0, 0, 7); pen.fill() }
  return sheet
}

/** The wall runs on past its print: the paper repeats, the window does not. */
function wide(plane: THREE.PlaneGeometry): THREE.PlaneGeometry {
  const uv = plane.getAttribute('uv') as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) - 0.5) * 2 + 0.5)
  return plane
}

/** The floor runs on past its print as long boards. */
function wideFloor(plane: THREE.PlaneGeometry): THREE.PlaneGeometry {
  const uv = plane.getAttribute('uv') as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) - 0.5) * (40 / 26) + 0.5)
  return plane
}

export class Room {
  readonly root = new THREE.Group()
  /** The disc that turns, with nothing standing on it. */
  readonly table: THREE.Mesh
  readonly key: THREE.Mesh
  private readonly bin: { dispose(): void }[] = []

  constructor(matcap: THREE.Texture) {
    const keep = <T extends { dispose(): void }>(thing: T): T => { this.bin.push(thing); return thing }
    const wallMap = keep(texture(wallPrint())), floorMap = keep(texture(floorPrint()))
    wallMap.wrapS = THREE.RepeatWrapping
    const wall = new THREE.Mesh(keep(wide(new THREE.PlaneGeometry(40, 10))), keep(new THREE.MeshBasicMaterial({ map: wallMap })))
    wall.position.set(0, FLOOR_Y + 5, -7.9)
    wall.name = 'wall'
    const floor = new THREE.Mesh(keep(wideFloor(new THREE.PlaneGeometry(40, 20))), keep(new THREE.MeshBasicMaterial({ map: floorMap })))
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, FLOOR_Y, 2.2)
    floor.name = 'floor'
    const sheet = keep(sheetOf((p) => {
      // The table's drum, printed as a carousel.
      p.fill('#f6ead0')
      p.patch(-180, 180, 40, 90, '#1f8a8c').patch(-180, 180, -90, -55, '#d3622e')
      for (let lon = -180; lon < 180; lon += 20) {
        p.patch(lon, lon + 10, -55, 40, '#f2b84b')
        p.oval(lon + 15, -6, 3.4, 22, '#d3622e').oval(lon + 5, -6, 3, 12, '#1f8a8c')
      }
      p.scallops(40, -180, 180, 10, 16, '#1f8a8c')
    }, (p) => {
      // Table top, printed flat: this half sheet is laid on the disc.
      p.fill('#f6ead0')
    }, ['#f6ead0', INK, '#dd7434', '#1f8a8c', '#c8362c', '#6b4528', '#cfcac0', '#e8b33c', '#e9dcc0', '#2d5fa8', '#b98a55', '#6fa84f', '#e79aa4', '#7a4f7c']))
    const pen = (sheet.image as HTMLCanvasElement).getContext('2d')!
    // The disc's own print: rings, and a plain pale circle where each one stands.
    const ring = (r: number, c: string): void => { pen.fillStyle = c; pen.beginPath(); pen.arc(256, 768, r, 0, 7); pen.fill() }
    pen.fillStyle = '#1f8a8c'
    pen.fillRect(0, 512, 512, 512)
    ring(252, '#1f8a8c'); ring(236, '#f2b84b'); ring(228, '#2a9a9a'); ring(96, '#f2b84b'); ring(90, '#d3622e'); ring(60, '#f6ead0'); ring(30, '#1f8a8c')
    for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2; pen.fillStyle = k % 2 ? '#f6ead0' : '#f2b84b'; pen.beginPath(); pen.arc(256 + Math.cos(a) * 244, 768 + Math.sin(a) * 244, 5, 0, 7); pen.fill() }
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      pen.fillStyle = '#f6ead0'
      pen.beginPath(); pen.arc(256 + x * 1.31 * 85, 768 + z * 1.31 * 85, 84, 0, 7); pen.fill()
      pen.strokeStyle = '#d3622e'
      pen.lineWidth = 5
      pen.beginPath(); pen.arc(256 + x * 1.31 * 85, 768 + z * 1.31 * 85, 77, 0, 7); pen.stroke()
    }
    sheet.needsUpdate = true
    const tin = keep(tinMaterial(matcap, sheet))

    const top = new Press()
    const side = new THREE.CylinderGeometry(TABLE.r, TABLE.r, TABLE.h, 64, 1, true)
    side.translate(0, -TABLE.h / 2 - 0.01, 0)
    top.add(side, [0, 0, 1024, 512])
    const disc = new THREE.CircleGeometry(TABLE.r, 64)
    top.add(disc, [4, 516, 504, 504], { turn: [-Math.PI / 2, 0, 0] })
    top.add(new THREE.TorusGeometry(TABLE.r, 0.07, 8, 64), S.gold, { at: [0, -0.02, 0], turn: [Math.PI / 2, 0, 0] })
    this.table = new THREE.Mesh(keep(top.weld()), tin)
    this.table.name = 'table-top'

    const still = new Press()
    still.disc(S.red, [0, -TABLE.h - 0.2, 0], TABLE.r - 0.2, 0.3, undefined, TABLE.r - 0.35, 48)
    still.disc(S.gold, [0, FLOOR_Y + 0.36, 0], 2.2, 0.6, undefined, 1.4, 40)
    // The steps: three printed boxes up each side.
    STEPS.forEach((step, n) => {
      const h = step.y - FLOOR_Y, size = 2.6
      still.add(new THREE.BoxGeometry(size, h - 0.12, 2.72), [S.teal, S.orange, S.plum][n % 3], { at: [step.x, FLOOR_Y + (h - 0.12) / 2, step.z] })
      still.add(new THREE.BoxGeometry(size + 0.12, 0.11, 2.78), S.pale, { at: [step.x, step.y - 0.062, step.z] })
      for (let k = -2; k <= 2; k++) still.add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16), S.gold, { at: [step.x + k * 0.5, step.y - 0.32, step.z + 1.375], turn: [Math.PI / 2, 0, 0] })
    })
    // The painter's dais.
    still.disc(S.plum, [0, FLOOR_Y + 0.07, -5.6], 1.35, 0.14, undefined, 1.3, 40)
    // Easel legs, its ledge, and pots of brushes by it.
    for (const s of [-1, 1]) still.tube(S.wood, [[EASEL.x + s * 0.9, FLOOR_Y, EASEL.z - 0.25], [EASEL.x + s * 0.16, 4.1, EASEL.z - 0.42]], () => 0.08, 2, 6)
    still.tube(S.wood, [[EASEL.x, FLOOR_Y, EASEL.z - 1.6], [EASEL.x, 3.9, EASEL.z - 0.45]], () => 0.07, 2, 6)
    still.add(new THREE.BoxGeometry(2.3, 0.12, 0.34), S.wood, { at: [EASEL.x, EASEL.y - PICTURE.h / 2 - 0.2, EASEL.z - 0.15], turn: [0, EASEL.yaw, 0] })
    for (const [x, z, c] of [[2.1, -5.6, S.orange], [2.75, -6.1, S.teal], [2.6, -5.1, S.pink]] as const) {
      still.disc(c, [x, 1.0, z], 0.28, 0.6, undefined, 0.32)
      for (let k = 0; k < 4; k++) still.tube([S.wood, S.red, S.gold, S.brown][k], [[x, 1.1, z], [x - 0.2 + k * 0.14, 2.0 + (k % 2) * 0.2, z - 0.1 + (k % 3) * 0.1]], (t) => (t > 0.85 ? 0.08 : 0.03), 6, 6)
    }
    still.add(new THREE.BoxGeometry(1.7, 0.14, 2.0), S.wood, { at: [2.45, 0.62, -5.6] })
    still.add(new THREE.BoxGeometry(1.4, 2.05, 1.7), S.red, { at: [2.45, -0.48, -5.6] })
    const base = new THREE.Mesh(keep(still.weld()), tin)
    base.name = 'studio'

    // The key that turns the table, folded flat or standing up.
    const key = new Press().disc(S.gold, [0, 0.2, 0], 0.09, 0.5)
    for (const s of [-1, 1]) key.shell(S.gold, [s * 0.42, 0.7, 0], [0.46, 0.3, 0.09], [0, 0, s * 0.3], 26).shell(S.red, [s * 0.46, 0.71, 0.05], [0.2, 0.13, 0.06], [0, 0, s * 0.3], 18)
    this.key = new THREE.Mesh(keep(key.weld()), tin)
    this.key.name = 'table-key'
    this.key.position.set(KEY.x, KEY.y, KEY.z)
    this.root.add(wall, floor, this.table, base, this.key)
  }

  dispose(): void {
    for (const thing of this.bin) thing.dispose()
  }
}

/** A gilt frame round a picture: its back shows bare canvas and stretcher bars. */
export function frameGeometry(press: Press, w: number, h: number, gold: ReturnType<typeof swatch>, back: ReturnType<typeof swatch>, bar: ReturnType<typeof swatch>): Press {
  const t = 0.17
  for (const s of [-1, 1]) {
    press.add(new THREE.CapsuleGeometry(t * 0.75, w + t * 2, 4, 12), gold, { at: [0, s * (h / 2 + t * 0.55), 0], turn: [0, 0, Math.PI / 2] })
    press.add(new THREE.CapsuleGeometry(t * 0.75, h + t * 2, 4, 12), gold, { at: [s * (w / 2 + t * 0.55), 0, 0] })
    for (const q of [-1, 1]) press.shell(gold, [s * (w / 2 + t * 0.6), q * (h / 2 + t * 0.6), 0.02], [0.22, 0.22, 0.15], undefined, 14)
    press.shell(gold, [s * (w / 2 + t), 0, 0.03], [0.13, 0.24, 0.12], undefined, 12).shell(gold, [0, s * (h / 2 + t), 0.03], [0.24, 0.13, 0.12], undefined, 12)
  }
  press.add(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.05), back, { at: [0, 0, -0.04] })
  for (const s of [-1, 1]) press.add(new THREE.BoxGeometry(0.12, h + 0.1, 0.06), bar, { at: [s * w * 0.46, 0, -0.09] }).add(new THREE.BoxGeometry(w + 0.1, 0.12, 0.06), bar, { at: [0, s * h * 0.46, -0.092] })
  press.add(new THREE.BoxGeometry(0.12, h, 0.06), bar, { at: [0, 0, -0.088] })
  return press
}

export const FRAME = { gold: S.gold, back: S.pale, bar: S.wood } as const
export const nails = NAILS.map((n) => ({ ...n, size: HUNG }))
