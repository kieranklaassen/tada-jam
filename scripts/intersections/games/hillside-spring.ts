// Hillside Spring's intersection audit: the guidance ladder's first
// demonstration on a fresh garden; the starter bend turned and a split, a
// waterwheel and a sluice carried in from the rack at a quick child's pace, so
// the cosmos and sunflower drink and bloom, the sparrow and the tanuki come,
// and a second split sends water to the rice paddy for the frog; the sluice
// shut and opened; a straight carried over the built pieces and set down, and
// the wheel spun; every visitor poked through its reactions, two beds
// harvested, the sky, meadow and creek touched; then the garden left to live.

import type { Driver, Frac, GameAudit } from '../types.ts'

// Grid to world, mirroring games/hillside-spring/view/world.ts.
const COLS = 7
const ROWS = 5
const ROW_DEPTH = 0.95
const STEP = 0.42
const PIPE_Y = 0.17
const cellX = (c: number) => c - (COLS - 1) / 2
const rowZ = (r: number) => (r - (ROWS - 1) / 2) * ROW_DEPTH
const floorY = (r: number) => (ROWS - 1 - r) * STEP
const CREEK_Z1 = rowZ(ROWS - 1) + ROW_DEPTH / 2 + 0.02 + 0.62
const RACK_Z = CREEK_Z1 + 0.6
const RACK_Y = -0.2 + 0.02
// The rack's slots, left to right: bend, straight, split, sluice, wheel.
const BEND = 0
const STRAIGHT = 1
const SPLIT = 2
const SLUICE = 3
const WHEEL = 4
const rackX = (slot: number) => (slot - 2) * 1.25

async function at(d: Driver, x: number, y: number, z: number): Promise<Frac> {
  const p = await d.page.evaluate((q) => (window as unknown as { __jamAudit: { projectFrac(p: number[]): number[] } }).__jamAudit.projectFrac(q), [x, y, z])
  return [p[0], p[1]]
}
const cell = (d: Driver, c: number, r: number) => at(d, cellX(c), floorY(r) + PIPE_Y, rowZ(r))
const rack = (d: Driver, slot: number) => at(d, rackX(slot), RACK_Y + 0.15, RACK_Z)

async function tapNamed(d: Driver, pattern: string, fallback: Frac): Promise<void> {
  await d.tap((await d.find(pattern)) ?? fallback)
}

export default {
  enforce: true,
  moments: [
    // The glow comes at 3 s and the ghost hand presses the starter bend at 5–8 s.
    { name: 'idle', run: (d) => d.wait(8600) },
    {
      name: 'build-and-bloom',
      run: async (d) => {
        // The starter bend turned toward the cosmos; a wheel on its stream, a split under the spring, a sluice on the
        // sunflower's side.
        await d.tap(await cell(d, 3, 1))
        await d.wait(400)
        await d.drag(await rack(d, WHEEL), await cell(d, 2, 2), 700)
        await d.wait(300)
        await d.drag(await rack(d, SPLIT), await cell(d, 3, 0), 700)
        await d.wait(300)
        await d.drag(await rack(d, SLUICE), await cell(d, 4, 1), 700)
        await d.wait(7000)
        // The sluice slammed shut and lifted open again.
        await d.tap(await cell(d, 4, 1))
        await d.wait(1200)
        await d.tap(await cell(d, 4, 1))
        await d.wait(600)
        // A second split under the wheel sends water to the rice paddy, and the frog comes.
        await d.drag(await rack(d, SPLIT), await cell(d, 2, 3), 700)
        await d.wait(5000)
      },
    },
    {
      name: 'carry',
      run: async (d) => {
        // A straight carried from the rack over the wheel and the sluice, set down on an empty cell, then moved.
        await d.press(await rack(d, STRAIGHT))
        await d.move(await cell(d, 2, 3), 400)
        await d.move(await cell(d, 2, 2), 500)
        await d.move(await cell(d, 3, 1), 400)
        await d.move(await cell(d, 4, 1), 500)
        await d.move(await cell(d, 5, 2), 400)
        await d.release()
        await d.wait(600)
        await d.drag(await cell(d, 5, 2), await cell(d, 5, 3), 500)
        await d.wait(400)
        // A bend carried in and turned twice, a quick double tap.
        await d.drag(await rack(d, BEND), await cell(d, 1, 1), 600)
        await d.wait(300)
        await d.tap(await cell(d, 1, 1))
        await d.wait(150)
        await d.tap(await cell(d, 1, 1))
        await d.wait(400)
        // The wheel spun by hand.
        await d.tap(await cell(d, 2, 2))
        await d.wait(1500)
      },
    },
    {
      name: 'pokes-and-harvest',
      run: async (d) => {
        for (let i = 0; i < 3; i++) {
          await tapNamed(d, 'frog-body\\b', await cell(d, 1, 3))
          await d.wait(1300)
        }
        for (let i = 0; i < 3; i++) {
          await tapNamed(d, 'sparrow-body\\b', await cell(d, 2, 4))
          await d.wait(1300)
        }
        for (let i = 0; i < 3; i++) {
          await tapNamed(d, 'tanuki-body\\b', await at(d, cellX(0) - 1.1, floorY(2) + 0.2, rowZ(2)))
          await d.wait(1600)
        }
        // The cosmos and the sunflower picked, and the sky, a side meadow and the creek touched.
        await d.tap(await cell(d, 2, 4))
        await d.wait(700)
        await d.tap(await cell(d, 4, 2))
        await d.wait(700)
        await d.tap([0.5, 0.06])
        await d.wait(400)
        await d.tap(await at(d, 5.5, floorY(3) + 0.3, rowZ(3)))
        await d.wait(400)
        await d.tap(await at(d, 4.5, -0.36, CREEK_Z1 - 0.3))
        await d.wait(800)
      },
    },
    // Left alone: the visitors' own lives, the wheel turning, the beds regrowing.
    { name: 'rest', run: (d) => d.wait(7000) },
  ],
  ignore: [
    // Screen-pinned painting and light: the sky and grade quads draw with no depth test, the far hills card and the
    // additive light shafts write no depth.
    '^sky\\b',
    '^grade\\b',
    '^far-hills\\b',
    '^light-shafts\\b',
    // The ghost hand draws over everything with no depth test.
    '^ghost-hand\\b',
    // Soft blob shadows and glow rings: flat decals lifted over the ground with no depth write and a polygon offset.
    '^shadows\\b',
    '^rings\\b',
    // Wet ground: the grass darkened under loose water, a flat decal lifted a hair over the floor with no depth write.
    '^wet-ground\\b',
  ],
  allow: [
    // The bamboo kit: one instanced mesh per part, its instances refilled whenever a piece comes, goes or is carried.
    {
      a: '^bamboo-hub\\b',
      b: '^bamboo-arm\\b',
      kind: 'pose',
      upTo: 1.5,
      reason:
        "a piece's trough arms run into its lashed hub, where the water passes between them; the kit refills its instances as pieces come and go, so the pose history, kept by instance slot, takes one piece's joint for a joint that moved",
    },
    {
      a: '^bamboo-arm\\b',
      b: '^bamboo-arm\\b',
      kind: 'pose',
      upTo: 1.5,
      reason: "a bend's or a split's arms meet inside its hub; seen as moving only because the kit's instance slots pass from piece to piece",
    },
    { a: '^running-water\\b', b: '^wheel\\b', kind: 'penetration', upTo: 0.3, reason: 'the water falling onto the wheel runs down through its paddles: that is what turns it' },
    // Set into the ground on purpose, so nothing floats.
    { a: '^beds\\b', b: '^crops\\b', kind: 'penetration', upTo: 0.22, reason: "each plant grows up out of its bed's soil, the feet of its stems under it" },
    { a: '^hillside\\b', b: '^foliage\\b', kind: 'penetration', upTo: 0.13, reason: 'bushes, tufts and wildflowers stand with their feet in the ground where it slopes, so no gap shows under them' },
    // The frog sitting on its paddy's ridge.
    { a: '^beds\\b', b: 'frog-leg\\b', kind: 'penetration', upTo: 0.55, reason: "sitting on the rice paddy's ridge, the frog lets a hind toe dip into the water" },
    { a: '^hillside\\b', b: 'frog-leg\\b', kind: 'penetration', upTo: 0.36, reason: 'the same dipped toe reaches the soil at the bottom of the paddy, under its water' },
    // The visitors' own parts, moving at their joints.
    {
      a: 'frog-body\\b',
      b: 'frog-(eyes|leg|throat)\\b',
      kind: 'pose',
      upTo: 0.45,
      reason: "the frog's eyes sit in bumps on its head, its legs join at the hips and its throat puffs out of its chin, each moving there as it hops and croaks",
    },
    {
      a: 'sparrow-body\\b',
      b: 'sparrow-(head|wing|tail)\\b',
      kind: 'pose',
      upTo: 0.5,
      reason: "the sparrow's head turns at its neck, its wings fold against its sides and its tail flicks at its rump",
    },
    {
      a: 'tanuki-body\\b',
      b: 'tanuki-(head|ear|tail)\\b',
      kind: 'pose',
      upTo: 1.3,
      reason: "the tanuki's head and tail join its body and turn there; curled up, it tucks its head against its flank, an ear pressed into its fur, and wraps its tail round",
    },
    { a: 'tanuki-head\\b', b: 'tanuki-eyes-shut\\b', kind: 'pose', upTo: 1.2, reason: 'its sleeping eyes are two arcs drawn into the fur of its face, shown as it dozes' },
  ],
} satisfies GameAudit
