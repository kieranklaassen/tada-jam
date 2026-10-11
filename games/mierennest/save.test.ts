import { describe, expect, it } from 'vitest'
import { pickUp } from './build'
import { LADDER } from './config'
import { COLS, EARTH, LUMPS, MOUTH, MUD, OPEN, ROCK, ROWS, SAND, STONE, at, clone, count, equal, generate, makeGround, put, settle, type Kind } from './ground'
import { SHOWINGS } from './order'
import { decodeGround, deserialize, encodeGround, freshGame, serialize, type Game } from './save'
import { STATE_VERSION } from './state'
import { lean } from './walls'

const SEED = 11
const through = (game: Game): Game => deserialize(JSON.parse(JSON.stringify(serialize(game))), null, SEED + 1)

/** A nest with a little of everything in it: tunnels, a room, lumps moved, both machines, marks and a late position. */
function builtGame(): Game {
  const game = freshGame(null, SEED)
  for (let y = 3; y <= 5; y++) for (let x = 21; x <= 26; x++) put(game.ground, x, y, OPEN)
  for (let x = 10; x <= 18; x++) for (const y of [2, 3]) if (at(game.ground, x, y) === EARTH) put(game.ground, x, y, OPEN)
  put(game.ground, 24, 5, STONE)
  put(game.ground, 25, 5, MUD)
  put(game.ground, 26, 5, SAND)
  settle(game.ground)
  return {
    ...game,
    position: 'the-cannon',
    ant: { x: 22, y: 4 },
    machines: [{ kind: 'catapult', x: 21, y: 5, facing: -1, load: 'mud' }, { kind: 'cannon', x: 23, y: 5, facing: 1, load: null }],
    shown: ['ant', 'beetle', 'fly', 'catapult', 'cannon'],
  }
}

describe('the ground as a string', () => {
  it('reads back equal for a ground of every kind of cell', () => {
    const ground = builtGame().ground
    for (const kind of [OPEN, EARTH, SAND, MUD, STONE, ROCK] as Kind[]) expect(count(ground, kind)).toBeGreaterThan(0)
    expect(equal(decodeGround(encodeGround(ground))!, ground)).toBe(true)
  })

  it('is short for a new nest', () => {
    expect(encodeGround(generate(SEED)).length).toBeLessThan(700)
  })

  const broken: [string, unknown][] = [
    ['a truncated string', encodeGround(generate(SEED)).slice(0, 80)],
    ['a string that is too long', encodeGround(generate(SEED)) + '#5'],
    ['a mark that is no kind', encodeGround(generate(SEED)).replace('#', 'q')],
    ['a run of nothing', '#0' + encodeGround(generate(SEED))],
    ['a number', 12],
    ['nothing', undefined],
    ['an empty string', ''],
  ]
  for (const [name, text] of broken) it(`gives no ground for ${name}`, () => expect(decodeGround(text)).toBeNull())
})

describe('a save', () => {
  it('reads back as the game it was', () => {
    const game = builtGame()
    const back = through(game)
    expect(equal(back.ground, game.ground)).toBe(true)
    expect({ ...back, ground: null }).toEqual({ ...game, ground: null })
  })

  it('is plain JSON at this version, with the template field `finished` always false', () => {
    const save = serialize(builtGame())
    expect(JSON.parse(JSON.stringify(save))).toEqual(save)
    expect(save.v).toBe(STATE_VERSION)
    expect(save.finished).toBe(false)
  })

  it('holds a lump in the jaws in the cell it came from, and no lump is lost', () => {
    const game = builtGame()
    const whole = LUMPS.map((kind) => count(game.ground, kind))
    const carried = pickUp(game.ground, game.ant, 24, 5)!
    expect(carried.kind).toBe(STONE)
    const back = through(game)
    expect(LUMPS.map((kind) => count(back.ground, kind))).toEqual(whole)
    expect(at(back.ground, 24, 5)).toBe(STONE)
  })

  it('holds nothing of a raid: what is knocked down on the copy leaves the nest as built, cell for cell', () => {
    const game = builtGame()
    const built = clone(game.ground)
    const copy = clone(game.ground)
    expect(lean(copy, 24, 5, 1, 9).did).not.toBe('nothing')
    put(copy, 22, 4, SAND)
    settle(copy)
    expect(equal(game.ground, built)).toBe(true)
    expect(equal(through(game).ground, built)).toBe(true)
  })

  it('of the largest ground the game can make is under half the 64 KB cap', () => {
    // No two neighbouring cells alike, so no run is longer than one; both machines loaded and every mark set.
    const ground = makeGround(COLS, ROWS, OPEN)
    const kinds: Kind[] = [SAND, MUD, STONE, OPEN, EARTH]
    for (let y = 1; y < ROWS - 1; y++) for (let x = 0; x < COLS; x++) put(ground, x, y, kinds[(x + y * 2) % kinds.length])
    for (let x = 0; x < COLS; x++) { put(ground, x, 0, MOUTH.includes(x) ? OPEN : ROCK); put(ground, x, ROWS - 1, ROCK) }
    const game: Game = {
      position: 'open-kingdom', ground, ant: { x: COLS - 1, y: ROWS - 2 }, muster: 5, shown: [...SHOWINGS], ended: true,
      machines: [{ kind: 'catapult', x: 38, y: 18, facing: -1, load: 'stone' }, { kind: 'cannon', x: 39, y: 18, facing: -1, load: 'stone' }],
    }
    const text = JSON.stringify({ ...serialize(game), ground: encodeGround(ground) })
    expect(encodeGround(ground).length).toBeGreaterThan(760)
    expect(text.length).toBeLessThan(32 * 1024)
    expect(text.length).toBeLessThan(2048)
  })
})

describe('reading a slot that is not a good save', () => {
  const fresh = freshGame(null, SEED)
  const unreadable: [string, unknown][] = [
    ['an empty slot', undefined],
    ['null', null],
    ['a truncated string', JSON.stringify(serialize(builtGame())).slice(0, 60)],
    ['a list', [1, 2, 3]],
    ['an older shape with no version', { position: 'first-beetle', ground: '#840' }],
    ['a version above this one', { ...serialize(builtGame()), v: STATE_VERSION + 1 }],
  ]
  for (const [name, raw] of unreadable) {
    it(`gives a fresh game for ${name}, without throwing`, () => {
      const game = deserialize(raw, 9, SEED)
      expect(equal(game.ground, fresh.ground)).toBe(true)
      expect({ ...game, ground: null }).toEqual({ ...fresh, ground: null })
    })
  }

  it('starts every age at the first place', () => {
    for (const age of [null, 2, 9, 10, 12, 40]) expect(freshGame(age, SEED).position).toBe(LADDER[0])
  })

  const good = () => JSON.parse(JSON.stringify(serialize(builtGame()))) as Record<string, unknown>
  const wrong: unknown[] = [undefined, null, 'x', -1, 1e9, 2.5, {}, [], true]

  it('repairs a wrong type in any field by itself and keeps the rest', () => {
    for (const field of ['position', 'finished', 'ground', 'ant', 'machines', 'muster', 'shown', 'ended']) {
      for (const value of wrong) {
        const raw = { ...good(), [field]: value }
        const game = deserialize(raw, null, SEED)
        expect(LADDER as readonly string[], `${field}=${String(value)}`).toContain(game.position)
        expect(at(game.ground, game.ant.x, game.ant.y)).toBe(OPEN)
        expect(game.muster).toBeGreaterThanOrEqual(0)
        if (field !== 'position') expect(game.position).toBe('the-cannon')
        if (field !== 'ground') expect(equal(game.ground, builtGame().ground)).toBe(true)
      }
    }
  })

  it('keeps a machine only where it can stand and only once it has arrived', () => {
    const raw = good()
    raw.machines = [
      { kind: 'catapult', x: 0, y: 1, facing: 1, load: 'mud' },
      { kind: 'cannon', x: 23, y: 5, facing: 7, load: 'gravel' },
      { kind: 'cannon', x: 22, y: 5, facing: 1, load: null },
      { kind: 'trebuchet', x: 22, y: 4, facing: 1, load: null },
      'cannon',
    ]
    const game = deserialize(raw, null, SEED)
    expect(game.machines.find((m) => m.kind === 'cannon')).toEqual({ kind: 'cannon', x: 23, y: 5, facing: 1, load: null })
    // The catapult's showing had started, so it is in the nest: at the foot of the shaft, empty.
    const catapult = game.machines.find((m) => m.kind === 'catapult')!
    expect(at(game.ground, catapult.x, catapult.y)).toBe(OPEN)
    expect(catapult.load).toBeNull()
    expect(game.machines.length).toBe(2)
    expect(deserialize({ ...good(), position: 'first-fly' }, null, SEED).machines).toEqual([])
  })

  it('reads a ground with its edges damaged as a nest again, with nothing in the air', () => {
    const game = builtGame()
    put(game.ground, 3, 0, OPEN)
    put(game.ground, 5, ROWS - 1, SAND)
    put(game.ground, 22, 3, STONE)
    const back = deserialize({ ...good(), ground: encodeGround(game.ground) }, null, SEED)
    expect(at(back.ground, 3, 0)).toBe(ROCK)
    expect(at(back.ground, 5, ROWS - 1)).toBe(ROCK)
    expect(at(back.ground, 22, 3)).toBe(OPEN)
    for (const x of MOUTH) expect(at(back.ground, x, 0)).toBe(OPEN)
  })

  it('has the kingdom ended exactly when its position is the open kingdom', () => {
    expect(deserialize({ ...good(), ended: true }, null, SEED).ended).toBe(false)
    expect(deserialize({ ...good(), position: 'open-kingdom', ended: false }, null, SEED).ended).toBe(true)
  })

  it('keeps only marks that are showings, each once', () => {
    expect(deserialize({ ...good(), shown: ['fly', 'fly', 'boss', 7, 'ant'] }, null, SEED).shown).toEqual(['ant', 'fly'])
  })
})
