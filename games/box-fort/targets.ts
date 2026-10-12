import { isGone } from './face'
import { loaded, rects, tapeEnd, type Rect } from './fort'
import { CAMERA, CELL, CORNER, FLAP, FRONT_Z, GRAN, HEAP, HOME, ROLL, SWITCH, faceAt, kindOf, onPlane, project, type Vec } from './layout'
import { babyDraw, babyMiddle, catDraw, catMiddle, granDraw, granMiddle, handOf } from './people'
import { PIECE_OUT, PIECE_RUG, heaped, lightsGrip } from './rest'
import type { Target, Toy } from './toy'

// Where a finger finds each thing: at the place it is drawn, from the same
// numbers the view lays on the board. The list is in the order a touch is
// answered: whoever and whatever stands in front first. Every spot is at
// least 48 px across on the surface, whatever its drawn size.

/** The smallest half-size of a spot on the surface, in its pixels. */
export const MIN_HALF = 24

export type Spot = {
  target: Target
  at: Vec
  /** Half its width and height, in metres. */
  hw: number
  hh: number
  /** A spot that counts only where this holds: a cushion in a box is taken through a hole. */
  when?: (at: Vec) => boolean
}

/** Whether a box shows its lid, which is what a finger takes it by: nothing rests on it, and neither the blanket nor the grandmother has it. A box she sits in keeps its lid, and creaks when it is touched there. */
export function flapShows(toy: Toy, rect: Rect): boolean {
  const state = toy.state
  return !rect.side && !loaded(state, rect.id) && !state.blanket.includes(rect.id) && !(state.gran.at === 'skirt' && state.gran.box === rect.id)
}

/** The middle of a box's lid flap as it is drawn: along the back edge of its top. */
export function flapAt(toy: Toy, id: number): Vec {
  const pose = toy.poseOf(`box:${id}`), kind = kindOf(id)
  return { x: pose.x, y: pose.y + kind.h + FLAP / 2, z: FRONT_Z - kind.d + 0.03 }
}

/**
 * The lid of a box as a finger finds it: the flap that stands up along its back edge and the top of the box in
 * front of it, down to the front edge of the top as the camera sees it. A drag that starts here carries the
 * box; one that starts on its face cuts it.
 */
export function lidSpot(toy: Toy, id: number): { at: Vec; hw: number; hh: number } {
  const flap = flapAt(toy, id), kind = kindOf(id), top = flap.y - FLAP / 2
  // Where the front edge of the top is seen, measured in the plane the flap stands in.
  const edge = CAMERA.at.y + ((top - CAMERA.at.y) * (CAMERA.at.z - flap.z)) / (CAMERA.at.z - FRONT_Z)
  const low = Math.min(edge, top), high = top + FLAP
  return { at: { x: flap.x, y: (low + high) / 2, z: flap.z }, hw: kind.w * 0.46, hh: (high - low) / 2 }
}

/** Where the fallen piece lies, and the one before it until it is swept: the middle of each as a finger finds it. */
export function pieceAt(toy: Toy): { key: number; at: Vec; hw: number }[] {
  // The newest first: it lies on top.
  return [toy.piece, ...[...toy.olds].reverse()].filter((piece) => piece !== null && piece.landed && piece.swept === null).map((piece) => ({ key: piece!.key, at: { x: piece!.lies, y: 0.06, z: FRONT_Z + PIECE_OUT + PIECE_RUG.deep / 2 }, hw: Math.max(0.1, piece!.half) }))
}

/** The arm of the grandmother's chair that is turned to the room: it answers for her when a stack stands in front of her. */
export const CHAIR_ARM: Vec = { x: GRAN.x + 0.8, y: 0.6, z: GRAN.z - 0.2 + 0.55 }

/** The tape roll as it is drawn: where it lies, how far it has turned, and how far it has tipped over flat. */
/** The roll as the baby bowls it: how high it comes over the toys on its way to the hand, how far through its run it is set down, how wide its circle is, how far to the front it bulges, and the one hop it makes over the block beside the baby as it is let go: how high, and how far through its run it lands. */
export const BOWL = { over: 0.3, set: 0.12, wide: 0.3, front: 0.1, hop: 0.18, lands: 0.12 }

export function rollAt(toy: Toy): { at: Vec; spin: number; flat: number } {
  const by = toy.rollBy?.()
  if (by) return { at: by, spin: 0, flat: by.flat }
  const baby = toy.shows.baby
  if (baby.stage === 'bowl') {
    // The baby takes it and bowls it: it comes up over the toys to the baby's hand, is set down in front of them, circles
    // over the front of the rug, comes back to its place and falls flat. It rolls through nothing that lies there.
    const t = baby.p * 3.2, hand = handOf(babyDraw(toy))
    if (t < 0.6) { const u = t / 0.6; return { at: { x: ROLL.x + (hand.x - ROLL.x) * u, y: ROLL.y + (hand.y - ROLL.y) * u + Math.sin(u * Math.PI) * BOWL.over, z: ROLL.z + (hand.z - ROLL.z) * u }, spin: 0, flat: 0 } }
    const u = Math.min(1, (t - 0.6) / 2.2), back = u * u * (3 - 2 * u), wide = Math.sin(u * Math.PI) * BOWL.wide
    const out = Math.min(1, u / BOWL.set), down = Math.min(1, Math.max(0, (u - BOWL.set * 0.6) / (BOWL.set * 0.4)))
    return { at: { x: hand.x + (ROLL.x - hand.x) * back + Math.sin(u * Math.PI * 2) * wide, y: hand.y + (ROLL.y - hand.y) * down * down + Math.sin(Math.min(1, u / BOWL.lands) * Math.PI) * BOWL.hop, z: hand.z + (ROLL.z + BOWL.front * Math.sin(u * Math.PI) - hand.z) * out * (2 - out) }, spin: u * 14, flat: Math.max(0, (u - 0.85) / 0.15) * Math.abs(Math.cos(u * 40)) * 0.5 }
  }
  // Let go of, the strip winds back on and the roll spins.
  const spun = toy.age('roll')
  return { at: ROLL, spin: spun < 0.5 ? spun * 30 : 0, flat: 0 }
}

/** Where a finger takes the blanket: the middle of its front edge. */
export function blanketGrip(toy: Toy): { at: Vec; hw: number; hh: number } {
  const cloth = toy.cloth(), mid = cloth.xs.length >> 1, last = cloth.xs.length - 1
  const hh = Math.max(0.15, cloth.hang / 2)
  return { at: { x: cloth.xs[mid], y: cloth.ys[mid] + 0.04 - hh, z: cloth.front }, hw: Math.max(0.3, (cloth.xs[last] - cloth.xs[0]) / 2), hh }
}

/** Every box whose face can be cut: standing upright, the one the grandmother wears included. */
export function cuttable(toy: Toy): Rect[] {
  return rects(toy.state).filter((rect) => !rect.side)
}

/** Whether a place of the front plane is on board: on a face that stands, where it has not been cut away. */
export function onBoard(toy: Toy, at: Vec): boolean {
  const face = faceAt(at, cuttable(toy))
  return face !== null && !isGone(toy.state.boxes[face.id].face, Math.floor(face.cx), Math.floor(face.cy))
}

/** Stages in which the cat is at a hole, where it is its own target and no cut starts on the board round it. */
const AT_HOLE = ['look', 'rise', 'back', 'stuck', 'enter']

/** Every spot a finger can find now, in the order a touch is answered. Faces come as one spot each. */
export function spots(toy: Toy): Spot[] {
  const state = toy.state, found: Spot[] = []
  const hand = toy.hand
  // A thing that hangs where it was let go is the first thing a finger finds.
  if (hand && hand.lifted !== null) found.push({ target: { kind: 'hand' }, at: { x: hand.at.x, y: hand.at.y, z: FRONT_Z }, hw: 0.32, hh: 0.32 })
  const cat = catDraw(toy), baby = babyDraw(toy), gran = granDraw(toy)
  // Whoever is behind the faces is found only where no board is in front of them: on the board the scissors cut.
  const seen = (at: Vec, always = false): Spot['when'] => (always || at.z >= FRONT_Z - 0.05 ? undefined : (touch) => !onBoard(toy, touch))
  // The end of the string hangs in front of whoever it hangs before: draped past the grandmother's chair, it is still the string a finger takes.
  if (hand?.kind !== 'lights') found.push({ target: { kind: 'lights' }, at: lightsGrip(state), hw: 0.24, hh: state.lights.length === 0 && !state.tangled ? 0.3 : 0.24 })
  const catAt = catMiddle(cat), babyIs = babyMiddle(baby), granIs = granMiddle(gran)
  found.push({ target: { kind: 'cat' }, at: catAt, hw: cat.body.show ? 0.32 : 0.27, hh: cat.body.show ? 0.45 * Math.max(0.5, cat.body.sy) : 0.24, when: seen(catAt, AT_HOLE.includes(toy.shows.cat.stage)) })
  // The ball in the baby's hand and the block by its knee, while the baby sits with them.
  if (baby.body && toy.shows.baby.stage === 'sit') for (const index of [1, 2]) if (state.toys[index] < 0) found.push({ target: { kind: 'toy', index }, at: index === 1 ? handOf(baby) : { x: baby.x + 0.56, y: baby.y + 0.1, z: baby.z + 0.27 }, hw: 0.1, hh: 0.1 })
  found.push({ target: { kind: 'baby' }, at: babyIs, hw: baby.body ? 0.36 : 0.3, hh: baby.body ? 0.45 : 0.2, when: seen(babyIs) })
  found.push({ target: { kind: 'gran' }, at: granIs, hw: 0.4, hh: 0.6, when: seen(granIs) })
  const standing = rects(state)
  state.cushions.forEach((where, index) => {
    if (where < 0 || (hand?.kind === 'cushion' && hand.id === index)) return
    const rect = standing.find((box) => box.id === where)
    if (!rect) return
    const face = state.boxes[where].face
    // In a box it is taken through a hole it shows at.
    found.push({ target: { kind: 'cushion', index }, at: toy.poseOf(`cushion:${index}`), hw: 0.38, hh: 0.33, when: (at) => isGone(face, Math.floor((at.x - (rect.x - rect.w / 2)) / CELL), Math.floor((at.y - rect.foot) / CELL)) })
  })
  for (const rect of standing) if (!rect.side) found.push({ target: { kind: 'face', id: rect.id, cx: 0, cy: 0 }, at: { x: rect.x, y: rect.foot + rect.h / 2, z: FRONT_Z }, hw: rect.w / 2, hh: rect.h / 2 })
  for (const rect of standing) {
    if (hand?.kind === 'box' && hand.members.includes(rect.id)) continue
    // A box on its side is taken anywhere on it; one that stands, by its lid flap.
    if (rect.side) found.push({ target: { kind: 'flap', id: rect.id }, at: { x: rect.x, y: rect.foot + rect.h / 2, z: FRONT_Z }, hw: rect.w / 2, hh: rect.h / 2 })
    else if (flapShows(toy, rect)) found.push({ target: { kind: 'flap', id: rect.id }, ...lidSpot(toy, rect.id) })
  }
  // The loose tape end sticks out past the fort's right wall: it is found beside the box, never on a face.
  const tab = tapeEnd(state)
  if (tab && hand?.kind !== 'tab') found.push({ target: { kind: 'tab' }, at: tab, hw: 0.15, hh: 0.15 })
  // In her chair behind a stack she is reached by the arm of the chair.
  if (state.gran.at === 'chair' && toy.shows.gran.stage === 'chair') found.push({ target: { kind: 'gran' }, at: CHAIR_ARM, hw: 0.2, hh: 0.42, when: (touch) => !onBoard(toy, touch) })
  for (const piece of pieceAt(toy)) found.push({ target: { kind: 'piece', key: piece.key }, at: piece.at, hw: piece.hw, hh: 0.06 })
  if (hand?.kind !== 'blanket') { const grip = blanketGrip(toy); found.push({ target: { kind: 'blanket' }, at: grip.at, hw: grip.hw, hh: grip.hh }) }
  if (hand?.kind !== 'tape') found.push({ target: { kind: 'roll' }, at: rollAt(toy).at, hw: 0.2, hh: 0.2 })
  const pile = heaped(state).filter((id) => !(hand?.kind === 'box' && hand.id === id))
  // The heap is where a box is taken from, and where one is let go to fold it away.
  found.push({ target: { kind: 'heap' }, at: { x: HEAP.x, y: 0.05 + pile.length * 0.035, z: HEAP.z }, hw: 0.5, hh: 0.14 + pile.length * 0.02 })
  state.cushions.forEach((where, index) => {
    if (where >= 0 || (hand?.kind === 'cushion' && hand.id === index)) return
    found.push({ target: { kind: 'cushion', index }, at: toy.poseOf(`cushion:${index}`), hw: 0.38, hh: 0.33 })
  })
  found.push({ target: { kind: 'switch' }, at: SWITCH, hw: 0.2, hh: 0.24 })
  return found
}

/** A spot as it lies on a surface of this size: its middle and its half-sizes in pixels, never under 24. */
export function onSurface(spot: Spot, width: number, height: number): { x: number; y: number; hw: number; hh: number } {
  const seen = project(spot.at, width, height)
  return { x: seen.x, y: seen.y, hw: Math.max(MIN_HALF, spot.hw * seen.scale), hh: Math.max(MIN_HALF, spot.hh * seen.scale) }
}

/**
 * What lies under a point of the surface. `letGo` is set for the place a carried thing is let go over: that is
 * never the thing itself where it hangs, and never the end of the string, which hangs in front of whoever the thing is for.
 */
export function targetAt(toy: Toy, px: number, py: number, width: number, height: number, letGo = false): Target {
  const where = onPlane(px, py, width, height, FRONT_Z)
  for (const spot of spots(toy)) {
    if (letGo && (spot.target.kind === 'hand' || spot.target.kind === 'lights')) continue
    if (spot.target.kind === 'face') {
      const face = faceAt(where, cuttable(toy).filter((rect) => rect.id === (spot.target as { id: number }).id))
      if (face) return { kind: 'face', ...face }
      continue
    }
    const seen = onSurface(spot, width, height)
    if (Math.abs(px - seen.x) <= seen.hw && Math.abs(py - seen.y) <= seen.hh && (!spot.when || spot.when(where))) return spot.target
  }
  return { kind: 'air' }
}

/** Whether a point of the surface is in the grown-up's corner, which answers nothing in the game. */
export function inCorner(px: number, py: number, width: number): boolean {
  return width > 0 && px >= width - CORNER && py <= CORNER
}

/** How far a point of the surface is from the middle of the home control, in pixels. */
export function fromHome(px: number, py: number, width: number): number {
  return Math.hypot(px - width / 2, py - (HOME.top + HOME.radius))
}

