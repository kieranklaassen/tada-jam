import { ellipse, flat, mix, poly, round, soft, type G, type Sprites } from './litho'
import type { Pose } from './motion'
import type { Colour, Kind, Thing } from './things'

// The things and the people, drawn about the middle of their foot with up as
// minus. The working things are plain: one flat colour, one silhouette, spots
// or none. The people are live: sprites for their parts, faces drawn each
// frame from a pose.

export const INK = '#33272b'
export const CREAM = '#f4e8c8'
export const DYE: Readonly<Record<Colour, string>> = { red: '#c83a2b', blue: '#2c5fa6', yellow: '#e8b022' }
const SKIN = '#e9bd95', BLUSH = '#d98a72', COAT = '#3b3346', WHITE = '#f7f0dd', GOLD = '#b98a3a'

type Box = readonly [number, number, number, number]

function dots(g: G, list: readonly (readonly [number, number, number])[], colour = CREAM): void {
  g.fillStyle = colour
  for (const [x, y, r] of list) {
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
}

// --- The small things ---------------------------------------------------------

const SMALL_BOX: Box = [-62, -104, 124, 112]

export function paintSmall(g: G, kind: Kind, colour: string, spots: boolean, shade = 0.55): void {
  const trim = mix(colour, '#2b1a1a', 0.32)
  if (kind === 'sock') {
    const leg = soft([-22, -92], [16, -94], [19, -52], [40, -30], [42, -8], [18, 0], [-16, -2], [-30, -18], [-24, -44])
    flat(g, leg, colour, [-32, -94, 76, 96], shade)
    g.save(); g.beginPath(); leg(g); g.clip()
    if (spots) dots(g, [[-12, -66, 8], [10, -50, 8], [-14, -34, 8], [12, -20, 9], [32, -14, 6]])
    g.restore()
    flat(g, round(-29, -100, 52, 19, 8), trim, [-29, -100, 52, 19], shade * 0.6)
  } else if (kind === 'hat') {
    flat(g, ellipse(0, -9, 46, 11), trim, [-46, -20, 92, 22], shade * 0.6)
    const crown = soft([-31, -8], [-34, -56], [-20, -80], [6, -76], [26, -80], [35, -48], [31, -8], [0, -2])
    flat(g, crown, colour, [-34, -78, 68, 76], shade)
    g.save(); g.beginPath(); crown(g); g.clip()
    g.fillStyle = trim
    g.fillRect(-40, -26, 80, 13)
    if (spots) dots(g, [[-18, -54, 8], [4, -64, 7], [20, -46, 9], [-4, -40, 7]])
    g.restore()
  } else {
    g.strokeStyle = trim
    g.lineCap = 'round'
    g.lineWidth = 9
    g.beginPath(); g.arc(-33, -36, 17, Math.PI * 0.55, Math.PI * 1.5); g.stroke()
    flat(g, soft([20, -30], [40, -36], [42, -60], [56, -66], [52, -48], [44, -20], [22, -12]), trim, [20, -66, 36, 56], shade)
    const belly = soft([-34, -20], [-38, -52], [-16, -66], [14, -66], [37, -52], [33, -18], [18, 0], [-18, 0])
    flat(g, belly, colour, [-38, -68, 76, 70], shade)
    g.save(); g.beginPath(); belly(g); g.clip()
    if (spots) dots(g, [[-18, -42, 8], [6, -52, 7], [18, -28, 9], [-6, -18, 8], [-30, -22, 5]])
    g.restore()
    flat(g, soft([-21, -60], [-12, -73], [12, -73], [21, -60]), trim, [-21, -74, 42, 16], shade * 0.6)
    dots(g, [[0, -76, 6]], trim)
  }
}

export function drawSmall(g: G, sprites: Sprites, thing: Thing): void {
  sprites.stamp(g, thing.id, SMALL_BOX, (c) => paintSmall(c, thing.kind, DYE[thing.colour!], thing.spots))
}

// --- Faces --------------------------------------------------------------------

export type Gaze = { x: number; y: number }

function eye(g: G, x: number, y: number, r: number, open: number, gaze: Gaze, brow: number, side: number, colour = INK, lid = SKIN): void {
  const tall = r * Math.min(1.35, open)
  if (open < 0.16) {
    g.strokeStyle = colour
    g.lineWidth = r * 0.36
    g.lineCap = 'round'
    g.beginPath()
    g.arc(x, y - r * 0.3, r * 0.8, Math.PI * 0.16, Math.PI * 0.84)
    g.stroke()
  } else {
    g.fillStyle = '#fffaf0'
    g.beginPath(); g.ellipse(x, y, r, tall, 0, 0, Math.PI * 2); g.fill()
    g.save(); g.beginPath(); g.ellipse(x, y, r, tall, 0, 0, Math.PI * 2); g.clip()
    g.fillStyle = INK
    g.beginPath(); g.arc(x + gaze.x * r * 0.46, y + gaze.y * r * 0.46, r * 0.5, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#fffaf0'
    g.beginPath(); g.arc(x + gaze.x * r * 0.46 - r * 0.16, y + gaze.y * r * 0.46 - r * 0.2, r * 0.15, 0, Math.PI * 2); g.fill()
    if (open < 0.8) { g.fillStyle = lid; g.fillRect(x - r, y - tall, r * 2, tall * 0.5) }
    g.restore()
  }
  g.strokeStyle = colour
  g.lineWidth = r * 0.42
  g.lineCap = 'round'
  const up = y - r * 1.55 - brow * r * 0.75
  g.beginPath()
  g.moveTo(x - r * 0.9, up + (side < 0 ? -1 : 1) * Math.min(0, brow) * r * 0.5)
  g.quadraticCurveTo(x, up - r * 0.32, x + r * 0.9, up - (side < 0 ? -1 : 1) * Math.min(0, brow) * r * 0.5)
  g.stroke()
}

function mouth(g: G, x: number, y: number, w: number, open: number, smile: number): void {
  if (open > 0.12) {
    g.fillStyle = '#5b1f22'
    g.beginPath(); g.ellipse(x, y, w * (0.8 - open * 0.15), w * 0.16 + w * 0.5 * open, 0, 0, Math.PI * 2); g.fill()
    g.save(); g.clip()
    g.fillStyle = '#d7665c'
    g.beginPath(); g.ellipse(x, y + w * 0.5 * open + w * 0.1, w * 0.6, w * 0.3, 0, 0, Math.PI * 2); g.fill()
    g.restore()
    return
  }
  g.strokeStyle = '#6b2f2c'
  g.lineWidth = Math.max(2.4, w * 0.14)
  g.lineCap = 'round'
  g.beginPath(); g.moveTo(x - w * 0.7, y); g.quadraticCurveTo(x, y + smile * w * 0.7, x + w * 0.7, y); g.stroke()
}

// --- The people ---------------------------------------------------------------

type Live = { g: G; s: Sprites; pose: Pose; gaze: Gaze; t: number; place: 'home' | 'bed' | 'soup' | 'bath' }

function at(g: G, x: number, y: number, turn: number, draw: () => void, sx = 1, sy = 1): void {
  g.save()
  g.translate(x, y)
  if (turn) g.rotate(turn)
  if (sx !== 1 || sy !== 1) g.scale(sx, sy)
  draw()
  g.restore()
}

function king({ g, s, pose, gaze, place }: Live): void {
  if (place === 'home') s.stamp(g, 'throne', [-118, -236, 236, 240], (c) => {
    flat(c, round(-96, -226, 192, 226, 30), '#8a6a4a', [-96, -226, 192, 226], 0.8)
    flat(c, round(-78, -208, 156, 170, 24), '#76706a', [-78, -208, 156, 170], 0.7)
    for (const x of [-96, 96]) flat(c, ellipse(x, -228, 13, 13), GOLD, [x - 13, -241, 26, 26])
    flat(c, round(-112, -96, 34, 96, 10), '#7d5f42', [-112, -96, 34, 96])
    flat(c, round(78, -96, 34, 96, 10), '#7d5f42', [78, -96, 34, 96])
  })
  at(g, 0, 0, 0, () => s.stamp(g, 'king-body', [-112, -190, 224, 194], (c) => {
    flat(c, ellipse(-34, -5, 30, 11), INK, [-64, -16, 60, 22], 0)
    flat(c, ellipse(34, -5, 30, 11), INK, [4, -16, 60, 22], 0)
    flat(c, soft([-60, -178], [60, -178], [104, -90], [108, -10], [60, -14], [0, -6], [-60, -14], [-108, -10], [-104, -90]), DYE.red, [-108, -178, 216, 176], 0.75)
    flat(c, soft([-46, -150], [46, -150], [66, -80], [52, -24], [0, -12], [-52, -24], [-66, -80]), '#f1e4c9', [-66, -150, 132, 140], 0.5)
    // A collar of white fur with black tails.
    flat(c, soft([-74, -176], [0, -152], [74, -176], [82, -140], [0, -116], [-82, -140]), WHITE, [-82, -178, 164, 64], 0.4)
    for (const [x, y] of [[-58, -150], [-28, -138], [2, -133], [32, -139], [60, -152]]) flat(c, ellipse(x, y, 4, 8), INK, [x, y, 1, 1], 0)
    dots(c, [[0, -96, 6], [0, -70, 6], [0, -46, 6]], GOLD)
  }), 1 + pose.part * 0.016, 1 - pose.part * 0.01)
  at(g, 0, -170 - pose.neck, pose.tilt, () => {
    s.stamp(g, 'king-head', [-66, -112, 132, 130], (c) => {
      flat(c, ellipse(-46, -34, 11, 15), SKIN, [-57, -49, 22, 30])
      flat(c, ellipse(46, -34, 11, 15), SKIN, [35, -49, 22, 30])
      flat(c, soft([-46, -62], [0, -74], [46, -62], [54, -24], [30, 8], [-30, 8], [-54, -24]), SKIN, [-52, -72, 104, 82], 0.5)
      flat(c, soft([-50, -20], [-20, -12], [0, -20], [20, -12], [50, -20], [52, 4], [0, 24], [-52, 4]), '#a8663a', [-52, -20, 104, 40], 0.7)
      flat(c, ellipse(-28, -20, 11, 8), BLUSH, [0, 0, 1, 1], 0)
      flat(c, ellipse(28, -20, 11, 8), BLUSH, [0, 0, 1, 1], 0)
    })
    eye(g, -20, -42, 11, pose.eyes, gaze, pose.brow, -1, '#7a4526')
    eye(g, 20, -42, 11, pose.eyes, gaze, pose.brow, 1, '#7a4526')
    flat(g, ellipse(0, -26, 15, 12), '#d99a78', [0, 0, 1, 1], 0)
    mouth(g, 0, -4, 18, pose.mouth, pose.brow < -0.3 ? -0.5 : 0.3)
    at(g, 0, -64 - Math.max(0, pose.neck) * 0.6, pose.tilt * 0.6, () => s.stamp(g, 'crown', [-50, -52, 100, 60], (c) => {
      flat(c, poly([-42, 2], [-48, -36], [-24, -18], [0, -46], [24, -18], [48, -36], [42, 2]), GOLD, [-48, -46, 96, 48], 0.7)
      dots(c, [[-48, -38, 6], [0, -47, 6], [48, -38, 6], [-22, -8, 4], [0, -10, 5], [22, -8, 4]], WHITE)
    }))
  })
}

function queen({ g, s, pose, gaze, place }: Live): void {
  if (place === 'home') flat(g, ellipse(0, -2, 64, 9), 'rgba(52,30,26,0.22)', [0, 0, 1, 1], 0)
  s.stamp(g, 'queen-body', [-76, -190, 152, 194], (c) => {
    const gown = soft([-20, -186], [20, -186], [26, -122], [66, -30], [72, 0], [0, -8], [-72, 0], [-66, -30], [-26, -122])
    flat(c, gown, DYE.blue, [-72, -186, 144, 186], 0.7)
    c.save(); c.beginPath(); gown(c); c.clip()
    dots(c, [[-10, -150, 8], [10, -118, 8], [-22, -90, 9], [16, -76, 10], [-46, -46, 10], [-8, -48, 11], [36, -38, 11], [-30, -14, 10], [10, -18, 11], [56, -10, 9]])
    c.restore()
  })
  // The neck is drawn each frame: it is most of the queen.
  const up = 66 + pose.neck
  g.strokeStyle = '#e4b48c'
  g.lineWidth = 19
  g.lineCap = 'round'
  g.beginPath(); g.moveTo(0, -176); g.quadraticCurveTo(pose.tilt * 30, -190 - up * 0.3, pose.tilt * 12, -178 - up * 0.72); g.stroke()
  s.stamp(g, 'queen-ruff', [-46, -206, 92, 40], (c) => {
    for (let i = 0; i < 9; i++) flat(c, ellipse(-34 + i * 8.5, -185, 8, 14, (i - 4) * 0.1), i % 2 ? WHITE : '#e6dcc0', [-42, -200, 84, 30], 0.3)
  })
  at(g, pose.tilt * 12, -172 - up * 0.8, pose.tilt, () => {
    s.stamp(g, 'queen-head', [-50, -108, 100, 124], (c) => {
      flat(c, soft([-34, -60], [-38, -94], [0, -106], [38, -94], [34, -60], [40, -40], [-40, -40]), '#5d3b36', [-38, -106, 76, 66], 0.7)
      flat(c, soft([-28, -56], [28, -56], [31, -20], [12, 10], [-12, 10], [-31, -20]), SKIN, [-31, -58, 62, 68], 0.45)
      flat(c, ellipse(-20, -14, 8, 6), BLUSH, [0, 0, 1, 1], 0)
      flat(c, ellipse(20, -14, 8, 6), BLUSH, [0, 0, 1, 1], 0)
      flat(c, poly([-20, -90], [-22, -106], [-9, -97], [0, -108], [9, -97], [22, -106], [20, -90]), GOLD, [-22, -108, 44, 18])
    })
    eye(g, -13, -32, 9, pose.eyes, gaze, pose.brow, -1)
    eye(g, 13, -32, 9, pose.eyes, gaze, pose.brow, 1)
    flat(g, poly([-3, -28], [8, -10], [-4, -9]), '#d49a76', [0, 0, 1, 1], 0)
    mouth(g, 0, 0, 10, pose.mouth, 0.1)
  })
}

function gran({ g, s, pose, gaze, place }: Live): void {
  if (place === 'home') s.stamp(g, 'gran-chair', [-92, -196, 184, 200], (c) => {
    flat(c, round(-62, -8, 14, 12, 3), '#59412f', [0, 0, 1, 1], 0)
    flat(c, round(48, -8, 14, 12, 3), '#59412f', [0, 0, 1, 1], 0)
    flat(c, soft([-64, -190], [0, -202], [64, -190], [78, -100], [72, -6], [-72, -6], [-78, -100]), '#75806a', [-78, -198, 156, 192], 0.8)
    flat(c, round(-90, -86, 42, 80, 20), '#667159', [-90, -86, 42, 80], 0.8)
    flat(c, round(48, -86, 42, 80, 20), '#667159', [48, -86, 42, 80], 0.8)
  })
  const sit = place === 'home' ? -30 : 0, shrug = pose.part * 9
  at(g, 0, sit, 0, () => {
    s.stamp(g, 'gran-body', [-60, -104, 120, 108], (c) => {
      flat(c, soft([-30, -98], [30, -98], [52, -44], [54, 0], [-54, 0], [-52, -44]), DYE.yellow, [-54, -100, 108, 100], 0.7)
      flat(c, soft([-34, -94], [0, -78], [34, -94], [46, -58], [0, -40], [-46, -58]), mix(DYE.yellow, '#fff3cf', 0.5), [-46, -96, 92, 56], 0.4)
      dots(c, [[0, -66, 6]], GOLD)
    })
    for (const side of [-1, 1]) flat(g, ellipse(side * 34, -84 - shrug, 17, 14), DYE.yellow, [0, 0, 1, 1], 0)
    at(g, 0, -92 - shrug * 0.7, pose.tilt, () => {
      s.stamp(g, 'gran-head', [-52, -92, 104, 104], (c) => {
        flat(c, soft([-38, -70], [0, -90], [38, -70], [46, -30], [30, -8], [-30, -8], [-46, -30]), '#dcd6cb', [-44, -84, 88, 76], 0.6)
        flat(c, ellipse(0, -84, 15, 10), '#d2cbbf', [-15, -92, 30, 18])
        flat(c, soft([-30, -50], [30, -50], [36, -18], [16, 8], [-16, 8], [-36, -18]), '#ebc3a2', [-34, -52, 68, 60], 0.45)
        flat(c, ellipse(-22, -14, 9, 7), BLUSH, [0, 0, 1, 1], 0)
        flat(c, ellipse(22, -14, 9, 7), BLUSH, [0, 0, 1, 1], 0)
      })
      eye(g, -14, -30, 10, pose.eyes, gaze, pose.brow, -1, '#8b7f78', '#ebc3a2')
      eye(g, 14, -30, 10, pose.eyes, gaze, pose.brow, 1, '#8b7f78', '#ebc3a2')
      flat(g, soft([-4, -24], [5, -24], [12, -8], [2, -2], [-8, -8]), '#d79d7c', [0, 0, 1, 1], 0)
      mouth(g, 1, 2, 15, pose.mouth, 0.9)
      if (pose.mouth > 0.3) { g.fillStyle = WHITE; g.fillRect(-2, -4 - pose.mouth * 2, 7, 6) }
    })
  })
}

function cat({ g, s, pose, gaze }: Live): void {
  const c0 = DYE.yellow, dark = mix(c0, '#3a1d12', 0.3)
  g.strokeStyle = dark; g.lineWidth = 12; g.lineCap = 'round'
  g.beginPath(); g.moveTo(34, -12); g.quadraticCurveTo(66, -10, 58 + pose.part * 6, -46 - pose.part * 8); g.stroke()
  s.stamp(g, 'cat-body', [-48, -74, 96, 78], (c) => {
    flat(c, soft([-18, -70], [18, -70], [40, -30], [38, 0], [-38, 0], [-40, -30]), c0, [-40, -70, 80, 72], 0.65)
    flat(c, ellipse(0, -18, 18, 20), mix(c0, '#fff6dc', 0.6), [-18, -38, 36, 40], 0.3)
  })
  at(g, 0, -62 - pose.neck, pose.tilt, () => {
    s.stamp(g, 'cat-head', [-46, -60, 92, 78], (c) => {
      flat(c, poly([-34, -18], [-36, -54], [-8, -34]), c0, [-36, -54, 30, 36], 0.6)
      flat(c, poly([34, -18], [36, -54], [8, -34]), c0, [6, -54, 30, 36], 0.6)
      flat(c, soft([-36, -34], [36, -34], [42, -6], [20, 14], [-20, 14], [-42, -6]), c0, [-40, -36, 80, 50], 0.5)
      flat(c, ellipse(0, 2, 19, 11), mix(c0, '#fff6dc', 0.6), [-19, -9, 38, 22], 0.2)
    })
    eye(g, -17, -14, 10, pose.eyes, gaze, pose.brow - 0.4, -1, dark, c0)
    eye(g, 17, -14, 10, pose.eyes, gaze, pose.brow - 0.4, 1, dark, c0)
    flat(g, poly([-6, -4], [6, -4], [0, 3]), '#b4544a', [0, 0, 1, 1], 0)
    mouth(g, 0, 8, 10, pose.mouth, -0.5)
  })
}

function hen({ g, s, pose, gaze }: Live): void {
  const c0 = DYE.blue
  g.strokeStyle = '#c98b3a'; g.lineWidth = 5; g.lineCap = 'round'
  g.beginPath(); g.moveTo(-10, -18); g.lineTo(-14, -2); g.moveTo(10, -18); g.lineTo(14, -2); g.stroke()
  s.stamp(g, 'hen-body', [-60, -84, 120, 76], (c) => {
    flat(c, poly([-34, -40], [-58, -76], [-46, -42], [-60, -54], [-38, -22]), mix(c0, '#1c1430', 0.25), [-60, -76, 30, 54])
    const body = soft([-40, -62], [6, -66], [38, -72], [46, -36], [22, -8], [-22, -8], [-46, -30])
    flat(c, body, c0, [-46, -72, 92, 64], 0.65)
    c.save(); c.beginPath(); body(c); c.clip()
    dots(c, [[-26, -44, 6], [-8, -56, 6], [12, -46, 6], [-12, -28, 7], [10, -22, 6], [30, -32, 6], [32, -58, 5]])
    c.restore()
  })
  at(g, -2, -40, -0.1 + pose.part * 0.22, () => s.stamp(g, 'hen-wing', [-26, -16, 52, 40], (c) => flat(c, soft([-20, -10], [18, -12], [22, 8], [-4, 20], [-24, 6]), mix(c0, '#1c1430', 0.28), [-24, -14, 48, 34], 0.5)))
  at(g, 30, -74 - pose.neck, pose.tilt, () => {
    s.stamp(g, 'hen-head', [-26, -44, 62, 66], (c) => {
      flat(c, soft([-14, -22], [-12, -38], [-4, -28], [2, -42], [8, -28], [16, -36], [16, -20]), '#b4463c', [-14, -42, 30, 24], 0.3)
      flat(c, ellipse(0, -8, 21, 20), c0, [-21, -28, 42, 40], 0.5)
      flat(c, soft([-8, 6], [8, 6], [14, 20], [-12, 20]), c0, [0, 0, 1, 1], 0)
    })
    g.fillStyle = '#d99a34'
    g.beginPath(); g.moveTo(17, -14); g.lineTo(36, -6 - pose.mouth * 6); g.lineTo(17, -4); g.fill()
    g.beginPath(); g.moveTo(17, -6); g.lineTo(32, -2 + pose.mouth * 9); g.lineTo(15, 1); g.fill()
    eye(g, 5, -12, 8, pose.eyes, gaze, pose.brow + 0.2, 1, '#1d2f55', c0)
  })
}

function piglet({ g, s, pose, gaze }: Live): void {
  const c0 = DYE.red, pale = mix(c0, '#ffd9c4', 0.34)
  g.strokeStyle = c0; g.lineWidth = 6; g.lineCap = 'round'
  g.beginPath(); g.moveTo(48, -40); g.bezierCurveTo(66, -46, 56 + pose.part * 3, -60, 62, -54 - pose.part * 4); g.stroke()
  s.stamp(g, 'pig-body', [-58, -76, 116, 80], (c) => {
    for (const x of [-32, -10, 18, 38]) flat(c, round(x - 9, -20, 18, 20, 6), mix(c0, '#3a1410', 0.22), [0, 0, 1, 1], 0)
    flat(c, soft([-40, -66], [30, -72], [56, -40], [42, -8], [-36, -8], [-54, -36]), c0, [-54, -72, 110, 64], 0.65)
  })
  at(g, -26, -52 - pose.neck, pose.tilt, () => {
    at(g, -22, -24, -0.3 - pose.part * 0.1, () => s.stamp(g, 'pig-ear', [-16, -22, 32, 30], (c) => flat(c, poly([-10, 4], [-12, -20], [12, 0]), mix(c0, '#3a1410', 0.2), [0, 0, 1, 1], 0)))
    at(g, 20, -24, 0.5 + pose.part * 0.1, () => s.stamp(g, 'pig-ear', [-16, -22, 32, 30], () => {}))
    s.stamp(g, 'pig-head', [-42, -44, 84, 72], (c) => {
      flat(c, soft([-30, -32], [26, -32], [36, -2], [16, 22], [-22, 22], [-38, -2]), mix(c0, '#ffffff', 0.08), [-36, -34, 72, 56], 0.5)
      flat(c, ellipse(-3, 3, 18, 13), pale, [-21, -10, 42, 26], 0.2)
      dots(c, [[-9, 3, 4], [4, 3, 4]], '#6b2018')
    })
    eye(g, -17, -14, 8, pose.eyes, gaze, pose.brow + 0.3, -1, '#6b2018', c0)
    eye(g, 12, -14, 8, pose.eyes, gaze, pose.brow + 0.3, 1, '#6b2018', c0)
    mouth(g, -3, 18, 11, pose.mouth, 1)
  })
}

export function drawLiving(kind: Kind, live: Live): void {
  switch (kind) {
    case 'king': return king(live)
    case 'queen': return queen(live)
    case 'gran': return gran(live)
    case 'cat': return cat(live)
    case 'hen': return hen(live)
    case 'piglet': return piglet(live)
    default:
  }
}

// --- The butler ---------------------------------------------------------------

export type Hands = { left: Gaze; right: Gaze; point: boolean }

/** Drawn about his feet. The hands are where they are asked to be, however far that is: his sleeves stretch. */
export function drawButler({ g, s, pose, gaze, t, place }: Live, hands: Hands, stride: number, speed: number): void {
  const run = Math.min(1, Math.abs(speed) / 420), hip = -150
  if (place === 'home') {
    flat(g, ellipse(0, 2, 84, 12), 'rgba(52,30,26,0.25)', [0, 0, 1, 1], 0)
    for (const side of [-1, 1]) {
      const swing = Math.sin(stride + (side > 0 ? Math.PI : 0)) * run
      const fx = side * 25 + swing * 46, fy = -Math.max(0, Math.cos(stride + (side > 0 ? Math.PI : 0))) * run * 26
      g.strokeStyle = '#4d4558'
      g.lineWidth = 31
      g.lineCap = 'round'
      g.beginPath(); g.moveTo(side * 22, hip); g.quadraticCurveTo(side * 30 + swing * 40 + Math.sign(speed || 1) * run * 12, (hip + fy) / 2, fx, fy - 22); g.stroke()
      flat(g, ellipse(fx + side * 9, fy - 9, 29, 12), INK, [0, 0, 1, 1], 0)
    }
  }
  // Behind: the far sleeve.
  const top = -316 - pose.neck * 0.2
  at(g, 0, 0, speed * 0.00012, () => {
    s.stamp(g, 'butler-body', [-100, -340, 200, 230], (c) => {
      flat(c, poly([-58, -170], [-84, -116], [-40, -126], [-30, -170]), mix(COAT, '#000000', 0.2), [0, 0, 1, 1], 0)
      flat(c, poly([58, -170], [84, -116], [40, -126], [30, -170]), mix(COAT, '#000000', 0.2), [0, 0, 1, 1], 0)
      flat(c, soft([-60, -330], [60, -330], [88, -270], [80, -190], [58, -140], [-58, -140], [-80, -190], [-88, -270]), COAT, [-86, -330, 172, 190], 0.5)
      flat(c, soft([-30, -334], [30, -334], [36, -260], [24, -166], [0, -150], [-24, -166], [-36, -260]), WHITE, [-36, -332, 72, 180], 0.4)
      flat(c, soft([-34, -230], [34, -230], [30, -168], [0, -146], [-30, -168]), '#8d8a7a', [-34, -230, 68, 84], 0.5)
      dots(c, [[0, -264, 4.5], [0, -206, 4.5], [0, -186, 4.5]], GOLD)
      flat(c, poly([-32, -334], [-62, -322], [-40, -240], [-28, -290]), mix(COAT, '#ffffff', 0.12), [0, 0, 1, 1], 0)
      flat(c, poly([32, -334], [62, -322], [40, -240], [28, -290]), mix(COAT, '#ffffff', 0.12), [0, 0, 1, 1], 0)
    })
    for (const side of [-1, 1]) {
      const hand = side < 0 ? hands.left : hands.right
      const sx = side * 72, sy = top + 22
      const far = Math.hypot(hand.x - sx, hand.y - sy)
      const bend = Math.max(0, 1 - far / 240)
      g.strokeStyle = mix(COAT, '#ffffff', side < 0 ? 0.05 : 0.09)
      g.lineWidth = Math.max(17, 34 - Math.max(0, far - 190) * 0.05)
      g.lineCap = 'round'
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo((sx + hand.x) / 2 + side * (14 + bend * 80), (sy + hand.y) / 2 + bend * 60, hand.x, hand.y); g.stroke()
      const toward = Math.atan2(hand.y - sy, hand.x - sx)
      at(g, hand.x, hand.y, toward, () => {
        s.stamp(g, `glove-${hands.point && side > 0 ? 'point' : 'open'}`, [-26, -32, 82, 64], (c) => {
          flat(c, round(-22, -19, 18, 38, 6), '#e3d9c0', [-22, -19, 18, 38], 0.3)
          flat(c, ellipse(12, 0, 23, 21), WHITE, [-10, -21, 46, 42], 0.35)
          if (hands.point && side > 0) flat(c, round(18, -8, 36, 15, 8), WHITE, [18, -8, 36, 15], 0.2)
          else for (const a of [-0.5, -0.06, 0.4]) { c.save(); c.translate(12, 0); c.rotate(a); flat(c, round(8, -7, 30, 14, 7), WHITE, [8, -7, 30, 14], 0.2); c.restore() }
          c.save(); c.translate(4, 6); c.rotate(1.1); flat(c, round(6, -7, 22, 14, 7), WHITE, [0, 0, 1, 1], 0); c.restore()
        })
      })
    }
  })
  at(g, 0, top - 4 - pose.neck, pose.tilt, () => {
    g.strokeStyle = SKIN; g.lineWidth = 26; g.beginPath(); g.moveTo(0, 14); g.lineTo(0, -8); g.stroke()
    flat(g, poly([-24, -2], [-24, 18], [0, 8], [24, 18], [24, -2], [0, 6]), '#6a3d52', [0, 0, 1, 1], 0)
    at(g, 0, 8, pose.part * 0.12, () => flat(g, ellipse(0, 0, 6, 6), '#55304a', [0, 0, 1, 1], 0))
    s.stamp(g, 'butler-head', [-70, -124, 140, 130], (c) => {
      flat(c, ellipse(-52, -50, 13, 19), SKIN, [-65, -69, 26, 38], 0.4)
      flat(c, ellipse(52, -50, 13, 19), SKIN, [39, -69, 26, 38], 0.4)
      flat(c, soft([-46, -92], [0, -116], [46, -92], [54, -40], [30, 2], [-30, 2], [-54, -40]), SKIN, [-54, -112, 108, 114], 0.5)
      flat(c, soft([-50, -84], [-34, -116], [0, -122], [40, -114], [51, -84], [30, -98], [-4, -90], [-30, -96]), INK, [-50, -120, 102, 40], 0.3)
      flat(c, ellipse(-34, -28, 12, 9), BLUSH, [0, 0, 1, 1], 0)
      flat(c, ellipse(34, -28, 12, 9), BLUSH, [0, 0, 1, 1], 0)
    })
    eye(g, -21, -56, 15, pose.eyes, gaze, pose.brow, -1)
    eye(g, 21, -56, 15, pose.eyes, gaze, pose.brow, 1)
    g.strokeStyle = GOLD; g.lineWidth = 3.4
    g.beginPath(); g.arc(21, -56, 19, 0, Math.PI * 2); g.stroke()
    g.beginPath(); g.moveTo(38, -46); g.quadraticCurveTo(52, -10 + Math.sin(t * 2) * 3, 40, 22); g.stroke()
    mouth(g, 0, -6, 19, pose.mouth, 0.8)
    flat(g, soft([-5, -50], [7, -50], [19, -26], [4, -18], [-14, -26]), '#d89d77', [0, 0, 1, 1], 0)
    flat(g, soft([0, -20], [-16, -24], [-40, -14 - pose.part * 2], [-18, -12]), INK, [0, 0, 1, 1], 0)
    flat(g, soft([0, -20], [16, -24], [40, -14 - pose.part * 2], [18, -12]), INK, [0, 0, 1, 1], 0)
  })
}
