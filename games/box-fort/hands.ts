import { babyBack, catDrawsBack, catFollows, hopsRound, catLooks, flick, give, leaves, settleThree, snapshot, takeApart, tap } from './acts'
import { goneShare } from './face'
import { BOX_HOLDS, LUMP, corner, dropBox, dropGroup, feetZone, fromSeam, group, highest, loaded, lumpAt, lumpPlace, rects, seams, sameTape, settleBlanket, toHeap, topOf, wornBox } from './fort'
import { FIRED, MAX_LIGHTS, MAX_TAPES, ON_FLOOR, ON_HEAP, ON_RUG, ON_SOFA, type FortState } from './fortState'
import { BOX_COUNT, CAT_RUG, CUSHION_HALF, FLAP, FRONT_Z, RUG, STRIP, kindOf, type OnFace, type Vec } from './layout'
import { BULBS, catSeat, drapedBulbs, heaped, roofed, restBox, restCloth, restCushion, restToy, type Cloth, type Hole, type Pose, CLOTH_POINTS } from './rest'
import { BLADES_S, HANG_S, TIP_LANDS, TIP_S, type Hand, type Hit, type Target, type Toy } from './toy'

// What the finger does. A finger that lands is answered at once: on a face
// the scissors bite, on a thing that can be taken the thing is in the hand.
// A thing in the hand is carried, never changed: the save changes when the
// thing is set down, and only where it was let go. A carry survives a lifted
// finger: the thing hangs where it was let go for a moment and a finger
// landing on it carries on. A cut survives a lifted finger too: the line
// waits on its face, in the save, and a finger that lands near either end of
// it carries on. The piece falls when the line closes on itself, comes back
// to where it began, or runs out over the box's edge.
// A box that is taken up and goes back where it stood (a tap of its lid, a
// touch taken away, a put-away, no room anywhere) leaves everyone where they
// were: the cat rides on or in a box that is carried, the baby behind a box
// crawls off only once that box is dragged away and comes back if the box
// does, and a box the grandmother sits in or wears stays where it is.

/** How far a box is dragged between two scrapes, in metres. */
const SCRAPE_EVERY = 0.6
/** How near a corner the string must pass to catch on it, and how near a seam a strip must be let go. */
const CATCH = 0.3
/** How far to either side of a seam a strip may be let go and still be patted down over it: a finger's width, anywhere along the seam's length. */
export const SEAM_REACH = 0.25
/** A box that tips with a line waiting on its face hangs where it was let go while the cat gets off it (from its lid, or from a hole of it) and the scissors then run that line shut: the seconds each takes. */
const LINE_CLOSES = { top: 0.5, hole: 0.9, blades: BLADES_S }
/** How far a thing must be dragged before it has been moved, and how far the loose tape end must be pulled before a strip rips off. */
const DRAGGED = 0.05
const PULLED = 0.25
/** How far the end of the string must be pulled back from the last corner it hangs on for that corner to let go. */
const UNHOOK = 0.45

/** The blanket in the hand: it billows under the finger. */
export function carriedCloth(at: Vec, time: number): Cloth {
  const xs: number[] = [], ys: number[] = []
  for (let i = 0; i < CLOTH_POINTS; i++) {
    const t = i / (CLOTH_POINTS - 1) - 0.5
    xs.push(at.x + t * 1.5)
    // In the hand it is carried clear of what lies on the rug.
    ys.push(Math.max(0.55, at.y - 0.06 - t * t * 1.5 + Math.sin(time * 5 + t * 6) * 0.03))
  }
  return { xs, ys, front: FRONT_Z + 0.75, back: FRONT_Z + 0.15, hang: 0.1 }
}

type Block = { left: number; right: number; top: number }
/** How far below the top of a thing a carried box may be and still be lifted onto it rather than stopped by it. */
const STEP_UP = 0.5
/** Seconds a box waits over the cat's seat while the cat jumps out from under it. */
const CAT_CLEAR = 0.3
/** How long the blanket takes to settle as a roof. */
const ROOF_S = 0.7
/** How far above its seat the cat's ears reach, sitting up, and how far to the right of its seat its tail does, lying down: a box carried up beside it stops clear of its tail. */
const CAT_TALL = 1.2
const CAT_TAIL = 0.8
/** How high the baby reaches where it lies beside its box, an arm up. */
const BABY_TOP = 1.3
/** How far two boxes may lap and still count as side by side: less than can be seen. */
const LAP = 0.002

/** What a carried box cannot pass through: every box that stands, the heaped blanket, the baby's feet, the cat on the rug, and the grandmother in the box she wears. */
function blocks(state: FortState, members: readonly number[], own: { left: number; right: number } | null): Block[] {
  const found: Block[] = [], worn = wornBox(state)
  for (const rect of rects(state)) if (!members.includes(rect.id)) found.push({ left: rect.x - rect.w / 2, right: rect.x + rect.w / 2, top: rect.id === worn ? Infinity : topOf(rect) + 0.03 })
  // The baby lies beside its box: no box is carried into it, not even its own.
  const lump = lumpAt(state), feet = own ?? feetZone(state)
  if (lump !== null) found.push({ left: lump - LUMP / 2, right: lump + LUMP / 2, top: 0.36 })
  if (feet) found.push({ ...feet, top: BABY_TOP })
  if (state.cat.at === 'rug') found.push({ left: CAT_RUG.x - 0.5, right: CAT_RUG.x + 0.5, top: 0.75 })
  // The cat on top of a box that stays: nothing is carried through it. A box brought over it hangs above its ears until it is let go.
  const seat = state.cat.at === 'top' ? highest(state) : null
  if (seat && !members.includes(seat.id)) { const at = catSeat(state); found.push({ left: at.x - 0.45, right: at.x + CAT_TAIL, top: at.y + CAT_TALL }) }
  return found
}

/**
 * Where the box in the hand is now. It follows the finger, and it is board: carried low, it stops against
 * whatever stands in its way; carried as high as the top of a thing, or nearly, it goes onto that thing and comes down no further.
 */
function place(toy: Toy): void {
  const hand = toy.hand, state = toy.state
  if (!hand || hand.kind !== 'box') return
  const lead = hand.id, size = kindOf(lead), rest = restBox(state, lead)
  // How far the group reaches to either side of the box in the hand, and below its foot.
  let l = size.w / 2, r = size.w / 2, down = 0
  if (!hand.fromHeap) for (const rect of rects(state)) if (hand.members.includes(rect.id)) { l = Math.max(l, rest.x - (rect.x - rect.w / 2)); r = Math.max(r, rect.x + rect.w / 2 - rest.x); down = Math.max(down, rest.y - rect.foot) }
  const before = hand.pose ?? (hand.fromHeap ? { x: hand.at.x, y: Infinity } : { x: rest.x, y: rest.y })
  let x = Math.min(RUG.right + 0.6, Math.max(RUG.left - 0.6, hand.fromHeap ? hand.at.x : rest.x + hand.at.x - hand.start.x))
  let y = Math.max(hand.fromHeap ? hand.at.y - size.h - FLAP / 2 : rest.y + hand.at.y - hand.start.y, down + 0.06)
  const lap = (at: number, block: Block): number => Math.min(block.right, at + r) - Math.max(block.left, at - l)
  const all = blocks(state, hand.members, hand.feet)
  for (let pass = 0; pass < 3; pass++) {
    for (const block of all) {
      if (lap(x, block) <= LAP || y - down >= block.top) continue
      // It was over this thing already, or it is carried nearly as high as its top: it rests on it. Carried lower, it stops against its side.
      if ((lap(before.x, block) > LAP || y - down >= block.top - STEP_UP) && block.top !== Infinity) y = block.top + down
      else x = before.x <= (block.left + block.right) / 2 ? block.left - r : block.right + l
    }
  }
  hand.pose = { x, y }
}

/** Where the hand has a box, a cushion or a toy; null for what it does not carry. */
function carried(toy: Toy, key: string): Pose | null {
  const hand = toy.hand, state = toy.state
  if (!hand) return null
  const [kind, n] = key.split(':'), index = Number(n)
  if (hand.kind === 'cushion') {
    if (kind !== 'cushion' || index !== hand.id) return null
    // It is carried over the rug and over a cushion that lies there, never in them.
    const under = state.cushions.reduce((top, where, other) => (where === ON_FLOOR && other !== index && Math.abs(state.cushionAt[other] / 100 - hand.at.x) < CUSHION_HALF * 2 ? Math.max(top, restCushion(state, other).y + 0.1) : top), 0)
    return { x: hand.at.x, y: Math.max(hand.at.y, under + CUSHION_HALF + 0.04), z: FRONT_Z + 0.4, flat: 0, side: 0 }
  }
  if (hand.kind !== 'box') return null
  // Every box of the group moves as the one in the hand moves, and what lies in them moves with them.
  const lead = hand.id, rest = restBox(state, lead)
  if (!hand.pose) place(toy)
  const { x, y } = hand.pose!
  const leadPose: Pose = { x, y, z: 0, flat: 0, side: 0 }
  const shift = hand.fromHeap ? null : { x: x - rest.x, y: y - rest.y }
  if (kind === 'box') {
    if (index === lead) return leadPose
    if (!hand.members.includes(index) || !shift) return null
    const own = restBox(state, index)
    return { ...own, x: own.x + shift.x, y: own.y + shift.y }
  }
  const inBox = kind === 'cushion' ? state.cushions[index] : state.toys[index]
  if (inBox < 0 || !hand.members.includes(inBox) || !shift) return null
  const own = kind === 'cushion' ? restCushion(state, index) : restToy(state, index)
  return { ...own, x: own.x + shift.x, y: own.y + shift.y }
}

function take(toy: Toy, hand: Omit<Hand, 'lifted' | 'travelled' | 'corners' | 'over' | 'was' | 'pose' | 'feet'>, corners: number[] = []): Hand {
  toy.hand = { ...hand, lifted: null, travelled: 0, corners, over: { kind: 'air' }, was: null, pose: null, feet: hand.kind === 'box' && hand.members.includes(toy.state.baby) ? feetZone(toy.state) : null }
  place(toy)
  toy.carriedBy = (key) => carried(toy, key)
  toy.taken.add(hand.kind)
  return toy.hand
}

function takeBox(toy: Toy, id: number, at: Vec, fromHeap: boolean): void {
  const state = toy.state
  // A box she sits in is hers while she sits there: it creaks under the finger and stays.
  if (!fromHeap && state.gran.at === 'in' && group(state, id).includes(state.gran.box)) { toy.cue('creak', `box:${id}`, 1.2, 0.7); return }
  take(toy, { kind: 'box', id, members: fromHeap ? [id] : group(state, id), at, start: at, fromHeap })
  if (fromHeap) { toy.fresh(id); toy.cue('unfold', `box:${id}`) }
  else toy.cue('scrape', 'carry')
}

/** A fallen piece is touched: it rocks where it lies, with the slap of board on the rug. */
function rock(toy: Toy, key: number, gain: number): void {
  const piece = toy.pieceOf(key)
  if (!piece) return
  toy.cue(piece.disc ? 'roll' : 'slap', `piece:${key}`, 1.25, gain)
}

/** A cut was made, or a line was closed: the cat comes to the new hole, sweeping the piece of the cut before on its way. */
function cutMade(toy: Toy, hole: Hole | null): void {
  catLooks(toy, hole)
}

/** A finger lands. The answer starts here, never on the lift. */
export function press(toy: Toy, target: Target, at: Vec): void {
  // A touch ends the scene that is playing, and is then an ordinary touch.
  toy.endScene(true)
  const hanging = toy.hand
  if (hanging && hanging.lifted !== null) {
    // A finger back on the thing that hangs carries on with it.
    if (target.kind === 'hand') { hanging.lifted = null; hanging.at = at; toy.pressed = true; return }
    setDown(toy)
  }
  toy.pressed = true
  if (toy.stroke) toy.wait()
  toy.focus = at
  toy.watching = 1
  const state = toy.state
  switch (target.kind) {
    case 'face': { const made = toy.piece, hole = toy.begin(target); if (hole || toy.piece !== made) cutMade(toy, hole); break }
    case 'cat': case 'baby': case 'gran': tap(toy, target.kind); break
    case 'flap': takeBox(toy, target.id, at, false); break
    case 'heap': {
      const pile = heaped(state)
      if (pile.length > 0) takeBox(toy, pile[pile.length - 1], at, true)
      else air(toy, at)
      break
    }
    case 'cushion': {
      take(toy, { kind: 'cushion', id: target.index, members: [], at, start: at, fromHeap: false }); toy.cue('puff', `cushion:${target.index}`)
      // Taken out of the box the cat is at a hole of, the cat draws back out of its way.
      if (state.cushions[target.index] >= 0) catDrawsBack(toy, state.cushions[target.index])
      break
    }
    case 'blanket': take(toy, { kind: 'blanket', id: 0, members: [], at, start: at, fromHeap: false }); toy.clothBy = () => carriedCloth(toy.hand?.at ?? at, toy.time); toy.cue('whoomp', 'cloth', 1.4, 0.6); break
    case 'roll': take(toy, { kind: 'tape', id: 0, members: [], at, start: at, fromHeap: false }); toy.cue('rip', 'strip'); break
    // The string is taken by its loose end: it stays on every corner it hangs over until that corner is pulled off.
    case 'lights': take(toy, { kind: 'lights', id: 0, members: [], at, start: at, fromHeap: false }, [...state.lights]); toy.bulbsStill(); toy.bulbsBy = () => drapedBulbs(state, toy.hand?.corners ?? [], toy.hand?.at ?? at); toy.cue(state.tangled ? 'slither' : 'tink', 'bulbs'); break
    case 'switch': flick(toy); break
    // The loose tape end is pinched: it does nothing until it is pulled.
    case 'tab': take(toy, { kind: 'tab', id: 0, members: [], at, start: at, fromHeap: false }); toy.cue('press', 'tab', 1.3, 0.6); break
    // What fell out of a cut rocks where it lies; the ball and the block answer as themselves.
    case 'piece': rock(toy, target.key, 0.6); break
    case 'toy': toy.cue(target.index === 1 ? 'sproing' : 'tumble', `toy:${target.index}`, 1.1, 0.7); break
    case 'hand': case 'air': air(toy, at); break
    default: target satisfies never
  }
}

function air(toy: Toy, at: Vec): void {
  toy.holdScissors({ ...at, z: FRONT_Z + 0.08 })
  toy.cue('air', 'blades')
}

/**
 * A second finger lands while the first one is cutting or carrying. It takes nothing from the first and changes
 * nothing, and it is answered where it landed: a box knocks, a cushion puffs, one of the three makes its own
 * small noise, and anywhere else a scrap of board jumps.
 */
export function nudge(toy: Toy, target: Target, at: Vec): void {
  switch (target.kind) {
    case 'face': case 'flap': toy.cue('knock', `box:${target.id}`, 1.4, 0.4); break
    case 'cushion': toy.cue('puff', `cushion:${target.index}`, 1.2, 0.5); break
    case 'cat': toy.cue('mew', 'cat:tap', 1.1, 0.5); break
    case 'baby': toy.cue('rattle', 'baby:tap', 1.1, 0.5); break
    case 'gran': toy.cue('click', 'gran:tap', 1.1, 0.5); break
    case 'toy': toy.cue(target.index === 1 ? 'sproing' : 'tumble', `toy:${target.index}`, 1.1, 0.5); break
    case 'piece': rock(toy, target.key, 0.4); break
    default: toy.dab = at; toy.cue('air', 'dab', 1.2, 0.6)
  }
}

/** The finger moves. `face` is the face under it, if any. */
export function move(toy: Toy, at: Vec, face: OnFace | null): void {
  toy.focus = at
  const hand = toy.hand, state = toy.state
  if (!hand) { const made = toy.piece, hole = toy.cutTo(at, face); if (hole || toy.piece !== made) cutMade(toy, hole); return }
  if (hand.lifted !== null) return
  const before = Math.floor(hand.travelled / SCRAPE_EVERY), still = hand.travelled <= DRAGGED
  hand.travelled += Math.hypot(at.x - hand.at.x, at.y - hand.at.y)
  hand.at = at
  if (hand.kind === 'box') {
    place(toy)
    if (Math.floor(hand.travelled / SCRAPE_EVERY) > before) toy.cue('scrape', 'carry')
    // The baby lies behind a box only while that box stands there: dragged away, the box leaves it on the rug and it crawls home.
    if (still && hand.travelled > DRAGGED && !hand.fromHeap && hand.members.includes(state.baby)) {
      const was = snapshot(toy)
      hand.was = state.baby
      state.baby = ON_RUG
      toy.changed()
      leaves(toy, was)
    }
  }
  if (hand.kind === 'tab' && hand.travelled >= PULLED) {
    // One pull: a strip rips off.
    letGo(toy)
    takeApart(toy)
    return
  }
  if (hand.kind === 'lights') {
    // The string catches on every corner it is drawn past, and a bulb settles there.
    for (let code = 0; code < BOX_COUNT * 2; code++) {
      const pin = corner(state, code)
      if (!pin || state.boxes[code >> 1].side || hand.corners.includes(code) || hand.corners.length >= MAX_LIGHTS) continue
      if (Math.hypot(at.x - pin.x, at.y - pin.y) < CATCH) { hand.corners.push(code); toy.cue('tink', 'bulbs', 1 + hand.corners.length * 0.04) }
    }
    // Pulled back the way it came, it comes off the last corner it hangs on: one corner for each pull.
    const n = hand.corners.length, last = n > 0 ? corner(state, hand.corners[n - 1]) : null
    if (last && Math.hypot(at.x - last.x, at.y - last.y) >= UNHOOK) {
      const prev = n > 1 ? corner(state, hand.corners[n - 2]) : null
      const back = prev ? Math.hypot(at.x - prev.x, at.y - prev.y) < Math.hypot(last.x - prev.x, last.y - prev.y) : at.y < last.y - UNHOOK
      if (back) { hand.corners.pop(); toy.cue('tink', 'bulbs', 0.9) }
    }
  }
}

/** The finger lets go. `over` is what lies under it, apart from the thing it carried. */
export function lift(toy: Toy, over: Target): void {
  toy.pressed = false
  const hand = toy.hand
  if (hand) {
    if (hand.lifted !== null) return
    // The loose tape end that was not pulled flutters back.
    if (hand.kind === 'tab') { letGo(toy); return }
    // The thing hangs where it was let go: a finger back on it soon enough carries on.
    const when = toy.time
    hand.lifted = when
    hand.over = over
    // Taken up again and let go again, it hangs its whole moment from the later lift.
    toy.after(HANG_S, () => { if (toy.hand === hand && hand.lifted === when) setDown(toy) })
    return
  }
  // A tap pokes a peep-hole. A line that has not closed waits where it stopped.
  const made = toy.piece, hole = toy.liftCut()
  if (hole || toy.piece !== made) cutMade(toy, hole)
}

/** The touch was taken away, which is not the child letting go: nothing is cut, the line waits as far as it got, and the thing in the hand goes back where it was. */
export function cancel(toy: Toy): void {
  toy.pressed = false
  if (toy.hand) back(toy, true)
  else toy.wait()
}

/** The game is put away. A thing that hangs after a lift is set down where it was let go; anything else in the finger is as if never taken. */
export function park(toy: Toy): void {
  const hand = toy.hand
  if (hand && hand.lifted !== null) setDown(toy)
  else if (hand) back(toy, false)
  toy.settle()
}

/** How long the string of lights takes to fall into its tangle, in seconds: so long from the rug and so much more for each metre it is let go above it; and to be wound back on its hook. */
export const LIGHTS_FALL = { rug: 0.3, high: 0.1, hook: 0.2 }

const lands = (sound: Hit['sound'], mover: string, pitch = 1): Hit[] => [{ p: 1, sound, mover, pitch }]

function letGo(toy: Toy): Hand {
  const hand = toy.hand!
  toy.hand = null
  toy.carriedBy = null
  return hand
}

/** Everything that now rests somewhere else moves there from where it was drawn. */
function follow(toy: Toy, before: Map<string, Pose>, lasts: number, hop: number, hits: (key: string) => Hit[], lift: number | null = null): void {
  for (const key of toy.holdMoved(before)) toy.tween(key, before.get(key)!, lasts, hop, hits(key), lift)
}

/**
 * How far above where it is a box must rise to go to its place over everything that stands between: null when
 * it only comes down where it is. `reach` is how far to either side of its middle it sweeps on the way.
 */
function liftOver(toy: Toy, moving: readonly number[], from: Pose, id: number, reach: number): number | null {
  const state = toy.state, to = restBox(state, id)
  if (Math.abs(to.x - from.x) < 0.05 && Math.abs(to.side - from.side) < 0.5) return null
  const left = Math.min(from.x, to.x) - reach, right = Math.max(from.x, to.x) + reach
  let high = from.y
  for (const rect of rects(state)) if (!moving.includes(rect.id) && rect.x + rect.w / 2 > left && rect.x - rect.w / 2 < right) high = Math.max(high, topOf(rect) + 0.06)
  return high - from.y
}

/** The thing in the hand goes back where it was, and whoever left because of it is back too. `seen`: the baby is shown crawling back. */
function back(toy: Toy, seen: boolean): void {
  const before = toy.drawn(), cloth = toy.cloth(), hung = toy.bulbs(), hand = letGo(toy)
  toy.bulbsBy = null
  if (hand.kind === 'blanket') toy.clothTo(cloth, 0.3)
  if (hand.kind === 'lights') toy.bulbsTo(hung, 0.3)
  if (hand.kind === 'tape') toy.strip = { from: hand.at, since: toy.time, stuck: false }
  // A box goes back up and over whatever stands between it and its place.
  const lift = hand.kind === 'box' && !hand.fromHeap ? liftOver(toy, hand.members, before.get(`box:${hand.id}`)!, hand.id, kindOf(hand.id).w / 2) : null
  follow(toy, before, lift !== null ? 0.45 : 0.25, lift !== null ? 0 : 0.12, (key) => (key.startsWith('box') ? lands('thump', key, 1.1) : []), lift)
  if (hand.was !== null) {
    toy.endScene(true)
    if (seen) babyBack(toy, hand.was)
    else toy.state.baby = hand.was
    toy.changed()
  }
}

/** The thing in the hand is set down where it was let go. */
export function setDown(toy: Toy): void {
  const state = toy.state, before = toy.drawn(), cloth = toy.cloth(), hung = toy.bulbs(), was = snapshot(toy)
  const hand = letGo(toy), at = hand.at, over = hand.over
  // Let go on the box the grandmother wears, a thing is let go on her.
  const worn = wornBox(state)
  // The box under the finger: its face, its lid, or a cushion that shows at one of its openings.
  const board = over.kind === 'face' || over.kind === 'flap' ? over.id : over.kind === 'cushion' && state.cushions[over.index] >= 0 ? state.cushions[over.index] : null
  const who = over.kind === 'cat' || over.kind === 'baby' || over.kind === 'gran' ? over.kind : board !== null && board === worn ? 'gran' : null
  const dark = state.dark
  if (hand.kind === 'box') {
    const id = hand.id, key = `box:${id}`
    if (hand.travelled <= DRAGGED && !hand.fromHeap) {
      // A lid that was only tapped: the box is where it was, and so is everything and everyone.
      toy.cue('thump', key, 1.2, 0.5)
      return
    }
    let how: 'stand' | 'tip' | 'back' | 'heap' = 'heap', closes = 0
    const lead = before.get(key)!
    /** A line that waits on its face is closed the short way before the box goes: once the cat is off the box the blades run it shut and its piece falls, where the box hangs. */
    const lineShuts = (): void => {
      if (state.line?.box !== id) return
      const off = was.on === id ? (was.cat.at === 'top' ? LINE_CLOSES.top : LINE_CLOSES.hole) : 0
      toy.closeLine({ x: lead.x, foot: lead.y }, off)
      closes = off + LINE_CLOSES.blades
    }
    if (over.kind === 'heap' && !loaded(state, id)) {
      // Back on the heap it is folded flat, and what was in it and on it comes free. A line that waited on it is not dropped: it is shut first, over the heap.
      lineShuts()
      // It shows its face as it was until it lies there.
      toy.keepFace(id)
      toHeap(state, id)
      toy.changed()
    } else {
      // Let go with the finger over a box, it goes onto that box however low it was carried.
      const landing = hand.members.length > 1 ? dropGroup(state, hand.members, lead.x - restBox(state, id).x) : dropBox(state, id, lead.x, at.x)
      how = landing.how
      if (how !== 'back') toy.changed()
      if (how === 'tip') {
        lineShuts()
        // The cat on its lid does not ride it over: where it would still be the highest thing there, the cat jumps down onto the rug before it goes.
        if (was.cat.at === 'top' && was.on === id && highest(state)?.id === id) state.cat = { at: 'rug', box: 0, cell: 0 }
        // What was in it tumbles out as it rolls over.
        state.cushions = state.cushions.map((where) => (where === id ? FIRED : where))
        state.toys = state.toys.map((where) => (where === id ? -1 : where))
        state.lights = state.lights.filter((code) => code >> 1 !== id)
        state.blanket = state.blanket.filter((under) => under !== id)
      }
    }
    // With no room anywhere it is back where it was taken from, and the baby that lay behind it is back behind it.
    if (how === 'back' && hand.was !== null) { state.baby = hand.was; hand.was = null; toy.endScene(true); babyBack(toy, state.baby) }
    settleBlanket(state)
    // Whoever cannot stay where they were now leaves first; the box is folded or rolls once the cat is off it.
    const going = how === 'back' ? false : settleThree(toy, was)
    // A box that comes down on the box the cat sits on waits until the cat has jumped clear of where it lands.
    const onCat = how === 'stand' && was.cat.at === 'top' && was.on !== null && state.boxes[id].on === was.on
    const wait = onCat ? CAT_CLEAR : Math.max(closes, going && (how === 'heap' || how === 'tip') && state.cat.at === 'rug' && was.cat.at !== 'rug' ? (was.cat.at === 'top' ? 0.3 : 0.9) : 0)
    const hits = (moved: string): Hit[] => {
      if (how === 'heap') return moved === key ? lands('fold', key) : moved.startsWith('cushion') ? lands('puff', moved) : []
      // It comes down on its edge, rolls over and settles: three knocks, each lower.
      if (how === 'tip') return moved === key ? TIP_LANDS.map((p, n) => ({ p, sound: 'knock' as const, mover: key, pitch: 0.95 - n * 0.15 })) : moved.startsWith('cushion') ? lands('puff', moved) : []
      // In the dark a box with no hole comes down as a black block.
      const blind = dark && goneShare(state.boxes[id].face) === 0
      return moved === key ? lands(state.boxes[id].on === ON_HEAP ? 'fold' : blind ? 'boom' : 'thump', key) : []
    }
    // A box that comes down where it is drops straight. One whose place is somewhere else goes up and over whatever stands between, and one that tips turns onto its side up there.
    const kind = kindOf(id), lift = how === 'heap' ? null : liftOver(toy, hand.members, before.get(key)!, id, how === 'tip' ? Math.hypot(kind.w, kind.h) : kind.w / 2)
    const lasts = how === 'heap' ? 0.4 : lift !== null ? (how === 'tip' ? TIP_S : 0.45) : how === 'back' ? 0.28 : 0.14, hop = how === 'heap' ? 0.45 : 0
    if (wait > 0) {
      const moved = toy.holdMoved(before)
      toy.after(wait, () => { for (const thing of moved) { const held = toy.holds.get(thing); if (held) toy.tween(thing, held, lasts, hop, hits(thing), lift) } })
    } else follow(toy, before, lasts, hop, hits, lift)
    // Folded on the heap it is fresh board.
    if (how === 'heap') toy.after(wait + lasts, () => toy.fresh(id))
    const now = restCloth(state)
    if (now.xs.some((x, i) => Math.abs(x - cloth.xs[i]) + Math.abs(now.ys[i] - cloth.ys[i]) > 0.004)) toy.clothTo(cloth, 0.6, lands('flump', 'cloth'))
    toy.kick('bulbs')
    // The cat on a box that hangs while its line is closed is off it at once, before the blades come.
    if (!going) { toy.restAll(); catFollows(toy, was.seat, was.on, closes > 0 ? 0 : wait + lasts) }
    return
  }
  if (hand.kind === 'cushion') {
    const index = hand.id, key = `cushion:${index}`, from = before.get(key)!
    // Let go on an opening where a cushion already shows, it is let go on that box: it goes in, or is fired out of a full one.
    const into = board
    if (who) { give(toy, who, 'cushion', index, from); return }
    // A box with no hole in it has no way in: the cushion bumps its face and flops onto the rug in front of it, where it is seen.
    const shut = into !== null && !state.boxes[into].side && state.boxes[into].on !== ON_HEAP && goneShare(state.boxes[into].face) === 0
    if (shut) { toy.cue('knock', `box:${into}`, 0.8, 0.5); toy.kick(`box:${into}`) }
    if (into !== null && !shut && !state.boxes[into].side && state.boxes[into].on !== ON_HEAP) {
      const full = state.cushions.filter((where, other) => where === into && other !== index).length >= BOX_HOLDS
      state.cushions[index] = into
      const inside = restCushion(state, index)
      toy.changed()
      if (full) {
        // The box bulges, holds a moment, and fires it back out across the rug.
        state.cushions[index] = FIRED
        toy.holds.set(key, inside)
        toy.cue('stretch', `box:${into}`)
        toy.after(0.5, () => { if (toy.holds.get(key) === inside) { toy.cue('poomf', key); toy.kick(`box:${into}`); toy.tween(key, inside, 0.5, 0.5, lands('puff', key)) } })
      } else {
        const hits = lands('whumpf', key)
        if (dark && goneShare(state.boxes[into].face) > 0) hits.push({ p: 1, sound: 'mff', mover: `spill:${into}`, pitch: 1 })
        toy.tween(key, from, 0.22, 0.1, hits)
      }
      return
    }
    // Over the sofa it goes back on the sofa. Anywhere else it lies on the rug where it was let go, in front of the boxes.
    if (at.x < RUG.left - 0.1) state.cushions[index] = ON_SOFA
    else { state.cushions[index] = ON_FLOOR; state.cushionAt[index] = Math.round(Math.min(STRIP.right, Math.max(STRIP.left, at.x)) * 100) }
    toy.changed()
    toy.tween(key, from, 0.3, 0.2, lands('puff', key))
    // It does not lie on a fallen piece: it slides off to the side of it.
    if (state.cushions[index] === ON_FLOOR) for (const piece of [toy.piece, ...toy.olds]) if (piece && piece.swept === null) toy.clearStrip(piece.lies, piece.half)
    return
  }
  if (hand.kind === 'blanket') {
    if (who) { give(toy, who, 'blanket', 0, null); return }
    const top = state.cat.at === 'top' ? highest(state) : null, seat = top ? { at: catSeat(state), on: top.id } : null
    const under = rects(state).filter((rect) => !rect.side && rect.id !== worn && !loaded(state, rect.id) && Math.abs(at.x - rect.x) <= rect.w / 2 + 0.3).sort((a, b) => topOf(b) - topOf(a))[0]
    if (!under) {
      // Over the sofa it is folded over its back again. Over bare rug it lies heaped where it was let go, in the row of the boxes; with no room there for its heap, it is back on the sofa.
      const place = at.x < RUG.left - 0.1 ? null : lumpPlace({ ...state, blanket: [], lump: null }, at.x)
      state.blanket = []
      state.lump = place === null ? null : Math.round(place * 100)
      toy.changed()
      toy.clothTo(cloth, 0.5, lands('flump', 'cloth'))
      return
    }
    // Over two boxes it sags between them as a roof; over one alone it slides off.
    const other = rects(state).filter((rect) => rect.id !== under.id && rect.id !== worn && !rect.side && !loaded(state, rect.id) && Math.abs(rect.x - under.x) - (rect.w + under.w) / 2 <= 1).sort((a, b) => Math.abs(a.x - at.x) - Math.abs(b.x - at.x))[0]
    state.blanket = other ? [under.id, other.id] : [under.id]
    state.lump = null
    settleBlanket(state)
    toy.changed()
    if (other) {
      toy.cue('whoomp', 'cloth'); toy.clothTo(cloth, ROOF_S, lands('settle', 'cloth'))
      // The cat on a lid it comes down on jumps out in front of it and lands on the roof.
      if (seat && roofed(state, seat.on)) hopsRound(toy, seat.at, ROOF_S)
    }
    else { toy.cue('hiss', 'cloth'); toy.clothTo(cloth, 1.1, lands('flump', 'cloth')) }
    return
  }
  if (hand.kind === 'tape') {
    if (who) { give(toy, who, 'tape', 0, null); return }
    // Anywhere along a seam, stacked or side by side, and a finger's width to either side of it.
    const seam = seams(state).filter((meet) => !state.tapes.some((pair) => sameTape(pair, meet.a, meet.b)) && fromSeam(meet, at) <= SEAM_REACH).sort((p, q) => fromSeam(p, at) - fromSeam(q, at))[0]
    if (seam && state.tapes.length < MAX_TAPES) {
      // Patted down over a seam: the two now move as one.
      state.tapes.push([seam.a, seam.b])
      toy.changed()
      toy.cue('press', `tape:${state.tapes.length - 1}`)
      return
    }
    if (board !== null) {
      // On one box, with no seam under it, it has nothing to hold together: it sticks by its end, curls up, and springs back to the roll.
      toy.strip = { from: at, since: toy.time, stuck: true }
      toy.cue('press', 'strip', 1.2)
      toy.kick(`box:${board}`)
      toy.after(0.5, () => { toy.cue('zip', 'strip'); toy.after(0.15, () => toy.cue('whirr', 'roll')) })
      return
    }
    // Pulled to nothing, the strip springs back and the roll spins.
    toy.strip = { from: at, since: toy.time, stuck: false }
    toy.cue('zip', 'strip')
    toy.after(0.15, () => toy.cue('whirr', 'roll'))
    return
  }
  // The string of lights.
  toy.bulbsBy = null
  if (who) { give(toy, who, 'lights', 0, null); return }
  const draped = hand.corners.length > 0, onHook = !draped && at.x > 1.6 && at.y > 2.3
  const lights = draped ? hand.corners : []
  const tangled = !draped && !onHook
  const changed = lights.join() !== state.lights.join() || tangled !== state.tangled
  if (changed) toy.changed()
  state.lights = lights
  state.tangled = tangled
  // Let go over nothing it falls: it is seen to go down to the rug and lands there in a tangle with its own sound. Let go at its hook it is wound back on it.
  if (!draped) { toy.kick('bulbs'); toy.bulbsTo(hung, tangled ? LIGHTS_FALL.rug + Math.max(0, at.y) * LIGHTS_FALL.high : LIGHTS_FALL.hook, lands(tangled ? 'glass' : 'tink', 'bulbs')); return }
  toy.kick('bulbs')
  // Each bulb gives its own small tink as it settles, one after another along the string.
  if (changed) for (let bulb = 0; bulb < BULBS; bulb++) toy.after(0.05 + bulb * 0.07, () => toy.cue('tink', `bulb:${bulb}`, 1.3 - bulb * 0.025, 0.5))
}
