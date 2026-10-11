// A stand-in for a canvas and its 2D context, for the tests that draw the
// real frame without a browser. It paints nothing. It keeps the transform as
// a canvas does, and writes down every picture that is stamped (which one,
// and the box it covers on the surface in pixels) and how many fills and
// strokes were made. Only tests use it.

export type Stamped = {
  /** The picture that was stamped: the canvas it was drawn into once. */
  image: object
  /** The box it covers on the surface, in pixels, and the middle of it. */
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
}

type Matrix = [number, number, number, number, number, number]

export class Recording {
  stamps: Stamped[] = []
  fills = 0
  strokes = 0
  private m: Matrix = [1, 0, 0, 1, 0, 0]
  private readonly kept: Matrix[] = []

  constructor(readonly width: number, readonly height: number) {}

  /** Forgets what was drawn; the transform is left as it is, as a new frame finds it. */
  reset(): void {
    this.stamps = []
    this.fills = 0
    this.strokes = 0
  }

  save(): void {
    this.kept.push([...this.m] as Matrix)
  }

  restore(): void {
    const was = this.kept.pop()
    if (was) this.m = was
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.m = [a, b, c, d, e, f]
  }

  resetTransform(): void {
    this.m = [1, 0, 0, 1, 0, 0]
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    const [A, B, C, D, E, F] = this.m
    this.m = [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E, B * e + D * f + F]
  }

  translate(x: number, y: number): void {
    this.transform(1, 0, 0, 1, x, y)
  }

  scale(x: number, y: number): void {
    this.transform(x, 0, 0, y, 0, 0)
  }

  rotate(turn: number): void {
    const c = Math.cos(turn), s = Math.sin(turn)
    this.transform(c, s, -s, c, 0, 0)
  }

  private point(x: number, y: number): { x: number; y: number } {
    const [a, b, c, d, e, f] = this.m
    return { x: a * x + c * y + e, y: b * x + d * y + f }
  }

  drawImage(image: { width: number; height: number }, ...rest: number[]): void {
    const [x, y, w, h] = rest.length >= 8 ? rest.slice(4, 8) : rest.length >= 4 ? rest : [rest[0], rest[1], image.width, image.height]
    const corners = [this.point(x, y), this.point(x + w, y), this.point(x, y + h), this.point(x + w, y + h)]
    const xs = corners.map((p) => p.x), ys = corners.map((p) => p.y)
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
    const mid = this.point(x + w / 2, y + h / 2)
    this.stamps.push({ image, x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: mid.x, cy: mid.y })
  }

  fill(): void {
    this.fills += 1
  }

  fillRect(): void {
    this.fills += 1
  }

  stroke(): void {
    this.strokes += 1
  }

  strokeRect(): void {
    this.strokes += 1
  }

  createLinearGradient(): { addColorStop(): void } {
    return { addColorStop: () => {} }
  }

  createRadialGradient(): { addColorStop(): void } {
    return { addColorStop: () => {} }
  }

  createPattern(): object {
    return {}
  }
}

/** A context that records: every call a recording has no use for does nothing, and every setting is taken and dropped. */
function contextOf(recording: Recording): CanvasRenderingContext2D {
  const nothing = (): void => {}
  return new Proxy(recording, {
    get(target, name) {
      const own = Reflect.get(target, name)
      if (own !== undefined) return typeof own === 'function' ? own.bind(target) : own
      return nothing
    },
    set() {
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

/** A canvas that records, with the recording it writes into. */
export function recordingCanvas(width: number, height: number): { canvas: HTMLCanvasElement; recording: Recording } {
  const recording = new Recording(width, height)
  const context = contextOf(recording)
  const canvas = { width, height, getContext: () => context, style: {}, dataset: {} } as unknown as HTMLCanvasElement
  return { canvas, recording }
}

/** Makes recording canvases, and counts them. */
export function recordingCanvases(): { make: (width: number, height: number) => HTMLCanvasElement; made: () => number; recordingOf: (canvas: object) => Recording | undefined } {
  let made = 0
  const all = new Map<object, Recording>()
  return {
    make: (width, height) => {
      made += 1
      const one = recordingCanvas(width, height)
      all.set(one.canvas, one.recording)
      return one.canvas
    },
    made: () => made,
    recordingOf: (canvas) => all.get(canvas),
  }
}
