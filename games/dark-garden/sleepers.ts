import { JOKE, type Kind, type Sleeper } from './cast'
import { eye, line, oval, piece, shine, type G } from './glass'

// Sixteen who sleep, each at home in its kind of place, the foot of the place
// at (0, 0). Each has one joke, told by `p`, 0 to 1, and a life of its own
// between: its own breath, blink and way of looking about.

type Look = { x: number; y: number }
export type Life = {
  /** 0..1 through its joke, or 1 when it is over. */
  p: number
  /** Eyes: 1 open, 0 shut. It opens them as its glass opens. */
  open: number
  look: Look
  t: number
}

const hump = (p: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, p)))
const span = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)))
/** Up, held, and down again. */
const plateau = (p: number, a: number, b: number, c: number, d: number) => Math.min(span(p, a, b), 1 - span(p, c, d))

function at(g: G, x: number, y: number, turn: number, sx: number, sy: number, draw: () => void): void {
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  g.scale(sx, sy)
  draw()
  g.restore()
}

/** Asleep under the glass: a curled, smiling, breathing lump, the same for every place of its kind. */
export function asleep(g: G, kind: Kind, t: number, stir: number): void {
  const breath = Math.sin(t * 1.4) * 3, y = kind === 'tree' ? -62 : kind === 'pond' ? -34 : kind === 'burrow' ? -24 : -66
  const roll = Math.sin(stir * 22) * stir * 0.25
  at(g, 0, y, roll, 1, 1 + breath * 0.012, () => {
    oval(g, 0, 0, 32, 25, '#343c86', 4)
    line(g, 'M-18 -4 C -15 2 -8 2 -5 -4 M5 -4 C 8 2 15 2 18 -4', 3.5, '#aab2f0')
    line(g, 'M-7 8 C -3 12 3 12 7 8', 3, '#aab2f0')
  })
}

export function sleeper(g: G, who: Sleeper, life: Life): void {
  DRAW[who](g, life)
}

export function progress(who: Sleeper, joke: number): number {
  return joke < 0 ? 0 : Math.min(1, joke / JOKE[who])
}

const DRAW: Readonly<Record<Sleeper, (g: G, l: Life) => void>> = {
  toad(g, l) {
    const puff = plateau(l.p, 0.25, 0.5, 0.56, 0.6), burp = span(l.p, 0.56, 1), croak = Math.sin(l.t * 2.2) * 0.03
    at(g, 0, -20, 0, 1 + puff * 0.18 + croak, 1 + puff * 0.1 - croak, () => {
      piece(g, 'M-58 -4 C -74 -50 -40 -78 0 -78 C 40 -78 74 -50 58 -4 C 30 8 -30 8 -58 -4 Z', '#7d9a3a', 5)
      piece(g, 'M-36 0 C -44 -22 -20 -38 0 -38 C 22 -38 44 -22 36 0 C 20 6 -20 6 -36 0 Z', '#d9d48a', 4)
      oval(g, -34, -78, 22, 20, '#8dab44', 5)
      oval(g, 34, -78, 22, 20, '#8dab44', 5)
      // One eye at a time.
      eye(g, -34, -80, 14, l.open * (l.p < 0.1 ? 0 : 1) * (Math.sin(l.t * 0.9) > 0.97 ? 0 : 0.8), l.look)
      eye(g, 34, -80, 14, l.open * (l.p < 0.3 ? 0 : 1) * 0.62, l.look)
      line(g, burp > 0 && burp < 0.3 ? 'M-12 -44 C -4 -36 8 -36 12 -44' : 'M-40 -44 C -20 -52 20 -52 40 -44', 5)
      if (burp > 0 && burp < 0.35) oval(g, 0, -44, 16, 12, '#5a2438', 4)
      oval(g, -20, -60, 5, 4, '#5f7a28', 0); oval(g, 14, -66, 6, 4, '#5f7a28', 0)
    })
    if (burp > 0.02 && burp < 1) { g.globalAlpha = 1 - burp * 0.5; oval(g, burp * 26, -66 - burp * 110, 8 + burp * 26, 8 + burp * 26, 'rgba(190,240,250,0.5)', 3); g.globalAlpha = 1; shine(g, burp * 26 - 8, -74 - burp * 110, 6, 4, 0.5, 0.8) }
  },
  duckling(g, l) {
    const shake = Math.sin(l.p * 60) * hump(l.p) * 0.3, spin = span(l.p, 0.3, 1) * Math.PI * 4 * (l.p < 1 ? 1 : 0)
    at(g, 0, -20 + Math.sin(l.t * 2.6) * 3, shake * 0.5, 1, 1, () => {
      piece(g, 'M-58 -22 C -66 -44 -48 -46 -40 -36 C -10 -44 34 -44 44 -18 C 34 8 -40 10 -58 -22 Z', '#f6cf3a', 5)
      piece(g, 'M-30 -24 C -10 -34 14 -28 18 -16 C 4 -2 -22 -4 -30 -24 Z', '#e0ac22', 4)
      at(g, 26, -62, shake, 1, 1, () => {
        oval(g, 0, 0, 34, 32, '#f9dc57', 5)
        piece(g, 'M22 -4 C 40 -8 54 0 56 6 C 44 14 30 12 20 8 Z', '#ee7f25', 4)
        eye(g, 4, -8, 11, l.open, l.look)
        at(g, -8, -26, -0.3 + spin, 1, 1, () => {
          piece(g, 'M-24 6 C -18 -26 14 -38 40 -22 C 32 -16 24 -12 22 4 C 8 -4 -10 -2 -24 6 Z', '#8f6fd6', 4)
          oval(g, 42, -20, 9, 9, '#ffffff', 3)
        })
      })
    })
  },
  pike(g, l) {
    const p = l.p < 1 ? l.p : 1, leap = hump(p), turn = p < 1 ? p * Math.PI * 2 : 0
    at(g, 0, -34 - leap * 92, turn, 1, 1, () => {
      const bend = leap * 22
      piece(g, `M-66 ${-6 - bend} C -40 ${-34} 20 ${-34} 60 ${-8 - bend} L72 ${-2 - bend} L60 ${6 - bend} C 24 ${22} -30 ${22} -66 ${4 - bend} Z`, '#5fa58a', 5)
      piece(g, `M-40 8 C -16 18 22 18 48 ${6 - bend * 0.6} C 24 2 -14 2 -40 8 Z`, '#e7e7b0', 4)
      piece(g, `M-62 ${-2 - bend} L-96 ${-26 - bend} L-86 ${0 - bend} L-96 ${22 - bend} Z`, '#3f8a7a', 4)
      piece(g, 'M-10 -26 C 0 -46 22 -44 26 -24 Z', '#3f8a7a', 4)
      line(g, `M44 ${0 - bend * 0.8} L72 ${-2 - bend}`, 4)
      eye(g, 38, -14 - bend * 0.7, 11, l.open * (p < 1 ? 1.2 : 1), l.look)
      for (const x of [-24, -4, 14]) oval(g, x, -8, 4, 3, '#2f6f62', 0)
    })
    if (leap > 0.1) { oval(g, -20, -22, 26 * leap, 7, '#c7f0fa', 3); oval(g, 26, -18, 18 * leap, 5, '#c7f0fa', 3) }
  },
  turtle(g, l) {
    const out = plateau(l.p, 0.05, 0.3, 0.62, 0.7) * (l.p < 1 ? 1 : 0) + (l.p >= 1 ? 0.75 : 0) + (l.p > 0.8 && l.p < 1 ? span(l.p, 0.85, 1) * 0.75 : 0)
    at(g, 0, -18, 0, 1, 1, () => {
      for (const x of [-46, 46]) oval(g, x * (0.6 + out * 0.5), -2, 20 * out + 2, 12, '#8fbf5a', 4)
      at(g, 48 + out * 22, -34 - out * 18, 0.1, 1, 1, () => {
        oval(g, 0, 0, 26, 23, '#a4cf68', 5)
        eye(g, 6, -6, 10, l.open * Math.min(1, out * 1.4), l.look)
        line(g, 'M6 10 C 12 14 18 12 22 7', 3.5)
      })
      piece(g, 'M-70 -6 C -70 -66 -30 -84 0 -84 C 34 -84 70 -62 70 -6 C 40 6 -40 6 -70 -6 Z', '#9a6a3a', 5)
      piece(g, 'M-22 -28 L0 -44 L22 -28 L16 -6 L-16 -6 Z', '#d9a85a', 4)
      line(g, 'M0 -44 L0 -82 M-22 -28 L-58 -44 M22 -28 L58 -44 M-16 -6 L-22 2 M16 -6 L22 2', 4)
      shine(g, -26, -60, 14, 6, -0.5, 0.35)
    })
  },
  owl(g, l) {
    const turn = l.p < 1 ? span(l.p, 0.15, 0.8) : 0, side = Math.cos(turn * Math.PI * 2)
    piece(g, 'M-34 -22 C -44 -60 -38 -100 0 -100 C 38 -100 44 -60 34 -22 C 18 -14 -18 -14 -34 -22 Z', '#9b6b3f', 5)
    piece(g, 'M-20 -26 C -24 -50 -14 -62 0 -62 C 16 -62 24 -50 20 -26 C 8 -20 -8 -20 -20 -26 Z', '#e7cd9a', 4)
    line(g, 'M-8 -48 L-2 -42 L4 -48 M-8 -36 L-2 -30 L4 -36', 3)
    at(g, 0, -100, Math.sin(l.t * 0.8) * 0.08, side < 0 ? Math.min(-0.25, side) : Math.max(0.25, side), 1, () => {
      piece(g, 'M-44 0 C -50 -20 -52 -40 -44 -52 C -30 -40 30 -40 44 -52 C 52 -40 50 -20 44 0 C 32 22 -32 22 -44 0 Z', '#b0804c', 5)
      if (side > -0.1) {
        oval(g, -20, -12, 21, 21, '#f3e2bb', 4); oval(g, 20, -12, 21, 21, '#f3e2bb', 4)
        eye(g, -20, -12, 15, l.open, l.look, 0.6); eye(g, 20, -12, 15, l.open, l.look, 0.6)
        piece(g, 'M-7 -4 L7 -4 L0 14 Z', '#f0a52c', 4)
      } else line(g, 'M-20 -24 L-12 -16 L-4 -24 M4 -24 L12 -16 L20 -24 M-8 -8 L0 0 L8 -8', 3)
    })
    for (const x of [-14, 14]) piece(g, `M${x - 10} -20 L${x} -26 L${x + 10} -20 L${x + 6} -12 L${x - 6} -12 Z`, '#f0a52c', 3)
  },
  bat(g, l) {
    const wide = plateau(l.p, 0.1, 0.3, 0.5, 0.65) * (l.p < 1 ? 1 : 0), hide = l.p < 1 ? plateau(l.p, 0.55, 0.7, 0.88, 1) : 0
    const sway = Math.sin(l.t * 1.5) * 0.1
    at(g, 0, -116, sway, 1, 1, () => {
      line(g, 'M-8 0 L-8 12 M8 0 L8 12', 5)
      for (const side of [-1, 1]) {
        g.save(); g.scale(side, 1)
        const w = 24 + wide * 78
        piece2(g, w, '#6b4a9a')
        g.restore()
      }
      oval(g, 0, 44, 24, 34, '#8a63b8', 5)
      at(g, 0, 78, 0, 1, 1, () => {
        piece(g, 'M-26 8 L-22 36 L-8 18 Z', '#8a63b8', 4); piece(g, 'M26 8 L22 36 L8 18 Z', '#8a63b8', 4)
        oval(g, 0, 0, 27, 23, '#9d77cc', 5)
        eye(g, -11, 4, 10, l.open * (1 - hide), l.look); eye(g, 11, 4, 10, l.open * (1 - hide), l.look)
        piece(g, 'M-8 -12 L-4 -20 L0 -12 L4 -20 L8 -12 Z', '#ffffff', 2)
        if (hide < 0.5) { oval(g, -18, -6, 5, 4, '#e88ab0', 0); oval(g, 18, -6, 5, 4, '#e88ab0', 0) }
      })
      if (hide > 0.05) {
        g.globalAlpha = Math.min(1, hide * 3)
        piece(g, 'M0 26 C -30 30 -38 60 -30 96 C -18 104 -6 104 2 96 Z', '#6b4a9a', 5); piece(g, 'M0 26 C 30 30 38 60 30 96 C 18 104 6 104 -2 96 Z', '#7a57aa', 5)
        g.globalAlpha = 1
        if (hide > 0.7) eye(g, 20, 78, 7, l.open, l.look)
      }
    })
  },
  squirrel(g, l) {
    const fill = plateau(l.p, 0, 0.6, 0.62, 0.68) * (l.p < 1 ? 1 : 0), pop = span(l.p, 0.62, 1)
    at(g, 34, -34, Math.sin(l.t * 1.8) * 0.08 - 0.1, 1, 1, () => piece(g, 'M0 14 C 34 10 48 -24 34 -56 C 24 -76 -6 -74 -8 -54 C 6 -60 14 -48 8 -34 C 2 -20 -14 -6 0 14 Z', '#c9602a', 5))
    piece(g, 'M-30 -22 C -36 -54 -22 -76 2 -76 C 26 -76 34 -50 28 -22 C 14 -14 -16 -14 -30 -22 Z', '#d9752f', 5)
    piece(g, 'M-14 -22 C -18 -44 -8 -58 2 -58 C 14 -58 18 -42 14 -22 Z', '#f6dcae', 4)
    piece(g, 'M-28 -112 L-22 -138 L-8 -118 Z', '#d9752f', 4); piece(g, 'M28 -112 L22 -138 L8 -118 Z', '#d9752f', 4)
    oval(g, 0, -96, 34, 28, '#e2843a', 5)
    oval(g, -22, -84, 14 + fill * 24, 12 + fill * 20, '#f6dcae', 4); oval(g, 22, -84, 14 + fill * 24, 12 + fill * 20, '#f6dcae', 4)
    eye(g, -13, -102, 10, l.open * (1 + fill * 0.2), l.look); eye(g, 13, -102, 10, l.open * (1 + fill * 0.2), l.look)
    oval(g, 0, -92, 6, 5, '#3a1d14', 0)
    for (const s of [-1, 0, 1]) if (pop > 0 && pop < 1) at(g, s * pop * 74, -88 - hump(pop) * (60 + s * 14), pop * 9 * (s || 1), 1, 1, () => { oval(g, 0, 4, 10, 12, '#c98f3a', 4); piece(g, 'M-12 0 C -10 -12 10 -12 12 0 Z', '#6e4528', 4) })
  },
  woodpecker(g, l) {
    const knock = l.p < 0.55 ? Math.abs(Math.sin(l.p * 46)) : 0, dizzy = l.p < 1 ? span(l.p, 0.55, 0.65) * (1 - span(l.p, 0.9, 1)) : 0
    at(g, 4, -22, Math.sin(l.t * 5) * dizzy * 0.2, 1, 1, () => {
      piece(g, 'M-26 0 C -34 -38 -20 -66 4 -66 C 26 -64 30 -32 18 2 L6 22 L-4 6 Z', '#2d3350', 5)
      piece(g, 'M-12 -4 C -16 -32 -6 -50 6 -50 C 18 -44 16 -20 8 0 Z', '#f2ead6', 4)
      at(g, 4 - knock * 24, -78, -0.1 - knock * 0.5 + Math.sin(l.t * 9) * dizzy * 0.3, 1, 1, () => {
        piece(g, 'M-6 -20 C 0 -48 36 -46 40 -22 C 30 -28 22 -22 20 -14 Z', '#e2382f', 4)
        oval(g, 4, -4, 28, 24, '#f2ead6', 5)
        piece(g, 'M-20 -10 L-66 -2 L-20 6 Z', '#8d8fa6', 4)
        eye(g, -4, -8, 11, l.open, dizzy > 0.3 ? { x: Math.cos(l.t * 14), y: Math.sin(l.t * 14) } : l.look, dizzy > 0.3 ? 0.35 : 0.52)
      })
    })
    for (let i = 0; i < 3; i++) if (dizzy > 0.1) oval(g, Math.cos(l.t * 5 + i * 2.1) * 34, -122 + Math.sin(l.t * 5 + i * 2.1) * 9, 6, 6, '#f9dc57', 3)
  },
  mole(g, l) {
    const up = l.p < 1 ? span(l.p, 0, 0.35) : 1, hat = l.p < 1 ? plateau(l.p, 0.3, 0.45, 0.75, 0.9) : 0
    at(g, 0, -4 - up * 10, Math.sin(l.p * 30) * hump(l.p) * 0.1, 1, 1, () => {
      piece(g, 'M-36 0 C -44 -46 -26 -78 0 -78 C 28 -78 44 -46 36 0 Z', '#4a4860', 5)
      oval(g, -16, -54, 9, 9, '#4a4860', 0)
      // It needs its spectacles.
      eye(g, -15, -52, 6, l.open * 0.9, l.look); eye(g, 15, -52, 6, l.open * 0.9, l.look)
      g.strokeStyle = '#f4c84a'; g.lineWidth = 3.5
      g.beginPath(); g.arc(-15, -52, 13, 0, 7); g.stroke(); g.beginPath(); g.arc(15, -52, 13, 0, 7); g.stroke()
      oval(g, 0, -36, 13, 10, '#f29aa6', 4)
      for (const s of [-1, 1]) piece(g, `M${s * 26} -18 C ${s * 48} -26 ${s * 60} -14 ${s * 58} 0 L${s * 50} -6 L${s * 46} 2 L${s * 40} -4 L${s * 34} 2 Z`, '#f2b0b4', 4)
      // The mound goes up with it, as a hat.
      at(g, 0, -72 - hat * 18, hat * 0.2, 1, 1, () => { piece(g, 'M-40 6 C -36 -26 -14 -38 2 -38 C 22 -38 38 -22 40 6 C 20 14 -20 14 -40 6 Z', '#99602f', 5); piece(g, 'M-20 -26 C -10 -46 14 -48 20 -28 C 8 -20 -8 -18 -20 -26 Z', '#6fae3a', 4) })
    })
  },
  worm(g, l) {
    const up = (l.p < 1 ? plateau(l.p, 0, 0.5, 0.82, 1) : 0) * 120 + 34, bow = l.p < 1 ? plateau(l.p, 0.56, 0.66, 0.74, 0.82) : 0
    const sway = Math.sin(l.t * 1.7) * 8
    g.strokeStyle = '#06050b'; g.lineCap = 'round'; g.lineWidth = 40
    const tipX = sway + bow * 52, tipY = -22 - up + bow * 60
    const body = () => { g.beginPath(); g.moveTo(0, -8); g.bezierCurveTo(-sway, -20 - up * 0.4, -sway, -10 - up * (1 + bow * 0.2), tipX, tipY); g.stroke() }
    body(); g.strokeStyle = '#ee8fa4'; g.lineWidth = 31; body()
    g.strokeStyle = '#d9667f'; g.lineWidth = 5
    for (let i = 1; i < 5; i++) { const y = -14 - (up * i) / 6; g.beginPath(); g.moveTo(-13, y); g.quadraticCurveTo(0, y + 7, 13, y); g.stroke() }
    at(g, tipX, tipY, bow * 1.2, 1, 1, () => {
      oval(g, 0, -4, 24, 22, '#f4a3b5', 5)
      eye(g, -8, -10, 9, l.open * (1 - bow), l.look); eye(g, 9, -10, 9, l.open * (1 - bow), l.look)
      line(g, 'M-8 4 C -3 10 5 10 10 4', 3.5)
      piece(g, 'M-16 -22 C -14 -44 14 -44 16 -22 C 6 -28 -6 -28 -16 -22 Z', '#3a7fd0', 4)
    })
  },
  fox(g, l) {
    const peek = l.p < 1 ? span(l.p, 0.2, 0.4) * (1 - span(l.p, 0.7, 0.85)) : 0.35, flick = l.p < 1 ? Math.sin(l.p * 40) * hump(l.p) : Math.sin(l.t * 1.2) * 0.2
    at(g, 0, -8, 0, 1, 1, () => {
      piece(g, 'M-50 0 C -58 -44 -22 -60 4 -58 C 40 -56 58 -30 50 0 Z', '#d9662a', 5)
      at(g, -6, -50 - peek * 20, 0, 1, 1, () => {
        piece(g, 'M-34 -14 L-38 -50 L-10 -30 Z', '#d9662a', 4); piece(g, 'M34 -14 L38 -50 L10 -30 Z', '#d9662a', 4)
        piece(g, 'M-40 -12 C -36 -38 36 -38 40 -12 C 34 8 12 24 0 28 C -12 24 -34 8 -40 -12 Z', '#e67a32', 5)
        piece(g, 'M-38 -6 C -20 -6 -8 6 0 22 C 8 6 20 -6 38 -6 C 32 12 12 24 0 28 C -12 24 -32 12 -38 -6 Z', '#fbeedb', 4)
        eye(g, -16, -12, 10, l.open, l.look); eye(g, 16, -12, 10, l.open, l.look)
        oval(g, 0, 22, 8, 6, '#2a1a1c', 0)
      })
      // It hides behind its own tail.
      at(g, 34, -2, -0.5 + flick * 0.3 + peek * 0.4, 1, 1, () => { piece(g, 'M8 6 C 30 -14 10 -60 -42 -62 C -66 -60 -70 -44 -60 -36 C -40 -20 -20 10 8 6 Z', '#c95a24', 5); piece(g, 'M-42 -62 C -66 -60 -70 -44 -60 -36 C -52 -36 -42 -48 -42 -62 Z', '#fbeedb', 4) })
    })
  },
  badger(g, l) {
    const yawn = l.p < 1 ? plateau(l.p, 0.12, 0.5, 0.7, 0.9) : 0
    at(g, 0, -4, 0, 1, 1, () => {
      piece(g, 'M-58 0 C -62 -36 -30 -48 0 -48 C 32 -48 62 -36 58 0 Z', '#6f7288', 5)
      at(g, 0, -46, -yawn * 0.14, 1, 1, () => {
        oval(g, -34, -22, 11, 11, '#2d3044', 4); oval(g, 34, -22, 11, 11, '#2d3044', 4)
        piece(g, 'M-42 -8 C -40 -36 40 -36 42 -8 C 38 14 14 26 0 28 C -14 26 -38 14 -42 -8 Z', '#f2efe6', 5)
        piece(g, 'M-38 -16 C -34 -28 -20 -32 -12 -30 L-12 14 C -22 14 -34 4 -38 -16 Z', '#2d3044', 4)
        piece(g, 'M38 -16 C 34 -28 20 -32 12 -30 L12 14 C 22 14 34 4 38 -16 Z', '#2d3044', 4)
        // A yawn bigger than itself.
        if (yawn > 0.05) { oval(g, 0, 22 + yawn * 10, 14 + yawn * 34, 8 + yawn * 36, '#8f2d3c', 5); oval(g, 0, 36 + yawn * 22, 9 + yawn * 18, 4 + yawn * 10, '#e2788a', 3) }
        eye(g, -20, -10, 9, l.open * (1 - yawn), l.look); eye(g, 20, -10, 9, l.open * (1 - yawn), l.look)
        oval(g, 0, 8 - yawn * 16, 10, 7, '#1d1a26', 0)
      })
    })
  },
  snail(g, l) {
    const one = l.p < 1 ? span(l.p, 0.05, 0.3) : 1, two = l.p < 1 ? span(l.p, 0.4, 0.65) : 1, slip = l.p < 1 ? hump(span(l.p, 0.68, 0.95)) : 0
    at(g, -4 + Math.sin(l.t * 0.5) * 6, -58, 0, 1, 1, () => {
      piece(g, 'M-64 6 C -50 -8 10 -10 40 -8 C 56 -40 82 -32 78 -8 C 74 6 40 10 -64 6 Z', '#e8c88f', 5)
      oval(g, -8, -36, 42, 40, '#c95a9a', 5)
      line(g, 'M-8 -36 C -2 -48 14 -40 10 -26 C 4 -10 -28 -12 -30 -36 C -30 -64 10 -70 24 -48', 4.5)
      shine(g, -26, -56, 10, 6, -0.6, 0.5)
      for (const [x, k, s] of [[54, one, 1], [74, two - slip * 0.8, -1]] as const) {
        const h = 10 + k * 46, sx = x + Math.sin(l.t * 2 + x) * 4
        line2(g, x, -20, sx, -24 - h, '#e8c88f', 9)
        eye(g, sx, -28 - h, 13, l.open * (k > 0.3 ? 1 : 0), { x: l.look.x * s, y: l.look.y })
      }
      line(g, 'M58 -4 C 64 0 70 -2 74 -8', 3.5)
    })
  },
  caterpillar(g, l) {
    const tap = l.p < 1 ? l.p : 1
    at(g, 0, -60, 0, 1, 1, () => {
      for (let i = 0; i < 3; i++) {
        const lift = tap < 1 ? Math.max(0, Math.sin(tap * 36 - i * 1.1)) * 12 : 0, x = -58 + i * 34, y = -22 - Math.abs(Math.sin(l.t * 1.6 + i)) * 5
        for (const s of [-8, 10]) piece(g, `M${x + s - 4} ${y + 16} L${x + s + 4} ${y + 16} L${x + s + 4} ${-lift - 6} L${x + s + 15} ${-lift - 2} L${x + s + 15} ${-lift + 4} L${x + s - 5} ${-lift + 4} Z`, i % 2 ? '#e2382f' : '#3a7fd0', 3)
        oval(g, x, y, 25, 24, i % 2 ? '#9ccf3f' : '#b6dd55', 5)
      }
      at(g, 50, -42, Math.sin(tap * 20) * hump(tap) * 0.16, 1, 1, () => {
        oval(g, 0, 0, 34, 32, '#c6e86a', 5)
        eye(g, -10, -6, 11, l.open, l.look); eye(g, 14, -6, 11, l.open, l.look)
        line(g, 'M-6 12 C 0 18 10 18 16 12', 3.5)
        line2(g, -12, -30, -20, -52, '#06050b', 4); line2(g, 12, -30, 20, -52, '#06050b', 4)
        oval(g, -20, -54, 7, 7, '#f0a52c', 3); oval(g, 20, -54, 7, 7, '#f0a52c', 3)
      })
    })
  },
  hedgehog(g, l) {
    const back = l.p < 1 ? plateau(l.p, 0.1, 0.4, 0.46, 0.5) : 0, ball = l.p < 1 ? plateau(l.p, 0.48, 0.56, 0.78, 0.95) : 0
    at(g, 0, -60 - hump(span(l.p, 0.46, 0.74)) * 46 * (l.p < 1 ? 1 : 0), -back * 0.3 + ball * 6, 1, 1, () => {
      piece(g, 'M-58 2 L-70 -14 L-58 -20 L-66 -38 L-50 -40 L-50 -60 L-34 -54 L-24 -74 L-10 -60 L6 -76 L14 -58 L34 -66 L34 -48 L50 -44 L44 -26 L54 -14 L42 2 Z', '#7a5536', 5)
      if (ball < 0.5) {
        piece(g, 'M6 4 C 2 -34 26 -46 46 -36 C 58 -26 70 -14 78 -10 C 76 0 60 6 6 4 Z', '#e8c99a', 5)
        oval(g, 78, -11, 9, 8, '#2a1a1c', 0)
        eye(g, 40, -22, 10, l.open * (1 - back), l.look)
        if (back > 0.1) oval(g, 62, 0, 4 + back * 10, 3 + back * 8, '#7a2230', 3)
        oval(g, -24, 4, 13, 7, '#e8c99a', 3); oval(g, 24, 4, 13, 7, '#e8c99a', 3)
      } else { oval(g, -6, -30, 18, 16, '#e8c99a', 4); oval(g, -6, -24, 6, 5, '#2a1a1c', 0) }
    })
    if (l.p > 0.46 && l.p < 0.7) { const q = span(l.p, 0.46, 0.7); oval(g, 84 + q * 30, -66 - q * 10, 4 + q * 8, 4 + q * 6, 'rgba(210,235,255,0.7)', 2) }
  },
  mushroom(g, l) {
    const lift = l.p < 1 ? plateau(l.p, 0.08, 0.25, 0.8, 0.95) : 0, small = l.p < 1 ? plateau(l.p, 0.38, 0.5, 0.66, 0.78) : 0
    at(g, 0, -56, 0, 1, 1, () => {
      piece(g, 'M-28 4 C -24 -20 -24 -36 -26 -52 L26 -52 C 24 -36 24 -20 28 4 C 14 10 -14 10 -28 4 Z', '#f6ead0', 5)
      eye(g, -11, -32, 9, l.open, l.look); eye(g, 11, -32, 9, l.open, l.look)
      line(g, 'M-10 -14 C -4 -8 4 -8 10 -14', 3.5)
      // Under its hat there is someone, who lifts a hat as well.
      if (lift > 0.1) {
        oval(g, 0, -58, 18, 13 * lift, '#f2b48a', 4)
        eye(g, -6, -60, 5, l.open, { x: 0, y: 0 }); eye(g, 7, -60, 5, l.open, { x: 0, y: 0 })
        at(g, 0, -66 - small * 22, small * 0.2, 1, 1, () => piece(g, 'M-15 4 C -12 -14 -4 -18 0 -26 C 4 -18 12 -14 15 4 Z', '#3a7fd0', 4))
      }
      at(g, 0, -50 - lift * 56, Math.sin(l.t * 1.1) * 0.04 + lift * 0.14, 1, 1, () => {
        piece(g, 'M-66 6 C -66 -42 -28 -62 0 -62 C 30 -62 66 -40 66 6 C 40 -8 -40 -8 -66 6 Z', '#d93a30', 6)
        oval(g, -28, -28, 13, 10, '#fbf6e4', 4, -0.4); oval(g, 12, -44, 12, 9, '#fbf6e4', 4); oval(g, 38, -18, 11, 10, '#fbf6e4', 4, 0.4)
      })
    })
  },
}

/** One wing of the bat, its tip `w` out. */
function piece2(g: G, w: number, color: string): void {
  g.beginPath()
  g.moveTo(6, 20)
  g.quadraticCurveTo(w * 0.6, 4, w, 22)
  g.quadraticCurveTo(w * 0.86, 46, w * 0.7, 62)
  g.quadraticCurveTo(w * 0.5, 50, w * 0.4, 74)
  g.quadraticCurveTo(w * 0.2, 60, 4, 74)
  g.closePath()
  g.fillStyle = color; g.fill()
  g.strokeStyle = '#06050b'; g.lineWidth = 5; g.lineJoin = 'round'; g.stroke()
}

function line2(g: G, x0: number, y0: number, x1: number, y1: number, color: string, width: number): void {
  g.lineCap = 'round'
  g.strokeStyle = '#06050b'; g.lineWidth = width + 6
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
  g.strokeStyle = color; g.lineWidth = width
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
}
