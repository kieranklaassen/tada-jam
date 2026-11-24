import { FIVE, SIDES, sideOf, type Bed, type Side } from './bed'
import { bottleAt } from './layout'
import { below, type Rng } from './rng'

// Milk: five bottles parted over two shelves, and the straws that join them to
// the sheep below, one to one.

/** One bottle, on the shelf over a half. A bottle that wears a sheep's colour is that sheep's. */
type Bottle = { side: Side; slot: number; owner: number | null }
export type Milk = Bottle[]

const onShelf = (milk: Milk, side: Side): number => milk.filter((b) => b.side === side).length

export function bottles(left: number, owners: { side: Side; who: readonly number[] } | null = null): Milk {
  const milk: Milk = []
  for (const side of SIDES) {
    const n = side === 'left' ? left : FIVE - left
    for (let slot = 0; slot < n; slot++) milk.push({ side, slot, owner: owners?.side === side ? (owners.who[slot] ?? null) : null })
  }
  return milk
}

/** One bottle's straw: which sheep has its end, or nobody. */
export type Straw = { bottle: number; who: number | null }

/**
 * Straws go down within a half, the colour's own first. One that has a sheep keeps it for as long as that sheep stays;
 * of the rest the highest sheep takes the nearest, so that they seldom cross and one with nobody hangs clear of it. One in the air has no straw.
 */
export function straws(bed: Bed, milk: Milk, before: readonly Straw[] | null = null): Straw[] {
  const out: Straw[] = milk.map((_, bottle) => ({ bottle, who: null }))
  for (const side of SIDES) {
    const inward = side === 'left' ? 1 : -1
    const here = bed.sheep.map((_, i) => i).filter((i) => !bed.sheep[i].leap && sideOf(bed.sheep[i].x) === side)
    milk.forEach((b, i) => { if (b.side === side && b.owner !== null && here.includes(b.owner)) out[i].who = b.owner })
    // One with a bottle of its own somewhere else waits for that.
    let plain = here.filter((i) => !milk.some((b) => b.owner === i)).sort((a, b) => bed.sheep[a].y - bed.sheep[b].y || (bed.sheep[a].x - bed.sheep[b].x) * inward)
    let free = milk.map((_, i) => i).filter((i) => milk[i].side === side && milk[i].owner === null)
    for (const i of free) {
      const kept = before?.[i]?.who
      if (kept !== null && kept !== undefined && plain.includes(kept)) { out[i].who = kept; plain = plain.filter((x) => x !== kept) }
    }
    free = free.filter((i) => out[i].who === null)
    for (const who of plain) {
      const x = (i: number) => Math.abs(bottleAt(side, milk[i].slot, onShelf(milk, side)).x - bed.sheep[who].x)
      const nearest = free.sort((a, b) => x(a) - x(b) || (milk[a].slot - milk[b].slot) * inward).shift()
      if (nearest !== undefined) out[nearest].who = who
    }
  }
  return out
}

export const fits = (all: readonly Straw[]): boolean => all.every((s) => s.who !== null)
export const thirsty = (all: readonly Straw[]): number[] => Array.from({ length: FIVE }, (_, i) => i).filter((i) => !all.some((s) => s.who === i))

/** How many sheep have to change halves before this milk fits. */
export function movesTo(bed: Bed, milk: Milk): number {
  const named = milk.filter((b) => b.owner !== null)
  const wrong = named.filter((b) => sideOf(bed.sheep[b.owner!].x) !== b.side).length
  if (!named.length) return Math.abs(bed.sheep.filter((s) => sideOf(s.x) === 'left').length - onShelf(milk, 'left'))
  const side = named[0].side
  const others = bed.sheep.filter((s, i) => sideOf(s.x) === side && !named.some((b) => b.owner === i)).length
  return wrong + Math.abs(others - (onShelf(milk, side) - named.length))
}

/** The most sheep one deal asks over. */
const FAR = 3

/** The next deal: never one that already fits. */
export function deal(bed: Bed, position: string, rng: Rng): { milk: Milk; quilt: Side | null } {
  const left = bed.sheep.filter((s) => sideOf(s.x) === 'left').length
  if (position === 'next-door') {
    const near = [left - 1, left + 1].filter((n) => n > 0 && n < FIVE)
    return { milk: bottles(near[below(rng, near.length)]), quilt: null }
  }
  if (position === 'whose-milk') {
    const n = 1 + below(rng, 2), side = SIDES[below(rng, 2)], on = side === 'left' ? n : FIVE - n
    // Its owner is somebody who has to come over for it.
    const away = bed.sheep.map((_, i) => i).filter((i) => sideOf(bed.sheep[i].x) !== side)
    if (away.length > 0) return { milk: bottles(on, { side, who: [away[below(rng, away.length)]] }), quilt: null }
    const there = side === 'left' ? 'right' : 'left'
    return { milk: bottles(FIVE - on, { side: there, who: [below(rng, FIVE)] }), quilt: null }
  }
  const ways = Array.from({ length: FIVE + 1 }, (_, n) => n).filter((n) => n !== left && Math.abs(n - left) <= FAR)
  const milk = bottles(ways[below(rng, ways.length)])
  return { milk, quilt: position === 'under-the-quilt' ? SIDES[below(rng, 2)] : null }
}
