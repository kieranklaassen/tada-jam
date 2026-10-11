import { BELL, FIELD, GATES, STAGE, TOYS, TRAY, WALL } from './layout'

// The look, painted once: a pinball table seen from above in daylight. A
// varnished printed wooden board, chrome rails and posts, rubber rings and
// coloured plastic inserts. Everything that stands still is painted here into
// one sprite, and everything that moves is cut into a few sprites that the
// view stamps. Nothing here reads the game's state.

export type G = CanvasRenderingContext2D

/** The palette. Bright daylight colours; no brass, walnut or dim room. */
export const INK = '#1e2a52'
export const C = {
  wood: '#dfa95f', woodDark: '#b9803f',
  board: '#f8ecc9', ray: '#f2deae', boardLine: '#e6cf9b',
  wallBoard: '#e4f2e6', wallBoardLine: '#b9d8c4',
  chromeDark: '#64748f', chrome: '#c5d1e0', chromeLight: '#ffffff',
  rubber: '#e5433d', rubberDark: '#b32b32', rubberLight: '#ff8f7d',
  skin: '#f0d49c', skinDark: '#d9b674',
  sky: '#63bdf6', cloud: '#ffffff', lamp: '#ffe066',
  coral: '#ff8a5c', flameA: '#ffc247', flameB: '#ff6338',
  aqua: '#41c3ea', waveA: '#86def5', waveB: '#2aa3d8',
  leaf: '#86d660', leafDark: '#5bbd49', fruit: '#ffe066',
  glass: '#8fe0f0', glassDark: '#4fb9d6', glassLight: '#e9fbff',
  dragon: '#8ed43f', dragonDark: '#5ea82c', dragonBelly: '#ffe680', dragonSpike: '#ff7a3d',
  jelly: '#ff6fa3', jellyDark: '#d9477f', jellyLight: '#ffc0d8', plate: '#fff6e0',
  ice: '#dff4ff', iceDark: '#9ccbe8', frost: '#ffffff', pool: '#7fd3f0', poolDark: '#4bb0dc',
  seed: '#c98a4b', seedDark: '#99622f', seedLight: '#e9b77d', vine: '#55b947', vineDark: '#3c8f38', vineBrown: '#a9772f', petal: '#fffdf2',
  sleepy: '#b9a4ec', sleepyDark: '#8d76cf', pillow: '#fff3d6', warm: '#ff9d4d',
  syrup: '#ff8fb8', tray: '#bcd3c2', trayDark: '#8fb09a',
  hotBall: '#ff8a2b', wetBall: '#4ab6f0', heavyBall: '#5d6577',
  walrus: '#b8846a', walrusDark: '#8d5f4b', walrusMuzzle: '#f2cfae', tusk: '#fffbe9', tub: '#c9d5e3', tubDark: '#8d9db5', water: '#63d0f2',
  elephant: '#8fa0ee', elephantDark: '#6477cf', earIn: '#ffa9c4',
  white: '#ffffff', lady: '#ef3b3b',
} as const

/** What a sprite is cut into. A test hands in its own, so that the view can be drawn and counted with no browser. */
export type Surface = { width: number; height: number; getContext(kind: '2d'): unknown }
let makeSurface = (): Surface => document.createElement('canvas')
/** Sets what sprites are cut into from now on, and returns what it was before. */
export function setSurfaceMaker(make: () => Surface): () => Surface {
  const before = makeSurface
  makeSurface = make
  return before
}

export type Sprite = {
  canvas: HTMLCanvasElement
  /** The sprite's size and the point of it that is put at the place it is stamped, in stage units. */
  w: number
  h: number
  ax: number
  ay: number
}

/** Makes a sprite of `w` by `h` stage units at `density` pixels a unit, with `(ax, ay)` as its anchor. `draw` paints in stage units from the sprite's top left. */
export function sprite(density: number, w: number, h: number, ax: number, ay: number, draw: (g: G) => void): Sprite {
  const canvas = makeSurface() as HTMLCanvasElement
  canvas.width = Math.max(1, Math.ceil(w * density))
  canvas.height = Math.max(1, Math.ceil(h * density))
  const g = canvas.getContext('2d')!
  g.scale(density, density)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  draw(g)
  return { canvas, w, h, ax, ay }
}

// --- Shapes ---------------------------------------------------------------------

export function rounded(g: G, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + k, y)
  g.arcTo(x + w, y, x + w, y + h, k)
  g.arcTo(x + w, y + h, x, y + h, k)
  g.arcTo(x, y + h, x, y, k)
  g.arcTo(x, y, x + w, y, k)
  g.closePath()
}

export function oval(g: G, x: number, y: number, rx: number, ry: number, turn = 0): void {
  g.beginPath()
  g.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2)
}

/** Fills the path with a colour and draws the ink line round it: moulded plastic with a printed outline. */
export function inked(g: G, fill: string, line = 5): void {
  g.fillStyle = fill
  g.fill()
  g.strokeStyle = INK
  g.lineWidth = line
  g.stroke()
}

/** A soft white streak: the gloss on plastic and varnish. */
export function gloss(g: G, x: number, y: number, rx: number, ry: number, turn = -0.5, alpha = 0.45): void {
  oval(g, x, y, rx, ry, turn)
  g.fillStyle = `rgba(255,255,255,${alpha})`
  g.fill()
}

/** A chrome rail along a path the caller has begun: a dark edge, the metal, and a highlight line. */
function chrome(g: G, path: () => void, width = 12): void {
  for (const [colour, w, dy] of [[C.chromeDark, width, 0], [C.chrome, width - 4, 0], [C.chromeLight, 2.5, -width / 5]] as const) {
    g.save()
    g.translate(dy, dy)
    path()
    g.strokeStyle = colour
    g.lineWidth = w
    g.stroke()
    g.restore()
  }
}

/** A post under its rubber cap: one red disc with a streak of gloss, and no ring inside it. */
function post(g: G, x: number, y: number, r = 13): void {
  oval(g, x, y, r, r)
  inked(g, C.rubber, 3)
  gloss(g, x - r * 0.28, y - r * 0.32, r * 0.42, r * 0.2, -0.6, 0.7)
}

/** A flat plastic insert set into the board, pale so that it stays behind the working pieces. */
export function insert(g: G, x: number, y: number, r: number, colour: string): void {
  oval(g, x, y, r, r)
  g.fillStyle = colour
  g.fill()
  g.strokeStyle = 'rgba(30,42,82,0.22)'
  g.lineWidth = 2
  g.stroke()
  gloss(g, x - r * 0.3, y - r * 0.35, r * 0.35, r * 0.2, -0.5, 0.5)
}

// --- The board ---------------------------------------------------------------------

const PANEL = { left: 8, right: STAGE.width - 8, top: 8, bottom: STAGE.height - 8, apron: 96 } as const

function paintApron(g: G): void {
  g.save()
  rounded(g, PANEL.left, PANEL.top, PANEL.right - PANEL.left, PANEL.apron - PANEL.top + 30, 14)
  g.clip()
  g.fillStyle = C.sky
  g.fillRect(0, 0, STAGE.width, PANEL.apron + 8)
  // Clouds along the foot of the apron: scallops of white, large and small.
  g.fillStyle = C.cloud
  g.beginPath()
  for (let x = -20, i = 0; x < STAGE.width + 40; i++) {
    const r = 22 + ((i * 37) % 23)
    g.moveTo(x + r, PANEL.apron + 10)
    g.arc(x, PANEL.apron + 10, r, 0, Math.PI * 2)
    x += r * 1.25
  }
  g.fill()
  // A printed sun, half risen behind the clouds at the left.
  oval(g, 150, 78, 46, 46)
  g.fillStyle = '#ffd84a'
  g.fill()
  g.restore()
  // The lamps: each one yellow dome with an ink line and a streak of gloss, and no ring round it or inside it.
  for (const [x, y] of LAMPS) {
    oval(g, x, y, LAMP_R, LAMP_R)
    inked(g, C.lamp, 2.5)
    gloss(g, x - LAMP_R * 0.3, y - LAMP_R * 0.34, LAMP_R * 0.4, LAMP_R * 0.2, -0.5, 0.75)
  }
}

/**
 * The lamps of the apron, which the view lights with one additive stamp each. No two gaps and no two heights
 * beside each other are alike, and along the whole apron neither the heights nor the gaps take turns (high, low,
 * high, low) for more than three in a row: they are lamps strung along a rim, not a row of marks. None is under
 * the home control, and each is above the ladybird's walk.
 */
export const LAMP_R = 10
export const LAMPS: readonly (readonly [number, number])[] = [
  [38, 31], [90, 24], [160, 15], [286, 27], [648, 19], [744, 13], [802, 23], [872, 30], [976, 18], [1038, 26],
]

function paintDragonPanel(g: G): void {
  const box = { x: PANEL.left, y: PANEL.apron, w: FIELD.left - PANEL.left - 6, h: TOYS.walrus.y - 2 - PANEL.apron }
  g.save()
  g.beginPath()
  g.rect(box.x, box.y, box.w, box.h)
  g.clip()
  g.fillStyle = C.coral
  g.fillRect(box.x, box.y, box.w, box.h)
  // Printed flames rising from the foot of the panel, in two colours.
  const flame = (x: number, w: number, h: number, colour: string) => {
    const foot = box.y + box.h + 6
    g.beginPath()
    g.moveTo(x - w / 2, foot)
    g.bezierCurveTo(x - w * 0.62, foot - h * 0.45, x - w * 0.1, foot - h * 0.55, x + w * 0.05, foot - h)
    g.bezierCurveTo(x + w * 0.12, foot - h * 0.6, x + w * 0.66, foot - h * 0.5, x + w / 2, foot)
    g.closePath()
    g.fillStyle = colour
    g.fill()
  }
  flame(40, 110, 250, C.flameB)
  flame(210, 120, 300, C.flameB)
  flame(120, 130, 190, C.flameB)
  flame(70, 80, 150, C.flameA)
  flame(180, 90, 200, C.flameA)
  flame(240, 60, 110, C.flameA)
  // Sparks: plain dots.
  g.fillStyle = '#ffe9a3'
  for (const [x, y, r] of [[36, 150, 6], [70, 118, 4], [222, 132, 5], [240, 190, 4], [26, 240, 4], [196, 108, 3]] as const) {
    oval(g, x, y, r, r)
    g.fill()
  }
  g.restore()
}

function paintWalrusPanel(g: G): void {
  const box = { x: PANEL.left, y: TOYS.walrus.y - 2, w: FIELD.left - PANEL.left - 6, h: PANEL.bottom - TOYS.walrus.y + 2 }
  g.save()
  rounded(g, box.x, box.y - 20, box.w, box.h + 20, 14)
  g.clip()
  g.fillStyle = C.aqua
  g.fillRect(box.x, box.y, box.w, box.h)
  // Printed waves: rows of scallops, light over dark.
  for (let row = 0; row < 7; row++) {
    const y = box.y + 26 + row * 56
    g.beginPath()
    g.moveTo(box.x, y)
    for (let x = box.x - (row % 2) * 28; x < box.x + box.w + 56; x += 56) g.arc(x + 28, y, 28, Math.PI, 0, true)
    g.lineTo(box.x + box.w, y + 30)
    g.lineTo(box.x, y + 30)
    g.closePath()
    g.fillStyle = row % 2 ? C.waveB : C.waveA
    g.fill()
  }
  // Bubbles: pale discs with a gloss.
  for (const [x, y, r] of [[34, 470, 10], [228, 500, 7], [214, 462, 12], [22, 560, 6], [240, 610, 9]] as const) {
    oval(g, x, y, r, r)
    g.fillStyle = 'rgba(255,255,255,0.55)'
    g.fill()
    gloss(g, x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.18, -0.5, 0.9)
  }
  g.restore()
}

function paintElephantPanel(g: G): void {
  const box = { x: FIELD.right + 6, y: PANEL.apron, w: PANEL.right - FIELD.right - 6, h: PANEL.bottom - PANEL.apron }
  g.save()
  rounded(g, box.x, box.y - 20, box.w, box.h + 20, 14)
  g.clip()
  g.fillStyle = C.leaf
  g.fillRect(box.x, box.y, box.w, box.h)
  // Printed leaves in fans that all point up and never cross.
  const leaf = (x: number, y: number, len: number, turn: number, colour: string) => {
    g.save()
    g.translate(x, y)
    g.rotate(turn)
    g.beginPath()
    g.moveTo(0, 0)
    g.bezierCurveTo(-len * 0.3, -len * 0.3, -len * 0.22, -len * 0.8, 0, -len)
    g.bezierCurveTo(len * 0.22, -len * 0.8, len * 0.3, -len * 0.3, 0, 0)
    g.fillStyle = colour
    g.fill()
    g.restore()
  }
  for (const [x, y, len] of [[box.x + 40, 300, 150], [box.x + 210, 250, 130], [box.x + 30, 560, 170], [box.x + 226, 520, 160], [box.x + 120, 812, 200], [box.x + 20, 812, 150], [box.x + 236, 812, 170]] as const) {
    for (const turn of [-0.75, -0.25, 0.25, 0.75]) leaf(x, y, len, turn, C.leafDark)
  }
  // Fruit: plain discs.
  for (const [x, y, r] of [[box.x + 128, 132, 15], [box.x + 60, 160, 11], [box.x + 214, 150, 9], [box.x + 236, 330, 12], [box.x + 18, 400, 10]] as const) {
    oval(g, x, y, r, r)
    g.fillStyle = C.fruit
    g.fill()
    gloss(g, x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.18, -0.5, 0.7)
  }
  g.restore()
}

function paintField(g: G): void {
  g.save()
  g.beginPath()
  g.rect(FIELD.left, FIELD.roof, FIELD.right - FIELD.left, FIELD.floor - FIELD.roof)
  g.clip()
  g.fillStyle = C.board
  g.fillRect(FIELD.left, FIELD.roof, FIELD.right - FIELD.left, FIELD.floor - FIELD.roof)
  // Printed rays from the foot of the field, pale on pale.
  const cx = STAGE.width / 2, cy = FIELD.floor + 40
  g.fillStyle = C.ray
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.04 + (i * 2 + 0.5) / 19.5 * 0.92), b = Math.PI * (1.04 + (i * 2 + 1.5) / 19.5 * 0.92)
    g.beginPath()
    g.moveTo(cx, cy)
    g.lineTo(cx + Math.cos(a) * 1100, cy + Math.sin(a) * 1100)
    g.lineTo(cx + Math.cos(b) * 1100, cy + Math.sin(b) * 1100)
    g.closePath()
    g.fill()
  }
  // A printed sun in the middle of the field: an uneven burst with a face, pale on pale.
  g.beginPath()
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2, r = i % 2 ? 62 + ((i * 29) % 17) : 96 + ((i * 53) % 31)
    if (i === 0) g.moveTo(cx + Math.cos(a) * r, SUN.y + Math.sin(a) * r)
    else g.lineTo(cx + Math.cos(a) * r, SUN.y + Math.sin(a) * r)
  }
  g.closePath()
  g.fillStyle = '#f6e2a6'
  g.fill()
  oval(g, cx, SUN.y, 50, 47)
  g.fillStyle = '#fbe6ae'
  g.fill()
  g.fillStyle = 'rgba(190,140,60,0.55)'
  for (const side of [-1, 1]) {
    oval(g, cx + side * 17, SUN.y - 8, 5, 7)
    g.fill()
  }
  g.beginPath()
  g.moveTo(cx - 20, SUN.y + 12)
  g.quadraticCurveTo(cx + 2, SUN.y + 32, cx + 22, SUN.y + 9)
  g.strokeStyle = 'rgba(190,140,60,0.55)'
  g.lineWidth = 5
  g.stroke()
  // Pale plastic inserts under the tray, scattered: no two the same step apart, and no size, height or colour that takes turns.
  PALE.forEach(([x, y, r, colour]) => insert(g, x, y, r, colour))
  // Each toy's printed world runs a little way onto the board, pale: flames and waves at the left, leaves at the right.
  const fringe = (x: number, y0: number, y1: number, side: 1 | -1, colour: string) => {
    g.beginPath()
    g.moveTo(x, y0)
    for (let y = y0; y < y1; y += 44) g.quadraticCurveTo(x + side * 46, y + 22, x, Math.min(y1, y + 44))
    g.closePath()
    g.fillStyle = colour
    g.fill()
  }
  fringe(FIELD.left, FIELD.roof, TOYS.walrus.y - 2, 1, '#fbd9c0')
  fringe(FIELD.left, TOYS.walrus.y - 2, FIELD.floor, 1, '#cdeaf3')
  fringe(FIELD.right, FIELD.roof, FIELD.floor, -1, '#d6ecc4')
  // A mat of each toy's colour on the board at its gate: a splash with uneven lobes, like the fringe it sits in.
  for (const [gate, colour] of [[GATES.dragon, '#ff9a6b'], [GATES.walrus, '#6fc8ea'], [GATES.elephant, '#a3aef0']] as const) {
    const x = gate.side < 0 ? FIELD.left : FIELD.right, side = -gate.side, span = gate.y1 - gate.y0
    g.beginPath()
    g.moveTo(x, gate.y0 + 2)
    for (let lobe = 0; lobe + 1 < MAT_LOBES.length; lobe += 2) {
      const [bulgeAt, bulge] = MAT_LOBES[lobe], [dipAt, dip] = MAT_LOBES[lobe + 1]
      g.quadraticCurveTo(x + side * bulge, gate.y0 + span * bulgeAt, x + side * dip, gate.y0 + span * dipAt)
    }
    const [lastAt, last] = MAT_LOBES[MAT_LOBES.length - 1]
    g.quadraticCurveTo(x + side * last, gate.y0 + span * lastAt, x, gate.y1 - 2)
    g.closePath()
    g.fillStyle = colour
    g.fill()
  }
  // The lamps of the lower field: inserts that light as the ball goes by.
  INSERTS.forEach(([x, y, r, colour]) => insert(g, x, y, r, colour))
  // The grain of the wood under the varnish.
  g.strokeStyle = 'rgba(160,110,50,0.07)'
  g.lineWidth = 2
  for (let i = 0; i < 14; i++) {
    const x = FIELD.left + 20 + i * 47
    g.beginPath()
    g.moveTo(x, FIELD.roof)
    g.bezierCurveTo(x + 14, 300, x - 16, 520, x + 6, FIELD.floor)
    g.stroke()
  }
  // The board the wall stands on, and the tray set into its foot: a trough of sand under a clear cover.
  rounded(g, WALL.left - 14, WALL.top - 14, WALL.cols * WALL.cellW + 28, TRAY.y + TRAY.h + 10 - (WALL.top - 14), 16)
  g.fillStyle = C.wallBoard
  g.fill()
  g.strokeStyle = C.wallBoardLine
  g.lineWidth = 3
  g.stroke()
  rounded(g, TRAY.x, TRAY.y, TRAY.w, TRAY.h, 12)
  g.fillStyle = C.skin
  g.fill()
  g.save()
  g.clip()
  // The sand lies in low dunes, and has grains and a few pebbles in it from the first frame: the tray is never an empty box.
  g.fillStyle = '#f6dfae'
  g.beginPath()
  g.moveTo(TRAY.x, TRAY.y + 34)
  g.bezierCurveTo(TRAY.x + 90, TRAY.y + 16, TRAY.x + 150, TRAY.y + 44, TRAY.x + 262, TRAY.y + 27)
  g.bezierCurveTo(TRAY.x + 350, TRAY.y + 14, TRAY.x + 420, TRAY.y + 40, TRAY.x + TRAY.w, TRAY.y + 22)
  g.lineTo(TRAY.x + TRAY.w, TRAY.y + TRAY.h)
  g.lineTo(TRAY.x, TRAY.y + TRAY.h)
  g.closePath()
  g.fill()
  g.fillStyle = C.skinDark
  for (let i = 0; i < 46; i++) {
    const r = 1.1 + ((i * 7) % 5) * 0.35
    oval(g, TRAY.x + 9 + ((i * 131) % 498), TRAY.y + 7 + ((i * 53 + (i % 3) * 17) % 44), r, r)
    g.fill()
  }
  for (const [x, y, rx, ry, turn] of [[61, 41, 7, 4.5, 0.3], [203, 13, 5, 3.5, -0.4], [331, 44, 8, 5, 0.1], [447, 15, 6, 4, 0.6]] as const) {
    oval(g, TRAY.x + x, TRAY.y + y, rx, ry, turn)
    g.fillStyle = '#d6c39a'
    g.fill()
  }
  // The shade the tray's near wall throws into it.
  g.fillStyle = 'rgba(120,90,40,0.28)'
  g.fillRect(TRAY.x, TRAY.y, TRAY.w, 7)
  g.fillRect(TRAY.x, TRAY.y, 6, TRAY.h)
  g.restore()
  rounded(g, TRAY.x, TRAY.y, TRAY.w, TRAY.h, 12)
  g.strokeStyle = 'rgba(30,42,82,0.45)'
  g.lineWidth = 2.5
  g.stroke()
  // The varnish: one soft band of gloss across the field.
  g.beginPath()
  g.moveTo(FIELD.left + 60, FIELD.roof)
  g.lineTo(FIELD.left + 230, FIELD.roof)
  g.lineTo(FIELD.left - 60, FIELD.floor)
  g.lineTo(FIELD.left - 230, FIELD.floor)
  g.closePath()
  g.fillStyle = 'rgba(255,255,255,0.16)'
  g.fill()
  g.restore()
}

function paintDrum(g: G): void {
  const x = FIELD.left, w = FIELD.right - FIELD.left, y = FIELD.floor
  g.fillStyle = C.skin
  g.fillRect(x, y, w, PANEL.bottom - y)
  // The tacks that hold the skin: plain round heads, hammered in by hand, no two gaps and no two heads beside each other alike.
  g.fillStyle = C.skinDark
  for (const [dx, dy, r] of TACKS) {
    oval(g, x + dx, y + dy, r, r)
    g.fill()
  }
  // The hoop: a red rubber band along the top of the skin.
  g.fillStyle = C.rubberDark
  g.fillRect(x, y, w, 9)
  g.fillStyle = C.rubber
  g.fillRect(x, y, w, 6)
  g.fillStyle = C.rubberLight
  g.fillRect(x, y + 1, w, 1.5)
}

function paintRails(g: G): void {
  const left = FIELD.left - 6, right = FIELD.right + 6, top = FIELD.roof - 6
  const run = (points: readonly (readonly [number, number])[]) => chrome(g, () => {
    g.beginPath()
    points.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
  })
  // Each side rail is open at its gates, and a short guide bends out of the field at either end of an opening.
  const guide = (x: number, y: number, side: number, up: number) => chrome(g, () => {
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + side * 4, y + up * 12, x + side * 20, y + up * 16)
  }, 9)
  run([[left, PANEL.bottom], [left, GATES.walrus.y1]])
  run([[left, GATES.walrus.y0], [left, GATES.dragon.y1]])
  run([[left, GATES.dragon.y0], [left, top], [right, top], [right, GATES.elephant.y0]])
  run([[right, GATES.elephant.y1], [right, PANEL.bottom]])
  for (const gate of [GATES.dragon, GATES.walrus, GATES.elephant]) {
    const x = gate.side < 0 ? left : right
    guide(x, gate.y0, gate.side, -1)
    guide(x, gate.y1, gate.side, 1)
    post(g, x, gate.y0, 9)
    post(g, x, gate.y1, 9)
  }
  post(g, left, top)
  post(g, right, top)
  post(g, left, FIELD.floor + 4, 10)
  post(g, right, FIELD.floor + 4, 10)
  // The chain the bell hangs from: three links.
  for (let link = 0; link < 3; link++) {
    oval(g, BELL.x, FIELD.roof + 3 + link * 6, 2.6, 3.4)
    g.fillStyle = C.chromeDark
    g.fill()
  }
}

/**
 * What shows past the stage on a surface of another shape: the table's own surroundings. Above it the sky of its
 * apron goes on, with clouds; below it lies the sand its drum skin stands in; and at either side each toy's
 * printed world goes on outwards. `bandX` and `bandY` are how far the surface shows past the stage.
 */
function paintSurround(g: G, bandX: number, bandY: number): void {
  const left = -bandX, right = STAGE.width + bandX, top = -bandY, bottom = STAGE.height + bandY
  g.fillStyle = C.sky
  g.fillRect(left, top, right - left, PANEL.apron + bandY)
  g.fillStyle = C.coral
  g.fillRect(left, PANEL.apron, bandX + 20, TOYS.walrus.y - PANEL.apron)
  g.fillStyle = C.aqua
  g.fillRect(left, TOYS.walrus.y, bandX + 20, STAGE.height - TOYS.walrus.y)
  g.fillStyle = C.leaf
  g.fillRect(STAGE.width - 20, PANEL.apron, bandX + 20, STAGE.height - PANEL.apron)
  g.fillStyle = C.skin
  g.fillRect(left, STAGE.height - 2, right - left, bandY + 2)
  if (bandY > 1) {
    // Clouds of several sizes in the sky, none in a row, and none where the home control or the corner is.
    g.fillStyle = C.cloud
    const clouds: readonly (readonly [number, number, number])[] = [[0.12, 0.62, 1.2], [0.33, 0.3, 0.8], [0.71, 0.55, 1], [0.9, 0.2, 0.7], [0.52, 0.86, 0.6]]
    for (const [fx, fy, size] of clouds) {
      const x = left + (right - left) * fx, y = top + bandY * fy, k = size * Math.min(1, bandY / 150)
      g.beginPath()
      for (const [dx, dy, r] of [[-38, 6, 26], [-6, -8, 36], [30, 4, 28], [58, 12, 18]] as const) {
        g.moveTo(x + (dx + r) * k, y + dy * k)
        g.arc(x + dx * k, y + dy * k, r * k, 0, Math.PI * 2)
      }
      g.fill()
    }
    // The sand: lighter dunes, grains and a few pebbles, none in a row.
    g.fillStyle = '#f6dfae'
    g.beginPath()
    g.moveTo(left, STAGE.height + bandY * 0.5)
    g.bezierCurveTo(left + (right - left) * 0.25, STAGE.height + bandY * 0.2, left + (right - left) * 0.45, STAGE.height + bandY * 0.75, left + (right - left) * 0.7, STAGE.height + bandY * 0.4)
    g.bezierCurveTo(left + (right - left) * 0.85, STAGE.height + bandY * 0.22, right - 40, STAGE.height + bandY * 0.5, right, STAGE.height + bandY * 0.35)
    g.lineTo(right, bottom)
    g.lineTo(left, bottom)
    g.closePath()
    g.fill()
    g.fillStyle = C.skinDark
    const grains = Math.round(((right - left) * bandY) / 2600)
    for (let i = 0; i < grains; i++) {
      const r = 2 + ((i * 7) % 5) * 0.8
      oval(g, left + ((i * 397 + (i % 5) * 61) % Math.max(1, right - left)), STAGE.height + 10 + ((i * 211 + (i % 4) * 37) % Math.max(1, bandY - 16)), r, r)
      g.fill()
    }
    // The table's shadow on the sand.
    g.fillStyle = 'rgba(120,90,40,0.22)'
    g.fillRect(left, STAGE.height, right - left, Math.min(18, bandY))
  }
}

/**
 * The whole board with everything that stands still: the stage, and round it as much of the table's own
 * surroundings as the surface shows. It is the frame's one full-surface stamp.
 */
export function paintBoard(density: number, bandX = 0, bandY = 0): Sprite {
  return sprite(density, STAGE.width + bandX * 2, STAGE.height + bandY * 2, bandX, bandY, (g) => {
    g.translate(bandX, bandY)
    if (bandX > 0.01 || bandY > 0.01) paintSurround(g, bandX, bandY)
    // The wooden rim of the table.
    g.fillStyle = C.wood
    rounded(g, 0, 0, STAGE.width, STAGE.height, bandX > 0.01 || bandY > 0.01 ? 18 : 0)
    g.fill()
    g.strokeStyle = C.woodDark
    g.lineWidth = 2
    rounded(g, 5, 5, STAGE.width - 10, STAGE.height - 10, 16)
    g.stroke()
    g.save()
    rounded(g, PANEL.left, PANEL.top, PANEL.right - PANEL.left, PANEL.bottom - PANEL.top, 14)
    g.clip()
    paintApron(g)
    paintDragonPanel(g)
    paintWalrusPanel(g)
    paintElephantPanel(g)
    paintField(g)
    paintDrum(g)
    g.restore()
    paintRails(g)
    // The tub's far rim, behind the walrus.
    const tub = TUB
    oval(g, tub.x, tub.rimY, tub.rx, 26)
    inked(g, C.tubDark, 5)
  })
}

/** The walrus's tin tub: where its rim is, in stage units. */
export const TUB = { x: TOYS.walrus.x + TOYS.walrus.w / 2 - 2, rimY: 668, rx: 112, foot: 800 } as const

/** The printed sun in the middle of the field. */
export const SUN = { y: 546 } as const

/**
 * The lamps of the lower field, over where the bumper slides: each as where it is, how large and which colour.
 * They are scattered by hand: no two steps are alike, and neither the steps, the heights, the sizes nor the
 * colours take turns, so they are no dotted line. The view lights the ones the ball goes by.
 */
export const INSERTS: readonly (readonly [number, number, number, string])[] = [
  [311, 627, 12, '#bfe4f3'], [368, 606, 8, '#bfe4f3'], [452, 611, 10, '#f7c4bd'], [497, 618, 14, '#f9e3a1'],
  [588, 594, 11, '#f7c4bd'], [689, 603, 9, '#f7c4bd'], [741, 629, 13, '#bfe4f3'], [851, 607, 8, '#f9e3a1'],
]

/**
 * The outline of a gate's mat, from the top of the gate to its foot: how far along the gate, and how far out onto
 * the board, in turn a bulge and the dip after it, and a last bulge. Three lobes of unequal reach: a splash of
 * colour, with no flat dark edge, so that it is no half disc.
 */
export const MAT_LOBES: readonly (readonly [number, number])[] = [[0.1, 62], [0.3, 34], [0.46, 86], [0.7, 40], [0.92, 58]]

/**
 * The pale inserts printed under the tray, to either side of the printed sun: where, how large and which colour.
 * Scattered like the lamps: nothing about them takes turns, and they lie on no one curve.
 */
export const PALE: readonly (readonly [number, number, number, string])[] = [
  [348, 513, 12, '#f7c4bd'], [407, 532, 8, '#bfe4f3'], [489, 525, 10, '#c9ecc0'], [701, 506, 14, '#f9e3a1'], [748, 530, 9, '#f9e3a1'], [806, 517, 13, '#bfe4f3'],
]

/** The tacks along the drum skin: how far along it, how far down it, and how large a head. */
export const TACKS: readonly (readonly [number, number, number])[] = [
  [19, 24, 3.2], [70, 33, 3.8], [102, 27, 4.4], [181, 23, 3], [241, 30, 3.6], [285, 27, 5], [340, 22, 4.2], [381, 28, 3], [411, 33, 3.4], [477, 22, 4.8], [554, 27, 4], [612, 32, 4.6],
]
