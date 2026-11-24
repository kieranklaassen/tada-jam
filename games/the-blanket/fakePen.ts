import { surface, type Ctx } from './paint'

// A pen for the tests, which have no canvas: it takes every call, and keeps
// where each picture was stamped.

export type Stamped = { image: unknown; x: number; y: number }

export function fakePen(): { ctx: Ctx; stamps: Stamped[]; fills: () => number } {
  const stamps: Stamped[] = []
  let m = [1, 0, 0, 1, 0, 0], fills = 0
  const saved: number[][] = []
  const mul = (n: number[]) => { const [a, b, c, d, e, f] = m; m = [a * n[0] + c * n[1], b * n[0] + d * n[1], a * n[2] + c * n[3], b * n[2] + d * n[3], a * n[4] + c * n[5] + e, b * n[4] + d * n[5] + f] }
  const known: Record<string, unknown> = {
    save: () => saved.push([...m]),
    restore: () => { const back = saved.pop(); if (!back) throw new Error('restored more than saved'); m = back },
    translate: (x: number, y: number) => mul([1, 0, 0, 1, x, y]),
    scale: (x: number, y: number) => mul([x, 0, 0, y, 0, 0]),
    rotate: (r: number) => mul([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]),
    drawImage: (image: unknown) => stamps.push({ image, x: m[4], y: m[5] }),
    fill: () => { fills++ },
    get depth() { return saved.length },
  }
  const ctx = new Proxy(known, {
    get: (o, k: string) => (k in o ? o[k] : (...args: unknown[]) => { if (args.some((a) => typeof a === 'number' && !Number.isFinite(a))) throw new Error(`${k} was given a number that is not one`) }),
    set: () => true,
  }) as unknown as Ctx
  return { ctx, stamps, fills: () => fills }
}

/** Makes every surface a fake one, named by nothing. Returns the undo. */
export function fakeSurfaces(): () => void {
  const real = surface.make
  surface.make = () => ({ canvas: {} as CanvasImageSource, ctx: fakePen().ctx })
  return () => { surface.make = real }
}
