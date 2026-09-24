import type { Driver, Frac, GameAudit } from '../types.ts'

// Kite Tower: a first block under the shelf kite, Pip's climb and flight with
// the watchers cheering, a block carried over and dropped on Pip, pieces
// hopped out of the tray and turned, a tower built and knocked down, and a
// rest while everyone settles. Pieces are one instanced mesh per kind, so the
// script reads each instance's place from the scene rather than find().

type Hook = {
  main(): { scene: { traverse(visit: (o: { name: string; instanceMatrix?: { array: ArrayLike<number> } }) => void): void } } | null
  projectFrac(p: readonly number[]): number[] | null
}
type AuditWindow = { __jamAudit: Hook }

// Piece id -> its instanced mesh and instance index (PIECES order within each kind).
const PIECE: Record<number, readonly [string, number]> = {
  0: ['cube', 0],
  1: ['cube', 1],
  2: ['archL', 0],
  3: ['cube', 2],
  4: ['plank', 0],
  5: ['half', 0],
  6: ['pillar', 0],
  7: ['archM', 0],
  8: ['cube', 3],
  9: ['half', 1],
  10: ['pillar', 1],
  11: ['plank', 1],
}

async function world(d: Driver, x: number, y: number, z = 0): Promise<Frac> {
  const at = await d.page.evaluate((p) => (window as unknown as AuditWindow).__jamAudit.projectFrac(p), [x, y, z])
  return at ? [at[0], at[1]] : [0.5, 0.5]
}

async function piece(d: Driver, id: number): Promise<Frac> {
  const [kind, index] = PIECE[id]
  const at = await d.page.evaluate(
    ([name, i]) => {
      const hook = (window as unknown as AuditWindow).__jamAudit
      let e: ArrayLike<number> | null = null
      hook.main()?.scene.traverse((o) => {
        if (o.name === name && o.instanceMatrix) e = o.instanceMatrix.array
      })
      const m = e as ArrayLike<number> | null
      if (!m) return null
      const k = Number(i) * 16
      return hook.projectFrac([m[k + 12], m[k + 13], m[k + 14]])
    },
    [`piece-${kind}`, index] as const,
  )
  return at ? [at[0], at[1]] : [0.5, 0.5]
}

async function doll(d: Driver, name: 'pip' | 'moss' | 'bean'): Promise<Frac> {
  return (await d.find(`^${name}-body$`)) ?? [0.5, 0.5]
}

export default {
  enforce: true,
  childAge: 5,
  ignore: [
    // Clip-space colour grade: a full-screen triangle drawn with its own vertex shader.
    '^grade',
    // Soft contact shadows, guidance rings, floor and wall shadow maps, the sunbeam and its patch:
    // flat decals with depthWrite off (blobs also polygon-offset), drawn over whatever is under them.
    'shadow-blobs',
    'glow-blobs',
    'floor-shadows',
    'wall-shadows',
    'sunbeam',
    'sun-patch',
    // The demonstration hand is a screen-facing sprite drawn without a depth test.
    'ghost-hand',
  ],
  moments: [
    // Glow at 3 s, the tray peek, then the ghost hand carries a see-through cube (demo at 5 s).
    { name: 'idle-guidance', run: (d) => d.wait(8600) },
    {
      name: 'first-block',
      run: async (d) => {
        await d.drag(await piece(d, 0), await world(d, 4.9, 1.4), 700)
        await d.wait(500)
        await d.tap(await doll(d, 'moss'))
        await d.wait(300)
        await d.tap(await doll(d, 'bean'))
        await d.wait(300)
        await d.tap(await doll(d, 'pip'))
        await d.wait(2400)
      },
    },
    {
      name: 'flight',
      run: async (d) => {
        await d.wait(3200)
        await d.tap(await doll(d, 'moss'))
        await d.drag(await piece(d, 5), await world(d, 1.6, 1.2), 600)
        await d.wait(2600)
        await d.tap(await doll(d, 'bean'))
        await d.wait(3400)
      },
    },
    {
      name: 'carry-over-pip',
      run: async (d) => {
        await d.press(await piece(d, 7))
        const head = await d.find('^pip-head$')
        const [hx, hy] = head ?? [0.5, 0.5]
        await d.move([hx, hy - 0.02], 600)
        await d.move([hx + 0.08, hy], 500)
        await d.move([hx - 0.08, hy - 0.01], 700)
        await d.move([hx, hy - 0.03], 400)
        await d.wait(300)
        await d.release()
        await d.wait(1200)
      },
    },
    {
      name: 'tray-taps',
      run: async (d) => {
        await d.tap(await piece(d, 11))
        await d.wait(500)
        await d.tap(await piece(d, 1))
        await d.wait(500)
        await d.tap(await piece(d, 9))
        await d.wait(900)
      },
    },
    {
      name: 'tower',
      run: async (d) => {
        await d.drag(await piece(d, 6), await world(d, -3.3, 1.4), 500)
        await d.wait(250)
        await d.drag(await piece(d, 10), await world(d, -1.6, 1.4), 500)
        await d.wait(450)
        await d.drag(await piece(d, 4), await world(d, -2.45, 3.3), 600)
        await d.wait(600)
        await d.drag(await piece(d, 2), await world(d, -2.45, 4.6), 600)
        await d.wait(600)
        await d.drag(await piece(d, 3), await world(d, -2.45, 5.9), 600)
        await d.wait(1200)
      },
    },
    {
      name: 'turns',
      run: async (d) => {
        await d.tap(await piece(d, 11))
        await d.wait(500)
        await d.tap(await piece(d, 9))
        await d.wait(450)
        await d.tap(await piece(d, 1))
        await d.wait(800)
      },
    },
    {
      name: 'topple',
      run: async (d) => {
        await d.drag(await piece(d, 10), await world(d, 0.8, 1.2), 450)
        await d.wait(1600)
        await d.drag(await piece(d, 0), await world(d, 2.6, 1.0), 500)
        await d.wait(1800)
      },
    },
    { name: 'rest', run: (d) => d.wait(5000) },
  ],
} satisfies GameAudit
