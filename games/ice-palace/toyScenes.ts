import { bears, freeSpot, widthOf } from './blocks'
import { SUN } from './ground'
import { MOST_LAMPS, lampsOf } from './night'
import { Scene } from './scene'
import { STEP, type Piece, type Toy } from './toy'
import { hareBolts, hareOut, relight } from './toyDay'
import { skateAt, skateOf } from './toyKids'
import { hatsOff, kingSend, kingSettle } from './toyKing'
import { CLOSE_S, lying, react, wall, wallPieces } from './toyPieces'

// The two short scenes (ART.md, "The scenes"): dusk, when the child pulls the
// sun down, and morning, when the child lifts it. Each saves its whole
// outcome when it starts, plays over the clock of play, and gives way to a
// touch, which lands every beat without a sound.

/** How long each scene is, in seconds. */
export const DUSK_S = 9
export const MORNING_S = 5

const ease = (p: number): number => p * p * (3 - 2 * p)
const mix = (a: number, b: number, p: number): number => a + (b - a) * p

/** Where the two frost children are `p` of the way through their skate: each on its own way round the open water and whatever lies, worked out when the skate starts. */
function skate(toy: Toy, p: number, out: boolean): void {
  toy.skate ??= skateOf(toy, out)
  skateAt(toy, toy.skate, ease(p), out)
}

/**
 * Dusk: the lamps. Saved when it starts: the sun is down, and with it the ending. Nothing else changes, since
 * the scene moves no block; a hat comes off as the king leaves his place, to where the save already had it.
 */
export function dusk(toy: Toy): void {
  const from = toy.sunY
  let yawned = false, skating = false, sent = false
  const scene = new Scene([
    {
      // The sun yawns and sinks; the blue floods the sheet.
      at: 0, lasts: 1.6,
      play: (p, finishing) => {
        if (!yawned && !finishing) toy.say({ name: 'yawn' })
        yawned = true
        toy.sunY = mix(from, SUN.night, ease(p))
        toy.sunV = 0
        toy.flood = p
      },
    },
    {
      // The frost children skate out over the pond; the lamp child comes in to the wall and hangs the lamps one by one, each lit as it is hung.
      at: 1.6, lasts: 3.4,
      play: (p, finishing) => {
        if (!skating && !finishing) toy.say({ name: 'skate' })
        skating = true
        skate(toy, p, true)
        const lamps = lampsOf(wall(toy)).length
        // A lamp is hung, and lights, when the lamp child has come to stand under its place: never while both are out on the pond.
        const at = ease(p), hung = p >= 1 ? lamps : Math.min(lamps, (toy.skate?.hang ?? []).filter((share) => share <= at + 1e-9).length)
        if (toy.lampsLit > lamps) toy.lampsLit = 0
        while (toy.lampsLit < hung) {
          toy.lampsLit += 1
          relight(toy, !finishing)
          if (!finishing) toy.say({ name: 'lampLit', lively: toy.lampsLit / Math.max(1, lamps) })
        }
        if (p >= 1) {
          toy.lampsLit = MOST_LAMPS
          relight(toy, false)
        }
      },
    },
    {
      // King Winter walks in by the widest gap and sits on the highest block that will bear him, or in the snow.
      at: 5, lasts: DUSK_S - 5,
      play: (_p, finishing) => {
        if (!sent) kingSend(toy, true)
        sent = true
        if (finishing) kingSettle(toy)
      },
    },
  ])
  toy.scene = scene
  toy.skate = null
  toy.lampsLit = 0
  scene.start(toy.time, () => {
    toy.night = true
    hatsOff(toy)
    // The hare keeps to the day: caught out by the dusk, it dashes for the nearer of its firs.
    if (hareOut(toy)) {
      react(toy, 'hare', 'bolt')
      hareBolts(toy)
    }
    toy.mark('now')
  })
}

/** Whether a standing block has open sky above it: nothing in the wall is over any of its length. */
function openSky(toy: Toy, piece: Piece): boolean {
  const w = widthOf(piece)
  return wallPieces(toy, piece).every((other) => other.rest.y >= piece.rest.y || Math.abs(other.rest.x - piece.rest.x) >= (w + widthOf(other)) / 2)
}

/**
 * Morning: fresh snow. Saved when it starts, all at once: the day, a whole pond, a full drift and bough, a cap
 * on every block that stands in the open, an icicle that was frozen into the pond lying beside where it stood,
 * and anything afloat lying on the ice where it floated. The surface arrives there beat by beat.
 */
export function morning(toy: Toy): void {
  const from = toy.sunY
  let stretched = false, home = false, fresh = false
  const scene = new Scene([
    {
      // The sun stretches and rises; the paper comes back.
      at: 0, lasts: 1.4,
      play: (p, finishing) => {
        if (!stretched && !finishing) toy.say({ name: 'stretch' })
        stretched = true
        toy.sunY = mix(from, SUN.day, ease(p))
        toy.sunV = 0
        toy.flood = 1 - p
      },
    },
    {
      // The frost children skate home with their lamps; the king stands, shakes and walks back.
      at: 1.2, lasts: 1.8,
      play: (p, finishing) => {
        if (!home) {
          kingSend(toy, false, !finishing)
          if (!finishing) toy.say({ name: 'skate' })
        }
        home = true
        skate(toy, p, false)
        const lamps = toy.nightNow.lamps.length
        const left = p >= 1 ? 0 : Math.min(lamps, Math.ceil((1 - p) * lamps))
        if (left !== toy.lampsLit) {
          toy.lampsLit = left
          relight(toy, false)
        }
        if (finishing) kingSettle(toy)
      },
    },
    {
      // Snow falls: caps settle, the holes skin over, the drift fills and the bough grows its icicles.
      at: 3, lasts: MORNING_S - 3,
      play: (p, finishing) => {
        if (!fresh) {
          toy.snowing = MORNING_S - 3
          for (const hole of toy.holes) if (hole.closing === 0) hole.closing = STEP / CLOSE_S
          for (const piece of toy.pieces) if (piece.mode === 'rest' && (piece.x !== piece.rest.x || piece.y !== piece.rest.y)) Object.assign(piece, { mode: 'fall', age: 0, vy: 0 })
          if (!finishing) toy.say({ name: 'snowfall' })
        }
        fresh = true
        if (p >= 0.5) {
          toy.driftShown = toy.drift
          toy.iciclesShown = [...toy.icicles]
        }
        if (!finishing) return
        toy.snowing = 0
        toy.holes.length = 0
        for (const piece of toy.pieces) Object.assign(piece, { mode: 'rest', age: 0, vy: 0, x: piece.rest.x, y: piece.rest.y, capAge: 1 })
      },
    },
  ])
  toy.scene = scene
  toy.skate = null
  scene.start(toy.time, () => {
    toy.night = false
    for (const hole of toy.holes) hole.shut = true
    toy.drift = 0
    toy.icicles = []
    for (const piece of wallPieces(toy)) {
      if (piece.rest.place !== 'built' || !bears(piece.kind) || piece.cap || !openSky(toy, piece)) continue
      piece.cap = true
      piece.capAge = 0
    }
    for (const piece of toy.pieces) {
      if (piece.rest.place !== 'frozen' && piece.rest.place !== 'afloat') continue
      const beside = piece.rest.place === 'frozen' ? 30 : 0
      const spot = freeSpot(widthOf(piece), piece.rest.x + beside, piece.rest.y, lying(toy, piece), [])
      piece.rest = { x: spot.x, y: spot.y, place: 'lying' }
      piece.on = 'ice'
    }
    toy.mark('now')
  })
}

/** A touch, or a put-away: the scene ends now with every beat landed, and nothing of it is heard. */
export function endScene(toy: Toy): void {
  if (toy.scene?.running) toy.scene.finish()
  toy.scene = null
}
