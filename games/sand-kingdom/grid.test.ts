import { describe, expect, it } from 'vitest'
import { BUCKET_RADIUS, GROOVE, base, deltaAt, groove, heightAt, peakNear, tower } from './field'
import { deserializeKingdom } from './kingdom'
import { ASKEW, type Heard, FILLS_AFTER, OFF_MIDDLE, Play, WOOD_LEAN } from './play'
import { JOURNEY_SECONDS } from './sun'
import { TAKEN, isClear } from './things'
import { EVENING_SEA } from './water'

// The object-by-action grid of the design sheet, cell by cell: six things a
// spot of the beach can hold, five things that can be done there. Each cell
// has its own change to the beach and its own sound, and no two cells share
// one answer.

const DT = 1 / 60
const fresh = (age: number | null = 7): Play => new Play(deserializeKingdom(null, age), 1)
const sand = (x: number, z: number) => ({ kind: 'sand', x, z }) as const

function steps(play: Play, seconds: number): void {
  for (let t = 0; t < seconds - 1e-9; t += DT) play.step(DT)
}
/** The names of what has sounded since `from`, in order. */
function names(play: Play, from: Heard | undefined): string[] {
  const at = from ? play.heard.lastIndexOf(from) + 1 : 0
  return play.heard.slice(at).map((one) => one.name)
}
const last = (play: Play): Heard | undefined => play.heard[play.heard.length - 1]

/** A finger drawn along a line of the beach. */
function stroke(play: Play, points: readonly (readonly [number, number])[], seconds = 0.5): void {
  play.press(sand(points[0][0], points[0][1]))
  play.dragStart()
  const count = Math.round(seconds / DT)
  for (let i = 1; i <= count; i++) {
    const f = (i / count) * (points.length - 1), k = Math.min(points.length - 2, Math.floor(f)), u = f - k
    play.drag(points[k][0] + (points[k + 1][0] - points[k][0]) * u, points[k][1] + (points[k + 1][1] - points[k][1]) * u, 0)
    play.step(DT)
  }
  play.release()
}
/** The bucket taken by a finger and dragged to a point of the beach, and let go there. */
function carry(play: Play, toX: number, toZ: number, seconds = 0.6, letGo = true): void {
  const from = { x: play.things.bucket.x, z: play.things.bucket.z }
  play.press({ kind: 'bucket' })
  play.dragStart()
  const count = Math.round(seconds / DT)
  for (let i = 1; i <= count; i++) {
    play.drag(from.x + ((toX - from.x) * i) / count, from.z + ((toZ - from.z) * i) / count, 0)
    play.step(DT)
  }
  if (letGo) play.release()
}
function tapBucket(play: Play): void {
  play.press({ kind: 'bucket' })
  play.tap()
}
/** Stands the bucket somewhere, as a beach found that way. */
function stand(play: Play, x: number, z: number, holds: 'nothing' | 'sand' | 'water' = 'nothing'): void {
  Object.assign(play.things.bucket, { x, z, holds, side: false })
}
/** The wood and the shells put out of the way at the sides, for a test that needs a clear run. */
function aside(play: Play): void {
  Object.assign(play.things.wood[0], { x: -5, z: 6.2 })
  Object.assign(play.things.wood[1], { x: 4.6, z: 6.6 })
  play.things.shells.forEach((shell, i) => Object.assign(shell, { x: -4.6 + i * 0.1, z: 3.4 + i * 0.9 }))
}
/** The sun is tapped and the whole evening scene plays out. */
function evening(play: Play): void {
  play.press({ kind: 'sun' })
  play.tap()
  steps(play, JOURNEY_SECONDS + 12)
}

describe('level damp sand', () => {
  it('the empty bucket dragged over it leaves a furrow as broad as the bucket, with a scrape, and fills', () => {
    const play = fresh()
    aside(play)
    stand(play, -1.5, 3)
    const from = last(play)
    carry(play, 1.5, 3)
    // Flat-bottomed and as broad as the bucket: the same depth at its middle and near its edge.
    expect(deltaAt(play.field, -1, 3)).toBeLessThan(-0.14)
    expect(deltaAt(play.field, -1, 3 + BUCKET_RADIUS - 0.25)).toBeLessThan(-0.12)
    expect(deltaAt(play.field, -1, 3 - BUCKET_RADIUS + 0.25)).toBeLessThan(-0.12)
    expect(deltaAt(play.field, -1, 3 + BUCKET_RADIUS + 0.3)).toBeGreaterThan(0.1)
    expect(names(play, from)).toContain('scrape')
    expect(FILLS_AFTER).toBeLessThan(3)
    expect(play.things.bucket.holds).toBe('sand')
    // Full, it digs nothing more, and stays where it was let go.
    expect(play.things.bucket.x).toBeCloseTo(1.5, 1)
    expect(deltaAt(play.field, 1.5, 3)).toBeGreaterThan(-0.05)
  })

  it('the full bucket turned out on it leaves a tower, with a whump and then a pop as the bucket lifts off and stands beside it', () => {
    const play = fresh(3)
    const at = { x: play.things.bucket.x, z: play.things.bucket.z }
    expect(play.things.bucket.holds).toBe('sand')
    const from = last(play)
    tapBucket(play)
    expect(peakNear(play.field, at.x, at.z, 0.3)).toBeGreaterThan(0.65)
    expect(names(play, from)).toEqual(['clink', 'whump', 'pop'])
    const pop = play.heard[play.heard.length - 1]
    expect(pop.at - play.time).toBeGreaterThan(0.1)
    expect(play.things.bucket.holds).toBe('nothing')
    expect(Math.hypot(play.things.bucket.x - at.x, play.things.bucket.z - at.z)).toBeGreaterThan(BUCKET_RADIUS + 0.6)
    // It is in the air on its way there, and lands.
    expect(play.poses.bucket.fly).not.toBeNull()
    expect(play.grains.length).toBeGreaterThan(5)
    steps(play, 0.6)
    expect(play.poses.bucket.fly).toBeNull()
  })

  it('the tide comes over it as a thin sheet, with a fizz', () => {
    const play = fresh()
    expect(play.standing(0, -1)).toBe(false)
    const from = last(play)
    evening(play)
    expect(names(play, from)).toContain('fizz')
    expect(play.standing(0, -1)).toBe(true)
    expect(play.sea).toBeGreaterThan(EVENING_SEA - 0.06)
    // No deeper than a thin sheet at the water's edge.
    expect(play.sea - heightAt(play.field, 0, -1)).toBeLessThan(0.2)
  })
})

describe('a groove', () => {
  const dug = (): Play => {
    const play = fresh()
    aside(play)
    stroke(play, [[-2, 3], [2, 3]])
    return play
  }

  it('a finger drawn across it drops in with a two-step crunch, and the wall between crumbles with a trickle', () => {
    const play = dug()
    const from = last(play)
    stroke(play, [[0, 1.2], [0, 4.5]])
    const heard = names(play, from)
    expect(heard).toContain('crunch')
    expect(heard[heard.indexOf('crunch') + 1]).toBe('trickle')
  })

  it('the empty bucket dragged over it scoops it into a round basin, with a slurp, and is full', () => {
    const play = dug()
    stand(play, 0, 4)
    const before = deltaAt(play.field, 0, 3)
    const from = last(play)
    carry(play, 0, 3, 0.4)
    expect(names(play, from)).toContain('slurp')
    expect(play.things.bucket.holds).toBe('sand')
    const middle = Math.min(deltaAt(play.field, 0, 3), deltaAt(play.field, 0, 3.25), deltaAt(play.field, 0, 3.5))
    expect(middle).toBeLessThan(before - 0.08)
    // Round: as deep to one side of the old groove as along it.
    const low = Math.min(...[2.6, 2.85, 3.1, 3.35, 3.6].map((z) => deltaAt(play.field, 0.5, z)))
    expect(low).toBeLessThan(GROOVE)
  })

  it('the full bucket turned out in it plugs it as a dam, with a glop, and its foot spreads', () => {
    const play = dug()
    stand(play, 0, 3, 'sand')
    const from = last(play)
    tapBucket(play)
    expect(names(play, from)).toEqual(['clink', 'glop'])
    expect(deltaAt(play.field, 0, 3)).toBeGreaterThan(0.4)
    // Lower and wider than a tower on level sand.
    const level = fresh()
    stand(level, 0, 3, 'sand')
    tapBucket(level)
    expect(peakNear(play.field, 0, 3, 0.3)).toBeLessThan(peakNear(level.field, 0, 3, 0.3))
    expect(deltaAt(play.field, 0, 3 + BUCKET_RADIUS + 0.05)).toBeGreaterThan(deltaAt(level.field, 0, 3 + BUCKET_RADIUS + 0.05))
  })

  it('the tide runs along it from the sea end, each groove in the order it was dug, with a gurgle that climbs', () => {
    const play = fresh()
    // Two channels from the sea, dug right to left.
    stroke(play, [[2, -0.4], [2, 3.5]])
    stroke(play, [[-2, -0.4], [-2, 3.5]])
    expect(play.standing(2, 3)).toBe(false)
    play.press({ kind: 'sun' })
    play.tap()
    let first = -1, second = -1
    const from = last(play)
    for (let t = 0; t < JOURNEY_SECONDS + 9; t += DT) {
      play.step(DT)
      if (first < 0 && play.wet[cell(2, 3)] > 0.5) first = t
      if (second < 0 && play.wet[cell(-2, 3)] > 0.5) second = t
    }
    expect(first).toBeGreaterThan(JOURNEY_SECONDS)
    // The one dug first fills first.
    expect(second).toBeGreaterThan(first + 0.2)
    expect(names(play, from).filter((name) => name === 'climb').length).toBeGreaterThanOrEqual(2)
    expect(play.standing(2, 3)).toBe(true)
  })
})

describe('raised sand', () => {
  const built = (): Play => {
    const play = fresh()
    aside(play)
    tower(play.field, 0, 3, 0, 1)
    return play
  }

  it('the empty bucket dragged over it shaves the top off level, with a rasp, and is full at once', () => {
    const play = built()
    stand(play, 0, 4.3)
    const from = last(play)
    const before = peakNear(play.field, 0, 3, 0.3)
    carry(play, 0, 3.3, 0.4)
    expect(names(play, from)).toContain('rasp')
    expect(names(play, from)).not.toContain('scrape')
    expect(play.things.bucket.holds).toBe('sand')
    const after = peakNear(play.field, 0, 3, 0.3)
    expect(after).toBeLessThan(before * 0.75)
    expect(after).toBeGreaterThan(0.05)
  })

  it('the full bucket turned out on a tower lands a second, narrower tier, with a whump and a creak', () => {
    const play = built()
    stand(play, 0, 3, 'sand')
    const from = last(play)
    tapBucket(play)
    expect(names(play, from)).toEqual(['clink', 'whump', 'creakTier'])
    expect(peakNear(play.field, 0, 3, 0.3)).toBeGreaterThan(1.1)
    // Narrower: the first tier's shoulder still shows below it.
    expect(deltaAt(play.field, 0.45, 3)).toBeLessThan(0.75)
  })

  it('a third brings the whole stack down into one big soft heap, with a long slump and a puff of grains', () => {
    const play = built()
    stand(play, 0, 3, 'sand')
    tapBucket(play)
    stand(play, 0, 3, 'sand')
    const from = last(play)
    const grains = play.grains.length
    tapBucket(play)
    expect(names(play, from)).toEqual(['clink', 'slump'])
    expect(peakNear(play.field, 0, 3, 0.4)).toBeLessThan(0.6)
    expect(deltaAt(play.field, 1.1, 3)).toBeGreaterThan(0.08)
    expect(play.grains.length).toBeGreaterThan(grains + 10)
  })

  it('the tide laps what tops the water, which stands as an island, and sinks what does not to a round mound with plops and a hush', () => {
    const play = fresh()
    // A tower in the sea's evening reach, and a low rim beside it.
    tower(play.field, 0, -1.5, 0, 1)
    stroke(play, [[3, -1.6], [5, -1.6]])
    const rim = deltaAt(play.field, 4, -1.6 + 0.55)
    expect(rim).toBeGreaterThan(0.04)
    const from = last(play)
    evening(play)
    const heard = names(play, from)
    expect(heard).toContain('plops')
    expect(heard).toContain('hush')
    expect(heightAt(play.field, 0, -1.5)).toBeGreaterThan(play.sea + 0.2)
    expect(deltaAt(play.field, 4, -1.6 + 0.55)).toBeLessThan(rim * 0.6)
    expect(deltaAt(play.field, 4, -1.6 + 0.55)).toBeGreaterThan(0)
  })
})

describe('a shell', () => {
  it('is pressed half into the sand with a damp squeak, and pressed again pops out with a tock the other way up', () => {
    const play = fresh()
    const shell = play.things.shells[0]
    let from = last(play)
    play.press({ kind: 'shell', index: 0 })
    expect(shell.state).toBe('pressed')
    expect(names(play, from)).toEqual(['dampSqueak'])
    play.tap()
    steps(play, 0.3)
    expect(play.poses.shells[0].sink).toBeGreaterThan(0.9)
    from = last(play)
    play.press({ kind: 'shell', index: 0 })
    play.tap()
    expect(shell.state).toBe('lying')
    expect(shell.up).toBe(false)
    expect(names(play, from)).toEqual(['tock'])
  })

  it('goes with a finger drawn across it, ploughing a thin line with a clicking scrape, and stays where it is let go', () => {
    const play = fresh()
    aside(play)
    const shell = play.things.shells[1]
    Object.assign(shell, { x: -1, z: 5.5 })
    const start = { x: shell.x, z: shell.z }
    const from = last(play)
    play.press({ kind: 'shell', index: 1 })
    play.dragStart()
    for (let i = 1; i <= 30; i++) {
      play.drag(start.x + (i / 30) * 1.5, start.z - (i / 30) * 2.5, 0)
      play.step(DT)
    }
    play.release()
    expect(shell.x).toBeCloseTo(start.x + 1.5, 1)
    expect(shell.z).toBeCloseTo(start.z - 2.5, 1)
    expect(shell.state).toBe('lying')
    expect(names(play, from)).toContain('clickScrape')
    // A thin line behind it: shallower than a finger's groove.
    const line = deltaAt(play.field, start.x + 0.75, start.z - 1.25)
    expect(line).toBeLessThan(-0.03)
    expect(line).toBeGreaterThan(-0.1)
  })

  it('is scooped up by the empty bucket and rattles in it, and comes out stuck in the side of the next tower', () => {
    const play = fresh()
    aside(play)
    const shell = play.things.shells[2]
    shell.x = 0
    shell.z = 3
    stand(play, 0, 3.95)
    let from = last(play)
    carry(play, 0, 2.2, 0.6)
    expect(shell.state).toBe('bucket')
    expect(play.things.bucket.shell).toBe(true)
    expect(names(play, from)).toContain('shellRattle')
    expect(play.drawn().shells[2].shown).toBe(false)
    expect(play.things.bucket.holds).toBe('sand')
    const at = { x: play.things.bucket.x, z: play.things.bucket.z }
    from = last(play)
    tapBucket(play)
    expect(shell.state).toBe('tower')
    expect(Math.hypot(shell.x - at.x, shell.z - at.z)).toBeLessThan(0.7)
    expect(play.things.bucket.shell).toBe(false)
    // Pressed there, it pops out and lies beside the tower.
    play.press({ kind: 'shell', index: 2 })
    play.tap()
    expect(shell.state).toBe('lying')
    // The tower is patted away from under another: it lies down where it was.
    const other = fresh()
    tower(other.field, 0, 3, 0, 1)
    Object.assign(other.things.shells[0], { x: 0, z: 3.5, state: 'tower' })
    for (let i = 0; i < 8; i++) {
      other.press(sand(0, 3))
      other.tap()
      other.step(DT)
    }
    expect(other.things.shells[0].state).toBe('lying')
  })

  it('shoots out sideways with a ping and skitters to a stop when a tower lands on it', () => {
    const play = fresh()
    const shell = play.things.shells[0]
    shell.x = 0.2
    shell.z = 3
    stand(play, -2, 5, 'sand')
    // The full bucket is carried onto it and let go there: it is set down against the shell, on the sand.
    carry(play, 0, 3)
    expect(play.poses.bucket.perch).toBe(0)
    const apart = Math.hypot(play.things.bucket.x - shell.x, play.things.bucket.z - shell.z)
    expect(apart).toBeGreaterThan(1.4)
    expect(apart).toBeLessThan(1.56)
    steps(play, 0.5)
    // Turned out there, the tower lands on the shell.
    const from = last(play)
    tapBucket(play)
    const heard = names(play, from)
    expect(heard).toContain('ping')
    expect(heard[heard.indexOf('ping') + 1]).toBe('skitter')
    expect(Math.abs(shell.x)).toBeGreaterThan(1.8)
    expect(shell.state).toBe('lying')
    expect(play.poses.shells[0].fly).not.toBeNull()
    expect(isClear([{ x: shell.x, z: shell.z, r: 0.6 }], [...TAKEN, { x: play.things.bucket.x, z: play.things.bucket.z, r: 0.6 }])).toBe(true)
    expect(peakNear(play.field, 0.2, 3, 0.3)).toBeGreaterThan(0.6)
  })

  it('fills with a glug and lets go a string of bubbles when the tide comes over it, and stays where it is', () => {
    const play = fresh()
    const shell = play.things.shells[0]
    shell.x = 1
    shell.z = -1.4
    const from = last(play)
    evening(play)
    expect(names(play, from)).toContain('bubbles')
    expect(shell.x).toBe(1)
    expect(shell.z).toBe(-1.4)
  })
})

describe('a piece of driftwood', () => {
  it('rocks like a see-saw under a finger, with two hollow knocks', () => {
    const play = fresh()
    const from = last(play)
    play.press({ kind: 'wood', index: 0 })
    play.tap()
    expect(names(play, from)).toEqual(['seesaw'])
    let most = 0
    for (let t = 0; t < 0.5; t += DT) {
      play.step(DT)
      most = Math.max(most, Math.abs(play.poses.wood[0].rock))
    }
    expect(most).toBeGreaterThan(0.12)
    steps(play, 3)
    expect(Math.abs(play.poses.wood[0].rock)).toBeLessThan(0.02)
  })

  it('goes with the finger with a woody rumble, and let go across a groove lies across it as a bridge, a little askew, with a clack', () => {
    const play = fresh()
    stroke(play, [[-3, 2.5], [3, 2.5]])
    const piece = play.things.wood[1], start = { x: piece.x, z: piece.z }
    const from = last(play)
    play.press({ kind: 'wood', index: 1 })
    play.dragStart()
    for (let i = 1; i <= 30; i++) {
      play.drag(start.x + ((1 - start.x) * i) / 30, start.z + ((2.5 - start.z) * i) / 30, 0)
      play.step(DT)
    }
    play.release()
    const heard = names(play, from)
    expect(heard).toContain('woodRumble')
    expect(heard[heard.length - 1]).toBe('bridge')
    expect(piece.x).toBeCloseTo(1, 1)
    expect(piece.z).toBeCloseTo(2.5, 1)
    // Across: the groove runs along x, so the wood lies along z, and a little askew, never exactly square.
    expect(Math.abs(Math.cos(piece.turn))).toBeCloseTo(Math.sin(ASKEW), 3)
    // Let go on level sand it just stays, with no clack.
    const level = fresh()
    const mark = last(level)
    level.press({ kind: 'wood', index: 1 })
    level.dragStart()
    level.drag(0, 2, 0)
    level.release()
    expect(names(level, mark)).not.toContain('bridge')
    expect(level.things.wood[1].turn).toBe(deserializeKingdom(null, null).wood[1].turn)
  })

  it('tips the empty bucket that is dragged over it onto its side with a clang, spilling the shell it held', () => {
    const play = fresh()
    const piece = play.things.wood[0]
    Object.assign(piece, { x: 0, z: 3, turn: 0 })
    // The other piece out of the way, and the bucket a short way off: a longer drag would fill it.
    Object.assign(play.things.wood[1], { x: 4.6, z: 6.6 })
    stand(play, 0, 4.6)
    play.things.bucket.shell = true
    play.things.shells[0].state = 'bucket'
    const from = last(play)
    carry(play, 0, 1.5, 0.6)
    expect(names(play, from)).toContain('clang')
    expect(play.things.bucket.side).toBe(true)
    expect(play.things.bucket.holds).toBe('nothing')
    expect(play.things.bucket.shell).toBe(false)
    expect(play.things.shells[0].state).toBe('lying')
    // It lies short of the wood, not on it, and the rest of the drag moves nothing.
    expect(play.things.bucket.z).toBeGreaterThan(3 + 0.9)
    steps(play, 0.5)
    expect(play.poses.bucket.tilt).toBeGreaterThan(0.9)
    // A tap stands it up with a clonk; so does the start of a drag.
    const mark = last(play)
    tapBucket(play)
    expect(names(play, mark)).toEqual(['clink', 'clonk'])
    expect(play.things.bucket.side).toBe(false)
    expect(play.things.bucket.holds).toBe('nothing')
    play.things.bucket.side = true
    play.press({ kind: 'bucket' })
    play.dragStart()
    expect(play.things.bucket.side).toBe(false)
    play.cancel()
  })

  it('sticks out of a tower that lands across it as one long arm and one short stub, with a muffled thud and a crack', () => {
    const play = fresh()
    const piece = play.things.wood[0]
    Object.assign(piece, { x: 0, z: 3, turn: 0 })
    stand(play, -2, 5, 'sand')
    // Carried onto the wood and let go there, it is set down against it; turned out, the tower lands across it.
    carry(play, 0, 3)
    expect(play.poses.bucket.perch).toBe(0)
    expect(Math.abs(play.things.bucket.z - 3)).toBeGreaterThan(1.0)
    expect(Math.abs(play.things.bucket.z - 3)).toBeLessThan(1.2)
    steps(play, 0.5)
    const from = last(play)
    tapBucket(play)
    expect(names(play, from)).toEqual(['clink', 'thudCrack', 'pop'])
    // The wood has not moved, and both its ends are clear of the tower's foot.
    expect(piece).toEqual({ x: 0, z: 3, turn: 0 })
    expect(deltaAt(play.field, 1.1, 3)).toBeLessThan(0.05)
    expect(deltaAt(play.field, -1.1, 3)).toBeLessThan(0.05)
    // The tower stands to one side of the bough's middle, so one arm is long and the other a stub: never two
    // arms alike. The bough is 1.26 from its middle to each tip and the tower's foot is the bucket's rim.
    const side = deltaAt(play.field, OFF_MIDDLE, 3) > deltaAt(play.field, -OFF_MIDDLE, 3) ? 1 : -1
    expect(peakNear(play.field, side * OFF_MIDDLE, 3, 0.2)).toBeGreaterThan(0.6)
    const long = 1.26 + OFF_MIDDLE - BUCKET_RADIUS, short = 1.26 - OFF_MIDDLE - BUCKET_RADIUS
    expect(long).toBeGreaterThan(1.0)
    expect(short).toBeGreaterThan(0.2)
    expect(short).toBeLessThan(long / 3)
    // The sand is level again beyond the foot on both sides, where the arm and the stub show.
    expect(deltaAt(play.field, side * (OFF_MIDDLE + BUCKET_RADIUS + 0.2), 3)).toBeLessThan(0.05)
    expect(deltaAt(play.field, side * (OFF_MIDDLE - BUCKET_RADIUS - 0.2), 3)).toBeLessThan(0.05)
    // The bough leans, the stub down into the sand and the long arm up.
    steps(play, 1.5)
    expect(Math.abs(play.woodPose(0).rock)).toBeGreaterThan(WOOD_LEAN * 0.8)
  })

  it('floats when the tide comes: it lifts with a creak and drifts along its groove to the end, with soft knocks', () => {
    const play = fresh()
    // A wide channel from the sea, as the bucket ploughs it, and the wood lying in it.
    play.things.bucket.x = -4
    play.things.bucket.z = 5
    for (let z = -2.5; z < 4; z += 0.25) groove(play.field, 1.6, z, 1.6, z + 0.25)
    for (let z = -2.5; z < 4; z += 0.25) groove(play.field, 2.1, z, 2.1, z + 0.25)
    play.dug.push(cell(1.6, -2.5))
    const piece = play.things.wood[0]
    Object.assign(piece, { x: 1.85, z: 1.2, turn: Math.PI / 2 })
    // The other bough lies well clear of the channel's end.
    Object.assign(play.things.wood[1], { x: -0.1, z: 5.5, turn: 0.1 })
    const from = last(play)
    play.press({ kind: 'sun' })
    play.tap()
    steps(play, JOURNEY_SECONDS + 0.2)
    // Saved where the water will leave it, from the moment the scene starts.
    const saved = play.toState().wood[0]
    expect(saved.z).toBeGreaterThan(2.2)
    expect(piece.z).toBeCloseTo(1.2, 1)
    steps(play, 12)
    const heard = names(play, from)
    expect(heard).toContain('woodCreak')
    expect(heard).toContain('softKnock')
    expect(piece.z).toBeCloseTo(saved.z, 1)
    expect(piece.x).toBeCloseTo(saved.x, 1)
    expect(play.poses.wood[0].lift).toBeGreaterThan(0.05)
  })

  it('creaks once as the open sea lifts it, and once as it is let go on the sea, and makes no sound afloat on a beach found that way', () => {
    // On dry sand by day, below where the evening sea comes to: the tide lifts it where it lies, with one creak.
    const play = fresh()
    Object.assign(play.things.wood[0], { x: -4, z: -1.6, turn: 0.2 })
    Object.assign(play.things.wood[1], { x: 3, z: 7, turn: 0 })
    steps(play, 0.5)
    expect(play.poses.wood[0].lift).toBeLessThan(0.01)
    const from = last(play)
    play.press({ kind: 'sun' })
    play.tap()
    steps(play, JOURNEY_SECONDS + 12)
    expect(play.poses.wood[0].lift).toBeGreaterThan(0.05)
    expect(names(play, from).filter((name) => name === 'woodCreak')).toHaveLength(1)
    // Found that way when the game is opened again: afloat, and silent.
    const again = play.parked(3)
    const mark = again.heard.length
    steps(again, 2)
    expect(again.poses.wood[0].lift).toBeGreaterThan(0.05)
    expect(again.heard.slice(mark).map((one) => one.name)).not.toContain('woodCreak')
    // The other piece dragged from the top of the beach onto the evening sea and let go: it lifts there with one creak.
    const piece = again.things.wood[1], start = { x: piece.x, z: piece.z }
    const before = last(again)
    again.press({ kind: 'wood', index: 1 })
    again.dragStart()
    for (let i = 1; i <= 40; i++) {
      again.drag(start.x + ((2 - start.x) * i) / 40, start.z + ((-1.5 - start.z) * i) / 40, 0)
      again.step(DT)
    }
    expect(names(again, before)).not.toContain('woodCreak')
    again.release()
    steps(again, 1)
    expect(names(again, before).filter((name) => name === 'woodCreak')).toHaveLength(1)
    expect(again.poses.wood[1].lift).toBeGreaterThan(0.05)
  })
})

describe('standing water', () => {
  it('follows a finger drawn across it as a wake with a slosh, and the groove still opens under it', () => {
    const play = fresh()
    const from = last(play)
    play.press({ kind: 'water', x: -1, z: -3.2 })
    play.dragStart()
    for (let i = 1; i <= 20; i++) {
      play.drag(-1 + i * 0.12, -3.2, 0)
      play.step(DT)
    }
    play.release()
    const heard = names(play, from)
    expect(heard[0]).toBe('plip')
    expect(heard).toContain('wake')
    expect(deltaAt(play.field, 0, -3.2)).toBeLessThan(-0.15)
  })

  it('fills the empty bucket dragged through it with water, which slops as it goes and turns out in one sploosh that leaves a dark patch and no tower', () => {
    const play = fresh()
    // A pool by the sea, as a finger digs it, and the bucket beside it.
    stroke(play, [[-1, -2.6], [1, -2.6]])
    expect(play.standing(0, -2.6)).toBe(true)
    stand(play, 0, -1)
    let from = last(play)
    carry(play, 0, -2.2, 0.3, false)
    expect(play.things.bucket.holds).toBe('water')
    expect(names(play, from)).toContain('glug')
    from = last(play)
    for (let i = 1; i <= 40; i++) {
      play.drag(i * 0.06, -2.2 + i * 0.1, 0)
      play.step(DT)
    }
    play.release()
    expect(names(play, from)).toContain('slop')
    expect(names(play, from)).not.toContain('rumble')
    const at = { x: play.things.bucket.x, z: play.things.bucket.z }
    from = last(play)
    tapBucket(play)
    expect(names(play, from)).toEqual(['clink', 'sploosh'])
    expect(peakNear(play.field, at.x, at.z, 0.4)).toBeLessThan(0.1)
    expect(play.stain.show).toBe(1)
    expect(Math.hypot(play.stain.x - at.x, play.stain.z - at.z)).toBeLessThan(0.01)
    expect(play.things.bucket.holds).toBe('nothing')
    steps(play, 8)
    expect(play.stain.show).toBe(0)
  })

  it('takes a tower with a splosh, a ring wave and a fizz, and slumps it at once to a low island', () => {
    const play = fresh()
    stroke(play, [[-1, -2.6], [1, -2.6]])
    stand(play, 0, -2.6, 'sand')
    const from = last(play)
    const rings = play.rings.length
    tapBucket(play)
    expect(names(play, from)).toEqual(['clink', 'splosh', 'fizz'])
    expect(play.rings.length).toBeGreaterThan(rings)
    const top = heightAt(play.field, 0, -2.6)
    expect(top).toBeGreaterThan(play.sea + 0.05)
    expect(peakNear(play.field, 0, -2.6, 0.4)).toBeLessThan(0.45)
  })

  it('becomes one with the sea when the tide comes: a low whoosh runs back along a groove that already held water', () => {
    const play = fresh()
    // A channel dug down to the day sea: water stands in its sea end by day.
    stroke(play, [[0, -2.8], [0, 2.5]])
    expect(play.standing(0, -2.7)).toBe(true)
    const from = last(play)
    evening(play)
    const heard = names(play, from)
    expect(heard).toContain('whoosh')
    expect(heard).not.toContain('climb')
    expect(play.standing(0, 2.2)).toBe(true)
  })
})

describe('the grid as a whole', () => {
  it('gives no two cells the same sound', () => {
    // The sound that is each cell's own, read off the tests above and the toy's.
    const cells: Record<string, string[]> = {
      level: ['thud', 'hiss', 'scrape', 'whump+pop', 'fizz'],
      groove: ['squelch', 'crunch+trickle', 'slurp', 'glop', 'climb'],
      raised: ['slap', 'crumble', 'rasp', 'whump+creakTier', 'plops+hush'],
      shell: ['dampSqueak', 'clickScrape', 'shellRattle', 'ping+skitter', 'bubbles'],
      wood: ['seesaw', 'woodRumble', 'clang', 'thudCrack', 'woodCreak+softKnock'],
      water: ['plip', 'wake', 'glug+slop', 'splosh+fizz', 'whoosh'],
    }
    const all = Object.values(cells).flat()
    expect(new Set(all).size).toBe(all.length)
    expect(all).toHaveLength(30)
    expect(base(0)).toBeGreaterThan(0)
  })
})

function cell(x: number, z: number): number {
  return Math.floor((z + 4) / 0.25) * 96 + Math.floor((x + 12) / 0.25)
}
