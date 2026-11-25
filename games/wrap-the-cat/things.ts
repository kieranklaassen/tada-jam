import { CREAM, PAPER, SKIN, arc, blob, crepe, darker, fringe, frilled, grounded, lighter, oval, poly, rosette, rounded, sprite, wire, wrapped, type Ctx, type P, type Shape, type Sprite } from './crepe'
import type { FixedId, Paper } from './layout'

// What stands in the room: each thing's shape for the paper, its bare picture,
// and the parts of it that move. The origin of each is the middle of its foot.

const box = (x: number, y: number, rx: number, ry = rx) => ({ x: x - rx, y: y - ry, w: rx * 2, h: ry * 2 })

// --- Shapes --------------------------------------------------------------------

const WHEEL = 80
export const HUBS: readonly P[] = [[-108, -84], [108, -84]]
const FRAME: readonly (readonly P[])[] = [
  [[-108, -84], [-12, -78], [-48, -160], [-108, -84]],
  [[-12, -78], [66, -160], [-46, -152]],
  [[64, -196], [68, -160], [108, -84]],
]
const BARS: readonly P[] = [[30, -216], [50, -222], [64, -198], [86, -226], [112, -222]]

const CHAIR = { back: rounded(-108, -262, 216, 230, 70), left: rounded(-146, -172, 66, 172, 32), right: rounded(80, -172, 66, 172, 32), seat: rounded(-96, -118, 192, 118, 24) }
const NECK: readonly P[] = [[48, -250], [70, -330], [84, -410], [96, -452]]
const LEGS: readonly (readonly P[])[] = [[[-78, -215], [-84, -8]], [[-34, -205], [-30, -4]], [[34, -205], [34, -8]], [[76, -215], [84, -4]]]
const COIL = arc(0, -84, 66, 62, -2.2, 3.9, 40)

export const SHAPES: Record<FixedId, Shape> = {
  bike: { fills: [oval(-108, -84, WHEEL), oval(108, -84, WHEEL), poly(-108, -84, -12, -78, 66, -160, -48, -160), oval(-52, -178, 34, 12)], lines: [...FRAME, BARS].map((pts) => ({ pts, w: 20 })), marks: [...[-108, 108].flatMap((x) => [arc(x, -84, 54, 54, 0, Math.PI * 2), arc(x, -84, 12, 12, 0, Math.PI * 2)]), [[-66, -112], [-48, -146], [40, -148], [-10, -92], [-40, -86]], [[74, -140], [94, -104]]] },
  cat: { fills: [blob(-58, 0, -78, -50, -52, -112, 0, -128, 52, -112, 78, -50, 58, 0, 0, 6)], marks: [arc(-34, -20, 30, 40, 3.4, 5.6), arc(34, -20, 30, 40, 3.9, 6.1)] },
  grandpa: { fills: [CHAIR.back, CHAIR.left, CHAIR.right, CHAIR.seat, oval(0, -120, 92, 84)], marks: [[[-82, -10], [-84, -120], [-100, -164]], [[82, -10], [84, -120], [100, -164]], arc(0, -120, 66, 66, 0.3, 2.84), [[0, -44], [0, -8]], [[-50, -110], [-22, -98]], [[50, -110], [22, -98]]] },
  giraffe: { fills: [oval(0, -242, 104, 62), oval(62, -262, 40, 42)], lines: [...LEGS.map((pts) => ({ pts, w: 28 })), { pts: NECK, w: 54 }], marks: [[[-60, -186], [-30, -196], [34, -196], [64, -186]], [[26, -280], [52, -240], [90, -232]], [[56, -330], [92, -322]], [[72, -392], [106, -386]]] },
  tuba: { fills: [oval(-8, -190, 92, 54), poly(-60, -170, 44, -170, 22, -96, -28, -96)], lines: [{ pts: COIL, w: 38 }, { pts: [[52, -118], [64, -168], [90, -176]], w: 14 }], marks: [arc(0, -84, 40, 38, 0, Math.PI * 2), arc(-8, -190, 56, 30, 0, Math.PI * 2), arc(-8, -190, 18, 10, 0, Math.PI * 2)] },
  tree: { fills: [blob(0, -418, 44, -340, 62, -290, 92, -200, 128, -110, 128, -46, 0, -34, -128, -46, -128, -110, -92, -200, -62, -290, -44, -340), rounded(-38, -56, 76, 56, 10)], marks: [arc(0, -330, 60, 26, 0.3, 2.84), arc(0, -240, 88, 32, 0.3, 2.84), arc(0, -150, 112, 36, 0.3, 2.84)] },
}
export const AIR_SHAPE: Shape = { fills: [frilled(0, -60, 54, 50, 7, 5)] }

const BOXES: Record<FixedId, readonly [number, number, number, number]> = {
  bike: [-212, -256, 424, 276], cat: [-104, -152, 208, 178], grandpa: [-170, -300, 340, 326], giraffe: [-132, -500, 290, 530], tuba: [-126, -268, 252, 292], tree: [-158, -450, 316, 476],
}

const WRAPS = {} as Record<FixedId | 'air', { out: Sprite; under: Sprite }[]>
for (const id of [...(Object.keys(SHAPES) as FixedId[]), 'air' as const]) {
  const shape = id === 'air' ? AIR_SHAPE : SHAPES[id], [x, y, w, h] = id === 'air' ? ([-80, -140, 160, 160] as const) : BOXES[id]
  WRAPS[id] = ([0, 1, 2] as Paper[]).map((paper) => ({
    out: sprite(`wrap-${id}-${paper}`, x, y, w, h, (c, r) => wrapped(c, r, shape, { x, y, w, h }, paper, false)),
    under: sprite(`under-${id}-${paper}`, x, y, w, h, (c, r) => wrapped(c, r, shape, { x, y, w, h }, paper, true)),
  }))
}
export { WRAPS }

// --- Bare pictures ---------------------------------------------------------------

const FUR = '#4a4652'
const HIDE = '#f0d9ab'
const RUST = '#a9602f'
const COPPER = '#c07a45'
const MAUVE = '#94708f'
const GREEN = '#3f7d58'

const bareOf = (id: FixedId, paint: Sprite['paint']): Sprite => sprite(`bare-${id}`, ...BOXES[id], paint)

export const BARE: Record<FixedId, Sprite> = {
  bike: bareOf('bike', (c) => {
    grounded(c, 0, -2, 180, 12)
    for (const pts of FRAME) wire(c, pts, 17, '#2f8f8a')
    wire(c, BARS, 12, '#5b4a44')
    wire(c, [[-48, -160], [-52, -176]], 10, '#5b4a44')
  }),
  cat: bareOf('cat', (c, r) => {
    grounded(c, 0, 2, 80, 12)
    crepe(c, r, blob(-54, 0, -74, -50, -48, -108, 0, -124, 48, -108, 74, -50, 54, 0, 0, 4), box(0, -60, 80, 70), FUR)
    for (let y = -104; y < -8; y += 17) { const w = 22 + Math.sqrt(Math.max(0, 1 - ((y + 52) / 66) ** 2)) * 48; fringe(c, r, [-w, y], [w, y], 24, FUR, { w: 8, spread: -0.7 }) }
    fringe(c, r, [-26, -104], [26, -104], 48, CREAM, { w: 8, spread: -0.8 })
    fringe(c, r, [-20, -74], [20, -74], 44, CREAM, { w: 8, spread: -0.7 })
  }),
  grandpa: bareOf('grandpa', (c, r) => {
    grounded(c, 0, 0, 150, 14)
    crepe(c, r, CHAIR.back, box(0, -146, 108, 116), MAUVE)
    for (const [x, y] of [[-50, -220], [50, -220], [0, -236]] as const) rosette(c, r, x, y, 11, 11, darker(MAUVE, 0.2), 1)
    crepe(c, r, CHAIR.seat, box(0, -60, 96, 60), darker(MAUVE, 0.1), { along: 0 })
    crepe(c, r, rounded(-58, -70, 50, 64, 18), box(-33, -38, 28, 34), '#6b5546')
    crepe(c, r, rounded(8, -70, 50, 64, 18), box(33, -38, 28, 34), '#6b5546')
    crepe(c, r, blob(-70, -60, -84, -130, -60, -194, 0, -206, 60, -194, 84, -130, 70, -60, 0, -50), box(0, -128, 86, 78), '#7f8a4c')
    for (const y of [-170, -132, -94]) rosette(c, r, 0, y, 8, 8, CREAM, 1)
    crepe(c, r, oval(-40, -104, 24, 17, 0.4), box(-40, -104, 24, 18), SKIN)
    crepe(c, r, oval(40, -104, 24, 17, -0.4), box(40, -104, 24, 18), SKIN)
    crepe(c, r, CHAIR.left, box(-113, -86, 33, 86), MAUVE)
    crepe(c, r, CHAIR.right, box(113, -86, 33, 86), MAUVE)
    rosette(c, r, -113, -148, 25, 23, lighter(MAUVE, 0.12), 2)
    rosette(c, r, 113, -148, 25, 23, lighter(MAUVE, 0.12), 2)
  }),
  giraffe: bareOf('giraffe', (c, r) => {
    grounded(c, 0, 0, 120, 12)
    for (const [i, pts] of LEGS.entries()) {
      wire(c, pts, 24, i % 2 ? HIDE : darker(HIDE, 0.18))
      crepe(c, r, rounded(pts[1][0] - 17, pts[1][1] - 18, 34, 22, 8), box(pts[1][0], pts[1][1] - 8, 18, 14), '#6b4a34')
    }
    c.lineCap = 'round'
    crepe(c, r, blob(-104, -242, -84, -296, 0, -304, 84, -300, 106, -250, 84, -196, 0, -182, -84, -190), box(0, -242, 106, 64), HIDE)
    crepe(c, r, poly(22, -262, 58, -340, 70, -456, 120, -456, 112, -380, 104, -250, 60, -220), box(70, -350, 50, 110), HIDE, { along: 0.15 })
    fringe(c, r, [34, -272], [60, -346], 26, RUST, { w: 8 })
    fringe(c, r, [58, -346], [72, -452], 26, RUST, { w: 8 })
    for (const [x, y, s] of [[-66, -258, 22], [-20, -272, 20], [-38, -222, 18], [12, -226, 20], [54, -240, 20], [-78, -214, 12], [78, -292, 16], [84, -346, 15], [92, -396, 14], [66, -316, 12], [92, -440, 11]] as const) crepe(c, r, frilled(x, y, s, s * 0.85, 5, 3, x), box(x, y, s + 4, s + 4), RUST)
    wire(c, [[-100, -250], [-122, -210], [-118, -170]], 8, HIDE)
    fringe(c, r, [-126, -172], [-110, -172], 26, RUST, { w: 6, spread: -0.8 })
  }),
  tuba: bareOf('tuba', (c, r) => {
    grounded(c, 0, 0, 80, 11)
    wire(c, COIL, 36, COPPER)
    wire(c, [[52, -118], [64, -168], [92, -176]], 12, COPPER)
    crepe(c, r, poly(-62, -176, 46, -176, 20, -92, -26, -92), box(-8, -134, 56, 44), COPPER, { along: 1.57 })
    for (const x of [-26, 0, 26]) { wire(c, [[x, -74], [x, -112]], 14, darker(COPPER, 0.25)); rosette(c, r, x, -116, 12, 9, CREAM, 1) }
    rosette(c, r, -8, -190, 94, 54, lighter(COPPER, 0.18), 3, '#4e2c1a')
  }),
  tree: bareOf('tree', (c, r) => {
    grounded(c, 0, 0, 90, 12)
    crepe(c, r, poly(-30, -60, 30, -60, 38, 0, -38, 0), box(0, -30, 40, 32), '#a35c3c')
    wire(c, [[0, -56], [0, -412]], 12, '#6b5138')
    for (let i = 0; i < 9; i++) {
      const y = -92 - i * 37, w = 118 - i * 11.6
      fringe(c, r, [-w, y + 4], [w, y + 4], 62 - i * 2, i % 2 ? GREEN : darker(GREEN, 0.16), { w: 11, spread: -1.1 })
    }
    for (const [x, y, k] of [[-52, -96, 0], [34, -120, 1], [78, -78, 2], [-70, -66, 1], [-22, -176, 2], [44, -206, 0], [-40, -252, 1], [14, -290, 2], [-12, -340, 0], [0, -118, 1]] as const) rosette(c, r, x, y, 15, 15, ['#e9b8c4', CREAM, '#c9884d'][k], 2)
  }),
}

export const T = {
  wheel: sprite('wheel', -90, -90, 180, 180, (c) => {
    c.strokeStyle = '#9aa7a0'
    c.lineWidth = 2
    c.beginPath()
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.moveTo(0, 0); c.lineTo(Math.cos(a) * 72, Math.sin(a) * 72) }
    c.stroke()
    wire(c, arc(0, 0, WHEEL - 7, WHEEL - 7, 0, Math.PI * 2, 48), 15, '#57504e')
    c.fillStyle = '#2f8f8a'
    c.beginPath(); c.arc(0, 0, 11, 0, 7); c.fill()
  }),
  saddle: sprite('saddle', -44, -22, 88, 44, (c, r) => crepe(c, r, blob(-36, -4, -20, -14, 10, -8, 38, 0, 10, 10, -28, 12), box(0, 0, 40, 16), '#6b4a34')),
  bell: sprite('bell', -24, -24, 48, 48, (c, r) => rosette(c, r, 0, 0, 18, 18, '#e2c067', 2)),
  grandpaHead: sprite('grandpa-head', -84, -84, 168, 168, (c, r) => {
    fringe(c, r, [-46, -24], [-62, 26], 26, '#f4f0ea', { w: 9 })
    fringe(c, r, [62, 26], [46, -24], 26, '#f4f0ea', { w: 9 })
    crepe(c, r, oval(-50, 6, 14, 16), box(-50, 6, 15, 17), darker(SKIN, 0.1))
    crepe(c, r, oval(50, 6, 14, 16), box(50, 6, 15, 17), darker(SKIN, 0.1))
    crepe(c, r, blob(-48, -10, -40, -52, 0, -62, 40, -52, 48, -10, 44, 36, 0, 58, -44, 36), box(0, 0, 50, 62), SKIN, { strength: 0.6 })
    crepe(c, r, oval(-30, 20, 12, 9), box(-30, 20, 12, 9), '#e79a86', { strength: 0.5 })
    crepe(c, r, oval(30, 20, 12, 9), box(30, 20, 12, 9), '#e79a86', { strength: 0.5 })
    fringe(c, r, [34, -54], [-34, -54], 18, '#f4f0ea', { w: 8, spread: 0.6 })
  }),
  nose: sprite('nose', -24, -22, 48, 44, (c, r) => crepe(c, r, oval(0, 0, 19, 16), box(0, 0, 20, 18), '#e59c86')),
  moustache: sprite('moustache', -70, -16, 140, 70, (c, r) => { fringe(c, r, [-44, 2], [2, -4], 40, '#f4f0ea', { w: 10, lean: -0.5, spread: -0.5 }); fringe(c, r, [-2, -4], [44, 2], 40, '#fffaf2', { w: 10, lean: 0.5, spread: -0.5 }) }),
  slipper: sprite('slipper', -34, -26, 68, 44, (c, r) => { crepe(c, r, blob(-26, 8, -24, -14, 0, -20, 24, -14, 28, 8, 0, 14), box(0, -2, 30, 20), '#b5693f'); rosette(c, r, 0, -12, 10, 8, CREAM, 2) }),
  catHead: sprite('cat-head', -86, -84, 172, 150, (c, r) => {
    for (const s of [-1, 1]) { crepe(c, r, poly(s * 54, -14, s * 52, -70, s * 12, -42), box(s * 34, -40, 26, 32), FUR); crepe(c, r, poly(s * 46, -26, s * 46, -54, s * 24, -40), box(s * 36, -40, 12, 16), '#d9a0a6') }
    crepe(c, r, oval(0, 0, 62, 48), box(0, 0, 62, 48), FUR)
    fringe(c, r, [-58, 4], [-34, 40], 22, FUR, { w: 8, lean: 0.4 })
    fringe(c, r, [34, 40], [58, 4], 22, FUR, { w: 8, lean: -0.4 })
    fringe(c, r, [-22, -40], [22, -40], 22, darker(FUR, 0.25), { w: 8, spread: -0.5 })
    crepe(c, r, oval(-13, 22, 17, 13), box(-13, 22, 17, 13), CREAM, { strength: 0.6 })
    crepe(c, r, oval(13, 22, 17, 13), box(13, 22, 17, 13), CREAM, { strength: 0.6 })
    crepe(c, r, poly(-8, 8, 8, 8, 0, 17), box(0, 12, 8, 5), '#d98a92')
  }),
  paw: sprite('paw', -24, -16, 48, 34, (c, r) => crepe(c, r, oval(0, 0, 21, 14), box(0, 0, 21, 14), CREAM)),
  giraffeHead: sprite('giraffe-head', -70, -84, 160, 150, (c, r) => {
    for (const x of [-20, 6]) { wire(c, [[x, -26], [x - 4, -62]], 8, HIDE); rosette(c, r, x - 4, -66, 11, 11, RUST, 2) }
    crepe(c, r, oval(-46, -18, 22, 11, -0.5), box(-46, -18, 22, 16), HIDE)
    crepe(c, r, blob(-36, -24, -10, -38, 24, -26, 74, 4, 80, 28, 60, 42, 20, 34, -24, 26), box(20, 0, 62, 44), HIDE)
    crepe(c, r, oval(60, 22, 26, 22, 0.2), box(60, 22, 28, 24), '#e0b98a')
    c.fillStyle = '#5a3a2a'
    c.beginPath(); c.ellipse(66, 12, 4, 6, 0.3, 0, 7); c.ellipse(50, 10, 4, 6, 0.3, 0, 7); c.fill()
    fringe(c, r, [-30, -32], [8, -38], 18, RUST, { w: 7, lean: 0.4 })
  }),
  star: sprite('star', -44, -44, 88, 88, (c, r) => {
    const pts: P[] = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, k = i % 2 ? 15 : 36; return [Math.cos(a) * k, Math.sin(a) * k] as const })
    crepe(c, r, (q) => { q.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) q.lineTo(p[0], p[1]); q.closePath() }, box(0, 0, 38), '#f2d98c')
    wire(c, pts, 5, '#c9a13f', true)
  }),
  mouse: sprite('mouse', -56, -56, 112, 92, (c, r) => {
    wire(c, [[-26, 18], [-44, 22], [-52, 8]], 5, '#cf9aa0')
    for (const x of [8, 30]) { crepe(c, r, oval(x, -30, 15, 17), box(x, -30, 15, 17), '#a3a0a8'); crepe(c, r, oval(x + 1, -28, 9, 10), box(x, -28, 9, 10), '#e3aeb2') }
    crepe(c, r, blob(-32, 22, -34, -4, -8, -22, 22, -20, 44, 2, 40, 16, 14, 26), box(4, 2, 42, 26), '#a3a0a8')
    c.fillStyle = '#2a2430'
    c.beginPath(); c.arc(24, -4, 5, 0, 7); c.fill()
    c.fillStyle = '#d98a92'
    c.beginPath(); c.arc(45, 6, 6, 0, 7); c.fill()
  }),
  cheese: sprite('cheese', -52, -52, 104, 92, (c, r) => {
    grounded(c, 0, 30, 44, 8)
    crepe(c, r, poly(-42, 30, -42, -6, 34, -38, 44, 30), box(0, -2, 44, 36), '#f0c552')
    c.fillStyle = '#c9952c'
    for (const [x, y, s] of [[-20, 12, 8], [12, -8, 9], [22, 18, 7]] as const) { c.beginPath(); c.ellipse(x, y, s, s * 0.9, 0, 0, 7); c.fill() }
  }),
  bitten: sprite('bitten', -52, -52, 104, 92, (c, r) => {
    grounded(c, 0, 30, 44, 8)
    crepe(c, r, (q) => { q.moveTo(-42, 30); q.lineTo(-42, -6); q.lineTo(-4, -22); q.quadraticCurveTo(2, 4, 22, -2); q.quadraticCurveTo(24, 16, 43, 14); q.lineTo(44, 30); q.closePath() }, box(0, -2, 44, 36), '#f0c552')
  }),
  ghostHand: sprite('ghost-hand', -40, -14, 80, 110, (c) => {
    c.fillStyle = 'rgba(255,252,244,0.97)'
    c.strokeStyle = '#6b4a4a'
    c.lineWidth = 3.4
    c.lineJoin = 'round'
    c.beginPath()
    c.moveTo(-9, 6); c.quadraticCurveTo(-9, -8, 0, -8); c.quadraticCurveTo(9, -8, 9, 6); c.lineTo(9, 34)
    c.quadraticCurveTo(24, 30, 25, 44); c.quadraticCurveTo(35, 44, 34, 56); c.quadraticCurveTo(36, 82, 16, 90); c.lineTo(-10, 90)
    c.quadraticCurveTo(-24, 78, -34, 54); c.quadraticCurveTo(-32, 42, -20, 48); c.lineTo(-9, 58)
    c.closePath(); c.fill(); c.stroke()
  }),
  moth: sprite('moth', -34, -26, 68, 52, (c, r) => { for (const s of [-1, 1]) crepe(c, r, frilled(s * 15, -4, 15, 17, 5, 2), box(s * 15, -4, 17, 19), '#cbbba6'); wire(c, [[0, -14], [0, 16]], 7, '#6b5b4e') }),
  puff: sprite('puff', -30, -30, 60, 60, (c) => { c.fillStyle = 'rgba(255,250,236,0.8)'; for (const [x, y, s] of [[0, 0, 16], [-14, 6, 10], [14, 5, 11], [3, -14, 11]] as const) { c.beginPath(); c.arc(x, y, s, 0, 7); c.fill() } }),
}

const perPaper = (make: (p: Paper) => Sprite): Record<Paper, Sprite> => ({ 0: make(0), 1: make(1), 2: make(2) })
export const BOWS = perPaper((p) => sprite(`bow-${p}`, -64, -52, 128, 112, (c, r) => {
  const k = PAPER[p]
  for (const s of [-1, 1]) crepe(c, r, poly(0, 0, s * 34, 48, s * 20, 46, s * 12, 54), box(s * 18, 28, 20, 30), k.bowDeep)
  for (const s of [-1, 1]) { crepe(c, r, blob(0, 0, s * 24, -34, s * 54, -32, s * 56, 4, s * 26, 14), box(s * 30, -10, 32, 28), k.bow, { along: 0.2 * s }); crepe(c, r, oval(s * 34, -12, 13, 9, -s * 0.3), box(s * 34, -12, 13, 10), k.bowDeep) }
  rosette(c, r, 0, -2, 19, 18, k.bow, 2, k.bowDeep)
}))
export const SCRAPS = perPaper((p) => sprite(`scrap-${p}`, -34, -26, 68, 52, (c, r) => {
  crepe(c, r, blob(-26, 6, -22, -12, -4, -8, 8, -18, 26, -6, 22, 10, 4, 6, -8, 16), box(0, 0, 28, 20), PAPER[p].main, { gap: 3 })
  crepe(c, r, poly(-26, 6, -16, -2, -6, 14), box(-16, 6, 10, 9), PAPER[p].under)
}))
export const ROLL = perPaper((p) => sprite(`roll-${p}`, -56, -74, 112, 140, (c, r) => {
  const k = PAPER[p]
  grounded(c, 0, 52, 44, 11)
  crepe(c, r, (q) => { q.moveTo(-38, -44); q.lineTo(-38, 46); q.quadraticCurveTo(0, 62, 38, 46); q.lineTo(38, -44); q.closePath() }, box(0, 4, 40, 58), k.main)
  crepe(c, r, oval(0, -44, 38, 15), box(0, -44, 38, 16), k.light, { along: 0 })
  c.strokeStyle = k.deep
  c.lineWidth = 2
  for (const q of [0.72, 0.46]) { c.beginPath(); c.ellipse(0, -44, 38 * q, 15 * q, 0, 0, 7); c.stroke() }
  c.fillStyle = '#6b4a3a'
  c.beginPath(); c.ellipse(0, -44, 9, 4, 0, 0, 7); c.fill()
  fringe(c, r, [-36, 44], [36, 44], 11, k.light, { w: 8 })
}))

// --- The family -------------------------------------------------------------------

const kinHead = (name: string, paint: Sprite['paint']): Sprite => sprite(name, -76, -90, 152, 150, paint)
export const KIN = {
  aunt: {
    head: kinHead('aunt-head', (c, r) => {
      for (const [x, y] of [[-40, -38], [-14, -56], [16, -56], [42, -36]] as const) rosette(c, r, x, y, 22, 19, '#c96f4a', 2)
      crepe(c, r, oval(0, 0, 44, 46), box(0, 0, 44, 46), SKIN, { strength: 0.6 })
      for (const s of [-1, 1]) crepe(c, r, oval(s * 26, 14, 10, 8), box(s * 26, 14, 10, 8), '#e2857c', { strength: 0.5 })
    }),
    body: sprite('aunt-body', -100, -196, 200, 206, (c, r) => {
      crepe(c, r, (q) => { q.moveTo(-34, -176); q.lineTo(34, -176); q.quadraticCurveTo(84, -90, 92, -12); for (let i = 0; i <= 12; i++) q.lineTo(92 - (184 * i) / 12, -10 + (i % 2 ? 8 : -4)); q.quadraticCurveTo(-84, -90, -34, -176); q.closePath() }, box(0, -90, 94, 96), '#8d4f86')
      fringe(c, r, [-84, -44], [84, -44], 34, '#b06fa6', { w: 11, spread: -0.4 })
    }),
  },
  boy: {
    head: kinHead('boy-head', (c, r) => {
      fringe(c, r, [34, -26], [-34, -26], 30, '#8a5a34', { w: 9, spread: 0.8 })
      crepe(c, r, oval(0, 0, 38, 38), box(0, 0, 38, 38), '#d9a37c', { strength: 0.6 })
      fringe(c, r, [-30, -34], [30, -34], 16, '#8a5a34', { w: 8, spread: -0.4 })
    }),
    body: sprite('boy-body', -60, -110, 120, 120, (c, r) => {
      crepe(c, r, blob(-28, -96, 28, -96, 40, -30, 34, -8, -34, -8, -40, -30), box(0, -52, 40, 46), '#5f8a6a')
      for (const x of [-18, 18]) crepe(c, r, rounded(x - 14, -14, 28, 20, 8), box(x, -4, 14, 10), '#6b4a34')
    }),
  },
  dog: {
    head: kinHead('dog-head', (c, r) => {
      crepe(c, r, oval(0, 0, 38, 34), box(0, 0, 38, 34), '#e0d2ba')
      fringe(c, r, [-40, -22], [-24, -30], 46, '#8a6a4c', { w: 10 })
      fringe(c, r, [24, -30], [40, -22], 46, '#8a6a4c', { w: 10 })
      crepe(c, r, oval(0, 14, 22, 16), box(0, 14, 22, 16), lighter('#e0d2ba', 0.4))
      crepe(c, r, oval(0, 6, 10, 7), box(0, 6, 10, 7), '#3a2a2c')
    }),
    body: sprite('dog-body', -70, -90, 140, 100, (c, r) => {
      for (const x of [-34, -12, 14, 36]) crepe(c, r, rounded(x - 9, -34, 18, 36, 8), box(x, -16, 9, 18), '#d0c0a6')
      crepe(c, r, blob(-52, -36, -46, -68, 0, -76, 46, -68, 52, -36, 0, -22), box(0, -48, 54, 28), '#e0d2ba')
      fringe(c, r, [-46, -44], [46, -44], 24, '#e0d2ba', { w: 9, spread: -0.4 })
    }),
  },
} as const

export function tail(c: Ctx, pts: readonly P[]): void { wire(c, pts, 17, FUR) }
