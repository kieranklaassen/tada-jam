// Strokes gathered before they are drawn. The airs of a house are hundreds of
// short marks in a handful of pens; drawn one stroke call each they would be
// most of a frame's draw calls. Here every mark is written down under the pen
// it is drawn with, and at the end each pen is put to the page once.

const MOVE = 0, LINE = 1, QUAD = 2, ARC = 3, OVAL = 4

/** What a mark can be made of: the few path calls the airs use. A canvas context has them all, and so has a `Trace`. */
export type PathLike = {
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
}

/** The marks of one pen, written down. */
export class Trace implements PathLike {
  readonly ops: number[] = []
  moveTo(x: number, y: number): void { this.ops.push(MOVE, x, y) }
  lineTo(x: number, y: number): void { this.ops.push(LINE, x, y) }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void { this.ops.push(QUAD, cx, cy, x, y) }
  /** A whole circle. */
  circle(x: number, y: number, r: number): void { this.ops.push(ARC, x, y, r) }
  /** A whole oval, turned. */
  oval(x: number, y: number, rx: number, ry: number, turn: number): void { this.ops.push(OVAL, x, y, rx, ry, turn) }

  /** Lays the marks down as one path on a context. */
  replay(ctx: CanvasRenderingContext2D): void {
    const ops = this.ops
    ctx.beginPath()
    for (let i = 0; i < ops.length;) {
      const op = ops[i]!
      if (op === MOVE) { ctx.moveTo(ops[i + 1]!, ops[i + 2]!); i += 3 }
      else if (op === LINE) { ctx.lineTo(ops[i + 1]!, ops[i + 2]!); i += 3 }
      else if (op === QUAD) { ctx.quadraticCurveTo(ops[i + 1]!, ops[i + 2]!, ops[i + 3]!, ops[i + 4]!); i += 5 }
      else if (op === ARC) { ctx.moveTo(ops[i + 1]! + ops[i + 3]!, ops[i + 2]!); ctx.arc(ops[i + 1]!, ops[i + 2]!, ops[i + 3]!, 0, Math.PI * 2); i += 4 }
      else { ctx.moveTo(ops[i + 1]! + ops[i + 3]! * Math.cos(ops[i + 5]!), ops[i + 2]! + ops[i + 3]! * Math.sin(ops[i + 5]!)); ctx.ellipse(ops[i + 1]!, ops[i + 2]!, ops[i + 3]!, ops[i + 4]!, ops[i + 5]!, 0, Math.PI * 2); i += 6 }
    }
  }
}

type Pen = { trace: Trace; color: string; width: number; alpha: number; join: CanvasLineJoin; fill: string | null }

/** Every pen in use this frame, each with the marks made in it so far. */
export class Marks {
  private readonly pens = new Map<string, Pen>()

  /** The marks of a line of this colour, weight and strength: the same three always give the same trace. */
  stroke(color: string, width: number, alpha = 1, join: CanvasLineJoin = 'round'): Trace {
    return this.pen(color, width, alpha, join, null)
  }

  /** The marks of shapes filled flat and then outlined. */
  filled(fill: string, color: string, width: number, alpha = 1): Trace {
    return this.pen(color, width, alpha, 'round', fill)
  }

  private pen(color: string, width: number, alpha: number, join: CanvasLineJoin, fill: string | null): Trace {
    const key = `${color} ${Math.round(width * 100)} ${alpha} ${join} ${fill}`
    let pen = this.pens.get(key)
    if (!pen) { pen = { trace: new Trace(), color, width, alpha, join, fill }; this.pens.set(key, pen) }
    return pen.trace
  }

  /** Puts every pen to the page once, filled shapes under lines, and says how many there were. The strength of each is a share of the context's own. */
  flush(ctx: CanvasRenderingContext2D): number {
    const strength = ctx.globalAlpha
    let count = 0
    for (const pass of [true, false]) {
      for (const pen of this.pens.values()) {
        if ((pen.fill !== null) !== pass || pen.trace.ops.length === 0) continue
        ctx.globalAlpha = strength * pen.alpha
        pen.trace.replay(ctx)
        if (pen.fill !== null) { ctx.fillStyle = pen.fill; ctx.fill() }
        ctx.strokeStyle = pen.color
        ctx.lineWidth = pen.width
        ctx.lineJoin = pen.join
        ctx.stroke()
        count++
      }
    }
    ctx.lineJoin = 'round'
    ctx.globalAlpha = strength
    this.pens.clear()
    return count
  }
}
