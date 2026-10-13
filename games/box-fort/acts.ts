import { babySide, evict, highest, loaded, lowest, pull, rectOf, seamOf, wear, wornBox } from './fort'
import { HELD, ON_RUG, type CatState, type GranState } from './fortState'
import { BABY, BABY_HOME, CAT_RUG, FRONT_Z, GRAN, GRAN_OUT, LANE, type Vec } from './layout'
import { BULBS, LIES_FLAT, PIECE_OUT, PIECE_RUG, TOY_SIZES, babyAt, behindOf, catSeat, granAt, holeAt, holes, lumpCloth, restCloth, seatOn, type Cloth, type Hole, type Pose } from './rest'
import { CRAWL, DUCK, HEAD_AT, HOP_ROUND, KNEADS } from './people'
import { BLADES_S, BODY_FITS, PAW_FITS, POSTED, fitOf, type Show, type Toy, type Who } from './toy'
import type { SoundId } from './voices'

// What the cat, the baby and the grandmother do. Each uses what is there by
// size and habit, and none of them ever looks at the child: the baby's squeal
// and the grandmother's start are at the cat. Every act here is a scene: its
// outcome goes into the state first and is saved at once, and the poses and
// sounds below only show the way there. A touch ends it where the save is.
// Nobody goes through board. The cat gets behind a box over its top and
// comes back the same way; the baby crawls round a box, never into it; the
// grandmother comes in at a door she fits, and a box she wears is lifted
// over her head.

type Pose1 = { who: Who; at: number; lasts: number; stage: string; set?: Partial<Show> }
type Sound = { at: number; sound?: SoundId; mover?: string; pitch?: number; run?: (finishing: boolean) => void }
type Thing = 'tape' | 'blanket' | 'cushion' | 'lights'

const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.z - b.z)
/** Where one of the three is drawn before anything moves them. */
const shownAt = (show: Show): Vec => (show.stage === 'look' || show.stage === 'stuck' || show.stage === 'in' && show.hole.z !== 0 ? show.hole : show.to)
const lane = (x: number, depth: number): Vec => ({ x, y: 0, z: FRONT_Z + depth })

// --- The cat ------------------------------------------------------------------

/** The cat's seat on a box as that box is drawn now, and the place behind it where the cat is out of sight. */
function perch(toy: Toy, id: number): { seat: Vec; behind: Vec } {
  const pose = toy.poseOf(`box:${id}`)
  return { seat: seatOn(id, pose, pose.side >= 0.5), behind: behindOf(id, pose) }
}

/** Where the cat stands to sweep the older piece off the rug: beside it, on the side away from the sofa. */
function sweepSpot(toy: Toy): Vec | null {
  const old = toy.old
  return old && old.swept === null ? { x: Math.min(PIECE_RUG.right + 0.25, old.lies + old.half + 0.4), y: 0, z: FRONT_Z + PIECE_OUT + PIECE_RUG.deep + 0.14 } : null
}

/**
 * The cat comes to look out of a new hole. Where it ends up is saved as the scene starts. On its way it sweeps
 * the piece of the cut before off the rug with its tail. With no hole to go to (the hole is in the box the
 * grandmother wears, or the cut met no board) it only sweeps, and is back where it was.
 */
export function catLooks(toy: Toy, hole: Hole | null): void {
  const state = toy.state, was = state.cat, top = highest(state), spot = sweepSpot(toy)
  // In the dark the light comes out of the new hole: one soft bell, higher for a smaller hole.
  if (hole && state.dark) toy.cue('bell', `spill:${hole.box}`, bellPitch(hole.radius))
  const goes = hole !== null && hole.box !== wornBox(state) && top !== null
  // Stuck in a hole it sweeps nothing.
  if (!goes && (!spot || was.at === 'stuck')) return
  const from = shownAt(toy.shows.cat), atHole = was.at !== 'top' && was.at !== 'rug'
  const poses: Pose1[] = [], sounds: Sound[] = [{ at: 0, sound: 'mrrp', mover: 'cat:prick' }]
  let t = 0.3, here: 'top' | 'rug' | 'behind' | 'spot' = was.at === 'top' ? 'top' : was.at === 'rug' ? 'rug' : 'behind'
  const high = top ? perch(toy, top.id) : null
  if (atHole) poses.push({ who: 'cat', at: 0, lasts: 0.3, stage: 'back' })
  else poses.push({ who: 'cat', at: 0, lasts: 0.3, stage: 'prick' })
  const hop = (a: Vec, b: Vec, lasts = 0.45): void => { poses.push({ who: 'cat', at: t, lasts, stage: 'hop', set: { from: a, to: b } }); sounds.push({ at: t, sound: 'hop', mover: 'cat:hop' }); t += lasts }
  if (spot) {
    toy.clearStrip(spot.x, 0.3)
    // Down to the rug beside the piece: from the top in one hop, from behind a box over its top first, from the rug on foot.
    if (here === 'behind' && high) { poses.push({ who: 'cat', at: t, lasts: 0.4, stage: 'over', set: { from: high.behind, to: high.seat } }); t += 0.4; here = 'top' }
    if (here === 'top' && high) hop(high.seat, spot)
    else if (here === 'rug') {
      const turn: Vec = { x: CAT_RUG.x + 0.45, y: 0, z: spot.z }, first = Math.max(0.3, dist(from, turn) / 2.6), second = Math.max(0.3, dist(turn, spot) / 2.6)
      poses.push({ who: 'cat', at: t, lasts: first, stage: 'walk', set: { from, to: turn } }, { who: 'cat', at: t + first, lasts: second, stage: 'walk', set: { from: turn, to: spot } })
      t += first + second
    }
    // One flick of the tail, and the piece slides off under the sofa.
    poses.push({ who: 'cat', at: t, lasts: 0.4, stage: 'sweep', set: { from: spot, to: spot } })
    sounds.push({ at: t + 0.12, sound: 'scrape', mover: 'sweep', pitch: 1.5, run: () => toy.sweepNow() })
    t += 0.4
    here = 'spot'
  }
  if (!goes) {
    // Back where the save has it.
    if (was.at === 'rug') { const back = Math.max(0.4, dist(spot!, CAT_RUG) / 2.6); poses.push({ who: 'cat', at: t, lasts: back, stage: 'walk', set: { from: spot!, to: CAT_RUG } }, { who: 'cat', at: t + back, lasts: 0.3, stage: 'rug', set: { to: CAT_RUG } }) }
    else if (high) {
      hop(spot!, high.seat)
      if (was.at === 'top') poses.push({ who: 'cat', at: t, lasts: 0.4, stage: 'top', set: { to: high.seat } })
      else { poses.push({ who: 'cat', at: t, lasts: 0.4, stage: 'drop', set: { from: high.seat, to: high.behind } }, { who: 'cat', at: t + 0.4, lasts: 0.4, stage: 'rise' }, { who: 'cat', at: t + 0.8, lasts: 0.4, stage: was.at }) }
    }
    toy.play(poses, sounds)
    return
  }
  state.cat = { at: 'look', box: hole.box, cell: hole.cell }
  const fit = fitOf(hole) === 'body' ? 'head' : fitOf(hole)
  const arrive = { hole: hole.at, fit, box: hole.box }
  const show: SoundId = fit === 'eye' ? 'peep' : fit === 'paw' ? 'pat' : 'boing'
  // Onto the highest box, off the back of it over its lid, and down behind: from there it is out of sight until it shows at the hole.
  if (here === 'rug') hop(from, high!.seat, 0.5)
  if (here === 'spot') hop(spot!, high!.seat)
  if (here !== 'behind') {
    poses.push({ who: 'cat', at: t, lasts: 0.45, stage: 'drop', set: { from: high!.seat, to: high!.behind } })
    sounds.push({ at: t + 0.42, sound: 'thud', mover: 'cat:land' }, { at: t + 0.42, sound: 'oh', mover: 'gran:start' })
    t += 0.45
  }
  t += 0.15
  poses.push({ who: 'cat', at: t, lasts: 0.45, stage: 'rise', set: arrive }, { who: 'cat', at: t + 0.45, lasts: fit === 'head' ? 2 : 1.4, stage: 'look', set: arrive })
  sounds.push({ at: t + 0.45, sound: show, mover: 'cat:show' }, { at: t + 0.8, sound: 'squeal', mover: 'baby:squeal' })
  if (fit === 'paw') sounds.push({ at: t + 0.85, sound: 'pat', mover: 'cat:pat' }, { at: t + 1.2, sound: 'pat', mover: 'cat:pat' })
  if (fit === 'head') sounds.push({ at: t + 1.75, sound: 'mew', mover: 'cat:show' })
  toy.play(poses, sounds)
}

const bellPitch = (radius: number): number => Math.min(1.7, Math.max(0.7, 1.7 - radius * 2.2))

/** How far through its hop onto a box that is coming down the cat is still out in front of the faces: the box has landed by then. */
export const HOP_OUT = 0.7

/**
 * The cat, on the highest box, goes to a higher one that has just been set down. `lands` is how long that box
 * still takes to land: the cat is out in front of the faces until it has, and comes in over its top after.
 */
export function catFollows(toy: Toy, from: Vec, on: number | null, lands = 0): void {
  const to = catSeat(toy.state), top = highest(toy.state)
  // On the box it rode, it stays where it sits and comes down with the box.
  if (toy.state.cat.at !== 'top' || !top || top.id === on || toy.sceneRunning || Math.hypot(to.x - from.x, to.y - from.y) < 0.01) return
  const lasts = Math.max(0.45, (lands + 0.05) / HOP_OUT)
  toy.play([{ who: 'cat', at: 0, lasts, stage: 'hop', set: { from, to, n: 0 } }, { who: 'cat', at: lasts, lasts: 0.6, stage: 'top', set: { to } }], [{ at: 0, sound: 'hop', mover: 'cat:hop' }, { at: lasts, sound: 'drum', mover: 'cat:land', run: () => toy.kick(`lid:${top.id}`) }])
}

/** The cat on a lid the blanket comes down on, or is pulled off, gets off it: it jumps out in front and lands where it sat once the blanket has passed, `lands` seconds on. */
export function hopsRound(toy: Toy, seat: Vec, lands: number): void {
  const top = highest(toy.state)
  if (toy.state.cat.at !== 'top' || !top || toy.sceneRunning) return
  const lasts = Math.max(0.45, (lands + 0.05) / HOP_OUT)
  toy.play([{ who: 'cat', at: 0, lasts, stage: 'hop', set: { from: seat, to: seat, n: HOP_ROUND } }, { who: 'cat', at: lasts, lasts: 0.6, stage: 'top', set: { to: seat, n: 0 } }], [{ at: 0, sound: 'hop', mover: 'cat:hop' }, { at: lasts, sound: 'drum', mover: 'cat:land', run: () => toy.kick(`lid:${top.id}`) }])
}

/** The cat at a hole pulls back from it and comes up over the back of the highest box, onto its lid. */
function upOnTop(toy: Toy, first: Sound): void {
  const top = highest(toy.state)!
  toy.state.cat = { at: 'top', box: 0, cell: 0 }
  const high = perch(toy, top.id)
  toy.play([{ who: 'cat', at: 0, lasts: 0.3, stage: 'back' }, { who: 'cat', at: 0.3, lasts: 0.45, stage: 'over', set: { from: high.behind, to: high.seat } }, { who: 'cat', at: 0.75, lasts: 0.4, stage: 'top', set: { to: high.seat } }], [first, { at: 0.3, sound: 'hop', mover: 'cat:hop' }, { at: 0.75, sound: 'drum', mover: 'cat:land', run: () => toy.kick(`lid:${top.id}`) }])
}

/**
 * A cushion is taken out of the box the cat is at a hole of, or in. The cat draws back from its hole, out of the
 * cushion's way, and goes up onto the lid: its head and its ears are never where a cushion comes out.
 */
export function catDrawsBack(toy: Toy, box: number): void {
  const cat = toy.state.cat
  if ((cat.at !== 'look' && cat.at !== 'in') || cat.box !== box || toy.state.boxes[box].side) return
  upOnTop(toy, { at: 0, sound: 'mrrp', mover: 'cat:prick' })
}

function tapCat(toy: Toy): void {
  const state = toy.state, was = toy.shows.cat, from = shownAt(was)
  const top = highest(state)
  const mew: Sound = { at: 0, sound: 'mew', mover: 'cat:tap' }
  if (state.cat.at === 'stuck') {
    // A tap pops it out backwards, and it lies on the rug looking at the hole from a distance.
    state.cat = { at: 'rug', box: 0, cell: 0 }
    // It pops out from where it stuck: in front of the board, never from in it.
    const mouth = { x: from.x, y: from.y - 0.3, z: FRONT_Z + 0.1 }
    toy.play([{ who: 'cat', at: 0, lasts: 0.5, stage: 'pop', set: { from: mouth, to: CAT_RUG } }, { who: 'cat', at: 0.5, lasts: 1.6, stage: 'rug' }], [mew, { at: 0.02, sound: 'pop', mover: 'cat:pop' }, { at: 0.5, sound: 'thud', mover: 'cat:land', run: () => { toy.wary = from } }])
    return
  }
  if (state.cat.at === 'look' || state.cat.at === 'in') {
    // Touched at a hole, it pulls back and comes up over the back of the highest box, onto its lid.
    upOnTop(toy, mew)
    return
  }
  // On top or on the rug it goes at the nearest hole its head fits through; with none, onto the highest box.
  const door = holes(state).filter((hole) => hole.box !== wornBox(state) && (hole.tunnel || hole.radius >= PAW_FITS)).sort((a, b) => Math.abs(a.at.x - from.x) - Math.abs(b.at.x - from.x))[0]
  if (!door) {
    if (!top) { toy.play([{ who: 'cat', at: 0, lasts: 1, stage: 'rug' }], [mew]); return }
    state.cat = { at: 'top', box: 0, cell: 0 }
    const to = catSeat(state)
    toy.play([{ who: 'cat', at: 0, lasts: 0.25, stage: 'crouch', set: { from, to: from } }, { who: 'cat', at: 0.25, lasts: 0.55, stage: 'hop', set: { from, to } }, { who: 'cat', at: 0.8, lasts: 1.2, stage: 'top', set: { to } }], [
      mew, { at: 0.25, sound: 'hop', mover: 'cat:hop' }, { at: 0.8, sound: 'drum', mover: 'cat:land', run: () => toy.kick(`lid:${top.id}`) }, { at: 1.1, sound: 'purr', mover: 'cat:purr' },
    ])
    return
  }
  const through = fitOf(door) === 'body', before = lane(door.at.x, LANE.cat)
  state.cat = { at: through ? 'in' : 'stuck', box: door.box, cell: door.cell }
  // A cushion lying where it will go in slides out of its way.
  toy.clearStrip(door.at.x, 0.4)
  if (door.low < 0.35) toy.clearPieces(door.at.x, 0.4)
  const arrive = { hole: door.at, fit: fitOf(door), box: door.box, from: before, to: door.at }
  const onRug = was.stage === 'rug', reach = onRug ? Math.max(0.5, dist(from, before) / 2.6) : 0.45, t = 0.3 + reach
  toy.play([
    { who: 'cat', at: 0, lasts: 0.3, stage: 'crouch', set: { from, to: from } },
    { who: 'cat', at: 0.3, lasts: reach, stage: onRug ? 'walk' : 'hop', set: { from, to: before } },
    { who: 'cat', at: t, lasts: 0.6, stage: 'enter', set: arrive },
    through ? { who: 'cat', at: t + 0.6, lasts: 0.6, stage: 'through', set: arrive } : { who: 'cat', at: t + 0.6, lasts: 2.4, stage: 'stuck', set: arrive },
    ...(through ? [{ who: 'cat' as const, at: t + 1.2, lasts: 1.4, stage: 'in', set: arrive }] : []),
  ], [
    mew, ...(onRug ? [] : [{ at: 0.3, sound: 'hop' as const, mover: 'cat:hop' }, { at: 0.75, sound: 'thud' as const, mover: 'cat:land' }]),
    { at: t, sound: 'mrrp', mover: 'cat:enter', pitch: 0.8 },
    { at: t + 0.6, sound: 'claws', mover: 'cat:claws' },
    ...(through ? [] : [{ at: t + 1.5, sound: 'claws' as const, mover: 'cat:claws' }, { at: t + 0.8, sound: 'oh' as const, mover: 'gran:start' }, { at: t + 1.0, sound: 'squeal' as const, mover: 'baby:squeal' }]),
  ])
}

// --- The baby ------------------------------------------------------------------

const crawlTime = (from: Vec, to: Vec): number => Math.max(0.5, dist(from, to) / 2.4)

/** How far beyond its place behind a box the baby's way round that box runs, so that its feet go clear of the wall. */
export const CLEAR = 0.22
/** The line along which the baby crawls round a box to its place behind it. */
const crawlLine = (behind: Vec, boxX: number): number => behind.x + Math.sign(behind.x - boxX || -1) * CLEAR

/**
 * The baby's way between the rug in front of the boxes and its place behind one: out to a line clear of the wall,
 * down that line past the back of the box, and only then in behind it. On all fours it is as long as the gap beside
 * the box is wide, so down the side it sits up and shuffles, and no part of it crosses a wall.
 */
function round(t: number, front: Vec, behind: Vec, line: number, inwards: boolean): [Pose1[], number] {
  const corner: Vec = { x: line, y: 0, z: FRONT_Z + 0.75 }, back: Vec = { x: line, y: 0, z: behind.z }
  const legs: [Vec, Vec, number][] = inwards ? [[front, corner, CRAWL.flat], [corner, back, CRAWL.sitsUp], [back, behind, CRAWL.liesDown]] : [[behind, back, CRAWL.getsUp], [back, corner, CRAWL.sitsDown], [corner, front, CRAWL.flat]]
  const poses: Pose1[] = []
  for (const [a, b, n] of legs) { const lasts = crawlTime(a, b); poses.push({ who: 'baby', at: t, lasts, stage: 'crawl', set: { from: a, to: b, n } }); t += lasts }
  return [poses, t]
}

function tapBaby(toy: Toy): void {
  const state = toy.state, home = BABY_HOME, from = toy.shows.baby.to
  const rattle: Sound = { at: 0, sound: 'rattle', mover: 'baby:tap' }
  if (state.baby >= 0) {
    // At a box, it crawls back round it and sits on the rug.
    const tunnel = state.boxes[state.baby].side, line = crawlLine(from, state.boxes[state.baby].x / 100)
    state.baby = ON_RUG
    const [way, end] = tunnel ? [[{ who: 'baby' as const, at: 0.1, lasts: crawlTime(from, home), stage: 'crawl', set: { n: CRAWL.flat, from, to: home } }], 0.1 + crawlTime(from, home)] : round(0.1, home, from, line, false)
    toy.clearStrip(from.x, 0.5)
    toy.play([...way, { who: 'baby', at: end, lasts: 0.8, stage: 'sit', set: { to: home } }], [rattle, { at: 0.1, sound: 'palms', mover: 'baby:crawl' }, { at: end, sound: 'giggle', mover: 'baby:giggle' }])
    return
  }
  const box = lowest(state, home.x)
  if (!box) { toy.play([{ who: 'baby', at: 0, lasts: 1, stage: 'sit' }], [rattle]); return }
  const held = state.toys.map((where, index) => (where === HELD ? index : -1)).filter((index) => index >= 0)
  // The hole the cat is at is the cat's: the baby posts nothing into it.
  const cats = state.cat.at === 'look' || state.cat.at === 'stuck' ? holeAt(state, state.cat.box, state.cat.cell) : null
  const own = holes(state).filter((hole) => hole.box === box.id && !hole.tunnel && !(cats && hole.box === cats.box && hole.cell === cats.cell))
  // It only ever crawls: a hole whose lower edge is above its reach does not exist for it.
  const slot = own.filter((hole) => hole.low <= 0.9).sort((a, b) => a.low - b.low || a.at.x - b.at.x)[0]
  const room = box.side || babySide(state, box.id) !== 0
  const crawlIn = (t: number, start: Vec): [Pose1[], Sound[]] => {
    state.baby = box.id
    // It goes round the box by the corner on the side that has room, never through the board, and lies down behind it.
    const behind = babyAt(state)
    const [way, end] = box.side ? [[{ who: 'baby' as const, at: t, lasts: crawlTime(start, behind), stage: 'crawl', set: { n: CRAWL.flat, from: start, to: behind, box: box.id } }], t + crawlTime(start, behind)] : round(t, start, behind, crawlLine(behind, box.x), true)
    toy.clearStrip(behind.x, 0.5)
    return [[...way.map((pose) => ({ ...pose, set: { ...pose.set, box: box.id } })), { who: 'baby', at: end, lasts: 1, stage: 'in', set: { to: behind, box: box.id } }], [{ at: t, sound: 'palms', mover: 'baby:crawl' }, { at: end + 0.3, sound: 'giggle', mover: 'baby:giggle' }]]
  }
  const pats = (): void => {
    // A box it cannot get at: it pats the side and goes back.
    const side = lane(box.x - box.w / 2 - 0.25, LANE.baby), there = crawlTime(home, side)
    toy.play([{ who: 'baby', at: 0.1, lasts: there, stage: 'crawl', set: { n: CRAWL.flat, from: home, to: side } }, { who: 'baby', at: 0.1 + there, lasts: 0.9, stage: 'pat', set: { to: side } }, { who: 'baby', at: 1 + there, lasts: there, stage: 'crawl', set: { n: CRAWL.flat, from: side, to: home } }], [
      rattle, { at: 0.1, sound: 'palms', mover: 'baby:crawl' }, { at: 0.2 + there, sound: 'palms', mover: 'baby:pat', pitch: 0.8, run: () => toy.kick(`box:${box.id}`) }, { at: 1 + there, sound: 'palms', mover: 'baby:crawl' },
    ])
  }
  if (box.side || own.length === 0 || held.length === 0) {
    // The box itself: round it goes until only its feet show, and it peeps out. With no room beside the box for its feet, it pats the box.
    if (!room) { pats(); return }
    const [poses, sounds] = crawlIn(0.1, home)
    toy.play(poses, [rattle, ...sounds])
    return
  }
  if (!slot) { pats(); return }
  // It posts the toys it holds through the lowest hole, one by one; one too big for the hole springs back, and it tries that one once more.
  const post = lane(slot.at.x - 0.42, LANE.baby), there = crawlTime(home, post)
  const poses: Pose1[] = [{ who: 'baby', at: 0.1, lasts: there, stage: 'crawl', set: { n: CRAWL.flat, from: home, to: post } }]
  const sounds: Sound[] = [rattle, { at: 0.1, sound: 'palms', mover: 'baby:crawl' }]
  let t = 0.2 + there
  for (const index of held) {
    const fits = Math.max(slot.w, slot.h) >= TOY_SIZES[index], key = `toy:${index}`
    if (fits) state.toys[index] = box.id
    toy.withBaby.add(index)
    poses.push({ who: 'baby', at: t, lasts: fits ? 0.55 : 0.95, stage: 'post', set: { to: post, hole: slot.at, n: index } })
    if (fits) sounds.push({ at: t + 0.25, run: (finishing) => { toy.withBaby.delete(index); if (!finishing) toy.tween(key, { x: slot.at.x, y: slot.at.y, z: FRONT_Z + 0.05, flat: 0, side: 0 }, 0.3, 0.05, [{ p: 1, sound: 'tumble', mover: key, pitch: 1 }], null, FRONT_Z - POSTED.inside) } })
    else sounds.push({ at: t + 0.25, sound: 'sproing', mover: key }, { at: t + 0.3, run: () => toy.kick('baby:frown') }, { at: t + 0.65, sound: 'sproing', mover: key, pitch: 1.12 }, { at: t + 0.7, run: () => toy.kick('baby:frown') })
    t += fits ? 0.55 : 0.95
  }
  if (slot.radius >= BODY_FITS && room) {
    const [inPoses, inSounds] = crawlIn(t, post)
    poses.push(...inPoses); sounds.push(...inSounds)
  } else {
    poses.push({ who: 'baby', at: t, lasts: there, stage: 'crawl', set: { n: CRAWL.flat, from: post, to: home } }, { who: 'baby', at: t + there, lasts: 0.4, stage: 'sit', set: { to: home } })
    sounds.push({ at: t, sound: 'palms', mover: 'baby:crawl' })
  }
  toy.clearStrip(post.x, 0.5)
  toy.play(poses, sounds)
}

/** The baby goes back behind the box it was at: the box was taken up and went back where it stood. */
export function babyBack(toy: Toy, id: number): void {
  const state = toy.state, from = toy.shows.baby.to
  state.baby = id
  if (babySide(state, id) === 0 && !state.boxes[id].side) { state.baby = ON_RUG; return }
  const behind = babyAt(state), [way, end] = round(0, from, behind, crawlLine(behind, state.boxes[id].x / 100), true)
  toy.play([...way.map((pose) => ({ ...pose, set: { ...pose.set, box: id } })), { who: 'baby', at: end, lasts: 0.6, stage: 'in', set: { to: behind, box: id } }], [{ at: 0, sound: 'palms', mover: 'baby:crawl' }])
}

// --- The grandmother -------------------------------------------------------------

const CHAIR: Vec = { x: GRAN.x, y: 0, z: GRAN.z }
/** The door she fits: as wide as her lap and high enough to duck through. Her head alone needs `HEAD`. */
export const DOOR = { w: 0.8, h: 1.2 }
export const HEAD = { w: 0.6, h: 0.34 }
/** How high a box is lifted to go over her head while she ducks, and how long that takes. */
export const OVER_HEAD = { high: 2.5, lasts: 1.3 }
/** How long she takes to get up out of her chair and round to the start of her lane, and to go back and sit down. */
export const STANDS_UP = 0.9, SITS = 1.1
const walkTime = (from: Vec, to: Vec): number => Math.max(0.5, (Math.abs(from.x - to.x) + Math.abs(from.z - to.z)) / 2.2)

/** Her way along the front of the boxes: out along her lane, never through the fort. */
function goes(t: number, from: Vec, to: Vec): [Pose1[], number] {
  const time = walkTime(from, to)
  return [[{ who: 'gran', at: t, lasts: time, stage: 'walk', set: { from, to } }], t + time]
}

/** Her way back to her chair from a place in front of the boxes: along her lane to its end, round the end of the boxes, and down into the chair. */
function goesHome(t: number, from: Vec): Pose1[] {
  const [walk, end] = goes(t, from, GRAN_OUT)
  return [...walk, { who: 'gran', at: end, lasts: SITS, stage: 'sitdown', set: { from: GRAN_OUT, to: CHAIR } }]
}

/** A box goes up over her head and comes down where the save now has it, while she ducks under its rim: a box put on, or taken off. */
function overHead(toy: Toy, id: number, t: number, from: Vec, to: Vec): [Pose1[], Sound[]] {
  const key = `box:${id}`
  return [[{ who: 'gran', at: t, lasts: OVER_HEAD.lasts, stage: 'under', set: { from, to, box: id } }], [
    { at: t, sound: 'creak', mover: 'gran:wear', run: (finishing) => { const held = toy.holds.get(key); if (held && !finishing) toy.tween(key, held, OVER_HEAD.lasts, OVER_HEAD.high, [{ p: 1, sound: 'thump', mover: key, pitch: 1.1 }]) } },
  ]]
}

function tapGran(toy: Toy): void {
  const state = toy.state, gran = state.gran
  const click: Sound = { at: 0, sound: 'click', mover: 'gran:tap' }
  if (gran.at !== 'chair') {
    // She comes out of the box by its door, or lifts the box she wears off over her head, and goes back to her chair.
    const before = toy.drawn(), from = granAt(state), box = gran.box, wore = gran.at === 'skirt', out = lane(from.x, LANE.gran)
    state.gran = { at: 'chair', box: 0 }
    toy.holdMoved(before)
    toy.clearStrip(from.x, 0.5)
    toy.clearPieces(from.x, 0.5)
    if (wore) {
      const [poses, sounds] = overHead(toy, box, 0.1, from, out)
      toy.play([...poses, ...goesHome(0.1 + OVER_HEAD.lasts, out)], [click, ...sounds, { at: 0.1 + OVER_HEAD.lasts, sound: 'cluck', mover: 'gran:walk' }])
      return
    }
    toy.play([{ who: 'gran', at: 0, lasts: DUCK.lasts, stage: 'unduck', set: { from, to: out, box } }, ...goesHome(DUCK.lasts, out)], [click, { at: 0.1, sound: 'creak', mover: `box:${box}` }, { at: DUCK.lasts, sound: 'cluck', mover: 'gran:walk' }])
    return
  }
  // She looks the fort over for a door: the largest hole that reaches the floor.
  const door = holes(state).filter((hole) => !hole.tunnel && hole.low <= 0.06 && state.boxes[hole.box].on === ON_RUG).sort((a, b) => b.w * b.h - a.w * a.h)[0]
  const spare = state.boxes.map((box) => rectOf(state, box.id)).filter((rect) => rect !== null && !rect.side && rect.on === ON_RUG && !loaded(state, rect.id)).sort((a, b) => Math.abs(a!.x - GRAN.x) - Math.abs(b!.x - GRAN.x))[0]
  const fitsDoor = door && door.w >= DOOR.w && door.h >= DOOR.h
  const target = door ? rectOf(state, door.box)! : spare
  if (!target) { toy.play([{ who: 'gran', at: 0, lasts: 1, stage: 'chair' }], [click]); return }
  const at = lane(door ? door.at.x : target.x, LANE.gran)
  const [walk, t] = goes(STANDS_UP, GRAN_OUT, at)
  const poses: Pose1[] = [{ who: 'gran', at: 0, lasts: STANDS_UP, stage: 'stand', set: { from: CHAIR, to: GRAN_OUT, box: target.id } }, ...walk]
  const sounds: Sound[] = [click, { at: STANDS_UP, sound: door ? 'ooh' : 'cluck', mover: 'gran:walk' }]
  toy.clearStrip(at.x, 0.5)
  toy.clearPieces(at.x, 0.5)
  if (fitsDoor) {
    // A door she fits: she ducks in and sits, and her knees stick out.
    // The cushions in the box are pushed to the back of it as she comes in, and she sits in front of them.
    const before = toy.drawn()
    state.gran = { at: 'in', box: target.id }
    toy.holdMoved(before)
    sounds.push({ at: t + DUCK.lasts * DUCK.bent, run: (finishing) => { for (const [moved, held] of [...toy.holds]) if (!finishing) toy.tween(moved, held, 0.3, 0.05, moved.startsWith('cushion') ? [{ p: 1, sound: 'puff', mover: moved, pitch: 1 }] : []) } })
    // A piece that lies where her legs will be is pushed along the rug out of their way.
    toy.clearPieces(granAt(state).x, 0.45)
    poses.push({ who: 'gran', at: t, lasts: DUCK.lasts, stage: 'duck', set: { from: at, to: granAt(state), hole: door.at } }, { who: 'gran', at: t + DUCK.lasts, lasts: 1.2, stage: 'in', set: { to: granAt(state), hole: door.at } })
    sounds.push({ at: t, sound: 'creak', mover: `box:${target.id}` })
    toy.play(poses, sounds)
    return
  }
  // Too small, or no door at all: she tries it anyway, and wears what does not fit.
  const wears = !loaded(state, target.id), tries = door ? HEAD_AT.lasts : 0.7
  if (door) {
    poses.push({ who: 'gran', at: t, lasts: tries, stage: 'head', set: { from: at, to: at, hole: door.at, n: door.w >= HEAD.w && door.h >= HEAD.h ? 1 : 0 } })
    sounds.push({ at: t + tries * HEAD_AT.board, sound: 'bonk', mover: 'gran:head', run: () => toy.kick(`box:${target.id}`) })
  } else {
    poses.push({ who: 'gran', at: t, lasts: 0.7, stage: 'sitinto', set: { from: at, to: at } })
    sounds.push({ at: t + 0.2, sound: 'creak', mover: `box:${target.id}` })
  }
  if (!wears) {
    poses.push(...goesHome(t + tries, at))
    toy.play(poses, sounds)
    return
  }
  // She lifts the box over her head and comes up inside it. What it held comes free as it goes up: a cushion back to the sofa, a toy back to the baby, a roof off it.
  const was = snapshot(toy), before = toy.drawn(), cloth = toy.cloth(), roofed = state.blanket.includes(target.id)
  wear(state, target.id)
  toy.holdMoved(before)
  if (roofed) toy.clothBy = () => cloth
  const key = `box:${target.id}`, [left, clear] = leave(toy, was, t + tries)
  const start = Math.max(t + tries, clear)
  const [on, onSounds] = overHead(toy, target.id, start, at, granAt(state))
  poses.push(...on, { who: 'gran', at: start + OVER_HEAD.lasts, lasts: 0.6, stage: 'skirt', set: { to: granAt(state) } })
  sounds.push(...onSounds, { at: start, run: (finishing) => { for (const [moved, held] of [...toy.holds]) if (!finishing && moved !== key) toy.tween(moved, held, 0.6, 0.3, moved.startsWith('cushion') ? [{ p: 1, sound: 'puff', mover: moved, pitch: 1 }] : []); if (roofed && !finishing) toy.clothTo(cloth, 0.6, [{ p: 1, sound: 'flump', mover: 'cloth', pitch: 1 }]) } }, { at: start + OVER_HEAD.lasts, sound: 'cluck', mover: 'gran:wear' })
  toy.play([...poses, ...left[0]], [...sounds, ...left[1]])
}

// --- Whoever is put out of a box -----------------------------------------------------

/** Where each of the three is, in the save and as drawn, before something moves a box: what `leave` shows them leaving from. */
export type Before = { cat: CatState; baby: number; gran: GranState; seat: Vec; /** The box the cat is on or at, or null on the rug. */ on: number | null; perch: { seat: Vec; behind: Vec } | null; babyAt: Vec; /** The line the baby crawls along to come round its box. */ babyLine: number; granAt: Vec }

export function snapshot(toy: Toy): Before {
  const state = toy.state, cat = state.cat, ride = cat.at === 'top' ? highest(state)?.id ?? null : cat.at === 'rug' ? null : cat.box
  const shift = ride === null ? null : toy.rideBy?.(ride) ?? null, seat = catSeat(state)
  return {
    cat: { ...cat }, baby: state.baby, gran: { ...state.gran }, on: ride, seat: shift ? { x: seat.x + shift.x, y: seat.y + shift.y, z: seat.z + shift.z } : seat,
    perch: ride === null ? null : perch(toy, ride), babyAt: toy.shows.baby.to, babyLine: state.baby >= 0 ? crawlLine(toy.shows.baby.to, state.boxes[state.baby].x / 100) : 0, granAt: toy.shows.gran.to,
  }
}

/**
 * The poses and sounds of those who are no longer where they were before: the cat off its box or out from
 * behind it over the lid, and onto the rug; the baby round the box and home, blinking; the grandmother out by
 * her door and back to her chair. Returns them with the time by which the cat and the grandmother are clear
 * of the box, so that the box is moved after that.
 */
export function leave(toy: Toy, was: Before, t: number): [[Pose1[], Sound[]], number] {
  const state = toy.state, poses: Pose1[] = [], sounds: Sound[] = []
  let clear = t
  if (was.cat.at !== 'rug' && state.cat.at === 'rug') {
    let at = t
    if (was.cat.at !== 'top' && was.perch) {
      // From behind the box it comes up over the lid first.
      poses.push({ who: 'cat', at, lasts: 0.2, stage: 'back' }, { who: 'cat', at: at + 0.2, lasts: 0.4, stage: 'over', set: { from: was.perch.behind, to: was.perch.seat } })
      at += 0.6
    }
    const from = was.cat.at === 'top' ? was.seat : was.perch?.seat ?? was.seat
    poses.push({ who: 'cat', at, lasts: 0.5, stage: 'hop', set: { from, to: CAT_RUG } }, { who: 'cat', at: at + 0.5, lasts: 0.8, stage: 'rug', set: { to: CAT_RUG } })
    sounds.push({ at: t, sound: 'mew', mover: 'cat:tap' }, { at, sound: 'hop', mover: 'cat:hop' }, { at: at + 0.5, sound: 'thud', mover: 'cat:land', run: () => toy.kick('cat:blink') })
    clear = Math.max(clear, at + 0.3)
  }
  if (was.baby >= 0 && state.baby < 0) {
    const from = was.babyAt, tunnel = Math.abs(from.z - (FRONT_Z - 0.3)) < 0.01
    const [way, end] = tunnel ? [[{ who: 'baby' as const, at: t, lasts: crawlTime(from, BABY_HOME), stage: 'crawl', set: { n: CRAWL.flat, from, to: BABY_HOME } }], t + crawlTime(from, BABY_HOME)] : round(t, BABY_HOME, from, was.babyLine, false)
    poses.push(...way, { who: 'baby', at: end, lasts: 0.8, stage: 'sit', set: { to: BABY_HOME } })
    sounds.push({ at: t, sound: 'palms', mover: 'baby:crawl' }, { at: end, run: () => toy.kick('baby:blink') })
  }
  if (was.gran.at !== 'chair' && state.gran.at === 'chair') {
    const from = was.granAt, out = lane(from.x, LANE.gran)
    toy.clearStrip(from.x, 0.5)
    toy.clearPieces(from.x, 0.5)
    poses.push({ who: 'gran', at: t, lasts: DUCK.lasts, stage: 'unduck', set: { from, to: out, box: was.gran.box } }, ...goesHome(t + DUCK.lasts, out))
    // Turned out of a box that someone moved, she blames nobody: her eyes are on her knitting and her needles click as she goes.
    sounds.push({ at: t, sound: 'click', mover: 'gran:tap', run: () => toy.kick('gran:knit') })
    clear = Math.max(clear, t + DUCK.lasts)
  }
  return [[poses, sounds], clear]
}

/** Something moved a box: whoever cannot stay where they were leaves, as a scene. Nothing plays when everyone can stay. */
export function leaves(toy: Toy, was: Before): boolean {
  const [[poses, sounds]] = leave(toy, was, 0)
  if (poses.length === 0) return false
  toy.play(poses, sounds)
  return true
}

/** The save is settled after a box has moved, and whoever that puts out leaves. */
export function settleThree(toy: Toy, was: Before): boolean {
  evict(toy.state)
  return leaves(toy, was)
}

/** One pull of the loose tape end: a strip rips off and the highest box hops back to the heap, once whoever was in or on it is clear of it. */
export function takeApart(toy: Toy): void {
  const state = toy.state, before = toy.drawn(), cloth = toy.cloth(), was = snapshot(toy)
  toy.cue('tear', 'tab')
  // A line that waits on the box the pull takes is not dropped: it is shut first, where the box stands. The box shows its face as it was until it lies on the heap.
  const top = state.tapes.length > 0 ? highest(state) : null
  const lined = top !== null && state.line?.box === top.id && toy.takeLine({ x: top.x, foot: top.foot })
  if (top) toy.keepFace(top.id)
  const id = pull(state)
  if (id === null) return
  evict(state)
  const moved = toy.holdMoved(before), key = `box:${id}`
  const [[poses, sounds], clear] = leave(toy, was, 0.25)
  const clothMoves = restCloth(state).ys.some((y, i) => Math.abs(y - cloth.ys[i]) > 0.004)
  if (clothMoves) toy.clothBy = () => cloth
  // Once whoever was on it is clear of it the blades run the line shut and its piece falls; the box goes after that.
  const goes = Math.max(clear + (clothMoves ? 0.45 : 0), lined ? clear + BLADES_S : 0)
  toy.play(poses, [
    ...sounds,
    { at: clear, run: (finishing) => { if (lined) toy.shutLine(!finishing) } },
    // The blanket comes off first: it is up and away before the box under it leaves.
    { at: clear, run: (finishing) => { if (!finishing && clothMoves) toy.clothTo(cloth, 0.6, [{ p: 1, sound: 'flump', mover: 'cloth', pitch: 1 }]) } },
    { at: goes, run: (finishing) => {
      if (finishing) return
      for (const thing of moved) {
        const held = toy.holds.get(thing)
        if (held) toy.tween(thing, held, thing === key ? 0.5 : 0.6, thing === key ? 0.6 : 0.4, thing === key ? [{ p: 1, sound: 'fold', mover: key, pitch: 1 }] : thing.startsWith('cushion') ? [{ p: 1, sound: 'puff', mover: thing, pitch: 1 }] : [])
      }
      toy.kick('bulbs')
    } },
    // Folded on the heap it is fresh board.
    { at: goes + 0.5, run: () => toy.fresh(id) },
    // The scene outlasts everything it set moving.
    { at: goes + 0.95, run: () => {} },
  ])
}

// --- A tap on one of the three -------------------------------------------------------

/** One of the three is tapped: answered as the finger lands, and the scene follows from that. */
export function tap(toy: Toy, who: Who): void {
  if (who === 'cat') tapCat(toy)
  else if (who === 'baby') tapBaby(toy)
  else tapGran(toy)
}

// --- The wall switch -------------------------------------------------------------------

/** Seconds the fort may take to light: the holes share the first span, the strips of tape the second. */
const LIGHTING = { holes: 2.2, tapes: 0.9 }

/** The wall switch. Off: the room dims and the fort lights up, hole by hole. On: the afternoon is back at once. */
export function flick(toy: Toy): void {
  const state = toy.state
  state.dark = !state.dark
  toy.cue('flick', 'switch')
  toy.taken.add('switch')
  toy.changed(true)
  toy.lit = 0
  toy.holesLit.clear()
  if (!state.dark) return
  const sounds: Sound[] = []
  let t = 0.6, count = 0
  const light = (sound: SoundId, mover: string, pitch: number, gap: number, also?: () => void): void => { const n = ++count; sounds.push({ at: t, sound, mover, pitch, run: () => { toy.lit = n; also?.() } }); t += gap }
  // Each hole lights in turn, its shape landing on the wall, with its own bell; a box with a cushion in it lights all at once, dully.
  const lit = [...state.boxes].sort((a, b) => a.x - b.x).map((box) => ({ id: box.id, own: holes(state).filter((hole) => hole.box === box.id && !hole.tunnel) })).filter((entry) => entry.own.length > 0)
  const steps = lit.reduce((sum, entry) => sum + (state.cushions.includes(entry.id) ? 1 : entry.own.length), 0), gap = Math.min(0.35, LIGHTING.holes / Math.max(1, steps))
  for (const { id, own } of lit) {
    if (state.cushions.includes(id)) light('mff', `spill:${id}`, 1, gap, () => toy.holesLit.set(id, own.length))
    else own.forEach((hole, k) => light('bell', `spill:${id}`, bellPitch(hole.radius), gap, () => toy.holesLit.set(id, k + 1)))
  }
  const taped = state.tapes.map((pair, index) => ({ index, seam: seamOf(state, pair) })).filter((strip) => strip.seam !== null)
  for (const { index } of taped) light('crackle', `tape:${index}`, 1, Math.min(0.25, LIGHTING.tapes / taped.length))
  if (state.blanket.length === 2) light('warm', 'cloth', 1, 0.4)
  // The bulbs come on one after another: a rising run, one plink a bulb.
  for (let bulb = 0; bulb < BULBS; bulb++) light('plink', `bulb:${bulb}`, 1 + bulb * 0.035, 0.07)
  sounds.push({ at: t, run: () => { toy.lit = 99; toy.kick('cat:eyes') } }, { at: t + 0.6, run: () => {} })
  toy.play([], sounds)
}

// --- A thing let go on one of the three ---------------------------------------------------

/** The blanket thrown over the grandmother in her chair: how wide and how high it stands over her, and how far in front of her and behind her it reaches. */
export const COVERS = { wide: 1.9, high: 2.3, front: 0.65, back: 0.5 }
/** The string as the baby shakes it: held up off the rug in its fist, over the toys that lie beside it, sagging a little to its far end. */
export const SHAKEN = { high: 0.62, sags: 0.012, out: 0.2 }

/** The blanket over the cat: how wide the mound is, how far to the left of the cat its middle is, so that its edge comes down where the tail begins and the tail is out from under it, not up through it, how high it is, how round its shoulders are, so that the cat's are under it, and how far in front of the cat it reaches: past the face of the box, so that its hem hangs in front of the board and not in the lid. */
export const UNDER = { wide: 1.0, left: 0.2, high: 0.55, round: 4, front: 0.56 }

/** The cat gets off the cushion it lay on: when, a quarter of a second before the cushion goes, and for how long it is in the air. */
export const GETS_OFF = { at: 3.75, lasts: 0.7 }

/** A mound of blanket over something at `at`, `high` tall: the cat, the baby's head, the grandmother. */
function mound(at: Vec, wide: number, high: number, bump: () => number, front = 0.42, back = 0.3, round = 2): () => Cloth {
  return () => {
    const cloth = lumpCloth(at.x), travel = bump()
    cloth.xs = cloth.xs.map((_, i) => at.x - wide / 2 + (i / (cloth.xs.length - 1)) * wide)
    cloth.ys = cloth.xs.map((x) => { const t = (x - at.x) / (wide / 2); return at.y + Math.max(0, 1 - Math.abs(t) ** round) * high + Math.exp(-(((x - at.x) / wide - travel) ** 2) * 60) * 0.12 })
    cloth.front = at.z + front; cloth.back = at.z - back; cloth.hang = 0.05
    return cloth
  }
}

/**
 * A thing is let go on one of the three, who uses it their own way for a few seconds. Nothing is saved: it ends
 * with the thing back where the save has it and with them where the save has them. `from` is where a cushion was.
 */
export function give(toy: Toy, who: Who, thing: Thing, index: number, from: Pose | null): void {
  const state = toy.state, show = toy.shows[who], at = show.to, key = `cushion:${index}`
  const cloth = toy.cloth()
  toy.clothBy = toy.bulbsBy = null
  const home = (who === 'cat' && (show.stage === 'top' || show.stage === 'rug')) || (who === 'baby' && show.stage === 'sit') || (who === 'gran' && show.stage === 'chair')
  const poses: Pose1[] = [], sounds: Sound[] = []
  const stay = (lasts: number, stage: string, set?: Partial<Show>): void => { poses.push({ who, at: 0, lasts, stage, set }) }
  const cushionBack = (t: number, held: Pose, lift: number | null = null): void => { toy.holds.set(key, held); sounds.push({ at: t, run: (finishing) => { if (!finishing) toy.tween(key, held, lift === null ? 0.45 : 0.6, lift === null ? 0.3 : 0, [{ p: 1, sound: 'puff', mover: key, pitch: 1 }], lift) } }, { at: t + (lift === null ? 0.5 : 0.65), run: () => {} }) }
  const clothBack = (t: number, shape: () => Cloth): void => { toy.clothBy = shape; sounds.push({ at: t, run: (finishing) => { if (!finishing) toy.clothTo(shape(), 0.5, [{ p: 1, sound: 'flump', mover: 'cloth', pitch: 1 }]) } }, { at: t + 0.55, run: () => {} }) }
  if (!home) {
    // Busy in or at a box, they have no use for it: it goes back, with their own small noise. The grandmother's is her needles, and her eyes stay on them.
    sounds.push({ at: 0, sound: who === 'cat' ? 'mew' : who === 'baby' ? 'giggle' : 'click', mover: `${who}:tap`, run: () => { if (who === 'gran') toy.kick('gran:knit') } })
    if (thing === 'cushion' && from) cushionBack(0, from)
    if (thing === 'blanket') clothBack(0, () => cloth)
    if (thing === 'tape') toy.strip = { from: shownAt(show), since: toy.time, stuck: false }
    // Short as it is, it is a scene of a whole second: their noise and the thing going back are over before the next thing starts.
    sounds.push({ at: 1, run: () => {} })
    toy.play(poses, sounds)
    return
  }
  if (who === 'cat') {
    if (thing === 'tape') {
      // It bats the loose end, gets it stuck to a paw and shakes the paw.
      stay(2.4, 'tapePaw')
      sounds.push({ at: 0.5, sound: 'flap', mover: 'cat:shake' }, { at: 0.95, sound: 'flap', mover: 'cat:shake', pitch: 1.15 }, { at: 1.3, sound: 'flap', mover: 'cat:shake', pitch: 1.3 })
    } else if (thing === 'blanket') {
      // It burrows under: a bump travels along and a tail comes out at the edge.
      stay(3.2, 'under')
      toy.kick('cat:under')
      sounds.push({ at: 0, sound: 'whoomp', mover: 'cloth' }, { at: 0.8, sound: 'hush', mover: 'cat:burrow' }, { at: 1.8, sound: 'hush', mover: 'cat:burrow' }, { at: 2.3, run: () => toy.kick('cat:tail') })
      clothBack(3.2, mound({ ...at, x: at.x - UNDER.left, y: at.y + 0.03 }, UNDER.wide, UNDER.high, () => Math.sin(toy.age('cat:under') * 2.2) * 0.3 + (toy.age('cat:burrow') < 0.3 ? 0.05 : 0), UNDER.front, 0.3, UNDER.round))
    } else if (thing === 'cushion') {
      // It kneads it with both front paws, turns round twice and curls up. As the cushion goes back it gets off it: it hops out
      // in front and lands where it sat once the cushion is gone, so that the cushion is never pulled out through it.
      const rests = show.stage, up: Vec = { x: at.x, y: at.y + KNEADS, z: at.z }
      stay(GETS_OFF.at, 'knead')
      poses.push({ who, at: GETS_OFF.at, lasts: GETS_OFF.lasts, stage: 'hop', set: { from: up, to: at, n: HOP_ROUND } }, { who, at: GETS_OFF.at + GETS_OFF.lasts, lasts: 0.3, stage: rests, set: { to: at, n: 0 } })
      sounds.push({ at: 0.3, sound: 'tread', mover: 'cat:knead' }, { at: 2, run: () => toy.kick('cat:turn') }, { at: 3.1, sound: 'purr', mover: 'cat:purr' })
      sounds.push({ at: GETS_OFF.at, sound: 'hop', mover: 'cat:hop' }, { at: GETS_OFF.at + GETS_OFF.lasts, sound: rests === 'rug' ? 'thud' : 'drum', mover: 'cat:land', run: () => { const top = highest(state); if (rests !== 'rug' && top) toy.kick(`lid:${top.id}`) } })
      // The cushion lies flat on the lid and the cat sits on it.
      cushionBack(4, { x: at.x, y: at.y + 0.09, z: at.z + 0.12, flat: LIES_FLAT, side: 0 })
    } else {
      // It swats a hanging bulb and follows the swing with its whole head.
      stay(3, 'swat')
      const hang: Vec = { x: at.x - 0.55, y: at.y + 1.5, z: at.z + 0.2 }
      toy.bulbsBy = () => Array.from({ length: BULBS }, (_, n) => { const swing = Math.sin(toy.age('cat:swat') * 5) * Math.exp(-toy.age('cat:swat') * 1.2) * 0.3 * (n / BULBS); return { x: hang.x + swing, y: hang.y - n * 0.085, z: hang.z } })
      sounds.push({ at: 0.4, sound: 'tink', mover: 'cat:swat' }, { at: 0.9, sound: 'tink', mover: 'cat:swat', pitch: 0.94 }, { at: 1.7, sound: 'tink', mover: 'cat:swat', pitch: 0.88 }, { at: 3, run: () => { toy.bulbsBy = null; toy.kick('bulbs') } })
    }
  } else if (who === 'baby') {
    if (thing === 'tape') {
      // It takes the roll and bowls it over the rug; the roll circles and falls flat.
      stay(3.2, 'bowl')
      sounds.push({ at: 0.6, sound: 'trundle', mover: 'roll' })
    } else if (thing === 'blanket') {
      // It pulls a corner over its own head, and whips it off again: silence under it, then a squeal.
      poses.push({ who, at: 0, lasts: 1.6, stage: 'hide' }, { who, at: 1.6, lasts: 0.9, stage: 'reveal' })
      const over = mound({ x: at.x, y: BABY.y - 0.25, z: at.z }, 1.0, 0.62, () => 9)
      toy.clothBy = over
      sounds.push({ at: 0, sound: 'whoomp', mover: 'cloth', pitch: 1.3 }, { at: 1.6, sound: 'squeal', mover: 'baby:reveal', run: (finishing) => { if (!finishing) toy.clothTo(over(), 0.6, [{ p: 1, sound: 'flump', mover: 'cloth', pitch: 1 }]) } }, { at: 2.5, run: () => {} })
    } else if (thing === 'cushion') {
      // It flops face down on it with arms and legs out.
      stay(2.6, 'flop')
      sounds.push({ at: 0.7, sound: 'raspberry', mover: 'baby:flop' })
      // The cushion lies under its chest, nearer the faces than the things at the front of the rug.
      cushionBack(2.6, { x: at.x + 0.55, y: 0.12, z: at.z - 0.12, flat: 1, side: 0 })
    } else {
      // It takes the loose end and shakes it so every bulb jumps.
      stay(2.6, 'shake')
      toy.bulbsBy = () => Array.from({ length: BULBS }, (_, n) => { const jump = Math.abs(Math.sin(toy.time * 13 + n * 1.3)) * 0.14 * Math.max(Math.exp(-toy.age('bulbs:jump') * 1.6), 0); return { x: at.x + 0.3 + n * 0.14, y: SHAKEN.high - n * SHAKEN.sags + jump, z: at.z + SHAKEN.out } })
      sounds.push({ at: 0.4, sound: 'jingle', mover: 'bulbs:jump' }, { at: 1.3, sound: 'jingle', mover: 'bulbs:jump', pitch: 1.1 }, { at: 2.6, run: () => { toy.bulbsBy = null; toy.kick('bulbs') } })
    }
  } else if (thing === 'tape') {
    // She presses every strip flat with her thumb, one after another, in one walk along the fort and back.
    const strips = state.tapes.map((pair, n) => ({ n, seam: seamOf(state, pair) })).filter((strip) => strip.seam !== null).sort((a, b) => b.seam!.at.x - a.seam!.at.x)
    if (strips.length === 0) {
      stay(1.6, 'thumb', { n: -1 })
      sounds.push({ at: 0.4, sound: 'squeak', mover: 'gran:thumb' }, { at: 0.7, sound: 'press', mover: 'strip' })
    } else {
      const far = lane(Math.min(GRAN_OUT.x - 0.5, strips[strips.length - 1].seam!.at.x + 0.35), LANE.gran)
      // The walk is as long as it takes to press them all, a thumb's time apart.
      const out = Math.max(walkTime(GRAN_OUT, far), strips.length * 0.28 + 0.1), end = STANDS_UP + out
      poses.push({ who, at: 0, lasts: STANDS_UP, stage: 'stand', set: { from: CHAIR, to: GRAN_OUT } }, { who, at: STANDS_UP, lasts: out, stage: 'pressing', set: { from: GRAN_OUT, to: far } })
      // Each strip is pressed as she comes level with it.
      let last = STANDS_UP - 0.1
      for (const { n, seam } of strips) {
        const level = Math.max(last + 0.28, STANDS_UP + out * Math.min(1, Math.max(0, (GRAN_OUT.x - (seam!.at.x + 0.35)) / Math.max(0.01, GRAN_OUT.x - far.x))))
        sounds.push({ at: level, sound: 'squeak', mover: 'gran:thumb' }, { at: level + 0.12, sound: 'press', mover: `tape:${n}` })
        last = level
      }
      poses.push(...goesHome(Math.max(end, last + 0.2), far))
    }
  } else if (thing === 'blanket') {
    // Thrown over her, she goes on knitting as a shape under it.
    stay(3.4, 'covered')
    sounds.push({ at: 0, sound: 'whoomp', mover: 'cloth' }, { at: 0.6, sound: 'muffle', mover: 'gran:covered' }, { at: 1.5, sound: 'muffle', mover: 'gran:covered' }, { at: 2.4, sound: 'muffle', mover: 'gran:covered' })
    // It stands over her like a tent, clear of her hat, of her knitting and of the arms of her chair.
    clothBack(3.4, mound({ x: at.x, y: 0.9, z: at.z + 0.25 }, COVERS.wide, COVERS.high, () => Math.sin(toy.time * 9) * 0.05, COVERS.front, COVERS.back))
  } else if (thing === 'cushion') {
    // She sits on it and it lets its air go, slowly, while she looks round.
    stay(3, 'cushionSit')
    sounds.push({ at: 0.4, sound: 'wheeze', mover: 'gran:sit' })
    // It lies flat on the seat under her, and goes back up and over the arm of her chair.
    cushionBack(3, { x: at.x, y: 0.66, z: at.z + 0.2, flat: LIES_FLAT, side: 0 }, 0.95)
  } else {
    // She lifts a loop, looks at it and hangs it round her neck.
    stay(3.4, 'necklace')
    toy.bulbsBy = () => Array.from({ length: BULBS }, (_, n) => { const a = (n / BULBS) * Math.PI * 2; return { x: at.x + Math.sin(a) * 0.3, y: 1.55 - Math.cos(a) * 0.26, z: at.z + 0.5 } })
    toy.kick('gran:loop')
    sounds.push({ at: 1.2, sound: 'hum', mover: 'gran:hum' }, { at: 3.4, run: () => { toy.bulbsBy = null; toy.kick('bulbs') } })
  }
  toy.play(poses, sounds)
}
