import { describe, expect, it } from 'vitest'
import { CELLS } from './cells'
import { HEAP_ROOM, PAIR_AT, PAIR_ROOM, TIDY_ASLEEP, bedOf, heapPlace, pairPlace, sailBy } from './evening'
import { TIDY_SHAPE } from './art'
import { FOLK, PERSONALITY, TOWARD } from './folk'
import { FOUND, HOLLOW, KINDS, SUPPORTS, ceilingY, groundY, type Kind, type Support } from './kinds'
import { drawnBox, type Box } from './lie'
import { build, isRested, joined, laidOf, settle, type Laid, type Rested } from './rest'
import { makeRng } from './rng'
import { freshSave } from './save'
import { SUN_AT, TICK, Toy, sunX, type ShownThing } from './toy'

// Nothing passes through anything. The game is drawn flat, so this is its
// intersection gate: every thing is measured where its pencil lies (the box
// `lie.ts` gives, the same one it is drawn and touched by), in every cell and
// in a few hundred houses built by chance. A finding is fixed in the resting
// rule, or it is allowed below with its reason and a cap.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id

/** How far two things that do not rest on each other may lie over each other, by how the upper or freer one lies. */
const ALLOWED: { is: (a: ShownThing, b: ShownThing) => boolean; cap: number; why: string }[] = [
  { is: (a, b) => a.form === 'flag' || b.form === 'flag', cap: 30, why: 'a flag hangs free from the tip of its twig, down beside it, and lies over what stands close beside the twig by its own width' },
  { is: (a, b) => a.form === 'tipped' || b.form === 'tipped', cap: 34, why: 'the upright box round a tipped slab is as wide as the slab and as high as its high end: the corner over its low end and the corner under its high end are empty, and a bell or a flag that hangs beside the high end hangs in that empty corner' },
  { is: (a, b) => a.form === 'hung' || b.form === 'hung', cap: 16, why: 'a bell is wider than its twig, and hangs over a post that stands within its width' },
  { is: (a, b) => a.kind === 'leaf' || b.kind === 'leaf', cap: 18, why: 'the two tips of a leaf are thin points that reach 6 past the room the leaf takes, over the shoulder of what lies beside it' },
  { is: (a, b) => [a, b].some((t) => Math.abs(t.angle) > 0.05), cap: 28, why: 'a thing that leans is measured by the upright box round it, whose corners are empty: round a feather on its quill that box is 24 wider than the feather' },
]
/** Two things side by side share a grip of 6 and the soft edge of each pencil, up to 4 on each. */
const SIDE_BY_SIDE = 14
/** A thing rests on its support with no more air under it than its own pencil line. */
const AIR = 4
/**
 * How far a thing may sink into the thing it rests on, by the cell. A twig's tip is drawn 8 to 12 above the top it
 * carries at, so whatever lies on twigs has their tips inside it by that much: a cushion gives, moss drapes over what it lies on, a slide leans down beside its stone and a see-saw tips down beside its stone to the ground, a thing on the end of a see-saw lies on its slope and the upright box round it reaches lower at one corner, the sides of a parasol hang down round the tip it sits on, a table on one twig tips, and the box round a thing that leans reaches lower than the thing. */
const sinkCap = (r: Rested): number => (r.tilt !== undefined ? 30 : r.lies === 'ramp' || r.lies === 'tipped' ? 56 : r.kind === 'bark' && r.on === 'twig' && r.under.length === 1 ? 30 : r.lies === 'tent' && r.under.length === 1 ? 30 : r.lies === 'draped' || r.lies === 'slung' ? 34 : r.cell.sided && r.cell.tilt !== 0 ? 28 : r.on === 'moss' ? 26 : 22)

function overlap(a: Box, b: Box): number {
  const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return x > 0 && y > 0 ? Math.min(x, y) : 0
}

/** The things of a house as the toy shows them at rest, each with the box of its pencil. */
function drawn(house: readonly Rested[], snapped: number[] = []): Map<number, { thing: ShownThing; box: Box; rest: Rested }> {
  const toy = new Toy({ ...freshSave(7), things: laidOf(house), snapped }, 1)
  const shown = toy.show(null).things
  return new Map(toy.rested.map((rest) => {
    const thing = shown.find((t) => t.id === rest.id)!
    return [rest.id, { thing, box: drawnBox(thing), rest }]
  }))
}

/** How far past the end of the face it lies on a thing may reach: the tips of a leaf, the hang of a cloth. */
const PAST_THE_END = 8
/** How far from the slope of the face under it a thing may be turned, in radians. */
const OFF_THE_SLOPE = 0.03

/**
 * A thing on a leaning face, measured in that face's own frame. The face is the upper side of a tipped slab, or of
 * a thing that itself lies on a slope.
 */
function onLeaningFace(name: string, thing: ShownThing, rest: Rested, under: { thing: ShownThing; rest: Rested }): string[] {
  const out: string[] = [], slope = under.thing.angle
  // Each is drawn turned about the middle of its underside: that is the point its face is measured from. How thick
  // the thing under it is, and how long.
  const thick = under.rest.lies === 'tipped' ? CELLS.bark.ground.h : under.rest.h, middle = 0, long = under.rest.cell.w
  const dx = thing.x - under.thing.x, dy = thing.y - under.thing.y
  const along = dx * Math.cos(slope) + dy * Math.sin(slope), below = -dx * Math.sin(slope) + dy * Math.cos(slope) + thick
  // A cell that leans of itself (a drumstick across its stone, a cradle) leans by that much from the face it lies on.
  // A twig or a slab on one twig alone tips to the side it was set down on.
  const onOneTwig = rest.on === 'twig' && rest.lies === rest.cell.form ? (rest.kind === 'twig' && rest.lies === 'across' ? 0.2 : rest.kind === 'bark' ? 0.09 : 0) * rest.side : 0
  const own = onOneTwig !== 0 ? onOneTwig : ((rest.lies === rest.cell.form ? rest.cell.tilt : 0) * Math.PI) / 180 * (rest.cell.sided ? rest.side : 1)
  if (Math.abs(thing.angle - slope - own) > OFF_THE_SLOPE) out.push(`${name} is turned ${(thing.angle - slope - own).toFixed(2)} off the slope of what it lies on`)
  if (below < -AIR) out.push(`${name} lies ${(-below).toFixed(1)} above the leaning face under it`)
  if (below > rest.cell.sink + 3) out.push(`${name} lies ${below.toFixed(1)} into the leaning face under it`)
  const past = Math.max(along + rest.w / 2 - (middle + long / 2), middle - long / 2 - (along - rest.w / 2))
  // A narrow thing under a wide one (a stone rider under a cloth) is covered by it: the wide one is held to its own slab.
  if (past > PAST_THE_END && rest.w <= long) out.push(`${name} reaches ${past.toFixed(1)} past the end of what it lies on`)
  return out
}

/** Every finding in one house, as sentences. An empty list is a clean house. */
function findings(house: readonly Rested[], snapped: number[] = []): string[] {
  const all = drawn(house, snapped), out: string[] = []
  for (const { thing, box, rest } of all.values()) {
    const name = `${rest.cell.is} at ${rest.x}`
    if (!thing.housed) out.push(`${name} is not drawn behind the opening`)
    // Its middle is in the hollow and under the arch: what reaches past the opening is behind the trunk (view.ts clips it).
    const middle = box.x + box.w / 2
    if (middle < HOLLOW.left || middle > HOLLOW.right) out.push(`${name} has its middle outside the walls`)
    // (by the grace of 12 the resting rule gives a thing near a wall, where the arch comes down low)
    if (rest.y - rest.h < ceilingY(rest.x) - 12) out.push(`${name} stands higher than the arch`)
    // On its support: not in the air over it, not through it.
    const under = rest.under.map((id) => all.get(id)!.box)
    if (rest.lies === 'hung') {
      // A bell hangs over its twig: its top is above the twig's, and its rim hangs no more than its own thickness
      // under the twig's underside (under a rail there is air; on a twig that lies along a slab the rim touches
      // the slab). It is measured on the twig as it rests, since the box round a twig that leans has empty corners.
      const twig = all.get(rest.under[0])!.rest
      if (box.y >= twig.y - twig.h) out.push(`${name} hangs wholly under its twig`)
      if (box.y + box.h > twig.y + 6) out.push(`${name} hangs ${(box.y + box.h - twig.y).toFixed(1)} below its twig`)
    } else if (rest.lies === 'flag') {
      // A flag is tied by its quill to the tip and hangs down from there: its top is at the tip, and its end is
      // no lower than the ground under it.
      const tip = all.get(rest.under[0])!.rest
      if (box.y > tip.y - tip.h + 8) out.push(`${name} hangs ${(box.y - (tip.y - tip.h)).toFixed(1)} under the top it is tied to`)
      if (box.y + box.h < tip.y - tip.h + 20) out.push(`${name} does not hang`)
      // The ground under it is the ground under its free end: from a twig at the edge of the root step it hangs out over the floor.
      const end = Math.min(HOLLOW.right - 1, Math.max(HOLLOW.left + 1, rest.side === 1 ? box.x + box.w : box.x))
      if (box.y + box.h > groundY(end) + 4) out.push(`${name} hangs ${(box.y + box.h - groundY(end)).toFixed(1)} into the ground`)
      // And it never hangs into the side of the root step from a twig on the floor beside it.
      if (tip.x >= HOLLOW.stepRight && box.x < HOLLOW.stepRight - 1 && box.y + box.h > HOLLOW.stepY + 4) out.push(`${name} hangs into the side of the root step`)
    } else if (rest.under.length === 1 && (all.get(rest.under[0])!.rest.lies === 'tipped' || all.get(rest.under[0])!.rest.tilt !== undefined)) {
      // What lies on a tipped see-saw, or on a thing that lies on one, is measured against the leaning face as it is
      // drawn, not against the upright box round it: it lies along that face, on it, and within its length.
      out.push(...onLeaningFace(name, thing, rest, all.get(rest.under[0])!))
    } else {
      // What lies on a see-saw lies on its upper face over the stone: the box round a tipped slab reaches higher, at its high end.
      // On one of its ends it lies on the slope, lower or higher by its place along the slab.
      const faces = rest.under.map((id) => all.get(id)!).map((entry) => (entry.rest.lies === 'tipped' ? entry.rest.y - entry.rest.h + (rest.along ?? 0) * Math.sin(rest.tilt ?? 0) : entry.box.y))
      const top = under.length > 0 ? Math.min(...faces) : groundY(rest.x)
      const bottom = under.length > 0 ? Math.max(...under.map((b) => b.y + b.h)) : groundY(rest.x) + 10
      const air = top - (box.y + box.h)
      if (air > AIR) out.push(`${name} hangs ${air.toFixed(1)} in the air`)
      if (under.length > 0 && -air > sinkCap(rest)) out.push(`${name} is sunk ${(-air).toFixed(1)} into what it rests on`)
      if (box.y >= top) out.push(`${name} is wholly inside what it rests on`)
      // A slide's low end is on the ground beside its stone.
      if (box.y + box.h > bottom + (rest.lies === 'ramp' || rest.lies === 'tipped' ? 8 : 0.5)) out.push(`${name} reaches ${(box.y + box.h - bottom).toFixed(1)} below what it rests on`)
    }
    // And its middle is over what carries it.
    if (under.length === 1 && rest.lies !== 'ramp' && rest.cell.shift === 0 && Math.abs(rest.x - all.get(rest.under[0])!.rest.x) > Math.max(rest.w, all.get(rest.under[0])!.rest.w) / 2) out.push(`${name} is not over its support`)
    for (const other of all.values()) {
      if (other.rest.id <= rest.id || rest.under.includes(other.rest.id) || other.rest.under.includes(rest.id)) continue
      // Two things on the face of one tipped slab stand square to it, side by side along it: they are measured
      // along the slab as it is drawn, since the upright box round a tall thing that leans is far wider than the thing.
      const shared = rest.under.length === 1 && other.rest.under.length === 1 && rest.under[0] === other.rest.under[0] ? all.get(rest.under[0])! : null
      if (shared && shared.rest.lies === 'tipped') {
        const slope = shared.thing.angle
        const alongIt = (t: ShownThing): number => (t.x - shared.thing.x) * Math.cos(slope) + (t.y - shared.thing.y) * Math.sin(slope)
        const a = alongIt(thing), b = alongIt(other.thing)
        const share = Math.min(a + rest.w / 2, b + other.rest.w / 2) - Math.max(a - rest.w / 2, b - other.rest.w / 2)
        if (share > SIDE_BY_SIDE) out.push(`${name} and ${other.rest.cell.is} at ${other.rest.x} share ${share.toFixed(1)} of the length of the see-saw they lie on`)
        continue
      }
      const depth = overlap(box, other.box)
      // Where more than one reason holds for a pair, the widest of their caps does.
      const cap = Math.max(SIDE_BY_SIDE, ...ALLOWED.filter((entry) => entry.is(thing, other.thing)).map((entry) => entry.cap))
      if (depth > cap) out.push(`${name} and ${other.rest.cell.is} at ${other.rest.x} lie ${depth.toFixed(1)} into each other`)
    }
  }
  return out
}

/** A house with one thing of `kind` on `on`, in the middle of the floor or wherever `x` says. */
function cellHouse(kind: Kind, on: Support, x = 640): { house: Rested[]; id: number } {
  const used: Partial<Record<Kind, number>> = {}
  const take = (k: Kind): number => idOf(k, (used[k] = (used[k] ?? -1) + 1))
  const laid: Laid[] = on === 'ground' ? [] : [{ id: take(on), x }]
  const id = take(kind)
  laid.push({ id, x })
  return { house: build(laid), id }
}

describe('nothing passes through anything', () => {
  it('holds in every cell of the grid, alone on its support', () => {
    for (const kind of KINDS) for (const on of SUPPORTS) {
      const { house, id } = cellHouse(kind, on)
      const rest = house.find((r) => r.id === id)
      expect(rest?.cell, `${kind} on ${on}`).toBe(CELLS[kind][on])
      expect(findings(house), `${kind} on ${on}`).toEqual([])
    }
  })

  it('holds in every cell at both walls and on the root step', () => {
    for (const x of [HOLLOW.left + 4, 422, HOLLOW.stepRight - 6, HOLLOW.stepRight + 6, HOLLOW.right - 4]) {
      for (const kind of KINDS) for (const on of SUPPORTS) expect(findings(cellHouse(kind, on, x).house), `${kind} on ${on} at ${x}`).toEqual([])
    }
  })

  it('lays a wide thing on a narrow one with its middle over it, and across two tops with a top under each half', () => {
    for (const kind of ['leaf', 'bark', 'moss', 'twig'] as const) {
      const one = build([{ id: idOf('twig', 0), x: 640 }, { id: idOf(kind, kind === 'twig' ? 1 : 0), x: 643 }])
      const lain = one[1]
      expect(lain.on).toBe('twig')
      expect(lain.x).toBe(640)
      expect(findings(one)).toEqual([])
      // Two tops sixty apart: a thing let go over one of them, within reach of the other, lies across both.
      const two = build([{ id: idOf('twig', 0), x: 600 }, { id: idOf('twig', 1), x: 660 }, { id: idOf(kind, kind === 'twig' ? 2 : 0), x: 604 }])
      expect(two[2].under).toHaveLength(2)
      expect(two[2].x).toBe(630)
      expect(findings(two)).toEqual([])
    }
    // A crosspiece on one twig tips to the side it was set down on, and is still on its twig.
    const tipped = drawn(build([{ id: idOf('twig', 0), x: 640 }, { id: idOf('twig', 1), x: 643 }]))
    expect(Math.abs(tipped.get(idOf('twig', 1))!.thing.angle)).toBeGreaterThan(0.1)
    // So does a table on one twig: it is tippy. Under a thing set on it, it lies level, as it is found when the game is opened.
    const table: Laid[] = [{ id: idOf('twig', 0), x: 640 }, { id: idOf('bark', 0), x: 650 }]
    expect(Math.abs(drawn(build(table)).get(idOf('bark', 0))!.thing.angle)).toBeGreaterThan(0.05)
    const laden = [...table, { id: idOf('cap', 0), x: 640 }]
    expect(drawn(build(laden)).get(idOf('bark', 0))!.thing.angle).toBe(0)
    expect(findings(build(laden))).toEqual([])
    // Set down by a finger, the table levels under it within half a second, and tips again when it is taken off.
    const toy = new Toy({ ...freshSave(7), things: table }, 1)
    const cap = FOUND[idOf('cap', 0)]
    const angle = (): number => toy.show(null).things.find((thing) => thing.id === idOf('bark', 0))!.angle
    toy.press(cap.home.x, cap.home.y - 12)
    toy.dragStart()
    toy.dragMove(640, 440)
    toy.drop()
    for (let i = 0; i < 2 / TICK; i++) toy.step(TICK)
    expect(toy.rested.map((rest) => rest.cell.is)).toEqual(['post', 'table', 'bowl'])
    expect(angle()).toBe(0)
    const bowl = toy.show(null).things.find((thing) => thing.id === idOf('cap', 0))!
    toy.press(bowl.x, bowl.y - 16)
    toy.dragStart()
    toy.dragMove(900, 700)
    toy.drop()
    for (let i = 0; i < 2 / TICK; i++) toy.step(TICK)
    expect(Math.abs(angle())).toBeGreaterThan(0.05)
  })

  it('ends a slide on the ground beside its stone, or lays the leaf flat on the stone: never with its low end in the air', () => {
    let ramps = 0, flats = 0
    for (let x = HOLLOW.left; x <= HOLLOW.right; x += 6) for (const lean of [-20, 20]) {
      const house = build([{ id: idOf('pebble', 0), x }, { id: idOf('leaf', 0), x: x + lean }])
      const leaf = house.find((r) => r.kind === 'leaf')!
      if (leaf.on !== 'pebble') continue
      const { thing, box } = drawn(house).get(leaf.id)!
      if (leaf.lies === 'ramp') {
        ramps += 1
        // Its low end is on the ground the stone stands on, inside the walls and on the stone's own piece of ground.
        const low = leaf.x + leaf.side * leaf.w / 2
        expect(groundY(low), `slide at ${x}`).toBe(groundY(house[0].x))
        // The box round a leaning leaf has an empty corner that dips under the ground line by the leaf's own thickness.
        expect(Math.abs(box.y + box.h - groundY(low)), `slide at ${x}`).toBeLessThanOrEqual(12)
        expect(low).toBeGreaterThanOrEqual(HOLLOW.left)
        expect(low).toBeLessThanOrEqual(HOLLOW.right)
        expect(Math.abs(thing.angle)).toBeGreaterThan(0.2)
      } else {
        flats += 1
        expect(leaf.lies).toBe('flat')
        expect(thing.angle).toBe(0)
      }
      expect(findings(house), `slide at ${x}`).toEqual([])
    }
    expect(ramps).toBeGreaterThan(40)
    // A stone that stands on something has no ground beside it: the leaf lies flat on it.
    const high = build([{ id: idOf('bark', 0), x: 640 }, { id: idOf('pebble', 0), x: 640 }, { id: idOf('leaf', 0), x: 650 }])
    expect(high[2].lies).toBe('flat')
    expect(findings(high)).toEqual([])
    flats += 1
    expect(flats).toBeGreaterThan(0)
  })

  it('flies a flag away from the root step on a twig that stands on the floor close beside it, whole or snapped', () => {
    let flags = 0
    for (let x = HOLLOW.stepRight + 8; x <= HOLLOW.stepRight + 120; x += 4) {
      for (const from of [x - 6, x + 6]) {
        const laid = [{ id: idOf('twig', 0), x }, { id: idOf('feather', 0), x: from }]
        for (const snapped of [[], [idOf('twig', 0)]]) {
          const house = build(laid, new Set(snapped))
          if (house[1]?.lies !== 'flag') continue
          flags += 1
          expect(findings(house, snapped), `a flag let go at ${from} on a twig at ${x}`).toEqual([])
        }
      }
    }
    expect(flags).toBeGreaterThan(80)
  })

  it('holds in four hundred houses built by chance, whole and after the fat one has snapped their twigs', () => {
    let things = 0
    const found: string[] = []
    for (let seed = 1; seed <= 400; seed++) {
      const rng = makeRng(seed)
      const order = FOUND.map((found) => ({ id: found.id, key: rng.next() })).sort((a, b) => a.key - b.key)
      let house: Rested[] = []
      for (const { id } of order.slice(0, 6 + Math.floor(rng.next() * 12))) {
        const result = settle(house, id, FOUND[id].kind, HOLLOW.left + rng.next() * (HOLLOW.right - HOLLOW.left))
        if (isRested(result)) house = [...house, result]
      }
      house = build(laidOf(house))
      things += house.length
      found.push(...findings(house).map((finding) => `house ${seed}: ${finding}`))
      // The same house with every twig snapped: half as long, and whatever lay on them come down.
      const snapped = house.filter((r) => r.kind === 'twig').map((r) => r.id)
      const after = build(laidOf(house), new Set(snapped))
      found.push(...findings(after, snapped).map((finding) => `house ${seed} snapped: ${finding}`))
    }
    expect(found).toEqual([])
    expect(things).toBeGreaterThan(2500)
  })

  it('lays every kind of thing on the leaning face of a see-saw as the slab is drawn: on its low end, over the stone, on its high end, and one thing on another there', () => {
    let measured = 0, stacked = 0
    for (const stoneX of [640, 560, 760]) for (const to of [-14, 14]) {
      const seesaw: Laid[] = [{ id: idOf('pebble'), x: stoneX }, { id: idOf('bark'), x: stoneX + to }]
      expect(build(seesaw)[1].lies).toBe('tipped')
      for (const kind of KINDS) for (const at of [-50, -30, -6, 0, 6, 30, 50]) {
        const first = idOf(kind, 1)
        const house = build([...seesaw, { id: first, x: stoneX + at }])
        expect(findings(house), `a ${kind} let go ${at} from the stone at ${stoneX}`).toEqual([])
        const lain = house.find((r) => r.id === first)
        if (!lain || lain.under[0] !== idOf('bark')) continue
        measured += 1
        // It lies on the slope the slab has now, whichever end is down.
        expect(lain.tilt, `a ${kind} let go ${at} from the stone`).toBeCloseTo(house[1].side * house[1].lean!, 9)
        // And a thing set on it lies on it as it leans.
        for (const upper of ['cap', 'pebble', 'twig', 'moss'] as const) for (const off of [-20, 0, 20]) {
          const second = FOUND.find((found) => found.kind === upper && found.id !== first && !seesaw.some((laid) => laid.id === found.id))?.id
          if (second === undefined) continue
          const higher = build([...seesaw, { id: first, x: stoneX + at }, { id: second, x: lain.x + off }])
          expect(findings(higher), `a ${upper} let go ${off} from the middle of a ${kind} that lies ${at} from the stone at ${stoneX}`).toEqual([])
          if (higher.find((r) => r.id === second)?.under[0] === first) stacked += 1
        }
      }
    }
    expect(measured).toBeGreaterThan(200)
    expect(stacked).toBeGreaterThan(300)
  }, 60000)

  it('holds in a hundred and fifty houses whose things were let go at any height: under a roof, beside a post, in a pile', () => {
    let under = 0
    const found: string[] = []
    for (let seed = 1; seed <= 150; seed++) {
      const rng = makeRng(seed * 7)
      const order = FOUND.map((found) => ({ id: found.id, key: rng.next() })).sort((a, b) => a.key - b.key)
      let house: Rested[] = []
      for (const { id } of order.slice(0, 6 + Math.floor(rng.next() * 12))) {
        const x = HOLLOW.left + rng.next() * (HOLLOW.right - HOLLOW.left)
        // Half of them are let go low: at the ground or up to a post's height above it.
        const result = settle(house, id, FOUND[id].kind, x, undefined, rng.next() < 0.5 ? undefined : groundY(x) - rng.next() * 120)
        if (!isRested(result)) continue
        if (result.said) under += 1
        house = joined(house, result)
      }
      // The list a save keeps says the house as it was built.
      const again = build(laidOf(house))
      expect(again.map((r) => [r.id, r.x, r.y, r.lies, r.under.join()]), `house ${seed}`).toEqual(house.map((r) => [r.id, r.x, r.y, r.lies, r.under.join()]))
      found.push(...findings(house).map((finding) => `house ${seed}: ${finding}`))
      const snapped = house.filter((r) => r.kind === 'twig').map((r) => r.id)
      found.push(...findings(build(laidOf(house), new Set(snapped)), snapped).map((finding) => `house ${seed} snapped: ${finding}`))
    }
    expect(found).toEqual([])
    expect(under).toBeGreaterThan(15)
  }, 60000)

  it('sails a slab only as far as its way is free: it takes what stands on it along and stops at the first thing in its way', () => {
    const things: Laid[] = [{ id: idOf('cap'), x: 440 }, { id: idOf('bark'), x: 590 }, { id: idOf('feather'), x: 610 }, { id: idOf('pebble'), x: 590 }, { id: idOf('pebble', 1), x: 760 }]
    const house = build(things)
    const slab = house.find((rest) => rest.id === idOf('bark'))!, stool = house.find((rest) => rest.id === idOf('pebble', 1))!
    expect(stool.on).toBe('ground')
    const by = sailBy(house, slab)
    // The stool stands between the slab and the right wall: the slab stops against it.
    expect(slab.x + slab.w / 2 + by).toBeLessThanOrEqual(stool.x - stool.w / 2)
    expect(by).toBeGreaterThan(24)
    const toy = new Toy({ ...freshSave(7), things: laidOf(build(things)) }, 3)
    toy.press(SUN_AT.x, SUN_AT.y)
    toy.dragStart()
    toy.dragMove(SUN_AT.x, SUN_AT.under)
    toy.drop()
    let sailed = 0, deepest = 0
    const offsets = new Set<string>()
    while (toy.playing) {
      toy.step(TICK)
      const show = toy.show(null), all = [...show.things, ...show.front]
      const at = (id: number) => all.find((thing) => thing.id === id)!
      const a = drawnBox(at(idOf('bark'))), b = drawnBox(at(idOf('pebble', 1)))
      const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
      deepest = Math.max(deepest, x > 0 && y > 0 ? Math.min(x, y) : 0)
      if (Math.abs(at(idOf('bark')).x - 590) > 1) {
        sailed += 1
        // What stands on the slab goes with it: the stone and the sail keep their places on it.
        offsets.add(`${(at(idOf('pebble')).x - at(idOf('bark')).x).toFixed(1)} ${(at(idOf('feather')).x - at(idOf('bark')).x).toFixed(1)}`)
      }
    }
    expect(sailed).toBeGreaterThan(30)
    expect(offsets.size).toBe(1)
    // Side by side, they share no more than a grip and the soft edge of each pencil.
    expect(deepest).toBeLessThanOrEqual(14)
    expect(toy.rested.find((rest) => rest.id === idOf('bark'))!.x).toBeCloseTo(590 + by, 0)
  })


  it('does not lift a tapped twig that shares a roof with another: the twig stays under the roof, and carried off it leaves the roof on the other', () => {
    const left = idOf('twig'), right = idOf('twig', 1), roof = idOf('leaf')
    const things: Laid[] = [{ id: left, x: 600 }, { id: right, x: 660 }, { id: roof, x: 630 }]
    expect([...build(things).find((rest) => rest.id === roof)!.under].sort()).toEqual([left, right].sort())
    const toy = new Toy({ ...freshSave(7), things: laidOf(build(things)) }, 3)
    for (let i = 0; i < 240; i++) toy.step(TICK)
    const at = (id: number): ShownThing => { const show = toy.show(null); return { ...[...show.things, ...show.front].find((thing) => thing.id === id)! } }
    const lay = at(left), deep = overlap(drawnBox(lay), drawnBox(at(roof)))
    toy.press(lay.x, lay.y - 30)
    // It answers the finger at once, with its sound and a stretch, and it does not go up through the roof.
    expect(toy.sounds.map((sound) => sound.from)).toContain(`lift ${left}`)
    let stretched = 0
    for (let i = 0; i < 90; i++) {
      toy.step(TICK)
      const now = at(left)
      expect(now.y).toBe(lay.y)
      expect(overlap(drawnBox({ ...now, sx: 1, sy: 1 }), drawnBox(at(roof)))).toBeLessThanOrEqual(deep + 0.01)
      stretched = Math.max(stretched, Math.abs(now.sy - 1))
    }
    expect(stretched).toBeGreaterThan(0.02)
    toy.release()
    for (let i = 0; i < 240; i++) toy.step(TICK)
    expect([...toy.rested.find((rest) => rest.id === roof)!.under].sort()).toEqual([left, right].sort())
    // A twig that carries its load alone does go up, and its load with it.
    const alone = new Toy({ ...freshSave(7), things: [{ id: left, x: 600 }, { id: idOf('cap'), x: 600 }] }, 3)
    for (let i = 0; i < 240; i++) alone.step(TICK)
    const bell = (): ShownThing => { const show = alone.show(null); return [...show.things, ...show.front].find((thing) => thing.id === idOf('cap'))! }
    const hung = bell().y
    alone.press(600, groundY(600) - 30)
    for (let i = 0; i < 60; i++) alone.step(TICK)
    expect(hung - bell().y).toBeGreaterThan(8)
    alone.release()
    // Carried off, the twig leaves the roof behind: it comes to rest on the twig that is left, in sight.
    toy.press(lay.x, lay.y - 30)
    toy.dragStart()
    toy.dragMove(820, 500)
    let moved = 0
    for (let i = 0; i < 360; i++) {
      const before = at(roof)
      toy.step(TICK)
      const now = at(roof)
      // It never jumps: no more than a few pixels in any step.
      expect(Math.hypot(now.x - before.x, now.y - before.y)).toBeLessThan(8)
      moved += Math.hypot(now.x - before.x, now.y - before.y)
    }
    toy.drop()
    expect(toy.rested.find((rest) => rest.id === roof)!.under).toEqual([right])
    expect(moved).toBeGreaterThan(4)
  })

  it('shows the whole disc of the sun at every height of its track: the tidy one, at its place, covers none of it', () => {
    const DISC = 38, ROOM = 5
    const { feet } = PERSONALITY.tidy
    const at = (points: readonly number[]): [number, number][] => points.flatMap((_, i) => (i % 2 === 0 ? [[feet.x + points[i], feet.y + points[i + 1]] as [number, number]] : []))
    /** How far a point is from the nearest side of a shape. */
    const fromSides = (shape: [number, number][], x: number, y: number): number => Math.min(...shape.map(([ax, ay], i) => {
      const [bx, by] = shape[(i + 1) % shape.length]
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)))
      return Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay))
    }))
    const head = { x: feet.x + TIDY_SHAPE.head.x, y: feet.y + TIDY_SHAPE.head.y, r: TIDY_SHAPE.head.r }
    let nearest = Infinity
    for (let y = SUN_AT.y; y <= SUN_AT.setY; y += 1) {
      const x = sunX(y)
      const clear = Math.min(fromSides(at(TIDY_SHAPE.hat), x, y), fromSides(at(TIDY_SHAPE.coat), x, y), Math.hypot(x - head.x, y - head.y) - head.r) - DISC
      nearest = Math.min(nearest, clear)
    }
    expect(nearest).toBeGreaterThanOrEqual(ROOM)
    // The tidy one stands as close beside the track as that room lets it: the two are neighbours, not strangers.
    expect(nearest).toBeLessThan(40)
    // And the toy shows the tidy one at that place, upright, when nothing is going on.
    const toy = new Toy(freshSave(7), 1)
    expect(toy.show(null).stand.tidy).toMatchObject({ x: feet.x, y: feet.y, scale: 1 })
  })

  it.each([[1, 150], [151, 300]])('sits the tidy one down asleep clear of every bed and every thing beside it, wherever a stretch of floor holds it; it nods toward the tiny one, never out over a neighbour (houses %i to %i)', (from, to) => {
    /** The box round the tidy one as it is drawn: its coat and its hat, at its size, turned and leaning as it is. */
    const boxOf = (toy: Toy): Box => {
      const show = toy.show(null), stand = show.stand.tidy
      const by = stand.turn + (TOWARD.tidy * show.folk.tidy.lean * Math.PI) / 180
      const points = [...TIDY_SHAPE.coat, ...TIDY_SHAPE.hat]
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
      for (let i = 0; i < points.length; i += 2) {
        const px = points[i] * stand.scale, py = points[i + 1] * stand.scale
        const x = stand.x + px * Math.cos(by) - py * Math.sin(by), y = stand.y + px * Math.sin(by) + py * Math.cos(by)
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
      }
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
    }
    const evening = (toy: Toy): void => {
      toy.press(SUN_AT.x, SUN_AT.y)
      toy.dragStart()
      toy.dragMove(SUN_AT.x, SUN_AT.under)
      toy.drop()
      for (let i = 0; toy.playing && i < 60 / TICK; i++) toy.step(TICK)
      for (let i = 0; i < 240; i++) toy.step(TICK)
    }
    /** How far the tidy one lies into the thing it lies deepest into. */
    const deepest = (toy: Toy): number => {
      const show = toy.show(null), box = boxOf(toy)
      return Math.max(0, ...[...show.things, ...show.front].filter((thing) => thing.housed).map((thing) => overlap(box, drawnBox(thing))))
    }
    // The house a first visit starts with: the fat one has its bed, and the tidy one stands between the bed and the stone.
    const first = new Toy(freshSave(4), 1)
    expect(first.rested.length).toBeGreaterThan(1)
    evening(first)
    expect(first.toSave().asleep.map((entry) => entry.on === null)).toEqual([false, true, true])
    expect(pairPlace(first.rested).clear).toBe(true)
    expect(deepest(first)).toBeLessThanOrEqual(SIDE_BY_SIDE)

    let clear = 0, nodding = 0, crowded = 0
    for (let seed = from; seed <= to; seed++) {
      const rng = makeRng(seed * 31)
      const order = FOUND.map((found) => ({ id: found.id, key: rng.next() })).sort((a, b) => a.key - b.key)
      let house: Rested[] = []
      for (const { id } of order.slice(0, 4 + Math.floor(rng.next() * 12))) {
        const result = settle(house, id, FOUND[id].kind, HOLLOW.left + rng.next() * (HOLLOW.right - HOLLOW.left))
        if (isRested(result)) house = [...house, result]
      }
      // Only an evening in which the fat one may find a bed is played out: one with a leaf in the house.
      if (!house.some((r) => r.kind === 'leaf')) continue
      const toy = new Toy({ ...freshSave(7), things: laidOf(house) }, seed)
      evening(toy)
      const asleep = toy.toSave().asleep, tidy = asleep.find((entry) => entry.who === 'tidy')!
      if (asleep[0].on === null || tidy.on !== null) continue
      const place = pairPlace(toy.rested), show = toy.show(null), box = boxOf(toy)
      // It nods toward the tiny one, to its left, and its hat goes no further to the right than its coat stands.
      expect(show.folk.tidy.lean, `house ${seed}`).toBeCloseTo(TIDY_ASLEEP.lean * place.nod, 5)
      expect(box.x + box.w, `house ${seed}`).toBeLessThanOrEqual(show.stand.tidy.x + TIDY_ASLEEP.half + 0.5)
      if (place.clear) {
        clear += 1
        nodding += place.nod
        expect(deepest(toy), `house ${seed}: the tidy one at ${show.stand.tidy.x}`).toBeLessThanOrEqual(SIDE_BY_SIDE)
        continue
      }
      // With no such stretch it sits in front of what stands there: there is truly no place on the floor it could stand whole.
      crowded += 1
      for (let x = PAIR_ROOM.from + PAIR_AT.tidy; x <= PAIR_ROOM.to + PAIR_AT.tidy; x += 1) {
        const free = toy.rested.every((r) => r.x + r.w / 2 <= x - TIDY_ASLEEP.half || r.x - r.w / 2 >= x + TIDY_ASLEEP.half)
        expect(free, `house ${seed}: free floor for it at ${x}`).toBe(false)
      }
    }
    expect(clear).toBeGreaterThan(6)
    expect(nodding).toBeGreaterThan(2)
    expect(crowded).toBeGreaterThan(2)
  }, 60000)

  it('lays every sleeper on the thing it ended on or on the floor, inside the hollow', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = makeRng(seed * 31)
      const order = FOUND.map((found) => ({ id: found.id, key: rng.next() })).sort((a, b) => a.key - b.key)
      let house: Rested[] = []
      for (const { id } of order.slice(0, 4 + Math.floor(rng.next() * 12))) {
        const result = settle(house, id, FOUND[id].kind, HOLLOW.left + rng.next() * (HOLLOW.right - HOLLOW.left))
        if (isRested(result)) house = [...house, result]
      }
      const toy = new Toy({ ...freshSave(7), things: laidOf(house) }, seed)
      toy.press(SUN_AT.x, SUN_AT.y)
      toy.dragStart()
      toy.dragMove(SUN_AT.x, SUN_AT.under)
      toy.drop()
      for (let i = 0; toy.playing && i < 60 / TICK; i++) toy.step(TICK)
      for (let i = 0; i < 240; i++) toy.step(TICK)
      const save = toy.toSave(), show = toy.show(null)
      expect(save.asleep.map((entry) => entry.who)).toEqual([...FOLK])
      for (const entry of save.asleep) {
        const bed = bedOf(toy.rested, entry), stand = show.stand[entry.who]
        expect(show.inside[entry.who], `house ${seed} ${entry.who}`).toBe(true)
        expect(stand.x, `house ${seed} ${entry.who}`).toBeGreaterThanOrEqual(entry.on === null ? HOLLOW.stepRight : HOLLOW.left)
        expect(stand.x, `house ${seed} ${entry.who}`).toBeLessThanOrEqual(HOLLOW.right)
        // Its feet are no lower than the ground under them. One in the heap lies on the floor, clear of the root step,
        // in front of whatever stands there: the three are drawn in front of the house, and never through the step or a wall.
        expect(stand.y, `house ${seed} ${entry.who}`).toBeLessThanOrEqual(groundY(stand.x) + 0.5)
        const fatLies = save.asleep[0].on === null
        if (entry.on === null) expect(entry.x, `house ${seed}`).toBe(heapPlace(toy.rested, fatLies))
        if (entry.on !== null) {
          expect(Math.abs(stand.x - bed.x), `house ${seed} ${entry.who}`).toBeLessThanOrEqual(1)
          expect(Math.abs(stand.y - bed.y), `house ${seed} ${entry.who}`).toBeLessThanOrEqual(14)
        } else {
          expect(entry.x).toBeGreaterThanOrEqual((fatLies ? HEAP_ROOM : PAIR_ROOM).from)
          expect(entry.x).toBeLessThanOrEqual((fatLies ? HEAP_ROOM : PAIR_ROOM).to)
        }
      }
    }
  })
})
