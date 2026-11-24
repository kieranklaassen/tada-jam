import { Box, TAU, type Pen, type Sprite } from './craft'
import { FENCES, GROUND, PUDDLE, SCENERY } from './layout'
import { STAGE } from './stage'

// The yard itself, stuck down once: sheets of card for sky, hills and ground,
// the barn of lolly sticks, the fence, and all the small things glued round
// the edges. It is drawn past the stage on every side, since a surface of
// another shape shows more of it.

const PAST = 520
/** How far the painted yard reaches past the stage, in stage units. */
export const YARD = { x: -PAST, y: -PAST, w: STAGE.width + PAST * 2, h: STAGE.height + PAST * 2 } as const

const SKY = '#8fd0ea', HILL_FAR = '#f3a65e', HILL_MID = '#e9c04e', GRASS = '#2f8f7c', GRASS_FRONT = '#236f66'

export function paintYard(g: Pen, box: Box): void {
  const { x: X, y: Y, w: W, h: H } = YARD
  g.lineCap = 'round'
  g.lineJoin = 'round'
  box.felt(g, SKY, [X, Y, W, H], (p) => p.rect(X, Y, W, H), { lift: 0, fibre: 0.22 })
  // Strips of washi tape hold the sky sheet, and dots cut with a hole punch.
  box.scatter(34, (u, v, w) => { const x = X + u * W, y = Y + v * (PAST + 260); g.fillStyle = w < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(54,132,178,0.3)'; g.beginPath(); g.arc(x, y, 4 + w * 4, 0, TAU); g.fill() })
  const hill = (color: string, pts: [number, number][], lift: number) => box.felt(g, color, [X, 120, W, 420], (p) => {
    p.moveTo(X, 900); p.lineTo(X, pts[0][1])
    for (let i = 0; i + 1 < pts.length; i++) p.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)
    p.lineTo(X + W, pts[pts.length - 1][1]); p.lineTo(X + W, 900); p.closePath()
  }, { lift, fibre: 0.5 })
  hill(HILL_FAR, [[X, 250], [40, 190], [330, 300], [640, 170], [900, 250], [1180, 170], [1700, 240]], 5)
  // Rows of dry peas and lentils on the far hill, a ploughed field.
  for (let row = 0; row < 4; row++) for (let i = 0; i < 26; i++) {
    const x = 640 + i * 17 - row * 10, y = 246 + row * 17 + Math.sin(i * 0.2) * 6
    g.fillStyle = 'rgba(60,30,20,0.25)'; g.beginPath(); g.arc(x + 1.6, y + 2.2, 4.4, 0, TAU); g.fill()
    g.fillStyle = row % 2 ? '#d9743b' : '#b9d06a'; g.beginPath(); g.arc(x, y, 4.4, 0, TAU); g.fill()
  }
  hill(HILL_MID, [[X, 330], [-100, 300], [240, 290], [480, 350], [760, 290], [1000, 340], [1280, 280], [1700, 330]], 5)
  // Spaghetti corn along the middle hill.
  for (let i = 0; i < 19; i++) {
    const x = 350 + i * 22 + (i % 3) * 5, y = 352 - Math.sin(i * 0.8) * 4
    if (x > 446 && x < 590) continue
    box.stick(g, x, y - 16, 36, 4, Math.PI / 2 + (i % 3 - 1) * 0.1, '#f7e2a0', 1.5)
  }
  paintBarn(g, box)
  ground(g, box)
  fence(g, box)
  edges(g, box)
}

function paintBarn(g: Pen, box: Box): void {
  const cx = SCENERY.cow.x, top = 208, bottom = 392
  box.felt(g, '#8e2f2b', [cx - 150, top, 300, 190], (p) => p.rect(cx - 146, top + 6, 292, bottom - top), { lift: 7 })
  for (let i = 0; i < 12; i++) box.stick(g, cx - 134 + i * 24.4, (top + bottom) / 2 + 4, bottom - top + (i % 2 ? 6 : 0), 23, Math.PI / 2, i % 2 ? '#d5493c' : '#c83c33', 2)
  // The roof: card, with a row of half-round felt tiles, and a button window.
  box.felt(g, '#3f5f93', [cx - 190, 96, 380, 130], (p) => { p.moveTo(cx - 186, top + 12); p.lineTo(cx - 104, 116); p.lineTo(cx + 104, 116); p.lineTo(cx + 186, top + 12); p.closePath() }, { lift: 6 })
  for (let row = 0; row < 3; row++) for (let i = 0; i < 9 + row; i++) {
    const x = cx - (4 + row / 2) * 34 + i * 34, y = 134 + row * 30
    box.felt(g, (i + row) % 3 === 0 ? '#5b82bd' : '#4a6da6', [x - 18, y - 4, 36, 30], (p) => { p.moveTo(x - 17, y - 4); p.lineTo(x + 17, y - 4); p.arc(x, y + 8, 17, 0, Math.PI); p.closePath() }, { lift: 1.5 })
  }
  // The door opening, dark, with an arch of sticks. The cow stands in it.
  g.fillStyle = '#3a1c1f'; g.beginPath(); g.roundRect(cx - 74, 236, 148, bottom - 232, [66, 66, 0, 0]); g.fill()
  box.stick(g, cx - 80, 320, 150, 14, Math.PI / 2, '#f6ead0', 3)
  box.stick(g, cx + 80, 320, 150, 14, Math.PI / 2, '#f6ead0', 3)
  box.stick(g, cx, 238, 150, 14, 0, '#f6ead0', 3)
  box.glue(g, cx - 76, 246, 5); box.glue(g, cx + 78, 392, 6)
}

function ground(g: Pen, box: Box): void {
  const { x: X, w: W } = YARD
  box.felt(g, GRASS, [X, 360, W, 1000], (p) => {
    p.moveTo(X, 384)
    for (let x = X; x < X + W; x += 120) p.quadraticCurveTo(x + 60, 384 + (Math.round(x / 120) % 2 ? 14 : -12), x + 120, 384)
    p.lineTo(X + W, 1400); p.lineTo(X, 1400); p.closePath()
  }, { lift: -4, fibre: 0.45 })
  // Cut felt leaves and yarn loops lie about, never dark or large enough to be taken for something to touch.
  box.scatter(230, (u, v, w) => {
    const x = X + u * W, y = 420 + v * 560, s = 9 + w * 9, a = w * 6
    g.save(); g.translate(x, y); g.rotate(a)
    box.felt(g, w < 0.5 ? '#3ba18a' : '#2a8372', [-s, -s, s * 2, s * 2], (p) => { p.moveTo(-s, 0); p.quadraticCurveTo(0, -s * 0.8, s, 0); p.quadraticCurveTo(0, s * 0.8, -s, 0) }, { lift: 1.5 })
    g.restore()
  })
  // A trodden path of brown card from the barn across the yard.
  box.felt(g, '#c79a63', [70, 396, 470, 60], (p) => { p.moveTo(112, 392); p.quadraticCurveTo(190, 430, 340, 424); p.quadraticCurveTo(520, 420, 700, 440); p.quadraticCurveTo(520, 452, 330, 456); p.quadraticCurveTo(180, 464, 104, 470); p.quadraticCurveTo(70, 430, 112, 392) }, { lift: 2, fibre: 0.7 })
  // The puddle: kitchen foil, crumpled flat, with a felt rim.
  const { x, y, rx, ry } = PUDDLE
  box.felt(g, '#1d5d57', [x - rx - 20, y - ry - 16, rx * 2 + 40, ry * 2 + 32], (p) => blob(p, x, y, rx + 13, ry + 10, 0.4), { lift: 0 })
  g.save()
  g.beginPath(); blob(g, x, y, rx, ry, 0.4); g.fillStyle = '#b9cdd8'; g.fill(); g.clip()
  box.scatter(90, (u, v, w) => {
    const px = x - rx + u * rx * 2, py = y - ry + v * ry * 2
    g.fillStyle = ['#d8e6ee', '#98b2c2', '#eef6fa', '#a9c4d4', '#86a3b6'][Math.floor(w * 5)]
    g.beginPath(); g.moveTo(px, py); g.lineTo(px + 34 * (u - 0.3), py + 12 * w); g.lineTo(px + 18 * w, py - 14 * v - 4); g.closePath(); g.fill()
  })
  g.restore()
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 3; g.beginPath(); blob(g, x, y, rx - 2, ry - 2, 0.4); g.stroke()
}

export function blob(p: Pen, x: number, y: number, rx: number, ry: number, seed: number): void {
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * TAU, r = 1 + Math.sin(a * 3 + seed) * 0.045 + Math.sin(a * 5 + seed * 2) * 0.03
    if (i === 0) p.moveTo(x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r)
    else p.lineTo(x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r)
  }
}

function fence(g: Pen, box: Box): void {
  for (const [from, to] of FENCES) {
    box.stick(g, (from + to) / 2, 352, to - from, 13, 0, '#e2bb7c', 3)
    box.stick(g, (from + to) / 2, 380, to - from, 13, 0, '#d9ae6a', 3)
    for (let x = from + 16; x < to - 6; x += 38) box.stick(g, x, 362, 82, 17, Math.PI / 2 + Math.sin(x) * 0.05, '#efcf96', 3)
  }
}

/** The near edge: felt bushes, pom-poms, buttons for flowers, down in the strip nothing is played in, and up the sides. */
function edges(g: Pen, box: Box): void {
  const { x: X, w: W } = YARD
  const front = GROUND.bottom + 42
  box.felt(g, GRASS_FRONT, [X, front - 30, W, 700], (p) => {
    p.moveTo(X, front)
    for (let x = X; x < X + W; x += 84) p.quadraticCurveTo(x + 42, front - 22 - (Math.round(x / 84) % 3) * 8, x + 84, front)
    p.lineTo(X + W, 1500); p.lineTo(X, 1500); p.closePath()
  }, { lift: -5, fibre: 0.4 })
  const colors = ['#f25c54', '#ffd23f', '#fff3dc', '#f49ac1', '#7b5cc4', '#ff9f45']
  for (let i = 0; i < 40; i++) {
    const x = X + 30 + i * 56, y = front + 24 + (i % 3) * 12
    if (i % 4 === 0) box.pom(g, x, y, 17, 16, i % 8 ? [90, 176, 92] : [142, 206, 96])
    else if (i % 4 === 2) { box.pipe(g, [[x, y + 40], [x + 3, y + 10], [x - 2, y - 14]], 6, '#58b36a', '#2d7a45'); box.button(g, x - 2, y - 18, 14, colors[i % 6]) } else box.bow(g, x, y + 6, 13, i)
  }
  for (let row = 0; row < 4; row++) for (let i = 0; i < 34; i++) box.pom(g, X + i * 68 + (row % 2) * 34, front + 120 + row * 70, 30, 28, row % 2 ? [40, 124, 104] : [58, 150, 110], { lift: 4 })
}

export type Scenery = { sun: Sprite; cloudA: Sprite; cloudB: Sprite; tree: Sprite; sheep: Sprite; sheepHead: Sprite; cow: Sprite; cowHead: Sprite; tail: Sprite; post: Sprite }

export function cutScenery(box: Box): Scenery {
  return {
    sun: box.sprite(176, 176, 88, 88, (g) => {
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; if (i % 2) box.penne(g, Math.cos(a) * 60, Math.sin(a) * 60, 34, 15, a); else box.bow(g, Math.cos(a) * 62, Math.sin(a) * 62, 16, a) }
      box.button(g, 0, 0, 42, '#ffce3a', 4, '#ff8b2e', 4)
    }),
    cloudA: box.sprite(200, 120, 100, 62, (g) => box.cotton(g, [[-54, 12, 30], [-18, -8, 40], [26, -2, 36], [60, 16, 26], [4, 20, 34]])),
    cloudB: box.sprite(160, 100, 80, 52, (g) => box.cotton(g, [[-38, 10, 24], [-6, -8, 32], [34, 8, 26], [4, 16, 26]])),
    tree: box.sprite(190, 240, 95, 150, (g) => {
      box.stick(g, 0, 44, 110, 24, Math.PI / 2, '#a9713a', 4)
      for (const [x, y, r, c] of [[-34, -20, 38, 0], [36, -14, 40, 1], [0, -64, 42, 0], [-2, -10, 34, 2], [-40, -60, 26, 1], [42, -58, 28, 2]] as const) box.pom(g, x, y, r, r * 0.95, ([[86, 178, 88], [116, 200, 92], [62, 152, 96]] as [number, number, number][])[c], { lift: 4 })
      for (const [x, y] of [[-24, -44], [30, -36], [4, -82], [10, -6]]) box.button(g, x, y, 10, '#f2554d', 2)
    }),
    sheep: box.sprite(190, 130, 95, 74, (g) => {
      for (const x of [-38, -16, 22, 42]) box.stick(g, x, 36, 46, 10, Math.PI / 2, '#3b3340', 2)
      box.cotton(g, [[-44, 4, 28], [-18, -14, 34], [18, -14, 34], [44, 4, 28], [0, 10, 36], [-28, 18, 24], [30, 18, 24]], '#fffaf0', 4)
    }),
    sheepHead: box.sprite(90, 100, 45, 46, (g) => {
      box.felt(g, '#3b3340', [-42, -26, 84, 30], (p) => { p.ellipse(-28, -10, 15, 8, -0.4, 0, TAU); p.moveTo(43, -10); p.ellipse(28, -10, 15, 8, 0.4, 0, TAU) })
      box.felt(g, '#4a4152', [-24, -30, 48, 70], (p) => p.ellipse(0, 4, 22, 32, 0, 0, TAU))
      box.cotton(g, [[-10, -28, 13], [8, -30, 14]], '#fffaf0', 2)
      box.eye(g, -10, -4, 9); box.eye(g, 10, -4, 9)
    }),
    cow: box.sprite(150, 150, 75, 84, (g) => {
      box.felt(g, '#fff4e4', [-60, -60, 120, 120], (p) => p.roundRect(-56, -52, 112, 104, 34))
      for (const x of [-38, 36]) box.stick(g, x, 44, 50, 24, Math.PI / 2, '#f3e4cf', 1)
      for (const [x, y, w, h] of [[-26, -20, 28, 22], [30, 6, 24, 26], [-14, 30, 22, 14]] as const) box.felt(g, '#4d3d46', [x - w, y - h, w * 2, h * 2], (p) => blob(p, x, y, w, h, x), { lift: 1 })
    }),
    cowHead: box.sprite(130, 120, 65, 60, (g) => {
      box.felt(g, '#4d3d46', [-60, -34, 120, 30], (p) => { p.ellipse(-44, -18, 18, 10, 0.3, 0, TAU); p.moveTo(62, -18); p.ellipse(44, -18, 18, 10, -0.3, 0, TAU) })
      box.penne(g, -24, -40, 20, 10, -2, 2); box.penne(g, 24, -40, 20, 10, -1.1, 2)
      box.felt(g, '#fff4e4', [-36, -38, 72, 80], (p) => p.roundRect(-32, -36, 64, 74, 28))
      box.felt(g, '#4d3d46', [-34, -38, 30, 40], (p) => blob(p, -18, -16, 17, 21, 2), { lift: 0 })
      box.felt(g, '#f3a8b4', [-38, 6, 76, 44], (p) => p.ellipse(0, 26, 35, 22, 0, 0, TAU))
      g.fillStyle = '#9c4f60'; for (const x of [-13, 13]) { g.beginPath(); g.ellipse(x, 24, 5, 7, 0, 0, TAU); g.fill() }
      box.eye(g, -15, -14, 11); box.eye(g, 15, -14, 11)
    }),
    tail: box.sprite(40, 110, 20, 10, (g) => { box.pipe(g, [[0, 0], [5, 30], [-4, 60]], 9, '#fff4e4', '#cdbba8'); box.pom(g, -4, 70, 13, 17, [86, 66, 74]) }),
    post: box.sprite(40, 110, 20, 100, (g) => box.stick(g, 0, -42, 82, 17, Math.PI / 2, '#f6dcaa', 3)),
  }
}
