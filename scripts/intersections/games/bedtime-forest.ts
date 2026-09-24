// Intersection audit script for Bedtime Forest (see scripts/intersections/types.ts).
// A five-year-old's evening: the animals wander at dusk while the invitation,
// the glow and a ghost-hand demo play, then quick taps for tricks and knocks
// on the homes, carries to the wrong homes (the bear bumps out of the burrow,
// the fish flops out of the nest, the owl hops out and flies to its hollow),
// everyone carried to bed in a rush, and the night and the dawn that follow,
// when they wake one by one and wander again.

import type { Driver, Frac, GameAudit } from '../types.ts'

type Audit = { projectFrac(point: number[]): number[] | null }
type Point = [number, number, number]
type Key = 'owl' | 'fox' | 'rabbit' | 'bear' | 'fish' | 'songbird'
type Home = 'hollow' | 'den' | 'burrow' | 'cave' | 'pond' | 'nest'

/** layout.ts: each home's mouth (HOMES[h].mouth), and whose home it is. */
const MOUTH: Record<Home, Point> = {
  hollow: [-77, 22, -38.5],
  cave: [-2, 9, -45],
  nest: [61, 21, -40],
  den: [-86, 6, 14],
  burrow: [88, 4, 11],
  pond: [-52, 0, 46],
}
const HOME: Record<Key, Home> = { owl: 'hollow', fox: 'den', rabbit: 'burrow', bear: 'cave', fish: 'pond', songbird: 'nest' }
const KEYS: Key[] = ['songbird', 'rabbit', 'fox', 'fish', 'owl', 'bear']

async function spot(d: Driver, p: Point): Promise<Frac> {
  const f = await d.page.evaluate((q) => (window as unknown as { __jamAudit: Audit }).__jamAudit.projectFrac(q), p)
  return f ? [f[0], f[1]] : [0.5, 0.5]
}

async function animal(d: Driver, key: Key): Promise<Frac> {
  return (await d.find(`^${key}( |$)`)) ?? [0.5, 0.6]
}

async function carry(d: Driver, key: Key, home: Home, ms = 800): Promise<void> {
  await d.press(await animal(d, key))
  await d.move(await spot(d, MOUTH[home]), ms)
  await d.release()
}

// Arriving at the mouth, going in, asleep, or waking and coming out. The sleeping poses (the bear's slump in front
// of the cave mouth, REFINEMENT.md pass 9; the fox and the rabbit curled) come from the vertex shader.
const AT_HOME = 'an animal in its own doorway: the homes are painted holes on solid trunks and banks, and the sleeping poses are shader-posed (the audit sees the bind pose)'

export default {
  enforce: true,
  allow: [
    // Measured 30-33% (the bear settling in front of the cave) and 30-38% (the owl arriving at its hollow's mouth)
    // over four runs: how deep depends on where in the arrival a sample lands.
    { a: '^scenery$', b: '^(bear|owl)$', kind: 'penetration', upTo: 0.5, reason: AT_HOME },
    // Measured 18% (the fox going into its den) and 15% (the rabbit waking out of its burrow).
    { a: '^scenery$', b: '^(fox|rabbit)$', kind: 'penetration', upTo: 0.28, reason: AT_HOME },
    // Measured 7%: the far trees' trunks, the rocks and the homes' banks are planted in the meadow.
    { a: '^scenery$', b: '^meadow$', kind: 'penetration', upTo: 0.12, reason: 'trunks, rocks and banks planted in the meadow' },
  ],
  ignore: [
    // Inverted-hull ink lines: a back-side copy of the fill's inked pieces (geometry.ts), pushed out in the vertex
    // shader. It is its own geometry, so the audit's hull check (same geometry as a front mesh) misses it, and on
    // the CPU it is the fill a second time.
    '-ink$',
    // A full-screen triangle placed in clip space by its vertex shader (sky.ts); its CPU positions are not the world.
    '^sky$',
  ],
  moments: [
    {
      name: 'dusk: the animals wander, one yawns the invitation, the homes glow and a ghost hand demonstrates',
      run: async (d) => {
        await d.wait(8000)
      },
    },
    {
      name: 'quick taps: every animal plays both its tricks, and three homes are knocked on',
      run: async (d) => {
        for (const round of [0, 1]) {
          for (const key of KEYS) {
            await d.tap(await animal(d, key))
            await d.wait(round ? 350 : 250)
          }
        }
        for (const home of ['cave', 'den', 'nest'] as const) {
          await d.tap(await spot(d, MOUTH[home]))
          await d.wait(300)
        }
        await d.wait(1500)
      },
    },
    {
      name: 'wrong homes: the bear bumps out of the burrow, the fish flops out of the nest, the owl hops out of the burrow',
      run: async (d) => {
        await carry(d, 'bear', 'burrow')
        await d.wait(500)
        await carry(d, 'fish', 'nest')
        await d.wait(500)
        await carry(d, 'owl', 'burrow')
        await d.wait(3500)
      },
    },
    {
      name: 'bedtime in a rush: everyone carried to its own home, then a sparkle and a sleeper stirring at nightfall',
      run: async (d) => {
        for (const key of KEYS) {
          await carry(d, key, HOME[key], 700)
          await d.wait(350)
        }
        await d.wait(4000)
        await d.tap([0.5, 0.25])
        await d.wait(300)
        await d.tap(await spot(d, MOUTH.cave))
        await d.wait(1200)
      },
    },
    {
      name: 'the night, then dawn waking them one by one, songbird first and bear last, to wander again',
      run: async (d) => {
        await d.wait(43000)
      },
    },
  ],
} satisfies GameAudit
