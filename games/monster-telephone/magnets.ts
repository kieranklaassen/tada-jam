import { REACH } from './layout'
import { INK, mark, curve, oval, trace, type Album, type Ctx, type Ink, type Line, type Picture } from './marker'
import type { Body, Part } from './monster'

// The plastic: seven parts and three bodies, each a thick slab with a side, a
// face, a gloss and a flat shadow on the board. One colour for each kind, and
// nothing else on it. A part is drawn in a box of 100 with its middle at 0.

type Plastic = { face: string; lit: string; side: string }
const PLASTIC: Record<Part, Plastic> = {
  eye: { face: '#fbfcfd', lit: '#ffffff', side: '#b3bfcb' },
  mouth: { face: '#e2343c', lit: '#f56a68', side: '#8f1620' },
  nose: { face: '#f58a1f', lit: '#ffb55c', side: '#a9530a' },
  ear: { face: '#f2799f', lit: '#ffa9c2', side: '#aa3d63' },
  hand: { face: '#f9cf2b', lit: '#ffe77d', side: '#ac8307' },
  foot: { face: '#33a656', lit: '#70cf83', side: '#14602c' },
  tail: { face: '#2f86dd', lit: '#79b9f4', side: '#12508f' },
}
const VIOLET: Plastic = { face: '#8560c8', lit: '#b094e6', side: '#4c2f88' }
/** The pen nearest to a part's colour, for the outline the ostrich shows and the small drawings. */
const PEN: Record<Part, Ink> = { eye: 'black', mouth: 'red', nose: 'red', ear: 'red', hand: 'black', foot: 'green', tail: 'blue' }

/** The outline of each part. Silhouettes first: all seven are known by their edge alone. */
export const OUTLINE: Record<Part, Line> = {
  eye: oval(0, 0, 45, 43),
  mouth: curve([[-48, -6], [-34, -26], [-14, -31], [0, -23], [14, -31], [34, -26], [48, -6], [36, 20], [14, 33], [-14, 33], [-36, 20]], true),
  nose: curve([[-12, -44], [12, -44], [20, -18], [42, 4], [42, 28], [24, 40], [0, 36], [-24, 40], [-42, 28], [-42, 4], [-20, -18]], true),
  ear: curve([[-8, -46], [20, -42], [36, -18], [30, 8], [14, 22], [10, 40], [-8, 46], [-22, 34], [-24, 8], [-32, -20]], true),
  hand: [...curve([[-20, 46], [-26, 22], [-47, 4], [-46, -8], [-34, -8], [-22, 4], [-26, -34], [-18, -43], [-9, -36], [-6, -12], [-4, -44], [5, -48], [13, -42], [12, -12], [20, -36], [29, -37], [33, -28], [28, 0], [40, -10], [46, -4], [38, 18], [24, 34], [20, 46]], true)],
  foot: curve([[-30, -44], [0, -46], [6, -20], [12, -4], [30, 2], [46, 12], [49, 26], [42, 38], [10, 42], [-26, 42], [-38, 30], [-36, 0]], true),
  tail: curve([[-46, 40], [-22, 42], [4, 34], [18, 14], [12, -6], [8, -24], [18, -36], [30, -34], [28, -22], [36, -14], [46, -26], [44, -42], [28, -49], [4, -44], [-10, -26], [-6, -2], [-4, 10], [-14, 20], [-46, 22], [-50, 32]], true),
}

/** Extra draws inside the face: what makes the edge read. */
function inside(ctx: Ctx, part: Part): void {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  switch (part) {
    case 'eye': break
    case 'mouth':
      trace(ctx, curve([[-32, -2], [-16, -8], [0, -5], [16, -8], [32, -2], [20, 14], [0, 18], [-20, 14]], true))
      ctx.fillStyle = '#5c0d16'; ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.roundRect(-19, -7, 17, 11, 3); ctx.roundRect(1, -7, 17, 11, 3); ctx.fill()
      break
    case 'nose':
      ctx.fillStyle = '#7d3a04'
      ctx.beginPath(); ctx.ellipse(-18, 26, 9, 6.5, 0.2, 0, 7); ctx.ellipse(18, 26, 9, 6.5, -0.2, 0, 7); ctx.fill()
      break
    case 'ear':
      ctx.strokeStyle = '#b84a70'; ctx.lineWidth = 8
      trace(ctx, curve([[-10, 20], [-14, -10], [-2, -27], [15, -20], [14, 0], [2, 8]])); ctx.stroke()
      break
    case 'hand':
      ctx.strokeStyle = '#c79a10'; ctx.lineWidth = 4.5
      trace(ctx, curve([[-10, 26], [2, 14], [20, 14]])); ctx.stroke()
      break
    case 'foot':
      ctx.fillStyle = '#b6f0c4'
      for (const [x, y, r] of [[42, 21, 5.5], [33, 12, 4.8]] as const) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill() }
      ctx.strokeStyle = '#1d7a3b'; ctx.lineWidth = 4.5
      trace(ctx, curve([[18, 40], [20, 28]])); ctx.stroke()
      trace(ctx, curve([[2, 40], [4, 29]])); ctx.stroke()
      break
    case 'tail': break
  }
}

function slab(ctx: Ctx, line: Line, p: Plastic, depth: number): void {
  const shape = () => { trace(ctx, line); ctx.closePath() }
  ctx.save()
  // The shadow it throws on the board, soft in four steps.
  ctx.fillStyle = '#2d3848'
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(3 + i * 1.7, depth + 2 + i * 2.2); ctx.globalAlpha = 0.085; shape(); ctx.fill(); ctx.restore() }
  ctx.fillStyle = p.side
  ctx.strokeStyle = p.side
  ctx.lineJoin = 'round'
  ctx.lineWidth = 2.5
  for (let d = depth; d > 0; d -= 1.5) { ctx.save(); ctx.translate(0, d); shape(); ctx.fill(); ctx.restore() }
  ctx.save(); ctx.translate(0, depth); shape(); ctx.stroke(); ctx.restore()
  shape()
  ctx.fillStyle = p.face
  ctx.fill()
  ctx.stroke()
  ctx.clip()
  // The moulded rim: light from the upper left, and the far edge darker.
  ctx.lineWidth = 9
  ctx.strokeStyle = p.lit
  ctx.globalAlpha = 0.9
  ctx.save(); ctx.translate(2.5, 3.5); shape(); ctx.stroke(); ctx.restore()
  ctx.strokeStyle = p.side
  ctx.globalAlpha = 0.28
  ctx.save(); ctx.translate(-2.5, -3.5); shape(); ctx.stroke(); ctx.restore()
  ctx.restore()
}

function gloss(ctx: Ctx, line: Line, x: number, y: number, rx: number, ry: number): void {
  ctx.save()
  trace(ctx, line); ctx.closePath(); ctx.clip()
  ctx.fillStyle = '#fff'
  ctx.globalAlpha = 0.4
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -0.6, 0, 7); ctx.fill()
  ctx.globalAlpha = 0.65
  ctx.beginPath(); ctx.ellipse(x - rx * 0.1, y - ry * 0.1, rx * 0.6, ry * 0.5, -0.6, 0, 7); ctx.fill()
  ctx.restore()
}

const GLOSS: Record<Part, readonly [number, number, number, number]> = {
  eye: [-22, -24, 12, 6], mouth: [-26, -16, 11, 4.5], nose: [-9, -22, 5.5, 11], ear: [-18, -24, 5, 10], hand: [-18, -24, 3, 9], foot: [-25, -26, 5, 12], tail: [0, -30, 5, 9],
}

export const BODY_LINE: Record<Body, Line> = {
  round: curve([[0, -132], [66, -118], [120, -66], [138, 0], [118, 72], [62, 118], [0, 132], [-62, 118], [-118, 72], [-138, 0], [-120, -66], [-66, -118]], true),
  tall: curve([[0, -172], [52, -160], [84, -112], [92, -40], [100, 40], [96, 118], [62, 162], [0, 172], [-62, 162], [-96, 118], [-100, 40], [-92, -40], [-84, -112], [-52, -160]], true),
  wide: curve([[0, -100], [70, -108], [126, -78], [152, -10], [142, 58], [96, 98], [0, 108], [-96, 98], [-142, 58], [-152, -10], [-126, -78], [-70, -108]], true),
}

export class Magnets {
  constructor(private readonly album: Album) {}

  part(part: Part): Picture {
    return this.album.get(`part:${part}`, [-62, -62, 128, 132], (ctx) => {
      slab(ctx, OUTLINE[part], PLASTIC[part], 7)
      inside(ctx, part)
      gloss(ctx, OUTLINE[part], ...GLOSS[part])
      if (part === 'eye') this.drawPupil(ctx, 4, 4)
    }, 1.25)
  }
  /** The eye without its pupil, and the pupil, for when it rolls. */
  eyeball(): Picture {
    return this.album.get('eyeball', [-62, -62, 128, 132], (ctx) => { slab(ctx, OUTLINE.eye, PLASTIC.eye, 7); gloss(ctx, OUTLINE.eye, ...GLOSS.eye) }, 1.25)
  }
  pupil(): Picture {
    return this.album.get('pupil', [-28, -28, 56, 56], (ctx) => this.drawPupil(ctx, 0, 0), 1.25)
  }
  private drawPupil(ctx: Ctx, x: number, y: number): void {
    ctx.fillStyle = '#0c1016'
    ctx.beginPath(); ctx.arc(x, y + 2.5, 22, 0, 7); ctx.fill()
    ctx.fillStyle = '#262d38'
    ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(x - 8, y - 8, 6, 0, 7); ctx.fill()
    ctx.globalAlpha = 0.5
    ctx.beginPath(); ctx.arc(x + 8, y + 9, 3, 0, 7); ctx.fill()
    ctx.globalAlpha = 1
  }
  body(body: Body): Picture {
    const r = REACH[body]
    return this.album.get(`body:${body}`, [-r.w - 16, -r.h - 16, r.w * 2 + 44, r.h * 2 + 52], (ctx) => {
      slab(ctx, BODY_LINE[body], VIOLET, 13)
      gloss(ctx, BODY_LINE[body], -r.w * 0.5, -r.h * 0.62, 34, 12)
    })
  }
  /** A part as the ostrich shows it: the board's white with one pen's line round it. */
  outline(part: Part): Picture {
    return this.album.get(`line:${part}`, [-58, -58, 116, 116], (ctx) => {
      const ink = PEN[part], line = OUTLINE[part]
      trace(ctx, line); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.fill()
      mark(ctx, line, ink, 5.5)
      switch (part) {
        case 'eye': mark(ctx, oval(4, 4, 20, 20), ink, 5); ctx.fillStyle = INK.black; ctx.beginPath(); ctx.arc(4, 4, 13, 0, 7); ctx.fill(); break
        case 'mouth': mark(ctx, curve([[-34, -2], [-16, -8], [0, -5], [16, -8], [34, -2]]), ink, 5); mark(ctx, curve([[-30, 4], [0, 18], [30, 4]]), ink, 5); break
        case 'nose': mark(ctx, oval(-18, 26, 7, 5), ink, 5); mark(ctx, oval(18, 26, 7, 5), ink, 5); break
        case 'ear': mark(ctx, curve([[-10, 20], [-14, -10], [-2, -27], [15, -20], [14, 0], [2, 8]]), ink, 5); break
        case 'hand': mark(ctx, curve([[-10, 26], [2, 14], [20, 14]]), ink, 5); break
        case 'foot': mark(ctx, curve([[18, 40], [20, 28]]), ink, 5); mark(ctx, curve([[2, 40], [4, 29]]), ink, 5); break
        case 'tail': break
      }
    }, 1.1)
  }
  static pen(part: Part): Ink { return PEN[part] }
}
