import type { Coat, Guest } from './rules'
import { GOLD, INK, blob, cell, clamp, dye, gutta, limb, line, mix, soft, type G } from './silk'
import type { Pose } from './motion'
import { step, type Box, type Stamp } from './stamps'

// The four guests, each drawn up from its seat at the origin and facing the
// aunt (-x). A coat tints every dye of the body and adds its own marks.

export type Look = { x: number; y: number }
type Paint = (colour: string) => string

const TINT: Record<Coat, Paint> = {
  clean: (c) => c,
  wet: (c) => mix(c, '#2f78c9', 0.38),
  gluey: (c) => mix(c, '#fffdf4', 0.72),
  feathered: (c) => mix(c, '#fff4dc', 0.28),
  puffed: (c) => mix(c, '#ffffff', 0.14),
  stiff: (c) => mix(mix(c, '#d9cdb4', 0.8), '#9a8f86', 0.18),
  bubble: (c) => mix(c, '#b9f0ff', 0.14),
}

const BOX: Box = [-136, -286, 272, 332]
const MARKED: readonly Coat[] = ['wet', 'gluey', 'feathered']

/** A guest in its seat, as the picture `name`. What the body does as a whole is moved; the face and the coat are painted. */
export function paintGuest(g: G, name: string, guest: Guest, coat: Coat, pose: Pose, look: Look, time: number, asking: number, cup: number, put: Stamp): void {
  const { x, y, turn, sx, sy, ...face } = pose
  const how = [step(face.mouth, 0.2), step(face.open, 0.15), step(face.eyes, 0.15), step(face.brow, 0.25), step(face.part, 0.14), step(face.blush, 1), step(look.x, 0.3), step(look.y, 0.3), step(asking, 0.12), cup, MARKED.includes(coat) ? Math.floor(time * 7) : 0].join()
  g.save()
  g.translate(x, y - 100)
  g.rotate(turn)
  g.translate(0, 100)
  g.scale(sx, sy)
  put(g, name, BOX, guest + coat, how, (g) => body(g, guest, coat, pose, look, time, asking, cup))
  if (coat === 'bubble') {
    const w = 1 + Math.sin(time * 2.3) * 0.02
    g.translate(0, -104)
    g.scale(w, 1 / w)
    put(g, 'bubble', [-140, -140, 280, 280], '', '', bubble)
  }
  g.restore()
}

function body(g: G, guest: Guest, coat: Coat, pose: Pose, look: Look, time: number, asking: number, cup: number): void {
  const p = TINT[coat]
  if (coat === 'feathered') plumes(g, guest, time, true)
  if (coat === 'puffed') fuzz(g, guest, p)
  if (guest === 'walrus') walrus(g, p, pose, look, asking, cup)
  else if (guest === 'dog') dog(g, p, pose, look, asking)
  else if (guest === 'goose') goose(g, p, pose, look, asking)
  else pig(g, p, pose, look, asking)
  if (coat === 'feathered') plumes(g, guest, time, false)
  if (coat === 'gluey') drips(g, time)
  if (coat === 'wet') drops(g, time)
  if (coat === 'stiff') cracks(g)
}

type Head = { x: number; y: number; eyes: number; gap: number; r: number }

/** Two eyes with brows: the pupils follow whatever is looked at. */
function eyes(g: G, at: Head, pose: Pose, look: Look, brow: string): void {
  const open = clamp(pose.eyes, 0.04, 1.4)
  for (const s of [-1, 1]) {
    const x = at.x + s * at.gap
    blob(g, x, at.y, at.r, at.r * 1.15 * open)
    cell(g, '#fffdf6', 3)
    if (open > 0.3) {
      blob(g, x + clamp(look.x, -1, 1) * at.r * 0.42, at.y + clamp(look.y, -1, 1) * at.r * 0.42 * open, at.r * 0.5, at.r * 0.56 * Math.min(1, open))
      g.fillStyle = INK
      g.fill()
    }
    const by = at.y - at.r * 1.5 - pose.brow * 5
    line(g, [[x - at.r, by + s * pose.brow * -5 * (pose.brow < 0 ? 1 : 0.2)], [x + at.r, by + s * pose.brow * 5 * (pose.brow < 0 ? 1 : 0.2)]], brow, 5)
  }
}

function mouth(g: G, x: number, y: number, w: number, pose: Pose): void {
  const o = clamp(pose.open) * w * 0.9, m = pose.mouth * w * 0.5
  g.beginPath()
  g.moveTo(x - w, y - m * 0.5)
  g.quadraticCurveTo(x, y + m - o * 0.2, x + w, y - m * 0.5)
  if (o > 1) {
    g.quadraticCurveTo(x + w * 0.4, y + m + o * 1.5, x, y + m + o * 1.5)
    g.quadraticCurveTo(x - w * 0.4, y + m + o * 1.5, x - w, y - m * 0.5)
    cell(g, '#7c1e3c', 3)
    if (o > 8) {
      blob(g, x, y + m + o * 1.05, w * 0.4, o * 0.3)
      g.fillStyle = '#ff8fa3'
      g.fill()
    }
  } else gutta(g, 3.4)
}

function cheeks(g: G, x: number, y: number, gap: number, pose: Pose): void {
  if (pose.blush <= 0) return
  g.globalAlpha *= 0.55
  g.fillStyle = '#ff6f8e'
  for (const s of [-1, 1]) {
    blob(g, x + s * gap, y, 11, 8)
    g.fill()
  }
  g.globalAlpha /= 0.55
}

function walrus(g: G, p: Paint, pose: Pose, look: Look, asking: number, cup: number): void {
  // Uniform, and a belly that knows it.
  soft(g, [[-78, 8], [-92, -60], [-66, -124], [0, -134], [66, -124], [92, -60], [78, 8], [0, 18]])
  cell(g, dye(g, p('#c5283d'), 100))
  soft(g, [[-30, 10], [-36, -60], [0, -116], [36, -60], [30, 10]])
  cell(g, p('#fff0d0'), 4)
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      blob(g, s * 42, -14 - i * 32, 6.5, 6.5)
      cell(g, p('#ffd24a'), 2.4)
    }
  }
  for (const s of [-1, 1]) {
    soft(g, [[s * 58, -126], [s * 94, -120], [s * 98, -100], [s * 66, -104]])
    cell(g, p('#ffd24a'), 3)
  }
  // The arm that holds out the cup, and the one that salutes.
  const lift = asking * 10
  limb(g, () => {
    g.moveTo(-62, -92)
    g.quadraticCurveTo(-104, -60, -98, -42 - lift)
  }, p('#c5283d'), 26)
  g.save()
  g.translate(-104, -56 - lift)
  g.beginPath()
  g.moveTo(-24, -10)
  g.quadraticCurveTo(-20, 22, 0, 22)
  g.quadraticCurveTo(20, 22, 24, -10)
  g.closePath()
  cell(g, '#fffaf0', 4)
  blob(g, 0, -10, 24, 7)
  cell(g, cup > 0 ? '#b8642a' : '#f1ddc6', 3)
  g.restore()
  limb(g, () => {
    g.moveTo(62, -92)
    g.quadraticCurveTo(108, -64, pose.brow === 0.5 && pose.eyes > 1.1 ? 48 : 84, pose.brow === 0.5 && pose.eyes > 1.1 ? -176 : -30)
  }, p('#c5283d'), 26)
  // Head.
  g.save()
  g.translate(0, -150)
  g.rotate(pose.part * 0.05)
  blob(g, 0, -14, 64, 56)
  cell(g, dye(g, p('#8f86a8'), 70))
  eyes(g, { x: 0, y: -28, eyes: 1, gap: 20, r: 12 }, pose, look, '#4a3f63')
  for (const s of [-1, 1]) {
    g.beginPath()
    g.moveTo(s * 10, 10)
    g.quadraticCurveTo(s * 22, 40, s * 16, 60)
    g.quadraticCurveTo(s * 4, 40, s * 2, 12)
    cell(g, '#fffaf0', 3)
  }
  mouth(g, 0, 20, 14, pose)
  for (const s of [-1, 1]) {
    const f = pose.part * 22
    soft(g, [[0, -6], [s * 34, -12 - f * 0.3], [s * 74, 2 - f], [s * 84, 24 - f], [s * 52, 26 - f * 0.4], [s * 12, 18]])
    cell(g, p('#f4e3c8'), 4)
    line(g, [[s * 16, 6], [s * 52, 12 - f * 0.5]], GOLD, 2)
  }
  blob(g, 0, -4, 15, 11)
  cell(g, p('#4a3f63'), 3)
  cheeks(g, 0, -8, 46, pose)
  // Bicorne.
  soft(g, [[-76, -50], [-40, -62], [0, -104], [40, -62], [76, -50], [40, -44], [-40, -44]])
  cell(g, p('#2b2f7d'), 4)
  blob(g, 0, -66, 10, 10)
  cell(g, p('#ffd24a'), 3)
  g.restore()
}

function dog(g: G, p: Paint, pose: Pose, look: Look, asking: number): void {
  // A heap of hair that begs.
  g.save()
  g.translate(62, -24)
  g.rotate(0.5 + pose.part * 0.9)
  soft(g, [[-6, 8], [6, -40], [26, -62], [44, -40], [30, 0]])
  cell(g, p('#f3d9a4'), 4)
  g.restore()
  soft(g, [[-58, 8], [-74, -38], [-52, -88], [0, -104], [52, -88], [76, -38], [60, 8], [30, 2], [0, 14], [-30, 2]])
  cell(g, dye(g, p('#f3d9a4'), 84))
  for (const [x, y] of [[-30, -32], [4, -18], [36, -40], [-6, -60]]) {
    g.beginPath()
    g.moveTo(x - 9, y - 12)
    g.quadraticCurveTo(x + 6, y, x - 2, y + 18)
    gutta(g, 2.6)
  }
  for (const s of [-1, 1]) {
    const y = -62 - asking * 16 - (s < 0 ? pose.part * 8 : -pose.part * 8)
    limb(g, () => {
      g.moveTo(s * 34, -54)
      g.lineTo(s * 30 - 18, y - 4)
    }, p('#f3d9a4'), 22)
    blob(g, s * 30 - 18, y - 8, 15, 13)
    cell(g, p('#fff3d8'), 3)
  }
  g.save()
  g.translate(0, -124)
  g.rotate(pose.part * 0.08)
  for (const s of [-1, 1]) {
    g.save()
    g.translate(s * 52, -30)
    g.rotate(-s * (0.3 + pose.part * 0.9))
    soft(g, [[-18, -10], [18, -8], [26, 46], [4, 74], [-24, 50]])
    cell(g, p('#b9692f'), 4)
    g.restore()
  }
  blob(g, 0, -8, 56, 50)
  cell(g, dye(g, p('#f6dfae'), 60))
  soft(g, [[-30, -54], [-12, -80], [0, -62], [14, -82], [30, -54], [0, -44]])
  cell(g, p('#fff3d8'), 3)
  blob(g, 0, -58, 12, 9)
  cell(g, '#e2407a', 3)
  for (const s of [-1, 1]) {
    soft(g, [[0, -58], [s * 26, -74], [s * 28, -44]])
    cell(g, '#ff6f9f', 3)
  }
  eyes(g, { x: 0, y: -18, eyes: 1, gap: 22, r: 12.5 }, pose, look, '#8a4a1c')
  mouth(g, 0, 20, 17, pose)
  if (pose.mouth > 0.7) {
    soft(g, [[-8, 22], [10, 22], [12, 50 + pose.part * 6], [0, 58 + pose.part * 6], [-10, 48]])
    cell(g, '#ff7d95', 3)
  }
  blob(g, 0, 6, 15, 11)
  cell(g, '#3a2038', 3)
  cheeks(g, 0, 8, 40, pose)
  g.restore()
}

function goose(g: G, p: Paint, pose: Pose, look: Look, asking: number): void {
  // Tail with a gap in it, held where everyone can see.
  for (let i = 0; i < 6; i++) {
    if (i === 3) continue
    g.save()
    g.translate(46, -50)
    g.rotate(-0.25 + i * 0.24 - asking * 0.1 + pose.part * 0.1)
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(44, -22, 82, 0)
    g.quadraticCurveTo(44, 18, 0, 0)
    cell(g, p(i % 2 ? '#cfe8f7' : '#ffffff'), 3)
    g.restore()
  }
  soft(g, [[-60, 2], [-82, -44], [-52, -92], [4, -100], [60, -80], [76, -34], [56, 6], [0, 14]])
  cell(g, dye(g, p('#fdfcff'), 88))
  g.save()
  g.translate(14, -56)
  g.rotate(-pose.part * 0.5 - (pose.brow < 0 ? 0.5 : 0))
  soft(g, [[-34, -18], [28, -26], [62, 8], [30, 30], [-20, 26]])
  cell(g, p('#dceaf6'), 4)
  for (const s of [0, 1]) {
    g.beginPath()
    g.arc(6 + s * 22, 4, 14, -0.4, 1.8)
    gutta(g, 2.6)
  }
  g.restore()
  // Neck: proud, and all in one line.
  const bend = pose.part * 16
  limb(g, () => {
    g.moveTo(-30, -84)
    g.bezierCurveTo(-72, -130, 14 + bend, -150, -14 + bend, -206)
  }, p('#fdfcff'), 34)
  for (let i = 0; i < 5; i++) {
    blob(g, -46 + i * 10, -116 - i * 4 + (i === 2 ? 7 : i === 1 || i === 3 ? 5 : 0), 7, 7)
    cell(g, p('#ffd9ec'), 2.4)
  }
  g.save()
  g.translate(-16 + bend, -216)
  blob(g, 0, 0, 36, 32)
  cell(g, dye(g, p('#ffffff'), 40))
  const gape = clamp(pose.open) * 16
  g.beginPath()
  g.moveTo(-26, 2)
  g.quadraticCurveTo(-50, 0, -66, 12 + gape)
  g.quadraticCurveTo(-46, 22 + gape, -22, 18)
  g.closePath()
  cell(g, '#d9701e', 3)
  g.beginPath()
  g.moveTo(-26, -12)
  g.quadraticCurveTo(-56, -10 - gape * 0.4, -72, 4 - gape * 0.6)
  g.quadraticCurveTo(-48, 12, -24, 10)
  g.closePath()
  cell(g, '#f58a2b', 3)
  eyes(g, { x: -4, y: -8, eyes: 1, gap: 13, r: 9.5 }, pose, look, '#7a5a7a')
  cheeks(g, -2, 8, 22, pose)
  soft(g, [[-20, -28], [-10, -48], [-2, -32], [6, -52], [12, -32], [24, -44], [24, -24]])
  cell(g, '#ffd24a', 3)
  g.restore()
}

function pig(g: G, p: Paint, pose: Pose, look: Look, asking: number): void {
  g.beginPath()
  g.moveTo(74, -40)
  g.bezierCurveTo(110, -60, 92, -84, 84, -66)
  g.bezierCurveTo(78, -50, 106, -40, 110, -58)
  g.strokeStyle = GOLD
  g.lineWidth = 12
  g.stroke()
  g.strokeStyle = p('#f593ad')
  g.lineWidth = 6
  g.stroke()
  soft(g, [[-66, 6], [-84, -44], [-58, -98], [0, -108], [58, -98], [84, -44], [66, 6], [0, 16]])
  cell(g, dye(g, p('#6c4bc0'), 92))
  soft(g, [[-22, 8], [-26, -50], [0, -96], [26, -50], [22, 8]])
  cell(g, p('#f5c542'), 3)
  for (const s of [-1, 1]) {
    limb(g, () => {
      g.moveTo(s * 60, -74)
      g.quadraticCurveTo(s * 92, -60 - asking * 10, s * 62, -104 - asking * 6)
    }, p('#6c4bc0'), 24)
    blob(g, s * 60, -108 - asking * 6, 13, 12)
    cell(g, p('#f593ad'), 3)
  }
  // The ruff, clean and stiff.
  g.save()
  g.translate(0, -112)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    blob(g, Math.cos(a) * (66 + asking * 4), Math.sin(a) * 22, 21, 14, a)
    cell(g, p('#ffffff'), 3)
  }
  g.restore()
  g.save()
  g.translate(-pose.part * 4 - asking * 6, -154)
  g.rotate(pose.part * 0.1 - asking * 0.06)
  for (const s of [-1, 1]) {
    soft(g, [[s * 26, -40], [s * 46, -74 - pose.part * 10], [s * 62, -62], [s * 52, -26]])
    cell(g, p('#e8708f'), 4)
  }
  blob(g, 0, -10, 58, 50)
  cell(g, dye(g, p('#f7a3ba'), 64))
  eyes(g, { x: 0, y: -24, eyes: 1, gap: 23, r: 12 }, pose, look, '#a03a5e')
  mouth(g, 0, 26, 16, pose)
  g.save()
  g.translate(-6 - asking * 10, 4)
  g.scale(1 + asking * 0.12 + Math.abs(pose.part) * 0.1, 1)
  blob(g, 0, 0, 25, 18)
  cell(g, p('#ee7d9a'), 4)
  for (const s of [-1, 1]) {
    blob(g, s * 9, 0, 4, 6)
    g.fillStyle = '#8a2a4c'
    g.fill()
  }
  g.restore()
  cheeks(g, 0, 2, 42, pose)
  soft(g, [[-24, -50], [-28, -80], [-10, -66], [0, -86], [10, -66], [28, -80], [24, -50]])
  cell(g, '#ffd24a', 3)
  g.restore()
}

const TALL: Record<Guest, number> = { walrus: 190, dog: 170, goose: 240, pig: 200 }

function fuzz(g: G, guest: Guest, p: Paint): void {
  const h = TALL[guest], base = p({ walrus: '#8f86a8', dog: '#f3d9a4', goose: '#ffffff', pig: '#f7a3ba' }[guest])
  g.beginPath()
  for (let i = 0; i <= 44; i++) {
    const a = (i / 44) * Math.PI * 2, r = i % 2 ? 1.06 : 0.9
    const x = Math.cos(a) * 98 * r, y = -h * 0.52 + Math.sin(a) * (h * 0.56) * r
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  }
  g.closePath()
  cell(g, base, 3)
}

function feather(g: G, x: number, y: number, turn: number, size: number, colour: string): void {
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(size * 0.5, -size * 0.36, size, 0)
  g.quadraticCurveTo(size * 0.5, size * 0.36, 0, 0)
  cell(g, colour, 2.4)
  g.restore()
}

function plumes(g: G, guest: Guest, time: number, back: boolean): void {
  const h = TALL[guest], tints = ['#f25c9a', '#ffb3cf', '#f7b733', '#fff0d0']
  if (back) {
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      feather(g, s * 62, -h * 0.42, (s < 0 ? Math.PI + 0.1 + i * 0.22 : -0.1 - i * 0.22) + Math.sin(time * 5 + i) * 0.06, 62, tints[i])
    }
    return
  }
  for (let i = 0; i < 13; i++) {
    const row = i % 3, x = (((i * 37) % 120) - 60) * 0.9, y = -24 - row * h * 0.2 - ((i * 13) % 20)
    feather(g, x, y, Math.PI / 2 + Math.sin(i * 9.1) * 0.5 + Math.sin(time * 3 + i) * 0.06, 34, tints[i % 4])
  }
}

function drips(g: G, time: number): void {
  for (let i = 0; i < 6; i++) {
    const x = -66 + i * 27, l = 20 + ((i * 29) % 22) + Math.sin(time * 1.4 + i * 2) * 5
    soft(g, [[x - 11, -44 + (i % 2) * 16], [x + 11, -44 + (i % 2) * 16], [x + 8, -24 + l], [x, -14 + l], [x - 8, -24 + l]])
    cell(g, '#fffdf4', 3)
  }
}

function drops(g: G, time: number): void {
  for (let i = 0; i < 6; i++) {
    const k = (time * 0.7 + i * 0.37) % 1, x = -72 + i * 28
    g.globalAlpha = 1 - k
    g.beginPath()
    g.moveTo(x, -70 + k * 82)
    g.quadraticCurveTo(x + 9, -54 + k * 82, x, -50 + k * 82)
    g.quadraticCurveTo(x - 9, -54 + k * 82, x, -70 + k * 82)
    cell(g, '#7fd4ff', 2)
    g.globalAlpha = 1
  }
}

function cracks(g: G): void {
  for (const path of [[[-54, -90], [-36, -70], [-44, -50], [-22, -28]], [[38, -120], [24, -94], [40, -74], [30, -48]], [[4, -40], [-8, -18], [6, 0]]] as const) line(g, path, '#6d5f52', 3)
}

function bubble(g: G): void {
  blob(g, 0, 0, 132, 132)
  g.globalAlpha = 0.2
  g.fillStyle = '#c9f4ff'
  g.fill()
  g.globalAlpha = 0.95
  gutta(g, 4)
  g.globalAlpha = 0.75
  g.beginPath()
  g.arc(0, 0, 112, Math.PI * 1.08, Math.PI * 1.36)
  g.strokeStyle = '#ffffff'
  g.lineWidth = 10
  g.stroke()
  g.globalAlpha = 1
}
