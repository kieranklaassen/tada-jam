import { describe, expect, it } from 'vitest'
import { FOUND, HOLLOW, KINDS, groundY, type Kind } from './kinds'
import { touchBox } from './lie'
import { build, isRested, joined, laidOf, sameRest, settle, topOf, type Laid, type Rested } from './rest'
import { makeRng } from './rng'
import { deserialize, freshSave, serialize } from './save'
import { TICK, Toy } from './toy'

// A thing let go under a roof, a table, a perch or a thatch goes under it
// when it fits there by its height, and lies on the ground with its shadow
// under it. Where it does not fit it goes to the nearest free place at its
// own height. It is never set on top through what it was let go under, and
// never sent home by a thing it was not put on.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const run = (toy: Toy, seconds: number): void => { for (let i = 0; i < Math.round(seconds / TICK); i++) toy.step(TICK) }

/** Two posts on the floor with something across them: the leaf is a roof, the slab a table, the twig a perch, the moss a thatch. */
const COVERS: readonly (readonly [string, Kind])[] = [['roof', 'leaf'], ['table', 'bark'], ['perch', 'twig'], ['thatch', 'moss']]
const POSTS = [610, 690] as const
function covered(kind: Kind): { house: Rested[]; cover: Rested } {
  // A rail reaches two posts that stand closer, and is let go over one of them, toward the other: between them it would stand as a third.
  const posts = kind === 'twig' ? [620, 680] : POSTS
  for (let x = 650; x >= posts[0]; x -= 2) {
    const house = build([{ id: idOf('twig', 0), x: posts[0] }, { id: idOf('twig', 1), x: posts[1] }, { id: idOf(kind, kind === 'twig' ? 2 : 0), x }])
    if (house.length === 3 && house[2].under.length === 2) return { house, cover: house[2] }
  }
  throw new Error(`no ${kind} lies across the two posts`)
}
/** Everything a thing lies on, down to the ground. */
function allUnder(house: readonly Rested[], rest: Rested): Set<number> {
  const all = new Set<number>()
  const add = (ids: readonly number[]): void => { for (const id of ids) if (!all.has(id)) { all.add(id); add(house.find((r) => r.id === id)?.under ?? []) } }
  add(rest.under)
  return all
}
/** The list a save keeps, set down again, is the same house. */
function saidByItsList(house: readonly Rested[]): boolean {
  const again = build(laidOf(house))
  return again.length === house.length && again.every((rest, index) => rest.id === house[index].id && sameRest(rest, house[index]) && rest.under.join() === house[index].under.join())
}

describe('a thing let go under a roof, a table, a perch or a thatch', () => {
  it.each(COVERS)('goes under the %s when it fits there by its height, and lies on the ground', (name, kind) => {
    const { house, cover } = covered(kind)
    expect(cover.under, name).toEqual([idOf('twig', 0), idOf('twig', 1)])
    // Between the closer posts of a perch a pebble has no room; an acorn cap has.
    for (const small of kind === 'twig' ? ['cap'] as const : ['cap', 'pebble'] as const) {
      const id = idOf(small, 1)
      for (const up of [0, 20, 40]) {
        const lain = settle(house, id, small, 650, undefined, HOLLOW.floorY - up)
        if (!isRested(lain)) throw new Error(`the ${small} let go ${up} above the floor under the ${name} was shed by ${lain.shedBy}`)
        expect(lain, `${small} under the ${name}, ${up} up`).toMatchObject({ on: 'ground', under: [], x: 650 })
        // Its top is under the thing over it.
        expect(topOf(lain)).toBeGreaterThanOrEqual(cover.y - 1)
        expect(lain.aside).toBeUndefined()
        // In the list it comes before what is over it, and the list set down again is this house.
        const after = joined(house, lain)
        expect(after.map((r) => r.id)).toEqual([house[0].id, house[1].id, id, cover.id])
        expect(saidByItsList(after), `${small} under the ${name}`).toBe(true)
        expect(sameRest(after[3], cover) && after[3].under.join() === cover.under.join()).toBe(true)
      }
      // Let go above it, it comes down on it as before, and is what the grid says or is shed there.
      const above = settle(house, id, small, 650, undefined, topOf(cover) - 30), plain = settle(house, id, small, 650)
      expect(above).toEqual(plain)
      expect(isRested(above) ? above.under.includes(cover.id) : above.shedBy === cover.kind || above.shedBy === 'arch', `${small} over the ${name}`).toBe(true)
    }
  })

  it.each(COVERS)('goes to the nearest free place at its own height where it does not fit under the %s, and never onto it', (name, kind) => {
    const { house, cover } = covered(kind)
    // A post is too tall to stand under it, and a leaf, a feather and a slab too wide to lie between its posts.
    let slid = 0
    for (const [big, nth] of [['twig', 3], ['leaf', 1], ['feather', 0], ['bark', 1]] as const) {
      const id = idOf(big, nth), level = HOLLOW.floorY - 10
      const lain = settle(house, id, big, 650, undefined, level)
      if (!isRested(lain)) {
        // No free place it can slide to without crossing a post: it goes home from the ground where it was let go, not from the top of the thing over it.
        expect(lain, `${big} under the ${name}`).toMatchObject({ shedBy: 'out', x: 650 })
        expect(lain.y, `${big} under the ${name}`).toBeGreaterThanOrEqual(level)
        continue
      }
      slid += 1
      expect(allUnder(house, lain).has(cover.id), `${big} under the ${name}`).toBe(false)
      expect(lain.on, `${big} under the ${name}`).toBe('ground')
      // It slid there along the ground from where it was let go.
      expect(lain.aside, `${big} under the ${name}`).toEqual({ x: 650, y: expect.any(Number) })
      expect(lain.aside!.y).toBeGreaterThanOrEqual(level)
      expect(saidByItsList(joined(house, lain)), `${big} under the ${name}`).toBe(true)
    }
    expect(slid, name).toBeGreaterThan(0)
  })

  it('does not stand as one more post under a thing it would only just touch', () => {
    let seen = 0
    for (const [, kind] of COVERS) for (const posts of [[610, 690], [600, 700]] as const) {
      const laid: Laid[] = [{ id: idOf('twig', 0), x: posts[0] }, { id: idOf('twig', 1), x: posts[1] }, { id: idOf(kind, kind === 'twig' ? 2 : 0), x: kind === 'twig' ? posts[0] + 4 : 650 }]
      const house = build(laid), cover = house[2]
      if (cover.under.length !== 2) continue
      seen += 1
      for (let x = posts[0] + 14; x <= posts[1] - 14; x += 4) {
        const lain = settle(house, idOf('twig', 3), 'twig', x, undefined, HOLLOW.floorY - 10)
        if (isRested(lain)) expect(lain.x < cover.x - cover.w / 2 + 6 || lain.x > cover.x + cover.w / 2 - 6, `a post let go at ${x} under the ${kind} stands at ${lain.x}`).toBe(true)
      }
    }
    expect(seen).toBeGreaterThanOrEqual(6)
  })

  it('is so under a thing that lies on one post too: a parasol, a bell, a crosspiece, a little tree', () => {
    for (const kind of ['leaf', 'cap', 'twig', 'moss', 'bark'] as const) {
      const laid: Laid[] = [{ id: idOf('twig', 0), x: 650 }, { id: idOf(kind, kind === 'twig' ? 2 : 0), x: 650 }]
      const house = build(laid), over = house[1]
      expect(over.under, kind).toEqual([idOf('twig', 0)])
      // Beside the post, under what hangs out over it. A bell hangs to one side: the pebble is let go under that side.
      const x = kind === 'cap' ? over.x : 650 + 44
      const pebble = idOf('pebble')
      const lain = settle(house, pebble, 'pebble', x, undefined, HOLLOW.floorY)
      if (!isRested(lain)) throw new Error(`the pebble let go under the ${kind} on a post was shed by ${lain.shedBy}`)
      expect(lain.on, kind).toBe('ground')
      expect(allUnder(house, lain).size, kind).toBe(0)
      expect(saidByItsList(joined(house, lain)), kind).toBe(true)
    }
  })

  it.each([[1, 20], [21, 40]])('never rests on what it was let go under, and leaves a house its list can say, in houses %i to %i made by chance', (from, to) => {
    let under = 0, slid = 0, edges = 0
    for (let seed = from; seed <= to; seed++) {
      const rng = makeRng(seed * 31)
      const order = FOUND.map((found) => ({ id: found.id, key: rng.next() })).sort((a, b) => a.key - b.key)
      const house = build(order.slice(0, 4 + Math.floor(rng.next() * 8)).map(({ id }) => ({ id, x: Math.round(HOLLOW.left + rng.next() * (HOLLOW.right - HOLLOW.left)) })))
      const free = FOUND.filter((found) => !house.some((r) => r.id === found.id))
      for (const kind of KINDS) {
        const thing = free.find((found) => found.kind === kind)
        if (!thing) continue
        for (let x = HOLLOW.left + 6; x <= HOLLOW.right; x += 37) for (const up of [0, 30, 70, 120]) {
          const level = groundY(x) - up
          const lain = settle(house, thing.id, kind, x, undefined, level)
          if (!isRested(lain)) continue
          const overIt = house.filter((r) => r.y <= level - 1)
          const below = allUnder(house, lain)
          for (const r of overIt) expect(below.has(r.id), `house ${seed}: the ${kind} let go at ${x}, ${up} up, lies on the ${r.kind} ${r.id} it was let go under`).toBe(false)
          if (lain.said) under += 1
          if (lain.aside) slid += 1
          const after = joined(house, lain)
          expect(saidByItsList(after), `house ${seed}: the ${kind} let go at ${x}, ${up} up`).toBe(true)
          // In the list it comes before whatever it was let go under and lies under, be it by no more than an overhanging edge.
          const at = after.findIndex((r) => r.id === thing.id), now = after[at]
          for (const [index, r] of after.entries()) {
            if (r.id === thing.id || !overIt.some((o) => o.id === r.id) || r.y > topOf(now) + 0.5 || r.x + r.w / 2 <= now.x - now.w / 2 || r.x - r.w / 2 >= now.x + now.w / 2) continue
            expect(index, `house ${seed}: the ${kind} let go at ${x}, ${up} up, comes after the ${r.kind} ${r.id} that lies over it`).toBeGreaterThan(at)
            edges += 1
          }
          // Nothing that lay there lies otherwise for it.
          for (const was of house) expect(sameRest(after.find((r) => r.id === was.id)!, was), `house ${seed}: the ${kind} let go at ${x}, ${up} up, moved the ${was.kind} ${was.id}`).toBe(true)
        }
      }
    }
    expect(under).toBeGreaterThan(15)
    expect(slid).toBeGreaterThan(15)
    expect(edges).toBeGreaterThan(15)
  }, 60000)
})

describe('under a roof, in the hand', () => {
  const roofed = (): Toy => new Toy({ ...freshSave(7), things: [{ id: idOf('twig', 0), x: POSTS[0] }, { id: idOf('twig', 1), x: POSTS[1] }, { id: idOf('leaf'), x: 650 }] }, 3)
  const shownOf = (toy: Toy, id: number) => toy.show(null).things.find((thing) => thing.id === id)!
  function hold(toy: Toy, id: number, x: number, y: number): void {
    const box = touchBox({ ...shownOf(toy, id), sx: 1, sy: 1 })
    toy.press(box.x + box.w / 2, box.y + box.h / 2)
    toy.dragStart()
    toy.dragMove(x, y)
    run(toy, 0.2)
  }

  it('the shadow lies on the ground under the roof while the thing is held under it, and the thing comes to rest on it', () => {
    const toy = roofed(), cap = idOf('cap')
    hold(toy, cap, 650, HOLLOW.floorY - 6)
    const shadow = toy.show(null).shadow!
    expect(Math.abs(shadow.x - 650)).toBeLessThan(4)
    expect(shadow.y).toBeGreaterThanOrEqual(HOLLOW.floorY)
    toy.drop()
    run(toy, 2.5)
    const roof = toy.rested.find((r) => r.kind === 'leaf')!, lain = toy.rested.find((r) => r.id === cap)!
    expect(lain).toMatchObject({ on: 'ground', x: shadow.x, y: shadow.y })
    expect(roof).toMatchObject({ lies: 'tent', under: [idOf('twig', 0), idOf('twig', 1)] })
    // It is drawn where it lies, and nothing has gone home.
    expect(shownOf(toy, cap).x).toBeCloseTo(shadow.x, 0)
    expect(toy.rested).toHaveLength(4)
    // Put away and opened again it is under the roof still.
    const again = new Toy(deserialize(JSON.parse(JSON.stringify(serialize(toy.toSave()))), 7), 3)
    expect(again.rested.map((r) => [r.id, r.x, r.y])).toEqual(toy.rested.map((r) => [r.id, r.x, r.y]))
    expect(toy.toSave().things.map((thing) => thing.id)).toEqual([idOf('twig', 0), idOf('twig', 1), cap, idOf('leaf')])
  })

  it('held over the roof it has its shadow on the roof, and is shed by the leaf as before', () => {
    const toy = roofed(), cap = idOf('cap')
    const roof = toy.rested.find((r) => r.kind === 'leaf')!
    hold(toy, cap, 650, topOf(roof) - 30)
    expect(toy.show(null).shadow).toBeNull()
    toy.drop()
    run(toy, 3)
    expect(toy.rested.some((r) => r.id === cap)).toBe(false)
  })

  it('a post held under the roof, too tall for it and with a post of the roof on either side, goes home from the ground and leaves the roof as it was', () => {
    const toy = roofed(), post = idOf('twig', 3)
    const before = toy.rested.map((r) => [r.id, r.x, r.y, r.lies])
    hold(toy, post, 650, HOLLOW.floorY - 6)
    expect(toy.show(null).shadow).toBeNull()
    toy.drop()
    // It never rises: from the hand it goes down to the ground and from there home.
    const roof = toy.rested.find((r) => r.kind === 'leaf')!
    let highest = Infinity
    for (let i = 0; i < 40; i++) {
      run(toy, 0.02)
      const shown = shownOf(toy, post)
      if (Math.abs(shown.x - 650) < 60) highest = Math.min(highest, shown.y)
    }
    expect(highest).toBeGreaterThan(roof.y + 40)
    run(toy, 3)
    expect(toy.rested.map((r) => [r.id, r.x, r.y, r.lies])).toEqual(before)
  })

  it('a feather held under a parasol, too wide to lie beside its post, slides out from under it along the ground', () => {
    const toy = new Toy({ ...freshSave(7), things: [{ id: idOf('twig', 0), x: 650 }, { id: idOf('leaf'), x: 650 }] }, 3), feather = idOf('feather')
    expect(toy.rested[1]).toMatchObject({ lies: 'tent', under: [idOf('twig', 0)] })
    hold(toy, feather, 700, HOLLOW.floorY - 6)
    const shadow = toy.show(null).shadow!
    toy.drop()
    run(toy, 2.5)
    const lain = toy.rested.find((r) => r.id === feather)!
    expect(lain).toMatchObject({ on: 'ground', under: [], x: shadow.x })
    expect(toy.rested.find((r) => r.kind === 'leaf')).toMatchObject({ lies: 'tent', under: [idOf('twig', 0)] })
  })
})
