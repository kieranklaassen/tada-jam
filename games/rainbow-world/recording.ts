import type { Canvas, Ctx, MakeCanvas } from './paper'

// A stand-in for a 2D canvas, for tests, which run without one. It draws nothing and keeps a tally: how often
// each drawing call was made, and every sprite stamp with where it went. The real view and the real painters
// draw into it, so what is counted is what a frame costs.

export type Stamp = { width: number; height: number; args: number[] }

export class Recording {
  readonly calls: Record<string, number> = {}
  readonly stamps: Stamp[] = []
  readonly log: string[] = []
  readonly image: { width: number; height: number }
  readonly ctx: Ctx

  constructor(width: number, height: number) {
    this.image = { width, height }
    const fields: Record<string, unknown> = {}
    const gradient = { addColorStop: () => {} }
    this.ctx = new Proxy({}, {
      get: (_, name: string) => {
        if (name in fields) return fields[name]
        if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => gradient
        return (...args: unknown[]) => {
          this.calls[name] = (this.calls[name] ?? 0) + 1
          const numbers = args.filter((arg): arg is number => typeof arg === 'number')
          this.log.push(`${name}(${numbers.map((n) => n.toFixed(3)).join(',')})`)
          if (name === 'drawImage') {
            const source = args[0] as { width: number; height: number }
            this.stamps.push({ width: source.width, height: source.height, args: numbers })
          }
        }
      },
      set: (_, name: string, value) => {
        fields[name] = value
        return true
      },
    }) as unknown as Ctx
  }

  /** Forgets what was counted, before the frame that is to be measured. */
  reset(): void {
    for (const name of Object.keys(this.calls)) delete this.calls[name]
    this.stamps.length = 0
    this.log.length = 0
  }

  count(name: string): number {
    return this.calls[name] ?? 0
  }
}

/** A factory for `useCanvases` in paper.ts: every sprite and the painted setting are cut into recordings. */
export function recordingCanvases(): { make: MakeCanvas; made: Recording[] } {
  const made: Recording[] = []
  const make: MakeCanvas = (width, height): Canvas => {
    const recording = new Recording(width, height)
    made.push(recording)
    return { image: recording.image as unknown as CanvasImageSource, ctx: recording.ctx }
  }
  return { make, made }
}
