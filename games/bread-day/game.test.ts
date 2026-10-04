import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { callIn, candidates, freshBakery, handOver, type Bakery } from './bakery'
import { Game, PULL_AT, STROKE, type Heard, type Point } from './game'
import { BENCH, REF_H, REF_W, SPOTS } from './lookLayout'
import { open, restore, serialize } from './save'
import { LUMP_AT, RACK, middle } from './stage'
import { BAKE_SECONDS, RISE_SECONDS, WORK_SMOOTH, kindOf, textureOf, type Bread, type Stuff } from './stuff'
import { IDEAS, judge, reachableBreads, type Animal } from './tastes'
import { VOICES } from './voices'

const LUMP = LUMP_AT.board, SACK = middle(SPOTS.sack), JUG = middle(SPOTS.jug), JAR = middle(SPOTS.jar), OVEN = middle(SPOTS.mouth), NOOK = middle(SPOTS.nook)
const BADGER = { x: middle(SPOTS.badger).x, y: SPOTS.badger[1] + 120 }, HANDLE = { x: SPOTS.peel[0] + SPOTS.peel[2] * 0.86, y: SPOTS.peel[1] + SPOTS.peel[3] * 0.84 }
const HATCH = middle(SPOTS.hatch)

/** A game on a saved bakery: as it is left, with nothing playing. */
const on = (bakery: Bakery, seed = 7): Game => new Game({ bakery, happened: [] }, seed)
/** A first visit with its showing ended by time, so the tests start from a quiet bakery. */
const fresh = (seed = 7): Game => { const game = new Game(freshBakery(null, seed), seed); game.step(9); game.voices(); game.dirty = ''; return game }
const at = (position: string, seed = 7): Game => {
  const bakery: Bakery = { ...freshBakery(null, seed).bakery, position, hatch: null, lane: [], finished: true }
  // Every idea has had its showing and every tool is out, so that a test starts from a quiet bakery.
  const stepped = callIn({ ...bakery, lane: candidates(bakery).slice(0, 1) }, 0).bakery
  return on({ ...stepped, shown: [...IDEAS], tools: { jar: true, seeds: true } }, seed)
}
/** Time passing in frames, as it does on a tablet. */
const run = (game: Game, seconds: number): void => { for (let t = 0; t < seconds - 1e-9; t += 1 / 30) game.step(1 / 30) }
const tap = (game: Game, where: Point): Heard[] => { game.press(where); const heard = game.voices(); game.lift(); return [...heard, ...game.voices()] }
const names = (heard: Heard[]): string[] => heard.map((voice) => voice.name)
const stuff = (game: Game): Stuff => { const load = game.bakery.peel.load; if (!load || !load.raw) throw new Error('nothing raw on the peel'); return load }
const bread = (game: Game): Bread => { const load = game.bakery.peel.load; if (!load || load.raw) throw new Error('no bread on the peel'); return load }
const drag = (game: Game, from: Point, to: Point, steps = 24, seconds = 0.5): void => {
  game.press(from)
  for (let i = 1; i <= steps; i++) { game.moveTo({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }); game.step(seconds / steps) }
}
const carry = (game: Game, from: Point, to: Point): void => { drag(game, from, to); game.lift(); game.step(0.6) }
const withDough = (game = fresh()): Game => { tap(game, SACK); tap(game, JUG); game.step(1); game.voices(); return game }
const knead = (game: Game): Game => {
  for (let i = 0; i < 8 && textureOf(stuff(game)) !== 'smooth'; i++) { drag(game, { x: LUMP.x - 50, y: LUMP.y }, { x: LUMP.x + 50, y: LUMP.y + 10 }, 20); game.lift(); drag(game, { x: LUMP.x + 50, y: LUMP.y }, { x: LUMP.x - 50, y: LUMP.y - 10 }, 20); game.lift() }
  game.step(1.5); game.voices()
  return game
}
/** Smooth dough carried into the oven, baked, and brought back to the board. */
const bakeIt = (game: Game): Game => { carry(game, HANDLE, OVEN); game.step(BAKE_SECONDS + 0.2); carry(game, OVEN, { x: LUMP.x, y: BENCH + 120 }); game.voices(); return game }
const whereIs = (game: Game, animal: Animal): Point => {
  const laid = game.figures().find((piece) => piece.figure.startsWith(animal === 'sparrows' ? 'sparrow1' : animal))
  if (!laid) throw new Error(`${animal} is not here`)
  return { x: laid.box[0] + laid.box[2] / 2, y: laid.box[1] + laid.box[3] / 2 }
}

describe('the toy, still under the game', () => {
  it('fills the peel at a tap and works the dough under the finger, each answered in the same call', () => {
    const game = fresh()
    game.press(SACK)
    expect(names(game.voices())).toContain('flour-hiss')
    expect(kindOf(stuff(game))).toBe('dust')
    game.lift()
    expect(names(tap(game, JUG))).toContain('gurgle')
    const before = [...game.body.outline()], work = stuff(game).work
    game.step(1); game.voices()
    game.press({ x: LUMP.x + 20, y: LUMP.y })
    expect([...game.body.outline()]).not.toEqual(before)
    expect(game.voices().length).toBeGreaterThan(0)
    expect(stuff(game).work).toBe(work + 1)
    game.lift()
    knead(game)
    expect(stuff(game).work).toBeGreaterThanOrEqual(WORK_SMOOTH)
    expect(STROKE).toBeGreaterThan(0)
  })

  it('rips rough dough short, stretches smooth dough long, and rounds it up again from beside', () => {
    const rough = withDough()
    drag(rough, LUMP, { x: LUMP.x + 300, y: LUMP.y - 40 }, 40)
    expect(names(rough.voices())).toContain('tear')
    rough.lift()
    expect(stuff(rough).long).toBe(false)
    const smooth = knead(withDough())
    drag(smooth, LUMP, { x: LUMP.x + 300, y: LUMP.y - 40 }, 40)
    expect(names(smooth.voices())).toContain('stretch-rise')
    smooth.lift(); smooth.step(1.5); smooth.voices()
    expect(stuff(smooth).long).toBe(true)
    drag(smooth, { x: LUMP.x - 190, y: BENCH + 200 }, LUMP, 30)
    expect(names(smooth.voices())).toContain('gather-pat')
    smooth.lift()
    expect(stuff(smooth).long).toBe(false)
    expect(PULL_AT).toBeGreaterThan(0)
  })

  it('answers a finger anywhere on the sheet with a voice in the same call, and never throws', () => {
    for (const game of [fresh(), knead(withDough()), bakeIt(knead(withDough()))]) {
      for (let x = 30; x < REF_W; x += 70) for (let y = 30; y < REF_H; y += 70) {
        game.press({ x, y })
        expect(game.voices().length, `a press at ${x},${y} on ${JSON.stringify(game.hit({ x, y }))}`).toBeGreaterThan(0)
        game.lift(); game.step(0.05); game.voices()
      }
    }
  })
})

describe('the first visit', () => {
  it('opens with the goat at the hatch and the badger already showing how dough is made, on a lump of its own', () => {
    const game = new Game(freshBakery(null, 7), 7)
    expect(game.playing).toBe(true)
    expect(game.figures().some((piece) => piece.figure === 'goat')).toBe(true)
    game.step(3)
    expect(game.things().length, 'the badger\'s own lump is drawn').toBe(1)
    expect(game.bakery.peel.load, 'never on the child\'s peel').toBeNull()
    expect(game.bakery.shown).toEqual(['dough'])
    game.step(9)
    expect(game.playing).toBe(false)
    expect(game.things().length).toBe(0)
  })

  it('gives way to any touch: the showing ends at once and the touch is an ordinary touch', () => {
    const game = new Game(freshBakery(null, 7), 7)
    game.step(1); game.voices()
    game.press(SACK)
    expect(game.playing).toBe(false)
    expect(kindOf(stuff(game)), 'the same press tipped the flour').toBe('dust')
    expect(names(game.voices())).toEqual(['flour-hiss'])
    expect(game.things().length).toBe(0)
  })

  it('never replays: a saved bakery opens with nothing playing', () => {
    const first = new Game(freshBakery(null, 7), 7)
    const again = new Game(open(JSON.parse(JSON.stringify(serialize(first.bakery))), null, 7), 7)
    expect(again.playing).toBe(false)
    expect(again.voices()).toEqual([])
    expect(again.bakery).toEqual(first.bakery)
  })
})

describe('the peel and its places', () => {
  it('is carried by the finger and set down where it is let go; the oven bakes on attended time behind its door', () => {
    const game = knead(withDough())
    drag(game, HANDLE, OVEN)
    expect(game.bakery.peel.at, 'in the hand it is still where it came from').toBe('board')
    game.lift()
    expect(game.bakery.peel.at).toBe('oven')
    expect(game.doorShut).toBe(true)
    game.step(BAKE_SECONDS / 2)
    expect(stuff(game).bake).toBeGreaterThan(30)
    game.voices()
    game.step(BAKE_SECONDS)
    expect(bread(game)).toMatchObject({ crumb: 'dense', crust: 'gold' })
    expect(game.doorShut).toBe(false)
    expect(names(game.voices())).toContain('oven-whoosh')
    game.step(600)
    expect(bread(game).crust, 'nothing burns by waiting').toBe('gold')
    carry(game, OVEN, { x: LUMP.x, y: BENCH + 120 })
    expect(game.bakery.peel.at).toBe('board')
    expect(names(game.voices()), 'a brick lands as a brick').toContain('thunk')
  })

  it('keeps the baking behind the shut door: a drag on it only rattles it, and the dough bakes on', () => {
    const game = knead(withDough())
    carry(game, HANDLE, OVEN)
    game.step(BAKE_SECONDS / 2); game.voices()
    carry(game, OVEN, { x: LUMP.x, y: BENCH + 120 })
    expect(game.bakery.peel.at, 'nothing comes out of a shut oven').toBe('oven')
    expect(names(game.voices()), 'the door only rattles').toContain('door-rattle')
    game.step(BAKE_SECONDS)
    expect(bread(game)).toMatchObject({ crust: 'gold' })
  })

  it('goes back where it came from when let go nowhere', () => {
    const game = knead(withDough())
    carry(game, HANDLE, { x: 600, y: 60 })
    expect(game.bakery.peel.at).toBe('board')
    expect(stuff(game).work).toBeGreaterThanOrEqual(WORK_SMOOTH)
  })

  it('darkens a bread that goes back in, at once and once', () => {
    const game = bakeIt(knead(withDough()))
    carry(game, HANDLE, OVEN)
    expect(bread(game).crust).toBe('dark')
    game.step(600)
    expect(bread(game).crust).toBe('dark')
    carry(game, OVEN, { x: LUMP.x, y: BENCH + 120 })
    carry(game, HANDLE, OVEN)
    expect(bread(game).crust).toBe('black')
  })

  it('lets dough with the bubbly in it rise in the warm nook, and only there and then', () => {
    const game = at('rising')
    expect(game.bakery.tools.jar).toBe(true)
    tap(game, SACK); tap(game, JUG)
    expect(names(tap(game, JAR))).toContain('burp')
    knead(game)
    game.step(20)
    expect(stuff(game).rise, 'slow on the board').toBeLessThan(50)
    carry(game, HANDLE, NOOK)
    expect(game.bakery.peel.at).toBe('nook')
    game.voices()
    game.step(RISE_SECONDS)
    expect(stuff(game).rise).toBe(100)
    expect(names(game.voices())).toContain('bubble-ticks')
    game.press(LUMP_AT.nook)
    expect(names(game.voices()), 'a push on risen dough lets the air out').toContain('long-sigh')
    game.lift()
    expect(stuff(game).rise).toBeLessThan(100)
  })
})

describe('the hatch', () => {
  it('ends the cycle when the customer is handed a bread it wants: saved at once, and off down the lane', () => {
    const game = bakeIt(knead(withDough()))
    drag(game, LUMP, HATCH)
    expect(bread(game), 'in the hand it is still on the peel').toMatchObject({ crumb: 'dense' })
    game.lift()
    expect(game.bakery.peel.load).toBeNull()
    expect(game.bakery).toMatchObject({ hatch: null, finished: true, position: 'shapes' })
    expect(game.dirty).toBe('now')
    expect(game.playing).toBe(true)
    expect(game.things().length, 'the goat has the bread').toBe(1)
    game.step(10)
    expect(game.playing).toBe(false)
    expect(game.figures().some((piece) => piece.figure === 'goat')).toBe(false)
    expect(game.things().length).toBe(0)
    game.step(600)
    expect(game.bakery.hatch, 'nothing starts by itself').toBeNull()
  })

  it('lets a customer who is laid out to wait again finish leaving first, and come up the lane afresh', () => {
    // At `seeds` only the hen is new, so the lane lays her out again the moment her cycle is judged.
    const full = at('seeds').bakery, game = on({ ...full, lane: full.lane.slice(0, 1) })
    tap(game, middle(SPOTS.dish)); game.step(0.5)
    drag(game, LUMP, HATCH, 30); game.lift()
    expect(game.bakery.lane.some((visitor) => visitor.group[0] === 'hen'), 'the rules lay her out again at once').toBe(true)
    run(game, 1)
    const hen = game.figures().find((piece) => piece.figure === 'hen')!
    expect(hen.box[0] + hen.box[2] / 2, 'and she is still at the hatch, in her ending').toBeGreaterThan(SPOTS.hatch[0] + SPOTS.hatch[2] / 2)
    run(game, 6)
    expect(game.playing).toBe(false)
    run(game, 3)
    const back = game.figures().find((piece) => piece.figure === 'hen')!
    expect(back.box[0] + back.box[2] / 2, 'then she waits in the lane like anyone').toBeLessThan(SPOTS.hatch[0] + SPOTS.hatch[2])
    expect(game.wants()?.to, 'for the child to call in').toBeNull()
  })

  it('loses nothing if it is put away in the middle of the ending, and does not replay it', () => {
    const game = bakeIt(knead(withDough()))
    drag(game, LUMP, HATCH); game.lift(); game.step(1)
    const again = new Game(open(JSON.parse(JSON.stringify(serialize(game.bakery))), null, 7), 7)
    expect(again.playing).toBe(false)
    expect(again.bakery).toMatchObject({ hatch: null, finished: true, position: 'shapes' })
    expect(again.figures().some((piece) => piece.figure === 'goat')).toBe(false)
    expect(again.things().length).toBe(0)
  })

  it('hands an unwanted thing back unharmed: it is shown in the customer\'s hold and is all the while where it was', () => {
    const game = knead(withDough())
    drag(game, LUMP, HATCH, 40)
    const before = game.bakery.peel
    game.lift()
    expect(game.bakery.peel).toEqual(before)
    expect(game.bakery.hatch, 'raw dough is no bread, and is not counted').toMatchObject({ group: ['goat'], handedBack: 0 })
    expect(game.form, 'the peel shows empty while the goat holds it').toBeNull()
    expect(game.things().length).toBe(1)
    expect(names(game.voices())).toContain('stretch-twang')
    game.step(2.2)
    expect(game.form, 'and it is back').not.toBeNull()
    expect(game.things().length).toBe(0)
    expect(game.playing, 'a reaction is not a scene').toBe(false)
  })

  it('lets the child send the one at the hatch back and call another in, each with a touch', () => {
    const game = fresh()
    tap(game, whereIs(game, 'goat'))
    expect(game.bakery.hatch).toBeNull()
    expect(game.bakery.lane.map((visitor) => visitor.group[0]).sort()).toEqual(['goat', 'sparrows'])
    game.step(2)
    tap(game, whereIs(game, 'sparrows'))
    expect(game.bakery.hatch?.group).toEqual(['sparrows'])
    game.step(2)
    tap(game, whereIs(game, 'goat'))
    expect(game.bakery.hatch?.group).toEqual(['goat'])
    expect(game.bakery.lane.map((visitor) => visitor.group[0])).toEqual(['sparrows'])
  })

  it('shows each new idea once, when the first customer who needs it steps up', () => {
    const served = handOver({ ...fresh().bakery, peel: { at: 'board', load: reachableBreads().find((loaf) => judge(['goat'], loaf).wanted)! } }, 'peel').bakery
    const game = on(served)
    expect(game.bakery.position).toBe('shapes')
    tap(game, whereIs(game, 'dachshund'))
    expect(game.bakery.hatch?.group).toEqual(['dachshund'])
    expect(game.playing, 'the badger shows how dough is pulled long').toBe(true)
    expect(game.dirty, 'marked as shown before it plays').toBe('now')
    expect(game.bakery.shown).toContain('shapes')
    game.step(9)
    tap(game, whereIs(game, 'dachshund')); game.step(2)
    tap(game, whereIs(game, 'dachshund'))
    expect(game.playing, 'and never again').toBe(false)
  })
})

describe('the rack and the badger', () => {
  it('keeps a bread on the rack, gives it back to the peel, and hands it over from there', () => {
    const game = bakeIt(knead(withDough()))
    carry(game, LUMP, middle(RACK[2]))
    expect(game.bakery.rack[2]).toMatchObject({ crumb: 'dense' })
    expect(game.bakery.peel.load).toBeNull()
    expect(game.things().length).toBe(1)
    carry(game, middle(RACK[2]), LUMP)
    expect(bread(game).crumb).toBe('dense')
    carry(game, LUMP, middle(RACK[0]))
    drag(game, middle(RACK[0]), HATCH); game.lift()
    expect(game.bakery.rack[0]).toBeNull()
    expect(game.bakery.hatch).toBeNull()
  })

  it('empties the peel or the rack when a thing is carried to the badger', () => {
    const game = knead(withDough())
    game.voices()
    drag(game, HANDLE, BADGER, 40); game.lift()
    expect(game.bakery.peel.load).toBeNull()
    run(game, 2)
    // Raw dough it loves: a slurp and a chuckle, not the plain eating of anything else.
    const loved = names(game.voices())
    expect(loved).toEqual(expect.arrayContaining(['badger-slurp', 'badger-chuckle']))
    expect(loved).not.toContain('badger-eat')
    const baked = bakeIt(knead(withDough()))
    carry(baked, LUMP, middle(RACK[1]))
    baked.voices()
    drag(baked, middle(RACK[1]), BADGER); baked.lift(); run(baked, 2)
    expect(baked.bakery.rack[1]).toBeNull()
    const plain = names(baked.voices())
    expect(plain).toContain('badger-eat')
    expect(plain).not.toContain('badger-slurp')
  })
})

describe('a rub or a pull is never a give to the badger', () => {
  const slurped = (game: Game): boolean => names(game.voices()).some((name) => name === 'badger-slurp' || name === 'badger-eat' || name === 'badger-chuckle')

  it('lets worked dough pulled up from the board spring back when it is let go in front of the badger', () => {
    const game = knead(withDough())
    const top = { x: LUMP.x, y: LUMP.y - 20 }
    for (const to of [BADGER, { x: LUMP.x + 40, y: BENCH - 10 }, { x: SPOTS.badger[0] + 20, y: SPOTS.badger[1] + 300 }]) {
      game.voices()
      drag(game, top, to, 40); game.lift(); run(game, 2)
      expect(kindOf(stuff(game)), 'the dough is still on the peel').toBe('dough')
      expect(game.bakery.peel.at).toBe('board')
      expect(slurped(game), 'and the badger ate nothing').toBe(false)
      expect(game.form?.kind, 'the lump has settled where it was').toBe('dough')
    }
    expect(stuff(game).long, 'a pull that went far is still a pull').toBe(true)
  })

  it('lets a stroke that runs down off the sill end as a stroke, whatever lies there', () => {
    const SILL = LUMP_AT.sill
    for (const fill of [[SACK], [JUG], [SACK, JUG]]) {
      const game = fresh()
      for (const tool of fill) tap(game, tool)
      game.step(1)
      if (fill.length === 2) knead(game)
      carry(game, HANDLE, middle(SPOTS.sill)); game.voices()
      const before = kindOf(stuff(game))
      for (const to of [{ x: SILL.x, y: SILL.y + 90 }, { x: SILL.x, y: SILL.y + 200 }, BADGER, { x: SILL.x + 60, y: BENCH - 30 }]) {
        drag(game, SILL, to, 30); game.lift(); run(game, 1.5)
        expect(game.bakery.peel.load, 'nothing is eaten').not.toBeNull()
        expect(kindOf(stuff(game))).toBe(before)
        expect(game.bakery.peel.at, 'and the peel stays on the sill').toBe('sill')
        expect(slurped(game)).toBe(false)
      }
    }
  })

  it('feeds the badger only from a peel carried up in front of it, and a peel nudged off the sill goes back', () => {
    const game = knead(withDough())
    carry(game, HANDLE, middle(SPOTS.sill)); game.voices()
    // The peel is taken by its edge, beside the dough, and let go just under the sill: it goes back to the sill.
    const edge = { x: LUMP_AT.sill.x + 150, y: LUMP_AT.sill.y + 10 }
    expect(game.hit(edge).on).toBe('peel')
    drag(game, edge, { x: edge.x + 8, y: SPOTS.sill[1] + SPOTS.sill[3] + 64 }, 20); game.lift(); run(game, 1)
    expect(kindOf(stuff(game))).toBe('dough')
    expect(game.bakery.peel.at).toBe('sill')
    // Carried on down to the badger and let go there: now it is handed over.
    drag(game, edge, BADGER, 30); game.lift(); run(game, 2)
    expect(game.bakery.peel.load).toBeNull()
    expect(names(game.voices())).toEqual(expect.arrayContaining(['badger-slurp', 'badger-chuckle']))
    expect(game.bakery.peel.at, 'the empty peel goes back where it stood').toBe('sill')
  })
})

describe('what the grid says is seen as well as heard', () => {
  const kindsOf = (game: Game): string[] => game.wisps.list.map((wisp) => wisp.kind)
  const DISH = middle(SPOTS.dish)

  it('lets water steam in the warm nook, now and then, and a baked bread shimmer', () => {
    const wet = fresh()
    tap(wet, JUG); wet.step(1)
    carry(wet, HANDLE, NOOK)
    wet.step(0.2)
    expect(kindsOf(wet)).toContain('steam')
    run(wet, 5)
    expect(kindsOf(wet), 'and again, for as long as it stands there').toContain('steam')
    const loaf = bakeIt(knead(withDough()))
    carry(loaf, HANDLE, NOOK); loaf.step(0.2)
    expect(kindsOf(loaf)).toContain('shimmer')
  })

  it('rolls one seed over in the warm nook, and makes seeds hop in the oven', () => {
    const game = at('seeds')
    expect(game.bakery.tools.seeds).toBe(true)
    tap(game, DISH); game.step(1)
    carry(game, HANDLE, NOOK)
    expect(kindsOf(game).filter((kind) => kind === 'seed').length, 'one seed').toBe(1)
    game.step(2)
    expect(kindsOf(game)).toEqual([])
    carry(game, { x: LUMP_AT.nook.x + 60, y: LUMP_AT.nook.y + 10 }, OVEN)
    expect(game.bakery.peel.at).toBe('oven')
    game.step(BAKE_SECONDS + 0.05)
    expect(kindsOf(game).filter((kind) => kind === 'seed').length).toBeGreaterThan(1)
  })

  it('sends a cloud of steam out of the oven for water, and a wisp of smoke for flour', () => {
    const wet = fresh()
    tap(wet, JUG); wet.step(1)
    carry(wet, HANDLE, OVEN); wet.step(BAKE_SECONDS + 0.05)
    expect(kindsOf(wet)).toContain('cloud')
    expect(wet.bakery.peel.load, 'and the peel comes back dry').toBeNull()
    const dusty = fresh()
    tap(dusty, SACK); dusty.step(1)
    carry(dusty, HANDLE, OVEN); dusty.step(BAKE_SECONDS + 0.05)
    expect(kindsOf(dusty)).toContain('smoke')
  })

  it('puffs smoke when a bread goes black, and when the badger is fed a burnt one it coughs a small black cloud', () => {
    const game = bakeIt(knead(withDough()))
    carry(game, HANDLE, OVEN)
    expect(kindsOf(game), 'gold to dark: a sizzle and no smoke').not.toContain('smoke')
    carry(game, OVEN, { x: LUMP.x, y: BENCH + 120 })
    carry(game, HANDLE, OVEN)
    expect(bread(game).crust).toBe('black')
    expect(kindsOf(game)).toContain('smoke')
    carry(game, OVEN, { x: LUMP.x, y: BENCH + 120 }); game.step(3); game.voices()
    expect(kindsOf(game)).toEqual([])
    drag(game, LUMP, BADGER, 30); game.lift()
    expect(kindsOf(game)).toContain('smoke')
    expect(names(game.voices())).toContain('badger-cough')
    expect(game.bakery.peel.load, 'and eats it anyway').toBeNull()
  })

  it('sends up a white cloud when a customer sneezes at dust, a splash at water, and soot from the mole at a black crust', () => {
    const dusty = fresh()
    tap(dusty, SACK); dusty.step(1); dusty.voices()
    drag(dusty, LUMP, HATCH, 30); dusty.lift()
    expect(names(dusty.voices()), 'the goat sneezes').toContain('sneeze')
    // The sparrows bathe in it: a dry scrape and no sneeze, and the cloud and the white coat all the same.
    const birds = on({ ...fresh().bakery, hatch: { group: ['sparrows'], from: 'dough', handedBack: 0 }, lane: [{ group: ['goat'], from: 'dough', handedBack: 0 }] })
    tap(birds, SACK); birds.step(1); birds.voices()
    drag(birds, LUMP, HATCH, 30); birds.lift()
    const bath = names(birds.voices())
    expect(bath).toContain('dry-scrape'); expect(bath).not.toContain('sneeze')
    run(birds, 0.6)
    expect(kindsOf(birds)).toContain('cloud')
    expect(birds.figures().filter((piece) => piece.figure.startsWith('sparrow')).every((piece) => piece.floured)).toBe(true)
    expect(kindsOf(dusty), 'the sneeze comes a moment into the reaction').toEqual([])
    run(dusty, 0.6)
    expect(kindsOf(dusty)).toContain('cloud')
    const wet = fresh()
    tap(wet, JUG); wet.step(1)
    drag(wet, LUMP, HATCH, 30); wet.lift(); run(wet, 0.3)
    expect(wet.specks.some((speck) => speck.wet)).toBe(true)
    const mole = on({ ...at('trios').bakery, hatch: { group: ['mole'], from: 'trios', handedBack: 0 }, lane: [{ group: ['goat'], from: 'dough', handedBack: 0 }], peel: { at: 'board', load: { raw: false, crumb: 'airy', shape: 'round', crust: 'black', seeds: false } } })
    drag(mole, LUMP, HATCH, 30); mole.lift(); run(mole, 1.1)
    expect(kindsOf(mole), 'no soot in the air before the sneeze').not.toContain('smoke')
    run(mole, 0.4)
    expect(kindsOf(mole), 'the soot comes out with the sneeze').toContain('smoke')
    expect(mole.bakery.peel.load, 'and the bread is handed back as it was').toMatchObject({ crust: 'black' })
  })

  it('lets an airy loaf fresh from the oven crackle as the peel sets down', () => {
    const game = at('rising')
    tap(game, SACK); tap(game, JUG); tap(game, JAR); knead(game)
    carry(game, HANDLE, NOOK); game.step(RISE_SECONDS)
    carry(game, { x: LUMP_AT.nook.x + 60, y: LUMP_AT.nook.y + 10 }, OVEN); game.step(BAKE_SECONDS + 0.1); game.voices()
    carry(game, OVEN, { x: LUMP.x, y: BENCH + 120 })
    expect(bread(game).crumb).toBe('airy')
    expect(names(game.voices())).toEqual(expect.arrayContaining(['bounce-sigh', 'toast-crackle']))
  })

  it('leaves the customer white all over after its sneeze at dust, for as long as the reaction lasts', () => {
    const game = fresh()
    tap(game, SACK); game.step(1)
    drag(game, LUMP, HATCH, 30); game.lift()
    const goat = () => game.figures().find((piece) => piece.figure === 'goat')!
    expect(goat().floured).toBe(false)
    run(game, 0.6)
    expect(goat().floured, 'white after the sneeze').toBe(true)
    run(game, 1.6)
    expect(goat().floured, 'and itself again when the reaction is over').toBe(false)
    expect(kindOf(stuff(game)), 'the dust is back on the peel').toBe('dust')
  })

  it('pulls strings from raw dough, leaves a seed in a tooth, and soot on the mole\'s nose, each only while the reaction lasts', () => {
    const dough = knead(withDough())
    drag(dough, LUMP, HATCH, 30); dough.lift(); run(dough, 0.6)
    expect(dough.extras().map((extra) => extra.kind)).toEqual(['strings'])
    run(dough, 1.6)
    expect(dough.extras(), 'snapped back').toEqual([])
    const seeds = on({ ...at('seeds').bakery, hatch: { group: ['goat'], from: 'dough', handedBack: 0 }, lane: [{ group: ['sparrows'], from: 'dough', handedBack: 0 }] })
    tap(seeds, middle(SPOTS.dish)); seeds.step(0.5)
    drag(seeds, LUMP, HATCH, 30); seeds.lift(); run(seeds, 0.6)
    expect(seeds.extras().map((extra) => extra.kind), 'anyone but the hen').toEqual(['seed'])
    run(seeds, 1.8)
    expect(seeds.extras()).toEqual([])
    const mole = on({ ...at('trios').bakery, hatch: { group: ['mole'], from: 'trios', handedBack: 0 }, lane: [{ group: ['goat'], from: 'dough', handedBack: 0 }], peel: { at: 'board', load: { raw: false, crumb: 'airy', shape: 'round', crust: 'black', seeds: false } } })
    drag(mole, LUMP, HATCH, 30); mole.lift(); run(mole, 0.9)
    expect(mole.extras().map((extra) => extra.kind)).toEqual(['soot'])
    run(mole, 1.5)
    expect(mole.extras()).toEqual([])
  })

  it('makes the customer sniff the bubbly and pucker at the sour, and hands it back as it was', () => {
    const game = at('rising')
    tap(game, JAR); game.step(0.5); game.voices()
    const before = game.bakery.peel
    drag(game, LUMP, HATCH, 30); game.lift()
    expect(names(game.voices())).toContain('drawn-in-squeak')
    const bear = () => game.figures().find((piece) => piece.figure === 'bear')!
    run(game, 0.3)
    const sniffing = bear().pose.sx
    run(game, 0.75)
    expect(bear().pose.sx, 'the whole figure pinches in').toBeLessThan(sniffing - 0.08)
    expect(game.extras(), 'no strings: it never bit').toEqual([])
    run(game, 1.2)
    expect(bear().pose.sx).toBeGreaterThan(0.95)
    // The blob froths a little while it lies there, as the rules have it; nothing else about it has changed.
    expect(game.bakery.peel).toMatchObject({ at: before.at, load: { raw: true, flour: 0, water: 0, bubbly: true } })
    expect(game.form, 'and the blob is back on the peel').not.toBeNull()
  })

  it('slides a sheen over dough with no bubbly in the warm nook, and pops as a bread goes black, and crackles when an airy loaf is pushed', () => {
    const plain = knead(withDough())
    carry(plain, HANDLE, NOOK)
    expect(kindsOf(plain)).toContain('sheen')
    expect(stuff(plain).rise, 'and it does not rise').toBe(0)
    const loaf = bakeIt(knead(withDough()))
    carry(loaf, HANDLE, OVEN); carry(loaf, OVEN, { x: LUMP.x, y: BENCH + 120 }); loaf.voices()
    drag(loaf, HANDLE, OVEN); loaf.lift()
    expect(names(loaf.voices())).toContain('one-pop')
    const airy = on({ ...fresh().bakery, peel: { at: 'board', load: { raw: false, crumb: 'airy', shape: 'round', crust: 'gold', seeds: false } } })
    airy.press(LUMP)
    expect(names(airy.voices())).toEqual(expect.arrayContaining(['wheeze', 'toast-crackle']))
    airy.lift()
  })

  it('keeps none of it: wisps are gone in a moment and a game opened again has none', () => {
    const game = fresh()
    tap(game, JUG); game.step(1); carry(game, HANDLE, NOOK); game.step(0.3)
    expect(game.wisps.list.length).toBeGreaterThan(0)
    expect(on(restore(JSON.parse(JSON.stringify(serialize(game.bakery))), null)!).wisps.list.length).toBe(0)
    carry(game, { x: LUMP_AT.nook.x + 60, y: LUMP_AT.nook.y + 10 }, { x: LUMP.x, y: BENCH + 120 }); game.step(3)
    expect(game.wisps.list.length).toBe(0)
  })
})

describe('the secrets', () => {
  const riders = (game: Game, start: string) => game.figures().filter((piece) => piece.figure.startsWith(start))
  const near = (a: { x: number; y: number }, b: { x: number; y: number }, within: number) => Math.hypot(a.x - b.x, a.y - b.y) < within

  it('the hen: her chicks ride the peel back into the bakery, peck it clean, and hop out again after her', () => {
    const game = at('seeds')
    tap(game, middle(SPOTS.dish)); game.step(1); game.voices(); game.dirty = ''
    drag(game, LUMP, HATCH, 30); game.lift()
    // The outcome is in the bakery, and saved, before anything is seen.
    expect(game.bakery).toMatchObject({ hatch: null, finished: true, position: 'seeds', peel: { at: 'board', load: null } })
    expect(game.dirty).toBe('now')
    expect(game.playing).toBe(true)
    game.step(0.1)
    expect(game.form?.kind, 'the seeds are drawn on the peel').toBe('seeds')
    expect(near(game.peel, LUMP, 60), 'which is drawn at the hatch').toBe(false)
    game.step(1.0)
    const riding = riders(game, 'chick')
    expect(riding.length).toBe(3)
    for (const chick of riding) {
      expect(chick.front, 'a chick on the peel is laid over it').toBe(true)
      expect(near({ x: chick.box[0] + chick.box[2] / 2, y: chick.box[1] + chick.box[3] }, game.peel, 70), 'and rides it').toBe(true)
    }
    game.step(1.3)
    expect(near(game.peel, LUMP, 2), 'back in the bakery').toBe(true)
    expect(riders(game, 'chick').every((chick) => chick.front)).toBe(true)
    game.step(0.8)
    expect(game.form, 'pecked clean').toBeNull()
    game.step(1)
    expect(riders(game, 'chick').every((chick) => !chick.front), 'and out again after her').toBe(true)
    game.step(2)
    expect(game.playing).toBe(false)
    expect(riders(game, 'chick').length + riders(game, 'hen').length).toBe(0)
    expect(near(game.peel, LUMP, 0.001)).toBe(true)
  })

  it('the duck: it climbs onto the peel and paddles, and waddles off down the lane', () => {
    const game = at('batter')
    tap(game, JUG); game.step(1); game.voices()
    drag(game, LUMP, HATCH, 30); game.lift()
    expect(game.bakery).toMatchObject({ hatch: null, finished: true, peel: { at: 'board', load: null } })
    game.step(1.2)
    const duck = riders(game, 'duck')[0]
    expect(duck.front).toBe(true)
    expect(near({ x: duck.box[0] + duck.box[2] / 2, y: duck.box[1] + duck.box[3] }, game.peel, 40), 'it stands on the peel').toBe(true)
    expect(game.form?.kind, 'in the puddle').toBe('puddle')
    game.voices()
    run(game, 1)
    expect(names(game.voices()), 'paddling').toContain('plip')
    expect(game.specks.some((speck) => speck.wet)).toBe(true)
    game.step(4)
    expect(game.playing).toBe(false)
    expect(riders(game, 'duck').length).toBe(0)
    expect(game.form).toBeNull()
    expect(near(game.peel, LUMP, 0.001)).toBe(true)
  })

  it('give way to any touch, and a put-away in the middle loses nothing and replays nothing', () => {
    const game = at('seeds')
    tap(game, middle(SPOTS.dish)); game.step(1)
    drag(game, LUMP, HATCH, 30); game.lift(); game.step(1.5)
    const again = on(restore(JSON.parse(JSON.stringify(serialize(game.bakery))), null)!)
    expect(again.playing).toBe(false)
    expect(again.bakery.peel).toEqual({ at: 'board', load: null })
    expect(again.figures().some((piece) => piece.figure === 'hen')).toBe(false)
    game.voices()
    game.press(SACK)
    expect(game.playing).toBe(false)
    expect(near(game.peel, LUMP, 0.001), 'the peel is home').toBe(true)
    expect(game.figures().every((piece) => !piece.front)).toBe(true)
    expect(game.figures().some((piece) => piece.figure === 'hen')).toBe(false)
    expect(kindOf(stuff(game)), 'and the touch tipped the flour').toBe('dust')
  })

  it('the badger: flour tipped once too often leaves it white all over until it shakes like a wet dog, and nothing behind', () => {
    const game = fresh()
    for (let i = 0; i < 3; i++) tap(game, SACK)
    const before = game.bakery
    expect(game.floured).toBe(false)
    game.press(SACK)
    expect(names(game.voices())).toContain('flour-whump')
    expect(game.floured).toBe(true)
    expect(game.playing).toBe(true)
    expect(game.bakery, 'nothing of it is in the bakery').toBe(before)
    game.lift(); game.step(1.4)
    expect(game.floured).toBe(true)
    game.step(1.7)
    expect(game.floured, 'shaken off').toBe(false)
    game.step(1.2)
    expect(game.playing).toBe(false)
    // The same again, every time, and a touch ends it clean.
    game.press(SACK)
    expect(game.floured).toBe(true)
    game.lift()
    game.press(JUG)
    expect(game.floured).toBe(false)
    expect(on(restore(JSON.parse(JSON.stringify(serialize(game.bakery))), null)!).floured).toBe(false)
  })
})

describe('what a reader found, and is mended', () => {
  const kindsOf = (game: Game): string[] => game.wisps.list.map((wisp) => wisp.kind)

  it('saves a first visit at once, so its showing is never played again after a put-away', () => {
    const first = new Game(freshBakery(null, 7), 7)
    expect(first.dirty).toBe('now')
    expect(first.bakery.shown).toEqual(['dough'])
    expect(new Game(open(JSON.parse(JSON.stringify(serialize(first.bakery))), null, 7), 7).playing).toBe(false)
    expect(on(first.bakery).dirty, 'a saved bakery opened again has nothing new to save').toBe('')
  })

  it('makes no move the child did not make when it is put away with a thing in the hand', () => {
    const loaf = bakeIt(knead(withDough()))
    for (const over of [HATCH, BADGER, middle(RACK[1])]) {
      const before = loaf.bakery
      drag(loaf, LUMP, over)
      loaf.cancel()
      loaf.lift()
      expect(loaf.bakery, 'the bread is where it came from').toBe(before)
      expect(loaf.form?.bread?.crumb).toBe('dense')
      expect(loaf.things().length).toBe(0)
    }
    const before = loaf.bakery
    drag(loaf, HANDLE, OVEN)
    loaf.cancel(); loaf.lift(); loaf.step(1)
    expect(loaf.bakery, 'and the peel does not go into the oven').toBe(before)
    expect(bread(loaf).crust).toBe('gold')
    const dough = knead(withDough())
    const worked = dough.bakery
    drag(dough, LUMP, HATCH, 30); dough.cancel(); dough.lift()
    expect(dough.bakery.hatch?.handedBack).toBe(worked.hatch?.handedBack)
    expect(dough.bakery.peel.at).toBe('board')
  })

  it('plays two showings one after the other: a touch ends only the one that is playing, and each is marked as it starts', () => {
    const game = new Game(freshBakery(6, 7), 7)
    expect(game.bakery.hatch?.group).toEqual(['dachshund'])
    expect(game.bakery.shown, 'only the first has started').toEqual(['dough'])
    run(game, 1)
    game.dirty = ''
    game.press({ x: 600, y: 60 }); game.lift()
    expect(game.playing, 'the second showing begins when the touch has been answered').toBe(true)
    expect(game.bakery.shown).toEqual(['dough', 'shapes'])
    expect(game.dirty, 'and is saved as it starts').toBe('now')
    run(game, 1.2)
    expect(game.things().some((thing) => thing.kind === 'shown'), 'the badger pulls its own lump long').toBe(true)
    game.press({ x: 600, y: 60 }); game.lift()
    expect(game.playing).toBe(false)
    // Left alone, the two follow each other without a touch.
    const alone = new Game(freshBakery(6, 7), 7)
    run(alone, 6)
    expect(alone.bakery.shown).toEqual(['dough', 'shapes'])
    expect(alone.playing).toBe(true)
    run(alone, 7)
    expect(alone.playing).toBe(false)
    // Put away during the first, the second is not lost: it has not been shown, so it takes its turn when the game is opened again.
    const cut = new Game(freshBakery(6, 7), 7)
    run(cut, 1)
    const again = on(restore(JSON.parse(JSON.stringify(serialize(cut.bakery))), 6)!)
    expect(again.bakery.shown, 'the first is not played again').toEqual(['dough'])
    again.step(1 / 60)
    expect(again.playing, 'shapes is shown').toBe(true)
    expect(again.bakery.shown).toEqual(['dough', 'shapes'])
    expect(again.dirty).toBe('now')
    run(again, 0.9)
    expect(again.things().some((thing) => thing.kind === 'shown' && thing.form.kind === 'dough')).toBe(true)
    run(again, 6)
    const third = on(restore(JSON.parse(JSON.stringify(serialize(again.bakery))), 6)!)
    third.step(1 / 60)
    expect(third.playing, 'and then nothing is left to show').toBe(false)
  })

  it('answers the first touch on water, dust and seeds with the sound of pushing them, and a tap on dough with a slap', () => {
    const wet = fresh(); tap(wet, JUG); wet.step(1); wet.voices()
    expect(names(tap(wet, LUMP))).toContain('plip')
    const dusty = fresh(); tap(dusty, SACK); dusty.step(1); dusty.voices()
    expect(names(tap(dusty, LUMP))).toContain('dry-scrape')
    const seeded = at('seeds'); tap(seeded, middle(SPOTS.dish)); seeded.step(1); seeded.voices()
    expect(names(tap(seeded, LUMP))).toContain('seed-rattle')
    const froth = at('rising'); tap(froth, JAR); froth.step(0.3); froth.voices()
    froth.specks.length = 0
    expect(names(tap(froth, LUMP))).toContain('bubble-pops')
    expect(froth.specks.length, 'and its bubbles are seen to pop').toBeGreaterThan(0)
    expect(names(tap(knead(withDough()), LUMP))).toContain('dough-slap')
  })

  it('lets what is tipped onto a baked crust roll or run off the loaf, and the loaf stays as it was', () => {
    const game = on({ ...at('seeds').bakery, peel: { at: 'board', load: { raw: false, crumb: 'dense', shape: 'round', crust: 'gold', seeds: false } } })
    const before = game.bakery.peel
    expect(names(tap(game, middle(SPOTS.dish)))).toContain('seed-ticks')
    run(game, 0.6)
    expect(kindsOf(game).filter((kind) => kind === 'seed').length, 'seeds roll off it').toBe(3)
    for (const wisp of game.wisps.list) expect(Math.abs(wisp.x - LUMP.x), 'off the loaf, not off towards the badger').toBeLessThan(120)
    expect(game.bakery.peel).toBe(before)
    expect(names(tap(game, SACK))).toContain('flour-hiss')
    expect(names(tap(game, JUG))).toContain('gurgle')
    run(game, 0.6)
    expect(game.specks.some((speck) => speck.wet)).toBe(true)
    expect(game.bakery.peel).toBe(before)
    expect(game.floured, 'and none of it is a pour too many').toBe(false)
  })

  it('says cold on the sill: a tinkle as the peel is set down, and frost that comes and goes beside the load', () => {
    const game = at('rising')
    tap(game, SACK); tap(game, JUG); tap(game, JAR); knead(game); game.voices()
    carry(game, HANDLE, middle(SPOTS.sill))
    expect(game.bakery.peel.at).toBe('sill')
    expect(names(game.voices())).toContain('frost-tinkle')
    expect(kindsOf(game)).toContain('frost')
    const rise = stuff(game).rise
    run(game, 8)
    expect(kindsOf(game), 'for as long as it stands there').toContain('frost')
    const ferns = game.wisps.list.filter((wisp) => wisp.kind === 'frost')
    for (const a of ferns) for (const b of ferns) if (a !== b) expect(Math.sign(a.x - LUMP_AT.sill.x), 'never a pair either side at once').toBe(Math.sign(b.x - LUMP_AT.sill.x))
    expect(stuff(game).rise, 'and the dough does not rise there').toBe(rise)
  })

  it('sounds a patter of beaks while the chicks peck the peel clean', () => {
    const game = at('seeds')
    tap(game, middle(SPOTS.dish)); game.step(1)
    drag(game, LUMP, HATCH, 30); game.lift(); run(game, 2.2); game.voices()
    run(game, 1)
    expect(names(game.voices()).filter((name) => name === 'seed-ticks').length).toBeGreaterThanOrEqual(5)
  })
})

describe('what the lead\'s reader found, and is mended', () => {
  it('keeps the badger\'s flour secret to its one way in: with the peel away a tap on the sack only dusts the bench', () => {
    const game = knead(withDough())
    carry(game, HANDLE, NOOK); game.voices()
    const before = game.bakery
    for (let i = 0; i < 5; i++) {
      game.press(SACK)
      const heard = names(game.voices())
      expect(heard).toContain('flour-hiss')
      expect(heard).not.toContain('flour-whump')
      expect(game.floured).toBe(false)
      expect(game.playing).toBe(false)
      game.lift(); run(game, 0.4)
      expect(game.specks.length, 'a puff on the bare bench').toBeGreaterThan(0)
      run(game, 1)
    }
    expect(game.bakery, 'and nothing has changed').toBe(before)
  })

  it('twangs as the strings snap back from dough however far it was worked, and squelches as any plain dough slumps in the warm', () => {
    const seen = new Set<string>()
    for (const strokes of [0, 1, 2, 3, 4, 5, 6, 12]) {
      const game = withDough()
      for (let i = 0; i < strokes; i++) { drag(game, { x: LUMP.x - 50, y: LUMP.y }, { x: LUMP.x + 50, y: LUMP.y + 10 }, 20); game.lift() }
      game.step(1); game.voices()
      const texture = textureOf(stuff(game))
      seen.add(texture)
      drag(game, HANDLE, HATCH, 30); game.lift()
      const first = names(game.voices())
      run(game, 2.2)
      expect([...first, ...names(game.voices())].filter((name) => name === 'stretch-twang').length, `${texture} dough: one twang`).toBe(1)
      game.voices()
      carry(game, HANDLE, NOOK)
      expect(names(game.voices()).filter((name) => name === 'soft-squelch').length, `${texture} dough: one squelch`).toBe(1)
    }
    expect([...seen].sort()).toEqual(['shaggy', 'smooth', 'streaky'])
  })
})

describe('the idle ladder', () => {
  it('always has one thing to mark and one move to show, except while a scene or a reaction plays', () => {
    const game = new Game(freshBakery(null, 7), 7)
    expect(game.wants(), 'a showing is playing').toBeNull()
    game.step(9)
    expect(game.wants()).toEqual({ box: SPOTS.sack, to: null })
    tap(game, SACK)
    expect(game.wants()).toEqual({ box: SPOTS.jug, to: null })
    tap(game, JUG); game.step(1)
    expect(game.wants()?.to, 'a rub across the lump').not.toBeNull()
    knead(game)
    expect(game.wants(0)?.to).toEqual(OVEN)
    expect(game.wants(1)?.to).toEqual(NOOK)
    bakeIt(game)
    const want = game.wants()
    expect(want?.to && Math.abs(want.to.x - whereIs(game, 'goat').x), 'a bread can go to whoever is at the hatch').toBeLessThan(1)
    drag(game, LUMP, HATCH); game.lift(); game.step(10)
    const next = game.wants()
    expect(next?.to, 'the hatch is empty: someone in the lane waits for a tap').toBeNull()
    expect(next?.box[0]).toBeLessThan(SPOTS.hatch[0] + SPOTS.hatch[2])
  })
})

describe('found as left', () => {
  it('changes the bakery only by the finger and by attended time handed in', () => {
    const game = knead(withDough())
    const before = game.bakery
    for (let i = 0; i < 100; i++) game.step(0.1)
    expect(game.bakery).toBe(before)
    carry(game, HANDLE, OVEN)
    const baking = game.bakery
    game.step(0)
    expect(game.bakery).toBe(baking)
  })

  it('is one the rules could have made after any play, opens the same, and only ever asks for voices that exist', () => {
    const heard = new Set<string>()
    for (const seed of [1, 2, 3]) {
      const game = seed === 1 ? fresh(seed) : at(LADDER[seed === 2 ? 4 : 7], seed)
      let s = seed * 7919
      const next = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296 }
      const spots = [SACK, JUG, JAR, middle(SPOTS.dish), LUMP, HANDLE, OVEN, NOOK, middle(SPOTS.sill), HATCH, BADGER, middle(RACK[0]), middle(RACK[3]), { x: SPOTS.hatch[0] + 60, y: SPOTS.hatch[1] + 200 }]
      for (let i = 0; i < 2500; i++) {
        const roll = next(), where = next() < 0.75 ? spots[Math.floor(next() * spots.length)] : { x: next() * REF_W, y: next() * REF_H }
        if (roll < 0.3) game.press(where); else if (roll < 0.6) game.moveTo(where); else if (roll < 0.82) game.lift(); else game.step(next() * 1.5)
        for (const voice of game.voices()) { heard.add(voice.name); expect(voice.gain).toBeGreaterThan(0) }
        expect(game.specks.length).toBeLessThanOrEqual(70)
        if (i % 50 === 0) expect(serialize(restore(JSON.parse(JSON.stringify(serialize(game.bakery))), null)!), `seed ${seed} step ${i}`).toEqual(serialize(game.bakery))
      }
      game.lift()
      const again = on(restore(JSON.parse(JSON.stringify(serialize(game.bakery))), null)!, seed)
      expect(serialize(again.bakery)).toEqual(serialize(game.bakery))
      expect(again.playing).toBe(false)
    }
    for (const name of heard) expect(Object.keys(VOICES), name).toContain(name)
    expect(heard.size).toBeGreaterThan(30)
  })
})
