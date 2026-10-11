import { describe, expect, it } from 'vitest'
import { Cast, FLIGHT, INVITE_TAPS, lodgerBox } from './cast'
import { TIERS } from './config'
import { Effects } from './effects'
import { KNUCKLES, VARIANTS, WORM_RINGS, dragonflyWing } from './figures'
import { drawn, roomFor } from './fixtures'
import { ACTS, CARRY_UP, DRIP_S, Game, HAT_AT, LOOK_BACK_S, RUN_MOST_S, TAP_S, WALK_S, type Event, type EventType } from './game'
import { IDLE_BEFORE_DEMO } from './guidance'
import type { Point } from './input'
import { BURROW, BURROW_INDEX, CAGE, CELL, COLS, HILL, LIFT, MAMMOTH, TOOL_HOME, beside, centre, colOf, grassNode, indexOf, rowOf, type Tool } from './layout'
import { Play } from './play'
import { FRAME, rig, run, stampsOf, watched } from './rig'
import { makeRng } from './rng'
import { toSave, worldOf } from './save'
import { ROPE_AT } from './view'
import { GLUG_SCALE, notesOf } from './voices'
import { TOOL_SIZE, gemSpot, toolSpot } from './shapes'
import { clone, layWorld, lightOf, wormsOf, type Load, type World } from './world'

// Where the sheet names a case, the game has one answer for it, and what is
// played on is what a load gives. Each of these was a gap between the sheet
// and the game once; each is held here by name.

const mid = (index: number): Point => centre(colOf(index), rowOf(index))
type Log = { t: number; event: Event }[]
function play(game: Game, seconds: number, out: Log = []): Log {
  for (const event of game.drain()) out.push({ t: game.time, event })
  for (let t = FRAME; t <= seconds + 1e-9; t += FRAME) {
    game.step(FRAME)
    for (const event of game.drain()) out.push({ t: game.time, event })
  }
  return out
}
const types = (log: Log): EventType[] => log.map((entry) => entry.event.type)
const withTool = (world: World, tool: Tool, load: Load = 'nothing'): World => { world.mole.tool = tool; world.mole.load = load; return world }
const blows = (log: Log): number => log.filter((entry) => ['chip', 'break', 'clang', 'whoomph', 'gush'].includes(entry.event.type)).length

describe('a still hold that lifts is not a tap', () => {
  it('a quick tap sends him to land one blow, and a hold that lifts where it landed sends him no further than a slide that lifts', () => {
    // A tap: he walks the dug way and lands one blow on the block in his way.
    const tapped = new Game(drawn('@ooe'))
    tapped.press(mid(3))
    tapped.release('tap', mid(3))
    expect(blows(play(tapped, 3))).toBe(1)
    expect(tapped.world.kinds[3]).toBe('open')
    // A hold of longer than a tap, lifted where it landed while he is still walking: he begins no blow at all.
    for (const how of ['tap', 'drop'] as const) {
      const held = new Game(drawn('@ooe'))
      held.press(mid(3))
      play(held, TAP_S + 0.05)
      expect(held.mole.mode).toBe('walk')
      held.release(how, mid(3))
      expect(blows(play(held, 3)), how).toBe(0)
      expect(held.world.kinds[3], how).toBe('earth')
    }
  })

  it('he finishes the blow he has begun and begins no other, whichever way the lift is reported', () => {
    const logs = (['tap', 'drop'] as const).map((how) => {
      const game = new Game(drawn('@se'))
      game.press(mid(1))
      const log = play(game, TAP_S + 0.1)
      game.release(how, mid(1))
      play(game, 3, log)
      return { how, hits: game.world.hits[1], heard: log.map((entry) => `${entry.event.type}@${entry.t.toFixed(3)}`) }
    })
    expect(logs[0].heard).toEqual(logs[1].heard)
    expect(logs[0].hits).toBe(logs[1].hits)
    // Sandstone takes three blows: the hold was long enough to begin the second and no more.
    expect(logs[0].hits).toBeGreaterThan(0)
    expect(logs[0].hits).toBeLessThan(3)
  })

  it('a gas pocket is not blown by a hold that has lifted, and is by a tap', () => {
    const held = new Game(drawn('@ooa'))
    held.press(mid(3))
    play(held, TAP_S + 0.05)
    held.release('tap', mid(3))
    expect(types(play(held, 4))).not.toContain('whoomph')
    expect(held.world.kinds[3]).toBe('gas')
    const tapped = new Game(drawn('@ooa'))
    tapped.press(mid(3))
    tapped.release('tap', mid(3))
    expect(types(play(tapped, 2))).toContain('whoomph')
  })
})

describe('nothing hangs over a pocket the pick opened', () => {
  it('a boulder on a gas pocket falls when the pocket opens, seen and heard inside the blast', () => {
    const pocket = indexOf(2, 1)
    const game = new Game(drawn('oob', 'o@a'))
    game.press(mid(pocket))
    const log: Log = []
    while (game.sceneName !== 'blast') { game.step(FRAME); for (const event of game.drain()) log.push({ t: game.time, event }) }
    // In the call that opens the pocket the boulder is on its way down in the hill that is shown.
    expect(types(log)).toContain('whoomph')
    expect(game.world.kinds[indexOf(2, 0)]).toBe('open')
    expect(game.world.kinds[pocket]).toBe('boulder')
    expect(game.motions.some((motion) => motion.what === 'boulder' && motion.to === pocket)).toBe(true)
    const keeps = JSON.stringify(toSave(game.keeps))
    const during = play(game, 1)
    expect(game.sceneName).toBe('blast')
    expect(during.find((entry) => entry.event.type === 'thud')?.event).toMatchObject({ index: pocket })
    // And when the scene is over nothing moves: the hill is the one that was saved when it began.
    play(game, 8)
    expect(game.sceneName).toBeNull()
    expect(JSON.stringify(toSave(game.world))).toBe(keeps)
    expect(game.motions).toHaveLength(0)
  })

  it('a gem and a tool lying over a water pocket fall when it opens, inside the run', () => {
    const pocket = indexOf(1, 1), over = indexOf(1, 0)
    const world = drawn('oo', '@w', 'ee')
    world.gems.push({ colour: 'green', at: over, rest: 'floor' })
    world.tools.wedge = over
    const game = new Game(world)
    game.press(mid(pocket))
    const log: Log = []
    while (game.sceneName !== 'run') { game.step(FRAME); for (const event of game.drain()) log.push({ t: game.time, event }) }
    expect(game.world.gems[0].at).toBe(pocket)
    expect(game.world.tools.wedge).toBe(pocket)
    const keeps = JSON.stringify(toSave(game.keeps))
    const during = play(game, 0.6)
    expect(game.sceneName).toBe('run')
    expect(types(during)).toContain('tik')
    expect(types(during)).toContain('clunk')
    play(game, 9)
    expect(game.sceneName).toBeNull()
    expect(JSON.stringify(toSave(game.world))).toBe(keeps)
  })
})

describe('a touch that ends a blast starts nothing that sounds in that frame', () => {
  it('water the blast let go is at rest when the touch has ended it, unheard', () => {
    const pocket = indexOf(2, 1)
    const { play: visit, log } = watched(drawn('oo~', 'o@a', 'eee'), 5)
    visit.press(mid(pocket), false)
    for (let i = 0; visit.game.sceneName !== 'blast' && i < 600; i++) visit.step(FRAME, true)
    run(visit, 1, true)
    visit.release('drop', undefined, false)
    expect(visit.game.sceneName).toBe('blast')
    visit.take()
    const from = log.length
    visit.press(mid(indexOf(5, 3)), false)
    expect(log.slice(from).map((entry) => entry.event.type)).toEqual(['knock'])
    expect(visit.game.sceneName).toBeNull()
    // The water above the pocket has run into it.
    expect(visit.game.world.water[indexOf(2, 0)]).toBe(false)
    expect(visit.game.world.water[pocket]).toBe(true)
    visit.release('cancel', undefined, false)
    const later = log.length
    run(visit, 6)
    const after = log.slice(later).map((entry) => entry.event.type)
    for (const type of ['gush', 'glug', 'lap', 'whoomph', 'bump', 'grumble']) expect(after, type).not.toContain(type)
  })

  it('watched to its end, the same blast is followed by the run, heard', () => {
    const pocket = indexOf(2, 1)
    const game = new Game(drawn('oo~', 'o@a', 'eee'))
    game.press(mid(pocket))
    const log = play(game, 14)
    game.release('drop', mid(pocket))
    expect(types(log)).toContain('whoomph')
    expect(types(log)).toContain('gush')
    expect(game.world.water[pocket]).toBe(true)
  })
})

describe('the blast blows off whoever lives beside the pocket, on every side', () => {
  it('to its left and right as well as over and under it, and nobody further off', () => {
    const game = new Game(roomFor('bat'))
    const cast = new Cast(3, game)
    const lodger = cast.lodgers[0]
    expect(lodger).toBeDefined()
    for (const side of beside(lodger.at)) {
      lodger.blown = 0
      cast.feed({ type: 'whoomph', index: side }, game)
      expect(lodger.blown, `pocket at ${side}`).toBeGreaterThan(0)
    }
    // Two blocks along it only flinches, when it is not in the mole's column.
    const far = lodger.at + 2
    if (colOf(far) < COLS && colOf(far) > colOf(lodger.at) && colOf(lodger.at) !== colOf(game.world.mole.at)) {
      lodger.blown = 0
      cast.feed({ type: 'whoomph', index: far }, game)
      expect(lodger.blown).toBe(0)
      expect(lodger.flinch.to).toBe(1)
    }
  })
})

describe('what sounds is drawn', () => {
  it('the wedge splits sandstone into two halves that are drawn sliding apart, and are gone in well under a second', () => {
    const { play: visit, log } = watched(withTool(drawn('@s'), 'wedge'), 4)
    const stage = rig()
    stage.frame(visit)
    visit.press(mid(1), false)
    while (!log.some((entry) => entry.event.type === 'split')) visit.step(FRAME, true)
    expect(visit.effects.halves).toHaveLength(1)
    const sandstone = new Set<object>(Array.from({ length: VARIANTS }, (_, variant) => stage.view.pictures!.block('sandstone', variant, 0).image))
    const first = stage.frame(visit).filter((one) => sandstone.has(one.image))
    expect(first).toHaveLength(2)
    run(visit, 0.2, true)
    const later = stage.frame(visit).filter((one) => sandstone.has(one.image))
    expect(later).toHaveLength(2)
    // Further apart than they were.
    expect(later[1].x - later[0].x).toBeGreaterThan(first[1].x - first[0].x)
    run(visit, 0.45, true)
    expect(visit.effects.halves).toHaveLength(0)
  })

  it('the prised gem is at his hat when the ding sounds', () => {
    const world = withTool(drawn('@oe'), 'wedge')
    world.gems.push({ colour: 'green', at: 1, rest: 'right' })
    const game = new Game(world)
    const gem = game.world.gems[0]
    game.press(gemSpot(game.world, gem))
    game.release('tap', gemSpot(game.world, gem))
    let met: number | null = null
    for (let t = 0; t < 3 && met === null; t += FRAME) {
      game.step(FRAME)
      if (game.drain().some((event) => event.type === 'ding')) {
        const at = game.gemPlace(gem), hat = { x: game.mole.x + game.mole.face * HAT_AT.x, y: game.mole.y + HAT_AT.y }
        met = Math.hypot(at.x - hat.x, at.y - hat.y)
      }
    }
    expect(met).not.toBeNull()
    expect(met!).toBeLessThan(10)
    play(game, 2)
    expect(game.world.gems[0]).toEqual({ colour: 'green', at: 1, rest: 'floor' })
    expect(ACTS.prise.cues).toHaveLength(2)
  })

  it('the drop from a shut pocket and the wrung-out rope throw water in the call that sounds them', () => {
    const drop = new Game(withTool(drawn('@w'), 'bucket'))
    const air = new Effects(1)
    air.feed({ type: 'plip', index: 1 }, drop, TIERS[0])
    expect(air.beads).toHaveLength(1)
    expect(air.chips.length).toBeGreaterThan(0)
    const wrung = new Game(withTool(drawn('@~'), 'rope'))
    const wet = new Effects(1)
    wet.feed({ type: 'trickle' }, wrung, TIERS[0])
    expect(wet.chips.length).toBeGreaterThanOrEqual(3)
    // Every drop starts at his paws and falls: none goes up.
    for (const chip of wet.chips) expect(chip.vy).toBeGreaterThan(0)
  })

  it('a spout over rock keeps a slow drip of its own: heard at the spout, and nothing splashes', () => {
    const game = new Game(drawn('@p', 'ee'))
    const log = play(game, DRIP_S * 3.2)
    const drips = log.filter((entry) => entry.event.type === 'plink')
    expect(drips.length).toBeGreaterThanOrEqual(2)
    for (const drip of drips) expect(drip.event).toMatchObject({ index: 1 })
    const air = new Effects(1)
    air.feed({ type: 'plink', index: 1 }, game, TIERS[0])
    expect(air.chips).toHaveLength(0)
    // Over a dug block it lands on the floor below, as before.
    const over = new Game(drawn('@p', 'oo'))
    for (const drip of play(over, DRIP_S * 3.2).filter((entry) => entry.event.type === 'plink')) expect(drip.event).toMatchObject({ index: indexOf(1, 1) })
  })
})

describe('a tap on the mole', () => {
  it('knocks his hat over his eyes whether or not he holds a tool, and a tool he holds is set down as well', () => {
    const bare = new Game(drawn('@oe'))
    bare.press({ x: bare.mole.x, y: bare.mole.y - 40 })
    expect(bare.mole.hat).toBeGreaterThan(0)
    const holding = new Game(withTool(drawn('@oe'), 'wedge'))
    holding.press({ x: holding.mole.x, y: holding.mole.y - 40 })
    holding.release('tap', { x: holding.mole.x, y: holding.mole.y - 40 })
    expect(holding.mole.hat).toBeGreaterThan(0)
    const log = play(holding, 1.5)
    expect(types(log).filter((type) => type === 'poke' || type === 'put')).toEqual(['poke', 'put'])
    expect(holding.world.mole.tool).toBeNull()
    expect(holding.world.tools.wedge).toBe(0)
  })
})

describe('played on is what a load gives', () => {
  /** A hill drawn by hand with the burrow dug, as every saved hill has it: a load of anything else is a first visit. */
  const cave = (...rows: string[]): World => { const world = drawn(...rows); world.kinds[BURROW_INDEX] = 'open'; return world }
  const same = (visit: Play): void => {
    expect(worldOf(JSON.parse(JSON.stringify(visit.keeps)), null, 1).seed).toBe(visit.game.world.seed)
    const live = clone(visit.game.world), worms = [...visit.game.worms].sort((a, b) => a - b)
    visit.park()
    expect(visit.game.world.wet).toEqual(live.wet)
    expect(visit.game.world.water).toEqual(live.water)
    expect(visit.game.world.kinds).toEqual(live.kinds)
    expect(visit.game.world.tied).toEqual(live.tied)
    expect([...visit.game.worms].sort((a, b) => a - b)).toEqual(worms)
  }

  it('earth packed into a wet block takes the wet with it, and the block is dry when it is dug again', () => {
    const world = withTool(cave('@oo'), 'bucket', 'earth')
    world.wet[1] = true
    const { play: visit, log } = watched(world, 2)
    visit.press(mid(1), false)
    run(visit, 2, true)
    visit.release('drop', mid(1), false)
    expect(log.some((entry) => entry.event.type === 'tip')).toBe(true)
    expect(visit.game.world.kinds[1]).toBe('earth')
    expect(visit.game.world.wet[1]).toBe(false)
    same(visit)
    // Dug again with the pick: dry, played on and loaded alike.
    visit.game.world.mole.tool = null
    visit.press(mid(1), false)
    run(visit, 1, true)
    visit.release('drop', mid(1), false)
    run(visit, 1)
    expect(visit.game.world.kinds[1]).toBe('open')
    expect(visit.game.world.wet[1]).toBe(false)
    same(visit)
  })

  it('a boulder that comes to rest in a wet block takes the wet with it, and is not heaved into standing water', () => {
    // It falls into the wet block under it when the earth it stood on is dug.
    const world = cave('ob', '@e', 'eo')
    world.wet[indexOf(1, 2)] = true
    const { play: visit } = watched(world, 2)
    visit.press(mid(indexOf(1, 1)), false)
    run(visit, 2, true)
    visit.release('drop', undefined, false)
    run(visit, 2)
    expect(visit.game.world.kinds[indexOf(1, 2)]).toBe('boulder')
    expect(visit.game.world.wet[indexOf(1, 2)]).toBe(false)
    same(visit)
    // Standing in water with the rope, he strains and the boulder stays: no water is lost under it.
    const pool = withTool(cave('o~b'), 'rope')
    pool.mole.at = 1
    const { play: wading, log } = watched(pool, 2)
    wading.press(mid(2), false)
    run(wading, 3, true)
    wading.release('drop', undefined, false)
    expect(log.some((entry) => entry.event.type === 'strain')).toBe(true)
    expect(wading.game.world.kinds[2]).toBe('boulder')
    expect(wading.game.world.water[1]).toBe(true)
    same(wading)
  })

  it('a worm is back in earth that is packed again into its block, played on and loaded alike', () => {
    const homes = wormsOf(layWorld(1, 'near'))
    expect(homes.length).toBeGreaterThan(0)
    const home = homes.find((index) => colOf(index) > 0)!
    const world = withTool(cave(), 'bucket')
    world.kinds[home - 1] = 'open'
    world.mole.at = home - 1
    const { play: visit, log } = watched(world, 2)
    expect(visit.game.worms).toContain(home)
    visit.press(mid(home), false)
    run(visit, 2, true)
    visit.release('drop', undefined, false)
    expect(log.some((entry) => entry.event.type === 'scoop')).toBe(true)
    expect(visit.game.worms).not.toContain(home)
    same(visit)
    visit.press(mid(home), false)
    run(visit, 2, true)
    visit.release('drop', undefined, false)
    expect(visit.game.world.kinds[home]).toBe('earth')
    expect(visit.game.worms).toContain(home)
    same(visit)
  })

  it('a rope that is tied is drawn for as long as it is tied, between heaves too', () => {
    const { play: visit, log } = watched(withTool(cave('e@b'), 'rope'), 2)
    const stage = rig()
    stage.frame(visit)
    const slack = stage.view.pen
    visit.press(mid(2), false)
    run(visit, 2.5, true)
    visit.release('drop', undefined, false)
    run(visit, 1)
    expect(log.some((entry) => entry.event.type === 'creak')).toBe(true)
    expect(visit.game.mole.mode).toBe('rest')
    expect(visit.game.world.tied).toBe(2)
    stage.frame(visit)
    // One more stroke than before it was tied: the rope from his paw to the boulder.
    expect(stage.view.pen).toBe(slack + 1)
    same(visit)
    stage.frame(visit)
    expect(stage.view.pen).toBe(slack + 1)
  })
})

describe('an errand never opens a pocket', () => {
  it('sent to a gem behind a water pocket, he digs to the pocket, stops in front of it and looks back', () => {
    const world = drawn('@ewo')
    world.gems.push({ colour: 'red', at: 3, rest: 'floor' })
    const game = new Game(world)
    const gem = game.world.gems[0]
    game.press(gemSpot(game.world, gem))
    game.release('tap', gemSpot(game.world, gem))
    const log = play(game, 5)
    // He dug the earth in his way with no finger down, and that is all.
    expect(types(log).filter((type) => type === 'break')).toHaveLength(1)
    expect(types(log)).not.toContain('gush')
    expect(game.sceneName).toBeNull()
    expect(game.world.kinds[2]).toBe('water')
    expect(game.world.mole.at).toBe(1)
    expect(game.mole.mode).toBe('rest')
    // He faces the pocket and looks back over his shoulder.
    expect(game.mole.face).toBe(1)
    expect(game.mole.look.x).toBeLessThan(game.mole.x)
  })

  it('and never a gas pocket: no blast comes of a tap on a tool or the lift', () => {
    const world = drawn('@ao')
    world.tools.wedge = 2
    const game = new Game(world)
    game.press({ x: mid(2).x, y: HILL.y + CELL - 20 })
    game.release('tap', { x: mid(2).x, y: HILL.y + CELL - 20 })
    const log = play(game, 4)
    expect(types(log)).not.toContain('whoomph')
    expect(game.world.kinds[1]).toBe('gas')
    expect(game.world.mole.at).toBe(0)
  })
})

describe('a carried gem takes its light with it', () => {
  it('lights the dug block it is carried over, nothing while it is over rock, and its own place again when it goes back', () => {
    const world = drawn('@ooooooo')
    world.gems.push({ colour: 'blue', at: 1, rest: 'floor' })
    const game = new Game(world)
    const gem = game.world.gems[0]
    expect(game.masks[1]).not.toBe(0)
    expect(game.masks[6]).toBe(0)
    game.press(gemSpot(game.world, gem))
    game.drag({ x: mid(6).x, y: mid(6).y + CARRY_UP })
    expect(game.masks[6]).not.toBe(0)
    expect(game.masks[1]).toBe(0)
    // Over the rock under the row, and over the grass: it lights nothing.
    game.drag({ x: mid(indexOf(3, 2)).x, y: mid(indexOf(3, 2)).y + CARRY_UP })
    expect(game.masks.every((mask) => mask === 0)).toBe(true)
    game.drag({ x: mid(3).x, y: HILL.y - 30 })
    expect(game.masks.every((mask) => mask === 0)).toBe(true)
    // Taken away, it is back where it was, and so is its light; the save never moved.
    game.release('cancel')
    expect(game.masks).toEqual(lightOf(game.world))
    expect(game.masks[1]).not.toBe(0)
    expect(game.world.gems[0]).toEqual({ colour: 'blue', at: 1, rest: 'floor' })
  })
})

describe('a bat that the light drives out flies to the nearest dark', () => {
  it('along the dug space toward it, no further than a block and a half, and is found where it is drawn', () => {
    const world = drawn('@oooooooo')
    world.gems.push({ colour: 'red', at: 1, rest: 'floor' })
    const visit = new Play(world, 4, TIERS[0])
    run(visit, 2)
    const bat = visit.cast.lodgers.find((lodger) => lodger.kind === 'bat' && !lodger.leaving)
    expect(bat).toBeDefined()
    const gem = visit.game.world.gems[0]
    visit.press(gemSpot(visit.game.world, gem), false)
    const over = { x: mid(bat!.at).x, y: mid(bat!.at).y + CARRY_UP }
    visit.drag(over, false)
    run(visit, 0.3, true)
    // While the gem is in the child's hand its light is on the bat, and nobody moves out: it is saved where it was.
    expect(visit.game.masks[bat!.at]).not.toBe(0)
    expect(bat!.leaving).toBe(false)
    visit.release('drop', over, false)
    visit.step(FRAME, false)
    expect(bat!.leaving).toBe(true)
    // The way to the dark runs along the row, so that is the way it flies.
    expect(bat!.flight.y).toBe(0)
    expect(Math.abs(bat!.flight.x)).toBeGreaterThan(0)
    expect(Math.abs(bat!.flight.x)).toBeLessThanOrEqual(FLIGHT)
    expect(visit.game.world.kinds[bat!.at + Math.sign(bat!.flight.x)]).toBe('open')
    const before = lodgerBox(bat!).x
    run(visit, 0.2)
    if (bat!.shown > 0.02) {
      expect(Math.sign(lodgerBox(bat!).x - before)).toBe(Math.sign(bat!.flight.x))
      const box = lodgerBox(bat!)
      expect(visit.cast.under({ x: box.x + box.w / 2, y: box.y + box.h / 2 })).toMatchObject({ kind: 'bat' })
    }
  })

  it('draws back into its own roof where it hangs when no dark can be reached, and never rises over the grass', () => {
    const world = roomFor('bat')
    const visit = new Play(world, 4, TIERS[0])
    run(visit, 1)
    const bat = visit.cast.lodgers.find((lodger) => lodger.kind === 'bat')!
    world.gems.push({ colour: 'red', at: bat.at, rest: 'floor' })
    const gem = visit.game.world.gems[visit.game.world.gems.length - 1]
    // Picked up and set down where it lies: the light is worked out again, and the whole room is lit.
    visit.press(gemSpot(visit.game.world, gem), false)
    visit.release('cancel', undefined, false)
    visit.step(FRAME, false)
    expect(bat.leaving).toBe(true)
    expect(bat.flight).toEqual({ x: 0, y: 0 })
    // A bat of the top row whose way to the dark runs along the row stays under the grass line all the way.
    const top = drawn('@oooooooo')
    top.gems.push({ colour: 'red', at: 1, rest: 'floor' })
    const row = new Play(top, 4, TIERS[0])
    run(row, 2)
    const high = row.cast.lodgers.find((lodger) => lodger.kind === 'bat')!
    const lamp = row.game.world.gems[0]
    row.press(gemSpot(row.game.world, lamp), false)
    const over = { x: mid(high.at).x, y: mid(high.at).y + CARRY_UP }
    row.drag(over, false)
    row.release('drop', over, false)
    for (let t = 0; t < 0.6 && row.cast.lodgers.includes(high); t += FRAME) {
      row.step(FRAME, false)
      expect(lodgerBox(high).y).toBeGreaterThanOrEqual(HILL.y)
    }
  })
})

describe('earth that has nowhere to go stays in the bucket', () => {
  it('at the burrow he shakes his head and pats it back in: one sound, and the bucket is as full as it was', () => {
    const world = withTool(drawn(), 'bucket', 'earth')
    world.kinds[BURROW_INDEX] = 'open'
    world.kinds[BURROW_INDEX + COLS] = 'open'
    world.mole.at = BURROW_INDEX + COLS
    const game = new Game(world)
    game.press(mid(BURROW_INDEX))
    const log = play(game, 0.2)
    game.release('tap', mid(BURROW_INDEX))
    play(game, 2, log)
    // The knock on the burrow, whoever hangs there answering the finger, and then the one pat.
    expect(types(log).filter((type) => type !== 'poke')).toEqual(['knock', 'pat'])
    expect(game.world.mole.load).toBe('earth')
    expect(game.world.kinds[BURROW_INDEX]).toBe('open')
    // He never walked in.
    expect(game.world.mole.at).toBe(BURROW_INDEX + COLS)
    expect(log.find((entry) => entry.event.type === 'pat')!.t).toBeGreaterThanOrEqual(ACTS.refuse.cues[0])
  })

  it('and at a block that holds a tool, whatever the bucket holds', () => {
    for (const load of ['earth', 'sand', 'water'] as const) {
      const world = withTool(drawn('@oo'), 'bucket', load)
      world.tools.rope = 1
      const game = new Game(world)
      game.press(mid(1))
      const log = play(game, 0.2)
      game.release('tap', mid(1))
      play(game, 2, log)
      expect(types(log).filter((type) => type !== 'knock' && type !== 'poke'), load).toEqual(['pat'])
      expect(game.world.mole.load, load).toBe(load)
      expect(game.sceneName, load).toBeNull()
    }
  })
})

describe('the lift invites the second tap', () => {
  const waiting = (): Play => {
    const world = layWorld(3, 'near')
    world.mole.at = CAGE
    return new Play(world, 6, TIERS[0])
  }

  it('with the mole in the cage and the child idle, the mammoth reaches its trunk to the rope and taps it twice, without a sound', () => {
    const visit = waiting()
    run(visit, IDLE_BEFORE_DEMO - 0.1)
    expect(visit.cast.invite).toBeNull()
    visit.take()
    const seen: number[] = []
    let bobs = 0
    for (let t = 0; t < 3.2; t += FRAME) {
      const was = visit.cast.cage.v
      visit.step(FRAME, false)
      if (visit.cast.invite !== null) seen.push(visit.cast.invite)
      if (visit.cast.cage.v - was > 2) bobs += 1
    }
    expect(seen.length).toBeGreaterThan(100)
    expect(Math.max(...seen)).toBeGreaterThan(0.9)
    expect(bobs).toBe(INVITE_TAPS.length)
    expect(visit.take().notes).toHaveLength(0)
    // It rides nowhere by itself.
    expect(visit.game.sceneName).toBeNull()
    expect(visit.game.world.mole.at).toBe(CAGE)
  })

  it('the trunk is drawn off the crank and at the rope while it shows, and the hand shows no block then', () => {
    const visit = waiting(), stage = rig()
    const figures = (): NonNullable<typeof stage.view.pictures> => stage.view.pictures!
    stage.frame(visit)
    const trunk = (): { x: number; y: number }[] => stage.frame(visit).filter((one) => one.image === figures().mammoth.trunk.image).map((one) => ({ x: one.cx, y: one.cy }))
    const atRest = trunk()
    run(visit, IDLE_BEFORE_DEMO + 3 * (INVITE_TAPS[0] + 0.02))
    expect(visit.cast.invite).not.toBeNull()
    const showing = trunk()
    expect(showing).toHaveLength(atRest.length)
    // The tip is the first ring stamped: it has left the crank and is at the cage's rope.
    const rope = ROPE_AT
    const off = (at: { x: number; y: number }): number => Math.hypot(at.x - rope.x, at.y - rope.y)
    expect(off(atRest[0])).toBeGreaterThan(40)
    expect(off(showing[0])).toBeLessThan(24)
    expect(stage.frame(visit).some((one) => one.image === figures().hand.image)).toBe(false)
    // Anywhere else the hand still shows a block.
    const digging = new Play(layWorld(3, 'near'), 6, TIERS[0])
    run(digging, IDLE_BEFORE_DEMO + 1.2)
    expect(digging.cast.invite).toBeNull()
    expect(stage.frame(digging).some((one) => one.image === figures().hand.image)).toBe(true)
  })

  it('a tap on the lift then starts the ride', () => {
    const visit = waiting()
    run(visit, IDLE_BEFORE_DEMO + 1)
    visit.press({ x: LIFT.x + 60, y: LIFT.y + 100 }, false)
    // The ride waits for the finger to lift: only a tap starts it.
    expect(visit.game.sceneName).toBeNull()
    visit.release('tap', { x: LIFT.x + 60, y: LIFT.y + 100 }, false)
    expect(visit.game.sceneName).toBe('ride')
    visit.step(FRAME, true)
    expect(visit.cast.invite).toBeNull()
  })
})

describe('the ride', () => {
  it('keeps what he took into the cage in his paw until he steps out, and saves a fresh hillside with only his pick', () => {
    const world = layWorld(3, 'near')
    world.mole.at = CAGE
    world.mole.tool = 'bucket'
    world.mole.load = 'earth'
    world.mole.sooty = true
    const game = new Game(world)
    game.press({ x: LIFT.x + 60, y: LIFT.y + 100 })
    game.release('tap', { x: LIFT.x + 60, y: LIFT.y + 100 })
    expect(game.sceneName).toBe('ride')
    // What is saved from the first frame is the end of the ride: the fresh hillside, the mole in its burrow, no tool,
    // an empty bucket lying in its place on the grass, nothing tied, and the soot he had.
    const keeps = toSave(game.keeps)
    const fresh = worldOf(JSON.parse(JSON.stringify(keeps)), null, 1)
    expect(fresh.position).toBe('wild')
    expect(fresh.seed).not.toBe(world.seed)
    expect(fresh.mole).toEqual({ at: BURROW_INDEX, sooty: true, tool: null, load: 'nothing' })
    expect(fresh.tied).toBeNull()
    expect(fresh.gems.every((gem) => gem.rest !== 'bucket' && gem.rest !== 'hung')).toBe(true)
    expect(JSON.stringify(toSave(fresh))).toBe(JSON.stringify(keeps))
    // On screen the bucket of earth stays in his paw across the change of hillside, and is let go when the door opens.
    play(game, 6)
    expect(game.world.seed).toBe(fresh.seed)
    expect(game.world.mole.tool).toBeNull()
    expect(game.carried).toEqual({ tool: 'bucket', load: 'earth' })
    play(game, 1)
    expect(game.carried).toBeNull()
    play(game, 3)
    expect(game.sceneName).toBeNull()
    expect(JSON.stringify(toSave(game.world))).toBe(JSON.stringify(keeps))
    // Ended by a touch, nothing is left in his paw either.
    const cut = new Game(clone(world))
    cut.press({ x: LIFT.x + 60, y: LIFT.y + 100 })
    cut.release('tap', { x: LIFT.x + 60, y: LIFT.y + 100 })
    play(cut, 5.6)
    expect(cut.carried).not.toBeNull()
    cut.press(mid(40))
    expect(cut.carried).toBeNull()
    expect(cut.sceneName).toBeNull()
  })
})

describe('the lamp\'s rope is nobody\'s to take', () => {
  it('a tap on the mole under his lamp sets his tool down and takes up nothing; played on and loaded alike', () => {
    const world = withTool(drawn('@oe'), 'wedge')
    world.kinds[BURROW_INDEX] = 'open'
    world.gems.push({ colour: 'blue', at: 0, rest: 'hung' })
    world.tools.rope = 0
    const { play: visit, log } = watched(world, 3)
    visit.press({ x: visit.game.mole.x, y: visit.game.mole.y - 30 }, false)
    visit.release('tap', { x: visit.game.mole.x, y: visit.game.mole.y - 30 }, false)
    run(visit, 2)
    expect(log.map((entry) => entry.event.type).filter((type) => type === 'put' || type === 'take')).toEqual(['put'])
    expect(visit.game.world.mole.tool).toBeNull()
    expect(visit.game.world.tools.rope).toBe(0)
    expect(visit.game.world.gems[0]).toEqual({ colour: 'blue', at: 0, rest: 'hung' })
    const live = clone(visit.game.world)
    visit.park()
    expect(visit.game.world.gems).toEqual(live.gems)
    expect(visit.game.world.tools).toEqual(live.tools)
    expect(visit.game.world.mole).toEqual(live.mole)
    // A second tap on him is the hat only: with empty paws he takes nothing up, the rope least of all.
    visit.press({ x: visit.game.mole.x, y: visit.game.mole.y - 30 }, false)
    visit.release('tap', { x: visit.game.mole.x, y: visit.game.mole.y - 30 }, false)
    run(visit, 2)
    expect(visit.game.world.mole.tool).toBeNull()
    expect(visit.game.world.gems[0].rest).toBe('hung')
  })

  it('while a hung lamp is in the finger its rope is drawn, slack at its hook', () => {
    const world = drawn('ooo@')
    world.gems.push({ colour: 'blue', at: 1, rest: 'hung' })
    world.tools.rope = 1
    const visit = new Play(world, 3, TIERS[0])
    const stage = rig()
    run(visit, 0.5)
    stage.frame(visit)
    const hanging = stage.view.pen
    const lamp = stage.frame(visit).find((one) => one.image === stage.view.pictures!.gem.blue.image)!
    visit.press({ x: lamp.cx, y: lamp.cy }, false)
    expect(visit.game.hand).not.toBeNull()
    visit.drag({ x: lamp.cx + 60, y: lamp.cy + 40 }, false)
    stage.frame(visit)
    // The stroke of the rope is still there: one for one with the frame before.
    expect(stage.view.pen).toBe(hanging)
    visit.release('cancel', undefined, false)
    expect(visit.game.world.gems[0].rest).toBe('hung')
  })
})

describe('what the water held up', () => {
  it('a boulder over a pool that drains falls in a beat of its own, heard, when the mole is not swept', () => {
    const under = indexOf(2, 2)
    const game = new Game(drawn('eeb', 'ee~', 'o@e', 'ooo'))
    game.press(mid(under))
    const log: Log = []
    while (game.sceneName !== 'run') { game.step(FRAME); for (const event of game.drain()) log.push({ t: game.time, event }) }
    const keeps = JSON.stringify(toSave(game.keeps))
    const stood = game.world.mole.at
    const during = play(game, 3)
    expect(game.sceneName).toBe('run')
    expect(types(during)).toContain('thud')
    expect(game.world.kinds[indexOf(2, 0)]).toBe('open')
    play(game, 8)
    expect(game.sceneName).toBeNull()
    expect(game.world.mole.at).toBe(stood)
    expect(JSON.stringify(toSave(game.world))).toBe(keeps)
  })

  it('a long drain is hurried: the run ends inside its eight seconds', () => {
    const game = new Game(drawn('@weeeeeeeeeee', 'ooooooooooooo', 'eeeeeeeeeeeeo', 'ooooooooooooo', 'oeeeeeeeeeeee', 'ooooooooooooo'))
    game.press(mid(1))
    while (game.sceneName !== 'run') { game.step(FRAME); game.drain() }
    let lasted = 0, glugs = 0
    for (; game.sceneName !== null && lasted < 30; lasted += FRAME) { game.step(FRAME); glugs += game.drain().filter((event) => event.type === 'glug').length }
    expect(glugs).toBeGreaterThan(40)
    expect(lasted).toBeLessThanOrEqual(RUN_MOST_S + 2 * FRAME)
    expect(lasted).toBeGreaterThan(4)
  })
})

describe('taps, holds and errands', () => {
  it('a tap on dug space behind rock lands one blow on the first block in his way', () => {
    const game = new Game(drawn('@oso'))
    game.press(mid(3))
    game.release('tap', mid(3))
    const log = play(game, 3)
    expect(types(log).filter((type) => type === 'chip' || type === 'break')).toEqual(['chip'])
    expect(game.world.hits[2]).toBe(1)
    expect(game.world.mole.at).toBe(1)
    expect(game.busy).toBe(false)
  })

  it('a hold on a tool, on the lift or on the mammoth that lifts runs no errand, and a tap does', () => {
    const at = toolSpot(TOOL_HOME.rope)
    const lift = { x: LIFT.x + 60, y: LIFT.y + 100 }
    for (const [name, point, done] of [
      ['a tool', { x: at.x, y: at.y - 10 }, (game: Game) => game.world.mole.tool === 'rope'],
      ['the lift', lift, (game: Game) => game.world.mole.at === CAGE],
    ] as const) {
      const held = new Game(layWorld(3, 'near'))
      held.press(point)
      play(held, TAP_S + 0.1)
      held.release('tap', point)
      const stopped = held.world.mole.at
      play(held, 6)
      expect(done(held), name).toBe(false)
      expect(Math.abs(colOf(held.world.mole.at) - colOf(stopped)), name).toBeLessThanOrEqual(1)
      expect(held.busy, name).toBe(false)
      const tapped = new Game(layWorld(3, 'near'))
      tapped.press(point)
      tapped.release('tap', point)
      play(tapped, 8)
      expect(done(tapped), name).toBe(true)
    }
    // The mammoth, with a bucket of water in his paws.
    const world = withTool(layWorld(3, 'near'), 'bucket', 'water')
    const beast = { x: MAMMOTH.x + 120, y: MAMMOTH.y + 90 }
    const held = new Game(clone(world))
    held.press(beast)
    play(held, TAP_S + 0.1)
    held.release('tap', beast)
    expect(types(play(held, 8))).not.toContain('slurp')
    expect(held.world.mole.load).toBe('water')
    const tapped = new Game(clone(world))
    tapped.press(beast)
    tapped.release('tap', beast)
    expect(types(play(tapped, 10))).toContain('slurp')
  })
})

describe('a spout, a pool and a rolled-up hill', () => {
  it('a spout in the bottom row drips too', () => {
    const rows = ['e', 'e', 'e', 'e', 'e', 'e', '@p']
    const game = new Game(drawn(...rows))
    const spout = indexOf(1, 6)
    expect(game.world.kinds[spout]).toBe('spout')
    const drips = play(game, DRIP_S * 3.2).filter((entry) => entry.event.type === 'plink')
    expect(drips.length).toBeGreaterThanOrEqual(2)
    for (const drip of drips) expect(drip.event).toMatchObject({ index: spout })
  })

  it('earth tipped into standing water builds a block there as it does anywhere, and takes the water up; parked equals loaded', () => {
    const world = withTool(drawn('@~e'), 'bucket', 'earth')
    world.kinds[BURROW_INDEX] = 'open'
    const { play: visit, log } = watched(world, 2)
    visit.press(mid(1), false)
    run(visit, 2, true)
    visit.release('drop', undefined, false)
    expect(log.find((entry) => entry.event.type === 'tip')?.event).toMatchObject({ what: 'earth', index: 1 })
    expect(visit.game.sceneName).toBeNull()
    expect([visit.game.world.kinds[1], visit.game.world.water[1], visit.game.world.wet[1], visit.game.world.mole.load]).toEqual(['earth', false, false, 'nothing'])
    const live = clone(visit.game.world)
    visit.park()
    expect(visit.game.world.kinds).toEqual(live.kinds)
    expect(visit.game.world.water).toEqual(live.water)
    expect(visit.game.world.wet).toEqual(live.wet)
  })

  it('nobody of the old cave is heard leaving when the hillside is rolled away', () => {
    const world = roomFor('bat')
    world.mole.at = CAGE
    const game = new Game(world)
    expect(game.dwellers.length).toBeGreaterThan(0)
    game.press({ x: LIFT.x + 60, y: LIFT.y + 100 })
    game.release('tap', { x: LIFT.x + 60, y: LIFT.y + 100 })
    const log = play(game, 10)
    expect(game.sceneName).toBeNull()
    expect(types(log)).toContain('unroll')
    expect(types(log)).not.toContain('leave')
  })
})

// --- The third reading ---------------------------------------------------------------------------------------------

/** A hill drawn by hand with the burrow dug, as every saved hill has it. */
const dugHill = (...rows: string[]): World => { const world = drawn(...rows); world.kinds[BURROW_INDEX] = 'open'; return world }
/** How many gems the hill holds: the ones in the rock and the ones out of it. */
const gemCount = (world: World): number => world.lode.filter((colour) => colour !== null).length + world.gems.length
/** Whether he looks back over his shoulder: at a point behind the way he faces. */
const looksBack = (game: Game): boolean => (game.mole.look.x - game.mole.x) * game.mole.face < 0

describe('an errand is run only by a tap', () => {
  const rope = toolSpot(TOOL_HOME.rope)
  const targets = [
    { name: 'a tool', world: () => layWorld(3, 'near'), at: { x: rope.x, y: rope.y - 10 }, there: (game: Game) => game.world.mole.at === TOOL_HOME.rope, done: (game: Game, log: Log) => game.world.mole.tool === 'rope' || types(log).includes('take') },
    { name: 'the lift', world: () => layWorld(3, 'near'), at: { x: LIFT.x + 60, y: LIFT.y + 100 }, there: (game: Game) => game.world.mole.at === CAGE + 1, done: (game: Game) => game.world.mole.at === CAGE },
    { name: 'the mammoth', world: () => withTool(layWorld(3, 'near'), 'bucket', 'water'), at: { x: MAMMOTH.x + 120, y: MAMMOTH.y + 90 }, there: (game: Game) => game.world.mole.at === grassNode(BURROW.c - 1), done: (game: Game, log: Log) => game.world.mole.load !== 'water' || types(log).includes('slurp') },
  ]

  for (const target of targets) {
    it(`a hold on ${target.name} of 0.4 s, of 0.6 s, and one that never lifts: he stops, looks back and takes nothing`, () => {
      for (const hold of [0.4, 0.6, Infinity]) {
        const game = new Game(target.world())
        game.press(target.at)
        const log = play(game, Math.min(hold, 8))
        if (hold < Infinity) { game.release('tap', target.at); play(game, 8, log) }
        expect(target.done(game, log), `${hold}`).toBe(false)
        expect(looksBack(game), `${hold}`).toBe(true)
        expect(game.mole.mode, `${hold}`).toBe('rest')
        // The hold that never lifts outlasts the walk: he is there, and still does not do it.
        if (hold === Infinity) expect(target.there(game)).toBe(true)
        // The finger that lifts at last, after he has stopped, starts nothing either.
        if (hold === Infinity) { game.release('tap', target.at); play(game, 4, log); expect(target.done(game, log)).toBe(false) }
      }
    })
  }

  it('a tap does all three, and a tap that lifts just after he has arrived still counts', () => {
    for (const target of targets) {
      const game = new Game(target.world())
      game.press(target.at)
      game.release('tap', target.at)
      expect(target.done(game, play(game, 10)), target.name).toBe(true)
    }
    // He stands one step from the wedge: the finger comes down, he is there before it lifts, and it lifts as a tap.
    const world = layWorld(3, 'near')
    world.mole.at = TOOL_HOME.wedge - 1
    const game = new Game(world)
    const wedge = toolSpot(TOOL_HOME.wedge)
    game.press({ x: wedge.x, y: wedge.y - 10 })
    play(game, WALK_S + 0.04)
    expect(game.world.mole.at).toBe(TOOL_HOME.wedge)
    expect(game.world.mole.tool).toBeNull()
    game.release('tap', wedge)
    play(game, 2)
    expect(game.world.mole.tool).toBe('wedge')
  })
})

describe('one block holds one tool', () => {
  const apartTools = (world: World): boolean => {
    const lying = (['wedge', 'bucket', 'rope'] as const).filter((tool) => world.mole.tool !== tool && !(tool === 'rope' && world.gems.some((gem) => gem.rest === 'hung')))
    return new Set(lying.map((tool) => world.tools[tool])).size === lying.length
  }
  /** Played on and parked is what a load of the save gives: every tool where it lay. */
  const asLeft = (visit: Play): void => {
    const live = clone(visit.game.world)
    expect(apartTools(live)).toBe(true)
    expect(worldOf(JSON.parse(JSON.stringify(toSave(live))), null, 1).tools).toEqual(live.tools)
    visit.park()
    expect(visit.game.world.tools).toEqual(live.tools)
    expect(visit.game.world.gems).toEqual(live.gems)
  }

  it('the rope a lamp lets go comes down on the tool under it and lands beside it, seen and heard; played on equals loaded', () => {
    const world = dugHill('eeeee', '@oooe', 'ggggg')
    const lamp = indexOf(2, 1)
    world.gems.push({ colour: 'red', at: lamp, rest: 'hung' })
    world.tools.rope = lamp
    world.tools.wedge = lamp
    const { play: visit, log } = watched(world, 3)
    const gem = visit.game.world.gems[0]
    visit.press(visit.game.gemPlace(gem), false)
    const to = { x: mid(indexOf(3, 1)).x, y: mid(indexOf(3, 1)).y + CARRY_UP }
    visit.drag(to, false)
    visit.release('drop', to, false)
    expect(gem).toMatchObject({ at: indexOf(3, 1), rest: 'floor' })
    // The rope is on its way at once: down onto the wedge, then off it to the floor beside.
    const rope = visit.game.motions.find((motion) => motion.tool === 'rope')
    expect(rope?.via).toBeDefined()
    expect(visit.game.world.tools.rope).toBe(indexOf(1, 1))
    expect(visit.game.world.tools.wedge).toBe(lamp)
    const seen: number[] = []
    for (let t = 0; t < 1.5; t += FRAME) { visit.step(FRAME, false); seen.push(visit.game.toolPlace('rope').x) }
    expect(Math.max(...seen)).toBeGreaterThan(toolSpot(indexOf(1, 1)).x + CELL / 2)
    expect(visit.game.toolPlace('rope')).toEqual(toolSpot(indexOf(1, 1)))
    expect(log.filter((entry) => entry.event.type === 'clunk').map((entry) => (entry.event as { index: number }).index)).toEqual([lamp, indexOf(1, 1)])
    asLeft(visit)
  })

  it('a tool set down in a shaft over a lying tool lands beside it where there is room, and on top of it where there is none', () => {
    // Room beside the bucket at the foot of the shaft.
    const roomy = withTool(dugHill('@e', 'oe', 'oo', 'gg'), 'wedge')
    roomy.tools.bucket = indexOf(0, 2)
    const first = watched(roomy, 3)
    first.play.press({ x: first.play.game.mole.x, y: first.play.game.mole.y - 30 }, false)
    first.play.release('tap', undefined, false)
    run(first.play, 3)
    expect(first.play.game.world.mole.tool).toBeNull()
    expect(first.play.game.world.tools).toMatchObject({ bucket: indexOf(0, 2), wedge: indexOf(1, 2) })
    expect(first.log.filter((entry) => entry.event.type === 'clunk').map((entry) => (entry.event as { index: number }).index)).toEqual([indexOf(0, 2), indexOf(1, 2)])
    asLeft(first.play)
    // Let go in the block directly above the lying tool, with free floor beside it: it goes there too, and does not stay up.
    const close = withTool(dugHill('@e', 'oo', 'gg'), 'wedge')
    close.tools.bucket = indexOf(0, 1)
    const third = watched(close, 3)
    third.play.press({ x: third.play.game.mole.x, y: third.play.game.mole.y - 30 }, false)
    third.play.release('tap', undefined, false)
    run(third.play, 3)
    expect(third.play.game.world.tools).toMatchObject({ bucket: indexOf(0, 1), wedge: indexOf(1, 1) })
    expect(third.log.filter((entry) => entry.event.type === 'clunk').map((entry) => (entry.event as { index: number }).index)).toEqual([indexOf(0, 1), indexOf(1, 1)])
    asLeft(third.play)
    // A shaft one block wide: it comes to rest on the bucket, one block up, and stays there.
    const narrow = withTool(dugHill('@', 'o', 'o', 'g'), 'wedge')
    narrow.tools.bucket = indexOf(0, 2)
    const second = watched(narrow, 3)
    second.play.press({ x: second.play.game.mole.x, y: second.play.game.mole.y - 30 }, false)
    second.play.release('tap', undefined, false)
    run(second.play, 3)
    expect(second.play.game.world.tools).toMatchObject({ bucket: indexOf(0, 2), wedge: indexOf(0, 1) })
    expect(second.log.filter((entry) => entry.event.type === 'clunk')).toHaveLength(1)
    asLeft(second.play)
    // It is drawn sitting on the bucket, its foot on the bucket's top, and is found there.
    const game = second.play.game
    expect(game.toolPlace('wedge').y).toBe(game.toolPlace('bucket').y - TOOL_SIZE.bucket.h + 6)
    const stage = rig()
    const stamps = stage.frame(second.play)
    const wedge = stampsOf(stamps, stage.view.pictures!.tool.wedge)[0], bucket = stampsOf(stamps, stage.view.pictures!.tool.bucket)[0]
    expect(bucket.y - (wedge.y + wedge.h)).toBeLessThan(12)
    expect(bucket.y - (wedge.y + wedge.h)).toBeGreaterThan(-12)
  })

  it('a lamp whose roof is dug away drops, and its rope falls too, seen, with its clunk', () => {
    const world = dugHill('e@eee', 'eoooe', 'ggggg')
    const lamp = indexOf(2, 1)
    world.gems.push({ colour: 'blue', at: lamp, rest: 'hung' })
    world.tools.rope = lamp
    const { play: visit, log } = watched(world, 3)
    visit.press(mid(indexOf(2, 0)), false)
    visit.release('tap', mid(indexOf(2, 0)), false)
    let fell = false
    for (let t = 0; t < 3; t += FRAME) { visit.step(FRAME, false); fell ||= visit.game.motions.some((motion) => motion.tool === 'rope') }
    expect(visit.game.world.kinds[indexOf(2, 0)]).toBe('open')
    expect(visit.game.world.gems[0]).toMatchObject({ at: lamp, rest: 'floor' })
    expect(fell).toBe(true)
    expect(log.filter((entry) => entry.event.type === 'clunk').map((entry) => (entry.event as { index: number }).index)).toEqual([lamp])
    expect(visit.game.world.tools.rope).toBe(lamp)
    asLeft(visit)
    // With a tool lying under the lamp the rope lands beside it.
    const crowded = dugHill('e@eee', 'eoooe', 'ggggg')
    crowded.gems.push({ colour: 'blue', at: lamp, rest: 'hung' })
    crowded.tools.rope = lamp
    crowded.tools.bucket = lamp
    const next = watched(crowded, 3)
    next.play.press(mid(indexOf(2, 0)), false)
    next.play.release('tap', mid(indexOf(2, 0)), false)
    run(next.play, 3)
    expect(next.play.game.world.tools.bucket).toBe(lamp)
    expect(next.play.game.world.tools.rope).not.toBe(lamp)
    asLeft(next.play)
  })
})

describe('a gem let go where it cannot lie is seen and heard going where it goes', () => {
  const carry = (world: World, colour: 'red' | 'blue', to: Point): { game: Game; gem: World['gems'][number]; log: Log } => {
    const game = new Game(world)
    const gem = game.world.gems.find((other) => other.colour === colour)!
    game.press(game.gemPlace(gem))
    game.drag(to)
    game.release('drop', to)
    // Seen from the frame it is let go in: it is on its way from where it was drawn.
    expect(game.motions.some((motion) => motion.gem === gem)).toBe(true)
    expect(game.gemPlace(gem).x).toBeCloseTo(to.x, 5)
    expect(game.gemPlace(gem).y).toBeCloseTo(to.y - CARRY_UP, 5)
    const log = play(game, 2)
    expect(game.motions).toEqual([])
    return { game, gem, log }
  }
  const over = (index: number, dx = 0): Point => ({ x: mid(index).x + dx, y: mid(index).y + CARRY_UP })
  const tiks = (log: Log): number[] => log.filter((entry) => entry.event.type === 'tik').map((entry) => (entry.event as { index: number }).index)

  it('on a floor where a gem lies it lands on that one and comes to rest beside it, with two tiks', () => {
    const world = dugHill('@ooo', 'gggg')
    world.gems.push({ colour: 'red', at: 1, rest: 'floor' }, { colour: 'blue', at: 3, rest: 'floor' })
    const { game, gem, log } = carry(world, 'blue', over(1, 20))
    expect(gem).toMatchObject({ at: 2, rest: 'floor' })
    expect(tiks(log)).toEqual([1, 2])
    expect(game.world.gems.find((other) => other.colour === 'red')).toMatchObject({ at: 1, rest: 'floor' })
    // The side the finger is on first; with rock there, the other side.
    const walled = dugHill('@oeo', 'gggg')
    walled.gems.push({ colour: 'red', at: 1, rest: 'floor' }, { colour: 'blue', at: 3, rest: 'floor' })
    const other = carry(walled, 'blue', over(1, 0))
    expect(other.gem).toMatchObject({ at: 0, rest: 'floor' })
    expect(tiks(other.log)).toEqual([1, 0])
  })

  it('over rock it drops into the dug block under it or beside it, with its tik', () => {
    const beside = dugHill('@oooe', 'ggggg')
    beside.gems.push({ colour: 'blue', at: 1, rest: 'floor' })
    const a = carry(beside, 'blue', over(4, -20))
    expect(a.gem).toMatchObject({ at: 3, rest: 'floor' })
    expect(tiks(a.log)).toEqual([3])
    const under = dugHill('@oeee', 'eeeoe', 'ggggg')
    under.gems.push({ colour: 'blue', at: 1, rest: 'floor' })
    const b = carry(under, 'blue', over(3, 0))
    expect(b.gem).toMatchObject({ at: indexOf(3, 1), rest: 'floor' })
    expect(tiks(b.log)).toEqual([indexOf(3, 1)])
  })

  it('over the grass it drops down a shaft that is open under it, with its tik', () => {
    const world = dugHill('@o')
    world.gems.push({ colour: 'blue', at: 1, rest: 'floor' })
    const { gem, log } = carry(world, 'blue', { x: mid(BURROW_INDEX).x, y: HILL.y - 20 + CARRY_UP })
    expect(gem).toMatchObject({ at: BURROW_INDEX, rest: 'floor' })
    expect(tiks(log)).toEqual([BURROW_INDEX])
  })

  it('with no dug block under it or beside it, it flies back in an arc to where it was, heard when it lands; a lamp goes back to its rope with a tock', () => {
    for (const to of [over(indexOf(3, 3)), { x: mid(3).x, y: HILL.y - 20 + CARRY_UP }]) {
      const world = dugHill('@oooo', 'ggggg')
      world.gems.push({ colour: 'blue', at: 1, rest: 'floor' })
      const game = new Game(world)
      const gem = game.world.gems[0]
      const was = game.gemPlace(gem)
      game.press(was)
      game.drag(to)
      game.release('drop', to)
      expect(gem).toMatchObject({ at: 1, rest: 'floor' })
      const flight = game.motions.find((motion) => motion.gem === gem)
      expect(flight?.how).toBe('arc')
      // An arc: half way it is above the straight line between the two ends.
      game.step(flight!.length / 2)
      const half = game.gemPlace(gem)
      expect(half.y).toBeLessThan((was.y + to.y - CARRY_UP) / 2 - 10)
      const log = play(game, 1)
      expect(tiks(log)).toEqual([1])
      expect(game.gemPlace(gem)).toMatchObject({ x: was.x, y: was.y })
    }
    const hung = dugHill('eeeee', '@oooe', 'ggggg')
    hung.gems.push({ colour: 'red', at: indexOf(2, 1), rest: 'hung' })
    hung.tools.rope = indexOf(2, 1)
    const game = new Game(hung)
    game.press(game.gemPlace(game.world.gems[0]))
    game.drag(over(indexOf(2, 3)))
    game.release('drop', over(indexOf(2, 3)))
    expect(types(play(game, 1))).toContain('tock')
    expect(game.world.gems[0]).toMatchObject({ at: indexOf(2, 1), rest: 'hung' })
  })
})

describe('a carried gem is set down in the block it is drawn in', () => {
  it('one place for the picture, the light and the drop: the block above the finger, not the finger\'s own', () => {
    const world = dugHill('@oo', 'eoe', 'eoe', 'ggg')
    world.gems.push({ colour: 'blue', at: 2, rest: 'floor' })
    const game = new Game(world)
    const gem = game.world.gems[0]
    game.press(game.gemPlace(gem))
    // The finger is at the top of the block under the tunnel, by its left wall; the gem is drawn in the tunnel.
    const finger = { x: HILL.x + CELL + 14, y: HILL.y + CELL + 10 }
    game.drag(finger)
    const drawnIn = indexOf(1, 0)
    expect(game.masks[0] & 4).toBe(4)
    expect(game.masks[indexOf(1, 2)] & 4).toBe(4)
    game.release('drop', finger)
    // In the tunnel there is no wall to its left: it drops down the shaft. In the finger's block there is one.
    expect(game.world.kinds[drawnIn - 1]).toBe('open')
    expect(gem).toMatchObject({ at: indexOf(1, 2), rest: 'floor' })
    expect(game.gemPlace(gem)).toMatchObject({ x: finger.x, y: finger.y - CARRY_UP })
  })
})

describe('packed earth never destroys a gem', () => {
  it('earth tipped onto two gems with rock above buries one and pushes the other out beside it, seen and heard; played on equals loaded', () => {
    const world = withTool(dugHill('@oe', 'gge'), 'bucket', 'earth')
    world.gems.push({ colour: 'red', at: 1, rest: 'floor' }, { colour: 'blue', at: 1, rest: 'floor' })
    const before = gemCount(world)
    const { play: visit, log } = watched(world, 2)
    visit.press(mid(1), false)
    let seen = false
    for (let t = 0; t < 2; t += FRAME) { visit.step(FRAME, true); seen ||= visit.game.motions.some((motion) => motion.gem !== undefined && motion.how === 'arc') }
    visit.release('drop', mid(1), false)
    run(visit, 1)
    const now = visit.game.world
    expect(now.kinds[1]).toBe('earth')
    expect(gemCount(now)).toBe(before)
    expect(now.lode[1]).toBe('red')
    expect(now.gems).toEqual([{ colour: 'blue', at: 0, rest: 'floor' }])
    expect(seen).toBe(true)
    expect(log.filter((entry) => entry.event.type === 'tik').map((entry) => (entry.event as { index: number }).index)).toEqual([0])
    const live = clone(now)
    visit.park()
    expect(visit.game.world.gems).toEqual(live.gems)
    expect(visit.game.world.lode).toEqual(live.lode)
  })

  it('over seeded hills, in a long random play with the bucket, the count of gems never falls', () => {
    for (const seed of [21, 22, 23, 24, 25, 26]) {
      const game = new Game(layWorld(seed, seed % 2 ? 'near' : 'wild'))
      const rng = makeRng(seed * 104729)
      const anywhere = (): Point => ({ x: HILL.x + rng.next() * COLS * CELL, y: HILL.y + rng.next() * 7 * CELL })
      const nearby = (): Point => ({ x: game.mole.x + (rng.next() - 0.5) * 3 * CELL, y: Math.max(HILL.y + 5, game.mole.y - 40 + (rng.next() - 0.4) * 3 * CELL) })
      const go = (seconds: number): void => { for (let t = 0; t < seconds; t += FRAME) { game.step(FRAME); game.drain(); expect(gemCount(game.world)).toBe(9) } }
      expect(gemCount(game.world)).toBe(9)
      for (let move = 0; move < 160; move++) {
        const pick = rng.next()
        if (pick < 0.45) {
          const at = rng.next() < 0.7 ? nearby() : anywhere()
          game.press(at); go(0.2 + rng.next() * 1.6); game.release('drop', at)
        } else if (pick < 0.6) {
          const at = rng.next() < 0.7 ? nearby() : anywhere()
          game.press(at); game.release('tap', at); go(0.8)
        } else if (pick < 0.72) {
          // The bucket, more often than the other tools: it is the one that packs earth.
          const tool = rng.next() < 0.7 ? 'bucket' : rng.next() < 0.5 ? 'wedge' : 'rope'
          const at = game.toolPlace(tool)
          game.press({ x: at.x, y: at.y - 20 }); game.release('tap', at); go(2.5)
        } else if (pick < 0.94 && game.world.gems.some((gem) => gem.rest !== 'bucket')) {
          const free = game.world.gems.filter((gem) => gem.rest !== 'bucket')
          const gem = free[Math.floor(rng.next() * free.length)]
          const from = game.gemPlace(gem)
          game.press(from)
          if (rng.next() < 0.3) game.release('tap', from)
          else {
            // Carried onto another gem as often as not: the child mixing two colours.
            const onto = free[Math.floor(rng.next() * free.length)]
            const spot = rng.next() < 0.5 ? game.gemPlace(onto) : anywhere()
            const to = { x: spot.x, y: spot.y + CARRY_UP }
            game.drag(to); go(0.2); game.release('drop', to)
          }
          go(1.2)
        } else {
          const lift = { x: LIFT.x + LIFT.w / 2, y: LIFT.y + 100 }
          game.press(lift); game.release('tap', lift); go(1)
        }
        expect(gemCount(game.world)).toBe(9)
        expect(gemCount(game.keeps)).toBe(9)
      }
    }
  })
})

describe('a tap during the blow of the tap before is not lost', () => {
  const tap = (game: Game, at: Point): void => { game.press(at); game.release('tap', at) }

  it('fast taps dig every time: three taps, each in the blow of the one before, are three blows', () => {
    const game = new Game(drawn('@se'))
    const log: Log = []
    tap(game, mid(1))
    play(game, ACTS.swing.length / 2, log)
    expect(game.mole.act).toBe('swing')
    tap(game, mid(1))
    play(game, ACTS.swing.length, log)
    expect(game.mole.act).toBe('swing')
    tap(game, mid(1))
    play(game, 3, log)
    expect(blows(log)).toBe(3)
    expect(game.world.kinds[1]).toBe('open')
  })

  it('one blow in hand at the most: three more taps inside one blow add one blow', () => {
    const game = new Game(drawn('@se'))
    const log: Log = []
    tap(game, mid(1))
    for (let i = 0; i < 3; i++) { play(game, ACTS.swing.length / 5, log); expect(game.mole.act).toBe('swing'); tap(game, mid(1)) }
    play(game, 3, log)
    expect(blows(log)).toBe(2)
    expect(game.world.hits[1]).toBe(2)
  })
})

describe('what a pool held up falls when the water under it has gone', () => {
  it('a boulder over a pool two blocks deep falls when the upper block has drained, into no water that is still shown', () => {
    const game = new Game(drawn('eeb', 'ee~', 'ee~', 'o@e', 'ooo'))
    game.press(mid(indexOf(2, 3)))
    while (game.sceneName !== 'run') { game.step(FRAME); game.drain() }
    const top = indexOf(2, 0)
    let fellAt = -1
    const wet: boolean[] = []
    for (let t = 0; t < 9 && game.sceneName !== null; t += FRAME) {
      game.step(FRAME)
      game.drain()
      if (fellAt < 0 && game.world.kinds[top] !== 'boulder') { fellAt = t; for (const r of [1, 2, 3]) wet.push(game.world.water[indexOf(2, r)]) }
    }
    expect(fellAt).toBeGreaterThan(0)
    expect(wet).toEqual([false, false, false])
    expect(game.world.kinds[indexOf(2, 3)]).toBe('boulder')
  })

  it('water that the fall lets go is played in the run: heard block by block, and at rest before the scene ends', () => {
    // The boulder stands on a pool and dams the pool to its left; when its own pool drains it falls, and the other runs.
    const game = new Game(drawn('eeee', 'e~be', 'ee~e', 'e@ee', 'eooo'))
    game.press(mid(indexOf(2, 3)))
    while (game.sceneName !== 'run') { game.step(FRAME); game.drain() }
    const ends = clone(game.keeps)
    expect(ends.water[indexOf(1, 1)]).toBe(false)
    expect(ends.water[indexOf(2, 2)]).toBe(true)
    const glugs: number[] = []
    let last: boolean[] = []
    for (let t = 0; t < 9 && game.sceneName !== null; t += FRAME) {
      game.step(FRAME)
      for (const event of game.drain()) if (event.type === 'glug') glugs.push(event.index)
      if (game.sceneName !== null) last = [...game.world.water]
    }
    expect(glugs).toContain(indexOf(2, 1))
    expect(glugs).toContain(indexOf(1, 1))
    // Nothing jumps at the scene's end: the water shown in its last frame is the water it ends in.
    expect(last).toEqual(ends.water)
    expect(game.world.water).toEqual(ends.water)
  })
})

describe('glugs keep changing', () => {
  it('past the fifteenth block no two glugs that follow each other have one pitch', () => {
    const pitch = (n: number): number => notesOf({ type: 'glug', index: 0, n })[0].frequency
    for (let n = 0; n < 60; n++) expect(pitch(n + 1), `${n}`).not.toBe(pitch(n))
    // Down the scale, a little lower each time, and from the top again when the scale is done.
    for (let n = 0; n + 1 < GLUG_SCALE; n++) expect(pitch(n + 1)).toBeLessThan(pitch(n))
    expect(pitch(GLUG_SCALE)).toBe(pitch(0))
  })
})

describe('at the unroll the old dwellers are not drawn on the fresh hill', () => {
  it('whoever lived in the old cave is gone from the cast in the frame the fresh hillside is laid', () => {
    const world = roomFor('bat')
    world.mole.at = CAGE
    const { play: visit, log } = watched(world, 5)
    expect(visit.cast.lodgers.length).toBeGreaterThan(0)
    const old = visit.cast.lodgers.map((lodger) => lodger)
    visit.press({ x: LIFT.x + 60, y: LIFT.y + 100 }, false)
    visit.release('tap', { x: LIFT.x + 60, y: LIFT.y + 100 }, false)
    let frames = 0
    for (let t = 0; t < 10 && visit.game.sceneName !== null; t += FRAME) {
      visit.step(FRAME, false)
      if (!log.some((entry) => entry.event.type === 'unroll')) continue
      frames += 1
      for (const lodger of visit.cast.lodgers) { expect(old).not.toContain(lodger); expect(lodger.leaving).toBe(false) }
    }
    expect(frames).toBeGreaterThan(30)
  })
})

describe('every hillside holds three or four lumps of granite', () => {
  /** The lumps of granite a child sees: blocks of it that touch, at a side or at a corner, are one lump. */
  const lumps = (world: World): number => {
    const seen = new Set<number>()
    let count = 0
    for (let index = 0; index < world.kinds.length; index++) {
      if (world.kinds[index] !== 'granite' || seen.has(index)) continue
      count += 1
      const edge = [index]
      seen.add(index)
      while (edge.length > 0) {
        const at = edge.pop()!
        for (let other = 0; other < world.kinds.length; other++) {
          if (world.kinds[other] !== 'granite' || seen.has(other)) continue
          if (Math.abs(colOf(other) - colOf(at)) <= 1 && Math.abs(rowOf(other) - rowOf(at)) <= 1) { seen.add(other); edge.push(other) }
        }
      }
    }
    return count
  }

  it('on `near`, with the lump under the burrow counted, and on the wild ones: three or four, and no two that touch', () => {
    const counts = new Set<number>()
    for (let seed = 1; seed <= 400; seed++) {
      for (const position of ['near', 'wild'] as const) {
        const count = lumps(layWorld(seed, position))
        counts.add(count)
        expect([3, 4], `${position} ${seed}`).toContain(count)
      }
      expect(layWorld(seed, 'near').kinds[indexOf(BURROW.c, 4)]).toBe('granite')
    }
    expect([...counts].sort()).toEqual([3, 4])
  })
})

describe('two lookalikes of the third reading', () => {
  it('a knocked gem flashes as one round bloom of its colour, never as squares laid in a plus', () => {
    const world = drawn('@Re', 'eee')
    const { play: visit } = watched(world, 4)
    const { view, frame } = rig(1)
    frame(visit)
    const still = view.pen
    visit.press(mid(1), false)
    visit.release('cancel', undefined, false)
    expect(visit.effects.flashes).toHaveLength(1)
    const stamps = frame(visit)
    const blooms = stampsOf(stamps, view.pictures!.bloom.red)
    expect(blooms).toHaveLength(1)
    expect(Math.abs(blooms[0].cx - mid(1).x)).toBeLessThan(1)
    expect(Math.abs(blooms[0].cy - mid(1).y)).toBeLessThan(1)
    // Round and soft: wider than its block, and no filled square is added for it.
    expect(blooms[0].w).toBeGreaterThan(CELL * 1.5)
    expect(Math.abs(blooms[0].w - blooms[0].h)).toBeLessThan(blooms[0].w * 0.1)
    expect(view.pen).toBeLessThan(still + 5)
  })

  it('the ghost hand has two knuckle creases that are bowed, unequal and not upright side by side', () => {
    const length = (crease: readonly (readonly [number, number])[]): number => crease.slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - crease[i][0], point[1] - crease[i][1]), 0)
    const bow = (crease: readonly (readonly [number, number])[]): number => {
      const a = crease[0], b = crease[crease.length - 1]
      const chord = Math.hypot(b[0] - a[0], b[1] - a[1])
      return Math.max(...crease.map((point) => Math.abs((b[0] - a[0]) * (a[1] - point[1]) - (a[0] - point[0]) * (b[1] - a[1])) / chord))
    }
    const lean = (crease: readonly (readonly [number, number])[]): number => Math.atan2(crease[crease.length - 1][0] - crease[0][0], crease[crease.length - 1][1] - crease[0][1])
    expect(KNUCKLES).toHaveLength(2)
    for (const crease of KNUCKLES) { expect(crease.length).toBeGreaterThanOrEqual(3); expect(bow(crease)).toBeGreaterThan(1.5) }
    expect(length(KNUCKLES[0]) / length(KNUCKLES[1])).toBeGreaterThan(1.4)
    expect(Math.abs(lean(KNUCKLES[0]) - lean(KNUCKLES[1]))).toBeGreaterThan(0.4)
  })
})

// --- The fourth reading --------------------------------------------------------------------------------------------

describe('a gem freed over a drop is seen falling from its block', () => {
  it('from the block it sprang out of to where it lands, with its tik at the landing and nowhere before', () => {
    const game = new Game(drawn('@Re', 'eoe', 'eoe', 'ggg'))
    game.press(mid(1))
    game.release('tap', mid(1))
    const log: Log = []
    const ys: number[] = []
    let landed = -1
    for (let t = 0; t < 3; t += FRAME) {
      game.step(FRAME)
      for (const event of game.drain()) { log.push({ t: game.time, event }); if (event.type === 'tik') landed = ys.length }
      if (game.world.gems.length > 0) ys.push(game.gemPlace(game.world.gems[0]).y)
    }
    const gem = game.world.gems[0]
    expect(gem).toMatchObject({ at: indexOf(1, 2), rest: 'floor' })
    // It starts in the block it was freed in, and comes down without a jump.
    expect(ys[0]).toBeLessThan(HILL.y + CELL)
    for (let i = 1; i < ys.length; i++) { expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1] - 1e-9); expect(ys[i] - ys[i - 1]).toBeLessThan(40) }
    expect(log.filter((entry) => entry.event.type === 'tik').map((entry) => (entry.event as { index: number }).index)).toEqual([indexOf(1, 2)])
    expect(ys[landed]).toBeCloseTo(gemSpot(game.world, gem).y, 5)
    expect(types(log)).toContain('ping')
  })
})

describe('a lamp flying back to its rope', () => {
  it('has its rope drawn, slack at its hook, through the flight', () => {
    const world = drawn('eeeee', '@oooe', 'ggggg')
    world.gems.push({ colour: 'blue', at: indexOf(2, 1), rest: 'hung' })
    world.tools.rope = indexOf(2, 1)
    const visit = new Play(world, 3, TIERS[0])
    const stage = rig()
    run(visit, 0.5)
    stage.frame(visit)
    const hanging = stage.view.pen
    const lamp = stage.frame(visit).find((one) => one.image === stage.view.pictures!.gem.blue.image)!
    visit.press({ x: lamp.cx, y: lamp.cy }, false)
    const to = { x: mid(indexOf(2, 3)).x, y: mid(indexOf(2, 3)).y + CARRY_UP }
    visit.drag(to, false)
    visit.release('drop', to, false)
    let frames = 0
    while (visit.game.motions.some((motion) => motion.gem !== undefined)) {
      stage.frame(visit)
      // The stroke of the rope is there in every frame of the flight: one for one with the lamp hanging.
      expect(stage.view.pen).toBe(hanging)
      visit.step(FRAME, false)
      frames += 1
    }
    expect(frames).toBeGreaterThan(10)
    expect(visit.game.world.gems[0].rest).toBe('hung')
  })
})

describe('he looks back over his shoulder so that it is seen and heard', () => {
  it('under a hold on a tool he turns round for a moment, with a hum of his own, and turns back', () => {
    const world = layWorld(3, 'near')
    world.mole.at = TOOL_HOME.wedge - 2
    const { play: visit, log } = watched(world, 3)
    const stage = rig()
    const side = (): number => {
      const stamps = stage.frame(visit)
      const body = stampsOf(stamps, stage.view.pictures!.mole.body)[0], ear = stampsOf(stamps, stage.view.pictures!.mole.ear)[0]
      return Math.sign(ear.cx - body.cx)
    }
    const wedge = toolSpot(TOOL_HOME.wedge)
    visit.press({ x: wedge.x, y: wedge.y - 10 }, false)
    run(visit, WALK_S * 1.5, true)
    // Walking there he faces the way he goes: his ear is behind his body.
    const walking = side()
    expect(visit.game.mole.back).toBe(0)
    run(visit, WALK_S, true)
    expect(visit.game.world.mole.at).toBe(TOOL_HOME.wedge)
    expect(visit.game.mole.back).toBeGreaterThan(0)
    expect(side()).toBe(-walking)
    expect(log.filter((entry) => entry.event.type === 'hm')).toHaveLength(1)
    expect(visit.game.world.mole.tool).toBeNull()
    run(visit, LOOK_BACK_S + 0.1, true)
    expect(visit.game.mole.back).toBe(0)
    expect(side()).toBe(walking)
    expect(log.filter((entry) => entry.event.type === 'hm')).toHaveLength(1)
  })

  it('and in front of a pocket on an errand, the same', () => {
    const world = drawn('@owoo')
    world.gems.push({ colour: 'red', at: 4, rest: 'floor' })
    const game = new Game(world)
    const gem = gemSpot(game.world, game.world.gems[0])
    game.press(gem)
    game.release('tap', gem)
    const log = play(game, 2)
    expect(game.world.kinds[2]).toBe('water')
    expect(types(log).filter((type) => type === 'hm')).toHaveLength(1)
  })
})

describe('the ride starts on a tap of the lift', () => {
  const lift = { x: LIFT.x + 60, y: LIFT.y + 100 }
  const inCage = (): Game => { const world = layWorld(3, 'near'); world.mole.at = CAGE; return new Game(world) }

  it('not at finger-down: a hold on the lift starts nothing, and neither does a hold on the mole in the cage', () => {
    const held = inCage()
    held.press(lift)
    expect(held.sceneName).toBeNull()
    play(held, 2)
    expect(held.sceneName).toBeNull()
    held.release('tap', lift)
    play(held, 2)
    expect(held.sceneName).toBeNull()
    const onMole = inCage()
    const at = { x: onMole.mole.x, y: onMole.mole.y - 30 }
    onMole.press(at)
    play(onMole, 1)
    onMole.release('tap', at)
    play(onMole, 1)
    expect(onMole.sceneName).toBeNull()
  })

  it('nor does the start of a drag on the lift', () => {
    const dragged = inCage()
    dragged.press(lift)
    dragged.drag({ x: lift.x + 30, y: lift.y + 20 })
    dragged.release('drop', { x: lift.x + 30, y: lift.y + 20 })
    play(dragged, 2)
    expect(dragged.sceneName).toBeNull()
  })

  it('a tap does, in the call in which the finger lifts', () => {
    const tapped = inCage()
    tapped.press(lift)
    expect(tapped.sceneName).toBeNull()
    tapped.release('tap', lift)
    expect(tapped.sceneName).toBe('ride')
  })
})

describe('a scene that starts while a gem is carried', () => {
  it('sets the gem back where it was taken from, seen and heard, in the scene\'s first beat', () => {
    const world = drawn('@we', 'eoe', 'ggg')
    world.gems.push({ colour: 'green', at: 0, rest: 'floor' })
    const game = new Game(world)
    const gem = game.world.gems[0]
    // A tap on the pocket: the blow is on its way. The finger takes the gem before it lands.
    game.press(mid(1))
    game.release('tap', mid(1))
    game.press(game.gemPlace(gem))
    game.drag({ x: mid(indexOf(1, 1)).x, y: mid(indexOf(1, 1)).y + CARRY_UP })
    expect(game.hand?.gem).toBe(gem)
    const log: Log = []
    while (game.sceneName !== 'run') { game.step(FRAME); for (const event of game.drain()) log.push({ t: game.time, event }) }
    expect(game.hand).toBeNull()
    const flight = game.motions.find((motion) => motion.gem === gem)
    expect(flight?.how).toBe('arc')
    expect(gem).toMatchObject({ at: 0, rest: 'floor' })
    play(game, 1, log)
    expect(log.filter((entry) => entry.event.type === 'tik').map((entry) => (entry.event as { index: number }).index)).toContain(0)
  })
})

describe('two lookalikes of the fourth reading', () => {
  const length = (line: readonly (readonly [number, number])[]): number => line.slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - line[i][0], point[1] - line[i][1]), 0)
  const bow = (line: readonly (readonly [number, number])[]): number => {
    const a = line[0], b = line[line.length - 1]
    const chord = Math.hypot(b[0] - a[0], b[1] - a[1])
    return Math.max(...line.map((point) => Math.abs((b[0] - a[0]) * (a[1] - point[1]) - (a[0] - point[0]) * (b[1] - a[1])) / chord))
  }

  it('a worm\'s three rings are bowed, and no two are of one length', () => {
    expect(WORM_RINGS).toHaveLength(3)
    const lengths = WORM_RINGS.map(length).sort((a, b) => a - b)
    for (const ring of WORM_RINGS) { expect(ring.length).toBeGreaterThanOrEqual(3); expect(bow(ring)).toBeGreaterThan(0.6) }
    expect(lengths[1] / lengths[0]).toBeGreaterThan(1.2)
    expect(lengths[2] / lengths[1]).toBeGreaterThan(1.2)
  })

  it('a dragonfly\'s wings are swept back from its body, never laid square across it', () => {
    for (const lift of [1, -0.5]) {
      for (const side of [-1, 1]) {
        const wing = dragonflyWing(side, lift)
        const root = wing[0], tip = wing.reduce((far, point) => (Math.abs(point[0]) > Math.abs(far[0]) ? point : far))
        // The tip lies well behind the root, toward the tail: the wing leans back by a sixth of a turn of a right angle or more.
        expect(Math.atan2(tip[1] - root[1], Math.abs(tip[0] - root[0]))).toBeGreaterThan(0.2)
      }
    }
  })
})
