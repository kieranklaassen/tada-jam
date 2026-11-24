import { CAST, girth, type Who } from './cast'
import { METAL, blob, chilled, foil, oval, path, poly, twist, type Album, type Ctx, type Metal, type Pen, type Picture } from './foil'
import { TABLE_Y } from './layout'

// The customers, the magpie and the mice. Bodies lie from the neck (0) to the
// tail tip; a head is drawn about the neck and looks to the left.

const metalOf = (who: Who, cold: boolean, by = 1): Metal => (cold ? chilled(METAL[who], by) : METAL[who])
/** The middle of the body at `x` from the neck, above the table. */
export const midAt = (who: Who, x: number): number => TABLE_Y - 8 - girth(who, x)

export function bodyOutline(who: Who): Path2D {
  const { length } = CAST[who], n = 24
  const top: [number, number][] = [], low: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * length, g = girth(who, x), m = midAt(who, x)
    const bump = who === 'croc' ? (i % 2 ? -9 : 2) : who === 'python' ? Math.sin(i * 1.1) * 5 : 0
    top.push([x, m - g + bump])
    low.push([x, m + g])
  }
  return blob([...top, ...low.reverse()], 0.8)
}

export function body(album: Album, who: Who, cold: boolean, light: number): Picture {
  const { length } = CAST[who]
  return album.get(`body-${who}-${cold}-${light}`, [-40, 262, length + 130, 200], (c) => {
    const m = metalOf(who, cold)
    if (who === 'seal') foil(c, blob([[length - 40, 396], [length - 4, 352], [length + 2, 384], [length + 1, 420], [length - 30, 440]]), [length - 60, 340, 70, 100], m, { seed: 8, light, size: 16 })
    if (who === 'croc') twist(c, length - 14, TABLE_Y - 20, -0.2, 46, '#c9f7dc', 1.1)
    if (who === 'python') twist(c, length - 12, TABLE_Y - 18, 0, 40, '#ffd6ea', 1)
    foil(c, bodyOutline(who), [-20, 284, length + 20, 168], m, { seed: 3 + length, light, size: who === 'snail' ? 20 : 26, round: 0.5 })
    c.save()
    c.clip(bodyOutline(who))
    if (who === 'croc') { c.globalAlpha = 0.5; c.fillStyle = '#e9f7b8'; c.fill(path((p) => { p.ellipse(length * 0.34, TABLE_Y + 6, length * 0.42, 34, 0, 0, 7) })) }
    if (who === 'python') { c.globalAlpha = 0.8; c.fillStyle = cold ? '#dff0ff' : '#ffe36e'; for (let x = 60; x < length; x += 96) c.fill(poly([[x - 30, midAt(who, x)], [x, midAt(who, x) - 30], [x + 30, midAt(who, x)], [x, midAt(who, x) + 26]])) }
    if (who === 'snail') { c.globalAlpha = 0.5; c.fillStyle = '#f6e3ff'; c.fillRect(-10, TABLE_Y - 26, length + 20, 30) }
    c.restore()
  })
}

/** Paws, feet and flippers, over whatever is worn. */
export function feet(album: Album, who: Who, cold: boolean): Picture | null {
  if (who === 'snail' || who === 'python') return null
  const { length } = CAST[who]
  return album.get(`feet-${who}-${cold}`, [-40, 380, length + 80, 90], (c) => {
    const m = metalOf(who, cold)
    const foot = (x: number, w: number, seed: number): void => foil(c, blob([[x - w, TABLE_Y + 4], [x - w + 4, TABLE_Y - 14], [x - 4, TABLE_Y - 40], [x + w - 4, TABLE_Y - 30], [x + w, TABLE_Y + 4]], 0.8), [x - w, TABLE_Y - 40, w * 2, 46], m, { seed, size: 16 })
    if (who === 'croc') { foot(70, 34, 4); foot(330, 36, 5) }
    if (who === 'dog') { foot(34, 24, 4); foot(290, 26, 5) }
    if (who === 'seal') foil(c, blob([[60, TABLE_Y - 44], [100, TABLE_Y - 34], [92, TABLE_Y + 4], [20, TABLE_Y + 6], [16, TABLE_Y - 6], [56, TABLE_Y - 16]], 0.8), [16, TABLE_Y - 44, 90, 52], m, { seed: 6, size: 16 })
  })
}

/** The snail's house, on its back over whatever it wears. */
export function shell(album: Album): Picture {
  return album.get('shell', [40, 180, 220, 240], (c) => {
    foil(c, oval(150, 300, 92, 84), [58, 216, 184, 170], METAL.mint, { seed: 91, size: 26, round: 0.6 })
    c.strokeStyle = METAL.mint[0]
    c.lineWidth = 9
    c.lineCap = 'round'
    c.globalAlpha = 0.7
    c.stroke(path((p) => { for (let i = 0; i < 60; i++) { const a = i * 0.22, r = 72 - i * 1.15; const x = 150 + Math.cos(a) * r, y = 302 + Math.sin(a) * r * 0.92; if (i) p.lineTo(x, y); else p.moveTo(x, y) } }))
  })
}

// --- Heads --------------------------------------------------------------------

type HeadShape = { box: readonly [number, number, number, number]; eyes: readonly (readonly [number, number, number])[]; mouth: readonly [number, number]; mouthW: number }
/** In head units: the neck joint is 0,0 and left is forward. */
export const HEADS: Record<Who, HeadShape> = {
  croc: { box: [-222, -130, 260, 200], eyes: [[-84, -82, 23], [-34, -86, 25]], mouth: [-196, 14], mouthW: 40 },
  dog: { box: [-190, -150, 230, 210], eyes: [[-106, -76, 19], [-62, -82, 21]], mouth: [-132, -14], mouthW: 34 },
  snail: { box: [-150, -164, 190, 224], eyes: [[-112, -122, 22], [-52, -132, 24]], mouth: [-92, -12], mouthW: 34 },
  seal: { box: [-180, -150, 220, 210], eyes: [[-110, -74, 24], [-52, -80, 26]], mouth: [-104, -18], mouthW: 36 },
  python: { box: [-200, -110, 240, 170], eyes: [[-118, -58, 21], [-68, -66, 23]], mouth: [-150, 0], mouthW: 44 },
}

function paintHead(c: Ctx, who: Who, cold: boolean, light: number): void {
  const m = metalOf(who, cold, 0.6), o = { light, size: 20, round: 0.5 }
  switch (who) {
    case 'croc':
      foil(c, blob([[-210, -24], [-200, -46], [-180, -38], [-120, -44], [-104, -78], [-84, -108], [-60, -88], [-34, -114], [-8, -92], [20, -60], [34, 0], [20, 50], [-40, 40], [-110, 14], [-190, 10], [-212, -4]], 0.8), [-214, -116, 250, 170], m, { ...o, seed: 101 })
      c.fillStyle = m[0]
      c.fill(oval(-196, -34, 7, 5)); c.fill(oval(-178, -34, 6, 5))
      c.fillStyle = '#fff'
      c.strokeStyle = m[0]
      c.lineWidth = 1.5
      for (let i = 0; i < 7; i++) { const t = poly([[-198 + i * 15, 6 + i * 0.6], [-185 + i * 15, 7 + i * 0.6], [-192 + i * 15, 24 + i * 0.6]]); c.fill(t); c.stroke(t) }
      break
    case 'dog':
      foil(c, blob([[-168, -32], [-150, -54], [-120, -62], [-112, -98], [-70, -122], [-20, -108], [10, -70], [30, -10], [16, 44], [-40, 34], [-96, 14], [-150, 8], [-172, -8]], 0.9), [-174, -124, 210, 170], m, { ...o, seed: 102 })
      foil(c, blob([[-44, -104], [0, -110], [26, -70], [22, 0], [-8, 34], [-34, 10], [-40, -40]], 0.9), [-48, -114, 80, 152], cold ? chilled(['#4e2409', '#94501c', '#e8a860'], 0.6) : ['#4e2409', '#94501c', '#e8a860'], { ...o, seed: 103 })
      foil(c, oval(-164, -32, 22, 18), [-186, -50, 44, 36], METAL.ink, { ...o, seed: 104, size: 12 })
      break
    case 'snail':
      for (const [x, y] of [[-112, -100], [-52, -110]]) foil(c, poly([[x - 9, y - 20], [x + 9, y - 20], [x + 26, -20], [x - 2, -20]]), [x - 10, y - 20, 40, 110], m, { ...o, seed: 105, size: 14 })
      foil(c, blob([[-136, -30], [-120, -62], [-80, -74], [-36, -62], [10, -50], [34, 0], [20, 44], [-50, 40], [-112, 26], [-136, 0]], 0.95), [-138, -76, 174, 122], m, { ...o, seed: 106 })
      break
    case 'seal':
      foil(c, blob([[-160, -40], [-144, -88], [-96, -128], [-44, -126], [0, -92], [24, -40], [34, 10], [20, 50], [-50, 40], [-120, 14], [-158, -6]], 1), [-162, -130, 198, 182], m, { ...o, seed: 107 })
      foil(c, blob([[-164, -26], [-136, -50], [-100, -44], [-70, -50], [-50, -24], [-74, 0], [-104, 0], [-140, 4]], 1), [-166, -54, 118, 60], cold ? chilled(METAL.silver) : METAL.silver, { ...o, seed: 108, size: 14 })
      foil(c, oval(-110, -46, 17, 12), [-128, -60, 36, 26], METAL.ink, { ...o, seed: 109, size: 10 })
      c.strokeStyle = '#4a5a68'
      c.lineWidth = 2.4
      c.stroke(path((p) => { for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { p.moveTo(-106 + s * 26, -24 + i * 6); p.lineTo(-106 + s * 66, -32 + i * 15) } }))
      break
    case 'python':
      foil(c, blob([[-186, -18], [-170, -44], [-130, -60], [-110, -84], [-70, -92], [-30, -70], [16, -46], [34, 0], [20, 36], [-50, 34], [-130, 22], [-178, 8]], 0.95), [-188, -94, 224, 132], m, { ...o, seed: 110 })
      c.fillStyle = m[0]
      c.fill(oval(-172, -24, 4, 6)); c.fill(oval(-160, -30, 4, 6))
      break
    default: who satisfies never
  }
}

export const head = (album: Album, who: Who, cold: boolean, light: number): Picture => album.get(`head-${who}-${cold}-${light}`, HEADS[who].box, (c) => {
  paintHead(c, who, cold, light)
  for (const [x, y, r] of HEADS[who].eyes) { c.fillStyle = '#fffdf4'; c.strokeStyle = METAL[who][0]; c.lineWidth = 3; c.fill(oval(x, y, r, r)); c.stroke(oval(x, y, r, r)) }
})
export const jaw = (album: Album, cold: boolean): Picture => album.get(`jaw-${cold}`, [-210, -10, 200, 70], (c) => {
  foil(c, blob([[-192, 12], [-110, 16], [-40, 24], [-20, 40], [-60, 52], [-140, 44], [-196, 30]], 0.8), [-196, 4, 180, 52], metalOf('croc', cold, 0.6), { seed: 120, size: 18 })
  c.fillStyle = '#fff'
  for (let i = 0; i < 5; i++) c.fill(poly([[-182 + i * 18, 14], [-170 + i * 18, 15], [-176 + i * 18, 0]]))
})

export type Face = {
  /** Where the eyes look, as a direction. */
  gaze: readonly [number, number]
  /** 0 open, 1 shut. */
  lid: number
  mouth: 'flat' | 'smile' | 'open' | 'chatter' | 'wave' | 'none'
  open: number
  /** Looks at its own nose. */
  cross?: boolean
  wide?: boolean
  pink?: boolean
  cold: boolean
  tongue?: number
}

export function drawHead(pen: Pen, album: Album, who: Who, face: Face, light: number): void {
  const H = HEADS[who]
  if (who === 'croc') pen.at(-30, 30, () => pen.stamp({ ...jaw(album, face.cold), x: -180, y: -40 }), -face.open * 0.5)
  if (who === 'python' && face.tongue) pen.line(path((p) => { const x = -186 - 46 * face.tongue!; p.moveTo(-180, 2); p.lineTo(x, 6); p.lineTo(x - 14, -4); p.moveTo(x, 6); p.lineTo(x - 14, 16) }), '#c21f4b', 5)
  pen.stamp(head(album, who, face.cold, light))
  const pupil = path(() => {}), shine = path(() => {}), lid = path(() => {})
  H.eyes.forEach(([x, y, R], i) => {
    const gx = face.cross ? (i ? -0.62 : 0.62) : face.gaze[0], gy = face.cross ? 0.4 : face.gaze[1]
    const pr = R * (face.wide ? 0.3 : 0.52), px = x + gx * R * 0.42, py = y + gy * R * 0.42
    pupil.moveTo(px + pr, py); pupil.arc(px, py, pr, 0, 7)
    shine.moveTo(px, py - pr * 0.4); shine.arc(px - pr * 0.3, py - pr * 0.4, pr * 0.3, 0, 7)
    if (face.lid > 0) {
      const d = -R * 1.05 + face.lid * R * 2.1, q = Math.asin(Math.max(-1, Math.min(1, d / (R * 1.08))))
      lid.moveTo(x + Math.cos(q) * R * 1.08, y + Math.sin(q) * R * 1.08); lid.arc(x, y, R * 1.08, q, Math.PI - q, true); lid.closePath()
    }
  })
  pen.fill(pupil, '#16122a')
  pen.fill(shine, '#fff')
  if (face.lid > 0) pen.fill(lid, METAL[who][1])
  if (face.pink) { const b = path(() => {}); const [x, y] = H.mouth; b.ellipse(x + 62, y - 14, 17, 11, 0, 0, 7); pen.fill(b, '#ff7fa6', 0.6) }
  const [mx, my] = H.mouth, w = H.mouthW
  if (face.mouth === 'none' || who === 'croc') return
  const mouth = path((p) => {
    switch (face.mouth) {
      case 'smile': p.moveTo(mx - w / 2, my); p.quadraticCurveTo(mx, my + 22, mx + w * 0.7, my - 4); break
      case 'flat': p.moveTo(mx - w / 2, my + 4); p.lineTo(mx + w / 2, my + 2); break
      case 'wave': case 'chatter': for (let i = 0; i <= 8; i++) { const x = mx - w / 2 + (i / 8) * w, y = my + (i % 2 ? 6 : -2); if (i) p.lineTo(x, y); else p.moveTo(x, y) } break
      case 'open': p.ellipse(mx, my + 4, w * 0.34, 4 + face.open * 18, 0, 0, 7); break
      default: break
    }
  })
  if (face.mouth === 'open') pen.fill(mouth, '#5a1230')
  pen.line(mouth, '#2a1230', 4.5)
}

// --- The magpie and the mice ----------------------------------------------------

export const MAGPIE_PARTS = {
  pile: (album: Album): Picture => album.get('pile', [-150, -70, 300, 130], (c) => {
    const bits: [number, number, number, number, keyof typeof METAL][] = [[-96, 22, 52, 34, 'gold'], [92, 20, 56, 36, 'python'], [-40, 30, 56, 34, 'mint'], [40, 32, 54, 30, 'silver'], [0, 10, 70, 40, 'snail'], [-70, 36, 40, 22, 'sausage'], [80, 40, 40, 20, 'duck']]
    bits.forEach(([x, y, w, h, m], i) => foil(c, blob([[x - w, y + h * 0.5], [x - w * 0.7, y - h * 0.5], [x - w * 0.1, y - h], [x + w * 0.6, y - h * 0.6], [x + w, y + h * 0.3], [x + w * 0.3, y + h * 0.8], [x - w * 0.5, y + h * 0.7]], 0.4), [x - w, y - h, w * 2, h * 2], METAL[m], { seed: 130 + i, size: 22 }))
  }),
  body: (album: Album, light: number): Picture => album.get(`mag-body-${light}`, [-100, -120, 260, 180], (c) => {
    foil(c, blob([[30, 0], [80, -18], [150, -50], [156, -34], [100, 20], [40, 36]], 0.6), [26, -56, 134, 96], METAL.ink, { seed: 141, light, size: 18 })
    foil(c, blob([[-70, -40], [-40, -80], [10, -84], [52, -50], [64, 0], [40, 44], [-20, 54], [-62, 24]], 1), [-72, -86, 138, 142], METAL.silver, { seed: 142, light, size: 18, round: 0.6 })
    foil(c, blob([[-14, -76], [34, -78], [66, -40], [92, 16], [40, 26], [4, -10]], 0.9), [-16, -80, 112, 110], METAL.ink, { seed: 143, light, size: 18 })
  }),
  head: (album: Album, light: number): Picture => album.get(`mag-head-${light}`, [-110, -60, 180, 120], (c) => {
    foil(c, blob([[-100, 6], [-44, -18], [-36, 14]], 0.3), [-102, -20, 70, 40], METAL.beak, { seed: 150, light, size: 12 })
    foil(c, blob([[-46, -8], [-30, -42], [8, -52], [42, -30], [48, 12], [20, 40], [-24, 34]], 1), [-48, -54, 98, 96], METAL.ink, { seed: 151, light, size: 16 })
  }),
  beak: (album: Album): Picture => album.get('mag-beak', [-100, 0, 80, 40], (c) => foil(c, blob([[-88, 12], [-42, 8], [-38, 26]], 0.3), [-90, 4, 60, 26], METAL.beak, { seed: 152, size: 10 })),
  scissors: (album: Album, n: number): Picture => album.get(`scissors-${n}`, [-92, -50, 150, 100], (c) => {
    for (const s of [-1, 1]) {
      c.save()
      c.rotate(s * (n ? 0.42 : 0.2))
      foil(c, poly([[-84, 0], [0, -9], [10, 0], [0, 7]]), [-86, -14, 98, 26], METAL.silver, { seed: 160 + s, size: 14 })
      foil(c, blob([[6, -5], [22, -9], [38, -3], [40, 5], [24, 10], [6, 5]]), [4, -10, 40, 22], METAL.sausage, { seed: 163 + s, size: 10 })
      c.restore()
    }
  }),
  mouse: (album: Album, light: number): Picture => album.get(`mouse-${light}`, [-36, -56, 76, 64], (c) => {
    foil(c, blob([[-28, -6], [-18, -24], [4, -34], [24, -20], [28, 2], [-16, 4]], 1), [-30, -36, 60, 42], METAL.mouse, { seed: 170, light, size: 12 })
    for (const x of [-2, 14]) foil(c, oval(x, -36, 10, 11), [x - 10, -48, 20, 22], ['#8a5566', '#d897a6', '#ffd9e0'], { seed: 171, size: 9 })
    c.fillStyle = '#16122a'
    c.fill(oval(-12, -18, 3.4, 4)); c.fill(oval(-29, -6, 4, 3.4))
  }),
  longMouse: (album: Album): Picture => album.get('mouse-long', [-96, -50, 192, 60], (c) => {
    foil(c, blob([[-92, -4], [-76, -22], [-40, -30], [40, -30], [78, -16], [84, 2], [0, 6], [-70, 6]], 0.9), [-94, -34, 180, 42], METAL.mouse, { seed: 174, size: 14, round: 0.6 })
    for (const x of [-60, -42]) foil(c, oval(x, -32, 11, 12), [x - 11, -46, 22, 26], ['#8a5566', '#d897a6', '#ffd9e0'], { seed: 175, size: 9 })
    c.fillStyle = '#16122a'
    c.fill(oval(-74, -16, 3.6, 4.2)); c.fill(oval(-92, -5, 4.4, 3.6))
  }),
  cake: (album: Album): Picture => album.get('cake', [-34, -44, 70, 52], (c) => {
    foil(c, path((p) => p.roundRect(-26, -20, 52, 20, 5)), [-26, -20, 52, 20], ['#7c4a22', '#c98b4e', '#f5cf9a'], { seed: 180, size: 11 })
    foil(c, blob([[-28, -18], [-20, -28], [0, -32], [20, -28], [28, -18], [14, -13], [0, -19], [-14, -13]]), [-28, -34, 56, 22], ['#b9537c', '#f39bbd', '#ffe3ee'], { seed: 181, size: 10 })
    foil(c, oval(0, -36, 7, 7), [-7, -43, 14, 14], METAL.sausage, { seed: 182, size: 6 })
  }),
}
