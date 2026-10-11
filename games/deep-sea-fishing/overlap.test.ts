import { describe, expect, it } from 'vitest'
import { buildFrame } from './frame'
import { SHOVE, bodyBox, ceilingAt, type Game } from './game'
import { CELLS, cellKey, type CellKey } from './grid'
import type { Item } from './items'
import { FRAME, beside, bring, make, run } from './kit'
import { CORNER } from './overlay'
import { IN_TUB, SPRITES } from './rig'
import { makeRng } from './rng'
import { BAITS, CREATURE_IDS, HIT, HOME_CONTROL, HOOK_EYE, HULL, LANTERN, NET, SEABED, TUB, TUB_FRONT_FIRST, TUB_HOLDS, TUB_SLOTS, WATERLINE, inside, pegRect, slotAt, slotRect, type Bait, type CreatureId, type Rect } from './sea'
import { STAGE, fit, toStage } from './stage'

// Nothing passes through anything (ART.md, "Overlap"). This is a canvas 2D
// game, so the jam's intersection audit has nothing to measure and the model
// is tested instead, in every state a child can reach: the line and the hook
// against the hull and the net, bodies against bodies in the sea, the catches
// in the tub, and what can be tapped against the two controls drawn over it.

const items: Item[] = []
/** How far two boxes are into each other: the lesser of the two overlaps, or 0. */
const into = (a: Rect, b: Rect): number => Math.max(0, Math.min(a.right - b.left, b.right - a.left, a.bottom - b.top, b.bottom - a.top))
const boxOf = (game: Game, id: CreatureId): Rect => bodyBox(id, game.creatures[id], game.pose(id))

/** The worst overlap between any two bodies in the sea this frame, and who they are. */
function worst(game: Game): { deep: number; who: string } {
  let deep = 0, who = ''
  const here = CREATURE_IDS.filter((id) => game.creatures[id].mode !== 'away')
  for (let i = 0; i < here.length; i++) {
    for (let j = i + 1; j < here.length; j++) {
      const d = into(boxOf(game, here[i]), boxOf(game, here[j]))
      if (d > deep) { deep = d; who = `${here[i]} in ${here[j]} at ${game.time.toFixed(2)}` }
    }
  }
  return { deep, who }
}
/** A finger that wanders all over the sea, fast, for `seconds`: a new place every third of a second. */
function wander(game: Game, seconds: number, seed: number, each: () => void): void {
  const rng = makeRng(seed)
  for (let t = 0; t < seconds; t += 1 / 3) {
    const to = { x: 20 + rng.next() * 1140, y: 150 + rng.next() * 640 }
    if (game.held) game.drag(to)
    else game.press(to)
    run(game, 1 / 3, each)
  }
}
/** Bodies may meet edge to edge; this is as far as one may be into another while they make way. */
const GIVE = 3

describe('bodies in the sea', () => {
  it('keeps every body out of every other through every cell of the grid and a wandering finger after it', () => {
    for (const key of Object.keys(CELLS) as CellKey[]) {
      const [bait, id] = key.split('.') as [Bait, CreatureId]
      if (key !== cellKey(bait, id, false)) continue
      const game = beside(id, bait)
      let deep = 0, who = ''
      const look = (): void => { const now = worst(game); if (now.deep > deep) { deep = now.deep; who = now.who } }
      bring(game, id, 4, look)
      wander(game, 8, key.length, look)
      expect(deep, `${key}: ${who}`).toBeLessThanOrEqual(GIVE)
    }
  }, 120000)

  it('keeps a train apart from itself and from everyone it is led past', () => {
    for (const [bait, following] of [['glow', ['angler', 'jelly']], ['glow', ['jelly', 'angler']], ['spoon', ['turtle', 'shoal']], ['spoon', ['shoal', 'turtle']], ['cheese', ['blobfish']]] as const) {
      for (const seed of [1, 2, 3]) {
        const game = make({ bait, following: [...following], hook: { x: 640, y: 420 } })
        let deep = 0, who = ''
        wander(game, 30, seed, () => { const now = worst(game); if (now.deep > deep) { deep = now.deep; who = now.who } })
        expect(deep, `${bait} ${following.join()} seed ${seed}: ${who}`).toBeLessThanOrEqual(GIVE)
      }
    }
  }, 120000)

  it('keeps a catch on the hook out of everyone it is drawn past, the octopus in its pot and the blobfish on the sand too', () => {
    for (const hooked of ['puffer', 'jelly', 'angler', 'octopus'] as const) {
      for (const seed of [4, 5]) {
        const game = make({ hooked, hook: { x: 640, y: 420 } })
        let deep = 0, who = ''
        // It stays under the waves, so that it stays on the hook.
        const rng = makeRng(seed)
        for (let t = 0; t < 30; t += 1 / 3) {
          const to = { x: 20 + rng.next() * 1140, y: 330 + rng.next() * 450 }
          if (game.held) game.drag(to)
          else game.press(to)
          run(game, 1 / 3, () => { const now = worst(game); if (now.deep > deep) { deep = now.deep; who = now.who } })
        }
        expect(game.hooked).toBe(hooked)
        expect(deep, `${hooked} seed ${seed}: ${who}`).toBeLessThanOrEqual(GIVE)
      }
    }
  }, 120000)

  it('keeps whoever bolts upward out of whoever is above it, and under the keel, the net and the waves', () => {
    for (const id of ['puffer', 'squid'] as const) {
      for (let phase = 0; phase < 12; phase++) {
        const game = beside(id, id === 'puffer' ? 'spoon' : 'none')
        run(game, phase * 1.3)
        // The squid is sent up by a hunter passing; the pufferfish by the spoon.
        if (id === 'squid') { game.creatures.squid.mode = 'flee'; game.creatures.squid.wait = 0 } else bring(game, id, 0.4)
        let deep = 0, who = ''
        run(game, 5, () => {
          const now = worst(game)
          if (now.deep > deep) { deep = now.deep; who = now.who }
          for (const each of CREATURE_IDS) {
            if (game.creatures[each].mode === 'away') continue
            const box = boxOf(game, each)
            expect(box.top, `${each} at ${game.time.toFixed(2)}`).toBeGreaterThanOrEqual(ceilingAt(box.left, box.right) - 5)
            expect(box.bottom, each).toBeLessThanOrEqual(SEABED + 24)
          }
        })
        expect(deep, `${id} phase ${phase}: ${who}`).toBeLessThanOrEqual(GIVE)
      }
    }
  }, 120000)

  it('keeps everyone apart while the shark tows the boat round its loop', () => {
    for (const following of [[], ['turtle', 'shoal']] as const) {
      const game = beside('shark', 'worm', { following: [] })
      void following
      bring(game, 'shark', 0.6)
      expect(game.tow).not.toBeNull()
      let deep = 0, who = ''
      run(game, 9, () => { const now = worst(game); if (now.deep > deep) { deep = now.deep; who = now.who } })
      expect(deep, who).toBeLessThanOrEqual(GIVE)
    }
  })
})

/** The fishing line of a frame, as points along it no more than a few units apart. */
function lineOf(frame: readonly Item[]): { x: number; y: number }[] {
  const drawn = frame.filter((item): item is Extract<Item, { k: 'line' }> => item.k === 'line' && item.dye === 'cream' && item.w === 2.2)
  expect(drawn).toHaveLength(1)
  const pts = drawn[0].pts, along: { x: number; y: number }[] = []
  for (let i = 2; i < pts.length; i += 2) {
    const steps = Math.max(1, Math.ceil(Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]) / 3))
    for (let s = 0; s <= steps; s++) along.push({ x: pts[i - 2] + ((pts[i] - pts[i - 2]) * s) / steps, y: pts[i - 1] + ((pts[i + 1] - pts[i - 1]) * s) / steps })
  }
  return along
}
/** Inside a box by more than `by`. */
const within = (at: { x: number; y: number }, box: Rect, by: number): boolean => at.x > box.left + by && at.x < box.right - by && at.y > box.top + by && at.y < box.bottom - by

describe('the line and the hook', () => {
  it('never go through the hull or the bag of the net, however fast the finger goes, far left and back', () => {
    let frames = 0
    const found: string[] = []
    for (const seed of [1, 2, 3, 4]) {
      const game = make()
      const rng = makeRng(seed)
      for (let t = 0; t < 30; t += 0.25) {
        // Half the time the finger goes under the boat or the net, or out of the water beside the bow.
        const left = rng.next() < 0.5
        const to = left ? { x: rng.next() * 640, y: 100 + rng.next() * 300 } : { x: rng.next() * 1180, y: 100 + rng.next() * 700 }
        if (game.held) game.drag(to)
        else game.press(to)
        run(game, 0.25, () => {
          frames++
          if (found.length > 0) return
          const frame = buildFrame(game, null, items), hook = game.hook, when = `seed ${seed} at ${game.time.toFixed(2)}`
          // The whole hook, from its foot to its eye, as it is drawn.
          const eye = frame.find((item) => item.k === 'sprite' && item.id === 'hook') as Extract<Item, { k: 'sprite' }>
          if (Math.abs(Math.hypot(eye.x - hook.x, eye.y - hook.y) - HOOK_EYE) > 0.01) found.push(`the eye is off the hook, ${when}`)
          for (const at of [{ x: hook.x, y: hook.y }, { x: (hook.x + eye.x) / 2, y: (hook.y + eye.y) / 2 }, { x: eye.x, y: eye.y }]) {
            if (at.y < WATERLINE - 20) continue
            if (within(at, HULL, 3) || within(at, NET, 3)) found.push(`hook at ${Math.round(at.x)},${Math.round(at.y)}, ${when}`)
          }
          for (const at of lineOf(frame)) if (within(at, HULL, 4) || within(at, NET, 4)) { found.push(`line at ${Math.round(at.x)},${Math.round(at.y)}, ${when}`); break }
        })
      }
    }
    expect(found).toEqual([])
    expect(frames).toBeGreaterThan(7000)
  }, 120000)

  it('take a catch round the bow with them: a catch on the hook is never drawn into the hull', () => {
    const game = make({ hooked: 'puffer', hook: { x: 700, y: 400 } })
    const rng = makeRng(9)
    for (let t = 0; t < 30; t += 0.3) {
      const to = { x: rng.next() * 700, y: 240 + rng.next() * 300 }
      if (game.held) game.drag(to)
      else game.press(to)
      run(game, 0.3, () => {
        if (game.hooked !== 'puffer') return
        const box = boxOf(game, 'puffer')
        expect(box.top, `at ${game.time.toFixed(2)}`).toBeGreaterThanOrEqual(ceilingAt(box.left, box.right) - 5)
      })
    }
  })
})

describe('the tub and the deck', () => {
  /** The room a catch takes in the tub as it is drawn: its sprite at the size and the turn it stands at. */
  function standing(id: keyof typeof IN_TUB, slot: number): Rect {
    const lies = IN_TUB[id], box = SPRITES[id], turned = Math.abs(Math.sin(lies.rot)) > 0.9, at = TUB_SLOTS[slot], s = lies.scale
    // One that stands on its tail has its nose up: what was its length is its height.
    const [left, right, top, bottom] = turned ? [box.y0, box.y1, -box.x1, -box.x0] : [box.x0, box.x1, box.y0, box.y1]
    return { left: at.x + left * s, right: at.x + right * s, top: at.y + lies.y + top * s, bottom: at.y + lies.y + bottom * s }
  }
  const CATCHES = Object.keys(IN_TUB) as (keyof typeof IN_TUB)[]
  /** The rim of the tub: what is below it is behind the staves. */
  const RIM = TUB.y - TUB.halfHeight

  it('stands every catch large enough to be told from the others at arm\'s length: no narrower than the cat\'s head is', () => {
    for (const id of CATCHES) {
      const box = standing(id, 0), wide = box.right - box.left, shows = RIM - box.top
      expect(wide, id).toBeGreaterThanOrEqual(44)
      expect(shows, id).toBeGreaterThanOrEqual(38)
      expect(wide * shows, id).toBeGreaterThanOrEqual(2400)
    }
  })

  it('packs any two catches side by side with one over the other\'s edge only, never over its middle, in any order', () => {
    expect(TUB_SLOTS).toHaveLength(TUB_HOLDS)
    expect([...TUB_FRONT_FIRST].sort()).toEqual([0, 1, 2, 3])
    for (const a of CATCHES) for (const b of CATCHES) {
      if (a === b) continue
      for (let slot = 0; slot + 1 < TUB_HOLDS; slot++) {
        const left = standing(a, slot), right = standing(b, slot + 1)
        // A neighbour covers at most the outer third of a catch: the middle third, where its face is, is always clear.
        const third = (box: Rect): [number, number] => [box.left + (box.right - box.left) / 3, box.right - (box.right - box.left) / 3]
        expect(right.left, `${b} over the middle of ${a} at ${slot}`).toBeGreaterThanOrEqual(third(left)[1] - 1)
        expect(left.right, `${a} over the middle of ${b} at ${slot + 1}`).toBeLessThanOrEqual(third(right)[0] + 1)
      }
      // Two places apart they do not meet at all.
      for (let slot = 0; slot + 2 < TUB_HOLDS; slot++) expect(into(standing(a, slot), standing(b, slot + 2)), `${a} and ${b} two apart`).toBe(0)
    }
  })

  it('keeps every catch above the frame\'s top edge, clear of the stern post\'s lantern and of the cat on its seat', () => {
    for (const id of CATCHES) for (let slot = 0; slot < TUB_HOLDS; slot++) {
      const box = standing(id, slot)
      expect(box.top, `${id} at ${slot}`).toBeGreaterThanOrEqual(8)
      expect(box.right, `${id} at ${slot}`).toBeLessThanOrEqual(HIT.cat.left + 1)
      expect(box.left, `${id} at ${slot}`).toBeGreaterThanOrEqual(LANTERN.x + 6)
      // What shows of it above the rim is inside what a touch on it falls in, but for a hair at the sides.
      const hit = slotRect(slot)
      expect(box.top, `${id} at ${slot}`).toBeGreaterThanOrEqual(hit.top)
      expect(box.left, `${id} at ${slot}`).toBeGreaterThanOrEqual(hit.left - 5)
      expect(box.right, `${id} at ${slot}`).toBeLessThanOrEqual(hit.right + 5)
    }
  })

  it('takes a touch on a catch for that catch: where two lie over each other, for the one in front, and never for the tub or the cat', () => {
    for (let slot = 0; slot < TUB_HOLDS; slot++) {
      const at = TUB_SLOTS[slot]
      expect(slotAt({ x: at.x, y: at.y })).toBe(slot)
      expect(slotAt({ x: at.x, y: 20 })).toBe(slot)
      expect(inside({ x: at.x, y: at.y }, HIT.tub)).toBe(false)
    }
    // Between the first and the second the second is in front, and between the second and the third the second again.
    expect(slotAt({ x: (TUB_SLOTS[0].x + TUB_SLOTS[1].x) / 2, y: 70 })).toBe(1)
    expect(slotAt({ x: (TUB_SLOTS[1].x + TUB_SLOTS[2].x) / 2, y: 70 })).toBe(1)
    expect(slotAt({ x: (TUB_SLOTS[2].x + TUB_SLOTS[3].x) / 2, y: 70 })).toBe(3)
    expect(slotAt({ x: HIT.cat.left + 10, y: 80 })).toBeNull()
    expect(slotAt({ x: TUB.x, y: 130 })).toBeNull()
    // Drawn from the back: the frame stamps the first and third before the second and fourth.
    const game = make({ tub: ['puffer', 'squid', 'jelly', 'octopus'] })
    run(game, 0.2)
    const bodies = buildFrame(game, null, items).filter((item) => item.k === 'sprite' && ['puffer', 'squid', 'jelly', 'octopus'].includes(item.id) && item.y < 120).map((item) => (item as { id: string }).id)
    expect(bodies).toEqual(['jelly', 'puffer', 'octopus', 'squid'])
    game.press({ x: (TUB_SLOTS[0].x + TUB_SLOTS[1].x) / 2, y: 70 })
    expect(game.tub).toEqual(['puffer', 'jelly', 'octopus'])
  })

  it('puts a landed catch in its own place, and closes the row up when one is tipped back', () => {
    const game = make({ tub: ['puffer', 'squid', 'jelly', 'octopus'] })
    run(game, 0.5)
    game.tub.forEach((id, index) => expect(game.creatures[id].off).toEqual(TUB_SLOTS[index]))
    game.press({ x: TUB_SLOTS[0].x, y: TUB_SLOTS[0].y })
    run(game, 3)
    expect(game.tub).toEqual(['squid', 'jelly', 'octopus'])
    game.tub.forEach((id, index) => { expect(game.creatures[id].off.x).toBeCloseTo(TUB_SLOTS[index].x, 0); expect(game.creatures[id].off.y).toBeCloseTo(TUB_SLOTS[index].y, 0) })
  })
})

describe('a body that is cornered', () => {
  it('never jumps: a body at home is shoved or slips away a little each frame, and whoever came at it waits', () => {
    const catches: [Bait, CreatureId][] = [['worm', 'angler'], ['worm', 'puffer'], ['boot', 'octopus'], ['boot', 'jelly']]
    for (const [bait, hooked] of catches) {
      for (const seed of [1, 2, 3]) {
        const game = beside(hooked, bait, {}, seed)
        bring(game, hooked, 2.6)
        expect(game.hooked).toBe(hooked)
        let far = 0, who = '', deep = 0
        const was = new Map<CreatureId, { x: number; y: number }>()
        const look = (): void => {
          for (const id of CREATURE_IDS) {
            const c = game.creatures[id]
            // Only those at home are watched: one that bolts, follows or is carried moves as fast as it is led.
            if (c.mode !== 'home' || c.cell !== null || id === hooked) { was.delete(id); continue }
            const at = game.pose(id), before = was.get(id)
            if (before) { const moved = Math.hypot(at.x - before.x, at.y - before.y); if (moved > far) { far = moved; who = `${id} at ${game.time.toFixed(2)}` } }
            was.set(id, { x: at.x, y: at.y })
          }
          deep = Math.max(deep, worst(game).deep)
        }
        // Straight up under the rod, where the turtle is pinned under the keel; then all over the sea.
        for (let i = 0; i < 90; i++) { game.drag({ x: 620, y: 215 }); run(game, FRAME, look) }
        wander(game, 12, seed, look)
        expect(far, `${hooked} seed ${seed}: ${who}`).toBeLessThanOrEqual(SHOVE + 12)
        expect(deep, `${hooked} seed ${seed}`).toBeLessThanOrEqual(GIVE)
      }
    }
  }, 120000)

  it('does not keep a catch from the boat: drawn straight up under the rod from anywhere, it is in the tub within a few seconds', () => {
    for (const [bait, hooked] of [['worm', 'angler'], ['worm', 'puffer'], ['boot', 'octopus'], ['boot', 'jelly'], ['worm', 'blobfish']] as const) {
      for (const seed of [1, 2, 3, 4]) {
        const game = beside(hooked, bait, {}, seed)
        bring(game, hooked, hooked === 'blobfish' ? 0 : 2.6)
        if (hooked === 'blobfish') {
          // The worm is lowered right into its open mouth.
          for (let i = 0; i < 400 && game.hooked === null; i++) { const pose = game.pose('blobfish'); game.drag({ x: pose.x + 70 * pose.face, y: pose.y + 2 }); run(game, FRAME) }
        }
        expect(game.hooked, `${hooked} seed ${seed}`).toBe(hooked)
        let landed = -1
        const from = game.time
        for (let i = 0; i < 8 * 60 && landed < 0; i++) { game.drag({ x: 620, y: 150 }); run(game, FRAME); if (game.tub.includes(hooked)) landed = game.time - from }
        expect(landed, `${hooked} seed ${seed}`).toBeGreaterThan(0)
        expect(landed, `${hooked} seed ${seed}`).toBeLessThan(6)
      }
    }
  }, 120000)
})

describe('what can be tapped', () => {
  const tappable: [string, Rect][] = [
    ...BAITS.map((bait): [string, Rect] => [bait, pegRect(bait)]),
    ['cat', HIT.cat], ['tub', HIT.tub], ['gull', HIT.gull],
    ...TUB_SLOTS.map((_, index): [string, Rect] => [`slot ${index}`, slotRect(index)]),
  ]

  it('no two tappable things overlap, but for two catches standing packed in the tub, where the one in front is taken', () => {
    for (let i = 0; i < tappable.length; i++) for (let j = i + 1; j < tappable.length; j++) {
      if (tappable[i][0].startsWith('slot') && tappable[j][0].startsWith('slot')) continue
      expect(into(tappable[i][1], tappable[j][1]), `${tappable[i][0]} and ${tappable[j][0]}`).toBe(0)
    }
  })

  it('nothing tappable lies under the home control or in the grown-up corner, at any size of surface', () => {
    for (const [width, height] of [[1180, 820], [1024, 768], [1366, 1024], [820, 1180], [768, 1024], [844, 390], [667, 375], [1920, 1080], [800, 556]] as const) {
      const by = fit(width, height)
      // The home control: 48 across, 10 from the top, in the middle of the surface. The corner: the top right of the surface.
      const a = toStage({ x: width / 2 - 24, y: 10 }, by), b = toStage({ x: width / 2 + 24, y: 58 }, by)
      const home: Rect = { left: a.x, top: a.y, right: b.x, bottom: b.y }
      const c = toStage({ x: width - CORNER, y: 0 }, by), d = toStage({ x: width, y: CORNER }, by)
      const corner: Rect = { left: c.x, top: c.y, right: d.x, bottom: d.y }
      for (const [name, rect] of tappable) {
        expect(into(rect, home), `${name} under the home control at ${width}x${height}`).toBe(0)
        expect(into(rect, corner), `${name} in the corner at ${width}x${height}`).toBe(0)
      }
    }
    expect(HOME_CONTROL.x).toBe(STAGE.width / 2)
    expect(FRAME).toBeGreaterThan(0)
  })
})
