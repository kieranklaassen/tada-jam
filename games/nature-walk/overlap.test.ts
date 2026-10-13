import { describe, expect, it } from 'vitest'
import { coverPieces, findPiece, overlap, standing, thingPiece, thingSpots, toadPiece, toadSeats, type Piece } from './footprints'
import { clearAt, freeSpot } from './ground'
import { CORNER, GROUND, HANGERS, HEDGEHOG, NOSE, STONE_SPOT, THING_R, homeControl, type Spot } from './layout'
import { hangerAngle } from './poses'
import { BOWL, TABLE, TABLE_R, TOAD_TABLE } from './room'
import { freshWorld } from './save'
import { Finger, LAPS, SURFACE } from './script'
import { fit } from './stage'
import { drawn, pairsOf, toadRest } from './things'
import { createToy, dwellerAt, type Toy } from './toy'
import { PLACES, SEASONS, THINGS, type PlaceId } from './wood'

// Nothing lies on anything, and nothing a child touches lies under the
// jam's home control or in the grown-up's corner. Every piece is a few discs
// that follow its cut outline from inside (footprints.ts), so two pieces
// whose discs meet would be seen to overlap.
// Two things are held. The layout: every cover where it rests, shut and
// open, every animal, every seat of the toad, every spot the game sets a
// thing on and the pieces on their threads, in every season. And the game
// played: at every moment of the whole walk when everything has come to
// rest, whatever is in the frame then.
// The stage is fitted whole into the surface, so what does not overlap at
// one size does not at another; what changes with the size is where the home
// control and the corner fall on the stage, and that is held at both sizes.

const SURFACES = [{ width: 1180, height: 820 }, { width: 1024, height: 768 }] as const
/** Less than this is the looseness of a disc against a cut outline, and is not seen. */
const SEEN = 2

/** A thing the hedgehog wears is his, and is still held clear of every other thing he wears. */
const own = (a: Piece, b: Piece): boolean => a.owner === b.owner || (a.owner.startsWith('hedgehog/') && b.owner === 'hedgehog') || (b.owner.startsWith('hedgehog/') && a.owner === 'hedgehog')

const clash = (pieces: readonly Piece[], same: (a: Piece, b: Piece) => boolean = own): string[] => {
  const found: string[] = []
  for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) {
    const a = pieces[i], b = pieces[j]
    if (same(a, b)) continue
    const deep = overlap(a, b)
    if (deep > SEEN) found.push(`${a.name} on ${b.name} by ${deep.toFixed(0)}`)
  }
  return found
}

/** A piece of the stage as discs in the pixels of a surface. */
function onSurface(piece: Piece, surface: { width: number; height: number }): Spot[] {
  const by = fit(surface.width, surface.height)
  return piece.discs.map((disc) => ({ x: by.x + disc.x * by.scale, y: by.y + disc.y * by.scale, r: disc.r * by.scale }))
}

const hangers = (toy: Toy): Piece[] => HANGERS.map((hanger, index) => {
  const angle = hangerAngle(toy, index)
  return { name: `${hanger.kind} on its thread`, owner: `hanger ${index}`, discs: [{ x: hanger.x + Math.sin(angle) * hanger.thread, y: hanger.y - hanger.thread + Math.cos(angle) * hanger.thread, r: hanger.kind === 'bird' ? 30 : 44 }] }
})

/** Everything in the wood as the model has it at rest. */
function woodPieces(toy: Toy): Piece[] {
  const pieces: Piece[] = [...standing(), ...hangers(toy)]
  for (const place of PLACES) {
    pieces.push(...coverPieces(place, toy.covers[place].open))
    if (toy.covers[place].open && !THINGS.includes(dwellerAt(toy, place) as never)) pieces.push(findPiece(place))
  }
  const toad = toadRest(toy)
  if (!toad.room) pieces.push(toadPiece(toad.feet))
  for (const thing of THINGS) {
    const where = toy.things[thing], seen = drawn(toy, thing)
    if (!seen || seen.room) continue
    // In its hollow it is its place's; in the nest it is the jay's; on his spines or his ball it is the hedgehog's.
    const owner = where.at === 'puddle' ? 'puddle' : where.at === 'home' ? PLACES.find((place) => dwellerAt(toy, place) === thing)! : where.at === 'nest' ? 'jay' : where.at === 'hedgehog' || (thing === 'snail' && toy.perch.snail) || (thing === 'feather' && toy.perch.feather) ? `hedgehog/${thing}` : thing
    pieces.push({ ...thingPiece(seen.at, thing), owner })
  }
  return pieces
}

const BOWL_PIECE: Piece = { name: 'bowl', owner: 'bowl', discs: [{ x: 108, y: 596, r: 40 }, { x: 150, y: 604, r: 44 }, { x: 192, y: 596, r: 40 }] }

/** Everything on the table as the model has it at rest. The two of a pair are one. */
function roomPieces(toy: Toy): Piece[] {
  const pieces: Piece[] = [BOWL_PIECE]
  const toad = toadRest(toy)
  if (toad.room) pieces.push({ name: 'toad on the table', owner: 'toad', discs: [{ x: toad.feet.x, y: toad.feet.y - 46, r: 44 }, { x: toad.feet.x - 30, y: toad.feet.y - 30, r: 36 }, { x: toad.feet.x + 30, y: toad.feet.y - 30, r: 36 }] })
  const couples = pairsOf(toy)
  for (const thing of THINGS) {
    const where = toy.things[thing]
    if (where.at !== 'table' && where.at !== 'bowl') continue
    const seen = drawn(toy, thing)
    if (!seen) continue
    const couple = couples.find((one) => one.first === thing || one.second === thing)
    // A paired thing is held by where it is saved: its pose leans it on the other, which is the pair's act.
    const at = couple && where.at === 'table' ? { x: where.x, y: where.y } : seen.at
    pieces.push({ name: thing, owner: where.at === 'bowl' ? 'bowl' : couple ? couple.pair : thing, discs: [{ x: at.x, y: at.y, r: TABLE_R - 4 }] })
  }
  return pieces
}

describe('nothing lies on anything', () => {
  it('in the layout: every cover shut and open, every animal, every seat of the toad and every spot a thing is set on', () => {
    // Each cover shut or open, against everything that stands, and against every other cover in either state.
    const covers = (open: (place: PlaceId) => boolean): Piece[] => PLACES.flatMap((place) => [...coverPieces(place, open(place)), ...(open(place) ? [findPiece(place)] : [])])
    for (let mask = 0; mask < 1 << PLACES.length; mask++) {
      const pieces = [...standing(), ...covers((place) => (mask & (1 << PLACES.indexOf(place))) !== 0)]
      expect(clash(pieces), `covers ${mask.toString(2)}`).toEqual([])
    }
    const anyCover = [false, true].flatMap((open) => PLACES.flatMap((place) => [...coverPieces(place, open), ...(open ? [findPiece(place)] : [])]))
    const moved = (piece: Piece): boolean => piece.owner === 'toad' || piece.name.startsWith('thing ')
    const different = (a: Piece, b: Piece): boolean => (a.owner === b.owner && !(moved(a) && b.name.startsWith('puddle '))) || (!moved(a) && !moved(b))
    // The toad on each of his seats is clear of every cover in both its states, every animal and every hanging piece.
    for (const seat of toadSeats()) expect(clash([seat, ...standing(), ...anyCover], different), seat.name).toEqual([])
    // Every spot the game sets a thing on is clear of every cover in both its states and of every animal.
    for (const spot of thingSpots()) {
      const piece = { ...spot, owner: spot.name === 'thing in the puddle' ? 'puddle' : 'thing' }
      // The thing set before the hedgehog lies at the tip of his nose, and the thing on the stone beside the toad: each is held below.
      expect(clash([piece, ...standing(), ...anyCover], different), spot.name).toEqual([])
    }
    // On his stone, the toad and the thing beside him do not touch; nor do the hedgehog and what lies before him.
    expect(overlap(toadSeats()[0], thingPiece(STONE_SPOT, 'thing'))).toBeLessThanOrEqual(SEEN)
    expect(Math.hypot(NOSE.x - HEDGEHOG.x, NOSE.y - HEDGEHOG.y)).toBeGreaterThan(HEDGEHOG.r + THING_R)
  })

  it('on the open ground: wherever a thing may be let go, it is set on ground that nothing covers, with every cover open and shut', () => {
    for (const open of [[], [...PLACES]]) {
      const toy = createToy({ ...freshWorld(null), open, finished: false }, 1)
      const all = [...standing(), ...PLACES.flatMap((place) => coverPieces(place, open.length > 0))]
      for (const box of GROUND) for (let x = box.x0; x <= box.x1; x += 12) for (let y = box.y0; y <= box.y1; y += 12) {
        const spot = freeSpot(toy, { x, y }, 'acorn')
        expect(clearAt(toy, spot, 'acorn'), `${x},${y}`).toBe(true)
        const piece = thingPiece(spot, 'thing')
        for (const other of all) expect(overlap(piece, other), `thing at ${spot.x},${spot.y} on ${other.name}`).toBeLessThanOrEqual(SEEN)
      }
    }
  })

  it('on the hedgehog: the apple on his spines, the snail on the ball and the feather stuck in it, all three at once', () => {
    const world = { ...freshWorld(null), rolled: true, finished: false }
    world.things.apple = { at: 'hedgehog' }
    world.things.snail = { at: 'path', x: NOSE.x, y: NOSE.y }
    world.things.feather = { at: 'path', x: NOSE.x + 80, y: NOSE.y }
    const toy = createToy(world, 1)
    toy.perch.snail = true
    toy.perch.feather = true
    expect(clash(woodPieces(toy))).toEqual([])
  })

  it('in every season, with the pieces on their threads at rest and at the end of their swing', () => {
    for (const season of SEASONS) for (const open of [[], [...PLACES]]) {
      const toy = createToy({ ...freshWorld(null), season, open, finished: false }, 1)
      expect(clash(woodPieces(toy)), `${season}, covers ${open.length ? 'open' : 'shut'}`).toEqual([])
      // Knocked as hard as it goes, each hanging piece swings clear of the next and of everything under it.
      HANGERS.forEach((_, index) => {
        for (const since of [0.2, 0.45, 0.7, 1.1]) {
          toy.knock = { at: { x: 0, y: 0 }, since: toy.time - since, hanger: index }
          expect(clash(woodPieces(toy)), `${season}, hanger ${index} knocked`).toEqual([])
        }
      })
    }
  })

  it.each(SURFACES)('under the home control or in the grown-up\'s corner at $width by $height: nothing a child touches', (surface) => {
    const home = homeControl(surface.width)
    const toy = createToy({ ...freshWorld(null), finished: false }, 1)
    const touched = [...standing(), ...hangers(toy), ...toadSeats(), ...thingSpots(), ...[false, true].flatMap((open) => PLACES.flatMap((place) => coverPieces(place, open)))]
    for (const piece of touched) for (const disc of onSurface(piece, surface)) {
      expect(Math.hypot(disc.x - home.x, disc.y - home.y) - disc.r - home.r, `${piece.name} and the home control`).toBeGreaterThanOrEqual(0)
      const inCorner = disc.x + disc.r > surface.width - CORNER && disc.y - disc.r < CORNER
      expect(inCorner, `${piece.name} and the corner`).toBe(false)
    }
    // The table and the bowl are low in the room, far from both.
    const by = fit(surface.width, surface.height)
    expect(by.y + (TABLE.y0 - 80) * by.scale).toBeGreaterThan(home.y + home.r)
    expect(by.y + (BOWL.y - BOWL.r) * by.scale).toBeGreaterThan(CORNER)
    expect(TOAD_TABLE.x0).toBeGreaterThan(BOWL.x + BOWL.r)
  })

  it('in the game as it is played: at every moment of the whole walk when everything has come to rest', () => {
    const found = new Map<string, string>()
    let looked = 0
    const finger: Finger = new Finger(1, 20, (toy, doing) => {
      if (finger === undefined || finger.busy || toy.hand) return
      looked += 1
      for (const line of [...clash(woodPieces(toy)), ...clash(roomPieces(toy))]) if (!found.has(line)) found.set(line, `${doing}, ${toy.season}, at ${toy.time.toFixed(1)} s`)
    })
    for (const lap of Object.values(LAPS)) lap(finger)
    expect(SURFACE).toEqual(SURFACES[0])
    expect(looked).toBeGreaterThan(2000)
    expect([...found].map(([line, when]) => `${line} (${when})`)).toEqual([])
  }, 30000)
})
