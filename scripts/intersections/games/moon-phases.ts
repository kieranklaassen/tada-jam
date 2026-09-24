import type { Driver, Frac, GameAudit } from '../types.ts'

// Moon Phases: the orrery's moving parts (the moon on its arm and the rings of
// the two halves round it, the gears, the medallions rising from the table,
// the child on the turning Earth) through everything a child does with them:
// the moon walked a full orbit by hand, every phase, the model turned low and
// top-down, the halves shown while the moon moves, standing on Earth, the day
// dial, and home moved about the globe.

type Vec = { x: number; y: number; z: number }
type Audit = {
  main(): { scene: { getObjectByName(name: string): { getWorldPosition(v: Vec): Vec } | undefined }; camera: { position: { constructor: new () => Vec } } } | null
  projectFrac(point: number[]): number[] | null
}

const ORBIT_R = 3.3
const PLANE_Y = 1.7

async function key(d: Driver, code: string, wait: number): Promise<void> {
  await d.page.keyboard.press(code)
  await d.wait(wait)
}

/** Screen points round the moon's orbit, starting where the moon is now. */
async function orbit(d: Driver, steps: number, turns: number): Promise<Frac[]> {
  const points = await d.page.evaluate(([n, t, r, y]) => {
    const audit = (window as unknown as { __jamAudit: Audit }).__jamAudit
    const pair = audit.main()
    const moon = pair?.scene.getObjectByName('moon')
    if (!pair || !moon) return []
    const at = moon.getWorldPosition(new pair.camera.position.constructor())
    const start = Math.atan2(at.z, at.x)
    const out: number[][] = []
    for (let i = 0; i <= n; i++) {
      const a = start + (i / n) * t * Math.PI * 2
      const p = audit.projectFrac([Math.cos(a) * r, y, Math.sin(a) * r])
      if (p) out.push([p[0], p[1]])
    }
    return out
  }, [steps, turns, ORBIT_R, PLANE_Y] as const)
  return points.map((p) => [p[0], p[1]] as Frac)
}

/** Grabs the moon and walks it `turns` round Earth by hand. */
async function walkMoon(d: Driver, steps: number, msPerStep: number, turns: number): Promise<void> {
  const path = await orbit(d, steps, turns)
  if (path.length < 2) return
  await d.press(path[0])
  for (const p of path.slice(1)) await d.move(p, msPerStep)
  await d.release()
}

const audit: GameAudit = {
  enforce: true,
  moments: [
    { name: 'opening', run: async (d) => { await d.wait(6000) } },
    {
      name: 'moon dragged round',
      run: async (d) => {
        const moon = (await d.find('moon-arm:[0-9]+/moon:')) ?? [0.61, 0.62]
        await d.drag(moon, [0.8, 0.5], 900)
        const next = (await d.find('moon-arm:[0-9]+/moon:')) ?? [0.8, 0.5]
        await d.drag(next, [0.5, 0.35], 900)
        const last = (await d.find('moon-arm:[0-9]+/moon:')) ?? [0.5, 0.35]
        await d.drag(last, [0.25, 0.6], 900)
        await d.wait(800)
      },
    },
    // A whole orbit by hand, then scrubbed back a quarter: every angle of the arm over the clockwork.
    { name: 'moon walked a full orbit', run: async (d) => { await walkMoon(d, 16, 200, 1); await walkMoon(d, 4, 160, -0.25); await d.wait(300) } },
    {
      name: 'phases tapped',
      run: async (d) => {
        for (const at of [[0.53, 0.86], [0.91, 0.64], [0.29, 0.73], [0.43, 0.44]] as const) {
          await d.tap(at)
          await d.wait(1100)
        }
      },
    },
    // Every phase from the strip at a quick child's pace: each medallion rises and settles.
    { name: 'every phase', run: async (d) => { for (let i = 1; i <= 8; i++) await key(d, `Digit${i}`, 800) } },
    // New to full and back before either tween ends: the arm swings half an orbit at once.
    { name: 'jump across the month', run: async (d) => { await key(d, 'Digit5', 450); await key(d, 'Digit1', 450); await key(d, 'Digit3', 900) } },
    // The model turned half round and down to its lowest, grazing view across the tabletop.
    {
      name: 'turned low',
      run: async (d) => {
        await d.drag([0.2, 0.2], [0.75, 0.1], 900)
        await d.wait(1000)
        await walkMoon(d, 8, 180, 0.5)
        await d.wait(500)
      },
    },
    // Tipped up to look straight down on the clockwork.
    {
      name: 'turned top-down',
      run: async (d) => {
        await d.drag([0.35, 0.1], [0.3, 0.45], 700)
        await d.wait(1000)
        for (const code of ['Digit2', 'Digit6', 'Digit8']) await key(d, code, 700)
        await d.drag([0.3, 0.45], [0.36, 0.2], 600)
      },
    },
    // The halves shown, then the moon walked round and set to the quarters: the rings ride with it.
    {
      name: 'halves shown',
      run: async (d) => {
        await d.tap([0.146, 0.06])
        await d.wait(1500)
        await walkMoon(d, 12, 180, 1)
        for (const code of ['Digit1', 'Digit3', 'Digit5', 'Digit7']) await key(d, code, 650)
      },
    },
    {
      name: 'standing on Earth and back',
      run: async (d) => {
        await d.tap([0.895, 0.13])
        await d.wait(2500)
        await d.drag([0.3, 0.5], [0.6, 0.5], 800)
        await key(d, 'Digit5', 1000)
        await d.tap([0.895, 0.13])
        await d.wait(2500)
      },
    },
    {
      name: 'day turned on the dial',
      run: async (d) => {
        await d.press([0.058, 0.975])
        await d.move([0.015, 0.917], 500)
        await d.move([0.058, 0.86], 500)
        await d.move([0.1, 0.917], 500)
        await d.release()
        await d.wait(800)
      },
    },
    // Home moved about the globe: the child hops to each new place, faces the moon and points; the hours run on.
    {
      name: 'home moved',
      run: async (d) => {
        await d.tap([0.6, 0.4])
        await d.wait(1200)
        const earth = (await d.find('^earth:')) ?? [0.45, 0.45]
        for (const [dx, dy] of [[0.01, -0.02], [-0.025, 0.01], [0.02, 0.025]]) {
          await d.tap([earth[0] + dx, earth[1] + dy])
          await d.wait(700)
        }
        for (let i = 0; i < 6; i++) await key(d, 'BracketRight', 220)
      },
    },
    { name: 'rest', run: async (d) => { await d.wait(3000) } },
  ],
  ignore: [
    // See-through shells and decals, not solids: Earth's air and clouds (the child stands in both), the blue
    // glass half round the moon, and the soft contact shadows lying on the table.
    '^atmosphere', 'clouds', 'seen-cap', 'contact-shadows',
  ],
  allow: [
    {
      a: 'arm-metal',
      b: 'fixed-metal',
      kind: 'penetration',
      reason: "The moon's arm turns on Earth's stand: the stand runs up through the arm's collar, and the beam's middle is hidden inside the collar.",
    },
  ],
}

export default audit
