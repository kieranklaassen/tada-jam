import { describe, expect, it } from 'vitest'
import { CELLS, FIELD, FULL, HOME, SPOTS, START, THINGS, type Point } from './layout'
import { Play, hit } from './play'
import { makeRng } from './rng'
import { deserialize, serialize } from './state'
import { OUT, SHIVER, THIRD_STEP, centres, complete, freshWorld, loosest, quiet, ready, seat, spun, stick, walkX, type World } from './world'

function run(play: Play, seconds: number, each: () => void = () => {}): void {
  for (let i = 0; i < seconds * 60; i++) { play.advance(1 / 60); each() }
}
function tap(play: Play, p: Point): void { play.down(1, p); play.up(1) }
function settle(play: Play): void { for (let i = 0; i < 1800 && !quiet(play.world); i++) play.advance(1 / 60) }
const man = { x: HOME.x, y: 420 }
/** Every thing is in exactly one place. */
function whole(w: World): void {
  const all = [...Object.keys(w.loose), ...w.stack.flatMap((b) => b.things.map((s) => s.id)), ...(w.ball?.things ?? []).map((s) => s.id), ...(w.hop?.ball.things ?? []).map((s) => s.id)]
  expect([...all].sort()).toEqual([...THINGS].sort())
}

describe('a round', () => {
  it('starts with a snowman who lacks only a head, and a small ball with a boot in it', () => {
    const w = freshWorld()
    expect(w.stack).toHaveLength(2)
    expect(w.ball!.things.map((s) => s.id)).toEqual(['boot'])
    whole(w)
  })
  it('goes the whole way round by taps alone, over and over', () => {
    const play = new Play(freshWorld())
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < 4 && !complete(play.world); i++) {
        tap(play, { x: 500, y: 690 }); run(play, 1.5)
        tap(play, { x: HOME.x, y: seat(play.world, 60).y }); run(play, 4); settle(play)
      }
      expect(ready(play.world)).toBe(true)
      run(play, 1.5)
      tap(play, man)
      expect(play.world.walk).not.toBeNull()
      run(play, OUT + SHIVER + 5); settle(play)
      expect(play.world.stack).toHaveLength(0)
      expect(play.world.ball).not.toBeNull()
      whole(play.world)
    }
  })
  it('needs one act for a first head: a tap on him', () => {
    const play = new Play(freshWorld())
    tap(play, man); run(play, 4)
    expect(complete(play.world)).toBe(true)
    expect(play.world.stack[2].things.some((s) => s.id === 'boot')).toBe(true)
  })
  it('starts nothing by itself', () => {
    const play = new Play(freshWorld())
    run(play, 30)
    expect(play.world.stack).toHaveLength(2)
    expect(play.world.ball).toMatchObject(START)
  })
})

describe('rolling', () => {
  it('grows by the snow it takes and leaves it bare, never past full', () => {
    const play = new Play(freshWorld()), r = play.world.ball!.r
    play.down(1, { x: 620, y: 700 }); run(play, 1.5)
    const b = play.world.ball!
    expect(b.r).toBeGreaterThan(r)
    expect(play.world.bare.some((v) => v === 1)).toBe(true)
    for (let i = 0; i < 12; i++) { play.move(1, { x: i % 2 ? 80 : 640, y: 640 + i * 10 }); run(play, 1.2) }
    expect(play.world.ball!.r).toBeCloseTo(FULL.head)
  })
  it('hops a full ball when the finger lets go and not before', () => {
    const play = new Play(freshWorld())
    play.down(1, { x: 600, y: 700 })
    for (let i = 0; i < 12; i++) { play.move(1, { x: i % 2 ? 80 : 640, y: 640 + i * 10 }); run(play, 1.2) }
    expect(play.world.ball).not.toBeNull()
    play.up(1); run(play, 3.5)
    expect(complete(play.world)).toBe(true)
  })
  it('led past him it does not hop, at any size, and never goes into him', () => {
    for (const from of [{ x: 520, y: 750 }, { x: 640, y: 622 }]) {
      const play = new Play(freshWorld())
      Object.assign(play.world.ball!, from)
      play.down(1, { x: 1100, y: 750 })
      run(play, 4, () => { const b = play.world.ball!; expect(Math.hypot(b.x - HOME.x, (b.y - HOME.y) * 1.2)).toBeGreaterThan(60) })
      expect(play.world.ball).not.toBeNull()
    }
  })
  it('keeps going to where a lifted finger last was, and stops when the game is put away', () => {
    const play = new Play(freshWorld())
    play.down(1, { x: 400, y: 700 }); play.move(1, { x: 620, y: 740 }); play.up(1); run(play, 3)
    expect(play.world.ball!.x).toBeCloseTo(620, -1)
    play.down(1, { x: 100, y: 700 }); run(play, 0.2); play.clear(); run(play, 1)
    expect(play.world.ball!.x).toBeGreaterThan(400)
  })
  it('takes no notice of a second finger', () => {
    const play = new Play(freshWorld())
    play.down(1, { x: 600, y: 700 }); play.down(2, { x: 80, y: 700 }); play.up(2); run(play, 1.5)
    expect(play.world.ball!.x).toBeGreaterThan(420)
  })
})

describe('a small child’s finger', () => {
  it('gets the thing it taps, wherever it lies', () => {
    for (const id of THINGS) for (const spot of SPOTS) {
      const w = freshWorld()
      w.stack.pop(); w.ball = { ...w.ball!, things: [], r: 32 }; w.loose = { [id]: { ...spot } }
      const play = new Play(w)
      tap(play, { x: spot.x, y: spot.y - 45 }); run(play, 5)
      expect(w.loose[id], `${id} at ${spot.x}`).toBeUndefined()
    }
  })
  it('never grinds before him', () => {
    for (let x = 650; x < 1100; x += 25) for (const y of [660, 690, 750]) {
      const w = freshWorld(); w.loose = {}
      const play = new Play(w)
      tap(play, { x, y }); run(play, 8)
      expect(quiet(w), `${x} ${y}`).toBe(true)
    }
  })
  it('brings one ball with one touch', () => {
    const w = freshWorld(); w.stack = []
    const play = new Play(w)
    play.down(1, { x: 500, y: 700 }); play.move(1, man)
    for (let i = 0; i < 900; i++) { play.move(1, { x: HOME.x + (i % 3), y: 560 + (i % 2) }); play.advance(1 / 60) }
    expect(w.stack).toHaveLength(1)
  })
  it('that came while there was no ball sends the next one', () => {
    const play = new Play(freshWorld())
    play.world.stack = []
    tap(play, { x: HOME.x, y: 560 })
    while (!play.world.hop) play.advance(1 / 60)
    run(play, 0.4)
    play.down(1, { x: 600, y: 740 }); run(play, 4)
    expect(play.world.ball!.x).toBeGreaterThan(540)
  })
  it('taken away leaves a full ball lying, also on load', () => {
    const w = freshWorld(); w.ball!.r = FULL.head
    run(new Play(deserialize(JSON.parse(JSON.stringify(serialize(w))))), 3)
    const play = new Play(deserialize(JSON.parse(JSON.stringify(serialize(w)))))
    play.down(1, { x: 300, y: 700 }); play.clear(); run(play, 3)
    expect(play.world.ball).not.toBeNull()
    expect(play.world.stack).toHaveLength(2)
  })
  it('put away while the ball rolls is worth a save', () => {
    const play = new Play(freshWorld())
    tap(play, { x: 620, y: 740 }); run(play, 0.2); play.changed = false
    play.rest()
    expect(play.changed).toBe(true)
  })
})

describe('sticking', () => {
  it('puts a thing on the side it was touched on', () => {
    const b = { r: 60, spin: 0.7, things: [], x: 300, y: 700 }
    stick(b, 'rake', { x: 420, y: 696 })
    expect(spun(b, b.things[0]).x).toBeGreaterThan(40)
    stick(b, 'wheel', { x: 180, y: 682 })
    expect(spun(b, b.things[1]).x).toBeLessThan(-40)
  })
  it('keeps that place while the ball grows, turns, hops and lands', () => {
    const play = new Play(freshWorld()), boot = { ...play.world.ball!.things[0] }
    play.down(1, { x: 560, y: 690 }); run(play, 1.5); play.move(1, man)
    let spin = 0
    run(play, 4, () => { if (play.world.hop) spin = play.world.hop.ball.spin })
    const head = play.world.stack[2]
    expect(head.things.find((s) => s.id === 'boot')).toEqual(boot)
    expect(head.spin).toBe(spin)
  })
  it('never lays one thing on another in a ball of some size', () => {
    const b = { r: 80, spin: 0, things: [], x: 300, y: 700 } as Parameters<typeof stick>[0]
    for (const id of THINGS.slice(0, 5)) stick(b, id, { x: 420, y: 690 })
    for (const s of b.things) for (const q of b.things) if (s !== q) expect(Math.hypot(s.x - q.x, s.y - q.y)).toBeGreaterThan(46)
  })
  it('never hides a thing: each stays on the ball', () => {
    const b = { r: 80, spin: 0, things: [], x: 300, y: 700 } as Parameters<typeof stick>[0]
    for (const id of THINGS) stick(b, id, { x: 420, y: 690 })
    for (const s of b.things) expect(Math.hypot(s.x, s.y)).toBeLessThanOrEqual(80)
  })
})

describe('the walk', () => {
  it('starts on a touch of him alone, and not before he has been looked at', () => {
    const play = new Play(freshWorld())
    tap(play, man)
    while (!complete(play.world)) play.advance(1 / 60)
    tap(play, man)
    expect(play.world.walk).toBeNull()
    run(play, 2); tap(play, { x: 500, y: 700 })
    expect(play.world.walk).toBeNull()
    tap(play, man)
    expect(play.world.walk).not.toBeNull()
  })
  const started = () => { const play = new Play(freshWorld()); tap(play, { x: 480, y: 740 }); run(play, 2); tap(play, man); run(play, 4); tap(play, man); return play }
  it('jolts on an early touch and walks on; a later touch brings the shiver', () => {
    const play = started()
    run(play, 0.5); tap(play, man)
    expect(play.world.walk!.shiver).toBe(-1)
    run(play, THIRD_STEP); tap(play, { x: 600, y: 700 })
    expect(play.world.walk!.shiver).toBeGreaterThanOrEqual(0)
    run(play, 12)
    expect(play.world.walk).toBeNull()
    expect(play.world.stack).toHaveLength(0)
  })
  it('is a path without a jump that ends where it began', () => {
    let last = HOME.x
    for (let t = 0; t <= OUT; t += 1 / 60) { const { x } = walkX(t); expect(Math.abs(x - last)).toBeLessThan(8); last = x }
    expect(last).toBeCloseTo(HOME.x, 0)
  })
  it('loses the cat first, then the goose, then the last', () => {
    const b = (...ids: (typeof THINGS)[number][]) => [{ r: 50, spin: 0, things: ids.map((id) => ({ id, x: 0, y: 0, rot: 0 })) }]
    expect(loosest(b('goose', 'cat', 'boot'))).toBe('cat')
    expect(loosest(b('goose', 'boot'))).toBe('goose')
    expect(loosest(b('rake', 'boot'))).toBe('boot')
    expect(loosest(b())).toBeNull()
  })
  it('begins again with one thing on each spot', () => {
    const play = started(); run(play, 20)
    expect(new Set(Object.values(play.world.loose).map((p) => `${p!.x} ${p!.y}`)).size).toBe(THINGS.length)
  })
})

describe('found as left', () => {
  const same = (w: World) => JSON.stringify(serialize(w))
  it('opens quiet at any instant, with nothing lost and no scene running, and saves the same again', () => {
    const play = new Play(freshWorld()), rng = makeRng(3)
    for (let i = 0; i < 2600; i++) {
      if (i % 40 === 0) { play.down(1, i % 200 === 0 ? man : { x: 60 + rng.next() * 1060, y: 600 + rng.next() * 160 }); if (rng.next() < 0.7) play.up(1) }
      if (i % 40 === 30) play.up(1)
      play.advance(1 / 60)
      if (i % 13) continue
      const opened = deserialize(JSON.parse(same(play.world)))
      whole(opened)
      expect(opened.walk ?? opened.hop ?? opened.heap).toBeNull()
      expect(quiet(opened)).toBe(true)
      expect(complete(opened)).toBe(opened.ball === null)
      expect(same(opened)).toBe(same(deserialize(JSON.parse(same(opened)))))
    }
  })
  it('keeps the place of the ball and the bare snow', () => {
    const play = new Play(freshWorld())
    tap(play, { x: 560, y: 720 }); run(play, 3)
    const o = deserialize(JSON.parse(same(play.world)))
    expect(o.ball!.x).toBeCloseTo(play.world.ball!.x, 1)
    expect([...o.bare]).toEqual([...play.world.bare])
  })
  it('does not break on anything', () => {
    for (const v of [null, 3, 'x', [], {}, { v: 9 }, { v: 1, stack: 'no' }, { v: 1, stack: [{ r: NaN }], ball: { r: 1e9, s: 'x', t: [['boot', 1, 2, 3], ['boot', 1, 2, 3], ['ghost', 0, 0, 0]], x: -1e9, y: null }, loose: { cat: ['a', 2], goose: [1e9, 2] }, bare: 'zz', seed: -4 }, { v: 1, stack: [{ r: 60 }, { r: 60 }, { r: 60 }, { r: 60 }] }]) {
      const w = deserialize(v)
      whole(w)
      expect(complete(w)).toBe(w.ball === null)
    }
  })
  it('is small', () => {
    const w = freshWorld()
    w.bare.fill(1)
    expect(same(w).length).toBeLessThan(2000)
    expect(serialize(w).bare).toHaveLength(Math.ceil(CELLS / 4))
  })
})

describe('the layout', () => {
  it('keeps every thing in reach, clear of him and of where a ball falls', () => {
    for (const s of SPOTS) {
      expect(s.y).toBeLessThanOrEqual(FIELD.y1)
      expect(Math.hypot(s.x - START.x, s.y - START.y)).toBeGreaterThan(85)
      expect(Math.hypot(s.x - HOME.x, (s.y - HOME.y) * 1.2)).toBeGreaterThan(130)
      for (const q of SPOTS) if (q !== s) expect(Math.hypot(q.x - s.x, q.y - s.y)).toBeGreaterThan(90)
    }
  })
  it('fits a snowman of three full balls, and answers a touch on each part', () => {
    const w = freshWorld()
    const mids = centres([FULL.base, FULL.belly, FULL.head].map((r) => ({ r, spin: 0, things: [] })), HOME.x, HOME.y)
    expect(mids[2].y - FULL.head).toBeGreaterThan(110)
    expect(hit(w, { x: HOME.x, y: 300 })).toBe('man')
    expect(hit(w, { x: 600, y: 60 })).toBe('sky')
    expect(hit(w, { x: 320, y: 470 })).toBe('robin')
    expect(hit(w, { x: 560, y: 440 })).toBe('house')
    expect(hit(w, { x: 100, y: 400 })).toBe('tree')
    expect(hit(w, { x: 250, y: 700 })).toBe('snow')
    for (const [id, p] of Object.entries(w.loose)) expect(hit(w, { x: p!.x, y: p!.y - 30 })).toBe(id)
  })
})
