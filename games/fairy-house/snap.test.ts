import { describe, expect, it } from 'vitest'
import { planEvening, type Part } from './evening'
import { BODY, FOUND, HOLLOW, KINDS, carries, groundY, type Kind } from './kinds'
import { build, laidOf, liesAsLetGo, type Laid, type Rested } from './rest'
import { freshSave } from './save'
import { SUN_AT, TICK, Toy } from './toy'

// A parasol whose twig snaps falls where it stands, straight down. It lies
// where it lands, or slides the shortest way to free ground, and it never
// crosses another thing. The fat one, who stood on it, does not ride it
// aside and is never left on air: it drops to the ground and lands there.
// Held over every thing a leaf can hang beside, on both grounds.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const TWIG = idOf('twig', 0), LEAF = idOf('leaf', 0)

type Case = { name: string; laid: Laid[]; house: Rested[]; leaf: Rested }

/** A parasol with each kind of thing beside it, at each distance on each side, and with one on both sides; on the floor, on the root step and by the wall. */
function cases(): Case[] {
  const all: Case[] = []
  for (const at of [420, 600, 690, 780]) {
    for (const kind of KINDS) {
      // The neighbour is another of its kind where the parasol is made of the first.
      const nth = kind === 'twig' || kind === 'leaf' ? 1 : 0
      const sides: [string, number[]][] = []
      for (const d of [24, 40, 56, 72, 88, 104, 120]) for (const side of [-1, 1]) sides.push([`${d * side}`, [d * side]])
      for (const d of [40, 64, 88]) sides.push([`both sides at ${d}`, [-d, d]])
      for (const [where, offsets] of sides) {
        for (const first of [false, true]) {
          const beside: Laid[] = offsets.map((off, i) => ({ id: idOf(kind, nth + i), x: at + off }))
          const parasol: Laid[] = [{ id: TWIG, x: at }, { id: LEAF, x: at }]
          const house = build(first ? [...beside, ...parasol] : [...parasol, ...beside])
          const leaf = house.find((r) => r.id === LEAF)
          // Only where it is a parasol: a leaf on the tip of one standing twig, with every neighbour in the house.
          const twig = house.find((r) => r.id === TWIG)
          if (!leaf || leaf.lies !== 'tent' || leaf.under.length !== 1 || twig?.lies !== 'upright' || house.length !== 2 + offsets.length) continue
          all.push({ name: `a parasol at ${at} with a ${kind} at ${where}${first ? ', set down first' : ''}`, laid: laidOf(house), house, leaf })
        }
      }
    }
  }
  return all
}

const roofOf = (laid: Laid[]): Part => planEvening(laid, [], []).parts.find((part) => part.act === 'roof')!

function allUnder(house: readonly Rested[], rest: Rested): Set<number> {
  const all = new Set<number>()
  const add = (ids: readonly number[]): void => { for (const id of ids) if (!all.has(id)) { all.add(id); add(house.find((r) => r.id === id)?.under ?? []) } }
  add(rest.under)
  return all
}

describe('a parasol whose twig snaps', () => {
  it('moves nothing else, lies where it lands or slides the shortest way to free ground, crosses nothing, and goes home only with no free place', () => {
    let lies = 0, slid = 0, home = 0
    const all = cases()
    for (const { name, laid, house, leaf } of all) {
      const part = roofOf(laid)
      expect(part.twigs, name).toEqual([TWIG])
      // Everything else lies as it lay: the leaf is the thing that moved, and nothing it does not touch is moved by it.
      for (const was of house) {
        if (was.id === LEAF) continue
        expect(part.house.find((r) => r.id === was.id), `${name}: the ${was.kind}`).toMatchObject({ x: was.x, y: was.y, lies: was.lies })
      }
      const others = part.house.filter((r) => r.id !== LEAF)
      const now = part.house.find((r) => r.id === LEAF)
      // It lies where it lands, on its stump.
      if (now && part.lands === null) {
        lies += 1
        expect(now.under, name).toContain(TWIG)
        expect(Math.abs(now.x - leaf.x), name).toBeLessThanOrEqual(0.5)
        continue
      }
      // It first touches straight below where it stood.
      expect(part.lands, name).not.toBeNull()
      const touch = part.lands!
      expect(Math.abs(touch.x - leaf.x), name).toBeLessThanOrEqual(0.5)
      // What it began on: the stump, as a carrier under its middle.
      const began = new Set(others.filter((o) => carries(o.kind) && Math.abs(leaf.x - o.x) <= o.w / 2 + BODY.leaf.w / 4).flatMap((o) => [o.id, ...allUnder(others, o)]))
      const crosses = (to: number, rest: Rested): boolean => {
        const ends = allUnder(others, rest)
        return others.some((o) => (o.x - leaf.x) * Math.sign(to - leaf.x) > 1 && (to - o.x) * Math.sign(to - leaf.x) > 1 && !ends.has(o.id) && !began.has(o.id))
      }
      // Every place the leaf lies as let go, no higher than where it touched, that it can reach without crossing.
      const reachable: number[] = []
      const snapped = new Set(part.snapped)
      for (let x = HOLLOW.left; x <= HOLLOW.right; x += 1) {
        const there = liesAsLetGo(others, LEAF, 'leaf', x, snapped)
        if (!there) continue
        const support = others.find((r) => r.id === there.under[0])
        if (support && Math.abs(x - support.x) >= support.w / 2 + BODY.leaf.w / 4) continue
        if (there.y >= touch.y - 12 && !crosses(x, there)) reachable.push(x)
      }
      if (!now) {
        home += 1
        expect(reachable, `${name} went home`).toEqual([])
        continue
      }
      slid += 1
      // What its sides were over where it stood, the stump apart.
      const touched = others.filter((o) => o.id !== TWIG && Math.abs(o.x - leaf.x) < o.w / 2 + BODY.leaf.w / 2)
      if (now.on === 'ground' || !touched.some((o) => now.under.includes(o.id))) {
        expect(crosses(now.dropX, now), `${name} slid to ${now.dropX}`).toBe(false)
        expect(now.y).toBeGreaterThanOrEqual(touch.y - 12)
        if (reachable.length > 0) expect(Math.abs(now.dropX - leaf.x), `${name} slid to ${now.dropX}`).toBeLessThanOrEqual(Math.min(...reachable.map((x) => Math.abs(x - leaf.x))) + 0.5)
      }
      // Coming down on a thing that carries, it is on the very thing its side touched: never one further off.
      else expect(Math.abs(now.x - leaf.x), name).toBeLessThanOrEqual(BODY.leaf.w / 2 + 60)
    }
    expect(all.length).toBeGreaterThan(300)
    expect(lies).toBeGreaterThan(40)
    expect(slid).toBeGreaterThan(40)
    expect(home).toBeGreaterThan(3)
  }, 60000)

  it.each([[0], [3]])('is seen to fall straight down, then to slide without a jump and without passing another thing; the fat one drops to the ground and neither rides it aside nor is left on air (every sixth case, from case %i)', (phase) => {
    let slid = 0, home = 0, rode = 0
    const all = cases().filter((_, i) => i % 6 === phase)
    for (const { name, laid, leaf } of all) {
      const part = roofOf(laid), end = part.house.find((r) => r.id === LEAF)
      const toy = new Toy({ ...freshSave(7), things: laid }, 3)
      // The sun is pulled below the hill.
      toy.press(SUN_AT.x, SUN_AT.y)
      toy.dragStart()
      toy.dragMove(SUN_AT.x, SUN_AT.under)
      toy.step(TICK * 4)
      toy.drop()
      toy.sounds.length = 0
      const path: { x: number; y: number; knock: boolean; crack: boolean; fat: { x: number; y: number }; others: { id: number; x: number }[] }[] = []
      let cracked = -1
      for (let i = 0; i < 9 / TICK && (cracked < 0 || i < cracked + 1.8 / TICK); i++) {
        const heard = toy.sounds.length
        toy.step(TICK)
        const show = toy.show(null), things = [...show.things, ...show.front]
        const now = things.find((thing) => thing.id === LEAF)!
        const fresh = toy.sounds.slice(heard)
        const crack = fresh.some((sound) => sound.from === 'act roof')
        if (crack && cracked < 0) cracked = i
        path.push({ x: now.x, y: now.y, knock: fresh.some((sound) => sound.from === `knock ${LEAF}`), crack, fat: { x: show.stand.fat.x, y: show.stand.fat.y }, others: things.filter((thing) => thing.housed && thing.id !== LEAF).map((thing) => ({ id: thing.id, x: thing.x })) })
      }
      expect(cracked, name).toBeGreaterThan(0)
      const after = path.slice(cracked)
      const knocks = after.flatMap((step, i) => (step.knock ? [i] : []))
      expect(knocks.length, name).toBeGreaterThanOrEqual(1)
      const moves = part.lands !== null
      // Down to where it first touches it falls where it stood.
      for (const step of after.slice(0, knocks[0] + 1)) expect(Math.abs(step.x - leaf.x), name).toBeLessThan(3)
      expect(after[knocks[0]].y, name).toBeGreaterThan(leaf.y + 10)
      if (end && moves) {
        slid += 1
        // From there it slides, a little each step, to where it lies, and lands there with a second sound.
        expect(knocks.length, name).toBeGreaterThanOrEqual(2)
        const ends = new Set([...end.under, ...allUnder(part.house, end)])
        for (let i = knocks[0] + 1; i <= knocks[1]; i++) {
          expect(Math.hypot(after[i].x - after[i - 1].x, after[i].y - after[i - 1].y), name).toBeLessThan(5)
          // It passes the middle of nothing but what it comes to lie on.
          for (const other of after[i].others) {
            if (ends.has(other.id) || other.id === TWIG) continue
            expect(Math.sign(after[i].x - other.x), `${name}: past thing ${other.id}`).toBe(Math.sign(leaf.x - other.x))
          }
        }
        expect(after[knocks[1]].x, name).toBeCloseTo(end.x, 0)
      }
      if (!end) home += 1
      // The fat one: it stays over where the parasol stood, and it is on the leaf, dropping, or on the ground.
      const ground = groundY(leaf.x)
      let onAir = 0
      for (let i = 1; i < after.length; i++) {
        const fat = after[i].fat, thing = after[i]
        if (moves) expect(Math.abs(fat.x - leaf.x), `${name}: the fat one rides aside`).toBeLessThan(3)
        const onLeaf = Math.abs(thing.x - fat.x) < 4 && fat.y <= thing.y + 1 && fat.y >= thing.y - 60
        const onGround = fat.y >= ground - 12
        const dropping = fat.y > after[i - 1].fat.y + 0.01
        if (onLeaf || onGround || dropping) onAir = 0
        else onAir += 1
        // A moment at the top of a drop, and no more.
        expect(onAir, `${name}: the fat one on air at step ${i}`).toBeLessThan(0.06 / TICK)
      }
      const last = after[after.length - 1]
      if (moves) expect(last.fat.y, `${name}: the fat one on the ground`).toBeGreaterThanOrEqual(ground - 12)
      else {
        rode += 1
        expect(last.fat.y, `${name}: the fat one on the roof`).toBeLessThan(ground - 20)
      }
    }
    expect(slid).toBeGreaterThan(6)
    expect(slid + home).toBeGreaterThan(7)
    expect(rode).toBeGreaterThan(6)
  }, 60000)
})
