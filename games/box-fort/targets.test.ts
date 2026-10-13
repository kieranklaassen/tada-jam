import { describe, expect, it } from 'vitest'
import { CASES, perform } from './cases'
import { rects, topOf } from './fort'
import { ON_HEAP, ON_RUG, freshFort, type FortState } from './fortState'
import { CORNER, FRONT_Z, HOME, MAX_TOP, RUG, project } from './layout'
import { babyDraw, babyMiddle, catDraw, catMiddle, granDraw, granMiddle, reaches } from './people'
import type { Play } from './play'
import { PIECE_OUT, PIECE_RUG, pieceRest } from './rest'
import { MIN_HALF, lidSpot, fromHome, inCorner, onSurface, rollAt, spots, targetAt, type Spot } from './targets'
import { SURFACES, builtFort, hole, playOf } from './testing'
import type { Target } from './toy'

const same = (a: Target, b: Target): boolean => a.kind === b.kind && (a.kind !== 'flap' || a.id === (b as { id: number }).id) && (a.kind !== 'cushion' || a.index === (b as { index: number }).index) && (a.kind !== 'face' || a.id === (b as { id: number }).id)
const name = (target: Target): string => JSON.stringify(target)

/** Whether a finger can find this spot: some place of it on the surface answers as it. */
function findable(play: Play, spot: Spot): boolean {
  const seen = onSurface(spot, play.width, play.height)
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
    const x = seen.x - seen.hw + (seen.hw * 2 * i) / 8, y = seen.y - seen.hh + (seen.hh * 2 * j) / 8
    if (same(targetAt(play.toy, x, y, play.width, play.height), spot.target)) return true
  }
  return false
}

/** The states the game can be left in: every act of the grid as it starts and as it ends, on both surfaces. */
function everyState(surface: readonly [number, number]): { label: string; play: Play }[] {
  return CASES.flatMap((entry) => [{ label: `${entry.name} (before)`, play: playOf(entry.from(), 1, surface) }, { label: `${entry.name} (after)`, play: perform(entry, Infinity, undefined, surface).play }])
}

/** The highest fort the boxes allow, in the middle of the rug, with the cat on top. */
function tallest(x: number): FortState {
  const state = freshFort(8)
  Object.assign(state.boxes[0], { x: Math.round(x * 100) })
  Object.assign(state.boxes[1], { x: Math.round(x * 100), on: 0 })
  return state
}

describe('where a finger finds things', () => {
  it.each(SURFACES)('gives everything a spot of 48 px or more that a finger can find, on %i by %i', (width, height) => {
    for (const { label, play } of everyState([width, height])) {
      for (const spot of spots(play.toy)) {
        const seen = onSurface(spot, width, height), what = `${name(spot.target)} in ${label}`
        expect(Math.min(seen.hw, seen.hh), what).toBeGreaterThanOrEqual(MIN_HALF)
        // A cushion in a box with no hole in front of it is not shown, so it is not found: the box is cut first.
        if (spot.target.kind === 'cushion' && spot.when) continue
        expect(findable(play, spot), what).toBe(true)
      }
    }
  })

  it.each(SURFACES)('keeps every spot inside the surface, clear of the home control and of the grown-up corner, on %i by %i', (width, height) => {
    const states = [...everyState([width, height]), ...[-0.35, 0, 0.3, 0.8].map((x) => ({ label: `the highest fort at ${x}`, play: playOf(tallest(x), 1, [width, height]) }))]
    for (const { label, play } of states) {
      for (const spot of spots(play.toy)) {
        const seen = onSurface(spot, width, height), what = `${name(spot.target)} in ${label}`
        // Its middle is on the surface, with room for a fingertip.
        expect(seen.x, what).toBeGreaterThan(MIN_HALF); expect(seen.x, what).toBeLessThan(width - MIN_HALF)
        expect(seen.y, what).toBeGreaterThan(MIN_HALF); expect(seen.y, what).toBeLessThan(height - MIN_HALF)
        // No part of it is under the home control, which is the shell's, or in the corner, which is a grown-up's.
        const nearX = Math.min(seen.x + seen.hw, Math.max(seen.x - seen.hw, width / 2)), nearY = Math.min(seen.y + seen.hh, Math.max(seen.y - seen.hh, HOME.top + HOME.radius))
        expect(fromHome(nearX, nearY, width), `${what} and the home control`).toBeGreaterThan(HOME.radius)
        expect(seen.x + seen.hw < width - CORNER || seen.y - seen.hh > CORNER, `${what} and the corner`).toBe(true)
      }
    }
  })

  it.each(SURFACES)('answers nothing under the home control or in the corner, whatever stands there, on %i by %i', (width, height) => {
    const play = playOf(tallest(0), 1, [width, height])
    for (const [x, y] of [[width / 2, HOME.top + HOME.radius], [width / 2 + HOME.radius - 1, HOME.top + HOME.radius], [width / 2, HOME.top + 1], [width - 10, 10], [width - CORNER, CORNER]] as const) {
      expect(play.down(1, x, y)).toBe(false)
      expect(play.busy).toBe(false)
      expect(play.toy.cues).toEqual([])
    }
    expect(inCorner(width - CORNER - 1, 10, width)).toBe(false)
    // The cat on top of the highest fort is below the control, and a finger finds it.
    const cat = spots(play.toy).find((spot) => spot.target.kind === 'cat')!, seen = onSurface(cat, width, height)
    expect(seen.y - seen.hh).toBeGreaterThan(HOME.top + HOME.radius * 2)
    expect(play.down(1, seen.x, seen.y)).toBe(true)
    expect(topOf(rects(play.toy.state).find((rect) => rect.id === 1)!)).toBeCloseTo(MAX_TOP - 0.02, 6)
  })

  it('finds each thing where it is drawn, while it moves as well as at rest', () => {
    for (const entry of CASES) {
      perform(entry, Infinity, (play) => {
        const toy = play.toy, all = spots(toy)
        const at = (kind: Target['kind'], which: (target: Target) => boolean = () => true) => all.find((spot) => spot.target.kind === kind && which(spot.target))?.at
        // The same numbers the view lays on the board: whoever moves is found where it is at this instant.
        expect(at('cat'), entry.name).toEqual(catMiddle(catDraw(toy)))
        expect(at('baby'), entry.name).toEqual(babyMiddle(babyDraw(toy)))
        expect(at('gran'), entry.name).toEqual(granMiddle(granDraw(toy)))
        if (toy.hand?.kind !== 'tape') expect(at('roll'), entry.name).toEqual(rollAt(toy).at)
        toy.state.cushions.forEach((_, index) => { const found = at('cushion', (target) => target.kind === 'cushion' && target.index === index); if (found) expect(found, entry.name).toEqual(toy.poseOf(`cushion:${index}`)) })
        for (const spot of all) if (spot.target.kind === 'flap' && !toy.state.boxes[spot.target.id].side) expect(spot.at, entry.name).toEqual(lidSpot(toy, spot.target.id).at)
      })
    }
  })

  it('cuts the board in front of whoever is behind it, and finds them through the hole', () => {
    const state = freshFort(null)
    hole(state, 0, 90, 2, 160, 104)
    state.gran = { at: 'in', box: 0 }
    const play = playOf(state), [width, height] = SURFACES[0]
    const gran = onSurface(spots(play.toy).find((spot) => spot.target.kind === 'gran')!, width, height)
    // Through the door she is found; on the board beside the door, at the height of her head, the scissors cut.
    expect(targetAt(play.toy, gran.x, gran.y, width, height).kind).toBe('gran')
    const beside = project({ x: -0.35 - 1.1 + 60 * 0.0125, y: 0.9, z: FRONT_Z }, width, height)
    expect(targetAt(play.toy, beside.x, beside.y, width, height)).toMatchObject({ kind: 'face', id: 0 })
    // The cat at a hole is its own target: a touch on it never starts a cut on the board round it.
    const peeping = freshFort(null)
    hole(peeping, 0, 20, 40, 70, 90)
    peeping.cat = { at: 'look', box: 0, cell: 60 * 176 + 40 }
    const other = playOf(peeping), cat = onSurface(spots(other.toy).find((spot) => spot.target.kind === 'cat')!, width, height)
    for (const [dx, dy] of [[0, 0], [cat.hw - 1, 0], [-cat.hw + 1, cat.hh - 1]]) expect(targetAt(other.toy, cat.x + dx, cat.y + dy, width, height).kind).toBe('cat')
  })
})

describe('inside the frame', () => {
  it.each(SURFACES)('holds every reach of the cat, the baby and the grandmother inside %i by %i through every motion, the rattle included', (width, height) => {
    let rattles = 0
    const out: string[] = []
    for (const entry of CASES) {
      perform(entry, Infinity, (play) => {
        for (const reach of reaches(play.toy)) {
          const seen = project(reach.at, width, height), r = reach.r * seen.scale, rx = (reach.rx ?? reach.r) * seen.scale
          if (seen.x - rx < 0 || seen.x + rx > width || seen.y - r < 0 || seen.y + r > height) out.push(`${reach.part} in ${entry.name} at ${play.toy.time.toFixed(2)} s`)
          if (reach.part === 'the rattle') rattles++
        }
      }, [width, height])
    }
    expect(out.slice(0, 5)).toEqual([])
    expect(rattles).toBeGreaterThan(1000)
  })

  it.each(SURFACES)('holds the rattle inside %i by %i through every idle motion of the baby, the gumming included', (width, height) => {
    const play = playOf(freshFort(null), 7, [width, height]), seenIdles = new Set<string>()
    let least = Infinity
    for (let t = 0; t < 120; t += 1 / 30) {
      play.step(1 / 30)
      if (play.toy.directors.baby.current) seenIdles.add(play.toy.directors.baby.current)
      const rattle = reaches(play.toy).find((reach) => reach.part === 'the rattle')!, seen = project(rattle.at, width, height)
      least = Math.min(least, seen.x - rattle.r * seen.scale)
    }
    expect([...seenIdles].sort()).toEqual(['crane', 'gum', 'kick', 'rock'])
    expect(least).toBeGreaterThanOrEqual(0)
  })
})

describe('where things come to rest', () => {
  const [width, height] = SURFACES[0]
  /** The part of the surface where a face can stand: the rug from end to end, as high as a fort may be. */
  const faces = { left: project({ x: RUG.left, y: 0, z: FRONT_Z }, width, height).x, right: project({ x: RUG.right, y: 0, z: FRONT_Z }, width, height).x, top: project({ x: 0, y: MAX_TOP, z: FRONT_Z }, width, height).y, foot: project({ x: 0, y: 0, z: FRONT_Z }, width, height).y }
  const onFaces = (x: number, y: number): boolean => x > faces.left && x < faces.right && y > faces.top && y < faces.foot

  it('lays the fallen piece on the rug in front of and below the face it came from, whatever was cut', () => {
    for (const [path, disc, left] of [[[{ x: 2, y: 2 }, { x: 174, y: 2 }, { x: 174, y: 126 }, { x: 2, y: 126 }], false, RUG.left], [[{ x: 10, y: 60 }], true, RUG.left], [[{ x: 60, y: 2 }, { x: 86, y: 2 }, { x: 86, y: 62 }], false, RUG.right - 1.1], [[{ x: 80, y: 6 }], true, RUG.right - 1.1]] as const) {
      const rest = pieceRest(path, disc, left), half = (rest.wide * rest.small) / 2
      expect(rest.lies - half).toBeGreaterThanOrEqual(PIECE_RUG.left - 1e-9)
      expect(rest.lies + half).toBeLessThanOrEqual(PIECE_RUG.right + 1e-9)
      // Every corner of it as it lies is below the foot of every face on the surface.
      for (const [x, z] of [[rest.lies - half, FRONT_Z + PIECE_OUT], [rest.lies + half, FRONT_Z + PIECE_OUT + rest.tall * rest.small]]) {
        const seen = project({ x, y: 0.07, z }, width, height)
        expect(seen.y).toBeGreaterThan(faces.foot)
        expect(seen.y).toBeLessThan(height)
      }
    }
  })

  it('sets nothing down over a face that can be cut: a fired cushion, the baby, the cat on the rug, the tangle, the heap, the tape roll', () => {
    const state = builtFort()
    Object.assign(state, { cushions: [-2, -2, -2], cat: { at: 'rug', box: 0, cell: 0 }, lights: [], tangled: true, blanket: [] })
    for (const box of state.boxes) if (box.on !== ON_RUG) box.on = ON_HEAP
    const play = playOf(state)
    for (const spot of spots(play.toy)) {
      if (!['cushion', 'baby', 'cat', 'lights', 'heap', 'roll', 'switch'].includes(spot.target.kind)) continue
      const seen = onSurface(spot, width, height)
      for (const [x, y] of [[seen.x - seen.hw, seen.y - seen.hh], [seen.x + seen.hw, seen.y - seen.hh], [seen.x - seen.hw, seen.y + seen.hh], [seen.x + seen.hw, seen.y + seen.hh], [seen.x, seen.y]]) expect(onFaces(x, y), `${name(spot.target)} lies over where a face can stand`).toBe(false)
    }
  })

  it('seats the grandmother to the right of the rug and behind the faces: a box covers part of her, never she it', () => {
    const state = freshFort(8)
    state.boxes[0].x = Math.round((RUG.right - 1.1) * 100)
    const play = playOf(state), gran = spots(play.toy).find((spot) => spot.target.kind === 'gran')!, seen = onSurface(gran, width, height)
    expect(gran.at.x).toBeGreaterThan(RUG.right + 0.4)
    expect(gran.at.z).toBeLessThan(FRONT_Z - 1)
    // With the big box as far right as it goes, a finger still finds her above it, and on the board in front of her the scissors cut.
    expect(targetAt(play.toy, seen.x, seen.y, width, height).kind).toBe('gran')
    expect(findable(play, gran)).toBe(true)
    const board = project({ x: RUG.right - 0.2, y: 1.2, z: FRONT_Z }, width, height)
    expect(Math.abs(board.x - seen.x)).toBeLessThan(seen.hw)
    expect(targetAt(play.toy, board.x, board.y, width, height).kind).toBe('face')
  })

  it('sets nothing down on a thing that can be taken up: each of them is still found', () => {
    const state = builtFort()
    Object.assign(state, { cushions: [-2, -2, -2], cat: { at: 'rug', box: 0, cell: 0 }, lights: [], tangled: true })
    const play = playOf(state)
    for (const spot of spots(play.toy)) expect(findable(play, spot), name(spot.target)).toBe(true)
  })
})
