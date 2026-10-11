import { describe, expect, it } from 'vitest'
import { drawn, roomFor } from './fixtures'
import { ACTS, DRIP_S, Game, WALK_S, type ActName, type Event, type EventType } from './game'
import { BURROW_INDEX, CAGE, COLS, LIFT, MAMMOTH, centre, indexOf, type Tool } from './layout'
import { BACK_S, strikeOf, swayOf } from './poses'
import { FRAME, run, watch, watched } from './rig'
import { makeRng } from './rng'
import { gemSpot, toolSpot } from './shapes'
import { lengthOf, notesFor, notesOf } from './voices'
import { layWorld, type Colour, type Load, type World } from './world'

// One clock for sight and sound. Every sound is an event the game queues in
// the step that shows its cause, and the poses the view draws are read off
// the same clock. These tests walk every cell of the grid and the three
// scenes one frame at a time and hold both directions: nothing sounds that
// is not seen at that moment, and nothing that is seen to land, break, shut
// or start does so at another moment than it sounds.

const mid = (index: number) => centre(index % COLS, Math.floor(index / COLS))

/** What one frame showed, beside what it sounded. */
type Step = {
  events: Event[]
  /** A moment of the act he was in came in this frame, and which act that was. */
  cue: ActName | null
  /** A walk of one block ended. */
  walked: boolean
  /** Something that was falling or flying came to a moment of its own: a landing, a bounce. */
  landed: boolean
  /** A drop from a spout landed. */
  dripped: boolean
  /** The act he was in came to its end. */
  ended: ActName | null
  /** A scene was playing before or after. */
  scene: boolean
  /** Who lives where changed. */
  moved: boolean
  /** He went up a block under a bucket of gas, or let the gas go. */
  floated: boolean
  /** The rope in the gas pocket is at one end of its sway. */
  swayed: boolean
}

function step(game: Game): Step {
  const m = game.mole
  const was = {
    mode: m.mode, act: m.act, t: m.t, length: m.length, afloat: m.afloat, scene: game.sceneName, at: game.world.mole.at,
    motions: game.motions.map((motion) => ({ t: motion.t, cues: motion.cues.map((cue) => cue.at) })),
    drips: [...game.drips.values()],
    dwellers: JSON.stringify(game.dwellers),
  }
  game.step(FRAME)
  const events = game.drain()
  // The same sums the game makes, so a moment is counted in the frame the game counts it in.
  const after = was.t + FRAME
  const act = was.mode === 'act' ? was.act : null
  return {
    events,
    cue: act && (ACTS[act].cues as readonly number[]).some((cue) => was.t < cue && after >= cue) ? act : null,
    walked: was.mode === 'walk' && after / WALK_S >= 1,
    landed: was.motions.some((motion) => motion.cues.some((cue) => motion.t + FRAME >= cue)),
    dripped: was.drips.some((drip) => drip + FRAME >= DRIP_S),
    ended: act && after >= was.length ? act : null,
    scene: was.scene !== null || game.sceneName !== null,
    moved: was.dwellers !== JSON.stringify(game.dwellers),
    floated: act === 'float' && (was.afloat !== m.afloat || was.at !== game.world.mole.at),
    swayed: m.mode === 'act' && m.act === 'ropeCharm' && Math.abs(swayOf(m.t)) > 0.97,
  }
}

/** What an event may come from, when it is not a moment of the act in hand. */
function explained(event: Event, seen: Step): boolean {
  switch (event.type) {
    case 'step': case 'wash': return seen.walked
    case 'tik': case 'thud': case 'clunk': return seen.landed
    case 'plink': return seen.dripped
    case 'leave': return seen.moved
    case 'burp': return seen.floated
    // A rope held in a gas pocket hisses at each end of its sway, for as long as it is held there.
    case 'charm': return seen.cue !== null || seen.swayed
    default: return seen.cue !== null
  }
}

type Cell = { name: string; world: () => World; target: number; tapGem?: boolean; expects: EventType[] }

function withTool(world: World, tool: Tool | null, load: Load = 'nothing'): World {
  world.mole.tool = tool
  world.mole.load = load
  return world
}
function withGem(world: World, colour: Colour, at: number, rest: 'floor' | 'left' | 'right' | 'hung' = 'floor'): World {
  world.gems.push({ colour, at, rest })
  return world
}

const T = indexOf(1, 0)
const row = (mark: string): World => drawn(`@${mark}e`, 'eee')
const pool = (): World => drawn('@~e', 'eee')
const free = (rest: 'floor' | 'right' = 'floor'): World => withGem(drawn('@oe', 'eee'), 'green', T, rest)

/** The grid of the sheet: six kinds of thing by the four things the mole does to them. The fifth, the finger's knock, is below. */
const CELLS: Cell[] = [
  { name: 'earth, pick', world: () => row('e'), target: T, expects: ['break'] },
  { name: 'earth, wedge', world: () => withTool(row('e'), 'wedge'), target: T, expects: ['squelch', 'pop', 'sit'] },
  { name: 'earth, bucket', world: () => withTool(row('e'), 'bucket'), target: T, expects: ['scoop'] },
  { name: 'earth in the bucket, tipped into dug space', world: () => withTool(drawn('@oe', 'eee'), 'bucket', 'earth'), target: T, expects: ['tip'] },
  { name: 'earth, rope', world: () => withTool(row('e'), 'rope'), target: T, expects: ['ropehiss', 'worm'] },
  { name: 'sandstone, pick', world: () => row('s'), target: T, expects: ['chip', 'chip', 'break'] },
  { name: 'sandstone, wedge', world: () => withTool(row('s'), 'wedge'), target: T, expects: ['split'] },
  { name: 'sandstone, bucket', world: () => withTool(row('s'), 'bucket'), target: T, expects: ['scoop'] },
  { name: 'sand in the bucket, tipped out', world: () => withTool(drawn('@oe', 'eee'), 'bucket', 'sand'), target: T, expects: ['tip'] },
  { name: 'sandstone, rope', world: () => withTool(row('s'), 'rope'), target: T, expects: ['zip', 'zip'] },
  { name: 'granite, pick', world: () => row('g'), target: T, expects: ['clang'] },
  { name: 'granite, wedge', world: () => withTool(row('g'), 'wedge'), target: T, expects: ['ring', 'ring', 'ring', 'boom'] },
  { name: 'granite, bucket', world: () => withTool(row('g'), 'bucket'), target: T, expects: ['gong', 'teeth', 'teeth', 'teeth'] },
  { name: 'granite in the hill, rope', world: () => withTool(row('g'), 'rope'), target: T, expects: ['twang', 'flop'] },
  { name: 'a loose boulder, rope', world: () => withTool(drawn('eo@be', 'eeeee'), 'rope'), target: indexOf(3, 0), expects: ['creak', 'rumble'] },
  { name: 'a loose boulder with no room behind him, rope', world: () => withTool(drawn('e@be', 'eeee'), 'rope'), target: indexOf(2, 0), expects: ['creak', 'strain'] },
  { name: 'a loose boulder, wedge', world: () => withTool(row('b'), 'wedge'), target: T, expects: ['ring'] },
  { name: 'water pocket, wedge', world: () => withTool(row('w'), 'wedge'), target: T, expects: ['jet'] },
  { name: 'water pocket still shut, bucket', world: () => withTool(row('w'), 'bucket'), target: T, expects: ['plip'] },
  { name: 'standing water, bucket', world: () => withTool(pool(), 'bucket'), target: T, expects: ['bloop'] },
  { name: 'water pocket still shut, rope', world: () => withTool(row('w'), 'rope'), target: T, expects: ['plap'] },
  { name: 'standing water, rope', world: () => withTool(pool(), 'rope'), target: T, expects: ['bip', 'bip', 'trickle'] },
  { name: 'gas pocket, wedge', world: () => withTool(row('a'), 'wedge'), target: T, expects: ['whistle'] },
  { name: 'gas pocket, bucket', world: () => withTool(drawn('eoe', 'e@a', 'eee'), 'bucket'), target: indexOf(2, 1), expects: ['fff', 'burp'] },
  { name: 'gas pocket, rope', world: () => withTool(row('a'), 'rope'), target: T, expects: ['charm', 'charm'] },
  { name: 'a gem in its block, pick', world: () => drawn('@Ge', 'eee'), target: T, expects: ['break', 'ping', 'tik', 'tik'] },
  { name: 'a free gem, pick', world: () => free(), target: T, tapGem: true, expects: ['chime'] },
  { name: 'a set gem, wedge', world: () => withTool(free('right'), 'wedge'), target: T, tapGem: true, expects: ['prise', 'ding', 'tik'] },
  { name: 'a free gem, bucket', world: () => withTool(free(), 'bucket'), target: T, tapGem: true, expects: ['clink'] },
  { name: 'a gem in the bucket, tipped out', world: () => { const world = withTool(drawn('@oe', 'eee'), 'bucket', 'green'); world.gems.push({ colour: 'green', at: 0, rest: 'bucket' }); return world }, target: T, expects: ['clink', 'tik'] },
  { name: 'a free gem, rope', world: () => withTool(free(), 'rope'), target: T, tapGem: true, expects: ['hang'] },
  { name: 'a tool taken up and set down', world: () => { const world = drawn('@oe', 'eee'); world.tools.wedge = T; return world }, target: T, expects: ['step', 'take'] },
]

describe('every cell of the grid, one frame at a time', () => {
  for (const cell of CELLS) {
    it(cell.name, () => {
      const game = new Game(cell.world())
      const at = cell.tapGem ? gemSpot(game.world, game.world.gems[0]) : cell.name.startsWith('a tool') ? toolSpot(cell.target) : mid(cell.target)
      game.press({ x: at.x, y: cell.name.startsWith('a tool') ? at.y - 20 : at.y })
      // The finger's own answer comes in the call in which it lands.
      expect(game.drain().length).toBeGreaterThan(0)
      // A gem and a tool are tapped: only a tap sends him to one.
      if (cell.tapGem || cell.name.startsWith('a tool')) game.release('tap', at)
      const heard: EventType[] = []
      const strays: string[] = []
      const silent: string[] = []
      for (let t = 0; t < 4; t += FRAME) {
        const seen = step(game)
        if (seen.scene) break
        for (const event of seen.events) {
          heard.push(event.type)
          // Nothing sounds that is not seen at that moment.
          if (!explained(event, seen)) strays.push(`${event.type} at ${t.toFixed(2)} s`)
        }
        if (seen.cue) {
          // Nothing lands unheard: every moment of an act sounds in the frame it is drawn in.
          if (seen.events.length === 0) silent.push(`${seen.cue} at ${t.toFixed(2)} s`)
          // And the paw is at the far end of its blow in that frame, if he is still at that act.
          if (game.mole.mode === 'act' && game.mole.act === seen.cue) expect(strikeOf(seen.cue, game.mole.t), seen.cue).toBeGreaterThanOrEqual((1 - FRAME / BACK_S) ** 2 - 1e-9)
        }
        if ((seen.walked || seen.landed) && seen.events.length === 0) silent.push(`a step or a landing at ${t.toFixed(2)} s`)
      }
      game.release('drop', at)
      expect(strays).toEqual([])
      expect(silent).toEqual([])
      expect(heard.filter((type) => cell.expects.includes(type)).slice(0, cell.expects.length)).toEqual(cell.expects)
    })
  }

  it('the finger lands: every kind of thing answers in that call, with its own event and no other', () => {
    const things: [string, () => World, (game: Game) => { x: number; y: number }, Partial<Event>][] = [
      ['earth', () => row('e'), () => mid(T), { type: 'knock', kind: 'earth' }],
      ['sandstone', () => row('s'), () => mid(T), { type: 'knock', kind: 'sandstone' }],
      ['granite', () => row('g'), () => mid(T), { type: 'knock', kind: 'granite' }],
      ['a loose boulder', () => row('b'), () => mid(T), { type: 'knock', kind: 'granite' }],
      ['a water pocket', () => row('w'), () => mid(T), { type: 'knock', kind: 'water' }],
      ['a gas pocket', () => row('a'), () => mid(T), { type: 'knock', kind: 'gas' }],
      ['a gem in the rock', () => drawn('@Ge', 'eee'), () => mid(T), { type: 'knock', kind: 'gem', colour: 'green' }],
      ['dug space', () => drawn('@oe', 'eee'), () => mid(T), { type: 'knock', kind: 'open' }],
      ['a free gem', () => free(), (game) => gemSpot(game.world, game.world.gems[0]), { type: 'gemring', colour: 'green' }],
      ['the mole', () => layWorld(2, 'near'), (game) => ({ x: game.mole.x, y: game.mole.y - 30 }), { type: 'poke', who: 'mole' }],
      ['the mammoth', () => layWorld(2, 'near'), () => ({ x: MAMMOTH.x + 100, y: MAMMOTH.y + 80 }), { type: 'poke', who: 'mammoth' }],
      ['the lift', () => layWorld(2, 'near'), () => ({ x: LIFT.x + 60, y: LIFT.y + 100 }), { type: 'poke', who: 'lift' }],
      ['the bare wall', () => layWorld(2, 'near'), () => ({ x: 900, y: 40 }), { type: 'print' }],
      ['the grass', () => layWorld(2, 'near'), () => ({ x: 700, y: 180 }), { type: 'knock', kind: 'grass' }],
    ]
    for (const [name, world, where, answer] of things) {
      const game = new Game(world())
      game.press(where(game))
      const events = game.drain()
      expect(events.length, name).toBe(1)
      expect(events[0], name).toMatchObject(answer)
    }
  })

  it('the lift with the mole in its cage: it answers the finger where it lands, and the door clacks in the call in which the finger lifts', () => {
    const world = layWorld(2, 'near')
    world.mole.at = CAGE
    const game = new Game(world)
    game.press({ x: LIFT.x + 60, y: LIFT.y + 100 })
    expect(game.sceneName).toBeNull()
    expect(game.drain()).toMatchObject([{ type: 'poke', who: 'lift' }])
    game.release('tap', { x: LIFT.x + 60, y: LIFT.y + 100 })
    expect(game.sceneName).toBe('ride')
    expect(game.drain()).toMatchObject([{ type: 'clack' }])
    expect(game.staging.door).toBe(true)
  })

  it('a long whistle lasts as long as the gas leaks, and a long fff as long as the bucket takes to fill', () => {
    const leak = ACTS.ventMake.length - ACTS.ventMake.cues[0]
    expect(Math.abs(lengthOf(notesOf({ type: 'whistle', index: 0 })) - leak)).toBeLessThan(0.3)
    expect(lengthOf(notesOf({ type: 'fff', index: 0 }))).toBeGreaterThan(0.3)
  })
})

describe('the three scenes, one frame at a time', () => {
  type Was = { pose: string | null; door: boolean; wind: number; roll: string | null; kinds: string; water: string; at: number; world: World; shaking: number; lap: number | null; sooty: boolean; load: Load; dwellers: string }
  const snap = (game: Game): Was => ({
    pose: game.mole.pose, door: game.staging.door, wind: game.staging.wind, roll: game.staging.roll?.phase ?? null, kinds: game.world.kinds.join(), water: game.world.water.join(),
    at: game.world.mole.at, world: game.world, shaking: game.shaking, lap: game.staging.lap?.index ?? null, sooty: game.world.mole.sooty, load: game.world.mole.load, dwellers: JSON.stringify(game.dwellers),
  })

  /** What is seen in the frame an event of a scene sounds in. */
  function shown(event: Event, was: Was, game: Game): boolean {
    const now = snap(game)
    switch (event.type) {
      case 'whoomph': case 'gush': return was.kinds !== now.kinds
      case 'tip': return was.load === 'water' && now.load === 'nothing'
      case 'shoot': return was.pose !== 'shoot' && now.pose === 'shoot'
      case 'bump': return was.pose === 'shoot' && now.pose === 'splat'
      case 'grumble': return was.pose === 'splat' && now.pose === 'glare'
      case 'glug': return game.world.wet[event.index] && game.staging.stream !== null
      case 'soak': return now.pose === 'swept' || was.sooty !== now.sooty
      case 'lap': return game.staging.lap !== null && game.staging.lap.index === event.index && (was.lap === null || Math.abs(game.staging.lap.k - 0.5) < 0.05 || game.staging.lap.k < 0.05)
      case 'flap': return game.shaking === game.time
      case 'clack': return was.door !== now.door
      case 'squeal': return Math.abs(now.wind - Math.round(now.wind)) < 0.08
      case 'show': return game.dwellers.some((dweller) => dweller.kind === event.kind && dweller.at === event.index)
      case 'roll': return now.roll !== null
      case 'unroll': return was.world !== now.world && now.roll === 'in'
      case 'step': return now.at === event.node && was.at !== now.at
      case 'leave': return was.dwellers !== now.dwellers
      default: return false
    }
  }

  /** Plays a scene to its end and holds both directions at every frame. */
  function walk(game: Game, first: Event[], before: Was): EventType[] {
    const heard: EventType[] = []
    const unseen: string[] = []
    const unheard: string[] = []
    let was = before
    let events = first
    for (let t = 0; t < 12; t += FRAME) {
      for (const event of events) {
        heard.push(event.type)
        if (!shown(event, was, game)) unseen.push(`${event.type} at ${t.toFixed(2)} s`)
      }
      const now = snap(game)
      const types = events.map((event) => event.type)
      // What is seen to happen sounds in the frame it happens in.
      if (was.pose !== now.pose && now.pose !== null && now.pose !== 'ride' && !types.some((type) => ['shoot', 'bump', 'grumble', 'glug', 'flap', 'soak'].includes(type))) unheard.push(`the pose ${now.pose} at ${t.toFixed(2)} s`)
      if (was.door !== now.door && !types.includes('clack')) unheard.push(`the door at ${t.toFixed(2)} s`)
      // The crank squeals as each turn begins; where it stops at the top, it stops without one.
      if (Math.floor(was.wind + 1e-6) !== Math.floor(now.wind + 1e-6) && now.wind > 0 && now.wind < 5 - 1e-6 && !types.includes('squeal') && !types.includes('clack')) unheard.push(`a turn of the crank at ${t.toFixed(2)} s`)
      if (was.roll !== now.roll && now.roll !== null && !types.some((type) => type === 'roll' || type === 'unroll')) unheard.push(`the roll at ${t.toFixed(2)} s`)
      if (was.world !== now.world && game.sceneName !== null && !types.includes('unroll')) unheard.push(`the fresh hillside at ${t.toFixed(2)} s`)
      if (was.at !== now.at && game.sceneName !== null && !types.some((type) => ['step', 'bump', 'glug'].includes(type))) unheard.push(`the mole moved at ${t.toFixed(2)} s`)
      if (was.water !== now.water && game.sceneName !== null && !types.some((type) => ['lap', 'gush', 'glug', 'tip', 'unroll'].includes(type)) && now.lap !== was.lap) unheard.push(`water came to rest at ${t.toFixed(2)} s`)
      if (game.sceneName === null) break
      was = now
      game.step(FRAME)
      events = game.drain()
    }
    expect(unseen).toEqual([])
    expect(unheard).toEqual([])
    expect(game.sceneName).toBeNull()
    return heard
  }

  /** Holds a finger on a block until a scene starts, and gives back the events of the step that started it. */
  function start(game: Game, at: number): { first: Event[]; before: Was } {
    game.press(mid(at))
    game.drain()
    for (let t = 0; t < 10; t += FRAME) {
      const before = snap(game)
      game.step(FRAME)
      const events = game.drain()
      if (game.sceneName !== null) return { first: events.filter((event) => !['clang', 'chip', 'break', 'step'].includes(event.type)), before }
    }
    throw new Error('no scene started')
  }

  it('the blast', () => {
    const game = new Game(drawn('oee', 'oee', 'oee', '@ae'))
    const { first, before } = start(game, indexOf(1, 3))
    expect(walk(game, first, before)).toEqual(['whoomph', 'shoot', 'bump', 'grumble'])
  })

  it('the run, with the mole in its way and soot on him', () => {
    const world = drawn('@wee', 'oeee', 'ooee', 'eooe')
    world.mole.sooty = true
    const game = new Game(world)
    const { first, before } = start(game, indexOf(1, 0))
    const heard = walk(game, first, before)
    expect(heard[0]).toBe('gush')
    expect(heard.filter((type) => type === 'glug').length).toBeGreaterThan(6)
    expect(heard).toContain('soak')
    expect(heard.filter((type) => type === 'flap')).toHaveLength(3)
    expect(heard.filter((type) => type === 'lap')).toHaveLength(4)
  })

  it('the run from a bucket of water tipped out', () => {
    const world = drawn('@oee', 'eoee', 'eoee')
    world.mole.tool = 'bucket'
    world.mole.load = 'water'
    const game = new Game(world)
    const { first, before } = start(game, indexOf(1, 0))
    const heard = walk(game, first, before)
    expect(heard[0]).toBe('tip')
    expect(heard).toContain('lap')
  })

  it('the ride, from a lived-in cave', () => {
    const world = roomFor('bat')
    world.mole.at = CAGE
    const game = new Game(world)
    const before = snap(game)
    game.press({ x: LIFT.x + 60, y: LIFT.y + 100 })
    game.drain()
    game.release('tap', { x: LIFT.x + 60, y: LIFT.y + 100 })
    const heard = walk(game, game.drain(), before)
    expect(heard.filter((type) => type === 'clack')).toHaveLength(2)
    expect(heard.filter((type) => type === 'squeal')).toHaveLength(7)
    expect(heard.filter((type) => type === 'show')).toHaveLength(1)
    expect(heard.filter((type) => type === 'roll')).toHaveLength(7)
    expect(heard.filter((type) => type === 'unroll')).toHaveLength(1)
    expect(heard.filter((type) => type === 'step')).toHaveLength(3)
    expect(game.world.mole.at).toBe(BURROW_INDEX)
  })
})

describe('what is heard and what is drawn leave the visit in the same call', () => {
  it('every frame of a long random play: the notes that leave are the notes of that frame own events, and none without one', () => {
    for (const seed of [21, 22]) {
      const { play, log } = watched(layWorld(seed, 'wild'), seed)
      const rng = makeRng(seed)
      let from = 0
      const check = (): void => {
        const out = play.take()
        const events = log.slice(from).map((entry) => entry.event)
        from = log.length
        expect(out.notes).toEqual(notesFor(events))
        if (events.length === 0) expect(out.notes).toEqual([])
      }
      for (let move = 0; move < 60; move++) {
        const at = { x: play.game.mole.x + (rng.next() - 0.5) * 300, y: Math.max(200, play.game.mole.y + (rng.next() - 0.4) * 300) }
        play.press(at, false)
        check()
        for (let t = 0; t < 0.2 + rng.next() * 1.5; t += FRAME) { play.step(FRAME, true); check() }
        play.release(rng.next() < 0.5 ? 'tap' : 'drop', at, false)
        check()
        for (let t = 0; t < 0.5; t += FRAME) { play.step(FRAME, false); check() }
        if (play.game !== undefined && log.length > 5000) break
      }
      expect(from).toBeGreaterThan(50)
    }
  })

  it('what an event sets going in the cast and in the air is there in the call that sounds it', () => {
    // A knock: the block shudders in the call in which the finger lands.
    const knock = watched(drawn('@ee', 'eee'))
    knock.play.press(mid(indexOf(2, 0)), false)
    expect(knock.play.effects.shudders.length).toBe(1)
    expect(knock.play.take().notes.length).toBeGreaterThan(0)
    // A blow: the chips are in the air in the frame the break sounds.
    const blow = watched(drawn('@ee', 'eee'))
    blow.play.press(mid(indexOf(1, 0)), false)
    blow.play.take()
    let crumbs = blow.play.effects.chips.length
    for (let t = 0; t < 1; t += FRAME) {
      blow.play.step(FRAME, true)
      const out = blow.play.take()
      if (blow.log.some((entry) => entry.event.type === 'break')) {
        expect(blow.play.effects.chips.length).toBeGreaterThan(crumbs + 3)
        expect(blow.play.cast.mole.nose).toBeGreaterThan(0.95)
        expect(out.notes.length).toBeGreaterThan(0)
        break
      }
      // Until then only the crumbs of the knock are in the air, and fewer every frame.
      expect(blow.play.effects.chips.length).toBeLessThanOrEqual(crumbs)
      crumbs = blow.play.effects.chips.length
    }
    expect(blow.log.some((entry) => entry.event.type === 'break')).toBe(true)
    // A clang: the mammoth's ears and tusks, and the sting in his paws, in the frame it sounds.
    const clang = watched(drawn('@ge', 'eee'))
    clang.play.press(mid(indexOf(1, 0)), false)
    for (let t = 0; t < 1 && !clang.log.some((entry) => entry.event.type === 'clang'); t += FRAME) {
      expect(clang.play.cast.mammoth.rattle).toBe(0)
      clang.play.step(FRAME, true)
    }
    expect(clang.play.cast.mammoth.rattle).toBeGreaterThan(0.95)
    expect(clang.play.cast.mole.sting).toBeGreaterThan(0.95)
    // The ride: each lived-in place does its own move in the frame its sound comes in.
    const lived = roomFor('lizard')
    lived.mole.at = CAGE
    const ride = watched(lived)
    run(ride.play, 0.3)
    ride.play.press({ x: LIFT.x + 60, y: LIFT.y + 100 }, false)
    ride.play.release('tap', { x: LIFT.x + 60, y: LIFT.y + 100 }, false)
    let shows = 0
    for (let t = 0; t < 5; t += FRAME) {
      const from = ride.log.length
      ride.play.step(FRAME, false)
      if (!ride.log.slice(from).some((entry) => entry.event.type === 'show')) { if (shows === 0) expect(ride.play.cast.lodgers[0].start.left).toBe(0); continue }
      shows += 1
      expect(ride.play.cast.lodgers[0].start.left).toBeGreaterThan(0)
    }
    expect(shows).toBe(1)
    // A finger on a dweller: its start begins in the call in which the finger lands.
    const poke = watched(roomFor('lizard'))
    run(poke.play, 0.3)
    watch(poke.play, [])
    const lizard = poke.play.cast.lodgers[0]
    const at = mid(lizard.at)
    poke.play.press({ x: at.x, y: at.y + 30 }, false)
    expect(lizard.start.left).toBeGreaterThan(0)
  })
})
