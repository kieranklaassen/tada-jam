import { HOME, PLACES, type Fit, type Folk } from './tree'

// The grid of the design sheet as rules: what each walker does at each piece,
// fitted either way, and how a walker with somewhere to go finds its way
// through whatever is in the tree. Nothing here changes while the game runs,
// so what a child finds out about a walker stays true.

/** The seven kinds of piece, in the order they lie in the basket. */
export const KINDS = ['plank', 'ladder', 'bridge', 'bucket', 'swing', 'lanterns', 'slide'] as const
export type Kind = (typeof KINDS)[number]

/** How a piece is drawn in the basket: the fit that is its ordinary use. */
export const OWN_FIT: Record<Kind, Fit> = { plank: 'span', ladder: 'rise', bridge: 'span', bucket: 'rise', swing: 'span', lanterns: 'span', slide: 'rise' }

/** What is in the tree: for each place a kind or nothing, and for a bucket which end it rests at (0 is `pa`). */
export type Tree = { places: readonly (Kind | null)[]; lifts: readonly (0 | 1)[] }

/**
 * How a meeting ends. `across`: the walker gets over and goes on. `stay`: it
 * tries, and stays on the side it came from. `carry`: it waits to be carried,
 * which only the child can do, by sending the bucket.
 */
export type Meeting = 'across' | 'stay' | 'carry'

/** `up` is whether the walker is going up a rise; on a span it is not read. */
export function meet(folk: Folk, kind: Kind, fit: Fit, up: boolean): Meeting {
  const rise = fit === 'rise'
  switch (kind) {
    case 'plank':
      // A plank on a rise is a ramp: the squirrel and the twins get up it, the beetle and the owl only come down it.
      return !rise || folk === 'squirrel' || folk === 'mice' || !up ? 'across' : 'stay'
    case 'ladder':
      return folk === 'owl' ? 'stay' : 'across'
    case 'bridge':
      if (folk === 'squirrel') return 'across'
      return !rise && folk === 'beetle' ? 'across' : 'stay'
    case 'bucket':
      return folk === 'squirrel' ? 'across' : 'carry'
    case 'swing':
      return rise && folk === 'squirrel' ? 'across' : 'stay'
    case 'lanterns':
      return folk === 'squirrel' ? 'across' : 'stay'
    case 'slide':
      if (rise) return folk === 'squirrel' || !up ? 'across' : 'stay'
      return folk === 'owl' ? 'stay' : 'across'
  }
}

/** Where a walker is going: nowhere, to its own door, or to try the piece in a place. */
export type Errand = 'none' | 'home' | number

/** One piece on a walker's way: the place, and whether it is crossed from `pa` to `pb`. */
export type Step = { place: number; forward: boolean }

/**
 * The shortest way through the pieces that are in the tree: to the walker's
 * door, or over the piece it is going to try. Empty when the walker is
 * already there, null when no way exists. With `own` it is the shortest way
 * the walker gets all the way along by its own taste, past no piece that
 * stops it (a bucket it waits for does not stop it; the piece it is going to
 * try may do anything); with `'crossing'`, past pieces it crosses only, with
 * no bucket to wait for; without, the shortest way whoever the pieces suit.
 */
export function wayTo(from: number, errand: Errand, folk: Folk, tree: Tree, own: boolean | 'crossing' = false): Step[] | null {
  if (errand === 'none') return []
  const target = errand === 'home' ? null : PLACES[errand]
  if (target && !tree.places[errand as number]) return []
  const arrived = (landing: number): boolean => (target ? landing === target.from || landing === target.to : landing === HOME[folk].landing)
  // Breadth first, places in their fixed order, so the same tree always gives the same way.
  const came = new Map<number, { back: number; step: Step } | null>([[from, null]])
  const queue = [from]
  let end = -1
  while (queue.length > 0) {
    const here = queue.shift()!
    if (arrived(here)) { end = here; break }
    PLACES.forEach((place, index) => {
      if (!tree.places[index] || (target && index === errand)) return
      const next = place.from === here ? place.to : place.to === here ? place.from : -1
      if (next < 0 || came.has(next)) return
      if (own) {
        const how = meet(folk, tree.places[index]!, place.fit, place.from === here)
        if (how === 'stay' || (own === 'crossing' && how !== 'across')) return
      }
      came.set(next, { back: here, step: { place: index, forward: place.from === here } })
      queue.push(next)
    })
  }
  if (end < 0) return null
  const steps: Step[] = []
  for (let at = end, link = came.get(at); link; at = link.back, link = came.get(at)) steps.unshift(link.step)
  if (target) steps.push({ place: errand as number, forward: target.from === end })
  return steps
}

/**
 * The way a walker takes. Where a way leads all the way that it can use, it
 * takes the shortest such, however long: a way round a piece that stops it.
 * Where none does, it takes the shortest way whoever the pieces suit, and
 * stays in front of the first piece that stops it. Following either from
 * landing to landing never turns back: each step leaves a shorter way of the
 * same kind.
 */
export function routeTo(from: number, errand: Errand, folk: Folk, tree: Tree): Step[] | null {
  return wayTo(from, errand, folk, tree, true) ?? wayTo(from, errand, folk, tree)
}

/** What the walker does at one step of its way. */
export function meetStep(folk: Folk, step: Step, tree: Tree): Meeting {
  const place = PLACES[step.place]
  return meet(folk, tree.places[step.place]!, place.fit, step.forward)
}

/**
 * Where a walk ends, worked out before it is walked: the landing the walker
 * reaches or has to stay on, and the errand it still has there. A walker that
 * arrives has none; one that stays or waits keeps it.
 * `met` collects the places whose pieces it tries on the way. `shut` names
 * the buckets somebody sits in: nobody else gets past one until the child
 * sends it, so a walker whose way goes by it waits there with its errand.
 */
export function walkEnd(folk: Folk, from: number, errand: Errand, tree: Tree, met?: Set<number>, shut?: ReadonlySet<number>): { at: number; errand: Errand } {
  let at = from
  // Each landing is passed at most once on a shortest way, so this ends.
  for (let guard = 0; guard < PLACES.length + 2; guard++) {
    const way = routeTo(at, errand, folk, tree)
    if (way === null) return { at, errand }
    if (way.length === 0) return { at, errand: 'none' }
    const step = way[0]
    const how = meetStep(folk, step, tree)
    if (shut?.has(step.place)) return { at, errand }
    met?.add(step.place)
    if (how !== 'across') return { at, errand }
    at = step.forward ? PLACES[step.place].to : PLACES[step.place].from
    if (typeof errand === 'number' && step.place === errand) return { at, errand: 'none' }
  }
  return { at, errand }
}

/**
 * Where a walker comes to rest when it has more than one thing to do: the
 * errand it is on, a newer piece it has been given to try when that is done
 * (`next`), and an older errand it left standing to go and try a piece
 * (`back`). It turns to the newer piece when its errand is done or stops
 * it, and takes the older errand up again after that. At rest it has one
 * errand or none, which is what is saved.
 */
export function restOf(folk: Folk, from: number, errand: Errand, next: Errand, back: Errand, tree: Tree, shut?: ReadonlySet<number>): { at: number; errand: Errand } {
  let at = from
  const met = new Set<number>()
  for (let guard = 0; guard < 4; guard++) {
    const end = walkEnd(folk, at, errand, tree, met, shut)
    at = end.at
    const kept = end.errand !== 'none'
    // A newer piece that lay on its way has been tried in passing.
    if (typeof next === 'number' && met.has(next)) next = 'none'
    if (next !== 'none') {
      if (kept && back === 'none') back = errand
      errand = next
      next = 'none'
    } else if (back !== 'none') {
      errand = back
      back = 'none'
    } else return end
  }
  return { at, errand }
}
