import { describe, expect, it } from 'vitest'
import { DRAW_BACK_S, MANNER } from './cast'
import { drawn, roomFor } from './fixtures'
import { BLOCKS, CAGE, CELL, COLS, HILL, LIFT, MAMMOTH, ROWS, TOOLS, boxesCross, centre, indexOf, isGrass, type Box } from './layout'
import type { Play } from './play'
import { FRAME, run, watched } from './rig'
import { makeRng } from './rng'
import { boulderBox, dwellerBox, gemShape, toolBox } from './shapes'
import { DWELLER_KINDS, layWorld, type World } from './world'

// Nothing passes through anything. This is a 2D game, so the audit is a
// model test: at every frame of play that reaches every state, the shapes of
// the things as they are drawn (the same shapes a finger finds them by) are
// laid over each other. Every contact is either a finding, which fails, or
// one of the contacts named here, each with its reason and a cap.

type Contact = { what: string; a: Box; b: Box }

/**
 * The contacts that are meant.
 *   mole-on-gem    He stands over a gem that lies on the floor of his block or is set in its wall: it lies at his
 *                  feet, in front of him. At most five at once (three on a floor, one in each wall). A gem on its
 *                  way from the finger, a lamp flying back to its rope among them, passes in front of him too.
 *   mole-on-tool   He stands over a tool that lies where he stands, which is how he swaps it. At most three.
 *   mole-in-lift   He walks into the cage through its open side, behind its posts, rides in it and walks out again. Only
 *                  from the grass beside it, or during the ride.
 *   dodging        A gem or a tool let go right over a dweller: the dweller is already drawing back out of its way, which
 *                  takes a tenth of a second.
 *   changing       A place has just changed: the dweller that lived there is on its way out, or the one that will
 *                  live there is not all there yet, while the other one, or the gem or tool that changed the
 *                  place, is still in it. It lasts no longer than the slowest coming or going there is.
 */
const CAPS = { 'mole-on-gem': 5, 'mole-on-tool': 3 }
const SLOWEST_CHANGE = Math.max(...DWELLER_KINDS.map((kind) => Math.max(MANNER[kind].leave, MANNER[kind].arrive)))

const inset = (box: Box, by: number): Box => ({ x: box.x + by, y: box.y + by, w: box.w - by * 2, h: box.h - by * 2 })

/** Every contact in the visit as it stands: the findings, and the allowed ones by name. */
function contacts(play: Play): { findings: Contact[]; allowed: Record<string, number> } {
  const game = play.game, world = game.world
  const findings: Contact[] = []
  const allowed: Record<string, number> = { 'mole-on-gem': 0, 'mole-on-tool': 0, 'mole-in-lift': 0, changing: 0, dodging: 0 }
  const mole = game.moleShape()

  // The mole is in dug space, on the grass or in the cage, and never in rock: each corner of him, a little in.
  const body = inset(mole, 3)
  for (const [x, y] of [[body.x, body.y], [body.x + body.w, body.y], [body.x, body.y + body.h], [body.x + body.w, body.y + body.h]]) {
    if (y < HILL.y) continue
    const c = Math.floor((x - HILL.x) / CELL), r = Math.floor((y - HILL.y) / CELL)
    // A boulder that is still on its way into a block is looked at below, where it is drawn.
    if (c >= 0 && c < COLS && r < ROWS && game.motions.some((motion) => motion.what === 'boulder' && motion.to === indexOf(c, r))) continue
    if (c < 0 || c >= COLS || r >= ROWS || world.kinds[indexOf(c, r)] !== 'open') findings.push({ what: `the mole in rock at column ${c}, row ${r}`, a: mole, b: mole })
  }
  // He never stands in the mammoth.
  if (boxesCross(mole, MAMMOTH)) findings.push({ what: 'the mole in the mammoth', a: mole, b: MAMMOTH })
  // He is in the lift only on his way into its cage, in it, or on his way out: from the grass beside it.
  if (boxesCross(inset(mole, 2), LIFT)) {
    const beside = (node: number): boolean => node === CAGE || node === CAGE + 1
    if (game.sceneName === 'ride' || beside(world.mole.at) || beside(game.mole.to)) allowed['mole-in-lift'] += 1
    else findings.push({ what: 'the mole in the lift', a: mole, b: LIFT })
  }

  // The dwellers: none where the mole is, the lamp is, or another dweller is.
  const lodgers = play.cast.lodgers.filter((lodger) => lodger.shown > 0.02)
  const changing = (lodger: { leaving: boolean; here: number }): boolean => lodger.leaving || lodger.here < 1
  const shapes = lodgers.map((lodger) => dwellerBox(lodger.kind, lodger.at, lodger.shown))
  lodgers.forEach((lodger, i) => {
    if (boxesCross(shapes[i], mole)) findings.push({ what: `the mole in the ${lodger.kind}`, a: mole, b: shapes[i] })
    for (let j = i + 1; j < lodgers.length; j++) {
      if (!boxesCross(shapes[i], shapes[j])) continue
      if (changing(lodger) || changing(lodgers[j])) allowed.changing += 1
      else findings.push({ what: `the ${lodger.kind} in the ${lodgers[j].kind}`, a: shapes[i], b: shapes[j] })
    }
    for (const gem of world.gems) {
      if (gem.rest === 'bucket') continue
      const at = gemShape(game.gemPlace(gem))
      if (!boxesCross(shapes[i], at)) continue
      if (changing(lodger)) allowed.changing += 1
      else if (lodger.away > 0 && game.motions.some((motion) => motion.gem === gem)) allowed.dodging += 1
      else findings.push({ what: `a gem in the ${lodger.kind}`, a: at, b: shapes[i] })
    }
    for (const tool of TOOLS) {
      if (world.mole.tool === tool || isGrass(world.tools[tool])) continue
      const at = inset(toolBox(tool, game.toolPlace(tool)), 6)
      if (!boxesCross(shapes[i], at)) continue
      if (changing(lodger)) allowed.changing += 1
      else if (lodger.away > 0 && game.motions.some((motion) => motion.tool === tool)) allowed.dodging += 1
      else findings.push({ what: `the ${tool} in the ${lodger.kind}`, a: at, b: shapes[i] })
    }
  })

  // Gems: the lamp that hangs in his block is over his head, and the ones at his feet are allowed.
  for (const gem of world.gems) {
    if (gem.rest === 'bucket' || game.hand?.gem === gem) continue
    const at = gemShape(game.gemPlace(gem))
    if (!boxesCross(at, mole)) continue
    if (gem.rest === 'hung' && !game.motions.some((motion) => motion.gem === gem && motion.how === 'arc')) findings.push({ what: 'the mole in the lamp', a: mole, b: at })
    else allowed['mole-on-gem'] += 1
  }
  for (const tool of TOOLS) {
    if (world.mole.tool === tool) continue
    if (tool === 'rope' && world.gems.some((gem) => gem.rest === 'hung')) continue
    if (boxesCross(inset(toolBox(tool, game.toolPlace(tool)), 6), mole)) allowed['mole-on-tool'] += 1
  }

  // A boulder on its way never comes down on him or slides into him.
  for (const motion of game.motions) {
    if (motion.what !== 'boulder') continue
    const at = boulderBox(game.boulderPlace(motion))
    if (boxesCross(at, mole)) findings.push({ what: 'a boulder in the mole', a: at, b: mole })
  }
  // And one at rest is never where he stands.
  for (let index = 0; index < BLOCKS; index++) {
    if (world.kinds[index] !== 'boulder' || game.motions.some((motion) => motion.what === 'boulder' && motion.to === index)) continue
    const at = boulderBox({ x: HILL.x + (index % COLS) * CELL, y: HILL.y + Math.floor(index / COLS) * CELL })
    if (boxesCross(at, mole)) findings.push({ what: 'the mole in a boulder', a: mole, b: at })
  }
  return { findings, allowed }
}

type Tally = { findings: string[]; most: Record<string, number>; changingFor: number; dodgingFor: number; frames: number }

/** Plays on, looking at every frame. */
function audit(play: Play, seconds: number, touching: boolean, tally: Tally): void {
  for (let t = 0; t < seconds; t += FRAME) {
    play.step(FRAME, touching)
    const now = contacts(play)
    for (const finding of now.findings) if (tally.findings.length < 12) tally.findings.push(`${finding.what} at ${play.time.toFixed(2)} s`)
    for (const name of Object.keys(CAPS)) tally.most[name] = Math.max(tally.most[name] ?? 0, now.allowed[name])
    tally.dodgingFor = now.allowed.dodging > 0 ? tally.dodgingFor + FRAME : 0
    tally.most.dodging = Math.max(tally.most.dodging ?? 0, tally.dodgingFor)
    tally.changingFor = now.allowed.changing > 0 ? tally.changingFor + FRAME : 0
    tally.most.changing = Math.max(tally.most.changing ?? 0, tally.changingFor)
    tally.frames += 1
  }
}

const fresh = (): Tally => ({ findings: [], most: {}, changingFor: 0, dodgingFor: 0, frames: 0 })
const mid = (index: number) => centre(index % COLS, Math.floor(index / COLS))

function clean(tally: Tally): void {
  expect(tally.findings).toEqual([])
  expect(tally.most['mole-on-gem'] ?? 0).toBeLessThanOrEqual(CAPS['mole-on-gem'])
  expect(tally.most['mole-on-tool'] ?? 0).toBeLessThanOrEqual(CAPS['mole-on-tool'])
  expect(tally.most.changing ?? 0).toBeLessThanOrEqual(SLOWEST_CHANGE + 0.1)
  expect(tally.most.dodging ?? 0).toBeLessThanOrEqual(DRAW_BACK_S + FRAME * 2)
}

/** A finger that holds a block. */
function hold(play: Play, index: number, seconds: number, tally: Tally): void {
  play.press(mid(index), false)
  audit(play, seconds, true, tally)
  play.release('drop', mid(index), false)
}

describe('nothing passes through anything', () => {
  it('finds a contact when there is one, so that a clean run means something', () => {
    const world = roomFor('bat')
    const { play } = watched(world)
    run(play, 0.5)
    // A bat put where the mole stands, by hand, with no time to draw back.
    const bat = play.cast.lodgers[0]
    bat.at = play.game.world.mole.at
    expect(contacts(play).findings.map((finding) => finding.what)).toContain('the mole in the bat')
  })

  it('a mole who walks into a lived-in room: everyone in his way has drawn back before he is there', () => {
    for (const kind of DWELLER_KINDS) {
      const world = roomFor(kind)
      // A way in from the right, along the row.
      for (const c of [3, 4, 5, 6]) world.kinds[indexOf(c, 5)] = 'open'
      world.mole.at = indexOf(6, 5)
      const { play } = watched(world)
      const tally = fresh()
      audit(play, 1, false, tally)
      play.press(mid(indexOf(0, 5)), false)
      audit(play, 3, true, tally)
      play.release('drop', mid(indexOf(0, 5)), false)
      expect(play.game.world.mole.at).toBe(indexOf(0, 5))
      // And back out again, so they come out behind him.
      play.press(mid(indexOf(6, 5)), false)
      audit(play, 3, true, tally)
      play.release('drop', mid(indexOf(6, 5)), false)
      audit(play, 1, false, tally)
      clean(tally)
    }
  })

  it('the blast up a shaft where bats hang, and the bats and the candle never cross', () => {
    const world = drawn('ooo', 'eoe', 'eoe', 'eoe', 'eoe', '@oa')
    world.mole.at = indexOf(1, 5)
    world.kinds[indexOf(0, 5)] = 'earth'
    const { play } = watched(world)
    const tally = fresh()
    audit(play, 1, false, tally)
    expect(play.cast.lodgers.some((lodger) => lodger.kind === 'bat')).toBe(true)
    hold(play, indexOf(2, 5), 7, tally)
    expect(play.game.world.mole.sooty).toBe(true)
    audit(play, 2, false, tally)
    // Down again through the roost.
    hold(play, indexOf(1, 5), 3, tally)
    clean(tally)
  })

  it('a bucket of gas carries him up a shaft where bats hang', () => {
    const world = drawn('ooo', 'eoe', 'eoe', 'eoe', 'eoe', 'eoa')
    world.mole.at = indexOf(1, 5)
    world.mole.tool = 'bucket'
    const { play } = watched(world)
    const tally = fresh()
    audit(play, 1, false, tally)
    hold(play, indexOf(2, 5), 6, tally)
    expect(play.game.world.mole.at).toBe(indexOf(1, 0))
    clean(tally)
  })

  it('the run of water through a lived-in cave, with the mole in its way', () => {
    const world = drawn('eweeeee', '@oooeee', 'eeeoeee', 'eeeoooo', 'eeeeeeo', 'eeeeeoo')
    const { play } = watched(world)
    const tally = fresh()
    audit(play, 1, false, tally)
    hold(play, indexOf(1, 0), 9, tally)
    expect(play.game.world.water.some(Boolean)).toBe(true)
    audit(play, 3, false, tally)
    clean(tally)
  })

  it('a boulder hauled toward him, and one that falls when the ground under it goes', () => {
    const along = drawn('eeeeeee', 'eb@ooee', 'eeeeeee')
    along.mole.tool = 'rope'
    const first = watched(along)
    const tally = fresh()
    hold(first.play, indexOf(1, 1), 1.5, tally)
    first.play.press(mid(indexOf(2, 1)), false)
    audit(first.play, 1.5, true, tally)
    first.play.release('drop', mid(indexOf(2, 1)), false)
    expect(first.play.game.world.kinds[indexOf(1, 1)]).toBe('open')
    // A boulder two blocks over his head, and he digs the earth between: it comes down onto the block above him and stops there.
    const under = drawn('eeeee', 'eebee', 'eeeee', 'ee@ee')
    const second = watched(under)
    hold(second.play, indexOf(2, 2), 2, tally)
    audit(second.play, 1, false, tally)
    expect(second.play.game.world.kinds[indexOf(2, 2)]).toBe('boulder')
    // Granite over his head cracked free with the wedge: it stays up, since he is under it.
    const cracked = drawn('eeeee', 'eegee', 'ee@ee')
    cracked.mole.tool = 'wedge'
    const third = watched(cracked)
    hold(third.play, indexOf(2, 1), 4, tally)
    audit(third.play, 1, false, tally)
    expect(third.play.game.world.kinds[indexOf(2, 1)]).toBe('boulder')
    clean(tally)
  })

  it('a lamp hung in his block, and one he walks under: he ducks, and it swings over his head', () => {
    const world = drawn('eeeeeee', 'e@oooee', 'eeeeeee')
    world.mole.tool = 'rope'
    world.gems.push({ colour: 'red', at: indexOf(3, 1), rest: 'floor' })
    const { play } = watched(world)
    const tally = fresh()
    const gem = play.game.gemPlace(play.game.world.gems[0])
    play.press(gem, false)
    play.release('tap', gem, false)
    audit(play, 3, false, tally)
    expect(play.game.world.gems[0].rest).toBe('hung')
    for (const to of [indexOf(4, 1), indexOf(1, 1), indexOf(3, 1), indexOf(4, 1)]) hold(play, to, 1.5, tally)
    clean(tally)
  })

  it('the ride, from a lived-in cave to the fresh burrow', () => {
    const world = layWorld(4, 'near')
    const { play } = watched(world)
    const tally = fresh()
    const lift = { x: LIFT.x + LIFT.w / 2, y: LIFT.y + 100 }
    play.press(lift, false); play.release('tap', lift, false)
    audit(play, 4, false, tally)
    play.press(lift, false); play.release('tap', lift, false)
    expect(play.game.sceneName).toBe('ride')
    audit(play, 9, false, tally)
    expect(play.game.sceneName).toBeNull()
    clean(tally)
  })

  it('a long random play on four hillsides: holds, taps, drags, tools, gems carried, the lift', () => {
    for (const seed of [11, 12, 13, 14]) {
      const world: World = layWorld(seed, seed % 2 ? 'near' : 'wild')
      const { play } = watched(world, seed)
      const rng = makeRng(seed * 7919)
      const tally = fresh()
      const anywhere = () => ({ x: HILL.x + rng.next() * COLS * CELL, y: HILL.y + rng.next() * ROWS * CELL })
      for (let move = 0; move < 140; move++) {
        const game = play.game
        const pick = rng.next()
        if (pick < 0.5) {
          // A hold that wanders, near where he is as often as not.
          const near = rng.next() < 0.6 ? { x: game.mole.x + (rng.next() - 0.5) * 3 * CELL, y: Math.max(HILL.y + 5, game.mole.y - 40 + (rng.next() - 0.3) * 3 * CELL) } : anywhere()
          play.press(near, false)
          audit(play, 0.2 + rng.next() * 2.2, true, tally)
          if (rng.next() < 0.5) { const on = anywhere(); play.drag(on, false); audit(play, rng.next() * 1.5, true, tally); play.release('drop', on, false) } else play.release('drop', near, false)
        } else if (pick < 0.62) {
          const at = anywhere()
          play.press(at, false); play.release('tap', at, false)
          audit(play, 0.6, false, tally)
        } else if (pick < 0.76) {
          const tool = TOOLS[Math.floor(rng.next() * 3)]
          const at = game.toolPlace(tool)
          play.press({ x: at.x, y: at.y - 20 }, false); play.release('tap', at, false)
          audit(play, 2.5, false, tally)
        } else if (pick < 0.82) {
          const at = { x: game.mole.x, y: game.mole.y - 30 }
          play.press(at, false); play.release('tap', at, false)
          audit(play, 0.6, false, tally)
        } else if (pick < 0.96 && game.world.gems.some((gem) => gem.rest !== 'bucket')) {
          const free = game.world.gems.filter((gem) => gem.rest !== 'bucket')
          const gem = free[Math.floor(rng.next() * free.length)]
          const from = game.gemPlace(gem)
          play.press(from, false)
          if (rng.next() < 0.3) play.release('tap', from, false)
          else {
            // Carried to a dug block near the mole, to its middle or to one of its walls.
            const open = game.world.kinds.map((kind, index) => (kind === 'open' ? index : -1)).filter((index) => index >= 0)
            const to = mid(open[Math.floor(rng.next() * open.length)])
            const on = { x: to.x + (rng.next() - 0.5) * 80, y: to.y }
            play.drag(on, false)
            audit(play, 0.3, true, tally)
            play.release('drop', on, false)
          }
          audit(play, 1.5, false, tally)
        } else {
          const lift = { x: LIFT.x + LIFT.w / 2, y: LIFT.y + 100 }
          play.press(lift, false); play.release('tap', lift, false)
          audit(play, 1.2, false, tally)
        }
      }
      expect(tally.frames).toBeGreaterThan(6000)
      clean(tally)
    }
  })
})
