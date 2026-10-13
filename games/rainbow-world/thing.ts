import { ALL_PIECES, PIECES, PIECE_IDS, type PieceDef, type PieceId } from './pieces'

// One of the eight things as the world holds it: where it rests (what a save keeps), where it is drawn just
// now, and the few numbers of its pose. Nothing here draws or reads a clock.

/** Where one thing is when everything has come to rest: what a save holds of it. */
export type Rest = { at: 'home' | 'mat' | 'basket'; x: number; y: number; on: PieceId | null; turned: boolean }
export type Places = Record<PieceId, Rest>

/** A flight from where a thing is drawn to where it rests. `rise` is a point it first rises to from inside the basket, still inside, before it flies; `far` is how far in it still is drawn as it sets off, which wears off on the way. */
export type Flight = { sx: number; sy: number; sl: number; t: number; dur: number; arc: number; land: 'knock' | 'tok' | 'quiet' | 'seat' | 'rock'; gain: number; rise: { x: number; y: number } | null; far: number }

/** The short answers that move a thing for a moment (pairs.ts): a lid teeters, a doll shuffles under a collar or ducks in the basket, the horse shakes a ring round, a cradle rocks. */
export type Stir = 'teeter' | 'shuffle' | 'shake' | 'rockOnce' | 'rockHorse' | 'boo'

export type Piece = {
  def: PieceDef
  at: 'home' | 'mat' | 'basket'
  /** Its foot at rest. A thing that rests on another has the foot of the thing at the bottom. */
  x: number
  y: number
  /** What it rests on, or null for the bare mat. */
  on: PieceId | null
  turned: boolean
  /** Its foot as drawn, and how high above it the thing is. */
  px: number
  py: number
  lift: number
  liftV: number
  /** Above 0 squashed, below 0 stretched; a spring that comes back to 0. */
  squash: number
  squashV: number
  hop: number
  hopV: number
  flight: Flight | null
  /** The world's time when it was last turned over, when it last landed, and when it was last answered as half of a pair. */
  turnAt: number
  landAt: number
  stirAt: number
  /** Which short answer it is in the middle of, counted from `stirAt`; null when it is doing none. */
  stir: Stir | null
  gen: number
  /** A scene is moving it: its drawn foot and its pose are the scene's until the scene ends. */
  led: boolean
  // The pose. Each number is read by the view, and each comes back by itself to what the thing's place calls for.
  /** Lean, in radians. Whatever rests on it leans with it. */
  tilt: number
  /** 0 to 1: ducked down. */
  duck: number
  /** 0 to 1: eyes shut. */
  shut: number
  /** -1 a frown to 1 a grin. */
  mood: number
  /** Which way it faces while a scene leads it: -1, 1, or 0 for the way its `turned` gives. */
  way: -1 | 0 | 1
  /** Radians an arch worn as a collar or round a neck has been shaken round. */
  spin: number
  /** 0 to 1: how far into the basket it is. At 1 it is inside: drawn only where the basket lets it show, and smaller in the lying basket. */
  far: number
}

export function homePlaces(): Places {
  return Object.fromEntries(ALL_PIECES.map((def) => [def.id, { at: 'home', x: def.home.x, y: def.home.y, on: null, turned: false }])) as Places
}

/** How the mat lies on a first visit: every thing by the mat, and for the youngest the smallest doll already standing on it. */
export function firstPlaces(smallDollOnMat: boolean): Places {
  const places = homePlaces()
  if (smallDollOnMat) places['doll-small'] = { at: 'mat', x: 700, y: 580, on: null, turned: false }
  return places
}

/** The eight things as a save or a first visit gives them: at rest, nothing in the air, nothing still to come. */
export function makePieces(places: Places): Piece[] {
  return PIECE_IDS.map((id) => {
    const def = PIECES[id], rest = places[id]
    // A thing by the mat lies at its own place, whatever the numbers say.
    const x = rest.at === 'mat' ? rest.x : def.home.x, y = rest.at === 'mat' ? rest.y : def.home.y
    return {
      def, at: rest.at, x, y, on: rest.at === 'mat' ? rest.on : null, turned: rest.turned, px: x, py: y, lift: 0, liftV: 0, squash: 0, squashV: 0, hop: 0, hopV: 0, flight: null,
      turnAt: -Infinity, landAt: -Infinity, stirAt: -Infinity, stir: null, gen: 0, led: false, tilt: 0, duck: 0, shut: 0, mood: 0, way: 0, spin: 0, far: rest.at === 'basket' ? 1 : 0,
    }
  })
}
