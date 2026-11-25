import { surface, type Ctx } from './paint'

// A pen for the tests, which have no canvas: it takes every call, and refuses a number that is not one.

export function fakePen(): { ctx: Ctx; depth: () => number } {
  let depth = 0
  const known: Record<string, unknown> = {
    save: () => { depth++ },
    restore: () => { if (--depth < 0) throw new Error('restored more than saved') },
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
  }
  const ctx = new Proxy(known, {
    get: (o, k: string) => (k in o ? o[k] : (...args: unknown[]) => { if (args.some((a) => typeof a === 'number' && !Number.isFinite(a))) throw new Error(`${k} was given a number that is not one`) }),
    set: () => true,
  }) as unknown as Ctx
  return { ctx, depth: () => depth }
}

/** Makes every surface a fake one. Returns the undo. */
export function fakeSurfaces(): () => void {
  const real = surface.make
  surface.make = () => ({ canvas: {} as CanvasImageSource, ctx: fakePen().ctx })
  return () => { surface.make = real }
}
