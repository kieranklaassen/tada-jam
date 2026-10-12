import { CELLS, type Cell, type Form } from './cells'
import { SEESAW_LOW, SEESAW_MIDDLE, SEESAW_PAST, SEESAW_SHIFT, SEESAW_SITS, SLIDE_SHIFT } from './lie'
import { BODY, FOUND, HOLLOW, carries, ceilingY, groundY, type Kind, type Support } from './kinds'

// The resting rule, with no drawing and no time in it. A thing let go over
// the hollow drops straight down and comes to rest on what is below it, and
// what it rests on says which cell of the grid it is. The house is a list of
// things at rest in the order they came to rest, and the same list set down
// again in the same order gives the same house: that is how a save is read.

/** A thing at rest in the hollow. */
export type Rested = {
  id: number
  kind: Kind
  /** Where along the hollow it lies as the save keeps it: where it was let go, or, where it came to rest somewhere else (it slid aside, came down on the thing beside it, or leans to its other side), a place that gives that same rest again. */
  dropX: number
  /** Where its middle lies, and its underside. */
  x: number
  y: number
  /** The room it takes as it lies: the cell's, but for a snapped twig, which is half as long, and a leaf on a pebble with no room to lean. */
  w: number
  h: number
  on: Support
  /** The things it rests on: none on the ground, one or two otherwise. */
  under: readonly number[]
  /** The side it was set down on, for a cell that leans: -1 left of its support, 1 right. */
  side: -1 | 1
  cell: Cell
  /** How it is drawn: the cell's form, but for a leaf on a pebble that has no room to lean to the ground and lies flat on the stone. */
  lies: Form
  /** A twig the fat one has snapped. */
  snapped: boolean
  /** How far a see-saw leans down to its far end, in radians. Nothing else has one. */
  lean?: number
  /**
   * For a thing on a see-saw that is tipped, and for what lies on such a thing: how far along the slab from the stone
   * it lies (negative to the left), and the slope it lies on, in radians (positive runs down to the right).
   */
  along?: number
  tilt?: number
  /** Only on what `settle` gives back: this thing, set on the high end of a see-saw, tips that end down. `joined` turns the slab over. */
  flips?: true
  /**
   * Only on what `settle` gives back for a thing that slid aside: where it first touched down, before it slid to
   * where it lies. It is how the slide is shown, and no part of how the thing lies.
   */
  aside?: { x: number; y: number }
  /**
   * Only on what `settle` gives back for a thing let go under another: the list that says the house with this thing
   * in it. The thing comes in it before what is over it, so that the list set down again in its order has it on the
   * ground there and the other over it.
   */
  said?: readonly Laid[]
}

/** Why a thing could not rest: its middle was set on a kind that carries nothing, it would stand higher than the arch, or there is no free place for it (`out`). */
export type Shed = { shedBy: 'leaf' | 'cap' | 'feather' | 'arch' | 'out'; x: number; y: number }

export const topOf = (r: Rested): number => r.y - r.h

/** Tops this close in height count as one level, so a thing can lie across two of them. */
const LEVEL = 10
/** How much of a thing's width may lie over another before the two are in each other's way. */
const GRIP = 6
/** How far up a thing may slide: over the lip of what it touches, and no higher. */
const CLIMB = 12
/** How finely the nearest free place is looked for. */
const SLIDE_STEP = 1
/** How far the sides of a parasol hang below the tip it sits on. */
const PARASOL_HANG = 20
/** How far a thing's upper corner may reach into the rim of the arch. */
const ARCH_GRACE = 12

/** A thing whose underside is this far above where another is let go is over it: no part of what that one falls onto. */
const OVER = 1
/** The room a thing has to leave under what it goes under: one that would only just touch it does not fit there. */
const HEADROOM = 4

const NONE: ReadonlySet<number> = new Set()

function clamp(value: number, low: number, high: number): number {
  return low > high ? (low + high) / 2 : Math.min(high, Math.max(low, value))
}

/** Whether two things take some of the same room: side by side by more than a grip, and one not wholly above the other. */
function inEachOther(a: { x: number; y: number; w: number; h: number; under?: readonly number[]; along?: number }, b: Rested): boolean {
  const beside = b.x + b.w / 2 > a.x - a.w / 2 + GRIP && b.x - b.w / 2 < a.x + a.w / 2 - GRIP
  // Two things on one see-saw lie on one face, whatever its slope: they are in each other's way wherever they share its length.
  if (beside && a.under !== undefined && a.under.length === 1 && b.under.length === 1 && a.under[0] === b.under[0] && (a.along !== undefined || b.along !== undefined)) return true
  return beside && topOf(b) < a.y - 1 && b.y > a.y - a.h + 1
}

/** Everything a thing lies on, down to the ground. */
function allBelow(house: readonly Rested[], under: readonly number[]): Set<number> {
  const all = new Set<number>()
  const add = (ids: readonly number[]): void => {
    for (const id of ids) {
      if (all.has(id)) continue
      all.add(id)
      const rest = house.find((r) => r.id === id)
      if (rest) add(rest.under)
    }
  }
  add(under)
  return all
}

/** To the tenth of a unit a save keeps, so the house read back is the house that was left. */
const tenth = (value: number): number => Math.round(value * 10) / 10

/**
 * A thing let go at `from`, with no sliding: how it lies there with nothing in its way, how it is shed there, or
 * what it would lie on and what is in its way.
 */
function asLetGo(house: readonly Rested[], id: number, kind: Kind, from: number, isSnapped: boolean, level?: number): { lies: Rested; first?: Rested; blocker?: Rested } | { shed: Shed } | { first: Rested; blocker: Rested } {
  let aim = from
  let first: Rested | null = null, blocker: Rested | null = null
  for (let tries = 0; tries < 6; tries++) {
    const result = place(house, id, kind, aim, from, isSnapped, level)
    if (!isRested(result)) {
      // Its middle is over something that carries nothing, or it would stand up into the arch: it is shed there.
      if (tries === 0) return { shed: result }
      break
    }
    first ??= result
    // Where it would lie it may run into a thing its middle was not over.
    const inTheWay = house.filter((o) => o.id !== id && !result.under.includes(o.id) && inEachOther(result, o))
    // It lies there: as it was let go, or come down on the thing that was in its way.
    if (inTheWay.length === 0) {
      if (first === result || !blocker) return { lies: result }
      // What the save holds is then the place it came down on: let go there it lies the same with no thing beside it
      // to come down from, so it lies the same whatever else is carried off later.
      for (const at of [aim, tenth(result.x), tenth(result.x - result.side), tenth(result.x + result.side)]) {
        const again = place(house, id, kind, at, at, isSnapped, level)
        if (isRested(again) && sameRest(again, result) && again.under.join() === result.under.join()) return { lies: again, first, blocker }
      }
      return { lies: result, first, blocker }
    }
    blocker = inTheWay.reduce((a, b) => (topOf(b) < topOf(a) ? b : a))
    // A thing that carries: that is what it comes down on. Anything else it slides away from, and so it does from
    // a thing it was let go under: it never goes up through that.
    if (!carries(blocker.kind) || (level !== undefined && blocker.y <= level - OVER)) break
    aim = tenth(blocker.x)
  }
  if (!first || !blocker) return { shed: { shedBy: 'out', x: from, y: groundY(clamp(from, HOLLOW.left, HOLLOW.right)) } }
  return { first, blocker }
}

/** Whether a thing let go at `x` lies there as it is let go: on the ground or on what its middle is over, with nothing in its way and no sliding. */
export function liesAsLetGo(house: readonly Rested[], id: number, kind: Kind, x: number, snapped: ReadonlySet<number> = NONE): Rested | null {
  const tried = asLetGo(house, id, kind, tenth(x), snapped.has(id))
  return 'lies' in tried ? tried.lies : null
}

/**
 * Where a thing let go at `x` first touches when it does not lie there as it is let go: straight below where it was
 * let go, at the height of what is in its way or of what sheds it. From there it comes down on the thing in its way,
 * slides aside or goes home. Null where it lies as it is let go.
 */
export function touchAt(house: readonly Rested[], id: number, kind: Kind, x: number, snapped: ReadonlySet<number> = NONE): { x: number; y: number } | null {
  const from = tenth(x)
  const tried = asLetGo(house, id, kind, from, snapped.has(id))
  if ('shed' in tried) return { x: tried.shed.x, y: tried.shed.y }
  const half = BODY[kind].w / 2, middle = clamp(from, HOLLOW.left + half, HOLLOW.right - half)
  if (tried.first && tried.blocker) return { x: middle, y: Math.min(tried.first.y, topOf(tried.blocker)) }
  // It lies on what its middle half is over, a little to the side of where it was let go: it touches there and settles onto it.
  return 'lies' in tried && Math.abs(tried.lies.x - middle) > 0.5 ? { x: middle, y: tried.lies.y } : null
}

/**
 * Where a thing of `kind` let go at `x` comes to rest among `house`, or how it
 * is shed. Nothing in `house` is changed. `snapped` names the twigs that are
 * snapped: such a twig is half as long.
 *
 * A thing is shed only by what it touches, where it touches it: a leaf, an
 * acorn cap or a feather its very middle is over, or the arch. Where it would
 * lie in the way of a thing its middle is not over, it comes down on that
 * thing if it carries, and otherwise comes to rest in the nearest free place
 * it can slide to without crossing another thing. Only where there is none
 * does it go home.
 *
 * `fromY` is the height its underside was let go at. What lies wholly above that is over the thing, and no part
 * of what it falls onto: let go under a roof it goes under it when it fits there, and lies on the ground. Where it
 * does not fit it slides to the nearest free place at its own height, and is never set on top through the roof.
 * Without `fromY` it is let go from above everything, which is how a list is set down again.
 */
export function settle(house: readonly Rested[], id: number, kind: Kind, x: number, snapped: ReadonlySet<number> = NONE, fromY?: number): Rested | Shed {
  const plain = settleFrom(house, id, kind, x, snapped)
  if (fromY === undefined) return plain
  const level = Math.min(fromY, groundY(clamp(tenth(x), HOLLOW.left, HOLLOW.right)))
  if (!house.some((o) => o.id !== id && o.y <= level - OVER)) return plain
  return settleFrom(house, id, kind, x, snapped, level)
}

/** Whether two things lie the same on the same things, slope and all. */
function alike(a: Rested, b: Rested): boolean {
  return sameRest(a, b) && a.under.join() === b.under.join() && a.along === b.along && a.tilt === b.tilt && a.lean === b.lean
}

/**
 * A place found under something is a place only if a list can say it: either the thing let go there from above
 * everything lies the same, or there is a list, with the thing in it before what is over it, that set down again
 * gives the same house with the thing in that place. Null where there is neither.
 */
function sayable(house: readonly Rested[], found: Rested, snapped: ReadonlySet<number>): Rested | null {
  const lain = asLain(found)
  // The first thing that lies over it, be it by no more than an overhanging edge.
  const over = house.findIndex((r) => r.y <= topOf(lain) + LEVEL && r.x + r.w / 2 > lain.x - lain.w / 2 && r.x - r.w / 2 < lain.x + lain.w / 2)
  const fromAbove = settleFrom(house, found.id, found.kind, found.dropX, snapped)
  // With nothing over it, it is last in the list as any thing let go is.
  if (over < 0 && isRested(fromAbove) && alike(fromAbove, found)) return found
  // A thing that turns a see-saw over is set on it from above, and nowhere else.
  if (found.flips) return null
  // With every other thing let go where it was, the thing goes in at the latest point that gives the house, and
  // before whatever lies over it.
  for (let i = over < 0 ? house.length - 1 : over; i >= 0; i--) {
    const said = saidBy([...house.slice(0, i), lain, ...house.slice(i)], lain.id, snapped, false)
    if (said) return { ...found, said }
  }
  // Or it goes in before the first thing that lies over it, and what is let go over it is let go a little aside.
  const said = over < 0 ? null : saidBy([...house.slice(0, over), lain, ...house.slice(over)], lain.id, snapped, true)
  return said ? { ...found, said } : null
}

/**
 * The list that says a house whose things are given in the order they are to be set down: for each thing a place
 * where, let go from above with no sliding, it lies as it does in the house. `aside` lets a thing be let go
 * elsewhere than where the house has it, anywhere along its own width. Null where some thing has no such place.
 */
function saidBy(order: readonly Rested[], added: number, snapped: ReadonlySet<number>, aside: boolean): Laid[] | null {
  let prefix: Rested[] = []
  const said: Laid[] = []
  for (const want of order) {
    const places = [want.dropX]
    if (aside && want.id !== added) {
      places.push(tenth(want.x))
      for (const id of want.under) {
        const support = order.find((r) => r.id === id)
        if (support) places.push(tenth(support.x), tenth(support.x - 1), tenth(support.x + 1))
      }
      for (let by = 2; by <= want.cell.w / 2; by += 2) places.push(tenth(want.dropX - by), tenth(want.dropX + by))
    }
    let hit: Rested | null = null
    for (const x of places) {
      const tried = asLetGo(prefix, want.id, want.kind, x, snapped.has(want.id))
      if ('lies' in tried && alike(tried.lies, want)) {
        hit = tried.lies
        break
      }
    }
    if (!hit) return null
    prefix = joined(prefix, hit)
    said.push({ id: want.id, x: hit.dropX })
  }
  // A see-saw that was turned over on the way is not the house.
  return prefix.every((now, index) => now.id === order[index].id && alike(now, order[index])) ? said : null
}

function settleFrom(house: readonly Rested[], id: number, kind: Kind, x: number, snapped: ReadonlySet<number>, level?: number): Rested | Shed {
  const from = tenth(x), isSnapped = snapped.has(id)
  const place_ = (at: number, dropX: number): Rested | Shed => place(house, id, kind, at, dropX, isSnapped, level)
  const tried = asLetGo(house, id, kind, from, isSnapped, level)
  const half = BODY[kind].w / 2, middle = clamp(from, HOLLOW.left + half, HOLLOW.right - half)
  // Under a thing it fits by its height: with room to spare under whatever lies over it there.
  const fits = (r: Rested): boolean => level === undefined || !house.some((o) => o.id !== id && o.y <= level - OVER && !r.under.includes(o.id)
    && o.x + o.w / 2 > r.x - r.w / 2 + GRIP && o.x - o.w / 2 < r.x + r.w / 2 - GRIP && topOf(o) < r.y - 1 && o.y > topOf(r) - HEADROOM)
  let touch: { x: number; y: number }, away: -1 | 1 = 1
  if ('lies' in tried) {
    if (level === undefined) return tried.lies
    const lies = fits(tried.lies) ? sayable(house, tried.lies, snapped) : null
    if (lies) return lies
    touch = { x: middle, y: Math.max(tried.lies.y, level) }
  } else if ('shed' in tried) return tried.shed
  else {
    // Where it first touches: where it was let go, at the height of what is in its way there. Let go under that,
    // it touches where it was let go.
    const { first, blocker } = tried
    touch = { x: middle, y: level === undefined ? Math.min(first.y, topOf(blocker)) : Math.max(first.y, level) }
    away = first.x >= blocker.x ? 1 : -1
  }
  const inTheWayOf = (r: Rested): Rested[] => house.filter((o) => o.id !== id && !r.under.includes(o.id) && inEachOther(r, o))
  // The nearest free place, away from what is in the way first. It slides there along what it lies on, and it
  // does not cross another thing to get there: a place beyond the middle of a thing it would not rest on is no place.
  // What it began on: every carrier its middle half was over, with what those lie on.
  const over = house.filter((o) => o.id !== id && carries(o.kind) && Math.abs(middle - o.x) <= o.w / 2 + half / 2 && !(level !== undefined && o.y <= level - OVER))
  const began = allBelow(house, over.map((o) => o.id))
  for (let by = SLIDE_STEP; by <= HOLLOW.right - HOLLOW.left; by += SLIDE_STEP) {
    for (const dir of [away, -away] as (-1 | 1)[]) {
      const at = tenth(from + dir * by)
      if (at < HOLLOW.left || at > HOLLOW.right) continue
      const there = place_(at, at)
      // It slides along and down, never up onto a thing.
      if (!isRested(there) || there.y < touch.y - CLIMB || inTheWayOf(there).length > 0 || !fits(there)) continue
      // On its way there it passes the middle of nothing but what it began on and what it ends on. What is over
      // it is not in its way along the ground.
      const on = allBelow(house, there.under)
      if (house.some((o) => o.id !== id && (o.x - middle) * dir > 0.05 && (at - o.x) * dir > 0.05 && !on.has(o.id) && !began.has(o.id) && !(level !== undefined && o.y <= level - OVER))) continue
      const lies = level === undefined ? there : sayable(house, there, snapped)
      if (lies) return { ...lies, aside: touch }
    }
  }
  // No free place: it touches what is in its way where it was let go, and goes home from there.
  return { shedBy: 'out', ...touch }
}

/** One try at `x`: what lies under the thing there, and how it would lie on it. */
function place(house: readonly Rested[], id: number, kind: Kind, x: number, dropX: number, isSnapped: boolean, letGoAt?: number): Rested | Shed {
  const body = BODY[kind]
  // It comes down on what is under its middle: the half of its width about its centre. A thing that carries nothing
  // (a leaf, an acorn cap, a feather) counts only where the very middle is over it: with no more than its edge
  // under the thing, the thing is not shed by it, and slides aside onto free room.
  const under = (mid: number): Rested[] => house.filter((r) => {
    if (r.id === id || topOf(r) >= groundY(mid)) return false
    // What it was let go under is over it, and is not what it comes down on.
    if (letGoAt !== undefined && r.y <= letGoAt - OVER) return false
    const reach = carries(r.kind) ? body.w / 4 : 0
    return r.x + r.w / 2 > mid - reach && r.x - r.w / 2 < mid + reach
  })
  // Inside the walls, it is first tried where it was let go: a thing aimed at a twig on the root step comes down on that twig.
  let at = clamp(x, HOLLOW.left + body.w / 2, HOLLOW.right - body.w / 2)
  let below = under(at)
  if (below.length === 0) {
    // Nothing is there, so it goes to the ground: inside the piece of ground its middle is over.
    const onStep = at < HOLLOW.stepRight
    at = onStep ? clamp(at, HOLLOW.left + body.w / 2, HOLLOW.stepRight - body.w / 2) : clamp(at, HOLLOW.stepRight + body.w / 2, HOLLOW.right - body.w / 2)
    // Near a wall the arch comes down low: a thing that would stand up into it is set down a little further in.
    const groundCell = CELLS[kind].ground
    const top = groundY(at) + groundCell.sink - (isSnapped && groundCell.form === 'upright' ? groundCell.h / 2 : groundCell.h)
    const inward = at < HOLLOW.archX ? 1 : -1
    for (let tries = 0; tries < 40 && ceilingY(at - inward * groundCell.w / 2) > top + ARCH_GRACE; tries++) at += inward * 2
    below = under(at)
  }
  if (below.length === 0) return rested(id, kind, dropX, at, groundY(at), 'ground', [], 1, isSnapped)

  // What already carries one of the others is covered there, and is not a top to rest on.
  const covered = new Set(below.flatMap((r) => r.under))
  const open = below.filter((r) => !covered.has(r.id))
  const level = Math.min(...open.map(topOf))
  const tops = open.filter((r) => topOf(r) <= level + LEVEL).sort((a, b) => Math.abs(a.x - at) - Math.abs(b.x - at) || topOf(a) - topOf(b))
  if (!carries(tops[0].kind)) return { shedBy: tops[0].kind as 'leaf' | 'cap' | 'feather', x: tops[0].x, y: topOf(tops[0]) }

  const nearest = tops[0]
  const on = nearest.kind as Support
  const cell = CELLS[kind][on]
  let side: -1 | 1 = at < nearest.x ? -1 : 1
  if (cell.form === 'ramp') return sloped(slide(house, id, dropX, nearest, side), nearest)
  if (cell.form === 'tipped') return sloped(seesaw(house, id, dropX, nearest, side), nearest)
  // A flag flies to the side it was set down on, and toward the middle of the hollow where the wall is too near for it.
  if (cell.form === 'flag' && ceilingY(nearest.x + side * cell.w) > topOf(nearest)) side = side === 1 ? -1 : 1
  // On the floor close beside the root step it flies away from the step: it never hangs into the step's side.
  if (cell.form === 'flag' && side === -1 && nearest.x >= HOLLOW.stepRight && nearest.x - BODY.feather.w < HOLLOW.stepRight) side = 1

  // Across two tops when it is wide enough to reach both, and otherwise on the nearest alone.
  // The second top is one that carries, has nothing on it, stands as high and is within reach of its other end.
  const taken = new Set(house.flatMap((r) => (r.id === id ? [] : r.under)))
  const second = house
    .filter((r) => r.id !== id && r.id !== nearest.id && carries(r.kind) && !taken.has(r.id) && Math.abs(topOf(r) - topOf(nearest)) <= LEVEL && !(letGoAt !== undefined && r.y <= letGoAt - OVER))
    // A see-saw is no second top, and nothing on one reaches across to another. Nor does what lies on a slope.
    .filter((r) => r.lies !== 'tipped' && nearest.lies !== 'tipped' && r.tilt === undefined && nearest.tilt === undefined)
    .filter((r) => Math.abs(r.x - nearest.x) <= cell.w - 2 * GRIP && Math.abs(r.x - nearest.x) > 1 && Math.abs(r.x - dropX) <= cell.w / 2)
    .sort((a, b) => Math.abs(a.x - dropX) - Math.abs(b.x - dropX))[0]
  let restX: number
  if (second) restX = (nearest.x + second.x) / 2
  else if (nearest.w > cell.w) restX = clamp(at, nearest.x - (nearest.w - cell.w) / 2, nearest.x + (nearest.w - cell.w) / 2)
  else restX = nearest.x
  // A cell that lies along its support, as a stair does, lies to the side it was set down on.
  if (!second && cell.shift > 0) restX = clamp(nearest.x + side * cell.shift * cell.w, HOLLOW.left + cell.w / 2, HOLLOW.right - cell.w / 2)
  // Whatever is set on a tipped see-saw lies on its slope. A thing small enough to sit on an end sits where it was
  // let go: on the low end as it finds it, over the stone, or on the high end, which it tips down, as a see-saw
  // does, where the slab has room to tip that way and its other end is not held down by a thing of its own. A
  // wider thing lies along the slab, on the middle of it, and tips it the same way when it is let go on the high end.
  let onSlab: { along: number; tilt: number; y: number; flips: boolean } | null = null
  if (nearest.lies === 'tipped') {
    const lean = nearest.lean ?? 0, stoneX = nearest.x - nearest.side * SEESAW_SHIFT * Math.cos(lean)
    const end: -1 | 0 | 1 = Math.abs(at - stoneX) <= SEESAW_MIDDLE ? 0 : at < stoneX ? -1 : 1
    let low = nearest.side, flips = false
    const stone = house.find((r) => r.id === nearest.under[0])
    if (end !== 0 && end !== low && stone && !house.some((r) => r.id !== id && r.under[0] === nearest.id && r.along !== undefined && r.along !== 0)) {
      const above = new Set([id, nearest.id, ...house.filter((r) => allBelow(house, r.under).has(nearest.id)).map((r) => r.id)])
      if (tippedTo(house, nearest.id, nearest.dropX, stone, end, above)) {
        low = end
        flips = true
      }
    }
    // The high end is the short one: a thing that stays up on it lies as far out as the slab reaches under it.
    const high = Math.max(0, CELLS.bark.pebble.w / 2 - SEESAW_SHIFT - cell.w / 2 + SEESAW_PAST)
    const along = cell.w > SEESAW_SITS ? low * SEESAW_SHIFT : end * (end === low ? SEESAW_LOW : high)
    // Where it lies is measured square to the slab as the slab will lie: on its upper face, `along` it from the stone.
    const face = onFace({ ...nearest, side: low, x: stoneX + low * SEESAW_SHIFT * Math.cos(lean) }, along, cell.sink)
    restX = face.x
    onSlab = { along, tilt: low * lean, y: face.y, flips }
  }
  // A roof over one standing twig alone is a parasol: its middle sits on the tip and its two sides hang down round it.
  const hangs = cell.form === 'tent' && !second && nearest.lies === 'upright' ? PARASOL_HANG : 0
  const y = onSlab?.y ?? Math.min(topOf(nearest), second ? topOf(second) : Infinity) + cell.sink + hangs
  let lain = rested(id, kind, dropX, restX, y, on, second ? [nearest.id, second.id] : [nearest.id], side, isSnapped)
  if (onSlab) lain = { ...lain, along: onSlab.along, tilt: onSlab.tilt, ...(onSlab.flips ? { flips: true as const } : {}) }
  else if (!second) lain = sloped(lain, nearest)
  // Moss across two twig tops is slung between them and sags in the middle; on one it sits as a little tree.
  if (kind === 'moss' && on === 'twig' && second) lain = { ...lain, lies: 'slung' }
  if (topOf(lain) < ceilingY(restX) + 4) return { shedBy: 'arch', x: restX, y: topOf(lain) }
  return lain
}

/**
 * A thing set on one that lies on a slope lies on that slope too, where it was set along it. What hangs from a tip
 * (a bell, a flag) hangs plumb, from the tip where the leaning mast has it.
 */
function sloped(lain: Rested, nearest: Rested): Rested {
  if (nearest.tilt === undefined || lain.under.length !== 1) return lain
  if (hangs(lain)) return { ...lain, ...onSlope(nearest, lain.x - nearest.x, lain.y - topOf(nearest)) }
  return { ...lain, ...onSlope(nearest, lain.x - nearest.x, lain.y - topOf(nearest)), along: (nearest.along ?? 0) + lain.x - nearest.x, tilt: nearest.tilt }
}

/** Whether a thing hangs from the tip of what it is on: a bell, a flag. */
const hangs = (r: Rested): boolean => r.lies === 'hung' || r.lies === 'flag'

/** A point on the upper face of a tipped slab, which turns about the top of its stone: `along` the slab from there, and `lift` below the face. */
function onFace(slab: Rested, along: number, lift: number): { x: number; y: number } {
  const lean = slab.lean ?? 0, tilt = slab.side * lean, thick = CELLS.bark.ground.h
  const stoneX = slab.x - slab.side * SEESAW_SHIFT * Math.cos(lean), stoneTop = topOf(slab) + thick
  return { x: stoneX + along * Math.cos(lean) + thick * Math.sin(tilt), y: stoneTop + along * Math.sin(tilt) - thick * Math.cos(lean) + lift }
}

/** A point on the upper face of a thing that lies on a slope: `along` it from its middle, and `lift` below the face. */
function onSlope(nearest: Rested, along: number, lift: number): { x: number; y: number } {
  const tilt = nearest.tilt ?? 0
  return { x: nearest.x + nearest.h * Math.sin(tilt) + along * Math.cos(tilt), y: nearest.y - nearest.h * Math.cos(tilt) + along * Math.sin(tilt) + lift }
}

/**
 * A leaf on a pebble is a slide: it leans from the top of the stone to the
 * ground beside it, to the side it was set down on, or to the other side
 * where that one has no room. Where the stone leaves no side at all down to
 * the ground (it stands on something, or a wall is too near on both sides)
 * the leaf lies flat on the stone. Where it is only other things that take
 * the room on both sides, it is in their way, and comes to rest as a thing
 * in the way does.
 *
 * Leaning to the other side, it is saved as let go on that side, so that it
 * leans the same way whatever is carried off beside it later.
 */
function slide(house: readonly Rested[], id: number, dropX: number, stone: Rested, side: -1 | 1): Rested {
  const cell = CELLS.leaf.pebble
  let inWay: Rested | null = null
  if (stone.on === 'ground') {
    const ground = groundY(stone.x)
    for (const to of [side, -side] as (-1 | 1)[]) {
      const x = stone.x + to * SLIDE_SHIFT
      const leftWall = stone.x < HOLLOW.stepRight ? HOLLOW.left : HOLLOW.stepRight
      const rightWall = stone.x < HOLLOW.stepRight ? HOLLOW.stepRight : HOLLOW.right
      if (x - cell.w / 2 < leftWall || x + cell.w / 2 > rightWall) continue
      const lain: Rested = { id, kind: 'leaf', dropX: to === side ? dropX : tenth(stone.x + to), x, y: ground, w: cell.w, h: cell.h, on: 'pebble', under: [stone.id], side: to, cell, lies: 'ramp', snapped: false }
      if (house.some((r) => r.id !== id && r.id !== stone.id && inEachOther(lain, r))) {
        inWay ??= lain
        continue
      }
      return lain
    }
  }
  if (inWay) return inWay
  const flat = CELLS.leaf.ground
  return { id, kind: 'leaf', dropX, x: stone.x, y: topOf(stone) + 4, w: BODY.leaf.w, h: flat.h, on: 'pebble', under: [stone.id], side, cell, lies: 'flat', snapped: false }
}

/**
 * A slab on a pebble is a see-saw: it lies with its middle a little to the side it was set down on, and tips
 * to that end, the one further from the stone, until the end touches the ground. Where that side has no room
 * down to the ground it tips to the other. Where the stone leaves no side at all (it stands on something, or a
 * wall or the arch is too near on both sides) it lies level on the stone. Where it is only other things that take
 * the room on both sides, it is in their way, and comes to rest as a thing in the way does.
 *
 * Tipped to the other side, it is saved as let go on that side, so that it lies the same whatever is carried off later.
 */
function seesaw(house: readonly Rested[], id: number, dropX: number, stone: Rested, side: -1 | 1): Rested {
  const cell = CELLS.bark.pebble, slab = CELLS.bark.ground
  for (const to of [side, -side] as (-1 | 1)[]) {
    const lain = tippedTo(house, id, to === side ? dropX : tenth(stone.x + to), stone, to, new Set([id]))
    if (lain) return lain
  }
  for (const to of [side, -side] as (-1 | 1)[]) {
    const lain = tippedTo(house, id, dropX, stone, to, new Set([id]), true)
    if (lain) return lain
  }
  return { id, kind: 'bark', dropX, x: stone.x, y: topOf(stone), w: cell.w, h: slab.h, on: 'pebble', under: [stone.id], side, cell, lies: 'whole', snapped: false }
}

/** A slab on a stone, tipped down to one side, or null where it has no room to lie so. `apart` names what is not in its way: itself and what lies on it. */
function tippedTo(house: readonly Rested[], id: number, dropX: number, stone: Rested, to: -1 | 1, apart: ReadonlySet<number>, amongThings = false): Rested | null {
  if (stone.on !== 'ground') return null
  const cell = CELLS.bark.pebble, slab = CELLS.bark.ground
  const rise = groundY(stone.x) - topOf(stone)
  const arm = cell.w / 2 + SEESAW_SHIFT
  const lean = Math.asin(Math.min(0.9, rise / arm))
  const leftWall = stone.x < HOLLOW.stepRight ? HOLLOW.left : HOLLOW.stepRight
  const rightWall = stone.x < HOLLOW.stepRight ? HOLLOW.stepRight : HOLLOW.right
  const x = stone.x + to * SEESAW_SHIFT * Math.cos(lean), w = cell.w * Math.cos(lean)
  if (x - w / 2 < leftWall || x + w / 2 > rightWall) return null
  // Its room is from the ground its low end stands on up to its upper face over the stone, where a thing set on it lies.
  const h = rise + slab.h
  const lain: Rested = { id, kind: 'bark', dropX, x, y: groundY(stone.x), w, h, on: 'pebble', under: [stone.id], side: to, cell, lies: 'tipped', snapped: false, lean }
  // Its high end stands a little higher than that, and has to be under the arch.
  if (topOf(lain) - (cell.w / 2 - SEESAW_SHIFT) * Math.sin(lean) < ceilingY(x - to * w / 2) + 4) return null
  // `amongThings` asks only whether the stone, the walls and the arch leave it room: other things may be in its way.
  if (!amongThings && house.some((r) => !apart.has(r.id) && r.id !== stone.id && inEachOther(lain, r))) return null
  return lain
}

/**
 * The house with a thing that has come to rest added to it. A thing set on the high end of a see-saw tips that end
 * down: the slab is turned over under it. Every list of things at rest is made through here, so the house a save
 * gives back is the house that was left.
 */
export function joined(house: readonly Rested[], rest: Rested): Rested[] {
  const { aside: _aside, flips, said, ...lain } = rest
  // Let go under a thing, it goes into the list before that thing: the house is what lay there, in the order of the
  // list that says it, each thing let go where that list has it.
  if (said) {
    return said.flatMap(({ id, x }) => {
      const was = id === lain.id ? lain : house.find((r) => r.id === id)
      return was ? [was.dropX === x ? was : { ...was, dropX: x }] : []
    })
  }
  if (!flips) return [...house, lain]
  const slab = house.find((r) => r.id === lain.under[0]), stone = slab && house.find((r) => r.id === slab.under[0])
  const above = new Set([lain.id, lain.under[0], ...house.filter((r) => slab !== undefined && allBelow(house, r.under).has(slab.id)).map((r) => r.id)])
  const turned = slab && stone ? tippedTo(house, slab.id, slab.dropX, stone, slab.side === 1 ? -1 : 1, above) : null
  if (!turned) return [...house, lain]
  // What lay on it over the stone lies on its slope the other way, and so does what lies on that.
  const now = new Map<number, Rested>([[turned.id, turned]])
  for (const r of house) {
    const was = house.find((o) => o.id === r.under[0]), under = now.get(r.under[0])
    if (r.id === turned.id || !was || !under) continue
    // What hangs from a tip hangs from it where the mast leans now.
    if (r.tilt === undefined) {
      if (hangs(r) && was.tilt !== undefined) {
        // How far along the thing it hangs from, measured on its slope as it was.
        const along = (r.x - was.x - was.h * Math.sin(was.tilt)) / Math.cos(was.tilt)
        now.set(r.id, { ...r, ...onSlope(under, along, r.y - onSlope(was, along, 0).y) })
      }
      continue
    }
    if (was.id === turned.id) now.set(r.id, { ...r, ...onFace(turned, r.along ?? 0, r.cell.sink), tilt: -r.tilt })
    else if (was.tilt !== undefined) {
      const along = (r.along ?? 0) - (was.along ?? 0)
      now.set(r.id, { ...r, ...onSlope(under, along, r.y - onSlope(was, along, 0).y), tilt: under.tilt })
    }
  }
  return [...house.map((r) => now.get(r.id) ?? r), lain]
}

function rested(id: number, kind: Kind, dropX: number, x: number, y: number, on: Support, under: readonly number[], side: -1 | 1, isSnapped: boolean): Rested {
  const cell = CELLS[kind][on]
  // A snapped twig is half as long: half as tall where it stands, half as wide where it lies.
  const stands = cell.form === 'upright'
  const w = isSnapped && !stands ? cell.w / 2 : cell.w, h = isSnapped && stands ? cell.h / 2 : cell.h
  return { id, kind, dropX, x, y: on === 'ground' ? y + cell.sink : y, w, h, on, under, side, cell, lies: cell.form, snapped: isSnapped }
}

/** A thing as it lies in the house: without the notes of how it got there. */
export function asLain(rest: Rested): Rested {
  const { aside: _aside, flips: _flips, said: _said, ...lain } = rest
  return lain
}

export function isRested(result: Rested | Shed): result is Rested {
  return 'cell' in result
}

/** What goes up with a thing that is lifted: everything that rests on it alone, and on those. In the order it came to rest. */
export function carriedWith(house: readonly Rested[], id: number): Rested[] {
  const lifted = new Set([id])
  for (let grew = true; grew; ) {
    grew = false
    for (const r of house) {
      if (!lifted.has(r.id) && r.under.length > 0 && r.under.every((u) => lifted.has(u))) {
        lifted.add(r.id)
        grew = true
      }
    }
  }
  return house.filter((r) => lifted.has(r.id))
}

/** Whether two rests are the same lie on the same supports, so that nothing has to move. */
export function sameRest(a: Rested, b: Rested): boolean {
  return a.x === b.x && a.y === b.y && a.h === b.h && a.w === b.w && a.lies === b.lies && a.on === b.on && a.side === b.side && a.snapped === b.snapped && a.tilt === b.tilt
}

/**
 * The house with some things taken out of it: the list that is left, set down again in its order, so that the
 * house a finger leaves is always the house a save of it gives back. `moved` lists the things that lie otherwise
 * than they did (one that lay across two supports and has lost one, one that reaches a top that is now free, and
 * whatever rested on them); `shed` those that can no longer rest and go back to the forest floor.
 */
export function without(house: readonly Rested[], ids: readonly number[], snapped: ReadonlySet<number> = NONE): { house: Rested[]; moved: Rested[]; shed: { id: number; from: Shed }[] } {
  const gone = new Set(ids)
  let kept: Rested[] = []
  const shed: { id: number; from: Shed }[] = []
  for (const was of house) {
    if (gone.has(was.id)) continue
    let again = settle(kept, was.id, was.kind, was.dropX, snapped)
    // A see-saw whose tipper is carried off swings back only where its end has room to come down. Where a thing has
    // been set since on the ground its end lay on, it stays tipped as it is, and that thing is not moved by it.
    if (isRested(again) && was.lies === 'tipped' && again.lies === 'tipped' && again.side !== was.side) {
      const back = again, stone = house.find((r) => r.id === was.under[0])
      const crossed = house.some((o) => !gone.has(o.id) && o.id !== was.id && !back.under.includes(o.id) && !allBelow(house, o.under).has(was.id) && inEachOther(back, o))
      const stays = crossed && stone ? settle(kept, was.id, was.kind, tenth(stone.x + was.side), snapped) : null
      if (stays && isRested(stays) && stays.lies === 'tipped' && stays.side === was.side) again = stays
    }
    if (isRested(again)) kept = joined(kept, again)
    else shed.push({ id: was.id, from: again })
  }
  const moved = kept.filter((now) => !sameRest(house.find((was) => was.id === now.id)!, now))
  return { house: kept, moved, shed }
}

/** The list a save keeps: each thing's number and where it was let go, or a place that gives the rest it came to, in the order they came to rest. */
export type Laid = { id: number; x: number }

export function laidOf(house: readonly Rested[]): Laid[] {
  return house.map((r) => ({ id: r.id, x: r.dropX }))
}

/** The house a list gives, set down again in its order. A thing that can no longer rest is left on the forest floor, and so is a number named twice. */
export function build(laid: readonly Laid[], snapped: ReadonlySet<number> = NONE): Rested[] {
  let house: Rested[] = []
  for (const { id, x } of laid) {
    const found = FOUND[id]
    if (!found || house.some((r) => r.id === id)) continue
    const result = settle(house, id, found.kind, x, snapped)
    if (isRested(result)) house = joined(house, result)
  }
  return house
}
