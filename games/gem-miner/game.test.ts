import { describe, expect, it } from 'vitest'
import { drawn } from './fixtures'
import { ACTS, Game, HAT_S, type Event, type EventType } from './game'
import type { Point } from './input'
import { BURROW, BURROW_INDEX, CAGE, CELL, COLS, HILL, LIFT, MAMMOTH, TOOL_HOME, centre, grassNode, indexOf, type Tool } from './layout'
import { gemSpot, toolSpot } from './shapes'
import { layWorld, lightOf, type Colour, type Load, type World } from './world'

const FRAME = 1 / 60
const mid = (index: number): Point => centre(index % COLS, Math.floor(index / COLS))

/** Plays `seconds`, and gives back every event with the second it came at. */
function play(game: Game, seconds: number, out: { t: number; event: Event }[] = []): { t: number; event: Event }[] {
  for (const event of game.drain()) out.push({ t: 0, event })
  for (let t = FRAME; t <= seconds + 1e-9; t += FRAME) {
    game.step(FRAME)
    for (const event of game.drain()) out.push({ t, event })
  }
  return out
}
const types = (log: { event: Event }[]): EventType[] => log.map((entry) => entry.event.type)
const tap = (game: Game, at: Point): void => { game.press(at); game.release('tap', at) }
const hold = (game: Game, at: Point, seconds: number): { t: number; event: Event }[] => { game.press(at); const log = play(game, seconds); game.release('drop', at); return log }
function withTool(world: World, tool: Tool, load: Load = 'nothing'): World {
  world.mole.tool = tool
  world.mole.load = load
  return world
}
const gemIn = (world: World, colour: Colour, at: number, rest: 'floor' | 'left' | 'right' | 'hung' = 'floor'): World => { world.gems.push({ colour, at, rest }); return world }

describe('the toy: a held finger and the pick', () => {
  it('answers the finger in the same call with a knock that is the block own', () => {
    const kinds = { e: 'earth', s: 'sandstone', g: 'granite', w: 'water', a: 'gas', R: 'gem', o: 'open', b: 'granite', p: 'water' } as const
    for (const [mark, kind] of Object.entries(kinds)) {
      const game = new Game(drawn('@eee', 'eee' + mark))
      game.press(mid(16))
      expect(game.drain()[0]).toMatchObject({ type: 'knock', kind, index: 16 })
    }
  })

  it('digs toward a held finger: earth at one blow, sandstone at three with a higher tink each time', () => {
    const game = new Game(drawn('@ese'))
    const log = hold(game, mid(3), 3)
    const blows = log.filter((entry) => entry.event.type === 'chip' || entry.event.type === 'break').map((entry) => entry.event)
    expect(blows).toMatchObject([
      { type: 'break', kind: 'earth', index: 1, n: 1 },
      { type: 'chip', kind: 'sandstone', index: 2, n: 1 }, { type: 'chip', kind: 'sandstone', index: 2, n: 2 }, { type: 'break', kind: 'sandstone', index: 2, n: 3 },
      { type: 'break', kind: 'earth', index: 3, n: 1 },
    ])
    expect(game.world.mole.at).toBe(3)
    expect(game.world.kinds.slice(0, 4)).toEqual(['open', 'open', 'open', 'open'])
  })

  it('lands each blow half way through the swing, where the view shows it land', () => {
    const game = new Game(drawn('@e'))
    game.press(mid(1))
    const log = play(game, 0.4)
    const blow = log.find((entry) => entry.event.type === 'break')!
    expect(blow.t).toBeGreaterThanOrEqual(ACTS.swing.cues[0])
    expect(blow.t).toBeLessThan(ACTS.swing.cues[0] + 2 * FRAME)
  })

  it('turns the pick aside on granite onto the next block round, and never digs it', () => {
    const game = new Game(drawn('@ge', 'see'))
    const log = hold(game, mid(1), 1.2)
    expect(types(log)).toContain('clang')
    expect(log.find((entry) => entry.event.type === 'chip')!.event).toMatchObject({ index: 13, aside: true })
    expect(game.world.kinds[1]).toBe('granite')
    expect(game.mole.mode === 'act' || game.mole.mode === 'rest').toBe(true)
  })

  it('goes round granite when there is a way', () => {
    const game = new Game(drawn('@ee', 'gee', 'eee'))
    hold(game, mid(26), 4)
    expect(game.world.mole.at).toBe(26)
    expect(game.world.kinds[13]).toBe('granite')
  })

  it('after a tap walks through what is dug and lands one blow on the first block in the way', () => {
    const game = new Game(drawn('@ooss'))
    tap(game, mid(4))
    const log = play(game, 3)
    expect(game.world.mole.at).toBe(2)
    expect(log.filter((entry) => entry.event.type === 'chip')).toHaveLength(1)
    expect(game.world.hits[3]).toBe(1)
    expect(game.busy).toBe(false)
  })

  it('follows a finger that moves, and stops when it lifts', () => {
    const game = new Game(drawn('@eeee', 'eeeee'))
    game.press(mid(1))
    play(game, 0.5)
    game.drag(mid(14))
    play(game, 1)
    expect(game.world.mole.at).toBe(14)
    game.release('drop', mid(14))
    play(game, 1)
    expect(game.busy).toBe(false)
  })

  it('knocks the hat over his eyes when the finger lands on him, and leaves a hand on the bare wall', () => {
    const game = new Game(layWorld(1, 'near'))
    game.press({ x: game.mole.x, y: game.mole.y - 30 })
    expect(game.drain()).toMatchObject([{ type: 'poke', who: 'mole' }])
    expect(game.mole.hat).toBe(HAT_S)
    game.release('tap')
    game.press({ x: 900, y: 60 })
    expect(game.drain()).toMatchObject([{ type: 'print' }])
    game.release('tap')
    game.press({ x: MAMMOTH.x + 100, y: MAMMOTH.y + 80 })
    expect(game.drain()).toMatchObject([{ type: 'poke', who: 'mammoth' }])
  })

  it('answers no touch in the corner of the grown-ups, a move into it included', () => {
    const game = new Game(drawn('@eee'))
    game.press(mid(3), true)
    expect(game.drain()).toEqual([])
    expect(game.working).toBe(false)
    game.press(mid(1))
    game.drain()
    game.drag(mid(3), true)
    play(game, 1)
    expect(game.world.mole.at).toBe(1)
  })
})

describe('a gem', () => {
  it('rings in the rock and springs free when its block breaks, with a ping and two bounces', () => {
    const game = new Game(drawn('@R'))
    game.press(mid(1))
    expect(game.drain()[0]).toMatchObject({ type: 'knock', kind: 'gem', colour: 'red' })
    const log = play(game, 1.5)
    expect(types(log).filter((type) => ['break', 'ping', 'tik'].includes(type))).toEqual(['break', 'ping', 'tik', 'tik'])
    expect(game.world.gems).toEqual([{ colour: 'red', at: 1, rest: 'floor' }])
    expect(lightOf(game.world)[0]).toBe(1)
  })

  it('lifts under the finger and is set in a wall or dropped to the floor where it is let go', () => {
    const game = new Game(gemIn(drawn('@ooo', 'eeoe'), 'blue', 1))
    const spot = gemSpot(game.world, game.world.gems[0])
    game.press(spot)
    expect(game.drain()).toMatchObject([{ type: 'gemring', colour: 'blue' }])
    expect(game.hand).not.toBeNull()
    // Let go at the right edge of the last block, whose right side is rock: set in that wall.
    const wall = { x: HILL.x + 4 * CELL - 8, y: HILL.y + 40 }
    game.drag(wall)
    game.release('drop', wall)
    expect(game.drain()[0]).toMatchObject({ type: 'tock', index: 3 })
    expect(game.world.gems[0]).toEqual({ colour: 'blue', at: 3, rest: 'right' })
    // Carried over the shaft and let go in the open: it drops to the floor at the bottom.
    game.press(gemSpot(game.world, game.world.gems[0]))
    game.drag(mid(2))
    game.release('drop', mid(2))
    const log = play(game, 1)
    expect(types(log)).toContain('tik')
    expect(game.world.gems[0]).toEqual({ colour: 'blue', at: 15, rest: 'floor' })
  })

  it('goes back where it was when it is let go over rock or taken away', () => {
    const game = new Game(gemIn(drawn('@oe'), 'green', 1))
    const spot = gemSpot(game.world, game.world.gems[0])
    game.press(spot)
    game.drag(mid(2))
    game.release('drop', mid(2))
    expect(game.world.gems[0]).toEqual({ colour: 'green', at: 1, rest: 'floor' })
    game.press(spot)
    game.drag(mid(0))
    game.release('cancel')
    expect(game.world.gems[0]).toEqual({ colour: 'green', at: 1, rest: 'floor' })
    expect(game.hand).toBeNull()
  })

  it('chimes and spins when the pick strikes it free, and never breaks', () => {
    const game = new Game(gemIn(drawn('@oo'), 'red', 2))
    tap(game, gemSpot(game.world, game.world.gems[0]))
    const log = play(game, 2)
    expect(types(log).filter((type) => type === 'chime')).toHaveLength(1)
    expect(game.world.gems).toHaveLength(1)
    expect(game.busy).toBe(false)
  })
})

describe('the three tools', () => {
  it('lie on the grass from the start, and a tap sends the mole to fetch one', () => {
    const game = new Game(layWorld(3, 'near'))
    expect(game.world.tools).toEqual(TOOL_HOME)
    const spot = toolSpot(TOOL_HOME.bucket)
    tap(game, { x: spot.x, y: spot.y - 20 })
    const log = play(game, 4)
    expect(log[0].event).toMatchObject({ type: 'poke', who: 'bucket' })
    expect(types(log)).toContain('take')
    expect(game.world.mole.tool).toBe('bucket')
    expect(game.world.mole.at).toBe(TOOL_HOME.bucket)
  })

  it('is set down where he stands by a tap on him, and lies there until fetched again', () => {
    const game = new Game(withTool(drawn('@oo'), 'wedge'))
    tap(game, { x: game.mole.x, y: game.mole.y - 30 })
    const log = play(game, 1)
    expect(types(log)).toEqual(['poke', 'put'])
    expect(game.world.mole.tool).toBeNull()
    expect(game.world.tools.wedge).toBe(0)
  })

  it('swaps the tool in his paws for the one that lies where he stands', () => {
    const world = withTool(drawn('@oo'), 'wedge')
    world.tools.rope = 0
    const game = new Game(world)
    tap(game, { x: game.mole.x, y: game.mole.y - 30 })
    play(game, 1)
    expect(game.world.mole.tool).toBe('rope')
    expect(game.world.tools.wedge).toBe(0)
  })
})

/** One use of the tool in his paws on the block beside him, by a held finger. */
function use(rows: string[], tool: Tool, load: Load = 'nothing', seconds = 3): { game: Game; log: { t: number; event: Event }[] } {
  const game = new Game(withTool(drawn(...rows), tool, load))
  const log = hold(game, mid(1), seconds)
  play(game, 1.5, log)
  return { game, log }
}

describe('the wedge', () => {
  it('sinks into earth with a squelch and splits nothing', () => {
    const { game, log } = use(['@e'], 'wedge')
    expect(types(log)).toEqual(['knock', 'squelch', 'pop', 'sit'])
    expect(game.world.kinds[1]).toBe('earth')
  })

  it('splits sandstone at one blow', () => {
    const { game, log } = use(['@s'], 'wedge')
    expect(types(log)).toEqual(['knock', 'split'])
    expect(game.world.kinds[1]).toBe('open')
  })

  it('cracks granite free at the third blow, each ring lower, and it stands as a loose boulder', () => {
    const { game, log } = use(['@g', 'ee'], 'wedge')
    expect(log.filter((entry) => entry.event.type === 'ring').map((entry) => (entry.event as { n: number }).n)).toEqual([1, 2, 3])
    expect(types(log)).toContain('boom')
    expect(game.world.kinds[1]).toBe('boulder')
    expect(game.world.hits[1]).toBe(0)
  })

  it('keeps a granite block half cracked', () => {
    const game = new Game(withTool(drawn('@g'), 'wedge'))
    tap(game, mid(1))
    play(game, 2)
    expect(game.world.hits[1]).toBe(1)
    expect(game.world.kinds[1]).toBe('granite')
  })

  it('makes a spout of a water pocket, which wets the dug block under it and floods nothing', () => {
    const { game, log } = use(['@w', 'eo'], 'wedge', 'nothing', 6)
    expect(types(log)).toContain('jet')
    expect(game.world.kinds[1]).toBe('spout')
    expect(game.world.wet[14]).toBe(true)
    expect(game.world.water.some(Boolean)).toBe(false)
    expect(types(log)).toContain('plink')
  })

  it('makes a vent of a gas pocket: one long whistle, and an empty hollow is left', () => {
    const { game, log } = use(['@a'], 'wedge')
    expect(types(log).filter((type) => type === 'whistle')).toHaveLength(1)
    expect(types(log)).not.toContain('whoomph')
    expect(game.world.kinds[1]).toBe('open')
    expect(game.world.mole.sooty).toBe(false)
  })

  it('prises a set gem out of the wall, and it dings off his hat and lies on the floor', () => {
    const game = new Game(gemIn(withTool(drawn('@oe'), 'wedge'), 'green', 1, 'right'))
    tap(game, gemSpot(game.world, game.world.gems[0]))
    const log = play(game, 3)
    expect(types(log).filter((type) => ['prise', 'ding', 'tik'].includes(type))).toEqual(['prise', 'ding', 'tik'])
    expect(game.world.gems[0]).toEqual({ colour: 'green', at: 1, rest: 'floor' })
  })
})

describe('the bucket', () => {
  it('scoops earth out whole, and tips it back into dug space as a block', () => {
    const { game, log } = use(['@eo'], 'bucket')
    expect(types(log)).toContain('scoop')
    expect(game.world.kinds[1]).toBe('open')
    expect(game.world.mole.load).toBe('earth')
    const more = hold(game, mid(1), 2)
    expect(more.find((entry) => entry.event.type === 'tip')!.event).toMatchObject({ what: 'earth', index: 1 })
    expect(game.world.kinds[1]).toBe('earth')
    expect(game.world.mole.load).toBe('nothing')
  })

  it('fills with sand from sandstone and builds nothing with it', () => {
    const { game, log } = use(['@s', 'oe'], 'bucket')
    expect(log.find((entry) => entry.event.type === 'scoop')!.event).toMatchObject({ what: 'sand' })
    expect(game.world.kinds[1]).toBe('sandstone')
    expect(game.world.mole.load).toBe('sand')
    const more = hold(game, mid(13), 2)
    expect(more.find((entry) => entry.event.type === 'tip')!.event).toMatchObject({ what: 'sand' })
    expect(game.world.kinds[13]).toBe('open')
    expect(game.world.mole.load).toBe('nothing')
  })

  it('bangs on granite like a gong, and his teeth go on rattling', () => {
    const { game, log } = use(['@g'], 'bucket')
    expect(types(log)).toEqual(['knock', 'gong', 'teeth', 'teeth', 'teeth'])
    expect(game.world.kinds[1]).toBe('granite')
  })

  it('fills from standing water, slops as it is carried, and tipped out the water runs down from there', () => {
    const game = new Game(withTool(drawn('@~oo', 'eeeo'), 'bucket'))
    const log = hold(game, mid(1), 1.5)
    expect(types(log)).toContain('bloop')
    expect(game.world.water[1]).toBe(false)
    expect(game.world.mole.load).toBe('water')
    const more = hold(game, mid(3), 1.5)
    play(game, 9, more)
    expect(more.some((entry) => entry.event.type === 'step' && (entry.event as { slop: boolean }).slop)).toBe(true)
    expect(more.find((entry) => entry.event.type === 'tip')!.event).toMatchObject({ what: 'water', index: 3 })
    expect(game.world.water[16]).toBe(true)
    expect(game.world.mole.load).toBe('nothing')
  })

  it('takes one drop from a pocket that is still shut', () => {
    const { game, log } = use(['@w'], 'bucket')
    expect(types(log)).toEqual(['knock', 'plip'])
    expect(game.world.kinds[1]).toBe('water')
    expect(game.world.mole.load).toBe('nothing')
  })

  it('catches the gas and floats up with the mole to the roof, where it lets the gas go', () => {
    const game = new Game(withTool(drawn('ooe', 'ooe', '@ae'), 'bucket'))
    const log = hold(game, mid(27), 1)
    play(game, 3, log)
    expect(types(log).filter((type) => type === 'fff' || type === 'burp')).toEqual(['fff', 'burp'])
    expect(game.world.kinds[27]).toBe('open')
    expect(game.world.mole.at).toBe(0)
    expect(game.world.mole.load).toBe('nothing')
    expect(game.world.mole.sooty).toBe(false)
  })

  it('scoops a free gem and is a lantern whose light goes only upward', () => {
    const game = new Game(gemIn(withTool(drawn('ooo', '@oo'), 'bucket'), 'red', 14))
    tap(game, gemSpot(game.world, game.world.gems[0]))
    const log = play(game, 2)
    expect(types(log)).toContain('clink')
    expect(game.world.mole.load).toBe('red')
    expect(game.world.gems[0].rest).toBe('bucket')
    expect([game.masks[13], game.masks[0], game.masks[14], game.masks[1]]).toEqual([1, 1, 0, 0])
  })

  it('digs with the pick while it is full', () => {
    const game = new Game(withTool(drawn('@e'), 'bucket', 'sand'))
    const log = hold(game, mid(1), 1)
    expect(types(log)).toContain('break')
    expect(game.world.mole.load).toBe('sand')
  })
})

describe('the rope', () => {
  it('pulls straight through earth and comes back with a worm', () => {
    const { game, log } = use(['@e'], 'rope')
    expect(types(log)).toEqual(['knock', 'ropehiss', 'worm'])
    expect(game.world.kinds[1]).toBe('earth')
  })

  it('saws at sandstone twice and cuts nothing', () => {
    const { game, log } = use(['@s'], 'rope')
    expect(types(log)).toEqual(['knock', 'zip', 'zip'])
    expect(game.world.kinds[1]).toBe('sandstone')
    expect(game.world.hits[1]).toBe(0)
  })

  it('goes taut on granite in the hill and flips the mole on his back', () => {
    const { log } = use(['@g'], 'rope')
    expect(types(log)).toEqual(['knock', 'twang', 'flop'])
  })

  it('hauls a loose boulder one block toward the mole at each heave, and it falls over a drop', () => {
    const game = new Game(withTool(drawn('oo@b', 'eeoe', 'eeoe'), 'rope'))
    const log = hold(game, mid(3), 2)
    play(game, 2, log)
    expect(types(log).filter((type) => ['creak', 'rumble', 'thud'].includes(type))).toEqual(['creak', 'rumble', 'thud'])
    expect(game.world.kinds[3]).toBe('open')
    expect(game.world.kinds[2]).toBe('open')
    expect(game.world.kinds[28]).toBe('boulder')
    expect(game.world.mole.at).toBe(1)
  })

  it('strains and moves nothing when there is no room behind him', () => {
    const game = new Game(withTool(drawn('e@b'), 'rope'))
    const log = hold(game, mid(2), 2)
    expect(types(log)).toEqual(['knock', 'creak', 'strain'])
    expect(game.world.kinds[2]).toBe('boulder')
    expect(game.world.mole.at).toBe(1)
  })

  it('bobs on standing water and is wrung out over his feet', () => {
    const { game, log } = use(['@~'], 'rope')
    expect(types(log)).toEqual(['knock', 'bip', 'bip', 'trickle'])
    expect(game.world.water[1]).toBe(true)
  })

  it('sways in a gas pocket and hisses until the finger lets it go', () => {
    const game = new Game(withTool(drawn('@a'), 'rope'))
    game.press(mid(1))
    const log = play(game, 3)
    expect(log.filter((entry) => entry.event.type === 'charm').length).toBeGreaterThanOrEqual(5)
    expect(game.mole.act).toBe('ropeCharm')
    game.release('drop', mid(1))
    const after = play(game, 1)
    expect(types(after)).not.toContain('charm')
    expect(game.busy).toBe(false)
    expect(game.world.kinds[1]).toBe('gas')
  })

  it('hangs a gem from the roof as a lamp, and stays there with it', () => {
    const game = new Game(gemIn(withTool(drawn('eoe', '@oe'), 'rope'), 'blue', 14))
    tap(game, gemSpot(game.world, game.world.gems[0]))
    const log = play(game, 3)
    expect(types(log)).toContain('hang')
    expect(game.world.gems[0]).toEqual({ colour: 'blue', at: 1, rest: 'hung' })
    expect(game.world.mole.tool).toBeNull()
    expect(game.world.tools.rope).toBe(1)
  })
})

describe('the lift', () => {
  it('calls the mole up at a tap, and only a tap with him in the cage starts the ride', () => {
    const game = new Game(layWorld(5, 'near'))
    const lift = { x: LIFT.x + LIFT.w / 2, y: LIFT.y + 100 }
    tap(game, lift)
    expect(game.drain()).toMatchObject([{ type: 'poke', who: 'lift' }])
    // Tapping again and again while he is on his way starts nothing.
    for (let i = 0; i < 3; i++) { play(game, 0.1); tap(game, lift) }
    expect(game.sceneName).toBeNull()
    play(game, 2)
    expect(game.world.mole.at).toBe(CAGE)
    expect(game.sceneName).toBeNull()
    // A touch in the hill and he climbs out again.
    tap(game, mid(BURROW_INDEX))
    play(game, 2)
    expect(game.world.mole.at).toBe(BURROW_INDEX)
    tap(game, lift)
    play(game, 2)
    tap(game, lift)
    expect(game.sceneName).toBe('ride')
  })

  it('does nothing by itself however long the mole stands in the cage', () => {
    const world = layWorld(5, 'near')
    world.mole.at = CAGE
    const game = new Game(world)
    const log = play(game, 30)
    expect(log).toEqual([])
    expect(game.sceneName).toBeNull()
    expect(game.world.seed).toBe(5)
  })

  it('walks the grass from the burrow to the cage and back', () => {
    const world = layWorld(5, 'near')
    world.mole.at = grassNode(BURROW.c + 3)
    const game = new Game(world)
    tap(game, mid(indexOf(BURROW.c, 0)))
    play(game, 3)
    expect(game.world.mole.at).toBe(BURROW_INDEX)
  })
})

describe('what an idle child is shown', () => {
  it('is the block under the mole, and from the grass or the cage the block he would reach first from the burrow', () => {
    const under = new Game(drawn('eeeeee@', 'eeeeeee'))
    expect(under.suggestion()).toBe(indexOf(6, 1))
    for (const node of [CAGE, grassNode(6), grassNode(12)]) {
      const world = drawn('eeeeee@', 'eeeeeeo', 'eeeeeee')
      world.mole.at = node
      const game = new Game(world)
      const shown = game.suggestion()!
      // It touches what is dug from the burrow down: one held finger there and the first blow lands on it.
      expect([indexOf(5, 0), indexOf(7, 0), indexOf(5, 1), indexOf(7, 1), indexOf(6, 2)]).toContain(shown)
      expect(Math.abs((shown % COLS) - BURROW.c) + Math.floor(shown / COLS)).toBe(1)
    }
  })
})
