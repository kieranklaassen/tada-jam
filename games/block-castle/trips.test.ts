import { describe, expect, it } from 'vitest'
import type { Box, Ray } from './aim'
import { COLS, KINDS, PER_KIND, ROWS, landing, type Kind, type Placed } from './blocks'
import { backOf } from './castle'
import { FALL_SECONDS, RETURN_SECONDS, clearInFrame, dayStance, topEdge } from './evening'
import { WHO } from './folk'
import { BASKET, BASKET_TIP, BELL, SIZE, untippedAt } from './layout'
import { liftStretch } from './motion'
import { Play } from './play'
import { below, makeRng } from './rng'

const at = (kind: Kind, col: number, row: number): Placed => ({ kind, col, row })

function pile(seed: number, count: number): Placed[] {
  const rng = makeRng(seed)
  const placed: Placed[] = []
  const used = new Map<Kind, number>()
  for (let tries = 0; placed.length < count && tries < 200; tries++) {
    const kind = KINDS[below(rng, KINDS.length)]
    if ((used.get(kind) ?? 0) >= PER_KIND) continue
    const spot = landing(placed, kind, below(rng, COLS), below(rng, ROWS))
    used.set(kind, (used.get(kind) ?? 0) + 1)
    placed.push({ kind, col: spot.col, row: spot.row })
  }
  return placed
}

const PILES: [string, Placed[]][] = [
  ['a bare rug', []],
  ['the youngest first rug', [at('cube', 3, 1), at('round', 3, 1)]],
  ['a castle', [at('cube', 0, 1), at('arch', 3, 0), at('thin', 0, 0), at('round', 6, 0), at('cube', 6, 1), at('cube', 6, 1), at('slope', 0, 2), at('long', 4, 0), at('round', 2, 0)]],
  ['the tallest pile', [at('long', 1, 1), at('long', 1, 1), at('long', 1, 1), at('cube', 2, 1), at('cube', 2, 1), at('cube', 2, 1)]],
  // The rug of an audit moment: a slope across two cubes, a long one, and a slope with its heel on a lone cube.
  ['a slope heeled on a lone cube', [at('cube', 2, 1), at('cube', 3, 1), at('cube', 1, 2), at('slope', 2, 1), at('long', 3, 2), at('slope', 0, 2)]],
  ...Array.from({ length: 60 }, (_, i): [string, Placed[]] => [`seeded pile ${i}`, pile(100 + i, 1 + (i % 18))]),
]

function depth(a: Box, b: Box): number {
  let least = Infinity
  for (let axis = 0; axis < 3; axis++) least = Math.min(least, Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]))
  return Math.max(0, least)
}
const overBell = (): Ray => ({ origin: [BELL.x, 12, BELL.z], dir: [0, -1, 0] })

/** What is in what right now: each of the folk who is on his way against every block and against the others. */
function clashes(play: Play, moving: readonly string[], riding: 'slide' | null): string[] {
  const found: string[] = []
  const evening = play.evening
  for (const who of WHO) {
    if (!moving.includes(who)) continue
    const rest = evening.rests[who]
    for (const body of evening.bodies(who)) {
      for (const thing of evening.things) {
        if (thing.index === rest.thing && (rest.how === 'window' || rest.how === 'gate' || rest.how === 'bridge')) continue
        // A slide is a wedge, and he rides its face: its box is not the measure of it.
        if (riding === 'slide' && thing.what === 'slide') continue
        const [w, , d] = SIZE[thing.kind]
        const block: Box = { min: [thing.x - w / 2, thing.base, thing.z - d / 2], max: [thing.x + w / 2, thing.crown, thing.z + d / 2] }
        if (depth(body, block) >= 0.03) found.push(`${who} in block ${thing.index} (${thing.what})`)
      }
      // Carried, he stays in the frame and clear of the home control, on both surfaces the rules are held for.
      if (evening.actors[who].busy) for (const [width, height] of [[1180, 820], [1024, 768]] as const) {
        if (!topEdge(who, body).every((point) => clearInFrame(point, evening.back, width, height))) found.push(`${who} out of the frame or behind the home control at ${width} by ${height}`)
      }
      for (const other of WHO) {
        if (other === who) continue
        if ((who === 'king' && rest.how === 'dragon') || (other === 'king' && evening.rests.king.how === 'dragon')) continue
        for (const theirs of evening.bodies(other)) if (depth(body, theirs) >= 0.03) found.push(`${who} in ${other}`)
      }
    }
  }
  return found
}

function watch(play: Play, seconds: number, riding: 'slide' | null = null): string[] {
  const found = new Set<string>()
  for (let i = 0; i < Math.round(seconds * 30); i++) {
    play.advance(1 / 30)
    play.take()
    const moving = WHO.filter((who) => play.evening.actors[who].busy)
    for (const clash of clashes(play, moving, riding)) found.add(clash)
  }
  return [...found]
}

describe('nothing passes through anything on the way', () => {
  it.each(PILES)('%s: a tap on a bridge or a slide sends someone who gets there and back through nothing', (_, placed) => {
    const play = new Play(placed, 1, true)
    play.evening.things.forEach((thing, index) => {
      if (thing.what !== 'bridge' && thing.what !== 'slide') return
      play.evening.act(index)
      expect(watch(play, 8, thing.what === 'slide' ? 'slide' : null), `thing ${index}, a ${thing.what}`).toEqual([])
      expect(play.evening.busy).toBe(false)
    })
  })

  it.each(PILES)('%s: the folk go in at evening and come home in the afternoon through nothing', (_, placed) => {
    const play = new Play(placed, 1)
    play.press(overBell())
    expect(watch(play, FALL_SECONDS + 1), 'evening falls').toEqual([])
    // At rest too: no crown behind the home control, however high and however near the middle the king sits.
    const evening = play.evening
    for (const who of WHO) for (const body of evening.bodies(who)) for (const [width, height] of [[1180, 820], [1024, 768]] as const) {
      expect(topEdge(who, body).every((point) => clearInFrame(point, evening.back, width, height)), `${who} at rest, ${width} by ${height}`).toBe(true)
    }
    // The camera has stepped back no further than leaves each thing of the castle large enough to tap.
    expect(evening.far).toBeGreaterThanOrEqual(backOf(evening.rests))
    expect((16 + 4.5 * evening.far) / (16 + 4.5 * backOf(evening.rests))).toBeLessThan(56 / 48)
    play.press(overBell())
    expect(watch(play, RETURN_SECONDS + 1), 'the afternoon returns').toEqual([])
  })

  it.each(PILES)('%s: tidied, no block goes through a block that leans out of the tipped basket, or through another on its way', (_, placed) => {
    if (placed.length === 0) return
    const play = new Play(placed, 1)
    play.press({ origin: [0, 0.4, BASKET.z + 1.7], dir: [1, 0, 0] })
    play.carry({ origin: [BASKET.x - 1.2, 12, BASKET.z], dir: [0, -1, 0] })
    play.drop()
    expect(play.sceneRunning).toBe(true)
    /** Points of a block as it is drawn: corners, the middles of its edges and faces, and its middle. */
    const pointsOf = (piece: Play['pieces'][number]): [number, number, number][] => {
      const [w, h, d] = SIZE[piece.kind], k = Math.max(0, piece.scale.value)
      const cos = Math.cos(piece.yaw), sin = Math.sin(piece.yaw)
      const points: [number, number, number][] = []
      for (const a of [-1, 0, 1]) for (const b of [0, 0.5, 1]) for (const c of [-1, 0, 1]) {
        const lx = (a * w * k) / 2, lz = (c * d * k) / 2
        points.push([piece.x + lx * cos + lz * sin, piece.y + b * h * k, piece.z - lx * sin + lz * cos])
      }
      return points
    }
    const found = new Set<string>()
    // Where each stood when the basket went over: two that have not left yet stand as they were built.
    const stood = new Map(play.pieces.filter((piece) => piece.state === 'tidy').map((piece) => [piece, [piece.x, piece.y, piece.z]]))
    const left = (piece: Play['pieces'][number]): boolean => { const at = stood.get(piece)!; return Math.hypot(piece.x - at[0], piece.y - at[1], piece.z - at[2]) > 1e-6 }
    for (let i = 0; i < 8 * 60 && play.sceneRunning; i++) {
      play.advance(1 / 60)
      const tip = play.basketTip * BASKET_TIP
      const flying = play.pieces.filter((piece) => piece.state === 'tidy' && piece.scale.value > 0.02)
      const offered = play.pieces.filter((piece) => piece.state === 'offer')
      for (const piece of flying) for (const [x, y, z] of pointsOf(piece)) {
        // Seen from the tipped basket, each block in it stands upright where it is offered.
        const [bx, by] = untippedAt(x, y, tip)
        for (const other of offered) {
          const [w, h, d] = SIZE[other.kind].map((side) => side * Math.max(0, other.scale.value))
          // A round one and a thin one stand turned any way: their widest.
          const half = other.kind === 'round' || other.kind === 'thin' ? Math.hypot(w, d) / 2 : w / 2, deep = other.kind === 'round' || other.kind === 'thin' ? half : d / 2
          const inside = Math.min(bx - (other.x - half), other.x + half - bx, by - other.y, other.y + h - by, z - (other.z - deep), other.z + deep - z)
          if (inside > 0.03) found.add(`${piece.kind} in the ${other.kind} of the basket`)
        }
        for (const other of flying) {
          if (other === piece || (!left(piece) && !left(other))) continue
          const [w, h, d] = SIZE[other.kind], k = other.scale.value
          const cos = Math.cos(other.yaw), sin = Math.sin(other.yaw)
          const lx = (x - other.x) * cos - (z - other.z) * sin, lz = (x - other.x) * sin + (z - other.z) * cos
          const inside = Math.min(lx + (w * k) / 2, (w * k) / 2 - lx, y - other.y, other.y + h * k - y, lz + (d * k) / 2, (d * k) / 2 - lz)
          if (inside > 0.03) found.add(`${piece.kind} in a ${other.kind} on its way`)
        }
      }
    }
    expect([...found]).toEqual([])
  })

  it('finishes a trip before anyone goes home, when the bell is rung in the middle of one', () => {
    const placed = PILES[2][1]
    const play = new Play(placed, 1, true)
    const bridge = play.evening.things.findIndex((thing) => thing.what === 'bridge')
    play.evening.act(bridge)
    expect(watch(play, 0.8)).toEqual([])
    const tripper = WHO.find((who) => play.evening.actors[who].busy)!
    expect(tripper).toBeDefined()
    play.press(overBell())
    // One at a time still: while he is on his trip none of the others has left his place.
    const others = WHO.filter((who) => who !== tripper)
    const before = others.map((who) => [...play.evening.actors[who].placing.at])
    play.advance(1 / 30)
    expect(others.map((who) => [...play.evening.actors[who].placing.at])).toEqual(before)
    expect(watch(play, RETURN_SECONDS + 9), 'the afternoon returns').toEqual([])
    for (const who of WHO) expect(play.evening.actors[who].placing.at).toEqual(dayStance(who).at)
  })
})

describe('a block in the air goes over things and never through them', () => {
  type P = Play['pieces'][number]
  const boxOf = (piece: P): Box => {
    const [w, h, d] = SIZE[piece.kind]
    // As tall as it is drawn: a block coming up into the hand is taller for a moment.
    const tall = h * (piece.state === 'hand' || piece.lift.target > 0 ? liftStretch(piece.sinceLift) : 1)
    return { min: [piece.x - w / 2, piece.y, piece.z - d / 2], max: [piece.x + w / 2, piece.y + tall, piece.z + d / 2] }
  }
  /** Every block that is in the hand or on its way by itself, against every block that stands and against each other. */
  const crossings = (play: Play, into: Set<string>): void => {
    const moving = play.pieces.filter((piece) => piece.state === 'hand' || ((piece.state === 'rug' || piece.state === 'offer') && piece.legs.length > 0))
    const standing = play.pieces.filter((piece) => piece.legs.length === 0 && (piece.state === 'rug' || (piece.state === 'offer' && piece.scale.value > 0.5)))
    for (const piece of moving) {
      // A block that could not stay on a slope slides down its face: the slope is a wedge, and its box is not the measure of it.
      const sliding = piece.state === 'rug' && piece.legs[0]?.kind === 'arc'
      for (const other of standing) if (!(sliding && other.kind === 'slope') && depth(boxOf(piece), boxOf(other)) > 0.03) into.add(`${piece.kind} through a ${other.kind} ${other.state === 'rug' ? 'on the rug' : 'in the basket'}`)
      for (const other of moving) if (other.id > piece.id && depth(boxOf(piece), boxOf(other)) > 0.03) into.add(`${piece.kind} through a ${other.kind} that is moving too`)
    }
  }
  const run = (play: Play, seconds: number, into: Set<string>): void => {
    for (let i = 0; i < Math.round(seconds * 120); i++) { play.advance(1 / 120); play.take(); crossings(play, into) }
  }
  const down = (x: number, z: number): Ray => ({ origin: [x, 12, z], dir: [0, -1, 0] })
  const sweep = (play: Play, from: readonly [number, number], to: readonly [number, number], into: Set<string>): void => {
    for (let k = 1; k <= 45; k++) {
      play.carry(down(from[0] + ((to[0] - from[0]) * k) / 45, from[1] + ((to[1] - from[1]) * k) / 45))
      run(play, 1 / 60, into)
    }
  }

  it.each(PILES)('%s: tapped out of the basket, each kind hops to the rug over what stands in the basket and on the rug', (_, placed) => {
    const found = new Set<string>()
    const play = new Play(placed, 1)
    for (const kind of KINDS) {
      const offered = play.pieces.find((piece) => piece.state === 'offer' && piece.kind === kind)
      if (!offered) continue
      play.press(down(offered.home[0], offered.home[2]))
      play.tap()
      run(play, 1.2, found)
    }
    expect([...found]).toEqual([])
  })

  it.each(PILES)('%s: carried out of the basket across the whole rug and back into the basket', (_, placed) => {
    const found = new Set<string>()
    const play = new Play(placed, 1)
    for (const [kind, row] of [['cube', 0], ['long', 1], ['thin', 2], ['arch', 1]] as const) {
      const offered = play.pieces.find((piece) => piece.state === 'offer' && piece.kind === kind)
      if (!offered) continue
      const start: [number, number] = [offered.home[0], offered.home[2]]
      play.press(down(...start))
      run(play, 0.1, found)
      sweep(play, start, [-4.2, row - 1], found)
      run(play, 0.2, found)
      sweep(play, [-4.2, row - 1], [BASKET.x + 0.3, BASKET.z - 1.2], found)
      run(play, 0.2, found)
      play.drop()
      run(play, 1, found)
    }
    expect([...found]).toEqual([])
  })

  it.each(PILES)('%s: pulled from under what stands on it and carried to the other end of the rug', (_, placed) => {
    const found = new Set<string>()
    for (let index = 0; index < placed.length; index++) {
      const play = new Play(placed, 1)
      // A finger from the front, at the middle of the block's face.
      const target = play.pieces.filter((piece) => piece.state === 'rug')[index]
      if (!target) continue
      play.press({ origin: [target.home[0], target.home[1] + SIZE[target.kind][1] / 2, 9], dir: [0, 0, -1] })
      if (!play.hand || play.hand.riders.length === 0) { play.pressEnd(); continue }
      const start: [number, number] = [target.home[0], target.home[2]]
      run(play, 0.1, found)
      // It comes out to a free side first; hemmed in on all four sides it comes up with what stood on it and goes
      // out over the lowest side.
      play.carry(down(...start))
      sweep(play, start, [start[0] < -0.9 ? 2.4 : -4.2, 1], found)
      run(play, 0.3, found)
      play.drop()
      run(play, 1, found)
    }
    expect([...found]).toEqual([])
  })
  it('comes up with what stands on it where it is hemmed in on all four sides, goes out over the lowest side, and they drop', () => {
    const at = (kind: Kind, col: number, row: number): Placed => ({ kind, col, row })
    // A cube on the rug with a cube on it; a round one to its left, to its right and behind it; a long one lying in front of it.
    const placed = [at('cube', 5, 1), at('cube', 5, 1), at('round', 4, 1), at('round', 6, 1), at('round', 5, 0), at('long', 4, 2)]
    const play = new Play(placed, 1)
    const found = new Set<string>()
    const cubes = play.pieces.filter((piece) => piece.state === 'rug' && piece.kind === 'cube').sort((a, b) => a.home[1] - b.home[1])
    const [target, rider] = cubes
    const from = target.home[1]
    play.press({ origin: [target.home[0], from + 0.8, 9], dir: [0, 0, -1] })
    expect(play.hand?.id).toBe(target.id)
    expect(play.hand?.riders).toEqual([rider.id])
    run(play, 0.1, found)
    play.carry(down(target.home[0], target.home[2]))
    // Up, then out: two legs, and the one that stood on it goes up with it.
    expect(target.legs.length).toBe(2)
    expect(rider.legs.length).toBe(2)
    let highest = 0
    for (let i = 0; i < 30; i++) { run(play, 1 / 60, found); highest = Math.max(highest, rider.y) }
    expect(highest).toBeGreaterThan(from + SIZE.cube[1] + SIZE.long[1])
    sweep(play, [target.home[0], target.home[2]], [-4.2, 1], found)
    play.drop()
    run(play, 1, found)
    expect([...found]).toEqual([])
    expect(rider.y).toBeCloseTo(from, 5)
    expect(rider.legs.length).toBe(0)
  })
})
