import type { Driver, Frac, GameAudit } from '../types.ts'

// Shadow Lantern played at a child's pace: the idle guidance, then all six
// creatures woken by doing what the game's own hint asks (bestHint from the
// default age-5 theatre, move by move), then the sky, lamp and floor tapped,
// then stands pushed through each other and into the back corner.
//
// Stands are moved in world centimetres: the finger presses the card where it
// is drawn, and slides by the wanted change of its pin on the grip plane the
// controller drags on (PIN_HEIGHT + GRIP_HEIGHT above the floor).

const GRIP_Y = 26

type Kind = 'bigTri' | 'smallTri' | 'semiA' | 'semiB' | 'square' | 'strip' | 'crescent'
type At = { x: number; z: number }

type AuditWindow = {
  __jamAudit: {
    main(): { camera: { position: { constructor: new (x?: number, y?: number, z?: number) => Vec } } }
    projectFrac(point: [number, number, number]): [number, number, number] | null
  }
}
type Vec = { x: number; y: number; z: number; unproject(camera: unknown): Vec }

const HOME: Record<Kind, At> = {
  bigTri: { x: -30, z: 38 },
  smallTri: { x: -21, z: 38 },
  semiA: { x: -26, z: 46 },
  square: { x: -16, z: 47 },
  semiB: { x: 20, z: 24 },
  strip: { x: 17, z: 47 },
  crescent: { x: 28, z: 46 },
}

// Where the script last put each pin; the audit plays one run, so module state is safe.
const pins: Record<Kind, At> = structuredClone(HOME)

function project(d: Driver, x: number, y: number, z: number): Promise<Frac> {
  return d.page.evaluate(([px, py, pz]) => {
    const f = (window as unknown as AuditWindow).__jamAudit.projectFrac([px, py, pz])
    return f ? ([f[0], f[1]] as const) : ([0.5, 0.5] as const)
  }, [x, y, z] as const)
}

/** Where the ray through a screen point meets the grip plane. */
function gripAt(d: Driver, f: Frac): Promise<At> {
  return d.page.evaluate(
    ([fx, fy, gy]) => {
      const camera = (window as unknown as AuditWindow).__jamAudit.main().camera
      const V = camera.position.constructor
      const a = new V(fx * 2 - 1, 1 - fy * 2, -1).unproject(camera)
      const b = new V(fx * 2 - 1, 1 - fy * 2, 1).unproject(camera)
      const k = (gy - a.y) / (b.y - a.y)
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k }
    },
    [f[0], f[1], GRIP_Y] as const,
  )
}

async function grab(d: Driver, kind: Kind): Promise<Frac> {
  const f = await d.find(`^card-${kind}\\b`)
  if (!f) throw new Error(`card-${kind} is not on screen`)
  return [f[0], f[1]]
}

async function turn(d: Driver, kind: Kind, taps = 1): Promise<void> {
  for (let i = 0; i < taps; i++) {
    await d.tap(await grab(d, kind))
    await d.wait(260)
  }
}

/** Slide a stand so its pin ends at `to`, by way of `via` points, finger down throughout. */
async function slide(d: Driver, kind: Kind, to: At, ms = 700, via: At[] = []): Promise<void> {
  const start = await grab(d, kind)
  const g = await gripAt(d, start)
  const from = pins[kind]
  await d.press(start)
  const legs = [...via, to]
  for (const leg of legs) {
    const f = await project(d, g.x + leg.x - from.x, GRIP_Y, g.z + leg.z - from.z)
    await d.move(f, Math.round(ms / legs.length))
  }
  await d.wait(100)
  await d.release()
  pins[kind] = { ...to }
  await d.wait(350)
}

async function tapWorld(d: Driver, x: number, y: number, z: number): Promise<void> {
  await d.tap(await project(d, x, y, z))
}

export default {
  enforce: true,
  query: 'tier=0',
  childAge: 5,
  moments: [
    // Nothing touched: the stands glow at 3 s and the ghost hand demonstrates a move at 5 s.
    { name: 'idle guidance', run: (d) => d.wait(8400) },
    {
      name: 'wake the bird, fish and snail',
      run: async (d) => {
        await turn(d, 'bigTri')
        await slide(d, 'bigTri', { x: 2, z: 47 }, 900)
        await slide(d, 'semiB', { x: -14, z: 9 }, 800)
        await d.wait(4600)
        // Fish.
        await turn(d, 'bigTri')
        await d.wait(4600)
        // Snail.
        await turn(d, 'semiB', 2)
        await slide(d, 'semiB', { x: 6, z: 35 }, 800)
        await d.wait(4600)
      },
    },
    {
      name: 'wake the whale, fox and dragon',
      run: async (d) => {
        await slide(d, 'square', { x: -10, z: 35 }, 800)
        await d.wait(4600)
        // Fox.
        await slide(d, 'semiB', { x: -14, z: 21 }, 700)
        await slide(d, 'square', { x: -6, z: 9 }, 800)
        await turn(d, 'semiB')
        await slide(d, 'semiB', { x: -6, z: 42 }, 800)
        await d.wait(4600)
        // Dragon.
        await slide(d, 'square', { x: 6, z: 35 }, 800)
        await turn(d, 'semiB', 2)
        await d.wait(5200)
      },
    },
    {
      name: 'tap the sky, lamp and floor, then push stands through each other',
      run: async (d) => {
        await tapWorld(d, -24, 55.5, -12)
        await d.wait(600)
        await tapWorld(d, 26, 55.5, -12)
        await d.wait(600)
        await tapWorld(d, 0, 23, 64)
        await d.wait(600)
        await tapWorld(d, 0, 34, 0)
        await d.wait(600)
        await tapWorld(d, 24, 0, 30)
        await d.wait(600)
        // The strip slides the length of the back row, through the big triangle's depth.
        await slide(d, 'strip', { x: -12, z: 47 }, 1100)
        // The crescent lands on the square's pin.
        await slide(d, 'crescent', { x: 6, z: 36 }, 900)
        // The small triangle swings round into the half-moon's place.
        await slide(d, 'smallTri', { x: -26, z: 45 }, 900, [{ x: -12, z: 42 }])
        // The half-moon goes off the back corner by the curtain.
        await slide(d, 'semiA', { x: -40, z: 4 }, 900)
        await d.wait(900)
      },
    },
  ],
  allow: [
    {
      a: '^scenery',
      b: '^screen-shadows',
      kind: 'penetration',
      upTo: 1.2,
      reason: "the shadows' material clips them to the screen's paper (clippingPlanes), which the audit does not model: what would cross the frame is never drawn",
    },
  ],
  ignore: [
    // Additive light: the flame's halo and the dust in the beam.
    '^flame-halo',
    '^dust-motes',
    // The demonstration's see-through hand and card copy: drawn over everything
    // (depthTest off), so they can neither cross nor fight anything.
    '^ghost-hand',
    '^ghost-card',
  ],
} satisfies GameAudit
