import { describe, expect, it } from 'vitest'
import { BODY, FOUND, HOLLOW, KINDS, carries, type Kind } from './kinds'
import { build, carriedWith, isRested, liesAsLetGo, settle, topOf, without, type Laid, type Rested } from './rest'
import { makeRng } from './rng'
import { firstHouse, freshSave } from './save'
import { TICK, Toy, type ShownThing } from './toy'
import { LAND } from './voices'

// A thing is only ever shed by what it touches, where it touches it. Where
// it has no room to lie as it was let go, it comes to rest in the nearest
// free place it can slide to without crossing another thing, and it goes
// home only when there is none.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id

/** The first-visit house of the youngest child, and the houses made by chance from one number to another: sixty in all. */
function houses(from = 1, to = 60): [string, Rested[]][] {
  const all: [string, Rested[]][] = from === 1 ? [['the first-visit house', build(firstHouse(null))]] : []
  for (let seed = from; seed <= to; seed++) {
    const rng = makeRng(seed * 17)
    const order = FOUND.map((found) => ({ id: found.id, key: rng.next() })).sort((a, b) => a.key - b.key)
    const laid: Laid[] = order.slice(0, 3 + Math.floor(rng.next() * 9)).map(({ id }) => ({ id, x: Math.round(HOLLOW.left + rng.next() * (HOLLOW.right - HOLLOW.left)) }))
    all.push([`house ${seed}`, build(laid)])
  }
  return all
}

/** Everything a thing lies on, down to the ground. */
function allUnder(house: readonly Rested[], rest: Rested): Set<number> {
  const all = new Set<number>()
  const add = (ids: readonly number[]): void => { for (const id of ids) if (!all.has(id)) { all.add(id); add(house.find((r) => r.id === id)?.under ?? []) } }
  add(rest.under)
  return all
}

/** Where a thing is let go round a house: on each thing, at both of its edges, and between each pair of neighbours. */
function drops(house: readonly Rested[]): number[] {
  const xs = new Set<number>()
  const sorted = [...house].sort((a, b) => a.x - b.x)
  for (const r of sorted) for (const x of [r.x, r.x - r.w / 2, r.x + r.w / 2, r.x - r.w / 2 - 10, r.x + r.w / 2 + 10]) xs.add(Math.round(x))
  for (let i = 1; i < sorted.length; i++) xs.add(Math.round((sorted[i - 1].x + sorted[i].x) / 2))
  for (let x = HOLLOW.left; x <= HOLLOW.right; x += 50) xs.add(x)
  return [...xs].filter((x) => x >= HOLLOW.left && x <= HOLLOW.right)
}

describe('a thing let go where it has no room', () => {
  it.each([[1, 30], [31, 60]])('is shed by a leaf, an acorn cap or a feather only when its middle is over that very thing, and is shed from its top (houses %i to %i)', (from, to) => {
    let sheds = 0
    for (const [name, house] of houses(from, to)) {
      const free = FOUND.filter((found) => !house.some((r) => r.id === found.id))
      for (const kind of KINDS) {
        const thing = free.find((found) => found.kind === kind)
        if (!thing) continue
        for (const x of drops(house)) {
          const result = settle(house, thing.id, kind, x)
          if (isRested(result) || result.shedBy === 'arch' || result.shedBy === 'out') continue
          sheds += 1
          const by = house.find((r) => r.kind === result.shedBy && r.x === result.x && topOf(r) === result.y)
          expect(by, `${name}: ${kind} at ${x} shed by a ${result.shedBy} at ${result.x}`).toBeDefined()
          // Its middle, kept inside the walls and on its own piece of ground, is over that thing.
          const half = BODY[kind].w / 2, inWalls = Math.min(HOLLOW.right - half, Math.max(HOLLOW.left + half, x))
          const onStep = inWalls < HOLLOW.stepRight
          const middle = [inWalls, onStep ? Math.min(inWalls, HOLLOW.stepRight - half) : Math.max(inWalls, HOLLOW.stepRight + half)].reduce((a, b) => (Math.abs(a - by!.x) < Math.abs(b - by!.x) ? a : b))
          // Near a wall, where the arch comes down low, a thing is set down up to 40 further in.
          const inward = middle < HOLLOW.archX ? 1 : -1
          const nearest = Math.min(...Array.from({ length: 21 }, (_, i) => Math.abs(middle + inward * i * 2 - by!.x)))
          expect(nearest, `${name}: ${kind} at ${x} shed by a ${result.shedBy} at ${result.x}`).toBeLessThanOrEqual(by!.w / 2 + 0.5)
        }
      }
    }
    expect(sheds).toBeGreaterThan(100)
  }, 60000)

  it.each([[1, 30], [31, 60]])('slides to the nearest free place and no further, never across another thing, and goes home only when there is none (houses %i to %i)', (from, to) => {
    let slid = 0, home = 0
    for (const [name, house] of houses(from, to)) {
      const free = FOUND.filter((found) => !house.some((r) => r.id === found.id))
      for (const kind of KINDS) {
        const thing = free.find((found) => found.kind === kind)
        if (!thing) continue
        // Every place along the hollow where the thing lies as it is let go, with nothing in its way.
        const places: { x: number; rest: Rested }[] = []
        for (let x = HOLLOW.left; x <= HOLLOW.right; x += 1) {
          const there = liesAsLetGo(house, thing.id, kind, x)
          if (!there) continue
          // A place is where it lies as let go: on the ground, or on a thing its middle is over. Coming down on a carrier it only overlaps is not sliding there.
          const support = house.find((r) => r.id === there.under[0])
          if (support && Math.abs(x - support.x) >= support.w / 2 + BODY[kind].w / 4) continue
          places.push({ x, rest: there })
        }
        for (const x of drops(house)) {
          const result = settle(house, thing.id, kind, x)
          if (isRested(result) && !result.aside) continue
          if (!isRested(result) && result.shedBy !== 'out') continue
          const where = `${name}: ${kind} at ${x}`
          // What carried it where it was let go, which it may slide off: the carriers its middle half lay over, and what those lie on.
          const half = BODY[kind].w / 2, middle = Math.min(HOLLOW.right - half, Math.max(HOLLOW.left + half, x))
          const over = house.filter((o) => carries(o.kind) && Math.abs(middle - o.x) <= o.w / 2 + half / 2)
          const startedOn = new Set(over.flatMap((o) => [o.id, ...allUnder(house, o)]))
          const started = (o: Rested): boolean => startedOn.has(o.id)
          const crosses = (to: number, rest: Rested): boolean => {
            const ends = allUnder(house, rest)
            return house.some((o) => (o.x - middle) * Math.sign(to - x) > 1 && (to - o.x) * Math.sign(to - x) > 1 && !ends.has(o.id) && !started(o))
          }
          // It slides along and down from where it first touches, never up onto a thing.
          const touchY = isRested(result) ? result.aside!.y : result.y
          const reachable = places.filter((place) => place.rest.y >= touchY - 12 && !crosses(place.x, place.rest))
          if (!isRested(result)) {
            home += 1
            expect(reachable.map((place) => place.x), `${where} went home`).toEqual([])
            continue
          }
          slid += 1
          // It lies where the save will have it, with nothing in its way, and it crossed nothing.
          expect(crosses(result.dropX, result), `${where} slid to ${result.dropX}`).toBe(false)
          const nearest = Math.min(...reachable.map((place) => Math.abs(place.x - x)))
          expect(Math.abs(result.dropX - x), `${where} slid to ${result.dropX}`).toBeLessThanOrEqual(nearest + 0.5)
          // It first touches where it was let go, and does not climb from there.
          expect(result.y).toBeGreaterThanOrEqual(result.aside!.y - 12)
        }
      }
    }
    expect(slid).toBeGreaterThan(150)
    expect(home).toBeGreaterThan(2)
  }, 60000)

  it('leaves room for a see-saw on the pebble of the first-visit house, from either side', () => {
    const house = build(firstHouse(null)), pebble = house.find((r) => r.kind === 'pebble')!
    for (const x of [pebble.x - 20, pebble.x - 4, pebble.x + 4, pebble.x + 20]) {
      const slab = settle(house, idOf('bark'), 'bark', x)
      expect(isRested(slab) && slab.lies, `a slab let go at ${x}`).toBe('tipped')
      expect(isRested(slab) && slab.side).toBe(x < pebble.x ? -1 : 1)
    }
    // And a leaf leans down from it as a slide, to either side.
    for (const x of [pebble.x - 20, pebble.x + 20]) {
      const leaf = settle(house, idOf('leaf', 1), 'leaf', x)
      expect(isRested(leaf) && leaf.lies).toBe('ramp')
    }
  })
})

describe('a thing that is lifted', () => {
  it('moves and sheds nothing but what rested on it, in the first-visit house and in three hundred houses made by chance', () => {
    let lifts = 0, moved = 0, shed = 0
    const all = houses()
    for (let seed = 61; seed <= 300; seed++) {
      const rng = makeRng(seed * 17)
      const order = FOUND.map((found) => ({ id: found.id, key: rng.next() })).sort((a, b) => a.key - b.key)
      all.push([`house ${seed}`, build(order.slice(0, 3 + Math.floor(rng.next() * 9)).map(({ id }) => ({ id, x: Math.round(HOLLOW.left + rng.next() * (HOLLOW.right - HOLLOW.left)) })))])
    }
    for (const [name, house] of all) {
      for (const lifted of house) {
        const bundle = carriedWith(house, lifted.id).map((r) => r.id)
        const after = without(house, bundle)
        lifts += 1
        // What may lie otherwise afterwards: what rested on something that went up, and what rests on such a thing.
        const touched = new Set(bundle)
        for (let grew = true; grew; ) {
          grew = false
          for (const r of house) if (!touched.has(r.id) && r.under.some((id) => touched.has(id))) { touched.add(r.id); grew = true }
        }
        for (const now of after.moved) {
          moved += 1
          expect(touched.has(now.id), `${name}: lifting the ${lifted.kind} ${lifted.id} moved the ${now.kind} ${now.id}, which did not rest on it`).toBe(true)
        }
        for (const gone of after.shed) {
          shed += 1
          expect(touched.has(gone.id), `${name}: lifting the ${lifted.kind} ${lifted.id} shed thing ${gone.id}, which did not rest on it`).toBe(true)
        }
      }
    }
    expect(lifts).toBeGreaterThan(1500)
    expect(moved).toBeGreaterThan(8)
    expect(shed).toBeGreaterThan(0)
  }, 60000)

  it('leaves a slide and a see-saw that lean away from it leaning as they did, and a thing that came down on a neighbour where it lies', () => {
    for (const kind of ['leaf', 'bark'] as const) {
      // A bath stands where the slide or the see-saw would come down: it leans to its other side.
      const laid: Laid[] = [{ id: idOf('pebble'), x: 640 }, { id: idOf('cap'), x: 720 }, { id: idOf(kind), x: 652 }]
      const house = build(laid), leaning = house.find((r) => r.kind === kind)!
      expect(leaning, kind).toMatchObject({ lies: kind === 'leaf' ? 'ramp' : 'tipped', side: -1 })
      const after = without(house, [idOf('cap')])
      expect(after.moved, kind).toEqual([])
      expect(after.house.find((r) => r.kind === kind), kind).toMatchObject({ x: leaning.x, y: leaning.y, side: -1 })
    }
    // A leaf let go over a post on the floor, with its side over a taller post on the root step, comes down on the taller one as a parasol.
    // With the post on the floor carried off it is a parasol still, and a slab that lies on a cushion further on is not disturbed.
    const laid: Laid[] = [{ id: idOf('twig'), x: 478 }, { id: idOf('twig', 1), x: 520 }, { id: idOf('moss'), x: 650 }, { id: idOf('leaf'), x: 529 }, { id: idOf('bark'), x: 710 }]
    const house = build(laid), parasol = house.find((r) => r.kind === 'leaf')!
    expect(parasol).toMatchObject({ lies: 'tent', under: [idOf('twig')] })
    const after = without(house, [idOf('twig', 1)])
    expect(after.moved).toEqual([])
    expect(after.shed).toEqual([])
  })

  it('never lays a leaf flat or a slab level on a stone because of what stands beside it: with no side free it is in the way, and comes to rest as a thing in the way does', () => {
    for (const kind of ['leaf', 'bark'] as const) {
      const laid: Laid[] = [{ id: idOf('pebble'), x: 640 }, { id: idOf('cap'), x: 560 }, { id: idOf('cap', 1), x: 720 }]
      const house = build(laid)
      const result = settle(house, idOf(kind), kind, 640)
      // Between two baths it has no free place it can reach without crossing one: it goes home.
      expect(isRested(result) ? result.lies : result.shedBy, kind).toBe('out')
      // With one bath only it leans or tips to the free side, and with room beyond a bath further off it slides there.
      const one = build(laid.slice(0, 2))
      expect(settle(one, idOf(kind), kind, 640), kind).toMatchObject({ on: 'pebble', side: 1 })
    }
    // On a stone that stands on something, or between a wall and the edge of the root step, the stone itself leaves no side: there it does lie flat.
    const high = build([{ id: idOf('bark'), x: 640 }, { id: idOf('pebble'), x: 640 }])
    expect(settle(high, idOf('leaf'), 'leaf', 640)).toMatchObject({ on: 'pebble', lies: 'flat' })
  })
})

describe('as the child sees it', () => {
  const at = (toy: Toy, id: number): ShownThing => { const show = toy.show(null); return { ...[...show.things, ...show.front].find((thing) => thing.id === id)! } }
  function letGo(toy: Toy, id: number, x: number): void {
    const home = FOUND[id].home
    toy.press(home.x, home.y - 8)
    toy.dragStart()
    toy.dragMove(x, 400)
    for (let i = 0; i < 30; i++) toy.step(TICK)
    toy.drop()
  }

  it('sets a slab let go over the first-visit pebble down as a see-saw: it does not swerve to the bed and fly home', () => {
    const toy = new Toy(freshSave(null), 3), slab = idOf('bark')
    const pebble = toy.rested.find((r) => r.kind === 'pebble')!
    letGo(toy, slab, pebble.x - 10)
    let furthest = 0
    for (let i = 0; i < 3 / TICK; i++) {
      toy.step(TICK)
      furthest = Math.max(furthest, Math.abs(at(toy, slab).x - pebble.x))
    }
    expect(toy.rested.find((r) => r.id === slab)).toMatchObject({ lies: 'tipped', under: [pebble.id] })
    expect(furthest).toBeLessThan(60)
  })

  it('brings a thing that slides aside straight down first, then along to its free place, with a knock where it touches and its own sound where it lands', () => {
    // A pebble let go with its edge over a rug: it comes down beside where it was let go and slides off the leaf.
    const toy = new Toy({ ...freshSave(7), things: [{ id: idOf('leaf'), x: 640 }] }, 3), pebble = idOf('pebble')
    const leaf = toy.rested[0]
    const x = leaf.x + leaf.w / 2 + 14
    letGo(toy, pebble, x)
    const rest = toy.rested.find((r) => r.id === pebble)!
    expect(rest.x).toBeGreaterThan(x + 4)
    toy.sounds.length = 0
    const path: { x: number; y: number; sounds: number }[] = []
    for (let i = 0; i < 2 / TICK; i++) {
      const before = toy.sounds.length
      toy.step(TICK)
      const now = at(toy, pebble)
      path.push({ x: now.x, y: now.y, sounds: toy.sounds.slice(before).filter((sound) => sound.from === `knock ${pebble}`).length })
    }
    const knocks = path.flatMap((step, i) => (step.sounds > 0 ? [i] : []))
    expect(knocks.length).toBeGreaterThanOrEqual(2)
    // Down to the first knock it falls straight: it does not drift toward where it will lie.
    for (const step of path.slice(0, knocks[0])) expect(Math.abs(step.x - x)).toBeLessThan(3)
    // Between the first knock and the second it slides, a little each step, and never jumps.
    for (let i = knocks[0] + 1; i <= knocks[1]; i++) expect(Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)).toBeLessThan(5)
    expect(path[knocks[1]].x).toBeCloseTo(rest.x, 0)
    expect(path[path.length - 1]).toMatchObject({ x: rest.x, y: rest.y })
  })

  it('lays a leaf flat on a stone that has no room beside it with the sound of a leaf laid flat, and no zip', () => {
    // A stone on the root step: a leaf on it has no room to lean down to the ground on either side.
    const things: Laid[] = [{ id: idOf('pebble'), x: 420 }]
    const toy = new Toy({ ...freshSave(7), things }, 3), leaf = idOf('leaf')
    letGo(toy, leaf, 420)
    toy.sounds.length = 0
    for (let i = 0; i < 2 / TICK; i++) toy.step(TICK)
    expect(toy.rested.find((r) => r.id === leaf)).toMatchObject({ on: 'pebble', lies: 'flat' })
    const landing = toy.sounds.find((sound) => sound.from === `knock ${leaf}`)!.voice
    const tones = (voice: readonly object[]): string => JSON.stringify(voice.map((note) => ({ ...note, peak: 0 })))
    expect(tones(landing)).toBe(tones(LAND.leaf.ground))
    expect(tones(landing)).not.toBe(tones(LAND.leaf.pebble))
  })
})
