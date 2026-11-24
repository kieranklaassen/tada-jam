import { describe, expect, it } from 'vitest'
import { ANIMALS, BEAR, GOOSE } from './ends'
import { CLOTH_REST, FARMER, GROUND, HANG, MEET, PEGS, STABLE, pegAt } from './layout'
import { Play } from './play'
import { deserialize, freshSave, type Saved } from './save'

const FRAME = 1 / 60
const open = (change: Partial<Saved> = {}): Play => { let s = 7; return new Play(deserialize({ ...freshSave(), ...change }), () => ((s = (s * 16807) % 2147483647) / 2147483647)) }
const run = (play: Play, seconds: number): void => { for (let t = 0; t < seconds; t += FRAME) play.step(FRAME) }
const on = (play: Play, who: 0 | 1) => ({ x: play.halves[who].x, y: GROUND - play.halves[who].y - 196 })
/** Fingers travel together: each from where it is, by a vector, over some seconds. */
const travel = (play: Play, at: Map<number, { x: number; y: number }>, by: [number, number, number][], seconds: number): void => {
  const n = Math.round(seconds / FRAME)
  for (let i = 0; i < n; i++) {
    for (const [id, dx, dy] of by) { const p = at.get(id)!; p.x += dx / n; p.y += dy / n; play.move(id, { ...p }) }
    play.step(FRAME)
  }
}
const both = (play: Play): Map<number, { x: number; y: number }> => {
  const at = new Map([[1, on(play, GOOSE)], [2, on(play, BEAR)]])
  for (const [id, p] of at) play.down(id, { ...p })
  return at
}

describe('two fingers', () => {
  it('each moves its own half in the same frames', () => {
    const play = open(), [f, r] = play.halves.map((half) => half.x)
    const at = both(play)
    travel(play, at, [[1, 180, 0], [2, -40, -150]], 0.5)
    run(play, 0.2)
    expect(play.halves[0].x - f).toBeGreaterThan(150)
    expect(play.halves[1].x - r).toBeLessThan(-20)
    expect(play.halves[1].y).toBeGreaterThan(110)
    expect(play.halves[0].y).toBe(0)
  })

  it('a third finger on a held half takes nothing', () => {
    const play = open()
    const at = both(play)
    travel(play, at, [[1, 60, 0]], 0.2)
    play.down(3, on(play, GOOSE))
    play.move(3, { x: 900, y: 400 })
    travel(play, at, [[1, 20, 0]], 0.2)
    expect(play.halves[0].held).toBe(1)
    play.up(3)
    expect(play.halves[0].held).toBe(1)
  })

  it('a hand that rests gives its half to the next finger', () => {
    const play = open()
    play.down(1, on(play, GOOSE))
    run(play, 1.3)
    play.down(2, on(play, GOOSE))
    expect(play.halves[0].held).toBe(2)
    play.up(1)
    expect(play.halves[0].held).toBe(2)
  })

  it('a palm on the ground moves nobody, and leaves both halves their fingers', () => {
    const play = open({ food: [] })
    const before = play.halves.map((half) => half.x)
    for (let id = 10; id < 14; id++) play.down(id, { x: 700 + id * 8, y: 690 })
    for (let id = 10; id < 13; id++) play.up(id)
    expect(play.halves.map((half) => half.call)).toEqual([null, null])
    play.down(1, on(play, GOOSE))
    expect(play.halves[0].held).toBe(1)
    expect(play.halves[1].x).toBe(before[1])
  })
})

describe('a hand that rests', () => {
  it('three resting fingers leave every half, costume and tap working', () => {
    const play = open({ food: [] })
    for (const id of [21, 22, 23]) play.down(id, { x: 800 + id, y: 700 })
    run(play, 2)
    play.down(1, on(play, GOOSE))
    expect(play.halves[0].held).toBe(1)
    play.up(1)
    play.down(2, { x: 700, y: 660 }); run(play, 0.1); play.up(2)
    expect(play.halves[0].call).toBe(700)
  })
  it('on a half it does nothing more than the pat', () => {
    const play = open({ food: [] })
    play.down(1, on(play, GOOSE))
    run(play, 3)
    expect(play.halves[0].act).toBe(-1)
    play.up(1)
    expect(play.halves[0].act).toBe(-1)
  })
  it('a slow drag is not rest', () => {
    const play = open({ food: [] })
    const p = on(play, GOOSE)
    play.down(1, p)
    for (let i = 0; i < 120; i++) { p.x += 1.2; play.move(1, p); play.step(FRAME) }
    play.down(2, on(play, GOOSE))
    expect(play.halves[0].held).toBe(1)
  })
})

describe('what moves by itself', () => {
  it('is saved where it comes to rest, and at any put-away', () => {
    const play = open({ food: [] })
    const at = both(play)
    travel(play, at, [[1, 290, 0], [2, -190, 0]], 0.8)
    play.up(1); play.up(2)
    run(play, 0.2)
    play.changed = false
    run(play, 4)
    expect(play.changed).toBe(true)
    play.changed = false
    play.clear()
    expect(play.changed).toBe(true)
  })
  it('never slides into the stable, and no call lasts for ever', () => {
    let s = 3
    const rnd = (): number => (s = (s * 16807) % 2147483647) / 2147483647
    for (let n = 0; n < 120; n++) {
      const fresh = freshSave()
      const play = open({ food: [], halves: [{ x: 80 + rnd() * 770, sit: rnd() < 0.4, wear: 0 }, { x: 80 + rnd() * 770, sit: rnd() < 0.4, wear: 4 }], pegs: fresh.pegs })
      const stable = n % 2 === 0
      play.down(1, stable ? { x: 60, y: 480 } : { x: 400 + rnd() * 400, y: 700 }); run(play, 0.05); play.up(1)
      run(play, 9)
      expect(play.halves.map((half) => half.call)).toEqual([null, null])
      expect(play.saved().ended).toBe(play.ended)
    }
  })
  it('a fling at the door stops at the door', () => {
    const play = open({ food: [], halves: [{ x: 420, sit: false, wear: 0 }, { x: 100, sit: false, wear: 4 }] })
    const at = new Map([[1, on(play, GOOSE)]])
    play.down(1, at.get(1)!)
    travel(play, at, [[1, -180, 0]], 0.12)
    play.up(1)
    run(play, 2)
    expect(play.halves[0].x <= STABLE.mouth && play.halves[1].x <= STABLE.mouth && !play.ended).toBe(false)
  })
  it('one finger ties no bow', () => {
    const play = open({ food: [] })
    const at = new Map([[1, on(play, GOOSE)]])
    play.down(1, at.get(1)!)
    travel(play, at, [[1, 0, -250]], 0.4); travel(play, at, [[1, -400, 0]], 0.6); travel(play, at, [[1, 0, 250]], 0.4)
    run(play, 0.5)
    expect(play.tied).toBe(false)
  })
  it('a held bear does not eat', () => {
    const play = open({ food: [{ kind: 'apple', x: 300 }] })
    play.down(1, on(play, BEAR))
    run(play, 2)
    expect(play.food).toHaveLength(1)
  })
  it('a slow machine plays the same game', () => {
    const play = open({ food: [] })
    const at = both(play)
    travel(play, at, [[1, -300, 0], [2, 300, 0]], 0.8)
    for (let i = 0; i < 80; i++) play.step(0.1)
    expect(Math.abs(play.knot)).toBeLessThan(2)
    expect(Math.abs(play.crowd.states.hen.doubtV)).toBeLessThan(30)
  })
})

describe('what only two can do', () => {
  const routines: [string, (play: Play) => void][] = [
    ['trot', (play) => { const at = both(play); travel(play, at, [[1, 260, 0], [2, 260, 0]], 1) }],
    ['leap', (play) => { const at = both(play); travel(play, at, [[1, 0, -190], [2, 0, -190]], 0.4); play.up(1); play.up(2); run(play, 0.8) }],
    ['twang', (play) => { const at = both(play); travel(play, at, [[1, 320, 0], [2, -150, 0]], 0.8); run(play, 0.2); play.up(1); play.up(2); run(play, 1) }],
    ['bow', (play) => { const at = both(play); travel(play, at, [[1, -300, 0], [2, 300, 0]], 0.8); run(play, 0.2) }],
    ['seesaw', (play) => { const at = both(play); for (let i = 0; i < 4; i++) { travel(play, at, [[1, 0, i % 2 ? 140 : -140], [2, 0, i % 2 ? -140 : i ? 140 : 0]], 0.4) } }],
    ['tower', (play) => { const at = both(play); travel(play, at, [[1, -240, -300]], 0.7); run(play, 0.5) }],
    ['squash', (play) => { const at = both(play); travel(play, at, [[1, -90, 0], [2, 110, 0]], 0.6); run(play, 0.2) }],
    ['skip', (play) => { const at = both(play); travel(play, at, [[1, 160, 0], [2, -60, 0]], 0.4); for (let i = 0; i < 3; i++) { travel(play, at, [[1, 0, -140], [2, 0, -140]], 0.3); travel(play, at, [[1, 0, 140], [2, 0, 140]], 0.3); run(play, 0.1) } }],
  ]
  it.each(routines)('%s', (name, act) => {
    const play = open({ food: [] })
    play.heard = []
    act(play)
    expect(play.done).toContain(name)
    expect(play.heard.length).toBeGreaterThan(0)
  })

  it('one finger makes none of them, however wild', () => {
    const play = open({ food: [] })
    const at = new Map([[1, on(play, GOOSE)]])
    play.down(1, at.get(1)!)
    for (let i = 0; i < 12; i++) travel(play, at, [[1, i % 2 ? -420 : 380, i % 3 ? -180 : 260]], 0.3)
    play.up(1)
    run(play, 2)
    expect(play.done).toEqual([])
  })

  it('a finger taken away sets off nothing and the half floats down', () => {
    const play = open({ food: [] })
    const at = both(play)
    travel(play, at, [[1, 320, -200], [2, -150, 0]], 0.8)
    play.done.length = 0
    play.cancel(1)
    play.cancel(2)
    run(play, 2.4)
    expect(play.done).toEqual([])
    expect(play.halves[0].y).toBe(0)
  })
})

describe('the cloth', () => {
  it('stays whole under the wildest pulling, and comes back to rest', () => {
    const play = open({ food: [] })
    const at = both(play)
    for (let i = 0; i < 10; i++) {
      travel(play, at, [[1, i % 2 ? -800 : 800, i % 3 ? -300 : 300], [2, i % 2 ? 700 : -700, 0]], 0.15)
      for (let n = 0; n < play.cloth.x.length; n++) { expect(Number.isFinite(play.cloth.x[n])).toBe(true); expect(play.cloth.y[n]).toBeGreaterThan(-250) }
    }
    play.up(1); play.up(2)
    run(play, 3)
    expect(Math.abs(play.gap)).toBeLessThan(420)
    expect(Math.abs(play.gap)).toBeGreaterThan(150)
  })

  it('is thinner the further it is pulled', () => {
    const play = open()
    const rest = play.cloth.thickness(0.5)
    const at = both(play)
    travel(play, at, [[1, 360, 0], [2, -180, 0]], 0.8)
    run(play, 0.3)
    expect(play.cloth.chord).toBeGreaterThan(CLOTH_REST * 3)
    expect(play.cloth.thickness(0.5)).toBeLessThan(rest * 0.5)
  })
})

describe('one child alone', () => {
  it('the other end comes along when it is pulled', () => {
    const play = open({ food: [] })
    const at = new Map([[1, on(play, GOOSE)]])
    play.down(1, at.get(1)!)
    travel(play, at, [[1, 400, 0]], 1)
    run(play, 1)
    expect(play.gap).toBeLessThan(440)
    expect(play.halves[0].x).toBeGreaterThan(800)
  })

  it('the bear goes to food and eats it, and the farmer tosses it back', () => {
    const play = open({ food: [{ kind: 'apple', x: 330 }] })
    run(play, 6)
    expect(play.food).toEqual([])
    expect(play.eaten).toEqual(['apple'])
    play.down(1, { x: FARMER.x, y: 500 })
    run(play, 0.1)
    play.up(1)
    expect(play.food.map((one) => one.kind)).toEqual(['apple'])
  })

  it('the goose refuses food and admires itself', () => {
    const play = open({ food: [{ kind: 'egg', x: 548 }] })
    run(play, 5)
    expect(play.food.length + play.eaten.length).toBe(1)
    expect(play.halves[0].preen).toBeGreaterThan(0.6)
  })

  it('a tap on the ground calls the nearer end there, on tap alone', () => {
    const play = open({ food: [] })
    play.down(1, { x: 800, y: 660 })
    run(play, 0.1)
    play.up(1)
    run(play, 3)
    expect(Math.abs(play.halves[0].x - 800)).toBeLessThan(12)
  })
})

describe('the ends', () => {
  const tap = (play: Play, at: { x: number; y: number }): void => { play.down(9, at); run(play, 0.1); play.up(9) }
  const peg = (n: number) => ({ x: pegAt(n).x, y: pegAt(n).y + HANG })

  it('a tap dresses the goose in heads and the bear in bottoms, and a second tap undoes it', () => {
    const play = open({ food: [] })
    tap(play, peg(0))
    expect(play.halves[0].wear).toBe(1)
    expect(play.pegs[0]).toBe(0)
    run(play, 1)
    tap(play, peg(0))
    expect(play.halves[0].wear).toBe(0)
    tap(play, peg(1))
    expect(play.halves[1].wear).toBe(5)
  })

  it('a carried one is worn by whoever it is let go over, whatever it is', () => {
    const play = open({ food: [] })
    const at = new Map([[4, peg(0)]])
    play.down(4, at.get(4)!)
    const to = on(play, BEAR)
    travel(play, at, [[4, to.x - peg(0).x, to.y - peg(0).y]], 0.5)
    play.up(4)
    expect(play.halves[1].wear).toBe(4)
    run(play, 0.5)
    expect(play.halves[1].wear).toBe(1)
  })

  it('survives a lifted finger, and goes back to its peg where nothing is', () => {
    const play = open({ food: [] })
    const at = new Map([[4, peg(0)]])
    play.down(4, at.get(4)!)
    travel(play, at, [[4, 200, 500]], 0.4)
    play.up(4)
    run(play, 0.15)
    play.down(5, { ...at.get(4)! })
    expect(play.carried[0].id).toBe(5)
    play.move(5, { x: 640, y: 150 })
    play.up(5)
    run(play, 0.5)
    expect(play.carried).toEqual([])
    expect(play.pegs[0]).toBe(1)
  })

  it('a cancel puts it back', () => {
    const play = open({ food: [] })
    const at = new Map([[4, peg(0)]])
    play.down(4, at.get(4)!)
    const to = on(play, BEAR)
    travel(play, at, [[4, to.x - peg(0).x, to.y - peg(0).y]], 0.4)
    play.cancel(4)
    run(play, 1)
    expect(play.halves[1].wear).toBe(4)
    expect(play.pegs[0]).toBe(1)
  })

  it('each of the eight has its act, with its own sound, and a greeting of its own', () => {
    const acts = new Set<string>(), meets = new Set<string>()
    for (let end = 0; end < 8; end++) {
      const pegs = [...Array(8).keys()].filter((e) => e !== end && e !== (end === 4 ? 5 : 4)) as (number | null)[]
      const play = open({ food: [], halves: [{ x: 560, sit: false, wear: end }, { x: 290, sit: false, wear: end === 4 ? 5 : 4 }], pegs: [...pegs, null, null] })
      play.heard = []
      play.down(1, on(play, GOOSE))
      run(play, 0.1)
      play.heard = []
      play.up(1)
      expect(play.halves[0].act).toBeGreaterThanOrEqual(0)
      acts.add(JSON.stringify(play.heard))
      run(play, 2)
      play.heard = []
      play.halves[0].call = MEET + 30
      for (let t = 0; t < 4 && !play.meeting; t += FRAME) { play.heard = []; play.step(FRAME) }
      expect(play.meeting?.end).toBe(end)
      meets.add(JSON.stringify(play.heard.slice(-3)))
    }
    expect(acts.size).toBe(8)
    expect(meets.size).toBe(8)
    expect(ANIMALS.length * 2).toBe(8)
  })
})

describe('the stable', () => {
  it('a tap walks both in, the show ends and stays, and a touch opens it again', () => {
    const play = open({ food: [] })
    play.down(1, { x: 60, y: 480 }); run(play, 0.1); play.up(1)
    expect(play.saved().ended).toBe(true)
    run(play, 5)
    expect(play.ended).toBe(true)
    run(play, 12)
    expect(play.ended).toBe(true)
    const again = new Play(deserialize(JSON.parse(JSON.stringify(play.saved()))), () => 0.5)
    expect(again.ended).toBe(true)
    expect(again.heard).toEqual([])
    again.down(1, { x: 60, y: 480 }); again.up(1)
    expect(again.ended).toBe(false)
    run(again, 3)
    expect(again.halves.every((half) => half.x > STABLE.mouth)).toBe(true)
  })

  it('does not end while a finger has either, and a load never ends it', () => {
    const play = open({ food: [] })
    const at = both(play)
    travel(play, at, [[1, -420, 0], [2, -180, 0]], 1)
    run(play, 0.3)
    expect(play.ended).toBe(false)
    const saved = deserialize(JSON.parse(JSON.stringify(play.saved())))
    expect(saved.ended).toBe(false)
    expect(new Play(saved, () => 0.5).ended).toBe(false)
    play.up(1); play.up(2)
    expect(play.ended).toBe(true)
  })
})

describe('found as left', () => {
  it('after any storm of fingers, what is saved loads to itself, and every end is in one place', () => {
    let s = 99
    const rnd = (): number => (s = (s * 16807) % 2147483647) / 2147483647
    const play = new Play(freshSave(), rnd)
    const down = new Map<number, { x: number; y: number }>()
    for (let i = 0; i < 6000; i++) {
      const id = 1 + Math.floor(rnd() * 5)
      if (!down.has(id)) { const p = { x: rnd() * 1180, y: rnd() * 820 }; down.set(id, p); play.down(id, p) }
      else if (rnd() < 0.12) { down.delete(id); if (rnd() < 0.2) play.cancel(id); else play.up(id) }
      else { const p = down.get(id)!; p.x += (rnd() - 0.5) * 220; p.y += (rnd() - 0.5) * 200; play.move(id, { ...p }) }
      play.step(FRAME * (0.5 + rnd()))
      play.heard = []
      if (i % 40 === 0) {
        const saved = JSON.parse(JSON.stringify(play.saved())) as Saved
        const ends = [saved.halves[0].wear, saved.halves[1].wear, ...saved.pegs.filter((e) => e !== null)].sort()
        expect(ends).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
        expect(saved.food.length + saved.eaten.length).toBeLessThanOrEqual(5)
        const loaded = deserialize(saved)
        expect(new Play(loaded, rnd).saved()).toEqual(loaded)
        for (const half of play.halves) expect(Number.isFinite(half.x + half.y)).toBe(true)
      }
      if (i % 900 === 899) { play.clear(); down.clear(); expect(play.carried).toEqual([]); expect(play.halves.every((half) => half.held === null)).toBe(true) }
    }
    expect(play.pegs.length).toBe(PEGS)
    expect(JSON.stringify(play.saved()).length).toBeLessThan(2000)
  })
})
