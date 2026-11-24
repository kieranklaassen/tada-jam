import { animalOf, partOf, type Animal, type End, type Who } from './ends'
import { CLOTHS, blob, button, oval, path, run, sew, type Album, type Ctx, type ClothName, type Picture } from './stitch'

// The cloth pieces of the eight ends and of the goose and the bear. Every
// piece is sewn facing right, round the point it hangs or turns from.

const cloth = (end: End): ClothName => animalOf(end)

/** Yarn: a row of loops. */
function yarn(ctx: Ctx, points: readonly (readonly [number, number])[], colour: string, dark: string, r: number): void {
  for (const pass of [0, 1]) for (const [x, y] of points) {
    ctx.strokeStyle = pass ? colour : dark
    ctx.lineWidth = pass ? r * 0.5 : r * 0.8
    ctx.beginPath(); ctx.arc(x, y, r * 0.75, 0, Math.PI * 2); ctx.stroke()
  }
}
function zigzag(ctx: Ctx, from: [number, number], to: [number, number], n: number, height: number, fill: string, edge: string): void {
  const dx = (to[0] - from[0]) / n, dy = (to[1] - from[1]) / n, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l
  const p = path((one) => {
    one.moveTo(from[0], from[1])
    for (let i = 0; i < n; i++) {
      one.lineTo(from[0] + dx * (i + 0.5) + nx * height, from[1] + dy * (i + 0.5) + ny * height)
      one.lineTo(from[0] + dx * (i + 1), from[1] + dy * (i + 1))
    }
    one.closePath()
  })
  ctx.fillStyle = fill
  ctx.fill(p)
  ctx.strokeStyle = edge
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.stroke(p)
}

// --- The barrel -------------------------------------------------------------

function barrel(ctx: Ctx, end: End): void {
  const head = partOf(end) === 'head', name = cloth(end)
  const wide = animalOf(end) === 'elephant' && !head ? 124 : head ? 100 : 108
  const shape = head
    ? blob([[-80, -96], [-70, -97], [0, -100], [70, -84], [wide, -30], [96, 34], [52, 84], [-10, 94], [-72, 94], [-80, 92], [-82, 0]], 0.95)
    : blob([[-80, -95], [-70, -96], [0, -98], [60, -100], [wide - 8, -52], [wide, 10], [80, 78], [10, 96], [-72, 95], [-80, 93], [-82, 0]], 0.95)
  sew(ctx, shape, name, { pad: 26, stitch: 9 })
  // Two lines of quilting.
  ctx.globalAlpha = 0.55
  for (const x of [-34, 18]) run(ctx, path((p) => { p.moveTo(x, -90); p.quadraticCurveTo(x + (head ? 22 : 16), 0, x, 88) }), CLOTHS[name].edge, 2, [7, 8])
  ctx.globalAlpha = 1
  if (!head) {
    // A rump is a pocket with a patch on it.
    sew(ctx, oval(52, -14, 46, 54, -0.15), name, { pad: 16, stitch: 7, drop: 3 })
    if (animalOf(end) === 'horse') sew(ctx, path((p) => p.roundRect(30, -34, 40, 40, 5)), 'denim', { pad: 8, stitch: 6, drop: 2 })
    if (animalOf(end) === 'elephant') { button(ctx, 52, -14, 13, '#f4c95d', '#8c6a1b') }
    if (animalOf(end) === 'hen') for (const [x, y] of [[40, -40], [64, -8], [34, 8]]) sew(ctx, path((p) => { p.moveTo(x - 18, y - 8); p.lineTo(x + 18, y - 8); p.quadraticCurveTo(x + 16, y + 20, x, y + 26); p.quadraticCurveTo(x - 16, y + 20, x - 18, y - 8) }), name, { pad: 8, stitch: 5, drop: 2, edge: 2 })
  } else if (animalOf(end) === 'hen') {
    sew(ctx, blob([[-40, -20], [10, -34], [34, 0], [10, 38], [-30, 44], [-62, 24]]), name, { pad: 14, stitch: 7, drop: 4 })
  } else if (animalOf(end) === 'croc') {
    sew(ctx, blob([[96, -30], [100, 20], [60, 78], [10, 90], [44, 40], [58, -20]]), 'bale', { pad: 12, stitch: 6, drop: 0 })
  }
}

/** The slit its performer looks out of: two eyes and a nose. */
function peep(ctx: Ctx, who: Who, shut: boolean): void {
  sew(ctx, oval(0, 0, 44, 27), 'dark', { pad: 8, stitch: 0, drop: 0, edge: 3 })
  ctx.save()
  ctx.clip(oval(0, 0, 42, 25))
  ctx.fillStyle = who === 0 ? '#fbf7ee' : '#8b5a3a'
  ctx.beginPath(); ctx.ellipse(2, 18, 40, 32, 0, 0, 7); ctx.fill()
  for (const x of [-15, 15]) {
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#33231c'
    ctx.lineWidth = 2.4
    if (shut) {
      ctx.beginPath(); ctx.arc(x, -2, 9, 0.25, Math.PI - 0.25); ctx.stroke()
      continue
    }
    ctx.beginPath(); ctx.ellipse(x, -3, 10, who === 0 ? 12 : 10, 0, 0, 7); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#2a1c16'
    ctx.beginPath(); ctx.arc(x + (who === 0 ? 3 : 1), who === 0 ? -2 : 2, who === 0 ? 5 : 4.4, 0, 7); ctx.fill()
    if (who === 1) {
      // His lids are always half down.
      ctx.fillStyle = '#7a4c2f'
      ctx.beginPath(); ctx.ellipse(x, -3, 10.5, 10.5, 0, Math.PI, Math.PI * 2); ctx.fill()
    } else {
      ctx.beginPath(); ctx.moveTo(x - 8, -13); ctx.lineTo(x - 13, -20); ctx.moveTo(x + 1, -15); ctx.lineTo(x - 2, -22); ctx.stroke()
    }
  }
  ctx.restore()
  if (who === 0) sew(ctx, blob([[-9, 7], [0, 3], [10, 7], [14, 18], [0, 24], [-12, 18]]), 'orange', { pad: 6, stitch: 0, drop: 2, edge: 2 })
  else sew(ctx, oval(0, 14, 12, 8), 'dark', { pad: 5, stitch: 0, drop: 1, edge: 2 })
}

// --- Legs ---------------------------------------------------------------------

function leg(ctx: Ctx, end: End, who: Who): void {
  // From the hip down: a trouser of the costume, then what is inside it.
  if (who === 0) {
    sew(ctx, path((p) => { p.moveTo(-6, 50); p.lineTo(6, 50); p.lineTo(7, 104); p.lineTo(-7, 104); p.closePath() }), 'orange', { pad: 8, stitch: 0, drop: 0 })
    sew(ctx, blob([[-12, 100], [8, 98], [26, 108], [44, 106], [40, 116], [46, 124], [14, 125], [-14, 122]], 0.9), 'orange', { pad: 8, stitch: 4, drop: 3 })
    run(ctx, path((p) => { p.moveTo(14, 106); p.lineTo(30, 120); p.moveTo(24, 108); p.lineTo(40, 112) }), '#a35a0c', 2, [4, 4])
  } else {
    sew(ctx, path((p) => p.roundRect(-18, 40, 36, 72, 12)), 'bear', { pad: 12, stitch: 0, drop: 0 })
    sew(ctx, blob([[-22, 100], [8, 92], [34, 102], [42, 116], [30, 126], [-18, 126]], 0.95), 'bear', { pad: 12, stitch: 6, drop: 3 })
    for (const x of [20, 29, 37]) { ctx.fillStyle = '#3b2415'; ctx.beginPath(); ctx.ellipse(x, 119 - (x === 37 ? 2 : 0), 3, 4.6, 0, 0, 7); ctx.fill() }
  }
  const w = who === 0 ? 22 : 27
  sew(ctx, path((p) => { p.moveTo(-w, -16); p.quadraticCurveTo(0, -30, w, -16); p.lineTo(w + 3, 66); p.quadraticCurveTo(0, 76, -w - 3, 66); p.closePath() }), cloth(end), { pad: 14, stitch: 7, drop: 3 })
}

// --- Heads: from where the neck is sewn on ----------------------------------------

function horseHead(ctx: Ctx): void {
  yarn(ctx, [[-30, 10], [-32, -14], [-30, -38], [-24, -62], [-14, -86], [0, -108], [16, -126]], '#8d5a32', '#54331b', 15)
  sew(ctx, blob([[-38, 40], [-30, -10], [-10, -78], [26, -118], [64, -104], [52, -50], [44, 0], [36, 46]], 0.9), 'horse', { pad: 20 })
  sew(ctx, blob([[20, -128], [28, -158], [44, -126]], 0.9), 'horse', { pad: 8, stitch: 5 })
  sew(ctx, blob([[8, -104], [34, -132], [72, -126], [128, -84], [140, -54], [118, -38], [72, -58], [22, -64]], 0.9), 'horse', { pad: 18 })
  sew(ctx, blob([[104, -100], [140, -70], [144, -44], [118, -36], [92, -50], [92, -84]], 0.9), 'cow', { pad: 12, stitch: 6, drop: 0 })
  button(ctx, 124, -66, 7, '#e8a885', '#8a5a45')
  yarn(ctx, [[34, -136], [48, -128], [60, -120], [44, -116]], '#8d5a32', '#54331b', 11)
  eye(ctx, 58, -96, 15)
}
function horseJaw(ctx: Ctx): void {
  sew(ctx, blob([[-8, -6], [38, 4], [46, 16], [30, 24], [0, 12]], 0.9), 'cow', { pad: 8, stitch: 5 })
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#b9a98f'; ctx.lineWidth = 1.6
  for (const x of [20, 31]) { ctx.beginPath(); ctx.roundRect(x, -6, 11, 13, 3); ctx.fill(); ctx.stroke() }
}
function henHead(ctx: Ctx): void {
  for (const [x, y, r] of [[-2, -124, 20], [24, -136, 22], [50, -126, 19]]) sew(ctx, oval(x, y, r * 0.8, r), 'red', { pad: 10, stitch: 5 })
  sew(ctx, blob([[-40, 42], [-28, -30], [-16, -86], [26, -118], [68, -96], [72, -52], [50, 0], [38, 46]], 0.95), 'hen', { pad: 22 })
  sew(ctx, blob([[64, -92], [104, -78], [124, -60], [98, -54], [62, -56]], 0.9), 'orange', { pad: 10, stitch: 5 })
  eye(ctx, 36, -78, 17)
}
function henJaw(ctx: Ctx): void {
  sew(ctx, blob([[-4, 6], [8, 30], [-4, 44], [-16, 28]], 1), 'red', { pad: 8, stitch: 4 })
  sew(ctx, blob([[-8, -8], [34, -2], [42, 6], [18, 14], [-8, 12]], 0.9), 'orange', { pad: 8, stitch: 4 })
}
function elephantHead(ctx: Ctx): void {
  sew(ctx, blob([[-44, 44], [-34, -40], [10, -112], [72, -116], [112, -70], [104, -14], [60, 20], [34, 48]], 0.95), 'elephant', { pad: 26 })
  sew(ctx, blob([[70, 4], [96, 8], [122, 36], [112, 42], [78, 26]], 0.9), 'cow', { pad: 8, stitch: 4 })
  eye(ctx, 78, -62, 15)
}
function elephantEar(ctx: Ctx): void {
  sew(ctx, blob([[6, -54], [-40, -70], [-84, -38], [-84, 26], [-44, 58], [2, 34]], 0.95), 'elephant', { pad: 18 })
  sew(ctx, blob([[-4, -36], [-40, -48], [-68, -22], [-66, 22], [-38, 40], [-6, 20]], 0.95), 'pink', { pad: 12, stitch: 6, drop: 0 })
}
function crocHead(ctx: Ctx): void {
  sew(ctx, blob([[-40, 42], [-34, -20], [-10, -66], [40, -78], [60, -40], [40, 10], [34, 46]], 0.95), 'croc', { pad: 22 })
  zigzag(ctx, [174, -42], [44, -26], 8, 17, '#fffdf2', '#b9b39c')
  sew(ctx, blob([[0, -30], [8, -76], [44, -90], [86, -72], [150, -68], [184, -58], [180, -40], [110, -34], [40, -24]], 0.9), 'croc', { pad: 16 })
  sew(ctx, oval(36, -90, 24, 22), 'croc', { pad: 12, stitch: 5 })
  eye(ctx, 38, -92, 14)
  for (const x of [158, 172]) { ctx.fillStyle = '#0f4630'; ctx.beginPath(); ctx.ellipse(x, -61, 4.5, 3.4, 0, 0, 7); ctx.fill() }
  for (const [x, y] of [[-34, -34], [-22, -58], [-2, -76]]) zigzag(ctx, [x - 10, y + 10], [x + 8, y - 10], 1, -18, '#f2c14a', '#93701f')
}
function crocJaw(ctx: Ctx): void {
  zigzag(ctx, [16, 0], [134, -4], 8, -16, '#fffdf2', '#b9b39c')
  sew(ctx, blob([[-14, -8], [40, 0], [138, -6], [146, 8], [110, 22], [30, 30], [-14, 22]], 0.9), 'croc', { pad: 14 })
}
/** A felt white for an eye; the button on it is stamped by itself, since it looks about. */
function eye(ctx: Ctx, x: number, y: number, r: number): void {
  sew(ctx, oval(x, y, r * 1.35, r * 1.35), 'goose', { pad: 6, stitch: 0, drop: 2, edge: 2 })
}
/** Where each head's eye is, and how big. */
export const EYES: readonly { x: number; y: number; r: number }[] = [{ x: 58, y: -96, r: 13 }, { x: 36, y: -78, r: 15 }, { x: 78, y: -62, r: 13 }, { x: 38, y: -92, r: 12 }]
/** Where each head's jaw hangs. */
export const JAWS: readonly ({ x: number; y: number } | null)[] = [{ x: 82, y: -52 }, { x: 66, y: -54 }, null, { x: 38, y: -26 }]
/** Where a head is sewn on, and where a tail is, from the middle of the barrel. */
export const NECK = { x: 58, y: -34 }
export const RUMP = { x: 88, y: -34 }
export const TRUNK = { x: 104, y: -50 }

// --- Tails: from the root ---------------------------------------------------------

function tail(ctx: Ctx, animal: Animal): void {
  switch (animal) {
    case 'horse':
      for (let i = 0; i < 7; i++) {
        const bend = 14 + i * 7
        for (const pass of [0, 1]) {
          ctx.strokeStyle = pass ? (i % 2 ? '#8d5a32' : '#a36d40') : '#54331b'
          ctx.lineWidth = pass ? 8 : 12
          ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(bend, -30, bend + 22, 40, bend - 8 + i * 2, 112 + (i % 3) * 14); ctx.stroke()
        }
      }
      sew(ctx, oval(12, -2, 18, 13), 'red', { pad: 8, stitch: 4 })
      break
    case 'hen':
      for (const [turn, name] of [[-1.35, 'red'], [-0.95, 'orange'], [-0.55, 'hen'], [-0.15, 'red']] as const) {
        ctx.save(); ctx.rotate(turn)
        sew(ctx, blob([[0, -13], [50, -22], [94, -14], [102, 8], [60, 20], [0, 13]], 1), name, { pad: 12, stitch: 6 })
        ctx.restore()
      }
      break
    case 'elephant':
      sew(ctx, blob([[-4, -10], [28, 0], [40, 50], [36, 92], [26, 92], [26, 52], [16, 18], [-6, 10]], 0.9), 'elephant', { pad: 8, stitch: 4 })
      yarn(ctx, [[30, 98], [24, 110], [36, 110], [30, 120]], '#50397e', '#36255a', 10)
      break
    case 'croc':
      for (const [x, y] of [[14, -46], [50, -34], [86, -8], [116, 24]]) zigzag(ctx, [x - 13, y + 4], [x + 15, y + 8], 1, -22, '#f2c14a', '#93701f')
      sew(ctx, blob([[-26, -48], [40, -36], [104, 10], [150, 64], [140, 70], [84, 56], [20, 46], [-26, 40]], 0.95), 'croc', { pad: 16 })
  }
}

// --- The pictures -------------------------------------------------------------------

export class Wardrobe {
  constructor(private readonly album: Album) {}
  barrel(end: End): Picture { return this.album.get(`barrel${end}`, [-100, -118, 240, 232], (ctx) => barrel(ctx, end)) }
  peep(who: Who, shut: boolean): Picture { return this.album.get(`peep${who}${shut}`, [-52, -36, 104, 76], (ctx) => peep(ctx, who, shut)) }
  leg(end: End, who: Who): Picture { return this.album.get(`leg${animalOf(end)}${who}`, [-40, -36, 96, 172], (ctx) => leg(ctx, end, who)) }
  head(end: End): Picture { return this.album.get(`head${end}`, [-66, -176, 272, 240], (ctx) => [horseHead, henHead, elephantHead, crocHead][end](ctx)) }
  jaw(end: End): Picture { return this.album.get(`jaw${end}`, [-30, -30, 190, 90], (ctx) => [horseJaw, henJaw, () => {}, crocJaw][end](ctx)) }
  ear(): Picture { return this.album.get('ear', [-104, -90, 130, 170], elephantEar) }
  tail(end: End): Picture { return this.album.get(`tail${end}`, [-60, -120, 230, 290], (ctx) => tail(ctx, animalOf(end))) }
  pupil(): Picture { return this.album.get('pupil', [-12, -12, 24, 25], (ctx) => button(ctx, 0, 0, 10, '#3a2b27', '#0f0a09')) }
  /** The whole end, small, as it hangs on its peg. */
  hung(end: End): Picture {
    return this.album.get(`hung${end}`, [-62, -52, 160, 110], (ctx) => {
      ctx.save()
      if (partOf(end) === 'head') {
        ctx.translate(-18, 22); ctx.scale(0.43, 0.43)
        if (animalOf(end) === 'croc') ctx.translate(-32, -8)
        ctx.lineWidth = 1
        this.headParts(ctx, end)
      } else {
        ctx.translate(-16, 4); ctx.scale(0.4, 0.4)
        ctx.save(); ctx.translate(RUMP.x, RUMP.y); tail(ctx, animalOf(end)); ctx.restore()
        barrel(ctx, end)
      }
      ctx.restore()
    })
  }
  private headParts(ctx: Ctx, end: End): void {
    const jaw = JAWS[end]
    if (jaw) { ctx.save(); ctx.translate(jaw.x, jaw.y); ctx.rotate(0.08); [horseJaw, henJaw, () => {}, crocJaw][end](ctx); ctx.restore() }
    ;[horseHead, henHead, elephantHead, crocHead][end](ctx)
    if (end === 2) {
      ctx.save(); ctx.translate(26, -50); elephantEar(ctx); ctx.restore()
      sew(ctx, blob([[84, -66], [120, -40], [126, 10], [112, 44], [96, 40], [104, 4], [84, -22]], 0.9), 'elephant', { pad: 10, stitch: 5 })
    }
    const e = EYES[end]
    button(ctx, e.x + 2, e.y, e.r * 0.8, '#3a2b27', '#0f0a09')
  }
  /** What is inside, between two costumes: in spotted pants. */
  bare(who: Who): Picture {
    return this.album.get(`bare${who}`, [-120, -330, 240, 340], (ctx) => {
      if (who === 0) {
        sew(ctx, blob([[-70, -190], [-96, -150], [-60, -84], [30, -78], [72, -130], [50, -190], [0, -200]], 0.95), 'goose', { pad: 26 })
        sew(ctx, blob([[14, -170], [12, -240], [24, -300], [58, -300], [64, -262], [46, -220], [54, -160]], 0.95), 'goose', { pad: 14 })
        sew(ctx, blob([[56, -292], [96, -280], [98, -268], [58, -262]], 0.9), 'orange', { pad: 8, stitch: 4 })
        sew(ctx, blob([[-60, -170], [-30, -176], [10, -140], [-40, -124], [-84, -142]], 0.95), 'goose', { pad: 12 })
        button(ctx, 44, -284, 6, '#3a2b27', '#0f0a09')
        pants(ctx, 0)
        for (const x of [-26, 16]) { ctx.save(); ctx.translate(x, -125); leggy(ctx, 'orange', 8); ctx.restore() }
      } else {
        sew(ctx, blob([[-84, -180], [-92, -110], [-50, -70], [46, -70], [88, -110], [80, -180], [0, -214]], 0.95), 'bear', { pad: 28 })
        for (const x of [-44, 44]) sew(ctx, oval(x, -300, 18, 18), 'bear', { pad: 10, stitch: 5 })
        sew(ctx, oval(0, -258, 66, 58), 'bear', { pad: 22 })
        sew(ctx, oval(0, -238, 30, 22), 'wood', { pad: 10, stitch: 5, drop: 0 })
        sew(ctx, oval(0, -250, 12, 8), 'dark', { pad: 4, stitch: 0, drop: 0 })
        for (const x of [-24, 24]) button(ctx, x, -270, 6, '#3a2b27', '#0f0a09')
        pants(ctx, 1)
        for (const x of [-32, 32]) { ctx.save(); ctx.translate(x, -125); leggy(ctx, 'bear', 18); ctx.restore() }
      }
    })
  }
}
function pants(ctx: Ctx, who: Who): void {
  const w = who === 0 ? 58 : 80
  sew(ctx, path((p) => { p.moveTo(-w, -118); p.lineTo(w, -118); p.lineTo(w - 4, -46); p.lineTo(8, -46); p.lineTo(0, -66); p.lineTo(-8, -46); p.lineTo(-w + 4, -46); p.closePath() }), 'pants', { pad: 14, stitch: 6 })
}
function leggy(ctx: Ctx, name: ClothName, w: number): void {
  sew(ctx, path((p) => p.roundRect(-w, 76, w * 2, 40, w * 0.6)), name, { pad: 8, stitch: 0, drop: 0 })
  sew(ctx, blob([[-w - 4, 108], [w, 104], [w + 22, 116], [w + 10, 126], [-w - 4, 125]], 0.9), name, { pad: 8, stitch: 4 })
}
