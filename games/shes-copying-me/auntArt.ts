import type { AuntShow, Hand } from './party'
import type { Hair, Side } from './rules'
import { SHOULDER, AUNT } from './layout'
import { GOLD, INK, blob, bump, cell, clamp, dye, gutta, jolt, limb, line, mix, soft, type G } from './silk'
import { step, type Stamp } from './stamps'

// The two grand aunts. The tall one (side 0) is slow and looks down her nose;
// the round one (side 1) is quick and bounces. Both are drawn outward (+x),
// from the middle of the chest.

const DRESS = ['#a1268f', '#ef8a1d'] as const
const TRIM = ['#f7c6e6', '#fff0b8'] as const
const SKIN = ['#f4c9b0', '#f7b79a'] as const
const HAIR = ['#e9e4f4', '#d9552f'] as const

const HAIR_TINT: Record<Hair, (c: string) => string> = {
  plain: (c) => c,
  wet: (c) => mix(c, '#2f78c9', 0.4),
  gluey: (c) => mix(c, '#fffdf4', 0.75),
  feathered: (c) => mix(c, '#fff4dc', 0.3),
}

export type AuntView = {
  side: Side
  show: AuntShow
  hand: Hand
  hair: Hair
  lips: boolean
  /** Where her eyes go, -1 to 1 each way, in outward coordinates. */
  look: { x: number; y: number }
  time: number
  copying: boolean
  /** 0 to 1 while she rubs her guest at the tidying. */
  curtsy: number
}

/** How far her head goes with what she does, which is where she differs most from her sister. */
function headOf(v: AuntView): { x: number; y: number; turn: number; jiggle: number } {
  const { show, side, time } = v
  const slow = side === 0
  const k = show.act && show.t < 1.4 ? bump(clamp(show.t / 1.3)) : 0
  const idle = Math.sin(time * (slow ? 0.8 : 1.9) + side * 2)
  let turn = idle * (slow ? 0.018 : 0.035), x = 0, y = idle * (slow ? 1.5 : 3), jiggle = jolt(show.t, slow ? 9 : 20, slow ? 1.8 : 3.4)
  if (show.act === 'self') {
    turn += 0.16 * k
    x += 8 * k
  }
  if (show.act === 'show') {
    turn -= (slow ? 0.16 : 0.08) * k
    y -= 8 * k
  }
  if (show.act === 'wave') turn += jiggle * 0.06
  if (show.face === 'puzzled') turn += 0.2
  if (show.face === 'innocent') {
    turn -= 0.14
    y -= 5
  }
  if (show.face === 'keen') x += v.side === 0 ? -6 : -10
  if (show.act === 'self' && show.thing === 'duster' && show.t < 1.4) {
    // The sneeze: a long way back, and all the way forward.
    const t = show.t
    turn += t < 0.7 ? -0.3 * clamp(t * 1.6) : 0.36 * Math.exp(-(t - 0.7) * 4)
    y += t < 0.7 ? -8 : 18 * Math.exp(-(t - 0.7) * 4)
  }
  y += v.curtsy * 34
  return { x, y, turn, jiggle }
}

export function paintAunt(g: G, v: AuntView, put: Stamp): void {
  const { side } = v
  const head = headOf(v)
  g.save()
  g.translate(0, v.curtsy * 22)
  // Breath lifts the whole of her a little from the seat.
  const breath = side === 0 ? Math.sin(v.time * 1.3) * 0.003 : Math.sin(v.time * 2.1) * 0.006 + head.jiggle * 0.02
  g.translate(0, -breath * 300)
  put(g, `body${side}`, [-180, -110, 360, 450], '', '', (g) => {
    if (side === 0) bodyTall(g)
    else bodyRound(g)
    // The near arm lies in her lap.
    limb(g, () => {
      g.moveTo(side === 0 ? -44 : -70, 4)
      g.quadraticCurveTo(side === 0 ? -86 : -112, 90, side === 0 ? -20 : -30, 128)
    }, DRESS[side], side === 0 ? 34 : 42)
    blob(g, side === 0 ? -14 : -22, 130, 18, 14)
    cell(g, SKIN[side], 3.4)
  })
  g.restore()
  g.save()
  g.translate(head.x, -96 + head.y)
  g.rotate(head.turn)
  g.translate(0, -44)
  if (side === 0) headTall(g, v, head.jiggle, put)
  else headRound(g, v, head.jiggle, put)
  g.restore()
}

function bodyTall(g: G): void {
  soft(g, [[-44, 80], [-120, 190], [-150, 330], [150, 330], [122, 190], [44, 80]])
  cell(g, dye(g, DRESS[0], 260), 5)
  for (const x of [-60, 0, 60]) {
    g.beginPath()
    g.moveTo(x * 0.4, 110)
    g.quadraticCurveTo(x, 190, x * 1.5, 320)
    gutta(g, 3)
  }
  soft(g, [[-34, -30], [-58, 10], [-38, 96], [0, 112], [38, 96], [58, 10], [34, -30], [0, -38]])
  cell(g, dye(g, mix(DRESS[0], '#ffffff', 0.08), 90), 5)
  for (let i = 0; i < 4; i++) {
    blob(g, 0, 4 + i * 25, 8, 7)
    cell(g, TRIM[0], 2.6)
  }
  limb(g, () => {
    g.moveTo(0, -24)
    g.lineTo(0, -86)
  }, SKIN[0], 24)
  for (let i = -3; i <= 3; i++) {
    blob(g, i * 14, -26 - Math.abs(i) * 5 + 6, 13, 12)
    cell(g, TRIM[0], 3)
  }
}

function bodyRound(g: G): void {
  soft(g, [[-70, 70], [-150, 190], [-166, 330], [166, 330], [150, 190], [70, 70]])
  cell(g, dye(g, DRESS[1], 280), 5)
  for (let row = 0; row < 2; row++) for (let i = -2; i <= 2; i++) {
    blob(g, i * 54 + (row ? 26 : 0), 190 + row * 46, 13, 13)
    cell(g, row ? '#fff0b8' : '#d9431f', 3)
  }
  soft(g, [[-56, -30], [-96, 16], [-84, 92], [0, 124], [84, 92], [96, 16], [56, -30], [0, -40]])
  cell(g, dye(g, mix(DRESS[1], '#ffffff', 0.08), 120), 5)
  soft(g, [[-70, -18], [-40, -34], [0, -26], [40, -34], [70, -18], [46, 20], [0, 34], [-46, 20]])
  cell(g, TRIM[1], 4)
  for (let i = -2; i <= 2; i++) {
    blob(g, i * 20, (2 - Math.abs(i)) * 7, 8.5, 8.5)
    cell(g, '#7ad0c8', 2.6)
  }
}

function eye(g: G, x: number, y: number, r: number, open: number, v: AuntView, lid: string, lash: boolean): void {
  blob(g, x, y, r, r * 1.1)
  cell(g, '#fffdf6', 3)
  blob(g, x + clamp(v.look.x, -1, 1) * r * 0.5, y + clamp(v.look.y, -1, 1) * r * 0.5, r * 0.48, r * 0.55)
  g.fillStyle = INK
  g.fill()
  const shut = clamp(1 - open)
  if (shut > 0.02) {
    g.beginPath()
    g.ellipse(x, y, r, r * 1.1, 0, Math.PI, 0)
    g.quadraticCurveTo(x, y - r * 1.1 + shut * r * 2.6, x - r, y)
    g.closePath()
    cell(g, lid, 2.6)
  }
  if (lash) line(g, [[x + r * 0.9, y - r * 0.2], [x + r * 1.6, y - r * 0.7]], GOLD, 3)
}

function brows(g: G, v: AuntView, gap: number, y: number, w: number, colour: string): void {
  const keen = v.copying || v.show.face === 'keen'
  for (const s of [-1, 1]) {
    const lift = (keen && s > 0 ? 9 : 0) + (v.show.face === 'proud' ? 5 : 0) + (v.show.face === 'puzzled' ? (s > 0 ? 10 : -3) : 0)
    g.beginPath()
    g.moveTo(s * gap - w, y - lift + (v.side === 0 ? 2 : 0))
    g.quadraticCurveTo(s * gap, y - 8 - lift, s * gap + w, y - lift)
    g.strokeStyle = colour
    g.lineWidth = 5
    g.lineCap = 'round'
    g.stroke()
  }
}

function lipsOf(g: G, v: AuntView, x: number, y: number, w: number): void {
  const { show } = v
  if (v.lips) {
    // Stuck: one white blot, and a hum behind it.
    const hum = Math.sin(v.time * 9) * 1.5
    soft(g, [[x - w * 1.3, y - 4], [x, y - 10 + hum], [x + w * 1.3, y - 4], [x + w * 1.1, y + 12], [x, y + 9 - hum], [x - w * 1.1, y + 12]])
    cell(g, '#fffdf4', 3)
    return
  }
  const self = show.act === 'self' && show.t < 1.3
  const open = self ? 0.5 + 0.4 * Math.sin(show.t * 18) : show.act && show.t < 0.9 ? 0.7 * bump(show.t / 0.9) : 0
  const smile = show.face === 'proud' ? 1 : show.face === 'puzzled' ? -0.7 : show.face === 'innocent' ? 0.1 : 0.35
  if (show.face === 'innocent') {
    // She whistles at the ceiling.
    blob(g, x, y + 2, 6, 7)
    cell(g, '#8c1e45', 3)
    return
  }
  g.beginPath()
  g.moveTo(x - w, y - smile * 5)
  g.quadraticCurveTo(x - w * 0.4, y - 5, x, y - 1)
  g.quadraticCurveTo(x + w * 0.4, y - 5, x + w, y - smile * 5)
  g.quadraticCurveTo(x, y + 8 + smile * 8 + open * 26, x - w, y - smile * 5)
  cell(g, open > 0.2 ? '#8c1e45' : '#d92e5d', 3)
}

/** Feathers stuck in hair, and drops and glops that hang from it. */
function hairMarks(g: G, v: AuntView, w: number, top: number): void {
  if (v.hair === 'feathered') for (let i = 0; i < 6; i++) {
    g.save()
    g.translate((i - 2.5) * w * 0.32, top + Math.abs(i - 2.5) * 16)
    g.rotate(-Math.PI / 2 + (i - 2.5) * 0.28 + Math.sin(v.time * 3 + i) * 0.06)
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(24, -15, 48, 0)
    g.quadraticCurveTo(24, 15, 0, 0)
    cell(g, ['#f25c9a', '#ffb3cf', '#f7b733'][i % 3], 2.6)
    g.restore()
  }
  if (v.hair === 'gluey') for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * w * 0.42, l = 16 + (i % 2) * 16 + Math.sin(v.time * 1.6 + i) * 4
    soft(g, [[x - 9, top + 14], [x + 9, top + 14], [x + 7, top + 22 + l], [x, top + 30 + l], [x - 7, top + 22 + l]])
    cell(g, '#fffdf4', 3)
  }
  if (v.hair === 'wet') for (let i = 0; i < 3; i++) {
    const k = (v.time * 0.8 + i * 0.33) % 1
    blob(g, (i - 1) * w * 0.55, top + 40 + k * 90, 4.5, 7)
    g.globalAlpha = 1 - k
    cell(g, '#7fd4ff', 2)
    g.globalAlpha = 1
  }
}

/** Her hair is off her head for a moment, after her own sneeze. */
function flight(v: AuntView): number {
  const { show } = v
  if (show.act === 'self' && show.thing === 'duster' && show.t > 0.7 && show.t < 1.7) return -70 * bump((show.t - 0.7) / 1)
  return 0
}

/** How her hair looks now: what moves in it moves in steps. */
const hairLook = (v: AuntView, jiggle: number) => `${v.hair === 'plain' ? 0 : Math.floor(v.time * 8)}/${step(jiggle, 0.2)}`

type Face = { open: number; wide: number }

/** How her face looks now. */
function faceLook(v: AuntView, f: Face, jiggle: number): string {
  const { show } = v
  const at = show.act && show.t < 1.6 ? Math.floor(show.t * 20) : -1
  return [step(v.look.x, 0.25), step(v.look.y, 0.25), step(f.open, 0.1), show.face, v.copying, v.lips ? Math.floor(v.time * 8) : '', at < 0 ? '' : `${show.act}${show.thing}${at}`, step(jiggle, 0.2)].join()
}

function faceOf(v: AuntView, proud: number, calm: number, rate: number): Face {
  const blink = (v.time * rate) % 1 > 0.967 ? 0 : 1
  const ear = v.show.act === 'self' && v.show.thing === 'horn' && v.show.t < 1.6
  const open = v.show.face === 'proud' ? proud : v.show.face === 'innocent' ? 0.9 : v.show.face === 'keen' || v.copying ? Math.max(0.85, calm) : calm
  return { open: open * blink, wide: ear ? 1.9 : 1 }
}

function rouge(g: G, gap: number, y: number, rx: number, ry: number): void {
  g.globalAlpha = 0.47
  g.fillStyle = '#ff5f7a'
  for (const s of [-1, 1]) {
    blob(g, s * gap, y, rx, ry)
    g.fill()
  }
  g.globalAlpha = 1
}

/** Cheeks full of tea. */
function cheeksFull(g: G, v: AuntView, x: number, r: number, skin: string): void {
  const tea = v.show.act === 'self' && v.show.thing === 'teapot' && v.show.t < 1.4 ? bump(v.show.t / 1.4) : 0
  if (tea <= 0.05) return
  for (const s of [-1, 1]) {
    blob(g, s * x, 26, r * tea, r * 0.85 * tea)
    cell(g, skin, 3)
  }
}

function headTall(g: G, v: AuntView, jiggle: number, put: Stamp): void {
  const c = HAIR_TINT[v.hair](HAIR[0]), fly = flight(v)
  g.save()
  g.translate(0, fly)
  g.rotate(jiggle * 0.05 + fly * 0.004)
  put(g, 'hair0', [-100, -215, 200, 260], v.hair, hairLook(v, 0), (g) => {
    soft(g, [[-52, -8], [-62, -50], [-50, -108], [-34, -150], [0, -164], [34, -150], [50, -108], [62, -50], [52, -8], [0, -30]])
    cell(g, dye(g, c, 130), 4.5)
    for (const [x, y, r] of [[-22, -116, 15], [14, -130, 13], [24, -92, 16], [-28, -70, 15], [4, -84, 11]]) {
      g.beginPath()
      g.arc(x, y, r, 0.4, 5.6)
      gutta(g, 3)
    }
    for (const s of [-1, 1]) {
      soft(g, [[s * 46, -20], [s * 66, -14], [s * 66, 22], [s * 52, 34], [s * 42, 14]])
      cell(g, c, 3.6)
    }
    hairMarks(g, v, 56, -140)
  })
  // A small ship sails on it, of course.
  g.translate(2, -168)
  g.rotate(Math.sin(v.time * 1.4) * 0.1 + jiggle * 0.25)
  put(g, 'ship', [-36, -42, 72, 66], '', '', (g) => {
    soft(g, [[-28, 0], [28, 0], [18, 16], [-18, 16]])
    cell(g, '#b5642a', 3)
    g.beginPath()
    g.moveTo(0, -2)
    g.lineTo(0, -34)
    g.quadraticCurveTo(26, -16, 0, -4)
    cell(g, '#ffd873', 3)
  })
  g.restore()
  const f = faceOf(v, 0.55, 0.55, 0.23)
  put(g, 'face0', [-62, -52, 124, 124], '', faceLook(v, f, 0), (g) => {
    soft(g, [[-40, -24], [-38, 18], [-18, 50], [0, 58], [18, 50], [38, 18], [40, -24], [0, -40]])
    cell(g, dye(g, SKIN[0], 60), 4)
    eye(g, -16, -4, 12, f.open, v, '#b892d8', false)
    eye(g, 16, -4, 12 * f.wide, f.wide > 1 ? 1 : f.open, v, '#b892d8', true)
    brows(g, v, 17, -22, 11, '#8d7fa6')
    // A long nose, carried high.
    g.beginPath()
    g.moveTo(-2, 0)
    g.quadraticCurveTo(15, 18, 8, 25)
    g.quadraticCurveTo(0, 29, -5, 24)
    gutta(g, 3.6)
    lipsOf(g, v, 2, 38, 11)
    rouge(g, 26, 20, 9, 7)
    cheeksFull(g, v, 32, 20, SKIN[0])
    for (const s of [-1, 1]) {
      blob(g, s * 38, 26, 5, 8)
      cell(g, '#3fc1c9', 2.4)
    }
  })
}

function headRound(g: G, v: AuntView, jiggle: number, put: Stamp): void {
  const c = HAIR_TINT[v.hair](HAIR[1]), fly = flight(v)
  const f = faceOf(v, 0.6, 1, 0.37)
  put(g, 'face1', [-84, -60, 168, 160], '', faceLook(v, f, jiggle), (g) => {
    soft(g, [[-58, 26], [-40, 68 + jiggle * 5], [0, 82 + jiggle * 8], [40, 68 + jiggle * 5], [58, 26]])
    cell(g, SKIN[1], 4)
    blob(g, 0, 6, 62, 58)
    cell(g, dye(g, SKIN[1], 70), 4)
    g.beginPath()
    g.arc(0, 44, 26 + jiggle * 2, 0.5, Math.PI - 0.5)
    gutta(g, 3)
    eye(g, -22, -6, 14, f.open, v, '#ef9a7a', false)
    eye(g, 22, -6, 14 * f.wide, f.wide > 1 ? 1 : f.open, v, '#ef9a7a', true)
    brows(g, v, 22, -27, 12, '#a53a1e')
    blob(g, 0, 12, 14, 12)
    cell(g, '#f28f7a', 3.4)
    lipsOf(g, v, 0, 38, 15)
    rouge(g, 42, 20, 13, 10)
    cheeksFull(g, v, 46, 24, SKIN[1])
  })
  g.save()
  g.translate(0, fly)
  g.rotate(fly * 0.006)
  put(g, 'hair1', [-110, -130, 220, 210], v.hair, hairLook(v, jiggle), (g) => {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const x = s * (58 + (i === 1 ? 8 : 0)), y = -22 + i * 26 + jiggle * 3 * (i + 1)
      blob(g, x, y, 17, 17)
      cell(g, c, 3.6)
      g.beginPath()
      g.arc(x, y, 7, 0, 4.6)
      gutta(g, 2.6)
    }
    soft(g, [[-60, -22], [-58, -62], [-30, -86], [0, -78], [30, -88], [60, -60], [60, -22], [30, -40], [0, -34], [-30, -42]])
    cell(g, dye(g, c, 80), 4.5)
    hairMarks(g, v, 60, -72)
  })
  // A bird's nest of a hat, with an owner.
  g.translate(4, -86)
  g.rotate(jiggle * 0.12)
  const bob = Math.abs(Math.sin(v.time * 2.2)) * -4
  put(g, 'hat', [-50, -60, 102, 78], '', '', (g) => {
    soft(g, [[-44, -2], [-30, -20], [0, -26], [32, -20], [46, -2], [26, 12], [-26, 12]])
    cell(g, '#2f9f86', 4)
  })
  g.translate(8, bob)
  put(g, 'chick', [-20, -54, 50, 42], '', '', (g) => {
    blob(g, 0, -34, 15, 14)
    cell(g, '#ffe36b', 3)
    blob(g, 4, -38, 3, 3.6)
    g.fillStyle = INK
    g.fill()
    g.beginPath()
    g.moveTo(13, -36)
    g.lineTo(24, -32)
    g.lineTo(13, -28)
    cell(g, '#f58a2b', 2)
  })
  g.restore()
}

/** Where the elbow goes: an arm of two lengths that stretches like gum when it must. */
export function elbow(sx: number, sy: number, hx: number, hy: number): { x: number; y: number } {
  const dx = hx - sx, dy = hy - sy, d = Math.max(1, Math.hypot(dx, dy))
  const half = Math.max(d / 2 + 1, 136)
  const h = Math.sqrt(half * half - (d / 2) ** 2)
  // The elbow drops, whichever way the hand goes.
  const px = -dy / d, py = dx / d
  const s = py >= 0 ? 1 : -1
  return { x: sx + dx / 2 + px * s * h * 0.75, y: sy + dy / 2 + py * s * h * 0.75 }
}

/** The arm that works, in front of everything: sleeve, lace and glove. Outward coordinates from the aunt's middle. */
export function paintArm(g: G, side: Side, hand: Hand, lit: number, put: Stamp): void {
  const sx = SHOULDER.u - AUNT.u + (side === 0 ? -6 : 22), sy = SHOULDER.y - AUNT.y + 14
  const hx = hand.u - AUNT.u, hy = hand.y - AUNT.y
  const e = elbow(sx, sy, hx, hy)
  const width = side === 0 ? 32 : 42
  limb(g, () => {
    g.moveTo(sx, sy)
    g.quadraticCurveTo(e.x * 1.15 - (sx + hx) * 0.075, e.y * 1.15 - (sy + hy) * 0.075, hx, hy)
  }, mix(DRESS[side], '#ffffff', 0.1), width)
  g.save()
  g.translate(sx, sy)
  put(g, `shoulder${side}`, [-46, -44, 92, 88], '', '', (g) => {
    blob(g, -2, -4, width * 0.86, width * 0.74)
    cell(g, dye(g, mix(DRESS[side], '#ffffff', 0.14), width * 1.9), 4)
  })
  g.restore()
  const a = Math.atan2(hy - e.y, hx - e.x)
  g.save()
  g.translate(hx, hy)
  g.rotate(a)
  if (lit > 0) {
    g.globalAlpha = lit * 0.65
    blob(g, 12, 0, 66, 66)
    g.strokeStyle = '#fff3b0'
    g.lineWidth = 9
    g.stroke()
    g.globalAlpha = 1
  }
  put(g, `glove${side}`, [-40, -32, 68, 64], '', '', (g) => {
    for (let i = -1; i <= 1; i++) {
      blob(g, -22, i * 15, 13, 12)
      cell(g, TRIM[side], 3)
    }
    blob(g, 0, 0, side === 0 ? 20 : 23, side === 0 ? 17 : 21)
    cell(g, '#fffaf2', 4)
  })
  g.restore()
}

/** The fingers, over the thing. */
export function paintFingers(g: G, side: Side, put: Stamp): void {
  put(g, `fingers${side}`, [-22, -26, 46, 54], '', '', (g) => {
    for (let i = 0; i < 3; i++) {
      blob(g, -1 + i * 1.5, -11 + i * 11, side === 0 ? 13 : 15, side === 0 ? 5.6 : 7, 0.15)
      cell(g, '#fffaf2', 3)
    }
  })
}
