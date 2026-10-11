// Those in the shop, as painters (ART.md, "The look"): Mumf, Pib and Oon, each
// as the parts the view puts together at the jar or at the window, the sugar
// mouse, and the small things the view stamps (the ghost hand, the glow, the
// puffs). Monsters are matt and soft-edged, so
// nothing but the sweets and the glass shines. Each painter draws once into a
// sprite, about the origin its comment names, in stage units; what moves in a
// face (pupils, lids, brows, a tongue) the view draws live over the sprite.

type C = CanvasRenderingContext2D
const TAU = Math.PI * 2

export const PLUM = '#8a5aa6', PLUM_DARK = '#5b3472', PLUM_LIGHT = '#a983c2'
export const MINT = '#8fd9b6', MINT_DARK = '#5fb58d', MINT_LIGHT = '#a5e3c6'
export const OON = '#ff9a3c', OON_DARK = '#d9661a', OON_LIGHT = '#ffc27a'

/** The colours of one coat of fur: Mumf's own, and the blue it turns when it is given ice. */
export type Coat = { base: string; dark: string; light: string; tuft: string; pale: string; arm: string }
export const PLUM_COAT: Coat = { base: PLUM, dark: PLUM_DARK, light: PLUM_LIGHT, tuft: '#c6a6dc', pale: '#b592cc', arm: '#74488f' }
export const COLD_COAT: Coat = { base: '#7fb0e2', dark: '#4a78b8', light: '#b3d5f4', tuft: '#e2f1ff', pale: '#c4e0f8', arm: '#5f8fcb' }
const CREAM = '#fff3d6'

/** A shaggy round outline: tufts all the way round. */
function shaggy(c: C, cx: number, cy: number, rx: number, ry: number, tufts: number, from = 0, to = TAU): void {
  for (let i = 0; i <= tufts; i++) {
    const a = from + ((to - from) * i) / tufts
    const mid = from + ((to - from) * (i - 0.5)) / tufts
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry
    if (i === 0) c.moveTo(x, y)
    else c.quadraticCurveTo(cx + Math.cos(mid) * rx * 1.07, cy + Math.sin(mid) * ry * 1.07, x, y)
  }
}

/** Short strokes of fur inside whatever was last clipped. */
function strokesOfFur(c: C, grain: () => number, x: number, y: number, w: number, h: number, n: number, dark: string, light: string): void {
  c.lineCap = 'round'
  c.lineWidth = 3
  for (let i = 0; i < n; i++) {
    const px = x + grain() * w, py = y + grain() * h
    c.strokeStyle = grain() < 0.5 ? dark : light
    c.globalAlpha = 0.28
    c.beginPath()
    c.moveTo(px, py)
    c.quadraticCurveTo(px - 3, py + 8, px - 1 + grain() * 4, py + 15)
    c.stroke()
  }
  c.globalAlpha = 1
}

/** Mumf from the shoulders down, with its arms bent onto the counter, its fork and its tail. Origin: the counter's back edge under its middle. */
export function paintMumfBody(c: C, grain: () => number, coat: Coat = PLUM_COAT): void {
  // The tail, lying along the counter.
  c.strokeStyle = coat.dark
  c.lineCap = 'round'
  c.lineWidth = 46
  c.beginPath()
  c.moveTo(200, 70)
  c.bezierCurveTo(150, 132, 20, 142, -62, 112)
  c.stroke()
  c.strokeStyle = coat.base
  c.lineWidth = 34
  c.stroke()
  // The heap of it.
  c.save()
  c.beginPath()
  c.rect(-400, -400, 800, 400)
  c.clip()
  c.beginPath()
  shaggy(c, 20, 0, 216, 252, 26, Math.PI, TAU)
  c.closePath()
  const fur = c.createRadialGradient(-60, -200, 20, 20, -80, 300)
  fur.addColorStop(0, coat.light)
  fur.addColorStop(0.6, coat.base)
  fur.addColorStop(1, coat.dark)
  c.fillStyle = fur
  c.fill()
  c.clip()
  strokesOfFur(c, grain, -200, -250, 440, 250, 130, coat.dark, coat.tuft)
  c.fillStyle = coat.pale
  c.globalAlpha = 0.75
  c.beginPath()
  c.ellipse(0, -84, 104, 84, 0, 0, TAU)
  c.fill()
  c.globalAlpha = 1
  c.restore()
  // A checked napkin under the chin.
  c.save()
  c.beginPath()
  c.moveTo(-78, -236)
  c.lineTo(82, -236)
  c.lineTo(4, -128)
  c.closePath()
  c.fillStyle = '#fffaf2'
  c.fill()
  c.clip()
  c.fillStyle = 'rgba(226, 128, 108, 0.6)'
  for (let i = -5; i < 6; i++) {
    c.fillRect(i * 28, -240, 12, 120)
    c.fillRect(-90, -236 + (i + 5) * 24, 180, 9)
  }
  c.restore()
  // The fork, upright behind its far paw.
  c.fillStyle = '#b9bcc4'
  c.beginPath()
  c.roundRect(97, -190, 10, 170, 5)
  c.fill()
  c.beginPath()
  c.roundRect(83, -214, 38, 26, 8)
  c.fill()
  for (const x of [85, 98, 111]) {
    c.beginPath()
    c.roundRect(x, -250, 8, 42, 4)
    c.fill()
  }
  c.fillStyle = 'rgba(255, 255, 255, 0.6)'
  c.fillRect(99, -184, 3, 130)
  // Two arms, each bent at an elbow that sticks out: a thick upper arm, and a thinner forearm down to the paw on the counter.
  c.lineCap = 'round'
  for (const side of [-1, 1]) {
    const paw = MUMF_PAWS[side < 0 ? 0 : 1]
    const shoulder = { x: 20 + side * 146, y: -188 }, elbow = { x: 20 + side * 190, y: -92 }
    const upper = () => {
      c.beginPath()
      c.moveTo(shoulder.x, shoulder.y)
      c.quadraticCurveTo(elbow.x + side * 4, shoulder.y + 14, elbow.x, elbow.y)
    }
    const fore = () => {
      c.beginPath()
      c.moveTo(elbow.x, elbow.y)
      c.quadraticCurveTo(elbow.x - side * 6, paw.y - 26, paw.x + side * 8, paw.y - 12)
    }
    c.strokeStyle = coat.arm
    upper()
    c.lineWidth = 70
    c.stroke()
    fore()
    c.lineWidth = 54
    c.stroke()
    c.strokeStyle = coat.base
    upper()
    c.lineWidth = 62
    c.stroke()
    fore()
    c.lineWidth = 46
    c.stroke()
    // A tuft at the elbow.
    c.fillStyle = coat.dark
    for (let i = 0; i < 3; i++) {
      const ty = elbow.y - 22 + i * 18
      c.beginPath()
      c.moveTo(elbow.x + side * 22, ty)
      c.lineTo(elbow.x + side * 36, ty + 12)
      c.lineTo(elbow.x + side * 20, ty + 16)
      c.fill()
    }
    c.fillStyle = coat.light
    c.beginPath()
    c.ellipse(paw.x, paw.y, 42, 24, 0, 0, TAU)
    c.fill()
  }
}

/** Where Mumf's paws lie on the counter, about the body's origin: the near one and the far one. Its toes are drawn live. */
export const MUMF_PAWS = [{ x: -166, y: -8 }, { x: 102, y: -18 }] as const

/** Where Mumf's eyes sit in its head, about the head's middle, and how big they are. */
export const MUMF_EYES = [{ x: -100, y: -80, r: 38 }, { x: 10, y: -90, r: 43 }] as const
/** Where the jaw hinges, about the head's middle, and where its tip is, about the hinge. */
export const MUMF_HINGE = { x: -8, y: 36 } as const
export const MUMF_JAW_TIP = { x: -182, y: -4 } as const
/** Its nose, and where its two ears grow from, about the head's middle. */
export const MUMF_NOSE = { x: -166, y: -44 } as const
export const MUMF_EARS = [{ x: 96, y: -118 }, { x: 156, y: -52 }] as const

/** Mumf's head: fur, horns, the snout, the whites of its eyes and the dark of its mouth. Origin: the head's middle. */
export function paintMumfHead(c: C, grain: () => number, coat: Coat = PLUM_COAT): void {
  c.fillStyle = CREAM
  for (const [x, lean] of [[-64, -0.3], [60, 0.3]]) {
    c.beginPath()
    c.moveTo(x - 17, -128)
    c.quadraticCurveTo(x + lean * 20, -196, x + lean * 70, -176)
    c.quadraticCurveTo(x + 10 + lean * 20, -160, x + 17, -128)
    c.fill()
  }
  c.save()
  c.beginPath()
  shaggy(c, 0, 0, 170, 148, 30)
  c.closePath()
  const fur = c.createRadialGradient(-70, -90, 20, 0, 0, 200)
  fur.addColorStop(0, coat.light)
  fur.addColorStop(0.62, coat.base)
  fur.addColorStop(1, coat.dark)
  c.fillStyle = fur
  c.fill()
  c.clip()
  strokesOfFur(c, grain, -175, -155, 350, 310, 150, coat.dark, coat.tuft)
  // The dark of the mouth, under the snout.
  c.fillStyle = '#4a1730'
  c.beginPath()
  c.ellipse(-106, 34, 88, 52, 0, 0, TAU)
  c.fill()
  c.fillStyle = '#7a2a48'
  c.beginPath()
  c.ellipse(-96, 62, 62, 22, 0, 0, TAU)
  c.fill()
  c.restore()
  // The snout and the nose.
  c.fillStyle = coat.pale
  c.beginPath()
  c.ellipse(-126, -22, 66, 40, -0.08, 0, TAU)
  c.fill()
  c.fillStyle = '#4a1730'
  c.beginPath()
  c.ellipse(MUMF_NOSE.x, MUMF_NOSE.y, 17, 12, -0.2, 0, TAU)
  c.fill()
  c.fillStyle = 'rgba(255, 255, 255, 0.4)'
  c.beginPath()
  c.ellipse(MUMF_NOSE.x - 5, MUMF_NOSE.y - 4, 6, 3, -0.2, 0, TAU)
  c.fill()
  for (const eye of MUMF_EYES) {
    c.fillStyle = 'rgba(70, 30, 90, 0.35)'
    c.beginPath()
    c.arc(eye.x, eye.y + 3, eye.r + 3, 0, TAU)
    c.fill()
    c.fillStyle = '#fffdf6'
    c.beginPath()
    c.arc(eye.x, eye.y, eye.r, 0, TAU)
    c.fill()
  }
}

/** Mumf's lower jaw with its two teeth. Origin: the hinge. */
export function paintMumfJaw(c: C, grain: () => number, coat: Coat = PLUM_COAT): void {
  c.fillStyle = CREAM
  for (const x of [-152, -106]) {
    c.beginPath()
    c.roundRect(x, -38, 24, 44, 9)
    c.fill()
  }
  c.save()
  c.beginPath()
  c.moveTo(14, -10)
  c.quadraticCurveTo(-90, 6, MUMF_JAW_TIP.x, MUMF_JAW_TIP.y - 4)
  c.quadraticCurveTo(-196, 30, -150, 58)
  c.quadraticCurveTo(-70, 84, 24, 46)
  c.closePath()
  c.fillStyle = coat.base
  c.fill()
  c.clip()
  strokesOfFur(c, grain, -200, -10, 230, 100, 40, coat.dark, coat.tuft)
  c.strokeStyle = coat.pale
  c.lineWidth = 14
  c.beginPath()
  c.moveTo(14, -10)
  c.quadraticCurveTo(-90, 6, MUMF_JAW_TIP.x, MUMF_JAW_TIP.y - 4)
  c.stroke()
  c.restore()
}

/** Mumf's paw with two fingers out, to pinch its nose shut. Origin: between the fingertips. */
export function paintMumfPinch(c: C): void {
  c.fillStyle = PLUM_LIGHT
  c.beginPath()
  c.ellipse(4, 44, 30, 26, 0, 0, TAU)
  c.fill()
  c.strokeStyle = PLUM_LIGHT
  c.lineCap = 'round'
  c.lineWidth = 17
  c.beginPath()
  c.moveTo(-10, 36)
  c.quadraticCurveTo(-26, 12, -12, 0)
  c.moveTo(18, 34)
  c.quadraticCurveTo(30, 10, 14, -2)
  c.stroke()
  c.fillStyle = CREAM
  for (const [x, y] of [[-12, -2], [14, -4]]) {
    c.beginPath()
    c.ellipse(x, y, 6, 5, 0, 0, TAU)
    c.fill()
  }
}

/** Where Pib's eyes stand on their stalks and where the stalks grow from, about the head's middle; its mouth, too. */
/**
 * Pib's neck from its shoulders to the middle of its head, at rest and stretched for cheese: half as long
 * again, which is as far as it goes with its eyes still inside the frame.
 */
export const PIB_NECK = { rest: { x: -58, y: -76 }, long: { x: -18, y: -142 } } as const
export const PIB_EYES = [{ x: -44, y: -98, r: 23 }, { x: 44, y: -102, r: 23 }] as const
export const PIB_STALKS = [{ x: -30, y: -46 }, { x: 30, y: -46 }] as const
export const PIB_MOUTH = { x: 0, y: 28 } as const

/** Pib's head, its nose pale and flat. The neck, the stalks, the eyes and the mouth are drawn live. Origin: the head's middle. */
export function paintPibHead(c: C, grain: () => number): void {
  const skin = c.createLinearGradient(-80, 0, 80, 0)
  skin.addColorStop(0, MINT_LIGHT)
  skin.addColorStop(1, MINT_DARK)
  c.fillStyle = skin
  c.beginPath()
  c.ellipse(0, 0, 80, 58, 0, 0, TAU)
  c.fill()
  c.fillStyle = 'rgba(60, 150, 110, 0.4)'
  for (let i = 0; i < 7; i++) {
    const a = grain() * TAU, d = grain() * 0.8
    c.beginPath()
    c.ellipse(Math.cos(a) * 64 * d, Math.sin(a) * 44 * d, 4 + grain() * 4, 3 + grain() * 3, 0, 0, TAU)
    c.fill()
  }
  // Cheeks and a pale flat nose.
  c.fillStyle = 'rgba(215, 245, 232, 0.8)'
  for (const x of [-50, 50]) {
    c.beginPath()
    c.ellipse(x, 8, 21, 14, 0, 0, TAU)
    c.fill()
  }
  c.beginPath()
  c.ellipse(0, -8, 29, 19, 0, 0, TAU)
  c.fill()
  c.fillStyle = '#3f8f6c'
  for (const x of [-9, 9]) {
    c.beginPath()
    c.ellipse(x, -8, 4, 6, 0, 0, TAU)
    c.fill()
  }
}

/** Pib from the neck down, sitting: a small pear of a body, two thin arms folded on it and two legs that dangle. Origin: the middle of the seat. */
export function paintPibBody(c: C, grain: () => number): void {
  c.strokeStyle = MINT_DARK
  c.lineCap = 'round'
  c.lineWidth = 18
  c.beginPath()
  for (const x of [-30, 26]) {
    c.moveTo(x, -6)
    c.quadraticCurveTo(x - 10, 50, x - 4, 92)
  }
  c.stroke()
  c.fillStyle = MINT_LIGHT
  for (const x of [-34, 22]) {
    c.beginPath()
    c.ellipse(x - 8, 98, 20, 11, 0, 0, TAU)
    c.fill()
  }
  const skin = c.createLinearGradient(-80, 0, 80, 0)
  skin.addColorStop(0, MINT_LIGHT)
  skin.addColorStop(1, MINT_DARK)
  c.fillStyle = skin
  c.beginPath()
  c.moveTo(-26, -118)
  c.bezierCurveTo(-52, -100, -84, -40, -72, -6)
  c.bezierCurveTo(-60, 14, 62, 14, 74, -6)
  c.bezierCurveTo(86, -40, 34, -100, 10, -118)
  c.closePath()
  c.fill()
  c.fillStyle = 'rgba(215, 245, 232, 0.7)'
  c.beginPath()
  c.ellipse(-4, -40, 40, 36, 0, 0, TAU)
  c.fill()
  c.fillStyle = 'rgba(60, 150, 110, 0.4)'
  for (let i = 0; i < 6; i++) {
    c.beginPath()
    c.ellipse(-56 + grain() * 116, -84 + grain() * 76, 4 + grain() * 4, 3 + grain() * 3, 0, 0, TAU)
    c.fill()
  }
  // Thin arms, folded.
  c.strokeStyle = MINT_DARK
  c.lineWidth = 12
  c.beginPath()
  c.moveTo(-58, -70)
  c.quadraticCurveTo(-76, -30, -20, -24)
  c.moveTo(56, -70)
  c.quadraticCurveTo(76, -34, 14, -34)
  c.stroke()
}

/** A flat hand with three fingers, in one monster's colours. Origin: its palm. */
export function paintPaw(c: C, colour: string, pale: string): void {
  c.fillStyle = colour
  c.beginPath()
  c.ellipse(0, 4, 17, 15, 0, 0, TAU)
  c.fill()
  for (const [x, y] of [[-13, -12], [0, -17], [13, -12]]) {
    c.beginPath()
    c.ellipse(x, y, 7, 10, x * 0.03, 0, TAU)
    c.fill()
  }
  c.fillStyle = pale
  c.beginPath()
  c.ellipse(0, 5, 10, 9, 0, 0, TAU)
  c.fill()
}

/** Where Oon's three eyes sit, its mouth, the root of its tongue and its nostrils, about the blob's middle. */
export const OON_EYES = [{ x: -52, y: -60, r: 21 }, { x: 4, y: -70, r: 23 }, { x: 60, y: -58, r: 21 }] as const
export const OON_MOUTH = { x: -100, y: -6 } as const
export const OON_TONGUE = { x: -114, y: 8 } as const
export const OON_NOSE = { x: -124, y: -44 } as const
/** Half its width and half its height. */
export const OON_HALF = { x: 160, y: 100 } as const

/** Oon: a wide, flat blob that hangs over both sides of its seat, with the whites of three eyes and an open mouth. Origin: its middle. */
export function paintOon(c: C, grain: () => number): void {
  const { x: rx, y: ry } = OON_HALF
  c.save()
  c.beginPath()
  // A dome that droops into a lobe at each end.
  c.moveTo(-rx, 30)
  c.bezierCurveTo(-rx - 2, -60, -90, -ry, 0, -ry)
  c.bezierCurveTo(90, -ry, rx + 2, -60, rx, 30)
  c.bezierCurveTo(rx, 80, rx - 40, ry + 4, rx - 70, ry - 16)
  c.bezierCurveTo(60, ry - 34, -60, ry - 34, -rx + 70, ry - 16)
  c.bezierCurveTo(-rx + 40, ry + 4, -rx, 80, -rx, 30)
  c.closePath()
  const skin = c.createRadialGradient(-50, -60, 10, 0, 0, 190)
  skin.addColorStop(0, OON_LIGHT)
  skin.addColorStop(0.6, OON)
  skin.addColorStop(1, OON_DARK)
  c.fillStyle = skin
  c.fill()
  c.clip()
  c.fillStyle = 'rgba(190, 80, 10, 0.3)'
  for (let i = 0; i < 16; i++) {
    c.beginPath()
    c.ellipse(-150 + grain() * 300, -20 + grain() * 110, 5 + grain() * 7, 4 + grain() * 5, 0, 0, TAU)
    c.fill()
  }
  c.fillStyle = 'rgba(255, 226, 180, 0.5)'
  c.beginPath()
  c.ellipse(30, 50, 90, 26, 0, 0, TAU)
  c.fill()
  // The mouth, open, at the end nearest the jar.
  c.fillStyle = '#5a1f10'
  c.beginPath()
  c.ellipse(OON_MOUTH.x, OON_MOUTH.y, 44, 28, -0.1, 0, TAU)
  c.fill()
  c.fillStyle = '#8a3320'
  c.beginPath()
  c.ellipse(OON_MOUTH.x + 4, OON_MOUTH.y + 14, 30, 11, -0.1, 0, TAU)
  c.fill()
  c.restore()
  c.fillStyle = '#b5470c'
  for (const x of [-7, 7]) {
    c.beginPath()
    c.ellipse(OON_NOSE.x + x, OON_NOSE.y, 3.5, 5, 0, 0, TAU)
    c.fill()
  }
  for (const eye of OON_EYES) {
    c.fillStyle = 'rgba(150, 60, 10, 0.35)'
    c.beginPath()
    c.arc(eye.x, eye.y + 2, eye.r + 3, 0, TAU)
    c.fill()
    c.fillStyle = '#fffdf6'
    c.beginPath()
    c.arc(eye.x, eye.y, eye.r, 0, TAU)
    c.fill()
  }
}

/** The sugar mouse, nose to the right. Origin: its middle. */
export function paintMouse(c: C, grain: () => number): void {
  c.fillStyle = 'rgba(120, 70, 30, 0.2)'
  c.beginPath()
  c.ellipse(0, 22, 40, 6, 0, 0, TAU)
  c.fill()
  c.fillStyle = '#f7a9ba'
  for (const [x, y] of [[-10, -22], [8, -20]]) {
    c.beginPath()
    c.arc(x, y, 12, 0, TAU)
    c.fill()
  }
  c.save()
  c.beginPath()
  c.moveTo(44, 8)
  c.bezierCurveTo(30, -26, -40, -30, -40, 2)
  c.bezierCurveTo(-40, 24, 20, 26, 44, 8)
  c.closePath()
  const sugar = c.createRadialGradient(-6, -12, 4, 0, 0, 50)
  sugar.addColorStop(0, '#ffe3ea')
  sugar.addColorStop(1, '#ffb3c4')
  c.fillStyle = sugar
  c.fill()
  c.clip()
  c.fillStyle = 'rgba(255, 255, 255, 0.8)'
  for (let i = 0; i < 60; i++) c.fillRect(-40 + grain() * 84, -28 + grain() * 52, 1.4, 1.4)
  c.restore()
  c.fillStyle = '#ffd4dd'
  for (const [x, y] of [[-10, -22], [8, -20]]) {
    c.beginPath()
    c.arc(x, y, 6.5, 0, TAU)
    c.fill()
  }
  c.fillStyle = '#3b2314'
  c.beginPath()
  c.arc(22, -4, 3.4, 0, TAU)
  c.fill()
  c.fillStyle = '#e8647f'
  c.beginPath()
  c.arc(44, 8, 4, 0, TAU)
  c.fill()
}

/** The ghost hand of the idle ladder: a pale hand with one finger out. Origin: the tip of that finger. */
export function paintHand(c: C): void {
  c.fillStyle = 'rgba(255, 255, 255, 0.92)'
  c.strokeStyle = 'rgba(90, 60, 40, 0.55)'
  c.lineWidth = 3
  c.lineJoin = 'round'
  c.beginPath()
  c.roundRect(-11, 0, 22, 52, 11)
  c.roundRect(-30, 34, 58, 50, 20)
  c.fill()
  c.beginPath()
  c.moveTo(-11, 36)
  c.lineTo(-11, 11)
  c.arc(0, 11, 11, Math.PI, 0)
  c.lineTo(11, 36)
  c.quadraticCurveTo(28, 34, 28, 54)
  c.lineTo(28, 64)
  c.arc(8, 64, 20, 0, Math.PI / 2)
  c.lineTo(-10, 84)
  c.arc(-10, 64, 20, Math.PI / 2, Math.PI)
  c.lineTo(-30, 54)
  c.quadraticCurveTo(-30, 38, -11, 36)
  c.stroke()
}

/** The idle glow: a warm gold ring that reads on wallpaper, glass and wood. One unit across the radius. */
export function paintGlow(c: C, radius: number): void {
  const ring = c.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius)
  ring.addColorStop(0, 'rgba(255, 207, 64, 0)')
  ring.addColorStop(0.62, 'rgba(255, 207, 64, 0.85)')
  ring.addColorStop(0.78, 'rgba(255, 180, 40, 0.55)')
  ring.addColorStop(1, 'rgba(255, 180, 40, 0)')
  c.fillStyle = ring
  c.beginPath()
  c.arc(0, 0, radius, 0, TAU)
  c.fill()
}

/** A soft round puff in one colour: smoke, mist, a spark's glow, a patch of breath on glass. */
export function paintSoft(c: C, radius: number, colour: string): void {
  const soft = c.createRadialGradient(0, 0, 0, 0, 0, radius)
  soft.addColorStop(0, colour)
  soft.addColorStop(1, colour.replace(/[\d.]+\)$/, '0)'))
  c.fillStyle = soft
  c.beginPath()
  c.arc(0, 0, radius, 0, TAU)
  c.fill()
}

/** A small flame, for a snack with fire in it. Origin: its foot. */
export function paintFlame(c: C, tall: number): void {
  const tongue = (h: number, colour: string) => {
    c.fillStyle = colour
    c.beginPath()
    c.moveTo(0, -h)
    c.bezierCurveTo(h * 0.7, -h * 0.35, h * 0.5, h * 0.05, 0, 0)
    c.bezierCurveTo(-h * 0.55, h * 0.05, -h * 0.5, -h * 0.3, -h * 0.12, -h * 0.5)
    c.bezierCurveTo(-h * 0.05, -h * 0.72, -h * 0.1, -h * 0.86, 0, -h)
    c.fill()
  }
  tongue(tall, '#ff7a1a')
  tongue(tall * 0.6, '#ffe35a')
}
