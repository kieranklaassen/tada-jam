import { type Board } from './board'
import { boardFor, type Circuit, type Part } from './circuit'
import { disc, INK, lifted, roundRect, type Ctx } from './paint'

// The board and what stands on it, seen from straight above. The working
// pieces stay plain: each part is drawn as itself, in its real colours, with
// no face and no pattern. Everything here is painted once into the still
// layer; what moves (beads, glow, a blade) is in paintLive.ts.

/** Where a board lies on the surface: the pixel of pad (0, 0) and the pixels in one pad unit. */
export type Lay = { x: number; y: number; u: number }

export const at = (lay: Lay, board: Board, pad: number) => ({ x: lay.x + board.pads[pad].x * lay.u, y: lay.y + board.pads[pad].y * lay.u })

/** The green board with its copper, cracks and solder blobs. */
export function paintBoard(c: Ctx, lay: Lay, circuit: Circuit): void {
  const board = boardFor(circuit), u = lay.u, m = u * 0.55
  lifted(c, u * 0.09, () => {
    roundRect(c, lay.x - m, lay.y - m, (board.cols - 1) * u + 2 * m, (board.rows - 1) * u + 2 * m, u * 0.16)
    c.fillStyle = INK.mask
    c.fill()
  })
  c.lineWidth = u * 0.03
  c.strokeStyle = INK.maskEdge
  c.stroke()
  // Mounting holes in the corners, as on a real board.
  for (const [hx, hy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const x = lay.x - m * 0.55 + hx * ((board.cols - 1) * u + m * 1.1), y = lay.y - m * 0.55 + hy * ((board.rows - 1) * u + m * 1.1)
    disc(c, x, y, u * 0.07, INK.solder)
    disc(c, x, y, u * 0.035, INK.matEdge)
  }
  const cracked = new Set(circuit.cracks)
  c.lineCap = 'round'
  board.traces.forEach((trace, i) => {
    const p = at(lay, board, trace.a), q = at(lay, board, trace.b)
    const stroke = (width: number, colour: string) => {
      c.lineWidth = width
      c.strokeStyle = colour
      c.beginPath()
      if (cracked.has(i)) {
        // A crack: the copper stops short on both sides of a jagged gap of bare board.
        const g = 0.5 - (u * 0.2) / Math.hypot(q.x - p.x, q.y - p.y)
        c.moveTo(p.x, p.y)
        c.lineTo(p.x + (q.x - p.x) * g, p.y + (q.y - p.y) * g)
        c.moveTo(q.x, q.y)
        c.lineTo(q.x + (p.x - q.x) * g, q.y + (p.y - q.y) * g)
      } else {
        c.moveTo(p.x, p.y)
        c.lineTo(q.x, q.y)
      }
      c.stroke()
    }
    stroke(u * 0.15, INK.copper)
    stroke(u * 0.045, INK.copperLight)
    if (cracked.has(i)) {
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, nx = (q.y - p.y) / Math.hypot(q.x - p.x, q.y - p.y), ny = -(q.x - p.x) / Math.hypot(q.x - p.x, q.y - p.y)
      c.lineWidth = u * 0.05
      c.strokeStyle = INK.black
      c.beginPath()
      c.moveTo(mx + nx * u * 0.2, my + ny * u * 0.2)
      c.lineTo(mx - ny * u * 0.05 + nx * u * 0.07, my + nx * u * 0.05 + ny * u * 0.07)
      c.lineTo(mx + ny * u * 0.05 - nx * u * 0.07, my - nx * u * 0.05 - ny * u * 0.07)
      c.lineTo(mx - nx * u * 0.2, my - ny * u * 0.2)
      c.stroke()
    }
  })
  board.pads.forEach((_, i) => {
    const p = at(lay, board, i)
    disc(c, p.x, p.y, u * 0.13, INK.solderDark)
    disc(c, p.x, p.y, u * 0.105, INK.solder)
    disc(c, p.x - u * 0.03, p.y - u * 0.035, u * 0.04, INK.white)
  })
}

/** Draw in a part's own frame: the origin midway between its pads, `a` at the left, one unit between them. */
function inFrame(c: Ctx, lay: Lay, board: Board, part: Part, paint: (u: number) => void): void {
  const p = at(lay, board, part.a), q = at(lay, board, part.b)
  c.save()
  c.translate((p.x + q.x) / 2, (p.y + q.y) / 2)
  c.rotate(Math.atan2(q.y - p.y, q.x - p.x))
  paint(lay.u)
  c.restore()
}

const legs = (c: Ctx, u: number) => {
  c.lineWidth = u * 0.05
  c.strokeStyle = INK.steel
  c.beginPath()
  c.moveTo(-u / 2, 0)
  c.lineTo(u / 2, 0)
  c.stroke()
}

function paintCell(c: Ctx, u: number, part: Extract<Part, { kind: 'cell' }>): void {
  // The holder, then the cell lying in it: flat base at `a`, the cap's button at `b`.
  roundRect(c, -u * 0.56, -u * 0.3, u * 1.12, u * 0.6, u * 0.08)
  c.fillStyle = INK.plastic
  c.fill()
  roundRect(c, -u * 0.44, -u * 0.21, u * 0.82, u * 0.42, u * 0.07)
  c.fillStyle = part.flat ? '#4a515a' : INK.cellBody
  c.fill()
  c.fillStyle = INK.cellBand
  c.fillRect(u * 0.12, -u * 0.21, u * 0.2, u * 0.42)
  c.fillStyle = INK.steel
  c.fillRect(-u * 0.44, -u * 0.19, u * 0.06, u * 0.38)
  roundRect(c, u * 0.38, -u * 0.09, u * 0.1, u * 0.18, u * 0.03)
  c.fill()
  // The long daylight glint along the round body.
  c.fillStyle = 'rgba(255, 255, 255, 0.22)'
  c.fillRect(-u * 0.36, -u * 0.15, u * 0.7, u * 0.06)
  if (part.popped) {
    // The cutout's flag, up.
    c.fillStyle = INK.red
    c.beginPath()
    c.moveTo(-u * 0.1, -u * 0.3)
    c.lineTo(u * 0.16, -u * 0.44)
    c.lineTo(-u * 0.1, -u * 0.58)
    c.closePath()
    c.fill()
  }
}

function paintSwitch(c: Ctx, u: number, part: Extract<Part, { kind: 'switch' }>): void {
  roundRect(c, -u * 0.58, -u * 0.2, u * 1.16, u * 0.4, u * 0.07)
  c.fillStyle = INK.plastic
  c.fill()
  disc(c, -u * 0.5, 0, u * 0.09, INK.steel)
  disc(c, u * 0.5, 0, u * 0.09, INK.steel)
  // The lever swings from the pivot at `a`: down, it lies on the contact at `b`; up, it stands away from it.
  const angle = part.down ? 0 : -0.62
  c.save()
  c.translate(-u * 0.5, 0)
  c.rotate(angle)
  c.lineCap = 'round'
  c.lineWidth = u * 0.11
  c.strokeStyle = INK.steelDark
  c.beginPath()
  c.moveTo(0, 0)
  c.lineTo(u, 0)
  c.stroke()
  c.lineWidth = u * 0.06
  c.strokeStyle = INK.steel
  c.stroke()
  disc(c, u * 1.02, 0, u * 0.1, INK.red)
  c.restore()
}

function paintLamp(c: Ctx, u: number, part: Extract<Part, { kind: 'lamp' }>): void {
  legs(c, u)
  disc(c, 0, 0, u * 0.3, INK.steelDark)
  disc(c, 0, 0, u * 0.27, INK.steel)
  disc(c, 0, 0, u * 0.21, part.blown ? INK.glassBlown : INK.glass)
  c.lineWidth = u * 0.025
  c.strokeStyle = part.blown ? INK.black : INK.filament
  c.beginPath()
  c.moveTo(-u * 0.12, 0)
  for (let i = 1; i <= 6; i++) c.lineTo(-u * 0.12 + (u * 0.24 * i) / 6, (i % 2 ? -1 : 1) * u * 0.045 * (i === 6 ? 0 : 1))
  c.stroke()
  disc(c, -u * 0.08, -u * 0.09, u * 0.045, 'rgba(255, 255, 255, 0.8)')
}

function paintMotor(c: Ctx, u: number): void {
  legs(c, u)
  roundRect(c, -u * 0.3, -u * 0.24, u * 0.6, u * 0.48, u * 0.1)
  c.fillStyle = INK.steel
  c.fill()
  c.fillStyle = INK.motorCap
  c.fillRect(-u * 0.3, -u * 0.17, u * 0.1, u * 0.34)
  c.fillStyle = 'rgba(255, 255, 255, 0.35)'
  c.fillRect(-u * 0.18, -u * 0.17, u * 0.42, u * 0.07)
  disc(c, 0, 0, u * 0.06, INK.steelDark)
}

function paintBuzzer(c: Ctx, u: number): void {
  legs(c, u)
  disc(c, 0, 0, u * 0.27, INK.black)
  disc(c, 0, 0, u * 0.2, INK.plastic)
  c.lineWidth = u * 0.025
  c.strokeStyle = INK.steelDark
  c.beginPath()
  c.arc(0, 0, u * 0.235, 0, Math.PI * 2)
  c.stroke()
  disc(c, 0, 0, u * 0.055, INK.black)
  disc(c, -u * 0.1, -u * 0.11, u * 0.03, 'rgba(255, 255, 255, 0.5)')
}

/** Every part on the board, each as itself. */
export function paintParts(c: Ctx, lay: Lay, circuit: Circuit): void {
  const board = boardFor(circuit)
  for (const part of circuit.parts) {
    // The shadow is cast once, by the part's footprint; the part is then painted over it with none.
    lifted(c, lay.u * 0.08, () => inFrame(c, lay, board, part, (u) => footprint(c, u, part)))
    inFrame(c, lay, board, part, (u) => {
      switch (part.kind) {
        case 'cell': return paintCell(c, u, part)
        case 'switch': return paintSwitch(c, u, part)
        case 'lamp': return paintLamp(c, u, part)
        case 'motor': return paintMotor(c, u)
        case 'buzzer': return paintBuzzer(c, u)
        case 'odd': return paintOdd(c, u, part.what, u)
      }
    })
  }
}

function footprint(c: Ctx, u: number, part: Part): void {
  c.fillStyle = INK.plastic
  switch (part.kind) {
    case 'cell': roundRect(c, -u * 0.56, -u * 0.3, u * 1.12, u * 0.6, u * 0.08); break
    case 'switch': roundRect(c, -u * 0.58, -u * 0.2, u * 1.16, u * 0.4, u * 0.07); break
    case 'motor': roundRect(c, -u * 0.3, -u * 0.24, u * 0.6, u * 0.48, u * 0.1); break
    case 'odd': roundRect(c, -u * 0.45, -u * 0.07, u * 0.9, u * 0.14, u * 0.07); break
    default: c.beginPath(); c.arc(0, 0, u * 0.28, 0, Math.PI * 2)
  }
  c.fill()
}

/** A bench odd, drawn along the x axis and `length` long: a spoon, a key, a ball of foil, a pencil, a rubber, a stick, a string. */
export function paintOdd(c: Ctx, u: number, what: Extract<Part, { kind: 'odd' }>['what'], length: number): void {
  const h = length / 2
  c.lineCap = 'round'
  switch (what) {
    case 'spoon':
      c.lineWidth = u * 0.07
      c.strokeStyle = INK.steel
      c.beginPath()
      c.moveTo(-h, 0)
      c.lineTo(h * 0.4, 0)
      c.stroke()
      c.beginPath()
      c.ellipse(h * 0.66, 0, h * 0.36, u * 0.17, 0, 0, Math.PI * 2)
      c.fillStyle = INK.steel
      c.fill()
      c.beginPath()
      c.ellipse(h * 0.62, -u * 0.03, h * 0.2, u * 0.08, 0, 0, Math.PI * 2)
      c.fillStyle = 'rgba(255, 255, 255, 0.55)'
      c.fill()
      return
    case 'key':
      disc(c, -h * 0.62, 0, u * 0.18, INK.steel)
      disc(c, -h * 0.62, 0, u * 0.07, INK.mat)
      c.fillStyle = INK.steel
      c.fillRect(-h * 0.5, -u * 0.045, h * 1.45, u * 0.09)
      c.fillRect(h * 0.5, 0, u * 0.07, u * 0.13)
      c.fillRect(h * 0.78, 0, u * 0.07, u * 0.1)
      return
    case 'foil': {
      // A ball of foil scrunched by hand: a lumpy round outline with a few flat facets catching the light.
      const lumps = [1, 0.82, 0.96, 0.78, 1, 0.86, 0.94, 0.8, 0.98, 0.84]
      const corner = (i: number, r: number) => ({ x: Math.cos((i / 10) * Math.PI * 2) * h * 0.62 * r, y: Math.sin((i / 10) * Math.PI * 2) * h * 0.62 * r })
      c.beginPath()
      lumps.forEach((r, i) => c.lineTo(corner(i, r).x, corner(i, r).y))
      c.closePath()
      c.fillStyle = INK.solder
      c.fill()
      for (const [i, shade] of [[1, 'rgba(255, 255, 255, 0.75)'], [4, 'rgba(110, 122, 132, 0.45)'], [7, 'rgba(255, 255, 255, 0.4)']] as const) {
        c.beginPath()
        c.moveTo(0, 0)
        c.lineTo(corner(i, lumps[i]).x, corner(i, lumps[i]).y)
        c.lineTo(corner(i + 1, lumps[i + 1]).x, corner(i + 1, lumps[i + 1]).y)
        c.closePath()
        c.fillStyle = shade
        c.fill()
      }
      return
    }
    case 'pencil':
      c.fillStyle = INK.pencil
      c.fillRect(-h * 0.8, -u * 0.07, h * 1.45, u * 0.14)
      c.fillStyle = INK.wood
      c.beginPath()
      c.moveTo(h * 0.65, -u * 0.07)
      c.lineTo(h, 0)
      c.lineTo(h * 0.65, u * 0.07)
      c.fill()
      c.fillStyle = INK.graphite
      c.beginPath()
      c.moveTo(h * 0.88, -u * 0.025)
      c.lineTo(h, 0)
      c.lineTo(h * 0.88, u * 0.025)
      c.fill()
      c.fillRect(-h, -u * 0.03, h * 0.2, u * 0.06)
      return
    case 'rubber':
      roundRect(c, -h * 0.7, -u * 0.15, h * 1.4, u * 0.3, u * 0.07)
      c.fillStyle = INK.rubber
      c.fill()
      c.fillStyle = 'rgba(255, 255, 255, 0.3)'
      c.fillRect(-h * 0.55, -u * 0.11, h * 1.1, u * 0.06)
      return
    case 'stick':
      roundRect(c, -h, -u * 0.08, length, u * 0.16, u * 0.08)
      c.fillStyle = INK.wood
      c.fill()
      c.lineWidth = u * 0.012
      c.strokeStyle = 'rgba(120, 90, 50, 0.5)'
      c.beginPath()
      c.moveTo(-h * 0.8, -u * 0.02)
      c.lineTo(h * 0.8, u * 0.015)
      c.stroke()
      return
    case 'string':
      c.lineWidth = u * 0.05
      c.strokeStyle = INK.string
      c.beginPath()
      c.moveTo(-h, 0)
      c.bezierCurveTo(-h * 0.4, u * 0.3, h * 0.1, -u * 0.32, h, 0)
      c.stroke()
  }
}
