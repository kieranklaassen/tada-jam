import { MAKINGS, placeFor, shapeOf, type Kind } from './build'
import { placeOnBrook } from './journey'
import { EDDY, HAND, LAID_OUT, LINE, SEAT, STONE, SUN, clamp, handAt, handFits, type Spot } from './layout'
import { settlePond } from './scenes'
import { boatShown, buildNow, newWorld, toSave, type World, type WorldSave } from './world'

// Opening the world from what was saved, and what the idle ladder may show
// of it. A game that is parked is opened again from its own save, so a
// put-away and a load are one thing: the same still picture, with nothing on
// its way, nothing sounding and nothing in the hand.

/** The world a saved state describes, wherever the boat had come to. */
export function openWorld(save: WorldSave, seed: number): World {
  const w = newWorld(save, seed)
  if (!save.boat.hull) return w
  if (save.finished) settlePond(w)
  else if (save.place === 'brook') placeOnBrook(w, save.journey.reach ?? 0, save.journey.stuck, save.journey.done)
  return w
}

/** Put away: the world as a load would find it. The clock runs on, so nothing that is drawn from it jumps. */
export function parked(w: World, seed: number): World {
  const next = openWorld(toSave(w), seed)
  next.time = w.time
  return next
}

/** Whether something the child set going is still on its way. The idle ladder waits for it. */
export function moving(w: World): boolean {
  if (w.scene || w.hand) return true
  if (w.show.sun > 0) return true
  if (w.pieces.some((piece) => piece.mode !== 'rest')) return true
  const boat = w.boat, j = w.journey
  if (boat.mode === 'held' || boat.mode === 'fall' || boat.mode === 'glide') return true
  // On the brook the boat is on its way unless it waits: found after a load, held at a place, or moored.
  if (boat.mode === 'brook' && j.phase !== 'wait' && j.phase !== 'held' && j.phase !== 'moor') return true
  return w.acts.some((run) => run.brook || run.piece !== null) || w.stage.sprite.breath > 0
}

/** Everything a finger can pick up or lift now: where it is and how wide a glow fits it. At the finished pond that is the sun and nothing else. */
export function touchables(w: World): { x: number; y: number; r: number }[] {
  if (w.finished) return [{ x: SUN.x, y: SUN.pond - w.show.sun, r: SUN.r + 12 }]
  const all: { x: number; y: number; r: number }[] = []
  if (w.frame < 0) for (const piece of w.pieces) if (piece.place.on === 'bank' && piece.mode === 'rest') all.push({ x: piece.x, y: piece.y, r: Math.min(MAKINGS[piece.kind].hw, 70) + 14 })
  const build = buildNow(w)
  // The boat, where it is drawn.
  const boat = boatShown(w)
  if (build.hull && (w.boat.mode === 'stone' || w.boat.mode === 'afloat' || w.boat.mode === 'brook')) all.push({ x: boat.x, y: boat.y - 34, r: MAKINGS[build.hull].hw * 0.6 })
  return all
}

/**
 * The one thing the idle ladder's glow is on: what the ghost hand is about to take, or the water where it is
 * about to lay a finger. One want at a time: a first screen with a glow on everything is a muddle at four.
 */
export function glowAt(w: World): { x: number; y: number; r: number } {
  const move = nextMove(w)
  if (!move.drag) return { x: move.from.x, y: move.from.y, r: 46 }
  let best = { x: move.from.x, y: move.from.y, r: 50 }, nearest = 90
  for (const spot of touchables(w)) {
    const far = Math.hypot(spot.x - move.from.x, spot.y - move.from.y)
    if (far < nearest) { best = spot; nearest = far }
  }
  return best
}

/** What the hand may show going onto a hull, in the order it looks for them: a mast for a free hole, a sail for a mast that stands bare. */
const HAND_MASTS: readonly Kind[] = ['twig', 'stalk', 'stem']
const HAND_SAILS: readonly Kind[] = ['maple', 'birch', 'feather']

/**
 * One move the child could make now, for the ghost hand: a hull carried to the bare stone, a thing carried to
 * the boat, the boat carried to the water, a finger laid in the water behind the boat, or the sun lifted. It
 * shows where a thing can go and never which thing to build with.
 */
export function nextMove(w: World): { drag: boolean; from: Spot; to: Spot } {
  const boat = w.boat
  if (w.finished) {
    const from = { x: SUN.x, y: SUN.pond }
    return { drag: true, from, to: { x: SUN.x, y: SUN.pond - SUN.lift - 30 } }
  }
  if (boat.mode === 'afloat' || boat.mode === 'brook') {
    // Upstream of the boat, which is behind it: the ring sends it on.
    // At the bank the whole hand lies in the water where there is room, so it is not read as pointing at
    // what lies on the cloth; beside the sprite it stays nearer, below her.
    const low = w.journey.low ? 46 : 0
    const x = clamp(boatShown(w).x + 215, 240, 1100)
    const open = w.frame < 0 && x + HAND.right < 940
    const at = { x, y: open ? LINE - 58 : LINE + 42 + low }
    return { drag: false, from: at, to: at }
  }
  // A thing the hand shows lies where the whole hand fits with its fingertip on it.
  const rest = (kind: string): Spot | null => {
    const piece = w.pieces.find((each) => each.kind === kind && each.place.on === 'bank' && each.mode === 'rest' && handFits({ x: each.x, y: each.y }))
    return piece ? { x: piece.x, y: piece.y } : null
  }
  const build = buildNow(w)
  if (!build.hull) {
    // A hull is taken by its rim, which is the part of it nearest the stone.
    const rim = (kind: 'bark' | 'walnut' | 'pod'): Spot | null => {
      const piece = w.pieces.find((each) => each.kind === kind && each.place.on === 'bank' && each.mode === 'rest')
      const at = piece && { x: piece.x, y: Math.round(piece.y - MAKINGS[kind].hh * 0.6) }
      return at && handFits(at) ? at : null
    }
    const hull = rim('bark') ?? rim('walnut') ?? rim('pod') ?? handAt(LAID_OUT.bark.x, LAID_OUT.bark.y)
    return { drag: true, from: hull, to: { x: SEAT.x, y: STONE.edge + 8 } }
  }
  // The first showing is a build, and the hand builds a sail, never a blanket: until the gnome is aboard, which
  // the first thing pressed on makes him, and whenever the hull is bare, it shows a mast going into a free hole,
  // or a leaf going onto a mast that stands bare. It never shows a thing going onto the deck, where a leaf with
  // no mast would hide the gnome for the whole journey. After that the boat goes to the water.
  const bare = build.masts.every((mast) => mast === null) && build.deck.length === 0
  const bareMast = ([0, 1] as const).some((index) => build.masts[index] !== null && build.sails[index] === null)
  const order: readonly Kind[] = bareMast ? HAND_SAILS : HAND_MASTS
  const shape = shapeOf(build)
  // A boat that is masts and nothing else is still shown its leaf, whoever is aboard: the showing ends in a sail.
  const mastsOnly = bareMast && build.deck.length === 0 && build.sails.every((sail) => sail === null)
  for (const kind of bare || mastsOnly || w.gnomeAt === 'stone' ? order : []) {
    const from = rest(kind), slot = placeFor(build, kind, 0)
    if (!from || !slot || slot.on === 'deck') continue
    return { drag: true, from, to: { x: boat.x + shape.holes[slot.index] + 12, y: boat.y - (slot.on === 'sail' ? 150 : 120) } }
  }
  return { drag: true, from: { x: boat.x + 40, y: boat.y - 24 }, to: { x: EDDY.left + 90, y: LINE - 10 } }
}
