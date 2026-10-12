import { goneShare, mend, opening } from './face'
import { CUSHION_COUNT, FIRED, HELD, MAX_TAPES, ON_FLOOR, ON_HEAP, ON_RUG, ON_SOFA, deserializeFort, type FortState } from './fortState'
import { BOX_COUNT, FRONT_Z, GRAN_STAND, MAX_TOP, RUG, STRIP, WORN, kindOf, type Standing, type Vec } from './layout'

// The fort as cardboard: where each box stands given what it rests on, where
// a box that is let go comes to rest, what is a seam, and what happens to
// everything in and on a box that goes back to the heap. Plain rules on the
// saved state, with no clock in them; toy.ts decides when they run and what
// is seen and heard on the way.

/** A box as it stands, seen from the front. A box on its side shows its open end: as wide as it was high, as high as it was deep. */
export type Rect = Standing & { w: number; h: number; side: boolean; on: number }

const EPS = 1e-6

export function rectOf(state: FortState, id: number): Rect | null {
  const box = state.boxes[id]
  if (box.on === ON_HEAP) return null
  const kind = kindOf(id)
  // A box the grandmother wears hangs round her middle.
  let foot = state.gran.at === 'skirt' && state.gran.box === id ? WORN : 0
  // A box rests on at most four others, one above the other.
  for (let below = box.on, depth = 0; below >= 0 && depth < BOX_COUNT; below = state.boxes[below].on, depth++) foot += kindOf(below).h
  return { id, x: box.x / 100, foot, w: box.side ? kind.h : kind.w, h: box.side ? kind.d : kind.h, side: box.side, on: box.on }
}

/** Every box that is not on the heap. */
export function rects(state: FortState): Rect[] {
  return state.boxes.flatMap((box) => rectOf(state, box.id) ?? [])
}

export const topOf = (rect: Rect): number => rect.foot + rect.h

/**
 * The box the grandmother wears, or -1. It is hers until she takes it off: nobody sits on it, goes into it or
 * through its holes, nothing is put on it or in it, and no tape holds it. The scissors still cut it.
 */
export const wornBox = (state: FortState): number => (state.gran.at === 'skirt' ? state.gran.box : -1)
const leftOf = (rect: Rect): number => rect.x - rect.w / 2
const rightOf = (rect: Rect): number => rect.x + rect.w / 2

/** Whether a box rests on this one. */
export function loaded(state: FortState, id: number): boolean {
  return state.boxes.some((box) => box.on === id)
}

/** The highest box, which is where the cat sits and what a pull of the tape end takes. Of two as high, the smaller. */
export function highest(state: FortState): Rect | null {
  let best: Rect | null = null
  const worn = wornBox(state)
  for (const rect of rects(state)) if (rect.id !== worn && (!best || topOf(rect) > topOf(best) + EPS || (Math.abs(topOf(rect) - topOf(best)) <= EPS && rect.id > best.id))) best = rect
  return best
}

/** The box on the rug nearest a place along it: the lowest box, for the one who only crawls. */
export function lowest(state: FortState, x: number): Rect | null {
  let best: Rect | null = null
  const worn = wornBox(state)
  for (const rect of rects(state)) if (rect.on === ON_RUG && rect.id !== worn && (!best || Math.abs(rect.x - x) < Math.abs(best.x - x))) best = rect
  return best
}

export type Seam = { a: number; b: number; at: Vec; /** Between a box and the one it rests on. */ flat: boolean; /** The two ends of the seam, as it is seen from the front. */ ends: readonly [Vec, Vec] }

/** Every place two boxes meet: side by side on the rug with no gap, or one on the other. */
export function seams(state: FortState): Seam[] {
  const worn = wornBox(state), all = rects(state).filter((rect) => rect.id !== worn), found: Seam[] = []
  for (const a of all)
    for (const b of all) {
      if (a.id === b.id) continue
      const z = FRONT_Z + 0.03
      // Stacked, the seam runs the width of the upper box; side by side, from the rug up to the top of the lower of the two.
      if (a.on === b.id) found.push({ a: a.id, b: b.id, at: { x: a.x, y: a.foot, z }, flat: true, ends: [{ x: leftOf(a), y: a.foot, z }, { x: rightOf(a), y: a.foot, z }] })
      else if (a.on === ON_RUG && b.on === ON_RUG && Math.abs(rightOf(a) - leftOf(b)) < 0.005) found.push({ a: a.id, b: b.id, at: { x: rightOf(a), y: Math.min(a.h, b.h) * 0.55, z }, flat: false, ends: [{ x: rightOf(a), y: 0, z }, { x: rightOf(a), y: Math.min(a.h, b.h), z }] })
    }
  return found
}

/** How far a place of the front plane is from a seam: from the nearest point of its whole length. */
export function fromSeam(seam: Seam, at: { x: number; y: number }): number {
  const [p, q] = seam.ends, dx = q.x - p.x, dy = q.y - p.y, along = Math.min(1, Math.max(0, ((at.x - p.x) * dx + (at.y - p.y) * dy) / Math.max(1e-9, dx * dx + dy * dy)))
  return Math.hypot(at.x - (p.x + dx * along), at.y - (p.y + dy * along))
}

export const sameTape = (pair: readonly [number, number], a: number, b: number): boolean => (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)

/** The seam of a strip of tape, or null when the two no longer meet. */
export function seamOf(state: FortState, pair: readonly [number, number]): Seam | null {
  return seams(state).find((seam) => sameTape(pair, seam.a, seam.b)) ?? null
}

/** Everything that moves when this box is moved: what is taped to it and what rests on any of those. */
export function group(state: FortState, id: number): number[] {
  const members = new Set([id])
  for (let grew = true; grew; ) {
    grew = false
    for (const [a, b] of state.tapes) {
      if (members.has(a) !== members.has(b)) { members.add(a); members.add(b); grew = true }
    }
    for (const box of state.boxes) if (box.on >= 0 && members.has(box.on) && !members.has(box.id)) { members.add(box.id); grew = true }
  }
  return [...members]
}

/** A top corner of a box at its face, by its code: the id doubled, plus one for the right corner. */
export function corner(state: FortState, code: number): Vec | null {
  const rect = rectOf(state, code >> 1)
  return rect ? { x: rect.x + (code & 1 ? rect.w / 2 : -rect.w / 2), y: topOf(rect), z: FRONT_Z + 0.02 } : null
}

/** How far past the right wall of the fort the middle of the loose tape end sticks out: the whole of it is beside the box, over no face. */
export const TAB_OUT = 0.19

/** Where the loose end of the tape sticks out: past the lower right corner of the fort. Null when nothing is taped. */
export function tapeEnd(state: FortState): Vec | null {
  if (state.tapes.length === 0) return null
  let right: Rect | null = null
  for (const rect of rects(state)) if (rect.on === ON_RUG && rect.id !== wornBox(state) && (!right || rightOf(rect) > rightOf(right))) right = rect
  return right ? { x: rightOf(right) + TAB_OUT, y: 0.62, z: FRONT_Z + 0.04 } : null
}

type Block = { left: number; right: number }

/** The nearest place to `want` where something `w` wide stands clear of every block; beside a block it is moved flush against it. */
function placeAmong(blocks: readonly Block[], w: number, want: number, flush = true): number | null {
  const low = RUG.left + w / 2, high = RUG.right - w / 2
  if (low > high + EPS) return null
  const fits = (x: number): boolean => x >= low - EPS && x <= high + EPS && blocks.every((block) => x + w / 2 <= block.left + EPS || x - w / 2 >= block.right - EPS)
  const x = Math.min(high, Math.max(low, want))
  const beside = blocks.flatMap((block) => [block.left - w / 2, block.right + w / 2])
  if (fits(x)) {
    if (!flush) return x
    const near = beside.filter((flush) => Math.abs(flush - x) < 0.25 && fits(flush)).sort((p, q) => Math.abs(p - x) - Math.abs(q - x))[0]
    return near ?? x
  }
  const places = [...beside, low, high].filter(fits).sort((p, q) => Math.abs(p - x) - Math.abs(q - x))
  return places.length > 0 ? places[0] : null
}

const rugBlocks = (state: FortState, ignore: readonly number[]): Block[] => rects(state).filter((rect) => rect.on === ON_RUG && !ignore.includes(rect.id)).map((rect) => ({ left: leftOf(rect), right: rightOf(rect) }))

/** How far past the wall of its box the baby's feet reach, and how far from that wall its middle lies. */
export const FEET = { reach: 0.95, out: 0.45 }

/**
 * Which side of a box the baby lies at, behind it with both feet out past that wall: -1 the left, 1 the right,
 * 0 when neither side has room. The left when nothing stands or lies within its reach there; otherwise the
 * right, when that is free and clear of where the grandmother stands up.
 */
export function babySide(state: FortState, id: number): -1 | 0 | 1 {
  const rect = rectOf(state, id)
  if (!rect || rect.on !== ON_RUG) return 0
  if (rect.side) return -1
  const lump = lumpAt(state)
  const blocks = [...rugBlocks(state, [id]), ...(lump === null ? [] : [{ left: lump - LUMP / 2, right: lump + LUMP / 2 }])]
  const clear = (low: number, high: number): boolean => blocks.every((block) => block.right <= low + EPS || block.left >= high - EPS)
  if (clear(leftOf(rect) - FEET.reach, leftOf(rect))) return -1
  if (clear(rightOf(rect), rightOf(rect) + FEET.reach) && rightOf(rect) + FEET.reach <= GRAN_STAND.x - 0.5) return 1
  return 0
}

/** What stands on the rug, and the strip beside its box where the baby's feet lie: nothing is set down on either. */
function boxBlocks(state: FortState, ignore: readonly number[]): Block[] {
  const blocks = rugBlocks(state, ignore)
  if (state.baby >= 0 && !ignore.includes(state.baby)) {
    const rect = rectOf(state, state.baby), side = babySide(state, state.baby)
    if (rect && !rect.side && side < 0) blocks.push({ left: leftOf(rect) - FEET.reach, right: leftOf(rect) })
    if (rect && !rect.side && side > 0) blocks.push({ left: rightOf(rect), right: rightOf(rect) + FEET.reach })
  }
  return blocks
}

/** How wide the blanket lies when it is heaped on the rug. */
export const LUMP = 0.7

/** Where the blanket lies heaped beside the one box it slid off: the middle of the heap along the rug. Null when it is not heaped, or has no room. */
export function lumpAt(state: FortState): number | null {
  // Let go on bare rug it lies where it was let go.
  if (state.blanket.length === 0) return state.lump === null ? null : state.lump / 100
  const rect = state.blanket.length === 1 ? rectOf(state, state.blanket[0]) : null
  if (!rect) return null
  let foot = rect
  while (foot.on >= 0) foot = rectOf(state, foot.on)!
  const blocks = rugBlocks(state, [])
  const places = [rightOf(foot) + LUMP / 2, leftOf(foot) - LUMP / 2].map((want) => placeAmong(blocks, LUMP, want)).filter((place): place is number => place !== null)
  return places.length > 0 ? places.sort((p, q) => Math.abs(p - foot.x) - Math.abs(q - foot.x))[0] : null
}

/**
 * A free place on the rug for something `w` wide, as near `want` as there is one, with `ignore` taken up.
 * A place close beside a box is moved flush against it, which makes a seam; a load leaves a place that is free
 * where it is (`flush` false). Null when the rug is full.
 */
export function free(state: FortState, ignore: readonly number[], w: number, want: number, flush = true): number | null {
  const lump = lumpAt(state)
  return placeAmong([...boxBlocks(state, ignore), ...(lump === null ? [] : [{ left: lump - LUMP / 2, right: lump + LUMP / 2 }])], w, want, flush)
}

/** Where the blanket lies when it is let go over bare rug at `want`: the nearest place in the row of boxes that is free for its heap, or null. */
export function lumpPlace(state: FortState, want: number): number | null {
  return placeAmong(boxBlocks(state, []), LUMP, want, false)
}

/** The strip beside its box where the baby's feet lie, or null. */
export function feetZone(state: FortState): { left: number; right: number } | null {
  const rect = state.baby >= 0 ? rectOf(state, state.baby) : null, side = rect ? babySide(state, rect.id) : 0
  if (!rect || rect.side || side === 0) return null
  return side < 0 ? { left: rect.x - rect.w / 2 - FEET.reach, right: rect.x - rect.w / 2 } : { left: rect.x + rect.w / 2, right: rect.x + rect.w / 2 + FEET.reach }
}

/** After boxes have moved: a heaped blanket that has no room left beside its box is back on the sofa. */
export function settleBlanket(state: FortState): void {
  if (state.blanket.length === 1 && lumpAt(state) === null) state.blanket = []
}

export type Landing = { how: 'stand' | 'tip' | 'back'; /** The box it landed on, or the rug. */ on: number }

const overlap = (rect: Rect, x: number, w: number): number => Math.min(rightOf(rect), x + w / 2) - Math.max(leftOf(rect), x - w / 2)

/**
 * A single box is let go with its middle over `x`, the finger at `finger` along the rug. With the finger over a
 * box that can bear it, it goes onto that box, however low it was carried. Otherwise it stands on the rug, or
 * squarely on the box below; let go half off the box below, or on one too small or too high for it, it tips over
 * the edge and lies on its side. Where the rug has no room for it, it goes onto the nearest box that can bear
 * it. Only when nothing can does it go back where it was, and nothing changes.
 */
export function dropBox(state: FortState, id: number, x: number, finger: number | null = null): Landing {
  const box = state.boxes[id], kind = kindOf(id), worn = wornBox(state)
  const others = rects(state).filter((rect) => rect.id !== id)
  const at = Math.min(RUG.right - kind.w / 2, Math.max(RUG.left + kind.w / 2, x))
  const put = (on: number, where: number, side: boolean): void => { box.on = on; box.x = Math.round(where * 100); box.side = side }
  const higher = (best: Rect, rect: Rect): Rect => (topOf(rect) > topOf(best) + EPS || (Math.abs(topOf(rect) - topOf(best)) <= EPS && Math.abs(rect.x - at) < Math.abs(best.x - at)) ? rect : best)
  /** Stands it squarely on a box that can bear it, as near `want` as that box and what already stands on it allow. */
  const standOn = (below: Rect, want: number): boolean => {
    if (below.side || below.id === worn || kind.w > below.w + EPS || topOf(below) + kind.h > MAX_TOP + EPS) return false
    const slack = (below.w - kind.w) / 2
    const beside = others.filter((rect) => rect.on === below.id)
    const clear = (where: number): boolean => beside.every((rect) => overlap(rect, where, kind.w) <= EPS)
    const wanted = Math.min(below.x + slack, Math.max(below.x - slack, want))
    const places = [wanted, ...beside.flatMap((rect) => [leftOf(rect) - kind.w / 2, rightOf(rect) + kind.w / 2])].filter((where) => Math.abs(where - below.x) <= slack + EPS && clear(where))
    if (places.length === 0) return false
    put(below.id, places.sort((p, q) => Math.abs(p - wanted) - Math.abs(q - wanted))[0], false)
    // A roof over the box below slides off it.
    if (state.blanket.includes(below.id)) state.blanket = [below.id]
    return true
  }
  /** It tips over the edge it hangs over, and lies on its side beside what it fell from. */
  const tips = (below: Rect): boolean => {
    let foot = below
    while (foot.on >= 0) foot = others.find((rect) => rect.id === foot.on)!
    const towards = at >= below.x ? 1 : -1
    for (const way of [towards, -towards]) {
      const place = free(state, [id], kind.h, way > 0 ? rightOf(foot) + kind.h / 2 : leftOf(foot) - kind.h / 2)
      if (place !== null) { put(ON_RUG, place, true); return true }
    }
    return false
  }
  // A box does not go to the far side of the grandmother in the box she wears: it was kept to one side of her while it was carried, and it stays on that side.
  const hers = others.find((rect) => rect.id === worn)
  const across = (rect: Rect): boolean => hers !== undefined && (x - hers.x) * (rect.x - hers.x) < 0
  // The finger is over a box: the highest one there takes it, if it can bear it.
  const pointed = finger === null ? [] : others.filter((rect) => finger >= leftOf(rect) && finger <= rightOf(rect) && !across(rect))
  if (pointed.length > 0) { const onto = pointed.reduce(higher); if (standOn(onto, at)) return { how: 'stand', on: onto.id } }
  const under = others.filter((rect) => overlap(rect, at, kind.w) > 0.1)
  if (under.length === 0) {
    const place = free(state, [id], kind.w, at)
    if (place !== null) { put(ON_RUG, place, false); return { how: 'stand', on: ON_RUG } }
  } else {
    const below = under.reduce(higher)
    if (Math.abs(at - below.x) <= below.w / 2 && standOn(below, at)) return { how: 'stand', on: below.id }
    if (tips(below)) return { how: 'tip', on: ON_RUG }
  }
  // No room there: it goes onto the nearest box that can bear it rather than back.
  for (const rect of [...others].sort((p, q) => Math.abs(p.x - at) - Math.abs(q.x - at))) if (!across(rect) && standOn(rect, at)) return { how: 'stand', on: rect.id }
  return { how: 'back', on: box.on }
}

/** Boxes that are taped together are let go `dx` from where they stood. They stay on the rug; with no room they go back. */
export function dropGroup(state: FortState, ids: readonly number[], dx: number): Landing {
  const feet = ids.map((id) => rectOf(state, id)!).filter((rect) => rect.on === ON_RUG)
  const left = Math.min(...feet.map(leftOf)), right = Math.max(...feet.map(rightOf)), w = right - left
  const place = free(state, ids, w, (left + right) / 2 + dx)
  if (place === null) return { how: 'back', on: ON_RUG }
  const shift = Math.round((place - (left + right) / 2) * 100)
  for (const id of ids) state.boxes[id].x += shift
  return { how: 'stand', on: ON_RUG }
}

/** Whoever is in, at or on one of these boxes is put out of it: the cat and the baby on the rug, the grandmother in her chair. */
export function tipOut(state: FortState, ids: readonly number[]): { cat: boolean; baby: boolean; gran: boolean } {
  const out = { cat: false, baby: false, gran: false }
  const seat = highest(state)
  if (state.cat.at === 'top' ? seat !== null && ids.includes(seat.id) : state.cat.at !== 'rug' && ids.includes(state.cat.box)) { state.cat = { at: 'rug', box: 0, cell: 0 }; out.cat = true }
  if (ids.includes(state.baby)) { state.baby = ON_RUG; out.baby = true }
  if (state.gran.at !== 'chair' && ids.includes(state.gran.box)) { state.gran = { at: 'chair', box: 0 }; out.gran = true }
  return out
}

/**
 * Whoever can no longer be where the save has them is put out: the cat off a box that is no longer the highest,
 * out of a hole that is gone or a box that was folded (in a box that tipped over it sits in the open end); the
 * baby out of a box that left the rug or has no room beside it for its feet; the grandmother out of a box
 * that left the rug or tipped over. Returns who went to the rug or the chair.
 */
export function evict(state: FortState): { cat: boolean; baby: boolean; gran: boolean } {
  const out = { cat: false, baby: false, gran: false }, boxes = state.boxes
  const up = (id: number): boolean => boxes[id].on !== ON_HEAP
  const upright = (id: number): boolean => up(id) && !boxes[id].side
  const cat = state.cat, toRug = (): void => { state.cat = { at: 'rug', box: 0, cell: 0 }; out.cat = true }
  if (cat.at === 'look' || cat.at === 'stuck') {
    const hole = upright(cat.box) ? opening(boxes[cat.box].face, cat.cell) : null
    if (hole) state.cat = { at: cat.at, box: cat.box, cell: hole.cell }
    // In a box that was tipped over it is in the tunnel; behind a face with no hole left in it nobody could find it.
    else if (up(cat.box) && boxes[cat.box].side && cat.box !== wornBox(state)) state.cat = { at: 'in', box: cat.box, cell: 0 }
    else toRug()
  } else if (cat.at === 'in' && !up(cat.box)) toRug()
  if (state.cat.at === 'top' && !highest(state)) toRug()
  if (state.baby >= 0 && !(up(state.baby) && boxes[state.baby].on === ON_RUG && babySide(state, state.baby) !== 0)) { state.baby = ON_RUG; out.baby = true }
  const gran = state.gran
  if (gran.at !== 'chair' && !(upright(gran.box) && boxes[gran.box].on === ON_RUG && (gran.at === 'in' || !loaded(state, gran.box)))) { state.gran = { at: 'chair', box: 0 }; out.gran = true }
  return out
}

/** What was in, on or taped to the box the grandmother wears comes free, and nobody else is in it. */
function shed(state: FortState): void {
  const id = wornBox(state)
  if (id < 0) return
  if ((state.cat.at === 'look' || state.cat.at === 'stuck' || state.cat.at === 'in') && state.cat.box === id) state.cat = { at: 'rug', box: 0, cell: 0 }
  if (state.baby === id) state.baby = ON_RUG
  state.tapes = state.tapes.filter(([a, b]) => a !== id && b !== id)
  state.cushions = state.cushions.map((where) => (where === id ? ON_SOFA : where))
  state.toys = state.toys.map((where) => (where === id ? HELD : where))
  state.blanket = state.blanket.filter((under) => under !== id)
  settleBlanket(state)
  if (state.cat.at === 'top' && !highest(state)) state.cat = { at: 'rug', box: 0, cell: 0 }
}

/** The grandmother comes up inside a box and wears it: whoever was in, at or on it is put out, and what it held comes free. */
export function wear(state: FortState, id: number): { cat: boolean; baby: boolean; gran: boolean } {
  const out = tipOut(state, [id])
  state.gran = { at: 'skirt', box: id }
  shed(state)
  return out
}

/**
 * A box goes back to the heap, where it is folded flat and is fresh board again. What was taped to it comes
 * free, a cushion from it lands on the sofa, a toy from it is back in the baby's hand, the blanket and the
 * lights slip off it, and whoever was in it is out of it.
 */
export function toHeap(state: FortState, id: number): void {
  const box = state.boxes[id]
  tipOut(state, [id])
  state.tapes = state.tapes.filter(([a, b]) => a !== id && b !== id)
  state.cushions = state.cushions.map((where) => (where === id ? ON_SOFA : where))
  state.toys = state.toys.map((where) => (where === id ? HELD : where))
  state.blanket = state.blanket.filter((under) => under !== id)
  state.lights = state.lights.filter((code) => code >> 1 !== id)
  box.on = ON_HEAP
  box.side = false
  mend(box.face)
  // No line waits on board that is folded: whoever folds a box has shut its line first (toy.ts, `closeLine`); a record that holds one all the same loses it here.
  if (state.line?.box === id) state.line = null
  if (state.cat.at === 'top' && !highest(state)) state.cat = { at: 'rug', box: 0, cell: 0 }
  // A blanket left on one box slides off it, and goes back to the sofa when there is no room for it beside that box.
  settleBlanket(state)
}

/** One pull of the loose tape end: one strip comes off, and the highest box goes back to the heap. Returns that box, or null. */
export function pull(state: FortState): number | null {
  const top = highest(state)
  if (state.tapes.length === 0 || !top) return null
  const strips = state.tapes.length
  toHeap(state, top.id)
  if (state.tapes.length === strips) state.tapes.pop()
  return top.id
}

/** How many cushions a box holds before the next one is fired back out. */
export const BOX_HOLDS = 2

/**
 * Settles the fields of a loaded state against each other, so that whatever a record holds, the fort that
 * comes out could have been built: boxes stand on boxes that can bear them, tape lies over seams, and nobody
 * is at a hole that is not there.
 */
export function repair(state: FortState): FortState {
  const { boxes } = state
  for (const box of boxes) {
    const below = box.on >= 0 ? boxes[box.on] : null
    if (box.on >= 0 && (!below || below.on === ON_HEAP || below.side || kindOf(box.id).w > kindOf(below.id).w)) box.on = ON_RUG
    if (box.side && box.on !== ON_RUG) box.side = false
  }
  // A ring of boxes resting on each other, or a stack that is too high, comes down to the rug.
  for (const box of boxes) {
    let below = box.on, depth = 0
    while (below >= 0 && depth <= BOX_COUNT) { below = boxes[below].on; depth++ }
    if (box.on >= 0 && (depth > BOX_COUNT || below === ON_HEAP)) box.on = ON_RUG
  }
  for (const box of boxes) { const rect = rectOf(state, box.id); if (rect && rect.on >= 0 && topOf(rect) > MAX_TOP + EPS) box.on = ON_RUG }
  // On the rug no two boxes share a place; one that finds none is on the heap.
  const placed: number[] = []
  for (const box of boxes) {
    if (box.on !== ON_RUG) continue
    const rect = rectOf(state, box.id)!
    const place = free(state, boxes.filter((other) => !placed.includes(other.id)).map((other) => other.id), rect.w, rect.x, false)
    if (place === null) { box.on = ON_HEAP; box.side = false } else { box.x = Math.round(place * 100); placed.push(box.id) }
  }
  // What rested on a box that went to the heap goes with it, however many storeys.
  for (let pass = 0; pass < BOX_COUNT; pass++) for (const box of boxes) if (box.on >= 0 && boxes[box.on].on === ON_HEAP) { box.on = ON_HEAP; box.side = false }
  for (const box of boxes) {
    if (box.on < 0) continue
    const below = rectOf(state, box.on)!, slack = (below.w - kindOf(box.id).w) / 2
    box.x = Math.round(Math.min(below.x + slack, Math.max(below.x - slack, box.x / 100)) * 100)
  }
  const up = (id: number): boolean => boxes[id].on !== ON_HEAP
  const upright = (id: number): boolean => up(id) && !boxes[id].side
  const meet = seams(state), tapes: [number, number][] = []
  for (const pair of state.tapes) if (tapes.length < MAX_TAPES && meet.some((seam) => sameTape(pair, seam.a, seam.b)) && !tapes.some((kept) => sameTape(kept, pair[0], pair[1]))) tapes.push(pair)
  state.tapes = tapes
  state.blanket = [...new Set(state.blanket)].filter(upright)
  // A roof lies over two bare lids, as it is thrown: with a box standing on either lid it would lie inside that box, so it has slid off the first.
  if (state.blanket.length === 2 && state.blanket.some((under) => loaded(state, under))) state.blanket = [state.blanket[0]]
  settleBlanket(state)
  const held = new Map<number, number>()
  state.cushions = Array.from({ length: CUSHION_COUNT }, (_, i) => {
    const where = state.cushions[i]
    if (where < 0) return where
    if (!upright(where) || where === wornBox(state)) return ON_SOFA
    // No cushion is in a box with no hole in it, where it could not be seen: it lies on the rug in front of that box.
    if (goneShare(state.boxes[where].face) === 0) { state.cushionAt[i] = Math.round(Math.min(STRIP.right, Math.max(STRIP.left, rectOf(state, where)?.x ?? 0)) * 100); return ON_FLOOR }
    held.set(where, (held.get(where) ?? 0) + 1)
    return held.get(where)! > BOX_HOLDS ? FIRED : where
  })
  state.lights = [...new Set(state.lights)].filter((code) => upright(code >> 1))
  state.tangled = state.tangled && state.lights.length === 0
  evict(state)
  // A cushion on the rug in front of the boxes lies on its strip, and a blanket lies heaped on bare rug only while it is over no box and has room there.
  state.cushionAt = state.cushionAt.map((x) => Math.round(Math.min(STRIP.right, Math.max(STRIP.left, x / 100)) * 100))
  if (state.blanket.length > 0) state.lump = null
  else if (state.lump !== null) {
    const place = placeAmong(boxBlocks(state, []), LUMP, state.lump / 100, false)
    state.lump = place === null ? null : Math.round(place * 100)
  }
  // A cut waits only on a face that shows: on a box that is up and does not lie on its side.
  if (state.line && !upright(state.line.box)) state.line = null
  shed(state)
  return state
}

/** The fort a visit starts from: the saved one, read field by field and settled, or a first visit for the child's age. */
export function loadFort(raw: unknown, childAge: number | null = null): FortState {
  return repair(deserializeFort(raw, childAge))
}
